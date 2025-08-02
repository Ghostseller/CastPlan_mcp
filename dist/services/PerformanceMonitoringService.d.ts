/**
 * Performance Monitoring Service - Real-time Performance Tracking and Optimization
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Real-time performance monitoring, optimization, and alerting for version tracking system
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & System Optimization Specialist
 */
import winston from 'winston';
import { EventEmitter } from 'events';
export interface PerformanceMetrics {
    timestamp: string;
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}
export interface SystemResourceMetrics {
    cpu: {
        usage: number;
        load: number[];
        processes: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
        heapUsed: number;
        heapTotal: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
        readTime: number;
        writeTime: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connections: number;
        latency: number;
    };
}
export interface QueryPerformanceMetrics {
    queryType: string;
    duration: number;
    rowsAffected: number;
    cacheHit: boolean;
    queryComplexity: 'simple' | 'moderate' | 'complex';
    indexUsage: boolean;
    timestamp: string;
}
export interface CachePerformanceMetrics {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    size: number;
    maxSize: number;
    averageAccessTime: number;
    memoryUsage: number;
}
export interface AlertConfiguration {
    metric: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    severity: 'info' | 'warning' | 'error' | 'critical';
    cooldown: number;
    enabled: boolean;
}
export interface PerformanceReport {
    id: string;
    timeframe: {
        start: string;
        end: string;
    };
    summary: {
        averageResponseTime: number;
        errorRate: number;
        throughput: number;
        availability: number;
    };
    topSlowQueries: QueryPerformanceMetrics[];
    resourceUsage: SystemResourceMetrics;
    cacheEfficiency: CachePerformanceMetrics;
    recommendations: string[];
    generatedAt: string;
}
export declare class PerformanceMonitoringService extends EventEmitter {
    private logger;
    private db;
    private performanceMetrics;
    private queryMetrics;
    private resourceMetrics;
    private cacheMetrics;
    private alerts;
    private isMonitoring;
    private monitoringInterval?;
    private readonly maxMetricsHistory;
    private readonly cleanupInterval;
    private lastCleanup;
    constructor(database: Database.Database, logger: winston.Logger, config?: {
        monitoringInterval?: number;
        maxMetricsHistory?: number;
        enableResourceMonitoring?: boolean;
    });
    private initializeTables;
    private setupDefaultAlerts;
    recordMetric(operation: string, duration: number, success: boolean, error?: string, metadata?: Record<string, any>): Promise<void>;
    recordQueryMetric(queryMetric: QueryPerformanceMetrics): Promise<void>;
    updateCacheMetrics(cacheId: string, metrics: CachePerformanceMetrics): void;
    private collectResourceMetrics;
    private measureNetworkLatency;
    startMonitoring(interval?: number): void;
    stopMonitoring(): void;
    private checkAlerts;
    private checkResourceAlerts;
    private evaluateCondition;
    private triggerAlert;
    private calculateErrorRate;
    getPerformanceReport(timeframe: {
        start: string;
        end: string;
    }): Promise<PerformanceReport>;
    private generateRecommendations;
    private cleanupOldMetrics;
    getMetrics(operation?: string, timeframe?: {
        start: string;
        end: string;
    }): Promise<PerformanceMetrics[]>;
    getQueryMetrics(timeframe?: {
        start: string;
        end: string;
    }): QueryPerformanceMetrics[];
    getResourceMetrics(limit?: number): SystemResourceMetrics[];
    getCacheMetrics(): Map<string, CachePerformanceMetrics>;
    configureAlert(metric: string, config: AlertConfiguration): void;
    getAlerts(): Map<string, AlertConfiguration>;
    destroy(): Promise<void>;
    createInstrumentation(): {
        time: (operation: string) => {
            end: (success?: boolean, error?: string, metadata?: Record<string, any>) => Promise<number>;
        };
        query: (queryType: string, complexity?: "simple" | "moderate" | "complex") => {
            end: (rowsAffected?: number, cacheHit?: boolean, indexUsage?: boolean) => Promise<number>;
        };
    };
}
export default PerformanceMonitoringService;
//# sourceMappingURL=PerformanceMonitoringService.d.ts.map