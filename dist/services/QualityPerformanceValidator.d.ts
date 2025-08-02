/**
 * Quality Performance Validator - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - Performance Target Validation
 * Validates all performance optimization targets and automated workflow efficiency metrics
 *
 * Performance Targets (from requirements):
 * - 50% reduction in resource usage through optimization
 * - 75% reduction in manual intervention requirements
 * - 90% automated quality issue resolution
 * - <1 minute workflow initiation time
 * - >95% workflow success rate with automated rollback
 *
 * Created: 2025-07-31
 * Author: Performance Engineer
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualitySystemOptimizer } from './QualitySystemOptimizer';
import { QualityLoadBalancer } from './QualityLoadBalancer';
import { QualityWorkflowScheduler } from './QualityWorkflowScheduler';
import { QualityWorkflowOrchestrator } from './QualityWorkflowOrchestrator';
import { AutomatedQualityWorkflow } from './AutomatedQualityWorkflow';
export interface PerformanceTarget {
    metric: string;
    target: number;
    unit: string;
    operator: 'greater_than' | 'less_than' | 'equals' | 'greater_equal' | 'less_equal';
    category: 'resource_optimization' | 'automation' | 'response_time' | 'success_rate' | 'throughput';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
}
export interface PerformanceValidationResult {
    target: PerformanceTarget;
    actual: number;
    passed: boolean;
    deviation: number;
    deviationPercent: number;
    timestamp: Date;
    evidence: any;
    recommendations?: string[];
}
export interface SystemPerformanceReport {
    validationId: string;
    timestamp: Date;
    overallScore: number;
    targetsTotal: number;
    targetsPassed: number;
    targetsFailed: number;
    criticalFailures: number;
    results: PerformanceValidationResult[];
    recommendations: string[];
    nextValidationAt: Date;
}
export interface PerformanceBenchmark {
    category: string;
    baseline: {
        timestamp: Date;
        metrics: Record<string, number>;
    };
    current: {
        timestamp: Date;
        metrics: Record<string, number>;
    };
    improvements: Record<string, {
        absolute: number;
        percentage: number;
        target: number;
        achieved: boolean;
    }>;
}
export declare class QualityPerformanceValidator extends EventEmitter {
    private db;
    private logger;
    private optimizer;
    private loadBalancer;
    private scheduler;
    private orchestrator;
    private workflow;
    private performanceTargets;
    private baselineMetrics;
    private isInitialized;
    private validationInterval;
    private readonly WEEK5_TARGETS;
    constructor(database: Database.Database, logger: Logger, optimizer: QualitySystemOptimizer, loadBalancer: QualityLoadBalancer, scheduler: QualityWorkflowScheduler, orchestrator: QualityWorkflowOrchestrator, workflow: AutomatedQualityWorkflow);
    private initializeDatabase;
    private loadPerformanceTargets;
    initialize(): Promise<void>;
    /**
     * Add a new performance target for validation
     */
    addPerformanceTarget(target: PerformanceTarget): Promise<void>;
    /**
     * Validate all performance targets and generate comprehensive report
     */
    validatePerformance(): Promise<SystemPerformanceReport>;
    /**
     * Establish baseline metrics for comparison
     */
    establishBaseline(): Promise<void>;
    /**
     * Compare current metrics against baseline and calculate improvements
     */
    calculateImprovements(): Promise<PerformanceBenchmark>;
    /**
     * Get current system performance status
     */
    getPerformanceStatus(): Promise<{
        overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
        score: number;
        criticalIssues: string[];
        improvements: Record<string, number>;
        nextValidation: Date;
        uptime: number;
    }>;
    private collectSystemMetrics;
    private validateTarget;
    private generateRecommendations;
    private generateTargetRecommendations;
    private getRelatedMetrics;
    private isMetricImprovement;
    private getTargetForMetric;
    private storeValidationResult;
    private storePerformanceReport;
    private storeBenchmark;
    private getLatestReport;
    private getSystemUptime;
    private startContinuousValidation;
    shutdown(): Promise<void>;
}
export default QualityPerformanceValidator;
//# sourceMappingURL=QualityPerformanceValidator.d.ts.map