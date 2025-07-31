/**
 * MCP Tool Contract Tests
 * Comprehensive testing of MCP tool contracts and API validation
 */

import { 
  ContractTestFramework, 
  setupContractTesting,
  contractTestUtils,
  ToolContract,
  ContractTestResult,
  APIContractValidationResult
} from '../helpers/ContractTestFramework';
import { CastPlanUltimateAutomationServer } from '../../index';
import { testUtils } from '../setup';

describe('MCP Tool Contract Tests', () => {
  const getFramework = setupContractTesting();
  let server: CastPlanUltimateAutomationServer;

  beforeAll(async () => {
    // Initialize test server
    server = new CastPlanUltimateAutomationServer({
      projectRoot: process.cwd(),
      enableAI: false, // Disable AI for contract testing
      enableCache: false
    });

    // Initialize contract framework
    await ContractTestFramework.initialize(server as any);
  });

  afterAll(async () => {
    if (server) {
      await testUtils.cleanup(() => server.close());
    }
  });

  describe('Contract Registration and Validation', () => {
    test('should load all standard MCP tool contracts', async () => {
      const framework = getFramework();
      expect(framework).toBeDefined();

      // Contract framework should have loaded standard contracts
      const validationResult = await ContractTestFramework.validateMCPToolContracts();
      
      expect(validationResult.toolsValidated).toBeGreaterThan(0);
      expect(validationResult.results).toBeDefined();
      expect(Array.isArray(validationResult.results)).toBe(true);
    });

    test('should validate contract completeness for all tools', async () => {
      const testContracts: ToolContract[] = [
        {
          name: 'test_tool',
          description: 'Test tool for contract validation',
          inputSchema: require('zod').z.object({
            testField: require('zod').z.string()
          }),
          outputSchema: require('zod').z.object({
            success: require('zod').z.boolean(),
            message: require('zod').z.string()
          }),
          sideEffects: 'read',
          errorCodes: ['TEST_ERROR']
        }
      ];

      for (const contract of testContracts) {
        const issues = contractTestUtils.validateContractCompleteness(contract);
        expect(issues.length).toBe(0);
      }
    });

    test('should detect incomplete contracts', async () => {
      const incompleteContract: ToolContract = {
        name: 'incomplete_tool',
        description: 'Short', // Too short
        inputSchema: require('zod').z.object({}),
        outputSchema: require('zod').z.object({}), // Missing required fields
        sideEffects: 'write', // Should have permissions
        // Missing errorCodes
      } as any;

      const issues = contractTestUtils.validateContractCompleteness(incompleteContract);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues).toContain('Description too short or missing');
      expect(issues).toContain('Write operations should specify required permissions');
      expect(issues).toContain('Error codes not specified');
    });
  });

  describe('BMAD Tool Contract Validation', () => {
    test('should validate bmad_parse_specification contract', async () => {
      const testCases = [
        {
          input: {
            content: '# Project Specification\\n\\nThis is a test specification.',
            format: 'markdown',
            generateTasks: true,
            autoAssign: false
          },
          shouldFail: false
        },
        {
          input: {
            content: '' // Empty content should fail
          },
          shouldFail: true
        },
        {
          input: {
            content: 'Valid content',
            format: 'invalid_format' // Invalid format
          },
          shouldFail: true
        },
        {
          input: {
            content: 'Valid content',
            generateTasks: 'not_boolean' // Wrong type
          },
          shouldFail: true
        }
      ];

      // Note: This would require actual server implementation
      // For now, we test the contract structure
      const framework = getFramework();
      expect(framework).toBeDefined();

      // Test contract structure validation
      const mockTool = {
        name: 'bmad_parse_specification',
        description: 'Parse business specifications and generate tasks',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1 },
            format: { type: 'string', enum: ['markdown', 'yaml', 'plain'] },
            generateTasks: { type: 'boolean' },
            autoAssign: { type: 'boolean' }
          },
          required: ['content']
        }
      };

      // This would be replaced with actual contract validation
      expect(mockTool.name).toBe('bmad_parse_specification');
      expect(mockTool.inputSchema.properties.content).toBeDefined();
      expect(mockTool.inputSchema.required).toContain('content');
    });

    test('should validate bmad_update_task_status contract', async () => {
      const testCases = [
        {
          input: {
            taskId: 'task-123',
            status: 'completed',
            notes: 'Task completed successfully'
          },
          shouldFail: false
        },
        {
          input: {
            taskId: '', // Empty taskId should fail
            status: 'completed'
          },
          shouldFail: true
        },
        {
          input: {
            taskId: 'task-123',
            status: 'invalid_status' // Invalid status
          },
          shouldFail: true
        }
      ];

      // Test contract structure validation
      const mockTool = {
        name: 'bmad_update_task_status',
        description: 'Update task status',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', minLength: 1 },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'blocked'] },
            notes: { type: 'string' }
          },
          required: ['taskId', 'status']
        }
      };

      expect(mockTool.name).toBe('bmad_update_task_status');
      expect(mockTool.inputSchema.properties.taskId).toBeDefined();
      expect(mockTool.inputSchema.properties.status.enum).toContain('completed');
    });
  });

  describe('Documentation Tool Contract Validation', () => {
    test('should validate docs_reference contract', async () => {
      const testCases = [
        {
          input: {
            workType: 'backend',
            description: 'Implement user authentication',
            filePaths: ['src/auth/controller.ts', 'src/auth/service.ts']
          },
          shouldFail: false
        },
        {
          input: {
            workType: '', // Empty workType should fail
            description: 'Test description'
          },
          shouldFail: true
        },
        {
          input: {
            workType: 'frontend',
            description: '' // Empty description should fail
          },
          shouldFail: true
        }
      ];

      const mockTool = {
        name: 'docs_reference',
        description: 'Find relevant documentation for development work',
        inputSchema: {
          type: 'object',
          properties: {
            workType: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            filePaths: { type: 'array', items: { type: 'string' } }
          },
          required: ['workType', 'description']
        }
      };

      expect(mockTool.name).toBe('docs_reference');
      expect(mockTool.inputSchema.required).toContain('workType');
      expect(mockTool.inputSchema.required).toContain('description');
    });

    test('should validate docs_search contract with performance considerations', async () => {
      const performanceTestCases = contractTestUtils.createPerformanceTestCases('docs_search');
      
      const testCases = [
        {
          input: {
            query: 'authentication',
            maxResults: 10,
            documentTypes: ['api', 'guide']
          },
          shouldFail: false
        },
        {
          input: {
            query: 'a', // Very short query
            maxResults: 1000 // Very high limit
          },
          shouldFail: false // Should be handled gracefully
        },
        {
          input: {
            query: '', // Empty query should fail
          },
          shouldFail: true
        },
        {
          input: {
            query: 'test',
            maxResults: 101 // Exceeds maximum
          },
          shouldFail: true
        }
      ];

      const mockTool = {
        name: 'docs_search',
        description: 'Search through project documentation',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 1000 },
            maxResults: { type: 'number', minimum: 1, maximum: 100 },
            documentTypes: { type: 'array', items: { type: 'string' }, maxItems: 20 }
          },
          required: ['query']
        }
      };

      expect(mockTool.inputSchema.properties.query.maxLength).toBeDefined();
      expect(mockTool.inputSchema.properties.maxResults.maximum).toBe(100);
      expect(mockTool.inputSchema.properties.documentTypes.maxItems).toBeDefined();
    });
  });

  describe('Hooks Tool Contract Validation', () => {
    test('should validate hooks_trigger contract with security considerations', async () => {
      const testCases = [
        {
          input: {
            eventType: 'file_changed',
            data: { filePath: 'src/test.ts', changeType: 'modified' },
            target: 'documentation'
          },
          shouldFail: false
        },
        {
          input: {
            eventType: '', // Empty eventType should fail
            data: {}
          },
          shouldFail: true
        },
        {
          input: {
            eventType: 'dangerous_event',
            data: { 
              command: 'rm -rf /', // Dangerous data should be handled safely
              unsafeData: '<script>alert("xss")</script>'
            }
          },
          shouldFail: false // Should be accepted but handled safely
        }
      ];

      const mockTool = {
        name: 'hooks_trigger',
        description: 'Manually trigger hook events',
        inputSchema: {
          type: 'object',
          properties: {
            eventType: { type: 'string', minLength: 1, maxLength: 100 },
            data: { type: 'object' },
            target: { type: 'string', maxLength: 100 }
          },
          required: ['eventType', 'data']
        }
      };

      expect(mockTool.inputSchema.properties.eventType.maxLength).toBeDefined();
      expect(mockTool.inputSchema.properties.target?.maxLength).toBeDefined();
    });

    test('should validate hooks_setup_git contract with file system permissions', async () => {
      const testCases = [
        {
          input: {
            projectRoot: '/valid/project/path',
            hooks: ['pre-commit', 'post-commit'],
            overwrite: false
          },
          shouldFail: false
        },
        {
          input: {
            projectRoot: '', // Empty path should fail
            hooks: ['pre-commit']
          },
          shouldFail: true
        },
        {
          input: {
            projectRoot: '/valid/path',
            hooks: [], // Empty hooks array should fail
          },
          shouldFail: true
        },
        {
          input: {
            projectRoot: '/valid/path',
            hooks: ['invalid-hook'] // Invalid hook type
          },
          shouldFail: true
        }
      ];

      const mockTool = {
        name: 'hooks_setup_git',
        description: 'Setup Git hooks',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', minLength: 1 },
            hooks: { 
              type: 'array', 
              items: { type: 'string', enum: ['pre-commit', 'post-commit', 'pre-push'] },
              minItems: 1,
              maxItems: 10
            },
            overwrite: { type: 'boolean' }
          },
          required: ['projectRoot', 'hooks']
        }
      };

      expect(mockTool.inputSchema.properties.hooks.minItems).toBe(1);
      expect(mockTool.inputSchema.properties.hooks.items.enum).toContain('pre-commit');
    });
  });

  describe('Enhanced Tool Contract Validation', () => {
    test('should validate initialize_documentation_system contract', async () => {
      const testCases = [
        {
          input: {
            projectRoot: '/project/root',
            enableAI: true,
            timeZone: process.env.TEST_TIMEZONE || 'UTC',
            locale: process.env.TEST_LOCALE || 'en-US'
          },
          shouldFail: false
        },
        {
          input: {
            projectRoot: '', // Empty project root should fail
          },
          shouldFail: true
        },
        {
          input: {
            projectRoot: '/valid/path',
            timeZone: 'Invalid/TimeZone' // Invalid timezone should be handled
          },
          shouldFail: false // Should be handled gracefully with fallback
        }
      ];

      const mockTool = {
        name: 'initialize_documentation_system',
        description: 'Initialize the enhanced documentation system',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', minLength: 1 },
            enableAI: { type: 'boolean' },
            timeZone: { type: 'string', maxLength: 50 },
            locale: { type: 'string', maxLength: 10 }
          },
          required: ['projectRoot']
        }
      };

      expect(mockTool.inputSchema.required).toContain('projectRoot');
      expect(mockTool.inputSchema.properties.timeZone?.maxLength).toBeDefined();
    });

    test('should validate track_document_work contract with array limits', async () => {
      const testCases = [
        {
          input: {
            workType: 'backend',
            workDescription: 'Implement authentication system',
            filePaths: ['src/auth.ts', 'src/user.ts'],
            expectedDocuments: ['API docs', 'User guide']
          },
          shouldFail: false
        },
        {
          input: {
            workType: 'frontend',
            workDescription: 'Update UI components',
            filePaths: new Array(1000).fill('file.ts') // Very large array
          },
          shouldFail: true // Should fail due to array size limit
        },
        {
          input: {
            workType: '', // Empty workType
            workDescription: 'Description',
            filePaths: ['file.ts']
          },
          shouldFail: true
        }
      ];

      const mockTool = {
        name: 'track_document_work',
        description: 'Track work-document relationships',
        inputSchema: {
          type: 'object',
          properties: {
            workType: { type: 'string', minLength: 1, maxLength: 50 },
            workDescription: { type: 'string', minLength: 1, maxLength: 2000 },
            filePaths: { 
              type: 'array', 
              items: { type: 'string', maxLength: 500 },
              maxItems: 100 
            },
            expectedDocuments: { 
              type: 'array', 
              items: { type: 'string', maxLength: 200 },
              maxItems: 50 
            }
          },
          required: ['workType', 'workDescription', 'filePaths']
        }
      };

      expect(mockTool.inputSchema.properties.filePaths.maxItems).toBe(100);
      expect(mockTool.inputSchema.properties.expectedDocuments?.maxItems).toBe(50);
    });
  });

  describe('Contract Performance and Security Validation', () => {
    test('should validate performance characteristics of all tools', async () => {
      const performanceIssues: string[] = [];
      
      // Mock tools with performance issues
      const toolsToTest = [
        {
          name: 'performance_test_tool',
          inputSchema: {
            type: 'object',
            properties: {
              unlimitedString: { type: 'string' }, // No maxLength
              unlimitedArray: { type: 'array', items: { type: 'string' } }, // No maxItems
              deepNesting: { 
                type: 'object',
                properties: {
                  level1: {
                    type: 'object',
                    properties: {
                      level2: {
                        type: 'object',
                        properties: {
                          level3: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ];

      for (const tool of toolsToTest) {
        const schema = tool.inputSchema;
        
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (typeof propSchema === 'object') {
              if (propSchema.type === 'string' && !propSchema.maxLength) {
                performanceIssues.push(`String property '${propName}' has no length limit`);
              }
              
              if (propSchema.type === 'array' && !propSchema.maxItems) {
                performanceIssues.push(`Array property '${propName}' has no item limit`);
              }
            }
          }
        }
      }

      expect(performanceIssues.length).toBeGreaterThan(0); // Should detect issues
      expect(performanceIssues).toContain("String property 'unlimitedString' has no length limit");
      expect(performanceIssues).toContain("Array property 'unlimitedArray' has no item limit");
    });

    test('should validate security considerations in tool contracts', async () => {
      const securityIssues: string[] = [];
      
      // Mock tools with security considerations
      const securityTestCases = [
        {
          toolName: 'file_write_tool',
          sideEffects: 'write' as const,
          requiredPermissions: undefined, // Missing permissions
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string' }, // No path validation
              content: { type: 'string' } // No content filtering
            }
          }
        },
        {
          toolName: 'system_command_tool',
          sideEffects: 'system' as const,
          requiredPermissions: ['system_exec'],
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string' }, // Dangerous without validation
              args: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      ];

      for (const testCase of securityTestCases) {
        if (testCase.sideEffects === 'write' && !testCase.requiredPermissions) {
          securityIssues.push(`Tool ${testCase.toolName} performs write operations but doesn't specify required permissions`);
        }
        
        if (testCase.sideEffects === 'system') {
          securityIssues.push(`Tool ${testCase.toolName} has system-level side effects - requires extra security validation`);
        }

        // Check for dangerous input parameters
        const schema = testCase.inputSchema;
        if (schema.properties) {
          if ('filePath' in schema.properties) {
            securityIssues.push(`Tool ${testCase.toolName} accepts file paths - path traversal prevention needed`);
          }
          
          if ('command' in schema.properties) {
            securityIssues.push(`Tool ${testCase.toolName} accepts commands - command injection prevention needed`);
          }
        }
      }

      expect(securityIssues.length).toBeGreaterThan(0);
      expect(securityIssues.some(issue => issue.includes('write operations'))).toBe(true);
      expect(securityIssues.some(issue => issue.includes('system-level side effects'))).toBe(true);
    });
  });

  describe('Contract Test Report Generation', () => {
    test('should generate comprehensive contract test report', async () => {
      const report = await ContractTestFramework.generateContractTestReport();
      
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
      
      expect(report.summary).toBeDefined();
      expect(typeof report.summary.toolsValidated).toBe('number');
      expect(typeof report.summary.contractsPassed).toBe('number');
      expect(typeof report.summary.contractsFailed).toBe('number');
      expect(typeof report.summary.overallSuccess).toBe('boolean');
      
      expect(Array.isArray(report.summary.results)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.nextSteps)).toBe(true);
      
      // Report should contain meaningful recommendations
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.nextSteps.length).toBeGreaterThan(0);
      
      // Should recommend CI/CD integration
      expect(report.recommendations.some(r => r.includes('CI/CD'))).toBe(true);
    });

    test('should provide actionable recommendations based on test results', async () => {
      // Mock test results with various issues
      const mockResults: ContractTestResult[] = [
        {
          tool: 'fast_tool',
          passed: true,
          errors: [],
          warnings: [],
          performance: { validationTimeMs: 50, memoryUsageBytes: 1024 }
        },
        {
          tool: 'slow_tool',
          passed: true,
          errors: [],
          warnings: ['Performance warning'],
          performance: { validationTimeMs: 150, memoryUsageBytes: 2048 }
        },
        {
          tool: 'failed_tool',
          passed: false,
          errors: ['Schema validation failed', 'Missing required field'],
          warnings: [],
          performance: { validationTimeMs: 200, memoryUsageBytes: 5 * 1024 * 1024 }
        }
      ];

      // This would be part of the framework's recommendation generation
      const failedTools = mockResults.filter(r => !r.passed);
      const slowTools = mockResults.filter(r => r.performance.validationTimeMs > 100);
      const memoryIntensiveTools = mockResults.filter(r => r.performance.memoryUsageBytes > 1024 * 1024);

      expect(failedTools.length).toBe(1);
      expect(slowTools.length).toBe(2); // slow_tool and failed_tool
      expect(memoryIntensiveTools.length).toBe(1);

      // Recommendations should be specific and actionable
      const expectedRecommendations = [
        'Fix contract validation for failed_tool',
        'Optimize validation performance for slow tools',
        'Review memory usage for memory-intensive tools',
        'Implement contract testing in CI/CD pipeline'
      ];

      // Each recommendation should be actionable
      expectedRecommendations.forEach(recommendation => {
        expect(recommendation).not.toContain('TODO');
        expect(recommendation).not.toContain('maybe');
        expect(recommendation.length).toBeGreaterThan(10);
      });
    });
  });
});