/**
 * Error Recovery Manager
 *
 * Comprehensive error recovery system implementing:
 * - Circuit Breaker pattern
 * - Exponential backoff retry logic
 * - Graceful degradation
 * - Health monitoring
 * - Error classification and handling
 */
import { Logger } from 'winston';
export declare enum ErrorType {
    NETWORK = "NETWORK",
    DATABASE = "DATABASE",
    FILESYSTEM = "FILESYSTEM",
    MEMORY = "MEMORY",
    VALIDATION = "VALIDATION",
    DEPENDENCY = "DEPENDENCY",
    CONCURRENCY = "CONCURRENCY",
    UNKNOWN = "UNKNOWN"
}
export declare enum ErrorSeverity {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export interface ErrorContext {
    operation: string;
    service: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
    exponentialBase: number;
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    timeout: number;
    monitoringPeriod: number;
    resetTimeout: number;
}
export interface ErrorRecoveryOptions {
    retryConfig?: Partial<RetryConfig>;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
    enableGracefulDegradation?: boolean;
    fallbackFunction?: () => Promise<any>;
}
/**
 * Error Recovery Manager
 */
export declare class ErrorRecoveryManager {
    private logger;
    private circuitBreakers;
    private errorStats;
    private defaultRetryConfig;
    private defaultCircuitBreakerConfig;
    constructor(logger: Logger);
    /**
     * Execute operation with comprehensive error recovery
     */
    executeWithRecovery<T>(operation: () => Promise<T>, operationName: string, options?: ErrorRecoveryOptions): Promise<T>;
    /**
     * Execute operation with retry logic and exponential backoff
     */
    private executeWithRetry;
    /**
     * Calculate retry delay with exponential backoff and jitter
     */
    private calculateDelay;
    /**
     * Classify error type for appropriate handling
     */
    private classifyError;
    /**
     * Determine error severity based on type and context
     */
    private determineSeverity;
    /**
     * Check if error is retriable
     */
    private isRetriableError;
    /**
     * Record error for monitoring and analysis
     */
    private recordError;
    /**
     * Get health status of all circuit breakers
     */
    getHealthStatus(): Record<string, any>;
    /**
     * Reset circuit breaker for specific operation
     */
    resetCircuitBreaker(operationName: string): boolean;
    /**
     * Clear error statistics
     */
    clearErrorStats(): void;
    /**
     * Utility sleep function
     */
    private sleep;
}
/**
 * Error Recovery Decorator
 */
export declare function withErrorRecovery(recoveryManager: ErrorRecoveryManager, operationName: string, options?: ErrorRecoveryOptions): <T extends (...args: any[]) => Promise<any>>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
//# sourceMappingURL=ErrorRecoveryManager.d.ts.map