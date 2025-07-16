<template>
  <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-gray-900">U2D2 Device</h3>
      <div class="flex items-center space-x-1">
        <div :class="[
          'w-2 h-2 rounded-full',
          store.isConnectedToU2D2.value ? 'bg-green-500' : 'bg-gray-300'
        ]"></div>
        <span :class="[
          'text-xs',
          store.isConnectedToU2D2.value ? 'text-green-600' : 'text-gray-500'
        ]">
          {{ store.isConnectedToU2D2.value ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <div class="space-y-2">
      <!-- Device Selection -->
      <div class="flex items-center space-x-2">
        <select 
          v-model="selectedDevicePath"
          @change="onDeviceSelected"
          :disabled="store.isConnectedToU2D2.value || store.isU2D2Scanning.value"
          class="flex-1 text-xs p-1.5 bg-white border border-gray-300 rounded focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">{{ store.isU2D2Scanning.value ? 'Scanning...' : 'Select U2D2 device...' }}</option>
          <option 
            v-for="(device, index) in store.u2d2Devices.value" 
            :key="index" 
            :value="device.path"
          >
            {{ device.name || device.displayName }} {{ device.type === 'serial' ? `(${device.path})` : '' }}
          </option>
        </select>
        
        <button
          @click="refreshDevices"
          :disabled="store.isConnectedToU2D2.value || store.isU2D2Scanning.value"
          class="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 border border-gray-300 rounded text-gray-600"
          title="Refresh devices"
        >
          <svg class="w-3 h-3" :class="{ 'animate-spin': store.isU2D2Scanning.value }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Connect/Disconnect Button -->
      <button
        v-if="!store.isConnectedToU2D2.value"
        @click="connectToDevice"
        :disabled="!selectedDevice"
        class="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs rounded font-medium"
      >
        Connect
      </button>
      
      <button
        v-else
        @click="disconnectFromDevice"
        class="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium"
      >
        Disconnect
      </button>

      <!-- Selected Device Info -->
      <div v-if="selectedDevice && !store.isConnectedToU2D2.value" class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        Ready to connect to {{ selectedDevice.name }}
      </div>
      
      <div v-else-if="store.isConnectedToU2D2.value && store.selectedU2D2Device.value" class="text-xs text-green-700 bg-green-50 p-2 rounded">
        Connected to {{ store.selectedU2D2Device.value.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDynamixelStore } from '../stores/dynamixelStore'

const store = useDynamixelStore()

// Local state
const selectedDevice = ref(null)
const selectedDevicePath = ref('')

// Sync selectedDevice with store and update path
watch(() => store.selectedU2D2Device.value, (newDevice) => {
  selectedDevice.value = newDevice
  selectedDevicePath.value = newDevice?.path || ''
  console.log('Store device changed:', newDevice?.displayName, 'Path:', selectedDevicePath.value)
}, { immediate: true })

// Update store when local selection changes (find device by path)
watch(selectedDevicePath, (newPath) => {
  if (!newPath) {
    selectedDevice.value = null
    store.setSelectedU2D2Device(null)
    return
  }
  
  const device = store.u2d2Devices.value.find(d => d.path === newPath)
  if (device) {
    selectedDevice.value = device
    store.setSelectedU2D2Device(device)
    console.log('Path selection changed, found device:', device.displayName)
  }
})

// Utility function to create a clean, serializable copy of a device object
const serializeDevice = (device: any) => {
  return {
    type: device.type,
    displayName: device.displayName,
    name: device.name,
    path: device.path,
    manufacturer: device.manufacturer,
    description: device.description,
    vendorId: device.vendorId,
    productId: device.productId,
    isU2D2: device.isU2D2
  }
}

const refreshDevices = async () => {
  if (store.isU2D2Scanning.value || store.isConnectedToU2D2.value) return
  
  console.log('Refreshing U2D2 devices...')
  store.setU2D2Scanning(true)
  store.setU2D2Devices([])
  // Don't clear selected device if we're already connected (auto-connect case)
  if (!store.isConnectedToU2D2.value) {
    store.setSelectedU2D2Device(null)
  }
  
  try {
    // Get U2D2-specific devices
    const devices = await window.dynamixelAPI.discoverU2D2Devices()
    store.setU2D2Devices(devices)
  } catch (error) {
    console.error('U2D2 discovery failed:', error)
  } finally {
    store.setU2D2Scanning(false)
  }
}

const onDeviceSelected = async () => {
  // Find the device by the selected path
  const device = store.u2d2Devices.value.find(d => d.path === selectedDevicePath.value)
  if (!device) return
  
  try {
    // Create a clean, serializable copy of the device object
    const cleanDevice = serializeDevice(device)
    await window.dynamixelAPI.selectU2D2Device(cleanDevice)
    console.log('Device selected via dropdown:', device.displayName)
  } catch (error) {
    console.error('Failed to select device:', error)
  }
}

const connectToDevice = async () => {
  if (!selectedDevice.value || store.isConnectedToU2D2.value) return
  
  try {
    // Get connection settings
    const connectionSettings = await window.settingsAPI.getConnection()
    
    // Connect to selected U2D2 device
    const connected = await window.dynamixelAPI.connectToSelectedDevice(connectionSettings)
    
    if (!connected) {
      return
    }
    
    store.setConnection(selectedDevice.value, connectionSettings)
    
    // Auto-scan for motors after connection
    setTimeout(async () => {
      if (store.isConnectedToU2D2.value) {
        try {
          store.setMotorScanning(true)
          const devices = await window.dynamixelAPI.quickDiscovery()
          store.setFoundDevices(devices)
        } catch (error) {
          console.error('Auto motor scan failed:', error)
        } finally {
          store.setMotorScanning(false)
        }
      }
    }, 500)
    
  } catch (error) {
    console.error('Connection failed:', error)
    store.disconnect()
  }
}

const disconnectFromDevice = async () => {
  try {
    await window.dynamixelAPI.disconnect()
    store.disconnect()
    store.setFoundDevices([])
  } catch (error) {
    console.error('Disconnect failed:', error)
  }
}

// Auto-discover devices on mount
onMounted(() => {
  console.log('U2D2DevicePanel mounted, connection state:', store.isConnectedToU2D2.value)
  
  // Setup auto-connect event listener first
  if (window.dynamixelAPI && window.dynamixelAPI.onAutoConnectSuccess) {
    console.log('Setting up auto-connect event listener')
    window.dynamixelAPI.onAutoConnectSuccess(({ device, connectionSettings }) => {
      console.log('Auto-connect event received:', device.displayName, 'Current connection state:', store.isConnectedToU2D2.value)
      
      // Update the store with the auto-connected device
      store.setConnection(device, connectionSettings)
      
      // Update local selected device state
      selectedDevice.value = device
      selectedDevicePath.value = device.path
      
      // Ensure the device is in the U2D2 devices list
      const currentDevices = store.u2d2Devices.value
      const deviceExists = currentDevices.some(d => d.path === device.path)
      if (!deviceExists) {
        console.log('Adding auto-connected device to devices list')
        store.setU2D2Devices([...currentDevices, device])
      } else {
        console.log('Auto-connected device already in devices list')
      }
      
      console.log('Auto-connect UI update complete. Connected:', store.isConnectedToU2D2.value, 'Selected device:', selectedDevice.value?.displayName, 'Selected path:', selectedDevicePath.value)
      console.log('Available devices in dropdown:', store.u2d2Devices.value.map(d => `${d.displayName} (${d.path})`).join(', '))
    })
  } else {
    console.warn('Auto-connect API not available')
  }
  
  // Then refresh devices (but only if not already connected)
  if (!store.isConnectedToU2D2.value) {
    console.log('Not connected, refreshing devices')
    refreshDevices()
  } else {
    console.log('Already connected, skipping device refresh')
  }
})

// Clean up event listeners on unmount
onUnmounted(() => {
  if (window.dynamixelAPI && window.dynamixelAPI.removeAllListeners) {
    window.dynamixelAPI.removeAllListeners()
  }
})
</script>