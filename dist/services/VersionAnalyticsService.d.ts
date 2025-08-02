/**
 * Version Analytics Service - Comprehensive Analytics and Reporting Engine
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Provides advanced analytics capabilities for version tracking data with
 * document evolution trends, change impact analysis, and predictive insights
 *
 * Created: 2025-07-31
 * Author: Backend Architect & Data Analytics Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { DocumentEvolutionTrends, ChangeImpactMetrics, QualityEvolutionData, UsageAnalytics, PredictiveAnalysis, AnalyticsQuery, AnalyticsTimeframe, VersionAnalyticsConfig, AnalyticsReport, ChangePattern, PerformanceMetrics, IntegrationHealthStatus } from '../types/analytics.types';
import { DocumentVersionService } from '../../../DocumentVersionService';
import { SemanticChunkingService } from './SemanticChunkingService';
import { AIAnalysisService } from './AIAnalysisService';
import { DocumentEvolutionDetector } from './DocumentEvolutionDetector';
import { ChangeImpactAnalyzer } from './ChangeImpactAnalyzer';
/**
 * Advanced Version Analytics Service
 *
 * Features:
 * - Document evolution trends and patterns analysis
 * - Change impact analysis over time with risk assessment
 * - Quality evolution tracking with predictive modeling
 * - Usage analytics and user behavior insights
 * - Predictive analysis for future document changes
 * - Integration health monitoring across all services
 * - Real-time performance metrics and system health
 * - Custom analytics queries with flexible timeframes
 */
export declare class VersionAnalyticsService {
    private logger;
    private db;
    private versionService;
    private semanticChunkingService;
    private aiAnalysisService;
    private evolutionDetector;
    private impactAnalyzer;
    private config;
    private initialized;
    private analyticsCache;
    private readonly DEFAULT_CACHE_TTL;
    private readonly QUERY_TIMEOUT;
    private performanceMetrics;
    constructor(db: Database.Database, logger: Logger, versionService: DocumentVersionService, semanticChunkingService: SemanticChunkingService, aiAnalysisService: AIAnalysisService, evolutionDetector: DocumentEvolutionDetector, impactAnalyzer: ChangeImpactAnalyzer, config?: VersionAnalyticsConfig);
    initialize(): Promise<void>;
    /**
     * Analyze document evolution trends over time
     * Provides insights into how documents change and evolve
     *
     * Performance Target: <2 seconds for analysis
     */
    getDocumentEvolutionTrends(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<DocumentEvolutionTrends>;
    /**
     * Get change patterns for specific documents or system-wide
     * Identifies recurring patterns in document modifications
     */
    getChangePatterns(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<ChangePattern[]>;
    /**
     * Analyze change impact metrics over time
     * Provides insights into how changes affect system health and quality
     *
     * Performance Target: <3 seconds for comprehensive analysis
     */
    getChangeImpactMetrics(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<ChangeImpactMetrics>;
    /**
     * Track quality evolution over time with trend analysis
     * Monitors document quality improvements and degradations
     *
     * Performance Target: <2 seconds for quality analysis
     */
    getQualityEvolutionData(documentId?: string, timeframe?: AnalyticsTimeframe): Promise<QualityEvolutionData>;
    /**
     * Get comprehensive usage analytics and user behavior insights
     * Tracks how users interact with the version tracking system
     */
    getUsageAnalytics(timeframe?: AnalyticsTimeframe): Promise<UsageAnalytics>;
    /**
     * Generate predictive analysis for future document changes
     * Uses AI and machine learning to forecast evolution patterns
     *
     * Performance Target: <5 seconds for predictive modeling
     */
    getPredictiveAnalysis(documentId?: string, predictionHorizon?: '7d' | '30d' | '90d'): Promise<PredictiveAnalysis>;
    /**
     * Monitor integration health across all CastPlan MCP services
     * Provides real-time health status and performance metrics
     */
    getIntegrationHealthStatus(): Promise<IntegrationHealthStatus>;
    /**
     * Get system performance metrics
     * Monitors overall system performance and resource usage
     */
    getSystemPerformanceMetrics(): Promise<PerformanceMetrics>;
    /**
     * Execute custom analytics queries with flexible parameters
     * Allows for ad-hoc analysis and custom reporting
     */
    executeCustomQuery(query: AnalyticsQuery): Promise<any>;
    /**
     * Generate comprehensive analytics report
     * Combines all analytics data into a structured report
     */
    generateAnalyticsReport(documentId?: string, timeframe?: AnalyticsTimeframe, includeComponents?: string[]): Promise<AnalyticsReport>;
    private createAnalyticsTables;
    private initializePerformanceMonitoring;
    private startRealTimeMonitoring;
    private getTimeWindow;
    private getCachedResult;
    private cacheResult;
    private recordPerformanceMetric;
    private recordPerformanceError;
    private cleanupExpiredCache;
    private updateCacheHitRate;
    private analyzeEvolutionTrends;
    private calculateImpactMetrics;
    private analyzeQualityEvolution;
    private gatherUsageData;
    private analyzeUsagePatterns;
    private generatePredictions;
    private checkIntegrationsHealth;
    private getDatabaseMetrics;
    private getMemoryMetrics;
    private getCacheMetrics;
    private validateAnalyticsQuery;
    private executeQuery;
    private calculatePatternTrend;
    private predictPatternFuture;
    private gatherHistoricalDataForPrediction;
    private generateReportSummary;
    private generateRecommendations;
    private predictFutureImpact;
    private ensureInitialized;
    shutdown(): Promise<void>;
}
export default VersionAnalyticsService;
//# sourceMappingURL=VersionAnalyticsService.d.ts.map