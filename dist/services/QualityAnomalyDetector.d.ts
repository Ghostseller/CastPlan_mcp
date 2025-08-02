/**
 * Quality Anomaly Detector - Phase 4 Week 4
 *
 * CastPlan MCP Autonomous Quality Service - Advanced Anomaly Detection
 * Statistical anomaly detection and trend analysis for quality monitoring
 * with machine learning capabilities and predictive analytics.
 *
 * Features:
 * - Statistical anomaly detection (Z-score, IQR, Isolation Forest)
 * - Quality trend analysis with seasonal decomposition
 * - Predictive quality modeling and forecasting
 * - Multi-dimensional anomaly detection
 * - Real-time pattern recognition
 * - Adaptive thresholds based on historical data
 * - Anomaly correlation and root cause analysis
 * - Performance optimized for >90% accuracy requirement
 *
 * Algorithms:
 * - Z-Score: Statistical outlier detection
 * - Modified Z-Score: Robust outlier detection using MAD
 * - Interquartile Range (IQR): Box plot outlier detection
 * - Isolation Forest: Machine learning anomaly detection
 * - ARIMA: Time series forecasting and trend analysis
 * - Seasonal Decomposition: Seasonal trend analysis
 * - Change Point Detection: Sudden change identification
 *
 * Integration points:
 * - QualityMonitoringService for real-time quality data
 * - QualityMetricsCollector for historical data analysis
 * - QualityAlertManager for anomaly-based alerting
 * - Statistical analysis libraries for advanced algorithms
 *
 * Performance requirements:
 * - Anomaly detection accuracy >90%
 * - Real-time detection latency <200ms
 * - Trend analysis processing <1 second
 * - Historical analysis batch processing <5 seconds per 1000 records
 *
 * Created: 2025-07-31
 * Author: Data Scientist & Quality Systems Analyst
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { RealTimeQualitySnapshot } from './QualityMonitoringService';
import { QualityMetric } from './QualityMetricsCollector';
export interface AnomalyDetectionConfig {
    /** Anomaly detection algorithms to use */
    algorithms: {
        zscore: ZScoreConfig;
        modifiedZscore: ModifiedZScoreConfig;
        iqr: IQRConfig;
        isolationForest: IsolationForestConfig;
    };
    /** Trend analysis configuration */
    trendAnalysis: {
        enabled: boolean;
        windowSize: number;
        seasonalPeriod: number;
        changePointSensitivity: number;
        forecastHorizon: number;
    };
    /** Data processing configuration */
    dataProcessing: {
        minDataPoints: number;
        maxHistorySize: number;
        cleanupInterval: number;
        batchSize: number;
    };
    /** Performance optimization */
    performance: {
        enableCaching: boolean;
        cacheSize: number;
        enableParallelProcessing: boolean;
        maxConcurrentAnalysis: number;
    };
    /** Alerting thresholds */
    thresholds: {
        anomalyScore: number;
        trendSignificance: number;
        changePointThreshold: number;
    };
}
export interface ZScoreConfig {
    enabled: boolean;
    threshold: number;
    windowSize: number;
}
export interface ModifiedZScoreConfig {
    enabled: boolean;
    threshold: number;
    windowSize: number;
}
export interface IQRConfig {
    enabled: boolean;
    multiplier: number;
    windowSize: number;
}
export interface IsolationForestConfig {
    enabled: boolean;
    contamination: number;
    nEstimators: number;
    maxSamples: number;
}
export interface QualityAnomaly {
    id: string;
    type: AnomalyType;
    severity: AnomalySeverity;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    detectedAt: string;
    algorithm: string;
    score: number;
    confidence: number;
    description: string;
    context: {
        currentValue: number;
        expectedValue?: number;
        historicalMean?: number;
        historicalStdDev?: number;
        dataPoints: number;
    };
    metadata: {
        qualityDimension: string;
        timeWindow: string;
        trendDirection?: 'up' | 'down' | 'stable';
        seasonalComponent?: number;
        changePointDetected?: boolean;
    };
    relatedMetrics: QualityMetric[];
    rootCauseAnalysis?: RootCauseAnalysis;
}
export declare enum AnomalyType {
    STATISTICAL_OUTLIER = "statistical_outlier",
    TREND_ANOMALY = "trend_anomaly",
    SEASONAL_ANOMALY = "seasonal_anomaly",
    CHANGE_POINT = "change_point",
    PATTERN_DEVIATION = "pattern_deviation",
    QUALITY_DEGRADATION = "quality_degradation",
    PERFORMANCE_ANOMALY = "performance_anomaly"
}
export declare enum AnomalySeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
export interface TrendAnalysis {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk' | 'system';
    dimension: string;
    analyzedAt: string;
    timeRange: {
        start: string;
        end: string;
    };
    trend: {
        direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
        slope: number;
        confidence: number;
        significance: number;
    };
    seasonality: {
        detected: boolean;
        period?: number;
        amplitude?: number;
        phase?: number;
    };
    forecast: {
        horizon: number;
        predictions: Array<{
            timestamp: string;
            value: number;
            confidenceInterval: {
                lower: number;
                upper: number;
            };
        }>;
        accuracy: number;
    };
    changePoints: Array<{
        timestamp: string;
        magnitude: number;
        confidence: number;
    }>;
    statistics: {
        mean: number;
        variance: number;
        autocorrelation: number;
        stationarity: boolean;
    };
}
export interface RootCauseAnalysis {
    primaryCause: string;
    contributingFactors: string[];
    correlatedAnomalies: string[];
    confidence: number;
    recommendations: string[];
}
export interface AnomalyDetectionResult {
    anomalies: QualityAnomaly[];
    trends: TrendAnalysis[];
    summary: {
        totalAnomalies: number;
        anomaliesBySeverity: Record<AnomalySeverity, number>;
        anomaliesByType: Record<AnomalyType, number>;
        detectionAccuracy: number;
        processingTime: number;
    };
    metadata: {
        dataPointsAnalyzed: number;
        algorithmsUsed: string[];
        analysisTimestamp: string;
    };
}
export interface StatisticalMetrics {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    iqr: number;
    mad: number;
}
export declare class QualityAnomalyDetector extends EventEmitter {
    private logger;
    private db;
    private config;
    private qualityDataCache;
    private anomalyCache;
    private trendCache;
    private statisticsCache;
    private analysisQueue;
    private activeAnalyses;
    private cleanupInterval?;
    private detectionStats;
    constructor(database: Database.Database, logger: Logger, config?: Partial<AnomalyDetectionConfig>);
    private initializeDatabase;
    private startCleanupScheduler;
    private getEnabledAlgorithms;
    detectAnomalies(entityId: string, entityType?: 'document' | 'chunk' | 'system', dimension?: string): Promise<AnomalyDetectionResult>;
    detectRealTimeAnomaly(snapshot: RealTimeQualitySnapshot): Promise<QualityAnomaly[]>;
    private runAnomalyDetection;
    private detectZScoreAnomalies;
    private detectZScoreAnomaly;
    private detectModifiedZScoreAnomalies;
    private detectIQRAnomalies;
    private performTrendAnalysis;
    private analyzeTrend;
    private calculateLinearTrend;
    private detectSeasonality;
    private generateForecast;
    private detectChangePoints;
    private determineTrendDirection;
    private calculateStatistics;
    private calculateMedian;
    private calculateQuantile;
    private calculateVariance;
    private calculateMAD;
    private calculateSkewness;
    private calculateKurtosis;
    private calculateAutocorrelation;
    private calculateLaggedCorrelation;
    private testStationarity;
    private getQualityData;
    private groupDataByMetricType;
    private determineSeverity;
    private calculateConfidence;
    private calculateDetectionAccuracy;
    private groupAnomaliesBySeverity;
    private groupAnomaliesByType;
    private storeDetectionResults;
    private updateDetectionStats;
    private performCleanup;
    getAnomalies(entityId?: string, severity?: AnomalySeverity, timeframe?: {
        start: string;
        end: string;
    }, limit?: number): Promise<QualityAnomaly[]>;
    getTrendAnalysis(entityId: string, dimension?: string): Promise<TrendAnalysis | null>;
    getDetectionStatistics(): {
        totalDetections: number;
        accuracy: number;
        averageProcessingTime: number;
        algorithmsEnabled: string[];
    };
    updateConfiguration(newConfig: Partial<AnomalyDetectionConfig>): void;
    clearCache(): void;
    destroy(): Promise<void>;
}
export default QualityAnomalyDetector;
//# sourceMappingURL=QualityAnomalyDetector.d.ts.map