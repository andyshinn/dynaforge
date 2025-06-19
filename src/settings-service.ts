import settings from 'electron-settings';
import log from 'electron-log';

export interface ConnectionSettings {
  connectionType: 'auto' | 'usb' | 'serial' | 'webserial';
  baudRate: number;
  timeout: number;
  discoveryStartId: number;
  discoveryEndId: number;
}

export interface AppSettings {
  connection: ConnectionSettings;
}

const defaultSettings: AppSettings = {
  connection: {
    connectionType: 'auto',
    baudRate: 57600,
    timeout: 1000,
    discoveryStartId: 1,
    discoveryEndId: 20
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
}

// Export singleton instance
export const settingsService = new SettingsService();
