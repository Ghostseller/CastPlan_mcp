/**
 * Database Schema Validation and Integrity Checking
 */
export class SchemaValidator {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async initialize() {
        // Enable foreign key constraints
        this.connection.execute('PRAGMA foreign_keys = ON');
    }
    async validateSchema(expectedSchema) {
        const errors = [];
        const warnings = [];
        try {
            // Check database integrity
            const integrityResult = this.connection.queryFirst('PRAGMA integrity_check');
            const integrityCheck = integrityResult?.integrity_check === 'ok';
            if (!integrityCheck) {
                errors.push(`Database integrity check failed: ${integrityResult?.integrity_check}`);
            }
            // Check foreign key constraints
            const foreignKeyResult = this.connection.query('PRAGMA foreign_key_check');
            const foreignKeyCheck = foreignKeyResult.length === 0;
            if (!foreignKeyCheck) {
                errors.push(`Foreign key constraint violations found: ${foreignKeyResult.length} violations`);
                foreignKeyResult.forEach(violation => {
                    errors.push(`Table ${violation.table}, row ${violation.rowid}: foreign key violation`);
                });
            }
            // Validate expected schema if provided
            if (expectedSchema) {
                const validationErrors = await this.validateExpectedSchema(expectedSchema);
                errors.push(...validationErrors);
            }
            // Check for orphaned indexes
            const orphanedIndexes = await this.findOrphanedIndexes();
            if (orphanedIndexes.length > 0) {
                warnings.push(`Found ${orphanedIndexes.length} potentially orphaned indexes`);
            }
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                integrityCheck,
                foreignKeyCheck
            };
        }
        catch (error) {
            errors.push(`Schema validation failed: ${error.message}`);
            return {
                valid: false,
                errors,
                warnings,
                integrityCheck: false,
                foreignKeyCheck: false
            };
        }
    }
    async validatePreMigration(migration) {
        // Pre-migration validation checks
        const result = await this.validateSchema();
        if (!result.valid) {
            throw new Error(`Pre-migration validation failed for ${migration.version}: ${result.errors.join(', ')}`);
        }
        if (!result.integrityCheck) {
            throw new Error(`Database integrity check failed before applying migration ${migration.version}`);
        }
    }
    async validatePostMigration(migration) {
        // Post-migration validation checks
        const result = await this.validateSchema();
        if (!result.valid) {
            console.warn(`Post-migration validation warnings for ${migration.version}:`, result.errors);
        }
        if (!result.integrityCheck) {
            throw new Error(`Database integrity check failed after applying migration ${migration.version}`);
        }
    }
    async getCurrentSchema() {
        const tables = this.connection.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
        const schema = [];
        for (const table of tables) {
            const columns = await this.getTableColumns(table.name);
            const indexes = await this.getTableIndexes(table.name);
            const constraints = await this.getTableConstraints(table.name);
            schema.push({
                name: table.name,
                columns,
                indexes,
                constraints
            });
        }
        return schema;
    }
    async compareSchemas(expected, actual) {
        const expectedNames = new Set(expected.map(t => t.name));
        const actualNames = new Set(actual.map(t => t.name));
        const missing = expected.filter(t => !actualNames.has(t.name)).map(t => t.name);
        const extra = actual.filter(t => !expectedNames.has(t.name)).map(t => t.name);
        const different = [];
        // Check for differences in common tables
        for (const expectedTable of expected) {
            const actualTable = actual.find(t => t.name === expectedTable.name);
            if (actualTable) {
                const differences = this.compareTableSchemas(expectedTable, actualTable);
                if (differences.length > 0) {
                    different.push(`${expectedTable.name}: ${differences.join(', ')}`);
                }
            }
        }
        return { missing, extra, different };
    }
    async validateExpectedSchema(expectedSchema) {
        const errors = [];
        const currentSchema = await this.getCurrentSchema();
        const comparison = await this.compareSchemas(expectedSchema, currentSchema);
        if (comparison.missing.length > 0) {
            errors.push(`Missing tables: ${comparison.missing.join(', ')}`);
        }
        if (comparison.different.length > 0) {
            errors.push(`Schema differences: ${comparison.different.join('; ')}`);
        }
        return errors;
    }
    async getTableColumns(tableName) {
        const columns = this.connection.query(`PRAGMA table_info(${tableName})`);
        return columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.notnull === 0,
            defaultValue: col.dflt_value || undefined,
            primaryKey: col.pk === 1,
            autoIncrement: col.pk === 1 && col.type.toUpperCase().includes('INTEGER')
        }));
    }
    async getTableIndexes(tableName) {
        const indexes = this.connection.query(`PRAGMA index_list(${tableName})`);
        const indexSchemas = [];
        for (const index of indexes) {
            if (index.origin === 'c') { // Created indexes (not automatic)
                const indexInfo = this.connection.query(`PRAGMA index_info(${index.name})`);
                indexSchemas.push({
                    name: index.name,
                    columns: indexInfo.map(info => info.name),
                    unique: index.unique === 1,
                    partial: index.partial === 1 ? 'yes' : undefined
                });
            }
        }
        return indexSchemas;
    }
    async getTableConstraints(tableName) {
        const sql = this.connection.queryFirst(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name=?
    `, [tableName]);
        const constraints = [];
        if (sql?.sql) {
            // Parse CREATE TABLE statement for constraints
            // This is a simplified parser - a full implementation would use a proper SQL parser
            const createSql = sql.sql;
            // Look for PRIMARY KEY constraints
            if (createSql.includes('PRIMARY KEY')) {
                constraints.push({
                    name: `pk_${tableName}`,
                    type: 'PRIMARY KEY',
                    definition: 'PRIMARY KEY constraint'
                });
            }
            // Look for FOREIGN KEY constraints
            const foreignKeyRegex = /FOREIGN KEY\s*\([^)]+\)\s*REFERENCES\s+\w+\s*\([^)]+\)/gi;
            const foreignKeys = createSql.match(foreignKeyRegex);
            if (foreignKeys) {
                foreignKeys.forEach((fk, index) => {
                    constraints.push({
                        name: `fk_${tableName}_${index}`,
                        type: 'FOREIGN KEY',
                        definition: fk
                    });
                });
            }
        }
        return constraints;
    }
    compareTableSchemas(expected, actual) {
        const differences = [];
        // Compare columns
        const expectedCols = new Set(expected.columns.map(c => c.name));
        const actualCols = new Set(actual.columns.map(c => c.name));
        const missingCols = expected.columns.filter(c => !actualCols.has(c.name));
        const extraCols = actual.columns.filter(c => !expectedCols.has(c.name));
        if (missingCols.length > 0) {
            differences.push(`missing columns: ${missingCols.map(c => c.name).join(', ')}`);
        }
        if (extraCols.length > 0) {
            differences.push(`extra columns: ${extraCols.map(c => c.name).join(', ')}`);
        }
        // Compare indexes
        const expectedIndexes = new Set(expected.indexes.map(i => i.name));
        const actualIndexes = new Set(actual.indexes.map(i => i.name));
        const missingIndexes = expected.indexes.filter(i => !actualIndexes.has(i.name));
        const extraIndexes = actual.indexes.filter(i => !expectedIndexes.has(i.name));
        if (missingIndexes.length > 0) {
            differences.push(`missing indexes: ${missingIndexes.map(i => i.name).join(', ')}`);
        }
        if (extraIndexes.length > 0) {
            differences.push(`extra indexes: ${extraIndexes.map(i => i.name).join(', ')}`);
        }
        return differences;
    }
    async findOrphanedIndexes() {
        const indexes = this.connection.query(`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `);
        const tables = this.connection.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
        const tableNames = new Set(tables.map(t => t.name));
        const orphanedIndexes = indexes
            .filter(index => !tableNames.has(index.tbl_name))
            .map(index => index.name);
        return orphanedIndexes;
    }
}
//# sourceMappingURL=SchemaValidator.js.map