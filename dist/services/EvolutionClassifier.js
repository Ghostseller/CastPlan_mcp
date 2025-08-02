/**
 * Evolution Classifier
 *
 * Automated change classification and significance scoring system.
 * Classifies document evolution patterns and assigns significance scores.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { ChangeType, ChangeScope, VersionTrackingError } from '../types/version-tracking.types';
export var EvolutionType;
(function (EvolutionType) {
    // Content Evolution
    EvolutionType["CONTENT_EXPANSION"] = "content_expansion";
    EvolutionType["CONTENT_REDUCTION"] = "content_reduction";
    EvolutionType["CONTENT_REFINEMENT"] = "content_refinement";
    EvolutionType["CONTENT_CORRECTION"] = "content_correction";
    // Structural Evolution
    EvolutionType["STRUCTURAL_REORGANIZATION"] = "structural_reorganization";
    EvolutionType["HIERARCHICAL_RESTRUCTURE"] = "hierarchical_restructure";
    EvolutionType["SECTION_MIGRATION"] = "section_migration";
    EvolutionType["DOCUMENT_SPLITTING"] = "document_splitting";
    EvolutionType["DOCUMENT_MERGING"] = "document_merging";
    // Semantic Evolution
    EvolutionType["CONCEPTUAL_SHIFT"] = "conceptual_shift";
    EvolutionType["TERMINOLOGY_UPDATE"] = "terminology_update";
    EvolutionType["INTENT_CLARIFICATION"] = "intent_clarification";
    EvolutionType["SCOPE_REDEFINITION"] = "scope_redefinition";
    // Quality Evolution
    EvolutionType["CLARITY_IMPROVEMENT"] = "clarity_improvement";
    EvolutionType["ACCURACY_CORRECTION"] = "accuracy_correction";
    EvolutionType["COMPLETENESS_ENHANCEMENT"] = "completeness_enhancement";
    EvolutionType["CONSISTENCY_UPDATE"] = "consistency_update";
    // Maintenance Evolution
    EvolutionType["ROUTINE_UPDATE"] = "routine_update";
    EvolutionType["VERSION_SYNC"] = "version_sync";
    EvolutionType["LINK_MAINTENANCE"] = "link_maintenance";
    EvolutionType["FORMAT_STANDARDIZATION"] = "format_standardization";
    // Major Evolution
    EvolutionType["COMPLETE_REWRITE"] = "complete_rewrite";
    EvolutionType["PARADIGM_SHIFT"] = "paradigm_shift";
    EvolutionType["ARCHITECTURE_CHANGE"] = "architecture_change";
    // Mixed/Unknown
    EvolutionType["MIXED_EVOLUTION"] = "mixed_evolution";
    EvolutionType["UNKNOWN_PATTERN"] = "unknown_pattern";
})(EvolutionType || (EvolutionType = {}));
export var SignificanceLevel;
(function (SignificanceLevel) {
    SignificanceLevel["TRIVIAL"] = "trivial";
    SignificanceLevel["MINOR"] = "minor";
    SignificanceLevel["MODERATE"] = "moderate";
    SignificanceLevel["SIGNIFICANT"] = "significant";
    SignificanceLevel["MAJOR"] = "major";
    SignificanceLevel["CRITICAL"] = "critical"; // 0.9 - 1.0
})(SignificanceLevel || (SignificanceLevel = {}));
/**
 * Evolution Classifier
 *
 * Provides automated classification of document evolution patterns with:
 * - Multi-dimensional change type classification
 * - Significance scoring based on multiple factors
 * - Pattern recognition and matching
 * - Confidence scoring for classifications
 * - Historical pattern learning capabilities
 */
export class EvolutionClassifier {
    logger;
    aiAnalysisService;
    semanticFingerprintGenerator;
    initialized = false;
    evolutionPatterns = new Map();
    classificationHistory = [];
    // Classification weights and thresholds
    SIGNIFICANCE_WEIGHTS = {
        magnitude: 0.25,
        scope: 0.2,
        depth: 0.2,
        novelty: 0.15,
        impact: 0.15,
        complexity: 0.05
    };
    PATTERN_THRESHOLDS = {
        strong_match: 0.8,
        moderate_match: 0.6,
        weak_match: 0.4
    };
    constructor(logger, aiAnalysisService, semanticFingerprintGenerator) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
        this.semanticFingerprintGenerator = semanticFingerprintGenerator;
    }
    /**
     * Initialize the evolution classifier
     */
    async initialize() {
        try {
            await this.loadEvolutionPatterns();
            this.initialized = true;
            this.logger.info('EvolutionClassifier initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize EvolutionClassifier:', error);
            throw new VersionTrackingError(`Evolution classifier initialization failed: ${error.message}`, 'EVOLUTION_CLASSIFIER_INIT_FAILED');
        }
    }
    /**
     * Classify document evolution and assign significance score
     */
    async classifyEvolution(evolution) {
        this.ensureInitialized();
        const startTime = Date.now();
        try {
            this.logger.debug('Starting evolution classification', {
                structuralChanges: evolution.structuralChanges.length,
                contentChanges: evolution.contentChanges.length,
                semanticChanges: evolution.semanticChanges.length,
                overallScore: evolution.overallChangeScore
            });
            // Step 1: Extract change characteristics
            const characteristics = this.extractChangeCharacteristics(evolution);
            // Step 2: Identify evolution patterns
            const detectedPatterns = await this.detectEvolutionPatterns(evolution, characteristics);
            // Step 3: Classify primary and secondary evolution types
            const { primaryType, secondaryTypes } = this.classifyEvolutionTypes(evolution, characteristics, detectedPatterns);
            // Step 4: Calculate significance factors
            const significanceFactors = await this.calculateSignificanceFactors(evolution, characteristics);
            // Step 5: Calculate overall significance score
            const significanceScore = this.calculateSignificanceScore(significanceFactors);
            // Step 6: Calculate classification confidence
            const confidence = this.calculateClassificationConfidence(detectedPatterns, significanceFactors, characteristics);
            // Step 7: Generate reasoning explanation
            const reasoning = this.generateClassificationReasoning(primaryType, significanceScore, detectedPatterns, characteristics);
            const classification = {
                primaryType,
                secondaryTypes,
                significanceScore,
                confidence,
                reasoning,
                patterns: detectedPatterns
            };
            // Store classification for learning
            this.classificationHistory.push(classification);
            const processingTime = Date.now() - startTime;
            this.logger.info('Evolution classification completed', {
                primaryType,
                significanceScore,
                confidence,
                patternsDetected: detectedPatterns.length,
                processingTime
            });
            return classification;
        }
        catch (error) {
            this.logger.error('Evolution classification failed:', error);
            throw new VersionTrackingError(`Evolution classification failed: ${error.message}`, 'CLASSIFICATION_FAILED');
        }
    }
    /**
     * Classify individual document change
     */
    async classifyChange(change) {
        this.ensureInitialized();
        try {
            // Analyze individual change characteristics
            const magnitude = this.calculateChangeMagnitude(change);
            const complexity = this.calculateChangeComplexity(change);
            const scope = this.mapChangeScopeToScore(change.changeScope);
            // Classify based on change type and content
            let evolutionType = this.mapChangeTypeToEvolution(change.changeType);
            // Refine classification based on content analysis
            if (change.oldContent && change.newContent) {
                evolutionType = await this.refineClassificationWithContent(evolutionType, change.oldContent, change.newContent);
            }
            // Calculate significance for individual change
            const significance = (magnitude * 0.4) + (complexity * 0.3) + (scope * 0.3);
            // Calculate confidence based on available data
            const confidence = this.calculateChangeConfidence(change);
            return {
                changeType: evolutionType,
                significance: Math.min(significance, 1),
                confidence
            };
        }
        catch (error) {
            this.logger.error('Individual change classification failed:', error);
            return {
                changeType: EvolutionType.UNKNOWN_PATTERN,
                significance: 0.5,
                confidence: 0.3
            };
        }
    }
    /**
     * Get significance level from score
     */
    getSignificanceLevel(score) {
        if (score >= 0.9)
            return SignificanceLevel.CRITICAL;
        if (score >= 0.8)
            return SignificanceLevel.MAJOR;
        if (score >= 0.6)
            return SignificanceLevel.SIGNIFICANT;
        if (score >= 0.4)
            return SignificanceLevel.MODERATE;
        if (score >= 0.2)
            return SignificanceLevel.MINOR;
        return SignificanceLevel.TRIVIAL;
    }
    /**
     * Batch classify multiple evolutions
     */
    async batchClassifyEvolutions(evolutions) {
        this.ensureInitialized();
        const results = [];
        this.logger.info(`Starting batch classification for ${evolutions.length} evolutions`);
        try {
            // Process in parallel with limited concurrency
            const batchSize = 3;
            for (let i = 0; i < evolutions.length; i += batchSize) {
                const batch = evolutions.slice(i, i + batchSize);
                const batchPromises = batch.map(evolution => this.classifyEvolution(evolution));
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                this.logger.debug(`Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(evolutions.length / batchSize)}`);
            }
            this.logger.info(`Batch classification completed: ${results.length} classifications`);
            return results;
        }
        catch (error) {
            this.logger.error('Batch classification failed:', error);
            throw new VersionTrackingError(`Batch classification failed: ${error.message}`, 'BATCH_CLASSIFICATION_FAILED');
        }
    }
    /**
     * Extract change characteristics from evolution
     */
    extractChangeCharacteristics(evolution) {
        return {
            totalChanges: evolution.structuralChanges.length + evolution.contentChanges.length + evolution.semanticChanges.length,
            structuralRatio: evolution.structuralChanges.length / Math.max(evolution.structuralChanges.length + evolution.contentChanges.length + evolution.semanticChanges.length, 1),
            contentRatio: evolution.contentChanges.length / Math.max(evolution.structuralChanges.length + evolution.contentChanges.length + evolution.semanticChanges.length, 1),
            semanticRatio: evolution.semanticChanges.length / Math.max(evolution.structuralChanges.length + evolution.contentChanges.length + evolution.semanticChanges.length, 1),
            overallChangeScore: evolution.overallChangeScore,
            // Structural characteristics
            hasHierarchyChanges: evolution.structuralChanges.some(c => c.type === 'heading_changed'),
            hasSectionMovement: evolution.structuralChanges.some(c => c.type === 'section_moved'),
            hasSectionAdditions: evolution.structuralChanges.some(c => c.type === 'section_added'),
            hasSectionRemovals: evolution.structuralChanges.some(c => c.type === 'section_removed'),
            // Content characteristics
            hasTextAdditions: evolution.contentChanges.some(c => c.type === 'text_added'),
            hasTextRemovals: evolution.contentChanges.some(c => c.type === 'text_removed'),
            hasTextModifications: evolution.contentChanges.some(c => c.type === 'text_modified'),
            totalWordCount: evolution.contentChanges.reduce((sum, c) => sum + (c.wordCount || 0), 0),
            // Semantic characteristics
            hasConceptChanges: evolution.semanticChanges.some(c => c.type === 'concept_added' || c.type === 'concept_removed'),
            hasMeaningShifts: evolution.semanticChanges.some(c => c.type === 'meaning_shifted'),
            hasIntentChanges: evolution.semanticChanges.some(c => c.type === 'intent_changed'),
            // Calculate change distribution
            changeDistribution: {
                add: this.countChangesByType([...evolution.structuralChanges, ...evolution.contentChanges, ...evolution.semanticChanges], ['section_added', 'text_added', 'concept_added']),
                modify: this.countChangesByType([...evolution.structuralChanges, ...evolution.contentChanges, ...evolution.semanticChanges], ['heading_changed', 'text_modified', 'meaning_shifted']),
                remove: this.countChangesByType([...evolution.structuralChanges, ...evolution.contentChanges, ...evolution.semanticChanges], ['section_removed', 'text_removed', 'concept_removed']),
                move: this.countChangesByType([...evolution.structuralChanges, ...evolution.contentChanges, ...evolution.semanticChanges], ['section_moved'])
            }
        };
    }
    /**
     * Detect evolution patterns
     */
    async detectEvolutionPatterns(evolution, characteristics) {
        const detectedPatterns = [];
        // Content expansion pattern
        if (characteristics.hasTextAdditions && !characteristics.hasTextRemovals && characteristics.totalWordCount > 100) {
            detectedPatterns.push({
                patternId: 'content_expansion',
                patternName: 'Content Expansion',
                matchStrength: 0.8,
                description: 'Document content has been significantly expanded',
                significance: 0.6,
                frequency: 0.7
            });
        }
        // Content reduction pattern
        if (characteristics.hasTextRemovals && !characteristics.hasTextAdditions && characteristics.totalWordCount > 50) {
            detectedPatterns.push({
                patternId: 'content_reduction',
                patternName: 'Content Reduction',
                matchStrength: 0.8,
                description: 'Document content has been significantly reduced',
                significance: 0.7,
                frequency: 0.4
            });
        }
        // Structural reorganization pattern
        if (characteristics.hasHierarchyChanges || characteristics.hasSectionMovement) {
            detectedPatterns.push({
                patternId: 'structural_reorganization',
                patternName: 'Structural Reorganization',
                matchStrength: 0.9,
                description: 'Document structure has been reorganized',
                significance: 0.8,
                frequency: 0.3
            });
        }
        // Complete rewrite pattern
        if (characteristics.overallChangeScore > 0.8 && characteristics.totalChanges > 10) {
            detectedPatterns.push({
                patternId: 'complete_rewrite',
                patternName: 'Complete Rewrite',
                matchStrength: 0.9,
                description: 'Document appears to have been completely rewritten',
                significance: 0.95,
                frequency: 0.1
            });
        }
        // Routine update pattern
        if (characteristics.overallChangeScore < 0.3 && characteristics.totalChanges < 5) {
            detectedPatterns.push({
                patternId: 'routine_update',
                patternName: 'Routine Update',
                matchStrength: 0.7,
                description: 'Minor routine updates and corrections',
                significance: 0.2,
                frequency: 0.9
            });
        }
        // Semantic evolution pattern
        if (characteristics.hasConceptChanges || characteristics.hasMeaningShifts) {
            detectedPatterns.push({
                patternId: 'semantic_evolution',
                patternName: 'Semantic Evolution',
                matchStrength: 0.8,
                description: 'Document meaning and concepts have evolved',
                significance: 0.7,
                frequency: 0.5
            });
        }
        // Mixed evolution pattern
        if (characteristics.structuralRatio > 0.2 && characteristics.contentRatio > 0.2 && characteristics.semanticRatio > 0.2) {
            detectedPatterns.push({
                patternId: 'mixed_evolution',
                patternName: 'Mixed Evolution',
                matchStrength: 0.6,
                description: 'Document has evolved across multiple dimensions',
                significance: 0.6,
                frequency: 0.4
            });
        }
        return detectedPatterns;
    }
    /**
     * Classify evolution types
     */
    classifyEvolutionTypes(evolution, characteristics, patterns) {
        // Find the strongest pattern
        const strongestPattern = patterns.reduce((strongest, current) => current.matchStrength > (strongest?.matchStrength || 0) ? current : strongest, patterns[0]);
        let primaryType = EvolutionType.UNKNOWN_PATTERN;
        const secondaryTypes = [];
        if (strongestPattern) {
            // Map pattern to evolution type
            switch (strongestPattern.patternId) {
                case 'content_expansion':
                    primaryType = EvolutionType.CONTENT_EXPANSION;
                    break;
                case 'content_reduction':
                    primaryType = EvolutionType.CONTENT_REDUCTION;
                    break;
                case 'structural_reorganization':
                    primaryType = EvolutionType.STRUCTURAL_REORGANIZATION;
                    break;
                case 'complete_rewrite':
                    primaryType = EvolutionType.COMPLETE_REWRITE;
                    break;
                case 'routine_update':
                    primaryType = EvolutionType.ROUTINE_UPDATE;
                    break;
                case 'semantic_evolution':
                    primaryType = EvolutionType.CONCEPTUAL_SHIFT;
                    break;
                case 'mixed_evolution':
                    primaryType = EvolutionType.MIXED_EVOLUTION;
                    break;
            }
        }
        // Add secondary types based on characteristics
        if (characteristics.hasTextModifications) {
            secondaryTypes.push(EvolutionType.CONTENT_REFINEMENT);
        }
        if (characteristics.hasIntentChanges) {
            secondaryTypes.push(EvolutionType.INTENT_CLARIFICATION);
        }
        if (characteristics.hasSectionAdditions || characteristics.hasSectionRemovals) {
            secondaryTypes.push(EvolutionType.SECTION_MIGRATION);
        }
        return { primaryType, secondaryTypes };
    }
    /**
     * Calculate significance factors
     */
    async calculateSignificanceFactors(evolution, characteristics) {
        // Magnitude: How much changed
        const magnitude = Math.min((characteristics.totalChanges / 20) * 0.6 +
            (characteristics.overallChangeScore * 0.4), 1);
        // Scope: How broadly it changed
        const scope = Math.min((characteristics.structuralRatio + characteristics.contentRatio + characteristics.semanticRatio) / 3, 1);
        // Depth: How deeply it changed (based on semantic changes)
        const depth = Math.min(characteristics.semanticRatio * 0.7 + characteristics.structuralRatio * 0.3, 1);
        // Novelty: How unique the change is (simplified)
        const novelty = this.calculateNoveltyScore(characteristics);
        // Impact: Predicted impact (simplified)
        const impact = Math.min(magnitude * 0.4 + scope * 0.3 + depth * 0.3, 1);
        // Complexity: How complex the change is
        const complexity = Math.min((characteristics.totalChanges / 15) * 0.5 +
            (characteristics.semanticRatio * 0.5), 1);
        return {
            magnitude,
            scope,
            depth,
            novelty,
            impact,
            complexity
        };
    }
    /**
     * Calculate overall significance score
     */
    calculateSignificanceScore(factors) {
        return (factors.magnitude * this.SIGNIFICANCE_WEIGHTS.magnitude +
            factors.scope * this.SIGNIFICANCE_WEIGHTS.scope +
            factors.depth * this.SIGNIFICANCE_WEIGHTS.depth +
            factors.novelty * this.SIGNIFICANCE_WEIGHTS.novelty +
            factors.impact * this.SIGNIFICANCE_WEIGHTS.impact +
            factors.complexity * this.SIGNIFICANCE_WEIGHTS.complexity);
    }
    /**
     * Calculate classification confidence
     */
    calculateClassificationConfidence(patterns, factors, characteristics) {
        let confidence = 0.5; // Base confidence
        // Increase confidence based on pattern strength
        if (patterns.length > 0) {
            const avgPatternStrength = patterns.reduce((sum, p) => sum + p.matchStrength, 0) / patterns.length;
            confidence += avgPatternStrength * 0.3;
        }
        // Increase confidence based on data completeness
        const dataCompleteness = Math.min(characteristics.totalChanges / 5, 1);
        confidence += dataCompleteness * 0.2;
        // Adjust for significance factors consistency
        const factorVariance = this.calculateVariance(Object.values(factors));
        if (factorVariance < 0.1) {
            confidence += 0.1; // More consistent factors = higher confidence
        }
        return Math.min(Math.max(confidence, 0), 1);
    }
    /**
     * Generate classification reasoning
     */
    generateClassificationReasoning(primaryType, significanceScore, patterns, characteristics) {
        const significanceLevel = this.getSignificanceLevel(significanceScore);
        const strongestPattern = patterns[0];
        let reasoning = `Classified as ${primaryType.replace(/_/g, ' ')} with ${significanceLevel} significance (${(significanceScore * 100).toFixed(1)}%).`;
        if (strongestPattern) {
            reasoning += ` Primary pattern: ${strongestPattern.patternName} (${(strongestPattern.matchStrength * 100).toFixed(1)}% match).`;
        }
        // Add key characteristics
        const keyCharacteristics = [];
        if (characteristics.totalChanges > 10)
            keyCharacteristics.push(`${characteristics.totalChanges} total changes`);
        if (characteristics.hasHierarchyChanges)
            keyCharacteristics.push('hierarchy modifications');
        if (characteristics.hasMeaningShifts)
            keyCharacteristics.push('semantic shifts');
        if (characteristics.totalWordCount > 100)
            keyCharacteristics.push('substantial content changes');
        if (keyCharacteristics.length > 0) {
            reasoning += ` Key factors: ${keyCharacteristics.join(', ')}.`;
        }
        return reasoning;
    }
    /**
     * Helper methods for change analysis
     */
    calculateChangeMagnitude(change) {
        let magnitude = 0;
        // Base magnitude from change type
        switch (change.changeType) {
            case ChangeType.ADD:
                magnitude = 0.3;
                break;
            case ChangeType.MODIFY:
                magnitude = 0.5;
                break;
            case ChangeType.DELETE:
                magnitude = 0.7;
                break;
            case ChangeType.RESTRUCTURE:
                magnitude = 0.8;
                break;
            default:
                magnitude = 0.4;
        }
        // Adjust based on content size
        if (change.newContent || change.oldContent) {
            const contentLength = Math.max(change.newContent?.length || 0, change.oldContent?.length || 0);
            magnitude += Math.min(contentLength / 1000, 0.3);
        }
        return Math.min(magnitude, 1);
    }
    calculateChangeComplexity(change) {
        let complexity = 0.3; // Base complexity
        // Increase complexity based on affected chunks
        complexity += Math.min(change.affectedChunks.length * 0.1, 0.3);
        // Increase complexity based on change scope
        switch (change.changeScope) {
            case ChangeScope.DOCUMENT:
                complexity += 0.4;
                break;
            case ChangeScope.SECTION:
                complexity += 0.3;
                break;
            case ChangeScope.PARAGRAPH:
                complexity += 0.2;
                break;
            case ChangeScope.CHUNK:
                complexity += 0.1;
                break;
        }
        return Math.min(complexity, 1);
    }
    mapChangeScopeToScore(scope) {
        switch (scope) {
            case ChangeScope.DOCUMENT: return 1.0;
            case ChangeScope.SECTION: return 0.8;
            case ChangeScope.PARAGRAPH: return 0.6;
            case ChangeScope.CHUNK: return 0.4;
            case ChangeScope.SEMANTIC: return 0.7;
            default: return 0.5;
        }
    }
    mapChangeTypeToEvolution(changeType) {
        switch (changeType) {
            case ChangeType.ADD:
                return EvolutionType.CONTENT_EXPANSION;
            case ChangeType.DELETE:
                return EvolutionType.CONTENT_REDUCTION;
            case ChangeType.MODIFY:
                return EvolutionType.CONTENT_REFINEMENT;
            case ChangeType.RESTRUCTURE:
                return EvolutionType.STRUCTURAL_REORGANIZATION;
            case ChangeType.MOVE:
                return EvolutionType.SECTION_MIGRATION;
            case ChangeType.SPLIT:
                return EvolutionType.DOCUMENT_SPLITTING;
            case ChangeType.MERGE:
                return EvolutionType.DOCUMENT_MERGING;
            default:
                return EvolutionType.UNKNOWN_PATTERN;
        }
    }
    async refineClassificationWithContent(baseType, oldContent, newContent) {
        try {
            // Use semantic analysis to refine classification
            const similarity = await this.aiAnalysisService.calculateSemanticSimilarity(oldContent, newContent);
            // If semantic similarity is very low, it might be a rewrite
            if (similarity < 0.3 && baseType === EvolutionType.CONTENT_REFINEMENT) {
                return EvolutionType.COMPLETE_REWRITE;
            }
            // If content is much longer, it's expansion
            if (newContent.length > oldContent.length * 1.5 && baseType === EvolutionType.CONTENT_REFINEMENT) {
                return EvolutionType.CONTENT_EXPANSION;
            }
            // If content is much shorter, it's reduction
            if (newContent.length < oldContent.length * 0.7 && baseType === EvolutionType.CONTENT_REFINEMENT) {
                return EvolutionType.CONTENT_REDUCTION;
            }
            return baseType;
        }
        catch (error) {
            this.logger.warn('Content-based classification refinement failed:', error);
            return baseType;
        }
    }
    calculateChangeConfidence(change) {
        let confidence = 0.5;
        // Increase confidence based on available data
        if (change.oldContent && change.newContent)
            confidence += 0.2;
        if (change.affectedChunks.length > 0)
            confidence += 0.1;
        if (change.changeLocation)
            confidence += 0.1;
        if (change.changeConfidence)
            confidence += change.changeConfidence * 0.1;
        return Math.min(confidence, 1);
    }
    calculateNoveltyScore(characteristics) {
        // Simplified novelty calculation
        // In practice, this would compare against historical patterns
        let novelty = 0.5;
        // Unusual change distributions increase novelty
        const { add, modify, remove, move } = characteristics.changeDistribution;
        const total = add + modify + remove + move;
        if (total > 0) {
            const addRatio = add / total;
            const removeRatio = remove / total;
            // High removal rate is unusual
            if (removeRatio > 0.6)
                novelty += 0.2;
            // Pure addition is common
            if (addRatio > 0.8 && removeRatio === 0)
                novelty -= 0.1;
        }
        return Math.min(Math.max(novelty, 0), 1);
    }
    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }
    countChangesByType(changes, types) {
        return changes.filter(change => types.includes(change.type)).length;
    }
    /**
     * Load evolution patterns
     */
    async loadEvolutionPatterns() {
        // In practice, this would load patterns from a database or configuration
        // For now, we'll define some basic patterns
        const patterns = [
            {
                patternId: 'content_expansion',
                patternName: 'Content Expansion',
                matchStrength: 0.8,
                description: 'Document content significantly expanded',
                significance: 0.6,
                frequency: 0.7
            },
            {
                patternId: 'routine_update',
                patternName: 'Routine Update',
                matchStrength: 0.7,
                description: 'Minor routine updates and corrections',
                significance: 0.2,
                frequency: 0.9
            },
            {
                patternId: 'structural_reorganization',
                patternName: 'Structural Reorganization',
                matchStrength: 0.9,
                description: 'Document structure reorganized',
                significance: 0.8,
                frequency: 0.3
            }
        ];
        patterns.forEach(pattern => {
            this.evolutionPatterns.set(pattern.patternId, pattern);
        });
        this.logger.debug(`Loaded ${patterns.length} evolution patterns`);
    }
    /**
     * Get classification metrics
     */
    getMetrics() {
        const significanceDistribution = this.classificationHistory.reduce((dist, classification) => {
            const level = this.getSignificanceLevel(classification.significanceScore);
            dist[level] = (dist[level] || 0) + 1;
            return dist;
        }, {});
        return {
            totalChanges: this.classificationHistory.length,
            classificationAccuracy: 0.85, // Would need validation data to calculate real accuracy
            processingTime: 0, // Would track actual processing times
            patternsDetected: this.evolutionPatterns.size,
            significanceDistribution
        };
    }
    /**
     * Clear classification history
     */
    clearHistory() {
        this.classificationHistory = [];
        this.logger.debug('Classification history cleared');
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new VersionTrackingError('EvolutionClassifier not initialized. Call initialize() first.', 'SERVICE_NOT_INITIALIZED');
        }
    }
    /**
     * Shutdown service
     */
    async shutdown() {
        this.evolutionPatterns.clear();
        this.classificationHistory = [];
        this.initialized = false;
        this.logger.info('EvolutionClassifier shutdown complete');
    }
}
export default EvolutionClassifier;
//# sourceMappingURL=EvolutionClassifier.js.map