/**
 * Semantic Chunking Migration Service
 * Handles migration of existing documents to semantic chunking format
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { Logger } from 'winston';
import { ChunkingConfig, BatchOperationResult, MigrationStatus } from '../types/semantic-chunking.types.ts';
import { DocumentLifecycleService } from './DocumentLifecycleService.ts';
interface MigrationBatch {
    id: string;
    batchName: string;
    migrationType: string;
    totalDocuments: number;
    processedDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    batchStatus: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: string;
    completedAt?: string;
    configuration: ChunkingConfig;
    errorSummary: string[];
}
interface MigrationPerformanceMetrics {
    id: string;
    migrationBatchId: string;
    documentId: string;
    processingStartTime: string;
    processingEndTime?: string;
    chunkingTimeMs: number;
    embeddingTimeMs: number;
    relationshipTimeMs: number;
    topicDetectionTimeMs: number;
    totalProcessingTimeMs: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    relationshipsCreated: number;
    topicsAssigned: number;
    memoryUsageMb: number;
    errorCount: number;
}
export declare class SemanticChunkingMigrationService {
    private db;
    private logger;
    private documentService;
    constructor(documentLifecycleService: DocumentLifecycleService, logger: Logger);
    /**
     * Initialize migration service
     */
    initialize(): Promise<void>;
    /**
     * Create a new migration batch
     */
    createMigrationBatch(batchName: string, migrationType: string, documentIds: string[], configName?: string): Promise<MigrationBatch>;
    /**
     * Process migration batch
     */
    processMigrationBatch(batchId: string): Promise<BatchOperationResult>;
    /**
     * Get migration status for a document
     */
    getMigrationStatus(documentId: string): Promise<MigrationStatus | null>;
    /**
     * Get migration batch
     */
    getMigrationBatch(batchId: string): Promise<MigrationBatch | null>;
    /**
     * Get all migration batches
     */
    getAllMigrationBatches(): Promise<MigrationBatch[]>;
    /**
     * Get migration performance metrics
     */
    getMigrationPerformanceMetrics(batchId: string): Promise<MigrationPerformanceMetrics[]>;
    /**
     * Retry failed migrations
     */
    retryFailedMigrations(batchId: string): Promise<BatchOperationResult>;
    /**
     * Cancel migration batch
     */
    cancelMigrationBatch(batchId: string): Promise<void>;
    /**
     * Get migration configuration
     */
    private getMigrationConfiguration;
    /**
     * Convert migration configuration to chunking config
     */
    private configToChunkingConfig;
    /**
     * Initialize migration status for a document
     */
    private initializeMigrationStatus;
    /**
     * Get documents for migration
     */
    private getDocumentsForMigration;
    /**
     * Process documents sequentially
     */
    private processDocumentsSequentially;
    /**
     * Process individual document migration
     */
    private processDocumentMigration;
    /**
     * Read document content (placeholder)
     */
    private readDocumentContent;
    /**
     * Update migration status
     */
    private updateMigrationStatus;
    /**
     * Update batch status
     */
    private updateBatchStatus;
    /**
     * Start performance tracking
     */
    private startPerformanceTracking;
    /**
     * Complete performance tracking
     */
    private completePerformanceTracking;
    /**
     * Get failed migrations
     */
    private getFailedMigrations;
    /**
     * Reset migration status
     */
    private resetMigrationStatus;
    private mapRowToMigrationStatus;
    private mapRowToMigrationBatch;
    private mapRowToMigrationConfiguration;
    private mapRowToPerformanceMetrics;
}
export {};
//# sourceMappingURL=SemanticChunkingMigrationService.d.ts.map