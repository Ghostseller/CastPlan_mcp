/**
 * Dashboard Types - Comprehensive Type Definitions for Analytics Dashboard
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for dashboard components, widgets, charts, and user interfaces
 *
 * Created: 2025-07-31
 * Author: Frontend Architect & Dashboard Specialist
 */
import { AnalyticsTimeframe, FilterConfiguration } from './analytics.types';
export interface DashboardConfig {
    theme?: DashboardTheme;
    refreshInterval?: number;
    enableRealtime?: boolean;
    enableExports?: boolean;
    enableAlerts?: boolean;
    maxWidgets?: number;
    defaultLayout?: 'grid' | 'flex' | 'masonry';
    responsiveBreakpoints?: {
        mobile: number;
        tablet: number;
        desktop: number;
    };
    performance?: {
        lazyLoading: boolean;
        virtualScrolling: boolean;
        cacheWidgets: boolean;
        maxRenderTime: number;
    };
    accessibility?: {
        highContrast: boolean;
        screenReader: boolean;
        keyboardNavigation: boolean;
        focusIndicators: boolean;
    };
}
export type DashboardTheme = 'light' | 'dark' | 'auto' | 'high_contrast';
export interface DashboardData {
    id: string;
    title: string;
    layout: DashboardLayout;
    widgets: Map<string, DashboardWidget>;
    theme: DashboardTheme;
    filters: FilterConfiguration[];
    permissions: DashboardPermissions;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    metadata: {
        version: string;
        createdBy: string;
        tags: string[];
    };
}
export interface DashboardLayout {
    title: string;
    type: 'grid' | 'flex' | 'masonry' | 'custom';
    columns?: number;
    rows?: number;
    gap?: number;
    padding?: number;
    responsive?: boolean;
    breakpoints?: Record<string, Partial<DashboardLayout>>;
}
export interface DashboardPermissions {
    public: boolean;
    users: string[];
    roles: string[];
}
export type WidgetType = 'chart' | 'metric' | 'table' | 'text' | 'status' | 'list' | 'progress' | 'gauge' | 'map' | 'custom' | 'static';
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    description?: string;
    dataSource?: string;
    chartType?: ChartType;
    layout: WidgetLayout;
    configuration?: WidgetConfiguration;
    data?: any;
    filters?: FilterConfiguration[];
    realtime?: boolean;
    refreshInterval?: number;
    lastUpdated?: string;
    permissions: WidgetPermissions;
    styling?: WidgetStyling;
    interactions?: WidgetInteraction[];
    alerts?: WidgetAlert[];
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
}
export interface WidgetLayout {
    row: number;
    col: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    resizable?: boolean;
    draggable?: boolean;
}
export interface WidgetConfiguration {
    showTitle?: boolean;
    showBorder?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    showGridLines?: boolean;
    showDataLabels?: boolean;
    animation?: boolean;
    responsive?: boolean;
    [key: string]: any;
}
export interface WidgetPermissions {
    public: boolean;
    users: string[];
    roles: string[];
    operations: {
        view: boolean;
        edit: boolean;
        delete: boolean;
        export: boolean;
    };
}
export interface WidgetStyling {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    padding?: number;
    margin?: number;
    customCSS?: string;
}
export interface WidgetInteraction {
    type: 'click' | 'hover' | 'drill_down' | 'filter' | 'cross_filter';
    action: string;
    target?: string;
    parameters?: Record<string, any>;
}
export interface WidgetAlert {
    id: string;
    condition: string;
    threshold: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    isActive: boolean;
}
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar' | 'polar' | 'area' | 'heatmap' | 'treemap' | 'sankey' | 'gauge' | 'funnel' | 'waterfall';
export interface ChartConfiguration {
    type: ChartType;
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
        legend?: {
            display: boolean;
            position: 'top' | 'bottom' | 'left' | 'right';
            align?: 'start' | 'center' | 'end';
            labels?: any;
        };
        tooltip?: {
            enabled: boolean;
            mode?: 'point' | 'nearest' | 'index' | 'dataset';
            intersect?: boolean;
            callbacks?: any;
        };
        title?: {
            display: boolean;
            text: string;
            position?: 'top' | 'bottom';
        };
    };
    scales?: {
        [key: string]: {
            display: boolean;
            type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries';
            position?: 'top' | 'bottom' | 'left' | 'right';
            title?: {
                display: boolean;
                text: string;
            };
            min?: number;
            max?: number;
            ticks?: any;
            grid?: any;
        };
    };
    elements?: any;
    layout?: any;
    interaction?: any;
    accessibility?: {
        enabled: boolean;
        description: string;
        announceNewData?: boolean;
    };
}
export interface VisualizationData {
    type: ChartType;
    data: ChartData;
    config: ChartConfiguration;
    metadata: {
        dataSource: string;
        timeframe?: AnalyticsTimeframe;
        generatedAt: string;
        recordCount: number;
        filters: number;
    };
}
export interface ChartData {
    labels?: string[];
    datasets: ChartDataset[];
}
export interface ChartDataset {
    label?: string;
    data: (number | {
        x: any;
        y: any;
        [key: string]: any;
    })[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    showLine?: boolean;
    stepped?: boolean | 'before' | 'after' | 'middle';
    [key: string]: any;
}
export interface InteractiveElement {
    type: 'filter' | 'drill_down' | 'cross_filter' | 'time_selector' | 'parameter';
    label: string;
    field: string;
    values?: any[];
    defaultValue?: any;
    multiSelect?: boolean;
    required?: boolean;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
    styling?: {
        width?: string;
        position?: 'top' | 'bottom' | 'left' | 'right' | 'inline';
    };
}
export interface RealtimeUpdate {
    type: 'widget_update' | 'dashboard_update' | 'data_refresh' | 'alert' | 'system_status';
    timestamp: string;
    payload: any;
    source?: string;
    targets?: string[];
    priority?: 'low' | 'normal' | 'high' | 'critical';
}
export interface RealtimeConnection {
    id: string;
    userId?: string;
    dashboardId: string;
    connectedAt: string;
    lastActivity: string;
    subscriptions: string[];
    status: 'active' | 'idle' | 'disconnected';
}
export interface UserPreferences {
    userId: string;
    theme: DashboardTheme;
    language: string;
    timezone: string;
    defaultTimeframe: AnalyticsTimeframe;
    refreshInterval: number;
    notifications: {
        email: boolean;
        push: boolean;
        inApp: boolean;
    };
    accessibility: {
        highContrast: boolean;
        screenReader: boolean;
        reducedMotion: boolean;
        fontSize: 'small' | 'medium' | 'large';
    };
    dashboardSettings: {
        defaultLayout: 'grid' | 'flex' | 'masonry';
        widgetAnimations: boolean;
        autoRefresh: boolean;
        showTooltips: boolean;
    };
    widgetPreferences: Record<string, {
        visible: boolean;
        position: {
            row: number;
            col: number;
        };
        size: {
            width: number;
            height: number;
        };
        configuration: any;
    }>;
    filters: FilterConfiguration[];
    bookmarks: string[];
    recentDashboards: string[];
    updatedAt: string;
}
export type ExportFormat = 'pdf' | 'png' | 'jpg' | 'svg' | 'csv' | 'json' | 'excel';
export interface DashboardExport {
    id: string;
    dashboardId: string;
    format: ExportFormat;
    fileName: string;
    data: any;
    mimeType: string;
    size: number;
    generatedAt: string;
    options: {
        timeframe?: AnalyticsTimeframe;
        compressed: boolean;
        includeData: boolean;
    };
}
export interface AlertConfiguration {
    id?: string;
    name: string;
    description: string;
    metric: string;
    condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'between' | 'outside_range';
    threshold: number;
    thresholdHigh?: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    enabled: boolean;
    channels: ('email' | 'sms' | 'webhook' | 'dashboard' | 'slack')[];
    recipients?: string[];
    webhookUrl?: string;
    schedule?: {
        timezone: string;
        activeHours?: {
            start: string;
            end: string;
        };
        activeDays?: number[];
    };
    cooldown?: number;
    autoResolve?: boolean;
    tags?: string[];
    dashboardId?: string;
    createdAt?: string;
    isActive?: boolean;
    lastTriggered?: string | null;
}
export interface DashboardAlert {
    id: string;
    configurationId: string;
    dashboardId: string;
    triggeredAt: string;
    resolvedAt?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    currentValue: number;
    threshold: number;
    metric: string;
    status: 'active' | 'resolved' | 'acknowledged';
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    notificationsSent: string[];
    metadata?: Record<string, any>;
}
export declare class DashboardError extends Error {
    readonly code: string;
    readonly timestamp: string;
    constructor(message: string, code: string);
}
export interface DashboardPerformance {
    renderMetrics: {
        averageRenderTime: number;
        widgetsRendered: number;
        lastRenderTime: number;
        errorRate: number;
    };
    widgets: {
        active: number;
        maxAllowed: number;
    };
    realtime: {
        connections: number;
        intervals: number;
    };
    alerts: {
        configured: number;
        active: number;
    };
}
export interface DashboardService {
    createDashboard(dashboardId: string, layout: DashboardLayout, widgets: DashboardWidget[], options?: any): Promise<DashboardData>;
    getDashboard(dashboardId: string, options?: any): Promise<DashboardData>;
    updateDashboard(dashboardId: string, updates: Partial<DashboardData>, options?: any): Promise<void>;
    addWidget(dashboardId: string, widget: DashboardWidget, position?: any): Promise<void>;
    updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>, options?: any): Promise<void>;
    removeWidget(dashboardId: string, widgetId: string): Promise<void>;
    generateChartData(chartType: ChartType, dataSource: string, timeframe?: AnalyticsTimeframe, filters?: FilterConfiguration[], options?: any): Promise<VisualizationData>;
    createInteractiveElement(elementType: string, configuration: InteractiveElement, targetWidgets: string[]): Promise<string>;
    startRealtimeUpdates(): Promise<void>;
    exportDashboard(dashboardId: string, format: ExportFormat, options?: any): Promise<DashboardExport>;
    saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void>;
    getUserPreferences(userId: string): UserPreferences | null;
    configureAlert(dashboardId: string, alertConfig: AlertConfiguration): Promise<string>;
    getDashboardPerformanceMetrics(): DashboardPerformance;
}
export default DashboardService;
//# sourceMappingURL=dashboard.types.d.ts.map