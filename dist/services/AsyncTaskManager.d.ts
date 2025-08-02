/**
 * Async Task Manager - Advanced Task Queue and Processing System
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * Redis 기반 작업 큐, 우선순위 스케줄링, 워커 풀 관리
 *
 * Created: 2025-07-31
 * Author: Backend Architect & Performance Engineer
 */
import { EventEmitter } from 'events';
import winston from 'winston';
import { RedisCacheService } from './RedisCacheService.ts';
import { ConcurrencyManager } from './ConcurrencyManager.ts';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export interface AsyncTask {
    id: string;
    type: string;
    payload: any;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: string;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    attempts: number;
    maxAttempts: number;
    timeout: number;
    tags: string[];
    metadata: Record<string, any>;
    dependencies?: string[];
    result?: any;
    error?: string;
}
export interface TaskHandler {
    (task: AsyncTask): Promise<any>;
}
export interface TaskScheduleOptions {
    priority?: TaskPriority;
    delay?: number;
    maxAttempts?: number;
    timeout?: number;
    tags?: string[];
    dependencies?: string[];
    metadata?: Record<string, any>;
}
export interface WorkerConfig {
    concurrency: number;
    pollInterval: number;
    maxIdleTime: number;
    taskTimeout: number;
    retryDelays: number[];
}
export interface TaskQueueStats {
    totalTasks: number;
    pendingTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    activeWorkers: number;
    averageProcessingTime: number;
    throughput: number;
    errorRate: number;
}
export declare class AsyncTaskManager extends EventEmitter {
    private logger;
    private cacheService;
    private concurrencyManager;
    private taskHandlers;
    private workers;
    private isRunning;
    private config;
    private stats;
    private readonly TASK_QUEUE_KEY;
    private readonly TASK_DATA_KEY;
    private readonly TASK_RESULTS_KEY;
    private readonly WORKER_HEARTBEAT_KEY;
    private readonly PRIORITY_WEIGHTS;
    constructor(logger: winston.Logger, cacheService: RedisCacheService, concurrencyManager: ConcurrencyManager, config?: Partial<WorkerConfig>);
    /**
     * Register a task handler for a specific task type
     */
    registerHandler(taskType: string, handler: TaskHandler): void;
    /**
     * Schedule a new task for execution
     */
    scheduleTask(taskType: string, payload: any, options?: TaskScheduleOptions): Promise<string>;
    /**
     * Cancel a scheduled task
     */
    cancelTask(taskId: string): Promise<boolean>;
    /**
     * Get task by ID
     */
    getTask(taskId: string): Promise<AsyncTask | null>;
    /**
     * Get task result
     */
    getTaskResult(taskId: string): Promise<any | null>;
    /**
     * Start the task processing workers
     */
    start(): Promise<void>;
    /**
     * Stop the task processing workers
     */
    stop(): Promise<void>;
    /**
     * Start a single worker
     */
    private startWorker;
    /**
     * Get the next task from the queue
     */
    private getNextTask;
    /**
     * Process a single task
     */
    private processTask;
    /**
     * Handle task execution errors
     */
    private handleTaskError;
    /**
     * Add task to priority queue
     */
    private addToQueue;
    /**
     * Remove task from queue
     */
    private removeFromQueue;
    /**
     * Calculate priority score for queue ordering
     */
    private calculatePriorityScore;
    /**
     * Update task data
     */
    private updateTask;
    /**
     * Store task result
     */
    private storeTaskResult;
    /**
     * Check if all dependencies are completed
     */
    private checkDependencies;
    /**
     * Update worker heartbeat
     */
    private updateWorkerHeartbeat;
    /**
     * Clear worker heartbeat
     */
    private clearWorkerHeartbeat;
    /**
     * Generate unique task ID
     */
    private generateTaskId;
    /**
     * Update statistics
     */
    private updateStats;
    /**
     * Start statistics collector
     */
    private startStatsCollector;
    /**
     * Collect and emit statistics
     */
    private collectStats;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Get current statistics
     */
    getStats(): TaskQueueStats;
    /**
     * Get queue status
     */
    getQueueStatus(): Promise<{
        isRunning: boolean;
        activeWorkers: number;
        pendingTasks: number;
        runningTasks: number;
    }>;
    /**
     * Clear completed tasks older than specified time
     */
    cleanupCompletedTasks(olderThanHours?: number): Promise<number>;
}
export default AsyncTaskManager;
//# sourceMappingURL=AsyncTaskManager.d.ts.map