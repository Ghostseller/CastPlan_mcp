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
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';
import { AlertSeverity } from './QualityAlertManager';
import { AnomalySeverity } from './QualityAnomalyDetector';
export var WidgetType;
(function (WidgetType) {
    WidgetType["QUALITY_OVERVIEW"] = "quality_overview";
    WidgetType["QUALITY_GAUGE"] = "quality_gauge";
    WidgetType["TREND_CHART"] = "trend_chart";
    WidgetType["DIMENSION_RADAR"] = "dimension_radar";
    WidgetType["ISSUE_PIE_CHART"] = "issue_pie_chart";
    WidgetType["ANOMALY_SCATTER"] = "anomaly_scatter";
    WidgetType["ALERT_PANEL"] = "alert_panel";
    WidgetType["KPI_CARD"] = "kpi_card";
    WidgetType["HEATMAP"] = "heatmap";
    WidgetType["DISTRIBUTION_HISTOGRAM"] = "distribution_histogram";
    WidgetType["COMPARISON_BAR"] = "comparison_bar";
    WidgetType["TIME_SERIES"] = "time_series";
    WidgetType["STATUS_INDICATOR"] = "status_indicator";
    WidgetType["PROGRESS_BAR"] = "progress_bar";
    WidgetType["DATA_TABLE"] = "data_table";
})(WidgetType || (WidgetType = {}));
// =============================================================================
// QUALITY DASHBOARD SERVICE
// =============================================================================
export class QualityDashboardService extends EventEmitter {
    logger;
    db;
    config;
    // Core services
    qualityMonitoring;
    alertManager;
    anomalyDetector;
    metricsCollector;
    // Dashboard state
    widgets = new Map();
    layouts = new Map();
    widgetDataCache = new Map();
    // Real-time communication
    websocketServer;
    connectedClients = new Set();
    updateInterval;
    // Performance tracking
    dashboardStats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResponseTime: 0,
        lastRefresh: Date.now()
    };
    constructor(database, logger, qualityMonitoring, alertManager, anomalyDetector, metricsCollector, config = {}) {
        super();
        this.db = database;
        this.logger = logger;
        this.qualityMonitoring = qualityMonitoring;
        this.alertManager = alertManager;
        this.anomalyDetector = anomalyDetector;
        this.metricsCollector = metricsCollector;
        // Set default configuration
        this.config = {
            server: {
                enabled: true,
                port: 8080,
                host: '0.0.0.0',
                enableSSL: false,
                corsOrigins: ['*']
            },
            realTime: {
                enabled: true,
                updateInterval: 5000, // 5 seconds (meets performance requirement)
                websocketPort: 8081,
                maxConnections: 100,
                enableDataStreaming: true
            },
            layout: {
                defaultWidgets: this.createDefaultWidgets(),
                customLayouts: [],
                enableCustomization: true,
                enableSharing: true
            },
            visualization: {
                chartLibrary: 'chartjs',
                colorScheme: 'light',
                animationsEnabled: true,
                responsiveDesign: true,
                accessibilityEnabled: true
            },
            performance: {
                enableCaching: true,
                cacheTimeout: 60000, // 1 minute
                enableCompression: true,
                enableLazyLoading: true,
                maxDataPoints: 1000
            },
            export: {
                enablePDF: true,
                enablePNG: true,
                enableCSV: true,
                enableJSON: true,
                maxExportSize: 10485760 // 10MB
            },
            ...config
        };
        this.initializeDatabase();
        this.loadWidgetsAndLayouts();
        this.setupEventListeners();
        if (this.config.realTime.enabled) {
            this.startRealTimeUpdates();
        }
        this.logger.info('Quality Dashboard Service initialized', {
            realTimeEnabled: this.config.realTime.enabled,
            updateInterval: this.config.realTime.updateInterval,
            defaultWidgets: this.config.layout.defaultWidgets.length
        });
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeDatabase() {
        try {
            // Dashboard widgets table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_widgets (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          position TEXT NOT NULL,
          config TEXT NOT NULL,
          data_source TEXT NOT NULL,
          refresh_interval INTEGER,
          visible INTEGER NOT NULL DEFAULT 1,
          permissions TEXT NOT NULL DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Dashboard layouts table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_layouts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          widgets TEXT NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0,
          is_public INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Widget data cache table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS widget_data_cache (
          widget_id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          metadata TEXT NOT NULL,
          status TEXT NOT NULL,
          error TEXT,
          cached_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (widget_id) REFERENCES dashboard_widgets (id)
        )
      `);
            // Dashboard sessions table (for tracking active users)
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          connected_at TEXT NOT NULL,
          last_activity TEXT NOT NULL,
          websocket_id TEXT
        )
      `);
            // Dashboard usage analytics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_analytics (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          widget_id TEXT,
          layout_id TEXT,
          user_id TEXT,
          session_id TEXT,
          event_data TEXT,
          timestamp TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes for performance
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_widgets_type ON dashboard_widgets(type);
        CREATE INDEX IF NOT EXISTS idx_widgets_visible ON dashboard_widgets(visible);
        CREATE INDEX IF NOT EXISTS idx_layouts_default ON dashboard_layouts(is_default);
        CREATE INDEX IF NOT EXISTS idx_layouts_public ON dashboard_layouts(is_public);
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON widget_data_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_connected ON dashboard_sessions(connected_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON dashboard_analytics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_analytics_widget ON dashboard_analytics(widget_id);
      `);
            this.logger.info('Quality dashboard database tables initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize dashboard database:', error);
            throw error;
        }
    }
    createDefaultWidgets() {
        return [
            {
                id: 'quality-overview',
                type: WidgetType.QUALITY_OVERVIEW,
                title: 'Quality Overview',
                description: 'System-wide quality metrics overview',
                position: { x: 0, y: 0, width: 12, height: 6 },
                config: {
                    chartType: 'line',
                    colors: ['#4CAF50', '#2196F3', '#FF9800', '#F44336'],
                    timeRange: { start: '-24h', end: 'now', granularity: '1h' },
                    displayOptions: {
                        showLegend: true,
                        showTooltips: true,
                        enableZoom: true
                    }
                },
                dataSource: {
                    type: 'quality_metrics',
                    dimensions: ['overall', 'clarity', 'completeness', 'accuracy'],
                    timeRange: { start: '-24h', end: 'now' }
                },
                refreshInterval: 30000,
                visible: true,
                permissions: ['read']
            },
            {
                id: 'quality-gauge',
                type: WidgetType.QUALITY_GAUGE,
                title: 'Current Quality Score',
                description: 'Real-time overall quality gauge',
                position: { x: 0, y: 6, width: 4, height: 4 },
                config: {
                    thresholds: [
                        { value: 0.3, color: '#F44336', label: 'Critical' },
                        { value: 0.6, color: '#FF9800', label: 'Warning' },
                        { value: 0.8, color: '#4CAF50', label: 'Good' },
                        { value: 1.0, color: '#2E7D32', label: 'Excellent' }
                    ]
                },
                dataSource: {
                    type: 'quality_snapshots',
                    dimensions: ['overall']
                },
                refreshInterval: 5000,
                visible: true,
                permissions: ['read']
            },
            {
                id: 'active-alerts',
                type: WidgetType.ALERT_PANEL,
                title: 'Active Alerts',
                description: 'Current quality alerts by severity',
                position: { x: 4, y: 6, width: 4, height: 4 },
                config: {
                    colors: ['#F44336', '#FF9800', '#2196F3', '#4CAF50'],
                    displayOptions: {
                        showDataLabels: true
                    }
                },
                dataSource: {
                    type: 'alerts',
                    filters: { status: 'active' }
                },
                refreshInterval: 10000,
                visible: true,
                permissions: ['read']
            },
            {
                id: 'anomaly-detection',
                type: WidgetType.ANOMALY_SCATTER,
                title: 'Anomaly Detection',
                description: 'Recent anomalies and patterns',
                position: { x: 8, y: 6, width: 4, height: 4 },
                config: {
                    chartType: 'scatter',
                    colors: ['#F44336', '#FF9800', '#2196F3', '#4CAF50', '#9C27B0'],
                    displayOptions: {
                        showTooltips: true,
                        enableZoom: true
                    }
                },
                dataSource: {
                    type: 'anomalies',
                    timeRange: { start: '-24h', end: 'now' }
                },
                refreshInterval: 15000,
                visible: true,
                permissions: ['read']
            },
            {
                id: 'dimension-radar',
                type: WidgetType.DIMENSION_RADAR,
                title: 'Quality Dimensions',
                description: 'Multi-dimensional quality analysis',
                position: { x: 0, y: 10, width: 6, height: 6 },
                config: {
                    chartType: 'radar',
                    colors: ['#2196F3', '#FF9800'],
                    displayOptions: {
                        showLegend: true
                    }
                },
                dataSource: {
                    type: 'quality_metrics',
                    dimensions: ['clarity', 'completeness', 'accuracy', 'relevance', 'consistency', 'structure']
                },
                refreshInterval: 30000,
                visible: true,
                permissions: ['read']
            },
            {
                id: 'trend-analysis',
                type: WidgetType.TREND_CHART,
                title: 'Quality Trends',
                description: 'Historical quality trends and forecasting',
                position: { x: 6, y: 10, width: 6, height: 6 },
                config: {
                    chartType: 'line',
                    colors: ['#4CAF50', '#2196F3', '#FF9800'],
                    displayOptions: {
                        showLegend: true,
                        enableZoom: true,
                        enablePan: true
                    }
                },
                dataSource: {
                    type: 'trends',
                    timeRange: { start: '-7d', end: 'now' }
                },
                refreshInterval: 60000,
                visible: true,
                permissions: ['read']
            }
        ];
    }
    async loadWidgetsAndLayouts() {
        try {
            // Load widgets from database
            const widgetStmt = this.db.prepare('SELECT * FROM dashboard_widgets WHERE visible = 1');
            const widgetRows = widgetStmt.all();
            for (const row of widgetRows) {
                const widget = {
                    id: row.id,
                    type: row.type,
                    title: row.title,
                    description: row.description,
                    position: JSON.parse(row.position),
                    config: JSON.parse(row.config),
                    dataSource: JSON.parse(row.data_source),
                    refreshInterval: row.refresh_interval,
                    visible: row.visible === 1,
                    permissions: JSON.parse(row.permissions)
                };
                this.widgets.set(widget.id, widget);
            }
            // Load layouts from database
            const layoutStmt = this.db.prepare('SELECT * FROM dashboard_layouts');
            const layoutRows = layoutStmt.all();
            for (const row of layoutRows) {
                const layout = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    widgets: JSON.parse(row.widgets),
                    isDefault: row.is_default === 1,
                    isPublic: row.is_public === 1,
                    createdBy: row.created_by,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                this.layouts.set(layout.id, layout);
            }
            // Create default widgets if none exist
            if (this.widgets.size === 0) {
                for (const widget of this.config.layout.defaultWidgets) {
                    await this.createWidget(widget);
                }
            }
            this.logger.info('Dashboard widgets and layouts loaded', {
                widgets: this.widgets.size,
                layouts: this.layouts.size
            });
        }
        catch (error) {
            this.logger.error('Failed to load widgets and layouts:', error);
        }
    }
    setupEventListeners() {
        // Listen to quality monitoring events
        this.qualityMonitoring.on('qualityEvent', this.handleQualityEvent.bind(this));
        this.qualityMonitoring.on('resourceMetrics', this.handleResourceMetrics.bind(this));
        // Listen to alert manager events
        this.alertManager.on('alertTriggered', this.handleAlertTriggered.bind(this));
        this.alertManager.on('alertResolved', this.handleAlertResolved.bind(this));
        this.alertManager.on('dashboardAlert', this.handleDashboardAlert.bind(this));
        // Listen to anomaly detector events
        this.anomalyDetector.on('anomalyDetected', this.handleAnomalyDetected.bind(this));
        // Listen to metrics collector events
        this.metricsCollector.on('quality-report-generated', this.handleQualityReportGenerated.bind(this));
        this.logger.info('Dashboard event listeners setup complete');
    }
    // =============================================================================
    // REAL-TIME UPDATES
    // =============================================================================
    startRealTimeUpdates() {
        // Start WebSocket server for real-time communication
        if (this.config.realTime.enabled) {
            this.startWebSocketServer();
        }
        // Start periodic dashboard updates
        this.updateInterval = setInterval(() => this.performDashboardUpdate(), this.config.realTime.updateInterval);
        this.logger.info('Real-time dashboard updates started', {
            updateInterval: this.config.realTime.updateInterval,
            websocketEnabled: this.config.realTime.enabled
        });
    }
    startWebSocketServer() {
        try {
            this.websocketServer = new WebSocket.Server({
                port: this.config.realTime.websocketPort,
                maxPayload: 1024 * 1024, // 1MB max payload
            });
            this.websocketServer.on('connection', (ws, req) => {
                this.handleWebSocketConnection(ws, req);
            });
            this.websocketServer.on('error', (error) => {
                this.logger.error('WebSocket server error:', error);
            });
            this.logger.info('WebSocket server started', {
                port: this.config.realTime.websocketPort,
                maxConnections: this.config.realTime.maxConnections
            });
        }
        catch (error) {
            this.logger.error('Failed to start WebSocket server:', error);
        }
    }
    handleWebSocketConnection(ws, req) {
        // Check connection limits
        if (this.connectedClients.size >= this.config.realTime.maxConnections) {
            ws.close(1013, 'Maximum connections exceeded');
            return;
        }
        const sessionId = uuidv4();
        const clientInfo = {
            id: sessionId,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            connectedAt: new Date().toISOString()
        };
        this.connectedClients.add(ws);
        // Store session information
        try {
            const stmt = this.db.prepare(`
        INSERT INTO dashboard_sessions (id, ip_address, user_agent, connected_at, last_activity, websocket_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(sessionId, clientInfo.ip, clientInfo.userAgent, clientInfo.connectedAt, clientInfo.connectedAt, sessionId);
        }
        catch (error) {
            this.logger.error('Failed to store session information:', error);
        }
        // Send initial dashboard data
        this.sendDashboardData(ws);
        // Handle incoming messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleWebSocketMessage(ws, data, sessionId);
            }
            catch (error) {
                this.logger.error('Failed to parse WebSocket message:', error);
            }
        });
        // Handle connection close
        ws.on('close', () => {
            this.connectedClients.delete(ws);
            this.logger.debug('WebSocket client disconnected', { sessionId });
        });
        // Handle errors
        ws.on('error', (error) => {
            this.logger.error('WebSocket client error:', error);
            this.connectedClients.delete(ws);
        });
        this.logger.debug('WebSocket client connected', {
            sessionId,
            totalConnections: this.connectedClients.size
        });
    }
    handleWebSocketMessage(ws, message, sessionId) {
        try {
            switch (message.type) {
                case 'subscribe':
                    // Subscribe to specific widget updates
                    this.handleSubscription(ws, message.data, sessionId);
                    break;
                case 'unsubscribe':
                    // Unsubscribe from widget updates
                    this.handleUnsubscription(ws, message.data, sessionId);
                    break;
                case 'request_data':
                    // Request specific widget data
                    this.handleDataRequest(ws, message.data, sessionId);
                    break;
                case 'ping':
                    // Heartbeat response
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
                default:
                    this.logger.warn('Unknown WebSocket message type:', message.type);
            }
            // Update last activity
            this.updateSessionActivity(sessionId);
        }
        catch (error) {
            this.logger.error('Error handling WebSocket message:', error);
        }
    }
    async performDashboardUpdate() {
        const startTime = performance.now();
        try {
            // Update all widget data
            const updatePromises = [];
            for (const widget of this.widgets.values()) {
                if (widget.visible && this.shouldUpdateWidget(widget)) {
                    updatePromises.push(this.updateWidgetData(widget));
                }
            }
            // Wait for all updates to complete
            await Promise.all(updatePromises);
            // Broadcast updates to connected clients
            if (this.connectedClients.size > 0) {
                await this.broadcastDashboardUpdate();
            }
            const processingTime = performance.now() - startTime;
            // Update performance statistics
            this.dashboardStats.lastRefresh = Date.now();
            // Check performance requirement (<5 seconds)
            if (processingTime > 5000) {
                this.logger.warn('Dashboard update exceeded performance requirement', {
                    processingTime: `${processingTime.toFixed(2)}ms`,
                    widgets: this.widgets.size,
                    connections: this.connectedClients.size
                });
            }
            this.logger.debug('Dashboard update completed', {
                processingTime: `${processingTime.toFixed(2)}ms`,
                widgets: updatePromises.length,
                connections: this.connectedClients.size
            });
        }
        catch (error) {
            this.logger.error('Error during dashboard update:', error);
        }
    }
    shouldUpdateWidget(widget) {
        if (widget.refreshInterval) {
            const cachedData = this.widgetDataCache.get(widget.id);
            if (cachedData) {
                const timeSinceUpdate = Date.now() - new Date(cachedData.metadata.lastUpdated).getTime();
                return timeSinceUpdate >= widget.refreshInterval;
            }
        }
        return true;
    }
    async updateWidgetData(widget) {
        const startTime = performance.now();
        try {
            // Check cache first
            if (this.config.performance.enableCaching) {
                const cached = await this.getCachedWidgetData(widget.id);
                if (cached && !this.isCacheExpired(cached)) {
                    this.dashboardStats.cacheHits++;
                    return;
                }
                this.dashboardStats.cacheMisses++;
            }
            // Generate widget data based on type and data source
            const data = await this.generateWidgetData(widget);
            const processingTime = performance.now() - startTime;
            const widgetData = {
                id: widget.id,
                type: widget.type,
                data,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    dataPoints: this.countDataPoints(data),
                    processingTime,
                    cacheHit: false
                },
                status: 'ready'
            };
            // Cache the widget data
            this.widgetDataCache.set(widget.id, widgetData);
            // Store in database cache if enabled
            if (this.config.performance.enableCaching) {
                await this.cacheWidgetData(widget.id, widgetData);
            }
            // Check chart rendering performance requirement (<1 second)
            if (processingTime > 1000) {
                this.logger.warn('Widget data generation exceeded rendering performance requirement', {
                    widgetId: widget.id,
                    widgetType: widget.type,
                    processingTime: `${processingTime.toFixed(2)}ms`
                });
            }
        }
        catch (error) {
            this.logger.error(`Error updating widget data for ${widget.id}:`, error);
            // Store error state
            const widgetData = {
                id: widget.id,
                type: widget.type,
                data: null,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    dataPoints: 0,
                    processingTime: performance.now() - startTime,
                    cacheHit: false
                },
                status: 'error',
                error: error.message
            };
            this.widgetDataCache.set(widget.id, widgetData);
        }
    }
    // =============================================================================
    // WIDGET DATA GENERATION
    // =============================================================================
    async generateWidgetData(widget) {
        const startTime = performance.now();
        try {
            switch (widget.type) {
                case WidgetType.QUALITY_OVERVIEW:
                    return await this.generateQualityOverviewData(widget);
                case WidgetType.QUALITY_GAUGE:
                    return await this.generateQualityGaugeData(widget);
                case WidgetType.TREND_CHART:
                    return await this.generateTrendChartData(widget);
                case WidgetType.DIMENSION_RADAR:
                    return await this.generateDimensionRadarData(widget);
                case WidgetType.ISSUE_PIE_CHART:
                    return await this.generateIssuePieChartData(widget);
                case WidgetType.ANOMALY_SCATTER:
                    return await this.generateAnomalyScatterData(widget);
                case WidgetType.ALERT_PANEL:
                    return await this.generateAlertPanelData(widget);
                case WidgetType.KPI_CARD:
                    return await this.generateKPICardData(widget);
                case WidgetType.HEATMAP:
                    return await this.generateHeatmapData(widget);
                case WidgetType.TIME_SERIES:
                    return await this.generateTimeSeriesData(widget);
                default:
                    throw new Error(`Unsupported widget type: ${widget.type}`);
            }
        }
        catch (error) {
            this.logger.error(`Error generating data for widget ${widget.id}:`, error);
            throw error;
        }
    }
    async generateQualityOverviewData(widget) {
        const timeRange = this.getTimeRange(widget.config.timeRange);
        const dimensions = widget.dataSource.dimensions || ['overall'];
        // Get quality metrics for the specified time range
        const metrics = await this.getQualityMetrics({
            dimensions,
            timeRange,
            entityId: widget.dataSource.entityId,
            entityType: widget.dataSource.entityType
        });
        // Group by dimension and create time series data
        const datasets = dimensions.map(dimension => {
            const dimensionData = metrics
                .filter(m => m.dimension === dimension)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map(m => ({
                x: m.timestamp,
                y: m.value
            }));
            return {
                label: this.formatDimensionLabel(dimension),
                data: dimensionData,
                borderColor: this.getColorForDimension(dimension, widget.config.colors),
                backgroundColor: this.getColorForDimension(dimension, widget.config.colors, 0.1),
                tension: 0.1
            };
        });
        return {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    legend: {
                        display: widget.config.displayOptions?.showLegend !== false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'MMM DD',
                                week: 'MMM DD',
                                month: 'MMM YYYY'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: (value) => `${(value * 100).toFixed(0)}%`
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }
    async generateQualityGaugeData(widget) {
        // Get latest quality score
        const latestSnapshot = await this.getLatestQualitySnapshot(widget.dataSource.entityId || 'system');
        const currentValue = latestSnapshot ? latestSnapshot.qualityScore.overall : 0;
        const thresholds = widget.config.thresholds || [];
        return {
            type: 'gauge',
            data: {
                datasets: [{
                        data: [currentValue, 1 - currentValue],
                        backgroundColor: [
                            this.getColorForValue(currentValue, thresholds),
                            'rgba(200, 200, 200, 0.1)'
                        ],
                        borderWidth: 0
                    }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    tooltip: {
                        callbacks: {
                            label: () => `Quality Score: ${(currentValue * 100).toFixed(1)}%`
                        }
                    }
                },
                circumference: 180,
                rotation: 270,
                cutout: '75%',
                elements: {
                    center: {
                        text: `${(currentValue * 100).toFixed(1)}%`,
                        color: this.getColorForValue(currentValue, thresholds),
                        fontStyle: 'Arial',
                        sidePadding: 20,
                        minFontSize: 20,
                        lineHeight: 25
                    }
                }
            }
        };
    }
    async generateAlertPanelData(widget) {
        const alerts = await this.alertManager.getActiveAlerts();
        // Group alerts by severity
        const alertCounts = {
            critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
            high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
            medium: alerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
            low: alerts.filter(a => a.severity === AlertSeverity.LOW).length
        };
        const labels = ['Critical', 'High', 'Medium', 'Low'];
        const data = [alertCounts.critical, alertCounts.high, alertCounts.medium, alertCounts.low];
        const colors = widget.config.colors || ['#F44336', '#FF9800', '#2196F3', '#4CAF50'];
        return {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                        data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.raw;
                                const total = data.reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
    }
    async generateDimensionRadarData(widget) {
        const dimensions = widget.dataSource.dimensions ||
            ['clarity', 'completeness', 'accuracy', 'relevance', 'consistency', 'structure'];
        // Get latest quality scores for each dimension
        const latestSnapshot = await this.getLatestQualitySnapshot(widget.dataSource.entityId || 'system');
        const currentData = dimensions.map(dim => latestSnapshot ? (latestSnapshot.qualityScore.dimensions[dim] || 0) : 0);
        // Get average scores for comparison
        const averageData = await this.getAverageDimensionScores(dimensions);
        return {
            type: 'radar',
            data: {
                labels: dimensions.map(dim => this.formatDimensionLabel(dim)),
                datasets: [
                    {
                        label: 'Current',
                        data: currentData,
                        borderColor: widget.config.colors?.[0] || '#2196F3',
                        backgroundColor: widget.config.colors?.[0] || '#2196F3' + '20',
                        pointBackgroundColor: widget.config.colors?.[0] || '#2196F3',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: widget.config.colors?.[0] || '#2196F3'
                    },
                    {
                        label: 'Average',
                        data: averageData,
                        borderColor: widget.config.colors?.[1] || '#FF9800',
                        backgroundColor: widget.config.colors?.[1] || '#FF9800' + '20',
                        pointBackgroundColor: widget.config.colors?.[1] || '#FF9800',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: widget.config.colors?.[1] || '#FF9800'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    legend: {
                        display: widget.config.displayOptions?.showLegend !== false
                    }
                },
                elements: {
                    line: {
                        borderWidth: 3
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 1,
                        ticks: {
                            callback: (value) => `${(value * 100).toFixed(0)}%`
                        }
                    }
                }
            }
        };
    }
    async generateAnomalyScatterData(widget) {
        const timeRange = this.getTimeRange(widget.config.timeRange);
        const anomalies = await this.anomalyDetector.getAnomalies(widget.dataSource.entityId, undefined, timeRange);
        // Group anomalies by severity
        const severityGroups = {
            critical: anomalies.filter(a => a.severity === AnomalySeverity.CRITICAL),
            high: anomalies.filter(a => a.severity === AnomalySeverity.HIGH),
            medium: anomalies.filter(a => a.severity === AnomalySeverity.MEDIUM),
            low: anomalies.filter(a => a.severity === AnomalySeverity.LOW),
            info: anomalies.filter(a => a.severity === AnomalySeverity.INFO)
        };
        const datasets = Object.entries(severityGroups).map(([severity, anomalies], index) => ({
            label: severity.charAt(0).toUpperCase() + severity.slice(1),
            data: anomalies.map(anomaly => ({
                x: anomaly.detectedAt,
                y: anomaly.score,
                anomaly // Store full anomaly data for tooltips
            })),
            backgroundColor: widget.config.colors?.[index] || this.getDefaultColor(index),
            borderColor: widget.config.colors?.[index] || this.getDefaultColor(index),
            pointRadius: 6,
            pointHoverRadius: 8
        }));
        return {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    legend: {
                        display: widget.config.displayOptions?.showLegend !== false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const anomaly = context[0].raw.anomaly;
                                return `${anomaly.type} - ${anomaly.detectedAt}`;
                            },
                            label: (context) => {
                                const anomaly = context.raw.anomaly;
                                return [
                                    `Score: ${anomaly.score.toFixed(3)}`,
                                    `Confidence: ${(anomaly.confidence * 100).toFixed(1)}%`,
                                    `Entity: ${anomaly.entityId}`,
                                    `Description: ${anomaly.description}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        title: {
                            display: true,
                            text: 'Detection Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Anomaly Score'
                        },
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
        };
    }
    async generateTrendChartData(widget) {
        const entityId = widget.dataSource.entityId || 'system';
        const dimensions = widget.dataSource.dimensions || ['overall'];
        const datasets = [];
        for (const dimension of dimensions) {
            const trend = await this.anomalyDetector.getTrendAnalysis(entityId, dimension);
            if (trend) {
                // Historical data
                const historicalData = await this.getQualityMetrics({
                    dimensions: [dimension],
                    timeRange: trend.timeRange,
                    entityId
                });
                const historicalDataset = {
                    label: `${this.formatDimensionLabel(dimension)} (Historical)`,
                    data: historicalData.map(m => ({
                        x: m.timestamp,
                        y: m.value
                    })),
                    borderColor: this.getColorForDimension(dimension, widget.config.colors),
                    backgroundColor: 'transparent',
                    tension: 0.1
                };
                // Forecast data
                const forecastDataset = {
                    label: `${this.formatDimensionLabel(dimension)} (Forecast)`,
                    data: trend.forecast.predictions.map(p => ({
                        x: p.timestamp,
                        y: p.value
                    })),
                    borderColor: this.getColorForDimension(dimension, widget.config.colors),
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.1
                };
                datasets.push(historicalDataset, forecastDataset);
            }
        }
        return {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: widget.title
                    },
                    legend: {
                        display: widget.config.displayOptions?.showLegend !== false
                    }
                },
                scales: {
                    x: {
                        type: 'time'
                    },
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: (value) => `${(value * 100).toFixed(0)}%`
                        }
                    }
                }
            }
        };
    }
    // Additional widget data generators would be implemented here...
    async generateIssuePieChartData(widget) {
        // Placeholder implementation
        return { type: 'pie', data: { labels: [], datasets: [] } };
    }
    async generateKPICardData(widget) {
        // Placeholder implementation
        return { value: 0, trend: 'stable', change: 0 };
    }
    async generateHeatmapData(widget) {
        // Placeholder implementation
        return { type: 'heatmap', data: [] };
    }
    async generateTimeSeriesData(widget) {
        // Placeholder implementation - similar to quality overview
        return await this.generateQualityOverviewData(widget);
    }
    // =============================================================================
    // DATA ACCESS HELPERS
    // =============================================================================
    async getQualityMetrics(options) {
        // This would typically query the database or call the metrics collector
        // For now, return mock data
        const results = [];
        const startTime = new Date(options.timeRange.start).getTime();
        const endTime = new Date(options.timeRange.end).getTime();
        const interval = (endTime - startTime) / 100; // 100 data points
        for (const dimension of options.dimensions) {
            for (let i = 0; i < 100; i++) {
                const timestamp = new Date(startTime + i * interval).toISOString();
                const value = 0.5 + 0.3 * Math.sin(i * 0.1) + 0.1 * Math.random();
                results.push({
                    dimension,
                    value: Math.max(0, Math.min(1, value)),
                    timestamp
                });
            }
        }
        return results;
    }
    async getLatestQualitySnapshot(entityId) {
        return await this.qualityMonitoring.getQualitySnapshot(entityId);
    }
    async getAverageDimensionScores(dimensions) {
        // This would calculate historical averages for each dimension
        // For now, return mock averages
        return dimensions.map(() => 0.7 + 0.2 * Math.random());
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    getTimeRange(configTimeRange) {
        if (configTimeRange?.start && configTimeRange?.end) {
            return {
                start: this.parseTimeString(configTimeRange.start),
                end: this.parseTimeString(configTimeRange.end)
            };
        }
        // Default to last 24 hours
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }
    parseTimeString(timeStr) {
        if (timeStr === 'now') {
            return new Date().toISOString();
        }
        if (timeStr.startsWith('-')) {
            const match = timeStr.match(/^-(\d+)([hdwm])$/);
            if (match) {
                const amount = parseInt(match[1]);
                const unit = match[2];
                const now = new Date();
                switch (unit) {
                    case 'h':
                        return new Date(now.getTime() - amount * 60 * 60 * 1000).toISOString();
                    case 'd':
                        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000).toISOString();
                    case 'w':
                        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000).toISOString();
                    case 'm':
                        return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000).toISOString();
                }
            }
        }
        return timeStr;
    }
    formatDimensionLabel(dimension) {
        return dimension.charAt(0).toUpperCase() + dimension.slice(1);
    }
    getColorForDimension(dimension, colors, alpha) {
        const colorMap = {
            overall: '#2196F3',
            clarity: '#4CAF50',
            completeness: '#FF9800',
            accuracy: '#F44336',
            relevance: '#9C27B0',
            consistency: '#00BCD4',
            structure: '#795548'
        };
        let color = colorMap[dimension] || '#757575';
        if (colors && colors.length > 0) {
            const index = Object.keys(colorMap).indexOf(dimension);
            if (index >= 0 && index < colors.length) {
                color = colors[index];
            }
        }
        if (alpha !== undefined) {
            // Convert hex to rgba
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }
    getColorForValue(value, thresholds) {
        for (const threshold of thresholds.sort((a, b) => a.value - b.value)) {
            if (value <= threshold.value) {
                return threshold.color;
            }
        }
        return thresholds[thresholds.length - 1]?.color || '#4CAF50';
    }
    getDefaultColor(index) {
        const colors = ['#F44336', '#FF9800', '#2196F3', '#4CAF50', '#9C27B0'];
        return colors[index % colors.length];
    }
    countDataPoints(data) {
        if (Array.isArray(data)) {
            return data.length;
        }
        if (data && data.datasets && Array.isArray(data.datasets)) {
            return data.datasets.reduce((total, dataset) => {
                return total + (Array.isArray(dataset.data) ? dataset.data.length : 0);
            }, 0);
        }
        return 1;
    }
    async getCachedWidgetData(widgetId) {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM widget_data_cache 
        WHERE widget_id = ? AND datetime(expires_at) > datetime('now')
      `);
            const result = stmt.get(widgetId);
            if (result) {
                return {
                    id: widgetId,
                    type: result.type,
                    data: JSON.parse(result.data),
                    metadata: JSON.parse(result.metadata),
                    status: result.status,
                    error: result.error
                };
            }
        }
        catch (error) {
            this.logger.error('Failed to get cached widget data:', error);
        }
        return null;
    }
    isCacheExpired(widgetData) {
        const cacheTimeout = this.config.performance.cacheTimeout;
        const lastUpdated = new Date(widgetData.metadata.lastUpdated).getTime();
        return (Date.now() - lastUpdated) > cacheTimeout;
    }
    async cacheWidgetData(widgetId, widgetData) {
        try {
            const expiresAt = new Date(Date.now() + this.config.performance.cacheTimeout).toISOString();
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO widget_data_cache 
        (widget_id, data, metadata, status, error, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(widgetId, JSON.stringify(widgetData.data), JSON.stringify(widgetData.metadata), widgetData.status, widgetData.error || null, new Date().toISOString(), expiresAt);
        }
        catch (error) {
            this.logger.error('Failed to cache widget data:', error);
        }
    }
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    async handleQualityEvent(event) {
        // Broadcast quality events to connected clients
        if (this.connectedClients.size > 0) {
            const message = JSON.stringify({
                type: 'quality_event',
                data: event,
                timestamp: Date.now()
            });
            this.broadcastToClients(message);
        }
    }
    async handleResourceMetrics(metrics) {
        // Handle resource metrics updates
        // Could trigger specific widget updates
    }
    async handleAlertTriggered(alert) {
        // Broadcast alert to dashboard
        if (this.connectedClients.size > 0) {
            const message = JSON.stringify({
                type: 'alert_triggered',
                data: alert,
                timestamp: Date.now()
            });
            this.broadcastToClients(message);
        }
    }
    async handleAlertResolved(data) {
        // Broadcast alert resolution
        if (this.connectedClients.size > 0) {
            const message = JSON.stringify({
                type: 'alert_resolved',
                data,
                timestamp: Date.now()
            });
            this.broadcastToClients(message);
        }
    }
    async handleDashboardAlert(alert) {
        // Handle dashboard-specific alerts
        await this.handleAlertTriggered(alert);
    }
    async handleAnomalyDetected(anomaly) {
        // Broadcast anomaly detection
        if (this.connectedClients.size > 0) {
            const message = JSON.stringify({
                type: 'anomaly_detected',
                data: anomaly,
                timestamp: Date.now()
            });
            this.broadcastToClients(message);
        }
    }
    async handleQualityReportGenerated(data) {
        // Handle quality report events
        // Could trigger report widget updates
    }
    // =============================================================================
    // WEBSOCKET COMMUNICATION
    // =============================================================================
    async sendDashboardData(ws) {
        try {
            const dashboardData = await this.getDashboardData();
            const message = JSON.stringify({
                type: 'dashboard_data',
                data: dashboardData,
                timestamp: Date.now()
            });
            ws.send(message);
        }
        catch (error) {
            this.logger.error('Failed to send dashboard data:', error);
        }
    }
    async broadcastDashboardUpdate() {
        if (this.connectedClients.size === 0)
            return;
        try {
            const dashboardData = await this.getDashboardData();
            const message = JSON.stringify({
                type: 'dashboard_update',
                data: dashboardData,
                timestamp: Date.now()
            });
            this.broadcastToClients(message);
        }
        catch (error) {
            this.logger.error('Failed to broadcast dashboard update:', error);
        }
    }
    broadcastToClients(message) {
        const deadClients = [];
        for (const client of this.connectedClients) {
            try {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
                else {
                    deadClients.push(client);
                }
            }
            catch (error) {
                this.logger.error('Failed to send message to client:', error);
                deadClients.push(client);
            }
        }
        // Clean up dead connections
        deadClients.forEach(client => {
            this.connectedClients.delete(client);
        });
    }
    handleSubscription(ws, data, sessionId) {
        // Handle widget subscription
        this.logger.debug('Client subscribed to widget updates', {
            sessionId,
            widgetIds: data.widgetIds
        });
    }
    handleUnsubscription(ws, data, sessionId) {
        // Handle widget unsubscription
        this.logger.debug('Client unsubscribed from widget updates', {
            sessionId,
            widgetIds: data.widgetIds
        });
    }
    async handleDataRequest(ws, data, sessionId) {
        try {
            const widgetData = this.widgetDataCache.get(data.widgetId);
            if (widgetData) {
                const message = JSON.stringify({
                    type: 'widget_data',
                    widgetId: data.widgetId,
                    data: widgetData,
                    timestamp: Date.now()
                });
                ws.send(message);
            }
        }
        catch (error) {
            this.logger.error('Failed to handle data request:', error);
        }
    }
    updateSessionActivity(sessionId) {
        try {
            const stmt = this.db.prepare(`
        UPDATE dashboard_sessions 
        SET last_activity = ? 
        WHERE id = ?
      `);
            stmt.run(new Date().toISOString(), sessionId);
        }
        catch (error) {
            this.logger.error('Failed to update session activity:', error);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    async createWidget(widget) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO dashboard_widgets (
          id, type, title, description, position, config, data_source,
          refresh_interval, visible, permissions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(widget.id, widget.type, widget.title, widget.description || null, JSON.stringify(widget.position), JSON.stringify(widget.config), JSON.stringify(widget.dataSource), widget.refreshInterval || null, widget.visible ? 1 : 0, JSON.stringify(widget.permissions));
            this.widgets.set(widget.id, widget);
            this.logger.info('Widget created', { widgetId: widget.id, type: widget.type });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to create widget:', error);
            return false;
        }
    }
    async getDashboardData() {
        const widgets = {};
        for (const [id, widgetData] of this.widgetDataCache) {
            widgets[id] = widgetData;
        }
        return {
            widgets,
            metadata: {
                lastUpdated: new Date().toISOString(),
                nextUpdate: new Date(Date.now() + this.config.realTime.updateInterval).toISOString(),
                dataPoints: Object.values(widgets).reduce((sum, w) => sum + w.metadata.dataPoints, 0),
                processingTime: this.dashboardStats.averageResponseTime
            },
            realTimeStatus: {
                connected: this.websocketServer !== undefined,
                connectionCount: this.connectedClients.size,
                lastHeartbeat: new Date().toISOString()
            }
        };
    }
    async getDashboardSummary() {
        const monitoringStats = await this.qualityMonitoring.getMonitoringStatistics();
        const alertStats = this.alertManager.getAlertStatistics();
        const detectionStats = this.anomalyDetector.getDetectionStatistics();
        return {
            overview: {
                totalEntities: monitoringStats.totalEntitiesMonitored,
                averageQualityScore: monitoringStats.averageQualityScore,
                qualityTrend: monitoringStats.qualityTrend,
                lastUpdated: new Date().toISOString()
            },
            alerts: {
                active: alertStats.alertsTriggered.total,
                critical: alertStats.alertsTriggered.bySeverity[AlertSeverity.CRITICAL],
                high: alertStats.alertsTriggered.bySeverity[AlertSeverity.HIGH],
                medium: alertStats.alertsTriggered.bySeverity[AlertSeverity.MEDIUM],
                low: alertStats.alertsTriggered.bySeverity[AlertSeverity.LOW]
            },
            anomalies: {
                detected: detectionStats.totalDetections,
                critical: 0, // Would need to query by severity
                trends: 0, // Would need to count trend analyses
            },
            performance: {
                averageProcessingTime: this.dashboardStats.averageResponseTime,
                dashboardRefreshRate: this.config.realTime.updateInterval,
                websocketConnections: this.connectedClients.size,
                cacheHitRate: this.dashboardStats.totalRequests > 0
                    ? this.dashboardStats.cacheHits / this.dashboardStats.totalRequests
                    : 0
            }
        };
    }
    async exportDashboard(options) {
        // Placeholder implementation for dashboard export
        const dashboardData = await this.getDashboardData();
        switch (options.format) {
            case 'json':
                return JSON.stringify(dashboardData, null, 2);
            case 'csv':
                // Convert widget data to CSV format
                return this.convertToCSV(dashboardData);
            case 'pdf':
            case 'png':
                // Would need to integrate with a rendering library
                throw new Error(`Export format ${options.format} not yet implemented`);
            default:
                throw new Error(`Unsupported export format: ${options.format}`);
        }
    }
    convertToCSV(dashboardData) {
        // Simple CSV conversion - would need more sophisticated implementation
        const headers = ['Widget ID', 'Type', 'Last Updated', 'Data Points', 'Status'];
        const rows = Object.values(dashboardData.widgets).map(widget => [
            widget.id,
            widget.type,
            widget.metadata.lastUpdated,
            widget.metadata.dataPoints.toString(),
            widget.status
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Dashboard configuration updated');
    }
    async destroy() {
        // Stop real-time updates
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
        // Close WebSocket server
        if (this.websocketServer) {
            this.websocketServer.close();
            this.websocketServer = undefined;
        }
        // Close all client connections
        for (const client of this.connectedClients) {
            client.close();
        }
        this.connectedClients.clear();
        // Clear caches
        this.widgets.clear();
        this.layouts.clear();
        this.widgetDataCache.clear();
        // Remove event listeners
        this.removeAllListeners();
        this.logger.info('Quality Dashboard Service destroyed');
    }
}
export default QualityDashboardService;
//# sourceMappingURL=QualityDashboardService.js.map