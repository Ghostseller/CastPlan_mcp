import { Logger } from 'winston';
import { AIAnalysisService as IAIAnalysisService, AIAnalysis } from '../types/enhanced.types.js';
/**
 * AI Analysis Service
 *
 * Provides intelligent document analysis using various AI providers.
 * Supports quality assessment, duplicate detection, and relevance scoring.
 *
 * Created: 2025-07-29
 */
export declare class AIAnalysisService implements IAIAnalysisService {
    private aiProvider;
    private logger;
    private aiClient;
    constructor(aiProvider: 'openai' | 'anthropic' | 'local', logger: Logger, openAIClient?: any, OpenAIClass?: any);
    /**
     * Initialize AI client based on provider
     */
    private initializeAIClient;
    /**
     * Analyze document quality using AI
     */
    analyzeQuality(documentPath: string): Promise<AIAnalysis>;
    /**
     * Detect duplicate content
     */
    detectDuplicates(documentPath: string): Promise<AIAnalysis>;
    /**
     * Calculate relevance to work context
     */
    calculateRelevance(documentPath: string, workContext: string): Promise<AIAnalysis>;
    /**
     * Generate insights about the document
     */
    generateInsights(documentPath: string): Promise<string[]>;
    private analyzeQualityWithOpenAI;
    private analyzeQualityLocally;
    private calculateRelevanceWithOpenAI;
    private calculateRelevanceLocally;
    private detectDuplicatesWithOpenAI;
    private detectDuplicatesLocally;
    private calculateDuplicateScore;
    private generateDuplicateInsights;
    private generateDuplicateSuggestions;
    private findRepeatedPatterns;
    private generateInsightsWithOpenAI;
    private generateInsightsLocally;
    private readDocumentContent;
    private createFallbackAnalysis;
}
//# sourceMappingURL=AIAnalysisService.d.ts.map