import { reactive, computed, readonly } from 'vue'
import type { DeviceInfo, CommunicationDevice } from '../services/dynamixel-controller'
import type { ConnectionSettings } from '../services/settings-service'

// Global reactive state
const state = reactive({
  // Connection state
  isConnectedToU2D2: false,
  selectedU2D2Device: null as CommunicationDevice | null,
  connectionSettings: null as ConnectionSettings | null,
  
  // Device discovery state
  u2d2Devices: [] as CommunicationDevice[],
  foundDevices: [] as DeviceInfo[],
  
  // UI state
  isU2D2Scanning: false,
  isMotorScanning: false,
  selectedMotorId: null as number | null,
  
  // Background operations state
  backgroundOperations: {
    motorDiscovery: {
      isRunning: false,
      startTime: null as Date | null,
      progress: 0,
      currentId: 0
    }
  } as {
    motorDiscovery: {
      isRunning: boolean
      startTime: Date | null
      progress: number
      currentId: number
    }
  },
  
  // Logs (limited to last 100 entries to prevent memory issues)
  logs: [] as Array<{
    id: number
    timestamp: string
    message: string
    type: string
  }>
})

let logId = 0
const MAX_LOGS = 100

// State management functions
export function useDynamixelStore() {
  
  // Connection management
  const setConnection = (device: CommunicationDevice, settings: ConnectionSettings) => {
    state.selectedU2D2Device = device
    state.connectionSettings = settings
    state.isConnectedToU2D2 = true
    
    // Save last connected device to settings (serialize only essential properties)
    if (window.settingsAPI) {
      const serializableDevice = {
        type: device.type,
        path: device.path,
        displayName: device.displayName,
        isU2D2: device.isU2D2,
        // Don't save non-serializable properties like device handles
      }
      window.settingsAPI.set('lastConnectedDevice', serializableDevice).catch(error => {
        console.error('Failed to save last connected device:', error)
      })
    }
  }
  
  const disconnect = () => {
    state.isConnectedToU2D2 = false
    state.foundDevices = []
    // Keep selectedU2D2Device and u2d2Devices for reconnection
  }
  
  const resetAll = () => {
    state.isConnectedToU2D2 = false
    state.selectedU2D2Device = null
    state.connectionSettings = null
    state.u2d2Devices = []
    state.foundDevices = []
    state.isU2D2Scanning = false
    state.isMotorScanning = false
    state.logs = []
    logId = 0
  }
  
  // Device management
  const setU2D2Devices = (devices: CommunicationDevice[]) => {
    state.u2d2Devices = devices
  }
  
  const setSelectedU2D2Device = (device: CommunicationDevice | null) => {
    state.selectedU2D2Device = device
  }
  
  const setFoundDevices = (devices: DeviceInfo[]) => {
    state.foundDevices = devices
  }
  
  // Scanning state
  const setU2D2Scanning = (scanning: boolean) => {
    state.isU2D2Scanning = scanning
  }
  
  const setMotorScanning = (scanning: boolean) => {
    state.isMotorScanning = scanning
  }
  
  // Motor selection
  const setSelectedMotorId = (motorId: number | null) => {
    state.selectedMotorId = motorId
  }
  
  // Log management
  const addLog = (message: string, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = {
      id: logId++,
      timestamp,
      message,
      type
    }
    
    state.logs.push(newLog)
    
    // Keep only the last MAX_LOGS entries
    if (state.logs.length > MAX_LOGS) {
      state.logs.splice(0, state.logs.length - MAX_LOGS)
    }
  }
  
  const clearLogs = () => {
    state.logs = []
    logId = 0
  }
  
  // Background operations management
  const setMotorDiscoveryState = (isRunning: boolean, progress = 0, currentId = 0) => {
    state.backgroundOperations.motorDiscovery.isRunning = isRunning
    state.backgroundOperations.motorDiscovery.progress = progress
    state.backgroundOperations.motorDiscovery.currentId = currentId
    state.backgroundOperations.motorDiscovery.startTime = isRunning ? new Date() : null
  }
  
  const updateMotorDiscoveryProgress = (progress: number, currentId: number) => {
    state.backgroundOperations.motorDiscovery.progress = progress
    state.backgroundOperations.motorDiscovery.currentId = currentId
  }
  
  // Computed properties
  const isConnected = computed(() => state.isConnectedToU2D2)
  const hasSelectedDevice = computed(() => state.selectedU2D2Device !== null)
  const hasFoundDevices = computed(() => state.foundDevices.length > 0)
  
  const connectionStatus = computed(() => {
    if (!state.isConnectedToU2D2) return 'Disconnected'
    if (state.selectedU2D2Device) {
      return `Connected to ${state.selectedU2D2Device.displayName}`
    }
    return 'Connected'
  })
  
  // Expose reactive state and functions
  return {
    // Reactive state (read-only)
    state: readonly(state),
    
    // Connection management
    setConnection,
    disconnect,
    resetAll,
    
    // Device management  
    setU2D2Devices,
    setSelectedU2D2Device,
    setFoundDevices,
    
    // Scanning state
    setU2D2Scanning,
    setMotorScanning,
    
    // Motor selection
    setSelectedMotorId,
    
    // Log management
    addLog,
    clearLogs,
    
    // Background operations
    setMotorDiscoveryState,
    updateMotorDiscoveryProgress,
    
    // Computed properties
    isConnected,
    hasSelectedDevice,
    hasFoundDevices,
    connectionStatus,
    
    // Direct state access for convenience
    isConnectedToU2D2: computed(() => state.isConnectedToU2D2),
    selectedU2D2Device: computed(() => state.selectedU2D2Device),
    connectionSettings: computed(() => state.connectionSettings),
    u2d2Devices: computed(() => state.u2d2Devices),
    foundDevices: computed(() => state.foundDevices),
    isU2D2Scanning: computed(() => state.isU2D2Scanning),
    isMotorScanning: computed(() => state.isMotorScanning),
    selectedMotorId: computed(() => state.selectedMotorId),
    logs: computed(() => state.logs)
  }
}

// Create a singleton instance for global access
const globalStore = useDynamixelStore()

// Export individual functions for direct import
export const { 
  setConnection,
  disconnect, 
  resetAll,
  setU2D2Devices,
  setSelectedU2D2Device, 
  setFoundDevices,
  setU2D2Scanning,
  setMotorScanning,
  setSelectedMotorId,
  addLog,
  clearLogs,
  setMotorDiscoveryState,
  updateMotorDiscoveryProgress
} = globalStore

// Export the store for component use
export default globalStore