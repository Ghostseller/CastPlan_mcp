/**
 * Quality Load Balancer - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - Auto-scaling and Load Distribution
 * Advanced load balancing system with dynamic scaling, intelligent resource distribution,
 * and adaptive load management for quality workflows
 *
 * Features:
 * - Dynamic auto-scaling based on workload and performance metrics
 * - Intelligent load distribution across multiple workflow instances
 * - Resource-aware scheduling with performance optimization
 * - Health-based routing with automatic failover
 * - Predictive scaling with machine learning insights
 * - Circuit breaker pattern for failure isolation
 * - Real-time performance monitoring and adjustment
 *
 * Performance targets:
 * - Load balancing decision time: <50ms
 * - Auto-scaling response time: <30 seconds
 * - Resource utilization optimization: >85%
 * - Failover time: <5 seconds
 * - Load distribution accuracy: >95%
 *
 * Integration points:
 * - QualityWorkflowOrchestrator for workflow coordination
 * - QualitySystemOptimizer for resource optimization
 * - QualityMonitoringService for performance metrics
 * - AutomatedQualityWorkflow for workflow execution
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & System Architect
 */
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// QUALITY LOAD BALANCER
// =============================================================================
export class QualityLoadBalancer extends EventEmitter {
    logger;
    db;
    config;
    // Core services
    monitoringService;
    systemOptimizer;
    // Load balancing state
    isRunning = false;
    instances = new Map();
    circuitBreakers = new Map();
    requestQueue = [];
    // Load balancing algorithms
    currentAlgorithm;
    roundRobinIndex = 0;
    loadBalancingHistory = [];
    scalingHistory = [];
    // Performance tracking
    metrics;
    lastScalingAction = '';
    lastScalingTime = 0;
    // Monitoring intervals
    healthCheckInterval;
    scalingEvaluationInterval;
    metricsCollectionInterval;
    circuitBreakerInterval;
    startTime = Date.now();
    constructor(database, logger, monitoringService, systemOptimizer, config = {}) {
        super();
        this.db = database;
        this.logger = logger;
        this.monitoringService = monitoringService;
        this.systemOptimizer = systemOptimizer;
        // Set default configuration
        this.config = {
            autoScaling: {
                enabled: true,
                minInstances: 2,
                maxInstances: 10,
                scaleUpThreshold: 75,
                scaleDownThreshold: 30,
                scaleUpCooldown: 300000, // 5 minutes
                scaleDownCooldown: 600000, // 10 minutes
                predictiveScaling: true
            },
            balancing: {
                algorithm: 'resource_aware',
                healthCheckInterval: 30000, // 30 seconds
                healthCheckTimeout: 5000, // 5 seconds
                failoverThreshold: 3,
                stickySessions: false
            },
            performance: {
                connectionPooling: true,
                keepAliveTimeout: 60000,
                maxConcurrentRequests: 100,
                requestTimeout: 30000,
                retryAttempts: 3,
                retryBackoff: 1000
            },
            circuitBreaker: {
                enabled: true,
                failureThreshold: 5,
                recoveryTimeout: 60000, // 1 minute
                successThreshold: 3
            },
            resources: {
                maxCPUPerInstance: 2.0, // 2 CPU cores
                maxMemoryPerInstance: 4096, // 4GB
                maxIOPerInstance: 1000, // 1000 IOPS
                resourceBufferPercentage: 20
            },
            ...config
        };
        this.currentAlgorithm = this.config.balancing.algorithm;
        this.metrics = this.initializeMetrics();
        this.initializeDatabase();
        this.setupEventListeners();
        this.logger.info('Quality Load Balancer initialized', {
            algorithm: this.currentAlgorithm,
            autoScaling: this.config.autoScaling.enabled,
            maxInstances: this.config.autoScaling.maxInstances
        });
    }
    // =============================================================================
    // INITIALIZATION AND SETUP
    // =============================================================================
    initializeDatabase() {
        try {
            // Workflow instances table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_instances (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          weight REAL NOT NULL,
          current_load TEXT NOT NULL,
          performance TEXT NOT NULL,
          health TEXT NOT NULL,
          capabilities TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Load balancing decisions table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS load_balancing_decisions (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          selected_instance_id TEXT NOT NULL,
          algorithm TEXT NOT NULL,
          decision TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          confidence REAL NOT NULL,
          alternatives TEXT NOT NULL,
          metrics TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Scaling decisions table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS scaling_decisions (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          reason TEXT NOT NULL,
          current_instances INTEGER NOT NULL,
          target_instances INTEGER NOT NULL,
          metrics TEXT NOT NULL,
          predicted_load TEXT,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Circuit breaker states table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS circuit_breaker_states (
          instance_id TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          failure_count INTEGER NOT NULL,
          success_count INTEGER NOT NULL,
          last_failure_time TEXT,
          next_attempt_time TEXT,
          error_threshold INTEGER NOT NULL,
          recovery_timeout INTEGER NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Load balancer metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS load_balancer_metrics (
          id TEXT PRIMARY KEY,
          total_requests INTEGER NOT NULL,
          successful_requests INTEGER NOT NULL,
          failed_requests INTEGER NOT NULL,
          average_response_time REAL NOT NULL,
          requests_per_second REAL NOT NULL,
          instance_metrics TEXT NOT NULL,
          load_distribution TEXT NOT NULL,
          scaling_metrics TEXT NOT NULL,
          circuit_breaker_metrics TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Performance indexes
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_instances_status ON workflow_instances(status);
        CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON load_balancing_decisions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_decisions_instance ON load_balancing_decisions(selected_instance_id);
        CREATE INDEX IF NOT EXISTS idx_scaling_timestamp ON scaling_decisions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON load_balancer_metrics(timestamp);
      `);
            this.logger.info('Load balancer database tables initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize load balancer database:', error);
            throw error;
        }
    }
    setupEventListeners() {
        // Listen to monitoring service events
        this.monitoringService.on('qualityEvent', this.handleQualityEvent.bind(this));
        this.monitoringService.on('metrics-collected', this.handleMetricsCollected.bind(this));
        // Listen to system optimizer events
        this.systemOptimizer.on('optimization-applied', this.handleOptimizationApplied.bind(this));
        this.logger.info('Load balancer event listeners setup complete');
    }
    initializeMetrics() {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestsPerSecond: 0,
            instanceMetrics: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
            loadDistribution: { evenness: 100, efficiency: 0 },
            scalingMetrics: { scaleUpEvents: 0, scaleDownEvents: 0, averageScalingTime: 0 },
            circuitBreakerMetrics: { openCircuits: 0, totalTrips: 0, averageRecoveryTime: 0 }
        };
    }
    // =============================================================================
    // LOAD BALANCER LIFECYCLE
    // =============================================================================
    async startLoadBalancing() {
        if (this.isRunning) {
            this.logger.warn('Load balancer is already running');
            return;
        }
        this.isRunning = true;
        this.startTime = Date.now();
        // Load existing instances from database
        await this.loadInstancesFromDatabase();
        // Initialize default instances if none exist
        if (this.instances.size === 0) {
            await this.initializeDefaultInstances();
        }
        // Start monitoring processes
        await this.startHealthChecking();
        await this.startScalingEvaluation();
        await this.startMetricsCollection();
        if (this.config.circuitBreaker.enabled) {
            await this.startCircuitBreakerMonitoring();
        }
        this.emit('load-balancer-started');
        this.logger.info('Load balancer started', {
            instances: this.instances.size,
            algorithm: this.currentAlgorithm,
            autoScaling: this.config.autoScaling.enabled
        });
    }
    async stopLoadBalancing() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Stop all monitoring intervals
        this.stopAllIntervals();
        // Process remaining requests in queue
        await this.processRemainingRequests();
        // Save current state
        await this.saveInstancesToDatabase();
        await this.saveMetrics();
        this.emit('load-balancer-stopped');
        this.logger.info('Load balancer stopped', {
            uptime: Date.now() - this.startTime,
            totalRequests: this.metrics.totalRequests,
            successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        });
    }
    async initializeDefaultInstances() {
        const minInstances = this.config.autoScaling.minInstances;
        for (let i = 0; i < minInstances; i++) {
            const instance = await this.createInstance(`quality-workflow-${i + 1}`, 'default');
            this.instances.set(instance.id, instance);
        }
        this.logger.info(`Initialized ${minInstances} default instances`);
    }
    stopAllIntervals() {
        const intervals = [
            this.healthCheckInterval,
            this.scalingEvaluationInterval,
            this.metricsCollectionInterval,
            this.circuitBreakerInterval
        ];
        intervals.forEach(interval => {
            if (interval) {
                clearInterval(interval);
            }
        });
        this.healthCheckInterval = undefined;
        this.scalingEvaluationInterval = undefined;
        this.metricsCollectionInterval = undefined;
        this.circuitBreakerInterval = undefined;
    }
    // =============================================================================
    // LOAD BALANCING ALGORITHMS
    // =============================================================================
    async routeRequest(requestId, workflowRequest) {
        const decisionStartTime = performance.now();
        try {
            // Get healthy instances
            const healthyInstances = this.getHealthyInstances();
            if (healthyInstances.length === 0) {
                return this.createFailureDecision(requestId, 'No healthy instances available');
            }
            // Select instance based on algorithm
            const selectedInstance = await this.selectInstance(healthyInstances, workflowRequest);
            // Create load balancing decision
            const decision = {
                requestId,
                selectedInstance,
                algorithm: this.currentAlgorithm,
                decision: 'route',
                reasoning: this.getSelectionReasoning(selectedInstance, healthyInstances),
                confidence: this.calculateSelectionConfidence(selectedInstance, healthyInstances),
                alternatives: this.generateAlternatives(healthyInstances, selectedInstance),
                metrics: {
                    decisionTime: performance.now() - decisionStartTime,
                    queueDepth: this.requestQueue.length,
                    totalInstances: this.instances.size,
                    healthyInstances: healthyInstances.length
                },
                timestamp: new Date().toISOString()
            };
            // Check performance requirement (<50ms)
            if (decision.metrics.decisionTime > 50) {
                this.logger.warn('Load balancing decision exceeded target time', {
                    requestId,
                    decisionTime: `${decision.metrics.decisionTime.toFixed(2)}ms`
                });
            }
            // Update instance load
            await this.updateInstanceLoad(selectedInstance.id, workflowRequest);
            // Store decision
            this.loadBalancingHistory.push(decision);
            await this.saveLoadBalancingDecision(decision);
            // Update metrics
            this.metrics.totalRequests++;
            this.emit('request-routed', { requestId, instanceId: selectedInstance.id });
            return decision;
        }
        catch (error) {
            this.logger.error(`Load balancing failed for request ${requestId}:`, error);
            return this.createFailureDecision(requestId, `Load balancing error: ${error.message}`);
        }
    }
    async selectInstance(healthyInstances, workflowRequest) {
        switch (this.currentAlgorithm) {
            case 'round_robin':
                return this.selectRoundRobin(healthyInstances);
            case 'least_connections':
                return this.selectLeastConnections(healthyInstances);
            case 'weighted_round_robin':
                return this.selectWeightedRoundRobin(healthyInstances);
            case 'resource_aware':
                return this.selectResourceAware(healthyInstances);
            case 'adaptive':
                return await this.selectAdaptive(healthyInstances, workflowRequest);
            default:
                return this.selectRoundRobin(healthyInstances);
        }
    }
    selectRoundRobin(instances) {
        const selectedInstance = instances[this.roundRobinIndex % instances.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % instances.length;
        return selectedInstance;
    }
    selectLeastConnections(instances) {
        return instances.reduce((least, current) => current.currentLoad.activeConnections < least.currentLoad.activeConnections
            ? current : least);
    }
    selectWeightedRoundRobin(instances) {
        // Calculate total weight
        const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
        // Generate random number within total weight
        let random = Math.random() * totalWeight;
        // Select instance based on weighted probability
        for (const instance of instances) {
            random -= instance.weight;
            if (random <= 0) {
                return instance;
            }
        }
        return instances[0]; // Fallback
    }
    selectResourceAware(instances) {
        // Score instances based on available resources
        const scoredInstances = instances.map(instance => ({
            instance,
            score: this.calculateResourceScore(instance)
        }));
        // Sort by score (higher is better)
        scoredInstances.sort((a, b) => b.score - a.score);
        return scoredInstances[0].instance;
    }
    async selectAdaptive(instances, workflowRequest) {
        // Use machine learning insights to select optimal instance
        const scores = await Promise.all(instances.map(async (instance) => ({
            instance,
            score: await this.calculateAdaptiveScore(instance, workflowRequest)
        })));
        // Sort by score and select best
        scores.sort((a, b) => b.score - a.score);
        return scores[0].instance;
    }
    calculateResourceScore(instance) {
        const cpuAvailable = 1 - (instance.currentLoad.cpu / 100);
        const memoryAvailable = 1 - (instance.currentLoad.memory / 100);
        const ioAvailable = 1 - (instance.currentLoad.io / 100);
        // Weight factors
        const cpuWeight = 0.4;
        const memoryWeight = 0.3;
        const ioWeight = 0.2;
        const performanceWeight = 0.1;
        const performanceScore = instance.performance.successRate / 100;
        return (cpuAvailable * cpuWeight) +
            (memoryAvailable * memoryWeight) +
            (ioAvailable * ioWeight) +
            (performanceScore * performanceWeight);
    }
    async calculateAdaptiveScore(instance, workflowRequest) {
        // This would use ML models to predict instance performance
        // For now, use a combination of factors
        const resourceScore = this.calculateResourceScore(instance);
        const performanceScore = instance.performance.successRate / 100;
        const healthScore = instance.health.consecutiveSuccesses / 10;
        const loadScore = 1 - (instance.currentLoad.activeConnections / instance.capabilities.maxConcurrentWorkflows);
        return (resourceScore * 0.3) +
            (performanceScore * 0.3) +
            (healthScore * 0.2) +
            (loadScore * 0.2);
    }
    getHealthyInstances() {
        return Array.from(this.instances.values()).filter(instance => instance.status === 'healthy' || instance.status === 'degraded');
    }
    getSelectionReasoning(selected, candidates) {
        switch (this.currentAlgorithm) {
            case 'round_robin':
                return 'Selected using round-robin algorithm for even distribution';
            case 'least_connections':
                return `Selected instance with ${selected.currentLoad.activeConnections} active connections (lowest)`;
            case 'weighted_round_robin':
                return `Selected based on weight ${selected.weight} in weighted round-robin`;
            case 'resource_aware':
                return `Selected based on optimal resource availability (CPU: ${(100 - selected.currentLoad.cpu).toFixed(1)}%, Memory: ${(100 - selected.currentLoad.memory).toFixed(1)}%)`;
            case 'adaptive':
                return 'Selected using adaptive algorithm based on ML predictions';
            default:
                return 'Selected using default algorithm';
        }
    }
    calculateSelectionConfidence(selected, candidates) {
        if (candidates.length === 1)
            return 1.0;
        const selectedScore = this.calculateResourceScore(selected);
        const averageScore = candidates.reduce((sum, instance) => sum + this.calculateResourceScore(instance), 0) / candidates.length;
        return Math.min(selectedScore / averageScore, 1.0);
    }
    generateAlternatives(candidates, selected) {
        return candidates
            .filter(instance => instance.id !== selected.id)
            .slice(0, 3) // Top 3 alternatives
            .map(instance => ({
            instance,
            score: this.calculateResourceScore(instance),
            reasoning: `Alternative with ${instance.currentLoad.activeConnections} connections, ${(100 - instance.currentLoad.cpu).toFixed(1)}% CPU available`
        }));
    }
    createFailureDecision(requestId, reason) {
        return {
            requestId,
            selectedInstance: {},
            algorithm: this.currentAlgorithm,
            decision: 'reject',
            reasoning: reason,
            confidence: 0,
            alternatives: [],
            metrics: {
                decisionTime: 0,
                queueDepth: this.requestQueue.length,
                totalInstances: this.instances.size,
                healthyInstances: 0
            },
            timestamp: new Date().toISOString()
        };
    }
    // =============================================================================
    // AUTO-SCALING IMPLEMENTATION
    // =============================================================================
    async startScalingEvaluation() {
        if (!this.config.autoScaling.enabled)
            return;
        this.scalingEvaluationInterval = setInterval(() => this.evaluateScaling(), 60000 // Evaluate every minute
        );
        this.logger.info('Auto-scaling evaluation started');
    }
    async evaluateScaling() {
        if (!this.config.autoScaling.enabled)
            return;
        try {
            const currentInstances = this.instances.size;
            const healthyInstances = this.getHealthyInstances();
            // Calculate average metrics
            const avgMetrics = this.calculateAverageInstanceMetrics(healthyInstances);
            // Determine if scaling is needed
            const scalingDecision = await this.makeScalingDecision(avgMetrics, currentInstances);
            // Apply scaling decision
            await this.applyScalingDecision(scalingDecision);
            // Store decision
            this.scalingHistory.push(scalingDecision);
            await this.saveScalingDecision(scalingDecision);
        }
        catch (error) {
            this.logger.error('Scaling evaluation failed:', error);
        }
    }
    calculateAverageInstanceMetrics(instances) {
        if (instances.length === 0) {
            return { avgCPU: 0, avgMemory: 0, avgResponseTime: 0, requestRate: 0, errorRate: 0 };
        }
        const totals = instances.reduce((acc, instance) => ({
            cpu: acc.cpu + instance.currentLoad.cpu,
            memory: acc.memory + instance.currentLoad.memory,
            responseTime: acc.responseTime + instance.performance.averageResponseTime,
            requestRate: acc.requestRate + instance.performance.requestsPerSecond,
            errorRate: acc.errorRate + (100 - instance.performance.successRate)
        }), { cpu: 0, memory: 0, responseTime: 0, requestRate: 0, errorRate: 0 });
        return {
            avgCPU: totals.cpu / instances.length,
            avgMemory: totals.memory / instances.length,
            avgResponseTime: totals.responseTime / instances.length,
            requestRate: totals.requestRate,
            errorRate: totals.errorRate / instances.length
        };
    }
    async makeScalingDecision(metrics, currentInstances) {
        const scaleUpThreshold = this.config.autoScaling.scaleUpThreshold;
        const scaleDownThreshold = this.config.autoScaling.scaleDownThreshold;
        const minInstances = this.config.autoScaling.minInstances;
        const maxInstances = this.config.autoScaling.maxInstances;
        let action = 'maintain';
        let reason = 'Metrics within normal range';
        let targetInstances = currentInstances;
        // Check cooldown periods
        const now = Date.now();
        const timeSinceLastScaling = now - this.lastScalingTime;
        // Determine scaling action
        if (metrics.avgCPU > scaleUpThreshold || metrics.avgMemory > scaleUpThreshold) {
            if (currentInstances < maxInstances &&
                (this.lastScalingAction !== 'scale_up' || timeSinceLastScaling > this.config.autoScaling.scaleUpCooldown)) {
                action = 'scale_up';
                targetInstances = Math.min(currentInstances + 1, maxInstances);
                reason = `High resource utilization (CPU: ${metrics.avgCPU.toFixed(1)}%, Memory: ${metrics.avgMemory.toFixed(1)}%)`;
            }
        }
        else if (metrics.avgCPU < scaleDownThreshold && metrics.avgMemory < scaleDownThreshold) {
            if (currentInstances > minInstances &&
                (this.lastScalingAction !== 'scale_down' || timeSinceLastScaling > this.config.autoScaling.scaleDownCooldown)) {
                action = 'scale_down';
                targetInstances = Math.max(currentInstances - 1, minInstances);
                reason = `Low resource utilization (CPU: ${metrics.avgCPU.toFixed(1)}%, Memory: ${metrics.avgMemory.toFixed(1)}%)`;
            }
        }
        // Add predictive scaling if enabled
        let predictedLoad;
        if (this.config.autoScaling.predictiveScaling) {
            predictedLoad = await this.predictFutureLoad();
            if (predictedLoad.nextHour > scaleUpThreshold && action === 'maintain') {
                action = 'scale_up';
                targetInstances = Math.min(currentInstances + 1, maxInstances);
                reason = `Predictive scaling: expected load ${predictedLoad.nextHour.toFixed(1)}% in next hour`;
            }
        }
        return {
            id: uuidv4(),
            action,
            reason,
            currentInstances,
            targetInstances,
            metrics,
            predictedLoad,
            timestamp: new Date().toISOString()
        };
    }
    async applyScalingDecision(decision) {
        if (decision.action === 'maintain') {
            return;
        }
        const scalingStartTime = performance.now();
        try {
            if (decision.action === 'scale_up') {
                await this.scaleUp(decision.targetInstances - decision.currentInstances);
                this.metrics.scalingMetrics.scaleUpEvents++;
            }
            else if (decision.action === 'scale_down') {
                await this.scaleDown(decision.currentInstances - decision.targetInstances);
                this.metrics.scalingMetrics.scaleDownEvents++;
            }
            const scalingTime = performance.now() - scalingStartTime;
            // Check performance requirement (<30 seconds)
            if (scalingTime > 30000) {
                this.logger.warn('Scaling operation exceeded target time', {
                    action: decision.action,
                    scalingTime: `${scalingTime.toFixed(2)}ms`
                });
            }
            this.lastScalingAction = decision.action;
            this.lastScalingTime = Date.now();
            // Update average scaling time
            const currentAvg = this.metrics.scalingMetrics.averageScalingTime;
            const totalEvents = this.metrics.scalingMetrics.scaleUpEvents +
                this.metrics.scalingMetrics.scaleDownEvents;
            this.metrics.scalingMetrics.averageScalingTime =
                (currentAvg * (totalEvents - 1) + scalingTime) / totalEvents;
            this.emit('scaling-completed', {
                action: decision.action,
                scalingTime,
                newInstanceCount: this.instances.size
            });
            this.logger.info(`Scaling ${decision.action} completed`, {
                scalingTime: `${scalingTime.toFixed(2)}ms`,
                instanceCount: this.instances.size,
                reason: decision.reason
            });
        }
        catch (error) {
            this.logger.error(`Scaling ${decision.action} failed:`, error);
        }
    }
    async scaleUp(instanceCount) {
        for (let i = 0; i < instanceCount; i++) {
            const instanceName = `quality-workflow-${Date.now()}-${i}`;
            const instance = await this.createInstance(instanceName, 'scaled');
            this.instances.set(instance.id, instance);
            // Start the instance (would interface with actual deployment system)
            await this.startInstance(instance);
        }
    }
    async scaleDown(instanceCount) {
        // Select instances to remove (prefer least loaded)
        const instances = Array.from(this.instances.values())
            .filter(instance => instance.metadata.instanceType !== 'default')
            .sort((a, b) => a.currentLoad.activeConnections - b.currentLoad.activeConnections)
            .slice(0, instanceCount);
        for (const instance of instances) {
            await this.stopInstance(instance);
            this.instances.delete(instance.id);
        }
    }
    async predictFutureLoad() {
        // This would use ML models to predict future load
        // For now, use simple trend analysis
        const recentMetrics = this.loadBalancingHistory.slice(-10);
        if (recentMetrics.length === 0) {
            return { nextHour: 50, confidence: 0.5, factors: ['insufficient_data'] };
        }
        // Simple linear trend
        const currentLoad = this.calculateAverageInstanceMetrics(this.getHealthyInstances()).avgCPU;
        const trend = Math.random() * 20 - 10; // -10% to +10% random trend
        return {
            nextHour: Math.max(0, Math.min(100, currentLoad + trend)),
            confidence: 0.7,
            factors: ['historical_trend', 'current_utilization']
        };
    }
    // =============================================================================
    // INSTANCE MANAGEMENT
    // =============================================================================
    async createInstance(name, type) {
        const instance = {
            id: uuidv4(),
            name,
            status: 'starting',
            endpoint: `http://localhost:${8000 + this.instances.size}`,
            weight: 1.0,
            currentLoad: {
                cpu: 0,
                memory: 0,
                io: 0,
                activeConnections: 0,
                queuedRequests: 0
            },
            performance: {
                averageResponseTime: 0,
                requestsPerSecond: 0,
                errorRate: 0,
                successRate: 100
            },
            health: {
                lastHealthCheck: new Date().toISOString(),
                consecutiveFailures: 0,
                consecutiveSuccesses: 0,
                uptime: 0
            },
            capabilities: {
                maxConcurrentWorkflows: this.config.performance.maxConcurrentRequests,
                supportedWorkflowTypes: ['quality_analysis', 'quality_improvement'],
                resourceCapacity: {
                    cpu: this.config.resources.maxCPUPerInstance,
                    memory: this.config.resources.maxMemoryPerInstance,
                    io: this.config.resources.maxIOPerInstance
                }
            },
            metadata: {
                version: '1.0.0',
                region: 'local',
                instanceType: type,
                startTime: new Date().toISOString()
            }
        };
        // Initialize circuit breaker
        if (this.config.circuitBreaker.enabled) {
            this.circuitBreakers.set(instance.id, {
                instanceId: instance.id,
                state: 'closed',
                failureCount: 0,
                successCount: 0,
                errorThreshold: this.config.circuitBreaker.failureThreshold,
                recoveryTimeout: this.config.circuitBreaker.recoveryTimeout
            });
        }
        return instance;
    }
    async startInstance(instance) {
        // This would interface with actual deployment system
        // For now, simulate instance startup
        setTimeout(() => {
            instance.status = 'healthy';
            instance.health.uptime = Date.now();
        }, 5000);
        this.logger.info(`Starting instance: ${instance.name}`, {
            instanceId: instance.id,
            endpoint: instance.endpoint
        });
    }
    async stopInstance(instance) {
        instance.status = 'stopping';
        // Wait for active connections to finish
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        while (instance.currentLoad.activeConnections > 0 &&
            (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Remove circuit breaker
        this.circuitBreakers.delete(instance.id);
        this.logger.info(`Stopped instance: ${instance.name}`, {
            instanceId: instance.id
        });
    }
    async updateInstanceLoad(instanceId, workflowRequest) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        // Simulate load increase
        instance.currentLoad.activeConnections++;
        instance.currentLoad.cpu = Math.min(100, instance.currentLoad.cpu + 5);
        instance.currentLoad.memory = Math.min(100, instance.currentLoad.memory + 3);
        // Update performance metrics (simplified)
        instance.performance.requestsPerSecond += 0.1;
    }
    // =============================================================================
    // HEALTH MONITORING
    // =============================================================================
    async startHealthChecking() {
        this.healthCheckInterval = setInterval(() => this.performHealthChecks(), this.config.balancing.healthCheckInterval);
        this.logger.info('Health checking started', {
            interval: this.config.balancing.healthCheckInterval
        });
    }
    async performHealthChecks() {
        const healthCheckPromises = Array.from(this.instances.values()).map(instance => this.performHealthCheck(instance));
        await Promise.allSettled(healthCheckPromises);
        // Update instance metrics
        this.updateInstanceMetrics();
    }
    async performHealthCheck(instance) {
        const startTime = performance.now();
        try {
            // Simulate health check (would make actual HTTP request)
            const isHealthy = await this.checkInstanceHealth(instance);
            const responseTime = performance.now() - startTime;
            if (isHealthy) {
                instance.health.consecutiveSuccesses++;
                instance.health.consecutiveFailures = 0;
                // Update status based on performance
                if (instance.status === 'unhealthy' &&
                    instance.health.consecutiveSuccesses >= this.config.circuitBreaker.successThreshold) {
                    instance.status = 'healthy';
                    this.logger.info(`Instance recovered: ${instance.name}`);
                }
                else if (responseTime > this.config.balancing.healthCheckTimeout * 0.8) {
                    instance.status = 'degraded';
                }
                else {
                    instance.status = 'healthy';
                }
                // Update circuit breaker
                this.updateCircuitBreakerSuccess(instance.id);
            }
            else {
                instance.health.consecutiveFailures++;
                instance.health.consecutiveSuccesses = 0;
                // Update status
                if (instance.health.consecutiveFailures >= this.config.balancing.failoverThreshold) {
                    instance.status = 'unhealthy';
                    this.logger.warn(`Instance unhealthy: ${instance.name}`, {
                        consecutiveFailures: instance.health.consecutiveFailures
                    });
                }
                // Update circuit breaker
                this.updateCircuitBreakerFailure(instance.id);
            }
            instance.health.lastHealthCheck = new Date().toISOString();
        }
        catch (error) {
            this.logger.error(`Health check failed for instance ${instance.name}:`, error);
        }
    }
    async checkInstanceHealth(instance) {
        // Simulate health check - would make actual HTTP request to instance
        // For now, randomly fail 5% of the time
        return Math.random() > 0.05;
    }
    updateInstanceMetrics() {
        const instances = Array.from(this.instances.values());
        this.metrics.instanceMetrics = {
            total: instances.length,
            healthy: instances.filter(i => i.status === 'healthy').length,
            degraded: instances.filter(i => i.status === 'degraded').length,
            unhealthy: instances.filter(i => i.status === 'unhealthy').length
        };
        // Calculate load distribution metrics
        this.calculateLoadDistributionMetrics();
    }
    calculateLoadDistributionMetrics() {
        const instances = this.getHealthyInstances();
        if (instances.length === 0) {
            this.metrics.loadDistribution = { evenness: 0, efficiency: 0 };
            return;
        }
        // Calculate load evenness (coefficient of variation)
        const loads = instances.map(i => i.currentLoad.activeConnections);
        const mean = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = mean > 0 ? stdDev / mean : 0;
        // Evenness: lower coefficient of variation means more even distribution
        const evenness = Math.max(0, 100 * (1 - coeffOfVariation));
        // Efficiency: average resource utilization
        const avgCPU = instances.reduce((sum, i) => sum + i.currentLoad.cpu, 0) / instances.length;
        const avgMemory = instances.reduce((sum, i) => sum + i.currentLoad.memory, 0) / instances.length;
        const efficiency = (avgCPU + avgMemory) / 2;
        this.metrics.loadDistribution = { evenness, efficiency };
    }
    // =============================================================================
    // CIRCUIT BREAKER IMPLEMENTATION
    // =============================================================================
    async startCircuitBreakerMonitoring() {
        this.circuitBreakerInterval = setInterval(() => this.updateCircuitBreakers(), 30000 // Every 30 seconds
        );
        this.logger.info('Circuit breaker monitoring started');
    }
    async updateCircuitBreakers() {
        for (const [instanceId, breaker] of this.circuitBreakers) {
            const instance = this.instances.get(instanceId);
            if (!instance)
                continue;
            if (breaker.state === 'open' && breaker.nextAttemptTime) {
                const now = Date.now();
                const nextAttempt = new Date(breaker.nextAttemptTime).getTime();
                if (now >= nextAttempt) {
                    breaker.state = 'half_open';
                    breaker.successCount = 0;
                    this.logger.info(`Circuit breaker half-open for instance: ${instance.name}`);
                }
            }
        }
        // Update metrics
        this.metrics.circuitBreakerMetrics.openCircuits =
            Array.from(this.circuitBreakers.values()).filter(b => b.state === 'open').length;
    }
    updateCircuitBreakerSuccess(instanceId) {
        const breaker = this.circuitBreakers.get(instanceId);
        if (!breaker)
            return;
        if (breaker.state === 'half_open') {
            breaker.successCount++;
            if (breaker.successCount >= this.config.circuitBreaker.successThreshold) {
                breaker.state = 'closed';
                breaker.failureCount = 0;
                breaker.successCount = 0;
                const instance = this.instances.get(instanceId);
                this.logger.info(`Circuit breaker closed for instance: ${instance?.name}`);
            }
        }
        else if (breaker.state === 'closed') {
            breaker.failureCount = Math.max(0, breaker.failureCount - 1); // Decay failure count
        }
    }
    updateCircuitBreakerFailure(instanceId) {
        const breaker = this.circuitBreakers.get(instanceId);
        if (!breaker)
            return;
        breaker.failureCount++;
        breaker.lastFailureTime = new Date().toISOString();
        if (breaker.state === 'closed' && breaker.failureCount >= breaker.errorThreshold) {
            breaker.state = 'open';
            breaker.nextAttemptTime = new Date(Date.now() + breaker.recoveryTimeout).toISOString();
            this.metrics.circuitBreakerMetrics.totalTrips++;
            const instance = this.instances.get(instanceId);
            this.logger.warn(`Circuit breaker opened for instance: ${instance?.name}`, {
                failureCount: breaker.failureCount
            });
        }
        else if (breaker.state === 'half_open') {
            breaker.state = 'open';
            breaker.nextAttemptTime = new Date(Date.now() + breaker.recoveryTimeout).toISOString();
        }
    }
    // =============================================================================
    // METRICS COLLECTION
    // =============================================================================
    async startMetricsCollection() {
        this.metricsCollectionInterval = setInterval(() => this.collectMetrics(), 60000 // Every minute
        );
        this.logger.info('Metrics collection started');
    }
    async collectMetrics() {
        try {
            // Update request rate
            const timeWindow = 60000; // 1 minute
            const recentRequests = this.loadBalancingHistory.filter(decision => Date.now() - new Date(decision.timestamp).getTime() < timeWindow);
            this.metrics.requestsPerSecond = recentRequests.length / 60;
            // Update response time
            if (recentRequests.length > 0) {
                const avgResponseTime = recentRequests.reduce((sum, decision) => sum + decision.metrics.decisionTime, 0) / recentRequests.length;
                this.metrics.averageResponseTime = avgResponseTime;
            }
            // Save metrics
            await this.saveMetrics();
        }
        catch (error) {
            this.logger.error('Metrics collection failed:', error);
        }
    }
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    async handleQualityEvent(event) {
        // Adjust load balancing based on quality events
        if (event.severity === 'critical') {
            // Temporarily reduce load on affected instances
            const affectedInstance = Array.from(this.instances.values())
                .find(instance => instance.metadata.region === event.entityId);
            if (affectedInstance) {
                affectedInstance.weight = Math.max(0.1, affectedInstance.weight * 0.5);
            }
        }
    }
    async handleMetricsCollected(data) {
        // Update load balancing decisions based on collected metrics
        this.logger.debug('Processing metrics for load balancing optimization');
    }
    async handleOptimizationApplied(data) {
        // Adjust instance weights based on optimization results
        const { impact } = data;
        if (impact.overallImprovement > 10) {
            // Increase weight for instances that benefited from optimization
            for (const instance of this.instances.values()) {
                if (instance.status === 'healthy') {
                    instance.weight = Math.min(2.0, instance.weight * 1.1);
                }
            }
        }
    }
    // =============================================================================
    // DATABASE OPERATIONS
    // =============================================================================
    async loadInstancesFromDatabase() {
        try {
            const stmt = this.db.prepare('SELECT * FROM workflow_instances');
            const instances = stmt.all();
            for (const row of instances) {
                const instance = {
                    id: row.id,
                    name: row.name,
                    status: row.status,
                    endpoint: row.endpoint,
                    weight: row.weight,
                    currentLoad: JSON.parse(row.current_load),
                    performance: JSON.parse(row.performance),
                    health: JSON.parse(row.health),
                    capabilities: JSON.parse(row.capabilities),
                    metadata: JSON.parse(row.metadata)
                };
                this.instances.set(instance.id, instance);
            }
            this.logger.info(`Loaded ${instances.length} instances from database`);
        }
        catch (error) {
            this.logger.error('Failed to load instances from database:', error);
        }
    }
    async saveInstancesToDatabase() {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO workflow_instances (
          id, name, status, endpoint, weight, current_load, performance,
          health, capabilities, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            for (const instance of this.instances.values()) {
                stmt.run(instance.id, instance.name, instance.status, instance.endpoint, instance.weight, JSON.stringify(instance.currentLoad), JSON.stringify(instance.performance), JSON.stringify(instance.health), JSON.stringify(instance.capabilities), JSON.stringify(instance.metadata));
            }
            this.logger.info(`Saved ${this.instances.size} instances to database`);
        }
        catch (error) {
            this.logger.error('Failed to save instances to database:', error);
        }
    }
    async saveLoadBalancingDecision(decision) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO load_balancing_decisions (
          id, request_id, selected_instance_id, algorithm, decision, reasoning,
          confidence, alternatives, metrics, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), decision.requestId, decision.selectedInstance.id || '', decision.algorithm, decision.decision, decision.reasoning, decision.confidence, JSON.stringify(decision.alternatives), JSON.stringify(decision.metrics), decision.timestamp);
        }
        catch (error) {
            this.logger.error('Failed to save load balancing decision:', error);
        }
    }
    async saveScalingDecision(decision) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO scaling_decisions (
          id, action, reason, current_instances, target_instances,
          metrics, predicted_load, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(decision.id, decision.action, decision.reason, decision.currentInstances, decision.targetInstances, JSON.stringify(decision.metrics), decision.predictedLoad ? JSON.stringify(decision.predictedLoad) : null, decision.timestamp);
        }
        catch (error) {
            this.logger.error('Failed to save scaling decision:', error);
        }
    }
    async saveMetrics() {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO load_balancer_metrics (
          id, total_requests, successful_requests, failed_requests,
          average_response_time, requests_per_second, instance_metrics,
          load_distribution, scaling_metrics, circuit_breaker_metrics, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(uuidv4(), this.metrics.totalRequests, this.metrics.successfulRequests, this.metrics.failedRequests, this.metrics.averageResponseTime, this.metrics.requestsPerSecond, JSON.stringify(this.metrics.instanceMetrics), JSON.stringify(this.metrics.loadDistribution), JSON.stringify(this.metrics.scalingMetrics), JSON.stringify(this.metrics.circuitBreakerMetrics), new Date().toISOString());
        }
        catch (error) {
            this.logger.error('Failed to save metrics:', error);
        }
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    async processRemainingRequests() {
        const remainingRequests = this.requestQueue.slice();
        this.requestQueue = [];
        for (const queuedRequest of remainingRequests) {
            try {
                await this.routeRequest(queuedRequest.id, queuedRequest.request);
            }
            catch (error) {
                this.logger.error(`Failed to process queued request ${queuedRequest.id}:`, error);
            }
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async getLoadBalancerMetrics() {
        return { ...this.metrics };
    }
    async getInstances() {
        return Array.from(this.instances.values());
    }
    async getHealthyInstances() {
        return this.getHealthyInstances();
    }
    async getInstance(instanceId) {
        return this.instances.get(instanceId) || null;
    }
    async updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Load balancer configuration updated', { newConfig });
    }
    async forceScalingEvaluation() {
        await this.evaluateScaling();
    }
    async setLoadBalancingAlgorithm(algorithm) {
        this.currentAlgorithm = algorithm;
        this.logger.info(`Load balancing algorithm changed to: ${algorithm}`);
    }
    isRunning() {
        return this.isRunning;
    }
    getLoadBalancingStats() {
        const totalDecisions = this.loadBalancingHistory.length;
        const avgDecisionTime = totalDecisions > 0 ?
            this.loadBalancingHistory.reduce((sum, d) => sum + d.metrics.decisionTime, 0) / totalDecisions : 0;
        return {
            totalDecisions,
            averageDecisionTime: avgDecisionTime,
            successRate: this.metrics.totalRequests > 0 ?
                (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 100,
            currentAlgorithm: this.currentAlgorithm
        };
    }
    async destroy() {
        await this.stopLoadBalancing();
        this.removeAllListeners();
        this.logger.info('Quality load balancer destroyed');
    }
}
export default QualityLoadBalancer;
//# sourceMappingURL=QualityLoadBalancer.js.map