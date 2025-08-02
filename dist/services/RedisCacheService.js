/**
 * Redis Cache Service - Advanced Distributed Caching System
 *
 * CastPlan MCP Phase 2.2: Redis 캐싱 시스템
 * 분산 캐싱, 연결 풀링, TTL 관리, 캐시 무효화 전략
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & Caching Specialist
 */
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { getErrorMessage } from '../utils/typeHelpers.js';
// =============================================================================
// REDIS CACHE SERVICE
// =============================================================================
export class RedisCacheService extends EventEmitter {
    logger;
    redis; // Initialized in constructor via initializeRedisClient()
    config;
    metrics;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    healthCheckInterval;
    constructor(logger, config = {}) {
        super();
        this.logger = logger;
        // Default configuration
        this.config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            family: 4,
            keepAlive: 30000,
            lazyConnect: true,
            maxLoadingTimeout: 5000,
            maxMemoryPolicy: 'allkeys-lru',
            keyPrefix: 'castplan:',
            defaultTTL: 3600, // 1 hour
            compressionThreshold: 1024, // 1KB
            enableCompression: true,
            enableMetrics: true,
            ...config
        };
        // Initialize metrics
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            connections: 0,
            errorCount: 0,
            totalOperations: 0,
            averageResponseTime: 0,
            hitRate: 0,
            memoryUsage: 0,
            keyCount: 0
        };
        this.initializeRedisClient();
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeRedisClient() {
        const redisOptions = {
            host: this.config.host,
            port: this.config.port,
            db: this.config.db,
            maxRetriesPerRequest: this.config.maxRetriesPerRequest,
            // retryDelayOnFailover: this.config.retryDelayOnFailover, // Property doesn't exist in current ioredis types
            enableOfflineQueue: this.config.enableOfflineQueue,
            family: this.config.family,
            keepAlive: this.config.keepAlive,
            lazyConnect: this.config.lazyConnect,
            keyPrefix: this.config.keyPrefix
            // maxLoadingTimeout: this.config.maxLoadingTimeout // Property doesn't exist in current ioredis types
        };
        this.redis = new Redis(redisOptions);
        // Event handlers
        this.redis.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.metrics.connections++;
            this.logger.info('Redis connected successfully');
            this.emit('connected');
        });
        this.redis.on('ready', () => {
            this.logger.info('Redis ready for operations');
            this.startHealthCheck();
            this.emit('ready');
        });
        this.redis.on('error', (error) => {
            this.metrics.errorCount++;
            this.logger.error('Redis connection error:', error);
            this.emit('error', error);
        });
        this.redis.on('close', () => {
            this.isConnected = false;
            this.logger.warn('Redis connection closed');
            this.emit('disconnected');
        });
        this.redis.on('reconnecting', (delay) => {
            this.reconnectAttempts++;
            this.logger.info(`Redis reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.logger.error('Max reconnection attempts reached');
                this.redis.disconnect();
            }
        });
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            await this.redis.connect();
            await this.setupRedisConfiguration();
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error('Failed to connect to Redis:', errorMessage);
            throw new Error(`Failed to connect to Redis: ${errorMessage}`);
        }
    }
    async setupRedisConfiguration() {
        try {
            // Set memory policy
            await this.redis.config('SET', 'maxmemory-policy', this.config.maxMemoryPolicy);
            // Enable keyspace notifications for cache invalidation
            await this.redis.config('SET', 'notify-keyspace-events', 'Ex');
            this.logger.info('Redis configuration applied successfully');
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.warn('Failed to apply Redis configuration:', errorMessage);
        }
    }
    // =============================================================================
    // CORE CACHE OPERATIONS
    // =============================================================================
    async get(key, options = {}) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key);
            const rawValue = await this.redis.get(fullKey);
            const executionTime = performance.now() - startTime;
            this.updateMetrics('get', executionTime, rawValue !== null);
            if (rawValue === null) {
                return null;
            }
            // Parse cached entry
            const entry = JSON.parse(rawValue);
            // Update access metadata
            if (entry.metadata) {
                entry.metadata.lastAccessed = Date.now();
                entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1;
            }
            // Decompress if needed
            let value = entry.value;
            if (entry.compressed && options.decompress !== false) {
                value = this.decompress(entry.value);
            }
            return value;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateMetrics('get', executionTime, false, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache get error for key ${key}:`, errorMessage);
            return null;
        }
    }
    async set(key, value, options = {}) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key, options.namespace);
            const ttl = options.ttl || this.config.defaultTTL;
            // Prepare cache entry
            const entry = {
                value,
                ttl,
                metadata: {
                    createdAt: Date.now(),
                    accessCount: 0,
                    tags: options.tags
                }
            };
            // Compress if needed
            const serializedValue = JSON.stringify(value);
            if (this.config.enableCompression &&
                (options.compress !== false) &&
                serializedValue.length > this.config.compressionThreshold) {
                entry.value = this.compress(value);
                entry.compressed = true;
            }
            const serializedEntry = JSON.stringify(entry);
            // Set with TTL
            const result = await this.redis.setex(fullKey, ttl, serializedEntry);
            const executionTime = performance.now() - startTime;
            this.updateMetrics('set', executionTime, result === 'OK');
            // Handle tags for cache invalidation
            if (options.tags && options.tags.length > 0) {
                await this.indexTaggedKey(fullKey, options.tags);
            }
            return result === 'OK';
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateMetrics('set', executionTime, false, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache set error for key ${key}:`, errorMessage);
            return false;
        }
    }
    async delete(key, namespace) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key, namespace);
            const result = await this.redis.del(fullKey);
            const executionTime = performance.now() - startTime;
            this.updateMetrics('delete', executionTime, result > 0);
            return result > 0;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateMetrics('delete', executionTime, false, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache delete error for key ${key}:`, errorMessage);
            return false;
        }
    }
    async exists(key, namespace) {
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key, namespace);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache exists check error for key ${key}:`, errorMessage);
            return false;
        }
    }
    async expire(key, ttl, namespace) {
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key, namespace);
            const result = await this.redis.expire(fullKey, ttl);
            return result === 1;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache expire error for key ${key}:`, errorMessage);
            return false;
        }
    }
    async ttl(key, namespace) {
        try {
            this.validateConnection();
            const fullKey = this.buildKey(key, namespace);
            const result = await this.redis.ttl(fullKey);
            return result;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Cache TTL check error for key ${key}:`, errorMessage);
            return -1;
        }
    }
    // =============================================================================
    // BULK OPERATIONS
    // =============================================================================
    async mget(keys, namespace) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const fullKeys = keys.map(key => this.buildKey(key, namespace));
            const results = await this.redis.mget(...fullKeys);
            const values = results.map(result => {
                if (result === null)
                    return null;
                try {
                    const entry = JSON.parse(result);
                    return entry.compressed ? this.decompress(entry.value) : entry.value;
                }
                catch (error) {
                    const errorMessage = getErrorMessage(error);
                    this.logger.warn('Failed to parse cached value:', errorMessage);
                    return null;
                }
            });
            const executionTime = performance.now() - startTime;
            const hits = values.filter(v => v !== null).length;
            this.updateBulkMetrics('mget', executionTime, hits, keys.length);
            return values;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateBulkMetrics('mget', executionTime, 0, keys.length, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error('Cache mget error:', errorMessage);
            return keys.map(() => null);
        }
    }
    async mset(operations) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const pipeline = this.redis.pipeline();
            for (const operation of operations) {
                if (operation.value !== undefined) {
                    const fullKey = this.buildKey(operation.key, operation.options?.namespace);
                    const ttl = operation.options?.ttl || this.config.defaultTTL;
                    const entry = {
                        value: operation.value,
                        ttl,
                        metadata: {
                            createdAt: Date.now(),
                            accessCount: 0,
                            tags: operation.options?.tags
                        }
                    };
                    // Compress if needed
                    const serializedValue = JSON.stringify(operation.value);
                    if (this.config.enableCompression &&
                        serializedValue.length > this.config.compressionThreshold) {
                        entry.value = this.compress(operation.value);
                        entry.compressed = true;
                    }
                    pipeline.setex(fullKey, ttl, JSON.stringify(entry));
                }
            }
            const results = await pipeline.exec();
            const executionTime = performance.now() - startTime;
            const successCount = results?.filter(result => result && result[1] === 'OK').length || 0;
            this.updateBulkMetrics('mset', executionTime, successCount, operations.length);
            return successCount === operations.length;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateBulkMetrics('mset', executionTime, 0, operations.length, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error('Cache mset error:', errorMessage);
            return false;
        }
    }
    async mdel(keys, namespace) {
        const startTime = performance.now();
        try {
            this.validateConnection();
            const fullKeys = keys.map(key => this.buildKey(key, namespace));
            const result = await this.redis.del(...fullKeys);
            const executionTime = performance.now() - startTime;
            this.updateBulkMetrics('mdel', executionTime, result, keys.length);
            return result;
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateBulkMetrics('mdel', executionTime, 0, keys.length, error);
            const errorMessage = getErrorMessage(error);
            this.logger.error('Cache mdel error:', errorMessage);
            return 0;
        }
    }
    // =============================================================================
    // CACHE INVALIDATION
    // =============================================================================
    async invalidateByTag(tag) {
        try {
            this.validateConnection();
            const tagKey = `${this.config.keyPrefix}tags:${tag}`;
            const keys = await this.redis.smembers(tagKey);
            if (keys.length === 0) {
                return 0;
            }
            // Delete all keys with this tag
            const pipeline = this.redis.pipeline();
            keys.forEach(key => pipeline.del(key));
            pipeline.del(tagKey); // Remove the tag set itself
            const results = await pipeline.exec();
            const deletedCount = results?.filter(result => result && typeof result[1] === 'number' && result[1] > 0).length || 0;
            this.logger.info(`Invalidated ${deletedCount} keys with tag: ${tag}`);
            return deletedCount;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Tag invalidation error for tag ${tag}:`, errorMessage);
            return 0;
        }
    }
    async invalidateByPattern(pattern) {
        try {
            this.validateConnection();
            const fullPattern = this.buildKey(pattern);
            const keys = await this.redis.keys(fullPattern);
            if (keys.length === 0) {
                return 0;
            }
            const result = await this.redis.del(...keys);
            this.logger.info(`Invalidated ${result} keys matching pattern: ${pattern}`);
            return result;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error(`Pattern invalidation error for pattern ${pattern}:`, errorMessage);
            return 0;
        }
    }
    async flush(namespace) {
        try {
            this.validateConnection();
            if (namespace) {
                const pattern = this.buildKey('*', namespace);
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
            else {
                await this.redis.flushdb();
            }
            this.logger.info(`Cache flushed${namespace ? ` for namespace: ${namespace}` : ''}`);
            return true;
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error('Cache flush error:', errorMessage);
            return false;
        }
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    buildKey(key, namespace) {
        const parts = [this.config.keyPrefix];
        if (namespace)
            parts.push(`${namespace}:`);
        parts.push(key);
        return parts.join('');
    }
    async indexTaggedKey(key, tags) {
        if (!tags || tags.length === 0)
            return;
        try {
            const pipeline = this.redis.pipeline();
            for (const tag of tags) {
                const tagKey = `${this.config.keyPrefix}tags:${tag}`;
                pipeline.sadd(tagKey, key);
                pipeline.expire(tagKey, this.config.defaultTTL * 2); // Tags live longer
            }
            await pipeline.exec();
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.warn('Failed to index tagged key:', errorMessage);
        }
    }
    compress(value) {
        // Simple compression placeholder - could use zlib or other compression
        return JSON.stringify(value);
    }
    decompress(compressed) {
        // Simple decompression placeholder
        return JSON.parse(compressed);
    }
    validateConnection() {
        if (!this.isConnected) {
            throw new Error('Redis not connected');
        }
    }
    // =============================================================================
    // METRICS AND MONITORING
    // =============================================================================
    updateMetrics(operation, executionTime, success, error) {
        if (!this.config.enableMetrics)
            return;
        this.metrics.totalOperations++;
        if (success) {
            if (operation === 'get')
                this.metrics.hits++;
            else if (operation === 'set')
                this.metrics.sets++;
            else if (operation === 'delete')
                this.metrics.deletes++;
        }
        else {
            if (operation === 'get')
                this.metrics.misses++;
            if (error)
                this.metrics.errorCount++;
        }
        // Update average response time
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalOperations - 1) + executionTime) /
                this.metrics.totalOperations;
        // Update hit rate
        const totalGets = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = totalGets > 0 ? this.metrics.hits / totalGets : 0;
    }
    updateBulkMetrics(operation, executionTime, successes, total, error) {
        if (!this.config.enableMetrics)
            return;
        this.metrics.totalOperations += total;
        if (operation === 'mget') {
            this.metrics.hits += successes;
            this.metrics.misses += (total - successes);
        }
        else if (operation === 'mset') {
            this.metrics.sets += successes;
        }
        else if (operation === 'mdel') {
            this.metrics.deletes += successes;
        }
        if (error)
            this.metrics.errorCount++;
        // Update average response time
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalOperations - total) + executionTime) /
                this.metrics.totalOperations;
        // Update hit rate
        const totalGets = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = totalGets > 0 ? this.metrics.hits / totalGets : 0;
    }
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 60000); // Every minute
    }
    async performHealthCheck() {
        try {
            const info = await this.redis.info('memory');
            const memoryMatch = info.match(/used_memory:(\d+)/);
            if (memoryMatch) {
                this.metrics.memoryUsage = parseInt(memoryMatch[1]);
            }
            const keyCount = await this.redis.dbsize();
            this.metrics.keyCount = keyCount;
            this.emit('healthCheck', this.metrics);
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error('Health check failed:', errorMessage);
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async getInfo() {
        try {
            const redisInfo = await this.redis.info();
            return {
                redis: redisInfo,
                config: this.config,
                metrics: this.metrics
            };
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error('Failed to get Redis info:', errorMessage);
            return {
                redis: null,
                config: this.config,
                metrics: this.metrics
            };
        }
    }
    // =============================================================================
    // SHUTDOWN
    // =============================================================================
    async disconnect() {
        try {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }
            if (this.isConnected) {
                await this.redis.quit();
            }
            this.isConnected = false;
            this.logger.info('Redis cache service disconnected');
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            this.logger.error('Error during Redis disconnect:', errorMessage);
        }
    }
}
export default RedisCacheService;
//# sourceMappingURL=RedisCacheService.js.map