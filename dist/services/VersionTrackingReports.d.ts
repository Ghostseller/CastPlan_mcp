/**
 * Version Tracking Reports Service - Automated Report Generation
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Provides comprehensive automated report generation capabilities with
 * scheduled reporting, template management, and multi-format exports
 *
 * Created: 2025-07-31
 * Author: Business Intelligence Specialist & Report Automation Expert
 */
import { Logger } from 'winston';
import { ReportConfiguration, ReportTemplate, GeneratedReport, ReportSchedule, ReportDelivery, ReportFormat, ReportMetadata, CustomReportQuery, ReportSubscription, ReportArchive, ReportAudit } from '../types/reports.types';
import { VersionAnalyticsService } from './VersionAnalyticsService';
import { AnalyticsDashboard } from './AnalyticsDashboard';
/**
 * Advanced Version Tracking Reports Service
 *
 * Features:
 * - Automated report generation with flexible scheduling
 * - Multiple report formats (PDF, HTML, CSV, JSON, Excel)
 * - Template-based report creation with variable substitution
 * - Custom report queries and data aggregation
 * - Email delivery and file system exports
 * - Report subscription management
 * - Historical report archiving and retrieval
 * - Performance optimization with parallel processing
 * - Report audit trail and compliance tracking
 * - Integration with analytics dashboard and visualizations
 */
export declare class VersionTrackingReports {
    private logger;
    private analyticsService;
    private dashboardService;
    private reportTemplates;
    private activeSchedules;
    private reportSubscriptions;
    private reportArchive;
    private initialized;
    private config;
    private performanceMetrics;
    private generationQueue;
    private activeGenerations;
    constructor(logger: Logger, analyticsService: VersionAnalyticsService, dashboardService: AnalyticsDashboard, config?: Partial<{
        reportsDirectory: string;
        templatesDirectory: string;
        archiveDirectory: string;
        maxReportSize: number;
        maxReportsPerDay: number;
        reportRetentionDays: number;
        enableScheduling: boolean;
        enableDelivery: boolean;
        enableArchiving: boolean;
        concurrentReports: number;
    }>);
    initialize(): Promise<void>;
    /**
     * Generate a comprehensive report based on configuration
     * Supports multiple data sources, formats, and customizations
     *
     * Performance Target: <10 seconds for standard reports
     */
    generateReport(config: ReportConfiguration, options?: {
        priority?: 'low' | 'normal' | 'high';
        async?: boolean;
        deliveryOptions?: ReportDelivery;
        metadata?: ReportMetadata;
    }): Promise<GeneratedReport>;
    /**
     * Generate report from template with variable substitution
     * Provides flexible templating with custom data binding
     */
    generateReportFromTemplate(templateId: string, variables?: Record<string, any>, options?: {
        format?: ReportFormat;
        deliveryOptions?: ReportDelivery;
        customizations?: any;
    }): Promise<GeneratedReport>;
    /**
     * Generate custom analytics report with advanced queries
     * Supports complex data aggregation and custom visualizations
     */
    generateCustomReport(query: CustomReportQuery, format?: ReportFormat, options?: {
        title?: string;
        description?: string;
        includeVisualizations?: boolean;
        deliveryOptions?: ReportDelivery;
    }): Promise<GeneratedReport>;
    /**
     * Create a new report template
     * Templates enable reusable report configurations with variable substitution
     */
    createReportTemplate(template: ReportTemplate): Promise<string>;
    /**
     * Update existing report template
     */
    updateReportTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<void>;
    /**
     * Get all available report templates
     */
    getReportTemplates(): ReportTemplate[];
    /**
     * Get specific report template by ID
     */
    getReportTemplate(templateId: string): ReportTemplate | null;
    /**
     * Schedule automatic report generation
     * Supports cron-like scheduling with flexible delivery options
     */
    scheduleReport(schedule: ReportSchedule): Promise<string>;
    /**
     * Update existing report schedule
     */
    updateReportSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<void>;
    /**
     * Get all active report schedules
     */
    getReportSchedules(): ReportSchedule[];
    /**
     * Cancel a scheduled report
     */
    cancelReportSchedule(scheduleId: string): Promise<void>;
    /**
     * Subscribe users to specific reports
     * Enables automatic delivery of reports to users
     */
    subscribeToReport(reportType: string, subscription: ReportSubscription): Promise<string>;
    /**
     * Unsubscribe from reports
     */
    unsubscribeFromReport(reportType: string, subscriptionId: string): Promise<void>;
    /**
     * Archive generated reports for long-term storage
     * Includes compression and metadata indexing
     */
    archiveReport(reportId: string, archiveOptions?: {
        compress?: boolean;
        metadata?: any;
        retentionPeriod?: number;
    }): Promise<void>;
    /**
     * Retrieve archived reports
     */
    getArchivedReports(filters?: {
        dateRange?: {
            start: string;
            end: string;
        };
        reportType?: string;
        userId?: string;
    }): Promise<ReportArchive[]>;
    /**
     * Get report generation performance metrics
     */
    getPerformanceMetrics(): any;
    /**
     * Get detailed report audit trail
     */
    getReportAudit(filters?: {
        reportId?: string;
        userId?: string;
        dateRange?: {
            start: string;
            end: string;
        };
        action?: string;
    }): Promise<ReportAudit[]>;
    private createDirectories;
    private loadReportTemplates;
    private loadScheduledReports;
    private loadReportSubscriptions;
    private startScheduledReporting;
    private processScheduledReports;
    private executeScheduledReport;
    private executeReportGeneration;
    private gatherReportData;
    private generateReportContent;
    private generateSectionContent;
    private generateSectionAnalysis;
    private generateReportVisualizations;
    private formatReport;
    private generateHTMLReport;
    private formatSectionDataAsHTML;
    private generatePDFReport;
    private generateCSVReport;
    private formatObjectAsCSV;
    private generateExcelReport;
    private saveGeneratedReport;
    private saveReportTemplate;
    private saveReportSchedule;
    private saveReportSubscriptions;
    private validateReportConfiguration;
    private validateReportTemplate;
    private validateReportSchedule;
    private validateCustomQuery;
    private calculateNextRunTime;
    private incrementVersion;
    private createConfigurationFromTemplate;
    private calculateQueryComplexity;
    private executeCustomQuery;
    private executeAggregationQuery;
    private executeTimeSeriesQuery;
    private executeComparisonQuery;
    private createSectionsFromQueryResults;
    private queueReportGeneration;
    private processGenerationQueue;
    private deliverReport;
    private notifySubscribers;
    private recordGenerationMetric;
    private ensureInitialized;
    shutdown(): Promise<void>;
}
export default VersionTrackingReports;
//# sourceMappingURL=VersionTrackingReports.d.ts.map