/**
 * Quality Dashboard Service - Phase 4 Week 4
 *
 * CastPlan MCP Autonomous Quality Service - Interactive Dashboard
 * Visual monitoring and reporting integration for quality monitoring system
 * with real-time updates, interactive charts, and comprehensive analytics.
 *
 * Features:
 * - Real-time quality metrics visualization
 * - Interactive charts and graphs (time series, heatmaps, distributions)
 * - Customizable dashboard layouts and widgets
 * - Quality alerts and notifications integration
 * - Trend analysis and forecasting visualizations
 * - Anomaly detection overlays and highlighting
 * - Export capabilities (PDF, PNG, CSV, JSON)
 * - Multi-user dashboard sharing and collaboration
 * - Dashboard refresh rate <5 seconds (performance requirement)
 *
 * Dashboard Components:
 * - Quality Score Overview (gauge charts, trend lines)
 * - Dimension Analysis (radar charts, bar charts)
 * - Issue Tracking (pie charts, priority matrices)
 * - Anomaly Detection (scatter plots, alert panels)
 * - Trend Analysis (time series, seasonal decomposition)
 * - Entity Comparison (multi-line charts, heatmaps)
 * - Performance Metrics (KPI cards, progress bars)
 *
 * Integration points:
 * - QualityMonitoringService for real-time data streams
 * - QualityAlertManager for alert visualizations
 * - QualityAnomalyDetector for anomaly overlays
 * - QualityMetricsCollector for historical data
 * - External dashboard frameworks (Chart.js, D3.js, Plotly)
 *
 * Performance requirements:
 * - Dashboard refresh rate <5 seconds
 * - Chart rendering time <1 second
 * - Data query response time <500ms
 * - WebSocket update latency <100ms
 *
 * Created: 2025-07-31
 * Author: Frontend Engineer & Data Visualization Specialist
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { QualityMonitoringService } from './QualityMonitoringService';
import { QualityAlertManager } from './QualityAlertManager';
import { QualityAnomalyDetector } from './QualityAnomalyDetector';
import { QualityMetricsCollector } from './QualityMetricsCollector';
export interface DashboardConfig {
    /** Dashboard server configuration */
    server: {
        enabled: boolean;
        port: number;
        host: string;
        enableSSL: boolean;
        corsOrigins: string[];
    };
    /** Real-time updates configuration */
    realTime: {
        enabled: boolean;
        updateInterval: number;
        websocketPort: number;
        maxConnections: number;
        enableDataStreaming: boolean;
    };
    /** Dashboard layout and widgets */
    layout: {
        defaultWidgets: DashboardWidget[];
        customLayouts: DashboardLayout[];
        enableCustomization: boolean;
        enableSharing: boolean;
    };
    /** Data visualization settings */
    visualization: {
        chartLibrary: 'chartjs' | 'd3' | 'plotly' | 'custom';
        colorScheme: 'light' | 'dark' | 'auto';
        animationsEnabled: boolean;
        responsiveDesign: boolean;
        accessibilityEnabled: boolean;
    };
    /** Performance optimization */
    performance: {
        enableCaching: boolean;
        cacheTimeout: number;
        enableCompression: boolean;
        enableLazyLoading: boolean;
        maxDataPoints: number;
    };
    /** Export and sharing */
    export: {
        enablePDF: boolean;
        enablePNG: boolean;
        enableCSV: boolean;
        enableJSON: boolean;
        maxExportSize: number;
    };
}
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    description?: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    config: WidgetConfig;
    dataSource: DataSourceConfig;
    refreshInterval?: number;
    visible: boolean;
    permissions: string[];
}
export declare enum WidgetType {
    QUALITY_OVERVIEW = "quality_overview",
    QUALITY_GAUGE = "quality_gauge",
    TREND_CHART = "trend_chart",
    DIMENSION_RADAR = "dimension_radar",
    ISSUE_PIE_CHART = "issue_pie_chart",
    ANOMALY_SCATTER = "anomaly_scatter",
    ALERT_PANEL = "alert_panel",
    KPI_CARD = "kpi_card",
    HEATMAP = "heatmap",
    DISTRIBUTION_HISTOGRAM = "distribution_histogram",
    COMPARISON_BAR = "comparison_bar",
    TIME_SERIES = "time_series",
    STATUS_INDICATOR = "status_indicator",
    PROGRESS_BAR = "progress_bar",
    DATA_TABLE = "data_table"
}
export interface WidgetConfig {
    chartType?: string;
    colors?: string[];
    thresholds?: {
        value: number;
        color: string;
        label: string;
    }[];
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
    timeRange?: {
        start: string;
        end: string;
        granularity: string;
    };
    filters?: Record<string, any>;
    displayOptions?: {
        showLegend?: boolean;
        showTooltips?: boolean;
        showDataLabels?: boolean;
        enableZoom?: boolean;
        enablePan?: boolean;
    };
}
export interface DataSourceConfig {
    type: 'quality_metrics' | 'quality_snapshots' | 'alerts' | 'anomalies' | 'trends';
    entityId?: string;
    entityType?: 'document' | 'chunk' | 'system';
    dimensions?: string[];
    timeRange?: {
        start: string;
        end: string;
    };
    filters?: Record<string, any>;
    aggregation?: string;
}
export interface DashboardLayout {
    id: string;
    name: string;
    description?: string;
    widgets: string[];
    isDefault: boolean;
    isPublic: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface DashboardData {
    widgets: Record<string, WidgetData>;
    metadata: {
        lastUpdated: string;
        nextUpdate: string;
        dataPoints: number;
        processingTime: number;
    };
    realTimeStatus: {
        connected: boolean;
        connectionCount: number;
        lastHeartbeat: string;
    };
}
export interface WidgetData {
    id: string;
    type: WidgetType;
    data: any;
    metadata: {
        lastUpdated: string;
        dataPoints: number;
        processingTime: number;
        cacheHit: boolean;
    };
    status: 'loading' | 'ready' | 'error' | 'stale';
    error?: string;
}
export interface QualityDashboardSummary {
    overview: {
        totalEntities: number;
        averageQualityScore: number;
        qualityTrend: 'improving' | 'stable' | 'declining';
        lastUpdated: string;
    };
    alerts: {
        active: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    anomalies: {
        detected: number;
        critical: number;
        trends: number;
        lastDetection?: string;
    };
    performance: {
        averageProcessingTime: number;
        dashboardRefreshRate: number;
        websocketConnections: number;
        cacheHitRate: number;
    };
}
export interface ExportOptions {
    format: 'pdf' | 'png' | 'csv' | 'json';
    widgets?: string[];
    timeRange?: {
        start: string;
        end: string;
    };
    includeMetadata: boolean;
    compression?: boolean;
    quality?: number;
}
export declare class QualityDashboardService extends EventEmitter {
    private logger;
    private db;
    private config;
    private qualityMonitoring;
    private alertManager;
    private anomalyDetector;
    private metricsCollector;
    private widgets;
    private layouts;
    private widgetDataCache;
    private websocketServer?;
    private connectedClients;
    private updateInterval?;
    private dashboardStats;
    constructor(database: Database.Database, logger: Logger, qualityMonitoring: QualityMonitoringService, alertManager: QualityAlertManager, anomalyDetector: QualityAnomalyDetector, metricsCollector: QualityMetricsCollector, config?: Partial<DashboardConfig>);
    private initializeDatabase;
    private createDefaultWidgets;
    private loadWidgetsAndLayouts;
    private setupEventListeners;
    private startRealTimeUpdates;
    private startWebSocketServer;
    private handleWebSocketConnection;
    private handleWebSocketMessage;
    private performDashboardUpdate;
    private shouldUpdateWidget;
    private updateWidgetData;
    private generateWidgetData;
    private generateQualityOverviewData;
    private generateQualityGaugeData;
    private generateAlertPanelData;
    private generateDimensionRadarData;
    private generateAnomalyScatterData;
    private generateTrendChartData;
    private generateIssuePieChartData;
    private generateKPICardData;
    private generateHeatmapData;
    private generateTimeSeriesData;
    private getQualityMetrics;
    private getLatestQualitySnapshot;
    private getAverageDimensionScores;
    private getTimeRange;
    private parseTimeString;
    private formatDimensionLabel;
    private getColorForDimension;
    private getColorForValue;
    private getDefaultColor;
    private countDataPoints;
    private getCachedWidgetData;
    private isCacheExpired;
    private cacheWidgetData;
    private handleQualityEvent;
    private handleResourceMetrics;
    private handleAlertTriggered;
    private handleAlertResolved;
    private handleDashboardAlert;
    private handleAnomalyDetected;
    private handleQualityReportGenerated;
    private sendDashboardData;
    private broadcastDashboardUpdate;
    private broadcastToClients;
    private handleSubscription;
    private handleUnsubscription;
    private handleDataRequest;
    private updateSessionActivity;
    createWidget(widget: DashboardWidget): Promise<boolean>;
    getDashboardData(): Promise<DashboardData>;
    getDashboardSummary(): Promise<QualityDashboardSummary>;
    exportDashboard(options: ExportOptions): Promise<Buffer | string>;
    private convertToCSV;
    updateConfiguration(newConfig: Partial<DashboardConfig>): void;
    destroy(): Promise<void>;
}
export default QualityDashboardService;
//# sourceMappingURL=QualityDashboardService.d.ts.map