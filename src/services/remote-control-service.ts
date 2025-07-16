import { EventEmitter } from 'events';
import { createSocket, Socket } from 'dgram';
import { getGlobalIp } from 'werift';
import log from 'electron-log/main';

import type {
  RemoteControlSettings,
  MotorTelemetry,
  RemoteControlMessage,
  MotorCommand,
  AckData
} from '../types/remote-control';

// Re-export types for external use
export type {
  RemoteControlSettings,
  MotorTelemetry,
  RemoteControlMessage,
  MotorCommand,
  AckData,
  ConnectionStatus
} from '../types/remote-control';

export class RemoteControlService extends EventEmitter {
  private socket: Socket | null = null;
  private isLeader = false;
  private remoteAddress: string | null = null;
  private remotePort: number | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private motorId: number | null = null;
  private settings: RemoteControlSettings;
  private publicIP: string | null = null;
  private lastHeartbeat = 0;

  constructor(settings: RemoteControlSettings) {
    super();
    this.settings = settings;
  }

  async discoverPublicIP(): Promise<string | null> {
    try {
      log.info('Discovering public IP via STUN using werift...');
      
      // Try multiple STUN servers for redundancy
      for (const stunServer of this.settings.stunServers) {
        try {
          const [host, port] = stunServer.split(':');
          const stunHost = host;
          const stunPort = parseInt(port) || 3478;
          
          log.info(`Trying STUN server: ${stunHost}:${stunPort}`);
          
          // Use werift's getGlobalIp function with STUN server
          const globalIp = await getGlobalIp([stunHost, stunPort]);
          
          if (globalIp) {
            this.publicIP = globalIp;
            log.info(`Public IP discovered: ${this.publicIP} via ${stunServer}`);
            return this.publicIP;
          }
          
          log.warn(`STUN server ${stunServer} returned no IP`);
        } catch (error) {
          log.warn(`STUN server ${stunServer} failed:`, error);
          continue;
        }
      }
      
      // If all STUN servers fail, try HTTP-based IP discovery as fallback
      log.warn('All STUN servers failed, trying HTTP-based IP discovery...');
      return await this.discoverPublicIPViaHTTP();
    } catch (error) {
      log.error('Failed to discover public IP:', error);
      // Try HTTP fallback as last resort
      return await this.discoverPublicIPViaHTTP();
    }
  }

  private async discoverPublicIPViaHTTP(): Promise<string | null> {
    try {
      // Try multiple HTTP-based IP discovery services
      const services = [
        'https://api.ipify.org',
        'https://checkip.amazonaws.com',
        'https://icanhazip.com'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const ip = (await response.text()).trim();
            if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
              this.publicIP = ip;
              log.info(`Public IP discovered via HTTP: ${this.publicIP} from ${service}`);
              return this.publicIP;
            }
          }
        } catch (error) {
          log.warn(`HTTP IP service ${service} failed:`, error);
          continue;
        }
      }
      
      log.warn('All IP discovery methods failed');
      return null;
    } catch (error) {
      log.error('HTTP IP discovery failed:', error);
      return null;
    }
  }

  async startLeader(motorId: number, port: number): Promise<void> {
    this.motorId = motorId;
    this.isLeader = true;
    
    try {
      // Discover public IP first
      await this.discoverPublicIP();
      
      // Create UDP socket
      this.socket = createSocket('udp4');
      
      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });
      
      this.socket.on('error', (error) => {
        log.error('UDP Socket error:', error);
        this.emit('connectionUpdate', {
          connected: false,
          message: `Socket error: ${error.message}`
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(port, () => {
          resolve();
        });
        
        this.socket!.on('error', (error) => {
          reject(error);
        });
      });
      
      log.info(`Leader started on port ${port}, public IP: ${this.publicIP}`);
      this.emit('connectionUpdate', {
        connected: true,
        message: `Listening on port ${port}${this.publicIP ? ` (${this.publicIP})` : ''}`
      });
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
    } catch (error) {
      log.error('Failed to start leader:', error);
      throw error;
    }
  }

  async connectToLeader(motorId: number, leaderAddress: string): Promise<void> {
    this.motorId = motorId;
    this.isLeader = false;
    
    try {
      // Parse leader address
      const [host, portStr] = leaderAddress.split(':');
      const port = parseInt(portStr);
      
      if (!host || !port) {
        throw new Error('Invalid leader address format. Use host:port');
      }
      
      this.remoteAddress = host;
      this.remotePort = port;
      
      // Create UDP socket
      this.socket = createSocket('udp4');
      
      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });
      
      this.socket.on('error', (error) => {
        log.error('UDP Socket error:', error);
        this.emit('connectionUpdate', {
          connected: false,
          message: `Socket error: ${error.message}`
        });
      });
      
      // Bind to any available port
      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(0, () => {
          resolve();
        });
        
        this.socket!.on('error', (error) => {
          reject(error);
        });
      });
      
      // Send initial heartbeat to establish connection
      await this.sendHeartbeat();
      
      log.info(`Follower connected to ${leaderAddress}`);
      this.emit('connectionUpdate', {
        connected: true,
        message: `Connected to ${leaderAddress}`,
        remoteAddress: leaderAddress
      });
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Start connection timeout monitoring
      this.startConnectionMonitoring();
      
    } catch (error) {
      log.error('Failed to connect to leader:', error);
      throw error;
    }
  }

  private handleMessage(msg: Buffer, rinfo: { address: string; port: number }): void {
    try {
      const message: RemoteControlMessage = JSON.parse(msg.toString());
      const now = Date.now();
      
      // Update remote address info for leader mode
      if (this.isLeader && (!this.remoteAddress || !this.remotePort)) {
        this.remoteAddress = rinfo.address;
        this.remotePort = rinfo.port;
        log.info(`Follower connected from ${this.remoteAddress}:${this.remotePort}`);
      }
      
      switch (message.type) {
        case 'heartbeat': {
          this.lastHeartbeat = now;
          const latency = now - message.timestamp;
          
          // Send ACK for heartbeat
          this.sendMessage({
            type: 'ack',
            timestamp: now,
            data: { originalTimestamp: message.timestamp }
          });
          
          this.emit('connectionUpdate', {
            connected: true,
            message: this.isLeader ? 'Follower connected' : 'Connected to leader',
            remoteAddress: `${rinfo.address}:${rinfo.port}`,
            latency
          });
          break;
        }
          
        case 'telemetry':
          if (!this.isLeader && message.data) {
            // Follower receives telemetry from leader
            this.emit('telemetryData', message.data);
            
            // Execute motor command if we have motor control
            if (this.motorId && message.motorId === this.motorId && 'position' in message.data) {
              this.executeMotorCommand(message.data as MotorTelemetry);
            }
          }
          break;
          
        case 'command':
          if (!this.isLeader && message.data && 'position' in message.data) {
            // Follower receives commands from leader
            this.executeMotorCommand(message.data as MotorCommand);
          }
          break;
          
        case 'ack': {
          // Handle acknowledgments for latency calculation
          const ackData = message.data as AckData;
          if (ackData && ackData.originalTimestamp) {
            const latency = now - ackData.originalTimestamp;
            this.emit('connectionUpdate', {
              connected: true,
              message: this.isLeader ? 'Follower connected' : 'Connected to leader',
              remoteAddress: `${rinfo.address}:${rinfo.port}`,
              latency
            });
          }
          break;
        }
      }
    } catch (error) {
      log.error('Failed to parse UDP message:', error);
    }
  }

  async sendTelemetry(telemetry: MotorTelemetry): Promise<void> {
    if (!this.isLeader) return;
    
    await this.sendMessage({
      type: 'telemetry',
      timestamp: Date.now(),
      motorId: this.motorId!,
      data: telemetry
    });
  }

  async sendCommand(command: MotorCommand): Promise<void> {
    if (!this.isLeader) return;
    
    await this.sendMessage({
      type: 'command',
      timestamp: Date.now(),
      motorId: this.motorId!,
      data: command
    });
  }

  private async sendHeartbeat(): Promise<void> {
    await this.sendMessage({
      type: 'heartbeat',
      timestamp: Date.now()
    });
  }

  private async sendMessage(message: RemoteControlMessage): Promise<void> {
    if (!this.socket || !this.remoteAddress || !this.remotePort) {
      throw new Error('No connection established');
    }
    
    const data = Buffer.from(JSON.stringify(message));
    
    return new Promise((resolve, reject) => {
      this.socket!.send(data, this.remotePort!, this.remoteAddress!, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(error => {
        log.error('Failed to send heartbeat:', error);
      });
    }, this.settings.heartbeatInterval);
  }

  private startHeartbeatMonitoring(): void {
    // For leader mode, monitor if we've received heartbeats from follower
    this.connectionTimer = setInterval(() => {
      const now = Date.now();
      if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > this.settings.timeoutMs) {
        log.warn('Heartbeat timeout - connection lost');
        this.emit('connectionUpdate', {
          connected: false,
          message: 'Connection timeout - follower disconnected'
        });
        this.disconnect();
      }
    }, this.settings.heartbeatInterval);
  }

  private startConnectionMonitoring(): void {
    // For follower mode, monitor our own heartbeat responses
    this.connectionTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.lastHeartbeat > this.settings.timeoutMs) {
        log.warn('Connection timeout - leader not responding');
        this.emit('connectionUpdate', {
          connected: false,
          message: 'Connection timeout - leader not responding'
        });
        this.disconnect();
      }
    }, this.settings.heartbeatInterval);
  }

  private async executeMotorCommand(command: MotorTelemetry | MotorCommand): Promise<void> {
    if (!this.motorId) return;
    
    try {
      // This would integrate with the dynamixel controller
      // For now, we'll emit the command for the main process to handle
      this.emit('motorCommand', {
        motorId: this.motorId,
        command: command
      });
    } catch (error) {
      log.error('Failed to execute motor command:', error);
    }
  }

  disconnect(): void {
    log.info('Disconnecting remote control service');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.remoteAddress = null;
    this.remotePort = null;
    this.motorId = null;
    this.isLeader = false;
    this.lastHeartbeat = 0;
    
    this.emit('connectionUpdate', {
      connected: false,
      message: 'Disconnected'
    });
  }

  isConnected(): boolean {
    return this.socket !== null && this.remoteAddress !== null;
  }

  getPublicAddress(): string | null {
    return this.publicIP;
  }
}

// Default settings
export const defaultRemoteControlSettings: RemoteControlSettings = {
  stunServers: [
    'stun.l.google.com:19302',
    'stun1.l.google.com:19302',
    'stun2.l.google.com:19302'
  ],
  port: 50000,
  heartbeatInterval: 1000, // 1 second
  timeoutMs: 5000 // 5 seconds
};