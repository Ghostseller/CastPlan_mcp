# CastPlan Automation - Python Bridge

Python bridge for the CastPlan Automation MCP Server, providing seamless installation and configuration via Python package managers.

## Overview

This Python package acts as a bridge to the Node.js-based CastPlan Automation MCP Server, enabling installation and management through Python ecosystem tools like `pip`, `uv`, and `uvx`.

## Features

- **Universal Installation**: Works with pip, uv, uvx, and other Python package managers
- **Automatic Node.js Detection**: Finds and validates Node.js installations
- **Smart Package Management**: Detects and uses available Node.js package managers (npm, yarn, pnpm)
- **Cross-Platform Support**: Windows, macOS, and Linux compatibility
- **Environment Auto-Detection**: Automatically configures Claude Desktop, Cline, Cursor, and standard MCP environments
- **Comprehensive CLI**: Full-featured command-line interface with diagnostics and troubleshooting

## Installation

### Via pip
```bash
pip install castplan-automation
```

### Via uv
```bash
uv add castplan-automation
```

### Via uvx (run without installing)
```bash
uvx castplan-automation init
```

## Quick Start

### 1. Initialize (Recommended)
```bash
castplan-mcp init
```

This will:
- Auto-detect your environment (Claude Desktop, Cline, Cursor, etc.)
- Install the Node.js package if needed
- Configure all compatible environments
- Create backups of existing configurations

### 2. Verify Installation
```bash
castplan-mcp verify
```

### 3. Manual Configuration (if needed)
```bash
# List available environments
castplan-mcp config --list-environments

# Configure specific environment
castplan-mcp config --environment claude_desktop
```

## Command Reference

### `init` - Initialize and Configure
```bash
castplan-mcp init [options]

Options:
  --auto-detect              Auto-detect and configure all environments (default: true)
  --environment <env>         Target specific environment
  --server-name <name>        Server name (default: castplan-mcp)
  --install-nodejs            Install Node.js package if missing (default: true)
  --global                    Use global installation (default: true)
  --manager <manager>         Preferred package manager (npm, yarn, pnpm)
  --backup/--no-backup        Create configuration backups (default: true)
  --dry-run                   Preview changes without applying them
```

### `config` - Manage Configurations
```bash
castplan-mcp config [options]

Options:
  --list-environments         List all available environments
  --environment <env>         Target environment to configure
  --server-name <name>        Server name (default: castplan-mcp)
  --backup/--no-backup        Create backup (default: true)
  --show-config               Display generated configuration
```

### `verify` - Test Installation
```bash
castplan-mcp verify [options]

Options:
  --environment <env>         Verify specific environment
  --all                       Verify all environments (default: true)
  --detailed                  Show detailed information
  --test-launch               Test server launch (default: true)
```

### `doctor` - Diagnose Issues
```bash
castplan-mcp doctor [options]

Options:
  --fix-permissions           Fix permission issues
  --reinstall                 Reinstall Node.js package
  --reset-config              Reset all configurations
  --fix-all                   Apply all available fixes
```

### `info` - System Information
```bash
castplan-mcp info [options]

Options:
  --json                      Output in JSON format
```

## Supported Environments

| Environment | Configuration Location | Auto-Detected |
|------------|------------------------|---------------|
| **Claude Desktop** | `%APPDATA%/Claude/claude_desktop_config.json` (Windows)<br>`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)<br>`~/.config/claude/claude_desktop_config.json` (Linux) | ✅ |
| **Standard MCP** | `~/.mcp/config.json`<br>`~/.config/mcp/config.json` | ✅ |
| **Cline** | VS Code extension storage | ✅ |
| **Cursor** | Cursor settings directory | ✅ |

## Architecture

The Python bridge consists of several key components:

### 1. NodeJSLauncher
- Detects Node.js installations
- Validates versions and compatibility
- Manages the MCP server process
- Provides cross-platform process management

### 2. NodeJSInstaller
- Detects available package managers (npm, yarn, pnpm)
- Implements intelligent fallback strategies
- Handles installation with retry logic
- Provides detailed installation feedback

### 3. ConfigurationManager
- Auto-detects MCP environment configurations
- Generates platform-specific configurations
- Handles configuration merging and backups
- Validates configuration integrity

### 4. CLI Interface
- Comprehensive command-line interface
- Rich output with progress indicators
- Error handling and user guidance
- Cross-platform compatibility

## Development

### Requirements
- Python ≥3.8
- Node.js ≥18.0.0 (installed automatically if needed)

### Installing for Development
```bash
git clone <repository-url>
cd python-bridge
pip install -e .[dev]
```

### Running Tests
```bash
pytest tests/
```

### Code Quality
```bash
# Format code
black src tests
isort src tests

# Lint code
flake8 src tests
mypy src
```

## Troubleshooting

### Common Issues

**1. Node.js Not Found**
```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js from nodejs.org
# Then re-run initialization
castplan-mcp init
```

**2. Permission Errors**
```bash
# Try fixing permissions
castplan-mcp doctor --fix-permissions

# Or run with elevated privileges (Windows)
# Or use --user flag for pip installation
```

**3. Package Manager Issues**
```bash
# Check available package managers
castplan-mcp info

# Try specific manager
castplan-mcp init --manager npm
```

**4. Configuration Not Found**
```bash
# List environments and their status
castplan-mcp config --list-environments

# Verify current configuration
castplan-mcp verify --detailed
```

### Getting Help

1. **Check Status**: `castplan-mcp info`
2. **Run Diagnostics**: `castplan-mcp doctor`
3. **Verify Installation**: `castplan-mcp verify --detailed`
4. **Reset Everything**: `castplan-mcp doctor --fix-all`

## Integration with Node.js Package

This Python bridge automatically manages the Node.js package `@castplan/automation-mcp`. The relationship is:

- **Python Package**: Provides user-friendly CLI and cross-platform installation
- **Node.js Package**: Contains the actual MCP server implementation
- **Bridge Layer**: Handles Node.js detection, package installation, and process management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run quality checks: `black`, `isort`, `flake8`, `mypy`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [docs.castplan.dev/mcp](https://docs.castplan.dev/mcp)
- **Issues**: [GitHub Issues](https://github.com/castplan/automation-mcp/issues)
- **Community**: [GitHub Discussions](https://github.com/castplan/automation-mcp/discussions)