/**
 * Universal MCP Configuration Generator
 * 
 * Generates MCP server configurations for multiple environments with
 * cross-platform support and intelligent auto-detection.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// Configuration schemas
const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional()
});

const ClaudeDesktopConfigSchema = z.object({
  mcpServers: z.record(MCPServerConfigSchema)
});

const StandardMCPConfigSchema = z.object({
  servers: z.record(MCPServerConfigSchema.extend({
    args: z.array(z.string())
  })),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    file: z.string().optional()
  }).optional()
});

// Types
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type ClaudeDesktopConfig = z.infer<typeof ClaudeDesktopConfigSchema>;
export type StandardMCPConfig = z.infer<typeof StandardMCPConfigSchema>;

export interface ConfigLocation {
  name: string;
  path: string;
  exists: boolean;
  writable: boolean;
  environment: string;
}

export interface GenerationOptions {
  serverName?: string;
  customArgs?: string[];
  environment?: Record<string, string>;
  workingDirectory?: string;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export class UniversalMCPConfigGenerator {
  private platform: string;
  private homeDir: string;
  private packagePath?: string;
  private nodePath?: string;

  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();
  }

  /**
   * Initialize with detected Node.js and package paths
   */
  async initialize(): Promise<void> {
    await this.detectNodeJS();
    await this.detectPackage();
  }

  /**
   * Detect Node.js installation
   */
  private async detectNodeJS(): Promise<void> {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const nodeNames = this.platform === 'win32' ? ['node.exe', 'node'] : ['node', 'nodejs'];
      
      for (const nodeName of nodeNames) {
        try {
          const which = spawn(this.platform === 'win32' ? 'where' : 'which', [nodeName]);
          
          which.stdout.on('data', (data) => {
            this.nodePath = data.toString().trim().split('\n')[0];
          });
          
          which.on('close', (code) => {
            if (code === 0 && this.nodePath) {
              resolve();
            } else if (nodeName === nodeNames[nodeNames.length - 1]) {
              reject(new Error('Node.js not found in PATH'));
            }
          });
          
          break;
        } catch (error) {
          if (nodeName === nodeNames[nodeNames.length - 1]) {
            reject(new Error(`Node.js detection failed: ${error}`));
          }
        }
      }
    });
  }

  /**
   * Detect CastPlan package installation
   */
  private async detectPackage(): Promise<void> {
    const searchPaths = await this.getPackageSearchPaths();
    
    for (const searchPath of searchPaths) {
      try {
        const packageJsonPath = path.join(searchPath, 'package.json');
        await fs.access(packageJsonPath);
        
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (packageJson.name === '@castplan/ultimate-automation-mcp') {
          this.packagePath = searchPath;
          break;
        }
      } catch {
        // Continue searching
      }
    }

    if (!this.packagePath) {
      throw new Error('CastPlan Ultimate Automation package not found');
    }
  }

  /**
   * Get potential package installation paths
   */
  private async getPackageSearchPaths(): Promise<string[]> {
    const paths: string[] = [];
    const packageName = '@castplan/ultimate-automation-mcp';

    // Try to get npm global path
    try {
      const { spawn } = await import('child_process');
      const npmCmd = this.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      const npmRoot = spawn(npmCmd, ['root', '-g']);
      
      await new Promise<void>((resolve) => {
        npmRoot.stdout.on('data', (data) => {
          const globalPath = data.toString().trim();
          paths.push(path.join(globalPath, packageName));
        });
        
        npmRoot.on('close', () => resolve());
      });
    } catch {
      // Fallback to common paths
    }

    // Platform-specific global locations
    switch (this.platform) {
      case 'win32':
        // Windows paths
        if (process.env.APPDATA) {
          paths.push(path.join(process.env.APPDATA, 'npm', 'node_modules', packageName));
        }
        if (process.env.ProgramFiles) {
          paths.push(path.join(process.env.ProgramFiles, 'nodejs', 'node_modules', packageName));
        }
        break;

      case 'darwin':
        // macOS paths
        paths.push(
          path.join('/usr/local/lib/node_modules', packageName),
          path.join(this.homeDir, '.npm-global', 'lib', 'node_modules', packageName),
          path.join('/opt/homebrew/lib/node_modules', packageName)
        );
        break;

      case 'linux':
        // Linux paths
        paths.push(
          path.join('/usr/lib/node_modules', packageName),
          path.join('/usr/local/lib/node_modules', packageName),
          path.join(this.homeDir, '.npm-global', 'lib', 'node_modules', packageName),
          path.join(this.homeDir, '.local', 'lib', 'node_modules', packageName)
        );
        break;
    }

    return paths;
  }

  /**
   * Detect all configuration locations across environments
   */
  async detectConfigLocations(): Promise<ConfigLocation[]> {
    const locations: ConfigLocation[] = [];

    // Claude Desktop locations
    const claudeLocations = await this.getClaudeDesktopLocations();
    locations.push(...claudeLocations);

    // Standard MCP locations
    const mcpLocations = await this.getStandardMCPLocations();
    locations.push(...mcpLocations);

    // Cline locations
    const clineLocations = await this.getClineLocations();
    locations.push(...clineLocations);

    // Cursor locations
    const cursorLocations = await this.getCursorLocations();
    locations.push(...cursorLocations);

    return locations;
  }

  /**
   * Get Claude Desktop configuration locations
   */
  private async getClaudeDesktopLocations(): Promise<ConfigLocation[]> {
    const locations: ConfigLocation[] = [];

    switch (this.platform) {
      case 'win32':
        if (process.env.APPDATA) {
          locations.push({
            name: 'Claude Desktop (Windows)',
            path: path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json'),
            exists: false,
            writable: false,
            environment: 'claude_desktop'
          });
        }
        break;

      case 'darwin':
        locations.push({
          name: 'Claude Desktop (macOS)',
          path: path.join(this.homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
          exists: false,
          writable: false,
          environment: 'claude_desktop'
        });
        break;

      case 'linux':
        locations.push(
          {
            name: 'Claude Desktop (XDG)',
            path: path.join(this.homeDir, '.config', 'claude', 'claude_desktop_config.json'),
            exists: false,
            writable: false,
            environment: 'claude_desktop'
          },
          {
            name: 'Claude Desktop (Local)',
            path: path.join(this.homeDir, '.claude', 'claude_desktop_config.json'),
            exists: false,
            writable: false,
            environment: 'claude_desktop'
          }
        );
        break;
    }

    // Check existence and writability
    for (const location of locations) {
      try {
        await fs.access(location.path);
        location.exists = true;
        
        // Test writability
        await fs.access(location.path, fs.constants.W_OK);
        location.writable = true;
      } catch {
        // Check if parent directory is writable
        try {
          const parentDir = path.dirname(location.path);
          await fs.mkdir(parentDir, { recursive: true });
          location.writable = true;
        } catch {
          location.writable = false;
        }
      }
    }

    return locations;
  }

  /**
   * Get standard MCP configuration locations
   */
  private async getStandardMCPLocations(): Promise<ConfigLocation[]> {
    const locations: ConfigLocation[] = [
      {
        name: 'MCP Config (Home)',
        path: path.join(this.homeDir, '.mcp', 'config.json'),
        exists: false,
        writable: false,
        environment: 'standard_mcp'
      },
      {
        name: 'MCP Config (XDG)',
        path: path.join(this.homeDir, '.config', 'mcp', 'config.json'),
        exists: false,
        writable: false,
        environment: 'standard_mcp'
      }
    ];

    // Check existence and writability
    for (const location of locations) {
      try {
        await fs.access(location.path);
        location.exists = true;
        
        await fs.access(location.path, fs.constants.W_OK);
        location.writable = true;
      } catch {
        try {
          const parentDir = path.dirname(location.path);
          await fs.mkdir(parentDir, { recursive: true });
          location.writable = true;
        } catch {
          location.writable = false;
        }
      }
    }

    return locations;
  }

  /**
   * Get Cline configuration locations
   */
  private async getClineLocations(): Promise<ConfigLocation[]> {
    const locations: ConfigLocation[] = [];

    switch (this.platform) {
      case 'win32':
        if (process.env.APPDATA) {
          locations.push({
            name: 'Cline (VS Code)',
            path: path.join(process.env.APPDATA, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'config.json'),
            exists: false,
            writable: false,
            environment: 'cline'
          });
        }
        break;

      default:
        locations.push({
          name: 'Cline (VS Code)',
          path: path.join(this.homeDir, '.vscode', 'extensions', 'claude-dev', 'config.json'),
          exists: false,
          writable: false,
          environment: 'cline'
        });
        break;
    }

    // Check existence and writability
    for (const location of locations) {
      try {
        await fs.access(location.path);
        location.exists = true;
        
        await fs.access(location.path, fs.constants.W_OK);
        location.writable = true;
      } catch {
        try {
          const parentDir = path.dirname(location.path);
          await fs.mkdir(parentDir, { recursive: true });
          location.writable = true;
        } catch {
          location.writable = false;
        }
      }
    }

    return locations;
  }

  /**
   * Get Cursor configuration locations
   */
  private async getCursorLocations(): Promise<ConfigLocation[]> {
    const locations: ConfigLocation[] = [];

    switch (this.platform) {
      case 'win32':
        if (process.env.APPDATA) {
          locations.push({
            name: 'Cursor (Settings)',
            path: path.join(process.env.APPDATA, 'Cursor', 'User', 'settings.json'),
            exists: false,
            writable: false,
            environment: 'cursor'
          });
        }
        break;

      default:
        locations.push({
          name: 'Cursor (Settings)',
          path: path.join(this.homeDir, '.cursor', 'settings.json'),
          exists: false,
          writable: false,
          environment: 'cursor'
        });
        break;
    }

    // Check existence and writability
    for (const location of locations) {
      try {
        await fs.access(location.path);
        location.exists = true;
        
        await fs.access(location.path, fs.constants.W_OK);
        location.writable = true;
      } catch {
        try {
          const parentDir = path.dirname(location.path);
          await fs.mkdir(parentDir, { recursive: true });
          location.writable = true;
        } catch {
          location.writable = false;
        }
      }
    }

    return locations;
  }

  /**
   * Generate Claude Desktop configuration
   */
  generateClaudeDesktopConfig(options: GenerationOptions = {}): ClaudeDesktopConfig {
    if (!this.nodePath || !this.packagePath) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    const serverName = options.serverName || 'castplan-ultimate';
    const mainScript = path.join(this.packagePath, 'dist', 'index.js');
    
    const args = [mainScript];
    if (options.customArgs) {
      args.push(...options.customArgs);
    }

    const env = {
      NODE_ENV: 'production',
      CASTPLAN_LOG_LEVEL: options.logLevel || 'info',
      ...options.environment
    };

    const serverConfig: MCPServerConfig = {
      command: this.nodePath,
      args,
      env,
      cwd: options.workingDirectory
    };

    return {
      mcpServers: {
        [serverName]: serverConfig
      }
    };
  }

  /**
   * Generate standard MCP configuration
   */
  generateStandardMCPConfig(options: GenerationOptions = {}): StandardMCPConfig {
    if (!this.nodePath || !this.packagePath) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    const serverName = options.serverName || 'castplan-ultimate';
    const mainScript = path.join(this.packagePath, 'dist', 'index.js');
    
    const args = [mainScript];
    if (options.customArgs) {
      args.push(...options.customArgs);
    }

    const env = {
      NODE_ENV: 'production',
      CASTPLAN_LOG_LEVEL: options.logLevel || 'info',
      ...options.environment
    };

    return {
      servers: {
        [serverName]: {
          command: this.nodePath,
          args,
          env,
          cwd: options.workingDirectory
        }
      },
      logging: {
        level: options.logLevel || 'info',
        file: path.join(this.homeDir, '.mcp', 'logs', `${serverName}.log`)
      }
    };
  }

  /**
   * Install configuration to specified location
   */
  async installConfig(
    location: ConfigLocation,
    options: GenerationOptions = {},
    backupExisting = true
  ): Promise<void> {
    // Generate appropriate configuration
    let config: ClaudeDesktopConfig | StandardMCPConfig;
    
    switch (location.environment) {
      case 'claude_desktop':
        config = this.generateClaudeDesktopConfig(options);
        break;
      case 'standard_mcp':
        config = this.generateStandardMCPConfig(options);
        break;
      default:
        throw new Error(`Unsupported environment: ${location.environment}`);
    }

    // Handle existing configuration
    let existingConfig: any = {};
    if (location.exists) {
      try {
        const existingContent = await fs.readFile(location.path, 'utf-8');
        existingConfig = JSON.parse(existingContent);

        // Create backup
        if (backupExisting) {
          const backupPath = location.path + '.backup';
          await fs.writeFile(backupPath, existingContent);
        }
      } catch (error) {
        console.warn(`Warning: Could not read existing config: ${error}`);
      }
    }

    // Merge configurations
    let mergedConfig: any;
    if (location.environment === 'claude_desktop') {
      const claudeConfig = config as ClaudeDesktopConfig;
      mergedConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingConfig.mcpServers,
          ...claudeConfig.mcpServers
        }
      };
    } else if (location.environment === 'standard_mcp') {
      const mcpConfig = config as StandardMCPConfig;
      mergedConfig = {
        ...existingConfig,
        servers: {
          ...existingConfig.servers,
          ...mcpConfig.servers
        },
        logging: mcpConfig.logging
      };
    } else {
      mergedConfig = config;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(location.path);
    await fs.mkdir(parentDir, { recursive: true });

    // Write configuration
    await fs.writeFile(location.path, JSON.stringify(mergedConfig, null, 2));
  }

  /**
   * Verify configuration installation
   */
  async verifyConfig(location: ConfigLocation): Promise<{
    exists: boolean;
    valid: boolean;
    hasServer: boolean;
    serverName?: string;
    errors: string[];
  }> {
    const result = {
      exists: false,
      valid: false,
      hasServer: false,
      serverName: undefined as string | undefined,
      errors: [] as string[]
    };

    try {
      // Check if file exists
      await fs.access(location.path);
      result.exists = true;

      // Read and parse configuration
      const content = await fs.readFile(location.path, 'utf-8');
      const config = JSON.parse(content);

      // Validate structure based on environment
      if (location.environment === 'claude_desktop') {
        const parsed = ClaudeDesktopConfigSchema.safeParse(config);
        if (parsed.success) {
          result.valid = true;
          
          // Check for CastPlan server
          for (const [name, serverConfig] of Object.entries(parsed.data.mcpServers)) {
            if (name.toLowerCase().includes('castplan')) {
              result.hasServer = true;
              result.serverName = name;
              break;
            }
          }
        } else {
          result.errors.push(`Invalid Claude Desktop config: ${parsed.error.message}`);
        }
      } else if (location.environment === 'standard_mcp') {
        const parsed = StandardMCPConfigSchema.safeParse(config);
        if (parsed.success) {
          result.valid = true;
          
          // Check for CastPlan server
          for (const [name, serverConfig] of Object.entries(parsed.data.servers)) {
            if (name.toLowerCase().includes('castplan')) {
              result.hasServer = true;
              result.serverName = name;
              break;
            }
          }
        } else {
          result.errors.push(`Invalid MCP config: ${parsed.error.message}`);
        }
      }

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        result.errors.push('Configuration file not found');
      } else {
        result.errors.push(`Verification error: ${error}`);
      }
    }

    return result;
  }
}