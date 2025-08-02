/**
 * Integration Validation Service - Comprehensive Integration Testing and Validation
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Validates integration with CastPlan MCP tools and ensures all services work together
 *
 * Created: 2025-07-31
 * Author: Integration Engineer & System Validation Specialist
 */
import winston from 'winston';
import { EventEmitter } from 'events';
export interface ValidationResult {
    service: string;
    component: string;
    status: 'passed' | 'failed' | 'warning' | 'skipped';
    message: string;
    duration: number;
    timestamp: string;
    details?: Record<string, any>;
    error?: string;
}
export interface IntegrationTestSuite {
    id: string;
    name: string;
    description: string;
    tests: IntegrationTest[];
    dependencies: string[];
    timeout: number;
    retries: number;
    critical: boolean;
}
export interface IntegrationTest {
    id: string;
    name: string;
    description: string;
    category: 'connectivity' | 'functionality' | 'performance' | 'data_integrity' | 'error_handling';
    timeout: number;
    retries: number;
    testFunction: () => Promise<ValidationResult>;
    prerequisites: string[];
    cleanup?: () => Promise<void>;
}
export interface ValidationReport {
    id: string;
    timestamp: string;
    duration: number;
    summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
        skipped: number;
        successRate: number;
    };
    results: ValidationResult[];
    recommendations: string[];
    criticalIssues: string[];
    performanceMetrics: {
        averageResponseTime: number;
        slowestTest: ValidationResult;
        fastestTest: ValidationResult;
    };
    environmentInfo: {
        version: string;
        platform: string;
        nodeVersion: string;
        databaseVersion: string;
    };
}
export declare class IntegrationValidationService extends EventEmitter {
    private logger;
    private database;
    private databasePath;
    private services;
    private testSuites;
    private validationHistory;
    private isInitialized;
    constructor(databasePath: string, logger: winston.Logger);
    private initializeTables;
    initialize(): Promise<void>;
    private initializeServices;
    private setupTestSuites;
    runValidation(suiteIds?: string[]): Promise<ValidationReport>;
    private runTestSuite;
    private runSingleTest;
    private testAnalyticsInitialization;
    private testDashboardCreation;
    private testReportGeneration;
    private testCrossServiceDataFlow;
    private testPerformanceMonitoring;
    private testDatabaseOptimization;
    private testBenchmarkingService;
    private testEnhancedVersionService;
    private testServiceFailureRecovery;
    private testInvalidDataHandling;
    private testConcurrentAccess;
    private sortSuitesByDependencies;
    private generateValidationReport;
    private generateRecommendations;
    private storeValidationResult;
    private storeValidationReport;
    getValidationHistory(): ValidationReport[];
    getValidationReport(reportId: string): Promise<ValidationReport | null>;
    getValidationResults(filters?: {
        service?: string;
        status?: string;
        limit?: number;
    }): Promise<ValidationResult[]>;
    private ensureInitialized;
    destroy(): Promise<void>;
}
export default IntegrationValidationService;
//# sourceMappingURL=IntegrationValidationService.d.ts.map