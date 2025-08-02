/**
 * Change Impact Analyzer
 *
 * Comprehensive impact assessment and risk analysis system for document changes.
 * Provides detailed analysis of how changes affect different aspects of the system.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { ChangeType, ChangeScope, VersionTrackingError } from '../types/version-tracking.types';
import { getErrorMessage } from '../utils/typeHelpers';
/**
 * Enhanced Change Impact Analyzer
 *
 * Provides comprehensive impact assessment with:
 * - Multi-dimensional impact analysis (structural, semantic, quality, relationships)
 * - Risk assessment with detailed mitigation strategies
 * - Pattern-based impact prediction
 * - System integration impact analysis
 * - Automated recommendation generation
 */
export class ChangeImpactAnalyzer {
    logger;
    aiAnalysisService;
    semanticChunkingService;
    semanticFingerprintGenerator;
    initialized = false;
    changePatterns = new Map();
    systemIntegrations = new Map();
    // Risk thresholds and weights
    RISK_THRESHOLDS = {
        low: 0.3,
        medium: 0.6,
        high: 0.8
    };
    IMPACT_WEIGHTS = {
        structural: 0.25,
        semantic: 0.3,
        quality: 0.25,
        relationships: 0.2
    };
    constructor(logger, aiAnalysisService, semanticChunkingService, semanticFingerprintGenerator) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticChunkingService = semanticChunkingService;
        this.semanticFingerprintGenerator = semanticFingerprintGenerator;
    }
    /**
     * Initialize the change impact analyzer
     */
    async initialize() {
        try {
            await this.loadChangePatterns();
            await this.loadSystemIntegrations();
            this.initialized = true;
            this.logger.info('ChangeImpactAnalyzer initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ChangeImpactAnalyzer:', error);
            throw new VersionTrackingError('IMPACT_ANALYZER_INIT_FAILED', `Impact analyzer initialization failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Analyze comprehensive impact of document changes
     */
    async analyzeImpact(changes) {
        this.ensureInitialized();
        if (changes.length === 0) {
            return this.createEmptyAnalysis();
        }
        const startTime = Date.now();
        try {
            this.logger.debug(`Starting impact analysis for ${changes.length} changes`);
            // Step 1: Analyze impact categories
            const [structuralImpact, semanticImpact, qualityImpact, relationshipImpact] = await Promise.all([
                this.analyzeStructuralImpact(changes),
                this.analyzeSemanticImpact(changes),
                this.analyzeQualityImpact(changes),
                this.analyzeRelationshipImpact(changes)
            ]);
            // Step 2: Calculate overall impact score
            const overallImpactScore = this.calculateOverallImpact({
                structural: structuralImpact,
                semantic: semanticImpact,
                quality: qualityImpact,
                relationships: relationshipImpact
            });
            // Step 3: Identify affected systems
            const affectedSystems = await this.identifyAffectedSystems(changes);
            // Step 4: Perform risk assessment
            const documentContext = {
                documentId: changes[0]?.versionId || changes[0]?.id || 'unknown',
                relationships: []
            };
            const riskAssessment = await this.assessRisk(changes, documentContext);
            // Step 5: Generate recommendations
            const recommendations = await this.generateRecommendations({
                overallImpactScore,
                impactCategories: {
                    structural: structuralImpact,
                    semantic: semanticImpact,
                    quality: qualityImpact,
                    relationships: relationshipImpact
                },
                affectedSystems,
                riskAssessment,
                recommendations: [],
                summary: ''
            });
            // Step 6: Generate summary
            const summary = this.generateImpactSummary(overallImpactScore, riskAssessment, affectedSystems.length);
            const analysis = {
                overallImpactScore,
                impactCategories: {
                    structural: structuralImpact,
                    semantic: semanticImpact,
                    quality: qualityImpact,
                    relationships: relationshipImpact
                },
                affectedSystems,
                riskAssessment,
                recommendations,
                summary
            };
            const processingTime = Date.now() - startTime;
            this.logger.info('Impact analysis completed', {
                overallImpactScore,
                riskLevel: riskAssessment.overallRisk,
                affectedSystems: affectedSystems.length,
                processingTime
            });
            return analysis;
        }
        catch (error) {
            this.logger.error('Impact analysis failed:', error);
            throw new VersionTrackingError('IMPACT_ANALYSIS_FAILED', `Impact analysis failed: ${getErrorMessage(error)}`, { changesCount: changes.length });
        }
    }
    /**
     * Assess risk based on changes and context
     */
    async assessRisk(changes, context) {
        this.ensureInitialized();
        try {
            // Calculate individual risk factors
            const riskFactors = {
                changeScope: this.calculateChangeScopeRisk(changes),
                semanticShift: await this.calculateSemanticShiftRisk(changes),
                qualityImpact: this.calculateQualityImpactRisk(changes),
                relationshipBreakage: await this.calculateRelationshipBreakageRisk(changes),
                systemComplexity: context ? this.calculateSystemComplexityRisk(context) : 0.3
            };
            // Calculate overall risk score
            const riskWeights = {
                changeScope: 0.25,
                semanticShift: 0.25,
                qualityImpact: 0.2,
                relationshipBreakage: 0.2,
                systemComplexity: 0.1
            };
            const overallRiskScore = Object.entries(riskFactors).reduce((total, [factor, score]) => total + score * riskWeights[factor], 0);
            // Determine risk level
            let overallRisk;
            if (overallRiskScore < this.RISK_THRESHOLDS.low)
                overallRisk = 'low';
            else if (overallRiskScore < this.RISK_THRESHOLDS.medium)
                overallRisk = 'medium';
            else if (overallRiskScore < this.RISK_THRESHOLDS.high)
                overallRisk = 'high';
            else
                overallRisk = 'critical';
            // Generate mitigation strategies and review requirements
            const mitigationStrategies = this.generateMitigationStrategies(overallRisk, riskFactors);
            const reviewRequirements = this.generateReviewRequirements(overallRisk, riskFactors);
            return {
                overallRisk,
                riskFactors,
                mitigationStrategies,
                reviewRequirements
            };
        }
        catch (error) {
            this.logger.error('Risk assessment failed:', error);
            throw new VersionTrackingError('RISK_ASSESSMENT_FAILED', `Risk assessment failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Generate actionable recommendations
     */
    async generateRecommendations(analysis) {
        const recommendations = [];
        try {
            // Impact-based recommendations
            if (analysis.overallImpactScore > 0.8) {
                recommendations.push('Consider breaking down changes into smaller, incremental updates');
                recommendations.push('Implement comprehensive regression testing');
                recommendations.push('Plan for extended review and validation period');
            }
            else if (analysis.overallImpactScore > 0.6) {
                recommendations.push('Implement additional testing for affected areas');
                recommendations.push('Consider phased rollout approach');
            }
            // Risk-based recommendations
            switch (analysis.riskAssessment.overallRisk) {
                case 'critical':
                    recommendations.push('Require executive approval before proceeding');
                    recommendations.push('Implement blue-green deployment strategy');
                    recommendations.push('Prepare detailed rollback procedures');
                    recommendations.push('Conduct cross-team impact review');
                    break;
                case 'high':
                    recommendations.push('Require senior architect approval');
                    recommendations.push('Implement staged deployment with monitoring');
                    recommendations.push('Prepare rollback plan');
                    break;
                case 'medium':
                    recommendations.push('Conduct thorough testing before deployment');
                    recommendations.push('Monitor system metrics closely post-deployment');
                    break;
                case 'low':
                    recommendations.push('Follow standard deployment procedures');
                    break;
            }
            // Structural impact recommendations
            if (analysis.impactCategories.structural.score > 0.7) {
                recommendations.push('Update architectural documentation');
                recommendations.push('Validate system integrations after deployment');
            }
            // Semantic impact recommendations
            if (analysis.impactCategories.semantic.score > 0.7) {
                recommendations.push('Update user documentation and guides');
                recommendations.push('Communicate changes to affected stakeholders');
                recommendations.push('Consider user training or communication plan');
            }
            // Quality impact recommendations
            if (analysis.impactCategories.quality.score > 0.6) {
                recommendations.push('Implement additional quality assurance measures');
                recommendations.push('Consider code review by quality specialist');
            }
            // Relationship impact recommendations
            if (analysis.impactCategories.relationships.score > 0.6) {
                recommendations.push('Validate all system integrations');
                recommendations.push('Update API contracts if applicable');
                recommendations.push('Notify integration partners of potential impacts');
            }
            // System-specific recommendations
            if (analysis.affectedSystems.length > 3) {
                recommendations.push('Coordinate deployment across multiple systems');
                recommendations.push('Implement cross-system validation testing');
            }
            // Pattern-based recommendations
            const patternRecommendations = await this.generatePatternBasedRecommendations(analysis);
            recommendations.push(...patternRecommendations);
            // Remove duplicates and sort by priority
            return [...new Set(recommendations)];
        }
        catch (error) {
            this.logger.error('Failed to generate recommendations:', error);
            return ['Review changes manually due to analysis error'];
        }
    }
    /**
     * Analyze structural impact
     */
    async analyzeStructuralImpact(changes) {
        const structuralChanges = changes.filter(c => c.changeScope === ChangeScope.DOCUMENT ||
            c.changeScope === ChangeScope.SECTION ||
            c.changeType === ChangeType.RESTRUCTURE);
        const affectedSections = this.extractAffectedSections(structuralChanges);
        const hierarchyChanges = this.countHierarchyChanges(structuralChanges);
        // Calculate structural impact score
        let score = 0;
        score += Math.min(structuralChanges.length / 10, 1) * 0.4; // Change volume
        score += Math.min(affectedSections.length / 5, 1) * 0.3; // Section breadth
        score += Math.min(hierarchyChanges / 3, 1) * 0.3; // Hierarchy complexity
        return {
            score: Math.min(score, 1),
            affectedSections,
            hierarchyChanges
        };
    }
    /**
     * Analyze semantic impact
     */
    async analyzeSemanticImpact(changes) {
        const semanticChanges = changes.filter(c => c.changeScope === ChangeScope.SEMANTIC ||
            c.changeType === ChangeType.MODIFY);
        // Extract concepts from change content
        const affectedConcepts = [];
        let totalMeaningShift = 0;
        for (const change of semanticChanges) {
            if (change.oldContent && change.newContent) {
                try {
                    // Use semantic fingerprinting to detect concept changes
                    const [oldFingerprint, newFingerprint] = await Promise.all([
                        this.semanticFingerprintGenerator.generateFingerprint(change.oldContent),
                        this.semanticFingerprintGenerator.generateFingerprint(change.newContent)
                    ]);
                    const comparison = await this.semanticFingerprintGenerator.compareFingerprints(oldFingerprint, newFingerprint);
                    affectedConcepts.push(...oldFingerprint.concepts, ...newFingerprint.concepts);
                    totalMeaningShift += comparison.changeScore;
                }
                catch (error) {
                    this.logger.warn('Semantic analysis failed for change:', error);
                }
            }
        }
        const uniqueConcepts = [...new Set(affectedConcepts)];
        const avgMeaningShift = semanticChanges.length > 0 ? totalMeaningShift / semanticChanges.length : 0;
        // Calculate semantic impact score
        let score = 0;
        score += Math.min(uniqueConcepts.length / 20, 1) * 0.4; // Concept breadth
        score += avgMeaningShift * 0.6; // Meaning shift magnitude
        return {
            score: Math.min(score, 1),
            affectedConcepts: uniqueConcepts,
            meaningShift: avgMeaningShift
        };
    }
    /**
     * Analyze quality impact
     */
    async analyzeQualityImpact(changes) {
        let qualityDelta = 0;
        const affectedMetrics = [];
        // Analyze quality impact based on change types
        for (const change of changes) {
            switch (change.changeType) {
                case ChangeType.ADD:
                    qualityDelta += 0.1; // Generally positive
                    affectedMetrics.push('completeness');
                    break;
                case ChangeType.DELETE:
                    qualityDelta -= 0.15; // Generally negative
                    affectedMetrics.push('completeness', 'coherence');
                    break;
                case ChangeType.MODIFY:
                    // Analyze content quality change if available
                    if (change.oldContent && change.newContent) {
                        const contentQualityDelta = await this.analyzeContentQualityChange(change.oldContent, change.newContent);
                        qualityDelta += contentQualityDelta;
                        affectedMetrics.push('clarity', 'accuracy');
                    }
                    break;
                case ChangeType.RESTRUCTURE:
                    qualityDelta += 0.05; // Usually positive for structure
                    affectedMetrics.push('organization', 'readability');
                    break;
            }
        }
        // Normalize quality delta
        qualityDelta = Math.max(-1, Math.min(1, qualityDelta));
        const score = Math.abs(qualityDelta); // Impact is absolute change
        const uniqueMetrics = [...new Set(affectedMetrics)];
        return {
            score,
            qualityDelta,
            affectedMetrics: uniqueMetrics
        };
    }
    /**
     * Analyze relationship impact
     */
    async analyzeRelationshipImpact(changes) {
        const brokenRelationships = [];
        const newRelationships = [];
        // Analyze chunk relationships if available
        for (const change of changes) {
            if (change.affectedChunks.length > 0) {
                try {
                    // Check for broken chunk relationships
                    for (const chunkId of change.affectedChunks) {
                        const relationships = await this.analyzeChunkRelationships(chunkId, change);
                        brokenRelationships.push(...relationships.broken);
                        newRelationships.push(...relationships.new);
                    }
                }
                catch (error) {
                    this.logger.warn('Relationship analysis failed for chunk:', error);
                }
            }
        }
        // Calculate relationship impact score
        let score = 0;
        score += Math.min(brokenRelationships.length / 5, 1) * 0.7; // Broken relationships are more impactful
        score += Math.min(newRelationships.length / 10, 1) * 0.3; // New relationships are less impactful
        return {
            score: Math.min(score, 1),
            brokenRelationships: [...new Set(brokenRelationships)],
            newRelationships: [...new Set(newRelationships)]
        };
    }
    /**
     * Calculate overall impact score
     */
    calculateOverallImpact(categories) {
        return (categories.structural.score * this.IMPACT_WEIGHTS.structural +
            categories.semantic.score * this.IMPACT_WEIGHTS.semantic +
            categories.quality.score * this.IMPACT_WEIGHTS.quality +
            categories.relationships.score * this.IMPACT_WEIGHTS.relationships);
    }
    /**
     * Identify affected systems
     */
    async identifyAffectedSystems(changes) {
        const affectedSystems = new Set();
        // Analyze changes to identify system dependencies
        for (const change of changes) {
            // Extract system references from content
            const systemRefs = this.extractSystemReferences(change);
            systemRefs.forEach(ref => affectedSystems.add(ref));
            // Check against known system integrations
            const documentId = change.versionId ?? change.id ?? 'unknown'; // Handle undefined with fallback
            const integrations = this.systemIntegrations.get(documentId) || [];
            for (const integration of integrations) {
                if (integration.integrationType === 'strong' && integration.breakageRisk > 0.5) {
                    affectedSystems.add(integration.systemName);
                }
            }
        }
        return Array.from(affectedSystems);
    }
    /**
     * Calculate various risk factors
     */
    calculateChangeScopeRisk(changes) {
        const documentLevelChanges = changes.filter(c => c.changeScope === ChangeScope.DOCUMENT).length;
        const sectionLevelChanges = changes.filter(c => c.changeScope === ChangeScope.SECTION).length;
        const totalChanges = changes.length;
        if (totalChanges === 0)
            return 0;
        return Math.min((documentLevelChanges * 0.8 + sectionLevelChanges * 0.4) / totalChanges, 1);
    }
    async calculateSemanticShiftRisk(changes) {
        let totalShift = 0;
        let analyzedChanges = 0;
        for (const change of changes) {
            if (change.oldContent && change.newContent) {
                try {
                    const similarity = await this.aiAnalysisService.calculateSemanticSimilarity(change.oldContent, change.newContent);
                    totalShift += (1 - similarity);
                    analyzedChanges++;
                }
                catch (error) {
                    // Skip if analysis fails
                }
            }
        }
        return analyzedChanges > 0 ? totalShift / analyzedChanges : 0.3;
    }
    calculateQualityImpactRisk(changes) {
        const deleteChanges = changes.filter(c => c.changeType === ChangeType.DELETE).length;
        const restructureChanges = changes.filter(c => c.changeType === ChangeType.RESTRUCTURE).length;
        const totalChanges = changes.length;
        if (totalChanges === 0)
            return 0;
        return Math.min((deleteChanges * 0.6 + restructureChanges * 0.4) / totalChanges, 1);
    }
    async calculateRelationshipBreakageRisk(changes) {
        let totalRisk = 0;
        const chunksWithRelationships = changes.filter(c => c.affectedChunks.length > 0);
        if (chunksWithRelationships.length === 0)
            return 0.2; // Default risk
        for (const change of chunksWithRelationships) {
            const relationshipRisk = change.affectedChunks.length * 0.1; // Simple heuristic
            totalRisk += Math.min(relationshipRisk, 0.8);
        }
        return Math.min(totalRisk / chunksWithRelationships.length, 1);
    }
    calculateSystemComplexityRisk(context) {
        let complexity = context.complexity || 0.5;
        complexity += (context.dependencies?.length || 0) * 0.1;
        complexity += (context.systemIntegrations?.length || 0) * 0.1;
        return Math.min(complexity, 1);
    }
    /**
     * Generate mitigation strategies
     */
    generateMitigationStrategies(riskLevel, riskFactors) {
        const strategies = [];
        // Base strategies by risk level
        switch (riskLevel) {
            case 'critical':
                strategies.push('Implement comprehensive backup and rollback procedures');
                strategies.push('Conduct full system integration testing');
                strategies.push('Deploy in controlled environment first');
                strategies.push('Establish 24/7 monitoring during rollout');
                break;
            case 'high':
                strategies.push('Implement staged deployment with validation gates');
                strategies.push('Increase monitoring and alerting coverage');
                strategies.push('Prepare rapid rollback capabilities');
                break;
            case 'medium':
                strategies.push('Enhance testing coverage for affected areas');
                strategies.push('Monitor key metrics closely post-deployment');
                strategies.push('Have rollback plan ready');
                break;
            case 'low':
                strategies.push('Follow standard deployment procedures');
                strategies.push('Monitor for unexpected issues');
                break;
        }
        // Factor-specific strategies
        if (riskFactors.changeScope > 0.7) {
            strategies.push('Break down changes into smaller increments');
            strategies.push('Validate each increment separately');
        }
        if (riskFactors.semanticShift > 0.6) {
            strategies.push('Update user documentation and training materials');
            strategies.push('Communicate changes to stakeholders in advance');
        }
        if (riskFactors.qualityImpact > 0.6) {
            strategies.push('Implement additional quality assurance checkpoints');
            strategies.push('Conduct expert review of changes');
        }
        if (riskFactors.relationshipBreakage > 0.6) {
            strategies.push('Validate all system integrations thoroughly');
            strategies.push('Test backward compatibility');
        }
        return [...new Set(strategies)];
    }
    /**
     * Generate review requirements
     */
    generateReviewRequirements(riskLevel, riskFactors) {
        const requirements = [];
        // Base requirements by risk level
        switch (riskLevel) {
            case 'critical':
                requirements.push('Executive stakeholder approval');
                requirements.push('Architecture board review');
                requirements.push('Security team sign-off');
                requirements.push('Cross-functional team review');
                break;
            case 'high':
                requirements.push('Senior architect approval');
                requirements.push('Technical lead review');
                requirements.push('QA team validation');
                requirements.push('Business stakeholder notification');
                break;
            case 'medium':
                requirements.push('Technical lead approval');
                requirements.push('Peer code review');
                requirements.push('QA validation');
                break;
            case 'low':
                requirements.push('Peer review');
                requirements.push('Standard QA validation');
                break;
        }
        // Factor-specific requirements
        if (riskFactors.semanticShift > 0.7) {
            requirements.push('Content specialist review');
            requirements.push('User experience team consultation');
        }
        if (riskFactors.systemComplexity > 0.7) {
            requirements.push('System architect consultation');
            requirements.push('Integration specialist review');
        }
        return [...new Set(requirements)];
    }
    /**
     * Generate pattern-based recommendations
     */
    async generatePatternBasedRecommendations(analysis) {
        const recommendations = [];
        try {
            // Analyze change patterns to provide specific recommendations
            const changeTypes = new Set();
            // This would analyze historical patterns and provide specific recommendations
            return recommendations;
        }
        catch (error) {
            this.logger.warn('Pattern-based recommendation generation failed:', error);
            return [];
        }
    }
    /**
     * Helper methods
     */
    createEmptyAnalysis() {
        return {
            overallImpactScore: 0,
            impactCategories: {
                structural: { score: 0, affectedSections: [], hierarchyChanges: 0 },
                semantic: { score: 0, affectedConcepts: [], meaningShift: 0 },
                quality: { score: 0, qualityDelta: 0, affectedMetrics: [] },
                relationships: { score: 0, brokenRelationships: [], newRelationships: [] }
            },
            affectedSystems: [],
            riskAssessment: {
                overallRisk: 'low',
                riskFactors: {
                    changeScope: 0,
                    semanticShift: 0,
                    qualityImpact: 0,
                    relationshipBreakage: 0,
                    systemComplexity: 0
                },
                mitigationStrategies: [],
                reviewRequirements: []
            },
            recommendations: [],
            summary: 'No changes detected'
        };
    }
    extractAffectedSections(changes) {
        const sections = new Set();
        changes.forEach(change => {
            if (change.changeLocation) {
                sections.add(change.changeLocation);
            }
        });
        return Array.from(sections);
    }
    countHierarchyChanges(changes) {
        return changes.filter(c => c.changeType === ChangeType.RESTRUCTURE ||
            c.changeType === ChangeType.MOVE).length;
    }
    async analyzeContentQualityChange(oldContent, newContent) {
        try {
            // Simple quality heuristics - in practice would use more sophisticated analysis
            const oldWords = oldContent.split(/\s+/).length;
            const newWords = newContent.split(/\s+/).length;
            const lengthChange = (newWords - oldWords) / Math.max(oldWords, 1);
            // Assume longer content is generally better (within reason)
            return Math.max(-0.2, Math.min(0.2, lengthChange * 0.1));
        }
        catch (error) {
            return 0;
        }
    }
    async analyzeChunkRelationships(chunkId, change) {
        // Simplified relationship analysis
        // In practice, this would integrate with the semantic chunking service
        return { broken: [], new: [] };
    }
    extractSystemReferences(change) {
        const refs = [];
        const content = [change.oldContent, change.newContent].filter(Boolean).join(' ');
        // Simple pattern matching for system references
        const patterns = [
            /\b(api|service|system|database|server)\b/gi,
            /\b[A-Z][a-zA-Z]*(?:API|Service|System|DB)\b/g
        ];
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                refs.push(...matches);
            }
        });
        return [...new Set(refs)];
    }
    generateImpactSummary(overallScore, riskAssessment, affectedSystemsCount) {
        const impactLevel = overallScore > 0.8 ? 'High' : overallScore > 0.5 ? 'Medium' : 'Low';
        const riskLevel = riskAssessment.overallRisk.charAt(0).toUpperCase() + riskAssessment.overallRisk.slice(1);
        let summary = `${impactLevel} impact changes with ${riskLevel} risk level.`;
        if (affectedSystemsCount > 0) {
            summary += ` Affects ${affectedSystemsCount} system${affectedSystemsCount > 1 ? 's' : ''}.`;
        }
        if (riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'critical') {
            summary += ' Requires careful planning and validation.';
        }
        return summary;
    }
    async loadChangePatterns() {
        // In practice, this would load patterns from a database or configuration
        // For now, we'll use some default patterns
        this.changePatterns.set('documentation_update', {
            patternType: 'documentation_update',
            frequency: 0.8,
            successRate: 0.95,
            averageImpact: 0.3,
            commonIssues: ['outdated_links', 'formatting_issues']
        });
    }
    async loadSystemIntegrations() {
        // In practice, this would load system integration data
        // For now, we'll use default empty mappings
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new VersionTrackingError('ChangeImpactAnalyzer not initialized. Call initialize() first.', 'SERVICE_NOT_INITIALIZED');
        }
    }
    /**
     * Shutdown service
     */
    async shutdown() {
        this.changePatterns.clear();
        this.systemIntegrations.clear();
        this.initialized = false;
        this.logger.info('ChangeImpactAnalyzer shutdown complete');
    }
}
export default ChangeImpactAnalyzer;
//# sourceMappingURL=ChangeImpactAnalyzer.js.map