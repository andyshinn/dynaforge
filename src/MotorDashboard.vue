<template>
  <div class="h-full flex flex-col space-y-4">
    <!-- Motor Info Header -->
    <div class="bg-gray-800 rounded-lg p-4">
      <h2 class="text-white text-xl font-semibold mb-2 flex items-center">
        <span class="mr-2">🤖</span>
        Motor {{ motorId }}
      </h2>
      <div v-if="motorInfo" class="text-gray-300 text-sm">
        <p>Model: {{ motorInfo.modelName }} ({{ motorInfo.modelNumber }})</p>
        <p>Firmware: {{ motorInfo.firmwareVersion }}</p>
      </div>
      <div v-else class="text-gray-500 text-sm">
        Motor information not available
      </div>
    </div>

    <!-- Quick Controls -->
    <div class="bg-gray-800 rounded-lg p-4">
      <h3 class="text-white font-semibold mb-3 flex items-center">
        <span class="mr-2">⚡</span>
        Quick Controls
      </h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          @click="toggleLED"
          :disabled="!store.isConnectedToU2D2.value"
          class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          {{ ledOn ? 'LED Off' : 'LED On' }}
        </button>
        
        <button
          @click="pingMotor"
          :disabled="!store.isConnectedToU2D2.value"
          class="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          Ping
        </button>
        
        <button
          @click="readStatus"
          :disabled="!store.isConnectedToU2D2.value"
          class="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          Read Status
        </button>
        
        <button
          @click="enableTorque"
          :disabled="!store.isConnectedToU2D2.value"
          class="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          Enable Torque
        </button>
        
        <button
          @click="emergencyStop"
          :disabled="!store.isConnectedToU2D2.value"
          class="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white rounded text-sm"
        >
          E-Stop
        </button>
      </div>
    </div>

    <!-- Position Control -->
    <div class="bg-gray-800 rounded-lg p-4">
      <h3 class="text-white font-semibold mb-3 flex items-center">
        <span class="mr-2">🎯</span>
        Position Control
      </h3>
      
      <div class="space-y-3">
        <div class="flex items-center space-x-3">
          <label class="text-gray-300 text-sm w-20">Position:</label>
          <input
            v-model.number="targetPosition"
            type="number"
            min="0"
            max="4095"
            class="flex-1 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="0-4095"
          />
          <button
            @click="moveToPosition"
            :disabled="!store.isConnectedToU2D2.value"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white rounded text-sm"
          >
            Move
          </button>
        </div>
        
        <div class="flex space-x-2">
          <button
            @click="moveToPosition(0)"
            :disabled="!store.isConnectedToU2D2.value"
            class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white rounded text-sm"
          >
            0°
          </button>
          <button
            @click="moveToPosition(1024)"
            :disabled="!store.isConnectedToU2D2.value"
            class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white rounded text-sm"
          >
            90°
          </button>
          <button
            @click="moveToPosition(2048)"
            :disabled="!store.isConnectedToU2D2.value"
            class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white rounded text-sm"
          >
            180°
          </button>
          <button
            @click="moveToPosition(3072)"
            :disabled="!store.isConnectedToU2D2.value"
            class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white rounded text-sm"
          >
            270°
          </button>
        </div>
      </div>
    </div>

    <!-- Motor Status -->
    <div class="bg-gray-800 rounded-lg p-4">
      <h3 class="text-white font-semibold mb-3 flex items-center">
        <span class="mr-2">📊</span>
        Motor Status
      </h3>
      
      <div v-if="motorStatus" class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400">Temperature</div>
          <div class="text-white text-lg font-semibold">{{ motorStatus.temperature }}°C</div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400">Voltage</div>
          <div class="text-white text-lg font-semibold">{{ motorStatus.voltage }}V</div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400">Position</div>
          <div class="text-white text-lg font-semibold">{{ motorStatus.position }} ({{ motorStatus.angle }}°)</div>
        </div>
      </div>
      <div v-else class="text-gray-500 text-sm">
        Click "Read Status" to get current motor information
      </div>
    </div>

    <!-- Activity Log -->
    <div class="bg-gray-900 text-green-400 p-4 rounded-lg flex-1 overflow-hidden font-mono text-sm flex flex-col">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="text-white font-semibold">Motor Activity Log</h3>
        <button
          @click="clearMotorLogs"
          class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
        >
          Clear
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="motorLogs.length === 0" class="text-gray-500 italic">
          Motor activity will appear here.
        </div>
        <div
          v-for="log in motorLogs"
          :key="log.id"
          class="mb-1 leading-relaxed"
          :class="getLogClass(log.type)"
        >
          <span class="text-gray-400 text-xs mr-2">{{ log.timestamp }}</span>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDynamixelStore } from './stores/dynamixelStore'

const props = defineProps<{
  motorId: number
}>()

const store = useDynamixelStore()

// Local state
const ledOn = ref(false)
const targetPosition = ref(2048)
const motorStatus = ref<{
  temperature: number
  voltage: number
  position: number
  angle: number
} | null>(null)

const motorLogs = ref<Array<{
  id: number
  timestamp: string
  message: string
  type: string
}>>([])

let logId = 0

// Computed
const motorInfo = computed(() => {
  return store.foundDevices.value.find(device => device.id === props.motorId)
})

// Methods
const addMotorLog = (message: string, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  motorLogs.value.push({
    id: logId++,
    timestamp,
    message: `[Motor ${props.motorId}] ${message}`,
    type
  })
  
  // Keep only last 50 entries
  if (motorLogs.value.length > 50) {
    motorLogs.value.splice(0, motorLogs.value.length - 50)
  }
}

const getLogClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    case 'info':
      return 'text-blue-400'
    default:
      return 'text-green-400'
  }
}

const clearMotorLogs = () => {
  motorLogs.value = []
  logId = 0
}

const toggleLED = async () => {
  if (!store.isConnectedToU2D2.value) return
  
  try {
    addMotorLog(`${ledOn.value ? 'Turning off' : 'Turning on'} LED...`, 'info')
    await window.dynamixelAPI.controlLED(props.motorId, !ledOn.value)
    ledOn.value = !ledOn.value
    addMotorLog(`LED ${ledOn.value ? 'on' : 'off'}`, 'success')
  } catch (error) {
    addMotorLog(`LED control failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const pingMotor = async () => {
  if (!store.isConnectedToU2D2.value) return
  
  try {
    addMotorLog('Pinging motor...', 'info')
    await window.dynamixelAPI.pingMotor(props.motorId)
    addMotorLog('Ping successful', 'success')
  } catch (error) {
    addMotorLog(`Ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const readStatus = async () => {
  if (!store.isConnectedToU2D2.value) return
  
  try {
    addMotorLog('Reading motor status...', 'info')
    const status = await window.dynamixelAPI.readMotorStatus(props.motorId)
    motorStatus.value = {
      temperature: status.temperature,
      voltage: status.voltage,
      position: status.position,
      angle: Math.round((status.position / 4095) * 360 * 10) / 10
    }
    addMotorLog(`Status: ${status.temperature}°C, ${status.voltage}V, ${status.position} pos`, 'success')
  } catch (error) {
    addMotorLog(`Status read failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const moveToPosition = async (position?: number) => {
  if (!store.isConnectedToU2D2.value) return
  
  const pos = position !== undefined ? position : targetPosition.value
  if (pos < 0 || pos > 4095) {
    addMotorLog('Position must be between 0 and 4095', 'warning')
    return
  }
  
  try {
    const angle = Math.round((pos / 4095) * 360 * 10) / 10
    addMotorLog(`Moving to position ${pos} (${angle}°)...`, 'info')
    await window.dynamixelAPI.moveMotorToPosition(props.motorId, pos)
    addMotorLog(`Move command sent`, 'success')
  } catch (error) {
    addMotorLog(`Move failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const enableTorque = async () => {
  if (!store.isConnectedToU2D2.value) return
  
  try {
    addMotorLog('Enabling torque for all motors...', 'info')
    await window.dynamixelAPI.enableTorqueForAllMotors()
    addMotorLog('Torque enabled for all motors', 'success')
  } catch (error) {
    addMotorLog(`Enable torque failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

const emergencyStop = async () => {
  if (!store.isConnectedToU2D2.value) return
  
  try {
    addMotorLog('Emergency stop activated!', 'warning')
    await window.dynamixelAPI.emergencyStop(props.motorId)
    addMotorLog('Motor stopped', 'success')
  } catch (error) {
    addMotorLog(`Emergency stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

onMounted(() => {
  if (motorInfo.value) {
    addMotorLog(`Connected to ${motorInfo.value.modelName}`, 'success')
  } else {
    addMotorLog('Motor information not found', 'warning')
  }
})
</script>