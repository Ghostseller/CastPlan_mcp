/**
 * Hooks Tools Tests
 * 
 * Comprehensive tests for Hooks tool handlers (4 tools)
 */

import { registerHooksTools } from '../../tools/hooks/index.js';
import { ServiceMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, PerformanceTestUtils, TestAssertions, ConcurrencyTestUtils } from '../helpers/TestUtils.js';

describe('Hooks Tools', () => {
  let hooksService: any;
  let tools: Map<string, Function>;
  let toolDefinitions: any[];

  beforeEach(() => {
    hooksService = ServiceMockFactory.createHooksServiceMock();
    tools = new Map();
    toolDefinitions = registerHooksTools(tools, hooksService);
  });

  describe('Tool Registration', () => {
    test('should register correct number of hooks tools', () => {
      expect(toolDefinitions).toHaveLength(4);
      expect(tools.size).toBe(4);
    });

    test('should register all expected hooks tools', () => {
      const expectedTools = [
        'hooks_trigger',
        'hooks_setup_git',
        'hooks_start_watching',
        'hooks_stop_watching'
      ];

      expectedTools.forEach(toolName => {
        expect(tools.has(toolName)).toBe(true);
        expect(toolDefinitions.find(t => t.name === toolName)).toBeDefined();
      });
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

  describe('hooks_trigger Tool', () => {
    let triggerTool: Function;

    beforeEach(() => {
      triggerTool = tools.get('hooks_trigger')!;
    });

    test('should trigger pre-work hook event', async () => {
      const args = {
        eventType: 'pre-work',
        data: {
          workType: 'frontend',
          files: ['/src/components/NewComponent.tsx'],
          description: 'Creating new component'
        }
      };

      const result = await triggerTool(args);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.event.type).toBe('pre-work');
      expect(result.processedAt).toBeDefined();
      expect(result.triggeredActions).toBeDefined();
      expect(hooksService.processHookRequest).toHaveBeenCalledWith({
        event: expect.objectContaining({
          type: args.eventType,
          data: args.data,
          timestamp: expect.any(String)
        })
      });
    });

    test('should trigger post-work hook event', async () => {
      const args = {
        eventType: 'post-work',
        data: {
          workType: 'backend',
          files: ['/api/users.ts', '/api/auth.ts'],
          description: 'Completed API implementation',
          changes: ['Added user endpoints', 'Implemented JWT auth']
        }
      };

      const result = await triggerTool(args);

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('post-work');
      expect(result.triggeredActions).toContain('documentation-update');
    });

    test('should trigger file-change hook event', async () => {
      const args = {
        eventType: 'file-change',
        data: {
          filePath: '/src/utils/helpers.ts',
          changeType: 'modified',
          timestamp: new Date().toISOString()
        }
      };

      const result = await triggerTool(args);

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('file-change');
      expect(result.event.data.filePath).toBe('/src/utils/helpers.ts');
    });

    test('should trigger session lifecycle events', async () => {
      const sessionEvents = ['session-start', 'session-end'];

      for (const eventType of sessionEvents) {
        const args = {
          eventType,
          data: {
            sessionId: 'test-session-123',
            timestamp: new Date().toISOString(),
            userAgent: 'test-agent'
          }
        };

        const result = await triggerTool(args);

        expect(result.success).toBe(true);
        expect(result.event.type).toBe(eventType);
      }
    });

    test('should validate event type enum', async () => {
      const invalidArgs = {
        eventType: 'invalid-event-type',
        data: { test: 'data' }
      };

      await expect(triggerTool(invalidArgs)).rejects.toThrow();
    });

    test('should handle complex event data', async () => {
      const args = {
        eventType: 'file-change',
        data: {
          filePath: '/src/complex/nested/Component.tsx',
          changeType: 'created',
          metadata: {
            size: 1024,
            encoding: 'utf-8',
            gitHash: 'abc123def456',
            author: 'test-user',
            dependencies: ['react', 'typescript'],
            exports: ['ComponentA', 'ComponentB']
          }
        }
      };

      const result = await triggerTool(args);

      expect(result.success).toBe(true);
      expect(result.event.data.metadata).toBeDefined();
      expect(result.event.data.metadata.dependencies).toContain('react');
    });

    test('should handle concurrent hook triggers', async () => {
      const concurrentTriggers = Array.from({ length: 10 }, (_, i) => () =>
        triggerTool({
          eventType: 'file-change',
          data: {
            filePath: `/src/file${i}.ts`,
            changeType: 'modified'
          }
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(concurrentTriggers.map(trigger => trigger()));
      });

      TestAssertions.assertExecutionTime(duration, 1000, '10 concurrent hook triggers');
      expect(hooksService.processHookRequest).toHaveBeenCalledTimes(10);
    });
  });

  describe('hooks_setup_git Tool', () => {
    let setupGitTool: Function;

    beforeEach(() => {
      setupGitTool = tools.get('hooks_setup_git')!;
    });

    test('should setup Git hooks successfully', async () => {
      const result = await setupGitTool({});

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Git hooks setup successfully');
      expect(hooksService.setupGitHooks).toHaveBeenCalled();
    });

    test('should handle Git hooks setup failure', async () => {
      hooksService.setupGitHooks.mockResolvedValueOnce(false);

      const result = await setupGitTool({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to setup Git hooks');
    });

    test('should not require any parameters', async () => {
      // Should work with empty object
      await expect(setupGitTool({})).resolves.toBeDefined();
      
      // Should work with no parameters
      await expect(setupGitTool()).resolves.toBeDefined();
    });

    test('should handle Git repository not found', async () => {
      hooksService.setupGitHooks.mockRejectedValueOnce(new Error('Not a git repository'));

      await expect(setupGitTool({})).rejects.toThrow('Not a git repository');
    });

    test('should handle permission errors', async () => {
      hooksService.setupGitHooks.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(setupGitTool({})).rejects.toThrow('Permission denied');
    });
  });

  describe('hooks_start_watching Tool', () => {
    let startWatchingTool: Function;

    beforeEach(() => {
      startWatchingTool = tools.get('hooks_start_watching')!;
    });

    test('should start file watching with default patterns', async () => {
      const result = await startWatchingTool({});

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('File watching started');
      expect(hooksService.startFileWatching).toHaveBeenCalledWith(undefined);
    });

    test('should start file watching with custom patterns', async () => {
      const args = {
        patterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
      };

      const result = await startWatchingTool(args);

      expect(result.success).toBe(true);
      expect(result.patterns).toEqual(args.patterns);
      expect(hooksService.startFileWatching).toHaveBeenCalledWith(args.patterns);
    });

    test('should handle specific file type patterns', async () => {
      const testCases = [
        { patterns: ['**/*.md'], description: 'markdown files' },
        { patterns: ['**/*.json'], description: 'configuration files' },
        { patterns: ['**/*.css', '**/*.scss'], description: 'style files' },
        { patterns: ['src/**/*', 'tests/**/*'], description: 'specific directories' }
      ];

      for (const testCase of testCases) {
        const result = await startWatchingTool({ patterns: testCase.patterns });
        
        expect(result.success).toBe(true);
        expect(result.patterns).toEqual(testCase.patterns);
      }
    });

    test('should handle empty patterns array', async () => {
      const args = { patterns: [] };

      const result = await startWatchingTool(args);

      expect(result.success).toBe(true);
      expect(hooksService.startFileWatching).toHaveBeenCalledWith([]);
    });

    test('should validate patterns format', async () => {
      const invalidArgs = {
        patterns: 'not-an-array'
      };

      await expect(startWatchingTool(invalidArgs)).rejects.toThrow();
    });

    test('should handle file system permissions errors', async () => {
      hooksService.startFileWatching.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const args = { patterns: ['**/*'] };

      await expect(startWatchingTool(args)).rejects.toThrow('EACCES: permission denied');
    });

    test('should handle complex glob patterns', async () => {
      const args = {
        patterns: [
          '**/*.{ts,tsx,js,jsx}',
          '!node_modules/**/*',
          'src/**/*.test.{ts,js}',
          'docs/**/*.{md,mdx}'
        ]
      };

      const result = await startWatchingTool(args);

      expect(result.success).toBe(true);
      expect(result.patterns).toEqual(args.patterns);
    });
  });

  describe('hooks_stop_watching Tool', () => {
    let stopWatchingTool: Function;

    beforeEach(() => {
      stopWatchingTool = tools.get('hooks_stop_watching')!;
    });

    test('should stop file watching successfully', async () => {
      const result = await stopWatchingTool({});

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('File watching stopped');
      expect(hooksService.stopFileWatching).toHaveBeenCalled();
    });

    test('should not require any parameters', async () => {
      // Should work with empty object
      await expect(stopWatchingTool({})).resolves.toBeDefined();
      
      // Should work with no parameters
      await expect(stopWatchingTool()).resolves.toBeDefined();
    });

    test('should handle stop watching when not started', async () => {
      // Service should handle this gracefully
      const result = await stopWatchingTool({});

      expect(result.success).toBe(true);
    });

    test('should handle service errors during stop', async () => {
      hooksService.stopFileWatching.mockRejectedValueOnce(new Error('Failed to stop watchers'));

      await expect(stopWatchingTool({})).rejects.toThrow('Failed to stop watchers');
    });
  });

  describe('Integration and Workflow Tests', () => {
    test('should handle complete file watching lifecycle', async () => {
      const startTool = tools.get('hooks_start_watching')!;
      const stopTool = tools.get('hooks_stop_watching')!;
      const triggerTool = tools.get('hooks_trigger')!;

      // Start watching
      const startResult = await startTool({
        patterns: ['**/*.ts', '**/*.tsx']
      });
      expect(startResult.success).toBe(true);

      // Trigger file change event
      const triggerResult = await triggerTool({
        eventType: 'file-change',
        data: {
          filePath: '/src/test.ts',
          changeType: 'modified'
        }
      });
      expect(triggerResult.success).toBe(true);

      // Stop watching
      const stopResult = await stopTool({});
      expect(stopResult.success).toBe(true);
    });

    test('should handle Git hooks integration workflow', async () => {
      const setupGitTool = tools.get('hooks_setup_git')!;
      const triggerTool = tools.get('hooks_trigger')!;

      // Setup Git hooks
      const setupResult = await setupGitTool({});
      expect(setupResult.success).toBe(true);

      // Trigger pre-work event (as if from Git hook)
      const preWorkResult = await triggerTool({
        eventType: 'pre-work',
        data: {
          gitBranch: 'feature/new-component',
          workType: 'frontend'
        }
      });
      expect(preWorkResult.success).toBe(true);

      // Trigger post-work event (as if from Git hook)
      const postWorkResult = await triggerTool({
        eventType: 'post-work',
        data: {
          gitBranch: 'feature/new-component',
          commitHash: 'abc123',
          filesChanged: ['/src/NewComponent.tsx']
        }
      });
      expect(postWorkResult.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service unavailable errors', async () => {
      hooksService.processHookRequest.mockRejectedValueOnce(new Error('Service unavailable'));

      const triggerTool = tools.get('hooks_trigger')!;

      await expect(triggerTool({
        eventType: 'file-change',
        data: { filePath: '/test.ts' }
      })).rejects.toThrow('Service unavailable');
    });

    test('should handle malformed event data', async () => {
      const triggerTool = tools.get('hooks_trigger')!;

      const malformedArgs = {
        eventType: 'file-change',
        data: null
      };

      await expect(triggerTool(malformedArgs)).rejects.toThrow();
    });

    test('should maintain tool state isolation', async () => {
      const startTool = tools.get('hooks_start_watching')!;
      const stopTool = tools.get('hooks_stop_watching')!;

      // Start and stop should not interfere with each other
      await startTool({ patterns: ['**/*.ts'] });
      await stopTool({});

      expect(hooksService.startFileWatching).toHaveBeenCalledTimes(1);
      expect(hooksService.stopFileWatching).toHaveBeenCalledTimes(1);
    });

    test('should handle rapid start/stop cycles', async () => {
      const startTool = tools.get('hooks_start_watching')!;
      const stopTool = tools.get('hooks_stop_watching')!;

      const cycles = Array.from({ length: 5 }, () => async () => {
        await startTool({ patterns: ['**/*'] });
        await stopTool({});
      });

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        for (const cycle of cycles) {
          await cycle();
        }
      });

      TestAssertions.assertExecutionTime(duration, 1000, '5 start/stop cycles');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency event triggers', async () => {
      const triggerTool = tools.get('hooks_trigger')!;
      const events = Array.from({ length: 100 }, (_, i) => () =>
        triggerTool({
          eventType: 'file-change',
          data: {
            filePath: `/src/file${i}.ts`,
            changeType: 'modified'
          }
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(events.map(event => event()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, '100 concurrent event triggers');
    });

    test('should handle large event data payloads', async () => {
      const triggerTool = tools.get('hooks_trigger')!;
      const largeData = {
        filePath: '/src/large-file.ts',
        changeType: 'modified',
        content: 'x'.repeat(10000), // 10KB of content
        metadata: {
          dependencies: Array.from({ length: 100 }, (_, i) => `package-${i}`),
          exports: Array.from({ length: 50 }, (_, i) => `export${i}`)
        }
      };

      const { duration, memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        await triggerTool({
          eventType: 'file-change',
          data: largeData
        });
      });

      TestAssertions.assertExecutionTime(duration, 200, 'Large event data processing');
      TestAssertions.assertMemoryUsage(memoryDelta, 5 * 1024 * 1024, 'Large event data memory usage');
    });

    test('should handle concurrent start/stop operations', async () => {
      const startTool = tools.get('hooks_start_watching')!;
      const stopTool = tools.get('hooks_stop_watching')!;

      const concurrentOps = [
        () => startTool({ patterns: ['**/*.ts'] }),
        () => startTool({ patterns: ['**/*.js'] }),
        () => stopTool({}),
        () => startTool({ patterns: ['**/*.tsx'] }),
        () => stopTool({})
      ];

      await expect(Promise.all(concurrentOps.map(op => op()))).resolves.toBeDefined();
    });
  });
});