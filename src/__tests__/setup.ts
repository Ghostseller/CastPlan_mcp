/**
 * Global test setup file for Jest
 * Handles memory optimization, cleanup, and consistent test environment
 */

// Memory optimization: Set reasonable limits
if (typeof global.gc === 'function') {
  // Enable garbage collection if available
  global.gc();
}

// Increase max listeners to prevent warnings during parallel tests
process.setMaxListeners(50);

// Global timeout for all async operations
jest.setTimeout(15000);

// Mock console methods in test environment to reduce noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress specific warnings that are expected in test environment
  console.error = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress sqlite3 and common test warnings
      if (
        message.includes('sqlite3') ||
        message.includes('DeprecationWarning') ||
        message.includes('ExperimentalWarning') ||
        message.includes('Jest worker encountered') ||
        message.includes('Detected open handles')
      ) {
        return;
      }
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress common test warnings
      if (
        message.includes('sqlite3') ||
        message.includes('deprecated') ||
        message.includes('experimental')
      ) {
        return;
      }
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Global cleanup after each test suite
afterEach(async () => {
  // Clear all timers to prevent memory leaks
  jest.clearAllTimers();
  
  // Clear all mocks to ensure test isolation
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (typeof global.gc === 'function') {
    global.gc();
  }
  
  // Small delay to allow cleanup
  await new Promise(resolve => setTimeout(resolve, 10));
});

// Global error handler to prevent unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in test environment, just log
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in test environment, just log
});

// Memory monitoring (optional, for debugging)
const shouldMonitorMemory = process.env.JEST_MONITOR_MEMORY === 'true';

if (shouldMonitorMemory) {
  let testCount = 0;
  
  beforeEach(() => {
    testCount++;
    if (testCount % 10 === 0) {
      const used = process.memoryUsage();
      console.log(`Memory usage after ${testCount} tests:`, {
        rss: Math.round(used.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(used.external / 1024 / 1024) + 'MB'
      });
    }
  });
}

// Export common test utilities
export const testUtils = {
  /**
   * Wait for a specified number of milliseconds
   */
  wait: (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a mock logger for testing
   */
  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  
  /**
   * Clean up resources safely
   */
  cleanup: async (...cleanupFunctions: Array<() => Promise<void> | void>) => {
    for (const cleanup of cleanupFunctions) {
      try {
        await cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    }
  },
  
  /**
   * Force garbage collection if available
   */
  forceGC: () => {
    if (typeof global.gc === 'function') {
      global.gc();
    }
  }
};

// Global constants for tests
export const TEST_CONSTANTS = {
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 15000
  },
  MEMORY_LIMITS: {
    WORKER: '256MB',
    HEAP: '2048MB'
  },
  DATES: {
    FIXED_NOW: '2024-01-15T10:00:00.000Z',
    FIXED_FUTURE: '2024-12-31T23:59:59.999Z',
    FIXED_PAST: '2023-01-01T00:00:00.000Z'
  }
};

// Set up fake timers globally if needed
export const setupFakeTimers = () => {
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate']
  });
};

export const restoreRealTimers = () => {
  jest.useRealTimers();
};

// Database cleanup utility
export const cleanupDatabase = async (dbConnection: any) => {
  if (dbConnection && typeof dbConnection.close === 'function') {
    try {
      await new Promise<void>((resolve, reject) => {
        dbConnection.close((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.warn('Database cleanup failed:', error);
    }
  }
};

// File system cleanup utility
export const cleanupTempFiles = async (filePaths: string[]) => {
  const fs = await import('fs/promises');
  
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore file not found errors
      if ((error as any).code !== 'ENOENT') {
        console.warn(`Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }
};

// Windows-specific path normalization
export const normalizePath = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};

// Enhanced error assertion utility
export const expectError = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp | Error
): Promise<Error> => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error, but it didn\'t');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect((error as Error).message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect((error as Error).message).toMatch(expectedError);
      } else if (expectedError instanceof Error) {
        expect((error as Error).message).toBe(expectedError.message);
      }
    }
    return error as Error;
  }
};