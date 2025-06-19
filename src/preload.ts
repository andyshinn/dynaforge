import { contextBridge, ipcRenderer } from 'electron';
import log from 'electron-log/renderer';
import type { CommunicationDevice, DeviceInfo, DiscoveryProgress } from './dynamixel-controller';
import type { ConnectionSettings } from './settings-service';

// Types for IPC communication
type StatusUpdate = {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};

// Expose logging API to renderer process
contextBridge.exposeInMainWorld('electronLog', {
  info: (message: string) => log.info(message),
  warn: (message: string) => log.warn(message),
  error: (message: string) => log.error(message),
  debug: (message: string) => log.debug(message),
  verbose: (message: string) => log.verbose(message),
});

// Expose DYNAMIXEL API to renderer process
contextBridge.exposeInMainWorld('dynamixelAPI', {
  // New separated discovery methods
  discoverCommunicationDevices: () => ipcRenderer.invoke('dynamixel-discover-communication-devices'),
  discoverU2D2Devices: () => ipcRenderer.invoke('dynamixel-discover-u2d2-devices'),
  selectU2D2Device: (device: CommunicationDevice) => ipcRenderer.invoke('dynamixel-select-u2d2-device', device),
  connectToSelectedDevice: (settings?: Partial<ConnectionSettings>) => ipcRenderer.invoke('dynamixel-connect-to-selected-device', settings),
  
  // Legacy methods (kept for backward compatibility)
  discoverHardware: (settings?: Partial<ConnectionSettings>) => ipcRenderer.invoke('dynamixel-discover-hardware', settings),
  connect: (settings?: Partial<ConnectionSettings>) => ipcRenderer.invoke('dynamixel-connect', settings),
  disconnect: () => ipcRenderer.invoke('dynamixel-disconnect'),
  quickDiscovery: () => ipcRenderer.invoke('dynamixel-quick-discovery'),
  pingDevice: (id: number) => ipcRenderer.invoke('dynamixel-ping-device', id),
  testDevice: (id: number) => ipcRenderer.invoke('dynamixel-test-device', id),
  getDevices: () => ipcRenderer.invoke('dynamixel-get-devices'),
  getStatus: () => ipcRenderer.invoke('dynamixel-get-status'),
  
  // Motor control methods
  controlLED: (id: number, ledOn: boolean) => ipcRenderer.invoke('dynamixel-control-led', id, ledOn),
  pingMotor: (id: number) => ipcRenderer.invoke('dynamixel-ping-motor', id),
  readMotorStatus: (id: number) => ipcRenderer.invoke('dynamixel-read-motor-status', id),
  moveMotorToPosition: (id: number, position: number) => ipcRenderer.invoke('dynamixel-move-motor-to-position', id, position),
  emergencyStop: (id: number) => ipcRenderer.invoke('dynamixel-emergency-stop', id),
  enableTorqueForAllMotors: () => ipcRenderer.invoke('dynamixel-enable-torque-all'),
  
  // Event listeners
  onDeviceFound: (callback: (device: DeviceInfo) => void) => {
    ipcRenderer.on('device-found', (_event, device) => callback(device));
  },
  onDiscoveryProgress: (callback: (progress: DiscoveryProgress) => void) => {
    ipcRenderer.on('discovery-progress', (_event, progress) => callback(progress));
  },
  onStatusUpdate: (callback: (data: StatusUpdate) => void) => {
    ipcRenderer.on('status-update', (_event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('device-found');
    ipcRenderer.removeAllListeners('discovery-progress');
    ipcRenderer.removeAllListeners('status-update');
  },
});

// Expose Settings API to renderer process
contextBridge.exposeInMainWorld('settingsAPI', {
  get: (key: string) => ipcRenderer.invoke('settings-get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('settings-set', key, value),
  getAll: () => ipcRenderer.invoke('settings-get-all'),
  reset: () => ipcRenderer.invoke('settings-reset'),
  getConnection: () => ipcRenderer.invoke('settings-get-connection'),
  setConnection: (settings: Partial<ConnectionSettings>) => ipcRenderer.invoke('settings-set-connection', settings),
});

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
