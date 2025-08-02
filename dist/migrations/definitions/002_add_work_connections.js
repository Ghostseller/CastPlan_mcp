/**
 * Work Connections Migration
 * Adds work connections table for document-task relationships
 */
import { BaseMigration } from '../infrastructure/Migration';
export default class WorkConnectionsMigration extends BaseMigration {
    version = '002';
    name = 'add_work_connections';
    description = 'Add work connections table for document-task relationships';
    up(connection) {
        // Create work_connections table
        this.createTable(connection, 'work_connections', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_type TEXT NOT NULL,
      document_id INTEGER,
      task_id INTEGER,
      connection_strength REAL DEFAULT 0.0,
      relevance_score REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    `);
        // Add indexes for performance
        this.addIndex(connection, 'work_connections', ['work_type']);
        this.addIndex(connection, 'work_connections', ['document_id']);
        this.addIndex(connection, 'work_connections', ['task_id']);
        this.addIndex(connection, 'work_connections', ['connection_strength']);
        this.addIndex(connection, 'work_connections', ['document_id', 'task_id'], true); // Unique constraint
    }
    down(connection) {
        this.dropTable(connection, 'work_connections');
    }
}
//# sourceMappingURL=002_add_work_connections.js.map