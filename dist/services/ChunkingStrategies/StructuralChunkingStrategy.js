/**
 * Structural Chunking Strategy
 *
 * Implements structure-based document chunking that follows document hierarchy.
 * Uses document structure analysis to create chunks that respect headings,
 * sections, code blocks, and other structural elements.
 *
 * Phase 1 Week 3 Implementation - Structural Chunking Algorithm
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class StructuralChunkingStrategy {
    logger;
    contentParser;
    constructor(logger, contentParser) {
        this.logger = logger;
        this.contentParser = contentParser;
    }
    /**
     * Chunk content using structural analysis
     */
    async chunk(content, context) {
        try {
            const startTime = Date.now();
            this.logger.info('Starting structural chunking...');
            const { config, structure, boundaries } = context;
            const chunks = [];
            // Use document structure to create chunks
            switch (structure.type) {
                case 'markdown':
                    chunks.push(...await this.chunkMarkdownStructure(content, structure, config));
                    break;
                case 'code':
                    chunks.push(...await this.chunkCodeStructure(content, structure, config));
                    break;
                case 'text':
                    chunks.push(...await this.chunkTextStructure(content, structure, config));
                    break;
                case 'mixed':
                    chunks.push(...await this.chunkMixedStructure(content, structure, config));
                    break;
                default:
                    chunks.push(...await this.chunkTextStructure(content, structure, config));
            }
            // Post-process chunks to ensure size constraints
            const optimizedChunks = await this.optimizeStructuralChunks(chunks, config);
            const processingTime = Date.now() - startTime;
            this.logger.info(`Structural chunking completed: ${optimizedChunks.length} chunks in ${processingTime}ms`);
            return optimizedChunks;
        }
        catch (error) {
            this.logger.error('Failed to perform structural chunking:', error);
            throw error;
        }
    }
    /**
     * Chunk Markdown content based on structure
     */
    async chunkMarkdownStructure(content, structure, config) {
        const chunks = [];
        try {
            // Group sections by heading hierarchy
            const headingSections = structure.sections.filter((s) => s.type === 'heading');
            const otherSections = structure.sections.filter((s) => s.type !== 'heading');
            if (headingSections.length === 0) {
                // No headings - chunk by paragraphs or sections
                return await this.chunkByParagraphs(content, structure, config);
            }
            // Create chunks based on heading hierarchy
            for (let i = 0; i < headingSections.length; i++) {
                const currentHeading = headingSections[i];
                const nextHeading = headingSections[i + 1];
                // Determine chunk end position
                const chunkStart = currentHeading.startPosition;
                const chunkEnd = nextHeading ? nextHeading.startPosition : content.length;
                const chunkContent = content.slice(chunkStart, chunkEnd).trim();
                if (chunkContent.length > 0) {
                    const chunk = await this.createStructuralChunk(chunkContent, chunkStart, chunkEnd, 'heading-section', {
                        headingLevel: currentHeading.level,
                        headingTitle: currentHeading.title,
                        sectionType: 'markdown-heading'
                    }, config);
                    chunks.push(chunk);
                }
            }
            // Handle any remaining content sections
            const unhandledSections = otherSections.filter((section) => {
                return !headingSections.some((heading) => section.startPosition >= heading.startPosition &&
                    section.endPosition <= (headingSections.find((h, idx) => headingSections[idx - 1] === heading)?.startPosition || content.length));
            });
            for (const section of unhandledSections) {
                if (section.content.trim().length > 0) {
                    const chunk = await this.createStructuralChunk(section.content, section.startPosition, section.endPosition, section.type, { sectionType: `markdown-${section.type}` }, config);
                    chunks.push(chunk);
                }
            }
            return chunks;
        }
        catch (error) {
            this.logger.warn('Error chunking markdown structure:', error);
            return await this.chunkByParagraphs(content, structure, config);
        }
    }
    /**
     * Chunk code content based on structure
     */
    async chunkCodeStructure(content, structure, config) {
        const chunks = [];
        try {
            // Group by functions, classes, and other code structures
            const codeSections = structure.sections.filter((s) => s.type === 'code');
            if (codeSections.length === 0) {
                // No structured code - chunk by logical blocks
                return await this.chunkCodeByBlocks(content, structure, config);
            }
            for (const section of codeSections) {
                if (section.content.trim().length > 0) {
                    const chunk = await this.createStructuralChunk(section.content, section.startPosition, section.endPosition, 'code-element', {
                        language: structure.language,
                        elementType: section.metadata?.elementType || 'code-block',
                        functionName: section.metadata?.functionName,
                        className: section.metadata?.className
                    }, config);
                    chunks.push(chunk);
                }
            }
            return chunks;
        }
        catch (error) {
            this.logger.warn('Error chunking code structure:', error);
            return await this.chunkCodeByBlocks(content, structure, config);
        }
    }
    /**
     * Chunk text content based on structure
     */
    async chunkTextStructure(content, structure, config) {
        const chunks = [];
        try {
            // Use paragraph-based chunking for text
            const paragraphSections = structure.sections.filter((s) => s.type === 'paragraph');
            if (paragraphSections.length === 0) {
                // No paragraphs detected - split by double newlines
                return await this.chunkByParagraphs(content, structure, config);
            }
            // Group paragraphs into chunks respecting size limits
            let currentChunk = '';
            let currentStart = 0;
            let chunkStart = 0;
            for (let i = 0; i < paragraphSections.length; i++) {
                const paragraph = paragraphSections[i];
                const paragraphContent = paragraph.content + '\n\n';
                if (currentChunk.length + paragraphContent.length > config.maxChunkSize && currentChunk.length > 0) {
                    // Create chunk with current content
                    const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, chunkStart + currentChunk.length, 'text-section', { sectionType: 'paragraph-group' }, config);
                    chunks.push(chunk);
                    // Start new chunk
                    currentChunk = paragraphContent;
                    chunkStart = paragraph.startPosition;
                }
                else {
                    if (currentChunk.length === 0) {
                        chunkStart = paragraph.startPosition;
                    }
                    currentChunk += paragraphContent;
                }
            }
            // Add final chunk
            if (currentChunk.trim().length > 0) {
                const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, chunkStart + currentChunk.length, 'text-section', { sectionType: 'paragraph-group' }, config);
                chunks.push(chunk);
            }
            return chunks;
        }
        catch (error) {
            this.logger.warn('Error chunking text structure:', error);
            return await this.chunkByParagraphs(content, structure, config);
        }
    }
    /**
     * Chunk mixed content based on structure
     */
    async chunkMixedStructure(content, structure, config) {
        const chunks = [];
        try {
            // Process sections in order, respecting their types
            const sortedSections = structure.sections
                .filter((s) => s.content && s.content.trim().length > 0)
                .sort((a, b) => a.startPosition - b.startPosition);
            let currentChunk = '';
            let currentStart = 0;
            let chunkStart = 0;
            let chunkType = 'mixed';
            for (const section of sortedSections) {
                const sectionContent = section.content + '\n\n';
                // Check if adding this section would exceed size limit
                if (currentChunk.length + sectionContent.length > config.maxChunkSize && currentChunk.length > 0) {
                    // Create chunk with current content
                    const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, chunkStart + currentChunk.length, chunkType, { sectionType: 'mixed-content' }, config);
                    chunks.push(chunk);
                    // Start new chunk
                    currentChunk = sectionContent;
                    chunkStart = section.startPosition;
                    chunkType = section.type;
                }
                else {
                    if (currentChunk.length === 0) {
                        chunkStart = section.startPosition;
                        chunkType = section.type;
                    }
                    currentChunk += sectionContent;
                }
            }
            // Add final chunk
            if (currentChunk.trim().length > 0) {
                const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, chunkStart + currentChunk.length, chunkType, { sectionType: 'mixed-content' }, config);
                chunks.push(chunk);
            }
            return chunks;
        }
        catch (error) {
            this.logger.warn('Error chunking mixed structure:', error);
            return await this.chunkByParagraphs(content, structure, config);
        }
    }
    /**
     * Fallback chunking by paragraphs
     */
    async chunkByParagraphs(content, structure, config) {
        const chunks = [];
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        let currentChunk = '';
        let position = 0;
        let chunkStart = 0;
        for (const paragraph of paragraphs) {
            const paragraphContent = paragraph + '\n\n';
            if (currentChunk.length + paragraphContent.length > config.maxChunkSize && currentChunk.length > 0) {
                // Create chunk
                const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, position, 'paragraph', { sectionType: 'paragraph-fallback' }, config);
                chunks.push(chunk);
                // Start new chunk
                currentChunk = paragraphContent;
                chunkStart = position;
            }
            else {
                if (currentChunk.length === 0) {
                    chunkStart = position;
                }
                currentChunk += paragraphContent;
            }
            position += paragraphContent.length;
        }
        // Add final chunk
        if (currentChunk.trim().length > 0) {
            const chunk = await this.createStructuralChunk(currentChunk.trim(), chunkStart, position, 'paragraph', { sectionType: 'paragraph-fallback' }, config);
            chunks.push(chunk);
        }
        return chunks;
    }
    /**
     * Chunk code by logical blocks
     */
    async chunkCodeByBlocks(content, structure, config) {
        const chunks = [];
        const lines = content.split('\n');
        let currentBlock = '';
        let blockStart = 0;
        let lineNumber = 0;
        for (const line of lines) {
            const lineContent = line + '\n';
            // Check for natural code breaks
            const isBreakPoint = line.trim() === '' ||
                line.trim().startsWith('//') ||
                line.trim().startsWith('#') ||
                line.includes('function ') ||
                line.includes('class ') ||
                line.includes('def ') ||
                line.includes('export ') ||
                line.includes('import ');
            if (currentBlock.length + lineContent.length > config.maxChunkSize && isBreakPoint && currentBlock.length > 0) {
                // Create chunk
                const chunk = await this.createStructuralChunk(currentBlock.trim(), blockStart, blockStart + currentBlock.length, 'code-block', {
                    language: structure.language,
                    lineRange: [blockStart, lineNumber - 1],
                    sectionType: 'code-logical-block'
                }, config);
                chunks.push(chunk);
                // Start new block
                currentBlock = lineContent;
                blockStart = lineNumber;
            }
            else {
                if (currentBlock.length === 0) {
                    blockStart = lineNumber;
                }
                currentBlock += lineContent;
            }
            lineNumber++;
        }
        // Add final block
        if (currentBlock.trim().length > 0) {
            const chunk = await this.createStructuralChunk(currentBlock.trim(), blockStart, blockStart + currentBlock.length, 'code-block', {
                language: structure.language,
                lineRange: [blockStart, lineNumber - 1],
                sectionType: 'code-logical-block'
            }, config);
            chunks.push(chunk);
        }
        return chunks;
    }
    /**
     * Create a structural chunk with metadata
     */
    async createStructuralChunk(content, startPosition, endPosition, chunkType, structuralMetadata, config) {
        try {
            // Calculate quality score based on structural coherence
            const qualityScore = this.calculateStructuralQuality(content, chunkType, structuralMetadata);
            return {
                content,
                type: 'structural',
                startPosition,
                endPosition,
                qualityScore,
                qualityMetrics: {
                    structuralCoherence: qualityScore,
                    chunkType,
                    hasStructure: true,
                    sizeRatio: content.length / config.maxChunkSize
                },
                metadata: {
                    strategy: 'structural',
                    chunkType,
                    ...structuralMetadata,
                    tokenCount: this.estimateTokenCount(content),
                    characterCount: content.length,
                    processingTime: Date.now()
                }
            };
        }
        catch (error) {
            this.logger.warn('Error creating structural chunk:', error);
            return {
                content,
                type: 'structural',
                startPosition,
                endPosition,
                qualityScore: 0.6,
                qualityMetrics: {
                    structuralCoherence: 0.6,
                    chunkType,
                    hasStructure: false,
                    sizeRatio: content.length / config.maxChunkSize
                },
                metadata: {
                    strategy: 'structural',
                    chunkType,
                    error: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    /**
     * Calculate structural quality score
     */
    calculateStructuralQuality(content, chunkType, structuralMetadata) {
        try {
            let baseScore = 0.7; // Base quality for structural chunks
            // Adjust based on chunk type
            switch (chunkType) {
                case 'heading-section':
                    baseScore = 0.9; // High quality for heading-based chunks
                    break;
                case 'code-element':
                    baseScore = 0.85; // Good quality for code elements
                    break;
                case 'code-block':
                    baseScore = 0.8; // Good quality for code blocks
                    break;
                case 'text-section':
                    baseScore = 0.75; // Good quality for text sections
                    break;
                case 'paragraph':
                    baseScore = 0.6; // Medium quality for paragraph chunks
                    break;
                default:
                    baseScore = 0.5; // Default quality
            }
            // Adjust based on content characteristics
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).length;
            // Prefer chunks with reasonable line/word counts
            if (lines > 5 && lines < 50)
                baseScore += 0.1;
            if (words > 50 && words < 500)
                baseScore += 0.1;
            // Bonus for structured elements
            if (structuralMetadata?.headingLevel) {
                baseScore += 0.1 / structuralMetadata.headingLevel; // Higher level headings get more bonus
            }
            if (structuralMetadata?.functionName || structuralMetadata?.className) {
                baseScore += 0.05; // Bonus for named code elements
            }
            return Math.min(1.0, Math.max(0.1, baseScore));
        }
        catch (error) {
            return 0.6; // Default quality score
        }
    }
    /**
     * Optimize structural chunks
     */
    async optimizeStructuralChunks(chunks, config) {
        try {
            const optimized = [];
            let i = 0;
            while (i < chunks.length) {
                const chunk = chunks[i];
                // Handle small chunks
                if (chunk.content.length < config.minChunkSize && i < chunks.length - 1) {
                    const nextChunk = chunks[i + 1];
                    // Only merge if they're the same structural type
                    if (chunk.metadata?.chunkType === nextChunk.metadata?.chunkType) {
                        const mergedContent = chunk.content + '\n\n' + nextChunk.content;
                        if (mergedContent.length <= config.maxChunkSize) {
                            const mergedChunk = {
                                content: mergedContent,
                                type: 'structural',
                                startPosition: chunk.startPosition || 0 || 0,
                                endPosition: nextChunk.endPosition || 0,
                                qualityScore: Math.max(chunk.qualityScore || 0.5 || 0.5, nextChunk.qualityScore || 0.5),
                                qualityMetrics: {
                                    ...(chunk.qualityMetrics || {}),
                                    merged: true
                                },
                                metadata: {
                                    ...(chunk.metadata || {}),
                                    mergedWith: nextChunk.metadata,
                                    optimized: true
                                }
                            };
                            optimized.push(mergedChunk);
                            i += 2; // Skip next chunk
                            continue;
                        }
                    }
                }
                // Handle large chunks
                if (chunk.content.length > config.maxChunkSize) {
                    const splitChunks = await this.splitLargeStructuralChunk(chunk, config);
                    optimized.push(...splitChunks);
                }
                else {
                    optimized.push(chunk);
                }
                i++;
            }
            this.logger.debug(`Optimized ${chunks.length} structural chunks to ${optimized.length}`);
            return optimized;
        }
        catch (error) {
            this.logger.warn('Error optimizing structural chunks:', error);
            return chunks;
        }
    }
    /**
     * Split large structural chunk
     */
    async splitLargeStructuralChunk(chunk, config) {
        try {
            const targetSize = Math.floor((config.maxChunkSize + config.minChunkSize) / 2);
            const content = chunk.content;
            const splitChunks = [];
            // Try to split at natural boundaries
            const naturalBreaks = [
                content.indexOf('\n\n'),
                content.indexOf('\n#'),
                content.indexOf('\nfunction '),
                content.indexOf('\nclass '),
                content.indexOf('\n// '),
                content.indexOf('\n/* ')
            ].filter(pos => pos > targetSize * 0.5 && pos < targetSize * 1.5);
            if (naturalBreaks.length > 0) {
                // Split at natural boundary
                const splitPos = naturalBreaks[0];
                const firstPart = content.slice(0, splitPos).trim();
                const secondPart = content.slice(splitPos).trim();
                if (firstPart.length > 0) {
                    splitChunks.push(await this.createStructuralChunk(firstPart, chunk.startPosition || 0, chunk.startPosition || 0 + firstPart.length, chunk.metadata?.chunkType || 'structural', { ...(chunk.metadata || {}), splitPart: 1 }, config));
                }
                if (secondPart.length > 0) {
                    if (secondPart.length > config.maxChunkSize) {
                        // Recursively split the second part
                        const secondChunk = await this.createStructuralChunk(secondPart, chunk.startPosition || 0 + splitPos, chunk.endPosition || 0, chunk.metadata?.chunkType || 'structural', { ...(chunk.metadata || {}), splitPart: 2 }, config);
                        const recursiveSplit = await this.splitLargeStructuralChunk(secondChunk, config);
                        splitChunks.push(...recursiveSplit);
                    }
                    else {
                        splitChunks.push(await this.createStructuralChunk(secondPart, chunk.startPosition || 0 + splitPos, chunk.endPosition || 0, chunk.metadata?.chunkType || 'structural', { ...(chunk.metadata || {}), splitPart: 2 }, config));
                    }
                }
            }
            else {
                // No natural break found - split at target size
                const firstPart = content.slice(0, targetSize).trim();
                const secondPart = content.slice(targetSize).trim();
                if (firstPart.length > 0) {
                    splitChunks.push(await this.createStructuralChunk(firstPart, chunk.startPosition || 0, chunk.startPosition || 0 + firstPart.length, chunk.metadata?.chunkType || 'structural', { ...(chunk.metadata || {}), forceSplit: true, splitPart: 1 }, config));
                }
                if (secondPart.length > 0) {
                    splitChunks.push(await this.createStructuralChunk(secondPart, chunk.startPosition || 0 + targetSize, chunk.endPosition || 0, chunk.metadata?.chunkType || 'structural', { ...(chunk.metadata || {}), forceSplit: true, splitPart: 2 }, config));
                }
            }
            return splitChunks;
        }
        catch (error) {
            this.logger.warn('Error splitting large structural chunk:', error);
            return [chunk];
        }
    }
    /**
     * Estimate token count
     */
    estimateTokenCount(content) {
        return Math.ceil(content.length / 4);
    }
}
//# sourceMappingURL=StructuralChunkingStrategy.js.map