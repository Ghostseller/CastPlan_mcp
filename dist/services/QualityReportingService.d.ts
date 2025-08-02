import { EventEmitter } from 'events';
/**
 * QualityReportingService - Automated reporting and notifications for quality metrics
 * Phase 4 Week 4 - Quality Monitoring and Alert System
 *
 * Features:
 * - Automated quality reports with configurable schedules
 * - Multiple report formats (PDF, HTML, JSON, CSV)
 * - Email delivery with attachments
 * - Trend analysis and recommendations
 * - Executive summaries and detailed technical reports
 * - Performance requirements: <2s report generation, <10s delivery
 */
export interface QualityReportConfig {
    id: string;
    name: string;
    description: string;
    schedule: ReportSchedule;
    format: ReportFormat;
    recipients: string[];
    includeCharts: boolean;
    includeTrends: boolean;
    includeRecommendations: boolean;
    filterCriteria: ReportFilterCriteria;
    customMetrics?: string[];
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReportSchedule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on-demand';
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
    nextRun?: Date;
}
export interface ReportFilterCriteria {
    dateRange: {
        start?: Date;
        end?: Date;
        relativePeriod?: 'last24h' | 'last7d' | 'last30d' | 'last90d';
    };
    services?: string[];
    qualityTypes?: string[];
    severityLevels?: ('low' | 'medium' | 'high' | 'critical')[];
    minScore?: number;
    maxScore?: number;
}
export type ReportFormat = 'pdf' | 'html' | 'json' | 'csv' | 'xlsx';
export interface QualityReport {
    id: string;
    configId: string;
    name: string;
    format: ReportFormat;
    generatedAt: Date;
    period: {
        start: Date;
        end: Date;
    };
    summary: QualityReportSummary;
    sections: ReportSection[];
    attachments?: ReportAttachment[];
    status: 'generating' | 'completed' | 'failed';
    filePath?: string;
    fileSize?: number;
    generationTimeMs: number;
}
export interface QualityReportSummary {
    totalMetrics: number;
    averageQualityScore: number;
    scoreChange: number;
    totalIssues: number;
    criticalIssues: number;
    resolvedIssues: number;
    topServices: Array<{
        serviceName: string;
        averageScore: number;
        issueCount: number;
    }>;
    qualityTrend: 'improving' | 'stable' | 'declining';
    keyInsights: string[];
    recommendations: string[];
}
export interface ReportSection {
    title: string;
    type: 'overview' | 'metrics' | 'trends' | 'issues' | 'recommendations' | 'charts';
    data: any;
    order: number;
}
export interface ReportAttachment {
    name: string;
    type: string;
    content: Buffer | string;
    mimeType: string;
}
export interface ReportDeliveryConfig {
    method: 'email' | 'webhook' | 'file' | 'dashboard';
    emailConfig?: {
        smtpHost: string;
        smtpPort: number;
        secure: boolean;
        username: string;
        password: string;
        fromAddress: string;
    };
    webhookConfig?: {
        url: string;
        headers: Record<string, string>;
        authentication?: {
            type: 'bearer' | 'basic' | 'api-key';
            credentials: string;
        };
    };
    fileConfig?: {
        directory: string;
        archiveAfterDays?: number;
    };
}
export interface QualityReportingServiceConfig {
    enabledReports: boolean;
    maxConcurrentReports: number;
    reportRetentionDays: number;
    defaultTimezone: string;
    cacheReportsEnabled: boolean;
    cacheRetentionMinutes: number;
    delivery: ReportDeliveryConfig;
    performance: {
        maxGenerationTimeMs: number;
        maxDeliveryTimeMs: number;
        batchSize: number;
    };
}
/**
 * QualityReportingService - Comprehensive automated reporting system
 */
export declare class QualityReportingService extends EventEmitter {
    private db;
    private config;
    private reportCache;
    private scheduleIntervals;
    private generationQueue;
    private isProcessingQueue;
    constructor(config: QualityReportingServiceConfig);
    /**
     * Initialize database tables for quality reporting
     */
    private initializeDatabase;
    /**
     * Create a new report configuration
     */
    createReportConfig(config: Omit<QualityReportConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualityReportConfig>;
    /**
     * Generate a quality report based on configuration
     */
    generateReport(configId: string, adhoc?: boolean): Promise<QualityReport>;
    /**
     * Generate report summary with key metrics and insights
     */
    private generateReportSummary;
    /**
     * Generate key insights from metrics analysis
     */
    private generateKeyInsights;
    /**
     * Generate recommendations based on analysis
     */
    private generateRecommendations;
    /**
     * Generate report sections based on configuration
     */
    private generateReportSections;
    /**
     * Generate metrics data for report section
     */
    private generateMetricsData;
    /**
     * Generate trends data for report section
     */
    private generateTrendsData;
    /**
     * Analyze trends in the data
     */
    private analyzeTrends;
    /**
     * Generate issues data for report section
     */
    private generateIssuesData;
    /**
     * Generate recommendations data for report section
     */
    private generateRecommendationsData;
    /**
     * Generate report content based on format
     */
    private generateReportContent;
    /**
     * Generate JSON format report
     */
    private generateJSONReport;
    /**
     * Generate HTML format report
     */
    private generateHTMLReport;
    /**
     * Generate HTML content for a report section
     */
    private generateHTMLSectionContent;
    /**
     * Generate CSV format report
     */
    private generateCSVReport;
    /**
     * Generate PDF format report (placeholder - would need PDF library)
     */
    private generatePDFReport;
    /**
     * Deliver report to configured recipients
     */
    private deliverReport;
    /**
     * Deliver report to a specific recipient
     */
    private deliverToRecipient;
    /**
     * Log delivery attempt
     */
    private logDelivery;
    /**
     * Start report scheduler
     */
    private startScheduler;
    /**
     * Check for reports that need to be generated
     */
    private checkScheduledReports;
    /**
     * Process the report generation queue
     */
    private processGenerationQueue;
    /**
     * Calculate next run time for a schedule
     */
    private calculateNextRun;
    /**
     * Calculate report period based on date range configuration
     */
    private calculateReportPeriod;
    /**
     * Get report configuration by ID
     */
    private getReportConfig;
    /**
     * Insert report record into database
     */
    private insertReportRecord;
    /**
     * Update report status in database
     */
    private updateReportStatus;
    /**
     * Schedule a specific report configuration
     */
    private scheduleReport;
    /**
     * Get report by ID
     */
    getReport(reportId: string): Promise<QualityReport | null>;
    /**
     * List all report configurations
     */
    listReportConfigs(): Promise<QualityReportConfig[]>;
    /**
     * Clean up old reports based on retention policy
     */
    cleanupOldReports(): Promise<number>;
    /**
     * Get service performance metrics and status
     */
    getServiceMetrics(): any;
    /**
     * Shutdown service gracefully
     */
    shutdown(): Promise<void>;
}
/**
 * Default configuration for QualityReportingService
 */
export declare const defaultQualityReportingConfig: QualityReportingServiceConfig;
//# sourceMappingURL=QualityReportingService.d.ts.map