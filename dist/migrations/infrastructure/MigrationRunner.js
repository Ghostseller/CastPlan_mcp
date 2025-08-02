/**
 * Migration Execution Engine
 * Handles running migrations with transactions and rollback support
 */
import { MigrationTracker } from './MigrationTracker';
import { SchemaValidator } from './SchemaValidator';
export class MigrationRunner {
    connection;
    tracker;
    validator;
    config;
    constructor(connection, config = {}) {
        this.connection = connection;
        this.tracker = new MigrationTracker(connection);
        this.validator = new SchemaValidator(connection);
        this.config = {
            stopOnError: true,
            validateSchema: true,
            dryRun: false,
            parallel: false,
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }
    async initialize() {
        await this.tracker.initialize();
        if (this.config.validateSchema) {
            await this.validator.initialize();
        }
    }
    async runMigrations(migrations) {
        const results = [];
        const sortedMigrations = this.sortMigrations(migrations);
        const pendingMigrations = sortedMigrations.filter(m => this.tracker.isPending(m.version));
        if (pendingMigrations.length === 0) {
            console.log('No pending migrations to run.');
            return results;
        }
        console.log(`Running ${pendingMigrations.length} pending migrations...`);
        for (const migration of pendingMigrations) {
            const result = await this.runSingleMigration(migration);
            results.push(result);
            if (!result.success && this.config.stopOnError) {
                console.error(`Migration failed: ${migration.version}. Stopping execution.`);
                break;
            }
        }
        return results;
    }
    async runSingleMigration(migration) {
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.config.maxRetries) {
            try {
                console.log(`Applying migration ${migration.version}: ${migration.name} (attempt ${attempt + 1})`);
                if (this.config.dryRun) {
                    console.log(`[DRY RUN] Would apply migration ${migration.version}`);
                    return {
                        success: true,
                        version: migration.version,
                        name: migration.name,
                        executionTime: 0,
                        rollbackAvailable: !!migration.down
                    };
                }
                // Validate prerequisites
                if (this.config.validateSchema) {
                    await this.validator.validatePreMigration(migration);
                }
                // Run migration in transaction
                const result = this.connection.transaction(() => {
                    const migrationStartTime = Date.now();
                    // Execute migration
                    migration.up(this.connection);
                    // Record migration
                    this.tracker.recordMigration({
                        version: migration.version,
                        name: migration.name,
                        checksum: migration.checksum || 'unknown',
                        executionTime: Date.now() - migrationStartTime,
                        rollbackAvailable: !!migration.down,
                        status: 'applied'
                    });
                    return {
                        success: true,
                        version: migration.version,
                        name: migration.name,
                        executionTime: Date.now() - startTime,
                        rollbackAvailable: !!migration.down
                    };
                });
                // Post-migration validation
                if (this.config.validateSchema) {
                    await this.validator.validatePostMigration(migration);
                }
                console.log(`✅ Migration ${migration.version} applied successfully (${result.executionTime}ms)`);
                return result;
            }
            catch (error) {
                attempt++;
                console.error(`❌ Migration ${migration.version} failed (attempt ${attempt}):`, error.message);
                if (attempt < this.config.maxRetries) {
                    console.log(`Retrying in ${this.config.retryDelay}ms...`);
                    await this.delay(this.config.retryDelay);
                }
                else {
                    // Record failed migration
                    try {
                        this.tracker.recordMigration({
                            version: migration.version,
                            name: migration.name,
                            checksum: migration.checksum || 'unknown',
                            executionTime: Date.now() - startTime,
                            rollbackAvailable: !!migration.down,
                            status: 'failed'
                        });
                    }
                    catch (trackingError) {
                        console.error('Failed to record migration failure:', trackingError.message);
                    }
                    return {
                        success: false,
                        version: migration.version,
                        name: migration.name,
                        executionTime: Date.now() - startTime,
                        error: error,
                        rollbackAvailable: !!migration.down
                    };
                }
            }
        }
        throw new Error(`Migration ${migration.version} failed after ${this.config.maxRetries} attempts`);
    }
    async rollbackMigration(version, migration) {
        const startTime = Date.now();
        const migrationRecord = this.tracker.getMigration(version);
        if (!migrationRecord) {
            throw new Error(`Migration ${version} not found in history`);
        }
        if (migrationRecord.status !== 'applied') {
            throw new Error(`Cannot rollback migration ${version}: status is ${migrationRecord.status}`);
        }
        if (!migrationRecord.rollbackAvailable && !migration?.down) {
            throw new Error(`Migration ${version} does not have rollback capability`);
        }
        try {
            console.log(`Rolling back migration ${version}: ${migrationRecord.name}`);
            if (this.config.dryRun) {
                console.log(`[DRY RUN] Would rollback migration ${version}`);
                return {
                    success: true,
                    version,
                    name: migrationRecord.name,
                    executionTime: 0,
                    rollbackAvailable: true
                };
            }
            // Execute rollback in transaction
            this.connection.transaction(() => {
                if (migration?.down) {
                    migration.down(this.connection);
                }
                else {
                    throw new Error(`No rollback function available for migration ${version}`);
                }
                // Update migration status
                this.tracker.updateMigrationStatus(version, 'rolled_back');
            });
            const executionTime = Date.now() - startTime;
            console.log(`✅ Migration ${version} rolled back successfully (${executionTime}ms)`);
            return {
                success: true,
                version,
                name: migrationRecord.name,
                executionTime,
                rollbackAvailable: true
            };
        }
        catch (error) {
            console.error(`❌ Rollback of migration ${version} failed:`, error.message);
            return {
                success: false,
                version,
                name: migrationRecord.name,
                executionTime: Date.now() - startTime,
                error: error,
                rollbackAvailable: migrationRecord.rollbackAvailable
            };
        }
    }
    async rollbackToVersion(targetVersion, migrations) {
        const appliedMigrations = this.tracker.getAppliedMigrations();
        const migrationMap = new Map(migrations.map(m => [m.version, m]));
        const results = [];
        // Find migrations to rollback (in reverse order)
        const toRollback = appliedMigrations
            .filter(m => this.compareVersions(m.version, targetVersion) > 0)
            .sort((a, b) => this.compareVersions(b.version, a.version));
        console.log(`Rolling back ${toRollback.length} migrations to version ${targetVersion}...`);
        for (const migrationRecord of toRollback) {
            const migration = migrationMap.get(migrationRecord.version);
            const result = await this.rollbackMigration(migrationRecord.version, migration);
            results.push(result);
            if (!result.success && this.config.stopOnError) {
                console.error(`Rollback failed: ${migrationRecord.version}. Stopping rollback.`);
                break;
            }
        }
        return results;
    }
    getMigrationStatus() {
        const appliedMigrations = this.tracker.getAppliedMigrations();
        const allMigrations = this.tracker.getAllMigrations();
        const latest = this.tracker.getLatestMigration();
        const failures = allMigrations.filter(m => m.status === 'failed');
        return {
            appliedCount: appliedMigrations.length,
            latestVersion: latest?.version || null,
            pendingCount: 0, // Would need available migrations to calculate
            hasFailures: failures.length > 0
        };
    }
    sortMigrations(migrations) {
        return migrations.sort((a, b) => this.compareVersions(a.version, b.version));
    }
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        const maxLength = Math.max(aParts.length, bParts.length);
        for (let i = 0; i < maxLength; i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart < bPart)
                return -1;
            if (aPart > bPart)
                return 1;
        }
        return 0;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=MigrationRunner.js.map