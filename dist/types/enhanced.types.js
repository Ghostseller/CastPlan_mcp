import { z } from 'zod';
// =============================================================================
// ENHANCED DOCUMENT AUTOMATION TYPES (2025 Edition)
// =============================================================================
/**
 * Core types for document lifecycle tracking and AI integration
 * Created: 2025-07-29
 */
// Date/Time Service Types
export const DateTimeSchema = z.object({
    timestamp: z.string().datetime(), // ISO 8601 format
    timezone: z.string().optional(), // Auto-detected if not provided
    format: z.enum(['iso', 'localized', 'short']).default('iso'),
});
// Document Lifecycle States
export var DocumentLifecycleState;
(function (DocumentLifecycleState) {
    DocumentLifecycleState["DRAFT"] = "draft";
    DocumentLifecycleState["REVIEW"] = "review";
    DocumentLifecycleState["APPROVED"] = "approved";
    DocumentLifecycleState["PUBLISHED"] = "published";
    DocumentLifecycleState["OUTDATED"] = "outdated";
    DocumentLifecycleState["ARCHIVED"] = "archived";
})(DocumentLifecycleState || (DocumentLifecycleState = {}));
// Work-Document Connection Types
export const WorkDocumentConnectionSchema = z.object({
    id: z.string().uuid(),
    workType: z.enum(['frontend', 'backend', 'database', 'electron', 'testing', 'deployment']),
    workDescription: z.string(),
    filePaths: z.array(z.string()),
    connectedDocuments: z.array(z.string()), // Document IDs
    connectionStrength: z.number().min(0).max(1), // AI-calculated relevance score
    lastSyncedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
// Document Metadata Enhanced
export const DocumentMetadataSchema = z.object({
    id: z.string().uuid(),
    filePath: z.string(),
    title: z.string(),
    category: z.enum(['master', 'component', 'api', 'database', 'electron', 'testing', 'deployment']),
    version: z.string().default('1.0.0'),
    state: z.nativeEnum(DocumentLifecycleState),
    tags: z.array(z.string()).default([]),
    dependencies: z.array(z.string()).default([]), // Other document IDs
    workConnections: z.array(z.string()).default([]), // WorkDocumentConnection IDs
    lastModified: z.string().datetime(),
    lastReviewed: z.string().datetime().optional(),
    nextReviewDue: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    aiQualityScore: z.number().min(0).max(1).optional(),
    duplicateDetectionHash: z.string().optional(),
});
// Document Tree Structure
export const DocumentNodeSchema = z.object({
    id: z.string().uuid(),
    documentId: z.string().uuid(),
    parentId: z.string().uuid().optional(),
    children: z.array(z.string().uuid()).default([]),
    depth: z.number().min(0).default(0),
    order: z.number().default(0),
    treeType: z.enum(['master', 'component', 'category']).default('component'),
});
// AI Analysis Results
export const AIAnalysisSchema = z.object({
    documentId: z.string().uuid(),
    analysisType: z.enum(['quality', 'duplicate', 'relevance', 'completeness']),
    score: z.number().min(0).max(1),
    insights: z.array(z.string()),
    suggestions: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    analyzedAt: z.string().datetime(),
});
// MCP Tool Schemas
export const InitializeDocumentationSystemSchema = z.object({
    projectRoot: z.string(),
    enableAI: z.boolean().default(true),
    timeZone: z.string().optional(), // Auto-detected if not provided
    locale: z.string().optional(), // Auto-detected if not provided
});
export const TrackDocumentWorkSchema = z.object({
    workType: z.enum(['frontend', 'backend', 'database', 'electron', 'testing', 'deployment']),
    workDescription: z.string(),
    filePaths: z.array(z.string()),
    expectedDocuments: z.array(z.string()).optional(),
});
export const AnalyzeDocumentQualitySchema = z.object({
    documentPath: z.string(),
    includeAI: z.boolean().default(true),
    analysisTypes: z.array(z.enum(['quality', 'duplicate', 'relevance', 'completeness'])).default(['quality']),
});
export const GetDocumentTreeSchema = z.object({
    rootCategory: z.enum(['master', 'component', 'category']).optional(),
    includeMetadata: z.boolean().default(false),
    maxDepth: z.number().default(10),
});
export const UpdateDocumentLifecycleSchema = z.object({
    documentId: z.string().uuid(),
    newState: z.nativeEnum(DocumentLifecycleState),
    reviewComment: z.string().optional(),
    scheduledReview: z.string().datetime().optional(),
});
export const GenerateDocumentationReportSchema = z.object({
    reportType: z.enum(['lifecycle', 'quality', 'connections', 'duplicates', 'comprehensive']),
    timeRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }).optional(),
    includeAI: z.boolean().default(true),
});
//# sourceMappingURL=enhanced.types.js.map