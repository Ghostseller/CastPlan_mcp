/**
 * Semantic Chunking Migration Service
 * Handles migration of existing documents to semantic chunking format
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { v4 as uuidv4 } from 'uuid';
export class SemanticChunkingMigrationService {
    db;
    logger;
    documentService;
    constructor(documentLifecycleService, logger) {
        this.documentService = documentLifecycleService;
        this.logger = logger;
        // Use the same database connection as the document service
        this.db = documentLifecycleService.db;
    }
    /**
     * Initialize migration service
     */
    async initialize() {
        try {
            // The tables should already be created by the migration
            this.logger.info('Semantic chunking migration service initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize migration service:', error);
            throw error;
        }
    }
    /**
     * Create a new migration batch
     */
    async createMigrationBatch(batchName, migrationType, documentIds, configName = 'Default Semantic Chunking') {
        try {
            const batchId = uuidv4();
            const now = new Date().toISOString();
            // Get configuration
            const config = await this.getMigrationConfiguration(configName);
            if (!config) {
                throw new Error(`Migration configuration not found: ${configName}`);
            }
            const batch = {
                id: batchId,
                batchName,
                migrationType,
                totalDocuments: documentIds.length,
                processedDocuments: 0,
                successfulDocuments: 0,
                failedDocuments: 0,
                batchStatus: 'pending',
                startedAt: now,
                configuration: this.configToChunkingConfig(config),
                errorSummary: [],
            };
            await this.db.run(`
        INSERT INTO migration_batches (
          id, batch_name, migration_type, total_documents, processed_documents,
          successful_documents, failed_documents, batch_status, started_at,
          configuration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                batch.id,
                batch.batchName,
                batch.migrationType,
                batch.totalDocuments,
                batch.processedDocuments,
                batch.successfulDocuments,
                batch.failedDocuments,
                batch.batchStatus,
                batch.startedAt,
                JSON.stringify(batch.configuration),
            ]);
            // Initialize migration status for each document
            for (const documentId of documentIds) {
                await this.initializeMigrationStatus(documentId, batchId);
            }
            this.logger.info(`Migration batch created: ${batchId} with ${documentIds.length} documents`);
            return batch;
        }
        catch (error) {
            this.logger.error('Failed to create migration batch:', error);
            throw error;
        }
    }
    /**
     * Process migration batch
     */
    async processMigrationBatch(batchId) {
        try {
            const batch = await this.getMigrationBatch(batchId);
            if (!batch) {
                throw new Error(`Migration batch not found: ${batchId}`);
            }
            // Update batch status to running
            await this.updateBatchStatus(batchId, 'running');
            const result = {
                operationId: batchId,
                operation: 'create',
                totalItems: batch.totalDocuments,
                processedItems: 0,
                successfulItems: 0,
                failedItems: 0,
                errors: [],
                startedAt: batch.startedAt,
                status: 'running',
            };
            // Get documents to migrate
            const documentsToMigrate = await this.getDocumentsForMigration(batchId);
            // Process documents - always use sequential for now
            await this.processDocumentsSequentially(documentsToMigrate, batch, result);
            // Update final batch status
            result.completedAt = new Date().toISOString();
            result.status = result.failedItems > 0 ? 'completed' : 'completed';
            await this.updateBatchStatus(batchId, result.failedItems > 0 ? 'completed' : 'completed', result.completedAt);
            this.logger.info(`Migration batch completed: ${batchId} - ${result.successfulItems}/${result.totalItems} successful`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to process migration batch:', error);
            await this.updateBatchStatus(batchId, 'failed');
            throw error;
        }
    }
    /**
     * Get migration status for a document
     */
    async getMigrationStatus(documentId) {
        try {
            const row = await this.db.get(`
        SELECT * FROM document_migration_status 
        WHERE document_id = ?
        ORDER BY migration_started_at DESC
        LIMIT 1
      `, [documentId]);
            return row ? this.mapRowToMigrationStatus(row) : null;
        }
        catch (error) {
            this.logger.error('Failed to get migration status:', error);
            throw error;
        }
    }
    /**
     * Get migration batch
     */
    async getMigrationBatch(batchId) {
        try {
            const row = await this.db.get(`
        SELECT * FROM migration_batches WHERE id = ?
      `, [batchId]);
            return row ? this.mapRowToMigrationBatch(row) : null;
        }
        catch (error) {
            this.logger.error('Failed to get migration batch:', error);
            throw error;
        }
    }
    /**
     * Get all migration batches
     */
    async getAllMigrationBatches() {
        try {
            const rows = await this.db.all(`
        SELECT * FROM migration_batches 
        ORDER BY started_at DESC
      `);
            return rows.map(this.mapRowToMigrationBatch);
        }
        catch (error) {
            this.logger.error('Failed to get migration batches:', error);
            throw error;
        }
    }
    /**
     * Get migration performance metrics
     */
    async getMigrationPerformanceMetrics(batchId) {
        try {
            const rows = await this.db.all(`
        SELECT * FROM migration_performance_metrics 
        WHERE migration_batch_id = ?
        ORDER BY processing_start_time DESC
      `, [batchId]);
            return rows.map(this.mapRowToPerformanceMetrics);
        }
        catch (error) {
            this.logger.error('Failed to get performance metrics:', error);
            throw error;
        }
    }
    /**
     * Retry failed migrations
     */
    async retryFailedMigrations(batchId) {
        try {
            const failedDocuments = await this.getFailedMigrations(batchId);
            if (failedDocuments.length === 0) {
                this.logger.info(`No failed migrations to retry for batch: ${batchId}`);
                return {
                    operationId: uuidv4(),
                    operation: 'create',
                    totalItems: 0,
                    processedItems: 0,
                    successfulItems: 0,
                    failedItems: 0,
                    errors: [],
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    status: 'completed',
                };
            }
            // Reset failed migration statuses
            for (const doc of failedDocuments) {
                await this.resetMigrationStatus(doc.documentId);
            }
            // Reprocess the batch
            return this.processMigrationBatch(batchId);
        }
        catch (error) {
            this.logger.error('Failed to retry failed migrations:', error);
            throw error;
        }
    }
    /**
     * Cancel migration batch
     */
    async cancelMigrationBatch(batchId) {
        try {
            await this.updateBatchStatus(batchId, 'cancelled');
            this.logger.info(`Migration batch cancelled: ${batchId}`);
        }
        catch (error) {
            this.logger.error('Failed to cancel migration batch:', error);
            throw error;
        }
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Get migration configuration
     */
    async getMigrationConfiguration(configName) {
        try {
            const row = await this.db.get(`
        SELECT * FROM migration_configurations 
        WHERE config_name = ? AND is_active = 1
      `, [configName]);
            return row ? this.mapRowToMigrationConfiguration(row) : null;
        }
        catch (error) {
            this.logger.error('Failed to get migration configuration:', error);
            throw error;
        }
    }
    /**
     * Convert migration configuration to chunking config
     */
    configToChunkingConfig(config) {
        return {
            strategy: config.chunkingStrategy,
            maxChunkSize: config.maxChunkSize,
            minChunkSize: config.minChunkSize,
            overlapPercentage: config.overlapPercentage,
            embeddingModel: config.embeddingModel,
            similarityThreshold: config.similarityThreshold,
            qualityThreshold: config.qualityThreshold,
            enableVersioning: config.enableVersioning,
            enableTopicDetection: config.enableTopicDetection,
            enableRelationshipDetection: config.enableRelationshipDetection,
        };
    }
    /**
     * Initialize migration status for a document
     */
    async initializeMigrationStatus(documentId, batchId) {
        try {
            const statusId = uuidv4();
            const now = new Date().toISOString();
            await this.db.run(`
        INSERT INTO document_migration_status (
          id, document_id, migration_version, migration_status,
          migration_started_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [statusId, documentId, batchId, 'pending', now]);
        }
        catch (error) {
            this.logger.warn('Failed to initialize migration status:', error);
        }
    }
    /**
     * Get documents for migration
     */
    async getDocumentsForMigration(batchId) {
        try {
            const rows = await this.db.all(`
        SELECT d.* FROM documents d
        INNER JOIN document_migration_status dms ON d.id = dms.document_id
        WHERE dms.migration_version = ? AND dms.migration_status = 'pending'
      `, [batchId]);
            return rows.map((row) => this.documentService.mapRowToDocument(row));
        }
        catch (error) {
            this.logger.error('Failed to get documents for migration:', error);
            throw error;
        }
    }
    /**
     * Process documents sequentially
     */
    async processDocumentsSequentially(documents, batch, result) {
        for (const document of documents) {
            await this.processDocumentMigration(document, batch, result);
        }
    }
    /**
     * Process individual document migration
     */
    async processDocumentMigration(document, batch, result) {
        const startTime = Date.now();
        const metricsId = uuidv4();
        try {
            // Start performance tracking
            await this.startPerformanceTracking(metricsId, batch.id, document.id);
            // Update migration status to in_progress
            await this.updateMigrationStatus(document.id, 'in_progress');
            // Read document content (placeholder - would read actual file)
            const content = await this.readDocumentContent(document.filePath);
            // Create chunks
            const chunkingStart = Date.now();
            const chunks = await this.documentService.createChunks(document.id, content, batch.configuration);
            const chunkingTime = Date.now() - chunkingStart;
            // Generate embeddings if enabled
            let embeddingTime = 0;
            let embeddingsGenerated = 0;
            if (batch.configuration.embeddingModel) {
                const embeddingStart = Date.now();
                for (const chunk of chunks) {
                    await this.documentService.generateEmbeddings(chunk.id, batch.configuration.embeddingModel);
                    embeddingsGenerated++;
                }
                embeddingTime = Date.now() - embeddingStart;
            }
            // Detect relationships if enabled
            let relationshipTime = 0;
            let relationshipsCreated = 0;
            if (batch.configuration.enableRelationshipDetection) {
                const relationshipStart = Date.now();
                for (const chunk of chunks) {
                    const relationships = await this.documentService.detectRelationships(chunk.id);
                    relationshipsCreated += relationships.length;
                }
                relationshipTime = Date.now() - relationshipStart;
            }
            // Detect topics if enabled
            let topicDetectionTime = 0;
            let topicsAssigned = 0;
            if (batch.configuration.enableTopicDetection) {
                const topicStart = Date.now();
                for (const chunk of chunks) {
                    const topics = await this.documentService.detectTopics(chunk.id);
                    topicsAssigned += topics.length;
                }
                topicDetectionTime = Date.now() - topicStart;
            }
            // Update migration status to completed
            await this.updateMigrationStatus(document.id, 'completed', chunks.length, embeddingsGenerated, relationshipsCreated, topicsAssigned);
            // Complete performance tracking
            const totalTime = Date.now() - startTime;
            await this.completePerformanceTracking(metricsId, chunkingTime, embeddingTime, relationshipTime, topicDetectionTime, totalTime, chunks.length, embeddingsGenerated, relationshipsCreated, topicsAssigned);
            result.successfulItems++;
            this.logger.info(`Document migrated successfully: ${document.id}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Update migration status to failed
            await this.updateMigrationStatus(document.id, 'failed', 0, 0, 0, 0, errorMessage);
            // Complete performance tracking with error
            const totalTime = Date.now() - startTime;
            await this.completePerformanceTracking(metricsId, 0, 0, 0, 0, totalTime, 0, 0, 0, 0, 1);
            result.failedItems++;
            result.errors.push({
                documentId: document.id,
                error: errorMessage,
            });
            this.logger.error(`Document migration failed: ${document.id} - ${errorMessage}`);
        }
        finally {
            result.processedItems++;
        }
    }
    /**
     * Read document content (placeholder)
     */
    async readDocumentContent(filePath) {
        // Placeholder - would read actual file content
        return `Sample content for document at ${filePath}`;
    }
    /**
     * Update migration status
     */
    async updateMigrationStatus(documentId, status, chunksCreated = 0, embeddingsGenerated = 0, relationshipsDetected = 0, topicsDetected = 0, error) {
        try {
            const now = new Date().toISOString();
            const completedAt = status === 'completed' || status === 'failed' ? now : null;
            await this.db.run(`
        UPDATE document_migration_status 
        SET migration_status = ?, chunks_created = ?, embeddings_generated = ?,
            relationships_detected = ?, topics_detected = ?, 
            migration_completed_at = ?, last_error = ?
        WHERE document_id = ? AND migration_status IN ('pending', 'in_progress')
      `, [
                status,
                chunksCreated,
                embeddingsGenerated,
                relationshipsDetected,
                topicsDetected,
                completedAt,
                error,
                documentId,
            ]);
        }
        catch (error) {
            this.logger.warn('Failed to update migration status:', error);
        }
    }
    /**
     * Update batch status
     */
    async updateBatchStatus(batchId, status, completedAt) {
        try {
            await this.db.run(`
        UPDATE migration_batches 
        SET batch_status = ?, completed_at = ?
        WHERE id = ?
      `, [status, completedAt, batchId]);
        }
        catch (error) {
            this.logger.warn('Failed to update batch status:', error);
        }
    }
    /**
     * Start performance tracking
     */
    async startPerformanceTracking(metricsId, batchId, documentId) {
        try {
            const now = new Date().toISOString();
            await this.db.run(`
        INSERT INTO migration_performance_metrics (
          id, migration_batch_id, document_id, processing_start_time
        ) VALUES (?, ?, ?, ?)
      `, [metricsId, batchId, documentId, now]);
        }
        catch (error) {
            this.logger.warn('Failed to start performance tracking:', error);
        }
    }
    /**
     * Complete performance tracking
     */
    async completePerformanceTracking(metricsId, chunkingTime, embeddingTime, relationshipTime, topicDetectionTime, totalTime, chunksCreated, embeddingsGenerated, relationshipsCreated, topicsAssigned, errorCount = 0) {
        try {
            const now = new Date().toISOString();
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
            await this.db.run(`
        UPDATE migration_performance_metrics 
        SET processing_end_time = ?, chunking_time_ms = ?, embedding_time_ms = ?,
            relationship_time_ms = ?, topic_detection_time_ms = ?, total_processing_time_ms = ?,
            chunks_created = ?, embeddings_generated = ?, relationships_created = ?,
            topics_assigned = ?, memory_usage_mb = ?, error_count = ?
        WHERE id = ?
      `, [
                now,
                chunkingTime,
                embeddingTime,
                relationshipTime,
                topicDetectionTime,
                totalTime,
                chunksCreated,
                embeddingsGenerated,
                relationshipsCreated,
                topicsAssigned,
                memoryUsage,
                errorCount,
                metricsId,
            ]);
        }
        catch (error) {
            this.logger.warn('Failed to complete performance tracking:', error);
        }
    }
    /**
     * Get failed migrations
     */
    async getFailedMigrations(batchId) {
        try {
            const rows = await this.db.all(`
        SELECT * FROM document_migration_status 
        WHERE migration_version = ? AND migration_status = 'failed'
      `, [batchId]);
            return rows.map(this.mapRowToMigrationStatus);
        }
        catch (error) {
            this.logger.error('Failed to get failed migrations:', error);
            throw error;
        }
    }
    /**
     * Reset migration status
     */
    async resetMigrationStatus(documentId) {
        try {
            await this.db.run(`
        UPDATE document_migration_status 
        SET migration_status = 'pending', migration_completed_at = NULL, 
            last_error = NULL, retry_count = retry_count + 1
        WHERE document_id = ?
      `, [documentId]);
        }
        catch (error) {
            this.logger.warn('Failed to reset migration status:', error);
        }
    }
    // Mapping methods
    mapRowToMigrationStatus(row) {
        return {
            documentId: row.document_id,
            migrationVersion: row.migration_version,
            migrationStatus: row.migration_status,
            chunksCreated: row.chunks_created,
            embeddingsGenerated: row.embeddings_generated,
            relationshipsDetected: row.relationships_detected,
            topicsDetected: row.topics_detected,
            migrationStartedAt: row.migration_started_at,
            migrationCompletedAt: row.migration_completed_at,
            migrationErrors: JSON.parse(row.migration_errors || '[]'),
        };
    }
    mapRowToMigrationBatch(row) {
        return {
            id: row.id,
            batchName: row.batch_name,
            migrationType: row.migration_type,
            totalDocuments: row.total_documents,
            processedDocuments: row.processed_documents,
            successfulDocuments: row.successful_documents,
            failedDocuments: row.failed_documents,
            batchStatus: row.batch_status,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            configuration: JSON.parse(row.configuration || '{}'),
            errorSummary: JSON.parse(row.error_summary || '[]'),
        };
    }
    mapRowToMigrationConfiguration(row) {
        return {
            id: row.id,
            configName: row.config_name,
            configVersion: row.config_version,
            chunkingStrategy: row.chunking_strategy,
            maxChunkSize: row.max_chunk_size,
            minChunkSize: row.min_chunk_size,
            overlapPercentage: row.overlap_percentage,
            embeddingModel: row.embedding_model,
            similarityThreshold: row.similarity_threshold,
            qualityThreshold: row.quality_threshold,
            enableVersioning: Boolean(row.enable_versioning),
            enableTopicDetection: Boolean(row.enable_topic_detection),
            enableRelationshipDetection: Boolean(row.enable_relationship_detection),
            parallelProcessing: Boolean(row.parallel_processing),
            batchSize: row.batch_size,
            retryLimit: row.retry_limit,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            isActive: Boolean(row.is_active),
        };
    }
    mapRowToPerformanceMetrics(row) {
        return {
            id: row.id,
            migrationBatchId: row.migration_batch_id,
            documentId: row.document_id,
            processingStartTime: row.processing_start_time,
            processingEndTime: row.processing_end_time,
            chunkingTimeMs: row.chunking_time_ms,
            embeddingTimeMs: row.embedding_time_ms,
            relationshipTimeMs: row.relationship_time_ms,
            topicDetectionTimeMs: row.topic_detection_time_ms,
            totalProcessingTimeMs: row.total_processing_time_ms,
            chunksCreated: row.chunks_created,
            embeddingsGenerated: row.embeddings_generated,
            relationshipsCreated: row.relationships_created,
            topicsAssigned: row.topics_assigned,
            memoryUsageMb: row.memory_usage_mb,
            errorCount: row.error_count,
        };
    }
}
//# sourceMappingURL=SemanticChunkingMigrationService.js.map