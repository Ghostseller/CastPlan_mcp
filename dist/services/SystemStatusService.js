/**
 * System Status Service - Comprehensive System Monitoring and Status Management
 *
 * CastPlan MCP Phase 4: Advanced System Status Monitoring
 * Comprehensive system monitoring with real-time status tracking, resource monitoring,
 * threshold management, alerting, and status aggregation capabilities.
 *
 * Created: 2025-08-02
 * Author: SuperClaude with Sequential Thinking MCP
 */
import { EventEmitter } from 'events';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { getErrorMessage } from '../utils/typeHelpers';
// =============================================================================
// SYSTEM STATUS SERVICE
// =============================================================================
export class SystemStatusService extends EventEmitter {
    logger;
    cacheService;
    healthCheckService;
    alertingService;
    config;
    // Service state
    isRunning = false;
    startTime = Date.now();
    statusTimer;
    currentSnapshot;
    // Component registry
    components = new Map();
    componentChecks = new Map();
    resources = new Map();
    alerts = new Map();
    metrics = new Map();
    // Status history
    statusHistory = [];
    statusChangeHistory = [];
    // Redis keys
    STATUS_PREFIX = 'system_status:';
    SNAPSHOT_KEY = 'current_snapshot';
    HISTORY_KEY = 'history';
    ALERTS_KEY = 'alerts';
    METRICS_KEY = 'metrics';
    constructor(logger, cacheService, config = {}, healthCheckService, alertingService) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.healthCheckService = healthCheckService;
        this.alertingService = alertingService;
        this.config = {
            enabled: true,
            interval: 30000, // 30 seconds
            alerting: {
                enabled: true,
                channels: ['console', 'email'],
                escalationRules: [],
                suppressionRules: []
            },
            thresholds: {
                global: {
                    responseTime: { warning: 1000, critical: 5000 },
                    errorRate: { warning: 5, critical: 10 },
                    uptime: { warning: 95, critical: 90 },
                    customMetrics: {}
                },
                resources: {
                    cpu: { warning: 70, critical: 85, recovery: 60 },
                    memory: { warning: 75, critical: 90, recovery: 65 },
                    disk: { warning: 80, critical: 95, recovery: 70 },
                    network: { warning: 80, critical: 95, recovery: 70 }
                }
            },
            retention: {
                snapshots: 1000,
                metrics: 7,
                alerts: 30
            },
            notifications: {
                statusChanges: true,
                thresholdBreaches: true,
                componentFailures: true,
                escalations: true
            },
            integrations: {
                healthCheck: true,
                monitoring: true,
                logging: true
            },
            ...config
        };
        this.setupDefaultComponents();
        this.setupDefaultResources();
        this.setupEventHandlers();
    }
    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================
    /**
     * Start system status monitoring
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('SystemStatusService is already running');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('SystemStatusService is disabled');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting SystemStatusService...');
        // Initialize integrations
        await this.initializeIntegrations();
        // Perform initial status check
        await this.performStatusCheck();
        // Start periodic monitoring
        this.startPeriodicMonitoring();
        // Load historical data
        await this.loadHistoricalData();
        this.emit('started');
        this.logger.info('✅ SystemStatusService started successfully');
    }
    /**
     * Stop system status monitoring
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping SystemStatusService...');
        // Stop periodic monitoring
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
        }
        // Save final status
        await this.saveCurrentStatus();
        // Clean up resources
        await this.cleanup();
        this.emit('stopped');
        this.logger.info('✅ SystemStatusService stopped');
    }
    // =============================================================================
    // COMPONENT MANAGEMENT
    // =============================================================================
    /**
     * Register a system component for monitoring
     */
    registerComponent(id, component, checkFunction) {
        const fullComponent = {
            id,
            ...component,
            lastChecked: new Date().toISOString(),
            lastStatusChange: new Date().toISOString(),
            uptime: 0
        };
        this.components.set(id, fullComponent);
        if (checkFunction) {
            this.componentChecks.set(id, checkFunction);
        }
        this.logger.info(`Component registered: ${id} (${component.category})`);
        this.emit('componentRegistered', { id, component: fullComponent });
    }
    /**
     * Unregister a component
     */
    unregisterComponent(id) {
        const removed = this.components.delete(id);
        this.componentChecks.delete(id);
        if (removed) {
            this.logger.info(`Component unregistered: ${id}`);
            this.emit('componentUnregistered', { id });
        }
        return removed;
    }
    /**
     * Update component status manually
     */
    updateComponentStatus(id, status, metadata) {
        const component = this.components.get(id);
        if (!component) {
            throw new Error(`Component not found: ${id}`);
        }
        const oldStatus = component.status;
        const now = new Date().toISOString();
        component.status = status;
        component.lastChecked = now;
        component.metadata = { ...component.metadata, ...metadata };
        if (oldStatus !== status) {
            component.lastStatusChange = now;
            this.handleComponentStatusChange(id, oldStatus, status);
        }
        this.emit('componentStatusUpdated', { id, oldStatus, newStatus: status, component });
    }
    // =============================================================================
    // RESOURCE MONITORING
    // =============================================================================
    /**
     * Register a system resource for monitoring
     */
    registerResource(resource) {
        const fullResource = {
            ...resource,
            lastUpdated: new Date().toISOString(),
            history: [],
            trend: 'stable'
        };
        this.resources.set(resource.name, fullResource);
        this.logger.info(`Resource registered: ${resource.name} (${resource.type})`);
        this.emit('resourceRegistered', { resource: fullResource });
    }
    /**
     * Update resource metrics
     */
    updateResourceMetrics(name, current, maximum) {
        const resource = this.resources.get(name);
        if (!resource) {
            throw new Error(`Resource not found: ${name}`);
        }
        const now = new Date().toISOString();
        const oldUsage = resource.usage;
        if (maximum !== undefined) {
            resource.maximum = maximum;
        }
        resource.current = current;
        resource.usage = (current / resource.maximum) * 100;
        resource.lastUpdated = now;
        // Add to history
        const dataPoint = {
            timestamp: now,
            value: current,
            usage: resource.usage
        };
        resource.history.push(dataPoint);
        // Keep only recent history (last 1000 points)
        if (resource.history.length > 1000) {
            resource.history = resource.history.slice(-1000);
        }
        // Calculate trend
        resource.trend = this.calculateResourceTrend(resource.history);
        // Update status based on thresholds
        const thresholds = this.config.thresholds.resources[resource.type] ||
            this.config.thresholds.resources['cpu']; // default
        const newStatus = this.calculateResourceStatus(resource.usage, thresholds);
        const oldStatus = resource.status;
        resource.status = newStatus;
        // Check for threshold breaches
        if (oldStatus !== newStatus) {
            this.handleResourceStatusChange(name, oldStatus, newStatus, resource.usage);
        }
        this.emit('resourceUpdated', { name, resource, oldUsage, oldStatus });
    }
    // =============================================================================
    // STATUS MONITORING
    // =============================================================================
    /**
     * Perform comprehensive status check
     */
    async performStatusCheck() {
        const startTime = performance.now();
        const timestamp = new Date().toISOString();
        const snapshotId = `snapshot_${Date.now()}`;
        try {
            // Check all components
            await this.checkAllComponents();
            // Update system resources
            await this.updateSystemResources();
            // Integrate health check data if available
            if (this.config.integrations.healthCheck && this.healthCheckService) {
                await this.integrateHealthCheckData();
            }
            // Calculate overall system status
            const overallStatus = this.calculateOverallStatus();
            // Generate summary
            const summary = this.generateStatusSummary();
            // Collect current metrics
            const currentMetrics = Array.from(this.metrics.values());
            // Create status snapshot
            const snapshot = {
                id: snapshotId,
                timestamp,
                overallStatus,
                components: Array.from(this.components.values()),
                resources: Array.from(this.resources.values()),
                alerts: Array.from(this.alerts.values()).filter(a => !a.resolved),
                metrics: currentMetrics,
                summary,
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                version: '2.0.0', // Would get from package.json
                environment: process.env.NODE_ENV || 'development'
            };
            // Store snapshot
            await this.storeSnapshot(snapshot);
            // Update status history
            this.updateStatusHistory(snapshot);
            // Check for status changes
            if (this.currentSnapshot && this.currentSnapshot.overallStatus !== overallStatus) {
                this.handleOverallStatusChange(this.currentSnapshot.overallStatus, overallStatus);
            }
            this.currentSnapshot = snapshot;
            const duration = performance.now() - startTime;
            this.logger.debug(`Status check completed in ${duration.toFixed(2)}ms`, {
                status: overallStatus,
                components: summary.totalComponents,
                alerts: summary.activeAlerts
            });
            this.emit('statusChecked', snapshot);
            return snapshot;
        }
        catch (error) {
            const duration = performance.now() - startTime;
            this.logger.error(`Status check failed after ${duration.toFixed(2)}ms:`, error);
            // Create error snapshot
            const errorSnapshot = {
                id: snapshotId,
                timestamp,
                overallStatus: 'major_outage',
                components: Array.from(this.components.values()),
                resources: Array.from(this.resources.values()),
                alerts: Array.from(this.alerts.values()),
                metrics: Array.from(this.metrics.values()),
                summary: this.generateStatusSummary(),
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development'
            };
            this.currentSnapshot = errorSnapshot;
            this.emit('statusCheckFailed', { error, snapshot: errorSnapshot });
            throw error;
        }
    }
    /**
     * Check all registered components
     */
    async checkAllComponents() {
        const checkPromises = Array.from(this.componentChecks.entries()).map(async ([id, checkFunction]) => {
            try {
                const startTime = performance.now();
                const result = await Promise.race([
                    checkFunction(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Component check timeout')), 5000))
                ]);
                const responseTime = performance.now() - startTime;
                const component = this.components.get(id);
                if (component) {
                    const oldStatus = component.status;
                    component.status = result.status;
                    component.responseTime = result.responseTime || responseTime;
                    component.lastChecked = new Date().toISOString();
                    component.metadata = { ...component.metadata, ...result.metadata };
                    if (oldStatus !== result.status) {
                        component.lastStatusChange = new Date().toISOString();
                        this.handleComponentStatusChange(id, oldStatus, result.status);
                    }
                    // Update uptime
                    if (result.status === 'healthy') {
                        component.uptime += this.config.interval / 1000;
                    }
                }
            }
            catch (error) {
                const component = this.components.get(id);
                if (component) {
                    const oldStatus = component.status;
                    component.status = 'unhealthy';
                    component.lastChecked = new Date().toISOString();
                    component.metadata = {
                        ...component.metadata,
                        lastError: getErrorMessage(error),
                        lastErrorTime: new Date().toISOString()
                    };
                    if (oldStatus !== 'unhealthy') {
                        component.lastStatusChange = new Date().toISOString();
                        this.handleComponentStatusChange(id, oldStatus, 'unhealthy');
                    }
                }
                this.logger.error(`Component check failed: ${id}`, error);
            }
        });
        await Promise.allSettled(checkPromises);
    }
    /**
     * Update system resource metrics
     */
    async updateSystemResources() {
        try {
            // CPU usage
            const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
            this.updateResourceMetrics('cpu', cpuUsage, 100);
            // Memory usage
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            this.updateResourceMetrics('memory', usedMem, totalMem);
            // Process memory
            const processMemory = process.memoryUsage();
            this.updateResourceMetrics('process_memory', processMemory.heapUsed, processMemory.heapTotal);
            // Network connections (simplified)
            const networkConnections = Math.floor(Math.random() * 100); // Would implement proper counting
            this.updateResourceMetrics('network_connections', networkConnections, 1000);
            // Disk usage (would need platform-specific implementation)
            const diskUsage = 45; // Placeholder
            this.updateResourceMetrics('disk', diskUsage, 100);
        }
        catch (error) {
            this.logger.error('Failed to update system resources:', error);
        }
    }
    // =============================================================================
    // ALERTING AND NOTIFICATIONS
    // =============================================================================
    /**
     * Create and process system alert
     */
    createAlert(type, severity, component, message, details = {}) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            type,
            severity,
            component,
            message,
            details,
            timestamp: new Date().toISOString(),
            resolved: false,
            escalationLevel: 0
        };
        this.alerts.set(alertId, alert);
        // Process alert through alerting service if available
        if (this.config.alerting.enabled && this.alertingService) {
            this.processAlert(alert);
        }
        this.logger.warn(`Alert created: ${severity} - ${message}`, {
            id: alertId,
            component,
            type,
            details
        });
        this.emit('alertCreated', alert);
        return alert;
    }
    /**
     * Resolve an alert
     */
    resolveAlert(alertId, resolvedBy) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.resolved) {
            return false;
        }
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
        if (resolvedBy) {
            alert.acknowledgedBy = resolvedBy;
            alert.acknowledgedAt = alert.resolvedAt;
        }
        this.logger.info(`Alert resolved: ${alertId}`, { alert });
        this.emit('alertResolved', alert);
        return true;
    }
    /**
     * Process alert through alerting service
     */
    async processAlert(alert) {
        if (!this.alertingService) {
            return;
        }
        try {
            // Check suppression rules
            if (this.isAlertSuppressed(alert)) {
                this.logger.debug(`Alert suppressed: ${alert.id}`);
                return;
            }
            // Send alert based on severity and configuration
            await this.alertingService.createAlert({
                title: `${alert.severity.toUpperCase()}: ${alert.component}`,
                source: 'SystemStatusService',
                description: alert.message,
                severity: alert.severity,
                metadata: alert.details,
                timestamp: alert.timestamp
            });
        }
        catch (error) {
            this.logger.error(`Failed to process alert ${alert.id}:`, error);
        }
    }
    // =============================================================================
    // STATUS CALCULATION AND AGGREGATION
    // =============================================================================
    /**
     * Calculate overall system status
     */
    calculateOverallStatus() {
        const components = Array.from(this.components.values());
        const resources = Array.from(this.resources.values());
        const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
        // Check for maintenance mode
        const maintenanceComponents = components.filter(c => c.status === 'maintenance');
        if (maintenanceComponents.length > 0) {
            return 'maintenance';
        }
        // Check for critical alerts
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
            return 'major_outage';
        }
        // Check core components
        const coreComponents = components.filter(c => c.category === 'core');
        const unhealthyCoreComponents = coreComponents.filter(c => c.status === 'unhealthy');
        if (unhealthyCoreComponents.length > 0) {
            return 'major_outage';
        }
        // Check critical resources
        const criticalResources = resources.filter(r => r.status === 'unhealthy');
        if (criticalResources.length > 0) {
            return 'partial_outage';
        }
        // Check degraded components
        const degradedComponents = components.filter(c => c.status === 'degraded');
        const degradedResources = resources.filter(r => r.status === 'degraded');
        if (degradedComponents.length > 0 || degradedResources.length > 0) {
            return 'degraded';
        }
        // Check for high alert activity
        const highAlerts = activeAlerts.filter(a => a.severity === 'high');
        if (highAlerts.length >= 3) {
            return 'degraded';
        }
        return 'operational';
    }
    /**
     * Generate status summary
     */
    generateStatusSummary() {
        const components = Array.from(this.components.values());
        const resources = Array.from(this.resources.values());
        const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
        const summary = {
            totalComponents: components.length,
            healthyComponents: components.filter(c => c.status === 'healthy').length,
            degradedComponents: components.filter(c => c.status === 'degraded').length,
            unhealthyComponents: components.filter(c => c.status === 'unhealthy').length,
            maintenanceComponents: components.filter(c => c.status === 'maintenance').length,
            activeAlerts: activeAlerts.length,
            criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
            averageResponseTime: this.calculateAverageResponseTime(components),
            systemLoad: os.loadavg()[0],
            resourceUtilization: this.calculateAverageResourceUtilization(resources)
        };
        return summary;
    }
    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(components) {
        const validComponents = components.filter(c => c.responseTime > 0);
        if (validComponents.length === 0)
            return 0;
        const totalResponseTime = validComponents.reduce((sum, c) => sum + c.responseTime, 0);
        return totalResponseTime / validComponents.length;
    }
    /**
     * Calculate average resource utilization
     */
    calculateAverageResourceUtilization(resources) {
        if (resources.length === 0)
            return 0;
        const totalUtilization = resources.reduce((sum, r) => sum + r.usage, 0);
        return totalUtilization / resources.length;
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Calculate resource status based on thresholds
     */
    calculateResourceStatus(usage, thresholds) {
        if (usage >= thresholds.critical) {
            return 'unhealthy';
        }
        else if (usage >= thresholds.warning) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    /**
     * Calculate resource trend
     */
    calculateResourceTrend(history) {
        if (history.length < 5)
            return 'stable';
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        if (older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((sum, point) => sum + point.usage, 0) / recent.length;
        const olderAvg = older.reduce((sum, point) => sum + point.usage, 0) / older.length;
        const diff = recentAvg - olderAvg;
        const threshold = 2; // 2% threshold
        if (diff > threshold)
            return 'increasing';
        if (diff < -threshold)
            return 'decreasing';
        return 'stable';
    }
    /**
     * Check if alert is suppressed
     */
    isAlertSuppressed(alert) {
        const now = Date.now();
        return this.config.alerting.suppressionRules.some(rule => {
            if (!rule.active)
                return false;
            const regex = new RegExp(rule.pattern);
            const matches = regex.test(alert.message) || regex.test(alert.component);
            if (!matches)
                return false;
            // Check duration (would need to track when suppression started)
            return true; // Simplified
        });
    }
    /**
     * Handle component status change
     */
    handleComponentStatusChange(id, oldStatus, newStatus) {
        this.logger.info(`Component status changed: ${id} (${oldStatus} → ${newStatus})`);
        // Create alert for status degradation
        if (newStatus === 'unhealthy' && oldStatus !== 'unhealthy') {
            this.createAlert('component_failure', 'high', id, `Component ${id} is now unhealthy`, { oldStatus, newStatus });
        }
        else if (newStatus === 'degraded' && oldStatus === 'healthy') {
            this.createAlert('status_change', 'medium', id, `Component ${id} is now degraded`, { oldStatus, newStatus });
        }
        if (this.config.notifications.statusChanges) {
            this.emit('componentStatusChanged', { id, oldStatus, newStatus });
        }
    }
    /**
     * Handle resource status change
     */
    handleResourceStatusChange(name, oldStatus, newStatus, usage) {
        this.logger.info(`Resource status changed: ${name} (${oldStatus} → ${newStatus}, ${usage.toFixed(1)}%)`);
        // Create alert for threshold breach
        if (newStatus === 'unhealthy') {
            this.createAlert('threshold_breach', 'critical', name, `Resource ${name} usage is critical (${usage.toFixed(1)}%)`, { oldStatus, newStatus, usage });
        }
        else if (newStatus === 'degraded') {
            this.createAlert('threshold_breach', 'medium', name, `Resource ${name} usage is high (${usage.toFixed(1)}%)`, { oldStatus, newStatus, usage });
        }
        if (this.config.notifications.thresholdBreaches) {
            this.emit('resourceStatusChanged', { name, oldStatus, newStatus, usage });
        }
    }
    /**
     * Handle overall status change
     */
    handleOverallStatusChange(oldStatus, newStatus) {
        this.logger.info(`System status changed: ${oldStatus} → ${newStatus}`);
        this.statusChangeHistory.push({
            timestamp: new Date().toISOString(),
            from: oldStatus,
            to: newStatus,
            reason: `Automatic status change based on component and resource health`
        });
        // Create alert for major status changes
        if (newStatus === 'major_outage' || newStatus === 'partial_outage') {
            this.createAlert('status_change', 'critical', 'system', `System status changed to ${newStatus}`, { oldStatus, newStatus });
        }
        this.emit('systemStatusChanged', { oldStatus, newStatus });
    }
    // =============================================================================
    // SETUP AND INITIALIZATION
    // =============================================================================
    /**
     * Setup default components
     */
    setupDefaultComponents() {
        // Core application component
        this.registerComponent('application', {
            name: 'Core Application',
            description: 'Main application process',
            status: 'healthy',
            category: 'core',
            dependencies: [],
            responseTime: 0,
            errorRate: 0,
            metadata: {},
            thresholds: this.config.thresholds.global
        });
        // Database component
        this.registerComponent('database', {
            name: 'Database',
            description: 'Primary database connection',
            status: 'unknown',
            category: 'database',
            dependencies: [],
            responseTime: 0,
            errorRate: 0,
            metadata: {},
            thresholds: this.config.thresholds.global
        });
        // Cache component  
        this.registerComponent('cache', {
            name: 'Redis Cache',
            description: 'Redis caching service',
            status: 'unknown',
            category: 'cache',
            dependencies: [],
            responseTime: 0,
            errorRate: 0,
            metadata: {},
            thresholds: this.config.thresholds.global
        });
    }
    /**
     * Setup default resources
     */
    setupDefaultResources() {
        const defaultThresholds = this.config.thresholds.resources;
        this.registerResource({
            type: 'cpu',
            name: 'cpu',
            current: 0,
            maximum: 100,
            unit: '%',
            usage: 0,
            status: 'healthy',
            thresholds: defaultThresholds.cpu
        });
        this.registerResource({
            type: 'memory',
            name: 'memory',
            current: 0,
            maximum: os.totalmem(),
            unit: 'bytes',
            usage: 0,
            status: 'healthy',
            thresholds: defaultThresholds.memory
        });
        this.registerResource({
            type: 'disk',
            name: 'disk',
            current: 0,
            maximum: 100,
            unit: '%',
            usage: 0,
            status: 'healthy',
            thresholds: defaultThresholds.disk
        });
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('componentStatusChanged', ({ id, newStatus }) => {
            if (newStatus === 'unhealthy') {
                this.logger.error(`Component ${id} is unhealthy`);
            }
        });
        this.on('systemStatusChanged', ({ newStatus }) => {
            if (newStatus === 'major_outage' || newStatus === 'partial_outage') {
                this.logger.error(`System status is now ${newStatus}`);
            }
        });
    }
    /**
     * Initialize integrations
     */
    async initializeIntegrations() {
        // Initialize health check integration
        if (this.config.integrations.healthCheck && this.healthCheckService) {
            this.healthCheckService.on('healthChecked', (health) => {
                this.integrateHealthCheckData();
            });
        }
    }
    /**
     * Integrate health check data
     */
    async integrateHealthCheckData() {
        if (!this.healthCheckService)
            return;
        try {
            const health = await this.healthCheckService.getCurrentHealth();
            // Update component statuses based on health check results
            for (const check of health.checks) {
                const component = this.components.get(check.name);
                if (component) {
                    let status;
                    switch (check.status) {
                        case 'healthy':
                            status = 'healthy';
                            break;
                        case 'degraded':
                            status = 'degraded';
                            break;
                        case 'unhealthy':
                            status = 'unhealthy';
                            break;
                        default:
                            status = 'unknown';
                            break;
                    }
                    this.updateComponentStatus(check.name, status, {
                        healthCheck: check,
                        lastHealthCheck: new Date().toISOString()
                    });
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to integrate health check data:', error);
        }
    }
    /**
     * Start periodic monitoring
     */
    startPeriodicMonitoring() {
        this.statusTimer = setInterval(() => {
            if (!this.isRunning)
                return;
            this.performStatusCheck().catch(error => {
                this.logger.error('Periodic status check failed:', error);
            });
        }, this.config.interval);
    }
    /**
     * Load historical data
     */
    async loadHistoricalData() {
        try {
            // Load status history
            const history = await this.cacheService.get(`${this.STATUS_PREFIX}${this.HISTORY_KEY}`);
            if (history && Array.isArray(history)) {
                this.statusHistory = history.slice(-this.config.retention.snapshots);
            }
            // Load alerts
            const alerts = await this.cacheService.get(`${this.STATUS_PREFIX}${this.ALERTS_KEY}`);
            if (alerts && Array.isArray(alerts)) {
                const validAlerts = alerts.filter((alert) => {
                    const age = Date.now() - new Date(alert.timestamp).getTime();
                    return age < this.config.retention.alerts * 24 * 60 * 60 * 1000;
                });
                this.alerts.clear();
                for (const alert of validAlerts) {
                    this.alerts.set(alert.id, alert);
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to load historical data:', error);
        }
    }
    /**
     * Store current snapshot
     */
    async storeSnapshot(snapshot) {
        try {
            // Store current snapshot
            await this.cacheService.set(`${this.STATUS_PREFIX}${this.SNAPSHOT_KEY}`, snapshot, { ttl: 300 } // 5 minutes TTL
            );
            // Store in history
            await this.cacheService.set(`${this.STATUS_PREFIX}${this.HISTORY_KEY}`, this.statusHistory, { ttl: 86400 } // 24 hours TTL
            );
            // Store alerts
            await this.cacheService.set(`${this.STATUS_PREFIX}${this.ALERTS_KEY}`, Array.from(this.alerts.values()), { ttl: 86400 });
        }
        catch (error) {
            this.logger.error('Failed to store snapshot:', error);
        }
    }
    /**
     * Update status history
     */
    updateStatusHistory(snapshot) {
        this.statusHistory.push(snapshot);
        // Keep only recent snapshots
        if (this.statusHistory.length > this.config.retention.snapshots) {
            this.statusHistory = this.statusHistory.slice(-this.config.retention.snapshots);
        }
    }
    /**
     * Save current status
     */
    async saveCurrentStatus() {
        if (this.currentSnapshot) {
            await this.storeSnapshot(this.currentSnapshot);
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Clear timers
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
        }
        // Clear event listeners
        this.removeAllListeners();
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    /**
     * Get current system status
     */
    async getCurrentStatus() {
        if (this.currentSnapshot) {
            return this.currentSnapshot;
        }
        return await this.performStatusCheck();
    }
    /**
     * Get component by ID
     */
    getComponent(id) {
        return this.components.get(id);
    }
    /**
     * Get all components
     */
    getAllComponents() {
        return Array.from(this.components.values());
    }
    /**
     * Get resource by name
     */
    getResource(name) {
        return this.resources.get(name);
    }
    /**
     * Get all resources
     */
    getAllResources() {
        return Array.from(this.resources.values());
    }
    /**
     * Get alert by ID
     */
    getAlert(id) {
        return this.alerts.get(id);
    }
    /**
     * Get all alerts
     */
    getAllAlerts(resolved) {
        const alerts = Array.from(this.alerts.values());
        if (resolved !== undefined) {
            return alerts.filter(a => a.resolved === resolved);
        }
        return alerts;
    }
    /**
     * Get status history
     */
    getStatusHistory(limit) {
        if (limit) {
            return this.statusHistory.slice(-limit);
        }
        return [...this.statusHistory];
    }
    /**
     * Get status change history
     */
    getStatusChangeHistory(limit) {
        if (limit) {
            return this.statusChangeHistory.slice(-limit);
        }
        return [...this.statusChangeHistory];
    }
    /**
     * Get system metrics
     */
    getMetrics() {
        return Array.from(this.metrics.values());
    }
    /**
     * Force status check
     */
    async forceStatusCheck() {
        this.logger.info('Forcing status check...');
        return await this.performStatusCheck();
    }
    /**
     * Set component maintenance mode
     */
    setComponentMaintenance(id, maintenance, reason) {
        const component = this.components.get(id);
        if (!component) {
            throw new Error(`Component not found: ${id}`);
        }
        const newStatus = maintenance ? 'maintenance' : 'healthy';
        this.updateComponentStatus(id, newStatus, {
            maintenanceMode: maintenance,
            maintenanceReason: reason,
            maintenanceTimestamp: new Date().toISOString()
        });
        this.logger.info(`Component ${id} maintenance mode: ${maintenance}`, { reason });
    }
    /**
     * Get service uptime
     */
    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    /**
     * Get service configuration
     */
    getConfiguration() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfiguration(config) {
        this.config = { ...this.config, ...config };
        this.logger.info('Configuration updated', { config });
        this.emit('configurationUpdated', this.config);
    }
}
export default SystemStatusService;
//# sourceMappingURL=SystemStatusService.js.map