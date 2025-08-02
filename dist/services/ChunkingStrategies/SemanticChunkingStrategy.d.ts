import { Logger } from 'winston';
import { AIAnalysisService } from '../AIAnalysisService.ts';
import { IChunkingStrategy, ChunkingContext, RawChunk } from '../SemanticChunkingService.ts';
/**
 * Semantic Chunking Strategy
 *
 * Implements semantic-based document chunking that considers meaning and context.
 * Uses AI analysis to understand semantic relationships and creates chunks
 * that maintain coherent topics and concepts.
 *
 * Phase 1 Week 3 Implementation - Semantic Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class SemanticChunkingStrategy implements IChunkingStrategy {
    private logger;
    private aiAnalysisService;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService);
    /**
     * Chunk content using semantic analysis
     */
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
    /**
     * Create a semantic chunk with analysis
     */
    private createSemanticChunk;
    /**
     * Analyze semantic properties of chunk content
     */
    private analyzeChunkSemantics;
    /**
     * Calculate semantic quality score
     */
    private calculateSemanticQuality;
    /**
     * Extract topics from content
     */
    private extractTopics;
    /**
     * Extract key concepts from content
     */
    private extractKeyConcepts;
    /**
     * Calculate coherence score based on sentence relationships
     */
    private calculateCoherence;
    /**
     * Calculate topic consistency score
     */
    private calculateTopicConsistency;
    /**
     * Extract key terms from content
     */
    private extractKeyTerms;
    /**
     * Fallback semantic chunking when no boundaries are found
     */
    private fallbackSemanticChunking;
    /**
     * Optimize chunks for better semantic coherence
     */
    private optimizeChunks;
    /**
     * Split a large chunk into smaller semantic chunks
     */
    private splitLargeChunk;
    /**
     * Estimate token count (rough estimation: ~4 characters per token)
     */
    private estimateTokenCount;
}
//# sourceMappingURL=SemanticChunkingStrategy.d.ts.map