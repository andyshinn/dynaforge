# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start the Electron app in development mode with DYNAMIXEL support
- `npm run lint` - Run ESLint on TypeScript files
- `npm run typecheck` - Run TypeScript syntax checking without compilation
- `npm run check` - Run both linting and TypeScript checking
- `npm run package` - Package the app for distribution
- `npm run make` - Build distributable packages (AppImage, RPM, etc.)
- `npm run publish` - Publish the application
- `node simple-test.js` - Test dynamixel package compatibility

## Architecture

This is an Electron application built with:
- **Main Process**: `src/main.ts` - Electron main process with DYNAMIXEL service integration
- **Renderer Process**: Vue 3 application using Composition API with Tailwind CSS UI
- **Preload Script**: `src/preload.mjs` - Secure IPC bridge for DYNAMIXEL API exposure
- **Build System**: Vite with ESM support for dynamixel package compatibility
- **Layout**: Professional sidebar layout using Headless UI components

### Key Components

- **DynamixelService**: `src/dynamixel-controller.ts` - TypeScript wrapper for DYNAMIXEL operations
- **DiscoveryComponent**: `src/DiscoveryComponent.vue` - Real-time device discovery and testing interface
- **Layout**: `src/Layout.vue` - Responsive sidebar navigation with Discovery page
- **IPC Communication**: Secure main↔renderer messaging for device operations
- **ESM Configuration**: `"type": "module"` with dual CJS/ESM dynamixel package support

### DYNAMIXEL Integration

- **Package**: Uses dynamixel v0.0.5 with dual CommonJS/ES module support
- **Discovery**: Real device scanning via U2D2 interface
- **Testing**: LED control, temperature/voltage/position readings
- **Logging**: electron-log integration for file and console output

The app uses Electron's ESM support with Vite bundling, externalized dynamixel package, and professional Tailwind CSS interface.

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
- **Connection management**: Use proper TypeScript interfaces for device selection and connection
- **Status updates**: Use the `StatusType` union type for consistent status messaging
- **Error boundaries**: Wrap DYNAMIXEL API calls in try-catch with meaningful error messages
