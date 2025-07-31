/**
 * Database Integration Testing Framework
 * Provides comprehensive database testing capabilities with real SQLite operations
 */

import Database from 'sqlite3';
import { promisify } from 'util';
import { join } from 'path';
import { unlink, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface TestDatabase {
  db: Database.Database;
  path: string;
  cleanup: () => Promise<void>;
}

export interface DatabaseTestConfig {
  testDbPath?: string;
  enableLogging?: boolean;
  timeoutMs?: number;
  schema?: string[];
}

export interface TransactionTestResult {
  success: boolean;
  error?: Error;
  rollbackSuccess?: boolean;
  dataIntegrity: boolean;
}

export class DatabaseIntegrationTestFramework {
  private static activeDatabases: Map<string, TestDatabase> = new Map();
  private static testDbDirectory = join(process.cwd(), 'test-databases');

  /**
   * Setup a real SQLite database for integration testing
   */
  static async setupRealDatabase(config: DatabaseTestConfig = {}): Promise<TestDatabase> {
    const testId = uuidv4().substring(0, 8);
    const dbPath = config.testDbPath || join(this.testDbDirectory, `integration-test-${testId}.db`);
    
    // Ensure test database directory exists
    try {
      await mkdir(this.testDbDirectory, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    return new Promise((resolve, reject) => {
      const db = new Database.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to create test database: ${err.message}`));
          return;
        }

        const testDb: TestDatabase = {
          db,
          path: dbPath,
          cleanup: async () => {
            await this.cleanupDatabase(testId);
          }
        };

        this.activeDatabases.set(testId, testDb);

        if (config.enableLogging) {
          console.log(`Test database created: ${dbPath}`);
        }

        resolve(testDb);
      });

      // Set timeout for database operations
      if (config.timeoutMs) {
        db.configure('busyTimeout', config.timeoutMs);
      }
    });
  }

  /**
   * Initialize database schema for testing
   */
  static async initializeSchema(testDb: TestDatabase, schema: string[]): Promise<void> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));
    
    try {
      for (const schemaSql of schema) {
        await runAsync(schemaSql);
      }
    } catch (error) {
      throw new Error(`Schema initialization failed: ${error.message}`);
    }
  }

  /**
   * Test database migrations and rollbacks
   */
  static async testMigrations(testDb: TestDatabase): Promise<{
    migrationsApplied: boolean;
    rollbackSuccess: boolean;
    schemaIntegrity: boolean;
  }> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));
    const getAsync = promisify(testDb.db.get.bind(testDb.db));

    try {
      // Test basic table creation migration
      await runAsync(`
        CREATE TABLE IF NOT EXISTS migration_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Verify table exists
      const tableInfo = await getAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migration_test'
      `);
      
      const migrationsApplied = !!tableInfo;

      // Test table alteration (add column)
      await runAsync(`
        ALTER TABLE migration_test 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);

      // Test rollback by dropping the added column (SQLite limitation workaround)
      await runAsync(`
        CREATE TABLE migration_test_backup AS 
        SELECT id, name, created_at FROM migration_test
      `);
      
      await runAsync(`DROP TABLE migration_test`);
      await runAsync(`ALTER TABLE migration_test_backup RENAME TO migration_test`);

      // Verify rollback success
      const columnInfo = await getAsync(`PRAGMA table_info(migration_test)`);
      const rollbackSuccess = !columnInfo || !('updated_at' in columnInfo);

      // Test schema integrity
      const integrityCheck = await getAsync(`PRAGMA integrity_check`);
      const schemaIntegrity = integrityCheck?.integrity_check === 'ok';

      return {
        migrationsApplied,
        rollbackSuccess,
        schemaIntegrity
      };
    } catch (error) {
      throw new Error(`Migration testing failed: ${error.message}`);
    }
  }

  /**
   * Test transaction rollback scenarios
   */
  static async testTransactionRollback(testDb: TestDatabase): Promise<TransactionTestResult> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));
    const allAsync = promisify(testDb.db.all.bind(testDb.db));

    try {
      // Setup test table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS transaction_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value TEXT NOT NULL
        )
      `);

      // Insert initial data
      await runAsync(`INSERT INTO transaction_test (value) VALUES ('initial')`);
      
      const initialCount = await allAsync(`SELECT COUNT(*) as count FROM transaction_test`);
      const initialDataCount = initialCount[0]?.count || 0;

      // Test transaction with intentional failure
      let transactionError: Error | undefined;
      let rollbackSuccess = false;

      try {
        await runAsync(`BEGIN TRANSACTION`);
        await runAsync(`INSERT INTO transaction_test (value) VALUES ('should_rollback')`);
        
        // Intentional error to trigger rollback
        await runAsync(`INSERT INTO non_existent_table (value) VALUES ('error')`);
        
        await runAsync(`COMMIT`);
      } catch (error) {
        transactionError = error as Error;
        try {
          await runAsync(`ROLLBACK`);
          rollbackSuccess = true;
        } catch (rollbackError) {
          rollbackSuccess = false;
        }
      }

      // Verify data integrity after rollback
      const finalCount = await allAsync(`SELECT COUNT(*) as count FROM transaction_test`);
      const finalDataCount = finalCount[0]?.count || 0;
      const dataIntegrity = finalDataCount === initialDataCount;

      return {
        success: !!transactionError, // Success means we caught the error
        error: transactionError,
        rollbackSuccess,
        dataIntegrity
      };
    } catch (error) {
      throw new Error(`Transaction rollback testing failed: ${error.message}`);
    }
  }

  /**
   * Test concurrent database operations
   */
  static async testConcurrentOperations(testDb: TestDatabase, concurrency: number = 10): Promise<{
    operationsCompleted: number;
    errors: Error[];
    dataConsistency: boolean;
  }> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));
    const getAsync = promisify(testDb.db.get.bind(testDb.db));

    try {
      // Setup test table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS concurrency_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          thread_id TEXT NOT NULL,
          operation_id TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const operations: Promise<void>[] = [];
      const errors: Error[] = [];
      let operationsCompleted = 0;

      // Create concurrent operations
      for (let i = 0; i < concurrency; i++) {
        const operation = this.performConcurrentOperation(testDb, `thread-${i}`, i)
          .then(() => {
            operationsCompleted++;
          })
          .catch((error) => {
            errors.push(error);
          });
        
        operations.push(operation);
      }

      // Wait for all operations to complete
      await Promise.allSettled(operations);

      // Check data consistency
      const result = await getAsync(`
        SELECT COUNT(*) as count, COUNT(DISTINCT thread_id) as unique_threads
        FROM concurrency_test
      `);

      const expectedRecords = operationsCompleted * 2; // Each operation inserts 2 records
      const actualRecords = result?.count || 0;
      const dataConsistency = actualRecords === expectedRecords;

      return {
        operationsCompleted,
        errors,
        dataConsistency
      };
    } catch (error) {
      throw new Error(`Concurrent operations testing failed: ${error.message}`);
    }
  }

  /**
   * Test database performance under load
   */
  static async testDatabasePerformance(testDb: TestDatabase, operationCount: number = 1000): Promise<{
    insertPerformance: { avgTimeMs: number; opsPerSecond: number };
    queryPerformance: { avgTimeMs: number; opsPerSecond: number };
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));
    const allAsync = promisify(testDb.db.all.bind(testDb.db));

    try {
      // Setup performance test table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS performance_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          number_field INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await runAsync(`CREATE INDEX IF NOT EXISTS idx_number_field ON performance_test(number_field)`);

      // Test insert performance
      const insertStartTime = Date.now();
      
      await runAsync(`BEGIN TRANSACTION`);
      for (let i = 0; i < operationCount; i++) {
        await runAsync(`
          INSERT INTO performance_test (data, number_field) 
          VALUES (?, ?)
        `, [`test-data-${i}`, i]);
      }
      await runAsync(`COMMIT`);

      const insertEndTime = Date.now();
      const insertTotalTime = insertEndTime - insertStartTime;
      const insertAvgTime = insertTotalTime / operationCount;
      const insertOpsPerSecond = (operationCount / insertTotalTime) * 1000;

      // Test query performance
      const queryStartTime = Date.now();
      
      for (let i = 0; i < operationCount / 10; i++) { // Fewer queries to keep test reasonable
        await allAsync(`
          SELECT * FROM performance_test 
          WHERE number_field = ? OR number_field = ?
        `, [i, i + 100]);
      }

      const queryEndTime = Date.now();
      const queryTotalTime = queryEndTime - queryStartTime;
      const queryOperations = operationCount / 10;
      const queryAvgTime = queryTotalTime / queryOperations;
      const queryOpsPerSecond = (queryOperations / queryTotalTime) * 1000;

      // Memory usage snapshot
      const memoryUsage = process.memoryUsage();

      return {
        insertPerformance: {
          avgTimeMs: insertAvgTime,
          opsPerSecond: insertOpsPerSecond
        },
        queryPerformance: {
          avgTimeMs: queryAvgTime,
          opsPerSecond: queryOpsPerSecond
        },
        memoryUsage
      };
    } catch (error) {
      throw new Error(`Database performance testing failed: ${error.message}`);
    }
  }

  /**
   * Clean up test database
   */
  static async cleanupDatabase(testId: string): Promise<void> {
    const testDb = this.activeDatabases.get(testId);
    if (!testDb) {
      return;
    }

    return new Promise((resolve, reject) => {
      testDb.db.close(async (err) => {
        if (err) {
          reject(new Error(`Failed to close test database: ${err.message}`));
          return;
        }

        try {
          await unlink(testDb.path);
          this.activeDatabases.delete(testId);
          resolve();
        } catch (unlinkError) {
          // File might already be deleted, don't fail the cleanup
          resolve();
        }
      });
    });
  }

  /**
   * Clean up all active test databases
   */
  static async cleanupAllDatabases(): Promise<void> {
    const cleanupPromises = Array.from(this.activeDatabases.keys()).map(testId =>
      this.cleanupDatabase(testId).catch(error => {
        console.warn(`Failed to cleanup database ${testId}:`, error);
      })
    );

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Get database schema information
   */
  static async getDatabaseSchema(testDb: TestDatabase): Promise<{
    tables: string[];
    indexes: string[];
    views: string[];
  }> {
    const allAsync = promisify(testDb.db.all.bind(testDb.db));

    try {
      const tables = await allAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

      const indexes = await allAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

      const views = await allAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='view'
        ORDER BY name
      `);

      return {
        tables: tables.map(t => t.name),
        indexes: indexes.map(i => i.name),
        views: views.map(v => v.name)
      };
    } catch (error) {
      throw new Error(`Failed to get database schema: ${error.message}`);
    }
  }

  /**
   * Private helper for concurrent operations
   */
  private static async performConcurrentOperation(
    testDb: TestDatabase, 
    threadId: string, 
    operationId: number
  ): Promise<void> {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));

    // Simulate some work with multiple database operations
    await runAsync(`
      INSERT INTO concurrency_test (thread_id, operation_id) 
      VALUES (?, ?)
    `, [threadId, `op-${operationId}-1`]);

    // Small delay to increase chance of race conditions
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    await runAsync(`
      INSERT INTO concurrency_test (thread_id, operation_id) 
      VALUES (?, ?)
    `, [threadId, `op-${operationId}-2`]);
  }
}

/**
 * Jest setup helper for database integration tests
 */
export const setupDatabaseIntegrationTest = () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await DatabaseIntegrationTestFramework.setupRealDatabase({
      enableLogging: process.env.NODE_ENV === 'test-debug',
      timeoutMs: 5000
    });
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
    // Cleanup any remaining databases
    await DatabaseIntegrationTestFramework.cleanupAllDatabases();
  });

  return () => testDb;
};

/**
 * Database test utilities
 */
export const databaseTestUtils = {
  /**
   * Create a test schema for common use cases
   */
  getStandardTestSchema: (): string[] => [
    `CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS work_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_type TEXT NOT NULL,
      document_id INTEGER,
      connection_strength REAL DEFAULT 0.0,
      relevance_score REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents (id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_work_connections_type ON work_connections(work_type)`
  ],

  /**
   * Insert test data
   */
  insertTestData: async (testDb: TestDatabase) => {
    const runAsync = promisify(testDb.db.run.bind(testDb.db));

    await runAsync(`BEGIN TRANSACTION`);
    
    // Insert test documents
    await runAsync(`
      INSERT INTO documents (title, content, type, status) VALUES
      ('API Documentation', 'REST API endpoints', 'api', 'published'),
      ('User Guide', 'How to use the system', 'guide', 'draft'),
      ('Architecture Overview', 'System architecture', 'technical', 'review')
    `);

    // Insert test tasks
    await runAsync(`
      INSERT INTO tasks (title, description, status, priority) VALUES
      ('Implement authentication', 'Add OAuth2 support', 'in_progress', 'high'),
      ('Write tests', 'Unit and integration tests', 'pending', 'medium'),
      ('Update documentation', 'Reflect recent changes', 'completed', 'low')
    `);

    // Insert test work connections
    await runAsync(`
      INSERT INTO work_connections (work_type, document_id, connection_strength, relevance_score) VALUES
      ('backend', 1, 0.9, 0.95),
      ('frontend', 2, 0.7, 0.8),
      ('architecture', 3, 1.0, 1.0)
    `);

    await runAsync(`COMMIT`);
  }
};