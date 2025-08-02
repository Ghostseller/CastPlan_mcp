/**
 * Enhanced Quality Service Orchestrator - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Learning-Enhanced Core Orchestration
 * Integrates all quality services with continuous learning capabilities:
 * - Machine learning-driven quality prediction
 * - Adaptive quality standards
 * - User feedback integration
 * - Automated model retraining
 * - A/B testing for quality improvements
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Learning Systems Integration Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { SemanticChunkingService } from './SemanticChunkingService';
import { AIAnalysisService } from './AIAnalysisService';
import { DocumentVersionService } from './DocumentVersionService';
import { QualityDimensions, QualityScore } from './QualityAssessmentEngine';
import { QualityIssue } from './QualityIssueDetector';
import { ImprovementRecommendation } from './QualityImprovementRecommender';
import { QualityReport } from './QualityMetricsCollector';
import { QualityStandard } from './AdaptiveQualityStandards';
export interface EnhancedQualityAssessmentOptions {
    /** Enable semantic chunk-level analysis */
    enableChunkLevelAnalysis?: boolean;
    /** Enable version-aware quality tracking */
    enableVersionTracking?: boolean;
    /** Include detailed issue detection */
    enableIssueDetection?: boolean;
    /** Generate improvement recommendations */
    enableRecommendations?: boolean;
    /** Collect metrics for analysis */
    enableMetricsCollection?: boolean;
    /** Use predictive quality assessment */
    enablePredictiveAssessment?: boolean;
    /** Use adaptive quality standards */
    useAdaptiveStandards?: boolean;
    /** Enable user feedback collection */
    enableFeedbackCollection?: boolean;
    /** Enable A/B testing for improvements */
    enableABTesting?: boolean;
    /** Custom quality thresholds */
    qualityThresholds?: Partial<QualityDimensions>;
    /** Maximum issues to detect per document */
    maxIssuesPerDocument?: number;
    /** Maximum recommendations to generate */
    maxRecommendations?: number;
    /** User context for personalized assessment */
    userContext?: {
        userId?: string;
        sessionId?: string;
        experienceLevel?: string;
        preferences?: Record<string, any>;
    };
}
export interface LearningEnhancedQualityAnalysis {
    /** Overall document quality score */
    overallScore: QualityScore;
    /** Predicted quality score (if enabled) */
    predictedScore?: QualityScore;
    /** Applied quality standard */
    appliedStandard: QualityStandard;
    /** Chunk-level quality scores (if enabled) */
    chunkLevelScores: Array<{
        chunkId: string;
        score: QualityScore;
        predicted?: QualityScore;
    }>;
    /** Detected quality issues */
    issues: QualityIssue[];
    /** Improvement recommendations */
    recommendations: ImprovementRecommendation[];
    /** Quality metrics */
    metrics: QualityReport;
    /** Learning insights */
    learningInsights: {
        confidenceLevel: number;
        patternMatches: string[];
        improvementPotential: number;
        recommendedActions: string[];
    };
    /** A/B testing assignment (if enabled) */
    abTestAssignment?: {
        testId: string;
        variant: string;
        controlGroup: boolean;
    };
    /** Processing metadata */
    metadata: {
        processingTime: number;
        chunksAnalyzed: number;
        issuesDetected: number;
        recommendationsGenerated: number;
        qualityTrend?: 'improving' | 'declining' | 'stable';
        modelVersion?: string;
        standardVersion?: string;
    };
}
export interface SmartQualityImprovementResult {
    /** Success status */
    success: boolean;
    /** Number of improvements applied */
    improvementsApplied: number;
    /** Quality score before improvements */
    beforeScore: QualityScore;
    /** Quality score after improvements */
    afterScore: QualityScore;
    /** Predicted improvement accuracy */
    predictionAccuracy: number;
    /** Issues resolved */
    issuesResolved: QualityIssue[];
    /** Learning outcomes */
    learningOutcomes: {
        trainingDataAdded: boolean;
        patternReinforced: boolean;
        feedbackRequested: boolean;
        modelUpdateTriggered: boolean;
    };
    /** A/B test results (if applicable) */
    abTestResults?: {
        testId: string;
        variant: string;
        performanceLift: number;
        significanceLevel: number;
    };
    /** Improvements that failed to apply */
    failedImprovements: Array<{
        recommendation: ImprovementRecommendation;
        error: string;
    }>;
    /** Processing time */
    processingTime: number;
}
export interface QualityEvolutionTracking {
    documentId: string;
    evolutionId: string;
    timeSeriesData: Array<{
        timestamp: Date;
        qualityScore: QualityScore;
        predictedScore?: QualityScore;
        appliedStandard: string;
        userFeedback?: number;
        improvementsApplied: number;
    }>;
    trendAnalysis: {
        overallTrend: 'improving' | 'declining' | 'stable' | 'volatile';
        trendConfidence: number;
        projectedQuality: QualityScore;
        recommendedActions: string[];
    };
    learningProgress: {
        modelAccuracy: number;
        feedbackQuality: number;
        standardAdaptations: number;
        predictionReliability: number;
    };
}
export declare class EnhancedQualityServiceOrchestrator {
    private logger;
    private db;
    private semanticChunkingService;
    private aiAnalysisService;
    private documentVersionService;
    private qualityAssessmentEngine;
    private qualityIssueDetector;
    private qualityImprovementRecommender;
    private qualityMetricsCollector;
    private qualityLearningEngine;
    private adaptiveQualityStandards;
    private feedbackIntegrationService;
    private qualityPredictionModel;
    private modelTrainingScheduler;
    private abTestingService;
    private initialized;
    constructor(db: Database.Database, logger: Logger, semanticChunkingService: SemanticChunkingService, aiAnalysisService: AIAnalysisService, documentVersionService: DocumentVersionService);
    initialize(): Promise<void>;
    /**
     * Perform learning-enhanced comprehensive quality analysis
     */
    analyzeDocumentQualityWithLearning(documentId: string, content: string, documentType: string, options?: EnhancedQualityAssessmentOptions): Promise<LearningEnhancedQualityAnalysis>;
    /**
     * Apply smart quality improvements with learning feedback
     */
    improveDocumentQualityWithLearning(documentId: string, content: string, documentType: string, options?: EnhancedQualityAssessmentOptions): Promise<SmartQualityImprovementResult>;
    /**
     * Track quality evolution over time with learning insights
     */
    trackQualityEvolutionWithLearning(documentId: string): Promise<QualityEvolutionTracking>;
    private ensureInitialized;
    private determineQualityTrend;
    private createEmptyReport;
    private applyQualityImprovement;
    private addTrainingData;
    private requestImprovementFeedback;
    private checkAndTriggerModelUpdate;
    private getQualityTimeSeriesData;
    private analyzeTrendWithLearning;
    private getLearningProgressMetrics;
    /**
     * Convert QualityMetric array to QualityReport structure
     */
    private convertMetricsToReport;
    /**
     * Extract error message from any error type
     */
    private getErrorMessage;
    /**
     * Get comprehensive service statistics
     */
    getServiceStatistics(): Promise<{
        qualityAnalyses: number;
        improvementsApplied: number;
        learningProgress: QualityEvolutionTracking['learningProgress'];
        systemHealth: {
            serviceStatus: string;
            lastHealthCheck: Date;
            resourceUsage: Record<string, number>;
        };
    }>;
    /**
     * Shutdown all services gracefully
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=EnhancedQualityServiceOrchestrator.d.ts.map