/**
 * Reports Types - Comprehensive Type Definitions for Report Generation
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for automated report generation, templates, and scheduling
 *
 * Created: 2025-07-31
 * Author: Business Intelligence Specialist & Reports Architect
 */
import { AnalyticsTimeframe, FilterConfiguration } from './analytics.types';
export type ReportType = 'summary' | 'detailed' | 'executive' | 'technical' | 'compliance' | 'performance' | 'trend_analysis' | 'custom';
export type ReportFormat = 'pdf' | 'html' | 'csv' | 'json' | 'excel' | 'docx' | 'pptx';
export type ReportStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled' | 'archived';
export type ReportFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export interface ReportConfiguration {
    id: string;
    type: ReportType;
    title: string;
    description?: string;
    format: ReportFormat;
    sections: ReportSection[];
    dataSources: ReportDataSource[];
    filters: FilterConfiguration[];
    timeframe: AnalyticsTimeframe;
    includeVisualizations: boolean;
    includeRawData?: boolean;
    includeMetadata?: boolean;
    customStyling?: ReportStyling;
    parameters?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
}
export interface ReportSection {
    id: string;
    title: string;
    type: 'summary' | 'chart' | 'table' | 'text' | 'metrics' | 'analysis' | 'data_table' | 'image' | 'custom';
    dataSource?: string;
    configuration?: {
        chartType?: string;
        showHeaders?: boolean;
        maxRows?: number;
        aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
        groupBy?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        [key: string]: any;
    };
    content?: string;
    order: number;
    conditional?: {
        field: string;
        operator: string;
        value: any;
    };
}
export interface ReportDataSource {
    type: 'evolution_trends' | 'change_patterns' | 'impact_metrics' | 'quality_evolution' | 'usage_analytics' | 'predictive_analysis' | 'integration_health' | 'performance_metrics' | 'custom_query';
    documentId?: string;
    query?: CustomReportQuery;
    parameters?: Record<string, any>;
    caching?: {
        enabled: boolean;
        ttl: number;
    };
}
export interface ReportStyling {
    theme: 'light' | 'dark' | 'corporate' | 'minimal';
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    fontSize?: {
        title: number;
        heading: number;
        body: number;
        caption: number;
    };
    margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    spacing?: {
        section: number;
        paragraph: number;
    };
    logo?: {
        url: string;
        width: number;
        height: number;
        position: 'header' | 'footer' | 'watermark';
    };
    customCSS?: string;
}
export interface GeneratedReport {
    id: string;
    configurationId?: string;
    title: string;
    format: ReportFormat;
    content: string | Buffer;
    size: number;
    status: ReportStatus;
    generatedAt: string;
    generationTime?: number;
    expiresAt?: string;
    downloadUrl?: string;
    metadata?: ReportMetadata;
    error?: ReportError;
    queuedAt?: string;
    startedAt?: string;
    completedAt?: string;
    message?: string;
}
export interface ReportMetadata {
    templateId?: string;
    templateVersion?: string;
    scheduleId?: string;
    scheduledExecution?: boolean;
    executedAt?: string;
    variables?: Record<string, any>;
    dataSourcesUsed?: string[];
    filtersApplied?: number;
    sectionsIncluded?: number;
    visualizationsIncluded?: number;
    recordsProcessed?: number;
    queryComplexity?: number;
    generatedBy?: string;
    userId?: string;
    tags?: string[];
    version?: string;
}
export interface ReportTemplate {
    id?: string;
    name: string;
    description: string;
    category: string;
    configuration: ReportConfiguration;
    variables: TemplateVariable[];
    preview?: {
        imageUrl: string;
        description: string;
    };
    tags: string[];
    isPublic: boolean;
    author: string;
    version: string;
    createdAt?: string;
    updatedAt?: string;
    usageCount?: number;
    rating?: number;
    reviews?: TemplateReview[];
}
export interface TemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    label: string;
    description?: string;
    defaultValue?: any;
    required: boolean;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        options?: any[];
    };
    group?: string;
}
export interface TemplateReview {
    userId: string;
    rating: number;
    comment?: string;
    createdAt: string;
}
export interface ReportSchedule {
    id?: string;
    name: string;
    description?: string;
    reportConfiguration: ReportConfiguration;
    frequency: ReportFrequency;
    cronExpression?: string;
    timezone: string;
    startDate?: string;
    endDate?: string;
    nextRunAt?: string;
    lastRunAt?: string;
    deliveryOptions?: ReportDelivery;
    parameters?: Record<string, any>;
    isActive: boolean;
    createdBy: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ReportDelivery {
    method: 'email' | 'file_system' | 'ftp' | 'sftp' | 's3' | 'webhook' | 'api';
    recipients?: string[];
    subject?: string;
    message?: string;
    attachmentName?: string;
    destination?: {
        path?: string;
        bucket?: string;
        url?: string;
        credentials?: Record<string, any>;
    };
    options?: {
        compress?: boolean;
        encrypt?: boolean;
        splitLargeFiles?: boolean;
        maxFileSize?: number;
        retries?: number;
        timeout?: number;
    };
}
export interface CustomReportQuery {
    type: 'aggregation' | 'time_series' | 'comparison' | 'correlation' | 'statistical';
    parameters: Record<string, any>;
    filters?: FilterConfiguration[];
    timeframe?: AnalyticsTimeframe;
    aggregations?: QueryAggregation[];
    groupBy?: string[];
    orderBy?: QuerySort[];
    limit?: number;
    offset?: number;
    joins?: QueryJoin[];
    calculations?: QueryCalculation[];
}
export interface QueryAggregation {
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'stddev' | 'variance';
    alias?: string;
}
export interface QuerySort {
    field: string;
    direction: 'asc' | 'desc';
    nullsFirst?: boolean;
}
export interface QueryJoin {
    type: 'inner' | 'left' | 'right' | 'full';
    table: string;
    on: string;
    alias?: string;
}
export interface QueryCalculation {
    expression: string;
    alias: string;
    type: 'numeric' | 'string' | 'date' | 'boolean';
}
export interface ReportSubscription {
    id?: string;
    userId: string;
    reportType: string;
    deliveryOptions: ReportDelivery;
    filters?: FilterConfiguration[];
    frequency?: ReportFrequency;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
export interface ReportNotification {
    id: string;
    subscriptionId: string;
    reportId: string;
    type: 'generated' | 'failed' | 'delivered' | 'scheduled';
    message: string;
    sentAt: string;
    status: 'sent' | 'failed' | 'pending';
    channel: 'email' | 'sms' | 'push' | 'webhook';
    metadata?: Record<string, any>;
}
export interface ReportArchive {
    id: string;
    originalReportId: string;
    archivedAt: string;
    retentionUntil: string;
    compressed: boolean;
    size: number;
    storageLocation?: string;
    metadata: Record<string, any>;
}
export interface ReportAudit {
    id: string;
    reportId: string;
    action: 'generated' | 'viewed' | 'downloaded' | 'shared' | 'deleted' | 'archived';
    userId: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
}
export interface ReportAlert {
    id: string;
    reportId: string;
    type: 'generation_failed' | 'delivery_failed' | 'threshold_exceeded' | 'data_anomaly';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    details?: Record<string, any>;
    triggeredAt: string;
    resolvedAt?: string;
    notificationsSent: string[];
}
export interface ReportPerformanceMetrics {
    reportsGenerated: number;
    averageGenerationTime: number;
    failureRate: number;
    totalDataProcessed: number;
    lastGenerationTime: number;
    activeGenerations: number;
    queuedReports: number;
    templates: number;
    schedules: number;
    archivedReports: number;
}
export interface ReportQualityMetrics {
    dataAccuracy: number;
    completeness: number;
    timeliness: number;
    consistency: number;
    relevance: number;
    usability: number;
}
export declare class ReportError extends Error {
    readonly code: string;
    readonly timestamp: string;
    readonly details?: any;
    constructor(message: string, code: string, details?: any);
}
export interface ReportService {
    generateReport(config: ReportConfiguration, options?: any): Promise<GeneratedReport>;
    generateReportFromTemplate(templateId: string, variables?: Record<string, any>, options?: any): Promise<GeneratedReport>;
    generateCustomReport(query: CustomReportQuery, format?: ReportFormat, options?: any): Promise<GeneratedReport>;
    createReportTemplate(template: ReportTemplate): Promise<string>;
    updateReportTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<void>;
    getReportTemplates(): ReportTemplate[];
    getReportTemplate(templateId: string): ReportTemplate | null;
    scheduleReport(schedule: ReportSchedule): Promise<string>;
    updateReportSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<void>;
    getReportSchedules(): ReportSchedule[];
    cancelReportSchedule(scheduleId: string): Promise<void>;
    subscribeToReport(reportType: string, subscription: ReportSubscription): Promise<string>;
    unsubscribeFromReport(reportType: string, subscriptionId: string): Promise<void>;
    archiveReport(reportId: string, options?: any): Promise<void>;
    getArchivedReports(filters?: any): Promise<ReportArchive[]>;
    getPerformanceMetrics(): ReportPerformanceMetrics;
    getReportAudit(filters?: any): Promise<ReportAudit[]>;
}
export default ReportService;
//# sourceMappingURL=reports.types.d.ts.map