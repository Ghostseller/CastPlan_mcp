import { Logger } from 'winston';
import { IChunkingStrategy, ChunkingContext, RawChunk } from '../SemanticChunkingService.ts';
/**
 * Overlap Chunking Strategy
 *
 * Implements overlapping document chunking that creates chunks with
 * overlapping content to maintain context continuity. Useful for
 * search and retrieval systems where context preservation is important.
 *
 * Phase 1 Week 3 Implementation - Overlap Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class OverlapChunkingStrategy implements IChunkingStrategy {
    private logger;
    constructor(logger: Logger);
    /**
     * Chunk content using overlap approach
     */
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
    /**
     * Calculate base chunk size (without overlap)
     */
    private calculateBaseChunkSize;
    /**
     * Calculate overlap size based on percentage and chunk size
     */
    private calculateOverlapSize;
    /**
     * Find optimal break point for chunk boundaries
     */
    private findOptimalBreakPoint;
    /**
     * Find potential break points with context awareness
     */
    private findBreakPoints;
    /**
     * Calculate context value for a potential break point
     */
    private calculateContextValue;
    /**
     * Select best break point considering quality and context
     */
    private selectBestBreakPoint;
    /**
     * Calculate next chunk starting position with overlap
     */
    private calculateNextPosition;
    /**
     * Find optimal starting point for overlap
     */
    private findOptimalOverlapStart;
    /**
     * Find good starting points for overlaps
     */
    private findOverlapStartPoints;
    /**
     * Calculate overlap information for chunk metadata
     */
    private calculateOverlapInfo;
    /**
     * Create an overlap chunk with metadata
     */
    private createOverlapChunk;
    /**
     * Calculate quality score for overlap chunk
     */
    private calculateOverlapQuality;
    /**
     * Analyze overlap statistics
     */
    private analyzeOverlapStats;
    /**
     * Optimize overlaps to ensure consistency and quality
     */
    private optimizeOverlaps;
    /**
     * Assess overlap quality between two consecutive chunks
     */
    private assessOverlapQuality;
    /**
     * Improve overlap between chunks
     */
    private improveOverlap;
}
//# sourceMappingURL=OverlapChunkingStrategy.d.ts.map