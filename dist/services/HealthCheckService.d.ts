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
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService.ts';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type HealthCheckType = 'liveness' | 'readiness' | 'startup' | 'custom';
export interface HealthCheck {
    name: string;
    type: HealthCheckType;
    status: HealthStatus;
    lastChecked: string;
    duration: number;
    message?: string;
    details?: Record<string, any>;
    threshold?: {
        warning: number;
        critical: number;
    };
}
export interface SystemHealth {
    status: HealthStatus;
    timestamp: string;
    uptime: number;
    version: string;
    checks: HealthCheck[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
        unknown: number;
    };
    dependencies: DependencyHealth[];
    resources: ResourceHealth;
    metrics: HealthMetrics;
}
export interface DependencyHealth {
    name: string;
    type: 'database' | 'cache' | 'api' | 'file' | 'network';
    status: HealthStatus;
    latency: number;
    lastChecked: string;
    endpoint?: string;
    version?: string;
    details?: Record<string, any>;
}
export interface ResourceHealth {
    cpu: {
        usage: number;
        loadAverage: number[];
        status: HealthStatus;
    };
    memory: {
        used: number;
        total: number;
        usage: number;
        status: HealthStatus;
    };
    disk: {
        used: number;
        total: number;
        usage: number;
        status: HealthStatus;
    };
    network: {
        connections: number;
        throughput: number;
        status: HealthStatus;
    };
}
export interface HealthMetrics {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    successRate: number;
    lastError?: {
        message: string;
        timestamp: string;
        count: number;
    };
}
export interface HealthCheckFunction {
    (): Promise<{
        status: HealthStatus;
        message?: string;
        details?: Record<string, any>;
    }>;
}
export interface HealthCheckConfig {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
    gracePeriod: number;
    thresholds: {
        cpu: {
            warning: number;
            critical: number;
        };
        memory: {
            warning: number;
            critical: number;
        };
        disk: {
            warning: number;
            critical: number;
        };
        responseTime: {
            warning: number;
            critical: number;
        };
    };
    endpoints: {
        health: string;
        liveness: string;
        readiness: string;
        metrics: string;
    };
    notifications: {
        enabled: boolean;
        channels: string[];
        onStatusChange: boolean;
        onThresholdBreach: boolean;
    };
}
export declare class HealthCheckService extends EventEmitter {
    private logger;
    private cacheService;
    private config;
    private isRunning;
    private startTime;
    private healthChecks;
    private checkResults;
    private dependencies;
    private checkTimer?;
    private lastSystemHealth?;
    private requestMetrics;
    private readonly HEALTH_PREFIX;
    private readonly CHECKS_KEY;
    private readonly SYSTEM_KEY;
    private readonly DEPENDENCIES_KEY;
    private readonly METRICS_KEY;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, config?: Partial<HealthCheckConfig>);
    /**
     * Start health check service
     */
    start(): Promise<void>;
    /**
     * Stop health check service
     */
    stop(): Promise<void>;
    /**
     * Register a custom health check
     */
    registerHealthCheck(name: string, type: HealthCheckType, checkFunction: HealthCheckFunction, threshold?: {
        warning: number;
        critical: number;
    }): void;
    /**
     * Unregister a health check
     */
    unregisterHealthCheck(name: string): boolean;
    /**
     * Register a dependency for monitoring
     */
    registerDependency(dependency: Omit<DependencyHealth, 'status' | 'latency' | 'lastChecked'>): void;
    /**
     * Perform all health checks
     */
    performHealthChecks(): Promise<SystemHealth>;
    /**
     * Execute a single health check
     */
    private executeHealthCheck;
    /**
     * Check all registered dependencies
     */
    private checkDependencies;
    /**
     * Collect system resource health
     */
    private collectResourceHealth;
    /**
     * Calculate overall system health
     */
    private calculateSystemHealth;
    /**
     * Check database health
     */
    private checkDatabase;
    /**
     * Check cache health (Redis)
     */
    private checkCache;
    /**
     * Check API endpoint health
     */
    private checkApiEndpoint;
    /**
     * Check file system health
     */
    private checkFileSystem;
    /**
     * Check network health
     */
    private checkNetwork;
    /**
     * Setup built-in health checks
     */
    private setupBuiltInChecks;
    /**
     * Start periodic health checks
     */
    private startPeriodicChecks;
    /**
     * Initialize dependency monitoring
     */
    private initializeDependencies;
    /**
     * Get status from threshold
     */
    private getStatusFromThreshold;
    /**
     * Calculate percentile
     */
    private calculatePercentile;
    /**
     * Handle status change
     */
    private handleStatusChange;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Store health status in Redis
     */
    private storeHealthStatus;
    /**
     * Save health status on shutdown
     */
    private saveHealthStatus;
    /**
     * Get current system health
     */
    getCurrentHealth(): Promise<SystemHealth>;
    /**
     * Get health check by name
     */
    getHealthCheck(name: string): HealthCheck | undefined;
    /**
     * Get all health checks
     */
    getAllHealthChecks(): HealthCheck[];
    /**
     * Get dependency health
     */
    getDependencyHealth(name: string): DependencyHealth | undefined;
    /**
     * Get all dependencies
     */
    getAllDependencies(): DependencyHealth[];
    /**
     * Record request metrics
     */
    recordRequest(responseTime: number, success?: boolean): void;
    /**
     * Record error
     */
    recordError(error: string): void;
    /**
     * Get liveness status (basic service availability)
     */
    getLivenessStatus(): Promise<{
        status: HealthStatus;
        timestamp: string;
    }>;
    /**
     * Get readiness status (service ready to handle requests)
     */
    getReadinessStatus(): Promise<{
        status: HealthStatus;
        timestamp: string;
        checks: HealthCheck[];
    }>;
    /**
     * Get startup status (initial startup health)
     */
    getStartupStatus(): Promise<{
        status: HealthStatus;
        timestamp: string;
        uptime: number;
    }>;
    /**
     * Get health metrics summary
     */
    getHealthMetrics(): HealthMetrics;
    /**
     * Force health check execution
     */
    forceHealthCheck(): Promise<SystemHealth>;
    /**
     * Reset health metrics
     */
    resetMetrics(): void;
}
export default HealthCheckService;
//# sourceMappingURL=HealthCheckService.d.ts.map