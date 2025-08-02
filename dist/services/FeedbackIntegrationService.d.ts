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
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { QualityScore } from './QualityAssessmentEngine';
import { QualityIssue } from './QualityIssueDetector';
import { ImprovementRecommendation } from './QualityImprovementRecommender';
import { QualityLearningEngine } from './QualityLearningEngine';
export interface FeedbackRequest {
    id: string;
    requestType: 'quality_rating' | 'improvement_validation' | 'issue_confirmation' | 'recommendation_rating';
    userId: string;
    sessionId: string;
    documentId: string;
    context: FeedbackContext;
    promptMessage: string;
    expectedResponseType: 'rating' | 'boolean' | 'text' | 'multiple_choice';
    options?: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt?: Date;
    createdAt: Date;
    status: 'pending' | 'responded' | 'expired' | 'invalid';
}
export interface FeedbackContext {
    documentType: string;
    documentLength: number;
    qualityScoreBefore?: QualityScore;
    qualityScoreAfter?: QualityScore;
    issuesDetected?: QualityIssue[];
    recommendationsApplied?: ImprovementRecommendation[];
    improvementAttempted?: boolean;
    userExperience?: string;
    taskContext?: string;
}
export interface FeedbackResponse {
    id: string;
    feedbackRequestId: string;
    userId: string;
    responseType: 'rating' | 'boolean' | 'text' | 'multiple_choice';
    rating?: number;
    booleanValue?: boolean;
    textValue?: string;
    selectedOptions?: string[];
    confidence: number;
    responseTime: number;
    additionalComments?: string;
    timestamp: Date;
    validated: boolean;
    processed: boolean;
}
export interface FeedbackValidation {
    isValid: boolean;
    confidence: number;
    validationRules: ValidationRule[];
    anomalies: string[];
    qualityScore: number;
    recommendations: string[];
}
export interface ValidationRule {
    type: 'consistency' | 'outlier_detection' | 'temporal_pattern' | 'user_behavior' | 'response_quality';
    description: string;
    passed: boolean;
    confidence: number;
    details: any;
}
export interface FeedbackAnalytics {
    totalFeedback: number;
    responseRate: number;
    averageResponseTime: number;
    satisfactionTrends: {
        period: string;
        averageRating: number;
        responseCount: number;
    }[];
    userEngagement: {
        userId: string;
        feedbackCount: number;
        averageRating: number;
        reliability: number;
    }[];
    feedbackQuality: {
        validatedFeedback: number;
        invalidFeedback: number;
        anomalousResponses: number;
        averageConfidence: number;
    };
}
export interface OutcomeTracking {
    outcomeId: string;
    documentId: string;
    userId: string;
    interventionType: 'quality_improvement' | 'issue_resolution' | 'recommendation_implementation';
    beforeMetrics: QualityScore;
    afterMetrics: QualityScore;
    userSatisfaction: number;
    objectiveImprovement: number;
    subjectiveImprovement: number;
    interventionSuccess: boolean;
    followUpFeedback?: FeedbackResponse[];
    measuredAt: Date;
    validationStatus: 'validated' | 'pending' | 'disputed';
}
export interface LearningUpdate {
    updateId: string;
    updateType: 'model_weights' | 'threshold_adjustment' | 'pattern_recognition' | 'quality_standards';
    sourceData: FeedbackResponse[];
    confidenceLevel: number;
    expectedImprovement: number;
    appliedAt: Date;
    validated: boolean;
    rollbackAvailable: boolean;
}
export interface FeedbackIntegrationConfig {
    maxPendingRequests: number;
    feedbackExpirationTime: number;
    minConfidenceForLearning: number;
    validationThreshold: number;
    realTimeProcessing: boolean;
    anonymizeUserData: boolean;
    enablePredictiveFeedback: boolean;
}
export declare class FeedbackIntegrationService {
    private db;
    private logger;
    private qualityLearningEngine;
    private config;
    private pendingRequests;
    private validationRules;
    private readonly FEEDBACK_PROCESSING_INTERVAL;
    private readonly MAX_RESPONSE_TIME;
    private processingInterval?;
    constructor(db: Database.Database, logger: Logger, qualityLearningEngine: QualityLearningEngine, config?: Partial<FeedbackIntegrationConfig>);
    /**
     * Initialize the feedback integration service
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for feedback management
     */
    private createFeedbackTables;
    /**
     * Request feedback from users
     */
    requestFeedback(requestType: FeedbackRequest['requestType'], userId: string, sessionId: string, documentId: string, context: FeedbackContext, options?: {
        promptMessage?: string;
        expectedResponseType?: FeedbackRequest['expectedResponseType'];
        options?: string[];
        priority?: FeedbackRequest['priority'];
        expiresIn?: number;
    }): Promise<string>;
    /**
     * Submit feedback response
     */
    submitFeedback(requestId: string, userId: string, responseData: {
        rating?: number;
        booleanValue?: boolean;
        textValue?: string;
        selectedOptions?: string[];
        confidence?: number;
        additionalComments?: string;
    }, responseTime: number): Promise<FeedbackResponse>;
    /**
     * Track outcome of quality interventions
     */
    trackOutcome(documentId: string, userId: string, interventionType: OutcomeTracking['interventionType'], beforeMetrics: QualityScore, afterMetrics: QualityScore, userSatisfaction: number): Promise<string>;
    /**
     * Generate contextual prompt message for feedback requests
     */
    private generateContextualPrompt;
    /**
     * Validate feedback response format
     */
    private validateResponseFormat;
    /**
     * Validate feedback quality and detect anomalies
     */
    validateFeedback(response: FeedbackResponse): Promise<FeedbackValidation>;
    /**
     * Initialize validation rules
     */
    private initializeValidationRules;
    /**
     * Get typical response time for response type
     */
    private getTypicalResponseTime;
    /**
     * Analyze sentiment of text (simplified implementation)
     */
    private analyzeSentiment;
    /**
     * Get user feedback statistics
     */
    private getUserFeedbackStats;
    /**
     * Check if response is an outlier for the user
     */
    private isResponseOutlier;
    /**
     * Calculate feedback quality score
     */
    private calculateFeedbackQualityScore;
    /**
     * Generate validation recommendations
     */
    private generateValidationRecommendations;
    /**
     * Process validated feedback for learning
     */
    processFeedbackForLearning(response: FeedbackResponse): Promise<void>;
    /**
     * Convert feedback response to learning context
     */
    private convertFeedbackToLearningContext;
    /**
     * Request follow-up feedback for significant outcomes
     */
    private requestFollowUpFeedback;
    /**
     * Start periodic feedback processing
     */
    private startFeedbackProcessing;
    /**
     * Process pending feedback responses
     */
    private processPendingFeedback;
    /**
     * Cleanup expired feedback requests
     */
    private cleanupExpiredRequests;
    /**
     * Get feedback analytics
     */
    getFeedbackAnalytics(timeWindow?: string): Promise<FeedbackAnalytics>;
    /**
     * Store feedback request in database
     */
    private storeFeedbackRequest;
    /**
     * Store feedback response in database
     */
    private storeFeedbackResponse;
    /**
     * Store feedback validation results
     */
    private storeFeedbackValidation;
    /**
     * Store outcome tracking data
     */
    private storeOutcomeTracking;
    /**
     * Update feedback request status
     */
    private updateFeedbackRequestStatus;
    /**
     * Mark feedback as processed
     */
    private markFeedbackAsProcessed;
    /**
     * Update user feedback profile
     */
    private updateUserFeedbackProfile;
    /**
     * Load pending requests from database
     */
    private loadPendingRequests;
    /**
     * Get pending feedback requests for a user
     */
    getPendingFeedbackRequests(userId: string): Promise<FeedbackRequest[]>;
    /**
     * Cancel a feedback request
     */
    cancelFeedbackRequest(requestId: string, userId: string): Promise<boolean>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=FeedbackIntegrationService.d.ts.map