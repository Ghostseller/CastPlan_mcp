/**
 * Service Integration Chain Tests
 * Tests complete service interaction workflows and cross-service dependencies
 */

import { BMADService } from '../../services/BMADService';
import { DocumentationService } from '../../services/DocumentationService';
import { HooksService } from '../../services/HooksService';
import { DocumentLifecycleService } from '../../services/DocumentLifecycleService';
import { WorkDocumentConnectionService } from '../../services/WorkDocumentConnectionService';
import { AIAnalysisService } from '../../services/AIAnalysisService';
import { DateTimeService } from '../../services/DateTimeService';
import { DocumentTreeService } from '../../services/DocumentTreeService';
import { FileBasedWorkDocumentConnectionService } from '../../services/FileBasedWorkDocumentConnectionService';

import { MockFactories } from '../helpers/MockFactories';
import { testUtils, TEST_CONSTANTS } from '../setup';
import { setupDatabaseIntegrationTest, databaseTestUtils } from '../helpers/DatabaseIntegrationTestFramework';

describe('Service Integration Chain Tests', () => {
  const getTestDb = setupDatabaseIntegrationTest();
  
  let bmadService: BMADService;
  let documentationService: DocumentationService;
  let hooksService: HooksService;
  let documentLifecycleService: DocumentLifecycleService;
  let workConnectionService: WorkDocumentConnectionService;
  let aiAnalysisService: AIAnalysisService;
  let dateTimeService: DateTimeService;
  let documentTreeService: DocumentTreeService;
  let fileBasedConnectionService: FileBasedWorkDocumentConnectionService;

  beforeAll(async () => {
    const testDb = getTestDb();
    await databaseTestUtils.insertTestData(testDb);

    // Initialize services with test configuration
    const config = {
      projectRoot: process.cwd(),
      databasePath: testDb.path,
      enableAI: false,
      timeZone: 'UTC',
      locale: 'en-US'
    };

    bmadService = new BMADService(config);
    documentationService = new DocumentationService(config);
    hooksService = new HooksService(config);
    documentLifecycleService = new DocumentLifecycleService(config);
    workConnectionService = new WorkDocumentConnectionService(config);
    aiAnalysisService = new AIAnalysisService(config);
    dateTimeService = new DateTimeService(config);
    documentTreeService = new DocumentTreeService(config);
    fileBasedConnectionService = new FileBasedWorkDocumentConnectionService(config);
  });

  afterAll(async () => {
    await testUtils.cleanup(
      async () => bmadService?.close?.(),
      async () => documentationService?.close?.(),
      async () => hooksService?.close?.(),
      async () => documentLifecycleService?.close?.(),
      async () => workConnectionService?.close?.(),
      async () => aiAnalysisService?.close?.(),
      async () => documentTreeService?.close?.(),
      async () => fileBasedConnectionService?.close?.()
    );
  });

  describe('BMAD → Documentation → Hooks Integration Chain', () => {
    test('should handle complete specification to documentation workflow', async () => {
      // Step 1: Parse business specification with BMAD
      const specification = `
# User Authentication System

## Requirements
- Implement OAuth2 authentication
- Support multiple providers (Google, GitHub, Microsoft)
- Secure token storage and validation
- User profile management

## Tasks
- [ ] Set up OAuth2 configuration
- [ ] Implement authentication endpoints
- [ ] Create user profile API
- [ ] Add security middleware
- [ ] Write comprehensive tests
`;

      const bmadResult = await bmadService.parseSpecification(specification, {
        format: 'markdown',
        generateTasks: true,
        autoAssign: true
      });

      expect(bmadResult.success).toBe(true);
      expect(bmadResult.tasks).toBeDefined();
      expect(bmadResult.tasks.length).toBeGreaterThan(0);

      // Step 2: Create documentation based on specification
      const firstTask = bmadResult.tasks[0];
      const docResult = await documentationService.updateDocumentation({
        workDescription: firstTask.description,
        updatedFiles: ['src/auth/oauth.ts', 'src/auth/middleware.ts'],
        documentationChanges: 'Updated authentication documentation with OAuth2 implementation details'
      });

      expect(docResult.success).toBe(true);
      expect(docResult.updatedDocuments).toBeDefined();

      // Step 3: Trigger hooks for documentation updates
      const hookResult = await hooksService.triggerHook({
        eventType: 'documentation_updated',
        data: {
          updatedDocuments: docResult.updatedDocuments,
          relatedTask: firstTask.id,
          changeDescription: 'Authentication system documentation updated'
        }
      });

      expect(hookResult.success).toBe(true);
      expect(hookResult.triggeredHooks).toBeDefined();

      // Step 4: Verify the complete chain worked
      expect(bmadResult.tasks[0].id).toBeDefined();
      expect(docResult.updatedDocuments.length).toBeGreaterThan(0);
      expect(hookResult.triggeredHooks.length).toBeGreaterThan(0);
    });

    test('should handle task status updates propagating through documentation', async () => {
      // Create a task through BMAD
      const specification = '# Simple Task\n- [ ] Implement feature X';
      const bmadResult = await bmadService.parseSpecification(specification, {
        generateTasks: true
      });

      expect(bmadResult.success).toBe(true);
      const taskId = bmadResult.tasks[0].id;

      // Update task status
      const statusUpdateResult = await bmadService.updateTaskStatus(taskId, 'in_progress', {
        notes: 'Started working on feature X implementation'
      });

      expect(statusUpdateResult.success).toBe(true);

      // This should trigger documentation update
      const docUpdateResult = await documentationService.referenceDocumentation({
        workType: 'backend',
        description: 'Feature X implementation in progress',
        filePaths: ['src/features/featureX.ts']
      });

      expect(docUpdateResult.success).toBe(true);
      expect(docUpdateResult.documents.length).toBeGreaterThan(0);

      // Update task to completed
      const completionResult = await bmadService.updateTaskStatus(taskId, 'completed', {
        notes: 'Feature X implementation completed and tested'
      });

      expect(completionResult.success).toBe(true);

      // This should trigger final documentation update
      const finalDocResult = await documentationService.updateDocumentation({
        workDescription: 'Feature X completed',
        updatedFiles: ['src/features/featureX.ts', 'tests/featureX.test.ts'],
        documentationChanges: 'Added feature X documentation and test coverage'
      });

      expect(finalDocResult.success).toBe(true);
    });
  });

  describe('Document Lifecycle → Work Connection → AI Analysis Chain', () => {
    test('should track document lifecycle through work connections to AI analysis', async () => {
      // Step 1: Initialize document lifecycle
      const lifecycleResult = await documentLifecycleService.updateDocumentLifecycle({
        documentPath: 'docs/api/authentication.md',
        newState: 'draft',
        metadata: {
          author: 'test_user',
          reviewers: ['reviewer1', 'reviewer2'],
          priority: 'high'
        }
      });

      expect(lifecycleResult.success).toBe(true);

      // Step 2: Track work-document connection
      const connectionResult = await workConnectionService.trackWorkDocumentConnection({
        workType: 'backend',
        workDescription: 'Implement JWT token validation',
        filePaths: ['src/auth/jwt.ts', 'src/middleware/auth.ts'],
        expectedDocuments: ['Authentication API Documentation']
      });

      expect(connectionResult.success).toBe(true);
      expect(connectionResult.connections.length).toBeGreaterThan(0);

      // Step 3: Analyze document quality with AI (if enabled)
      if (aiAnalysisService.isEnabled) {
        const aiResult = await aiAnalysisService.analyzeDocumentQuality({
          documentPath: 'docs/api/authentication.md',
          analysisType: 'comprehensive',
          includeRecommendations: true
        });

        expect(aiResult.success).toBe(true);
        expect(aiResult.analysis).toBeDefined();
      }

      // Step 4: Update lifecycle based on analysis
      const updatedLifecycleResult = await documentLifecycleService.updateDocumentLifecycle({
        documentPath: 'docs/api/authentication.md',
        newState: 'review',
        metadata: {
          analysisCompleted: true,
          readyForReview: true
        }
      });

      expect(updatedLifecycleResult.success).toBe(true);
    });

    test('should handle document tree navigation with work connections', async () => {
      // Step 1: Get document tree structure
      const treeResult = await documentTreeService.getDocumentTree({
        rootPath: 'docs',
        maxDepth: 3,
        includeMetadata: true
      });

      expect(treeResult.success).toBe(true);
      expect(treeResult.tree).toBeDefined();

      // Step 2: Track connections for multiple documents in tree
      const documentPaths = this.extractDocumentPaths(treeResult.tree);
      
      for (const docPath of documentPaths.slice(0, 3)) { // Test first 3 documents
        const connectionResult = await workConnectionService.trackWorkDocumentConnection({
          workType: 'documentation',
          workDescription: `Update ${docPath}`,
          filePaths: [docPath],
          expectedDocuments: [docPath]
        });

        expect(connectionResult.success).toBe(true);
      }

      // Step 3: Analyze work connections across document tree
      const fileBasedResult = await fileBasedConnectionService.analyzeWorkDocumentConnections({
        workType: 'documentation',
        analysisDepth: 'comprehensive'
      });

      expect(fileBasedResult.success).toBe(true);
      expect(fileBasedResult.connections.length).toBeGreaterThan(0);
    });

    // Helper method to extract document paths from tree
    extractDocumentPaths(tree: any): string[] {
      const paths: string[] = [];
      
      const traverse = (node: any, currentPath: string = '') => {
        if (node.type === 'file' && node.name.endsWith('.md')) {
          paths.push(currentPath + '/' + node.name);
        } else if (node.children) {
          for (const child of node.children) {
            traverse(child, currentPath + '/' + node.name);
          }
        }
      };

      traverse(tree);
      return paths;
    }
  });

  describe('DateTime Service Integration with All Services', () => {
    test('should handle timezone consistency across all services', async () => {
      // Use configurable timezone instead of hardcoded value
      const testTimeZone = process.env.TEST_TIMEZONE || 'UTC';
      const testLocale = process.env.TEST_LOCALE || 'en-US';
      const testDate = '2024-01-15T10:00:00.000Z';

      // Test datetime service directly
      const formattedDate = await dateTimeService.formatDate(testDate, {
        timeZone: testTimeZone,
        locale: testLocale
      });

      expect(formattedDate.success).toBe(true);
      expect(formattedDate.formatted).toContain('2024');

      // Test datetime integration with document lifecycle
      const lifecycleWithDateTime = await documentLifecycleService.updateDocumentLifecycle({
        documentPath: 'test-document.md',
        newState: 'draft',
        metadata: {
          created: testDate,
          timeZone: testTimeZone
        }
      });

      expect(lifecycleWithDateTime.success).toBe(true);

      // Test datetime integration with BMAD tasks
      const specification = '# Time-sensitive Task\n- [ ] Complete by end of day';
      const bmadWithTime = await bmadService.parseSpecification(specification, {
        generateTasks: true,
        dueDate: testDate,
        timeZone: testTimeZone
      });

      expect(bmadWithTime.success).toBe(true);
      
      // Test work connection tracking with timestamps
      const connectionWithTime = await workConnectionService.trackWorkDocumentConnection({
        workType: 'urgent',
        workDescription: 'Time-critical update',
        filePaths: ['urgent-file.ts'],
        expectedDocuments: ['urgent-docs.md'],
        metadata: {
          deadline: testDate,
          timeZone: testTimeZone
        }
      });

      expect(connectionWithTime.success).toBe(true);
    });

    test('should handle relative time calculations across services', async () => {
      const now = new Date().toISOString();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // -24 hours

      // Test relative time with document lifecycle
      const overdueDocs = await documentLifecycleService.getDocumentsByState('review', {
        overdueSince: pastDate
      });

      expect(overdueDocs.success).toBe(true);

      // Test upcoming deadlines with BMAD
      const upcomingTasks = await bmadService.getTasksByStatus('pending', {
        dueBefore: futureDate
      });

      expect(upcomingTasks.success).toBe(true);

      // Test time-based work connection analysis
      const recentConnections = await workConnectionService.getRecentConnections({
        since: pastDate,
        workTypes: ['backend', 'frontend', 'documentation']
      });

      expect(recentConnections.success).toBe(true);
    });
  });

  describe('Error Propagation and Recovery Across Services', () => {
    test('should handle service failures gracefully in integration chains', async () => {
      // Simulate a service failure in the middle of a chain
      const mockError = new Error('Simulated service failure');
      
      // Mock a service method to fail
      const originalUpdateDoc = documentationService.updateDocumentation;
      documentationService.updateDocumentation = jest.fn().mockRejectedValue(mockError);

      try {
        // Start a chain that should fail at documentation service
        const specification = '# Test Chain Failure\n- [ ] This should fail at documentation step';
        const bmadResult = await bmadService.parseSpecification(specification, {
          generateTasks: true
        });

        expect(bmadResult.success).toBe(true);

        // This should fail
        const docResult = await documentationService.updateDocumentation({
          workDescription: 'This will fail',
          updatedFiles: ['test.ts'],
          documentationChanges: 'This should fail'
        });

        expect(docResult.success).toBe(false);
        expect(docResult.error).toBeDefined();

        // But the BMAD service should still be functional
        const statusUpdate = await bmadService.updateTaskStatus(
          bmadResult.tasks[0].id, 
          'blocked',
          { notes: 'Blocked due to documentation service failure' }
        );

        expect(statusUpdate.success).toBe(true);

      } finally {
        // Restore original method
        documentationService.updateDocumentation = originalUpdateDoc;
      }
    });

    test('should recover from transient failures with retry mechanisms', async () => {
      let callCount = 0;
      const originalTrackConnection = workConnectionService.trackWorkDocumentConnection;
      
      // Mock service to fail first 2 times, then succeed
      workConnectionService.trackWorkDocumentConnection = jest.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Transient failure');
        }
        return originalTrackConnection.apply(workConnectionService, args);
      });

      try {
        // Implement retry logic
        let lastError: Error | null = null;
        let result: any = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            result = await workConnectionService.trackWorkDocumentConnection({
              workType: 'retry_test',
              workDescription: 'Testing retry mechanism',
              filePaths: ['retry-test.ts'],
              expectedDocuments: ['retry-docs.md']
            });
            break; // Success
          } catch (error) {
            lastError = error as Error;
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          }
        }

        expect(result.success).toBe(true);
        expect(callCount).toBe(3); // Should have been called 3 times

      } finally {
        // Restore original method
        workConnectionService.trackWorkDocumentConnection = originalTrackConnection;
      }
    });

    test('should maintain data consistency during partial failures', async () => {
      const testDb = getTestDb();
      
      // Start a transaction-like sequence
      const specification = '# Consistency Test\n- [ ] Ensure data consistency';
      const bmadResult = await bmadService.parseSpecification(specification, {
        generateTasks: true
      });

      expect(bmadResult.success).toBe(true);
      const taskId = bmadResult.tasks[0].id;

      // Simulate partial failure scenario
      const originalUpdateStatus = bmadService.updateTaskStatus;
      let updateAttempted = false;

      bmadService.updateTaskStatus = jest.fn().mockImplementation(async (id, status, options) => {
        updateAttempted = true;
        if (status === 'completed') {
          throw new Error('Simulated completion failure');
        }
        return originalUpdateStatus.call(bmadService, id, status, options);
      });

      try {
        // This should succeed
        const progressResult = await bmadService.updateTaskStatus(taskId, 'in_progress', {
          notes: 'Starting work'
        });
        expect(progressResult.success).toBe(true);

        // This should fail
        const completionResult = await bmadService.updateTaskStatus(taskId, 'completed', {
          notes: 'Attempting completion'
        });
        expect(completionResult.success).toBe(false);

        // Verify data consistency - task should still be in progress
        const tasks = await bmadService.getTasksByStatus('in_progress');
        expect(tasks.success).toBe(true);
        expect(tasks.tasks.some(t => t.id === taskId)).toBe(true);

        // Verify it's not in completed state
        const completedTasks = await bmadService.getTasksByStatus('completed');
        expect(completedTasks.success).toBe(true);
        expect(completedTasks.tasks.some(t => t.id === taskId)).toBe(false);

      } finally {
        // Restore original method
        bmadService.updateTaskStatus = originalUpdateStatus;
      }
    });
  });

  describe('Performance and Scalability of Service Chains', () => {
    test('should handle high-throughput service interactions efficiently', async () => {
      const startTime = Date.now();
      const concurrentOperations = 10;
      const operations: Promise<any>[] = [];

      // Create concurrent operations across multiple services
      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          bmadService.parseSpecification(`# Task ${i}\n- [ ] Complete task ${i}`, {
            generateTasks: true
          })
        );

        operations.push(
          documentationService.searchDocumentation({
            query: `search term ${i}`,
            maxResults: 5
          })
        );

        operations.push(
          workConnectionService.trackWorkDocumentConnection({
            workType: `type-${i}`,
            workDescription: `Description ${i}`,
            filePaths: [`file-${i}.ts`],
            expectedDocuments: [`doc-${i}.md`]
          })
        );
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);
      const endTime = Date.now();

      // Analyze results
      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      const failedResults = results.filter(r => r.status === 'rejected').length;
      const executionTime = endTime - startTime;

      expect(successfulResults).toBeGreaterThan(concurrentOperations * 2); // At least 2/3 should succeed
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(failedResults / results.length).toBeLessThan(0.1); // Less than 10% failure rate

      console.log(`High-throughput test: ${successfulResults}/${results.length} operations succeeded in ${executionTime}ms`);
    });

    test('should maintain performance under memory pressure', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const operations = [];

      // Create memory-intensive operations
      for (let i = 0; i < 50; i++) {
        const largeSpecification = '# Large Specification\n' + 'Large content line\n'.repeat(100);
        
        operations.push(
          bmadService.parseSpecification(largeSpecification, {
            generateTasks: true
          }).then(result => {
            // Force garbage collection if available
            if (typeof global.gc === 'function') {
              global.gc();
            }
            return result;
          })
        );
      }

      // Execute operations in batches to control memory usage
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        
        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      }

      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulResults).toBeGreaterThan(operations.length * 0.8); // At least 80% success

      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = finalMemory - initialMemory;
      expect(totalMemoryIncrease).toBeLessThan(150 * 1024 * 1024); // Less than 150MB total increase
    });
  });
});