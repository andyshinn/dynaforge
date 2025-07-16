import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import log from 'electron-log';
import { DynamixelService } from './services/dynamixel-controller';
import { ConnectionSettings, settingsService } from './services/settings-service';
import { RemoteControlService, defaultRemoteControlSettings } from './services/remote-control-service';

// Initialize and configure electron-log
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Initialize services
let dynamixelService: DynamixelService;
let remoteControlService: RemoteControlService;
let mainWindow: BrowserWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  log.info('Creating main window');

  // Load window settings
  const windowSettings = await settingsService.getWindowSettings();
  
  // Create the browser window with saved settings
  mainWindow = new BrowserWindow({
    x: windowSettings.x,
    y: windowSettings.y,
    width: windowSettings.width,
    height: windowSettings.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  // Restore maximized state
  if (windowSettings.maximized) {
    mainWindow.maximize();
  }

  // Save window state changes
  const saveWindowState = async () => {
    try {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      
      await settingsService.setWindowSettings({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized: isMaximized
      });
    } catch (error) {
      log.error('Failed to save window state:', error);
    }
  };

  // Save window state on various events
  mainWindow.on('moved', saveWindowState);
  mainWindow.on('resized', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  // Set up renderer ready event handler for auto-connect
  mainWindow.once('ready-to-show', async () => {
    log.info('Renderer is ready, attempting auto-connect...');
    await attemptAutoConnect();
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

  // Initialize services after window is created
  await initializeDynamixelService();
  await initializeRemoteControlService();
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

// Background motor discovery that doesn't block the UI
ipcMain.handle('dynamixel-start-background-discovery', async (_event, options = {}) => {
  try {
    if (!dynamixelService) {
      log.error('DYNAMIXEL service not initialized');
      throw new Error('DYNAMIXEL service not initialized');
    }
    
    const { startId = 1, endId = 20 } = options;
    
    // Signal discovery start
    mainWindow.webContents.send('background-discovery-started', { startId, endId });
    
    // Run discovery in background with progress updates
    const devices = [];
    for (let id = startId; id <= endId; id++) {
      try {
        // Send progress update
        const progress = Math.round(((id - startId + 1) / (endId - startId + 1)) * 100);
        mainWindow.webContents.send('background-discovery-progress', { 
          currentId: id, 
          progress,
          total: endId - startId + 1,
          found: devices.length 
        });
        
        // Try to ping the device (fast method)
        const device = await dynamixelService.pingDevice(id);
        if (device) {
          devices.push(device);
          // Send device found update immediately
          mainWindow.webContents.send('background-device-found', device);
        }
        
        // Small delay to prevent overwhelming the bus
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch {
        // Device not found at this ID, continue
        log.debug(`No device found at ID ${id}`);
      }
    }
    
    // Signal discovery complete
    mainWindow.webContents.send('background-discovery-complete', { 
      devices, 
      total: devices.length 
    });
    
    return devices;
  } catch (error) {
    log.error('Background discovery failed:', error);
    mainWindow.webContents.send('background-discovery-error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
});

// Cancel background discovery
ipcMain.handle('dynamixel-cancel-background-discovery', async () => {
  try {
    // For now, we'll just signal cancellation
    // In a more advanced implementation, we could use AbortController
    mainWindow.webContents.send('background-discovery-cancelled');
    return true;
  } catch (error) {
    log.error('Failed to cancel background discovery:', error);
    return false;
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

ipcMain.handle('settings-get-public-ip', async () => {
  try {
    return await settingsService.getPublicIP();
  } catch (error) {
    log.error('Failed to get public IP:', error);
    throw error;
  }
});

ipcMain.handle('settings-set-public-ip', async (_event, publicIP: string | null) => {
  try {
    await settingsService.setPublicIP(publicIP);
    return true;
  } catch (error) {
    log.error('Failed to set public IP:', error);
    throw error;
  }
});

// Remote Control Service Initialization
const initializeRemoteControlService = async () => {
  try {
    log.info('Initializing Remote Control service...');
    
    // Get settings from store or use defaults
    let remoteControlSettings = defaultRemoteControlSettings;
    try {
      const savedSettings = await settingsService.getDynamic('remoteControl');
      if (savedSettings && typeof savedSettings === 'object') {
        remoteControlSettings = { ...defaultRemoteControlSettings, ...savedSettings as Partial<typeof defaultRemoteControlSettings> };
      }
    } catch (error) {
      log.warn('Failed to load remote control settings, using defaults:', error);
    }
    
    remoteControlService = new RemoteControlService(remoteControlSettings);
    
    // Set up event listeners
    remoteControlService.on('connectionUpdate', (status) => {
      mainWindow.webContents.send('remote-control-connection-update', status);
    });
    
    remoteControlService.on('telemetryData', (data) => {
      mainWindow.webContents.send('remote-control-telemetry-data', data);
    });
    
    remoteControlService.on('motorCommand', async (command) => {
      // Execute motor commands received from remote
      try {
        if (dynamixelService && command.motorId) {
          if (command.command.position !== undefined) {
            await dynamixelService.moveMotorToPosition(command.motorId, command.command.position);
          }
          if (command.command.torqueEnable !== undefined) {
            // Handle torque enable/disable commands
            log.info(`Motor ${command.motorId} torque ${command.command.torqueEnable ? 'enabled' : 'disabled'}`);
          }
        }
      } catch (error) {
        log.error('Failed to execute remote motor command:', error);
      }
    });
    
    log.info('Remote Control service initialized successfully');
  } catch (error) {
    log.error('Failed to initialize Remote Control service:', error);
  }
};

// Remote Control IPC Handlers
ipcMain.handle('remote-control-discover-public-address', async () => {
  try {
    if (!remoteControlService) {
      log.error('Remote Control service not initialized');
      throw new Error('Remote Control service not initialized');
    }
    return await remoteControlService.discoverPublicIP();
  } catch (error) {
    log.error('Failed to discover public address:', error);
    throw error;
  }
});

ipcMain.handle('remote-control-start-leader', async (_event, config) => {
  try {
    if (!remoteControlService) {
      log.error('Remote Control service not initialized');
      throw new Error('Remote Control service not initialized');
    }
    
    await remoteControlService.startLeader(config.motorId, config.port);
    
    // Start telemetry broadcasting for leader mode
    startTelemetryBroadcast(config.motorId);
    
    return true;
  } catch (error) {
    log.error('Failed to start leader mode:', error);
    throw error;
  }
});

ipcMain.handle('remote-control-connect-to-leader', async (_event, config) => {
  try {
    if (!remoteControlService) {
      log.error('Remote Control service not initialized');
      throw new Error('Remote Control service not initialized');
    }
    
    await remoteControlService.connectToLeader(config.motorId, config.leaderAddress);
    return true;
  } catch (error) {
    log.error('Failed to connect to leader:', error);
    throw error;
  }
});

ipcMain.handle('remote-control-disconnect', async () => {
  try {
    if (!remoteControlService) {
      log.error('Remote Control service not initialized');
      return false;
    }
    
    stopTelemetryBroadcast();
    remoteControlService.disconnect();
    return true;
  } catch (error) {
    log.error('Failed to disconnect remote control:', error);
    return false;
  }
});

ipcMain.handle('remote-control-get-status', async () => {
  try {
    if (!remoteControlService) {
      return { connected: false, message: 'Service not initialized' };
    }
    
    return {
      connected: remoteControlService.isConnected(),
      message: remoteControlService.isConnected() ? 'Connected' : 'Disconnected',
      publicAddress: remoteControlService.getPublicAddress()
    };
  } catch (error) {
    log.error('Failed to get remote control status:', error);
    return { connected: false, message: 'Error getting status' };
  }
});

ipcMain.handle('remote-control-send-telemetry', async (_event, telemetry) => {
  try {
    if (!remoteControlService) {
      log.error('Remote Control service not initialized');
      return false;
    }
    
    await remoteControlService.sendTelemetry(telemetry);
    return true;
  } catch (error) {
    log.error('Failed to send telemetry:', error);
    return false;
  }
});

// Telemetry broadcasting for leader mode
let telemetryBroadcastInterval: NodeJS.Timeout | null = null;

const startTelemetryBroadcast = (motorId: number) => {
  if (telemetryBroadcastInterval) {
    clearInterval(telemetryBroadcastInterval);
  }
  
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;
  
  telemetryBroadcastInterval = setInterval(async () => {
    try {
      if (dynamixelService && remoteControlService && remoteControlService.isConnected()) {
        const status = await dynamixelService.readMotorStatus(motorId);
        const telemetry = {
          position: Math.round(status.position * 180 / 2048 * 10) / 10,
          velocity: 0, // Add velocity property once available in status
          current: 0, // Add current property once available in status
          temperature: status.temperature || 0,
          timestamp: Date.now()
        };
        
        await remoteControlService.sendTelemetry(telemetry);
        // Reset error counter on successful broadcast
        consecutiveErrors = 0;
      }
    } catch (error) {
      consecutiveErrors++;
      
      // Log errors occasionally, not every time
      if (consecutiveErrors <= maxConsecutiveErrors) {
        if (error instanceof Error && error.message.includes('Timeout')) {
          log.warn(`Telemetry timeout for motor ${motorId} (${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);
        } else {
          log.debug(`Telemetry broadcast error for motor ${motorId} (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
        }
      }
      
      // If too many consecutive errors, stop broadcasting
      if (consecutiveErrors >= maxConsecutiveErrors) {
        log.error(`Too many consecutive telemetry errors for motor ${motorId}, stopping broadcast`);
        stopTelemetryBroadcast();
      }
    }
  }, 1000); // Reduced to 1Hz to match frontend and reduce motor communication load
};

const stopTelemetryBroadcast = () => {
  if (telemetryBroadcastInterval) {
    clearInterval(telemetryBroadcastInterval);
    telemetryBroadcastInterval = null;
  }
};

// Auto-connect functionality
const attemptAutoConnect = async () => {
  try {
    log.info('Checking auto-connect settings...');
    
    // Check if auto-connect is enabled
    const autoConnect = await settingsService.getAutoConnect();
    if (!autoConnect) {
      log.info('Auto-connect is disabled');
      return;
    }
    
    // Get last connected device
    const lastDevice = await settingsService.getLastConnectedDevice();
    if (!lastDevice) {
      log.info('No last connected device found for auto-connect');
      return;
    }
    
    log.info('Attempting auto-connect to:', lastDevice.displayName);
    
    // Attempt to connect to the device
    if (dynamixelService) {
      try {
        // Convert the serializable device back to a CommunicationDevice format
        const deviceForConnection = {
          type: lastDevice.type,
          path: lastDevice.path,
          displayName: lastDevice.displayName,
          isU2D2: lastDevice.isU2D2
        } as import('./services/dynamixel-controller').CommunicationDevice;
        
        dynamixelService.selectU2D2Device(deviceForConnection);
        const connected = await dynamixelService.connectToSelectedDevice();
        
        if (connected) {
          log.info('Auto-connect successful');
          
          // Get connection settings
          const connectionSettings = await settingsService.getConnectionSettings();
          
          // Notify renderer process of successful auto-connect
          log.info('Sending auto-connect-success event to renderer:', deviceForConnection.displayName);
          mainWindow.webContents.send('auto-connect-success', {
            device: deviceForConnection,
            connectionSettings: connectionSettings
          });
          
          // Start background discovery after successful connection
          setTimeout(async () => {
            try {
              log.info('Starting background motor discovery after auto-connect...');
              mainWindow.webContents.send('background-discovery-started', { startId: 1, endId: 20 });
              
              const devices = [];
              for (let id = 1; id <= 20; id++) {
                try {
                  const progress = Math.round(((id - 1 + 1) / 20) * 100);
                  mainWindow.webContents.send('background-discovery-progress', { 
                    currentId: id, 
                    progress,
                    total: 20,
                    found: devices.length 
                  });
                  
                  const device = await dynamixelService.pingDevice(id);
                  if (device) {
                    devices.push(device);
                    mainWindow.webContents.send('background-device-found', device);
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 50));
                } catch {
                  // Device not found at this ID, continue
                  log.debug(`No device found at ID ${id} during auto-discovery`);
                }
              }
              
              mainWindow.webContents.send('background-discovery-complete', { 
                devices, 
                total: devices.length 
              });
              
              log.info(`Auto-discovery complete: found ${devices.length} devices`);
            } catch (error) {
              log.error('Auto-discovery failed:', error);
              mainWindow.webContents.send('background-discovery-error', { 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }, 2000); // Wait 2 seconds after connection before starting discovery
        } else {
          log.warn('Auto-connect failed: could not connect to device');
        }
      } catch (error) {
        log.error('Auto-connect failed:', error);
      }
    }
  } catch (error) {
    log.error('Auto-connect check failed:', error);
  }
};

// Clean up on app quit
app.on('before-quit', () => {
  stopTelemetryBroadcast();
  if (remoteControlService) {
    remoteControlService.disconnect();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
