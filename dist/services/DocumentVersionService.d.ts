/**
 * Document Version Service
 *
 * CastPlan MCP Phase 2: Core version tracking system
 * Handles document versioning, comparison, and change detection
 *
 * Created: 2025-07-31
 * Author: Test Automation Specialist
 */
import * as winston from 'winston';
import { DocumentVersion, VersionComparison, VersionOptions, ComparisonOptions, EvolutionDetectionOptions, ChangeDetectionResult } from '../types/version-tracking.types';
export declare class DocumentVersionService {
    private db;
    private logger;
    private isInitialized;
    private locks;
    private readonly maxVersionHistory;
    private readonly maxConcurrentOperations;
    constructor(databasePath: string, logger: winston.Logger);
    initialize(): Promise<void>;
    private setupDatabase;
    createVersion(documentId: string, options?: VersionOptions): Promise<DocumentVersion>;
    getVersion(versionId: string): Promise<DocumentVersion | null>;
    updateVersion(versionId: string, updates: Partial<DocumentVersion>): Promise<DocumentVersion>;
    deleteVersion(versionId: string): Promise<boolean>;
    compareVersions(versionId1: string, versionId2: string, options?: ComparisonOptions): Promise<VersionComparison>;
    detectChanges(documentId: string, options?: EvolutionDetectionOptions): Promise<ChangeDetectionResult>;
    rollbackToVersion(documentId: string, targetVersionId: string): Promise<DocumentVersion>;
    private ensureInitialized;
    private executeWithLock;
    private generateId;
    private generateVersionNumber;
    private generateContentHash;
    private generateSemanticHash;
    private enforceVersionHistoryLimit;
    private mapRowToVersion;
    private getVersionChunks;
    private getVersionRelationships;
    private createRelationship;
    private getDocumentVersions;
    private detectChangesBetweenVersions;
    private detectChunkChanges;
    private compareChunks;
    private calculateSemanticSimilarity;
    private calculateStructuralSimilarity;
    private calculateTextSimilarity;
    destroy(): Promise<void>;
}
export default DocumentVersionService;
//# sourceMappingURL=DocumentVersionService.d.ts.map