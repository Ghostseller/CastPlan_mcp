/**
 * Enhanced Tools Tests
 * 
 * Comprehensive tests for Enhanced tool handlers (6 tools)
 */

import { registerEnhancedTools } from '../../tools/enhanced/index.js';
import { ServiceMockFactory, ConfigMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, PerformanceTestUtils, TestAssertions, TestFileSystem, MockLoggerFactory } from '../helpers/TestUtils.js';
import { I18nTestUtils, I18nTestEnvironment, TEST_LOCALES, LocaleTestCaseGenerator } from '../helpers/I18nTestUtils.js';
import type { I18nTestConfig } from '../helpers/I18nTestUtils.js';

describe('Enhanced Tools', () => {
  let services: any;
  let tools: Map<string, Function>;
  let toolDefinitions: any[];
  let i18nEnvironment: I18nTestEnvironment;
  let testConfig: I18nTestConfig;

  beforeEach(() => {
    // Use configurable locale/timezone instead of hardcoded values
    testConfig = TEST_LOCALES['en-US']; // Default to UTC for consistent testing
    i18nEnvironment = new I18nTestEnvironment();
    i18nEnvironment.setTestEnvironment(testConfig);

    const mockConfig = ConfigMockFactory.createUltimateAutomationConfig({
      ai: { enabled: true, provider: 'openai' },
      i18n: testConfig,
      timeZone: testConfig.timezone,
      locale: testConfig.locale
    });

    services = {
      dateTimeService: ServiceMockFactory.createDateTimeServiceMock(testConfig),
      lifecycleService: ServiceMockFactory.createDocumentLifecycleServiceMock(),
      connectionService: ServiceMockFactory.createWorkDocumentConnectionServiceMock(),
      treeService: ServiceMockFactory.createDocumentTreeServiceMock(),
      aiService: ServiceMockFactory.createAIAnalysisServiceMock(),
      logger: MockLoggerFactory.create(),
      config: mockConfig
    };

    tools = new Map();
    toolDefinitions = registerEnhancedTools(tools, services);
  });

  afterEach(() => {
    i18nEnvironment?.restoreEnvironment();
  });

  describe('Tool Registration', () => {
    test('should register correct number of enhanced tools', () => {
      expect(toolDefinitions).toHaveLength(6);
      expect(tools.size).toBe(6);
    });

    test('should register all expected enhanced tools', () => {
      const expectedTools = [
        'initialize_documentation_system',
        'track_document_work',
        'analyze_document_quality',
        'get_document_tree',
        'update_document_lifecycle',
        'generate_documentation_report'
      ];

      expectedTools.forEach(toolName => {
        expect(tools.has(toolName)).toBe(true);
        expect(toolDefinitions.find(t => t.name === toolName)).toBeDefined();
      });
    });

    test('should have comprehensive schema definitions', () => {
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

  describe('initialize_documentation_system Tool', () => {
    let initTool: Function;

    beforeEach(() => {
      initTool = tools.get('initialize_documentation_system')!;
    });

    test('should initialize documentation system successfully', async () => {
      const args = {
        projectRoot: '/test/project',
        enableAI: true,
        timeZone: testConfig.timezone // Use configurable timezone
      };

      const result = await initTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Enhanced Documentation System Initialized');
      expect(result.message).toContain(args.projectRoot);
      expect(result.message).toContain('AI Analysis: Enabled');
      expect(result.message).toContain(args.timeZone);
      
      expect(services.lifecycleService.initialize).toHaveBeenCalled();
      expect(services.connectionService.initialize).toHaveBeenCalled();
      expect(services.treeService.initialize).toHaveBeenCalled();
    });

    test('should initialize with AI disabled', async () => {
      const args = {
        projectRoot: '/test/project',
        enableAI: false,
        timeZone: 'UTC'
      };

      const result = await initTool(args);

      expect(result.success).toBe(true);
      expect(result.message).toContain('AI Analysis: Disabled');
      expect(result.message).toContain('UTC');
    });

    test('should use default timezone when not provided', async () => {
      const args = {
        projectRoot: '/test/project'
      };

      const result = await initTool(args);

      expect(result.success).toBe(true);
      // Should use configured default timezone, not hardcoded value
      expect(result.message).toMatch(/timezone: [A-Za-z_/]+/);
      // Verify it contains a valid timezone format
      const timezoneMatch = result.message.match(/timezone: ([A-Za-z_/]+)/);
      if (timezoneMatch) {
        const timezone = timezoneMatch[1];
        expect(timezone).toBeTruthy();
        expect(typeof timezone).toBe('string');
      }
    });

    test('should handle initialization failures gracefully', async () => {
      services.lifecycleService.initialize.mockRejectedValueOnce(new Error('Database connection failed'));

      const args = {
        projectRoot: '/test/project'
      };

      await expect(initTool(args)).rejects.toThrow('Database connection failed');
    });

    test('should validate required parameters', async () => {
      // Missing projectRoot
      await expect(initTool({})).rejects.toThrow();
      
      // Invalid projectRoot type
      await expect(initTool({ projectRoot: 123 })).rejects.toThrow();
    });
  });

  describe('track_document_work Tool', () => {
    let trackTool: Function;

    beforeEach(async () => {
      trackTool = tools.get('track_document_work')!;
      // Initialize services first
      await services.lifecycleService.initialize();
      await services.connectionService.initialize();
    });

    test('should track frontend work successfully', async () => {
      const args = {
        workType: 'frontend',
        workDescription: 'Implementing responsive navigation component',
        filePaths: ['/src/components/Navigation.tsx', '/src/styles/navigation.scss'],
        expectedDocuments: ['Component Library', 'Style Guide']
      };

      const result = await trackTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      TestAssertions.assertValidUUID(result.connectionId);
      expect(result.connectedDocuments).toBeDefined();
      expect(result.connectionStrength).toBeGreaterThan(0);
      expect(services.connectionService.createConnection).toHaveBeenCalled();
    });

    test('should track different work types', async () => {
      const workTypes = ['frontend', 'backend', 'database', 'electron', 'testing', 'deployment'];

      for (const workType of workTypes) {
        const args = {
          workType,
          workDescription: `Working on ${workType} functionality`,
          filePaths: [`/src/${workType}/test.ts`]
        };

        const result = await trackTool(args);

        expect(result.success).toBe(true);
        expect(services.connectionService.createConnection).toHaveBeenCalledWith(
          expect.objectContaining({
            workType,
            workDescription: args.workDescription,
            filePaths: args.filePaths
          })
        );
      }
    });

    test('should include AI insights when enabled', async () => {
      const args = {
        workType: 'backend',
        workDescription: 'Implementing user authentication API',
        filePaths: ['/api/auth.ts', '/middleware/jwt.ts']
      };

      const result = await trackTool(args);

      expect(result.success).toBe(true);
      expect(result.aiInsights).toBeDefined();
      expect(Array.isArray(result.aiInsights)).toBe(true);
      expect(services.aiService.calculateRelevance).toHaveBeenCalled();
      expect(services.connectionService.updateConnectionStrength).toHaveBeenCalled();
    });

    test('should identify missing documentation', async () => {
      const args = {
        workType: 'frontend',
        workDescription: 'New component implementation',
        filePaths: ['/src/components/New.tsx'],
        expectedDocuments: ['Component Guide', 'API Documentation']
      };

      const result = await trackTool(args);

      expect(result.success).toBe(true);
      expect(result.missingDocs).toBeDefined();
      expect(Array.isArray(result.missingDocs)).toBe(true);
    });

    test('should handle work without expected documents', async () => {
      const args = {
        workType: 'testing',
        workDescription: 'Adding unit tests',
        filePaths: ['/tests/utils.test.ts']
        // No expectedDocuments
      };

      const result = await trackTool(args);

      expect(result.success).toBe(true);
      expect(result.missingDocs).toEqual([]);
    });

    test('should handle multiple file paths efficiently', async () => {
      const manyFiles = Array.from({ length: 50 }, (_, i) => `/src/component${i}.tsx`);
      const args = {
        workType: 'frontend',
        workDescription: 'Large-scale component refactoring',
        filePaths: manyFiles
      };

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await trackTool(args);
      });

      TestAssertions.assertExecutionTime(duration, 1000, 'Tracking work with 50 files');
    });
  });

  describe('analyze_document_quality Tool', () => {
    let analyzeTool: Function;
    let tempProjectPath: string;

    beforeEach(async () => {
      analyzeTool = tools.get('analyze_document_quality')!;
      tempProjectPath = await TestFileSystem.createTestProject('quality-test');
      
      // Create test document
      await TestFileSystem.createTempFile(
        tempProjectPath,
        'test-document.md',
        '# Test Document\n\nThis is a test document for quality analysis.\n\n## Features\n- Feature 1\n- Feature 2'
      );
    });

    afterEach(async () => {
      await TestFileSystem.cleanupTempDir();
    });

    test('should analyze document quality with AI', async () => {
      const documentPath = `${tempProjectPath}/test-document.md`;
      const args = {
        documentPath,
        includeAI: true,
        analysisTypes: ['quality', 'duplicate', 'completeness']
      };

      const result = await analyzeTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.documentPath).toBe(documentPath);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.basicMetrics).toBeDefined();
      expect(Array.isArray(result.qualityReport)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      expect(services.aiService.analyzeQuality).toHaveBeenCalledWith(documentPath);
      expect(services.aiService.detectDuplicates).toHaveBeenCalledWith(documentPath);
      expect(services.aiService.calculateRelevance).toHaveBeenCalled();
    });

    test('should analyze document quality without AI', async () => {
      const documentPath = `${tempProjectPath}/test-document.md`;
      const args = {
        documentPath,
        includeAI: false,
        analysisTypes: ['quality']
      };

      const result = await analyzeTool(args);

      expect(result.success).toBe(true);
      expect(result.overallScore).toBeNull(); // No AI analysis
      expect(result.basicMetrics).toBeDefined();
      expect(services.aiService.analyzeQuality).not.toHaveBeenCalled();
    });

    test('should handle different analysis types', async () => {
      const documentPath = `${tempProjectPath}/test-document.md`;
      const analysisTypes = ['quality', 'duplicate', 'completeness'];

      for (const analysisType of analysisTypes) {
        const args = {
          documentPath,
          includeAI: true,
          analysisTypes: [analysisType]
        };

        const result = await analyzeTool(args);

        expect(result.success).toBe(true);
        expect(result.qualityReport.some(report => 
          report.toUpperCase().includes(analysisType.toUpperCase())
        )).toBe(true);
      }
    });

    test('should handle non-existent document', async () => {
      const args = {
        documentPath: '/non/existent/document.md',
        includeAI: true,
        analysisTypes: ['quality']
      };

      await expect(analyzeTool(args)).rejects.toThrow('Document not found');
    });

    test('should provide basic metrics for any document', async () => {
      const documentPath = `${tempProjectPath}/test-document.md`;
      const args = {
        documentPath,
        includeAI: false
      };

      const result = await analyzeTool(args);

      expect(result.basicMetrics).toBeDefined();
      expect(result.basicMetrics.some(metric => metric.includes('File Size'))).toBe(true);
      expect(result.basicMetrics.some(metric => metric.includes('Lines'))).toBe(true);
      expect(result.basicMetrics.some(metric => metric.includes('Words'))).toBe(true);
    });
  });

  describe('get_document_tree Tool', () => {
    let treeTool: Function;

    beforeEach(() => {
      treeTool = tools.get('get_document_tree')!;
    });

    test('should get complete document tree', async () => {
      const args = {};

      const result = await treeTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalNodes).toBeDefined();
      expect(result.maxDepth).toBeDefined();
      expect(result.tree).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      
      expect(services.lifecycleService.getAllDocuments).toHaveBeenCalled();
      expect(services.treeService.buildTree).toHaveBeenCalled();
    });

    test('should filter by root category', async () => {
      const categories = ['master', 'component', 'category'];

      for (const rootCategory of categories) {
        const args = { rootCategory };

        const result = await treeTool(args);

        expect(result.success).toBe(true);
        expect(result.totalNodes).toBeDefined();
      }
    });

    test('should include metadata when requested', async () => {
      const args = {
        includeMetadata: true,
        maxDepth: 5
      };

      const result = await treeTool(args);

      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();
    });

    test('should respect max depth parameter', async () => {
      const args = {
        maxDepth: 3
      };

      const result = await treeTool(args);

      expect(result.success).toBe(true);
      expect(result.maxDepth).toBeLessThanOrEqual(3);
    });

    test('should handle empty document tree', async () => {
      services.lifecycleService.getAllDocuments.mockResolvedValueOnce([]);
      services.treeService.buildTree.mockResolvedValueOnce([]);

      const result = await treeTool({});

      expect(result.success).toBe(true);
      expect(result.totalNodes).toBe(0);
    });
  });

  describe('update_document_lifecycle Tool', () => {
    let updateTool: Function;

    beforeEach(() => {
      updateTool = tools.get('update_document_lifecycle')!;
    });

    test('should update document lifecycle state', async () => {
      const args = {
        documentId: 'test-doc-id',
        newState: 'published',
        reviewComment: 'Document approved for publication',
        scheduledReview: '2025-03-01T10:00:00.000Z'
      };

      const result = await updateTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newState).toBe('published');
      expect(result.reviewComment).toBe(args.reviewComment);
      expect(result.scheduledReview).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      
      expect(services.lifecycleService.updateDocumentState).toHaveBeenCalledWith(
        args.documentId, 
        args.newState
      );
      expect(services.lifecycleService.scheduleReview).toHaveBeenCalledWith(
        args.documentId, 
        args.scheduledReview
      );
    });

    test('should handle all valid lifecycle states', async () => {
      const validStates = ['draft', 'review', 'approved', 'published', 'outdated', 'archived'];

      for (const newState of validStates) {
        const args = {
          documentId: 'test-doc-id',
          newState
        };

        const result = await updateTool(args);

        expect(result.success).toBe(true);
        expect(result.newState).toBe(newState);
      }
    });

    test('should update without scheduled review', async () => {
      const args = {
        documentId: 'test-doc-id',
        newState: 'draft'
      };

      const result = await updateTool(args);

      expect(result.success).toBe(true);
      expect(result.scheduledReview).toBeNull();
      expect(services.lifecycleService.scheduleReview).not.toHaveBeenCalled();
    });

    test('should handle non-existent document', async () => {
      services.lifecycleService.updateDocumentState.mockRejectedValueOnce(
        new Error('Document not found')
      );

      const args = {
        documentId: 'non-existent-id',
        newState: 'published'
      };

      await expect(updateTool(args)).rejects.toThrow('Document not found');
    });

    test('should validate required parameters', async () => {
      // Missing documentId
      await expect(updateTool({ newState: 'published' })).rejects.toThrow();
      
      // Missing newState
      await expect(updateTool({ documentId: 'test-id' })).rejects.toThrow();
    });
  });

  describe('generate_documentation_report Tool', () => {
    let reportTool: Function;

    beforeEach(() => {
      reportTool = tools.get('generate_documentation_report')!;
    });

    test('should generate lifecycle report', async () => {
      const args = {
        reportType: 'lifecycle',
        timeRange: {
          start: '2025-01-01T00:00:00.000Z',
          end: '2025-01-31T23:59:59.999Z'
        },
        includeAI: true
      };

      const result = await reportTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.reportType).toBe('lifecycle');
      expect(result.report).toBeDefined();
      expect(result.report.title).toContain('Lifecycle Report');
      expect(result.generatedAt).toBeDefined();
    });

    test('should generate all report types', async () => {
      const reportTypes = ['lifecycle', 'quality', 'connections', 'duplicates', 'comprehensive'];

      for (const reportType of reportTypes) {
        const args = {
          reportType,
          includeAI: true
        };

        const result = await reportTool(args);

        expect(result.success).toBe(true);
        expect(result.reportType).toBe(reportType);
        expect(result.report).toBeDefined();
      }
    });

    test('should generate report without AI analysis', async () => {
      const args = {
        reportType: 'quality',
        includeAI: false
      };

      const result = await reportTool(args);

      expect(result.success).toBe(true);
      expect(result.report.aiEnabled).toBe(false);
    });

    test('should handle comprehensive report with time range', async () => {
      const args = {
        reportType: 'comprehensive',
        timeRange: {
          start: '2025-01-01T00:00:00.000Z',
          end: '2025-01-31T23:59:59.999Z'
        },
        includeAI: true
      };

      const result = await reportTool(args);

      expect(result.success).toBe(true);
      expect(result.report.period).toBeDefined();
      expect(result.report.aiEnabled).toBe(true);
    });

    test('should validate report type', async () => {
      const args = {
        reportType: 'invalid-report-type'
      };

      await expect(reportTool(args)).rejects.toThrow('Unknown report type');
    });

    test('should handle report generation errors', async () => {
      // Mock an error in the report generation
      const originalMethod = services.lifecycleService.getAllDocuments;
      services.lifecycleService.getAllDocuments.mockRejectedValueOnce(
        new Error('Database unavailable')
      );

      const args = {
        reportType: 'lifecycle'
      };

      await expect(reportTool(args)).rejects.toThrow();

      // Restore the original method
      services.lifecycleService.getAllDocuments = originalMethod;
    });
  });

  describe('Integration and Workflow Tests', () => {
    test('should handle complete documentation workflow', async () => {
      const initTool = tools.get('initialize_documentation_system')!;
      const trackTool = tools.get('track_document_work')!;
      const updateTool = tools.get('update_document_lifecycle')!;
      const reportTool = tools.get('generate_documentation_report')!;

      // Initialize system
      const initResult = await initTool({
        projectRoot: '/test/project',
        enableAI: true
      });
      expect(initResult.success).toBe(true);

      // Track work
      const trackResult = await trackTool({
        workType: 'frontend',
        workDescription: 'New component development',
        filePaths: ['/src/NewComponent.tsx']
      });
      expect(trackResult.success).toBe(true);

      // Update document lifecycle
      const updateResult = await updateTool({
        documentId: '1',
        newState: 'published'
      });
      expect(updateResult.success).toBe(true);

      // Generate report
      const reportResult = await reportTool({
        reportType: 'comprehensive',
        includeAI: true
      });
      expect(reportResult.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service unavailability', async () => {
      services.lifecycleService.initialize.mockRejectedValueOnce(new Error('Database connection failed'));

      const initTool = tools.get('initialize_documentation_system')!;

      await expect(initTool({
        projectRoot: '/test/project'
      })).rejects.toThrow('Database connection failed');
    });

    test('should handle AI service unavailability gracefully', async () => {
      services.aiService = null;
      services.config.ai.enabled = false;

      const trackTool = tools.get('track_document_work')!;

      const result = await trackTool({
        workType: 'frontend',
        workDescription: 'Test work',
        filePaths: ['/test.ts']
      });

      expect(result.success).toBe(true);
      expect(result.aiInsights).toEqual([]);
    });

    test('should validate enum values', async () => {
      const updateTool = tools.get('update_document_lifecycle')!;

      await expect(updateTool({
        documentId: 'test-id',
        newState: 'invalid-state'
      })).rejects.toThrow();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent enhanced operations', async () => {
      const operations = [
        () => tools.get('get_document_tree')!({}),
        () => tools.get('track_document_work')!({
          workType: 'frontend',
          workDescription: 'Test',
          filePaths: ['/test1.ts']
        }),
        () => tools.get('update_document_lifecycle')!({
          documentId: '1',
          newState: 'draft'
        }),
        () => tools.get('generate_documentation_report')!({
          reportType: 'lifecycle'
        })
      ];

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(operations.map(op => op()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, 'Concurrent enhanced operations');
    });

    test('should handle large-scale document tree operations', async () => {
      const manyDocuments = Array.from({ length: 1000 }, (_, i) =>
        TestDataFactory.createMockDocument({ id: `doc-${i}`, title: `Document ${i}` })
      );

      services.lifecycleService.getAllDocuments.mockResolvedValueOnce(manyDocuments);

      const treeTool = tools.get('get_document_tree')!;

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await treeTool({});
      });

      TestAssertions.assertExecutionTime(duration, 1000, 'Large document tree generation');
    });
  });

  // Internationalization and Locale Testing
  describe('Internationalization Support', () => {
    describe('Multi-timezone initialization', () => {
      const timezoneTestCases = LocaleTestCaseGenerator.generateTimezoneTestCases({
        expectedFormats: {}
      }, ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London', 'Asia/Tokyo']);

      timezoneTestCases.forEach(testCase => {
        test(`should initialize system properly in ${testCase.name}`, async () => {
          // Reconfigure services for this timezone
          i18nEnvironment.setTestEnvironment(testCase.config);
          const localServices = {
            ...services,
            dateTimeService: ServiceMockFactory.createDateTimeServiceMock(testCase.config),
            config: ConfigMockFactory.createUltimateAutomationConfig({
              ai: { enabled: true, provider: 'openai' },
              i18n: testCase.config,
              timeZone: testCase.config.timezone,
              locale: testCase.config.locale
            })
          };

          const localTools = new Map();
          registerEnhancedTools(localTools, localServices);
          const initTool = localTools.get('initialize_documentation_system')!;

          const args = {
            projectRoot: '/test/project',
            enableAI: true,
            timeZone: testCase.config.timezone
          };

          const result = await initTool(args);

          expect(result.success).toBe(true);
          expect(result.message).toContain(testCase.config.timezone);
          expect(localServices.lifecycleService.initialize).toHaveBeenCalled();
          expect(localServices.connectionService.initialize).toHaveBeenCalled();
          expect(localServices.treeService.initialize).toHaveBeenCalled();
        });
      });
    });

    describe('Multi-locale configuration', () => {
      const localeTestCases = LocaleTestCaseGenerator.generateLocaleTestCases({
        expectedFormats: {}
      }, ['en-US', 'ko-KR', 'ja-JP', 'de-DE']);

      localeTestCases.forEach(testCase => {
        test(`should handle ${testCase.name} configuration`, async () => {
          i18nEnvironment.setTestEnvironment(testCase.config);
          const localServices = {
            ...services,
            dateTimeService: ServiceMockFactory.createDateTimeServiceMock(testCase.config),
            config: ConfigMockFactory.createLocaleSpecificConfig(testCase.config.locale as keyof typeof TEST_LOCALES, {
              ai: { enabled: true, provider: 'openai' }
            })
          };

          const localTools = new Map();
          registerEnhancedTools(localTools, localServices);
          
          // Test initialization with locale-specific configuration
          const initTool = localTools.get('initialize_documentation_system')!;
          const initResult = await initTool({
            projectRoot: '/test/project',
            enableAI: true,
            timeZone: testCase.config.timezone
          });

          expect(initResult.success).toBe(true);
          
          // Test document lifecycle operations
          const updateTool = localTools.get('update_document_lifecycle')!;
          const updateResult = await updateTool({
            documentId: 'test-doc-id',
            newState: 'published',
            scheduledReview: new Date().toISOString()
          });

          expect(updateResult.success).toBe(true);
          expect(updateResult.updatedAt).toBeTruthy();
          
          // Test report generation with locale awareness
          const reportTool = localTools.get('generate_documentation_report')!;
          const reportResult = await reportTool({
            reportType: 'lifecycle',
            includeAI: true
          });

          expect(reportResult.success).toBe(true);
          expect(reportResult.generatedAt).toBeTruthy();
        });
      });
    });

    describe('Cross-timezone consistency', () => {
      test('should maintain consistent behavior across timezones', async () => {
        const timezones = ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London'];
        const results: any[] = [];

        for (const timezone of timezones) {
          const config = { ...TEST_LOCALES['en-US'], timezone };
          i18nEnvironment.setTestEnvironment(config);
          
          const localServices = {
            ...services,
            dateTimeService: ServiceMockFactory.createDateTimeServiceMock(config),
            config: ConfigMockFactory.createUltimateAutomationConfig({
              i18n: config,
              timeZone: timezone
            })
          };

          const localTools = new Map();
          registerEnhancedTools(localTools, localServices);

          const treeTool = localTools.get('get_document_tree')!;
          const result = await treeTool({});
          
          results.push({
            timezone,
            success: result.success,
            generatedAt: result.generatedAt,
            totalNodes: result.totalNodes
          });
        }

        // All should be successful
        results.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.generatedAt).toBeTruthy();
          expect(typeof result.totalNodes).toBe('number');
        });

        // All should have consistent structure (though timestamps may differ)
        const structures = results.map(r => ({ success: r.success, totalNodes: r.totalNodes }));
        const firstStructure = structures[0];
        structures.forEach(structure => {
          expect(structure.success).toBe(firstStructure.success);
          expect(structure.totalNodes).toBe(firstStructure.totalNodes);
        });
      });
    });

    describe('Error handling across locales', () => {
      test('should provide consistent error handling regardless of locale', async () => {
        const locales = ['en-US', 'ko-KR', 'ja-JP', 'de-DE'];
        
        for (const localeKey of locales) {
          const config = TEST_LOCALES[localeKey as keyof typeof TEST_LOCALES];
          i18nEnvironment.setTestEnvironment(config);
          
          const localServices = {
            ...services,
            dateTimeService: ServiceMockFactory.createDateTimeServiceMock(config),
            lifecycleService: {
              ...services.lifecycleService,
              updateDocumentState: jest.fn().mockRejectedValueOnce(new Error('Document not found'))
            }
          };

          const localTools = new Map();
          registerEnhancedTools(localTools, localServices);

          const updateTool = localTools.get('update_document_lifecycle')!;
          
          await expect(updateTool({
            documentId: 'non-existent-id',
            newState: 'published'
          })).rejects.toThrow('Document not found');
        }
      });

      test('should handle invalid timezone gracefully across different system locales', async () => {
        const locales = ['en-US', 'ko-KR', 'de-DE'];
        
        for (const localeKey of locales) {
          const config = { ...TEST_LOCALES[localeKey as keyof typeof TEST_LOCALES], timezone: 'Invalid/Timezone' };
          i18nEnvironment.setTestEnvironment(config);
          
          const localServices = {
            ...services,
            dateTimeService: ServiceMockFactory.createDateTimeServiceMock(config)
          };

          const localTools = new Map();
          registerEnhancedTools(localTools, localServices);

          const initTool = localTools.get('initialize_documentation_system')!;
          
          // Should handle invalid timezone gracefully
          const result = await initTool({
            projectRoot: '/test/project',
            timeZone: 'Invalid/Timezone'
          });

          // Should succeed with fallback timezone
          expect(result.success).toBe(true);
        }
      });
    });
  });
});