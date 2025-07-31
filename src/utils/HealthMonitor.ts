/**
 * Health Monitoring System
 * 
 * Comprehensive health monitoring with:
 * - Service health checks
 * - Performance metrics
 * - Resource monitoring
 * - Alerting system
 * - Auto-recovery triggers
 */

import { Logger } from 'winston';
import { EventEmitter } from 'events';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL'
}

export interface HealthCheckResult {
  status: HealthStatus;
  latency: number;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  consecutiveFailures: number;
  totalChecks: number;
  totalFailures: number;
  averageLatency: number;
  lastError?: string;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  activeConnections: number;
  queueLength: number;
  errorRate: number;
  timestamp: Date;
}

export interface HealthThresholds {
  memoryThreshold: number; // MB
  latencyThreshold: number; // ms
  errorRateThreshold: number; // percentage
  consecutiveFailureThreshold: number;
}

export interface AlertConfig {
  enabled: boolean;
  channels: string[];
  cooldownPeriod: number; // ms
  escalationRules: Record<HealthStatus, number>; // minutes to escalate
}

export type HealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * Health Monitor
 */
export class HealthMonitor extends EventEmitter {
  private logger: Logger;
  private services: Map<string, ServiceHealth> = new Map();
  private healthChecks: Map<string, HealthCheckFunction> = new Map();
  private metrics: SystemMetrics[] = [];
  private maxMetricsHistory = 100;
  private checkInterval = 30000; // 30 seconds
  private metricsInterval = 10000; // 10 seconds
  private intervalIds: NodeJS.Timeout[] = [];
  private lastAlerts: Map<string, Date> = new Map();
  
  private thresholds: HealthThresholds = {
    memoryThreshold: 512, // MB
    latencyThreshold: 5000, // 5 seconds
    errorRateThreshold: 5, // 5%
    consecutiveFailureThreshold: 3
  };

  private alertConfig: AlertConfig = {
    enabled: true,
    channels: ['console', 'log'],
    cooldownPeriod: 300000, // 5 minutes
    escalationRules: {
      [HealthStatus.HEALTHY]: 0,
      [HealthStatus.DEGRADED]: 15,
      [HealthStatus.UNHEALTHY]: 5,
      [HealthStatus.CRITICAL]: 1
    }
  };

  constructor(logger: Logger, options: {
    thresholds?: Partial<HealthThresholds>;
    alertConfig?: Partial<AlertConfig>;
    checkInterval?: number;
    metricsInterval?: number;
  } = {}) {
    super();
    this.logger = logger;
    
    if (options.thresholds) {
      this.thresholds = { ...this.thresholds, ...options.thresholds };
    }
    
    if (options.alertConfig) {
      this.alertConfig = { ...this.alertConfig, ...options.alertConfig };
    }
    
    if (options.checkInterval) {
      this.checkInterval = options.checkInterval;
    }
    
    if (options.metricsInterval) {
      this.metricsInterval = options.metricsInterval;
    }
  }

  /**
   * Register a service health check
   */
  registerHealthCheck(serviceName: string, healthCheck: HealthCheckFunction): void {
    this.healthChecks.set(serviceName, healthCheck);
    this.services.set(serviceName, {
      name: serviceName,
      status: HealthStatus.HEALTHY,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      totalChecks: 0,
      totalFailures: 0,
      averageLatency: 0,
      lastError: undefined
    });
    
    this.logger.info(`Registered health check for service: ${serviceName}`);
  }

  /**
   * Start monitoring
   */
  start(): void {
    this.logger.info('Starting health monitoring system');
    
    // Start health checks
    const healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);
    
    // Start metrics collection
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
    
    this.intervalIds.push(healthCheckInterval, metricsInterval);
    
    // Initial checks
    this.performHealthChecks();
    this.collectMetrics();
    
    this.emit('monitoring-started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    this.logger.info('Health monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Perform health checks for all registered services
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, healthCheck] of this.healthChecks) {
      try {
        const result = await this.performSingleHealthCheck(serviceName, healthCheck);
        this.updateServiceHealth(serviceName, result);
      } catch (error) {
        this.logger.error(`Health check failed for ${serviceName}:`, error);
        this.updateServiceHealth(serviceName, {
          status: HealthStatus.CRITICAL,
          latency: 0,
          message: `Health check error: ${(error as Error).message}`,
          timestamp: new Date()
        });
      }
    }
    
    this.evaluateOverallHealth();
  }

  /**
   * Perform single health check with timeout
   */
  private async performSingleHealthCheck(
    serviceName: string,
    healthCheck: HealthCheckFunction
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    // Add timeout to health check
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 10000);
    });
    
    try {
      const result = await Promise.race([healthCheck(), timeoutPromise]);
      result.latency = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        status: HealthStatus.CRITICAL,
        latency: Date.now() - startTime,
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Update service health based on check result
   */
  private updateServiceHealth(serviceName: string, result: HealthCheckResult): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.lastCheck = result.timestamp;
    service.totalChecks++;
    
    // Update latency average
    service.averageLatency = (service.averageLatency * (service.totalChecks - 1) + result.latency) / service.totalChecks;
    
    if (result.status === HealthStatus.HEALTHY) {
      service.consecutiveFailures = 0;
      service.lastError = undefined;
    } else {
      service.consecutiveFailures++;
      service.totalFailures++;
      service.lastError = result.message;
      
      // Check if we need to alert
      if (service.consecutiveFailures >= this.thresholds.consecutiveFailureThreshold) {
        this.triggerAlert(serviceName, result.status, result.message || 'Consecutive failures threshold exceeded');
      }
    }
    
    service.status = result.status;
    
    // Emit status change event
    this.emit('service-status-change', {
      serviceName,
      status: result.status,
      result
    });
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    const metrics: SystemMetrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      activeConnections: 0, // Would need actual connection tracking
      queueLength: 0, // Would need actual queue monitoring
      errorRate: this.calculateErrorRate(),
      timestamp: new Date()
    };
    
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    // Check thresholds
    this.checkMetricThresholds(metrics);
    
    this.emit('metrics-collected', metrics);
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const services = Array.from(this.services.values());
    if (services.length === 0) return 0;
    
    const totalChecks = services.reduce((sum, s) => sum + s.totalChecks, 0);
    const totalFailures = services.reduce((sum, s) => sum + s.totalFailures, 0);
    
    if (totalChecks === 0) return 0;
    return (totalFailures / totalChecks) * 100;
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkMetricThresholds(metrics: SystemMetrics): void {
    // Memory threshold
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryMB > this.thresholds.memoryThreshold) {
      this.triggerAlert('system', HealthStatus.CRITICAL, 
        `Memory usage (${memoryMB.toFixed(1)}MB) exceeds threshold (${this.thresholds.memoryThreshold}MB)`);
    }
    
    // Error rate threshold
    if (metrics.errorRate > this.thresholds.errorRateThreshold) {
      this.triggerAlert('system', HealthStatus.UNHEALTHY,
        `Error rate (${metrics.errorRate.toFixed(1)}%) exceeds threshold (${this.thresholds.errorRateThreshold}%)`);
    }
  }

  /**
   * Evaluate overall system health
   */
  private evaluateOverallHealth(): void {
    const services = Array.from(this.services.values());
    const criticalServices = services.filter(s => s.status === HealthStatus.CRITICAL);
    const unhealthyServices = services.filter(s => s.status === HealthStatus.UNHEALTHY);
    const degradedServices = services.filter(s => s.status === HealthStatus.DEGRADED);
    
    let overallStatus: HealthStatus;
    
    if (criticalServices.length > 0) {
      overallStatus = HealthStatus.CRITICAL;
    } else if (unhealthyServices.length > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (degradedServices.length > 0) {
      overallStatus = HealthStatus.DEGRADED;
    } else {
      overallStatus = HealthStatus.HEALTHY;
    }
    
    this.emit('overall-health-change', {
      status: overallStatus,
      services: {
        total: services.length,
        healthy: services.filter(s => s.status === HealthStatus.HEALTHY).length,
        degraded: degradedServices.length,
        unhealthy: unhealthyServices.length,
        critical: criticalServices.length
      }
    });
  }

  /**
   * Trigger alert with cooldown
   */
  private triggerAlert(source: string, status: HealthStatus, message: string): void {
    if (!this.alertConfig.enabled) return;
    
    const alertKey = `${source}:${status}`;
    const lastAlert = this.lastAlerts.get(alertKey);
    const now = new Date();
    
    // Check cooldown
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.alertConfig.cooldownPeriod) {
      return;
    }
    
    this.lastAlerts.set(alertKey, now);
    
    const alert = {
      source,
      status,
      message,
      timestamp: now,
      escalationLevel: this.alertConfig.escalationRules[status] || 0
    };
    
    // Send alert through configured channels
    this.sendAlert(alert);
    
    this.emit('alert-triggered', alert);
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: any): void {
    if (this.alertConfig.channels.includes('console')) {
      console.error(`🚨 ALERT [${alert.status}] ${alert.source}: ${alert.message}`);
    }
    
    if (this.alertConfig.channels.includes('log')) {
      this.logger.error('Health alert triggered', alert);
    }
    
    // Could add webhook, email, SMS channels here
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    overall: HealthStatus;
    services: ServiceHealth[];
    metrics: SystemMetrics | null;
    timestamp: Date;
  } {
    const services = Array.from(this.services.values());
    const currentMetrics = this.metrics[this.metrics.length - 1] || null;
    
    let overall: HealthStatus = HealthStatus.HEALTHY;
    const criticalCount = services.filter(s => s.status === HealthStatus.CRITICAL).length;
    const unhealthyCount = services.filter(s => s.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = services.filter(s => s.status === HealthStatus.DEGRADED).length;
    
    if (criticalCount > 0) {
      overall = HealthStatus.CRITICAL;
    } else if (unhealthyCount > 0) {
      overall = HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      overall = HealthStatus.DEGRADED;
    }
    
    return {
      overall,
      services,
      metrics: currentMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Force health check for specific service
   */
  async forceHealthCheck(serviceName: string): Promise<HealthCheckResult | null> {
    const healthCheck = this.healthChecks.get(serviceName);
    if (!healthCheck) {
      this.logger.warn(`No health check registered for service: ${serviceName}`);
      return null;
    }
    
    try {
      const result = await this.performSingleHealthCheck(serviceName, healthCheck);
      this.updateServiceHealth(serviceName, result);
      return result;
    } catch (error) {
      this.logger.error(`Forced health check failed for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Reset service health stats
   */
  resetServiceStats(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;
    
    service.consecutiveFailures = 0;
    service.totalChecks = 0;
    service.totalFailures = 0;
    service.averageLatency = 0;
    service.lastError = undefined;
    
    return true;
  }
}

/**
 * Built-in health check functions
 */
export class BuiltInHealthChecks {
  
  /**
   * Database connection health check
   */
  static createDatabaseHealthCheck(connectionTest: () => Promise<boolean>): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      try {
        const isConnected = await connectionTest();
        return {
          status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          latency: 0, // Will be set by the monitor
          message: isConnected ? 'Database connection OK' : 'Database connection failed',
          timestamp: new Date()
        };
      } catch (error) {
        return {
          status: HealthStatus.CRITICAL,
          latency: 0,
          message: `Database error: ${(error as Error).message}`,
          timestamp: new Date()
        };
      }
    };
  }

  /**
   * File system health check
   */
  static createFileSystemHealthCheck(testPath: string): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      const fs = await import('fs/promises');
      
      try {
        await fs.access(testPath);
        return {
          status: HealthStatus.HEALTHY,
          latency: 0,
          message: 'File system access OK',
          timestamp: new Date()
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          latency: 0,
          message: `File system error: ${(error as Error).message}`,
          timestamp: new Date()
        };
      }
    };
  }

  /**
   * External API health check
   */
  static createApiHealthCheck(url: string, timeout: number = 5000): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const status = response.ok ? HealthStatus.HEALTHY : HealthStatus.DEGRADED;
        return {
          status,
          latency: 0,
          message: `API responded with status ${response.status}`,
          metadata: { statusCode: response.status },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          latency: 0,
          message: `API check failed: ${(error as Error).message}`,
          timestamp: new Date()
        };
      }
    };
  }

  /**
   * Memory usage health check
   */
  static createMemoryHealthCheck(thresholdMB: number): HealthCheckFunction {
    return async (): Promise<HealthCheckResult> => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      
      let status: HealthStatus;
      if (heapUsedMB < thresholdMB * 0.7) {
        status = HealthStatus.HEALTHY;
      } else if (heapUsedMB < thresholdMB * 0.9) {
        status = HealthStatus.DEGRADED;
      } else if (heapUsedMB < thresholdMB) {
        status = HealthStatus.UNHEALTHY;
      } else {
        status = HealthStatus.CRITICAL;
      }
      
      return {
        status,
        latency: 0,
        message: `Memory usage: ${heapUsedMB.toFixed(1)}MB / ${thresholdMB}MB`,
        metadata: { heapUsedMB, thresholdMB },
        timestamp: new Date()
      };
    };
  }
}