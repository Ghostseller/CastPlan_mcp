/**
 * Health Monitoring System
 *
 * Comprehensive health monitoring with:
 * - Service health checks
 * - Performance metrics
 * - Resource monitoring
 * - Alerting system
 * - Auto-recovery triggers
 */
import { EventEmitter } from 'events';
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "HEALTHY";
    HealthStatus["DEGRADED"] = "DEGRADED";
    HealthStatus["UNHEALTHY"] = "UNHEALTHY";
    HealthStatus["CRITICAL"] = "CRITICAL";
})(HealthStatus || (HealthStatus = {}));
/**
 * Health Monitor
 */
export class HealthMonitor extends EventEmitter {
    logger;
    services = new Map();
    healthChecks = new Map();
    metrics = [];
    maxMetricsHistory = 100;
    checkInterval = 30000; // 30 seconds
    metricsInterval = 10000; // 10 seconds
    intervalIds = [];
    lastAlerts = new Map();
    thresholds = {
        memoryThreshold: 512, // MB
        latencyThreshold: 5000, // 5 seconds
        errorRateThreshold: 5, // 5%
        consecutiveFailureThreshold: 3
    };
    alertConfig = {
        enabled: true,
        channels: ['console', 'log'],
        cooldownPeriod: 300000, // 5 minutes
        escalationRules: {
            [HealthStatus.HEALTHY]: 0,
            [HealthStatus.DEGRADED]: 15,
            [HealthStatus.UNHEALTHY]: 5,
            [HealthStatus.CRITICAL]: 1
        }
    };
    constructor(logger, options = {}) {
        super();
        this.logger = logger;
        if (options.thresholds) {
            this.thresholds = { ...this.thresholds, ...options.thresholds };
        }
        if (options.alertConfig) {
            this.alertConfig = { ...this.alertConfig, ...options.alertConfig };
        }
        if (options.checkInterval) {
            this.checkInterval = options.checkInterval;
        }
        if (options.metricsInterval) {
            this.metricsInterval = options.metricsInterval;
        }
    }
    /**
     * Register a service health check
     */
    registerHealthCheck(serviceName, healthCheck) {
        this.healthChecks.set(serviceName, healthCheck);
        this.services.set(serviceName, {
            name: serviceName,
            status: HealthStatus.HEALTHY,
            lastCheck: new Date(),
            consecutiveFailures: 0,
            totalChecks: 0,
            totalFailures: 0,
            averageLatency: 0,
            lastError: undefined
        });
        this.logger.info(`Registered health check for service: ${serviceName}`);
    }
    /**
     * Start monitoring
     */
    start() {
        this.logger.info('Starting health monitoring system');
        // Start health checks
        const healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
        }, this.checkInterval);
        // Start metrics collection
        const metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, this.metricsInterval);
        this.intervalIds.push(healthCheckInterval, metricsInterval);
        // Initial checks
        this.performHealthChecks();
        this.collectMetrics();
        this.emit('monitoring-started');
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.intervalIds.forEach(id => clearInterval(id));
        this.intervalIds = [];
        this.logger.info('Health monitoring stopped');
        this.emit('monitoring-stopped');
    }
    /**
     * Perform health checks for all registered services
     */
    async performHealthChecks() {
        for (const [serviceName, healthCheck] of this.healthChecks) {
            try {
                const result = await this.performSingleHealthCheck(serviceName, healthCheck);
                this.updateServiceHealth(serviceName, result);
            }
            catch (error) {
                this.logger.error(`Health check failed for ${serviceName}:`, error);
                this.updateServiceHealth(serviceName, {
                    status: HealthStatus.CRITICAL,
                    latency: 0,
                    message: `Health check error: ${error.message}`,
                    timestamp: new Date()
                });
            }
        }
        this.evaluateOverallHealth();
    }
    /**
     * Perform single health check with timeout
     */
    async performSingleHealthCheck(serviceName, healthCheck) {
        const startTime = Date.now();
        // Add timeout to health check
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), 10000);
        });
        try {
            const result = await Promise.race([healthCheck(), timeoutPromise]);
            result.latency = Date.now() - startTime;
            return result;
        }
        catch (error) {
            return {
                status: HealthStatus.CRITICAL,
                latency: Date.now() - startTime,
                message: `Health check failed: ${error.message}`,
                timestamp: new Date()
            };
        }
    }
    /**
     * Update service health based on check result
     */
    updateServiceHealth(serviceName, result) {
        const service = this.services.get(serviceName);
        if (!service)
            return;
        service.lastCheck = result.timestamp;
        service.totalChecks++;
        // Update latency average
        service.averageLatency = (service.averageLatency * (service.totalChecks - 1) + result.latency) / service.totalChecks;
        if (result.status === HealthStatus.HEALTHY) {
            service.consecutiveFailures = 0;
            service.lastError = undefined;
        }
        else {
            service.consecutiveFailures++;
            service.totalFailures++;
            service.lastError = result.message;
            // Check if we need to alert
            if (service.consecutiveFailures >= this.thresholds.consecutiveFailureThreshold) {
                this.triggerAlert(serviceName, result.status, result.message || 'Consecutive failures threshold exceeded');
            }
        }
        service.status = result.status;
        // Emit status change event
        this.emit('service-status-change', {
            serviceName,
            status: result.status,
            result
        });
    }
    /**
     * Collect system metrics
     */
    collectMetrics() {
        const metrics = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            uptime: process.uptime(),
            activeConnections: 0, // Would need actual connection tracking
            queueLength: 0, // Would need actual queue monitoring
            errorRate: this.calculateErrorRate(),
            timestamp: new Date()
        };
        this.metrics.push(metrics);
        // Keep only recent metrics
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics = this.metrics.slice(-this.maxMetricsHistory);
        }
        // Check thresholds
        this.checkMetricThresholds(metrics);
        this.emit('metrics-collected', metrics);
    }
    /**
     * Calculate current error rate
     */
    calculateErrorRate() {
        const services = Array.from(this.services.values());
        if (services.length === 0)
            return 0;
        const totalChecks = services.reduce((sum, s) => sum + s.totalChecks, 0);
        const totalFailures = services.reduce((sum, s) => sum + s.totalFailures, 0);
        if (totalChecks === 0)
            return 0;
        return (totalFailures / totalChecks) * 100;
    }
    /**
     * Check if metrics exceed thresholds
     */
    checkMetricThresholds(metrics) {
        // Memory threshold
        const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        if (memoryMB > this.thresholds.memoryThreshold) {
            this.triggerAlert('system', HealthStatus.CRITICAL, `Memory usage (${memoryMB.toFixed(1)}MB) exceeds threshold (${this.thresholds.memoryThreshold}MB)`);
        }
        // Error rate threshold
        if (metrics.errorRate > this.thresholds.errorRateThreshold) {
            this.triggerAlert('system', HealthStatus.UNHEALTHY, `Error rate (${metrics.errorRate.toFixed(1)}%) exceeds threshold (${this.thresholds.errorRateThreshold}%)`);
        }
    }
    /**
     * Evaluate overall system health
     */
    evaluateOverallHealth() {
        const services = Array.from(this.services.values());
        const criticalServices = services.filter(s => s.status === HealthStatus.CRITICAL);
        const unhealthyServices = services.filter(s => s.status === HealthStatus.UNHEALTHY);
        const degradedServices = services.filter(s => s.status === HealthStatus.DEGRADED);
        let overallStatus;
        if (criticalServices.length > 0) {
            overallStatus = HealthStatus.CRITICAL;
        }
        else if (unhealthyServices.length > 0) {
            overallStatus = HealthStatus.UNHEALTHY;
        }
        else if (degradedServices.length > 0) {
            overallStatus = HealthStatus.DEGRADED;
        }
        else {
            overallStatus = HealthStatus.HEALTHY;
        }
        this.emit('overall-health-change', {
            status: overallStatus,
            services: {
                total: services.length,
                healthy: services.filter(s => s.status === HealthStatus.HEALTHY).length,
                degraded: degradedServices.length,
                unhealthy: unhealthyServices.length,
                critical: criticalServices.length
            }
        });
    }
    /**
     * Trigger alert with cooldown
     */
    triggerAlert(source, status, message) {
        if (!this.alertConfig.enabled)
            return;
        const alertKey = `${source}:${status}`;
        const lastAlert = this.lastAlerts.get(alertKey);
        const now = new Date();
        // Check cooldown
        if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.alertConfig.cooldownPeriod) {
            return;
        }
        this.lastAlerts.set(alertKey, now);
        const alert = {
            source,
            status,
            message,
            timestamp: now,
            escalationLevel: this.alertConfig.escalationRules[status] || 0
        };
        // Send alert through configured channels
        this.sendAlert(alert);
        this.emit('alert-triggered', alert);
    }
    /**
     * Send alert through configured channels
     */
    sendAlert(alert) {
        if (this.alertConfig.channels.includes('console')) {
            console.error(`🚨 ALERT [${alert.status}] ${alert.source}: ${alert.message}`);
        }
        if (this.alertConfig.channels.includes('log')) {
            this.logger.error('Health alert triggered', alert);
        }
        // Could add webhook, email, SMS channels here
    }
    /**
     * Get current health status
     */
    getHealthStatus() {
        const services = Array.from(this.services.values());
        const currentMetrics = this.metrics[this.metrics.length - 1] || null;
        let overall = HealthStatus.HEALTHY;
        const criticalCount = services.filter(s => s.status === HealthStatus.CRITICAL).length;
        const unhealthyCount = services.filter(s => s.status === HealthStatus.UNHEALTHY).length;
        const degradedCount = services.filter(s => s.status === HealthStatus.DEGRADED).length;
        if (criticalCount > 0) {
            overall = HealthStatus.CRITICAL;
        }
        else if (unhealthyCount > 0) {
            overall = HealthStatus.UNHEALTHY;
        }
        else if (degradedCount > 0) {
            overall = HealthStatus.DEGRADED;
        }
        return {
            overall,
            services,
            metrics: currentMetrics,
            timestamp: new Date()
        };
    }
    /**
     * Get metrics history
     */
    getMetricsHistory(limit) {
        if (limit) {
            return this.metrics.slice(-limit);
        }
        return [...this.metrics];
    }
    /**
     * Force health check for specific service
     */
    async forceHealthCheck(serviceName) {
        const healthCheck = this.healthChecks.get(serviceName);
        if (!healthCheck) {
            this.logger.warn(`No health check registered for service: ${serviceName}`);
            return null;
        }
        try {
            const result = await this.performSingleHealthCheck(serviceName, healthCheck);
            this.updateServiceHealth(serviceName, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Forced health check failed for ${serviceName}:`, error);
            return null;
        }
    }
    /**
     * Reset service health stats
     */
    resetServiceStats(serviceName) {
        const service = this.services.get(serviceName);
        if (!service)
            return false;
        service.consecutiveFailures = 0;
        service.totalChecks = 0;
        service.totalFailures = 0;
        service.averageLatency = 0;
        service.lastError = undefined;
        return true;
    }
}
/**
 * Built-in health check functions
 */
export class BuiltInHealthChecks {
    /**
     * Database connection health check
     */
    static createDatabaseHealthCheck(connectionTest) {
        return async () => {
            try {
                const isConnected = await connectionTest();
                return {
                    status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
                    latency: 0, // Will be set by the monitor
                    message: isConnected ? 'Database connection OK' : 'Database connection failed',
                    timestamp: new Date()
                };
            }
            catch (error) {
                return {
                    status: HealthStatus.CRITICAL,
                    latency: 0,
                    message: `Database error: ${error.message}`,
                    timestamp: new Date()
                };
            }
        };
    }
    /**
     * File system health check
     */
    static createFileSystemHealthCheck(testPath) {
        return async () => {
            const fs = await import('fs/promises');
            try {
                await fs.access(testPath);
                return {
                    status: HealthStatus.HEALTHY,
                    latency: 0,
                    message: 'File system access OK',
                    timestamp: new Date()
                };
            }
            catch (error) {
                return {
                    status: HealthStatus.UNHEALTHY,
                    latency: 0,
                    message: `File system error: ${error.message}`,
                    timestamp: new Date()
                };
            }
        };
    }
    /**
     * External API health check
     */
    static createApiHealthCheck(url, timeout = 5000) {
        return async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const status = response.ok ? HealthStatus.HEALTHY : HealthStatus.DEGRADED;
                return {
                    status,
                    latency: 0,
                    message: `API responded with status ${response.status}`,
                    metadata: { statusCode: response.status },
                    timestamp: new Date()
                };
            }
            catch (error) {
                return {
                    status: HealthStatus.UNHEALTHY,
                    latency: 0,
                    message: `API check failed: ${error.message}`,
                    timestamp: new Date()
                };
            }
        };
    }
    /**
     * Memory usage health check
     */
    static createMemoryHealthCheck(thresholdMB) {
        return async () => {
            const usage = process.memoryUsage();
            const heapUsedMB = usage.heapUsed / 1024 / 1024;
            let status;
            if (heapUsedMB < thresholdMB * 0.7) {
                status = HealthStatus.HEALTHY;
            }
            else if (heapUsedMB < thresholdMB * 0.9) {
                status = HealthStatus.DEGRADED;
            }
            else if (heapUsedMB < thresholdMB) {
                status = HealthStatus.UNHEALTHY;
            }
            else {
                status = HealthStatus.CRITICAL;
            }
            return {
                status,
                latency: 0,
                message: `Memory usage: ${heapUsedMB.toFixed(1)}MB / ${thresholdMB}MB`,
                metadata: { heapUsedMB, thresholdMB },
                timestamp: new Date()
            };
        };
    }
}
//# sourceMappingURL=HealthMonitor.js.map