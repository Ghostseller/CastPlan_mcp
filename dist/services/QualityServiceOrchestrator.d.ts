/**
 * Quality Service Orchestrator - Phase 4 Week 2 Main Service
 *
 * CastPlan MCP Autonomous Quality Service - Core Orchestration
 * Integrates all quality services into a unified automatic quality improvement system
 *
 * Created: 2025-07-31
 * Author: AI Engineer
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { SemanticChunkingService } from './SemanticChunkingService';
import { AIAnalysisService } from './AIAnalysisService';
import { DocumentVersionService } from '../../DocumentVersionService';
import { QualityDimensions, QualityScore } from './QualityAssessmentEngine';
import { QualityIssue } from './QualityIssueDetector';
import { ImprovementRecommendation } from './QualityImprovementRecommender';
import { QualityMetrics, QualityReport } from './QualityMetricsCollector';
/**
 * Quality assessment options for document analysis
 */
export interface QualityAssessmentOptions {
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
    /** Custom quality thresholds */
    qualityThresholds?: Partial<QualityDimensions>;
    /** Maximum issues to detect per document */
    maxIssuesPerDocument?: number;
    /** Maximum recommendations to generate */
    maxRecommendations?: number;
}
/**
 * Comprehensive quality analysis result
 */
export interface ComprehensiveQualityAnalysis {
    /** Overall document quality score */
    overallScore: QualityScore;
    /** Chunk-level quality scores (if enabled) */
    chunkLevelScores: Array<{
        chunkId: string;
        score: QualityScore;
    }>;
    /** Detected quality issues */
    issues: QualityIssue[];
    /** Improvement recommendations */
    recommendations: ImprovementRecommendation[];
    /** Quality metrics */
    metrics: QualityMetrics;
    /** Processing metadata */
    metadata: {
        processingTime: number;
        chunksAnalyzed: number;
        issuesDetected: number;
        recommendationsGenerated: number;
        qualityTrend?: 'improving' | 'declining' | 'stable';
    };
}
/**
 * Quality improvement execution result
 */
export interface QualityImprovementResult {
    /** Success status */
    success: boolean;
    /** Number of improvements applied */
    improvementsApplied: number;
    /** Quality score before improvements */
    beforeScore: QualityScore;
    /** Quality score after improvements */
    afterScore: QualityScore;
    /** Issues resolved */
    issuesResolved: QualityIssue[];
    /** Improvements that failed to apply */
    failedImprovements: Array<{
        recommendation: ImprovementRecommendation;
        error: string;
    }>;
    /** Processing time */
    processingTime: number;
}
/**
 * Quality Service Orchestrator - Main service for automatic quality improvement
 *
 * Features:
 * - Multi-dimensional quality assessment with AI analysis
 * - Semantic chunk-level granular quality analysis
 * - Version-aware quality tracking and evolution monitoring
 * - Automatic issue detection and priority classification
 * - AI-powered contextual improvement recommendations
 * - Comprehensive metrics collection and trend analysis
 * - Automated quality improvement execution
 */
export declare class QualityServiceOrchestrator {
    private logger;
    private db;
    private semanticChunkingService;
    private aiAnalysisService;
    private documentVersionService;
    private qualityAssessmentEngine;
    private qualityIssueDetector;
    private qualityImprovementRecommender;
    private qualityMetricsCollector;
    private automatedQualityWorkflow;
    private qualityWorkflowOrchestrator;
    private qualitySystemOptimizer;
    private qualityLoadBalancer;
    private qualityWorkflowScheduler;
    private initialized;
    constructor(db: Database.Database, logger: Logger, semanticChunkingService: SemanticChunkingService, aiAnalysisService: AIAnalysisService, documentVersionService: DocumentVersionService);
    initialize(): Promise<void>;
    /**
     * Perform comprehensive quality analysis on a document
     */
    analyzeDocumentQuality(documentId: string, content: string, options?: QualityAssessmentOptions): Promise<ComprehensiveQualityAnalysis>;
    /**
     * Automatically apply quality improvements to a document
     */
    improveDocumentQuality(documentId: string, content: string, options?: QualityAssessmentOptions): Promise<QualityImprovementResult>;
    /**
     * Track quality evolution over time for a document
     */
    trackQualityEvolution(documentId: string): Promise<{
        qualityHistory: Array<{
            versionId: string;
            versionNumber: string;
            qualityScore: QualityScore;
            timestamp: string;
        }>;
        trend: 'improving' | 'declining' | 'stable';
        insights: string[];
    }>;
    /**
     * Generate comprehensive quality report
     */
    generateQualityReport(documentId: string): Promise<QualityReport>;
    private applyImprovement;
    private applyContentEnhancement;
    private applyStructuralImprovement;
    private applyClarityOptimization;
    private determineQualityTrend;
    private calculateQualityTrend;
    private groupIssuesByType;
    /**
     * Trigger automated quality workflow for a document with full automation
     * Week 5: Minimal human intervention, intelligent scheduling, auto-scaling
     */
    triggerAutomatedQualityWorkflow(documentId: string, priority?: 'low' | 'medium' | 'high' | 'critical', triggeredBy?: 'monitoring' | 'schedule' | 'manual' | 'threshold'): Promise<string>;
    /**
     * Schedule a quality assessment workflow with intelligent prioritization
     * Week 5: ML-driven scheduling, SLA-aware, resource optimization
     */
    scheduleQualityWorkflow(entityId: string, entityType: 'document' | 'chunk' | 'system', workflowType: 'quality_assessment' | 'improvement' | 'monitoring' | 'optimization' | 'validation', priority: 'critical' | 'high' | 'medium' | 'low', options?: {
        deadlineAt?: Date;
        dependencies?: string[];
        slaRequirements?: {
            maxLatency?: number;
            minThroughput?: number;
            availabilityTarget?: number;
        };
        metadata?: Record<string, any>;
    }): Promise<string>;
    /**
     * Get comprehensive system performance metrics including automation
     * Week 5: Resource utilization, workflow efficiency, optimization metrics
     */
    getSystemPerformanceMetrics(): Promise<{
        systemOptimizer: any;
        loadBalancer: any;
        scheduler: any;
        orchestrator: any;
        automation: any;
    }>;
    /**
     * Execute system-wide optimization based on current performance metrics
     * Week 5: Automated resource management, cache optimization, performance tuning
     */
    optimizeSystemPerformance(): Promise<{
        optimizationsApplied: number;
        resourcesSaved: {
            cpuReduction: number;
            memoryReduction: number;
            ioReduction: number;
        };
        cacheImprovements: {
            hitRateImprovement: number;
            sizeOptimization: number;
        };
        queryOptimizations: number;
        performanceGain: number;
    }>;
    /**
     * Get current automation workflow status and health
     * Week 5: Real-time monitoring, workflow health, performance tracking
     */
    getAutomationStatus(): Promise<{
        activeWorkflows: number;
        queuedTasks: number;
        completedToday: number;
        failureRate: number;
        averageProcessingTime: number;
        resourceUtilization: number;
        slaCompliance: number;
        automationEfficiency: number;
    }>;
    private ensureInitialized;
    shutdown(): Promise<void>;
}
export default QualityServiceOrchestrator;
//# sourceMappingURL=QualityServiceOrchestrator.d.ts.map