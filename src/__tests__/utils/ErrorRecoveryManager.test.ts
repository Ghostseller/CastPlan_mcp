/**
 * Error Recovery Manager Tests
 * 
 * Comprehensive tests for error recovery mechanisms
 */

import { ErrorRecoveryManager, ErrorType, ErrorSeverity } from '../../utils/ErrorRecoveryManager.js';
import * as winston from 'winston';

describe('ErrorRecoveryManager', () => {
  let errorRecovery: ErrorRecoveryManager;
  let mockLogger: winston.Logger;

  beforeEach(() => {
    mockLogger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });
    
    errorRecovery = new ErrorRecoveryManager(mockLogger);
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after threshold failures', async () => {
      let callCount = 0;
      const failingOperation = async () => {
        callCount++;
        throw new Error('Network timeout');
      };

      // Execute operations to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorRecovery.executeWithRecovery(
            failingOperation,
            'test-operation',
            {
              circuitBreakerConfig: { failureThreshold: 3, timeout: 1000, monitoringPeriod: 1000, resetTimeout: 2000 }
            }
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open now
      try {
        await errorRecovery.executeWithRecovery(failingOperation, 'test-operation');
        fail('Should have thrown circuit breaker error');
      } catch (error: any) {
        expect(error.message).toContain('Circuit breaker OPEN');
      }

      expect(callCount).toBeLessThan(8); // Should stop calling after circuit opens
    });

    test('should recover after timeout in half-open state', async () => {
      let callCount = 0;
      const recoveringOperation = async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('Still failing');
        }
        return 'success';
      };

      const options = {
        circuitBreakerConfig: { 
          failureThreshold: 2, 
          timeout: 1000, 
          monitoringPeriod: 1000, 
          resetTimeout: 100 // Short timeout for testing
        }
      };

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await errorRecovery.executeWithRecovery(recoveringOperation, 'recovering-op', options);
        } catch (error) {
          // Expected
        }
      }

      // Wait for circuit to go half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should succeed after recovery
      const result = await errorRecovery.executeWithRecovery(recoveringOperation, 'recovering-op', options);
      expect(result).toBe('success');
    });
  });

  describe('Retry Logic', () => {
    test('should retry with exponential backoff', async () => {
      let attempts = 0;
      const retriedOperation = async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Temporary failure');
        }
        return `success-after-${attempts}-attempts`;
      };

      const startTime = Date.now();
      const result = await errorRecovery.executeWithRecovery(
        retriedOperation,
        'retried-operation',
        {
          retryConfig: { maxAttempts: 3, baseDelay: 100, maxDelay: 1000, jitter: false, exponentialBase: 2 }
        }
      );

      const duration = Date.now() - startTime;
      
      expect(result).toBe('success-after-3-attempts');
      expect(attempts).toBe(3);
      expect(duration).toBeGreaterThan(300); // Should have delayed for retries
    });

    test('should not retry non-retriable errors', async () => {
      let attempts = 0;
      const validationError = async () => {
        attempts++;
        throw new Error('Invalid input format');
      };

      try {
        await errorRecovery.executeWithRecovery(
          validationError,
          'validation-operation',
          { retryConfig: { maxAttempts: 3, baseDelay: 100, maxDelay: 1000, jitter: false, exponentialBase: 2 } }
        );
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toBe('Invalid input format');
        expect(attempts).toBe(1); // Should not retry validation errors
      }
    });

    test('should add jitter to delay calculation', async () => {
      let attempts = 0;
      const jitteredOperation = async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Network error');
        }
        return 'success';
      };

      const delays: number[] = [];
      const originalSetTimeout = setTimeout;
      
      // Mock setTimeout to capture delays
      global.setTimeout = jest.fn().mockImplementation((fn, delay) => {
        if (delay > 50) { // Only capture retry delays
          delays.push(delay);
        }
        return originalSetTimeout(fn, delay);
      });

      try {
        await errorRecovery.executeWithRecovery(
          jitteredOperation,
          'jittered-operation',
          {
            retryConfig: { maxAttempts: 3, baseDelay: 100, maxDelay: 1000, jitter: true, exponentialBase: 2 }
          }
        );

        expect(delays.length).toBe(2); // Two retries
        expect(delays[0]).toBeGreaterThan(50); // Should have some delay
        expect(delays[1]).toBeGreaterThan(delays[0]); // Should increase exponentially
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('Error Classification', () => {
    test('should classify network errors correctly', async () => {
      const networkErrors = [
        new Error('Network timeout'),
        new Error('Connection refused'),
        new Error('fetch failed'),
        Object.assign(new Error('Request failed'), { name: 'NetworkError' })
      ];

      for (const error of networkErrors) {
        try {
          await errorRecovery.executeWithRecovery(
            async () => { throw error; },
            'network-test'
          );
        } catch (e) {
          // Expected
        }
      }

      const health = errorRecovery.getHealthStatus();
      expect(Object.keys(health.errorStats)).toContain('network-test:NETWORK');
    });

    test('should classify database errors correctly', async () => {
      const dbError = new Error('Database deadlock detected');
      
      try {
        await errorRecovery.executeWithRecovery(
          async () => { throw dbError; },
          'db-test'
        );
      } catch (e) {
        // Expected
      }

      const health = errorRecovery.getHealthStatus();
      expect(Object.keys(health.errorStats)).toContain('db-test:DATABASE');
    });

    test('should classify memory errors as critical', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      
      try {
        await errorRecovery.executeWithRecovery(
          async () => { throw memoryError; },
          'memory-test'
        );
      } catch (e) {
        // Expected
      }

      const health = errorRecovery.getHealthStatus();
      const memoryStats = health.errorStats['memory-test:MEMORY'];
      expect(memoryStats).toBeDefined();
      expect(memoryStats.severity).toBe('CRITICAL');
    });
  });

  describe('Graceful Degradation', () => {
    test('should use fallback when primary operation fails', async () => {
      const failingPrimary = async () => {
        throw new Error('Primary service down');
      };

      const fallbackFunction = async () => {
        return 'fallback-result';
      };

      const result = await errorRecovery.executeWithRecovery(
        failingPrimary,
        'degradation-test',
        {
          enableGracefulDegradation: true,
          fallbackFunction
        }
      );

      expect(result).toBe('fallback-result');
    });

    test('should throw original error if fallback also fails', async () => {
      const originalError = new Error('Primary service error');
      const fallbackError = new Error('Fallback also failed');

      const failingPrimary = async () => {
        throw originalError;
      };

      const failingFallback = async () => {
        throw fallbackError;
      };

      try {
        await errorRecovery.executeWithRecovery(
          failingPrimary,
          'double-failure-test',
          {
            enableGracefulDegradation: true,
            fallbackFunction: failingFallback
          }
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBe(originalError); // Should throw original error, not fallback error
      }
    });
  });

  describe('Health Monitoring', () => {
    test('should track error statistics', async () => {
      // Generate some errors
      const operations = [
        { name: 'op1', error: new Error('Network timeout') },
        { name: 'op1', error: new Error('Network timeout') },
        { name: 'op2', error: new Error('Database error') },
        { name: 'op1', error: new Error('Network timeout') }
      ];

      for (const op of operations) {
        try {
          await errorRecovery.executeWithRecovery(
            async () => { throw op.error; },
            op.name
          );
        } catch (e) {
          // Expected
        }
      }

      const health = errorRecovery.getHealthStatus();
      
      // Should track op1 network errors
      const op1NetworkStats = health.errorStats['op1:NETWORK'];
      expect(op1NetworkStats).toBeDefined();
      expect(op1NetworkStats.count).toBe(3);
      
      // Should track op2 database errors
      const op2DbStats = health.errorStats['op2:DATABASE'];
      expect(op2DbStats).toBeDefined();
      expect(op2DbStats.count).toBe(1);
    });

    test('should provide circuit breaker metrics', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorRecovery.executeWithRecovery(
            async () => { throw new Error('Service down'); },
            'metrics-test'
          );
        } catch (e) {
          // Expected
        }
      }

      const health = errorRecovery.getHealthStatus();
      const circuitMetrics = health.circuitBreakers['metrics-test'];
      
      expect(circuitMetrics).toBeDefined();
      expect(circuitMetrics.state).toBe('OPEN');
      expect(circuitMetrics.failureCount).toBeGreaterThan(0);
      expect(circuitMetrics.requestCount).toBeGreaterThan(0);
    });

    test('should reset circuit breaker on demand', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorRecovery.executeWithRecovery(
            async () => { throw new Error('Service down'); },
            'reset-test'
          );
        } catch (e) {
          // Expected
        }
      }

      // Verify circuit is open
      let health = errorRecovery.getHealthStatus();
      expect(health.circuitBreakers['reset-test'].state).toBe('OPEN');

      // Reset circuit breaker
      const resetResult = errorRecovery.resetCircuitBreaker('reset-test');
      expect(resetResult).toBe(true);

      // Verify circuit is closed
      health = errorRecovery.getHealthStatus();
      expect(health.circuitBreakers['reset-test'].state).toBe('CLOSED');
    });

    test('should clear error statistics', async () => {
      // Generate some errors
      try {
        await errorRecovery.executeWithRecovery(
          async () => { throw new Error('Test error'); },
          'clear-test'
        );
      } catch (e) {
        // Expected
      }

      // Verify stats exist
      let health = errorRecovery.getHealthStatus();
      expect(Object.keys(health.errorStats).length).toBeGreaterThan(0);

      // Clear stats
      errorRecovery.clearErrorStats();

      // Verify stats cleared
      health = errorRecovery.getHealthStatus();
      expect(Object.keys(health.errorStats).length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle cascading failures', async () => {
      let primaryCalls = 0;
      let fallbackCalls = 0;

      const cascadingOperation = async () => {
        primaryCalls++;
        if (primaryCalls <= 10) {
          throw new Error('Cascading failure');
        }
        return 'recovered';
      };

      const cascadingFallback = async () => {
        fallbackCalls++;
        if (fallbackCalls <= 3) {
          throw new Error('Fallback overwhelmed');
        }
        return 'fallback-success';
      };

      const options = {
        retryConfig: { maxAttempts: 2, baseDelay: 50, maxDelay: 500, jitter: false, exponentialBase: 2 },
        circuitBreakerConfig: { failureThreshold: 3, timeout: 1000, monitoringPeriod: 1000, resetTimeout: 2000 },
        enableGracefulDegradation: true,
        fallbackFunction: cascadingFallback
      };

      // This should eventually succeed with fallback
      const result = await errorRecovery.executeWithRecovery(
        cascadingOperation,
        'cascading-test',
        options
      );

      expect(result).toBe('fallback-success');
      expect(fallbackCalls).toBeGreaterThan(3);
    });

    test('should handle concurrent operations independently', async () => {
      const results = await Promise.allSettled([
        errorRecovery.executeWithRecovery(
          async () => { throw new Error('Op1 fails'); },
          'concurrent-op1'
        ),
        errorRecovery.executeWithRecovery(
          async () => 'Op2 succeeds',
          'concurrent-op2'
        ),
        errorRecovery.executeWithRecovery(
          async () => { throw new Error('Op3 fails'); },
          'concurrent-op3'
        )
      ]);

      // Check individual results
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      expect(results[1].value).toBe('Op2 succeeds');
      expect(results[2].status).toBe('rejected');

      // Check that circuit breakers are independent
      const health = errorRecovery.getHealthStatus();
      expect(health.circuitBreakers['concurrent-op1']).toBeDefined();
      expect(health.circuitBreakers['concurrent-op2']).toBeDefined();
      expect(health.circuitBreakers['concurrent-op3']).toBeDefined();
    });
  });
});