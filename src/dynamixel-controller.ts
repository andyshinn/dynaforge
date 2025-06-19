import { DynamixelController } from 'dynamixel';
import log from 'electron-log';

export interface DeviceInfo {
  id: number;
  modelNumber: number;
  modelName: string;
  firmwareVersion: number;
}

// Interfaces for device discovery
export interface USBDevice {
  vendorId?: number;
  productId?: number;
  name?: string;
  path?: string;
  manufacturer?: string;
}

export interface SerialDevice {
  path: string;
  name?: string;
  manufacturer?: string;
  description?: string;
}

// Raw device objects from DYNAMIXEL API
interface RawUSBDevice {
  vendorId: number;
  productId: number;
  busNumber: number;
  deviceAddress: number;
  isU2D2: boolean;
}

interface RawSerialDevice {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
  serialNumber?: string;
  isU2D2: boolean;
  description?: string;
}

export interface CommunicationDevice {
  // Common properties
  type: 'usb' | 'serial';
  displayName: string;
  name?: string;
  path: string;
  manufacturer?: string;
  isU2D2?: boolean;

  // USB-specific properties (optional for serial devices)
  vendorId?: number;
  productId?: number;

  // Serial-specific properties (optional for USB devices)
  description?: string;
}

export interface CommunicationDevices {
  usb: CommunicationDevice[];
  serial: CommunicationDevice[];
  all: CommunicationDevice[];
  webserial: boolean;
}

interface SystemInfo {
  platform?: string;
  [key: string]: unknown;
}

// Internal interfaces for dynamixel package responses
interface DynamixelPingResponse {
  id: number;
  modelNumber: number;
  firmwareVersion: number;
}

interface DynamixelDeviceInfo {
  id: number;
  modelNumber: number;
  modelName: string;
  firmwareVersion: number;
}

interface ConnectionSettings {
  connectionType?: 'auto' | 'usb' | 'serial' | 'webserial';
  timeout?: number;
  baudRate?: number;
}

export interface DiscoveryProgress {
  current: number;
  total: number;
  id: number;
}

type StatusType = 'info' | 'success' | 'error' | 'warning';

export class DynamixelService {
  private controller: DynamixelController | null = null;
  private isConnected = false;
  private selectedDevice: CommunicationDevice | null = null;
  private onDeviceFound?: (device: DeviceInfo) => void;
  private onProgress?: (progress: DiscoveryProgress) => void;
  private onStatusUpdate?: (message: string, type: StatusType) => void;

  constructor() {
    // Controller will be created when we have settings
  }

  private createController(settings: ConnectionSettings): void {
    if (this.controller) {
      return; // Already created
    }

    this.controller = new DynamixelController({
      connectionType: settings.connectionType || 'auto',
      timeout: settings.timeout || 1000,
      baudRate: settings.baudRate || 57600,
      debug: false
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.controller) return;

    this.controller.on('connected', () => {
      this.isConnected = true;
      log.info('Connected to U2D2 device');
      this.onStatusUpdate?.('✅ Connected to U2D2 device', 'success');
    });

    this.controller.on('disconnected', () => {
      this.isConnected = false;
      log.info('Disconnected from U2D2 device');
      this.onStatusUpdate?.('❌ Disconnected from U2D2 device', 'warning');
    });

    this.controller.on('error', (error: Error) => {
      log.error('DYNAMIXEL Error:', error.message);
      this.onStatusUpdate?.(`❌ Error: ${error.message}`, 'error');
    });

    this.controller.on('deviceFound', (deviceInfo: DynamixelPingResponse) => {
      const modelName = DynamixelController.getModelName(deviceInfo.modelNumber);
      const device: DeviceInfo = {
        id: deviceInfo.id,
        modelNumber: deviceInfo.modelNumber,
        modelName,
        firmwareVersion: deviceInfo.firmwareVersion
      };

      log.info(`Found device: ID ${device.id}, Model: ${device.modelName} (${device.modelNumber}), FW: ${device.firmwareVersion}`);
      this.onDeviceFound?.(device);
      this.onStatusUpdate?.(`🔍 Found device: ID ${device.id}, Model: ${device.modelName} (${device.modelNumber}), FW: ${device.firmwareVersion}`, 'success');
    });

    this.controller.on('discoveryComplete', (devices: DynamixelPingResponse[]) => {
      log.info(`Discovery complete! Found ${devices.length} device(s)`);
      this.onStatusUpdate?.(`✅ Discovery complete! Found ${devices.length} device(s)`, 'success');
    });
  }

  public setCallbacks(callbacks: {
    onDeviceFound?: (device: DeviceInfo) => void;
    onProgress?: (progress: DiscoveryProgress) => void;
    onStatusUpdate?: (message: string, type: StatusType) => void;
  }): void {
    this.onDeviceFound = callbacks.onDeviceFound;
    this.onProgress = callbacks.onProgress;
    this.onStatusUpdate = callbacks.onStatusUpdate;
  }

  public async discoverCommunicationDevices(): Promise<CommunicationDevices> {
    try {
      this.onStatusUpdate?.('🔍 Discovering communication devices...', 'info');

      const usbDevices = DynamixelController.listUSBDevices();
      const serialPorts = await DynamixelController.listSerialPorts();
      const systemInfo = DynamixelController.getSystemInfo() as SystemInfo;

      // Process USB devices - create clean, serializable objects
      const usbDevicesWithType: CommunicationDevice[] = usbDevices.map((device: RawUSBDevice, index: number) => {
        const displayName = `USB: VID:${device.vendorId?.toString(16)} PID:${device.productId?.toString(16)}${device.isU2D2 ? ' (U2D2)' : ''}`;
        const deviceName = device.isU2D2 ? 'U2D2 Device' : `USB Device ${index + 1}`;
        const devicePath = `/dev/usb${device.busNumber}-${device.deviceAddress}`;

        return {
          type: 'usb' as const,
          displayName,
          name: deviceName,
          path: devicePath,
          vendorId: device.vendorId,
          productId: device.productId,
          isU2D2: device.isU2D2 || false
        };
      });

      // Process Serial devices - create clean, serializable objects
      const serialDevicesWithType: CommunicationDevice[] = serialPorts.map((device: RawSerialDevice) => {
        const displayName = `Serial: ${device.path}${device.manufacturer ? ` (${device.manufacturer})` : ''}${device.isU2D2 ? ' (U2D2)' : ''}`;
        const deviceName = device.manufacturer || 'Serial Device';

        return {
          type: 'serial' as const,
          path: device.path,
          displayName,
          name: deviceName,
          manufacturer: device.manufacturer || undefined,
          description: device.description || undefined,
          vendorId: device.vendorId ? parseInt(device.vendorId, 16) : undefined,
          productId: device.productId ? parseInt(device.productId, 16) : undefined,
          isU2D2: device.isU2D2 || false
        };
      });

      const devices: CommunicationDevices = {
        usb: usbDevicesWithType,
        serial: serialDevicesWithType,
        all: [...usbDevicesWithType, ...serialDevicesWithType],
        webserial: systemInfo.platform === 'browser'
      };

      log.info(`Found ${devices.usb.length} USB devices, ${devices.serial.length} serial devices`);

      this.onStatusUpdate?.(`📊 Discovery Results:`, 'info');
      this.onStatusUpdate?.(`   USB Devices: ${devices.usb.length}`, 'info');
      this.onStatusUpdate?.(`   Serial Devices: ${devices.serial.length}`, 'info');
      this.onStatusUpdate?.(`   Total Devices: ${devices.all.length}`, 'info');
      this.onStatusUpdate?.(`   Web Serial Support: ${devices.webserial}`, 'info');

      return devices;
    } catch (error) {
      const errorMsg = `Communication device discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async discoverU2D2Devices(): Promise<CommunicationDevice[]> {
    try {
      this.onStatusUpdate?.('🎯 Finding U2D2-compatible devices...', 'info');

      // Get all communication devices and filter for U2D2
      const allDevices = await this.discoverCommunicationDevices();
      const u2d2Devices = allDevices.all.filter(device => device.isU2D2);

      log.info(`Found ${u2d2Devices.length} U2D2-compatible devices`);

      if (u2d2Devices.length === 0) {
        this.onStatusUpdate?.('❌ No U2D2-compatible devices found!', 'warning');
        this.onStatusUpdate?.('💡 Make sure:', 'warning');
        this.onStatusUpdate?.('   - U2D2 device is connected via USB or Serial', 'warning');
        this.onStatusUpdate?.('   - Drivers are installed', 'warning');
        this.onStatusUpdate?.('   - Device is not being used by other software', 'warning');
        return [];
      }

      this.onStatusUpdate?.(`✅ Found ${u2d2Devices.length} U2D2-compatible device(s):`, 'success');
      u2d2Devices.forEach((device, index) => {
        this.onStatusUpdate?.(`   ${index + 1}. ${device.displayName}`, 'info');
        if (device.path) {
          this.onStatusUpdate?.(`      Path: ${device.path}`, 'info');
        }
        if (device.manufacturer) {
          this.onStatusUpdate?.(`      Manufacturer: ${device.manufacturer}`, 'info');
        }
      });

      return u2d2Devices;
    } catch (error) {
      const errorMsg = `U2D2 device discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public selectU2D2Device(device: CommunicationDevice): void {
    this.selectedDevice = device;
    this.onStatusUpdate?.(`🎯 Selected device: ${device.displayName || device.name}`, 'info');
    log.info(`Selected U2D2 device: ${device.displayName || device.name}`);
  }

  public async connectToSelectedDevice(settings?: ConnectionSettings): Promise<boolean> {
    try {
      if (!this.selectedDevice) {
        throw new Error('No U2D2 device selected. Please call selectU2D2Device first.');
      }

      // Create controller with deferred connection if not already created
      if (!this.controller) {
        this.controller = new DynamixelController({
          deferConnection: true,
          connectionType: settings?.connectionType || 'auto',
          timeout: settings?.timeout || 1000,
          baudRate: settings?.baudRate || 57600,
          debug: false
        });
        this.setupEventListeners();
      }

      this.onStatusUpdate?.(`🔗 Connecting to selected device: ${this.selectedDevice.displayName || this.selectedDevice.name}...`, 'info');

      const connected = await this.controller.connectToDevice(this.selectedDevice);
      if (!connected) {
        const errorMsg = 'Failed to connect to selected U2D2 device.';
        log.error(errorMsg);
        this.onStatusUpdate?.(errorMsg, 'error');
        this.onStatusUpdate?.('Please check connections and drivers.', 'error');
        return false;
      }

      return true;
    } catch (error) {
      const errorMsg = `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      return false;
    }
  }

  public async connect(settings?: ConnectionSettings): Promise<boolean> {
    try {
      if (settings) {
        this.createController(settings);
      }

      if (!this.controller) {
        throw new Error('Controller not initialized. Please provide settings.');
      }

      this.onStatusUpdate?.('🔌 Attempting to connect to U2D2...', 'info');

      const connected = await this.controller.connect();
      if (!connected) {
        const errorMsg = 'Failed to connect to U2D2. Please check connections and drivers.';
        log.error(errorMsg);
        this.onStatusUpdate?.(errorMsg, 'error');
        this.onStatusUpdate?.('   - U2D2 is connected via USB', 'error');
        this.onStatusUpdate?.('   - Drivers are installed', 'error');
        this.onStatusUpdate?.('   - No other software is using the device', 'error');
        return false;
      }

      return true;
    } catch (error) {
      const errorMsg = `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.onStatusUpdate?.('🔌 Disconnecting...', 'info');
      await this.controller.disconnect();
      this.onStatusUpdate?.('👋 Disconnected successfully', 'success');
    } catch (error) {
      const errorMsg = `Disconnect failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
    }
  }

  public async quickDiscovery(): Promise<DeviceInfo[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      this.onStatusUpdate?.('🔍 Starting quick discovery (IDs 1-20)...', 'info');
      this.onStatusUpdate?.('This may take a while depending on the range of IDs to scan.', 'info');

      // Use discoverDevices directly to ensure devices are added to controller's device map
      const discoveredDevices = await this.controller.discoverDevices({
        range: 'quick',
        timeout: 100,
        onProgress: (progressData: { id: number; found: boolean; total: number; current: number }) => {
          // Extract the actual values from the progress object
          const { current, total, id } = progressData;
          this.onProgress?.({ current, total, id });
          this.onStatusUpdate?.(`   Scanning ID ${id}... (${current}/${total})`, 'info');
        }
      });

      this.onStatusUpdate?.(`   Found ${discoveredDevices.length} devices in quick scan`, 'success');

      // Log device count in controller for debugging
      const controllerDevices = this.controller.getAllDevices();
      this.onStatusUpdate?.(`   Controller now has ${controllerDevices.length} devices available`, 'info');

      return discoveredDevices.map(device => ({
        id: device.id,
        modelNumber: device.modelNumber,
        modelName: DynamixelController.getModelName(device.modelNumber),
        firmwareVersion: device.firmwareVersion
      }));
    } catch (error) {
      const errorMsg = `Quick discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async pingDevice(id: number): Promise<DeviceInfo | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      this.onStatusUpdate?.(`📍 Pinging specific device (ID ${id}):`, 'info');
      const deviceInfo = await this.controller.ping(id, 100) as DynamixelPingResponse;
      const modelName = DynamixelController.getModelName(deviceInfo.modelNumber);

      const device: DeviceInfo = {
        id: deviceInfo.id,
        modelNumber: deviceInfo.modelNumber,
        modelName,
        firmwareVersion: deviceInfo.firmwareVersion
      };

      this.onStatusUpdate?.(`   Device ID ${id}: ${modelName} (${deviceInfo.modelNumber}), FW: ${deviceInfo.firmwareVersion}`, 'success');
      return device;
    } catch {
      this.onStatusUpdate?.(`   No device found at ID ${id}`, 'warning');
      return null;
    }
  }

  public async testDevice(id: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      this.onStatusUpdate?.(`🧪 Testing device ${id}...`, 'info');

      // First check if we already have the device in our list
      const devices = this.controller.getAllDevices();
      this.onStatusUpdate?.(`   Found ${devices.length} devices in controller list`, 'info');

      if (devices.length > 0) {
        this.onStatusUpdate?.(`   Available device IDs: ${devices.map(d => d.id).join(', ')}`, 'info');
      }

      let device = devices.find(d => d.id === id);

      if (!device) {
        // Device not found in list, try to ping it first
        this.onStatusUpdate?.(`   Pinging device ${id}...`, 'info');
        const pingResult = await this.controller.ping(id, 1000) as DynamixelPingResponse;

        if (!pingResult) {
          throw new Error(`Device ${id} did not respond to ping`);
        }

        this.onStatusUpdate?.(`   Device ${id} responded to ping`, 'success');

        // Try to get the device again after ping
        const updatedDevices = this.controller.getAllDevices();
        device = updatedDevices.find(d => d.id === id);

        if (!device) {
          this.onStatusUpdate?.(`   Device ${id} found via ping but not accessible`, 'warning');
          return;
        }
      }

      // Add a small delay to allow motor to settle (matching your working code)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test ping using the device object directly (matching your working code)
      try {
        this.onStatusUpdate?.(`   Pinging motor ${id}...`, 'info');
        await device.ping();
        this.onStatusUpdate?.(`   ✅ Motor ${id} is responding`, 'success');
      } catch (pingError) {
        this.onStatusUpdate?.(`   ❌ Motor ${id} not responding to ping`, 'error');
        throw pingError;
      }

      // Get status information (matching your working code pattern)
      this.onStatusUpdate?.(`   Reading status from motor ${id}...`, 'info');

      try {
        const temperature = await device.getPresentTemperature();
        this.onStatusUpdate?.(`   Temperature: ${temperature}°C`, 'success');
      } catch (tempError) {
        this.onStatusUpdate?.(`   Could not read temperature: ${tempError instanceof Error ? tempError.message : 'Unknown error'}`, 'warning');
      }

      try {
        const voltage = await device.getPresentVoltage();
        this.onStatusUpdate?.(`   Voltage: ${device.voltageToVolts(voltage).toFixed(1)}V`, 'success');
      } catch (voltageError) {
        this.onStatusUpdate?.(`   Could not read voltage: ${voltageError instanceof Error ? voltageError.message : 'Unknown error'}`, 'warning');
      }

      try {
        const position = await device.getPresentPosition();
        this.onStatusUpdate?.(`   Position: ${position} (${device.positionToDegrees(position).toFixed(1)}°)`, 'success');
      } catch (positionError) {
        this.onStatusUpdate?.(`   Could not read position: ${positionError instanceof Error ? positionError.message : 'Unknown error'}`, 'warning');
      }

      // Test LED last (optional, like your code doesn't do this)
      try {
        this.onStatusUpdate?.(`   Testing LED on motor ${id}...`, 'info');
        await device.setLED(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await device.setLED(false);
        this.onStatusUpdate?.(`   LED test completed`, 'success');
      } catch (ledError) {
        this.onStatusUpdate?.(`   LED not supported or failed: ${ledError instanceof Error ? ledError.message : 'Unknown error'}`, 'warning');
      }

      this.onStatusUpdate?.(`   Motor ${id} testing completed successfully`, 'success');

    } catch (error) {
      const errorMsg = `Error testing device: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public getAllDevices(): DeviceInfo[] {
    const devices = this.controller.getAllDevices();
    return devices.map(device => {
      const info = device.getDeviceInfo() as DynamixelDeviceInfo | null;
      if (!info) {
        // Fallback if getDeviceInfo returns null
        return {
          id: device.id || 0,
          modelNumber: 0,
          modelName: 'Unknown',
          firmwareVersion: 0
        };
      }
      return {
        id: info.id,
        modelNumber: info.modelNumber,
        modelName: info.modelName || 'Unknown',
        firmwareVersion: info.firmwareVersion || 0
      };
    }).filter(device => device.id > 0); // Filter out invalid devices
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getSelectedDevice(): CommunicationDevice | null {
    return this.selectedDevice;
  }

  public hasSelectedDevice(): boolean {
    return this.selectedDevice !== null;
  }

  // Motor control methods for individual devices
  public async controlLED(id: number, ledOn: boolean): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      const device = devices.find(d => d.id === id);
      
      if (!device) {
        throw new Error(`Motor ${id} not found. Please discover motors first.`);
      }

      await device.setLED(ledOn);
      this.onStatusUpdate?.(`💡 LED ${ledOn ? 'on' : 'off'} for motor ${id}`, 'success');
    } catch (error) {
      const errorMsg = `LED control failed for motor ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async pingMotor(id: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      const device = devices.find(d => d.id === id);
      
      if (!device) {
        throw new Error(`Motor ${id} not found. Please discover motors first.`);
      }

      this.onStatusUpdate?.(`📡 Pinging motor ${id}...`, 'info');
      await device.ping();
      this.onStatusUpdate?.(`📡 Motor ${id} ping successful`, 'success');
    } catch (error) {
      const errorMsg = `Ping failed for motor ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async readMotorStatus(id: number): Promise<{temperature: number, voltage: number, position: number}> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      const device = devices.find(d => d.id === id);
      
      if (!device) {
        throw new Error(`Motor ${id} not found. Please discover motors first.`);
      }

      this.onStatusUpdate?.(`📊 Reading status from motor ${id}...`, 'info');

      // Read each value individually with error handling (like testDevice method)
      let temperature = 0;
      let voltage = 0;
      let position = 0;

      try {
        temperature = await device.getPresentTemperature();
        this.onStatusUpdate?.(`   Temperature: ${temperature}°C`, 'success');
      } catch (tempError) {
        this.onStatusUpdate?.(`   Could not read temperature: ${tempError instanceof Error ? tempError.message : 'Unknown error'}`, 'warning');
        throw new Error(`Temperature read failed: ${tempError instanceof Error ? tempError.message : 'Unknown error'}`);
      }

      try {
        const voltageRaw = await device.getPresentVoltage();
        voltage = parseFloat(device.voltageToVolts(voltageRaw).toFixed(1));
        this.onStatusUpdate?.(`   Voltage: ${voltage}V`, 'success');
      } catch (voltageError) {
        this.onStatusUpdate?.(`   Could not read voltage: ${voltageError instanceof Error ? voltageError.message : 'Unknown error'}`, 'warning');
        throw new Error(`Voltage read failed: ${voltageError instanceof Error ? voltageError.message : 'Unknown error'}`);
      }

      try {
        position = await device.getPresentPosition();
        this.onStatusUpdate?.(`   Position: ${position} (${device.positionToDegrees(position).toFixed(1)}°)`, 'success');
      } catch (positionError) {
        this.onStatusUpdate?.(`   Could not read position: ${positionError instanceof Error ? positionError.message : 'Unknown error'}`, 'warning');
        throw new Error(`Position read failed: ${positionError instanceof Error ? positionError.message : 'Unknown error'}`);
      }

      this.onStatusUpdate?.(`📊 Status read complete for motor ${id}`, 'success');
      
      return {
        temperature,
        voltage,
        position
      };
    } catch (error) {
      const errorMsg = `Status read failed for motor ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async moveMotorToPosition(id: number, position: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      const device = devices.find(d => d.id === id);
      
      if (!device) {
        throw new Error(`Motor ${id} not found. Please discover motors first.`);
      }

      if (position < 0 || position > 4095) {
        throw new Error('Position must be between 0 and 4095');
      }

      this.onStatusUpdate?.(`🎯 Moving motor ${id} to position ${position}...`, 'info');

      // Ensure torque is enabled for movement
      try {
        await device.setTorqueEnable(true);
        this.onStatusUpdate?.(`   Torque enabled for motor ${id}`, 'info');
      } catch (torqueError) {
        this.onStatusUpdate?.(`   Warning: Could not enable torque: ${torqueError instanceof Error ? torqueError.message : 'Unknown error'}`, 'warning');
      }

      // Set the goal position
      await device.setGoalPosition(position);
      const angle = device.positionToDegrees(position);
      this.onStatusUpdate?.(`🎯 Motor ${id} moving to position ${position} (${angle.toFixed(1)}°)`, 'success');

      // Add a small delay to let the motor start moving
      await new Promise(resolve => setTimeout(resolve, 100));

      // Optionally read current position to verify command was received
      try {
        const currentPosition = await device.getPresentPosition();
        this.onStatusUpdate?.(`   Current position: ${currentPosition} (command sent for ${position})`, 'info');
      } catch (readError) {
        this.onStatusUpdate?.(`   Position read after move failed: ${readError instanceof Error ? readError.message : 'Unknown error'}`, 'warning');
      }

    } catch (error) {
      const errorMsg = `Move failed for motor ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async emergencyStop(id: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      const device = devices.find(d => d.id === id);
      
      if (!device) {
        throw new Error(`Motor ${id} not found. Please discover motors first.`);
      }

      // Emergency stop by disabling torque
      await device.setTorqueEnable(false);
      this.onStatusUpdate?.(`🛑 Emergency stop activated for motor ${id}`, 'warning');
    } catch (error) {
      const errorMsg = `Emergency stop failed for motor ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }

  public async enableTorqueForAllMotors(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to U2D2 device');
    }

    try {
      const devices = this.controller.getAllDevices();
      
      if (devices.length === 0) {
        throw new Error('No motors found. Please discover motors first.');
      }

      this.onStatusUpdate?.(`🔧 Enabling torque for ${devices.length} motor(s)...`, 'info');

      for (const device of devices) {
        try {
          await device.setTorqueEnable(true);
          this.onStatusUpdate?.(`   Torque enabled for motor ${device.id}`, 'success');
        } catch (error) {
          this.onStatusUpdate?.(`   Failed to enable torque for motor ${device.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
        }
      }

      this.onStatusUpdate?.(`🔧 Torque enable process completed`, 'success');
    } catch (error) {
      const errorMsg = `Enable torque failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      log.error(errorMsg);
      this.onStatusUpdate?.(errorMsg, 'error');
      throw error;
    }
  }
}
