/**
 * Claude Desktop Configuration Generator
 *
 * Automatically generates Claude Desktop configuration for MCP server integration
 *
 * Created: 2025-07-31
 */
import { Logger } from 'winston';
import { ClaudeDesktopConfig, ProjectInfo, EnvironmentConfig, PlatformInfo } from './types.ts';
export interface ClaudeConfigGenerationOptions {
    /** Server name in Claude Desktop config */
    serverName?: string;
    /** Server executable path */
    serverPath?: string;
    /** Working directory for the server */
    workingDirectory?: string;
    /** Additional environment variables */
    additionalEnv?: Record<string, string>;
    /** Global installation (vs project-specific) */
    global?: boolean;
    /** Backup existing configuration */
    backup?: boolean;
}
export declare class ClaudeDesktopConfigGenerator {
    private logger;
    private projectInfo;
    private platformInfo;
    constructor(projectInfo: ProjectInfo, platformInfo: PlatformInfo, logger: Logger);
    /**
     * Generate Claude Desktop configuration
     */
    generateConfiguration(envConfig: EnvironmentConfig, options?: ClaudeConfigGenerationOptions): Promise<ClaudeDesktopConfig>;
    /**
     * Generate server name for Claude Desktop configuration
     */
    private generateServerName;
    /**
     * Generate MCP server configuration
     */
    private generateServerConfig;
    /**
     * Resolve server executable path
     */
    private resolveServerPath;
    /**
     * Generate environment variables for Claude Desktop
     */
    private generateEnvironmentVariables;
    /**
     * Detect Claude Desktop configuration file path
     */
    detectClaudeConfigPath(): Promise<string | null>;
    /**
     * Get possible Claude Desktop configuration paths
     */
    private getClaudeConfigPaths;
    /**
     * Load existing Claude Desktop configuration
     */
    loadExistingConfiguration(configPath: string): Promise<ClaudeDesktopConfig>;
    /**
     * Save configuration to Claude Desktop
     */
    saveConfiguration(config: ClaudeDesktopConfig, options?: ClaudeConfigGenerationOptions): Promise<string>;
    /**
     * Get default configuration path for current platform
     */
    private getDefaultConfigPath;
    /**
     * Backup existing configuration
     */
    private backupConfiguration;
    /**
     * Merge configurations, with new config taking precedence
     */
    private mergeConfigurations;
    /**
     * Remove server configuration from Claude Desktop
     */
    removeServerConfiguration(serverName?: string): Promise<void>;
    /**
     * Validate configuration
     */
    validateConfiguration(config: ClaudeDesktopConfig): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Generate configuration template for manual setup
     */
    generateConfigurationTemplate(envConfig: EnvironmentConfig, options?: ClaudeConfigGenerationOptions): string;
}
//# sourceMappingURL=ClaudeDesktopConfigGenerator.d.ts.map