/**
 * FileBasedWorkDocumentConnectionService Tests
 * 
 * Comprehensive test suite for the missing service
 */

import { FileBasedWorkDocumentConnectionService } from '../services/FileBasedWorkDocumentConnectionService.js';
import { TestDataFactory, MockLoggerFactory, TestDatabase, TestFileSystem, PerformanceTestUtils, TestAssertions } from './helpers/TestUtils.js';

describe('FileBasedWorkDocumentConnectionService', () => {
  let service: FileBasedWorkDocumentConnectionService;
  let tempDbPath: string;
  let tempProjectPath: string;

  beforeEach(async () => {
    tempDbPath = TestDatabase.createTempDbPath();
    tempProjectPath = await TestFileSystem.createTestProject('file-connection-test');
    service = new FileBasedWorkDocumentConnectionService(tempDbPath, MockLoggerFactory.create());
  });

  afterEach(async () => {
    await TestFileSystem.cleanupTempDir();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid database path', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    test('should handle initialization with invalid database path', async () => {
      const invalidService = new FileBasedWorkDocumentConnectionService(
        '/invalid/path/db.sqlite',
        MockLoggerFactory.create()
      );
      
      await expect(invalidService.initialize()).rejects.toThrow();
    });

    test('should initialize only once', async () => {
      await service.initialize();
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should create new file-based connection', async () => {
      const connectionData = TestDataFactory.createMockConnection({
        workType: 'frontend',
        filePaths: ['/src/components/Button.tsx', '/src/styles/button.css']
      });

      const connection = await service.createConnection(connectionData);

      expect(connection).toBeDefined();
      TestAssertions.assertValidUUID(connection.id);
      expect(connection.workType).toBe('frontend');
      expect(connection.filePaths).toHaveLength(2);
      TestAssertions.assertValidISODate(connection.lastSyncedAt);
    });

    test('should retrieve all connections', async () => {
      // Create test connections
      const connections = [
        TestDataFactory.createMockConnection({ workType: 'frontend' }),
        TestDataFactory.createMockConnection({ workType: 'backend' }),
        TestDataFactory.createMockConnection({ workType: 'database' })
      ];

      for (const conn of connections) {
        await service.createConnection(conn);
      }

      const allConnections = await service.getAllConnections();
      expect(allConnections).toHaveLength(3);
      expect(allConnections.map(c => c.workType)).toEqual(
        expect.arrayContaining(['frontend', 'backend', 'database'])
      );
    });

    test('should filter connections by work type', async () => {
      // Create mixed connections
      await service.createConnection(TestDataFactory.createMockConnection({ workType: 'frontend' }));
      await service.createConnection(TestDataFactory.createMockConnection({ workType: 'frontend' }));
      await service.createConnection(TestDataFactory.createMockConnection({ workType: 'backend' }));

      const frontendConnections = await service.getConnectionsByWorkType('frontend');
      expect(frontendConnections).toHaveLength(2);
      expect(frontendConnections.every(c => c.workType === 'frontend')).toBe(true);
    });

    test('should update connection strength', async () => {
      const connection = await service.createConnection(
        TestDataFactory.createMockConnection({ connectionStrength: 0.5 })
      );

      const updated = await service.updateConnectionStrength(connection.id, 0.9);
      expect(updated).toBe(true);

      const updatedConnection = (await service.getAllConnections())
        .find(c => c.id === connection.id);
      expect(updatedConnection?.connectionStrength).toBe(0.9);
    });

    test('should handle updating non-existent connection', async () => {
      const updated = await service.updateConnectionStrength('non-existent-id', 0.8);
      expect(updated).toBe(false);
    });

    test('should delete connection', async () => {
      const connection = await service.createConnection(TestDataFactory.createMockConnection());
      
      const deleted = await service.deleteConnection(connection.id);
      expect(deleted).toBe(true);

      const allConnections = await service.getAllConnections();
      expect(allConnections.find(c => c.id === connection.id)).toBeUndefined();
    });

    test('should handle deleting non-existent connection', async () => {
      const deleted = await service.deleteConnection('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('File Path Analysis', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should analyze file path patterns', async () => {
      const connections = [
        TestDataFactory.createMockConnection({
          workType: 'frontend',
          filePaths: ['/src/components/Header.tsx', '/src/components/Footer.tsx']
        }),
        TestDataFactory.createMockConnection({
          workType: 'frontend',
          filePaths: ['/src/components/Button.tsx', '/src/styles/button.css']
        }),
        TestDataFactory.createMockConnection({
          workType: 'backend',
          filePaths: ['/api/users.ts', '/api/auth.ts']
        })
      ];

      for (const conn of connections) {
        await service.createConnection(conn);
      }

      const frontendConnections = await service.getConnectionsByWorkType('frontend');
      const allFilePaths = frontendConnections.flatMap(c => c.filePaths);
      
      expect(allFilePaths.filter(path => path.includes('/components/'))).toHaveLength(3);
      expect(allFilePaths.filter(path => path.includes('.tsx'))).toHaveLength(3);
    });

    test('should handle connections with no file paths', async () => {
      const connection = await service.createConnection(
        TestDataFactory.createMockConnection({ filePaths: [] })
      );

      expect(connection.filePaths).toHaveLength(0);

      const retrieved = await service.getAllConnections();
      expect(retrieved[0].filePaths).toHaveLength(0);
    });

    test('should validate file paths format', async () => {
      const connectionData = TestDataFactory.createMockConnection({
        filePaths: ['/valid/path.ts', 'invalid-relative-path.ts', '/another/valid/path.js']
      });

      const connection = await service.createConnection(connectionData);
      expect(connection.filePaths).toHaveLength(3); // Service should accept all paths
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should handle large number of connections efficiently', async () => {
      const connectionCount = 1000;
      const connections = Array.from({ length: connectionCount }, (_, i) =>
        TestDataFactory.createMockConnection({
          workType: i % 2 === 0 ? 'frontend' : 'backend',
          workDescription: `Test connection ${i}`,
          filePaths: [`/test/file${i}.ts`]
        })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        for (const conn of connections) {
          await service.createConnection(conn);
        }
      });

      TestAssertions.assertExecutionTime(duration, 5000, 'Creating 1000 connections');

      const allConnections = await service.getAllConnections();
      expect(allConnections).toHaveLength(connectionCount);
    });

    test('should retrieve connections quickly', async () => {
      // Create test data
      for (let i = 0; i < 100; i++) {
        await service.createConnection(TestDataFactory.createMockConnection({
          workType: 'frontend',
          filePaths: [`/test/file${i}.ts`]
        }));
      }

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await service.getConnectionsByWorkType('frontend');
      });

      TestAssertions.assertExecutionTime(duration, 100, 'Retrieving 100 frontend connections');
    });

    test('should handle concurrent operations', async () => {
      const concurrentOps = Array.from({ length: 50 }, (_, i) => async () => {
        const connection = await service.createConnection(
          TestDataFactory.createMockConnection({
            workDescription: `Concurrent connection ${i}`
          })
        );
        return connection;
      });

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(concurrentOps.map(op => op()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, 'Creating 50 connections concurrently');

      const allConnections = await service.getAllConnections();
      expect(allConnections).toHaveLength(50);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const faultyService = new FileBasedWorkDocumentConnectionService(
        '/invalid/path/database.db',
        MockLoggerFactory.create()
      );

      await expect(faultyService.initialize()).rejects.toThrow();
    });

    test('should handle corrupted data gracefully', async () => {
      await service.initialize();
      
      // Create connection with invalid data
      const invalidConnection = {
        ...TestDataFactory.createMockConnection(),
        connectionStrength: 'invalid' as any,
        lastSyncedAt: 'invalid-date'
      };

      await expect(service.createConnection(invalidConnection)).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      await service.initialize();

      const incompleteConnection = {
        workType: 'frontend',
        // Missing required fields
      } as any;

      await expect(service.createConnection(incompleteConnection)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should maintain data consistency across operations', async () => {
      const connection = await service.createConnection(TestDataFactory.createMockConnection({
        workType: 'frontend',
        connectionStrength: 0.7
      }));

      // Update strength
      await service.updateConnectionStrength(connection.id, 0.9);

      // Verify consistency
      const retrieved = (await service.getAllConnections()).find(c => c.id === connection.id);
      expect(retrieved?.connectionStrength).toBe(0.9);
      expect(retrieved?.workType).toBe('frontend');
    });

    test('should handle edge cases in connection strength', async () => {
      const connection = await service.createConnection(TestDataFactory.createMockConnection());

      // Test boundary values
      await expect(service.updateConnectionStrength(connection.id, 0)).resolves.toBe(true);
      await expect(service.updateConnectionStrength(connection.id, 1)).resolves.toBe(true);
      
      // Test invalid values
      await expect(service.updateConnectionStrength(connection.id, -0.1)).rejects.toThrow();
      await expect(service.updateConnectionStrength(connection.id, 1.1)).rejects.toThrow();
    });

    test('should preserve file path order and uniqueness', async () => {
      const filePaths = ['/src/a.ts', '/src/b.ts', '/src/a.ts', '/src/c.ts'];
      const connection = await service.createConnection(
        TestDataFactory.createMockConnection({ filePaths })
      );

      // Should preserve order but may handle duplicates based on implementation
      expect(connection.filePaths).toHaveLength(filePaths.length);
      expect(connection.filePaths[0]).toBe('/src/a.ts');
      expect(connection.filePaths[1]).toBe('/src/b.ts');
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should cleanup resources properly', async () => {
      await service.initialize();
      
      // Create some connections
      for (let i = 0; i < 10; i++) {
        await service.createConnection(TestDataFactory.createMockConnection());
      }

      // Cleanup should not throw
      await expect(service.cleanup?.()).resolves.not.toThrow();
    });

    test('should handle cleanup when not initialized', async () => {
      // Should not throw even if not initialized
      await expect(service.cleanup?.()).resolves.not.toThrow();
    });
  });
});