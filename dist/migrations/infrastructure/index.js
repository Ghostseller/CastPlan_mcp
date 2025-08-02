/**
 * Better-SQLite3 Migration System - Infrastructure Exports
 * Main entry point for the migration system components
 */
// Core infrastructure
export { DatabaseConnection } from './DatabaseConnection';
export { MigrationRunner } from './MigrationRunner';
export { MigrationTracker } from './MigrationTracker';
export { SchemaValidator } from './SchemaValidator';
// Migration definitions
export { BaseMigration } from './Migration';
// Migration management (if created)
// export { MigrationManager } from './MigrationManager';
// export type { MigrationManagerConfig, MigrationPlan } from './MigrationManager';
// Test framework exports (conditional - only available in test environment)
// export { 
//   BetterSqliteTestFramework,
//   setupBetterSqliteTest,
//   betterSqliteTestUtils
// } from '../__tests__/helpers/BetterSqliteTestFramework';
// export type { TestDatabase, TestDatabaseOptions } from '../__tests__/helpers/BetterSqliteTestFramework';
//# sourceMappingURL=index.js.map