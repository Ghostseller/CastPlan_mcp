/**
 * Semantic Chunking Strategy
 *
 * Implements semantic-based document chunking that considers meaning and context.
 * Uses AI analysis to understand semantic relationships and creates chunks
 * that maintain coherent topics and concepts.
 *
 * Phase 1 Week 3 Implementation - Semantic Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class SemanticChunkingStrategy {
    logger;
    aiAnalysisService;
    constructor(logger, aiAnalysisService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
    }
    /**
     * Chunk content using semantic analysis
     */
    async chunk(content, context) {
        try {
            const startTime = Date.now();
            this.logger.info('Starting semantic chunking...');
            const { config, structure, boundaries } = context;
            const chunks = [];
            // Filter boundaries to semantic and topic-based ones
            const semanticBoundaries = boundaries.filter(b => b.type === 'topic' ||
                (b.type === 'section' && b.confidence > 0.7) ||
                (b.type === 'context' && b.confidence > 0.6));
            // Sort boundaries by position
            semanticBoundaries.sort((a, b) => a.position - b.position);
            // Create chunks between boundaries
            let lastPosition = 0;
            let chunkIndex = 0;
            for (const boundary of semanticBoundaries) {
                if (boundary.position > lastPosition) {
                    const chunkContent = content.slice(lastPosition, boundary.position).trim();
                    if (chunkContent.length > 0) {
                        const chunk = await this.createSemanticChunk(chunkContent, lastPosition, boundary.position, chunkIndex++, config, structure);
                        chunks.push(chunk);
                    }
                    lastPosition = boundary.position;
                }
            }
            // Handle remaining content
            if (lastPosition < content.length) {
                const remainingContent = content.slice(lastPosition).trim();
                if (remainingContent.length > 0) {
                    const chunk = await this.createSemanticChunk(remainingContent, lastPosition, content.length, chunkIndex++, config, structure);
                    chunks.push(chunk);
                }
            }
            // If no semantic boundaries found, fall back to size-based chunking with semantic analysis
            if (chunks.length === 0) {
                return await this.fallbackSemanticChunking(content, context);
            }
            // Post-process chunks to ensure optimal size and quality
            const optimizedChunks = await this.optimizeChunks(chunks, config);
            const processingTime = Date.now() - startTime;
            this.logger.info(`Semantic chunking completed: ${optimizedChunks.length} chunks in ${processingTime}ms`);
            return optimizedChunks;
        }
        catch (error) {
            this.logger.error('Failed to perform semantic chunking:', error);
            throw error;
        }
    }
    /**
     * Create a semantic chunk with analysis
     */
    async createSemanticChunk(content, startPosition, endPosition, index, config, structure) {
        try {
            // Analyze chunk content for semantic properties
            const semanticAnalysis = await this.analyzeChunkSemantics(content);
            // Calculate quality score based on semantic coherence
            const qualityScore = await this.calculateSemanticQuality(content, semanticAnalysis);
            // Extract key concepts and topics
            const topics = await this.extractTopics(content);
            const concepts = await this.extractKeyConcepts(content);
            return {
                content,
                type: 'semantic',
                startPosition,
                endPosition,
                qualityScore,
                qualityMetrics: {
                    coherenceScore: semanticAnalysis.coherence,
                    topicConsistency: semanticAnalysis.topicConsistency,
                    conceptDensity: concepts.length / this.estimateTokenCount(content),
                    semanticComplexity: semanticAnalysis.complexity
                },
                metadata: {
                    chunkIndex: index,
                    strategy: 'semantic',
                    topics,
                    concepts,
                    semanticAnalysis,
                    processingTime: Date.now()
                }
            };
        }
        catch (error) {
            this.logger.warn('Error creating semantic chunk:', error);
            // Fallback to basic chunk
            return {
                content,
                type: 'semantic',
                startPosition,
                endPosition,
                qualityScore: 0.5,
                qualityMetrics: {
                    coherenceScore: 0.5,
                    topicConsistency: 0.5,
                    conceptDensity: 0.5,
                    semanticComplexity: 0.5
                },
                metadata: {
                    chunkIndex: index,
                    strategy: 'semantic',
                    error: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    /**
     * Analyze semantic properties of chunk content
     */
    async analyzeChunkSemantics(content) {
        try {
            // Use AI analysis service for semantic analysis (placeholder)
            // const analysis = await this.aiAnalysisService.analyzeContent(content, 'semantic-analysis');
            const analysis = { semanticMetrics: {} }; // Placeholder for now
            // Extract semantic metrics (placeholder implementation)
            const words = content.toLowerCase().split(/\s+/);
            const uniqueWords = new Set(words);
            const sentences = content.split(/[.!?]+/).filter(s => s.trim());
            // Calculate basic semantic metrics
            const coherence = this.calculateCoherence(sentences);
            const topicConsistency = this.calculateTopicConsistency(words);
            const complexity = uniqueWords.size / words.length;
            const keyTerms = this.extractKeyTerms(content);
            return {
                coherence,
                topicConsistency,
                complexity,
                keyTerms
            };
        }
        catch (error) {
            this.logger.warn('Error analyzing chunk semantics:', error);
            // Return default values
            return {
                coherence: 0.5,
                topicConsistency: 0.5,
                complexity: 0.5,
                keyTerms: []
            };
        }
    }
    /**
     * Calculate semantic quality score
     */
    async calculateSemanticQuality(content, semanticAnalysis) {
        try {
            // Weighted combination of semantic factors
            const weights = {
                coherence: 0.3,
                topicConsistency: 0.3,
                complexity: 0.2,
                length: 0.2
            };
            // Normalize length score (optimal around 500-1000 characters)
            const lengthScore = Math.min(1.0, Math.max(0.1, content.length / 1000));
            const qualityScore = (semanticAnalysis.coherence * weights.coherence) +
                (semanticAnalysis.topicConsistency * weights.topicConsistency) +
                (semanticAnalysis.complexity * weights.complexity) +
                (lengthScore * weights.length);
            return Math.min(1.0, Math.max(0.0, qualityScore));
        }
        catch (error) {
            this.logger.warn('Error calculating semantic quality:', error);
            return 0.5;
        }
    }
    /**
     * Extract topics from content
     */
    async extractTopics(content) {
        try {
            // Simple topic extraction based on frequent meaningful words
            const words = content.toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3)
                .filter(word => !/^(the|and|or|but|in|on|at|to|for|of|with|by)$/.test(word));
            const wordCounts = new Map();
            words.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
            // Return top 5 most frequent meaningful words as topics
            return Array.from(wordCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
        }
        catch (error) {
            this.logger.warn('Error extracting topics:', error);
            return [];
        }
    }
    /**
     * Extract key concepts from content
     */
    async extractKeyConcepts(content) {
        try {
            // Extract noun phrases and technical terms
            const concepts = [];
            // Simple pattern matching for concepts
            const conceptPatterns = [
                /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Proper nouns
                /\b[a-z]+(?:_[a-z]+)+\b/g, // Snake_case terms
                /\b[a-z]+(?:[A-Z][a-z]*)+\b/g, // CamelCase terms
                /\b\w+(?:\(\)|\[\]|\{\})\b/g // Function/method calls
            ];
            conceptPatterns.forEach(pattern => {
                const matches = content.match(pattern) || [];
                concepts.push(...matches);
            });
            // Remove duplicates and return top concepts
            return [...new Set(concepts)].slice(0, 10);
        }
        catch (error) {
            this.logger.warn('Error extracting key concepts:', error);
            return [];
        }
    }
    /**
     * Calculate coherence score based on sentence relationships
     */
    calculateCoherence(sentences) {
        if (sentences.length < 2)
            return 1.0;
        try {
            let coherenceSum = 0;
            for (let i = 1; i < sentences.length; i++) {
                const prevSentence = sentences[i - 1].toLowerCase().split(/\s+/);
                const currSentence = sentences[i].toLowerCase().split(/\s+/);
                // Calculate word overlap between consecutive sentences
                const prevWords = new Set(prevSentence);
                const currWords = new Set(currSentence);
                const overlap = new Set([...prevWords].filter(word => currWords.has(word)));
                const overlapRatio = overlap.size / Math.max(prevWords.size, currWords.size);
                coherenceSum += overlapRatio;
            }
            return coherenceSum / (sentences.length - 1);
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Calculate topic consistency score
     */
    calculateTopicConsistency(words) {
        try {
            // Simple topic consistency based on word repetition patterns
            const wordCounts = new Map();
            const meaningfulWords = words.filter(word => word.length > 3 &&
                !/^(the|and|or|but|in|on|at|to|for|of|with|by|this|that|these|those)$/.test(word));
            meaningfulWords.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
            if (wordCounts.size === 0)
                return 0.5;
            // Calculate how evenly distributed the important words are
            const counts = Array.from(wordCounts.values());
            const totalWords = meaningfulWords.length;
            const averageCount = totalWords / wordCounts.size;
            // Measure deviation from average
            const variance = counts.reduce((sum, count) => sum + Math.pow(count - averageCount, 2), 0) / counts.length;
            // Convert variance to consistency score (lower variance = higher consistency)
            return Math.max(0.1, Math.min(1.0, 1 / (1 + variance / averageCount)));
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Extract key terms from content
     */
    extractKeyTerms(content) {
        try {
            // Extract technical terms, proper nouns, and important concepts
            const terms = [];
            // Find capitalized words (likely proper nouns or important terms)
            const capitalizedWords = content.match(/\b[A-Z][a-z]+\b/g) || [];
            terms.push(...capitalizedWords.slice(0, 5));
            // Find technical terms (words with underscores, camelCase, etc.)
            const technicalTerms = content.match(/\b[a-z]+(?:[A-Z][a-z]*|_[a-z]+)+\b/g) || [];
            terms.push(...technicalTerms.slice(0, 5));
            return [...new Set(terms)];
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Fallback semantic chunking when no boundaries are found
     */
    async fallbackSemanticChunking(content, context) {
        this.logger.info('Using fallback semantic chunking');
        const { config } = context;
        const chunks = [];
        const targetChunkSize = Math.floor((config.maxChunkSize + config.minChunkSize) / 2);
        let position = 0;
        let chunkIndex = 0;
        while (position < content.length) {
            let endPosition = Math.min(position + targetChunkSize, content.length);
            // Try to end chunk at a natural break point
            if (endPosition < content.length) {
                // Look for sentence endings within the last 20% of the chunk
                const searchStart = Math.max(position + Math.floor(targetChunkSize * 0.8), position);
                const searchRegion = content.slice(searchStart, endPosition + 100);
                const sentenceEnd = searchRegion.search(/[.!?]\s+/);
                if (sentenceEnd !== -1) {
                    endPosition = searchStart + sentenceEnd + 1;
                }
            }
            const chunkContent = content.slice(position, endPosition).trim();
            if (chunkContent.length > 0) {
                const chunk = await this.createSemanticChunk(chunkContent, position, endPosition, chunkIndex++, config, context.structure);
                chunks.push(chunk);
            }
            position = endPosition;
        }
        return chunks;
    }
    /**
     * Optimize chunks for better semantic coherence
     */
    async optimizeChunks(chunks, config) {
        try {
            // Check for chunks that are too small or too large
            const optimized = [];
            let i = 0;
            while (i < chunks.length) {
                const chunk = chunks[i];
                if (chunk.content.length < config.minChunkSize && i < chunks.length - 1) {
                    // Merge small chunk with next chunk
                    const nextChunk = chunks[i + 1];
                    const mergedContent = chunk.content + '\n\n' + nextChunk.content;
                    if (mergedContent.length <= config.maxChunkSize) {
                        const mergedChunk = {
                            content: mergedContent,
                            type: 'semantic',
                            startPosition: chunk.startPosition,
                            endPosition: nextChunk.endPosition,
                            qualityScore: ((chunk.qualityScore || 0.5) + (nextChunk.qualityScore || 0.5)) / 2,
                            qualityMetrics: {
                                ...chunk.qualityMetrics,
                                merged: true
                            },
                            metadata: {
                                ...chunk.metadata,
                                mergedWith: nextChunk.metadata,
                                optimized: true
                            }
                        };
                        optimized.push(mergedChunk);
                        i += 2; // Skip next chunk as it's been merged
                        continue;
                    }
                }
                if (chunk.content.length > config.maxChunkSize) {
                    // Split large chunk
                    const splitChunks = await this.splitLargeChunk(chunk, config);
                    optimized.push(...splitChunks);
                }
                else {
                    optimized.push(chunk);
                }
                i++;
            }
            this.logger.debug(`Optimized ${chunks.length} chunks to ${optimized.length}`);
            return optimized;
        }
        catch (error) {
            this.logger.warn('Error optimizing chunks:', error);
            return chunks;
        }
    }
    /**
     * Split a large chunk into smaller semantic chunks
     */
    async splitLargeChunk(chunk, config) {
        try {
            const targetSize = Math.floor((config.maxChunkSize + config.minChunkSize) / 2);
            const numParts = Math.ceil(chunk.content.length / targetSize);
            const splitChunks = [];
            for (let i = 0; i < numParts; i++) {
                const start = i * targetSize;
                const end = Math.min((i + 1) * targetSize, chunk.content.length);
                let content = chunk.content.slice(start, end);
                // Try to end at sentence boundary
                if (i < numParts - 1) {
                    const lastSentence = content.lastIndexOf('. ');
                    if (lastSentence > content.length * 0.7) {
                        content = content.slice(0, lastSentence + 1);
                    }
                }
                const splitChunk = {
                    content: content.trim(),
                    type: 'semantic',
                    startPosition: (chunk.startPosition || 0) + start,
                    endPosition: (chunk.startPosition || 0) + start + content.length,
                    qualityScore: (chunk.qualityScore || 0.5) * 0.9, // Slightly lower quality for split chunks
                    qualityMetrics: {
                        ...(chunk.qualityMetrics || {}),
                        split: true,
                        partIndex: i,
                        totalParts: numParts
                    },
                    metadata: {
                        ...(chunk.metadata || {}),
                        splitFrom: chunk.metadata?.chunkIndex,
                        partIndex: i,
                        totalParts: numParts
                    }
                };
                splitChunks.push(splitChunk);
            }
            return splitChunks;
        }
        catch (error) {
            this.logger.warn('Error splitting large chunk:', error);
            return [chunk];
        }
    }
    /**
     * Estimate token count (rough estimation: ~4 characters per token)
     */
    estimateTokenCount(content) {
        return Math.ceil(content.length / 4);
    }
}
//# sourceMappingURL=SemanticChunkingStrategy.js.map