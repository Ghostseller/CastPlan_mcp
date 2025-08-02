import { v4 as uuidv4 } from 'uuid';
import { IssueSeverity, IssueType } from './QualityIssueDetector.ts';
/**
 * Quality Improvement Recommender - Phase 4 Week 2
 *
 * AI-powered contextual improvement recommendations for CastPlan MCP documents
 * Provides intelligent suggestions based on quality assessments, detected issues,
 * and historical improvement patterns.
 *
 * Features:
 * - AI-powered contextual recommendations
 * - Priority-based improvement strategies
 * - Impact estimation for suggested improvements
 * - Version-aware recommendations tracking quality evolution
 * - Batch processing for large-scale improvements
 * - Integration with existing quality assessment and issue detection
 *
 * Integration points:
 * - AIAnalysisService for AI-powered recommendations
 * - QualityAssessmentEngine for quality context
 * - QualityIssueDetector for issue-based recommendations
 * - SemanticChunkingService for granular analysis
 * - DocumentVersionService for historical context
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Quality Enhancement Team
 */
// =============================================================================
// TYPES AND INTERFACES
// =============================================================================
export var RecommendationType;
(function (RecommendationType) {
    RecommendationType["CONTENT_ENHANCEMENT"] = "content_enhancement";
    RecommendationType["STRUCTURAL_IMPROVEMENT"] = "structural_improvement";
    RecommendationType["CLARITY_OPTIMIZATION"] = "clarity_optimization";
    RecommendationType["COMPLETENESS_BOOST"] = "completeness_boost";
    RecommendationType["ACCURACY_CORRECTION"] = "accuracy_correction";
    RecommendationType["CONSISTENCY_ALIGNMENT"] = "consistency_alignment";
    RecommendationType["RELEVANCE_REFINEMENT"] = "relevance_refinement";
    RecommendationType["TECHNICAL_ENHANCEMENT"] = "technical_enhancement";
    RecommendationType["USER_EXPERIENCE_IMPROVEMENT"] = "ux_improvement";
    RecommendationType["PERFORMANCE_OPTIMIZATION"] = "performance_optimization"; // Content performance
})(RecommendationType || (RecommendationType = {}));
export var RecommendationPriority;
(function (RecommendationPriority) {
    RecommendationPriority["CRITICAL"] = "critical";
    RecommendationPriority["HIGH"] = "high";
    RecommendationPriority["MEDIUM"] = "medium";
    RecommendationPriority["LOW"] = "low";
    RecommendationPriority["OPTIONAL"] = "optional"; // Enhancement only
})(RecommendationPriority || (RecommendationPriority = {}));
export var RecommendationScope;
(function (RecommendationScope) {
    RecommendationScope["DOCUMENT"] = "document";
    RecommendationScope["SECTION"] = "section";
    RecommendationScope["CHUNK"] = "chunk";
    RecommendationScope["PARAGRAPH"] = "paragraph";
    RecommendationScope["SENTENCE"] = "sentence"; // Sentence-level recommendation
})(RecommendationScope || (RecommendationScope = {}));
// =============================================================================
// QUALITY IMPROVEMENT RECOMMENDER IMPLEMENTATION
// =============================================================================
export class QualityImprovementRecommender {
    logger;
    aiAnalysisService;
    semanticChunkingService;
    qualityAssessmentEngine;
    qualityIssueDetector;
    documentVersionService;
    initialized = false;
    // Built-in improvement strategies
    IMPROVEMENT_STRATEGIES = [
        {
            id: 'clarity_enhancement',
            name: 'Clarity Enhancement',
            description: 'Improve content clarity and readability',
            targetDimensions: ['clarity'],
            recommendationTypes: [RecommendationType.CLARITY_OPTIMIZATION],
            applicabilityRules: {
                maxQualityScore: 0.6
            },
            template: {
                titlePattern: 'Improve Content Clarity',
                descriptionPattern: 'Enhance readability and understanding of the content',
                implementationSteps: [
                    'Simplify complex sentences',
                    'Use active voice where appropriate',
                    'Add examples and explanations',
                    'Improve paragraph structure'
                ]
            }
        },
        {
            id: 'completeness_boost',
            name: 'Completeness Enhancement',
            description: 'Add missing information and expand content',
            targetDimensions: ['completeness'],
            recommendationTypes: [RecommendationType.COMPLETENESS_BOOST],
            applicabilityRules: {
                maxQualityScore: 0.7
            },
            template: {
                titlePattern: 'Expand Content Coverage',
                descriptionPattern: 'Add missing information to make content more comprehensive',
                implementationSteps: [
                    'Identify information gaps',
                    'Research missing details',
                    'Add relevant examples',
                    'Include best practices'
                ]
            }
        },
        {
            id: 'structural_improvement',
            name: 'Structure Optimization',
            description: 'Improve content organization and flow',
            targetDimensions: ['structure'],
            recommendationTypes: [RecommendationType.STRUCTURAL_IMPROVEMENT],
            applicabilityRules: {
                maxQualityScore: 0.6
            },
            template: {
                titlePattern: 'Improve Content Structure',
                descriptionPattern: 'Reorganize content for better flow and accessibility',
                implementationSteps: [
                    'Add clear headings and subheadings',
                    'Use bullet points and lists',
                    'Improve logical flow',
                    'Add table of contents if needed'
                ]
            }
        }
    ];
    // Priority scoring weights
    PRIORITY_WEIGHTS = {
        qualityImpact: 0.4, // How much it improves quality
        userImpact: 0.3, // Impact on user experience
        effortRequired: 0.2, // Less effort = higher priority
        businessValue: 0.1 // Business importance
    };
    constructor(logger, aiAnalysisService, semanticChunkingService, qualityAssessmentEngine, qualityIssueDetector, documentVersionService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticChunkingService = semanticChunkingService;
        this.qualityAssessmentEngine = qualityAssessmentEngine;
        this.qualityIssueDetector = qualityIssueDetector;
        this.documentVersionService = documentVersionService;
    }
    /**
     * Initialize the Quality Improvement Recommender
     */
    async initialize() {
        try {
            this.logger.info('Initializing Quality Improvement Recommender...');
            // Verify dependencies are ready
            // Services should already be initialized by calling code
            this.initialized = true;
            this.logger.info('Quality Improvement Recommender initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Quality Improvement Recommender:', error);
            throw error;
        }
    }
    /**
     * Generate improvement recommendations for a document
     */
    async generateDocumentRecommendations(documentId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Generating improvement recommendations for document: ${documentId}`);
            // Get quality assessment for context
            const qualityAssessment = await this.qualityAssessmentEngine.assessDocumentQuality(documentId, {
                includeAIInsights: options.enableAIRecommendations
            });
            // Get detected issues for issue-based recommendations
            const issueDetection = await this.qualityIssueDetector.detectDocumentIssues(documentId, {
                enableAIDetection: options.enableAIRecommendations
            });
            // Get document chunks for detailed analysis
            const chunks = await this.semanticChunkingService.getChunksByDocument(documentId);
            // Build context for recommendation generation
            const context = await this.buildRecommendationContext(documentId, 'document', qualityAssessment, issueDetection.issues, chunks, options);
            // Generate recommendations using multiple approaches
            const allRecommendations = [];
            // 1. Quality dimension-based recommendations
            const dimensionRecommendations = await this.generateDimensionBasedRecommendations(documentId, 'document', qualityAssessment, context, options);
            allRecommendations.push(...dimensionRecommendations);
            // 2. Issue-based recommendations
            const issueRecommendations = await this.generateIssueBasedRecommendations(documentId, 'document', issueDetection.issues, context, options);
            allRecommendations.push(...issueRecommendations);
            // 3. AI-powered contextual recommendations
            if (options.enableAIRecommendations !== false) {
                const aiRecommendations = await this.generateAIRecommendations(documentId, 'document', chunks.map(c => c.content).join('\n\n'), context, options);
                allRecommendations.push(...aiRecommendations);
            }
            // 4. Strategic improvement recommendations
            const strategicRecommendations = await this.generateStrategicRecommendations(documentId, 'document', qualityAssessment, context, options);
            allRecommendations.push(...strategicRecommendations);
            // Filter and prioritize recommendations
            const filteredRecommendations = this.filterRecommendations(allRecommendations, options);
            const prioritizedRecommendations = this.prioritizeRecommendations(filteredRecommendations, context);
            // Remove duplicates and consolidate similar recommendations
            const consolidatedRecommendations = this.consolidateRecommendations(prioritizedRecommendations);
            // Calculate statistics and roadmap
            const recommendationsByPriority = this.calculateRecommendationsByPriority(consolidatedRecommendations);
            const recommendationsByType = this.calculateRecommendationsByType(consolidatedRecommendations);
            const overallImprovementPotential = this.calculateImprovementPotential(consolidatedRecommendations);
            const estimatedTotalEffort = this.calculateTotalEffort(consolidatedRecommendations);
            const implementationRoadmap = this.createImplementationRoadmap(consolidatedRecommendations);
            const result = {
                entityId: documentId,
                entityType: 'document',
                totalRecommendations: consolidatedRecommendations.length,
                recommendationsByPriority,
                recommendationsByType,
                recommendations: consolidatedRecommendations,
                overallImprovementPotential,
                estimatedTotalEffort,
                implementationRoadmap,
                processingTime: Date.now() - startTime
            };
            this.logger.info(`Generated ${consolidatedRecommendations.length} recommendations for document ${documentId}`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to generate document recommendations:', error);
            throw error;
        }
    }
    /**
     * Generate improvement recommendations for a chunk
     */
    async generateChunkRecommendations(chunkId, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Generating improvement recommendations for chunk: ${chunkId}`);
            // Get chunk data
            const chunk = await this.semanticChunkingService.getChunkById(chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found: ${chunkId}`);
            }
            // Get quality assessment
            const qualityAssessment = await this.qualityAssessmentEngine.assessChunkQuality(chunkId, {
                includeAIInsights: options.enableAIRecommendations
            });
            // Get detected issues
            const issueDetection = await this.qualityIssueDetector.detectChunkIssues(chunkId, {
                enableAIDetection: options.enableAIRecommendations
            });
            // Build context
            const context = await this.buildRecommendationContext(chunkId, 'chunk', qualityAssessment, issueDetection.issues, [chunk], options);
            // Generate recommendations
            const allRecommendations = [];
            // Dimension-based recommendations
            const dimensionRecommendations = await this.generateDimensionBasedRecommendations(chunkId, 'chunk', qualityAssessment, context, options);
            allRecommendations.push(...dimensionRecommendations);
            // Issue-based recommendations
            const issueRecommendations = await this.generateIssueBasedRecommendations(chunkId, 'chunk', issueDetection.issues, context, options);
            allRecommendations.push(...issueRecommendations);
            // AI recommendations
            if (options.enableAIRecommendations !== false) {
                const aiRecommendations = await this.generateAIRecommendations(chunkId, 'chunk', chunk.content, context, options);
                allRecommendations.push(...aiRecommendations);
            }
            // Process and return results
            const filteredRecommendations = this.filterRecommendations(allRecommendations, options);
            const prioritizedRecommendations = this.prioritizeRecommendations(filteredRecommendations, context);
            const consolidatedRecommendations = this.consolidateRecommendations(prioritizedRecommendations);
            const result = {
                entityId: chunkId,
                entityType: 'chunk',
                totalRecommendations: consolidatedRecommendations.length,
                recommendationsByPriority: this.calculateRecommendationsByPriority(consolidatedRecommendations),
                recommendationsByType: this.calculateRecommendationsByType(consolidatedRecommendations),
                recommendations: consolidatedRecommendations,
                overallImprovementPotential: this.calculateImprovementPotential(consolidatedRecommendations),
                estimatedTotalEffort: this.calculateTotalEffort(consolidatedRecommendations),
                implementationRoadmap: this.createImplementationRoadmap(consolidatedRecommendations),
                processingTime: Date.now() - startTime
            };
            this.logger.info(`Generated ${consolidatedRecommendations.length} recommendations for chunk ${chunkId}`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to generate chunk recommendations:', error);
            throw error;
        }
    }
    /**
     * Generate batch recommendations for multiple entities
     */
    async generateBatchRecommendations(entityIds, entityType, options = {}) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Generating batch recommendations for ${entityIds.length} ${entityType}s`);
            const batchResult = {
                id: uuidv4(),
                totalEntities: entityIds.length,
                processedEntities: 0,
                results: [],
                overallStats: {
                    totalRecommendations: 0,
                    avgRecommendationsPerEntity: 0,
                    totalEstimatedEffort: 0,
                    highImpactRecommendations: 0,
                    quickWins: 0
                },
                startedAt: new Date().toISOString()
            };
            // Process in batches
            const batchSize = 3;
            for (let i = 0; i < entityIds.length; i += batchSize) {
                const batch = entityIds.slice(i, i + batchSize);
                const batchPromises = batch.map(async (entityId) => {
                    try {
                        if (entityType === 'document') {
                            return await this.generateDocumentRecommendations(entityId, options);
                        }
                        else {
                            return await this.generateChunkRecommendations(entityId, options);
                        }
                    }
                    catch (error) {
                        this.logger.warn(`Failed to generate recommendations for ${entityType} ${entityId}:`, error);
                        return null;
                    }
                });
                const batchResults = await Promise.allSettled(batchPromises);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        batchResult.results.push(result.value);
                        batchResult.processedEntities++;
                    }
                }
                // Add delay between batches
                if (i + batchSize < entityIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            // Calculate overall statistics
            if (batchResult.results.length > 0) {
                batchResult.overallStats = this.calculateBatchStatistics(batchResult.results);
            }
            batchResult.completedAt = new Date().toISOString();
            this.logger.info(`Batch recommendations completed: ${batchResult.processedEntities}/${batchResult.totalEntities} entities processed`);
            return batchResult;
        }
        catch (error) {
            this.logger.error('Failed to generate batch recommendations:', error);
            throw error;
        }
    }
    /**
     * Get implementation guidance for a specific recommendation
     */
    async getImplementationGuidance(recommendationId) {
        // This would typically retrieve the recommendation and provide enhanced guidance
        // For now, return a structured response
        return {
            detailedSteps: ['Step-by-step implementation guidance'],
            bestPractices: ['Industry best practices for this type of improvement'],
            commonPitfalls: ['Common mistakes to avoid'],
            successCriteria: ['How to measure success'],
            timelineEstimate: 'Estimated timeline based on complexity',
            requiredSkills: ['Skills needed for implementation'],
            tools: ['Recommended tools and technologies'],
            resources: ['Additional resources and references']
        };
    }
    // =============================================================================
    // PRIVATE RECOMMENDATION GENERATION METHODS
    // =============================================================================
    /**
     * Generate dimension-based recommendations
     */
    async generateDimensionBasedRecommendations(entityId, entityType, qualityAssessment, context, options) {
        const recommendations = [];
        // Analyze each quality dimension
        Object.entries(qualityAssessment.dimensions).forEach(([dimension, score]) => {
            if (score < 0.7) { // Room for improvement
                const recommendation = this.createDimensionRecommendation(entityId, entityType, dimension, score, qualityAssessment, context);
                recommendations.push(recommendation);
            }
        });
        return recommendations;
    }
    /**
     * Generate issue-based recommendations
     */
    async generateIssueBasedRecommendations(entityId, entityType, issues, context, options) {
        const recommendations = [];
        for (const issue of issues) {
            const recommendation = this.createIssueBasedRecommendation(entityId, entityType, issue, context);
            recommendations.push(recommendation);
        }
        return recommendations;
    }
    /**
     * Generate AI-powered recommendations
     */
    async generateAIRecommendations(entityId, entityType, content, context, options) {
        const recommendations = [];
        try {
            // Use AI to generate contextual insights and convert to recommendations
            const insights = await this.aiAnalysisService.generateInsights(content);
            for (const insight of insights) {
                if (this.isImprovementInsight(insight)) {
                    const recommendation = await this.convertInsightToRecommendation(insight, entityId, entityType, content, context);
                    if (recommendation) {
                        recommendations.push(recommendation);
                    }
                }
            }
        }
        catch (error) {
            this.logger.warn('AI recommendation generation failed:', error);
        }
        return recommendations;
    }
    /**
     * Generate strategic improvement recommendations
     */
    async generateStrategicRecommendations(entityId, entityType, qualityAssessment, context, options) {
        const recommendations = [];
        // Apply improvement strategies based on quality scores and context
        for (const strategy of this.IMPROVEMENT_STRATEGIES) {
            if (this.isStrategyApplicable(strategy, qualityAssessment, context)) {
                const recommendation = this.createStrategicRecommendation(entityId, entityType, strategy, qualityAssessment, context);
                recommendations.push(recommendation);
            }
        }
        return recommendations;
    }
    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================
    /**
     * Build recommendation context
     */
    async buildRecommendationContext(entityId, entityType, qualityAssessment, issues, chunks, options) {
        const context = {
            entityId,
            entityType,
            qualityAssessment,
            issues,
            chunks,
            options,
            contentLength: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
            issueCount: issues.length,
            criticalIssues: issues.filter(i => i.severity === IssueSeverity.CRITICAL).length,
            averageQualityScore: qualityAssessment.overallScore
        };
        // Add historical context if version service is available
        if (this.documentVersionService && options.historicalAnalysis) {
            try {
                // Would get historical quality trends
                context.historicalTrend = 'improving'; // Placeholder
            }
            catch (error) {
                this.logger.debug('Could not get historical context:', error);
            }
        }
        return context;
    }
    /**
     * Create dimension-based recommendation
     */
    createDimensionRecommendation(entityId, entityType, dimension, score, qualityAssessment, context) {
        const recommendationType = this.getDimensionRecommendationType(dimension);
        const priority = this.calculateDimensionPriority(dimension, score);
        return {
            id: uuidv4(),
            entityId,
            entityType,
            type: recommendationType,
            priority,
            scope: entityType === 'document' ? RecommendationScope.DOCUMENT : RecommendationScope.CHUNK,
            title: `Improve ${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`,
            description: `Current ${dimension} score is ${(score * 100).toFixed(1)}% - significant improvement opportunity`,
            rationale: this.getDimensionRationale(dimension, score),
            implementation: {
                steps: this.getDimensionImplementationSteps(dimension),
                estimatedEffort: score < 0.3 ? 'high' : score < 0.5 ? 'medium' : 'low',
                estimatedTimeMinutes: this.estimateImplementationTime(dimension, score),
                difficulty: score < 0.3 ? 'difficult' : score < 0.5 ? 'moderate' : 'easy'
            },
            impact: {
                affectedDimensions: [dimension],
                estimatedImprovement: this.estimateDimensionImprovement(dimension, score),
                userBenefit: this.getDimensionUserBenefit(dimension),
                businessValue: this.getDimensionBusinessValue(dimension),
                riskIfIgnored: this.getDimensionRisk(dimension, score)
            },
            evidence: {
                qualityScores: { [dimension]: score },
                aiConfidence: 0.8,
                supportingData: {
                    currentScore: score,
                    targetScore: Math.min(1.0, score + 0.3)
                }
            },
            context: {
                bestPracticeCategory: dimension
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                generatorVersion: '1.0.0',
                tags: ['dimension', dimension, entityType]
            },
            status: 'generated'
        };
    }
    /**
     * Create issue-based recommendation
     */
    createIssueBasedRecommendation(entityId, entityType, issue, context) {
        const recommendationType = this.getIssueRecommendationType(issue.issueType);
        const priority = this.convertSeverityToPriority(issue.severity);
        return {
            id: uuidv4(),
            entityId,
            entityType,
            type: recommendationType,
            priority,
            scope: this.convertIssueScope(issue.scope),
            title: `Fix: ${issue.title}`,
            description: issue.description,
            rationale: `Addressing this ${issue.severity} ${issue.issueType.replace(/_/g, ' ')} will improve content quality`,
            implementation: {
                steps: [issue.suggestions.detailedSolution, ...this.getAdditionalSteps(issue)],
                estimatedEffort: issue.suggestions.estimatedEffort,
                estimatedTimeMinutes: this.estimateIssueFixTime(issue),
                difficulty: this.calculateIssueDifficulty(issue)
            },
            impact: {
                affectedDimensions: issue.impact.affectedDimensions,
                estimatedImprovement: issue.impact.estimatedImpact,
                userBenefit: issue.impact.userExperienceImpact,
                businessValue: this.getIssueBusinessValue(issue),
                riskIfIgnored: this.getIssueRisk(issue)
            },
            evidence: {
                sourceIssues: [issue.id],
                aiConfidence: issue.evidence.confidence,
                supportingData: issue.evidence.supporting_data
            },
            context: {
                bestPracticeCategory: issue.issueType
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                generatorVersion: '1.0.0',
                tags: ['issue', issue.issueType, entityType]
            },
            status: 'generated'
        };
    }
    /**
     * Create strategic recommendation
     */
    createStrategicRecommendation(entityId, entityType, strategy, qualityAssessment, context) {
        return {
            id: uuidv4(),
            entityId,
            entityType,
            type: strategy.recommendationTypes[0],
            priority: this.calculateStrategicPriority(strategy, qualityAssessment),
            scope: entityType === 'document' ? RecommendationScope.DOCUMENT : RecommendationScope.CHUNK,
            title: strategy.template.titlePattern,
            description: strategy.template.descriptionPattern,
            rationale: strategy.description,
            implementation: {
                steps: strategy.template.implementationSteps,
                estimatedEffort: 'medium',
                estimatedTimeMinutes: 45,
                difficulty: 'moderate'
            },
            impact: {
                affectedDimensions: strategy.targetDimensions,
                estimatedImprovement: 0.3,
                userBenefit: 'Improved content quality and user experience',
                businessValue: 'Better user engagement and satisfaction',
                riskIfIgnored: 'Continued quality issues may affect user trust'
            },
            evidence: {
                qualityScores: qualityAssessment.dimensions,
                aiConfidence: 0.7,
                supportingData: {
                    strategy: strategy.name,
                    applicabilityScore: this.calculateApplicabilityScore(strategy, qualityAssessment)
                }
            },
            context: {
                bestPracticeCategory: strategy.name
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                generatorVersion: '1.0.0',
                tags: ['strategic', strategy.id, entityType]
            },
            status: 'generated'
        };
    }
    /**
     * Check if insight suggests improvement
     */
    isImprovementInsight(insight) {
        const improvementKeywords = [
            'could improve', 'should enhance', 'might benefit', 'consider adding',
            'would be better', 'recommend', 'suggest', 'optimize', 'enhance'
        ];
        const lowerInsight = insight.toLowerCase();
        return improvementKeywords.some(keyword => lowerInsight.includes(keyword));
    }
    /**
     * Convert AI insight to recommendation
     */
    async convertInsightToRecommendation(insight, entityId, entityType, content, context) {
        try {
            // Analyze insight to determine recommendation type
            const lowerInsight = insight.toLowerCase();
            let recommendationType = RecommendationType.CONTENT_ENHANCEMENT;
            let priority = RecommendationPriority.MEDIUM;
            if (lowerInsight.includes('structure') || lowerInsight.includes('organize')) {
                recommendationType = RecommendationType.STRUCTURAL_IMPROVEMENT;
            }
            else if (lowerInsight.includes('clear') || lowerInsight.includes('understand')) {
                recommendationType = RecommendationType.CLARITY_OPTIMIZATION;
            }
            else if (lowerInsight.includes('add') || lowerInsight.includes('missing')) {
                recommendationType = RecommendationType.COMPLETENESS_BOOST;
            }
            else if (lowerInsight.includes('accurate') || lowerInsight.includes('correct')) {
                recommendationType = RecommendationType.ACCURACY_CORRECTION;
                priority = RecommendationPriority.HIGH;
            }
            const recommendation = {
                id: uuidv4(),
                entityId,
                entityType,
                type: recommendationType,
                priority,
                scope: entityType === 'document' ? RecommendationScope.DOCUMENT : RecommendationScope.CHUNK,
                title: `AI Suggestion: ${recommendationType.replace(/_/g, ' ').toUpperCase()}`,
                description: insight,
                rationale: 'Based on AI analysis of content and context',
                implementation: {
                    steps: [insight, 'Review and implement the suggested improvement'],
                    estimatedEffort: 'medium',
                    estimatedTimeMinutes: 30,
                    difficulty: 'moderate'
                },
                impact: {
                    affectedDimensions: this.getRecommendationTypeDimensions(recommendationType),
                    estimatedImprovement: 0.2,
                    userBenefit: 'Improved content quality based on AI analysis',
                    businessValue: 'Better user experience and engagement',
                    riskIfIgnored: 'Missed opportunity for quality improvement'
                },
                evidence: {
                    aiConfidence: 0.7,
                    supportingData: {
                        aiInsight: insight,
                        contentAnalysis: 'AI-generated recommendation'
                    }
                },
                context: {
                    bestPracticeCategory: 'ai_suggested'
                },
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatorVersion: '1.0.0',
                    tags: ['ai', 'insight', entityType]
                },
                status: 'generated'
            };
            return recommendation;
        }
        catch (error) {
            this.logger.warn('Failed to convert insight to recommendation:', error);
            return null;
        }
    }
    /**
     * Filter recommendations based on options
     */
    filterRecommendations(recommendations, options) {
        let filtered = recommendations;
        // Filter by priority threshold
        if (options.priorityThreshold) {
            const priorityOrder = {
                [RecommendationPriority.CRITICAL]: 5,
                [RecommendationPriority.HIGH]: 4,
                [RecommendationPriority.MEDIUM]: 3,
                [RecommendationPriority.LOW]: 2,
                [RecommendationPriority.OPTIONAL]: 1
            };
            const threshold = priorityOrder[options.priorityThreshold];
            filtered = filtered.filter(rec => priorityOrder[rec.priority] >= threshold);
        }
        // Filter by focus areas
        if (options.focusAreas && options.focusAreas.length > 0) {
            filtered = filtered.filter(rec => rec.impact.affectedDimensions.some(dim => options.focusAreas.includes(dim)));
        }
        // Limit number of recommendations
        if (options.maxRecommendations) {
            filtered = filtered.slice(0, options.maxRecommendations);
        }
        // Filter minor improvements if disabled
        if (!options.includeMinorImprovements) {
            filtered = filtered.filter(rec => rec.priority !== RecommendationPriority.LOW &&
                rec.priority !== RecommendationPriority.OPTIONAL);
        }
        return filtered;
    }
    /**
     * Prioritize recommendations
     */
    prioritizeRecommendations(recommendations, context) {
        return recommendations.sort((a, b) => {
            const scoreA = this.calculateRecommendationScore(a, context);
            const scoreB = this.calculateRecommendationScore(b, context);
            return scoreB - scoreA; // Higher scores first
        });
    }
    /**
     * Calculate recommendation priority score
     */
    calculateRecommendationScore(recommendation, context) {
        const priorityScore = {
            [RecommendationPriority.CRITICAL]: 1.0,
            [RecommendationPriority.HIGH]: 0.8,
            [RecommendationPriority.MEDIUM]: 0.6,
            [RecommendationPriority.LOW]: 0.4,
            [RecommendationPriority.OPTIONAL]: 0.2
        }[recommendation.priority];
        const effortScore = {
            'low': 1.0,
            'medium': 0.7,
            'high': 0.4
        }[recommendation.implementation.estimatedEffort];
        const impactScore = recommendation.impact.estimatedImprovement;
        return (priorityScore * this.PRIORITY_WEIGHTS.qualityImpact +
            impactScore * this.PRIORITY_WEIGHTS.userImpact +
            effortScore * this.PRIORITY_WEIGHTS.effortRequired +
            0.5 * this.PRIORITY_WEIGHTS.businessValue // Default business value
        );
    }
    /**
     * Consolidate similar recommendations
     */
    consolidateRecommendations(recommendations) {
        // Simple deduplication based on type and entity
        const consolidatedMap = new Map();
        for (const recommendation of recommendations) {
            const key = `${recommendation.type}-${recommendation.entityId}`;
            if (!consolidatedMap.has(key)) {
                consolidatedMap.set(key, recommendation);
            }
            else {
                // Keep the higher priority recommendation
                const existing = consolidatedMap.get(key);
                if (this.comparePriority(recommendation.priority, existing.priority) > 0) {
                    consolidatedMap.set(key, recommendation);
                }
            }
        }
        return Array.from(consolidatedMap.values());
    }
    /**
     * Compare recommendation priorities
     */
    comparePriority(priority1, priority2) {
        const order = {
            [RecommendationPriority.CRITICAL]: 5,
            [RecommendationPriority.HIGH]: 4,
            [RecommendationPriority.MEDIUM]: 3,
            [RecommendationPriority.LOW]: 2,
            [RecommendationPriority.OPTIONAL]: 1
        };
        return order[priority1] - order[priority2];
    }
    // =============================================================================
    // CALCULATION AND UTILITY METHODS
    // =============================================================================
    calculateRecommendationsByPriority(recommendations) {
        return {
            [RecommendationPriority.CRITICAL]: recommendations.filter(r => r.priority === RecommendationPriority.CRITICAL).length,
            [RecommendationPriority.HIGH]: recommendations.filter(r => r.priority === RecommendationPriority.HIGH).length,
            [RecommendationPriority.MEDIUM]: recommendations.filter(r => r.priority === RecommendationPriority.MEDIUM).length,
            [RecommendationPriority.LOW]: recommendations.filter(r => r.priority === RecommendationPriority.LOW).length,
            [RecommendationPriority.OPTIONAL]: recommendations.filter(r => r.priority === RecommendationPriority.OPTIONAL).length
        };
    }
    calculateRecommendationsByType(recommendations) {
        const result = {};
        Object.values(RecommendationType).forEach(type => {
            result[type] = recommendations.filter(r => r.type === type).length;
        });
        return result;
    }
    calculateImprovementPotential(recommendations) {
        if (recommendations.length === 0)
            return 0;
        const totalImpact = recommendations.reduce((sum, rec) => sum + rec.impact.estimatedImprovement, 0);
        return Math.min(1.0, totalImpact / recommendations.length);
    }
    calculateTotalEffort(recommendations) {
        return recommendations.reduce((sum, rec) => sum + rec.implementation.estimatedTimeMinutes, 0);
    }
    createImplementationRoadmap(recommendations) {
        const phase1 = recommendations.filter(r => r.priority === RecommendationPriority.CRITICAL || r.priority === RecommendationPriority.HIGH);
        const phase2 = recommendations.filter(r => r.priority === RecommendationPriority.MEDIUM);
        const phase3 = recommendations.filter(r => r.priority === RecommendationPriority.LOW || r.priority === RecommendationPriority.OPTIONAL);
        return { phase1, phase2, phase3 };
    }
    calculateBatchStatistics(results) {
        const totalRecommendations = results.reduce((sum, result) => sum + result.totalRecommendations, 0);
        const totalEstimatedEffort = results.reduce((sum, result) => sum + result.estimatedTotalEffort, 0);
        const highImpactRecommendations = results.reduce((sum, result) => sum + result.recommendations.filter(rec => rec.impact.estimatedImprovement > 0.5).length, 0);
        const quickWins = results.reduce((sum, result) => sum + result.recommendations.filter(rec => rec.implementation.estimatedEffort === 'low' && rec.impact.estimatedImprovement > 0.3).length, 0);
        return {
            totalRecommendations,
            avgRecommendationsPerEntity: totalRecommendations / results.length,
            totalEstimatedEffort,
            highImpactRecommendations,
            quickWins
        };
    }
    // Helper methods for recommendation creation
    getDimensionRecommendationType(dimension) {
        const mapping = {
            clarity: RecommendationType.CLARITY_OPTIMIZATION,
            completeness: RecommendationType.COMPLETENESS_BOOST,
            accuracy: RecommendationType.ACCURACY_CORRECTION,
            relevance: RecommendationType.RELEVANCE_REFINEMENT,
            consistency: RecommendationType.CONSISTENCY_ALIGNMENT,
            structure: RecommendationType.STRUCTURAL_IMPROVEMENT
        };
        return mapping[dimension];
    }
    calculateDimensionPriority(dimension, score) {
        if (score < 0.2)
            return RecommendationPriority.CRITICAL;
        if (score < 0.4)
            return RecommendationPriority.HIGH;
        if (score < 0.6)
            return RecommendationPriority.MEDIUM;
        return RecommendationPriority.LOW;
    }
    getDimensionRationale(dimension, score) {
        const rationales = {
            clarity: `Content clarity needs improvement to enhance user understanding`,
            completeness: `Missing information should be added for comprehensive coverage`,
            accuracy: `Technical accuracy is crucial for user trust and effectiveness`,
            relevance: `Content should focus more on relevant information for users`,
            consistency: `Consistent terminology and style improve user experience`,
            structure: `Better organization will improve content accessibility`
        };
        return rationales[dimension];
    }
    getDimensionImplementationSteps(dimension) {
        const steps = {
            clarity: ['Simplify complex sentences', 'Use active voice', 'Add examples', 'Remove jargon'],
            completeness: ['Identify gaps', 'Add missing details', 'Include examples', 'Expand explanations'],
            accuracy: ['Verify facts', 'Update outdated info', 'Check technical details', 'Review sources'],
            relevance: ['Remove off-topic content', 'Focus on user needs', 'Align with objectives', 'Prioritize important info'],
            consistency: ['Standardize terminology', 'Align writing style', 'Use consistent formatting', 'Review tone'],
            structure: ['Add headings', 'Improve flow', 'Use lists', 'Create logical sections']
        };
        return steps[dimension];
    }
    estimateImplementationTime(dimension, score) {
        const baseTime = {
            clarity: 45,
            completeness: 60,
            accuracy: 30,
            relevance: 40,
            consistency: 35,
            structure: 25
        }[dimension];
        // More time needed for lower scores
        const multiplier = score < 0.3 ? 2 : score < 0.5 ? 1.5 : 1;
        return Math.round(baseTime * multiplier);
    }
    estimateDimensionImprovement(dimension, currentScore) {
        // Estimate how much the dimension could improve
        const maxImprovement = 1.0 - currentScore;
        const expectedImprovement = maxImprovement * 0.7; // 70% of maximum possible improvement
        return Math.min(0.5, expectedImprovement); // Cap at 50% improvement
    }
    getDimensionUserBenefit(dimension) {
        const benefits = {
            clarity: 'Users will understand content more easily',
            completeness: 'Users will get all the information they need',
            accuracy: 'Users can trust the information provided',
            relevance: 'Users will find more relevant, focused content',
            consistency: 'Users will experience consistent, professional content',
            structure: 'Users can navigate and find information more easily'
        };
        return benefits[dimension];
    }
    getDimensionBusinessValue(dimension) {
        const values = {
            clarity: 'Reduced support requests and improved user satisfaction',
            completeness: 'Better user onboarding and reduced churn',
            accuracy: 'Increased user trust and credibility',
            relevance: 'Higher user engagement and task completion',
            consistency: 'Professional brand image and user confidence',
            structure: 'Improved user experience and content discoverability'
        };
        return values[dimension];
    }
    getDimensionRisk(dimension, score) {
        if (score < 0.3) {
            return `Very low ${dimension} may significantly impact user experience and trust`;
        }
        else if (score < 0.5) {
            return `Poor ${dimension} may cause user confusion and frustration`;
        }
        else {
            return `Suboptimal ${dimension} may reduce user effectiveness`;
        }
    }
    getIssueRecommendationType(issueType) {
        const mapping = {
            [IssueType.CONTENT_GAP]: RecommendationType.COMPLETENESS_BOOST,
            [IssueType.INCONSISTENCY]: RecommendationType.CONSISTENCY_ALIGNMENT,
            [IssueType.OUTDATED_CONTENT]: RecommendationType.ACCURACY_CORRECTION,
            [IssueType.STRUCTURAL_ISSUE]: RecommendationType.STRUCTURAL_IMPROVEMENT,
            [IssueType.CLARITY_ISSUE]: RecommendationType.CLARITY_OPTIMIZATION,
            [IssueType.ACCURACY_ISSUE]: RecommendationType.ACCURACY_CORRECTION,
            [IssueType.RELEVANCE_ISSUE]: RecommendationType.RELEVANCE_REFINEMENT,
            [IssueType.DUPLICATION]: RecommendationType.CONTENT_ENHANCEMENT,
            [IssueType.BROKEN_REFERENCE]: RecommendationType.TECHNICAL_ENHANCEMENT,
            [IssueType.FORMATTING_ISSUE]: RecommendationType.STRUCTURAL_IMPROVEMENT,
            [IssueType.TECHNICAL_DEBT]: RecommendationType.TECHNICAL_ENHANCEMENT,
            [IssueType.COMPLIANCE_ISSUE]: RecommendationType.ACCURACY_CORRECTION
        };
        return mapping[issueType] || RecommendationType.CONTENT_ENHANCEMENT;
    }
    convertSeverityToPriority(severity) {
        const mapping = {
            [IssueSeverity.CRITICAL]: RecommendationPriority.CRITICAL,
            [IssueSeverity.HIGH]: RecommendationPriority.HIGH,
            [IssueSeverity.MEDIUM]: RecommendationPriority.MEDIUM,
            [IssueSeverity.LOW]: RecommendationPriority.LOW
        };
        return mapping[severity];
    }
    convertIssueScope(issueScope) {
        // Convert issue scope to recommendation scope
        const mapping = {
            'document': RecommendationScope.DOCUMENT,
            'section': RecommendationScope.SECTION,
            'chunk': RecommendationScope.CHUNK,
            'paragraph': RecommendationScope.PARAGRAPH,
            'sentence': RecommendationScope.SENTENCE
        };
        return mapping[issueScope] || RecommendationScope.CHUNK;
    }
    getAdditionalSteps(issue) {
        // Provide additional implementation steps based on issue type
        return ['Review the fix', 'Test the changes', 'Update related content if needed'];
    }
    estimateIssueFixTime(issue) {
        const baseTime = {
            [IssueSeverity.CRITICAL]: 60,
            [IssueSeverity.HIGH]: 45,
            [IssueSeverity.MEDIUM]: 30,
            [IssueSeverity.LOW]: 15
        }[issue.severity];
        return baseTime;
    }
    calculateIssueDifficulty(issue) {
        if (issue.severity === IssueSeverity.CRITICAL)
            return 'difficult';
        if (issue.severity === IssueSeverity.HIGH)
            return 'moderate';
        return 'easy';
    }
    getIssueBusinessValue(issue) {
        return `Fixing this ${issue.severity} issue will improve content quality and user experience`;
    }
    getIssueRisk(issue) {
        if (issue.severity === IssueSeverity.CRITICAL) {
            return 'Critical issues may severely impact user experience and trust';
        }
        else if (issue.severity === IssueSeverity.HIGH) {
            return 'High severity issues may cause user frustration and reduced effectiveness';
        }
        else {
            return 'Unresolved issues may accumulate and degrade overall quality';
        }
    }
    isStrategyApplicable(strategy, qualityAssessment, context) {
        const rules = strategy.applicabilityRules;
        // Check quality score range
        if (rules.minQualityScore && qualityAssessment.overallScore < rules.minQualityScore) {
            return false;
        }
        if (rules.maxQualityScore && qualityAssessment.overallScore > rules.maxQualityScore) {
            return false;
        }
        // Check if target dimensions need improvement
        const needsImprovement = strategy.targetDimensions.some(dim => qualityAssessment.dimensions[dim] < 0.7);
        return needsImprovement;
    }
    calculateStrategicPriority(strategy, qualityAssessment) {
        // Calculate priority based on how much the target dimensions need improvement
        const avgDimensionScore = strategy.targetDimensions.reduce((sum, dim) => sum + qualityAssessment.dimensions[dim], 0) / strategy.targetDimensions.length;
        if (avgDimensionScore < 0.3)
            return RecommendationPriority.HIGH;
        if (avgDimensionScore < 0.5)
            return RecommendationPriority.MEDIUM;
        return RecommendationPriority.LOW;
    }
    calculateApplicabilityScore(strategy, qualityAssessment) {
        const avgDimensionScore = strategy.targetDimensions.reduce((sum, dim) => sum + qualityAssessment.dimensions[dim], 0) / strategy.targetDimensions.length;
        return 1 - avgDimensionScore; // Lower scores = higher applicability
    }
    getRecommendationTypeDimensions(type) {
        const mapping = {
            [RecommendationType.CONTENT_ENHANCEMENT]: ['completeness', 'accuracy'],
            [RecommendationType.STRUCTURAL_IMPROVEMENT]: ['structure'],
            [RecommendationType.CLARITY_OPTIMIZATION]: ['clarity'],
            [RecommendationType.COMPLETENESS_BOOST]: ['completeness'],
            [RecommendationType.ACCURACY_CORRECTION]: ['accuracy'],
            [RecommendationType.CONSISTENCY_ALIGNMENT]: ['consistency'],
            [RecommendationType.RELEVANCE_REFINEMENT]: ['relevance'],
            [RecommendationType.TECHNICAL_ENHANCEMENT]: ['accuracy', 'structure'],
            [RecommendationType.UX_IMPROVEMENT]: ['clarity', 'structure'],
            [RecommendationType.PERFORMANCE_OPTIMIZATION]: ['structure', 'clarity']
        };
        return mapping[type] || ['completeness'];
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('QualityImprovementRecommender not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Quality Improvement Recommender...');
            this.initialized = false;
            this.logger.info('Quality Improvement Recommender shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during Quality Improvement Recommender shutdown:', error);
        }
    }
}
//# sourceMappingURL=QualityImprovementRecommender.js.map