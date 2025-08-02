import { Logger } from 'winston';
import { EventEmitter } from 'events';
/**
 * Advanced Concurrency Manager
 *
 * Provides sophisticated concurrency patterns for CastPlan MCP services:
 * - Task queuing with priority
 * - Rate limiting and throttling
 * - Batch processing
 * - Circuit breaker pattern
 * - Worker pool management
 *
 * Created: 2025-07-31
 */
export interface TaskOptions {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    timeout?: number;
    retries?: number;
    batchable?: boolean;
    circuitBreaker?: string;
}
export interface WorkerPoolConfig {
    maxWorkers: number;
    queueSize: number;
    taskTimeout: number;
    idleTimeout: number;
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitorWindow: number;
}
export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    burstLimit?: number;
}
export declare class ConcurrencyManager extends EventEmitter {
    private logger;
    private taskQueue;
    private activeWorkers;
    private circuitBreakers;
    private rateLimiters;
    private batchProcessors;
    private readonly configs;
    constructor(logger: Logger, configs?: Partial<{
        workerPool: WorkerPoolConfig;
        circuitBreaker: CircuitBreakerConfig;
        rateLimit: RateLimitConfig;
    }>);
    /**
     * Execute task with advanced concurrency control
     */
    executeTask<T>(poolName: string, task: () => Promise<T>, options?: TaskOptions): Promise<T>;
    /**
     * Execute multiple tasks concurrently with smart batching
     */
    executeBatch<T>(poolName: string, tasks: Array<() => Promise<T>>, options?: {
        batchSize?: number;
        concurrency?: number;
        failFast?: boolean;
        timeout?: number;
    }): Promise<T[]>;
    /**
     * Priority-based task scheduling
     */
    private addToQueue;
    /**
     * Process queued tasks with worker pool management
     */
    private processQueue;
    /**
     * Circuit breaker implementation
     */
    private isCircuitOpen;
    private wrapWithCircuitBreaker;
    /**
     * Rate limiting implementation
     */
    private checkRateLimit;
    /**
     * Batch processing for similar tasks
     */
    private addToBatch;
    private processBatch;
    /**
     * Utility methods
     */
    private wrapWithTimeout;
    private wrapWithRetries;
    private sleep;
    private initializeWorkerPools;
    private startMaintenanceTasks;
    private cleanupExpiredTasks;
    private cleanupRateLimiters;
    private logStatistics;
    /**
     * Public API for monitoring
     */
    getStatistics(): {
        pools: {
            name: string;
            queueLength: number;
            activeWorkers: number;
        }[];
        circuitBreakers: {
            name: string;
            isOpen: boolean;
            failures: number;
            lastFailure: number;
        }[];
    };
    shutdown(): Promise<void>;
    private getTotalActiveWorkers;
}
//# sourceMappingURL=ConcurrencyManager.d.ts.map