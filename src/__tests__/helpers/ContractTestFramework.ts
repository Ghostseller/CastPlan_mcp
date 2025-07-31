/**
 * Contract Testing Framework for MCP Tools
 * Validates MCP tool interfaces, schemas, and API contracts
 */

import { z } from 'zod';
import { MCPServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolContract {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  requiredPermissions?: string[];
  sideEffects?: 'none' | 'read' | 'write' | 'system';
  errorCodes?: string[];
}

export interface ContractTestResult {
  tool: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    validationTimeMs: number;
    memoryUsageBytes: number;
  };
}

export interface APIContractValidationResult {
  toolsValidated: number;
  contractsPassed: number;
  contractsFailed: number;
  overallSuccess: boolean;
  results: ContractTestResult[];
  summary: {
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  };
}

export class ContractTestFramework {
  private static toolContracts: Map<string, ToolContract> = new Map();
  private static mcpServer: MCPServer | null = null;

  /**
   * Initialize the contract testing framework
   */
  static async initialize(server: MCPServer): Promise<void> {
    this.mcpServer = server;
    await this.loadStandardContracts();
  }

  /**
   * Register a tool contract for validation
   */
  static registerContract(contract: ToolContract): void {
    this.toolContracts.set(contract.name, contract);
  }

  /**
   * Validate all MCP tool contracts
   */
  static async validateMCPToolContracts(): Promise<APIContractValidationResult> {
    if (!this.mcpServer) {
      throw new Error('Contract testing framework not initialized');
    }

    const results: ContractTestResult[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get all available tools from the server
    const toolsResponse = await this.mcpServer.request(
      { method: 'tools/list' },
      { requestId: 'contract-test' }
    );

    const tools = toolsResponse.tools || [];

    for (const tool of tools) {
      const result = await this.validateToolContract(tool);
      results.push(result);

      if (!result.passed) {
        criticalIssues.push(`${tool.name}: Contract validation failed`);
        criticalIssues.push(...result.errors);
      }

      if (result.warnings.length > 0) {
        warnings.push(`${tool.name}: ${result.warnings.join(', ')}`);
      }
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(results));

    const contractsPassed = results.filter(r => r.passed).length;
    const contractsFailed = results.filter(r => !r.passed).length;

    return {
      toolsValidated: results.length,
      contractsPassed,
      contractsFailed,
      overallSuccess: contractsFailed === 0,
      results,
      summary: {
        criticalIssues,
        warnings,
        recommendations
      }
    };
  }

  /**
   * Validate a specific tool contract
   */
  static async validateToolContract(tool: Tool): Promise<ContractTestResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const contract = this.toolContracts.get(tool.name);
      
      if (!contract) {
        errors.push(`No contract definition found for tool: ${tool.name}`);
        return this.createResult(tool.name, false, errors, warnings, startTime, startMemory);
      }

      // Validate basic tool structure
      this.validateToolStructure(tool, contract, errors, warnings);

      // Validate input schema
      await this.validateInputSchema(tool, contract, errors, warnings);

      // Validate output schema (if available)
      await this.validateOutputSchema(tool, contract, errors, warnings);

      // Validate permissions and side effects
      this.validatePermissions(tool, contract, errors, warnings);

      // Performance validation
      this.validatePerformanceRequirements(tool, contract, errors, warnings);

      const passed = errors.length === 0;
      return this.createResult(tool.name, passed, errors, warnings, startTime, startMemory);

    } catch (error) {
      errors.push(`Contract validation failed: ${error.message}`);
      return this.createResult(tool.name, false, errors, warnings, startTime, startMemory);
    }
  }

  /**
   * Validate tool input/output with real data
   */
  static async validateToolWithTestData(
    toolName: string, 
    testCases: Array<{ input: any; expectedOutput?: any; shouldFail?: boolean }>
  ): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    results: Array<{
      testCase: number;
      passed: boolean;
      error?: string;
      actualOutput?: any;
    }>;
  }> {
    if (!this.mcpServer) {
      throw new Error('Contract testing framework not initialized');
    }

    const results = [];
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        const response = await this.mcpServer.request(
          { 
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: testCase.input
            }
          },
          { requestId: `contract-test-${i}` }
        );

        if (testCase.shouldFail) {
          // Expected failure but got success
          results.push({
            testCase: i + 1,
            passed: false,
            error: 'Expected failure but tool call succeeded',
            actualOutput: response
          });
          failed++;
        } else {
          // Validate output if expected output provided
          let outputValid = true;
          let outputError: string | undefined;

          if (testCase.expectedOutput) {
            outputValid = this.deepEqual(response, testCase.expectedOutput);
            if (!outputValid) {
              outputError = 'Output does not match expected result';
            }
          }

          results.push({
            testCase: i + 1,
            passed: outputValid,
            error: outputError,
            actualOutput: response
          });

          if (outputValid) {
            passed++;
          } else {
            failed++;
          }
        }
      } catch (error) {
        if (testCase.shouldFail) {
          // Expected failure and got failure
          results.push({
            testCase: i + 1,
            passed: true,
            actualOutput: { error: error.message }
          });
          passed++;
        } else {
          // Unexpected failure
          results.push({
            testCase: i + 1,
            passed: false,
            error: error.message
          });
          failed++;
        }
      }
    }

    return {
      totalTests: testCases.length,
      passed,
      failed,
      results
    };
  }

  /**
   * Generate comprehensive contract test report
   */
  static async generateContractTestReport(): Promise<{
    timestamp: string;
    summary: APIContractValidationResult;
    detailedResults: {
      [toolName: string]: {
        contract: ToolContract;
        validation: ContractTestResult;
        testData?: any;
      };
    };
    recommendations: string[];
    nextSteps: string[];
  }> {
    const summary = await this.validateMCPToolContracts();
    const detailedResults: any = {};
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    // Build detailed results
    for (const result of summary.results) {
      const contract = this.toolContracts.get(result.tool);
      if (contract) {
        detailedResults[result.tool] = {
          contract,
          validation: result
        };
      }
    }

    // Generate recommendations
    if (summary.contractsFailed > 0) {
      recommendations.push('Fix failing contract validations before deployment');
      nextSteps.push('Review and update tool implementations to match contracts');
    }

    if (summary.summary.warnings.length > 0) {
      recommendations.push('Address contract warnings to improve API quality');
      nextSteps.push('Update documentation and schema definitions');
    }

    recommendations.push('Implement automated contract testing in CI/CD pipeline');
    nextSteps.push('Set up contract regression monitoring');

    return {
      timestamp: new Date().toISOString(),
      summary,
      detailedResults,
      recommendations,
      nextSteps
    };
  }

  /**
   * Load standard MCP tool contracts
   */
  private static async loadStandardContracts(): Promise<void> {
    // BMAD Tool Contracts
    this.registerContract({
      name: 'bmad_parse_specification',
      description: 'Parse business specifications and generate tasks',
      inputSchema: z.object({
        content: z.string().min(1),
        format: z.enum(['markdown', 'yaml', 'plain']).optional(),
        generateTasks: z.boolean().optional(),
        autoAssign: z.boolean().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        tasks: z.array(z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
          assignedAgent: z.string().optional()
        })).optional(),
        message: z.string()
      }),
      sideEffects: 'write',
      errorCodes: ['PARSE_ERROR', 'VALIDATION_ERROR']
    });

    this.registerContract({
      name: 'bmad_update_task_status',
      description: 'Update task status',
      inputSchema: z.object({
        taskId: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
        notes: z.string().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        updatedTask: z.object({
          id: z.string(),
          status: z.string(),
          lastUpdated: z.string()
        }).optional()
      }),
      sideEffects: 'write',
      errorCodes: ['TASK_NOT_FOUND', 'INVALID_STATUS']
    });

    // Documentation Tool Contracts
    this.registerContract({
      name: 'docs_reference',
      description: 'Find relevant documentation for development work',
      inputSchema: z.object({
        workType: z.string(),
        description: z.string(),
        filePaths: z.array(z.string()).optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        documents: z.array(z.object({
          path: z.string(),
          title: z.string(),
          relevance: z.number().min(0).max(1),
          excerpt: z.string()
        })),
        message: z.string()
      }),
      sideEffects: 'read',
      errorCodes: ['NO_DOCUMENTS_FOUND', 'ACCESS_ERROR']
    });

    this.registerContract({
      name: 'docs_update',
      description: 'Update documentation after completing work',
      inputSchema: z.object({
        workDescription: z.string(),
        updatedFiles: z.array(z.string()),
        documentationChanges: z.string()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        updatedDocuments: z.array(z.string()),
        message: z.string()
      }),
      sideEffects: 'write',
      errorCodes: ['UPDATE_FAILED', 'FILE_NOT_FOUND']
    });

    this.registerContract({
      name: 'docs_search',
      description: 'Search through project documentation',
      inputSchema: z.object({
        query: z.string().min(1),
        maxResults: z.number().min(1).max(100).optional(),
        documentTypes: z.array(z.string()).optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        results: z.array(z.object({
          path: z.string(),
          title: z.string(),
          snippet: z.string(),
          score: z.number()
        })),
        totalResults: z.number(),
        message: z.string()
      }),
      sideEffects: 'read',
      errorCodes: ['SEARCH_ERROR', 'INVALID_QUERY']
    });

    this.registerContract({
      name: 'docs_validate',
      description: 'Validate documentation structure',
      inputSchema: z.object({
        documentPath: z.string().optional(),
        validationType: z.enum(['structure', 'links', 'content', 'all']).optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        validationResults: z.object({
          errors: z.array(z.string()),
          warnings: z.array(z.string()),
          suggestions: z.array(z.string())
        }),
        message: z.string()
      }),
      sideEffects: 'read',
      errorCodes: ['VALIDATION_ERROR', 'FILE_ACCESS_ERROR']
    });

    // Hooks Tool Contracts
    this.registerContract({
      name: 'hooks_trigger',
      description: 'Manually trigger hook events',
      inputSchema: z.object({
        eventType: z.string(),
        data: z.record(z.any()),
        target: z.string().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        triggeredHooks: z.array(z.string()),
        results: z.array(z.object({
          hook: z.string(),
          success: z.boolean(),
          output: z.string()
        })),
        message: z.string()
      }),
      sideEffects: 'system',
      errorCodes: ['HOOK_NOT_FOUND', 'EXECUTION_ERROR']
    });

    this.registerContract({
      name: 'hooks_setup_git',
      description: 'Setup Git hooks',
      inputSchema: z.object({
        projectRoot: z.string(),
        hooks: z.array(z.enum(['pre-commit', 'post-commit', 'pre-push'])),
        overwrite: z.boolean().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        installedHooks: z.array(z.string()),
        message: z.string()
      }),
      sideEffects: 'write',
      requiredPermissions: ['file_system_write'],
      errorCodes: ['GIT_NOT_FOUND', 'PERMISSION_ERROR']
    });

    // Enhanced Tool Contracts
    this.registerContract({
      name: 'initialize_documentation_system',
      description: 'Initialize the enhanced documentation system',
      inputSchema: z.object({
        projectRoot: z.string(),
        enableAI: z.boolean().optional(),
        timeZone: z.string().optional(),
        locale: z.string().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        systemStatus: z.object({
          database: z.string(),
          services: z.array(z.string()),
          aiEnabled: z.boolean()
        }),
        message: z.string()
      }),
      sideEffects: 'write',
      requiredPermissions: ['file_system_write', 'database_access'],
      errorCodes: ['INITIALIZATION_ERROR', 'DATABASE_ERROR']
    });

    this.registerContract({
      name: 'track_document_work',
      description: 'Track work-document relationships',
      inputSchema: z.object({
        workType: z.string(),
        workDescription: z.string(),
        filePaths: z.array(z.string()),
        expectedDocuments: z.array(z.string()).optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        connections: z.array(z.object({
          documentId: z.string(),
          connectionStrength: z.number(),
          relevanceScore: z.number()
        })),
        recommendations: z.array(z.string()),
        message: z.string()
      }),
      sideEffects: 'write',
      errorCodes: ['TRACKING_ERROR', 'FILE_ACCESS_ERROR']
    });
  }

  /**
   * Validate tool structure
   */
  private static validateToolStructure(
    tool: Tool, 
    contract: ToolContract, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (tool.name !== contract.name) {
      errors.push(`Tool name mismatch: expected ${contract.name}, got ${tool.name}`);
    }

    if (!tool.description || tool.description.trim().length === 0) {
      errors.push(`Tool ${tool.name} missing description`);
    } else if (tool.description !== contract.description) {
      warnings.push(`Tool description differs from contract`);
    }

    if (!tool.inputSchema) {
      errors.push(`Tool ${tool.name} missing input schema`);
    }
  }

  /**
   * Validate input schema
   */
  private static async validateInputSchema(
    tool: Tool, 
    contract: ToolContract, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    if (!tool.inputSchema) {
      return;
    }

    try {
      // Basic schema structure validation
      const schema = tool.inputSchema;
      
      if (typeof schema !== 'object') {
        errors.push(`Invalid input schema format for ${tool.name}`);
        return;
      }

      if (!schema.type) {
        warnings.push(`Input schema missing type property for ${tool.name}`);
      }

      if (schema.type === 'object' && !schema.properties) {
        warnings.push(`Object schema missing properties for ${tool.name}`);
      }

      // Validate required fields exist
      if (schema.required && Array.isArray(schema.required)) {
        if (!schema.properties) {
          errors.push(`Required fields specified but no properties defined for ${tool.name}`);
        } else {
          for (const requiredField of schema.required) {
            if (!(requiredField in schema.properties)) {
              errors.push(`Required field '${requiredField}' not found in properties for ${tool.name}`);
            }
          }
        }
      }

    } catch (error) {
      errors.push(`Input schema validation error for ${tool.name}: ${error.message}`);
    }
  }

  /**
   * Validate output schema
   */
  private static async validateOutputSchema(
    tool: Tool, 
    contract: ToolContract, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // Output schema validation would require actual tool execution
    // For now, we check if the contract defines expected output structure
    if (!contract.outputSchema) {
      warnings.push(`No output schema defined in contract for ${tool.name}`);
    }
  }

  /**
   * Validate permissions and side effects
   */
  private static validatePermissions(
    tool: Tool, 
    contract: ToolContract, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (contract.sideEffects === 'write' || contract.sideEffects === 'system') {
      if (!contract.requiredPermissions) {
        warnings.push(`Tool ${tool.name} has side effects but no required permissions specified`);
      }
    }

    if (contract.requiredPermissions && contract.requiredPermissions.length > 0) {
      // In a real implementation, you would check against actual tool permissions
      warnings.push(`Tool ${tool.name} requires permissions: ${contract.requiredPermissions.join(', ')}`);
    }
  }

  /**
   * Validate performance requirements
   */
  private static validatePerformanceRequirements(
    tool: Tool, 
    contract: ToolContract, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Performance validation would require actual execution timing
    // For now, we can check for obvious performance anti-patterns in schema
    const schema = tool.inputSchema;
    
    if (schema && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (typeof propSchema === 'object' && propSchema.type === 'array') {
          if (!propSchema.maxItems) {
            warnings.push(`Array property '${propName}' in ${tool.name} has no maximum length limit`);
          }
        }
        
        if (typeof propSchema === 'object' && propSchema.type === 'string') {
          if (!propSchema.maxLength) {
            warnings.push(`String property '${propName}' in ${tool.name} has no maximum length limit`);
          }
        }
      }
    }
  }

  /**
   * Create contract test result
   */
  private static createResult(
    tool: string,
    passed: boolean,
    errors: string[],
    warnings: string[],
    startTime: number,
    startMemory: number
  ): ContractTestResult {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      tool,
      passed,
      errors: [...errors],
      warnings: [...warnings],
      performance: {
        validationTimeMs: endTime - startTime,
        memoryUsageBytes: endMemory - startMemory
      }
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private static generateRecommendations(results: ContractTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTools = results.filter(r => !r.passed);
    const slowTools = results.filter(r => r.performance.validationTimeMs > 100);
    const memoryIntensiveTools = results.filter(r => r.performance.memoryUsageBytes > 1024 * 1024);

    if (failedTools.length > 0) {
      recommendations.push(`Fix contract validation for ${failedTools.length} tools: ${failedTools.map(t => t.tool).join(', ')}`);
    }

    if (slowTools.length > 0) {
      recommendations.push(`Optimize validation performance for ${slowTools.length} tools`);
    }

    if (memoryIntensiveTools.length > 0) {
      recommendations.push(`Review memory usage for ${memoryIntensiveTools.length} tools`);
    }

    recommendations.push('Implement contract testing in CI/CD pipeline');
    recommendations.push('Set up automated contract regression monitoring');
    recommendations.push('Document API versioning strategy');

    return recommendations;
  }

  /**
   * Deep equality check for test validation
   */
  private static deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
}

/**
 * Jest setup helper for contract testing
 */
export const setupContractTesting = () => {
  let framework: typeof ContractTestFramework;

  beforeAll(async () => {
    framework = ContractTestFramework;
    // Server would be initialized here in real implementation
  });

  return () => framework;
};

/**
 * Contract test utilities
 */
export const contractTestUtils = {
  /**
   * Create test cases for common scenarios
   */
  createStandardTestCases: (toolName: string): Array<{ input: any; expectedOutput?: any; shouldFail?: boolean }> => {
    const baseTestCases = [
      // Valid input test
      {
        input: { validField: 'test' },
        shouldFail: false
      },
      // Missing required field test
      {
        input: {},
        shouldFail: true
      },
      // Invalid field type test
      {
        input: { validField: 123 },
        shouldFail: true
      },
      // Extra fields test (should be handled gracefully)
      {
        input: { validField: 'test', extraField: 'extra' },
        shouldFail: false
      }
    ];

    return baseTestCases;
  },

  /**
   * Generate performance test cases
   */
  createPerformanceTestCases: (toolName: string) => ({
    smallInput: { data: 'small' },
    mediumInput: { data: 'a'.repeat(1000) },
    largeInput: { data: 'a'.repeat(10000) }
  }),

  /**
   * Validate contract completeness
   */
  validateContractCompleteness: (contract: ToolContract): string[] => {
    const issues: string[] = [];

    if (!contract.description || contract.description.length < 10) {
      issues.push('Description too short or missing');
    }

    if (!contract.inputSchema) {
      issues.push('Input schema missing');
    }

    if (!contract.outputSchema) {
      issues.push('Output schema missing');
    }

    if (contract.sideEffects === 'write' && !contract.requiredPermissions) {
      issues.push('Write operations should specify required permissions');
    }

    if (!contract.errorCodes || contract.errorCodes.length === 0) {
      issues.push('Error codes not specified');
    }

    return issues;
  }
};