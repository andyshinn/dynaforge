<template>
  <div class="h-full flex flex-col space-y-4 overflow-y-auto pr-2">
    <!-- Motor Scan Section -->
    <div class="bg-gray-800 rounded-lg p-4">
      <h3 class="text-white font-semibold mb-3 flex items-center">
        <span class="mr-2">🤖</span>
        Motor Discovery
      </h3>

      <div class="flex flex-wrap gap-2 mb-3">
        <button
          @click="startBackgroundDiscovery"
          :disabled="!store.isConnectedToU2D2.value || store.state.backgroundOperations.motorDiscovery.isRunning"
          class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          {{ store.state.backgroundOperations.motorDiscovery.isRunning ? 'Scanning Motors...' : 'Scan for Motors' }}
        </button>
        
        <button
          v-if="store.state.backgroundOperations.motorDiscovery.isRunning"
          @click="cancelBackgroundDiscovery"
          class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
        >
          Cancel Scan
        </button>
      </div>

      <!-- Progress indicator for background discovery -->
      <div v-if="store.state.backgroundOperations.motorDiscovery.isRunning" class="mb-3">
        <div class="text-sm text-gray-300 mb-2">
          Scanning ID {{ store.state.backgroundOperations.motorDiscovery.currentId }}... 
          ({{ store.state.backgroundOperations.motorDiscovery.progress }}%)
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div 
            class="bg-green-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: store.state.backgroundOperations.motorDiscovery.progress + '%' }"
          ></div>
        </div>
        <div class="text-xs text-gray-400 mt-1">
          Found {{ store.foundDevices.value.length }} motors so far...
        </div>
      </div>

      <div v-if="store.foundDevices.value.length > 0" class="mb-3">
        <div class="text-sm text-gray-300 mb-2">Found Motors:</div>
        <div class="space-y-1">
          <div
            v-for="device in store.foundDevices.value"
            :key="device.id"
            class="text-sm text-cyan-400 bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600"
            @click="selectMotor(device.id)"
          >
            ID {{ device.id }}: {{ device.modelName }} (Model: {{ device.modelNumber }})
            <span class="text-xs text-gray-400 block mt-1">Click to configure this motor</span>
          </div>
        </div>
      </div>

      <div v-else-if="!store.isMotorScanning.value && store.isConnectedToU2D2.value" class="text-sm text-gray-500">
        No motors found. Click "Scan for Motors" to search.
      </div>

      <div v-else-if="!store.isConnectedToU2D2.value" class="text-sm text-gray-500">
        Please connect to U2D2 first using the device panel in the top-right.
      </div>
    </div>

    <!-- Discovery Log Section -->
    <div class="bg-gray-900 text-green-400 p-4 rounded-lg flex-1 overflow-hidden font-mono text-sm flex flex-col">
      <div class="flex items-center mb-3 flex-shrink-0">
        <h3 class="text-white font-semibold">Discovery Log</h3>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="store.logs.value.length === 0" class="text-gray-500 italic">
          Discovery logs will appear here.
        </div>
        <div
          v-for="log in store.logs.value"
          :key="log.id"
          class="mb-1 leading-relaxed"
          :class="getLogClass(log.type)"
        >
          <span class="text-gray-400 text-xs mr-2">{{ log.timestamp }}</span>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- Control Buttons -->
    <div class="flex flex-wrap gap-2 flex-shrink-0 pb-16 lg:pb-2">
      <button
        @click="simulateMessages"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex-1 sm:flex-none"
      >
        Simulate
      </button>
      <button
        @click="clearLogs"
        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex-1 sm:flex-none"
      >
        Clear Logs
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useDynamixelStore } from '../stores/dynamixelStore'

// Use global store instead of local state
const store = useDynamixelStore()

// Local state for simulation
const isRunning = ref(false)

const addLog = (message: string, type: string = 'info') => {
  store.addLog(message, type)

  // Log to electron-log based on type
  if (window.electronLog) {
    switch (type) {
      case 'error':
        window.electronLog.error(message);
        break;
      case 'warning':
        window.electronLog.warn(message);
        break;
      case 'success':
      case 'device':
        window.electronLog.info(message);
        break;
      case 'progress':
        window.electronLog.debug(message);
        break;
      default:
        window.electronLog.info(message);
    }
  }

  nextTick(() => {
    const container = document.querySelector('.flex-1.overflow-y-auto')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

const getLogClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    case 'device':
      return 'text-cyan-400'
    case 'progress':
      return 'text-blue-400'
    default:
      return 'text-green-400'
  }
}

const clearLogs = () => {
  store.clearLogs()
}

const emit = defineEmits(['navigate-to-page'])

const selectMotor = (motorId) => {
  store.setSelectedMotorId(motorId)
  // Navigate to motor page
  emit('navigate-to-page', 'Motor')
}


const startBackgroundDiscovery = async () => {
  if (!store.isConnectedToU2D2.value || store.state.backgroundOperations.motorDiscovery.isRunning) return

  try {
    addLog('🤖 Starting background motor discovery...', 'info')
    store.setFoundDevices([]) // Clear previous results
    
    // Start background discovery (non-blocking)
    window.dynamixelAPI.startBackgroundDiscovery({ startId: 1, endId: 20 })
    
  } catch (error) {
    addLog(`❌ Failed to start background discovery: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const cancelBackgroundDiscovery = async () => {
  try {
    addLog('⏹️ Cancelling motor discovery...', 'info')
    await window.dynamixelAPI.cancelBackgroundDiscovery()
  } catch (error) {
    addLog(`❌ Failed to cancel discovery: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// Keep the old scan function as fallback
const scanForMotors = async () => {
  if (!store.isConnectedToU2D2.value || store.isMotorScanning.value) return

  store.setMotorScanning(true)
  store.setFoundDevices([])

  try {
    // Discover motors
    addLog('🤖 Starting motor discovery...', 'info')
    const devices = await window.dynamixelAPI.quickDiscovery()
    store.setFoundDevices(devices)

    // Show summary
    if (devices.length > 0) {
      addLog('📊 Motor Discovery Results:', 'info')
      devices.forEach(device => {
        addLog(`   ID ${device.id}: ${device.modelName} (Model: ${device.modelNumber})`, 'device')
      })

      // Test first device if it has a valid ID
      if (devices.length > 0 && devices[0].id > 0) {
        try {
          addLog('🧪 Testing first motor...', 'info')
          await window.dynamixelAPI.testDevice(devices[0].id)
        } catch (testError) {
          addLog(`   Testing skipped: ${testError instanceof Error ? testError.message : 'Unknown error'}`, 'warning')
        }
      }
    } else {
      addLog('❌ No DYNAMIXEL motors found. Please check:', 'warning')
      addLog('   - DYNAMIXEL devices are connected to the bus', 'warning')
      addLog('   - Power is supplied to the devices', 'warning')
      addLog('   - Baud rate matches (default: 57600 for Protocol 2.0)', 'warning')
      addLog('   - Device IDs are in the scanned range', 'warning')
    }

  } catch (error) {
    addLog(`❌ Motor discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    store.disconnect()
  } finally {
    store.setMotorScanning(false)
  }
}


const simulateDiscoveryProcess = async () => {
  // Simulate USB device listing
  addLog('📋 Found 3 USB devices:', 'info')
  addLog('  1. VID: 0x0403, PID: 0x6014', 'info')
  addLog('  2. VID: 0x2341, PID: 0x0043', 'info')
  addLog('  3. VID: 0x16d0, PID: 0x0557', 'info')

  await sleep(1000)
  addLog('✅ Connected to U2D2 device', 'success')

  await sleep(500)
  addLog('🔍 Starting device discovery...', 'info')
  addLog('This may take a while depending on the range of IDs to scan.', 'info')

  await sleep(500)
  addLog('📍 Quick discovery (IDs 1-20):', 'info')

  // Simulate scanning progress
  for (let i = 1; i <= 20; i++) {
    if (!isRunning.value) return
    addLog(`   Scanning ID ${i}... (${i}/20)`, 'progress')
    await sleep(100)

    // Simulate finding devices
    if (i === 1) {
      addLog('🔍 Found device: ID 1, Model: XM430-W350-T (1030), FW: 42', 'device')
    }
    if (i === 5) {
      addLog('🔍 Found device: ID 5, Model: XL430-W250-T (1060), FW: 45', 'device')
    }
  }

  addLog('   Found 2 devices in quick scan', 'success')

  await sleep(500)
  addLog('📍 Pinging specific device (ID 1):', 'info')
  addLog('   Device ID 1: XM430-W350-T (1030), FW: 42', 'device')

  await sleep(500)
  addLog('📊 Device Summary:', 'info')
  addLog('   ID 1: XM430-W350-T (Model: 1030)', 'device')
  addLog('   ID 5: XL430-W250-T (Model: 1060)', 'device')

  await sleep(500)
  addLog('🧪 Testing first device...', 'info')
  addLog('   Pinging device 1...', 'progress')
  await sleep(300)
  addLog('   Testing LED on device 1...', 'progress')
  await sleep(1000)
  addLog('   Reading status from device 1...', 'progress')
  await sleep(500)
  addLog('   Temperature: 32°C', 'device')
  addLog('   Voltage: 11.8V', 'device')
  addLog('   Position: 2048 (180.0°)', 'device')

  addLog('✅ Discovery complete! Found 2 device(s)', 'success')
}

const simulateMessages = () => {
  const messages = [
    { msg: '🔌 Attempting to connect to U2D2...', type: 'info' },
    { msg: '✅ Connected to U2D2 device', type: 'success' },
    { msg: '🔍 Found device: ID 3, Model: AX-12A (12), FW: 32', type: 'device' },
    { msg: '❌ Error: Timeout waiting for response', type: 'error' },
    { msg: '⚠️ Device at ID 7 not responding', type: 'warning' },
    { msg: '   Temperature: 45°C', type: 'device' },
    { msg: '   Voltage: 12.1V', type: 'device' }
  ]

  messages.forEach((item, index) => {
    setTimeout(() => addLog(item.msg, item.type), index * 200)
  })
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Set up event listeners when component mounts
onMounted(() => {
  if (window.dynamixelAPI) {
    window.dynamixelAPI.onStatusUpdate(({ message, type }) => {
      addLog(message, type)
    })

    window.dynamixelAPI.onDeviceFound((device) => {
      // Device found events are handled through the store in connectAndDiscoverMotors
    })

    window.dynamixelAPI.onDiscoveryProgress((_progress) => {
      // Progress updates are handled by onStatusUpdate
    })

    // Background discovery event listeners
    window.dynamixelAPI.onBackgroundDiscoveryStarted?.((data) => {
      store.setMotorDiscoveryState(true, 0, data.startId)
      addLog(`🔍 Starting background scan (IDs ${data.startId}-${data.endId})...`, 'info')
    })

    window.dynamixelAPI.onBackgroundDiscoveryProgress?.((data) => {
      store.updateMotorDiscoveryProgress(data.progress, data.currentId)
      // Don't spam logs with every progress update
    })

    window.dynamixelAPI.onBackgroundDeviceFound?.((device) => {
      // Add device to found devices list immediately
      const currentDevices = store.foundDevices.value
      const newDevices = [...currentDevices, device]
      store.setFoundDevices(newDevices)
      addLog(`🔍 Found device: ID ${device.id}, ${device.modelName} (Model: ${device.modelNumber})`, 'device')
    })

    window.dynamixelAPI.onBackgroundDiscoveryComplete?.((data) => {
      store.setMotorDiscoveryState(false, 100, 0)
      addLog(`✅ Background discovery complete! Found ${data.total} device(s)`, 'success')
      
      if (data.total === 0) {
        addLog('❌ No DYNAMIXEL motors found. Please check:', 'warning')
        addLog('   - DYNAMIXEL devices are connected to the bus', 'warning')
        addLog('   - Power is supplied to the devices', 'warning')
        addLog('   - Baud rate matches (default: 57600 for Protocol 2.0)', 'warning')
        addLog('   - Device IDs are in the scanned range', 'warning')
      }
    })

    window.dynamixelAPI.onBackgroundDiscoveryError?.((data) => {
      store.setMotorDiscoveryState(false, 0, 0)
      addLog(`❌ Background discovery failed: ${data.error}`, 'error')
    })

    window.dynamixelAPI.onBackgroundDiscoveryCancelled?.(() => {
      store.setMotorDiscoveryState(false, 0, 0)
      addLog('⏹️ Motor discovery cancelled', 'info')
    })
  }
})

// Clean up event listeners when component unmounts
onUnmounted(() => {
  if (window.dynamixelAPI) {
    window.dynamixelAPI.removeAllListeners()
  }
})
</script>
