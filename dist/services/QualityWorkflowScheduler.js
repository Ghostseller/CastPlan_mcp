import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
export class QualityWorkflowScheduler extends EventEmitter {
    db;
    scheduler;
    loadBalancer;
    scheduledTasks = new Map();
    priorityQueue = [];
    resourceCapacity = {
        cpu: 0,
        memory: 0,
        io: 0,
        network: 0,
        concurrentTasks: 0,
        queueLength: 0,
        throughput: 0
    };
    metrics = {
        averageWaitTime: 0,
        averageExecutionTime: 0,
        throughputRate: 0,
        slaCompliance: 100,
        resourceUtilization: this.resourceCapacity,
        schedulingLatency: 0,
        queueDepth: 0,
        failureRate: 0,
        predictionAccuracy: 0
    };
    priorityWeights = {
        urgency: 0.3,
        importance: 0.25,
        complexity: 0.15,
        dependencies: 0.15,
        slaImpact: 0.1,
        historicalSuccess: 0.05
    };
    isRunning = false;
    schedulingInterval = null;
    metricsInterval = null;
    constructor(database, optimizer, loadBalancer) {
        super();
        this.db = database;
        this.scheduler = optimizer;
        this.loadBalancer = loadBalancer;
        this.initializeDatabase();
        this.loadExistingTasks();
        this.startScheduler();
    }
    initializeDatabase() {
        // Scheduled tasks table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_scheduled_tasks (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        workflow_type TEXT NOT NULL,
        priority REAL NOT NULL,
        base_priority TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        scheduled_at DATETIME NOT NULL,
        deadline_at DATETIME,
        estimated_duration INTEGER NOT NULL,
        dependencies TEXT NOT NULL,
        requirements TEXT NOT NULL,
        sla_requirements TEXT NOT NULL,
        metadata TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_retry_at DATETIME,
        completed_at DATETIME,
        execution_time INTEGER
      )
    `);
        // Scheduling metrics table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_scheduling_metrics (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        average_wait_time REAL NOT NULL,
        average_execution_time REAL NOT NULL,
        throughput_rate REAL NOT NULL,
        sla_compliance REAL NOT NULL,
        resource_utilization TEXT NOT NULL,
        scheduling_latency REAL NOT NULL,
        queue_depth INTEGER NOT NULL,
        failure_rate REAL NOT NULL,
        prediction_accuracy REAL NOT NULL
      )
    `);
        // Priority learning data
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_priority_learning (
        id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        features TEXT NOT NULL,
        actual_priority REAL NOT NULL,
        predicted_priority REAL NOT NULL,
        outcome_score REAL NOT NULL,
        timestamp DATETIME NOT NULL
      )
    `);
    }
    loadExistingTasks() {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM quality_scheduled_tasks
        WHERE status IN ('scheduled', 'queued', 'running')
        ORDER BY priority DESC, created_at ASC
      `);
            const rows = stmt.all();
            for (const row of rows) {
                const task = {
                    id: row.id,
                    entityId: row.entity_id,
                    entityType: row.entity_type,
                    workflowType: row.workflow_type,
                    priority: row.priority,
                    basePriority: row.base_priority,
                    createdAt: new Date(row.created_at),
                    scheduledAt: new Date(row.scheduled_at),
                    deadlineAt: row.deadline_at ? new Date(row.deadline_at) : undefined,
                    estimatedDuration: row.estimated_duration,
                    dependencies: JSON.parse(row.dependencies),
                    requirements: JSON.parse(row.requirements),
                    slaRequirements: JSON.parse(row.sla_requirements),
                    metadata: JSON.parse(row.metadata),
                    status: row.status,
                    retryCount: row.retry_count,
                    lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
                    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
                    executionTime: row.execution_time
                };
                this.scheduledTasks.set(task.id, task);
                if (task.status === 'scheduled' || task.status === 'queued') {
                    this.priorityQueue.push(task);
                }
            }
            this.sortPriorityQueue();
            this.emit('tasksLoaded', { count: this.scheduledTasks.size });
        }
        catch (error) {
            this.emit('error', { phase: 'loadTasks', error });
        }
    }
    /**
     * Schedule a new quality workflow task with intelligent prioritization
     */
    async scheduleTask(entityId, entityType, workflowType, basePriority, options = {}) {
        const startTime = performance.now();
        try {
            const taskId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date();
            // Calculate estimated duration based on task type and complexity
            const estimatedDuration = await this.estimateTaskDuration(entityType, workflowType, options.requirements || {});
            // Create task with default values
            const task = {
                id: taskId,
                entityId,
                entityType,
                workflowType,
                priority: 0, // Will be calculated
                basePriority,
                createdAt: now,
                scheduledAt: now,
                deadlineAt: options.deadlineAt,
                estimatedDuration,
                dependencies: options.dependencies || [],
                requirements: {
                    cpuIntensive: false,
                    memoryIntensive: false,
                    ioIntensive: false,
                    networkIntensive: false,
                    minConcurrency: 1,
                    maxConcurrency: 5,
                    ...options.requirements
                },
                slaRequirements: {
                    maxLatency: 5000,
                    minThroughput: 1,
                    availabilityTarget: 99.5,
                    ...options.slaRequirements
                },
                metadata: options.metadata || {},
                status: 'scheduled',
                retryCount: 0
            };
            // Calculate intelligent priority
            task.priority = await this.calculateIntelligentPriority(task);
            // Store task
            this.scheduledTasks.set(taskId, task);
            this.priorityQueue.push(task);
            this.sortPriorityQueue();
            // Persist to database
            await this.persistTask(task);
            // Update metrics
            const schedulingLatency = performance.now() - startTime;
            this.metrics.schedulingLatency = schedulingLatency;
            this.metrics.queueDepth = this.priorityQueue.length;
            this.emit('taskScheduled', {
                taskId,
                priority: task.priority,
                schedulingLatency,
                queuePosition: this.priorityQueue.findIndex(t => t.id === taskId)
            });
            return taskId;
        }
        catch (error) {
            this.emit('error', { phase: 'scheduleTask', error });
            throw error;
        }
    }
    /**
     * Get next optimal task for execution based on current system state
     */
    async getNextTask() {
        const startTime = performance.now();
        try {
            // Update resource capacity
            await this.updateResourceCapacity();
            // Find best task considering dependencies and resources
            const availableTask = this.findBestAvailableTask();
            if (!availableTask) {
                return null;
            }
            // Mark task as queued
            availableTask.status = 'queued';
            await this.persistTask(availableTask);
            // Remove from priority queue
            const index = this.priorityQueue.findIndex(t => t.id === availableTask.id);
            if (index > -1) {
                this.priorityQueue.splice(index, 1);
            }
            const selectionLatency = performance.now() - startTime;
            this.emit('taskSelected', {
                taskId: availableTask.id,
                priority: availableTask.priority,
                selectionLatency,
                queueDepth: this.priorityQueue.length
            });
            return availableTask;
        }
        catch (error) {
            this.emit('error', { phase: 'getNextTask', error });
            return null;
        }
    }
    /**
     * Mark task as started and update metrics
     */
    async markTaskStarted(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (!task)
            return;
        const now = new Date();
        task.status = 'running';
        // Calculate wait time
        const waitTime = now.getTime() - task.createdAt.getTime();
        this.updateWaitTimeMetrics(waitTime);
        await this.persistTask(task);
        this.resourceCapacity.concurrentTasks++;
        this.emit('taskStarted', { taskId, waitTime });
    }
    /**
     * Mark task as completed and update learning data
     */
    async markTaskCompleted(taskId, executionTime, success = true) {
        const task = this.scheduledTasks.get(taskId);
        if (!task)
            return;
        const now = new Date();
        task.status = success ? 'completed' : 'failed';
        task.completedAt = now;
        task.executionTime = executionTime;
        // Update learning data
        await this.updateLearningData(task, success);
        // Update metrics
        this.updateExecutionMetrics(executionTime, success);
        this.resourceCapacity.concurrentTasks = Math.max(0, this.resourceCapacity.concurrentTasks - 1);
        await this.persistTask(task);
        this.emit('taskCompleted', {
            taskId,
            executionTime,
            success,
            waitTime: task.createdAt.getTime() - now.getTime()
        });
    }
    /**
     * Get current scheduling metrics and status
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get scheduling decision for a specific task
     */
    async getSchedulingDecision(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (!task)
            return null;
        const now = new Date();
        const estimatedStartTime = new Date(now.getTime() + this.estimateWaitTime(task));
        const estimatedCompletionTime = new Date(estimatedStartTime.getTime() + task.estimatedDuration);
        const decision = {
            taskId,
            scheduleTime: now,
            estimatedStartTime,
            estimatedCompletionTime,
            assignedResources: await this.calculateResourceAllocation(task),
            confidence: this.calculateSchedulingConfidence(task),
            reasoning: this.generateSchedulingReasoning(task)
        };
        return decision;
    }
    /**
     * Update priority weights for ML optimization
     */
    updatePriorityWeights(weights) {
        this.priorityWeights = { ...this.priorityWeights, ...weights };
        // Recalculate priorities for all scheduled tasks
        this.priorityQueue.forEach(async (task) => {
            task.priority = await this.calculateIntelligentPriority(task);
        });
        this.sortPriorityQueue();
        this.emit('priorityWeightsUpdated', this.priorityWeights);
    }
    /**
     * Cancel a scheduled task
     */
    async cancelTask(taskId, reason = 'User requested') {
        const task = this.scheduledTasks.get(taskId);
        if (!task)
            return false;
        task.status = 'cancelled';
        task.metadata.cancellationReason = reason;
        task.completedAt = new Date();
        // Remove from priority queue
        const index = this.priorityQueue.findIndex(t => t.id === taskId);
        if (index > -1) {
            this.priorityQueue.splice(index, 1);
        }
        await this.persistTask(task);
        this.emit('taskCancelled', { taskId, reason });
        return true;
    }
    async calculateIntelligentPriority(task) {
        const weights = this.priorityWeights;
        let score = 0;
        // Base priority score (0-25)
        const basePriorityScores = { critical: 25, high: 20, medium: 15, low: 10 };
        score += basePriorityScores[task.basePriority];
        // Urgency based on deadline and creation time (0-30)
        const urgencyScore = this.calculateUrgencyScore(task) * weights.urgency * 30;
        score += urgencyScore;
        // Importance based on entity type and workflow type (0-25)
        const importanceScore = this.calculateImportanceScore(task) * weights.importance * 25;
        score += importanceScore;
        // Complexity penalty/bonus (0-15)
        const complexityScore = this.calculateComplexityScore(task) * weights.complexity * 15;
        score += complexityScore;
        // Dependency chain impact (0-15)
        const dependencyScore = await this.calculateDependencyScore(task) * weights.dependencies * 15;
        score += dependencyScore;
        // SLA impact (0-10)
        const slaScore = this.calculateSLAScore(task) * weights.slaImpact * 10;
        score += slaScore;
        // Historical success rate bonus (0-5)
        const historyScore = await this.calculateHistoryScore(task) * weights.historicalSuccess * 5;
        score += historyScore;
        return Math.min(100, Math.max(0, score));
    }
    calculateUrgencyScore(task) {
        if (!task.deadlineAt)
            return 0.5;
        const now = Date.now();
        const deadline = task.deadlineAt.getTime();
        const timeToDeadline = deadline - now;
        const estimatedDuration = task.estimatedDuration;
        if (timeToDeadline <= 0)
            return 1.0; // Past deadline
        if (timeToDeadline <= estimatedDuration)
            return 0.9; // Critical timing
        if (timeToDeadline <= estimatedDuration * 2)
            return 0.7; // Urgent
        if (timeToDeadline <= estimatedDuration * 5)
            return 0.5; // Normal
        return 0.3; // Low urgency
    }
    calculateImportanceScore(task) {
        let score = 0.5;
        // Entity type importance
        if (task.entityType === 'system')
            score += 0.3;
        else if (task.entityType === 'document')
            score += 0.2;
        else
            score += 0.1;
        // Workflow type importance
        const workflowScores = {
            optimization: 0.2,
            quality_assessment: 0.15,
            improvement: 0.15,
            validation: 0.1,
            monitoring: 0.05
        };
        score += workflowScores[task.workflowType] || 0.1;
        return Math.min(1.0, score);
    }
    calculateComplexityScore(task) {
        let score = 0.5;
        const req = task.requirements;
        // Resource intensity
        if (req.cpuIntensive)
            score += 0.1;
        if (req.memoryIntensive)
            score += 0.1;
        if (req.ioIntensive)
            score += 0.1;
        if (req.networkIntensive)
            score += 0.1;
        // Concurrency requirements
        if (req.minConcurrency > 1)
            score += 0.1;
        if (req.maxConcurrency > 5)
            score += 0.1;
        return Math.min(1.0, score);
    }
    async calculateDependencyScore(task) {
        if (task.dependencies.length === 0)
            return 0.5;
        let score = 0;
        let blockedDependencies = 0;
        for (const depId of task.dependencies) {
            const depTask = this.scheduledTasks.get(depId);
            if (!depTask || depTask.status !== 'completed') {
                blockedDependencies++;
            }
        }
        // Higher score for tasks with fewer blocking dependencies
        score = 1.0 - (blockedDependencies / task.dependencies.length);
        return score;
    }
    calculateSLAScore(task) {
        const sla = task.slaRequirements;
        let score = 0.5;
        // Stricter SLA requirements get higher priority
        if (sla.maxLatency <= 1000)
            score += 0.3;
        else if (sla.maxLatency <= 5000)
            score += 0.2;
        else
            score += 0.1;
        if (sla.availabilityTarget >= 99.9)
            score += 0.2;
        else if (sla.availabilityTarget >= 99.5)
            score += 0.1;
        return Math.min(1.0, score);
    }
    async calculateHistoryScore(task) {
        try {
            const stmt = this.db.prepare(`
        SELECT AVG(outcome_score) as avg_score, COUNT(*) as count
        FROM quality_priority_learning
        WHERE task_type = ?
        AND timestamp > datetime('now', '-30 days')
      `);
            const result = stmt.get(`${task.entityType}_${task.workflowType}`);
            if (!result || result.count === 0)
                return 0.5;
            return Math.min(1.0, result.avg_score || 0.5);
        }
        catch (error) {
            return 0.5;
        }
    }
    findBestAvailableTask() {
        // Filter tasks that can run now
        const availableTasks = this.priorityQueue.filter(task => {
            // Check dependencies
            const dependenciesMet = task.dependencies.every(depId => {
                const depTask = this.scheduledTasks.get(depId);
                return depTask && depTask.status === 'completed';
            });
            // Check resource availability
            const resourcesAvailable = this.checkResourceAvailability(task);
            return dependenciesMet && resourcesAvailable && task.status === 'scheduled';
        });
        return availableTasks.length > 0 ? availableTasks[0] : null;
    }
    checkResourceAvailability(task) {
        const capacity = this.resourceCapacity;
        const req = task.requirements;
        // Simple resource availability check
        if (capacity.concurrentTasks >= 20)
            return false;
        if (req.cpuIntensive && capacity.cpu > 80)
            return false;
        if (req.memoryIntensive && capacity.memory > 80)
            return false;
        if (req.ioIntensive && capacity.io > 80)
            return false;
        if (req.networkIntensive && capacity.network > 80)
            return false;
        return true;
    }
    async updateResourceCapacity() {
        // Get current system metrics
        const optimizer = this.scheduler;
        const systemMetrics = await optimizer.getSystemMetrics();
        this.resourceCapacity = {
            cpu: systemMetrics.cpu.usage,
            memory: systemMetrics.memory.usage,
            io: systemMetrics.performance.dbQueryTime / 10, // Rough approximation
            network: systemMetrics.performance.cacheHitRate < 0.8 ? 50 : 20, // Approximation
            concurrentTasks: systemMetrics.activeConnections,
            queueLength: this.priorityQueue.length,
            throughput: this.metrics.throughputRate
        };
    }
    estimateWaitTime(task) {
        const queuePosition = this.priorityQueue.findIndex(t => t.id === task.id);
        if (queuePosition === -1)
            return 0;
        const avgExecutionTime = this.metrics.averageExecutionTime || 30000;
        const concurrency = Math.max(1, this.resourceCapacity.concurrentTasks);
        return (queuePosition * avgExecutionTime) / concurrency;
    }
    async calculateResourceAllocation(task) {
        const baseAllocation = 25; // 25% base allocation
        const req = task.requirements;
        return {
            cpuAllocation: req.cpuIntensive ? baseAllocation * 2 : baseAllocation,
            memoryAllocation: req.memoryIntensive ? baseAllocation * 2 : baseAllocation,
            ioAllocation: req.ioIntensive ? baseAllocation * 1.5 : baseAllocation,
            networkAllocation: req.networkIntensive ? baseAllocation * 1.5 : baseAllocation
        };
    }
    calculateSchedulingConfidence(task) {
        let confidence = 0.8; // Base confidence
        // Reduce confidence for resource-intensive tasks during high load
        if (this.resourceCapacity.cpu > 70 && task.requirements.cpuIntensive)
            confidence -= 0.2;
        if (this.resourceCapacity.memory > 70 && task.requirements.memoryIntensive)
            confidence -= 0.2;
        // Increase confidence for high-priority tasks
        if (task.priority > 80)
            confidence += 0.1;
        // Reduce confidence for tasks with many dependencies
        if (task.dependencies.length > 3)
            confidence -= 0.1;
        return Math.min(1.0, Math.max(0.1, confidence));
    }
    generateSchedulingReasoning(task) {
        const reasoning = [];
        reasoning.push(`Task priority: ${task.priority.toFixed(1)}/100`);
        reasoning.push(`Base priority: ${task.basePriority}`);
        if (task.deadlineAt) {
            const timeToDeadline = task.deadlineAt.getTime() - Date.now();
            reasoning.push(`Deadline in ${Math.round(timeToDeadline / 60000)} minutes`);
        }
        if (task.dependencies.length > 0) {
            reasoning.push(`${task.dependencies.length} dependencies`);
        }
        const queuePosition = this.priorityQueue.findIndex(t => t.id === task.id) + 1;
        reasoning.push(`Queue position: ${queuePosition}/${this.priorityQueue.length}`);
        return reasoning;
    }
    async estimateTaskDuration(entityType, workflowType, requirements) {
        // Base durations in milliseconds
        const baseDurations = {
            quality_assessment: 15000,
            improvement: 45000,
            monitoring: 5000,
            optimization: 60000,
            validation: 20000
        };
        let duration = baseDurations[workflowType] || 30000;
        // Adjust for entity type
        if (entityType === 'system')
            duration *= 2;
        else if (entityType === 'document')
            duration *= 1.5;
        // Adjust for resource requirements
        if (requirements.cpuIntensive)
            duration *= 1.3;
        if (requirements.memoryIntensive)
            duration *= 1.2;
        if (requirements.ioIntensive)
            duration *= 1.4;
        return duration;
    }
    sortPriorityQueue() {
        this.priorityQueue.sort((a, b) => {
            // Sort by priority first, then by creation time
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
    }
    async persistTask(task) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quality_scheduled_tasks (
        id, entity_id, entity_type, workflow_type, priority, base_priority,
        created_at, scheduled_at, deadline_at, estimated_duration, dependencies,
        requirements, sla_requirements, metadata, status, retry_count,
        last_retry_at, completed_at, execution_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(task.id, task.entityId, task.entityType, task.workflowType, task.priority, task.basePriority, task.createdAt.toISOString(), task.scheduledAt.toISOString(), task.deadlineAt?.toISOString() || null, task.estimatedDuration, JSON.stringify(task.dependencies), JSON.stringify(task.requirements), JSON.stringify(task.slaRequirements), JSON.stringify(task.metadata), task.status, task.retryCount, task.lastRetryAt?.toISOString() || null, task.completedAt?.toISOString() || null, task.executionTime || null);
    }
    updateWaitTimeMetrics(waitTime) {
        const alpha = 0.1;
        this.metrics.averageWaitTime = this.metrics.averageWaitTime * (1 - alpha) + waitTime * alpha;
    }
    updateExecutionMetrics(executionTime, success) {
        const alpha = 0.1;
        this.metrics.averageExecutionTime = this.metrics.averageExecutionTime * (1 - alpha) + executionTime * alpha;
        // Update failure rate
        const currentFailureRate = success ? 0 : 1;
        this.metrics.failureRate = this.metrics.failureRate * (1 - alpha) + currentFailureRate * alpha;
        // Update throughput (tasks per minute)
        const tasksPerMinute = 60000 / executionTime;
        this.metrics.throughputRate = this.metrics.throughputRate * (1 - alpha) + tasksPerMinute * alpha;
    }
    async updateLearningData(task, success) {
        try {
            const outcomeScore = success ? 1.0 : 0.0;
            const features = {
                entityType: task.entityType,
                workflowType: task.workflowType,
                basePriority: task.basePriority,
                hasDeadline: !!task.deadlineAt,
                dependencyCount: task.dependencies.length,
                requirements: task.requirements
            };
            const stmt = this.db.prepare(`
        INSERT INTO quality_priority_learning (
          id, task_type, features, actual_priority, predicted_priority,
          outcome_score, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(`learn_${Date.now()}_${task.id}`, `${task.entityType}_${task.workflowType}`, JSON.stringify(features), task.priority, task.priority, // Predicted same as actual for now
            outcomeScore, new Date().toISOString());
        }
        catch (error) {
            this.emit('error', { phase: 'updateLearningData', error });
        }
    }
    startScheduler() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Main scheduling loop - check every 5 seconds
        this.schedulingInterval = setInterval(() => {
            this.processSchedulingCycle();
        }, 5000);
        // Metrics update loop - every 30 seconds
        this.metricsInterval = setInterval(() => {
            this.updateMetrics();
        }, 30000);
        this.emit('schedulerStarted');
    }
    async processSchedulingCycle() {
        try {
            // Update system capacity
            await this.updateResourceCapacity();
            // Recalculate priorities for aging tasks
            const now = Date.now();
            for (const task of this.priorityQueue) {
                const age = now - task.createdAt.getTime();
                if (age > 300000) { // 5 minutes
                    const oldPriority = task.priority;
                    task.priority = await this.calculateIntelligentPriority(task);
                    if (Math.abs(task.priority - oldPriority) > 5) {
                        await this.persistTask(task);
                    }
                }
            }
            // Re-sort if priorities changed
            this.sortPriorityQueue();
            // Emit scheduling status
            this.emit('schedulingCycle', {
                queueLength: this.priorityQueue.length,
                resourceUtilization: this.resourceCapacity,
                topPriority: this.priorityQueue[0]?.priority || 0
            });
        }
        catch (error) {
            this.emit('error', { phase: 'schedulingCycle', error });
        }
    }
    async updateMetrics() {
        try {
            // Calculate SLA compliance
            const recentTasks = Array.from(this.scheduledTasks.values())
                .filter(t => t.completedAt && t.completedAt.getTime() > Date.now() - 3600000);
            if (recentTasks.length > 0) {
                const slaCompliant = recentTasks.filter(task => {
                    if (!task.executionTime || !task.slaRequirements)
                        return true;
                    return task.executionTime <= task.slaRequirements.maxLatency;
                });
                this.metrics.slaCompliance = (slaCompliant.length / recentTasks.length) * 100;
            }
            // Update queue depth
            this.metrics.queueDepth = this.priorityQueue.length;
            // Store metrics
            await this.persistMetrics();
            this.emit('metricsUpdated', this.metrics);
        }
        catch (error) {
            this.emit('error', { phase: 'updateMetrics', error });
        }
    }
    async persistMetrics() {
        const stmt = this.db.prepare(`
      INSERT INTO quality_scheduling_metrics (
        id, timestamp, average_wait_time, average_execution_time,
        throughput_rate, sla_compliance, resource_utilization,
        scheduling_latency, queue_depth, failure_rate, prediction_accuracy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(`metrics_${Date.now()}`, new Date().toISOString(), this.metrics.averageWaitTime, this.metrics.averageExecutionTime, this.metrics.throughputRate, this.metrics.slaCompliance, JSON.stringify(this.metrics.resourceUtilization), this.metrics.schedulingLatency, this.metrics.queueDepth, this.metrics.failureRate, this.metrics.predictionAccuracy);
    }
    async shutdown() {
        this.isRunning = false;
        if (this.schedulingInterval) {
            clearInterval(this.schedulingInterval);
            this.schedulingInterval = null;
        }
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        // Cancel all pending tasks
        for (const task of this.priorityQueue) {
            await this.cancelTask(task.id, 'System shutdown');
        }
        this.emit('schedulerShutdown');
    }
}
//# sourceMappingURL=QualityWorkflowScheduler.js.map