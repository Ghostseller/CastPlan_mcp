/**
 * Performance and Load Tests
 * 
 * Comprehensive performance testing for the MCP server
 */

import { PerformanceTestUtils, ConcurrencyTestUtils, TestDataFactory, TestAssertions } from '../helpers/TestUtils.js';
import { ServiceMockFactory } from '../helpers/MockFactories.js';

describe('Performance Tests', () => {
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

  describe('Service Performance Tests', () => {
    test('should handle high-volume BMAD operations', async () => {
      const { bmadService } = services;
      const taskCount = 1000;
      
      // Create many tasks
      const taskCreations = Array.from({ length: taskCount }, (_, i) => () =>
        bmadService.parseSpecification({
          content: `Task ${i} specification`,
          format: 'markdown'
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(taskCreations.map(create => create()));
      });

      TestAssertions.assertExecutionTime(duration, 5000, `Creating ${taskCount} tasks`);
      expect(bmadService.parseSpecification).toHaveBeenCalledTimes(taskCount);
    });

    test('should handle concurrent documentation operations', async () => {
      const { documentationService } = services;
      const operationCount = 500;

      const operations = Array.from({ length: operationCount }, (_, i) => () => {
        const operation = i % 3;
        switch (operation) {
          case 0:
            return documentationService.processDocumentationRequest({
              action: 'reference',
              files: [`/src/file${i}.ts`],
              context: `Context ${i}`
            });
          case 1:
            return documentationService.searchDocumentation(`query ${i}`);
          case 2:
            return documentationService.validateDocumentationStructure();
          default:
            return Promise.resolve();
        }
      });

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(operations.map(op => op()));
      });

      TestAssertions.assertExecutionTime(duration, 3000, `${operationCount} concurrent documentation operations`);
    });

    test('should handle rapid hook event processing', async () => {
      const { hooksService } = services;
      const eventCount = 2000;

      const events = Array.from({ length: eventCount }, (_, i) => () =>
        hooksService.processHookRequest({
          event: {
            type: 'file-change',
            data: { filePath: `/src/file${i}.ts`, changeType: 'modified' },
            timestamp: new Date().toISOString()
          }
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(events.map(event => event()));
      });

      TestAssertions.assertExecutionTime(duration, 4000, `Processing ${eventCount} hook events`);
    });

    test('should handle large-scale document lifecycle operations', async () => {
      const { lifecycleService } = services;
      const documentCount = 1500;

      // Create documents
      const documentCreations = Array.from({ length: documentCount }, (_, i) => () =>
        lifecycleService.createDocument(TestDataFactory.createMockDocument({
          title: `Document ${i}`,
          filePath: `/docs/doc${i}.md`
        }))
      );

      const { duration: createDuration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(documentCreations.map(create => create()));
      });

      TestAssertions.assertExecutionTime(createDuration, 3000, `Creating ${documentCount} documents`);

      // Update document states
      const stateUpdates = Array.from({ length: documentCount }, (_, i) => () =>
        lifecycleService.updateDocumentState(`doc-${i}`, 'published')
      );

      const { duration: updateDuration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(stateUpdates.map(update => update()));
      });

      TestAssertions.assertExecutionTime(updateDuration, 2000, `Updating ${documentCount} document states`);
    });
  });

  describe('Memory Performance Tests', () => {
    test('should handle large data structures efficiently', async () => {
      const { connectionService } = services;
      const connectionCount = 10000;

      const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        const connections = Array.from({ length: connectionCount }, (_, i) =>
          connectionService.createConnection(TestDataFactory.createMockConnection({
            workType: i % 2 === 0 ? 'frontend' : 'backend',
            filePaths: [`/src/file${i}.ts`, `/tests/file${i}.test.ts`]
          }))
        );

        await Promise.all(connections);
      });

      // Should not consume excessive memory (less than 100MB for 10k connections)
      TestAssertions.assertMemoryUsage(memoryDelta, 100 * 1024 * 1024, `Creating ${connectionCount} connections`);
    });

    test('should handle large document trees efficiently', async () => {
      const { treeService } = services;
      const nodeCount = 5000;

      const documents = Array.from({ length: nodeCount }, (_, i) =>
        TestDataFactory.createMockDocument({ id: `doc-${i}`, title: `Document ${i}` })
      );

      const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        await treeService.buildTree(documents);
      });

      TestAssertions.assertMemoryUsage(memoryDelta, 50 * 1024 * 1024, `Building tree with ${nodeCount} nodes`);
    });

    test('should handle AI analysis memory efficiently', async () => {
      const { aiService } = services;
      const analysisCount = 100;

      const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        const analyses = Array.from({ length: analysisCount }, (_, i) => [
          aiService.analyzeQuality(`/docs/document${i}.md`),
          aiService.detectDuplicates(`/docs/document${i}.md`),
          aiService.calculateRelevance(`Context ${i}`, `Work description ${i}`)
        ]).flat();

        await Promise.all(analyses);
      });

      TestAssertions.assertMemoryUsage(memoryDelta, 20 * 1024 * 1024, `${analysisCount * 3} AI analyses`);
    });
  });

  describe('Concurrency and Race Condition Tests', () => {
    test('should handle concurrent task status updates', async () => {
      const { bmadService } = services;
      const taskId = 'concurrent-test-task';
      const updateCount = 100;

      const updates = Array.from({ length: updateCount }, (_, i) => () =>
        bmadService.updateTaskStatus(taskId, i % 2 === 0 ? 'in-progress' : 'completed')
      );

      const results = await ConcurrencyTestUtils.runConcurrent(updates, 10);

      expect(results.length).toBe(updateCount);
      expect(bmadService.updateTaskStatus).toHaveBeenCalledTimes(updateCount);
    });

    test('should handle concurrent document lifecycle changes', async () => {
      const { lifecycleService } = services;
      const documentId = 'concurrent-test-doc';
      const states = ['draft', 'review', 'approved', 'published'];

      const updates = Array.from({ length: 200 }, (_, i) => () =>
        lifecycleService.updateDocumentState(documentId, states[i % states.length])
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await ConcurrencyTestUtils.runConcurrent(updates, 20);
      });

      TestAssertions.assertExecutionTime(duration, 2000, '200 concurrent document state updates');
    });

    test('should handle concurrent connection strength updates', async () => {
      const { connectionService } = services;
      const connectionId = 'concurrent-test-connection';
      const updateCount = 150;

      const updates = Array.from({ length: updateCount }, (_, i) => () =>
        connectionService.updateConnectionStrength(connectionId, Math.random())
      );

      const results = await ConcurrencyTestUtils.runConcurrent(updates, 15);

      expect(results.length).toBe(updateCount);
      expect(connectionService.updateConnectionStrength).toHaveBeenCalledTimes(updateCount);
    });

    test('should detect and handle race conditions', async () => {
      const { bmadService } = services;

      // Create two competing operations
      const operation1 = () => bmadService.parseSpecification({
        content: 'Specification A',
        format: 'markdown'
      });

      const operation2 = () => bmadService.updateTaskStatus('test-task', 'completed');

      const raceResults = await ConcurrencyTestUtils.simulateRaceCondition(
        operation1,
        operation2,
        50
      );

      expect(raceResults.fn1Wins + raceResults.fn2Wins + raceResults.ties).toBe(50);
      expect(raceResults.fn1Wins).toBeGreaterThan(0);
      expect(raceResults.fn2Wins).toBeGreaterThan(0);
    });
  });

  describe('Stress Tests', () => {
    test('should maintain performance under sustained load', async () => {
      const { documentationService } = services;
      const iterations = 10;
      const operationsPerIteration = 100;

      const iterationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const operations = Array.from({ length: operationsPerIteration }, (_, j) => () =>
          documentationService.processDocumentationRequest({
            action: 'reference',
            files: [`/src/iteration${i}_file${j}.ts`],
            context: `Iteration ${i}, operation ${j}`
          })
        );

        const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await Promise.all(operations.map(op => op()));
        });

        iterationTimes.push(duration);
      }

      // Performance should remain consistent (no significant degradation)
      const avgTime = iterationTimes.reduce((sum, time) => sum + time, 0) / iterationTimes.length;
      const maxTime = Math.max(...iterationTimes);
      const minTime = Math.min(...iterationTimes);

      // Maximum time should not be more than 2x the average
      expect(maxTime).toBeLessThanOrEqual(avgTime * 2);
      
      // All iterations should complete within reasonable time
      iterationTimes.forEach((time, index) => {
        TestAssertions.assertExecutionTime(time, 1000, `Iteration ${index}`);
      });
    });

    test('should handle resource cleanup under stress', async () => {
      const { connectionService, lifecycleService } = services;
      const cycles = 5;
      const resourcesPerCycle = 200;

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Create resources
        const creations = Array.from({ length: resourcesPerCycle }, (_, i) => [
          connectionService.createConnection(TestDataFactory.createMockConnection({
            workDescription: `Cycle ${cycle}, resource ${i}`
          })),
          lifecycleService.createDocument(TestDataFactory.createMockDocument({
            title: `Cycle ${cycle}, document ${i}`
          }))
        ]).flat();

        await Promise.all(creations);

        // Cleanup some resources
        const cleanupOps = Array.from({ length: resourcesPerCycle / 2 }, (_, i) => [
          connectionService.deleteConnection(`connection-${cycle}-${i}`),
          lifecycleService.deleteDocument(`document-${cycle}-${i}`)
        ]).flat();

        await Promise.all(cleanupOps);
      }

      // Should complete without memory issues
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    test('should handle error recovery under load', async () => {
      const { bmadService, documentationService } = services;

      // Inject errors into 10% of operations
      let errorCount = 0;
      const originalParseSpec = bmadService.parseSpecification;
      bmadService.parseSpecification.mockImplementation(async (args: any) => {
        if (Math.random() < 0.1) {
          errorCount++;
          throw new Error('Simulated error');
        }
        return originalParseSpec(args);
      });

      const operations = Array.from({ length: 500 }, (_, i) => async () => {
        try {
          if (i % 2 === 0) {
            await bmadService.parseSpecification({
              content: `Content ${i}`,
              format: 'markdown'
            });
          } else {
            await documentationService.processDocumentationRequest({
              action: 'reference',
              files: [`/src/file${i}.ts`],
              context: `Context ${i}`
            });
          }
        } catch (error) {
          // Expected for some operations
        }
      });

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(operations.map(op => op()));
      });

      TestAssertions.assertExecutionTime(duration, 3000, '500 operations with 10% error rate');
      expect(errorCount).toBeGreaterThan(0);
      expect(errorCount).toBeLessThan(75); // Should be around 25 (10% of 250 BMAD operations)
    });
  });

  describe('Scalability Tests', () => {
    test('should scale linearly with increasing load', async () => {
      const { hooksService } = services;
      const loadLevels = [100, 200, 400, 800];
      const scalingResults: { load: number; duration: number }[] = [];

      for (const load of loadLevels) {
        const events = Array.from({ length: load }, (_, i) => () =>
          hooksService.processHookRequest({
            event: TestDataFactory.createMockHookEvent({
              data: { filePath: `/src/scale_test_${i}.ts` }
            })
          })
        );

        const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await Promise.all(events.map(event => event()));
        });

        scalingResults.push({ load, duration });
      }

      // Check that scaling is roughly linear (within 3x factor)
      const baseResult = scalingResults[0];
      scalingResults.slice(1).forEach(result => {
        const expectedMaxDuration = (result.load / baseResult.load) * baseResult.duration * 3;
        expect(result.duration).toBeLessThanOrEqual(expectedMaxDuration);
      });
    });

    test('should handle increasing complexity gracefully', async () => {
      const { aiService } = services;
      const complexityLevels = [
        { docs: 10, analyses: ['quality'] },
        { docs: 50, analyses: ['quality', 'duplicate'] },
        { docs: 100, analyses: ['quality', 'duplicate', 'completeness'] }
      ];

      for (const level of complexityLevels) {
        const analyses = Array.from({ length: level.docs }, (_, i) =>
          level.analyses.map(analysisType => {
            switch (analysisType) {
              case 'quality':
                return aiService.analyzeQuality(`/docs/complex_${i}.md`);
              case 'duplicate':
                return aiService.detectDuplicates(`/docs/complex_${i}.md`);
              case 'completeness':
                return aiService.calculateRelevance(`Complex context ${i}`, `Work ${i}`);
              default:
                return Promise.resolve();
            }
          })
        ).flat();

        const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await Promise.all(analyses);
        });

        // Should handle increasing complexity without exponential growth
        const maxExpectedDuration = level.docs * level.analyses.length * 10; // 10ms per analysis
        TestAssertions.assertExecutionTime(
          duration, 
          maxExpectedDuration, 
          `${level.docs} docs with ${level.analyses.length} analysis types`
        );
      }
    });
  });

  describe('Resource Utilization Tests', () => {
    test('should manage database connections efficiently', async () => {
      const { lifecycleService, connectionService, treeService } = services;
      const operationCount = 1000;

      const databaseOperations = Array.from({ length: operationCount }, (_, i) => {
        const operation = i % 6;
        switch (operation) {
          case 0:
            return lifecycleService.createDocument(TestDataFactory.createMockDocument());
          case 1:
            return lifecycleService.getAllDocuments();
          case 2:
            return connectionService.createConnection(TestDataFactory.createMockConnection());
          case 3:
            return connectionService.getAllConnections();
          case 4:
            return treeService.buildTree([]);
          case 5:
            return treeService.getTreeNodes();
          default:
            return Promise.resolve();
        }
      });

      const { duration, memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        await ConcurrencyTestUtils.runConcurrent(databaseOperations, 50);
      });

      TestAssertions.assertExecutionTime(duration, 5000, `${operationCount} database operations`);
      TestAssertions.assertMemoryUsage(memoryDelta, 100 * 1024 * 1024, 'Database operation memory usage');
    });

    test('should handle file system operations efficiently', async () => {
      const { documentationService } = services;
      const fileCount = 500;

      const fileOperations = Array.from({ length: fileCount }, (_, i) => [
        documentationService.processDocumentationRequest({
          action: 'reference',
          files: [`/src/component${i}.tsx`, `/src/component${i}.test.ts`],
          context: `File operation test ${i}`
        }),
        documentationService.searchDocumentation(`search term ${i}`)
      ]).flat();

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await ConcurrencyTestUtils.runConcurrent(fileOperations, 25);
      });

      TestAssertions.assertExecutionTime(duration, 4000, `${fileOperations.length} file operations`);
    });
  });
});