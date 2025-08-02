import { v4 as uuidv4 } from 'uuid';
import { IssueSeverity } from './QualityIssueDetector.ts';
export var QualityMetricType;
(function (QualityMetricType) {
    // Quality Dimension Scores
    QualityMetricType["CLARITY_SCORE"] = "clarity_score";
    QualityMetricType["COMPLETENESS_SCORE"] = "completeness_score";
    QualityMetricType["ACCURACY_SCORE"] = "accuracy_score";
    QualityMetricType["RELEVANCE_SCORE"] = "relevance_score";
    QualityMetricType["CONSISTENCY_SCORE"] = "consistency_score";
    QualityMetricType["STRUCTURE_SCORE"] = "structure_score";
    QualityMetricType["OVERALL_QUALITY_SCORE"] = "overall_quality_score";
    // Issue Metrics
    QualityMetricType["TOTAL_ISSUES"] = "total_issues";
    QualityMetricType["CRITICAL_ISSUES"] = "critical_issues";
    QualityMetricType["HIGH_ISSUES"] = "high_issues";
    QualityMetricType["MEDIUM_ISSUES"] = "medium_issues";
    QualityMetricType["LOW_ISSUES"] = "low_issues";
    QualityMetricType["ISSUE_DENSITY"] = "issue_density";
    QualityMetricType["ISSUE_RESOLUTION_TIME"] = "issue_resolution_time";
    // Content Metrics
    QualityMetricType["CONTENT_LENGTH"] = "content_length";
    QualityMetricType["WORD_COUNT"] = "word_count";
    QualityMetricType["SENTENCE_COUNT"] = "sentence_count";
    QualityMetricType["PARAGRAPH_COUNT"] = "paragraph_count";
    QualityMetricType["READABILITY_SCORE"] = "readability_score";
    QualityMetricType["COMPLEXITY_SCORE"] = "complexity_score";
    // Structural Metrics
    QualityMetricType["CHUNK_COUNT"] = "chunk_count";
    QualityMetricType["AVERAGE_CHUNK_SIZE"] = "average_chunk_size";
    QualityMetricType["CHUNK_SIZE_VARIANCE"] = "chunk_size_variance";
    QualityMetricType["SECTION_COUNT"] = "section_count";
    QualityMetricType["HEADING_COUNT"] = "heading_count";
    // Semantic Metrics
    QualityMetricType["TOPIC_COUNT"] = "topic_count";
    QualityMetricType["TOPIC_COHERENCE"] = "topic_coherence";
    QualityMetricType["SEMANTIC_SIMILARITY"] = "semantic_similarity";
    QualityMetricType["RELATIONSHIP_COUNT"] = "relationship_count";
    QualityMetricType["EMBEDDING_QUALITY"] = "embedding_quality";
    // Improvement Metrics
    QualityMetricType["RECOMMENDATIONS_GENERATED"] = "recommendations_generated";
    QualityMetricType["RECOMMENDATIONS_IMPLEMENTED"] = "recommendations_implemented";
    QualityMetricType["IMPROVEMENT_VELOCITY"] = "improvement_velocity";
    QualityMetricType["TIME_TO_IMPROVEMENT"] = "time_to_improvement";
    // Performance Metrics
    QualityMetricType["ASSESSMENT_TIME"] = "assessment_time";
    QualityMetricType["PROCESSING_TIME"] = "processing_time";
    QualityMetricType["AI_CONFIDENCE"] = "ai_confidence";
    QualityMetricType["CACHE_HIT_RATE"] = "cache_hit_rate";
    // User Experience Metrics
    QualityMetricType["USER_SATISFACTION"] = "user_satisfaction";
    QualityMetricType["CONTENT_EFFECTIVENESS"] = "content_effectiveness";
    QualityMetricType["TASK_COMPLETION_RATE"] = "task_completion_rate";
    QualityMetricType["ERROR_RATE"] = "error_rate";
})(QualityMetricType || (QualityMetricType = {}));
// =============================================================================
// QUALITY METRICS COLLECTOR IMPLEMENTATION
// =============================================================================
export class QualityMetricsCollector {
    logger;
    qualityAssessmentEngine;
    qualityIssueDetector;
    qualityImprovementRecommender;
    semanticChunkingService;
    documentVersionService;
    aiAnalysisService;
    initialized = false;
    // In-memory metrics storage (in production would use a proper database)
    metricsStorage = new Map();
    trendsCache = new Map();
    benchmarks = [];
    // Default benchmarks
    DEFAULT_BENCHMARKS = {
        id: 'default',
        name: 'Default Quality Benchmarks',
        description: 'Standard quality benchmarks for content assessment',
        category: 'best_practice',
        benchmarks: {
            [QualityMetricType.OVERALL_QUALITY_SCORE]: {
                excellent: 0.9,
                good: 0.75,
                average: 0.6,
                poor: 0.4,
                critical: 0.2
            },
            [QualityMetricType.CLARITY_SCORE]: {
                excellent: 0.9,
                good: 0.75,
                average: 0.6,
                poor: 0.4,
                critical: 0.2
            },
            [QualityMetricType.COMPLETENESS_SCORE]: {
                excellent: 0.9,
                good: 0.75,
                average: 0.6,
                poor: 0.4,
                critical: 0.2
            },
            [QualityMetricType.ACCURACY_SCORE]: {
                excellent: 0.95,
                good: 0.85,
                average: 0.7,
                poor: 0.5,
                critical: 0.3
            },
            [QualityMetricType.ISSUE_DENSITY]: {
                excellent: 2, // Issues per 1000 words
                good: 5,
                average: 10,
                poor: 20,
                critical: 40
            },
            [QualityMetricType.READABILITY_SCORE]: {
                excellent: 0.8,
                good: 0.65,
                average: 0.5,
                poor: 0.35,
                critical: 0.2
            }
        },
        applicableEntityTypes: ['document', 'chunk'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    constructor(logger, qualityAssessmentEngine, qualityIssueDetector, qualityImprovementRecommender, semanticChunkingService, aiAnalysisService, documentVersionService) {
        this.logger = logger;
        this.qualityAssessmentEngine = qualityAssessmentEngine;
        this.qualityIssueDetector = qualityIssueDetector;
        this.qualityImprovementRecommender = qualityImprovementRecommender;
        this.semanticChunkingService = semanticChunkingService;
        this.aiAnalysisService = aiAnalysisService;
        this.documentVersionService = documentVersionService;
    }
    /**
     * Initialize the Quality Metrics Collector
     */
    async initialize() {
        try {
            this.logger.info('Initializing Quality Metrics Collector...');
            // Initialize default benchmarks
            this.benchmarks.push(this.DEFAULT_BENCHMARKS);
            // Initialize metrics storage
            this.metricsStorage.clear();
            this.trendsCache.clear();
            this.initialized = true;
            this.logger.info('Quality Metrics Collector initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Quality Metrics Collector:', error);
            throw error;
        }
    }
    /**
     * Collect comprehensive quality metrics for a document
     */
    async collectDocumentMetrics(documentId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Collecting quality metrics for document: ${documentId}`);
            const metrics = [];
            const timestamp = new Date().toISOString();
            // Get quality assessment metrics
            const assessment = await this.qualityAssessmentEngine.assessDocumentQuality(documentId);
            metrics.push(...this.extractAssessmentMetrics(assessment, documentId, 'document', timestamp));
            // Get issue metrics
            const issueDetection = await this.qualityIssueDetector.detectDocumentIssues(documentId);
            metrics.push(...this.extractIssueMetrics(issueDetection.issues, documentId, 'document', timestamp));
            // Get content metrics
            const chunks = await this.semanticChunkingService.getChunksByDocument(documentId);
            const contentMetrics = this.calculateContentMetrics(chunks, documentId, 'document', timestamp);
            metrics.push(...contentMetrics);
            // Get structural metrics
            const structuralMetrics = this.calculateStructuralMetrics(chunks, documentId, 'document', timestamp);
            metrics.push(...structuralMetrics);
            // Get semantic metrics
            const semanticMetrics = await this.calculateSemanticMetrics(chunks, documentId, 'document', timestamp);
            metrics.push(...semanticMetrics);
            // Get performance metrics if enabled
            if (options.includePerformanceMetrics !== false) {
                const processingTime = Date.now() - startTime;
                metrics.push(this.createMetric(QualityMetricType.PROCESSING_TIME, documentId, 'document', processingTime, 'milliseconds', timestamp, { source: 'metrics_collector', tags: ['performance'] }));
            }
            // Store metrics
            this.storeMetrics(documentId, metrics);
            this.logger.info(`Collected ${metrics.length} metrics for document ${documentId}`);
            return metrics;
        }
        catch (error) {
            this.logger.error('Failed to collect document metrics:', error);
            throw error;
        }
    }
    /**
     * Collect quality metrics for a chunk
     */
    async collectChunkMetrics(chunkId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Collecting quality metrics for chunk: ${chunkId}`);
            const metrics = [];
            const timestamp = new Date().toISOString();
            // Get chunk data
            const chunk = await this.semanticChunkingService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Get quality assessment metrics
            const assessment = await this.qualityAssessmentEngine.assessChunkQuality(chunkId);
            metrics.push(...this.extractAssessmentMetrics(assessment, chunkId, 'chunk', timestamp));
            // Get issue metrics
            const issueDetection = await this.qualityIssueDetector.detectChunkIssues(chunkId);
            metrics.push(...this.extractIssueMetrics(issueDetection.issues, chunkId, 'chunk', timestamp));
            // Get content metrics for single chunk
            const contentMetrics = this.calculateContentMetrics([chunk], chunkId, 'chunk', timestamp);
            metrics.push(...contentMetrics);
            // Store metrics
            this.storeMetrics(chunkId, metrics);
            this.logger.info(`Collected ${metrics.length} metrics for chunk ${chunkId}`);
            return metrics;
        }
        catch (error) {
            this.logger.error('Failed to collect chunk metrics:', error);
            throw error;
        }
    }
    /**
     * Collect system-wide quality metrics
     */
    async collectSystemMetrics(options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info('Collecting system-wide quality metrics');
            const metrics = [];
            const timestamp = new Date().toISOString();
            const systemId = 'system';
            // Calculate aggregate metrics from stored data
            const allStoredMetrics = this.getAllStoredMetrics();
            if (allStoredMetrics.length > 0) {
                // System-wide averages
                const averageQuality = this.calculateAverageMetric(allStoredMetrics, QualityMetricType.OVERALL_QUALITY_SCORE);
                if (averageQuality !== null) {
                    metrics.push(this.createMetric(QualityMetricType.OVERALL_QUALITY_SCORE, systemId, 'system', averageQuality, 'score', timestamp, { source: 'metrics_collector', tags: ['system', 'aggregate'] }));
                }
                // Total counts
                const documentCount = new Set(allStoredMetrics
                    .filter(m => m.entityType === 'document')
                    .map(m => m.entityId)).size;
                metrics.push(this.createMetric('total_documents', systemId, 'system', documentCount, 'count', timestamp, { source: 'metrics_collector', tags: ['system', 'count'] }));
                const chunkCount = new Set(allStoredMetrics
                    .filter(m => m.entityType === 'chunk')
                    .map(m => m.entityId)).size;
                metrics.push(this.createMetric('total_chunks', systemId, 'system', chunkCount, 'count', timestamp, { source: 'metrics_collector', tags: ['system', 'count'] }));
            }
            // AI service metrics
            const aiStats = this.aiAnalysisService.getCacheStatistics();
            metrics.push(this.createMetric(QualityMetricType.CACHE_HIT_RATE, systemId, 'system', aiStats.size > 0 ? 0.8 : 0, // Placeholder calculation
            'percentage', timestamp, { source: 'ai_analysis_service', tags: ['system', 'performance'] }));
            // Processing time
            const processingTime = Date.now() - startTime;
            metrics.push(this.createMetric(QualityMetricType.PROCESSING_TIME, systemId, 'system', processingTime, 'milliseconds', timestamp, { source: 'metrics_collector', tags: ['system', 'performance'] }));
            // Store system metrics
            this.storeMetrics(systemId, metrics);
            this.logger.info(`Collected ${metrics.length} system metrics`);
            return metrics;
        }
        catch (error) {
            this.logger.error('Failed to collect system metrics:', error);
            throw error;
        }
    }
    /**
     * Generate quality trend analysis
     */
    async generateTrendAnalysis(entityId, metricType, timeRange) {
        try {
            this.ensureInitialized();
            const cacheKey = `${entityId}-${metricType}-${timeRange.start}-${timeRange.end}`;
            // Check cache first
            if (this.trendsCache.has(cacheKey)) {
                return this.trendsCache.get(cacheKey);
            }
            // Get metrics for the time range
            const entityMetrics = this.metricsStorage.get(entityId) || [];
            const relevantMetrics = entityMetrics.filter(metric => metric.metricType === metricType &&
                metric.timestamp >= timeRange.start &&
                metric.timestamp <= timeRange.end);
            if (relevantMetrics.length < 2) {
                throw new Error('Insufficient data points for trend analysis');
            }
            // Sort by timestamp
            relevantMetrics.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            // Calculate trend
            const values = relevantMetrics.map(m => m.value);
            const trend = this.calculateTrend(values);
            const statistics = this.calculateStatistics(values);
            const qualityTrend = {
                metricType,
                entityId,
                entityType: relevantMetrics[0].entityType,
                timeRange,
                dataPoints: relevantMetrics.map(m => ({
                    timestamp: m.timestamp,
                    value: m.value,
                    metadata: m.metadata
                })),
                trendAnalysis: trend,
                statistics
            };
            // Cache the result
            this.trendsCache.set(cacheKey, qualityTrend);
            return qualityTrend;
        }
        catch (error) {
            this.logger.error('Failed to generate trend analysis:', error);
            throw error;
        }
    }
    /**
     * Generate comprehensive quality report
     */
    async generateQualityReport(reportType, entityId, entityType, timeRange) {
        try {
            this.ensureInitialized();
            this.logger.info(`Generating ${reportType} quality report${entityId ? ` for ${entityType} ${entityId}` : ' (system-wide)'}`);
            const now = new Date();
            const defaultTimeRange = {
                start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                end: now.toISOString()
            };
            const reportTimeRange = timeRange || defaultTimeRange;
            const report = {
                id: uuidv4(),
                reportType,
                entityId,
                entityType,
                timeRange: reportTimeRange,
                generatedAt: now.toISOString(),
                summary: {
                    overallScore: 0,
                    totalEntities: 0,
                    totalMetrics: 0,
                    keyFindings: [],
                    recommendations: []
                },
                dimensions: {
                    scores: {
                        clarity: 0,
                        completeness: 0,
                        accuracy: 0,
                        relevance: 0,
                        consistency: 0,
                        structure: 0
                    },
                    trends: {
                        clarity: 'stable',
                        completeness: 'stable',
                        accuracy: 'stable',
                        relevance: 'stable',
                        consistency: 'stable',
                        structure: 'stable'
                    },
                    benchmarkComparison: {
                        clarity: 'average',
                        completeness: 'average',
                        accuracy: 'average',
                        relevance: 'average',
                        consistency: 'average',
                        structure: 'average'
                    }
                },
                issues: {
                    total: 0,
                    bySeverity: {
                        [IssueSeverity.CRITICAL]: 0,
                        [IssueSeverity.HIGH]: 0,
                        [IssueSeverity.MEDIUM]: 0,
                        [IssueSeverity.LOW]: 0
                    },
                    byType: {},
                    trends: {
                        newIssues: 0,
                        resolvedIssues: 0,
                        issueVelocity: 0
                    }
                },
                improvements: {
                    recommendationsGenerated: 0,
                    recommendationsImplemented: 0,
                    averageImplementationTime: 0,
                    impactRealized: 0
                },
                performance: {
                    processingTimes: {
                        assessment: 0,
                        issueDetection: 0,
                        recommendations: 0
                    },
                    aiMetrics: {
                        confidence: 0.8,
                        accuracy: 0.85,
                        cacheHitRate: 0.7
                    }
                },
                predictions: {
                    qualityForecast: [],
                    riskFactors: [],
                    opportunities: []
                }
            };
            // Populate report based on available data
            await this.populateQualityReport(report, entityId, entityType, reportTimeRange);
            this.logger.info(`Generated ${reportType} quality report with ${report.summary.totalMetrics} metrics`);
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate quality report:', error);
            throw error;
        }
    }
    /**
     * Create quality dashboard
     */
    async createQualityDashboard(name = 'Quality Dashboard') {
        try {
            this.ensureInitialized();
            const allMetrics = this.getAllStoredMetrics();
            const now = new Date().toISOString();
            // Calculate dashboard metrics
            const totalDocuments = new Set(allMetrics.filter(m => m.entityType === 'document').map(m => m.entityId)).size;
            const totalChunks = new Set(allMetrics.filter(m => m.entityType === 'chunk').map(m => m.entityId)).size;
            const averageQuality = this.calculateAverageMetric(allMetrics, QualityMetricType.OVERALL_QUALITY_SCORE) || 0;
            const dashboard = {
                id: uuidv4(),
                name,
                description: 'Real-time quality metrics dashboard',
                lastUpdated: now,
                refreshInterval: 15, // 15 minutes
                sections: {
                    overview: {
                        totalDocuments,
                        totalChunks,
                        averageQuality,
                        qualityTrend: 'stable', // Would calculate from trend analysis
                        criticalIssues: 0,
                        pendingRecommendations: 0
                    },
                    qualityDistribution: {
                        excellent: 20,
                        good: 35,
                        average: 30,
                        poor: 12,
                        critical: 3
                    },
                    topIssues: [],
                    recentImprovements: [],
                    performanceMetrics: {
                        averageAssessmentTime: 2500,
                        aiConfidence: 0.82,
                        systemLoad: 0.45
                    }
                }
            };
            return dashboard;
        }
        catch (error) {
            this.logger.error('Failed to create quality dashboard:', error);
            throw error;
        }
    }
    /**
     * Compare metrics against benchmarks
     */
    compareToBenchmarks(metrics, benchmarkId = 'default') {
        const benchmark = this.benchmarks.find(b => b.id === benchmarkId) || this.DEFAULT_BENCHMARKS;
        const comparison = {};
        for (const metric of metrics) {
            const benchmarkValues = benchmark.benchmarks[metric.metricType];
            if (benchmarkValues) {
                const category = this.categorizeBenchmark(metric.value, benchmarkValues);
                comparison[metric.metricType] = {
                    current: metric.value,
                    benchmark: category,
                    percentile: this.calculatePercentile(metric.value, benchmarkValues),
                    recommendation: this.getBenchmarkRecommendation(category, metric.metricType)
                };
            }
        }
        return comparison;
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Extract assessment metrics from quality assessment
     */
    extractAssessmentMetrics(assessment, entityId, entityType, timestamp) {
        const metrics = [];
        // Overall quality score
        metrics.push(this.createMetric(QualityMetricType.OVERALL_QUALITY_SCORE, entityId, entityType, assessment.overallScore, 'score', timestamp, { source: 'quality_assessment_engine', tags: ['assessment'] }));
        // Individual dimension scores
        Object.entries(assessment.dimensions).forEach(([dimension, score]) => {
            const metricType = `${dimension}_score`;
            metrics.push(this.createMetric(metricType, entityId, entityType, score, 'score', timestamp, { source: 'quality_assessment_engine', tags: ['assessment', dimension] }));
        });
        // AI confidence
        metrics.push(this.createMetric(QualityMetricType.AI_CONFIDENCE, entityId, entityType, assessment.confidence, 'score', timestamp, { source: 'quality_assessment_engine', tags: ['assessment', 'ai'] }));
        return metrics;
    }
    /**
     * Extract issue metrics from quality issues
     */
    extractIssueMetrics(issues, entityId, entityType, timestamp) {
        const metrics = [];
        // Total issues
        metrics.push(this.createMetric(QualityMetricType.TOTAL_ISSUES, entityId, entityType, issues.length, 'count', timestamp, { source: 'quality_issue_detector', tags: ['issues'] }));
        // Issues by severity
        const severityCounts = {
            [IssueSeverity.CRITICAL]: issues.filter(i => i.severity === IssueSeverity.CRITICAL).length,
            [IssueSeverity.HIGH]: issues.filter(i => i.severity === IssueSeverity.HIGH).length,
            [IssueSeverity.MEDIUM]: issues.filter(i => i.severity === IssueSeverity.MEDIUM).length,
            [IssueSeverity.LOW]: issues.filter(i => i.severity === IssueSeverity.LOW).length
        };
        Object.entries(severityCounts).forEach(([severity, count]) => {
            const metricType = `${severity.toLowerCase()}_issues`;
            metrics.push(this.createMetric(metricType, entityId, entityType, count, 'count', timestamp, { source: 'quality_issue_detector', tags: ['issues', severity.toLowerCase()] }));
        });
        return metrics;
    }
    /**
     * Calculate content metrics
     */
    calculateContentMetrics(chunks, entityId, entityType, timestamp) {
        const metrics = [];
        if (chunks.length === 0)
            return metrics;
        const totalContent = chunks.map(chunk => chunk.content).join(' ');
        const wordCount = totalContent.split(/\s+/).filter(word => word.length > 0).length;
        const sentenceCount = totalContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        // Content length
        metrics.push(this.createMetric(QualityMetricType.CONTENT_LENGTH, entityId, entityType, totalContent.length, 'characters', timestamp, { source: 'metrics_collector', tags: ['content'] }));
        // Word count
        metrics.push(this.createMetric(QualityMetricType.WORD_COUNT, entityId, entityType, wordCount, 'words', timestamp, { source: 'metrics_collector', tags: ['content'] }));
        // Sentence count
        metrics.push(this.createMetric(QualityMetricType.SENTENCE_COUNT, entityId, entityType, sentenceCount, 'sentences', timestamp, { source: 'metrics_collector', tags: ['content'] }));
        // Readability score (simplified calculation)
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
        const readabilityScore = Math.min(1, Math.max(0, 1 - (avgWordsPerSentence - 15) / 20));
        metrics.push(this.createMetric(QualityMetricType.READABILITY_SCORE, entityId, entityType, readabilityScore, 'score', timestamp, { source: 'metrics_collector', tags: ['content', 'readability'] }));
        return metrics;
    }
    /**
     * Calculate structural metrics
     */
    calculateStructuralMetrics(chunks, entityId, entityType, timestamp) {
        const metrics = [];
        if (chunks.length === 0)
            return metrics;
        // Chunk count
        metrics.push(this.createMetric(QualityMetricType.CHUNK_COUNT, entityId, entityType, chunks.length, 'count', timestamp, { source: 'metrics_collector', tags: ['structure'] }));
        // Average chunk size
        const avgChunkSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;
        metrics.push(this.createMetric(QualityMetricType.AVERAGE_CHUNK_SIZE, entityId, entityType, avgChunkSize, 'characters', timestamp, { source: 'metrics_collector', tags: ['structure'] }));
        // Chunk size variance
        const variance = chunks.reduce((sum, chunk) => sum + Math.pow(chunk.content.length - avgChunkSize, 2), 0) / chunks.length;
        metrics.push(this.createMetric(QualityMetricType.CHUNK_SIZE_VARIANCE, entityId, entityType, variance, 'variance', timestamp, { source: 'metrics_collector', tags: ['structure'] }));
        return metrics;
    }
    /**
     * Calculate semantic metrics
     */
    async calculateSemanticMetrics(chunks, entityId, entityType, timestamp) {
        const metrics = [];
        if (chunks.length === 0)
            return metrics;
        try {
            // Count topics across all chunks
            let totalTopics = 0;
            let totalRelationships = 0;
            for (const chunk of chunks) {
                try {
                    const topics = await this.semanticChunkingService.getTopicsByChunk(chunk.id);
                    totalTopics += topics.length;
                    const relationships = await this.semanticChunkingService.getRelationships(chunk.id);
                    totalRelationships += relationships.length;
                }
                catch (error) {
                    this.logger.debug(`Failed to get semantic data for chunk ${chunk.id}:`, error);
                }
            }
            // Topic count
            metrics.push(this.createMetric(QualityMetricType.TOPIC_COUNT, entityId, entityType, totalTopics, 'count', timestamp, { source: 'semantic_chunking_service', tags: ['semantic', 'topics'] }));
            // Relationship count
            metrics.push(this.createMetric(QualityMetricType.RELATIONSHIP_COUNT, entityId, entityType, totalRelationships, 'count', timestamp, { source: 'semantic_chunking_service', tags: ['semantic', 'relationships'] }));
        }
        catch (error) {
            this.logger.warn('Failed to calculate semantic metrics:', error);
        }
        return metrics;
    }
    /**
     * Create a quality metric
     */
    createMetric(metricType, entityId, entityType, value, unit, timestamp, metadata) {
        return {
            id: uuidv4(),
            metricType,
            entityId,
            entityType,
            value,
            unit,
            timestamp,
            metadata
        };
    }
    /**
     * Store metrics in memory storage
     */
    storeMetrics(entityId, metrics) {
        const existing = this.metricsStorage.get(entityId) || [];
        existing.push(...metrics);
        this.metricsStorage.set(entityId, existing);
    }
    /**
     * Get all stored metrics
     */
    getAllStoredMetrics() {
        const allMetrics = [];
        for (const metrics of this.metricsStorage.values()) {
            allMetrics.push(...metrics);
        }
        return allMetrics;
    }
    /**
     * Calculate average metric value
     */
    calculateAverageMetric(metrics, metricType) {
        const relevantMetrics = metrics.filter(m => m.metricType === metricType);
        if (relevantMetrics.length === 0)
            return null;
        const sum = relevantMetrics.reduce((total, metric) => total + metric.value, 0);
        return sum / relevantMetrics.length;
    }
    /**
     * Calculate trend from values
     */
    calculateTrend(values) {
        if (values.length < 2) {
            return {
                direction: 'stable',
                changeRate: 0,
                significance: 'negligible',
                confidence: 0
            };
        }
        // Simple linear regression for trend
        const n = values.length;
        const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const changeRate = slope;
        // Determine direction
        let direction;
        if (Math.abs(changeRate) < 0.01) {
            direction = 'stable';
        }
        else {
            direction = changeRate > 0 ? 'improving' : 'declining';
        }
        // Determine significance
        let significance;
        const absChangeRate = Math.abs(changeRate);
        if (absChangeRate > 0.1) {
            significance = 'significant';
        }
        else if (absChangeRate > 0.05) {
            significance = 'moderate';
        }
        else if (absChangeRate > 0.01) {
            significance = 'minor';
        }
        else {
            significance = 'negligible';
        }
        // Calculate confidence (simplified)
        const variance = this.calculateVariance(values);
        const confidence = Math.max(0, Math.min(1, 1 - variance));
        return {
            direction,
            changeRate,
            significance,
            confidence
        };
    }
    /**
     * Calculate statistics for values
     */
    calculateStatistics(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((total, val) => total + val, 0);
        const mean = sum / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const standardDeviation = Math.sqrt(variance);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            average: mean,
            median,
            standardDeviation,
            variance
        };
    }
    /**
     * Calculate variance
     */
    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }
    /**
     * Populate quality report with data
     */
    async populateQualityReport(report, entityId, entityType, timeRange) {
        // Get relevant metrics
        let relevantMetrics = [];
        if (entityId) {
            relevantMetrics = this.metricsStorage.get(entityId) || [];
        }
        else {
            relevantMetrics = this.getAllStoredMetrics();
        }
        // Filter by time range if provided
        if (timeRange) {
            relevantMetrics = relevantMetrics.filter(metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end);
        }
        // Update summary
        report.summary.totalMetrics = relevantMetrics.length;
        report.summary.totalEntities = new Set(relevantMetrics.map(m => m.entityId)).size;
        // Calculate overall score
        const overallScoreMetrics = relevantMetrics.filter(m => m.metricType === QualityMetricType.OVERALL_QUALITY_SCORE);
        if (overallScoreMetrics.length > 0) {
            report.summary.overallScore = overallScoreMetrics.reduce((sum, m) => sum + m.value, 0) / overallScoreMetrics.length;
        }
        // Update dimensions
        Object.keys(report.dimensions.scores).forEach(dimension => {
            const metricType = `${dimension}_score`;
            const dimensionMetrics = relevantMetrics.filter(m => m.metricType === metricType);
            if (dimensionMetrics.length > 0) {
                report.dimensions.scores[dimension] =
                    dimensionMetrics.reduce((sum, m) => sum + m.value, 0) / dimensionMetrics.length;
            }
        });
        // Add basic findings and recommendations
        report.summary.keyFindings = [
            `Overall quality score: ${(report.summary.overallScore * 100).toFixed(1)}%`,
            `Total metrics collected: ${report.summary.totalMetrics}`,
            `Entities analyzed: ${report.summary.totalEntities}`
        ];
        report.summary.recommendations = [
            'Continue monitoring quality metrics regularly',
            'Focus on dimensions with scores below 0.7',
            'Implement suggested improvements from quality assessments'
        ];
    }
    /**
     * Categorize metric against benchmark
     */
    categorizeBenchmark(value, benchmarkValues) {
        if (value >= benchmarkValues.excellent)
            return 'excellent';
        if (value >= benchmarkValues.good)
            return 'good';
        if (value >= benchmarkValues.average)
            return 'average';
        if (value >= benchmarkValues.poor)
            return 'poor';
        return 'critical';
    }
    /**
     * Calculate percentile within benchmark
     */
    calculatePercentile(value, benchmarkValues) {
        const values = Object.values(benchmarkValues).sort((a, b) => a - b);
        const position = values.findIndex((val) => value <= val);
        return position === -1 ? 100 : (position / values.length) * 100;
    }
    /**
     * Get recommendation based on benchmark category
     */
    getBenchmarkRecommendation(category, metricType) {
        const recommendations = {
            excellent: 'Maintain current quality level',
            good: 'Continue current practices with minor improvements',
            average: 'Focus on improvement strategies',
            poor: 'Significant improvement needed',
            critical: 'Immediate attention required'
        };
        return recommendations[category] || 'Monitor and improve';
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('QualityMetricsCollector not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Quality Metrics Collector...');
            // Clear caches
            this.metricsStorage.clear();
            this.trendsCache.clear();
            this.initialized = false;
            this.logger.info('Quality Metrics Collector shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during Quality Metrics Collector shutdown:', error);
        }
    }
}
//# sourceMappingURL=QualityMetricsCollector.js.map