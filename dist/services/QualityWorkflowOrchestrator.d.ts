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
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { AutomatedQualityWorkflow } from './AutomatedQualityWorkflow';
import { QualityMonitoringService } from './QualityMonitoringService';
export interface OrchestrationConfig {
    /** Maximum concurrent workflows per priority level */
    maxConcurrentWorkflows: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    /** Resource allocation limits */
    resourceLimits: {
        totalCPU: number;
        totalMemory: number;
        totalIO: number;
    };
    /** Scheduling algorithm configuration */
    scheduling: {
        algorithm: 'priority' | 'round_robin' | 'fair_share' | 'adaptive';
        timeSliceMs: number;
        priorityWeights: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
    };
    /** Performance monitoring */
    monitoring: {
        metricsCollectionInterval: number;
        healthCheckInterval: number;
        performanceThresholds: {
            schedulingLatencyMs: number;
            resourceUtilizationTarget: number;
            workflowSuccessRateTarget: number;
        };
    };
    /** Machine learning optimization */
    mlOptimization: {
        enabled: boolean;
        modelUpdateInterval: number;
        trainingDataSize: number;
        optimizationTargets: string[];
    };
}
export interface WorkflowScheduleEntry {
    id: string;
    workflowId: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    scheduledTime: string;
    estimatedDuration: number;
    resourceRequirements: {
        cpu: number;
        memory: number;
        io: number;
    };
    dependencies: string[];
    status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
    retryCount: number;
    maxRetries: number;
    metadata: {
        entityId: string;
        entityType: string;
        triggeredBy: string;
        schedulingReason: string;
    };
}
export interface ResourceAllocation {
    workflowId: string;
    allocatedResources: {
        cpu: number;
        memory: number;
        io: number;
    };
    actualUsage: {
        cpu: number;
        memory: number;
        io: number;
    };
    efficiency: number;
    startTime: string;
    endTime?: string;
}
export interface OrchestrationMetrics {
    totalWorkflowsScheduled: number;
    concurrentWorkflowsCount: number;
    averageSchedulingLatency: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
        io: number;
    };
    workflowSuccessRate: number;
    systemUptime: number;
    schedulingAccuracy: number;
    throughput: {
        workflowsPerHour: number;
        workflowsPerDay: number;
    };
    optimization: {
        mlOptimizationsApplied: number;
        performanceImprovements: number;
        resourceSavings: number;
    };
}
export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'critical' | 'offline';
    components: {
        scheduler: 'healthy' | 'degraded' | 'critical';
        resourceManager: 'healthy' | 'degraded' | 'critical';
        workflowEngine: 'healthy' | 'degraded' | 'critical';
        monitoring: 'healthy' | 'degraded' | 'critical';
        database: 'healthy' | 'degraded' | 'critical';
    };
    metrics: {
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
        networkLatency: number;
    };
    alerts: Array<{
        severity: 'info' | 'warning' | 'error' | 'critical';
        component: string;
        message: string;
        timestamp: string;
    }>;
}
export interface SchedulingDecision {
    workflowId: string;
    decision: 'schedule' | 'defer' | 'reject' | 'prioritize';
    scheduledTime: string;
    reasoning: string;
    confidence: number;
    alternatives: Array<{
        decision: string;
        confidence: number;
        reasoning: string;
    }>;
}
export declare class QualityWorkflowOrchestrator extends EventEmitter {
    private logger;
    private db;
    private config;
    private automatedWorkflow;
    private monitoringService;
    private isRunning;
    private scheduleEntries;
    private resourceAllocations;
    private activeWorkflows;
    private schedulingQueue;
    private schedulingHistory;
    private performanceHistory;
    private systemHealth;
    private metrics;
    private startTime;
    private schedulingInterval?;
    private healthCheckInterval?;
    private metricsCollectionInterval?;
    private optimizationInterval?;
    constructor(database: Database.Database, logger: Logger, automatedWorkflow: AutomatedQualityWorkflow, monitoringService: QualityMonitoringService, config?: Partial<OrchestrationConfig>);
    private initializeDatabase;
    private setupEventListeners;
    private initializeSystemHealth;
    private initializeMetrics;
    startOrchestration(): Promise<void>;
    stopOrchestration(): Promise<void>;
    private startSchedulingEngine;
    private startHealthMonitoring;
    private startMetricsCollection;
    private startMLOptimization;
    scheduleWorkflow(entityId: string, entityType: 'document' | 'chunk' | 'system', priority: 'critical' | 'high' | 'medium' | 'low', triggeredBy: 'monitoring' | 'schedule' | 'manual' | 'threshold', dependencies?: string[]): Promise<string>;
    private runSchedulingCycle;
    private makeSchedulingDecision;
    private applySchedulingDecision;
    private executeScheduledWorkflow;
    private estimateResourceRequirements;
    private estimateWorkflowDuration;
    private getAvailableResources;
    private checkResourceAvailability;
    private allocateResources;
    private getCurrentSystemLoad;
    private processPriorityScheduling;
    private processFairShareScheduling;
    private processAdaptiveScheduling;
    private processRoundRobinScheduling;
    private processHighLoadScheduling;
    private processLowLoadScheduling;
    private determineSchedulingReason;
    private getCurrentConcurrentCount;
    private checkDependencies;
    private calculateDeferredTime;
    private generateAlternativeDecisions;
    private addToSchedulingQueue;
    private removeFromQueue;
    private groupByPriority;
    private hasAvailableResources;
    private applyMLSchedulingOptimization;
    private performMLOptimization;
    private collectMLTrainingData;
    private updateMLModels;
    private applyMLOptimizations;
    private performHealthCheck;
    private checkComponentHealth;
    private checkDatabaseHealth;
    private checkSystemMetrics;
    private checkPerformanceThresholds;
    private calculateOverallHealth;
    private generateHealthAlerts;
    private collectMetrics;
    private calculateAverageSchedulingLatency;
    private calculateResourceUtilization;
    private calculateWorkflowSuccessRate;
    private calculateSchedulingAccuracy;
    private calculateResourceSavings;
    private updateSchedulingMetrics;
    private handleWorkflowTriggered;
    private handleWorkflowCompleted;
    private handleWorkflowFailed;
    private handleQualityEvent;
    private handleCriticalEvent;
    private saveScheduleEntry;
    private updateScheduleEntry;
    private saveResourceAllocation;
    private updateResourceAllocation;
    private saveSchedulingDecision;
    private saveMetrics;
    private saveSystemHealth;
    private calculateAllocationEfficiency;
    private calculateRetryTime;
    private gracefulShutdown;
    getOrchestrationMetrics(): Promise<OrchestrationMetrics>;
    getSystemHealth(): Promise<SystemHealth>;
    getScheduleEntries(status?: string): Promise<WorkflowScheduleEntry[]>;
    getResourceAllocations(): Promise<ResourceAllocation[]>;
    updateConfiguration(newConfig: Partial<OrchestrationConfig>): Promise<void>;
    cancelScheduledWorkflow(scheduleId: string): Promise<boolean>;
    isHealthy(): boolean;
    destroy(): Promise<void>;
}
export default QualityWorkflowOrchestrator;
//# sourceMappingURL=QualityWorkflowOrchestrator.d.ts.map