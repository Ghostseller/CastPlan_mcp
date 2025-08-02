import { Logger } from 'winston';
import { AIAnalysisService } from './AIAnalysisService.ts';
import { DocumentStructure, SemanticBoundary } from './SemanticChunkingService.ts';
import { ChunkingConfig } from '../types/semantic-chunking.types.ts';
/**
 * Chunk Boundary Detector
 *
 * Responsible for detecting semantic boundaries in documents for optimal chunking.
 * Uses multiple detection strategies including structural analysis, AI-powered semantic analysis,
 * content similarity, and natural language processing techniques.
 *
 * Phase 1 Week 3 Implementation - Semantic Boundary Detection
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export declare class ChunkBoundaryDetector {
    private logger;
    private aiAnalysisService;
    private initialized;
    private readonly STRUCTURAL_BOUNDARIES;
    private readonly SEMANTIC_INDICATORS;
    private readonly QUALITY_THRESHOLDS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService);
    /**
     * Initialize the boundary detector
     */
    initialize(): Promise<void>;
    /**
     * Detect semantic boundaries in content
     */
    detectBoundaries(content: string, structure: DocumentStructure, config: ChunkingConfig): Promise<SemanticBoundary[]>;
    /**
     * Detect structural boundaries based on document type
     */
    private detectStructuralBoundaries;
    /**
     * Detect Markdown-specific boundaries
     */
    private detectMarkdownBoundaries;
    /**
     * Detect code-specific boundaries
     */
    private detectCodeBoundaries;
    /**
     * Detect text-specific boundaries
     */
    private detectTextBoundaries;
    /**
     * Detect semantic boundaries using AI analysis
     */
    private detectSemanticBoundaries;
    /**
     * Detect natural language boundaries
     */
    private detectNaturalBoundaries;
    /**
     * Refine and merge boundaries to remove duplicates and low-quality boundaries
     */
    private refineBoundaries;
    /**
     * Validate boundaries and ensure they create reasonable chunk sizes
     */
    private validateBoundaries;
    /**
     * Split content into sentences
     */
    private splitIntoSentences;
    /**
     * Find the position of a sentence in the original content
     */
    private findSentencePosition;
    /**
     * Calculate semantic similarity between two text segments
     * This is a placeholder implementation - would use actual embeddings in production
     */
    private calculateSemanticSimilarity;
    /**
     * Ensure detector is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the detector
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ChunkBoundaryDetector.d.ts.map