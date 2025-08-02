/**
 * QualityMonitoringIntegration - Integration layer for quality monitoring system
 * Phase 4 Week 4 - Quality Monitoring and Alert System Integration
 *
 * Integrates QualityMonitoringService, QualityAlertManager, QualityAnomalyDetector,
 * QualityDashboardService, and QualityReportingService with existing HealthMonitor
 * and PerformanceMonitoringService for comprehensive monitoring
 *
 * Features:
 * - Seamless integration with existing monitoring infrastructure
 * - Cross-system event correlation and alerting
 * - Unified monitoring dashboard with performance and quality metrics
 * - Automated quality-performance correlation analysis
 * - Integrated reporting with performance and health metrics
 */
import { EventEmitter } from 'events';
import winston from 'winston';
import { HealthMonitor, HealthStatus } from '../utils/HealthMonitor';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';
import { QualityMonitoringConfig } from './QualityMonitoringService';
import { QualityAlertConfig } from './QualityAlertManager';
import { QualityAnomalyDetectorConfig } from './QualityAnomalyDetector';
import { QualityDashboardConfig } from './QualityDashboardService';
import { QualityReportingServiceConfig } from './QualityReportingService';
/**
 * Integration configuration interface
 */
export interface QualityMonitoringIntegrationConfig {
    enabled: boolean;
    correlationEnabled: boolean;
    healthIntegration: {
        enabled: boolean;
        qualityHealthThreshold: number;
        degradedThreshold: number;
        unhealthyThreshold: number;
        autoRemediation: boolean;
    };
    performanceIntegration: {
        enabled: boolean;
        performanceQualityCorrelation: boolean;
        slowQueryQualityImpact: boolean;
        resourceUsageQualityThreshold: number;
    };
    alertIntegration: {
        enabled: boolean;
        crossSystemAlerts: boolean;
        alertCorrelation: boolean;
        escalationEnabled: boolean;
    };
    dashboardIntegration: {
        enabled: boolean;
        unifiedDashboard: boolean;
        realTimeSync: boolean;
        performanceWidgets: boolean;
        healthWidgets: boolean;
    };
    reportingIntegration: {
        enabled: boolean;
        combinedReports: boolean;
        performanceQualityAnalysis: boolean;
        healthQualityAnalysis: boolean;
    };
}
/**
 * Correlation analysis result interface
 */
export interface CorrelationAnalysis {
    id: string;
    timestamp: Date;
    correlationType: 'performance-quality' | 'health-quality' | 'alert-correlation';
    correlationScore: number;
    primaryMetric: {
        type: 'performance' | 'health' | 'quality';
        value: number;
        source: string;
    };
    secondaryMetric: {
        type: 'performance' | 'health' | 'quality';
        value: number;
        source: string;
    };
    analysis: {
        pattern: 'positive' | 'negative' | 'no_correlation';
        strength: 'weak' | 'moderate' | 'strong';
        confidence: number;
        insights: string[];
        recommendations: string[];
    };
}
/**
 * Unified monitoring status interface
 */
export interface UnifiedMonitoringStatus {
    timestamp: Date;
    overall: {
        status: HealthStatus;
        qualityScore: number;
        performanceScore: number;
        healthScore: number;
    };
    quality: {
        averageScore: number;
        totalMetrics: number;
        criticalIssues: number;
        trend: 'improving' | 'stable' | 'declining';
    };
    performance: {
        averageResponseTime: number;
        errorRate: number;
        throughput: number;
        resourceUsage: number;
    };
    health: {
        servicesHealthy: number;
        servicesTotal: number;
        systemHealth: HealthStatus;
        uptime: number;
    };
    alerts: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
    };
    correlations: CorrelationAnalysis[];
}
/**
 * Quality Monitoring Integration Service
 */
export declare class QualityMonitoringIntegration extends EventEmitter {
    private db;
    private logger;
    private config;
    private healthMonitor?;
    private performanceService?;
    private qualityService?;
    private alertManager?;
    private anomalyDetector?;
    private dashboardService?;
    private reportingService?;
    private correlationCache;
    private correlationInterval?;
    private unifiedStatus?;
    private isRunning;
    constructor(config: QualityMonitoringIntegrationConfig, logger: winston.Logger, options?: {
        healthMonitor?: HealthMonitor;
        performanceService?: PerformanceMonitoringService;
        qualityConfig?: QualityMonitoringConfig;
        alertConfig?: QualityAlertConfig;
        anomalyConfig?: QualityAnomalyDetectorConfig;
        dashboardConfig?: QualityDashboardConfig;
        reportingConfig?: QualityReportingServiceConfig;
    });
    /**
     * Initialize all monitoring services
     */
    private initializeServices;
    /**
     * Initialize database tables for integration
     */
    private initializeDatabase;
    /**
     * Start the integration service
     */
    start(): Promise<void>;
    /**
     * Set up event listeners for cross-system integration
     */
    private setupEventListeners;
    /**
     * Handle health status changes
     */
    private handleHealthStatusChange;
    /**
     * Handle performance metrics
     */
    private handlePerformanceMetric;
    /**
     * Handle quality metrics
     */
    private handleQualityMetric;
    /**
     * Start correlation analysis
     */
    private startCorrelationAnalysis;
    /**
     * Perform comprehensive correlation analysis
     */
    private performCorrelationAnalysis;
    /**
     * Analyze performance-quality correlation
     */
    private analyzePerformanceQualityCorrelation;
    /**
     * Analyze health-quality correlation
     */
    private analyzeHealthQualityCorrelation;
    /**
     * Analyze alert correlation
     */
    private analyzeAlertCorrelation;
    /**
     * Start unified status monitoring
     */
    private startUnifiedStatusMonitoring;
    /**
     * Update unified monitoring status
     */
    private updateUnifiedStatus;
    /**
     * Store correlation analysis in database
     */
    private storeCorrelation;
    /**
     * Store unified status in database
     */
    private storeUnifiedStatus;
    /**
     * Helper methods for calculations and mapping
     */
    private calculateHealthScore;
    private mapHealthStatusToSeverity;
    private calculatePerformanceQualityScore;
    private mapQualityToHealthStatus;
    private createQualityBasedHealthCheck;
    private calculateCorrelationCoefficient;
    private analyzeCorrelationPattern;
    private analyzeHealthQualityPattern;
    private calculateOverallHealthScore;
    private getQualityStatus;
    private getPerformanceStatus;
    private getHealthStatus;
    private getAlertSummary;
    private calculateOverallStatus;
    private handleHealthAlert;
    private handleOverallHealthChange;
    private handlePerformanceAlert;
    private handleResourceMetrics;
    private handleQualityThresholdEvent;
    private handleQualityAlert;
    private handleQualityAlertResolved;
    private handleAnomalyDetected;
    /**
     * Public API methods
     */
    /**
     * Get current unified status
     */
    getUnifiedStatus(): UnifiedMonitoringStatus | null;
    /**
     * Get correlation history
     */
    getCorrelationHistory(limit?: number): CorrelationAnalysis[];
    /**
     * Stop the integration service
     */
    stop(): Promise<void>;
    /**
     * Get integration status and metrics
     */
    getIntegrationStatus(): any;
}
/**
 * Default integration configuration
 */
export declare const defaultIntegrationConfig: QualityMonitoringIntegrationConfig;
//# sourceMappingURL=QualityMonitoringIntegration.d.ts.map