/**
 * Documentation Tool Handlers
 */
export function registerDocumentationTools(tools, documentationService) {
    // Tool definitions
    const documentationTools = [
        {
            name: 'docs_reference',
            description: 'Find and reference relevant documentation for development work',
            inputSchema: {
                type: 'object',
                properties: {
                    files: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of file paths being worked on'
                    },
                    context: {
                        type: 'string',
                        description: 'Context or description of the work being done'
                    },
                    category: {
                        type: 'string',
                        enum: ['frontend', 'backend', 'electron', 'database', 'testing'],
                        description: 'Primary category of work (optional, auto-detected if not provided)'
                    },
                    workType: {
                        type: 'string',
                        enum: ['implement', 'fix', 'refactor', 'optimize', 'test', 'deploy', 'security'],
                        description: 'Type of work being done (optional, auto-detected if not provided)'
                    }
                },
                required: ['files', 'context']
            }
        },
        {
            name: 'docs_update',
            description: 'Update documentation after completing development work',
            inputSchema: {
                type: 'object',
                properties: {
                    files: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of file paths that were modified'
                    },
                    context: {
                        type: 'string',
                        description: 'Description of changes made'
                    },
                    category: {
                        type: 'string',
                        enum: ['frontend', 'backend', 'electron', 'database', 'testing'],
                        description: 'Primary category of work (optional, auto-detected if not provided)'
                    }
                },
                required: ['files', 'context']
            }
        },
        {
            name: 'docs_search',
            description: 'Search through project documentation',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query to find relevant documentation'
                    }
                },
                required: ['query']
            }
        },
        {
            name: 'docs_validate',
            description: 'Validate documentation structure and completeness',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    ];
    // Register tool handlers
    tools.set('docs_reference', async (args) => {
        return await documentationService.processDocumentationRequest({
            action: 'reference',
            files: args.files,
            context: args.context,
            category: args.category,
            workType: args.workType
        });
    });
    tools.set('docs_update', async (args) => {
        return await documentationService.processDocumentationRequest({
            action: 'update',
            files: args.files,
            context: args.context,
            category: args.category
        });
    });
    tools.set('docs_search', async (args) => {
        const searchResults = await documentationService.searchDocumentation(args.query);
        return { query: args.query, results: searchResults };
    });
    tools.set('docs_validate', async () => {
        return await documentationService.validateDocumentationStructure();
    });
    return documentationTools;
}
//# sourceMappingURL=index.js.map