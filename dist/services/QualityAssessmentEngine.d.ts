import { Logger } from 'winston';
import { AIAnalysisService } from './AIAnalysisService.ts';
import { SemanticChunkingService } from './SemanticChunkingService.ts';
import { DocumentVersionService } from './DocumentVersionService.ts';
/**
 * Quality Assessment Engine - Phase 4 Week 2
 *
 * Multi-dimensional quality scoring system for CastPlan MCP documents
 * Provides comprehensive quality assessment with 6-dimension scoring:
 * - Clarity: How clear and understandable the content is
 * - Completeness: How complete the information appears
 * - Accuracy: Technical correctness and factual accuracy
 * - Relevance: How relevant to the topic/context
 * - Consistency: Internal consistency and coherence
 * - Structure: Organization and formatting quality
 *
 * Integration points:
 * - AIAnalysisService for AI-powered assessment
 * - SemanticChunkingService for chunk-level analysis
 * - DocumentVersionService for version-aware quality tracking
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
export interface QualityDimensions {
    clarity: number;
    completeness: number;
    accuracy: number;
    relevance: number;
    consistency: number;
    structure: number;
}
export interface QualityAssessment {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk';
    dimensions: QualityDimensions;
    overallScore: number;
    confidence: number;
    assessment: {
        strengths: string[];
        weaknesses: string[];
        criticalIssues: string[];
        suggestions: string[];
    };
    metadata: {
        analysisDate: string;
        aiProvider: string;
        processingTime: number;
        contentLength: number;
        version?: string;
    };
    createdAt: string;
}
export interface QualityWeights {
    clarity: number;
    completeness: number;
    accuracy: number;
    relevance: number;
    consistency: number;
    structure: number;
}
export interface QualityScore {
    overall: number;
    dimensions: QualityDimensions;
    confidence: number;
}
export interface QualityAssessmentOptions {
    weights?: Partial<QualityWeights>;
    enableDeepAnalysis?: boolean;
    includeAIInsights?: boolean;
    contextualAnalysis?: boolean;
    versionComparison?: string;
    expectedTopics?: string[];
    documentType?: string;
}
export interface BatchQualityAssessment {
    id: string;
    totalItems: number;
    completedItems: number;
    assessments: QualityAssessment[];
    overallQuality: {
        averageScore: number;
        dimensionAverages: QualityDimensions;
        distribution: {
            excellent: number;
            good: number;
            average: number;
            poor: number;
            critical: number;
        };
    };
    startedAt: string;
    completedAt?: string;
    estimatedTimeRemaining?: number;
}
export declare class QualityAssessmentEngine {
    private logger;
    private aiAnalysisService;
    private semanticChunkingService;
    private documentVersionService?;
    private initialized;
    private readonly DEFAULT_WEIGHTS;
    private readonly QUALITY_THRESHOLDS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticChunkingService: SemanticChunkingService, documentVersionService?: DocumentVersionService);
    /**
     * Initialize the Quality Assessment Engine
     */
    initialize(): Promise<void>;
    /**
     * Assess document quality with 6-dimension scoring
     */
    assessDocumentQuality(documentId: string, options?: QualityAssessmentOptions): Promise<QualityAssessment>;
    /**
     * Assess chunk quality with 6-dimension scoring
     */
    assessChunkQuality(chunkId: string, options?: QualityAssessmentOptions): Promise<QualityAssessment>;
    /**
     * Batch quality assessment for multiple documents
     */
    assessBatchQuality(entityIds: string[], entityType: 'document' | 'chunk', options?: QualityAssessmentOptions): Promise<BatchQualityAssessment>;
    /**
     * Compare quality between versions
     */
    compareQualityAcrossVersions(documentId: string, version1Id: string, version2Id: string): Promise<{
        version1Assessment: QualityAssessment;
        version2Assessment: QualityAssessment;
        comparison: {
            overallChange: number;
            dimensionChanges: QualityDimensions;
            improvedAspects: string[];
            degradedAspects: string[];
            recommendations: string[];
        };
    }>;
    /**
     * Perform AI-powered quality assessment
     */
    private performAIQualityAssessment;
    /**
     * Enhance AI assessment with additional analysis
     */
    private enhanceAIAssessment;
    /**
     * Perform local quality assessment without AI
     */
    private performLocalQualityAssessment;
    /**
     * Calculate quality dimensions for document
     */
    private calculateQualityDimensions;
    /**
     * Calculate quality dimensions for chunk
     */
    private calculateChunkQualityDimensions;
    /**
     * Calculate clarity score based on readability
     */
    private calculateClarityScore;
    /**
     * Calculate completeness score
     */
    private calculateCompletenessScore;
    private calculateChunkCompletenessScore;
    /**
     * Calculate accuracy score
     */
    private calculateAccuracyScore;
    /**
     * Calculate relevance score
     */
    private calculateRelevanceScore;
    /**
     * Calculate consistency score
     */
    private calculateConsistencyScore;
    private calculateChunkConsistencyScore;
    /**
     * Calculate structure score
     */
    private calculateStructureScore;
    private calculateChunkStructureScore;
    /**
     * Calculate weighted overall score
     */
    private calculateWeightedScore;
    /**
     * Build document context for analysis
     */
    private buildDocumentContext;
    /**
     * Build chunk context for analysis
     */
    private buildChunkContext;
    /**
     * Calculate batch statistics
     */
    private calculateBatchStatistics;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityAssessmentEngine.d.ts.map