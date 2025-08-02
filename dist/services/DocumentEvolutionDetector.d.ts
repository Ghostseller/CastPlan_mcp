/**
 * Document Evolution Detector
 *
 * Advanced multi-level change detection system for document evolution tracking.
 * Provides comprehensive analysis of document changes at different granularity levels.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { Logger } from 'winston';
import { DocumentEvolution, StructuralChange, ContentChange, SemanticChange, EvolutionDetectionOptions, ChangeDetectionResult, IncrementalChangeResult, DocumentEvolutionDetector as IDocumentEvolutionDetector, ChangeType } from '../types/version-tracking.types';
import { AIAnalysisService } from './AIAnalysisService';
import { SemanticFingerprintGenerator } from './SemanticFingerprintGenerator';
import { SemanticChunkingService } from './SemanticChunkingService';
export interface ChangeDetectionMetrics {
    structuralChanges: number;
    contentChanges: number;
    semanticChanges: number;
    processingTime: number;
    confidenceScore: number;
}
export interface DiffOperation {
    operation: 'DELETE' | 'INSERT' | 'EQUAL';
    text: string;
    startIndex: number;
    endIndex: number;
}
export interface StructuralElement {
    type: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'link' | 'image';
    level?: number;
    content: string;
    position: number;
    id?: string;
}
export interface SectionComparison {
    oldSection: StructuralElement;
    newSection: StructuralElement;
    similarity: number;
    changeType: ChangeType;
}
/**
 * Enhanced Document Evolution Detector
 *
 * Provides multi-level change detection with sophisticated algorithms:
 * - Document-level: Overall structure and organization changes
 * - Section-level: Heading hierarchy and section modifications
 * - Paragraph-level: Content block changes and reorganization
 * - Chunk-level: Integration with semantic chunking for fine-grained analysis
 * - Semantic-level: AI-powered meaning and intent change detection
 */
export declare class DocumentEvolutionDetector implements IDocumentEvolutionDetector {
    private logger;
    private aiAnalysisService;
    private semanticFingerprintGenerator;
    private semanticChunkingService;
    private dmp;
    private initialized;
    private readonly DEFAULT_OPTIONS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticFingerprintGenerator: SemanticFingerprintGenerator, semanticChunkingService: SemanticChunkingService);
    /**
     * Initialize the evolution detector
     */
    initialize(): Promise<void>;
    /**
     * Detect comprehensive document evolution for a document
     */
    detectEvolution(documentId: string, options?: EvolutionDetectionOptions): Promise<DocumentEvolution>;
    /**
     * Detect comprehensive document evolution between two content versions
     */
    detectContentEvolution(oldContent: string, newContent: string, options?: EvolutionDetectionOptions): Promise<{
        overallChangeScore: number;
        structuralChanges: StructuralChange[];
        contentChanges: ContentChange[];
        semanticChanges: SemanticChange[];
        impactAnalysis: any;
    }>;
    /**
     * Detect structural changes in document organization
     */
    detectStructuralChanges(oldContent: string, newContent: string): Promise<StructuralChange[]>;
    /**
     * Detect content changes at text level
     */
    detectContentChanges(oldContent: string, newContent: string): Promise<ContentChange[]>;
    /**
     * Detect semantic changes using AI analysis
     */
    detectSemanticChanges(oldContent: string, newContent: string): Promise<SemanticChange[]>;
    /**
     * Parse structural elements from content
     */
    private parseStructuralElements;
    /**
     * Detect heading structure changes
     */
    private detectHeadingChanges;
    /**
     * Detect section additions and removals
     */
    private detectSectionChanges;
    /**
     * Detect section movements
     */
    private detectSectionMovements;
    /**
     * Detect hierarchy changes
     */
    private detectHierarchyChanges;
    /**
     * Merge adjacent changes of the same type
     */
    private mergeAdjacentChanges;
    /**
     * Detect block-level modifications
     */
    private detectBlockLevelChanges;
    /**
     * Analyze concept changes between fingerprints
     */
    private analyzeConceptChanges;
    /**
     * Detect meaning shifts using AI analysis
     */
    private detectMeaningShifts;
    /**
     * Detect intent changes
     */
    private detectIntentChanges;
    /**
     * Detect chunk-level semantic changes
     */
    private detectChunkSemanticChanges;
    /**
     * Calculate overall change score
     */
    private calculateOverallChangeScore;
    private calculateTextSimilarity;
    private calculateEditDistance;
    private groupElementsIntoSections;
    private findBestSectionMatch;
    private calculateSectionSimilarity;
    private serializeSection;
    private buildHierarchy;
    private compareHierarchies;
    private splitIntoBlocks;
    private calculateBlockPosition;
    private extractDocumentIntent;
    private ensureInitialized;
    /**
     * Detect changes between two content versions
     */
    detectChanges(oldContent: string, newContent: string): Promise<ChangeDetectionResult>;
    /**
     * Detect incremental changes for a document
     */
    detectIncrementalChanges(documentId: string, fromVersion?: string): Promise<IncrementalChangeResult>;
    /**
     * Shutdown service
     */
    shutdown(): Promise<void>;
}
export default DocumentEvolutionDetector;
//# sourceMappingURL=DocumentEvolutionDetector.d.ts.map