/**
 * Redis Cache Service - Advanced Distributed Caching System
 *
 * CastPlan MCP Phase 2.2: Redis 캐싱 시스템
 * 분산 캐싱, 연결 풀링, TTL 관리, 캐시 무효화 전략
 *
 * Created: 2025-07-31
 * Author: Performance Engineer & Caching Specialist
 */
import winston from 'winston';
import { EventEmitter } from 'events';
export interface CacheConfig {
    host: string;
    port: number;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
    family: 4 | 6;
    keepAlive: number;
    lazyConnect: boolean;
    maxLoadingTimeout: number;
    maxMemoryPolicy: 'noeviction' | 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu' | 'allkeys-random' | 'volatile-random' | 'volatile-ttl';
    keyPrefix: string;
    defaultTTL: number;
    compressionThreshold: number;
    enableCompression: boolean;
    enableMetrics: boolean;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    connections: number;
    errorCount: number;
    totalOperations: number;
    averageResponseTime: number;
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
}
export interface CacheEntry<T = any> {
    value: T;
    ttl?: number;
    compressed?: boolean;
    metadata?: {
        createdAt: number;
        lastAccessed?: number;
        accessCount?: number;
        tags?: string[];
    };
}
export interface CacheOptions {
    ttl?: number;
    compress?: boolean;
    tags?: string[];
    namespace?: string;
    priority?: 'low' | 'medium' | 'high';
}
export interface BulkOperation<T = any> {
    key: string;
    value?: T;
    options?: CacheOptions;
}
export declare class RedisCacheService extends EventEmitter {
    private logger;
    private redis;
    private config;
    private metrics;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private healthCheckInterval?;
    constructor(logger: winston.Logger, config?: Partial<CacheConfig>);
    private initializeRedisClient;
    connect(): Promise<void>;
    private setupRedisConfiguration;
    get<T = any>(key: string, options?: {
        decompress?: boolean;
    }): Promise<T | null>;
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    delete(key: string, namespace?: string): Promise<boolean>;
    exists(key: string, namespace?: string): Promise<boolean>;
    expire(key: string, ttl: number, namespace?: string): Promise<boolean>;
    ttl(key: string, namespace?: string): Promise<number>;
    mget<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]>;
    mset<T = any>(operations: BulkOperation<T>[]): Promise<boolean>;
    mdel(keys: string[], namespace?: string): Promise<number>;
    invalidateByTag(tag: string): Promise<number>;
    invalidateByPattern(pattern: string): Promise<number>;
    flush(namespace?: string): Promise<boolean>;
    private buildKey;
    private indexTaggedKey;
    private compress;
    private decompress;
    private validateConnection;
    private updateMetrics;
    private updateBulkMetrics;
    private startHealthCheck;
    private performHealthCheck;
    getMetrics(): CacheMetrics;
    getInfo(): Promise<{
        redis: any;
        config: CacheConfig;
        metrics: CacheMetrics;
    }>;
    disconnect(): Promise<void>;
}
export default RedisCacheService;
//# sourceMappingURL=RedisCacheService.d.ts.map