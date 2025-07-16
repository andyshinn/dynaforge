export interface ConnectionSettings {
  connectionType: string;
  baudRate: number;
  timeout: number;
  discoveryStartId: number;
  discoveryEndId: number;
  stunServers: string[];
  defaultPort: number;
  remoteTimeoutSeconds: number;
}

export interface AppSettings {
  connection: ConnectionSettings;
  remoteControl: {
    stunServers: string[];
    port: number;
    heartbeatInterval: number;
    timeoutMs: number;
  };
}