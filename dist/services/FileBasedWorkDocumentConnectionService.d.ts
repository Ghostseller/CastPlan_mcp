/**
 * File-Based Work Document Connection Service
 *
 * Analyzes document connections and work item relationships through
 * file system analysis. Uses dependency injection for file system operations
 * to enable proper testing and business logic execution.
 *
 * Created: 2025-07-30
 */
import { Logger } from 'winston';
import { IAsyncFileSystem, IPathUtils } from '../interfaces/FileSystemAdapter.ts';
export interface DocumentConnections {
    workItems: string[];
    linkedDocuments: string[];
    backlinks: string[];
}
export interface ConnectionGraph {
    nodes: Array<{
        id: string;
        type: 'document' | 'workItem';
        label: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: 'link' | 'workItem';
    }>;
    workItems: string[];
}
export interface AnalysisOptions {
    workItemPattern?: RegExp;
    findBacklinks?: boolean;
}
export declare class WorkDocumentConnectionService {
    private logger;
    private fs;
    private path;
    constructor(logger: Logger, fs?: IAsyncFileSystem, path?: IPathUtils);
    /**
     * Analyzes connections in a single document
     */
    analyzeConnections(filePath: string, options?: AnalysisOptions): Promise<DocumentConnections>;
    /**
     * Builds a connection graph for all documents in a directory
     */
    buildConnectionGraph(directoryPath: string, options?: AnalysisOptions): Promise<ConnectionGraph>;
    /**
     * Finds orphaned documents (no connections to other documents or work items)
     */
    findOrphanedDocuments(directoryPath: string): Promise<string[]>;
    /**
     * Finds all documents related to a specific work item
     */
    findWorkItemDocuments(directoryPath: string, workItem: string): Promise<string[]>;
    /**
     * Generates a comprehensive connection report
     */
    generateConnectionReport(directoryPath: string): Promise<string>;
    /**
     * Extracts connections from document content
     */
    private extractConnections;
    /**
     * Resolves relative document links to absolute paths
     */
    private resolveLinkPath;
    /**
     * Finds documents that link back to the specified file
     */
    private findBacklinks;
    /**
     * Recursively finds all markdown files in a directory
     */
    private findMarkdownFiles;
    /**
     * Builds the content for the connection report
     */
    private buildReportContent;
}
//# sourceMappingURL=FileBasedWorkDocumentConnectionService.d.ts.map