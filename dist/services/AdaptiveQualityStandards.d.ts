/**
 * Adaptive Quality Standards - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Dynamic Quality Standard Adjustment
 * Implements adaptive quality standards that evolve based on:
 * - Document types and domain-specific requirements
 * - Performance data and success metrics
 * - User feedback and satisfaction levels
 * - Historical quality trends and benchmarks
 * - Context-aware threshold optimization
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Quality Standards Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { QualityDimensions } from './QualityAssessmentEngine';
import { QualityLearningEngine } from './QualityLearningEngine';
export interface QualityStandard {
    id: string;
    standardType: 'document_type' | 'domain' | 'user_context' | 'global';
    name: string;
    description: string;
    target: string;
    thresholds: QualityDimensions;
    weights: QualityDimensions;
    contextConditions: ContextCondition[];
    version: string;
    createdAt: Date;
    lastUpdated: Date;
    isActive: boolean;
    effectiveness: number;
}
export interface ContextCondition {
    type: 'document_length' | 'technical_complexity' | 'audience_level' | 'urgency' | 'domain_specificity';
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'contains';
    value: any;
    weight: number;
}
export interface AdaptationRule {
    id: string;
    ruleType: 'threshold_adjustment' | 'weight_rebalancing' | 'context_refinement' | 'standard_creation';
    name: string;
    description: string;
    conditions: AdaptationCondition[];
    actions: AdaptationAction[];
    priority: number;
    isActive: boolean;
    effectiveness: number;
    executionCount: number;
    lastExecuted?: Date;
}
export interface AdaptationCondition {
    type: 'performance_metric' | 'user_feedback' | 'trend_analysis' | 'pattern_detection';
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'trend_up' | 'trend_down' | 'pattern_match';
    value: any;
    window: string;
}
export interface AdaptationAction {
    type: 'adjust_threshold' | 'modify_weight' | 'create_standard' | 'deactivate_standard' | 'merge_standards';
    target: string;
    adjustment: any;
    confidence: number;
}
export interface QualityBenchmark {
    id: string;
    benchmarkType: 'industry' | 'domain' | 'internal' | 'best_practice';
    name: string;
    description: string;
    target: string;
    benchmarkValues: QualityDimensions;
    sourceData: any;
    confidence: number;
    lastUpdated: Date;
}
export interface StandardsAdaptationResult {
    adaptationsApplied: number;
    standardsModified: string[];
    standardsCreated: string[];
    standardsDeactivated: string[];
    effectiveness: number;
    confidenceLevel: number;
    recommendations: string[];
    nextAdaptationDate: Date;
}
export interface StandardPerformanceMetrics {
    standardId: string;
    applicationsCount: number;
    averageAccuracy: number;
    userSatisfactionScore: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    adaptationFrequency: number;
    trendDirection: 'improving' | 'declining' | 'stable';
    lastEvaluated: Date;
}
export declare class AdaptiveQualityStandards {
    private db;
    private logger;
    private qualityLearningEngine;
    private standards;
    private adaptationRules;
    private benchmarks;
    private readonly ADAPTATION_INTERVAL;
    private readonly MIN_SAMPLES_FOR_ADAPTATION;
    private readonly EFFECTIVENESS_THRESHOLD;
    constructor(db: Database.Database, logger: Logger, qualityLearningEngine: QualityLearningEngine);
    /**
     * Initialize the adaptive quality standards service
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for standards management
     */
    private createStandardsTables;
    /**
     * Initialize default quality standards for different document types
     */
    private initializeDefaultStandards;
    /**
     * Select appropriate quality standard for a document
     */
    selectStandard(documentType: string, context: {
        contentLength?: number;
        technicalComplexity?: number;
        audienceLevel?: string;
        domainSpecificity?: number;
        urgency?: string;
    }): Promise<QualityStandard>;
    /**
     * Calculate relevance score for a standard given context
     */
    private calculateStandardRelevance;
    /**
     * Evaluate if a context condition is met
     */
    private evaluateCondition;
    /**
     * Adapt quality standards based on performance data and feedback
     */
    adaptStandards(): Promise<StandardsAdaptationResult>;
    /**
     * Evaluate if an adaptation rule should be executed
     */
    private evaluateAdaptationRule;
    /**
     * Evaluate a specific adaptation condition
     */
    private evaluateAdaptationCondition;
    /**
     * Evaluate performance-based condition
     */
    private evaluatePerformanceCondition;
    /**
     * Evaluate user feedback condition
     */
    private evaluateUserFeedbackCondition;
    /**
     * Evaluate trend condition
     */
    private evaluateTrendCondition;
    /**
     * Evaluate pattern detection condition
     */
    private evaluatePatternCondition;
    /**
     * Execute an adaptation rule
     */
    private executeAdaptationRule;
    /**
     * Adjust standard threshold based on adaptation action
     */
    private adjustStandardThreshold;
    /**
     * Create new adaptive standard based on learned patterns
     */
    private createAdaptiveStandard;
    /**
     * Derive quality thresholds from learning patterns
     */
    private deriveThresholdsFromPatterns;
    /**
     * Derive quality weights from learning patterns
     */
    private deriveWeightsFromPatterns;
    /**
     * Deactivate a quality standard
     */
    private deactivateStandard;
    /**
     * Analyze performance of all standards
     */
    private analyzeStandardPerformance;
    /**
     * Store a quality standard in the database
     */
    private storeStandard;
    /**
     * Update an existing standard
     */
    private updateStandard;
    /**
     * Update adaptation rule
     */
    private updateAdaptationRule;
    /**
     * Increment version string
     */
    private incrementVersion;
    /**
     * Log adaptation history
     */
    private logAdaptationHistory;
    /**
     * Load existing standards from database
     */
    private loadExistingStandards;
    /**
     * Load adaptation rules from database
     */
    private loadAdaptationRules;
    /**
     * Create default adaptation rules
     */
    private createDefaultAdaptationRules;
    /**
     * Load benchmarks from database
     */
    private loadBenchmarks;
    /**
     * Get all active standards
     */
    getActiveStandards(): QualityStandard[];
    /**
     * Get standard by ID
     */
    getStandard(id: string): QualityStandard | undefined;
    /**
     * Get adaptation statistics
     */
    getAdaptationStatistics(): Promise<{
        totalStandards: number;
        activeStandards: number;
        averageEffectiveness: number;
        lastAdaptation?: Date;
        adaptationRulesCount: number;
    }>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=AdaptiveQualityStandards.d.ts.map