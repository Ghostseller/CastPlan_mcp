import { EventEmitter } from 'events';
import { DatabaseManager } from '../utils/DatabaseManager';
/**
 * QualityReportingService - Comprehensive automated reporting system
 */
export class QualityReportingService extends EventEmitter {
    db;
    config;
    reportCache = new Map();
    scheduleIntervals = new Map();
    generationQueue = [];
    isProcessingQueue = false;
    constructor(config) {
        super();
        this.config = config;
        this.db = DatabaseManager.getInstance().getDatabase();
        this.initializeDatabase();
        this.startScheduler();
        // Emit initialization event
        this.emit('serviceInitialized', {
            service: 'QualityReportingService',
            timestamp: new Date(),
            config: this.config
        });
    }
    /**
     * Initialize database tables for quality reporting
     */
    initializeDatabase() {
        // Report configurations table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_report_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        schedule_frequency TEXT NOT NULL,
        schedule_time TEXT,
        schedule_day_of_week INTEGER,
        schedule_day_of_month INTEGER,
        schedule_timezone TEXT NOT NULL,
        next_run DATETIME,
        format TEXT NOT NULL,
        recipients TEXT NOT NULL, -- JSON array
        include_charts BOOLEAN DEFAULT 1,
        include_trends BOOLEAN DEFAULT 1,
        include_recommendations BOOLEAN DEFAULT 1,
        filter_criteria TEXT NOT NULL, -- JSON object
        custom_metrics TEXT, -- JSON array
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Generated reports table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_reports (
        id TEXT PRIMARY KEY,
        config_id TEXT NOT NULL,
        name TEXT NOT NULL,
        format TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        summary TEXT NOT NULL, -- JSON object
        sections TEXT NOT NULL, -- JSON array
        status TEXT DEFAULT 'generating',
        file_path TEXT,
        file_size INTEGER,
        generation_time_ms INTEGER,
        delivered_at DATETIME,
        FOREIGN KEY (config_id) REFERENCES quality_report_configs (id)
      )
    `);
        // Report delivery log
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_report_deliveries (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        method TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        delivered_at DATETIME,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        FOREIGN KEY (report_id) REFERENCES quality_reports (id)
      )
    `);
        // Create indexes for performance
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_report_configs_next_run ON quality_report_configs (next_run);
      CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON quality_reports (generated_at);
      CREATE INDEX IF NOT EXISTS idx_reports_config_id ON quality_reports (config_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_report_id ON quality_report_deliveries (report_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON quality_report_deliveries (status);
    `);
    }
    /**
     * Create a new report configuration
     */
    async createReportConfig(config) {
        const startTime = Date.now();
        const reportConfig = {
            ...config,
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Calculate next run time
        const nextRun = this.calculateNextRun(reportConfig.schedule);
        try {
            // Insert into database
            const stmt = this.db.prepare(`
        INSERT INTO quality_report_configs (
          id, name, description, schedule_frequency, schedule_time,
          schedule_day_of_week, schedule_day_of_month, schedule_timezone,
          next_run, format, recipients, include_charts, include_trends,
          include_recommendations, filter_criteria, custom_metrics, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(reportConfig.id, reportConfig.name, reportConfig.description, reportConfig.schedule.frequency, reportConfig.schedule.time, reportConfig.schedule.dayOfWeek, reportConfig.schedule.dayOfMonth, reportConfig.schedule.timezone, nextRun?.toISOString(), reportConfig.format, JSON.stringify(reportConfig.recipients), reportConfig.includeCharts ? 1 : 0, reportConfig.includeTrends ? 1 : 0, reportConfig.includeRecommendations ? 1 : 0, JSON.stringify(reportConfig.filterCriteria), reportConfig.customMetrics ? JSON.stringify(reportConfig.customMetrics) : null, reportConfig.enabled ? 1 : 0);
            // Schedule the report if enabled
            if (reportConfig.enabled) {
                this.scheduleReport(reportConfig);
            }
            const processingTime = Date.now() - startTime;
            this.emit('reportConfigCreated', {
                configId: reportConfig.id,
                name: reportConfig.name,
                processingTime,
                timestamp: new Date()
            });
            return reportConfig;
        }
        catch (error) {
            this.emit('reportConfigError', {
                configId: reportConfig.id,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }
    /**
     * Generate a quality report based on configuration
     */
    async generateReport(configId, adhoc = false) {
        const startTime = Date.now();
        try {
            // Get report configuration
            const config = await this.getReportConfig(configId);
            if (!config) {
                throw new Error(`Report configuration not found: ${configId}`);
            }
            // Determine report period
            const period = this.calculateReportPeriod(config.filterCriteria.dateRange);
            // Create report object
            const report = {
                id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                configId: config.id,
                name: `${config.name} - ${period.start.toLocaleDateString()}`,
                format: config.format,
                generatedAt: new Date(),
                period,
                summary: await this.generateReportSummary(config, period),
                sections: await this.generateReportSections(config, period),
                status: 'generating',
                generationTimeMs: 0
            };
            // Insert report record
            await this.insertReportRecord(report);
            // Generate report content based on format
            await this.generateReportContent(report, config);
            // Update generation time and status
            const generationTime = Date.now() - startTime;
            report.generationTimeMs = generationTime;
            report.status = 'completed';
            await this.updateReportStatus(report.id, 'completed', generationTime);
            // Cache the report
            if (this.config.cacheReportsEnabled) {
                this.reportCache.set(report.id, report);
                // Clean cache after retention period
                setTimeout(() => {
                    this.reportCache.delete(report.id);
                }, this.config.cacheRetentionMinutes * 60 * 1000);
            }
            // Deliver report if not adhoc
            if (!adhoc) {
                await this.deliverReport(report, config);
            }
            this.emit('reportGenerated', {
                reportId: report.id,
                configId: config.id,
                generationTime,
                period,
                summary: report.summary,
                timestamp: new Date()
            });
            return report;
        }
        catch (error) {
            this.emit('reportGenerationError', {
                configId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }
    /**
     * Generate report summary with key metrics and insights
     */
    async generateReportSummary(config, period) {
        // Query quality metrics for the period
        const metricsQuery = `
      SELECT service_name, metric_type, value, score, severity, timestamp
      FROM quality_metrics 
      WHERE timestamp BETWEEN ? AND ?
      ${config.filterCriteria.services?.length ? `AND service_name IN (${config.filterCriteria.services.map(() => '?').join(',')})` : ''}
      ${config.filterCriteria.qualityTypes?.length ? `AND metric_type IN (${config.filterCriteria.qualityTypes.map(() => '?').join(',')})` : ''}
      ${config.filterCriteria.minScore ? 'AND score >= ?' : ''}
      ${config.filterCriteria.maxScore ? 'AND score <= ?' : ''}
      ORDER BY timestamp DESC
    `;
        const params = [period.start.toISOString(), period.end.toISOString()];
        if (config.filterCriteria.services?.length) {
            params.push(...config.filterCriteria.services);
        }
        if (config.filterCriteria.qualityTypes?.length) {
            params.push(...config.filterCriteria.qualityTypes);
        }
        if (config.filterCriteria.minScore) {
            params.push(config.filterCriteria.minScore.toString());
        }
        if (config.filterCriteria.maxScore) {
            params.push(config.filterCriteria.maxScore.toString());
        }
        const metrics = this.db.prepare(metricsQuery).all(...params);
        // Calculate summary statistics
        const totalMetrics = metrics.length;
        const averageQualityScore = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
            : 0;
        // Get previous period for comparison
        const previousPeriod = {
            start: new Date(period.start.getTime() - (period.end.getTime() - period.start.getTime())),
            end: period.start
        };
        const previousMetrics = this.db.prepare(metricsQuery).all(previousPeriod.start.toISOString(), previousPeriod.end.toISOString(), ...(params.slice(2)));
        const previousAverageScore = previousMetrics.length > 0
            ? previousMetrics.reduce((sum, m) => sum + m.score, 0) / previousMetrics.length
            : averageQualityScore;
        const scoreChange = averageQualityScore - previousAverageScore;
        // Count issues by severity
        const issuesBySeververity = metrics.reduce((acc, m) => {
            if (m.severity) {
                acc[m.severity] = (acc[m.severity] || 0) + 1;
            }
            return acc;
        }, {});
        const criticalIssues = issuesBySeververity.critical || 0;
        const totalIssues = Object.values(issuesBySeververity).reduce((sum, count) => sum + count, 0);
        // Top services by performance
        const serviceStats = metrics.reduce((acc, m) => {
            if (!acc[m.service_name]) {
                acc[m.service_name] = { scores: [], issues: 0 };
            }
            acc[m.service_name].scores.push(m.score);
            if (m.severity && ['medium', 'high', 'critical'].includes(m.severity)) {
                acc[m.service_name].issues++;
            }
            return acc;
        }, {});
        const topServices = Object.entries(serviceStats)
            .map(([serviceName, stats]) => ({
            serviceName,
            averageScore: stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length,
            issueCount: stats.issues
        }))
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, 5);
        // Determine quality trend
        const qualityTrend = scoreChange > 5 ? 'improving' :
            scoreChange < -5 ? 'declining' : 'stable';
        // Generate key insights
        const keyInsights = this.generateKeyInsights(metrics, scoreChange, topServices);
        // Generate recommendations
        const recommendations = this.generateRecommendations(metrics, qualityTrend, criticalIssues);
        return {
            totalMetrics,
            averageQualityScore: Math.round(averageQualityScore * 100) / 100,
            scoreChange: Math.round(scoreChange * 100) / 100,
            totalIssues,
            criticalIssues,
            resolvedIssues: 0, // Would need additional tracking
            topServices,
            qualityTrend,
            keyInsights,
            recommendations
        };
    }
    /**
     * Generate key insights from metrics analysis
     */
    generateKeyInsights(metrics, scoreChange, topServices) {
        const insights = [];
        if (scoreChange > 10) {
            insights.push(`Quality scores improved significantly by ${scoreChange.toFixed(1)} points`);
        }
        else if (scoreChange < -10) {
            insights.push(`Quality scores declined by ${Math.abs(scoreChange).toFixed(1)} points - attention needed`);
        }
        if (topServices.length > 0) {
            const bestService = topServices[0];
            const worstService = topServices[topServices.length - 1];
            insights.push(`${bestService.serviceName} shows highest quality (${bestService.averageScore.toFixed(1)})`);
            if (worstService.averageScore < 70) {
                insights.push(`${worstService.serviceName} needs attention (${worstService.averageScore.toFixed(1)} score)`);
            }
        }
        // Analyze patterns by time of day, day of week, etc.
        const hourlyDistribution = metrics.reduce((acc, m) => {
            const hour = new Date(m.timestamp).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const peakHour = Object.entries(hourlyDistribution)
            .sort(([, a], [, b]) => b - a)[0];
        if (peakHour) {
            insights.push(`Peak quality monitoring activity at ${peakHour[0]}:00 (${peakHour[1]} metrics)`);
        }
        return insights;
    }
    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(metrics, trend, criticalIssues) {
        const recommendations = [];
        if (criticalIssues > 0) {
            recommendations.push(`Address ${criticalIssues} critical quality issues immediately`);
        }
        if (trend === 'declining') {
            recommendations.push('Implement quality improvement initiatives to reverse declining trend');
            recommendations.push('Review and strengthen quality assurance processes');
        }
        // Analyze metric types for specific recommendations
        const metricTypes = metrics.reduce((acc, m) => {
            acc[m.metric_type] = (acc[m.metric_type] || 0) + 1;
            return acc;
        }, {});
        if (metricTypes.performance_issue > metricTypes.security_issue) {
            recommendations.push('Focus on performance optimization initiatives');
        }
        if (metricTypes.security_issue > 0) {
            recommendations.push('Conduct comprehensive security audit and remediation');
        }
        recommendations.push('Continue regular quality monitoring and trend analysis');
        recommendations.push('Consider implementing automated quality gates in CI/CD pipeline');
        return recommendations;
    }
    /**
     * Generate report sections based on configuration
     */
    async generateReportSections(config, period) {
        const sections = [];
        // Overview section
        sections.push({
            title: 'Executive Summary',
            type: 'overview',
            data: {
                period: `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`,
                reportGenerated: new Date().toLocaleString(),
                scope: config.filterCriteria
            },
            order: 1
        });
        // Metrics section
        if (config.includeCharts) {
            sections.push({
                title: 'Quality Metrics Overview',
                type: 'metrics',
                data: await this.generateMetricsData(config, period),
                order: 2
            });
        }
        // Trends section
        if (config.includeTrends) {
            sections.push({
                title: 'Quality Trends Analysis',
                type: 'trends',
                data: await this.generateTrendsData(config, period),
                order: 3
            });
        }
        // Issues section
        sections.push({
            title: 'Quality Issues and Alerts',
            type: 'issues',
            data: await this.generateIssuesData(config, period),
            order: 4
        });
        // Recommendations section
        if (config.includeRecommendations) {
            sections.push({
                title: 'Recommendations and Action Items',
                type: 'recommendations',
                data: await this.generateRecommendationsData(config, period),
                order: 5
            });
        }
        return sections.sort((a, b) => a.order - b.order);
    }
    /**
     * Generate metrics data for report section
     */
    async generateMetricsData(config, period) {
        const metricsQuery = `
      SELECT service_name, metric_type, value, score, severity, timestamp
      FROM quality_metrics 
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `;
        const metrics = this.db.prepare(metricsQuery).all(period.start.toISOString(), period.end.toISOString());
        return {
            totalMetrics: metrics.length,
            metricsByType: metrics.reduce((acc, m) => {
                acc[m.metric_type] = (acc[m.metric_type] || 0) + 1;
                return acc;
            }, {}),
            metricsByService: metrics.reduce((acc, m) => {
                acc[m.service_name] = (acc[m.service_name] || 0) + 1;
                return acc;
            }, {}),
            averageScores: metrics.reduce((acc, m) => {
                if (!acc[m.service_name])
                    acc[m.service_name] = [];
                acc[m.service_name].push(m.score);
                return acc;
            }, {})
        };
    }
    /**
     * Generate trends data for report section
     */
    async generateTrendsData(config, period) {
        // Query metrics with daily aggregation
        const trendsQuery = `
      SELECT 
        DATE(timestamp) as date,
        service_name,
        AVG(score) as avg_score,
        COUNT(*) as metric_count
      FROM quality_metrics 
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp), service_name
      ORDER BY date ASC
    `;
        const trends = this.db.prepare(trendsQuery).all(period.start.toISOString(), period.end.toISOString());
        return {
            dailyTrends: trends,
            trendAnalysis: this.analyzeTrends(trends)
        };
    }
    /**
     * Analyze trends in the data
     */
    analyzeTrends(trends) {
        if (trends.length < 2)
            return { direction: 'insufficient_data' };
        const firstWeek = trends.slice(0, 7);
        const lastWeek = trends.slice(-7);
        const firstWeekAvg = firstWeek.reduce((sum, t) => sum + t.avg_score, 0) / firstWeek.length;
        const lastWeekAvg = lastWeek.reduce((sum, t) => sum + t.avg_score, 0) / lastWeek.length;
        const change = lastWeekAvg - firstWeekAvg;
        const direction = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';
        return {
            direction,
            change: Math.round(change * 100) / 100,
            firstWeekAvg: Math.round(firstWeekAvg * 100) / 100,
            lastWeekAvg: Math.round(lastWeekAvg * 100) / 100
        };
    }
    /**
     * Generate issues data for report section
     */
    async generateIssuesData(config, period) {
        const alertsQuery = `
      SELECT alert_id, service_name, alert_type, severity, message, timestamp, status
      FROM quality_alerts 
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY severity DESC, timestamp DESC
    `;
        const alerts = this.db.prepare(alertsQuery).all(period.start.toISOString(), period.end.toISOString());
        return {
            totalAlerts: alerts.length,
            alertsBySeverity: alerts.reduce((acc, a) => {
                acc[a.severity] = (acc[a.severity] || 0) + 1;
                return acc;
            }, {}),
            alertsByService: alerts.reduce((acc, a) => {
                acc[a.service_name] = (acc[a.service_name] || 0) + 1;
                return acc;
            }, {}),
            criticalAlerts: alerts.filter(a => a.severity === 'critical'),
            resolvedAlerts: alerts.filter(a => a.status === 'resolved').length
        };
    }
    /**
     * Generate recommendations data for report section
     */
    async generateRecommendationsData(config, period) {
        // This would integrate with AI-based recommendation engine
        // For now, providing structured recommendations based on patterns
        return {
            immediate: [
                'Address all critical severity alerts within 24 hours',
                'Review services with declining quality trends',
                'Implement automated monitoring for high-risk areas'
            ],
            shortTerm: [
                'Enhance quality gates in CI/CD pipeline',
                'Increase monitoring coverage for critical services',
                'Implement predictive quality analytics'
            ],
            longTerm: [
                'Establish quality SLAs and performance targets',
                'Implement AI-driven quality optimization',
                'Create comprehensive quality culture training'
            ]
        };
    }
    /**
     * Generate report content based on format
     */
    async generateReportContent(report, config) {
        const reportDir = 'reports/quality';
        const fileName = `${report.id}.${report.format}`;
        const filePath = `${reportDir}/${fileName}`;
        // Ensure directory exists
        const fs = require('fs').promises;
        await fs.mkdir(reportDir, { recursive: true });
        switch (report.format) {
            case 'json':
                await this.generateJSONReport(report, filePath);
                break;
            case 'html':
                await this.generateHTMLReport(report, filePath);
                break;
            case 'csv':
                await this.generateCSVReport(report, filePath);
                break;
            case 'pdf':
                await this.generatePDFReport(report, filePath);
                break;
            default:
                throw new Error(`Unsupported report format: ${report.format}`);
        }
        // Update report with file info
        const stats = await fs.stat(filePath);
        report.filePath = filePath;
        report.fileSize = stats.size;
    }
    /**
     * Generate JSON format report
     */
    async generateJSONReport(report, filePath) {
        const fs = require('fs').promises;
        const reportData = {
            metadata: {
                id: report.id,
                name: report.name,
                generatedAt: report.generatedAt,
                period: report.period
            },
            summary: report.summary,
            sections: report.sections
        };
        await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
    }
    /**
     * Generate HTML format report
     */
    async generateHTMLReport(report, filePath) {
        const fs = require('fs').promises;
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .trend-up { color: #27ae60; }
        .trend-down { color: #e74c3c; }
        .trend-stable { color: #f39c12; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; }
        .severity-medium { color: #ffc107; }
        .severity-low { color: #28a745; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; }
        .chart-placeholder { background: #f8f9fa; height: 300px; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.name}</h1>
        <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
        <p><strong>Period:</strong> ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalMetrics}</div>
                <div>Total Metrics</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.averageQualityScore.toFixed(1)}</div>
                <div>Avg Quality Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${report.summary.scoreChange > 0 ? 'trend-up' : report.summary.scoreChange < 0 ? 'trend-down' : 'trend-stable'}">
                    ${report.summary.scoreChange > 0 ? '+' : ''}${report.summary.scoreChange.toFixed(1)}
                </div>
                <div>Score Change</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${report.summary.criticalIssues > 0 ? 'severity-critical' : ''}">${report.summary.criticalIssues}</div>
                <div>Critical Issues</div>
            </div>
        </div>
    </div>

    ${report.sections.map(section => `
        <div class="section">
            <h2>${section.title}</h2>
            ${this.generateHTMLSectionContent(section)}
        </div>
    `).join('')}

    <div class="section recommendations">
        <h2>Key Insights & Recommendations</h2>
        <h3>Key Insights:</h3>
        <ul>
            ${report.summary.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
        <h3>Recommendations:</h3>
        <ul>
            ${report.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
        await fs.writeFile(filePath, html);
    }
    /**
     * Generate HTML content for a report section
     */
    generateHTMLSectionContent(section) {
        switch (section.type) {
            case 'metrics':
                return `
          <div class="chart-placeholder">Metrics visualization would be rendered here</div>
          <table>
            <tr><th>Metric Type</th><th>Count</th></tr>
            ${Object.entries(section.data.metricsByType || {}).map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`).join('')}
          </table>
        `;
            case 'trends':
                return `
          <div class="chart-placeholder">Trend analysis charts would be rendered here</div>
          <p><strong>Trend Direction:</strong> ${section.data.trendAnalysis?.direction || 'N/A'}</p>
        `;
            case 'issues':
                return `
          <table>
            <tr><th>Severity</th><th>Count</th></tr>
            ${Object.entries(section.data.alertsBySeverity || {}).map(([severity, count]) => `<tr><td class="severity-${severity}">${severity}</td><td>${count}</td></tr>`).join('')}
          </table>
        `;
            default:
                return '<p>Section content not implemented for HTML format</p>';
        }
    }
    /**
     * Generate CSV format report
     */
    async generateCSVReport(report, filePath) {
        const fs = require('fs').promises;
        // Simple CSV with summary data
        const csvData = [
            ['Metric', 'Value'],
            ['Report Name', report.name],
            ['Generated At', report.generatedAt.toISOString()],
            ['Period Start', report.period.start.toISOString()],
            ['Period End', report.period.end.toISOString()],
            ['Total Metrics', report.summary.totalMetrics.toString()],
            ['Average Quality Score', report.summary.averageQualityScore.toString()],
            ['Score Change', report.summary.scoreChange.toString()],
            ['Total Issues', report.summary.totalIssues.toString()],
            ['Critical Issues', report.summary.criticalIssues.toString()],
            ['Quality Trend', report.summary.qualityTrend]
        ];
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        await fs.writeFile(filePath, csvContent);
    }
    /**
     * Generate PDF format report (placeholder - would need PDF library)
     */
    async generatePDFReport(report, filePath) {
        // This would require a PDF generation library like puppeteer or jsPDF
        // For now, creating a simple text file
        const fs = require('fs').promises;
        const content = `
QUALITY REPORT
${report.name}
Generated: ${report.generatedAt.toLocaleString()}
Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}

EXECUTIVE SUMMARY
Total Metrics: ${report.summary.totalMetrics}
Average Quality Score: ${report.summary.averageQualityScore.toFixed(2)}
Score Change: ${report.summary.scoreChange.toFixed(2)}
Total Issues: ${report.summary.totalIssues}
Critical Issues: ${report.summary.criticalIssues}
Quality Trend: ${report.summary.qualityTrend}

KEY INSIGHTS
${report.summary.keyInsights.map(insight => `- ${insight}`).join('\n')}

RECOMMENDATIONS
${report.summary.recommendations.map(rec => `- ${rec}`).join('\n')}
    `;
        await fs.writeFile(filePath.replace('.pdf', '.txt'), content);
    }
    /**
     * Deliver report to configured recipients
     */
    async deliverReport(report, config) {
        const deliveryPromises = config.recipients.map(async (recipient) => {
            try {
                await this.deliverToRecipient(report, recipient);
                // Log successful delivery
                await this.logDelivery(report.id, 'email', recipient, 'delivered');
            }
            catch (error) {
                // Log failed delivery
                await this.logDelivery(report.id, 'email', recipient, 'failed', error.message);
                this.emit('reportDeliveryError', {
                    reportId: report.id,
                    recipient,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        });
        await Promise.allSettled(deliveryPromises);
    }
    /**
     * Deliver report to a specific recipient
     */
    async deliverToRecipient(report, recipient) {
        // This would integrate with actual email service
        // For now, just logging the delivery
        console.log(`Delivering report ${report.id} to ${recipient}`);
        // Simulate delivery time
        await new Promise(resolve => setTimeout(resolve, 100));
        this.emit('reportDelivered', {
            reportId: report.id,
            recipient,
            deliveryTime: 100,
            timestamp: new Date()
        });
    }
    /**
     * Log delivery attempt
     */
    async logDelivery(reportId, method, recipient, status, errorMessage) {
        const stmt = this.db.prepare(`
      INSERT INTO quality_report_deliveries (id, report_id, method, recipient, status, delivered_at, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(`del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, reportId, method, recipient, status, status === 'delivered' ? new Date().toISOString() : null, errorMessage || null);
    }
    /**
     * Start report scheduler
     */
    startScheduler() {
        // Check for scheduled reports every minute
        setInterval(() => {
            this.checkScheduledReports();
        }, 60000);
        this.emit('schedulerStarted', {
            timestamp: new Date(),
            checkInterval: 60000
        });
    }
    /**
     * Check for reports that need to be generated
     */
    async checkScheduledReports() {
        const now = new Date();
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM quality_report_configs 
        WHERE enabled = 1 AND next_run <= ? AND next_run IS NOT NULL
      `);
            const dueReports = stmt.all(now.toISOString());
            for (const config of dueReports) {
                // Add to generation queue
                this.generationQueue.push(config.id);
                // Update next run time
                const nextRun = this.calculateNextRun({
                    frequency: config.schedule_frequency,
                    time: config.schedule_time,
                    dayOfWeek: config.schedule_day_of_week,
                    dayOfMonth: config.schedule_day_of_month,
                    timezone: config.schedule_timezone
                });
                const updateStmt = this.db.prepare(`
          UPDATE quality_report_configs SET next_run = ? WHERE id = ?
        `);
                updateStmt.run(nextRun?.toISOString(), config.id);
            }
            // Process generation queue
            if (!this.isProcessingQueue && this.generationQueue.length > 0) {
                this.processGenerationQueue();
            }
        }
        catch (error) {
            this.emit('schedulerError', {
                error: error.message,
                timestamp: new Date()
            });
        }
    }
    /**
     * Process the report generation queue
     */
    async processGenerationQueue() {
        if (this.isProcessingQueue)
            return;
        this.isProcessingQueue = true;
        try {
            while (this.generationQueue.length > 0) {
                const configId = this.generationQueue.shift();
                if (configId) {
                    await this.generateReport(configId);
                    // Respect rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        catch (error) {
            this.emit('queueProcessingError', {
                error: error.message,
                timestamp: new Date()
            });
        }
        finally {
            this.isProcessingQueue = false;
        }
    }
    /**
     * Calculate next run time for a schedule
     */
    calculateNextRun(schedule) {
        const now = new Date();
        let nextRun;
        switch (schedule.frequency) {
            case 'daily':
                nextRun = new Date(now);
                nextRun.setDate(nextRun.getDate() + 1);
                if (schedule.time) {
                    const [hours, minutes] = schedule.time.split(':').map(Number);
                    nextRun.setHours(hours, minutes, 0, 0);
                }
                break;
            case 'weekly':
                nextRun = new Date(now);
                nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + (schedule.dayOfWeek || 0)) % 7);
                if (schedule.time) {
                    const [hours, minutes] = schedule.time.split(':').map(Number);
                    nextRun.setHours(hours, minutes, 0, 0);
                }
                break;
            case 'monthly':
                nextRun = new Date(now);
                nextRun.setMonth(nextRun.getMonth() + 1, schedule.dayOfMonth || 1);
                if (schedule.time) {
                    const [hours, minutes] = schedule.time.split(':').map(Number);
                    nextRun.setHours(hours, minutes, 0, 0);
                }
                break;
            case 'quarterly':
                nextRun = new Date(now);
                nextRun.setMonth(nextRun.getMonth() + 3, schedule.dayOfMonth || 1);
                if (schedule.time) {
                    const [hours, minutes] = schedule.time.split(':').map(Number);
                    nextRun.setHours(hours, minutes, 0, 0);
                }
                break;
            default:
                return null;
        }
        return nextRun;
    }
    /**
     * Calculate report period based on date range configuration
     */
    calculateReportPeriod(dateRange) {
        const now = new Date();
        if (dateRange.start && dateRange.end) {
            return { start: dateRange.start, end: dateRange.end };
        }
        if (dateRange.relativePeriod) {
            const end = new Date(now);
            let start;
            switch (dateRange.relativePeriod) {
                case 'last24h':
                    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case 'last7d':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'last30d':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'last90d':
                    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
            return { start, end };
        }
        // Default to last 24 hours
        return {
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            end: now
        };
    }
    /**
     * Get report configuration by ID
     */
    async getReportConfig(configId) {
        const stmt = this.db.prepare('SELECT * FROM quality_report_configs WHERE id = ?');
        const row = stmt.get(configId);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            schedule: {
                frequency: row.schedule_frequency,
                time: row.schedule_time,
                dayOfWeek: row.schedule_day_of_week,
                dayOfMonth: row.schedule_day_of_month,
                timezone: row.schedule_timezone,
                nextRun: row.next_run ? new Date(row.next_run) : undefined
            },
            format: row.format,
            recipients: JSON.parse(row.recipients),
            includeCharts: row.include_charts === 1,
            includeTrends: row.include_trends === 1,
            includeRecommendations: row.include_recommendations === 1,
            filterCriteria: JSON.parse(row.filter_criteria),
            customMetrics: row.custom_metrics ? JSON.parse(row.custom_metrics) : undefined,
            enabled: row.enabled === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    /**
     * Insert report record into database
     */
    async insertReportRecord(report) {
        const stmt = this.db.prepare(`
      INSERT INTO quality_reports (
        id, config_id, name, format, period_start, period_end,
        summary, sections, status, generation_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(report.id, report.configId, report.name, report.format, report.period.start.toISOString(), report.period.end.toISOString(), JSON.stringify(report.summary), JSON.stringify(report.sections), report.status, report.generationTimeMs);
    }
    /**
     * Update report status in database
     */
    async updateReportStatus(reportId, status, generationTime) {
        const stmt = this.db.prepare(`
      UPDATE quality_reports 
      SET status = ?, generation_time_ms = ?
      WHERE id = ?
    `);
        stmt.run(status, generationTime || null, reportId);
    }
    /**
     * Schedule a specific report configuration
     */
    scheduleReport(config) {
        if (this.scheduleIntervals.has(config.id)) {
            clearInterval(this.scheduleIntervals.get(config.id));
        }
        // Calculate next run time
        const nextRun = this.calculateNextRun(config.schedule);
        if (!nextRun)
            return;
        const timeUntilRun = nextRun.getTime() - Date.now();
        const timeout = setTimeout(async () => {
            await this.generateReport(config.id);
            // Reschedule for next run
            this.scheduleReport(config);
        }, timeUntilRun);
        this.scheduleIntervals.set(config.id, timeout);
    }
    /**
     * Get report by ID
     */
    async getReport(reportId) {
        // Check cache first
        if (this.reportCache.has(reportId)) {
            return this.reportCache.get(reportId);
        }
        // Query database
        const stmt = this.db.prepare('SELECT * FROM quality_reports WHERE id = ?');
        const row = stmt.get(reportId);
        if (!row)
            return null;
        const report = {
            id: row.id,
            configId: row.config_id,
            name: row.name,
            format: row.format,
            generatedAt: new Date(row.generated_at),
            period: {
                start: new Date(row.period_start),
                end: new Date(row.period_end)
            },
            summary: JSON.parse(row.summary),
            sections: JSON.parse(row.sections),
            status: row.status,
            filePath: row.file_path,
            fileSize: row.file_size,
            generationTimeMs: row.generation_time_ms || 0
        };
        return report;
    }
    /**
     * List all report configurations
     */
    async listReportConfigs() {
        const stmt = this.db.prepare('SELECT * FROM quality_report_configs ORDER BY created_at DESC');
        const rows = stmt.all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            schedule: {
                frequency: row.schedule_frequency,
                time: row.schedule_time,
                dayOfWeek: row.schedule_day_of_week,
                dayOfMonth: row.schedule_day_of_month,
                timezone: row.schedule_timezone,
                nextRun: row.next_run ? new Date(row.next_run) : undefined
            },
            format: row.format,
            recipients: JSON.parse(row.recipients),
            includeCharts: row.include_charts === 1,
            includeTrends: row.include_trends === 1,
            includeRecommendations: row.include_recommendations === 1,
            filterCriteria: JSON.parse(row.filter_criteria),
            customMetrics: row.custom_metrics ? JSON.parse(row.custom_metrics) : undefined,
            enabled: row.enabled === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }
    /**
     * Clean up old reports based on retention policy
     */
    async cleanupOldReports() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.reportRetentionDays);
        const stmt = this.db.prepare(`
      DELETE FROM quality_reports 
      WHERE generated_at < ?
    `);
        const result = stmt.run(cutoffDate.toISOString());
        const deletedCount = result.changes;
        this.emit('reportsCleanedUp', {
            deletedCount,
            cutoffDate,
            timestamp: new Date()
        });
        return deletedCount;
    }
    /**
     * Get service performance metrics and status
     */
    getServiceMetrics() {
        return {
            reportCache: {
                size: this.reportCache.size,
                maxSize: 100 // Could be configurable
            },
            generationQueue: {
                length: this.generationQueue.length,
                isProcessing: this.isProcessingQueue
            },
            scheduledReports: this.scheduleIntervals.size,
            config: this.config
        };
    }
    /**
     * Shutdown service gracefully
     */
    async shutdown() {
        // Clear all intervals
        for (const interval of this.scheduleIntervals.values()) {
            clearInterval(interval);
        }
        this.scheduleIntervals.clear();
        // Clear cache
        this.reportCache.clear();
        // Process remaining queue items
        if (this.generationQueue.length > 0) {
            console.log(`Processing ${this.generationQueue.length} remaining reports...`);
            await this.processGenerationQueue();
        }
        this.emit('serviceShutdown', {
            timestamp: new Date()
        });
    }
}
/**
 * Default configuration for QualityReportingService
 */
export const defaultQualityReportingConfig = {
    enabledReports: true,
    maxConcurrentReports: 3,
    reportRetentionDays: 90,
    defaultTimezone: 'UTC',
    cacheReportsEnabled: true,
    cacheRetentionMinutes: 60,
    delivery: {
        method: 'email',
        emailConfig: {
            smtpHost: 'localhost',
            smtpPort: 587,
            secure: false,
            username: '',
            password: '',
            fromAddress: 'noreply@castplan.com'
        }
    },
    performance: {
        maxGenerationTimeMs: 2000,
        maxDeliveryTimeMs: 10000,
        batchSize: 1000
    }
};
//# sourceMappingURL=QualityReportingService.js.map