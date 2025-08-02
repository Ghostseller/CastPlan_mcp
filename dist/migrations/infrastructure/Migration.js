/**
 * Base Migration Interface and Types
 */
export class BaseMigration {
    down(connection) {
        throw new Error(`Rollback not implemented for migration ${this.version}: ${this.name}`);
    }
    get checksum() {
        // Generate checksum based on migration content
        const content = this.up.toString() + (this.down?.toString() || '');
        return this.generateChecksum(content);
    }
    generateChecksum(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    createTable(connection, tableName, schema) {
        connection.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
    }
    addIndex(connection, tableName, columns, unique = false) {
        const indexName = `idx_${tableName}_${columns.join('_')}`;
        const uniqueKeyword = unique ? 'UNIQUE' : '';
        connection.execute(`CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columns.join(', ')})`);
    }
    addColumn(connection, tableName, columnName, columnType) {
        connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    }
    dropTable(connection, tableName) {
        connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }
    dropIndex(connection, indexName) {
        connection.execute(`DROP INDEX IF EXISTS ${indexName}`);
    }
}
//# sourceMappingURL=Migration.js.map