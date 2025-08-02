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
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualityMonitoringService } from './QualityMonitoringService';
import { QualitySystemOptimizer } from './QualitySystemOptimizer';
export interface LoadBalancerConfig {
    /** Auto-scaling configuration */
    autoScaling: {
        enabled: boolean;
        minInstances: number;
        maxInstances: number;
        scaleUpThreshold: number;
        scaleDownThreshold: number;
        scaleUpCooldown: number;
        scaleDownCooldown: number;
        predictiveScaling: boolean;
    };
    /** Load balancing algorithms */
    balancing: {
        algorithm: 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'resource_aware' | 'adaptive';
        healthCheckInterval: number;
        healthCheckTimeout: number;
        failoverThreshold: number;
        stickySessions: boolean;
    };
    /** Performance optimization */
    performance: {
        connectionPooling: boolean;
        keepAliveTimeout: number;
        maxConcurrentRequests: number;
        requestTimeout: number;
        retryAttempts: number;
        retryBackoff: number;
    };
    /** Circuit breaker configuration */
    circuitBreaker: {
        enabled: boolean;
        failureThreshold: number;
        recoveryTimeout: number;
        successThreshold: number;
    };
    /** Resource limits */
    resources: {
        maxCPUPerInstance: number;
        maxMemoryPerInstance: number;
        maxIOPerInstance: number;
        resourceBufferPercentage: number;
    };
}
export interface WorkflowInstance {
    id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'starting' | 'stopping';
    endpoint: string;
    weight: number;
    currentLoad: {
        cpu: number;
        memory: number;
        io: number;
        activeConnections: number;
        queuedRequests: number;
    };
    performance: {
        averageResponseTime: number;
        requestsPerSecond: number;
        errorRate: number;
        successRate: number;
    };
    health: {
        lastHealthCheck: string;
        consecutiveFailures: number;
        consecutiveSuccesses: number;
        uptime: number;
    };
    capabilities: {
        maxConcurrentWorkflows: number;
        supportedWorkflowTypes: string[];
        resourceCapacity: {
            cpu: number;
            memory: number;
            io: number;
        };
    };
    metadata: {
        version: string;
        region: string;
        instanceType: string;
        startTime: string;
    };
}
export interface LoadBalancingDecision {
    requestId: string;
    selectedInstance: WorkflowInstance;
    algorithm: string;
    decision: 'route' | 'queue' | 'reject' | 'failover';
    reasoning: string;
    confidence: number;
    alternatives: Array<{
        instance: WorkflowInstance;
        score: number;
        reasoning: string;
    }>;
    metrics: {
        decisionTime: number;
        queueDepth: number;
        totalInstances: number;
        healthyInstances: number;
    };
    timestamp: string;
}
export interface ScalingDecision {
    id: string;
    action: 'scale_up' | 'scale_down' | 'maintain';
    reason: string;
    currentInstances: number;
    targetInstances: number;
    metrics: {
        avgCPU: number;
        avgMemory: number;
        avgResponseTime: number;
        requestRate: number;
        errorRate: number;
    };
    predictedLoad?: {
        nextHour: number;
        confidence: number;
        factors: string[];
    };
    timestamp: string;
}
export interface CircuitBreakerState {
    instanceId: string;
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    successCount: number;
    lastFailureTime?: string;
    nextAttemptTime?: string;
    errorThreshold: number;
    recoveryTimeout: number;
}
export interface LoadBalancerMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    instanceMetrics: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
    loadDistribution: {
        evenness: number;
        efficiency: number;
    };
    scalingMetrics: {
        scaleUpEvents: number;
        scaleDownEvents: number;
        averageScalingTime: number;
        predictiveAccuracy?: number;
    };
    circuitBreakerMetrics: {
        openCircuits: number;
        totalTrips: number;
        averageRecoveryTime: number;
    };
}
export declare class QualityLoadBalancer extends EventEmitter {
    private logger;
    private db;
    private config;
    private monitoringService;
    private systemOptimizer;
    private isRunning;
    private instances;
    private circuitBreakers;
    private requestQueue;
    private currentAlgorithm;
    private roundRobinIndex;
    private loadBalancingHistory;
    private scalingHistory;
    private metrics;
    private lastScalingAction;
    private lastScalingTime;
    private healthCheckInterval?;
    private scalingEvaluationInterval?;
    private metricsCollectionInterval?;
    private circuitBreakerInterval?;
    private startTime;
    constructor(database: Database.Database, logger: Logger, monitoringService: QualityMonitoringService, systemOptimizer: QualitySystemOptimizer, config?: Partial<LoadBalancerConfig>);
    private initializeDatabase;
    private setupEventListeners;
    private initializeMetrics;
    startLoadBalancing(): Promise<void>;
    stopLoadBalancing(): Promise<void>;
    private initializeDefaultInstances;
    private stopAllIntervals;
    routeRequest(requestId: string, workflowRequest: any): Promise<LoadBalancingDecision>;
    private selectInstance;
    private selectRoundRobin;
    private selectLeastConnections;
    private selectWeightedRoundRobin;
    private selectResourceAware;
    private selectAdaptive;
    private calculateResourceScore;
    private calculateAdaptiveScore;
    private getSelectionReasoning;
    private calculateSelectionConfidence;
    private generateAlternatives;
    private createFailureDecision;
    private startScalingEvaluation;
    private evaluateScaling;
    private calculateAverageInstanceMetrics;
    private makeScalingDecision;
    private applyScalingDecision;
    private scaleUp;
    private scaleDown;
    private predictFutureLoad;
    private createInstance;
    private startInstance;
    private stopInstance;
    private updateInstanceLoad;
    private startHealthChecking;
    private performHealthChecks;
    private performHealthCheck;
    private checkInstanceHealth;
    private updateInstanceMetrics;
    private calculateLoadDistributionMetrics;
    private startCircuitBreakerMonitoring;
    private updateCircuitBreakers;
    private updateCircuitBreakerSuccess;
    private updateCircuitBreakerFailure;
    private startMetricsCollection;
    private collectMetrics;
    private handleQualityEvent;
    private handleMetricsCollected;
    private handleOptimizationApplied;
    private loadInstancesFromDatabase;
    private saveInstancesToDatabase;
    private saveLoadBalancingDecision;
    private saveScalingDecision;
    private saveMetrics;
    private processRemainingRequests;
    getLoadBalancerMetrics(): Promise<LoadBalancerMetrics>;
    getInstances(): Promise<WorkflowInstance[]>;
    getInstance(instanceId: string): Promise<WorkflowInstance | null>;
    updateConfiguration(newConfig: Partial<LoadBalancerConfig>): Promise<void>;
    forceScalingEvaluation(): Promise<void>;
    setLoadBalancingAlgorithm(algorithm: LoadBalancerConfig['balancing']['algorithm']): Promise<void>;
    isRunning(): boolean;
    getLoadBalancingStats(): {
        totalDecisions: number;
        averageDecisionTime: number;
        successRate: number;
        currentAlgorithm: string;
    };
    destroy(): Promise<void>;
}
export default QualityLoadBalancer;
//# sourceMappingURL=QualityLoadBalancer.d.ts.map