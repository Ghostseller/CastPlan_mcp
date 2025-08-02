/**
 * Version Tracking Types
 *
 * CastPlan MCP Phase 2: Complete type definitions for version tracking system
 *
 * Created: 2025-07-31
 * Author: Test Automation Specialist
 */
export interface DocumentVersion {
    id: string;
    documentId: string;
    versionNumber: string;
    versionType: VersionType;
    contentHash: string;
    semanticHash: string;
    parentVersionId?: string;
    branchId?: string;
    metadata: VersionMetadata;
    chunks: ChunkVersionExtended[];
    relationships: VersionRelationship[];
    createdAt: string;
    updatedAt: string;
}
export interface VersionMetadata {
    tags: string[];
    description: string;
    author: string;
    [key: string]: any;
}
export interface ChunkVersionExtended {
    id: string;
    chunkId: string;
    versionId: string;
    content: string;
    semanticEmbedding?: number[];
    position: number;
    hash: string;
    changeType?: ChangeType;
    confidence?: number;
    metadata?: Record<string, any>;
}
export interface VersionRelationship {
    id: string;
    sourceVersionId: string;
    targetVersionId: string;
    relationshipType: RelationshipType;
    confidence: number;
    metadata?: Record<string, any>;
}
export interface DocumentBranch {
    id: string;
    name: string;
    documentId: string;
    parentBranchId?: string;
    headVersionId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare enum VersionType {
    MAJOR = "major",
    MINOR = "minor",
    PATCH = "patch",
    DRAFT = "draft",
    SNAPSHOT = "snapshot"
}
export declare enum ChangeType {
    ADDITION = "addition",
    DELETION = "deletion",
    MODIFICATION = "modification",
    REORDER = "reorder",
    SPLIT = "split",
    MERGE = "merge",
    ADD = "addition",
    DELETE = "deletion",
    MODIFY = "modification",
    RESTRUCTURE = "restructure",
    MOVE = "move"
}
export declare enum ChangeScope {
    DOCUMENT = "document",
    SECTION = "section",
    PARAGRAPH = "paragraph",
    SENTENCE = "sentence",
    WORD = "word",
    SEMANTIC = "semantic"
}
export declare enum RelationshipType {
    PARENT_CHILD = "parent_child",
    BRANCH = "branch",
    MERGE = "merge",
    REFERENCE = "reference",
    DEPENDENCY = "dependency"
}
export interface DocumentChange {
    id: string;
    type: ChangeType;
    scope: ChangeScope;
    confidence: number;
    impact: number;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
    versionId?: string;
    changeType: ChangeType;
    changeScope: ChangeScope;
    oldContent?: string;
    newContent?: string;
    affectedChunks: string[];
    changeLocation?: string;
}
export interface ChangeImpactAnalysis {
    overallImpactScore: number;
    impactCategories: {
        structural: StructuralImpact;
        semantic: SemanticImpact;
        quality: QualityImpact;
        relationships: RelationshipImpact;
    };
    affectedSystems: string[];
    riskAssessment: RiskAssessment;
    recommendations: string[];
    summary: string;
}
export interface DocumentEvolution {
    documentId: string;
    timeRange: {
        start: string;
        end: string;
    };
    versions: DocumentVersion[];
    changePatterns: ChangePattern[];
    evolutionMetrics: EvolutionMetrics;
    insights: EvolutionInsight[];
}
export interface ChangePattern {
    type: string;
    frequency: number;
    confidence: number;
    impact: number;
    timeDistribution: Record<string, number>;
}
export interface EvolutionMetrics {
    totalVersions: number;
    changeFrequency: number;
    stability: number;
    complexity: number;
    growthRate: number;
}
export interface EvolutionInsight {
    type: 'trend' | 'anomaly' | 'pattern' | 'recommendation';
    description: string;
    confidence: number;
    impact: number;
    timeframe?: string;
}
export interface VersionComparison {
    version1Id: string;
    version2Id: string;
    changes: DocumentChange[];
    chunkComparisons: ChunkComparison[];
    summary: ComparisonSummary;
    metadata: ComparisonMetadata;
}
export interface ChunkComparison {
    chunk1Id?: string;
    chunk2Id?: string;
    changeType: ChangeType;
    similarity: number;
    confidence: number;
    details: string;
}
export interface ComparisonSummary {
    totalChanges: number;
    addedChunks: number;
    removedChunks: number;
    modifiedChunks: number;
    semanticSimilarity: number;
    structuralSimilarity: number;
}
export interface ComparisonMetadata {
    comparisonType: 'summary' | 'detailed';
    comparedAt: string;
    processingTime: number;
}
export interface MergeResult {
    success: boolean;
    resultVersionId?: string;
    conflicts: MergeConflict[];
    resolvedChanges: DocumentChange[];
    summary: MergeSummary;
}
export interface MergeConflict {
    id: string;
    type: 'content' | 'structure' | 'metadata';
    chunkIds: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestedResolution?: string;
}
export interface MergeSummary {
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    mergeStrategy: string;
    mergedAt: string;
}
export interface VersionOptions {
    versionType?: VersionType;
    parentVersionId?: string;
    branchId?: string;
    tags?: string[];
    description?: string;
    author?: string;
    metadata?: Record<string, any>;
}
export interface ComparisonOptions {
    detailed?: boolean;
    includeMetadata?: boolean;
    semanticAnalysis?: boolean;
    chunkLevel?: boolean;
    confidenceThreshold?: number;
}
export interface EvolutionDetectionOptions {
    timeframe?: string;
    includePatterns?: boolean;
    analysisDepth?: 'shallow' | 'medium' | 'deep';
    confidenceThreshold?: number;
}
export interface ChangeDetectionResult {
    documentId: string;
    changes: DocumentChange[];
    summary: {
        totalChanges: number;
        changeTypes: string[];
        averageConfidence: number;
        detectionOptions: EvolutionDetectionOptions;
    };
    timestamp: string;
}
export interface VersionAnalytics {
    documentId?: string;
    timeframe: string;
    metrics: {
        versionCount: number;
        changeFrequency: number;
        averageChangeImpact: number;
        stabilityScore: number;
    };
    trends: AnalyticTrend[];
    insights: AnalyticInsight[];
}
export interface AnalyticTrend {
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    significance: number;
}
export interface AnalyticInsight {
    type: string;
    description: string;
    actionable: boolean;
    priority: 'low' | 'medium' | 'high';
}
export interface VersionError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
}
export declare class VersionTrackingError extends Error {
    readonly code: string;
    readonly details?: Record<string, any>;
    readonly timestamp: string;
    constructor(code: string, message: string, details?: Record<string, any>);
}
export interface DocumentContext {
    documentId: string;
    title?: string;
    type?: string;
    metadata?: Record<string, any>;
    relationships?: DocumentRelationship[];
    complexity?: number;
    dependencies?: string[];
    systemIntegrations?: string[];
}
export interface DocumentRelationship {
    type: 'reference' | 'dependency' | 'parent' | 'child';
    targetDocumentId: string;
    strength: number;
}
export interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: Record<string, number>;
    mitigationStrategies: string[];
    reviewRequirements: string[];
}
export interface RiskFactor {
    type: string;
    description: string;
    impact: number;
    likelihood: number;
}
export interface StructuralImpact {
    score: number;
    affectedSections: string[];
    hierarchyChanges: number;
}
export interface SemanticImpact {
    score: number;
    affectedConcepts: string[];
    meaningShift: number;
}
export interface QualityImpact {
    score: number;
    qualityDelta: number;
    affectedMetrics: string[];
}
export interface RelationshipImpact {
    score: number;
    brokenRelationships: string[];
    newRelationships: string[];
}
export interface ChangeImpactAnalyzer {
    analyzeImpact(changes: DocumentChange[], context?: DocumentContext): Promise<ChangeImpactAnalysis>;
    assessRisk(changes: DocumentChange[], context?: DocumentContext): Promise<RiskAssessment>;
    generateRecommendations(analysis: ChangeImpactAnalysis): Promise<string[]>;
    calculateStructuralImpact?(changes: DocumentChange[]): Promise<StructuralImpact>;
    calculateSemanticImpact?(changes: DocumentChange[]): Promise<SemanticImpact>;
    calculateQualityImpact?(changes: DocumentChange[]): Promise<QualityImpact>;
    calculateRelationshipImpact?(changes: DocumentChange[]): Promise<RelationshipImpact>;
}
export interface StructuralChange {
    type: ChangeType;
    scope: ChangeScope;
    description: string;
    impact: number;
    confidence: number;
}
export interface ContentChange {
    type: ChangeType;
    scope: ChangeScope;
    description: string;
    impact: number;
    confidence: number;
    wordCount?: number;
    characterCount?: number;
}
export interface SemanticChange {
    type: ChangeType;
    scope: ChangeScope;
    description: string;
    impact: number;
    confidence: number;
    semanticDistance?: number;
    conceptualShift?: number;
}
export interface IncrementalChangeResult {
    changes: DocumentChange[];
    metrics: {
        totalChanges: number;
        changeTypes: Record<ChangeType, number>;
        averageConfidence: number;
    };
    timestamp: string;
}
export interface DocumentEvolutionDetector {
    detectEvolution(documentId: string, options?: EvolutionDetectionOptions): Promise<DocumentEvolution>;
    detectChanges(oldContent: string, newContent: string): Promise<ChangeDetectionResult>;
    detectIncrementalChanges(documentId: string, fromVersion?: string): Promise<IncrementalChangeResult>;
}
export interface ChangeDetectionError extends VersionError {
    detectionType: 'structural' | 'content' | 'semantic';
    originalContent?: string;
    newContent?: string;
}
export interface SemanticFingerprint {
    id: string;
    documentId: string;
    versionId?: string;
    contentHash: string;
    embeddings?: number[];
    concepts: string[];
    topics: string[];
    keyPhrases: string[];
    sentimentScore?: number;
    complexityScore: number;
    metadata: Record<string, any>;
    createdAt: string;
}
export interface FingerprintComparison {
    fingerprint1Id: string;
    fingerprint2Id: string;
    similarity: number;
    conceptOverlap: number;
    topicDrift: number;
    sentimentChange?: number;
    complexityChange: number;
    changeScore: number;
    significantDifferences: string[];
    comparedAt: string;
}
export type VersionFilter = {
    documentId?: string;
    versionType?: VersionType;
    dateRange?: {
        start: string;
        end: string;
    };
    tags?: string[];
    author?: string;
};
export type SortOrder = 'asc' | 'desc';
export type VersionSortBy = 'createdAt' | 'updatedAt' | 'versionNumber' | 'author';
export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: VersionSortBy;
    sortOrder?: SortOrder;
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
//# sourceMappingURL=version-tracking.types.d.ts.map