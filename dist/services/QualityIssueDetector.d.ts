import { Logger } from 'winston';
import { AIAnalysisService } from './AIAnalysisService.ts';
import { SemanticChunkingService } from './SemanticChunkingService.ts';
import { QualityAssessmentEngine, QualityDimensions } from './QualityAssessmentEngine.ts';
/**
 * Quality Issue Detector - Phase 4 Week 2
 *
 * Automatic detection and classification of quality issues in CastPlan MCP documents
 * Identifies gaps, inconsistencies, outdated content, and other quality problems
 *
 * Features:
 * - Automatic issue detection with AI-powered analysis
 * - Multi-level issue classification (critical, high, medium, low)
 * - Pattern-based and semantic issue identification
 * - Integration with QualityAssessmentEngine for comprehensive analysis
 * - Batch processing capabilities for large document sets
 *
 * Integration points:
 * - AIAnalysisService for AI-powered issue detection
 * - SemanticChunkingService for chunk-level analysis
 * - QualityAssessmentEngine for quality context
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
export declare enum IssueType {
    CONTENT_GAP = "content_gap",// Missing or incomplete information
    INCONSISTENCY = "inconsistency",// Contradictory information
    OUTDATED_CONTENT = "outdated_content",// Stale or deprecated information
    STRUCTURAL_ISSUE = "structural_issue",// Poor organization or formatting
    CLARITY_ISSUE = "clarity_issue",// Unclear or confusing content
    ACCURACY_ISSUE = "accuracy_issue",// Potentially incorrect information
    RELEVANCE_ISSUE = "relevance_issue",// Off-topic or irrelevant content
    DUPLICATION = "duplication",// Repeated or redundant content
    BROKEN_REFERENCE = "broken_reference",// Dead links or invalid references
    FORMATTING_ISSUE = "formatting_issue",// Poor formatting or presentation
    TECHNICAL_DEBT = "technical_debt",// TODO items, FIXME, deprecated patterns
    COMPLIANCE_ISSUE = "compliance_issue"
}
export declare enum IssueSeverity {
    CRITICAL = "critical",// Blocks understanding or usability
    HIGH = "high",// Significantly impacts quality
    MEDIUM = "medium",// Moderate impact on quality
    LOW = "low"
}
export declare enum IssueScope {
    DOCUMENT = "document",// Document-wide issue
    SECTION = "section",// Section or heading-level issue
    CHUNK = "chunk",// Individual chunk issue
    PARAGRAPH = "paragraph",// Paragraph-level issue
    SENTENCE = "sentence"
}
export interface QualityIssue {
    id: string;
    entityId: string;
    entityType: 'document' | 'chunk';
    issueType: IssueType;
    severity: IssueSeverity;
    scope: IssueScope;
    title: string;
    description: string;
    location: {
        startPosition?: number;
        endPosition?: number;
        chunkId?: string;
        sectionTitle?: string;
        lineNumber?: number;
    };
    impact: {
        affectedDimensions: (keyof QualityDimensions)[];
        estimatedImpact: number;
        userExperienceImpact: string;
    };
    evidence: {
        detectionMethod: 'ai_analysis' | 'pattern_matching' | 'semantic_analysis' | 'statistical_analysis';
        confidence: number;
        supporting_data?: any;
    };
    suggestions: {
        quickFix?: string;
        detailedSolution: string;
        estimatedEffort: 'low' | 'medium' | 'high';
        priority: number;
    };
    metadata: {
        detectedAt: string;
        detectionVersion: string;
        relatedIssues?: string[];
        tags: string[];
        context?: any;
    };
    status: 'detected' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
    resolvedAt?: string;
    resolvedBy?: string;
}
export interface IssueDetectionOptions {
    enableAIDetection?: boolean;
    enablePatternDetection?: boolean;
    enableSemanticAnalysis?: boolean;
    enableStatisticalAnalysis?: boolean;
    severityThreshold?: IssueSeverity;
    customPatterns?: IssuePattern[];
    contextualAnalysis?: boolean;
    includeMinorIssues?: boolean;
    batchSize?: number;
}
export interface IssuePattern {
    name: string;
    pattern: RegExp | string;
    issueType: IssueType;
    severity: IssueSeverity;
    description: string;
    suggestion: string;
}
export interface IssueDetectionResult {
    documentId?: string;
    chunkId?: string;
    totalIssues: number;
    issuesBySeverity: Record<IssueSeverity, number>;
    issuesByType: Record<IssueType, number>;
    issues: QualityIssue[];
    processingTime: number;
    detectionStats: {
        aiDetected: number;
        patternDetected: number;
        semanticDetected: number;
        statisticalDetected: number;
    };
}
export interface BatchIssueDetection {
    id: string;
    totalEntities: number;
    processedEntities: number;
    results: IssueDetectionResult[];
    overallStats: {
        totalIssues: number;
        criticalIssues: number;
        highIssues: number;
        mediumIssues: number;
        lowIssues: number;
        avgIssuesPerEntity: number;
    };
    startedAt: string;
    completedAt?: string;
    estimatedTimeRemaining?: number;
}
export declare class QualityIssueDetector {
    private logger;
    private aiAnalysisService;
    private semanticChunkingService;
    private qualityAssessmentEngine;
    private initialized;
    private readonly ISSUE_PATTERNS;
    private readonly SEVERITY_THRESHOLDS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticChunkingService: SemanticChunkingService, qualityAssessmentEngine: QualityAssessmentEngine);
    /**
     * Initialize the Quality Issue Detector
     */
    initialize(): Promise<void>;
    /**
     * Detect quality issues in a document
     */
    detectDocumentIssues(documentId: string, options?: IssueDetectionOptions): Promise<IssueDetectionResult>;
    /**
     * Detect quality issues in a chunk
     */
    detectChunkIssues(chunkId: string, options?: IssueDetectionOptions): Promise<IssueDetectionResult>;
    /**
     * Batch issue detection for multiple entities
     */
    detectBatchIssues(entityIds: string[], entityType: 'document' | 'chunk', options?: IssueDetectionOptions): Promise<BatchIssueDetection>;
    /**
     * Get issue resolution suggestions
     */
    getResolutionSuggestions(issueId: string): Promise<{
        quickFixes: string[];
        detailedSolutions: string[];
        preventionStrategies: string[];
        estimatedEffort: string;
        priority: number;
    }>;
    /**
     * Detect issues using pattern matching
     */
    private detectPatternIssues;
    /**
     * Detect issues using AI analysis
     */
    private detectAIIssues;
    /**
     * Detect semantic issues using chunk relationships and topics
     */
    private detectSemanticIssues;
    /**
     * Detect statistical issues using content analysis
     */
    private detectStatisticalIssues;
    /**
     * Detect chunk-specific issues
     */
    private detectChunkSpecificIssues;
    /**
     * Detect topic coherence issues
     */
    private detectTopicCoherenceIssues;
    /**
     * Calculate content statistics
     */
    private calculateContentStatistics;
    /**
     * Create statistical issue
     */
    private createStatisticalIssue;
    /**
     * Check if an insight indicates a problem
     */
    private isNegativeInsight;
    /**
     * Convert AI insight to quality issue
     */
    private convertInsightToIssue;
    /**
     * Generate solution from AI insight
     */
    private generateSolutionFromInsight;
    /**
     * Identify issues from quality dimensions
     */
    private identifyDimensionIssues;
    /**
     * Get solution for specific quality dimension
     */
    private getDimensionSolution;
    /**
     * Filter issues by severity threshold
     */
    private filterIssuesBySeverity;
    /**
     * Consolidate similar issues
     */
    private consolidateIssues;
    /**
     * Calculate issues by severity
     */
    private calculateIssuesBySeverity;
    /**
     * Calculate issues by type
     */
    private calculateIssuesByType;
    /**
     * Calculate batch statistics
     */
    private calculateBatchStatistics;
    private determineScope;
    private getAffectedDimensions;
    private calculatePatternImpact;
    private calculateSeverityImpact;
    private getUXImpact;
    private getEffortEstimate;
    private calculatePriority;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityIssueDetector.d.ts.map