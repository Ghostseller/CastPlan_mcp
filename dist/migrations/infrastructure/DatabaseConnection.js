/**
 * Better-SQLite3 Database Connection Manager
 * Handles database connections with improved performance and reliability
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
export class DatabaseConnection {
    db = null;
    config;
    metrics;
    connectionId;
    constructor(config = {}) {
        this.config = {
            timeout: 5000,
            pragma: {
                journal_mode: 'WAL',
                synchronous: 'NORMAL',
                cache_size: -64000,
                foreign_keys: 'ON',
                temp_store: 'MEMORY',
                ...config.pragma
            },
            ...config
        };
        this.connectionId = uuidv4().substring(0, 8);
        this.metrics = {
            totalOperations: 0,
            lastOperationTime: 0,
            connectionTime: 0,
            isConnected: false
        };
    }
    async connect() {
        const startTime = Date.now();
        try {
            const dbPath = this.config.memory
                ? ':memory:'
                : this.config.path || this.getDefaultDatabasePath();
            // Ensure directory exists for file databases
            if (!this.config.memory && typeof dbPath === 'string' && !existsSync(dirname(dbPath))) {
                mkdirSync(dirname(dbPath), { recursive: true });
            }
            this.db = new Database(dbPath, {
                readonly: this.config.readonly || false,
                fileMustExist: this.config.fileMustExist || false,
                timeout: this.config.timeout,
                verbose: this.config.verbose ? console.log : undefined
            });
            // Apply pragma settings
            for (const [key, value] of Object.entries(this.config.pragma || {})) {
                this.db.pragma(`${key} = ${value}`);
            }
            this.metrics.connectionTime = Date.now() - startTime;
            this.metrics.isConnected = true;
            if (this.config.verbose) {
                console.log(`Database connected [${this.connectionId}]: ${dbPath} (${this.metrics.connectionTime}ms)`);
            }
        }
        catch (error) {
            throw new Error(`Failed to connect to database: ${error.message}`);
        }
    }
    disconnect() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.metrics.isConnected = false;
            if (this.config.verbose) {
                console.log(`Database disconnected [${this.connectionId}]`);
            }
        }
    }
    getDatabase() {
        if (!this.db || !this.metrics.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
    execute(sql, params) {
        const db = this.getDatabase();
        const startTime = Date.now();
        try {
            const stmt = db.prepare(sql);
            const result = params ? stmt.run(...params) : stmt.run();
            this.updateMetrics(startTime);
            return result;
        }
        catch (error) {
            throw this.enhanceError(error, sql, params);
        }
    }
    query(sql, params) {
        const db = this.getDatabase();
        const startTime = Date.now();
        try {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            this.updateMetrics(startTime);
            return result;
        }
        catch (error) {
            throw this.enhanceError(error, sql, params);
        }
    }
    queryFirst(sql, params) {
        const db = this.getDatabase();
        const startTime = Date.now();
        try {
            const stmt = db.prepare(sql);
            const result = params ? stmt.get(...params) : stmt.get();
            this.updateMetrics(startTime);
            return result || null;
        }
        catch (error) {
            throw this.enhanceError(error, sql, params);
        }
    }
    transaction(callback) {
        const db = this.getDatabase();
        const startTime = Date.now();
        try {
            const transaction = db.transaction(callback);
            const result = transaction();
            this.updateMetrics(startTime);
            return result;
        }
        catch (error) {
            throw this.enhanceError(error, 'TRANSACTION');
        }
    }
    backup(destinationPath) {
        const db = this.getDatabase();
        const startTime = Date.now();
        try {
            db.backup(destinationPath);
            this.updateMetrics(startTime);
        }
        catch (error) {
            throw new Error(`Backup failed: ${error.message}`);
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    checkIntegrity() {
        const result = this.queryFirst('PRAGMA integrity_check');
        return result?.integrity_check === 'ok';
    }
    getDefaultDatabasePath() {
        const testDir = join(process.cwd(), 'test-databases');
        return join(testDir, `test-${this.connectionId}.db`);
    }
    updateMetrics(startTime) {
        this.metrics.totalOperations++;
        this.metrics.lastOperationTime = Date.now() - startTime;
    }
    enhanceError(error, sql, params) {
        const enhanced = new Error(`Database operation failed: ${error.message}\n` +
            `SQL: ${sql}\n` +
            `Params: ${params ? JSON.stringify(params) : 'none'}\n` +
            `Connection: ${this.connectionId}`);
        enhanced.stack = error.stack;
        return enhanced;
    }
}
//# sourceMappingURL=DatabaseConnection.js.map