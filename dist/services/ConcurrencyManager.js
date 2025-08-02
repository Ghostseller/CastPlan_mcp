import { EventEmitter } from 'events';
import { getErrorMessage } from '../utils/typeHelpers.ts';
export class ConcurrencyManager extends EventEmitter {
    logger;
    taskQueue = new Map();
    activeWorkers = new Map();
    circuitBreakers = new Map();
    rateLimiters = new Map();
    batchProcessors = new Map();
    configs;
    constructor(logger, configs) {
        super();
        this.logger = logger;
        // Default configurations
        this.configs = {
            workerPool: {
                maxWorkers: 10,
                queueSize: 1000,
                taskTimeout: 30000,
                idleTimeout: 60000,
                ...configs?.workerPool
            },
            circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 60000,
                monitorWindow: 300000,
                ...configs?.circuitBreaker
            },
            rateLimit: {
                maxRequests: 100,
                windowMs: 60000,
                burstLimit: 20,
                ...configs?.rateLimit
            }
        };
        this.initializeWorkerPools();
        this.startMaintenanceTasks();
    }
    /**
     * Execute task with advanced concurrency control
     */
    async executeTask(poolName, task, options = {}) {
        const { priority = 'medium', timeout = this.configs.workerPool.taskTimeout, retries = 0, batchable = false, circuitBreaker } = options;
        // Check circuit breaker
        if (circuitBreaker && this.isCircuitOpen(circuitBreaker)) {
            throw new Error(`Circuit breaker '${circuitBreaker}' is open`);
        }
        // Check rate limiting
        if (!this.checkRateLimit(poolName)) {
            throw new Error(`Rate limit exceeded for pool '${poolName}'`);
        }
        // Handle batchable tasks
        if (batchable) {
            return this.addToBatch(poolName, task, timeout);
        }
        return new Promise((resolve, reject) => {
            const taskWithTimeout = this.wrapWithTimeout(task, timeout);
            const taskWithRetries = this.wrapWithRetries(taskWithTimeout, retries);
            const taskWithCircuitBreaker = circuitBreaker
                ? this.wrapWithCircuitBreaker(taskWithRetries, circuitBreaker)
                : taskWithRetries;
            const queuedTask = {
                task: taskWithCircuitBreaker,
                options,
                resolve,
                reject,
                createdAt: Date.now()
            };
            this.addToQueue(poolName, queuedTask, priority);
        });
    }
    /**
     * Execute multiple tasks concurrently with smart batching
     */
    async executeBatch(poolName, tasks, options = {}) {
        const { batchSize = 10, concurrency = 3, failFast = false, timeout = this.configs.workerPool.taskTimeout } = options;
        const results = [];
        const errors = [];
        // Process tasks in batches
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            try {
                const batchPromises = batch.map(task => this.executeTask(poolName, task, { timeout }));
                if (failFast) {
                    const batchResults = await Promise.all(batchPromises);
                    results.push(...batchResults);
                }
                else {
                    const batchResults = await Promise.allSettled(batchPromises);
                    batchResults.forEach((result, index) => {
                        if (result.status === 'fulfilled') {
                            results[i + index] = result.value;
                        }
                        else {
                            errors.push(new Error(`Task ${i + index} failed: ${getErrorMessage(result.reason)}`));
                        }
                    });
                }
            }
            catch (error) {
                if (failFast) {
                    throw error;
                }
                errors.push(new Error(getErrorMessage(error)));
            }
            // Throttle between batches to prevent overwhelming
            if (i + batchSize < tasks.length) {
                await this.sleep(100);
            }
        }
        if (errors.length > 0 && failFast) {
            throw new Error(`Batch execution failed with ${errors.length} errors`);
        }
        return results;
    }
    /**
     * Priority-based task scheduling
     */
    addToQueue(poolName, task, priority) {
        if (!this.taskQueue.has(poolName)) {
            this.taskQueue.set(poolName, []);
        }
        const queue = this.taskQueue.get(poolName);
        // Check queue size limits
        if (queue.length >= this.configs.workerPool.queueSize) {
            task.reject(new Error(`Queue full for pool '${poolName}'`));
            return;
        }
        // Insert based on priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const taskPriority = priorityOrder[priority || 'medium'];
        let insertIndex = queue.length;
        for (let i = 0; i < queue.length; i++) {
            const existingPriority = priorityOrder[queue[i].options.priority || 'medium'];
            if (taskPriority < existingPriority) {
                insertIndex = i;
                break;
            }
        }
        queue.splice(insertIndex, 0, task);
        this.processQueue(poolName);
    }
    /**
     * Process queued tasks with worker pool management
     */
    async processQueue(poolName) {
        if (!this.activeWorkers.has(poolName)) {
            this.activeWorkers.set(poolName, new Set());
        }
        const activeWorkerSet = this.activeWorkers.get(poolName);
        const queue = this.taskQueue.get(poolName);
        if (!queue || queue.length === 0)
            return;
        if (activeWorkerSet.size >= this.configs.workerPool.maxWorkers)
            return;
        const task = queue.shift();
        const workerId = `${poolName}-${Date.now()}-${Math.random()}`;
        activeWorkerSet.add(workerId);
        try {
            const result = await task.task();
            task.resolve(result);
        }
        catch (error) {
            task.reject(error);
        }
        finally {
            activeWorkerSet.delete(workerId);
            // Process next task if queue not empty
            if (queue.length > 0) {
                setImmediate(() => this.processQueue(poolName));
            }
        }
    }
    /**
     * Circuit breaker implementation
     */
    isCircuitOpen(circuitBreakerName) {
        const breaker = this.circuitBreakers.get(circuitBreakerName);
        if (!breaker)
            return false;
        const now = Date.now();
        // Check if circuit should be reset
        if (breaker.isOpen && now > breaker.resetTime) {
            breaker.isOpen = false;
            breaker.failures = 0;
            this.logger.info(`Circuit breaker '${circuitBreakerName}' reset`);
        }
        return breaker.isOpen;
    }
    wrapWithCircuitBreaker(task, circuitBreakerName) {
        return async () => {
            if (!this.circuitBreakers.has(circuitBreakerName)) {
                this.circuitBreakers.set(circuitBreakerName, {
                    failures: 0,
                    lastFailure: 0,
                    isOpen: false,
                    resetTime: 0
                });
            }
            const breaker = this.circuitBreakers.get(circuitBreakerName);
            try {
                const result = await task();
                // Reset failure count on success
                breaker.failures = 0;
                return result;
            }
            catch (error) {
                breaker.failures++;
                breaker.lastFailure = Date.now();
                if (breaker.failures >= this.configs.circuitBreaker.failureThreshold) {
                    breaker.isOpen = true;
                    breaker.resetTime = Date.now() + this.configs.circuitBreaker.resetTimeout;
                    this.logger.warn(`Circuit breaker '${circuitBreakerName}' opened after ${breaker.failures} failures`);
                }
                throw error;
            }
        };
    }
    /**
     * Rate limiting implementation
     */
    checkRateLimit(poolName) {
        if (!this.rateLimiters.has(poolName)) {
            this.rateLimiters.set(poolName, {
                requests: [],
                burstTokens: this.configs.rateLimit.burstLimit || 0,
                lastRefill: Date.now()
            });
        }
        const limiter = this.rateLimiters.get(poolName);
        const now = Date.now();
        const windowStart = now - this.configs.rateLimit.windowMs;
        // Clean old requests
        limiter.requests = limiter.requests.filter(time => time > windowStart);
        // Refill burst tokens
        const timeSinceRefill = now - limiter.lastRefill;
        if (timeSinceRefill > 1000) { // Refill every second
            limiter.burstTokens = Math.min(this.configs.rateLimit.burstLimit || 0, limiter.burstTokens + Math.floor(timeSinceRefill / 1000));
            limiter.lastRefill = now;
        }
        // Check limits
        const canUseBurst = limiter.burstTokens > 0;
        const withinRateLimit = limiter.requests.length < this.configs.rateLimit.maxRequests;
        if (canUseBurst || withinRateLimit) {
            if (canUseBurst && !withinRateLimit) {
                limiter.burstTokens--;
            }
            limiter.requests.push(now);
            return true;
        }
        return false;
    }
    /**
     * Batch processing for similar tasks
     */
    async addToBatch(batchName, task, timeout) {
        return new Promise((resolve, reject) => {
            if (!this.batchProcessors.has(batchName)) {
                this.batchProcessors.set(batchName, {
                    tasks: [],
                    timer: null
                });
            }
            const processor = this.batchProcessors.get(batchName);
            processor.tasks.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                    return result;
                }
                catch (error) {
                    reject(error);
                    throw error;
                }
            });
            // Set timer for batch processing
            if (processor.timer) {
                clearTimeout(processor.timer);
            }
            processor.timer = setTimeout(() => {
                this.processBatch(batchName);
            }, 100); // 100ms batch window
        });
    }
    async processBatch(batchName) {
        const processor = this.batchProcessors.get(batchName);
        if (!processor || processor.tasks.length === 0)
            return;
        const tasks = processor.tasks.splice(0);
        processor.timer = null;
        try {
            await Promise.allSettled(tasks.map(task => task()));
        }
        catch (error) {
            this.logger.error(`Batch processing error for '${batchName}':`, getErrorMessage(error));
        }
    }
    /**
     * Utility methods
     */
    wrapWithTimeout(task, timeout) {
        return () => {
            return Promise.race([
                task(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout);
                })
            ]);
        };
    }
    wrapWithRetries(task, retries) {
        return async () => {
            let lastError;
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    return await task();
                }
                catch (error) {
                    lastError = new Error(getErrorMessage(error));
                    if (attempt < retries) {
                        const backoff = Math.min(1000 * Math.pow(2, attempt), 30000);
                        await this.sleep(backoff);
                    }
                }
            }
            throw lastError;
        };
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    initializeWorkerPools() {
        // Initialize default pools
        const defaultPools = ['database', 'ai-analysis', 'file-processing', 'cache'];
        defaultPools.forEach(pool => {
            this.taskQueue.set(pool, []);
            this.activeWorkers.set(pool, new Set());
        });
    }
    startMaintenanceTasks() {
        // Clean up expired tasks every minute
        setInterval(() => {
            this.cleanupExpiredTasks();
            this.cleanupRateLimiters();
        }, 60000);
        // Log statistics every 5 minutes
        setInterval(() => {
            this.logStatistics();
        }, 300000);
    }
    cleanupExpiredTasks() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutes
        this.taskQueue.forEach((queue, poolName) => {
            const expiredCount = queue.length;
            this.taskQueue.set(poolName, queue.filter(task => {
                if (now - task.createdAt > maxAge) {
                    task.reject(new Error('Task expired'));
                    return false;
                }
                return true;
            }));
            const newCount = this.taskQueue.get(poolName).length;
            if (expiredCount !== newCount) {
                this.logger.info(`Cleaned up ${expiredCount - newCount} expired tasks from pool '${poolName}'`);
            }
        });
    }
    cleanupRateLimiters() {
        const now = Date.now();
        this.rateLimiters.forEach((limiter, poolName) => {
            const windowStart = now - this.configs.rateLimit.windowMs;
            limiter.requests = limiter.requests.filter(time => time > windowStart);
        });
    }
    logStatistics() {
        const stats = {
            totalPools: this.taskQueue.size,
            totalQueuedTasks: Array.from(this.taskQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
            totalActiveWorkers: Array.from(this.activeWorkers.values()).reduce((sum, workers) => sum + workers.size, 0),
            openCircuitBreakers: Array.from(this.circuitBreakers.values()).filter(cb => cb.isOpen).length
        };
        this.logger.info('Concurrency Manager Stats:', stats);
    }
    /**
     * Public API for monitoring
     */
    getStatistics() {
        return {
            pools: Array.from(this.taskQueue.keys()).map(poolName => ({
                name: poolName,
                queueLength: this.taskQueue.get(poolName)?.length || 0,
                activeWorkers: this.activeWorkers.get(poolName)?.size || 0
            })),
            circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
                name,
                isOpen: cb.isOpen,
                failures: cb.failures,
                lastFailure: cb.lastFailure
            }))
        };
    }
    async shutdown() {
        this.logger.info('Shutting down ConcurrencyManager...');
        // Clear all timers
        this.batchProcessors.forEach(processor => {
            if (processor.timer) {
                clearTimeout(processor.timer);
            }
        });
        // Wait for active tasks to complete (with timeout)
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        while (this.getTotalActiveWorkers() > 0 && Date.now() - startTime < shutdownTimeout) {
            await this.sleep(100);
        }
        this.logger.info('ConcurrencyManager shutdown complete');
    }
    getTotalActiveWorkers() {
        return Array.from(this.activeWorkers.values()).reduce((sum, workers) => sum + workers.size, 0);
    }
}
//# sourceMappingURL=ConcurrencyManager.js.map