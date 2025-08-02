/**
 * Document Evolution Detector
 *
 * Advanced multi-level change detection system for document evolution tracking.
 * Provides comprehensive analysis of document changes at different granularity levels.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import * as DiffMatchPatch from 'diff-match-patch';
import { VersionTrackingError, ChangeType, ChangeScope } from '../types/version-tracking.types';
import { getErrorMessage } from '../utils/typeHelpers';
/**
 * Enhanced Document Evolution Detector
 *
 * Provides multi-level change detection with sophisticated algorithms:
 * - Document-level: Overall structure and organization changes
 * - Section-level: Heading hierarchy and section modifications
 * - Paragraph-level: Content block changes and reorganization
 * - Chunk-level: Integration with semantic chunking for fine-grained analysis
 * - Semantic-level: AI-powered meaning and intent change detection
 */
export class DocumentEvolutionDetector {
    logger;
    aiAnalysisService;
    semanticFingerprintGenerator;
    semanticChunkingService;
    dmp;
    initialized = false;
    DEFAULT_OPTIONS = {
        timeframe: '30d',
        includePatterns: true,
        analysisDepth: 'deep',
        confidenceThreshold: 0.1
    };
    constructor(logger, aiAnalysisService, semanticFingerprintGenerator, semanticChunkingService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticFingerprintGenerator = semanticFingerprintGenerator;
        this.semanticChunkingService = semanticChunkingService;
        this.dmp = new DiffMatchPatch.diff_match_patch();
        // Configure diff-match-patch for better performance
        this.dmp.Diff_Timeout = 2.0; // 2 seconds timeout
        this.dmp.Diff_EditCost = 4; // Optimize for fewer operations
    }
    /**
     * Initialize the evolution detector
     */
    async initialize() {
        try {
            this.initialized = true;
            this.logger.info('DocumentEvolutionDetector initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize DocumentEvolutionDetector:', error);
            throw new VersionTrackingError('EVOLUTION_DETECTOR_INIT_FAILED', `Evolution detector initialization failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Detect comprehensive document evolution for a document
     */
    async detectEvolution(documentId, options = {}) {
        // This is a simplified implementation - in a real system, you'd fetch document versions
        // For now, we'll return a basic evolution structure
        return {
            documentId,
            timeRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
            },
            versions: [],
            changePatterns: [],
            evolutionMetrics: {
                totalVersions: 0,
                changeFrequency: 0,
                stability: 1.0,
                complexity: 0,
                growthRate: 0
            },
            insights: []
        };
    }
    /**
     * Detect comprehensive document evolution between two content versions
     */
    async detectContentEvolution(oldContent, newContent, options = {}) {
        this.ensureInitialized();
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        const startTime = Date.now();
        try {
            this.logger.debug('Starting comprehensive evolution detection', {
                oldContentLength: oldContent.length,
                newContentLength: newContent.length,
                options: finalOptions
            });
            const evolution = {
                overallChangeScore: 0,
                structuralChanges: [],
                contentChanges: [],
                semanticChanges: [],
                impactAnalysis: null
            };
            // Level 1: Structural Analysis - always enabled for content analysis
            evolution.structuralChanges = await this.detectStructuralChanges(oldContent, newContent);
            this.logger.debug(`Detected ${evolution.structuralChanges.length} structural changes`);
            // Level 2: Content Analysis - always enabled for content analysis
            evolution.contentChanges = await this.detectContentChanges(oldContent, newContent);
            this.logger.debug(`Detected ${evolution.contentChanges.length} content changes`);
            // Level 3: Semantic Analysis - conditional based on analysis depth
            if (finalOptions.analysisDepth === 'deep') {
                evolution.semanticChanges = await this.detectSemanticChanges(oldContent, newContent);
                this.logger.debug(`Detected ${evolution.semanticChanges.length} semantic changes`);
            }
            // Calculate overall change score
            evolution.overallChangeScore = this.calculateOverallChangeScore(evolution, finalOptions);
            const processingTime = Date.now() - startTime;
            this.logger.info('Evolution detection completed', {
                overallChangeScore: evolution.overallChangeScore,
                structuralChanges: evolution.structuralChanges.length,
                contentChanges: evolution.contentChanges.length,
                semanticChanges: evolution.semanticChanges.length,
                processingTime
            });
            return evolution;
        }
        catch (error) {
            this.logger.error('Evolution detection failed:', error);
            throw new VersionTrackingError('EVOLUTION_DETECTION_FAILED', `Evolution detection failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Detect structural changes in document organization
     */
    async detectStructuralChanges(oldContent, newContent) {
        const changes = [];
        try {
            // Parse structural elements from both versions
            const oldElements = this.parseStructuralElements(oldContent);
            const newElements = this.parseStructuralElements(newContent);
            this.logger.debug('Parsed structural elements', {
                oldElements: oldElements.length,
                newElements: newElements.length
            });
            // Detect heading structure changes
            const headingChanges = this.detectHeadingChanges(oldElements, newElements);
            changes.push(...headingChanges);
            // Detect section additions/removals
            const sectionChanges = this.detectSectionChanges(oldElements, newElements);
            changes.push(...sectionChanges);
            // Detect section movements
            const movementChanges = this.detectSectionMovements(oldElements, newElements);
            changes.push(...movementChanges);
            // Detect hierarchy changes
            const hierarchyChanges = this.detectHierarchyChanges(oldElements, newElements);
            changes.push(...hierarchyChanges);
            return changes;
        }
        catch (error) {
            this.logger.error('Structural change detection failed:', error);
            return [];
        }
    }
    /**
     * Detect content changes at text level
     */
    async detectContentChanges(oldContent, newContent) {
        const changes = [];
        try {
            // Generate detailed diff
            const diffs = this.dmp.diff_main(oldContent, newContent);
            this.dmp.diff_cleanupSemantic(diffs);
            let currentPosition = 0;
            let changeId = 0;
            for (const [operation, text] of diffs) {
                if (operation !== 0) { // Not EQUAL
                    const changeType = operation === 1 ? ChangeType.ADDITION : ChangeType.DELETION;
                    const startPosition = currentPosition;
                    const endPosition = currentPosition + text.length;
                    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
                    const characterCount = text.length;
                    changes.push({
                        type: changeType,
                        scope: ChangeScope.PARAGRAPH,
                        description: operation === 1 ? 'Text added' : 'Text removed',
                        impact: Math.min(characterCount / 1000, 1.0), // Impact based on text length
                        confidence: 0.9,
                        wordCount,
                        characterCount
                    });
                    changeId++;
                }
                if (operation !== -1) { // Not DELETE
                    currentPosition += text.length;
                }
            }
            // Merge adjacent changes of the same type
            const mergedChanges = this.mergeAdjacentChanges(changes);
            // Detect block-level modifications
            const blockChanges = await this.detectBlockLevelChanges(oldContent, newContent);
            mergedChanges.push(...blockChanges);
            this.logger.debug(`Detected ${mergedChanges.length} content changes`);
            return mergedChanges;
        }
        catch (error) {
            this.logger.error('Content change detection failed:', error);
            return [];
        }
    }
    /**
     * Detect semantic changes using AI analysis
     */
    async detectSemanticChanges(oldContent, newContent) {
        const changes = [];
        try {
            // Generate semantic fingerprints for both versions
            const [oldFingerprint, newFingerprint] = await Promise.all([
                this.semanticFingerprintGenerator.generateFingerprint(oldContent),
                this.semanticFingerprintGenerator.generateFingerprint(newContent)
            ]);
            // Compare fingerprints
            const comparison = await this.semanticFingerprintGenerator.compareFingerprints(oldFingerprint, newFingerprint);
            // Analyze concept changes
            const conceptChanges = this.analyzeConceptChanges(oldFingerprint.concepts, newFingerprint.concepts);
            changes.push(...conceptChanges);
            // Detect meaning shifts using AI analysis
            const meaningShifts = await this.detectMeaningShifts(oldContent, newContent);
            changes.push(...meaningShifts);
            // Detect intent changes
            const intentChanges = await this.detectIntentChanges(oldContent, newContent);
            changes.push(...intentChanges);
            // Use chunk-level semantic analysis for more granular detection
            const chunkChanges = await this.detectChunkSemanticChanges(oldContent, newContent);
            changes.push(...chunkChanges);
            this.logger.debug(`Detected ${changes.length} semantic changes`, {
                conceptChanges: conceptChanges.length,
                meaningShifts: meaningShifts.length,
                intentChanges: intentChanges.length,
                chunkChanges: chunkChanges.length
            });
            return changes;
        }
        catch (error) {
            this.logger.error('Semantic change detection failed:', error);
            return [];
        }
    }
    /**
     * Parse structural elements from content
     */
    parseStructuralElements(content) {
        const elements = [];
        const lines = content.split('\n');
        let position = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed) {
                position += line.length + 1; // +1 for newline
                continue;
            }
            // Detect headings (Markdown style)
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                elements.push({
                    type: 'heading',
                    level: headingMatch[1].length,
                    content: headingMatch[2],
                    position,
                    id: `heading_${i}`
                });
            }
            // Detect code blocks
            else if (trimmed.startsWith('```') || trimmed.startsWith('    ')) {
                elements.push({
                    type: 'code',
                    content: trimmed,
                    position,
                    id: `code_${i}`
                });
            }
            // Detect lists
            else if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
                elements.push({
                    type: 'list',
                    content: trimmed,
                    position,
                    id: `list_${i}`
                });
            }
            // Detect links
            else if (trimmed.includes('[') && trimmed.includes('](')) {
                elements.push({
                    type: 'link',
                    content: trimmed,
                    position,
                    id: `link_${i}`
                });
            }
            // Regular paragraphs
            else {
                elements.push({
                    type: 'paragraph',
                    content: trimmed,
                    position,
                    id: `paragraph_${i}`
                });
            }
            position += line.length + 1; // +1 for newline
        }
        return elements;
    }
    /**
     * Detect heading structure changes
     */
    detectHeadingChanges(oldElements, newElements) {
        const changes = [];
        const oldHeadings = oldElements.filter(e => e.type === 'heading');
        const newHeadings = newElements.filter(e => e.type === 'heading');
        // Find heading modifications by comparing content and level
        for (const oldHeading of oldHeadings) {
            const matchingNew = newHeadings.find(h => this.calculateTextSimilarity(h.content, oldHeading.content) > 0.8);
            if (matchingNew) {
                if (matchingNew.level !== oldHeading.level) {
                    changes.push({
                        type: ChangeType.MODIFICATION,
                        scope: ChangeScope.SECTION,
                        description: 'Heading changed',
                        impact: 0.7,
                        confidence: 0.9
                    });
                }
            }
            else {
                changes.push({
                    type: ChangeType.DELETION,
                    scope: ChangeScope.SECTION,
                    description: `Section removed: H${oldHeading.level}: ${oldHeading.content}`,
                    impact: 0.8,
                    confidence: 0.8
                });
            }
        }
        // Find new headings
        for (const newHeading of newHeadings) {
            const matchingOld = oldHeadings.find(h => this.calculateTextSimilarity(h.content, newHeading.content) > 0.8);
            if (!matchingOld) {
                changes.push({
                    type: ChangeType.ADDITION,
                    scope: ChangeScope.SECTION,
                    description: `Section added: H${newHeading.level}: ${newHeading.content}`,
                    impact: 0.8,
                    confidence: 0.8
                });
            }
        }
        return changes;
    }
    /**
     * Detect section additions and removals
     */
    detectSectionChanges(oldElements, newElements) {
        const changes = [];
        // Compare section structure using sliding window approach
        const oldSections = this.groupElementsIntoSections(oldElements);
        const newSections = this.groupElementsIntoSections(newElements);
        for (const oldSection of oldSections) {
            const bestMatch = this.findBestSectionMatch(oldSection, newSections);
            if (!bestMatch || bestMatch.similarity < 0.6) {
                changes.push({
                    type: ChangeType.DELETION,
                    scope: ChangeScope.SECTION,
                    description: `Section removed: ${oldSection.heading?.content || 'unnamed section'}`,
                    impact: bestMatch ? 1 - bestMatch.similarity : 0.9,
                    confidence: bestMatch ? 1 - bestMatch.similarity : 0.9
                });
            }
        }
        for (const newSection of newSections) {
            const bestMatch = this.findBestSectionMatch(newSection, oldSections);
            if (!bestMatch || bestMatch.similarity < 0.6) {
                changes.push({
                    type: ChangeType.ADDITION,
                    scope: ChangeScope.SECTION,
                    description: `Section added: ${newSection.heading?.content || 'unnamed section'}`,
                    impact: bestMatch ? 1 - bestMatch.similarity : 0.9,
                    confidence: bestMatch ? 1 - bestMatch.similarity : 0.9
                });
            }
        }
        return changes;
    }
    /**
     * Detect section movements
     */
    detectSectionMovements(oldElements, newElements) {
        const changes = [];
        const oldSections = this.groupElementsIntoSections(oldElements);
        const newSections = this.groupElementsIntoSections(newElements);
        for (let i = 0; i < oldSections.length; i++) {
            const oldSection = oldSections[i];
            const bestMatch = this.findBestSectionMatch(oldSection, newSections);
            if (bestMatch && bestMatch.similarity > 0.8) {
                const newIndex = newSections.indexOf(bestMatch.section);
                if (Math.abs(newIndex - i) > 1) { // Significant movement
                    changes.push({
                        type: ChangeType.MOVE,
                        scope: ChangeScope.SECTION,
                        description: `Section moved: ${oldSection.heading?.content || 'unnamed section'} from position ${i} to ${newIndex}`,
                        impact: 0.6,
                        confidence: bestMatch.similarity
                    });
                }
            }
        }
        return changes;
    }
    /**
     * Detect hierarchy changes
     */
    detectHierarchyChanges(oldElements, newElements) {
        const changes = [];
        const oldHierarchy = this.buildHierarchy(oldElements);
        const newHierarchy = this.buildHierarchy(newElements);
        // Compare hierarchy structures
        const hierarchyDiff = this.compareHierarchies(oldHierarchy, newHierarchy);
        for (const diff of hierarchyDiff) {
            changes.push({
                type: ChangeType.RESTRUCTURE,
                scope: ChangeScope.SECTION,
                description: `Hierarchy changed: ${diff.section} from level ${diff.oldLevel} to ${diff.newLevel}`,
                impact: 0.7,
                confidence: 0.85
            });
        }
        return changes;
    }
    /**
     * Merge adjacent changes of the same type
     */
    mergeAdjacentChanges(changes) {
        if (changes.length <= 1)
            return changes;
        const merged = [];
        let current = { ...changes[0] };
        for (let i = 1; i < changes.length; i++) {
            const next = changes[i];
            // Check if changes are adjacent and of the same type
            if (next.type === current.type && next.scope === current.scope) {
                // Merge changes
                current.characterCount = (current.characterCount || 0) + (next.characterCount || 0);
                current.wordCount = (current.wordCount || 0) + (next.wordCount || 0);
                current.description = `${current.description} (merged with similar change)`;
                current.impact = Math.min(1.0, (current.impact + next.impact) / 2);
                current.confidence = Math.min(current.confidence, next.confidence);
            }
            else {
                merged.push(current);
                current = { ...next };
            }
        }
        merged.push(current);
        return merged;
    }
    /**
     * Detect block-level modifications
     */
    async detectBlockLevelChanges(oldContent, newContent) {
        const changes = [];
        try {
            // Split content into logical blocks (paragraphs, code blocks, etc.)
            const oldBlocks = this.splitIntoBlocks(oldContent);
            const newBlocks = this.splitIntoBlocks(newContent);
            // Compare blocks
            for (let i = 0; i < Math.max(oldBlocks.length, newBlocks.length); i++) {
                const oldBlock = oldBlocks[i];
                const newBlock = newBlocks[i];
                if (!oldBlock && newBlock) {
                    // Block added
                    const wordCount = newBlock.split(/\s+/).filter(w => w.length > 0).length;
                    const characterCount = newBlock.length;
                    changes.push({
                        type: ChangeType.ADDITION,
                        scope: ChangeScope.PARAGRAPH,
                        description: 'Block added',
                        impact: Math.min(characterCount / 1000, 1.0),
                        confidence: 0.8,
                        wordCount,
                        characterCount
                    });
                }
                else if (oldBlock && !newBlock) {
                    // Block removed
                    const wordCount = oldBlock.split(/\s+/).filter(w => w.length > 0).length;
                    const characterCount = oldBlock.length;
                    changes.push({
                        type: ChangeType.DELETION,
                        scope: ChangeScope.PARAGRAPH,
                        description: 'Block removed',
                        impact: Math.min(characterCount / 1000, 1.0),
                        confidence: 0.8,
                        wordCount,
                        characterCount
                    });
                }
                else if (oldBlock && newBlock && oldBlock !== newBlock) {
                    // Block modified
                    const similarity = this.calculateTextSimilarity(oldBlock, newBlock);
                    if (similarity < 0.8) { // Significant change
                        const wordCount = newBlock.split(/\s+/).filter(w => w.length > 0).length;
                        const characterCount = newBlock.length;
                        changes.push({
                            type: ChangeType.MODIFICATION,
                            scope: ChangeScope.PARAGRAPH,
                            description: 'Block modified',
                            impact: 1 - similarity,
                            confidence: 1 - similarity,
                            wordCount,
                            characterCount
                        });
                    }
                }
            }
            return changes;
        }
        catch (error) {
            this.logger.error('Block-level change detection failed:', error);
            return [];
        }
    }
    /**
     * Analyze concept changes between fingerprints
     */
    analyzeConceptChanges(oldConcepts, newConcepts) {
        const changes = [];
        const oldSet = new Set(oldConcepts.map(c => c.toLowerCase()));
        const newSet = new Set(newConcepts.map(c => c.toLowerCase()));
        // Find removed concepts
        for (const concept of oldConcepts) {
            if (!newSet.has(concept.toLowerCase())) {
                changes.push({
                    type: ChangeType.DELETION,
                    scope: ChangeScope.SEMANTIC,
                    description: `Concept removed: ${concept}`,
                    impact: 0.6,
                    confidence: 0.8
                });
            }
        }
        // Find added concepts
        for (const concept of newConcepts) {
            if (!oldSet.has(concept.toLowerCase())) {
                changes.push({
                    type: ChangeType.ADDITION,
                    scope: ChangeScope.SEMANTIC,
                    description: `Concept added: ${concept}`,
                    impact: 0.6,
                    confidence: 0.8
                });
            }
        }
        return changes;
    }
    /**
     * Detect meaning shifts using AI analysis
     */
    async detectMeaningShifts(oldContent, newContent) {
        const changes = [];
        try {
            // Use AI to analyze semantic similarity
            const similarity = await this.aiAnalysisService.calculateSemanticSimilarity(oldContent, newContent);
            if (similarity < 0.8) {
                changes.push({
                    type: ChangeType.MODIFICATION,
                    scope: ChangeScope.SEMANTIC,
                    description: 'Overall document meaning shifted',
                    impact: 1 - similarity,
                    confidence: 1 - similarity
                });
            }
            return changes;
        }
        catch (error) {
            this.logger.warn('AI meaning shift detection failed:', error);
            return [];
        }
    }
    /**
     * Detect intent changes
     */
    async detectIntentChanges(oldContent, newContent) {
        const changes = [];
        try {
            // Analyze document intent using patterns and AI
            const oldIntent = await this.extractDocumentIntent(oldContent);
            const newIntent = await this.extractDocumentIntent(newContent);
            if (oldIntent !== newIntent) {
                changes.push({
                    type: ChangeType.MODIFICATION,
                    scope: ChangeScope.SEMANTIC,
                    description: `Document intent changed from ${oldIntent} to ${newIntent}`,
                    impact: 0.8,
                    confidence: 0.7
                });
            }
            return changes;
        }
        catch (error) {
            this.logger.warn('Intent change detection failed:', error);
            return [];
        }
    }
    /**
     * Detect chunk-level semantic changes
     */
    async detectChunkSemanticChanges(oldContent, newContent) {
        const changes = [];
        try {
            // This would integrate with semantic chunking service
            // For now, implement a simplified version
            const oldSections = oldContent.split(/\n\s*\n/);
            const newSections = newContent.split(/\n\s*\n/);
            for (let i = 0; i < Math.min(oldSections.length, newSections.length); i++) {
                if (oldSections[i].trim() && newSections[i].trim()) {
                    try {
                        const similarity = await this.aiAnalysisService.calculateSemanticSimilarity(oldSections[i], newSections[i]);
                        if (similarity < 0.7) {
                            changes.push({
                                type: ChangeType.MODIFICATION,
                                scope: ChangeScope.SEMANTIC,
                                description: `Section ${i} meaning shifted`,
                                impact: (1 - similarity) * 0.8,
                                confidence: 1 - similarity
                            });
                        }
                    }
                    catch (error) {
                        // Skip this section if AI analysis fails
                        continue;
                    }
                }
            }
            return changes;
        }
        catch (error) {
            this.logger.warn('Chunk semantic change detection failed:', error);
            return [];
        }
    }
    /**
     * Calculate overall change score
     */
    calculateOverallChangeScore(evolution, options) {
        let score = 0;
        let totalWeight = 0;
        // Weight structural changes
        const structuralScore = Math.min(evolution.structuralChanges.length / 10, 1);
        score += structuralScore * 0.3;
        totalWeight += 0.3;
        // Weight content changes
        const contentScore = Math.min(evolution.contentChanges.length / 20, 1);
        score += contentScore * 0.4;
        totalWeight += 0.4;
        // Weight semantic changes based on analysis depth
        if (options.analysisDepth === 'deep') {
            const semanticScore = Math.min(evolution.semanticChanges.length / 15, 1);
            score += semanticScore * 0.3;
            totalWeight += 0.3;
        }
        return totalWeight > 0 ? score / totalWeight : 0;
    }
    // Helper methods
    calculateTextSimilarity(text1, text2) {
        if (text1 === text2)
            return 1;
        if (!text1 || !text2)
            return 0;
        const longer = text1.length > text2.length ? text1 : text2;
        const shorter = text1.length > text2.length ? text2 : text1;
        if (longer.length === 0)
            return 1;
        const editDistance = this.calculateEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    calculateEditDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    groupElementsIntoSections(elements) {
        const sections = [];
        let currentSection = null;
        for (const element of elements) {
            if (element.type === 'heading') {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: element,
                    elements: [],
                    startPosition: element.position
                };
            }
            else if (currentSection) {
                currentSection.elements.push(element);
            }
            else {
                // Create implicit section for content before first heading
                currentSection = {
                    heading: null,
                    elements: [element],
                    startPosition: element.position
                };
            }
        }
        if (currentSection) {
            sections.push(currentSection);
        }
        return sections;
    }
    findBestSectionMatch(section, sections) {
        let bestMatch = null;
        let bestSimilarity = 0;
        for (const candidate of sections) {
            const similarity = this.calculateSectionSimilarity(section, candidate);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = candidate;
            }
        }
        return bestMatch ? { section: bestMatch, similarity: bestSimilarity } : null;
    }
    calculateSectionSimilarity(section1, section2) {
        let similarity = 0;
        let factors = 0;
        // Compare headings
        if (section1.heading && section2.heading) {
            similarity += this.calculateTextSimilarity(section1.heading.content, section2.heading.content) * 0.5;
            factors += 0.5;
        }
        else if (!section1.heading && !section2.heading) {
            similarity += 0.3; // Both are implicit sections
            factors += 0.3;
        }
        // Compare content
        const content1 = section1.elements.map((e) => e.content).join(' ');
        const content2 = section2.elements.map((e) => e.content).join(' ');
        if (content1 && content2) {
            similarity += this.calculateTextSimilarity(content1, content2) * 0.5;
            factors += 0.5;
        }
        return factors > 0 ? similarity / factors : 0;
    }
    serializeSection(section) {
        const heading = section.heading ? `${section.heading.content}\n` : '';
        const content = section.elements.map((e) => e.content).join('\n');
        return heading + content;
    }
    buildHierarchy(elements) {
        const hierarchy = [];
        const stack = [];
        for (const element of elements) {
            if (element.type === 'heading') {
                const node = {
                    element,
                    level: element.level || 1,
                    children: []
                };
                // Find correct parent in stack
                while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
                    stack.pop();
                }
                if (stack.length > 0) {
                    stack[stack.length - 1].children.push(node);
                }
                else {
                    hierarchy.push(node);
                }
                stack.push(node);
            }
        }
        return hierarchy;
    }
    compareHierarchies(oldHierarchy, newHierarchy) {
        const changes = [];
        // This is a simplified implementation
        // In practice, you'd want more sophisticated hierarchy comparison
        return changes;
    }
    splitIntoBlocks(content) {
        return content.split(/\n\s*\n/).filter(block => block.trim().length > 0);
    }
    calculateBlockPosition(blocks, index) {
        let position = 0;
        for (let i = 0; i < index; i++) {
            position += blocks[i].length + 2; // +2 for double newline
        }
        return position;
    }
    async extractDocumentIntent(content) {
        // Simple intent extraction based on patterns
        // In practice, this would use more sophisticated AI analysis
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('tutorial') || lowerContent.includes('how to')) {
            return 'tutorial';
        }
        else if (lowerContent.includes('api') || lowerContent.includes('reference')) {
            return 'reference';
        }
        else if (lowerContent.includes('guide') || lowerContent.includes('overview')) {
            return 'guide';
        }
        else if (lowerContent.includes('specification') || lowerContent.includes('spec')) {
            return 'specification';
        }
        else {
            return 'general';
        }
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new VersionTrackingError('SERVICE_NOT_INITIALIZED', 'DocumentEvolutionDetector not initialized. Call initialize() first.');
        }
    }
    /**
     * Detect changes between two content versions
     */
    async detectChanges(oldContent, newContent) {
        this.ensureInitialized();
        try {
            const documentId = 'temp_comparison';
            const timestamp = new Date().toISOString();
            // Use our existing content evolution detection
            const evolution = await this.detectContentEvolution(oldContent, newContent);
            // Map to expected interface
            const changes = evolution.contentChanges.map(change => ({
                id: `change_${Date.now()}_${Math.random()}`,
                type: change.type,
                scope: change.scope,
                confidence: change.confidence,
                impact: change.impact,
                description: change.description,
                timestamp,
                metadata: {},
                changeType: change.type,
                changeScope: change.scope,
                affectedChunks: [],
                changeLocation: `position_${change.characterCount || 0}`
            }));
            return {
                documentId,
                changes,
                summary: {
                    totalChanges: changes.length,
                    changeTypes: Array.from(new Set(changes.map(c => c.type))),
                    averageConfidence: changes.reduce((sum, c) => sum + c.confidence, 0) / (changes.length || 1),
                    detectionOptions: this.DEFAULT_OPTIONS
                },
                timestamp
            };
        }
        catch (error) {
            this.logger.error('Change detection failed:', error);
            throw new VersionTrackingError('CHANGE_DETECTION_FAILED', `Change detection failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Detect incremental changes for a document
     */
    async detectIncrementalChanges(documentId, fromVersion) {
        this.ensureInitialized();
        try {
            const timestamp = new Date().toISOString();
            // This is a simplified implementation
            // In a real system, you'd fetch the actual document versions
            const changes = [];
            return {
                changes,
                metrics: {
                    totalChanges: 0,
                    changeTypes: {},
                    averageConfidence: 0
                },
                timestamp
            };
        }
        catch (error) {
            this.logger.error('Incremental change detection failed:', error);
            throw new VersionTrackingError('INCREMENTAL_DETECTION_FAILED', `Incremental change detection failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Shutdown service
     */
    async shutdown() {
        this.initialized = false;
        this.logger.info('DocumentEvolutionDetector shutdown complete');
    }
}
export default DocumentEvolutionDetector;
//# sourceMappingURL=DocumentEvolutionDetector.js.map