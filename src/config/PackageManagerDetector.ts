/**
 * Package Manager Detection and Fallback System
 * 
 * Detects available Node.js package managers and provides intelligent
 * fallback strategies for cross-platform installation.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// Schemas
const PackageManagerInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  version: z.string(),
  globalFlag: z.string(),
  installCommand: z.array(z.string()),
  available: z.boolean(),
  priority: z.number()
});

const DetectionResultSchema = z.object({
  managers: z.array(PackageManagerInfoSchema),
  recommended: PackageManagerInfoSchema.optional(),
  platform: z.string(),
  environment: z.record(z.string())
});

// Types
export type PackageManagerInfo = z.infer<typeof PackageManagerInfoSchema>;
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

export interface InstallationOptions {
  global?: boolean;
  preferManager?: string;
  timeout?: number;
  retries?: number;
  fallbackChain?: string[];
}

export interface InstallationResult {
  success: boolean;
  manager: string;
  output: string;
  error?: string;
  duration: number;
}

export class PackageManagerDetector {
  private platform: string;
  private detectionCache: Map<string, PackageManagerInfo> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastDetection: number = 0;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Detect all available package managers
   */
  async detectAvailableManagers(): Promise<DetectionResult> {
    // Check cache validity
    if (Date.now() - this.lastDetection < this.cacheExpiry && this.detectionCache.size > 0) {
      return this.buildDetectionResult();
    }

    // Clear cache and perform fresh detection
    this.detectionCache.clear();
    this.lastDetection = Date.now();

    const managers = [
      {
        name: 'npm',
        executables: this.platform === 'win32' ? ['npm.cmd', 'npm.exe', 'npm'] : ['npm'],
        globalFlag: '-g',
        installCommand: ['install'],
        priority: 3 // High priority
      },
      {
        name: 'yarn',
        executables: this.platform === 'win32' ? ['yarn.cmd', 'yarn.exe', 'yarn'] : ['yarn'],
        globalFlag: '', // yarn uses 'global add'
        installCommand: ['global', 'add'],
        priority: 2 // Medium priority
      },
      {
        name: 'pnpm',
        executables: this.platform === 'win32' ? ['pnpm.cmd', 'pnpm.exe', 'pnpm'] : ['pnpm'],
        globalFlag: '-g',
        installCommand: ['add'],
        priority: 1 // Lower priority (newer, less universal)
      },
      {
        name: 'bun',
        executables: this.platform === 'win32' ? ['bun.exe', 'bun'] : ['bun'],
        globalFlag: '-g',
        installCommand: ['add'],
        priority: 0 // Lowest priority (newest, experimental)
      }
    ];

    // Detect each manager
    const detectionPromises = managers.map(manager => 
      this.detectSingleManager(manager)
    );

    await Promise.allSettled(detectionPromises);

    return this.buildDetectionResult();
  }

  /**
   * Detect a single package manager
   */
  private async detectSingleManager(managerConfig: {
    name: string;
    executables: string[];
    globalFlag: string;
    installCommand: string[];
    priority: number;
  }): Promise<void> {
    for (const executable of managerConfig.executables) {
      try {
        // Check if executable exists in PATH
        const executablePath = await this.findExecutableInPath(executable);
        if (!executablePath) continue;

        // Get version
        const version = await this.getManagerVersion(executablePath);
        if (!version) continue;

        // Manager detected successfully
        const managerInfo: PackageManagerInfo = {
          name: managerConfig.name,
          path: executablePath,
          version,
          globalFlag: managerConfig.globalFlag,
          installCommand: managerConfig.installCommand,
          available: true,
          priority: managerConfig.priority
        };

        this.detectionCache.set(managerConfig.name, managerInfo);
        break; // Found this manager, stop checking other executables
        
      } catch (error) {
        // Continue to next executable
        continue;
      }
    }
  }

  /**
   * Find executable in PATH
   */
  private async findExecutableInPath(executable: string): Promise<string | null> {
    return new Promise((resolve) => {
      const command = this.platform === 'win32' ? 'where' : 'which';
      const child = spawn(command, [executable], { 
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5000
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          // Return first path (in case of multiple results)
          const firstPath = output.trim().split('\n')[0];
          resolve(firstPath);
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Get package manager version
   */
  private async getManagerVersion(executablePath: string): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(executablePath, ['--version'], {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10000
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim().split('\n')[0]);
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Build detection result from cache
   */
  private buildDetectionResult(): DetectionResult {
    const managers = Array.from(this.detectionCache.values())
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)

    const recommended = managers.find(m => m.available) || undefined;

    return {
      managers,
      recommended,
      platform: this.platform,
      environment: {
        NODE_PATH: process.env.NODE_PATH || '',
        NPM_CONFIG_PREFIX: process.env.NPM_CONFIG_PREFIX || '',
        YARN_GLOBAL_FOLDER: process.env.YARN_GLOBAL_FOLDER || '',
        PNPM_HOME: process.env.PNPM_HOME || ''
      }
    };
  }

  /**
   * Install package with intelligent fallback
   */
  async installPackage(
    packageName: string,
    options: InstallationOptions = {}
  ): Promise<InstallationResult> {
    const {
      global = true,
      preferManager,
      timeout = 5 * 60 * 1000, // 5 minutes
      retries = 2,
      fallbackChain = ['npm', 'yarn', 'pnpm', 'bun']
    } = options;

    // Get available managers
    const detection = await this.detectAvailableManagers();
    if (detection.managers.length === 0) {
      throw new Error('No package managers available');
    }

    // Order managers by preference
    const orderedManagers = this.orderManagersByPreference(
      detection.managers,
      preferManager,
      fallbackChain
    );

    let lastError: string | undefined;

    // Try each manager in order
    for (const manager of orderedManagers) {
      if (!manager.available) continue;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const startTime = Date.now();
          
          const result = await this.attemptInstallation(
            manager,
            packageName,
            global,
            timeout
          );

          if (result.success) {
            return {
              ...result,
              duration: Date.now() - startTime
            };
          }

          lastError = result.error;
          
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          
          // Wait before retry (exponential backoff)
          if (attempt < retries) {
            await this.delay(1000 * attempt);
          }
        }
      }
    }

    // All managers failed
    throw new Error(`Installation failed with all package managers. Last error: ${lastError}`);
  }

  /**
   * Order managers by preference
   */
  private orderManagersByPreference(
    managers: PackageManagerInfo[],
    preferManager?: string,
    fallbackChain: string[] = []
  ): PackageManagerInfo[] {
    const available = managers.filter(m => m.available);
    
    // If specific manager preferred, try it first
    if (preferManager) {
      const preferred = available.find(m => m.name === preferManager);
      if (preferred) {
        const others = available.filter(m => m.name !== preferManager);
        return [preferred, ...others];
      }
    }

    // Order by fallback chain
    const ordered: PackageManagerInfo[] = [];
    
    // Add managers in fallback chain order
    for (const managerName of fallbackChain) {
      const manager = available.find(m => m.name === managerName);
      if (manager) {
        ordered.push(manager);
      }
    }

    // Add any remaining managers sorted by priority
    const remaining = available.filter(m => !ordered.includes(m));
    remaining.sort((a, b) => b.priority - a.priority);
    ordered.push(...remaining);

    return ordered;
  }

  /**
   * Attempt installation with a specific package manager
   */
  private async attemptInstallation(
    manager: PackageManagerInfo,
    packageName: string,
    global: boolean,
    timeout: number
  ): Promise<InstallationResult> {
    return new Promise((resolve) => {
      // Build command
      const args = [...manager.installCommand];
      
      if (global && manager.globalFlag) {
        if (manager.name === 'yarn') {
          // yarn already has 'global add' in installCommand
        } else {
          args.push(manager.globalFlag);
        }
      }
      
      args.push(packageName);

      // Spawn process
      const child = spawn(manager.path, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const output = stdout + stderr;
        
        if (code === 0) {
          resolve({
            success: true,
            manager: manager.name,
            output,
            duration: 0 // Will be calculated by caller
          });
        } else {
          resolve({
            success: false,
            manager: manager.name,
            output,
            error: `Exit code ${code}: ${stderr || stdout}`,
            duration: 0
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          manager: manager.name,
          output: '',
          error: error.message,
          duration: 0
        });
      });

      // Handle timeout
      child.on('exit', (code, signal) => {
        if (signal === 'SIGTERM') {
          resolve({
            success: false,
            manager: manager.name,
            output: stdout + stderr,
            error: 'Installation timed out',
            duration: 0
          });
        }
      });
    });
  }

  /**
   * Check if package is already installed
   */
  async isPackageInstalled(packageName: string, global = true): Promise<{
    installed: boolean;
    version?: string;
    location?: string;
    manager?: string;
  }> {
    const detection = await this.detectAvailableManagers();
    
    for (const manager of detection.managers) {
      if (!manager.available) continue;

      try {
        const result = await this.checkPackageWithManager(manager, packageName, global);
        if (result.installed) {
          return { ...result, manager: manager.name };
        }
      } catch {
        // Continue to next manager
      }
    }

    return { installed: false };
  }

  /**
   * Check if package is installed with specific manager
   */
  private async checkPackageWithManager(
    manager: PackageManagerInfo,
    packageName: string,
    global: boolean
  ): Promise<{ installed: boolean; version?: string; location?: string }> {
    return new Promise((resolve) => {
      let args: string[];
      
      switch (manager.name) {
        case 'npm':
          args = ['list', packageName, '--depth=0', '--json'];
          if (global) args.push('-g');
          break;
        case 'yarn':
          args = global ? ['global', 'list', '--pattern', packageName] : ['list', '--pattern', packageName];
          break;
        case 'pnpm':
          args = ['list', packageName, '--depth=0', '--json'];
          if (global) args.push('-g');
          break;
        default:
          resolve({ installed: false });
          return;
      }

      const child = spawn(manager.path, args, {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10000
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        try {
          if (manager.name === 'npm' || manager.name === 'pnpm') {
            const data = JSON.parse(output);
            const dependencies = data.dependencies || {};
            
            if (dependencies[packageName]) {
              resolve({
                installed: true,
                version: dependencies[packageName].version,
                location: dependencies[packageName].path
              });
            } else {
              resolve({ installed: false });
            }
          } else if (manager.name === 'yarn') {
            // Parse yarn output (different format)
            const installed = output.includes(packageName);
            resolve({
              installed,
              version: installed ? 'unknown' : undefined
            });
          } else {
            resolve({ installed: false });
          }
        } catch {
          resolve({ installed: false });
        }
      });

      child.on('error', () => {
        resolve({ installed: false });
      });
    });
  }

  /**
   * Get installation information for debugging
   */
  async getInstallationInfo(): Promise<{
    managers: PackageManagerInfo[];
    environment: Record<string, string>;
    platform: string;
    recommendations: string[];
  }> {
    const detection = await this.detectAvailableManagers();
    
    const recommendations: string[] = [];
    
    if (detection.managers.length === 0) {
      recommendations.push('No package managers detected. Install Node.js with npm.');
    } else if (!detection.recommended) {
      recommendations.push('Package managers detected but none are functional.');
    } else {
      recommendations.push(`Recommended: ${detection.recommended.name} (${detection.recommended.version})`);
    }

    return {
      managers: detection.managers,
      environment: detection.environment,
      platform: detection.platform,
      recommendations
    };
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear detection cache (force re-detection)
   */
  clearCache(): void {
    this.detectionCache.clear();
    this.lastDetection = 0;
  }
}