/**
 * Quality Prediction Model - Phase 4 Week 3
 *
 * CastPlan MCP Autonomous Quality Service - Predictive Quality Assessment
 * Implements machine learning models for quality prediction with:
 * - Multi-model ensemble for robust predictions
 * - Feature engineering and selection
 * - Model training and validation
 * - Real-time quality prediction
 * - Confidence scoring and uncertainty quantification
 *
 * Created: 2025-07-31
 * Author: AI Engineer - Machine Learning Specialist
 */
import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { QualityDimensions, QualityScore } from './QualityAssessmentEngine';
import { QualityPredictionFeatures, ModelPerformance } from './QualityLearningEngine';
import { AIAnalysisService } from './AIAnalysisService';
export interface PredictionModelConfig {
    modelId: string;
    modelType: 'linear_regression' | 'neural_network' | 'ensemble' | 'gradient_boosting' | 'random_forest';
    targetDimensions: (keyof QualityDimensions)[];
    featureSet: string[];
    hyperparameters: Record<string, any>;
    trainingConfig: {
        batchSize: number;
        epochs: number;
        learningRate: number;
        validationSplit: number;
        earlyStoppingPatience: number;
    };
    performanceThresholds: {
        minAccuracy: number;
        maxMSE: number;
        minF1Score: number;
    };
}
export interface TrainingData {
    id: string;
    features: QualityPredictionFeatures;
    targets: QualityDimensions;
    overallTarget: number;
    documentType: string;
    userId?: string;
    timestamp: Date;
    weight: number;
    split: 'train' | 'validation' | 'test';
}
export interface PredictionResult {
    predictionId: string;
    modelId: string;
    documentId: string;
    predictedQuality: QualityScore;
    confidence: number;
    uncertainty: number;
    featureImportance: Record<string, number>;
    alternativePredictions?: QualityScore[];
    predictionTime: number;
    timestamp: Date;
}
export interface ModelEnsemble {
    ensembleId: string;
    models: PredictionModelConfig[];
    weightingStrategy: 'equal' | 'performance_weighted' | 'confidence_weighted' | 'adaptive';
    combinationMethod: 'average' | 'weighted_average' | 'stacking' | 'voting';
    performanceHistory: ModelPerformance[];
    lastUpdated: Date;
}
export interface FeatureEngineeringPipeline {
    pipelineId: string;
    steps: FeatureEngineeringStep[];
    inputFeatures: string[];
    outputFeatures: string[];
    transformations: Record<string, any>;
    lastUpdated: Date;
}
export interface FeatureEngineeringStep {
    stepType: 'scaling' | 'normalization' | 'encoding' | 'selection' | 'creation' | 'transformation';
    name: string;
    parameters: Record<string, any>;
    inputFeatures: string[];
    outputFeatures: string[];
}
export interface ModelValidationResult {
    validationId: string;
    modelId: string;
    validationType: 'cross_validation' | 'holdout' | 'time_series' | 'bootstrap';
    metrics: ModelPerformance;
    confusionMatrix?: number[][];
    residualAnalysis: {
        meanResidual: number;
        residualStd: number;
        normalityTest: number;
        homoscedasticityTest: number;
    };
    featureImportance: Record<string, number>;
    validatedAt: Date;
}
export interface PredictionCalibration {
    calibrationId: string;
    modelId: string;
    calibrationMethod: 'platt_scaling' | 'isotonic_regression' | 'temperature_scaling';
    calibrationCurve: Array<{
        predicted: number;
        actual: number;
        count: number;
    }>;
    reliability: number;
    sharpness: number;
    calibratedAt: Date;
}
export declare class QualityPredictionModel {
    private db;
    private logger;
    private aiAnalysisService;
    private models;
    private ensembles;
    private featurePipelines;
    private trainingData;
    private readonly MIN_TRAINING_SAMPLES;
    private readonly PREDICTION_CACHE_TTL;
    private predictionCache;
    constructor(db: Database.Database, logger: Logger, aiAnalysisService: AIAnalysisService);
    /**
     * Initialize the quality prediction model service
     */
    initialize(): Promise<void>;
    /**
     * Create database tables for prediction models
     */
    private createPredictionTables;
    /**
     * Initialize default prediction models
     */
    private initializeDefaultModels;
    /**
     * Predict quality for a document using the best available model
     */
    predictQuality(documentId: string, features: QualityPredictionFeatures, options?: {
        modelId?: string;
        useEnsemble?: boolean;
        includeUncertainty?: boolean;
        cacheResults?: boolean;
    }): Promise<PredictionResult>;
    /**
     * Predict quality using a specific model
     */
    private predictWithModel;
    /**
     * Predict quality using ensemble of models
     */
    private predictWithEnsemble;
    /**
     * Linear regression prediction (simplified implementation)
     */
    private predictLinearRegression;
    /**
     * Ensemble prediction (simplified implementation)
     */
    private predictEnsemble;
    /**
     * Heuristic prediction (fallback method)
     */
    private predictHeuristic;
    /**
     * Combine ensemble predictions
     */
    private combineEnsemblePredictions;
    /**
     * Add training data for model improvement
     */
    addTrainingData(features: QualityPredictionFeatures, actualQuality: QualityScore, documentType: string, userId?: string, weight?: number): Promise<string>;
    /**
     * Train or retrain a model
     */
    trainModel(modelId: string): Promise<ModelValidationResult>;
    /**
     * Select best performing model for prediction
     */
    private selectBestModel;
    /**
     * Process features through engineering pipeline
     */
    private processFeatures;
    /**
     * Calculate prediction uncertainty
     */
    private calculateUncertainty;
    /**
     * Split training data into train/validation/test sets
     */
    private splitTrainingData;
    /**
     * Perform model training (simplified implementation)
     */
    private performModelTraining;
    /**
     * Validate trained model
     */
    private validateModel;
    /**
     * Get model weights (placeholder implementation)
     */
    private getModelWeights;
    /**
     * Get model intercepts (placeholder implementation)
     */
    private getModelIntercepts;
    /**
     * Generate cache key for predictions
     */
    private generateCacheKey;
    /**
     * Get cached prediction
     */
    private getCachedPrediction;
    /**
     * Cache prediction results
     */
    private cacheResults;
    /**
     * Store model configuration
     */
    private storeModel;
    /**
     * Store training data
     */
    private storeTrainingData;
    /**
     * Store prediction result
     */
    private storePredictionResult;
    /**
     * Store validation result
     */
    private storeValidationResult;
    /**
     * Update model performance
     */
    private updateModelPerformance;
    /**
     * Load existing models from database
     */
    private loadExistingModels;
    /**
     * Load feature pipelines from database
     */
    private loadFeaturePipelines;
    /**
     * Get model statistics
     */
    getModelStatistics(): Promise<{
        totalModels: number;
        activeModels: number;
        totalTrainingData: number;
        totalPredictions: number;
        averageAccuracy?: number;
    }>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QualityPredictionModel.d.ts.map