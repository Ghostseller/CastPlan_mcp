import { Logger } from 'winston';
import { QualityAssessmentEngine, QualityDimensions } from './QualityAssessmentEngine.ts';
import { QualityIssueDetector, IssueSeverity, IssueType } from './QualityIssueDetector.ts';
import { QualityImprovementRecommender, RecommendationType } from './QualityImprovementRecommender.ts';
import { SemanticChunkingService } from './SemanticChunkingService.ts';
import { DocumentVersionService } from './DocumentVersionService.ts';
import { AIAnalysisService } from './AIAnalysisService.ts';
/**
 * Quality Metrics Collector - Phase 4 Week 2
 *
 * Comprehensive metrics collection and analysis system for CastPlan MCP quality tracking
 * Aggregates quality data from assessments, issues, and recommendations to provide
 * actionable insights and historical trends.
 *
 * Features:
 * - Multi-dimensional quality metrics collection
 * - Historical trend analysis and quality evolution tracking
 * - Performance benchmarking and comparative analysis
 * - Real-time quality dashboards and reporting
 * - Predictive quality analytics and early warning systems
 * - Integration with all quality components for comprehensive insights
 *
 * Integration points:
 * - QualityAssessmentEngine for quality scores and dimensions
 * - QualityIssueDetector for issue metrics and trends
 * - QualityImprovementRecommender for improvement tracking
 * - SemanticChunkingService for content-level metrics
 * - DocumentVersionService for version-aware quality tracking
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
export interface QualityMetric {
    id: string;
    metricType: QualityMetricType;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    value: number;
    unit: string;
    timestamp: string;
    metadata: {
        source: string;
        version?: string;
        context?: any;
        tags: string[];
    };
}
export declare enum QualityMetricType {
    CLARITY_SCORE = "clarity_score",
    COMPLETENESS_SCORE = "completeness_score",
    ACCURACY_SCORE = "accuracy_score",
    RELEVANCE_SCORE = "relevance_score",
    CONSISTENCY_SCORE = "consistency_score",
    STRUCTURE_SCORE = "structure_score",
    OVERALL_QUALITY_SCORE = "overall_quality_score",
    TOTAL_ISSUES = "total_issues",
    CRITICAL_ISSUES = "critical_issues",
    HIGH_ISSUES = "high_issues",
    MEDIUM_ISSUES = "medium_issues",
    LOW_ISSUES = "low_issues",
    ISSUE_DENSITY = "issue_density",// Issues per 1000 words
    ISSUE_RESOLUTION_TIME = "issue_resolution_time",
    CONTENT_LENGTH = "content_length",
    WORD_COUNT = "word_count",
    SENTENCE_COUNT = "sentence_count",
    PARAGRAPH_COUNT = "paragraph_count",
    READABILITY_SCORE = "readability_score",
    COMPLEXITY_SCORE = "complexity_score",
    CHUNK_COUNT = "chunk_count",
    AVERAGE_CHUNK_SIZE = "average_chunk_size",
    CHUNK_SIZE_VARIANCE = "chunk_size_variance",
    SECTION_COUNT = "section_count",
    HEADING_COUNT = "heading_count",
    TOPIC_COUNT = "topic_count",
    TOPIC_COHERENCE = "topic_coherence",
    SEMANTIC_SIMILARITY = "semantic_similarity",
    RELATIONSHIP_COUNT = "relationship_count",
    EMBEDDING_QUALITY = "embedding_quality",
    RECOMMENDATIONS_GENERATED = "recommendations_generated",
    RECOMMENDATIONS_IMPLEMENTED = "recommendations_implemented",
    IMPROVEMENT_VELOCITY = "improvement_velocity",// Quality improvement per time period
    TIME_TO_IMPROVEMENT = "time_to_improvement",
    ASSESSMENT_TIME = "assessment_time",
    PROCESSING_TIME = "processing_time",
    AI_CONFIDENCE = "ai_confidence",
    CACHE_HIT_RATE = "cache_hit_rate",
    USER_SATISFACTION = "user_satisfaction",
    CONTENT_EFFECTIVENESS = "content_effectiveness",
    TASK_COMPLETION_RATE = "task_completion_rate",
    ERROR_RATE = "error_rate"
}
export interface QualityTrend {
    metricType: QualityMetricType;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    timeRange: {
        start: string;
        end: string;
    };
    dataPoints: Array<{
        timestamp: string;
        value: number;
        metadata?: any;
    }>;
    trendAnalysis: {
        direction: 'improving' | 'declining' | 'stable';
        changeRate: number;
        significance: 'significant' | 'moderate' | 'minor' | 'negligible';
        confidence: number;
    };
    statistics: {
        min: number;
        max: number;
        average: number;
        median: number;
        standardDeviation: number;
        variance: number;
    };
}
export interface QualityBenchmark {
    id: string;
    name: string;
    description: string;
    category: 'industry' | 'internal' | 'best_practice' | 'target';
    benchmarks: Record<QualityMetricType, {
        excellent: number;
        good: number;
        average: number;
        poor: number;
        critical: number;
    }>;
    applicableEntityTypes: ('document' | 'chunk' | 'system')[];
    createdAt: string;
    updatedAt: string;
}
export interface QualityReport {
    id: string;
    reportType: 'summary' | 'detailed' | 'trend' | 'comparative' | 'predictive';
    entityId?: string;
    entityType?: 'document' | 'chunk' | 'system';
    timeRange: {
        start: string;
        end: string;
    };
    generatedAt: string;
    summary: {
        overallScore: number;
        totalEntities: number;
        totalMetrics: number;
        keyFindings: string[];
        recommendations: string[];
    };
    dimensions: {
        scores: QualityDimensions;
        trends: Record<keyof QualityDimensions, 'improving' | 'declining' | 'stable'>;
        benchmarkComparison: Record<keyof QualityDimensions, 'excellent' | 'good' | 'average' | 'poor' | 'critical'>;
    };
    issues: {
        total: number;
        bySeverity: Record<IssueSeverity, number>;
        byType: Record<IssueType, number>;
        trends: {
            newIssues: number;
            resolvedIssues: number;
            issueVelocity: number;
        };
    };
    improvements: {
        recommendationsGenerated: number;
        recommendationsImplemented: number;
        averageImplementationTime: number;
        impactRealized: number;
    };
    performance: {
        processingTimes: {
            assessment: number;
            issueDetection: number;
            recommendations: number;
        };
        aiMetrics: {
            confidence: number;
            accuracy: number;
            cacheHitRate: number;
        };
    };
    predictions: {
        qualityForecast: Array<{
            date: string;
            predictedScore: number;
            confidence: number;
        }>;
        riskFactors: string[];
        opportunities: string[];
    };
}
export interface MetricsCollectionOptions {
    enableTrendAnalysis?: boolean;
    enableBenchmarking?: boolean;
    enablePredictiveAnalysis?: boolean;
    historicalDepth?: number;
    aggregationLevel?: 'hour' | 'day' | 'week' | 'month';
    includeSystemMetrics?: boolean;
    includePerformanceMetrics?: boolean;
    customMetrics?: QualityMetricType[];
}
export interface QualityDashboard {
    id: string;
    name: string;
    description: string;
    lastUpdated: string;
    refreshInterval: number;
    sections: {
        overview: {
            totalDocuments: number;
            totalChunks: number;
            averageQuality: number;
            qualityTrend: 'improving' | 'declining' | 'stable';
            criticalIssues: number;
            pendingRecommendations: number;
        };
        qualityDistribution: {
            excellent: number;
            good: number;
            average: number;
            poor: number;
            critical: number;
        };
        topIssues: Array<{
            type: IssueType;
            count: number;
            trend: 'increasing' | 'decreasing' | 'stable';
        }>;
        recentImprovements: Array<{
            entityId: string;
            improvementType: RecommendationType;
            impactScore: number;
            implementedAt: string;
        }>;
        performanceMetrics: {
            averageAssessmentTime: number;
            aiConfidence: number;
            systemLoad: number;
        };
    };
}
export declare class QualityMetricsCollector {
    private logger;
    private qualityAssessmentEngine;
    private qualityIssueDetector;
    private qualityImprovementRecommender;
    private semanticChunkingService;
    private documentVersionService?;
    private aiAnalysisService;
    private initialized;
    private metricsStorage;
    private trendsCache;
    private benchmarks;
    private readonly DEFAULT_BENCHMARKS;
    constructor(logger: Logger, qualityAssessmentEngine: QualityAssessmentEngine, qualityIssueDetector: QualityIssueDetector, qualityImprovementRecommender: QualityImprovementRecommender, semanticChunkingService: SemanticChunkingService, aiAnalysisService: AIAnalysisService, documentVersionService?: DocumentVersionService);
    /**
     * Initialize the Quality Metrics Collector
     */
    initialize(): Promise<void>;
    /**
     * Collect comprehensive quality metrics for a document
     */
    collectDocumentMetrics(documentId: string, options?: MetricsCollectionOptions): Promise<QualityMetric[]>;
    /**
     * Collect quality metrics for a chunk
     */
    collectChunkMetrics(chunkId: string, options?: MetricsCollectionOptions): Promise<QualityMetric[]>;
    /**
     * Collect system-wide quality metrics
     */
    collectSystemMetrics(options?: MetricsCollectionOptions): Promise<QualityMetric[]>;
    /**
     * Generate quality trend analysis
     */
    generateTrendAnalysis(entityId: string, metricType: QualityMetricType, timeRange: {
        start: string;
        end: string;
    }): Promise<QualityTrend>;
    /**
     * Generate comprehensive quality report
     */
    generateQualityReport(reportType: 'summary' | 'detailed' | 'trend' | 'comparative' | 'predictive', entityId?: string, entityType?: 'document' | 'chunk' | 'system', timeRange?: {
        start: string;
        end: string;
    }): Promise<QualityReport>;
    /**
     * Create quality dashboard
     */
    createQualityDashboard(name?: string): Promise<QualityDashboard>;
    /**
     * Compare metrics against benchmarks
     */
    compareToBenchmarks(metrics: QualityMetric[], benchmarkId?: string): Record<string, {
        current: number;
        benchmark: string;
        percentile: number;
        recommendation: string;
    }>;
    /**
     * Extract assessment metrics from quality assessment
     */
    private extractAssessmentMetrics;
    /**
     * Extract issue metrics from quality issues
     */
    private extractIssueMetrics;
    /**
     * Calculate content metrics
     */
    private calculateContentMetrics;
    /**
     * Calculate structural metrics
     */
    private calculateStructuralMetrics;
    /**
     * Calculate semantic metrics
     */
    private calculateSemanticMetrics;
    /**
     * Create a quality metric
     */
    private createMetric;
    /**
     * Store metrics in memory storage
     */
    private storeMetrics;
    /**
     * Get all stored metrics
     */
    private getAllStoredMetrics;
    /**
     * Calculate average metric value
     */
    private calculateAverageMetric;
    /**
     * Calculate trend from values
     */
    private calculateTrend;
    /**
     * Calculate statistics for values
     */
    private calculateStatistics;
    /**
     * Calculate variance
     */
    private calculateVariance;
    /**
     * Populate quality report with data
     */
    private populateQualityReport;
    /**
     * Categorize metric against benchmark
     */
    private categorizeBenchmark;
    /**
     * Calculate percentile within benchmark
     */
    private calculatePercentile;
    /**
     * Get recommendation based on benchmark category
     */
    private getBenchmarkRecommendation;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityMetricsCollector.d.ts.map