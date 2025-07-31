/**
 * Comprehensive Error Scenario Test Suite
 * 
 * Tests all error scenarios and recovery mechanisms:
 * - Network failures
 * - Database errors
 * - File system issues
 * - Memory pressure
 * - Concurrent operations
 * - Service dependencies
 * - Recovery mechanisms
 */

import { ErrorRecoveryManager } from '../../utils/ErrorRecoveryManager.js';
import { HealthMonitor, BuiltInHealthChecks } from '../../utils/HealthMonitor.js';
import { GracefulDegradationManager } from '../../utils/GracefulDegradation.js';
import { CastPlanUltimateAutomationServer } from '../../index.js';
import * as winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Comprehensive Error Scenario Test Suite', () => {
  let server: CastPlanUltimateAutomationServer;
  let errorRecovery: ErrorRecoveryManager;
  let healthMonitor: HealthMonitor;
  let degradationManager: GracefulDegradationManager;
  let mockLogger: winston.Logger;
  let testDir: string;

  beforeAll(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), '.test-temp', 'error-scenarios');
    await fs.mkdir(testDir, { recursive: true });
    
    // Setup silent logger for testing
    mockLogger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });
  });

  beforeEach(() => {
    errorRecovery = new ErrorRecoveryManager(mockLogger);
    healthMonitor = new HealthMonitor(mockLogger);
    degradationManager = new GracefulDegradationManager(mockLogger);
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Network Error Scenarios', () => {
    test('should handle API timeout with exponential backoff', async () => {
      let callCount = 0;
      const timeoutOperation = async () => {
        callCount++;
        if (callCount <= 3) {
          const error = new Error('Request timeout');
          (error as any).code = 'ETIMEDOUT';
          throw error;
        }
        return { status: 'success', attempt: callCount };
      };

      const startTime = Date.now();
      const result = await errorRecovery.executeWithRecovery(
        timeoutOperation,
        'api-timeout-test',
        {
          retryConfig: {
            maxAttempts: 4,
            baseDelay: 100,
            maxDelay: 2000,
            jitter: false,
            exponentialBase: 2
          }
        }
      );

      const duration = Date.now() - startTime;
      
      expect(result.status).toBe('success');
      expect(callCount).toBe(4);
      expect(duration).toBeGreaterThan(700); // Should have delays: 100 + 200 + 400 = 700ms
    });

    test('should activate circuit breaker on repeated network failures', async () => {
      const networkFailure = async () => {
        throw new Error('Network unreachable');
      };

      // Trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await errorRecovery.executeWithRecovery(
            networkFailure,
            'network-circuit-test',
            {
              circuitBreakerConfig: {
                failureThreshold: 3,
                timeout: 1000,
                monitoringPeriod: 1000,
                resetTimeout: 2000
              }
            }
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Verify circuit breaker is open
      const health = errorRecovery.getHealthStatus();
      const circuitMetrics = health.circuitBreakers['network-circuit-test'];
      expect(circuitMetrics.state).toBe('OPEN');
    });

    test('should fallback gracefully when external API is unavailable', async () => {
      const unavailableAPI = async () => {
        throw new Error('Service unavailable');
      };

      const fallbackResponse = async () => ({
        status: 'fallback',
        message: 'Using cached data',
        data: { cached: true }
      });

      const result = await errorRecovery.executeWithRecovery(
        unavailableAPI,
        'api-fallback-test',
        {
          enableGracefulDegradation: true,
          fallbackFunction: fallbackResponse
        }
      );

      expect(result.status).toBe('fallback');
      expect(result.data.cached).toBe(true);
    });
  });

  describe('Database Error Scenarios', () => {
    test('should handle SQLite database lock errors', async () => {
      let lockCount = 0;
      const databaseOperation = async () => {
        lockCount++;
        if (lockCount <= 2) {
          const error = new Error('database is locked');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }
        return { id: 'doc-123', updated: true };
      };

      const result = await errorRecovery.executeWithRecovery(
        databaseOperation,
        'database-lock-test',
        {
          retryConfig: {
            maxAttempts: 3,
            baseDelay: 200,
            maxDelay: 1000,
            jitter: true,
            exponentialBase: 2
          }
        }
      );

      expect(result.id).toBe('doc-123');
      expect(lockCount).toBe(3);
    });

    test('should detect database corruption and trigger critical alert', async () => {
      const corruptDatabase = async () => {
        const error = new Error('database disk image is malformed');
        (error as any).code = 'SQLITE_CORRUPT';
        throw error;
      };

      // Setup health monitor with database check
      healthMonitor.registerHealthCheck('database', async () => {
        try {
          await corruptDatabase();
          return {
            status: 'HEALTHY' as any,
            latency: 0,
            message: 'Database OK',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'CRITICAL' as any,
            latency: 0,
            message: `Database error: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });

      healthMonitor.start();
      
      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = healthMonitor.getHealthStatus();
      const dbService = health.services.find(s => s.name === 'database');
      
      expect(dbService?.status).toBe('CRITICAL');
      
      healthMonitor.stop();
    });

    test('should handle concurrent database access with proper queuing', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;
      
      const concurrentDatabaseOp = async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCount--;
        return { processed: true };
      };

      // Execute multiple concurrent operations
      const operations = Array.from({ length: 10 }, () =>
        errorRecovery.executeWithRecovery(
          concurrentDatabaseOp,
          'concurrent-db-test'
        )
      );

      const results = await Promise.all(operations);
      
      expect(results.every(r => r.processed)).toBe(true);
      expect(maxConcurrent).toBeLessThanOrEqual(5); // Should limit concurrency
    });
  });

  describe('File System Error Scenarios', () => {
    test('should handle permission denied errors appropriately', async () => {
      const permissionDenied = async () => {
        const error = new Error('permission denied');
        (error as any).code = 'EACCES';
        throw error;
      };

      // Permission errors should not be retried
      let attempts = 0;
      try {
        await errorRecovery.executeWithRecovery(
          async () => {
            attempts++;
            return await permissionDenied();
          },
          'permission-test',
          {
            retryConfig: { maxAttempts: 3, baseDelay: 100, maxDelay: 1000, jitter: false, exponentialBase: 2 }
          }
        );
      } catch (error: any) {
        expect(error.message).toBe('permission denied');
        expect(attempts).toBe(1); // Should not retry
      }
    });

    test('should detect disk space issues', async () => {
      const diskFullError = async () => {
        const error = new Error('no space left on device');
        (error as any).code = 'ENOSPC';
        throw error;
      };

      healthMonitor.registerHealthCheck('filesystem', async () => {
        try {
          await diskFullError();
          return {
            status: 'HEALTHY' as any,
            latency: 0,
            message: 'File system OK',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'CRITICAL' as any,
            latency: 0,
            message: `File system error: ${(error as Error).message}`,
            timestamp: new Date()
          };
        }
      });

      healthMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = healthMonitor.getHealthStatus();
      const fsService = health.services.find(s => s.name === 'filesystem');
      
      expect(fsService?.status).toBe('CRITICAL');
      
      healthMonitor.stop();
    });

    test('should handle file not found with appropriate fallback', async () => {
      const fileNotFound = async () => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      };

      const createFallbackFile = async () => ({
        content: 'fallback content',
        source: 'default'
      });

      const result = await errorRecovery.executeWithRecovery(
        fileNotFound,
        'file-not-found-test',
        {
          enableGracefulDegradation: true,
          fallbackFunction: createFallbackFile
        }
      );

      expect(result.source).toBe('default');
      expect(result.content).toBe('fallback content');
    });
  });

  describe('Memory Pressure Scenarios', () => {
    test('should detect high memory usage', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 800 * 1024 * 1024, // 800MB
        heapUsed: 600 * 1024 * 1024, // 600MB (above 512MB threshold)
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      });

      healthMonitor.registerHealthCheck(
        'memory',
        BuiltInHealthChecks.createMemoryHealthCheck(512)
      );

      healthMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = healthMonitor.getHealthStatus();
      const memoryService = health.services.find(s => s.name === 'memory');
      
      expect(['UNHEALTHY', 'CRITICAL']).toContain(memoryService?.status);
      
      healthMonitor.stop();
      process.memoryUsage = originalMemoryUsage;
    });

    test('should trigger memory cleanup on OutOfMemory errors', async () => {
      let cleanupCalled = false;
      const memoryPressureOp = async () => {
        const error = new Error('JavaScript heap out of memory');
        (error as any).code = 'ERR_OUT_OF_MEMORY';
        throw error;
      };

      const memoryCleanup = async () => {
        cleanupCalled = true;
        return { cleaned: true, status: 'recovered' };
      };

      const result = await errorRecovery.executeWithRecovery(
        memoryPressureOp,
        'memory-pressure-test',
        {
          enableGracefulDegradation: true,
          fallbackFunction: memoryCleanup
        }
      );

      expect(cleanupCalled).toBe(true);
      expect(result.status).toBe('recovered');
    });
  });

  describe('Service Dependency Scenarios', () => {
    test('should handle AI service unavailability with graceful degradation', async () => {
      degradationManager.registerService({
        name: 'ai-service',
        essential: false,
        fallbackAvailable: true,
        degradationThreshold: 2,
        recoveryThreshold: 3
      });

      degradationManager.registerFeature('ai-analysis', {
        enabled: true,
        degradationLevel: 1,
        fallback: async () => ({
          score: null,
          insights: ['AI unavailable'],
          suggestions: ['Manual review required']
        })
      });

      // Simulate AI service failures
      for (let i = 0; i < 3; i++) {
        degradationManager.recordServiceResult('ai-service', false);
      }

      const result = await degradationManager.executeWithFallback(
        'ai-analysis',
        async () => {
          throw new Error('AI service down');
        },
        async () => ({
          score: null,
          insights: ['AI unavailable - using fallback'],
          suggestions: ['Check AI service status']
        })
      );

      expect(result.insights[0]).toContain('AI unavailable');
      expect(degradationManager.isFeatureEnabled('ai-analysis')).toBe(false);
    });

    test('should cascade failures appropriately', async () => {
      // Setup dependent services
      degradationManager.registerService({
        name: 'primary-service',
        essential: true,
        fallbackAvailable: false,
        degradationThreshold: 2,
        recoveryThreshold: 3
      });

      degradationManager.registerService({
        name: 'dependent-service',
        essential: false,
        fallbackAvailable: true,
        degradationThreshold: 1,
        recoveryThreshold: 2
      });

      // Simulate primary service failure
      degradationManager.recordServiceResult('primary-service', false);
      degradationManager.recordServiceResult('primary-service', false);

      // This should trigger degradation
      const status = degradationManager.getSystemStatus();
      expect(status.degradationLevel).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Error Scenarios', () => {
    test('should handle race conditions in error recovery', async () => {
      let sharedResource = 0;
      const racyOperation = async () => {
        const current = sharedResource;
        await new Promise(resolve => setTimeout(resolve, 10));
        sharedResource = current + 1;
        
        if (sharedResource % 3 === 0) {
          throw new Error('Simulated race condition error');
        }
        
        return { value: sharedResource };
      };

      // Execute concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        errorRecovery.executeWithRecovery(
          racyOperation,
          `race-test-${i}`,
          {
            retryConfig: { maxAttempts: 2, baseDelay: 50, maxDelay: 500, jitter: true, exponentialBase: 2 }
          }
        )
      );

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length + failed.length).toBe(10);
      expect(successful.length).toBeGreaterThan(0); // Some should succeed
    });

    test('should handle circuit breaker states across concurrent operations', async () => {
      let operationCount = 0;
      const concurrentFailure = async () => {
        operationCount++;
        throw new Error(`Concurrent failure ${operationCount}`);
      };

      const operations = Array.from({ length: 8 }, (_, i) =>
        errorRecovery.executeWithRecovery(
          concurrentFailure,
          'concurrent-circuit-test',
          {
            circuitBreakerConfig: {
              failureThreshold: 3,
              timeout: 1000,
              monitoringPeriod: 1000,
              resetTimeout: 2000
            }
          }
        ).catch(error => ({ error: error.message, index: i }))
      );

      const results = await Promise.all(operations);
      const circuitErrors = results.filter(r => 
        typeof r === 'object' && 'error' in r && 
        r.error.includes('Circuit breaker OPEN')
      );

      expect(circuitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery Mechanism Validation', () => {
    test('should recover from temporary service outage', async () => {
      let serviceDown = true;
      const temporaryOutage = async () => {
        if (serviceDown) {
          throw new Error('Service temporarily unavailable');
        }
        return { status: 'service restored' };
      };

      // Start operation that will fail initially
      const operationPromise = errorRecovery.executeWithRecovery(
        temporaryOutage,
        'recovery-test',
        {
          retryConfig: {
            maxAttempts: 5,
            baseDelay: 100,
            maxDelay: 1000,
            jitter: false,
            exponentialBase: 2
          }
        }
      );

      // Simulate service recovery after 300ms
      setTimeout(() => {
        serviceDown = false;
      }, 300);

      const result = await operationPromise;
      expect(result.status).toBe('service restored');
    });

    test('should maintain health monitoring during recovery', async () => {
      let healthCheckCount = 0;
      
      healthMonitor.registerHealthCheck('recovery-service', async () => {
        healthCheckCount++;
        
        if (healthCheckCount <= 3) {
          return {
            status: 'UNHEALTHY' as any,
            latency: 0,
            message: 'Service recovering',
            timestamp: new Date()
          };
        }
        
        return {
          status: 'HEALTHY' as any,
          latency: 0,
          message: 'Service recovered',
          timestamp: new Date()
        };
      });

      healthMonitor.start();
      
      // Wait for multiple health checks
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const health = healthMonitor.getHealthStatus();
      const service = health.services.find(s => s.name === 'recovery-service');
      
      expect(service?.totalChecks).toBeGreaterThan(1);
      expect(healthCheckCount).toBeGreaterThan(3);
      
      healthMonitor.stop();
    });
  });

  describe('Integration Test Scenarios', () => {
    test('should handle complex multi-service failure scenario', async () => {
      // Setup multiple services with dependencies
      const services = ['database', 'ai-service', 'file-system'];
      
      services.forEach(service => {
        degradationManager.registerService({
          name: service,
          essential: service === 'database',
          fallbackAvailable: service !== 'database',
          degradationThreshold: 2,
          recoveryThreshold: 3
        });
      });

      // Simulate cascading failures
      degradationManager.recordServiceResult('database', false);
      degradationManager.recordServiceResult('database', false);
      degradationManager.recordServiceResult('ai-service', false);
      degradationManager.recordServiceResult('file-system', false);

      const status = degradationManager.getSystemStatus();
      
      expect(status.degradationLevel).toBeGreaterThan(2); // Should be in severe degradation
      expect(status.services.some(s => s.status === 'UNAVAILABLE')).toBe(true);
    });

    test('should demonstrate full error recovery lifecycle', async () => {
      let phase = 'failing';
      const lifecycleOperation = async () => {
        switch (phase) {
          case 'failing':
            throw new Error('Initial failure');
          case 'recovering':
            throw new Error('Still unstable');
          case 'recovered':
            return { status: 'fully operational' };
          default:
            throw new Error('Unexpected phase');
        }
      };

      // Start with failing operation
      const attempt1 = errorRecovery.executeWithRecovery(
        lifecycleOperation,
        'lifecycle-test',
        {
          retryConfig: { maxAttempts: 2, baseDelay: 50, maxDelay: 200, jitter: false, exponentialBase: 2 }
        }
      );

      await expect(attempt1).rejects.toThrow('Initial failure');

      // Move to recovery phase
      phase = 'recovering';
      const attempt2 = errorRecovery.executeWithRecovery(
        lifecycleOperation,
        'lifecycle-test',
        {
          retryConfig: { maxAttempts: 2, baseDelay: 50, maxDelay: 200, jitter: false, exponentialBase: 2 }
        }
      );

      await expect(attempt2).rejects.toThrow('Still unstable');

      // Full recovery
      phase = 'recovered';
      const attempt3 = await errorRecovery.executeWithRecovery(
        lifecycleOperation,
        'lifecycle-test'
      );

      expect(attempt3.status).toBe('fully operational');

      // Verify circuit breaker recovered
      const health = errorRecovery.getHealthStatus();
      const circuit = health.circuitBreakers['lifecycle-test'];
      expect(['CLOSED', 'HALF_OPEN']).toContain(circuit.state);
    });
  });

  describe('Performance Under Error Conditions', () => {
    test('should maintain acceptable performance during error recovery', async () => {
      const performanceOperation = async () => {
        // Simulate 70% failure rate
        if (Math.random() < 0.7) {
          throw new Error('Performance test failure');
        }
        return { processed: true };
      };

      const startTime = Date.now();
      const operations = Array.from({ length: 20 }, (_, i) =>
        errorRecovery.executeWithRecovery(
          performanceOperation,
          `perf-test-${i}`,
          {
            retryConfig: { maxAttempts: 2, baseDelay: 50, maxDelay: 200, jitter: false, exponentialBase: 2 }
          }
        ).catch(() => ({ failed: true }))
      );

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time even with failures
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      const successful = results.filter(r => 'processed' in r && r.processed);
      expect(successful.length).toBeGreaterThan(0); // Some should succeed
    });

    test('should not overwhelm system with retry attempts', async () => {
      let totalAttempts = 0;
      const controlledFailure = async () => {
        totalAttempts++;
        throw new Error('Controlled failure for testing');
      };

      const operations = Array.from({ length: 10 }, () =>
        errorRecovery.executeWithRecovery(
          controlledFailure,
          'throttle-test',
          {
            retryConfig: { maxAttempts: 3, baseDelay: 100, maxDelay: 500, jitter: false, exponentialBase: 2 }
          }
        ).catch(() => ({ failed: true }))
      );

      await Promise.all(operations);

      // Should not exceed reasonable attempt count
      expect(totalAttempts).toBeLessThan(50); // Max would be 10 * 3 = 30, plus circuit breaker effects
    });
  });
});