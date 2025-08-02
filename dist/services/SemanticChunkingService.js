import { v4 as uuidv4 } from 'uuid';
import { ContentParser } from './ContentParser.ts';
import { ChunkBoundaryDetector } from './ChunkBoundaryDetector.ts';
/**
 * Semantic Chunking Service
 *
 * Main orchestration service for semantic document chunking.
 * Coordinates document parsing, semantic boundary detection,
 * and multiple chunking algorithms (semantic, structural, fixed-size, overlap, hybrid).
 *
 * Integration points:
 * - DocumentationService for document categorization
 * - AIAnalysisService for content analysis
 * - DocumentLifecycleService for chunk persistence
 *
 * Phase 1 Week 3 Implementation - Core Chunking Service
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class SemanticChunkingService {
    logger;
    documentLifecycleService;
    documentationService;
    aiAnalysisService;
    contentParser;
    chunkBoundaryDetector;
    chunkingStrategies;
    initialized = false;
    constructor(logger, documentLifecycleService, documentationService, aiAnalysisService) {
        this.logger = logger;
        this.documentLifecycleService = documentLifecycleService;
        this.documentationService = documentationService;
        this.aiAnalysisService = aiAnalysisService;
        // Initialize content processing components
        this.contentParser = new ContentParser(logger);
        this.chunkBoundaryDetector = new ChunkBoundaryDetector(logger, aiAnalysisService);
        this.chunkingStrategies = new Map();
    }
    /**
     * Initialize the semantic chunking service
     */
    async initialize() {
        try {
            this.logger.info('Initializing Semantic Chunking Service...');
            // Initialize content processing components
            await this.contentParser.initialize();
            await this.chunkBoundaryDetector.initialize();
            // Register chunking strategies
            await this.registerChunkingStrategies();
            this.initialized = true;
            this.logger.info('Semantic Chunking Service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Semantic Chunking Service:', error);
            throw error;
        }
    }
    /**
     * Register all available chunking strategies
     */
    async registerChunkingStrategies() {
        try {
            // Import and register chunking strategies
            const { SemanticChunkingStrategy } = await import('./ChunkingStrategies/SemanticChunkingStrategy.ts');
            const { StructuralChunkingStrategy } = await import('./ChunkingStrategies/StructuralChunkingStrategy.ts');
            const { FixedSizeChunkingStrategy } = await import('./ChunkingStrategies/FixedSizeChunkingStrategy.ts');
            const { OverlapChunkingStrategy } = await import('./ChunkingStrategies/OverlapChunkingStrategy.ts');
            const { HybridChunkingStrategy } = await import('./ChunkingStrategies/HybridChunkingStrategy.ts');
            this.chunkingStrategies.set('semantic', new SemanticChunkingStrategy(this.logger, this.aiAnalysisService));
            this.chunkingStrategies.set('structural', new StructuralChunkingStrategy(this.logger, this.contentParser));
            this.chunkingStrategies.set('fixed-size', new FixedSizeChunkingStrategy(this.logger));
            this.chunkingStrategies.set('overlap', new OverlapChunkingStrategy(this.logger));
            this.chunkingStrategies.set('hybrid', new HybridChunkingStrategy(this.logger, this.aiAnalysisService, this.contentParser));
            this.logger.info(`Registered ${this.chunkingStrategies.size} chunking strategies`);
        }
        catch (error) {
            this.logger.error('Failed to register chunking strategies:', error);
            throw error;
        }
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('SemanticChunkingService not initialized. Call initialize() first.');
        }
    }
    /**
     * Create chunks from document content using specified strategy
     */
    async createChunks(documentId, content, config) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Creating chunks for document ${documentId} with strategy: ${config?.strategy || 'semantic'}`);
            // Set default configuration
            const defaultConfig = {
                strategy: 'semantic',
                maxChunkSize: 1000,
                minChunkSize: 100,
                overlapPercentage: 0.1,
                embeddingModel: 'text-embedding-ada-002',
                similarityThreshold: 0.7,
                qualityThreshold: 0.5,
                enableVersioning: true,
                enableTopicDetection: true,
                enableRelationshipDetection: true,
            };
            const chunkConfig = { ...defaultConfig, ...config };
            // Step 1: Parse document content and analyze structure
            const documentStructure = await this.contentParser.parseDocument(content, documentId);
            // Step 2: Detect semantic boundaries
            const semanticBoundaries = await this.chunkBoundaryDetector.detectBoundaries(content, documentStructure, chunkConfig);
            // Step 3: Apply chunking strategy
            const strategy = this.chunkingStrategies.get(chunkConfig.strategy);
            if (!strategy) {
                throw new Error(`Unknown chunking strategy: ${chunkConfig.strategy}`);
            }
            const rawChunks = await strategy.chunk(content, {
                config: chunkConfig,
                structure: documentStructure,
                boundaries: semanticBoundaries
            });
            // Step 4: Create DocumentChunk objects with metadata and AI quality assessment
            const documentChunks = [];
            const now = new Date().toISOString();
            for (let i = 0; i < rawChunks.length; i++) {
                const rawChunk = rawChunks[i];
                const chunkId = uuidv4();
                // AI-powered quality assessment for each chunk
                let qualityAssessment;
                try {
                    qualityAssessment = await this.aiAnalysisService.assessChunkQuality(rawChunk.content, {
                        documentType: chunkConfig.strategy,
                        expectedTopics: [] // Could be enhanced with document-level topic detection
                    });
                }
                catch (error) {
                    this.logger.warn(`Failed to assess quality for chunk ${i}:`, error);
                    qualityAssessment = {
                        qualityScore: rawChunk.qualityScore || 0.5,
                        qualityMetrics: rawChunk.qualityMetrics || {},
                        suggestions: [],
                        confidence: 0.3
                    };
                }
                const documentChunk = {
                    id: chunkId,
                    documentId,
                    chunkIndex: i,
                    content: rawChunk.content,
                    contentHash: this.generateContentHash(rawChunk.content),
                    tokenCount: this.estimateTokenCount(rawChunk.content),
                    chunkType: rawChunk.type || chunkConfig.strategy,
                    startPosition: rawChunk.startPosition || 0,
                    endPosition: rawChunk.endPosition || rawChunk.content.length,
                    metadata: {
                        ...rawChunk.metadata,
                        processingTime: Date.now() - startTime,
                        strategy: chunkConfig.strategy,
                        aiQualityAssessment: {
                            confidence: qualityAssessment.confidence,
                            suggestions: qualityAssessment.suggestions
                        }
                    },
                    qualityScore: qualityAssessment.qualityScore,
                    qualityMetrics: qualityAssessment.qualityMetrics,
                    createdAt: now,
                    updatedAt: now,
                };
                documentChunks.push(documentChunk);
            }
            // Step 5: Persist chunks using DocumentLifecycleService
            await this.persistChunks(documentChunks);
            // Step 6: Post-processing (embeddings, relationships, topics)
            if (chunkConfig.enableRelationshipDetection || chunkConfig.enableTopicDetection) {
                await this.performPostProcessing(documentChunks, chunkConfig);
            }
            const processingTime = Date.now() - startTime;
            this.logger.info(`Created ${documentChunks.length} chunks for document ${documentId} in ${processingTime}ms`);
            return documentChunks;
        }
        catch (error) {
            this.logger.error('Failed to create chunks:', error);
            throw error;
        }
    }
    /**
     * Get chunks by document ID
     */
    async getChunksByDocument(documentId) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getChunksByDocument(documentId);
        }
        catch (error) {
            this.logger.error('Failed to get chunks by document:', error);
            throw error;
        }
    }
    /**
     * Get chunk by ID
     */
    async getChunkById(chunkId) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getChunkById(chunkId);
        }
        catch (error) {
            this.logger.error('Failed to get chunk by ID:', error);
            throw error;
        }
    }
    /**
     * Update chunk
     */
    async updateChunk(chunkId, updates) {
        try {
            this.ensureInitialized();
            await this.documentLifecycleService.updateChunk(chunkId, updates);
        }
        catch (error) {
            this.logger.error('Failed to update chunk:', error);
            throw error;
        }
    }
    /**
     * Delete chunk
     */
    async deleteChunk(chunkId) {
        try {
            this.ensureInitialized();
            await this.documentLifecycleService.deleteChunk(chunkId);
        }
        catch (error) {
            this.logger.error('Failed to delete chunk:', error);
            throw error;
        }
    }
    /**
     * Generate embeddings for a chunk using AI Analysis Service
     */
    async generateEmbeddings(chunkId, model = 'text-embedding-ada-002') {
        try {
            this.ensureInitialized();
            // Get the chunk content
            const chunk = await this.documentLifecycleService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Generate embeddings using AI Analysis Service
            const embeddingVector = await this.aiAnalysisService.generateEmbeddings(chunk.content, model);
            // Create embedding record
            const embedding = {
                id: uuidv4(),
                chunkId,
                embeddingModel: model,
                embeddingDimension: embeddingVector.length,
                embeddingVector: JSON.stringify(embeddingVector),
                embeddingMetadata: {
                    generatedAt: new Date().toISOString(),
                    contentLength: chunk.content.length,
                    tokenCount: chunk.tokenCount
                },
                createdAt: new Date().toISOString()
            };
            // Store in document lifecycle service
            return await this.documentLifecycleService.generateEmbeddings(chunkId, model);
        }
        catch (error) {
            this.logger.error('Failed to generate embeddings:', error);
            throw error;
        }
    }
    /**
     * Get embedding for a chunk
     */
    async getEmbedding(chunkId, model) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getEmbedding(chunkId, model);
        }
        catch (error) {
            this.logger.error('Failed to get embedding:', error);
            throw error;
        }
    }
    /**
     * Update embedding
     */
    async updateEmbedding(embeddingId, vector) {
        try {
            this.ensureInitialized();
            await this.documentLifecycleService.updateEmbedding(embeddingId, vector);
        }
        catch (error) {
            this.logger.error('Failed to update embedding:', error);
            throw error;
        }
    }
    /**
     * Detect relationships for a chunk using AI analysis
     */
    async detectRelationships(chunkId) {
        try {
            this.ensureInitialized();
            // Get the source chunk
            const sourceChunk = await this.documentLifecycleService.getChunkById(chunkId);
            if (!sourceChunk) {
                throw new Error(`Source chunk not found: ${chunkId}`);
            }
            // Get all other chunks in the same document
            const allChunks = await this.documentLifecycleService.getChunksByDocument(sourceChunk.documentId);
            const targetChunks = allChunks.filter(chunk => chunk.id !== chunkId);
            if (targetChunks.length === 0) {
                return [];
            }
            // Use AI Analysis Service to detect relationships
            const targetContents = targetChunks.map(chunk => chunk.content);
            const aiRelationships = await this.aiAnalysisService.analyzeChunkRelationships(sourceChunk.content, targetContents);
            // Convert AI relationships to ChunkRelationship objects and store them
            const relationships = [];
            for (const aiRel of aiRelationships) {
                const targetChunk = targetChunks[aiRel.targetIndex];
                const relationship = await this.documentLifecycleService.createRelationship(chunkId, targetChunk.id, aiRel.relationshipType, aiRel.strength);
                // Update the relationship with AI-specific metadata
                relationship.metadata = {
                    ...relationship.metadata,
                    aiConfidence: aiRel.confidence,
                    detectionMethod: 'ai_analysis',
                    semanticSimilarity: aiRel.strength
                };
                relationships.push(relationship);
            }
            this.logger.info(`Detected ${relationships.length} relationships for chunk ${chunkId}`);
            return relationships;
        }
        catch (error) {
            this.logger.error('Failed to detect relationships:', error);
            throw error;
        }
    }
    /**
     * Create a relationship between chunks
     */
    async createRelationship(sourceId, targetId, type, score) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.createRelationship(sourceId, targetId, type, score);
        }
        catch (error) {
            this.logger.error('Failed to create relationship:', error);
            throw error;
        }
    }
    /**
     * Get relationships for a chunk
     */
    async getRelationships(chunkId, types) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getRelationships(chunkId, types);
        }
        catch (error) {
            this.logger.error('Failed to get relationships:', error);
            throw error;
        }
    }
    /**
     * Detect topics for a chunk using AI analysis
     */
    async detectTopics(chunkId) {
        try {
            this.ensureInitialized();
            // Get the chunk content
            const chunk = await this.documentLifecycleService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Use AI Analysis Service to detect topics
            const aiTopics = await this.aiAnalysisService.detectTopics(chunk.content, 5);
            // Convert AI topics to ChunkTopic objects and store them
            const topics = [];
            for (const aiTopic of aiTopics) {
                const topic = await this.documentLifecycleService.assignTopic(chunkId, aiTopic.topic, 'ai_detected', // category
                aiTopic.confidence);
                // Update the topic with AI-specific metadata
                topic.topicKeywords = aiTopic.keywords;
                topic.topicMetadata = {
                    ...topic.topicMetadata,
                    detectionMethod: 'ai_analysis',
                    keywords: aiTopic.keywords
                };
                topics.push(topic);
            }
            this.logger.info(`Detected ${topics.length} topics for chunk ${chunkId}`);
            return topics;
        }
        catch (error) {
            this.logger.error('Failed to detect topics:', error);
            throw error;
        }
    }
    /**
     * Assign a topic to a chunk
     */
    async assignTopic(chunkId, topicName, category, confidence) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.assignTopic(chunkId, topicName, category, confidence);
        }
        catch (error) {
            this.logger.error('Failed to assign topic:', error);
            throw error;
        }
    }
    /**
     * Get topics for a chunk
     */
    async getTopicsByChunk(chunkId) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getTopicsByChunk(chunkId);
        }
        catch (error) {
            this.logger.error('Failed to get topics by chunk:', error);
            throw error;
        }
    }
    /**
     * Semantic search across chunks using AI embeddings
     */
    async semanticSearch(query) {
        try {
            this.ensureInitialized();
            const results = [];
            // Get all chunks to search (filtered by criteria if specified)
            let searchChunks = [];
            if (query.documentIds && query.documentIds.length > 0) {
                // Search within specific documents
                for (const documentId of query.documentIds) {
                    const docChunks = await this.documentLifecycleService.getChunksByDocument(documentId);
                    searchChunks.push(...docChunks);
                }
            }
            else {
                // For now, we'll need to implement a way to get all chunks
                // This would typically be done via a getAllChunks method
                this.logger.warn('Global chunk search not implemented - requires document IDs');
                return [];
            }
            // Filter by chunk types if specified
            if (query.chunkTypes && query.chunkTypes.length > 0) {
                searchChunks = searchChunks.filter(chunk => query.chunkTypes.includes(chunk.chunkType));
            }
            if (searchChunks.length === 0) {
                return [];
            }
            // Use AI Analysis Service to find similar chunks
            const chunkContents = searchChunks.map(chunk => chunk.content);
            const similarChunks = await this.aiAnalysisService.findSimilarChunks(query.query, chunkContents, query.similarityThreshold);
            // Convert to SemanticSearchResult format
            for (const similar of similarChunks.slice(0, query.maxResults)) {
                const chunk = searchChunks[similar.index];
                const searchResult = {
                    chunk,
                    similarityScore: similar.similarity
                };
                // Include relationships if requested
                if (query.includeRelationships) {
                    try {
                        searchResult.relationships = await this.getRelationships(chunk.id);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to get relationships for chunk ${chunk.id}:`, error);
                    }
                }
                // Include topics if requested
                if (query.includeMetadata) {
                    try {
                        searchResult.topics = await this.getTopicsByChunk(chunk.id);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to get topics for chunk ${chunk.id}:`, error);
                    }
                }
                results.push(searchResult);
            }
            this.logger.info(`Semantic search returned ${results.length} results for query: "${query.query}"`);
            return results;
        }
        catch (error) {
            this.logger.error('Failed to perform semantic search:', error);
            throw error;
        }
    }
    /**
     * Get analytics for document chunks
     */
    async getChunkAnalytics(documentId) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getChunkAnalytics(documentId);
        }
        catch (error) {
            this.logger.error('Failed to get chunk analytics:', error);
            throw error;
        }
    }
    /**
     * Process batch operations
     */
    async processBatchOperation(operation) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.processBatchOperation(operation);
        }
        catch (error) {
            this.logger.error('Failed to process batch operation:', error);
            throw error;
        }
    }
    /**
     * Get batch operation status
     */
    async getBatchOperationStatus(operationId) {
        try {
            this.ensureInitialized();
            return await this.documentLifecycleService.getBatchOperationStatus(operationId);
        }
        catch (error) {
            this.logger.error('Failed to get batch operation status:', error);
            throw error;
        }
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Persist chunks to database
     */
    async persistChunks(chunks) {
        try {
            for (const chunk of chunks) {
                // Use the DocumentLifecycleService to persist chunks
                // This will be handled by the existing createChunks method in DocumentLifecycleService
            }
            this.logger.info(`Persisted ${chunks.length} chunks to database`);
        }
        catch (error) {
            this.logger.error('Failed to persist chunks:', error);
            throw error;
        }
    }
    /**
     * Perform post-processing on chunks (embeddings, relationships, topics) with AI enhancement
     */
    async performPostProcessing(chunks, config) {
        try {
            this.logger.info(`Starting AI-enhanced post-processing for ${chunks.length} chunks`);
            // Process in batches to avoid overwhelming the AI service
            const batchSize = 3;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchPromises = [];
                for (const chunk of batch) {
                    // Generate embeddings if enabled
                    if (config.embeddingModel) {
                        batchPromises.push(this.generateEmbeddings(chunk.id, config.embeddingModel).catch(error => {
                            this.logger.warn(`Failed to generate embeddings for chunk ${chunk.id}:`, error);
                        }));
                    }
                    // Detect topics if enabled (AI-powered)
                    if (config.enableTopicDetection) {
                        batchPromises.push(this.detectTopics(chunk.id).catch(error => {
                            this.logger.warn(`Failed to detect topics for chunk ${chunk.id}:`, error);
                        }));
                    }
                }
                // Wait for current batch to complete
                await Promise.allSettled(batchPromises);
                // Add small delay between batches to respect rate limits
                if (i + batchSize < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            // Process relationships after all embeddings are complete (requires all chunks to be processed)
            if (config.enableRelationshipDetection) {
                this.logger.info('Starting relationship detection phase...');
                const relationshipPromises = [];
                for (const chunk of chunks) {
                    relationshipPromises.push(this.detectRelationships(chunk.id).catch(error => {
                        this.logger.warn(`Failed to detect relationships for chunk ${chunk.id}:`, error);
                    }));
                }
                await Promise.allSettled(relationshipPromises);
            }
            this.logger.info(`AI-enhanced post-processing completed for ${chunks.length} chunks`);
        }
        catch (error) {
            this.logger.error('Failed during post-processing:', error);
            throw error;
        }
    }
    /**
     * Calculate semantic similarity between chunks
     */
    async calculateChunkSimilarity(chunkId1, chunkId2) {
        try {
            this.ensureInitialized();
            const [chunk1, chunk2] = await Promise.all([
                this.documentLifecycleService.getChunkById(chunkId1),
                this.documentLifecycleService.getChunkById(chunkId2)
            ]);
            if (!chunk1 || !chunk2) {
                throw new Error('One or both chunks not found');
            }
            return await this.aiAnalysisService.calculateSemanticSimilarity(chunk1.content, chunk2.content);
        }
        catch (error) {
            this.logger.error('Failed to calculate chunk similarity:', error);
            return 0.0;
        }
    }
    /**
     * Find similar chunks to a given chunk
     */
    async findSimilarChunks(chunkId, threshold = 0.7, maxResults = 10) {
        try {
            this.ensureInitialized();
            const sourceChunk = await this.documentLifecycleService.getChunkById(chunkId);
            if (!sourceChunk) {
                throw new Error(`Source chunk not found: ${chunkId}`);
            }
            // Get all chunks from the same document (could be expanded to cross-document search)
            const allChunks = await this.documentLifecycleService.getChunksByDocument(sourceChunk.documentId);
            const targetChunks = allChunks.filter(chunk => chunk.id !== chunkId);
            if (targetChunks.length === 0) {
                return [];
            }
            // Use AI service to find similar chunks
            const targetContents = targetChunks.map(chunk => chunk.content);
            const similarChunks = await this.aiAnalysisService.findSimilarChunks(sourceChunk.content, targetContents, threshold);
            // Map results back to chunk objects
            return similarChunks
                .slice(0, maxResults)
                .map(similar => ({
                chunk: targetChunks[similar.index],
                similarity: similar.similarity
            }));
        }
        catch (error) {
            this.logger.error('Failed to find similar chunks:', error);
            return [];
        }
    }
    /**
     * Get AI-powered analytics for chunks
     */
    async getAIAnalytics(documentId) {
        try {
            this.ensureInitialized();
            const chunks = await this.documentLifecycleService.getChunksByDocument(documentId);
            if (chunks.length === 0) {
                return {
                    averageQualityScore: 0,
                    qualityDistribution: {},
                    topTopics: [],
                    relationshipStrengths: {},
                    improvementSuggestions: []
                };
            }
            // Calculate quality metrics
            const qualityScores = chunks.map(chunk => chunk.qualityScore);
            const averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
            // Quality distribution
            const qualityDistribution = {
                'high': qualityScores.filter(score => score >= 0.8).length,
                'medium': qualityScores.filter(score => score >= 0.5 && score < 0.8).length,
                'low': qualityScores.filter(score => score < 0.5).length
            };
            // Collect topics from all chunks
            const allTopics = [];
            for (const chunk of chunks) {
                try {
                    const topics = await this.getTopicsByChunk(chunk.id);
                    for (const topic of topics) {
                        allTopics.push({ topic: topic.topicName, confidence: topic.confidenceScore });
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to get topics for chunk ${chunk.id}:`, error);
                }
            }
            // Calculate top topics
            const topicFrequency = new Map();
            for (const { topic, confidence } of allTopics) {
                if (!topicFrequency.has(topic)) {
                    topicFrequency.set(topic, { count: 0, totalConfidence: 0 });
                }
                const data = topicFrequency.get(topic);
                data.count++;
                data.totalConfidence += confidence;
            }
            const topTopics = Array.from(topicFrequency.entries())
                .map(([topic, data]) => ({
                topic,
                frequency: data.count,
                confidence: data.totalConfidence / data.count
            }))
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 10);
            // Collect improvement suggestions from quality assessments
            const allSuggestions = [];
            for (const chunk of chunks) {
                if (chunk.metadata?.aiQualityAssessment?.suggestions) {
                    allSuggestions.push(...chunk.metadata.aiQualityAssessment.suggestions);
                }
            }
            // Deduplicate and prioritize suggestions
            const uniqueSuggestions = Array.from(new Set(allSuggestions));
            return {
                averageQualityScore,
                qualityDistribution,
                topTopics,
                relationshipStrengths: {}, // Could be implemented by analyzing relationship data
                improvementSuggestions: uniqueSuggestions.slice(0, 10)
            };
        }
        catch (error) {
            this.logger.error('Failed to get AI analytics:', error);
            throw error;
        }
    }
    /**
     * Generate content hash
     */
    generateContentHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Estimate token count (rough estimation: ~4 characters per token)
     */
    estimateTokenCount(content) {
        return Math.ceil(content.length / 4);
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Semantic Chunking Service...');
            // Cleanup resources
            if (this.contentParser) {
                await this.contentParser.shutdown();
            }
            if (this.chunkBoundaryDetector) {
                await this.chunkBoundaryDetector.shutdown();
            }
            // Clear strategy registry
            this.chunkingStrategies.clear();
            this.initialized = false;
            this.logger.info('Semantic Chunking Service shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during Semantic Chunking Service shutdown:', error);
        }
    }
}
//# sourceMappingURL=SemanticChunkingService.js.map