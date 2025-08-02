/**
 * Documentation Automation Types
 * Extracted from castplan-automation for clarity
 */
export interface DocumentationContext {
    category: 'frontend' | 'backend' | 'electron' | 'database' | 'testing' | 'development';
    workType: 'implement' | 'fix' | 'refactor' | 'optimize' | 'test' | 'deploy' | 'security';
    files: string[];
    context: string;
}
export interface DocumentInfo {
    path: string;
    category: string;
    relevance: 'essential' | 'high' | 'medium' | 'low';
    lastModified?: Date;
}
export interface ChangeRecord {
    timestamp: string;
    files: string[];
    changes: string;
    context: string;
    category: string[];
}
export interface DocumentationRequest {
    action: 'reference' | 'update';
    files: string[];
    context: string;
    category?: string;
    workType?: string;
}
export interface DocumentationResponse {
    success: boolean;
    documents?: DocumentInfo[];
    updates?: string[];
    message: string;
}
export interface DocumentationServiceConfig {
    enabled: boolean;
    autoUpdate: boolean;
    watchPaths: string[];
    categories: Record<string, any>;
}
//# sourceMappingURL=documentation.types.d.ts.map