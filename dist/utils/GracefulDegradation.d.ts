/**
 * Graceful Degradation Manager
 *
 * Implements graceful degradation patterns for service failures:
 * - Service availability tracking
 * - Automatic fallback activation
 * - Feature toggling
 * - Performance-based degradation
 * - User experience preservation
 */
import { Logger } from 'winston';
import { EventEmitter } from 'events';
export declare enum ServiceStatus {
    AVAILABLE = "AVAILABLE",
    DEGRADED = "DEGRADED",
    UNAVAILABLE = "UNAVAILABLE"
}
export declare enum DegradationLevel {
    NONE = 0,
    MINIMAL = 1,
    MODERATE = 2,
    SEVERE = 3,
    CRITICAL = 4
}
export interface ServiceConfig {
    name: string;
    essential: boolean;
    fallbackAvailable: boolean;
    degradationThreshold: number;
    recoveryThreshold: number;
}
export interface DegradationRule {
    condition: (context: DegradationContext) => boolean;
    level: DegradationLevel;
    actions: DegradationAction[];
    description: string;
}
export interface DegradationContext {
    serviceStatuses: Map<string, ServiceStatus>;
    systemLoad: number;
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    activeUsers: number;
}
export interface DegradationAction {
    type: 'disable_feature' | 'use_fallback' | 'reduce_quality' | 'limit_requests' | 'cache_extend';
    target: string;
    parameters?: Record<string, any>;
}
export interface FallbackFunction<T> {
    (): Promise<T> | T;
}
export interface FeatureToggle {
    enabled: boolean;
    degradationLevel: DegradationLevel;
    fallback?: FallbackFunction<any>;
}
/**
 * Graceful Degradation Manager
 */
export declare class GracefulDegradationManager extends EventEmitter {
    private logger;
    private services;
    private serviceStatuses;
    private serviceFailures;
    private serviceSuccesses;
    private features;
    private degradationRules;
    private currentDegradationLevel;
    private fallbacks;
    private activeActions;
    constructor(logger: Logger);
    /**
     * Register a service for degradation monitoring
     */
    registerService(config: ServiceConfig): void;
    /**
     * Register a feature with degradation settings
     */
    registerFeature(name: string, toggle: FeatureToggle): void;
    /**
     * Register a fallback function for a service or feature
     */
    registerFallback<T>(name: string, fallback: FallbackFunction<T>): void;
    /**
     * Record service operation result
     */
    recordServiceResult(serviceName: string, success: boolean, responseTime?: number): void;
    /**
     * Update service status and trigger actions
     */
    private updateServiceStatus;
    /**
     * Evaluate current degradation level based on rules
     */
    private evaluateDegradationLevel;
    /**
     * Set degradation level and execute actions
     */
    private setDegradationLevel;
    /**
     * Execute a degradation action
     */
    private executeAction;
    /**
     * Disable a feature temporarily
     */
    private disableFeature;
    /**
     * Activate fallback for a service or feature
     */
    private activateFallback;
    /**
     * Reduce quality of a service
     */
    private reduceQuality;
    /**
     * Limit requests to a service
     */
    private limitRequests;
    /**
     * Extend cache duration for a service
     */
    private extendCache;
    /**
     * Execute operation with automatic fallback
     */
    executeWithFallback<T>(operationName: string, primaryOperation: () => Promise<T>, fallbackOperation?: () => Promise<T>): Promise<T>;
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureName: string): boolean;
    /**
     * Get current system status
     */
    getSystemStatus(): {
        degradationLevel: DegradationLevel;
        services: Array<{
            name: string;
            status: ServiceStatus;
            failures: number;
            successes: number;
        }>;
        features: Array<{
            name: string;
            enabled: boolean;
        }>;
        activeActions: string[];
    };
    /**
     * Force reset all services to available
     */
    resetAllServices(): void;
    /**
     * Setup default degradation rules
     */
    private setupDefaultRules;
    private getSystemLoad;
    private getErrorRate;
    private getAverageResponseTime;
    private getMemoryUsage;
    private getActiveUsers;
}
//# sourceMappingURL=GracefulDegradation.d.ts.map