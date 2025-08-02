import { Logger } from 'winston';
import { AIAnalysisService } from '../AIAnalysisService.ts';
import { ContentParser } from '../ContentParser.ts';
import { IChunkingStrategy, ChunkingContext, RawChunk } from '../SemanticChunkingService.ts';
/**
 * Hybrid Chunking Strategy
 *
 * Implements a hybrid approach that combines multiple chunking strategies
 * to achieve optimal results. Adapts strategy selection based on content
 * characteristics and dynamically switches between approaches within a document.
 *
 * Phase 1 Week 3 Implementation - Hybrid Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class HybridChunkingStrategy implements IChunkingStrategy {
    private logger;
    private aiAnalysisService;
    private contentParser;
    private readonly STRATEGY_WEIGHTS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, contentParser: ContentParser);
    /**
     * Chunk content using hybrid approach
     */
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
    /**
     * Analyze content to determine optimal strategy mix
     */
    private analyzeContentForStrategy;
    /**
     * Calculate structural score based on document structure
     */
    private calculateStructuralScore;
    /**
     * Calculate semantic score based on content analysis
     */
    private calculateSemanticScore;
    /**
     * Calculate content complexity
     */
    private calculateContentComplexity;
    /**
     * Calculate strategy weights based on analysis
     */
    private calculateStrategyWeights;
    /**
     * Generate chunks using multiple strategies
     */
    private generateChunksWithMultipleStrategies;
    /**
     * Generate chunks with a specific strategy
     */
    private generateChunksWithStrategy;
    /**
     * Simplified semantic chunking (would use actual SemanticChunkingStrategy)
     */
    private generateSemanticChunks;
    /**
     * Simplified structural chunking
     */
    private generateStructuralChunks;
    /**
     * Simplified fixed-size chunking
     */
    private generateFixedSizeChunks;
    /**
     * Merge and optimize chunks from different strategies
     */
    private mergeAndOptimizeChunks;
    /**
     * Intelligent merging of chunks from different strategies
     */
    private intelligentChunkMerging;
    /**
     * Find chunks that cover a specific region
     */
    private findChunksCoveringRegion;
    /**
     * Create merged chunk from multiple strategy chunks
     */
    private createMergedChunk;
    /**
     * Calculate hybrid quality score
     */
    private calculateHybridQuality;
    /**
     * Finalize hybrid chunks
     */
    private finalizeHybridChunks;
    /**
     * Optimize hybrid chunk sizes
     */
    private optimizeHybridChunkSizes;
}
//# sourceMappingURL=HybridChunkingStrategy.d.ts.map