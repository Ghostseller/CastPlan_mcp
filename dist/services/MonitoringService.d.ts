/**
 * Monitoring Service - Comprehensive System Resource Monitoring
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 시스템 리소스, 애플리케이션 메트릭, 서비스 상태 모니터링
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & Backend Architect
 */
import { EventEmitter } from 'events';
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService.ts';
export interface SystemMetrics {
    timestamp: string;
    cpu: {
        usage: number;
        loadAverage: number[];
        cores: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usage: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    disk: {
        usage: number;
        totalSpace?: number;
        freeSpace?: number;
    };
    network: {
        bytesReceived: number;
        bytesSent: number;
        packetsReceived: number;
        packetsSent: number;
    };
    process: {
        uptime: number;
        pid: number;
        version: string;
        platform: string;
        arch: string;
    };
}
export interface ApplicationMetrics {
    timestamp: string;
    requests: {
        total: number;
        rate: number;
        errors: number;
        errorRate: number;
    };
    response: {
        averageTime: number;
        p50: number;
        p95: number;
        p99: number;
    };
    concurrent: {
        connections: number;
        activeRequests: number;
    };
    cache: {
        hitRate: number;
        missRate: number;
        size: number;
        memory: number;
    };
}
export interface ServiceMetrics {
    timestamp: string;
    database: {
        connections: number;
        activeConnections: number;
        queries: number;
        queryTime: number;
        errors: number;
    };
    redis: {
        connections: number;
        memory: number;
        operations: number;
        hitRate: number;
        errors: number;
    };
    aiService: {
        requests: number;
        averageTime: number;
        errors: number;
        tokenUsage: number;
        costEstimate: number;
    };
    taskQueue: {
        pending: number;
        running: number;
        completed: number;
        failed: number;
        throughput: number;
    };
}
export interface CustomMetrics {
    timestamp: string;
    business: {
        documentsProcessed: number;
        analysisCompleted: number;
        hooksTriggered: number;
        bmadTasksCompleted: number;
    };
    performance: {
        avgProcessingTime: number;
        peakMemoryUsage: number;
        errorRecoveryAttempts: number;
        degradationEvents: number;
    };
}
export interface MetricAlert {
    id: string;
    type: 'threshold' | 'anomaly' | 'pattern';
    severity: 'critical' | 'high' | 'medium' | 'low';
    metric: string;
    value: number;
    threshold: number;
    message: string;
    timestamp: string;
    acknowledged: boolean;
}
export interface MonitoringConfig {
    enabled: boolean;
    collectionInterval: number;
    retentionPeriod: number;
    aggregationIntervals: number[];
    thresholds: {
        cpu: number;
        memory: number;
        disk: number;
        errorRate: number;
        responseTime: number;
    };
    alerts: {
        enabled: boolean;
        channels: ('console' | 'redis' | 'webhook')[];
        webhookUrl?: string;
    };
}
export declare class MonitoringService extends EventEmitter {
    private logger;
    private cacheService;
    private config;
    private isRunning;
    private collectors;
    private readonly METRICS_PREFIX;
    private readonly SYSTEM_METRICS_KEY;
    private readonly APP_METRICS_KEY;
    private readonly SERVICE_METRICS_KEY;
    private readonly CUSTOM_METRICS_KEY;
    private readonly ALERTS_KEY;
    private requestCount;
    private errorCount;
    private responseTimes;
    private startTime;
    private cacheStats;
    private serviceCounters;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, config?: Partial<MonitoringConfig>);
    /**
     * Start monitoring service
     */
    start(): Promise<void>;
    /**
     * Stop monitoring service
     */
    stop(): Promise<void>;
    /**
     * Start system metrics collection
     */
    private startSystemMetricsCollection;
    /**
     * Start application metrics collection
     */
    private startApplicationMetricsCollection;
    /**
     * Start service metrics collection
     */
    private startServiceMetricsCollection;
    /**
     * Start custom metrics collection
     */
    private startCustomMetricsCollection;
    /**
     * Collect system metrics
     */
    private collectSystemMetrics;
    /**
     * Collect application metrics
     */
    private collectApplicationMetrics;
    /**
     * Collect service metrics
     */
    private collectServiceMetrics;
    /**
     * Collect custom business metrics
     */
    private collectCustomMetrics;
    /**
     * Store metrics in Redis
     */
    private storeMetrics;
    /**
     * Start metric aggregation for different time intervals
     */
    private startMetricAggregation;
    /**
     * Aggregate metrics for a specific time interval
     */
    private aggregateMetricsForInterval;
    /**
     * Calculate aggregated metrics
     */
    private calculateAggregatedMetrics;
    /**
     * Start metrics cleanup task
     */
    private startMetricsCleanup;
    /**
     * Cleanup old metrics beyond retention period
     */
    private cleanupOldMetrics;
    /**
     * Check metrics against thresholds and generate alerts
     */
    private checkThresholds;
    /**
     * Create an alert
     */
    private createAlert;
    /**
     * Process and dispatch alerts
     */
    private processAlert;
    /**
     * Dispatch alert through specific channel
     */
    private dispatchAlert;
    /**
     * Record a request
     */
    recordRequest(responseTime: number, isError?: boolean): void;
    /**
     * Record cache operation
     */
    recordCacheOperation(hit: boolean): void;
    /**
     * Increment service counter
     */
    incrementCounter(counterName: keyof typeof this.serviceCounters): void;
    /**
     * Get current metrics
     */
    getCurrentMetrics(): Promise<{
        system: SystemMetrics;
        application: ApplicationMetrics;
        service: ServiceMetrics;
        custom: CustomMetrics;
    }>;
    /**
     * Get historical metrics
     */
    getHistoricalMetrics(type: string, startTime: Date, endTime: Date): Promise<any[]>;
    /**
     * Get active alerts
     */
    getActiveAlerts(): Promise<MetricAlert[]>;
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): Promise<boolean>;
    /**
     * Get CPU usage percentage
     */
    private getCpuUsage;
    /**
     * Calculate percentile
     */
    private getPercentile;
    /**
     * Calculate average
     */
    private average;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
}
export default MonitoringService;
//# sourceMappingURL=MonitoringService.d.ts.map