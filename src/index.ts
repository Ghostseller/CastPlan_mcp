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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from 'winston';
import * as winston from 'winston';
import * as path from 'path';

// Import types
import { 
  MCPResource, 
  MCPTool, 
  UltimateSystemStatus,
  UltimateAutomationConfig
} from './types/index.js';

// Import services
import { BMADService } from './services/BMADService.js';
import { DocumentationService } from './services/DocumentationService.js';
import { HooksService } from './services/HooksService.js';
import { DateTimeService } from './services/DateTimeService.js';
import { DocumentLifecycleService } from './services/DocumentLifecycleService.js';
import { WorkDocumentConnectionService } from './services/WorkDocumentConnectionService.js';
import { DocumentTreeService } from './services/DocumentTreeService.js';
import { AIAnalysisService } from './services/AIAnalysisService.js';
import { I18nService } from './services/I18nService.js';

// Import tool handlers
import { registerBMADTools } from './tools/bmad/index.js';
import { registerDocumentationTools } from './tools/documentation/index.js';
import { registerHooksTools } from './tools/hooks/index.js';
import { registerEnhancedTools } from './tools/enhanced/index.js';

// Import error recovery and monitoring
import { ErrorRecoveryManager } from './utils/ErrorRecoveryManager.js';
import { HealthMonitor, BuiltInHealthChecks } from './utils/HealthMonitor.js';
import { GracefulDegradationManager } from './utils/GracefulDegradation.js';

class CastPlanUltimateAutomationServer {
  private server: Server;
  private config: UltimateAutomationConfig;
  private logger: Logger;
  
  // Core services
  private bmadService?: BMADService;
  private documentationService?: DocumentationService;
  private hooksService?: HooksService;
  
  // Enhanced services
  private dateTimeService?: DateTimeService;
  private lifecycleService?: DocumentLifecycleService;
  private connectionService?: WorkDocumentConnectionService;
  private treeService?: DocumentTreeService;
  private aiService?: AIAnalysisService;
  private i18nService?: I18nService;
  
  // Tool registry
  private tools: Map<string, Function> = new Map();
  private toolDefinitions: MCPTool[] = [];
  
  // Error recovery and monitoring
  private errorRecovery?: ErrorRecoveryManager;
  private healthMonitor?: HealthMonitor;
  private degradationManager?: GracefulDegradationManager;
  
  constructor() {
    this.config = this.loadConfiguration();
    this.logger = this.createLogger();
    
    this.server = new Server(
      {
        name: 'castplan-ultimate-automation',
        version: '2.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );
    
    this.initializeErrorRecovery();
    this.initializeServices();
    this.setupHandlers();
    this.registerAllTools();
  }
  
  /**
   * Load configuration from environment and defaults
   */
  private loadConfiguration(): UltimateAutomationConfig {
    const projectRoot = process.env.CASTPLAN_PROJECT_ROOT || process.cwd();
    const databasePath = process.env.CASTPLAN_DATABASE_PATH || path.join(projectRoot, '.castplan-ultimate.db');
    
    // Initialize I18nService for auto-detection
    const tempI18nService = new I18nService();
    const i18nConfig = tempI18nService.getConfig();
    
    return {
      projectRoot,
      databasePath,
      
      services: {
        bmad: process.env.CASTPLAN_ENABLE_BMAD !== 'false',
        documentation: process.env.CASTPLAN_ENABLE_DOCS !== 'false',
        hooks: process.env.CASTPLAN_ENABLE_HOOKS !== 'false',
        enhanced: process.env.CASTPLAN_ENABLE_ENHANCED !== 'false',
      },
      
      ai: {
        enabled: process.env.CASTPLAN_ENABLE_AI === 'true',
        provider: (process.env.CASTPLAN_AI_PROVIDER as any) || 'openai',
        apiKey: process.env.CASTPLAN_AI_API_KEY,
        model: process.env.CASTPLAN_AI_MODEL,
      },
      
      // Use I18nService auto-detection with environment variable overrides
      timeZone: process.env.CASTPLAN_TIMEZONE || i18nConfig.timezone,
      locale: process.env.CASTPLAN_LOCALE || i18nConfig.locale,
      
      logLevel: (process.env.CASTPLAN_LOG_LEVEL as any) || 'info',
      logFile: process.env.CASTPLAN_LOG_FILE,
      
      cacheEnabled: process.env.CASTPLAN_ENABLE_CACHE !== 'false',
      maxConcurrentOperations: parseInt(process.env.CASTPLAN_MAX_CONCURRENT || '5'),
      
      watchMode: process.env.CASTPLAN_WATCH_MODE === 'true',
      watchPatterns: process.env.CASTPLAN_WATCH_PATTERNS?.split(','),
      watchIgnored: process.env.CASTPLAN_WATCH_IGNORED?.split(','),
    };
  }
  
  /**
   * Create Winston logger
   */
  private createLogger(): Logger {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];
    
    if (this.config.logFile) {
      transports.push(
        new winston.transports.File({
          filename: this.config.logFile,
          format: winston.format.json()
        })
      );
    }
    
    return winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports
    });
  }
  
  /**
   * Initialize error recovery and monitoring systems
   */
  private initializeErrorRecovery(): void {
    this.logger.info('Initializing error recovery and monitoring systems...');
    
    // Initialize error recovery manager
    this.errorRecovery = new ErrorRecoveryManager(this.logger);
    
    // Initialize health monitor
    this.healthMonitor = new HealthMonitor(this.logger, {
      checkInterval: 30000, // 30 seconds
      metricsInterval: 10000, // 10 seconds
      thresholds: {
        memoryThreshold: 512, // MB
        latencyThreshold: 5000, // 5 seconds
        errorRateThreshold: 5, // 5%
        consecutiveFailureThreshold: 3
      }
    });
    
    // Initialize graceful degradation manager
    this.degradationManager = new GracefulDegradationManager(this.logger);
    
    // Register core services for degradation monitoring
    this.degradationManager.registerService({
      name: 'database',
      essential: true,
      fallbackAvailable: false,
      degradationThreshold: 3,
      recoveryThreshold: 2
    });
    
    this.degradationManager.registerService({
      name: 'ai-analysis',
      essential: false,
      fallbackAvailable: true,
      degradationThreshold: 2,
      recoveryThreshold: 3
    });
    
    this.degradationManager.registerService({
      name: 'file-system',
      essential: true,
      fallbackAvailable: false,
      degradationThreshold: 5,
      recoveryThreshold: 2
    });
    
    // Register features for degradation
    this.degradationManager.registerFeature('ai-analysis', {
      enabled: true,
      degradationLevel: 2, // Disable at moderate degradation
      fallback: async () => ({
        score: null,
        insights: ['AI analysis unavailable - using basic metrics'],
        suggestions: ['Ensure AI service is running for detailed analysis']
      })
    });
    
    this.degradationManager.registerFeature('advanced-search', {
      enabled: true,
      degradationLevel: 1, // Disable at minimal degradation
    });
    
    // Setup health checks
    this.setupHealthChecks();
    
    this.logger.info('✅ Error recovery and monitoring systems initialized');
  }
  
  /**
   * Setup health checks for all services
   */
  private setupHealthChecks(): void {
    if (!this.healthMonitor) return;
    
    // Memory health check
    this.healthMonitor.registerHealthCheck(
      'memory',
      BuiltInHealthChecks.createMemoryHealthCheck(512) // 512MB threshold
    );
    
    // File system health check
    this.healthMonitor.registerHealthCheck(
      'filesystem',
      BuiltInHealthChecks.createFileSystemHealthCheck(this.config.projectRoot)
    );
    
    // Database health check (will be set up after database services are initialized)
    if (this.config.services.enhanced) {
      this.healthMonitor.registerHealthCheck('database', async () => {
        try {
          // Test database connectivity through lifecycle service
          if (this.lifecycleService) {
            await this.lifecycleService.getAllDocuments();
          }
          return {
            status: 'HEALTHY' as any,
            latency: 0,
            message: 'Database connection OK',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'UNHEALTHY' as any,
            latency: 0,
            message: `Database error: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });
    }
    
    // AI service health check (if enabled)
    if (this.config.ai.enabled && this.config.ai.apiKey) {
      this.healthMonitor.registerHealthCheck('ai-service', async () => {
        try {
          if (this.aiService) {
            // Simple test operation
            await this.aiService.calculateRelevance('test', 'test');
          }
          return {
            status: 'HEALTHY' as any,
            latency: 0,
            message: 'AI service OK',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'DEGRADED' as any,
            latency: 0,
            message: `AI service issue: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });
    }
  }
  
  /**
   * Initialize all enabled services
   */
  private initializeServices(): void {
    this.logger.info('Initializing CastPlan Ultimate Automation services...');
    
    // Core services
    if (this.config.services.bmad) {
      this.bmadService = new BMADService();
      this.logger.info('✅ BMAD Service initialized');
    }
    
    if (this.config.services.documentation) {
      this.documentationService = new DocumentationService(this.config.projectRoot);
      this.logger.info('✅ Documentation Service initialized');
    }
    
    if (this.config.services.hooks) {
      this.hooksService = new HooksService(this.config.projectRoot);
      this.logger.info('✅ Hooks Service initialized');
    }
    
    // Enhanced services
    if (this.config.services.enhanced) {
      // Initialize I18nService with current configuration
      this.i18nService = new I18nService({
        locale: this.config.locale,
        timezone: this.config.timeZone
      });
      
      this.dateTimeService = new DateTimeService(this.logger, this.i18nService);
      this.lifecycleService = new DocumentLifecycleService(this.config.databasePath, this.logger);
      this.connectionService = new WorkDocumentConnectionService(this.config.databasePath, this.logger);
      this.treeService = new DocumentTreeService(this.config.databasePath, this.logger);
      this.logger.info('✅ Enhanced Documentation Services initialized');
      this.logger.info(`✅ I18nService initialized (locale: ${this.config.locale}, timezone: ${this.config.timeZone})`);
      
      if (this.config.ai.enabled && this.config.ai.apiKey && this.config.ai.provider) {
        this.aiService = new AIAnalysisService(this.config.ai.provider, this.logger);
        this.logger.info(`✅ AI Analysis Service initialized (${this.config.ai.provider})`);
      }
    }
  }
  
  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.getResources()
      };
    });
    
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;
      return await this.readResource(uri);
    });
    
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools()
      };
    });
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      return await this.callTool(name, args || {});
    });
  }
  
  /**
   * Register all available tools
   */
  private registerAllTools(): void {
    this.toolDefinitions = [];
    
    if (this.config.services.bmad && this.bmadService) {
      const bmadTools = registerBMADTools(this.tools, this.bmadService);
      this.toolDefinitions.push(...bmadTools);
    }
    
    if (this.config.services.documentation && this.documentationService) {
      const docTools = registerDocumentationTools(this.tools, this.documentationService);
      this.toolDefinitions.push(...docTools);
    }
    
    if (this.config.services.hooks && this.hooksService) {
      const hookTools = registerHooksTools(this.tools, this.hooksService);
      this.toolDefinitions.push(...hookTools);
    }
    
    if (this.config.services.enhanced) {
      const enhancedServices = {
        dateTimeService: this.dateTimeService!,
        lifecycleService: this.lifecycleService!,
        connectionService: this.connectionService!,
        treeService: this.treeService!,
        aiService: this.aiService,
        i18nService: this.i18nService,
        logger: this.logger,
        config: this.config
      };
      const enhancedTools = registerEnhancedTools(this.tools, enhancedServices);
      this.toolDefinitions.push(...enhancedTools);
    }
    
    this.logger.info(`✅ Registered ${this.tools.size} tools total`);
  }
  
  /**
   * Get all available resources
   */
  private getResources(): MCPResource[] {
    const resources: MCPResource[] = [
      {
        uri: 'castplan://status',
        name: 'System Status',
        description: 'Comprehensive status of all CastPlan automation services',
        mimeType: 'application/json'
      }
    ];
    
    // Add service-specific resources
    if (this.config.services.bmad) {
      resources.push(
        {
          uri: 'castplan://tasks',
          name: 'BMAD Tasks',
          description: 'Current tasks from Business Model & Architecture Documentation',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://agents',
          name: 'BMAD Agents',
          description: 'Available agents for task assignment',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://assignments',
          name: 'Task Assignments',
          description: 'Current task assignments to agents',
          mimeType: 'application/json'
        }
      );
    }
    
    if (this.config.services.documentation) {
      resources.push({
        uri: 'castplan://documentation/history',
        name: 'Documentation Change History',
        description: 'History of documentation changes',
        mimeType: 'application/json'
      });
    }
    
    if (this.config.services.hooks) {
      resources.push(
        {
          uri: 'castplan://hooks/events',
          name: 'Hook Events History',
          description: 'History of hook events processed',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://hooks/config',
          name: 'Hooks Configuration',
          description: 'Current hooks service configuration',
          mimeType: 'application/json'
        }
      );
    }
    
    if (this.config.services.enhanced) {
      resources.push(
        {
          uri: 'castplan://document-status',
          name: 'Enhanced Documentation Status',
          description: 'Current status of all tracked documents with lifecycle states',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://work-connections',
          name: 'Work-Document Connections',
          description: 'All tracked work-document connections with AI insights',
          mimeType: 'application/json'
        }
      );
    }
    
    // Add error recovery and monitoring resources
    resources.push(
      {
        uri: 'castplan://health',
        name: 'System Health Status',
        description: 'Comprehensive health monitoring data including service status and metrics',
        mimeType: 'application/json'
      },
      {
        uri: 'castplan://error-recovery',
        name: 'Error Recovery Status',
        description: 'Circuit breaker states, retry statistics, and error patterns',
        mimeType: 'application/json'
      },
      {
        uri: 'castplan://degradation-status',
        name: 'Graceful Degradation Status',
        description: 'Current degradation level, disabled features, and service availability',
        mimeType: 'application/json'
      }
    );
    
    return resources;
  }
  
  /**
   * Read a specific resource
   */
  private async readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }> {
    try {
      let content: any;
      
      switch (uri) {
        case 'castplan://status':
          content = await this.getSystemStatus();
          break;
          
        // BMAD resources
        case 'castplan://tasks':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getTasks();
          break;
        case 'castplan://agents':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getAgents();
          break;
        case 'castplan://assignments':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getAssignments();
          break;
          
        // Documentation resources
        case 'castplan://documentation/history':
          if (!this.documentationService) throw new Error('Documentation service not enabled');
          content = await this.documentationService.getChangeHistory();
          break;
          
        // Hooks resources
        case 'castplan://hooks/events':
          if (!this.hooksService) throw new Error('Hooks service not enabled');
          content = await this.hooksService.getEventHistory();
          break;
        case 'castplan://hooks/config':
          if (!this.hooksService) throw new Error('Hooks service not enabled');
          content = await this.hooksService.getConfig();
          break;
          
        // Enhanced resources
        case 'castplan://document-status':
          if (!this.lifecycleService) throw new Error('Enhanced services not enabled');
          const documents = await this.lifecycleService.getAllDocuments();
          content = this.generateDocumentStatusSummary(documents);
          break;
        case 'castplan://work-connections':
          if (!this.connectionService) throw new Error('Enhanced services not enabled');
          content = await this.connectionService.getAllConnections();
          break;
          
        // Error recovery and monitoring resources
        case 'castplan://health':
          if (!this.healthMonitor) throw new Error('Health monitoring not enabled');
          content = this.healthMonitor.getHealthStatus();
          break;
        case 'castplan://error-recovery':
          if (!this.errorRecovery) throw new Error('Error recovery not enabled');
          content = this.errorRecovery.getHealthStatus();
          break;
        case 'castplan://degradation-status':
          if (!this.degradationManager) throw new Error('Degradation manager not enabled');
          content = this.degradationManager.getSystemStatus();
          break;
          
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
      
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(content, null, 2)
        }]
      };
    } catch (error: any) {
      throw new McpError(ErrorCode.InternalError, `Failed to read resource: ${error.message}`);
    }
  }
  
  /**
   * Get all available tools
   */
  private getTools(): MCPTool[] {
    return this.toolDefinitions;
  }
  
  /**
   * Call a specific tool
   */
  private async callTool(name: string, args: any): Promise<{ content: any[] }> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    
    // Execute with error recovery if available
    if (this.errorRecovery && this.degradationManager) {
      try {
        const result = await this.errorRecovery.executeWithRecovery(
          async () => {
            // Record operation attempt for degradation monitoring
            const operationResult = await handler(args);
            this.degradationManager!.recordServiceResult(name, true);
            return operationResult;
          },
          `tool-${name}`,
          {
            retryConfig: {
              maxAttempts: 3,
              baseDelay: 1000,
              maxDelay: 10000,
              jitter: true,
              exponentialBase: 2
            },
            enableGracefulDegradation: true,
            fallbackFunction: this.getFallbackForTool(name, args)
          }
        );
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        // Record failure for degradation monitoring
        this.degradationManager.recordServiceResult(name, false);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    } else {
      // Fallback to basic execution without error recovery
      try {
        const result = await handler(args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    }
  }
  
  /**
   * Get fallback function for specific tools
   */
  private getFallbackForTool(toolName: string, args: any): (() => Promise<any>) | undefined {
    // Define fallbacks for specific tools
    if (toolName.includes('ai-') || toolName.includes('analyze')) {
      return async () => ({
        success: false,
        message: 'AI analysis currently unavailable - using basic fallback',
        data: null,
        fallback: true
      });
    }
    
    if (toolName.includes('search') || toolName.includes('query')) {
      return async () => ({
        results: [],
        message: 'Advanced search temporarily unavailable - basic functionality only',
        fallback: true
      });
    }
    
    // No fallback for critical operations
    return undefined;
  }
  
  /**
   * Get comprehensive system status
   */
  private async getSystemStatus(): Promise<UltimateSystemStatus> {
    const status: UltimateSystemStatus = {
      bmad: {
        active: false,
        tasksCount: 0,
        agentsCount: 0
      },
      documentation: {
        active: false,
        watchedPaths: 0,
        lastUpdate: 'never',
        documentsTracked: 0
      },
      hooks: {
        active: false,
        watchersCount: 0,
        eventsProcessed: 0,
        gitHooksInstalled: false
      },
      enhanced: {
        active: false,
        aiEnabled: false,
        lifecycleTracking: false,
        treeVisualization: false
      },
      health: {
        status: 'healthy',
        uptime: process.uptime(),
        version: '2.0.0'
      }
    };
    
    // Update status based on active services
    if (this.bmadService) {
      const [tasks, agents, assignments] = await Promise.all([
        this.bmadService.getTasks(),
        this.bmadService.getAgents(),
        this.bmadService.getAssignments()
      ]);
      status.bmad = {
        active: true,
        tasksCount: tasks.length,
        agentsCount: agents.length,
        lastActivity: assignments.length > 0 ? assignments[0].assignedAt : undefined
      };
    }
    
    if (this.documentationService) {
      const changeHistory = await this.documentationService.getChangeHistory();
      status.documentation = {
        active: true,
        watchedPaths: 0, // Would need to implement
        lastUpdate: changeHistory.length > 0 ? changeHistory[0].timestamp : 'never',
        documentsTracked: changeHistory.length
      };
    }
    
    if (this.hooksService) {
      const eventHistory = await this.hooksService.getEventHistory();
      const activeWatchers = await this.hooksService.getActiveWatchers();
      status.hooks = {
        active: activeWatchers.length > 0,
        watchersCount: activeWatchers.length,
        eventsProcessed: eventHistory.length,
        gitHooksInstalled: false // Would need to check
      };
    }
    
    if (this.config.services.enhanced) {
      status.enhanced = {
        active: true,
        aiEnabled: this.config.ai.enabled && !!this.aiService,
        aiProvider: this.config.ai.provider,
        lifecycleTracking: !!this.lifecycleService,
        treeVisualization: !!this.treeService
      };
    }
    
    // Determine overall health
    const activeServices = [
      status.bmad.active,
      status.documentation.active,
      status.hooks.active,
      status.enhanced.active
    ].filter(Boolean).length;
    
    if (activeServices === 0) {
      status.health.status = 'error';
    } else if (activeServices < this.getEnabledServicesCount()) {
      status.health.status = 'degraded';
    }
    
    return status;
  }
  
  private getEnabledServicesCount(): number {
    return Object.values(this.config.services).filter(Boolean).length;
  }
  
  private generateDocumentStatusSummary(documents: any[]): any {
    const summary = {
      total: documents.length,
      byState: {} as Record<string, number>,
      lastUpdated: new Date().toISOString()
    };
    
    // Count documents by state
    for (const doc of documents) {
      summary.byState[doc.state] = (summary.byState[doc.state] || 0) + 1;
    }
    
    return summary;
  }
  
  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Start monitoring systems
    if (this.healthMonitor) {
      this.healthMonitor.start();
      this.logger.info('✅ Health monitoring started');
    }
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    
    this.logger.info('🚀 CastPlan Ultimate Automation MCP Server running on stdio');
    this.logger.info(`📊 Services: BMAD=${this.config.services.bmad}, Docs=${this.config.services.documentation}, Hooks=${this.config.services.hooks}, Enhanced=${this.config.services.enhanced}`);
    if (this.config.ai.enabled) {
      this.logger.info(`🤖 AI: Enabled (${this.config.ai.provider})`);
    }
    this.logger.info('🛡️ Error recovery and monitoring systems active');
  }
  
  /**
   * Graceful server shutdown
   */
  private async shutdown(): Promise<void> {
    this.logger.info('🔄 Shutting down CastPlan Ultimate Automation MCP Server...');
    
    try {
      // Stop monitoring systems
      if (this.healthMonitor) {
        this.healthMonitor.stop();
        this.logger.info('✅ Health monitoring stopped');
      }
      
      // Reset degradation manager
      if (this.degradationManager) {
        this.degradationManager.resetAllServices();
        this.logger.info('✅ Degradation manager reset');
      }
      
      // Close database connections if any
      // (Services should handle their own cleanup)
      
      this.logger.info('✅ Server shutdown complete');
    } catch (error) {
      this.logger.error('❌ Error during server shutdown:', error);
    }
    
    process.exit(0);
  }
}

// CLI entry point
async function main(): Promise<void> {
  const server = new CastPlanUltimateAutomationServer();
  await server.start();
}

// Start the server if this file is run directly
// Use proper URL path comparison that works on Windows
import { pathToFileURL } from 'url';

function isMainModule(): boolean {
  // Convert both paths to URLs for proper comparison
  const currentModuleUrl = import.meta.url;
  const mainModuleUrl = pathToFileURL(process.argv[1]).href;
  return currentModuleUrl === mainModuleUrl;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });
}

export { CastPlanUltimateAutomationServer };