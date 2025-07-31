/**
 * Enhanced Documentation Tool Handlers
 * 
 * Advanced tools for document lifecycle management and AI analysis
 */

import { Logger } from 'winston';
import { MCPTool } from '../../types/index.js';
import { 
  DateTimeService,
  DocumentLifecycleService,
  WorkDocumentConnectionService,
  DocumentTreeService,
  AIAnalysisService 
} from '../../services/index.js';
import { I18nService } from '../../services/I18nService.js';
import { UltimateAutomationConfig } from '../../types/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface EnhancedServices {
  dateTimeService: DateTimeService;
  lifecycleService: DocumentLifecycleService;
  connectionService: WorkDocumentConnectionService;
  treeService: DocumentTreeService;
  aiService?: AIAnalysisService;
  i18nService?: I18nService;
  logger: Logger;
  config: UltimateAutomationConfig;
}

export function registerEnhancedTools(
  tools: Map<string, Function>,
  services: EnhancedServices
): MCPTool[] {
  const { 
    dateTimeService, 
    lifecycleService, 
    connectionService, 
    treeService, 
    aiService,
    i18nService,
    logger,
    config
  } = services;
  
  // Initialize I18nService if not provided
  const localizationService = i18nService || new I18nService();
  
  // Tool definitions
  const enhancedTools: MCPTool[] = [
    {
      name: 'initialize_documentation_system',
      description: 'Initialize the enhanced documentation automation system for a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: {
            type: 'string',
            description: 'Root directory of the project'
          },
          enableAI: {
            type: 'boolean',
            description: 'Enable AI-powered analysis features',
            default: true
          },
          timeZone: {
            type: 'string',
            description: 'Timezone for date/time operations (optional - auto-detected if not provided)'
          },
          locale: {
            type: 'string',
            description: 'Locale for internationalization (optional - auto-detected if not provided)'
          }
        },
        required: ['projectRoot']
      }
    },
    {
      name: 'track_document_work',
      description: 'Track the relationship between development work and documentation requirements',
      inputSchema: {
        type: 'object',
        properties: {
          workType: {
            type: 'string',
            enum: ['frontend', 'backend', 'database', 'electron', 'testing', 'deployment'],
            description: 'Type of development work'
          },
          workDescription: {
            type: 'string',
            description: 'Description of the work being done'
          },
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths involved in the work'
          },
          expectedDocuments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Expected documentation to be updated'
          }
        },
        required: ['workType', 'workDescription', 'filePaths']
      }
    },
    {
      name: 'analyze_document_quality',
      description: 'Perform comprehensive quality analysis on documentation with AI insights',
      inputSchema: {
        type: 'object',
        properties: {
          documentPath: {
            type: 'string',
            description: 'Path to the document to analyze'
          },
          includeAI: {
            type: 'boolean',
            description: 'Include AI-powered analysis',
            default: true
          },
          analysisTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['quality', 'duplicate', 'relevance', 'completeness']
            },
            description: 'Types of analysis to perform',
            default: ['quality']
          }
        },
        required: ['documentPath']
      }
    },
    {
      name: 'get_document_tree',
      description: 'Retrieve the hierarchical document tree structure',
      inputSchema: {
        type: 'object',
        properties: {
          rootCategory: {
            type: 'string',
            enum: ['master', 'component', 'category'],
            description: 'Root category to filter by'
          },
          includeMetadata: {
            type: 'boolean',
            description: 'Include document metadata',
            default: false
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum tree depth',
            default: 10
          }
        },
        required: []
      }
    },
    {
      name: 'update_document_lifecycle',
      description: 'Update the lifecycle state of a document with optional review scheduling',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'UUID of the document'
          },
          newState: {
            type: 'string',
            enum: ['draft', 'review', 'approved', 'published', 'outdated', 'archived'],
            description: 'New lifecycle state'
          },
          reviewComment: {
            type: 'string',
            description: 'Optional review comment'
          },
          scheduledReview: {
            type: 'string',
            description: 'ISO datetime for scheduled review'
          }
        },
        required: ['documentId', 'newState']
      }
    },
    {
      name: 'generate_documentation_report',
      description: 'Generate comprehensive reports on documentation status and quality',
      inputSchema: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['lifecycle', 'quality', 'connections', 'duplicates', 'comprehensive'],
            description: 'Type of report to generate'
          },
          timeRange: {
            type: 'object',
            properties: {
              start: {
                type: 'string',
                description: 'Start date (ISO format)'
              },
              end: {
                type: 'string',
                description: 'End date (ISO format)'
              }
            },
            description: 'Time range for the report'
          },
          includeAI: {
            type: 'boolean',
            description: 'Include AI analysis in report',
            default: true
          }
        },
        required: ['reportType']
      }
    }
  ];
  
  // Register tool handlers
  tools.set('initialize_documentation_system', async (args: any) => {
    try {
      logger.info(`Initializing documentation system for: ${args.projectRoot}`);
      
      // Initialize database and services
      await lifecycleService.initialize();
      await connectionService.initialize();
      await treeService.initialize();
      
      // Scan existing documentation
      const existingDocs = await scanExistingDocumentation(args.projectRoot);
      
      // Create initial document tree
      const documentTree = await treeService.buildTree(existingDocs);
      
      logger.info(`Documentation system initialized. Found ${existingDocs.length} documents.`);
      
      // Get current localization settings
      const currentConfig = localizationService.getConfig();
      const timezone = args.timeZone || currentConfig.timezone;
      const locale = args.locale || currentConfig.locale;
      
      return {
        success: true,
        message: `✅ Enhanced Documentation System Initialized

📁 Project Root: ${args.projectRoot}
🤖 AI Analysis: ${args.enableAI ? 'Enabled' : 'Disabled'}
🌏 Timezone: ${timezone}
🗺️ Locale: ${locale}
📚 Documents Found: ${existingDocs.length}
🌳 Document Tree Nodes: ${documentTree.length}

The system is now ready to track documentation lifecycle, analyze work-document connections, and provide intelligent insights.`
      };
    } catch (error) {
      logger.error('Failed to initialize documentation system:', error);
      throw error;
    }
  });
  
  tools.set('track_document_work', async (args: any) => {
    try {
      logger.info(`Tracking work: ${args.workType} - ${args.workDescription}`);
      
      // Find relevant existing documents
      const relevantDocs = await findRelevantDocuments(args.workType, args.filePaths, lifecycleService);
      
      // Create work-document connection
      const connection = await connectionService.createConnection({
        workType: args.workType,
        workDescription: args.workDescription,
        filePaths: args.filePaths,
        connectedDocuments: relevantDocs.map(doc => doc.id),
        connectionStrength: 0.8, // Will be updated by AI analysis
        lastSyncedAt: dateTimeService.getCurrentTimestamp()
      });
      
      // Perform AI analysis if enabled
      let aiInsights: string[] = [];
      if (config.ai.enabled && aiService) {
        const analysis = await aiService.calculateRelevance(
          args.filePaths.join(', '), 
          args.workDescription
        );
        aiInsights = analysis.insights;
        
        // Update connection strength based on AI analysis
        await connectionService.updateConnectionStrength(
          connection.id, 
          analysis.score
        );
      }
      
      // Check for missing documentation
      const missingDocs = args.expectedDocuments 
        ? args.expectedDocuments.filter((doc: string) => !relevantDocs.find(existing => existing.title.includes(doc)))
        : [];
      
      return {
        success: true,
        connectionId: connection.id,
        connectedDocuments: relevantDocs.length,
        connectionStrength: Math.round(connection.connectionStrength * 100),
        aiInsights,
        missingDocs,
        message: `Work-document connection tracked successfully`
      };
    } catch (error) {
      logger.error('Failed to track document work:', error);
      throw error;
    }
  });
  
  tools.set('analyze_document_quality', async (args: any) => {
    try {
      logger.info(`Analyzing document quality: ${args.documentPath}`);
      
      // Check if document exists
      const documentExists = await checkDocumentExists(args.documentPath);
      if (!documentExists) {
        throw new Error(`Document not found: ${args.documentPath}`);
      }
      
      const analyses: any[] = [];
      const qualityReport: string[] = [];
      
      // Perform requested analysis types
      if (args.includeAI && aiService) {
        for (const analysisType of args.analysisTypes) {
          let analysis;
          
          switch (analysisType) {
            case 'quality':
              analysis = await aiService.analyzeQuality(args.documentPath);
              break;
            case 'duplicate':
              analysis = await aiService.detectDuplicates(args.documentPath);
              break;
            case 'completeness':
              const recentWork = await getRecentWorkContext(args.documentPath, connectionService);
              analysis = await aiService.calculateRelevance(args.documentPath, recentWork);
              break;
            default:
              continue;
          }
          
          analyses.push(analysis);
          qualityReport.push(`${analysisType.toUpperCase()} (${Math.round(analysis.score * 100)}%): ${analysis.insights.join(', ')}`);
        }
      }
      
      // Generate basic quality metrics
      const basicMetrics = await generateBasicQualityMetrics(args.documentPath);
      
      return {
        success: true,
        documentPath: args.documentPath,
        overallScore: analyses.length > 0 ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length * 100) : null,
        basicMetrics,
        qualityReport,
        recommendations: analyses.flatMap(a => a.suggestions),
        analyzedAt: localizationService.getCurrentDateTimeString()
      };
    } catch (error) {
      logger.error('Failed to analyze document quality:', error);
      throw error;
    }
  });
  
  tools.set('get_document_tree', async (args: any) => {
    try {
      logger.info(`Getting document tree: ${args.rootCategory || 'all'}`);
      
      const documents = await lifecycleService.getAllDocuments();
      const treeNodes = await treeService.buildTree(documents);
      
      // Filter by root category if specified
      const filteredNodes = args.rootCategory 
        ? treeNodes.filter(node => node.treeType === args.rootCategory)
        : treeNodes;
      
      // Build tree representation
      const treeRepresentation = await buildTreeRepresentation(
        filteredNodes, 
        documents, 
        args.includeMetadata, 
        args.maxDepth
      );
      
      return {
        success: true,
        totalNodes: filteredNodes.length,
        maxDepth: Math.max(...filteredNodes.map(n => n.depth)),
        tree: treeRepresentation,
        generatedAt: localizationService.getCurrentDateTimeString()
      };
    } catch (error) {
      logger.error('Failed to get document tree:', error);
      throw error;
    }
  });
  
  tools.set('update_document_lifecycle', async (args: any) => {
    try {
      logger.info(`Updating document ${args.documentId} to state: ${args.newState}`);
      
      // Update document state
      await lifecycleService.updateDocumentState(args.documentId, args.newState);
      
      // Schedule review if provided
      if (args.scheduledReview) {
        await lifecycleService.scheduleReview(args.documentId, args.scheduledReview);
      }
      
      // Get updated document for confirmation
      const document = await lifecycleService.getDocumentById(args.documentId);
      
      return {
        success: true,
        document: document?.title || 'Unknown',
        newState: args.newState,
        reviewComment: args.reviewComment,
        scheduledReview: args.scheduledReview ? localizationService.formatDateTime(new Date(args.scheduledReview)) : null,
        updatedAt: localizationService.getCurrentDateTimeString()
      };
    } catch (error) {
      logger.error('Failed to update document lifecycle:', error);
      throw error;
    }
  });
  
  tools.set('generate_documentation_report', async (args: any) => {
    try {
      logger.info(`Generating ${args.reportType} report`);
      
      let report: any;
      
      switch (args.reportType) {
        case 'lifecycle':
          report = await generateLifecycleReport(args.timeRange, lifecycleService, dateTimeService);
          break;
        case 'quality':
          report = await generateQualityReport(args.includeAI, lifecycleService, aiService, dateTimeService);
          break;
        case 'connections':
          report = await generateConnectionsReport(connectionService, dateTimeService);
          break;
        case 'duplicates':
          report = await generateDuplicatesReport(lifecycleService, aiService, dateTimeService);
          break;
        case 'comprehensive':
          report = await generateComprehensiveReport(args.timeRange, args.includeAI, services);
          break;
        default:
          throw new Error(`Unknown report type: ${args.reportType}`);
      }
      
      return {
        success: true,
        reportType: args.reportType,
        report,
        generatedAt: localizationService.getCurrentDateTimeString()
      };
    } catch (error) {
      logger.error('Failed to generate documentation report:', error);
      throw error;
    }
  });
  
  return enhancedTools;
}

// Helper functions
async function scanExistingDocumentation(projectRoot: string): Promise<any[]> {
  // Implementation would scan filesystem for documentation files
  return [];
}

async function findRelevantDocuments(workType: string, filePaths: string[], lifecycleService: DocumentLifecycleService): Promise<any[]> {
  // Implementation would find documents relevant to the work being done
  return [];
}

async function checkDocumentExists(documentPath: string): Promise<boolean> {
  try {
    await fs.access(documentPath);
    return true;
  } catch {
    return false;
  }
}

async function getRecentWorkContext(documentPath: string, connectionService: WorkDocumentConnectionService): Promise<string> {
  // Implementation would get recent work context for a document
  return "Recent development work context";
}

async function generateBasicQualityMetrics(documentPath: string): Promise<string[]> {
  try {
    const stats = await fs.stat(documentPath);
    const content = await fs.readFile(documentPath, 'utf-8');
    
    return [
      `File Size: ${Math.round(stats.size / 1024)} KB`,
      `Lines: ${content.split('\n').length}`,
      `Words: ${content.split(/\s+/).length}`,
      `Last Modified: ${stats.mtime.toISOString()}`
    ];
  } catch (error) {
    return [`Error reading file: ${error}`];
  }
}

async function buildTreeRepresentation(
  nodes: any[], 
  documents: any[], 
  includeMetadata: boolean, 
  maxDepth: number
): Promise<any> {
  // Implementation would build a tree representation
  return { nodes: nodes.length, structure: "Tree structure here" };
}

async function generateLifecycleReport(timeRange: any, lifecycleService: any, dateTimeService: any): Promise<any> {
  return {
    title: "Document Lifecycle Report",
    period: timeRange,
    summary: "Report content here"
  };
}

async function generateQualityReport(includeAI: boolean, lifecycleService: any, aiService: any, dateTimeService: any): Promise<any> {
  return {
    title: "Document Quality Report",
    aiEnabled: includeAI,
    summary: "Report content here"
  };
}

async function generateConnectionsReport(connectionService: any, dateTimeService: any): Promise<any> {
  return {
    title: "Work-Document Connections Report",
    summary: "Report content here"
  };
}

async function generateDuplicatesReport(lifecycleService: any, aiService: any, dateTimeService: any): Promise<any> {
  return {
    title: "Document Duplicates Report",
    summary: "Report content here"
  };
}

async function generateComprehensiveReport(timeRange: any, includeAI: boolean, services: EnhancedServices): Promise<any> {
  return {
    title: "Comprehensive Documentation Report",
    period: timeRange,
    aiEnabled: includeAI,
    summary: "Report content here"
  };
}