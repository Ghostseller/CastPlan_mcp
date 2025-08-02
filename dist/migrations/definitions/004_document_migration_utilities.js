/**
 * Document Migration Utilities
 * Provides utilities for migrating existing documents to semantic chunking format
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { BaseMigration } from '../infrastructure/Migration';
export default class DocumentMigrationUtilitiesMigration extends BaseMigration {
    version = '004';
    name = 'create_document_migration_utilities';
    description = 'Create migration utilities and tracking tables for existing document chunking';
    up(connection) {
        // Create migration status tracking table
        this.createTable(connection, 'document_migration_status', `
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      migration_version TEXT NOT NULL,
      migration_status TEXT DEFAULT 'pending',
      chunks_created INTEGER DEFAULT 0,
      embeddings_generated INTEGER DEFAULT 0,
      relationships_detected INTEGER DEFAULT 0,
      topics_detected INTEGER DEFAULT 0,
      migration_started_at TEXT,
      migration_completed_at TEXT,
      migration_errors TEXT DEFAULT '[]',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    `);
        // Create migration batch tracking table
        this.createTable(connection, 'migration_batches', `
      id TEXT PRIMARY KEY,
      batch_name TEXT NOT NULL,
      migration_type TEXT NOT NULL,
      total_documents INTEGER DEFAULT 0,
      processed_documents INTEGER DEFAULT 0,
      successful_documents INTEGER DEFAULT 0,
      failed_documents INTEGER DEFAULT 0,
      batch_status TEXT DEFAULT 'pending',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      configuration TEXT DEFAULT '{}',
      error_summary TEXT DEFAULT '[]'
    `);
        // Create migration configuration table
        this.createTable(connection, 'migration_configurations', `
      id TEXT PRIMARY KEY,
      config_name TEXT NOT NULL UNIQUE,
      config_version TEXT NOT NULL,
      chunking_strategy TEXT DEFAULT 'semantic',
      max_chunk_size INTEGER DEFAULT 1000,
      min_chunk_size INTEGER DEFAULT 100,
      overlap_percentage REAL DEFAULT 0.1,
      embedding_model TEXT DEFAULT 'text-embedding-ada-002',
      similarity_threshold REAL DEFAULT 0.7,
      quality_threshold REAL DEFAULT 0.5,
      enable_versioning BOOLEAN DEFAULT TRUE,
      enable_topic_detection BOOLEAN DEFAULT TRUE,
      enable_relationship_detection BOOLEAN DEFAULT TRUE,
      parallel_processing BOOLEAN DEFAULT TRUE,
      batch_size INTEGER DEFAULT 10,
      retry_limit INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_active BOOLEAN DEFAULT FALSE
    `);
        // Create migration performance metrics table
        this.createTable(connection, 'migration_performance_metrics', `
      id TEXT PRIMARY KEY,
      migration_batch_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      processing_start_time TEXT NOT NULL,
      processing_end_time TEXT,
      chunking_time_ms INTEGER DEFAULT 0,
      embedding_time_ms INTEGER DEFAULT 0,
      relationship_time_ms INTEGER DEFAULT 0,
      topic_detection_time_ms INTEGER DEFAULT 0,
      total_processing_time_ms INTEGER DEFAULT 0,
      chunks_created INTEGER DEFAULT 0,
      embeddings_generated INTEGER DEFAULT 0,
      relationships_created INTEGER DEFAULT 0,
      topics_assigned INTEGER DEFAULT 0,
      memory_usage_mb REAL DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      FOREIGN KEY (migration_batch_id) REFERENCES migration_batches (id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    `);
        // Create performance indexes
        this.addIndex(connection, 'document_migration_status', ['document_id']);
        this.addIndex(connection, 'document_migration_status', ['migration_status']);
        this.addIndex(connection, 'document_migration_status', ['migration_version']);
        this.addIndex(connection, 'document_migration_status', ['migration_started_at']);
        this.addIndex(connection, 'migration_batches', ['batch_status']);
        this.addIndex(connection, 'migration_batches', ['migration_type']);
        this.addIndex(connection, 'migration_batches', ['started_at']);
        this.addIndex(connection, 'migration_configurations', ['config_name'], true);
        this.addIndex(connection, 'migration_configurations', ['is_active']);
        this.addIndex(connection, 'migration_performance_metrics', ['migration_batch_id']);
        this.addIndex(connection, 'migration_performance_metrics', ['document_id']);
        this.addIndex(connection, 'migration_performance_metrics', ['processing_start_time']);
        // Insert default migration configuration
        connection.execute(`
      INSERT INTO migration_configurations (
        id, config_name, config_version, chunking_strategy, max_chunk_size,
        min_chunk_size, overlap_percentage, embedding_model, similarity_threshold,
        quality_threshold, enable_versioning, enable_topic_detection,
        enable_relationship_detection, parallel_processing, batch_size,
        retry_limit, created_at, updated_at, is_active
      ) VALUES (
        'default-config-001',
        'Default Semantic Chunking',
        '1.0.0',
        'semantic',
        1000,
        100,
        0.1,
        'text-embedding-ada-002',
        0.7,
        0.5,
        1,
        1,
        1,
        1,
        10,
        3,
        datetime('now'),
        datetime('now'),
        1
      )
    `);
    }
    down(connection) {
        // Drop tables in reverse dependency order
        this.dropTable(connection, 'migration_performance_metrics');
        this.dropTable(connection, 'migration_configurations');
        this.dropTable(connection, 'migration_batches');
        this.dropTable(connection, 'document_migration_status');
    }
}
//# sourceMappingURL=004_document_migration_utilities.js.map