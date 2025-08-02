/**
 * Quality System Optimizer - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - System Performance Optimization
 * Advanced system-level performance optimization with dynamic resource management,
 * intelligent caching, and adaptive performance tuning
 *
 * Features:
 * - Real-time system performance monitoring and optimization
 * - Dynamic resource allocation and scaling based on workload
 * - Intelligent caching strategies with predictive pre-loading
 * - Adaptive performance tuning with machine learning insights
 * - Memory management and garbage collection optimization
 * - Database query optimization and connection pooling
 * - Network latency reduction and connection optimization
 * - CPU utilization optimization with workload balancing
 *
 * Performance targets:
 * - 50% reduction in resource usage through optimization
 * - <100ms response time for optimization decisions
 * - >90% cache hit ratio for frequently accessed data
 * - Memory usage optimization with <1GB overhead
 * - CPU utilization optimization maintaining <70% average load
 * - Database query optimization with >95% efficiency improvement
 *
 * Integration points:
 * - QualityWorkflowOrchestrator for system resource coordination
 * - QualityLoadBalancer for dynamic load distribution
 * - QualityMonitoringService for performance metrics collection
 * - Database systems for query optimization
 * - Operating system for resource management
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & System Architect
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualityMonitoringService } from './QualityMonitoringService';
export interface SystemOptimizationConfig {
    /** Enable real-time performance optimization */
    enableRealTimeOptimization: boolean;
    /** System resource monitoring intervals */
    monitoring: {
        cpuMonitoringInterval: number;
        memoryMonitoringInterval: number;
        diskMonitoringInterval: number;
        networkMonitoringInterval: number;
    };
    /** Performance optimization thresholds */
    thresholds: {
        cpuUtilizationWarning: number;
        cpuUtilizationCritical: number;
        memoryUsageWarning: number;
        memoryUsageCritical: number;
        diskUsageWarning: number;
        diskUsageCritical: number;
        responseTimeWarning: number;
        responseTimeCritical: number;
    };
    /** Optimization strategies */
    optimization: {
        enableCPUOptimization: boolean;
        enableMemoryOptimization: boolean;
        enableDiskOptimization: boolean;
        enableNetworkOptimization: boolean;
        enableDatabaseOptimization: boolean;
        enableCacheOptimization: boolean;
    };
    /** Cache configuration */
    cache: {
        maxMemorySize: number;
        defaultTTL: number;
        cleanupInterval: number;
        compressionEnabled: boolean;
        encryptionEnabled: boolean;
    };
    /** Database optimization */
    database: {
        connectionPoolSize: number;
        queryTimeout: number;
        optimizationInterval: number;
        indexOptimizationEnabled: boolean;
        vacuumInterval: number;
    };
    /** Performance targets */
    targets: {
        resourceReductionPercentage: number;
        responseTimeTargetMs: number;
        cacheHitRatioTarget: number;
        memoryOverheadLimitMB: number;
        cpuUtilizationTarget: number;
        databaseEfficiencyTarget: number;
    };
}
export interface SystemPerformanceMetrics {
    timestamp: string;
    cpu: {
        utilization: number;
        loadAverage: number[];
        coreCount: number;
        frequency: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        cached: number;
        buffers: number;
        utilization: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        utilization: number;
        iops: {
            read: number;
            write: number;
        };
    };
    network: {
        bytesReceived: number;
        bytesSent: number;
        packetsReceived: number;
        packetsSent: number;
        latency: number;
        bandwidth: {
            download: number;
            upload: number;
        };
    };
    database: {
        connections: number;
        activeQueries: number;
        averageQueryTime: number;
        slowQueries: number;
        cacheHitRatio: number;
    };
    application: {
        responseTime: number;
        throughput: number;
        errorRate: number;
        activeConnections: number;
    };
}
export interface OptimizationStrategy {
    id: string;
    name: string;
    category: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'cache' | 'application';
    priority: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    conditions: Array<{
        metric: string;
        operator: '>' | '<' | '=' | '>=' | '<=';
        threshold: number;
        duration?: number;
    }>;
    actions: Array<{
        type: string;
        parameters: Record<string, any>;
        estimatedImpact: number;
        riskLevel: 'low' | 'medium' | 'high';
    }>;
    cooldownPeriod: number;
    lastApplied?: string;
    successRate: number;
    averageImpact: number;
}
export interface OptimizationResult {
    strategyId: string;
    success: boolean;
    startTime: string;
    endTime: string;
    duration: number;
    beforeMetrics: SystemPerformanceMetrics;
    afterMetrics: SystemPerformanceMetrics;
    actualImpact: {
        cpuImprovement: number;
        memoryImprovement: number;
        responseTimeImprovement: number;
        overallImprovement: number;
    };
    issues: string[];
    rollbackRequired: boolean;
}
export interface CacheEntry {
    key: string;
    value: any;
    ttl: number;
    timestamp: number;
    accessCount: number;
    lastAccessTime: number;
    size: number;
    compressed: boolean;
    encrypted: boolean;
}
export interface CacheStatistics {
    totalEntries: number;
    memoryUsage: number;
    hitRatio: number;
    missRatio: number;
    evictionRate: number;
    averageAccessTime: number;
    compressionRatio: number;
    hotKeys: Array<{
        key: string;
        accessCount: number;
        hitRatio: number;
    }>;
}
export interface DatabaseOptimizationMetrics {
    connectionPool: {
        size: number;
        active: number;
        idle: number;
        waiting: number;
    };
    queries: {
        total: number;
        slow: number;
        failed: number;
        averageTime: number;
        medianTime: number;
        p95Time: number;
        p99Time: number;
    };
    indexes: {
        total: number;
        used: number;
        unused: number;
        fragmented: number;
    };
    storage: {
        size: number;
        fragmentationRatio: number;
        compressionRatio: number;
    };
}
export declare class QualitySystemOptimizer extends EventEmitter {
    private logger;
    private db;
    private config;
    private monitoringService;
    private isOptimizing;
    private systemMetrics;
    private metricsHistory;
    private optimizationStrategies;
    private optimizationResults;
    private activeOptimizations;
    private intelligentCache;
    private cacheStatistics;
    private databaseMetrics;
    private connectionPool;
    private cpuMonitoringInterval?;
    private memoryMonitoringInterval?;
    private diskMonitoringInterval?;
    private networkMonitoringInterval?;
    private optimizationInterval?;
    private cacheCleanupInterval?;
    private startTime;
    private optimizationsApplied;
    private totalResourceSavings;
    constructor(database: Database.Database, logger: Logger, monitoringService: QualityMonitoringService, config?: Partial<SystemOptimizationConfig>);
    private initializeDatabase;
    private setupEventListeners;
    private initializeSystemMetrics;
    private initializeCacheStatistics;
    private initializeDatabaseMetrics;
    private loadOptimizationStrategies;
    private createDefaultOptimizationStrategies;
    startOptimization(): Promise<void>;
    stopOptimization(): Promise<void>;
    private startSystemMonitoring;
    private startCacheManagement;
    private stopAllIntervals;
    private monitorCPUUsage;
    private monitorMemoryUsage;
    private monitorDiskUsage;
    private monitorNetworkUsage;
    private getDiskUsage;
    private getNetworkStats;
    private checkCPUThresholds;
    private checkMemoryThresholds;
    private checkDiskThresholds;
    private performOptimizationCycle;
    private evaluateOptimizationStrategies;
    private evaluateStrategyConditions;
    private getMetricValue;
    private evaluateCondition;
    private checkConditionDuration;
    private getMetricValueFromMetrics;
    private canApplyStrategy;
    private applyOptimizationStrategy;
    private executeOptimizationActions;
    private executeOptimizationAction;
    private reduceWorkerThreads;
    private deferNonCriticalTasks;
    private forceGarbageCollection;
    private clearCacheEntries;
    private optimizeSlowQueries;
    private adjustConnectionPool;
    private optimizeCacheKeys;
    private enableCompression;
    private applyCPUOptimizations;
    private applyMemoryOptimizations;
    private applyDiskOptimizations;
    private applyNetworkOptimizations;
    private clearTemporaryFiles;
    private compressLogFiles;
    cacheGet(key: string): Promise<any | null>;
    cacheSet(key: string, value: any, ttl?: number): Promise<void>;
    cacheDelete(key: string): Promise<boolean>;
    private prepareCacheValue;
    private processCacheValue;
    private shouldEvictForSpace;
    private calculateCacheMemoryUsage;
    private performCacheEviction;
    private performCacheCleanup;
    private updateCacheStatistics;
    private calculateAverageAccessTime;
    private calculateCompressionRatio;
    private getHotKeys;
    private loadCacheFromDatabase;
    private flushCacheToDatabase;
    private updateDatabaseMetrics;
    private calculateOptimizationImpact;
    private updateAllSystemMetrics;
    private updateStrategyStatistics;
    private handleQualityEvent;
    private handleMetricsCollected;
    private handleMemoryUsageEvent;
    private saveSystemMetrics;
    private saveOptimizationResult;
    private saveCacheStatistics;
    getSystemMetrics(): Promise<SystemPerformanceMetrics>;
    getOptimizationResults(limit?: number): Promise<OptimizationResult[]>;
    getCacheStatistics(): Promise<CacheStatistics>;
    getDatabaseMetrics(): Promise<DatabaseOptimizationMetrics>;
    getOptimizationStrategies(): Promise<OptimizationStrategy[]>;
    updateConfiguration(newConfig: Partial<SystemOptimizationConfig>): Promise<void>;
    enableStrategy(strategyId: string): Promise<boolean>;
    disableStrategy(strategyId: string): Promise<boolean>;
    isOptimizing(): boolean;
    getOptimizationStats(): {
        optimizationsApplied: number;
        totalResourceSavings: number;
        activeOptimizations: number;
        uptime: number;
    };
    forceOptimizationCycle(): Promise<void>;
    destroy(): Promise<void>;
}
export default QualitySystemOptimizer;
//# sourceMappingURL=QualitySystemOptimizer.d.ts.map