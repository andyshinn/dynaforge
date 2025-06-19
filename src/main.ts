import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import log from 'electron-log';
import { DynamixelService } from './dynamixel-controller';
import { ConnectionSettings, settingsService } from './settings-service';

// Initialize and configure electron-log
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Initialize DYNAMIXEL service
let dynamixelService: DynamixelService;
let mainWindow: BrowserWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  log.info('Creating main window');

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    log.debug('Loaded dev server URL');
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    log.debug('Loaded production HTML file');
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Initialize DYNAMIXEL service after window is created
  await initializeDynamixelService();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  log.info('App ready, creating window');
  await createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

// DYNAMIXEL Service Initialization
const initializeDynamixelService = async () => {
  try {
    log.info('Initializing DYNAMIXEL service with ESM support...');
    dynamixelService = new DynamixelService();

    // Set up callbacks to send messages to renderer
    dynamixelService.setCallbacks({
      onDeviceFound: (device) => {
        mainWindow.webContents.send('device-found', device);
      },
      onProgress: (progress) => {
        mainWindow.webContents.send('discovery-progress', progress);
      },
      onStatusUpdate: (message: string, type: string) => {
        mainWindow.webContents.send('status-update', { message, type });
      }
    });

    log.info('DYNAMIXEL service initialized successfully');
  } catch (error) {
    log.error('Failed to initialize DYNAMIXEL service:', error);
  }
};

// IPC Handlers
// New separated discovery handlers
ipcMain.handle('dynamixel-discover-communication-devices', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return { usb: [], serial: [], webserial: false };
    }
    return await dynamixelService.discoverCommunicationDevices();
  } catch (error) {
    log.error('Failed to discover communication devices:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-discover-u2d2-devices', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return [];
    }
    return await dynamixelService.discoverU2D2Devices();
  } catch (error) {
    log.error('Failed to discover U2D2 devices:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-select-u2d2-device', async (_event, device) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return false;
    }
    
    // Log the device being selected for debugging
    log.info('Selecting U2D2 device:', { 
      type: device.type, 
      path: device.path, 
      displayName: device.displayName,
      isU2D2: device.isU2D2
    });
    
    dynamixelService.selectU2D2Device(device);
    return true;
  } catch (error) {
    log.error('Failed to select U2D2 device:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-connect-to-selected-device', async (_event, settings) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return false;
    }
    return await dynamixelService.connectToSelectedDevice(settings);
  } catch (error) {
    log.error('Failed to connect to selected device:', error);
    return false;
  }
});

// Legacy handlers (kept for backward compatibility)
ipcMain.handle('dynamixel-discover-hardware', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return [];
    }
    // For legacy support, fall back to the old method if available
    return await dynamixelService.discoverCommunicationDevices();
  } catch (error) {
    log.error('Failed to discover hardware:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-connect', async (_, settings) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return false;
    }
    return await dynamixelService.connect(settings);
  } catch (error) {
    log.error('Failed to connect:', error);
    return false;
  }
});

ipcMain.handle('dynamixel-disconnect', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return false;
    }
    await dynamixelService.disconnect();
    return true;
  } catch (error) {
    log.error('Failed to disconnect:', error);
    return false;
  }
});

ipcMain.handle('dynamixel-quick-discovery', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    return await dynamixelService.quickDiscovery();
  } catch (error) {
    log.error('Quick discovery failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-ping-device', async (_, id: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    return await dynamixelService.pingDevice(id);
  } catch (error) {
    log.error('Ping device failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-test-device', async (_, id: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.testDevice(id);
    return true;
  } catch (error) {
    log.error('Test device failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-get-devices', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return [];
    }
    return dynamixelService.getAllDevices();
  } catch (error) {
    log.error('Get devices failed:', error);
    return [];
  }
});

ipcMain.handle('dynamixel-get-status', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      return false;
    }
    return dynamixelService.getConnectionStatus();
  } catch (error) {
    log.error('Get status failed:', error);
    return false;
  }
});

// Motor control IPC handlers
ipcMain.handle('dynamixel-control-led', async (_event, id: number, ledOn: boolean) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.controlLED(id, ledOn);
    return true;
  } catch (error) {
    log.error('LED control failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-ping-motor', async (_event, id: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.pingMotor(id);
    return true;
  } catch (error) {
    log.error('Motor ping failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-read-motor-status', async (_event, id: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    return await dynamixelService.readMotorStatus(id);
  } catch (error) {
    log.error('Motor status read failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-move-motor-to-position', async (_event, id: number, position: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.moveMotorToPosition(id, position);
    return true;
  } catch (error) {
    log.error('Motor move failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-emergency-stop', async (_event, id: number) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.emergencyStop(id);
    return true;
  } catch (error) {
    log.error('Emergency stop failed:', error);
    throw error;
  }
});

ipcMain.handle('dynamixel-enable-torque-all', async () => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    await dynamixelService.enableTorqueForAllMotors();
    return true;
  } catch (error) {
    log.error('Enable torque for all motors failed:', error);
    throw error;
  }
});

// Settings IPC Handlers
ipcMain.handle('settings-get', async (_event, key: string) => {
  try {
    return await settingsService.getDynamic(key);
  } catch (error) {
    log.error('Failed to get setting:', error);
    throw error;
  }
});

ipcMain.handle('settings-set', async (_event, key: string, value: unknown) => {
  try {
    await settingsService.setDynamic(key, value);
    return true;
  } catch (error) {
    log.error('Failed to set setting:', error);
    throw error;
  }
});

ipcMain.handle('settings-get-all', async () => {
  try {
    return await settingsService.getAll();
  } catch (error) {
    log.error('Failed to get all settings:', error);
    throw error;
  }
});

ipcMain.handle('settings-reset', async () => {
  try {
    await settingsService.reset();
    return true;
  } catch (error) {
    log.error('Failed to reset settings:', error);
    throw error;
  }
});

ipcMain.handle('settings-get-connection', async () => {
  try {
    return await settingsService.getConnectionSettings();
  } catch (error) {
    log.error('Failed to get connection settings:', error);
    throw error;
  }
});

ipcMain.handle('settings-set-connection', async (_event, settings: Partial<ConnectionSettings>) => {
  try {
    await settingsService.setConnectionSettings(settings);
    return true;
  } catch (error) {
    log.error('Failed to set connection settings:', error);
    throw error;
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
