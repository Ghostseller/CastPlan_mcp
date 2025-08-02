/**
 * Better-SQLite3 Database Connection Manager
 * Handles database connections with improved performance and reliability
 */
import Database from 'better-sqlite3';
export interface DatabaseConfig {
    path?: string;
    memory?: boolean;
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: boolean;
    pragma?: Record<string, string | number>;
}
export interface DatabaseMetrics {
    totalOperations: number;
    lastOperationTime: number;
    connectionTime: number;
    isConnected: boolean;
}
export declare class DatabaseConnection {
    private db;
    private config;
    private metrics;
    private connectionId;
    constructor(config?: DatabaseConfig);
    connect(): Promise<void>;
    disconnect(): void;
    getDatabase(): Database.Database;
    execute(sql: string, params?: unknown[]): Database.RunResult;
    query<T = unknown>(sql: string, params?: unknown[]): T[];
    queryFirst<T = unknown>(sql: string, params?: unknown[]): T | null;
    transaction<T>(callback: () => T): T;
    backup(destinationPath: string): void;
    getMetrics(): DatabaseMetrics;
    checkIntegrity(): boolean;
    private getDefaultDatabasePath;
    private updateMetrics;
    private enhanceError;
}
//# sourceMappingURL=DatabaseConnection.d.ts.map