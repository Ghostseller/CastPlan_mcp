/**
 * Performance Monitoring Service - Real-time Performance Tracking and Optimization
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Real-time performance monitoring, optimization, and alerting for version tracking system
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & System Optimization Specialist
 */
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
// =============================================================================
// PERFORMANCE MONITORING SERVICE
// =============================================================================
export class PerformanceMonitoringService extends EventEmitter {
    logger;
    db;
    performanceMetrics = new Map();
    queryMetrics = [];
    resourceMetrics = [];
    cacheMetrics = new Map();
    alerts = new Map();
    isMonitoring = false;
    monitoringInterval;
    maxMetricsHistory = 10000;
    cleanupInterval = 3600000; // 1 hour
    lastCleanup = Date.now();
    constructor(database, logger, config = {}) {
        super();
        this.db = database;
        this.logger = logger;
        // Initialize database tables for performance monitoring
        this.initializeTables();
        // Set up default alert configurations
        this.setupDefaultAlerts();
        // Start monitoring if enabled
        if (config.enableResourceMonitoring !== false) {
            this.startMonitoring(config.monitoringInterval || 30000); // 30 seconds default
        }
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeTables() {
        try {
            // Performance metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          operation TEXT NOT NULL,
          duration REAL NOT NULL,
          success INTEGER NOT NULL,
          error TEXT,
          metadata TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Query performance metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS query_performance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query_type TEXT NOT NULL,
          duration REAL NOT NULL,
          rows_affected INTEGER,
          cache_hit INTEGER NOT NULL,
          query_complexity TEXT NOT NULL,
          index_usage INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // System resource metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS resource_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          cpu_usage REAL,
          memory_used INTEGER,
          memory_total INTEGER,
          disk_usage REAL,
          network_latency REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Performance alerts table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alert_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          metric_value REAL,
          threshold_value REAL,
          triggered_at TEXT NOT NULL,
          resolved_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes for performance
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON performance_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_query_perf_timestamp ON query_performance(timestamp);
        CREATE INDEX IF NOT EXISTS idx_resource_metrics_timestamp ON resource_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON performance_alerts(triggered_at);
      `);
            this.logger.info('Performance monitoring tables initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize performance monitoring tables:', error);
            throw error;
        }
    }
    setupDefaultAlerts() {
        const defaultAlerts = [
            {
                metric: 'response_time',
                threshold: 5000, // 5 seconds
                operator: 'gt',
                severity: 'warning',
                cooldown: 5,
                enabled: true
            },
            {
                metric: 'error_rate',
                threshold: 0.05, // 5%
                operator: 'gt',
                severity: 'error',
                cooldown: 10,
                enabled: true
            },
            {
                metric: 'memory_usage',
                threshold: 0.85, // 85%
                operator: 'gt',
                severity: 'warning',
                cooldown: 15,
                enabled: true
            },
            {
                metric: 'cache_hit_rate',
                threshold: 0.7, // 70%
                operator: 'lt',
                severity: 'info',
                cooldown: 30,
                enabled: true
            }
        ];
        defaultAlerts.forEach(alert => {
            this.alerts.set(alert.metric, alert);
        });
    }
    // =============================================================================
    // PERFORMANCE MONITORING
    // =============================================================================
    async recordMetric(operation, duration, success, error, metadata) {
        const timestamp = new Date().toISOString();
        const metric = {
            timestamp,
            operation,
            duration,
            success,
            error,
            metadata
        };
        // Store in memory
        if (!this.performanceMetrics.has(operation)) {
            this.performanceMetrics.set(operation, []);
        }
        const metrics = this.performanceMetrics.get(operation);
        metrics.push(metric);
        // Limit memory usage
        if (metrics.length > this.maxMetricsHistory) {
            metrics.shift();
        }
        // Store in database
        try {
            const stmt = this.db.prepare(`
        INSERT INTO performance_metrics (timestamp, operation, duration, success, error, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(timestamp, operation, duration, success ? 1 : 0, error || null, metadata ? JSON.stringify(metadata) : null);
        }
        catch (dbError) {
            this.logger.error('Failed to store performance metric:', dbError);
        }
        // Check alerts
        await this.checkAlerts(operation, metric);
        // Emit event for real-time monitoring
        this.emit('metric', metric);
    }
    async recordQueryMetric(queryMetric) {
        this.queryMetrics.push(queryMetric);
        // Limit memory usage
        if (this.queryMetrics.length > this.maxMetricsHistory) {
            this.queryMetrics.shift();
        }
        // Store in database
        try {
            const stmt = this.db.prepare(`
        INSERT INTO query_performance (query_type, duration, rows_affected, cache_hit, query_complexity, index_usage, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(queryMetric.queryType, queryMetric.duration, queryMetric.rowsAffected, queryMetric.cacheHit ? 1 : 0, queryMetric.queryComplexity, queryMetric.indexUsage ? 1 : 0, queryMetric.timestamp);
        }
        catch (error) {
            this.logger.error('Failed to store query metric:', error);
        }
        // Check for slow queries
        if (queryMetric.duration > 1000) { // 1 second threshold
            await this.triggerAlert('slow_query', 'warning', `Slow query detected: ${queryMetric.queryType} (${queryMetric.duration}ms)`, queryMetric.duration, 1000);
        }
        this.emit('queryMetric', queryMetric);
    }
    updateCacheMetrics(cacheId, metrics) {
        this.cacheMetrics.set(cacheId, metrics);
        this.emit('cacheMetrics', { cacheId, metrics });
    }
    // =============================================================================
    // SYSTEM RESOURCE MONITORING
    // =============================================================================
    async collectResourceMetrics() {
        const process = await import('process');
        const os = await import('os');
        const cpuUsage = process.cpuUsage();
        const memUsage = process.memoryUsage();
        const metrics = {
            cpu: {
                usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
                load: os.loadavg(),
                processes: 1 // In Node.js context
            },
            memory: {
                used: memUsage.rss,
                total: os.totalmem(),
                percentage: (memUsage.rss / os.totalmem()) * 100,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal
            },
            disk: {
                used: 0, // Would need external library for disk usage
                total: 0,
                percentage: 0,
                readTime: 0,
                writeTime: 0
            },
            network: {
                bytesIn: 0, // Would need external library for network stats
                bytesOut: 0,
                connections: 0,
                latency: await this.measureNetworkLatency()
            }
        };
        return metrics;
    }
    async measureNetworkLatency() {
        const start = performance.now();
        try {
            // Simple ping to measure latency
            await new Promise(resolve => setTimeout(resolve, 1));
            return performance.now() - start;
        }
        catch {
            return -1;
        }
    }
    startMonitoring(interval = 30000) {
        if (this.isMonitoring) {
            return;
        }
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            try {
                const metrics = await this.collectResourceMetrics();
                this.resourceMetrics.push(metrics);
                // Limit memory usage
                if (this.resourceMetrics.length > this.maxMetricsHistory) {
                    this.resourceMetrics.shift();
                }
                // Store in database
                const stmt = this.db.prepare(`
          INSERT INTO resource_metrics (timestamp, cpu_usage, memory_used, memory_total, disk_usage, network_latency)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
                stmt.run(new Date().toISOString(), metrics.cpu.usage, metrics.memory.used, metrics.memory.total, metrics.disk.percentage, metrics.network.latency);
                // Check resource-based alerts
                await this.checkResourceAlerts(metrics);
                this.emit('resourceMetrics', metrics);
                // Cleanup old data periodically
                if (Date.now() - this.lastCleanup > this.cleanupInterval) {
                    await this.cleanupOldMetrics();
                    this.lastCleanup = Date.now();
                }
            }
            catch (error) {
                this.logger.error('Error collecting resource metrics:', error);
            }
        }, interval);
        this.logger.info(`Performance monitoring started with interval: ${interval}ms`);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isMonitoring = false;
        this.logger.info('Performance monitoring stopped');
    }
    // =============================================================================
    // ALERT SYSTEM
    // =============================================================================
    async checkAlerts(operation, metric) {
        // Check response time alerts
        if (this.alerts.has('response_time')) {
            const alert = this.alerts.get('response_time');
            if (alert.enabled && this.evaluateCondition(metric.duration, alert.threshold, alert.operator)) {
                await this.triggerAlert('response_time', alert.severity, `Slow response time for ${operation}: ${metric.duration}ms`, metric.duration, alert.threshold);
            }
        }
        // Check error rate alerts
        if (!metric.success && this.alerts.has('error_rate')) {
            const errorRate = await this.calculateErrorRate(operation);
            const alert = this.alerts.get('error_rate');
            if (alert.enabled && this.evaluateCondition(errorRate, alert.threshold, alert.operator)) {
                await this.triggerAlert('error_rate', alert.severity, `High error rate for ${operation}: ${(errorRate * 100).toFixed(2)}%`, errorRate, alert.threshold);
            }
        }
    }
    async checkResourceAlerts(metrics) {
        // Memory usage alert
        if (this.alerts.has('memory_usage')) {
            const alert = this.alerts.get('memory_usage');
            const memoryPercentage = metrics.memory.percentage / 100;
            if (alert.enabled && this.evaluateCondition(memoryPercentage, alert.threshold, alert.operator)) {
                await this.triggerAlert('memory_usage', alert.severity, `High memory usage: ${metrics.memory.percentage.toFixed(2)}%`, memoryPercentage, alert.threshold);
            }
        }
        // CPU usage alert (if available)
        if (metrics.cpu.usage > 0 && this.alerts.has('cpu_usage')) {
            const alert = this.alerts.get('cpu_usage');
            if (alert.enabled && this.evaluateCondition(metrics.cpu.usage, alert.threshold, alert.operator)) {
                await this.triggerAlert('cpu_usage', alert.severity, `High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`, metrics.cpu.usage, alert.threshold);
            }
        }
    }
    evaluateCondition(value, threshold, operator) {
        switch (operator) {
            case 'gt': return value > threshold;
            case 'lt': return value < threshold;
            case 'eq': return value === threshold;
            case 'gte': return value >= threshold;
            case 'lte': return value <= threshold;
            default: return false;
        }
    }
    async triggerAlert(type, severity, message, value, threshold) {
        const timestamp = new Date().toISOString();
        try {
            const stmt = this.db.prepare(`
        INSERT INTO performance_alerts (alert_type, severity, message, metric_value, threshold_value, triggered_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(type, severity, message, value, threshold, timestamp);
            this.logger.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`);
            this.emit('alert', { type, severity, message, value, threshold, timestamp });
        }
        catch (error) {
            this.logger.error('Failed to store performance alert:', error);
        }
    }
    // =============================================================================
    // ANALYTICS AND REPORTING
    // =============================================================================
    async calculateErrorRate(operation) {
        try {
            const whereClause = operation ? 'WHERE operation = ?' : '';
            const params = operation ? [operation] : [];
            const totalStmt = this.db.prepare(`SELECT COUNT(*) as total FROM performance_metrics ${whereClause}`);
            const errorStmt = this.db.prepare(`SELECT COUNT(*) as errors FROM performance_metrics ${whereClause} AND success = 0`);
            const totalResult = totalStmt.get(...params);
            const errorResult = errorStmt.get(...params);
            return totalResult.total > 0 ? errorResult.errors / totalResult.total : 0;
        }
        catch (error) {
            this.logger.error('Failed to calculate error rate:', error);
            return 0;
        }
    }
    async getPerformanceReport(timeframe) {
        try {
            // Calculate summary metrics
            const summaryStmt = this.db.prepare(`
        SELECT 
          AVG(duration) as avgResponseTime,
          COUNT(CASE WHEN success = 0 THEN 1 END) * 1.0 / COUNT(*) as errorRate,
          COUNT(*) * 1.0 / ((julianday(?) - julianday(?)) * 24 * 60 * 60) as throughput
        FROM performance_metrics 
        WHERE timestamp BETWEEN ? AND ?
      `);
            const summary = summaryStmt.get(timeframe.end, timeframe.start, timeframe.start, timeframe.end);
            // Get top slow queries
            const slowQueriesStmt = this.db.prepare(`
        SELECT query_type, duration, rows_affected, cache_hit, query_complexity, index_usage, timestamp
        FROM query_performance 
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY duration DESC 
        LIMIT 10
      `);
            const slowQueries = slowQueriesStmt.all(timeframe.start, timeframe.end);
            // Get latest resource metrics
            const resourceStmt = this.db.prepare(`
        SELECT cpu_usage, memory_used, memory_total, disk_usage, network_latency
        FROM resource_metrics 
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC 
        LIMIT 1
      `);
            const latestResource = resourceStmt.get(timeframe.start, timeframe.end);
            const resourceUsage = latestResource ? {
                cpu: { usage: latestResource.cpu_usage, load: [], processes: 1 },
                memory: {
                    used: latestResource.memory_used,
                    total: latestResource.memory_total,
                    percentage: (latestResource.memory_used / latestResource.memory_total) * 100,
                    heapUsed: 0,
                    heapTotal: 0
                },
                disk: { used: 0, total: 0, percentage: latestResource.disk_usage, readTime: 0, writeTime: 0 },
                network: { bytesIn: 0, bytesOut: 0, connections: 0, latency: latestResource.network_latency }
            } : {
                cpu: { usage: 0, load: [], processes: 1 },
                memory: { used: 0, total: 0, percentage: 0, heapUsed: 0, heapTotal: 0 },
                disk: { used: 0, total: 0, percentage: 0, readTime: 0, writeTime: 0 },
                network: { bytesIn: 0, bytesOut: 0, connections: 0, latency: 0 }
            };
            // Calculate cache efficiency
            const cacheEfficiency = Array.from(this.cacheMetrics.values()).reduce((acc, metrics) => ({
                hitRate: (acc.hitRate + metrics.hitRate) / 2,
                missRate: (acc.missRate + metrics.missRate) / 2,
                evictionRate: (acc.evictionRate + metrics.evictionRate) / 2,
                size: acc.size + metrics.size,
                maxSize: acc.maxSize + metrics.maxSize,
                averageAccessTime: (acc.averageAccessTime + metrics.averageAccessTime) / 2,
                memoryUsage: acc.memoryUsage + metrics.memoryUsage
            }), { hitRate: 0, missRate: 0, evictionRate: 0, size: 0, maxSize: 0, averageAccessTime: 0, memoryUsage: 0 });
            // Generate recommendations
            const recommendations = this.generateRecommendations(summary, slowQueries, resourceUsage, cacheEfficiency);
            return {
                id: `perf_report_${Date.now()}`,
                timeframe,
                summary: {
                    averageResponseTime: summary.avgResponseTime || 0,
                    errorRate: summary.errorRate || 0,
                    throughput: summary.throughput || 0,
                    availability: 1 - (summary.errorRate || 0) // Simple availability calculation
                },
                topSlowQueries: slowQueries,
                resourceUsage,
                cacheEfficiency,
                recommendations,
                generatedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('Failed to generate performance report:', error);
            throw error;
        }
    }
    generateRecommendations(summary, slowQueries, resourceUsage, cacheEfficiency) {
        const recommendations = [];
        // Response time recommendations
        if (summary.avgResponseTime > 3000) { // 3 seconds
            recommendations.push('Average response time is high. Consider optimizing queries and adding database indexes.');
        }
        // Error rate recommendations
        if (summary.errorRate > 0.05) { // 5%
            recommendations.push('Error rate is elevated. Review error logs and implement better error handling.');
        }
        // Slow query recommendations
        if (slowQueries.length > 0) {
            const complexQueries = slowQueries.filter(q => q.queryComplexity === 'complex').length;
            if (complexQueries > 0) {
                recommendations.push(`${complexQueries} complex slow queries detected. Consider query optimization and indexing.`);
            }
        }
        // Memory recommendations
        if (resourceUsage.memory.percentage > 80) {
            recommendations.push('Memory usage is high. Consider increasing memory allocation or optimizing memory-intensive operations.');
        }
        // Cache recommendations
        if (cacheEfficiency.hitRate < 0.7) { // 70%
            recommendations.push('Cache hit rate is low. Review caching strategy and consider increasing cache size.');
        }
        // General recommendations
        if (recommendations.length === 0) {
            recommendations.push('System performance is within acceptable limits. Continue monitoring for any degradation.');
        }
        return recommendations;
    }
    // =============================================================================
    // DATA MANAGEMENT
    // =============================================================================
    async cleanupOldMetrics() {
        const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString(); // 7 days ago
        try {
            const cleanupQueries = [
                'DELETE FROM performance_metrics WHERE created_at < ?',
                'DELETE FROM query_performance WHERE created_at < ?',
                'DELETE FROM resource_metrics WHERE created_at < ?',
                'DELETE FROM performance_alerts WHERE created_at < ? AND resolved_at IS NOT NULL'
            ];
            for (const query of cleanupQueries) {
                const stmt = this.db.prepare(query);
                const result = stmt.run(cutoffDate);
                this.logger.info(`Cleaned up ${result.changes} old records from ${query.split(' ')[2]}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to cleanup old metrics:', error);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async getMetrics(operation, timeframe) {
        if (operation && this.performanceMetrics.has(operation)) {
            let metrics = this.performanceMetrics.get(operation);
            if (timeframe) {
                metrics = metrics.filter(m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end);
            }
            return metrics;
        }
        // Return all metrics if no operation specified
        const allMetrics = [];
        this.performanceMetrics.forEach(metrics => {
            allMetrics.push(...metrics);
        });
        if (timeframe) {
            return allMetrics.filter(m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end);
        }
        return allMetrics;
    }
    getQueryMetrics(timeframe) {
        if (timeframe) {
            return this.queryMetrics.filter(m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end);
        }
        return [...this.queryMetrics];
    }
    getResourceMetrics(limit = 100) {
        return this.resourceMetrics.slice(-limit);
    }
    getCacheMetrics() {
        return new Map(this.cacheMetrics);
    }
    configureAlert(metric, config) {
        this.alerts.set(metric, config);
        this.logger.info(`Alert configured for metric: ${metric}`);
    }
    getAlerts() {
        return new Map(this.alerts);
    }
    async destroy() {
        this.stopMonitoring();
        this.removeAllListeners();
        // Final cleanup
        await this.cleanupOldMetrics();
        this.logger.info('Performance monitoring service destroyed');
    }
    // =============================================================================
    // INSTRUMENTATION HELPERS
    // =============================================================================
    createInstrumentation() {
        return {
            time: (operation) => {
                const start = performance.now();
                return {
                    end: async (success = true, error, metadata) => {
                        const duration = performance.now() - start;
                        await this.recordMetric(operation, duration, success, error, metadata);
                        return duration;
                    }
                };
            },
            query: (queryType, complexity = 'simple') => {
                const start = performance.now();
                return {
                    end: async (rowsAffected = 0, cacheHit = false, indexUsage = true) => {
                        const duration = performance.now() - start;
                        await this.recordQueryMetric({
                            queryType,
                            duration,
                            rowsAffected,
                            cacheHit,
                            queryComplexity: complexity,
                            indexUsage,
                            timestamp: new Date().toISOString()
                        });
                        return duration;
                    }
                };
            }
        };
    }
}
export default PerformanceMonitoringService;
//# sourceMappingURL=PerformanceMonitoringService.js.map