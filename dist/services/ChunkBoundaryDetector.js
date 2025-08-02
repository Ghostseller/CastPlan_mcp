/**
 * Chunk Boundary Detector
 *
 * Responsible for detecting semantic boundaries in documents for optimal chunking.
 * Uses multiple detection strategies including structural analysis, AI-powered semantic analysis,
 * content similarity, and natural language processing techniques.
 *
 * Phase 1 Week 3 Implementation - Semantic Boundary Detection
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class ChunkBoundaryDetector {
    logger;
    aiAnalysisService;
    initialized = false;
    // Boundary detection patterns
    STRUCTURAL_BOUNDARIES = {
        markdown: {
            heading: /^(#{1,6})\s+(.+)$/gm,
            codeBlock: /^```(\w+)?\n([\s\S]*?)^```$/gm,
            horizontalRule: /^---+$/gm,
            listStart: /^(\s*)[*\-+]\s+(.+)$/gm,
            tableStart: /^\|(.+)\|$/gm
        },
        code: {
            functionStart: /(?:function|def|fn|func|method|procedure)\s+(\w+)/gi,
            classStart: /(?:class|interface|struct|enum)\s+(\w+)/gi,
            commentBlock: /(?:\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g,
            importSection: /(?:import|require|include|use|from)\s+([^\s;]+)/gi
        },
        text: {
            paragraphBreak: /\n\s*\n/g,
            sectionBreak: /\n\s*[-=]{3,}\s*\n/g,
            chapterBreak: /(?:Chapter|Section|Part)\s+\d+/gi
        }
    };
    // Semantic indicators
    SEMANTIC_INDICATORS = {
        topicChange: [
            'however', 'nevertheless', 'furthermore', 'moreover', 'additionally',
            'in contrast', 'on the other hand', 'meanwhile', 'subsequently',
            'first', 'second', 'third', 'finally', 'in conclusion', 'to summarize'
        ],
        contextShift: [
            'now', 'next', 'then', 'after', 'before', 'during', 'while',
            'instead', 'alternatively', 'similarly', 'likewise', 'conversely'
        ],
        emphasisMarkers: [
            'important', 'note', 'warning', 'caution', 'remember', 'key point',
            'significant', 'crucial', 'essential', 'critical', 'vital'
        ]
    };
    // Quality thresholds
    QUALITY_THRESHOLDS = {
        minConfidence: 0.3,
        strongConfidence: 0.7,
        maxBoundaryDistance: 200, // characters
        minChunkSize: 50,
        maxChunkSize: 2000
    };
    constructor(logger, aiAnalysisService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
    }
    /**
     * Initialize the boundary detector
     */
    async initialize() {
        try {
            this.logger.info('Initializing ChunkBoundaryDetector...');
            // Initialize AI analysis service if needed
            // (assuming it's already initialized by the caller)
            this.initialized = true;
            this.logger.info('ChunkBoundaryDetector initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ChunkBoundaryDetector:', error);
            throw error;
        }
    }
    /**
     * Detect semantic boundaries in content
     */
    async detectBoundaries(content, structure, config) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info('Detecting semantic boundaries...');
            const boundaries = [];
            // Step 1: Detect structural boundaries
            const structuralBoundaries = await this.detectStructuralBoundaries(content, structure);
            boundaries.push(...structuralBoundaries);
            // Step 2: Detect semantic boundaries using AI analysis
            if (config.similarityThreshold && config.similarityThreshold > 0) {
                const semanticBoundaries = await this.detectSemanticBoundaries(content, structure, config);
                boundaries.push(...semanticBoundaries);
            }
            // Step 3: Detect natural language boundaries
            const naturalBoundaries = await this.detectNaturalBoundaries(content, structure);
            boundaries.push(...naturalBoundaries);
            // Step 4: Refine and merge boundaries
            const refinedBoundaries = await this.refineBoundaries(boundaries, content, config);
            // Step 5: Validate and score boundaries
            const validatedBoundaries = await this.validateBoundaries(refinedBoundaries, content, config);
            const processingTime = Date.now() - startTime;
            this.logger.info(`Detected ${validatedBoundaries.length} semantic boundaries in ${processingTime}ms`);
            return validatedBoundaries.sort((a, b) => a.position - b.position);
        }
        catch (error) {
            this.logger.error('Failed to detect boundaries:', error);
            throw error;
        }
    }
    /**
     * Detect structural boundaries based on document type
     */
    async detectStructuralBoundaries(content, structure) {
        const boundaries = [];
        try {
            switch (structure.type) {
                case 'markdown':
                    boundaries.push(...this.detectMarkdownBoundaries(content));
                    break;
                case 'code':
                    boundaries.push(...this.detectCodeBoundaries(content, structure.language));
                    break;
                case 'text':
                    boundaries.push(...this.detectTextBoundaries(content));
                    break;
                case 'mixed':
                    // Combine multiple detection strategies
                    boundaries.push(...this.detectMarkdownBoundaries(content));
                    boundaries.push(...this.detectCodeBoundaries(content, structure.language));
                    boundaries.push(...this.detectTextBoundaries(content));
                    break;
            }
            // Add section-based boundaries
            for (const section of structure.sections) {
                if (section.type === 'heading' && section.level && section.level <= 3) {
                    boundaries.push({
                        position: section.startPosition,
                        type: 'section',
                        confidence: 0.8 + (0.1 * (4 - section.level)), // Higher confidence for higher-level headings
                        reason: `${section.type} (level ${section.level})`,
                        metadata: {
                            sectionType: section.type,
                            level: section.level,
                            title: section.title
                        }
                    });
                }
            }
            this.logger.debug(`Detected ${boundaries.length} structural boundaries`);
            return boundaries;
        }
        catch (error) {
            this.logger.warn('Error detecting structural boundaries:', error);
            return [];
        }
    }
    /**
     * Detect Markdown-specific boundaries
     */
    detectMarkdownBoundaries(content) {
        const boundaries = [];
        // Heading boundaries
        let match;
        this.STRUCTURAL_BOUNDARIES.markdown.heading.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.markdown.heading.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'section',
                confidence: 0.9,
                reason: `Markdown heading (${match[1]})`,
                metadata: {
                    headingLevel: match[1].length,
                    title: match[2].trim()
                }
            });
        }
        // Code block boundaries
        this.STRUCTURAL_BOUNDARIES.markdown.codeBlock.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.markdown.codeBlock.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'context',
                confidence: 0.7,
                reason: 'Code block start',
                metadata: {
                    language: match[1] || 'text',
                    blockType: 'code'
                }
            });
        }
        // Horizontal rule boundaries
        this.STRUCTURAL_BOUNDARIES.markdown.horizontalRule.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.markdown.horizontalRule.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'section',
                confidence: 0.8,
                reason: 'Horizontal rule separator',
                metadata: {
                    separatorType: 'horizontal-rule'
                }
            });
        }
        return boundaries;
    }
    /**
     * Detect code-specific boundaries
     */
    detectCodeBoundaries(content, language) {
        const boundaries = [];
        // Function boundaries
        let match;
        this.STRUCTURAL_BOUNDARIES.code.functionStart.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.code.functionStart.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'context',
                confidence: 0.8,
                reason: `Function definition: ${match[1]}`,
                metadata: {
                    functionName: match[1],
                    language,
                    elementType: 'function'
                }
            });
        }
        // Class boundaries
        this.STRUCTURAL_BOUNDARIES.code.classStart.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.code.classStart.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'section',
                confidence: 0.9,
                reason: `Class definition: ${match[1]}`,
                metadata: {
                    className: match[1],
                    language,
                    elementType: 'class'
                }
            });
        }
        // Import section boundaries
        const importMatches = [...content.matchAll(this.STRUCTURAL_BOUNDARIES.code.importSection)];
        if (importMatches.length > 0) {
            // Group consecutive imports
            let importStart = importMatches[0].index;
            let importEnd = importMatches[importMatches.length - 1].index;
            if (importStart !== undefined && importEnd !== undefined) {
                boundaries.push({
                    position: importEnd,
                    type: 'context',
                    confidence: 0.6,
                    reason: 'End of import section',
                    metadata: {
                        importCount: importMatches.length,
                        language,
                        elementType: 'imports'
                    }
                });
            }
        }
        return boundaries;
    }
    /**
     * Detect text-specific boundaries
     */
    detectTextBoundaries(content) {
        const boundaries = [];
        // Paragraph breaks
        let match;
        this.STRUCTURAL_BOUNDARIES.text.paragraphBreak.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.text.paragraphBreak.exec(content)) !== null) {
            boundaries.push({
                position: match.index + match[0].length,
                type: 'natural',
                confidence: 0.4,
                reason: 'Paragraph break',
                metadata: {
                    breakType: 'paragraph'
                }
            });
        }
        // Section breaks (lines of dashes or equals)
        this.STRUCTURAL_BOUNDARIES.text.sectionBreak.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.text.sectionBreak.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'section',
                confidence: 0.8,
                reason: 'Section separator line',
                metadata: {
                    breakType: 'section-line'
                }
            });
        }
        // Chapter/section indicators
        this.STRUCTURAL_BOUNDARIES.text.chapterBreak.lastIndex = 0;
        while ((match = this.STRUCTURAL_BOUNDARIES.text.chapterBreak.exec(content)) !== null) {
            boundaries.push({
                position: match.index,
                type: 'section',
                confidence: 0.9,
                reason: `Chapter/section indicator: ${match[0]}`,
                metadata: {
                    chapterTitle: match[0],
                    breakType: 'chapter'
                }
            });
        }
        return boundaries;
    }
    /**
     * Detect semantic boundaries using AI analysis
     */
    async detectSemanticBoundaries(content, structure, config) {
        const boundaries = [];
        try {
            // Split content into sentences for analysis
            const sentences = this.splitIntoSentences(content);
            const windowSize = Math.min(5, sentences.length); // Analyze 5-sentence windows
            for (let i = windowSize; i < sentences.length - windowSize; i++) {
                const prevWindow = sentences.slice(i - windowSize, i).join(' ');
                const nextWindow = sentences.slice(i, i + windowSize).join(' ');
                // Calculate semantic similarity between windows
                const similarity = await this.calculateSemanticSimilarity(prevWindow, nextWindow);
                if (similarity < config.similarityThreshold) {
                    const position = this.findSentencePosition(content, sentences, i);
                    boundaries.push({
                        position,
                        type: 'topic',
                        confidence: 1 - similarity, // Lower similarity = higher confidence for boundary
                        reason: `Topic change (similarity: ${similarity.toFixed(2)})`,
                        metadata: {
                            similarity,
                            windowSize,
                            analysisMethod: 'ai-semantic'
                        }
                    });
                }
            }
            this.logger.debug(`Detected ${boundaries.length} semantic boundaries using AI analysis`);
            return boundaries;
        }
        catch (error) {
            this.logger.warn('Error detecting semantic boundaries:', error);
            return [];
        }
    }
    /**
     * Detect natural language boundaries
     */
    async detectNaturalBoundaries(content, structure) {
        const boundaries = [];
        try {
            const sentences = this.splitIntoSentences(content);
            for (let i = 0; i < sentences.length; i++) {
                const sentence = sentences[i].toLowerCase();
                // Check for topic change indicators
                for (const indicator of this.SEMANTIC_INDICATORS.topicChange) {
                    if (sentence.includes(indicator)) {
                        const position = this.findSentencePosition(content, sentences, i);
                        boundaries.push({
                            position,
                            type: 'topic',
                            confidence: 0.6,
                            reason: `Topic change indicator: "${indicator}"`,
                            metadata: {
                                indicator,
                                indicatorType: 'topic-change'
                            }
                        });
                        break;
                    }
                }
                // Check for context shift indicators
                for (const indicator of this.SEMANTIC_INDICATORS.contextShift) {
                    if (sentence.startsWith(indicator) || sentence.includes(`. ${indicator}`)) {
                        const position = this.findSentencePosition(content, sentences, i);
                        boundaries.push({
                            position,
                            type: 'context',
                            confidence: 0.5,
                            reason: `Context shift indicator: "${indicator}"`,
                            metadata: {
                                indicator,
                                indicatorType: 'context-shift'
                            }
                        });
                        break;
                    }
                }
                // Check for emphasis markers
                for (const marker of this.SEMANTIC_INDICATORS.emphasisMarkers) {
                    if (sentence.includes(marker)) {
                        const position = this.findSentencePosition(content, sentences, i);
                        boundaries.push({
                            position,
                            type: 'natural',
                            confidence: 0.4,
                            reason: `Emphasis marker: "${marker}"`,
                            metadata: {
                                marker,
                                indicatorType: 'emphasis'
                            }
                        });
                        break;
                    }
                }
            }
            this.logger.debug(`Detected ${boundaries.length} natural language boundaries`);
            return boundaries;
        }
        catch (error) {
            this.logger.warn('Error detecting natural boundaries:', error);
            return [];
        }
    }
    /**
     * Refine and merge boundaries to remove duplicates and low-quality boundaries
     */
    async refineBoundaries(boundaries, content, config) {
        if (boundaries.length === 0)
            return [];
        // Sort boundaries by position
        const sorted = boundaries.sort((a, b) => a.position - b.position);
        // Merge nearby boundaries
        const merged = [];
        let current = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i];
            const distance = next.position - current.position;
            if (distance <= this.QUALITY_THRESHOLDS.maxBoundaryDistance) {
                // Merge boundaries - keep the one with higher confidence
                if (next.confidence > current.confidence) {
                    current = {
                        ...next,
                        reason: `${current.reason} + ${next.reason}`,
                        metadata: { ...current.metadata, ...next.metadata }
                    };
                }
                else {
                    current = {
                        ...current,
                        reason: `${current.reason} + ${next.reason}`,
                        metadata: { ...current.metadata, ...next.metadata }
                    };
                }
            }
            else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        // Filter out low-confidence boundaries
        const filtered = merged.filter(boundary => boundary.confidence >= this.QUALITY_THRESHOLDS.minConfidence);
        this.logger.debug(`Refined ${boundaries.length} boundaries to ${filtered.length} (merged ${boundaries.length - merged.length}, filtered ${merged.length - filtered.length})`);
        return filtered;
    }
    /**
     * Validate boundaries and ensure they create reasonable chunk sizes
     */
    async validateBoundaries(boundaries, content, config) {
        if (boundaries.length === 0)
            return [];
        const validated = [];
        let lastPosition = 0;
        for (const boundary of boundaries) {
            const chunkSize = boundary.position - lastPosition;
            // Check if chunk size is reasonable
            if (chunkSize >= config.minChunkSize && chunkSize <= config.maxChunkSize) {
                validated.push(boundary);
                lastPosition = boundary.position;
            }
            else if (chunkSize < config.minChunkSize) {
                // Chunk too small - reduce confidence
                boundary.confidence *= 0.5;
                boundary.reason += ' (small chunk)';
                if (boundary.confidence >= this.QUALITY_THRESHOLDS.minConfidence) {
                    validated.push(boundary);
                    lastPosition = boundary.position;
                }
            }
            else {
                // Chunk too large - force boundary if confidence is high enough
                if (boundary.confidence >= this.QUALITY_THRESHOLDS.strongConfidence) {
                    validated.push(boundary);
                    lastPosition = boundary.position;
                }
            }
        }
        // Ensure final chunk is not too large
        const finalChunkSize = content.length - lastPosition;
        if (finalChunkSize > config.maxChunkSize && validated.length > 0) {
            // Add a forced boundary if needed
            const midPoint = lastPosition + Math.floor(finalChunkSize / 2);
            validated.push({
                position: midPoint,
                type: 'natural',
                confidence: 0.3,
                reason: 'Forced boundary for large final chunk',
                metadata: {
                    forced: true,
                    finalChunkSize
                }
            });
        }
        this.logger.debug(`Validated ${boundaries.length} boundaries to ${validated.length}`);
        return validated;
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    /**
     * Split content into sentences
     */
    splitIntoSentences(content) {
        // Simple sentence splitting - could be enhanced with more sophisticated NLP
        return content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    /**
     * Find the position of a sentence in the original content
     */
    findSentencePosition(content, sentences, index) {
        if (index === 0)
            return 0;
        const prevSentences = sentences.slice(0, index).join('. ') + '. ';
        return content.indexOf(sentences[index], prevSentences.length);
    }
    /**
     * Calculate semantic similarity between two text segments
     * This is a placeholder implementation - would use actual embeddings in production
     */
    async calculateSemanticSimilarity(text1, text2) {
        try {
            // For now, use a simple word overlap similarity
            const words1 = new Set(text1.toLowerCase().split(/\s+/));
            const words2 = new Set(text2.toLowerCase().split(/\s+/));
            const intersection = new Set([...words1].filter(word => words2.has(word)));
            const union = new Set([...words1, ...words2]);
            return intersection.size / union.size;
        }
        catch (error) {
            this.logger.warn('Error calculating semantic similarity:', error);
            return 0.5; // Default neutral similarity
        }
    }
    /**
     * Ensure detector is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('ChunkBoundaryDetector not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the detector
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down ChunkBoundaryDetector...');
            this.initialized = false;
            this.logger.info('ChunkBoundaryDetector shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during ChunkBoundaryDetector shutdown:', error);
        }
    }
}
//# sourceMappingURL=ChunkBoundaryDetector.js.map