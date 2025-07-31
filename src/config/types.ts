/**
 * Configuration Type Definitions
 * 
 * Type definitions for the universal configuration system
 * 
 * Created: 2025-07-31
 */

import { Logger } from 'winston';

export interface UniversalConfig {
  /** Project information */
  projectInfo: ProjectInfo;
  
  /** Service configuration */
  services: ServiceConfig;
  
  /** Runtime configuration */
  runtime: RuntimeConfig;
  
  /** Platform-specific configuration */
  platform: PlatformInfo;
  
  /** Environment configuration */
  environment: EnvironmentConfig;
  
  /** Package manager configuration */
  packageManager: PackageManagerInfo;
  
  /** Configuration source metadata */
  source: ConfigSource;
}

export interface ProjectInfo {
  /** Project name (derived from package.json or directory name) */
  name: string;
  
  /** Absolute path to project root */
  root: string;
  
  /** Project type */
  type: 'node' | 'python' | 'mixed' | 'unknown';
  
  /** Detected framework */
  framework?: 'react' | 'vue' | 'angular' | 'express' | 'fastapi' | 'django' | 'flask';
  
  /** Project version */
  version?: string;
  
  /** Project description */
  description?: string;
}

export interface ServiceConfig {
  /** Enable BMAD service */
  bmad: boolean;
  
  /** Enable Documentation service */
  documentation: boolean;
  
  /** Enable Hooks service */
  hooks: boolean;
  
  /** Enable Enhanced services */
  enhanced: boolean;
}

export interface RuntimeConfig {
  /** Database path */
  databasePath: string;
  
  /** AI configuration */
  ai: {
    enabled: boolean;
    provider?: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model?: string;
  };
  
  /** Localization settings */
  localization: {
    timezone: string;
    locale: string;
  };
  
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  
  /** Performance settings */
  performance: {
    cacheEnabled: boolean;
    maxConcurrentOperations: number;
  };
  
  /** Watch mode settings */
  watchMode: {
    enabled: boolean;
    patterns?: string[];
    ignored?: string[];
  };
}

export interface PlatformInfo {
  /** Operating system */
  os: 'windows' | 'macos' | 'linux' | 'unknown';
  
  /** Architecture */
  arch: string;
  
  /** Path separator */
  pathSeparator: string;
  
  /** Home directory */
  homeDir: string;
  
  /** Configuration directory */
  configDir: string;
  
  /** Executable extension */
  executableExt: string;
}

export interface EnvironmentConfig {
  /** Environment variable prefix (e.g., CASTPLAN_, MYPROJECT_) */
  prefix: string;
  
  /** Environment variables map */
  variables: Record<string, string | undefined>;
  
  /** Default environment variables */
  defaults: Record<string, string>;
}

export interface PackageManagerInfo {
  /** Primary package manager */
  primary: PackageManagerType;
  
  /** Available package managers */
  available: PackageManagerType[];
  
  /** Package manager specific configuration */
  configs: Record<PackageManagerType, PackageManagerConfig>;
}

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'uv' | 'uvx' | 'pip';

export interface PackageManagerConfig {
  /** Package manager name */
  name: PackageManagerType;
  
  /** Install command template */
  installCommand: string;
  
  /** Run command template */
  runCommand: string;
  
  /** Configuration file path */
  configPath: string;
  
  /** Lock file path */
  lockFile?: string;
  
  /** Available in current environment */
  available: boolean;
  
  /** Version */
  version?: string;
}

export interface ConfigSource {
  /** Configuration source type */
  type: 'file' | 'environment' | 'defaults' | 'auto-generated';
  
  /** Source path (for file-based configs) */
  path?: string;
  
  /** Generation timestamp */
  generatedAt: string;
  
  /** Configuration version */
  version: string;
  
  /** Source priority (higher = more important) */
  priority: number;
}

// Configuration file interfaces
export interface CastPlanConfigFile {
  /** Configuration file version */
  version: string;
  
  /** Project configuration override */
  project?: Partial<ProjectInfo>;
  
  /** Service configuration */
  services?: Partial<ServiceConfig>;
  
  /** Runtime configuration */
  runtime?: Partial<RuntimeConfig>;
  
  /** Environment overrides */
  environment?: Record<string, string>;
  
  /** Documentation configuration */
  documentation?: {
    categories?: string[];
    patterns?: string[];
    excludePatterns?: string[];
  };
  
  /** Plugin configuration */
  plugins?: Record<string, any>;
}

export interface ClaudeDesktopConfig {
  /** MCP servers configuration */
  mcpServers: Record<string, ClaudeDesktopMCPConfig>;
}

export interface ClaudeDesktopMCPConfig {
  /** Command to run */
  command: string;
  
  /** Command arguments */
  args: string[];
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Working directory */
  cwd?: string;
}

// Validation and error types
export interface ConfigValidationResult {
  /** Validation success */
  valid: boolean;
  
  /** Validation errors */
  errors: ConfigValidationError[];
  
  /** Validation warnings */
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  /** Error field path */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code: string;
  
  /** Suggested fix */
  suggestion?: string;
}

export interface ConfigValidationWarning {
  /** Warning field path */
  field: string;
  
  /** Warning message */
  message: string;
  
  /** Warning code */
  code: string;
  
  /** Suggested improvement */
  suggestion?: string;
}

// Factory and manager interfaces
export interface ConfigurationManagerOptions {
  /** Logger instance */
  logger: Logger;
  
  /** Project root override */
  projectRoot?: string;
  
  /** Configuration file name override */
  configFileName?: string;
  
  /** Environment prefix override */
  envPrefix?: string;
  
  /** Skip auto-detection */
  skipAutoDetection?: boolean;
  
  /** Force regeneration of config */
  forceRegenerate?: boolean;
}