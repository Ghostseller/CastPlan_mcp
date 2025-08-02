/**
 * Semantic Fingerprint Generator
 *
 * AI-powered semantic fingerprinting service for document evolution tracking.
 * Creates semantic signatures to detect content evolution at deeper meaning levels.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { Logger } from 'winston';
import { SemanticFingerprint, FingerprintComparison } from '../types/version-tracking.types';
import { AIAnalysisService } from './AIAnalysisService';
export interface SemanticFingerprintOptions {
    useEmbeddings: boolean;
    extractConcepts: boolean;
    includeMetadata: boolean;
    confidenceThreshold: number;
    maxConcepts: number;
}
export interface ConceptExtraction {
    concept: string;
    relevance: number;
    confidence: number;
    context: string;
}
export interface ContentAnalysis {
    concepts: ConceptExtraction[];
    themes: string[];
    complexity: number;
    readability: number;
    technicality: number;
}
/**
 * Semantic Fingerprint Generator
 *
 * Generates AI-powered semantic fingerprints for content evolution tracking.
 * Uses advanced NLP techniques to create semantic signatures that capture
 * meaning, intent, and conceptual structure of content.
 */
export declare class SemanticFingerprintGenerator {
    private logger;
    private aiAnalysisService;
    private initialized;
    private fingerprintCache;
    private readonly CACHE_TTL;
    private readonly DEFAULT_OPTIONS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService);
    /**
     * Initialize the semantic fingerprint generator
     */
    initialize(): Promise<void>;
    /**
     * Generate semantic fingerprint for content
     */
    generateFingerprint(content: string, options?: Partial<SemanticFingerprintOptions>): Promise<SemanticFingerprint>;
    /**
     * Compare two semantic fingerprints
     */
    compareFingerprints(fingerprint1: SemanticFingerprint, fingerprint2: SemanticFingerprint): Promise<FingerprintComparison>;
    /**
     * Batch generate fingerprints for multiple content pieces
     */
    batchGenerateFingerprints(contents: string[], options?: Partial<SemanticFingerprintOptions>): Promise<SemanticFingerprint[]>;
    /**
     * Analyze content to extract concepts and themes
     */
    private analyzeContent;
    /**
     * Extract concepts from content
     */
    private extractConcepts;
    /**
     * Extract phrases from content
     */
    private extractPhrases;
    /**
     * Extract context for a concept
     */
    private extractContext;
    /**
     * Extract themes from content
     */
    private extractThemes;
    /**
     * Calculate content complexity
     */
    private calculateComplexity;
    /**
     * Calculate readability score
     */
    private calculateReadability;
    /**
     * Count syllables in a word (approximation)
     */
    private countSyllables;
    /**
     * Calculate technicality score
     */
    private calculateTechnicality;
    /**
     * Generate embedding for content
     */
    private generateEmbedding;
    /**
     * Create simple embedding as fallback
     */
    private createSimpleEmbedding;
    /**
     * Simple hash function
     */
    private simpleHash;
    /**
     * Create semantic hash from content analysis
     */
    private createSemanticHash;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Calculate concept overlap between two fingerprints
     */
    private calculateConceptOverlap;
    /**
     * Calculate embedding similarity
     */
    private calculateEmbeddingSimilarity;
    /**
     * Calculate combined similarity score
     */
    private calculateCombinedSimilarity;
    /**
     * Fallback content analysis
     */
    private fallbackContentAnalysis;
    /**
     * Generate cache key
     */
    private generateCacheKey;
    /**
     * Get cached fingerprint
     */
    private getCachedFingerprint;
    /**
     * Cache fingerprint
     */
    private cacheFingerprint;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown service
     */
    shutdown(): Promise<void>;
}
export default SemanticFingerprintGenerator;
//# sourceMappingURL=SemanticFingerprintGenerator.d.ts.map