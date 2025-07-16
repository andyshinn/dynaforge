<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 space-y-6 overflow-y-auto pr-2">
      <!-- Connection Settings -->
      <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Connection Settings</h3>
        
        <div class="space-y-4">
          <!-- Connection Type -->
          <div>
            <label for="connectionType" class="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <select
              id="connectionType"
              v-model="settings.connectionType"
              @change="saveSettings"
              class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option v-for="type in connectionTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
            <p class="mt-1 text-sm text-gray-500">
              {{ getConnectionDescription(settings.connectionType) }}
            </p>
          </div>

          <!-- Baud Rate -->
          <div>
            <label for="baudRate" class="block text-sm font-medium text-gray-700 mb-2">
              Baud Rate
            </label>
            <select
              id="baudRate"
              v-model="settings.baudRate"
              @change="saveSettings"
              class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option v-for="rate in baudRates" :key="rate.value" :value="rate.value">
                {{ rate.label }}
              </option>
            </select>
            <p class="mt-1 text-sm text-gray-500">
              Communication speed for serial connections (57600 is recommended for most devices)
            </p>
          </div>

          <!-- Timeout -->
          <div>
            <label for="timeout" class="block text-sm font-medium text-gray-700 mb-2">
              Connection Timeout (ms)
            </label>
            <input
              id="timeout"
              v-model.number="settings.timeout"
              @change="saveSettings"
              type="number"
              min="100"
              max="10000"
              step="100"
              class="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            <p class="mt-1 text-sm text-gray-500">
              Maximum time to wait for device responses
            </p>
          </div>

          <!-- Auto-Connect -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <label for="autoConnect" class="text-sm font-medium text-gray-700">
                Auto-Connect on Launch
              </label>
              <p class="text-sm text-gray-500">
                Automatically connect to last used device when the app starts
              </p>
            </div>
            <div class="flex items-center">
              <input
                id="autoConnect"
                v-model="settings.autoConnect"
                @change="saveSettings"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Discovery Settings -->
      <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Discovery Settings</h3>
        
        <div class="space-y-4">
          <!-- Discovery Range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="startId" class="block text-sm font-medium text-gray-700 mb-2">
                Start ID
              </label>
              <input
                id="startId"
                v-model.number="settings.discoveryStartId"
                @change="saveSettings"
                type="number"
                min="1"
                max="252"
                class="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div>
              <label for="endId" class="block text-sm font-medium text-gray-700 mb-2">
                End ID
              </label>
              <input
                id="endId"
                v-model.number="settings.discoveryEndId"
                @change="saveSettings"
                type="number"
                min="1"
                max="252"
                class="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          <p class="text-sm text-gray-500">
            ID range for device discovery (1-252, Quick Discovery uses 1-20)
          </p>
        </div>
      </div>

      <!-- Remote Control Settings -->
      <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Remote Control Settings</h3>
        
        <div class="space-y-4">
          <!-- STUN Servers -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              STUN/TURN Servers
            </label>
            <div class="space-y-2">
              <div 
                v-for="(server, index) in settings.stunServers" 
                :key="index"
                class="flex items-center space-x-2"
              >
                <input
                  v-model="settings.stunServers[index]"
                  @change="saveSettings"
                  type="text"
                  placeholder="stun.example.com:3478"
                  class="flex-1 rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                <button
                  @click="removeStunServer(index)"
                  :disabled="settings.stunServers.length <= 1"
                  class="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
              <button
                @click="addStunServer"
                class="text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add STUN Server
              </button>
            </div>
            <p class="mt-1 text-sm text-gray-500">
              STUN servers help discover your public IP for NAT traversal
            </p>
          </div>

          <!-- Default Port -->
          <div>
            <label for="defaultPort" class="block text-sm font-medium text-gray-700 mb-2">
              Default Port
            </label>
            <input
              id="defaultPort"
              v-model.number="settings.defaultPort"
              @change="saveSettings"
              type="number"
              min="1024"
              max="65535"
              class="block w-32 rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            <p class="mt-1 text-sm text-gray-500">
              Default UDP port for remote control connections
            </p>
          </div>

          <!-- Connection Timeout -->
          <div>
            <label for="remoteTimeout" class="block text-sm font-medium text-gray-700 mb-2">
              Connection Timeout (seconds)
            </label>
            <input
              id="remoteTimeout"
              v-model.number="settings.remoteTimeoutSeconds"
              @change="saveSettings"
              type="number"
              min="1"
              max="60"
              class="block w-32 rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            <p class="mt-1 text-sm text-gray-500">
              Time to wait before considering remote connection lost
            </p>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div v-if="saveStatus" class="rounded-md p-4" :class="saveStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg v-if="saveStatus.type === 'success'" class="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.25a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium">{{ saveStatus.message }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Button -->
    <div class="flex-shrink-0 pt-6 border-t border-gray-200">
      <button
        @click="resetToDefaults"
        class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
      >
        Reset to Defaults
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Settings {
  connectionType: string
  baudRate: number
  timeout: number
  discoveryStartId: number
  discoveryEndId: number
  stunServers: string[]
  defaultPort: number
  remoteTimeoutSeconds: number
  autoConnect: boolean
}

const connectionTypes = [
  { value: 'auto', label: 'Auto-detect', description: 'Automatically detect best connection method' },
  { value: 'usb', label: 'USB Direct', description: 'Direct USB connection to U2D2' },
  { value: 'serial', label: 'Serial Port', description: 'Virtual serial port connection' },
  { value: 'webserial', label: 'Web Serial', description: 'Browser Web Serial API (renderer only)' }
]

const baudRates = [
  { value: 57600, label: '57600 (Recommended)' },
  { value: 115200, label: '115200' },
  { value: 1000000, label: '1000000' },
  { value: 2000000, label: '2000000' }
]

const defaultSettings: Settings = {
  connectionType: 'auto',
  baudRate: 57600,
  timeout: 1000,
  discoveryStartId: 1,
  discoveryEndId: 20,
  stunServers: [
    'stun.l.google.com:19302',
    'stun1.l.google.com:19302',
    'stun2.l.google.com:19302'
  ],
  defaultPort: 50000,
  remoteTimeoutSeconds: 5,
  autoConnect: false
}

const settings = ref<Settings>({ ...defaultSettings })
const saveStatus = ref<{ type: 'success' | 'error', message: string } | null>(null)

const getConnectionDescription = (type: string) => {
  const connectionType = connectionTypes.find(t => t.value === type)
  return connectionType?.description || ''
}

const saveSettings = async () => {
  try {
    // Convert reactive object to plain object to avoid cloning issues
    const plainSettings = JSON.parse(JSON.stringify(settings.value))
    
    // Save connection settings (excluding autoConnect)
    const { autoConnect, ...connectionSettings } = plainSettings
    await window.settingsAPI.set('connection', connectionSettings)
    
    // Save autoConnect setting separately
    await window.settingsAPI.set('autoConnect', autoConnect)
    
    saveStatus.value = { type: 'success', message: 'Settings saved successfully' }
    setTimeout(() => {
      saveStatus.value = null
    }, 3000)
  } catch (error) {
    saveStatus.value = { 
      type: 'error', 
      message: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
    setTimeout(() => {
      saveStatus.value = null
    }, 5000)
  }
}

const resetToDefaults = async () => {
  settings.value = { ...defaultSettings }
  await saveSettings()
}

const addStunServer = () => {
  settings.value.stunServers.push('')
}

const removeStunServer = (index: number) => {
  if (settings.value.stunServers.length > 1) {
    settings.value.stunServers.splice(index, 1)
    saveSettings()
  }
}

const loadSettings = async () => {
  try {
    const savedConnectionSettings = await window.settingsAPI.get('connection')
    const savedAutoConnect = await window.settingsAPI.get('autoConnect')
    
    settings.value = { 
      ...defaultSettings, 
      ...savedConnectionSettings,
      autoConnect: savedAutoConnect ?? defaultSettings.autoConnect
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    // Use defaults if loading fails
    settings.value = { ...defaultSettings }
  }
}

onMounted(() => {
  loadSettings()
})
</script>