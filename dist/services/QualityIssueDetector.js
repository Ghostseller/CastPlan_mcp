import { v4 as uuidv4 } from 'uuid';
/**
 * Quality Issue Detector - Phase 4 Week 2
 *
 * Automatic detection and classification of quality issues in CastPlan MCP documents
 * Identifies gaps, inconsistencies, outdated content, and other quality problems
 *
 * Features:
 * - Automatic issue detection with AI-powered analysis
 * - Multi-level issue classification (critical, high, medium, low)
 * - Pattern-based and semantic issue identification
 * - Integration with QualityAssessmentEngine for comprehensive analysis
 * - Batch processing capabilities for large document sets
 *
 * Integration points:
 * - AIAnalysisService for AI-powered issue detection
 * - SemanticChunkingService for chunk-level analysis
 * - QualityAssessmentEngine for quality context
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
// =============================================================================
// TYPES AND INTERFACES
// =============================================================================
export var IssueType;
(function (IssueType) {
    IssueType["CONTENT_GAP"] = "content_gap";
    IssueType["INCONSISTENCY"] = "inconsistency";
    IssueType["OUTDATED_CONTENT"] = "outdated_content";
    IssueType["STRUCTURAL_ISSUE"] = "structural_issue";
    IssueType["CLARITY_ISSUE"] = "clarity_issue";
    IssueType["ACCURACY_ISSUE"] = "accuracy_issue";
    IssueType["RELEVANCE_ISSUE"] = "relevance_issue";
    IssueType["DUPLICATION"] = "duplication";
    IssueType["BROKEN_REFERENCE"] = "broken_reference";
    IssueType["FORMATTING_ISSUE"] = "formatting_issue";
    IssueType["TECHNICAL_DEBT"] = "technical_debt";
    IssueType["COMPLIANCE_ISSUE"] = "compliance_issue"; // Standards or guideline violations
})(IssueType || (IssueType = {}));
export var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["CRITICAL"] = "critical";
    IssueSeverity["HIGH"] = "high";
    IssueSeverity["MEDIUM"] = "medium";
    IssueSeverity["LOW"] = "low"; // Minor quality improvement
})(IssueSeverity || (IssueSeverity = {}));
export var IssueScope;
(function (IssueScope) {
    IssueScope["DOCUMENT"] = "document";
    IssueScope["SECTION"] = "section";
    IssueScope["CHUNK"] = "chunk";
    IssueScope["PARAGRAPH"] = "paragraph";
    IssueScope["SENTENCE"] = "sentence"; // Sentence-level issue
})(IssueScope || (IssueScope = {}));
// =============================================================================
// QUALITY ISSUE DETECTOR IMPLEMENTATION
// =============================================================================
export class QualityIssueDetector {
    logger;
    aiAnalysisService;
    semanticChunkingService;
    qualityAssessmentEngine;
    initialized = false;
    // Built-in issue patterns
    ISSUE_PATTERNS = [
        {
            name: 'todo_items',
            pattern: /\b(TODO|FIXME|XXX|HACK)\b/i,
            issueType: IssueType.TECHNICAL_DEBT,
            severity: IssueSeverity.MEDIUM,
            description: 'Unfinished work items detected',
            suggestion: 'Complete or remove TODO/FIXME items before publishing'
        },
        {
            name: 'broken_links',
            pattern: /\[.*?\]\((?:https?:\/\/)?(?:www\.)?[^\s)]+\)/g,
            issueType: IssueType.BROKEN_REFERENCE,
            severity: IssueSeverity.HIGH,
            description: 'Potentially broken or invalid links',
            suggestion: 'Verify all links are accessible and valid'
        },
        {
            name: 'empty_sections',
            pattern: /^#+\s+.+\n\s*(?=^#+|\Z)/gm,
            issueType: IssueType.CONTENT_GAP,
            severity: IssueSeverity.HIGH,
            description: 'Empty sections with no content',
            suggestion: 'Add content to empty sections or remove unnecessary headings'
        },
        {
            name: 'placeholder_content',
            pattern: /\b(lorem ipsum|placeholder|tbd|to be determined|coming soon)\b/i,
            issueType: IssueType.CONTENT_GAP,
            severity: IssueSeverity.CRITICAL,
            description: 'Placeholder content found',
            suggestion: 'Replace placeholder content with actual information'
        },
        {
            name: 'excessive_capitalization',
            pattern: /\b[A-Z]{3,}\b/g,
            issueType: IssueType.FORMATTING_ISSUE,
            severity: IssueSeverity.LOW,
            description: 'Excessive use of capital letters',
            suggestion: 'Use proper capitalization for better readability'
        },
        {
            name: 'very_long_sentences',
            pattern: /[^.!?]{150,}[.!?]/g,
            issueType: IssueType.CLARITY_ISSUE,
            severity: IssueSeverity.MEDIUM,
            description: 'Very long sentences detected',
            suggestion: 'Break down long sentences for better readability'
        },
        {
            name: 'repeated_words',
            pattern: /\b(\w+)\s+\1\b/gi,
            issueType: IssueType.DUPLICATION,
            severity: IssueSeverity.LOW,
            description: 'Repeated words found',
            suggestion: 'Remove duplicate words'
        },
        {
            name: 'inconsistent_terminology',
            pattern: /(API|Api|api)|(JSON|Json|json)|(HTTP|Http|http)/g,
            issueType: IssueType.INCONSISTENCY,
            severity: IssueSeverity.MEDIUM,
            description: 'Inconsistent terminology capitalization',
            suggestion: 'Use consistent capitalization for technical terms'
        }
    ];
    // Severity scoring thresholds
    SEVERITY_THRESHOLDS = {
        critical: 0.9,
        high: 0.7,
        medium: 0.4,
        low: 0.0
    };
    constructor(logger, aiAnalysisService, semanticChunkingService, qualityAssessmentEngine) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticChunkingService = semanticChunkingService;
        this.qualityAssessmentEngine = qualityAssessmentEngine;
    }
    /**
     * Initialize the Quality Issue Detector
     */
    async initialize() {
        try {
            this.logger.info('Initializing Quality Issue Detector...');
            // Verify dependencies are ready
            // Services should already be initialized by calling code
            this.initialized = true;
            this.logger.info('Quality Issue Detector initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Quality Issue Detector:', error);
            throw error;
        }
    }
    /**
     * Detect quality issues in a document
     */
    async detectDocumentIssues(documentId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting issue detection for document: ${documentId}`);
            // Get document chunks
            const chunks = await this.semanticChunkingService.getChunksByDocument(documentId);
            if (chunks.length === 0) {
                throw new Error(`No chunks found for document: ${documentId}`);
            }
            // Combine all content for document-level analysis
            const documentContent = chunks.map(chunk => chunk.content).join('\n\n');
            // Get quality assessment for context
            let qualityAssessment = null;
            try {
                qualityAssessment = await this.qualityAssessmentEngine.assessDocumentQuality(documentId, {
                    includeAIInsights: options.enableAIDetection
                });
            }
            catch (error) {
                this.logger.warn('Failed to get quality assessment for context:', error);
            }
            // Detect issues using multiple methods
            const allIssues = [];
            const detectionStats = {
                aiDetected: 0,
                patternDetected: 0,
                semanticDetected: 0,
                statisticalDetected: 0
            };
            // 1. Pattern-based detection
            if (options.enablePatternDetection !== false) {
                const patternIssues = await this.detectPatternIssues(documentContent, documentId, 'document');
                allIssues.push(...patternIssues);
                detectionStats.patternDetected = patternIssues.length;
            }
            // 2. AI-powered detection
            if (options.enableAIDetection !== false) {
                const aiIssues = await this.detectAIIssues(documentContent, documentId, 'document', qualityAssessment);
                allIssues.push(...aiIssues);
                detectionStats.aiDetected = aiIssues.length;
            }
            // 3. Semantic analysis detection
            if (options.enableSemanticAnalysis !== false) {
                const semanticIssues = await this.detectSemanticIssues(chunks, documentId, qualityAssessment);
                allIssues.push(...semanticIssues);
                detectionStats.semanticDetected = semanticIssues.length;
            }
            // 4. Statistical analysis detection
            if (options.enableStatisticalAnalysis !== false) {
                const statisticalIssues = await this.detectStatisticalIssues(documentContent, chunks, documentId, qualityAssessment);
                allIssues.push(...statisticalIssues);
                detectionStats.statisticalDetected = statisticalIssues.length;
            }
            // Filter by severity threshold
            const filteredIssues = this.filterIssuesBySeverity(allIssues, options.severityThreshold);
            // Remove duplicates and consolidate similar issues
            const consolidatedIssues = this.consolidateIssues(filteredIssues);
            // Calculate statistics
            const issuesBySeverity = this.calculateIssuesBySeverity(consolidatedIssues);
            const issuesByType = this.calculateIssuesByType(consolidatedIssues);
            const result = {
                documentId,
                totalIssues: consolidatedIssues.length,
                issuesBySeverity,
                issuesByType,
                issues: consolidatedIssues,
                processingTime: Date.now() - startTime,
                detectionStats
            };
            this.logger.info(`Issue detection completed for document ${documentId}: ${consolidatedIssues.length} issues found`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to detect document issues:', error);
            throw error;
        }
    }
    /**
     * Detect quality issues in a chunk
     */
    async detectChunkIssues(chunkId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting issue detection for chunk: ${chunkId}`);
            // Get chunk data
            const chunk = await this.semanticChunkingService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Get quality assessment for context
            let qualityAssessment = null;
            try {
                qualityAssessment = await this.qualityAssessmentEngine.assessChunkQuality(chunkId, {
                    includeAIInsights: options.enableAIDetection
                });
            }
            catch (error) {
                this.logger.warn('Failed to get quality assessment for context:', error);
            }
            // Detect issues using multiple methods
            const allIssues = [];
            const detectionStats = {
                aiDetected: 0,
                patternDetected: 0,
                semanticDetected: 0,
                statisticalDetected: 0
            };
            // Pattern-based detection
            if (options.enablePatternDetection !== false) {
                const patternIssues = await this.detectPatternIssues(chunk.content, chunkId, 'chunk');
                allIssues.push(...patternIssues);
                detectionStats.patternDetected = patternIssues.length;
            }
            // AI-powered detection
            if (options.enableAIDetection !== false) {
                const aiIssues = await this.detectAIIssues(chunk.content, chunkId, 'chunk', qualityAssessment);
                allIssues.push(...aiIssues);
                detectionStats.aiDetected = aiIssues.length;
            }
            // Chunk-specific analysis
            const chunkSpecificIssues = await this.detectChunkSpecificIssues(chunk, qualityAssessment);
            allIssues.push(...chunkSpecificIssues);
            // Filter and consolidate
            const filteredIssues = this.filterIssuesBySeverity(allIssues, options.severityThreshold);
            const consolidatedIssues = this.consolidateIssues(filteredIssues);
            // Calculate statistics
            const issuesBySeverity = this.calculateIssuesBySeverity(consolidatedIssues);
            const issuesByType = this.calculateIssuesByType(consolidatedIssues);
            const result = {
                chunkId,
                totalIssues: consolidatedIssues.length,
                issuesBySeverity,
                issuesByType,
                issues: consolidatedIssues,
                processingTime: Date.now() - startTime,
                detectionStats
            };
            this.logger.info(`Issue detection completed for chunk ${chunkId}: ${consolidatedIssues.length} issues found`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to detect chunk issues:', error);
            throw error;
        }
    }
    /**
     * Batch issue detection for multiple entities
     */
    async detectBatchIssues(entityIds, entityType, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Starting batch issue detection for ${entityIds.length} ${entityType}s`);
            const batchDetection = {
                id: uuidv4(),
                totalEntities: entityIds.length,
                processedEntities: 0,
                results: [],
                overallStats: {
                    totalIssues: 0,
                    criticalIssues: 0,
                    highIssues: 0,
                    mediumIssues: 0,
                    lowIssues: 0,
                    avgIssuesPerEntity: 0
                },
                startedAt: new Date().toISOString()
            };
            // Process in batches to avoid overwhelming the system
            const batchSize = options.batchSize || 3;
            for (let i = 0; i < entityIds.length; i += batchSize) {
                const batch = entityIds.slice(i, i + batchSize);
                const batchPromises = batch.map(async (entityId) => {
                    try {
                        if (entityType === 'document') {
                            return await this.detectDocumentIssues(entityId, options);
                        }
                        else {
                            return await this.detectChunkIssues(entityId, options);
                        }
                    }
                    catch (error) {
                        this.logger.warn(`Failed to detect issues for ${entityType} ${entityId}:`, error);
                        return null;
                    }
                });
                const batchResults = await Promise.allSettled(batchPromises);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        batchDetection.results.push(result.value);
                        batchDetection.processedEntities++;
                    }
                }
                // Add small delay between batches
                if (i + batchSize < entityIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            // Calculate overall statistics
            if (batchDetection.results.length > 0) {
                batchDetection.overallStats = this.calculateBatchStatistics(batchDetection.results);
            }
            batchDetection.completedAt = new Date().toISOString();
            this.logger.info(`Batch issue detection completed: ${batchDetection.processedEntities}/${batchDetection.totalEntities} entities processed`);
            return batchDetection;
        }
        catch (error) {
            this.logger.error('Failed to perform batch issue detection:', error);
            throw error;
        }
    }
    /**
     * Get issue resolution suggestions
     */
    async getResolutionSuggestions(issueId) {
        // This would typically retrieve the issue and provide enhanced suggestions
        // For now, return a structured response
        return {
            quickFixes: ['Quick fix suggestion based on issue type'],
            detailedSolutions: ['Detailed solution based on AI analysis'],
            preventionStrategies: ['Prevention strategies to avoid similar issues'],
            estimatedEffort: 'medium',
            priority: 5
        };
    }
    // =============================================================================
    // PRIVATE DETECTION METHODS
    // =============================================================================
    /**
     * Detect issues using pattern matching
     */
    async detectPatternIssues(content, entityId, entityType) {
        const issues = [];
        for (const pattern of this.ISSUE_PATTERNS) {
            try {
                const regex = typeof pattern.pattern === 'string'
                    ? new RegExp(pattern.pattern, 'gi')
                    : pattern.pattern;
                const matches = Array.from(content.matchAll(regex));
                for (const match of matches) {
                    const issue = {
                        id: uuidv4(),
                        entityId,
                        entityType,
                        issueType: pattern.issueType,
                        severity: pattern.severity,
                        scope: this.determineScope(match[0], content),
                        title: `${pattern.name.replace(/_/g, ' ').toUpperCase()}: ${pattern.description}`,
                        description: pattern.description,
                        location: {
                            startPosition: match.index,
                            endPosition: match.index ? match.index + match[0].length : undefined
                        },
                        impact: {
                            affectedDimensions: this.getAffectedDimensions(pattern.issueType),
                            estimatedImpact: this.calculatePatternImpact(pattern.severity),
                            userExperienceImpact: this.getUXImpact(pattern.issueType, pattern.severity)
                        },
                        evidence: {
                            detectionMethod: 'pattern_matching',
                            confidence: 0.8, // Pattern matching has high confidence
                            supporting_data: {
                                matchedText: match[0],
                                pattern: pattern.pattern.toString()
                            }
                        },
                        suggestions: {
                            detailedSolution: pattern.suggestion,
                            estimatedEffort: this.getEffortEstimate(pattern.severity),
                            priority: this.calculatePriority(pattern.severity, pattern.issueType)
                        },
                        metadata: {
                            detectedAt: new Date().toISOString(),
                            detectionVersion: '1.0.0',
                            tags: [pattern.name, entityType],
                            context: {
                                patternName: pattern.name
                            }
                        },
                        status: 'detected'
                    };
                    issues.push(issue);
                }
            }
            catch (error) {
                this.logger.warn(`Failed to apply pattern ${pattern.name}:`, error);
            }
        }
        return issues;
    }
    /**
     * Detect issues using AI analysis
     */
    async detectAIIssues(content, entityId, entityType, qualityAssessment) {
        const issues = [];
        try {
            // Use AI analysis to identify potential issues
            const insights = await this.aiAnalysisService.generateInsights(entityId);
            // Convert insights to issues if they indicate problems
            for (const insight of insights) {
                if (this.isNegativeInsight(insight)) {
                    const issue = await this.convertInsightToIssue(insight, entityId, entityType, content, qualityAssessment);
                    if (issue) {
                        issues.push(issue);
                    }
                }
            }
            // Use quality assessment to identify dimension-specific issues
            if (qualityAssessment) {
                const dimensionIssues = this.identifyDimensionIssues(qualityAssessment, entityId, entityType, content);
                issues.push(...dimensionIssues);
            }
        }
        catch (error) {
            this.logger.warn('AI issue detection failed:', error);
        }
        return issues;
    }
    /**
     * Detect semantic issues using chunk relationships and topics
     */
    async detectSemanticIssues(chunks, documentId, qualityAssessment) {
        const issues = [];
        try {
            // Check for semantic inconsistencies between chunks
            for (const chunk of chunks) {
                // Get similar chunks
                const similarChunks = await this.semanticChunkingService.findSimilarChunks(chunk.id, 0.8, 5);
                // Check for potential duplications
                for (const similar of similarChunks) {
                    if (similar.similarity > 0.9) {
                        const issue = {
                            id: uuidv4(),
                            entityId: documentId,
                            entityType: 'document',
                            issueType: IssueType.DUPLICATION,
                            severity: IssueSeverity.MEDIUM,
                            scope: IssueScope.CHUNK,
                            title: 'Potential Content Duplication',
                            description: `Chunks "${chunk.id}" and "${similar.chunk.id}" have very similar content`,
                            location: {
                                chunkId: chunk.id
                            },
                            impact: {
                                affectedDimensions: ['consistency', 'clarity'],
                                estimatedImpact: 0.3,
                                userExperienceImpact: 'Redundant information may confuse readers'
                            },
                            evidence: {
                                detectionMethod: 'semantic_analysis',
                                confidence: similar.similarity,
                                supporting_data: {
                                    similarChunkId: similar.chunk.id,
                                    similarity: similar.similarity
                                }
                            },
                            suggestions: {
                                detailedSolution: 'Review and consolidate similar content sections',
                                estimatedEffort: 'medium',
                                priority: 6
                            },
                            metadata: {
                                detectedAt: new Date().toISOString(),
                                detectionVersion: '1.0.0',
                                tags: ['semantic', 'duplication', 'document'],
                                context: {
                                    relatedChunkId: similar.chunk.id
                                }
                            },
                            status: 'detected'
                        };
                        issues.push(issue);
                    }
                }
            }
            // Check for topic coherence issues
            const topicIssues = await this.detectTopicCoherenceIssues(chunks, documentId);
            issues.push(...topicIssues);
        }
        catch (error) {
            this.logger.warn('Semantic issue detection failed:', error);
        }
        return issues;
    }
    /**
     * Detect statistical issues using content analysis
     */
    async detectStatisticalIssues(content, chunks, documentId, qualityAssessment) {
        const issues = [];
        try {
            // Analyze content statistics
            const stats = this.calculateContentStatistics(content, chunks);
            // Check for statistical anomalies
            if (stats.avgWordsPerSentence > 30) {
                issues.push(this.createStatisticalIssue(documentId, IssueType.CLARITY_ISSUE, IssueSeverity.MEDIUM, 'Sentences Too Long', `Average sentence length is ${stats.avgWordsPerSentence.toFixed(1)} words, which may reduce readability`, 'Break down complex sentences into shorter, clearer statements'));
            }
            if (stats.readabilityScore < 0.4) {
                issues.push(this.createStatisticalIssue(documentId, IssueType.CLARITY_ISSUE, IssueSeverity.HIGH, 'Poor Readability', `Content readability score is ${(stats.readabilityScore * 100).toFixed(1)}%, indicating difficulty in understanding`, 'Simplify language and sentence structure to improve readability'));
            }
            if (stats.chunkSizeVariance > 10000) {
                issues.push(this.createStatisticalIssue(documentId, IssueType.STRUCTURAL_ISSUE, IssueSeverity.MEDIUM, 'Inconsistent Section Lengths', 'Document sections vary significantly in length, affecting readability flow', 'Balance section lengths for consistent reading experience'));
            }
        }
        catch (error) {
            this.logger.warn('Statistical issue detection failed:', error);
        }
        return issues;
    }
    /**
     * Detect chunk-specific issues
     */
    async detectChunkSpecificIssues(chunk, qualityAssessment) {
        const issues = [];
        // Check chunk quality score
        if (chunk.qualityScore < 0.3) {
            issues.push({
                id: uuidv4(),
                entityId: chunk.id,
                entityType: 'chunk',
                issueType: IssueType.CONTENT_GAP,
                severity: IssueSeverity.HIGH,
                scope: IssueScope.CHUNK,
                title: 'Low Quality Chunk',
                description: `Chunk has low quality score: ${(chunk.qualityScore * 100).toFixed(1)}%`,
                location: {
                    chunkId: chunk.id
                },
                impact: {
                    affectedDimensions: ['clarity', 'completeness', 'accuracy'],
                    estimatedImpact: 1 - chunk.qualityScore,
                    userExperienceImpact: 'Poor content quality affects user understanding'
                },
                evidence: {
                    detectionMethod: 'statistical_analysis',
                    confidence: 0.8,
                    supporting_data: {
                        qualityScore: chunk.qualityScore,
                        qualityMetrics: chunk.qualityMetrics
                    }
                },
                suggestions: {
                    detailedSolution: 'Review and improve chunk content quality',
                    estimatedEffort: 'high',
                    priority: 8
                },
                metadata: {
                    detectedAt: new Date().toISOString(),
                    detectionVersion: '1.0.0',
                    tags: ['quality', 'chunk'],
                },
                status: 'detected'
            });
        }
        // Check for very short chunks
        if (chunk.content.split(/\s+/).length < 20) {
            issues.push({
                id: uuidv4(),
                entityId: chunk.id,
                entityType: 'chunk',
                issueType: IssueType.CONTENT_GAP,
                severity: IssueSeverity.MEDIUM,
                scope: IssueScope.CHUNK,
                title: 'Very Short Content',
                description: 'Chunk content is very brief and may lack sufficient detail',
                location: {
                    chunkId: chunk.id
                },
                impact: {
                    affectedDimensions: ['completeness'],
                    estimatedImpact: 0.4,
                    userExperienceImpact: 'Users may not get enough information'
                },
                evidence: {
                    detectionMethod: 'statistical_analysis',
                    confidence: 0.9,
                    supporting_data: {
                        wordCount: chunk.content.split(/\s+/).length
                    }
                },
                suggestions: {
                    detailedSolution: 'Expand content with more details, examples, or explanations',
                    estimatedEffort: 'medium',
                    priority: 5
                },
                metadata: {
                    detectedAt: new Date().toISOString(),
                    detectionVersion: '1.0.0',
                    tags: ['content', 'length', 'chunk'],
                },
                status: 'detected'
            });
        }
        return issues;
    }
    /**
     * Detect topic coherence issues
     */
    async detectTopicCoherenceIssues(chunks, documentId) {
        const issues = [];
        try {
            // Get topics for all chunks
            const chunkTopics = new Map();
            for (const chunk of chunks) {
                try {
                    const topics = await this.semanticChunkingService.getTopicsByChunk(chunk.id);
                    chunkTopics.set(chunk.id, topics.map(t => t.topicName));
                }
                catch (error) {
                    this.logger.debug(`Could not get topics for chunk ${chunk.id}:`, error);
                }
            }
            // Analyze topic distribution and coherence
            const allTopics = Array.from(chunkTopics.values()).flat();
            const topicFreq = new Map();
            allTopics.forEach(topic => {
                topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
            });
            // Identify orphaned topics (appearing in only one chunk)
            const orphanedTopics = Array.from(topicFreq.entries())
                .filter(([_, count]) => count === 1)
                .map(([topic, _]) => topic);
            if (orphanedTopics.length > allTopics.length * 0.3) {
                issues.push({
                    id: uuidv4(),
                    entityId: documentId,
                    entityType: 'document',
                    issueType: IssueType.RELEVANCE_ISSUE,
                    severity: IssueSeverity.MEDIUM,
                    scope: IssueScope.DOCUMENT,
                    title: 'Topic Coherence Issues',
                    description: `Document has many disconnected topics (${orphanedTopics.length} orphaned topics)`,
                    location: {},
                    impact: {
                        affectedDimensions: ['relevance', 'consistency'],
                        estimatedImpact: 0.4,
                        userExperienceImpact: 'Document may seem unfocused or scattered'
                    },
                    evidence: {
                        detectionMethod: 'semantic_analysis',
                        confidence: 0.7,
                        supporting_data: {
                            orphanedTopics,
                            totalTopics: allTopics.length
                        }
                    },
                    suggestions: {
                        detailedSolution: 'Review document structure and ensure topics are well-connected',
                        estimatedEffort: 'high',
                        priority: 6
                    },
                    metadata: {
                        detectedAt: new Date().toISOString(),
                        detectionVersion: '1.0.0',
                        tags: ['semantic', 'topics', 'coherence', 'document'],
                    },
                    status: 'detected'
                });
            }
        }
        catch (error) {
            this.logger.warn('Topic coherence analysis failed:', error);
        }
        return issues;
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Calculate content statistics
     */
    calculateContentStatistics(content, chunks) {
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const wordCount = words.length;
        const sentenceCount = sentences.length;
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
        // Simple readability score (lower is harder to read)
        const readabilityScore = Math.min(1, Math.max(0, 1 - (avgWordsPerSentence - 15) / 20));
        // Calculate chunk size variance
        const chunkSizes = chunks.map(chunk => chunk.content.length);
        const avgChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length;
        const chunkSizeVariance = chunkSizes.reduce((sum, size) => sum + Math.pow(size - avgChunkSize, 2), 0) / chunkSizes.length;
        return {
            wordCount,
            sentenceCount,
            avgWordsPerSentence,
            readabilityScore,
            chunkSizeVariance
        };
    }
    /**
     * Create statistical issue
     */
    createStatisticalIssue(entityId, issueType, severity, title, description, solution) {
        return {
            id: uuidv4(),
            entityId,
            entityType: 'document',
            issueType,
            severity,
            scope: IssueScope.DOCUMENT,
            title,
            description,
            location: {},
            impact: {
                affectedDimensions: this.getAffectedDimensions(issueType),
                estimatedImpact: this.calculateSeverityImpact(severity),
                userExperienceImpact: this.getUXImpact(issueType, severity)
            },
            evidence: {
                detectionMethod: 'statistical_analysis',
                confidence: 0.8
            },
            suggestions: {
                detailedSolution: solution,
                estimatedEffort: this.getEffortEstimate(severity),
                priority: this.calculatePriority(severity, issueType)
            },
            metadata: {
                detectedAt: new Date().toISOString(),
                detectionVersion: '1.0.0',
                tags: ['statistical', 'document'],
            },
            status: 'detected'
        };
    }
    /**
     * Check if an insight indicates a problem
     */
    isNegativeInsight(insight) {
        const negativeKeywords = [
            'missing', 'lack', 'incomplete', 'unclear', 'confusing', 'poor',
            'inconsistent', 'outdated', 'incorrect', 'broken', 'error', 'issue',
            'problem', 'difficult', 'hard to', 'should improve', 'needs'
        ];
        const lowerInsight = insight.toLowerCase();
        return negativeKeywords.some(keyword => lowerInsight.includes(keyword));
    }
    /**
     * Convert AI insight to quality issue
     */
    async convertInsightToIssue(insight, entityId, entityType, content, qualityAssessment) {
        try {
            // Simple heuristic to categorize insight
            const lowerInsight = insight.toLowerCase();
            let issueType = IssueType.CONTENT_GAP;
            let severity = IssueSeverity.MEDIUM;
            if (lowerInsight.includes('missing') || lowerInsight.includes('incomplete')) {
                issueType = IssueType.CONTENT_GAP;
                severity = IssueSeverity.HIGH;
            }
            else if (lowerInsight.includes('unclear') || lowerInsight.includes('confusing')) {
                issueType = IssueType.CLARITY_ISSUE;
                severity = IssueSeverity.MEDIUM;
            }
            else if (lowerInsight.includes('inconsistent')) {
                issueType = IssueType.INCONSISTENCY;
                severity = IssueSeverity.MEDIUM;
            }
            else if (lowerInsight.includes('outdated')) {
                issueType = IssueType.OUTDATED_CONTENT;
                severity = IssueSeverity.HIGH;
            }
            else if (lowerInsight.includes('incorrect')) {
                issueType = IssueType.ACCURACY_ISSUE;
                severity = IssueSeverity.HIGH;
            }
            const issue = {
                id: uuidv4(),
                entityId,
                entityType,
                issueType,
                severity,
                scope: entityType === 'document' ? IssueScope.DOCUMENT : IssueScope.CHUNK,
                title: `AI Detected Issue: ${issueType.replace(/_/g, ' ').toUpperCase()}`,
                description: insight,
                location: {},
                impact: {
                    affectedDimensions: this.getAffectedDimensions(issueType),
                    estimatedImpact: this.calculateSeverityImpact(severity),
                    userExperienceImpact: this.getUXImpact(issueType, severity)
                },
                evidence: {
                    detectionMethod: 'ai_analysis',
                    confidence: 0.7, // AI insights have moderate confidence
                    supporting_data: {
                        originalInsight: insight,
                        qualityScore: qualityAssessment?.overallScore
                    }
                },
                suggestions: {
                    detailedSolution: this.generateSolutionFromInsight(insight, issueType),
                    estimatedEffort: this.getEffortEstimate(severity),
                    priority: this.calculatePriority(severity, issueType)
                },
                metadata: {
                    detectedAt: new Date().toISOString(),
                    detectionVersion: '1.0.0',
                    tags: ['ai', entityType],
                    context: {
                        aiInsight: insight
                    }
                },
                status: 'detected'
            };
            return issue;
        }
        catch (error) {
            this.logger.warn('Failed to convert insight to issue:', error);
            return null;
        }
    }
    /**
     * Generate solution from AI insight
     */
    generateSolutionFromInsight(insight, issueType) {
        const solutions = {
            [IssueType.CONTENT_GAP]: 'Add missing information and expand on incomplete sections',
            [IssueType.CLARITY_ISSUE]: 'Rewrite unclear sections with simpler, more direct language',
            [IssueType.INCONSISTENCY]: 'Review and align inconsistent information throughout the document',
            [IssueType.OUTDATED_CONTENT]: 'Update outdated information with current data and practices',
            [IssueType.ACCURACY_ISSUE]: 'Verify and correct potentially incorrect information',
            [IssueType.RELEVANCE_ISSUE]: 'Remove or relocate irrelevant content',
            [IssueType.STRUCTURAL_ISSUE]: 'Reorganize content for better flow and structure',
            [IssueType.DUPLICATION]: 'Remove or consolidate duplicate content',
            [IssueType.BROKEN_REFERENCE]: 'Fix or remove broken links and references',
            [IssueType.FORMATTING_ISSUE]: 'Improve formatting and presentation',
            [IssueType.TECHNICAL_DEBT]: 'Complete unfinished work items',
            [IssueType.COMPLIANCE_ISSUE]: 'Ensure compliance with relevant standards'
        };
        return solutions[issueType] || `Address the identified ${issueType.replace(/_/g, ' ')} issue: ${insight}`;
    }
    /**
     * Identify issues from quality dimensions
     */
    identifyDimensionIssues(qualityAssessment, entityId, entityType, content) {
        const issues = [];
        const dimensions = qualityAssessment.dimensions;
        // Check each dimension for issues
        Object.entries(dimensions).forEach(([dimension, score]) => {
            if (score < 0.4) { // Low quality threshold
                let issueType;
                let severity;
                switch (dimension) {
                    case 'clarity':
                        issueType = IssueType.CLARITY_ISSUE;
                        break;
                    case 'completeness':
                        issueType = IssueType.CONTENT_GAP;
                        break;
                    case 'accuracy':
                        issueType = IssueType.ACCURACY_ISSUE;
                        break;
                    case 'relevance':
                        issueType = IssueType.RELEVANCE_ISSUE;
                        break;
                    case 'consistency':
                        issueType = IssueType.INCONSISTENCY;
                        break;
                    case 'structure':
                        issueType = IssueType.STRUCTURAL_ISSUE;
                        break;
                    default:
                        return;
                }
                severity = score < 0.2 ? IssueSeverity.CRITICAL :
                    score < 0.3 ? IssueSeverity.HIGH : IssueSeverity.MEDIUM;
                const issue = {
                    id: uuidv4(),
                    entityId,
                    entityType,
                    issueType,
                    severity,
                    scope: entityType === 'document' ? IssueScope.DOCUMENT : IssueScope.CHUNK,
                    title: `Low ${dimension.charAt(0).toUpperCase() + dimension.slice(1)} Score`,
                    description: `${dimension} dimension has low quality score: ${(score * 100).toFixed(1)}%`,
                    location: {},
                    impact: {
                        affectedDimensions: [dimension],
                        estimatedImpact: 1 - score,
                        userExperienceImpact: this.getUXImpact(issueType, severity)
                    },
                    evidence: {
                        detectionMethod: 'ai_analysis',
                        confidence: qualityAssessment.confidence,
                        supporting_data: {
                            qualityAssessment: qualityAssessment.dimensions,
                            affectedDimension: dimension,
                            dimensionScore: score
                        }
                    },
                    suggestions: {
                        detailedSolution: this.getDimensionSolution(dimension),
                        estimatedEffort: this.getEffortEstimate(severity),
                        priority: this.calculatePriority(severity, issueType)
                    },
                    metadata: {
                        detectedAt: new Date().toISOString(),
                        detectionVersion: '1.0.0',
                        tags: ['quality', 'dimension', dimension, entityType],
                        context: {
                            qualityAssessmentId: qualityAssessment.id
                        }
                    },
                    status: 'detected'
                };
                issues.push(issue);
            }
        });
        return issues;
    }
    /**
     * Get solution for specific quality dimension
     */
    getDimensionSolution(dimension) {
        const solutions = {
            clarity: 'Simplify language, use shorter sentences, and provide clear explanations',
            completeness: 'Add missing information, examples, and detailed explanations',
            accuracy: 'Verify facts, update outdated information, and ensure technical correctness',
            relevance: 'Remove off-topic content and focus on relevant information',
            consistency: 'Align terminology, style, and structure throughout the content',
            structure: 'Organize content with clear headings, logical flow, and proper formatting'
        };
        return solutions[dimension] || `Improve the ${dimension} of the content`;
    }
    /**
     * Filter issues by severity threshold
     */
    filterIssuesBySeverity(issues, threshold) {
        if (!threshold)
            return issues;
        const severityOrder = {
            [IssueSeverity.CRITICAL]: 4,
            [IssueSeverity.HIGH]: 3,
            [IssueSeverity.MEDIUM]: 2,
            [IssueSeverity.LOW]: 1
        };
        const thresholdLevel = severityOrder[threshold];
        return issues.filter(issue => severityOrder[issue.severity] >= thresholdLevel);
    }
    /**
     * Consolidate similar issues
     */
    consolidateIssues(issues) {
        // Simple deduplication - in production would use more sophisticated consolidation
        const uniqueIssues = new Map();
        for (const issue of issues) {
            const key = `${issue.issueType}-${issue.entityId}-${issue.location.startPosition || 0}`;
            if (!uniqueIssues.has(key)) {
                uniqueIssues.set(key, issue);
            }
            else {
                // Merge similar issues (keep the one with higher confidence)
                const existing = uniqueIssues.get(key);
                if (issue.evidence.confidence > existing.evidence.confidence) {
                    uniqueIssues.set(key, issue);
                }
            }
        }
        return Array.from(uniqueIssues.values());
    }
    /**
     * Calculate issues by severity
     */
    calculateIssuesBySeverity(issues) {
        return {
            [IssueSeverity.CRITICAL]: issues.filter(i => i.severity === IssueSeverity.CRITICAL).length,
            [IssueSeverity.HIGH]: issues.filter(i => i.severity === IssueSeverity.HIGH).length,
            [IssueSeverity.MEDIUM]: issues.filter(i => i.severity === IssueSeverity.MEDIUM).length,
            [IssueSeverity.LOW]: issues.filter(i => i.severity === IssueSeverity.LOW).length
        };
    }
    /**
     * Calculate issues by type
     */
    calculateIssuesByType(issues) {
        const result = {};
        // Initialize all types to 0
        Object.values(IssueType).forEach(type => {
            result[type] = 0;
        });
        // Count issues by type
        issues.forEach(issue => {
            result[issue.issueType]++;
        });
        return result;
    }
    /**
     * Calculate batch statistics
     */
    calculateBatchStatistics(results) {
        const totalIssues = results.reduce((sum, result) => sum + result.totalIssues, 0);
        let criticalIssues = 0;
        let highIssues = 0;
        let mediumIssues = 0;
        let lowIssues = 0;
        results.forEach(result => {
            criticalIssues += result.issuesBySeverity[IssueSeverity.CRITICAL] || 0;
            highIssues += result.issuesBySeverity[IssueSeverity.HIGH] || 0;
            mediumIssues += result.issuesBySeverity[IssueSeverity.MEDIUM] || 0;
            lowIssues += result.issuesBySeverity[IssueSeverity.LOW] || 0;
        });
        return {
            totalIssues,
            criticalIssues,
            highIssues,
            mediumIssues,
            lowIssues,
            avgIssuesPerEntity: totalIssues / results.length
        };
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    determineScope(matchedText, content) {
        if (matchedText.length > 100)
            return IssueScope.PARAGRAPH;
        if (matchedText.includes('\n'))
            return IssueScope.SECTION;
        return IssueScope.SENTENCE;
    }
    getAffectedDimensions(issueType) {
        const mapping = {
            [IssueType.CONTENT_GAP]: ['completeness'],
            [IssueType.INCONSISTENCY]: ['consistency'],
            [IssueType.OUTDATED_CONTENT]: ['accuracy', 'relevance'],
            [IssueType.STRUCTURAL_ISSUE]: ['structure'],
            [IssueType.CLARITY_ISSUE]: ['clarity'],
            [IssueType.ACCURACY_ISSUE]: ['accuracy'],
            [IssueType.RELEVANCE_ISSUE]: ['relevance'],
            [IssueType.DUPLICATION]: ['consistency', 'clarity'],
            [IssueType.BROKEN_REFERENCE]: ['accuracy'],
            [IssueType.FORMATTING_ISSUE]: ['structure'],
            [IssueType.TECHNICAL_DEBT]: ['completeness'],
            [IssueType.COMPLIANCE_ISSUE]: ['accuracy', 'consistency']
        };
        return mapping[issueType] || [];
    }
    calculatePatternImpact(severity) {
        const impacts = {
            [IssueSeverity.CRITICAL]: 0.8,
            [IssueSeverity.HIGH]: 0.6,
            [IssueSeverity.MEDIUM]: 0.4,
            [IssueSeverity.LOW]: 0.2
        };
        return impacts[severity];
    }
    calculateSeverityImpact(severity) {
        return this.calculatePatternImpact(severity);
    }
    getUXImpact(issueType, severity) {
        const impacts = {
            [IssueType.CONTENT_GAP]: 'Users may not find the information they need',
            [IssueType.INCONSISTENCY]: 'Users may become confused by contradictory information',
            [IssueType.OUTDATED_CONTENT]: 'Users may follow incorrect or obsolete guidance',
            [IssueType.STRUCTURAL_ISSUE]: 'Users may have difficulty navigating the content',
            [IssueType.CLARITY_ISSUE]: 'Users may struggle to understand the content',
            [IssueType.ACCURACY_ISSUE]: 'Users may be misled by incorrect information',
            [IssueType.RELEVANCE_ISSUE]: 'Users may waste time on irrelevant content',
            [IssueType.DUPLICATION]: 'Users may encounter redundant information',
            [IssueType.BROKEN_REFERENCE]: 'Users cannot access referenced resources',
            [IssueType.FORMATTING_ISSUE]: 'Users may find content difficult to read',
            [IssueType.TECHNICAL_DEBT]: 'Users may encounter incomplete features',
            [IssueType.COMPLIANCE_ISSUE]: 'Content may not meet required standards'
        };
        return impacts[issueType] || 'May negatively impact user experience';
    }
    getEffortEstimate(severity) {
        const efforts = {
            [IssueSeverity.CRITICAL]: 'high',
            [IssueSeverity.HIGH]: 'medium',
            [IssueSeverity.MEDIUM]: 'medium',
            [IssueSeverity.LOW]: 'low'
        };
        return efforts[severity];
    }
    calculatePriority(severity, issueType) {
        const basePriority = {
            [IssueSeverity.CRITICAL]: 10,
            [IssueSeverity.HIGH]: 8,
            [IssueSeverity.MEDIUM]: 6,
            [IssueSeverity.LOW]: 4
        };
        const typeModifier = {
            [IssueType.ACCURACY_ISSUE]: 2,
            [IssueType.CONTENT_GAP]: 1,
            [IssueType.CLARITY_ISSUE]: 1,
            [IssueType.BROKEN_REFERENCE]: 1,
            [IssueType.INCONSISTENCY]: 0,
            [IssueType.OUTDATED_CONTENT]: 0,
            [IssueType.STRUCTURAL_ISSUE]: -1,
            [IssueType.RELEVANCE_ISSUE]: -1,
            [IssueType.DUPLICATION]: -2,
            [IssueType.FORMATTING_ISSUE]: -2,
            [IssueType.TECHNICAL_DEBT]: -1,
            [IssueType.COMPLIANCE_ISSUE]: 0
        };
        return Math.max(1, Math.min(10, basePriority[severity] + (typeModifier[issueType] || 0)));
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('QualityIssueDetector not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Quality Issue Detector...');
            this.initialized = false;
            this.logger.info('Quality Issue Detector shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during Quality Issue Detector shutdown:', error);
        }
    }
}
//# sourceMappingURL=QualityIssueDetector.js.map