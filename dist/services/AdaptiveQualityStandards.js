/**
 * Adaptive Quality Standards - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Dynamic Quality Standard Adjustment
 * Implements adaptive quality standards that evolve based on:
 * - Document types and domain-specific requirements
 * - Performance data and success metrics
 * - User feedback and satisfaction levels
 * - Historical quality trends and benchmarks
 * - Context-aware threshold optimization
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Quality Standards Specialist
 */
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// ADAPTIVE QUALITY STANDARDS SERVICE
// =============================================================================
export class AdaptiveQualityStandards {
    db;
    logger;
    qualityLearningEngine;
    standards = new Map();
    adaptationRules = new Map();
    benchmarks = new Map();
    ADAPTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    MIN_SAMPLES_FOR_ADAPTATION = 50;
    EFFECTIVENESS_THRESHOLD = 0.7;
    constructor(db, logger, qualityLearningEngine) {
        this.db = db;
        this.logger = logger;
        this.qualityLearningEngine = qualityLearningEngine;
    }
    /**
     * Initialize the adaptive quality standards service
     */
    async initialize() {
        try {
            await this.createStandardsTables();
            await this.loadExistingStandards();
            await this.loadAdaptationRules();
            await this.loadBenchmarks();
            await this.initializeDefaultStandards();
            this.logger.info('Adaptive Quality Standards service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Adaptive Quality Standards service:', error);
            throw error;
        }
    }
    /**
     * Create database tables for standards management
     */
    async createStandardsTables() {
        const tables = [
            `
      CREATE TABLE IF NOT EXISTS quality_standards (
        id TEXT PRIMARY KEY,
        standard_type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        target TEXT NOT NULL,
        thresholds TEXT NOT NULL,
        weights TEXT NOT NULL,
        context_conditions TEXT,
        version TEXT DEFAULT '1.0.0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        effectiveness REAL DEFAULT 0.5
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS adaptation_rules (
        id TEXT PRIMARY KEY,
        rule_type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        effectiveness REAL DEFAULT 0.5,
        execution_count INTEGER DEFAULT 0,
        last_executed DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS quality_benchmarks (
        id TEXT PRIMARY KEY,
        benchmark_type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        target TEXT NOT NULL,
        benchmark_values TEXT NOT NULL,
        source_data TEXT,
        confidence REAL DEFAULT 0.5,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS standard_performance_metrics (
        id TEXT PRIMARY KEY,
        standard_id TEXT NOT NULL,
        applications_count INTEGER DEFAULT 0,
        average_accuracy REAL DEFAULT 0.0,
        user_satisfaction_score REAL DEFAULT 0.0,
        false_positive_rate REAL DEFAULT 0.0,
        false_negative_rate REAL DEFAULT 0.0,
        adaptation_frequency INTEGER DEFAULT 0,
        trend_direction TEXT DEFAULT 'stable',
        last_evaluated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standard_id) REFERENCES quality_standards (id)
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS standards_adaptation_history (
        id TEXT PRIMARY KEY,
        adaptation_type TEXT NOT NULL,
        standards_affected TEXT NOT NULL,
        changes_made TEXT NOT NULL,
        reason TEXT,
        effectiveness_before REAL,
        effectiveness_after REAL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_by TEXT DEFAULT 'system'
      )
      `
        ];
        for (const table of tables) {
            this.db.exec(table);
        }
        // Create indexes for performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_standards_type ON quality_standards(standard_type)',
            'CREATE INDEX IF NOT EXISTS idx_standards_target ON quality_standards(target)',
            'CREATE INDEX IF NOT EXISTS idx_standards_active ON quality_standards(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_adaptation_rules_type ON adaptation_rules(rule_type)',
            'CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON quality_benchmarks(benchmark_type)',
            'CREATE INDEX IF NOT EXISTS idx_performance_standard ON standard_performance_metrics(standard_id)'
        ];
        for (const index of indexes) {
            this.db.exec(index);
        }
    }
    /**
     * Initialize default quality standards for different document types
     */
    async initializeDefaultStandards() {
        const defaultStandards = [
            {
                standardType: 'document_type',
                name: 'Technical Documentation Standard',
                description: 'Quality standards for technical documentation',
                target: 'technical',
                thresholds: {
                    clarity: 0.8,
                    completeness: 0.85,
                    accuracy: 0.9,
                    relevance: 0.8,
                    consistency: 0.85,
                    structure: 0.8
                },
                weights: {
                    clarity: 0.2,
                    completeness: 0.2,
                    accuracy: 0.25,
                    relevance: 0.15,
                    consistency: 0.1,
                    structure: 0.1
                },
                contextConditions: [
                    {
                        type: 'technical_complexity',
                        operator: 'gt',
                        value: 0.7,
                        weight: 0.3
                    }
                ]
            },
            {
                standardType: 'document_type',
                name: 'API Documentation Standard',
                description: 'Quality standards for API documentation',
                target: 'api',
                thresholds: {
                    clarity: 0.85,
                    completeness: 0.9,
                    accuracy: 0.95,
                    relevance: 0.9,
                    consistency: 0.9,
                    structure: 0.85
                },
                weights: {
                    clarity: 0.15,
                    completeness: 0.25,
                    accuracy: 0.3,
                    relevance: 0.15,
                    consistency: 0.1,
                    structure: 0.05
                },
                contextConditions: []
            },
            {
                standardType: 'document_type',
                name: 'User Guide Standard',
                description: 'Quality standards for user guides and tutorials',
                target: 'guide',
                thresholds: {
                    clarity: 0.9,
                    completeness: 0.8,
                    accuracy: 0.85,
                    relevance: 0.85,
                    consistency: 0.8,
                    structure: 0.85
                },
                weights: {
                    clarity: 0.3,
                    completeness: 0.2,
                    accuracy: 0.15,
                    relevance: 0.2,
                    consistency: 0.1,
                    structure: 0.05
                },
                contextConditions: [
                    {
                        type: 'audience_level',
                        operator: 'eq',
                        value: 'beginner',
                        weight: 0.4
                    }
                ]
            },
            {
                standardType: 'global',
                name: 'General Quality Standard',
                description: 'Default quality standard for all document types',
                target: 'all',
                thresholds: {
                    clarity: 0.7,
                    completeness: 0.7,
                    accuracy: 0.8,
                    relevance: 0.75,
                    consistency: 0.75,
                    structure: 0.7
                },
                weights: {
                    clarity: 0.2,
                    completeness: 0.2,
                    accuracy: 0.2,
                    relevance: 0.15,
                    consistency: 0.15,
                    structure: 0.1
                },
                contextConditions: []
            }
        ];
        for (const standardData of defaultStandards) {
            const existingStandard = Array.from(this.standards.values())
                .find(s => s.name === standardData.name);
            if (!existingStandard) {
                const standard = {
                    id: uuidv4(),
                    standardType: standardData.standardType,
                    name: standardData.name,
                    description: standardData.description,
                    target: standardData.target,
                    thresholds: standardData.thresholds,
                    weights: standardData.weights,
                    contextConditions: standardData.contextConditions || [],
                    version: '1.0.0',
                    createdAt: new Date(),
                    lastUpdated: new Date(),
                    isActive: true,
                    effectiveness: 0.7
                };
                await this.storeStandard(standard);
                this.standards.set(standard.id, standard);
                this.logger.info(`Created default standard: ${standard.name}`);
            }
        }
    }
    /**
     * Select appropriate quality standard for a document
     */
    async selectStandard(documentType, context) {
        try {
            // Get all active standards
            const activeStandards = Array.from(this.standards.values())
                .filter(s => s.isActive);
            // Score standards based on relevance to context
            const scoredStandards = activeStandards.map(standard => {
                const relevanceScore = this.calculateStandardRelevance(standard, documentType, context);
                return { standard, score: relevanceScore };
            });
            // Sort by relevance score (descending)
            scoredStandards.sort((a, b) => b.score - a.score);
            // Return the most relevant standard
            const selectedStandard = scoredStandards[0]?.standard;
            if (!selectedStandard) {
                // Fallback to global standard
                const globalStandard = activeStandards.find(s => s.standardType === 'global');
                if (globalStandard) {
                    this.logger.warn(`No specific standard found for ${documentType}, using global standard`);
                    return globalStandard;
                }
                else {
                    throw new Error('No quality standards available');
                }
            }
            this.logger.debug(`Selected standard "${selectedStandard.name}" for document type "${documentType}"`);
            return selectedStandard;
        }
        catch (error) {
            this.logger.error('Failed to select quality standard:', error);
            throw error;
        }
    }
    /**
     * Calculate relevance score for a standard given context
     */
    calculateStandardRelevance(standard, documentType, context) {
        let score = 0;
        // Base relevance based on target match
        if (standard.target === documentType) {
            score += 1.0;
        }
        else if (standard.target === 'all' || standard.standardType === 'global') {
            score += 0.5;
        }
        // Context conditions matching
        for (const condition of standard.contextConditions) {
            const contextValue = context[condition.type];
            if (contextValue !== undefined) {
                const conditionMet = this.evaluateCondition(condition, contextValue);
                if (conditionMet) {
                    score += condition.weight;
                }
            }
        }
        // Effectiveness bonus
        score *= (0.5 + standard.effectiveness * 0.5);
        return score;
    }
    /**
     * Evaluate if a context condition is met
     */
    evaluateCondition(condition, contextValue) {
        switch (condition.operator) {
            case 'gt':
                return contextValue > condition.value;
            case 'lt':
                return contextValue < condition.value;
            case 'gte':
                return contextValue >= condition.value;
            case 'lte':
                return contextValue <= condition.value;
            case 'eq':
                return contextValue === condition.value;
            case 'in':
                return Array.isArray(condition.value) && condition.value.includes(contextValue);
            case 'contains':
                return typeof contextValue === 'string' && contextValue.includes(condition.value);
            default:
                return false;
        }
    }
    /**
     * Adapt quality standards based on performance data and feedback
     */
    async adaptStandards() {
        const startTime = Date.now();
        try {
            let adaptationsApplied = 0;
            const standardsModified = [];
            const standardsCreated = [];
            const standardsDeactivated = [];
            const recommendations = [];
            // Get performance data from quality learning engine
            const learningStats = await this.qualityLearningEngine.getLearningStatistics();
            // Evaluate each active adaptation rule
            for (const rule of this.adaptationRules.values()) {
                if (!rule.isActive)
                    continue;
                const shouldExecute = await this.evaluateAdaptationRule(rule);
                if (shouldExecute) {
                    const result = await this.executeAdaptationRule(rule);
                    if (result.success) {
                        adaptationsApplied++;
                        standardsModified.push(...result.standardsModified);
                        standardsCreated.push(...result.standardsCreated);
                        standardsDeactivated.push(...result.standardsDeactivated);
                        // Update rule execution tracking
                        rule.executionCount++;
                        rule.lastExecuted = new Date();
                        await this.updateAdaptationRule(rule);
                    }
                }
            }
            // Analyze performance trends and generate recommendations
            const performanceAnalysis = await this.analyzeStandardPerformance();
            recommendations.push(...performanceAnalysis.recommendations);
            // Calculate overall effectiveness
            const effectiveness = adaptationsApplied > 0
                ? performanceAnalysis.averageEffectiveness
                : 0.5;
            // Schedule next adaptation
            const nextAdaptationDate = new Date(Date.now() + this.ADAPTATION_INTERVAL);
            const result = {
                adaptationsApplied,
                standardsModified,
                standardsCreated,
                standardsDeactivated,
                effectiveness,
                confidenceLevel: learningStats.modelAccuracy || 0.7,
                recommendations,
                nextAdaptationDate
            };
            // Log adaptation history
            await this.logAdaptationHistory(result);
            this.logger.info(`Standards adaptation completed in ${Date.now() - startTime}ms. Applied ${adaptationsApplied} adaptations.`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to adapt quality standards:', error);
            throw error;
        }
    }
    /**
     * Evaluate if an adaptation rule should be executed
     */
    async evaluateAdaptationRule(rule) {
        try {
            for (const condition of rule.conditions) {
                const conditionMet = await this.evaluateAdaptationCondition(condition);
                if (!conditionMet) {
                    return false; // All conditions must be met
                }
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to evaluate adaptation rule ${rule.id}:`, error);
            return false;
        }
    }
    /**
     * Evaluate a specific adaptation condition
     */
    async evaluateAdaptationCondition(condition) {
        try {
            switch (condition.type) {
                case 'performance_metric':
                    return await this.evaluatePerformanceCondition(condition);
                case 'user_feedback':
                    return await this.evaluateUserFeedbackCondition(condition);
                case 'trend_analysis':
                    return await this.evaluateTrendCondition(condition);
                case 'pattern_detection':
                    return await this.evaluatePatternCondition(condition);
                default:
                    return false;
            }
        }
        catch (error) {
            this.logger.error('Failed to evaluate adaptation condition:', error);
            return false;
        }
    }
    /**
     * Evaluate performance-based condition
     */
    async evaluatePerformanceCondition(condition) {
        const stmt = this.db.prepare(`
      SELECT AVG(${condition.metric}) as avg_value
      FROM standard_performance_metrics
      WHERE last_evaluated > datetime('now', '-${condition.window}')
    `);
        const result = stmt.get();
        const currentValue = result?.avg_value || 0;
        switch (condition.operator) {
            case 'gt':
                return currentValue > condition.value;
            case 'lt':
                return currentValue < condition.value;
            default:
                return false;
        }
    }
    /**
     * Evaluate user feedback condition
     */
    async evaluateUserFeedbackCondition(condition) {
        const stmt = this.db.prepare(`
      SELECT AVG(rating) as avg_rating
      FROM user_feedback
      WHERE timestamp > datetime('now', '-${condition.window}')
      AND feedback_type = ?
    `);
        const result = stmt.get(condition.metric);
        const avgRating = result?.avg_rating || 0;
        switch (condition.operator) {
            case 'lt':
                return avgRating < condition.value;
            case 'gt':
                return avgRating > condition.value;
            default:
                return false;
        }
    }
    /**
     * Evaluate trend condition
     */
    async evaluateTrendCondition(condition) {
        const stmt = this.db.prepare(`
      SELECT trend_direction
      FROM standard_performance_metrics
      WHERE last_evaluated > datetime('now', '-${condition.window}')
      GROUP BY trend_direction
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `);
        const result = stmt.get();
        const dominantTrend = result?.trend_direction || 'stable';
        switch (condition.operator) {
            case 'trend_up':
                return dominantTrend === 'improving';
            case 'trend_down':
                return dominantTrend === 'declining';
            default:
                return false;
        }
    }
    /**
     * Evaluate pattern detection condition
     */
    async evaluatePatternCondition(condition) {
        // This would integrate with the learning engine's pattern recognition
        const patterns = await this.qualityLearningEngine.recognizePatterns();
        const relevantPatterns = patterns.patterns.filter(p => p.patternType === condition.metric && p.confidence > 0.7);
        return relevantPatterns.length > 0;
    }
    /**
     * Execute an adaptation rule
     */
    async executeAdaptationRule(rule) {
        const result = {
            success: false,
            standardsModified: [],
            standardsCreated: [],
            standardsDeactivated: [],
            error: undefined
        };
        try {
            for (const action of rule.actions) {
                switch (action.type) {
                    case 'adjust_threshold':
                        const adjustResult = await this.adjustStandardThreshold(action);
                        if (adjustResult.success) {
                            result.standardsModified.push(...adjustResult.modifiedStandards);
                        }
                        break;
                    case 'modify_weight':
                        // Similar implementation for weight modification
                        break;
                    case 'create_standard':
                        const createResult = await this.createAdaptiveStandard(action);
                        if (createResult.success) {
                            result.standardsCreated.push(createResult.standardId);
                        }
                        break;
                    case 'deactivate_standard':
                        const deactivateResult = await this.deactivateStandard(action.target);
                        if (deactivateResult.success) {
                            result.standardsDeactivated.push(action.target);
                        }
                        break;
                }
            }
            result.success = true;
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to execute adaptation rule ${rule.id}:`, error);
        }
        return result;
    }
    /**
     * Adjust standard threshold based on adaptation action
     */
    async adjustStandardThreshold(action) {
        try {
            const standards = Array.from(this.standards.values())
                .filter(s => s.target === action.target || action.target === 'all');
            const modifiedStandards = [];
            for (const standard of standards) {
                const adjustment = action.adjustment;
                const newThresholds = { ...standard.thresholds };
                // Apply threshold adjustments
                if (adjustment.dimension && adjustment.delta) {
                    const dimension = adjustment.dimension;
                    newThresholds[dimension] = Math.min(1, Math.max(0, newThresholds[dimension] + adjustment.delta));
                    standard.thresholds = newThresholds;
                    standard.lastUpdated = new Date();
                    standard.version = this.incrementVersion(standard.version);
                    await this.updateStandard(standard);
                    modifiedStandards.push(standard.id);
                    this.logger.info(`Adjusted ${dimension} threshold for standard "${standard.name}" by ${adjustment.delta}`);
                }
            }
            return { success: true, modifiedStandards };
        }
        catch (error) {
            this.logger.error('Failed to adjust standard threshold:', error);
            return { success: false, modifiedStandards: [] };
        }
    }
    /**
     * Create new adaptive standard based on learned patterns
     */
    async createAdaptiveStandard(action) {
        try {
            const patterns = await this.qualityLearningEngine.recognizePatterns();
            const relevantPatterns = patterns.patterns.filter(p => p.confidence > 0.8 && p.effectiveness > 0.7);
            if (relevantPatterns.length === 0) {
                return { success: false };
            }
            // Create new standard based on patterns
            const newStandard = {
                id: uuidv4(),
                standardType: 'domain',
                name: `Adaptive Standard - ${action.target}`,
                description: `Auto-generated standard based on learned patterns for ${action.target}`,
                target: action.target,
                thresholds: this.deriveThresholdsFromPatterns(relevantPatterns),
                weights: this.deriveWeightsFromPatterns(relevantPatterns),
                contextConditions: [],
                version: '1.0.0',
                createdAt: new Date(),
                lastUpdated: new Date(),
                isActive: true,
                effectiveness: action.confidence
            };
            await this.storeStandard(newStandard);
            this.standards.set(newStandard.id, newStandard);
            this.logger.info(`Created adaptive standard: ${newStandard.name}`);
            return { success: true, standardId: newStandard.id };
        }
        catch (error) {
            this.logger.error('Failed to create adaptive standard:', error);
            return { success: false };
        }
    }
    /**
     * Derive quality thresholds from learning patterns
     */
    deriveThresholdsFromPatterns(patterns) {
        // Simplified implementation - would be more sophisticated in practice
        const baseThresholds = {
            clarity: 0.75,
            completeness: 0.75,
            accuracy: 0.8,
            relevance: 0.75,
            consistency: 0.75,
            structure: 0.7
        };
        // Adjust based on patterns
        for (const pattern of patterns) {
            if (pattern.patternType === 'quality_improvement' && pattern.effectiveness > 0.8) {
                // Increase thresholds for dimensions that show strong patterns
                Object.keys(baseThresholds).forEach(key => {
                    baseThresholds[key] += 0.05;
                });
            }
        }
        // Ensure values stay within bounds
        Object.keys(baseThresholds).forEach(key => {
            baseThresholds[key] = Math.min(1, Math.max(0, baseThresholds[key]));
        });
        return baseThresholds;
    }
    /**
     * Derive quality weights from learning patterns
     */
    deriveWeightsFromPatterns(patterns) {
        // Default equal weights
        const weights = {
            clarity: 0.167,
            completeness: 0.167,
            accuracy: 0.167,
            relevance: 0.167,
            consistency: 0.166,
            structure: 0.166
        };
        // This would be more sophisticated, analyzing which dimensions
        // are most predictive of quality in the patterns
        return weights;
    }
    /**
     * Deactivate a quality standard
     */
    async deactivateStandard(standardId) {
        try {
            const standard = this.standards.get(standardId);
            if (!standard) {
                return { success: false };
            }
            standard.isActive = false;
            standard.lastUpdated = new Date();
            await this.updateStandard(standard);
            this.logger.info(`Deactivated standard: ${standard.name}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to deactivate standard:', error);
            return { success: false };
        }
    }
    /**
     * Analyze performance of all standards
     */
    async analyzeStandardPerformance() {
        const recommendations = [];
        let totalEffectiveness = 0;
        let activeStandardsCount = 0;
        for (const standard of this.standards.values()) {
            if (!standard.isActive)
                continue;
            activeStandardsCount++;
            totalEffectiveness += standard.effectiveness;
            // Generate recommendations based on effectiveness
            if (standard.effectiveness < this.EFFECTIVENESS_THRESHOLD) {
                recommendations.push(`Consider reviewing or updating standard "${standard.name}" (effectiveness: ${standard.effectiveness.toFixed(2)})`);
            }
        }
        const averageEffectiveness = activeStandardsCount > 0
            ? totalEffectiveness / activeStandardsCount
            : 0.5;
        if (averageEffectiveness < this.EFFECTIVENESS_THRESHOLD) {
            recommendations.push('Overall standard effectiveness is below threshold - consider comprehensive review');
        }
        return { averageEffectiveness, recommendations };
    }
    /**
     * Store a quality standard in the database
     */
    async storeStandard(standard) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quality_standards
      (id, standard_type, name, description, target, thresholds, weights, 
       context_conditions, version, created_at, last_updated, is_active, effectiveness)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(standard.id, standard.standardType, standard.name, standard.description, standard.target, JSON.stringify(standard.thresholds), JSON.stringify(standard.weights), JSON.stringify(standard.contextConditions), standard.version, standard.createdAt.toISOString(), standard.lastUpdated.toISOString(), standard.isActive ? 1 : 0, standard.effectiveness);
    }
    /**
     * Update an existing standard
     */
    async updateStandard(standard) {
        await this.storeStandard(standard);
        this.standards.set(standard.id, standard);
    }
    /**
     * Update adaptation rule
     */
    async updateAdaptationRule(rule) {
        const stmt = this.db.prepare(`
      UPDATE adaptation_rules
      SET execution_count = ?, last_executed = ?, effectiveness = ?
      WHERE id = ?
    `);
        stmt.run(rule.executionCount, rule.lastExecuted?.toISOString() || null, rule.effectiveness, rule.id);
        this.adaptationRules.set(rule.id, rule);
    }
    /**
     * Increment version string
     */
    incrementVersion(version) {
        const parts = version.split('.');
        const patch = parseInt(parts[2] || '0') + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }
    /**
     * Log adaptation history
     */
    async logAdaptationHistory(result) {
        const stmt = this.db.prepare(`
      INSERT INTO standards_adaptation_history
      (id, adaptation_type, standards_affected, changes_made, reason, 
       effectiveness_after, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(uuidv4(), 'automated_adaptation', JSON.stringify({
            modified: result.standardsModified,
            created: result.standardsCreated,
            deactivated: result.standardsDeactivated
        }), JSON.stringify(result.recommendations), 'Scheduled adaptive optimization', result.effectiveness, new Date().toISOString());
    }
    /**
     * Load existing standards from database
     */
    async loadExistingStandards() {
        try {
            const stmt = this.db.prepare('SELECT * FROM quality_standards WHERE is_active = 1');
            const rows = stmt.all();
            for (const row of rows) {
                const dbRow = row; // Database row from better-sqlite3
                const standard = {
                    id: dbRow.id,
                    standardType: dbRow.standard_type,
                    name: dbRow.name,
                    description: dbRow.description,
                    target: dbRow.target,
                    thresholds: JSON.parse(dbRow.thresholds),
                    weights: JSON.parse(dbRow.weights),
                    contextConditions: JSON.parse(dbRow.context_conditions || '[]'),
                    version: dbRow.version,
                    createdAt: new Date(dbRow.created_at),
                    lastUpdated: new Date(dbRow.last_updated),
                    isActive: dbRow.is_active === 1,
                    effectiveness: dbRow.effectiveness
                };
                this.standards.set(standard.id, standard);
            }
            this.logger.info(`Loaded ${this.standards.size} quality standards`);
        }
        catch (error) {
            this.logger.error('Failed to load existing standards:', error);
        }
    }
    /**
     * Load adaptation rules from database
     */
    async loadAdaptationRules() {
        // Implementation would load rules from database
        // For now, create some default rules
        await this.createDefaultAdaptationRules();
    }
    /**
     * Create default adaptation rules
     */
    async createDefaultAdaptationRules() {
        const defaultRules = [
            {
                ruleType: 'threshold_adjustment',
                name: 'Low Accuracy Threshold Adjustment',
                description: 'Adjust thresholds when accuracy is consistently low',
                conditions: [
                    {
                        type: 'performance_metric',
                        metric: 'average_accuracy',
                        operator: 'lt',
                        value: 0.7,
                        window: '7d'
                    }
                ],
                actions: [
                    {
                        type: 'adjust_threshold',
                        target: 'all',
                        adjustment: { dimension: 'accuracy', delta: -0.05 },
                        confidence: 0.8
                    }
                ],
                priority: 1,
                isActive: true,
                effectiveness: 0.7,
                executionCount: 0
            }
        ];
        for (const ruleData of defaultRules) {
            const rule = {
                id: uuidv4(),
                ruleType: ruleData.ruleType,
                name: ruleData.name,
                description: ruleData.description,
                conditions: ruleData.conditions,
                actions: ruleData.actions,
                priority: ruleData.priority || 1,
                isActive: ruleData.isActive !== false,
                effectiveness: ruleData.effectiveness || 0.5,
                executionCount: ruleData.executionCount || 0
            };
            this.adaptationRules.set(rule.id, rule);
        }
    }
    /**
     * Load benchmarks from database
     */
    async loadBenchmarks() {
        // Placeholder for benchmark loading
        this.logger.info('Benchmark loading not implemented');
    }
    /**
     * Get all active standards
     */
    getActiveStandards() {
        return Array.from(this.standards.values()).filter(s => s.isActive);
    }
    /**
     * Get standard by ID
     */
    getStandard(id) {
        return this.standards.get(id);
    }
    /**
     * Get adaptation statistics
     */
    async getAdaptationStatistics() {
        const totalStandards = this.standards.size;
        const activeStandards = Array.from(this.standards.values()).filter(s => s.isActive).length;
        const effectiveness = Array.from(this.standards.values())
            .filter(s => s.isActive)
            .reduce((sum, s) => sum + s.effectiveness, 0) / Math.max(activeStandards, 1);
        return {
            totalStandards,
            activeStandards,
            averageEffectiveness: effectiveness,
            adaptationRulesCount: this.adaptationRules.size
        };
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            this.logger.info('Adaptive Quality Standards service shut down successfully');
        }
        catch (error) {
            this.logger.error('Error shutting down Adaptive Quality Standards service:', error);
        }
    }
}
//# sourceMappingURL=AdaptiveQualityStandards.js.map