/**
 * Documentation Tools Tests
 * 
 * Comprehensive tests for Documentation tool handlers (4 tools)
 */

import { registerDocumentationTools } from '../../tools/documentation/index.js';
import { ServiceMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, PerformanceTestUtils, TestAssertions } from '../helpers/TestUtils.js';

describe('Documentation Tools', () => {
  let documentationService: any;
  let tools: Map<string, Function>;
  let toolDefinitions: any[];

  beforeEach(() => {
    documentationService = ServiceMockFactory.createDocumentationServiceMock();
    tools = new Map();
    toolDefinitions = registerDocumentationTools(tools, documentationService);
  });

  describe('Tool Registration', () => {
    test('should register correct number of documentation tools', () => {
      expect(toolDefinitions).toHaveLength(4);
      expect(tools.size).toBe(4);
    });

    test('should register all expected documentation tools', () => {
      const expectedTools = [
        'docs_reference',
        'docs_update', 
        'docs_search',
        'docs_validate'
      ];

      expectedTools.forEach(toolName => {
        expect(tools.has(toolName)).toBe(true);
        expect(toolDefinitions.find(t => t.name === toolName)).toBeDefined();
      });
    });

    test('should have valid schema definitions for each tool', () => {
      toolDefinitions.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });
  });

  describe('docs_reference Tool', () => {
    let referenceTool: Function;

    beforeEach(() => {
      referenceTool = tools.get('docs_reference')!;
    });

    test('should find relevant documentation for frontend work', async () => {
      const args = {
        files: ['/src/components/Button.tsx', '/src/styles/button.css'],
        context: 'Implementing a reusable button component with multiple variants',
        category: 'frontend',
        workType: 'implement'
      };

      const result = await referenceTool(args);

      expect(result).toBeDefined();
      expect(result.relevantDocs).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.category).toBe('frontend');
      expect(result.workType).toBe('implement');
      expect(documentationService.processDocumentationRequest).toHaveBeenCalledWith({
        action: 'reference',
        files: args.files,
        context: args.context,
        category: args.category,
        workType: args.workType
      });
    });

    test('should auto-detect category and work type when not provided', async () => {
      const args = {
        files: ['/api/users.ts', '/api/auth.ts'],
        context: 'Building user authentication API endpoints'
      };

      const result = await referenceTool(args);

      expect(result).toBeDefined();
      expect(documentationService.processDocumentationRequest).toHaveBeenCalledWith({
        action: 'reference',
        files: args.files,
        context: args.context,
        category: undefined,
        workType: undefined
      });
    });

    test('should handle different work categories', async () => {
      const categories = ['frontend', 'backend', 'electron', 'database', 'testing'];
      
      for (const category of categories) {
        const args = {
          files: [`/src/${category}/test.ts`],
          context: `Working on ${category} functionality`,
          category
        };

        const result = await referenceTool(args);
        expect(result.category).toBe(category);
      }
    });

    test('should handle different work types', async () => {
      const workTypes = ['implement', 'fix', 'refactor', 'optimize', 'test', 'deploy', 'security'];
      
      for (const workType of workTypes) {
        const args = {
          files: ['/src/test.ts'],
          context: `Need to ${workType} the functionality`,
          workType
        };

        const result = await referenceTool(args);
        expect(result.workType).toBe(workType);
      }
    });

    test('should handle multiple file types in single request', async () => {
      const args = {
        files: [
          '/src/components/Form.tsx',
          '/src/styles/form.scss',
          '/src/utils/validation.ts',
          '/tests/form.test.ts'
        ],
        context: 'Creating a comprehensive form component with validation and styling'
      };

      const result = await referenceTool(args);
      
      expect(result.relevantDocs).toHaveLength(4);
      expect(documentationService.processDocumentationRequest).toHaveBeenCalledWith({
        action: 'reference',
        files: args.files,
        context: args.context,
        category: undefined,
        workType: undefined
      });
    });

    test('should validate required parameters', async () => {
      // Missing files
      await expect(referenceTool({ context: 'Test context' })).rejects.toThrow();
      
      // Missing context
      await expect(referenceTool({ files: ['/test.ts'] })).rejects.toThrow();
      
      // Empty files array
      await expect(referenceTool({ files: [], context: 'Test' })).rejects.toThrow();
    });
  });

  describe('docs_update Tool', () => {
    let updateTool: Function;

    beforeEach(() => {
      updateTool = tools.get('docs_update')!;
    });

    test('should update documentation after file changes', async () => {
      const args = {
        files: ['/src/api/users.ts', '/src/models/User.ts'],
        context: 'Added new user profile endpoints and updated user model',
        category: 'backend'
      };

      const result = await updateTool(args);

      expect(result).toBeDefined();
      expect(result.updatedDocs).toBeDefined();
      expect(result.success).toBe(true);
      expect(documentationService.processDocumentationRequest).toHaveBeenCalledWith({
        action: 'update',
        files: args.files,
        context: args.context,
        category: args.category
      });
    });

    test('should handle documentation updates for different categories', async () => {
      const testCases = [
        {
          category: 'frontend',
          files: ['/src/components/Modal.tsx'],
          context: 'Enhanced modal component with accessibility features'
        },
        {
          category: 'database',
          files: ['/migrations/add_user_preferences.sql'],
          context: 'Added user preferences table and indexes'
        },
        {
          category: 'testing',
          files: ['/tests/integration/api.test.ts'],
          context: 'Added comprehensive API integration tests'
        }
      ];

      for (const testCase of testCases) {
        const result = await updateTool(testCase);
        expect(result.success).toBe(true);
      }
    });

    test('should track change history', async () => {
      const args = {
        files: ['/src/utils/helpers.ts'],
        context: 'Refactored utility functions for better performance'
      };

      const result = await updateTool(args);

      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    test('should handle bulk file updates efficiently', async () => {
      const largeFileList = Array.from({ length: 50 }, (_, i) => `/src/component${i}.tsx`);
      const args = {
        files: largeFileList,
        context: 'Major refactoring of component library with TypeScript improvements',
        category: 'frontend'
      };

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await updateTool(args);
      });

      TestAssertions.assertExecutionTime(duration, 1000, 'Bulk documentation update');
    });
  });

  describe('docs_search Tool', () => {
    let searchTool: Function;

    beforeEach(() => {
      searchTool = tools.get('docs_search')!;
    });

    test('should search documentation by query', async () => {
      const args = { query: 'authentication API' };

      const result = await searchTool(args);

      expect(result).toBeDefined();
      expect(result.query).toBe(args.query);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(documentationService.searchDocumentation).toHaveBeenCalledWith(args.query);
    });

    test('should handle different search queries', async () => {
      const queries = [
        'React components',
        'database migration',
        'error handling',
        'performance optimization',
        'security best practices'
      ];

      for (const query of queries) {
        const result = await searchTool({ query });
        
        expect(result.query).toBe(query);
        expect(result.results).toBeDefined();
        expect(result.results[0].title).toContain(query);
      }
    });

    test('should handle empty search results', async () => {
      documentationService.searchDocumentation.mockResolvedValueOnce([]);
      
      const result = await searchTool({ query: 'nonexistent topic' });
      
      expect(result.results).toHaveLength(0);
    });

    test('should handle special characters in search query', async () => {
      const queries = [
        'C++ integration',
        'file.ext handling',
        'regex patterns: /^test.*$/',
        'Unicode: 测试 search'
      ];

      for (const query of queries) {
        await expect(searchTool({ query })).resolves.toBeDefined();
      }
    });

    test('should validate search query parameter', async () => {
      // Missing query
      await expect(searchTool({})).rejects.toThrow();
      
      // Empty query
      await expect(searchTool({ query: '' })).rejects.toThrow();
      
      // Non-string query
      await expect(searchTool({ query: 123 })).rejects.toThrow();
    });

    test('should handle search performance with complex queries', async () => {
      const complexQuery = 'authentication AND authorization AND JWT AND OAuth2 AND security AND middleware';
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await searchTool({ query: complexQuery });
      });

      TestAssertions.assertExecutionTime(duration, 500, 'Complex search query');
    });
  });

  describe('docs_validate Tool', () => {
    let validateTool: Function;

    beforeEach(() => {
      validateTool = tools.get('docs_validate')!;
    });

    test('should validate documentation structure', async () => {
      const result = await validateTool({});

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.score).toBeDefined();
      expect(documentationService.validateDocumentationStructure).toHaveBeenCalled();
    });

    test('should handle validation with issues', async () => {
      documentationService.validateDocumentationStructure.mockResolvedValueOnce({
        isValid: false,
        issues: [
          'Missing API documentation for new endpoints',
          'Outdated installation instructions'
        ],
        recommendations: [
          'Update API docs with latest endpoints',
          'Refresh installation guide'
        ],
        score: 0.65
      });

      const result = await validateTool({});

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
      expect(result.score).toBe(0.65);
    });

    test('should handle validation of healthy documentation', async () => {
      documentationService.validateDocumentationStructure.mockResolvedValueOnce({
        isValid: true,
        issues: [],
        recommendations: ['Documentation looks good!'],
        score: 0.95
      });

      const result = await validateTool({});

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.9);
    });

    test('should not require any parameters', async () => {
      // Should work with empty object
      await expect(validateTool({})).resolves.toBeDefined();
      
      // Should work with no parameters
      await expect(validateTool()).resolves.toBeDefined();
    });

    test('should provide actionable recommendations', async () => {
      const result = await validateTool({});

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(typeof result.recommendations[0]).toBe('string');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service errors gracefully', async () => {
      documentationService.processDocumentationRequest.mockRejectedValueOnce(
        new Error('Documentation service unavailable')
      );

      const referenceTool = tools.get('docs_reference')!;
      
      await expect(referenceTool({
        files: ['/test.ts'],
        context: 'Test context'
      })).rejects.toThrow('Documentation service unavailable');
    });

    test('should handle malformed input data', async () => {
      const updateTool = tools.get('docs_update')!;
      
      const malformedArgs = {
        files: 'not-an-array',
        context: ['should', 'be', 'string']
      };

      await expect(updateTool(malformedArgs)).rejects.toThrow();
    });

    test('should handle concurrent tool usage', async () => {
      const concurrentCalls = [
        () => tools.get('docs_reference')!({
          files: ['/src/a.ts'],
          context: 'Test A'
        }),
        () => tools.get('docs_search')!({ query: 'search term' }),
        () => tools.get('docs_validate')!({}),
        () => tools.get('docs_update')!({
          files: ['/src/b.ts'],
          context: 'Test B'
        })
      ];

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(concurrentCalls.map(call => call()));
      });

      TestAssertions.assertExecutionTime(duration, 1000, 'Concurrent documentation tool usage');
    });

    test('should maintain tool isolation', async () => {
      const referenceTool = tools.get('docs_reference')!;
      const searchTool = tools.get('docs_search')!;

      await referenceTool({
        files: ['/test1.ts'],
        context: 'Reference test'
      });

      await searchTool({ query: 'search test' });

      // Each service method should be called once
      expect(documentationService.processDocumentationRequest).toHaveBeenCalledTimes(1);
      expect(documentationService.searchDocumentation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency documentation requests', async () => {
      const referenceTool = tools.get('docs_reference')!;
      const requests = Array.from({ length: 50 }, (_, i) => () =>
        referenceTool({
          files: [`/src/file${i}.ts`],
          context: `Processing file ${i}`
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(requests.map(req => req()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, '50 concurrent documentation references');
    });

    test('should efficiently handle large documentation searches', async () => {
      const searchTool = tools.get('docs_search')!;
      const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
        path: `/docs/result${i}.md`,
        title: `Search Result ${i}`,
        excerpt: `Excerpt for result ${i}`,
        relevance: Math.random()
      }));

      documentationService.searchDocumentation.mockResolvedValueOnce(largeResultSet);

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await searchTool({ query: 'comprehensive search' });
      });

      TestAssertions.assertExecutionTime(duration, 300, 'Large search result processing');
    });
  });
});