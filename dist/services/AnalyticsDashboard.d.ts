/**
 * Analytics Dashboard Service - Comprehensive Dashboard and Visualization
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Provides advanced dashboard capabilities with real-time visualizations,
 * interactive charts, and comprehensive analytics presentation
 *
 * Created: 2025-07-31
 * Author: Frontend Architect & Data Visualization Specialist
 */
import { Logger } from 'winston';
import { DashboardConfig, DashboardWidget, DashboardLayout, DashboardData, VisualizationData, ChartType, DashboardTheme, InteractiveElement, ExportFormat, DashboardExport, AlertConfiguration, UserPreferences, DashboardPermissions } from '../types/dashboard.types';
import { VersionAnalyticsService } from './VersionAnalyticsService';
import { AnalyticsTimeframe, FilterConfiguration } from '../types/analytics.types';
/**
 * Advanced Analytics Dashboard Service
 *
 * Features:
 * - Real-time dashboard with customizable widgets
 * - Interactive charts and visualizations (D3.js, Chart.js compatible)
 * - Responsive design with mobile-first approach
 * - Custom dashboard layouts and themes
 * - Data export capabilities (PDF, PNG, CSV, JSON)
 * - Real-time alerts and notifications
 * - User preference management
 * - Role-based access control
 * - Performance optimization with lazy loading
 * - Accessibility compliance (WCAG 2.1 AA)
 */
export declare class AnalyticsDashboard {
    private logger;
    private analyticsService;
    private config;
    private activeWidgets;
    private realtimeConnections;
    private alertSystem;
    private userPreferences;
    private initialized;
    private renderMetrics;
    private updateIntervals;
    constructor(logger: Logger, analyticsService: VersionAnalyticsService, config?: DashboardConfig);
    initialize(): Promise<void>;
    /**
     * Create a new dashboard with specified configuration
     * Supports custom layouts, themes, and widget configurations
     *
     * Performance Target: <1 second for dashboard creation
     */
    createDashboard(dashboardId: string, layout: DashboardLayout, widgets: DashboardWidget[], options?: {
        theme?: DashboardTheme;
        permissions?: DashboardPermissions;
        filters?: FilterConfiguration[];
        alerts?: AlertConfiguration[];
    }): Promise<DashboardData>;
    /**
     * Get dashboard data with all widgets and visualizations
     * Includes lazy loading and performance optimization
     */
    getDashboard(dashboardId: string, options?: {
        includeData?: boolean;
        timeframe?: AnalyticsTimeframe;
        filters?: FilterConfiguration[];
        userId?: string;
    }): Promise<DashboardData>;
    /**
     * Update dashboard configuration and layout
     * Supports real-time updates with change propagation
     */
    updateDashboard(dashboardId: string, updates: Partial<DashboardData>, options?: {
        notifyUsers?: boolean;
        validateLayout?: boolean;
    }): Promise<void>;
    /**
     * Add a new widget to the dashboard
     * Supports all widget types with automatic data binding
     */
    addWidget(dashboardId: string, widget: DashboardWidget, position?: {
        row: number;
        col: number;
        width: number;
        height: number;
    }): Promise<void>;
    /**
     * Update widget configuration and data
     * Supports partial updates with change validation
     */
    updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>, options?: {
        refreshData?: boolean;
        validateConfig?: boolean;
    }): Promise<void>;
    /**
     * Remove widget from dashboard
     * Includes cleanup of real-time subscriptions and data sources
     */
    removeWidget(dashboardId: string, widgetId: string): Promise<void>;
    /**
     * Generate chart data for various visualization types
     * Supports Line, Bar, Pie, Scatter, Heatmap, and custom charts
     *
     * Performance Target: <500ms for chart data generation
     */
    generateChartData(chartType: ChartType, dataSource: string, timeframe?: AnalyticsTimeframe, filters?: FilterConfiguration[], options?: {
        aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
        groupBy?: string;
        limit?: number;
        customQuery?: any;
    }): Promise<VisualizationData>;
    /**
     * Create interactive dashboard elements
     * Supports filters, drill-downs, and cross-widget interactions
     */
    createInteractiveElement(elementType: 'filter' | 'drill_down' | 'cross_filter' | 'time_selector', configuration: InteractiveElement, targetWidgets: string[]): Promise<string>;
    /**
     * Start real-time updates for dashboard
     * Manages WebSocket connections and data streaming
     */
    startRealtimeUpdates(): Promise<void>;
    /**
     * Process real-time updates for all active widgets
     * Optimizes updates to prevent overwhelming the system
     */
    private processRealtimeUpdates;
    /**
     * Export dashboard or widgets in various formats
     * Supports PDF, PNG, CSV, JSON with custom styling
     *
     * Performance Target: <10 seconds for report generation
     */
    exportDashboard(dashboardId: string, format: ExportFormat, options?: {
        includeData?: boolean;
        timeframe?: AnalyticsTimeframe;
        filters?: FilterConfiguration[];
        customStyling?: any;
        fileName?: string;
        compression?: boolean;
    }): Promise<DashboardExport>;
    /**
     * Save user preferences for dashboard customization
     * Includes theme, layout, widget visibility, and filters
     */
    saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void>;
    /**
     * Get user preferences
     */
    getUserPreferences(userId: string): UserPreferences | null;
    /**
     * Configure alerts for dashboard metrics
     * Supports threshold-based and pattern-based alerts
     */
    configureAlert(dashboardId: string, alertConfig: AlertConfiguration): Promise<string>;
    /**
     * Get dashboard performance metrics
     */
    getDashboardPerformanceMetrics(): any;
    private initializeDashboardSystem;
    private loadDefaultWidgets;
    private initializeAlertSystem;
    private validateDashboardConfig;
    private validateWidget;
    private loadDashboardConfig;
    private saveDashboardConfig;
    private checkDashboardPermissions;
    private loadWidgetData;
    private transformDataForVisualization;
    private transformForLineChart;
    private transformForBarChart;
    private transformForPieChart;
    private transformForScatterChart;
    private transformForHeatmap;
    private generateChartConfiguration;
    private applyFilters;
    private applyFilter;
    private recordRenderMetric;
    private recordRenderError;
    private shouldUpdateWidget;
    private initializeWidgetDataSource;
    private startWidgetRealtime;
    private refreshWidgetData;
    private notifyDashboardUpdate;
    private notifyWidgetUpdate;
    private notifyWidgetRemoval;
    private validateDashboardLayout;
    private validateInteractiveElement;
    private validateUserPreferences;
    private validateAlertConfiguration;
    private connectInteractiveElement;
    private updateWidgetRealtime;
    private emitRealtimeUpdate;
    private stopWidgetRealtime;
    private cleanupWidgetDataSource;
    private generatePDFExport;
    private generateImageExport;
    private generateCSVExport;
    private generateJSONExport;
    private applyUserPreferences;
    private startAlertMonitoring;
    private startWidgetUpdates;
    private ensureInitialized;
    shutdown(): Promise<void>;
}
export default AnalyticsDashboard;
//# sourceMappingURL=AnalyticsDashboard.d.ts.map