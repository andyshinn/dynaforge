# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start the Electron app in development mode with DYNAMIXEL support (use only for UI testing)
- `npm run lint` - Run ESLint on TypeScript files
- `npm run typecheck` - Run TypeScript syntax checking without compilation
- `npm run check` - Run both linting and TypeScript checking (run before commits)
- `npm run package` - Package the app for distribution
- `npm run make` - Build distributable packages (preferred for testing compilation)
- `npm run publish` - Publish the application
- `node simple-test.js` - Test dynamixel package compatibility

**Testing Guidelines**: Use `npm run make` for testing compilation and builds unless you need to interact with the UI, in which case use `npm start`.

## Architecture

This is an Electron application built with:
- **Main Process**: `src/main.ts` - Electron main process with DYNAMIXEL service integration, auto-connect, and window state management
- **Renderer Process**: Vue 3 application using Composition API with Tailwind CSS UI
- **Preload Script**: `src/preload.ts` - Secure IPC bridge for DYNAMIXEL API exposure with auto-connect events
- **Build System**: Vite with ESM support for dynamixel package compatibility
- **Layout**: Professional sidebar layout using Headless UI components
- **Settings**: Persistent electron-settings integration with auto-connect and window state

### Project Structure

```
src/
├── components/           # Vue 3 components
│   ├── DiscoveryComponent.vue      # Real-time device discovery with background operations
│   ├── RemoteControlComponent.vue  # UDP remote motor control with STUN/TURN
│   ├── SettingsComponent.vue       # App settings with auto-connect toggle
│   └── U2D2DevicePanel.vue        # Device connection with auto-connect sync
├── services/            # TypeScript services
│   ├── dynamixel-controller.ts    # DYNAMIXEL operations wrapper
│   ├── remote-control-service.ts  # UDP networking with werift STUN
│   └── settings-service.ts        # Persistent settings with auto-connect
├── stores/              # Vue state management
│   └── dynamixelStore.ts          # Global app state with background operations
├── types/               # TypeScript type definitions
└── styles/              # CSS and styling
```

### Key Components

- **DynamixelService**: `src/services/dynamixel-controller.ts` - TypeScript wrapper for DYNAMIXEL operations
- **DiscoveryComponent**: `src/components/DiscoveryComponent.vue` - Background motor discovery with progress tracking
- **RemoteControlComponent**: `src/components/RemoteControlComponent.vue` - Internet motor control over UDP
- **SettingsComponent**: `src/components/SettingsComponent.vue` - App configuration with auto-connect toggle
- **U2D2DevicePanel**: `src/components/U2D2DevicePanel.vue` - Device connection with auto-connect synchronization
- **RemoteControlService**: `src/services/remote-control-service.ts` - UDP networking with STUN/TURN NAT traversal
- **SettingsService**: `src/services/settings-service.ts` - Persistent app settings and device memory
- **DynamixelStore**: `src/stores/dynamixelStore.ts` - Global state management with background operations
- **Layout**: `src/Layout.vue` - Responsive sidebar navigation with multi-page support
- **IPC Communication**: Secure main↔renderer messaging for device operations and auto-connect events
- **ESM Configuration**: `"type": "module"` with dual CJS/ESM dynamixel package support

### DYNAMIXEL Integration

- **Package**: Uses dynamixel v0.0.5 with dual CommonJS/ES module support
- **Discovery**: Real device scanning via U2D2 interface with background operations
- **Auto-Connect**: Automatic reconnection to last used device on app launch
- **Background Operations**: Non-blocking motor discovery with real-time progress updates
- **Testing**: LED control, temperature/voltage/position readings
- **Logging**: electron-log integration for file and console output

### Remote Control Features

- **UDP Networking**: Low-latency motor control over the Internet
- **STUN/TURN Support**: NAT traversal using werift library for public IP discovery
- **Leader/Follower Architecture**: One motor sends movements to remote motor
- **Real-time Telemetry**: Position, velocity, current, and temperature monitoring
- **Connection Management**: Automatic connection status and latency monitoring

### Persistence Features

- **Auto-Connect**: Remembers and automatically reconnects to last used U2D2 device
- **Window State**: Saves and restores window position, size, and maximized state
- **Settings Storage**: All app preferences persist between sessions
- **Device Memory**: Last connected device information stored securely

The app uses Electron's ESM support with Vite bundling, externalized dynamixel package, modern werift STUN library, and professional Tailwind CSS interface.

## Code Quality Guidelines

### TypeScript & Linting Standards
- **Always run linting**: Use `npm run lint` before committing changes
- **Avoid `any` types**: Create proper TypeScript interfaces instead of using `any`
- **Interface definitions**: Define interfaces for all data structures, especially:
  - Device objects from DYNAMIXEL API calls
  - IPC message payloads between main and renderer processes
  - Configuration objects and settings
- **Async handling**: Properly handle Promise types (e.g., `listSerialPorts()` returns `Promise<SerialDevice[]>`)
- **Type assertions**: Use type assertions sparingly and only when necessary (e.g., `as USBDevice[]`)
- **Const assertions**: Use `as const` for literal types in object properties
- **Return types**: Always specify return types for public methods

### Code Style
- **Method signatures**: Include return types for all public methods
- **Error handling**: Always provide proper error messages with context
- **Logging**: Use `electron-log` for consistent logging throughout the application
- **Event handling**: Type event handlers properly with expected payload interfaces

### DYNAMIXEL Integration Patterns
- **Device discovery**: Always handle both USB and Serial devices with proper type prefixes
- **Background operations**: Use background discovery for non-blocking UI with progress updates
- **Connection management**: Use proper TypeScript interfaces for device selection and connection
- **Auto-connect**: Implement IPC events to synchronize UI state with main process connections
- **Status updates**: Use the `StatusType` union type for consistent status messaging
- **Error boundaries**: Wrap DYNAMIXEL API calls in try-catch with meaningful error messages
- **Serialization**: Use SerializableDevice interface for settings storage to avoid cloning errors

### Settings and Persistence Patterns
- **Settings Service**: Use `settingsService` singleton for all persistent data
- **Device Serialization**: Store only essential device properties (type, path, displayName, isU2D2)
- **Auto-Connect Events**: Send `auto-connect-success` IPC events to synchronize UI state
- **Window State**: Save position, size, and maximized state on move/resize events
- **Type Safety**: Use proper TypeScript interfaces for all settings (ConnectionSettings, WindowSettings, SerializableDevice)

### Remote Control Patterns
- **UDP Networking**: Use RemoteControlService for low-latency motor control
- **STUN Discovery**: Use werift library for NAT traversal and public IP discovery
- **Event-Driven Architecture**: Use IPC events for connection status and telemetry updates
- **Error Handling**: Implement graceful fallbacks for network failures
- **Leader/Follower Modes**: Separate UI flows for sending vs receiving motor commands

### Background Operations Patterns
- **Non-Blocking Discovery**: Use background operations to keep UI responsive during motor scanning
- **Progress Updates**: Send real-time progress events via IPC (currentId, progress, found count)
- **State Management**: Track background operation state in the global store
- **Cancellation**: Implement proper cancellation mechanisms for long-running operations

## Recent Features Implemented

### Auto-Connect System (2024)
- **Purpose**: Automatically reconnect to the last used U2D2 device on app launch
- **Settings**: Toggle in Settings > Connection Settings > Auto-Connect on Launch
- **Storage**: Uses SerializableDevice interface to store device info safely
- **UI Sync**: IPC events ensure UI state matches main process connection status
- **Discovery**: Automatically starts motor discovery after successful auto-connect

### Window State Persistence (2024)
- **Features**: Saves and restores window position, size, and maximized state
- **Storage**: WindowSettings interface with x, y, width, height, maximized properties
- **Events**: Automatically saves on window move, resize, maximize, and unmaximize
- **Defaults**: 1200x800 window size for first-time users

### Background Motor Discovery (2024)
- **Purpose**: Non-blocking motor scanning that keeps UI responsive
- **Progress**: Real-time progress updates with current ID, percentage, and found count
- **Navigation**: Users can switch between pages while discovery continues
- **Events**: Complete IPC event system for start, progress, device found, complete, error, and cancellation
- **UI Updates**: Progress bar and real-time device list updates

### Project Organization (2024)
- **Structure**: Organized files into logical folders (components/, services/, stores/, types/, styles/)
- **Separation**: Clear separation between UI components, business logic, and state management
- **Imports**: Updated all import paths to use the new folder structure
- **Maintainability**: Improved code organization for better development experience

### Remote Control Enhancements (2024)
- **Library Migration**: Updated from outdated `node-stun` to modern `werift-webrtc` library
- **NAT Traversal**: Improved STUN/TURN support for reliable Internet connections
- **Error Handling**: Better error handling and connection management
- **UI Improvements**: Fixed background color consistency and scrolling issues
