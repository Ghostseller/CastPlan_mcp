import { DocumentInfo, ChangeRecord, DocumentationRequest, DocumentationResponse } from '../types/documentation.types.ts';
import { ISyncFileSystem, IPathUtils } from '../interfaces/FileSystemAdapter.ts';
import { I18nService } from './I18nService.ts';
import { LocalizationConfig } from '../types/index.ts';
export declare class DocumentationService {
    private projectRoot;
    private docsRoot;
    private masterDocs;
    private claudeMd;
    private changeHistory;
    private fs;
    private path;
    private i18nService;
    private historyMutex;
    private readonly DOC_CATEGORIES;
    private readonly WORK_TYPE_DOCS;
    constructor(projectRoot: string, fs?: ISyncFileSystem, path?: IPathUtils, localizationConfig?: LocalizationConfig);
    private ensureDirectories;
    processDocumentationRequest(request: DocumentationRequest): Promise<DocumentationResponse>;
    private buildDocumentationContext;
    private referenceDocumentation;
    private updateDocumentation;
    private findRelevantDocumentation;
    private getCategoryDocumentation;
    private getMasterDocumentation;
    private getMasterDocPriorities;
    private updateCategoryDocumentation;
    private updateMasterDocumentation;
    private recordChangeHistory;
    private formatChangeEntry;
    private detectCategory;
    private detectWorkType;
    private scanDirectory;
    /**
     * Generate a localized business plan template
     */
    generateBusinessPlanTemplate(): string;
    /**
     * Generate localized document templates based on type
     */
    generateDocumentTemplate(type: 'businessPlan' | 'readme' | 'changelog'): string;
    private generateReadmeTemplate;
    private generateChangelogTemplate;
    /**
     * Get the I18nService instance for external use
     */
    getI18nService(): I18nService;
    /**
     * Update localization configuration
     */
    updateLocalization(config: LocalizationConfig): void;
    getChangeHistory(): Promise<ChangeRecord[]>;
    searchDocumentation(query: string): Promise<DocumentInfo[]>;
    validateDocumentationStructure(): Promise<{
        valid: boolean;
        issues: string[];
    }>;
}
//# sourceMappingURL=DocumentationService.d.ts.map