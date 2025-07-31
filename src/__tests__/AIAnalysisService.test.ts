import { AIAnalysisService } from '../services/AIAnalysisService';
import { Logger } from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

const mockedFs = jest.mocked(fs);

/**
 * Test Data Factory - Centralized test data management
 * Provides consistent, well-documented test documents for various scenarios
 */
class TestDataFactory {
  // Test file path constants
  static readonly PATHS = {
    QUALITY_DOC: 'test-document-quality.md',
    DUPLICATE_DOC: 'test-document-duplicate.md', 
    RELEVANCE_DOC: 'test-document-relevance.md',
    EMPTY_DOC: 'test-document-empty.md',
    NONEXISTENT_DOC: 'non-existent-document.md'
  } as const;

  // Expected metrics for quality document
  static readonly QUALITY_METRICS = {
    WORD_COUNT: 35,
    LINE_COUNT: 15,
    HEADER_COUNT: 1,
    HAS_CODE_BLOCKS: true,
    HAS_IMAGES: true,
    HAS_LINKS: true,
    HAS_TODOS: true
  } as const;

  // Expected metrics for relevance document
  static readonly RELEVANCE_METRICS = {
    WORD_COUNT: 14,
    MATCHED_KEYWORDS: ['user', 'authentication', 'session', 'management', 'security'],
    EXPECTED_MATCHES: 5
  } as const;

  /**
   * Quality test document with comprehensive content features
   * Contains: headers, code blocks, images, links, TODOs
   */
  static getQualityDocument(): string {
    return [
      '# Test Document',
      '',
      'This is a test document for quality analysis.',
      'It has some content and a [link](http://example.com).',
      '![Alt text](image.jpg)',
      '',
      '```javascript',
      'console.log("hello");',
      '```',
      '',
      'TODO: Add more content.',
      'Line 7',
      'Line 8', 
      'Line 9',
      'Line 10'
    ].join('\n');
  }

  /**
   * Document with duplicate content for testing duplicate detection
   */
  static getDuplicateDocument(): string {
    return [
      'Line 1',
      'Line 2', 
      'Line 1', // Duplicate
      'Line 3'
    ].join('\n');
  }

  /**
   * Document with content relevant to authentication/security context
   */
  static getRelevanceDocument(): string {
    return 'This document is about user authentication and session management. It also covers security best practices.';
  }

  /**
   * Empty document for edge case testing
   */
  static getEmptyDocument(): string {
    return '';
  }
}

/**
 * Mock Factory - Centralized mock creation and management
 */
class MockFactory {
  /**
   * Creates a winston logger mock with all required methods
   */
  static createLoggerMock(): Logger {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;
  }

  /**
   * Creates an OpenAI client mock with proper structure
   */
  static createOpenAIMock(response?: any): any {
    const defaultResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            score: 0.9,
            insights: ['AI-generated insight'],
            suggestions: ['AI-generated suggestion'],
            confidence: 0.95
          })
        }
      }]
    };

    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(response || defaultResponse)
        }
      }
    };
  }

  /**
   * Creates OpenAI constructor mock
   */
  static createOpenAIConstructorMock(instance: any): jest.Mock {
    return jest.fn(() => instance);
  }

  /**
   * Creates fs.readFile mock with predefined document responses
   */
  static createFileSystemMock(): jest.Mock {
    return jest.fn((filePath: string) => {
      const filename = path.basename(filePath);
      
      switch (filename) {
        case TestDataFactory.PATHS.QUALITY_DOC:
          return Promise.resolve(TestDataFactory.getQualityDocument());
        case TestDataFactory.PATHS.DUPLICATE_DOC:
          return Promise.resolve(TestDataFactory.getDuplicateDocument());
        case TestDataFactory.PATHS.RELEVANCE_DOC:
          return Promise.resolve(TestDataFactory.getRelevanceDocument());
        case TestDataFactory.PATHS.EMPTY_DOC:
          return Promise.resolve(TestDataFactory.getEmptyDocument());
        default:
          return Promise.reject(new Error('File not found'));
      }
    });
  }
}


/**
 * AIAnalysisService Test Suite
 * 
 * Tests the AI analysis service with both local pattern-based analysis
 * and OpenAI API integration. Covers quality analysis, duplicate detection,
 * and relevance scoring with comprehensive error handling.
 */
describe('AIAnalysisService', () => {
  let service: AIAnalysisService;
  let loggerMock: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock = MockFactory.createLoggerMock();
    
    // Set up fs.readFile mock
    mockedFs.readFile.mockImplementation((filePath: string | Buffer | URL, encoding?: any) => {
      const filename = path.basename(filePath.toString());
      
      // Test file content mapping
      const testFiles: Record<string, string> = {
        'test-document-quality.md': TestDataFactory.getQualityDocument(),
        'test-document-duplicate.md': TestDataFactory.getDuplicateDocument(),
        'test-document-relevance.md': TestDataFactory.getRelevanceDocument(),
        'test-document-empty.md': TestDataFactory.getEmptyDocument()
      };
      
      if (testFiles.hasOwnProperty(filename)) {
        return Promise.resolve(testFiles[filename]);
      } else {
        return Promise.reject(new Error('File not found'));
      }
    });
  });

  describe('Constructor and Initialization', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should be defined', () => {
      service = new AIAnalysisService('local', loggerMock);
      expect(service).toBeDefined();
    });

    it('should log info for local AI provider', () => {
      service = new AIAnalysisService('local', loggerMock);
      expect(loggerMock.info).toHaveBeenCalledWith('Using local AI analysis (pattern-based)');
    });

    it('should log info for anthropic AI provider (not implemented)', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      service = new AIAnalysisService('anthropic', loggerMock);
      expect(loggerMock.info).toHaveBeenCalledWith('Anthropic client initialization not implemented');
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should log warning for unknown AI provider', () => {
      service = new AIAnalysisService('unknown' as any, loggerMock);
      expect(loggerMock.warn).toHaveBeenCalledWith('Unknown AI provider: unknown');
    });

    it('should initialize OpenAI client when API key is present', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockOpenAIInstance = MockFactory.createOpenAIMock();
      const MockOpenAIClass = MockFactory.createOpenAIConstructorMock(mockOpenAIInstance);
      
      service = new AIAnalysisService('openai', loggerMock, undefined, MockOpenAIClass);
      
      expect(MockOpenAIClass).toHaveBeenCalledWith({
        apiKey: 'test-key'
      });
      delete process.env.OPENAI_API_KEY;
    });

    it('should log error if AI client initialization fails', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const MockOpenAIClass = jest.fn(() => {
        throw new Error('Failed to load OpenAI');
      });
      service = new AIAnalysisService('openai', loggerMock, undefined, MockOpenAIClass);
      expect(loggerMock.error).toHaveBeenCalledWith('Failed to initialize AI client:', expect.any(Error));
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Local Analysis Mode', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
      service = new AIAnalysisService('local', loggerMock);
    });

    describe('analyzeQuality', () => {
      it('should analyze document quality locally', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(analysis).toBeDefined();
        expect(analysis.analysisType).toBe('quality');
        expect(analysis.score).toBeGreaterThan(0);
        expect(analysis.insights).toContain(`Document length: ${TestDataFactory.QUALITY_METRICS.WORD_COUNT} words`);
        expect(analysis.suggestions).toContain('Complete pending TODO items');
        expect(analysis.confidence).toBe(0.6);
        expect(analysis.documentId).toBeDefined();
        expect(analysis.analyzedAt).toBeDefined();
      });

      it('should return fallback analysis on read error', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.NONEXISTENT_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(loggerMock.error).toHaveBeenCalledWith('Failed to analyze document quality:', expect.any(Error));
        expect(analysis.analysisType).toBe('quality');
        expect(analysis.score).toBe(0.5);
        expect(analysis.insights).toContain('Analysis failed: Cannot read document: File not found');
        expect(analysis.confidence).toBe(0.1);
      });

      it('should handle empty document gracefully', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.EMPTY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(analysis.analysisType).toBe('quality');
        expect(analysis.score).toBeGreaterThanOrEqual(0.5); // Base score
        // Accept either 0 or 1 words (empty string may have whitespace)
        expect(analysis.insights.some(insight => 
          insight.includes('Document length: 0 words') || 
          insight.includes('Document length: 1 words')
        )).toBe(true);
        expect(analysis.suggestions).toContain('Consider adding more detailed content');
      });
    });

    describe('detectDuplicates', () => {
      it('should detect duplicates locally', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.DUPLICATE_DOC}`;
        const analysis = await service.detectDuplicates(documentPath);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(analysis).toBeDefined();
        expect(analysis.analysisType).toBe('duplicate');
        expect(analysis.score).toBeGreaterThan(0);
        expect(analysis.insights).toContain('Document contains significant duplicate content');
        expect(analysis.suggestions).toContain('Remove or consolidate duplicate sections');
        expect(analysis.confidence).toBe(0.75);
      });

      it('should handle documents with no duplicates', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.detectDuplicates(documentPath);

        expect(analysis.analysisType).toBe('duplicate');
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.confidence).toBe(0.75);
      });
    });

    describe('calculateRelevance', () => {
      it('should calculate relevance locally', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.RELEVANCE_DOC}`;
        const workContext = 'user authentication and session management security';
        const analysis = await service.calculateRelevance(documentPath, workContext);

        const workKeywords = workContext.toLowerCase().split(/\s+/);
        const expectedMatches = TestDataFactory.RELEVANCE_METRICS.EXPECTED_MATCHES;
        const expectedKeywords = TestDataFactory.RELEVANCE_METRICS.MATCHED_KEYWORDS;

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(analysis).toBeDefined();
        expect(analysis.analysisType).toBe('relevance');
        expect(analysis.score).toBeGreaterThan(0);
        expect(analysis.insights).toContain(`Found ${expectedMatches} relevant keywords out of ${workKeywords.length}`);
        expect(analysis.insights).toContain(`Relevant terms: ${expectedKeywords.join(', ')}`);
        expect(analysis.confidence).toBe(0.6);
      });

      it('should handle irrelevant content', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const workContext = 'completely unrelated topic xyz';
        const analysis = await service.calculateRelevance(documentPath, workContext);

        expect(analysis.analysisType).toBe('relevance');
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.suggestions).toContain('Consider adding more context related to the work being done');
      });
    });

    describe('generateInsights', () => {
      it('should generate insights for a document', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const insights = await service.generateInsights(documentPath);

        const metrics = TestDataFactory.QUALITY_METRICS;

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(insights).toBeDefined();
        expect(insights).toContain(`Document contains ${metrics.WORD_COUNT} words and ${metrics.LINE_COUNT} lines`);
        expect(insights).toContain('Contains code examples or technical snippets');
        expect(insights).toContain('Includes visual elements (images/diagrams)');
        expect(insights).toContain('Contains references to external resources');
        expect(insights).toContain(`Well-structured with ${metrics.HEADER_COUNT} headers`);
        expect(insights).toContain('Contains pending work items (TODO/FIXME)');
      });

      it('should handle insights generation errors', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.NONEXISTENT_DOC}`;
        const insights = await service.generateInsights(documentPath);

        expect(insights).toBeDefined();
        expect(insights[0]).toContain('Error generating insights');
        expect(loggerMock.error).toHaveBeenCalled();
      });
    });
  });

  describe('OpenAI Integration Mode', () => {
    let mockOpenAIInstance: any;
    let mockOpenAIConstructor: jest.Mock;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      mockOpenAIInstance = MockFactory.createOpenAIMock();
      mockOpenAIConstructor = MockFactory.createOpenAIConstructorMock(mockOpenAIInstance);
      service = new AIAnalysisService('openai', loggerMock, mockOpenAIInstance);
    });

    // Additional branch coverage tests
    describe('detectDuplicates with OpenAI', () => {
      it('should detect duplicates with OpenAI successfully', async () => {
        const duplicateResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                score: 0.8,
                insights: ['High duplicate content detected'],
                suggestions: ['Remove duplicate sections'],
                confidence: 0.9
              })
            }
          }]
        };
        mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(duplicateResponse);
        
        const documentPath = `path/to/${TestDataFactory.PATHS.DUPLICATE_DOC}`;
        const analysis = await service.detectDuplicates(documentPath);
        
        expect(analysis.analysisType).toBe('duplicate');
        expect(analysis.score).toBe(0.8);
        expect(analysis.insights).toContain('High duplicate content detected');
        expect(analysis.confidence).toBe(0.9);
      });

      it('should fallback to local analysis when OpenAI fails for duplicates', async () => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));
        
        const documentPath = `path/to/${TestDataFactory.PATHS.DUPLICATE_DOC}`;
        const analysis = await service.detectDuplicates(documentPath);
        
        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI duplicate analysis failed:', expect.any(Error));
        expect(analysis.analysisType).toBe('duplicate');
        expect(analysis.confidence).toBe(0.75); // Local fallback confidence
      });
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('should initialize OpenAI client if API key is present', () => {
      expect(service['aiClient']).toBe(mockOpenAIInstance);
    });

    describe('analyzeQuality', () => {
      it('should analyze document quality with OpenAI', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
        expect(analysis.analysisType).toBe('quality');
        expect(analysis.score).toBe(0.9);
        expect(analysis.insights).toContain('AI-generated insight');
        expect(analysis.confidence).toBe(0.95);
        expect(analysis.documentId).toBeDefined();
        expect(analysis.analyzedAt).toBeDefined();
      });

      it('should fallback to local analysis if OpenAI call fails', async () => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API error'));

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI analysis failed:', expect.any(Error));
        expect(analysis.analysisType).toBe('quality');
        expect(analysis.score).toBeGreaterThan(0);
        expect(analysis.confidence).toBe(0.6);
      });

      it('should handle malformed JSON response from OpenAI', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce({
          choices: [{ message: { content: 'invalid json {' } }]
        });

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI analysis failed:', expect.any(Error));
        expect(analysis.analysisType).toBe('quality');
        expect(analysis.confidence).toBe(0.6); // Fallback analysis
      });

      it('should handle empty response from OpenAI', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce({
          choices: []
        });

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI analysis failed:', expect.any(Error));
        expect(analysis.confidence).toBe(0.6); // Fallback analysis
      });
    });

    describe('calculateRelevance', () => {
      it('should calculate relevance with OpenAI', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.RELEVANCE_DOC}`;
        const workContext = 'user authentication and session management security';
        const analysis = await service.calculateRelevance(documentPath, workContext);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
        expect(analysis.analysisType).toBe('relevance');
        expect(analysis.score).toBe(0.9);
        expect(analysis.insights).toContain('AI-generated insight');
        expect(analysis.confidence).toBe(0.95);
      });

      it('should fallback to local analysis if OpenAI relevance call fails', async () => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API error'));

        const documentPath = `path/to/${TestDataFactory.PATHS.RELEVANCE_DOC}`;
        const workContext = 'user authentication and session management security';
        const analysis = await service.calculateRelevance(documentPath, workContext);

        expect(fs.readFile).toHaveBeenCalledWith(documentPath, 'utf-8');
        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI relevance analysis failed:', expect.any(Error));
        expect(analysis.analysisType).toBe('relevance');
        expect(analysis.score).toBeGreaterThan(0);
        expect(analysis.confidence).toBe(0.6);
      });

      it('should validate OpenAI API call parameters', async () => {
        const documentPath = `path/to/${TestDataFactory.PATHS.RELEVANCE_DOC}`;
        const workContext = 'test context';
        await service.calculateRelevance(documentPath, workContext);

        const call = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
        expect(call.model).toBe('gpt-3.5-turbo');
        expect(call.max_tokens).toBe(800);
        expect(call.temperature).toBe(0.3);
        expect(call.messages[0].content).toContain('test context');
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle network timeout errors', async () => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(
          new Error('Request timeout')
        );

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(analysis.confidence).toBe(0.6); // Should fallback to local
        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI analysis failed:', expect.any(Error));
      });

      it('should handle rate limit errors gracefully', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(rateLimitError);

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(analysis).toBeDefined();
        expect(analysis.confidence).toBe(0.6); // Fallback analysis
      });

      it('should handle partial API responses', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 0.8,
                insights: ['Partial insight']
                // Missing suggestions and confidence
              })
            }
          }]
        });

        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const analysis = await service.analyzeQuality(documentPath);

        expect(analysis.score).toBe(0.8);
        expect(analysis.insights).toContain('Partial insight');
        expect(analysis.suggestions).toEqual(['No suggestions provided']);
        expect(analysis.confidence).toBe(0.7); // Default fallback
      });
    });

    describe('generateInsights with OpenAI', () => {
      it('should generate AI insights successfully', async () => {
        const insightsResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                insights: ['AI-generated structural insight', 'AI-detected content pattern'],
                suggestions: ['AI-suggested improvement'],
                confidence: 0.92
              })
            }
          }]
        };
        mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(insightsResponse);
        
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const insights = await service.generateInsights(documentPath);
        
        expect(insights).toContain('AI-generated structural insight');
        expect(insights).toContain('AI-detected content pattern');
      });

      it('should fallback to local insights when OpenAI fails', async () => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));
        
        const documentPath = `path/to/${TestDataFactory.PATHS.QUALITY_DOC}`;
        const insights = await service.generateInsights(documentPath);
        
        expect(loggerMock.error).toHaveBeenCalledWith('OpenAI insights failed:', expect.any(Error));
        expect(insights).toBeDefined();
        expect(Array.isArray(insights)).toBe(true);
      });
    });

    describe('Edge cases for API provider selection', () => {
      it('should handle missing API key gracefully', () => {
        delete process.env.OPENAI_API_KEY;
        const serviceWithoutKey = new AIAnalysisService('openai', loggerMock);
        expect(loggerMock.warn).toHaveBeenCalledWith('OpenAI API key not found, using local analysis');
      });

      it('should handle anthropic provider (not implemented)', () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';
        const anthropicService = new AIAnalysisService('anthropic', loggerMock);
        expect(loggerMock.info).toHaveBeenCalledWith('Anthropic client initialization not implemented');
        delete process.env.ANTHROPIC_API_KEY;
      });
    });
  });
});