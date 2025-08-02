/**
 * A/B Testing Service - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - A/B Testing Framework
 * Implements comprehensive A/B testing for quality improvement validation:
 * - Test design and configuration
 * - User assignment with stratification
 * - Statistical significance testing
 * - Performance measurement and analysis
 * - Automated decision making
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Experimentation Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
export interface ABTest {
    testId: string;
    name: string;
    description: string;
    testType: 'quality_assessment' | 'improvement_algorithm' | 'user_interface' | 'recommendation_engine';
    status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
    variants: ABTestVariant[];
    trafficAllocation: number;
    startDate: Date;
    endDate?: Date;
    targetMetrics: ABTestMetric[];
    stratificationRules: StratificationRule[];
    statisticalConfig: StatisticalConfig;
    businessContext: {
        hypothesis: string;
        expectedImpact: number;
        successCriteria: string[];
        riskLevel: 'low' | 'medium' | 'high';
    };
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
}
export interface ABTestVariant {
    variantId: string;
    name: string;
    description: string;
    trafficWeight: number;
    isControl: boolean;
    configuration: Record<string, any>;
    expectedPerformance?: number;
}
export interface ABTestMetric {
    metricId: string;
    name: string;
    type: 'primary' | 'secondary' | 'guardrail';
    dataType: 'continuous' | 'binary' | 'count' | 'rate';
    aggregationMethod: 'mean' | 'median' | 'sum' | 'count' | 'rate' | 'percentile';
    targetDirection: 'increase' | 'decrease' | 'neutral';
    minimumDetectableEffect: number;
    statisticalPower: number;
    significanceLevel: number;
}
export interface StratificationRule {
    ruleId: string;
    name: string;
    field: string;
    operator: 'equals' | 'in' | 'range' | 'greater_than' | 'less_than';
    value: any;
    weight: number;
}
export interface StatisticalConfig {
    minimumSampleSize: number;
    maximumDuration: number;
    earlyStoppingEnabled: boolean;
    multipleTestingCorrection: 'none' | 'bonferroni' | 'holm' | 'fdr';
    confidenceLevel: number;
    powerAnalysis: {
        effect_size: number;
        alpha: number;
        power: number;
        two_tailed: boolean;
    };
}
export interface ABTestAssignment {
    assignmentId: string;
    testId: string;
    userId: string;
    documentId?: string;
    sessionId: string;
    variantId: string;
    variantName: string;
    isControl: boolean;
    assignedAt: Date;
    exposureLogged: boolean;
    stratificationData: Record<string, any>;
}
export interface ABTestResult {
    resultId: string;
    testId: string;
    assignmentId: string;
    userId: string;
    documentId?: string;
    variantId: string;
    metrics: Record<string, number>;
    metadata: Record<string, any>;
    recordedAt: Date;
    processed: boolean;
}
export interface ABTestAnalysis {
    analysisId: string;
    testId: string;
    analysisDate: Date;
    analysisType: 'interim' | 'final' | 'post_hoc';
    sampleSizes: Record<string, number>;
    metricResults: ABTestMetricResult[];
    overallResults: {
        recommendedAction: 'continue' | 'stop_for_winner' | 'stop_for_futility' | 'extend_duration';
        winningVariant?: string;
        confidence: number;
        businessImpact: number;
        riskAssessment: string;
    };
    statisticalSignificance: boolean;
    practicalSignificance: boolean;
    reportGenerated: boolean;
}
export interface ABTestMetricResult {
    metricId: string;
    metricName: string;
    results: Record<string, {
        value: number;
        confidence_interval: [number, number];
        sample_size: number;
        standard_error: number;
    }>;
    comparison: {
        control_variant: string;
        test_variants: Record<string, {
            lift: number;
            p_value: number;
            confidence_interval: [number, number];
            effect_size: number;
            practical_significance: boolean;
        }>;
    };
    statisticalTest: {
        test_type: string;
        test_statistic: number;
        p_value: number;
        degrees_of_freedom?: number;
    };
}
export interface ExperimentationConfig {
    defaultTrafficAllocation: number;
    defaultConfidenceLevel: number;
    defaultPower: number;
    defaultMinimumDetectableEffect: number;
    maxConcurrentTests: number;
    enableAutomaticDecisions: boolean;
    requireBusinessApproval: boolean;
    dataRetentionDays: number;
}
export declare class ABTestingService {
    private db;
    private logger;
    private config;
    private activeTests;
    private userAssignments;
    private readonly ANALYSIS_INTERVAL;
    private readonly DEFAULT_HASH_SEED;
    private analysisInterval?;
    constructor(db: Database.Database, logger: Logger, config?: Partial<ExperimentationConfig>);
    /**
     * Initialize the A/B testing service
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for A/B testing
     */
    private createABTestingTables;
    /**
     * Create a new A/B test
     */
    createABTest(name: string, description: string, testType: ABTest['testType'], variants: Omit<ABTestVariant, 'variantId'>[], targetMetrics: Omit<ABTestMetric, 'metricId'>[], options?: {
        trafficAllocation?: number;
        startDate?: Date;
        endDate?: Date;
        stratificationRules?: Omit<StratificationRule, 'ruleId'>[];
        businessContext?: Partial<ABTest['businessContext']>;
        createdBy?: string;
    }): Promise<string>;
    /**
     * Assign user to A/B test variant
     */
    assignToTest(documentId: string, userId: string, testType: ABTest['testType'], sessionId?: string): Promise<ABTestAssignment | null>;
    /**
     * Record A/B test result
     */
    recordResult(testId: string, documentId: string, variantId: string, metrics: Record<string, number>, metadata?: Record<string, any>): Promise<boolean>;
    /**
     * Analyze A/B test results
     */
    analyzeTest(testId: string, analysisType?: ABTestAnalysis['analysisType']): Promise<ABTestAnalysis>;
    /**
     * Start an A/B test
     */
    startTest(testId: string): Promise<boolean>;
    /**
     * Stop an A/B test
     */
    stopTest(testId: string, reason: string): Promise<boolean>;
    /**
     * Hash user for consistent assignment
     */
    private hashUser;
    /**
     * Select variant for user based on traffic weights
     */
    private selectVariant;
    /**
     * Check if user passes stratification rules
     */
    private passesStratification;
    /**
     * Get stratification data for user
     */
    private getStratificationData;
    /**
     * Calculate minimum sample size for test
     */
    private calculateMinimumSampleSize;
    /**
     * Analyze individual metric
     */
    private analyzeMetric;
    /**
     * Perform simplified t-test
     */
    private performTTest;
    /**
     * Determine overall test results
     */
    private determineOverallResults;
    /**
     * Start periodic analysis
     */
    private startPeriodicAnalysis;
    /**
     * Database operations
     */
    private storeABTest;
    private updateTest;
    private storeAssignment;
    private storeResult;
    private storeAnalysis;
    private updateAssignmentExposure;
    private findAssignmentByDocument;
    private getTestResults;
    private loadActiveTests;
    private loadUserAssignments;
    /**
     * Get A/B testing statistics
     */
    getABTestingStatistics(): Promise<{
        totalTests: number;
        runningTests: number;
        completedTests: number;
        totalAssignments: number;
        totalResults: number;
        averageTestDuration: number;
    }>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ABTestingService.d.ts.map