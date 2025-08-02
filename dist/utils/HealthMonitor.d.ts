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
import { Logger } from 'winston';
import { EventEmitter } from 'events';
export declare enum HealthStatus {
    HEALTHY = "HEALTHY",
    DEGRADED = "DEGRADED",
    UNHEALTHY = "UNHEALTHY",
    CRITICAL = "CRITICAL"
}
export interface HealthCheckResult {
    status: HealthStatus;
    latency: number;
    message?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}
export interface ServiceHealth {
    name: string;
    status: HealthStatus;
    lastCheck: Date;
    consecutiveFailures: number;
    totalChecks: number;
    totalFailures: number;
    averageLatency: number;
    lastError?: string;
}
export interface SystemMetrics {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
    activeConnections: number;
    queueLength: number;
    errorRate: number;
    timestamp: Date;
}
export interface HealthThresholds {
    memoryThreshold: number;
    latencyThreshold: number;
    errorRateThreshold: number;
    consecutiveFailureThreshold: number;
}
export interface AlertConfig {
    enabled: boolean;
    channels: string[];
    cooldownPeriod: number;
    escalationRules: Record<HealthStatus, number>;
}
export type HealthCheckFunction = () => Promise<HealthCheckResult>;
/**
 * Health Monitor
 */
export declare class HealthMonitor extends EventEmitter {
    private logger;
    private services;
    private healthChecks;
    private metrics;
    private maxMetricsHistory;
    private checkInterval;
    private metricsInterval;
    private intervalIds;
    private lastAlerts;
    private thresholds;
    private alertConfig;
    constructor(logger: Logger, options?: {
        thresholds?: Partial<HealthThresholds>;
        alertConfig?: Partial<AlertConfig>;
        checkInterval?: number;
        metricsInterval?: number;
    });
    /**
     * Register a service health check
     */
    registerHealthCheck(serviceName: string, healthCheck: HealthCheckFunction): void;
    /**
     * Start monitoring
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Perform health checks for all registered services
     */
    private performHealthChecks;
    /**
     * Perform single health check with timeout
     */
    private performSingleHealthCheck;
    /**
     * Update service health based on check result
     */
    private updateServiceHealth;
    /**
     * Collect system metrics
     */
    private collectMetrics;
    /**
     * Calculate current error rate
     */
    private calculateErrorRate;
    /**
     * Check if metrics exceed thresholds
     */
    private checkMetricThresholds;
    /**
     * Evaluate overall system health
     */
    private evaluateOverallHealth;
    /**
     * Trigger alert with cooldown
     */
    private triggerAlert;
    /**
     * Send alert through configured channels
     */
    private sendAlert;
    /**
     * Get current health status
     */
    getHealthStatus(): {
        overall: HealthStatus;
        services: ServiceHealth[];
        metrics: SystemMetrics | null;
        timestamp: Date;
    };
    /**
     * Get metrics history
     */
    getMetricsHistory(limit?: number): SystemMetrics[];
    /**
     * Force health check for specific service
     */
    forceHealthCheck(serviceName: string): Promise<HealthCheckResult | null>;
    /**
     * Reset service health stats
     */
    resetServiceStats(serviceName: string): boolean;
}
/**
 * Built-in health check functions
 */
export declare class BuiltInHealthChecks {
    /**
     * Database connection health check
     */
    static createDatabaseHealthCheck(connectionTest: () => Promise<boolean>): HealthCheckFunction;
    /**
     * File system health check
     */
    static createFileSystemHealthCheck(testPath: string): HealthCheckFunction;
    /**
     * External API health check
     */
    static createApiHealthCheck(url: string, timeout?: number): HealthCheckFunction;
    /**
     * Memory usage health check
     */
    static createMemoryHealthCheck(thresholdMB: number): HealthCheckFunction;
}
//# sourceMappingURL=HealthMonitor.d.ts.map