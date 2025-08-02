/**
 * Configuration Management System
 *
 * Provides universal configuration management for CastPlan Ultimate MCP Server
 * Supports automatic project detection, multi-package manager support,
 * and cross-platform compatibility.
 *
 * Created: 2025-07-31
 */
export { ConfigurationManager } from './ConfigurationManager.ts';
export { ProjectAnalyzer } from './ProjectAnalyzer.ts';
export { PackageManagerDetector } from './PackageManagerDetector.ts';
export { EnvGenerator } from './EnvGenerator.ts';
export { ClaudeDesktopConfigGenerator } from './ClaudeDesktopConfigGenerator.ts';
export { StandardMCPConfigGenerator } from './StandardMCPConfigGenerator.ts';
export type { UniversalConfig, ProjectInfo, PackageManagerInfo, PlatformInfo, ConfigSource, ServiceConfig, RuntimeConfig, EnvironmentConfig, ConfigurationManagerOptions, ConfigValidationResult, ConfigValidationError, ConfigValidationWarning, CastPlanConfigFile, ClaudeDesktopConfig } from './types.ts';
export type { StandardMCPConfig, MCPServerConfig, MCPConfigFile } from './StandardMCPConfigGenerator.ts';
//# sourceMappingURL=index.d.ts.map