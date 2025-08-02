/**
 * Base Migration Interface and Types
 */
import { DatabaseConnection } from './DatabaseConnection';
export interface MigrationDefinition {
    version: string;
    name: string;
    description?: string;
    up: (connection: DatabaseConnection) => Promise<void> | void;
    down?: (connection: DatabaseConnection) => Promise<void> | void;
    checksum?: string;
}
export interface MigrationResult {
    success: boolean;
    version: string;
    name: string;
    executionTime: number;
    error?: Error;
    rollbackAvailable: boolean;
}
export declare abstract class BaseMigration implements MigrationDefinition {
    abstract version: string;
    abstract name: string;
    abstract description?: string;
    abstract up(connection: DatabaseConnection): Promise<void> | void;
    down?(connection: DatabaseConnection): Promise<void> | void;
    get checksum(): string;
    private generateChecksum;
    protected createTable(connection: DatabaseConnection, tableName: string, schema: string): void;
    protected addIndex(connection: DatabaseConnection, tableName: string, columns: string[], unique?: boolean): void;
    protected addColumn(connection: DatabaseConnection, tableName: string, columnName: string, columnType: string): void;
    protected dropTable(connection: DatabaseConnection, tableName: string): void;
    protected dropIndex(connection: DatabaseConnection, indexName: string): void;
}
//# sourceMappingURL=Migration.d.ts.map