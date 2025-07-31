/**
 * Standard MCP Configuration Generator
 * 
 * Generates standard MCP server configurations following the official MCP protocol
 * Works with Claude Desktop, Cursor, Windsurf, VS Code, and other MCP clients
 * 
 * Created: 2025-07-31
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from 'winston';
import { 
  ProjectInfo, 
  EnvironmentConfig,
  PlatformInfo 
} from './types.js';

// Standard MCP Configuration
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface StandardMCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPConfigFile {
  name: string;
  path: string;
  config: StandardMCPConfig;
  instructions: string[];
}

export interface MCPConfigOptions {
  serverName?: string;
  serverPath?: string;
  workingDirectory?: string;
  additionalEnv?: Record<string, string>;
  global?: boolean;
}

export class StandardMCPConfigGenerator {
  private logger: Logger;
  private projectInfo: ProjectInfo;
  private platformInfo: PlatformInfo;

  constructor(projectInfo: ProjectInfo, platformInfo: PlatformInfo, logger: Logger) {
    this.projectInfo = projectInfo;
    this.platformInfo = platformInfo;
    this.logger = logger;
  }

  /**
   * Generate standard MCP configuration that works with all MCP clients
   */
  generateStandardMCPConfig(
    envConfig: EnvironmentConfig,
    options: MCPConfigOptions = {}
  ): StandardMCPConfig {
    const serverName = options.serverName || this.generateServerName();
    const serverConfig = this.generateServerConfig(envConfig, options);

    return {
      mcpServers: {
        [serverName]: serverConfig
      }
    };
  }

  /**
   * Generate configuration files for different MCP clients
   */
  generateConfigFiles(
    envConfig: EnvironmentConfig,
    options: MCPConfigOptions = {}
  ): MCPConfigFile[] {
    const standardConfig = this.generateStandardMCPConfig(envConfig, options);
    const serverName = options.serverName || this.generateServerName();

    return [
      {
        name: 'Claude Desktop',
        path: this.getClaudeDesktopConfigPath(),
        config: standardConfig,
        instructions: [
          '1. Save this as claude_desktop_config.json in your Claude Desktop config directory',
          '2. Restart Claude Desktop to load the MCP server',
          '3. Location:',
          `   - Windows: ${path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')}`,
          `   - macOS: ${path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')}`,
          `   - Linux: ${path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json')}`
        ]
      },
      {
        name: 'Cursor',
        path: path.join(this.projectInfo.root, '.cursor', 'mcp.json'),
        config: standardConfig,
        instructions: [
          '1. Save this as .cursor/mcp.json in your project root',
          '2. Restart Cursor to load the MCP server',
          '3. For global configuration, save to ~/.cursor/mcp.json',
          '4. Access via Cursor\'s MCP integration'
        ]
      },
      {
        name: 'Windsurf',
        path: path.join(this.projectInfo.root, '.windsurf', 'mcp.json'),
        config: standardConfig,
        instructions: [
          '1. Save this as .windsurf/mcp.json in your project root',
          '2. Open Windsurf and navigate to Cascade assistant',
          '3. Click the hammer (MCP) icon → Configure',
          '4. Restart Windsurf to load the MCP server'
        ]
      },
      {
        name: 'VS Code',
        path: path.join(this.projectInfo.root, '.vscode', 'mcp.json'),
        config: standardConfig,
        instructions: [
          '1. Save this as .vscode/mcp.json in your project root',
          '2. Install an MCP extension if needed',
          '3. Reload VS Code window to load the MCP server',
          '4. Access via Command Palette: "MCP: Connect to Server"'
        ]
      }
    ];
  }

  /**
   * Generate MCP server configuration
   */
  private generateServerConfig(
    envConfig: EnvironmentConfig,
    options: MCPConfigOptions
  ): MCPServerConfig {
    const command = this.resolveCommand(options);
    const args = this.resolveArgs(options);
    const env = this.generateEnvironmentVariables(envConfig, options);
    const cwd = options.workingDirectory || this.projectInfo.root;

    return {
      command,
      args,
      env,
      cwd
    };
  }

  /**
   * Resolve command for MCP server
   */
  private resolveCommand(options: MCPConfigOptions): string {
    if (options.global) {
      return 'npx';
    }
    
    // For local development, use node directly
    return 'node';
  }

  /**
   * Resolve arguments for MCP server
   */
  private resolveArgs(options: MCPConfigOptions): string[] {
    if (options.global) {
      return [
        '-y',
        '@castplan/ultimate-automation-mcp'
      ];
    }

    // For local development
    if (options.serverPath) {
      return [path.resolve(options.serverPath)];
    }

    // Default to built server
    return [path.join(this.projectInfo.root, 'dist', 'index.js')];
  }

  /**
   * Generate environment variables for MCP server
   */
  private generateEnvironmentVariables(
    envConfig: EnvironmentConfig,
    options: MCPConfigOptions
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // Copy environment configuration
    for (const [key, value] of Object.entries(envConfig.defaults)) {
      env[key] = value;
    }

    // Override with current environment
    for (const [key, value] of Object.entries(envConfig.variables)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Add additional env vars
    if (options.additionalEnv) {
      Object.assign(env, options.additionalEnv);
    }

    // Ensure paths are absolute
    const projectRootKey = `${envConfig.prefix}_PROJECT_ROOT`;
    if (env[projectRootKey]) {
      env[projectRootKey] = path.resolve(env[projectRootKey]);
    }

    const databasePathKey = `${envConfig.prefix}_DATABASE_PATH`;
    if (env[databasePathKey]) {
      env[databasePathKey] = path.resolve(env[databasePathKey]);
    }

    return env;
  }

  /**
   * Install configuration file for specific client
   */
  async installConfigFile(
    configFile: MCPConfigFile,
    options: { backup?: boolean; merge?: boolean } = {}
  ): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(configFile.path), { recursive: true });

    let finalConfig = configFile.config;

    // Handle existing configuration
    if (options.merge) {
      try {
        const existingContent = await fs.readFile(configFile.path, 'utf8');
        const existingConfig = JSON.parse(existingContent) as StandardMCPConfig;
        
        // Merge MCP servers
        finalConfig = {
          mcpServers: {
            ...existingConfig.mcpServers,
            ...configFile.config.mcpServers
          }
        };
      } catch {
        // No existing config or parse error, use new config
      }
    }

    // Backup existing file if requested
    if (options.backup) {
      try {
        await fs.access(configFile.path);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${configFile.path}.backup.${timestamp}`;
        await fs.copyFile(configFile.path, backupPath);
        this.logger.debug(`Backed up ${configFile.name} config to ${backupPath}`);
      } catch {
        // No existing file to backup
      }
    }

    // Write configuration
    await fs.writeFile(
      configFile.path,
      JSON.stringify(finalConfig, null, 2),
      'utf8'
    );

    this.logger.info(`Installed ${configFile.name} config: ${configFile.path}`);
  }

  /**
   * Generate example configuration for manual setup
   */
  generateConfigurationTemplate(
    envConfig: EnvironmentConfig,
    options: MCPConfigOptions = {}
  ): string {
    const config = this.generateStandardMCPConfig(envConfig, options);
    const serverName = options.serverName || this.generateServerName();

    const template = [
      '# CastPlan Ultimate MCP Server Configuration',
      '# Copy this to your MCP client configuration file',
      '',
      '## For Claude Desktop (claude_desktop_config.json):',
      JSON.stringify(config, null, 2),
      '',
      '## For Cursor (.cursor/mcp.json):',
      JSON.stringify(config, null, 2),
      '',
      '## For Windsurf (.windsurf/mcp.json):',
      JSON.stringify(config, null, 2),
      '',
      '## For VS Code (.vscode/mcp.json):',
      JSON.stringify(config, null, 2),
      '',
      '## Installation Instructions:',
      '1. Choose your MCP client (Claude Desktop, Cursor, Windsurf, VS Code)',
      '2. Copy the JSON configuration above',
      '3. Paste it into your client\'s MCP configuration file',
      '4. Restart your client to load the MCP server',
      '',
      `## Server: ${serverName}`,
      `## Project: ${this.projectInfo.name}`,
      `## Environment Prefix: ${envConfig.prefix}`,
    ];

    return template.join('\n');
  }

  /**
   * Get configuration paths
   */
  private getClaudeDesktopConfigPath(): string {
    switch (this.platformInfo.os) {
      case 'windows':
        return path.join(this.platformInfo.homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      case 'macos':
        return path.join(this.platformInfo.homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      case 'linux':
        return path.join(this.platformInfo.homeDir, '.config', 'claude', 'claude_desktop_config.json');
      default:
        return path.join(this.platformInfo.homeDir, '.claude', 'claude_desktop_config.json');
    }
  }

  /**
   * Generate server name
   */
  private generateServerName(): string {
    const baseName = this.projectInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${baseName}-ultimate`;
  }

  /**
   * Validate MCP configuration
   */
  validateConfiguration(config: StandardMCPConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if mcpServers exists
    if (!config.mcpServers) {
      errors.push('Missing mcpServers configuration');
      return { valid: false, errors, warnings };
    }

    // Validate each server
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.command) {
        errors.push(`Missing command for server: ${serverName}`);
      }

      if (!serverConfig.args || serverConfig.args.length === 0) {
        warnings.push(`No arguments specified for server: ${serverName}`);
      }

      // Check for absolute paths in environment
      if (serverConfig.env) {
        for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
          if (envKey.includes('_PROJECT_ROOT') || envKey.includes('_DATABASE_PATH')) {
            if (!path.isAbsolute(envValue)) {
              warnings.push(`Non-absolute path in ${envKey}: ${envValue}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}