/**
 * Test Schema Migration
 * Creates additional tables specifically for testing purposes
 */
import { BaseMigration } from '../infrastructure/Migration';
import { DatabaseConnection } from '../infrastructure/DatabaseConnection';
export default class TestSchemaMigration extends BaseMigration {
    version: string;
    name: string;
    description: string;
    up(connection: DatabaseConnection): void;
    down(connection: DatabaseConnection): void;
}
//# sourceMappingURL=999_test_schema.d.ts.map