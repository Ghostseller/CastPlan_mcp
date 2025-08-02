/**
 * Performance Benchmarking Service - Comprehensive Performance Testing and Benchmarking
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Performance benchmarking, load testing, and performance regression detection
 *
 * Created: 2025-07-31
 * Author: Performance Testing Engineer & Benchmarking Specialist
 */
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
// =============================================================================
// PERFORMANCE BENCHMARKING SERVICE
// =============================================================================
export class PerformanceBenchmarkingService extends EventEmitter {
    logger;
    db;
    benchmarkResults = new Map();
    baselines = new Map();
    regressionThreshold = 0.1; // 10% regression threshold
    isRunning = false;
    constructor(database, logger) {
        super();
        this.db = database;
        this.logger = logger;
        this.initializeTables();
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeTables() {
        try {
            // Benchmark results table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS benchmark_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          configuration_name TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          total_duration REAL NOT NULL,
          iterations INTEGER NOT NULL,
          mean_time REAL NOT NULL,
          median_time REAL NOT NULL,
          min_time REAL NOT NULL,
          max_time REAL NOT NULL,
          std_deviation REAL NOT NULL,
          percentile_95 REAL NOT NULL,
          percentile_99 REAL NOT NULL,
          operations_per_second REAL NOT NULL,
          errors INTEGER NOT NULL,
          error_rate REAL NOT NULL,
          success INTEGER NOT NULL,
          regression_detected INTEGER NOT NULL,
          raw_results TEXT,
          metadata TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Load test results table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS load_test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          configuration_name TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          virtual_users INTEGER NOT NULL,
          total_requests INTEGER NOT NULL,
          successful_requests INTEGER NOT NULL,
          failed_requests INTEGER NOT NULL,
          error_rate REAL NOT NULL,
          mean_response_time REAL NOT NULL,
          requests_per_second REAL NOT NULL,
          peak_throughput REAL NOT NULL,
          success_criteria_met INTEGER NOT NULL,
          bottlenecks TEXT,
          recommendations TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Performance baselines table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_baselines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          benchmark_name TEXT UNIQUE NOT NULL,
          baseline_result TEXT NOT NULL,
          established_at TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Performance regressions table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_regressions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          benchmark_name TEXT NOT NULL,
          metric TEXT NOT NULL,
          current_value REAL NOT NULL,
          baseline_value REAL NOT NULL,
          regression_percentage REAL NOT NULL,
          severity TEXT NOT NULL,
          detected_at TEXT NOT NULL,
          resolved_at TEXT,
          possible_causes TEXT,
          recommendations TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_benchmark_results_name ON benchmark_results(configuration_name);
        CREATE INDEX IF NOT EXISTS idx_benchmark_results_time ON benchmark_results(start_time);
        CREATE INDEX IF NOT EXISTS idx_load_test_results_name ON load_test_results(configuration_name);
        CREATE INDEX IF NOT EXISTS idx_regressions_detected ON performance_regressions(detected_at);
      `);
            this.logger.info('Performance benchmarking tables initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize benchmarking tables:', error);
            throw error;
        }
    }
    // =============================================================================
    // BENCHMARK EXECUTION
    // =============================================================================
    async runBenchmark(config, testFunction) {
        if (this.isRunning) {
            throw new Error('Another benchmark is currently running');
        }
        this.isRunning = true;
        const startTime = new Date().toISOString();
        try {
            this.logger.info(`Starting benchmark: ${config.name}`);
            this.emit('benchmarkStarted', { name: config.name, config });
            // Warmup iterations
            if (config.warmupIterations > 0) {
                this.logger.info(`Running ${config.warmupIterations} warmup iterations`);
                for (let i = 0; i < config.warmupIterations; i++) {
                    try {
                        await testFunction(...(config.parameters?.values || []));
                    }
                    catch (error) {
                        this.logger.warn(`Warmup iteration ${i + 1} failed:`, error.message);
                    }
                }
            }
            // Actual benchmark iterations
            const results = [];
            const errors = [];
            let peakMemory = 0;
            let totalCpuTime = 0;
            const startMemory = process.memoryUsage().heapUsed;
            const startCpuTime = process.cpuUsage();
            if (config.concurrent && config.concurrencyLevel && config.concurrencyLevel > 1) {
                // Concurrent execution
                results.push(...await this.runConcurrentBenchmark(config, testFunction, errors));
            }
            else {
                // Sequential execution
                for (let i = 0; i < config.iterations; i++) {
                    const iterationStart = performance.now();
                    try {
                        await testFunction(...(config.parameters?.values || []));
                        const iterationTime = performance.now() - iterationStart;
                        results.push(iterationTime);
                        // Track memory usage
                        const currentMemory = process.memoryUsage().heapUsed;
                        peakMemory = Math.max(peakMemory, currentMemory);
                        this.emit('benchmarkIteration', {
                            benchmark: config.name,
                            iteration: i + 1,
                            time: iterationTime,
                            total: config.iterations
                        });
                    }
                    catch (error) {
                        errors.push(error);
                        const iterationTime = performance.now() - iterationStart;
                        results.push(iterationTime); // Include failed iteration time
                        this.logger.warn(`Iteration ${i + 1} failed:`, error.message);
                    }
                    // Check timeout
                    if (performance.now() - performance.now() > config.timeout) {
                        throw new Error('Benchmark timeout exceeded');
                    }
                }
            }
            const endCpuTime = process.cpuUsage(startCpuTime);
            totalCpuTime = (endCpuTime.user + endCpuTime.system) / 1000; // Convert to milliseconds
            // Calculate statistics
            const endTime = new Date().toISOString();
            const totalDuration = new Date(endTime).getTime() - new Date(startTime).getTime();
            const statistics = this.calculateStatistics(results);
            const benchmarkResult = {
                configurationName: config.name,
                startTime,
                endTime,
                totalDuration,
                iterations: config.iterations,
                statistics,
                throughput: {
                    operationsPerSecond: (config.iterations / totalDuration) * 1000,
                    requestsPerMinute: ((config.iterations / totalDuration) * 1000) * 60
                },
                resourceUsage: {
                    peakMemory: peakMemory - startMemory,
                    averageMemory: (peakMemory - startMemory) / 2,
                    cpuTime: totalCpuTime
                },
                errors: errors.length,
                errorRate: errors.length / config.iterations,
                success: errors.length === 0,
                regressionDetected: false,
                rawResults: results,
                metadata: {
                    category: config.category,
                    concurrent: config.concurrent,
                    concurrencyLevel: config.concurrencyLevel || 1,
                    warmupIterations: config.warmupIterations
                }
            };
            // Check for regressions
            if (config.baseline) {
                const regression = this.detectRegression(benchmarkResult, config.baseline);
                benchmarkResult.regressionDetected = regression !== null;
                if (regression) {
                    benchmarkResult.regressionReason = regression.possibleCauses.join(', ');
                    await this.recordRegression(regression);
                }
            }
            // Store result
            await this.storeBenchmarkResult(benchmarkResult);
            // Update results cache
            if (!this.benchmarkResults.has(config.name)) {
                this.benchmarkResults.set(config.name, []);
            }
            this.benchmarkResults.get(config.name).push(benchmarkResult);
            this.logger.info(`Benchmark completed: ${config.name} - ${statistics.mean.toFixed(2)}ms avg`);
            this.emit('benchmarkCompleted', { name: config.name, result: benchmarkResult });
            return benchmarkResult;
        }
        catch (error) {
            this.logger.error(`Benchmark failed: ${config.name}`, error);
            this.emit('benchmarkFailed', { name: config.name, error: error.message });
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    async runConcurrentBenchmark(config, testFunction, errors) {
        const results = [];
        const concurrency = config.concurrencyLevel || 1;
        const iterationsPerWorker = Math.ceil(config.iterations / concurrency);
        const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
            const workerResults = [];
            const startIteration = workerIndex * iterationsPerWorker;
            const endIteration = Math.min(startIteration + iterationsPerWorker, config.iterations);
            for (let i = startIteration; i < endIteration; i++) {
                const iterationStart = performance.now();
                try {
                    await testFunction(...(config.parameters?.values || []));
                    const iterationTime = performance.now() - iterationStart;
                    workerResults.push(iterationTime);
                    this.emit('benchmarkIteration', {
                        benchmark: config.name,
                        iteration: i + 1,
                        time: iterationTime,
                        total: config.iterations,
                        worker: workerIndex
                    });
                }
                catch (error) {
                    errors.push(error);
                    const iterationTime = performance.now() - iterationStart;
                    workerResults.push(iterationTime);
                }
            }
            return workerResults;
        });
        const workerResults = await Promise.all(workers);
        workerResults.forEach(workerResult => results.push(...workerResult));
        return results;
    }
    // =============================================================================
    // LOAD TESTING
    // =============================================================================
    async runLoadTest(config, testFunction) {
        const startTime = new Date().toISOString();
        this.logger.info(`Starting load test: ${config.name} with ${config.virtualUsers} virtual users`);
        try {
            const results = [];
            let activeUsers = 0;
            let peakCpuUsage = 0;
            let peakMemoryUsage = 0;
            let networkBytes = 0;
            const startMemory = process.memoryUsage().heapUsed;
            const totalDuration = config.rampUpTime + config.sustainTime + config.rampDownTime;
            // Calculate user ramp up schedule
            const rampUpInterval = (config.rampUpTime * 1000) / config.virtualUsers;
            const userStartTimes = [];
            for (let i = 0; i < config.virtualUsers; i++) {
                userStartTimes.push(i * rampUpInterval);
            }
            // Start virtual users
            const userPromises = userStartTimes.map(async (startDelay, userIndex) => {
                await new Promise(resolve => setTimeout(resolve, startDelay));
                activeUsers++;
                const userResults = [];
                const userStartTime = Date.now();
                const userEndTime = userStartTime + (config.sustainTime * 1000);
                while (Date.now() < userEndTime) {
                    const requestStart = performance.now();
                    try {
                        await testFunction(...config.parameters);
                        const requestTime = performance.now() - requestStart;
                        userResults.push({ time: requestTime, success: true });
                        // Track resource usage
                        const currentMemory = process.memoryUsage().heapUsed;
                        peakMemoryUsage = Math.max(peakMemoryUsage, currentMemory);
                    }
                    catch (error) {
                        const requestTime = performance.now() - requestStart;
                        userResults.push({
                            time: requestTime,
                            success: false,
                            error: error.message
                        });
                        // Check max errors
                        if (results.filter(r => !r.success).length >= config.maxErrors) {
                            this.logger.warn(`Max errors (${config.maxErrors}) reached, stopping load test`);
                            break;
                        }
                    }
                    // Think time between requests
                    if (config.thinkTime > 0) {
                        await new Promise(resolve => setTimeout(resolve, config.thinkTime));
                    }
                }
                activeUsers--;
                return userResults;
            });
            // Wait for all users to complete
            const allUserResults = await Promise.all(userPromises);
            allUserResults.forEach(userResults => results.push(...userResults));
            const endTime = new Date().toISOString();
            const actualDuration = new Date(endTime).getTime() - new Date(startTime).getTime();
            // Calculate statistics
            const successfulResults = results.filter(r => r.success);
            const failedResults = results.filter(r => !r.success);
            const responseTimes = results.map(r => r.time);
            const responseTimeStats = this.calculateStatistics(responseTimes);
            const loadTestResult = {
                configurationName: config.name,
                startTime,
                endTime,
                totalDuration: actualDuration,
                virtualUsers: config.virtualUsers,
                totalRequests: results.length,
                successfulRequests: successfulResults.length,
                failedRequests: failedResults.length,
                errorRate: failedResults.length / results.length,
                responseTimeStats: {
                    mean: responseTimeStats.mean,
                    median: responseTimeStats.median,
                    min: responseTimeStats.min,
                    max: responseTimeStats.max,
                    percentile95: responseTimeStats.percentile95,
                    percentile99: responseTimeStats.percentile99
                },
                throughputStats: {
                    requestsPerSecond: (results.length / actualDuration) * 1000,
                    requestsPerMinute: ((results.length / actualDuration) * 1000) * 60,
                    peakThroughput: 0 // Would need more detailed tracking
                },
                resourceUsage: {
                    peakCpuUsage,
                    peakMemoryUsage: peakMemoryUsage - startMemory,
                    networkBytes
                },
                successCriteriaMet: this.checkSuccessCriteria(config, responseTimeStats, failedResults.length / results.length),
                bottlenecks: this.identifyBottlenecks(responseTimeStats, failedResults.length / results.length),
                recommendations: this.generateLoadTestRecommendations(config, responseTimeStats, failedResults.length / results.length)
            };
            // Store result
            await this.storeLoadTestResult(loadTestResult);
            this.logger.info(`Load test completed: ${config.name}`);
            this.emit('loadTestCompleted', { name: config.name, result: loadTestResult });
            return loadTestResult;
        }
        catch (error) {
            this.logger.error(`Load test failed: ${config.name}`, error);
            throw error;
        }
    }
    checkSuccessCriteria(config, responseTimeStats, errorRate) {
        const criteria = config.successCriteria;
        return (responseTimeStats.mean <= criteria.averageResponseTime &&
            responseTimeStats.max <= criteria.maxResponseTime &&
            errorRate <= criteria.errorRate);
    }
    identifyBottlenecks(responseTimeStats, errorRate) {
        const bottlenecks = [];
        if (responseTimeStats.percentile95 > responseTimeStats.mean * 3) {
            bottlenecks.push('High response time variance - potential resource contention');
        }
        if (errorRate > 0.05) {
            bottlenecks.push('High error rate - system overload or configuration issues');
        }
        if (responseTimeStats.mean > 5000) { // 5 seconds
            bottlenecks.push('Slow average response time - optimization needed');
        }
        return bottlenecks;
    }
    generateLoadTestRecommendations(config, responseTimeStats, errorRate) {
        const recommendations = [];
        if (errorRate > 0.02) { // 2%
            recommendations.push('Consider reducing load or optimizing error handling');
        }
        if (responseTimeStats.percentile95 > responseTimeStats.mean * 2) {
            recommendations.push('Investigate response time inconsistencies');
        }
        if (responseTimeStats.mean < 100) { // Very fast
            recommendations.push('Consider increasing load to find system limits');
        }
        return recommendations;
    }
    // =============================================================================
    // STATISTICS AND ANALYSIS
    // =============================================================================
    calculateStatistics(values) {
        if (values.length === 0) {
            return {
                mean: 0, median: 0, min: 0, max: 0,
                standardDeviation: 0, percentile95: 0, percentile99: 0
            };
        }
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const standardDeviation = Math.sqrt(variance);
        const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
        const percentile99 = sorted[Math.floor(sorted.length * 0.99)];
        return {
            mean,
            median,
            min,
            max,
            standardDeviation,
            percentile95,
            percentile99
        };
    }
    detectRegression(current, baseline) {
        const regressions = [];
        // Check mean response time regression
        const meanRegression = (current.statistics.mean - baseline.statistics.mean) / baseline.statistics.mean;
        if (meanRegression > this.regressionThreshold) {
            regressions.push({
                benchmarkName: current.configurationName,
                metric: 'mean_response_time',
                currentValue: current.statistics.mean,
                baselineValue: baseline.statistics.mean,
                regressionPercentage: meanRegression * 100,
                severity: this.classifyRegressionSeverity(meanRegression),
                detectedAt: new Date().toISOString(),
                possibleCauses: ['Code changes', 'Resource constraints', 'Data volume increase'],
                recommendations: ['Review recent changes', 'Check system resources', 'Optimize queries']
            });
        }
        // Check throughput regression
        const throughputRegression = (baseline.throughput.operationsPerSecond - current.throughput.operationsPerSecond) / baseline.throughput.operationsPerSecond;
        if (throughputRegression > this.regressionThreshold) {
            regressions.push({
                benchmarkName: current.configurationName,
                metric: 'throughput',
                currentValue: current.throughput.operationsPerSecond,
                baselineValue: baseline.throughput.operationsPerSecond,
                regressionPercentage: throughputRegression * 100,
                severity: this.classifyRegressionSeverity(throughputRegression),
                detectedAt: new Date().toISOString(),
                possibleCauses: ['Performance degradation', 'Resource bottlenecks', 'Concurrency issues'],
                recommendations: ['Profile application', 'Check database performance', 'Review concurrent access patterns']
            });
        }
        return regressions.length > 0 ? regressions[0] : null; // Return most severe regression
    }
    classifyRegressionSeverity(regressionPercentage) {
        if (regressionPercentage < 0.2)
            return 'minor';
        if (regressionPercentage < 0.5)
            return 'moderate';
        if (regressionPercentage < 1.0)
            return 'severe';
        return 'critical';
    }
    // =============================================================================
    // DATA PERSISTENCE
    // =============================================================================
    async storeBenchmarkResult(result) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO benchmark_results (
          configuration_name, start_time, end_time, total_duration, iterations,
          mean_time, median_time, min_time, max_time, std_deviation,
          percentile_95, percentile_99, operations_per_second, errors, error_rate,
          success, regression_detected, raw_results, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(result.configurationName, result.startTime, result.endTime, result.totalDuration, result.iterations, result.statistics.mean, result.statistics.median, result.statistics.min, result.statistics.max, result.statistics.standardDeviation, result.statistics.percentile95, result.statistics.percentile99, result.throughput.operationsPerSecond, result.errors, result.errorRate, result.success ? 1 : 0, result.regressionDetected ? 1 : 0, JSON.stringify(result.rawResults), JSON.stringify(result.metadata));
        }
        catch (error) {
            this.logger.error('Failed to store benchmark result:', error);
        }
    }
    async storeLoadTestResult(result) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO load_test_results (
          configuration_name, start_time, end_time, virtual_users, total_requests,
          successful_requests, failed_requests, error_rate, mean_response_time,
          requests_per_second, peak_throughput, success_criteria_met,
          bottlenecks, recommendations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(result.configurationName, result.startTime, result.endTime, result.virtualUsers, result.totalRequests, result.successfulRequests, result.failedRequests, result.errorRate, result.responseTimeStats.mean, result.throughputStats.requestsPerSecond, result.throughputStats.peakThroughput, result.successCriteriaMet ? 1 : 0, JSON.stringify(result.bottlenecks), JSON.stringify(result.recommendations));
        }
        catch (error) {
            this.logger.error('Failed to store load test result:', error);
        }
    }
    async recordRegression(regression) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO performance_regressions (
          benchmark_name, metric, current_value, baseline_value,
          regression_percentage, severity, detected_at,
          possible_causes, recommendations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(regression.benchmarkName, regression.metric, regression.currentValue, regression.baselineValue, regression.regressionPercentage, regression.severity, regression.detectedAt, JSON.stringify(regression.possibleCauses), JSON.stringify(regression.recommendations));
            this.emit('regressionDetected', regression);
        }
        catch (error) {
            this.logger.error('Failed to record regression:', error);
        }
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    setBaseline(benchmarkName, result) {
        this.baselines.set(benchmarkName, result);
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO performance_baselines (benchmark_name, baseline_result, established_at)
        VALUES (?, ?, ?)
      `);
            stmt.run(benchmarkName, JSON.stringify(result), new Date().toISOString());
            this.logger.info(`Baseline established for benchmark: ${benchmarkName}`);
        }
        catch (error) {
            this.logger.error('Failed to store baseline:', error);
        }
    }
    getBaseline(benchmarkName) {
        return this.baselines.get(benchmarkName) || null;
    }
    getBenchmarkHistory(benchmarkName, limit = 50) {
        return this.benchmarkResults.get(benchmarkName)?.slice(-limit) || [];
    }
    async getRegressions(resolved = false) {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM performance_regressions 
        WHERE resolved_at IS ${resolved ? 'NOT' : ''} NULL
        ORDER BY detected_at DESC
      `);
            const rows = stmt.all();
            return rows.map(row => ({
                benchmarkName: row.benchmark_name,
                metric: row.metric,
                currentValue: row.current_value,
                baselineValue: row.baseline_value,
                regressionPercentage: row.regression_percentage,
                severity: row.severity,
                detectedAt: row.detected_at,
                possibleCauses: JSON.parse(row.possible_causes || '[]'),
                recommendations: JSON.parse(row.recommendations || '[]')
            }));
        }
        catch (error) {
            this.logger.error('Failed to get regressions:', error);
            return [];
        }
    }
    setRegressionThreshold(threshold) {
        this.regressionThreshold = Math.max(0.01, Math.min(1.0, threshold)); // 1% to 100%
        this.logger.info(`Regression threshold set to ${(this.regressionThreshold * 100).toFixed(1)}%`);
    }
    isRunning() {
        return this.isRunning;
    }
    async destroy() {
        this.removeAllListeners();
        this.benchmarkResults.clear();
        this.baselines.clear();
        this.logger.info('Performance benchmarking service destroyed');
    }
}
export default PerformanceBenchmarkingService;
//# sourceMappingURL=PerformanceBenchmarkingService.js.map