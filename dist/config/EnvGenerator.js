/**
 * Environment Variable Generator
 *
 * Generates dynamic environment variables based on project analysis
 *
 * Created: 2025-07-31
 */
import * as path from 'path';
export class EnvGenerator {
    logger;
    projectInfo;
    constructor(projectInfo, logger) {
        this.projectInfo = projectInfo;
        this.logger = logger;
    }
    /**
     * Generate environment configuration
     */
    generateEnvironmentConfig(options = {}) {
        const prefix = this.generatePrefix(options.prefix);
        const variables = this.generateEnvironmentVariables(prefix, options);
        const defaults = this.generateDefaultValues(prefix, options);
        this.logger.debug(`Generated environment config with prefix: ${prefix}`);
        return {
            prefix,
            variables,
            defaults
        };
    }
    /**
     * Generate environment variable prefix based on project name
     */
    generatePrefix(customPrefix) {
        if (customPrefix) {
            return this.sanitizePrefix(customPrefix);
        }
        // Generate from project name
        const sanitized = this.sanitizePrefix(this.projectInfo.name);
        // Ensure it's not too generic
        if (sanitized.length < 3) {
            return 'PROJECT';
        }
        // Avoid common conflicts
        const conflicts = ['NODE', 'NPM', 'PATH', 'HOME', 'USER', 'TEMP', 'TMP'];
        if (conflicts.includes(sanitized)) {
            return `${sanitized}_MCP`;
        }
        return sanitized;
    }
    /**
     * Sanitize prefix for environment variable usage
     */
    sanitizePrefix(prefix) {
        return prefix
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
            .replace(/_+/g, '_') // Collapse multiple underscores
            .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    }
    /**
     * Generate environment variables map from current environment
     */
    generateEnvironmentVariables(prefix, options) {
        const variables = {};
        // Get all environment variables with our prefix
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(`${prefix}_`)) {
                variables[key] = value;
            }
        }
        return variables;
    }
    /**
     * Generate default environment variables
     */
    generateDefaultValues(prefix, options) {
        const defaults = {};
        // Core configuration
        defaults[`${prefix}_PROJECT_ROOT`] = this.projectInfo.root;
        defaults[`${prefix}_PROJECT_NAME`] = this.projectInfo.name.toLowerCase();
        // Database path
        defaults[`${prefix}_DATABASE_PATH`] = path.join(this.projectInfo.root, '.castplan', 'data.db');
        // Service toggles
        defaults[`${prefix}_ENABLE_BMAD`] = 'true';
        defaults[`${prefix}_ENABLE_DOCS`] = 'true';
        defaults[`${prefix}_ENABLE_HOOKS`] = 'true';
        defaults[`${prefix}_ENABLE_ENHANCED`] = 'true';
        // AI configuration (disabled by default for wider compatibility)
        if (options.includeAI) {
            defaults[`${prefix}_ENABLE_AI`] = 'false';
            defaults[`${prefix}_AI_PROVIDER`] = 'openai';
            defaults[`${prefix}_AI_MODEL`] = 'gpt-4';
            // Note: API key should be set manually by user
        }
        else {
            defaults[`${prefix}_ENABLE_AI`] = 'false';
        }
        // Localization (use system defaults)
        defaults[`${prefix}_TIMEZONE`] = this.detectTimezone();
        defaults[`${prefix}_LOCALE`] = this.detectLocale();
        // Logging
        defaults[`${prefix}_LOG_LEVEL`] = options.target === 'development' ? 'debug' : 'info';
        if (options.includeDevelopment) {
            defaults[`${prefix}_LOG_FILE`] = path.join(this.projectInfo.root, '.castplan', 'logs', 'server.log');
        }
        // Performance settings
        defaults[`${prefix}_ENABLE_CACHE`] = 'true';
        defaults[`${prefix}_MAX_CONCURRENT`] = '5';
        // Watch mode (enabled for development)
        if (options.target === 'development' || options.includeDevelopment) {
            defaults[`${prefix}_WATCH_MODE`] = 'true';
            defaults[`${prefix}_WATCH_PATTERNS`] = this.generateWatchPatterns().join(',');
            defaults[`${prefix}_WATCH_IGNORED`] = this.generateIgnorePatterns().join(',');
        }
        else {
            defaults[`${prefix}_WATCH_MODE`] = 'false';
        }
        return defaults;
    }
    /**
     * Detect system timezone
     */
    detectTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        }
        catch {
            return 'UTC';
        }
    }
    /**
     * Detect system locale
     */
    detectLocale() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
        }
        catch {
            return 'en-US';
        }
    }
    /**
     * Generate watch patterns based on project type
     */
    generateWatchPatterns() {
        const patterns = ['**/*.md', '**/README.md'];
        // Add type-specific patterns
        switch (this.projectInfo.type) {
            case 'node':
                patterns.push('**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.json');
                break;
            case 'python':
                patterns.push('**/*.py', '**/*.pyi', '**/*.toml', '**/*.txt');
                break;
            case 'mixed':
                patterns.push('**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.json');
                patterns.push('**/*.py', '**/*.pyi', '**/*.toml', '**/*.txt');
                break;
        }
        // Add framework-specific patterns
        if (this.projectInfo.framework) {
            switch (this.projectInfo.framework) {
                case 'react':
                case 'vue':
                    patterns.push('**/components/**/*', '**/pages/**/*', '**/styles/**/*');
                    break;
                case 'express':
                    patterns.push('**/routes/**/*', '**/middleware/**/*', '**/controllers/**/*');
                    break;
            }
        }
        return [...new Set(patterns)];
    }
    /**
     * Generate ignore patterns
     */
    generateIgnorePatterns() {
        return [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/coverage/**',
            '**/__pycache__/**',
            '**/*.pyc',
            '**/venv/**',
            '**/.venv/**',
            '**/env/**',
            '**/.env/**'
        ];
    }
    /**
     * Generate .env file content
     */
    generateEnvFile(options = {}) {
        const config = this.generateEnvironmentConfig(options);
        const lines = [];
        // Add header comment
        lines.push(`# ${this.projectInfo.name} Environment Configuration`);
        lines.push(`# Generated on ${new Date().toISOString()}`);
        lines.push('');
        // Add project information
        lines.push('# Project Information');
        lines.push(`${config.prefix}_PROJECT_ROOT=${config.defaults[`${config.prefix}_PROJECT_ROOT`]}`);
        lines.push(`${config.prefix}_PROJECT_NAME=${config.defaults[`${config.prefix}_PROJECT_NAME`]}`);
        lines.push('');
        // Add service configuration
        lines.push('# Service Configuration');
        lines.push(`${config.prefix}_ENABLE_BMAD=${config.defaults[`${config.prefix}_ENABLE_BMAD`]}`);
        lines.push(`${config.prefix}_ENABLE_DOCS=${config.defaults[`${config.prefix}_ENABLE_DOCS`]}`);
        lines.push(`${config.prefix}_ENABLE_HOOKS=${config.defaults[`${config.prefix}_ENABLE_HOOKS`]}`);
        lines.push(`${config.prefix}_ENABLE_ENHANCED=${config.defaults[`${config.prefix}_ENABLE_ENHANCED`]}`);
        lines.push('');
        // Add AI configuration
        lines.push('# AI Configuration (Optional)');
        lines.push(`${config.prefix}_ENABLE_AI=${config.defaults[`${config.prefix}_ENABLE_AI`]}`);
        if (options.includeAI) {
            lines.push(`${config.prefix}_AI_PROVIDER=${config.defaults[`${config.prefix}_AI_PROVIDER`]}`);
            lines.push(`${config.prefix}_AI_MODEL=${config.defaults[`${config.prefix}_AI_MODEL`]}`);
            lines.push(`# ${config.prefix}_AI_API_KEY=your_api_key_here`);
        }
        lines.push('');
        // Add localization
        lines.push('# Localization');
        lines.push(`${config.prefix}_TIMEZONE=${config.defaults[`${config.prefix}_TIMEZONE`]}`);
        lines.push(`${config.prefix}_LOCALE=${config.defaults[`${config.prefix}_LOCALE`]}`);
        lines.push('');
        // Add logging
        lines.push('# Logging');
        lines.push(`${config.prefix}_LOG_LEVEL=${config.defaults[`${config.prefix}_LOG_LEVEL`]}`);
        if (config.defaults[`${config.prefix}_LOG_FILE`]) {
            lines.push(`${config.prefix}_LOG_FILE=${config.defaults[`${config.prefix}_LOG_FILE`]}`);
        }
        lines.push('');
        // Add performance settings
        lines.push('# Performance');
        lines.push(`${config.prefix}_ENABLE_CACHE=${config.defaults[`${config.prefix}_ENABLE_CACHE`]}`);
        lines.push(`${config.prefix}_MAX_CONCURRENT=${config.defaults[`${config.prefix}_MAX_CONCURRENT`]}`);
        lines.push('');
        // Add watch mode settings
        if (config.defaults[`${config.prefix}_WATCH_MODE`]) {
            lines.push('# Watch Mode');
            lines.push(`${config.prefix}_WATCH_MODE=${config.defaults[`${config.prefix}_WATCH_MODE`]}`);
            if (config.defaults[`${config.prefix}_WATCH_PATTERNS`]) {
                lines.push(`${config.prefix}_WATCH_PATTERNS=${config.defaults[`${config.prefix}_WATCH_PATTERNS`]}`);
            }
            if (config.defaults[`${config.prefix}_WATCH_IGNORED`]) {
                lines.push(`${config.prefix}_WATCH_IGNORED=${config.defaults[`${config.prefix}_WATCH_IGNORED`]}`);
            }
            lines.push('');
        }
        // Add database path
        lines.push('# Database');
        lines.push(`${config.prefix}_DATABASE_PATH=${config.defaults[`${config.prefix}_DATABASE_PATH`]}`);
        return lines.join('\n');
    }
    /**
     * Generate shell export script
     */
    generateShellExports(options = {}) {
        const config = this.generateEnvironmentConfig(options);
        const lines = [];
        lines.push(`#!/bin/bash`);
        lines.push(`# ${this.projectInfo.name} Environment Variables`);
        lines.push(`# Generated on ${new Date().toISOString()}`);
        lines.push('');
        for (const [key, value] of Object.entries(config.defaults)) {
            lines.push(`export ${key}="${value}"`);
        }
        return lines.join('\n');
    }
    /**
     * Generate PowerShell script
     */
    generatePowerShellScript(options = {}) {
        const config = this.generateEnvironmentConfig(options);
        const lines = [];
        lines.push(`# ${this.projectInfo.name} Environment Variables`);
        lines.push(`# Generated on ${new Date().toISOString()}`);
        lines.push('');
        for (const [key, value] of Object.entries(config.defaults)) {
            lines.push(`$env:${key} = "${value}"`);
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=EnvGenerator.js.map