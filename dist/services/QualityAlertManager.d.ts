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
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualityEvent, QualityMonitoringService } from './QualityMonitoringService';
import { HealthMonitor } from '../utils/HealthMonitor';
export interface QualityAlertConfig {
    /** Alert system configuration */
    alerting: {
        enabled: boolean;
        globalCooldown: number;
        maxAlertsPerHour: number;
        enableAlertCorrelation: boolean;
        enableAlertSuppression: boolean;
    };
    /** Notification channels configuration */
    channels: {
        email: EmailChannelConfig;
        webhook: WebhookChannelConfig;
        slack: SlackChannelConfig;
        dashboard: DashboardChannelConfig;
        console: ConsoleChannelConfig;
    };
    /** Escalation policies */
    escalation: EscalationPolicyConfig;
    /** Alert rules and thresholds */
    rules: AlertRuleConfig[];
    /** Performance and reliability settings */
    performance: {
        maxRetries: number;
        retryDelay: number;
        timeoutMs: number;
        enableFailover: boolean;
    };
}
export interface EmailChannelConfig {
    enabled: boolean;
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
    from: string;
    recipients: {
        critical: string[];
        high: string[];
        medium: string[];
        low: string[];
    };
    templates: {
        subject: string;
        body: string;
    };
}
export interface WebhookChannelConfig {
    enabled: boolean;
    urls: {
        critical: string[];
        high: string[];
        medium: string[];
        low: string[];
    };
    headers: Record<string, string>;
    retryCount: number;
    timeout: number;
}
export interface SlackChannelConfig {
    enabled: boolean;
    webhookUrls: {
        critical: string[];
        high: string[];
        medium: string[];
        low: string[];
    };
    channels: {
        critical: string[];
        high: string[];
        medium: string[];
        low: string[];
    };
    botToken?: string;
    enableThreads: boolean;
}
export interface DashboardChannelConfig {
    enabled: boolean;
    endpoints: string[];
    apiKey?: string;
    enableRealTimeUpdates: boolean;
}
export interface ConsoleChannelConfig {
    enabled: boolean;
    colors: boolean;
    includeStackTrace: boolean;
}
export interface EscalationPolicyConfig {
    enabled: boolean;
    levels: EscalationLevel[];
    autoEscalationTime: number;
    maxEscalationLevel: number;
}
export interface EscalationLevel {
    level: number;
    name: string;
    triggerAfter: number;
    channels: string[];
    actions: EscalationAction[];
}
export interface EscalationAction {
    type: 'notify' | 'remediate' | 'escalate' | 'create_incident';
    target: string;
    parameters: Record<string, any>;
}
export interface AlertRuleConfig {
    id: string;
    name: string;
    enabled: boolean;
    conditions: AlertCondition[];
    severity: AlertSeverity;
    channels: string[];
    cooldown: number;
    escalationPolicy?: string;
    suppressionRules?: SuppressionRule[];
    correlationRules?: CorrelationRule[];
    autoRemediation?: RemediationAction[];
}
export interface AlertCondition {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'matches';
    value: any;
    timeWindow?: number;
}
export interface SuppressionRule {
    condition: string;
    duration: number;
    reason: string;
}
export interface CorrelationRule {
    events: string[];
    timeWindow: number;
    minEvents: number;
    action: 'suppress' | 'merge' | 'escalate';
}
export interface RemediationAction {
    type: 'script' | 'api_call' | 'service_restart' | 'notification';
    target: string;
    parameters: Record<string, any>;
    timeout: number;
}
export declare enum AlertSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
export declare enum AlertStatus {
    ACTIVE = "active",
    ACKNOWLEDGED = "acknowledged",
    RESOLVED = "resolved",
    SUPPRESSED = "suppressed",
    ESCALATED = "escalated"
}
export interface QualityAlert {
    id: string;
    ruleId: string;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    description: string;
    source: QualityEvent;
    triggeredAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    escalatedAt?: string;
    escalationLevel: number;
    notificationsSent: NotificationRecord[];
    remediationAttempts: RemediationAttempt[];
    correlatedAlerts: string[];
    metadata: {
        entityId: string;
        entityType: string;
        qualityScore?: number;
        issuesCount?: number;
        trendDirection?: string;
        processingTime: number;
    };
}
export interface NotificationRecord {
    id: string;
    channel: string;
    recipient: string;
    sentAt: string;
    success: boolean;
    error?: string;
    retryCount: number;
    deliveryTime: number;
}
export interface RemediationAttempt {
    id: string;
    action: RemediationAction;
    startedAt: string;
    completedAt?: string;
    success: boolean;
    error?: string;
    result?: any;
}
export interface AlertStatistics {
    alertsTriggered: {
        total: number;
        bySeverity: Record<AlertSeverity, number>;
        byRule: Record<string, number>;
    };
    notifications: {
        sent: number;
        failed: number;
        averageDeliveryTime: number;
        byChannel: Record<string, {
            sent: number;
            failed: number;
            avgDeliveryTime: number;
        }>;
    };
    escalations: {
        total: number;
        byLevel: Record<number, number>;
    };
    remediation: {
        attempted: number;
        successful: number;
        failed: number;
    };
    performance: {
        averageProcessingTime: number;
        alertsPerHour: number;
        suppressionRate: number;
        correlationRate: number;
    };
}
export declare class QualityAlertManager extends EventEmitter {
    private logger;
    private db;
    private config;
    private qualityMonitoring;
    private healthMonitor?;
    private activeAlerts;
    private alertCooldowns;
    private escalationTimers;
    private emailTransporter?;
    private statistics;
    private lastStatsUpdate;
    constructor(database: Database.Database, logger: Logger, qualityMonitoring: QualityMonitoringService, config?: Partial<QualityAlertConfig>, healthMonitor?: HealthMonitor);
    private buildDefaultConfig;
    private buildDefaultAlertRules;
    private initializeDatabase;
    private setupNotificationChannels;
    private setupEventListeners;
    private initializeStatistics;
    private handleQualityEvent;
    private handleThresholdExceeded;
    private handleQualityDegraded;
    private handleIssuesDetected;
    private handleAnomalyDetected;
    private handleHealthAlert;
    private evaluateRule;
    private evaluateCondition;
    private extractFieldValue;
    private isRuleInCooldown;
    private isRuleSuppressed;
    private evaluateSimpleExpression;
    private triggerAlert;
    private createAlert;
    private generateAlertTitle;
    private generateAlertDescription;
    private storeAlert;
    private sendNotifications;
    private sendNotificationToChannel;
    private sendEmailNotification;
    private sendWebhookNotification;
    private sendSlackNotification;
    private sendDashboardNotification;
    private sendConsoleNotification;
    private generateEmailHTML;
    private getSlackColor;
    private getSeverityColor;
    private getConsoleColor;
    private getSeverityIcon;
    private getEnabledChannels;
    private startEscalationTimer;
    private escalateAlert;
    private executeEscalationAction;
    private createIncident;
    private attemptAutoRemediation;
    private executeRemediationAction;
    private makeApiCall;
    private executeScript;
    private restartService;
    private sendRemediationNotification;
    private correlatHealthAlert;
    private storeNotification;
    private updateAlertInDatabase;
    private updateAlertStatistics;
    private updateNotificationStatistics;
    private updatePerformanceStats;
    acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean>;
    resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<boolean>;
    getActiveAlerts(): QualityAlert[];
    getAlertStatistics(): AlertStatistics;
    updateConfiguration(newConfig: Partial<QualityAlertConfig>): void;
    destroy(): Promise<void>;
}
export default QualityAlertManager;
//# sourceMappingURL=QualityAlertManager.d.ts.map