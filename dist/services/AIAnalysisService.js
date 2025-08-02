import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
/**
 * AI Analysis Service
 *
 * Provides intelligent document analysis using various AI providers.
 * Supports quality assessment, duplicate detection, and relevance scoring.
 *
 * Created: 2025-07-29
 */
export class AIAnalysisService {
    aiProvider;
    logger;
    aiClient; // Will be initialized based on provider
    constructor(aiProvider, logger, openAIClient, OpenAIClass) {
        this.aiProvider = aiProvider;
        this.logger = logger;
        if (openAIClient) {
            this.aiClient = openAIClient;
        }
        else {
            this.initializeAIClient(OpenAIClass);
        }
    }
    /**
     * Initialize AI client based on provider
     */
    initializeAIClient(OpenAIClass) {
        try {
            switch (this.aiProvider) {
                case 'openai':
                    // Initialize OpenAI client if API key is available
                    if (process.env.OPENAI_API_KEY) {
                        if (OpenAIClass) {
                            const OpenAI = OpenAIClass;
                            this.aiClient = new OpenAI({
                                apiKey: process.env.OPENAI_API_KEY
                            });
                        }
                        else {
                            // Use dynamic import for ES modules
                            import('openai').then(({ OpenAI }) => {
                                this.aiClient = new OpenAI({
                                    apiKey: process.env.OPENAI_API_KEY
                                });
                            }).catch(() => {
                                this.logger.warn('OpenAI package not available, using local analysis');
                            });
                        }
                    }
                    else {
                        this.logger.warn('OpenAI API key not found, using local analysis');
                    }
                    break;
                case 'anthropic':
                    // Initialize Anthropic client if API key is available
                    if (process.env.ANTHROPIC_API_KEY) {
                        // Note: This would require @anthropic-ai/sdk package
                        this.logger.info('Anthropic client initialization not implemented');
                    }
                    break;
                case 'local':
                    // For local/offline analysis
                    this.logger.info('Using local AI analysis (pattern-based)');
                    break;
                default:
                    this.logger.warn(`Unknown AI provider: ${this.aiProvider}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize AI client:', error);
        }
    }
    /**
     * Analyze document quality using AI
     */
    async analyzeQuality(documentPath) {
        try {
            const content = await this.readDocumentContent(documentPath);
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.analyzeQualityWithOpenAI(documentPath, content);
            }
            else {
                analysis = await this.analyzeQualityLocally(documentPath, content);
            }
            this.logger.info(`Quality analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            this.logger.error('Failed to analyze document quality:', error);
            // Return fallback analysis
            return this.createFallbackAnalysis(documentPath, 'quality', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Detect duplicate content
     */
    async detectDuplicates(documentPath) {
        try {
            const content = await this.readDocumentContent(documentPath);
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.detectDuplicatesWithOpenAI(documentPath, content);
            }
            else {
                analysis = await this.detectDuplicatesLocally(documentPath, content);
            }
            this.logger.info(`Duplicate analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            this.logger.error('Failed to detect duplicates:', error);
            return this.createFallbackAnalysis(documentPath, 'duplicate', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Calculate relevance to work context
     */
    async calculateRelevance(documentPath, workContext) {
        try {
            const content = await this.readDocumentContent(documentPath);
            let analysis;
            if (this.aiClient && this.aiProvider === 'openai') {
                analysis = await this.calculateRelevanceWithOpenAI(documentPath, content, workContext);
            }
            else {
                analysis = await this.calculateRelevanceLocally(documentPath, content, workContext);
            }
            this.logger.info(`Relevance analysis completed for: ${documentPath}`);
            return analysis;
        }
        catch (error) {
            this.logger.error('Failed to calculate relevance:', error);
            return this.createFallbackAnalysis(documentPath, 'relevance', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Generate insights about the document
     */
    async generateInsights(documentPath) {
        try {
            const content = await this.readDocumentContent(documentPath);
            if (this.aiClient && this.aiProvider === 'openai') {
                return await this.generateInsightsWithOpenAI(documentPath, content);
            }
            else {
                return await this.generateInsightsLocally(documentPath, content);
            }
        }
        catch (error) {
            this.logger.error('Failed to generate insights:', error);
            return ['Error generating insights: ' + (error instanceof Error ? error.message : String(error))];
        }
    }
    // =============================================================================
    // PRIVATE ANALYSIS METHODS
    // =============================================================================
    async analyzeQualityWithOpenAI(documentPath, content) {
        try {
            const prompt = `Analyze the quality of this documentation:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide:
1. Overall quality score (0-1)
2. Key insights about content quality
3. Specific suggestions for improvement
4. Confidence level in your analysis

Format your response as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
            });
            const aiResponse = response.choices[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            // Parse AI response
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'quality',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI analysis failed:', error);
            return this.analyzeQualityLocally(documentPath, content);
        }
    }
    async analyzeQualityLocally(documentPath, content) {
        const insights = [];
        const suggestions = [];
        let score = 0.5;
        // Basic quality metrics
        const wordCount = content.split(/\s+/).length;
        const hasHeaders = /^#+\s/m.test(content);
        const hasCodeBlocks = /```/.test(content);
        const hasLinks = /\[.*?\]\(.*?\)/.test(content);
        const hasTodos = /TODO|FIXME|XXX/i.test(content);
        // Calculate score based on content analysis
        if (wordCount > 100)
            score += 0.1;
        if (wordCount > 500)
            score += 0.1;
        if (hasHeaders)
            score += 0.2;
        if (hasCodeBlocks)
            score += 0.1;
        if (hasLinks)
            score += 0.1;
        if (!hasTodos)
            score += 0.1;
        // Generate insights
        insights.push(`Document length: ${wordCount} words`);
        if (hasHeaders)
            insights.push('Well-structured with headers');
        if (hasCodeBlocks)
            insights.push('Contains technical examples');
        if (hasTodos)
            insights.push('Has pending work items');
        // Generate suggestions
        if (wordCount < 100)
            suggestions.push('Consider adding more detailed content');
        if (!hasHeaders)
            suggestions.push('Add headers for better structure');
        if (hasTodos)
            suggestions.push('Complete pending TODO items');
        return {
            documentId: uuidv4(),
            analysisType: 'quality',
            score: Math.min(score, 1.0),
            insights,
            suggestions,
            confidence: 0.6,
            analyzedAt: new Date().toISOString()
        };
    }
    async calculateRelevanceWithOpenAI(documentPath, content, workContext) {
        try {
            const prompt = `Analyze the relevance of this documentation to the given work context:

Work Context: ${workContext}
Document Path: ${documentPath}
Content: ${content.substring(0, 3000)}...

Please provide:
1. Relevance score (0-1) - how relevant is this document to the work context
2. Key insights about the relevance
3. Suggestions for improving relevance
4. Confidence in your analysis

Format as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            });
            const aiResponse = response.choices[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'relevance',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI relevance analysis failed:', error);
            return this.calculateRelevanceLocally(documentPath, content, workContext);
        }
    }
    async calculateRelevanceLocally(documentPath, content, workContext) {
        const insights = [];
        const suggestions = [];
        // Simple keyword matching for relevance
        const workKeywords = workContext.toLowerCase().split(/\s+/);
        const contentLower = content.toLowerCase();
        let matchCount = 0;
        const relevantKeywords = [];
        for (const keyword of workKeywords) {
            if (keyword.length > 3 && contentLower.includes(keyword)) {
                matchCount++;
                relevantKeywords.push(keyword);
            }
        }
        const relevanceScore = Math.min(matchCount / Math.max(workKeywords.length, 1), 1.0);
        insights.push(`Found ${matchCount} relevant keywords out of ${workKeywords.length}`);
        if (relevantKeywords.length > 0) {
            insights.push(`Relevant terms: ${relevantKeywords.join(', ')}`);
        }
        if (relevanceScore < 0.3) {
            suggestions.push('Consider adding more context related to the work being done');
            suggestions.push('Include specific examples or use cases');
        }
        return {
            documentId: uuidv4(),
            analysisType: 'relevance',
            score: relevanceScore,
            insights,
            suggestions,
            confidence: 0.6,
            analyzedAt: new Date().toISOString()
        };
    }
    async detectDuplicatesWithOpenAI(documentPath, content) {
        try {
            const prompt = `Analyze this document for duplicate content and patterns:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide:
1. Duplicate content score (0-1)
2. Key insights about duplicate patterns
3. Suggestions for removing duplicates
4. Confidence level in your analysis

Format your response as JSON with fields: score, insights, suggestions, confidence`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            });
            const aiResponse = response.choices[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return {
                documentId: uuidv4(),
                analysisType: 'duplicate',
                score: parsed.score || 0.5,
                insights: Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'No suggestions provided'],
                confidence: parsed.confidence || 0.7,
                analyzedAt: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error('OpenAI duplicate analysis failed:', error);
            return this.detectDuplicatesLocally(documentPath, content);
        }
    }
    async detectDuplicatesLocally(documentPath, content) {
        const duplicateScore = await this.calculateDuplicateScore(content);
        const insights = await this.generateDuplicateInsights(content, duplicateScore);
        return {
            documentId: uuidv4(),
            analysisType: 'duplicate',
            score: duplicateScore,
            insights,
            suggestions: this.generateDuplicateSuggestions(duplicateScore),
            confidence: 0.75,
            analyzedAt: new Date().toISOString()
        };
    }
    async calculateDuplicateScore(content) {
        // Simple duplicate detection based on repeated patterns
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const uniqueLines = new Set(lines);
        const duplicateRatio = 1 - (uniqueLines.size / lines.length);
        return Math.min(duplicateRatio * 2, 1.0); // Amplify the score
    }
    async generateDuplicateInsights(content, score) {
        const insights = [];
        if (score > 0.3) {
            insights.push('Document contains significant duplicate content');
        }
        else if (score > 0.1) {
            insights.push('Some repetitive content detected');
        }
        else {
            insights.push('Content appears to be unique');
        }
        // Look for repeated sections
        const repeatedPatterns = this.findRepeatedPatterns(content);
        if (repeatedPatterns.length > 0) {
            insights.push(`Found ${repeatedPatterns.length} repeated patterns`);
        }
        return insights;
    }
    generateDuplicateSuggestions(score) {
        const suggestions = [];
        if (score > 0.3) {
            suggestions.push('Remove or consolidate duplicate sections');
            suggestions.push('Consider using references instead of repeating content');
        }
        else if (score > 0.1) {
            suggestions.push('Review for unnecessary repetition');
        }
        return suggestions;
    }
    findRepeatedPatterns(content) {
        const patterns = [];
        const lines = content.split('\n');
        // Simple pattern detection - look for lines that appear more than once
        const lineCounts = new Map();
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10) { // Only consider substantial lines
                lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
            }
        }
        for (const [line, count] of lineCounts) {
            if (count > 1) {
                patterns.push(`"${line.substring(0, 50)}..." (${count} times)`);
            }
        }
        return patterns.slice(0, 5); // Return top 5 patterns
    }
    async generateInsightsWithOpenAI(documentPath, content) {
        try {
            const prompt = `Generate insights about this document:

Document Path: ${documentPath}
Content: ${content.substring(0, 4000)}...

Please provide detailed insights about:
1. Document structure and organization
2. Content quality and completeness
3. Technical elements and patterns
4. Areas for improvement

Format your response as JSON with an 'insights' array of strings.`;
            const response = await this.aiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
            });
            const aiResponse = response.choices[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('No response from OpenAI');
            }
            const parsed = JSON.parse(aiResponse);
            return Array.isArray(parsed.insights) ? parsed.insights : [parsed.insights || 'No insights provided'];
        }
        catch (error) {
            this.logger.error('OpenAI insights failed:', error);
            return this.generateInsightsLocally(documentPath, content);
        }
    }
    async generateInsightsLocally(documentPath, content) {
        const insights = [];
        // Basic content analysis
        const wordCount = content.split(/\s+/).length;
        const lineCount = content.split('\n').length;
        const hasCodeBlocks = /```/.test(content);
        const hasImages = /!\[.*?\]\(.*?\)/.test(content);
        const hasLinks = /\[.*?\]\(.*?\)/.test(content);
        insights.push(`Document contains ${wordCount} words and ${lineCount} lines`);
        if (hasCodeBlocks) {
            insights.push('Contains code examples or technical snippets');
        }
        if (hasImages) {
            insights.push('Includes visual elements (images/diagrams)');
        }
        if (hasLinks) {
            insights.push('Contains references to external resources');
        }
        // Content structure analysis
        const headerCount = (content.match(/^#+\s/gm) || []).length;
        if (headerCount > 0) {
            insights.push(`Well-structured with ${headerCount} headers`);
        }
        // Language and style analysis
        if (content.includes('TODO') || content.includes('FIXME')) {
            insights.push('Contains pending work items (TODO/FIXME)');
        }
        return insights;
    }
    async readDocumentContent(documentPath) {
        try {
            const content = await fs.readFile(documentPath, 'utf-8');
            return content;
        }
        catch (error) {
            this.logger.error(`Failed to read document ${documentPath}:`, error);
            throw new Error(`Cannot read document: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    createFallbackAnalysis(documentPath, analysisType, errorMessage) {
        return {
            documentId: uuidv4(),
            analysisType: analysisType,
            score: 0.5,
            insights: [`Analysis failed: ${errorMessage}`, 'Using fallback analysis'],
            suggestions: ['Fix the underlying issue and retry analysis'],
            confidence: 0.1,
            analyzedAt: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=AIAnalysisService.js.map