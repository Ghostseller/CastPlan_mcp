/**
 * CastPlan Ultimate Automation MCP Server - Unified Type System
 *
 * This file serves as the central type export for all integrated services:
 * - BMAD (Business Model & Architecture Documentation)
 * - Documentation Automation
 * - Hooks Integration
 * - Enhanced AI-powered Documentation Features
 */
export * from './bmad.types.js';
export * from './documentation.types.js';
export * from './hooks.types.js';
export * from './enhanced.types.js';
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}
export interface UltimateSystemStatus {
    bmad: {
        active: boolean;
        tasksCount: number;
        agentsCount: number;
        lastActivity?: string;
    };
    documentation: {
        active: boolean;
        watchedPaths: number;
        lastUpdate: string;
        documentsTracked: number;
    };
    hooks: {
        active: boolean;
        watchersCount: number;
        eventsProcessed: number;
        gitHooksInstalled: boolean;
    };
    enhanced: {
        active: boolean;
        aiEnabled: boolean;
        aiProvider?: 'openai' | 'anthropic' | 'local';
        lifecycleTracking: boolean;
        treeVisualization: boolean;
    };
    health: {
        status: 'healthy' | 'degraded' | 'error';
        uptime: number;
        version: string;
    };
}
export interface LocalizationConfig {
    locale?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
}
export interface UltimateAutomationConfig {
    projectRoot: string;
    databasePath: string;
    services: {
        bmad: boolean;
        documentation: boolean;
        hooks: boolean;
        enhanced: boolean;
    };
    ai: {
        enabled: boolean;
        provider?: 'openai' | 'anthropic' | 'local';
        apiKey?: string;
        model?: string;
    };
    timeZone: string;
    locale: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logFile?: string;
    cacheEnabled: boolean;
    maxConcurrentOperations: number;
    watchMode: boolean;
    watchPatterns?: string[];
    watchIgnored?: string[];
}
//# sourceMappingURL=index.d.ts.map