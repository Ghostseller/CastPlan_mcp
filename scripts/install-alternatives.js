#!/usr/bin/env node

/**
 * Alternative Installation Methods for CastPlan MCP
 * 
 * Provides multiple installation paths when standard methods fail:
 * 1. Direct npm execution (npx)
 * 2. Docker container execution
 * 3. Portable binary download
 * 4. Development mode setup
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InstallationAlternatives {
    constructor() {
        this.packageName = '@castplan/automation-mcp';
        this.repoUrl = 'https://github.com/Ghostseller/CastPlan_mcp.git';
        this.platform = process.platform;
        this.arch = process.arch;
    }

    // Method 1: Direct npx execution (no permanent install)
    async runWithNpx(args = []) {
        console.log('🚀 Running with npx (no installation required)...');
        
        try {
            const npxArgs = [this.packageName, ...args];
            const result = spawn('npx', npxArgs, { 
                stdio: 'inherit',
                shell: true 
            });
            
            return new Promise((resolve, reject) => {
                result.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ npx execution completed successfully');
                        resolve(true);
                    } else {
                        reject(new Error(`npx execution failed with code ${code}`));
                    }
                });
                
                result.on('error', (error) => {
                    reject(new Error(`npx execution error: ${error.message}`));
                });
            });
            
        } catch (error) {
            throw new Error(`npx method failed: ${error.message}`);
        }
    }

    // Method 2: Docker container execution
    async runWithDocker(args = []) {
        console.log('🐳 Running with Docker container...');
        
        // Check if Docker is available
        try {
            execSync('docker --version', { stdio: 'ignore' });
        } catch (error) {
            throw new Error('Docker is not installed or not available');
        }

        try {
            // Use official Node.js image with our package
            const dockerArgs = [
                'run', '--rm', '-it',
                '-v', `${process.cwd()}:/workspace`,
                '-w', '/workspace',
                'node:18-alpine',
                'sh', '-c',
                `npm install -g ${this.packageName} && castplan-mcp ${args.join(' ')}`
            ];

            const result = spawn('docker', dockerArgs, { 
                stdio: 'inherit',
                shell: true 
            });
            
            return new Promise((resolve, reject) => {
                result.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Docker execution completed successfully');
                        resolve(true);
                    } else {
                        reject(new Error(`Docker execution failed with code ${code}`));
                    }
                });
                
                result.on('error', (error) => {
                    reject(new Error(`Docker execution error: ${error.message}`));
                });
            });
            
        } catch (error) {
            throw new Error(`Docker method failed: ${error.message}`);
        }
    }

    // Method 3: Direct Git clone and run
    async runFromGitClone(args = []) {
        console.log('📦 Cloning and running directly from Git...');
        
        const tempDir = path.join(process.cwd(), '.temp-castplan');
        
        try {
            // Clean up any existing temp directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }

            // Clone repository
            console.log('Cloning repository...');
            execSync(`git clone ${this.repoUrl} "${tempDir}"`, { stdio: 'inherit' });
            
            // Install dependencies and build
            console.log('Installing dependencies...');
            execSync('npm install', { 
                cwd: tempDir, 
                stdio: 'inherit' 
            });
            
            console.log('Building project...');
            execSync('npm run build', { 
                cwd: tempDir, 
                stdio: 'inherit' 
            });
            
            // Run the CLI
            console.log('Executing CastPlan MCP...');
            const cliPath = path.join(tempDir, 'dist', 'cli.js');
            execSync(`node "${cliPath}" ${args.join(' ')}`, { 
                stdio: 'inherit' 
            });
            
            console.log('✅ Git clone method completed successfully');
            return true;
            
        } catch (error) {
            throw new Error(`Git clone method failed: ${error.message}`);
        } finally {
            // Clean up temp directory
            if (fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (cleanupError) {
                    console.warn(`⚠️  Could not clean up temp directory: ${cleanupError.message}`);
                }
            }
        }
    }

    // Method 4: Development mode setup
    async setupDevelopmentMode() {
        console.log('🛠️  Setting up development mode...');
        
        const currentDir = process.cwd();
        const packageJsonPath = path.join(currentDir, 'package.json');
        
        try {
            // Check if we're in the project directory
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('Not in CastPlan MCP project directory');
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.name !== '@castplan/automation-mcp') {
                throw new Error('Not in CastPlan MCP project directory');
            }

            // Install dependencies
            console.log('Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });
            
            // Build project
            console.log('Building project...');
            execSync('npm run build', { stdio: 'inherit' });
            
            // Create global symlink
            console.log('Creating global symlink...');
            execSync('npm link', { stdio: 'inherit' });
            
            console.log('✅ Development mode setup completed');
            console.log('You can now use: castplan-mcp <command>');
            
            return true;
            
        } catch (error) {
            throw new Error(`Development mode setup failed: ${error.message}`);
        }
    }

    // Method 5: Portable executable download
    async downloadPortableExecutable() {
        console.log('📥 Checking for portable executable...');
        
        // This would download a pre-built executable if available
        // For now, this is a placeholder for future implementation
        const releaseUrl = `https://github.com/Ghostseller/CastPlan_mcp/releases/latest/download/castplan-mcp-${this.platform}-${this.arch}`;
        
        try {
            // Check if release exists (placeholder)
            console.log('⚠️  Portable executable not yet available');
            console.log('   This feature will be implemented in a future release');
            return false;
            
        } catch (error) {
            throw new Error(`Portable executable download failed: ${error.message}`);
        }
    }

    // Smart installation method selector
    async smartInstall(args = []) {
        console.log('🤖 Smart installation - trying multiple methods...\n');
        
        const methods = [
            { name: 'npx', method: () => this.runWithNpx(args) },
            { name: 'git-clone', method: () => this.runFromGitClone(args) },
            { name: 'docker', method: () => this.runWithDocker(args) },
        ];

        for (const { name, method } of methods) {
            try {
                console.log(`\n🔄 Trying method: ${name}`);
                const success = await method();
                if (success) {
                    console.log(`\n✅ Success with method: ${name}`);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Method ${name} failed: ${error.message}`);
                continue;
            }
        }

        console.log('\n❌ All installation methods failed');
        console.log('\nTroubleshooting suggestions:');
        console.log('1. Check Node.js version (requires >=18.0.0)');
        console.log('2. Clear npm cache: npm cache clean --force');
        console.log('3. Try development mode: node scripts/install-alternatives.js dev');
        console.log('4. Report issue: https://github.com/Ghostseller/CastPlan_mcp/issues');
        
        return false;
    }

    // Display available methods
    displayHelp() {
        console.log(`
🚀 CastPlan MCP - Alternative Installation Methods

Usage:
  node scripts/install-alternatives.js <method> [args...]

Available methods:
  smart         Try all methods automatically (recommended)
  npx           Run with npx (no permanent install)
  docker        Run in Docker container  
  git-clone     Clone from Git and run directly
  dev           Setup development mode
  portable      Download portable executable (coming soon)
  help          Show this help message

Examples:
  node scripts/install-alternatives.js smart init
  node scripts/install-alternatives.js npx --help
  node scripts/install-alternatives.js docker init
  node scripts/install-alternatives.js dev

Requirements:
  - Node.js >=18.0.0
  - Git (for git-clone method)
  - Docker (for docker method)
        `);
    }
}

// CLI interface
async function main() {
    const installer = new InstallationAlternatives();
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help') {
        installer.displayHelp();
        return;
    }

    const method = args[0];
    const methodArgs = args.slice(1);

    try {
        switch (method) {
            case 'smart':
                await installer.smartInstall(methodArgs);
                break;
            case 'npx':
                await installer.runWithNpx(methodArgs);
                break;
            case 'docker':
                await installer.runWithDocker(methodArgs);
                break;
            case 'git-clone':
                await installer.runFromGitClone(methodArgs);
                break;
            case 'dev':
                await installer.setupDevelopmentMode();
                break;
            case 'portable':
                await installer.downloadPortableExecutable();
                break;
            default:
                console.log(`❌ Unknown method: ${method}`);
                installer.displayHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Installation failed: ${error.message}`);
        process.exit(1);
    }
}

// Auto-run when executed directly
main().catch(console.error);

export default InstallationAlternatives;