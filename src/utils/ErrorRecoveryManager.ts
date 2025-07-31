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

export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  FILESYSTEM = 'FILESYSTEM',
  MEMORY = 'MEMORY',
  VALIDATION = 'VALIDATION',
  DEPENDENCY = 'DEPENDENCY',
  CONCURRENCY = 'CONCURRENCY',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
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
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private requestCount = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker OPEN for ${operationName}`);
      }
    }

    try {
      this.requestCount++;
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === 'HALF_OPEN' && this.successCount >= 3) {
      this.state = 'CLOSED';
      this.successCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Error Recovery Manager
 */
export class ErrorRecoveryManager {
  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorStats: Map<string, { count: number; lastOccurred: Date; severity: ErrorSeverity }> = new Map();
  
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    exponentialBase: 2
  };

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 60000,
    monitoringPeriod: 30000,
    resetTimeout: 60000
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Execute operation with comprehensive error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const config = {
      retryConfig: { ...this.defaultRetryConfig, ...options.retryConfig },
      circuitBreakerConfig: { ...this.defaultCircuitBreakerConfig, ...options.circuitBreakerConfig }
    };

    // Get or create circuit breaker for this operation
    let circuitBreaker = this.circuitBreakers.get(operationName);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
      this.circuitBreakers.set(operationName, circuitBreaker);
    }

    const wrappedOperation = async () => {
      return await circuitBreaker!.execute(operation, operationName);
    };

    try {
      return await this.executeWithRetry(wrappedOperation, operationName, config.retryConfig);
    } catch (error) {
      const errorType = this.classifyError(error as Error);
      const severity = this.determineSeverity(errorType, error as Error);
      
      this.recordError(operationName, errorType, severity);
      
      if (options.enableGracefulDegradation && options.fallbackFunction) {
        this.logger.warn(`Falling back for operation: ${operationName}`, {
          error: (error as Error).message,
          errorType,
          severity
        });
        
        try {
          return await options.fallbackFunction();
        } catch (fallbackError) {
          this.logger.error(`Fallback failed for operation: ${operationName}`, {
            originalError: (error as Error).message,
            fallbackError: (fallbackError as Error).message
          });
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.info(`Operation succeeded after ${attempt} attempts: ${operationName}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          break;
        }

        if (!this.isRetriableError(lastError)) {
          this.logger.warn(`Non-retriable error for operation: ${operationName}`, {
            error: lastError.message,
            attempt
          });
          break;
        }

        const delay = this.calculateDelay(attempt, config);
        
        this.logger.warn(`Retrying operation (${attempt}/${config.maxAttempts}): ${operationName}`, {
          error: lastError.message,
          nextRetryIn: delay,
          attempt
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);
    
    if (config.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    
    return Math.max(delay, 0);
  }

  /**
   * Classify error type for appropriate handling
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection') || message.includes('fetch') ||
        name.includes('networkerror')) {
      return ErrorType.NETWORK;
    }
    
    // Database errors
    if (message.includes('database') || message.includes('sqlite') ||
        message.includes('deadlock') || message.includes('lock') ||
        message.includes('constraint')) {
      return ErrorType.DATABASE;
    }
    
    // File system errors
    if (message.includes('enoent') || message.includes('eacces') ||
        message.includes('permission') || message.includes('file') ||
        message.includes('directory')) {
      return ErrorType.FILESYSTEM;
    }
    
    // Memory errors
    if (message.includes('memory') || message.includes('heap') ||
        name.includes('rangeerror')) {
      return ErrorType.MEMORY;
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        name.includes('typeerror') || name.includes('syntaxerror')) {
      return ErrorType.VALIDATION;
    }
    
    // Dependency errors
    if (message.includes('service unavailable') || message.includes('api') ||
        message.includes('external')) {
      return ErrorType.DEPENDENCY;
    }
    
    // Concurrency errors
    if (message.includes('concurrent') || message.includes('race') ||
        message.includes('contention')) {
      return ErrorType.CONCURRENCY;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Determine error severity based on type and context
   */
  private determineSeverity(errorType: ErrorType, error: Error): ErrorSeverity {
    switch (errorType) {
      case ErrorType.MEMORY:
      case ErrorType.DATABASE:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.NETWORK:
      case ErrorType.DEPENDENCY:
        return ErrorSeverity.HIGH;
      
      case ErrorType.FILESYSTEM:
      case ErrorType.CONCURRENCY:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.VALIDATION:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: Error): boolean {
    const errorType = this.classifyError(error);
    
    // Non-retriable error types
    const nonRetriable = [
      ErrorType.VALIDATION,
      ErrorType.FILESYSTEM // Permission errors shouldn't be retried
    ];
    
    if (nonRetriable.includes(errorType)) {
      return false;
    }
    
    // Specific non-retriable messages
    const message = error.message.toLowerCase();
    if (message.includes('permission denied') || 
        message.includes('invalid') ||
        message.includes('malformed')) {
      return false;
    }
    
    return true;
  }

  /**
   * Record error for monitoring and analysis
   */
  private recordError(operation: string, errorType: ErrorType, severity: ErrorSeverity): void {
    const key = `${operation}:${errorType}`;
    const existing = this.errorStats.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurred = new Date();
    } else {
      this.errorStats.set(key, {
        count: 1,
        lastOccurred: new Date(),
        severity
      });
    }
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, any> {
    const circuitBreakerStatus: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakerStatus[name] = breaker.getMetrics();
    }
    
    const errorSummary: Record<string, any> = {};
    for (const [key, stats] of this.errorStats) {
      errorSummary[key] = {
        count: stats.count,
        lastOccurred: stats.lastOccurred.toISOString(),
        severity: stats.severity
      };
    }
    
    return {
      circuitBreakers: circuitBreakerStatus,
      errorStats: errorSummary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset circuit breaker for specific operation
   */
  resetCircuitBreaker(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      // Create new circuit breaker (effectively resetting)
      this.circuitBreakers.set(operationName, new CircuitBreaker(this.defaultCircuitBreakerConfig));
      return true;
    }
    return false;
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorStats.clear();
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error Recovery Decorator
 */
export function withErrorRecovery(
  recoveryManager: ErrorRecoveryManager,
  operationName: string,
  options: ErrorRecoveryOptions = {}
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      return recoveryManager.executeWithRecovery(
        () => originalMethod.apply(this, args),
        `${target.constructor.name}.${operationName}`,
        options
      );
    } as T;
    
    return descriptor;
  };
}