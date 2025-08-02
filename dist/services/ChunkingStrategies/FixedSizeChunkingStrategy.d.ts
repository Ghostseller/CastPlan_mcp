import { Logger } from 'winston';
import { IChunkingStrategy, ChunkingContext, RawChunk } from '../SemanticChunkingService.ts';
/**
 * Fixed Size Chunking Strategy
 *
 * Implements simple fixed-size document chunking that divides content
 * into chunks of approximately equal size. Useful for consistent
 * processing requirements and simple content types.
 *
 * Phase 1 Week 3 Implementation - Fixed Size Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class FixedSizeChunkingStrategy implements IChunkingStrategy {
    private logger;
    constructor(logger: Logger);
    /**
     * Chunk content using fixed size approach
     */
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
    /**
     * Calculate optimal chunk size based on configuration
     */
    private calculateOptimalChunkSize;
    /**
     * Find optimal break point near target position
     */
    private findOptimalBreakPoint;
    /**
     * Find potential break points in content
     */
    private findBreakPoints;
    /**
     * Create a fixed-size chunk with metadata
     */
    private createFixedSizeChunk;
    /**
     * Calculate quality score for fixed-size chunk
     */
    private calculateFixedSizeQuality;
    /**
     * Calculate size consistency score
     */
    private calculateSizeConsistency;
    /**
     * Analyze content statistics
     */
    private analyzeContentStats;
    /**
     * Assess break point quality
     */
    private assessBreakPointQuality;
}
//# sourceMappingURL=FixedSizeChunkingStrategy.d.ts.map