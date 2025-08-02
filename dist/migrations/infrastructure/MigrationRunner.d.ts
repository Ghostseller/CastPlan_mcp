/**
 * Migration Execution Engine
 * Handles running migrations with transactions and rollback support
 */
import { DatabaseConnection } from './DatabaseConnection';
import { MigrationDefinition, MigrationResult } from './Migration';
export interface RunnerConfig {
    stopOnError: boolean;
    validateSchema: boolean;
    dryRun: boolean;
    parallel: boolean;
    maxRetries: number;
    retryDelay: number;
}
export declare class MigrationRunner {
    private connection;
    private tracker;
    private validator;
    private config;
    constructor(connection: DatabaseConnection, config?: Partial<RunnerConfig>);
    initialize(): Promise<void>;
    runMigrations(migrations: MigrationDefinition[]): Promise<MigrationResult[]>;
    runSingleMigration(migration: MigrationDefinition): Promise<MigrationResult>;
    rollbackMigration(version: string, migration?: MigrationDefinition): Promise<MigrationResult>;
    rollbackToVersion(targetVersion: string, migrations: MigrationDefinition[]): Promise<MigrationResult[]>;
    getMigrationStatus(): {
        appliedCount: number;
        latestVersion: string | null;
        pendingCount: number;
        hasFailures: boolean;
    };
    private sortMigrations;
    private compareVersions;
    private delay;
}
//# sourceMappingURL=MigrationRunner.d.ts.map