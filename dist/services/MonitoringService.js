/**
 * Monitoring Service - Comprehensive System Resource Monitoring
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 시스템 리소스, 애플리케이션 메트릭, 서비스 상태 모니터링
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & Backend Architect
 */
import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import { performance } from 'perf_hooks';
import { getErrorMessage } from '../utils/typeHelpers.js';
// =============================================================================
// MONITORING SERVICE
// =============================================================================
export class MonitoringService extends EventEmitter {
    logger;
    cacheService;
    config;
    isRunning = false;
    collectors = new Map();
    // Metric storage keys
    METRICS_PREFIX = 'monitoring:';
    SYSTEM_METRICS_KEY = 'system';
    APP_METRICS_KEY = 'application';
    SERVICE_METRICS_KEY = 'service';
    CUSTOM_METRICS_KEY = 'custom';
    ALERTS_KEY = 'alerts';
    // Performance tracking
    requestCount = 0;
    errorCount = 0;
    responseTimes = [];
    startTime = Date.now();
    // Cache metrics
    cacheStats = {
        hits: 0,
        misses: 0,
        operations: 0
    };
    // Service counters
    serviceCounters = {
        documentsProcessed: 0,
        analysisCompleted: 0,
        hooksTriggered: 0,
        bmadTasksCompleted: 0,
        errorRecoveryAttempts: 0,
        degradationEvents: 0
    };
    constructor(logger, cacheService, config = {}) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.config = {
            enabled: true,
            collectionInterval: 10000, // 10 seconds
            retentionPeriod: 7, // 7 days
            aggregationIntervals: [1, 5, 15, 60, 1440], // 1min, 5min, 15min, 1hour, 1day
            thresholds: {
                cpu: 80, // 80%
                memory: 85, // 85%
                disk: 90, // 90%
                errorRate: 5, // 5%
                responseTime: 2000 // 2 seconds
            },
            alerts: {
                enabled: true,
                channels: ['console', 'redis']
            },
            ...config
        };
        this.setupEventHandlers();
    }
    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================
    /**
     * Start monitoring service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('MonitoringService is already running');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('MonitoringService is disabled');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting MonitoringService...');
        // Start metric collectors
        this.startSystemMetricsCollection();
        this.startApplicationMetricsCollection();
        this.startServiceMetricsCollection();
        this.startCustomMetricsCollection();
        // Start metric aggregation
        this.startMetricAggregation();
        // Start cleanup task
        this.startMetricsCleanup();
        this.emit('started');
        this.logger.info('✅ MonitoringService started successfully');
    }
    /**
     * Stop monitoring service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping MonitoringService...');
        // Stop all collectors
        for (const [name, timer] of this.collectors) {
            clearInterval(timer);
            this.collectors.delete(name);
        }
        this.emit('stopped');
        this.logger.info('✅ MonitoringService stopped');
    }
    // =============================================================================
    // METRIC COLLECTION
    // =============================================================================
    /**
     * Start system metrics collection
     */
    startSystemMetricsCollection() {
        const collectSystemMetrics = async () => {
            if (!this.isRunning)
                return;
            try {
                const metrics = await this.collectSystemMetrics();
                await this.storeMetrics(this.SYSTEM_METRICS_KEY, metrics);
                await this.checkThresholds('system', metrics);
                this.emit('systemMetrics', metrics);
            }
            catch (error) {
                this.logger.error('Failed to collect system metrics:', getErrorMessage(error));
            }
        };
        const timer = setInterval(collectSystemMetrics, this.config.collectionInterval);
        this.collectors.set('system', timer);
        // Collect immediately
        collectSystemMetrics();
    }
    /**
     * Start application metrics collection
     */
    startApplicationMetricsCollection() {
        const collectAppMetrics = async () => {
            if (!this.isRunning)
                return;
            try {
                const metrics = await this.collectApplicationMetrics();
                await this.storeMetrics(this.APP_METRICS_KEY, metrics);
                await this.checkThresholds('application', metrics);
                this.emit('applicationMetrics', metrics);
            }
            catch (error) {
                this.logger.error('Failed to collect application metrics:', getErrorMessage(error));
            }
        };
        const timer = setInterval(collectAppMetrics, this.config.collectionInterval);
        this.collectors.set('application', timer);
        // Collect immediately
        collectAppMetrics();
    }
    /**
     * Start service metrics collection
     */
    startServiceMetricsCollection() {
        const collectServiceMetrics = async () => {
            if (!this.isRunning)
                return;
            try {
                const metrics = await this.collectServiceMetrics();
                await this.storeMetrics(this.SERVICE_METRICS_KEY, metrics);
                await this.checkThresholds('service', metrics);
                this.emit('serviceMetrics', metrics);
            }
            catch (error) {
                this.logger.error('Failed to collect service metrics:', getErrorMessage(error));
            }
        };
        const timer = setInterval(collectServiceMetrics, this.config.collectionInterval * 2); // Less frequent
        this.collectors.set('service', timer);
        // Collect immediately
        collectServiceMetrics();
    }
    /**
     * Start custom metrics collection
     */
    startCustomMetricsCollection() {
        const collectCustomMetrics = async () => {
            if (!this.isRunning)
                return;
            try {
                const metrics = await this.collectCustomMetrics();
                await this.storeMetrics(this.CUSTOM_METRICS_KEY, metrics);
                this.emit('customMetrics', metrics);
            }
            catch (error) {
                this.logger.error('Failed to collect custom metrics:', getErrorMessage(error));
            }
        };
        const timer = setInterval(collectCustomMetrics, this.config.collectionInterval);
        this.collectors.set('custom', timer);
        // Collect immediately
        collectCustomMetrics();
    }
    // =============================================================================
    // METRIC COLLECTORS
    // =============================================================================
    /**
     * Collect system metrics
     */
    async collectSystemMetrics() {
        const cpus = os.cpus();
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return {
            timestamp: new Date().toISOString(),
            cpu: {
                usage: await this.getCpuUsage(),
                loadAverage: os.loadavg(),
                cores: cpus.length
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usage: (usedMem / totalMem) * 100,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external
            },
            disk: {
                usage: 0 // Would need platform-specific implementation
            },
            network: {
                bytesReceived: 0, // Would need platform-specific implementation
                bytesSent: 0,
                packetsReceived: 0,
                packetsSent: 0
            },
            process: {
                uptime: process.uptime(),
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
    }
    /**
     * Collect application metrics
     */
    async collectApplicationMetrics() {
        const currentTime = Date.now();
        const uptime = (currentTime - this.startTime) / 1000;
        const requestRate = this.requestCount / uptime;
        const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
        // Calculate response time percentiles
        const sortedTimes = this.responseTimes.slice().sort((a, b) => a - b);
        const p50 = this.getPercentile(sortedTimes, 50);
        const p95 = this.getPercentile(sortedTimes, 95);
        const p99 = this.getPercentile(sortedTimes, 99);
        const avgTime = sortedTimes.length > 0 ?
            sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0;
        return {
            timestamp: new Date().toISOString(),
            requests: {
                total: this.requestCount,
                rate: requestRate,
                errors: this.errorCount,
                errorRate: errorRate
            },
            response: {
                averageTime: avgTime,
                p50: p50,
                p95: p95,
                p99: p99
            },
            concurrent: {
                connections: 0, // Would need to track active connections
                activeRequests: 0 // Would need to track active requests
            },
            cache: {
                hitRate: this.cacheStats.operations > 0 ?
                    (this.cacheStats.hits / this.cacheStats.operations) * 100 : 0,
                missRate: this.cacheStats.operations > 0 ?
                    (this.cacheStats.misses / this.cacheStats.operations) * 100 : 0,
                size: 0, // Would need cache size tracking
                memory: 0 // Would need cache memory tracking
            }
        };
    }
    /**
     * Collect service metrics
     */
    async collectServiceMetrics() {
        return {
            timestamp: new Date().toISOString(),
            database: {
                connections: 0, // Would integrate with database service
                activeConnections: 0,
                queries: 0,
                queryTime: 0,
                errors: 0
            },
            redis: {
                connections: 1, // Single Redis connection
                memory: 0, // Would query Redis INFO
                operations: this.cacheStats.operations,
                hitRate: this.cacheStats.operations > 0 ?
                    (this.cacheStats.hits / this.cacheStats.operations) * 100 : 0,
                errors: 0
            },
            aiService: {
                requests: 0, // Would integrate with AI service
                averageTime: 0,
                errors: 0,
                tokenUsage: 0,
                costEstimate: 0
            },
            taskQueue: {
                pending: 0, // Would integrate with AsyncTaskManager
                running: 0,
                completed: 0,
                failed: 0,
                throughput: 0
            }
        };
    }
    /**
     * Collect custom business metrics
     */
    async collectCustomMetrics() {
        const peakMemory = Math.max(...(this.responseTimes.length > 0 ?
            [process.memoryUsage().heapUsed] : [0]));
        return {
            timestamp: new Date().toISOString(),
            business: {
                documentsProcessed: this.serviceCounters.documentsProcessed,
                analysisCompleted: this.serviceCounters.analysisCompleted,
                hooksTriggered: this.serviceCounters.hooksTriggered,
                bmadTasksCompleted: this.serviceCounters.bmadTasksCompleted
            },
            performance: {
                avgProcessingTime: this.responseTimes.length > 0 ?
                    this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0,
                peakMemoryUsage: peakMemory,
                errorRecoveryAttempts: this.serviceCounters.errorRecoveryAttempts,
                degradationEvents: this.serviceCounters.degradationEvents
            }
        };
    }
    // =============================================================================
    // METRIC STORAGE AND AGGREGATION
    // =============================================================================
    /**
     * Store metrics in Redis
     */
    async storeMetrics(type, metrics) {
        try {
            const key = `${this.METRICS_PREFIX}${type}:${Date.now()}`;
            await this.cacheService.set(key, metrics, {
                ttl: this.config.retentionPeriod * 24 * 60 * 60 // days to seconds
            });
            // Also store in time-series format for easy querying
            const timeSeriesKey = `${this.METRICS_PREFIX}${type}:timeseries`;
            const timeSeriesData = await this.cacheService.get(timeSeriesKey) || [];
            timeSeriesData.push(metrics);
            // Keep only recent data to prevent memory bloat
            const maxEntries = Math.floor((this.config.retentionPeriod * 24 * 60 * 60) / (this.config.collectionInterval / 1000));
            if (timeSeriesData.length > maxEntries) {
                timeSeriesData.splice(0, timeSeriesData.length - maxEntries);
            }
            await this.cacheService.set(timeSeriesKey, timeSeriesData, {
                ttl: this.config.retentionPeriod * 24 * 60 * 60
            });
        }
        catch (error) {
            this.logger.error(`Failed to store ${type} metrics:`, getErrorMessage(error));
        }
    }
    /**
     * Start metric aggregation for different time intervals
     */
    startMetricAggregation() {
        for (const interval of this.config.aggregationIntervals) {
            const aggregateMetrics = async () => {
                if (!this.isRunning)
                    return;
                try {
                    await this.aggregateMetricsForInterval(interval);
                }
                catch (error) {
                    this.logger.error(`Failed to aggregate metrics for ${interval}min interval:`, getErrorMessage(error));
                }
            };
            const timer = setInterval(aggregateMetrics, interval * 60 * 1000); // Convert to milliseconds
            this.collectors.set(`aggregation-${interval}`, timer);
        }
    }
    /**
     * Aggregate metrics for a specific time interval
     */
    async aggregateMetricsForInterval(intervalMinutes) {
        const now = Date.now();
        const intervalMs = intervalMinutes * 60 * 1000;
        const startTime = now - intervalMs;
        for (const metricType of [this.SYSTEM_METRICS_KEY, this.APP_METRICS_KEY, this.SERVICE_METRICS_KEY, this.CUSTOM_METRICS_KEY]) {
            try {
                const timeSeriesKey = `${this.METRICS_PREFIX}${metricType}:timeseries`;
                const metrics = await this.cacheService.get(timeSeriesKey) || [];
                // Filter metrics within the interval
                const intervalMetrics = metrics.filter(m => new Date(m.timestamp).getTime() >= startTime);
                if (intervalMetrics.length === 0)
                    continue;
                // Calculate aggregated values
                const aggregated = this.calculateAggregatedMetrics(intervalMetrics, metricType);
                // Store aggregated metrics
                const aggregatedKey = `${this.METRICS_PREFIX}${metricType}:agg:${intervalMinutes}m:${Math.floor(now / intervalMs)}`;
                await this.cacheService.set(aggregatedKey, aggregated, {
                    ttl: this.config.retentionPeriod * 24 * 60 * 60
                });
            }
            catch (error) {
                this.logger.error(`Failed to aggregate ${metricType} metrics for ${intervalMinutes}min:`, getErrorMessage(error));
            }
        }
    }
    /**
     * Calculate aggregated metrics
     */
    calculateAggregatedMetrics(metrics, type) {
        if (metrics.length === 0)
            return null;
        const first = metrics[0];
        const aggregated = {
            timestamp: new Date().toISOString(),
            interval: `${metrics.length} samples`,
            startTime: metrics[0].timestamp,
            endTime: metrics[metrics.length - 1].timestamp
        };
        // Aggregate based on metric type
        if (type === this.SYSTEM_METRICS_KEY) {
            aggregated.cpu = {
                avgUsage: this.average(metrics.map(m => m.cpu.usage)),
                maxUsage: Math.max(...metrics.map(m => m.cpu.usage)),
                avgLoadAverage: this.average(metrics.map(m => m.cpu.loadAverage[0]))
            };
            aggregated.memory = {
                avgUsage: this.average(metrics.map(m => m.memory.usage)),
                maxUsage: Math.max(...metrics.map(m => m.memory.usage)),
                avgHeapUsed: this.average(metrics.map(m => m.memory.heapUsed))
            };
        }
        else if (type === this.APP_METRICS_KEY) {
            aggregated.requests = {
                totalRequests: metrics.reduce((sum, m) => sum + m.requests.total, 0),
                avgRate: this.average(metrics.map(m => m.requests.rate)),
                totalErrors: metrics.reduce((sum, m) => sum + m.requests.errors, 0),
                avgErrorRate: this.average(metrics.map(m => m.requests.errorRate))
            };
            aggregated.response = {
                avgTime: this.average(metrics.map(m => m.response.averageTime)),
                avgP95: this.average(metrics.map(m => m.response.p95)),
                maxTime: Math.max(...metrics.map(m => m.response.p99))
            };
        }
        return aggregated;
    }
    /**
     * Start metrics cleanup task
     */
    startMetricsCleanup() {
        const cleanup = async () => {
            if (!this.isRunning)
                return;
            try {
                await this.cleanupOldMetrics();
            }
            catch (error) {
                this.logger.error('Failed to cleanup old metrics:', getErrorMessage(error));
            }
        };
        // Run cleanup every hour
        const timer = setInterval(cleanup, 60 * 60 * 1000);
        this.collectors.set('cleanup', timer);
    }
    /**
     * Cleanup old metrics beyond retention period
     */
    async cleanupOldMetrics() {
        const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
        // This is a simplified cleanup - in production you'd use Redis SCAN
        // for better performance with large datasets
        this.logger.debug(`Cleaning up metrics older than ${new Date(cutoffTime).toISOString()}`);
    }
    // =============================================================================
    // THRESHOLD CHECKING AND ALERTING
    // =============================================================================
    /**
     * Check metrics against thresholds and generate alerts
     */
    async checkThresholds(type, metrics) {
        if (!this.config.alerts.enabled)
            return;
        const alerts = [];
        if (type === 'system') {
            if (metrics.cpu.usage > this.config.thresholds.cpu) {
                alerts.push(this.createAlert('cpu-threshold', 'high', 'cpu.usage', metrics.cpu.usage, this.config.thresholds.cpu, `CPU usage is ${metrics.cpu.usage.toFixed(1)}%`));
            }
            if (metrics.memory.usage > this.config.thresholds.memory) {
                alerts.push(this.createAlert('memory-threshold', 'high', 'memory.usage', metrics.memory.usage, this.config.thresholds.memory, `Memory usage is ${metrics.memory.usage.toFixed(1)}%`));
            }
        }
        else if (type === 'application') {
            if (metrics.requests.errorRate > this.config.thresholds.errorRate) {
                alerts.push(this.createAlert('error-rate-threshold', 'high', 'requests.errorRate', metrics.requests.errorRate, this.config.thresholds.errorRate, `Error rate is ${metrics.requests.errorRate.toFixed(1)}%`));
            }
            if (metrics.response.p95 > this.config.thresholds.responseTime) {
                alerts.push(this.createAlert('response-time-threshold', 'medium', 'response.p95', metrics.response.p95, this.config.thresholds.responseTime, `P95 response time is ${metrics.response.p95.toFixed(0)}ms`));
            }
        }
        // Process alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
    }
    /**
     * Create an alert
     */
    createAlert(type, severity, metric, value, threshold, message) {
        return {
            id: `${type}-${Date.now()}`,
            type: 'threshold',
            severity,
            metric,
            value,
            threshold,
            message,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
    }
    /**
     * Process and dispatch alerts
     */
    async processAlert(alert) {
        try {
            // Store alert in Redis
            await this.cacheService.set(`${this.METRICS_PREFIX}${this.ALERTS_KEY}:${alert.id}`, alert, {
                ttl: 24 * 60 * 60 // 24 hours
            });
            // Dispatch alert through configured channels
            for (const channel of this.config.alerts.channels) {
                await this.dispatchAlert(alert, channel);
            }
            this.emit('alert', alert);
            this.logger.warn(`Alert generated: ${alert.message}`, { alert });
        }
        catch (error) {
            this.logger.error('Failed to process alert:', getErrorMessage(error));
        }
    }
    /**
     * Dispatch alert through specific channel
     */
    async dispatchAlert(alert, channel) {
        switch (channel) {
            case 'console':
                console.warn(`🚨 [${alert.severity.toUpperCase()}] ${alert.message}`);
                break;
            case 'redis':
                // Already stored in Redis
                break;
            case 'webhook':
                if (this.config.alerts.webhookUrl) {
                    // Would implement webhook dispatch here
                    this.logger.info(`Webhook alert: ${alert.message}`);
                }
                break;
        }
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    /**
     * Record a request
     */
    recordRequest(responseTime, isError = false) {
        this.requestCount++;
        if (isError) {
            this.errorCount++;
        }
        this.responseTimes.push(responseTime);
        // Keep only recent response times to prevent memory bloat
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
    }
    /**
     * Record cache operation
     */
    recordCacheOperation(hit) {
        this.cacheStats.operations++;
        if (hit) {
            this.cacheStats.hits++;
        }
        else {
            this.cacheStats.misses++;
        }
    }
    /**
     * Increment service counter
     */
    incrementCounter(counterName) {
        if (counterName in this.serviceCounters) {
            this.serviceCounters[counterName]++;
        }
    }
    /**
     * Get current metrics
     */
    async getCurrentMetrics() {
        return {
            system: await this.collectSystemMetrics(),
            application: await this.collectApplicationMetrics(),
            service: await this.collectServiceMetrics(),
            custom: await this.collectCustomMetrics()
        };
    }
    /**
     * Get historical metrics
     */
    async getHistoricalMetrics(type, startTime, endTime) {
        try {
            const timeSeriesKey = `${this.METRICS_PREFIX}${type}:timeseries`;
            const metrics = await this.cacheService.get(timeSeriesKey) || [];
            return metrics.filter(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp >= startTime && timestamp <= endTime;
            });
        }
        catch (error) {
            this.logger.error(`Failed to get historical metrics for ${type}:`, getErrorMessage(error));
            return [];
        }
    }
    /**
     * Get active alerts
     */
    async getActiveAlerts() {
        try {
            // This is simplified - in production you'd use Redis SCAN
            // to find all alert keys and retrieve them
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get active alerts:', getErrorMessage(error));
            return [];
        }
    }
    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(alertId) {
        try {
            const alertKey = `${this.METRICS_PREFIX}${this.ALERTS_KEY}:${alertId}`;
            const alert = await this.cacheService.get(alertKey);
            if (alert) {
                alert.acknowledged = true;
                await this.cacheService.set(alertKey, alert, { ttl: 24 * 60 * 60 });
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error(`Failed to acknowledge alert ${alertId}:`, getErrorMessage(error));
            return false;
        }
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Get CPU usage percentage
     */
    async getCpuUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            const startTime = performance.now();
            setTimeout(() => {
                const endUsage = process.cpuUsage(startUsage);
                const endTime = performance.now();
                const timeDiff = endTime - startTime;
                const userTime = endUsage.user / 1000; // Convert to milliseconds
                const systemTime = endUsage.system / 1000;
                const totalTime = userTime + systemTime;
                const usage = (totalTime / timeDiff) * 100;
                resolve(Math.min(usage, 100)); // Cap at 100%
            }, 100); // Sample for 100ms
        });
    }
    /**
     * Calculate percentile
     */
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) {
            return sortedArray[lower];
        }
        const weight = index - lower;
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
    /**
     * Calculate average
     */
    average(numbers) {
        if (numbers.length === 0)
            return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('alert', (alert) => {
            this.logger.warn(`Monitoring alert: ${alert.message}`, {
                metric: alert.metric,
                value: alert.value,
                threshold: alert.threshold
            });
        });
        this.on('systemMetrics', (metrics) => {
            this.logger.debug('System metrics collected', {
                cpu: metrics.cpu.usage,
                memory: metrics.memory.usage
            });
        });
    }
}
export default MonitoringService;
//# sourceMappingURL=MonitoringService.js.map