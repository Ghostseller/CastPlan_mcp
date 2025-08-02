/**
 * Quality Automation Test Suite - Phase 4 Week 5
 *
 * CastPlan MCP Autonomous Quality Service - Comprehensive Testing and Validation
 * Tests all automated workflow components and validates performance targets
 *
 * Test Coverage:
 * - End-to-end workflow automation testing
 * - Performance target validation and benchmarking
 * - Load testing and auto-scaling validation
 * - Error handling and rollback mechanism testing
 * - Integration testing across all Week 5 components
 *
 * Created: 2025-07-31
 * Author: QA Engineer & Performance Specialist
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { AutomatedQualityWorkflow } from './AutomatedQualityWorkflow';
import { QualityWorkflowOrchestrator } from './QualityWorkflowOrchestrator';
import { QualitySystemOptimizer } from './QualitySystemOptimizer';
import { QualityLoadBalancer } from './QualityLoadBalancer';
import { QualityWorkflowScheduler } from './QualityWorkflowScheduler';
import { QualityPerformanceValidator } from './QualityPerformanceValidator';
export interface TestResult {
    testId: string;
    testName: string;
    category: 'integration' | 'performance' | 'load' | 'error_handling' | 'automation';
    status: 'passed' | 'failed' | 'skipped' | 'error';
    duration: number;
    details: {
        expected: any;
        actual: any;
        metrics?: Record<string, number>;
        errors?: string[];
        recommendations?: string[];
    };
    timestamp: Date;
}
export interface TestSuiteReport {
    suiteId: string;
    timestamp: Date;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    overallDuration: number;
    results: TestResult[];
    performanceValidation: any;
    recommendations: string[];
    criticalIssues: string[];
}
export interface LoadTestConfig {
    concurrentWorkflows: number;
    duration: number;
    rampUpTime: number;
    targetThroughput: number;
    stressTestMultiplier: number;
}
export declare class QualityAutomationTestSuite extends EventEmitter {
    private db;
    private logger;
    private workflow;
    private orchestrator;
    private optimizer;
    private loadBalancer;
    private scheduler;
    private validator;
    private testResults;
    private isRunning;
    constructor(database: Database.Database, logger: Logger, workflow: AutomatedQualityWorkflow, orchestrator: QualityWorkflowOrchestrator, optimizer: QualitySystemOptimizer, loadBalancer: QualityLoadBalancer, scheduler: QualityWorkflowScheduler, validator: QualityPerformanceValidator);
    private initializeDatabase;
    /**
     * Run comprehensive test suite for all Week 5 automation components
     */
    runFullTestSuite(): Promise<TestSuiteReport>;
    /**
     * Test integration between all Week 5 components
     */
    private runIntegrationTests;
    /**
     * Test performance targets and optimization
     */
    private runPerformanceTests;
    /**
     * Test system behavior under load
     */
    private runLoadTests;
    /**
     * Test error handling and rollback mechanisms
     */
    private runErrorHandlingTests;
    /**
     * Test automation validation and success rates
     */
    private runAutomationValidationTests;
    /**
     * Helper method to run individual tests
     */
    private runTest;
    /**
     * Compare test results to determine pass/fail
     */
    private compareTestResults;
    /**
     * Wait for workflow completion with timeout
     */
    private waitForWorkflowCompletion;
    /**
     * Generate comprehensive test report
     */
    private generateTestReport;
    /**
     * Store test result in database
     */
    private storeTestResult;
    /**
     * Store test report in database
     */
    private storeTestReport;
    /**
     * Get test execution status
     */
    isRunning(): boolean;
    /**
     * Get latest test results
     */
    getLatestResults(): TestResult[];
}
export default QualityAutomationTestSuite;
//# sourceMappingURL=QualityAutomationTestSuite.d.ts.map