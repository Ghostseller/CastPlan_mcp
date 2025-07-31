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

export enum ServiceStatus {
  AVAILABLE = 'AVAILABLE',
  DEGRADED = 'DEGRADED',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum DegradationLevel {
  NONE = 0,
  MINIMAL = 1,
  MODERATE = 2,
  SEVERE = 3,
  CRITICAL = 4
}

export interface ServiceConfig {
  name: string;
  essential: boolean; // If true, system can't function without it
  fallbackAvailable: boolean;
  degradationThreshold: number; // Consecutive failures before degradation
  recoveryThreshold: number; // Consecutive successes before recovery
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
export class GracefulDegradationManager extends EventEmitter {
  private logger: Logger;
  private services: Map<string, ServiceConfig> = new Map();
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private serviceFailures: Map<string, number> = new Map();
  private serviceSuccesses: Map<string, number> = new Map();
  private features: Map<string, FeatureToggle> = new Map();
  private degradationRules: DegradationRule[] = [];
  private currentDegradationLevel: DegradationLevel = DegradationLevel.NONE;
  private fallbacks: Map<string, FallbackFunction<any>> = new Map();
  private activeActions: Set<string> = new Set();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.setupDefaultRules();
  }

  /**
   * Register a service for degradation monitoring
   */
  registerService(config: ServiceConfig): void {
    this.services.set(config.name, config);
    this.serviceStatuses.set(config.name, ServiceStatus.AVAILABLE);
    this.serviceFailures.set(config.name, 0);
    this.serviceSuccesses.set(config.name, 0);
    
    this.logger.info(`Registered service for degradation monitoring: ${config.name}`, {
      essential: config.essential,
      fallbackAvailable: config.fallbackAvailable
    });
  }

  /**
   * Register a feature with degradation settings
   */
  registerFeature(name: string, toggle: FeatureToggle): void {
    this.features.set(name, toggle);
    this.logger.debug(`Registered feature: ${name}`, { enabled: toggle.enabled });
  }

  /**
   * Register a fallback function for a service or feature
   */
  registerFallback<T>(name: string, fallback: FallbackFunction<T>): void {
    this.fallbacks.set(name, fallback);
    this.logger.debug(`Registered fallback for: ${name}`);
  }

  /**
   * Record service operation result
   */
  recordServiceResult(serviceName: string, success: boolean, responseTime?: number): void {
    const service = this.services.get(serviceName);
    if (!service) {
      this.logger.warn(`Unknown service: ${serviceName}`);
      return;
    }

    if (success) {
      this.serviceFailures.set(serviceName, 0);
      const successes = (this.serviceSuccesses.get(serviceName) || 0) + 1;
      this.serviceSuccesses.set(serviceName, successes);
      
      // Check for recovery
      if (successes >= service.recoveryThreshold && 
          this.serviceStatuses.get(serviceName) !== ServiceStatus.AVAILABLE) {
        this.updateServiceStatus(serviceName, ServiceStatus.AVAILABLE);
      }
    } else {
      this.serviceSuccesses.set(serviceName, 0);
      const failures = (this.serviceFailures.get(serviceName) || 0) + 1;
      this.serviceFailures.set(serviceName, failures);
      
      // Check for degradation
      if (failures >= service.degradationThreshold) {
        const newStatus = service.essential ? ServiceStatus.DEGRADED : ServiceStatus.UNAVAILABLE;
        this.updateServiceStatus(serviceName, newStatus);
      }
    }

    // Re-evaluate degradation level
    this.evaluateDegradationLevel();
  }

  /**
   * Update service status and trigger actions
   */
  private updateServiceStatus(serviceName: string, status: ServiceStatus): void {
    const previousStatus = this.serviceStatuses.get(serviceName);
    this.serviceStatuses.set(serviceName, status);
    
    if (previousStatus !== status) {
      this.logger.info(`Service status changed: ${serviceName}`, {
        from: previousStatus,
        to: status
      });
      
      this.emit('service-status-change', {
        serviceName,
        previousStatus,
        currentStatus: status
      });
    }
  }

  /**
   * Evaluate current degradation level based on rules
   */
  private evaluateDegradationLevel(): void {
    const context: DegradationContext = {
      serviceStatuses: this.serviceStatuses,
      systemLoad: this.getSystemLoad(),
      errorRate: this.getErrorRate(),
      responseTime: this.getAverageResponseTime(),
      memoryUsage: this.getMemoryUsage(),
      activeUsers: this.getActiveUsers()
    };

    let highestLevel = DegradationLevel.NONE;
    const triggeredRules: DegradationRule[] = [];

    for (const rule of this.degradationRules) {
      if (rule.condition(context)) {
        if (rule.level > highestLevel) {
          highestLevel = rule.level;
        }
        triggeredRules.push(rule);
      }
    }

    if (highestLevel !== this.currentDegradationLevel) {
      this.setDegradationLevel(highestLevel, triggeredRules);
    }
  }

  /**
   * Set degradation level and execute actions
   */
  private setDegradationLevel(level: DegradationLevel, triggeredRules: DegradationRule[]): void {
    const previousLevel = this.currentDegradationLevel;
    this.currentDegradationLevel = level;

    this.logger.info(`Degradation level changed`, {
      from: DegradationLevel[previousLevel],
      to: DegradationLevel[level],
      triggeredRules: triggeredRules.map(r => r.description)
    });

    // Clear previous actions
    this.activeActions.clear();

    // Execute new actions
    for (const rule of triggeredRules) {
      for (const action of rule.actions) {
        this.executeAction(action);
      }
    }

    this.emit('degradation-level-change', {
      previousLevel,
      currentLevel: level,
      triggeredRules
    });
  }

  /**
   * Execute a degradation action
   */
  private executeAction(action: DegradationAction): void {
    const actionKey = `${action.type}:${action.target}`;
    
    if (this.activeActions.has(actionKey)) {
      return; // Action already active
    }

    this.activeActions.add(actionKey);

    switch (action.type) {
      case 'disable_feature':
        this.disableFeature(action.target);
        break;
      
      case 'use_fallback':
        this.activateFallback(action.target);
        break;
      
      case 'reduce_quality':
        this.reduceQuality(action.target, action.parameters);
        break;
      
      case 'limit_requests':
        this.limitRequests(action.target, action.parameters);
        break;
      
      case 'cache_extend':
        this.extendCache(action.target, action.parameters);
        break;
    }

    this.logger.info(`Executed degradation action: ${action.type} for ${action.target}`);
  }

  /**
   * Disable a feature temporarily
   */
  private disableFeature(featureName: string): void {
    const feature = this.features.get(featureName);
    if (feature) {
      feature.enabled = false;
      this.logger.warn(`Feature disabled due to degradation: ${featureName}`);
    }
  }

  /**
   * Activate fallback for a service or feature
   */
  private activateFallback(name: string): void {
    const fallback = this.fallbacks.get(name);
    if (fallback) {
      this.logger.info(`Fallback activated for: ${name}`);
      // Fallback activation is handled at the execution level
    }
  }

  /**
   * Reduce quality of a service
   */
  private reduceQuality(serviceName: string, parameters?: Record<string, any>): void {
    this.logger.info(`Reducing quality for service: ${serviceName}`, parameters);
    // Implementation would depend on specific service
  }

  /**
   * Limit requests to a service
   */
  private limitRequests(serviceName: string, parameters?: Record<string, any>): void {
    const limit = parameters?.limit || 10;
    this.logger.info(`Limiting requests to service: ${serviceName}`, { limit });
    // Implementation would use rate limiting
  }

  /**
   * Extend cache duration for a service
   */
  private extendCache(serviceName: string, parameters?: Record<string, any>): void {
    const multiplier = parameters?.multiplier || 2;
    this.logger.info(`Extending cache duration for service: ${serviceName}`, { multiplier });
    // Implementation would adjust cache TTL
  }

  /**
   * Execute operation with automatic fallback
   */
  async executeWithFallback<T>(
    operationName: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    // Check if service is available
    const serviceStatus = this.serviceStatuses.get(operationName);
    
    if (serviceStatus === ServiceStatus.UNAVAILABLE) {
      if (fallbackOperation) {
        this.logger.info(`Using fallback for unavailable service: ${operationName}`);
        return await fallbackOperation();
      } else {
        throw new Error(`Service unavailable and no fallback: ${operationName}`);
      }
    }

    try {
      const startTime = Date.now();
      const result = await primaryOperation();
      const responseTime = Date.now() - startTime;
      
      this.recordServiceResult(operationName, true, responseTime);
      return result;
    } catch (error) {
      this.recordServiceResult(operationName, false);
      
      // Try fallback on failure
      if (fallbackOperation) {
        this.logger.warn(`Primary operation failed, using fallback: ${operationName}`, {
          error: (error as Error).message
        });
        
        try {
          return await fallbackOperation();
        } catch (fallbackError) {
          this.logger.error(`Fallback also failed: ${operationName}`, {
            primaryError: (error as Error).message,
            fallbackError: (fallbackError as Error).message
          });
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    const feature = this.features.get(featureName);
    if (!feature) return true; // Default to enabled if not registered
    
    return feature.enabled && this.currentDegradationLevel <= feature.degradationLevel;
  }

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
  } {
    const services = Array.from(this.services.keys()).map(name => ({
      name,
      status: this.serviceStatuses.get(name) || ServiceStatus.AVAILABLE,
      failures: this.serviceFailures.get(name) || 0,
      successes: this.serviceSuccesses.get(name) || 0
    }));

    const features = Array.from(this.features.entries()).map(([name, toggle]) => ({
      name,
      enabled: toggle.enabled
    }));

    return {
      degradationLevel: this.currentDegradationLevel,
      services,
      features,
      activeActions: Array.from(this.activeActions)
    };
  }

  /**
   * Force reset all services to available
   */
  resetAllServices(): void {
    for (const serviceName of this.services.keys()) {
      this.serviceStatuses.set(serviceName, ServiceStatus.AVAILABLE);
      this.serviceFailures.set(serviceName, 0);
      this.serviceSuccesses.set(serviceName, 0);
    }
    
    this.currentDegradationLevel = DegradationLevel.NONE;
    this.activeActions.clear();
    
    // Re-enable all features
    for (const [name, feature] of this.features) {
      feature.enabled = true;
    }
    
    this.logger.info('All services reset to available state');
    this.emit('system-reset');
  }

  /**
   * Setup default degradation rules
   */
  private setupDefaultRules(): void {
    // Critical service failure
    this.degradationRules.push({
      condition: (context) => {
        for (const [serviceName, status] of context.serviceStatuses) {
          const service = this.services.get(serviceName);
          if (service?.essential && status === ServiceStatus.UNAVAILABLE) {
            return true;
          }
        }
        return false;
      },
      level: DegradationLevel.CRITICAL,
      actions: [
        { type: 'disable_feature', target: 'ai-analysis' },
        { type: 'disable_feature', target: 'advanced-search' },
        { type: 'use_fallback', target: 'core-services' }
      ],
      description: 'Essential service unavailable'
    });

    // High error rate
    this.degradationRules.push({
      condition: (context) => context.errorRate > 10,
      level: DegradationLevel.SEVERE,
      actions: [
        { type: 'disable_feature', target: 'ai-analysis' },
        { type: 'limit_requests', target: 'api', parameters: { limit: 5 } },
        { type: 'cache_extend', target: 'all', parameters: { multiplier: 3 } }
      ],
      description: 'High error rate detected'
    });

    // High memory usage
    this.degradationRules.push({
      condition: (context) => context.memoryUsage > 512,
      level: DegradationLevel.MODERATE,
      actions: [
        { type: 'reduce_quality', target: 'processing' },
        { type: 'limit_requests', target: 'memory-intensive', parameters: { limit: 3 } }
      ],
      description: 'High memory usage'
    });

    // Multiple service degradation
    this.degradationRules.push({
      condition: (context) => {
        const degradedCount = Array.from(context.serviceStatuses.values())
          .filter(status => status === ServiceStatus.DEGRADED).length;
        return degradedCount >= 2;
      },
      level: DegradationLevel.MODERATE,
      actions: [
        { type: 'disable_feature', target: 'ai-analysis' },
        { type: 'cache_extend', target: 'all', parameters: { multiplier: 2 } }
      ],
      description: 'Multiple services degraded'
    });
  }

  // Utility methods to get system metrics (would be implemented based on actual monitoring)
  private getSystemLoad(): number { return 0; }
  private getErrorRate(): number { return 0; }
  private getAverageResponseTime(): number { return 0; }
  private getMemoryUsage(): number { 
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  private getActiveUsers(): number { return 0; }
}