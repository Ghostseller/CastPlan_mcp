/**
 * Better-SQLite3 Migration System - Infrastructure Exports
 * Main entry point for the migration system components
 */
export { DatabaseConnection } from './DatabaseConnection';
export type { DatabaseConfig, DatabaseMetrics } from './DatabaseConnection';
export { MigrationRunner } from './MigrationRunner';
export type { RunnerConfig } from './MigrationRunner';
export { MigrationTracker } from './MigrationTracker';
export type { MigrationRecord } from './MigrationTracker';
export { SchemaValidator } from './SchemaValidator';
export type { SchemaValidationResult, TableSchema, ColumnSchema, IndexSchema, ConstraintSchema } from './SchemaValidator';
export { BaseMigration } from './Migration';
export type { MigrationDefinition, MigrationResult } from './Migration';
//# sourceMappingURL=index.d.ts.map