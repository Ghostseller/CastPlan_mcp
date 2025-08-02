import { Logger } from 'winston';
import { DocumentLifecycleService as IDocumentLifecycleService, DocumentMetadata, DocumentLifecycleState } from '../types/enhanced.types.js';
/**
 * Document Lifecycle Management Service
 *
 * Manages the complete lifecycle of documentation from creation to archival.
 * Tracks states, schedules reviews, and maintains audit trails.
 *
 * Created: 2025-07-29
 */
export declare class DocumentLifecycleService implements IDocumentLifecycleService {
    private db;
    private dbPath;
    private logger;
    constructor(databasePath: string, logger: Logger, mockDb?: any);
    /**
     * Initialize the database and create tables
     */
    initialize(): Promise<void>;
    /**
     * Track a new document in the system
     */
    trackDocument(metadata: Omit<DocumentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentMetadata>;
    /**
     * Update document lifecycle state
     */
    updateDocumentState(id: string, state: DocumentLifecycleState): Promise<void>;
    /**
     * Get documents by state
     */
    getDocumentsByState(state: DocumentLifecycleState): Promise<DocumentMetadata[]>;
    /**
     * Schedule document review
     */
    scheduleReview(id: string, reviewDate: Date | string, reviewTypeOrReviewerId?: string, assignedTo?: string): Promise<void>;
    /**
     * Create a new document (test-compatible version that returns ID)
     */
    createDocument(metadata: any): Promise<string>;
    /**
     * Get document by ID
     */
    getDocumentById(id: string): Promise<DocumentMetadata | null>;
    /**
     * Ensure database is initialized before operations
     */
    private ensureInitialized;
    /**
     * Get all documents
     */
    getAllDocuments(): Promise<DocumentMetadata[]>;
    /**
     * Get documents due for review
     */
    getDocumentsDueForReview(): Promise<DocumentMetadata[]>;
    /**
     * Update document metadata
     */
    updateDocumentMetadata(id: string, updates: Partial<DocumentMetadata>): Promise<void>;
    /**
     * Get document history
     */
    getDocumentHistory(id: string): Promise<any[]>;
    /**
     * Search documents
     */
    searchDocuments(query: string): Promise<DocumentMetadata[]>;
    /**
     * Get document statistics
     */
    getDocumentStatistics(): Promise<any>;
    /**
     * Update document state (alias for updateDocumentState for test compatibility)
     */
    updateState(id: string, state: DocumentLifecycleState, userId: string): Promise<void>;
    /**
     * Get due reviews (alias for getDocumentsDueForReview for test compatibility)
     */
    getDueReviews(dueDate?: Date): Promise<any[]>;
    /**
     * Get document history (alias for getDocumentHistory for test compatibility)
     */
    getHistory(id: string): Promise<any[]>;
    /**
     * Archive document
     */
    archiveDocument(id: string, userId: string): Promise<void>;
    /**
     * Add document history entry
     */
    addDocumentHistory(documentId: string, action: string, metadata: any): Promise<string>;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    /**
     * Shutdown the service (alias for close for test compatibility)
     */
    shutdown(): Promise<void>;
    /**
     * Log document action to history
     */
    private logDocumentAction;
    /**
     * Map database row to DocumentMetadata
     */
    private mapRowToDocument;
}
//# sourceMappingURL=DocumentLifecycleService.d.ts.map