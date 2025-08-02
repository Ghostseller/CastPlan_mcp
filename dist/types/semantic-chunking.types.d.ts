/**
 * Semantic Chunking Types
 * Type definitions for semantic document chunking functionality
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { z } from 'zod';
export declare const DocumentChunkSchema: z.ZodObject<{
    id: z.ZodString;
    documentId: z.ZodString;
    chunkIndex: z.ZodNumber;
    content: z.ZodString;
    contentHash: z.ZodString;
    tokenCount: z.ZodDefault<z.ZodNumber>;
    chunkType: z.ZodDefault<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap", "hybrid"]>>;
    startPosition: z.ZodDefault<z.ZodNumber>;
    endPosition: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    qualityScore: z.ZodDefault<z.ZodNumber>;
    qualityMetrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    documentId: string;
    content: string;
    metadata: Record<string, any>;
    chunkIndex: number;
    contentHash: string;
    tokenCount: number;
    chunkType: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
    startPosition: number;
    endPosition: number;
    qualityScore: number;
    qualityMetrics: Record<string, any>;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    contentHash: string;
    metadata?: Record<string, any> | undefined;
    tokenCount?: number | undefined;
    chunkType?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
    startPosition?: number | undefined;
    endPosition?: number | undefined;
    qualityScore?: number | undefined;
    qualityMetrics?: Record<string, any> | undefined;
}>;
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;
export declare const ChunkEmbeddingSchema: z.ZodObject<{
    id: z.ZodString;
    chunkId: z.ZodString;
    embeddingModel: z.ZodString;
    embeddingDimension: z.ZodNumber;
    embeddingVector: z.ZodString;
    embeddingMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    chunkId: string;
    embeddingModel: string;
    embeddingDimension: number;
    embeddingVector: string;
    embeddingMetadata: Record<string, any>;
}, {
    id: string;
    createdAt: string;
    chunkId: string;
    embeddingModel: string;
    embeddingDimension: number;
    embeddingVector: string;
    embeddingMetadata?: Record<string, any> | undefined;
}>;
export type ChunkEmbedding = z.infer<typeof ChunkEmbeddingSchema>;
export declare const ChunkRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    sourceChunkId: z.ZodString;
    targetChunkId: z.ZodString;
    relationshipType: z.ZodEnum<["semantic_similarity", "sequential", "reference", "dependency", "contradiction", "elaboration", "summary", "example"]>;
    similarityScore: z.ZodDefault<z.ZodNumber>;
    relationshipStrength: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    metadata: Record<string, any>;
    sourceChunkId: string;
    targetChunkId: string;
    relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
    similarityScore: number;
    relationshipStrength: number;
}, {
    id: string;
    createdAt: string;
    sourceChunkId: string;
    targetChunkId: string;
    relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
    metadata?: Record<string, any> | undefined;
    similarityScore?: number | undefined;
    relationshipStrength?: number | undefined;
}>;
export type ChunkRelationship = z.infer<typeof ChunkRelationshipSchema>;
export declare const ChunkVersionSchema: z.ZodObject<{
    id: z.ZodString;
    chunkId: z.ZodString;
    versionNumber: z.ZodNumber;
    content: z.ZodString;
    contentHash: z.ZodString;
    changeType: z.ZodEnum<["created", "content_updated", "metadata_updated", "split", "merged", "deleted"]>;
    changeSummary: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    content: string;
    changeType: "split" | "created" | "content_updated" | "metadata_updated" | "merged" | "deleted";
    contentHash: string;
    chunkId: string;
    versionNumber: number;
    changeSummary?: string | undefined;
    createdBy?: string | undefined;
}, {
    id: string;
    createdAt: string;
    content: string;
    changeType: "split" | "created" | "content_updated" | "metadata_updated" | "merged" | "deleted";
    contentHash: string;
    chunkId: string;
    versionNumber: number;
    changeSummary?: string | undefined;
    createdBy?: string | undefined;
}>;
export type ChunkVersion = z.infer<typeof ChunkVersionSchema>;
export declare const ChunkTopicSchema: z.ZodObject<{
    id: z.ZodString;
    chunkId: z.ZodString;
    topicName: z.ZodString;
    topicCategory: z.ZodOptional<z.ZodString>;
    confidenceScore: z.ZodDefault<z.ZodNumber>;
    topicKeywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    topicMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    chunkId: string;
    topicName: string;
    confidenceScore: number;
    topicKeywords: string[];
    topicMetadata: Record<string, any>;
    topicCategory?: string | undefined;
}, {
    id: string;
    createdAt: string;
    chunkId: string;
    topicName: string;
    topicCategory?: string | undefined;
    confidenceScore?: number | undefined;
    topicKeywords?: string[] | undefined;
    topicMetadata?: Record<string, any> | undefined;
}>;
export type ChunkTopic = z.infer<typeof ChunkTopicSchema>;
export declare const ChunkingConfigSchema: z.ZodObject<{
    strategy: z.ZodDefault<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap", "hybrid"]>>;
    maxChunkSize: z.ZodDefault<z.ZodNumber>;
    minChunkSize: z.ZodDefault<z.ZodNumber>;
    overlapPercentage: z.ZodDefault<z.ZodNumber>;
    embeddingModel: z.ZodDefault<z.ZodString>;
    similarityThreshold: z.ZodDefault<z.ZodNumber>;
    qualityThreshold: z.ZodDefault<z.ZodNumber>;
    enableVersioning: z.ZodDefault<z.ZodBoolean>;
    enableTopicDetection: z.ZodDefault<z.ZodBoolean>;
    enableRelationshipDetection: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    embeddingModel: string;
    strategy: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
    maxChunkSize: number;
    minChunkSize: number;
    overlapPercentage: number;
    similarityThreshold: number;
    qualityThreshold: number;
    enableVersioning: boolean;
    enableTopicDetection: boolean;
    enableRelationshipDetection: boolean;
}, {
    embeddingModel?: string | undefined;
    strategy?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
    maxChunkSize?: number | undefined;
    minChunkSize?: number | undefined;
    overlapPercentage?: number | undefined;
    similarityThreshold?: number | undefined;
    qualityThreshold?: number | undefined;
    enableVersioning?: boolean | undefined;
    enableTopicDetection?: boolean | undefined;
    enableRelationshipDetection?: boolean | undefined;
}>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export declare const SemanticSearchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    documentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    chunkTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap"]>, "many">>;
    topicCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    similarityThreshold: z.ZodDefault<z.ZodNumber>;
    maxResults: z.ZodDefault<z.ZodNumber>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
    includeRelationships: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeMetadata: boolean;
    similarityThreshold: number;
    query: string;
    maxResults: number;
    includeRelationships: boolean;
    documentIds?: string[] | undefined;
    chunkTypes?: ("semantic" | "structural" | "fixed-size" | "overlap")[] | undefined;
    topicCategories?: string[] | undefined;
}, {
    query: string;
    includeMetadata?: boolean | undefined;
    similarityThreshold?: number | undefined;
    documentIds?: string[] | undefined;
    chunkTypes?: ("semantic" | "structural" | "fixed-size" | "overlap")[] | undefined;
    topicCategories?: string[] | undefined;
    maxResults?: number | undefined;
    includeRelationships?: boolean | undefined;
}>;
export type SemanticSearchQuery = z.infer<typeof SemanticSearchQuerySchema>;
export declare const SemanticSearchResultSchema: z.ZodObject<{
    chunk: z.ZodObject<{
        id: z.ZodString;
        documentId: z.ZodString;
        chunkIndex: z.ZodNumber;
        content: z.ZodString;
        contentHash: z.ZodString;
        tokenCount: z.ZodDefault<z.ZodNumber>;
        chunkType: z.ZodDefault<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap", "hybrid"]>>;
        startPosition: z.ZodDefault<z.ZodNumber>;
        endPosition: z.ZodDefault<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        qualityScore: z.ZodDefault<z.ZodNumber>;
        qualityMetrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        metadata: Record<string, any>;
        chunkIndex: number;
        contentHash: string;
        tokenCount: number;
        chunkType: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        startPosition: number;
        endPosition: number;
        qualityScore: number;
        qualityMetrics: Record<string, any>;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        chunkIndex: number;
        contentHash: string;
        metadata?: Record<string, any> | undefined;
        tokenCount?: number | undefined;
        chunkType?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        startPosition?: number | undefined;
        endPosition?: number | undefined;
        qualityScore?: number | undefined;
        qualityMetrics?: Record<string, any> | undefined;
    }>;
    similarityScore: z.ZodNumber;
    relationships: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceChunkId: z.ZodString;
        targetChunkId: z.ZodString;
        relationshipType: z.ZodEnum<["semantic_similarity", "sequential", "reference", "dependency", "contradiction", "elaboration", "summary", "example"]>;
        similarityScore: z.ZodDefault<z.ZodNumber>;
        relationshipStrength: z.ZodDefault<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        metadata: Record<string, any>;
        sourceChunkId: string;
        targetChunkId: string;
        relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
        similarityScore: number;
        relationshipStrength: number;
    }, {
        id: string;
        createdAt: string;
        sourceChunkId: string;
        targetChunkId: string;
        relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
        metadata?: Record<string, any> | undefined;
        similarityScore?: number | undefined;
        relationshipStrength?: number | undefined;
    }>, "many">>;
    topics: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        chunkId: z.ZodString;
        topicName: z.ZodString;
        topicCategory: z.ZodOptional<z.ZodString>;
        confidenceScore: z.ZodDefault<z.ZodNumber>;
        topicKeywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        topicMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        chunkId: string;
        topicName: string;
        confidenceScore: number;
        topicKeywords: string[];
        topicMetadata: Record<string, any>;
        topicCategory?: string | undefined;
    }, {
        id: string;
        createdAt: string;
        chunkId: string;
        topicName: string;
        topicCategory?: string | undefined;
        confidenceScore?: number | undefined;
        topicKeywords?: string[] | undefined;
        topicMetadata?: Record<string, any> | undefined;
    }>, "many">>;
    contextChunks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        documentId: z.ZodString;
        chunkIndex: z.ZodNumber;
        content: z.ZodString;
        contentHash: z.ZodString;
        tokenCount: z.ZodDefault<z.ZodNumber>;
        chunkType: z.ZodDefault<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap", "hybrid"]>>;
        startPosition: z.ZodDefault<z.ZodNumber>;
        endPosition: z.ZodDefault<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        qualityScore: z.ZodDefault<z.ZodNumber>;
        qualityMetrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        metadata: Record<string, any>;
        chunkIndex: number;
        contentHash: string;
        tokenCount: number;
        chunkType: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        startPosition: number;
        endPosition: number;
        qualityScore: number;
        qualityMetrics: Record<string, any>;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        chunkIndex: number;
        contentHash: string;
        metadata?: Record<string, any> | undefined;
        tokenCount?: number | undefined;
        chunkType?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        startPosition?: number | undefined;
        endPosition?: number | undefined;
        qualityScore?: number | undefined;
        qualityMetrics?: Record<string, any> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    similarityScore: number;
    chunk: {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        metadata: Record<string, any>;
        chunkIndex: number;
        contentHash: string;
        tokenCount: number;
        chunkType: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        startPosition: number;
        endPosition: number;
        qualityScore: number;
        qualityMetrics: Record<string, any>;
    };
    relationships?: {
        id: string;
        createdAt: string;
        metadata: Record<string, any>;
        sourceChunkId: string;
        targetChunkId: string;
        relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
        similarityScore: number;
        relationshipStrength: number;
    }[] | undefined;
    topics?: {
        id: string;
        createdAt: string;
        chunkId: string;
        topicName: string;
        confidenceScore: number;
        topicKeywords: string[];
        topicMetadata: Record<string, any>;
        topicCategory?: string | undefined;
    }[] | undefined;
    contextChunks?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        metadata: Record<string, any>;
        chunkIndex: number;
        contentHash: string;
        tokenCount: number;
        chunkType: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        startPosition: number;
        endPosition: number;
        qualityScore: number;
        qualityMetrics: Record<string, any>;
    }[] | undefined;
}, {
    similarityScore: number;
    chunk: {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        chunkIndex: number;
        contentHash: string;
        metadata?: Record<string, any> | undefined;
        tokenCount?: number | undefined;
        chunkType?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        startPosition?: number | undefined;
        endPosition?: number | undefined;
        qualityScore?: number | undefined;
        qualityMetrics?: Record<string, any> | undefined;
    };
    relationships?: {
        id: string;
        createdAt: string;
        sourceChunkId: string;
        targetChunkId: string;
        relationshipType: "reference" | "summary" | "semantic_similarity" | "sequential" | "dependency" | "contradiction" | "elaboration" | "example";
        metadata?: Record<string, any> | undefined;
        similarityScore?: number | undefined;
        relationshipStrength?: number | undefined;
    }[] | undefined;
    topics?: {
        id: string;
        createdAt: string;
        chunkId: string;
        topicName: string;
        topicCategory?: string | undefined;
        confidenceScore?: number | undefined;
        topicKeywords?: string[] | undefined;
        topicMetadata?: Record<string, any> | undefined;
    }[] | undefined;
    contextChunks?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        documentId: string;
        content: string;
        chunkIndex: number;
        contentHash: string;
        metadata?: Record<string, any> | undefined;
        tokenCount?: number | undefined;
        chunkType?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        startPosition?: number | undefined;
        endPosition?: number | undefined;
        qualityScore?: number | undefined;
        qualityMetrics?: Record<string, any> | undefined;
    }[] | undefined;
}>;
export type SemanticSearchResult = z.infer<typeof SemanticSearchResultSchema>;
export declare const ChunkAnalyticsSchema: z.ZodObject<{
    documentId: z.ZodString;
    totalChunks: z.ZodNumber;
    averageChunkSize: z.ZodNumber;
    averageQualityScore: z.ZodNumber;
    topicDistribution: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    relationshipCounts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    chunkTypeDistribution: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    analyzedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    analyzedAt: string;
    totalChunks: number;
    averageChunkSize: number;
    averageQualityScore: number;
    topicDistribution: Record<string, number>;
    relationshipCounts: Record<string, number>;
    chunkTypeDistribution: Record<string, number>;
}, {
    documentId: string;
    analyzedAt: string;
    totalChunks: number;
    averageChunkSize: number;
    averageQualityScore: number;
    topicDistribution?: Record<string, number> | undefined;
    relationshipCounts?: Record<string, number> | undefined;
    chunkTypeDistribution?: Record<string, number> | undefined;
}>;
export type ChunkAnalytics = z.infer<typeof ChunkAnalyticsSchema>;
export declare const BatchChunkOperationSchema: z.ZodObject<{
    operation: z.ZodEnum<["create", "update", "delete", "analyze", "reindex"]>;
    documentIds: z.ZodArray<z.ZodString, "many">;
    config: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["semantic", "structural", "fixed-size", "overlap", "hybrid"]>>;
        maxChunkSize: z.ZodDefault<z.ZodNumber>;
        minChunkSize: z.ZodDefault<z.ZodNumber>;
        overlapPercentage: z.ZodDefault<z.ZodNumber>;
        embeddingModel: z.ZodDefault<z.ZodString>;
        similarityThreshold: z.ZodDefault<z.ZodNumber>;
        qualityThreshold: z.ZodDefault<z.ZodNumber>;
        enableVersioning: z.ZodDefault<z.ZodBoolean>;
        enableTopicDetection: z.ZodDefault<z.ZodBoolean>;
        enableRelationshipDetection: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        embeddingModel: string;
        strategy: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        maxChunkSize: number;
        minChunkSize: number;
        overlapPercentage: number;
        similarityThreshold: number;
        qualityThreshold: number;
        enableVersioning: boolean;
        enableTopicDetection: boolean;
        enableRelationshipDetection: boolean;
    }, {
        embeddingModel?: string | undefined;
        strategy?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        maxChunkSize?: number | undefined;
        minChunkSize?: number | undefined;
        overlapPercentage?: number | undefined;
        similarityThreshold?: number | undefined;
        qualityThreshold?: number | undefined;
        enableVersioning?: boolean | undefined;
        enableTopicDetection?: boolean | undefined;
        enableRelationshipDetection?: boolean | undefined;
    }>>;
    options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    options: Record<string, any>;
    documentIds: string[];
    operation: "update" | "create" | "delete" | "analyze" | "reindex";
    config?: {
        embeddingModel: string;
        strategy: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid";
        maxChunkSize: number;
        minChunkSize: number;
        overlapPercentage: number;
        similarityThreshold: number;
        qualityThreshold: number;
        enableVersioning: boolean;
        enableTopicDetection: boolean;
        enableRelationshipDetection: boolean;
    } | undefined;
}, {
    documentIds: string[];
    operation: "update" | "create" | "delete" | "analyze" | "reindex";
    config?: {
        embeddingModel?: string | undefined;
        strategy?: "semantic" | "structural" | "fixed-size" | "overlap" | "hybrid" | undefined;
        maxChunkSize?: number | undefined;
        minChunkSize?: number | undefined;
        overlapPercentage?: number | undefined;
        similarityThreshold?: number | undefined;
        qualityThreshold?: number | undefined;
        enableVersioning?: boolean | undefined;
        enableTopicDetection?: boolean | undefined;
        enableRelationshipDetection?: boolean | undefined;
    } | undefined;
    options?: Record<string, any> | undefined;
}>;
export type BatchChunkOperation = z.infer<typeof BatchChunkOperationSchema>;
export declare const BatchOperationResultSchema: z.ZodObject<{
    operationId: z.ZodString;
    operation: z.ZodEnum<["create", "update", "delete", "analyze", "reindex"]>;
    totalItems: z.ZodNumber;
    processedItems: z.ZodNumber;
    successfulItems: z.ZodNumber;
    failedItems: z.ZodNumber;
    errors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        documentId: z.ZodString;
        error: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        error: string;
        documentId: string;
    }, {
        error: string;
        documentId: string;
    }>, "many">>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "pending" | "completed" | "running" | "cancelled";
    errors: {
        error: string;
        documentId: string;
    }[];
    operation: "update" | "create" | "delete" | "analyze" | "reindex";
    operationId: string;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    startedAt: string;
    completedAt?: string | undefined;
}, {
    status: "failed" | "pending" | "completed" | "running" | "cancelled";
    operation: "update" | "create" | "delete" | "analyze" | "reindex";
    operationId: string;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    startedAt: string;
    errors?: {
        error: string;
        documentId: string;
    }[] | undefined;
    completedAt?: string | undefined;
}>;
export type BatchOperationResult = z.infer<typeof BatchOperationResultSchema>;
export interface SemanticChunkingService {
    createChunks(documentId: string, content: string, config?: ChunkingConfig): Promise<DocumentChunk[]>;
    getChunksByDocument(documentId: string): Promise<DocumentChunk[]>;
    getChunkById(chunkId: string): Promise<DocumentChunk | null>;
    updateChunk(chunkId: string, updates: Partial<DocumentChunk>): Promise<void>;
    deleteChunk(chunkId: string): Promise<void>;
    generateEmbeddings(chunkId: string, model?: string): Promise<ChunkEmbedding>;
    getEmbedding(chunkId: string, model?: string): Promise<ChunkEmbedding | null>;
    updateEmbedding(embeddingId: string, vector: number[]): Promise<void>;
    detectRelationships(chunkId: string): Promise<ChunkRelationship[]>;
    createRelationship(sourceId: string, targetId: string, type: string, score?: number): Promise<ChunkRelationship>;
    getRelationships(chunkId: string, types?: string[]): Promise<ChunkRelationship[]>;
    detectTopics(chunkId: string): Promise<ChunkTopic[]>;
    assignTopic(chunkId: string, topicName: string, category?: string, confidence?: number): Promise<ChunkTopic>;
    getTopicsByChunk(chunkId: string): Promise<ChunkTopic[]>;
    semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;
    getChunkAnalytics(documentId: string): Promise<ChunkAnalytics>;
    processBatchOperation(operation: BatchChunkOperation): Promise<BatchOperationResult>;
    getBatchOperationStatus(operationId: string): Promise<BatchOperationResult>;
}
export declare const MigrationStatusSchema: z.ZodObject<{
    documentId: z.ZodString;
    migrationVersion: z.ZodString;
    migrationStatus: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
    chunksCreated: z.ZodDefault<z.ZodNumber>;
    embeddingsGenerated: z.ZodDefault<z.ZodNumber>;
    relationshipsDetected: z.ZodDefault<z.ZodNumber>;
    topicsDetected: z.ZodDefault<z.ZodNumber>;
    migrationStartedAt: z.ZodString;
    migrationCompletedAt: z.ZodOptional<z.ZodString>;
    migrationErrors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    migrationVersion: string;
    migrationStatus: "failed" | "pending" | "completed" | "in_progress";
    chunksCreated: number;
    embeddingsGenerated: number;
    relationshipsDetected: number;
    topicsDetected: number;
    migrationStartedAt: string;
    migrationErrors: string[];
    migrationCompletedAt?: string | undefined;
}, {
    documentId: string;
    migrationVersion: string;
    migrationStatus: "failed" | "pending" | "completed" | "in_progress";
    migrationStartedAt: string;
    chunksCreated?: number | undefined;
    embeddingsGenerated?: number | undefined;
    relationshipsDetected?: number | undefined;
    topicsDetected?: number | undefined;
    migrationCompletedAt?: string | undefined;
    migrationErrors?: string[] | undefined;
}>;
export type MigrationStatus = z.infer<typeof MigrationStatusSchema>;
//# sourceMappingURL=semantic-chunking.types.d.ts.map