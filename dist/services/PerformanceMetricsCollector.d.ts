/**
 * Performance Metrics Collector - Detailed Performance Analysis and Benchmarking
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 세부적인 성능 메트릭 수집, 벤치마킹, 성능 분석
 *
 * Created: 2025-07-31
 * Author: Performance Engineer
 */
import { EventEmitter } from 'events';
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService.ts';
export interface PerformanceMetric {
    id: string;
    name: string;
    type: 'timer' | 'gauge' | 'counter' | 'histogram';
    value: number;
    unit: string;
    timestamp: string;
    labels?: Record<string, string>;
    metadata?: Record<string, any>;
}
export interface TimingMetric extends PerformanceMetric {
    type: 'timer';
    startTime: number;
    endTime: number;
    duration: number;
    unit: 'ms' | 'ns' | 's';
}
export interface CounterMetric extends PerformanceMetric {
    type: 'counter';
    count: number;
    rate?: number;
}
export interface GaugeMetric extends PerformanceMetric {
    type: 'gauge';
    current: number;
    min?: number;
    max?: number;
    average?: number;
}
export interface HistogramMetric extends PerformanceMetric {
    type: 'histogram';
    buckets: Record<string, number>;
    count: number;
    sum: number;
    percentiles: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
        p999: number;
    };
}
export interface PerformanceBenchmark {
    id: string;
    name: string;
    category: string;
    operation: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    standardDeviation: number;
    throughput: number;
    timestamp: string;
    environment: {
        cpuCores: number;
        memoryTotal: number;
        nodeVersion: string;
        platform: string;
    };
}
export interface PerformanceProfile {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: number;
    samples: PerformanceSample[];
    hotspots: HotSpot[];
    memoryProfile: MemoryProfile;
    summary: {
        totalOperations: number;
        averageLatency: number;
        throughput: number;
        errorRate: number;
    };
}
export interface PerformanceSample {
    timestamp: string;
    operation: string;
    duration: number;
    memoryUsed: number;
    cpuUsage: number;
    labels?: Record<string, string>;
}
export interface HotSpot {
    function: string;
    file: string;
    line: number;
    executionTime: number;
    percentage: number;
    callCount: number;
}
export interface MemoryProfile {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    peakUsage: number;
    allocations: number;
    deallocations: number;
    gcCount: number;
    gcTime: number;
}
export interface PerformanceCollectorConfig {
    enabled: boolean;
    samplingRate: number;
    maxSamples: number;
    retentionPeriod: number;
    benchmarkEnabled: boolean;
    profilingEnabled: boolean;
    collectSystemMetrics: boolean;
    collectMemoryMetrics: boolean;
    collectGCMetrics: boolean;
    thresholds: {
        slowOperationMs: number;
        highMemoryMB: number;
        highCpuPercent: number;
    };
}
export declare class PerformanceMetricsCollector extends EventEmitter {
    private logger;
    private cacheService;
    private config;
    private isRunning;
    private metrics;
    private timers;
    private counters;
    private gauges;
    private histograms;
    private activeProfiles;
    private performanceObserver;
    private gcStats;
    private readonly METRICS_PREFIX;
    private readonly TIMERS_KEY;
    private readonly COUNTERS_KEY;
    private readonly GAUGES_KEY;
    private readonly HISTOGRAMS_KEY;
    private readonly BENCHMARKS_KEY;
    private readonly PROFILES_KEY;
    private readonly BENCHMARK_OPERATIONS;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, config?: Partial<PerformanceCollectorConfig>);
    /**
     * Start performance metrics collection
     */
    start(): Promise<void>;
    /**
     * Stop performance metrics collection
     */
    stop(): Promise<void>;
    /**
     * Start a timer metric
     */
    startTimer(name: string, labels?: Record<string, string>): string;
    /**
     * End a timer metric
     */
    endTimer(id: string, labels?: Record<string, string>): TimingMetric | null;
    /**
     * Record a gauge metric
     */
    recordGauge(name: string, value: number, labels?: Record<string, string>): GaugeMetric;
    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, delta?: number, labels?: Record<string, string>): CounterMetric;
    /**
     * Record a histogram metric
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): HistogramMetric;
    /**
     * Start a performance profile
     */
    startProfile(name: string): string;
    /**
     * End a performance profile
     */
    endProfile(id: string): Promise<PerformanceProfile | null>;
    /**
     * Add a sample to an active profile
     */
    addProfileSample(profileId: string, operation: string, duration: number, labels?: Record<string, string>): void;
    /**
     * Run a benchmark
     */
    runBenchmark(name: string, operation: () => any, iterations?: number): Promise<PerformanceBenchmark>;
    /**
     * Run built-in benchmarks
     */
    runBuiltInBenchmarks(): Promise<PerformanceBenchmark[]>;
    /**
     * Setup performance observer
     */
    private setupPerformanceObserver;
    /**
     * Setup garbage collection monitoring
     */
    private setupGCMonitoring;
    /**
     * Start periodic metric collection
     */
    private startPeriodicCollection;
    /**
     * Collect system metrics
     */
    private collectSystemMetrics;
    /**
     * Collect memory metrics
     */
    private collectMemoryMetrics;
    /**
     * Capture memory profile
     */
    private captureMemoryProfile;
    /**
     * Check metric thresholds
     */
    private checkThresholds;
    /**
     * Create histogram buckets
     */
    private createHistogramBuckets;
    /**
     * Calculate percentile
     */
    private getPercentile;
    /**
     * Store metrics in Redis
     */
    private flushMetrics;
    /**
     * Store benchmark result
     */
    private storeBenchmark;
    /**
     * Store performance profile
     */
    private storeProfile;
    /**
     * Get current metrics summary
     */
    getMetricsSummary(): {
        activeTimers: number;
        totalCounters: number;
        totalGauges: number;
        totalHistograms: number;
        activeProfiles: number;
    };
    /**
     * Get recent benchmarks
     */
    getRecentBenchmarks(limit?: number): Promise<PerformanceBenchmark[]>;
    /**
     * Clear all metrics
     */
    clearMetrics(): void;
    /**
     * Get performance report
     */
    getPerformanceReport(): Promise<{
        summary: any;
        recentBenchmarks: PerformanceBenchmark[];
        slowOperations: PerformanceMetric[];
        memoryUsage: any;
    }>;
}
export default PerformanceMetricsCollector;
//# sourceMappingURL=PerformanceMetricsCollector.d.ts.map