/**
 * Database Optimization Service - Advanced Database Performance Optimization
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Database connection pooling, query optimization, and performance tuning
 *
 * Created: 2025-07-31
 * Author: Database Performance Engineer & Optimization Specialist
 */
import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { getErrorMessage } from '../utils/typeHelpers';
// =============================================================================
// CONNECTION POOL
// =============================================================================
class DatabaseConnection {
    id;
    db;
    isActive = false;
    lastUsed = Date.now();
    createdAt = Date.now();
    queriesExecuted = 0;
    constructor(databasePath, options = {}) {
        this.id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.db = new Database(databasePath, options);
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 10000');
        this.db.pragma('temp_store = memory');
        this.db.pragma('mmap_size = 268435456'); // 256MB
    }
    execute(query, params = []) {
        this.lastUsed = Date.now();
        this.queriesExecuted++;
        this.isActive = true;
        try {
            const stmt = this.db.prepare(query);
            const result = params.length > 0 ? stmt.all(...params) : stmt.all();
            return result;
        }
        finally {
            this.isActive = false;
        }
    }
    close() {
        this.db.close();
    }
}
// =============================================================================
// DATABASE OPTIMIZATION SERVICE
// =============================================================================
export class DatabaseOptimizationService extends EventEmitter {
    logger;
    connectionPool = new Map();
    availableConnections = [];
    waitingQueue = [];
    config;
    databasePath;
    queryStats = new Map();
    preparedStatements = new Map();
    healthCheckInterval;
    isInitialized = false;
    constructor(databasePath, logger, config = {}) {
        super();
        this.databasePath = databasePath;
        this.logger = logger;
        this.config = {
            maxConnections: 10,
            minConnections: 2,
            acquireTimeout: 30000,
            idleTimeout: 300000, // 5 minutes
            maxLifetime: 3600000, // 1 hour
            healthCheckInterval: 60000, // 1 minute
            enablePreparedStatements: true,
            enableWALMode: true,
            cacheSize: 10000,
            ...config
        };
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Create minimum connections
            for (let i = 0; i < this.config.minConnections; i++) {
                await this.createConnection();
            }
            // Start health check
            this.startHealthCheck();
            // Analyze existing database structure
            await this.analyzeDatabase();
            this.isInitialized = true;
            this.logger.info(`Database optimization service initialized with ${this.connectionPool.size} connections`);
        }
        catch (error) {
            this.logger.error('Failed to initialize database optimization service:', error);
            throw error;
        }
    }
    async createConnection() {
        const connection = new DatabaseConnection(this.databasePath, {
            readonly: false,
            fileMustExist: true,
            timeout: 5000,
            verbose: this.logger.debug.bind(this.logger)
        });
        this.connectionPool.set(connection.id, connection);
        this.availableConnections.push(connection.id);
        this.logger.debug(`Created database connection: ${connection.id}`);
        return connection;
    }
    async acquireConnection() {
        return new Promise(async (resolve, reject) => {
            // Check for available connections
            if (this.availableConnections.length > 0) {
                const connectionId = this.availableConnections.shift();
                const connection = this.connectionPool.get(connectionId);
                resolve(connection);
                return;
            }
            // Create new connection if under limit
            if (this.connectionPool.size < this.config.maxConnections) {
                try {
                    const connection = await this.createConnection();
                    this.availableConnections.shift(); // Remove from available since we're using it
                    resolve(connection);
                    return;
                }
                catch (error) {
                    reject(error);
                    return;
                }
            }
            // Add to waiting queue
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.waitingQueue.splice(index, 1);
                    reject(new Error('Connection acquisition timeout'));
                }
            }, this.config.acquireTimeout);
            this.waitingQueue.push({ resolve, reject, timeout });
        });
    }
    releaseConnection(connection) {
        // Check if connection is still healthy
        if (Date.now() - connection.createdAt > this.config.maxLifetime) {
            this.destroyConnection(connection);
            return;
        }
        // Return to available pool
        this.availableConnections.push(connection.id);
        // Process waiting queue
        if (this.waitingQueue.length > 0) {
            const waiting = this.waitingQueue.shift();
            clearTimeout(waiting.timeout);
            const connectionId = this.availableConnections.shift();
            const conn = this.connectionPool.get(connectionId);
            waiting.resolve(conn);
        }
    }
    destroyConnection(connection) {
        try {
            connection.close();
            this.connectionPool.delete(connection.id);
            this.logger.debug(`Destroyed database connection: ${connection.id}`);
        }
        catch (error) {
            this.logger.error(`Error destroying connection ${connection.id}:`, error);
        }
    }
    // =============================================================================
    // QUERY EXECUTION WITH OPTIMIZATION
    // =============================================================================
    async executeQuery(query, params = [], options = {}) {
        const startTime = performance.now();
        const queryHash = this.hashQuery(query);
        let connection;
        try {
            connection = await this.acquireConnection();
            // Record query statistics
            this.recordQueryExecution(query, queryHash);
            // Use prepared statement if enabled
            let result;
            if (this.config.enablePreparedStatements && !this.preparedStatements.has(queryHash)) {
                const stmt = connection.db.prepare(query);
                this.preparedStatements.set(queryHash, stmt);
            }
            if (this.preparedStatements.has(queryHash)) {
                const stmt = this.preparedStatements.get(queryHash);
                result = params.length > 0 ? stmt.all(...params) : stmt.all();
            }
            else {
                result = connection.execute(query, params);
            }
            const executionTime = performance.now() - startTime;
            // Update query statistics
            this.updateQueryStats(queryHash, query, executionTime, options.complexity || 'simple');
            // Emit performance event
            this.emit('queryExecuted', {
                query: queryHash,
                executionTime,
                success: true,
                complexity: options.complexity
            });
            return result;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.emit('queryExecuted', {
                query: queryHash,
                executionTime,
                success: false,
                error: getErrorMessage(error),
                complexity: options.complexity
            });
            this.logger.error(`Query execution failed: ${getErrorMessage(error)}`, { query, params });
            throw error;
        }
        finally {
            if (connection) {
                this.releaseConnection(connection);
            }
        }
    }
    async executeTransaction(operations, options = {}) {
        const connection = await this.acquireConnection();
        const startTime = performance.now();
        try {
            connection.db.exec('BEGIN TRANSACTION');
            const results = [];
            for (const operation of operations) {
                const result = connection.execute(operation.query, operation.params || []);
                results.push(result);
            }
            connection.db.exec('COMMIT');
            const executionTime = performance.now() - startTime;
            this.emit('transactionExecuted', {
                operations: operations.length,
                executionTime,
                success: true
            });
            return results;
        }
        catch (error) {
            connection.db.exec('ROLLBACK');
            const executionTime = performance.now() - startTime;
            this.emit('transactionExecuted', {
                operations: operations.length,
                executionTime,
                success: false,
                error: getErrorMessage(error)
            });
            this.logger.error(`Transaction failed: ${getErrorMessage(error)}`);
            throw error;
        }
        finally {
            this.releaseConnection(connection);
        }
    }
    // =============================================================================
    // QUERY OPTIMIZATION AND ANALYSIS
    // =============================================================================
    hashQuery(query) {
        // Simple hash for query identification
        return query.replace(/\s+/g, ' ').trim().toLowerCase();
    }
    recordQueryExecution(query, queryHash) {
        if (!this.queryStats.has(queryHash)) {
            this.queryStats.set(queryHash, {
                query,
                executionCount: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0,
                lastExecuted: new Date().toISOString(),
                usesPreparedStatement: this.preparedStatements.has(queryHash),
                usesIndex: this.detectIndexUsage(query),
                estimatedComplexity: this.estimateQueryComplexity(query)
            });
        }
    }
    updateQueryStats(queryHash, query, executionTime, complexity) {
        const stats = this.queryStats.get(queryHash);
        stats.executionCount++;
        stats.totalTime += executionTime;
        stats.averageTime = stats.totalTime / stats.executionCount;
        stats.minTime = Math.min(stats.minTime, executionTime);
        stats.maxTime = Math.max(stats.maxTime, executionTime);
        stats.lastExecuted = new Date().toISOString();
        stats.estimatedComplexity = complexity;
    }
    detectIndexUsage(query) {
        const indexKeywords = ['WHERE', 'ORDER BY', 'GROUP BY', 'JOIN'];
        return indexKeywords.some(keyword => query.toUpperCase().includes(keyword));
    }
    estimateQueryComplexity(query) {
        const upperQuery = query.toUpperCase();
        let complexity = 0;
        // Count complexity indicators
        if (upperQuery.includes('JOIN'))
            complexity += 2;
        if (upperQuery.includes('SUBQUERY') || upperQuery.includes('SELECT') && upperQuery.split('SELECT').length > 2)
            complexity += 3;
        if (upperQuery.includes('UNION'))
            complexity += 2;
        if (upperQuery.includes('GROUP BY'))
            complexity += 1;
        if (upperQuery.includes('ORDER BY'))
            complexity += 1;
        if (upperQuery.includes('DISTINCT'))
            complexity += 1;
        if (upperQuery.includes('CASE'))
            complexity += 1;
        if (complexity <= 2)
            return 'simple';
        if (complexity <= 5)
            return 'moderate';
        return 'complex';
    }
    async analyzeQueryPlan(query) {
        const connection = await this.acquireConnection();
        try {
            const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
            const plan = connection.execute(explainQuery);
            const planText = Array.isArray(plan) ? plan.map(row => Object.values(row).join(' ')).join('\n') : String(plan);
            const usesIndex = planText.toLowerCase().includes('index');
            const indexesUsed = this.extractIndexesFromPlan(planText);
            const queryPlan = {
                query,
                plan: planText,
                estimatedCost: this.estimateCostFromPlan(planText),
                usesIndex,
                indexesUsed,
                recommendations: this.generateQueryRecommendations(query, planText)
            };
            return queryPlan;
        }
        finally {
            this.releaseConnection(connection);
        }
    }
    extractIndexesFromPlan(plan) {
        const indexMatches = plan.match(/USING INDEX (\w+)/gi);
        return indexMatches ? indexMatches.map(match => match.replace('USING INDEX ', '')) : [];
    }
    estimateCostFromPlan(plan) {
        // Simple cost estimation based on plan complexity
        const scanCount = (plan.match(/SCAN/gi) || []).length;
        const seekCount = (plan.match(/SEARCH/gi) || []).length;
        return scanCount * 10 + seekCount * 2;
    }
    generateQueryRecommendations(query, plan) {
        const recommendations = [];
        if (plan.toLowerCase().includes('scan table') && !plan.toLowerCase().includes('using index')) {
            recommendations.push('Consider adding indexes for frequently queried columns');
        }
        if (query.toUpperCase().includes('SELECT *')) {
            recommendations.push('Avoid SELECT * queries; specify only needed columns');
        }
        if (query.toUpperCase().includes('ORDER BY') && !plan.toLowerCase().includes('using index')) {
            recommendations.push('Consider adding index for ORDER BY columns');
        }
        if (query.toUpperCase().includes('GROUP BY') && !plan.toLowerCase().includes('using index')) {
            recommendations.push('Consider adding index for GROUP BY columns');
        }
        return recommendations;
    }
    // =============================================================================
    // INDEX OPTIMIZATION
    // =============================================================================
    async analyzeIndexUsage() {
        const connection = await this.acquireConnection();
        const recommendations = [];
        try {
            // Get all tables
            const tables = connection.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
            for (const table of tables) {
                const tableRecommendations = await this.analyzeTableIndexes(connection, table.name);
                recommendations.push(...tableRecommendations);
            }
            return recommendations;
        }
        finally {
            this.releaseConnection(connection);
        }
    }
    async analyizeTableIndexes(connection, tableName) {
        const recommendations = [];
        // Analyze query patterns for this table
        const tableQueries = Array.from(this.queryStats.values())
            .filter(stat => stat.query.toLowerCase().includes(tableName.toLowerCase()));
        // Extract WHERE clause patterns
        const wherePatterns = new Map();
        for (const queryStat of tableQueries) {
            const whereColumns = this.extractWhereColumns(queryStat.query, tableName);
            whereColumns.forEach(column => {
                wherePatterns.set(column, (wherePatterns.get(column) || 0) + queryStat.executionCount);
            });
        }
        // Generate recommendations for frequently used columns
        for (const [column, usage] of wherePatterns) {
            if (usage > 10) { // Threshold for recommendation
                const hasIndex = await this.checkIndexExists(connection, tableName, column);
                if (!hasIndex) {
                    recommendations.push({
                        table: tableName,
                        columns: [column],
                        type: 'btree',
                        estimatedBenefit: usage * 0.1, // Simple benefit calculation
                        queryPatterns: tableQueries.map(q => q.query),
                        reason: `Column '${column}' is frequently used in WHERE clauses (${usage} times)`
                    });
                }
            }
        }
        return recommendations;
    }
    extractWhereColumns(query, tableName) {
        const columns = [];
        const regex = new RegExp(`WHERE\\s+(?:${tableName}\\.)?([\\w]+)\\s*[=<>!]`, 'gi');
        let match;
        while ((match = regex.exec(query)) !== null) {
            columns.push(match[1]);
        }
        return columns;
    }
    async checkIndexExists(connection, tableName, columnName) {
        const indexes = connection.execute(`PRAGMA index_list(${tableName})`);
        for (const index of indexes) {
            const indexInfo = connection.execute(`PRAGMA index_info(${index.name})`);
            if (indexInfo.some(info => info.name === columnName)) {
                return true;
            }
        }
        return false;
    }
    // =============================================================================
    // HEALTH MONITORING
    // =============================================================================
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }
    async performHealthCheck() {
        try {
            // Clean up idle connections
            const now = Date.now();
            const connectionsToDestroy = [];
            this.connectionPool.forEach(connection => {
                if (!connection.isActive &&
                    (now - connection.lastUsed > this.config.idleTimeout ||
                        now - connection.createdAt > this.config.maxLifetime)) {
                    connectionsToDestroy.push(connection);
                }
            });
            connectionsToDestroy.forEach(connection => {
                this.destroyConnection(connection);
            });
            // Ensure minimum connections
            while (this.connectionPool.size < this.config.minConnections) {
                await this.createConnection();
            }
            // Emit health metrics
            const metrics = await this.getHealthMetrics();
            this.emit('healthCheck', metrics);
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
        }
    }
    async getHealthMetrics() {
        const activeConnections = Array.from(this.connectionPool.values()).filter(c => c.isActive).length;
        const idleConnections = this.availableConnections.length;
        const waitingConnections = this.waitingQueue.length;
        // Calculate performance metrics
        const allStats = Array.from(this.queryStats.values());
        const averageQueryTime = allStats.length > 0
            ? allStats.reduce((sum, stat) => sum + stat.averageTime, 0) / allStats.length
            : 0;
        const totalQueries = allStats.reduce((sum, stat) => sum + stat.executionCount, 0);
        const queriesPerSecond = totalQueries / (Date.now() / 1000); // Rough calculation
        return {
            connectionPool: {
                active: activeConnections,
                idle: idleConnections,
                waiting: waitingConnections,
                total: this.connectionPool.size
            },
            performance: {
                averageQueryTime,
                queriesPerSecond,
                cacheHitRate: this.calculateCacheHitRate(),
                lockWaitTime: 0 // Would need more detailed monitoring
            },
            storage: {
                databaseSize: 0, // Would need file system access
                indexSize: 0,
                freePages: 0,
                pageSize: 4096
            },
            optimization: {
                analyzedQueries: this.queryStats.size,
                optimizedQueries: Array.from(this.queryStats.values()).filter(s => s.usesPreparedStatement).length,
                suggestedIndexes: 0, // Would be populated by analyzeIndexUsage
                unusedIndexes: 0
            }
        };
    }
    calculateCacheHitRate() {
        // Calculate based on prepared statement usage
        const totalQueries = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.executionCount, 0);
        const preparedQueries = Array.from(this.queryStats.values())
            .filter(stat => stat.usesPreparedStatement)
            .reduce((sum, stat) => sum + stat.executionCount, 0);
        return totalQueries > 0 ? preparedQueries / totalQueries : 0;
    }
    // =============================================================================
    // DATABASE ANALYSIS
    // =============================================================================
    async analyzeDatabase() {
        const connection = await this.acquireConnection();
        try {
            // Analyze table structures
            const tables = connection.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
            this.logger.info(`Found ${tables.length} tables to analyze`);
            // Update database statistics
            connection.db.exec('ANALYZE');
            this.logger.info('Database analysis completed');
        }
        catch (error) {
            this.logger.error('Database analysis failed:', error);
        }
        finally {
            this.releaseConnection(connection);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    getQueryStats() {
        return new Map(this.queryStats);
    }
    async optimizeDatabase() {
        const connection = await this.acquireConnection();
        try {
            // Run VACUUM to reclaim space
            connection.db.exec('VACUUM');
            // Update statistics
            connection.db.exec('ANALYZE');
            // Rebuild indexes if needed
            connection.db.exec('REINDEX');
            this.logger.info('Database optimization completed');
        }
        catch (error) {
            this.logger.error('Database optimization failed:', error);
            throw error;
        }
        finally {
            this.releaseConnection(connection);
        }
    }
    async destroy() {
        // Clear health check
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        // Close all connections
        const closePromises = Array.from(this.connectionPool.values()).map(connection => {
            return new Promise(resolve => {
                try {
                    connection.close();
                    resolve();
                }
                catch (error) {
                    this.logger.error(`Error closing connection ${connection.id}:`, error);
                    resolve();
                }
            });
        });
        await Promise.all(closePromises);
        // Clear waiting queue
        this.waitingQueue.forEach(waiting => {
            clearTimeout(waiting.timeout);
            waiting.reject(new Error('Service is shutting down'));
        });
        this.connectionPool.clear();
        this.availableConnections.length = 0;
        this.waitingQueue.length = 0;
        this.queryStats.clear();
        this.preparedStatements.clear();
        this.removeAllListeners();
        this.isInitialized = false;
        this.logger.info('Database optimization service destroyed');
    }
    // Fix the typo in the method name
    async analyzeTableIndexes(connection, tableName) {
        return this.analyizeTableIndexes(connection, tableName);
    }
}
export default DatabaseOptimizationService;
//# sourceMappingURL=DatabaseOptimizationService.js.map