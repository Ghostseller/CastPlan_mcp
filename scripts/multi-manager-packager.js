#!/usr/bin/env node
/**
 * CastPlan Ultimate Automation - Multi-Manager Packaging System
 * Universal packaging for npm, yarn, pnpm, pip, uv, uvx ecosystems
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { performance } from 'perf_hooks';
import BUILD_CONFIG from '../build.config.js';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class MultiManagerPackager {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
    this.distPath = BUILD_CONFIG.paths.output;
    this.outputPath = './packages';
    this.results = {
      startTime: performance.now(),
      packages: {},
      errors: [],
      warnings: []
    };
    
    // Ensure output directory exists
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      phase: colors.magenta
    };
    
    const coloredMessage = `${colorMap[level]}[${level.toUpperCase()}]${colors.reset} ${message}`;
    console.log(coloredMessage);
  }

  // Detect available package managers
  detectPackageManagers() {
    const managers = {};
    
    // Node.js package managers
    ['npm', 'yarn', 'pnpm'].forEach(manager => {
      try {
        execSync(`${manager} --version`, { stdio: 'ignore' });
        managers[manager] = true;
        this.log(`✓ ${manager} detected`, 'success');
      } catch (error) {
        managers[manager] = false;
        this.log(`✗ ${manager} not available`, 'warning');
      }
    });
    
    // Python package managers
    ['pip', 'uv', 'uvx', 'python'].forEach(manager => {
      try {
        execSync(`${manager} --version`, { stdio: 'ignore' });
        managers[manager] = true;
        this.log(`✓ ${manager} detected`, 'success');
      } catch (error) {
        managers[manager] = false;
        if (manager === 'python') {
          this.log(`✗ Python not available - Python packaging disabled`, 'warning');
        }
      }
    });
    
    return managers;
  }

  // Create NPM package
  async createNpmPackage() {
    this.log('📦 Creating NPM package...', 'phase');
    
    try {
      // Verify dist exists
      if (!existsSync(this.distPath)) {
        throw new Error('Dist directory not found. Run build first.');
      }
      
      // Create tarball
      const packageName = execSync('npm pack', { encoding: 'utf8' }).trim();
      const packagePath = join(this.outputPath, packageName);
      
      // Move to output directory
      if (existsSync(packageName)) {
        copyFileSync(packageName, packagePath);
        rmSync(packageName);
      }
      
      this.results.packages.npm = {
        name: packageName,
        path: packagePath,
        size: this.getFileSize(packagePath),
        manager: 'npm',
        registry: 'https://registry.npmjs.org/',
        installCommand: `npm install -g ${this.packageJson.name}`
      };
      
      this.log(`✅ NPM package created: ${packageName}`, 'success');
      
    } catch (error) {
      this.results.errors.push(`NPM packaging failed: ${error.message}`);
      this.log(`❌ NPM packaging failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Create Yarn package (uses npm pack but optimized for yarn)
  async createYarnPackage() {
    this.log('🧶 Creating Yarn package...', 'phase');
    
    try {
      // Create yarn-specific package.json with yarn optimizations
      const yarnPackageJson = {
        ...this.packageJson,
        packageManager: `yarn@${this.getYarnVersion()}`,
        engines: {
          ...this.packageJson.engines,
          yarn: '>=1.22.0'
        }
      };
      
      // Backup original package.json
      const originalPackageJson = readFileSync('./package.json', 'utf8');
      
      // Write yarn-optimized package.json
      writeFileSync('./package.json', JSON.stringify(yarnPackageJson, null, 2));
      
      // Create package
      const packageName = execSync('yarn pack --filename yarn-package.tgz', { encoding: 'utf8' }).trim();
      const packagePath = join(this.outputPath, 'yarn-package.tgz');
      
      // Move to output directory
      if (existsSync('yarn-package.tgz')) {
        copyFileSync('yarn-package.tgz', packagePath);
        rmSync('yarn-package.tgz');
      }
      
      // Restore original package.json
      writeFileSync('./package.json', originalPackageJson);
      
      this.results.packages.yarn = {
        name: 'yarn-package.tgz',
        path: packagePath,
        size: this.getFileSize(packagePath),
        manager: 'yarn',
        registry: 'https://registry.yarnpkg.com/',
        installCommand: `yarn global add ${this.packageJson.name}`
      };
      
      this.log(`✅ Yarn package created: yarn-package.tgz`, 'success');
      
    } catch (error) {
      this.results.errors.push(`Yarn packaging failed: ${error.message}`);
      this.log(`❌ Yarn packaging failed: ${error.message}`, 'error');
    }
  }

  // Create PNPM package
  async createPnpmPackage() {
    this.log('📦 Creating PNPM package...', 'phase');
    
    try {
      // PNPM uses standard npm pack but with pnpm-specific optimizations
      const packageName = execSync('pnpm pack', { encoding: 'utf8' }).trim();
      const packagePath = join(this.outputPath, `pnpm-${packageName}`);
      
      // Move to output directory
      if (existsSync(packageName)) {
        copyFileSync(packageName, packagePath);
        rmSync(packageName);
      }
      
      this.results.packages.pnpm = {
        name: `pnpm-${packageName}`,
        path: packagePath,
        size: this.getFileSize(packagePath),
        manager: 'pnpm',
        registry: 'https://registry.npmjs.org/',
        installCommand: `pnpm add -g ${this.packageJson.name}`
      };
      
      this.log(`✅ PNPM package created: pnpm-${packageName}`, 'success');
      
    } catch (error) {
      this.results.errors.push(`PNPM packaging failed: ${error.message}`);
      this.log(`❌ PNPM packaging failed: ${error.message}`, 'error');
    }
  }

  // Create Python package for uv/uvx compatibility
  async createPythonPackage() {
    this.log('🐍 Creating Python package...', 'phase');
    
    try {
      const pythonBridgePath = './python-bridge';
      
      if (!existsSync(pythonBridgePath)) {
        this.log('Creating Python bridge structure...', 'info');
        this.createPythonBridge();
      }
      
      // Build Python package
      const originalCwd = process.cwd();
      process.chdir(pythonBridgePath);
      
      try {
        // Clean previous builds
        if (existsSync('./dist')) {
          rmSync('./dist', { recursive: true });
        }
        
        // Build package
        execSync('python -m build', { stdio: 'inherit' });
        
        // Copy to output directory
        const distFiles = require('fs').readdirSync('./dist');
        for (const file of distFiles) {
          const sourcePath = join('./dist', file);
          const targetPath = join(originalCwd, this.outputPath, `python-${file}`);
          copyFileSync(sourcePath, targetPath);
        }
        
        this.results.packages.python = {
          wheel: distFiles.find(f => f.endsWith('.whl')),
          tarball: distFiles.find(f => f.endsWith('.tar.gz')),
          manager: 'pip/uv/uvx',
          registry: 'https://pypi.org/',
          installCommands: {
            pip: `pip install ${this.packageJson.name}`,
            uv: `uv add ${this.packageJson.name}`,
            uvx: `uvx install ${this.packageJson.name}`
          }
        };
        
        this.log(`✅ Python package created`, 'success');
        
      } finally {
        process.chdir(originalCwd);
      }
      
    } catch (error) {
      this.results.errors.push(`Python packaging failed: ${error.message}`);
      this.log(`❌ Python packaging failed: ${error.message}`, 'error');
    }
  }

  // Create Docker images
  async createDockerPackages() {
    this.log('🐳 Creating Docker packages...', 'phase');
    
    try {
      // Single architecture build
      const imageName = `castplan/ultimate-automation:${this.packageJson.version}`;
      execSync(`docker build -t ${imageName} .`, { stdio: 'inherit' });
      
      // Save as tar
      const dockerTarPath = join(this.outputPath, `docker-${this.packageJson.version}.tar`);
      execSync(`docker save -o ${dockerTarPath} ${imageName}`, { stdio: 'inherit' });
      
      this.results.packages.docker = {
        image: imageName,
        tarball: dockerTarPath,
        size: this.getFileSize(dockerTarPath),
        manager: 'docker',
        registry: 'ghcr.io',
        installCommand: `docker pull ${imageName}`
      };
      
      // Multi-architecture build (if buildx available)
      try {
        execSync('docker buildx version', { stdio: 'ignore' });
        const multiArchImage = `${imageName}-multiarch`;
        execSync(`docker buildx build --platform linux/amd64,linux/arm64 -t ${multiArchImage} --load .`, { stdio: 'inherit' });
        
        this.results.packages.dockerMultiArch = {
          image: multiArchImage,
          platforms: ['linux/amd64', 'linux/arm64'],
          manager: 'docker',
          registry: 'ghcr.io'
        };
        
        this.log(`✅ Multi-architecture Docker image created`, 'success');
      } catch (buildxError) {
        this.log('Docker buildx not available, skipping multi-arch build', 'warning');
      }
      
      this.log(`✅ Docker package created: ${imageName}`, 'success');
      
    } catch (error) {
      this.results.errors.push(`Docker packaging failed: ${error.message}`);
      this.log(`❌ Docker packaging failed: ${error.message}`, 'error');
    }
  }

  // Create platform-specific installers
  async createPlatformInstallers() {
    this.log('💻 Creating platform-specific installers...', 'phase');
    
    const platforms = ['win32', 'darwin', 'linux'];
    
    for (const platform of platforms) {
      try {
        await this.createPlatformInstaller(platform);
      } catch (error) {
        this.results.errors.push(`${platform} installer failed: ${error.message}`);
        this.log(`❌ ${platform} installer failed: ${error.message}`, 'error');
      }
    }
  }

  // Create platform-specific installer
  async createPlatformInstaller(platform) {
    const installerPath = join(this.outputPath, `installer-${platform}`);
    mkdirSync(installerPath, { recursive: true });
    
    // Create install script
    const installScript = this.generateInstallScript(platform);
    const scriptExt = platform === 'win32' ? '.bat' : '.sh';
    const scriptPath = join(installerPath, `install${scriptExt}`);
    
    writeFileSync(scriptPath, installScript);
    
    // Make executable on Unix systems
    if (platform !== 'win32') {
      execSync(`chmod +x ${scriptPath}`);
    }
    
    // Copy necessary files
    const filesToCopy = [
      this.results.packages.npm?.path,
      './README.md',
      './LICENSE',
      './DEPLOYMENT.md'
    ].filter(Boolean);
    
    for (const file of filesToCopy) {
      if (existsSync(file)) {
        const fileName = require('path').basename(file);
        copyFileSync(file, join(installerPath, fileName));
      }
    }
    
    this.results.packages[`installer-${platform}`] = {
      path: installerPath,
      script: scriptPath,
      platform,
      installCommand: platform === 'win32' ? 'install.bat' : './install.sh'
    };
    
    this.log(`✅ ${platform} installer created`, 'success');
  }

  // Generate platform-specific install script
  generateInstallScript(platform) {
    const packageName = this.packageJson.name;
    const isWindows = platform === 'win32';
    
    if (isWindows) {
      return `@echo off
echo Installing CastPlan Ultimate Automation MCP Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is required but not installed.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is required but not available.
    exit /b 1
)

echo Installing package globally...
npm install -g ${packageName}

if errorlevel 1 (
    echo.
    echo Installation failed. Trying alternative methods...
    
    REM Try local installation
    if exist "${packageName}*.tgz" (
        echo Installing from local package...
        npm install -g ${packageName}*.tgz
    ) else (
        echo No local package found. Please check your internet connection.
        exit /b 1
    )
)

echo.
echo Installation completed successfully!
echo Run 'castplan-ultimate --help' to get started.
pause`;
    } else {
      return `#!/bin/bash
set -e

echo "Installing CastPlan Ultimate Automation MCP Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not available."
    exit 1
fi

echo "Installing package globally..."

# Try global installation
if npm install -g ${packageName}; then
    echo "Installation completed successfully!"
elif ls ${packageName}*.tgz 1> /dev/null 2>&1; then
    echo "Global installation failed. Trying local package..."
    npm install -g ./${packageName}*.tgz
    echo "Installation completed successfully!"
else
    echo "Installation failed. Please check your internet connection."
    exit 1
fi

echo
echo "Run 'castplan-ultimate --help' to get started."`;
    }
  }

  // Create Python bridge structure
  createPythonBridge() {
    const pythonBridgePath = './python-bridge';
    mkdirSync(pythonBridgePath, { recursive: true });
    mkdirSync(join(pythonBridgePath, 'src', 'castplan_ultimate_automation'), { recursive: true });
    
    // Create __init__.py
    writeFileSync(
      join(pythonBridgePath, 'src', 'castplan_ultimate_automation', '__init__.py'),
      `"""CastPlan Ultimate Automation MCP Server - Python Bridge"""
__version__ = "${this.packageJson.version}"

def main():
    """Main entry point for uvx/uv execution"""
    import subprocess
    import sys
    
    # Execute the Node.js application
    try:
        subprocess.run([
            "node", 
            "-e", 
            "import('${this.packageJson.name}').then(m => m.main())"
        ], check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Error: Node.js is required but not found in PATH")
        print("Please install Node.js from https://nodejs.org/")
        sys.exit(1)

if __name__ == "__main__":
    main()
`
    );
    
    // Update pyproject.toml with current version
    const pyprojectPath = join(pythonBridgePath, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      let pyprojectContent = readFileSync(pyprojectPath, 'utf8');
      pyprojectContent = pyprojectContent.replace(
        /version = "[^"]*"/,
        `version = "${this.packageJson.version}"`
      );
      writeFileSync(pyprojectPath, pyprojectContent);
    }
  }

  // Utility methods
  getFileSize(filePath) {
    try {
      const stats = require('fs').statSync(filePath);
      return this.formatBytes(stats.size);
    } catch (error) {
      return 'Unknown';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getYarnVersion() {
    try {
      return execSync('yarn --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return '1.22.0';
    }
  }

  // Generate packaging report
  generateReport() {
    const totalDuration = performance.now() - this.results.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: Math.round(totalDuration),
      success: this.results.errors.length === 0,
      packages: this.results.packages,
      errors: this.results.errors,
      warnings: this.results.warnings,
      summary: {
        totalPackages: Object.keys(this.results.packages).length,
        packageManagers: Object.keys(this.results.packages),
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length
      }
    };
    
    // Write report
    writeFileSync(join(this.outputPath, 'packaging-report.json'), JSON.stringify(report, null, 2));
    
    return report;
  }

  // Display results
  displayResults() {
    this.log('\n📦 Multi-Manager Packaging Results', 'phase');
    this.log('=' .repeat(50), 'phase');
    
    const packageCount = Object.keys(this.results.packages).length;
    this.log(`📊 Total Packages Created: ${packageCount}`, 'info');
    
    if (packageCount > 0) {
      this.log('\n📋 Package Details:', 'info');
      for (const [manager, details] of Object.entries(this.results.packages)) {
        if (details.name) {
          this.log(`   ${manager.toUpperCase()}: ${details.name} (${details.size || 'N/A'})`, 'success');
        } else {
          this.log(`   ${manager.toUpperCase()}: Created`, 'success');
        }
      }
    }
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ Errors:', 'error');
      this.results.errors.forEach(error => this.log(`   ${error}`, 'error'));
    }
    
    if (this.results.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.results.warnings.forEach(warning => this.log(`   ${warning}`, 'warning'));
    }
    
    this.log(`\n📁 All packages saved to: ${this.outputPath}`, 'info');
    this.log(`📄 Packaging report: ${join(this.outputPath, 'packaging-report.json')}`, 'info');
  }

  // Main packaging method
  async package() {
    try {
      this.log('🚀 Starting multi-manager packaging...', 'phase');
      this.log(`📦 Package: ${this.packageJson.name}@${this.packageJson.version}`, 'info');
      
      // Detect available package managers
      const availableManagers = this.detectPackageManagers();
      
      // Create packages based on available managers
      const packagingTasks = [];
      
      if (availableManagers.npm) {
        packagingTasks.push(this.createNpmPackage());
      }
      
      if (availableManagers.yarn) {
        packagingTasks.push(this.createYarnPackage());
      }
      
      if (availableManagers.pnpm) {
        packagingTasks.push(this.createPnpmPackage());
      }
      
      if (availableManagers.python) {
        packagingTasks.push(this.createPythonPackage());
      }
      
      // Docker packaging (if Docker is available)
      try {
        execSync('docker --version', { stdio: 'ignore' });
        packagingTasks.push(this.createDockerPackages());
      } catch (error) {
        this.log('Docker not available, skipping Docker packaging', 'warning');
      }
      
      // Platform installers
      packagingTasks.push(this.createPlatformInstallers());
      
      // Execute all packaging tasks
      await Promise.allSettled(packagingTasks);
      
      // Generate and display report
      const report = this.generateReport();
      this.displayResults();
      
      if (this.results.errors.length === 0) {
        this.log('\n🎉 Multi-manager packaging completed successfully!', 'success');
      } else {
        this.log('\n⚠️  Packaging completed with errors. See report for details.', 'warning');
      }
      
      return report;
      
    } catch (error) {
      this.results.errors.push(error.message);
      this.log(`💥 Packaging failed: ${error.message}`, 'error');
      this.generateReport();
      process.exit(1);
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const packager = new MultiManagerPackager();
  packager.package().catch(error => {
    console.error('Multi-manager packaging failed:', error);
    process.exit(1);
  });
}

export default MultiManagerPackager;