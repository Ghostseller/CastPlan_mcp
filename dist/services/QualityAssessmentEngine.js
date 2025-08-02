import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// QUALITY ASSESSMENT ENGINE IMPLEMENTATION
// =============================================================================
export class QualityAssessmentEngine {
    logger;
    aiAnalysisService;
    semanticChunkingService;
    documentVersionService;
    initialized = false;
    // Default quality dimension weights
    DEFAULT_WEIGHTS = {
        clarity: 0.20, // 20% - Readability and understanding
        completeness: 0.18, // 18% - Information completeness
        accuracy: 0.22, // 22% - Technical correctness (highest weight)
        relevance: 0.15, // 15% - Topic relevance
        consistency: 0.15, // 15% - Internal consistency
        structure: 0.10 // 10% - Organization and formatting
    };
    // Quality thresholds for categorization
    QUALITY_THRESHOLDS = {
        excellent: 0.8,
        good: 0.6,
        average: 0.4,
        poor: 0.2
    };
    constructor(logger, aiAnalysisService, semanticChunkingService, documentVersionService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticChunkingService = semanticChunkingService;
        this.documentVersionService = documentVersionService;
    }
    /**
     * Initialize the Quality Assessment Engine
     */
    async initialize() {
        try {
            this.logger.info('Initializing Quality Assessment Engine...');
            // Verify dependencies are initialized
            // The services should already be initialized by the calling code
            this.initialized = true;
            this.logger.info('Quality Assessment Engine initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Quality Assessment Engine:', error);
            throw error;
        }
    }
    /**
     * Assess document quality with 6-dimension scoring
     */
    async assessDocumentQuality(documentId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting quality assessment for document: ${documentId}`);
            // Get document chunks for analysis
            const chunks = await this.semanticChunkingService.getChunksByDocument(documentId);
            if (chunks.length === 0) {
                throw new Error(`No chunks found for document: ${documentId}`);
            }
            // Combine all chunk content for document-level analysis
            const documentContent = chunks.map(chunk => chunk.content).join('\n\n');
            const contentLength = documentContent.length;
            // Get contextual information
            const documentContext = await this.buildDocumentContext(documentId, chunks, options);
            // Perform AI-powered quality assessment
            const aiAssessment = await this.performAIQualityAssessment(documentContent, documentContext, options);
            // Calculate dimension scores with local analysis enhancement
            const dimensions = await this.calculateQualityDimensions(documentContent, chunks, aiAssessment, documentContext, options);
            // Calculate weighted overall score
            const weights = { ...this.DEFAULT_WEIGHTS, ...options.weights };
            const overallScore = this.calculateWeightedScore(dimensions, weights);
            // Build comprehensive assessment
            const assessment = {
                id: uuidv4(),
                entityId: documentId,
                entityType: 'document',
                dimensions,
                overallScore,
                confidence: aiAssessment.confidence,
                assessment: {
                    strengths: aiAssessment.strengths || [],
                    weaknesses: aiAssessment.weaknesses || [],
                    criticalIssues: aiAssessment.criticalIssues || [],
                    suggestions: aiAssessment.suggestions || []
                },
                metadata: {
                    analysisDate: new Date().toISOString(),
                    aiProvider: 'openai', // Could be made configurable
                    processingTime: Date.now() - startTime,
                    contentLength,
                    version: documentContext.version
                },
                createdAt: new Date().toISOString()
            };
            this.logger.info(`Quality assessment completed for document ${documentId}: ${overallScore.toFixed(3)}`);
            return assessment;
        }
        catch (error) {
            this.logger.error('Failed to assess document quality:', error);
            throw error;
        }
    }
    /**
     * Assess chunk quality with 6-dimension scoring
     */
    async assessChunkQuality(chunkId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting quality assessment for chunk: ${chunkId}`);
            // Get chunk data
            const chunk = await this.semanticChunkingService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Build chunk context
            const chunkContext = await this.buildChunkContext(chunk, options);
            // Perform AI-powered quality assessment
            const aiAssessment = await this.performAIQualityAssessment(chunk.content, chunkContext, options);
            // Calculate dimension scores
            const dimensions = await this.calculateChunkQualityDimensions(chunk, aiAssessment, chunkContext, options);
            // Calculate weighted overall score
            const weights = { ...this.DEFAULT_WEIGHTS, ...options.weights };
            const overallScore = this.calculateWeightedScore(dimensions, weights);
            // Build assessment
            const assessment = {
                id: uuidv4(),
                entityId: chunkId,
                entityType: 'chunk',
                dimensions,
                overallScore,
                confidence: aiAssessment.confidence,
                assessment: {
                    strengths: aiAssessment.strengths || [],
                    weaknesses: aiAssessment.weaknesses || [],
                    criticalIssues: aiAssessment.criticalIssues || [],
                    suggestions: aiAssessment.suggestions || []
                },
                metadata: {
                    analysisDate: new Date().toISOString(),
                    aiProvider: 'openai',
                    processingTime: Date.now() - startTime,
                    contentLength: chunk.content.length
                },
                createdAt: new Date().toISOString()
            };
            this.logger.info(`Quality assessment completed for chunk ${chunkId}: ${overallScore.toFixed(3)}`);
            return assessment;
        }
        catch (error) {
            this.logger.error('Failed to assess chunk quality:', error);
            throw error;
        }
    }
    /**
     * Batch quality assessment for multiple documents
     */
    async assessBatchQuality(entityIds, entityType, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting batch quality assessment for ${entityIds.length} ${entityType}s`);
            const batchAssessment = {
                id: uuidv4(),
                totalItems: entityIds.length,
                completedItems: 0,
                assessments: [],
                overallQuality: {
                    averageScore: 0,
                    dimensionAverages: {
                        clarity: 0,
                        completeness: 0,
                        accuracy: 0,
                        relevance: 0,
                        consistency: 0,
                        structure: 0
                    },
                    distribution: {
                        excellent: 0,
                        good: 0,
                        average: 0,
                        poor: 0,
                        critical: 0
                    }
                },
                startedAt: new Date().toISOString()
            };
            // Process in batches to avoid overwhelming the system
            const batchSize = 3;
            for (let i = 0; i < entityIds.length; i += batchSize) {
                const batch = entityIds.slice(i, i + batchSize);
                const batchPromises = batch.map(async (entityId) => {
                    try {
                        if (entityType === 'document') {
                            return await this.assessDocumentQuality(entityId, options);
                        }
                        else {
                            return await this.assessChunkQuality(entityId, options);
                        }
                    }
                    catch (error) {
                        this.logger.warn(`Failed to assess ${entityType} ${entityId}:`, error);
                        return null;
                    }
                });
                const batchResults = await Promise.allSettled(batchPromises);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        batchAssessment.assessments.push(result.value);
                        batchAssessment.completedItems++;
                    }
                }
                // Add small delay between batches
                if (i + batchSize < entityIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            // Calculate overall statistics
            if (batchAssessment.assessments.length > 0) {
                batchAssessment.overallQuality = this.calculateBatchStatistics(batchAssessment.assessments);
            }
            batchAssessment.completedAt = new Date().toISOString();
            this.logger.info(`Batch quality assessment completed: ${batchAssessment.completedItems}/${batchAssessment.totalItems} items processed`);
            return batchAssessment;
        }
        catch (error) {
            this.logger.error('Failed to perform batch quality assessment:', error);
            throw error;
        }
    }
    /**
     * Compare quality between versions
     */
    async compareQualityAcrossVersions(documentId, version1Id, version2Id) {
        try {
            this.ensureInitialized();
            if (!this.documentVersionService) {
                throw new Error('DocumentVersionService required for version comparison');
            }
            this.logger.info(`Comparing quality between versions ${version1Id} and ${version2Id}`);
            // Note: In a full implementation, we would load document content from specific versions
            // For now, we'll perform assessments and create a comparison structure
            const [assessment1, assessment2] = await Promise.all([
                this.assessDocumentQuality(documentId, { versionComparison: version1Id }),
                this.assessDocumentQuality(documentId, { versionComparison: version2Id })
            ]);
            // Calculate changes
            const overallChange = assessment2.overallScore - assessment1.overallScore;
            const dimensionChanges = {
                clarity: assessment2.dimensions.clarity - assessment1.dimensions.clarity,
                completeness: assessment2.dimensions.completeness - assessment1.dimensions.completeness,
                accuracy: assessment2.dimensions.accuracy - assessment1.dimensions.accuracy,
                relevance: assessment2.dimensions.relevance - assessment1.dimensions.relevance,
                consistency: assessment2.dimensions.consistency - assessment1.dimensions.consistency,
                structure: assessment2.dimensions.structure - assessment1.dimensions.structure
            };
            // Identify improved and degraded aspects
            const improvedAspects = [];
            const degradedAspects = [];
            Object.entries(dimensionChanges).forEach(([dimension, change]) => {
                if (change > 0.05) {
                    improvedAspects.push(`${dimension}: +${(change * 100).toFixed(1)}%`);
                }
                else if (change < -0.05) {
                    degradedAspects.push(`${dimension}: ${(change * 100).toFixed(1)}%`);
                }
            });
            // Generate recommendations
            const recommendations = [];
            if (overallChange < 0) {
                recommendations.push('Overall quality has decreased - review recent changes');
            }
            if (dimensionChanges.accuracy < -0.1) {
                recommendations.push('Accuracy has significantly decreased - verify technical content');
            }
            if (dimensionChanges.clarity < -0.1) {
                recommendations.push('Clarity has decreased - review language and structure');
            }
            return {
                version1Assessment: assessment1,
                version2Assessment: assessment2,
                comparison: {
                    overallChange,
                    dimensionChanges,
                    improvedAspects,
                    degradedAspects,
                    recommendations
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to compare quality across versions:', error);
            throw error;
        }
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Perform AI-powered quality assessment
     */
    async performAIQualityAssessment(content, context, options) {
        try {
            if (options.includeAIInsights !== false) {
                // Use existing AI analysis capability
                const aiAssessment = await this.aiAnalysisService.assessChunkQuality(content, {
                    documentType: options.documentType,
                    expectedTopics: options.expectedTopics
                });
                // Enhance with additional analysis
                const enhancedAssessment = await this.enhanceAIAssessment(aiAssessment, content, context);
                return enhancedAssessment;
            }
            else {
                // Fallback to local analysis
                return await this.performLocalQualityAssessment(content, context);
            }
        }
        catch (error) {
            this.logger.warn('AI assessment failed, falling back to local analysis:', error);
            return await this.performLocalQualityAssessment(content, context);
        }
    }
    /**
     * Enhance AI assessment with additional analysis
     */
    async enhanceAIAssessment(baseAssessment, content, context) {
        const strengths = [];
        const weaknesses = [];
        const criticalIssues = [];
        // Analyze content characteristics
        const wordCount = content.split(/\s+/).length;
        const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const hasCodeExamples = /```/.test(content);
        const hasHeaders = /^#+\s/m.test(content);
        const hasLinks = /\[.*?\]\(.*?\)/.test(content);
        // Identify strengths
        if (wordCount > 500)
            strengths.push('Comprehensive content with good detail');
        if (hasHeaders)
            strengths.push('Well-structured with clear headings');
        if (hasCodeExamples)
            strengths.push('Includes practical code examples');
        if (hasLinks)
            strengths.push('Contains relevant external references');
        // Identify weaknesses
        if (wordCount < 100)
            weaknesses.push('Content appears too brief');
        if (sentenceCount > 0 && wordCount / sentenceCount > 30)
            weaknesses.push('Sentences may be too long');
        if (!hasHeaders && wordCount > 300)
            weaknesses.push('Lacks structural organization');
        // Identify critical issues
        if (content.includes('TODO') || content.includes('FIXME')) {
            criticalIssues.push('Contains unfinished sections (TODO/FIXME)');
        }
        if (wordCount < 50) {
            criticalIssues.push('Content is critically short');
        }
        return {
            qualityScore: baseAssessment.qualityScore,
            qualityMetrics: baseAssessment.qualityMetrics,
            suggestions: baseAssessment.suggestions,
            confidence: baseAssessment.confidence,
            strengths,
            weaknesses,
            criticalIssues
        };
    }
    /**
     * Perform local quality assessment without AI
     */
    async performLocalQualityAssessment(content, context) {
        const metrics = {};
        const suggestions = [];
        const strengths = [];
        const weaknesses = [];
        const criticalIssues = [];
        // Basic content analysis
        const wordCount = content.split(/\s+/).length;
        const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
        // Calculate basic metrics
        metrics.wordCount = Math.min(1, wordCount / 500); // Normalize against 500 words
        metrics.readability = Math.min(1, Math.max(0, 1 - (avgWordsPerSentence - 15) / 20));
        metrics.structure = /^#+\s/m.test(content) ? 0.8 : 0.4;
        metrics.completeness = Math.min(1, wordCount / 200);
        const qualityScore = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
        // Generate suggestions
        if (wordCount < 100)
            suggestions.push('Consider adding more detailed content');
        if (avgWordsPerSentence > 25)
            suggestions.push('Break down long sentences for better readability');
        if (!metrics.structure)
            suggestions.push('Add headers for better organization');
        return {
            qualityScore,
            qualityMetrics: metrics,
            suggestions,
            confidence: 0.6, // Lower confidence for local analysis
            strengths,
            weaknesses,
            criticalIssues
        };
    }
    /**
     * Calculate quality dimensions for document
     */
    async calculateQualityDimensions(content, chunks, aiAssessment, context, options) {
        const dimensions = {
            clarity: 0,
            completeness: 0,
            accuracy: 0,
            relevance: 0,
            consistency: 0,
            structure: 0
        };
        // Use AI metrics if available, otherwise calculate locally
        if (aiAssessment.qualityMetrics) {
            dimensions.clarity = aiAssessment.qualityMetrics.clarity || this.calculateClarityScore(content);
            dimensions.completeness = aiAssessment.qualityMetrics.completeness || this.calculateCompletenessScore(content, chunks);
            dimensions.accuracy = aiAssessment.qualityMetrics.technical_accuracy || this.calculateAccuracyScore(content);
            dimensions.relevance = aiAssessment.qualityMetrics.relevance || this.calculateRelevanceScore(content, options);
            dimensions.consistency = aiAssessment.qualityMetrics.coherence || this.calculateConsistencyScore(content, chunks);
            dimensions.structure = this.calculateStructureScore(content, chunks);
        }
        else {
            dimensions.clarity = this.calculateClarityScore(content);
            dimensions.completeness = this.calculateCompletenessScore(content, chunks);
            dimensions.accuracy = this.calculateAccuracyScore(content);
            dimensions.relevance = this.calculateRelevanceScore(content, options);
            dimensions.consistency = this.calculateConsistencyScore(content, chunks);
            dimensions.structure = this.calculateStructureScore(content, chunks);
        }
        return dimensions;
    }
    /**
     * Calculate quality dimensions for chunk
     */
    async calculateChunkQualityDimensions(chunk, aiAssessment, context, options) {
        return {
            clarity: aiAssessment.qualityMetrics?.clarity || this.calculateClarityScore(chunk.content),
            completeness: aiAssessment.qualityMetrics?.completeness || this.calculateChunkCompletenessScore(chunk),
            accuracy: aiAssessment.qualityMetrics?.technical_accuracy || this.calculateAccuracyScore(chunk.content),
            relevance: aiAssessment.qualityMetrics?.relevance || this.calculateRelevanceScore(chunk.content, options),
            consistency: aiAssessment.qualityMetrics?.coherence || this.calculateChunkConsistencyScore(chunk),
            structure: this.calculateChunkStructureScore(chunk)
        };
    }
    /**
     * Calculate clarity score based on readability
     */
    calculateClarityScore(content) {
        const wordCount = content.split(/\s+/).length;
        const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
        // Optimal sentence length is around 15-20 words
        const readabilityScore = Math.min(1, Math.max(0, 1 - Math.abs(avgWordsPerSentence - 17.5) / 15));
        // Check for passive voice, complex words, etc.
        const passiveVoice = (content.match(/\b(was|were|been|being)\s+\w+ed\b/g) || []).length;
        const passivePenalty = Math.min(0.3, passiveVoice / sentenceCount);
        return Math.max(0, readabilityScore - passivePenalty);
    }
    /**
     * Calculate completeness score
     */
    calculateCompletenessScore(content, chunks) {
        const wordCount = content.split(/\s+/).length;
        const chunkCount = chunks.length;
        // Base completeness on content length and structure
        let completeness = Math.min(1, wordCount / 1000); // 1000 words as baseline
        // Check for incomplete sections
        if (content.includes('TODO') || content.includes('TBD') || content.includes('...')) {
            completeness *= 0.7;
        }
        // Check for good chunk distribution
        if (chunkCount > 3) {
            completeness += 0.1;
        }
        return Math.min(1, completeness);
    }
    calculateChunkCompletenessScore(chunk) {
        const wordCount = chunk.content.split(/\s+/).length;
        let completeness = Math.min(1, wordCount / 100); // 100 words baseline for chunks
        if (chunk.content.includes('TODO') || chunk.content.includes('TBD')) {
            completeness *= 0.5;
        }
        return completeness;
    }
    /**
     * Calculate accuracy score
     */
    calculateAccuracyScore(content) {
        // Simple heuristics for technical accuracy
        let accuracy = 0.7; // Base score
        // Check for code examples
        if (/```[\s\S]*?```/.test(content)) {
            accuracy += 0.1;
        }
        // Check for specific technical terms
        if (/\b(API|HTTP|JSON|XML|SQL|REST|GraphQL)\b/i.test(content)) {
            accuracy += 0.1;
        }
        // Penalize uncertain language
        if (/\b(maybe|perhaps|probably|might be)\b/i.test(content)) {
            accuracy -= 0.1;
        }
        return Math.min(1, Math.max(0, accuracy));
    }
    /**
     * Calculate relevance score
     */
    calculateRelevanceScore(content, options) {
        if (!options.expectedTopics || options.expectedTopics.length === 0) {
            return 0.6; // Neutral score without context
        }
        const contentLower = content.toLowerCase();
        const matchingTopics = options.expectedTopics.filter(topic => contentLower.includes(topic.toLowerCase()));
        return matchingTopics.length / options.expectedTopics.length;
    }
    /**
     * Calculate consistency score
     */
    calculateConsistencyScore(content, chunks) {
        // Check for consistent terminology usage
        const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const wordFreq = new Map();
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        // Look for consistent key terms
        const keyTerms = Array.from(wordFreq.entries())
            .filter(([_, count]) => count > 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        // Higher consistency if key terms are used consistently across chunks
        let consistency = 0.6;
        if (keyTerms.length > 0 && chunks.length > 1) {
            let consistentUsage = 0;
            keyTerms.forEach(([term, _]) => {
                const chunksWithTerm = chunks.filter(chunk => chunk.content.toLowerCase().includes(term)).length;
                consistentUsage += chunksWithTerm / chunks.length;
            });
            consistency = consistentUsage / keyTerms.length;
        }
        return Math.min(1, consistency);
    }
    calculateChunkConsistencyScore(chunk) {
        // For chunks, check internal consistency
        const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length < 2)
            return 0.8; // Short chunks are generally consistent
        // Simple consistency check - similar sentence structures
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        const variance = sentences.reduce((sum, s) => sum + Math.pow(s.length - avgSentenceLength, 2), 0) / sentences.length;
        // Lower variance indicates more consistent sentence structure
        return Math.min(1, Math.max(0.3, 1 - variance / 1000));
    }
    /**
     * Calculate structure score
     */
    calculateStructureScore(content, chunks) {
        let structureScore = 0;
        // Check for headers
        const headers = content.match(/^#+\s/gm) || [];
        if (headers.length > 0)
            structureScore += 0.3;
        // Check for lists
        if (/^[\s]*[-*+]\s/gm.test(content) || /^[\s]*\d+\.\s/gm.test(content)) {
            structureScore += 0.2;
        }
        // Check for code blocks
        if (/```[\s\S]*?```/.test(content)) {
            structureScore += 0.2;
        }
        // Check for proper chunk distribution
        if (chunks.length > 1) {
            const avgChunkSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;
            const sizeVariance = chunks.reduce((sum, chunk) => sum + Math.pow(chunk.content.length - avgChunkSize, 2), 0) / chunks.length;
            // Good structure has balanced chunk sizes
            const balanceScore = Math.min(0.3, Math.max(0, 0.3 - sizeVariance / 10000));
            structureScore += balanceScore;
        }
        return Math.min(1, structureScore);
    }
    calculateChunkStructureScore(chunk) {
        let score = 0.5; // Base score
        // Check for good paragraph structure
        const paragraphs = chunk.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (paragraphs.length > 1)
            score += 0.2;
        // Check for headers within chunk
        if (/^#+\s/m.test(chunk.content))
            score += 0.2;
        // Check for proper sentence structure
        const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 1 && sentences.length < 10)
            score += 0.1;
        return Math.min(1, score);
    }
    /**
     * Calculate weighted overall score
     */
    calculateWeightedScore(dimensions, weights) {
        return (dimensions.clarity * weights.clarity +
            dimensions.completeness * weights.completeness +
            dimensions.accuracy * weights.accuracy +
            dimensions.relevance * weights.relevance +
            dimensions.consistency * weights.consistency +
            dimensions.structure * weights.structure);
    }
    /**
     * Build document context for analysis
     */
    async buildDocumentContext(documentId, chunks, options) {
        const context = {
            documentId,
            chunkCount: chunks.length,
            totalWords: chunks.reduce((sum, chunk) => sum + chunk.content.split(/\s+/).length, 0),
            documentType: options.documentType,
            expectedTopics: options.expectedTopics,
            version: options.versionComparison
        };
        // Add topic analysis if available
        if (chunks.length > 0) {
            try {
                const firstChunk = chunks[0];
                const topics = await this.semanticChunkingService.getTopicsByChunk(firstChunk.id);
                context.detectedTopics = topics.map(t => t.topicName);
            }
            catch (error) {
                this.logger.debug('Could not get topics for context:', error);
            }
        }
        return context;
    }
    /**
     * Build chunk context for analysis
     */
    async buildChunkContext(chunk, options) {
        const context = {
            chunkId: chunk.id,
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
            wordCount: chunk.content.split(/\s+/).length,
            qualityScore: chunk.qualityScore,
            documentType: options.documentType,
            expectedTopics: options.expectedTopics
        };
        // Add relationships if available
        try {
            const relationships = await this.semanticChunkingService.getRelationships(chunk.id);
            context.relationshipCount = relationships.length;
        }
        catch (error) {
            this.logger.debug('Could not get relationships for context:', error);
        }
        return context;
    }
    /**
     * Calculate batch statistics
     */
    calculateBatchStatistics(assessments) {
        const totalAssessments = assessments.length;
        // Calculate averages
        const totalScore = assessments.reduce((sum, a) => sum + a.overallScore, 0);
        const averageScore = totalScore / totalAssessments;
        const dimensionAverages = {
            clarity: assessments.reduce((sum, a) => sum + a.dimensions.clarity, 0) / totalAssessments,
            completeness: assessments.reduce((sum, a) => sum + a.dimensions.completeness, 0) / totalAssessments,
            accuracy: assessments.reduce((sum, a) => sum + a.dimensions.accuracy, 0) / totalAssessments,
            relevance: assessments.reduce((sum, a) => sum + a.dimensions.relevance, 0) / totalAssessments,
            consistency: assessments.reduce((sum, a) => sum + a.dimensions.consistency, 0) / totalAssessments,
            structure: assessments.reduce((sum, a) => sum + a.dimensions.structure, 0) / totalAssessments
        };
        // Calculate distribution
        const distribution = {
            excellent: assessments.filter(a => a.overallScore >= this.QUALITY_THRESHOLDS.excellent).length,
            good: assessments.filter(a => a.overallScore >= this.QUALITY_THRESHOLDS.good && a.overallScore < this.QUALITY_THRESHOLDS.excellent).length,
            average: assessments.filter(a => a.overallScore >= this.QUALITY_THRESHOLDS.average && a.overallScore < this.QUALITY_THRESHOLDS.good).length,
            poor: assessments.filter(a => a.overallScore >= this.QUALITY_THRESHOLDS.poor && a.overallScore < this.QUALITY_THRESHOLDS.average).length,
            critical: assessments.filter(a => a.overallScore < this.QUALITY_THRESHOLDS.poor).length
        };
        return {
            averageScore,
            dimensionAverages,
            distribution
        };
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('QualityAssessmentEngine not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Quality Assessment Engine...');
            this.initialized = false;
            this.logger.info('Quality Assessment Engine shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during Quality Assessment Engine shutdown:', error);
        }
    }
}
//# sourceMappingURL=QualityAssessmentEngine.js.map