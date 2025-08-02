/**
 * Quality Learning Engine - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Machine Learning and Pattern Recognition
 * Implements self-learning quality assessment that improves over time through:
 * - Pattern recognition from historical quality data
 * - Machine learning models for quality prediction
 * - Continuous model improvement through feedback integration
 * - Adaptive learning based on document types and performance data
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Machine Learning Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { AIAnalysisService } from './AIAnalysisService';
import { QualityDimensions, QualityScore } from './QualityAssessmentEngine';
export interface LearningPattern {
    id: string;
    patternType: 'quality_improvement' | 'issue_correlation' | 'content_pattern' | 'user_preference';
    pattern: any;
    confidence: number;
    occurrences: number;
    lastUpdated: Date;
    documentTypes: string[];
    effectiveness: number;
}
export interface QualityPredictionFeatures {
    contentLength: number;
    structuralComplexity: number;
    semanticComplexity: number;
    vocabularyRichness: number;
    documentType: string;
    authorProficiency?: number;
    historicalQuality?: number;
    domainSpecificity: number;
    readabilityScore: number;
    technicalDensity: number;
}
export interface LearningModelConfig {
    modelType: 'linear_regression' | 'neural_network' | 'ensemble' | 'gradient_boosting';
    features: string[];
    targetDimensions: (keyof QualityDimensions)[];
    trainingDataSize: number;
    validationSplit: number;
    hyperparameters: Record<string, any>;
    performanceThreshold: number;
}
export interface ModelPerformance {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    mse: number;
    mae: number;
    confusionMatrix?: number[][];
    crossValidationScore: number;
    modelVersion: string;
    evaluatedAt: Date;
}
export interface LearningContext {
    documentId: string;
    documentType: string;
    userId?: string;
    sessionId: string;
    timestamp: Date;
    environment: 'development' | 'staging' | 'production';
    features: QualityPredictionFeatures;
    actualQuality?: QualityScore;
    predictedQuality?: QualityScore;
    userFeedback?: UserFeedback;
}
export interface UserFeedback {
    feedbackId: string;
    userId: string;
    documentId: string;
    feedbackType: 'quality_rating' | 'improvement_validation' | 'issue_report' | 'recommendation_rating';
    rating: number;
    comments?: string;
    timestamp: Date;
    validated: boolean;
}
export interface PatternRecognitionResult {
    patterns: LearningPattern[];
    insights: string[];
    recommendations: string[];
    confidenceLevel: number;
    nextRetrainingDate: Date;
}
export declare class QualityLearningEngine {
    private db;
    private logger;
    private aiAnalysisService;
    private models;
    private patterns;
    private readonly PATTERN_CONFIDENCE_THRESHOLD;
    private readonly MIN_TRAINING_SAMPLES;
    private readonly RETRAINING_INTERVAL;
    constructor(db: Database.Database, logger: Logger, aiAnalysisService: AIAnalysisService);
    /**
     * Initialize the learning engine
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for learning data
     */
    private createLearningTables;
    /**
     * Extract features from document content for ML model
     */
    extractFeatures(documentId: string, content: string, documentType: string): Promise<QualityPredictionFeatures>;
    /**
     * Record learning context for future training
     */
    recordLearningContext(context: LearningContext): Promise<void>;
    /**
     * Recognize patterns in quality data
     */
    recognizePatterns(): Promise<PatternRecognitionResult>;
    /**
     * Analyze quality improvement patterns
     */
    private analyzeQualityImprovementPatterns;
    /**
     * Analyze issue correlation patterns
     */
    private analyzeIssueCorrelationPatterns;
    /**
     * Analyze content patterns
     */
    private analyzeContentPatterns;
    /**
     * Extract quality pattern from high-quality samples
     */
    private extractQualityPattern;
    /**
     * Generate insights from recognized patterns
     */
    private generateInsightsFromPatterns;
    /**
     * Generate recommendations from patterns
     */
    private generateRecommendationsFromPatterns;
    /**
     * Store learning patterns in database
     */
    private storeLearningPatterns;
    /**
     * Load existing patterns from database
     */
    private loadExistingPatterns;
    /**
     * Load trained models from storage
     */
    private loadTrainedModels;
    /**
     * Predict quality based on learned patterns
     */
    predictQuality(features: QualityPredictionFeatures): Promise<QualityScore>;
    /**
     * Predict quality from features using heuristics
     */
    private predictQualityFromFeatures;
    /**
     * Apply pattern adjustments to base prediction
     */
    private applyPatternAdjustments;
    /**
     * Calculate similarity between two feature sets
     */
    private calculateFeatureSimilarity;
    /**
     * Evaluate model performance against validation data
     */
    evaluateModelPerformance(): Promise<ModelPerformance>;
    /**
     * Calculate Mean Squared Error
     */
    private calculateMSE;
    /**
     * Calculate Mean Absolute Error
     */
    private calculateMAE;
    /**
     * Calculate accuracy (within threshold)
     */
    private calculateAccuracy;
    /**
     * Calculate classification metrics (treating as binary classification problem)
     */
    private calculateClassificationMetrics;
    /**
     * Simulate cross-validation
     */
    private simulateCrossValidation;
    /**
     * Store model performance in database
     */
    private storeModelPerformance;
    /**
     * Check if model needs retraining
     */
    shouldRetrain(): boolean;
    /**
     * Get learning statistics
     */
    getLearningStatistics(): Promise<{
        totalPatterns: number;
        highConfidencePatterns: number;
        trainingSamples: number;
        modelAccuracy?: number;
        lastRetraining?: Date;
    }>;
    /**
     * Shutdown the learning engine
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityLearningEngine.d.ts.map