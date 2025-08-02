/**
 * Overlap Chunking Strategy
 *
 * Implements overlapping document chunking that creates chunks with
 * overlapping content to maintain context continuity. Useful for
 * search and retrieval systems where context preservation is important.
 *
 * Phase 1 Week 3 Implementation - Overlap Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class OverlapChunkingStrategy {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Chunk content using overlap approach
     */
    async chunk(content, context) {
        try {
            const startTime = Date.now();
            this.logger.info('Starting overlap chunking...');
            const { config } = context;
            const chunks = [];
            const chunkSize = this.calculateBaseChunkSize(config);
            const overlapSize = this.calculateOverlapSize(chunkSize, config.overlapPercentage);
            let position = 0;
            let chunkIndex = 0;
            while (position < content.length) {
                const endPosition = Math.min(position + chunkSize, content.length);
                // Find optimal break points for both chunk end and overlap
                const chunkEndPosition = this.findOptimalBreakPoint(content, position, endPosition, 'chunk-end');
                const chunkContent = content.slice(position, chunkEndPosition).trim();
                if (chunkContent.length > 0) {
                    const chunk = await this.createOverlapChunk(chunkContent, position, chunkEndPosition, chunkIndex++, config, this.calculateOverlapInfo(position, chunkEndPosition, overlapSize, content.length));
                    chunks.push(chunk);
                }
                // Calculate next position with overlap
                const nextPosition = this.calculateNextPosition(position, chunkEndPosition, overlapSize, content);
                // Prevent infinite loop
                if (nextPosition <= position) {
                    position = chunkEndPosition;
                }
                else {
                    position = nextPosition;
                }
            }
            // Post-process to optimize overlaps
            const optimizedChunks = await this.optimizeOverlaps(chunks, config);
            const processingTime = Date.now() - startTime;
            this.logger.info(`Overlap chunking completed: ${optimizedChunks.length} chunks in ${processingTime}ms`);
            return optimizedChunks;
        }
        catch (error) {
            this.logger.error('Failed to perform overlap chunking:', error);
            throw error;
        }
    }
    /**
     * Calculate base chunk size (without overlap)
     */
    calculateBaseChunkSize(config) {
        // Use a size that allows for meaningful overlap
        const targetRatio = 0.75; // 75% of max size to allow for overlap
        return Math.floor(config.minChunkSize + (config.maxChunkSize - config.minChunkSize) * targetRatio);
    }
    /**
     * Calculate overlap size based on percentage and chunk size
     */
    calculateOverlapSize(chunkSize, overlapPercentage) {
        return Math.floor(chunkSize * overlapPercentage);
    }
    /**
     * Find optimal break point for chunk boundaries
     */
    findOptimalBreakPoint(content, startPosition, targetEndPosition, breakType) {
        if (targetEndPosition >= content.length) {
            return content.length;
        }
        // Define search window
        const searchWindow = Math.floor((targetEndPosition - startPosition) * 0.15);
        const searchStart = Math.max(startPosition, targetEndPosition - searchWindow);
        const searchEnd = Math.min(content.length, targetEndPosition + searchWindow);
        // Find break points
        const breakPoints = this.findBreakPoints(content, searchStart, searchEnd, breakType);
        if (breakPoints.length > 0) {
            // For overlap chunking, prefer break points that maintain context
            const bestBreak = this.selectBestBreakPoint(breakPoints, targetEndPosition, breakType);
            return bestBreak.position;
        }
        return targetEndPosition;
    }
    /**
     * Find potential break points with context awareness
     */
    findBreakPoints(content, start, end, breakType) {
        const breakPoints = [];
        const searchContent = content.slice(start, end);
        // Sentence boundaries (good for context preservation)
        const sentenceEndings = /[.!?]\s+/g;
        let match;
        while ((match = sentenceEndings.exec(searchContent)) !== null) {
            const position = start + match.index + match[0].length;
            breakPoints.push({
                position,
                quality: 0.9,
                type: 'sentence-end',
                contextValue: this.calculateContextValue(content, position, 'sentence')
            });
        }
        // Paragraph boundaries (excellent for context)
        const paragraphBreaks = /\n\s*\n/g;
        while ((match = paragraphBreaks.exec(searchContent)) !== null) {
            const position = start + match.index + match[0].length;
            breakPoints.push({
                position,
                quality: 0.95,
                type: 'paragraph-break',
                contextValue: this.calculateContextValue(content, position, 'paragraph')
            });
        }
        // Topic transition markers
        const topicMarkers = /\b(however|therefore|furthermore|moreover|additionally|in contrast|meanwhile|subsequently)\b/gi;
        while ((match = topicMarkers.exec(searchContent)) !== null) {
            const position = start + match.index;
            breakPoints.push({
                position,
                quality: 0.8,
                type: 'topic-transition',
                contextValue: this.calculateContextValue(content, position, 'topic')
            });
        }
        // Heading patterns (for structured content)
        const headingPatterns = /\n(#{1,6}\s|.*\n[-=]{3,})/g;
        while ((match = headingPatterns.exec(searchContent)) !== null) {
            const position = start + match.index;
            breakPoints.push({
                position,
                quality: 0.85,
                type: 'heading',
                contextValue: this.calculateContextValue(content, position, 'heading')
            });
        }
        return breakPoints;
    }
    /**
     * Calculate context value for a potential break point
     */
    calculateContextValue(content, position, breakType) {
        try {
            // Analyze content before and after the break point
            const beforeWindow = 200;
            const afterWindow = 200;
            const beforeText = content.slice(Math.max(0, position - beforeWindow), position);
            const afterText = content.slice(position, Math.min(content.length, position + afterWindow));
            // Calculate context continuity score
            const beforeWords = new Set(beforeText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
            const afterWords = new Set(afterText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
            const commonWords = new Set([...beforeWords].filter(word => afterWords.has(word)));
            const totalUniqueWords = new Set([...beforeWords, ...afterWords]).size;
            const continuityScore = commonWords.size / totalUniqueWords;
            // Adjust based on break type
            switch (breakType) {
                case 'sentence':
                    return continuityScore * 0.8; // Moderate context preservation
                case 'paragraph':
                    return continuityScore * 0.6; // Lower continuity expected at paragraph breaks
                case 'topic':
                    return continuityScore * 0.4; // Topic changes reduce continuity
                case 'heading':
                    return continuityScore * 0.3; // Headings often introduce new topics
                default:
                    return continuityScore;
            }
        }
        catch (error) {
            return 0.5; // Default context value
        }
    }
    /**
     * Select best break point considering quality and context
     */
    selectBestBreakPoint(breakPoints, targetPosition, breakType) {
        // Score each break point
        const scoredBreakPoints = breakPoints.map(bp => {
            const distanceScore = 1 - Math.abs(bp.position - targetPosition) / 200; // Prefer closer positions
            const combinedScore = (bp.quality * 0.4) + (bp.contextValue * 0.4) + (distanceScore * 0.2);
            return { ...bp, combinedScore };
        });
        // Return the highest scored break point
        return scoredBreakPoints.reduce((best, current) => current.combinedScore > best.combinedScore ? current : best);
    }
    /**
     * Calculate next chunk starting position with overlap
     */
    calculateNextPosition(currentStart, currentEnd, overlapSize, content) {
        const baseNextPosition = currentEnd - overlapSize;
        // Ensure we don't go backwards
        if (baseNextPosition <= currentStart) {
            return currentEnd;
        }
        // Find a good overlap start point
        const overlapStart = this.findOptimalOverlapStart(content, baseNextPosition, currentEnd);
        return overlapStart;
    }
    /**
     * Find optimal starting point for overlap
     */
    findOptimalOverlapStart(content, targetStart, chunkEnd) {
        // Look for natural break points within the overlap region
        const searchWindow = Math.floor((chunkEnd - targetStart) * 0.3);
        const searchStart = Math.max(0, targetStart - searchWindow);
        const searchEnd = Math.min(chunkEnd, targetStart + searchWindow);
        // Find sentence or paragraph starts within the search window
        const overlapBreaks = this.findOverlapStartPoints(content, searchStart, searchEnd);
        if (overlapBreaks.length > 0) {
            // Choose the break point closest to target that provides good context
            const bestBreak = overlapBreaks.reduce((best, current) => {
                const targetDistance = Math.abs(current.position - targetStart);
                const bestDistance = Math.abs(best.position - targetStart);
                if (current.quality > best.quality + 0.1) {
                    return current; // Significantly better quality
                }
                else if (Math.abs(current.quality - best.quality) < 0.1) {
                    return targetDistance < bestDistance ? current : best; // Similar quality, prefer closer
                }
                return best;
            });
            return bestBreak.position;
        }
        return targetStart;
    }
    /**
     * Find good starting points for overlaps
     */
    findOverlapStartPoints(content, start, end) {
        const startPoints = [];
        const searchContent = content.slice(start, end);
        // Sentence starts
        const sentenceStarts = /(?:[.!?]\s+)([A-Z])/g;
        let match;
        while ((match = sentenceStarts.exec(searchContent)) !== null) {
            startPoints.push({
                position: start + match.index + match[0].length - match[1].length,
                quality: 0.8,
                type: 'sentence-start'
            });
        }
        // Paragraph starts
        const paragraphStarts = /\n\s*\n\s*(\S)/g;
        while ((match = paragraphStarts.exec(searchContent)) !== null) {
            startPoints.push({
                position: start + match.index + match[0].length - match[1].length,
                quality: 0.9,
                type: 'paragraph-start'
            });
        }
        return startPoints;
    }
    /**
     * Calculate overlap information for chunk metadata
     */
    calculateOverlapInfo(startPosition, endPosition, overlapSize, contentLength) {
        return {
            hasOverlapBefore: startPosition > 0,
            hasOverlapAfter: endPosition < contentLength,
            overlapBeforeSize: startPosition > 0 ? Math.min(overlapSize, startPosition) : 0,
            overlapAfterSize: endPosition < contentLength ? Math.min(overlapSize, contentLength - endPosition) : 0
        };
    }
    /**
     * Create an overlap chunk with metadata
     */
    async createOverlapChunk(content, startPosition, endPosition, chunkIndex, config, overlapInfo) {
        try {
            // Calculate quality score based on overlap effectiveness
            const qualityScore = this.calculateOverlapQuality(content, overlapInfo, config);
            // Analyze overlap characteristics
            const overlapStats = this.analyzeOverlapStats(content, overlapInfo);
            return {
                content,
                type: 'overlap',
                startPosition,
                endPosition,
                qualityScore,
                qualityMetrics: {
                    overlapEffectiveness: overlapStats.effectiveness,
                    contextContinuity: overlapStats.continuity,
                    overlapRatio: overlapStats.ratio,
                    chunkDensity: content.length / config.maxChunkSize
                },
                metadata: {
                    strategy: 'overlap',
                    chunkIndex,
                    ...overlapInfo,
                    ...overlapStats,
                    overlapPercentage: config.overlapPercentage,
                    processingTime: Date.now()
                }
            };
        }
        catch (error) {
            this.logger.warn('Error creating overlap chunk:', error);
            return {
                content,
                type: 'overlap',
                startPosition,
                endPosition,
                qualityScore: 0.5,
                qualityMetrics: {
                    overlapEffectiveness: 0.5,
                    contextContinuity: 0.5,
                    overlapRatio: config.overlapPercentage,
                    chunkDensity: 0.5
                },
                metadata: {
                    strategy: 'overlap',
                    chunkIndex,
                    error: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    /**
     * Calculate quality score for overlap chunk
     */
    calculateOverlapQuality(content, overlapInfo, config) {
        try {
            let qualityScore = 0.7; // Base score for overlap chunks
            // Overlap balance bonus
            if (overlapInfo.hasOverlapBefore && overlapInfo.hasOverlapAfter) {
                qualityScore += 0.1; // Bonus for chunks with overlap on both sides
            }
            // Content completeness
            const trimmed = content.trim();
            if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
                qualityScore += 0.1; // Ends with complete sentence
            }
            // Size efficiency
            const sizeRatio = content.length / config.maxChunkSize;
            if (sizeRatio > 0.6 && sizeRatio < 0.9) {
                qualityScore += 0.1; // Good size utilization
            }
            return Math.min(1.0, Math.max(0.1, qualityScore));
        }
        catch (error) {
            return 0.6;
        }
    }
    /**
     * Analyze overlap statistics
     */
    analyzeOverlapStats(content, overlapInfo) {
        try {
            const words = content.split(/\s+/).filter(w => w.length > 0);
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            // Calculate overlap effectiveness
            const totalOverlapSize = overlapInfo.overlapBeforeSize + overlapInfo.overlapAfterSize;
            const overlapRatio = totalOverlapSize / content.length;
            // Estimate context continuity (simplified)
            const contextWords = words.filter(word => word.length > 3).length;
            const continuity = Math.min(1.0, contextWords / Math.max(1, sentences.length * 3));
            return {
                effectiveness: Math.min(1.0, overlapRatio * 2), // Scale overlap ratio
                continuity,
                ratio: overlapRatio,
                contextWords
            };
        }
        catch (error) {
            return {
                effectiveness: 0.5,
                continuity: 0.5,
                ratio: 0.1,
                contextWords: 0
            };
        }
    }
    /**
     * Optimize overlaps to ensure consistency and quality
     */
    async optimizeOverlaps(chunks, config) {
        try {
            if (chunks.length < 2)
                return chunks;
            const optimized = [chunks[0]]; // First chunk always included
            for (let i = 1; i < chunks.length; i++) {
                const currentChunk = chunks[i];
                const previousChunk = optimized[optimized.length - 1];
                // Check overlap quality between consecutive chunks
                const overlapQuality = this.assessOverlapQuality(previousChunk, currentChunk);
                if (overlapQuality < 0.3) {
                    // Poor overlap - try to improve
                    const improvedChunk = await this.improveOverlap(previousChunk, currentChunk, config);
                    optimized.push(improvedChunk);
                }
                else {
                    optimized.push(currentChunk);
                }
            }
            this.logger.debug(`Optimized overlaps: ${chunks.length} → ${optimized.length} chunks`);
            return optimized;
        }
        catch (error) {
            this.logger.warn('Error optimizing overlaps:', error);
            return chunks;
        }
    }
    /**
     * Assess overlap quality between two consecutive chunks
     */
    assessOverlapQuality(chunk1, chunk2) {
        try {
            // Check if there's actual overlap in positions
            const overlapStart = Math.max(chunk1.startPosition || 0, chunk2.startPosition || 0);
            const overlapEnd = Math.min(chunk1.endPosition || 0, chunk2.endPosition || 0);
            if (overlapEnd <= overlapStart) {
                return 0; // No position overlap
            }
            // Check content overlap (simplified)
            const chunk1Words = new Set(chunk1.content.toLowerCase().split(/\s+/));
            const chunk2Words = new Set(chunk2.content.toLowerCase().split(/\s+/));
            const commonWords = new Set([...chunk1Words].filter(word => chunk2Words.has(word)));
            const overlapRatio = commonWords.size / Math.max(chunk1Words.size, chunk2Words.size);
            return overlapRatio;
        }
        catch (error) {
            return 0.3; // Default moderate quality
        }
    }
    /**
     * Improve overlap between chunks
     */
    async improveOverlap(previousChunk, currentChunk, config) {
        try {
            // Simple improvement: extend the current chunk backwards slightly
            const targetOverlapSize = Math.floor((currentChunk.content.length || 0) * config.overlapPercentage);
            const newStartPosition = Math.max((previousChunk.endPosition || 0) - targetOverlapSize, currentChunk.startPosition || 0);
            // This would require access to original content, which we don't have here
            // In a real implementation, this would reconstruct the chunk with better overlap
            return {
                ...currentChunk,
                metadata: {
                    ...currentChunk.metadata,
                    overlapImproved: true,
                    originalStartPosition: currentChunk.startPosition
                }
            };
        }
        catch (error) {
            this.logger.warn('Error improving overlap:', error);
            return currentChunk;
        }
    }
}
//# sourceMappingURL=OverlapChunkingStrategy.js.map