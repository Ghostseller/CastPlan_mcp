/**
 * Feedback Integration Service - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - User Feedback and Outcome Tracking
 * Implements comprehensive feedback integration system for continuous improvement:
 * - User feedback collection and validation
 * - Outcome tracking for quality improvements
 * - Supervised learning from feedback data
 * - Real-time feedback processing and integration
 * - Feedback-driven model adaptation
 *
 * Created: 2025-07-31
 * Author: AI Engineer - User Experience and Learning Specialist
 */
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// FEEDBACK INTEGRATION SERVICE
// =============================================================================
export class FeedbackIntegrationService {
    db;
    logger;
    qualityLearningEngine;
    config;
    pendingRequests = new Map();
    validationRules = new Map();
    FEEDBACK_PROCESSING_INTERVAL = 5000; // 5 seconds
    MAX_RESPONSE_TIME = 300000; // 5 minutes
    processingInterval;
    constructor(db, logger, qualityLearningEngine, config) {
        this.db = db;
        this.logger = logger;
        this.qualityLearningEngine = qualityLearningEngine;
        this.config = {
            maxPendingRequests: 100,
            feedbackExpirationTime: 24 * 60 * 60 * 1000, // 24 hours
            minConfidenceForLearning: 0.7,
            validationThreshold: 0.8,
            realTimeProcessing: true,
            anonymizeUserData: false,
            enablePredictiveFeedback: true,
            ...config
        };
    }
    /**
     * Initialize the feedback integration service
     */
    async initialize() {
        try {
            await this.createFeedbackTables();
            await this.loadPendingRequests();
            this.initializeValidationRules();
            if (this.config.realTimeProcessing) {
                this.startFeedbackProcessing();
            }
            this.logger.info('Feedback Integration Service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Feedback Integration Service:', error);
            throw error;
        }
    }
    /**
     * Create database tables for feedback management
     */
    async createFeedbackTables() {
        const tables = [
            `
      CREATE TABLE IF NOT EXISTS feedback_requests (
        id TEXT PRIMARY KEY,
        request_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        context TEXT NOT NULL,
        prompt_message TEXT NOT NULL,
        expected_response_type TEXT NOT NULL,
        options TEXT,
        priority TEXT DEFAULT 'medium',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS feedback_responses (
        id TEXT PRIMARY KEY,
        feedback_request_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        response_type TEXT NOT NULL,
        rating REAL,
        boolean_value BOOLEAN,
        text_value TEXT,
        selected_options TEXT,
        confidence REAL DEFAULT 0.5,
        response_time INTEGER NOT NULL,
        additional_comments TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        validated BOOLEAN DEFAULT FALSE,
        processed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (feedback_request_id) REFERENCES feedback_requests (id)
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS feedback_validation (
        id TEXT PRIMARY KEY,
        feedback_response_id TEXT NOT NULL,
        is_valid BOOLEAN NOT NULL,
        confidence REAL NOT NULL,
        validation_rules TEXT NOT NULL,
        anomalies TEXT,
        quality_score REAL NOT NULL,
        recommendations TEXT,
        validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feedback_response_id) REFERENCES feedback_responses (id)
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS outcome_tracking (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        intervention_type TEXT NOT NULL,
        before_metrics TEXT NOT NULL,
        after_metrics TEXT NOT NULL,
        user_satisfaction REAL NOT NULL,
        objective_improvement REAL NOT NULL,
        subjective_improvement REAL NOT NULL,
        intervention_success BOOLEAN NOT NULL,
        follow_up_feedback TEXT,
        measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        validation_status TEXT DEFAULT 'pending'
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS learning_updates (
        id TEXT PRIMARY KEY,
        update_type TEXT NOT NULL,
        source_data TEXT NOT NULL,
        confidence_level REAL NOT NULL,
        expected_improvement REAL NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        validated BOOLEAN DEFAULT FALSE,
        rollback_available BOOLEAN DEFAULT TRUE,
        rollback_data TEXT
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS user_feedback_profiles (
        user_id TEXT PRIMARY KEY,
        total_feedback_count INTEGER DEFAULT 0,
        average_response_time INTEGER DEFAULT 0,
        reliability_score REAL DEFAULT 0.5,
        expertise_areas TEXT,
        preferred_feedback_types TEXT,
        feedback_quality_score REAL DEFAULT 0.5,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      `
        ];
        for (const table of tables) {
            this.db.exec(table);
        }
        // Create indexes for performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_feedback_requests_user ON feedback_requests(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_feedback_requests_document ON feedback_requests(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_feedback_requests_status ON feedback_requests(status)',
            'CREATE INDEX IF NOT EXISTS idx_feedback_responses_request ON feedback_responses(feedback_request_id)',
            'CREATE INDEX IF NOT EXISTS idx_feedback_responses_user ON feedback_responses(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_outcome_tracking_document ON outcome_tracking(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_outcome_tracking_user ON outcome_tracking(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_learning_updates_type ON learning_updates(update_type)'
        ];
        for (const index of indexes) {
            this.db.exec(index);
        }
    }
    /**
     * Request feedback from users
     */
    async requestFeedback(requestType, userId, sessionId, documentId, context, options) {
        try {
            // Check if user has too many pending requests
            const userPendingCount = Array.from(this.pendingRequests.values())
                .filter(req => req.userId === userId && req.status === 'pending').length;
            if (userPendingCount >= 5) { // Max 5 pending requests per user
                throw new Error('User has too many pending feedback requests');
            }
            // Generate contextual prompt message
            const promptMessage = options?.promptMessage ||
                this.generateContextualPrompt(requestType, context);
            const request = {
                id: uuidv4(),
                requestType,
                userId,
                sessionId,
                documentId,
                context,
                promptMessage,
                expectedResponseType: options?.expectedResponseType || 'rating',
                options: options?.options,
                priority: options?.priority || 'medium',
                expiresAt: options?.expiresIn ? new Date(Date.now() + options.expiresIn) : undefined,
                createdAt: new Date(),
                status: 'pending'
            };
            // Store in database
            await this.storeFeedbackRequest(request);
            // Add to pending requests
            this.pendingRequests.set(request.id, request);
            this.logger.info(`Created feedback request ${request.id} for user ${userId}`);
            return request.id;
        }
        catch (error) {
            this.logger.error('Failed to request feedback:', error);
            throw error;
        }
    }
    /**
     * Submit feedback response
     */
    async submitFeedback(requestId, userId, responseData, responseTime) {
        try {
            const request = this.pendingRequests.get(requestId);
            if (!request || request.userId !== userId || request.status !== 'pending') {
                throw new Error('Invalid or expired feedback request');
            }
            // Validate response time
            if (responseTime > this.MAX_RESPONSE_TIME) {
                throw new Error('Response time exceeded maximum allowed duration');
            }
            const response = {
                id: uuidv4(),
                feedbackRequestId: requestId,
                userId,
                responseType: request.expectedResponseType,
                rating: responseData.rating,
                booleanValue: responseData.booleanValue,
                textValue: responseData.textValue,
                selectedOptions: responseData.selectedOptions,
                confidence: responseData.confidence || 0.8,
                responseTime,
                additionalComments: responseData.additionalComments,
                timestamp: new Date(),
                validated: false,
                processed: false
            };
            // Validate response format
            this.validateResponseFormat(response, request);
            // Store response
            await this.storeFeedbackResponse(response);
            // Update request status
            request.status = 'responded';
            await this.updateFeedbackRequestStatus(requestId, 'responded');
            this.pendingRequests.delete(requestId);
            // Validate feedback quality
            const validation = await this.validateFeedback(response);
            response.validated = validation.isValid;
            // Process for immediate learning if real-time processing is enabled
            if (this.config.realTimeProcessing && validation.isValid) {
                await this.processFeedbackForLearning(response);
            }
            // Update user profile
            await this.updateUserFeedbackProfile(userId, response, validation);
            this.logger.info(`Received feedback response ${response.id} for request ${requestId}`);
            return response;
        }
        catch (error) {
            this.logger.error('Failed to submit feedback:', error);
            throw error;
        }
    }
    /**
     * Track outcome of quality interventions
     */
    async trackOutcome(documentId, userId, interventionType, beforeMetrics, afterMetrics, userSatisfaction) {
        try {
            const objectiveImprovement = afterMetrics.overall - beforeMetrics.overall;
            const subjectiveImprovement = userSatisfaction - 0.5; // Assuming 0.5 as neutral
            const outcome = {
                outcomeId: uuidv4(),
                documentId,
                userId,
                interventionType,
                beforeMetrics,
                afterMetrics,
                userSatisfaction,
                objectiveImprovement,
                subjectiveImprovement,
                interventionSuccess: objectiveImprovement > 0 && userSatisfaction > 0.6,
                measuredAt: new Date(),
                validationStatus: 'pending'
            };
            await this.storeOutcomeTracking(outcome);
            // Request follow-up feedback if intervention was significant
            if (Math.abs(objectiveImprovement) > 0.1) {
                await this.requestFollowUpFeedback(outcome);
            }
            this.logger.info(`Tracked outcome ${outcome.outcomeId} for intervention on document ${documentId}`);
            return outcome.outcomeId;
        }
        catch (error) {
            this.logger.error('Failed to track outcome:', error);
            throw error;
        }
    }
    /**
     * Generate contextual prompt message for feedback requests
     */
    generateContextualPrompt(requestType, context) {
        switch (requestType) {
            case 'quality_rating':
                return `How would you rate the overall quality of this ${context.documentType} document? Please consider clarity, completeness, and usefulness.`;
            case 'improvement_validation':
                if (context.qualityScoreBefore && context.qualityScoreAfter) {
                    const improvement = context.qualityScoreAfter.overall - context.qualityScoreBefore.overall;
                    return `We made improvements to this document (quality score changed by ${improvement.toFixed(2)}). Do you notice an improvement in quality?`;
                }
                return 'We made improvements to this document. Do you notice an improvement in quality?';
            case 'issue_confirmation':
                const issueCount = context.issuesDetected?.length || 0;
                return `We detected ${issueCount} potential quality issues in this document. Do these seem accurate to you?`;
            case 'recommendation_rating':
                return 'How helpful were the quality improvement recommendations for this document?';
            default:
                return 'Please provide your feedback on the quality assessment of this document.';
        }
    }
    /**
     * Validate feedback response format
     */
    validateResponseFormat(response, request) {
        switch (request.expectedResponseType) {
            case 'rating':
                if (response.rating === undefined || response.rating < 0 || response.rating > 1) {
                    throw new Error('Rating must be between 0 and 1');
                }
                break;
            case 'boolean':
                if (response.booleanValue === undefined) {
                    throw new Error('Boolean value is required');
                }
                break;
            case 'text':
                if (!response.textValue || response.textValue.trim().length === 0) {
                    throw new Error('Text value is required');
                }
                break;
            case 'multiple_choice':
                if (!response.selectedOptions || response.selectedOptions.length === 0) {
                    throw new Error('At least one option must be selected');
                }
                if (request.options) {
                    const invalidOptions = response.selectedOptions.filter(option => !request.options.includes(option));
                    if (invalidOptions.length > 0) {
                        throw new Error(`Invalid options selected: ${invalidOptions.join(', ')}`);
                    }
                }
                break;
        }
    }
    /**
     * Validate feedback quality and detect anomalies
     */
    async validateFeedback(response) {
        const validationRules = [];
        let overallConfidence = 1.0;
        const anomalies = [];
        try {
            // Apply validation rules
            for (const [ruleName, ruleFunction] of this.validationRules.entries()) {
                try {
                    const rule = ruleFunction(response);
                    validationRules.push(rule);
                    if (!rule.passed) {
                        overallConfidence *= rule.confidence;
                        if (rule.confidence < 0.5) {
                            anomalies.push(`Failed ${ruleName}: ${rule.description}`);
                        }
                    }
                }
                catch (error) {
                    this.logger.warn(`Validation rule ${ruleName} failed:`, error);
                }
            }
            // Overall quality assessment
            const qualityScore = this.calculateFeedbackQualityScore(response, validationRules);
            const isValid = overallConfidence >= this.config.validationThreshold && qualityScore > 0.6;
            const validation = {
                isValid,
                confidence: overallConfidence,
                validationRules,
                anomalies,
                qualityScore,
                recommendations: this.generateValidationRecommendations(validationRules, qualityScore)
            };
            // Store validation results
            await this.storeFeedbackValidation(response.id, validation);
            return validation;
        }
        catch (error) {
            this.logger.error('Failed to validate feedback:', error);
            return {
                isValid: false,
                confidence: 0,
                validationRules: [],
                anomalies: ['Validation process failed'],
                qualityScore: 0,
                recommendations: ['Manual review required']
            };
        }
    }
    /**
     * Initialize validation rules
     */
    initializeValidationRules() {
        // Response time consistency rule
        this.validationRules.set('response_time_consistency', (response) => {
            const typicalResponseTime = this.getTypicalResponseTime(response.responseType);
            const deviation = Math.abs(response.responseTime - typicalResponseTime) / typicalResponseTime;
            const passed = deviation < 2.0; // Within 200% of typical time
            return {
                type: 'temporal_pattern',
                description: 'Response time within expected range',
                passed,
                confidence: passed ? 0.9 : Math.max(0.1, 1 - deviation / 2),
                details: { responseTime: response.responseTime, typical: typicalResponseTime, deviation }
            };
        });
        // Rating consistency rule
        this.validationRules.set('rating_consistency', (response) => {
            if (response.responseType !== 'rating' || response.rating === undefined) {
                return {
                    type: 'consistency',
                    description: 'Not applicable for non-rating responses',
                    passed: true,
                    confidence: 1.0,
                    details: {}
                };
            }
            // Check if rating is consistent with additional comments sentiment
            const sentimentScore = response.additionalComments
                ? this.analyzeSentiment(response.additionalComments)
                : response.rating;
            const consistency = 1 - Math.abs(response.rating - sentimentScore);
            const passed = consistency > 0.7;
            return {
                type: 'consistency',
                description: 'Rating consistent with comment sentiment',
                passed,
                confidence: consistency,
                details: { rating: response.rating, sentimentScore, consistency }
            };
        });
        // Outlier detection rule
        this.validationRules.set('outlier_detection', (response) => {
            const userStats = this.getUserFeedbackStats(response.userId);
            const isOutlier = this.isResponseOutlier(response, userStats);
            return {
                type: 'outlier_detection',
                description: 'Response within user\'s typical patterns',
                passed: !isOutlier,
                confidence: isOutlier ? 0.3 : 0.9,
                details: { isOutlier, userStats }
            };
        });
    }
    /**
     * Get typical response time for response type
     */
    getTypicalResponseTime(responseType) {
        const defaults = {
            'rating': 15000, // 15 seconds
            'boolean': 8000, // 8 seconds
            'text': 45000, // 45 seconds
            'multiple_choice': 20000 // 20 seconds
        };
        return defaults[responseType] || 30000;
    }
    /**
     * Analyze sentiment of text (simplified implementation)
     */
    analyzeSentiment(text) {
        // Simplified sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'helpful', 'clear', 'useful', 'better', 'improved'];
        const negativeWords = ['bad', 'poor', 'unclear', 'confusing', 'useless', 'worse', 'terrible'];
        const words = text.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;
        words.forEach(word => {
            if (positiveWords.includes(word))
                positiveCount++;
            if (negativeWords.includes(word))
                negativeCount++;
        });
        const totalSentimentWords = positiveCount + negativeCount;
        if (totalSentimentWords === 0)
            return 0.5; // Neutral
        return positiveCount / totalSentimentWords;
    }
    /**
     * Get user feedback statistics
     */
    getUserFeedbackStats(userId) {
        try {
            const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_responses,
          AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
          AVG(response_time) as avg_response_time,
          AVG(confidence) as avg_confidence
        FROM feedback_responses 
        WHERE user_id = ?
      `);
            return stmt.get(userId) || {
                total_responses: 0,
                avg_rating: 0.5,
                avg_response_time: 30000,
                avg_confidence: 0.5
            };
        }
        catch (error) {
            return {
                total_responses: 0,
                avg_rating: 0.5,
                avg_response_time: 30000,
                avg_confidence: 0.5
            };
        }
    }
    /**
     * Check if response is an outlier for the user
     */
    isResponseOutlier(response, userStats) {
        if (userStats.total_responses < 5)
            return false; // Not enough data
        // Check rating outlier
        if (response.rating !== undefined && userStats.avg_rating !== null) {
            const ratingDeviation = Math.abs(response.rating - userStats.avg_rating);
            if (ratingDeviation > 0.4)
                return true; // More than 40% deviation
        }
        // Check response time outlier
        const timeDeviation = Math.abs(response.responseTime - userStats.avg_response_time) / userStats.avg_response_time;
        if (timeDeviation > 3.0)
            return true; // More than 300% deviation
        return false;
    }
    /**
     * Calculate feedback quality score
     */
    calculateFeedbackQualityScore(response, validationRules) {
        let score = 0.5; // Base score
        // Factor in validation rules
        const passedRules = validationRules.filter(r => r.passed).length;
        const totalRules = validationRules.length;
        if (totalRules > 0) {
            score += (passedRules / totalRules) * 0.3;
        }
        // Factor in response confidence
        score += response.confidence * 0.2;
        // Factor in response completeness
        if (response.additionalComments && response.additionalComments.length > 10) {
            score += 0.1; // Bonus for detailed feedback
        }
        return Math.min(1.0, score);
    }
    /**
     * Generate validation recommendations
     */
    generateValidationRecommendations(validationRules, qualityScore) {
        const recommendations = [];
        if (qualityScore < 0.5) {
            recommendations.push('Consider manual review of this feedback');
        }
        const failedRules = validationRules.filter(r => !r.passed);
        if (failedRules.length > 0) {
            recommendations.push(`Failed validation rules: ${failedRules.map(r => r.type).join(', ')}`);
        }
        if (qualityScore > 0.8) {
            recommendations.push('High-quality feedback - use for immediate learning');
        }
        return recommendations;
    }
    /**
     * Process validated feedback for learning
     */
    async processFeedbackForLearning(response) {
        try {
            if (!response.validated) {
                this.logger.warn(`Skipping unvalidated feedback ${response.id} for learning`);
                return;
            }
            // Convert feedback to learning data
            const learningContext = await this.convertFeedbackToLearningContext(response);
            if (learningContext) {
                await this.qualityLearningEngine.recordLearningContext(learningContext);
                this.logger.debug(`Processed feedback ${response.id} for learning`);
            }
            // Mark as processed
            await this.markFeedbackAsProcessed(response.id);
        }
        catch (error) {
            this.logger.error(`Failed to process feedback ${response.id} for learning:`, error);
        }
    }
    /**
     * Convert feedback response to learning context
     */
    async convertFeedbackToLearningContext(response) {
        // This would convert the feedback into a format suitable for the learning engine
        // Implementation depends on the specific learning context structure
        // For now, return a placeholder
        return null;
    }
    /**
     * Request follow-up feedback for significant outcomes
     */
    async requestFollowUpFeedback(outcome) {
        const context = {
            documentType: 'unknown', // Would need to be retrieved
            documentLength: 0,
            qualityScoreBefore: outcome.beforeMetrics,
            qualityScoreAfter: outcome.afterMetrics,
            improvementAttempted: true
        };
        await this.requestFeedback('improvement_validation', outcome.userId, uuidv4(), outcome.documentId, context, {
            priority: 'medium',
            expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
    /**
     * Start periodic feedback processing
     */
    startFeedbackProcessing() {
        this.processingInterval = setInterval(async () => {
            try {
                await this.processPendingFeedback();
                await this.cleanupExpiredRequests();
            }
            catch (error) {
                this.logger.error('Error in feedback processing interval:', error);
            }
        }, this.FEEDBACK_PROCESSING_INTERVAL);
    }
    /**
     * Process pending feedback responses
     */
    async processPendingFeedback() {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM feedback_responses 
        WHERE processed = FALSE AND validated = TRUE
        LIMIT 10
      `);
            const pendingResponses = stmt.all();
            for (const row of pendingResponses) {
                const response = {
                    id: row.id,
                    feedbackRequestId: row.feedback_request_id,
                    userId: row.user_id,
                    responseType: row.response_type,
                    rating: row.rating,
                    booleanValue: row.boolean_value === 1,
                    textValue: row.text_value,
                    selectedOptions: row.selected_options ? JSON.parse(row.selected_options) : undefined,
                    confidence: row.confidence,
                    responseTime: row.response_time,
                    additionalComments: row.additional_comments,
                    timestamp: new Date(row.timestamp),
                    validated: row.validated === 1,
                    processed: row.processed === 1
                };
                await this.processFeedbackForLearning(response);
            }
        }
        catch (error) {
            this.logger.error('Failed to process pending feedback:', error);
        }
    }
    /**
     * Cleanup expired feedback requests
     */
    async cleanupExpiredRequests() {
        try {
            const now = new Date();
            const expiredRequests = Array.from(this.pendingRequests.values())
                .filter(req => req.expiresAt && req.expiresAt < now);
            for (const request of expiredRequests) {
                request.status = 'expired';
                await this.updateFeedbackRequestStatus(request.id, 'expired');
                this.pendingRequests.delete(request.id);
            }
            if (expiredRequests.length > 0) {
                this.logger.info(`Cleaned up ${expiredRequests.length} expired feedback requests`);
            }
        }
        catch (error) {
            this.logger.error('Failed to cleanup expired requests:', error);
        }
    }
    /**
     * Get feedback analytics
     */
    async getFeedbackAnalytics(timeWindow = '30d') {
        try {
            // Total feedback count
            const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as total FROM feedback_responses 
        WHERE timestamp > datetime('now', '-${timeWindow}')
      `);
            const totalResult = totalStmt.get();
            // Response rate
            const requestsStmt = this.db.prepare(`
        SELECT COUNT(*) as total FROM feedback_requests 
        WHERE created_at > datetime('now', '-${timeWindow}')
      `);
            const requestsResult = requestsStmt.get();
            const responseRate = requestsResult.total > 0
                ? totalResult.total / requestsResult.total
                : 0;
            // Average response time
            const responseTimeStmt = this.db.prepare(`
        SELECT AVG(response_time) as avg_time FROM feedback_responses
        WHERE timestamp > datetime('now', '-${timeWindow}')
      `);
            const responseTimeResult = responseTimeStmt.get();
            // Satisfaction trends (simplified)
            const satisfactionTrends = [{
                    period: timeWindow,
                    averageRating: 0.75, // Placeholder
                    responseCount: totalResult.total
                }];
            // User engagement (top 10 users)
            const engagementStmt = this.db.prepare(`
        SELECT 
          user_id,
          COUNT(*) as feedback_count,
          AVG(COALESCE(rating, 0.5)) as average_rating,
          AVG(confidence) as reliability
        FROM feedback_responses
        WHERE timestamp > datetime('now', '-${timeWindow}')
        GROUP BY user_id
        ORDER BY feedback_count DESC
        LIMIT 10
      `);
            const userEngagement = engagementStmt.all().map((row) => ({
                userId: row.user_id,
                feedbackCount: row.feedback_count,
                averageRating: row.average_rating,
                reliability: row.reliability
            }));
            // Feedback quality
            const qualityStmt = this.db.prepare(`
        SELECT 
          SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated,
          COUNT(*) as total,
          AVG(confidence) as avg_confidence
        FROM feedback_responses
        WHERE timestamp > datetime('now', '-${timeWindow}')
      `);
            const qualityResult = qualityStmt.get();
            const feedbackQuality = {
                validatedFeedback: qualityResult.validated || 0,
                invalidFeedback: (qualityResult.total || 0) - (qualityResult.validated || 0),
                anomalousResponses: 0, // Would need to calculate from validation data
                averageConfidence: qualityResult.avg_confidence || 0.5
            };
            return {
                totalFeedback: totalResult.total,
                responseRate,
                averageResponseTime: responseTimeResult.avg_time || 0,
                satisfactionTrends,
                userEngagement,
                feedbackQuality
            };
        }
        catch (error) {
            this.logger.error('Failed to get feedback analytics:', error);
            throw error;
        }
    }
    /**
     * Store feedback request in database
     */
    async storeFeedbackRequest(request) {
        const stmt = this.db.prepare(`
      INSERT INTO feedback_requests
      (id, request_type, user_id, session_id, document_id, context, prompt_message,
       expected_response_type, options, priority, expires_at, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(request.id, request.requestType, request.userId, request.sessionId, request.documentId, JSON.stringify(request.context), request.promptMessage, request.expectedResponseType, request.options ? JSON.stringify(request.options) : null, request.priority, request.expiresAt?.toISOString() || null, request.createdAt.toISOString(), request.status);
    }
    /**
     * Store feedback response in database
     */
    async storeFeedbackResponse(response) {
        const stmt = this.db.prepare(`
      INSERT INTO feedback_responses
      (id, feedback_request_id, user_id, response_type, rating, boolean_value,
       text_value, selected_options, confidence, response_time, additional_comments,
       timestamp, validated, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(response.id, response.feedbackRequestId, response.userId, response.responseType, response.rating || null, response.booleanValue !== undefined ? (response.booleanValue ? 1 : 0) : null, response.textValue || null, response.selectedOptions ? JSON.stringify(response.selectedOptions) : null, response.confidence, response.responseTime, response.additionalComments || null, response.timestamp.toISOString(), response.validated ? 1 : 0, response.processed ? 1 : 0);
    }
    /**
     * Store feedback validation results
     */
    async storeFeedbackValidation(responseId, validation) {
        const stmt = this.db.prepare(`
      INSERT INTO feedback_validation
      (id, feedback_response_id, is_valid, confidence, validation_rules,
       anomalies, quality_score, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(uuidv4(), responseId, validation.isValid ? 1 : 0, validation.confidence, JSON.stringify(validation.validationRules), JSON.stringify(validation.anomalies), validation.qualityScore, JSON.stringify(validation.recommendations));
    }
    /**
     * Store outcome tracking data
     */
    async storeOutcomeTracking(outcome) {
        const stmt = this.db.prepare(`
      INSERT INTO outcome_tracking
      (id, document_id, user_id, intervention_type, before_metrics, after_metrics,
       user_satisfaction, objective_improvement, subjective_improvement,
       intervention_success, measured_at, validation_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(outcome.outcomeId, outcome.documentId, outcome.userId, outcome.interventionType, JSON.stringify(outcome.beforeMetrics), JSON.stringify(outcome.afterMetrics), outcome.userSatisfaction, outcome.objectiveImprovement, outcome.subjectiveImprovement, outcome.interventionSuccess ? 1 : 0, outcome.measuredAt.toISOString(), outcome.validationStatus);
    }
    /**
     * Update feedback request status
     */
    async updateFeedbackRequestStatus(requestId, status) {
        const stmt = this.db.prepare('UPDATE feedback_requests SET status = ? WHERE id = ?');
        stmt.run(status, requestId);
    }
    /**
     * Mark feedback as processed
     */
    async markFeedbackAsProcessed(responseId) {
        const stmt = this.db.prepare('UPDATE feedback_responses SET processed = 1 WHERE id = ?');
        stmt.run(responseId);
    }
    /**
     * Update user feedback profile
     */
    async updateUserFeedbackProfile(userId, response, validation) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_feedback_profiles
      (user_id, total_feedback_count, average_response_time, reliability_score,
       feedback_quality_score, last_active)
      VALUES (?, 
        COALESCE((SELECT total_feedback_count FROM user_feedback_profiles WHERE user_id = ?), 0) + 1,
        ?, ?, ?, ?)
    `);
        stmt.run(userId, userId, response.responseTime, validation.confidence, validation.qualityScore, response.timestamp.toISOString());
    }
    /**
     * Load pending requests from database
     */
    async loadPendingRequests() {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM feedback_requests 
        WHERE status = 'pending' 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `);
            const rows = stmt.all();
            for (const row of rows) {
                const request = {
                    id: row.id,
                    requestType: row.request_type,
                    userId: row.user_id,
                    sessionId: row.session_id,
                    documentId: row.document_id,
                    context: JSON.parse(row.context),
                    promptMessage: row.prompt_message,
                    expectedResponseType: row.expected_response_type,
                    options: row.options ? JSON.parse(row.options) : undefined,
                    priority: row.priority,
                    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
                    createdAt: new Date(row.created_at),
                    status: row.status
                };
                this.pendingRequests.set(request.id, request);
            }
            this.logger.info(`Loaded ${this.pendingRequests.size} pending feedback requests`);
        }
        catch (error) {
            this.logger.error('Failed to load pending requests:', error);
        }
    }
    /**
     * Get pending feedback requests for a user
     */
    async getPendingFeedbackRequests(userId) {
        return Array.from(this.pendingRequests.values())
            .filter(req => req.userId === userId && req.status === 'pending');
    }
    /**
     * Cancel a feedback request
     */
    async cancelFeedbackRequest(requestId, userId) {
        try {
            const request = this.pendingRequests.get(requestId);
            if (!request || request.userId !== userId) {
                return false;
            }
            request.status = 'invalid';
            await this.updateFeedbackRequestStatus(requestId, 'invalid');
            this.pendingRequests.delete(requestId);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to cancel feedback request:', error);
            return false;
        }
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        try {
            if (this.processingInterval) {
                clearInterval(this.processingInterval);
            }
            // Process any remaining pending feedback
            await this.processPendingFeedback();
            this.logger.info('Feedback Integration Service shut down successfully');
        }
        catch (error) {
            this.logger.error('Error shutting down Feedback Integration Service:', error);
        }
    }
}
//# sourceMappingURL=FeedbackIntegrationService.js.map