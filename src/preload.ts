import { contextBridge, ipcRenderer } from 'electron';
import log from 'electron-log/renderer';
import type { CommunicationDevice, DeviceInfo, DiscoveryProgress } from './services/dynamixel-controller';
import type { ConnectionSettings } from './services/settings-service';

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
  
  // Background operations
  startBackgroundDiscovery: (options?: { startId?: number; endId?: number }) => ipcRenderer.invoke('dynamixel-start-background-discovery', options),
  cancelBackgroundDiscovery: () => ipcRenderer.invoke('dynamixel-cancel-background-discovery'),
  
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
  
  // Background operation event listeners
  onBackgroundDiscoveryStarted: (callback: (data: { startId: number; endId: number }) => void) => {
    ipcRenderer.on('background-discovery-started', (_event, data) => callback(data));
  },
  onBackgroundDiscoveryProgress: (callback: (data: { currentId: number; progress: number; total: number; found: number }) => void) => {
    ipcRenderer.on('background-discovery-progress', (_event, data) => callback(data));
  },
  onBackgroundDeviceFound: (callback: (device: DeviceInfo) => void) => {
    ipcRenderer.on('background-device-found', (_event, device) => callback(device));
  },
  onBackgroundDiscoveryComplete: (callback: (data: { devices: DeviceInfo[]; total: number }) => void) => {
    ipcRenderer.on('background-discovery-complete', (_event, data) => callback(data));
  },
  onBackgroundDiscoveryError: (callback: (data: { error: string }) => void) => {
    ipcRenderer.on('background-discovery-error', (_event, data) => callback(data));
  },
  onBackgroundDiscoveryCancelled: (callback: () => void) => {
    ipcRenderer.on('background-discovery-cancelled', () => callback());
  },
  
  // Auto-connect event listeners
  onAutoConnectSuccess: (callback: (data: { device: CommunicationDevice; connectionSettings: ConnectionSettings }) => void) => {
    ipcRenderer.on('auto-connect-success', (_event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('device-found');
    ipcRenderer.removeAllListeners('discovery-progress');
    ipcRenderer.removeAllListeners('status-update');
    ipcRenderer.removeAllListeners('background-discovery-started');
    ipcRenderer.removeAllListeners('background-discovery-progress');
    ipcRenderer.removeAllListeners('background-device-found');
    ipcRenderer.removeAllListeners('background-discovery-complete');
    ipcRenderer.removeAllListeners('background-discovery-error');
    ipcRenderer.removeAllListeners('background-discovery-cancelled');
    ipcRenderer.removeAllListeners('auto-connect-success');
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
  getPublicIP: () => ipcRenderer.invoke('settings-get-public-ip'),
  setPublicIP: (publicIP: string | null) => ipcRenderer.invoke('settings-set-public-ip', publicIP),
});

// Remote Control API types
type RemoteControlLeaderConfig = {
  motorId: number;
  port: number;
};

type RemoteControlFollowerConfig = {
  motorId: number;
  leaderAddress: string;
};

type RemoteControlConnectionStatus = {
  connected: boolean;
  message: string;
  remoteAddress?: string;
  latency?: number;
};

type RemoteControlTelemetry = {
  position: number;
  velocity: number;
  current: number;
  temperature: number;
};

// Expose Remote Control API to renderer process
contextBridge.exposeInMainWorld('remoteControlAPI', {
  // Discovery and connection
  discoverPublicAddress: () => ipcRenderer.invoke('remote-control-discover-public-address'),
  startLeader: (config: RemoteControlLeaderConfig) => ipcRenderer.invoke('remote-control-start-leader', config),
  connectToLeader: (config: RemoteControlFollowerConfig) => ipcRenderer.invoke('remote-control-connect-to-leader', config),
  disconnect: () => ipcRenderer.invoke('remote-control-disconnect'),
  
  // Status and telemetry
  getConnectionStatus: () => ipcRenderer.invoke('remote-control-get-status'),
  sendTelemetry: (telemetry: RemoteControlTelemetry) => ipcRenderer.invoke('remote-control-send-telemetry', telemetry),
  
  // Event listeners
  onConnectionUpdate: (callback: (status: RemoteControlConnectionStatus) => void) => {
    ipcRenderer.on('remote-control-connection-update', (_event, status) => callback(status));
  },
  onTelemetryData: (callback: (data: RemoteControlTelemetry) => void) => {
    ipcRenderer.on('remote-control-telemetry-data', (_event, data) => callback(data));
  },
  
  // Remove listeners
  removeRemoteControlListeners: () => {
    ipcRenderer.removeAllListeners('remote-control-connection-update');
    ipcRenderer.removeAllListeners('remote-control-telemetry-data');
  },
});

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
