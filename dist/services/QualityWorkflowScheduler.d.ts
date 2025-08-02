import { EventEmitter } from 'events';
import { QualitySystemOptimizer } from './QualitySystemOptimizer';
import { QualityLoadBalancer } from './QualityLoadBalancer';
/**
 * Intelligent Task Prioritization and Scheduling System
 * Week 5: Automated Workflows and Optimization
 *
 * Features:
 * - ML-driven priority algorithms with real-time adaptation
 * - Dynamic resource allocation based on system capacity
 * - SLA-aware scheduling with deadline management
 * - Predictive workload balancing and bottleneck prevention
 * - Real-time scheduling decisions <50ms response time
 * - Support for up to 500 concurrent scheduled tasks
 */
interface ScheduledTask {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    workflowType: 'quality_assessment' | 'improvement' | 'monitoring' | 'optimization' | 'validation';
    priority: number;
    basePriority: 'critical' | 'high' | 'medium' | 'low';
    createdAt: Date;
    scheduledAt: Date;
    deadlineAt?: Date;
    estimatedDuration: number;
    dependencies: string[];
    requirements: {
        cpuIntensive: boolean;
        memoryIntensive: boolean;
        ioIntensive: boolean;
        networkIntensive: boolean;
        minConcurrency: number;
        maxConcurrency: number;
    };
    slaRequirements: {
        maxLatency: number;
        minThroughput: number;
        availabilityTarget: number;
    };
    metadata: Record<string, any>;
    status: 'scheduled' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    retryCount: number;
    lastRetryAt?: Date;
    completedAt?: Date;
    executionTime?: number;
}
interface PriorityWeights {
    urgency: number;
    importance: number;
    complexity: number;
    dependencies: number;
    slaImpact: number;
    historicalSuccess: number;
}
interface ResourceCapacity {
    cpu: number;
    memory: number;
    io: number;
    network: number;
    concurrentTasks: number;
    queueLength: number;
    throughput: number;
}
interface SchedulingDecision {
    taskId: string;
    scheduleTime: Date;
    estimatedStartTime: Date;
    estimatedCompletionTime: Date;
    assignedResources: {
        cpuAllocation: number;
        memoryAllocation: number;
        ioAllocation: number;
        networkAllocation: number;
    };
    confidence: number;
    reasoning: string[];
    alternativeSchedules?: SchedulingDecision[];
}
interface SchedulingMetrics {
    averageWaitTime: number;
    averageExecutionTime: number;
    throughputRate: number;
    slaCompliance: number;
    resourceUtilization: ResourceCapacity;
    schedulingLatency: number;
    queueDepth: number;
    failureRate: number;
    predictionAccuracy: number;
}
export declare class QualityWorkflowScheduler extends EventEmitter {
    private db;
    private scheduler;
    private loadBalancer;
    private scheduledTasks;
    private priorityQueue;
    private resourceCapacity;
    private metrics;
    private priorityWeights;
    private isRunning;
    private schedulingInterval;
    private metricsInterval;
    constructor(database: Database.Database, optimizer: QualitySystemOptimizer, loadBalancer: QualityLoadBalancer);
    private initializeDatabase;
    private loadExistingTasks;
    /**
     * Schedule a new quality workflow task with intelligent prioritization
     */
    scheduleTask(entityId: string, entityType: 'document' | 'chunk' | 'system', workflowType: 'quality_assessment' | 'improvement' | 'monitoring' | 'optimization' | 'validation', basePriority: 'critical' | 'high' | 'medium' | 'low', options?: {
        deadlineAt?: Date;
        dependencies?: string[];
        requirements?: Partial<ScheduledTask['requirements']>;
        slaRequirements?: Partial<ScheduledTask['slaRequirements']>;
        metadata?: Record<string, any>;
    }): Promise<string>;
    /**
     * Get next optimal task for execution based on current system state
     */
    getNextTask(): Promise<ScheduledTask | null>;
    /**
     * Mark task as started and update metrics
     */
    markTaskStarted(taskId: string): Promise<void>;
    /**
     * Mark task as completed and update learning data
     */
    markTaskCompleted(taskId: string, executionTime: number, success?: boolean): Promise<void>;
    /**
     * Get current scheduling metrics and status
     */
    getMetrics(): SchedulingMetrics;
    /**
     * Get scheduling decision for a specific task
     */
    getSchedulingDecision(taskId: string): Promise<SchedulingDecision | null>;
    /**
     * Update priority weights for ML optimization
     */
    updatePriorityWeights(weights: Partial<PriorityWeights>): void;
    /**
     * Cancel a scheduled task
     */
    cancelTask(taskId: string, reason?: string): Promise<boolean>;
    private calculateIntelligentPriority;
    private calculateUrgencyScore;
    private calculateImportanceScore;
    private calculateComplexityScore;
    private calculateDependencyScore;
    private calculateSLAScore;
    private calculateHistoryScore;
    private findBestAvailableTask;
    private checkResourceAvailability;
    private updateResourceCapacity;
    private estimateWaitTime;
    private calculateResourceAllocation;
    private calculateSchedulingConfidence;
    private generateSchedulingReasoning;
    private estimateTaskDuration;
    private sortPriorityQueue;
    private persistTask;
    private updateWaitTimeMetrics;
    private updateExecutionMetrics;
    private updateLearningData;
    private startScheduler;
    private processSchedulingCycle;
    private updateMetrics;
    private persistMetrics;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=QualityWorkflowScheduler.d.ts.map