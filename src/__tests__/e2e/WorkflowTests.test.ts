/**
 * End-to-End Workflow Tests
 * 
 * Complete user workflow testing with real-world scenarios
 */

import { CastPlanUltimateAutomationServer } from '../../index.js';
import { TestFileSystem, TestEnvironment, PerformanceTestUtils, TestAssertions } from '../helpers/TestUtils.js';

// Mock external modules for E2E testing
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('winston');

describe('E2E Workflow Tests', () => {
  let server: CastPlanUltimateAutomationServer;
  let mockMCPServer: any;
  let mockTransport: any;
  let tempProjectPath: string;

  beforeEach(async () => {
    TestEnvironment.setupTestEnv();
    tempProjectPath = await TestFileSystem.createTestProject('e2e-workflow');
    
    process.env.CASTPLAN_PROJECT_ROOT = tempProjectPath;
    process.env.CASTPLAN_ENABLE_BMAD = 'true';
    process.env.CASTPLAN_ENABLE_DOCS = 'true';
    process.env.CASTPLAN_ENABLE_HOOKS = 'true';
    process.env.CASTPLAN_ENABLE_ENHANCED = 'true';

    // Setup mocks
    mockMCPServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined)
    };
    
    mockTransport = {
      start: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    };

    (require('@modelcontextprotocol/sdk/server/index.js').Server as jest.Mock)
      .mockImplementation(() => mockMCPServer);
    
    (require('@modelcontextprotocol/sdk/server/stdio.js').StdioServerTransport as jest.Mock)
      .mockImplementation(() => mockTransport);

    server = new CastPlanUltimateAutomationServer();
  });

  afterEach(async () => {
    TestEnvironment.restoreEnv();
    await TestFileSystem.cleanupTempDir();
    jest.clearAllMocks();
  });

  describe('Complete Development Workflow', () => {
    test('should handle full project development lifecycle', async () => {
      await server.start();

      // Get handlers for testing
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];
      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      // Step 1: Initialize enhanced documentation system
      const initResult = await callToolHandler({
        params: {
          name: 'initialize_documentation_system',
          arguments: {
            projectRoot: tempProjectPath,
            enableAI: true,
            timeZone: 'UTC' // Use UTC for consistent e2e testing
          }
        }
      });

      expect(initResult.content[0].text).toContain('Enhanced Documentation System Initialized');

      // Step 2: Parse project specification
      const specContent = `
# E2E Test Project

## Requirements
- User authentication system
- Dashboard with analytics
- API endpoints for data management
- Mobile-responsive design

## Technical Stack
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Testing: Jest and Playwright
      `;

      const parseResult = await callToolHandler({
        params: {
          name: 'bmad_parse_specification',
          arguments: {
            content: specContent,
            format: 'markdown',
            generateTasks: true,
            autoAssign: true
          }
        }
      });

      const parsedData = JSON.parse(parseResult.content[0].text);
      expect(parsedData.success).toBe(true);
      expect(parsedData.tasks).toBeDefined();
      expect(parsedData.agents).toBeDefined();

      // Step 3: Track development work
      const trackResult = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'frontend',
            workDescription: 'Implementing user authentication components',
            filePaths: [
              `${tempProjectPath}/src/components/Login.tsx`,
              `${tempProjectPath}/src/components/Register.tsx`,
              `${tempProjectPath}/src/hooks/useAuth.ts`
            ],
            expectedDocuments: ['Authentication Guide', 'Component Library']
          }
        }
      });

      const trackData = JSON.parse(trackResult.content[0].text);
      expect(trackData.success).toBe(true);
      expect(trackData.connectionId).toBeDefined();

      // Step 4: Setup file watching for automation
      const watchResult = await callToolHandler({
        params: {
          name: 'hooks_start_watching',
          arguments: {
            patterns: ['**/*.tsx', '**/*.ts', '**/*.md']
          }
        }
      });

      const watchData = JSON.parse(watchResult.content[0].text);
      expect(watchData.success).toBe(true);

      // Step 5: Reference relevant documentation
      const docsResult = await callToolHandler({
        params: {
          name: 'docs_reference',
          arguments: {
            files: [`${tempProjectPath}/src/components/Login.tsx`],
            context: 'Implementing secure login component with form validation',
            category: 'frontend',
            workType: 'implement'
          }
        }
      });

      const docsData = JSON.parse(docsResult.content[0].text);
      expect(docsData.relevantDocs).toBeDefined();
      expect(docsData.recommendations).toBeDefined();

      // Step 6: Update task status
      const updateResult = await callToolHandler({
        params: {
          name: 'bmad_update_task_status',
          arguments: {
            taskId: 'auth-task-1',
            status: 'in-progress'
          }
        }
      });

      const updateData = JSON.parse(updateResult.content[0].text);
      expect(updateData.success).toBe(true);

      // Step 7: Analyze document quality
      const qualityResult = await callToolHandler({
        params: {
          name: 'analyze_document_quality',
          arguments: {
            documentPath: `${tempProjectPath}/docs/README.md`,
            includeAI: true,
            analysisTypes: ['quality', 'completeness']
          }
        }
      });

      const qualityData = JSON.parse(qualityResult.content[0].text);
      expect(qualityData.success).toBe(true);
      expect(qualityData.basicMetrics).toBeDefined();

      // Step 8: Generate comprehensive report
      const reportResult = await callToolHandler({
        params: {
          name: 'generate_documentation_report',
          arguments: {
            reportType: 'comprehensive',
            includeAI: true
          }
        }
      });

      const reportData = JSON.parse(reportResult.content[0].text);
      expect(reportData.success).toBe(true);
      expect(reportData.report).toBeDefined();

      // Step 9: Check system status
      const statusResult = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });

      const status = JSON.parse(statusResult.contents[0].text);
      expect(status.health.status).toBeDefined();
      expect(status.bmad.active).toBe(true);
      expect(status.documentation.active).toBe(true);
      expect(status.hooks.active).toBe(true);
      expect(status.enhanced.active).toBe(true);
    });

    test('should handle multi-team collaboration workflow', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Frontend team work
      const frontendWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'frontend',
            workDescription: 'Building responsive dashboard components',
            filePaths: [
              `${tempProjectPath}/src/components/Dashboard.tsx`,
              `${tempProjectPath}/src/components/Chart.tsx`,
              `${tempProjectPath}/src/styles/dashboard.scss`
            ]
          }
        }
      });

      // Backend team work
      const backendWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'backend',
            workDescription: 'Implementing analytics API endpoints',
            filePaths: [
              `${tempProjectPath}/api/analytics.ts`,
              `${tempProjectPath}/api/dashboard.ts`,
              `${tempProjectPath}/models/Analytics.ts`
            ]
          }
        }
      });

      // Database team work
      const databaseWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'database',
            workDescription: 'Setting up analytics tables and indexes',
            filePaths: [
              `${tempProjectPath}/migrations/001_analytics_tables.sql`,
              `${tempProjectPath}/migrations/002_analytics_indexes.sql`
            ]
          }
        }
      });

      // Verify all teams' work is tracked
      expect(JSON.parse(frontendWork.content[0].text).success).toBe(true);
      expect(JSON.parse(backendWork.content[0].text).success).toBe(true);
      expect(JSON.parse(databaseWork.content[0].text).success).toBe(true);

      // Generate team collaboration report
      const collaborationReport = await callToolHandler({
        params: {
          name: 'generate_documentation_report',
          arguments: {
            reportType: 'connections',
            includeAI: true
          }
        }
      });

      expect(JSON.parse(collaborationReport.content[0].text).success).toBe(true);
    });
  });

  describe('CI/CD Integration Workflow', () => {
    test('should handle automated deployment workflow', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Setup Git hooks for CI/CD
      const gitSetupResult = await callToolHandler({
        params: {
          name: 'hooks_setup_git',
          arguments: {}
        }
      });

      expect(JSON.parse(gitSetupResult.content[0].text).success).toBe(true);

      // Simulate pre-deployment hook
      const preDeployResult = await callToolHandler({
        params: {
          name: 'hooks_trigger',
          arguments: {
            eventType: 'pre-work',
            data: {
              workType: 'deployment',
              environment: 'production',
              branch: 'main',
              commitHash: 'abc123def456'
            }
          }
        }
      });

      const preDeployData = JSON.parse(preDeployResult.content[0].text);
      expect(preDeployData.success).toBe(true);
      expect(preDeployData.triggeredActions).toContain('validation');

      // Update documentation after deployment
      const postDeployUpdate = await callToolHandler({
        params: {
          name: 'docs_update',
          arguments: {
            files: [
              `${tempProjectPath}/docs/deployment.md`,
              `${tempProjectPath}/docs/api.md`
            ],
            context: 'Updated documentation after production deployment',
            category: 'deployment'
          }
        }
      });

      expect(JSON.parse(postDeployUpdate.content[0].text).success).toBe(true);

      // Trigger post-deployment validation
      const postDeployResult = await callToolHandler({
        params: {
          name: 'hooks_trigger',
          arguments: {
            eventType: 'post-work',
            data: {
              workType: 'deployment',
              environment: 'production',
              status: 'success',
              deploymentTime: new Date().toISOString()
            }
          }
        }
      });

      expect(JSON.parse(postDeployResult.content[0].text).success).toBe(true);
    });

    test('should handle test automation workflow', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Track test development work
      const testWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'testing',
            workDescription: 'Implementing comprehensive E2E test suite',
            filePaths: [
              `${tempProjectPath}/tests/e2e/login.spec.ts`,
              `${tempProjectPath}/tests/e2e/dashboard.spec.ts`,
              `${tempProjectPath}/tests/e2e/api.spec.ts`
            ],
            expectedDocuments: ['Test Plan', 'Testing Guidelines']
          }
        }
      });

      expect(JSON.parse(testWork.content[0].text).success).toBe(true);

      // Validate test documentation
      const testDocsValidation = await callToolHandler({
        params: {
          name: 'docs_validate',
          arguments: {}
        }
      });

      const validationData = JSON.parse(testDocsValidation.content[0].text);
      expect(validationData.isValid).toBeDefined();
      expect(validationData.recommendations).toBeDefined();

      // Search for testing best practices
      const testingDocs = await callToolHandler({
        params: {
          name: 'docs_search',
          arguments: {
            query: 'testing best practices E2E Playwright'
          }
        }
      });

      const searchData = JSON.parse(testingDocs.content[0].text);
      expect(searchData.results).toBeDefined();
      expect(searchData.query).toContain('testing');
    });
  });

  describe('Performance Monitoring Workflow', () => {
    test('should handle performance monitoring and optimization', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Track performance optimization work
      const perfWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'frontend',
            workDescription: 'Optimizing component rendering performance',
            filePaths: [
              `${tempProjectPath}/src/components/OptimizedTable.tsx`,
              `${tempProjectPath}/src/hooks/useVirtualization.ts`,
              `${tempProjectPath}/src/utils/performance.ts`
            ]
          }
        }
      });

      expect(JSON.parse(perfWork.content[0].text).success).toBe(true);

      // Generate performance report
      const perfReport = await callToolHandler({
        params: {
          name: 'generate_documentation_report',
          arguments: {
            reportType: 'quality',
            includeAI: true,
            timeRange: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-01-31T23:59:59.999Z'
            }
          }
        }
      });

      expect(JSON.parse(perfReport.content[0].text).success).toBe(true);

      // Update lifecycle state after optimization
      const lifecycleUpdate = await callToolHandler({
        params: {
          name: 'update_document_lifecycle',
          arguments: {
            documentId: 'perf-doc-1',
            newState: 'published',
            reviewComment: 'Performance optimization documentation completed'
          }
        }
      });

      expect(JSON.parse(lifecycleUpdate.content[0].text).success).toBe(true);
    });

    test('should monitor system health during operations', async () => {
      await server.start();

      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];
      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Perform multiple operations to generate activity
      const operations = [
        () => callToolHandler({
          params: {
            name: 'bmad_parse_specification',
            arguments: {
              content: '# Test Spec\n\n## Requirements\n- Feature 1',
              format: 'markdown'
            }
          }
        }),
        () => callToolHandler({
          params: {
            name: 'docs_search',
            arguments: { query: 'health monitoring' }
          }
        }),
        () => callToolHandler({
          params: {
            name: 'get_document_tree',
            arguments: {}
          }
        })
      ];

      // Execute operations concurrently
      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(operations.map(op => op()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, 'Concurrent health monitoring operations');

      // Check system health after operations
      const healthResult = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });

      const health = JSON.parse(healthResult.contents[0].text);
      expect(health.health.status).toBe('healthy');
      expect(health.health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery Workflow', () => {
    test('should handle service degradation gracefully', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Simulate service with degraded functionality
      process.env.CASTPLAN_ENABLE_AI = 'false'; // Disable AI

      // Operations should continue working without AI
      const docQuality = await callToolHandler({
        params: {
          name: 'analyze_document_quality',
          arguments: {
            documentPath: `${tempProjectPath}/docs/README.md`,
            includeAI: false,
            analysisTypes: ['quality']
          }
        }
      });

      const qualityData = JSON.parse(docQuality.content[0].text);
      expect(qualityData.success).toBe(true);
      expect(qualityData.basicMetrics).toBeDefined();

      // Core functionality should remain available
      const trackResult = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'frontend',
            workDescription: 'Testing degraded mode',
            filePaths: [`${tempProjectPath}/src/test.ts`]
          }
        }
      });

      expect(JSON.parse(trackResult.content[0].text).success).toBe(true);
    });

    test('should recover from temporary failures', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Simulate temporary failures and recovery
      let attempts = 0;
      const retryOperation = async (maxRetries: number = 3) => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            attempts++;
            
            // Simulate failure for first 2 attempts
            if (attempts <= 2) {
              throw new Error('Temporary service unavailable');
            }

            return await callToolHandler({
              params: {
                name: 'docs_validate',
                arguments: {}
              }
            });
          } catch (error) {
            if (i === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          }
        }
      };

      const result = await retryOperation();
      
      expect(result).toBeDefined();
      expect(attempts).toBe(3); // 2 failures + 1 success
    });
  });

  describe('Real-world Usage Patterns', () => {
    test('should handle typical daily developer workflow', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Morning: Start new feature development
      const morningStart = await callToolHandler({
        params: {
          name: 'hooks_trigger',
          arguments: {
            eventType: 'session-start',
            data: {
              sessionId: 'daily-session-1',
              developer: 'test-dev',
              workFocus: 'user-profile-feature'
            }
          }
        }
      });

      expect(JSON.parse(morningStart.content[0].text).success).toBe(true);

      // Mid-morning: Track feature work
      const featureWork = await callToolHandler({
        params: {
          name: 'track_document_work',
          arguments: {
            workType: 'frontend',
            workDescription: 'Implementing user profile editing functionality',
            filePaths: [
              `${tempProjectPath}/src/components/UserProfile.tsx`,
              `${tempProjectPath}/src/hooks/useProfile.ts`,
              `${tempProjectPath}/src/api/profile.ts`
            ]
          }
        }
      });

      expect(JSON.parse(featureWork.content[0].text).success).toBe(true);

      // Lunch: Update task status
      const taskUpdate = await callToolHandler({
        params: {
          name: 'bmad_update_task_status',
          arguments: {
            taskId: 'profile-feature-task',
            status: 'in-progress'
          }
        }
      });

      expect(JSON.parse(taskUpdate.content[0].text).success).toBe(true);

      // Afternoon: Reference documentation
      const docReference = await callToolHandler({
        params: {
          name: 'docs_reference',
          arguments: {
            files: [`${tempProjectPath}/src/components/UserProfile.tsx`],
            context: 'Need patterns for form validation and state management',
            workType: 'implement'
          }
        }
      });

      expect(JSON.parse(docReference.content[0].text).relevantDocs).toBeDefined();

      // End of day: Complete task and update documentation
      const taskComplete = await callToolHandler({
        params: {
          name: 'bmad_update_task_status',
          arguments: {
            taskId: 'profile-feature-task',
            status: 'completed'
          }
        }
      });

      const docUpdate = await callToolHandler({
        params: {
          name: 'docs_update',
          arguments: {
            files: [`${tempProjectPath}/docs/user-profile.md`],
            context: 'Completed user profile feature implementation with validation'
          }
        }
      });

      // End session
      const sessionEnd = await callToolHandler({
        params: {
          name: 'hooks_trigger',
          arguments: {
            eventType: 'session-end',
            data: {
              sessionId: 'daily-session-1',
              tasksCompleted: 1,
              documentsUpdated: 1
            }
          }
        }
      });

      expect(JSON.parse(taskComplete.content[0].text).success).toBe(true);
      expect(JSON.parse(docUpdate.content[0].text).success).toBe(true);
      expect(JSON.parse(sessionEnd.content[0].text).success).toBe(true);
    });

    test('should handle code review and documentation workflow', async () => {
      await server.start();

      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      // Create comprehensive workflow for code review process
      const reviewWorkflow = [
        // 1. Analyze document quality for review
        {
          name: 'analyze_document_quality',
          arguments: {
            documentPath: `${tempProjectPath}/docs/README.md`,
            includeAI: true,
            analysisTypes: ['quality', 'duplicate', 'completeness']
          }
        },
        // 2. Update document lifecycle for review
        {
          name: 'update_document_lifecycle',
          arguments: {
            documentId: 'review-doc-1',
            newState: 'review',
            reviewComment: 'Ready for peer review',
            scheduledReview: '2025-02-15T10:00:00.000Z'
          }
        },
        // 3. Get current document tree
        {
          name: 'get_document_tree',
          arguments: {
            includeMetadata: true,
            maxDepth: 5
          }
        },
        // 4. Generate quality report
        {
          name: 'generate_documentation_report',
          arguments: {
            reportType: 'quality',
            includeAI: true
          }
        }
      ];

      // Execute workflow steps
      for (const step of reviewWorkflow) {
        const result = await callToolHandler({
          params: step
        });

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
      }
    });
  });
});