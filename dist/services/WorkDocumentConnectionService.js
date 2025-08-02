import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
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
    // Thread safety mutex
    dbMutex = new Mutex();
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
            this.db = new Database(this.dbPath, {
                verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
            });
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            // Optimize SQLite settings for performance
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = memory');
            this.db.pragma('mmap_size = 268435456'); // 256MB
            // Create async wrappers for synchronous better-sqlite3 methods
            const originalRun = this.db.run.bind(this.db);
            const originalAll = this.db.all.bind(this.db);
            const originalGet = this.db.get.bind(this.db);
            this.db.run = async (sql, params) => {
                return originalRun(sql, params);
            };
            this.db.all = async (sql, params) => {
                return originalAll(sql, params);
            };
            this.db.get = async (sql, params) => {
                return originalGet(sql, params);
            };
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
            // Create indexes for performance optimization
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_work_type ON work_connections(workType)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_connection_strength ON work_connections(connectionStrength)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_work_connections_createdAt ON work_connections(createdAt)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_work_connections_updatedAt ON work_connections(updatedAt)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_work_connections_lastSyncedAt ON work_connections(lastSyncedAt)`);
            // Compound indexes for common query patterns
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_workType_strength ON work_connections(workType, connectionStrength)`);
            await this.db.run(`CREATE INDEX IF NOT EXISTS idx_workType_createdAt ON work_connections(workType, createdAt)`);
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
        return this.dbMutex.runExclusive(async () => {
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
        });
    }
    async findConnectionsByWork(workType, filePaths) {
        return this.dbMutex.runExclusive(async () => {
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
        });
    }
    async updateConnectionStrength(id, strength) {
        return this.dbMutex.runExclusive(async () => {
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
        });
    }
    async getAllConnections() {
        return this.dbMutex.runExclusive(async () => {
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
        });
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