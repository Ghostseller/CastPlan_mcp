/**
 * Analytics Types - Comprehensive Type Definitions for Version Analytics
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for analytics service, metrics, trends, and reports
 *
 * Created: 2025-07-31
 * Author: TypeScript Architect & Analytics Specialist
 */
export type AnalyticsTimeframe = '1d' | '7d' | '30d' | '90d' | '1y';
export interface VersionAnalyticsConfig {
    enablePredictiveAnalysis?: boolean;
    cacheAnalytics?: boolean;
    realTimeMonitoring?: boolean;
    queryTimeout?: number;
    maxCacheSize?: number;
    analyticsRetentionDays?: number;
}
export interface AnalyticsMetric {
    name: string;
    value: number;
    unit?: string;
    trend?: 'increasing' | 'decreasing' | 'stable';
    changePercentage?: number;
    threshold?: {
        warning: number;
        critical: number;
    };
}
export interface AnalyticsQuery {
    type: 'evolution_trends' | 'change_patterns' | 'impact_metrics' | 'quality_evolution' | 'usage_analytics' | 'predictive_analysis';
    timeframe?: AnalyticsTimeframe;
    documentId?: string;
    filters?: FilterConfiguration[];
    useCache?: boolean;
    cacheTTL?: number;
    parameters?: Record<string, any>;
}
export interface FilterConfiguration {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
    value: any;
    values?: any[];
}
export interface DocumentEvolutionTrends {
    timeframe: {
        start: string;
        end: string;
    };
    totalVersions: number;
    totalChanges: number;
    changeFrequency: number;
    mostActiveDocuments: Array<{
        documentId: string;
        title: string;
        changeCount: number;
        lastChanged: string;
    }>;
    evolutionPatterns: EvolutionPattern[];
    trends: {
        volumeTrend: 'increasing' | 'decreasing' | 'stable';
        qualityTrend: 'improving' | 'declining' | 'stable';
        complexityTrend: 'increasing' | 'decreasing' | 'stable';
    };
}
export interface EvolutionPattern {
    patternType: 'cyclical' | 'linear' | 'exponential' | 'seasonal';
    frequency: 'daily' | 'weekly' | 'monthly';
    strength: number;
    confidence: number;
    description: string;
    predictedNextOccurrence?: string;
}
export interface TrendAnalysis {
    metric: string;
    currentValue: number;
    previousValue: number;
    changePercentage: number;
    direction: 'up' | 'down' | 'stable';
    significance: 'low' | 'medium' | 'high';
    projectedValue?: number;
    projectionConfidence?: number;
}
export interface ChangePattern {
    changeType: string;
    changeScope: string;
    frequency: number;
    averageConfidence: number;
    averageImpact: number;
    patternTypes: string[];
    trend: string;
    prediction?: {
        likelihood: number;
        expectedFrequency: number;
        confidence: number;
    };
}
export interface ChangeImpactMetrics {
    timeframe: {
        start: string;
        end: string;
    };
    averageImpactScore: number;
    highImpactChanges: number;
    totalChanges: number;
    impactDistribution: {
        low: number;
        medium: number;
        high: number;
    };
    riskTrends: RiskTrend[];
    impactByCategory: Record<string, {
        count: number;
        averageImpact: number;
        totalImpact: number;
    }>;
    futurePredictions?: {
        predictedHighImpactChanges: number;
        riskScore: number;
        confidence: number;
        timeHorizon: string;
    };
}
export interface RiskTrend {
    date: string;
    riskScore: number;
    changeVolume: number;
    averageImpact: number;
    criticalChanges: number;
}
export interface DocumentMetrics {
    documentId: string;
    title: string;
    metrics: {
        totalVersions: number;
        totalChanges: number;
        averageImpact: number;
        qualityScore: number;
        stabilityScore: number;
        lastModified: string;
    };
    trends: {
        changeFrequency: TrendAnalysis;
        qualityEvolution: TrendAnalysis;
        impactTrend: TrendAnalysis;
    };
}
export interface QualityEvolutionData {
    timeframe: {
        start: string;
        end: string;
    };
    overallQualityTrend: 'improving' | 'declining' | 'stable';
    averageQualityDelta: number;
    qualityImprovements: number;
    qualityDegradations: number;
    qualityTrends: QualityTrend[];
    predictedQualityScore?: number;
}
export interface QualityTrend {
    date: string;
    qualityScore: number;
    improvement: number;
    degradation: number;
    netChange: number;
    affectedDocuments: number;
}
export interface UsageAnalytics {
    timeframe: {
        start: string;
        end: string;
    };
    activeUsers: number;
    totalOperations: number;
    mostUsedFeatures: string[];
    userBehaviorPatterns: UserBehaviorPattern[];
    peakUsageTimes: PeakUsageTime[];
    featureAdoption: Record<string, {
        adoptionRate: number;
        usageFrequency: number;
        userSatisfaction?: number;
    }>;
}
export interface UserBehaviorPattern {
    patternType: 'workflow' | 'timing' | 'feature_sequence';
    description: string;
    frequency: number;
    users: number;
    efficiency: number;
}
export interface PeakUsageTime {
    timeSlot: string;
    averageUsers: number;
    peakUsers: number;
    primaryActivities: string[];
}
export interface PredictiveAnalysis {
    predictionHorizon: '7d' | '30d' | '90d';
    confidence: number;
    predictedChanges: PredictedChange[];
    riskFactors: RiskFactor[];
    recommendations: string[];
    modelAccuracy: number;
}
export interface PredictedChange {
    type: 'version_creation' | 'quality_improvement' | 'major_refactor' | 'documentation_update';
    probability: number;
    estimatedDate: string;
    impactScore: number;
    affectedDocuments: string[];
    reasoning: string;
}
export interface RiskFactor {
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
    impact: number;
    mitigation: string[];
    indicators: string[];
}
export interface IntegrationHealthStatus {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealth[];
    lastUpdated: string;
    recommendations: string[];
}
export interface ServiceHealth {
    service: string;
    status: 'healthy' | 'warning' | 'error';
    responseTime?: number;
    errorRate?: number;
    lastCheck: string;
    error?: string;
}
export interface PerformanceMetrics {
    analytics: {
        queriesExecuted: number;
        averageQueryTime: number;
        cacheHitRate: number;
        errorRate: number;
        lastQueryTime: number;
    };
    database: {
        connectionStatus: string;
        queryCount: number;
        averageQueryTime: number;
    };
    memory: {
        cacheSize: number;
        maxCacheSize: number;
        memoryUsage: any;
    };
    cache: {
        hitRate: number;
        size: number;
        maxSize: number;
    };
}
export interface SystemHealthMetrics {
    cpu: {
        usage: number;
        load: number[];
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connections: number;
    };
}
export interface AnalyticsReport {
    id: string;
    documentId?: string;
    timeframe: AnalyticsTimeframe;
    generatedAt: string;
    components: Record<string, any>;
    summary: {
        documentsAnalyzed: number;
        versionsTracked: number;
        changesDetected: number;
        overallHealth: string;
    };
    recommendations: string[];
}
export declare class AnalyticsError extends Error {
    readonly code: string;
    readonly timestamp: string;
    constructor(message: string, code: string);
}
export interface VersionAnalytics {
    getDocumentEvolutionTrends(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<DocumentEvolutionTrends>;
    getChangePatterns(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<ChangePattern[]>;
    getChangeImpactMetrics(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<ChangeImpactMetrics>;
    getQualityEvolutionData(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<QualityEvolutionData>;
    getUsageAnalytics(timeframe?: AnalyticsTimeframe): Promise<UsageAnalytics>;
    getPredictiveAnalysis(documentId?: string, predictionHorizon?: '7d' | '30d' | '90d'): Promise<PredictiveAnalysis>;
    getIntegrationHealthStatus(): Promise<IntegrationHealthStatus>;
    getSystemPerformanceMetrics(): Promise<PerformanceMetrics>;
    executeCustomQuery(query: AnalyticsQuery): Promise<any>;
    generateAnalyticsReport(documentId?: string, timeframe?: AnalyticsTimeframe, includeComponents?: string[]): Promise<AnalyticsReport>;
}
export default VersionAnalytics;
//# sourceMappingURL=analytics.types.d.ts.map