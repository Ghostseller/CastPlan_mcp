/**
 * Enhanced Documentation Tool Handlers
 *
 * Advanced tools for document lifecycle management and AI analysis
 */
import { Logger } from 'winston';
import { MCPTool } from '../../types/index.ts';
import { DateTimeService, DocumentLifecycleService, WorkDocumentConnectionService, DocumentTreeService, AIAnalysisService } from '../../services/index.ts';
import { I18nService } from '../../services/I18nService.ts';
import { SemanticChunkingMigrationService } from '../../services/SemanticChunkingMigrationService.ts';
import { UltimateAutomationConfig } from '../../types/index.ts';
interface EnhancedServices {
    dateTimeService: DateTimeService;
    lifecycleService: DocumentLifecycleService;
    connectionService: WorkDocumentConnectionService;
    treeService: DocumentTreeService;
    aiService?: AIAnalysisService;
    i18nService?: I18nService;
    migrationService?: SemanticChunkingMigrationService;
    logger: Logger;
    config: UltimateAutomationConfig;
}
export declare function registerEnhancedTools(tools: Map<string, Function>, services: EnhancedServices): MCPTool[];
export {};
//# sourceMappingURL=index.d.ts.map