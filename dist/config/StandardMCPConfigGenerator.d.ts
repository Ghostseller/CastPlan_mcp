/**
 * Standard MCP Configuration Generator
 *
 * Generates standard MCP server configurations following the official MCP protocol
 * Works with Claude Desktop, Cursor, Windsurf, VS Code, and other MCP clients
 *
 * Created: 2025-07-31
 */
import { Logger } from 'winston';
import { ProjectInfo, EnvironmentConfig, PlatformInfo } from './types.js';
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
export declare class StandardMCPConfigGenerator {
    private logger;
    private projectInfo;
    private platformInfo;
    constructor(projectInfo: ProjectInfo, platformInfo: PlatformInfo, logger: Logger);
    /**
     * Generate standard MCP configuration that works with all MCP clients
     */
    generateStandardMCPConfig(envConfig: EnvironmentConfig, options?: MCPConfigOptions): StandardMCPConfig;
    /**
     * Generate configuration files for different MCP clients
     */
    generateConfigFiles(envConfig: EnvironmentConfig, options?: MCPConfigOptions): MCPConfigFile[];
    /**
     * Generate MCP server configuration
     */
    private generateServerConfig;
    /**
     * Resolve command for MCP server
     */
    private resolveCommand;
    /**
     * Resolve arguments for MCP server
     */
    private resolveArgs;
    /**
     * Generate environment variables for MCP server
     */
    private generateEnvironmentVariables;
    /**
     * Install configuration file for specific client
     */
    installConfigFile(configFile: MCPConfigFile, options?: {
        backup?: boolean;
        merge?: boolean;
    }): Promise<void>;
    /**
     * Generate example configuration for manual setup
     */
    generateConfigurationTemplate(envConfig: EnvironmentConfig, options?: MCPConfigOptions): string;
    /**
     * Get configuration paths
     */
    private getClaudeDesktopConfigPath;
    /**
     * Generate server name
     */
    private generateServerName;
    /**
     * Validate MCP configuration
     */
    validateConfiguration(config: StandardMCPConfig): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=StandardMCPConfigGenerator.d.ts.map