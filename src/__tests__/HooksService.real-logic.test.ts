/**
 * Integration test to verify real business logic execution after dependency injection refactoring
 * This test demonstrates that service logic is actually running, not being intercepted by mocks
 */

import { HooksService } from '../services/HooksService';
import { HookEvent, HookRequest } from '../types/hooks.types';
import { FileSystemAdapter, PathAdapter, WatcherFactory, WatcherInstance } from '../interfaces/dependencies';

// Controlled test doubles that verify real logic execution
class ControlledFileSystem implements FileSystemAdapter {
  public calls: { method: string; args: any[] }[] = [];
  
  existsSync(path: string): boolean {
    this.calls.push({ method: 'existsSync', args: [path] });
    return true; // Allow operation to continue
  }

  writeFileSync(path: string, data: string): void {
    this.calls.push({ method: 'writeFileSync', args: [path, data] });
  }

  appendFileSync(path: string, data: string): void {
    this.calls.push({ method: 'appendFileSync', args: [path, data] });
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    this.calls.push({ method: 'mkdirSync', args: [path, options] });
  }

  chmodSync(path: string, mode: number): void {
    this.calls.push({ method: 'chmodSync', args: [path, mode] });
  }

  reset(): void {
    this.calls = [];
  }
}

class ControlledPathAdapter implements PathAdapter {
  public calls: { method: string; args: any[] }[] = [];

  join(...paths: string[]): string {
    this.calls.push({ method: 'join', args: paths });
    return paths.join('/');
  }

  resolve(...paths: string[]): string {
    this.calls.push({ method: 'resolve', args: paths });
    return paths.join('/');
  }

  dirname(filePath: string): string {
    this.calls.push({ method: 'dirname', args: [filePath] });
    return filePath.split('/').slice(0, -1).join('/');
  }

  reset(): void {
    this.calls = [];
  }
}

class ControlledWatcher implements WatcherInstance {
  public handlers: Map<string, Function[]> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(listener);
    return this;
  }

  async close(): Promise<void> {
    // Cleanup logic would go here
  }

  // Test helper to trigger events
  trigger(event: string, ...args: any[]): void {
    const listeners = this.handlers.get(event) || [];
    listeners.forEach(listener => listener(...args));
  }
}

class ControlledWatcherFactory implements WatcherFactory {
  public lastWatcher: ControlledWatcher | null = null;
  public calls: { method: string; args: any[] }[] = [];

  watch(patterns: string | string[], options?: any): WatcherInstance {
    this.calls.push({ method: 'watch', args: [patterns, options] });
    this.lastWatcher = new ControlledWatcher();
    return this.lastWatcher;
  }

  reset(): void {
    this.calls = [];
    this.lastWatcher = null;
  }
}

describe('HooksService Real Logic Execution', () => {
  let service: HooksService;
  let fileSystem: ControlledFileSystem;
  let pathAdapter: ControlledPathAdapter;
  let watcherFactory: ControlledWatcherFactory;

  beforeEach(() => {
    fileSystem = new ControlledFileSystem();
    pathAdapter = new ControlledPathAdapter();
    watcherFactory = new ControlledWatcherFactory();

    service = new HooksService('/test/project', {
      fileSystem,
      pathAdapter,
      watcherFactory
    });
  });

  afterEach(() => {
    fileSystem.reset();
    pathAdapter.reset();
    watcherFactory.reset();
  });

  describe('Real Business Logic Verification', () => {
    it('should execute real recommendation generation logic for pre-work events', async () => {
      const request: HookRequest = {
        event: {
          type: 'pre-work',
          data: {
            files: ['src/api/users.ts', 'src/components/Button.test.tsx'],
            context: 'Adding security features'
          },
          timestamp: new Date().toISOString()
        }
      };

      const response = await service.processHookRequest(request);

      // Verify real business logic executed - recommendations generated based on file patterns
      expect(response.success).toBe(true);
      expect(response.data?.recommendations).toEqual(
        expect.arrayContaining([
          'Consider reviewing TypeScript best practices documentation',
          'Review testing guidelines and coverage requirements',
          'Check API documentation and security guidelines',
          'Review security documentation and run security checks'
        ])
      );

      // Verify this is real logic, not mocked - specific recommendations based on file patterns and context
      const tsRecommendation = response.data?.recommendations.find((r: string) => 
        r.includes('TypeScript best practices')
      );
      const testRecommendation = response.data?.recommendations.find((r: string) => 
        r.includes('testing guidelines')
      );
      const apiRecommendation = response.data?.recommendations.find((r: string) => 
        r.includes('API documentation')
      );
      const securityRecommendation = response.data?.recommendations.find((r: string) => 
        r.includes('security documentation')
      );

      expect(tsRecommendation).toBeDefined(); // Because file contains .ts
      expect(testRecommendation).toBeDefined(); // Because file contains 'test'
      expect(apiRecommendation).toBeDefined(); // Because file contains 'api'
      expect(securityRecommendation).toBeDefined(); // Because context contains 'security'
    });

    it('should execute real validation logic for post-work events', async () => {
      const request: HookRequest = {
        event: {
          type: 'post-work',
          data: {
            files: ['src/utils/helpers.ts', 'src/utils/helpers.test.ts', 'docs/README.md'],
            changes: 'Added utility functions with comprehensive tests',
            context: 'Utility enhancement'
          },
          timestamp: new Date().toISOString()
        }
      };

      const response = await service.processHookRequest(request);

      // Verify real validation logic executed
      expect(response.success).toBe(true);
      expect(response.data?.validations).toBeDefined();

      const validations = response.data?.validations;
      
      // Real logic should generate specific validations based on file types
      const lintValidation = validations.find((v: any) => v.type === 'lint');
      const testValidation = validations.find((v: any) => v.type === 'test');
      const docValidation = validations.find((v: any) => v.type === 'documentation');

      expect(lintValidation).toBeDefined(); // Because TypeScript files are present
      expect(lintValidation.message).toContain('TypeScript files need linting');
      
      expect(testValidation).toBeDefined(); // Because test files are present
      expect(testValidation.message).toContain('test files modified');
      
      expect(docValidation).toBeDefined(); // Because .md files are present
      expect(docValidation.status).toBe('completed');
    });

    it('should execute real significance analysis for file-change events', async () => {
      const testCases = [
        {
          filePath: 'package.json',
          expected: true,
          reason: 'configuration file'
        },
        {
          filePath: 'src/api/routes.ts',
          expected: true,
          reason: 'API file'
        },
        {
          filePath: 'prisma/schema.prisma',
          expected: true,
          reason: 'database schema'
        },
        {
          filePath: 'docs/CHANGELOG.md',
          expected: false,
          reason: 'documentation file'
        }
      ];

      for (const testCase of testCases) {
        const request: HookRequest = {
          event: {
            type: 'file-change',
            data: {
              filePath: testCase.filePath,
              changeType: 'change'
            },
            timestamp: new Date().toISOString()
          }
        };

        const response = await service.processHookRequest(request);

        expect(response.success).toBe(true);
        expect(response.data?.significant).toBe(testCase.expected);
        
        // Verify this is real business logic - significance determined by actual file patterns
        console.log(`File: ${testCase.filePath}, Significant: ${response.data?.significant}, Reason: ${testCase.reason}`);
      }
    });

    it('should execute real session summary generation logic', async () => {
      const startTime = new Date(Date.now() - 120000); // 2 minutes ago
      
      const request: HookRequest = {
        event: {
          type: 'session-end',
          data: {
            sessionId: 'test-session-123',
            startTime: startTime.toISOString(),
            filesModified: ['file1.ts', 'file2.js', 'file3.md']
          },
          timestamp: new Date().toISOString()
        }
      };

      const response = await service.processHookRequest(request);

      expect(response.success).toBe(true);
      expect(response.data?.summary).toBeDefined();

      const summary = response.data?.summary;
      
      // Verify real calculation logic executed
      expect(summary.duration).toBeGreaterThanOrEqual(1); // Should be ~2 minutes
      expect(summary.duration).toBeLessThanOrEqual(3); // Allow for test execution time
      expect(summary.filesModified).toBe(3); // Actual count from data
      expect(summary.eventsProcessed).toBeGreaterThanOrEqual(0); // Real event counting
    });

    it('should execute real git hook generation logic', async () => {
      // Reset file system to capture calls
      fileSystem.reset();
      
      const result = await service.setupGitHooks();

      expect(result).toBe(true);

      // Verify real business logic executed - actual file operations called
      const writeFilesSyncCalls = fileSystem.calls.filter(call => call.method === 'writeFileSync');
      expect(writeFilesSyncCalls).toHaveLength(2);

      // Verify real git hook content generation
      const preCommitCall = writeFilesSyncCalls.find(call => 
        call.args[0].includes('pre-commit')
      );
      const postCommitCall = writeFilesSyncCalls.find(call => 
        call.args[0].includes('post-commit')
      );

      expect(preCommitCall).toBeDefined();
      expect(postCommitCall).toBeDefined();

      // Verify actual hook content is generated (not mocked)
      expect(preCommitCall?.args[1]).toContain('CastPlan Automation Pre-commit Hook');
      expect(preCommitCall?.args[1]).toContain('changed_files=$(git diff --cached --name-only)');
      
      expect(postCommitCall?.args[1]).toContain('CastPlan Automation Post-commit Hook');
      expect(postCommitCall?.args[1]).toContain('changed_files=$(git diff-tree --no-commit-id --name-only -r HEAD)');
    });

    it('should execute real file watching setup with dependency injection', async () => {
      watcherFactory.reset();

      await service.startFileWatching(['**/*.custom']);

      // Verify real watcher factory was called with real configuration
      expect(watcherFactory.calls).toHaveLength(1);
      expect(watcherFactory.calls[0].method).toBe('watch');
      expect(watcherFactory.calls[0].args[0]).toEqual(['**/*.custom']);
      
      const watchOptions = watcherFactory.calls[0].args[1];
      expect(watchOptions.persistent).toBe(true);
      expect(watchOptions.ignoreInitial).toBe(true);
      expect(watchOptions.cwd).toBe('/test/project');

      // Verify real event handlers are registered
      const watcher = watcherFactory.lastWatcher!;
      expect(watcher.handlers.has('add')).toBe(true);
      expect(watcher.handlers.has('change')).toBe(true);
      expect(watcher.handlers.has('unlink')).toBe(true);
      expect(watcher.handlers.has('error')).toBe(true);

      // Verify real event handling by triggering file system event
      const emitSpy = jest.spyOn(service, 'emit');
      
      // Trigger a file system event through the real handler
      watcher.trigger('add', 'src/new-file.ts');

      // Verify real event processing occurred
      expect(emitSpy).toHaveBeenCalledWith('file-change', expect.objectContaining({
        filePath: '/test/project/src/new-file.ts', // Real path resolution
        changeType: 'add'
      }));
    });
  });

  describe('Coverage Verification', () => {
    it('should execute file notification logic with real path operations', async () => {
      pathAdapter.reset();
      fileSystem.reset();

      const request: HookRequest = {
        event: {
          type: 'pre-work',
          data: { files: ['test.ts'], context: 'test' },
          timestamp: new Date().toISOString()
        },
        config: {
          notifications: {
            enabled: true,
            channels: ['file' as 'file'],
            logFile: '/custom/logs/hooks.log'
          }
        }
      };

      await service.processHookRequest(request);

      // Verify real path operations executed
      const dirnameCalls = pathAdapter.calls.filter(call => call.method === 'dirname');
      expect(dirnameCalls.length).toBeGreaterThan(0);
      
      // Verify real file operations executed
      const appendCalls = fileSystem.calls.filter(call => call.method === 'appendFileSync');
      expect(appendCalls).toHaveLength(1);
      expect(appendCalls[0].args[0]).toBe('/custom/logs/hooks.log');
      expect(appendCalls[0].args[1]).toContain('[PRE-WORK]');
    });
  });
});