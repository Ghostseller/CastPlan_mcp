/**
 * Automated Quality Workflow - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - End-to-End Quality Automation
 * Fully automated quality improvement workflows with minimal human intervention
 *
 * Features:
 * - End-to-end quality assessment, improvement, and validation automation
 * - Self-healing quality issues with automated remediation
 * - Intelligent workflow orchestration with adaptive decision making
 * - Continuous quality monitoring with automatic intervention triggers
 * - Machine learning-driven quality optimization strategies
 * - Performance-optimized with <1 minute workflow initiation time
 * - >95% workflow success rate with automated rollback capabilities
 *
 * Performance targets:
 * - Workflow initiation time: <1 minute
 * - Quality issue resolution: 90% automated
 * - Resource usage reduction: 50% through optimization
 * - Manual intervention reduction: 75%
 * - Workflow success rate: >95%
 *
 * Integration points:
 * - QualityServiceOrchestrator for comprehensive quality analysis
 * - QualityMonitoringService for real-time quality tracking
 * - QualityWorkflowOrchestrator for intelligent workflow scheduling
 * - QualitySystemOptimizer for performance optimization
 * - QualityLoadBalancer for resource distribution
 *
 * Created: 2025-07-31
 * Author: Automation Engineer & DevOps Specialist
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import * as Database from 'better-sqlite3';
import { QualityServiceOrchestrator } from './QualityServiceOrchestrator';
import { QualityMonitoringService } from './QualityMonitoringService';
import { QualityScore } from './QualityAssessmentEngine';
import { QualityIssue } from './QualityIssueDetector';
import { ImprovementRecommendation } from './QualityImprovementRecommender';
export interface AutomatedWorkflowConfig {
    /** Enable fully automated workflow execution */
    enableFullyAutomatedMode: boolean;
    /** Quality threshold for automatic intervention */
    automaticInterventionThreshold: number;
    /** Maximum parallel workflows */
    maxParallelWorkflows: number;
    /** Workflow timeout in milliseconds */
    workflowTimeout: number;
    /** Enable machine learning optimization */
    enableMLOptimization: boolean;
    /** Automatic rollback on failure */
    enableAutomaticRollback: boolean;
    /** Resource optimization settings */
    resourceOptimization: {
        enableCPUOptimization: boolean;
        enableMemoryOptimization: boolean;
        enableIOOptimization: boolean;
        targetResourceReduction: number;
    };
    /** Performance requirements */
    performance: {
        workflowInitiationTimeTarget: number;
        qualityResolutionRateTarget: number;
        manualInterventionReductionTarget: number;
        workflowSuccessRateTarget: number;
    };
}
export declare enum WorkflowStage {
    INITIALIZATION = "initialization",
    ASSESSMENT = "assessment",
    ANALYSIS = "analysis",
    PLANNING = "planning",
    EXECUTION = "execution",
    VALIDATION = "validation",
    OPTIMIZATION = "optimization",
    COMPLETION = "completion",
    ROLLBACK = "rollback"
}
export declare enum WorkflowStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    ROLLED_BACK = "rolled_back"
}
export interface AutomatedWorkflow {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    stage: WorkflowStage;
    status: WorkflowStatus;
    progress: number;
    startTime: string;
    endTime?: string;
    metadata: {
        triggeredBy: 'monitoring' | 'schedule' | 'manual' | 'threshold';
        priority: 'low' | 'medium' | 'high' | 'critical';
        estimatedDuration: number;
        resourceRequirements: {
            cpu: number;
            memory: number;
            io: number;
        };
    };
    context: {
        initialQualityScore: QualityScore;
        targetQualityScore: QualityScore;
        detectedIssues: QualityIssue[];
        plannedImprovements: ImprovementRecommendation[];
        appliedImprovements: ImprovementRecommendation[];
        validationResults: WorkflowValidationResult[];
    };
    performance: {
        initializationTime: number;
        assessmentTime: number;
        executionTime: number;
        validationTime: number;
        totalTime: number;
        resourceUsage: {
            peakCPU: number;
            peakMemory: number;
            totalIO: number;
        };
    };
    rollbackPlan?: WorkflowRollbackPlan;
}
export interface WorkflowValidationResult {
    stage: WorkflowStage;
    passed: boolean;
    metrics: {
        qualityImprovement: number;
        issuesResolved: number;
        performanceImpact: number;
        resourceEfficiency: number;
    };
    issues: string[];
    timestamp: string;
}
export interface WorkflowRollbackPlan {
    steps: Array<{
        stage: WorkflowStage;
        action: string;
        parameters: any;
        rollbackAction: string;
        rollbackParameters: any;
    }>;
    triggers: Array<{
        condition: string;
        threshold: number;
        action: 'rollback' | 'pause' | 'alert';
    }>;
}
export interface WorkflowOptimizationStrategy {
    id: string;
    name: string;
    description: string;
    applicableEntityTypes: string[];
    optimizationRules: Array<{
        condition: string;
        action: string;
        parameters: any;
        expectedImprovement: number;
    }>;
    learningModel?: {
        modelType: string;
        trainingData: any[];
        accuracy: number;
        lastUpdated: string;
    };
}
export interface AutomationMetrics {
    totalWorkflowsExecuted: number;
    successfulWorkflows: number;
    failedWorkflows: number;
    averageExecutionTime: number;
    qualityImprovementRate: number;
    resourceEfficiencyGain: number;
    manualInterventionReduction: number;
    automaticResolutionRate: number;
    rollbackRate: number;
    performanceOptimizationGain: number;
}
export declare class AutomatedQualityWorkflow extends EventEmitter {
    private logger;
    private db;
    private config;
    private qualityOrchestrator;
    private monitoringService;
    private activeWorkflows;
    private workflowQueue;
    private optimizationStrategies;
    private metrics;
    private isRunning;
    private processingInterval?;
    private optimizationInterval?;
    constructor(database: Database.Database, logger: Logger, qualityOrchestrator: QualityServiceOrchestrator, monitoringService: QualityMonitoringService, config?: Partial<AutomatedWorkflowConfig>);
    private initializeDatabase;
    private setupEventListeners;
    private loadOptimizationStrategies;
    private createDefaultOptimizationStrategies;
    startAutomation(): Promise<void>;
    stopAutomation(): Promise<void>;
    triggerWorkflow(entityId: string, entityType: 'document' | 'chunk' | 'system', triggeredBy: 'monitoring' | 'schedule' | 'manual' | 'threshold', priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<string>;
    private processWorkflowQueue;
    private executeWorkflow;
    private executeAssessmentStage;
    private executeAnalysisStage;
    private executePlanningStage;
    private executeImprovementStage;
    private executeValidationStage;
    private executeOptimizationStage;
    private estimateResourceRequirements;
    private estimateWorkflowDuration;
    private calculateTargetQualityScore;
    private createRollbackPlan;
    private calculateQualityImprovement;
    private calculateResourceEfficiency;
    private calculateResourceReduction;
    getWorkflowStatus(workflowId: string): Promise<AutomatedWorkflow | null>;
    getAutomationMetrics(): Promise<AutomationMetrics>;
    cancelWorkflow(workflowId: string): Promise<boolean>;
    private saveWorkflow;
    private updateWorkflow;
    private loadWorkflow;
    private handleQualityEvent;
    private handleThresholdExceeded;
    private handleQualityDegradation;
    private handleIssuesDetected;
    private handleQualityAnalysisComplete;
    private handleQualityImprovementComplete;
    private addToWorkflowQueue;
    private getNextWorkflow;
    private waitForActiveWorkflows;
    private handleWorkflowFailure;
    private initiateRollback;
    private applyOptimizationStrategies;
    private applyCPUOptimization;
    private applyMemoryOptimization;
    private applyIOOptimization;
    private updateLearningModel;
    private optimizeStrategies;
    private updateSuccessMetrics;
}
export default AutomatedQualityWorkflow;
//# sourceMappingURL=AutomatedQualityWorkflow.d.ts.map