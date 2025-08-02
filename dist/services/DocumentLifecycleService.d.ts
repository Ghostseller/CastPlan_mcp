import { Logger } from 'winston';
import { DocumentLifecycleService as IDocumentLifecycleService, DocumentMetadata, DocumentLifecycleState } from '../types/enhanced.types.ts';
import { DocumentChunk, ChunkEmbedding, ChunkRelationship, ChunkTopic, ChunkingConfig, SemanticSearchQuery, SemanticSearchResult, ChunkAnalytics, BatchChunkOperation, BatchOperationResult, SemanticChunkingService } from '../types/semantic-chunking.types.ts';
/**
 * Document Lifecycle Management Service
 *
 * Manages the complete lifecycle of documentation from creation to archival.
 * Tracks states, schedules reviews, and maintains audit trails.
 *
 * Created: 2025-07-29
 */
export declare class DocumentLifecycleService implements IDocumentLifecycleService, SemanticChunkingService {
    private db;
    private dbPath;
    private logger;
    private concurrencyManager;
    private dbMutex;
    private cacheMutex;
    private embeddingCache;
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
     * Initialize semantic chunking tables
     */
    private initializeSemanticChunkingTables;
    /**
     * Create performance indexes for semantic chunking tables
     */
    private createSemanticChunkingIndexes;
    /**
     * Create chunks from document content
     */
    createChunks(documentId: string, content: string, config?: ChunkingConfig): Promise<DocumentChunk[]>;
    /**
     * Get chunks by document ID
     */
    getChunksByDocument(documentId: string): Promise<DocumentChunk[]>;
    /**
     * Get chunk by ID
     */
    getChunkById(chunkId: string): Promise<DocumentChunk | null>;
    /**
     * Update chunk
     */
    updateChunk(chunkId: string, updates: Partial<DocumentChunk>): Promise<void>;
    /**
     * Delete chunk
     */
    deleteChunk(chunkId: string): Promise<void>;
    /**
     * Generate and store embeddings for a chunk (called by SemanticChunkingService)
     */
    generateEmbeddings(chunkId: string, model?: string): Promise<ChunkEmbedding>;
    /**
     * Store pre-computed embeddings (used when AI service generates embeddings)
     */
    storeEmbeddings(chunkId: string, embeddingVector: number[], model?: string, metadata?: Record<string, any>): Promise<ChunkEmbedding>;
    /**
     * Get embedding for a chunk
     */
    getEmbedding(chunkId: string, model?: string): Promise<ChunkEmbedding | null>;
    /**
     * Update embedding
     */
    updateEmbedding(embeddingId: string, vector: number[]): Promise<void>;
    /**
     * Detect relationships for a chunk
     */
    detectRelationships(chunkId: string): Promise<ChunkRelationship[]>;
    /**
     * Create a relationship between chunks
     */
    createRelationship(sourceId: string, targetId: string, type: string, score?: number): Promise<ChunkRelationship>;
    /**
     * Get relationships for a chunk
     */
    getRelationships(chunkId: string, types?: string[]): Promise<ChunkRelationship[]>;
    /**
     * Detect topics for a chunk
     */
    detectTopics(chunkId: string): Promise<ChunkTopic[]>;
    /**
     * Assign a topic to a chunk
     */
    assignTopic(chunkId: string, topicName: string, category?: string, confidence?: number): Promise<ChunkTopic>;
    /**
     * Get topics for a chunk
     */
    getTopicsByChunk(chunkId: string): Promise<ChunkTopic[]>;
    /**
     * Semantic search across chunks using embeddings
     */
    semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;
    /**
     * Bulk import chunks with AI analysis
     */
    bulkImportChunks(chunks: Array<{
        documentId: string;
        content: string;
        metadata?: Record<string, any>;
    }>): Promise<DocumentChunk[]>;
    /**
     * Get analytics for document chunks
     */
    getChunkAnalytics(documentId: string): Promise<ChunkAnalytics>;
    /**
     * Process batch operations
     */
    processBatchOperation(operation: BatchChunkOperation): Promise<BatchOperationResult>;
    /**
     * Get batch operation status
     */
    getBatchOperationStatus(operationId: string): Promise<BatchOperationResult>;
    /**
     * Chunk content based on strategy
     */
    private chunkContent;
    /**
     * Generate content hash for deduplication and caching
     */
    private generateContentHash;
    /**
     * Check if cache entry is valid (not expired)
     */
    private isCacheValid;
    /**
     * Estimate token count
     */
    private estimateTokenCount;
    /**
     * Generate embedding vector (placeholder)
     */
    private generateEmbeddingVector;
    /**
     * Calculate similarity between two embedding vectors
     */
    calculateEmbeddingSimilarity(embeddingId1: string, embeddingId2: string): Promise<number>;
    /**
     * Get embedding statistics for performance monitoring
     */
    getEmbeddingStatistics(): Promise<{
        totalEmbeddings: number;
        embeddingsByModel: Record<string, number>;
        averageDimension: number;
        storageSize: number;
    }>;
    /**
     * Analyze chunk relationships (placeholder)
     */
    private analyzeChunkRelationships;
    /**
     * Analyze chunk topics (placeholder)
     */
    private analyzeChunkTopics;
    /**
     * Create chunk version
     */
    private createChunkVersion;
    /**
     * Convert camelCase to snake_case
     */
    private camelToSnake;
    /**
     * Map database row to DocumentChunk
     */
    private mapRowToChunk;
    /**
     * Map database row to ChunkEmbedding
     */
    private mapRowToEmbedding;
    /**
     * Map database row to ChunkRelationship
     */
    private mapRowToRelationship;
    /**
     * Map database row to ChunkTopic
     */
    private mapRowToTopic;
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