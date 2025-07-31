# 📦 CastPlan MCP - Installation Guide

**Complete installation guide for CastPlan MCP Server** - Universal support for all package managers, platforms, and LLM clients.

[![npm version](https://badge.fury.io/js/%40castplan%2Fautomation-mcp.svg)](https://badge.fury.io/js/%40castplan%2Fautomation-mcp)
[![Python Package](https://img.shields.io/pypi/v/castplan-automation.svg)](https://pypi.org/project/castplan-automation/)
[![Cross-Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/castplan/automation-mcp)

## 🤖 Supported LLM Clients

CastPlan MCP **automatically detects and configures** all major LLM clients:

| Client | Auto-Detection | Configuration | Status |
|--------|---------------|---------------|---------|
| **Claude Desktop** | ✅ | ✅ | Production Ready |
| **Cursor AI** | ✅ | ✅ | Production Ready |
| **Windsurf IDE** | ✅ | ✅ | Production Ready |
| **VS Code MCP** | ✅ | ✅ | Production Ready |
| **Continue.dev** | ✅ | ✅ | Production Ready |
| **Cline** | ✅ | ✅ | Production Ready |
| **Open WebUI** | ✅ | ✅ | Beta |
| **Custom MCP** | ✅ | ✅ | Universal Support |

## 🚀 Quick Installation (30 seconds)

### Option 1: Node.js Package Managers

```bash
# npm (Most Popular)
npm install -g @castplan/automation-mcp
castplan-mcp init

# yarn
yarn global add @castplan/automation-mcp
castplan-mcp init

# pnpm (Fastest)
pnpm add -g @castplan/automation-mcp
castplan-mcp init
```

### Option 2: Python Package Managers

```bash
# pip (Traditional)
pip install castplan-automation
castplan-mcp init

# uv (Ultra-fast)
uv add castplan-automation
castplan-mcp init

# uvx (No installation needed!)
uvx castplan-automation init
```

> **💡 Recommended**: Use `uvx` if you want to try CastPlan MCP without installing anything!

## 📋 Prerequisites

### Required
- **Node.js**: Version 18.0.0 or higher ([Download](https://nodejs.org/))

### Optional (Auto-installed if needed)
- **Python**: Version 3.8+ (for uv/uvx support)
- **Package Managers**: npm/yarn/pnpm/pip/uv/uvx

## 🎯 Step-by-Step Installation

### 1. Choose Your Installation Method

<details>
<summary><strong>📦 Node.js Installation (Recommended)</strong></summary>

**Most stable and feature-complete option**

```bash
# Check if Node.js is installed
node --version  # Should be 18.0.0+

# Install globally with npm
npm install -g @castplan/automation-mcp

# Or with yarn
yarn global add @castplan/automation-mcp

# Or with pnpm (fastest)
pnpm add -g @castplan/automation-mcp
```

**Benefits:**
- ✅ Full feature support
- ✅ Best performance
- ✅ Native TypeScript support
- ✅ Comprehensive CLI tools
</details>

<details>
<summary><strong>🐍 Python Installation (Universal)</strong></summary>

**Great for Python users and uv/uvx compatibility**

```bash
# Traditional pip
pip install castplan-automation

# Modern uv (ultra-fast)
uv add castplan-automation

# No-install with uvx
uvx castplan-automation init
```

**Benefits:**
- ✅ Works with Python ecosystem
- ✅ Ultra-fast with uv/uvx
- ✅ No Node.js knowledge required
- ✅ Cross-platform compatibility
</details>

### 2. Initialize CastPlan MCP

```bash
# Navigate to your project (optional)
cd /path/to/your/project

# Initialize (auto-configures everything)
castplan-mcp init

# Or with options
castplan-mcp init --force --ai --backup
```

**What happens during initialization:**
- 🔍 **Auto-detects** your LLM clients (Claude Desktop, Cursor, etc.)
- ⚙️ **Configures** all compatible environments automatically
- 💾 **Creates backups** of existing configurations
- 🧪 **Tests installation** to ensure everything works
- 📝 **Generates configs** with intelligent defaults

### 3. Verify Installation

```bash
# Check status
castplan-mcp status

# Verify installation
castplan-mcp verify

# Run diagnostics
castplan-mcp doctor
```

## 🔧 Advanced Installation Options

### Project-Specific Installation

```bash
# Install in current project only
npm install @castplan/automation-mcp  # Local installation
# or
pip install --user castplan-automation

# Initialize for this project
npx @castplan/automation-mcp init
# or  
uvx castplan-automation init
```

### Development Installation

```bash
# Clone from source
git clone https://github.com/castplan/automation-mcp.git
cd automation-mcp

# Install dependencies
npm install  # or yarn, pnpm

# Build from source
npm run build

# Link globally for development
npm link
```

## 🌍 Platform-Specific Instructions

### Windows

```powershell
# PowerShell (Administrator recommended)
npm install -g @castplan/automation-mcp
castplan-mcp init

# Alternative: Python via Windows Store
pip install castplan-automation
castplan-mcp init

# Alternative: uv (if Python installed)
uvx castplan-automation init
```

**Windows-specific notes:**
- Run PowerShell as Administrator for global installs
- Windows Defender might scan the installation (normal)
- Config location: `%APPDATA%\Claude\claude_desktop_config.json`

### macOS

```bash
# Terminal
npm install -g @castplan/automation-mcp
castplan-mcp init

# Alternative: Homebrew + uv
brew install uv
uvx castplan-automation init

# Alternative: yarn
yarn global add @castplan/automation-mcp
castplan-mcp init
```

**macOS-specific notes:**
- Use `sudo` if permission errors occur
- Config location: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Works with Apple Silicon (M1/M2/M3) and Intel

### Linux

```bash
# Ubuntu/Debian
sudo npm install -g @castplan/automation-mcp
castplan-mcp init

# Alternative: uv (recommended for Python users)
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx castplan-automation init

# Alternative: pnpm
pnpm add -g @castplan/automation-mcp
castplan-mcp init
```

**Linux-specific notes:**
- Use `sudo` for global npm installs, or configure npm prefix
- Config location: `~/.config/claude/claude_desktop_config.json`
- Supports all major distributions

## ⚙️ Configuration Options

### Automatic Configuration (Default)

CastPlan MCP automatically configures:
- All detected LLM clients
- Project-specific environment variables
- Intelligent service defaults
- Backup strategies

### Manual Configuration

```bash
# Configure specific client
castplan-mcp config --client claude-desktop

# List available clients
castplan-mcp config --list-clients

# Configure with custom settings
castplan-mcp config --client cursor --server-name my-castplan

# Show current configuration
castplan-mcp config --show
```

### Environment Variables

CastPlan MCP auto-generates project-specific variables:

```bash
# Example for project "my-app"
MYAPP_PROJECT_ROOT=/path/to/project
MYAPP_ENABLE_BMAD=true
MYAPP_ENABLE_DOCS=true
MYAPP_ENABLE_HOOKS=true
MYAPP_ENABLE_AI=true
```

## 🔧 CLI Commands Reference

### Essential Commands
```bash
castplan-mcp init              # Initialize and configure
castplan-mcp status           # Show system status
castplan-mcp verify           # Verify installation
castplan-mcp doctor           # Diagnose issues
```

### Configuration Commands
```bash
castplan-mcp config --list-clients     # List available clients
castplan-mcp config --client <name>    # Configure specific client
castplan-mcp config --show             # Show current config
castplan-mcp reset --confirm           # Reset all configurations
```

### Maintenance Commands
```bash
castplan-mcp update           # Update to latest version
castplan-mcp backup           # Create configuration backup
castplan-mcp restore          # Restore from backup
castplan-mcp clean            # Clean cache and temp files
```

## 🚨 Troubleshooting

### Common Issues

<details>
<summary><strong>❌ "Node.js not found" Error</strong></summary>

**Solution:**
```bash
# Check if Node.js is installed
node --version

# If not installed, download from https://nodejs.org/
# Or use package manager:
# Windows: winget install OpenJS.NodeJS
# macOS: brew install node
# Linux: sudo apt install nodejs npm (Ubuntu/Debian)

# Then reinstall CastPlan MCP
npm install -g @castplan/automation-mcp
```
</details>

<details>
<summary><strong>❌ Permission Errors (EACCES)</strong></summary>

**Solution:**
```bash
# Option 1: Use uv/uvx (no permissions needed)
uvx castplan-automation init

# Option 2: Configure npm prefix (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 3: Use sudo (not recommended)
sudo npm install -g @castplan/automation-mcp
```
</details>

<details>
<summary><strong>❌ "Command not found" after installation</strong></summary>

**Solution:**
```bash
# Check if binary is in PATH
which castplan-mcp

# If not found, check installation location
npm list -g @castplan/automation-mcp

# Add to PATH or use full path
export PATH="$(npm config get prefix)/bin:$PATH"

# Or reinstall with uvx
uvx castplan-automation init
```
</details>

<details>
<summary><strong>❌ LLM Client Not Detected</strong></summary>

**Solution:**
```bash
# Run diagnostics
castplan-mcp doctor

# List available clients
castplan-mcp config --list-clients

# Force configuration for specific client
castplan-mcp config --client claude-desktop --force

# Check client installation paths
castplan-mcp verify --detailed
```
</details>

<details>
<summary><strong>❌ Build or Runtime Errors</strong></summary>

**Solution:**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install -g @castplan/automation-mcp

# Or use uv/uvx for clean installation
uvx install --force castplan-automation

# Run diagnostics
castplan-mcp doctor --fix-all
```
</details>

### Getting Help

If you're still having issues:

1. **Run Diagnostics**: `castplan-mcp doctor --verbose`
2. **Check Logs**: `castplan-mcp logs --tail`
3. **Verify System**: `castplan-mcp verify --detailed`
4. **Reset Config**: `castplan-mcp reset --confirm`

## 🔄 Uninstallation

### Remove CastPlan MCP

```bash
# npm
npm uninstall -g @castplan/automation-mcp

# yarn
yarn global remove @castplan/automation-mcp

# pnpm
pnpm remove -g @castplan/automation-mcp

# pip
pip uninstall castplan-automation

# uv
uv tool uninstall castplan-automation
```

### Clean Up Configuration Files

```bash
# Remove project configurations (optional)
rm -rf .castplan/
rm castplan.config.json

# Remove LLM client configurations (optional)
castplan-mcp config --remove-all --confirm
```

## 🎉 Next Steps

After successful installation:

1. **✅ Restart your LLM clients** (Claude Desktop, Cursor, etc.)
2. **🗣️ Start using CastPlan MCP** in your AI conversations
3. **📖 Check out the [User Guide](README.md)** for usage examples
4. **💬 Join our [Community](https://github.com/castplan/automation-mcp/discussions)**

---

<div align="center">

**🚀 Ready to boost your AI workflow?**

[**📖 User Guide**](README.md) • [**💬 Community**](https://github.com/castplan/automation-mcp/discussions) • [**🐛 Report Issues**](https://github.com/castplan/automation-mcp/issues)

</div>