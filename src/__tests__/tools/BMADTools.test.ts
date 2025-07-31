/**
 * BMAD Tools Tests
 * 
 * Comprehensive tests for BMAD tool handlers (2 tools)
 */

import { registerBMADTools } from '../../tools/bmad/index.js';
import { ServiceMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, PerformanceTestUtils, TestAssertions } from '../helpers/TestUtils.js';

describe('BMAD Tools', () => {
  let bmadService: any;
  let tools: Map<string, Function>;
  let toolDefinitions: any[];

  beforeEach(() => {
    bmadService = ServiceMockFactory.createBMADServiceMock();
    tools = new Map();
    toolDefinitions = registerBMADTools(tools, bmadService);
  });

  describe('Tool Registration', () => {
    test('should register correct number of BMAD tools', () => {
      expect(toolDefinitions).toHaveLength(2);
      expect(tools.size).toBe(2);
    });

    test('should register bmad_parse_specification tool', () => {
      const tool = toolDefinitions.find(t => t.name === 'bmad_parse_specification');
      expect(tool).toBeDefined();
      expect(tool.description).toContain('Parse a business specification');
      expect(tool.inputSchema.required).toEqual(['content', 'format']);
      expect(tools.has('bmad_parse_specification')).toBe(true);
    });

    test('should register bmad_update_task_status tool', () => {
      const tool = toolDefinitions.find(t => t.name === 'bmad_update_task_status');
      expect(tool).toBeDefined();
      expect(tool.description).toContain('Update the status of a specific task');
      expect(tool.inputSchema.required).toEqual(['taskId', 'status']);
      expect(tools.has('bmad_update_task_status')).toBe(true);
    });

    test('should have valid schema definitions', () => {
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

  describe('bmad_parse_specification Tool', () => {
    let parseSpecTool: Function;

    beforeEach(() => {
      parseSpecTool = tools.get('bmad_parse_specification')!;
    });

    test('should parse markdown specification successfully', async () => {
      const args = {
        content: '# Project Specification\n\n## Requirements\n- Feature A\n- Feature B',
        format: 'markdown',
        generateTasks: true,
        autoAssign: false,
        validate: true
      };

      const result = await parseSpecTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tasks).toBeDefined();
      expect(result.agents).toBeDefined();
      expect(bmadService.parseSpecification).toHaveBeenCalledWith(args);
    });

    test('should parse YAML specification successfully', async () => {
      const args = {
        content: 'project:\n  name: "Test Project"\n  features:\n    - feature1\n    - feature2',
        format: 'yaml',
        generateTasks: true,
        autoAssign: true
      };

      const result = await parseSpecTool(args);

      expect(result.success).toBe(true);
      expect(bmadService.parseSpecification).toHaveBeenCalledWith(args);
    });

    test('should parse plain text specification', async () => {
      const args = {
        content: 'Simple specification content with requirements listed plainly',
        format: 'plain'
      };

      const result = await parseSpecTool(args);

      expect(result.success).toBe(true);
      expect(bmadService.parseSpecification).toHaveBeenCalledWith(args);
    });

    test('should handle specification with auto-assignment', async () => {
      const args = {
        content: '# Complex Project\n\n## Frontend Tasks\n- UI Development\n\n## Backend Tasks\n- API Development',
        format: 'markdown',
        generateTasks: true,
        autoAssign: true,
        validate: true
      };

      const result = await parseSpecTool(args);

      expect(result.success).toBe(true);
      expect(result.assignments).toBeDefined();
      expect(bmadService.parseSpecification).toHaveBeenCalledWith(args);
    });

    test('should validate input format', async () => {
      const invalidArgs = {
        content: 'Test content',
        format: 'invalid-format' as any
      };

      // The tool should handle this at the schema level or service level
      await expect(parseSpecTool(invalidArgs)).rejects.toThrow();
    });

    test('should handle empty content gracefully', async () => {
      const args = {
        content: '',
        format: 'markdown'
      };

      const result = await parseSpecTool(args);
      expect(bmadService.parseSpecification).toHaveBeenCalledWith(args);
    });

    test('should handle large specifications efficiently', async () => {
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `## Feature ${i}\n- Requirement ${i}.1\n- Requirement ${i}.2`
      ).join('\n\n');

      const args = {
        content: largeContent,
        format: 'markdown',
        generateTasks: true
      };

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await parseSpecTool(args);
      });

      TestAssertions.assertExecutionTime(duration, 1000, 'Parsing large specification');
    });

    test('should handle special characters in content', async () => {
      const args = {
        content: '# Project 项目 🚀\n\n## Requirements 要求\n- Feature with émojis 😄\n- Unicode content ñáéíóú',
        format: 'markdown'
      };

      const result = await parseSpecTool(args);
      expect(result.success).toBe(true);
    });
  });

  describe('bmad_update_task_status Tool', () => {
    let updateStatusTool: Function;

    beforeEach(() => {
      updateStatusTool = tools.get('bmad_update_task_status')!;
    });

    test('should update task status successfully', async () => {
      const args = {
        taskId: 'test-task-id',
        status: 'in-progress'
      };

      const result = await updateStatusTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(args.taskId);
      expect(result.status).toBe(args.status);
      expect(bmadService.updateTaskStatus).toHaveBeenCalledWith(args.taskId, args.status);
    });

    test('should handle all valid status transitions', async () => {
      const validStatuses = ['pending', 'assigned', 'in-progress', 'needs-revision', 'completed'];
      const taskId = 'test-task-id';

      for (const status of validStatuses) {
        const result = await updateStatusTool({ taskId, status });
        expect(result.success).toBe(true);
        expect(result.status).toBe(status);
      }

      expect(bmadService.updateTaskStatus).toHaveBeenCalledTimes(validStatuses.length);
    });

    test('should handle non-existent task', async () => {
      bmadService.updateTaskStatus.mockResolvedValueOnce(false);

      const args = {
        taskId: 'non-existent-task',
        status: 'completed'
      };

      const result = await updateStatusTool(args);

      expect(result.success).toBe(false);
      expect(bmadService.updateTaskStatus).toHaveBeenCalledWith(args.taskId, args.status);
    });

    test('should validate status enum', async () => {
      const args = {
        taskId: 'test-task-id',
        status: 'invalid-status' as any
      };

      // Should be handled by schema validation or service validation
      await expect(updateStatusTool(args)).rejects.toThrow();
    });

    test('should handle concurrent status updates', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];
      const updates = taskIds.map(taskId => () => 
        updateStatusTool({ taskId, status: 'completed' })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(updates.map(update => update()));
      });

      TestAssertions.assertExecutionTime(duration, 500, 'Concurrent status updates');
      expect(bmadService.updateTaskStatus).toHaveBeenCalledTimes(taskIds.length);
    });

    test('should handle service errors gracefully', async () => {
      bmadService.updateTaskStatus.mockRejectedValueOnce(new Error('Database connection failed'));

      const args = {
        taskId: 'test-task-id',
        status: 'completed'
      };

      await expect(updateStatusTool(args)).rejects.toThrow('Database connection failed');
    });

    test('should validate required parameters', async () => {
      // Missing taskId
      await expect(updateStatusTool({ status: 'completed' })).rejects.toThrow();

      // Missing status
      await expect(updateStatusTool({ taskId: 'test-id' })).rejects.toThrow();

      // Missing both
      await expect(updateStatusTool({})).rejects.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service initialization failures', () => {
      const faultyService = null as any;
      
      expect(() => registerBMADTools(new Map(), faultyService)).toThrow();
    });

    test('should handle malformed tool arguments', async () => {
      const parseSpecTool = tools.get('bmad_parse_specification')!;
      
      // Null arguments
      await expect(parseSpecTool(null)).rejects.toThrow();
      
      // Array instead of object
      await expect(parseSpecTool([])).rejects.toThrow();
      
      // String instead of object
      await expect(parseSpecTool('invalid')).rejects.toThrow();
    });

    test('should maintain tool isolation', async () => {
      const parseSpecTool = tools.get('bmad_parse_specification')!;
      const updateStatusTool = tools.get('bmad_update_task_status')!;

      // Call both tools with valid arguments
      await parseSpecTool({
        content: 'Test content',
        format: 'markdown'
      });

      await updateStatusTool({
        taskId: 'test-id',
        status: 'completed'
      });

      // Each should have been called once
      expect(bmadService.parseSpecification).toHaveBeenCalledTimes(1);
      expect(bmadService.updateTaskStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid successive calls', async () => {
      const parseSpecTool = tools.get('bmad_parse_specification')!;
      const calls = Array.from({ length: 100 }, (_, i) => () =>
        parseSpecTool({
          content: `Specification ${i}`,
          format: 'markdown'
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(calls.map(call => call()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, '100 rapid specification parses');
      expect(bmadService.parseSpecification).toHaveBeenCalledTimes(100);
    });

    test('should handle memory efficiently with large datasets', async () => {
      const parseSpecTool = tools.get('bmad_parse_specification')!;
      const largeSpecification = {
        content: 'x'.repeat(1024 * 1024), // 1MB of content
        format: 'plain'
      };

      const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        await parseSpecTool(largeSpecification);
      });

      // Should not consume excessive memory
      TestAssertions.assertMemoryUsage(memoryDelta, 10 * 1024 * 1024, 'Large specification memory usage');
    });
  });
});