import { Logger } from 'winston';
import { WorkDocumentConnectionService as IWorkDocumentConnectionService, WorkDocumentConnection } from '../types/enhanced.types.js';
/**
 * Work-Document Connection Service
 *
 * Manages relationships between development work and documentation requirements.
 * Tracks connection strength and synchronization status.
 *
 * Created: 2025-07-29
 */
export declare class WorkDocumentConnectionService implements IWorkDocumentConnectionService {
    private db;
    private dbPath;
    private logger;
    constructor(databasePath: string, logger: Logger);
    initialize(): Promise<void>;
    private ensureInitialized;
    isInitialized(): boolean;
    createConnection(connection: Omit<WorkDocumentConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkDocumentConnection>;
    findConnectionsByWork(workType: string, filePaths: string[]): Promise<WorkDocumentConnection[]>;
    updateConnectionStrength(id: string, strength: number): Promise<void>;
    getAllConnections(): Promise<WorkDocumentConnection[]>;
    private mapRowToConnection;
}
//# sourceMappingURL=WorkDocumentConnectionService.d.ts.map