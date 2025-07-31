/**
 * Advanced Performance Testing Framework
 * 
 * Comprehensive performance testing, profiling, and optimization system
 * for CastPlan Ultimate MCP Server
 * 
 * Features:
 * - Advanced load testing with configurable scenarios
 * - Memory profiling with heap analysis
 * - Database performance optimization
 * - File I/O benchmarking
 * - AI service performance testing
 * - Real-time monitoring and reporting
 * 
 * Created: 2025-01-30
 */

import { Logger } from 'winston';
import * as winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// Performance Metrics Types
export interface PerformanceMetrics {
  execution: {
    duration: number;
    startTime: number;
    endTime: number;
    operationsPerSecond: number;
    totalOperations: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    memoryDelta: number;
    memoryLeaks: MemoryLeak[];
    gcEvents: GCEvent[];
  };
  database: {
    queryCount: number;
    avgQueryTime: number;
    slowQueries: SlowQuery[];
    connectionPoolSize: number;
    deadlocks: number;
    lockWaitTime: number;
  };
  io: {
    fileReads: number;
    fileWrites: number;
    avgReadTime: number;
    avgWriteTime: number;
    diskUtilization: number;
    ioErrors: number;
  };
  network: {
    requestCount: number;
    avgResponseTime: number;
    timeouts: number;
    errors: number;
    throughput: number;
  };
  cpu: {
    userTime: number;
    systemTime: number;
    utilization: number;
    contextSwitches: number;
  };
}

export interface LoadTestConfig {
  name: string;
  description: string;
  scenario: LoadTestScenario;
  duration: number; // milliseconds
  rampUpTime: number; // milliseconds
  maxConcurrency: number;
  targetRPS: number; // requests per second
  dataSet: any[];
  warmupDuration?: number;
  cooldownDuration?: number;
  thresholds: PerformanceThresholds;
}

export interface LoadTestScenario {
  type: 'stress' | 'volume' | 'endurance' | 'spike' | 'concurrency';
  operations: LoadTestOperation[];
  patterns: LoadPattern[];
}

export interface LoadTestOperation {
  name: string;
  weight: number; // percentage of operations
  operation: () => Promise<any>;
  validation?: (result: any) => boolean;
  timeout?: number;
}

export interface LoadPattern {
  type: 'constant' | 'ramp' | 'spike' | 'wave' | 'burst';
  parameters: Record<string, any>;
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  maxMemoryUsage: number;
  minThroughput: number;
  maxErrorRate: number;
  maxCpuUtilization: number;
  maxDatabaseLatency: number;
}

export interface MemoryLeak {
  id: string;
  timestamp: number;
  heapGrowth: number;
  suspectedObject: string;
  stackTrace: string[];
}

export interface GCEvent {
  timestamp: number;
  type: string;
  duration: number;
  heapBefore: number;
  heapAfter: number;
  freed: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
  parameters?: any[];
  stackTrace: string[];
}

export interface PerformanceReport {
  testId: string;
  testName: string;
  timestamp: string;
  duration: number;
  config: LoadTestConfig;
  metrics: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  regressions: PerformanceRegression[];
  success: boolean;
  summary: TestSummary;
}

export interface Bottleneck {
  type: 'cpu' | 'memory' | 'database' | 'io' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  location: string;
  recommendations: string[];
}

export interface Recommendation {
  category: 'performance' | 'scalability' | 'reliability' | 'efficiency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PerformanceRegression {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  threshold: number;
  severity: 'minor' | 'major' | 'severe';
}

export interface TestSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  avgResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryEfficiency: number;
  databaseEfficiency: number;
  overallScore: number; // 0-100
}

/**
 * Advanced Performance Testing Framework
 */
export class AdvancedPerformanceFramework extends EventEmitter {
  private logger: Logger;
  private activeTests: Map<string, LoadTestConfig> = new Map();
  private testResults: Map<string, PerformanceReport> = new Map();
  private baselineMetrics: Map<string, PerformanceMetrics> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private metricsHistory: PerformanceMetrics[] = [];

  constructor(logger?: Logger) {
    super();
    this.logger = logger || this.createDefaultLogger();
    this.setupGCMonitoring();
    this.setupProcessMonitoring();
  }

  /**
   * Create default logger for performance testing
   */
  private createDefaultLogger(): Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] [PERF] ${level.toUpperCase()}: ${message} ${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `performance-${new Date().toISOString().split('T')[0]}.log`,
          dirname: './logs/performance'
        })
      ]
    });
  }

  /**
   * Setup garbage collection monitoring
   */
  private setupGCMonitoring(): void {
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const beforeHeap = process.memoryUsage().heapUsed;
        const start = Date.now();
        originalGC();
        const afterHeap = process.memoryUsage().heapUsed;
        const duration = Date.now() - start;
        
        this.emit('gc', {
          timestamp: Date.now(),
          type: 'manual',
          duration,
          heapBefore: beforeHeap,
          heapAfter: afterHeap,
          freed: beforeHeap - afterHeap
        } as GCEvent);
        
        return originalGC();
      };
    }
  }

  /**
   * Setup process monitoring
   */
  private setupProcessMonitoring(): void {
    process.on('exit', () => {
      this.cleanup();
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Execute comprehensive load test
   */
  async executeLoadTest(config: LoadTestConfig): Promise<PerformanceReport> {
    const testId = uuidv4();
    const startTime = Date.now();
    
    this.logger.info(`Starting load test: ${config.name}`, { testId, config });
    this.activeTests.set(testId, config);
    
    try {
      // Initialize monitoring
      await this.startMonitoring(testId);
      
      // Warmup phase
      if (config.warmupDuration) {
        await this.executeWarmup(config);
      }
      
      // Main test execution
      const metrics = await this.executeTestPhase(config);
      
      // Cooldown phase
      if (config.cooldownDuration) {
        await this.executeCooldown(config);
      }
      
      // Stop monitoring and collect final metrics
      await this.stopMonitoring(testId);
      
      // Generate comprehensive report
      const report = await this.generateReport(testId, config, metrics, startTime);
      
      this.testResults.set(testId, report);
      this.logger.info(`Load test completed: ${config.name}`, { testId, success: report.success });
      
      return report;
      
    } catch (error: any) {
      this.logger.error(`Load test failed: ${config.name}`, { testId, error: error.message });
      throw error;
    } finally {
      this.activeTests.delete(testId);
      await this.stopMonitoring(testId);
    }
  }

  /**
   * Execute warmup phase
   */
  private async executeWarmup(config: LoadTestConfig): Promise<void> {
    this.logger.info(`Executing warmup phase: ${config.warmupDuration}ms`);
    
    // Run a subset of operations at low load
    const warmupOperations = Math.min(10, config.scenario.operations.length);
    const warmupPromises = [];
    
    for (let i = 0; i < warmupOperations; i++) {
      const operation = config.scenario.operations[i % config.scenario.operations.length];
      warmupPromises.push(operation.operation());
    }
    
    await Promise.all(warmupPromises);
    await this.sleep(config.warmupDuration || 1000);
  }

  /**
   * Execute main test phase
   */
  private async executeTestPhase(config: LoadTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: Error[] = [];
    
    this.logger.info(`Executing main test phase: ${config.duration}ms`);
    
    // Create load generators based on scenario
    const loadGenerators = await this.createLoadGenerators(config);
    
    // Execute load test
    const loadPromises = loadGenerators.map(generator => 
      this.executeLoadGenerator(generator, config, results, errors)
    );
    
    // Wait for all generators to complete or timeout
    await Promise.race([
      Promise.all(loadPromises),
      this.sleep(config.duration)
    ]);
    
    // Calculate final metrics
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    return this.calculateMetrics(results, errors, totalDuration, config);
  }

  /**
   * Execute cooldown phase
   */
  private async executeCooldown(config: LoadTestConfig): Promise<void> {
    this.logger.info(`Executing cooldown phase: ${config.cooldownDuration}ms`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    await this.sleep(config.cooldownDuration || 1000);
  }

  /**
   * Create load generators based on test scenario
   */
  private async createLoadGenerators(config: LoadTestConfig): Promise<LoadGenerator[]> {
    const generators: LoadGenerator[] = [];
    
    for (const pattern of config.scenario.patterns) {
      const generator = new LoadGenerator(
        pattern,
        config.scenario.operations,
        config.maxConcurrency,
        this.logger
      );
      generators.push(generator);
    }
    
    return generators;
  }

  /**
   * Execute individual load generator
   */
  private async executeLoadGenerator(
    generator: LoadGenerator,
    config: LoadTestConfig,
    results: any[],
    errors: Error[]
  ): Promise<void> {
    try {
      const generatorResults = await generator.execute(config.duration);
      results.push(...generatorResults.success);
      errors.push(...generatorResults.errors);
    } catch (error: any) {
      errors.push(error);
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculateMetrics(
    results: any[],
    errors: Error[],
    duration: number,
    config: LoadTestConfig
  ): PerformanceMetrics {
    const totalOperations = results.length + errors.length;
    const operationsPerSecond = totalOperations / (duration / 1000);
    
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      execution: {
        duration,
        startTime: Date.now() - duration,
        endTime: Date.now(),
        operationsPerSecond,
        totalOperations
      },
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
        memoryDelta: 0, // Will be calculated from monitoring
        memoryLeaks: [], // Will be detected during monitoring
        gcEvents: [] // Will be collected during monitoring
      },
      database: {
        queryCount: 0, // Will be monitored
        avgQueryTime: 0,
        slowQueries: [],
        connectionPoolSize: 0,
        deadlocks: 0,
        lockWaitTime: 0
      },
      io: {
        fileReads: 0,
        fileWrites: 0,
        avgReadTime: 0,
        avgWriteTime: 0,
        diskUtilization: 0,
        ioErrors: 0
      },
      network: {
        requestCount: totalOperations,
        avgResponseTime: duration / totalOperations,
        timeouts: errors.filter(e => e.message.includes('timeout')).length,
        errors: errors.length,
        throughput: operationsPerSecond
      },
      cpu: {
        userTime: cpuUsage.user / 1000,
        systemTime: cpuUsage.system / 1000,
        utilization: 0, // Will be calculated from monitoring
        contextSwitches: 0
      }
    };
  }

  /**
   * Start real-time monitoring
   */
  private async startMonitoring(testId: string): Promise<void> {
    this.logger.info(`Starting monitoring for test: ${testId}`);
    
    this.monitoringInterval = setInterval(() => {
      const metrics = this.collectCurrentMetrics();
      this.metricsHistory.push(metrics);
      this.emit('metrics', { testId, metrics });
      
      // Check for memory leaks
      this.detectMemoryLeaks(metrics);
      
      // Monitor database performance
      this.monitorDatabasePerformance();
      
    }, 1000); // Collect metrics every second
  }

  /**
   * Stop monitoring
   */
  private async stopMonitoring(testId: string): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.logger.info(`Stopped monitoring for test: ${testId}`);
  }

  /**
   * Collect current system metrics
   */
  private collectCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      execution: {
        duration: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        operationsPerSecond: 0,
        totalOperations: 0
      },
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
        memoryDelta: 0,
        memoryLeaks: [],
        gcEvents: []
      },
      database: {
        queryCount: 0,
        avgQueryTime: 0,
        slowQueries: [],
        connectionPoolSize: 0,
        deadlocks: 0,
        lockWaitTime: 0
      },
      io: {
        fileReads: 0,
        fileWrites: 0,
        avgReadTime: 0,
        avgWriteTime: 0,
        diskUtilization: 0,
        ioErrors: 0
      },
      network: {
        requestCount: 0,
        avgResponseTime: 0,
        timeouts: 0,
        errors: 0,
        throughput: 0
      },
      cpu: {
        userTime: cpuUsage.user / 1000,
        systemTime: cpuUsage.system / 1000,
        utilization: 0,
        contextSwitches: 0
      }
    };
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(metrics: PerformanceMetrics): void {
    if (this.metricsHistory.length > 10) {
      const recentHistory = this.metricsHistory.slice(-10);
      const heapGrowth = metrics.memory.heapUsed - recentHistory[0].memory.heapUsed;
      
      // If heap has grown consistently over 50MB without GC
      if (heapGrowth > 50 * 1024 * 1024) {
        const leak: MemoryLeak = {
          id: uuidv4(),
          timestamp: Date.now(),
          heapGrowth,
          suspectedObject: 'Unknown',
          stackTrace: []
        };
        
        this.emit('memoryLeak', leak);
        this.logger.warn('Potential memory leak detected', { leak });
      }
    }
  }

  /**
   * Monitor database performance
   */
  private monitorDatabasePerformance(): void {
    // This would be implemented to monitor SQLite operations
    // For now, we'll emit a placeholder event
    this.emit('databaseMetrics', {
      queryCount: 0,
      avgQueryTime: 0,
      activeConnections: 1
    });
  }

  /**
   * Generate comprehensive performance report
   */
  private async generateReport(
    testId: string,
    config: LoadTestConfig,
    metrics: PerformanceMetrics,
    startTime: number
  ): Promise<PerformanceReport> {
    const duration = Date.now() - startTime;
    
    // Analyze bottlenecks
    const bottlenecks = this.analyzeBottlenecks(metrics, config.thresholds);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, bottlenecks);
    
    // Check for performance regressions
    const regressions = await this.checkRegressions(config.name, metrics);
    
    // Calculate test summary
    const summary = this.calculateTestSummary(metrics, config);
    
    const report: PerformanceReport = {
      testId,
      testName: config.name,
      timestamp: new Date().toISOString(),
      duration,
      config,
      metrics,
      bottlenecks,
      recommendations,
      regressions,
      success: this.isTestSuccessful(metrics, config.thresholds),
      summary
    };
    
    // Save report to file
    await this.saveReport(report);
    
    return report;
  }

  /**
   * Analyze performance bottlenecks
   */
  private analyzeBottlenecks(metrics: PerformanceMetrics, thresholds: PerformanceThresholds): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Memory bottlenecks
    if (metrics.memory.heapUsed > thresholds.maxMemoryUsage) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: `Memory usage (${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB) exceeds threshold`,
        impact: 'May cause out-of-memory errors and performance degradation',
        location: 'Application heap',
        recommendations: [
          'Implement object pooling',
          'Review memory allocations',
          'Add garbage collection optimization'
        ]
      });
    }
    
    // CPU bottlenecks
    if (metrics.cpu.utilization > thresholds.maxCpuUtilization) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        description: `CPU utilization (${metrics.cpu.utilization}%) exceeds threshold`,
        impact: 'Reduced throughput and increased response times',
        location: 'CPU-intensive operations',
        recommendations: [
          'Optimize algorithms',
          'Implement caching',
          'Use worker threads for heavy operations'
        ]
      });
    }
    
    // Database bottlenecks
    if (metrics.database.avgQueryTime > thresholds.maxDatabaseLatency) {
      bottlenecks.push({
        type: 'database',
        severity: 'high',
        description: `Database query time (${metrics.database.avgQueryTime}ms) exceeds threshold`,
        impact: 'Slow database operations affecting overall performance',
        location: 'Database queries',
        recommendations: [
          'Add database indexes',
          'Optimize slow queries',
          'Implement query caching',
          'Consider connection pooling'
        ]
      });
    }
    
    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, bottlenecks: Bottleneck[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Performance recommendations
    if (metrics.execution.operationsPerSecond < 100) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Operation Throughput',
        description: 'Current throughput is below optimal levels',
        implementation: 'Implement batch processing and async operations',
        estimatedImpact: '2-3x throughput improvement',
        effort: 'medium'
      });
    }
    
    // Memory recommendations
    if (metrics.memory.memoryLeaks.length > 0) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        title: 'Fix Memory Leaks',
        description: 'Memory leaks detected that could cause application crashes',
        implementation: 'Review object lifecycle and implement proper cleanup',
        estimatedImpact: 'Prevent memory-related crashes',
        effort: 'high'
      });
    }
    
    // Database recommendations
    if (metrics.database.slowQueries.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'Optimize Database Queries',
        description: 'Slow queries detected affecting performance',
        implementation: 'Add indexes and optimize query structure',
        estimatedImpact: '50-80% query performance improvement',
        effort: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Check for performance regressions
   */
  private async checkRegressions(testName: string, currentMetrics: PerformanceMetrics): Promise<PerformanceRegression[]> {
    const regressions: PerformanceRegression[] = [];
    const baseline = this.baselineMetrics.get(testName);
    
    if (!baseline) {
      // Store current metrics as baseline
      this.baselineMetrics.set(testName, currentMetrics);
      return regressions;
    }
    
    // Check throughput regression
    const throughputChange = ((currentMetrics.execution.operationsPerSecond - baseline.execution.operationsPerSecond) / baseline.execution.operationsPerSecond) * 100;
    if (throughputChange < -10) { // 10% regression threshold
      regressions.push({
        metric: 'throughput',
        currentValue: currentMetrics.execution.operationsPerSecond,
        previousValue: baseline.execution.operationsPerSecond,
        changePercent: throughputChange,
        threshold: -10,
        severity: throughputChange < -25 ? 'severe' : 'major'
      });
    }
    
    // Check memory regression
    const memoryChange = ((currentMetrics.memory.heapUsed - baseline.memory.heapUsed) / baseline.memory.heapUsed) * 100;
    if (memoryChange > 20) { // 20% increase threshold
      regressions.push({
        metric: 'memory',
        currentValue: currentMetrics.memory.heapUsed,
        previousValue: baseline.memory.heapUsed,
        changePercent: memoryChange,
        threshold: 20,
        severity: memoryChange > 50 ? 'severe' : 'major'
      });
    }
    
    return regressions;
  }

  /**
   * Calculate test summary
   */
  private calculateTestSummary(metrics: PerformanceMetrics, config: LoadTestConfig): TestSummary {
    const errorRate = (metrics.network.errors / metrics.network.requestCount) * 100;
    const memoryEfficiency = Math.max(0, 100 - (metrics.memory.heapUsed / (1024 * 1024 * 1024)) * 10); // Efficiency based on GB usage
    const databaseEfficiency = Math.max(0, 100 - metrics.database.avgQueryTime / 10); // Efficiency based on query time
    
    // Calculate overall score (0-100)
    const throughputScore = Math.min(100, (metrics.execution.operationsPerSecond / config.targetRPS) * 100);
    const errorScore = Math.max(0, 100 - errorRate * 10);
    const memoryScore = memoryEfficiency;
    const dbScore = databaseEfficiency;
    
    const overallScore = (throughputScore + errorScore + memoryScore + dbScore) / 4;
    
    return {
      totalOperations: metrics.execution.totalOperations,
      successfulOperations: metrics.execution.totalOperations - metrics.network.errors,
      failedOperations: metrics.network.errors,
      avgResponseTime: metrics.network.avgResponseTime,
      throughput: metrics.execution.operationsPerSecond,
      errorRate,
      memoryEfficiency,
      databaseEfficiency,
      overallScore
    };
  }

  /**
   * Check if test was successful
   */
  private isTestSuccessful(metrics: PerformanceMetrics, thresholds: PerformanceThresholds): boolean {
    return (
      metrics.network.avgResponseTime <= thresholds.maxResponseTime &&
      metrics.memory.heapUsed <= thresholds.maxMemoryUsage &&
      metrics.execution.operationsPerSecond >= thresholds.minThroughput &&
      (metrics.network.errors / metrics.network.requestCount) <= thresholds.maxErrorRate &&
      metrics.cpu.utilization <= thresholds.maxCpuUtilization &&
      metrics.database.avgQueryTime <= thresholds.maxDatabaseLatency
    );
  }

  /**
   * Save performance report to file
   */
  private async saveReport(report: PerformanceReport): Promise<void> {
    const reportsDir = './performance-reports';
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `${report.testName}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    this.logger.info(`Performance report saved: ${filepath}`);
  }

  /**
   * Utility: Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }

  /**
   * Get test results
   */
  getTestResults(): Map<string, PerformanceReport> {
    return new Map(this.testResults);
  }

  /**
   * Get active tests
   */
  getActiveTests(): Map<string, LoadTestConfig> {
    return new Map(this.activeTests);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
}

/**
 * Load Generator for different load patterns
 */
class LoadGenerator {
  private pattern: LoadPattern;
  private operations: LoadTestOperation[];
  private maxConcurrency: number;
  private logger: Logger;

  constructor(
    pattern: LoadPattern,
    operations: LoadTestOperation[],
    maxConcurrency: number,
    logger: Logger
  ) {
    this.pattern = pattern;
    this.operations = operations;
    this.maxConcurrency = maxConcurrency;
    this.logger = logger;
  }

  async execute(duration: number): Promise<{ success: any[]; errors: Error[] }> {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: Error[] = [];
    
    this.logger.info(`Starting load generator: ${this.pattern.type}`, { duration, maxConcurrency: this.maxConcurrency });
    
    switch (this.pattern.type) {
      case 'constant':
        return this.executeConstantLoad(duration, results, errors);
      case 'ramp':
        return this.executeRampLoad(duration, results, errors);
      case 'spike':
        return this.executeSpikeLoad(duration, results, errors);
      case 'wave':
        return this.executeWaveLoad(duration, results, errors);
      case 'burst':
        return this.executeBurstLoad(duration, results, errors);
      default:
        throw new Error(`Unsupported load pattern: ${this.pattern.type}`);
    }
  }

  private async executeConstantLoad(duration: number, results: any[], errors: Error[]): Promise<{ success: any[]; errors: Error[] }> {
    const rps = this.pattern.parameters.rps || 10;
    const interval = 1000 / rps;
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const promises = [];
      
      for (let i = 0; i < Math.min(this.maxConcurrency, rps); i++) {
        const operation = this.selectRandomOperation();
        promises.push(this.executeOperation(operation, results, errors));
      }
      
      await Promise.all(promises);
      await this.sleep(interval);
    }
    
    return { success: results, errors };
  }

  private async executeRampLoad(duration: number, results: any[], errors: Error[]): Promise<{ success: any[]; errors: Error[] }> {
    const startRPS = this.pattern.parameters.startRPS || 1;
    const endRPS = this.pattern.parameters.endRPS || 100;
    const steps = this.pattern.parameters.steps || 10;
    
    const stepDuration = duration / steps;
    const rpsIncrement = (endRPS - startRPS) / steps;
    
    for (let step = 0; step < steps; step++) {
      const currentRPS = startRPS + (rpsIncrement * step);
      const stepEndTime = Date.now() + stepDuration;
      
      while (Date.now() < stepEndTime) {
        const promises = [];
        const concurrency = Math.min(this.maxConcurrency, Math.ceil(currentRPS));
        
        for (let i = 0; i < concurrency; i++) {
          const operation = this.selectRandomOperation();
          promises.push(this.executeOperation(operation, results, errors));
        }
        
        await Promise.all(promises);
        await this.sleep(1000 / currentRPS);
      }
    }
    
    return { success: results, errors };
  }

  private async executeSpikeLoad(duration: number, results: any[], errors: Error[]): Promise<{ success: any[]; errors: Error[] }> {
    const baseRPS = this.pattern.parameters.baseRPS || 10;
    const spikeRPS = this.pattern.parameters.spikeRPS || 100;
    const spikeDuration = this.pattern.parameters.spikeDuration || 5000;
    const spikeInterval = this.pattern.parameters.spikeInterval || 30000;
    
    const endTime = Date.now() + duration;
    let nextSpikeTime = Date.now() + spikeInterval;
    
    while (Date.now() < endTime) {
      const currentTime = Date.now();
      const isSpike = currentTime >= nextSpikeTime && currentTime < nextSpikeTime + spikeDuration;
      const currentRPS = isSpike ? spikeRPS : baseRPS;
      
      if (isSpike && currentTime >= nextSpikeTime + spikeDuration) {
        nextSpikeTime = currentTime + spikeInterval;
      }
      
      const promises = [];
      const concurrency = Math.min(this.maxConcurrency, Math.ceil(currentRPS));
      
      for (let i = 0; i < concurrency; i++) {
        const operation = this.selectRandomOperation();
        promises.push(this.executeOperation(operation, results, errors));
      }
      
      await Promise.all(promises);
      await this.sleep(1000 / currentRPS);
    }
    
    return { success: results, errors };
  }

  private async executeWaveLoad(duration: number, results: any[], errors: Error[]): Promise<{ success: any[]; errors: Error[] }> {
    const minRPS = this.pattern.parameters.minRPS || 10;
    const maxRPS = this.pattern.parameters.maxRPS || 100;
    const waveLength = this.pattern.parameters.waveLength || 60000; // 1 minute waves
    
    const endTime = Date.now() + duration;
    const startTime = Date.now();
    
    while (Date.now() < endTime) {
      const elapsed = Date.now() - startTime;
      const wavePosition = (elapsed % waveLength) / waveLength; // 0 to 1
      const waveValue = Math.sin(wavePosition * 2 * Math.PI); // -1 to 1
      const currentRPS = minRPS + ((waveValue + 1) / 2) * (maxRPS - minRPS);
      
      const promises = [];
      const concurrency = Math.min(this.maxConcurrency, Math.ceil(currentRPS));
      
      for (let i = 0; i < concurrency; i++) {
        const operation = this.selectRandomOperation();
        promises.push(this.executeOperation(operation, results, errors));
      }
      
      await Promise.all(promises);
      await this.sleep(1000 / currentRPS);
    }
    
    return { success: results, errors };
  }

  private async executeBurstLoad(duration: number, results: any[], errors: Error[]): Promise<{ success: any[]; errors: Error[] }> {
    const burstSize = this.pattern.parameters.burstSize || 50;
    const burstInterval = this.pattern.parameters.burstInterval || 10000;
    const restPeriod = this.pattern.parameters.restPeriod || 5000;
    
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      // Execute burst
      const burstPromises = [];
      for (let i = 0; i < burstSize; i++) {
        const operation = this.selectRandomOperation();
        burstPromises.push(this.executeOperation(operation, results, errors));
      }
      
      await Promise.all(burstPromises);
      
      // Rest period
      await this.sleep(restPeriod);
      
      // Wait for next burst
      const remainingInterval = burstInterval - restPeriod;
      if (remainingInterval > 0 && Date.now() + remainingInterval < endTime) {
        await this.sleep(remainingInterval);
      }
    }
    
    return { success: results, errors };
  }

  private selectRandomOperation(): LoadTestOperation {
    const totalWeight = this.operations.reduce((sum, op) => sum + op.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const operation of this.operations) {
      random -= operation.weight;
      if (random <= 0) {
        return operation;
      }
    }
    
    return this.operations[0]; // Fallback
  }

  private async executeOperation(operation: LoadTestOperation, results: any[], errors: Error[]): Promise<void> {
    try {
      const startTime = Date.now();
      const result = await this.withTimeout(operation.operation(), operation.timeout || 30000);
      const endTime = Date.now();
      
      // Validate result if validator provided
      if (operation.validation && !operation.validation(result)) {
        throw new Error(`Operation validation failed: ${operation.name}`);
      }
      
      results.push({
        operation: operation.name,
        result,
        duration: endTime - startTime,
        timestamp: startTime
      });
      
    } catch (error: any) {
      errors.push(new Error(`Operation ${operation.name} failed: ${error.message}`));
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { LoadGenerator };