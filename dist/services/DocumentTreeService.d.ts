import { Logger } from 'winston';
import { DocumentTreeService as IDocumentTreeService, DocumentNode, DocumentMetadata } from '../types/enhanced.types.js';
/**
 * Document Tree Structure Service
 *
 * Manages hierarchical organization of documentation.
 * Builds and maintains tree structures for navigation and organization.
 *
 * Created: 2025-07-29
 */
export declare class DocumentTreeService implements IDocumentTreeService {
    private db;
    private dbPath;
    private logger;
    constructor(databasePath: string, logger: Logger, mockDb?: any);
    initialize(): Promise<void>;
    buildTree(documents: DocumentMetadata[]): Promise<DocumentNode[]>;
    addToTree(documentId: string, parentId?: string): Promise<DocumentNode>;
    moveInTree(nodeId: string, newParentId?: string): Promise<void>;
    getSubtree(rootId: string, maxDepth?: number): Promise<DocumentNode[]>;
    private categorizeDocuments;
    private createTreeNode;
    private getNodeById;
    private getNodeDepth;
    private getChildrenCount;
    private updateParentChildren;
    private removeFromParentChildren;
    private mapRowToNode;
}
//# sourceMappingURL=DocumentTreeService.d.ts.map