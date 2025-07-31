# 🚀 CastPlan MCP Server

**Universal MCP Server for All LLM Clients & AI Platforms** - Works seamlessly with any MCP-compatible environment without restrictions.

[![npm version](https://badge.fury.io/js/%40castplan%2Fautomation-mcp.svg)](https://badge.fury.io/js/%40castplan%2Fautomation-mcp)
[![Python Package](https://img.shields.io/pypi/v/castplan-automation.svg)](https://pypi.org/project/castplan-automation/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cross-Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Ghostseller/CastPlan_mcp)
[![MCP Compatible](https://img.shields.io/badge/MCP-Universal%20Compatible-green)](https://modelcontextprotocol.io)

> **Truly Universal MCP Server** - Works with any MCP-compatible client: Claude Desktop, Cursor, Windsurf, VS Code, Continue.dev, Cline, Zed, and all current & future MCP implementations.

## ⭐ Why Choose CastPlan MCP?

### 🎯 **True Universal Compatibility**
- **Any MCP Client**: Works with ALL MCP-compatible environments - no restrictions or preferences
- **Future-Proof**: Compatible with existing and future MCP implementations
- **All Package Managers**: npm, yarn, pnpm, pip, uv, uvx - your choice, your way
- **All Platforms**: Windows, macOS, Linux with native optimizations

### 🔧 **Zero-Config Experience**
- **Universal Setup**: Works instantly with any MCP-compatible environment
- **No Client Dependencies**: Pure MCP implementation without client-specific code
- **One Command Install**: `castplan-mcp init` configures for all detected MCP clients

### 🏢 **Production Ready**
- **Enterprise-Grade**: Professional error handling, logging, and monitoring
- **Comprehensive CLI**: Full diagnostic tools and troubleshooting
- **Extensively Tested**: Battle-tested across multiple MCP clients and environments
- **Standard Compliant**: Follows MCP protocol specifications exactly

### 🛠️ **Core Automation Services**
- **📋 BMAD**: Business Model & Architecture Documentation
- **📚 Smart Documentation**: Automated tracking and AI-powered updates
- **🔗 Workflow Hooks**: File system watching and Git integration
- **🤖 AI Enhancement**: Intelligent analysis and recommendations

## 🎨 Feature Highlights

<details>
<summary><strong>📋 BMAD (Business Model & Architecture Documentation)</strong></summary>

- **Multi-Format Parsing**: Markdown, YAML, plain text specifications
- **Smart Task Generation**: Auto-create development tasks from requirements
- **Intelligent Assignment**: AI-powered agent matching based on capabilities
- **Dependency Management**: Automatic task validation and ordering
</details>

<details>
<summary><strong>📚 Documentation Automation</strong></summary>

- **Auto-Discovery**: Find and reference documentation automatically
- **Context-Aware Updates**: Smart documentation updates based on work context
- **Advanced Search**: Powerful documentation search and validation
- **Change Tracking**: Complete history of documentation changes
</details>

<details>
<summary><strong>🔗 Workflow Integration</strong></summary>

- **File System Watching**: Custom patterns for real-time monitoring
- **Git Hooks**: Automated documentation updates on commits
- **Event Triggers**: Flexible workflow automation
- **Multi-Channel Notifications**: Console, file, webhook support
</details>

<details>
<summary><strong>🤖 AI-Powered Features</strong></summary>

- **Document Lifecycle**: Track states from Draft → Published → Archived
- **Smart Connections**: AI relevance scoring and connection analysis
- **Quality Assessment**: Automated completeness and quality analysis
- **Visual Organization**: Hierarchical tree visualization with metadata
</details>

## 📦 Installation

**One-line installation with your preferred package manager:**

```bash
# Node.js (npm)
npm install -g @castplan/automation-mcp
castplan-mcp init

# Node.js (yarn)
yarn global add @castplan/automation-mcp
castplan-mcp init

# Node.js (pnpm)
pnpm add -g @castplan/automation-mcp
castplan-mcp init

# Python (pip)
pip install castplan-automation
castplan-mcp init

# Python (uv)
uv add castplan-automation
castplan-mcp init

# Python (uvx - run without installing)
uvx castplan-automation init
```

### 🌐 Universal Installer

**Coming Soon** - One-script installation for all platforms:

```bash
# Unix/Linux/macOS (Coming Soon)
# curl -fsSL https://install.castplan.dev | bash

# Windows (PowerShell) (Coming Soon)
# iwr -useb https://install.castplan.dev/windows | iex
```

**For now, use the package manager installation above** ⬆️

## ⚡ Quick Start (30 seconds)

### Step 1: Install & Initialize
```bash
# Choose your package manager and run:
npm install -g @castplan/automation-mcp && castplan-mcp init
# OR
pip install castplan-automation && castplan-mcp init
# OR  
uvx castplan-automation init  # No installation needed!
```

### Step 2: Verify (Optional)
```bash
castplan-mcp verify
```

### Step 3: Start Using! 🎉

**That's it!** Your universal MCP server is now:
- ✅ **Auto-detected** all MCP-compatible clients on your system
- ✅ **Auto-configured** for universal compatibility 
- ✅ **Ready to use** in any MCP-compatible environment
- ✅ **Backed up** your existing configurations safely

> **💡 Pro Tip**: Works with any current or future MCP client - no restrictions! Run `castplan-mcp --help` to see all available commands

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/Ghostseller/CastPlan_mcp.git
cd CastPlan_mcp

# Install dependencies
npm install  # or yarn install, or pnpm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## ⚙️ Configuration

### Auto-Configuration (Recommended)

CastPlan MCP automatically detects and configures:
- **Project settings** from your directory structure
- **Environment variables** with intelligent defaults
- **Universal MCP configurations** for all detected MCP-compatible clients

### Manual Configuration (Advanced)

<details>
<summary><strong>Environment Variables</strong></summary>

```bash
# Project Configuration (Auto-detected)
CASTPLAN_PROJECT_ROOT=/path/to/project    # Project root directory
CASTPLAN_DATABASE_PATH=/path/to/db        # Database file path

# Service Toggles (Default: all enabled)
CASTPLAN_ENABLE_BMAD=true                 # Business documentation
CASTPLAN_ENABLE_DOCS=true                 # Documentation automation
CASTPLAN_ENABLE_HOOKS=true                # Workflow hooks
CASTPLAN_ENABLE_ENHANCED=true             # AI-powered features

# AI Configuration (Optional)
CASTPLAN_ENABLE_AI=true                   # Enable AI features
CASTPLAN_AI_PROVIDER=openai               # openai, anthropic, local
CASTPLAN_AI_API_KEY=your_api_key          # Your API key
CASTPLAN_AI_MODEL=gpt-4                   # Model selection

# Localization (Auto-detected by default)
CASTPLAN_TIMEZONE=auto                    # Auto-detect or specify timezone
CASTPLAN_LOCALE=auto                      # Auto-detect or specify locale

# Performance & Monitoring
CASTPLAN_LOG_LEVEL=info                   # debug, info, warn, error
CASTPLAN_ENABLE_CACHE=true                # Performance caching
CASTPLAN_MAX_CONCURRENT=5                 # Concurrent operations

# File Watching
CASTPLAN_WATCH_MODE=false                 # Auto-start watching
CASTPLAN_WATCH_PATTERNS="**/*.md,**/*.ts" # Watch patterns
CASTPLAN_WATCH_IGNORED="node_modules/**"  # Ignore patterns
```
</details>

### Manual MCP Client Configuration

**⚠️ Not needed if you used `castplan-mcp init`** - this is handled automatically for all detected MCP clients!

<details>
<summary><strong>Universal MCP Configuration Template</strong></summary>

**Standard MCP configuration format (works with any MCP-compatible client):**

```json
{
  "mcpServers": {
    "castplan-mcp": {
      "command": "castplan-mcp",
      "args": ["start"],
      "env": {
        "CASTPLAN_PROJECT_ROOT": "/path/to/your/project",
        "CASTPLAN_ENABLE_AI": "true"
      }
    }
  }
}
```

**Common MCP Client Configuration Locations:**

**Claude Desktop:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

**Cursor:**
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp_config.json`
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp_config.json`
- Linux: `~/.config/cursor/User/globalStorage/mcp_config.json`

**VS Code Extensions (Continue.dev, Cline, etc.):**
- Refer to your specific extension's MCP configuration documentation
- Most use similar JSON format in extension settings or workspace configuration

**Windsurf:**
- Configuration location varies by installation
- Use same JSON format as shown above

**Zed Editor:**
- Configuration in Zed settings under MCP servers section
- Uses same command/args/env structure

> **Note**: Configuration paths may vary by version and installation. Use `castplan-mcp init` for automatic detection and setup across all supported clients.

</details>

## 🔧 Available Tools & Commands

### BMAD Tools
- `bmad_parse_specification` - Parse business specifications and generate tasks
- `bmad_update_task_status` - Update task status

### Documentation Tools
- `docs_reference` - Find relevant documentation for development work
- `docs_update` - Update documentation after completing work
- `docs_search` - Search through project documentation
- `docs_validate` - Validate documentation structure

### Hooks Tools
- `hooks_trigger` - Manually trigger hook events
- `hooks_setup_git` - Setup Git hooks
- `hooks_start_watching` - Start file system watching
- `hooks_stop_watching` - Stop file system watching

### Enhanced Documentation Tools
- `initialize_documentation_system` - Initialize the enhanced documentation system
- `track_document_work` - Track work-document relationships
- `analyze_document_quality` - Analyze document quality with AI
- `get_document_tree` - Retrieve document tree structure
- `update_document_lifecycle` - Update document lifecycle state
- `generate_documentation_report` - Generate comprehensive reports

## 📊 Available Resources

- `castplan://status` - Comprehensive system status
- `castplan://tasks` - BMAD tasks
- `castplan://agents` - Available agents
- `castplan://assignments` - Task assignments
- `castplan://documentation/history` - Documentation change history
- `castplan://hooks/events` - Hook events history
- `castplan://hooks/config` - Hooks configuration
- `castplan://document-status` - Enhanced documentation status
- `castplan://work-connections` - Work-document connections

## 💡 Usage Examples

### Initialize Documentation System
```javascript
await mcp.call_tool('initialize_documentation_system', {
  projectRoot: '/path/to/project',
  enableAI: true,
  timeZone: 'auto'  // Auto-detects user's timezone
});
```

### Parse Business Specification
```javascript
await mcp.call_tool('bmad_parse_specification', {
  content: '# Project Specification\n...',
  format: 'markdown',
  generateTasks: true,
  autoAssign: true
});
```

### Track Document Work
```javascript
await mcp.call_tool('track_document_work', {
  workType: 'backend',
  workDescription: 'Implement user authentication API',
  filePaths: ['src/auth/controller.ts', 'src/auth/service.ts'],
  expectedDocuments: ['API Documentation', 'Authentication Guide']
});
```

### Generate Documentation Report
```javascript
await mcp.call_tool('generate_documentation_report', {
  reportType: 'comprehensive',
  timeRange: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-31T23:59:59Z'
  },
  includeAI: true
});
```

## 🚀 Advanced Usage

### Development Mode
```bash
# Watch mode for development
npm run dev

# Run comprehensive tests
npm test

# Build for production
npm run build:production

# Clean build artifacts  
npm run clean
```

### CLI Commands
```bash
# Check system status
castplan-mcp status

# Run diagnostics
castplan-mcp doctor

# Configure specific client
castplan-mcp config --client claude-desktop

# Reset configuration
castplan-mcp reset --confirm
```

## 🌐 MCP Ecosystem Compatibility

CastPlan MCP is designed to work seamlessly with the entire Model Context Protocol ecosystem:

- **✅ Standard Compliant**: Follows MCP specifications exactly
- **✅ Future-Proof**: Compatible with upcoming MCP implementations  
- **✅ No Vendor Lock-in**: Works with any MCP-compatible environment
- **✅ Cross-Platform**: Runs anywhere MCP is supported

## 📞 Support & Community

### Getting Help
- 🐛 **Issues**: [GitHub Issues](https://github.com/Ghostseller/CastPlan_mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Ghostseller/CastPlan_mcp/discussions)
- 📧 **Email**: [banessayuu@gmail.com](mailto:banessayuu@gmail.com)
- 🔗 **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### License
[MIT License](LICENSE) - Free for personal and commercial use.

---

<div align="center">

**⭐ Star this repo if CastPlan MCP helps you!**

**🌍 Universal MCP Server - Works Everywhere, Restricts Nothing**

[**🚀 Get Started Now**](#-quick-start-30-seconds) • [**💬 Community**](https://github.com/Ghostseller/CastPlan_mcp/discussions) • [**📧 Contact**](mailto:banessayuu@gmail.com)

</div>