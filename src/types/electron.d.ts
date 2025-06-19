import type { DeviceInfo, DiscoveryProgress, CommunicationDevice, CommunicationDevices } from '../dynamixel-controller';
import type { ConnectionSettings, AppSettings } from '../settings-service';

declare global {
  interface Window {
    electronLog: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
      debug: (message: string) => void;
      verbose: (message: string) => void;
    };
    dynamixelAPI: {
      // New separated discovery methods
      discoverCommunicationDevices: () => Promise<CommunicationDevices>;
      discoverU2D2Devices: () => Promise<CommunicationDevice[]>;
      selectU2D2Device: (device: CommunicationDevice) => Promise<void>;
      connectToSelectedDevice: (settings?: Partial<ConnectionSettings>) => Promise<boolean>;
      
      // Legacy methods
      discoverHardware: (settings?: Partial<ConnectionSettings>) => Promise<CommunicationDevices>;
      connect: (settings?: Partial<ConnectionSettings>) => Promise<boolean>;
      disconnect: () => Promise<boolean>;
      quickDiscovery: () => Promise<DeviceInfo[]>;
      pingDevice: (id: number) => Promise<DeviceInfo | null>;
      testDevice: (id: number) => Promise<boolean>;
      getDevices: () => Promise<DeviceInfo[]>;
      getStatus: () => Promise<boolean>;
      onDeviceFound: (callback: (device: DeviceInfo) => void) => void;
      onDiscoveryProgress: (callback: (progress: DiscoveryProgress) => void) => void;
      onStatusUpdate: (callback: (data: { message: string, type: 'info' | 'success' | 'error' | 'warning' }) => void) => void;
      removeAllListeners: () => void;
    };
    settingsAPI: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<boolean>;
      getAll: () => Promise<AppSettings>;
      reset: () => Promise<boolean>;
      getConnection: () => Promise<ConnectionSettings>;
      setConnection: (settings: Partial<ConnectionSettings>) => Promise<boolean>;
    };
  }
}

export {};