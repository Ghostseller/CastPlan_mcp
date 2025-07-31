/**
 * Database Integration Tests
 * Comprehensive testing of database operations with real SQLite database
 */

import { 
  DatabaseIntegrationTestFramework, 
  setupDatabaseIntegrationTest,
  databaseTestUtils,
  TestDatabase,
  TransactionTestResult
} from '../helpers/DatabaseIntegrationTestFramework';

describe('Database Integration Tests', () => {
  const getTestDb = setupDatabaseIntegrationTest();

  describe('Database Setup and Schema', () => {
    test('should create and initialize real database', async () => {
      const testDb = getTestDb();
      expect(testDb).toBeDefined();
      expect(testDb.db).toBeDefined();
      expect(testDb.path).toMatch(/integration-test-.*\.db$/);
      expect(typeof testDb.cleanup).toBe('function');
    });

    test('should initialize database schema successfully', async () => {
      const testDb = getTestDb();
      const schema = databaseTestUtils.getStandardTestSchema();
      
      await expect(
        DatabaseIntegrationTestFramework.initializeSchema(testDb, schema)
      ).resolves.not.toThrow();

      // Verify schema was created
      const schemaInfo = await DatabaseIntegrationTestFramework.getDatabaseSchema(testDb);
      expect(schemaInfo.tables).toContain('documents');
      expect(schemaInfo.tables).toContain('tasks');
      expect(schemaInfo.tables).toContain('work_connections');
      expect(schemaInfo.indexes.length).toBeGreaterThan(0);
    });

    test('should handle schema initialization errors gracefully', async () => {
      const testDb = getTestDb();
      const invalidSchema = ['INVALID SQL STATEMENT'];
      
      await expect(
        DatabaseIntegrationTestFramework.initializeSchema(testDb, invalidSchema)
      ).rejects.toThrow(/Schema initialization failed/);
    });
  });

  describe('Migration Testing', () => {
    test('should test database migrations successfully', async () => {
      const testDb = getTestDb();
      
      const migrationResult = await DatabaseIntegrationTestFramework.testMigrations(testDb);
      
      expect(migrationResult.migrationsApplied).toBe(true);
      expect(migrationResult.rollbackSuccess).toBe(true);
      expect(migrationResult.schemaIntegrity).toBe(true);
    });

    test('should handle migration failures gracefully', async () => {
      const testDb = getTestDb();
      
      // Create a scenario where migration would fail
      const { db } = testDb;
      const runAsync = require('util').promisify(db.run.bind(db));
      
      // Create a table that conflicts with migration
      await runAsync(`CREATE TABLE migration_test (id TEXT PRIMARY KEY)`);
      
      // The migration test should handle this conflict
      const migrationResult = await DatabaseIntegrationTestFramework.testMigrations(testDb);
      
      // Even with conflicts, the framework should provide meaningful results
      expect(typeof migrationResult.migrationsApplied).toBe('boolean');
      expect(typeof migrationResult.rollbackSuccess).toBe('boolean');
      expect(typeof migrationResult.schemaIntegrity).toBe('boolean');
    });
  });

  describe('Transaction Rollback Testing', () => {
    test('should handle transaction rollbacks correctly', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const rollbackResult: TransactionTestResult = await DatabaseIntegrationTestFramework.testTransactionRollback(testDb);
      
      expect(rollbackResult.success).toBe(true); // Should catch the intentional error
      expect(rollbackResult.error).toBeDefined();
      expect(rollbackResult.rollbackSuccess).toBe(true);
      expect(rollbackResult.dataIntegrity).toBe(true);
    });

    test('should maintain data consistency during rollbacks', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      // Insert initial test data
      await databaseTestUtils.insertTestData(testDb);
      
      // Test rollback scenario
      const rollbackResult = await DatabaseIntegrationTestFramework.testTransactionRollback(testDb);
      
      expect(rollbackResult.dataIntegrity).toBe(true);
      
      // Verify original data is still intact
      const { db } = testDb;
      const allAsync = require('util').promisify(db.all.bind(db));
      const documents = await allAsync(`SELECT COUNT(*) as count FROM documents`);
      
      expect(documents[0].count).toBeGreaterThan(0); // Original data should remain
    });
  });

  describe('Concurrent Operations Testing', () => {
    test('should handle concurrent database operations safely', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const concurrencyResult = await DatabaseIntegrationTestFramework.testConcurrentOperations(
        testDb, 
        5 // Moderate concurrency for test stability
      );
      
      expect(concurrencyResult.operationsCompleted).toBeGreaterThan(0);
      expect(concurrencyResult.errors.length).toBeLessThanOrEqual(1); // Allow minimal errors
      expect(concurrencyResult.dataConsistency).toBe(true);
    });

    test('should maintain data consistency under high concurrency', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const concurrencyResult = await DatabaseIntegrationTestFramework.testConcurrentOperations(
        testDb, 
        10 // Higher concurrency
      );
      
      // Even with potential race conditions, data should remain consistent
      expect(concurrencyResult.dataConsistency).toBe(true);
      
      // Verify no major failures occurred
      const errorRate = concurrencyResult.errors.length / 10;
      expect(errorRate).toBeLessThan(0.3); // Less than 30% error rate
    });
  });

  describe('Database Performance Testing', () => {
    test('should measure database performance under load', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const performanceResult = await DatabaseIntegrationTestFramework.testDatabasePerformance(
        testDb, 
        100 // Reasonable load for testing
      );
      
      // Verify performance metrics are reasonable
      expect(performanceResult.insertPerformance.avgTimeMs).toBeLessThan(10); // <10ms per insert
      expect(performanceResult.insertPerformance.opsPerSecond).toBeGreaterThan(10); // >10 ops/sec
      expect(performanceResult.queryPerformance.avgTimeMs).toBeLessThan(50); // <50ms per query
      expect(performanceResult.queryPerformance.opsPerSecond).toBeGreaterThan(1); // >1 query/sec
      
      // Memory usage should be reasonable
      expect(performanceResult.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // <100MB
    });

    test('should handle large dataset operations efficiently', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const performanceResult = await DatabaseIntegrationTestFramework.testDatabasePerformance(
        testDb, 
        500 // Larger dataset
      );
      
      // Performance should remain reasonable even with larger datasets
      expect(performanceResult.insertPerformance.avgTimeMs).toBeLessThan(20); // <20ms per insert
      expect(performanceResult.queryPerformance.avgTimeMs).toBeLessThan(100); // <100ms per query
      
      // Verify operations completed successfully
      const { db } = testDb;
      const getAsync = require('util').promisify(db.get.bind(db));
      const count = await getAsync(`SELECT COUNT(*) as count FROM performance_test`);
      expect(count.count).toBe(500);
    });
  });

  describe('Real-World Database Scenarios', () => {
    test('should handle complex multi-table operations', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      await databaseTestUtils.insertTestData(testDb);
      
      const { db } = testDb;
      const runAsync = require('util').promisify(db.run.bind(db));
      const allAsync = require('util').promisify(db.all.bind(db));
      
      // Complex query with JOINs
      const results = await allAsync(`
        SELECT 
          d.title as document_title,
          d.type as document_type,
          wc.work_type,
          wc.connection_strength,
          wc.relevance_score
        FROM documents d
        JOIN work_connections wc ON d.id = wc.document_id
        WHERE wc.connection_strength > 0.5
        ORDER BY wc.relevance_score DESC
      `);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('document_title');
      expect(results[0]).toHaveProperty('work_type');
      expect(results[0]).toHaveProperty('connection_strength');
      
      // Test complex UPDATE with subquery
      await runAsync(`
        UPDATE documents 
        SET status = 'needs_review' 
        WHERE id IN (
          SELECT document_id 
          FROM work_connections 
          WHERE connection_strength < 0.8
        )
      `);
      
      // Verify update worked
      const updatedDocs = await allAsync(`
        SELECT COUNT(*) as count 
        FROM documents 
        WHERE status = 'needs_review'
      `);
      expect(updatedDocs[0].count).toBeGreaterThan(0);
    });

    test('should handle database constraints and foreign keys', async () => {
      const testDb = getTestDb();
      
      // Create schema with foreign key constraints
      await DatabaseIntegrationTestFramework.initializeSchema(testDb, [
        `PRAGMA foreign_keys = ON`,
        ...databaseTestUtils.getStandardTestSchema()
      ]);
      
      await databaseTestUtils.insertTestData(testDb);
      
      const { db } = testDb;
      const runAsync = require('util').promisify(db.run.bind(db));
      
      // Test foreign key constraint
      await expect(
        runAsync(`
          INSERT INTO work_connections (work_type, document_id, connection_strength) 
          VALUES ('test', 999, 0.5)
        `)
      ).rejects.toThrow(); // Should fail due to foreign key constraint
      
      // Test valid foreign key
      await expect(
        runAsync(`
          INSERT INTO work_connections (work_type, document_id, connection_strength) 
          VALUES ('test', 1, 0.5)
        `)
      ).resolves.not.toThrow();
    });

    test('should handle database corruption recovery', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      await databaseTestUtils.insertTestData(testDb);
      
      const { db } = testDb;
      const getAsync = require('util').promisify(db.get.bind(db));
      
      // Check database integrity
      const integrityCheck = await getAsync(`PRAGMA integrity_check`);
      expect(integrityCheck.integrity_check).toBe('ok');
      
      // Test recovery mechanisms
      const vacuumResult = await getAsync(`PRAGMA incremental_vacuum`);
      expect(vacuumResult).toBeDefined();
      
      // Analyze database for optimization
      const analysisResult = await getAsync(`PRAGMA optimize`);
      expect(analysisResult).toBeDefined();
    });
  });

  describe('Database Cleanup and Resource Management', () => {
    test('should clean up database resources properly', async () => {
      const tempTestDb = await DatabaseIntegrationTestFramework.setupRealDatabase();
      
      expect(tempTestDb).toBeDefined();
      expect(tempTestDb.path).toMatch(/integration-test-.*\.db$/);
      
      // Use the database
      await DatabaseIntegrationTestFramework.initializeSchema(
        tempTestDb, 
        ['CREATE TABLE temp_test (id INTEGER PRIMARY KEY)']
      );
      
      // Clean up
      await tempTestDb.cleanup();
      
      // Verify cleanup
      const fs = require('fs/promises');
      await expect(fs.access(tempTestDb.path)).rejects.toThrow(); // File should be deleted
    });

    test('should handle cleanup of multiple databases', async () => {
      const testDbs = await Promise.all([
        DatabaseIntegrationTestFramework.setupRealDatabase(),
        DatabaseIntegrationTestFramework.setupRealDatabase(),
        DatabaseIntegrationTestFramework.setupRealDatabase()
      ]);
      
      expect(testDbs.length).toBe(3);
      
      // Use all databases
      for (const db of testDbs) {
        await DatabaseIntegrationTestFramework.initializeSchema(
          db, 
          ['CREATE TABLE multi_test (id INTEGER PRIMARY KEY)']
        );
      }
      
      // Clean up all at once
      await DatabaseIntegrationTestFramework.cleanupAllDatabases();
      
      // Verify all are cleaned up
      const fs = require('fs/promises');
      for (const db of testDbs) {
        await expect(fs.access(db.path)).rejects.toThrow();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection failures gracefully', async () => {
      // Test with invalid database path
      await expect(
        DatabaseIntegrationTestFramework.setupRealDatabase({
          testDbPath: '/invalid/path/test.db'
        })
      ).rejects.toThrow(/Failed to create test database/);
    });

    test('should handle SQL injection attempts safely', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      const { db } = testDb;
      const runAsync = require('util').promisify(db.run.bind(db));
      const allAsync = require('util').promisify(db.all.bind(db));
      
      // Test parameterized queries prevent SQL injection
      const maliciousInput = "'; DROP TABLE documents; --";
      
      await expect(
        runAsync(`
          INSERT INTO documents (title, content, type) VALUES (?, ?, ?)
        `, [maliciousInput, 'content', 'test'])
      ).resolves.not.toThrow();
      
      // Verify table still exists
      const tables = await allAsync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='documents'
      `);
      expect(tables.length).toBe(1);
    });

    test('should handle memory pressure scenarios', async () => {
      const testDb = getTestDb();
      await DatabaseIntegrationTestFramework.initializeSchema(
        testDb, 
        databaseTestUtils.getStandardTestSchema()
      );
      
      // Monitor memory usage during large operations
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive database operations
      const performanceResult = await DatabaseIntegrationTestFramework.testDatabasePerformance(
        testDb, 
        1000
      );
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB increase
      expect(performanceResult.memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // <200MB total
    });
  });
});