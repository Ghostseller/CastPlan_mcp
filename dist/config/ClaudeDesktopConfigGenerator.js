/**
 * Claude Desktop Configuration Generator
 *
 * Automatically generates Claude Desktop configuration for MCP server integration
 *
 * Created: 2025-07-31
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export class ClaudeDesktopConfigGenerator {
    logger;
    projectInfo;
    platformInfo;
    constructor(projectInfo, platformInfo, logger) {
        this.projectInfo = projectInfo;
        this.platformInfo = platformInfo;
        this.logger = logger;
    }
    /**
     * Generate Claude Desktop configuration
     */
    async generateConfiguration(envConfig, options = {}) {
        const serverName = options.serverName || this.generateServerName();
        const serverConfig = this.generateServerConfig(envConfig, options);
        const config = {
            mcpServers: {
                [serverName]: serverConfig
            }
        };
        this.logger.debug(`Generated Claude Desktop config for server: ${serverName}`);
        return config;
    }
    /**
     * Generate server name for Claude Desktop configuration
     */
    generateServerName() {
        const baseName = this.projectInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${baseName}-ultimate`;
    }
    /**
     * Generate MCP server configuration
     */
    generateServerConfig(envConfig, options) {
        const serverPath = this.resolveServerPath(options);
        const env = this.generateEnvironmentVariables(envConfig, options);
        const workingDirectory = options.workingDirectory || this.projectInfo.root;
        return {
            command: 'node',
            args: [serverPath],
            env,
            cwd: workingDirectory
        };
    }
    /**
     * Resolve server executable path
     */
    resolveServerPath(options) {
        if (options.serverPath) {
            return path.resolve(options.serverPath);
        }
        if (options.global) {
            // Global installation - use npx or direct path
            return 'npx @castplan/ultimate-automation start';
        }
        // Project-specific installation
        const distPath = path.join(this.projectInfo.root, 'dist', 'index.js');
        const srcPath = path.join(this.projectInfo.root, 'src', 'index.ts');
        // Check if compiled version exists
        try {
            require.resolve(distPath);
            return distPath;
        }
        catch {
            // Fallback to source (development mode)
            return srcPath;
        }
    }
    /**
     * Generate environment variables for Claude Desktop
     */
    generateEnvironmentVariables(envConfig, options) {
        const env = {};
        // Copy default environment variables
        for (const [key, value] of Object.entries(envConfig.defaults)) {
            env[key] = value;
        }
        // Override with current environment variables
        for (const [key, value] of Object.entries(envConfig.variables)) {
            if (value !== undefined) {
                env[key] = value;
            }
        }
        // Add additional environment variables
        if (options.additionalEnv) {
            Object.assign(env, options.additionalEnv);
        }
        // Ensure critical paths are absolute
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
     * Detect Claude Desktop configuration file path
     */
    async detectClaudeConfigPath() {
        const possiblePaths = this.getClaudeConfigPaths();
        for (const configPath of possiblePaths) {
            try {
                await fs.access(configPath);
                this.logger.debug(`Found Claude Desktop config at: ${configPath}`);
                return configPath;
            }
            catch {
                // Continue to next path
            }
        }
        this.logger.warn('Claude Desktop configuration file not found');
        return null;
    }
    /**
     * Get possible Claude Desktop configuration paths
     */
    getClaudeConfigPaths() {
        const homeDir = this.platformInfo.homeDir;
        switch (this.platformInfo.os) {
            case 'windows':
                return [
                    path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
                    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
                ];
            case 'macos':
                return [
                    path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
                ];
            case 'linux':
                return [
                    path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json'),
                    path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), 'claude', 'claude_desktop_config.json')
                ];
            default:
                return [
                    path.join(homeDir, '.claude', 'claude_desktop_config.json')
                ];
        }
    }
    /**
     * Load existing Claude Desktop configuration
     */
    async loadExistingConfiguration(configPath) {
        try {
            const content = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(content);
            // Ensure mcpServers exists
            if (!config.mcpServers) {
                config.mcpServers = {};
            }
            return config;
        }
        catch (error) {
            this.logger.warn(`Failed to load existing Claude config: ${error}`);
            return { mcpServers: {} };
        }
    }
    /**
     * Save configuration to Claude Desktop
     */
    async saveConfiguration(config, options = {}) {
        const configPath = await this.detectClaudeConfigPath() || this.getDefaultConfigPath();
        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        // Backup existing configuration if requested
        if (options.backup) {
            await this.backupConfiguration(configPath);
        }
        // Load existing configuration and merge
        const existingConfig = await this.loadExistingConfiguration(configPath);
        const mergedConfig = this.mergeConfigurations(existingConfig, config);
        // Write configuration
        await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
        this.logger.info(`Claude Desktop configuration saved to: ${configPath}`);
        return configPath;
    }
    /**
     * Get default configuration path for current platform
     */
    getDefaultConfigPath() {
        const paths = this.getClaudeConfigPaths();
        return paths[0]; // Use first (primary) path
    }
    /**
     * Backup existing configuration
     */
    async backupConfiguration(configPath) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${configPath}.backup.${timestamp}`;
            await fs.copyFile(configPath, backupPath);
            this.logger.info(`Configuration backed up to: ${backupPath}`);
        }
        catch (error) {
            this.logger.warn(`Failed to backup configuration: ${error}`);
        }
    }
    /**
     * Merge configurations, with new config taking precedence
     */
    mergeConfigurations(existing, newConfig) {
        return {
            ...existing,
            mcpServers: {
                ...existing.mcpServers,
                ...newConfig.mcpServers
            }
        };
    }
    /**
     * Remove server configuration from Claude Desktop
     */
    async removeServerConfiguration(serverName) {
        const configPath = await this.detectClaudeConfigPath();
        if (!configPath) {
            this.logger.warn('Claude Desktop configuration not found');
            return;
        }
        const config = await this.loadExistingConfiguration(configPath);
        const targetServerName = serverName || this.generateServerName();
        if (config.mcpServers[targetServerName]) {
            delete config.mcpServers[targetServerName];
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
            this.logger.info(`Removed server configuration: ${targetServerName}`);
        }
        else {
            this.logger.warn(`Server configuration not found: ${targetServerName}`);
        }
    }
    /**
     * Validate configuration
     */
    validateConfiguration(config) {
        const errors = [];
        const warnings = [];
        // Check required fields
        if (!config.mcpServers) {
            errors.push('Missing mcpServers configuration');
            return { valid: false, errors, warnings };
        }
        // Validate each server configuration
        for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
            if (!serverConfig.command) {
                errors.push(`Missing command for server: ${serverName}`);
            }
            if (!serverConfig.args || serverConfig.args.length === 0) {
                warnings.push(`No arguments specified for server: ${serverName}`);
            }
            // Check if server path exists (if it's a file path)
            if (serverConfig.args.length > 0) {
                const serverPath = serverConfig.args[0];
                if (serverPath && path.isAbsolute(serverPath)) {
                    // TODO: Add async file existence check if needed
                }
            }
            // Validate environment variables
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
    /**
     * Generate configuration template for manual setup
     */
    generateConfigurationTemplate(envConfig, options = {}) {
        const config = this.generateServerConfig(envConfig, options);
        const serverName = options.serverName || this.generateServerName();
        const template = {
            mcpServers: {
                [serverName]: config
            }
        };
        return JSON.stringify(template, null, 2);
    }
}
//# sourceMappingURL=ClaudeDesktopConfigGenerator.js.map