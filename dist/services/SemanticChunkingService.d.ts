import { Logger } from 'winston';
import { DocumentChunk, ChunkEmbedding, ChunkRelationship, ChunkTopic, ChunkingConfig, SemanticSearchQuery, SemanticSearchResult, ChunkAnalytics, BatchChunkOperation, BatchOperationResult, SemanticChunkingService as ISemanticChunkingService } from '../types/semantic-chunking.types.ts';
import { DocumentLifecycleService } from './DocumentLifecycleService.ts';
import { DocumentationService } from './DocumentationService.ts';
import { AIAnalysisService } from './AIAnalysisService.ts';
/**
 * Semantic Chunking Service
 *
 * Main orchestration service for semantic document chunking.
 * Coordinates document parsing, semantic boundary detection,
 * and multiple chunking algorithms (semantic, structural, fixed-size, overlap, hybrid).
 *
 * Integration points:
 * - DocumentationService for document categorization
 * - AIAnalysisService for content analysis
 * - DocumentLifecycleService for chunk persistence
 *
 * Phase 1 Week 3 Implementation - Core Chunking Service
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class SemanticChunkingService implements ISemanticChunkingService {
    private logger;
    private documentLifecycleService;
    private documentationService;
    private aiAnalysisService;
    private contentParser;
    private chunkBoundaryDetector;
    private chunkingStrategies;
    private initialized;
    constructor(logger: Logger, documentLifecycleService: DocumentLifecycleService, documentationService: DocumentationService, aiAnalysisService: AIAnalysisService);
    /**
     * Initialize the semantic chunking service
     */
    initialize(): Promise<void>;
    /**
     * Register all available chunking strategies
     */
    private registerChunkingStrategies;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Create chunks from document content using specified strategy
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
     * Generate embeddings for a chunk using AI Analysis Service
     */
    generateEmbeddings(chunkId: string, model?: string): Promise<ChunkEmbedding>;
    /**
     * Get embedding for a chunk
     */
    getEmbedding(chunkId: string, model?: string): Promise<ChunkEmbedding | null>;
    /**
     * Update embedding
     */
    updateEmbedding(embeddingId: string, vector: number[]): Promise<void>;
    /**
     * Detect relationships for a chunk using AI analysis
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
     * Detect topics for a chunk using AI analysis
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
     * Semantic search across chunks using AI embeddings
     */
    semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;
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
     * Persist chunks to database
     */
    private persistChunks;
    /**
     * Perform post-processing on chunks (embeddings, relationships, topics) with AI enhancement
     */
    private performPostProcessing;
    /**
     * Calculate semantic similarity between chunks
     */
    calculateChunkSimilarity(chunkId1: string, chunkId2: string): Promise<number>;
    /**
     * Find similar chunks to a given chunk
     */
    findSimilarChunks(chunkId: string, threshold?: number, maxResults?: number): Promise<Array<{
        chunk: DocumentChunk;
        similarity: number;
    }>>;
    /**
     * Get AI-powered analytics for chunks
     */
    getAIAnalytics(documentId: string): Promise<{
        averageQualityScore: number;
        qualityDistribution: Record<string, number>;
        topTopics: Array<{
            topic: string;
            frequency: number;
            confidence: number;
        }>;
        relationshipStrengths: Record<string, number>;
        improvementSuggestions: string[];
    }>;
    /**
     * Generate content hash
     */
    private generateContentHash;
    /**
     * Estimate token count (rough estimation: ~4 characters per token)
     */
    private estimateTokenCount;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
/**
 * Document structure analysis result
 */
export interface DocumentStructure {
    type: 'markdown' | 'code' | 'text' | 'mixed' | 'json' | 'xml' | 'yaml';
    sections: DocumentSection[];
    metadata: Record<string, any>;
    language?: string;
    encoding?: string;
}
/**
 * Document section information
 */
export interface DocumentSection {
    type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'other';
    level?: number;
    title?: string;
    content: string;
    startPosition: number;
    endPosition: number;
    metadata?: Record<string, any>;
}
/**
 * Semantic boundary detection result
 */
export interface SemanticBoundary {
    position: number;
    type: 'section' | 'topic' | 'context' | 'natural';
    confidence: number;
    reason: string;
    metadata?: Record<string, any>;
}
/**
 * Raw chunk data from chunking strategies
 */
export interface RawChunk {
    content: string;
    type?: string;
    startPosition?: number;
    endPosition?: number;
    qualityScore?: number;
    qualityMetrics?: Record<string, any>;
    metadata?: Record<string, any>;
}
/**
 * Chunking strategy interface
 */
export interface IChunkingStrategy {
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
}
/**
 * Chunking context for strategies
 */
export interface ChunkingContext {
    config: ChunkingConfig;
    structure: DocumentStructure;
    boundaries: SemanticBoundary[];
}
//# sourceMappingURL=SemanticChunkingService.d.ts.map