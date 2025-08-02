/**
 * Database Schema Validation and Integrity Checking
 */
import { DatabaseConnection } from './DatabaseConnection';
import { MigrationDefinition } from './Migration';
export interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    integrityCheck: boolean;
    foreignKeyCheck: boolean;
}
export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
    indexes: IndexSchema[];
    constraints: ConstraintSchema[];
}
export interface ColumnSchema {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    primaryKey: boolean;
    autoIncrement: boolean;
}
export interface IndexSchema {
    name: string;
    columns: string[];
    unique: boolean;
    partial?: string;
}
export interface ConstraintSchema {
    name: string;
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    definition: string;
}
export declare class SchemaValidator {
    private connection;
    constructor(connection: DatabaseConnection);
    initialize(): Promise<void>;
    validateSchema(expectedSchema?: TableSchema[]): Promise<SchemaValidationResult>;
    validatePreMigration(migration: MigrationDefinition): Promise<void>;
    validatePostMigration(migration: MigrationDefinition): Promise<void>;
    getCurrentSchema(): Promise<TableSchema[]>;
    compareSchemas(expected: TableSchema[], actual: TableSchema[]): Promise<{
        missing: string[];
        extra: string[];
        different: string[];
    }>;
    private validateExpectedSchema;
    private getTableColumns;
    private getTableIndexes;
    private getTableConstraints;
    private compareTableSchemas;
    private findOrphanedIndexes;
}
//# sourceMappingURL=SchemaValidator.d.ts.map