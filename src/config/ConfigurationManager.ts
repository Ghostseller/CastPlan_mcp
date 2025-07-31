/**
 * Configuration Manager
 * 
 * Main orchestrator for the universal configuration system
 * Coordinates all configuration components for CastPlan Ultimate MCP server
 * 
 * Created: 2025-07-31
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from 'winston';
import { 
  UniversalConfig, 
  ConfigurationManagerOptions, 
  ProjectInfo, 
  PlatformInfo, 
  ServiceConfig, 
  RuntimeConfig, 
  ConfigValidationResult,
  CastPlanConfigFile,
  ClaudeDesktopConfig,
  PackageManagerType,
  PackageManagerInfo
} from './types.js';
import { ProjectAnalyzer } from './ProjectAnalyzer.js';
import { PackageManagerDetector, DetectionResult } from './PackageManagerDetector.js';
import { EnvGenerator } from './EnvGenerator.js';
import { ClaudeDesktopConfigGenerator } from './ClaudeDesktopConfigGenerator.js';
import { StandardMCPConfigGenerator, MCPConfigFile } from './StandardMCPConfigGenerator.js';

export class ConfigurationManager {
  private logger: Logger;
  private projectRoot: string;
  private configFileName: string;
  private options: ConfigurationManagerOptions;
  
  private projectAnalyzer: ProjectAnalyzer;
  private packageManagerDetector: PackageManagerDetector;
  private envGenerator!: EnvGenerator;
  private claudeConfigGenerator?: ClaudeDesktopConfigGenerator;
  private standardMCPGenerator?: StandardMCPConfigGenerator;
  
  private _config: UniversalConfig | null = null;

  constructor(options: ConfigurationManagerOptions) {
    this.options = options;
    this.logger = options.logger;
    this.projectRoot = path.resolve(options.projectRoot || process.cwd());
    this.configFileName = options.configFileName || 'castplan.config.json';
    
    // Initialize components
    this.projectAnalyzer = new ProjectAnalyzer(this.projectRoot, this.logger);
    this.packageManagerDetector = new PackageManagerDetector();
  }

  /**
   * Initialize configuration system and generate universal config
   */
  async initialize(): Promise<UniversalConfig> {
    try {
      this.logger.info('Initializing CastPlan Ultimate configuration system...');
      
      // Check if we should skip auto-detection and load existing config
      if (!this.options.skipAutoDetection && !this.options.forceRegenerate) {
        const existingConfig = await this.loadExistingConfig();
        if (existingConfig) {
          this.logger.info('Loaded existing configuration');
          this._config = existingConfig;
          return existingConfig;
        }
      }

      // Generate new configuration
      const config = await this.generateConfiguration();
      this._config = config;
      
      // Save configuration for future use
      await this.saveConfiguration(config);
      
      this.logger.info('Configuration system initialized successfully');
      return config;
    } catch (error) {
      this.logger.error('Failed to initialize configuration system:', error);
      throw error;
    }
  }

  /**
   * Generate universal configuration from project analysis
   */
  private async generateConfiguration(): Promise<UniversalConfig> {
    this.logger.debug('Generating universal configuration...');

    // Run parallel analysis
    const [
      projectAnalysis,
      packageManagerInfo,
      platformInfo
    ] = await Promise.all([
      this.projectAnalyzer.analyzeProject(),
      this.packageManagerDetector.detectAvailableManagers(),
      this.detectPlatformInfo()
    ]);

    // Initialize env generator with project info
    this.envGenerator = new EnvGenerator(projectAnalysis.projectInfo, this.logger);
    
    // Generate environment configuration
    const envConfig = this.envGenerator.generateEnvironmentConfig({
      target: 'development',
      includeDevelopment: true,
      includeAI: false // Default to false for wider compatibility
    });

    // Initialize config generators
    this.claudeConfigGenerator = new ClaudeDesktopConfigGenerator(
      projectAnalysis.projectInfo,
      platformInfo,
      this.logger
    );

    this.standardMCPGenerator = new StandardMCPConfigGenerator(
      projectAnalysis.projectInfo,
      platformInfo,
      this.logger
    );

    // Build universal configuration
    const config: UniversalConfig = {
      projectInfo: projectAnalysis.projectInfo,
      services: this.generateServiceConfig(),
      runtime: await this.generateRuntimeConfig(projectAnalysis.projectInfo, envConfig.defaults),
      platform: platformInfo,
      environment: envConfig,
      packageManager: this.convertPackageManagerInfo(packageManagerInfo),
      source: {
        type: 'auto-generated',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        priority: 1
      }
    };

    this.logger.debug(`Generated configuration with confidence: ${projectAnalysis.confidence}`);
    return config;
  }

  /**
   * Generate service configuration with all services enabled by default
   */
  private generateServiceConfig(): ServiceConfig {
    return {
      bmad: true,
      documentation: true,
      hooks: true,
      enhanced: true
    };
  }

  /**
   * Convert PackageManagerDetector result to ConfigurationManager format
   */
  private convertPackageManagerInfo(detectionResult: DetectionResult): PackageManagerInfo {
    const availableManagers: PackageManagerType[] = detectionResult.managers
      .filter((m: any) => m.available)
      .map((m: any) => m.name as PackageManagerType);

    const primaryManager = detectionResult.recommended?.name || availableManagers[0] || 'npm';

    const configs = {} as Record<PackageManagerType, any>;
    
    // Initialize all possible managers with defaults
    const allManagers: PackageManagerType[] = ['npm', 'yarn', 'pnpm', 'uv', 'uvx', 'pip'];
    for (const managerName of allManagers) {
      configs[managerName] = {
        name: managerName,
        installCommand: managerName === 'yarn' ? 'yarn global add' : `${managerName} install -g`,
        runCommand: managerName === 'yarn' ? 'yarn' : `${managerName} run`,
        configPath: ['uv', 'uvx', 'pip'].includes(managerName) ? 'pyproject.toml' : 'package.json',
        lockFile: managerName === 'npm' ? 'package-lock.json' :
                  managerName === 'yarn' ? 'yarn.lock' :
                  managerName === 'pnpm' ? 'pnpm-lock.yaml' :
                  undefined,
        available: false,
        version: undefined
      };
    }
    
    // Override with detected manager info
    for (const manager of detectionResult.managers) {
      const managerName = manager.name as PackageManagerType;
      if (configs[managerName]) {
        configs[managerName] = {
          ...configs[managerName],
          installCommand: manager.installCommand.join(' '),
          available: manager.available,
          version: manager.version
        };
      }
    }

    return {
      primary: primaryManager as PackageManagerType,
      available: availableManagers,
      configs
    };
  }

  /**
   * Generate runtime configuration
   */
  private async generateRuntimeConfig(
    projectInfo: ProjectInfo, 
    envDefaults: Record<string, string>
  ): Promise<RuntimeConfig> {
    const prefix = this.extractPrefixFromDefaults(envDefaults);
    
    return {
      databasePath: envDefaults[`${prefix}_DATABASE_PATH`] || 
                   path.join(projectInfo.root, '.castplan', 'data.db'),
      ai: {
        enabled: envDefaults[`${prefix}_ENABLE_AI`] === 'true',
        provider: (envDefaults[`${prefix}_AI_PROVIDER`] as any) || 'openai',
        model: envDefaults[`${prefix}_AI_MODEL`] || 'gpt-4'
      },
      localization: {
        timezone: envDefaults[`${prefix}_TIMEZONE`] || 'UTC',
        locale: envDefaults[`${prefix}_LOCALE`] || 'en-US'
      },
      logging: {
        level: (envDefaults[`${prefix}_LOG_LEVEL`] as any) || 'info',
        file: envDefaults[`${prefix}_LOG_FILE`]
      },
      performance: {
        cacheEnabled: envDefaults[`${prefix}_ENABLE_CACHE`] === 'true',
        maxConcurrentOperations: parseInt(envDefaults[`${prefix}_MAX_CONCURRENT`] || '5')
      },
      watchMode: {
        enabled: envDefaults[`${prefix}_WATCH_MODE`] === 'true',
        patterns: envDefaults[`${prefix}_WATCH_PATTERNS`]?.split(','),
        ignored: envDefaults[`${prefix}_WATCH_IGNORED`]?.split(',')
      }
    };
  }

  /**
   * Extract prefix from environment defaults
   */
  private extractPrefixFromDefaults(envDefaults: Record<string, string>): string {
    const keys = Object.keys(envDefaults);
    const projectRootKey = keys.find(key => key.endsWith('_PROJECT_ROOT'));
    if (projectRootKey) {
      return projectRootKey.replace('_PROJECT_ROOT', '');
    }
    return 'CASTPLAN'; // Fallback
  }

  /**
   * Detect platform information
   */
  private async detectPlatformInfo(): Promise<PlatformInfo> {
    const platform = os.platform();
    let osType: PlatformInfo['os'];
    let executableExt: string;
    let configDir: string;

    switch (platform) {
      case 'win32':
        osType = 'windows';
        executableExt = '.exe';
        configDir = path.join(os.homedir(), 'AppData', 'Roaming');
        break;
      case 'darwin':
        osType = 'macos';
        executableExt = '';
        configDir = path.join(os.homedir(), 'Library', 'Application Support');
        break;
      case 'linux':
        osType = 'linux';
        executableExt = '';
        configDir = path.join(os.homedir(), '.config');
        break;
      default:
        osType = 'unknown';
        executableExt = '';
        configDir = path.join(os.homedir(), '.config');
    }

    return {
      os: osType,
      arch: os.arch(),
      pathSeparator: path.sep,
      homeDir: os.homedir(),
      configDir,
      executableExt
    };
  }

  /**
   * Load existing configuration from file
   */
  private async loadExistingConfig(): Promise<UniversalConfig | null> {
    try {
      const configPath = path.join(this.projectRoot, this.configFileName);
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent) as UniversalConfig;
      
      // Validate configuration version compatibility
      if (this.isConfigCompatible(config)) {
        return config;
      } else {
        this.logger.warn('Existing configuration is incompatible, regenerating...');
        return null;
      }
    } catch {
      // No existing config or read error
      return null;
    }
  }

  /**
   * Check if existing configuration is compatible
   */
  private isConfigCompatible(config: UniversalConfig): boolean {
    // Basic compatibility checks
    return !!(
      config.projectInfo &&
      config.services &&
      config.runtime &&
      config.platform &&
      config.environment &&
      config.packageManager
    );
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(config: UniversalConfig): Promise<void> {
    try {
      const configPath = path.join(this.projectRoot, this.configFileName);
      const configContent = JSON.stringify(config, null, 2);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      
      // Write configuration
      await fs.writeFile(configPath, configContent, 'utf8');
      
      this.logger.debug(`Configuration saved to: ${configPath}`);
    } catch (error) {
      this.logger.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(config?: UniversalConfig): Promise<ConfigValidationResult> {
    const targetConfig = config || this._config;
    if (!targetConfig) {
      return {
        valid: false,
        errors: [{ field: 'config', message: 'No configuration available', code: 'NO_CONFIG', suggestion: 'Initialize configuration first' }],
        warnings: []
      };
    }

    const errors = [];
    const warnings = [];

    // Validate project info
    if (!targetConfig.projectInfo.name) {
      errors.push({ field: 'projectInfo.name', message: 'Project name is required', code: 'MISSING_NAME', suggestion: 'Set project name in package.json or provide manually' });
    }

    if (!targetConfig.projectInfo.root || !path.isAbsolute(targetConfig.projectInfo.root)) {
      errors.push({ field: 'projectInfo.root', message: 'Project root must be absolute path', code: 'INVALID_PATH', suggestion: 'Use absolute path for project root' });
    }

    // Validate runtime configuration
    if (!path.isAbsolute(targetConfig.runtime.databasePath)) {
      warnings.push({ field: 'runtime.databasePath', message: 'Database path should be absolute', code: 'RELATIVE_PATH', suggestion: 'Use absolute path for database' });
    }

    // Validate package manager
    if (targetConfig.packageManager.available.length === 0) {
      warnings.push({ field: 'packageManager.available', message: 'No package managers detected', code: 'NO_PACKAGE_MANAGERS', suggestion: 'Install npm, yarn, pnpm, uv, or pip' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate Claude Desktop configuration
   */
  async generateClaudeDesktopConfig(options: {
    serverName?: string;
    global?: boolean;
    backup?: boolean;
  } = {}): Promise<ClaudeDesktopConfig> {
    if (!this._config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    if (!this.claudeConfigGenerator) {
      throw new Error('Claude Desktop config generator not available');
    }

    return await this.claudeConfigGenerator.generateConfiguration(
      this._config.environment,
      options
    );
  }

  /**
   * Install Claude Desktop configuration
   */
  async installClaudeDesktopConfig(options: {
    serverName?: string;
    global?: boolean;
    backup?: boolean;
  } = {}): Promise<string> {
    if (!this.claudeConfigGenerator) {
      throw new Error('Claude Desktop config generator not available');
    }

    const config = await this.generateClaudeDesktopConfig(options);
    return await this.claudeConfigGenerator.saveConfiguration(config, options);
  }

  /**
   * Generate environment files
   */
  async generateEnvironmentFiles(target?: 'development' | 'production' | 'test'): Promise<{
    envFile: string;
    shellScript: string;
    powershellScript: string;
  }> {
    if (!this._config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    const envFile = this.envGenerator.generateEnvFile({
      target: target || 'development',
      includeDevelopment: target === 'development',
      includeAI: this._config.runtime.ai.enabled
    });

    const shellScript = this.envGenerator.generateShellExports({
      target: target || 'development'
    });

    const powershellScript = this.envGenerator.generatePowerShellScript({
      target: target || 'development'
    });

    return {
      envFile,
      shellScript,
      powershellScript
    };
  }

  /**
   * Write environment files to disk
   */
  async writeEnvironmentFiles(
    outputDir?: string,
    target?: 'development' | 'production' | 'test'
  ): Promise<{ envPath: string; shellPath: string; powershellPath: string }> {
    const files = await this.generateEnvironmentFiles(target);
    const outputDirectory = outputDir || path.join(this.projectRoot, '.castplan');

    // Ensure output directory exists
    await fs.mkdir(outputDirectory, { recursive: true });

    // Write files
    const envPath = path.join(outputDirectory, '.env');
    const shellPath = path.join(outputDirectory, 'env.sh');
    const powershellPath = path.join(outputDirectory, 'env.ps1');

    await Promise.all([
      fs.writeFile(envPath, files.envFile, 'utf8'),
      fs.writeFile(shellPath, files.shellScript, 'utf8'),
      fs.writeFile(powershellPath, files.powershellScript, 'utf8')
    ]);

    // Make shell script executable on Unix systems
    if (this._config!.platform.os !== 'windows') {
      try {
        await fs.chmod(shellPath, 0o755);
      } catch {
        // Ignore chmod errors
      }
    }

    this.logger.info(`Environment files written to: ${outputDirectory}`);

    return { envPath, shellPath, powershellPath };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): UniversalConfig | null {
    return this._config;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(updates: Partial<UniversalConfig>): Promise<UniversalConfig> {
    if (!this._config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    // Deep merge updates
    this._config = this.deepMerge(this._config, updates);
    
    // Save updated configuration
    await this.saveConfiguration(this._config);
    
    this.logger.info('Configuration updated successfully');
    return this._config;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];
        
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
            targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue as any;
        }
      }
    }
    
    return result;
  }

  /**
   * Reset configuration (force regeneration)
   */
  async resetConfiguration(): Promise<UniversalConfig> {
    this.logger.info('Resetting configuration...');
    
    // Clear cached config
    this._config = null;
    
    // Force regeneration
    const originalForceRegenerate = this.options.forceRegenerate;
    this.options.forceRegenerate = true;
    
    try {
      const config = await this.initialize();
      return config;
    } finally {
      // Restore original setting
      this.options.forceRegenerate = originalForceRegenerate;
    }
  }

  /**
   * Export configuration for external use
   */
  exportConfiguration(format: 'json' | 'yaml' = 'json'): string {
    if (!this._config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    if (format === 'json') {
      return JSON.stringify(this._config, null, 2);
    } else {
      // For YAML export, we'd need a YAML library
      // For now, just return JSON
      return JSON.stringify(this._config, null, 2);
    }
  }

  /**
   * Generate standard MCP configuration files for all clients
   */
  async generateMCPConfigFiles(options: {
    serverName?: string;
    global?: boolean;
    serverPath?: string;
    additionalEnv?: Record<string, string>;
  } = {}): Promise<MCPConfigFile[]> {
    if (!this._config || !this.standardMCPGenerator) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    return this.standardMCPGenerator.generateConfigFiles(
      this._config.environment,
      options
    );
  }

  /**
   * Install MCP configuration files for specific clients
   */
  async installMCPConfigs(options: {
    clients?: string[]; // 'claude', 'cursor', 'windsurf', 'vscode'
    serverName?: string;
    global?: boolean;
    backup?: boolean;
    merge?: boolean;
  } = {}): Promise<{ success: string[]; failed: { client: string; error: string }[] }> {
    const configFiles = await this.generateMCPConfigFiles(options);
    
    // Filter by requested clients
    const targetFiles = options.clients
      ? configFiles.filter(file => 
          options.clients!.some(client => 
            file.name.toLowerCase().includes(client.toLowerCase())
          )
        )
      : configFiles;

    const success: string[] = [];
    const failed: { client: string; error: string }[] = [];

    for (const configFile of targetFiles) {
      try {
        await this.standardMCPGenerator!.installConfigFile(configFile, {
          backup: options.backup !== false,
          merge: options.merge !== false
        });
        success.push(configFile.name);
      } catch (error) {
        failed.push({ client: configFile.name, error: String(error) });
      }
    }

    return { success, failed };
  }

  /**
   * Generate MCP configuration template for manual setup
   */
  generateMCPConfigTemplate(options: {
    serverName?: string;
    global?: boolean;
    serverPath?: string;
  } = {}): string {
    if (!this._config || !this.standardMCPGenerator) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }

    return this.standardMCPGenerator.generateConfigurationTemplate(
      this._config.environment,
      options
    );
  }

  /**
   * Get configuration summary for logging/debugging
   */
  getConfigurationSummary(): string {
    if (!this._config) {
      return 'Configuration not initialized';
    }

    const summary = [
      `Project: ${this._config.projectInfo.name} (${this._config.projectInfo.type})`,
      `Framework: ${this._config.projectInfo.framework || 'none'}`,
      `Package Manager: ${this._config.packageManager.primary}`,
      `Platform: ${this._config.platform.os} (${this._config.platform.arch})`,
      `Services: ${Object.entries(this._config.services).filter(([_, enabled]) => enabled).map(([name]) => name).join(', ')}`,
      `Environment Prefix: ${this._config.environment.prefix}`
    ];

    return summary.join('\n');
  }
}