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
import { performance } from 'perf_hooks';
import { getErrorMessage } from '../utils/typeHelpers.ts';
// =============================================================================
// ASYNC TASK MANAGER
// =============================================================================
export class AsyncTaskManager extends EventEmitter {
    logger;
    cacheService;
    concurrencyManager;
    taskHandlers = new Map();
    workers = new Map();
    isRunning = false;
    config;
    stats;
    // Queue keys
    TASK_QUEUE_KEY = 'async_tasks:queue';
    TASK_DATA_KEY = 'async_tasks:data';
    TASK_RESULTS_KEY = 'async_tasks:results';
    WORKER_HEARTBEAT_KEY = 'async_tasks:workers';
    // Priority weights for queue ordering
    PRIORITY_WEIGHTS = {
        critical: 1000,
        high: 100,
        medium: 10,
        low: 1
    };
    constructor(logger, cacheService, concurrencyManager, config = {}) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.concurrencyManager = concurrencyManager;
        this.config = {
            concurrency: 5,
            pollInterval: 1000, // 1 second
            maxIdleTime: 300000, // 5 minutes
            taskTimeout: 30000, // 30 seconds
            retryDelays: [1000, 5000, 15000, 30000], // Exponential backoff
            ...config
        };
        this.stats = {
            totalTasks: 0,
            pendingTasks: 0,
            runningTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            activeWorkers: 0,
            averageProcessingTime: 0,
            throughput: 0,
            errorRate: 0
        };
        this.setupEventHandlers();
    }
    // =============================================================================
    // TASK REGISTRATION AND SCHEDULING
    // =============================================================================
    /**
     * Register a task handler for a specific task type
     */
    registerHandler(taskType, handler) {
        this.taskHandlers.set(taskType, handler);
        this.logger.info(`Task handler registered for type: ${taskType}`);
    }
    /**
     * Schedule a new task for execution
     */
    async scheduleTask(taskType, payload, options = {}) {
        const task = {
            id: this.generateTaskId(),
            type: taskType,
            payload,
            priority: options.priority || 'medium',
            status: 'pending',
            createdAt: new Date().toISOString(),
            scheduledAt: options.delay ? new Date(Date.now() + options.delay).toISOString() : undefined,
            attempts: 0,
            maxAttempts: options.maxAttempts || 3,
            timeout: options.timeout || this.config.taskTimeout,
            tags: options.tags || [],
            metadata: options.metadata || {},
            dependencies: options.dependencies
        };
        try {
            // Store task data
            await this.cacheService.set(`${this.TASK_DATA_KEY}:${task.id}`, task, { ttl: 86400 } // 24 hours TTL
            );
            // Add to priority queue
            await this.addToQueue(task);
            this.stats.totalTasks++;
            this.stats.pendingTasks++;
            this.logger.info(`Task scheduled: ${task.id} (type: ${taskType}, priority: ${task.priority})`);
            this.emit('taskScheduled', task);
            return task.id;
        }
        catch (error) {
            this.logger.error(`Failed to schedule task: ${getErrorMessage(error)}`);
            throw error;
        }
    }
    /**
     * Cancel a scheduled task
     */
    async cancelTask(taskId) {
        try {
            const task = await this.getTask(taskId);
            if (!task) {
                return false;
            }
            if (task.status === 'running') {
                this.logger.warn(`Cannot cancel running task: ${taskId}`);
                return false;
            }
            task.status = 'cancelled';
            await this.updateTask(task);
            await this.removeFromQueue(taskId);
            this.logger.info(`Task cancelled: ${taskId}`);
            this.emit('taskCancelled', task);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to cancel task ${taskId}: ${getErrorMessage(error)}`);
            return false;
        }
    }
    /**
     * Get task by ID
     */
    async getTask(taskId) {
        try {
            return await this.cacheService.get(`${this.TASK_DATA_KEY}:${taskId}`);
        }
        catch (error) {
            this.logger.error(`Failed to get task ${taskId}: ${getErrorMessage(error)}`);
            return null;
        }
    }
    /**
     * Get task result
     */
    async getTaskResult(taskId) {
        try {
            return await this.cacheService.get(`${this.TASK_RESULTS_KEY}:${taskId}`);
        }
        catch (error) {
            this.logger.error(`Failed to get task result ${taskId}: ${getErrorMessage(error)}`);
            return null;
        }
    }
    // =============================================================================
    // WORKER MANAGEMENT
    // =============================================================================
    /**
     * Start the task processing workers
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('AsyncTaskManager is already running');
            return;
        }
        this.isRunning = true;
        this.logger.info(`Starting AsyncTaskManager with ${this.config.concurrency} workers`);
        // Start worker processes
        for (let i = 0; i < this.config.concurrency; i++) {
            this.startWorker(`worker-${i}`);
        }
        // Start statistics collector
        this.startStatsCollector();
        this.emit('started');
    }
    /**
     * Stop the task processing workers
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping AsyncTaskManager...');
        // Stop all workers
        for (const [workerId, timer] of this.workers) {
            clearTimeout(timer);
            this.workers.delete(workerId);
        }
        this.emit('stopped');
        this.logger.info('AsyncTaskManager stopped');
    }
    /**
     * Start a single worker
     */
    startWorker(workerId) {
        const processTask = async () => {
            if (!this.isRunning) {
                return;
            }
            try {
                const task = await this.getNextTask();
                if (task) {
                    await this.processTask(task, workerId);
                }
            }
            catch (error) {
                this.logger.error(`Worker ${workerId} error: ${getErrorMessage(error)}`);
            }
            finally {
                // Schedule next poll
                if (this.isRunning) {
                    const timer = setTimeout(processTask, this.config.pollInterval);
                    this.workers.set(workerId, timer);
                }
            }
        };
        // Start immediate processing
        const timer = setTimeout(processTask, 0);
        this.workers.set(workerId, timer);
        this.stats.activeWorkers++;
        this.logger.debug(`Worker started: ${workerId}`);
    }
    // =============================================================================
    // TASK PROCESSING
    // =============================================================================
    /**
     * Get the next task from the queue
     */
    async getNextTask() {
        try {
            // Get highest priority task
            const taskIds = await this.cacheService.mget([this.TASK_QUEUE_KEY]);
            if (!taskIds[0] || !Array.isArray(taskIds[0])) {
                return null;
            }
            // Find the first available task
            for (const taskId of taskIds[0]) {
                const task = await this.getTask(taskId);
                if (task && task.status === 'pending') {
                    // Check if scheduled time has passed
                    if (task.scheduledAt && new Date(task.scheduledAt) > new Date()) {
                        continue;
                    }
                    // Check dependencies
                    if (task.dependencies && task.dependencies.length > 0) {
                        const allCompleted = await this.checkDependencies(task.dependencies);
                        if (!allCompleted) {
                            continue;
                        }
                    }
                    return task;
                }
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get next task: ${getErrorMessage(error)}`);
            return null;
        }
    }
    /**
     * Process a single task
     */
    async processTask(task, workerId) {
        const startTime = performance.now();
        try {
            // Update task status to running
            task.status = 'running';
            task.startedAt = new Date().toISOString();
            task.attempts++;
            await this.updateTask(task);
            this.stats.runningTasks++;
            this.stats.pendingTasks--;
            // Update worker heartbeat
            await this.updateWorkerHeartbeat(workerId, task.id);
            this.logger.info(`Processing task: ${task.id} (worker: ${workerId}, attempt: ${task.attempts})`);
            this.emit('taskStarted', task);
            // Get task handler
            const handler = this.taskHandlers.get(task.type);
            if (!handler) {
                throw new Error(`No handler registered for task type: ${task.type}`);
            }
            // Execute task with timeout using concurrency manager
            const result = await this.concurrencyManager.executeTask('task-processing', () => handler(task), {
                timeout: task.timeout,
                retries: 0, // We handle retries at the task level
                priority: task.priority === 'critical' ? 'critical' : 'medium'
            });
            // Task completed successfully
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            task.result = result;
            await this.updateTask(task);
            await this.storeTaskResult(task.id, result);
            await this.removeFromQueue(task.id);
            const processingTime = performance.now() - startTime;
            this.updateStats('completed', processingTime);
            this.logger.info(`Task completed: ${task.id} (${processingTime.toFixed(2)}ms)`);
            this.emit('taskCompleted', task);
        }
        catch (error) {
            const processingTime = performance.now() - startTime;
            await this.handleTaskError(task, error, processingTime);
        }
        finally {
            this.stats.runningTasks--;
            await this.clearWorkerHeartbeat(workerId);
        }
    }
    /**
     * Handle task execution errors
     */
    async handleTaskError(task, error, processingTime) {
        const errorMessage = getErrorMessage(error);
        this.logger.error(`Task failed: ${task.id} - ${errorMessage}`);
        task.error = errorMessage;
        // Check if we should retry
        if (task.attempts < task.maxAttempts) {
            // Schedule retry with exponential backoff
            const retryDelay = this.config.retryDelays[Math.min(task.attempts - 1, this.config.retryDelays.length - 1)];
            task.status = 'retrying';
            task.scheduledAt = new Date(Date.now() + retryDelay).toISOString();
            await this.updateTask(task);
            await this.addToQueue(task); // Re-add to queue
            this.logger.info(`Task scheduled for retry: ${task.id} (attempt ${task.attempts}/${task.maxAttempts}) in ${retryDelay}ms`);
            this.emit('taskRetrying', task);
        }
        else {
            // Max attempts reached, mark as failed
            task.status = 'failed';
            task.completedAt = new Date().toISOString();
            await this.updateTask(task);
            await this.removeFromQueue(task.id);
            this.updateStats('failed', processingTime);
            this.emit('taskFailed', task);
        }
    }
    // =============================================================================
    // QUEUE MANAGEMENT
    // =============================================================================
    /**
     * Add task to priority queue
     */
    async addToQueue(task) {
        const score = this.calculatePriorityScore(task);
        // Note: This is a simplified implementation
        // In a real Redis implementation, you'd use ZADD for priority queues
        const queueData = await this.cacheService.get(this.TASK_QUEUE_KEY) || [];
        queueData.push(task.id);
        await this.cacheService.set(this.TASK_QUEUE_KEY, queueData, { ttl: 86400 });
    }
    /**
     * Remove task from queue
     */
    async removeFromQueue(taskId) {
        const queueData = await this.cacheService.get(this.TASK_QUEUE_KEY) || [];
        const filteredQueue = queueData.filter(id => id !== taskId);
        await this.cacheService.set(this.TASK_QUEUE_KEY, filteredQueue, { ttl: 86400 });
    }
    /**
     * Calculate priority score for queue ordering
     */
    calculatePriorityScore(task) {
        const priorityWeight = this.PRIORITY_WEIGHTS[task.priority];
        const timeWeight = Date.now() - new Date(task.createdAt).getTime();
        return priorityWeight * 1000000 + timeWeight; // Higher score = higher priority
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    /**
     * Update task data
     */
    async updateTask(task) {
        await this.cacheService.set(`${this.TASK_DATA_KEY}:${task.id}`, task, { ttl: 86400 });
    }
    /**
     * Store task result
     */
    async storeTaskResult(taskId, result) {
        await this.cacheService.set(`${this.TASK_RESULTS_KEY}:${taskId}`, result, { ttl: 86400 });
    }
    /**
     * Check if all dependencies are completed
     */
    async checkDependencies(dependencies) {
        for (const depId of dependencies) {
            const depTask = await this.getTask(depId);
            if (!depTask || depTask.status !== 'completed') {
                return false;
            }
        }
        return true;
    }
    /**
     * Update worker heartbeat
     */
    async updateWorkerHeartbeat(workerId, taskId) {
        await this.cacheService.set(`${this.WORKER_HEARTBEAT_KEY}:${workerId}`, { taskId, timestamp: Date.now() }, { ttl: 300 } // 5 minutes TTL
        );
    }
    /**
     * Clear worker heartbeat
     */
    async clearWorkerHeartbeat(workerId) {
        await this.cacheService.delete(`${this.WORKER_HEARTBEAT_KEY}:${workerId}`);
    }
    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Update statistics
     */
    updateStats(outcome, processingTime) {
        if (outcome === 'completed') {
            this.stats.completedTasks++;
        }
        else {
            this.stats.failedTasks++;
        }
        // Update average processing time
        const totalCompleted = this.stats.completedTasks + this.stats.failedTasks;
        this.stats.averageProcessingTime =
            (this.stats.averageProcessingTime * (totalCompleted - 1) + processingTime) / totalCompleted;
        // Update error rate
        this.stats.errorRate = this.stats.failedTasks / totalCompleted;
    }
    /**
     * Start statistics collector
     */
    startStatsCollector() {
        setInterval(() => {
            this.collectStats();
        }, 60000); // Every minute
    }
    /**
     * Collect and emit statistics
     */
    async collectStats() {
        try {
            // Update pending tasks count
            const queueData = await this.cacheService.get(this.TASK_QUEUE_KEY) || [];
            this.stats.pendingTasks = queueData.length;
            // Calculate throughput (tasks completed in last minute)
            // This is a simplified calculation
            this.stats.throughput = this.stats.completedTasks;
            this.emit('stats', { ...this.stats });
        }
        catch (error) {
            this.logger.error(`Failed to collect stats: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('taskFailed', (task) => {
            this.logger.error(`Task ${task.id} failed after ${task.attempts} attempts: ${task.error}`);
        });
        this.on('stats', (stats) => {
            this.logger.debug('Task queue stats:', stats);
        });
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Get current statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get queue status
     */
    async getQueueStatus() {
        const queueData = await this.cacheService.get(this.TASK_QUEUE_KEY) || [];
        return {
            isRunning: this.isRunning,
            activeWorkers: this.workers.size,
            pendingTasks: queueData.length,
            runningTasks: this.stats.runningTasks
        };
    }
    /**
     * Clear completed tasks older than specified time
     */
    async cleanupCompletedTasks(olderThanHours = 24) {
        let cleanedCount = 0;
        const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
        try {
            // This is a simplified cleanup - in production you'd use Redis SCAN
            // for better performance with large datasets
            const queueData = await this.cacheService.get(this.TASK_QUEUE_KEY) || [];
            for (const taskId of queueData) {
                const task = await this.getTask(taskId);
                if (task &&
                    (task.status === 'completed' || task.status === 'failed') &&
                    task.completedAt &&
                    new Date(task.completedAt).getTime() < cutoffTime) {
                    await this.cacheService.delete(`${this.TASK_DATA_KEY}:${taskId}`);
                    await this.cacheService.delete(`${this.TASK_RESULTS_KEY}:${taskId}`);
                    cleanedCount++;
                }
            }
            this.logger.info(`Cleaned up ${cleanedCount} completed tasks`);
            return cleanedCount;
        }
        catch (error) {
            this.logger.error(`Failed to cleanup completed tasks: ${getErrorMessage(error)}`);
            return 0;
        }
    }
}
export default AsyncTaskManager;
//# sourceMappingURL=AsyncTaskManager.js.map