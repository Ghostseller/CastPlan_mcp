import { Logger } from 'winston';
import { AIAnalysisService as IAIAnalysisService, AIAnalysis } from '../types/enhanced.types.ts';
import { RedisCacheService } from './RedisCacheService.ts';
/**
 * AI Analysis Service
 *
 * Provides intelligent document analysis using various AI providers.
 * Supports quality assessment, duplicate detection, relevance scoring,
 * embedding generation, semantic similarity calculations, and AI-powered quality assessment.
 *
 * Phase 1 Week 4 Enhancement - AI Integration & Testing
 * Phase 2.2 Enhancement - Redis Cache Integration
 *
 * Created: 2025-07-29
 * Enhanced: 2025-07-31 - Added embeddings and semantic analysis capabilities
 * Enhanced: 2025-07-31 - Migrated embedding cache to Redis for distributed caching
 */
export declare class AIAnalysisService implements IAIAnalysisService {
    private aiProvider;
    private logger;
    private aiClient;
    private cacheService;
    private readonly CACHE_TTL;
    private readonly CACHE_NAMESPACE;
    private operationMutex;
    constructor(aiProvider: 'openai' | 'anthropic' | 'local', logger: Logger, cacheService: RedisCacheService, openAIClient?: any, OpenAIClass?: any);
    /**
     * Initialize AI client based on provider
     * @param OpenAIClass - Optional OpenAI constructor class for dependency injection
     */
    private initializeAIClient;
    /**
     * Analyze document quality using AI
     * @param documentPath - Path to document to analyze
     * @returns Promise resolving to AI analysis result
     * @throws Error if document cannot be read or analyzed
     */
    analyzeQuality(documentPath: string): Promise<AIAnalysis>;
    /**
     * Detect duplicate content
     */
    detectDuplicates(documentPath: string): Promise<AIAnalysis>;
    /**
     * Calculate relevance to work context
     */
    calculateRelevance(documentPath: string, workContext: string): Promise<AIAnalysis>;
    /**
     * Generate insights about the document
     */
    generateInsights(documentPath: string): Promise<string[]>;
    /**
     * Generate embeddings for content using OpenAI API with Redis caching
     */
    generateEmbeddings(content: string, model?: string): Promise<number[]>;
    /**
     * Calculate semantic similarity between two pieces of content
     */
    calculateSemanticSimilarity(content1: string, content2: string): Promise<number>;
    /**
     * Calculate cosine similarity between two vectors
     */
    private calculateCosineSimilarity;
    /**
     * Find semantically similar content chunks
     */
    findSimilarChunks(queryContent: string, chunkContents: string[], threshold?: number): Promise<Array<{
        index: number;
        similarity: number;
        content: string;
    }>>;
    /**
     * AI-powered quality assessment for chunks
     */
    assessChunkQuality(content: string, context?: {
        documentType?: string;
        expectedTopics?: string[];
    }): Promise<{
        qualityScore: number;
        qualityMetrics: Record<string, number>;
        suggestions: string[];
        confidence: number;
    }>;
    /**
     * Detect topics in content using AI analysis
     */
    detectTopics(content: string, maxTopics?: number): Promise<Array<{
        topic: string;
        confidence: number;
        keywords: string[];
    }>>;
    /**
     * Analyze relationships between chunks
     */
    analyzeChunkRelationships(sourceContent: string, targetContents: string[]): Promise<Array<{
        targetIndex: number;
        relationshipType: 'semantic_similarity' | 'sequential' | 'reference' | 'dependency' | 'contradiction' | 'elaboration' | 'summary' | 'example';
        strength: number;
        confidence: number;
    }>>;
    private analyzeQualityWithOpenAI;
    private analyzeQualityLocally;
    private calculateRelevanceWithOpenAI;
    private calculateRelevanceLocally;
    private detectDuplicatesWithOpenAI;
    private detectDuplicatesLocally;
    private calculateDuplicateScore;
    private generateDuplicateInsights;
    private generateDuplicateSuggestions;
    private findRepeatedPatterns;
    private generateInsightsWithOpenAI;
    private generateInsightsLocally;
    private readDocumentContent;
    private createFallbackAnalysis;
    /**
     * Generate random embedding vector for fallback
     */
    private generateRandomEmbedding;
    /**
     * Clear embedding cache (Redis-based)
     */
    clearEmbeddingCache(): Promise<boolean>;
    /**
     * Generate content hash for caching
     */
    private generateContentHash;
    /**
     * AI-powered chunk quality assessment with OpenAI
     */
    private assessChunkQualityWithOpenAI;
    /**
     * Local chunk quality assessment
     */
    private assessChunkQualityLocally;
    /**
     * Detect topics with OpenAI
     */
    private detectTopicsWithOpenAI;
    /**
     * Detect topics locally using keyword analysis
     */
    private detectTopicsLocally;
    /**
     * Determine relationship type between two content pieces
     */
    private determineRelationshipType;
    /**
     * Get cache statistics from Redis
     */
    getCacheStatistics(): Promise<{
        keyCount: number;
        memoryUsage: number;
        hitRate: number;
        totalOperations: number;
    }>;
    /**
     * Invalidate embeddings cache by model or content pattern
     */
    invalidateEmbeddings(pattern?: string): Promise<number>;
    /**
     * Health check for cache service
     */
    isCacheHealthy(): Promise<boolean>;
}
//# sourceMappingURL=AIAnalysisService.d.ts.map