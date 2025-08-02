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
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService';
import { HealthCheckService } from './HealthCheckService';
import { AlertingService } from './AlertingService';
export type SystemStatusLevel = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'maintenance';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';
export interface SystemComponent {
    id: string;
    name: string;
    description: string;
    status: ComponentStatus;
    category: 'core' | 'database' | 'cache' | 'external' | 'monitoring';
    dependencies: string[];
    lastChecked: string;
    lastStatusChange: string;
    uptime: number;
    responseTime: number;
    errorRate: number;
    metadata: Record<string, any>;
    thresholds: ComponentThresholds;
}
export interface ComponentThresholds {
    responseTime: {
        warning: number;
        critical: number;
    };
    errorRate: {
        warning: number;
        critical: number;
    };
    uptime: {
        warning: number;
        critical: number;
    };
    customMetrics: Record<string, {
        warning: number;
        critical: number;
    }>;
}
export interface SystemResource {
    type: 'cpu' | 'memory' | 'disk' | 'network' | 'database_connections' | 'cache_memory';
    name: string;
    current: number;
    maximum: number;
    unit: string;
    usage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    thresholds: ResourceThresholds;
    history: ResourceDataPoint[];
    status: ComponentStatus;
    lastUpdated: string;
}
export interface ResourceThresholds {
    warning: number;
    critical: number;
    recovery: number;
}
export interface ResourceDataPoint {
    timestamp: string;
    value: number;
    usage: number;
}
export interface SystemAlert {
    id: string;
    type: 'threshold_breach' | 'component_failure' | 'resource_exhaustion' | 'status_change' | 'custom';
    severity: AlertSeverity;
    component: string;
    message: string;
    details: Record<string, any>;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    escalationLevel: number;
}
export interface SystemMetric {
    name: string;
    type: MetricType;
    value: number;
    unit: string;
    timestamp: string;
    tags: Record<string, string>;
    help: string;
}
export interface SystemStatusSnapshot {
    id: string;
    timestamp: string;
    overallStatus: SystemStatusLevel;
    components: SystemComponent[];
    resources: SystemResource[];
    alerts: SystemAlert[];
    metrics: SystemMetric[];
    summary: StatusSummary;
    uptime: number;
    version: string;
    environment: string;
}
export interface StatusSummary {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
    maintenanceComponents: number;
    activeAlerts: number;
    criticalAlerts: number;
    averageResponseTime: number;
    systemLoad: number;
    resourceUtilization: number;
}
export interface SystemStatusConfig {
    enabled: boolean;
    interval: number;
    alerting: {
        enabled: boolean;
        channels: string[];
        escalationRules: EscalationRule[];
        suppressionRules: SuppressionRule[];
    };
    thresholds: {
        global: ComponentThresholds;
        resources: Record<string, ResourceThresholds>;
    };
    retention: {
        snapshots: number;
        metrics: number;
        alerts: number;
    };
    notifications: {
        statusChanges: boolean;
        thresholdBreaches: boolean;
        componentFailures: boolean;
        escalations: boolean;
    };
    integrations: {
        healthCheck: boolean;
        monitoring: boolean;
        logging: boolean;
    };
}
export interface EscalationRule {
    id: string;
    severity: AlertSeverity;
    timeThreshold: number;
    escalateTo: string[];
    conditions: Record<string, any>;
}
export interface SuppressionRule {
    id: string;
    pattern: string;
    duration: number;
    reason: string;
    active: boolean;
}
export interface ComponentCheckFunction {
    (): Promise<{
        status: ComponentStatus;
        responseTime?: number;
        metadata?: Record<string, any>;
    }>;
}
export declare class SystemStatusService extends EventEmitter {
    private logger;
    private cacheService;
    private healthCheckService?;
    private alertingService?;
    private config;
    private isRunning;
    private startTime;
    private statusTimer?;
    private currentSnapshot?;
    private components;
    private componentChecks;
    private resources;
    private alerts;
    private metrics;
    private statusHistory;
    private statusChangeHistory;
    private readonly STATUS_PREFIX;
    private readonly SNAPSHOT_KEY;
    private readonly HISTORY_KEY;
    private readonly ALERTS_KEY;
    private readonly METRICS_KEY;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, config?: Partial<SystemStatusConfig>, healthCheckService?: HealthCheckService, alertingService?: AlertingService);
    /**
     * Start system status monitoring
     */
    start(): Promise<void>;
    /**
     * Stop system status monitoring
     */
    stop(): Promise<void>;
    /**
     * Register a system component for monitoring
     */
    registerComponent(id: string, component: Omit<SystemComponent, 'id' | 'lastChecked' | 'lastStatusChange' | 'uptime'>, checkFunction?: ComponentCheckFunction): void;
    /**
     * Unregister a component
     */
    unregisterComponent(id: string): boolean;
    /**
     * Update component status manually
     */
    updateComponentStatus(id: string, status: ComponentStatus, metadata?: Record<string, any>): void;
    /**
     * Register a system resource for monitoring
     */
    registerResource(resource: Omit<SystemResource, 'lastUpdated' | 'history' | 'trend'>): void;
    /**
     * Update resource metrics
     */
    updateResourceMetrics(name: string, current: number, maximum?: number): void;
    /**
     * Perform comprehensive status check
     */
    performStatusCheck(): Promise<SystemStatusSnapshot>;
    /**
     * Check all registered components
     */
    private checkAllComponents;
    /**
     * Update system resource metrics
     */
    private updateSystemResources;
    /**
     * Create and process system alert
     */
    createAlert(type: SystemAlert['type'], severity: AlertSeverity, component: string, message: string, details?: Record<string, any>): SystemAlert;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolvedBy?: string): boolean;
    /**
     * Process alert through alerting service
     */
    private processAlert;
    /**
     * Calculate overall system status
     */
    private calculateOverallStatus;
    /**
     * Generate status summary
     */
    private generateStatusSummary;
    /**
     * Calculate average response time
     */
    private calculateAverageResponseTime;
    /**
     * Calculate average resource utilization
     */
    private calculateAverageResourceUtilization;
    /**
     * Calculate resource status based on thresholds
     */
    private calculateResourceStatus;
    /**
     * Calculate resource trend
     */
    private calculateResourceTrend;
    /**
     * Check if alert is suppressed
     */
    private isAlertSuppressed;
    /**
     * Handle component status change
     */
    private handleComponentStatusChange;
    /**
     * Handle resource status change
     */
    private handleResourceStatusChange;
    /**
     * Handle overall status change
     */
    private handleOverallStatusChange;
    /**
     * Setup default components
     */
    private setupDefaultComponents;
    /**
     * Setup default resources
     */
    private setupDefaultResources;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Initialize integrations
     */
    private initializeIntegrations;
    /**
     * Integrate health check data
     */
    private integrateHealthCheckData;
    /**
     * Start periodic monitoring
     */
    private startPeriodicMonitoring;
    /**
     * Load historical data
     */
    private loadHistoricalData;
    /**
     * Store current snapshot
     */
    private storeSnapshot;
    /**
     * Update status history
     */
    private updateStatusHistory;
    /**
     * Save current status
     */
    private saveCurrentStatus;
    /**
     * Cleanup resources
     */
    private cleanup;
    /**
     * Get current system status
     */
    getCurrentStatus(): Promise<SystemStatusSnapshot>;
    /**
     * Get component by ID
     */
    getComponent(id: string): SystemComponent | undefined;
    /**
     * Get all components
     */
    getAllComponents(): SystemComponent[];
    /**
     * Get resource by name
     */
    getResource(name: string): SystemResource | undefined;
    /**
     * Get all resources
     */
    getAllResources(): SystemResource[];
    /**
     * Get alert by ID
     */
    getAlert(id: string): SystemAlert | undefined;
    /**
     * Get all alerts
     */
    getAllAlerts(resolved?: boolean): SystemAlert[];
    /**
     * Get status history
     */
    getStatusHistory(limit?: number): SystemStatusSnapshot[];
    /**
     * Get status change history
     */
    getStatusChangeHistory(limit?: number): Array<{
        timestamp: string;
        from: SystemStatusLevel;
        to: SystemStatusLevel;
        reason: string;
    }>;
    /**
     * Get system metrics
     */
    getMetrics(): SystemMetric[];
    /**
     * Force status check
     */
    forceStatusCheck(): Promise<SystemStatusSnapshot>;
    /**
     * Set component maintenance mode
     */
    setComponentMaintenance(id: string, maintenance: boolean, reason?: string): void;
    /**
     * Get service uptime
     */
    getUptime(): number;
    /**
     * Get service configuration
     */
    getConfiguration(): SystemStatusConfig;
    /**
     * Update configuration
     */
    updateConfiguration(config: Partial<SystemStatusConfig>): void;
}
export default SystemStatusService;
//# sourceMappingURL=SystemStatusService.d.ts.map