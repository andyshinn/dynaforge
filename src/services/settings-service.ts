import settings from 'electron-settings';
import log from 'electron-log';

export interface ConnectionSettings {
  connectionType: 'auto' | 'usb' | 'serial' | 'webserial';
  baudRate: number;
  timeout: number;
  discoveryStartId: number;
  discoveryEndId: number;
}

export interface WindowSettings {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

export interface SerializableDevice {
  type: 'usb' | 'serial';
  path: string;
  displayName: string;
  isU2D2: boolean;
}

export interface AppSettings {
  connection: ConnectionSettings;
  lastConnectedDevice: SerializableDevice | null;
  autoConnect: boolean;
  window: WindowSettings;
}

const defaultSettings: AppSettings = {
  connection: {
    connectionType: 'auto',
    baudRate: 57600,
    timeout: 1000,
    discoveryStartId: 1,
    discoveryEndId: 20
  },
  lastConnectedDevice: null,
  autoConnect: false,
  window: {
    width: 1200,
    height: 800,
    maximized: false
  }
};

export class SettingsService {
  constructor() {
    this.initializeSettings();
  }

  private async initializeSettings() {
    try {
      // Set the settings file location
      settings.configure({
        fileName: 'dynamixel-forge-settings.json',
        prettify: true
      });

      // Initialize default settings if they don't exist
      const hasSettings = await settings.has('connection');
      if (!hasSettings) {
        log.info('Initializing default settings');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await settings.set('connection', defaultSettings.connection as any);
      }
    } catch (error) {
      log.error('Failed to initialize settings:', error);
    }
  }

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    try {
      const value = await settings.get(key);
      log.debug(`Retrieved setting ${key}:`, value);
      return value as unknown as AppSettings[K];
    } catch (error) {
      log.error(`Failed to get setting ${key}:`, error);
      // Return default if retrieval fails
      return defaultSettings[key];
    }
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await settings.set(key, value as any);
      log.info(`Setting ${key} updated:`, value);
    } catch (error) {
      log.error(`Failed to set setting ${key}:`, error);
      throw error;
    }
  }

  // Generic get/set for dynamic keys (for IPC handlers)
  async getDynamic(key: string): Promise<unknown> {
    try {
      const value = await settings.get(key);
      log.debug(`Retrieved setting ${key}:`, value);
      return value;
    } catch (error) {
      log.error(`Failed to get setting ${key}:`, error);
      return undefined;
    }
  }

  async setDynamic(key: string, value: unknown): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await settings.set(key, value as any);
      log.info(`Setting ${key} updated:`, value);
    } catch (error) {
      log.error(`Failed to set setting ${key}:`, error);
      throw error;
    }
  }

  async getAll(): Promise<AppSettings> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSettings = await settings.get() as any;
      return { ...defaultSettings, ...allSettings };
    } catch (error) {
      log.error('Failed to get all settings:', error);
      return defaultSettings;
    }
  }

  async reset(): Promise<void> {
    try {
      // Clear and reset settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settingsWithClear = settings as any;
      if (settingsWithClear.clear) {
        await settingsWithClear.clear();
      }
      // Set all default settings individually
      for (const [key, value] of Object.entries(defaultSettings)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await settings.set(key, value as any);
      }
      log.info('Settings reset to defaults');
    } catch (error) {
      log.error('Failed to reset settings:', error);
      throw error;
    }
  }

  async getConnectionSettings(): Promise<ConnectionSettings> {
    try {
      const connectionSettings = await this.get('connection') as ConnectionSettings;
      return { ...defaultSettings.connection, ...connectionSettings };
    } catch (error) {
      log.error('Failed to get connection settings:', error);
      return defaultSettings.connection;
    }
  }

  async setConnectionSettings(settings: Partial<ConnectionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getConnectionSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await this.set('connection', updatedSettings);
    } catch (error) {
      log.error('Failed to set connection settings:', error);
      throw error;
    }
  }

  getSettingsPath(): string {
    return settings.file();
  }

  // Helper methods for new settings
  async getLastConnectedDevice(): Promise<SerializableDevice | null> {
    try {
      const device = await this.getDynamic('lastConnectedDevice') as SerializableDevice | null;
      return device;
    } catch (error) {
      log.error('Failed to get last connected device:', error);
      return null;
    }
  }

  async setLastConnectedDevice(device: SerializableDevice | null): Promise<void> {
    try {
      await this.setDynamic('lastConnectedDevice', device);
    } catch (error) {
      log.error('Failed to set last connected device:', error);
      throw error;
    }
  }

  async getAutoConnect(): Promise<boolean> {
    try {
      const autoConnect = await this.getDynamic('autoConnect') as boolean;
      return autoConnect ?? defaultSettings.autoConnect;
    } catch (error) {
      log.error('Failed to get auto-connect setting:', error);
      return defaultSettings.autoConnect;
    }
  }

  async setAutoConnect(autoConnect: boolean): Promise<void> {
    try {
      await this.setDynamic('autoConnect', autoConnect);
    } catch (error) {
      log.error('Failed to set auto-connect setting:', error);
      throw error;
    }
  }

  async getWindowSettings(): Promise<WindowSettings> {
    try {
      const windowSettings = await this.getDynamic('window') as WindowSettings;
      return { ...defaultSettings.window, ...windowSettings };
    } catch (error) {
      log.error('Failed to get window settings:', error);
      return defaultSettings.window;
    }
  }

  async setWindowSettings(windowSettings: Partial<WindowSettings>): Promise<void> {
    try {
      const currentSettings = await this.getWindowSettings();
      const updatedSettings = { ...currentSettings, ...windowSettings };
      await this.setDynamic('window', updatedSettings);
    } catch (error) {
      log.error('Failed to set window settings:', error);
      throw error;
    }
  }

  async getPublicIP(): Promise<string | null> {
    try {
      const publicIP = await this.getDynamic('publicIP') as string | null;
      return publicIP;
    } catch (error) {
      log.error('Failed to get public IP:', error);
      return null;
    }
  }

  async setPublicIP(publicIP: string | null): Promise<void> {
    try {
      await this.setDynamic('publicIP', publicIP);
    } catch (error) {
      log.error('Failed to set public IP:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
