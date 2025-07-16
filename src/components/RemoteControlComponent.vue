<template>
  <div class="h-full flex flex-col space-y-6 overflow-y-auto pr-2">
    <!-- Connection Mode Selection -->
    <div class="bg-gray-800 rounded-lg p-6">
      <div class="flex items-center mb-4">
        <span class="mr-2">🌐</span>
        <h3 class="text-white font-semibold">Remote Motor Control</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          @click="setMode('leader')"
          :class="[
            'p-4 rounded-lg border-2 transition-colors',
            mode === 'leader' 
              ? 'border-blue-500 bg-blue-900/30 text-blue-200' 
              : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
          ]"
        >
          <div class="font-semibold mb-2">🎮 Leader Mode</div>
          <div class="text-sm opacity-80">Send motor movements to remote follower</div>
        </button>
        
        <button
          @click="setMode('follower')"
          :class="[
            'p-4 rounded-lg border-2 transition-colors',
            mode === 'follower' 
              ? 'border-green-500 bg-green-900/30 text-green-200' 
              : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
          ]"
        >
          <div class="font-semibold mb-2">🎯 Follower Mode</div>
          <div class="text-sm opacity-80">Receive and execute remote commands</div>
        </button>
      </div>

      <!-- Motor Selection -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Select Motor for Remote Control:
        </label>
        <select
          v-model="selectedMotorId"
          class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          :disabled="!store.isConnectedToU2D2.value || store.foundDevices.value.length === 0"
        >
          <option value="">Select a motor...</option>
          <option
            v-for="device in store.foundDevices.value"
            :key="device.id"
            :value="device.id"
          >
            ID {{ device.id }}: {{ device.modelName }} ({{ device.modelNumber }})
          </option>
        </select>
        <div v-if="!store.isConnectedToU2D2.value" class="text-sm text-yellow-400 mt-1">
          Please connect to U2D2 and discover motors first
        </div>
      </div>
    </div>

    <!-- Leader Mode Configuration -->
    <div v-if="mode === 'leader'" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
      <h4 class="text-gray-900 font-semibold mb-4">🎮 Leader Configuration</h4>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Your Public Address:
          </label>
          <div class="flex items-center space-x-2">
            <input
              :value="publicAddress"
              readonly
              class="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-white font-mono text-sm"
              placeholder="Discovering public IP..."
            />
            <button
              @click="discoverPublicAddress"
              :disabled="isDiscoveringAddress"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              {{ isDiscoveringAddress ? 'Discovering...' : 'Refresh' }}
            </button>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Share this address with the follower device
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Listening Port:
          </label>
          <input
            v-model.number="listeningPort"
            type="number"
            min="1024"
            max="65535"
            class="w-32 p-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>

        <button
          @click="connectionStatus?.connected ? stopLeaderMode() : startLeaderMode()"
          :disabled="!selectedMotorId || isConnecting"
          :class="[
            'w-full py-3 text-white rounded font-semibold',
            connectionStatus?.connected 
              ? 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600' 
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
          ]"
        >
          {{ isConnecting ? 'Starting...' : (connectionStatus?.connected ? 'Stop Leader Mode' : 'Start Leader Mode') }}
        </button>
      </div>
    </div>

    <!-- Follower Mode Configuration -->
    <div v-if="mode === 'follower'" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
      <h4 class="text-gray-900 font-semibold mb-4">🎯 Follower Configuration</h4>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Leader Address:
          </label>
          <input
            v-model="leaderAddress"
            type="text"
            placeholder="192.168.1.100:50000"
            class="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white font-mono"
          />
          <div class="text-xs text-gray-500 mt-1">
            Enter the leader's public address and port
          </div>
        </div>

        <button
          @click="connectionStatus?.connected ? stopFollowerMode() : connectToLeader()"
          :disabled="!selectedMotorId || (!leaderAddress && !connectionStatus?.connected) || isConnecting"
          :class="[
            'w-full py-3 text-white rounded font-semibold',
            connectionStatus?.connected 
              ? 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600' 
              : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
          ]"
        >
          {{ isConnecting ? 'Connecting...' : (connectionStatus?.connected ? 'Disconnect from Leader' : 'Connect to Leader') }}
        </button>
      </div>
    </div>

    <!-- Connection Status -->
    <div v-if="connectionStatus" class="bg-gray-800 rounded-lg p-4">
      <div class="flex items-center space-x-2">
        <div
          :class="[
            'w-3 h-3 rounded-full',
            connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
          ]"
        ></div>
        <span class="text-white font-medium">
          {{ connectionStatus.connected ? 'Connected' : 'Disconnected' }}
        </span>
        <span class="text-gray-400 text-sm">
          {{ connectionStatus.message }}
        </span>
      </div>
      
      <div v-if="connectionStatus.connected" class="mt-2 text-xs text-gray-400">
        Remote: {{ connectionStatus.remoteAddress || 'Unknown' }}
        | Latency: {{ connectionStatus.latency || 'N/A' }}ms
      </div>
    </div>

    <!-- Telemetry Display -->
    <div v-if="connectionStatus?.connected" class="bg-gray-900 rounded-lg p-4 flex-1">
      <h4 class="text-white font-semibold mb-4 flex items-center">
        <span class="mr-2">📊</span>
        Motor Telemetry
      </h4>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="bg-gray-800 p-3 rounded">
          <div class="text-xs text-gray-400">Position</div>
          <div class="text-lg font-mono text-cyan-400">
            {{ telemetry.position }}°
          </div>
        </div>
        
        <div class="bg-gray-800 p-3 rounded">
          <div class="text-xs text-gray-400">Velocity</div>
          <div class="text-lg font-mono text-green-400">
            {{ telemetry.velocity }} rpm
          </div>
        </div>
        
        <div class="bg-gray-800 p-3 rounded">
          <div class="text-xs text-gray-400">Current</div>
          <div class="text-lg font-mono text-yellow-400">
            {{ telemetry.current }} mA
          </div>
        </div>
        
        <div class="bg-gray-800 p-3 rounded">
          <div class="text-xs text-gray-400">Temperature</div>
          <div class="text-lg font-mono text-red-400">
            {{ telemetry.temperature }}°C
          </div>
        </div>
      </div>

      <!-- Activity Log -->
      <div class="bg-gray-800 p-3 rounded h-48 overflow-y-auto">
        <div class="text-sm text-gray-400 mb-2">Activity Log:</div>
        <div
          v-for="log in activityLogs"
          :key="log.id"
          class="text-xs font-mono mb-1"
          :class="getLogColor(log.type)"
        >
          <span class="text-gray-500">{{ log.timestamp }}</span>
          {{ log.message }}
        </div>
        <div v-if="activityLogs.length === 0" class="text-xs text-gray-500 italic">
          Activity logs will appear here...
        </div>
      </div>
    </div>

    <!-- Settings Link -->
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-white font-medium">STUN/TURN Settings</div>
          <div class="text-sm text-gray-400">Configure NAT traversal servers</div>
        </div>
        <button
          @click="openSettings"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Configure
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDynamixelStore } from '../stores/dynamixelStore'

const store = useDynamixelStore()

// Component state
const mode = ref<'leader' | 'follower' | ''>('')
const selectedMotorId = ref<number | ''>('')
const publicAddress = ref('')
const listeningPort = ref(50000)
const leaderAddress = ref('')
const isDiscoveringAddress = ref(false)
const isConnecting = ref(false)

// Connection status
const connectionStatus = ref<{
  connected: boolean
  message: string
  remoteAddress?: string
  latency?: number
} | null>(null)

// Telemetry data
const telemetry = ref({
  position: 0,
  velocity: 0,
  current: 0,
  temperature: 0
})

// Activity logs
const activityLogs = ref<Array<{
  id: number
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'data'
}>>([])

let logCounter = 0
const telemetryInterval = ref<NodeJS.Timeout | null>(null)

const setMode = (newMode: 'leader' | 'follower') => {
  if (connectionStatus.value?.connected) {
    addLog('Disconnect from current session before changing modes', 'error')
    return
  }
  mode.value = newMode
  addLog(`Switched to ${newMode} mode`, 'info')
}

const discoverPublicAddress = async () => {
  isDiscoveringAddress.value = true
  addLog('Discovering public IP address via STUN...', 'info')
  
  try {
    // This will call the main process to discover public IP
    const address = await window.remoteControlAPI?.discoverPublicAddress()
    if (address) {
      const fullAddress = `${address}:${listeningPort.value}`
      publicAddress.value = fullAddress
      // Save the public IP (without port) to settings for future use
      await window.settingsAPI?.setPublicIP(address)
      addLog(`Public address: ${fullAddress}`, 'success')
    } else {
      addLog('Could not discover public IP address', 'error')
    }
  } catch (error) {
    addLog(`Failed to discover public address: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isDiscoveringAddress.value = false
  }
}

const startLeaderMode = async () => {
  if (!selectedMotorId.value) return
  
  isConnecting.value = true
  addLog('Starting leader mode...', 'info')
  
  try {
    // First verify the motor is accessible
    await window.dynamixelAPI.pingMotor(selectedMotorId.value as number)
    addLog(`Motor ${selectedMotorId.value} is responding`, 'success')
    
    await window.remoteControlAPI?.startLeader({
      motorId: selectedMotorId.value as number,
      port: listeningPort.value
    })
    
    connectionStatus.value = {
      connected: true,
      message: `Listening on port ${listeningPort.value} - waiting for follower`
    }
    
    addLog(`Leader mode started on port ${listeningPort.value}`, 'success')
    addLog('Waiting for follower to connect...', 'info')
    // Don't start telemetry monitoring until follower connects
  } catch (error) {
    addLog(`Failed to start leader mode: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isConnecting.value = false
  }
}

const stopLeaderMode = async () => {
  isConnecting.value = true
  addLog('Stopping leader mode...', 'info')
  
  try {
    await window.remoteControlAPI?.disconnect()
    
    connectionStatus.value = {
      connected: false,
      message: 'Leader mode stopped'
    }
    
    // Stop telemetry monitoring
    stopTelemetryMonitoring()
    
    addLog('Leader mode stopped successfully', 'success')
  } catch (error) {
    addLog(`Failed to stop leader mode: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isConnecting.value = false
  }
}

const connectToLeader = async () => {
  if (!selectedMotorId.value || !leaderAddress.value) return
  
  isConnecting.value = true
  addLog(`Connecting to leader at ${leaderAddress.value}...`, 'info')
  
  try {
    await window.remoteControlAPI?.connectToLeader({
      motorId: selectedMotorId.value as number,
      leaderAddress: leaderAddress.value
    })
    
    connectionStatus.value = {
      connected: true,
      message: 'Connected to leader',
      remoteAddress: leaderAddress.value
    }
    
    addLog(`Connected to leader at ${leaderAddress.value}`, 'success')
    // Telemetry monitoring will be started by connection update event
  } catch (error) {
    addLog(`Failed to connect to leader: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isConnecting.value = false
  }
}

const stopFollowerMode = async () => {
  isConnecting.value = true
  addLog('Disconnecting from leader...', 'info')
  
  try {
    await window.remoteControlAPI?.disconnect()
    
    connectionStatus.value = {
      connected: false,
      message: 'Disconnected from leader'
    }
    
    // Stop telemetry monitoring
    stopTelemetryMonitoring()
    
    addLog('Disconnected from leader successfully', 'success')
  } catch (error) {
    addLog(`Failed to disconnect from leader: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isConnecting.value = false
  }
}

const startTelemetryMonitoring = () => {
  // Clear any existing interval
  if (telemetryInterval.value) {
    clearInterval(telemetryInterval.value)
  }
  
  let consecutiveErrors = 0
  const maxConsecutiveErrors = 3
  
  // Start periodic telemetry updates with reduced frequency
  telemetryInterval.value = setInterval(async () => {
    if (!connectionStatus.value?.connected || !selectedMotorId.value) {
      stopTelemetryMonitoring()
      return
    }
    
    try {
      const status = await window.dynamixelAPI.readMotorStatus(selectedMotorId.value as number)
      telemetry.value = {
        position: Math.round(status.position * 180 / 2048 * 10) / 10,
        velocity: status.velocity || 0,
        current: status.current || 0,
        temperature: status.temperature || 0
      }
      // Reset error counter on successful read
      consecutiveErrors = 0
    } catch (error) {
      consecutiveErrors++
      
      // Only log errors occasionally to avoid spam
      if (consecutiveErrors <= maxConsecutiveErrors) {
        if (error instanceof Error && error.message.includes('Timeout')) {
          addLog(`Motor ${selectedMotorId.value} timeout (${consecutiveErrors}/${maxConsecutiveErrors})`, 'error')
        } else {
          addLog(`Motor ${selectedMotorId.value} communication error (${consecutiveErrors}/${maxConsecutiveErrors})`, 'error')
        }
      }
      
      // If too many consecutive errors, stop monitoring and disconnect
      if (consecutiveErrors >= maxConsecutiveErrors) {
        addLog(`Too many consecutive errors, stopping telemetry for motor ${selectedMotorId.value}`, 'error')
        stopTelemetryMonitoring()
        // Optionally disconnect the remote session
        if (connectionStatus.value?.connected) {
          await stopLeaderMode()
        }
      }
    }
  }, 1000) // Reduced to 1Hz (1 second intervals) to reduce motor communication load
}

const stopTelemetryMonitoring = () => {
  if (telemetryInterval.value) {
    clearInterval(telemetryInterval.value)
    telemetryInterval.value = null
  }
}

const openSettings = () => {
  // Navigate to settings page or open settings modal
  addLog('Opening STUN/TURN settings...', 'info')
  // This would typically emit an event or use router navigation
}

const addLog = (message: string, type: 'info' | 'success' | 'error' | 'data' = 'info') => {
  const now = new Date()
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  activityLogs.value.push({
    id: logCounter++,
    timestamp,
    message,
    type
  })
  
  // Keep only last 100 logs
  if (activityLogs.value.length > 100) {
    activityLogs.value = activityLogs.value.slice(-100)
  }
  
  // Auto-scroll to bottom
  setTimeout(() => {
    const logContainer = document.querySelector('.overflow-y-auto')
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight
    }
  }, 10)
}

const getLogColor = (type: string) => {
  switch (type) {
    case 'success': return 'text-green-400'
    case 'error': return 'text-red-400'
    case 'data': return 'text-cyan-400'
    default: return 'text-gray-300'
  }
}

// Auto-discover public address when leader mode is selected
const handleModeChange = async () => {
  if (mode.value === 'leader' && !publicAddress.value) {
    await discoverPublicAddress()
  }
}

// Set up event listeners
onMounted(async () => {
  // Load saved public IP on mount
  try {
    const savedPublicIP = await window.settingsAPI?.getPublicIP()
    if (savedPublicIP) {
      publicAddress.value = `${savedPublicIP}:${listeningPort.value}`
      addLog(`Loaded saved public IP: ${savedPublicIP}`, 'info')
    }
  } catch (error) {
    addLog(`Failed to load saved public IP: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }

  if (window.remoteControlAPI) {
    window.remoteControlAPI.onConnectionUpdate?.((status) => {
      const wasConnected = connectionStatus.value?.connected || false
      connectionStatus.value = status
      addLog(status.message, status.connected ? 'success' : 'error')
      
      // Start telemetry monitoring when remote connection is established
      if (status.connected && !wasConnected && selectedMotorId.value) {
        addLog('Remote connection established, starting telemetry...', 'info')
        startTelemetryMonitoring()
      }
      
      // Stop telemetry monitoring when connection is lost
      if (!status.connected && wasConnected) {
        addLog('Remote connection lost, stopping telemetry...', 'error')
        stopTelemetryMonitoring()
      }
    })

    window.remoteControlAPI.onTelemetryData?.((data) => {
      telemetry.value = data
      addLog(`Received: pos=${data.position}° vel=${data.velocity}rpm`, 'data')
    })
  }
})

onUnmounted(() => {
  // Clean up telemetry monitoring
  stopTelemetryMonitoring()
  
  // Clean up any active connections
  if (connectionStatus.value?.connected) {
    window.remoteControlAPI?.disconnect?.()
  }
})
</script>