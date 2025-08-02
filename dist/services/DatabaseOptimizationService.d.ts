/**
 * Database Optimization Service - Advanced Database Performance Optimization
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Database connection pooling, query optimization, and performance tuning
 *
 * Created: 2025-07-31
 * Author: Database Performance Engineer & Optimization Specialist
 */
import winston from 'winston';
import { EventEmitter } from 'events';
export interface ConnectionPoolConfig {
    maxConnections: number;
    minConnections: number;
    acquireTimeout: number;
    idleTimeout: number;
    maxLifetime: number;
    healthCheckInterval: number;
    enablePreparedStatements: boolean;
    enableWALMode: boolean;
    cacheSize: number;
}
export interface QueryOptimizationStats {
    query: string;
    executionCount: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    lastExecuted: string;
    usesPreparedStatement: boolean;
    usesIndex: boolean;
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
}
export interface DatabaseHealthMetrics {
    connectionPool: {
        active: number;
        idle: number;
        waiting: number;
        total: number;
    };
    performance: {
        averageQueryTime: number;
        queriesPerSecond: number;
        cacheHitRate: number;
        lockWaitTime: number;
    };
    storage: {
        databaseSize: number;
        indexSize: number;
        freePages: number;
        pageSize: number;
    };
    optimization: {
        analyzedQueries: number;
        optimizedQueries: number;
        suggestedIndexes: number;
        unusedIndexes: number;
    };
}
export interface IndexRecommendation {
    table: string;
    columns: string[];
    type: 'btree' | 'hash' | 'composite';
    estimatedBenefit: number;
    queryPatterns: string[];
    reason: string;
}
export interface QueryPlan {
    query: string;
    plan: string;
    estimatedCost: number;
    actualCost?: number;
    usesIndex: boolean;
    indexesUsed: string[];
    recommendations: string[];
}
export declare class DatabaseOptimizationService extends EventEmitter {
    private logger;
    private connectionPool;
    private availableConnections;
    private waitingQueue;
    private config;
    private databasePath;
    private queryStats;
    private preparedStatements;
    private healthCheckInterval?;
    private isInitialized;
    constructor(databasePath: string, logger: winston.Logger, config?: Partial<ConnectionPoolConfig>);
    initialize(): Promise<void>;
    private createConnection;
    private acquireConnection;
    private releaseConnection;
    private destroyConnection;
    executeQuery<T = any>(query: string, params?: any[], options?: {
        useCache?: boolean;
        timeout?: number;
        complexity?: 'simple' | 'moderate' | 'complex';
    }): Promise<T>;
    executeTransaction<T>(operations: Array<{
        query: string;
        params?: any[];
    }>, options?: {
        timeout?: number;
    }): Promise<T[]>;
    private hashQuery;
    private recordQueryExecution;
    private updateQueryStats;
    private detectIndexUsage;
    private estimateQueryComplexity;
    analyzeQueryPlan(query: string): Promise<QueryPlan>;
    private extractIndexesFromPlan;
    private estimateCostFromPlan;
    private generateQueryRecommendations;
    analyzeIndexUsage(): Promise<IndexRecommendation[]>;
    private analyizeTableIndexes;
    private extractWhereColumns;
    private checkIndexExists;
    private startHealthCheck;
    private performHealthCheck;
    getHealthMetrics(): Promise<DatabaseHealthMetrics>;
    private calculateCacheHitRate;
    private analyzeDatabase;
    getQueryStats(): Map<string, QueryOptimizationStats>;
    optimizeDatabase(): Promise<void>;
    destroy(): Promise<void>;
    private analyzeTableIndexes;
}
export default DatabaseOptimizationService;
//# sourceMappingURL=DatabaseOptimizationService.d.ts.map