/**
 * Fixed Size Chunking Strategy
 *
 * Implements simple fixed-size document chunking that divides content
 * into chunks of approximately equal size. Useful for consistent
 * processing requirements and simple content types.
 *
 * Phase 1 Week 3 Implementation - Fixed Size Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class FixedSizeChunkingStrategy {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Chunk content using fixed size approach
     */
    async chunk(content, context) {
        try {
            const startTime = Date.now();
            this.logger.info('Starting fixed-size chunking...');
            const { config } = context;
            const chunks = [];
            const chunkSize = this.calculateOptimalChunkSize(config);
            let position = 0;
            let chunkIndex = 0;
            while (position < content.length) {
                const endPosition = Math.min(position + chunkSize, content.length);
                // Try to find a good break point near the target end position
                const adjustedEndPosition = this.findOptimalBreakPoint(content, position, endPosition, config);
                const chunkContent = content.slice(position, adjustedEndPosition).trim();
                if (chunkContent.length > 0) {
                    const chunk = await this.createFixedSizeChunk(chunkContent, position, adjustedEndPosition, chunkIndex++, config);
                    chunks.push(chunk);
                }
                position = adjustedEndPosition;
            }
            const processingTime = Date.now() - startTime;
            this.logger.info(`Fixed-size chunking completed: ${chunks.length} chunks in ${processingTime}ms`);
            return chunks;
        }
        catch (error) {
            this.logger.error('Failed to perform fixed-size chunking:', error);
            throw error;
        }
    }
    /**
     * Calculate optimal chunk size based on configuration
     */
    calculateOptimalChunkSize(config) {
        // Use target size between min and max, closer to max for efficiency
        const targetRatio = 0.8; // 80% of max size
        return Math.floor(config.minChunkSize + (config.maxChunkSize - config.minChunkSize) * targetRatio);
    }
    /**
     * Find optimal break point near target position
     */
    findOptimalBreakPoint(content, startPosition, targetEndPosition, config) {
        // If we're at the end of content, return the end
        if (targetEndPosition >= content.length) {
            return content.length;
        }
        // Define search window (20% of chunk size before and after target)
        const searchWindow = Math.floor((targetEndPosition - startPosition) * 0.2);
        const searchStart = Math.max(startPosition, targetEndPosition - searchWindow);
        const searchEnd = Math.min(content.length, targetEndPosition + searchWindow);
        // Look for break points in order of preference
        const breakPoints = this.findBreakPoints(content, searchStart, searchEnd);
        if (breakPoints.length > 0) {
            // Find the break point closest to target
            const closestBreak = breakPoints.reduce((closest, current) => {
                return Math.abs(current.position - targetEndPosition) <
                    Math.abs(closest.position - targetEndPosition) ? current : closest;
            });
            return closestBreak.position;
        }
        // No good break point found - use target position
        return targetEndPosition;
    }
    /**
     * Find potential break points in content
     */
    findBreakPoints(content, start, end) {
        const breakPoints = [];
        const searchContent = content.slice(start, end);
        // Sentence endings (highest priority)
        const sentenceEndings = /[.!?]\s+/g;
        let match;
        while ((match = sentenceEndings.exec(searchContent)) !== null) {
            breakPoints.push({
                position: start + match.index + match[0].length,
                quality: 0.9,
                type: 'sentence-end'
            });
        }
        // Paragraph breaks (high priority)
        const paragraphBreaks = /\n\s*\n/g;
        while ((match = paragraphBreaks.exec(searchContent)) !== null) {
            breakPoints.push({
                position: start + match.index + match[0].length,
                quality: 0.8,
                type: 'paragraph-break'
            });
        }
        // Line breaks (medium priority)
        const lineBreaks = /\n/g;
        while ((match = lineBreaks.exec(searchContent)) !== null) {
            breakPoints.push({
                position: start + match.index + match[0].length,
                quality: 0.5,
                type: 'line-break'
            });
        }
        // Word boundaries (low priority)
        const wordBoundaries = /\s+/g;
        while ((match = wordBoundaries.exec(searchContent)) !== null) {
            breakPoints.push({
                position: start + match.index + match[0].length,
                quality: 0.3,
                type: 'word-boundary'
            });
        }
        // Sort by quality (descending)
        return breakPoints.sort((a, b) => b.quality - a.quality);
    }
    /**
     * Create a fixed-size chunk with metadata
     */
    async createFixedSizeChunk(content, startPosition, endPosition, chunkIndex, config) {
        try {
            // Calculate quality score based on size consistency and content characteristics
            const qualityScore = this.calculateFixedSizeQuality(content, config);
            // Analyze content characteristics
            const contentStats = this.analyzeContentStats(content);
            return {
                content,
                type: 'fixed-size',
                startPosition,
                endPosition,
                qualityScore,
                qualityMetrics: {
                    sizeConsistency: this.calculateSizeConsistency(content.length, config),
                    contentDensity: contentStats.density,
                    breakPointQuality: this.assessBreakPointQuality(content),
                    chunkEfficiency: content.length / config.maxChunkSize
                },
                metadata: {
                    strategy: 'fixed-size',
                    chunkIndex,
                    targetSize: this.calculateOptimalChunkSize(config),
                    actualSize: content.length,
                    ...contentStats,
                    processingTime: Date.now()
                }
            };
        }
        catch (error) {
            this.logger.warn('Error creating fixed-size chunk:', error);
            return {
                content,
                type: 'fixed-size',
                startPosition,
                endPosition,
                qualityScore: 0.5,
                qualityMetrics: {
                    sizeConsistency: 0.5,
                    contentDensity: 0.5,
                    breakPointQuality: 0.5,
                    chunkEfficiency: 0.5
                },
                metadata: {
                    strategy: 'fixed-size',
                    chunkIndex,
                    error: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    /**
     * Calculate quality score for fixed-size chunk
     */
    calculateFixedSizeQuality(content, config) {
        try {
            let qualityScore = 0.6; // Base score for fixed-size chunks
            // Size consistency bonus
            const targetSize = this.calculateOptimalChunkSize(config);
            const sizeRatio = content.length / targetSize;
            const sizeConsistency = Math.max(0, 1 - Math.abs(sizeRatio - 1));
            qualityScore += sizeConsistency * 0.2;
            // Content completeness (no cut-off words/sentences)
            const endsWithWord = /\w$/.test(content.trim());
            const endsWithSentence = /[.!?]$/.test(content.trim());
            if (endsWithSentence) {
                qualityScore += 0.2; // Best case - ends with complete sentence
            }
            else if (!endsWithWord) {
                qualityScore += 0.1; // Good case - ends at word boundary
            }
            // Content density (not too much whitespace)
            const nonWhitespaceRatio = content.replace(/\s/g, '').length / content.length;
            if (nonWhitespaceRatio > 0.7) {
                qualityScore += 0.1;
            }
            return Math.min(1.0, Math.max(0.1, qualityScore));
        }
        catch (error) {
            return 0.5;
        }
    }
    /**
     * Calculate size consistency score
     */
    calculateSizeConsistency(actualSize, config) {
        const targetSize = this.calculateOptimalChunkSize(config);
        const ratio = actualSize / targetSize;
        return Math.max(0, 1 - Math.abs(ratio - 1));
    }
    /**
     * Analyze content statistics
     */
    analyzeContentStats(content) {
        try {
            const words = content.trim().split(/\s+/).filter(w => w.length > 0);
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            const lines = content.split('\n');
            const nonWhitespaceLength = content.replace(/\s/g, '').length;
            const density = nonWhitespaceLength / content.length;
            return {
                wordCount: words.length,
                sentenceCount: sentences.length,
                paragraphCount: paragraphs.length,
                lineCount: lines.length,
                density,
                averageWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0
            };
        }
        catch (error) {
            return {
                wordCount: 0,
                sentenceCount: 0,
                paragraphCount: 0,
                lineCount: 0,
                density: 0,
                averageWordsPerSentence: 0
            };
        }
    }
    /**
     * Assess break point quality
     */
    assessBreakPointQuality(content) {
        try {
            const trimmed = content.trim();
            // Check how the chunk ends
            if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
                return 0.9; // Excellent - ends with sentence
            }
            if (trimmed.endsWith('\n')) {
                return 0.7; // Good - ends with line break
            }
            if (trimmed.endsWith(' ') || /\s$/.test(trimmed)) {
                return 0.5; // Fair - ends with whitespace
            }
            if (/\w$/.test(trimmed)) {
                return 0.3; // Poor - cuts off word
            }
            return 0.4; // Default
        }
        catch (error) {
            return 0.4;
        }
    }
}
//# sourceMappingURL=FixedSizeChunkingStrategy.js.map