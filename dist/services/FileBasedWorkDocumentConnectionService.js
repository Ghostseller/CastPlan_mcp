import { NodeAsyncFileSystem, NodePathUtils } from '../adapters/NodeFileSystemAdapter.ts';
export class WorkDocumentConnectionService {
    logger;
    fs;
    path;
    constructor(logger, fs, path) {
        this.logger = logger;
        this.fs = fs || new NodeAsyncFileSystem();
        this.path = path || new NodePathUtils();
        this.logger.info('WorkDocumentConnectionService initialized');
    }
    /**
     * Analyzes connections in a single document
     */
    async analyzeConnections(filePath, options = {}) {
        try {
            const content = await this.fs.readFile(filePath);
            const connections = this.extractConnections(content, filePath, options);
            if (options.findBacklinks) {
                const backlinks = await this.findBacklinks(filePath);
                connections.backlinks = backlinks;
            }
            return connections;
        }
        catch (error) {
            this.logger.error('Failed to analyze connections:', error);
            throw error;
        }
    }
    /**
     * Builds a connection graph for all documents in a directory
     */
    async buildConnectionGraph(directoryPath, options = {}) {
        const allDocuments = await this.findMarkdownFiles(directoryPath);
        const nodes = [];
        const edges = [];
        const workItems = new Set();
        for (const docPath of allDocuments) {
            try {
                const connections = await this.analyzeConnections(docPath, options);
                // Add document node
                nodes.push({
                    id: docPath,
                    type: 'document',
                    label: this.path.basename(docPath)
                });
                // Add work item nodes and edges
                for (const workItem of connections.workItems) {
                    workItems.add(workItem);
                    // Add work item node if not already added
                    if (!nodes.find(n => n.id === workItem)) {
                        nodes.push({
                            id: workItem,
                            type: 'workItem',
                            label: workItem
                        });
                    }
                    // Add edge from document to work item
                    edges.push({
                        source: docPath,
                        target: workItem,
                        type: 'workItem'
                    });
                }
                // Add document link edges
                for (const linkedDoc of connections.linkedDocuments) {
                    edges.push({
                        source: docPath,
                        target: linkedDoc,
                        type: 'link'
                    });
                }
            }
            catch (error) {
                this.logger.warn(`Failed to analyze ${docPath}:`, error);
            }
        }
        return {
            nodes,
            edges,
            workItems: Array.from(workItems)
        };
    }
    /**
     * Finds orphaned documents (no connections to other documents or work items)
     */
    async findOrphanedDocuments(directoryPath) {
        const graph = await this.buildConnectionGraph(directoryPath);
        const orphaned = [];
        for (const node of graph.nodes) {
            if (node.type === 'document') {
                const hasConnections = graph.edges.some(edge => (edge.source === node.id && edge.target !== node.id) ||
                    (edge.target === node.id && edge.source !== node.id));
                if (!hasConnections) {
                    orphaned.push(node.id);
                }
            }
        }
        return orphaned;
    }
    /**
     * Finds all documents related to a specific work item
     */
    async findWorkItemDocuments(directoryPath, workItem) {
        const graph = await this.buildConnectionGraph(directoryPath);
        const relatedDocs = [];
        for (const edge of graph.edges) {
            if (edge.type === 'workItem' &&
                edge.target.toLowerCase() === workItem.toLowerCase()) {
                relatedDocs.push(edge.source);
            }
        }
        return relatedDocs;
    }
    /**
     * Generates a comprehensive connection report
     */
    async generateConnectionReport(directoryPath) {
        try {
            const graph = await this.buildConnectionGraph(directoryPath);
            const orphaned = await this.findOrphanedDocuments(directoryPath);
            // Create reports directory
            const reportsDir = this.path.join(directoryPath, '.bmad/reports');
            await this.fs.mkdir(reportsDir, { recursive: true });
            // Generate report content
            const report = this.buildReportContent(graph, orphaned, directoryPath);
            // Write report file
            const reportPath = this.path.join(reportsDir, `connection-report-${Date.now()}.md`);
            await this.fs.writeFile(reportPath, report);
            return reportPath;
        }
        catch (error) {
            this.logger.error('Failed to generate connection report:', error);
            throw error;
        }
    }
    /**
     * Extracts connections from document content
     */
    extractConnections(content, filePath, options) {
        const workItemPattern = options.workItemPattern || /(?:TASK|FEATURE|BUG)-\d+/g;
        const linkPattern = /\[\[([^\]]+\.md)\]\]/g;
        // Extract work items
        const workItems = Array.from(new Set(Array.from(content.matchAll(workItemPattern), m => m[0])));
        // Extract linked documents
        const linkedDocuments = [];
        let linkMatch;
        while ((linkMatch = linkPattern.exec(content)) !== null) {
            const linkedPath = this.resolveLinkPath(linkMatch[1], filePath);
            linkedDocuments.push(linkedPath);
        }
        return {
            workItems,
            linkedDocuments,
            backlinks: [] // Will be populated if findBacklinks option is true
        };
    }
    /**
     * Resolves relative document links to absolute paths
     */
    resolveLinkPath(link, currentFilePath) {
        const currentDir = this.path.dirname(currentFilePath);
        if (link.startsWith('./') || link.startsWith('../')) {
            return this.path.resolve(currentDir, link);
        }
        else {
            return this.path.join(currentDir, link);
        }
    }
    /**
     * Finds documents that link back to the specified file
     */
    async findBacklinks(targetFilePath) {
        const targetFileName = this.path.basename(targetFilePath);
        const directoryPath = this.path.dirname(targetFilePath);
        const allFiles = await this.findMarkdownFiles(directoryPath);
        const backlinks = [];
        for (const filePath of allFiles) {
            if (filePath === targetFilePath)
                continue;
            try {
                const content = await this.fs.readFile(filePath);
                if (content.includes(`[[${targetFileName}]]`)) {
                    backlinks.push(filePath);
                }
            }
            catch (error) {
                // Skip files that can't be read
            }
        }
        return backlinks;
    }
    /**
     * Recursively finds all markdown files in a directory
     */
    async findMarkdownFiles(directoryPath) {
        const files = [];
        try {
            const items = await this.fs.readdir(directoryPath);
            for (const item of items) {
                const itemPath = this.path.join(directoryPath, item);
                const stat = await this.fs.stat(itemPath);
                if (stat.isDirectory()) {
                    const subFiles = await this.findMarkdownFiles(itemPath);
                    files.push(...subFiles);
                }
                else if (item.endsWith('.md')) {
                    files.push(itemPath);
                }
            }
        }
        catch (error) {
            // Return empty array if directory can't be read
        }
        return files;
    }
    /**
     * Builds the content for the connection report
     */
    buildReportContent(graph, orphaned, directoryPath) {
        const documentNodes = graph.nodes.filter(n => n.type === 'document');
        const workItemNodes = graph.nodes.filter(n => n.type === 'workItem');
        let report = `# Document Connection Report\n\n`;
        report += `Generated: ${new Date().toISOString()}\n`;
        report += `Directory: ${directoryPath}\n\n`;
        report += `## Summary\n\n`;
        report += `- Total Documents: ${documentNodes.length}\n`;
        report += `- Total Work Items: ${workItemNodes.length}\n`;
        report += `- Total Connections: ${graph.edges.length}\n`;
        report += `- Orphaned Documents: ${orphaned.length}\n\n`;
        if (orphaned.length > 0) {
            report += `## Orphaned Documents\n\n`;
            for (const orphanPath of orphaned) {
                report += `- ${this.path.basename(orphanPath)}\n`;
            }
            report += '\n';
        }
        else {
            report += `## Orphaned Documents\n\nNo documents found without connections.\n\n`;
        }
        if (workItemNodes.length > 0) {
            report += `## Work Items\n\n`;
            for (const workItem of graph.workItems) {
                const relatedDocs = graph.edges
                    .filter(e => e.type === 'workItem' && e.target === workItem)
                    .map(e => this.path.basename(e.source));
                report += `### ${workItem}\n`;
                report += `Connected documents: ${relatedDocs.join(', ')}\n\n`;
            }
        }
        else {
            report += `## Work Items\n\nNo documents found.\n\n`;
        }
        // Find most connected documents
        const connectionCounts = new Map();
        for (const edge of graph.edges) {
            const current = connectionCounts.get(edge.source) || 0;
            connectionCounts.set(edge.source, current + 1);
        }
        if (connectionCounts.size > 0) {
            const sorted = Array.from(connectionCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            report += `## Most Connected Documents\n\n`;
            for (const [docPath, count] of sorted) {
                report += `- ${this.path.basename(docPath)} (${count} connections)\n`;
            }
        }
        return report;
    }
}
//# sourceMappingURL=FileBasedWorkDocumentConnectionService.js.map