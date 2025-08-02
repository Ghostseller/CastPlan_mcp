/**
 * Performance Benchmarking Service - Comprehensive Performance Testing and Benchmarking
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Performance benchmarking, load testing, and performance regression detection
 *
 * Created: 2025-07-31
 * Author: Performance Testing Engineer & Benchmarking Specialist
 */
import winston from 'winston';
import { EventEmitter } from 'events';
export interface BenchmarkConfiguration {
    name: string;
    description: string;
    category: 'database' | 'analytics' | 'api' | 'system' | 'integration';
    iterations: number;
    warmupIterations: number;
    timeout: number;
    concurrent: boolean;
    concurrencyLevel?: number;
    parameters?: Record<string, any>;
    baseline?: BenchmarkResult;
}
export interface BenchmarkResult {
    configurationName: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    iterations: number;
    statistics: {
        mean: number;
        median: number;
        min: number;
        max: number;
        standardDeviation: number;
        percentile95: number;
        percentile99: number;
    };
    throughput: {
        operationsPerSecond: number;
        requestsPerMinute: number;
    };
    resourceUsage: {
        peakMemory: number;
        averageMemory: number;
        cpuTime: number;
    };
    errors: number;
    errorRate: number;
    success: boolean;
    regressionDetected: boolean;
    regressionReason?: string;
    rawResults: number[];
    metadata: Record<string, any>;
}
export interface BenchmarkSuite {
    id: string;
    name: string;
    description: string;
    configurations: BenchmarkConfiguration[];
    setupScript?: string;
    teardownScript?: string;
    executionOrder: 'sequential' | 'parallel' | 'random';
    abortOnFailure: boolean;
    createdAt: string;
}
export interface PerformanceRegression {
    benchmarkName: string;
    metric: string;
    currentValue: number;
    baselineValue: number;
    regressionPercentage: number;
    severity: 'minor' | 'moderate' | 'severe' | 'critical';
    detectedAt: string;
    possibleCauses: string[];
    recommendations: string[];
}
export interface LoadTestConfiguration {
    name: string;
    targetFunction: string;
    parameters: any[];
    virtualUsers: number;
    rampUpTime: number;
    sustainTime: number;
    rampDownTime: number;
    thinkTime: number;
    maxErrors: number;
    successCriteria: {
        averageResponseTime: number;
        maxResponseTime: number;
        errorRate: number;
        throughput: number;
    };
}
export interface LoadTestResult {
    configurationName: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    virtualUsers: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: number;
    responseTimeStats: {
        mean: number;
        median: number;
        min: number;
        max: number;
        percentile95: number;
        percentile99: number;
    };
    throughputStats: {
        requestsPerSecond: number;
        requestsPerMinute: number;
        peakThroughput: number;
    };
    resourceUsage: {
        peakCpuUsage: number;
        peakMemoryUsage: number;
        networkBytes: number;
    };
    successCriteriaMet: boolean;
    bottlenecks: string[];
    recommendations: string[];
}
export declare class PerformanceBenchmarkingService extends EventEmitter {
    private logger;
    private db;
    private benchmarkResults;
    private baselines;
    private regressionThreshold;
    private isRunning;
    constructor(database: Database.Database, logger: winston.Logger);
    private initializeTables;
    runBenchmark(config: BenchmarkConfiguration, testFunction: (...args: any[]) => Promise<any>): Promise<BenchmarkResult>;
    private runConcurrentBenchmark;
    runLoadTest(config: LoadTestConfiguration, testFunction: (...args: any[]) => Promise<any>): Promise<LoadTestResult>;
    private checkSuccessCriteria;
    private identifyBottlenecks;
    private generateLoadTestRecommendations;
    private calculateStatistics;
    private detectRegression;
    private classifyRegressionSeverity;
    private storeBenchmarkResult;
    private storeLoadTestResult;
    private recordRegression;
    setBaseline(benchmarkName: string, result: BenchmarkResult): void;
    getBaseline(benchmarkName: string): BenchmarkResult | null;
    getBenchmarkHistory(benchmarkName: string, limit?: number): BenchmarkResult[];
    getRegressions(resolved?: boolean): Promise<PerformanceRegression[]>;
    setRegressionThreshold(threshold: number): void;
    isRunning(): boolean;
    destroy(): Promise<void>;
}
export default PerformanceBenchmarkingService;
//# sourceMappingURL=PerformanceBenchmarkingService.d.ts.map