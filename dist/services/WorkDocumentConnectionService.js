import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
/**
 * Work-Document Connection Service
 *
 * Manages relationships between development work and documentation requirements.
 * Tracks connection strength and synchronization status.
 *
 * Created: 2025-07-29
 */
export class WorkDocumentConnectionService {
    db;
    dbPath;
    logger;
    constructor(databasePath, logger) {
        this.dbPath = databasePath;
        this.logger = logger;
    }
    async initialize() {
        try {
            if (!this.dbPath) {
                throw new Error('Database path is not configured. Check CASTPLAN_DATABASE_PATH environment variable.');
            }
            this.logger.info(`Initializing SQLite database at: ${this.dbPath}`);
            this.db = new sqlite3.Database(this.dbPath);
            // Promisify database methods
            const dbRun = promisify(this.db.run.bind(this.db));
            const dbAll = promisify(this.db.all.bind(this.db));
            const dbGet = promisify(this.db.get.bind(this.db));
            this.db.run = dbRun;
            this.db.all = dbAll;
            this.db.get = dbGet;
            // Create work_connections table
            await this.db.run(`
        CREATE TABLE IF NOT EXISTS work_connections (
          id TEXT PRIMARY KEY,
          workType TEXT NOT NULL,
          workDescription TEXT NOT NULL,
          filePaths TEXT NOT NULL,
          connectedDocuments TEXT NOT NULL,
          connectionStrength REAL NOT NULL,
          lastSyncedAt TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);
            // Create indexes
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_work_type ON work_connections(workType)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_connection_strength ON work_connections(connectionStrength)`);
            this.logger.info('Work-document connection service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize work-document connection service:', error);
            throw error;
        }
    }
    async ensureInitialized() {
        if (!this.db) {
            this.logger.info('Auto-initializing WorkDocumentConnectionService database...');
            await this.initialize();
        }
    }
    isInitialized() {
        return !!this.db;
    }
    async createConnection(connection) {
        try {
            await this.ensureInitialized();
            const now = new Date().toISOString();
            const newConnection = {
                id: uuidv4(),
                ...connection,
                createdAt: now,
                updatedAt: now
            };
            await this.db.run(`
        INSERT INTO work_connections (
          id, workType, workDescription, filePaths, connectedDocuments,
          connectionStrength, lastSyncedAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                newConnection.id,
                newConnection.workType,
                newConnection.workDescription,
                JSON.stringify(newConnection.filePaths),
                JSON.stringify(newConnection.connectedDocuments),
                newConnection.connectionStrength,
                newConnection.lastSyncedAt,
                newConnection.createdAt,
                newConnection.updatedAt
            ]);
            this.logger.info(`Work connection created: ${newConnection.id}`);
            return newConnection;
        }
        catch (error) {
            this.logger.error('Failed to create work connection:', error);
            throw error;
        }
    }
    async findConnectionsByWork(workType, filePaths) {
        try {
            await this.ensureInitialized();
            const rows = await this.db.all(`
        SELECT * FROM work_connections 
        WHERE workType = ?
        ORDER BY connectionStrength DESC
      `, [workType]);
            // Filter by file path overlap
            return rows
                .map(this.mapRowToConnection)
                .filter((connection) => {
                const connectionPaths = connection.filePaths;
                return filePaths.some(path => connectionPaths.some((connPath) => path.includes(connPath) || connPath.includes(path)));
            });
        }
        catch (error) {
            this.logger.error('Failed to find connections by work:', error);
            throw error;
        }
    }
    async updateConnectionStrength(id, strength) {
        try {
            await this.ensureInitialized();
            const now = new Date().toISOString();
            await this.db.run(`
        UPDATE work_connections 
        SET connectionStrength = ?, updatedAt = ?
        WHERE id = ?
      `, [strength, now, id]);
            this.logger.info(`Connection strength updated: ${id} -> ${strength}`);
        }
        catch (error) {
            this.logger.error('Failed to update connection strength:', error);
            throw error;
        }
    }
    async getAllConnections() {
        try {
            await this.ensureInitialized();
            const rows = await this.db.all(`
        SELECT * FROM work_connections 
        ORDER BY createdAt DESC
      `);
            return rows.map(this.mapRowToConnection);
        }
        catch (error) {
            this.logger.error('Failed to get all connections:', error);
            throw error;
        }
    }
    mapRowToConnection(row) {
        return {
            id: row.id,
            workType: row.workType,
            workDescription: row.workDescription,
            filePaths: JSON.parse(row.filePaths),
            connectedDocuments: JSON.parse(row.connectedDocuments),
            connectionStrength: row.connectionStrength,
            lastSyncedAt: row.lastSyncedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };
    }
}
//# sourceMappingURL=WorkDocumentConnectionService.js.map