/**
 * Semantic Fingerprint Generator
 *
 * AI-powered semantic fingerprinting service for document evolution tracking.
 * Creates semantic signatures to detect content evolution at deeper meaning levels.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { v4 as uuidv4 } from 'uuid';
import { VersionTrackingError } from '../types/version-tracking.types';
import { getErrorMessage } from '../utils/typeHelpers';
/**
 * Semantic Fingerprint Generator
 *
 * Generates AI-powered semantic fingerprints for content evolution tracking.
 * Uses advanced NLP techniques to create semantic signatures that capture
 * meaning, intent, and conceptual structure of content.
 */
export class SemanticFingerprintGenerator {
    logger;
    aiAnalysisService;
    initialized = false;
    fingerprintCache = new Map();
    CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    DEFAULT_OPTIONS = {
        useEmbeddings: true,
        extractConcepts: true,
        includeMetadata: true,
        confidenceThreshold: 0.7,
        maxConcepts: 20
    };
    constructor(logger, aiAnalysisService) {
        this.logger = logger;
        this.aiAnalysisService = aiAnalysisService;
    }
    /**
     * Initialize the semantic fingerprint generator
     */
    async initialize() {
        try {
            this.initialized = true;
            this.logger.info('SemanticFingerprintGenerator initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize SemanticFingerprintGenerator:', error);
            throw new VersionTrackingError('FINGERPRINT_INIT_FAILED', `Fingerprint generator initialization failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Generate semantic fingerprint for content
     */
    async generateFingerprint(content, options = {}) {
        this.ensureInitialized();
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        const cacheKey = this.generateCacheKey(content, finalOptions);
        // Check cache first
        const cached = this.getCachedFingerprint(cacheKey);
        if (cached) {
            this.logger.debug('Using cached semantic fingerprint');
            return cached;
        }
        try {
            const startTime = Date.now();
            // Step 1: Extract concepts and themes
            const contentAnalysis = await this.analyzeContent(content, finalOptions);
            // Step 2: Generate embeddings if enabled
            let embeddings = new Float32Array(0);
            if (finalOptions.useEmbeddings) {
                embeddings = await this.generateEmbedding(content);
            }
            // Step 3: Create semantic hash
            const semanticHash = this.createSemanticHash(contentAnalysis, content);
            // Step 4: Calculate confidence score
            const confidence = this.calculateConfidence(contentAnalysis, finalOptions);
            // Step 5: Extract top concepts
            const topConcepts = contentAnalysis.concepts
                .filter(c => c.confidence >= finalOptions.confidenceThreshold)
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, finalOptions.maxConcepts)
                .map(c => c.concept);
            const fingerprint = {
                id: uuidv4(),
                documentId: '',
                versionId: undefined,
                contentHash: semanticHash,
                embeddings: finalOptions.useEmbeddings ? Array.from(embeddings) : undefined,
                concepts: topConcepts,
                topics: contentAnalysis.themes,
                keyPhrases: topConcepts.slice(0, 10),
                sentimentScore: undefined,
                complexityScore: contentAnalysis.complexity,
                metadata: finalOptions.includeMetadata ? {
                    themes: contentAnalysis.themes,
                    complexity: contentAnalysis.complexity,
                    readability: contentAnalysis.readability,
                    technicality: contentAnalysis.technicality,
                    contentLength: content.length,
                    wordCount: content.split(/\s+/).length,
                    processingTime: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                } : {},
                createdAt: new Date().toISOString()
            };
            // Cache the result
            this.cacheFingerprint(cacheKey, fingerprint);
            this.logger.debug(`Generated semantic fingerprint with ${topConcepts.length} concepts`, {
                confidence,
                processingTime: Date.now() - startTime
            });
            return fingerprint;
        }
        catch (error) {
            this.logger.error('Failed to generate semantic fingerprint:', error);
            throw new VersionTrackingError('FINGERPRINT_GENERATION_FAILED', `Fingerprint generation failed: ${getErrorMessage(error)}`, { content: content.substring(0, 100) });
        }
    }
    /**
     * Compare two semantic fingerprints
     */
    async compareFingerprints(fingerprint1, fingerprint2) {
        this.ensureInitialized();
        try {
            // Concept overlap analysis
            const conceptOverlap = this.calculateConceptOverlap(fingerprint1.concepts, fingerprint2.concepts);
            // Embedding similarity (if available)
            let embeddingSimilarity = 0;
            if (fingerprint1.embeddings && fingerprint2.embeddings &&
                fingerprint1.embeddings.length > 0 && fingerprint2.embeddings.length > 0) {
                embeddingSimilarity = this.calculateEmbeddingSimilarity(new Float32Array(fingerprint1.embeddings), new Float32Array(fingerprint2.embeddings));
            }
            // Combined similarity score
            const similarity = this.calculateCombinedSimilarity(conceptOverlap, embeddingSimilarity, fingerprint1, fingerprint2);
            // Change score (inverse of similarity)
            const changeScore = 1 - similarity;
            // Determine significant differences
            const significantDifferences = [];
            if (changeScore > 0.3) {
                significantDifferences.push('High semantic change detected');
            }
            if (conceptOverlap < 0.5) {
                significantDifferences.push('Low concept overlap');
            }
            const comparison = {
                fingerprint1Id: fingerprint1.id,
                fingerprint2Id: fingerprint2.id,
                similarity,
                conceptOverlap,
                topicDrift: 1 - similarity,
                sentimentChange: undefined,
                complexityChange: Math.abs(fingerprint1.complexityScore - fingerprint2.complexityScore),
                changeScore,
                significantDifferences,
                comparedAt: new Date().toISOString()
            };
            this.logger.debug('Fingerprint comparison completed', {
                similarity,
                conceptOverlap,
                changeScore,
                significantDifferences: significantDifferences.length
            });
            return comparison;
        }
        catch (error) {
            this.logger.error('Failed to compare fingerprints:', error);
            throw new VersionTrackingError('FINGERPRINT_COMPARISON_FAILED', `Fingerprint comparison failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Batch generate fingerprints for multiple content pieces
     */
    async batchGenerateFingerprints(contents, options = {}) {
        this.ensureInitialized();
        const results = [];
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        this.logger.info(`Starting batch fingerprint generation for ${contents.length} items`);
        try {
            // Process in parallel with limited concurrency
            const batchSize = 5;
            for (let i = 0; i < contents.length; i += batchSize) {
                const batch = contents.slice(i, i + batchSize);
                const batchPromises = batch.map(content => this.generateFingerprint(content, finalOptions));
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                this.logger.debug(`Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contents.length / batchSize)}`);
            }
            this.logger.info(`Batch fingerprint generation completed: ${results.length} fingerprints generated`);
            return results;
        }
        catch (error) {
            this.logger.error('Batch fingerprint generation failed:', error);
            throw new VersionTrackingError('BATCH_FINGERPRINT_FAILED', `Batch fingerprint generation failed: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Analyze content to extract concepts and themes
     */
    async analyzeContent(content, options) {
        try {
            // Use AI analysis service for advanced content analysis
            const analysis = await this.aiAnalysisService.analyzeQuality(content);
            // Extract concepts using pattern matching and NLP
            const concepts = await this.extractConcepts(content, options.maxConcepts);
            // Extract themes
            const themes = this.extractThemes(content);
            // Calculate complexity metrics
            const complexity = this.calculateComplexity(content);
            const readability = this.calculateReadability(content);
            const technicality = this.calculateTechnicality(content);
            return {
                concepts,
                themes,
                complexity,
                readability,
                technicality
            };
        }
        catch (error) {
            this.logger.warn('AI content analysis failed, using fallback methods:', getErrorMessage(error));
            // Fallback to pattern-based analysis
            return this.fallbackContentAnalysis(content, options.maxConcepts);
        }
    }
    /**
     * Extract concepts from content
     */
    async extractConcepts(content, maxConcepts) {
        const concepts = [];
        try {
            // Step 1: Extract keywords and key phrases
            const words = content.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
            // Step 2: Calculate word frequencies
            const wordFreq = new Map();
            words.forEach(word => {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            });
            // Step 3: Extract multi-word concepts (bigrams, trigrams)
            const phrases = this.extractPhrases(content);
            // Step 4: Score and rank concepts
            const rankedWords = Array.from(wordFreq.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, maxConcepts);
            for (const [word, freq] of rankedWords) {
                const relevance = freq / words.length;
                const confidence = Math.min(relevance * 10, 1.0); // Simple confidence scoring
                const context = this.extractContext(content, word);
                concepts.push({
                    concept: word,
                    relevance,
                    confidence,
                    context
                });
            }
            // Add phrase concepts
            phrases.forEach(phrase => {
                if (concepts.length < maxConcepts) {
                    concepts.push({
                        concept: phrase.text,
                        relevance: phrase.relevance,
                        confidence: phrase.confidence,
                        context: phrase.context
                    });
                }
            });
            return concepts.slice(0, maxConcepts);
        }
        catch (error) {
            this.logger.warn('Concept extraction failed:', getErrorMessage(error));
            return [];
        }
    }
    /**
     * Extract phrases from content
     */
    extractPhrases(content) {
        const phrases = [];
        // Simple bigram and trigram extraction
        const words = content.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i].length > 3 && words[i + 1].length > 3) {
                const bigram = `${words[i]} ${words[i + 1]}`;
                phrases.push({
                    text: bigram,
                    relevance: 0.3,
                    confidence: 0.6,
                    context: content.substring(Math.max(0, content.indexOf(bigram) - 50), Math.min(content.length, content.indexOf(bigram) + bigram.length + 50))
                });
            }
        }
        return phrases.slice(0, 10); // Limit phrases
    }
    /**
     * Extract context for a concept
     */
    extractContext(content, concept) {
        const index = content.toLowerCase().indexOf(concept.toLowerCase());
        if (index === -1)
            return '';
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + concept.length + 50);
        return content.substring(start, end).trim();
    }
    /**
     * Extract themes from content
     */
    extractThemes(content) {
        const themes = [];
        // Pattern-based theme extraction
        const themePatterns = [
            { pattern: /\b(architecture|design|system|structure)\b/gi, theme: 'architecture' },
            { pattern: /\b(security|auth|encrypt|secure)\b/gi, theme: 'security' },
            { pattern: /\b(performance|speed|optimize|fast)\b/gi, theme: 'performance' },
            { pattern: /\b(ui|interface|user|ux|design)\b/gi, theme: 'user-interface' },
            { pattern: /\b(data|database|storage|model)\b/gi, theme: 'data' },
            { pattern: /\b(api|endpoint|service|rest)\b/gi, theme: 'api' },
            { pattern: /\b(test|testing|qa|quality)\b/gi, theme: 'testing' },
            { pattern: /\b(deploy|deployment|ci|cd|pipeline)\b/gi, theme: 'deployment' }
        ];
        themePatterns.forEach(({ pattern, theme }) => {
            if (pattern.test(content)) {
                themes.push(theme);
            }
        });
        return themes;
    }
    /**
     * Calculate content complexity
     */
    calculateComplexity(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
        const longWords = words.filter(w => w.length > 6).length;
        const longWordRatio = longWords / Math.max(words.length, 1);
        // Normalized complexity score (0-1)
        return Math.min((avgWordsPerSentence / 20) * 0.6 + longWordRatio * 0.4, 1.0);
    }
    /**
     * Calculate readability score
     */
    calculateReadability(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
        // Simplified Flesch Reading Ease formula
        const avgSentenceLength = words.length / Math.max(sentences.length, 1);
        const avgSyllablesPerWord = syllables / Math.max(words.length, 1);
        const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        // Normalize to 0-1 range
        return Math.max(0, Math.min(1, score / 100));
    }
    /**
     * Count syllables in a word (approximation)
     */
    countSyllables(word) {
        const vowels = 'aeiouy';
        let count = 0;
        let previousCharWasVowel = false;
        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            const isVowel = vowels.includes(char);
            if (isVowel && !previousCharWasVowel) {
                count++;
            }
            previousCharWasVowel = isVowel;
        }
        // Handle silent e
        if (word.endsWith('e') && count > 1) {
            count--;
        }
        return Math.max(1, count);
    }
    /**
     * Calculate technicality score
     */
    calculateTechnicality(content) {
        const technicalPatterns = [
            /\b(api|json|xml|http|https|ssl|tls|oauth|jwt)\b/gi,
            /\b(class|function|method|interface|variable|parameter)\b/gi,
            /\b(database|sql|nosql|mongodb|postgresql|mysql)\b/gi,
            /\b(server|client|backend|frontend|middleware)\b/gi,
            /\b(docker|kubernetes|aws|azure|gcp|cloud)\b/gi,
            /\b(git|github|gitlab|bitbucket|version|commit)\b/gi,
            /\b(test|unittest|integration|e2e|ci|cd)\b/gi,
            /\b(algorithm|complexity|optimization|performance)\b/gi
        ];
        const words = content.split(/\s+/).filter(w => w.length > 0);
        let technicalMatches = 0;
        technicalPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                technicalMatches += matches.length;
            }
        });
        return Math.min(technicalMatches / Math.max(words.length, 1) * 10, 1.0);
    }
    /**
     * Generate embedding for content
     */
    async generateEmbedding(content) {
        try {
            // Try to use AI service for embeddings
            const embedding = await this.aiAnalysisService.generateEmbeddings(content);
            return new Float32Array(embedding);
        }
        catch (error) {
            this.logger.warn('AI embedding generation failed, using fallback:', getErrorMessage(error));
            // Fallback: create simple hash-based embedding
            return this.createSimpleEmbedding(content);
        }
    }
    /**
     * Create simple embedding as fallback
     */
    createSimpleEmbedding(content) {
        const embedding = new Float32Array(128); // Fixed size embedding
        const hash = this.simpleHash(content);
        // Fill embedding with hash-based values
        for (let i = 0; i < 128; i++) {
            embedding[i] = ((hash + i) % 1000) / 1000 - 0.5; // Normalize to -0.5 to 0.5
        }
        return embedding;
    }
    /**
     * Simple hash function
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    /**
     * Create semantic hash from content analysis
     */
    createSemanticHash(analysis, content) {
        const conceptsStr = analysis.concepts.map(c => c.concept).sort().join('|');
        const themesStr = analysis.themes.sort().join('|');
        const metricsStr = `${analysis.complexity.toFixed(2)}:${analysis.readability.toFixed(2)}:${analysis.technicality.toFixed(2)}`;
        const combined = `${conceptsStr}::${themesStr}::${metricsStr}`;
        return this.simpleHash(combined).toString(36);
    }
    /**
     * Calculate confidence score
     */
    calculateConfidence(analysis, options) {
        let confidence = 0.5; // Base confidence
        // Increase confidence based on concept quality
        const avgConceptConfidence = analysis.concepts.length > 0
            ? analysis.concepts.reduce((sum, c) => sum + c.confidence, 0) / analysis.concepts.length
            : 0;
        confidence += avgConceptConfidence * 0.3;
        // Increase confidence based on theme extraction
        confidence += (analysis.themes.length / 5) * 0.1; // Max 5 themes
        // Adjust for content complexity
        if (analysis.complexity > 0.3 && analysis.complexity < 0.8) {
            confidence += 0.1; // Prefer moderate complexity
        }
        return Math.min(Math.max(confidence, 0), 1);
    }
    /**
     * Calculate concept overlap between two fingerprints
     */
    calculateConceptOverlap(concepts1, concepts2) {
        if (concepts1.length === 0 && concepts2.length === 0)
            return 1;
        if (concepts1.length === 0 || concepts2.length === 0)
            return 0;
        const set1 = new Set(concepts1.map(c => c.toLowerCase()));
        const set2 = new Set(concepts2.map(c => c.toLowerCase()));
        const intersection = new Set(Array.from(set1).filter(c => set2.has(c)));
        const union = new Set([...Array.from(set1), ...Array.from(set2)]);
        return intersection.size / union.size; // Jaccard similarity
    }
    /**
     * Calculate embedding similarity
     */
    calculateEmbeddingSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length)
            return 0;
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        if (norm1 === 0 || norm2 === 0)
            return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)); // Cosine similarity
    }
    /**
     * Calculate combined similarity score
     */
    calculateCombinedSimilarity(conceptOverlap, embeddingSimilarity, fingerprint1, fingerprint2) {
        let weights = { concept: 0.6, embedding: 0.4 };
        // Adjust weights based on availability
        if (!fingerprint1.embeddings || !fingerprint2.embeddings ||
            fingerprint1.embeddings.length === 0 || fingerprint2.embeddings.length === 0) {
            weights = { concept: 1.0, embedding: 0.0 };
        }
        // Adjust weights based on complexity similarity
        const complexityDiff = Math.abs(fingerprint1.complexityScore - fingerprint2.complexityScore);
        if (complexityDiff > 0.3) {
            weights.concept *= 0.8; // Reduce concept weight for high complexity difference
        }
        return (conceptOverlap * weights.concept) + (embeddingSimilarity * weights.embedding);
    }
    /**
     * Fallback content analysis
     */
    fallbackContentAnalysis(content, maxConcepts) {
        const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const wordFreq = new Map();
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        const concepts = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxConcepts)
            .map(([word, freq]) => ({
            concept: word,
            relevance: freq / words.length,
            confidence: 0.5,
            context: this.extractContext(content, word)
        }));
        return {
            concepts,
            themes: this.extractThemes(content),
            complexity: this.calculateComplexity(content),
            readability: this.calculateReadability(content),
            technicality: this.calculateTechnicality(content)
        };
    }
    /**
     * Generate cache key
     */
    generateCacheKey(content, options) {
        const contentHash = this.simpleHash(content).toString(36);
        const optionsHash = this.simpleHash(JSON.stringify(options)).toString(36);
        return `${contentHash}:${optionsHash}`;
    }
    /**
     * Get cached fingerprint
     */
    getCachedFingerprint(cacheKey) {
        const cached = this.fingerprintCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            return cached.fingerprint;
        }
        if (cached) {
            this.fingerprintCache.delete(cacheKey); // Remove expired cache
        }
        return null;
    }
    /**
     * Cache fingerprint
     */
    cacheFingerprint(cacheKey, fingerprint) {
        this.fingerprintCache.set(cacheKey, {
            fingerprint,
            timestamp: Date.now()
        });
        // Simple cache cleanup - remove oldest entries if cache is too large
        if (this.fingerprintCache.size > 1000) {
            const oldestKey = this.fingerprintCache.keys().next().value;
            if (oldestKey) {
                this.fingerprintCache.delete(oldestKey);
            }
        }
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.fingerprintCache.clear();
        this.logger.debug('Semantic fingerprint cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.fingerprintCache.size,
            hitRate: 0 // Would need to track hits/misses for real hit rate
        };
    }
    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new VersionTrackingError('SemanticFingerprintGenerator not initialized. Call initialize() first.', 'SERVICE_NOT_INITIALIZED');
        }
    }
    /**
     * Shutdown service
     */
    async shutdown() {
        this.clearCache();
        this.initialized = false;
        this.logger.info('SemanticFingerprintGenerator shutdown complete');
    }
}
export default SemanticFingerprintGenerator;
//# sourceMappingURL=SemanticFingerprintGenerator.js.map