/**
 * Migration Version Tracking System
 * Tracks applied migrations and their status
 */
export class MigrationTracker {
    connection;
    tableName = '_migration_history';
    constructor(connection) {
        this.connection = connection;
    }
    async initialize() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER NOT NULL,
        rollback_available BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'applied',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        const createIndexSql = `
      CREATE INDEX IF NOT EXISTS idx_migration_version ON ${this.tableName}(version);
      CREATE INDEX IF NOT EXISTS idx_migration_status ON ${this.tableName}(status);
      CREATE INDEX IF NOT EXISTS idx_migration_applied_at ON ${this.tableName}(applied_at);
    `;
        this.connection.execute(createTableSql);
        this.connection.execute(createIndexSql);
    }
    recordMigration(migration) {
        const sql = `
      INSERT INTO ${this.tableName} 
      (version, name, checksum, execution_time, rollback_available, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        this.connection.execute(sql, [
            migration.version,
            migration.name,
            migration.checksum,
            migration.executionTime,
            migration.rollbackAvailable ? 1 : 0,
            migration.status
        ]);
    }
    updateMigrationStatus(version, status) {
        const sql = `
      UPDATE ${this.tableName} 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE version = ?
    `;
        this.connection.execute(sql, [status, version]);
    }
    getAppliedMigrations() {
        const sql = `
      SELECT 
        id, version, name, checksum, applied_at as appliedAt,
        execution_time as executionTime, 
        rollback_available as rollbackAvailable,
        status
      FROM ${this.tableName}
      WHERE status = 'applied'
      ORDER BY version ASC
    `;
        return this.connection.query(sql);
    }
    getAllMigrations() {
        const sql = `
      SELECT 
        id, version, name, checksum, applied_at as appliedAt,
        execution_time as executionTime, 
        rollback_available as rollbackAvailable,
        status
      FROM ${this.tableName}
      ORDER BY applied_at DESC
    `;
        return this.connection.query(sql);
    }
    getMigration(version) {
        const sql = `
      SELECT 
        id, version, name, checksum, applied_at as appliedAt,
        execution_time as executionTime, 
        rollback_available as rollbackAvailable,
        status
      FROM ${this.tableName}
      WHERE version = ?
    `;
        return this.connection.queryFirst(sql, [version]);
    }
    getLatestMigration() {
        const sql = `
      SELECT 
        id, version, name, checksum, applied_at as appliedAt,
        execution_time as executionTime, 
        rollback_available as rollbackAvailable,
        status
      FROM ${this.tableName}
      WHERE status = 'applied'
      ORDER BY version DESC
      LIMIT 1
    `;
        return this.connection.queryFirst(sql);
    }
    isPending(version) {
        const migration = this.getMigration(version);
        return !migration || migration.status !== 'applied';
    }
    removeMigration(version) {
        const sql = `DELETE FROM ${this.tableName} WHERE version = ?`;
        this.connection.execute(sql, [version]);
    }
    getMigrationHistory() {
        const sql = `
      SELECT 
        version, name, status, applied_at as appliedAt,
        execution_time as executionTimeMs
      FROM ${this.tableName}
      ORDER BY applied_at DESC
      LIMIT 50
    `;
        return this.connection.query(sql);
    }
}
//# sourceMappingURL=MigrationTracker.js.map