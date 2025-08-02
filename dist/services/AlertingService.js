/**
 * Alerting Service - Intelligent Alert Management and Notification System
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 지능적인 알림 관리, 에스컬레이션, 알림 상관관계 분석
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & Backend Architect
 */
import { EventEmitter } from 'events';
import { getErrorMessage } from '../utils/typeHelpers.ts';
// =============================================================================
// ALERTING SERVICE
// =============================================================================
export class AlertingService extends EventEmitter {
    logger;
    cacheService;
    config;
    isRunning = false;
    // Storage
    alerts = new Map();
    rules = new Map();
    channels = new Map();
    correlations = new Map();
    // Runtime state
    evaluationTimer;
    ruleEvaluationQueue = [];
    pendingActions = new Map();
    // Redis keys
    ALERTS_PREFIX = 'alerts:';
    ALERTS_KEY = 'active';
    RULES_KEY = 'rules';
    CHANNELS_KEY = 'channels';
    STATS_KEY = 'statistics';
    CORRELATIONS_KEY = 'correlations';
    // Built-in alert rules
    DEFAULT_RULES = [
        {
            name: 'High CPU Usage',
            description: 'CPU usage above 80% for more than 5 minutes',
            category: 'system',
            severity: 'high',
            condition: {
                type: 'threshold',
                metric: 'system.cpu.usage',
                operator: '>',
                value: 80,
                duration: 300000, // 5 minutes
                aggregation: 'avg'
            },
            actions: [
                {
                    type: 'notification',
                    target: 'default',
                    parameters: { message: 'High CPU usage detected: {{value}}%' }
                }
            ]
        },
        {
            name: 'High Memory Usage',
            description: 'Memory usage above 85% for more than 2 minutes',
            category: 'system',
            severity: 'high',
            condition: {
                type: 'threshold',
                metric: 'system.memory.usage',
                operator: '>',
                value: 85,
                duration: 120000, // 2 minutes
                aggregation: 'avg'
            },
            actions: [
                {
                    type: 'notification',
                    target: 'default',
                    parameters: { message: 'High memory usage detected: {{value}}%' }
                }
            ]
        },
        {
            name: 'High Error Rate',
            description: 'Application error rate above 5% for more than 1 minute',
            category: 'application',
            severity: 'critical',
            condition: {
                type: 'threshold',
                metric: 'application.requests.errorRate',
                operator: '>',
                value: 5,
                duration: 60000, // 1 minute
                aggregation: 'avg'
            },
            actions: [
                {
                    type: 'notification',
                    target: 'default',
                    parameters: { message: 'High error rate detected: {{value}}%' }
                }
            ]
        },
        {
            name: 'Slow Response Time',
            description: 'P95 response time above 2 seconds',
            category: 'performance',
            severity: 'medium',
            condition: {
                type: 'threshold',
                metric: 'application.response.p95',
                operator: '>',
                value: 2000,
                duration: 60000,
                aggregation: 'avg'
            },
            actions: [
                {
                    type: 'notification',
                    target: 'default',
                    parameters: { message: 'Slow response time detected: {{value}}ms' }
                }
            ]
        }
    ];
    constructor(logger, cacheService, config = {}) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.config = {
            enabled: true,
            evaluationInterval: 30000, // 30 seconds
            alertRetention: 30, // 30 days
            maxActiveAlerts: 1000,
            deduplicationWindow: 300000, // 5 minutes
            correlationEnabled: true,
            correlationWindow: 600000, // 10 minutes
            autoRemediation: false,
            defaultSeverity: 'medium',
            defaultRetryPolicy: {
                maxAttempts: 3,
                baseDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                jitter: true
            },
            ...config
        };
        this.setupDefaultChannels();
        this.setupEventHandlers();
    }
    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================
    /**
     * Start alerting service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('AlertingService is already running');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('AlertingService is disabled');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting AlertingService...');
        // Load existing data
        await this.loadState();
        // Initialize default rules if none exist
        if (this.rules.size === 0) {
            await this.initializeDefaultRules();
        }
        // Start rule evaluation
        this.startRuleEvaluation();
        // Start action processing
        this.startActionProcessing();
        // Start correlation analysis
        if (this.config.correlationEnabled) {
            this.startCorrelationAnalysis();
        }
        this.emit('started');
        this.logger.info('✅ AlertingService started successfully');
    }
    /**
     * Stop alerting service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping AlertingService...');
        // Stop timers
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
        }
        // Save state
        await this.saveState();
        this.emit('stopped');
        this.logger.info('✅ AlertingService stopped');
    }
    // =============================================================================
    // ALERT MANAGEMENT
    // =============================================================================
    /**
     * Create a new alert
     */
    async createAlert(alertData) {
        const alert = {
            id: this.generateAlertId(),
            title: alertData.title,
            description: alertData.description || '',
            severity: alertData.severity || this.config.defaultSeverity,
            status: 'open',
            category: alertData.category || 'system',
            source: alertData.source,
            metric: alertData.metric,
            value: alertData.value,
            threshold: alertData.threshold,
            timestamp: new Date().toISOString(),
            tags: alertData.tags || [],
            metadata: alertData.metadata || {},
            fingerprint: this.generateFingerprint(alertData)
        };
        // Check for deduplication
        const existingAlert = await this.findDuplicateAlert(alert);
        if (existingAlert) {
            this.logger.debug(`Alert deduplicated: ${alert.title}`, {
                new: alert.id,
                existing: existingAlert.id
            });
            return existingAlert;
        }
        // Store alert
        this.alerts.set(alert.id, alert);
        await this.storeAlert(alert);
        // Check for correlation
        if (this.config.correlationEnabled) {
            await this.analyzeCorrelation(alert);
        }
        // Execute alert actions
        await this.executeAlertActions(alert);
        this.emit('alertCreated', alert);
        this.logger.info(`Alert created: ${alert.title}`, {
            id: alert.id,
            severity: alert.severity
        });
        return alert;
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, acknowledgedBy, note) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            this.logger.warn(`Alert not found for acknowledgment: ${alertId}`);
            return false;
        }
        if (alert.status !== 'open') {
            this.logger.warn(`Alert ${alertId} is not in open status, cannot acknowledge`);
            return false;
        }
        alert.status = 'acknowledged';
        alert.acknowledgedAt = new Date().toISOString();
        alert.acknowledgedBy = acknowledgedBy;
        if (note) {
            alert.metadata.acknowledgmentNote = note;
        }
        await this.storeAlert(alert);
        this.emit('alertAcknowledged', alert);
        this.logger.info(`Alert acknowledged: ${alert.title}`, {
            id: alertId,
            by: acknowledgedBy
        });
        return true;
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId, resolvedBy, resolution) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            this.logger.warn(`Alert not found for resolution: ${alertId}`);
            return false;
        }
        if (alert.status === 'resolved') {
            this.logger.warn(`Alert ${alertId} is already resolved`);
            return false;
        }
        const previousStatus = alert.status;
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = resolvedBy;
        if (resolution) {
            alert.metadata.resolution = resolution;
        }
        // Calculate resolution time
        const resolutionTime = new Date(alert.resolvedAt).getTime() - new Date(alert.timestamp).getTime();
        alert.metadata.resolutionTimeMs = resolutionTime;
        await this.storeAlert(alert);
        this.emit('alertResolved', alert, previousStatus);
        this.logger.info(`Alert resolved: ${alert.title}`, {
            id: alertId,
            by: resolvedBy,
            resolutionTime: `${Math.round(resolutionTime / 1000)}s`
        });
        return true;
    }
    /**
     * Suppress an alert
     */
    async suppressAlert(alertId, suppressionDuration, reason) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            this.logger.warn(`Alert not found for suppression: ${alertId}`);
            return false;
        }
        alert.status = 'suppressed';
        alert.suppressedUntil = new Date(Date.now() + suppressionDuration).toISOString();
        alert.metadata.suppressionReason = reason;
        await this.storeAlert(alert);
        this.emit('alertSuppressed', alert);
        this.logger.info(`Alert suppressed: ${alert.title}`, {
            id: alertId,
            until: alert.suppressedUntil,
            reason
        });
        return true;
    }
    // =============================================================================
    // RULE MANAGEMENT
    // =============================================================================
    /**
     * Add an alert rule
     */
    async addRule(ruleData) {
        const rule = {
            id: this.generateRuleId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...ruleData
        };
        this.rules.set(rule.id, rule);
        await this.storeRule(rule);
        this.emit('ruleAdded', rule);
        this.logger.info(`Alert rule added: ${rule.name}`, { id: rule.id });
        return rule;
    }
    /**
     * Update an alert rule
     */
    async updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            this.logger.warn(`Rule not found for update: ${ruleId}`);
            return false;
        }
        Object.assign(rule, updates, { updatedAt: new Date().toISOString() });
        await this.storeRule(rule);
        this.emit('ruleUpdated', rule);
        this.logger.info(`Alert rule updated: ${rule.name}`, { id: ruleId });
        return true;
    }
    /**
     * Remove an alert rule
     */
    async removeRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            this.logger.warn(`Rule not found for removal: ${ruleId}`);
            return false;
        }
        this.rules.delete(ruleId);
        await this.deleteRule(ruleId);
        this.emit('ruleRemoved', rule);
        this.logger.info(`Alert rule removed: ${rule.name}`, { id: ruleId });
        return true;
    }
    // =============================================================================
    // NOTIFICATION MANAGEMENT
    // =============================================================================
    /**
     * Add a notification channel
     */
    async addNotificationChannel(channel) {
        this.channels.set(channel.id, channel);
        await this.storeChannel(channel);
        this.emit('channelAdded', channel);
        this.logger.info(`Notification channel added: ${channel.name}`, {
            id: channel.id,
            type: channel.type
        });
    }
    /**
     * Remove a notification channel
     */
    async removeNotificationChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            return false;
        }
        this.channels.delete(channelId);
        await this.deleteChannel(channelId);
        this.emit('channelRemoved', channel);
        this.logger.info(`Notification channel removed: ${channel.name}`, { id: channelId });
        return true;
    }
    /**
     * Send notification through a channel
     */
    async sendNotification(channel, alert, action) {
        try {
            // Check if alert matches channel filters
            if (channel.filters && !this.matchesFilters(alert, channel.filters)) {
                return true; // Skip silently
            }
            switch (channel.type) {
                case 'console':
                    return await this.sendConsoleNotification(alert, action);
                case 'file':
                    return await this.sendFileNotification(channel, alert, action);
                case 'webhook':
                    return await this.sendWebhookNotification(channel, alert, action);
                case 'email':
                case 'slack':
                case 'teams':
                case 'discord':
                    // These would require additional service implementations
                    this.logger.info(`${channel.type} notification would be sent`, {
                        alert: alert.id,
                        channel: channel.id
                    });
                    return true;
                default:
                    this.logger.warn(`Unsupported notification channel type: ${channel.type}`);
                    return false;
            }
        }
        catch (error) {
            this.logger.error(`Failed to send notification through ${channel.type}:`, getErrorMessage(error));
            return false;
        }
    }
    // =============================================================================
    // RULE EVALUATION
    // =============================================================================
    /**
     * Start rule evaluation timer
     */
    startRuleEvaluation() {
        this.evaluationTimer = setInterval(() => {
            if (!this.isRunning)
                return;
            this.evaluateRules();
        }, this.config.evaluationInterval);
        // Evaluate immediately
        this.evaluateRules();
    }
    /**
     * Evaluate all enabled rules
     */
    async evaluateRules() {
        const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
        for (const rule of enabledRules) {
            try {
                await this.evaluateRule(rule);
            }
            catch (error) {
                this.logger.error(`Failed to evaluate rule ${rule.name}:`, getErrorMessage(error));
            }
        }
    }
    /**
     * Evaluate a single rule
     */
    async evaluateRule(rule) {
        const condition = rule.condition;
        try {
            // Get metric data for evaluation
            const metricData = await this.getMetricData(condition.metric, condition.evaluationWindow);
            if (metricData.length === 0) {
                return; // No data to evaluate
            }
            // Apply aggregation
            const aggregatedValue = this.aggregateMetricData(metricData, condition.aggregation);
            // Evaluate condition
            const conditionMet = this.evaluateCondition(condition, aggregatedValue);
            if (conditionMet) {
                // Check if we need to wait for duration
                if (condition.duration) {
                    const conditionStartTime = await this.getConditionStartTime(rule.id, condition);
                    if (Date.now() - conditionStartTime < condition.duration) {
                        return; // Condition hasn't been true long enough
                    }
                }
                // Create alert
                await this.createAlert({
                    title: `Alert: ${rule.name}`,
                    description: `${rule.description}\nCurrent value: ${aggregatedValue}`,
                    severity: rule.severity,
                    category: rule.category,
                    source: `rule:${rule.id}`,
                    metric: condition.metric,
                    value: aggregatedValue,
                    threshold: typeof condition.value === 'number' ? condition.value : undefined,
                    tags: rule.tags,
                    metadata: {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        condition: condition
                    }
                });
            }
            else {
                // Clear condition start time if it exists
                await this.clearConditionStartTime(rule.id);
            }
        }
        catch (error) {
            this.logger.error(`Error evaluating rule ${rule.name}:`, getErrorMessage(error));
        }
    }
    /**
     * Evaluate a condition against a value
     */
    evaluateCondition(condition, value) {
        const threshold = typeof condition.value === 'number' ? condition.value : parseFloat(condition.value);
        switch (condition.operator) {
            case '>':
                return value > threshold;
            case '<':
                return value < threshold;
            case '>=':
                return value >= threshold;
            case '<=':
                return value <= threshold;
            case '==':
                return value === threshold;
            case '!=':
                return value !== threshold;
            default:
                return false;
        }
    }
    // =============================================================================
    // ACTION PROCESSING
    // =============================================================================
    /**
     * Start action processing
     */
    startActionProcessing() {
        setInterval(() => {
            if (!this.isRunning)
                return;
            this.processActions();
        }, 5000); // Process actions every 5 seconds
    }
    /**
     * Execute alert actions
     */
    async executeAlertActions(alert) {
        const rule = Array.from(this.rules.values()).find(r => r.id === alert.metadata.ruleId);
        if (!rule) {
            return;
        }
        for (const action of rule.actions) {
            try {
                await this.executeAction(action, alert);
            }
            catch (error) {
                this.logger.error(`Failed to execute action for alert ${alert.id}:`, getErrorMessage(error));
            }
        }
    }
    /**
     * Execute a single action
     */
    async executeAction(action, alert) {
        // Apply delay if specified
        if (action.delaySeconds) {
            setTimeout(() => this.doExecuteAction(action, alert), action.delaySeconds * 1000);
        }
        else {
            await this.doExecuteAction(action, alert);
        }
    }
    /**
     * Actually execute the action
     */
    async doExecuteAction(action, alert) {
        const actionId = `${alert.id}-${action.type}-${Date.now()}`;
        switch (action.type) {
            case 'notification':
                await this.executeNotificationAction(action, alert);
                break;
            case 'webhook':
                await this.executeWebhookAction(action, alert);
                break;
            case 'script':
                await this.executeScriptAction(action, alert);
                break;
            case 'auto-remediation':
                if (this.config.autoRemediation) {
                    await this.executeRemediationAction(action, alert);
                }
                break;
            default:
                this.logger.warn(`Unsupported action type: ${action.type}`);
        }
    }
    /**
     * Execute notification action
     */
    async executeNotificationAction(action, alert) {
        const channel = this.channels.get(action.target) || this.channels.get('default');
        if (!channel) {
            this.logger.warn(`Notification channel not found: ${action.target}`);
            return;
        }
        await this.sendNotification(channel, alert, action);
    }
    /**
     * Execute webhook action
     */
    async executeWebhookAction(action, alert) {
        // Would implement webhook HTTP request here
        this.logger.info(`Webhook action executed for alert ${alert.id}`, {
            target: action.target
        });
    }
    /**
     * Execute script action
     */
    async executeScriptAction(action, alert) {
        // Would implement script execution here
        this.logger.info(`Script action executed for alert ${alert.id}`, {
            script: action.target
        });
    }
    /**
     * Execute auto-remediation action
     */
    async executeRemediationAction(action, alert) {
        // Would implement auto-remediation logic here
        this.logger.info(`Auto-remediation action executed for alert ${alert.id}`, {
            remediation: action.target
        });
    }
    /**
     * Process pending actions
     */
    async processActions() {
        // Process any pending actions with retry logic
        for (const [actionId, pendingAction] of this.pendingActions) {
            try {
                await this.doExecuteAction(pendingAction.action, pendingAction.alert);
                this.pendingActions.delete(actionId);
            }
            catch (error) {
                pendingAction.attempts++;
                const retryPolicy = pendingAction.action.retryPolicy || this.config.defaultRetryPolicy;
                if (pendingAction.attempts >= retryPolicy.maxAttempts) {
                    this.logger.error(`Action failed after ${pendingAction.attempts} attempts:`, getErrorMessage(error));
                    this.pendingActions.delete(actionId);
                }
                else {
                    this.logger.warn(`Action failed, will retry (${pendingAction.attempts}/${retryPolicy.maxAttempts}):`, getErrorMessage(error));
                }
            }
        }
    }
    // =============================================================================
    // CORRELATION ANALYSIS
    // =============================================================================
    /**
     * Start correlation analysis
     */
    startCorrelationAnalysis() {
        setInterval(() => {
            if (!this.isRunning)
                return;
            this.analyzeCorrelations();
        }, 60000); // Analyze correlations every minute
    }
    /**
     * Analyze correlations between alerts
     */
    async analyzeCorrelations() {
        const recentAlerts = Array.from(this.alerts.values())
            .filter(alert => {
            const alertTime = new Date(alert.timestamp).getTime();
            return Date.now() - alertTime <= this.config.correlationWindow;
        });
        // Simple correlation analysis - group by category and timeframe
        const categories = new Map();
        for (const alert of recentAlerts) {
            if (!categories.has(alert.category)) {
                categories.set(alert.category, []);
            }
            const categoryAlerts = categories.get(alert.category);
            if (categoryAlerts) {
                categoryAlerts.push(alert);
            }
        }
        // Create correlations for categories with multiple alerts
        for (const [category, alerts] of categories) {
            if (alerts.length > 1) {
                const correlation = {
                    id: `correlation-${Date.now()}-${category}`,
                    alerts: alerts.map(a => a.id),
                    pattern: `Multiple ${category} alerts`,
                    confidence: Math.min(alerts.length / 5, 1.0), // Higher confidence with more alerts
                    timestamp: new Date().toISOString()
                };
                // Store correlation
                this.correlations.set(correlation.id, correlation);
                await this.storeCorrelation(correlation);
                // Update alerts with correlation ID
                for (const alert of alerts) {
                    alert.correlationId = correlation.id;
                    await this.storeAlert(alert);
                }
                this.emit('correlationDetected', correlation);
            }
        }
    }
    /**
     * Analyze correlation for a new alert
     */
    async analyzeCorrelation(alert) {
        // Find recent similar alerts
        const similarAlerts = Array.from(this.alerts.values())
            .filter(existingAlert => {
            if (existingAlert.id === alert.id)
                return false;
            const timeDiff = new Date(alert.timestamp).getTime() - new Date(existingAlert.timestamp).getTime();
            if (Math.abs(timeDiff) > this.config.correlationWindow)
                return false;
            return existingAlert.category === alert.category ||
                existingAlert.source === alert.source ||
                existingAlert.metric === alert.metric;
        });
        if (similarAlerts.length > 0) {
            const correlationId = `correlation-${Date.now()}-${alert.category}`;
            const correlation = {
                id: correlationId,
                alerts: [alert.id, ...similarAlerts.map(a => a.id)],
                pattern: `Related ${alert.category} alerts`,
                confidence: Math.min(similarAlerts.length / 3, 1.0),
                timestamp: new Date().toISOString()
            };
            this.correlations.set(correlation.id, correlation);
            await this.storeCorrelation(correlation);
            // Update alert with correlation ID
            alert.correlationId = correlationId;
            await this.storeAlert(alert);
            this.emit('correlationDetected', correlation);
        }
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Generate alert ID
     */
    generateAlertId() {
        return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate rule ID
     */
    generateRuleId() {
        return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate alert fingerprint for deduplication
     */
    generateFingerprint(alertData) {
        const key = `${alertData.source}-${alertData.metric}-${alertData.category}`;
        return Buffer.from(key).toString('base64');
    }
    /**
     * Find duplicate alert within deduplication window
     */
    async findDuplicateAlert(alert) {
        const cutoffTime = Date.now() - this.config.deduplicationWindow;
        for (const existingAlert of this.alerts.values()) {
            if (existingAlert.fingerprint === alert.fingerprint &&
                new Date(existingAlert.timestamp).getTime() > cutoffTime &&
                existingAlert.status === 'open') {
                return existingAlert;
            }
        }
        return null;
    }
    /**
     * Check if alert matches notification filters
     */
    matchesFilters(alert, filters) {
        for (const filter of filters) {
            if (!this.matchesFilter(alert, filter)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if alert matches a specific filter
     */
    matchesFilter(alert, filter) {
        let value;
        switch (filter.type) {
            case 'severity':
                value = alert.severity;
                break;
            case 'category':
                value = alert.category;
                break;
            case 'tag':
                value = alert.tags;
                break;
            case 'source':
                value = alert.source;
                break;
            default:
                return true;
        }
        switch (filter.operator) {
            case 'equals':
                return value === filter.value;
            case 'contains':
                return Array.isArray(value) ?
                    value.some(v => Array.isArray(filter.value) ? filter.value.includes(v) : v === filter.value) :
                    Array.isArray(filter.value) ? filter.value.includes(value) : value.includes(filter.value);
            case 'matches':
                return Array.isArray(value) ?
                    value.some(v => new RegExp(filter.value).test(v)) :
                    new RegExp(filter.value).test(value);
            case 'in':
                return Array.isArray(filter.value) ? filter.value.includes(value) : false;
            default:
                return true;
        }
    }
    /**
     * Get metric data for rule evaluation
     */
    async getMetricData(metric, window) {
        // This would integrate with MonitoringService to get actual metric data
        // For now, return mock data
        return [Math.random() * 100]; // Mock metric value
    }
    /**
     * Aggregate metric data
     */
    aggregateMetricData(data, aggregation) {
        if (data.length === 0)
            return 0;
        switch (aggregation) {
            case 'avg':
                return data.reduce((a, b) => a + b, 0) / data.length;
            case 'sum':
                return data.reduce((a, b) => a + b, 0);
            case 'min':
                return Math.min(...data);
            case 'max':
                return Math.max(...data);
            case 'count':
                return data.length;
            default:
                return data[data.length - 1]; // Latest value
        }
    }
    /**
     * Get condition start time
     */
    async getConditionStartTime(ruleId, condition) {
        const key = `condition-start:${ruleId}`;
        const startTime = await this.cacheService.get(key);
        if (!startTime) {
            const now = Date.now();
            await this.cacheService.set(key, now, { ttl: 3600 }); // 1 hour TTL
            return now;
        }
        return startTime;
    }
    /**
     * Clear condition start time
     */
    async clearConditionStartTime(ruleId) {
        const key = `condition-start:${ruleId}`;
        await this.cacheService.delete(key);
    }
    /**
     * Send console notification
     */
    async sendConsoleNotification(alert, action) {
        const severity = alert.severity.toUpperCase();
        const icon = this.getSeverityIcon(alert.severity);
        console.log(`${icon} [${severity}] ${alert.title}`);
        console.log(`   ${alert.description}`);
        if (alert.value !== undefined) {
            console.log(`   Value: ${alert.value}${alert.threshold ? ` (threshold: ${alert.threshold})` : ''}`);
        }
        console.log(`   Time: ${alert.timestamp}`);
        console.log(`   Source: ${alert.source}`);
        return true;
    }
    /**
     * Send file notification
     */
    async sendFileNotification(channel, alert, action) {
        // Would implement file logging here
        return true;
    }
    /**
     * Send webhook notification
     */
    async sendWebhookNotification(channel, alert, action) {
        // Would implement HTTP webhook request here
        return true;
    }
    /**
     * Get severity icon
     */
    getSeverityIcon(severity) {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            case 'low': return 'ℹ️';
            case 'info': return '📢';
            default: return '🔔';
        }
    }
    /**
     * Setup default notification channels
     */
    setupDefaultChannels() {
        const defaultChannel = {
            id: 'default',
            name: 'Default Console',
            type: 'console',
            config: {},
            enabled: true
        };
        this.channels.set(defaultChannel.id, defaultChannel);
    }
    /**
     * Initialize default alert rules
     */
    async initializeDefaultRules() {
        for (const ruleData of this.DEFAULT_RULES) {
            await this.addRule({
                name: ruleData.name,
                description: ruleData.description,
                enabled: true,
                category: ruleData.category,
                severity: ruleData.severity,
                condition: ruleData.condition,
                actions: ruleData.actions,
                tags: ruleData.tags || [],
                metadata: ruleData.metadata || {}
            });
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('alertCreated', (alert) => {
            this.logger.info(`Alert created: ${alert.title}`, {
                id: alert.id,
                severity: alert.severity
            });
        });
        this.on('correlationDetected', (correlation) => {
            this.logger.info(`Alert correlation detected: ${correlation.pattern}`, {
                id: correlation.id,
                alerts: correlation.alerts.length,
                confidence: correlation.confidence
            });
        });
    }
    // =============================================================================
    // STORAGE METHODS
    // =============================================================================
    async storeAlert(alert) {
        try {
            await this.cacheService.set(`${this.ALERTS_PREFIX}${alert.id}`, alert, {
                ttl: this.config.alertRetention * 24 * 60 * 60
            });
        }
        catch (error) {
            this.logger.error('Failed to store alert:', getErrorMessage(error));
        }
    }
    async storeRule(rule) {
        try {
            await this.cacheService.set(`${this.ALERTS_PREFIX}${this.RULES_KEY}:${rule.id}`, rule);
        }
        catch (error) {
            this.logger.error('Failed to store rule:', getErrorMessage(error));
        }
    }
    async deleteRule(ruleId) {
        try {
            await this.cacheService.delete(`${this.ALERTS_PREFIX}${this.RULES_KEY}:${ruleId}`);
        }
        catch (error) {
            this.logger.error('Failed to delete rule:', getErrorMessage(error));
        }
    }
    async storeChannel(channel) {
        try {
            await this.cacheService.set(`${this.ALERTS_PREFIX}${this.CHANNELS_KEY}:${channel.id}`, channel);
        }
        catch (error) {
            this.logger.error('Failed to store channel:', getErrorMessage(error));
        }
    }
    async deleteChannel(channelId) {
        try {
            await this.cacheService.delete(`${this.ALERTS_PREFIX}${this.CHANNELS_KEY}:${channelId}`);
        }
        catch (error) {
            this.logger.error('Failed to delete channel:', getErrorMessage(error));
        }
    }
    async storeCorrelation(correlation) {
        try {
            await this.cacheService.set(`${this.ALERTS_PREFIX}${this.CORRELATIONS_KEY}:${correlation.id}`, correlation, {
                ttl: 24 * 60 * 60 // 24 hours
            });
        }
        catch (error) {
            this.logger.error('Failed to store correlation:', getErrorMessage(error));
        }
    }
    async loadState() {
        // Load from Redis would be implemented here
        this.logger.debug('AlertingService state loaded');
    }
    async saveState() {
        // Save to Redis would be implemented here
        this.logger.debug('AlertingService state saved');
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    /**
     * Get all active alerts
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => alert.status === 'open');
    }
    /**
     * Get alert statistics
     */
    getAlertStatistics() {
        const allAlerts = Array.from(this.alerts.values());
        const stats = {
            totalAlerts: allAlerts.length,
            alertsByStatus: { open: 0, acknowledged: 0, resolved: 0, suppressed: 0 },
            alertsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
            alertsByCategory: { system: 0, application: 0, security: 0, performance: 0, business: 0 },
            averageResolutionTime: 0,
            escalationRate: 0,
            falsePositiveRate: 0,
            mttr: 0,
            mtbf: 0
        };
        // Calculate statistics
        for (const alert of allAlerts) {
            stats.alertsByStatus[alert.status]++;
            stats.alertsBySeverity[alert.severity]++;
            stats.alertsByCategory[alert.category]++;
        }
        // Calculate resolution time
        const resolvedAlerts = allAlerts.filter(a => a.resolvedAt && a.metadata.resolutionTimeMs);
        if (resolvedAlerts.length > 0) {
            stats.averageResolutionTime = resolvedAlerts.reduce((sum, alert) => sum + (alert.metadata.resolutionTimeMs || 0), 0) / resolvedAlerts.length;
        }
        return stats;
    }
    /**
     * Get alert rules
     */
    getAlertRules() {
        return Array.from(this.rules.values());
    }
    /**
     * Get notification channels
     */
    getNotificationChannels() {
        return Array.from(this.channels.values());
    }
    /**
     * Get alert correlations
     */
    getAlertCorrelations() {
        return Array.from(this.correlations.values());
    }
}
export default AlertingService;
//# sourceMappingURL=AlertingService.js.map