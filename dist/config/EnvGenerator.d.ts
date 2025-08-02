/**
 * Environment Variable Generator
 *
 * Generates dynamic environment variables based on project analysis
 *
 * Created: 2025-07-31
 */
import { Logger } from 'winston';
import { EnvironmentConfig, ProjectInfo } from './types.js';
export interface EnvGenerationOptions {
    /** Custom environment prefix */
    prefix?: string;
    /** Include development settings */
    includeDevelopment?: boolean;
    /** Include AI configuration */
    includeAI?: boolean;
    /** Environment target (development, production, test) */
    target?: 'development' | 'production' | 'test';
}
export declare class EnvGenerator {
    private logger;
    private projectInfo;
    constructor(projectInfo: ProjectInfo, logger: Logger);
    /**
     * Generate environment configuration
     */
    generateEnvironmentConfig(options?: EnvGenerationOptions): EnvironmentConfig;
    /**
     * Generate environment variable prefix based on project name
     */
    private generatePrefix;
    /**
     * Sanitize prefix for environment variable usage
     */
    private sanitizePrefix;
    /**
     * Generate environment variables map from current environment
     */
    private generateEnvironmentVariables;
    /**
     * Generate default environment variables
     */
    private generateDefaultValues;
    /**
     * Detect system timezone
     */
    private detectTimezone;
    /**
     * Detect system locale
     */
    private detectLocale;
    /**
     * Generate watch patterns based on project type
     */
    private generateWatchPatterns;
    /**
     * Generate ignore patterns
     */
    private generateIgnorePatterns;
    /**
     * Generate .env file content
     */
    generateEnvFile(options?: EnvGenerationOptions): string;
    /**
     * Generate shell export script
     */
    generateShellExports(options?: EnvGenerationOptions): string;
    /**
     * Generate PowerShell script
     */
    generatePowerShellScript(options?: EnvGenerationOptions): string;
}
//# sourceMappingURL=EnvGenerator.d.ts.map