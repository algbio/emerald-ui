# Emerald UI - Desktop & Web App

This project supports both web deployment and desktop application builds using Electron.

## Available Build Commands

### Web Version (GitHub Pages)
```bash
# Development
npm run dev

# Build for web deployment
npm run build

# Preview web build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

### Desktop Version (Electron)
```bash
# Development with hot reload
npm run electron:dev

# Build desktop app files
npm run build:desktop

# Run desktop app (after building)
npm run electron

# Package desktop app for distribution
npm run electron:pack      # Creates unpacked app in dist/
npm run electron:build     # Creates installer packages
```

## Architecture

### Dual Build System
- **Web build**: Uses `vite build` with GitHub Pages base URL
- **Desktop build**: Uses `vite build --mode electron` with relative paths for Electron

### Directory Structure
```
dist/                    # Web build output
dist-electron/           # Electron build output
├── main.js             # Electron main process
└── preload.js          # Electron preload script
src-electron/           # Electron source files
├── main.ts             # Main process (window management)
└── preload.ts          # Preload script (security layer)
```

### Key Features
- **Cross-platform**: Builds for Windows, macOS, and Linux
- **Security**: Uses context isolation and disabled node integration
- **Development**: Hot reload support for Electron development
- **Packaging**: Automated installer creation with electron-builder

## Development Workflow

### For Web Development
1. `npm run dev` - Start development server
2. Make changes to React components
3. `npm run build` - Build for production
4. `npm run deploy` - Deploy to GitHub Pages

### For Desktop Development
1. `npm run electron:dev` - Start Electron with hot reload
2. Make changes to React components or Electron files
3. App automatically reloads on React changes
4. For Electron file changes, restart the command

### Building for Distribution
1. `npm run build:desktop` - Build all components
2. `npm run electron:build` - Create installers
3. Find packages in `release/` directory

## Platform-Specific Builds
- **Windows**: Creates NSIS installer (.exe)
- **macOS**: Creates DMG package (.dmg) for both Intel and Apple Silicon
- **Linux**: Creates AppImage (.AppImage)

## Configuration
- **Electron settings**: `package.json` build section
- **Web settings**: `vite.config.ts`
- **Electron main process**: `src-electron/main.ts`
- **Electron preload**: `src-electron/preload.ts`