import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
import { getErrorMessage } from '../utils/typeHelpers.js';
/**
 * AI Analysis Service
 *
 * Provides intelligent document analysis using various AI providers.
 * Supports quality assessment, duplicate detection, relevance scoring,
 * embedding generation, semantic similarity calculations, and AI-powered quality assessment.
 *
 * Phase 1 Week 4 Enhancement - AI Integration & Testing
 * Phase 2.2 Enhancement - Redis Cache Integration
 *
 * Created: 2025-07-29
 * Enhanced: 2025-07-31 - Added embeddings and semantic analysis capabilities
 * Enhanced: 2025-07-31 - Migrated embedding cache to Redis for distributed caching
 */
export class AIAnalysisService {
    aiProvider;
    logger;
    aiClient; // Will be initialized based on provider (OpenAI client or similar)
    cacheService;
    CACHE_TTL = 60 * 60; // 1 hour in seconds (Redis TTL format)
    CACHE_NAMESPACE = 'ai_embeddings';
    // Thread safety mutex for non-Redis operations
    operationMutex = new Mutex();
    constructor(aiProvider, logger, cacheService, openAIClient, OpenAIClass) {
        this.aiProvider = aiProvider;
        this.logger = logger;
        this.cacheService = cacheService;
        if (openAIClient) {
            this.aiClient = openAIClient;
        }
        else {
            this.initializeAIClient(OpenAIClass);
        }
    }
    /**
     * Initialize AI client based on provider
     * @param OpenAIClass - Optional OpenAI constructor class for dependency injection
     */
    initializeAIClient(OpenAIClass) {
        try {
            switch (this.aiProvider) {
                case 'openai':
                    // Initialize OpenAI client if API key is available
                    if (process.env.OPENAI_API_KEY) {
                        if (OpenAIClass) {
                            const OpenAI = OpenAIClass;
                            this.aiClient = new OpenAI({
                                apiKey: process.env.OPENAI_API_KEY
                            });
                        }
                        else {
                            // Use dynamic import for ES modules
                            import('openai').then(({ OpenAI }) => {
                                this.aiClient = new OpenAI({
                                    apiKey: process.env.OPENAI_API_KEY
                                });
                            }).catch(() => {
                                this.logger.warn('OpenAI package not available, using local analysis');
                            });
                        }
                    }
                    else {
                        this.logger.warn('OpenAI API key not found, using local analysis');
                    }
                    break;
                case 'anthropic':
                    // Initialize Anthropic client if API key is available
                    if (process.env.ANTHROPIC_API_KEY) {
                        // Note: This would require @anthropic-ai/sdk package
                        this.logger.info('Anthropic client initialization not implemented');
                    }
                    break;
                case 'local':
                    // For local/offline analysis
                    this.logger.info('Using local AI analysis (pattern-based)');
                    break;
                default:
                    this.logger.warn(`Unknown AI provider: ${this.aiProvider}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize AI client:', getErrorMessage(error));
        }
    }
    /**
     * Analyze document quality using AI
     * @param documentPath - Path to document to analyze
     * @returns Promise resolving to AI analysis result
     * @throws Error if document cannot be read or analyzed
     */
    async analyzeQuality(documentPath) {
        if (!documentPath?.trim()) {
            throw new Error('Document path is required for quality analysis');
        }
        try {
            const content = await this.readDocumentContent(documentPath);
            if (!content?.trim()) {
                throw new Error(`Document at ${documentPath} is empty or contains no readable content`);
            }
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.analyzeQualityWithOpenAI(documentPath, content);
            }
            else {
                analysis = await this.analyzeQualityLocally(documentPath, content);
            }
            this.logger.info(`Quality analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            const errorMsg = `Failed to analyze document quality for '${documentPath}': ${getErrorMessage(error)}`;
            this.logger.error(errorMsg);
            // Return fallback analysis with detailed error context
            return this.createFallbackAnalysis(documentPath, 'quality', errorMsg);
        }
    }
    /**
     * Detect duplicate content
     */
    async detectDuplicates(documentPath) {
        try {
            const content = await this.readDocumentContent(documentPath);
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.detectDuplicatesWithOpenAI(documentPath, content);
            }
            else {
                analysis = await this.detectDuplicatesLocally(documentPath, content);
            }
            this.logger.info(`Duplicate analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            this.logger.error('Failed to detect duplicates:', getErrorMessage(error));
            return this.createFallbackAnalysis(documentPath, 'duplicate', getErrorMessage(error));
        }
    }
    /**
     * Calculate relevance to work context
     */
    async calculateRelevance(documentPath, workContext) {
        try {
            const content = await this.readDocumentContent(documentPath);
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.calculateRelevanceWithOpenAI(documentPath, content, workContext);
            }
            else {
                analysis = await this.calculateRelevanceLocally(documentPath, content, workContext);
            }
            this.logger.info(`Relevance analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            this.logger.error('Failed to calculate relevance:', getErrorMessage(error));
            return this.createFallbackAnalysis(documentPath, 'relevance', getErrorMessage(error));
        }
    }
    /**
     * Generate insights about the document
     */
    async generateInsights(documentPath) {
        try {
            const content = await this.readDocumentContent(documentPath);
            if (this.aiClient && this.aiProvider === 'openai') {
                return await this.generateInsightsWithOpenAI(documentPath, content);
            }
            else {
                return await this.generateInsightsLocally(documentPath, content);
            }
        }
        catch (error) {
            this.logger.error('Failed to generate insights:', getErrorMessage(error));
            return ['Error generating insights: ' + getErrorMessage(error)];
        }
    }
    /**
     * Generate embeddings for content using OpenAI API with Redis caching
     */
    async generateEmbeddings(content, model = 'text-embedding-ada-002') {
        try {
            const cacheKey = `${model}:${this.generateContentHash(content)}`;
            // Check Redis cache first
            const cachedEmbedding = await this.cacheService.get(cacheKey);
            if (cachedEmbedding) {
                this.logger.debug('Using cached embedding from Redis');
                return cachedEmbedding;
            }
            if (!this.aiClient || this.aiProvider !== 'openai') {
                this.logger.warn('OpenAI client not available, generating random embedding');
                return this.generateRandomEmbedding(1536); // Default dimension for text-embedding-ada-002
            }
            const response = await this.aiClient.embeddings.create({
                model,
                input: content.substring(0, 8000), // Limit input size to avoid API limits
                encoding_format: 'float'
            });
            if (!response.data || response.data.length === 0) {
                throw new Error('No embedding data received from OpenAI');
            }
            const embedding = response.data[0]?.embedding;
            if (!embedding) {
                throw new Error('No embedding data received from OpenAI');
            }
            // Store in Redis cache with TTL
            await this.cacheService.set(cacheKey, embedding, {
                ttl: this.CACHE_TTL,
                namespace: this.CACHE_NAMESPACE,
                tags: ['embeddings', model],
                compress: true // Enable compression for large embedding vectors
            });
            this.logger.info(`Generated embedding with ${embedding.length} dimensions`);
            return embedding;
        }
        catch (error) {
            this.logger.error('Failed to generate embeddings:', getErrorMessage(error));
            // Return random embedding as fallback
            return this.generateRandomEmbedding(1536);
        }
    }
    /**
     * Calculate semantic similarity between two pieces of content
     */
    async calculateSemanticSimilarity(content1, content2) {
        try {
            const [embedding1, embedding2] = await Promise.all([
                this.generateEmbeddings(content1),
                this.generateEmbeddings(content2)
            ]);
            return this.calculateCosineSimilarity(embedding1, embedding2);
        }
        catch (error) {
            this.logger.error('Failed to calculate semantic similarity:', getErrorMessage(error));
            return 0.0;
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    calculateCosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }
        return dotProduct / (norm1 * norm2);
    }
    /**
     * Find semantically similar content chunks
     */
    async findSimilarChunks(queryContent, chunkContents, threshold = 0.7) {
        try {
            const queryEmbedding = await this.generateEmbeddings(queryContent);
            const results = [];
            // Generate embeddings for all chunks in parallel (in batches to avoid rate limits)
            const batchSize = 5;
            for (let i = 0; i < chunkContents.length; i += batchSize) {
                const batch = chunkContents.slice(i, i + batchSize);
                const batchEmbeddings = await Promise.all(batch.map(content => this.generateEmbeddings(content)));
                for (let j = 0; j < batchEmbeddings.length; j++) {
                    const chunkIndex = i + j;
                    const similarity = this.calculateCosineSimilarity(queryEmbedding, batchEmbeddings[j]);
                    if (similarity >= threshold) {
                        results.push({
                            index: chunkIndex,
                            similarity,
                            content: chunkContents[chunkIndex]
                        });
                    }
                }
                // Add small delay between batches to respect rate limits
                if (i + batchSize < chunkContents.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            // Sort by similarity score (highest first)
            return results.sort((a, b) => b.similarity - a.similarity);
        }
        catch (error) {
            this.logger.error('Failed to find similar chunks:', getErrorMessage(error));
            return [];
        }
    }
    /**
     * AI-powered quality assessment for chunks
     */
    async assessChunkQuality(content, context) {
        try {
            if (this.aiClient && this.aiProvider === 'openai') {
                return await this.assessChunkQualityWithOpenAI(content, context);
            }
            else {
                return await this.assessChunkQualityLocally(content, context);
            }
        }
        catch (error) {
            this.logger.error('Failed to assess chunk quality:', getErrorMessage(error));
            return {
                qualityScore: 0.5,
                qualityMetrics: { error: 1 },
                suggestions: ['Quality assessment failed: ' + getErrorMessage(error)],
                confidence: 0.1
            };
        }
    }
    /**
     * Detect topics in content using AI analysis
     */
    async detectTopics(content, maxTopics = 5) {
        try {
            if (this.aiClient && this.aiProvider === 'openai') {
                return await this.detectTopicsWithOpenAI(content, maxTopics);
            }
            else {
                return await this.detectTopicsLocally(content, maxTopics);
            }
        }
        catch (error) {
            this.logger.error('Failed to detect topics:', getErrorMessage(error));
            return [];
        }
    }
    /**
     * Analyze relationships between chunks
     */
    async analyzeChunkRelationships(sourceContent, targetContents) {
        try {
            const relationships = [];
            // Calculate semantic similarity first
            const similarChunks = await this.findSimilarChunks(sourceContent, targetContents, 0.3);
            for (const similar of similarChunks) {
                // Determine relationship type based on similarity and content analysis
                const relationshipType = await this.determineRelationshipType(sourceContent, similar.content);
                relationships.push({
                    targetIndex: similar.index,
                    relationshipType,
                    strength: similar.similarity,
                    confidence: similar.similarity * 0.8 // Slightly lower confidence than similarity
                });
            }
            return relationships;
        }
        catch (error) {
            this.logger.error('Failed to analyze chunk relationships:', getErrorMessage(error));
            return [];
        }
    }
    // =============================================================================
    // PRIVATE ANALYSIS METHODS
    // =============================================================================
    async analyzeQualityWithOpenAI(documentPath, content) {
        try {
            const prompt = `Analyze the quality of this documentation:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide:
1. Overall quality score (0-1)
2. Key insights about content quality
3. Specific suggestions for improvement
4. Confidence level in your analysis

Format your response as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            // Parse AI response
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'quality',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI analysis failed:', getErrorMessage(error));
            return this.analyzeQualityLocally(documentPath, content);
        }
    }
    async analyzeQualityLocally(documentPath, content) {
        const insights = [];
        const suggestions = [];
        let score = 0.5;
        // Basic quality metrics
        const wordCount = content.split(/\s+/).length;
        const hasHeaders = /^#+\s/m.test(content);
        const hasCodeBlocks = /```/.test(content);
        const hasLinks = /\[.*?\]\(.*?\)/.test(content);
        const hasTodos = /TODO|FIXME|XXX/i.test(content);
        // Calculate score based on content analysis
        if (wordCount > 100)
            score += 0.1;
        if (wordCount > 500)
            score += 0.1;
        if (hasHeaders)
            score += 0.2;
        if (hasCodeBlocks)
            score += 0.1;
        if (hasLinks)
            score += 0.1;
        if (!hasTodos)
            score += 0.1;
        // Generate insights
        insights.push(`Document length: ${wordCount} words`);
        if (hasHeaders)
            insights.push('Well-structured with headers');
        if (hasCodeBlocks)
            insights.push('Contains technical examples');
        if (hasTodos)
            insights.push('Has pending work items');
        // Generate suggestions
        if (wordCount < 100)
            suggestions.push('Consider adding more detailed content');
        if (!hasHeaders)
            suggestions.push('Add headers for better structure');
        if (hasTodos)
            suggestions.push('Complete pending TODO items');
        return {
            documentId: uuidv4(),
            analysisType: 'quality',
            score: Math.min(score, 1.0),
            insights,
            suggestions,
            confidence: 0.6,
            analyzedAt: new Date().toISOString()
        };
    }
    async calculateRelevanceWithOpenAI(documentPath, content, workContext) {
        try {
            const prompt = `Analyze the relevance of this documentation to the given work context:

Work Context: ${workContext}
Document Path: ${documentPath}
Content: ${content.substring(0, 3000)}...

Please provide:
1. Relevance score (0-1) - how relevant is this document to the work context
2. Key insights about the relevance
3. Suggestions for improving relevance
4. Confidence in your analysis

Format as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'relevance',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI relevance analysis failed:', getErrorMessage(error));
            return this.calculateRelevanceLocally(documentPath, content, workContext);
        }
    }
    async calculateRelevanceLocally(documentPath, content, workContext) {
        const insights = [];
        const suggestions = [];
        // Simple keyword matching for relevance
        const workKeywords = workContext.toLowerCase().split(/\s+/);
        const contentLower = content.toLowerCase();
        let matchCount = 0;
        const relevantKeywords = [];
        for (const keyword of workKeywords) {
            if (keyword.length > 3 && contentLower.includes(keyword)) {
                matchCount++;
                relevantKeywords.push(keyword);
            }
        }
        const relevanceScore = Math.min(matchCount / Math.max(workKeywords.length, 1), 1.0);
        insights.push(`Found ${matchCount} relevant keywords out of ${workKeywords.length}`);
        if (relevantKeywords.length > 0) {
            insights.push(`Relevant terms: ${relevantKeywords.join(', ')}`);
        }
        if (relevanceScore < 0.3) {
            suggestions.push('Consider adding more context related to the work being done');
            suggestions.push('Include specific examples or use cases');
        }
        return {
            documentId: uuidv4(),
            analysisType: 'relevance',
            score: relevanceScore,
            insights,
            suggestions,
            confidence: 0.6,
            analyzedAt: new Date().toISOString()
        };
    }
    async detectDuplicatesWithOpenAI(documentPath, content) {
        try {
            const prompt = `Analyze this document for duplicate content and patterns:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide:
1. Duplicate content score (0-1)
2. Key insights about duplicate patterns
3. Suggestions for removing duplicates
4. Confidence level in your analysis

Format your response as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'duplicate',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI duplicate analysis failed:', getErrorMessage(error));
            return this.detectDuplicatesLocally(documentPath, content);
        }
    }
    async detectDuplicatesLocally(documentPath, content) {
        const duplicateScore = await this.calculateDuplicateScore(content);
        const insights = await this.generateDuplicateInsights(content, duplicateScore);
        return {
            documentId: uuidv4(),
            analysisType: 'duplicate',
            score: duplicateScore,
            insights,
            suggestions: this.generateDuplicateSuggestions(duplicateScore),
            confidence: 0.75,
            analyzedAt: new Date().toISOString()
        };
    }
    async calculateDuplicateScore(content) {
        // Simple duplicate detection based on repeated patterns
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const uniqueLines = new Set(lines);
        const duplicateRatio = 1 - (uniqueLines.size / lines.length);
        return Math.min(duplicateRatio * 2, 1.0); // Amplify the score
    }
    async generateDuplicateInsights(content, score) {
        const insights = [];
        if (score > 0.3) {
            insights.push('Document contains significant duplicate content');
        }
        else if (score > 0.1) {
            insights.push('Some repetitive content detected');
        }
        else {
            insights.push('Content appears to be unique');
        }
        // Look for repeated sections
        const repeatedPatterns = this.findRepeatedPatterns(content);
        if (repeatedPatterns.length > 0) {
            insights.push(`Found ${repeatedPatterns.length} repeated patterns`);
        }
        return insights;
    }
    generateDuplicateSuggestions(score) {
        const suggestions = [];
        if (score > 0.3) {
            suggestions.push('Remove or consolidate duplicate sections');
            suggestions.push('Consider using references instead of repeating content');
        }
        else if (score > 0.1) {
            suggestions.push('Review for unnecessary repetition');
        }
        return suggestions;
    }
    findRepeatedPatterns(content) {
        const patterns = [];
        const lines = content.split('\n');
        // Simple pattern detection - look for lines that appear more than once
        const lineCounts = new Map();
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10) { // Only consider substantial lines
                lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
            }
        }
        for (const [line, count] of lineCounts) {
            if (count > 1) {
                patterns.push(`"${line.substring(0, 50)}..." (${count} times)`);
            }
        }
        return patterns.slice(0, 5); // Return top 5 patterns
    }
    async generateInsightsWithOpenAI(documentPath, content) {
        try {
            const prompt = `Generate insights about this document:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide detailed insights about:
1. Document structure and organization
2. Content quality and completeness
3. Technical elements and patterns
4. Areas for improvement

Format your response as JSON with an 'insights' array of strings.`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'];
        }
        catch (error) {
            this.logger.error('OpenAI insights failed:', getErrorMessage(error));
            return this.generateInsightsLocally(documentPath, content);
        }
    }
    async generateInsightsLocally(documentPath, content) {
        const insights = [];
        // Basic content analysis
        const wordCount = content.split(/\s+/).length;
        const lineCount = content.split('\n').length;
        const hasCodeBlocks = /```/.test(content);
        const hasImages = /!\[.*?\]\(.*?\)/.test(content);
        const hasLinks = /\[.*?\]\(.*?\)/.test(content);
        insights.push(`Document contains ${wordCount} words and ${lineCount} lines`);
        if (hasCodeBlocks) {
            insights.push('Contains code examples or technical snippets');
        }
        if (hasImages) {
            insights.push('Includes visual elements (images/diagrams)');
        }
        if (hasLinks) {
            insights.push('Contains references to external resources');
        }
        // Content structure analysis
        const headerCount = (content.match(/^#+\s/gm) || []).length;
        if (headerCount > 0) {
            insights.push(`Well-structured with ${headerCount} headers`);
        }
        // Language and style analysis
        if (content.includes('TODO') || content.includes('FIXME')) {
            insights.push('Contains pending work items (TODO/FIXME)');
        }
        return insights;
    }
    async readDocumentContent(documentPath) {
        try {
            const content = await fs.readFile(documentPath, 'utf-8');
            return content;
        }
        catch (error) {
            this.logger.error(`Failed to read document ${documentPath}:`, getErrorMessage(error));
            throw new Error(`Cannot read document: ${getErrorMessage(error)}`);
        }
    }
    createFallbackAnalysis(documentPath, analysisType, errorMessage) {
        return {
            documentId: uuidv4(),
            analysisType: analysisType,
            score: 0.5,
            insights: [`Analysis failed: ${errorMessage}`, 'Using fallback analysis'],
            suggestions: ['Fix the underlying issue and retry analysis'],
            confidence: 0.1,
            analyzedAt: new Date().toISOString()
        };
    }
    // =============================================================================
    // PRIVATE AI ENHANCEMENT METHODS
    // =============================================================================
    /**
     * Generate random embedding vector for fallback
     */
    generateRandomEmbedding(dimension) {
        return new Array(dimension).fill(0).map(() => Math.random() * 2 - 1); // Random values between -1 and 1
    }
    /**
     * Clear embedding cache (Redis-based)
     */
    async clearEmbeddingCache() {
        try {
            const result = await this.cacheService.flush(this.CACHE_NAMESPACE);
            this.logger.info('Embedding cache cleared from Redis');
            return result;
        }
        catch (error) {
            this.logger.error('Failed to clear embedding cache:', getErrorMessage(error));
            return false;
        }
    }
    /**
     * Generate content hash for caching
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
     * AI-powered chunk quality assessment with OpenAI
     */
    async assessChunkQualityWithOpenAI(content, context) {
        try {
            const contextStr = context ? `\nDocument Type: ${context.documentType || 'Unknown'}\nExpected Topics: ${context.expectedTopics?.join(', ') || 'None specified'}` : '';
            const prompt = `Analyze the quality of this content chunk and provide a detailed assessment:${contextStr}

Content: ${content.substring(0, 3000)}...

Provide analysis in JSON format with:
1. qualityScore (0-1): Overall quality assessment
2. qualityMetrics: Object with specific metric scores (0-1) for:
   - clarity: How clear and understandable the content is
   - completeness: How complete the information appears
   - relevance: How relevant to the topic/context
   - coherence: How well the content flows and makes sense
   - technical_accuracy: Technical correctness (if applicable)
3. suggestions: Array of specific improvement recommendations
4. confidence: Your confidence in this assessment (0-1)

Format as valid JSON only.`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1200,
                temperature: 0.2
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return {
                qualityScore: Math.max(0, Math.min(1, parsed.qualityScore || 0.5)),
                qualityMetrics: parsed.qualityMetrics || {},
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7))
            };
        }
        catch (error) {
            this.logger.error('OpenAI quality assessment failed:', getErrorMessage(error));
            return this.assessChunkQualityLocally(content, context);
        }
    }
    /**
     * Local chunk quality assessment
     */
    async assessChunkQualityLocally(content, context) {
        const metrics = {};
        const suggestions = [];
        // Basic quality metrics
        const wordCount = content.split(/\s+/).length;
        const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
        // Clarity metric (based on sentence structure)
        metrics.clarity = Math.min(1, Math.max(0, 1 - (avgWordsPerSentence - 15) / 20));
        if (avgWordsPerSentence > 25) {
            suggestions.push('Consider breaking down long sentences for better clarity');
        }
        // Completeness metric (based on content length and structure)
        metrics.completeness = Math.min(1, wordCount / 100); // Assume 100 words as baseline
        if (wordCount < 50) {
            suggestions.push('Content appears brief, consider adding more detail');
        }
        // Coherence metric (basic text analysis)
        const hasGoodStructure = /^[A-Z]/.test(content.trim()) && content.includes('.');
        metrics.coherence = hasGoodStructure ? 0.7 : 0.4;
        if (!hasGoodStructure) {
            suggestions.push('Improve text structure with proper capitalization and punctuation');
        }
        // Relevance (keyword matching if context provided)
        if (context?.expectedTopics && context.expectedTopics.length > 0) {
            const contentLower = content.toLowerCase();
            const matchingTopics = context.expectedTopics.filter(topic => contentLower.includes(topic.toLowerCase()));
            metrics.relevance = matchingTopics.length / context.expectedTopics.length;
        }
        else {
            metrics.relevance = 0.6; // Neutral score without context
        }
        // Technical accuracy (placeholder)
        metrics.technical_accuracy = 0.6; // Default neutral score
        // Calculate overall quality score
        const qualityScore = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
        return {
            qualityScore,
            qualityMetrics: metrics,
            suggestions,
            confidence: 0.6 // Lower confidence for local analysis
        };
    }
    /**
     * Detect topics with OpenAI
     */
    async detectTopicsWithOpenAI(content, maxTopics) {
        try {
            const prompt = `Analyze this content and identify the main topics discussed. Extract up to ${maxTopics} topics.

Content: ${content.substring(0, 4000)}...

Provide response as JSON array with format:
[{
  "topic": "Topic name",
  "confidence": 0.85,
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]

Only return valid JSON array.`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            });
            const aiResponse = response.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const topics = JSON.parse(aiResponse);
            return Array.isArray(topics) ? topics.slice(0, maxTopics) : [];
        }
        catch (error) {
            this.logger.error('OpenAI topic detection failed:', getErrorMessage(error));
            return this.detectTopicsLocally(content, maxTopics);
        }
    }
    /**
     * Detect topics locally using keyword analysis
     */
    async detectTopicsLocally(content, maxTopics) {
        const topics = [];
        // Simple keyword-based topic detection
        const words = content.toLowerCase()
            .replace(/[^a-z\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        const wordFreq = new Map();
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        // Get most frequent words as topics
        const sortedWords = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTopics);
        for (const [word, frequency] of sortedWords) {
            const confidence = Math.min(1, frequency / words.length * 10);
            if (confidence > 0.1) {
                topics.push({
                    topic: word,
                    confidence,
                    keywords: [word]
                });
            }
        }
        return topics;
    }
    /**
     * Determine relationship type between two content pieces
     */
    async determineRelationshipType(sourceContent, targetContent) {
        // Simple heuristic-based relationship detection
        const sourceLower = sourceContent.toLowerCase();
        const targetLower = targetContent.toLowerCase();
        // Check for explicit references
        if (targetLower.includes('see ') || targetLower.includes('refer to') || targetLower.includes('as mentioned')) {
            return 'reference';
        }
        // Check for examples
        if (targetLower.includes('for example') || targetLower.includes('such as') || targetLower.includes('e.g.')) {
            return 'example';
        }
        // Check for elaboration
        if (targetLower.includes('furthermore') || targetLower.includes('additionally') || targetLower.includes('moreover')) {
            return 'elaboration';
        }
        // Check for contradiction
        if (targetLower.includes('however') || targetLower.includes('but') || targetLower.includes('contrary')) {
            return 'contradiction';
        }
        // Check for summary patterns
        if (targetLower.includes('in summary') || targetLower.includes('to conclude') || targetLower.includes('overall')) {
            return 'summary';
        }
        // Default to semantic similarity
        return 'semantic_similarity';
    }
    /**
     * Get cache statistics from Redis
     */
    async getCacheStatistics() {
        try {
            const metrics = this.cacheService.getMetrics();
            return {
                keyCount: metrics.keyCount,
                memoryUsage: metrics.memoryUsage,
                hitRate: metrics.hitRate,
                totalOperations: metrics.totalOperations
            };
        }
        catch (error) {
            this.logger.error('Failed to get cache statistics:', getErrorMessage(error));
            return {
                keyCount: 0,
                memoryUsage: 0,
                hitRate: 0,
                totalOperations: 0
            };
        }
    }
    /**
     * Invalidate embeddings cache by model or content pattern
     */
    async invalidateEmbeddings(pattern) {
        try {
            if (pattern) {
                return await this.cacheService.invalidateByPattern(`${this.CACHE_NAMESPACE}:*${pattern}*`);
            }
            else {
                // Invalidate by tag
                return await this.cacheService.invalidateByTag('embeddings');
            }
        }
        catch (error) {
            this.logger.error('Failed to invalidate embeddings cache:', getErrorMessage(error));
            return 0;
        }
    }
    /**
     * Health check for cache service
     */
    async isCacheHealthy() {
        try {
            const testKey = `health_check_${Date.now()}`;
            const testValue = [1, 2, 3, 4, 5];
            // Test set and get operations
            const setResult = await this.cacheService.set(testKey, testValue, {
                ttl: 10, // 10 seconds
                namespace: this.CACHE_NAMESPACE
            });
            if (!setResult) {
                return false;
            }
            const getValue = await this.cacheService.get(testKey);
            const isHealthy = getValue !== null && JSON.stringify(getValue) === JSON.stringify(testValue);
            // Clean up test key
            await this.cacheService.delete(testKey, this.CACHE_NAMESPACE);
            return isHealthy;
        }
        catch (error) {
            this.logger.error('Cache health check failed:', getErrorMessage(error));
            return false;
        }
    }
}
//# sourceMappingURL=AIAnalysisService.js.map