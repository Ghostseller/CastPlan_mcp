/**
 * Performance Types - Comprehensive Type Definitions for Performance Monitoring
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for performance monitoring, optimization, and benchmarking
 *
 * Created: 2025-07-31
 * Author: Performance Engineering Team & Type System Architect
 */
export interface PerformanceConfiguration {
    monitoring: {
        enabled: boolean;
        interval: number;
        retentionDays: number;
        alertThresholds: AlertThresholds;
    };
    optimization: {
        enableConnectionPooling: boolean;
        enableQueryOptimization: boolean;
        enableCaching: boolean;
        maxConnectionPoolSize: number;
        queryTimeout: number;
        cacheSize: number;
    };
    benchmarking: {
        enableAutomaticBenchmarks: boolean;
        benchmarkInterval: number;
        regressionThreshold: number;
        baselineUpdatePolicy: 'manual' | 'automatic' | 'scheduled';
    };
}
export interface AlertThresholds {
    responseTime: {
        warning: number;
        critical: number;
    };
    errorRate: {
        warning: number;
        critical: number;
    };
    memoryUsage: {
        warning: number;
        critical: number;
    };
    cpuUsage: {
        warning: number;
        critical: number;
    };
    diskUsage: {
        warning: number;
        critical: number;
    };
    throughput: {
        warning: number;
        critical: number;
    };
}
export interface PerformanceSnapshot {
    timestamp: string;
    system: SystemPerformanceMetrics;
    application: ApplicationPerformanceMetrics;
    database: DatabasePerformanceMetrics;
    network: NetworkPerformanceMetrics;
    cache: CachePerformanceMetrics;
}
export interface SystemPerformanceMetrics {
    cpu: {
        usage: number;
        load: {
            oneMinute: number;
            fiveMinute: number;
            fifteenMinute: number;
        };
        cores: number;
        frequency: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
        swap: {
            total: number;
            used: number;
            free: number;
        };
        heap: {
            used: number;
            total: number;
            limit: number;
        };
    };
    disk: {
        total: number;
        used: number;
        free: number;
        percentage: number;
        io: {
            readBytes: number;
            writeBytes: number;
            readOps: number;
            writeOps: number;
            readTime: number;
            writeTime: number;
        };
    };
    processes: {
        total: number;
        running: number;
        sleeping: number;
        zombie: number;
    };
}
export interface ApplicationPerformanceMetrics {
    version: string;
    uptime: number;
    requests: {
        total: number;
        successful: number;
        failed: number;
        rate: number;
        averageResponseTime: number;
        slowestEndpoints: Array<{
            endpoint: string;
            averageTime: number;
            requestCount: number;
        }>;
    };
    errors: {
        total: number;
        rate: number;
        byType: Record<string, number>;
        recent: Array<{
            timestamp: string;
            type: string;
            message: string;
            stack?: string;
        }>;
    };
    resources: {
        threads: number;
        fileDescriptors: number;
        sockets: number;
    };
    gc: {
        collections: number;
        time: number;
        frequency: number;
    };
}
export interface DatabasePerformanceMetrics {
    connectionPool: {
        total: number;
        active: number;
        idle: number;
        waiting: number;
        utilization: number;
    };
    queries: {
        total: number;
        successful: number;
        failed: number;
        averageExecutionTime: number;
        slowQueries: Array<{
            query: string;
            executionTime: number;
            timestamp: string;
            rowsAffected: number;
        }>;
        queryTypes: {
            select: number;
            insert: number;
            update: number;
            delete: number;
            other: number;
        };
    };
    storage: {
        size: number;
        growth: number;
        tables: Array<{
            name: string;
            size: number;
            rowCount: number;
            averageRowSize: number;
        }>;
        indexes: Array<{
            name: string;
            table: string;
            size: number;
            usage: number;
        }>;
    };
    locks: {
        active: number;
        waiting: number;
        deadlocks: number;
        averageWaitTime: number;
    };
}
export interface NetworkPerformanceMetrics {
    interfaces: Array<{
        name: string;
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
        errorsIn: number;
        errorsOut: number;
        speed: number;
    }>;
    connections: {
        tcp: {
            established: number;
            listening: number;
            timeWait: number;
            closeWait: number;
        };
        udp: {
            sockets: number;
        };
    };
    latency: {
        internal: number;
        external: number;
        dns: number;
    };
    bandwidth: {
        incoming: number;
        outgoing: number;
        utilization: number;
    };
}
export interface CachePerformanceMetrics {
    instances: Record<string, {
        hits: number;
        misses: number;
        hitRate: number;
        size: number;
        maxSize: number;
        utilization: number;
        evictions: number;
        averageAccessTime: number;
        keys: number;
        memory: number;
    }>;
    global: {
        totalHits: number;
        totalMisses: number;
        averageHitRate: number;
        totalSize: number;
        totalMemory: number;
    };
}
export interface PerformanceMonitor {
    id: string;
    name: string;
    type: 'system' | 'application' | 'database' | 'network' | 'custom';
    enabled: boolean;
    interval: number;
    configuration: Record<string, any>;
    thresholds: Record<string, {
        warning: number;
        critical: number;
    }>;
    lastCheck: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    metrics: PerformanceSnapshot[];
}
export interface PerformanceAlert {
    id: string;
    monitorId: string;
    type: 'threshold_exceeded' | 'service_down' | 'anomaly_detected' | 'regression_detected';
    severity: 'info' | 'warning' | 'error' | 'critical';
    metric: string;
    currentValue: number;
    thresholdValue: number;
    message: string;
    triggeredAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    acknowledgedBy?: string;
    resolution?: string;
    tags: string[];
    metadata: Record<string, any>;
}
export interface PerformanceTrend {
    metric: string;
    timeframe: {
        start: string;
        end: string;
    };
    dataPoints: Array<{
        timestamp: string;
        value: number;
    }>;
    statistics: {
        mean: number;
        median: number;
        min: number;
        max: number;
        stdDev: number;
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
    };
    forecast?: Array<{
        timestamp: string;
        predictedValue: number;
        confidence: number;
    }>;
}
export interface OptimizationRecommendation {
    id: string;
    category: 'database' | 'cache' | 'memory' | 'cpu' | 'network' | 'application';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: {
        performance: number;
        complexity: number;
        risk: number;
    };
    estimatedBenefit: {
        responseTimeImprovement: number;
        throughputImprovement: number;
        resourceSavings: number;
    };
    implementation: {
        steps: string[];
        estimatedTime: number;
        requirements: string[];
        risks: string[];
    };
    measuredBenefit?: {
        beforeMetrics: Record<string, number>;
        afterMetrics: Record<string, number>;
        actualImprovement: Record<string, number>;
    };
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
    createdAt: string;
    implementedAt?: string;
    validUntil?: string;
}
export interface PerformanceOptimizer {
    analyzePerformance(snapshot: PerformanceSnapshot): Promise<OptimizationRecommendation[]>;
    implementRecommendation(recommendationId: string): Promise<void>;
    rollbackRecommendation(recommendationId: string): Promise<void>;
    measureImpact(recommendationId: string, beforeSnapshot: PerformanceSnapshot, afterSnapshot: PerformanceSnapshot): Promise<void>;
}
export interface BenchmarkSuite {
    id: string;
    name: string;
    description: string;
    category: 'performance' | 'load' | 'stress' | 'volume' | 'endurance';
    benchmarks: Benchmark[];
    schedule?: {
        frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
        cronExpression?: string;
        timezone: string;
    };
    notifications: {
        onCompletion: boolean;
        onRegression: boolean;
        onFailure: boolean;
        recipients: string[];
    };
    retention: {
        maxResults: number;
        maxAge: number;
    };
    createdAt: string;
    lastRun?: string;
    nextRun?: string;
    isActive: boolean;
}
export interface Benchmark {
    id: string;
    name: string;
    description: string;
    type: 'response_time' | 'throughput' | 'concurrency' | 'memory' | 'cpu' | 'custom';
    target: {
        service: string;
        operation: string;
        parameters: Record<string, any>;
    };
    configuration: {
        iterations: number;
        warmupIterations: number;
        timeout: number;
        concurrent: boolean;
        concurrencyLevel?: number;
        rampUp?: {
            enabled: boolean;
            duration: number;
            steps: number;
        };
    };
    success_criteria: {
        maxResponseTime?: number;
        minThroughput?: number;
        maxErrorRate?: number;
        maxMemoryUsage?: number;
        maxCpuUsage?: number;
    };
    baseline?: BenchmarkResult;
    regressionThreshold: number;
    tags: string[];
    createdAt: string;
    updatedAt?: string;
}
export interface BenchmarkResult {
    id: string;
    benchmarkId: string;
    suiteId?: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'passed' | 'failed' | 'cancelled' | 'timeout';
    metrics: {
        responseTime: {
            mean: number;
            median: number;
            p95: number;
            p99: number;
            min: number;
            max: number;
            stdDev: number;
        };
        throughput: {
            requestsPerSecond: number;
            requestsPerMinute: number;
            totalRequests: number;
        };
        errors: {
            total: number;
            rate: number;
            byType: Record<string, number>;
        };
        resources: {
            peakMemory: number;
            averageMemory: number;
            peakCpu: number;
            averageCpu: number;
        };
    };
    comparison?: {
        baseline: BenchmarkResult;
        regression: {
            detected: boolean;
            metrics: string[];
            severity: 'minor' | 'moderate' | 'severe' | 'critical';
            percentage: number;
        };
    };
    environment: {
        version: string;
        commit?: string;
        branch?: string;
        buildNumber?: string;
        configuration: Record<string, any>;
    };
    artifacts: Array<{
        type: 'log' | 'report' | 'graph' | 'data';
        name: string;
        path: string;
        size: number;
    }>;
    metadata: Record<string, any>;
}
export interface PerformanceReport {
    id: string;
    type: 'summary' | 'detailed' | 'comparison' | 'trend_analysis' | 'sla_compliance';
    title: string;
    description: string;
    timeframe: {
        start: string;
        end: string;
        duration: number;
    };
    scope: {
        services: string[];
        metrics: string[];
        environments: string[];
    };
    summary: {
        overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
        uptime: number;
        averageResponseTime: number;
        errorRate: number;
        throughput: number;
        slaCompliance: number;
    };
    sections: Array<{
        id: string;
        title: string;
        type: 'metrics' | 'chart' | 'table' | 'text' | 'analysis';
        content: any;
        insights: string[];
        recommendations: string[];
    }>;
    alerts: {
        critical: number;
        warning: number;
        resolved: number;
        mttr: number;
    };
    trends: {
        improving: string[];
        degrading: string[];
        stable: string[];
    };
    generatedAt: string;
    generatedBy: string;
    format: 'html' | 'pdf' | 'json' | 'csv';
    attachments: Array<{
        name: string;
        type: string;
        size: number;
        url: string;
    }>;
}
export interface SLADefinition {
    id: string;
    name: string;
    description: string;
    service: string;
    metrics: Array<{
        name: string;
        threshold: number;
        operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
        weight: number;
    }>;
    target: number;
    measurement: {
        period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
        excludeMaintenanceWindows: boolean;
        businessHoursOnly: boolean;
    };
    consequences: {
        breach: {
            notifications: string[];
            escalation: string[];
            actions: string[];
        };
        credits?: {
            thresholds: Array<{
                uptime: number;
                creditPercentage: number;
            }>;
        };
    };
    isActive: boolean;
    createdAt: string;
    validFrom: string;
    validUntil?: string;
}
export interface SLACompliance {
    slaId: string;
    period: {
        start: string;
        end: string;
    };
    compliance: number;
    target: number;
    status: 'compliant' | 'at_risk' | 'breached';
    metrics: Array<{
        name: string;
        value: number;
        threshold: number;
        compliant: boolean;
        contribution: number;
    }>;
    breaches: Array<{
        timestamp: string;
        duration: number;
        impact: number;
        cause: string;
        resolved: boolean;
        resolvedAt?: string;
    }>;
    trend: 'improving' | 'stable' | 'degrading';
    projection: {
        endOfPeriod: number;
        confidence: number;
    };
}
export interface PerformanceDashboard {
    id: string;
    name: string;
    description: string;
    category: 'system' | 'application' | 'database' | 'business' | 'sla';
    layout: {
        columns: number;
        rows: number;
        widgets: Array<{
            id: string;
            type: 'metric' | 'chart' | 'gauge' | 'table' | 'alert' | 'sla';
            position: {
                row: number;
                col: number;
                width: number;
                height: number;
            };
            configuration: Record<string, any>;
            dataSource: {
                type: 'real_time' | 'historical' | 'aggregated';
                query: string;
                refreshInterval: number;
            };
        }>;
    };
    filters: Array<{
        name: string;
        type: 'time' | 'service' | 'environment' | 'metric';
        defaultValue: any;
        options?: any[];
    }>;
    permissions: {
        viewers: string[];
        editors: string[];
        public: boolean;
    };
    sharing: {
        enabled: boolean;
        publicUrl?: string;
        embedCode?: string;
    };
    createdAt: string;
    updatedAt?: string;
    lastViewed?: string;
    viewCount: number;
}
export declare class PerformanceError extends Error {
    readonly code: string;
    readonly category: 'monitoring' | 'optimization' | 'benchmarking' | 'reporting';
    readonly timestamp: string;
    readonly context?: Record<string, any>;
    constructor(message: string, code: string, category: PerformanceError['category'], context?: Record<string, any>);
}
export interface PerformanceMonitoringService {
    startMonitoring(config?: Partial<PerformanceConfiguration>): Promise<void>;
    stopMonitoring(): Promise<void>;
    getCurrentSnapshot(): Promise<PerformanceSnapshot>;
    getMetricHistory(metric: string, timeframe: {
        start: string;
        end: string;
    }): Promise<PerformanceTrend>;
    createAlert(alert: Omit<PerformanceAlert, 'id' | 'triggeredAt'>): Promise<string>;
    acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
    resolveAlert(alertId: string, resolution: string): Promise<void>;
    getActiveAlerts(): Promise<PerformanceAlert[]>;
    checkHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'critical';
        details: Record<string, any>;
    }>;
}
export interface PerformanceOptimizationService {
    analyzePerformance(scope?: string[]): Promise<OptimizationRecommendation[]>;
    getRecommendation(id: string): Promise<OptimizationRecommendation | null>;
    implementRecommendation(id: string): Promise<void>;
    rollbackRecommendation(id: string): Promise<void>;
    scheduleRecommendation(id: string, scheduledFor: string): Promise<void>;
    trackImplementation(id: string): Promise<{
        status: string;
        progress: number;
        eta?: string;
    }>;
    measureImpact(id: string): Promise<{
        improvement: Record<string, number>;
        success: boolean;
    }>;
}
export interface PerformanceBenchmarkingService {
    runBenchmark(benchmark: Benchmark): Promise<BenchmarkResult>;
    runBenchmarkSuite(suiteId: string): Promise<BenchmarkResult[]>;
    cancelBenchmark(benchmarkId: string): Promise<void>;
    setBaseline(benchmarkId: string, resultId: string): Promise<void>;
    getBaseline(benchmarkId: string): Promise<BenchmarkResult | null>;
    compareResults(resultId1: string, resultId2: string): Promise<{
        comparison: any;
        insights: string[];
    }>;
    detectRegressions(resultId: string): Promise<{
        regressions: any[];
        severity: string;
    }>;
    scheduleBenchmarkSuite(suiteId: string, schedule: any): Promise<void>;
    getScheduledBenchmarks(): Promise<Array<{
        suiteId: string;
        nextRun: string;
    }>>;
}
export interface PerformanceReportingService {
    generateReport(config: Omit<PerformanceReport, 'id' | 'generatedAt' | 'generatedBy'>): Promise<PerformanceReport>;
    getReport(reportId: string): Promise<PerformanceReport | null>;
    createSLA(sla: Omit<SLADefinition, 'id' | 'createdAt'>): Promise<string>;
    calculateCompliance(slaId: string, period: {
        start: string;
        end: string;
    }): Promise<SLACompliance>;
    getSLAStatus(slaId: string): Promise<{
        status: string;
        compliance: number;
        trend: string;
    }>;
    createDashboard(dashboard: Omit<PerformanceDashboard, 'id' | 'createdAt' | 'viewCount'>): Promise<string>;
    updateDashboard(dashboardId: string, updates: Partial<PerformanceDashboard>): Promise<void>;
    getDashboard(dashboardId: string): Promise<PerformanceDashboard | null>;
}
declare const _default: {
    PerformanceError: typeof PerformanceError;
};
export default _default;
//# sourceMappingURL=performance.types.d.ts.map