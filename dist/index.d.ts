#!/usr/bin/env node
/**
 * CastPlan Ultimate Automation MCP Server
 *
 * Unified automation server combining:
 * - BMAD (Business Model & Architecture Documentation)
 * - Documentation Automation & Tracking
 * - Hooks Integration
 * - AI-powered Analysis (Optional)
 *
 * Version: 2.0.0
 * Created: 2025-01-30
 */
declare class CastPlanUltimateAutomationServer {
    private server;
    private config;
    private logger;
    private bmadService?;
    private documentationService?;
    private hooksService?;
    private dateTimeService?;
    private lifecycleService?;
    private connectionService?;
    private treeService?;
    private aiService?;
    private i18nService?;
    private tools;
    private toolDefinitions;
    private errorRecovery?;
    private healthMonitor?;
    private degradationManager?;
    constructor();
    /**
     * Load configuration from environment and defaults
     */
    private loadConfiguration;
    /**
     * Create Winston logger
     */
    private createLogger;
    /**
     * Initialize error recovery and monitoring systems
     */
    private initializeErrorRecovery;
    /**
     * Setup health checks for all services
     */
    private setupHealthChecks;
    /**
     * Initialize all enabled services
     */
    private initializeServices;
    /**
     * Setup MCP request handlers
     */
    private setupHandlers;
    /**
     * Register all available tools
     */
    private registerAllTools;
    /**
     * Get all available resources
     */
    private getResources;
    /**
     * Read a specific resource
     */
    private readResource;
    /**
     * Get all available tools
     */
    private getTools;
    /**
     * Call a specific tool
     */
    private callTool;
    /**
     * Get fallback function for specific tools
     */
    private getFallbackForTool;
    /**
     * Get comprehensive system status
     */
    private getSystemStatus;
    private getEnabledServicesCount;
    private generateDocumentStatusSummary;
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Graceful server shutdown
     */
    private shutdown;
}
export { CastPlanUltimateAutomationServer };
//# sourceMappingURL=index.d.ts.map