/**
 * Quality Monitoring Service - Phase 4 Week 4
 *
 * CastPlan MCP Autonomous Quality Service - Real-time Quality Monitoring
 * Comprehensive quality monitoring system with real-time tracking, metrics collection,
 * and integration with existing quality infrastructure.
 *
 * Features:
 * - Real-time quality metrics collection and tracking (<500ms latency)
 * - Integration with existing quality assessment and analytics infrastructure
 * - Event-driven architecture for responsive monitoring
 * - Historical quality evolution tracking and trend analysis
 * - Quality threshold monitoring with configurable alerts
 * - Performance-optimized with in-memory caching and batched database operations
 *
 * Integration points:
 * - QualityServiceOrchestrator for comprehensive quality analysis
 * - QualityMetricsCollector for metrics aggregation and reporting
 * - HealthMonitor for system health integration
 * - PerformanceMonitoringService for performance correlation
 * - QualityAlertManager for alert coordination (implemented separately)
 *
 * Performance requirements:
 * - Real-time monitoring latency <500ms
 * - Quality metrics collection and processing <100ms
 * - Event emission and handling <50ms
 * - Database operations batched for efficiency
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & Quality Systems Specialist
 */
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { QualityMetricType } from './QualityMetricsCollector';
import { IssuePriority } from './QualityIssueDetector';
export var QualityEventType;
(function (QualityEventType) {
    QualityEventType["QUALITY_SCORE_UPDATED"] = "quality_score_updated";
    QualityEventType["QUALITY_THRESHOLD_EXCEEDED"] = "quality_threshold_exceeded";
    QualityEventType["QUALITY_IMPROVED"] = "quality_improved";
    QualityEventType["QUALITY_DEGRADED"] = "quality_degraded";
    QualityEventType["ISSUES_DETECTED"] = "issues_detected";
    QualityEventType["ISSUES_RESOLVED"] = "issues_resolved";
    QualityEventType["METRIC_COLLECTED"] = "metric_collected";
    QualityEventType["TREND_DETECTED"] = "trend_detected";
    QualityEventType["ANOMALY_DETECTED"] = "anomaly_detected";
    // Phase 4 Week 5: Automated Workflow Events
    QualityEventType["WORKFLOW_TRIGGERED"] = "workflow_triggered";
    QualityEventType["WORKFLOW_COMPLETED"] = "workflow_completed";
    QualityEventType["WORKFLOW_FAILED"] = "workflow_failed";
    QualityEventType["TASK_SCHEDULED"] = "task_scheduled";
    QualityEventType["TASK_STARTED"] = "task_started";
    QualityEventType["TASK_COMPLETED"] = "task_completed";
    QualityEventType["SYSTEM_OPTIMIZED"] = "system_optimized";
    QualityEventType["LOAD_BALANCED"] = "load_balanced";
    QualityEventType["AUTOMATION_THRESHOLD_TRIGGERED"] = "automation_threshold_triggered";
})(QualityEventType || (QualityEventType = {}));
// =============================================================================
// QUALITY MONITORING SERVICE
// =============================================================================
export class QualityMonitoringService extends EventEmitter {
    logger;
    db;
    config;
    // Core services
    qualityOrchestrator;
    metricsCollector;
    // Monitoring state
    isMonitoring = false;
    monitoringInterval;
    cleanupInterval;
    // In-memory caches for performance
    qualityCache = new Map();
    metricsBuffer = [];
    eventsBuffer = [];
    // Statistics and tracking
    startTime = Date.now();
    processedEvents = 0;
    cacheHits = 0;
    cacheMisses = 0;
    constructor(database, logger, qualityOrchestrator, metricsCollector, config = {}) {
        super();
        this.db = database;
        this.logger = logger;
        this.qualityOrchestrator = qualityOrchestrator;
        this.metricsCollector = metricsCollector;
        // Set default configuration with performance requirements
        this.config = {
            monitoringInterval: 10000, // 10 seconds for real-time monitoring
            metricsBatchSize: 100,
            maxHistorySize: 10000,
            cleanupInterval: 3600000, // 1 hour
            enableRealTimeTracking: true,
            enableTrendAnalysis: true,
            qualityThresholds: {
                overallQuality: {
                    critical: 0.3, // Below 30% is critical
                    warning: 0.6, // Below 60% is warning
                    target: 0.8 // 80% is target
                },
                dimensions: {
                    clarity: { critical: 0.4, warning: 0.6, target: 0.8 },
                    completeness: { critical: 0.5, warning: 0.7, target: 0.9 },
                    accuracy: { critical: 0.6, warning: 0.8, target: 0.95 },
                    relevance: { critical: 0.4, warning: 0.6, target: 0.8 },
                    consistency: { critical: 0.5, warning: 0.7, target: 0.85 },
                    structure: { critical: 0.4, warning: 0.6, target: 0.8 }
                },
                issues: {
                    criticalIssuesMax: 0,
                    highIssuesMax: 3,
                    totalIssuesMax: 10,
                    issueDensityMax: 5 // 5 issues per 1000 words
                }
            },
            performance: {
                enableCaching: true,
                cacheSize: 1000,
                batchInsertSize: 50
            },
            ...config
        };
        this.initializeDatabase();
        this.setupEventListeners();
        this.logger.info('Quality Monitoring Service initialized', {
            config: this.config,
            cacheEnabled: this.config.performance.enableCaching
        });
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeDatabase() {
        try {
            // Quality monitoring events table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS quality_monitoring_events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          data TEXT NOT NULL,
          severity TEXT NOT NULL,
          source TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Real-time quality snapshots table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS quality_snapshots (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          quality_score TEXT NOT NULL,
          issues_count INTEGER NOT NULL,
          metrics TEXT NOT NULL,
          trend_direction TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Quality monitoring statistics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS quality_monitoring_stats (
          id TEXT PRIMARY KEY,
          entities_monitored INTEGER NOT NULL,
          average_quality_score REAL NOT NULL,
          quality_trend TEXT NOT NULL,
          total_issues INTEGER NOT NULL,
          issues_resolved_today INTEGER NOT NULL,
          metrics_collected_today INTEGER NOT NULL,
          alerts_triggered_today INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes for performance
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON quality_monitoring_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_monitoring_events_entity ON quality_monitoring_events(entity_id, entity_type);
        CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON quality_monitoring_events(type);
        CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON quality_snapshots(entity_id, entity_type);
        CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON quality_snapshots(timestamp);
        CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON quality_monitoring_stats(timestamp);
      `);
            this.logger.info('Quality monitoring database tables initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize quality monitoring database:', error);
            throw error;
        }
    }
    setupEventListeners() {
        // Listen to quality orchestrator events
        this.qualityOrchestrator.on('quality-analysis-complete', this.handleQualityAnalysisComplete.bind(this));
        this.qualityOrchestrator.on('quality-improvement-complete', this.handleQualityImprovementComplete.bind(this));
        // Listen to metrics collector events
        this.metricsCollector.on('metrics-collected', this.handleMetricsCollected.bind(this));
        this.metricsCollector.on('quality-report-generated', this.handleQualityReportGenerated.bind(this));
        this.logger.info('Quality monitoring event listeners setup complete');
    }
    // =============================================================================
    // REAL-TIME MONITORING
    // =============================================================================
    async startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('Quality monitoring is already running');
            return;
        }
        this.isMonitoring = true;
        this.startTime = Date.now();
        // Start real-time monitoring interval
        if (this.config.enableRealTimeTracking) {
            this.monitoringInterval = setInterval(() => this.performRealTimeMonitoring(), this.config.monitoringInterval);
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.performCleanup(), this.config.cleanupInterval);
        // Emit monitoring started event
        await this.emitQualityEvent({
            type: QualityEventType.METRIC_COLLECTED,
            entityId: 'system',
            entityType: 'system',
            data: { action: 'monitoring_started' },
            severity: 'info',
            source: 'QualityMonitoringService'
        });
        this.logger.info('Quality monitoring started', {
            realTimeTracking: this.config.enableRealTimeTracking,
            interval: this.config.monitoringInterval
        });
    }
    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        this.isMonitoring = false;
        // Clear intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        // Flush any pending data
        await this.flushBuffers();
        // Emit monitoring stopped event
        await this.emitQualityEvent({
            type: QualityEventType.METRIC_COLLECTED,
            entityId: 'system',
            entityType: 'system',
            data: { action: 'monitoring_stopped' },
            severity: 'info',
            source: 'QualityMonitoringService'
        });
        this.logger.info('Quality monitoring stopped');
    }
    async performRealTimeMonitoring() {
        const startTime = performance.now();
        try {
            // Get entities to monitor (from cache or database)
            const entitiesToMonitor = await this.getEntitiesToMonitor();
            // Process each entity
            for (const entityId of entitiesToMonitor) {
                await this.monitorEntityQuality(entityId);
            }
            // Process buffered data
            await this.processBuffers();
            const processingTime = performance.now() - startTime;
            // Ensure we meet performance requirement (<500ms)
            if (processingTime > 500) {
                this.logger.warn('Real-time monitoring exceeded performance requirement', {
                    processingTime: `${processingTime.toFixed(2)}ms`,
                    entitiesProcessed: entitiesToMonitor.length
                });
            }
        }
        catch (error) {
            this.logger.error('Error during real-time monitoring:', error);
        }
    }
    async getEntitiesToMonitor() {
        // This would typically query for documents or chunks that need monitoring
        // For now, return cached entities or recent documents
        try {
            const stmt = this.db.prepare(`
        SELECT DISTINCT entity_id 
        FROM quality_snapshots 
        WHERE datetime(timestamp) > datetime('now', '-1 hour')
        ORDER BY timestamp DESC 
        LIMIT 50
      `);
            const results = stmt.all();
            return results.map(r => r.entity_id);
        }
        catch (error) {
            this.logger.error('Failed to get entities to monitor:', error);
            return Array.from(this.qualityCache.keys()).slice(0, 20);
        }
    }
    async monitorEntityQuality(entityId) {
        const startTime = performance.now();
        try {
            // Check cache first for performance
            let currentSnapshot = this.qualityCache.get(entityId);
            let requiresAnalysis = false;
            if (!currentSnapshot) {
                requiresAnalysis = true;
                this.cacheMisses++;
            }
            else {
                this.cacheHits++;
                // Check if snapshot is stale (older than monitoring interval)
                const snapshotAge = Date.now() - new Date(currentSnapshot.timestamp).getTime();
                if (snapshotAge > this.config.monitoringInterval * 2) {
                    requiresAnalysis = true;
                }
            }
            if (requiresAnalysis) {
                // Perform quality analysis
                const analysis = await this.performQualityAnalysis(entityId);
                if (analysis) {
                    currentSnapshot = await this.createQualitySnapshot(entityId, analysis);
                    // Update cache if enabled
                    if (this.config.performance.enableCaching) {
                        this.qualityCache.set(entityId, currentSnapshot);
                        // Trim cache if it exceeds size limit
                        if (this.qualityCache.size > this.config.performance.cacheSize) {
                            const oldestKey = this.qualityCache.keys().next().value;
                            this.qualityCache.delete(oldestKey);
                        }
                    }
                }
            }
            if (currentSnapshot) {
                // Check thresholds and emit events
                await this.checkQualityThresholds(currentSnapshot);
                // Store snapshot in buffer for batch processing
                this.bufferSnapshot(currentSnapshot);
            }
            const processingTime = performance.now() - startTime;
            // Ensure individual entity monitoring is fast (<100ms)
            if (processingTime > 100) {
                this.logger.debug('Entity monitoring exceeded performance target', {
                    entityId,
                    processingTime: `${processingTime.toFixed(2)}ms`
                });
            }
        }
        catch (error) {
            this.logger.error(`Error monitoring entity ${entityId}:`, error);
        }
    }
    // =============================================================================
    // QUALITY ANALYSIS AND SNAPSHOT CREATION
    // =============================================================================
    async performQualityAnalysis(entityId) {
        try {
            // Determine entity type and get content
            const entityType = await this.determineEntityType(entityId);
            if (entityType === 'document') {
                // Get document content and perform analysis
                const options = {
                    enableChunkLevelAnalysis: true,
                    enableVersionTracking: true,
                    enableIssueDetection: true,
                    enableRecommendations: false, // Skip recommendations for monitoring
                    enableMetricsCollection: true,
                    maxIssuesPerDocument: 20
                };
                return await this.qualityOrchestrator.assessDocumentQuality(entityId, options);
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to analyze quality for entity ${entityId}:`, error);
            return null;
        }
    }
    async determineEntityType(entityId) {
        // This would typically query the database to determine entity type
        // For now, assume document if it looks like a UUID, otherwise system
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(entityId) ? 'document' : 'system';
    }
    async createQualitySnapshot(entityId, analysis) {
        const timestamp = new Date().toISOString();
        // Determine trend direction based on previous snapshot
        let trendDirection = 'stable';
        const previousSnapshot = this.qualityCache.get(entityId);
        if (previousSnapshot) {
            const currentScore = analysis.overallScore.overall;
            const previousScore = previousSnapshot.qualityScore.overall;
            if (currentScore > previousScore + 0.05) {
                trendDirection = 'up';
            }
            else if (currentScore < previousScore - 0.05) {
                trendDirection = 'down';
            }
        }
        const snapshot = {
            timestamp,
            entityId,
            entityType: await this.determineEntityType(entityId),
            qualityScore: analysis.overallScore,
            issues: analysis.issues,
            metrics: analysis.metrics,
            trendDirection,
            lastUpdated: timestamp
        };
        return snapshot;
    }
    // =============================================================================
    // THRESHOLD CHECKING AND ALERTING
    // =============================================================================
    async checkQualityThresholds(snapshot) {
        const thresholds = this.config.qualityThresholds;
        // Check overall quality threshold
        const overallScore = snapshot.qualityScore.overall;
        if (overallScore <= thresholds.overallQuality.critical) {
            await this.emitQualityEvent({
                type: QualityEventType.QUALITY_THRESHOLD_EXCEEDED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    thresholdType: 'overall_quality_critical',
                    currentScore: overallScore,
                    threshold: thresholds.overallQuality.critical,
                    dimension: 'overall'
                },
                severity: 'critical',
                source: 'QualityMonitoringService'
            });
        }
        else if (overallScore <= thresholds.overallQuality.warning) {
            await this.emitQualityEvent({
                type: QualityEventType.QUALITY_THRESHOLD_EXCEEDED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    thresholdType: 'overall_quality_warning',
                    currentScore: overallScore,
                    threshold: thresholds.overallQuality.warning,
                    dimension: 'overall'
                },
                severity: 'warning',
                source: 'QualityMonitoringService'
            });
        }
        // Check dimension thresholds
        await this.checkDimensionThresholds(snapshot);
        // Check issue thresholds
        await this.checkIssueThresholds(snapshot);
        // Check for quality trend changes
        if (snapshot.trendDirection !== 'stable') {
            await this.emitQualityEvent({
                type: QualityEventType.TREND_DETECTED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    trendDirection: snapshot.trendDirection,
                    currentScore: overallScore
                },
                severity: snapshot.trendDirection === 'down' ? 'warning' : 'info',
                source: 'QualityMonitoringService'
            });
        }
    }
    async checkDimensionThresholds(snapshot) {
        const dimensions = snapshot.qualityScore.dimensions;
        const thresholds = this.config.qualityThresholds.dimensions;
        for (const [dimension, score] of Object.entries(dimensions)) {
            const dimensionThresholds = thresholds[dimension];
            if (dimensionThresholds) {
                if (score <= dimensionThresholds.critical) {
                    await this.emitQualityEvent({
                        type: QualityEventType.QUALITY_THRESHOLD_EXCEEDED,
                        entityId: snapshot.entityId,
                        entityType: snapshot.entityType,
                        data: {
                            thresholdType: `${dimension}_critical`,
                            currentScore: score,
                            threshold: dimensionThresholds.critical,
                            dimension
                        },
                        severity: 'critical',
                        source: 'QualityMonitoringService'
                    });
                }
                else if (score <= dimensionThresholds.warning) {
                    await this.emitQualityEvent({
                        type: QualityEventType.QUALITY_THRESHOLD_EXCEEDED,
                        entityId: snapshot.entityId,
                        entityType: snapshot.entityType,
                        data: {
                            thresholdType: `${dimension}_warning`,
                            currentScore: score,
                            threshold: dimensionThresholds.warning,
                            dimension
                        },
                        severity: 'warning',
                        source: 'QualityMonitoringService'
                    });
                }
            }
        }
    }
    async checkIssueThresholds(snapshot) {
        const issues = snapshot.issues;
        const thresholds = this.config.qualityThresholds.issues;
        const criticalIssues = issues.filter(i => i.priority === IssuePriority.CRITICAL).length;
        const highIssues = issues.filter(i => i.priority === IssuePriority.HIGH).length;
        const totalIssues = issues.length;
        // Check critical issues threshold
        if (criticalIssues > thresholds.criticalIssuesMax) {
            await this.emitQualityEvent({
                type: QualityEventType.ISSUES_DETECTED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    thresholdType: 'critical_issues_exceeded',
                    criticalIssues,
                    threshold: thresholds.criticalIssuesMax,
                    issues: issues.filter(i => i.priority === IssuePriority.CRITICAL)
                },
                severity: 'critical',
                source: 'QualityMonitoringService'
            });
        }
        // Check high issues threshold
        if (highIssues > thresholds.highIssuesMax) {
            await this.emitQualityEvent({
                type: QualityEventType.ISSUES_DETECTED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    thresholdType: 'high_issues_exceeded',
                    highIssues,
                    threshold: thresholds.highIssuesMax
                },
                severity: 'warning',
                source: 'QualityMonitoringService'
            });
        }
        // Check total issues threshold
        if (totalIssues > thresholds.totalIssuesMax) {
            await this.emitQualityEvent({
                type: QualityEventType.ISSUES_DETECTED,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                data: {
                    thresholdType: 'total_issues_exceeded',
                    totalIssues,
                    threshold: thresholds.totalIssuesMax
                },
                severity: 'warning',
                source: 'QualityMonitoringService'
            });
        }
    }
    // =============================================================================
    // EVENT HANDLING AND BUFFERING
    // =============================================================================
    async emitQualityEvent(eventData) {
        const event = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...eventData
        };
        // Buffer event for batch processing
        this.eventsBuffer.push(event);
        // Emit event for real-time listeners
        this.emit('qualityEvent', event);
        // Also emit specific event type for targeted listeners
        this.emit(event.type, event);
        this.processedEvents++;
    }
    bufferSnapshot(snapshot) {
        // Convert snapshot to metrics for storage
        const metrics = [
            {
                id: uuidv4(),
                metricType: QualityMetricType.OVERALL_QUALITY_SCORE,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                value: snapshot.qualityScore.overall,
                unit: 'score',
                timestamp: snapshot.timestamp,
                metadata: {
                    source: 'QualityMonitoringService',
                    context: { trendDirection: snapshot.trendDirection },
                    tags: ['real-time', 'monitoring']
                }
            }
        ];
        // Add dimension metrics
        Object.entries(snapshot.qualityScore.dimensions).forEach(([dimension, score]) => {
            metrics.push({
                id: uuidv4(),
                metricType: `${dimension}_score`,
                entityId: snapshot.entityId,
                entityType: snapshot.entityType,
                value: score,
                unit: 'score',
                timestamp: snapshot.timestamp,
                metadata: {
                    source: 'QualityMonitoringService',
                    context: { dimension },
                    tags: ['real-time', 'monitoring', 'dimension']
                }
            });
        });
        // Add issue metrics
        metrics.push({
            id: uuidv4(),
            metricType: QualityMetricType.TOTAL_ISSUES,
            entityId: snapshot.entityId,
            entityType: snapshot.entityType,
            value: snapshot.issues.length,
            unit: 'count',
            timestamp: snapshot.timestamp,
            metadata: {
                source: 'QualityMonitoringService',
                context: {
                    criticalIssues: snapshot.issues.filter(i => i.priority === IssuePriority.CRITICAL).length,
                    highIssues: snapshot.issues.filter(i => i.priority === IssuePriority.HIGH).length
                },
                tags: ['real-time', 'monitoring', 'issues']
            }
        });
        // Add to metrics buffer
        this.metricsBuffer.push(...metrics);
    }
    async processBuffers() {
        // Process metrics buffer
        if (this.metricsBuffer.length >= this.config.metricsBatchSize) {
            await this.flushMetricsBuffer();
        }
        // Process events buffer
        if (this.eventsBuffer.length >= this.config.metricsBatchSize) {
            await this.flushEventsBuffer();
        }
    }
    async flushBuffers() {
        await Promise.all([
            this.flushMetricsBuffer(),
            this.flushEventsBuffer()
        ]);
    }
    async flushMetricsBuffer() {
        if (this.metricsBuffer.length === 0)
            return;
        try {
            // Store snapshots in database (batch insert for performance)
            const snapshots = this.extractSnapshotsFromMetrics();
            if (snapshots.length > 0) {
                await this.batchInsertSnapshots(snapshots);
            }
            // Send metrics to metrics collector
            for (const metric of this.metricsBuffer) {
                this.metricsCollector.collectMetric(metric);
            }
            this.logger.debug(`Flushed ${this.metricsBuffer.length} metrics`);
            this.metricsBuffer = [];
        }
        catch (error) {
            this.logger.error('Failed to flush metrics buffer:', error);
        }
    }
    async flushEventsBuffer() {
        if (this.eventsBuffer.length === 0)
            return;
        try {
            // Batch insert events
            await this.batchInsertEvents(this.eventsBuffer);
            this.logger.debug(`Flushed ${this.eventsBuffer.length} events`);
            this.eventsBuffer = [];
        }
        catch (error) {
            this.logger.error('Failed to flush events buffer:', error);
        }
    }
    extractSnapshotsFromMetrics() {
        const snapshotMap = new Map();
        // Group metrics by entity to reconstruct snapshots
        for (const metric of this.metricsBuffer) {
            if (!snapshotMap.has(metric.entityId)) {
                snapshotMap.set(metric.entityId, {
                    entityId: metric.entityId,
                    entityType: metric.entityType,
                    timestamp: metric.timestamp
                });
            }
            const snapshot = snapshotMap.get(metric.entityId);
            // Build quality score from metrics
            if (metric.metricType === QualityMetricType.OVERALL_QUALITY_SCORE) {
                snapshot.qualityScore = {
                    overall: metric.value,
                    dimensions: {},
                    confidence: 0.8,
                    version: '1.0'
                };
            }
        }
        // Convert to complete snapshots (only those with quality scores)
        return Array.from(snapshotMap.values())
            .filter(s => s.qualityScore)
            .map(s => ({
            ...s,
            issues: [],
            metrics: {},
            trendDirection: 'stable',
            lastUpdated: s.timestamp
        }));
    }
    async batchInsertSnapshots(snapshots) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quality_snapshots (
        id, entity_id, entity_type, quality_score, issues_count, 
        metrics, trend_direction, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const transaction = this.db.transaction((snapshots) => {
            for (const snapshot of snapshots) {
                stmt.run(uuidv4(), snapshot.entityId, snapshot.entityType, JSON.stringify(snapshot.qualityScore), snapshot.issues.length, JSON.stringify(snapshot.metrics), snapshot.trendDirection, snapshot.timestamp);
            }
        });
        transaction(snapshots);
    }
    async batchInsertEvents(events) {
        const stmt = this.db.prepare(`
      INSERT INTO quality_monitoring_events (
        id, type, timestamp, entity_id, entity_type, data, severity, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const transaction = this.db.transaction((events) => {
            for (const event of events) {
                stmt.run(event.id, event.type, event.timestamp, event.entityId, event.entityType, JSON.stringify(event.data), event.severity, event.source);
            }
        });
        transaction(events);
    }
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    async handleQualityAnalysisComplete(data) {
        const { entityId, analysis } = data;
        // Create and cache snapshot
        const snapshot = await this.createQualitySnapshot(entityId, analysis);
        this.qualityCache.set(entityId, snapshot);
        // Check thresholds
        await this.checkQualityThresholds(snapshot);
        // Emit event
        await this.emitQualityEvent({
            type: QualityEventType.QUALITY_SCORE_UPDATED,
            entityId,
            entityType: snapshot.entityType,
            data: {
                qualityScore: analysis.overallScore,
                issuesCount: analysis.issues.length,
                processingTime: analysis.metadata.processingTime
            },
            severity: 'info',
            source: 'QualityServiceOrchestrator'
        });
    }
    async handleQualityImprovementComplete(data) {
        const { entityId, result } = data;
        if (result.success) {
            await this.emitQualityEvent({
                type: QualityEventType.QUALITY_IMPROVED,
                entityId,
                entityType: 'document',
                data: {
                    improvementsApplied: result.improvementsApplied,
                    beforeScore: result.beforeScore,
                    afterScore: result.afterScore,
                    issuesResolved: result.issuesResolved.length
                },
                severity: 'info',
                source: 'QualityServiceOrchestrator'
            });
        }
    }
    async handleMetricsCollected(data) {
        // Process collected metrics and emit events if needed
        for (const metric of data.metrics) {
            if (metric.metricType === QualityMetricType.OVERALL_QUALITY_SCORE) {
                // Check if this represents a significant quality change
                const cached = this.qualityCache.get(metric.entityId);
                if (cached && Math.abs(cached.qualityScore.overall - metric.value) > 0.1) {
                    await this.emitQualityEvent({
                        type: metric.value > cached.qualityScore.overall ?
                            QualityEventType.QUALITY_IMPROVED : QualityEventType.QUALITY_DEGRADED,
                        entityId: metric.entityId,
                        entityType: metric.entityType,
                        data: {
                            previousScore: cached.qualityScore.overall,
                            newScore: metric.value,
                            change: metric.value - cached.qualityScore.overall
                        },
                        severity: metric.value < cached.qualityScore.overall ? 'warning' : 'info',
                        source: 'QualityMetricsCollector'
                    });
                }
            }
        }
    }
    async handleQualityReportGenerated(data) {
        // Process quality report and update monitoring statistics
        await this.updateMonitoringStatistics(data.report);
    }
    // =============================================================================
    // STATISTICS AND REPORTING
    // =============================================================================
    async updateMonitoringStatistics(report) {
        try {
            const stats = await this.calculateMonitoringStatistics();
            // Store statistics in database
            const stmt = this.db.prepare(`
        INSERT INTO quality_monitoring_stats (
          id, entities_monitored, average_quality_score, quality_trend,
          total_issues, issues_resolved_today, metrics_collected_today,
          alerts_triggered_today, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), stats.totalEntitiesMonitored, stats.averageQualityScore, stats.qualityTrend, stats.totalIssuesDetected, stats.issuesResolvedToday, stats.metricsCollectedToday, stats.alertsTriggeredToday, new Date().toISOString());
        }
        catch (error) {
            this.logger.error('Failed to update monitoring statistics:', error);
        }
    }
    async calculateMonitoringStatistics() {
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        // Calculate cache hit rate
        const totalCacheAccess = this.cacheHits + this.cacheMisses;
        const cacheHitRate = totalCacheAccess > 0 ? this.cacheHits / totalCacheAccess : 0;
        // Calculate average quality score from cache
        let totalScore = 0;
        let entitiesCount = 0;
        for (const snapshot of this.qualityCache.values()) {
            totalScore += snapshot.qualityScore.overall;
            entitiesCount++;
        }
        const averageQualityScore = entitiesCount > 0 ? totalScore / entitiesCount : 0;
        // Get today's metrics from database
        const metricsToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM quality_monitoring_events 
      WHERE datetime(timestamp) >= datetime(?)
    `).get(dayStart);
        const alertsToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM quality_monitoring_events 
      WHERE datetime(timestamp) >= datetime(?) AND type = ?
    `).get(dayStart, QualityEventType.QUALITY_THRESHOLD_EXCEEDED);
        const improvementsToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM quality_monitoring_events 
      WHERE datetime(timestamp) >= datetime(?) AND type = ?
    `).get(dayStart, QualityEventType.QUALITY_IMPROVED);
        // Calculate processing performance
        const uptime = Date.now() - this.startTime;
        const eventsPerSecond = uptime > 0 ? (this.processedEvents / (uptime / 1000)) : 0;
        return {
            totalEntitiesMonitored: this.qualityCache.size,
            averageQualityScore,
            qualityTrend: 'stable', // Would need historical analysis for accurate trend
            totalIssuesDetected: Array.from(this.qualityCache.values())
                .reduce((sum, snapshot) => sum + snapshot.issues.length, 0),
            issuesResolvedToday: improvementsToday.count,
            metricsCollectedToday: metricsToday.count,
            alertsTriggeredToday: alertsToday.count,
            monitoringUptime: uptime,
            performanceMetrics: {
                averageProcessingTime: this.config.monitoringInterval, // Approximation
                eventsProcessedPerSecond: eventsPerSecond,
                cacheHitRate
            }
        };
    }
    // =============================================================================
    // CLEANUP AND MAINTENANCE
    // =============================================================================
    async performCleanup() {
        try {
            const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
            // Clean old events
            const eventsCleanup = this.db.prepare(`
        DELETE FROM quality_monitoring_events 
        WHERE datetime(created_at) < datetime(?)
      `);
            const eventsDeleted = eventsCleanup.run(cutoffDate);
            // Clean old snapshots
            const snapshotsCleanup = this.db.prepare(`
        DELETE FROM quality_snapshots 
        WHERE datetime(created_at) < datetime(?)
      `);
            const snapshotsDeleted = snapshotsCleanup.run(cutoffDate);
            // Clean old statistics
            const statsCleanup = this.db.prepare(`
        DELETE FROM quality_monitoring_stats 
        WHERE datetime(created_at) < datetime(?)
      `);
            const statsDeleted = statsCleanup.run(cutoffDate);
            this.logger.info('Cleanup completed', {
                eventsDeleted: eventsDeleted.changes,
                snapshotsDeleted: snapshotsDeleted.changes,
                statsDeleted: statsDeleted.changes
            });
        }
        catch (error) {
            this.logger.error('Failed to perform cleanup:', error);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async getQualitySnapshot(entityId) {
        // Check cache first
        const cached = this.qualityCache.get(entityId);
        if (cached) {
            return cached;
        }
        // Query database
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM quality_snapshots 
        WHERE entity_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `);
            const result = stmt.get(entityId);
            if (result) {
                return {
                    timestamp: result.timestamp,
                    entityId: result.entity_id,
                    entityType: result.entity_type,
                    qualityScore: JSON.parse(result.quality_score),
                    issues: [], // Would need to query separately
                    metrics: JSON.parse(result.metrics),
                    trendDirection: result.trend_direction,
                    lastUpdated: result.timestamp
                };
            }
        }
        catch (error) {
            this.logger.error(`Failed to get quality snapshot for ${entityId}:`, error);
        }
        return null;
    }
    async getQualityEvents(entityId, eventType, timeframe, limit = 100) {
        try {
            let query = 'SELECT * FROM quality_monitoring_events WHERE 1=1';
            const params = [];
            if (entityId) {
                query += ' AND entity_id = ?';
                params.push(entityId);
            }
            if (eventType) {
                query += ' AND type = ?';
                params.push(eventType);
            }
            if (timeframe) {
                query += ' AND datetime(timestamp) BETWEEN datetime(?) AND datetime(?)';
                params.push(timeframe.start, timeframe.end);
            }
            query += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(limit);
            const stmt = this.db.prepare(query);
            const results = stmt.all(...params);
            return results.map(row => ({
                id: row.id,
                type: row.type,
                timestamp: row.timestamp,
                entityId: row.entity_id,
                entityType: row.entity_type,
                data: JSON.parse(row.data),
                severity: row.severity,
                source: row.source
            }));
        }
        catch (error) {
            this.logger.error('Failed to get quality events:', error);
            return [];
        }
    }
    async getMonitoringStatistics() {
        return await this.calculateMonitoringStatistics();
    }
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Quality monitoring configuration updated', { newConfig });
    }
    getCacheStatistics() {
        const totalAccess = this.cacheHits + this.cacheMisses;
        return {
            size: this.qualityCache.size,
            hitRate: totalAccess > 0 ? this.cacheHits / totalAccess : 0,
            hits: this.cacheHits,
            misses: this.cacheMisses
        };
    }
    async destroy() {
        await this.stopMonitoring();
        await this.flushBuffers();
        this.qualityCache.clear();
        this.removeAllListeners();
        this.logger.info('Quality monitoring service destroyed');
    }
}
export default QualityMonitoringService;
//# sourceMappingURL=QualityMonitoringService.js.map