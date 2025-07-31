/**
 * Configuration Management System
 * 
 * Provides universal configuration management for CastPlan Ultimate MCP Server
 * Supports automatic project detection, multi-package manager support, 
 * and cross-platform compatibility.
 * 
 * Created: 2025-07-31
 */

export { ConfigurationManager } from './ConfigurationManager.js';
export { ProjectAnalyzer } from './ProjectAnalyzer.js';
export { PackageManagerDetector } from './PackageManagerDetector.js';
export { EnvGenerator } from './EnvGenerator.js';
export { ClaudeDesktopConfigGenerator } from './ClaudeDesktopConfigGenerator.js';
export { StandardMCPConfigGenerator } from './StandardMCPConfigGenerator.js';

// Type exports
export type {
  UniversalConfig,
  ProjectInfo,
  PackageManagerInfo,
  PlatformInfo,
  ConfigSource,
  ServiceConfig,
  RuntimeConfig,
  EnvironmentConfig,
  ConfigurationManagerOptions,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  CastPlanConfigFile,
  ClaudeDesktopConfig
} from './types.js';

export type {
  StandardMCPConfig,
  MCPServerConfig,
  MCPConfigFile
} from './StandardMCPConfigGenerator.js';