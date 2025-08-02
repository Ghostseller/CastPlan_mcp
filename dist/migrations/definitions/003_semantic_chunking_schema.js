/**
 * Semantic Chunking Schema Migration
 * Extends the database with semantic chunking capabilities for document analysis
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { BaseMigration } from '../infrastructure/Migration';
export default class SemanticChunkingSchemaMigration extends BaseMigration {
    version = '003';
    name = 'create_semantic_chunking_schema';
    description = 'Create semantic chunking tables for document analysis and vector storage';
    up(connection) {
        // Create document_chunks table - Core chunk storage with metadata
        this.createTable(connection, 'document_chunks', `
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      chunk_type TEXT DEFAULT 'semantic',
      start_position INTEGER DEFAULT 0,
      end_position INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      quality_score REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    `);
        // Create chunk_embeddings table - Vector embeddings for semantic similarity
        this.createTable(connection, 'chunk_embeddings', `
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding_dimension INTEGER NOT NULL,
      embedding_vector TEXT NOT NULL,
      embedding_metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE
    `);
        // Create chunk_relationships table - Semantic relationships between chunks
        this.createTable(connection, 'chunk_relationships', `
      id TEXT PRIMARY KEY,
      source_chunk_id TEXT NOT NULL,
      target_chunk_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      similarity_score REAL DEFAULT 0.0,
      relationship_strength REAL DEFAULT 0.0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE,
      FOREIGN KEY (target_chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE
    `);
        // Create chunk_versions table - Chunk version history
        this.createTable(connection, 'chunk_versions', `
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      change_type TEXT NOT NULL,
      change_summary TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY (chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE
    `);
        // Create chunk_topics table - Chunk topics and themes
        this.createTable(connection, 'chunk_topics', `
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      topic_category TEXT,
      confidence_score REAL DEFAULT 0.0,
      topic_keywords TEXT DEFAULT '[]',
      topic_metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE
    `);
        // Create performance indexes for document_chunks
        this.addIndex(connection, 'document_chunks', ['document_id']);
        this.addIndex(connection, 'document_chunks', ['content_hash']);
        this.addIndex(connection, 'document_chunks', ['chunk_type']);
        this.addIndex(connection, 'document_chunks', ['quality_score']);
        this.addIndex(connection, 'document_chunks', ['created_at']);
        // Composite index for chunk ordering
        this.addIndex(connection, 'document_chunks', ['document_id', 'chunk_index']);
        // Create performance indexes for chunk_embeddings
        this.addIndex(connection, 'chunk_embeddings', ['chunk_id']);
        this.addIndex(connection, 'chunk_embeddings', ['embedding_model']);
        this.addIndex(connection, 'chunk_embeddings', ['embedding_dimension']);
        // Create performance indexes for chunk_relationships
        this.addIndex(connection, 'chunk_relationships', ['source_chunk_id']);
        this.addIndex(connection, 'chunk_relationships', ['target_chunk_id']);
        this.addIndex(connection, 'chunk_relationships', ['relationship_type']);
        this.addIndex(connection, 'chunk_relationships', ['similarity_score']);
        // Composite indexes for relationship queries
        this.addIndex(connection, 'chunk_relationships', ['source_chunk_id', 'relationship_type']);
        this.addIndex(connection, 'chunk_relationships', ['target_chunk_id', 'relationship_type']);
        // Create performance indexes for chunk_versions
        this.addIndex(connection, 'chunk_versions', ['chunk_id']);
        this.addIndex(connection, 'chunk_versions', ['version_number']);
        this.addIndex(connection, 'chunk_versions', ['change_type']);
        this.addIndex(connection, 'chunk_versions', ['created_at']);
        // Composite index for version ordering
        this.addIndex(connection, 'chunk_versions', ['chunk_id', 'version_number']);
        // Create performance indexes for chunk_topics
        this.addIndex(connection, 'chunk_topics', ['chunk_id']);
        this.addIndex(connection, 'chunk_topics', ['topic_name']);
        this.addIndex(connection, 'chunk_topics', ['topic_category']);
        this.addIndex(connection, 'chunk_topics', ['confidence_score']);
        // Composite index for topic queries
        this.addIndex(connection, 'chunk_topics', ['topic_category', 'confidence_score']);
        // Add unique constraints where appropriate
        this.addIndex(connection, 'chunk_embeddings', ['chunk_id', 'embedding_model'], true);
        this.addIndex(connection, 'chunk_relationships', ['source_chunk_id', 'target_chunk_id', 'relationship_type'], true);
        this.addIndex(connection, 'chunk_versions', ['chunk_id', 'version_number'], true);
    }
    down(connection) {
        // Drop tables in reverse dependency order
        this.dropTable(connection, 'chunk_topics');
        this.dropTable(connection, 'chunk_versions');
        this.dropTable(connection, 'chunk_relationships');
        this.dropTable(connection, 'chunk_embeddings');
        this.dropTable(connection, 'document_chunks');
    }
}
//# sourceMappingURL=003_semantic_chunking_schema.js.map