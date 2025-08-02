import { Logger } from 'winston';
import { AIAnalysisService } from './AIAnalysisService.ts';
import { SemanticChunkingService } from './SemanticChunkingService.ts';
import { QualityAssessmentEngine, QualityDimensions } from './QualityAssessmentEngine.ts';
import { QualityIssueDetector, IssueType } from './QualityIssueDetector.ts';
import { DocumentVersionService } from './DocumentVersionService.ts';
/**
 * Quality Improvement Recommender - Phase 4 Week 2
 *
 * AI-powered contextual improvement recommendations for CastPlan MCP documents
 * Provides intelligent suggestions based on quality assessments, detected issues,
 * and historical improvement patterns.
 *
 * Features:
 * - AI-powered contextual recommendations
 * - Priority-based improvement strategies
 * - Impact estimation for suggested improvements
 * - Version-aware recommendations tracking quality evolution
 * - Batch processing for large-scale improvements
 * - Integration with existing quality assessment and issue detection
 *
 * Integration points:
 * - AIAnalysisService for AI-powered recommendations
 * - QualityAssessmentEngine for quality context
 * - QualityIssueDetector for issue-based recommendations
 * - SemanticChunkingService for granular analysis
 * - DocumentVersionService for historical context
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
export declare enum RecommendationType {
    CONTENT_ENHANCEMENT = "content_enhancement",// Improve content quality
    STRUCTURAL_IMPROVEMENT = "structural_improvement",// Better organization
    CLARITY_OPTIMIZATION = "clarity_optimization",// Improve readability
    COMPLETENESS_BOOST = "completeness_boost",// Add missing information
    ACCURACY_CORRECTION = "accuracy_correction",// Fix incorrect content
    CONSISTENCY_ALIGNMENT = "consistency_alignment",// Align terminology/style
    RELEVANCE_REFINEMENT = "relevance_refinement",// Focus on relevant content
    TECHNICAL_ENHANCEMENT = "technical_enhancement",// Improve technical aspects
    USER_EXPERIENCE_IMPROVEMENT = "ux_improvement",// Better user experience
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
}
export declare enum RecommendationPriority {
    CRITICAL = "critical",// Must be addressed immediately
    HIGH = "high",// Should be addressed soon
    MEDIUM = "medium",// Important but not urgent
    LOW = "low",// Nice to have
    OPTIONAL = "optional"
}
export declare enum RecommendationScope {
    DOCUMENT = "document",// Document-wide recommendation
    SECTION = "section",// Section-level recommendation  
    CHUNK = "chunk",// Chunk-level recommendation
    PARAGRAPH = "paragraph",// Paragraph-level recommendation
    SENTENCE = "sentence"
}
export interface ImprovementRecommendation {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk';
    type: RecommendationType;
    priority: RecommendationPriority;
    scope: RecommendationScope;
    title: string;
    description: string;
    rationale: string;
    implementation: {
        steps: string[];
        beforeExample?: string;
        afterExample?: string;
        estimatedEffort: 'low' | 'medium' | 'high';
        estimatedTimeMinutes: number;
        difficulty: 'easy' | 'moderate' | 'difficult';
        prerequisites?: string[];
    };
    impact: {
        affectedDimensions: (keyof QualityDimensions)[];
        estimatedImprovement: number;
        userBenefit: string;
        businessValue: string;
        riskIfIgnored: string;
    };
    evidence: {
        sourceIssues?: string[];
        qualityScores?: Partial<QualityDimensions>;
        aiConfidence: number;
        supportingData?: any;
    };
    context: {
        relatedRecommendations?: string[];
        dependentRecommendations?: string[];
        alternativeApproaches?: string[];
        bestPracticeCategory?: string;
    };
    metadata: {
        generatedAt: string;
        generatorVersion: string;
        reviewedBy?: string;
        approvedBy?: string;
        tags: string[];
        customData?: any;
    };
    status: 'generated' | 'reviewed' | 'approved' | 'implemented' | 'rejected';
    implementedAt?: string;
    implementedBy?: string;
    implementationNotes?: string;
}
export interface RecommendationOptions {
    enableAIRecommendations?: boolean;
    includeMinorImprovements?: boolean;
    focusAreas?: (keyof QualityDimensions)[];
    maxRecommendations?: number;
    priorityThreshold?: RecommendationPriority;
    includeExamples?: boolean;
    contextualAnalysis?: boolean;
    historicalAnalysis?: boolean;
    considerUserFeedback?: boolean;
}
export interface RecommendationResult {
    entityId: string;
    entityType: 'document' | 'chunk';
    totalRecommendations: number;
    recommendationsByPriority: Record<RecommendationPriority, number>;
    recommendationsByType: Record<RecommendationType, number>;
    recommendations: ImprovementRecommendation[];
    overallImprovementPotential: number;
    estimatedTotalEffort: number;
    implementationRoadmap: {
        phase1: ImprovementRecommendation[];
        phase2: ImprovementRecommendation[];
        phase3: ImprovementRecommendation[];
    };
    processingTime: number;
}
export interface BatchRecommendationResult {
    id: string;
    totalEntities: number;
    processedEntities: number;
    results: RecommendationResult[];
    overallStats: {
        totalRecommendations: number;
        avgRecommendationsPerEntity: number;
        totalEstimatedEffort: number;
        highImpactRecommendations: number;
        quickWins: number;
    };
    startedAt: string;
    completedAt?: string;
}
export interface ImprovementStrategy {
    id: string;
    name: string;
    description: string;
    targetDimensions: (keyof QualityDimensions)[];
    recommendationTypes: RecommendationType[];
    applicabilityRules: {
        minQualityScore?: number;
        maxQualityScore?: number;
        requiredIssueTypes?: IssueType[];
        contentTypes?: string[];
    };
    template: {
        titlePattern: string;
        descriptionPattern: string;
        implementationSteps: string[];
    };
}
export declare class QualityImprovementRecommender {
    private logger;
    private aiAnalysisService;
    private semanticChunkingService;
    private qualityAssessmentEngine;
    private qualityIssueDetector;
    private documentVersionService?;
    private initialized;
    private readonly IMPROVEMENT_STRATEGIES;
    private readonly PRIORITY_WEIGHTS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticChunkingService: SemanticChunkingService, qualityAssessmentEngine: QualityAssessmentEngine, qualityIssueDetector: QualityIssueDetector, documentVersionService?: DocumentVersionService);
    /**
     * Initialize the Quality Improvement Recommender
     */
    initialize(): Promise<void>;
    /**
     * Generate improvement recommendations for a document
     */
    generateDocumentRecommendations(documentId: string, options?: RecommendationOptions): Promise<RecommendationResult>;
    /**
     * Generate improvement recommendations for a chunk
     */
    generateChunkRecommendations(chunkId: string, options?: RecommendationOptions): Promise<RecommendationResult>;
    /**
     * Generate batch recommendations for multiple entities
     */
    generateBatchRecommendations(entityIds: string[], entityType: 'document' | 'chunk', options?: RecommendationOptions): Promise<BatchRecommendationResult>;
    /**
     * Get implementation guidance for a specific recommendation
     */
    getImplementationGuidance(recommendationId: string): Promise<{
        detailedSteps: string[];
        bestPractices: string[];
        commonPitfalls: string[];
        successCriteria: string[];
        timelineEstimate: string;
        requiredSkills: string[];
        tools: string[];
        resources: string[];
    }>;
    /**
     * Generate dimension-based recommendations
     */
    private generateDimensionBasedRecommendations;
    /**
     * Generate issue-based recommendations
     */
    private generateIssueBasedRecommendations;
    /**
     * Generate AI-powered recommendations
     */
    private generateAIRecommendations;
    /**
     * Generate strategic improvement recommendations
     */
    private generateStrategicRecommendations;
    /**
     * Build recommendation context
     */
    private buildRecommendationContext;
    /**
     * Create dimension-based recommendation
     */
    private createDimensionRecommendation;
    /**
     * Create issue-based recommendation
     */
    private createIssueBasedRecommendation;
    /**
     * Create strategic recommendation
     */
    private createStrategicRecommendation;
    /**
     * Check if insight suggests improvement
     */
    private isImprovementInsight;
    /**
     * Convert AI insight to recommendation
     */
    private convertInsightToRecommendation;
    /**
     * Filter recommendations based on options
     */
    private filterRecommendations;
    /**
     * Prioritize recommendations
     */
    private prioritizeRecommendations;
    /**
     * Calculate recommendation priority score
     */
    private calculateRecommendationScore;
    /**
     * Consolidate similar recommendations
     */
    private consolidateRecommendations;
    /**
     * Compare recommendation priorities
     */
    private comparePriority;
    private calculateRecommendationsByPriority;
    private calculateRecommendationsByType;
    private calculateImprovementPotential;
    private calculateTotalEffort;
    private createImplementationRoadmap;
    private calculateBatchStatistics;
    private getDimensionRecommendationType;
    private calculateDimensionPriority;
    private getDimensionRationale;
    private getDimensionImplementationSteps;
    private estimateImplementationTime;
    private estimateDimensionImprovement;
    private getDimensionUserBenefit;
    private getDimensionBusinessValue;
    private getDimensionRisk;
    private getIssueRecommendationType;
    private convertSeverityToPriority;
    private convertIssueScope;
    private getAdditionalSteps;
    private estimateIssueFixTime;
    private calculateIssueDifficulty;
    private getIssueBusinessValue;
    private getIssueRisk;
    private isStrategyApplicable;
    private calculateStrategicPriority;
    private calculateApplicabilityScore;
    private getRecommendationTypeDimensions;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityImprovementRecommender.d.ts.map