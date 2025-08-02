/**
 * Health Check Service - System Health Monitoring and Endpoint Management
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 시스템 상태 확인, 헬스 체크 엔드포인트, 종합 상태 관리
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & Backend Architect
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { getErrorMessage } from '../utils/typeHelpers.ts';
// =============================================================================
// HEALTH CHECK SERVICE
// =============================================================================
export class HealthCheckService extends EventEmitter {
    logger;
    cacheService;
    config;
    isRunning = false;
    startTime = Date.now();
    // Health checks registry
    healthChecks = new Map();
    checkResults = new Map();
    dependencies = new Map();
    // Runtime state
    checkTimer;
    lastSystemHealth;
    requestMetrics = {
        count: 0,
        errors: 0,
        responseTimes: [],
        lastError: null
    };
    // Redis keys
    HEALTH_PREFIX = 'health:';
    CHECKS_KEY = 'checks';
    SYSTEM_KEY = 'system';
    DEPENDENCIES_KEY = 'dependencies';
    METRICS_KEY = 'metrics';
    constructor(logger, cacheService, config = {}) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.config = {
            enabled: true,
            interval: 30000, // 30 seconds
            timeout: 5000, // 5 seconds
            retries: 3,
            gracePeriod: 30000, // 30 seconds
            thresholds: {
                cpu: { warning: 70, critical: 85 },
                memory: { warning: 75, critical: 90 },
                disk: { warning: 80, critical: 95 },
                responseTime: { warning: 1000, critical: 5000 }
            },
            endpoints: {
                health: '/health',
                liveness: '/health/live',
                readiness: '/health/ready',
                metrics: '/health/metrics'
            },
            notifications: {
                enabled: true,
                channels: ['console'],
                onStatusChange: true,
                onThresholdBreach: true
            },
            ...config
        };
        this.setupBuiltInChecks();
        this.setupEventHandlers();
    }
    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================
    /**
     * Start health check service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('HealthCheckService is already running');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('HealthCheckService is disabled');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting HealthCheckService...');
        // Run initial health check
        await this.performHealthChecks();
        // Start periodic health checks
        this.startPeriodicChecks();
        // Initialize dependencies monitoring
        await this.initializeDependencies();
        this.emit('started');
        this.logger.info('✅ HealthCheckService started successfully');
    }
    /**
     * Stop health check service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping HealthCheckService...');
        // Stop periodic checks
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }
        // Save final health status
        await this.saveHealthStatus();
        this.emit('stopped');
        this.logger.info('✅ HealthCheckService stopped');
    }
    // =============================================================================
    // HEALTH CHECK REGISTRATION
    // =============================================================================
    /**
     * Register a custom health check
     */
    registerHealthCheck(name, type, checkFunction, threshold) {
        this.healthChecks.set(name, checkFunction);
        // Initialize check result
        this.checkResults.set(name, {
            name,
            type,
            status: 'unknown',
            lastChecked: new Date().toISOString(),
            duration: 0,
            threshold
        });
        this.logger.info(`Health check registered: ${name} (${type})`);
    }
    /**
     * Unregister a health check
     */
    unregisterHealthCheck(name) {
        const removed = this.healthChecks.delete(name);
        this.checkResults.delete(name);
        if (removed) {
            this.logger.info(`Health check unregistered: ${name}`);
        }
        return removed;
    }
    /**
     * Register a dependency for monitoring
     */
    registerDependency(dependency) {
        const depHealth = {
            ...dependency,
            status: 'unknown',
            latency: 0,
            lastChecked: new Date().toISOString()
        };
        this.dependencies.set(dependency.name, depHealth);
        this.logger.info(`Dependency registered: ${dependency.name} (${dependency.type})`);
    }
    // =============================================================================
    // HEALTH CHECK EXECUTION
    // =============================================================================
    /**
     * Perform all health checks
     */
    async performHealthChecks() {
        const startTime = Date.now();
        const checks = [];
        // Execute all registered health checks
        for (const [name, checkFunction] of this.healthChecks) {
            const checkResult = await this.executeHealthCheck(name, checkFunction);
            checks.push(checkResult);
            this.checkResults.set(name, checkResult);
        }
        // Check dependencies
        await this.checkDependencies();
        // Collect resource health
        const resourceHealth = await this.collectResourceHealth();
        // Calculate overall system health
        const systemHealth = this.calculateSystemHealth(checks, resourceHealth);
        // Store health status
        await this.storeHealthStatus(systemHealth);
        // Check for status changes
        if (this.lastSystemHealth && this.lastSystemHealth.status !== systemHealth.status) {
            this.handleStatusChange(this.lastSystemHealth.status, systemHealth.status);
        }
        this.lastSystemHealth = systemHealth;
        this.emit('healthChecked', systemHealth);
        const duration = Date.now() - startTime;
        this.logger.debug(`Health checks completed in ${duration}ms`, {
            status: systemHealth.status,
            checks: systemHealth.summary
        });
        return systemHealth;
    }
    /**
     * Execute a single health check
     */
    async executeHealthCheck(name, checkFunction) {
        const existingCheck = this.checkResults.get(name);
        const startTime = Date.now();
        try {
            // Execute with timeout
            const result = await Promise.race([
                checkFunction(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout))
            ]);
            const duration = Date.now() - startTime;
            const threshold = existingCheck?.threshold;
            // Determine status based on duration and thresholds
            let status = result.status;
            if (threshold && status === 'healthy') {
                if (duration > threshold.critical) {
                    status = 'unhealthy';
                }
                else if (duration > threshold.warning) {
                    status = 'degraded';
                }
            }
            return {
                name,
                type: existingCheck?.type || 'custom',
                status,
                lastChecked: new Date().toISOString(),
                duration,
                message: result.message,
                details: result.details,
                threshold
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                name,
                type: existingCheck?.type || 'custom',
                status: 'unhealthy',
                lastChecked: new Date().toISOString(),
                duration,
                message: `Health check failed: ${getErrorMessage(error)}`,
                threshold: existingCheck?.threshold
            };
        }
    }
    /**
     * Check all registered dependencies
     */
    async checkDependencies() {
        for (const [name, dependency] of this.dependencies) {
            try {
                const startTime = Date.now();
                let status = 'healthy';
                let details = {};
                switch (dependency.type) {
                    case 'database':
                        status = await this.checkDatabase(dependency);
                        break;
                    case 'cache':
                        status = await this.checkCache(dependency);
                        break;
                    case 'api':
                        status = await this.checkApiEndpoint(dependency);
                        break;
                    case 'file':
                        status = await this.checkFileSystem(dependency);
                        break;
                    case 'network':
                        status = await this.checkNetwork(dependency);
                        break;
                }
                const latency = Date.now() - startTime;
                // Update dependency health
                dependency.status = status;
                dependency.latency = latency;
                dependency.lastChecked = new Date().toISOString();
                dependency.details = details;
            }
            catch (error) {
                dependency.status = 'unhealthy';
                dependency.latency = this.config.timeout;
                dependency.lastChecked = new Date().toISOString();
                dependency.details = { error: getErrorMessage(error) };
            }
        }
    }
    /**
     * Collect system resource health
     */
    async collectResourceHealth() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();
        // Get system information
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        const cpus = require('os').cpus();
        const loadAvg = require('os').loadavg();
        // Calculate CPU usage percentage (simplified)
        const cpuPercent = Math.min((cpuUsage.user + cpuUsage.system) / (uptime * 1000000) * 100, 100);
        // Calculate memory usage
        const memoryUsed = totalMemory - freeMemory;
        const memoryUsage = (memoryUsed / totalMemory) * 100;
        return {
            cpu: {
                usage: cpuPercent,
                loadAverage: loadAvg,
                status: this.getStatusFromThreshold(cpuPercent, this.config.thresholds.cpu)
            },
            memory: {
                used: memoryUsed,
                total: totalMemory,
                usage: memoryUsage,
                status: this.getStatusFromThreshold(memoryUsage, this.config.thresholds.memory)
            },
            disk: {
                used: 0, // Would need platform-specific implementation
                total: 0,
                usage: 0,
                status: 'healthy'
            },
            network: {
                connections: 0, // Would need to track active connections
                throughput: 0, // Would need to track network throughput
                status: 'healthy'
            }
        };
    }
    /**
     * Calculate overall system health
     */
    calculateSystemHealth(checks, resources) {
        const summary = {
            total: checks.length,
            healthy: 0,
            degraded: 0,
            unhealthy: 0,
            unknown: 0
        };
        // Count check statuses
        for (const check of checks) {
            summary[check.status]++;
        }
        // Determine overall status
        let overallStatus = 'healthy';
        if (summary.unhealthy > 0 || resources.cpu.status === 'unhealthy' || resources.memory.status === 'unhealthy') {
            overallStatus = 'unhealthy';
        }
        else if (summary.degraded > 0 || resources.cpu.status === 'degraded' || resources.memory.status === 'degraded') {
            overallStatus = 'degraded';
        }
        else if (summary.unknown > 0) {
            overallStatus = 'unknown';
        }
        // Calculate metrics
        const responseTimes = this.requestMetrics.responseTimes.slice(-1000); // Keep last 1000
        const avgResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        const p95ResponseTime = this.calculatePercentile(responseTimes.slice().sort((a, b) => a - b), 95);
        const successRate = this.requestMetrics.count > 0 ?
            ((this.requestMetrics.count - this.requestMetrics.errors) / this.requestMetrics.count) * 100 : 100;
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            version: '2.0.0', // Would get from package.json
            checks,
            summary,
            dependencies: Array.from(this.dependencies.values()),
            resources,
            metrics: {
                requestCount: this.requestMetrics.count,
                errorCount: this.requestMetrics.errors,
                averageResponseTime: avgResponseTime,
                p95ResponseTime,
                successRate,
                lastError: this.requestMetrics.lastError
            }
        };
    }
    // =============================================================================
    // DEPENDENCY HEALTH CHECKS
    // =============================================================================
    /**
     * Check database health
     */
    async checkDatabase(dependency) {
        try {
            // This would integrate with actual database connections
            // For now, assume healthy if no explicit failure
            return 'healthy';
        }
        catch (error) {
            return 'unhealthy';
        }
    }
    /**
     * Check cache health (Redis)
     */
    async checkCache(dependency) {
        try {
            // Test Redis connection
            await this.cacheService.set('health-check', 'test', { ttl: 10 });
            const result = await this.cacheService.get('health-check');
            await this.cacheService.delete('health-check');
            return result === 'test' ? 'healthy' : 'degraded';
        }
        catch (error) {
            return 'unhealthy';
        }
    }
    /**
     * Check API endpoint health
     */
    async checkApiEndpoint(dependency) {
        try {
            if (!dependency.endpoint) {
                return 'unknown';
            }
            // Would implement HTTP request to endpoint
            // For now, assume healthy
            return 'healthy';
        }
        catch (error) {
            return 'unhealthy';
        }
    }
    /**
     * Check file system health
     */
    async checkFileSystem(dependency) {
        try {
            const testPath = dependency.endpoint || './';
            // Check if path exists and is accessible
            const stats = fs.statSync(testPath);
            // Check write permissions
            try {
                const testFile = path.join(testPath, '.health-check');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                return 'healthy';
            }
            catch (writeError) {
                return 'degraded'; // Readable but not writable
            }
        }
        catch (error) {
            return 'unhealthy';
        }
    }
    /**
     * Check network health
     */
    async checkNetwork(dependency) {
        try {
            // Would implement network connectivity checks
            // For now, assume healthy
            return 'healthy';
        }
        catch (error) {
            return 'unhealthy';
        }
    }
    // =============================================================================
    // BUILT-IN HEALTH CHECKS
    // =============================================================================
    /**
     * Setup built-in health checks
     */
    setupBuiltInChecks() {
        // Process health check
        this.registerHealthCheck('process', 'liveness', async () => {
            const memUsage = process.memoryUsage();
            const uptime = process.uptime();
            return {
                status: uptime > 0 ? 'healthy' : 'unhealthy',
                message: `Process running for ${Math.floor(uptime)}s`,
                details: {
                    uptime,
                    memoryUsage: memUsage,
                    pid: process.pid,
                    version: process.version
                }
            };
        });
        // Memory health check
        this.registerHealthCheck('memory', 'readiness', async () => {
            const memUsage = process.memoryUsage();
            const totalMem = require('os').totalmem();
            const freeMem = require('os').freemem();
            const usedMem = totalMem - freeMem;
            const usage = (usedMem / totalMem) * 100;
            const status = this.getStatusFromThreshold(usage, this.config.thresholds.memory);
            return {
                status,
                message: `Memory usage: ${usage.toFixed(1)}%`,
                details: {
                    usage,
                    used: usedMem,
                    total: totalMem,
                    process: memUsage
                }
            };
        });
        // CPU health check
        this.registerHealthCheck('cpu', 'readiness', async () => {
            const cpuUsage = process.cpuUsage();
            const loadAvg = require('os').loadavg();
            const cpus = require('os').cpus().length;
            // Calculate CPU usage (simplified)
            const usage = Math.min((loadAvg[0] / cpus) * 100, 100);
            const status = this.getStatusFromThreshold(usage, this.config.thresholds.cpu);
            return {
                status,
                message: `CPU usage: ${usage.toFixed(1)}%`,
                details: {
                    usage,
                    loadAverage: loadAvg,
                    cores: cpus,
                    process: cpuUsage
                }
            };
        });
        // Startup health check
        this.registerHealthCheck('startup', 'startup', async () => {
            const uptime = Date.now() - this.startTime;
            const isReady = uptime > this.config.gracePeriod;
            return {
                status: isReady ? 'healthy' : 'degraded',
                message: isReady ? 'Service ready' : `Starting up (${uptime}ms)`,
                details: {
                    uptime,
                    gracePeriod: this.config.gracePeriod,
                    ready: isReady
                }
            };
        });
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Start periodic health checks
     */
    startPeriodicChecks() {
        this.checkTimer = setInterval(() => {
            if (!this.isRunning)
                return;
            this.performHealthChecks();
        }, this.config.interval);
    }
    /**
     * Initialize dependency monitoring
     */
    async initializeDependencies() {
        // Register Redis cache dependency
        this.registerDependency({
            name: 'redis-cache',
            type: 'cache',
            endpoint: 'localhost:6379'
        });
        // Register file system dependency
        this.registerDependency({
            name: 'file-system',
            type: 'file',
            endpoint: process.cwd()
        });
    }
    /**
     * Get status from threshold
     */
    getStatusFromThreshold(value, threshold) {
        if (value >= threshold.critical) {
            return 'unhealthy';
        }
        else if (value >= threshold.warning) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    /**
     * Calculate percentile
     */
    calculatePercentile(sortedArray, percentile) {
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
     * Handle status change
     */
    handleStatusChange(oldStatus, newStatus) {
        this.logger.info(`System health status changed: ${oldStatus} → ${newStatus}`);
        if (this.config.notifications.enabled && this.config.notifications.onStatusChange) {
            this.emit('statusChanged', { oldStatus, newStatus, timestamp: new Date().toISOString() });
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('healthChecked', (health) => {
            if (health.status === 'unhealthy') {
                this.logger.warn('System health is unhealthy', {
                    checks: health.summary,
                    unhealthyChecks: health.checks.filter(c => c.status === 'unhealthy').map(c => c.name)
                });
            }
        });
        this.on('statusChanged', ({ oldStatus, newStatus }) => {
            const severity = newStatus === 'unhealthy' ? 'error' : newStatus === 'degraded' ? 'warn' : 'info';
            this.logger[severity](`Health status changed: ${oldStatus} → ${newStatus}`);
        });
    }
    // =============================================================================
    // STORAGE METHODS
    // =============================================================================
    /**
     * Store health status in Redis
     */
    async storeHealthStatus(health) {
        try {
            await this.cacheService.set(`${this.HEALTH_PREFIX}${this.SYSTEM_KEY}`, health, { ttl: 300 }); // 5 minutes TTL
            // Store individual check results
            for (const check of health.checks) {
                await this.cacheService.set(`${this.HEALTH_PREFIX}${this.CHECKS_KEY}:${check.name}`, check, { ttl: 300 });
            }
            // Store dependencies
            for (const dep of health.dependencies) {
                await this.cacheService.set(`${this.HEALTH_PREFIX}${this.DEPENDENCIES_KEY}:${dep.name}`, dep, { ttl: 300 });
            }
            // Store metrics
            await this.cacheService.set(`${this.HEALTH_PREFIX}${this.METRICS_KEY}`, health.metrics, { ttl: 300 });
        }
        catch (error) {
            this.logger.error('Failed to store health status:', error);
        }
    }
    /**
     * Save health status on shutdown
     */
    async saveHealthStatus() {
        if (this.lastSystemHealth) {
            await this.storeHealthStatus(this.lastSystemHealth);
        }
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    /**
     * Get current system health
     */
    async getCurrentHealth() {
        return await this.performHealthChecks();
    }
    /**
     * Get health check by name
     */
    getHealthCheck(name) {
        return this.checkResults.get(name);
    }
    /**
     * Get all health checks
     */
    getAllHealthChecks() {
        return Array.from(this.checkResults.values());
    }
    /**
     * Get dependency health
     */
    getDependencyHealth(name) {
        return this.dependencies.get(name);
    }
    /**
     * Get all dependencies
     */
    getAllDependencies() {
        return Array.from(this.dependencies.values());
    }
    /**
     * Record request metrics
     */
    recordRequest(responseTime, success = true) {
        this.requestMetrics.count++;
        this.requestMetrics.responseTimes.push(responseTime);
        if (!success) {
            this.requestMetrics.errors++;
        }
        // Keep only recent response times
        if (this.requestMetrics.responseTimes.length > 1000) {
            this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-1000);
        }
    }
    /**
     * Record error
     */
    recordError(error) {
        const now = new Date().toISOString();
        if (this.requestMetrics.lastError?.message === error) {
            this.requestMetrics.lastError.count++;
        }
        else {
            this.requestMetrics.lastError = {
                message: error,
                timestamp: now,
                count: 1
            };
        }
    }
    /**
     * Get liveness status (basic service availability)
     */
    async getLivenessStatus() {
        const livenessChecks = Array.from(this.checkResults.values()).filter(c => c.type === 'liveness');
        const unhealthyChecks = livenessChecks.filter(c => c.status === 'unhealthy');
        const status = unhealthyChecks.length > 0 ? 'unhealthy' : 'healthy';
        return {
            status,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Get readiness status (service ready to handle requests)
     */
    async getReadinessStatus() {
        const readinessChecks = Array.from(this.checkResults.values()).filter(c => c.type === 'readiness');
        const unhealthyChecks = readinessChecks.filter(c => c.status === 'unhealthy');
        const degradedChecks = readinessChecks.filter(c => c.status === 'degraded');
        let status = 'healthy';
        if (unhealthyChecks.length > 0) {
            status = 'unhealthy';
        }
        else if (degradedChecks.length > 0) {
            status = 'degraded';
        }
        return {
            status,
            timestamp: new Date().toISOString(),
            checks: readinessChecks
        };
    }
    /**
     * Get startup status (initial startup health)
     */
    async getStartupStatus() {
        const startupChecks = Array.from(this.checkResults.values()).filter(c => c.type === 'startup');
        const unhealthyChecks = startupChecks.filter(c => c.status === 'unhealthy');
        const status = unhealthyChecks.length > 0 ? 'unhealthy' : 'healthy';
        const uptime = Date.now() - this.startTime;
        return {
            status,
            timestamp: new Date().toISOString(),
            uptime
        };
    }
    /**
     * Get health metrics summary
     */
    getHealthMetrics() {
        const responseTimes = this.requestMetrics.responseTimes.slice(-1000);
        const avgResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        const p95ResponseTime = this.calculatePercentile(responseTimes.slice().sort((a, b) => a - b), 95);
        const successRate = this.requestMetrics.count > 0 ?
            ((this.requestMetrics.count - this.requestMetrics.errors) / this.requestMetrics.count) * 100 : 100;
        return {
            requestCount: this.requestMetrics.count,
            errorCount: this.requestMetrics.errors,
            averageResponseTime: avgResponseTime,
            p95ResponseTime,
            successRate,
            lastError: this.requestMetrics.lastError
        };
    }
    /**
     * Force health check execution
     */
    async forceHealthCheck() {
        this.logger.info('Forcing health check execution...');
        return await this.performHealthChecks();
    }
    /**
     * Reset health metrics
     */
    resetMetrics() {
        this.requestMetrics = {
            count: 0,
            errors: 0,
            responseTimes: [],
            lastError: null
        };
        this.logger.info('Health metrics reset');
    }
}
export default HealthCheckService;
//# sourceMappingURL=HealthCheckService.js.map