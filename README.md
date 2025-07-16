# Dynaforge

A professional Electron application for DYNAMIXEL motor control, testing, and remote operation built with Vue 3, TypeScript, and Tailwind CSS.

## Overview

Dynaforge provides a modern, intuitive interface for working with ROBOTIS DYNAMIXEL servo motors. The application features real-time device discovery, comprehensive motor testing, and innovative internet-based remote control capabilities.

## Features

### 🔍 **Device Discovery & Connection**
- **Auto-Discovery**: Real-time scanning for U2D2 devices via USB and Serial interfaces
- **Auto-Connect**: Automatically reconnects to your last used device on startup
- **Background Operations**: Non-blocking motor discovery keeps the UI responsive
- **Multi-Interface Support**: Works with USB and Serial DYNAMIXEL communication devices

### 🎛️ **Motor Control & Testing**
- **Individual Motor Control**: LED control, position commands, and emergency stop
- **Motor Status Monitoring**: Real-time temperature, voltage, and position readings
- **Bulk Operations**: Enable torque for all discovered motors simultaneously
- **Background Discovery**: Scan for motors (ID 1-20) without blocking the interface

### 🌐 **Remote Control (Beta)**
- **Internet Motor Control**: Control motors over the internet using UDP networking
- **STUN/TURN Support**: NAT traversal for reliable connections behind firewalls
- **Leader/Follower Architecture**: One motor can control remote motors in real-time
- **Live Telemetry**: Position, velocity, current, and temperature streaming

### ⚙️ **Settings & Persistence**
- **Connection Memory**: Remembers and restores device connections
- **Window State**: Saves window position, size, and maximized state
- **Auto-Connect Toggle**: Enable/disable automatic device reconnection
- **Persistent Configuration**: All settings survive app restarts

## Screenshots

*[Screenshots will be added as the application is tested and documented]*

## Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **DYNAMIXEL U2D2** interface device
- **DYNAMIXEL motors** (optional for UI testing)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dynaforge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

### Build for Production

```bash
# Package the application
npm run package

# Create distributable packages
npm run make

# Publish the application
npm run publish
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the Electron app in development mode with DYNAMIXEL support |
| `npm run lint` | Run ESLint on TypeScript files |
| `npm run typecheck` | Run TypeScript syntax checking |
| `npm run check` | Run both linting and TypeScript checking (recommended before commits) |
| `npm run package` | Package the app for distribution |
| `npm run make` | Build distributable packages (preferred for testing compilation) |
| `node simple-test.js` | Test dynamixel package compatibility |

## Architecture

### Technology Stack
- **Frontend**: Vue 3 with Composition API
- **Backend**: Electron with TypeScript
- **Styling**: Tailwind CSS with DaisyUI components
- **UI Components**: Headless UI for Vue
- **Build System**: Vite with ESM support
- **Hardware Interface**: DYNAMIXEL package v0.0.5
- **Networking**: werift library for STUN/TURN support

### Project Structure

```
src/
├── components/           # Vue 3 components
│   ├── DiscoveryComponent.vue      # Real-time device discovery
│   ├── RemoteControlComponent.vue  # UDP remote motor control
│   ├── SettingsComponent.vue       # App settings management
│   └── U2D2DevicePanel.vue        # Device connection interface
├── services/            # TypeScript services
│   ├── dynamixel-controller.ts    # DYNAMIXEL operations wrapper
│   ├── remote-control-service.ts  # UDP networking with STUN
│   └── settings-service.ts        # Persistent settings management
├── stores/              # Vue state management
│   └── dynamixelStore.ts          # Global application state
├── types/               # TypeScript type definitions
│   ├── remote-control.ts          # Remote control interfaces
│   └── settings.ts               # Settings type definitions
└── styles/              # CSS and styling
```

### Key Components

- **Main Process** (`src/main.ts`): Electron main process with service integration and window management
- **Renderer Process**: Vue 3 application with professional sidebar layout
- **Preload Script** (`src/preload.ts`): Secure IPC bridge for DYNAMIXEL API exposure
- **DYNAMIXEL Service**: Hardware abstraction layer for motor communication
- **Remote Control Service**: UDP networking with NAT traversal capabilities
- **Settings Service**: Persistent configuration and device memory

## Hardware Requirements

### Supported Devices
- **ROBOTIS U2D2**: Primary interface device (USB or Serial)
- **DYNAMIXEL Motors**: Any ROBOTIS DYNAMIXEL servo motor
- **Operating Systems**: Windows, macOS, Linux

### Connection Setup
1. Connect U2D2 device to your computer via USB
2. Connect DYNAMIXEL motors to U2D2 via TTL or RS485
3. Ensure proper power supply for motors
4. Launch Dynaforge and enable auto-connect in settings

## Usage Guide

### Basic Motor Control
1. **Connect Device**: Use the Device Panel to select and connect your U2D2
2. **Discover Motors**: Click "Start Discovery" to find connected motors
3. **Test Motors**: Use LED control and position commands to test functionality
4. **Monitor Status**: View real-time temperature, voltage, and position data

### Remote Control Setup
1. **Enable Remote Control**: Navigate to the Remote Control tab
2. **Discover Public IP**: Use STUN servers to find your public address
3. **Start Leader Mode**: Configure a motor to broadcast its movements
4. **Connect as Follower**: Connect to a remote leader using their IP address

### Settings Configuration
- **Auto-Connect**: Toggle automatic device reconnection
- **Connection Settings**: Configure baud rate and other communication parameters
- **Window Preferences**: Customize application window behavior

## Troubleshooting

### Common Issues

**Device Not Found**
- Ensure U2D2 is properly connected via USB
- Check that DYNAMIXEL motors have adequate power supply
- Verify correct baud rate settings

**Connection Failures**
- Try different USB ports
- Restart the application
- Check device drivers (Windows may require additional drivers)

**Remote Control Issues**
- Verify firewall settings allow UDP traffic
- Ensure both devices have internet connectivity
- Check NAT/router configuration for port forwarding

### Logging
The application uses `electron-log` for comprehensive logging:
- **File Logs**: Located in the application data directory
- **Console Logs**: Available in development mode DevTools
- **Log Levels**: Debug, Info, Warn, Error

## Contributing

### Code Quality Guidelines
- Run `npm run check` before committing changes
- Follow TypeScript best practices and avoid `any` types
- Create proper interfaces for all data structures
- Use meaningful error messages with context
- Follow existing code style and patterns

### Development Workflow
1. Create feature branch from main
2. Implement changes with proper TypeScript typing
3. Add appropriate logging for debugging
4. Test with real hardware when possible
5. Run linting and type checking
6. Submit pull request with clear description

## Testing

### Manual Testing
- **UI Testing**: Use `npm start` for interactive testing
- **Build Testing**: Use `npm run make` for compilation testing
- **Hardware Testing**: Test with real DYNAMIXEL devices

### Automated Testing (Planned)
- **Playwright Integration**: Automated UI testing with screenshots
- **Visual Regression**: Automated detection of UI changes
- **Motor Control Testing**: Automated hardware interaction testing

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Check existing documentation and troubleshooting guides
- Ensure you have the latest version installed

## Acknowledgments

- **ROBOTIS**: For DYNAMIXEL hardware and SDK
- **Electron Team**: For the excellent desktop application framework
- **Vue.js Team**: For the reactive frontend framework
- **Tailwind CSS**: For the utility-first CSS framework

---

**Built with ❤️ for the robotics community**