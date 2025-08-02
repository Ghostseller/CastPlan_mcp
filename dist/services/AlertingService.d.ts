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
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService.ts';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';
export type AlertCategory = 'system' | 'application' | 'security' | 'performance' | 'business';
export interface Alert {
    id: string;
    title: string;
    description: string;
    severity: AlertSeverity;
    status: AlertStatus;
    category: AlertCategory;
    source: string;
    metric?: string;
    value?: number;
    threshold?: number;
    timestamp: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    suppressedUntil?: string;
    tags: string[];
    metadata: Record<string, any>;
    fingerprint: string;
    correlationId?: string;
}
export interface AlertRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    category: AlertCategory;
    severity: AlertSeverity;
    condition: AlertCondition;
    actions: AlertAction[];
    suppressionRules?: SuppressionRule[];
    escalationRules?: EscalationRule[];
    tags: string[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
export interface AlertCondition {
    type: 'threshold' | 'anomaly' | 'pattern' | 'composite';
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'matches';
    value: number | string;
    duration?: number;
    evaluationWindow?: number;
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    filters?: Record<string, string>;
    expression?: string;
}
export interface AlertAction {
    type: 'notification' | 'webhook' | 'script' | 'auto-remediation';
    target: string;
    parameters: Record<string, any>;
    retryPolicy?: RetryPolicy;
    delaySeconds?: number;
    conditions?: string[];
}
export interface NotificationChannel {
    id: string;
    name: string;
    type: 'email' | 'slack' | 'teams' | 'discord' | 'webhook' | 'console' | 'file';
    config: Record<string, any>;
    enabled: boolean;
    filters?: NotificationFilter[];
}
export interface NotificationFilter {
    type: 'severity' | 'category' | 'tag' | 'source';
    operator: 'equals' | 'contains' | 'matches' | 'in';
    value: string | string[];
}
export interface SuppressionRule {
    id: string;
    name: string;
    condition: string;
    duration: number;
    reason: string;
}
export interface EscalationRule {
    id: string;
    name: string;
    delayMinutes: number;
    condition: string;
    actions: AlertAction[];
}
export interface RetryPolicy {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitter: boolean;
}
export interface AlertCorrelation {
    id: string;
    alerts: string[];
    pattern: string;
    confidence: number;
    rootCause?: string;
    timestamp: string;
}
export interface AlertStatistics {
    totalAlerts: number;
    alertsByStatus: Record<AlertStatus, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsByCategory: Record<AlertCategory, number>;
    averageResolutionTime: number;
    escalationRate: number;
    falsePositiveRate: number;
    mttr: number;
    mtbf: number;
}
export interface AlertingConfig {
    enabled: boolean;
    evaluationInterval: number;
    alertRetention: number;
    maxActiveAlerts: number;
    deduplicationWindow: number;
    correlationEnabled: boolean;
    correlationWindow: number;
    autoRemediation: boolean;
    defaultSeverity: AlertSeverity;
    defaultRetryPolicy: RetryPolicy;
}
export declare class AlertingService extends EventEmitter {
    private logger;
    private cacheService;
    private config;
    private isRunning;
    private alerts;
    private rules;
    private channels;
    private correlations;
    private evaluationTimer?;
    private ruleEvaluationQueue;
    private pendingActions;
    private readonly ALERTS_PREFIX;
    private readonly ALERTS_KEY;
    private readonly RULES_KEY;
    private readonly CHANNELS_KEY;
    private readonly STATS_KEY;
    private readonly CORRELATIONS_KEY;
    private readonly DEFAULT_RULES;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, config?: Partial<AlertingConfig>);
    /**
     * Start alerting service
     */
    start(): Promise<void>;
    /**
     * Stop alerting service
     */
    stop(): Promise<void>;
    /**
     * Create a new alert
     */
    createAlert(alertData: Partial<Alert> & {
        title: string;
        source: string;
    }): Promise<Alert>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): Promise<boolean>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<boolean>;
    /**
     * Suppress an alert
     */
    suppressAlert(alertId: string, suppressionDuration: number, reason: string): Promise<boolean>;
    /**
     * Add an alert rule
     */
    addRule(ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule>;
    /**
     * Update an alert rule
     */
    updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean>;
    /**
     * Remove an alert rule
     */
    removeRule(ruleId: string): Promise<boolean>;
    /**
     * Add a notification channel
     */
    addNotificationChannel(channel: NotificationChannel): Promise<void>;
    /**
     * Remove a notification channel
     */
    removeNotificationChannel(channelId: string): Promise<boolean>;
    /**
     * Send notification through a channel
     */
    private sendNotification;
    /**
     * Start rule evaluation timer
     */
    private startRuleEvaluation;
    /**
     * Evaluate all enabled rules
     */
    private evaluateRules;
    /**
     * Evaluate a single rule
     */
    private evaluateRule;
    /**
     * Evaluate a condition against a value
     */
    private evaluateCondition;
    /**
     * Start action processing
     */
    private startActionProcessing;
    /**
     * Execute alert actions
     */
    private executeAlertActions;
    /**
     * Execute a single action
     */
    private executeAction;
    /**
     * Actually execute the action
     */
    private doExecuteAction;
    /**
     * Execute notification action
     */
    private executeNotificationAction;
    /**
     * Execute webhook action
     */
    private executeWebhookAction;
    /**
     * Execute script action
     */
    private executeScriptAction;
    /**
     * Execute auto-remediation action
     */
    private executeRemediationAction;
    /**
     * Process pending actions
     */
    private processActions;
    /**
     * Start correlation analysis
     */
    private startCorrelationAnalysis;
    /**
     * Analyze correlations between alerts
     */
    private analyzeCorrelations;
    /**
     * Analyze correlation for a new alert
     */
    private analyzeCorrelation;
    /**
     * Generate alert ID
     */
    private generateAlertId;
    /**
     * Generate rule ID
     */
    private generateRuleId;
    /**
     * Generate alert fingerprint for deduplication
     */
    private generateFingerprint;
    /**
     * Find duplicate alert within deduplication window
     */
    private findDuplicateAlert;
    /**
     * Check if alert matches notification filters
     */
    private matchesFilters;
    /**
     * Check if alert matches a specific filter
     */
    private matchesFilter;
    /**
     * Get metric data for rule evaluation
     */
    private getMetricData;
    /**
     * Aggregate metric data
     */
    private aggregateMetricData;
    /**
     * Get condition start time
     */
    private getConditionStartTime;
    /**
     * Clear condition start time
     */
    private clearConditionStartTime;
    /**
     * Send console notification
     */
    private sendConsoleNotification;
    /**
     * Send file notification
     */
    private sendFileNotification;
    /**
     * Send webhook notification
     */
    private sendWebhookNotification;
    /**
     * Get severity icon
     */
    private getSeverityIcon;
    /**
     * Setup default notification channels
     */
    private setupDefaultChannels;
    /**
     * Initialize default alert rules
     */
    private initializeDefaultRules;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    private storeAlert;
    private storeRule;
    private deleteRule;
    private storeChannel;
    private deleteChannel;
    private storeCorrelation;
    private loadState;
    private saveState;
    /**
     * Get all active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Get alert statistics
     */
    getAlertStatistics(): AlertStatistics;
    /**
     * Get alert rules
     */
    getAlertRules(): AlertRule[];
    /**
     * Get notification channels
     */
    getNotificationChannels(): NotificationChannel[];
    /**
     * Get alert correlations
     */
    getAlertCorrelations(): AlertCorrelation[];
}
export default AlertingService;
//# sourceMappingURL=AlertingService.d.ts.map