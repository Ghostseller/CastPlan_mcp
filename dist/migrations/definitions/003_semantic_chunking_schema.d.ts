/**
 * Semantic Chunking Schema Migration
 * Extends the database with semantic chunking capabilities for document analysis
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { BaseMigration } from '../infrastructure/Migration';
import { DatabaseConnection } from '../infrastructure/DatabaseConnection';
export default class SemanticChunkingSchemaMigration extends BaseMigration {
    version: string;
    name: string;
    description: string;
    up(connection: DatabaseConnection): void;
    down(connection: DatabaseConnection): void;
}
//# sourceMappingURL=003_semantic_chunking_schema.d.ts.map