# 🚀 CastPlan MCP: Your AI Coding Assistant's Missing Memory

**Turn your AI into a project-aware coding partner** - CastPlan MCP gives Claude, Cursor, and other AI assistants the ability to understand, track, and help manage your entire development workflow.

[![npm version](https://badge.fury.io/js/%40castplan%2Fautomation-mcp.svg)](https://badge.fury.io/js/%40castplan%2Fautomation-mcp)
[![Python Package](https://img.shields.io/pypi/v/castplan-automation.svg)](https://pypi.org/project/castplan-automation/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cross-Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Ghostseller/CastPlan_mcp)
[![MCP Compatible](https://img.shields.io/badge/MCP-Universal%20Compatible-green)](https://modelcontextprotocol.io)

> **Stop explaining your project to AI every time** - CastPlan MCP remembers your architecture, tracks your progress, and helps your AI assistant provide context-aware coding help.

## 🤔 The Problem: AI That Forgets Your Project

**Ever felt frustrated repeating yourself to AI assistants?**

```
You: "Help me add a new user endpoint to my REST API"
AI: "Sure! What's your tech stack? What's your current architecture? 
     Where are your routes defined? What's your authentication system?"
You: "Ugh, I explained this yesterday..." 😤
```

**CastPlan MCP solves this forever.**

## ✨ What CastPlan MCP Actually Does for You

### 🧠 **Your AI Remembers Everything**
- **Project Architecture**: AI knows your file structure, patterns, and conventions
- **Development History**: Tracks what you've built, changed, and why
- **Team Context**: Understands your workflow, documentation standards, and processes
- **Technical Decisions**: Remembers your choices and helps maintain consistency

### 📈 **Real Coding Benefits**

#### 🎯 **Context-Aware Code Suggestions**
```
Before: "Create a user service"
AI: "Here's a generic user service template..."

After: "Create a user service" 
AI: "Based on your existing AuthService and ProductService patterns, 
     here's a UserService that follows your dependency injection 
     setup and validation middleware..."
```

#### 📚 **Automatic Documentation Updates**
```
You: "I just refactored the payment module"
AI: "I see you moved PaymentProcessor.ts and updated the interfaces. 
     I'll update your README, API docs, and team wiki to reflect 
     the new structure."
```

#### 🔗 **Smart Task Management**
```
You: "We need to add OAuth integration"
AI: "I'll break this down based on your architecture:
     1. Update AuthController (follows your existing auth pattern)
     2. Add OAuth middleware (matches your middleware structure)  
     3. Update user docs (your team wiki format)
     4. Write tests (using your Jest setup)"
```

## 🎪 **Live Demo: See It In Action**

### Scenario: Adding a New Feature

**🚫 Without CastPlan MCP:**
```
You: "Help me add user profiles"
AI: "What framework are you using?"
You: "React with TypeScript"
AI: "Where do you keep components?"
You: "src/components"
AI: "What's your state management?"
You: "Redux Toolkit"
AI: [Finally gives generic advice]
```

**✅ With CastPlan MCP:**
```
You: "Help me add user profiles"
AI: "I see you're using React + TypeScript with Redux Toolkit. 
     Based on your existing UserCard and ProfileCard components, 
     I'll create a UserProfile component that matches your 
     design system. I'll also update your userSlice following 
     your established patterns and add it to your main navigation."
```

### Scenario: Bug Fixing

**🚫 Without CastPlan MCP:**
```
You: "There's a bug in authentication"
AI: "Can you show me your auth code?"
You: [Pastes 200 lines]
AI: "What's the error?"
You: [Explains context]
AI: [Generic debugging advice]
```

**✅ With CastPlan MCP:**
```
You: "There's a bug in authentication"
AI: "I can see your AuthService implementation. Looking at 
     recent changes, I notice the JWT validation was modified 
     2 days ago. The issue is likely in line 45 where the 
     token expiration check changed. Here's the fix that 
     maintains your error handling pattern..."
```

## 🛠️ Core Features That Transform Your Coding

### 📋 **Smart Project Planning (BMAD)**
**What it does:** Turns your project ideas into actionable development plans

**How it helps your AI:**
```
You: "I want to build a todo app with user auth"
AI: "I've analyzed your requirements and created a development plan:
     
     🏗️ Architecture: React frontend + Node.js API + PostgreSQL
     📝 Tasks Generated:
     1. Setup user authentication system
     2. Create todo CRUD operations  
     3. Build responsive UI components
     4. Add real-time notifications
     
     Each task includes specific acceptance criteria and 
     connects to your existing code patterns."
```

### 📚 **Living Documentation System**
**What it does:** Keeps your docs in sync with your code automatically

**How it helps your AI:**
```
You: "I modified the API endpoints"
AI: "I've detected changes in your routes:
     ✅ Updated API documentation
     ✅ Refreshed README examples  
     ✅ Added new endpoints to Postman collection
     ✅ Updated team wiki with breaking changes
     
     Your documentation is now in sync with code!"
```

### 🔗 **Workflow Intelligence**
**What it does:** Watches your development patterns and automates repetitive tasks

**How it helps your AI:**
```
You: [Commits code with "fix: payment bug"]
AI: "I noticed you fixed a payment issue. Based on your 
     workflow patterns, I've:
     🔄 Generated a hotfix release notes
     📧 Drafted incident report for the team
     🧪 Suggested regression tests to add
     📋 Updated the payment module documentation"
```

### 🤖 **Code Intelligence & Quality**
**What it does:** AI-powered code analysis that understands your project's context

**How it helps your AI:**
```
You: "Review this component for best practices"
AI: "Analyzing against your project standards:
     
     ✅ Follows your component naming convention
     ✅ Uses your established prop patterns
     ⚠️  Missing error boundary (your other components have them)
     ⚠️  Consider adding to your Storybook (matches your docs pattern)
     
     Here's the updated component with your standards applied..."
```

## 🚀 Quick Start (2 Minutes)

### Step 1: Install CastPlan MCP
```bash
# Choose your preferred package manager:
npm install -g @castplan/automation-mcp
# OR
pip install castplan-automation
# OR (no installation needed)
uvx castplan-automation init
```

### Step 2: Connect to Your AI Assistant
```bash
castplan-mcp init
```
This automatically configures CastPlan MCP with your AI assistant (Claude Desktop, Cursor, VS Code, etc.)

### Step 3: Start Coding with Context!
Open your AI assistant and try:
```
"Analyze my project structure and suggest improvements"
```

**That's it!** Your AI now understands your project and can provide contextual help.

## 🎯 Real Developer Stories

### 👨‍💻 **Frontend Developer - Sarah**
*"Before CastPlan MCP, I was constantly explaining my component library structure to Claude. Now it knows my design system patterns and suggests components that actually match my existing code style."*

**Sarah's workflow:**
```
Sarah: "Create a loading spinner component"
AI: "Based on your existing Button and Modal components, here's a LoadingSpinner 
     that uses your theme tokens, follows your TypeScript patterns, and includes 
     the accessibility features you use in other components."
```

### 🔧 **Backend Developer - Mike**
*"I work on microservices. CastPlan MCP tracks each service's patterns and helps the AI understand the relationships between them."*

**Mike's workflow:**
```
Mike: "I need to add a new endpoint to the user service"
AI: "I see your user service uses Express with JWT middleware and follows 
     RESTful patterns. I'll create the endpoint that matches your existing 
     structure, includes your standard error handling, and updates your 
     OpenAPI documentation."
```

### 🎨 **Full-Stack Developer - Alex**
*"Managing documentation was a nightmare. Now when I change code, my AI automatically updates the docs to match."*

**Alex's workflow:**
```
Alex: [Refactors API response structure]
AI: "I noticed you changed the user object structure. I've updated:
     ✅ Frontend TypeScript interfaces
     ✅ API documentation  
     ✅ Database migration scripts
     ✅ Test fixtures"
```

## 💡 Common Use Cases

### 🏗️ **Starting New Projects**
```
You: "Help me set up a new React TypeScript project with authentication"
AI: "I'll create a project structure following your established patterns:
     - Uses your preferred Vite + TypeScript setup  
     - Includes your standard ESLint/Prettier config
     - Sets up authentication with JWT (matching your other projects)
     - Adds your typical folder structure (components, hooks, utils)
     - Includes your standard testing setup with React Testing Library"
```

### 🔧 **Debugging & Maintenance**
```
You: "The login isn't working after my recent changes"  
AI: "Looking at your recent commits, I see you updated the AuthContext.
     The issue is in UserContext.tsx line 34 - the token validation
     changed but the error handling wasn't updated. Here's the fix
     that maintains your existing error message patterns."
```

### 📈 **Scaling & Refactoring**
```
You: "This component is getting too large, help me break it down"
AI: "Based on your existing patterns, I'll split this into:
     - UserProfileHeader (following your header component pattern)
     - UserProfileForm (matches your form validation approach)  
     - UserProfileActions (uses your action button patterns)
     
     Each will use your established props patterns and TypeScript interfaces."
```

### 👥 **Team Collaboration**
```
You: "A new developer is joining, create onboarding docs"
AI: "I've analyzed your codebase and created onboarding documentation:
     ✅ Architecture overview with your specific patterns
     ✅ Development workflow guide (your Git conventions)
     ✅ Code style guide (extracted from your existing code)
     ✅ Common commands and scripts you actually use
     ✅ Project-specific gotchas and best practices"
```

## 🤖 Works With Your Favorite AI Assistants

CastPlan MCP is compatible with **any MCP-supported AI environment**:

### ✅ **Fully Supported**
- **Claude Desktop** - Native integration, zero configuration
- **Cursor** - Perfect for VS Code developers  
- **Windsurf** - Advanced coding assistance
- **VS Code Extensions** - Continue.dev, Cline, and others
- **Zed Editor** - Lightning-fast development

### ✅ **Future-Proof**
- **Any MCP-compatible client** - Works automatically
- **New AI tools** - Compatible as they adopt MCP standard

### 🔧 **Setup**
```bash
castplan-mcp init
```
This single command detects and configures all your AI assistants automatically.

## 🛠️ Advanced Configuration

<details>
<summary><strong>🎛️ Customize CastPlan MCP Behavior</strong></summary>

```bash
# Enable specific features only
CASTPLAN_ENABLE_DOCS=true        # Documentation tracking
CASTPLAN_ENABLE_PLANNING=true    # Project planning (BMAD)
CASTPLAN_ENABLE_WORKFLOWS=true   # Workflow automation  
CASTPLAN_ENABLE_AI_ANALYSIS=true # AI-powered insights

# Performance tuning
CASTPLAN_WATCH_MODE=true         # Monitor file changes in real-time
CASTPLAN_MAX_CONCURRENT=3        # Number of parallel operations
CASTPLAN_CACHE_ENABLED=true      # Cache project analysis for speed

# Privacy & Security
CASTPLAN_LOCAL_ONLY=true         # Never send data externally
CASTPLAN_AI_PROVIDER=local       # Use local AI models only
```
</details>

## 🔍 **Technical Details**

<details>
<summary><strong>🔧 Available Commands & Tools</strong></summary>

**Project Planning:**
- `bmad_parse_specification` - Turn requirements into development tasks
- `bmad_update_task_status` - Track project progress

**Documentation Management:**
- `docs_reference` - Find relevant docs for your work
- `docs_update` - Keep documentation in sync with code
- `docs_search` - Search project documentation
- `analyze_document_quality` - AI-powered doc quality analysis

**Workflow Automation:**
- `hooks_setup_git` - Automate Git workflow integration
- `hooks_start_watching` - Monitor files for changes
- `track_document_work` - Connect code changes to documentation

**System Monitoring:**
- `castplan://status` - Check system health
- `castplan://tasks` - View active project tasks
- `castplan://documentation/history` - Track documentation changes

</details>

<details>
<summary><strong>⚙️ Manual Configuration (Advanced Users)</strong></summary>

**Standard MCP Configuration:**
```json
{
  "mcpServers": {
    "castplan-mcp": {
      "command": "castplan-mcp",
      "args": ["start"],
      "env": {
        "CASTPLAN_PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

**Configuration Files:**
- Claude Desktop: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- Cursor: User settings → MCP servers
- VS Code: Extension-specific configuration

> **💡 Tip**: Use `castplan-mcp init` instead - it handles all this automatically!

</details>

## 🙋‍♂️ **FAQ**

<details>
<summary><strong>❓ How is this different from GitHub Copilot?</strong></summary>

**GitHub Copilot** suggests code based on general patterns.

**CastPlan MCP** gives your AI assistant memory of YOUR specific project:
- Knows your existing code patterns and conventions
- Tracks your project's evolution over time  
- Understands relationships between your files
- Maintains context about your team's decisions

Think of Copilot as "smart autocomplete" and CastPlan MCP as "project memory for AI."

</details>

<details>
<summary><strong>❓ Does this send my code to external servers?</strong></summary>

**No!** CastPlan MCP runs locally on your machine. Your code never leaves your computer unless you explicitly configure it to use external AI services (which is optional).

By default, it only provides context to your local AI assistant.

</details>

<details>
<summary><strong>❓ Will this slow down my AI assistant?</strong></summary>

**No!** CastPlan MCP is designed for speed:
- Intelligent caching keeps responses fast
- Only loads relevant context for each query
- Runs in the background without interrupting your workflow
- Most operations complete in milliseconds

</details>

<details>
<summary><strong>❓ What if I work on multiple projects?</strong></summary>

CastPlan MCP automatically detects which project you're working on and provides the right context. Each project maintains its own separate memory and configuration.

</details>

## 🚀 **Ready to Transform Your AI Coding Experience?**

```bash
# Install CastPlan MCP in 30 seconds
npm install -g @castplan/automation-mcp
castplan-mcp init

# Start getting contextual AI help immediately  
```

## 📞 **Support & Community**

- 🐛 **Found a bug?** [Report it here](https://github.com/Ghostseller/CastPlan_mcp/issues)
- 💬 **Questions?** [Join the discussion](https://github.com/Ghostseller/CastPlan_mcp/discussions)  
- 📧 **Need help?** [banessayuu@gmail.com](mailto:banessayuu@gmail.com)

---

<div align="center">

### **⭐ Give CastPlan MCP a star if it makes your coding life easier!**

**🧠 Stop explaining your project to AI every time**

[**🚀 Install Now**](#-quick-start-2-minutes) • [**💬 Discuss**](https://github.com/Ghostseller/CastPlan_mcp/discussions) • [**📧 Contact**](mailto:banessayuu@gmail.com)

*Built with ❤️ for developers who want smarter AI assistance*

</div>