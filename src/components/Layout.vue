<template>
  <!--
    This example requires updating your template:

    ```
    <html class="h-full bg-white">
    <body class="h-full">
    ```
  -->
  <div>
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="transition-opacity ease-linear duration-300" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild as="template" enter="transition ease-in-out duration-300 transform" enter-from="-translate-x-full" enter-to="translate-x-0" leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0" leave-to="-translate-x-full">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in-out duration-300" leave-from="opacity-100" leave-to="opacity-0">
                <div class="absolute top-0 left-full flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="size-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <!-- Sidebar component, swap this element with another sidebar if you like -->
              <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <div class="flex h-16 shrink-0 items-center">
                  <img :src="dynaForgeLogo" alt="DynaForge" class="h-16 w-auto" />
                </div>
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="-mx-2 space-y-1">
                        <li v-for="item in navigation" :key="item.name">
                          <button @click="setCurrentPage(item.name)" :class="[item.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600', 'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left']">
                            <component :is="item.icon" :class="[item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600', 'size-6 shrink-0']" aria-hidden="true" />
                            {{ item.name }}
                          </button>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <div class="text-xs/6 font-semibold text-gray-400">Motors</div>
                      <ul role="list" class="-mx-2 mt-2 space-y-1">
                        <li v-for="motor in motorsList" :key="motor.id">
                          <button @click="selectMotor(motor.id)" :class="[motor.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600', 'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left']">
                            <span :class="[motor.current ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600', 'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white text-[0.625rem] font-medium']">{{ motor.initial }}</span>
                            <div class="truncate">
                              <div class="font-medium">{{ motor.name }}</div>
                              <div class="text-xs text-gray-500">{{ motor.modelName }}</div>
                            </div>
                          </button>
                        </li>
                        <li v-if="motorsList.length === 0" class="text-xs text-gray-500 italic px-2 py-1">
                          No motors found
                        </li>
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <!-- Sidebar component, swap this element with another sidebar if you like -->
      <div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
        <div class="flex h-20 shrink-0 items-center">
          <img :src="dynaForgeLogo" alt="DynaForge" class="h-24 w-auto" />
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                <li v-for="item in navigation" :key="item.name">
                  <button @click="setCurrentPage(item.name)" :class="[item.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600', 'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left']">
                    <component :is="item.icon" :class="[item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600', 'size-6 shrink-0']" aria-hidden="true" />
                    {{ item.name }}
                  </button>
                </li>
              </ul>
            </li>
            <li>
              <div class="text-xs/6 font-semibold text-gray-400">Motors</div>
              <ul role="list" class="-mx-2 mt-2 space-y-1">
                <li v-for="motor in motorsList" :key="motor.id">
                  <button @click="selectMotor(motor.id)" :class="[motor.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600', 'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left']">
                    <span :class="[motor.current ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600', 'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white text-[0.625rem] font-medium']">{{ motor.initial }}</span>
                    <div class="truncate">
                      <div class="font-medium">{{ motor.name }}</div>
                      <div class="text-xs text-gray-500">{{ motor.modelName }}</div>
                    </div>
                  </button>
                </li>
                <li v-if="motorsList.length === 0" class="text-xs text-gray-500 italic px-2 py-1">
                  No motors found
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div class="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden">
      <button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden" @click="sidebarOpen = true">
        <span class="sr-only">Open sidebar</span>
        <Bars3Icon class="size-6" aria-hidden="true" />
      </button>
      <div class="flex-1 text-sm/6 font-semibold text-gray-900">{{ currentPage }}</div>

      <!-- U2D2 Device Panel -->
      <div class="flex-shrink-0">
        <U2D2DevicePanel />
      </div>
    </div>

    <main class="lg:pl-72 h-screen flex flex-col pt-0">
      <!-- Desktop U2D2 Device Panel -->
      <div class="hidden lg:block absolute top-4 right-4 z-30">
        <U2D2DevicePanel />
      </div>

      <div v-if="currentPage === 'Discovery'" class="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900">Device Discovery</h1>
        <p class="mt-2 text-gray-600">Discover and test DYNAMIXEL devices connected to your U2D2 interface.</p>
      </div>

      <div v-if="currentPage === 'Remote Control'" class="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900">Remote Control</h1>
        <p class="mt-2 text-gray-600">Connect motors over the Internet using UDP with STUN/TURN NAT traversal.</p>
      </div>

      <div v-if="currentPage === 'Settings'" class="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <p class="mt-2 text-gray-600">Configure connection settings and application preferences.</p>
      </div>

      <div v-if="currentPage !== 'Discovery' && currentPage !== 'Remote Control' && currentPage !== 'Settings'" class="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900">{{ currentPage }}</h1>
        <p class="mt-2 text-gray-600">This section is under development.</p>
      </div>

      <div class="flex-1 px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        <DiscoveryComponent v-if="currentPage === 'Discovery'" @navigate-to-page="setCurrentPage" />
        <RemoteControlComponent v-else-if="currentPage === 'Remote Control'" />
        <SettingsComponent v-else-if="currentPage === 'Settings'" />
        <MotorDashboard v-else-if="currentPage === 'Motor' && store.selectedMotorId.value" :motorId="store.selectedMotorId.value" />
        <div v-else class="h-full flex items-center justify-center text-gray-500">
          <div class="text-center">
            <h3 class="text-lg font-medium">{{ currentPage }}</h3>
            <p class="mt-2">This section is coming soon.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  Cog6ToothIcon,
  SignalIcon,
} from '@heroicons/vue/24/outline'
import DiscoveryComponent from './DiscoveryComponent.vue'
import SettingsComponent from './SettingsComponent.vue'
import MotorDashboard from './MotorDashboard.vue'
import U2D2DevicePanel from './U2D2DevicePanel.vue'
import RemoteControlComponent from './RemoteControlComponent.vue'
import { useDynamixelStore } from '../stores/dynamixelStore'
import dynaForgeLogo from '../assets/dynaforge.png'

const navigation = [
  { name: 'Discovery', href: '#', icon: MagnifyingGlassIcon, current: true },
  { name: 'Remote Control', href: '#', icon: SignalIcon, current: false },
  { name: 'Settings', href: '#', icon: Cog6ToothIcon, current: false },
]
const sidebarOpen = ref(false)
const currentPage = ref('Discovery')
const store = useDynamixelStore()

// Computed property for motors list
const motorsList = computed(() => {
  return store.foundDevices.value.map(device => ({
    id: device.id,
    name: `Motor ${device.id}`,
    modelName: device.modelName,
    modelNumber: device.modelNumber,
    initial: device.id.toString(),
    current: store.selectedMotorId.value === device.id
  }))
})

const setCurrentPage = (pageName) => {
  currentPage.value = pageName
  // Clear motor selection when navigating away from motor pages
  if (pageName !== 'Motor') {
    store.setSelectedMotorId(null)
  }
  // Update navigation current state
  navigation.forEach(item => {
    item.current = item.name === pageName
  })
  // Close mobile sidebar when navigation item is clicked
  sidebarOpen.value = false
}

const selectMotor = (motorId) => {
  store.setSelectedMotorId(motorId)
  currentPage.value = 'Motor'
  // Update navigation current state
  navigation.forEach(item => {
    item.current = false
  })
  // Close mobile sidebar when motor is selected
  sidebarOpen.value = false
}
</script>
