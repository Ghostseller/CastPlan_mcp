/**
 * Model Training Scheduler - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Automated Retraining System
 * Implements intelligent model retraining and performance monitoring with:
 * - Automated model retraining scheduling
 * - Performance degradation detection
 * - Data drift monitoring
 * - Resource-aware training orchestration
 * - Model versioning and rollback capabilities
 *
 * Created: 2025-07-31
 * Author: AI Engineer - MLOps Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { QualityLearningEngine, ModelPerformance } from './QualityLearningEngine';
import { QualityPredictionModel } from './QualityPredictionModel';
import { FeedbackIntegrationService } from './FeedbackIntegrationService';
export interface TrainingSchedule {
    scheduleId: string;
    modelId: string;
    scheduleType: 'periodic' | 'performance_based' | 'data_drift' | 'feedback_driven' | 'manual';
    frequency: string;
    conditions: TrainingCondition[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    resourceRequirements: ResourceRequirements;
    isActive: boolean;
    lastExecuted?: Date;
    nextScheduled: Date;
    executionCount: number;
    averageTrainingTime: number;
    successRate: number;
    createdAt: Date;
}
export interface TrainingCondition {
    type: 'performance_threshold' | 'data_volume' | 'time_elapsed' | 'feedback_score' | 'drift_detection';
    metric: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'change_rate';
    value: any;
    weight: number;
    currentValue?: any;
    satisfied: boolean;
}
export interface ResourceRequirements {
    estimatedTrainingTime: number;
    memoryRequirement: number;
    cpuCores: number;
    diskSpace: number;
    priority: number;
    maxConcurrentTraining: number;
    allowParallelTraining: boolean;
}
export interface TrainingJob {
    jobId: string;
    modelId: string;
    scheduleId: string;
    jobType: 'full_retrain' | 'incremental_update' | 'hyperparameter_tuning' | 'validation_only';
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    startTime?: Date;
    endTime?: Date;
    progress: number;
    currentPhase: string;
    estimatedRemainingTime?: number;
    resourceUsage: {
        memoryUsed: number;
        cpuUsage: number;
        diskUsed: number;
    };
    results?: TrainingJobResult;
    error?: string;
    createdAt: Date;
}
export interface TrainingJobResult {
    success: boolean;
    modelVersion: string;
    performanceImprovement: number;
    newPerformance: ModelPerformance;
    previousPerformance?: ModelPerformance;
    trainingMetrics: {
        epochs: number;
        finalLoss: number;
        validationLoss: number;
        trainingTime: number;
        convergenceEpoch?: number;
    };
    validationResults: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        confusionMatrix?: number[][];
    };
    modelSize: number;
    featureImportanceChanges: Record<string, number>;
    recommendations: string[];
}
export interface DataDriftDetection {
    driftId: string;
    modelId: string;
    detectionMethod: 'statistical' | 'ml_based' | 'distribution_comparison' | 'performance_based';
    driftScore: number;
    threshold: number;
    driftDetected: boolean;
    affectedFeatures: string[];
    recommendations: string[];
    detectedAt: Date;
    driftDetails: {
        featureDrifts: Record<string, {
            drift_score: number;
            p_value?: number;
            distribution_change: string;
        }>;
        populationStability: number;
        characteristicStability: number;
    };
}
export interface PerformanceMonitoring {
    monitoringId: string;
    modelId: string;
    monitoringPeriod: string;
    performanceTrend: 'improving' | 'stable' | 'declining' | 'volatile';
    currentPerformance: ModelPerformance;
    baselinePerformance: ModelPerformance;
    performanceChange: number;
    alertLevel: 'none' | 'warning' | 'critical' | 'severe';
    monitoredMetrics: {
        accuracy: {
            current: number;
            baseline: number;
            change: number;
        };
        precision: {
            current: number;
            baseline: number;
            change: number;
        };
        recall: {
            current: number;
            baseline: number;
            change: number;
        };
        f1Score: {
            current: number;
            baseline: number;
            change: number;
        };
    };
    lastUpdated: Date;
}
export interface TrainingOrchestration {
    orchestrationId: string;
    activeJobs: string[];
    queuedJobs: string[];
    maxConcurrentJobs: number;
    totalResourceCapacity: ResourceRequirements;
    currentResourceUsage: ResourceRequirements;
    schedulingStrategy: 'fifo' | 'priority' | 'resource_optimized' | 'performance_weighted';
    lastOptimization: Date;
}
export declare class ModelTrainingScheduler {
    private db;
    private logger;
    private qualityLearningEngine;
    private qualityPredictionModel;
    private feedbackIntegrationService;
    private schedules;
    private activeJobs;
    private jobQueue;
    private readonly MAX_CONCURRENT_JOBS;
    private readonly PERFORMANCE_CHECK_INTERVAL;
    private readonly DATA_DRIFT_CHECK_INTERVAL;
    private readonly MIN_TRAINING_INTERVAL;
    private performanceMonitoringInterval?;
    private dataDriftMonitoringInterval?;
    private jobProcessingInterval?;
    constructor(db: Database.Database, logger: Logger, qualityLearningEngine: QualityLearningEngine, qualityPredictionModel: QualityPredictionModel, feedbackIntegrationService: FeedbackIntegrationService);
    /**
     * Initialize the model training scheduler
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for training scheduler
     */
    private createSchedulerTables;
    /**
     * Initialize default training schedules
     */
    private initializeDefaultSchedules;
    /**
     * Create a new training schedule
     */
    createTrainingSchedule(modelId: string, scheduleType: TrainingSchedule['scheduleType'], frequency: string, conditions: TrainingCondition[], options?: {
        priority?: TrainingSchedule['priority'];
        resourceRequirements?: Partial<ResourceRequirements>;
    }): Promise<string>;
    /**
     * Check conditions and schedule training jobs
     */
    checkSchedulesAndCreateJobs(): Promise<void>;
    /**
     * Determine if a schedule should execute
     */
    private shouldExecuteSchedule;
    /**
     * Evaluate schedule conditions
     */
    private evaluateScheduleConditions;
    /**
     * Evaluate individual condition
     */
    private evaluateCondition;
    /**
     * Evaluate performance-based condition
     */
    private evaluatePerformanceCondition;
    /**
     * Evaluate data volume condition
     */
    private evaluateDataVolumeCondition;
    /**
     * Evaluate time-based condition
     */
    private evaluateTimeCondition;
    /**
     * Evaluate feedback-based condition
     */
    private evaluateFeedbackCondition;
    /**
     * Evaluate drift detection condition
     */
    private evaluateDriftCondition;
    /**
     * Create a training job
     */
    createTrainingJob(schedule: TrainingSchedule, jobType?: TrainingJob['jobType']): Promise<string>;
    /**
     * Execute training job
     */
    private executeTrainingJob;
    /**
     * Perform model training (simplified implementation)
     */
    private performModelTraining;
    /**
     * Perform model validation
     */
    private performModelValidation;
    /**
     * Detect data drift for a model
     */
    detectDataDrift(modelId: string): Promise<DataDriftDetection>;
    /**
     * Monitor model performance
     */
    monitorModelPerformance(modelId: string): Promise<PerformanceMonitoring>;
    /**
     * Process job queue
     */
    private processJobQueue;
    /**
     * Calculate next schedule time
     */
    private calculateNextScheduleTime;
    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring;
    /**
     * Start data drift monitoring
     */
    private startDataDriftMonitoring;
    /**
     * Start job processing
     */
    private startJobProcessing;
    /**
     * Get scheduler statistics
     */
    getSchedulerStatistics(): Promise<{
        totalSchedules: number;
        activeSchedules: number;
        totalJobs: number;
        runningJobs: number;
        queuedJobs: number;
        completedJobs: number;
        failedJobs: number;
        averageTrainingTime: number;
        successRate: number;
    }>;
    /**
     * Storage methods
     */
    private storeSchedule;
    private updateSchedule;
    private storeTrainingJob;
    private updateTrainingJob;
    private storeDriftDetection;
    private storePerformanceMonitoring;
    private updateScheduleStatistics;
    /**
     * Load existing schedules and jobs
     */
    private loadExistingSchedules;
    private loadActiveJobs;
    /**
     * Shutdown the scheduler
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ModelTrainingScheduler.d.ts.map