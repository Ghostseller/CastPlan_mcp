/**
 * Migration Version Tracking System
 * Tracks applied migrations and their status
 */
import { DatabaseConnection } from './DatabaseConnection';
export interface MigrationRecord {
    id: number;
    version: string;
    name: string;
    checksum: string;
    appliedAt: Date;
    executionTime: number;
    rollbackAvailable: boolean;
    status: 'applied' | 'failed' | 'rolled_back';
}
export declare class MigrationTracker {
    private connection;
    private tableName;
    constructor(connection: DatabaseConnection);
    initialize(): Promise<void>;
    recordMigration(migration: Omit<MigrationRecord, 'id' | 'appliedAt'>): void;
    updateMigrationStatus(version: string, status: MigrationRecord['status']): void;
    getAppliedMigrations(): MigrationRecord[];
    getAllMigrations(): MigrationRecord[];
    getMigration(version: string): MigrationRecord | null;
    getLatestMigration(): MigrationRecord | null;
    isPending(version: string): boolean;
    removeMigration(version: string): void;
    getMigrationHistory(): Array<{
        version: string;
        name: string;
        status: MigrationRecord['status'];
        appliedAt: Date;
        executionTimeMs: number;
    }>;
}
//# sourceMappingURL=MigrationTracker.d.ts.map