/**
 * Initial Database Schema Migration
 * Creates the basic table structure for test infrastructure
 */
import { BaseMigration } from '../infrastructure/Migration';
export default class InitialSchemaMigration extends BaseMigration {
    version = '001';
    name = 'create_initial_schema';
    description = 'Create initial database schema with core tables';
    up(connection) {
        // Create documents table
        this.createTable(connection, 'documents', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `);
        // Create tasks table
        this.createTable(connection, 'tasks', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME
    `);
        // Create indexes for performance
        this.addIndex(connection, 'documents', ['type']);
        this.addIndex(connection, 'documents', ['status']);
        this.addIndex(connection, 'documents', ['created_at']);
        this.addIndex(connection, 'tasks', ['status']);
        this.addIndex(connection, 'tasks', ['priority']);
        this.addIndex(connection, 'tasks', ['assigned_to']);
    }
    down(connection) {
        this.dropTable(connection, 'tasks');
        this.dropTable(connection, 'documents');
    }
}
//# sourceMappingURL=001_initial_schema.js.map