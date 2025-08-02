/**
 * Initial Database Schema Migration
 * Creates the basic table structure for test infrastructure
 */
import { BaseMigration } from '../infrastructure/Migration';
import { DatabaseConnection } from '../infrastructure/DatabaseConnection';
export default class InitialSchemaMigration extends BaseMigration {
    version: string;
    name: string;
    description: string;
    up(connection: DatabaseConnection): void;
    down(connection: DatabaseConnection): void;
}
//# sourceMappingURL=001_initial_schema.d.ts.map