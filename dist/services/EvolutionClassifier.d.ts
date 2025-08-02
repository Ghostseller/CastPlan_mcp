/**
 * Evolution Classifier
 *
 * Automated change classification and significance scoring system.
 * Classifies document evolution patterns and assigns significance scores.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { Logger } from 'winston';
import { DocumentEvolution, DocumentChange } from '../types/version-tracking.types';
import { AIAnalysisService } from './AIAnalysisService';
import { SemanticFingerprintGenerator } from './SemanticFingerprintGenerator';
export interface EvolutionClassification {
    primaryType: EvolutionType;
    secondaryTypes: EvolutionType[];
    significanceScore: number;
    confidence: number;
    reasoning: string;
    patterns: EvolutionPattern[];
}
export interface EvolutionPattern {
    patternId: string;
    patternName: string;
    matchStrength: number;
    description: string;
    significance: number;
    frequency: number;
}
export interface SignificanceFactors {
    magnitude: number;
    scope: number;
    depth: number;
    novelty: number;
    impact: number;
    complexity: number;
}
export interface ClassificationMetrics {
    totalChanges: number;
    classificationAccuracy: number;
    processingTime: number;
    patternsDetected: number;
    significanceDistribution: {
        [key: string]: number;
    };
}
export declare enum EvolutionType {
    CONTENT_EXPANSION = "content_expansion",
    CONTENT_REDUCTION = "content_reduction",
    CONTENT_REFINEMENT = "content_refinement",
    CONTENT_CORRECTION = "content_correction",
    STRUCTURAL_REORGANIZATION = "structural_reorganization",
    HIERARCHICAL_RESTRUCTURE = "hierarchical_restructure",
    SECTION_MIGRATION = "section_migration",
    DOCUMENT_SPLITTING = "document_splitting",
    DOCUMENT_MERGING = "document_merging",
    CONCEPTUAL_SHIFT = "conceptual_shift",
    TERMINOLOGY_UPDATE = "terminology_update",
    INTENT_CLARIFICATION = "intent_clarification",
    SCOPE_REDEFINITION = "scope_redefinition",
    CLARITY_IMPROVEMENT = "clarity_improvement",
    ACCURACY_CORRECTION = "accuracy_correction",
    COMPLETENESS_ENHANCEMENT = "completeness_enhancement",
    CONSISTENCY_UPDATE = "consistency_update",
    ROUTINE_UPDATE = "routine_update",
    VERSION_SYNC = "version_sync",
    LINK_MAINTENANCE = "link_maintenance",
    FORMAT_STANDARDIZATION = "format_standardization",
    COMPLETE_REWRITE = "complete_rewrite",
    PARADIGM_SHIFT = "paradigm_shift",
    ARCHITECTURE_CHANGE = "architecture_change",
    MIXED_EVOLUTION = "mixed_evolution",
    UNKNOWN_PATTERN = "unknown_pattern"
}
export declare enum SignificanceLevel {
    TRIVIAL = "trivial",// 0.0 - 0.2
    MINOR = "minor",// 0.2 - 0.4
    MODERATE = "moderate",// 0.4 - 0.6
    SIGNIFICANT = "significant",// 0.6 - 0.8
    MAJOR = "major",// 0.8 - 0.9
    CRITICAL = "critical"
}
/**
 * Evolution Classifier
 *
 * Provides automated classification of document evolution patterns with:
 * - Multi-dimensional change type classification
 * - Significance scoring based on multiple factors
 * - Pattern recognition and matching
 * - Confidence scoring for classifications
 * - Historical pattern learning capabilities
 */
export declare class EvolutionClassifier {
    private logger;
    private aiAnalysisService;
    private semanticFingerprintGenerator;
    private initialized;
    private evolutionPatterns;
    private classificationHistory;
    private readonly SIGNIFICANCE_WEIGHTS;
    private readonly PATTERN_THRESHOLDS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticFingerprintGenerator: SemanticFingerprintGenerator);
    /**
     * Initialize the evolution classifier
     */
    initialize(): Promise<void>;
    /**
     * Classify document evolution and assign significance score
     */
    classifyEvolution(evolution: DocumentEvolution): Promise<EvolutionClassification>;
    /**
     * Classify individual document change
     */
    classifyChange(change: DocumentChange): Promise<{
        changeType: EvolutionType;
        significance: number;
        confidence: number;
    }>;
    /**
     * Get significance level from score
     */
    getSignificanceLevel(score: number): SignificanceLevel;
    /**
     * Batch classify multiple evolutions
     */
    batchClassifyEvolutions(evolutions: DocumentEvolution[]): Promise<EvolutionClassification[]>;
    /**
     * Extract change characteristics from evolution
     */
    private extractChangeCharacteristics;
    /**
     * Detect evolution patterns
     */
    private detectEvolutionPatterns;
    /**
     * Classify evolution types
     */
    private classifyEvolutionTypes;
    /**
     * Calculate significance factors
     */
    private calculateSignificanceFactors;
    /**
     * Calculate overall significance score
     */
    private calculateSignificanceScore;
    /**
     * Calculate classification confidence
     */
    private calculateClassificationConfidence;
    /**
     * Generate classification reasoning
     */
    private generateClassificationReasoning;
    /**
     * Helper methods for change analysis
     */
    private calculateChangeMagnitude;
    private calculateChangeComplexity;
    private mapChangeScopeToScore;
    private mapChangeTypeToEvolution;
    private refineClassificationWithContent;
    private calculateChangeConfidence;
    private calculateNoveltyScore;
    private calculateVariance;
    private countChangesByType;
    /**
     * Load evolution patterns
     */
    private loadEvolutionPatterns;
    /**
     * Get classification metrics
     */
    getMetrics(): ClassificationMetrics;
    /**
     * Clear classification history
     */
    clearHistory(): void;
    private ensureInitialized;
    /**
     * Shutdown service
     */
    shutdown(): Promise<void>;
}
export default EvolutionClassifier;
//# sourceMappingURL=EvolutionClassifier.d.ts.map