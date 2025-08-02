/**
 * Hooks Tool Handlers
 */
export function registerHooksTools(tools, hooksService) {
    // Tool definitions
    const hooksTools = [
        {
            name: 'hooks_trigger',
            description: 'Trigger a hook event manually',
            inputSchema: {
                type: 'object',
                properties: {
                    eventType: {
                        type: 'string',
                        enum: ['pre-work', 'post-work', 'file-change', 'session-start', 'session-end'],
                        description: 'Type of hook event to trigger'
                    },
                    data: {
                        type: 'object',
                        description: 'Event data payload',
                        additionalProperties: true
                    }
                },
                required: ['eventType', 'data']
            }
        },
        {
            name: 'hooks_setup_git',
            description: 'Setup Git hooks for automated documentation and validation',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        {
            name: 'hooks_start_watching',
            description: 'Start file system watching for automatic event triggering',
            inputSchema: {
                type: 'object',
                properties: {
                    patterns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'File patterns to watch (optional, uses defaults if not provided)'
                    }
                },
                required: []
            }
        },
        {
            name: 'hooks_stop_watching',
            description: 'Stop file system watching',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    ];
    // Register tool handlers
    tools.set('hooks_trigger', async (args) => {
        return await hooksService.processHookRequest({
            event: {
                type: args.eventType,
                data: args.data,
                timestamp: new Date().toISOString()
            }
        });
    });
    tools.set('hooks_setup_git', async () => {
        const gitSetup = await hooksService.setupGitHooks();
        return { success: gitSetup, message: gitSetup ? 'Git hooks setup successfully' : 'Failed to setup Git hooks' };
    });
    tools.set('hooks_start_watching', async (args) => {
        await hooksService.startFileWatching(args.patterns);
        return { success: true, message: 'File watching started', patterns: args.patterns };
    });
    tools.set('hooks_stop_watching', async () => {
        await hooksService.stopFileWatching();
        return { success: true, message: 'File watching stopped' };
    });
    return hooksTools;
}
//# sourceMappingURL=index.js.map