# CastPlan MCP Installation Guide

Multiple installation methods are available to ensure compatibility across different environments and package managers.

## Quick Start (Recommended)

### Method 1: Smart Installation
Automatically tries the best available method:
```bash
node scripts/install-alternatives.js smart
```

### Method 2: Development Mode (Local Development)
If you have the source code:
```bash
node scripts/install-alternatives.js dev
```

## Alternative Installation Methods

### NPX (No Installation Required)
Run directly without permanent installation:
```bash
npx @castplan/automation-mcp --help
```

### Git Clone Method
Clone and run directly from source:
```bash
node scripts/install-alternatives.js git-clone --help
```

### Docker Method
Run in isolated Docker container:
```bash
node scripts/install-alternatives.js docker --help
```

### UV/UVX Python Package Managers
Modern Python package managers with Node.js support:

```bash
# Ephemeral execution (no installation)
uvx --from git+https://github.com/Ghostseller/CastPlan_mcp.git castplan-mcp

# Or using the Python bridge
pip install castplan-automation
castplan-mcp
```

## Manual Installation Methods

### NPM Global Installation
```bash
npm install -g @castplan/automation-mcp
```

### Yarn Global Installation
```bash
yarn global add @castplan/automation-mcp
```

### PNPM Global Installation
```bash
pnpm add -g @castplan/automation-mcp
```

## Installation Troubleshooting

### Common Issues and Solutions

#### 1. Node.js Version Issues
**Requirements:** Node.js ≥18.0.0

```bash
# Check your Node.js version
node --version

# If outdated, install from https://nodejs.org
```

#### 2. Package Not Found Errors
If standard npm installation fails:

```bash
# Use the alternative installation script
node scripts/install-alternatives.js smart
```

#### 3. Build Errors on Windows
Update your .npmrc configuration:

```bash
# Run in project directory
npm config set build-from-source false
npm config set prefer-built-modules true
```

#### 4. SQLite3 Build Issues
The project uses better-sqlite3 instead of sqlite3:

```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install
```

#### 5. Deprecated Package Warnings
These are handled automatically through package resolutions in package.json. The warnings don't affect functionality.

### Installation Verification

After installation, verify it works:

```bash
# Check version
castplan-mcp --version

# Check health
castplan-mcp health

# Get help
castplan-mcp --help
```

## Direct GitHub Installation

### Clone and Install
```bash
git clone https://github.com/Ghostseller/CastPlan_mcp.git
cd CastPlan_mcp
npm install
npm run build
npm link
```

### Direct Execution
```bash
git clone https://github.com/Ghostseller/CastPlan_mcp.git
cd CastPlan_mcp
npm install
npm run build
node dist/cli.js --help
```

## Python Bridge Installation

For Python environments:

```bash
# Install the Python bridge
pip install castplan-automation

# This provides Node.js package management
castplan-mcp --help
```

## Environment Requirements

### Minimum Requirements
- Node.js ≥18.0.0
- npm ≥8.0.0
- Git (for git-clone method)

### Optional Requirements
- Docker (for docker method)
- Python ≥3.8 (for Python bridge)
- uv/uvx (for modern Python package management)

### Supported Platforms
- Windows (x64, arm64)
- macOS (x64, arm64)
- Linux (x64, arm64)

## Getting Help

If you encounter issues:

1. Try the smart installation method first
2. Check the troubleshooting section above
3. Report issues at: https://github.com/Ghostseller/CastPlan_mcp/issues
4. Include your environment details:
   ```bash
   node --version
   npm --version
   echo $OS || echo $OSTYPE
   ```

## Advanced Configuration

### MCP Server Configuration
After installation, configure for your IDE:

```json
{
  "mcpServers": {
    "castplan-mcp": {
      "command": "castplan-mcp",
      "args": []
    }
  }
}
```

### Performance Optimization
For better performance, enable caching:

```bash
npm config set prefer-offline true
npm config set prefer-dedupe true
```

## Development Setup

### Building from Source
```bash
git clone https://github.com/Ghostseller/CastPlan_mcp.git
cd CastPlan_mcp
npm install
npm run build
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

---

For the most up-to-date installation instructions, visit: https://github.com/Ghostseller/CastPlan_mcp