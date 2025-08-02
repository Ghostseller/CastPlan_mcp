/**
 * Work Connections Migration
 * Adds work connections table for document-task relationships
 */
import { BaseMigration } from '../infrastructure/Migration';
import { DatabaseConnection } from '../infrastructure/DatabaseConnection';
export default class WorkConnectionsMigration extends BaseMigration {
    version: string;
    name: string;
    description: string;
    up(connection: DatabaseConnection): void;
    down(connection: DatabaseConnection): void;
}
//# sourceMappingURL=002_add_work_connections.d.ts.map