import { Logger } from 'winston';
import { ContentParser } from '../ContentParser.ts';
import { IChunkingStrategy, ChunkingContext, RawChunk } from '../SemanticChunkingService.ts';
/**
 * Structural Chunking Strategy
 *
 * Implements structure-based document chunking that follows document hierarchy.
 * Uses document structure analysis to create chunks that respect headings,
 * sections, code blocks, and other structural elements.
 *
 * Phase 1 Week 3 Implementation - Structural Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class StructuralChunkingStrategy implements IChunkingStrategy {
    private logger;
    private contentParser;
    constructor(logger: Logger, contentParser: ContentParser);
    /**
     * Chunk content using structural analysis
     */
    chunk(content: string, context: ChunkingContext): Promise<RawChunk[]>;
    /**
     * Chunk Markdown content based on structure
     */
    private chunkMarkdownStructure;
    /**
     * Chunk code content based on structure
     */
    private chunkCodeStructure;
    /**
     * Chunk text content based on structure
     */
    private chunkTextStructure;
    /**
     * Chunk mixed content based on structure
     */
    private chunkMixedStructure;
    /**
     * Fallback chunking by paragraphs
     */
    private chunkByParagraphs;
    /**
     * Chunk code by logical blocks
     */
    private chunkCodeByBlocks;
    /**
     * Create a structural chunk with metadata
     */
    private createStructuralChunk;
    /**
     * Calculate structural quality score
     */
    private calculateStructuralQuality;
    /**
     * Optimize structural chunks
     */
    private optimizeStructuralChunks;
    /**
     * Split large structural chunk
     */
    private splitLargeStructuralChunk;
    /**
     * Estimate token count
     */
    private estimateTokenCount;
}
//# sourceMappingURL=StructuralChunkingStrategy.d.ts.map