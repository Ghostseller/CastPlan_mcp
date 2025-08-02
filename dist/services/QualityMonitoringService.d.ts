/**
 * Quality Monitoring Service - Phase 4 Week 4
 *
 * CastPlan MCP Autonomous Quality Service - Real-time Quality Monitoring
 * Comprehensive quality monitoring system with real-time tracking, metrics collection,
 * and integration with existing quality infrastructure.
 *
 * Features:
 * - Real-time quality metrics collection and tracking (<500ms latency)
 * - Integration with existing quality assessment and analytics infrastructure
 * - Event-driven architecture for responsive monitoring
 * - Historical quality evolution tracking and trend analysis
 * - Quality threshold monitoring with configurable alerts
 * - Performance-optimized with in-memory caching and batched database operations
 *
 * Integration points:
 * - QualityServiceOrchestrator for comprehensive quality analysis
 * - QualityMetricsCollector for metrics aggregation and reporting
 * - HealthMonitor for system health integration
 * - PerformanceMonitoringService for performance correlation
 * - QualityAlertManager for alert coordination (implemented separately)
 *
 * Performance requirements:
 * - Real-time monitoring latency <500ms
 * - Quality metrics collection and processing <100ms
 * - Event emission and handling <50ms
 * - Database operations batched for efficiency
 *
 * Created: 2025-07-31
 * Author: DevOps Engineer & Quality Systems Specialist
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualityServiceOrchestrator } from './QualityServiceOrchestrator';
import { QualityMetricsCollector, QualityMetrics } from './QualityMetricsCollector';
import { QualityScore } from './QualityAssessmentEngine';
import { QualityIssue } from './QualityIssueDetector';
export interface QualityMonitoringConfig {
    /** Real-time monitoring interval in milliseconds */
    monitoringInterval: number;
    /** Quality metric collection batch size */
    metricsBatchSize: number;
    /** Maximum metrics history to keep in memory */
    maxHistorySize: number;
    /** Database cleanup interval in milliseconds */
    cleanupInterval: number;
    /** Enable real-time quality tracking */
    enableRealTimeTracking: boolean;
    /** Enable quality trend analysis */
    enableTrendAnalysis: boolean;
    /** Quality thresholds for monitoring */
    qualityThresholds: QualityThresholds;
    /** Performance optimization settings */
    performance: {
        enableCaching: boolean;
        cacheSize: number;
        batchInsertSize: number;
    };
}
export interface QualityThresholds {
    /** Overall quality score threshold (0-1) */
    overallQuality: {
        critical: number;
        warning: number;
        target: number;
    };
    /** Quality dimension thresholds */
    dimensions: {
        clarity: {
            critical: number;
            warning: number;
            target: number;
        };
        completeness: {
            critical: number;
            warning: number;
            target: number;
        };
        accuracy: {
            critical: number;
            warning: number;
            target: number;
        };
        relevance: {
            critical: number;
            warning: number;
            target: number;
        };
        consistency: {
            critical: number;
            warning: number;
            target: number;
        };
        structure: {
            critical: number;
            warning: number;
            target: number;
        };
    };
    /** Issue-based thresholds */
    issues: {
        criticalIssuesMax: number;
        highIssuesMax: number;
        totalIssuesMax: number;
        issueDensityMax: number;
    };
}
export interface QualityEvent {
    id: string;
    type: QualityEventType;
    timestamp: string;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    data: any;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
}
export declare enum QualityEventType {
    QUALITY_SCORE_UPDATED = "quality_score_updated",
    QUALITY_THRESHOLD_EXCEEDED = "quality_threshold_exceeded",
    QUALITY_IMPROVED = "quality_improved",
    QUALITY_DEGRADED = "quality_degraded",
    ISSUES_DETECTED = "issues_detected",
    ISSUES_RESOLVED = "issues_resolved",
    METRIC_COLLECTED = "metric_collected",
    TREND_DETECTED = "trend_detected",
    ANOMALY_DETECTED = "anomaly_detected",
    WORKFLOW_TRIGGERED = "workflow_triggered",
    WORKFLOW_COMPLETED = "workflow_completed",
    WORKFLOW_FAILED = "workflow_failed",
    TASK_SCHEDULED = "task_scheduled",
    TASK_STARTED = "task_started",
    TASK_COMPLETED = "task_completed",
    SYSTEM_OPTIMIZED = "system_optimized",
    LOAD_BALANCED = "load_balanced",
    AUTOMATION_THRESHOLD_TRIGGERED = "automation_threshold_triggered"
}
export interface QualityMonitoringStats {
    totalEntitiesMonitored: number;
    averageQualityScore: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    totalIssuesDetected: number;
    issuesResolvedToday: number;
    metricsCollectedToday: number;
    alertsTriggeredToday: number;
    monitoringUptime: number;
    performanceMetrics: {
        averageProcessingTime: number;
        eventsProcessedPerSecond: number;
        cacheHitRate: number;
    };
}
export interface RealTimeQualitySnapshot {
    timestamp: string;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    qualityScore: QualityScore;
    issues: QualityIssue[];
    metrics: QualityMetrics;
    trendDirection: 'up' | 'down' | 'stable';
    lastUpdated: string;
}
export declare class QualityMonitoringService extends EventEmitter {
    private logger;
    private db;
    private config;
    private qualityOrchestrator;
    private metricsCollector;
    private isMonitoring;
    private monitoringInterval?;
    private cleanupInterval?;
    private qualityCache;
    private metricsBuffer;
    private eventsBuffer;
    private startTime;
    private processedEvents;
    private cacheHits;
    private cacheMisses;
    constructor(database: Database.Database, logger: Logger, qualityOrchestrator: QualityServiceOrchestrator, metricsCollector: QualityMetricsCollector, config?: Partial<QualityMonitoringConfig>);
    private initializeDatabase;
    private setupEventListeners;
    startMonitoring(): Promise<void>;
    stopMonitoring(): Promise<void>;
    private performRealTimeMonitoring;
    private getEntitiesToMonitor;
    private monitorEntityQuality;
    private performQualityAnalysis;
    private determineEntityType;
    private createQualitySnapshot;
    private checkQualityThresholds;
    private checkDimensionThresholds;
    private checkIssueThresholds;
    private emitQualityEvent;
    private bufferSnapshot;
    private processBuffers;
    private flushBuffers;
    private flushMetricsBuffer;
    private flushEventsBuffer;
    private extractSnapshotsFromMetrics;
    private batchInsertSnapshots;
    private batchInsertEvents;
    private handleQualityAnalysisComplete;
    private handleQualityImprovementComplete;
    private handleMetricsCollected;
    private handleQualityReportGenerated;
    private updateMonitoringStatistics;
    private calculateMonitoringStatistics;
    private performCleanup;
    getQualitySnapshot(entityId: string): Promise<RealTimeQualitySnapshot | null>;
    getQualityEvents(entityId?: string, eventType?: QualityEventType, timeframe?: {
        start: string;
        end: string;
    }, limit?: number): Promise<QualityEvent[]>;
    getMonitoringStatistics(): Promise<QualityMonitoringStats>;
    updateConfiguration(newConfig: Partial<QualityMonitoringConfig>): void;
    getCacheStatistics(): {
        size: number;
        hitRate: number;
        hits: number;
        misses: number;
    };
    destroy(): Promise<void>;
}
export default QualityMonitoringService;
//# sourceMappingURL=QualityMonitoringService.d.ts.map