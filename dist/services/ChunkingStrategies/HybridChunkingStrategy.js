/**
 * Hybrid Chunking Strategy
 *
 * Implements a hybrid approach that combines multiple chunking strategies
 * to achieve optimal results. Adapts strategy selection based on content
 * characteristics and dynamically switches between approaches within a document.
 *
 * Phase 1 Week 3 Implementation - Hybrid Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class HybridChunkingStrategy {
    logger;
    aiAnalysisService;
    contentParser;
    // Strategy weights for different content types
    STRATEGY_WEIGHTS = {
        markdown: {
            structural: 0.6,
            semantic: 0.3,
            fixedSize: 0.1
        },
        code: {
            structural: 0.7,
            semantic: 0.2,
            fixedSize: 0.1
        },
        text: {
            semantic: 0.5,
            structural: 0.2,
            fixedSize: 0.3
        },
        mixed: {
            semantic: 0.4,
            structural: 0.4,
            fixedSize: 0.2
        }
    };
    constructor(logger, aiAnalysisService, contentParser) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.contentParser = contentParser;
    }
    /**
     * Chunk content using hybrid approach
     */
    async chunk(content, context) {
        try {
            const startTime = Date.now();
            this.logger.info('Starting hybrid chunking...');
            const { config, structure, boundaries } = context;
            // Analyze content to determine optimal strategy mix
            const contentAnalysis = await this.analyzeContentForStrategy(content, structure);
            // Create chunks using multiple strategies
            const chunksByStrategy = await this.generateChunksWithMultipleStrategies(content, context, contentAnalysis);
            // Merge and optimize chunks from different strategies
            const hybridChunks = await this.mergeAndOptimizeChunks(chunksByStrategy, contentAnalysis, config);
            // Post-process for final optimization
            const finalChunks = await this.finalizeHybridChunks(hybridChunks, config);
            const processingTime = Date.now() - startTime;
            this.logger.info(`Hybrid chunking completed: ${finalChunks.length} chunks in ${processingTime}ms`);
            return finalChunks;
        }
        catch (error) {
            this.logger.error('Failed to perform hybrid chunking:', error);
            throw error;
        }
    }
    /**
     * Analyze content to determine optimal strategy mix
     */
    async analyzeContentForStrategy(content, structure) {
        try {
            const contentType = structure.type;
            // Calculate content characteristics
            const structuralScore = this.calculateStructuralScore(structure);
            const semanticScore = await this.calculateSemanticScore(content);
            const complexity = this.calculateContentComplexity(content, structure);
            // Determine recommended strategies based on analysis
            const strategyWeights = this.calculateStrategyWeights(contentType, structuralScore, semanticScore, complexity);
            const recommendedStrategies = Object.entries(strategyWeights)
                .filter(([_, weight]) => weight > 0.1)
                .sort(([_, a], [__, b]) => b - a)
                .map(([strategy]) => strategy);
            return {
                contentType,
                complexity,
                structuralScore,
                semanticScore,
                recommendedStrategies,
                strategyWeights
            };
        }
        catch (error) {
            this.logger.warn('Error analyzing content for strategy:', error);
            // Return default analysis
            return {
                contentType: 'text',
                complexity: 0.5,
                structuralScore: 0.5,
                semanticScore: 0.5,
                recommendedStrategies: ['semantic', 'structural', 'fixed-size'],
                strategyWeights: { semantic: 0.4, structural: 0.3, 'fixed-size': 0.3 }
            };
        }
    }
    /**
     * Calculate structural score based on document structure
     */
    calculateStructuralScore(structure) {
        try {
            let score = 0;
            // Count structural elements
            const sections = structure.sections || [];
            const headings = sections.filter((s) => s.type === 'heading');
            const codeBlocks = sections.filter((s) => s.type === 'code');
            const lists = sections.filter((s) => s.type === 'list');
            // Score based on structural richness
            if (headings.length > 0)
                score += 0.3;
            if (codeBlocks.length > 0)
                score += 0.2;
            if (lists.length > 0)
                score += 0.1;
            // Bonus for hierarchical structure
            if (headings.length > 1) {
                const levels = new Set(headings.map((h) => h.level).filter((l) => l));
                if (levels.size > 1)
                    score += 0.2; // Multiple heading levels
            }
            // Bonus for well-organized content
            const totalSections = sections.length;
            if (totalSections > 3)
                score += 0.2;
            return Math.min(1.0, score);
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Calculate semantic score based on content analysis
     */
    async calculateSemanticScore(content) {
        try {
            // Analyze semantic richness
            const words = content.split(/\s+/).filter(w => w.length > 3);
            const uniqueWords = new Set(words.map(w => w.toLowerCase()));
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            let score = 0;
            // Vocabulary diversity
            const vocabularyRatio = uniqueWords.size / Math.max(1, words.length);
            score += Math.min(0.3, vocabularyRatio * 2);
            // Sentence complexity
            const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
            if (avgWordsPerSentence > 10 && avgWordsPerSentence < 25) {
                score += 0.2; // Good sentence complexity
            }
            // Topic indicators
            const topicMarkers = content.match(/\b(however|therefore|furthermore|moreover|in contrast|meanwhile)\b/gi) || [];
            score += Math.min(0.2, topicMarkers.length * 0.05);
            // Technical terms (indicate semantic complexity)
            const technicalTerms = content.match(/\b[A-Z][a-z]*[A-Z][a-z]*\b/g) || []; // CamelCase
            const underscoreTerms = content.match(/\b[a-z]+_[a-z_]+\b/g) || []; // snake_case
            score += Math.min(0.3, (technicalTerms.length + underscoreTerms.length) * 0.01);
            return Math.min(1.0, score);
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Calculate content complexity
     */
    calculateContentComplexity(content, structure) {
        try {
            let complexity = 0;
            // Length complexity
            const lengthScore = Math.min(0.3, content.length / 10000);
            complexity += lengthScore;
            // Structural complexity
            const sections = structure.sections || [];
            const sectionTypes = new Set(sections.map((s) => s.type));
            complexity += Math.min(0.3, sectionTypes.size * 0.1);
            // Nesting complexity (for code/markdown)
            const nestingIndicators = content.match(/[{}()\[\]]/g) || [];
            complexity += Math.min(0.2, nestingIndicators.length / 100);
            // Reference complexity (links, imports, etc.)
            const references = content.match(/(?:import|require|href|src|@|#)/g) || [];
            complexity += Math.min(0.2, references.length / 50);
            return Math.min(1.0, complexity);
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Calculate strategy weights based on analysis
     */
    calculateStrategyWeights(contentType, structuralScore, semanticScore, complexity) {
        // Start with base weights for content type
        const baseWeights = this.STRATEGY_WEIGHTS[contentType] ||
            this.STRATEGY_WEIGHTS.mixed;
        // Adjust weights based on analysis
        const adjustedWeights = { ...baseWeights };
        // Boost structural if high structural score
        if (structuralScore > 0.7) {
            adjustedWeights.structural = Math.min(1.0, adjustedWeights.structural * 1.5);
        }
        // Boost semantic if high semantic score
        if (semanticScore > 0.7) {
            adjustedWeights.semantic = Math.min(1.0, adjustedWeights.semantic * 1.5);
        }
        // Boost fixed-size for simple content
        if (complexity < 0.3 && structuralScore < 0.4 && semanticScore < 0.4) {
            adjustedWeights.fixedSize = Math.min(1.0, (adjustedWeights.fixedSize || 0) * 2);
        }
        // Normalize weights
        const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
        const normalizedWeights = {};
        for (const [strategy, weight] of Object.entries(adjustedWeights)) {
            normalizedWeights[strategy] = weight / totalWeight;
        }
        return normalizedWeights;
    }
    /**
     * Generate chunks using multiple strategies
     */
    async generateChunksWithMultipleStrategies(content, context, contentAnalysis) {
        const chunksByStrategy = {};
        try {
            // Generate chunks with each recommended strategy
            for (const strategy of contentAnalysis.recommendedStrategies) {
                if (contentAnalysis.strategyWeights[strategy] > 0.1) {
                    try {
                        const chunks = await this.generateChunksWithStrategy(content, context, strategy);
                        chunksByStrategy[strategy] = chunks;
                        this.logger.debug(`Generated ${chunks.length} chunks with ${strategy} strategy`);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to generate chunks with ${strategy} strategy:`, error);
                    }
                }
            }
            return chunksByStrategy;
        }
        catch (error) {
            this.logger.warn('Error generating chunks with multiple strategies:', error);
            // Fallback to semantic chunking
            try {
                const semanticChunks = await this.generateChunksWithStrategy(content, context, 'semantic');
                return { semantic: semanticChunks };
            }
            catch (fallbackError) {
                this.logger.error('Fallback chunking also failed:', fallbackError);
                return {};
            }
        }
    }
    /**
     * Generate chunks with a specific strategy
     */
    async generateChunksWithStrategy(content, context, strategy) {
        // Import and use strategy implementations
        // Note: This is a simplified version - in practice, you'd import the actual strategies
        switch (strategy) {
            case 'semantic':
                return await this.generateSemanticChunks(content, context);
            case 'structural':
                return await this.generateStructuralChunks(content, context);
            case 'fixed-size':
                return await this.generateFixedSizeChunks(content, context);
            default:
                throw new Error(`Unknown strategy: ${strategy}`);
        }
    }
    /**
     * Simplified semantic chunking (would use actual SemanticChunkingStrategy)
     */
    async generateSemanticChunks(content, context) {
        // Placeholder implementation - would use actual SemanticChunkingStrategy
        const chunks = [];
        const { config } = context;
        // Simple sentence-based chunking as placeholder
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        let position = 0;
        let chunkIndex = 0;
        for (const sentence of sentences) {
            const sentenceWithPunct = sentence + '. ';
            if (currentChunk.length + sentenceWithPunct.length > config.maxChunkSize && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.trim(),
                    type: 'semantic',
                    startPosition: position - currentChunk.length,
                    endPosition: position,
                    qualityScore: 0.8,
                    qualityMetrics: { strategy: 'semantic-hybrid' },
                    metadata: { chunkIndex: chunkIndex++, strategy: 'semantic-hybrid' }
                });
                currentChunk = sentenceWithPunct;
            }
            else {
                currentChunk += sentenceWithPunct;
            }
            position += sentenceWithPunct.length;
        }
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'semantic',
                startPosition: position - currentChunk.length,
                endPosition: position,
                qualityScore: 0.8,
                qualityMetrics: { strategy: 'semantic-hybrid' },
                metadata: { chunkIndex: chunkIndex++, strategy: 'semantic-hybrid' }
            });
        }
        return chunks;
    }
    /**
     * Simplified structural chunking
     */
    async generateStructuralChunks(content, context) {
        // Placeholder - would use actual StructuralChunkingStrategy
        const chunks = [];
        const { config, structure } = context;
        // Use sections from structure
        const sections = structure.sections || [];
        let chunkIndex = 0;
        for (const section of sections) {
            if (section.content && section.content.trim().length > 0) {
                chunks.push({
                    content: section.content,
                    type: 'structural',
                    startPosition: section.startPosition || 0,
                    endPosition: section.endPosition || section.content.length,
                    qualityScore: 0.7,
                    qualityMetrics: { strategy: 'structural-hybrid' },
                    metadata: {
                        chunkIndex: chunkIndex++,
                        strategy: 'structural-hybrid',
                        sectionType: section.type
                    }
                });
            }
        }
        return chunks;
    }
    /**
     * Simplified fixed-size chunking
     */
    async generateFixedSizeChunks(content, context) {
        // Placeholder - would use actual FixedSizeChunkingStrategy
        const chunks = [];
        const { config } = context;
        const chunkSize = Math.floor((config.maxChunkSize + config.minChunkSize) / 2);
        let position = 0;
        let chunkIndex = 0;
        while (position < content.length) {
            const endPosition = Math.min(position + chunkSize, content.length);
            const chunkContent = content.slice(position, endPosition);
            chunks.push({
                content: chunkContent,
                type: 'fixed-size',
                startPosition: position,
                endPosition: endPosition,
                qualityScore: 0.6,
                qualityMetrics: { strategy: 'fixed-size-hybrid' },
                metadata: { chunkIndex: chunkIndex++, strategy: 'fixed-size-hybrid' }
            });
            position = endPosition;
        }
        return chunks;
    }
    /**
     * Merge and optimize chunks from different strategies
     */
    async mergeAndOptimizeChunks(chunksByStrategy, contentAnalysis, config) {
        try {
            if (Object.keys(chunksByStrategy).length === 0) {
                throw new Error('No chunks generated by any strategy');
            }
            // If only one strategy produced chunks, return those
            const strategies = Object.keys(chunksByStrategy);
            if (strategies.length === 1) {
                return chunksByStrategy[strategies[0]];
            }
            // Merge chunks from multiple strategies
            const mergedChunks = await this.intelligentChunkMerging(chunksByStrategy, contentAnalysis, config);
            return mergedChunks;
        }
        catch (error) {
            this.logger.warn('Error merging chunks:', error);
            // Fallback to best single strategy
            const bestStrategy = contentAnalysis.recommendedStrategies[0];
            return chunksByStrategy[bestStrategy] || [];
        }
    }
    /**
     * Intelligent merging of chunks from different strategies
     */
    async intelligentChunkMerging(chunksByStrategy, contentAnalysis, config) {
        try {
            const mergedChunks = [];
            const allPositions = [];
            // Collect all chunk boundaries
            for (const [strategy, chunks] of Object.entries(chunksByStrategy)) {
                for (const chunk of chunks) {
                    allPositions.push(chunk.startPosition || 0);
                    allPositions.push(chunk.endPosition || 0);
                }
            }
            // Sort and deduplicate positions
            const uniquePositions = [...new Set(allPositions)].sort((a, b) => a - b);
            // Create merged chunks between positions
            for (let i = 0; i < uniquePositions.length - 1; i++) {
                const start = uniquePositions[i];
                const end = uniquePositions[i + 1];
                if (end > start) {
                    // Find which strategies have chunks covering this region
                    const coveringChunks = this.findChunksCoveringRegion(chunksByStrategy, start, end);
                    if (coveringChunks.length > 0) {
                        // Create merged chunk
                        const mergedChunk = await this.createMergedChunk(coveringChunks, start, end, contentAnalysis, mergedChunks.length);
                        mergedChunks.push(mergedChunk);
                    }
                }
            }
            return mergedChunks;
        }
        catch (error) {
            this.logger.warn('Error in intelligent chunk merging:', error);
            // Return chunks from best strategy
            const bestStrategy = contentAnalysis.recommendedStrategies[0];
            return chunksByStrategy[bestStrategy] || [];
        }
    }
    /**
     * Find chunks that cover a specific region
     */
    findChunksCoveringRegion(chunksByStrategy, start, end) {
        const coveringChunks = [];
        for (const [strategy, chunks] of Object.entries(chunksByStrategy)) {
            for (const chunk of chunks) {
                const chunkStart = chunk.startPosition || 0;
                const chunkEnd = chunk.endPosition || 0;
                // Check if chunk overlaps with region
                if (chunkStart < end && chunkEnd > start) {
                    coveringChunks.push({ strategy, chunk });
                }
            }
        }
        return coveringChunks;
    }
    /**
     * Create merged chunk from multiple strategy chunks
     */
    async createMergedChunk(coveringChunks, start, end, contentAnalysis, chunkIndex) {
        try {
            // Select best chunk based on strategy weights and quality
            const bestChunk = coveringChunks.reduce((best, current) => {
                const currentWeight = contentAnalysis.strategyWeights[current.strategy] || 0;
                const bestWeight = contentAnalysis.strategyWeights[best.strategy] || 0;
                const currentScore = (current.chunk.qualityScore || 0) * currentWeight;
                const bestScore = (best.chunk.qualityScore || 0) * bestWeight;
                return currentScore > bestScore ? current : best;
            });
            // Extract content for the region
            const regionContent = bestChunk.chunk.content.slice(Math.max(0, start - (bestChunk.chunk.startPosition || 0)), end - (bestChunk.chunk.startPosition || 0));
            // Calculate hybrid quality score
            const hybridQuality = this.calculateHybridQuality(coveringChunks, contentAnalysis);
            return {
                content: regionContent.trim(),
                type: 'hybrid',
                startPosition: start,
                endPosition: end,
                qualityScore: hybridQuality,
                qualityMetrics: {
                    hybridStrategies: coveringChunks.map(c => c.strategy),
                    primaryStrategy: bestChunk.strategy,
                    coverageCount: coveringChunks.length,
                    hybridScore: hybridQuality
                },
                metadata: {
                    strategy: 'hybrid',
                    chunkIndex,
                    primaryStrategy: bestChunk.strategy,
                    contributingStrategies: coveringChunks.map(c => c.strategy),
                    hybridAnalysis: contentAnalysis,
                    processingTime: Date.now()
                }
            };
        }
        catch (error) {
            this.logger.warn('Error creating merged chunk:', error);
            // Return best single chunk
            const bestChunk = coveringChunks[0];
            return {
                ...bestChunk.chunk,
                type: 'hybrid',
                qualityScore: (bestChunk.chunk.qualityScore || 0) * 0.8, // Slightly reduced for fallback
                metadata: {
                    ...bestChunk.chunk.metadata,
                    strategy: 'hybrid-fallback',
                    error: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    /**
     * Calculate hybrid quality score
     */
    calculateHybridQuality(coveringChunks, contentAnalysis) {
        try {
            let weightedQuality = 0;
            let totalWeight = 0;
            for (const { strategy, chunk } of coveringChunks) {
                const weight = contentAnalysis.strategyWeights[strategy] || 0;
                const quality = chunk.qualityScore || 0;
                weightedQuality += quality * weight;
                totalWeight += weight;
            }
            const baseQuality = totalWeight > 0 ? weightedQuality / totalWeight : 0.5;
            // Bonus for multiple strategies agreeing
            const strategyBonus = Math.min(0.2, (coveringChunks.length - 1) * 0.1);
            return Math.min(1.0, baseQuality + strategyBonus);
        }
        catch (error) {
            return 0.6; // Default hybrid quality
        }
    }
    /**
     * Finalize hybrid chunks
     */
    async finalizeHybridChunks(chunks, config) {
        try {
            // Remove empty chunks
            const nonEmptyChunks = chunks.filter(chunk => chunk.content.trim().length > 0);
            // Sort by position
            const sortedChunks = nonEmptyChunks.sort((a, b) => (a.startPosition || 0) - (b.startPosition || 0));
            // Final size optimization
            const optimizedChunks = await this.optimizeHybridChunkSizes(sortedChunks, config);
            this.logger.debug(`Finalized ${chunks.length} → ${optimizedChunks.length} hybrid chunks`);
            return optimizedChunks;
        }
        catch (error) {
            this.logger.warn('Error finalizing hybrid chunks:', error);
            return chunks;
        }
    }
    /**
     * Optimize hybrid chunk sizes
     */
    async optimizeHybridChunkSizes(chunks, config) {
        try {
            const optimized = [];
            let i = 0;
            while (i < chunks.length) {
                const chunk = chunks[i];
                if (chunk.content.length < config.minChunkSize && i < chunks.length - 1) {
                    // Try to merge with next chunk
                    const nextChunk = chunks[i + 1];
                    const combinedLength = chunk.content.length + nextChunk.content.length;
                    if (combinedLength <= config.maxChunkSize) {
                        const mergedChunk = {
                            content: chunk.content + '\n\n' + nextChunk.content,
                            type: 'hybrid',
                            startPosition: chunk.startPosition,
                            endPosition: nextChunk.endPosition,
                            qualityScore: Math.max(chunk.qualityScore || 0, nextChunk.qualityScore || 0),
                            qualityMetrics: {
                                merged: true,
                                originalCount: 2
                            },
                            metadata: {
                                strategy: 'hybrid-merged',
                                mergedChunks: [chunk.metadata, nextChunk.metadata]
                            }
                        };
                        optimized.push(mergedChunk);
                        i += 2; // Skip both chunks
                        continue;
                    }
                }
                optimized.push(chunk);
                i++;
            }
            return optimized;
        }
        catch (error) {
            this.logger.warn('Error optimizing hybrid chunk sizes:', error);
            return chunks;
        }
    }
}
//# sourceMappingURL=HybridChunkingStrategy.js.map