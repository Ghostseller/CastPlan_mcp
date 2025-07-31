/**
 * Test Utilities and Helpers
 * 
 * Comprehensive testing utilities for achieving 100% coverage
 */

import { Logger } from 'winston';
import * as winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Test Data Factories
export class TestDataFactory {
  static createMockTask(overrides: Partial<any> = {}) {
    return {
      id: uuidv4(),
      title: 'Test Task',
      description: 'Test task description',
      status: 'pending',
      priority: 'medium',
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockAgent(overrides: Partial<any> = {}) {
    return {
      id: uuidv4(),
      name: 'Test Agent',
      role: 'developer',
      skills: ['typescript', 'testing'],
      available: true,
      currentLoad: 0,
      ...overrides
    };
  }

  static createMockDocument(overrides: Partial<any> = {}) {
    return {
      id: uuidv4(),
      title: 'Test Document',
      filePath: '/test/path/document.md',
      state: 'draft',
      category: 'component',
      lastModified: new Date().toISOString(),
      version: 1,
      ...overrides
    };
  }

  static createMockConnection(overrides: Partial<any> = {}) {
    return {
      id: uuidv4(),
      workType: 'frontend',
      workDescription: 'Test work description',
      filePaths: ['/test/file.ts'],
      connectedDocuments: [],
      connectionStrength: 0.8,
      lastSyncedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockTreeNode(overrides: Partial<any> = {}) {
    return {
      id: uuidv4(),
      documentId: uuidv4(),
      parentId: null,
      treeType: 'master',
      depth: 0,
      position: 0,
      ...overrides
    };
  }

  static createMockHookEvent(overrides: Partial<any> = {}) {
    return {
      type: 'file-change',
      data: {
        filePath: '/test/file.ts',
        changeType: 'modified'
      },
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }
}

// Mock Logger Factory
export class MockLoggerFactory {
  static create(): Logger {
    return winston.createLogger({
      level: 'error', // Reduce noise in tests
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console({
          silent: true // Silent during tests
        })
      ]
    });
  }
}

// File System Utilities for Testing
export class TestFileSystem {
  private static tempDir = path.join(process.cwd(), 'test-temp');

  static async createTempDir(): Promise<string> {
    const tempPath = path.join(this.tempDir, uuidv4());
    await fs.mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  static async createTempFile(dirPath: string, fileName: string, content: string): Promise<string> {
    const filePath = path.join(dirPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  static async cleanupTempDir(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  static async createTestProject(projectName: string): Promise<string> {
    const projectPath = await this.createTempDir();
    
    // Create basic project structure
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'docs'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.git'), { recursive: true });
    
    // Create test files
    await this.createTempFile(projectPath, 'package.json', JSON.stringify({
      name: projectName,
      version: '1.0.0',
      description: 'Test project'
    }, null, 2));
    
    await this.createTempFile(path.join(projectPath, 'src'), 'index.ts', 'export const test = true;');
    await this.createTempFile(path.join(projectPath, 'docs'), 'README.md', '# Test Project\nThis is a test project.');
    
    return projectPath;
  }
}

// Database Testing Utilities
export class TestDatabase {
  static createInMemoryPath(): string {
    return ':memory:';
  }

  static createTempDbPath(): string {
    return path.join(process.cwd(), 'test-temp', `test-${uuidv4()}.db`);
  }
}

// AI Service Mock Factory
export class MockAIServiceFactory {
  static createMockOpenAIService() {
    return {
      analyzeQuality: jest.fn().mockResolvedValue({
        score: 0.85,
        insights: ['Good documentation structure', 'Could use more examples'],
        suggestions: ['Add code examples', 'Improve formatting']
      }),
      
      detectDuplicates: jest.fn().mockResolvedValue({
        score: 0.1,
        insights: ['No significant duplicates found'],
        suggestions: []
      }),
      
      calculateRelevance: jest.fn().mockResolvedValue({
        score: 0.75,
        insights: ['Relevant to current work', 'Good alignment with requirements'],
        suggestions: ['Update after implementation']
      })
    };
  }

  static createMockAnthropicService() {
    return {
      analyzeQuality: jest.fn().mockResolvedValue({
        score: 0.88,
        insights: ['Excellent documentation quality', 'Well-structured content'],
        suggestions: ['Consider adding diagrams']
      }),
      
      detectDuplicates: jest.fn().mockResolvedValue({
        score: 0.05,
        insights: ['Minimal content duplication'],
        suggestions: []
      }),
      
      calculateRelevance: jest.fn().mockResolvedValue({
        score: 0.82,
        insights: ['Highly relevant content', 'Matches work context well'],
        suggestions: ['Keep current approach']
      })
    };
  }
}

// Performance Testing Utilities
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    
    return { result, duration };
  }

  static async measureMemoryUsage<T>(fn: () => Promise<T>): Promise<{ result: T; memoryDelta: number }> {
    const memBefore = process.memoryUsage();
    const result = await fn();
    const memAfter = process.memoryUsage();
    
    const memoryDelta = memAfter.heapUsed - memBefore.heapUsed;
    
    return { result, memoryDelta };
  }

  static createLoadTestData(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-${i}`,
      data: `Test data item ${i}`,
      timestamp: new Date().toISOString()
    }));
  }
}

// Concurrency Testing Utilities
export class ConcurrencyTestUtils {
  static async runConcurrent<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults);
    }
    
    return results;
  }

  static async simulateRaceCondition<T>(
    fn1: () => Promise<T>,
    fn2: () => Promise<T>,
    iterations: number = 100
  ): Promise<{ fn1Wins: number; fn2Wins: number; ties: number }> {
    let fn1Wins = 0;
    let fn2Wins = 0;
    let ties = 0;

    for (let i = 0; i < iterations; i++) {
      const start1 = Date.now();
      const start2 = Date.now();
      
      const [result1, result2] = await Promise.all([fn1(), fn2()]);
      
      const end1 = Date.now();
      const end2 = Date.now();
      
      const duration1 = end1 - start1;
      const duration2 = end2 - start2;
      
      if (duration1 < duration2) {
        fn1Wins++;
      } else if (duration2 < duration1) {
        fn2Wins++;
      } else {
        ties++;
      }
    }

    return { fn1Wins, fn2Wins, ties };
  }
}

// Error Testing Utilities
export class ErrorTestUtils {
  static createNetworkError(message: string = 'Network error') {
    const error = new Error(message);
    (error as any).code = 'NETWORK_ERROR';
    return error;
  }

  static createFileSystemError(message: string = 'File system error', code: string = 'ENOENT') {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  }

  static createDatabaseError(message: string = 'Database error') {
    const error = new Error(message);
    (error as any).code = 'SQLITE_ERROR';
    return error;
  }

  static createValidationError(message: string = 'Validation error', field?: string) {
    const error = new Error(message);
    (error as any).code = 'VALIDATION_ERROR';
    if (field) {
      (error as any).field = field;
    }
    return error;
  }
}

// Test Environment Utilities
export class TestEnvironment {
  static setupTestEnv() {
    process.env.NODE_ENV = 'test';
    process.env.CASTPLAN_PROJECT_ROOT = '/test/root';
    process.env.CASTPLAN_DATABASE_PATH = ':memory:';
    process.env.CASTPLAN_LOG_LEVEL = 'error';
    process.env.CASTPLAN_ENABLE_AI = 'false';
  }

  static restoreEnv() {
    delete process.env.CASTPLAN_PROJECT_ROOT;
    delete process.env.CASTPLAN_DATABASE_PATH;
    delete process.env.CASTPLAN_LOG_LEVEL;
    delete process.env.CASTPLAN_ENABLE_AI;
  }

  static withTestEnv<T>(fn: () => T): T {
    const originalEnv = { ...process.env };
    try {
      this.setupTestEnv();
      return fn();
    } finally {
      process.env = originalEnv;
    }
  }
}

// Assertion Helpers
export class TestAssertions {
  static assertExecutionTime(duration: number, expectedMax: number, message?: string) {
    expect(duration).toBeLessThanOrEqual(expectedMax);
    if (message) {
      console.log(`${message}: ${duration}ms (expected <= ${expectedMax}ms)`);
    }
  }

  static assertMemoryUsage(memoryDelta: number, expectedMax: number, message?: string) {
    expect(memoryDelta).toBeLessThanOrEqual(expectedMax);
    if (message) {
      console.log(`${message}: ${memoryDelta} bytes (expected <= ${expectedMax} bytes)`);
    }
  }

  static assertValidUUID(id: string) {
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }

  static assertValidISODate(dateString: string) {
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(dateString).getTime()).not.toBeNaN();
  }
}