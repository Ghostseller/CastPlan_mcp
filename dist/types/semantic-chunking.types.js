/**
 * Semantic Chunking Types
 * Type definitions for semantic document chunking functionality
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { z } from 'zod';
// =============================================================================
// CORE SEMANTIC CHUNKING TYPES
// =============================================================================
// Document Chunk Schema
export const DocumentChunkSchema = z.object({
    id: z.string().uuid(),
    documentId: z.string().uuid(),
    chunkIndex: z.number().int().min(0),
    content: z.string(),
    contentHash: z.string(),
    tokenCount: z.number().int().min(0).default(0),
    chunkType: z.enum(['semantic', 'structural', 'fixed-size', 'overlap', 'hybrid']).default('semantic'),
    startPosition: z.number().int().min(0).default(0),
    endPosition: z.number().int().min(0).default(0),
    metadata: z.record(z.any()).default({}),
    qualityScore: z.number().min(0).max(1).default(0),
    qualityMetrics: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
// Chunk Embedding Schema
export const ChunkEmbeddingSchema = z.object({
    id: z.string().uuid(),
    chunkId: z.string().uuid(),
    embeddingModel: z.string(),
    embeddingDimension: z.number().int().positive(),
    embeddingVector: z.string(), // JSON array as string
    embeddingMetadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
});
// Chunk Relationship Schema
export const ChunkRelationshipSchema = z.object({
    id: z.string().uuid(),
    sourceChunkId: z.string().uuid(),
    targetChunkId: z.string().uuid(),
    relationshipType: z.enum([
        'semantic_similarity',
        'sequential',
        'reference',
        'dependency',
        'contradiction',
        'elaboration',
        'summary',
        'example'
    ]),
    similarityScore: z.number().min(0).max(1).default(0),
    relationshipStrength: z.number().min(0).max(1).default(0),
    metadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
});
// Chunk Version Schema
export const ChunkVersionSchema = z.object({
    id: z.string().uuid(),
    chunkId: z.string().uuid(),
    versionNumber: z.number().int().positive(),
    content: z.string(),
    contentHash: z.string(),
    changeType: z.enum(['created', 'content_updated', 'metadata_updated', 'split', 'merged', 'deleted']),
    changeSummary: z.string().optional(),
    createdAt: z.string().datetime(),
    createdBy: z.string().optional(),
});
// Chunk Topic Schema
export const ChunkTopicSchema = z.object({
    id: z.string().uuid(),
    chunkId: z.string().uuid(),
    topicName: z.string(),
    topicCategory: z.string().optional(),
    confidenceScore: z.number().min(0).max(1).default(0),
    topicKeywords: z.array(z.string()).default([]),
    topicMetadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
});
// =============================================================================
// SEMANTIC CHUNKING CONFIGURATION
// =============================================================================
export const ChunkingConfigSchema = z.object({
    strategy: z.enum(['semantic', 'structural', 'fixed-size', 'overlap', 'hybrid']).default('semantic'),
    maxChunkSize: z.number().int().positive().default(1000),
    minChunkSize: z.number().int().positive().default(100),
    overlapPercentage: z.number().min(0).max(0.5).default(0.1),
    embeddingModel: z.string().default('text-embedding-ada-002'),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    qualityThreshold: z.number().min(0).max(1).default(0.5),
    enableVersioning: z.boolean().default(true),
    enableTopicDetection: z.boolean().default(true),
    enableRelationshipDetection: z.boolean().default(true),
});
// =============================================================================
// SEMANTIC SEARCH AND ANALYSIS
// =============================================================================
export const SemanticSearchQuerySchema = z.object({
    query: z.string(),
    documentIds: z.array(z.string().uuid()).optional(),
    chunkTypes: z.array(z.enum(['semantic', 'structural', 'fixed-size', 'overlap'])).optional(),
    topicCategories: z.array(z.string()).optional(),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    maxResults: z.number().int().positive().default(10),
    includeMetadata: z.boolean().default(true),
    includeRelationships: z.boolean().default(false),
});
export const SemanticSearchResultSchema = z.object({
    chunk: DocumentChunkSchema,
    similarityScore: z.number().min(0).max(1),
    relationships: z.array(ChunkRelationshipSchema).optional(),
    topics: z.array(ChunkTopicSchema).optional(),
    contextChunks: z.array(DocumentChunkSchema).optional(),
});
// =============================================================================
// CHUNK ANALYTICS AND INSIGHTS
// =============================================================================
export const ChunkAnalyticsSchema = z.object({
    documentId: z.string().uuid(),
    totalChunks: z.number().int().min(0),
    averageChunkSize: z.number().min(0),
    averageQualityScore: z.number().min(0).max(1),
    topicDistribution: z.record(z.number()).default({}),
    relationshipCounts: z.record(z.number()).default({}),
    chunkTypeDistribution: z.record(z.number()).default({}),
    analyzedAt: z.string().datetime(),
});
// =============================================================================
// BATCH OPERATIONS
// =============================================================================
export const BatchChunkOperationSchema = z.object({
    operation: z.enum(['create', 'update', 'delete', 'analyze', 'reindex']),
    documentIds: z.array(z.string().uuid()),
    config: ChunkingConfigSchema.optional(),
    options: z.record(z.any()).default({}),
});
export const BatchOperationResultSchema = z.object({
    operationId: z.string().uuid(),
    operation: z.enum(['create', 'update', 'delete', 'analyze', 'reindex']),
    totalItems: z.number().int().min(0),
    processedItems: z.number().int().min(0),
    successfulItems: z.number().int().min(0),
    failedItems: z.number().int().min(0),
    errors: z.array(z.object({
        documentId: z.string().uuid(),
        error: z.string(),
    })).default([]),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
});
// =============================================================================
// MIGRATION AND COMPATIBILITY
// =============================================================================
export const MigrationStatusSchema = z.object({
    documentId: z.string().uuid(),
    migrationVersion: z.string(),
    migrationStatus: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    chunksCreated: z.number().int().min(0).default(0),
    embeddingsGenerated: z.number().int().min(0).default(0),
    relationshipsDetected: z.number().int().min(0).default(0),
    topicsDetected: z.number().int().min(0).default(0),
    migrationStartedAt: z.string().datetime(),
    migrationCompletedAt: z.string().datetime().optional(),
    migrationErrors: z.array(z.string()).default([]),
});
//# sourceMappingURL=semantic-chunking.types.js.map