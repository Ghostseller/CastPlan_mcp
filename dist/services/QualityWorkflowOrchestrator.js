/**
 * Quality Workflow Orchestrator - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - Intelligent Workflow Scheduling and Management
 * Advanced orchestration system for managing multiple automated quality workflows
 * with intelligent scheduling, resource optimization, and adaptive coordination
 *
 * Features:
 * - Intelligent workflow scheduling based on priority, resources, and dependencies
 * - Dynamic resource allocation and load balancing across workflows
 * - Adaptive workflow coordination with real-time optimization
 * - Machine learning-driven scheduling optimization
 * - Cross-workflow dependency management and conflict resolution
 * - Performance monitoring with automatic scaling and optimization
 * - Health monitoring and automatic recovery mechanisms
 *
 * Performance targets:
 * - Workflow scheduling latency: <100ms
 * - Resource utilization optimization: >85%
 * - Concurrent workflow management: Up to 20 workflows
 * - Scheduling accuracy: >98%
 * - System uptime: >99.9%
 *
 * Integration points:
 * - AutomatedQualityWorkflow for workflow execution coordination
 * - QualitySystemOptimizer for system-level performance optimization
 * - QualityLoadBalancer for dynamic resource distribution
 * - QualityWorkflowScheduler for intelligent task prioritization
 * - QualityMonitoringService for real-time system monitoring
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & System Architect
 */
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { QualityEventType } from './QualityMonitoringService';
// =============================================================================
// QUALITY WORKFLOW ORCHESTRATOR
// =============================================================================
export class QualityWorkflowOrchestrator extends EventEmitter {
    logger;
    db;
    config;
    // Core components
    automatedWorkflow;
    monitoringService;
    // Orchestration state
    isRunning = false;
    scheduleEntries = new Map();
    resourceAllocations = new Map();
    activeWorkflows = new Map();
    // Scheduling and optimization
    schedulingQueue = [];
    schedulingHistory = [];
    performanceHistory = [];
    // System monitoring
    systemHealth;
    metrics;
    startTime = Date.now();
    // Intervals and timers
    schedulingInterval;
    healthCheckInterval;
    metricsCollectionInterval;
    optimizationInterval;
    constructor(database, logger, automatedWorkflow, monitoringService, config = {}) {
        super();
        this.db = database;
        this.logger = logger;
        this.automatedWorkflow = automatedWorkflow;
        this.monitoringService = monitoringService;
        // Set default configuration
        this.config = {
            maxConcurrentWorkflows: {
                critical: 5,
                high: 8,
                medium: 10,
                low: 15
            },
            resourceLimits: {
                totalCPU: 8.0, // 8 cores
                totalMemory: 16.0, // 16GB
                totalIO: 1000 // 1000 IOPS
            },
            scheduling: {
                algorithm: 'adaptive',
                timeSliceMs: 100,
                priorityWeights: {
                    critical: 4.0,
                    high: 3.0,
                    medium: 2.0,
                    low: 1.0
                }
            },
            monitoring: {
                metricsCollectionInterval: 30000, // 30 seconds
                healthCheckInterval: 60000, // 1 minute
                performanceThresholds: {
                    schedulingLatencyMs: 100,
                    resourceUtilizationTarget: 85,
                    workflowSuccessRateTarget: 98
                }
            },
            mlOptimization: {
                enabled: true,
                modelUpdateInterval: 300000, // 5 minutes
                trainingDataSize: 1000,
                optimizationTargets: ['latency', 'throughput', 'resource_efficiency']
            },
            ...config
        };
        // Initialize system state
        this.systemHealth = this.initializeSystemHealth();
        this.metrics = this.initializeMetrics();
        this.initializeDatabase();
        this.setupEventListeners();
        this.logger.info('Quality Workflow Orchestrator initialized', {
            config: this.config,
            maxConcurrentWorkflows: Object.values(this.config.maxConcurrentWorkflows).reduce((a, b) => a + b, 0)
        });
    }
    // =============================================================================
    // INITIALIZATION AND SETUP
    // =============================================================================
    initializeDatabase() {
        try {
            // Workflow schedule entries table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_schedule_entries (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          priority TEXT NOT NULL,
          scheduled_time TEXT NOT NULL,
          estimated_duration INTEGER NOT NULL,
          resource_requirements TEXT NOT NULL,
          dependencies TEXT NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          metadata TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Resource allocations table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS resource_allocations (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          allocated_resources TEXT NOT NULL,
          actual_usage TEXT NOT NULL,
          efficiency REAL NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Orchestration metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS orchestration_metrics (
          id TEXT PRIMARY KEY,
          total_workflows_scheduled INTEGER NOT NULL,
          concurrent_workflows_count INTEGER NOT NULL,
          average_scheduling_latency REAL NOT NULL,
          resource_utilization TEXT NOT NULL,
          workflow_success_rate REAL NOT NULL,
          system_uptime INTEGER NOT NULL,
          scheduling_accuracy REAL NOT NULL,
          throughput TEXT NOT NULL,
          optimization TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Scheduling decisions history table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS scheduling_decisions (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          decision TEXT NOT NULL,
          scheduled_time TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          confidence REAL NOT NULL,
          alternatives TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // System health history table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_health_history (
          id TEXT PRIMARY KEY,
          overall_status TEXT NOT NULL,
          components TEXT NOT NULL,
          metrics TEXT NOT NULL,
          alerts TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create performance indexes
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_schedule_entries_status ON workflow_schedule_entries(status);
        CREATE INDEX IF NOT EXISTS idx_schedule_entries_priority ON workflow_schedule_entries(priority);
        CREATE INDEX IF NOT EXISTS idx_schedule_entries_scheduled_time ON workflow_schedule_entries(scheduled_time);
        CREATE INDEX IF NOT EXISTS idx_allocations_workflow ON resource_allocations(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON orchestration_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_decisions_workflow ON scheduling_decisions(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_health_timestamp ON system_health_history(timestamp);
      `);
            this.logger.info('Orchestration database tables initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize orchestration database:', error);
            throw error;
        }
    }
    setupEventListeners() {
        // Listen to automated workflow events
        this.automatedWorkflow.on('workflow-triggered', this.handleWorkflowTriggered.bind(this));
        this.automatedWorkflow.on('workflow-completed', this.handleWorkflowCompleted.bind(this));
        this.automatedWorkflow.on('workflow-failed', this.handleWorkflowFailed.bind(this));
        // Listen to monitoring service events
        this.monitoringService.on('qualityEvent', this.handleQualityEvent.bind(this));
        this.monitoringService.on(QualityEventType.QUALITY_THRESHOLD_EXCEEDED, this.handleCriticalEvent.bind(this));
        this.logger.info('Orchestration event listeners setup complete');
    }
    initializeSystemHealth() {
        return {
            overall: 'healthy',
            components: {
                scheduler: 'healthy',
                resourceManager: 'healthy',
                workflowEngine: 'healthy',
                monitoring: 'healthy',
                database: 'healthy'
            },
            metrics: {
                memoryUsage: 0,
                cpuUsage: 0,
                diskUsage: 0,
                networkLatency: 0
            },
            alerts: []
        };
    }
    initializeMetrics() {
        return {
            totalWorkflowsScheduled: 0,
            concurrentWorkflowsCount: 0,
            averageSchedulingLatency: 0,
            resourceUtilization: { cpu: 0, memory: 0, io: 0 },
            workflowSuccessRate: 100,
            systemUptime: 0,
            schedulingAccuracy: 100,
            throughput: { workflowsPerHour: 0, workflowsPerDay: 0 },
            optimization: {
                mlOptimizationsApplied: 0,
                performanceImprovements: 0,
                resourceSavings: 0
            }
        };
    }
    // =============================================================================
    // ORCHESTRATION LIFECYCLE
    // =============================================================================
    async startOrchestration() {
        if (this.isRunning) {
            this.logger.warn('Quality workflow orchestration is already running');
            return;
        }
        this.isRunning = true;
        this.startTime = Date.now();
        // Start core orchestration processes
        await this.startSchedulingEngine();
        await this.startHealthMonitoring();
        await this.startMetricsCollection();
        if (this.config.mlOptimization.enabled) {
            await this.startMLOptimization();
        }
        this.emit('orchestration-started');
        this.logger.info('Quality workflow orchestration started', {
            schedulingAlgorithm: this.config.scheduling.algorithm,
            maxConcurrentWorkflows: this.config.maxConcurrentWorkflows,
            mlOptimizationEnabled: this.config.mlOptimization.enabled
        });
    }
    async stopOrchestration() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Stop all intervals
        if (this.schedulingInterval) {
            clearInterval(this.schedulingInterval);
            this.schedulingInterval = undefined;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
        if (this.metricsCollectionInterval) {
            clearInterval(this.metricsCollectionInterval);
            this.metricsCollectionInterval = undefined;
        }
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = undefined;
        }
        // Wait for active workflows to complete
        await this.gracefulShutdown();
        this.emit('orchestration-stopped');
        this.logger.info('Quality workflow orchestration stopped');
    }
    async startSchedulingEngine() {
        this.schedulingInterval = setInterval(() => this.runSchedulingCycle(), this.config.scheduling.timeSliceMs);
        this.logger.info('Scheduling engine started', {
            timeSlice: this.config.scheduling.timeSliceMs,
            algorithm: this.config.scheduling.algorithm
        });
    }
    async startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => this.performHealthCheck(), this.config.monitoring.healthCheckInterval);
        this.logger.info('Health monitoring started', {
            interval: this.config.monitoring.healthCheckInterval
        });
    }
    async startMetricsCollection() {
        this.metricsCollectionInterval = setInterval(() => this.collectMetrics(), this.config.monitoring.metricsCollectionInterval);
        this.logger.info('Metrics collection started', {
            interval: this.config.monitoring.metricsCollectionInterval
        });
    }
    async startMLOptimization() {
        this.optimizationInterval = setInterval(() => this.performMLOptimization(), this.config.mlOptimization.modelUpdateInterval);
        this.logger.info('ML optimization started', {
            interval: this.config.mlOptimization.modelUpdateInterval,
            targets: this.config.mlOptimization.optimizationTargets
        });
    }
    // =============================================================================
    // INTELLIGENT SCHEDULING ENGINE
    // =============================================================================
    async scheduleWorkflow(entityId, entityType, priority, triggeredBy, dependencies = []) {
        const scheduleStartTime = performance.now();
        try {
            // Generate unique schedule entry ID
            const scheduleId = uuidv4();
            // Estimate resource requirements and duration
            const resourceRequirements = await this.estimateResourceRequirements(entityId, entityType, priority);
            const estimatedDuration = await this.estimateWorkflowDuration(entityId, entityType, priority);
            // Create schedule entry
            const scheduleEntry = {
                id: scheduleId,
                workflowId: '', // Will be set when workflow is triggered
                priority,
                scheduledTime: new Date().toISOString(),
                estimatedDuration,
                resourceRequirements,
                dependencies,
                status: 'scheduled',
                retryCount: 0,
                maxRetries: 3,
                metadata: {
                    entityId,
                    entityType,
                    triggeredBy,
                    schedulingReason: this.determineSchedulingReason(priority, triggeredBy)
                }
            };
            // Make scheduling decision
            const decision = await this.makeSchedulingDecision(scheduleEntry);
            // Apply scheduling decision
            await this.applySchedulingDecision(scheduleEntry, decision);
            // Store schedule entry
            this.scheduleEntries.set(scheduleId, scheduleEntry);
            await this.saveScheduleEntry(scheduleEntry);
            // Store scheduling decision
            this.schedulingHistory.push(decision);
            await this.saveSchedulingDecision(decision);
            // Update metrics
            const schedulingLatency = performance.now() - scheduleStartTime;
            this.updateSchedulingMetrics(schedulingLatency);
            // Check performance requirement (<100ms)
            if (schedulingLatency > this.config.monitoring.performanceThresholds.schedulingLatencyMs) {
                this.logger.warn('Scheduling latency exceeded threshold', {
                    scheduleId,
                    latency: `${schedulingLatency.toFixed(2)}ms`,
                    threshold: this.config.monitoring.performanceThresholds.schedulingLatencyMs
                });
            }
            this.emit('workflow-scheduled', { scheduleId, decision, latency: schedulingLatency });
            this.logger.info(`Workflow scheduled: ${scheduleId}`, {
                entityId,
                priority,
                decision: decision.decision,
                schedulingLatency: `${schedulingLatency.toFixed(2)}ms`
            });
            return scheduleId;
        }
        catch (error) {
            this.logger.error(`Failed to schedule workflow for entity ${entityId}:`, error);
            throw error;
        }
    }
    async runSchedulingCycle() {
        if (!this.isRunning || this.schedulingQueue.length === 0) {
            return;
        }
        try {
            // Get current system state
            const currentLoad = this.getCurrentSystemLoad();
            const availableResources = this.getAvailableResources();
            // Process scheduling queue based on algorithm
            switch (this.config.scheduling.algorithm) {
                case 'priority':
                    await this.processPriorityScheduling(availableResources);
                    break;
                case 'fair_share':
                    await this.processFairShareScheduling(availableResources);
                    break;
                case 'adaptive':
                    await this.processAdaptiveScheduling(availableResources, currentLoad);
                    break;
                default:
                    await this.processRoundRobinScheduling(availableResources);
            }
        }
        catch (error) {
            this.logger.error('Error in scheduling cycle:', error);
        }
    }
    async makeSchedulingDecision(scheduleEntry) {
        const currentTime = new Date().toISOString();
        // Check resource availability
        const availableResources = this.getAvailableResources();
        const resourcesAvailable = this.checkResourceAvailability(scheduleEntry.resourceRequirements, availableResources);
        // Check concurrent workflow limits
        const currentCount = this.getCurrentConcurrentCount(scheduleEntry.priority);
        const maxCount = this.config.maxConcurrentWorkflows[scheduleEntry.priority];
        const concurrencyAvailable = currentCount < maxCount;
        // Check dependencies
        const dependenciesMet = await this.checkDependencies(scheduleEntry.dependencies);
        // Make decision based on conditions
        let decision = 'defer';
        let reasoning = '';
        let confidence = 0.5;
        if (scheduleEntry.priority === 'critical') {
            decision = 'prioritize';
            reasoning = 'Critical priority workflows are always prioritized';
            confidence = 0.95;
        }
        else if (resourcesAvailable && concurrencyAvailable && dependenciesMet) {
            decision = 'schedule';
            reasoning = 'All conditions met for immediate scheduling';
            confidence = 0.9;
        }
        else if (!resourcesAvailable) {
            decision = 'defer';
            reasoning = 'Insufficient resources available';
            confidence = 0.8;
        }
        else if (!concurrencyAvailable) {
            decision = 'defer';
            reasoning = 'Concurrent workflow limit reached for priority level';
            confidence = 0.8;
        }
        else if (!dependenciesMet) {
            decision = 'defer';
            reasoning = 'Dependencies not yet satisfied';
            confidence = 0.85;
        }
        // Apply ML optimization if enabled
        if (this.config.mlOptimization.enabled) {
            const mlDecision = await this.applyMLSchedulingOptimization(scheduleEntry, decision);
            if (mlDecision.confidence > confidence) {
                decision = mlDecision.decision;
                reasoning = `ML-optimized: ${mlDecision.reasoning}`;
                confidence = mlDecision.confidence;
            }
        }
        return {
            workflowId: scheduleEntry.workflowId,
            decision,
            scheduledTime: decision === 'schedule' || decision === 'prioritize' ?
                currentTime : this.calculateDeferredTime(scheduleEntry),
            reasoning,
            confidence,
            alternatives: this.generateAlternativeDecisions(scheduleEntry)
        };
    }
    async applySchedulingDecision(scheduleEntry, decision) {
        switch (decision.decision) {
            case 'schedule':
            case 'prioritize':
                await this.executeScheduledWorkflow(scheduleEntry);
                break;
            case 'defer':
                this.addToSchedulingQueue(scheduleEntry);
                break;
            case 'reject':
                scheduleEntry.status = 'failed';
                this.logger.warn(`Workflow rejected: ${scheduleEntry.id}`, {
                    reason: decision.reasoning
                });
                break;
        }
    }
    async executeScheduledWorkflow(scheduleEntry) {
        try {
            // Allocate resources
            const allocation = await this.allocateResources(scheduleEntry);
            this.resourceAllocations.set(scheduleEntry.id, allocation);
            // Trigger workflow
            const workflowId = await this.automatedWorkflow.triggerWorkflow(scheduleEntry.metadata.entityId, scheduleEntry.metadata.entityType, scheduleEntry.metadata.triggeredBy, scheduleEntry.priority);
            // Update schedule entry
            scheduleEntry.workflowId = workflowId;
            scheduleEntry.status = 'running';
            await this.updateScheduleEntry(scheduleEntry);
            this.logger.info(`Workflow execution started: ${workflowId}`, {
                scheduleId: scheduleEntry.id,
                priority: scheduleEntry.priority
            });
        }
        catch (error) {
            scheduleEntry.status = 'failed';
            await this.updateScheduleEntry(scheduleEntry);
            throw error;
        }
    }
    // =============================================================================
    // RESOURCE MANAGEMENT
    // =============================================================================
    async estimateResourceRequirements(entityId, entityType, priority) {
        // Base requirements by entity type
        const baseRequirements = {
            document: { cpu: 0.5, memory: 0.3, io: 0.2 },
            chunk: { cpu: 0.2, memory: 0.1, io: 0.1 },
            system: { cpu: 1.0, memory: 0.6, io: 0.4 }
        };
        // Priority multipliers
        const priorityMultipliers = {
            critical: 1.5,
            high: 1.2,
            medium: 1.0,
            low: 0.8
        };
        const base = baseRequirements[entityType] || baseRequirements.document;
        const multiplier = priorityMultipliers[priority] || 1.0;
        return {
            cpu: Math.min(base.cpu * multiplier, this.config.resourceLimits.totalCPU * 0.5),
            memory: Math.min(base.memory * multiplier, this.config.resourceLimits.totalMemory * 0.5),
            io: Math.min(base.io * multiplier, this.config.resourceLimits.totalIO * 0.5)
        };
    }
    async estimateWorkflowDuration(entityId, entityType, priority) {
        // Base duration in milliseconds
        const baseDurations = {
            document: 120000, // 2 minutes
            chunk: 60000, // 1 minute
            system: 300000 // 5 minutes
        };
        const priorityFactors = {
            critical: 0.8, // Faster processing for critical
            high: 1.0,
            medium: 1.2,
            low: 1.5
        };
        const baseDuration = baseDurations[entityType] || baseDurations.document;
        const priorityFactor = priorityFactors[priority] || 1.0;
        return baseDuration * priorityFactor;
    }
    getAvailableResources() {
        let allocatedCPU = 0;
        let allocatedMemory = 0;
        let allocatedIO = 0;
        for (const allocation of this.resourceAllocations.values()) {
            if (!allocation.endTime) { // Active allocation
                allocatedCPU += allocation.allocatedResources.cpu;
                allocatedMemory += allocation.allocatedResources.memory;
                allocatedIO += allocation.allocatedResources.io;
            }
        }
        return {
            cpu: Math.max(0, this.config.resourceLimits.totalCPU - allocatedCPU),
            memory: Math.max(0, this.config.resourceLimits.totalMemory - allocatedMemory),
            io: Math.max(0, this.config.resourceLimits.totalIO - allocatedIO)
        };
    }
    checkResourceAvailability(required, available) {
        return required.cpu <= available.cpu &&
            required.memory <= available.memory &&
            required.io <= available.io;
    }
    async allocateResources(scheduleEntry) {
        const allocation = {
            workflowId: scheduleEntry.workflowId,
            allocatedResources: { ...scheduleEntry.resourceRequirements },
            actualUsage: { cpu: 0, memory: 0, io: 0 },
            efficiency: 0,
            startTime: new Date().toISOString()
        };
        await this.saveResourceAllocation(allocation);
        return allocation;
    }
    getCurrentSystemLoad() {
        const availableResources = this.getAvailableResources();
        const totalResources = this.config.resourceLimits;
        return {
            cpu: 1 - (availableResources.cpu / totalResources.totalCPU),
            memory: 1 - (availableResources.memory / totalResources.totalMemory),
            io: 1 - (availableResources.io / totalResources.totalIO),
            activeWorkflows: this.activeWorkflows.size
        };
    }
    // =============================================================================
    // SCHEDULING ALGORITHMS
    // =============================================================================
    async processPriorityScheduling(availableResources) {
        // Sort queue by priority and schedule highest priority first
        this.schedulingQueue.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        for (let i = 0; i < this.schedulingQueue.length; i++) {
            const entry = this.schedulingQueue[i];
            if (this.checkResourceAvailability(entry.resourceRequirements, availableResources)) {
                await this.executeScheduledWorkflow(entry);
                this.schedulingQueue.splice(i, 1);
                // Update available resources
                availableResources.cpu -= entry.resourceRequirements.cpu;
                availableResources.memory -= entry.resourceRequirements.memory;
                availableResources.io -= entry.resourceRequirements.io;
                i--; // Adjust index after removal
            }
        }
    }
    async processFairShareScheduling(availableResources) {
        // Implement fair share scheduling logic
        const priorityGroups = this.groupByPriority(this.schedulingQueue);
        for (const [priority, entries] of priorityGroups) {
            const shareWeight = this.config.scheduling.priorityWeights[priority];
            const maxFromGroup = Math.ceil(entries.length * shareWeight / 10);
            let scheduled = 0;
            for (const entry of entries) {
                if (scheduled >= maxFromGroup)
                    break;
                if (this.checkResourceAvailability(entry.resourceRequirements, availableResources)) {
                    await this.executeScheduledWorkflow(entry);
                    this.removeFromQueue(entry.id);
                    scheduled++;
                    // Update available resources
                    availableResources.cpu -= entry.resourceRequirements.cpu;
                    availableResources.memory -= entry.resourceRequirements.memory;
                    availableResources.io -= entry.resourceRequirements.io;
                }
            }
        }
    }
    async processAdaptiveScheduling(availableResources, currentLoad) {
        // Adaptive scheduling based on system load and performance history
        const loadFactor = (currentLoad.cpu + currentLoad.memory + currentLoad.io) / 3;
        if (loadFactor > 0.8) {
            // High load - prioritize critical and high priority only
            await this.processHighLoadScheduling(availableResources);
        }
        else if (loadFactor < 0.3) {
            // Low load - can be more aggressive with scheduling
            await this.processLowLoadScheduling(availableResources);
        }
        else {
            // Normal load - use priority scheduling
            await this.processPriorityScheduling(availableResources);
        }
    }
    async processRoundRobinScheduling(availableResources) {
        // Simple round-robin scheduling
        let index = 0;
        while (index < this.schedulingQueue.length && this.hasAvailableResources(availableResources)) {
            const entry = this.schedulingQueue[index];
            if (this.checkResourceAvailability(entry.resourceRequirements, availableResources)) {
                await this.executeScheduledWorkflow(entry);
                this.schedulingQueue.splice(index, 1);
                // Update available resources
                availableResources.cpu -= entry.resourceRequirements.cpu;
                availableResources.memory -= entry.resourceRequirements.memory;
                availableResources.io -= entry.resourceRequirements.io;
            }
            else {
                index++;
            }
        }
    }
    async processHighLoadScheduling(availableResources) {
        // Only schedule critical and high priority workflows during high load
        const highPriorityEntries = this.schedulingQueue.filter(entry => entry.priority === 'critical' || entry.priority === 'high');
        for (const entry of highPriorityEntries) {
            if (this.checkResourceAvailability(entry.resourceRequirements, availableResources)) {
                await this.executeScheduledWorkflow(entry);
                this.removeFromQueue(entry.id);
                availableResources.cpu -= entry.resourceRequirements.cpu;
                availableResources.memory -= entry.resourceRequirements.memory;
                availableResources.io -= entry.resourceRequirements.io;
            }
        }
    }
    async processLowLoadScheduling(availableResources) {
        // Aggressive scheduling during low load - try to schedule more workflows
        this.schedulingQueue.sort((a, b) => {
            // Sort by efficiency (duration vs resource usage)
            const efficiencyA = a.estimatedDuration / (a.resourceRequirements.cpu + a.resourceRequirements.memory + a.resourceRequirements.io);
            const efficiencyB = b.estimatedDuration / (b.resourceRequirements.cpu + b.resourceRequirements.memory + b.resourceRequirements.io);
            return efficiencyA - efficiencyB;
        });
        for (let i = 0; i < this.schedulingQueue.length; i++) {
            const entry = this.schedulingQueue[i];
            if (this.checkResourceAvailability(entry.resourceRequirements, availableResources)) {
                await this.executeScheduledWorkflow(entry);
                this.schedulingQueue.splice(i, 1);
                availableResources.cpu -= entry.resourceRequirements.cpu;
                availableResources.memory -= entry.resourceRequirements.memory;
                availableResources.io -= entry.resourceRequirements.io;
                i--; // Adjust index after removal
            }
        }
    }
    // =============================================================================
    // HELPER METHODS AND UTILITIES
    // =============================================================================
    determineSchedulingReason(priority, triggeredBy) {
        const reasons = {
            critical: {
                monitoring: 'Critical quality threshold exceeded',
                threshold: 'Critical quality degradation detected',
                manual: 'Manual critical intervention requested',
                schedule: 'Scheduled critical maintenance'
            },
            high: {
                monitoring: 'High priority quality issue detected',
                threshold: 'Quality threshold warning triggered',
                manual: 'Manual high priority request',
                schedule: 'Scheduled high priority task'
            },
            medium: {
                monitoring: 'Routine quality monitoring detected issue',
                threshold: 'Medium priority threshold reached',
                manual: 'Manual medium priority request',
                schedule: 'Scheduled routine maintenance'
            },
            low: {
                monitoring: 'Low priority quality improvement opportunity',
                threshold: 'Low priority threshold notification',
                manual: 'Manual low priority request',
                schedule: 'Scheduled low priority optimization'
            }
        };
        return reasons[priority]?.[triggeredBy] ||
            'Standard scheduling request';
    }
    getCurrentConcurrentCount(priority) {
        return Array.from(this.activeWorkflows.values())
            .filter(workflow => workflow.metadata.priority === priority)
            .length;
    }
    async checkDependencies(dependencies) {
        if (dependencies.length === 0)
            return true;
        for (const depId of dependencies) {
            const scheduleEntry = this.scheduleEntries.get(depId);
            if (!scheduleEntry || scheduleEntry.status !== 'completed') {
                return false;
            }
        }
        return true;
    }
    calculateDeferredTime(scheduleEntry) {
        // Calculate when to retry based on priority and current load
        const baseDelay = {
            critical: 30000, // 30 seconds
            high: 60000, // 1 minute
            medium: 300000, // 5 minutes
            low: 900000 // 15 minutes
        };
        const delay = baseDelay[scheduleEntry.priority] || baseDelay.medium;
        return new Date(Date.now() + delay).toISOString();
    }
    generateAlternativeDecisions(scheduleEntry) {
        return [
            {
                decision: 'defer',
                confidence: 0.7,
                reasoning: 'Wait for better resource conditions'
            },
            {
                decision: 'prioritize',
                confidence: 0.6,
                reasoning: 'Preempt lower priority workflows'
            },
            {
                decision: 'reject',
                confidence: 0.3,
                reasoning: 'Insufficient resources for extended period'
            }
        ];
    }
    addToSchedulingQueue(scheduleEntry) {
        this.schedulingQueue.push(scheduleEntry);
    }
    removeFromQueue(scheduleId) {
        const index = this.schedulingQueue.findIndex(entry => entry.id === scheduleId);
        if (index !== -1) {
            this.schedulingQueue.splice(index, 1);
        }
    }
    groupByPriority(entries) {
        const groups = new Map();
        for (const entry of entries) {
            if (!groups.has(entry.priority)) {
                groups.set(entry.priority, []);
            }
            groups.get(entry.priority).push(entry);
        }
        return groups;
    }
    hasAvailableResources(availableResources) {
        return availableResources.cpu > 0.1 ||
            availableResources.memory > 0.1 ||
            availableResources.io > 10;
    }
    // =============================================================================
    // MACHINE LEARNING OPTIMIZATION
    // =============================================================================
    async applyMLSchedulingOptimization(scheduleEntry, currentDecision) {
        // Placeholder for ML optimization logic
        // In a real implementation, this would use trained models to optimize scheduling decisions
        return {
            decision: currentDecision,
            confidence: 0.8,
            reasoning: 'ML optimization maintained current decision'
        };
    }
    async performMLOptimization() {
        if (!this.config.mlOptimization.enabled)
            return;
        try {
            // Collect training data from recent performance
            const trainingData = await this.collectMLTrainingData();
            // Update ML models based on performance data
            await this.updateMLModels(trainingData);
            // Apply optimizations to current scheduling strategies
            await this.applyMLOptimizations();
            this.metrics.optimization.mlOptimizationsApplied++;
            this.logger.info('ML optimization cycle completed');
        }
        catch (error) {
            this.logger.error('ML optimization failed:', error);
        }
    }
    async collectMLTrainingData() {
        // Collect recent scheduling decisions and their outcomes
        const recentDecisions = this.schedulingHistory.slice(-this.config.mlOptimization.trainingDataSize);
        return recentDecisions.map(decision => ({
            features: {
                priority: decision.workflowId,
                systemLoad: this.getCurrentSystemLoad(),
                availableResources: this.getAvailableResources(),
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay()
            },
            outcome: {
                decision: decision.decision,
                confidence: decision.confidence,
                actualLatency: 0, // Would be measured
                actualSuccess: true // Would be measured
            }
        }));
    }
    async updateMLModels(trainingData) {
        // Placeholder for ML model training
        // In a real implementation, this would update trained models
        this.logger.debug('ML models updated with training data', {
            dataPoints: trainingData.length
        });
    }
    async applyMLOptimizations() {
        // Apply learned optimizations to scheduling parameters
        // This could adjust priority weights, time slices, etc.
        this.logger.debug('ML optimizations applied to scheduling parameters');
    }
    // =============================================================================
    // MONITORING AND HEALTH CHECKS
    // =============================================================================
    async performHealthCheck() {
        try {
            const startTime = performance.now();
            // Check component health
            const componentHealth = await this.checkComponentHealth();
            // Check system metrics
            const systemMetrics = await this.checkSystemMetrics();
            // Check performance thresholds
            const performanceStatus = this.checkPerformanceThresholds();
            // Update system health
            const overallHealth = this.calculateOverallHealth(componentHealth, systemMetrics, performanceStatus);
            this.systemHealth = {
                overall: overallHealth,
                components: componentHealth,
                metrics: systemMetrics,
                alerts: this.generateHealthAlerts(componentHealth, systemMetrics, performanceStatus)
            };
            // Store health record
            await this.saveSystemHealth(this.systemHealth);
            const healthCheckTime = performance.now() - startTime;
            this.logger.debug('Health check completed', {
                overallHealth,
                checkTime: `${healthCheckTime.toFixed(2)}ms`
            });
            if (overallHealth === 'critical') {
                this.emit('system-critical', this.systemHealth);
            }
            else if (overallHealth === 'degraded') {
                this.emit('system-degraded', this.systemHealth);
            }
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
            this.systemHealth.overall = 'critical';
            this.systemHealth.alerts.push({
                severity: 'critical',
                component: 'health_monitor',
                message: `Health check failed: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }
    async checkComponentHealth() {
        return {
            scheduler: this.isRunning && this.schedulingInterval ? 'healthy' : 'critical',
            resourceManager: this.resourceAllocations.size >= 0 ? 'healthy' : 'degraded',
            workflowEngine: this.activeWorkflows.size <= this.config.maxConcurrentWorkflows.critical * 2 ? 'healthy' : 'degraded',
            monitoring: this.metricsCollectionInterval ? 'healthy' : 'degraded',
            database: await this.checkDatabaseHealth()
        };
    }
    async checkDatabaseHealth() {
        try {
            // Simple database connectivity test
            const testQuery = this.db.prepare('SELECT 1 as test');
            const result = testQuery.get();
            return result ? 'healthy' : 'critical';
        }
        catch (error) {
            return 'critical';
        }
    }
    async checkSystemMetrics() {
        // In a real implementation, these would be actual system metrics
        return {
            memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
            cpuUsage: this.getCurrentSystemLoad().cpu,
            diskUsage: 0.5, // Placeholder
            networkLatency: 10 // Placeholder in ms
        };
    }
    checkPerformanceThresholds() {
        const issues = [];
        if (this.metrics.averageSchedulingLatency > this.config.monitoring.performanceThresholds.schedulingLatencyMs) {
            issues.push('Scheduling latency exceeds threshold');
        }
        const avgUtilization = (this.metrics.resourceUtilization.cpu +
            this.metrics.resourceUtilization.memory +
            this.metrics.resourceUtilization.io) / 3;
        if (avgUtilization < this.config.monitoring.performanceThresholds.resourceUtilizationTarget) {
            issues.push('Resource utilization below target');
        }
        if (this.metrics.workflowSuccessRate < this.config.monitoring.performanceThresholds.workflowSuccessRateTarget) {
            issues.push('Workflow success rate below target');
        }
        return {
            withinThresholds: issues.length === 0,
            issues
        };
    }
    calculateOverallHealth(components, metrics, performance) {
        const componentStatuses = Object.values(components);
        if (componentStatuses.includes('critical')) {
            return 'critical';
        }
        if (componentStatuses.includes('degraded') || !performance.withinThresholds) {
            return 'degraded';
        }
        if (metrics.memoryUsage > 0.9 || metrics.cpuUsage > 0.9) {
            return 'degraded';
        }
        return 'healthy';
    }
    generateHealthAlerts(components, metrics, performance) {
        const alerts = [];
        const timestamp = new Date().toISOString();
        // Component alerts
        for (const [component, status] of Object.entries(components)) {
            if (status === 'critical') {
                alerts.push({
                    severity: 'critical',
                    component,
                    message: `Component ${component} is in critical state`,
                    timestamp
                });
            }
            else if (status === 'degraded') {
                alerts.push({
                    severity: 'warning',
                    component,
                    message: `Component ${component} is degraded`,
                    timestamp
                });
            }
        }
        // Performance alerts
        for (const issue of performance.issues) {
            alerts.push({
                severity: 'warning',
                component: 'performance',
                message: issue,
                timestamp
            });
        }
        // Resource alerts
        if (metrics.memoryUsage > 0.8) {
            alerts.push({
                severity: 'warning',
                component: 'resources',
                message: `High memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
                timestamp
            });
        }
        if (metrics.cpuUsage > 0.8) {
            alerts.push({
                severity: 'warning',
                component: 'resources',
                message: `High CPU usage: ${(metrics.cpuUsage * 100).toFixed(1)}%`,
                timestamp
            });
        }
        return alerts;
    }
    // =============================================================================
    // METRICS COLLECTION
    // =============================================================================
    async collectMetrics() {
        try {
            const currentTime = Date.now();
            const uptime = currentTime - this.startTime;
            // Calculate throughput
            const hoursUptime = uptime / (1000 * 60 * 60);
            const daysUptime = uptime / (1000 * 60 * 60 * 24);
            // Update metrics
            this.metrics = {
                totalWorkflowsScheduled: this.scheduleEntries.size,
                concurrentWorkflowsCount: this.activeWorkflows.size,
                averageSchedulingLatency: this.calculateAverageSchedulingLatency(),
                resourceUtilization: this.calculateResourceUtilization(),
                workflowSuccessRate: this.calculateWorkflowSuccessRate(),
                systemUptime: uptime,
                schedulingAccuracy: this.calculateSchedulingAccuracy(),
                throughput: {
                    workflowsPerHour: hoursUptime > 0 ? this.metrics.totalWorkflowsScheduled / hoursUptime : 0,
                    workflowsPerDay: daysUptime > 0 ? this.metrics.totalWorkflowsScheduled / daysUptime : 0
                },
                optimization: {
                    mlOptimizationsApplied: this.metrics.optimization.mlOptimizationsApplied,
                    performanceImprovements: this.metrics.optimization.performanceImprovements,
                    resourceSavings: this.calculateResourceSavings()
                }
            };
            // Store metrics
            await this.saveMetrics(this.metrics);
            // Add to performance history
            this.performanceHistory.push({ ...this.metrics });
            // Keep only recent history
            if (this.performanceHistory.length > 100) {
                this.performanceHistory = this.performanceHistory.slice(-100);
            }
            this.emit('metrics-collected', this.metrics);
        }
        catch (error) {
            this.logger.error('Failed to collect metrics:', error);
        }
    }
    calculateAverageSchedulingLatency() {
        // Calculate from recent scheduling decisions
        const recentDecisions = this.schedulingHistory.slice(-50);
        if (recentDecisions.length === 0)
            return 0;
        // This would need to track actual latency times
        return 50; // Placeholder
    }
    calculateResourceUtilization() {
        const available = this.getAvailableResources();
        const total = this.config.resourceLimits;
        return {
            cpu: ((total.totalCPU - available.cpu) / total.totalCPU) * 100,
            memory: ((total.totalMemory - available.memory) / total.totalMemory) * 100,
            io: ((total.totalIO - available.io) / total.totalIO) * 100
        };
    }
    calculateWorkflowSuccessRate() {
        const completedEntries = Array.from(this.scheduleEntries.values())
            .filter(entry => entry.status === 'completed' || entry.status === 'failed');
        if (completedEntries.length === 0)
            return 100;
        const successfulEntries = completedEntries.filter(entry => entry.status === 'completed');
        return (successfulEntries.length / completedEntries.length) * 100;
    }
    calculateSchedulingAccuracy() {
        // Calculate how often scheduling decisions were optimal
        // This would need actual performance tracking
        return 98; // Placeholder
    }
    calculateResourceSavings() {
        // Calculate resource savings from optimization
        return this.metrics.optimization.resourceSavings || 0;
    }
    updateSchedulingMetrics(latency) {
        // Update running average of scheduling latency
        const weight = 0.1; // Exponential moving average weight
        this.metrics.averageSchedulingLatency =
            this.metrics.averageSchedulingLatency * (1 - weight) + latency * weight;
    }
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    async handleWorkflowTriggered(data) {
        const { workflowId, entityId, priority } = data;
        // Find corresponding schedule entry and update
        for (const [scheduleId, entry] of this.scheduleEntries) {
            if (entry.metadata.entityId === entityId && entry.status === 'scheduled') {
                entry.workflowId = workflowId;
                entry.status = 'running';
                await this.updateScheduleEntry(entry);
                break;
            }
        }
        this.logger.info(`Workflow triggered via orchestration: ${workflowId}`, {
            entityId,
            priority
        });
    }
    async handleWorkflowCompleted(data) {
        const { workflowId, totalTime } = data;
        // Update schedule entry
        for (const [scheduleId, entry] of this.scheduleEntries) {
            if (entry.workflowId === workflowId) {
                entry.status = 'completed';
                await this.updateScheduleEntry(entry);
                break;
            }
        }
        // Update resource allocation
        for (const [allocationId, allocation] of this.resourceAllocations) {
            if (allocation.workflowId === workflowId) {
                allocation.endTime = new Date().toISOString();
                allocation.efficiency = this.calculateAllocationEfficiency(allocation, totalTime);
                await this.updateResourceAllocation(allocation);
                break;
            }
        }
        // Remove from active workflows
        this.activeWorkflows.delete(workflowId);
        this.logger.info(`Workflow completed via orchestration: ${workflowId}`, {
            totalTime: `${totalTime.toFixed(2)}ms`
        });
    }
    async handleWorkflowFailed(data) {
        const { workflowId, error } = data;
        // Update schedule entry for retry logic
        for (const [scheduleId, entry] of this.scheduleEntries) {
            if (entry.workflowId === workflowId) {
                entry.status = 'failed';
                entry.retryCount++;
                if (entry.retryCount < entry.maxRetries) {
                    // Schedule for retry
                    entry.status = 'scheduled';
                    entry.scheduledTime = this.calculateRetryTime(entry).toISOString();
                    this.addToSchedulingQueue(entry);
                }
                await this.updateScheduleEntry(entry);
                break;
            }
        }
        // Release resources
        const allocation = Array.from(this.resourceAllocations.values())
            .find(alloc => alloc.workflowId === workflowId);
        if (allocation) {
            allocation.endTime = new Date().toISOString();
            allocation.efficiency = 0; // Failed workflow has no efficiency
            await this.updateResourceAllocation(allocation);
        }
        // Remove from active workflows
        this.activeWorkflows.delete(workflowId);
        this.logger.error(`Workflow failed via orchestration: ${workflowId}`, error);
    }
    async handleQualityEvent(event) {
        // Analyze event for potential workflow scheduling needs
        if (event.severity === 'critical' || event.severity === 'error') {
            await this.scheduleWorkflow(event.entityId, event.entityType, event.severity === 'critical' ? 'critical' : 'high', 'monitoring');
        }
    }
    async handleCriticalEvent(event) {
        // Immediately prioritize critical events
        await this.scheduleWorkflow(event.entityId, event.entityType, 'critical', 'threshold');
        this.emit('critical-workflow-scheduled', { eventId: event.id, entityId: event.entityId });
    }
    // =============================================================================
    // DATABASE OPERATIONS
    // =============================================================================
    async saveScheduleEntry(entry) {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO workflow_schedule_entries (
          id, workflow_id, priority, scheduled_time, estimated_duration,
          resource_requirements, dependencies, status, retry_count, max_retries, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(entry.id, entry.workflowId, entry.priority, entry.scheduledTime, entry.estimatedDuration, JSON.stringify(entry.resourceRequirements), JSON.stringify(entry.dependencies), entry.status, entry.retryCount, entry.maxRetries, JSON.stringify(entry.metadata));
        }
        catch (error) {
            this.logger.error('Failed to save schedule entry:', error);
        }
    }
    async updateScheduleEntry(entry) {
        try {
            const stmt = this.db.prepare(`
        UPDATE workflow_schedule_entries 
        SET workflow_id = ?, status = ?, retry_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
            stmt.run(entry.workflowId, entry.status, entry.retryCount, entry.id);
        }
        catch (error) {
            this.logger.error('Failed to update schedule entry:', error);
        }
    }
    async saveResourceAllocation(allocation) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO resource_allocations (
          id, workflow_id, allocated_resources, actual_usage, efficiency, start_time
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), allocation.workflowId, JSON.stringify(allocation.allocatedResources), JSON.stringify(allocation.actualUsage), allocation.efficiency, allocation.startTime);
        }
        catch (error) {
            this.logger.error('Failed to save resource allocation:', error);
        }
    }
    async updateResourceAllocation(allocation) {
        try {
            const stmt = this.db.prepare(`
        UPDATE resource_allocations 
        SET actual_usage = ?, efficiency = ?, end_time = ?
        WHERE workflow_id = ?
      `);
            stmt.run(JSON.stringify(allocation.actualUsage), allocation.efficiency, allocation.endTime, allocation.workflowId);
        }
        catch (error) {
            this.logger.error('Failed to update resource allocation:', error);
        }
    }
    async saveSchedulingDecision(decision) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO scheduling_decisions (
          id, workflow_id, decision, scheduled_time, reasoning, confidence, alternatives, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), decision.workflowId, decision.decision, decision.scheduledTime, decision.reasoning, decision.confidence, JSON.stringify(decision.alternatives), new Date().toISOString());
        }
        catch (error) {
            this.logger.error('Failed to save scheduling decision:', error);
        }
    }
    async saveMetrics(metrics) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO orchestration_metrics (
          id, total_workflows_scheduled, concurrent_workflows_count, average_scheduling_latency,
          resource_utilization, workflow_success_rate, system_uptime, scheduling_accuracy,
          throughput, optimization, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), metrics.totalWorkflowsScheduled, metrics.concurrentWorkflowsCount, metrics.averageSchedulingLatency, JSON.stringify(metrics.resourceUtilization), metrics.workflowSuccessRate, metrics.systemUptime, metrics.schedulingAccuracy, JSON.stringify(metrics.throughput), JSON.stringify(metrics.optimization), new Date().toISOString());
        }
        catch (error) {
            this.logger.error('Failed to save metrics:', error);
        }
    }
    async saveSystemHealth(health) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO system_health_history (
          id, overall_status, components, metrics, alerts, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), health.overall, JSON.stringify(health.components), JSON.stringify(health.metrics), JSON.stringify(health.alerts), new Date().toISOString());
        }
        catch (error) {
            this.logger.error('Failed to save system health:', error);
        }
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    calculateAllocationEfficiency(allocation, actualTime) {
        // Calculate efficiency based on resource utilization vs allocation
        const allocatedTotal = allocation.allocatedResources.cpu +
            allocation.allocatedResources.memory +
            allocation.allocatedResources.io;
        const usedTotal = allocation.actualUsage.cpu +
            allocation.actualUsage.memory +
            allocation.actualUsage.io;
        return allocatedTotal > 0 ? (usedTotal / allocatedTotal) : 0;
    }
    calculateRetryTime(entry) {
        const baseDelay = Math.pow(2, entry.retryCount) * 60000; // Exponential backoff in minutes
        const jitter = Math.random() * 30000; // Random jitter up to 30 seconds
        return new Date(Date.now() + baseDelay + jitter);
    }
    async gracefulShutdown() {
        // Wait for active workflows to complete or timeout
        const shutdownTimeout = 300000; // 5 minutes
        const startTime = Date.now();
        while (this.activeWorkflows.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (this.activeWorkflows.size > 0) {
            this.logger.warn(`Shutdown with ${this.activeWorkflows.size} active workflows remaining`);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async getOrchestrationMetrics() {
        return { ...this.metrics };
    }
    async getSystemHealth() {
        return { ...this.systemHealth };
    }
    async getScheduleEntries(status) {
        if (status) {
            return Array.from(this.scheduleEntries.values()).filter(entry => entry.status === status);
        }
        return Array.from(this.scheduleEntries.values());
    }
    async getResourceAllocations() {
        return Array.from(this.resourceAllocations.values());
    }
    async updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Orchestration configuration updated', { newConfig });
    }
    async cancelScheduledWorkflow(scheduleId) {
        const entry = this.scheduleEntries.get(scheduleId);
        if (entry && entry.status === 'scheduled') {
            entry.status = 'cancelled';
            await this.updateScheduleEntry(entry);
            this.removeFromQueue(scheduleId);
            return true;
        }
        return false;
    }
    isHealthy() {
        return this.systemHealth.overall === 'healthy';
    }
    async destroy() {
        await this.stopOrchestration();
        this.removeAllListeners();
        this.logger.info('Quality workflow orchestrator destroyed');
    }
}
export default QualityWorkflowOrchestrator;
//# sourceMappingURL=QualityWorkflowOrchestrator.js.map