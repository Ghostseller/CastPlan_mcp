import { z } from 'zod';
export type { LocalizationConfig } from './index.ts';
/**
 * Core types for document lifecycle tracking and AI integration
 * Created: 2025-07-29
 */
export declare const DateTimeSchema: z.ZodObject<{
    timestamp: z.ZodString;
    timezone: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["iso", "localized", "short"]>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    format: "iso" | "localized" | "short";
    timezone?: string | undefined;
}, {
    timestamp: string;
    timezone?: string | undefined;
    format?: "iso" | "localized" | "short" | undefined;
}>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export declare enum DocumentLifecycleState {
    DRAFT = "draft",
    REVIEW = "review",
    APPROVED = "approved",
    PUBLISHED = "published",
    OUTDATED = "outdated",
    ARCHIVED = "archived"
}
export declare const WorkDocumentConnectionSchema: z.ZodObject<{
    id: z.ZodString;
    workType: z.ZodEnum<["frontend", "backend", "database", "electron", "testing", "deployment"]>;
    workDescription: z.ZodString;
    filePaths: z.ZodArray<z.ZodString, "many">;
    connectedDocuments: z.ZodArray<z.ZodString, "many">;
    connectionStrength: z.ZodNumber;
    lastSyncedAt: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    workType: "testing" | "frontend" | "backend" | "electron" | "database" | "deployment";
    workDescription: string;
    filePaths: string[];
    connectedDocuments: string[];
    connectionStrength: number;
    lastSyncedAt: string;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    workType: "testing" | "frontend" | "backend" | "electron" | "database" | "deployment";
    workDescription: string;
    filePaths: string[];
    connectedDocuments: string[];
    connectionStrength: number;
    lastSyncedAt: string;
    createdAt: string;
    updatedAt: string;
}>;
export type WorkDocumentConnection = z.infer<typeof WorkDocumentConnectionSchema>;
export declare const DocumentMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    filePath: z.ZodString;
    title: z.ZodString;
    category: z.ZodEnum<["master", "component", "api", "database", "electron", "testing", "deployment"]>;
    version: z.ZodDefault<z.ZodString>;
    state: z.ZodNativeEnum<typeof DocumentLifecycleState>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    workConnections: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lastModified: z.ZodString;
    lastReviewed: z.ZodOptional<z.ZodString>;
    nextReviewDue: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    aiQualityScore: z.ZodOptional<z.ZodNumber>;
    duplicateDetectionHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    version: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    filePath: string;
    title: string;
    category: "api" | "testing" | "electron" | "database" | "deployment" | "master" | "component";
    state: DocumentLifecycleState;
    tags: string[];
    dependencies: string[];
    workConnections: string[];
    lastModified: string;
    lastReviewed?: string | undefined;
    nextReviewDue?: string | undefined;
    aiQualityScore?: number | undefined;
    duplicateDetectionHash?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    filePath: string;
    title: string;
    category: "api" | "testing" | "electron" | "database" | "deployment" | "master" | "component";
    state: DocumentLifecycleState;
    lastModified: string;
    version?: string | undefined;
    tags?: string[] | undefined;
    dependencies?: string[] | undefined;
    workConnections?: string[] | undefined;
    lastReviewed?: string | undefined;
    nextReviewDue?: string | undefined;
    aiQualityScore?: number | undefined;
    duplicateDetectionHash?: string | undefined;
}>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export declare const DocumentNodeSchema: z.ZodObject<{
    id: z.ZodString;
    documentId: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
    children: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    depth: z.ZodDefault<z.ZodNumber>;
    order: z.ZodDefault<z.ZodNumber>;
    treeType: z.ZodDefault<z.ZodEnum<["master", "component", "category"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    documentId: string;
    children: string[];
    depth: number;
    order: number;
    treeType: "category" | "master" | "component";
    parentId?: string | undefined;
}, {
    id: string;
    documentId: string;
    parentId?: string | undefined;
    children?: string[] | undefined;
    depth?: number | undefined;
    order?: number | undefined;
    treeType?: "category" | "master" | "component" | undefined;
}>;
export type DocumentNode = z.infer<typeof DocumentNodeSchema>;
export declare const AIAnalysisSchema: z.ZodObject<{
    documentId: z.ZodString;
    analysisType: z.ZodEnum<["quality", "duplicate", "relevance", "completeness"]>;
    score: z.ZodNumber;
    insights: z.ZodArray<z.ZodString, "many">;
    suggestions: z.ZodArray<z.ZodString, "many">;
    confidence: z.ZodNumber;
    analyzedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    documentId: string;
    analysisType: "quality" | "duplicate" | "relevance" | "completeness";
    score: number;
    insights: string[];
    suggestions: string[];
    analyzedAt: string;
}, {
    confidence: number;
    documentId: string;
    analysisType: "quality" | "duplicate" | "relevance" | "completeness";
    score: number;
    insights: string[];
    suggestions: string[];
    analyzedAt: string;
}>;
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
export declare const InitializeDocumentationSystemSchema: z.ZodObject<{
    projectRoot: z.ZodString;
    enableAI: z.ZodDefault<z.ZodBoolean>;
    timeZone: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectRoot: string;
    enableAI: boolean;
    timeZone?: string | undefined;
    locale?: string | undefined;
}, {
    projectRoot: string;
    enableAI?: boolean | undefined;
    timeZone?: string | undefined;
    locale?: string | undefined;
}>;
export declare const TrackDocumentWorkSchema: z.ZodObject<{
    workType: z.ZodEnum<["frontend", "backend", "database", "electron", "testing", "deployment"]>;
    workDescription: z.ZodString;
    filePaths: z.ZodArray<z.ZodString, "many">;
    expectedDocuments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    workType: "testing" | "frontend" | "backend" | "electron" | "database" | "deployment";
    workDescription: string;
    filePaths: string[];
    expectedDocuments?: string[] | undefined;
}, {
    workType: "testing" | "frontend" | "backend" | "electron" | "database" | "deployment";
    workDescription: string;
    filePaths: string[];
    expectedDocuments?: string[] | undefined;
}>;
export declare const AnalyzeDocumentQualitySchema: z.ZodObject<{
    documentPath: z.ZodString;
    includeAI: z.ZodDefault<z.ZodBoolean>;
    analysisTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["quality", "duplicate", "relevance", "completeness"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    includeAI: boolean;
    documentPath: string;
    analysisTypes: ("quality" | "duplicate" | "relevance" | "completeness")[];
}, {
    documentPath: string;
    includeAI?: boolean | undefined;
    analysisTypes?: ("quality" | "duplicate" | "relevance" | "completeness")[] | undefined;
}>;
export declare const GetDocumentTreeSchema: z.ZodObject<{
    rootCategory: z.ZodOptional<z.ZodEnum<["master", "component", "category"]>>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    includeMetadata: boolean;
    maxDepth: number;
    rootCategory?: "category" | "master" | "component" | undefined;
}, {
    rootCategory?: "category" | "master" | "component" | undefined;
    includeMetadata?: boolean | undefined;
    maxDepth?: number | undefined;
}>;
export declare const UpdateDocumentLifecycleSchema: z.ZodObject<{
    documentId: z.ZodString;
    newState: z.ZodNativeEnum<typeof DocumentLifecycleState>;
    reviewComment: z.ZodOptional<z.ZodString>;
    scheduledReview: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    newState: DocumentLifecycleState;
    reviewComment?: string | undefined;
    scheduledReview?: string | undefined;
}, {
    documentId: string;
    newState: DocumentLifecycleState;
    reviewComment?: string | undefined;
    scheduledReview?: string | undefined;
}>;
export declare const GenerateDocumentationReportSchema: z.ZodObject<{
    reportType: z.ZodEnum<["lifecycle", "quality", "connections", "duplicates", "comprehensive"]>;
    timeRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>;
    includeAI: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeAI: boolean;
    reportType: "quality" | "lifecycle" | "connections" | "duplicates" | "comprehensive";
    timeRange?: {
        start: string;
        end: string;
    } | undefined;
}, {
    reportType: "quality" | "lifecycle" | "connections" | "duplicates" | "comprehensive";
    includeAI?: boolean | undefined;
    timeRange?: {
        start: string;
        end: string;
    } | undefined;
}>;
export interface DocumentationDatabase {
    documents: DocumentMetadata[];
    workConnections: WorkDocumentConnection[];
    documentTree: DocumentNode[];
    aiAnalyses: AIAnalysis[];
}
export interface DateTimeService {
    getCurrentTimestamp(): string;
    formatDate(date: string, format: 'iso' | 'localized' | 'short'): string;
    getCurrentLocalizedDate(): string;
    isValidDateTime(dateString: string): boolean;
    setLocalizationConfig(config: import('./index.ts').LocalizationConfig): void;
    getLocalizationConfig(): import('./index.ts').LocalizationConfig;
}
export interface DocumentLifecycleService {
    trackDocument(metadata: Omit<DocumentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentMetadata>;
    updateDocumentState(id: string, state: DocumentLifecycleState): Promise<void>;
    getDocumentsByState(state: DocumentLifecycleState): Promise<DocumentMetadata[]>;
    scheduleReview(id: string, reviewDate: string): Promise<void>;
}
export interface WorkDocumentConnectionService {
    initialize(): Promise<void>;
    isInitialized(): boolean;
    createConnection(connection: Omit<WorkDocumentConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkDocumentConnection>;
    findConnectionsByWork(workType: string, filePaths: string[]): Promise<WorkDocumentConnection[]>;
    updateConnectionStrength(id: string, strength: number): Promise<void>;
    getAllConnections(): Promise<WorkDocumentConnection[]>;
}
export interface DocumentTreeService {
    buildTree(documents: DocumentMetadata[]): Promise<DocumentNode[]>;
    addToTree(documentId: string, parentId?: string): Promise<DocumentNode>;
    moveInTree(nodeId: string, newParentId?: string): Promise<void>;
    getSubtree(rootId: string, maxDepth?: number): Promise<DocumentNode[]>;
}
export interface AIAnalysisService {
    analyzeQuality(documentPath: string): Promise<AIAnalysis>;
    detectDuplicates(documentPath: string): Promise<AIAnalysis>;
    calculateRelevance(documentPath: string, workContext: string): Promise<AIAnalysis>;
    generateInsights(documentPath: string): Promise<string[]>;
}
export interface EnhancedDocAutomationConfig {
    projectRoot: string;
    databasePath: string;
    enableAI: boolean;
    aiProvider: 'openai' | 'anthropic' | 'local';
    localization?: import('./index.ts').LocalizationConfig;
    watchMode: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
//# sourceMappingURL=enhanced.types.d.ts.map