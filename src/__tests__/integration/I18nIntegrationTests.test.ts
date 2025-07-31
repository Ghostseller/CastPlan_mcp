/**
 * Internationalization Integration Tests
 * 
 * Tests the complete i18n functionality across the entire system,
 * ensuring proper locale/timezone handling in all services and tools.
 */

import { CastPlanUltimateAutomationServer } from '../../CastPlanUltimateAutomationServer.js';
import { ServiceMockFactory, ConfigMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, TestFileSystem, MockLoggerFactory } from '../helpers/TestUtils.js';
import { 
  I18nTestUtils, 
  I18nTestEnvironment, 
  TEST_LOCALES, 
  LocaleTestCaseGenerator,
  LocaleTestUtils,
  I18nTestAssertions
} from '../helpers/I18nTestUtils.js';
import type { I18nTestConfig, LocaleTestCase } from '../helpers/I18nTestUtils.js';

describe('I18n Integration Tests', () => {
  let server: CastPlanUltimateAutomationServer;
  let i18nEnvironment: I18nTestEnvironment;
  let tempProjectPath: string;

  beforeEach(async () => {
    i18nEnvironment = new I18nTestEnvironment();
    tempProjectPath = await TestFileSystem.createTestProject('i18n-integration-test');
  });

  afterEach(async () => {
    if (server) {
      await server.cleanup?.();
    }
    i18nEnvironment?.restoreEnvironment();
    await TestFileSystem.cleanupTempDir();
  });

  describe('Server Initialization with Different Locales', () => {
    const localeTestCases = LocaleTestCaseGenerator.generateLocaleTestCases({
      expectedFormats: {}
    }, ['en-US', 'ko-KR', 'ja-JP', 'de-DE', 'fr-FR']);

    localeTestCases.forEach(testCase => {
      test(`should initialize server with ${testCase.name}`, async () => {
        i18nEnvironment.setTestEnvironment(testCase.config);
        
        const config = ConfigMockFactory.createLocaleSpecificConfig(
          testCase.config.locale as keyof typeof TEST_LOCALES,
          {
            projectRoot: tempProjectPath,
            services: { 
              bmad: true, 
              documentation: true, 
              hooks: true, 
              enhanced: true 
            }
          }
        );

        server = new CastPlanUltimateAutomationServer(config);
        await server.initialize();

        expect(server).toBeDefined();
        expect(server.config.timeZone).toBe(testCase.config.timezone);
        expect(server.config.locale).toBe(testCase.config.locale);
      });
    });
  });

  describe('DateTime Service Locale Integration', () => {
    const multiTimezoneTestCases = LocaleTestCaseGenerator.generateTimezoneTestCases({
      expectedFormats: {}
    }, ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']);

    multiTimezoneTestCases.forEach(testCase => {
      test(`should handle date/time operations in ${testCase.name}`, async () => {
        i18nEnvironment.setTestEnvironment(testCase.config);
        
        const config = ConfigMockFactory.createUltimateAutomationConfig({
          projectRoot: tempProjectPath,
          i18n: testCase.config,
          timeZone: testCase.config.timezone,
          locale: testCase.config.locale
        });

        server = new CastPlanUltimateAutomationServer(config);
        await server.initialize();

        // Test datetime operations through tools
        const initArgs = {
          projectRoot: tempProjectPath,
          enableAI: false,
          timeZone: testCase.config.timezone
        };

        const toolHandler = server.getToolHandler('initialize_documentation_system');
        expect(toolHandler).toBeDefined();

        const result = await toolHandler!(initArgs);
        expect(result.success).toBe(true);
        expect(result.message).toContain(testCase.config.timezone);

        // Verify timestamp consistency
        const trackingArgs = {
          workType: 'frontend',
          workDescription: 'Test work for timezone validation',
          filePaths: [`${tempProjectPath}/test.ts`]
        };

        const trackHandler = server.getToolHandler('track_document_work');
        if (trackHandler) {
          const trackResult = await trackHandler(trackingArgs);
          expect(trackResult.success).toBe(true);
          expect(trackResult.timestamp).toBeTruthy();
          I18nTestAssertions.assertValidDateInTimezone(trackResult.timestamp, testCase.config.timezone);
        }
      });
    });
  });

  describe('Cross-Locale Content Processing', () => {
    test('should handle multilingual content processing', async () => {
      const testContent = {
        'en-US': 'Hello World - Testing Documentation',
        'ko-KR': '안녕하세요 - 문서화 테스트',
        'ja-JP': 'こんにちは - ドキュメンテーションテスト',
        'de-DE': 'Hallo Welt - Dokumentationstest',
        'fr-FR': 'Bonjour le Monde - Test de Documentation'
      };

      for (const [localeKey, content] of Object.entries(testContent)) {
        const config = TEST_LOCALES[localeKey as keyof typeof TEST_LOCALES];
        i18nEnvironment.setTestEnvironment(config);

        // Create locale-specific test file
        const testFileName = `test-${localeKey}.md`;
        await TestFileSystem.createTempFile(
          tempProjectPath,
          testFileName,
          `# ${content}\n\nThis is a test document for ${localeKey} locale.\n\n## Features\n- Internationalization\n- Locale-specific formatting`
        );

        const serverConfig = ConfigMockFactory.createLocaleSpecificConfig(
          localeKey as keyof typeof TEST_LOCALES,
          { projectRoot: tempProjectPath }
        );

        server = new CastPlanUltimateAutomationServer(serverConfig);
        await server.initialize();

        // Test document quality analysis with locale-specific content
        const analyzeHandler = server.getToolHandler('analyze_document_quality');
        if (analyzeHandler) {
          const analyzeResult = await analyzeHandler({
            documentPath: `${tempProjectPath}/${testFileName}`,
            includeAI: false,
            analysisTypes: ['quality']
          });

          expect(analyzeResult.success).toBe(true);
          expect(analyzeResult.basicMetrics).toBeDefined();
          expect(Array.isArray(analyzeResult.basicMetrics)).toBe(true);
          
          // Verify content is processed correctly regardless of locale
          const hasContentMetrics = analyzeResult.basicMetrics.some((metric: string) => 
            metric.includes('Lines') || metric.includes('Words') || metric.includes('File Size')
          );
          expect(hasContentMetrics).toBe(true);
        }

        await server.cleanup?.();
      }
    });
  });

  describe('Timezone Boundary Testing', () => {
    test('should handle timezone transitions correctly', async () => {
      // Test dates that cross timezone boundaries
      const boundaryTestCases = [
        {
          utcTime: '2024-12-31T23:30:00.000Z', // New Year's Eve
          description: 'New Year boundary'
        },
        {
          utcTime: '2024-03-10T07:00:00.000Z', // DST transition in US
          description: 'DST spring forward'
        },
        {
          utcTime: '2024-11-03T06:00:00.000Z', // DST transition end in US
          description: 'DST fall back'
        },
        {
          utcTime: '2024-06-21T12:00:00.000Z', // Summer solstice
          description: 'Summer solstice'
        }
      ];

      const timezones = ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London', 'Australia/Sydney'];

      for (const testCase of boundaryTestCases) {
        for (const timezone of timezones) {
          const config = { ...TEST_LOCALES['en-US'], timezone };
          i18nEnvironment.setTestEnvironment(config);

          const serverConfig = ConfigMockFactory.createUltimateAutomationConfig({
            projectRoot: tempProjectPath,
            i18n: config,
            timeZone: timezone
          });

          server = new CastPlanUltimateAutomationServer(serverConfig);
          await server.initialize();

          // Test document lifecycle with timezone-specific timestamps
          const updateHandler = server.getToolHandler('update_document_lifecycle');
          if (updateHandler) {
            const updateResult = await updateHandler({
              documentId: 'test-doc',
              newState: 'published',
              reviewComment: `${testCase.description} test in ${timezone}`,
              scheduledReview: testCase.utcTime
            });

            expect(updateResult.success).toBe(true);
            expect(updateResult.updatedAt).toBeTruthy();
            expect(updateResult.scheduledReview).toBeTruthy();
            
            // Verify timezone handling
            I18nTestAssertions.assertValidDateInTimezone(updateResult.updatedAt, timezone);
            if (updateResult.scheduledReview) {
              I18nTestAssertions.assertValidDateInTimezone(updateResult.scheduledReview, timezone);
            }
          }

          await server.cleanup?.();
        }
      }
    });
  });

  describe('Locale-Specific Report Generation', () => {
    const reportLocales = ['en-US', 'ko-KR', 'ja-JP', 'de-DE'] as const;

    reportLocales.forEach(localeKey => {
      test(`should generate reports with ${localeKey} formatting`, async () => {
        const config = TEST_LOCALES[localeKey];
        i18nEnvironment.setTestEnvironment(config);

        const serverConfig = ConfigMockFactory.createLocaleSpecificConfig(localeKey, {
          projectRoot: tempProjectPath
        });

        server = new CastPlanUltimateAutomationServer(serverConfig);
        await server.initialize();

        // Generate different types of reports
        const reportTypes = ['lifecycle', 'quality', 'connections', 'comprehensive'] as const;

        for (const reportType of reportTypes) {
          const reportHandler = server.getToolHandler('generate_documentation_report');
          if (reportHandler) {
            const reportResult = await reportHandler({
              reportType,
              timeRange: {
                start: '2024-01-01T00:00:00.000Z',
                end: '2024-12-31T23:59:59.999Z'
              },
              includeAI: false
            });

            expect(reportResult.success).toBe(true);
            expect(reportResult.reportType).toBe(reportType);
            expect(reportResult.report).toBeDefined();
            expect(reportResult.generatedAt).toBeTruthy();

            // Verify timestamp formatting
            I18nTestAssertions.assertValidDateInTimezone(reportResult.generatedAt, config.timezone);

            // Verify report structure remains consistent across locales
            expect(reportResult.report.title).toBeTruthy();
            expect(typeof reportResult.report.title).toBe('string');
            
            if (reportResult.report.period) {
              expect(reportResult.report.period.start).toBeTruthy();
              expect(reportResult.report.period.end).toBeTruthy();
            }
          }
        }
      });
    });
  });

  describe('Performance Across Locales', () => {
    test('should maintain performance consistency across different locales', async () => {
      const locales = ['en-US', 'ko-KR', 'ja-JP', 'de-DE'] as const;
      const performanceResults: { locale: string; duration: number }[] = [];

      for (const localeKey of locales) {
        const config = TEST_LOCALES[localeKey];
        i18nEnvironment.setTestEnvironment(config);

        const serverConfig = ConfigMockFactory.createLocaleSpecificConfig(localeKey, {
          projectRoot: tempProjectPath
        });

        const startTime = Date.now();
        
        server = new CastPlanUltimateAutomationServer(serverConfig);
        await server.initialize();

        // Perform typical operations
        const initHandler = server.getToolHandler('initialize_documentation_system');
        if (initHandler) {
          await initHandler({
            projectRoot: tempProjectPath,
            enableAI: false,
            timeZone: config.timezone
          });
        }

        const treeHandler = server.getToolHandler('get_document_tree');
        if (treeHandler) {
          await treeHandler({});
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        performanceResults.push({ locale: localeKey, duration });

        await server.cleanup?.();
      }

      // Verify performance is consistent across locales (within 50% variance)
      const durations = performanceResults.map(r => r.duration);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxVariance = avgDuration * 0.5; // 50% variance threshold

      performanceResults.forEach(result => {
        const variance = Math.abs(result.duration - avgDuration);
        expect(variance).toBeLessThan(maxVariance);
      });

      // All operations should complete within reasonable time (10 seconds)
      performanceResults.forEach(result => {
        expect(result.duration).toBeLessThan(10000);
      });
    });
  });

  describe('Error Handling Internationalization', () => {
    test('should provide consistent error handling across locales', async () => {
      const locales = ['en-US', 'ko-KR', 'ja-JP', 'de-DE'] as const;
      const errorScenarios = [
        {
          name: 'invalid timezone',
          args: { projectRoot: tempProjectPath, timeZone: 'Invalid/Timezone' },
          shouldSucceedWithFallback: true
        },
        {
          name: 'missing project root',
          args: { enableAI: true },
          shouldSucceedWithFallback: false
        },
        {
          name: 'invalid document path',
          handler: 'analyze_document_quality',
          args: { documentPath: '/non/existent/path.md' },
          shouldSucceedWithFallback: false
        }
      ];

      for (const localeKey of locales) {
        const config = TEST_LOCALES[localeKey];
        i18nEnvironment.setTestEnvironment(config);

        const serverConfig = ConfigMockFactory.createLocaleSpecificConfig(localeKey, {
          projectRoot: tempProjectPath
        });

        server = new CastPlanUltimateAutomationServer(serverConfig);
        await server.initialize();

        for (const scenario of errorScenarios) {
          const handlerName = scenario.handler || 'initialize_documentation_system';
          const handler = server.getToolHandler(handlerName);
          
          if (handler) {
            if (scenario.shouldSucceedWithFallback) {
              const result = await handler(scenario.args);
              expect(result.success).toBe(true); // Should succeed with fallback
            } else {
              await expect(handler(scenario.args)).rejects.toThrow();
            }
          }
        }

        await server.cleanup?.();
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain backward compatibility with Korean locale defaults', async () => {
      // Test that the system still works with legacy Korean configuration
      const legacyConfig = ConfigMockFactory.createUltimateAutomationConfig({
        projectRoot: tempProjectPath,
        timeZone: 'Asia/Seoul',
        locale: 'ko-KR',
        // Legacy format without i18n object
        services: { enhanced: true }
      });

      server = new CastPlanUltimateAutomationServer(legacyConfig);
      await server.initialize();

      expect(server.config.timeZone).toBe('Asia/Seoul');
      expect(server.config.locale).toBe('ko-KR');

      // Should still work with new i18n configuration
      if (server.config.i18n) {
        expect(server.config.i18n.timezone).toBe('Asia/Seoul');
        expect(server.config.i18n.locale).toBe('ko-KR');
      }

      // Basic operations should work
      const initHandler = server.getToolHandler('initialize_documentation_system');
      if (initHandler) {
        const result = await initHandler({
          projectRoot: tempProjectPath,
          enableAI: false
        });
        expect(result.success).toBe(true);
      }
    });
  });
});