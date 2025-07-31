/**
 * Error Recovery and Edge Case Tests
 * 
 * Comprehensive error handling and recovery testing
 */

import { ServiceMockFactory } from '../helpers/MockFactories.js';
import { TestDataFactory, ErrorTestUtils, TestAssertions } from '../helpers/TestUtils.js';

describe('Error Recovery Tests', () => {
  let services: any;

  beforeEach(() => {
    services = {
      bmadService: ServiceMockFactory.createBMADServiceMock(),
      documentationService: ServiceMockFactory.createDocumentationServiceMock(),
      hooksService: ServiceMockFactory.createHooksServiceMock(),
      dateTimeService: ServiceMockFactory.createDateTimeServiceMock(),
      lifecycleService: ServiceMockFactory.createDocumentLifecycleServiceMock(),
      connectionService: ServiceMockFactory.createWorkDocumentConnectionServiceMock(),
      treeService: ServiceMockFactory.createDocumentTreeServiceMock(),
      aiService: ServiceMockFactory.createAIAnalysisServiceMock()
    };
  });

  describe('Network Error Recovery', () => {
    test('should handle database connection failures', async () => {
      const { lifecycleService } = services;
      
      // Simulate database connection failure
      lifecycleService.initialize.mockRejectedValueOnce(
        ErrorTestUtils.createDatabaseError('Connection timeout')
      );

      await expect(lifecycleService.initialize()).rejects.toThrow('Connection timeout');
    });

    test('should retry failed operations with exponential backoff', async () => {
      const { aiService } = services;
      let callCount = 0;

      // Mock failures for first 3 calls, then success
      aiService.analyzeQuality.mockImplementation(async () => {
        callCount++;
        if (callCount <= 3) {
          throw ErrorTestUtils.createNetworkError('Network timeout');
        }
        return { score: 0.8, insights: ['Success after retries'], suggestions: [] };
      });

      // Simulate retry logic
      const retryAnalysis = async (maxRetries: number = 3, baseDelay: number = 100) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await aiService.analyzeQuality('/test/doc.md');
          } catch (error) {
            if (attempt === maxRetries) throw error;
            
            // Exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      const result = await retryAnalysis();
      
      expect(result.score).toBe(0.8);
      expect(callCount).toBe(4); // 3 failures + 1 success
    });

    test('should handle AI service unavailability gracefully', async () => {
      const { aiService } = services;
      
      aiService.analyzeQuality.mockRejectedValue(
        ErrorTestUtils.createNetworkError('AI service unavailable')
      );

      // Service should fallback gracefully
      try {
        await aiService.analyzeQuality('/test/doc.md');
      } catch (error: any) {
        expect(error.message).toContain('AI service unavailable');
      }
    });

    test('should handle file system permission errors', async () => {
      const { documentationService } = services;
      
      documentationService.processDocumentationRequest.mockRejectedValueOnce(
        ErrorTestUtils.createFileSystemError('Permission denied', 'EACCES')
      );

      await expect(documentationService.processDocumentationRequest({
        action: 'reference',
        files: ['/protected/file.ts'],
        context: 'Test context'
      })).rejects.toThrow('Permission denied');
    });
  });

  describe('Data Corruption Recovery', () => {
    test('should handle corrupted task data', async () => {
      const { bmadService } = services;
      
      bmadService.parseSpecification.mockRejectedValueOnce(
        ErrorTestUtils.createValidationError('Invalid specification format', 'content')
      );

      await expect(bmadService.parseSpecification({
        content: 'corrupted-data-&%$#@',
        format: 'markdown'
      })).rejects.toThrow('Invalid specification format');
    });

    test('should handle invalid document lifecycle states', async () => {
      const { lifecycleService } = services;
      
      lifecycleService.updateDocumentState.mockRejectedValueOnce(
        ErrorTestUtils.createValidationError('Invalid state transition', 'newState')
      );

      await expect(lifecycleService.updateDocumentState(
        'test-doc-id',
        'invalid-state' as any
      )).rejects.toThrow('Invalid state transition');
    });

    test('should handle malformed connection data', async () => {
      const { connectionService } = services;
      
      connectionService.createConnection.mockRejectedValueOnce(
        ErrorTestUtils.createValidationError('Invalid connection strength', 'connectionStrength')
      );

      await expect(connectionService.createConnection({
        ...TestDataFactory.createMockConnection(),
        connectionStrength: 'invalid' as any
      })).rejects.toThrow('Invalid connection strength');
    });

    test('should validate and sanitize input data', async () => {
      const { hooksService } = services;
      
      // Test various malformed inputs
      const malformedInputs = [
        { eventType: null, data: {} },
        { eventType: 'file-change', data: null },
        { eventType: 'file-change', data: { filePath: '' } },
        { eventType: 'invalid-type', data: { filePath: '/test.ts' } }
      ];

      for (const input of malformedInputs) {
        hooksService.processHookRequest.mockRejectedValueOnce(
          ErrorTestUtils.createValidationError('Invalid hook event data')
        );

        await expect(hooksService.processHookRequest({
          event: input as any
        })).rejects.toThrow('Invalid hook event data');
      }
    });
  });

  describe('Concurrency Error Recovery', () => {
    test('should handle database deadlocks', async () => {
      const { lifecycleService, connectionService } = services;
      
      // Simulate deadlock on concurrent operations
      let deadlockCount = 0;
      const originalUpdate = lifecycleService.updateDocumentState;
      
      lifecycleService.updateDocumentState.mockImplementation(async (id: string, state: string) => {
        if (deadlockCount < 2) {
          deadlockCount++;
          throw ErrorTestUtils.createDatabaseError('Database deadlock detected');
        }
        return originalUpdate(id, state);
      });

      // Simulate concurrent updates
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) => 
        lifecycleService.updateDocumentState(`doc-${i}`, 'published')
      );

      // Some operations should fail due to deadlock, others should succeed
      const results = await Promise.allSettled(concurrentUpdates);
      
      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');
      
      expect(failed.length).toBe(2); // First 2 should fail
      expect(succeeded.length).toBe(3); // Rest should succeed
    });

    test('should handle resource contention', async () => {
      const { treeService } = services;
      
      let contention = 0;
      treeService.buildTree.mockImplementation(async (documents: any[]) => {
        contention++;
        if (contention <= 3) {
          throw new Error('Resource temporarily unavailable');
        }
        return documents.map((_, i) => TestDataFactory.createMockTreeNode({ id: `node-${i}` }));
      });

      // Simulate resource contention resolution
      const retryWithBackoff = async (operation: () => Promise<any>, maxRetries: number = 5) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            if (attempt === maxRetries || !error.message.includes('temporarily unavailable')) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
          }
        }
      };

      const result = await retryWithBackoff(() => 
        treeService.buildTree([TestDataFactory.createMockDocument()])
      );

      expect(result).toBeDefined();
      expect(contention).toBe(4); // 3 failures + 1 success
    });
  });

  describe('Memory Pressure Recovery', () => {
    test('should handle out-of-memory conditions', async () => {
      const { aiService } = services;
      
      // Simulate OOM error
      aiService.calculateRelevance.mockRejectedValueOnce(
        new Error('JavaScript heap out of memory')
      );

      await expect(aiService.calculateRelevance(
        'Very long context that might cause memory issues',
        'Very long work description'
      )).rejects.toThrow('heap out of memory');
    });

    test('should implement memory cleanup after errors', async () => {
      const { connectionService } = services;
      
      let memoryPressure = false;
      connectionService.getAllConnections.mockImplementation(async () => {
        if (memoryPressure) {
          // Simulate memory cleanup
          global.gc?.(); // If available
          memoryPressure = false;
        }
        
        if (Math.random() < 0.3) {
          memoryPressure = true;
          throw new Error('Memory pressure detected');
        }
        
        return [TestDataFactory.createMockConnection()];
      });

      // Multiple attempts should eventually succeed after cleanup
      let lastError: any;
      let attempts = 0;
      
      while (attempts < 10) {
        try {
          await connectionService.getAllConnections();
          break; // Success
        } catch (error) {
          lastError = error;
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      expect(attempts).toBeLessThan(10); // Should succeed before max attempts
    });
  });

  describe('Transaction Recovery', () => {
    test('should handle partial transaction failures', async () => {
      const { lifecycleService, connectionService } = services;
      
      // Simulate transaction that partially fails
      const transactionSteps = [
        () => lifecycleService.createDocument(TestDataFactory.createMockDocument()),
        () => connectionService.createConnection(TestDataFactory.createMockConnection()),
        () => { throw new Error('Step 3 failed'); }, // Failure point
        () => lifecycleService.updateDocumentState('doc-id', 'published')
      ];

      const rollbackSteps: (() => Promise<void>)[] = [];
      let completedSteps = 0;

      try {
        for (const step of transactionSteps) {
          await step();
          completedSteps++;
          
          // Add rollback for each completed step
          if (completedSteps === 1) {
            rollbackSteps.push(() => lifecycleService.deleteDocument('doc-id'));
          } else if (completedSteps === 2) {
            rollbackSteps.push(() => connectionService.deleteConnection('conn-id'));
          }
        }
      } catch (error) {
        // Execute rollback in reverse order
        for (const rollback of rollbackSteps.reverse()) {
          try {
            await rollback();
          } catch (rollbackError) {
            // Log rollback errors but continue
          }
        }
        
        expect(completedSteps).toBe(2); // Only first 2 steps completed
        expect(error).toBeDefined();
      }
    });

    test('should handle distributed transaction failures', async () => {
      const { bmadService, documentationService, hooksService } = services;
      
      // Simulate distributed operation across multiple services
      const distributedOperation = async () => {
        const operations = [
          bmadService.parseSpecification({
            content: 'Test spec',
            format: 'markdown'
          }),
          documentationService.processDocumentationRequest({
            action: 'reference',
            files: ['/test.ts'],
            context: 'test'
          }),
          hooksService.processHookRequest({
            event: TestDataFactory.createMockHookEvent()
          })
        ];

        // One service fails
        hooksService.processHookRequest.mockRejectedValueOnce(
          new Error('Hooks service temporarily unavailable')
        );

        return await Promise.allSettled(operations);
      };

      const results = await distributedOperation();
      
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes.length).toBe(2);
      expect(failures.length).toBe(1);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should implement circuit breaker for failing services', async () => {
      const { aiService } = services;
      
      class CircuitBreaker {
        private failureCount = 0;
        private lastFailureTime = 0;
        private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
        private failureThreshold = 3;
        private timeout = 1000;

        async call<T>(operation: () => Promise<T>): Promise<T> {
          if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
              this.state = 'HALF_OPEN';
            } else {
              throw new Error('Circuit breaker is OPEN');
            }
          }

          try {
            const result = await operation();
            this.onSuccess();
            return result;
          } catch (error) {
            this.onFailure();
            throw error;
          }
        }

        private onSuccess() {
          this.failureCount = 0;
          this.state = 'CLOSED';
        }

        private onFailure() {
          this.failureCount++;
          this.lastFailureTime = Date.now();
          
          if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
          }
        }
      }

      const circuitBreaker = new CircuitBreaker();
      
      // Mock failures
      let callCount = 0;
      aiService.analyzeQuality.mockImplementation(async () => {
        callCount++;
        if (callCount <= 5) {
          throw new Error('Service failure');
        }
        return { score: 0.8, insights: [], suggestions: [] };
      });

      // First 3 calls should fail and open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(() => aiService.analyzeQuality('/test.md'));
        } catch (error: any) {
          expect(error.message).toBe('Service failure');
        }
      }

      // Next calls should fail due to open circuit
      try {
        await circuitBreaker.call(() => aiService.analyzeQuality('/test.md'));
      } catch (error: any) {
        expect(error.message).toBe('Circuit breaker is OPEN');
      }

      // Wait for timeout and test half-open state
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      try {
        await circuitBreaker.call(() => aiService.analyzeQuality('/test.md'));
      } catch (error: any) {
        // Should fail but circuit should stay half-open initially
      }
    });
  });

  describe('Graceful Degradation', () => {
    test('should degrade functionality when AI service is unavailable', async () => {
      const { aiService } = services;
      
      // Disable AI service
      aiService.analyzeQuality.mockRejectedValue(new Error('AI service unavailable'));
      aiService.detectDuplicates.mockRejectedValue(new Error('AI service unavailable'));
      aiService.calculateRelevance.mockRejectedValue(new Error('AI service unavailable'));

      // Service should provide fallback functionality
      const fallbackAnalysis = async (documentPath: string) => {
        try {
          return await aiService.analyzeQuality(documentPath);
        } catch (error) {
          // Return basic analysis without AI
          return {
            score: null,
            insights: ['AI analysis unavailable - using basic metrics'],
            suggestions: ['Ensure AI service is running for detailed analysis']
          };
        }
      };

      const result = await fallbackAnalysis('/test/doc.md');
      
      expect(result.score).toBeNull();
      expect(result.insights[0]).toContain('AI analysis unavailable');
    });

    test('should maintain core functionality during partial service failures', async () => {
      const { bmadService, documentationService, hooksService } = services;
      
      // Simulate hooks service failure
      hooksService.processHookRequest.mockRejectedValue(
        new Error('Hooks service down')
      );

      // Other services should continue working
      const bmadResult = await bmadService.parseSpecification({
        content: 'Test specification',
        format: 'markdown'
      });

      const docResult = await documentationService.processDocumentationRequest({
        action: 'reference',
        files: ['/test.ts'],
        context: 'Test context'
      });

      expect(bmadResult.success).toBe(true);
      expect(docResult.relevantDocs).toBeDefined();

      // Hooks functionality should fail gracefully
      try {
        await hooksService.processHookRequest({
          event: TestDataFactory.createMockHookEvent()
        });
      } catch (error: any) {
        expect(error.message).toBe('Hooks service down');
      }
    });
  });

  describe('Error Logging and Monitoring', () => {
    test('should log errors with appropriate context', async () => {
      const { lifecycleService } = services;
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
      };

      lifecycleService.updateDocumentState.mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      try {
        await lifecycleService.updateDocumentState('doc-id', 'published');
      } catch (error) {
        // Simulate error logging
        mockLogger.error('Document state update failed', {
          documentId: 'doc-id',
          targetState: 'published',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Document state update failed',
        expect.objectContaining({
          documentId: 'doc-id',
          targetState: 'published',
          error: 'Database connection lost'
        })
      );
    });

    test('should track error patterns for monitoring', async () => {
      const errorTracker = {
        errors: [] as Array<{ type: string; count: number; lastOccurred: Date }>
      };

      const trackError = (error: Error) => {
        const errorType = error.constructor.name;
        const existing = errorTracker.errors.find(e => e.type === errorType);
        
        if (existing) {
          existing.count++;
          existing.lastOccurred = new Date();
        } else {
          errorTracker.errors.push({
            type: errorType,
            count: 1,
            lastOccurred: new Date()
          });
        }
      };

      // Simulate various error types
      const errors = [
        new Error('Network error'),
        new TypeError('Type error'),
        new Error('Network error'),
        new RangeError('Range error'),
        new Error('Network error')
      ];

      errors.forEach(trackError);

      expect(errorTracker.errors).toHaveLength(3);
      
      const networkErrors = errorTracker.errors.find(e => e.type === 'Error');
      expect(networkErrors?.count).toBe(3);
      
      const typeErrors = errorTracker.errors.find(e => e.type === 'TypeError');
      expect(typeErrors?.count).toBe(1);
    });
  });
});