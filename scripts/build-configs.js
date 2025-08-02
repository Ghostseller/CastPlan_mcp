#!/usr/bin/env node

/**
 * Configuration Build Script
 * 
 * Generates configuration templates and setup scripts for universal packaging.
 * Creates installation templates for different environments and package managers.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function buildConfigs() {
  console.log('🔧 Building configuration templates...');

  const configsDir = path.join(projectRoot, 'configs');
  await fs.mkdir(configsDir, { recursive: true });

  // Claude Desktop configuration template
  const claudeDesktopTemplate = {
    mcpServers: {
      "castplan-ultimate": {
        command: "{{NODE_PATH}}",
        args: ["{{PACKAGE_PATH}}/dist/index.js"],
        env: {
          NODE_ENV: "production",
          CASTPLAN_LOG_LEVEL: "info"
        }
      }
    }
  };

  await fs.writeFile(
    path.join(configsDir, 'claude-desktop-template.json'),
    JSON.stringify(claudeDesktopTemplate, null, 2)
  );

  // Standard MCP configuration template
  const standardMCPTemplate = {
    servers: {
      "castplan-ultimate": {
        command: "{{NODE_PATH}}",
        args: ["{{PACKAGE_PATH}}/dist/index.js"],
        env: {
          NODE_ENV: "production",
          CASTPLAN_LOG_LEVEL: "info"
        }
      }
    },
    logging: {
      level: "info",
      file: "{{HOME_PATH}}/.mcp/logs/castplan-ultimate.log"
    }
  };

  await fs.writeFile(
    path.join(configsDir, 'standard-mcp-template.json'),
    JSON.stringify(standardMCPTemplate, null, 2)
  );

  // Package.json template for Python bridge
  const pythonPackageTemplate = {
    name: "castplan-ultimate-automation",
    version: "2.0.0",
    description: "Python bridge for CastPlan Ultimate Automation MCP Server",
    main: "src/castplan_ultimate_automation/__init__.py",
    scripts: {
      install: "python -m pip install .",
      test: "python -m pytest tests/",
      build: "python -m build"
    },
    dependencies: {
      "@castplan/ultimate-automation-mcp": "^2.0.0"
    }
  };

  await fs.writeFile(
    path.join(configsDir, 'python-package-template.json'),
    JSON.stringify(pythonPackageTemplate, null, 2)
  );

  // Universal installer script template
  const universalInstallerTemplate = `#!/usr/bin/env node

/**
 * Universal Installer Script
 * Auto-detects package managers and installs CastPlan Ultimate Automation
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function detectPackageManager() {
  const managers = ['npm', 'yarn', 'pnpm', 'pip', 'uv'];
  
  for (const manager of managers) {
    try {
      execSync(\`\${manager} --version\`, { stdio: 'ignore' });
      return manager;
    } catch {
      continue;
    }
  }
  
  throw new Error('No supported package manager found');
}

async function install() {
  try {
    const manager = await detectPackageManager();
    console.log(\`Using \${manager} for installation...\`);
    
    let command;
    if (manager === 'npm') {
      command = 'npm install -g @castplan/ultimate-automation-mcp';
    } else if (manager === 'yarn') {
      command = 'yarn global add @castplan/ultimate-automation-mcp';
    } else if (manager === 'pnpm') {
      command = 'pnpm add -g @castplan/ultimate-automation-mcp';
    } else if (manager === 'pip') {
      command = 'pip install castplan-ultimate-automation';
    } else if (manager === 'uv') {
      command = 'uv add castplan-ultimate-automation';
    }
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Installation complete!');
    console.log('Run "castplan-ultimate init" to configure.');
    
  } catch (error) {
    console.error(\`❌ Installation failed: \${error.message}\`);
    process.exit(1);
  }
}

install();
`;

  await fs.writeFile(
    path.join(configsDir, 'universal-installer.js'),
    universalInstallerTemplate
  );

  // PowerShell installer for Windows
  const powershellInstaller = `# CastPlan Ultimate Automation - Windows Installer
# Auto-detects package managers and installs

$ErrorActionPreference = "Stop"

function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Install-CastPlan {
    Write-Host "🚀 CastPlan Ultimate Automation - Universal Installer" -ForegroundColor Blue
    
    # Check for Node.js package managers
    if (Test-Command "npm") {
        Write-Host "📦 Installing via npm..." -ForegroundColor Green
        npm install -g @castplan/ultimate-automation-mcp
        npm run -g @castplan/ultimate-automation-mcp init
    }
    elseif (Test-Command "yarn") {
        Write-Host "📦 Installing via yarn..." -ForegroundColor Green
        yarn global add @castplan/ultimate-automation-mcp
        yarn global run castplan-ultimate init
    }
    elseif (Test-Command "pnpm") {
        Write-Host "📦 Installing via pnpm..." -ForegroundColor Green
        pnpm add -g @castplan/ultimate-automation-mcp
        pnpm run castplan-ultimate init
    }
    # Check for Python package managers
    elseif (Test-Command "pip") {
        Write-Host "📦 Installing via pip..." -ForegroundColor Green
        pip install castplan-ultimate-automation
        castplan-ultimate init
    }
    elseif (Test-Command "uv") {
        Write-Host "📦 Installing via uv..." -ForegroundColor Green
        uv add castplan-ultimate-automation
        castplan-ultimate init
    }
    else {
        Write-Host "❌ No supported package manager found!" -ForegroundColor Red
        Write-Host "Please install Node.js (npm) or Python (pip) first." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Installation complete!" -ForegroundColor Green
    Write-Host "Run 'castplan-ultimate verify' to test the installation." -ForegroundColor Cyan
}

Install-CastPlan
`;

  await fs.writeFile(
    path.join(configsDir, 'install-windows.ps1'),
    powershellInstaller
  );

  // Bash installer for Unix systems
  const bashInstaller = `#!/bin/bash

# CastPlan Ultimate Automation - Unix Installer
# Auto-detects package managers and installs

set -e

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

install_castplan() {
    echo "🚀 CastPlan Ultimate Automation - Universal Installer"
    
    # Check for Node.js package managers
    if command_exists npm; then
        echo "📦 Installing via npm..."
        npm install -g @castplan/ultimate-automation-mcp
        castplan-ultimate init
    elif command_exists yarn; then
        echo "📦 Installing via yarn..."
        yarn global add @castplan/ultimate-automation-mcp
        castplan-ultimate init
    elif command_exists pnpm; then
        echo "📦 Installing via pnpm..."
        pnpm add -g @castplan/ultimate-automation-mcp
        castplan-ultimate init
    # Check for Python package managers
    elif command_exists pip3; then
        echo "📦 Installing via pip3..."
        pip3 install castplan-ultimate-automation
        castplan-ultimate init
    elif command_exists pip; then
        echo "📦 Installing via pip..."
        pip install castplan-ultimate-automation
        castplan-ultimate init
    elif command_exists uv; then
        echo "📦 Installing via uv..."
        uv add castplan-ultimate-automation
        castplan-ultimate init
    else
        echo "❌ No supported package manager found!"
        echo "Please install Node.js (npm) or Python (pip) first."
        exit 1
    fi
    
    echo "✅ Installation complete!"
    echo "Run 'castplan-ultimate verify' to test the installation."
}

install_castplan
`;

  await fs.writeFile(
    path.join(configsDir, 'install-unix.sh'),
    bashInstaller
  );

  // Make shell scripts executable
  try {
    await fs.chmod(path.join(configsDir, 'install-unix.sh'), 0o755);
    await fs.chmod(path.join(configsDir, 'universal-installer.js'), 0o755);
  } catch (error) {
    console.warn('Warning: Could not set executable permissions:', error.message);
  }

  // Create installation verification test
  const verificationTest = `#!/usr/bin/env node

/**
 * Installation Verification Test
 * Comprehensive testing framework for universal packaging
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

class InstallationTester {
  constructor() {
    this.results = {
      platform: os.platform(),
      arch: os.arch(),
      node: process.version,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
  }

  async runTest(name, testFn, skipCondition = false) {
    this.results.summary.total++;
    
    if (skipCondition) {
      this.results.tests.push({
        name,
        status: 'skipped',
        reason: 'Condition not met'
      });
      this.results.summary.skipped++;
      console.log(\`⏭️  \${name} (skipped)\`);
      return;
    }

    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'passed',
        duration
      });
      this.results.summary.passed++;
      console.log(\`✅ \${name} (\${duration}ms)\`);
      
    } catch (error) {
      this.results.tests.push({
        name,
        status: 'failed',
        error: error.message
      });
      this.results.summary.failed++;
      console.log(\`❌ \${name}: \${error.message}\`);
    }
  }

  async commandExists(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version'], { 
        stdio: 'ignore' 
      });
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  async testPackageManagerDetection() {
    const managers = ['npm', 'yarn', 'pnpm', 'pip', 'uv'];
    const detected = [];
    
    for (const manager of managers) {
      if (await this.commandExists(manager)) {
        detected.push(manager);
      }
    }
    
    if (detected.length === 0) {
      throw new Error('No package managers detected');
    }
    
    console.log(\`   Detected: \${detected.join(', ')}\`);
  }

  async testNodeJSInstallation() {
    const hasNode = await this.commandExists('node');
    if (!hasNode) {
      throw new Error('Node.js not found');
    }
    
    console.log(\`   Node.js: \${process.version}\`);
  }

  async testPythonInstallation() {
    const hasPython = await this.commandExists('python') || 
                     await this.commandExists('python3');
    if (!hasPython) {
      throw new Error('Python not found');
    }
    
    console.log('   Python: Available');
  }

  async testPackageInstallation() {
    // This would test actual package installation
    // Skipped in demo to avoid modifying system
    throw new Error('Package installation test not implemented in demo');
  }

  async testConfigurationGeneration() {
    const { UniversalMCPConfigGenerator } = await import('../dist/config/UniversalMCPConfigGenerator.js');
    
    const generator = new UniversalMCPConfigGenerator();
    const locations = await generator.detectConfigLocations();
    
    if (locations.length === 0) {
      throw new Error('No configuration locations detected');
    }
    
    console.log(\`   Found \${locations.length} potential configuration locations\`);
  }

  async testCLICommands() {
    const cliPath = path.resolve('./dist/cli.js');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, '--help'], {
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.includes('castplan-ultimate')) {
          console.log('   CLI help command working');
          resolve();
        } else {
          reject(new Error('CLI help command failed'));
        }
      });
      
      child.on('error', reject);
    });
  }

  async run() {
    console.log('🧪 Running Installation Verification Tests\\n');
    
    await this.runTest(
      'Package Manager Detection',
      () => this.testPackageManagerDetection()
    );
    
    await this.runTest(
      'Node.js Installation',
      () => this.testNodeJSInstallation()
    );
    
    await this.runTest(
      'Python Installation',
      () => this.testPythonInstallation(),
      os.platform() === 'win32' // Skip on Windows for demo
    );
    
    await this.runTest(
      'Configuration Generation',
      () => this.testConfigurationGeneration()
    );
    
    await this.runTest(
      'CLI Commands',
      () => this.testCLICommands()
    );
    
    await this.runTest(
      'Package Installation',
      () => this.testPackageInstallation(),
      true // Skip in demo
    );
    
    this.printSummary();
    
    return this.results.summary.failed === 0;
  }

  printSummary() {
    const { total, passed, failed, skipped } = this.results.summary;
    
    console.log('\\n📊 Test Results Summary:');
    console.log(\`   Total: \${total}\`);
    console.log(\`   Passed: \${passed}\`);
    console.log(\`   Failed: \${failed}\`);
    console.log(\`   Skipped: \${skipped}\`);
    
    if (failed > 0) {
      console.log('\\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(\`   • \${test.name}: \${test.error}\`);
        });
    }
    
    const success = failed === 0;
    console.log(\`\\n\${success ? '✅' : '❌'} Overall: \${success ? 'PASSED' : 'FAILED'}\`);
  }
}

// Run tests if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const tester = new InstallationTester();
  const success = await tester.run();
  process.exit(success ? 0 : 1);
}

export { InstallationTester };
`;

  await fs.writeFile(
    path.join(configsDir, 'test-installation.js'),
    verificationTest
  );

  // Make test script executable
  try {
    await fs.chmod(path.join(configsDir, 'test-installation.js'), 0o755);
  } catch (error) {
    console.warn('Warning: Could not set executable permissions:', error.message);
  }

  console.log('✅ Configuration templates built successfully!');
  console.log(`📁 Generated in: ${configsDir}`);
  console.log('   • claude-desktop-template.json');
  console.log('   • standard-mcp-template.json');
  console.log('   • python-package-template.json');
  console.log('   • universal-installer.js');
  console.log('   • install-windows.ps1');
  console.log('   • install-unix.sh');
  console.log('   • test-installation.js');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildConfigs().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}