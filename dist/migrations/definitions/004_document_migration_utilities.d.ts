/**
 * Document Migration Utilities
 * Provides utilities for migrating existing documents to semantic chunking format
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
import { BaseMigration } from '../infrastructure/Migration';
import { DatabaseConnection } from '../infrastructure/DatabaseConnection';
export default class DocumentMigrationUtilitiesMigration extends BaseMigration {
    version: string;
    name: string;
    description: string;
    up(connection: DatabaseConnection): void;
    down(connection: DatabaseConnection): void;
}
//# sourceMappingURL=004_document_migration_utilities.d.ts.map