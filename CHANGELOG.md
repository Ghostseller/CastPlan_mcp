# Changelog

All notable changes to CastPlan MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-31

### 🚀 Major Release - Public Launch

This is the first public release of CastPlan MCP Server, featuring a complete rebrand from "CastPlan Ultimate" to "CastPlan MCP" for universal public availability.

### ✨ Added
- **Universal Package Manager Support**: Install via npm, yarn, pnpm, pip, uv, or uvx
- **Auto-Configuration System**: Intelligent detection and setup for all major LLM clients
  - Claude Desktop
  - Cursor AI
  - Windsurf IDE
  - VS Code MCP Extension
  - Continue.dev
  - Cline
  - Open WebUI
  - Custom MCP clients
- **Cross-Platform Compatibility**: Native support for Windows, macOS, and Linux
- **Zero-Config Experience**: Works out of the box for 90% of use cases
- **Comprehensive CLI Tools**: Full diagnostic and troubleshooting capabilities
- **Python Bridge**: Complete Python wrapper for seamless uv/uvx integration

### 🛠️ Core Features
- **BMAD Service**: Business Model & Architecture Documentation automation
- **Documentation System**: Smart tracking and AI-powered documentation updates
- **Workflow Hooks**: File system watching and Git integration
- **AI Enhancement**: Intelligent analysis and recommendations (optional)

### 📦 Installation Methods
- **Node.js**: `npm install -g @castplan/automation-mcp`
- **Python**: `pip install castplan-automation`
- **uv**: `uv add castplan-automation`
- **uvx**: `uvx castplan-automation init` (no installation needed)

### 🔧 Technical Improvements
- **TypeScript 5.3+**: Full type safety and modern TypeScript features
- **Enterprise-Grade**: Professional error handling, logging, and monitoring
- **Performance Optimized**: Efficient resource usage and caching
- **Security Enhanced**: Comprehensive security scanning and validation
- **Testing Coverage**: Extensive test suite for reliability

### 📖 Documentation
- **Comprehensive README**: Modern, user-friendly documentation
- **Detailed Installation Guide**: Step-by-step instructions for all platforms
- **Python Bridge Documentation**: Complete guide for Python users
- **Troubleshooting Guide**: Solutions for common issues

### 🌐 Universal Compatibility
- **All Package Managers**: npm, yarn, pnpm, pip, uv, uvx
- **All Platforms**: Windows (PowerShell/CMD), macOS (Terminal), Linux (Bash/Zsh)
- **All LLM Clients**: Universal MCP protocol compatibility

### 🔄 Migration from Ultimate
- **Package Name**: `@castplan/ultimate-automation-mcp` → `@castplan/automation-mcp`
- **Python Package**: `castplan-ultimate-automation` → `castplan-automation`
- **CLI Command**: `castplan-ultimate` → `castplan-mcp`
- **Clean Branding**: Removed "Ultimate" from all user-facing elements

### 🐛 Bug Fixes
- Fixed TypeScript compilation errors in test files
- Resolved Commander.js option parsing issues
- Fixed cross-platform path handling
- Corrected package manager detection logic
- Fixed Python bridge module import issues

### 🔒 Security
- Added comprehensive security scanning
- Implemented dependency vulnerability checks
- Enhanced input validation and sanitization
- Added secure configuration file handling

### ⚡ Performance
- Optimized build process for faster compilation
- Improved CLI startup time
- Enhanced file watching efficiency
- Better memory management in long-running processes

### 📱 User Experience
- **One-Command Setup**: `castplan-mcp init` handles everything
- **Smart Defaults**: Intelligent configuration based on environment
- **Backup System**: Automatic configuration backups
- **Verbose Diagnostics**: Detailed troubleshooting information

---

## Development History

This changelog represents the first public version. Previous development was conducted privately under the "CastPlan Ultimate" branding for internal testing and refinement.

### Pre-2.0.0 Development
- Internal testing and refinement (2024-2025)
- MCP protocol integration and optimization
- Multi-platform compatibility testing
- LLM client integration development
- Python bridge architecture design

---

## Upgrading

### From CastPlan Ultimate (Internal)
If you were using the internal "CastPlan Ultimate" version:

1. **Uninstall old version**:
   ```bash
   npm uninstall -g @castplan/ultimate-automation-mcp
   # or
   pip uninstall castplan-ultimate-automation
   ```

2. **Install new version**:
   ```bash
   npm install -g @castplan/automation-mcp
   # or
   pip install castplan-automation
   ```

3. **Reinitialize**:
   ```bash
   castplan-mcp init
   ```

### Fresh Installation
For new users, simply follow the [Installation Guide](INSTALLATION.md).

---

## Support

- **Documentation**: [README.md](README.md) | [Installation Guide](INSTALLATION.md)
- **Issues**: [GitHub Issues](https://github.com/castplan/automation-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/castplan/automation-mcp/discussions)
- **Email**: [support@castplan.dev](mailto:support@castplan.dev)

---

**🚀 Thank you for using CastPlan MCP Server!**