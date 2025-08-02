/**
 * Configuration Manager
 *
 * Main orchestrator for the universal configuration system
 * Coordinates all configuration components for CastPlan Ultimate MCP server
 *
 * Created: 2025-07-31
 */
import { UniversalConfig, ConfigurationManagerOptions, ConfigValidationResult, ClaudeDesktopConfig } from './types.js';
import { MCPConfigFile } from './StandardMCPConfigGenerator.js';
export declare class ConfigurationManager {
    private logger;
    private projectRoot;
    private configFileName;
    private options;
    private projectAnalyzer;
    private packageManagerDetector;
    private envGenerator;
    private claudeConfigGenerator?;
    private standardMCPGenerator?;
    private _config;
    constructor(options: ConfigurationManagerOptions);
    /**
     * Initialize configuration system and generate universal config
     */
    initialize(): Promise<UniversalConfig>;
    /**
     * Generate universal configuration from project analysis
     */
    private generateConfiguration;
    /**
     * Generate service configuration with all services enabled by default
     */
    private generateServiceConfig;
    /**
     * Convert PackageManagerDetector result to ConfigurationManager format
     */
    private convertPackageManagerInfo;
    /**
     * Generate runtime configuration
     */
    private generateRuntimeConfig;
    /**
     * Extract prefix from environment defaults
     */
    private extractPrefixFromDefaults;
    /**
     * Detect platform information
     */
    private detectPlatformInfo;
    /**
     * Load existing configuration from file
     */
    private loadExistingConfig;
    /**
     * Check if existing configuration is compatible
     */
    private isConfigCompatible;
    /**
     * Save configuration to file
     */
    private saveConfiguration;
    /**
     * Validate configuration
     */
    validateConfiguration(config?: UniversalConfig): Promise<ConfigValidationResult>;
    /**
     * Generate Claude Desktop configuration
     */
    generateClaudeDesktopConfig(options?: {
        serverName?: string;
        global?: boolean;
        backup?: boolean;
    }): Promise<ClaudeDesktopConfig>;
    /**
     * Install Claude Desktop configuration
     */
    installClaudeDesktopConfig(options?: {
        serverName?: string;
        global?: boolean;
        backup?: boolean;
    }): Promise<string>;
    /**
     * Generate environment files
     */
    generateEnvironmentFiles(target?: 'development' | 'production' | 'test'): Promise<{
        envFile: string;
        shellScript: string;
        powershellScript: string;
    }>;
    /**
     * Write environment files to disk
     */
    writeEnvironmentFiles(outputDir?: string, target?: 'development' | 'production' | 'test'): Promise<{
        envPath: string;
        shellPath: string;
        powershellPath: string;
    }>;
    /**
     * Get current configuration
     */
    getConfiguration(): UniversalConfig | null;
    /**
     * Update configuration
     */
    updateConfiguration(updates: Partial<UniversalConfig>): Promise<UniversalConfig>;
    /**
     * Deep merge two objects
     */
    private deepMerge;
    /**
     * Reset configuration (force regeneration)
     */
    resetConfiguration(): Promise<UniversalConfig>;
    /**
     * Export configuration for external use
     */
    exportConfiguration(format?: 'json' | 'yaml'): string;
    /**
     * Generate standard MCP configuration files for all clients
     */
    generateMCPConfigFiles(options?: {
        serverName?: string;
        global?: boolean;
        serverPath?: string;
        additionalEnv?: Record<string, string>;
    }): Promise<MCPConfigFile[]>;
    /**
     * Install MCP configuration files for specific clients
     */
    installMCPConfigs(options?: {
        clients?: string[];
        serverName?: string;
        global?: boolean;
        backup?: boolean;
        merge?: boolean;
    }): Promise<{
        success: string[];
        failed: {
            client: string;
            error: string;
        }[];
    }>;
    /**
     * Generate MCP configuration template for manual setup
     */
    generateMCPConfigTemplate(options?: {
        serverName?: string;
        global?: boolean;
        serverPath?: string;
    }): string;
    /**
     * Get configuration summary for logging/debugging
     */
    getConfigurationSummary(): string;
}
//# sourceMappingURL=ConfigurationManager.d.ts.map