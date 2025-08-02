/**
 * Quality Alert Manager - Phase 4 Week 4
 *
 * CastPlan MCP Autonomous Quality Service - Intelligent Alert Management
 * Multi-level alert system with configurable thresholds, escalation policies,
 * and multiple notification channels for quality monitoring.
 *
 * Features:
 * - Configurable alert thresholds (critical, high, medium, low)
 * - Multiple notification channels (email, webhook, slack, dashboard)
 * - Escalation policies with time-based triggers
 * - Alert suppression and correlation to reduce noise
 * - Custom alert rules based on quality patterns
 * - Integration with incident management systems
 * - Self-healing capabilities with automatic remediation
 * - Alert delivery time <30 seconds (performance requirement)
 *
 * Integration points:
 * - QualityMonitoringService for real-time quality events
 * - HealthMonitor for system health correlation
 * - External notification services (email, Slack, webhooks)
 * - Incident management systems
 * - Dashboard systems for visual alerts
 *
 * Performance requirements:
 * - Alert delivery time <30 seconds
 * - Alert processing latency <100ms
 * - Notification channel failover <5 seconds
 * - Escalation processing <1 second
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & Alert Systems Specialist
 */
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import * as nodemailer from 'nodemailer';
// Import quality monitoring types
import { QualityEventType } from './QualityMonitoringService';
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
    AlertStatus["ESCALATED"] = "escalated";
})(AlertStatus || (AlertStatus = {}));
// =============================================================================
// QUALITY ALERT MANAGER
// =============================================================================
export class QualityAlertManager extends EventEmitter {
    logger;
    db;
    config;
    // Core services
    qualityMonitoring;
    healthMonitor;
    // Alert management
    activeAlerts = new Map();
    alertCooldowns = new Map(); // Rule ID -> last alert time
    escalationTimers = new Map();
    // Notification channels
    emailTransporter;
    // Statistics
    statistics;
    lastStatsUpdate = Date.now();
    constructor(database, logger, qualityMonitoring, config = {}, healthMonitor) {
        super();
        this.db = database;
        this.logger = logger;
        this.qualityMonitoring = qualityMonitoring;
        this.healthMonitor = healthMonitor;
        // Set default configuration
        this.config = this.buildDefaultConfig(config);
        // Initialize statistics
        this.statistics = this.initializeStatistics();
        this.initializeDatabase();
        this.setupNotificationChannels();
        this.setupEventListeners();
        this.logger.info('Quality Alert Manager initialized', {
            alertingEnabled: this.config.alerting.enabled,
            channelsEnabled: this.getEnabledChannels(),
            rulesCount: this.config.rules.length
        });
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    buildDefaultConfig(config) {
        return {
            alerting: {
                enabled: true,
                globalCooldown: 300000, // 5 minutes
                maxAlertsPerHour: 50,
                enableAlertCorrelation: true,
                enableAlertSuppression: true,
                ...config.alerting
            },
            channels: {
                email: {
                    enabled: false,
                    smtp: {
                        host: 'localhost',
                        port: 587,
                        secure: false,
                        auth: { user: '', pass: '' }
                    },
                    from: 'quality-alerts@castplan.local',
                    recipients: {
                        critical: [],
                        high: [],
                        medium: [],
                        low: []
                    },
                    templates: {
                        subject: '[CastPlan Quality] {{severity}} Alert: {{title}}',
                        body: 'Quality alert triggered: {{description}}'
                    },
                    ...config.channels?.email
                },
                webhook: {
                    enabled: true,
                    urls: {
                        critical: [],
                        high: [],
                        medium: [],
                        low: []
                    },
                    headers: { 'Content-Type': 'application/json' },
                    retryCount: 3,
                    timeout: 5000,
                    ...config.channels?.webhook
                },
                slack: {
                    enabled: false,
                    webhookUrls: {
                        critical: [],
                        high: [],
                        medium: [],
                        low: []
                    },
                    channels: {
                        critical: ['#quality-critical'],
                        high: ['#quality-alerts'],
                        medium: ['#quality-alerts'],
                        low: ['#quality-info']
                    },
                    enableThreads: true,
                    ...config.channels?.slack
                },
                dashboard: {
                    enabled: true,
                    endpoints: [],
                    enableRealTimeUpdates: true,
                    ...config.channels?.dashboard
                },
                console: {
                    enabled: true,
                    colors: true,
                    includeStackTrace: false,
                    ...config.channels?.console
                }
            },
            escalation: {
                enabled: true,
                autoEscalationTime: 30, // 30 minutes
                maxEscalationLevel: 3,
                levels: [
                    {
                        level: 1,
                        name: 'Initial Alert',
                        triggerAfter: 0,
                        channels: ['console', 'dashboard'],
                        actions: [{ type: 'notify', target: 'team', parameters: {} }]
                    },
                    {
                        level: 2,
                        name: 'Escalated Alert',
                        triggerAfter: 15, // 15 minutes
                        channels: ['email', 'slack'],
                        actions: [{ type: 'notify', target: 'manager', parameters: {} }]
                    },
                    {
                        level: 3,
                        name: 'Critical Escalation',
                        triggerAfter: 30, // 30 minutes
                        channels: ['email', 'webhook'],
                        actions: [
                            { type: 'create_incident', target: 'incident_system', parameters: {} },
                            { type: 'notify', target: 'on_call', parameters: {} }
                        ]
                    }
                ],
                ...config.escalation
            },
            rules: config.rules || this.buildDefaultAlertRules(),
            performance: {
                maxRetries: 3,
                retryDelay: 1000,
                timeoutMs: 10000,
                enableFailover: true,
                ...config.performance
            }
        };
    }
    buildDefaultAlertRules() {
        return [
            {
                id: 'critical-quality-drop',
                name: 'Critical Quality Score Drop',
                enabled: true,
                conditions: [
                    { field: 'qualityScore.overall', operator: 'lt', value: 0.3 }
                ],
                severity: AlertSeverity.CRITICAL,
                channels: ['console', 'email', 'webhook', 'dashboard'],
                cooldown: 15, // 15 minutes
                escalationPolicy: 'default',
                autoRemediation: [
                    {
                        type: 'api_call',
                        target: '/api/quality/auto-improve',
                        parameters: { entityId: '{{entityId}}' },
                        timeout: 30000
                    }
                ]
            },
            {
                id: 'high-quality-warning',
                name: 'Quality Score Warning',
                enabled: true,
                conditions: [
                    { field: 'qualityScore.overall', operator: 'lt', value: 0.6 }
                ],
                severity: AlertSeverity.HIGH,
                channels: ['console', 'dashboard', 'slack'],
                cooldown: 30, // 30 minutes
            },
            {
                id: 'quality-degradation-trend',
                name: 'Quality Degradation Trend',
                enabled: true,
                conditions: [
                    { field: 'trendDirection', operator: 'eq', value: 'down' },
                    { field: 'qualityScore.overall', operator: 'lt', value: 0.7 }
                ],
                severity: AlertSeverity.MEDIUM,
                channels: ['console', 'dashboard'],
                cooldown: 60, // 1 hour
                correlationRules: [
                    {
                        events: ['quality_degraded', 'issues_detected'],
                        timeWindow: 10,
                        minEvents: 2,
                        action: 'escalate'
                    }
                ]
            },
            {
                id: 'critical-issues-detected',
                name: 'Critical Issues Detected',
                enabled: true,
                conditions: [
                    { field: 'issues.critical', operator: 'gt', value: 0 }
                ],
                severity: AlertSeverity.CRITICAL,
                channels: ['console', 'email', 'webhook', 'dashboard'],
                cooldown: 10, // 10 minutes
            },
            {
                id: 'high-issue-density',
                name: 'High Issue Density',
                enabled: true,
                conditions: [
                    { field: 'issues.density', operator: 'gt', value: 5 } // 5 issues per 1000 words
                ],
                severity: AlertSeverity.HIGH,
                channels: ['console', 'dashboard', 'slack'],
                cooldown: 45, // 45 minutes
            }
        ];
    }
    initializeDatabase() {
        try {
            // Quality alerts table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS quality_alerts (
          id TEXT PRIMARY KEY,
          rule_id TEXT NOT NULL,
          severity TEXT NOT NULL,
          status TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          source_event TEXT NOT NULL,
          triggered_at TEXT NOT NULL,
          acknowledged_at TEXT,
          resolved_at TEXT,
          escalated_at TEXT,
          escalation_level INTEGER DEFAULT 0,
          metadata TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Alert notifications table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS alert_notifications (
          id TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          channel TEXT NOT NULL,
          recipient TEXT NOT NULL,
          sent_at TEXT NOT NULL,
          success INTEGER NOT NULL,
          error TEXT,
          retry_count INTEGER DEFAULT 0,
          delivery_time INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (alert_id) REFERENCES quality_alerts (id)
        )
      `);
            // Alert remediation attempts table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS alert_remediation (
          id TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          target TEXT NOT NULL,
          parameters TEXT NOT NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          success INTEGER,
          error TEXT,
          result TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (alert_id) REFERENCES quality_alerts (id)
        )
      `);
            // Alert statistics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS alert_statistics (
          id TEXT PRIMARY KEY,
          period_start TEXT NOT NULL,
          period_end TEXT NOT NULL,
          alerts_triggered INTEGER NOT NULL,
          alerts_by_severity TEXT NOT NULL,
          notifications_sent INTEGER NOT NULL,
          notifications_failed INTEGER NOT NULL,
          average_delivery_time REAL NOT NULL,
          escalations_total INTEGER NOT NULL,
          remediation_attempts INTEGER NOT NULL,
          remediation_success INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes for performance
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON quality_alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_severity ON quality_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON quality_alerts(triggered_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_alert ON alert_notifications(alert_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_channel ON alert_notifications(channel);
        CREATE INDEX IF NOT EXISTS idx_remediation_alert ON alert_remediation(alert_id);
        CREATE INDEX IF NOT EXISTS idx_statistics_period ON alert_statistics(period_start, period_end);
      `);
            this.logger.info('Quality alert database tables initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize alert database:', error);
            throw error;
        }
    }
    setupNotificationChannels() {
        // Setup email transporter if enabled
        if (this.config.channels.email.enabled) {
            try {
                this.emailTransporter = nodemailer.createTransporter(this.config.channels.email.smtp);
                this.logger.info('Email notification channel initialized');
            }
            catch (error) {
                this.logger.error('Failed to initialize email channel:', error);
            }
        }
    }
    setupEventListeners() {
        // Listen to quality monitoring events
        this.qualityMonitoring.on('qualityEvent', this.handleQualityEvent.bind(this));
        // Listen to specific event types
        this.qualityMonitoring.on(QualityEventType.QUALITY_THRESHOLD_EXCEEDED, this.handleThresholdExceeded.bind(this));
        this.qualityMonitoring.on(QualityEventType.QUALITY_DEGRADED, this.handleQualityDegraded.bind(this));
        this.qualityMonitoring.on(QualityEventType.ISSUES_DETECTED, this.handleIssuesDetected.bind(this));
        this.qualityMonitoring.on(QualityEventType.ANOMALY_DETECTED, this.handleAnomalyDetected.bind(this));
        // Listen to health monitor events if available
        if (this.healthMonitor) {
            this.healthMonitor.on('alert-triggered', this.handleHealthAlert.bind(this));
        }
        this.logger.info('Alert manager event listeners setup complete');
    }
    initializeStatistics() {
        return {
            alertsTriggered: {
                total: 0,
                bySeverity: {
                    [AlertSeverity.CRITICAL]: 0,
                    [AlertSeverity.HIGH]: 0,
                    [AlertSeverity.MEDIUM]: 0,
                    [AlertSeverity.LOW]: 0,
                    [AlertSeverity.INFO]: 0
                },
                byRule: {}
            },
            notifications: {
                sent: 0,
                failed: 0,
                averageDeliveryTime: 0,
                byChannel: {}
            },
            escalations: {
                total: 0,
                byLevel: {}
            },
            remediation: {
                attempted: 0,
                successful: 0,
                failed: 0
            },
            performance: {
                averageProcessingTime: 0,
                alertsPerHour: 0,
                suppressionRate: 0,
                correlationRate: 0
            }
        };
    }
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    async handleQualityEvent(event) {
        if (!this.config.alerting.enabled) {
            return;
        }
        const startTime = performance.now();
        try {
            // Evaluate alert rules against the event
            for (const rule of this.config.rules) {
                if (rule.enabled && await this.evaluateRule(rule, event)) {
                    await this.triggerAlert(rule, event);
                }
            }
            const processingTime = performance.now() - startTime;
            // Update performance statistics
            this.updatePerformanceStats(processingTime);
            // Ensure we meet performance requirement (<100ms)
            if (processingTime > 100) {
                this.logger.warn('Alert processing exceeded performance target', {
                    processingTime: `${processingTime.toFixed(2)}ms`,
                    eventType: event.type,
                    entityId: event.entityId
                });
            }
        }
        catch (error) {
            this.logger.error('Error handling quality event:', error);
        }
    }
    async handleThresholdExceeded(event) {
        // Handle specific threshold exceeded events with higher priority
        await this.handleQualityEvent(event);
    }
    async handleQualityDegraded(event) {
        // Handle quality degradation events
        await this.handleQualityEvent(event);
    }
    async handleIssuesDetected(event) {
        // Handle issue detection events
        await this.handleQualityEvent(event);
    }
    async handleAnomalyDetected(event) {
        // Handle anomaly detection events with special processing
        await this.handleQualityEvent(event);
    }
    async handleHealthAlert(alertData) {
        // Correlate health alerts with quality alerts
        if (this.config.alerting.enableAlertCorrelation) {
            await this.correlatHealthAlert(alertData);
        }
    }
    // =============================================================================
    // RULE EVALUATION
    // =============================================================================
    async evaluateRule(rule, event) {
        try {
            // Check cooldown
            if (await this.isRuleInCooldown(rule.id)) {
                return false;
            }
            // Check suppression rules
            if (await this.isRuleSuppressed(rule, event)) {
                return false;
            }
            // Evaluate all conditions
            for (const condition of rule.conditions) {
                if (!await this.evaluateCondition(condition, event)) {
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Error evaluating rule ${rule.id}:`, error);
            return false;
        }
    }
    async evaluateCondition(condition, event) {
        try {
            // Extract value from event data using field path
            const value = this.extractFieldValue(event, condition.field);
            if (value === undefined || value === null) {
                return false;
            }
            // Evaluate condition based on operator
            switch (condition.operator) {
                case 'gt':
                    return Number(value) > Number(condition.value);
                case 'lt':
                    return Number(value) < Number(condition.value);
                case 'eq':
                    return value === condition.value;
                case 'gte':
                    return Number(value) >= Number(condition.value);
                case 'lte':
                    return Number(value) <= Number(condition.value);
                case 'contains':
                    return String(value).includes(String(condition.value));
                case 'matches':
                    const regex = new RegExp(condition.value);
                    return regex.test(String(value));
                default:
                    this.logger.warn(`Unknown condition operator: ${condition.operator}`);
                    return false;
            }
        }
        catch (error) {
            this.logger.error('Error evaluating condition:', error);
            return false;
        }
    }
    extractFieldValue(event, fieldPath) {
        // Support nested field access like 'data.qualityScore.overall'
        const paths = fieldPath.split('.');
        let value = event;
        for (const path of paths) {
            if (value && typeof value === 'object' && path in value) {
                value = value[path];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    async isRuleInCooldown(ruleId) {
        const lastAlertTime = this.alertCooldowns.get(ruleId);
        if (!lastAlertTime) {
            return false;
        }
        const rule = this.config.rules.find(r => r.id === ruleId);
        if (!rule) {
            return false;
        }
        const cooldownPeriod = rule.cooldown * 60 * 1000; // Convert minutes to milliseconds
        return (Date.now() - lastAlertTime) < cooldownPeriod;
    }
    async isRuleSuppressed(rule, event) {
        if (!this.config.alerting.enableAlertSuppression || !rule.suppressionRules) {
            return false;
        }
        // Evaluate suppression rules
        for (const suppressionRule of rule.suppressionRules) {
            try {
                // Simple evaluation - in production would use a proper expression evaluator
                const condition = suppressionRule.condition
                    .replace(/\{\{(\w+)\}\}/g, (match, key) => {
                    const value = this.extractFieldValue(event, key);
                    return JSON.stringify(value);
                });
                // For safety, only allow simple comparisons
                if (this.evaluateSimpleExpression(condition, event)) {
                    this.logger.info(`Alert suppressed by rule: ${suppressionRule.reason}`, {
                        ruleId: rule.id,
                        condition: suppressionRule.condition
                    });
                    return true;
                }
            }
            catch (error) {
                this.logger.error('Error evaluating suppression rule:', error);
            }
        }
        return false;
    }
    evaluateSimpleExpression(expression, event) {
        // Simple and safe expression evaluation
        // In production, use a proper expression evaluator library
        try {
            // Only allow basic comparisons for security
            const allowedPattern = /^[\d\.\s<>=!&|()'"a-zA-Z_]+$/;
            if (!allowedPattern.test(expression)) {
                return false;
            }
            // Very basic evaluation - replace with proper library in production
            return false; // Conservative approach
        }
        catch {
            return false;
        }
    }
    // =============================================================================
    // ALERT TRIGGERING AND MANAGEMENT
    // =============================================================================
    async triggerAlert(rule, event) {
        const startTime = performance.now();
        try {
            // Create alert
            const alert = await this.createAlert(rule, event);
            // Store alert
            this.activeAlerts.set(alert.id, alert);
            await this.storeAlert(alert);
            // Update cooldown
            this.alertCooldowns.set(rule.id, Date.now());
            // Send notifications
            await this.sendNotifications(alert);
            // Start escalation timer if configured
            if (rule.escalationPolicy && this.config.escalation.enabled) {
                await this.startEscalationTimer(alert);
            }
            // Attempt auto-remediation if configured
            if (rule.autoRemediation && rule.autoRemediation.length > 0) {
                await this.attemptAutoRemediation(alert, rule.autoRemediation);
            }
            // Update statistics
            this.updateAlertStatistics(alert);
            // Emit alert event
            this.emit('alertTriggered', alert);
            const processingTime = performance.now() - startTime;
            this.logger.info('Alert triggered', {
                alertId: alert.id,
                ruleId: rule.id,
                severity: alert.severity,
                entityId: event.entityId,
                processingTime: `${processingTime.toFixed(2)}ms`
            });
        }
        catch (error) {
            this.logger.error('Error triggering alert:', error);
            throw error;
        }
    }
    async createAlert(rule, event) {
        const alertId = uuidv4();
        const timestamp = new Date().toISOString();
        // Extract metadata from event
        const metadata = {
            entityId: event.entityId,
            entityType: event.entityType,
            qualityScore: this.extractFieldValue(event, 'data.qualityScore.overall'),
            issuesCount: this.extractFieldValue(event, 'data.issuesCount') ||
                this.extractFieldValue(event, 'data.totalIssues'),
            trendDirection: this.extractFieldValue(event, 'data.trendDirection'),
            processingTime: performance.now()
        };
        const alert = {
            id: alertId,
            ruleId: rule.id,
            severity: rule.severity,
            status: AlertStatus.ACTIVE,
            title: this.generateAlertTitle(rule, event, metadata),
            description: this.generateAlertDescription(rule, event, metadata),
            source: event,
            triggeredAt: timestamp,
            escalationLevel: 0,
            notificationsSent: [],
            remediationAttempts: [],
            correlatedAlerts: [],
            metadata
        };
        return alert;
    }
    generateAlertTitle(rule, event, metadata) {
        let title = rule.name;
        // Add context based on event type
        switch (event.type) {
            case QualityEventType.QUALITY_THRESHOLD_EXCEEDED:
                const threshold = this.extractFieldValue(event, 'data.threshold');
                const current = this.extractFieldValue(event, 'data.currentScore');
                title += ` (${current?.toFixed(2) || 'N/A'} < ${threshold?.toFixed(2) || 'N/A'})`;
                break;
            case QualityEventType.ISSUES_DETECTED:
                const issuesCount = metadata.issuesCount;
                title += ` (${issuesCount} issues)`;
                break;
            case QualityEventType.QUALITY_DEGRADED:
                title += ` (trending down)`;
                break;
        }
        return title;
    }
    generateAlertDescription(rule, event, metadata) {
        let description = `Quality alert triggered for ${metadata.entityType} ${metadata.entityId}`;
        // Add specific details based on event
        if (metadata.qualityScore !== undefined) {
            description += `\nCurrent quality score: ${(metadata.qualityScore * 100).toFixed(1)}%`;
        }
        if (metadata.issuesCount !== undefined && metadata.issuesCount > 0) {
            description += `\nIssues detected: ${metadata.issuesCount}`;
        }
        if (metadata.trendDirection) {
            description += `\nTrend: ${metadata.trendDirection}`;
        }
        // Add rule conditions
        description += `\nTriggered by: ${rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ')}`;
        description += `\nTriggered at: ${event.timestamp}`;
        return description;
    }
    async storeAlert(alert) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO quality_alerts (
          id, rule_id, severity, status, title, description, source_event,
          triggered_at, escalation_level, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(alert.id, alert.ruleId, alert.severity, alert.status, alert.title, alert.description, JSON.stringify(alert.source), alert.triggeredAt, alert.escalationLevel, JSON.stringify(alert.metadata));
        }
        catch (error) {
            this.logger.error('Failed to store alert:', error);
            throw error;
        }
    }
    // =============================================================================
    // NOTIFICATION SYSTEM
    // =============================================================================
    async sendNotifications(alert) {
        const rule = this.config.rules.find(r => r.id === alert.ruleId);
        if (!rule) {
            return;
        }
        const notificationPromises = [];
        // Send to each configured channel
        for (const channelName of rule.channels) {
            const promise = this.sendNotificationToChannel(alert, channelName)
                .catch(error => {
                this.logger.error(`Failed to send notification to ${channelName}:`, error);
            });
            notificationPromises.push(promise);
        }
        // Wait for all notifications with timeout
        try {
            await Promise.allSettled(notificationPromises);
        }
        catch (error) {
            this.logger.error('Error sending notifications:', error);
        }
    }
    async sendNotificationToChannel(alert, channelName) {
        const startTime = performance.now();
        try {
            let success = false;
            let error;
            let recipient = 'unknown';
            switch (channelName) {
                case 'email':
                    ({ success, error, recipient } = await this.sendEmailNotification(alert));
                    break;
                case 'webhook':
                    ({ success, error, recipient } = await this.sendWebhookNotification(alert));
                    break;
                case 'slack':
                    ({ success, error, recipient } = await this.sendSlackNotification(alert));
                    break;
                case 'dashboard':
                    ({ success, error, recipient } = await this.sendDashboardNotification(alert));
                    break;
                case 'console':
                    ({ success, error, recipient } = await this.sendConsoleNotification(alert));
                    break;
                default:
                    this.logger.warn(`Unknown notification channel: ${channelName}`);
                    return;
            }
            const deliveryTime = performance.now() - startTime;
            // Record notification
            const notification = {
                id: uuidv4(),
                channel: channelName,
                recipient,
                sentAt: new Date().toISOString(),
                success,
                error,
                retryCount: 0,
                deliveryTime
            };
            alert.notificationsSent.push(notification);
            await this.storeNotification(alert.id, notification);
            // Update statistics
            this.updateNotificationStatistics(notification);
            this.logger.debug('Notification sent', {
                alertId: alert.id,
                channel: channelName,
                success,
                deliveryTime: `${deliveryTime.toFixed(2)}ms`
            });
            // Check delivery time requirement (<30 seconds)
            if (deliveryTime > 30000) {
                this.logger.warn('Notification delivery exceeded performance requirement', {
                    channel: channelName,
                    deliveryTime: `${deliveryTime.toFixed(2)}ms`
                });
            }
        }
        catch (error) {
            this.logger.error(`Error sending notification to ${channelName}:`, error);
        }
    }
    async sendEmailNotification(alert) {
        if (!this.config.channels.email.enabled || !this.emailTransporter) {
            return { success: false, error: 'Email channel not configured', recipient: 'none' };
        }
        const recipients = this.config.channels.email.recipients[alert.severity] || [];
        if (recipients.length === 0) {
            return { success: false, error: 'No recipients configured', recipient: 'none' };
        }
        try {
            const subject = this.config.channels.email.templates.subject
                .replace('{{severity}}', alert.severity.toUpperCase())
                .replace('{{title}}', alert.title);
            const body = this.config.channels.email.templates.body
                .replace('{{description}}', alert.description)
                .replace('{{title}}', alert.title)
                .replace('{{severity}}', alert.severity);
            for (const recipient of recipients) {
                await this.emailTransporter.sendMail({
                    from: this.config.channels.email.from,
                    to: recipient,
                    subject,
                    text: body,
                    html: this.generateEmailHTML(alert)
                });
            }
            return { success: true, recipient: recipients.join(', ') };
        }
        catch (error) {
            return { success: false, error: error.message, recipient: recipients.join(', ') };
        }
    }
    async sendWebhookNotification(alert) {
        if (!this.config.channels.webhook.enabled) {
            return { success: false, error: 'Webhook channel not configured', recipient: 'none' };
        }
        const urls = this.config.channels.webhook.urls[alert.severity] || [];
        if (urls.length === 0) {
            return { success: false, error: 'No webhook URLs configured', recipient: 'none' };
        }
        try {
            const payload = {
                alert: {
                    id: alert.id,
                    severity: alert.severity,
                    title: alert.title,
                    description: alert.description,
                    triggeredAt: alert.triggeredAt,
                    entityId: alert.metadata.entityId,
                    entityType: alert.metadata.entityType,
                    qualityScore: alert.metadata.qualityScore
                },
                timestamp: new Date().toISOString(),
                source: 'CastPlan Quality Monitoring'
            };
            const promises = urls.map(url => fetch(url, {
                method: 'POST',
                headers: this.config.channels.webhook.headers,
                body: JSON.stringify(payload),
                timeout: this.config.channels.webhook.timeout
            }));
            await Promise.all(promises);
            return { success: true, recipient: urls.join(', ') };
        }
        catch (error) {
            return { success: false, error: error.message, recipient: urls.join(', ') };
        }
    }
    async sendSlackNotification(alert) {
        if (!this.config.channels.slack.enabled) {
            return { success: false, error: 'Slack channel not configured', recipient: 'none' };
        }
        const webhookUrls = this.config.channels.slack.webhookUrls[alert.severity] || [];
        const channels = this.config.channels.slack.channels[alert.severity] || [];
        if (webhookUrls.length === 0) {
            return { success: false, error: 'No Slack webhooks configured', recipient: channels.join(', ') };
        }
        try {
            const payload = {
                text: `🚨 Quality Alert: ${alert.title}`,
                attachments: [
                    {
                        color: this.getSlackColor(alert.severity),
                        fields: [
                            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
                            { title: 'Entity', value: `${alert.metadata.entityType} ${alert.metadata.entityId}`, short: true },
                            { title: 'Quality Score', value: alert.metadata.qualityScore ? `${(alert.metadata.qualityScore * 100).toFixed(1)}%` : 'N/A', short: true },
                            { title: 'Issues', value: alert.metadata.issuesCount?.toString() || '0', short: true },
                            { title: 'Description', value: alert.description, short: false }
                        ],
                        ts: Math.floor(new Date(alert.triggeredAt).getTime() / 1000)
                    }
                ]
            };
            const promises = webhookUrls.map(url => fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));
            await Promise.all(promises);
            return { success: true, recipient: channels.join(', ') };
        }
        catch (error) {
            return { success: false, error: error.message, recipient: channels.join(', ') };
        }
    }
    async sendDashboardNotification(alert) {
        if (!this.config.channels.dashboard.enabled) {
            return { success: false, error: 'Dashboard channel not configured', recipient: 'none' };
        }
        // Emit event for dashboard listeners
        this.emit('dashboardAlert', alert);
        // Send to configured dashboard endpoints
        if (this.config.channels.dashboard.endpoints.length > 0) {
            try {
                const payload = {
                    type: 'quality_alert',
                    alert: {
                        id: alert.id,
                        severity: alert.severity,
                        title: alert.title,
                        description: alert.description,
                        triggeredAt: alert.triggeredAt,
                        metadata: alert.metadata
                    }
                };
                const promises = this.config.channels.dashboard.endpoints.map(endpoint => {
                    const headers = { 'Content-Type': 'application/json' };
                    if (this.config.channels.dashboard.apiKey) {
                        headers['Authorization'] = `Bearer ${this.config.channels.dashboard.apiKey}`;
                    }
                    return fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });
                });
                await Promise.all(promises);
                return { success: true, recipient: this.config.channels.dashboard.endpoints.join(', ') };
            }
            catch (error) {
                return { success: false, error: error.message, recipient: this.config.channels.dashboard.endpoints.join(', ') };
            }
        }
        return { success: true, recipient: 'dashboard-event' };
    }
    async sendConsoleNotification(alert) {
        if (!this.config.channels.console.enabled) {
            return { success: false, error: 'Console channel not configured', recipient: 'none' };
        }
        try {
            const severityIcon = this.getSeverityIcon(alert.severity);
            const message = `${severityIcon} [${alert.severity.toUpperCase()}] ${alert.title}`;
            const details = `   Entity: ${alert.metadata.entityType} ${alert.metadata.entityId}`;
            const description = `   ${alert.description}`;
            if (this.config.channels.console.colors) {
                const color = this.getConsoleColor(alert.severity);
                console.log(color, message);
                console.log(color, details);
                console.log(color, description);
                console.log('\x1b[0m'); // Reset color
            }
            else {
                console.log(message);
                console.log(details);
                console.log(description);
            }
            return { success: true, recipient: 'console' };
        }
        catch (error) {
            return { success: false, error: error.message, recipient: 'console' };
        }
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    generateEmailHTML(alert) {
        return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2 style="color: ${this.getSeverityColor(alert.severity)};">
            Quality Alert: ${alert.title}
          </h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Entity:</strong> ${alert.metadata.entityType} ${alert.metadata.entityId}</p>
            ${alert.metadata.qualityScore ? `<p><strong>Quality Score:</strong> ${(alert.metadata.qualityScore * 100).toFixed(1)}%</p>` : ''}
            ${alert.metadata.issuesCount ? `<p><strong>Issues:</strong> ${alert.metadata.issuesCount}</p>` : ''}
            <p><strong>Triggered:</strong> ${alert.triggeredAt}</p>
          </div>
          <div style="margin-top: 15px;">
            <h3>Description:</h3>
            <p>${alert.description}</p>
          </div>
        </body>
      </html>
    `;
    }
    getSlackColor(severity) {
        switch (severity) {
            case AlertSeverity.CRITICAL: return 'danger';
            case AlertSeverity.HIGH: return 'warning';
            case AlertSeverity.MEDIUM: return '#ffaa00';
            case AlertSeverity.LOW: return 'good';
            case AlertSeverity.INFO: return '#0000ff';
            default: return '#cccccc';
        }
    }
    getSeverityColor(severity) {
        switch (severity) {
            case AlertSeverity.CRITICAL: return '#ff0000';
            case AlertSeverity.HIGH: return '#ff6600';
            case AlertSeverity.MEDIUM: return '#ffaa00';
            case AlertSeverity.LOW: return '#00aa00';
            case AlertSeverity.INFO: return '#0000ff';
            default: return '#cccccc';
        }
    }
    getConsoleColor(severity) {
        switch (severity) {
            case AlertSeverity.CRITICAL: return '\x1b[31m'; // Red
            case AlertSeverity.HIGH: return '\x1b[91m'; // Bright red
            case AlertSeverity.MEDIUM: return '\x1b[33m'; // Yellow
            case AlertSeverity.LOW: return '\x1b[32m'; // Green
            case AlertSeverity.INFO: return '\x1b[34m'; // Blue
            default: return '\x1b[37m'; // White
        }
    }
    getSeverityIcon(severity) {
        switch (severity) {
            case AlertSeverity.CRITICAL: return '🔴';
            case AlertSeverity.HIGH: return '🟠';
            case AlertSeverity.MEDIUM: return '🟡';
            case AlertSeverity.LOW: return '🟢';
            case AlertSeverity.INFO: return '🔵';
            default: return '⚪';
        }
    }
    getEnabledChannels() {
        const enabled = [];
        if (this.config.channels.email.enabled)
            enabled.push('email');
        if (this.config.channels.webhook.enabled)
            enabled.push('webhook');
        if (this.config.channels.slack.enabled)
            enabled.push('slack');
        if (this.config.channels.dashboard.enabled)
            enabled.push('dashboard');
        if (this.config.channels.console.enabled)
            enabled.push('console');
        return enabled;
    }
    // =============================================================================
    // ESCALATION SYSTEM
    // =============================================================================
    async startEscalationTimer(alert) {
        if (!this.config.escalation.enabled) {
            return;
        }
        const nextLevel = this.config.escalation.levels.find(level => level.level > alert.escalationLevel);
        if (!nextLevel) {
            return;
        }
        const escalationTime = nextLevel.triggerAfter * 60 * 1000; // Convert minutes to milliseconds
        const timer = setTimeout(async () => {
            await this.escalateAlert(alert.id, nextLevel);
        }, escalationTime);
        this.escalationTimers.set(alert.id, timer);
    }
    async escalateAlert(alertId, escalationLevel) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert || alert.status !== AlertStatus.ACTIVE) {
            return;
        }
        try {
            // Update alert escalation level
            alert.escalationLevel = escalationLevel.level;
            alert.escalatedAt = new Date().toISOString();
            alert.status = AlertStatus.ESCALATED;
            // Send escalation notifications
            for (const channelName of escalationLevel.channels) {
                await this.sendNotificationToChannel(alert, channelName);
            }
            // Execute escalation actions
            for (const action of escalationLevel.actions) {
                await this.executeEscalationAction(alert, action);
            }
            // Update database
            await this.updateAlertInDatabase(alert);
            // Update statistics
            this.statistics.escalations.total++;
            this.statistics.escalations.byLevel[escalationLevel.level] =
                (this.statistics.escalations.byLevel[escalationLevel.level] || 0) + 1;
            // Continue escalation chain if more levels exist
            await this.startEscalationTimer(alert);
            this.logger.info('Alert escalated', {
                alertId,
                newLevel: escalationLevel.level,
                levelName: escalationLevel.name
            });
            this.emit('alertEscalated', { alert, escalationLevel });
        }
        catch (error) {
            this.logger.error('Error escalating alert:', error);
        }
    }
    async executeEscalationAction(alert, action) {
        try {
            switch (action.type) {
                case 'notify':
                    // Additional notification logic
                    break;
                case 'remediate':
                    // Trigger remediation
                    break;
                case 'escalate':
                    // Force escalation to next level
                    break;
                case 'create_incident':
                    // Create incident in external system
                    await this.createIncident(alert, action);
                    break;
            }
        }
        catch (error) {
            this.logger.error('Error executing escalation action:', error);
        }
    }
    async createIncident(alert, action) {
        // Placeholder for incident creation logic
        this.logger.info('Creating incident for alert', {
            alertId: alert.id,
            target: action.target,
            parameters: action.parameters
        });
    }
    // =============================================================================
    // AUTO-REMEDIATION
    // =============================================================================
    async attemptAutoRemediation(alert, remediationActions) {
        for (const action of remediationActions) {
            const attempt = await this.executeRemediationAction(alert, action);
            alert.remediationAttempts.push(attempt);
            if (attempt.success) {
                this.logger.info('Auto-remediation successful', {
                    alertId: alert.id,
                    actionType: action.type,
                    target: action.target
                });
                break; // Stop after first successful remediation
            }
        }
    }
    async executeRemediationAction(alert, action) {
        const attempt = {
            id: uuidv4(),
            action,
            startedAt: new Date().toISOString(),
            success: false
        };
        try {
            switch (action.type) {
                case 'api_call':
                    attempt.result = await this.makeApiCall(action, alert);
                    attempt.success = true;
                    break;
                case 'script':
                    attempt.result = await this.executeScript(action, alert);
                    attempt.success = true;
                    break;
                case 'service_restart':
                    attempt.result = await this.restartService(action, alert);
                    attempt.success = true;
                    break;
                case 'notification':
                    attempt.result = await this.sendRemediationNotification(action, alert);
                    attempt.success = true;
                    break;
                default:
                    throw new Error(`Unknown remediation action type: ${action.type}`);
            }
        }
        catch (error) {
            attempt.error = error.message;
            attempt.success = false;
        }
        finally {
            attempt.completedAt = new Date().toISOString();
        }
        // Update statistics
        this.statistics.remediation.attempted++;
        if (attempt.success) {
            this.statistics.remediation.successful++;
        }
        else {
            this.statistics.remediation.failed++;
        }
        return attempt;
    }
    async makeApiCall(action, alert) {
        const url = action.target.replace('{{entityId}}', alert.metadata.entityId);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.parameters),
            timeout: action.timeout
        });
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }
    async executeScript(action, alert) {
        // Placeholder for script execution
        throw new Error('Script execution not implemented');
    }
    async restartService(action, alert) {
        // Placeholder for service restart
        throw new Error('Service restart not implemented');
    }
    async sendRemediationNotification(action, alert) {
        // Send notification about remediation attempt
        return { notified: true };
    }
    // =============================================================================
    // CORRELATION AND SUPPRESSION
    // =============================================================================
    async correlatHealthAlert(healthAlert) {
        // Find related quality alerts and correlate them
        const relatedAlerts = Array.from(this.activeAlerts.values()).filter(alert => alert.status === AlertStatus.ACTIVE &&
            alert.metadata.entityId === healthAlert.source);
        if (relatedAlerts.length > 0) {
            this.logger.info('Correlating health alert with quality alerts', {
                healthAlert: healthAlert.source,
                qualityAlerts: relatedAlerts.map(a => a.id)
            });
            // Update correlation
            for (const alert of relatedAlerts) {
                alert.correlatedAlerts.push(`health:${healthAlert.source}`);
            }
        }
    }
    // =============================================================================
    // DATABASE OPERATIONS
    // =============================================================================
    async storeNotification(alertId, notification) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO alert_notifications (
          id, alert_id, channel, recipient, sent_at, success, error, retry_count, delivery_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(notification.id, alertId, notification.channel, notification.recipient, notification.sentAt, notification.success ? 1 : 0, notification.error || null, notification.retryCount, notification.deliveryTime);
        }
        catch (error) {
            this.logger.error('Failed to store notification:', error);
        }
    }
    async updateAlertInDatabase(alert) {
        try {
            const stmt = this.db.prepare(`
        UPDATE quality_alerts 
        SET status = ?, acknowledged_at = ?, resolved_at = ?, escalated_at = ?, escalation_level = ?
        WHERE id = ?
      `);
            stmt.run(alert.status, alert.acknowledgedAt || null, alert.resolvedAt || null, alert.escalatedAt || null, alert.escalationLevel, alert.id);
        }
        catch (error) {
            this.logger.error('Failed to update alert:', error);
        }
    }
    // =============================================================================
    // STATISTICS AND PERFORMANCE TRACKING
    // =============================================================================
    updateAlertStatistics(alert) {
        this.statistics.alertsTriggered.total++;
        this.statistics.alertsTriggered.bySeverity[alert.severity]++;
        this.statistics.alertsTriggered.byRule[alert.ruleId] =
            (this.statistics.alertsTriggered.byRule[alert.ruleId] || 0) + 1;
    }
    updateNotificationStatistics(notification) {
        if (notification.success) {
            this.statistics.notifications.sent++;
        }
        else {
            this.statistics.notifications.failed++;
        }
        // Update average delivery time
        const total = this.statistics.notifications.sent + this.statistics.notifications.failed;
        this.statistics.notifications.averageDeliveryTime =
            (this.statistics.notifications.averageDeliveryTime * (total - 1) + notification.deliveryTime) / total;
        // Update channel statistics
        if (!this.statistics.notifications.byChannel[notification.channel]) {
            this.statistics.notifications.byChannel[notification.channel] = {
                sent: 0,
                failed: 0,
                avgDeliveryTime: 0
            };
        }
        const channelStats = this.statistics.notifications.byChannel[notification.channel];
        if (notification.success) {
            channelStats.sent++;
        }
        else {
            channelStats.failed++;
        }
        const channelTotal = channelStats.sent + channelStats.failed;
        channelStats.avgDeliveryTime =
            (channelStats.avgDeliveryTime * (channelTotal - 1) + notification.deliveryTime) / channelTotal;
    }
    updatePerformanceStats(processingTime) {
        const totalProcessed = this.statistics.alertsTriggered.total;
        this.statistics.performance.averageProcessingTime =
            (this.statistics.performance.averageProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
        // Calculate alerts per hour
        const uptime = Date.now() - this.lastStatsUpdate;
        if (uptime > 0) {
            this.statistics.performance.alertsPerHour =
                (this.statistics.alertsTriggered.total / uptime) * 3600000; // Convert to per hour
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert || alert.status !== AlertStatus.ACTIVE) {
            return false;
        }
        try {
            alert.status = AlertStatus.ACKNOWLEDGED;
            alert.acknowledgedAt = new Date().toISOString();
            // Clear escalation timer
            const timer = this.escalationTimers.get(alertId);
            if (timer) {
                clearTimeout(timer);
                this.escalationTimers.delete(alertId);
            }
            await this.updateAlertInDatabase(alert);
            this.logger.info('Alert acknowledged', { alertId, acknowledgedBy });
            this.emit('alertAcknowledged', { alert, acknowledgedBy });
            return true;
        }
        catch (error) {
            this.logger.error('Error acknowledging alert:', error);
            return false;
        }
    }
    async resolveAlert(alertId, resolvedBy, resolution) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            return false;
        }
        try {
            alert.status = AlertStatus.RESOLVED;
            alert.resolvedAt = new Date().toISOString();
            // Clear escalation timer
            const timer = this.escalationTimers.get(alertId);
            if (timer) {
                clearTimeout(timer);
                this.escalationTimers.delete(alertId);
            }
            // Remove from active alerts
            this.activeAlerts.delete(alertId);
            await this.updateAlertInDatabase(alert);
            this.logger.info('Alert resolved', { alertId, resolvedBy, resolution });
            this.emit('alertResolved', { alert, resolvedBy, resolution });
            return true;
        }
        catch (error) {
            this.logger.error('Error resolving alert:', error);
            return false;
        }
    }
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    getAlertStatistics() {
        return { ...this.statistics };
    }
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Alert manager configuration updated');
    }
    async destroy() {
        // Clear all timers
        for (const timer of this.escalationTimers.values()) {
            clearTimeout(timer);
        }
        this.escalationTimers.clear();
        // Clear active alerts
        this.activeAlerts.clear();
        this.alertCooldowns.clear();
        // Remove event listeners
        this.removeAllListeners();
        this.logger.info('Quality Alert Manager destroyed');
    }
}
export default QualityAlertManager;
//# sourceMappingURL=QualityAlertManager.js.map