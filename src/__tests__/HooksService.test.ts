import { HooksService } from '../services/HooksService';
import { HookEvent, HookRequest, HookResponse, FileWatchConfig, NotificationConfig } from '../types/hooks.types';
import { FileSystemAdapter, PathAdapter, WatcherFactory, WatcherInstance } from '../interfaces/dependencies';
import { EventEmitter } from 'events';

// Test fixtures and mock implementations
interface TestFixtures {
  projectRoot: string;
  mockFileSystem: jest.Mocked<FileSystemAdapter>;
  mockPathAdapter: jest.Mocked<PathAdapter>;
  mockWatcherFactory: jest.Mocked<WatcherFactory>;
  mockWatcher: jest.Mocked<WatcherInstance>;
  sampleHookEvent: HookEvent;
  sampleHookRequest: HookRequest;
  sampleFileWatchConfig: FileWatchConfig;
  sampleNotificationConfig: NotificationConfig;
}

// Mock implementations for dependency injection
class MockFileSystem implements FileSystemAdapter {
  existsSync = jest.fn();
  writeFileSync = jest.fn();
  appendFileSync = jest.fn();
  mkdirSync = jest.fn();
  chmodSync = jest.fn();
}

class MockPathAdapter implements PathAdapter {
  join = jest.fn((...args) => args.join('/'));
  resolve = jest.fn((...args) => args.join('/'));
  dirname = jest.fn((p) => p.split('/').slice(0, -1).join('/'));
}

class MockWatcherInstance implements WatcherInstance {
  on = jest.fn().mockReturnThis();
  close = jest.fn().mockResolvedValue(undefined);
}

class MockWatcherFactory implements WatcherFactory {
  watch = jest.fn();
}

class TestDataBuilder {
  static createHookEvent(overrides: Partial<HookEvent> = {}): HookEvent {
    return {
      type: 'pre-work',
      data: { files: ['test.ts'], context: 'Test context' },
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }

  static createHookRequest(overrides: Partial<HookRequest> = {}): HookRequest {
    return {
      event: TestDataBuilder.createHookEvent(),
      config: {
        enabled: true,
        gitIntegration: true
      },
      ...overrides
    };
  }

  static createFileWatchConfig(overrides: Partial<FileWatchConfig> = {}): FileWatchConfig {
    return {
      patterns: ['**/*.ts', '**/*.js'],
      ignored: ['**/node_modules/**'],
      persistent: true,
      ignoreInitial: true,
      ...overrides
    };
  }
}

// No module-level mocks - using dependency injection instead

describe('HooksService', () => {
  let service: HooksService;
  let fixtures: TestFixtures;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    const mockFileSystem = new MockFileSystem();
    const mockPathAdapter = new MockPathAdapter();
    const mockWatcherFactory = new MockWatcherFactory();
    const mockWatcher = new MockWatcherInstance();

    // Setup mock behaviors
    mockFileSystem.existsSync.mockReturnValue(true);
    mockWatcherFactory.watch.mockReturnValue(mockWatcher);

    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Create test fixtures
    fixtures = {
      projectRoot: '/test/project',
      mockFileSystem: mockFileSystem as jest.Mocked<FileSystemAdapter>,
      mockPathAdapter: mockPathAdapter as jest.Mocked<PathAdapter>,
      mockWatcherFactory: mockWatcherFactory as jest.Mocked<WatcherFactory>,
      mockWatcher: mockWatcher as jest.Mocked<WatcherInstance>,
      sampleHookEvent: TestDataBuilder.createHookEvent(),
      sampleHookRequest: TestDataBuilder.createHookRequest(),
      sampleFileWatchConfig: TestDataBuilder.createFileWatchConfig(),
      sampleNotificationConfig: {
        enabled: true,
        channels: ['console'],
        logFile: '/test/logs/hooks.log'
      }
    };

    // Create service with dependency injection
    service = new HooksService(fixtures.projectRoot, {
      fileSystem: fixtures.mockFileSystem,
      pathAdapter: fixtures.mockPathAdapter,
      watcherFactory: fixtures.mockWatcherFactory
    });
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with project root and default configuration', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EventEmitter);
    });

    it('should setup default configuration', async () => {
      const config = await service.getConfig();
      
      expect(config).toHaveProperty('fileWatch');
      expect(config).toHaveProperty('notifications');
      expect(config).toHaveProperty('gitIntegration');
      expect(config.fileWatch.patterns).toContain('**/*.ts');
      expect(config.fileWatch.patterns).toContain('**/*.tsx');
      expect(config.notifications.enabled).toBe(true);
    });

    it('should setup event handlers', () => {
      const eventNames = service.eventNames();
      expect(eventNames).toContain('file-change');
      expect(eventNames).toContain('pre-work');
      expect(eventNames).toContain('post-work');
      expect(eventNames).toContain('session-start');
      expect(eventNames).toContain('session-end');
    });
  });

  describe('processHookRequest', () => {
    it('should process a valid hook request successfully', async () => {
      const request = TestDataBuilder.createHookRequest({
        event: TestDataBuilder.createHookEvent({
          type: 'pre-work',
          data: { files: ['src/test.ts'], context: 'Testing pre-work hook' }
        })
      });

      const response = await service.processHookRequest(request);

      expect(response).toMatchObject({
        success: true,
        message: expect.stringContaining('Pre-work hooks processed'),
        data: expect.objectContaining({
          files: ['src/test.ts'],
          context: 'Testing pre-work hook'
        })
      });
    });

    it('should handle different event types correctly', async () => {
      const eventTestCases = [
        {
          type: 'pre-work' as const,
          data: { files: ['test.ts'], context: 'test' }
        },
        {
          type: 'post-work' as const,
          data: { files: ['test.ts'], changes: 'test changes', context: 'test' }
        },
        {
          type: 'file-change' as const,
          data: { filePath: 'test.ts', changeType: 'change' }
        },
        {
          type: 'session-start' as const,
          data: { sessionId: 'test-session' }
        },
        {
          type: 'session-end' as const,
          data: { sessionId: 'test-session', startTime: new Date().toISOString() }
        }
      ];

      for (const testCase of eventTestCases) {
        const request = TestDataBuilder.createHookRequest({
          event: TestDataBuilder.createHookEvent(testCase)
        });

        const response = await service.processHookRequest(request);
        expect(response.success).toBe(true);
        expect(response.message).toBeDefined();
      }
    });

    it('should update configuration when provided', async () => {
      const newConfig = {
        notifications: { enabled: false, channels: ['file' as 'file'] },
        gitIntegration: false
      };
      
      const request = TestDataBuilder.createHookRequest({ config: newConfig });
      await service.processHookRequest(request);

      const updatedConfig = await service.getConfig();
      expect(updatedConfig.notifications.enabled).toBe(false);
      expect(updatedConfig.gitIntegration).toBe(false);
    });

    it('should handle processing errors gracefully', async () => {
      const invalidRequest = {
        event: {
          type: 'invalid-type' as any,
          data: {},
          timestamp: new Date().toISOString()
        }
      };

      const response = await service.processHookRequest(invalidRequest);

      expect(response).toMatchObject({
        success: false,
        message: expect.stringContaining('Hook processing failed')
      });
    });
  });

  describe('file watching functionality', () => {
    it('should start file watching with default patterns', async () => {
      await service.startFileWatching();

      expect(fixtures.mockWatcherFactory.watch).toHaveBeenCalledWith(
        expect.arrayContaining(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']),
        expect.objectContaining({
          ignored: expect.arrayContaining(['**/node_modules/**', '**/dist/**']),
          persistent: true,
          ignoreInitial: true,
          cwd: fixtures.projectRoot
        })
      );

      expect(fixtures.mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(fixtures.mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(fixtures.mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(fixtures.mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should start file watching with custom patterns', async () => {
      const customPatterns = ['**/*.custom', '**/*.special'];
      await service.startFileWatching(customPatterns);

      expect(fixtures.mockWatcherFactory.watch).toHaveBeenCalledWith(
        customPatterns,
        expect.any(Object)
      );
    });

    it('should stop file watching and cleanup watchers', async () => {
      await service.startFileWatching();
      const activeWatchersBefore = await service.getActiveWatchers();
      expect(activeWatchersBefore).toContain('main');

      await service.stopFileWatching();
      
      expect(fixtures.mockWatcher.close).toHaveBeenCalled();
      const activeWatchersAfter = await service.getActiveWatchers();
      expect(activeWatchersAfter).toHaveLength(0);
    });

    it('should handle file system events and emit internal events', async () => {
      await service.startFileWatching();
      
      // Get the file change handler that was registered
      const addHandler = fixtures.mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
      expect(addHandler).toBeDefined();

      // Test event emission
      const eventSpy = jest.spyOn(service, 'emit');
      await addHandler?.('src/new-file.ts');

      expect(eventSpy).toHaveBeenCalledWith('file-change', expect.objectContaining({
        filePath: expect.stringContaining('src/new-file.ts'),
        changeType: 'add'
      }));
    });
  });

  describe('event processing', () => {
    describe('pre-work events', () => {
      it('should process pre-work events and generate recommendations', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'pre-work',
          data: {
            files: ['src/components/Button.tsx', 'src/api/users.ts'],
            context: 'Implementing user authentication'
          }
        });

        const eventSpy = jest.spyOn(service, 'emit');
        const response = await service.processHookRequest({ event });

        expect(response.success).toBe(true);
        expect(response.data?.recommendations).toBeDefined();
        expect(response.data?.recommendations).toEqual(
          expect.arrayContaining([
            expect.stringContaining('TypeScript best practices'),
            expect.stringContaining('API documentation')
          ])
        );
        expect(eventSpy).toHaveBeenCalledWith('pre-work', expect.objectContaining({
          files: event.data.files,
          context: event.data.context
        }));
      });
    });

    describe('post-work events', () => {
      it('should process post-work events and run validations', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'post-work',
          data: {
            files: ['src/components/Button.test.tsx', 'src/utils/validation.ts'],
            changes: 'Added input validation and tests',
            context: 'Completed validation implementation'
          }
        });

        const eventSpy = jest.spyOn(service, 'emit');
        const response = await service.processHookRequest({ event });

        expect(response.success).toBe(true);
        expect(response.data?.validations).toBeDefined();
        expect(response.data?.validations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: 'lint' }),
            expect.objectContaining({ type: 'test' })
          ])
        );
        expect(eventSpy).toHaveBeenCalledWith('post-work', expect.any(Object));
      });
    });

    describe('file-change events', () => {
      it('should process file change events and determine significance', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'file-change',
          data: {
            filePath: 'package.json',
            changeType: 'change'
          }
        });

        const eventSpy = jest.spyOn(service, 'emit');
        const response = await service.processHookRequest({ event });

        expect(response.success).toBe(true);
        expect(response.data?.significant).toBe(true); // package.json changes are significant
        expect(eventSpy).toHaveBeenCalledWith('file-change', expect.objectContaining({
          filePath: 'package.json',
          changeType: 'change'
        }));
      });

      it('should identify non-significant changes correctly', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'file-change',
          data: {
            filePath: 'docs/README.md',
            changeType: 'change'
          }
        });

        const response = await service.processHookRequest({ event });
        expect(response.data?.significant).toBe(false);
      });
    });

    describe('session events', () => {
      it('should handle session start events', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'session-start',
          data: {
            sessionId: 'test-session-123',
            user: 'developer',
            timestamp: new Date().toISOString()
          }
        });

        const eventSpy = jest.spyOn(service, 'emit');
        const response = await service.processHookRequest({ event });

        expect(response.success).toBe(true);
        expect(response.data).toEqual(event.data);
        expect(eventSpy).toHaveBeenCalledWith('session-start', expect.any(Object));
      });

      it('should handle session end events and generate summary', async () => {
        const event = TestDataBuilder.createHookEvent({
          type: 'session-end',
          data: {
            sessionId: 'test-session-123',
            startTime: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
            filesModified: ['file1.ts', 'file2.js']
          }
        });

        const response = await service.processHookRequest({ event });

        expect(response.success).toBe(true);
        expect(response.data?.summary).toBeDefined();
        expect(response.data?.summary).toMatchObject({
          duration: expect.any(Number),
          filesModified: expect.any(Number)
        });
      });
    });
  });

  describe('git integration', () => {
    it('should setup git hooks when git integration is enabled', async () => {
      fixtures.mockFileSystem.existsSync.mockReturnValue(true);
      
      const result = await service.setupGitHooks();
      
      expect(result).toBe(true);
      expect(fixtures.mockFileSystem.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fixtures.mockFileSystem.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('pre-commit'),
        expect.stringContaining('CastPlan Automation Pre-commit Hook')
      );
      expect(fixtures.mockFileSystem.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('post-commit'),
        expect.stringContaining('CastPlan Automation Post-commit Hook')
      );
    });

    it('should handle missing .git directory gracefully', async () => {
      fixtures.mockFileSystem.existsSync.mockReturnValue(false);
      
      const result = await service.setupGitHooks();
      
      expect(result).toBe(false);
      expect(fixtures.mockFileSystem.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle git hook setup errors', async () => {
      fixtures.mockFileSystem.existsSync.mockReturnValue(true);
      fixtures.mockFileSystem.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.setupGitHooks();
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to setup git hooks:',
        expect.any(Error)
      );
    });

    it('should set proper file permissions on Unix systems', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      
      // Mock all required fs operations
      fixtures.mockFileSystem.existsSync.mockReturnValue(true);
      fixtures.mockFileSystem.writeFileSync.mockImplementation(() => {});
      fixtures.mockFileSystem.chmodSync.mockImplementation(() => {});
      
      const result = await service.setupGitHooks();
      
      expect(result).toBe(true);
      expect(fixtures.mockFileSystem.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('pre-commit'),
        0o755
      );
      expect(fixtures.mockFileSystem.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('post-commit'),
        0o755
      );
      
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });

  describe('public API methods', () => {
    it('should return event history', async () => {
      const request = TestDataBuilder.createHookRequest();
      await service.processHookRequest(request);
      
      const history = await service.getEventHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject(request.event);
    });

    it('should return active watchers', async () => {
      const watchersBefore = await service.getActiveWatchers();
      expect(watchersBefore).toHaveLength(0);
      
      await service.startFileWatching();
      const watchersAfter = await service.getActiveWatchers();
      expect(watchersAfter).toContain('main');
    });

    it('should return configuration', async () => {
      const config = await service.getConfig();
      
      expect(config).toHaveProperty('fileWatch');
      expect(config).toHaveProperty('notifications');
      expect(config).toHaveProperty('gitIntegration');
      expect(config.fileWatch).toMatchObject({
        patterns: expect.any(Array),
        ignored: expect.any(Array),
        persistent: expect.any(Boolean)
      });
    });

    it('should update notification configuration', async () => {
      const newNotificationConfig: Partial<NotificationConfig> = {
        enabled: false,
        channels: ['file']
      };
      
      await service.updateNotificationConfig(newNotificationConfig);
      const config = await service.getConfig();
      
      expect(config.notifications.enabled).toBe(false);
      expect(config.notifications.channels).toEqual(['file']);
    });

    it('should update file watch configuration and restart watching', async () => {
      const newFileWatchConfig: Partial<FileWatchConfig> = {
        patterns: ['**/*.custom'],
        persistent: false
      };
      
      // Start watching first
      await service.startFileWatching();
      expect(fixtures.mockWatcherFactory.watch).toHaveBeenCalledTimes(1);
      
      // Update config
      await service.updateFileWatchConfig(newFileWatchConfig);
      
      // Should have stopped and restarted watching
      expect(fixtures.mockWatcher.close).toHaveBeenCalled();
      expect(fixtures.mockWatcherFactory.watch).toHaveBeenCalledTimes(2);
      expect(fixtures.mockWatcherFactory.watch).toHaveBeenLastCalledWith(
        ['**/*.custom'],
        expect.objectContaining({ persistent: false })
      );
    });
  });

  describe('notification system', () => {
    it('should send console notifications when enabled', async () => {
      const config = { notifications: { enabled: true, channels: ['console' as 'console'] } };
      const request = TestDataBuilder.createHookRequest({ config });
      
      await service.processHookRequest(request);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRE-WORK')
      );
    });

    it('should write file notifications when enabled', async () => {
      const logFile = '/test/logs/hooks.log';
      const config = { 
        notifications: { 
          enabled: true, 
          channels: ['file' as 'file'],
          logFile 
        } 
      };
      const request = TestDataBuilder.createHookRequest({ config });
      
      await service.processHookRequest(request);
      
      expect(fixtures.mockFileSystem.appendFileSync).toHaveBeenCalledWith(
        logFile,
        expect.stringContaining('PRE-WORK')
      );
    });

    it('should create log directory if it does not exist', async () => {
      fixtures.mockFileSystem.existsSync.mockReturnValue(false);
      const logFile = '/test/logs/hooks.log';
      const config = { 
        notifications: { 
          enabled: true, 
          channels: ['file' as 'file'],
          logFile 
        } 
      };
      const request = TestDataBuilder.createHookRequest({ config });
      
      await service.processHookRequest(request);
      
      expect(fixtures.mockFileSystem.mkdirSync).toHaveBeenCalledWith('/test/logs', { recursive: true });
    });

    it('should handle file writing errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      fixtures.mockFileSystem.appendFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const config = { 
        notifications: { 
          enabled: true, 
          channels: ['file' as 'file'],
          logFile: '/test/logs/hooks.log'
        } 
      };
      const request = TestDataBuilder.createHookRequest({ config });
      
      await service.processHookRequest(request);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to write to log file:',
        'Write failed'
      );
    });

    it('should not send notifications when disabled', async () => {
      // Mock console.log calls from event handlers separately
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { notifications: { enabled: false, channels: [] as ('console' | 'file' | 'webhook')[] } };
      const request = TestDataBuilder.createHookRequest({ config });
      
      await service.processHookRequest(request);
      
      // Check that notification-related console calls weren't made
      // (but allow event handler console calls)
      const notificationCalls = mockConsoleLog.mock.calls.filter(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('[PRE-WORK]')
      );
      expect(notificationCalls).toHaveLength(0);
      expect(fixtures.mockFileSystem.appendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed event data gracefully', async () => {
      const malformedRequest = {
        event: {
          type: 'pre-work' as const,
          data: { files: null, context: undefined },
          timestamp: new Date().toISOString()
        }
      };
      
      const response = await service.processHookRequest(malformedRequest);
      
      expect(response.success).toBe(true); // Should handle gracefully
      expect(response.data?.files).toEqual([]);
    });

    it('should limit event history to prevent memory leaks', async () => {
      // Process more than 1000 events
      for (let i = 0; i < 1005; i++) {
        const request = TestDataBuilder.createHookRequest({
          event: TestDataBuilder.createHookEvent({ 
            data: { eventNumber: i } 
          })
        });
        await service.processHookRequest(request);
      }
      
      const history = await service.getEventHistory();
      expect(history).toHaveLength(1000); // Should be limited to 1000
      expect(history[0].data.eventNumber).toBe(5); // Should keep the latest 1000
    });

    it('should handle chokidar errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await service.startFileWatching();
      
      // Get the error handler that was registered
      const errorHandler = fixtures.mockWatcher.on.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();
      
      // Trigger error
      const testError = new Error('Watcher error');
      errorHandler?.(testError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('File watcher error:', testError);
    });
  });
});