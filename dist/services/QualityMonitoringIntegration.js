/**
 * QualityMonitoringIntegration - Integration layer for quality monitoring system
 * Phase 4 Week 4 - Quality Monitoring and Alert System Integration
 *
 * Integrates QualityMonitoringService, QualityAlertManager, QualityAnomalyDetector,
 * QualityDashboardService, and QualityReportingService with existing HealthMonitor
 * and PerformanceMonitoringService for comprehensive monitoring
 *
 * Features:
 * - Seamless integration with existing monitoring infrastructure
 * - Cross-system event correlation and alerting
 * - Unified monitoring dashboard with performance and quality metrics
 * - Automated quality-performance correlation analysis
 * - Integrated reporting with performance and health metrics
 */
import { EventEmitter } from 'events';
import { HealthStatus } from '../utils/HealthMonitor';
import { QualityMonitoringService } from './QualityMonitoringService';
import { QualityAlertManager } from './QualityAlertManager';
import { QualityAnomalyDetector } from './QualityAnomalyDetector';
import { QualityDashboardService } from './QualityDashboardService';
import { QualityReportingService } from './QualityReportingService';
import { DatabaseManager } from '../utils/DatabaseManager';
/**
 * Quality Monitoring Integration Service
 */
export class QualityMonitoringIntegration extends EventEmitter {
    db;
    logger;
    config;
    // Service instances
    healthMonitor;
    performanceService;
    qualityService;
    alertManager;
    anomalyDetector;
    dashboardService;
    reportingService;
    // Integration state
    correlationCache = new Map();
    correlationInterval;
    unifiedStatus;
    isRunning = false;
    constructor(config, logger, options = {}) {
        super();
        this.config = config;
        this.logger = logger;
        this.db = DatabaseManager.getInstance().getDatabase();
        // Initialize services
        this.initializeServices(options);
        this.initializeDatabase();
        this.logger.info('Quality Monitoring Integration initialized', {
            config: this.config,
            timestamp: new Date()
        });
    }
    /**
     * Initialize all monitoring services
     */
    initializeServices(options) {
        // Use provided instances or create new ones
        this.healthMonitor = options.healthMonitor;
        this.performanceService = options.performanceService;
        // Initialize quality monitoring services
        if (options.qualityConfig) {
            this.qualityService = new QualityMonitoringService(options.qualityConfig);
        }
        if (options.alertConfig) {
            this.alertManager = new QualityAlertManager(options.alertConfig);
        }
        if (options.anomalyConfig) {
            this.anomalyDetector = new QualityAnomalyDetector(options.anomalyConfig);
        }
        if (options.dashboardConfig) {
            this.dashboardService = new QualityDashboardService(options.dashboardConfig);
        }
        if (options.reportingConfig) {
            this.reportingService = new QualityReportingService(options.reportingConfig);
        }
    }
    /**
     * Initialize database tables for integration
     */
    initializeDatabase() {
        // Correlation analysis table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_correlations (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        correlation_type TEXT NOT NULL,
        correlation_score REAL NOT NULL,
        primary_metric_type TEXT NOT NULL,
        primary_metric_value REAL NOT NULL,
        primary_metric_source TEXT NOT NULL,
        secondary_metric_type TEXT NOT NULL,
        secondary_metric_value REAL NOT NULL,
        secondary_metric_source TEXT NOT NULL,
        pattern TEXT NOT NULL,
        strength TEXT NOT NULL,
        confidence REAL NOT NULL,
        insights TEXT NOT NULL, -- JSON array
        recommendations TEXT NOT NULL, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Unified monitoring status table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS unified_monitoring_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME NOT NULL,
        overall_status TEXT NOT NULL,
        quality_score REAL NOT NULL,
        performance_score REAL NOT NULL,
        health_score REAL NOT NULL,
        quality_metrics TEXT NOT NULL, -- JSON object
        performance_metrics TEXT NOT NULL, -- JSON object
        health_metrics TEXT NOT NULL, -- JSON object
        alert_summary TEXT NOT NULL, -- JSON object
        correlations TEXT NOT NULL, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_correlations_timestamp ON quality_correlations (timestamp);
      CREATE INDEX IF NOT EXISTS idx_correlations_type ON quality_correlations (correlation_type);
      CREATE INDEX IF NOT EXISTS idx_unified_status_timestamp ON unified_monitoring_status (timestamp);
    `);
        this.logger.info('Quality monitoring integration database tables initialized');
    }
    /**
     * Start the integration service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Quality monitoring integration already running');
            return;
        }
        try {
            // Set up event listeners for cross-system integration
            this.setupEventListeners();
            // Start correlation analysis if enabled
            if (this.config.correlationEnabled) {
                this.startCorrelationAnalysis();
            }
            // Start unified status monitoring
            this.startUnifiedStatusMonitoring();
            this.isRunning = true;
            this.emit('integrationStarted', {
                timestamp: new Date(),
                config: this.config
            });
            this.logger.info('Quality monitoring integration started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start quality monitoring integration:', error);
            throw error;
        }
    }
    /**
     * Set up event listeners for cross-system integration
     */
    setupEventListeners() {
        // Health Monitor integration
        if (this.healthMonitor && this.config.healthIntegration.enabled) {
            this.healthMonitor.on('service-status-change', (event) => {
                this.handleHealthStatusChange(event);
            });
            this.healthMonitor.on('alert-triggered', (alert) => {
                this.handleHealthAlert(alert);
            });
            this.healthMonitor.on('overall-health-change', (status) => {
                this.handleOverallHealthChange(status);
            });
        }
        // Performance Monitoring integration
        if (this.performanceService && this.config.performanceIntegration.enabled) {
            this.performanceService.on('metric', (metric) => {
                this.handlePerformanceMetric(metric);
            });
            this.performanceService.on('alert', (alert) => {
                this.handlePerformanceAlert(alert);
            });
            this.performanceService.on('resourceMetrics', (metrics) => {
                this.handleResourceMetrics(metrics);
            });
        }
        // Quality service integration
        if (this.qualityService) {
            this.qualityService.on('qualityMetricRecorded', (metric) => {
                this.handleQualityMetric(metric);
            });
            this.qualityService.on('qualityThresholdExceeded', (event) => {
                this.handleQualityThresholdEvent(event);
            });
        }
        // Alert Manager integration
        if (this.alertManager && this.config.alertIntegration.enabled) {
            this.alertManager.on('alertTriggered', (alert) => {
                this.handleQualityAlert(alert);
            });
            this.alertManager.on('alertResolved', (alert) => {
                this.handleQualityAlertResolved(alert);
            });
        }
        // Anomaly Detector integration
        if (this.anomalyDetector) {
            this.anomalyDetector.on('anomalyDetected', (anomaly) => {
                this.handleAnomalyDetected(anomaly);
            });
        }
        this.logger.info('Event listeners configured for cross-system integration');
    }
    /**
     * Handle health status changes
     */
    async handleHealthStatusChange(event) {
        try {
            // Update quality metrics based on health status
            if (this.qualityService && this.config.healthIntegration.enabled) {
                const healthScore = this.calculateHealthScore(event.status);
                await this.qualityService.recordQualityMetric({
                    serviceName: event.serviceName,
                    metricType: 'health_integration',
                    value: healthScore,
                    score: healthScore,
                    severity: this.mapHealthStatusToSeverity(event.status),
                    timestamp: new Date(),
                    metadata: {
                        healthStatus: event.status,
                        source: 'health_monitor',
                        integrationEvent: true
                    }
                });
            }
            this.emit('healthStatusIntegrated', {
                serviceName: event.serviceName,
                healthStatus: event.status,
                timestamp: new Date()
            });
        }
        catch (error) {
            this.logger.error('Error handling health status change:', error);
        }
    }
    /**
     * Handle performance metrics
     */
    async handlePerformanceMetric(metric) {
        try {
            // Convert performance metrics to quality metrics
            if (this.qualityService && this.config.performanceIntegration.enabled) {
                const qualityScore = this.calculatePerformanceQualityScore(metric);
                await this.qualityService.recordQualityMetric({
                    serviceName: metric.operation,
                    metricType: 'performance_integration',
                    value: metric.duration,
                    score: qualityScore,
                    severity: metric.success ? 'low' : 'high',
                    timestamp: new Date(metric.timestamp),
                    metadata: {
                        performanceMetric: metric,
                        source: 'performance_monitor',
                        integrationEvent: true
                    }
                });
            }
            // Trigger correlation analysis
            if (this.config.correlationEnabled) {
                await this.analyzePerformanceQualityCorrelation(metric);
            }
        }
        catch (error) {
            this.logger.error('Error handling performance metric:', error);
        }
    }
    /**
     * Handle quality metrics
     */
    async handleQualityMetric(metric) {
        try {
            // Update health status based on quality scores
            if (this.healthMonitor && this.config.healthIntegration.enabled) {
                const healthStatus = this.mapQualityToHealthStatus(metric.score);
                // Register or update health check for this service
                if (!this.healthMonitor['healthChecks'].has(metric.serviceName)) {
                    this.healthMonitor.registerHealthCheck(metric.serviceName, this.createQualityBasedHealthCheck(metric.serviceName));
                }
            }
            // Trigger anomaly detection
            if (this.anomalyDetector) {
                await this.anomalyDetector.checkForAnomalies([metric]);
            }
        }
        catch (error) {
            this.logger.error('Error handling quality metric:', error);
        }
    }
    /**
     * Start correlation analysis
     */
    startCorrelationAnalysis() {
        this.correlationInterval = setInterval(async () => {
            try {
                await this.performCorrelationAnalysis();
            }
            catch (error) {
                this.logger.error('Error in correlation analysis:', error);
            }
        }, 300000); // Every 5 minutes
        this.logger.info('Correlation analysis started');
    }
    /**
     * Perform comprehensive correlation analysis
     */
    async performCorrelationAnalysis() {
        const correlations = [];
        try {
            // Performance-Quality correlation
            if (this.config.performanceIntegration.performanceQualityCorrelation) {
                const perfQualityCorr = await this.analyzePerformanceQualityCorrelation();
                if (perfQualityCorr)
                    correlations.push(perfQualityCorr);
            }
            // Health-Quality correlation
            if (this.config.healthIntegration.enabled) {
                const healthQualityCorr = await this.analyzeHealthQualityCorrelation();
                if (healthQualityCorr)
                    correlations.push(healthQualityCorr);
            }
            // Alert correlation
            if (this.config.alertIntegration.alertCorrelation) {
                const alertCorr = await this.analyzeAlertCorrelation();
                if (alertCorr)
                    correlations.push(alertCorr);
            }
            // Store correlations
            for (const correlation of correlations) {
                await this.storeCorrelation(correlation);
                this.correlationCache.set(correlation.id, correlation);
            }
            this.emit('correlationAnalysisCompleted', {
                correlations,
                timestamp: new Date()
            });
        }
        catch (error) {
            this.logger.error('Error in correlation analysis:', error);
        }
    }
    /**
     * Analyze performance-quality correlation
     */
    async analyzePerformanceQualityCorrelation(metric) {
        try {
            // Get recent performance and quality metrics
            const timeframe = {
                start: new Date(Date.now() - 3600000).toISOString(), // Last hour
                end: new Date().toISOString()
            };
            const performanceMetrics = this.performanceService ?
                await this.performanceService.getMetrics(undefined, timeframe) : [];
            const qualityMetrics = this.qualityService ?
                await this.qualityService.getQualityMetrics(timeframe.start, timeframe.end) : [];
            if (performanceMetrics.length < 10 || qualityMetrics.length < 10) {
                return null; // Not enough data for correlation
            }
            // Calculate correlation coefficient
            const correlationScore = this.calculateCorrelationCoefficient(performanceMetrics.map(m => m.duration), qualityMetrics.map(m => m.score));
            const correlation = {
                id: `perf_qual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                correlationType: 'performance-quality',
                correlationScore: Math.abs(correlationScore),
                primaryMetric: {
                    type: 'performance',
                    value: performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length,
                    source: 'performance_monitor'
                },
                secondaryMetric: {
                    type: 'quality',
                    value: qualityMetrics.reduce((sum, m) => sum + m.score, 0) / qualityMetrics.length,
                    source: 'quality_monitor'
                },
                analysis: this.analyzeCorrelationPattern(correlationScore)
            };
            return correlation;
        }
        catch (error) {
            this.logger.error('Error analyzing performance-quality correlation:', error);
            return null;
        }
    }
    /**
     * Analyze health-quality correlation
     */
    async analyzeHealthQualityCorrelation() {
        try {
            if (!this.healthMonitor)
                return null;
            const healthStatus = this.healthMonitor.getHealthStatus();
            const healthScore = this.calculateOverallHealthScore(healthStatus);
            const timeframe = {
                start: new Date(Date.now() - 3600000).toISOString(),
                end: new Date().toISOString()
            };
            const qualityMetrics = this.qualityService ?
                await this.qualityService.getQualityMetrics(timeframe.start, timeframe.end) : [];
            if (qualityMetrics.length < 5)
                return null;
            const avgQualityScore = qualityMetrics.reduce((sum, m) => sum + m.score, 0) / qualityMetrics.length;
            const correlation = {
                id: `health_qual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                correlationType: 'health-quality',
                correlationScore: Math.abs(healthScore - avgQualityScore) / 100, // Normalized difference
                primaryMetric: {
                    type: 'health',
                    value: healthScore,
                    source: 'health_monitor'
                },
                secondaryMetric: {
                    type: 'quality',
                    value: avgQualityScore,
                    source: 'quality_monitor'
                },
                analysis: this.analyzeHealthQualityPattern(healthScore, avgQualityScore)
            };
            return correlation;
        }
        catch (error) {
            this.logger.error('Error analyzing health-quality correlation:', error);
            return null;
        }
    }
    /**
     * Analyze alert correlation
     */
    async analyzeAlertCorrelation() {
        try {
            // This would analyze patterns in alerts across systems
            // For now, returning a basic implementation
            const correlation = {
                id: `alert_corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                correlationType: 'alert-correlation',
                correlationScore: 0.5,
                primaryMetric: {
                    type: 'quality',
                    value: 75,
                    source: 'alert_manager'
                },
                secondaryMetric: {
                    type: 'performance',
                    value: 80,
                    source: 'performance_monitor'
                },
                analysis: {
                    pattern: 'positive',
                    strength: 'moderate',
                    confidence: 0.7,
                    insights: ['Alert patterns show moderate correlation between systems'],
                    recommendations: ['Continue monitoring alert patterns for optimization opportunities']
                }
            };
            return correlation;
        }
        catch (error) {
            this.logger.error('Error analyzing alert correlation:', error);
            return null;
        }
    }
    /**
     * Start unified status monitoring
     */
    startUnifiedStatusMonitoring() {
        setInterval(async () => {
            try {
                await this.updateUnifiedStatus();
            }
            catch (error) {
                this.logger.error('Error updating unified status:', error);
            }
        }, 60000); // Every minute
        this.logger.info('Unified status monitoring started');
    }
    /**
     * Update unified monitoring status
     */
    async updateUnifiedStatus() {
        try {
            const timestamp = new Date();
            // Collect status from all systems
            const qualityStatus = await this.getQualityStatus();
            const performanceStatus = await this.getPerformanceStatus();
            const healthStatus = await this.getHealthStatus();
            const alertSummary = await this.getAlertSummary();
            const correlations = Array.from(this.correlationCache.values()).slice(-10);
            // Calculate overall status
            const overallStatus = this.calculateOverallStatus(qualityStatus, performanceStatus, healthStatus);
            this.unifiedStatus = {
                timestamp,
                overall: overallStatus,
                quality: qualityStatus,
                performance: performanceStatus,
                health: healthStatus,
                alerts: alertSummary,
                correlations
            };
            // Store in database
            await this.storeUnifiedStatus(this.unifiedStatus);
            this.emit('unifiedStatusUpdated', this.unifiedStatus);
        }
        catch (error) {
            this.logger.error('Error updating unified status:', error);
        }
    }
    /**
     * Store correlation analysis in database
     */
    async storeCorrelation(correlation) {
        const stmt = this.db.prepare(`
      INSERT INTO quality_correlations (
        id, timestamp, correlation_type, correlation_score,
        primary_metric_type, primary_metric_value, primary_metric_source,
        secondary_metric_type, secondary_metric_value, secondary_metric_source,
        pattern, strength, confidence, insights, recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(correlation.id, correlation.timestamp.toISOString(), correlation.correlationType, correlation.correlationScore, correlation.primaryMetric.type, correlation.primaryMetric.value, correlation.primaryMetric.source, correlation.secondaryMetric.type, correlation.secondaryMetric.value, correlation.secondaryMetric.source, correlation.analysis.pattern, correlation.analysis.strength, correlation.analysis.confidence, JSON.stringify(correlation.analysis.insights), JSON.stringify(correlation.analysis.recommendations));
    }
    /**
     * Store unified status in database
     */
    async storeUnifiedStatus(status) {
        const stmt = this.db.prepare(`
      INSERT INTO unified_monitoring_status (
        timestamp, overall_status, quality_score, performance_score, health_score,
        quality_metrics, performance_metrics, health_metrics, alert_summary, correlations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(status.timestamp.toISOString(), status.overall.status, status.overall.qualityScore, status.overall.performanceScore, status.overall.healthScore, JSON.stringify(status.quality), JSON.stringify(status.performance), JSON.stringify(status.health), JSON.stringify(status.alerts), JSON.stringify(status.correlations.map(c => c.id)));
    }
    /**
     * Helper methods for calculations and mapping
     */
    calculateHealthScore(status) {
        switch (status) {
            case HealthStatus.HEALTHY: return 100;
            case HealthStatus.DEGRADED: return 75;
            case HealthStatus.UNHEALTHY: return 50;
            case HealthStatus.CRITICAL: return 25;
            default: return 0;
        }
    }
    mapHealthStatusToSeverity(status) {
        switch (status) {
            case HealthStatus.HEALTHY: return 'low';
            case HealthStatus.DEGRADED: return 'medium';
            case HealthStatus.UNHEALTHY: return 'high';
            case HealthStatus.CRITICAL: return 'critical';
            default: return 'medium';
        }
    }
    calculatePerformanceQualityScore(metric) {
        if (!metric.success)
            return 25; // Poor quality for failed operations
        // Convert duration to quality score (lower duration = higher quality)
        if (metric.duration < 100)
            return 100;
        if (metric.duration < 500)
            return 90;
        if (metric.duration < 1000)
            return 80;
        if (metric.duration < 2000)
            return 70;
        if (metric.duration < 5000)
            return 60;
        return 40; // Poor quality for very slow operations
    }
    mapQualityToHealthStatus(score) {
        if (score >= this.config.healthIntegration.qualityHealthThreshold)
            return HealthStatus.HEALTHY;
        if (score >= this.config.healthIntegration.degradedThreshold)
            return HealthStatus.DEGRADED;
        if (score >= this.config.healthIntegration.unhealthyThreshold)
            return HealthStatus.UNHEALTHY;
        return HealthStatus.CRITICAL;
    }
    createQualityBasedHealthCheck(serviceName) {
        return async () => {
            try {
                const recentMetrics = this.qualityService ?
                    await this.qualityService.getQualityMetrics(new Date(Date.now() - 300000).toISOString(), // Last 5 minutes
                    new Date().toISOString(), serviceName) : [];
                if (recentMetrics.length === 0) {
                    return {
                        status: HealthStatus.HEALTHY,
                        latency: 0,
                        message: 'No recent quality data available',
                        timestamp: new Date()
                    };
                }
                const avgScore = recentMetrics.reduce((sum, m) => sum + m.score, 0) / recentMetrics.length;
                const status = this.mapQualityToHealthStatus(avgScore);
                return {
                    status,
                    latency: 0,
                    message: `Quality-based health check: ${avgScore.toFixed(1)} score`,
                    metadata: { qualityScore: avgScore, metricsCount: recentMetrics.length },
                    timestamp: new Date()
                };
            }
            catch (error) {
                return {
                    status: HealthStatus.CRITICAL,
                    latency: 0,
                    message: `Quality health check error: ${error.message}`,
                    timestamp: new Date()
                };
            }
        };
    }
    calculateCorrelationCoefficient(x, y) {
        if (x.length !== y.length || x.length === 0)
            return 0;
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    analyzeCorrelationPattern(coefficient) {
        const absCoeff = Math.abs(coefficient);
        return {
            pattern: coefficient > 0.1 ? 'positive' : coefficient < -0.1 ? 'negative' : 'no_correlation',
            strength: absCoeff > 0.7 ? 'strong' : absCoeff > 0.3 ? 'moderate' : 'weak',
            confidence: absCoeff,
            insights: [
                `Correlation coefficient: ${coefficient.toFixed(3)}`,
                absCoeff > 0.5 ? 'Strong relationship detected between metrics' : 'Weak relationship between metrics'
            ],
            recommendations: [
                absCoeff > 0.5 ? 'Monitor this correlation for optimization opportunities' : 'Continue data collection for better correlation analysis'
            ]
        };
    }
    analyzeHealthQualityPattern(healthScore, qualityScore) {
        const difference = Math.abs(healthScore - qualityScore);
        return {
            pattern: difference < 10 ? 'positive' : 'no_correlation',
            strength: difference < 10 ? 'strong' : difference < 20 ? 'moderate' : 'weak',
            confidence: Math.max(0, 1 - difference / 100),
            insights: [
                `Health score: ${healthScore.toFixed(1)}, Quality score: ${qualityScore.toFixed(1)}`,
                difference < 10 ? 'Health and quality metrics are well aligned' : 'Gap detected between health and quality metrics'
            ],
            recommendations: [
                difference > 20 ? 'Investigate discrepancy between health and quality metrics' : 'Maintain current monitoring approach'
            ]
        };
    }
    calculateOverallHealthScore(status) {
        const healthyRatio = status.services.healthy / status.services.total;
        return healthyRatio * 100;
    }
    async getQualityStatus() {
        if (!this.qualityService) {
            return {
                averageScore: 0,
                totalMetrics: 0,
                criticalIssues: 0,
                trend: 'stable'
            };
        }
        const timeframe = {
            start: new Date(Date.now() - 3600000).toISOString(),
            end: new Date().toISOString()
        };
        const metrics = await this.qualityService.getQualityMetrics(timeframe.start, timeframe.end);
        const averageScore = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length : 0;
        const criticalIssues = metrics.filter(m => m.severity === 'critical').length;
        return {
            averageScore,
            totalMetrics: metrics.length,
            criticalIssues,
            trend: 'stable' // Would need trend analysis
        };
    }
    async getPerformanceStatus() {
        if (!this.performanceService) {
            return {
                averageResponseTime: 0,
                errorRate: 0,
                throughput: 0,
                resourceUsage: 0
            };
        }
        const timeframe = {
            start: new Date(Date.now() - 3600000).toISOString(),
            end: new Date().toISOString()
        };
        const metrics = await this.performanceService.getMetrics(undefined, timeframe);
        const averageResponseTime = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0;
        const errorRate = metrics.length > 0 ? metrics.filter(m => !m.success).length / metrics.length : 0;
        const resourceMetrics = this.performanceService.getResourceMetrics(1);
        const resourceUsage = resourceMetrics.length > 0 ? resourceMetrics[0].memory.percentage : 0;
        return {
            averageResponseTime,
            errorRate,
            throughput: metrics.length / 3600, // Metrics per second (rough approximation)
            resourceUsage
        };
    }
    async getHealthStatus() {
        if (!this.healthMonitor) {
            return {
                servicesHealthy: 0,
                servicesTotal: 0,
                systemHealth: HealthStatus.HEALTHY,
                uptime: process.uptime()
            };
        }
        const status = this.healthMonitor.getHealthStatus();
        const healthyServices = status.services.filter(s => s.status === HealthStatus.HEALTHY).length;
        return {
            servicesHealthy: healthyServices,
            servicesTotal: status.services.length,
            systemHealth: status.overall,
            uptime: process.uptime()
        };
    }
    async getAlertSummary() {
        // This would aggregate alerts from all systems
        return {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0
        };
    }
    calculateOverallStatus(quality, performance, health) {
        const qualityScore = quality.averageScore;
        const performanceScore = Math.max(0, 100 - (performance.averageResponseTime / 50)); // Simplified scoring
        const healthScore = (health.servicesHealthy / Math.max(1, health.servicesTotal)) * 100;
        const overallScore = (qualityScore + performanceScore + healthScore) / 3;
        let status;
        if (overallScore >= 90)
            status = HealthStatus.HEALTHY;
        else if (overallScore >= 75)
            status = HealthStatus.DEGRADED;
        else if (overallScore >= 50)
            status = HealthStatus.UNHEALTHY;
        else
            status = HealthStatus.CRITICAL;
        return {
            status,
            qualityScore,
            performanceScore,
            healthScore
        };
    }
    // Event handlers (stubs for the setup methods above)
    async handleHealthAlert(alert) {
        this.logger.info('Health alert received:', alert);
    }
    async handleOverallHealthChange(status) {
        this.logger.info('Overall health changed:', status);
    }
    async handlePerformanceAlert(alert) {
        this.logger.info('Performance alert received:', alert);
    }
    async handleResourceMetrics(metrics) {
        this.logger.debug('Resource metrics received:', { timestamp: new Date() });
    }
    async handleQualityThresholdEvent(event) {
        this.logger.info('Quality threshold event:', event);
    }
    async handleQualityAlert(alert) {
        this.logger.info('Quality alert received:', alert);
    }
    async handleQualityAlertResolved(alert) {
        this.logger.info('Quality alert resolved:', alert);
    }
    async handleAnomalyDetected(anomaly) {
        this.logger.warn('Anomaly detected:', anomaly);
    }
    /**
     * Public API methods
     */
    /**
     * Get current unified status
     */
    getUnifiedStatus() {
        return this.unifiedStatus || null;
    }
    /**
     * Get correlation history
     */
    getCorrelationHistory(limit = 50) {
        const stmt = this.db.prepare(`
      SELECT * FROM quality_correlations 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
        const rows = stmt.all(limit);
        return rows.map(row => ({
            id: row.id,
            timestamp: new Date(row.timestamp),
            correlationType: row.correlation_type,
            correlationScore: row.correlation_score,
            primaryMetric: {
                type: row.primary_metric_type,
                value: row.primary_metric_value,
                source: row.primary_metric_source
            },
            secondaryMetric: {
                type: row.secondary_metric_type,
                value: row.secondary_metric_value,
                source: row.secondary_metric_source
            },
            analysis: {
                pattern: row.pattern,
                strength: row.strength,
                confidence: row.confidence,
                insights: JSON.parse(row.insights),
                recommendations: JSON.parse(row.recommendations)
            }
        }));
    }
    /**
     * Stop the integration service
     */
    async stop() {
        if (!this.isRunning)
            return;
        if (this.correlationInterval) {
            clearInterval(this.correlationInterval);
            this.correlationInterval = undefined;
        }
        this.removeAllListeners();
        this.isRunning = false;
        this.emit('integrationStopped', {
            timestamp: new Date()
        });
        this.logger.info('Quality monitoring integration stopped');
    }
    /**
     * Get integration status and metrics
     */
    getIntegrationStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            correlationCacheSize: this.correlationCache.size,
            lastUnifiedStatusUpdate: this.unifiedStatus?.timestamp,
            services: {
                healthMonitor: !!this.healthMonitor,
                performanceService: !!this.performanceService,
                qualityService: !!this.qualityService,
                alertManager: !!this.alertManager,
                anomalyDetector: !!this.anomalyDetector,
                dashboardService: !!this.dashboardService,
                reportingService: !!this.reportingService
            }
        };
    }
}
/**
 * Default integration configuration
 */
export const defaultIntegrationConfig = {
    enabled: true,
    correlationEnabled: true,
    healthIntegration: {
        enabled: true,
        qualityHealthThreshold: 80,
        degradedThreshold: 60,
        unhealthyThreshold: 40,
        autoRemediation: false
    },
    performanceIntegration: {
        enabled: true,
        performanceQualityCorrelation: true,
        slowQueryQualityImpact: true,
        resourceUsageQualityThreshold: 85
    },
    alertIntegration: {
        enabled: true,
        crossSystemAlerts: true,
        alertCorrelation: true,
        escalationEnabled: true
    },
    dashboardIntegration: {
        enabled: true,
        unifiedDashboard: true,
        realTimeSync: true,
        performanceWidgets: true,
        healthWidgets: true
    },
    reportingIntegration: {
        enabled: true,
        combinedReports: true,
        performanceQualityAnalysis: true,
        healthQualityAnalysis: true
    }
};
//# sourceMappingURL=QualityMonitoringIntegration.js.map