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

import * as winston from 'winston';
import * as path from 'path';
import { pathToFileURL } from 'url';

// Import types
import type { ServerConfig, ToolHandler, ServiceStatus } from './types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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
import { RedisCacheService } from './services/RedisCacheService.js';

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
  private config: ServerConfig;
  private logger: winston.Logger;

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
  private cacheService?: RedisCacheService;

  // Tool registry
  private tools: Map<string, ToolHandler> = new Map();
  private toolDefinitions: Tool[] = [];

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
  private loadConfiguration(): ServerConfig {
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
        provider: (process.env.CASTPLAN_AI_PROVIDER as 'openai' | 'claude' | 'google' | 'azure') || 'openai',
        apiKey: process.env.CASTPLAN_AI_API_KEY,
        model: process.env.CASTPLAN_AI_MODEL,
      },

      // Use I18nService auto-detection with environment variable overrides
      timeZone: process.env.CASTPLAN_TIMEZONE || i18nConfig.timezone,
      locale: process.env.CASTPLAN_LOCALE || i18nConfig.locale,

      logLevel: (process.env.CASTPLAN_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
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
  private createLogger(): winston.Logger {
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

    // Basic system checks
    this.healthMonitor.registerHealthCheck(
      'memory',
      BuiltInHealthChecks.createMemoryCheck(512) // 512MB threshold
    );

    // File system health check
    this.healthMonitor.registerHealthCheck(
      'filesystem',
      BuiltInHealthChecks.createFileSystemCheck(this.config.projectRoot)
    );

    // Database health check if BMAD is enabled
    if (this.config.services.enhanced) {
      this.healthMonitor.registerHealthCheck('database', async () => {
        try {
          // Check if lifecycle service can access database
          if (this.lifecycleService) {
            await this.lifecycleService.findDocuments();
          }
          return {
            status: 'healthy' as const,
            latency: 0,
            message: 'Database accessible',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            latency: 0,
            message: `Database error: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });
    }

    // Redis health check if cache is enabled
    if (this.config.ai.enabled && this.config.ai.apiKey) {
      this.healthMonitor.registerHealthCheck('redis-cache', async () => {
        try {
          if (this.aiService) {
            // Try to set and get a test value
            await this.aiService.setAnalysisCache('test', 'test');
          }
          return {
            status: 'healthy' as const,
            latency: 0,
            message: 'Redis cache operational',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'degraded' as const,
            latency: 0,
            message: `Redis cache error: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });
    }
  }

  /**
   * Initialize all services based on configuration
   */
  private initializeServices(): void {
    this.logger.info('Initializing services based on configuration...');

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
      // Initialize i18n service first as others may depend on it
      this.i18nService = new I18nService({
        locale: this.config.locale,
        timezone: this.config.timeZone
      });

      this.dateTimeService = new DateTimeService(this.logger, this.i18nService);
      this.lifecycleService = new DocumentLifecycleService(this.config.databasePath, this.logger);
      this.connectionService = new WorkDocumentConnectionService(this.config.databasePath, this.logger);
      this.treeService = new DocumentTreeService(this.config.databasePath, this.logger);
      this.logger.info('✅ Enhanced services initialized');
      this.logger.info(`   - I18n Service: Locale=${this.config.locale}, TimeZone=${this.config.timeZone}`);

      // Initialize AI service if enabled
      try {
        this.cacheService = new RedisCacheService(this.logger, {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          keyPrefix: 'castplan:',
          enableTLS: false,
          connectionTimeout: 5000,
          commandTimeout: 2000
        });
        // Only initialize AI service if both AI is enabled and cache service is available
        this.logger.info('✅ Redis Cache Service initialized');
      } catch (error) {
        this.logger.warn('⚠️  Redis Cache Service failed to initialize - AI analysis caching will be disabled', error);
        // Continue without caching
      }

      if (this.config.ai.enabled && this.config.ai.apiKey && this.config.ai.provider) {
        if (this.cacheService) {
          this.aiService = new AIAnalysisService(this.config.ai.provider, this.logger, this.cacheService);
          this.logger.info(`✅ AI Analysis Service initialized with provider: ${this.config.ai.provider}`);
        } else {
          this.logger.warn('⚠️  AI Analysis Service requires Redis Cache Service - skipping initialization');
        }
      }
    }
  }

  /**
   * Setup request handlers for MCP protocol
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
   * Register all tool handlers
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

    this.logger.info(`Registered ${this.tools.size} tools total`);
  }

  /**
   * Get available resources
   */
  private getResources(): any[] {
    const resources: any[] = [
      {
        uri: 'castplan://status',
        name: 'Server Status',
        description: 'Current status of CastPlan Ultimate Automation MCP server',
        mimeType: 'application/json'
      }
    ];

    // Add service-specific resources
    if (this.config.services.bmad) {
      resources.push(
        {
          uri: 'castplan://bmad',
          name: 'BMAD Model',
          description: 'Current Business Model and Architecture Documentation',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://tasks',
          name: 'BMAD Tasks',
          description: 'Current tasks and their statuses',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://backlog',
          name: 'BMAD Backlog',
          description: 'Backlog items and priorities',
          mimeType: 'application/json'
        }
      );
    }

    if (this.config.services.documentation) {
      resources.push({
        uri: 'castplan://documentation/projects',
        name: 'Documentation Projects',
        description: 'List of documentation projects',
        mimeType: 'application/json'
      });
    }

    if (this.config.services.hooks) {
      resources.push(
        {
          uri: 'castplan://hooks/config',
          name: 'Hooks Configuration',
          description: 'Current hooks configuration',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://hooks/history',
          name: 'Hooks History',
          description: 'Recent hook execution history',
          mimeType: 'application/json'
        }
      );
    }

    if (this.config.services.enhanced) {
      resources.push(
        {
          uri: 'castplan://lifecycle/documents',
          name: 'Document Lifecycle',
          description: 'All documents tracked by lifecycle service',
          mimeType: 'application/json'
        },
        {
          uri: 'castplan://connections/graph',
          name: 'Document Connection Graph',
          description: 'Visual representation of document connections',
          mimeType: 'application/json'
        }
      );
    }

    // Always add system monitoring resources
    resources.push(
      {
        uri: 'castplan://health',
        name: 'Health Check Results',
        description: 'Current health status of all services and system components',
        mimeType: 'application/json'
      },
      {
        uri: 'castplan://metrics',
        name: 'Performance Metrics',
        description: 'System performance metrics and resource utilization',
        mimeType: 'application/json'
      },
      {
        uri: 'castplan://degradation/status',
        name: 'Service Degradation Status',
        description: 'Current service degradation levels and active mitigations',
        mimeType: 'application/json'
      }
    );

    return resources;
  }

  /**
   * Read a resource by URI
   */
  private async readResource(uri: string): Promise<any> {
    try {
      let content: any;

      switch (uri) {
        case 'castplan://status':
          content = await this.getServerStatus();
          break;

        // BMAD resources
        case 'castplan://bmad':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getModel();
          break;
        case 'castplan://tasks':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getTasks();
          break;
        case 'castplan://backlog':
          if (!this.bmadService) throw new Error('BMAD service not enabled');
          content = await this.bmadService.getBacklogItems();
          break;

        // Documentation resources
        case 'castplan://documentation/projects':
          if (!this.documentationService) throw new Error('Documentation service not enabled');
          content = await this.documentationService.listAllProjects();
          break;

        // Hooks resources
        case 'castplan://hooks/config':
          if (!this.hooksService) throw new Error('Hooks service not enabled');
          content = await this.hooksService.getHooksConfig();
          break;
        case 'castplan://hooks/history':
          if (!this.hooksService) throw new Error('Hooks service not enabled');
          content = await this.hooksService.getHistory();
          break;

        // Enhanced resources
        case 'castplan://lifecycle/documents':
          if (!this.lifecycleService) throw new Error('Lifecycle service not enabled');
          const documents = await this.lifecycleService.findDocuments();
          content = this.formatDocumentLifecycleData(documents);
          break;
        case 'castplan://connections/graph':
          if (!this.connectionService) throw new Error('Connection service not enabled');
          content = await this.connectionService.getFullGraphData();
          break;

        // System monitoring resources
        case 'castplan://health':
          if (!this.healthMonitor) throw new Error('Health monitor not initialized');
          content = this.healthMonitor.getHealthStatus();
          break;
        case 'castplan://metrics':
          if (!this.healthMonitor) throw new Error('Health monitor not initialized');
          content = this.healthMonitor.getMetrics();
          break;
        case 'castplan://degradation/status':
          if (!this.degradationManager) throw new Error('Degradation manager not initialized');
          content = this.degradationManager.getDegradationStatus();
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
   * Get available tools
   */
  private getTools(): Tool[] {
    return this.toolDefinitions;
  }

  /**
   * Call a tool by name with arguments
   */
  private async callTool(name: string, args: any): Promise<any> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new McpError(ErrorCode.InvalidRequest, `Unknown tool: ${name}`);
    }

    // Apply error recovery and graceful degradation
    if (this.errorRecovery && this.degradationManager) {
      try {
        const result = await this.errorRecovery.executeWithRecovery(
          async () => {
            // Check if feature is available based on degradation level
            const handlerResult = await handler(args);
            this.degradationManager!.recordServiceHealth(name, true);
            return handlerResult;
          },
          `tool-${name}`,
          {
            retryConfig: {
              maxAttempts: 3,
              baseDelay: 1000,
              maxDelay: 5000,
              factor: 2.0,
              jitterFactor: 0.1
            },
            enableCircuitBreaker: true,
            fallbackHandler: this.getToolFallback(name, args)
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
        // Record failure for degradation tracking
        this.degradationManager.recordServiceHealth(name, false);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    } else {
      // Fallback to direct execution if error recovery not available
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
   * Get fallback handler for a tool
   */
  private getToolFallback(toolName: string, args: any): ((error: Error) => Promise<any>) | undefined {
    // AI analysis tools have specific fallbacks
    if (toolName.includes('_ai_') || toolName.includes('analyze')) {
      return async () => ({
        success: false,
        message: 'AI analysis temporarily unavailable. Using basic analysis instead.',
        data: null,
        fallback: true
      });
    }

    if (toolName.includes('redis') || toolName.includes('cache')) {
      return async () => ({
        entries: [],
        message: 'Cache temporarily unavailable. Operations may be slower.',
        fallback: true
      });
    }

    // No specific fallback for other tools
    return undefined;
  }

  /**
   * Get server status information
   */
  private async getServerStatus(): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      bmad: {
        enabled: false,
        taskCount: 0,
        backlogCount: 0
      },
      documentation: {
        enabled: false,
        projectCount: 0,
        trackMode: 'manual',
        pendingAnalysis: 0
      },
      hooks: {
        enabled: false,
        configuredHooks: 0,
        executionHistory: 0,
        recentExecutions: []
      },
      enhanced: {
        enabled: false,
        aiEnabled: false,
        cacheConnected: false,
        documentsTracked: 0
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0'
      }
    };

    // Populate service-specific status
    if (this.bmadService) {
      const [tasks, backlog, currentTodo] = await Promise.all([
        this.bmadService.getTasks(),
        this.bmadService.getBacklogItems(),
        this.bmadService.getCurrentTodo()
      ]);
      status.bmad = {
        enabled: true,
        taskCount: tasks.length,
        backlogCount: backlog.length,
        currentTodo: currentTodo.length > 0 ? currentTodo[0].task_name : undefined
      };
    }

    if (this.documentationService) {
      const allDocProjects = await this.documentationService.listAllProjects();
      status.documentation = {
        enabled: true,
        projectCount: 0, // calculated below
        trackMode: allDocProjects.length > 0 ? allDocProjects[0].trackMode : 'manual',
        pendingAnalysis: allDocProjects.length
      };
    }

    if (this.hooksService) {
      const configStatus = await this.hooksService.getHooksStatus();
      const historyItems = await this.hooksService.getHistoryItems();
      status.hooks = {
        enabled: configStatus.active > 0,
        configuredHooks: configStatus.active,
        executionHistory: historyItems.length,
        recentExecutions: [] // populated below
      };
    }

    if (this.config.services.enhanced) {
      status.enhanced = {
        enabled: true,
        aiEnabled: this.config.ai.enabled && !!this.aiService,
        i18nLocale: this.config.locale,
        cacheConnected: !!this.cacheService,
        documentsTracked: 0 // populated below
      };
    }

    // Calculate aggregate counts
    const servicesEnabled = [
      status.bmad.enabled,
      status.documentation.enabled,
      status.hooks.enabled,
      status.enhanced.enabled
    ].filter(Boolean).length;

    if (servicesEnabled === 0) {
      status.system.status = 'error';
    } else if (servicesEnabled < this.countEnabledServices()) {
      status.system.status = 'degraded';
    }

    return status;
  }

  private countEnabledServices(): number {
    return Object.values(this.config.services).filter(Boolean).length;
  }

  private formatDocumentLifecycleData(documents: any[]): any {
    const summary = {
      total: documents.length,
      byPhase: {} as Record<string, number>,
      lastUpdated: new Date().toISOString()
    };

    // Count documents by phase
    for (const doc of documents) {
      summary.byPhase[doc.phase] = (summary.byPhase[doc.phase] || 0) + 1;
    }

    return summary;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Start health monitoring
    if (this.healthMonitor) {
      this.healthMonitor.start();
      this.logger.info('✅ Health monitoring started');
    }

    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    this.logger.info('🚀 CastPlan Ultimate Automation MCP Server is running');
    this.logger.info(`   Services: BMAD=${this.config.services.bmad}, Docs=${this.config.services.documentation}, Hooks=${this.config.services.hooks}, Enhanced=${this.config.services.enhanced}`);
    if (this.config.ai.enabled) {
      this.logger.info(`   AI Analysis: ${this.config.ai.provider}`);
    }
    this.logger.info(`   Connect your MCP client to start using automation tools`);
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down CastPlan Ultimate Automation MCP Server...');

    try {
      // Stop health monitoring
      if (this.healthMonitor) {
        this.healthMonitor.stop();
        this.logger.info('✅ Health monitoring stopped');
      }

      // Close degradation manager
      if (this.degradationManager) {
        this.degradationManager.updateServiceHealth();
        this.logger.info('✅ Degradation status saved');
      }

      // Close service connections
      // Note: Services will handle their own cleanup

      this.logger.info('✅ Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }

    process.exit(0);
  }
}

// Start the server
async function main() {
  const server = new CastPlanUltimateAutomationServer();
  await server.start();
}

// Check if this file is being run directly
// (vs being imported as a module, e.g., for testing)
export { workerData } from 'worker_threads';

function isMainModule(): boolean {
  // In ES modules, we need to check import.meta.url
  const mainModulePath = import.meta.url;
  const processArgvUrl = pathToFileURL(process.argv[1]).href;
  return mainModulePath === processArgvUrl;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { CastPlanUltimateAutomationServer };