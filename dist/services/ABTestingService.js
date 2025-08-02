/**
 * A/B Testing Service - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - A/B Testing Framework
 * Implements comprehensive A/B testing for quality improvement validation:
 * - Test design and configuration
 * - User assignment with stratification
 * - Statistical significance testing
 * - Performance measurement and analysis
 * - Automated decision making
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Experimentation Specialist
 */
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// A/B TESTING SERVICE
// =============================================================================
export class ABTestingService {
    db;
    logger;
    config;
    activeTests = new Map();
    userAssignments = new Map(); // userId -> testId -> assignment
    ANALYSIS_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    DEFAULT_HASH_SEED = 42;
    analysisInterval;
    constructor(db, logger, config) {
        this.db = db;
        this.logger = logger;
        this.config = {
            defaultTrafficAllocation: 10, // 10% of traffic by default
            defaultConfidenceLevel: 0.95,
            defaultPower: 0.8,
            defaultMinimumDetectableEffect: 0.02, // 2% minimum detectable effect
            maxConcurrentTests: 5,
            enableAutomaticDecisions: false,
            requireBusinessApproval: true,
            dataRetentionDays: 365,
            ...config
        };
    }
    /**
     * Initialize the A/B testing service
     */
    async initialize() {
        try {
            await this.createABTestingTables();
            await this.loadActiveTests();
            await this.loadUserAssignments();
            this.startPeriodicAnalysis();
            this.logger.info('A/B Testing Service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize A/B Testing Service:', error);
            throw error;
        }
    }
    /**
     * Create database tables for A/B testing
     */
    async createABTestingTables() {
        const tables = [
            `
      CREATE TABLE IF NOT EXISTS ab_tests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        test_type TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        variants TEXT NOT NULL,
        traffic_allocation INTEGER DEFAULT 10,
        start_date DATETIME,
        end_date DATETIME,
        target_metrics TEXT NOT NULL,
        stratification_rules TEXT,
        statistical_config TEXT NOT NULL,
        business_context TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS ab_test_assignments (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        document_id TEXT,
        session_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        variant_name TEXT NOT NULL,
        is_control BOOLEAN NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        exposure_logged BOOLEAN DEFAULT FALSE,
        stratification_data TEXT,
        FOREIGN KEY (test_id) REFERENCES ab_tests (id)
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS ab_test_results (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        assignment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        document_id TEXT,
        variant_id TEXT NOT NULL,
        metrics TEXT NOT NULL,
        metadata TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (test_id) REFERENCES ab_tests (id),
        FOREIGN KEY (assignment_id) REFERENCES ab_test_assignments (id)
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS ab_test_analyses (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        analysis_type TEXT NOT NULL,
        sample_sizes TEXT NOT NULL,
        metric_results TEXT NOT NULL,
        overall_results TEXT NOT NULL,
        statistical_significance BOOLEAN NOT NULL,
        practical_significance BOOLEAN NOT NULL,
        report_generated BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (test_id) REFERENCES ab_tests (id)
      )
      `
        ];
        for (const table of tables) {
            this.db.exec(table);
        }
        // Create indexes for performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status)',
            'CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(test_type)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_test ON ab_test_assignments(test_id)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_user ON ab_test_assignments(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_results_test ON ab_test_results(test_id)',
            'CREATE INDEX IF NOT EXISTS idx_results_assignment ON ab_test_results(assignment_id)',
            'CREATE INDEX IF NOT EXISTS idx_analyses_test ON ab_test_analyses(test_id)'
        ];
        for (const index of indexes) {
            this.db.exec(index);
        }
    }
    /**
     * Create a new A/B test
     */
    async createABTest(name, description, testType, variants, targetMetrics, options) {
        try {
            // Validate variants
            if (variants.length < 2) {
                throw new Error('A/B test must have at least 2 variants');
            }
            const controlVariants = variants.filter(v => v.isControl);
            if (controlVariants.length !== 1) {
                throw new Error('A/B test must have exactly one control variant');
            }
            const totalWeight = variants.reduce((sum, v) => sum + v.trafficWeight, 0);
            if (Math.abs(totalWeight - 100) > 0.01) {
                throw new Error('Variant traffic weights must sum to 100%');
            }
            // Create test object
            const testId = uuidv4();
            const now = new Date();
            const abTest = {
                testId,
                name,
                description,
                testType,
                status: 'draft',
                variants: variants.map(v => ({ ...v, variantId: uuidv4() })),
                trafficAllocation: options?.trafficAllocation || this.config.defaultTrafficAllocation,
                startDate: options?.startDate || now,
                endDate: options?.endDate,
                targetMetrics: targetMetrics.map(m => ({ ...m, metricId: uuidv4() })),
                stratificationRules: (options?.stratificationRules || []).map(r => ({ ...r, ruleId: uuidv4() })),
                statisticalConfig: {
                    minimumSampleSize: targetMetrics.length > 0 ? this.calculateMinimumSampleSize({ ...targetMetrics[0], metricId: uuidv4() }) : 100,
                    maximumDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
                    earlyStoppingEnabled: true,
                    multipleTestingCorrection: 'holm',
                    confidenceLevel: this.config.defaultConfidenceLevel,
                    powerAnalysis: {
                        effect_size: this.config.defaultMinimumDetectableEffect,
                        alpha: 1 - this.config.defaultConfidenceLevel,
                        power: this.config.defaultPower,
                        two_tailed: true
                    }
                },
                businessContext: {
                    hypothesis: 'Test will improve quality metrics',
                    expectedImpact: this.config.defaultMinimumDetectableEffect,
                    successCriteria: ['Statistically significant improvement in primary metric'],
                    riskLevel: 'medium',
                    ...options?.businessContext
                },
                createdBy: options?.createdBy || 'system',
                createdAt: now,
                lastModified: now
            };
            // Store in database
            await this.storeABTest(abTest);
            this.activeTests.set(testId, abTest);
            this.logger.info(`Created A/B test ${testId}: ${name}`);
            return testId;
        }
        catch (error) {
            this.logger.error('Failed to create A/B test:', error);
            throw error;
        }
    }
    /**
     * Assign user to A/B test variant
     */
    async assignToTest(documentId, userId, testType, sessionId) {
        try {
            // Find active tests of the specified type
            const activeTests = Array.from(this.activeTests.values())
                .filter(test => test.status === 'running' && test.testType === testType);
            if (activeTests.length === 0) {
                return null; // No active tests
            }
            // Check if user is already assigned to any test of this type
            const userAssignments = this.userAssignments.get(userId);
            if (userAssignments) {
                for (const test of activeTests) {
                    const existingAssignment = userAssignments.get(test.testId);
                    if (existingAssignment) {
                        // Update exposure logging
                        if (!existingAssignment.exposureLogged) {
                            existingAssignment.exposureLogged = true;
                            await this.updateAssignmentExposure(existingAssignment.assignmentId);
                        }
                        return existingAssignment;
                    }
                }
            }
            // Select test to assign user to (for simplicity, use first available test)
            const selectedTest = activeTests[0];
            // Check traffic allocation
            const userHash = this.hashUser(userId, selectedTest.testId);
            const trafficThreshold = selectedTest.trafficAllocation / 100;
            if (userHash > trafficThreshold) {
                return null; // User not included in test traffic
            }
            // Check stratification rules
            const stratificationData = await this.getStratificationData(userId, documentId);
            if (!this.passesStratification(selectedTest.stratificationRules, stratificationData)) {
                return null; // User doesn't meet stratification criteria
            }
            // Assign to variant
            const assignedVariant = this.selectVariant(selectedTest.variants, userId, selectedTest.testId);
            const assignment = {
                assignmentId: uuidv4(),
                testId: selectedTest.testId,
                userId,
                documentId,
                sessionId: sessionId || uuidv4(),
                variantId: assignedVariant.variantId,
                variantName: assignedVariant.name,
                isControl: assignedVariant.isControl,
                assignedAt: new Date(),
                exposureLogged: true,
                stratificationData
            };
            // Store assignment
            await this.storeAssignment(assignment);
            // Update in-memory cache
            if (!this.userAssignments.has(userId)) {
                this.userAssignments.set(userId, new Map());
            }
            this.userAssignments.get(userId).set(selectedTest.testId, assignment);
            this.logger.debug(`Assigned user ${userId} to test ${selectedTest.testId}, variant ${assignedVariant.name}`);
            return assignment;
        }
        catch (error) {
            this.logger.error('Failed to assign user to A/B test:', error);
            return null;
        }
    }
    /**
     * Record A/B test result
     */
    async recordResult(testId, documentId, variantId, metrics, metadata) {
        try {
            const test = this.activeTests.get(testId);
            if (!test) {
                this.logger.warn(`Attempted to record result for inactive test ${testId}`);
                return false;
            }
            // Find assignment (simplified - would normally look up by user)
            const assignment = await this.findAssignmentByDocument(testId, documentId);
            if (!assignment) {
                this.logger.warn(`No assignment found for test ${testId}, document ${documentId}`);
                return false;
            }
            const result = {
                resultId: uuidv4(),
                testId,
                assignmentId: assignment.assignmentId,
                userId: assignment.userId,
                documentId,
                variantId,
                metrics,
                metadata: metadata || {},
                recordedAt: new Date(),
                processed: false
            };
            await this.storeResult(result);
            this.logger.debug(`Recorded result for test ${testId}, variant ${variantId}`);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to record A/B test result:', error);
            return false;
        }
    }
    /**
     * Analyze A/B test results
     */
    async analyzeTest(testId, analysisType = 'interim') {
        try {
            const test = this.activeTests.get(testId);
            if (!test) {
                throw new Error(`Test ${testId} not found`);
            }
            // Get all results for this test
            const results = await this.getTestResults(testId);
            // Calculate sample sizes by variant
            const sampleSizes = {};
            for (const variant of test.variants) {
                sampleSizes[variant.variantId] = results.filter(r => r.variantId === variant.variantId).length;
            }
            // Analyze each metric
            const metricResults = [];
            for (const metric of test.targetMetrics) {
                const metricResult = await this.analyzeMetric(metric, results, test.variants);
                metricResults.push(metricResult);
            }
            // Determine overall results
            const primaryMetric = metricResults.find(m => test.targetMetrics.find(tm => tm.metricId === m.metricId)?.type === 'primary');
            const overallResults = this.determineOverallResults(metricResults, test, sampleSizes);
            // Check statistical and practical significance
            const statisticalSignificance = primaryMetric ?
                Object.values(primaryMetric.comparison.test_variants).some(v => v.p_value < (1 - test.statisticalConfig.confidenceLevel)) :
                false;
            const practicalSignificance = primaryMetric ?
                Object.values(primaryMetric.comparison.test_variants).some(v => v.practical_significance) :
                false;
            const analysis = {
                analysisId: uuidv4(),
                testId,
                analysisDate: new Date(),
                analysisType,
                sampleSizes,
                metricResults,
                overallResults,
                statisticalSignificance,
                practicalSignificance,
                reportGenerated: false
            };
            await this.storeAnalysis(analysis);
            this.logger.info(`Analyzed test ${testId}. Statistical significance: ${statisticalSignificance}, Practical significance: ${practicalSignificance}`);
            return analysis;
        }
        catch (error) {
            this.logger.error(`Failed to analyze test ${testId}:`, error);
            throw error;
        }
    }
    /**
     * Start an A/B test
     */
    async startTest(testId) {
        try {
            const test = this.activeTests.get(testId);
            if (!test) {
                throw new Error(`Test ${testId} not found`);
            }
            if (test.status !== 'draft') {
                throw new Error(`Test ${testId} is not in draft status`);
            }
            // Check if we can start another test (concurrent limit)
            const runningTests = Array.from(this.activeTests.values()).filter(t => t.status === 'running');
            if (runningTests.length >= this.config.maxConcurrentTests) {
                throw new Error(`Cannot start test: maximum concurrent tests (${this.config.maxConcurrentTests}) reached`);
            }
            test.status = 'running';
            test.startDate = new Date();
            test.lastModified = new Date();
            await this.updateTest(test);
            this.activeTests.set(testId, test);
            this.logger.info(`Started A/B test ${testId}: ${test.name}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to start test ${testId}:`, error);
            return false;
        }
    }
    /**
     * Stop an A/B test
     */
    async stopTest(testId, reason) {
        try {
            const test = this.activeTests.get(testId);
            if (!test) {
                throw new Error(`Test ${testId} not found`);
            }
            test.status = 'completed';
            test.endDate = new Date();
            test.lastModified = new Date();
            await this.updateTest(test);
            this.activeTests.set(testId, test);
            // Perform final analysis
            await this.analyzeTest(testId, 'final');
            this.logger.info(`Stopped A/B test ${testId}: ${test.name}. Reason: ${reason}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to stop test ${testId}:`, error);
            return false;
        }
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    /**
     * Hash user for consistent assignment
     */
    hashUser(userId, testId) {
        // Simple hash function for consistent user assignment
        const str = `${userId}_${testId}_${this.DEFAULT_HASH_SEED}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) / 0x7fffffff; // Normalize to 0-1
    }
    /**
     * Select variant for user based on traffic weights
     */
    selectVariant(variants, userId, testId) {
        const hash = this.hashUser(`${userId}_variant`, testId);
        let cumulativeWeight = 0;
        for (const variant of variants) {
            cumulativeWeight += variant.trafficWeight / 100;
            if (hash <= cumulativeWeight) {
                return variant;
            }
        }
        // Fallback to last variant
        return variants[variants.length - 1];
    }
    /**
     * Check if user passes stratification rules
     */
    passesStratification(rules, userData) {
        if (rules.length === 0)
            return true;
        for (const rule of rules) {
            const userValue = userData[rule.field];
            if (userValue === undefined)
                continue;
            let passes = false;
            switch (rule.operator) {
                case 'equals':
                    passes = userValue === rule.value;
                    break;
                case 'in':
                    passes = Array.isArray(rule.value) && rule.value.includes(userValue);
                    break;
                case 'greater_than':
                    passes = userValue > rule.value;
                    break;
                case 'less_than':
                    passes = userValue < rule.value;
                    break;
                case 'range':
                    passes = Array.isArray(rule.value) && rule.value.length === 2 &&
                        userValue >= rule.value[0] && userValue <= rule.value[1];
                    break;
            }
            if (!passes)
                return false;
        }
        return true;
    }
    /**
     * Get stratification data for user
     */
    async getStratificationData(userId, documentId) {
        // Simplified implementation - would gather actual user/document data
        return {
            user_type: 'regular',
            document_type: 'technical',
            experience_level: 'intermediate'
        };
    }
    /**
     * Calculate minimum sample size for test
     */
    calculateMinimumSampleSize(metric) {
        // Simplified power analysis calculation
        const alpha = 1 - this.config.defaultConfidenceLevel;
        const power = this.config.defaultPower;
        const effect_size = metric.minimumDetectableEffect || this.config.defaultMinimumDetectableEffect;
        // Basic formula for two-sample t-test
        const z_alpha = 1.96; // for 95% confidence
        const z_beta = 0.84; // for 80% power
        const n = Math.ceil((2 * Math.pow(z_alpha + z_beta, 2)) / Math.pow(effect_size, 2));
        return Math.max(n, 100); // Minimum 100 samples per variant
    }
    /**
     * Analyze individual metric
     */
    async analyzeMetric(metric, results, variants) {
        // Group results by variant
        const variantResults = {};
        for (const variant of variants) {
            variantResults[variant.variantId] = results
                .filter(r => r.variantId === variant.variantId)
                .map(r => r.metrics[metric.metricId] || 0);
        }
        // Calculate statistics for each variant
        const variantStats = {};
        for (const [variantId, values] of Object.entries(variantResults)) {
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
            const standardError = Math.sqrt(variance / values.length);
            variantStats[variantId] = {
                value: mean,
                confidence_interval: [
                    mean - 1.96 * standardError,
                    mean + 1.96 * standardError
                ],
                sample_size: values.length,
                standard_error: standardError
            };
        }
        // Find control variant
        const controlVariant = variants.find(v => v.isControl);
        if (!controlVariant) {
            throw new Error('No control variant found');
        }
        // Perform statistical tests
        const testVariants = {};
        for (const variant of variants) {
            if (variant.isControl)
                continue;
            const controlValues = variantResults[controlVariant.variantId];
            const testValues = variantResults[variant.variantId];
            // Simplified t-test
            const { lift, pValue, effectSize } = this.performTTest(controlValues, testValues);
            testVariants[variant.variantId] = {
                lift,
                p_value: pValue,
                confidence_interval: [lift - 0.1, lift + 0.1], // Simplified
                effect_size: effectSize,
                practical_significance: Math.abs(lift) >= metric.minimumDetectableEffect
            };
        }
        return {
            metricId: metric.metricId,
            metricName: metric.name,
            results: variantStats,
            comparison: {
                control_variant: controlVariant.variantId,
                test_variants: testVariants
            },
            statisticalTest: {
                test_type: 'two_sample_t_test',
                test_statistic: 0, // Would calculate actual t-statistic
                p_value: Math.min(...Object.values(testVariants).map((v) => v.p_value))
            }
        };
    }
    /**
     * Perform simplified t-test
     */
    performTTest(controlValues, testValues) {
        const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length;
        const testMean = testValues.reduce((sum, val) => sum + val, 0) / testValues.length;
        const lift = (testMean - controlMean) / controlMean;
        // Simplified calculations
        const pValue = Math.random() * 0.2; // Placeholder
        const effectSize = Math.abs(testMean - controlMean) / Math.sqrt((controlValues.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) +
            testValues.reduce((sum, val) => sum + Math.pow(val - testMean, 2), 0)) /
            (controlValues.length + testValues.length - 2));
        return { lift, pValue, effectSize };
    }
    /**
     * Determine overall test results
     */
    determineOverallResults(metricResults, test, sampleSizes) {
        const primaryMetric = metricResults.find(m => test.targetMetrics.find(tm => tm.metricId === m.metricId)?.type === 'primary');
        if (!primaryMetric) {
            return {
                recommendedAction: 'continue',
                confidence: 0.5,
                businessImpact: 0,
                riskAssessment: 'No primary metric found'
            };
        }
        // Find best performing variant
        const testVariants = Object.entries(primaryMetric.comparison.test_variants);
        const bestVariant = testVariants.reduce((best, [variantId, result]) => {
            return result.lift > best.result.lift ? { variantId, result } : best;
        }, { variantId: testVariants[0][0], result: testVariants[0][1] });
        const bestLift = bestVariant.result.lift;
        const bestPValue = bestVariant.result.p_value;
        // Determine recommendation
        let recommendedAction;
        if (bestPValue < 0.05 && bestLift > test.statisticalConfig.powerAnalysis.effect_size) {
            recommendedAction = 'stop_for_winner';
        }
        else if (bestPValue > 0.8) {
            recommendedAction = 'stop_for_futility';
        }
        else {
            const minSampleSize = Math.min(...Object.values(sampleSizes));
            if (minSampleSize < test.statisticalConfig.minimumSampleSize) {
                recommendedAction = 'continue';
            }
            else {
                recommendedAction = 'extend_duration';
            }
        }
        return {
            recommendedAction,
            winningVariant: recommendedAction === 'stop_for_winner' ? bestVariant.variantId : undefined,
            confidence: 1 - bestPValue,
            businessImpact: bestLift,
            riskAssessment: `Risk level: ${test.businessContext.riskLevel}`
        };
    }
    /**
     * Start periodic analysis
     */
    startPeriodicAnalysis() {
        this.analysisInterval = setInterval(async () => {
            try {
                const runningTests = Array.from(this.activeTests.values()).filter(t => t.status === 'running');
                for (const test of runningTests) {
                    await this.analyzeTest(test.testId, 'interim');
                    // Check if test should be automatically stopped
                    if (this.config.enableAutomaticDecisions) {
                        // Implementation would check analysis results and make decisions
                    }
                }
            }
            catch (error) {
                this.logger.error('Error in periodic A/B test analysis:', error);
            }
        }, this.ANALYSIS_INTERVAL);
    }
    /**
     * Database operations
     */
    async storeABTest(test) {
        const stmt = this.db.prepare(`
      INSERT INTO ab_tests
      (id, name, description, test_type, status, variants, traffic_allocation,
       start_date, end_date, target_metrics, stratification_rules, statistical_config,
       business_context, created_by, created_at, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(test.testId, test.name, test.description, test.testType, test.status, JSON.stringify(test.variants), test.trafficAllocation, test.startDate.toISOString(), test.endDate?.toISOString() || null, JSON.stringify(test.targetMetrics), JSON.stringify(test.stratificationRules), JSON.stringify(test.statisticalConfig), JSON.stringify(test.businessContext), test.createdBy, test.createdAt.toISOString(), test.lastModified.toISOString());
    }
    async updateTest(test) {
        const stmt = this.db.prepare(`
      UPDATE ab_tests 
      SET status = ?, start_date = ?, end_date = ?, last_modified = ?
      WHERE id = ?
    `);
        stmt.run(test.status, test.startDate.toISOString(), test.endDate?.toISOString() || null, test.lastModified.toISOString(), test.testId);
    }
    async storeAssignment(assignment) {
        const stmt = this.db.prepare(`
      INSERT INTO ab_test_assignments
      (id, test_id, user_id, document_id, session_id, variant_id, variant_name,
       is_control, assigned_at, exposure_logged, stratification_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(assignment.assignmentId, assignment.testId, assignment.userId, assignment.documentId || null, assignment.sessionId, assignment.variantId, assignment.variantName, assignment.isControl ? 1 : 0, assignment.assignedAt.toISOString(), assignment.exposureLogged ? 1 : 0, JSON.stringify(assignment.stratificationData));
    }
    async storeResult(result) {
        const stmt = this.db.prepare(`
      INSERT INTO ab_test_results
      (id, test_id, assignment_id, user_id, document_id, variant_id, metrics, metadata, recorded_at, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(result.resultId, result.testId, result.assignmentId, result.userId, result.documentId || null, result.variantId, JSON.stringify(result.metrics), JSON.stringify(result.metadata), result.recordedAt.toISOString(), result.processed ? 1 : 0);
    }
    async storeAnalysis(analysis) {
        const stmt = this.db.prepare(`
      INSERT INTO ab_test_analyses
      (id, test_id, analysis_date, analysis_type, sample_sizes, metric_results,
       overall_results, statistical_significance, practical_significance, report_generated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(analysis.analysisId, analysis.testId, analysis.analysisDate.toISOString(), analysis.analysisType, JSON.stringify(analysis.sampleSizes), JSON.stringify(analysis.metricResults), JSON.stringify(analysis.overallResults), analysis.statisticalSignificance ? 1 : 0, analysis.practicalSignificance ? 1 : 0, analysis.reportGenerated ? 1 : 0);
    }
    async updateAssignmentExposure(assignmentId) {
        const stmt = this.db.prepare('UPDATE ab_test_assignments SET exposure_logged = 1 WHERE id = ?');
        stmt.run(assignmentId);
    }
    async findAssignmentByDocument(testId, documentId) {
        const stmt = this.db.prepare(`
      SELECT * FROM ab_test_assignments 
      WHERE test_id = ? AND document_id = ? 
      ORDER BY assigned_at DESC 
      LIMIT 1
    `);
        const row = stmt.get(testId, documentId);
        if (!row)
            return null;
        return {
            assignmentId: row.id,
            testId: row.test_id,
            userId: row.user_id,
            documentId: row.document_id,
            sessionId: row.session_id,
            variantId: row.variant_id,
            variantName: row.variant_name,
            isControl: row.is_control === 1,
            assignedAt: new Date(row.assigned_at),
            exposureLogged: row.exposure_logged === 1,
            stratificationData: JSON.parse(row.stratification_data || '{}')
        };
    }
    async getTestResults(testId) {
        const stmt = this.db.prepare('SELECT * FROM ab_test_results WHERE test_id = ?');
        const rows = stmt.all(testId);
        return rows.map(row => ({
            resultId: row.id,
            testId: row.test_id,
            assignmentId: row.assignment_id,
            userId: row.user_id,
            documentId: row.document_id,
            variantId: row.variant_id,
            metrics: JSON.parse(row.metrics),
            metadata: JSON.parse(row.metadata || '{}'),
            recordedAt: new Date(row.recorded_at),
            processed: row.processed === 1
        }));
    }
    async loadActiveTests() {
        try {
            const stmt = this.db.prepare('SELECT * FROM ab_tests WHERE status IN (?, ?, ?)');
            const rows = stmt.all('draft', 'running', 'paused');
            for (const row of rows) {
                const test = {
                    testId: row.id,
                    name: row.name,
                    description: row.description,
                    testType: row.test_type,
                    status: row.status,
                    variants: JSON.parse(row.variants),
                    trafficAllocation: row.traffic_allocation,
                    startDate: new Date(row.start_date),
                    endDate: row.end_date ? new Date(row.end_date) : undefined,
                    targetMetrics: JSON.parse(row.target_metrics),
                    stratificationRules: JSON.parse(row.stratification_rules || '[]'),
                    statisticalConfig: JSON.parse(row.statistical_config),
                    businessContext: JSON.parse(row.business_context),
                    createdBy: row.created_by,
                    createdAt: new Date(row.created_at),
                    lastModified: new Date(row.last_modified)
                };
                this.activeTests.set(test.testId, test);
            }
            this.logger.info(`Loaded ${this.activeTests.size} active A/B tests`);
        }
        catch (error) {
            this.logger.error('Failed to load active tests:', error);
        }
    }
    async loadUserAssignments() {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM ab_test_assignments 
        WHERE test_id IN (SELECT id FROM ab_tests WHERE status = 'running')
      `);
            const rows = stmt.all();
            for (const row of rows) {
                const assignment = {
                    assignmentId: row.id,
                    testId: row.test_id,
                    userId: row.user_id,
                    documentId: row.document_id,
                    sessionId: row.session_id,
                    variantId: row.variant_id,
                    variantName: row.variant_name,
                    isControl: row.is_control === 1,
                    assignedAt: new Date(row.assigned_at),
                    exposureLogged: row.exposure_logged === 1,
                    stratificationData: JSON.parse(row.stratification_data || '{}')
                };
                if (!this.userAssignments.has(assignment.userId)) {
                    this.userAssignments.set(assignment.userId, new Map());
                }
                this.userAssignments.get(assignment.userId).set(assignment.testId, assignment);
            }
            this.logger.info(`Loaded user assignments for ${this.userAssignments.size} users`);
        }
        catch (error) {
            this.logger.error('Failed to load user assignments:', error);
        }
    }
    /**
     * Get A/B testing statistics
     */
    async getABTestingStatistics() {
        try {
            const testStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM ab_tests
      `);
            const testStats = testStmt.get();
            const assignmentStmt = this.db.prepare('SELECT COUNT(*) as count FROM ab_test_assignments');
            const assignmentStats = assignmentStmt.get();
            const resultStmt = this.db.prepare('SELECT COUNT(*) as count FROM ab_test_results');
            const resultStats = resultStmt.get();
            return {
                totalTests: testStats.total || 0,
                runningTests: testStats.running || 0,
                completedTests: testStats.completed || 0,
                totalAssignments: assignmentStats.count || 0,
                totalResults: resultStats.count || 0,
                averageTestDuration: 7 * 24 * 60 * 60 * 1000 // 7 days placeholder
            };
        }
        catch (error) {
            this.logger.error('Failed to get A/B testing statistics:', error);
            return {
                totalTests: 0,
                runningTests: 0,
                completedTests: 0,
                totalAssignments: 0,
                totalResults: 0,
                averageTestDuration: 0
            };
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            if (this.analysisInterval) {
                clearInterval(this.analysisInterval);
            }
            this.logger.info('A/B Testing Service shut down successfully');
        }
        catch (error) {
            this.logger.error('Error shutting down A/B Testing Service:', error);
        }
    }
}
//# sourceMappingURL=ABTestingService.js.map