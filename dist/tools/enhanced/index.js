/**
 * Enhanced Documentation Tool Handlers
 *
 * Advanced tools for document lifecycle management and AI analysis
 */
import { I18nService } from '../../services/I18nService.ts';
import * as fs from 'fs/promises';
export function registerEnhancedTools(tools, services) {
    const { dateTimeService, lifecycleService, connectionService, treeService, aiService, i18nService, migrationService, logger, config } = services;
    // Initialize I18nService if not provided
    const localizationService = i18nService || new I18nService();
    // Tool definitions
    const enhancedTools = [
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
        },
        {
            name: 'create_document_chunks',
            description: 'Create semantic chunks from document content for enhanced analysis and search',
            inputSchema: {
                type: 'object',
                properties: {
                    documentId: {
                        type: 'string',
                        description: 'UUID of the document to chunk'
                    },
                    content: {
                        type: 'string',
                        description: 'Document content to chunk (optional if reading from file)'
                    },
                    chunkingStrategy: {
                        type: 'string',
                        enum: ['semantic', 'structural', 'fixed-size', 'overlap', 'hybrid'],
                        description: 'Chunking strategy to use',
                        default: 'semantic'
                    },
                    maxChunkSize: {
                        type: 'number',
                        description: 'Maximum chunk size in tokens',
                        default: 1000
                    },
                    minChunkSize: {
                        type: 'number',
                        description: 'Minimum chunk size in tokens',
                        default: 100
                    },
                    overlapPercentage: {
                        type: 'number',
                        description: 'Overlap percentage between chunks (0-0.5)',
                        default: 0.1
                    },
                    enableEmbeddings: {
                        type: 'boolean',
                        description: 'Generate embeddings for chunks',
                        default: true
                    },
                    enableRelationships: {
                        type: 'boolean',
                        description: 'Detect relationships between chunks',
                        default: true
                    },
                    enableTopics: {
                        type: 'boolean',
                        description: 'Detect topics in chunks',
                        default: true
                    }
                },
                required: ['documentId']
            }
        },
        {
            name: 'search_document_chunks',
            description: 'Perform semantic search across document chunks',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query'
                    },
                    documentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Limit search to specific documents'
                    },
                    chunkTypes: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['semantic', 'structural', 'fixed-size', 'overlap']
                        },
                        description: 'Filter by chunk types'
                    },
                    topicCategories: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter by topic categories'
                    },
                    similarityThreshold: {
                        type: 'number',
                        description: 'Minimum similarity score (0-1)',
                        default: 0.7
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results',
                        default: 10
                    },
                    includeMetadata: {
                        type: 'boolean',
                        description: 'Include chunk metadata',
                        default: true
                    },
                    includeRelationships: {
                        type: 'boolean',
                        description: 'Include chunk relationships',
                        default: false
                    }
                },
                required: ['query']
            }
        },
        {
            name: 'get_chunk_analytics',
            description: 'Get analytics and insights for document chunks',
            inputSchema: {
                type: 'object',
                properties: {
                    documentId: {
                        type: 'string',
                        description: 'Document ID to analyze'
                    }
                },
                required: ['documentId']
            }
        },
        {
            name: 'migrate_documents_to_chunks',
            description: 'Migrate existing documents to semantic chunking format in batches',
            inputSchema: {
                type: 'object',
                properties: {
                    batchName: {
                        type: 'string',
                        description: 'Name for the migration batch'
                    },
                    documentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Document IDs to migrate (empty for all)'
                    },
                    migrationType: {
                        type: 'string',
                        enum: ['full_migration', 'analysis_only', 'embeddings_only'],
                        description: 'Type of migration to perform',
                        default: 'full_migration'
                    },
                    configurationName: {
                        type: 'string',
                        description: 'Migration configuration to use',
                        default: 'Default Semantic Chunking'
                    },
                    parallelProcessing: {
                        type: 'boolean',
                        description: 'Enable parallel processing',
                        default: true
                    }
                },
                required: ['batchName']
            }
        },
        {
            name: 'get_migration_status',
            description: 'Get the status of document migration to semantic chunking',
            inputSchema: {
                type: 'object',
                properties: {
                    batchId: {
                        type: 'string',
                        description: 'Migration batch ID (optional - shows all if not provided)'
                    },
                    documentId: {
                        type: 'string',
                        description: 'Specific document ID to check'
                    }
                },
                required: []
            }
        }
    ];
    // Register tool handlers
    tools.set('initialize_documentation_system', async (args) => {
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
        }
        catch (error) {
            logger.error('Failed to initialize documentation system:', error);
            throw error;
        }
    });
    tools.set('track_document_work', async (args) => {
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
            let aiInsights = [];
            if (config.ai.enabled && aiService) {
                const analysis = await aiService.calculateRelevance(args.filePaths.join(', '), args.workDescription);
                aiInsights = analysis.insights;
                // Update connection strength based on AI analysis
                await connectionService.updateConnectionStrength(connection.id, analysis.score);
            }
            // Check for missing documentation
            const missingDocs = args.expectedDocuments
                ? args.expectedDocuments.filter((doc) => !relevantDocs.find(existing => existing.title.includes(doc)))
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
        }
        catch (error) {
            logger.error('Failed to track document work:', error);
            throw error;
        }
    });
    tools.set('analyze_document_quality', async (args) => {
        try {
            logger.info(`Analyzing document quality: ${args.documentPath}`);
            // Check if document exists
            const documentExists = await checkDocumentExists(args.documentPath);
            if (!documentExists) {
                throw new Error(`Document not found: ${args.documentPath}`);
            }
            const analyses = [];
            const qualityReport = [];
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
        }
        catch (error) {
            logger.error('Failed to analyze document quality:', error);
            throw error;
        }
    });
    tools.set('get_document_tree', async (args) => {
        try {
            logger.info(`Getting document tree: ${args.rootCategory || 'all'}`);
            const documents = await lifecycleService.getAllDocuments();
            const treeNodes = await treeService.buildTree(documents);
            // Filter by root category if specified
            const filteredNodes = args.rootCategory
                ? treeNodes.filter(node => node.treeType === args.rootCategory)
                : treeNodes;
            // Build tree representation
            const treeRepresentation = await buildTreeRepresentation(filteredNodes, documents, args.includeMetadata, args.maxDepth);
            return {
                success: true,
                totalNodes: filteredNodes.length,
                maxDepth: Math.max(...filteredNodes.map(n => n.depth)),
                tree: treeRepresentation,
                generatedAt: localizationService.getCurrentDateTimeString()
            };
        }
        catch (error) {
            logger.error('Failed to get document tree:', error);
            throw error;
        }
    });
    tools.set('update_document_lifecycle', async (args) => {
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
        }
        catch (error) {
            logger.error('Failed to update document lifecycle:', error);
            throw error;
        }
    });
    tools.set('generate_documentation_report', async (args) => {
        try {
            logger.info(`Generating ${args.reportType} report`);
            let report;
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
        }
        catch (error) {
            logger.error('Failed to generate documentation report:', error);
            throw error;
        }
    });
    // Semantic Chunking Tool Handlers
    tools.set('create_document_chunks', async (args) => {
        try {
            logger.info(`Creating chunks for document: ${args.documentId}`);
            // Build chunking configuration
            const chunkingConfig = {
                strategy: args.chunkingStrategy || 'semantic',
                maxChunkSize: args.maxChunkSize || 1000,
                minChunkSize: args.minChunkSize || 100,
                overlapPercentage: args.overlapPercentage || 0.1,
                embeddingModel: 'text-embedding-ada-002',
                similarityThreshold: 0.7,
                qualityThreshold: 0.5,
                enableVersioning: true,
                enableTopicDetection: args.enableTopics !== false,
                enableRelationshipDetection: args.enableRelationships !== false,
            };
            // Get document content if not provided
            let content = args.content;
            if (!content) {
                const document = await lifecycleService.getDocumentById(args.documentId);
                if (!document) {
                    throw new Error(`Document not found: ${args.documentId}`);
                }
                // Read content from file path (placeholder implementation)
                try {
                    content = await fs.readFile(document.filePath, 'utf-8');
                }
                catch (error) {
                    content = `Content placeholder for document: ${document.title}`;
                }
            }
            // Create chunks
            const chunks = await lifecycleService.createChunks(args.documentId, content, chunkingConfig);
            // Generate embeddings if enabled
            let embeddingsGenerated = 0;
            if (args.enableEmbeddings !== false) {
                for (const chunk of chunks) {
                    try {
                        await lifecycleService.generateEmbeddings(chunk.id);
                        embeddingsGenerated++;
                    }
                    catch (error) {
                        logger.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error);
                    }
                }
            }
            // Detect relationships if enabled
            let relationshipsDetected = 0;
            if (args.enableRelationships !== false) {
                for (const chunk of chunks) {
                    try {
                        const relationships = await lifecycleService.detectRelationships(chunk.id);
                        relationshipsDetected += relationships.length;
                    }
                    catch (error) {
                        logger.warn(`Failed to detect relationships for chunk ${chunk.id}:`, error);
                    }
                }
            }
            // Detect topics if enabled
            let topicsDetected = 0;
            if (args.enableTopics !== false) {
                for (const chunk of chunks) {
                    try {
                        const topics = await lifecycleService.detectTopics(chunk.id);
                        topicsDetected += topics.length;
                    }
                    catch (error) {
                        logger.warn(`Failed to detect topics for chunk ${chunk.id}:`, error);
                    }
                }
            }
            return {
                success: true,
                documentId: args.documentId,
                chunksCreated: chunks.length,
                embeddingsGenerated,
                relationshipsDetected,
                topicsDetected,
                chunkingStrategy: chunkingConfig.strategy,
                chunks: chunks.map(chunk => ({
                    id: chunk.id,
                    index: chunk.chunkIndex,
                    tokenCount: chunk.tokenCount,
                    qualityScore: chunk.qualityScore,
                    chunkType: chunk.chunkType
                })),
                createdAt: localizationService.getCurrentDateTimeString()
            };
        }
        catch (error) {
            logger.error('Failed to create document chunks:', error);
            throw error;
        }
    });
    tools.set('search_document_chunks', async (args) => {
        try {
            logger.info(`Searching chunks for query: ${args.query}`);
            const searchQuery = {
                query: args.query,
                documentIds: args.documentIds,
                chunkTypes: args.chunkTypes,
                topicCategories: args.topicCategories,
                similarityThreshold: args.similarityThreshold || 0.7,
                maxResults: args.maxResults || 10,
                includeMetadata: args.includeMetadata !== false,
                includeRelationships: args.includeRelationships === true,
            };
            const results = await lifecycleService.semanticSearch(searchQuery);
            return {
                success: true,
                query: args.query,
                resultsCount: results.length,
                maxResults: searchQuery.maxResults,
                similarityThreshold: searchQuery.similarityThreshold,
                results: results.map(result => ({
                    chunkId: result.chunk.id,
                    documentId: result.chunk.documentId,
                    content: result.chunk.content.substring(0, 200) + '...',
                    similarityScore: Math.round(result.similarityScore * 100),
                    tokenCount: result.chunk.tokenCount,
                    qualityScore: Math.round(result.chunk.qualityScore * 100),
                    chunkType: result.chunk.chunkType,
                    topics: result.topics?.map(t => t.topicName) || [],
                    relationshipCount: result.relationships?.length || 0
                })),
                searchedAt: localizationService.getCurrentDateTimeString()
            };
        }
        catch (error) {
            logger.error('Failed to search document chunks:', error);
            throw error;
        }
    });
    tools.set('get_chunk_analytics', async (args) => {
        try {
            logger.info(`Getting chunk analytics for document: ${args.documentId}`);
            const analytics = await lifecycleService.getChunkAnalytics(args.documentId);
            const chunks = await lifecycleService.getChunksByDocument(args.documentId);
            return {
                success: true,
                documentId: args.documentId,
                analytics: {
                    totalChunks: analytics.totalChunks,
                    averageChunkSize: Math.round(analytics.averageChunkSize),
                    averageQualityScore: Math.round(analytics.averageQualityScore * 100),
                    chunkTypeDistribution: analytics.chunkTypeDistribution,
                    topicDistribution: analytics.topicDistribution,
                    relationshipCounts: analytics.relationshipCounts
                },
                chunkDetails: chunks.map(chunk => ({
                    id: chunk.id,
                    index: chunk.chunkIndex,
                    tokenCount: chunk.tokenCount,
                    qualityScore: Math.round(chunk.qualityScore * 100),
                    chunkType: chunk.chunkType,
                    createdAt: chunk.createdAt
                })),
                analyzedAt: analytics.analyzedAt
            };
        }
        catch (error) {
            logger.error('Failed to get chunk analytics:', error);
            throw error;
        }
    });
    tools.set('migrate_documents_to_chunks', async (args) => {
        try {
            logger.info(`Starting migration batch: ${args.batchName}`);
            if (!migrationService) {
                throw new Error('Migration service not initialized');
            }
            // Get document IDs to migrate
            let documentIds = args.documentIds || [];
            if (documentIds.length === 0) {
                const allDocs = await lifecycleService.getAllDocuments();
                documentIds = allDocs.map(doc => doc.id);
            }
            // Create migration batch
            const batch = await migrationService.createMigrationBatch(args.batchName, args.migrationType || 'full_migration', documentIds, args.configurationName);
            // Start processing asynchronously
            migrationService.processMigrationBatch(batch.id).catch(error => {
                logger.error(`Migration batch ${batch.id} failed:`, error);
            });
            return {
                success: true,
                batchId: batch.id,
                batchName: batch.batchName,
                migrationType: batch.migrationType,
                totalDocuments: batch.totalDocuments,
                status: batch.batchStatus,
                parallelProcessing: args.parallelProcessing !== false,
                startedAt: batch.startedAt,
                message: `Migration batch started. Use 'get_migration_status' with batchId '${batch.id}' to check progress.`
            };
        }
        catch (error) {
            logger.error('Failed to start document migration:', error);
            throw error;
        }
    });
    tools.set('get_migration_status', async (args) => {
        try {
            if (!migrationService) {
                throw new Error('Migration service not initialized');
            }
            if (args.documentId) {
                // Get status for specific document
                logger.info(`Getting migration status for document: ${args.documentId}`);
                const status = await migrationService.getMigrationStatus(args.documentId);
                if (!status) {
                    return {
                        success: false,
                        message: `No migration status found for document: ${args.documentId}`
                    };
                }
                return {
                    success: true,
                    documentId: args.documentId,
                    migrationStatus: status.migrationStatus,
                    migrationVersion: status.migrationVersion,
                    chunksCreated: status.chunksCreated,
                    embeddingsGenerated: status.embeddingsGenerated,
                    relationshipsDetected: status.relationshipsDetected,
                    topicsDetected: status.topicsDetected,
                    migrationStartedAt: status.migrationStartedAt,
                    migrationCompletedAt: status.migrationCompletedAt,
                    errors: status.migrationErrors
                };
            }
            else if (args.batchId) {
                // Get status for specific batch
                logger.info(`Getting migration status for batch: ${args.batchId}`);
                const batch = await migrationService.getMigrationBatch(args.batchId);
                if (!batch) {
                    return {
                        success: false,
                        message: `Migration batch not found: ${args.batchId}`
                    };
                }
                const performanceMetrics = await migrationService.getMigrationPerformanceMetrics(args.batchId);
                return {
                    success: true,
                    batch: {
                        id: batch.id,
                        name: batch.batchName,
                        type: batch.migrationType,
                        status: batch.batchStatus,
                        totalDocuments: batch.totalDocuments,
                        processedDocuments: batch.processedDocuments,
                        successfulDocuments: batch.successfulDocuments,
                        failedDocuments: batch.failedDocuments,
                        startedAt: batch.startedAt,
                        completedAt: batch.completedAt,
                        progressPercentage: Math.round((batch.processedDocuments / batch.totalDocuments) * 100)
                    },
                    performanceMetrics: {
                        totalMetrics: performanceMetrics.length,
                        averageProcessingTime: performanceMetrics.length > 0
                            ? Math.round(performanceMetrics.reduce((sum, m) => sum + m.totalProcessingTimeMs, 0) / performanceMetrics.length)
                            : 0,
                        totalChunksCreated: performanceMetrics.reduce((sum, m) => sum + m.chunksCreated, 0),
                        totalEmbeddingsGenerated: performanceMetrics.reduce((sum, m) => sum + m.embeddingsGenerated, 0),
                        totalErrors: performanceMetrics.reduce((sum, m) => sum + m.errorCount, 0)
                    }
                };
            }
            else {
                // Get all migration batches
                logger.info('Getting all migration batches');
                const batches = await migrationService.getAllMigrationBatches();
                return {
                    success: true,
                    totalBatches: batches.length,
                    batches: batches.map(batch => ({
                        id: batch.id,
                        name: batch.batchName,
                        type: batch.migrationType,
                        status: batch.batchStatus,
                        totalDocuments: batch.totalDocuments,
                        successfulDocuments: batch.successfulDocuments,
                        failedDocuments: batch.failedDocuments,
                        startedAt: batch.startedAt,
                        completedAt: batch.completedAt,
                        progressPercentage: Math.round((batch.processedDocuments / batch.totalDocuments) * 100)
                    }))
                };
            }
        }
        catch (error) {
            logger.error('Failed to get migration status:', error);
            throw error;
        }
    });
    return enhancedTools;
}
// Helper functions
async function scanExistingDocumentation(projectRoot) {
    // Implementation would scan filesystem for documentation files
    return [];
}
async function findRelevantDocuments(workType, filePaths, lifecycleService) {
    // Implementation would find documents relevant to the work being done
    return [];
}
async function checkDocumentExists(documentPath) {
    try {
        await fs.access(documentPath);
        return true;
    }
    catch {
        return false;
    }
}
async function getRecentWorkContext(documentPath, connectionService) {
    // Implementation would get recent work context for a document
    return "Recent development work context";
}
async function generateBasicQualityMetrics(documentPath) {
    try {
        const stats = await fs.stat(documentPath);
        const content = await fs.readFile(documentPath, 'utf-8');
        return [
            `File Size: ${Math.round(stats.size / 1024)} KB`,
            `Lines: ${content.split('\n').length}`,
            `Words: ${content.split(/\s+/).length}`,
            `Last Modified: ${stats.mtime.toISOString()}`
        ];
    }
    catch (error) {
        return [`Error reading file: ${error}`];
    }
}
async function buildTreeRepresentation(nodes, documents, includeMetadata, maxDepth) {
    // Implementation would build a tree representation
    return { nodes: nodes.length, structure: "Tree structure here" };
}
async function generateLifecycleReport(timeRange, lifecycleService, dateTimeService) {
    return {
        title: "Document Lifecycle Report",
        period: timeRange,
        summary: "Report content here"
    };
}
async function generateQualityReport(includeAI, lifecycleService, aiService, dateTimeService) {
    return {
        title: "Document Quality Report",
        aiEnabled: includeAI,
        summary: "Report content here"
    };
}
async function generateConnectionsReport(connectionService, dateTimeService) {
    return {
        title: "Work-Document Connections Report",
        summary: "Report content here"
    };
}
async function generateDuplicatesReport(lifecycleService, aiService, dateTimeService) {
    return {
        title: "Document Duplicates Report",
        summary: "Report content here"
    };
}
async function generateComprehensiveReport(timeRange, includeAI, services) {
    return {
        title: "Comprehensive Documentation Report",
        period: timeRange,
        aiEnabled: includeAI,
        summary: "Report content here"
    };
}
//# sourceMappingURL=index.js.map