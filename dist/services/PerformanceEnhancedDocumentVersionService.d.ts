/**
 * Performance Enhanced Document Version Service
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Performance-optimized version of DocumentVersionService with monitoring and optimization
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & Integration Specialist
 */
import winston from 'winston';
import { DocumentVersion, VersionComparison, VersionOptions, ComparisonOptions, EvolutionDetectionOptions, ChangeDetectionResult } from '../types/version-tracking.types';
export declare class PerformanceEnhancedDocumentVersionService {
    private logger;
    private databasePath;
    private performanceMonitoring;
    private databaseOptimization;
    private benchmarkingService;
    private analyticsService;
    private instrumentation;
    private isInitialized;
    private metricsCache;
    private readonly CACHE_TTL;
    private readonly PERFORMANCE_THRESHOLDS;
    constructor(databasePath: string, logger: winston.Logger, config?: {
        enablePerformanceMonitoring?: boolean;
        enableBenchmarking?: boolean;
        enableOptimization?: boolean;
        cacheEnabled?: boolean;
        performanceThresholds?: Partial<typeof this.PERFORMANCE_THRESHOLDS>;
    });
    initialize(): Promise<void>;
    private establishPerformanceBaselines;
    createVersion(documentId: string, options?: VersionOptions): Promise<DocumentVersion>;
    compareVersions(versionId1: string, versionId2: string, options?: ComparisonOptions): Promise<VersionComparison>;
    detectChanges(documentId: string, options?: EvolutionDetectionOptions): Promise<ChangeDetectionResult>;
    getVersionAnalytics(documentId?: string, timeframe?: string): Promise<import("../types/analytics.types").DocumentEvolutionTrends>;
    getPerformanceMetrics(): Promise<{
        system: any;
        database: any;
        analytics: any;
        recommendations: string[];
    }>;
    runPerformanceBenchmark(benchmarkName: string): Promise<any>;
    private createBenchmarkTestFunction;
    private storeVersion;
    private getVersionOptimized;
    private performVersionComparison;
    private getCachedResult;
    private setCachedResult;
    private cleanCache;
    private calculateCacheHitRate;
    private ensureInitialized;
    private generateVersionId;
    private generateVersionNumber;
    private generateContentHash;
    private generateSemanticHash;
    destroy(): Promise<void>;
}
export default PerformanceEnhancedDocumentVersionService;
//# sourceMappingURL=PerformanceEnhancedDocumentVersionService.d.ts.map