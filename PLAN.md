# Playwright + Electron Testing Implementation Plan

## Overview
This plan outlines how to integrate Playwright testing with the Dynaforge Electron application to enable automated testing, screenshot capture, and browser automation of the Vue 3 interface and DYNAMIXEL motor control functionality.

## Current Status
- ✅ Playwright MCP server installed and configured
- ✅ Research completed on Playwright-Electron integration
- ✅ Development environment analysis completed

## Phase 1: Basic Playwright Setup (1-2 hours)

### 1.1 Install Dependencies
```bash
npm install --save-dev playwright @playwright/test
npx playwright install
```

### 1.2 Create Test Configuration
- Create `playwright.config.ts` with Electron-specific configuration
- Configure test directories, timeouts, and output paths
- Set up video recording and screenshot options

### 1.3 Basic Test Structure
- Create `tests/` directory structure
- Set up base test utilities for Electron app launching
- Create helper functions for common operations

## Phase 2: Electron Integration (2-3 hours)

### 2.1 Modify Main Process for Testing
- Add debug port support in development mode (`src/main.ts:89-92`)
- Enable remote debugging: `app.commandLine.appendSwitch('remote-debugging-port', '9222')`
- Add test environment detection and configuration

### 2.2 Create Electron Test Launcher
```typescript
// tests/utils/electron-launcher.ts
export async function launchDynaforge() {
  const electronApp = await electron.launch({
    args: ['src/main.ts'],
    executablePath: 'npm',
    env: { ...process.env, NODE_ENV: 'test' },
    recordVideo: { dir: 'test-videos' },
    timeout: 30000
  });
  return electronApp;
}
```

### 2.3 Window Management Utilities
- Create functions to access main window and components
- Set up reliable selectors for Vue components
- Implement wait strategies for dynamic content

## Phase 3: Component Testing (3-4 hours)

### 3.1 UI Component Tests
- Test sidebar navigation and component switching
- Screenshot capture of each main component:
  - Discovery Component
  - Remote Control Component
  - Settings Component
  - U2D2 Device Panel

### 3.2 DYNAMIXEL Integration Tests
- Mock or use real DYNAMIXEL devices for testing
- Test device discovery workflows
- Test motor control operations
- Capture screenshots of motor status displays

### 3.3 Settings and Persistence Tests
- Test auto-connect functionality
- Test window state persistence
- Test settings save/load operations

## Phase 4: Advanced Testing Features (2-3 hours)

### 4.1 Visual Regression Testing
- Set up baseline screenshots for comparison
- Implement automated visual diff detection
- Create test reporting with visual comparisons

### 4.2 End-to-End Workflows
- Complete device connection workflow
- Motor discovery and testing sequence
- Remote control setup and operation
- Settings configuration workflows

### 4.3 Error Scenarios
- Test error handling and recovery
- Network failure simulation for remote control
- Device disconnection scenarios

## Phase 5: CI/CD Integration (1-2 hours)

### 5.1 GitHub Actions Setup
- Configure headless testing environment
- Set up artifact collection for screenshots/videos
- Implement test result reporting

### 5.2 Test Automation
- Automated testing on pull requests
- Nightly regression testing
- Performance monitoring

## File Structure Plan

```
tests/
├── configs/
│   └── playwright.config.ts
├── utils/
│   ├── electron-launcher.ts
│   ├── component-helpers.ts
│   └── mock-devices.ts
├── unit/
│   ├── discovery.test.ts
│   ├── remote-control.test.ts
│   └── settings.test.ts
├── integration/
│   ├── motor-control.test.ts
│   ├── device-connection.test.ts
│   └── workflow.test.ts
├── visual/
│   ├── ui-components.test.ts
│   └── responsive-layout.test.ts
├── fixtures/
│   ├── mock-devices.json
│   └── test-settings.json
└── screenshots/
    ├── baseline/
    └── current/
```

## Key Benefits

### For Development
- **Visual Testing**: Automated screenshots of all UI states
- **Regression Detection**: Catch UI and functionality regressions early
- **Documentation**: Screenshots serve as visual documentation
- **Debugging**: Video recordings of test failures for debugging

### For DYNAMIXEL Testing
- **Motor Control Validation**: Ensure motor commands work correctly
- **Device Discovery Testing**: Verify device detection across platforms
- **Remote Control Testing**: Test Internet connectivity features
- **Error Handling**: Validate error scenarios and recovery

### For Maintenance
- **Automated Testing**: Reduce manual testing overhead
- **Cross-Platform Validation**: Test on multiple operating systems
- **Performance Monitoring**: Track app startup and response times
- **Quality Assurance**: Ensure consistent user experience

## Implementation Timeline

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 1 | 1-2 hours | High | None |
| Phase 2 | 2-3 hours | High | Phase 1 |
| Phase 3 | 3-4 hours | Medium | Phase 2 |
| Phase 4 | 2-3 hours | Medium | Phase 3 |
| Phase 5 | 1-2 hours | Low | Phase 4 |

**Total Estimated Time: 9-14 hours**

## Prerequisites
- Node.js and npm (already installed)
- Playwright MCP server (already configured)
- Understanding of Vue 3 component selectors
- Access to DYNAMIXEL hardware for integration tests (optional)

## Success Criteria
- [ ] Automated screenshot capture of all UI components
- [ ] Video recording of complete user workflows
- [ ] Visual regression testing pipeline
- [ ] Automated motor control testing
- [ ] CI/CD integration with test reporting
- [ ] Documentation with visual examples

## Notes
- Tests should be runnable without DYNAMIXEL hardware (using mocks)
- Consider performance impact of video recording in CI/CD
- Implement proper cleanup of Electron processes after tests
- Use test-specific settings to avoid affecting development data

## MCP Integration Notes
The Playwright MCP server (v0.0.28+) now supports context builder callbacks, which allows:
- Custom browser context configuration
- Advanced screenshot and automation options
- Integration with Claude Code for AI-assisted testing
- Real-time test development and debugging

This plan provides a robust foundation for comprehensive Electron app testing with visual validation and automated quality assurance.