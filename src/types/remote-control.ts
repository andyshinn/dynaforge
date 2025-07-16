export interface RemoteControlSettings {
  stunServers: string[];
  port: number;
  heartbeatInterval: number;
  timeoutMs: number;
}

export interface MotorTelemetry {
  position: number;
  velocity: number;
  current: number;
  temperature: number;
  timestamp: number;
}

export interface RemoteControlMessage {
  type: 'heartbeat' | 'telemetry' | 'command' | 'ack';
  timestamp: number;
  data?: MotorTelemetry | MotorCommand | AckData;
  motorId?: number;
}

export interface MotorCommand {
  position?: number;
  torqueEnable?: boolean;
}

export interface AckData {
  originalTimestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  message: string;
  remoteAddress?: string;
  latency?: number;
}

export interface RemoteControlLeaderConfig {
  motorId: number;
  port: number;
}

export interface RemoteControlFollowerConfig {
  motorId: number;
  leaderAddress: string;
}