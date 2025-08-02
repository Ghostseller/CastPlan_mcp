/**
 * Test Schema Migration
 * Creates additional tables specifically for testing purposes
 */
import { BaseMigration } from '../infrastructure/Migration';
export default class TestSchemaMigration extends BaseMigration {
    version = '999';
    name = 'create_test_schema';
    description = 'Create additional tables for testing better-sqlite3 features';
    up(connection) {
        // Create performance test table
        this.createTable(connection, 'performance_test', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      number_val INTEGER,
      large_text TEXT,
      json_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `);
        // Create migration test table
        this.createTable(connection, 'migration_test', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_name TEXT NOT NULL,
      test_data TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `);
        // Create concurrency test table
        this.createTable(connection, 'concurrency_test', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      value INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    `);
        // Add comprehensive indexes
        this.addIndex(connection, 'performance_test', ['number_val']);
        this.addIndex(connection, 'performance_test', ['created_at']);
        this.addIndex(connection, 'migration_test', ['test_name']);
        this.addIndex(connection, 'migration_test', ['is_active']);
        this.addIndex(connection, 'concurrency_test', ['thread_id']);
        this.addIndex(connection, 'concurrency_test', ['operation_id']);
        this.addIndex(connection, 'concurrency_test', ['timestamp']);
        // Insert some test data
        connection.execute(`
      INSERT INTO migration_test (test_name, test_data) VALUES
      ('migration_rollback_test', 'This data should survive rollbacks'),
      ('performance_baseline', 'Baseline performance data'),
      ('concurrency_validation', 'Concurrency test validation data')
    `);
    }
    down(connection) {
        this.dropTable(connection, 'concurrency_test');
        this.dropTable(connection, 'migration_test');
        this.dropTable(connection, 'performance_test');
    }
}
//# sourceMappingURL=999_test_schema.js.map