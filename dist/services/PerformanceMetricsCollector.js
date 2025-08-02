/**
 * Performance Metrics Collector - Detailed Performance Analysis and Benchmarking
 *
 * CastPlan MCP Phase 3: 비동기 처리 및 모니터링 시스템
 * 세부적인 성능 메트릭 수집, 벤치마킹, 성능 분석
 *
 * Created: 2025-07-31
 * Author: Performance Engineer
 */
import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import { getErrorMessage } from '../utils/typeHelpers.ts';
// =============================================================================
// PERFORMANCE METRICS COLLECTOR
// =============================================================================
export class PerformanceMetricsCollector extends EventEmitter {
    logger;
    cacheService;
    config;
    isRunning = false;
    // Metric storage
    metrics = new Map();
    timers = new Map();
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    // Performance tracking
    activeProfiles = new Map();
    performanceObserver = null;
    gcStats = { count: 0, time: 0 };
    // Redis keys
    METRICS_PREFIX = 'performance:';
    TIMERS_KEY = 'timers';
    COUNTERS_KEY = 'counters';
    GAUGES_KEY = 'gauges';
    HISTOGRAMS_KEY = 'histograms';
    BENCHMARKS_KEY = 'benchmarks';
    PROFILES_KEY = 'profiles';
    // Built-in benchmarks
    BENCHMARK_OPERATIONS = {
        'array-sort': (size) => {
            const arr = Array.from({ length: size }, () => Math.random());
            return () => arr.sort((a, b) => a - b);
        },
        'object-creation': (count) => {
            return () => {
                for (let i = 0; i < count; i++) {
                    const obj = { id: i, name: `item-${i}`, timestamp: Date.now() };
                }
            };
        },
        'json-parse': (data) => {
            return () => JSON.parse(data);
        },
        'regex-match': (text, pattern) => {
            return () => pattern.test(text);
        },
        'async-timeout': (delay) => {
            return () => new Promise(resolve => setTimeout(resolve, delay));
        }
    };
    constructor(logger, cacheService, config = {}) {
        super();
        this.logger = logger;
        this.cacheService = cacheService;
        this.config = {
            enabled: true,
            samplingRate: 1.0, // Collect all metrics by default
            maxSamples: 10000,
            retentionPeriod: 7, // 7 days
            benchmarkEnabled: true,
            profilingEnabled: true,
            collectSystemMetrics: true,
            collectMemoryMetrics: true,
            collectGCMetrics: true,
            thresholds: {
                slowOperationMs: 1000, // 1 second
                highMemoryMB: 500, // 500 MB
                highCpuPercent: 80 // 80%
            },
            ...config
        };
        this.setupPerformanceObserver();
        this.setupGCMonitoring();
    }
    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================
    /**
     * Start performance metrics collection
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('PerformanceMetricsCollector is already running');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('PerformanceMetricsCollector is disabled');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting PerformanceMetricsCollector...');
        // Start periodic metric collection
        this.startPeriodicCollection();
        // Start performance observer
        if (this.performanceObserver) {
            this.performanceObserver.observe({ type: 'measure' });
            this.performanceObserver.observe({ type: 'mark' });
        }
        this.emit('started');
        this.logger.info('✅ PerformanceMetricsCollector started successfully');
    }
    /**
     * Stop performance metrics collection
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.logger.info('Stopping PerformanceMetricsCollector...');
        // Stop performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        // Save remaining metrics
        await this.flushMetrics();
        this.emit('stopped');
        this.logger.info('✅ PerformanceMetricsCollector stopped');
    }
    // =============================================================================
    // METRIC COLLECTION API
    // =============================================================================
    /**
     * Start a timer metric
     */
    startTimer(name, labels) {
        const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();
        this.timers.set(id, startTime);
        // Create performance mark
        performance.mark(`${name}-start-${id}`);
        return id;
    }
    /**
     * End a timer metric
     */
    endTimer(id, labels) {
        const startTime = this.timers.get(id);
        if (!startTime) {
            this.logger.warn(`Timer not found: ${id}`);
            return null;
        }
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.timers.delete(id);
        // Extract name from ID
        const name = id.split('-')[0];
        // Create performance mark and measure
        performance.mark(`${name}-end-${id}`);
        performance.measure(`${name}-${id}`, `${name}-start-${id}`, `${name}-end-${id}`);
        const metric = {
            id,
            name,
            type: 'timer',
            value: duration,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            startTime,
            endTime,
            duration,
            labels,
            metadata: {
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        this.metrics.set(id, metric);
        this.checkThresholds(metric);
        this.emit('metric', metric);
        return metric;
    }
    /**
     * Record a gauge metric
     */
    recordGauge(name, value, labels) {
        if (!this.gauges.has(name)) {
            this.gauges.set(name, []);
        }
        const values = this.gauges.get(name);
        values.push(value);
        // Keep only recent values
        if (values.length > this.config.maxSamples) {
            values.splice(0, values.length - this.config.maxSamples);
        }
        const metric = {
            id: `${name}-${Date.now()}`,
            name,
            type: 'gauge',
            value,
            unit: 'value',
            timestamp: new Date().toISOString(),
            current: value,
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            labels
        };
        this.metrics.set(metric.id, metric);
        this.emit('metric', metric);
        return metric;
    }
    /**
     * Increment a counter metric
     */
    incrementCounter(name, delta = 1, labels) {
        const current = this.counters.get(name) || 0;
        const newValue = current + delta;
        this.counters.set(name, newValue);
        const metric = {
            id: `${name}-${Date.now()}`,
            name,
            type: 'counter',
            value: newValue,
            unit: 'count',
            timestamp: new Date().toISOString(),
            count: newValue,
            labels
        };
        this.metrics.set(metric.id, metric);
        this.emit('metric', metric);
        return metric;
    }
    /**
     * Record a histogram metric
     */
    recordHistogram(name, value, labels) {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, []);
        }
        const values = this.histograms.get(name);
        values.push(value);
        // Keep only recent values
        if (values.length > this.config.maxSamples) {
            values.splice(0, values.length - this.config.maxSamples);
        }
        const sortedValues = values.slice().sort((a, b) => a - b);
        const metric = {
            id: `${name}-${Date.now()}`,
            name,
            type: 'histogram',
            value,
            unit: 'value',
            timestamp: new Date().toISOString(),
            buckets: this.createHistogramBuckets(sortedValues),
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            percentiles: {
                p50: this.getPercentile(sortedValues, 50),
                p90: this.getPercentile(sortedValues, 90),
                p95: this.getPercentile(sortedValues, 95),
                p99: this.getPercentile(sortedValues, 99),
                p999: this.getPercentile(sortedValues, 99.9)
            },
            labels
        };
        this.metrics.set(metric.id, metric);
        this.emit('metric', metric);
        return metric;
    }
    // =============================================================================
    // PERFORMANCE PROFILING
    // =============================================================================
    /**
     * Start a performance profile
     */
    startProfile(name) {
        if (!this.config.profilingEnabled) {
            this.logger.warn('Performance profiling is disabled');
            return '';
        }
        const id = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const profile = {
            id,
            name,
            startTime: new Date().toISOString(),
            endTime: '',
            duration: 0,
            samples: [],
            hotspots: [],
            memoryProfile: this.captureMemoryProfile(),
            summary: {
                totalOperations: 0,
                averageLatency: 0,
                throughput: 0,
                errorRate: 0
            }
        };
        this.activeProfiles.set(id, profile);
        performance.mark(`profile-start-${id}`);
        this.logger.info(`Started performance profile: ${name} (${id})`);
        return id;
    }
    /**
     * End a performance profile
     */
    async endProfile(id) {
        const profile = this.activeProfiles.get(id);
        if (!profile) {
            this.logger.warn(`Profile not found: ${id}`);
            return null;
        }
        performance.mark(`profile-end-${id}`);
        performance.measure(`profile-${id}`, `profile-start-${id}`, `profile-end-${id}`);
        const endTime = new Date();
        const startTime = new Date(profile.startTime);
        profile.endTime = endTime.toISOString();
        profile.duration = endTime.getTime() - startTime.getTime();
        profile.memoryProfile = this.captureMemoryProfile();
        // Calculate summary statistics
        if (profile.samples.length > 0) {
            const durations = profile.samples.map(s => s.duration);
            profile.summary = {
                totalOperations: profile.samples.length,
                averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
                throughput: profile.samples.length / (profile.duration / 1000),
                errorRate: 0 // Would need to track errors
            };
        }
        // Store profile
        await this.storeProfile(profile);
        this.activeProfiles.delete(id);
        this.emit('profileCompleted', profile);
        this.logger.info(`Completed performance profile: ${profile.name} (${profile.duration}ms)`);
        return profile;
    }
    /**
     * Add a sample to an active profile
     */
    addProfileSample(profileId, operation, duration, labels) {
        const profile = this.activeProfiles.get(profileId);
        if (!profile) {
            return;
        }
        const sample = {
            timestamp: new Date().toISOString(),
            operation,
            duration,
            memoryUsed: process.memoryUsage().heapUsed,
            cpuUsage: 0, // Would need to calculate CPU usage
            labels
        };
        profile.samples.push(sample);
        // Keep only recent samples
        if (profile.samples.length > this.config.maxSamples) {
            profile.samples.splice(0, profile.samples.length - this.config.maxSamples);
        }
    }
    // =============================================================================
    // BENCHMARKING
    // =============================================================================
    /**
     * Run a benchmark
     */
    async runBenchmark(name, operation, iterations = 1000) {
        if (!this.config.benchmarkEnabled) {
            throw new Error('Benchmarking is disabled');
        }
        this.logger.info(`Running benchmark: ${name} (${iterations} iterations)`);
        const times = [];
        const startTime = performance.now();
        // Warmup
        for (let i = 0; i < Math.min(iterations / 10, 100); i++) {
            await operation();
        }
        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const iterationStart = performance.now();
            await operation();
            const iterationEnd = performance.now();
            times.push(iterationEnd - iterationStart);
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        // Calculate statistics
        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const variance = times.reduce((acc, time) => acc + Math.pow(time - averageTime, 2), 0) / times.length;
        const standardDeviation = Math.sqrt(variance);
        const throughput = iterations / (totalTime / 1000); // operations per second
        const benchmark = {
            id: `benchmark-${Date.now()}`,
            name,
            category: 'custom',
            operation: operation.toString().substring(0, 100),
            iterations,
            totalTime,
            averageTime,
            minTime,
            maxTime,
            standardDeviation,
            throughput,
            timestamp: new Date().toISOString(),
            environment: {
                cpuCores: require('os').cpus().length,
                memoryTotal: require('os').totalmem(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        await this.storeBenchmark(benchmark);
        this.emit('benchmarkCompleted', benchmark);
        this.logger.info(`Benchmark completed: ${name} - ${averageTime.toFixed(2)}ms avg, ${throughput.toFixed(0)} ops/sec`);
        return benchmark;
    }
    /**
     * Run built-in benchmarks
     */
    async runBuiltInBenchmarks() {
        const results = [];
        // Array sort benchmark
        results.push(await this.runBenchmark('Array Sort (10k numbers)', this.BENCHMARK_OPERATIONS['array-sort'](10000), 100));
        // Object creation benchmark
        results.push(await this.runBenchmark('Object Creation (1k objects)', this.BENCHMARK_OPERATIONS['object-creation'](1000), 100));
        // JSON parsing benchmark
        const jsonData = JSON.stringify({
            data: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` }))
        });
        results.push(await this.runBenchmark('JSON Parse (1k objects)', this.BENCHMARK_OPERATIONS['json-parse'](jsonData), 1000));
        // Regex matching benchmark
        const text = 'The quick brown fox jumps over the lazy dog';
        const pattern = /quick.*fox/;
        results.push(await this.runBenchmark('Regex Match', this.BENCHMARK_OPERATIONS['regex-match'](text, pattern), 10000));
        return results;
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Setup performance observer
     */
    setupPerformanceObserver() {
        if (typeof PerformanceObserver === 'undefined') {
            this.logger.warn('PerformanceObserver not available');
            return;
        }
        this.performanceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
                if (entry.entryType === 'measure') {
                    this.recordHistogram(`perf-measure-${entry.name}`, entry.duration);
                }
            }
        });
    }
    /**
     * Setup garbage collection monitoring
     */
    setupGCMonitoring() {
        if (!this.config.collectGCMetrics) {
            return;
        }
        // Monitor GC events if available
        if (typeof process.versions !== 'undefined' && process.versions.node) {
            // This would require additional setup with native modules or flags
            // For now, we'll just track basic memory changes
            setInterval(() => {
                const memUsage = process.memoryUsage();
                this.recordGauge('gc-heap-used', memUsage.heapUsed);
                this.recordGauge('gc-heap-total', memUsage.heapTotal);
                this.recordGauge('gc-external', memUsage.external);
            }, 5000);
        }
    }
    /**
     * Start periodic metric collection
     */
    startPeriodicCollection() {
        setInterval(() => {
            if (!this.isRunning)
                return;
            // Collect system metrics
            if (this.config.collectSystemMetrics) {
                this.collectSystemMetrics();
            }
            // Collect memory metrics
            if (this.config.collectMemoryMetrics) {
                this.collectMemoryMetrics();
            }
            // Flush metrics periodically
            this.flushMetrics();
        }, 10000); // Every 10 seconds
    }
    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        this.recordGauge('system-heap-used', memUsage.heapUsed);
        this.recordGauge('system-heap-total', memUsage.heapTotal);
        this.recordGauge('system-external', memUsage.external);
        this.recordGauge('system-rss', memUsage.rss);
        // CPU usage would need more sophisticated calculation
        this.recordGauge('system-cpu-user', cpuUsage.user);
        this.recordGauge('system-cpu-system', cpuUsage.system);
    }
    /**
     * Collect memory metrics
     */
    collectMemoryMetrics() {
        const memUsage = process.memoryUsage();
        // Check for memory threshold violations
        const memoryMB = memUsage.heapUsed / 1024 / 1024;
        if (memoryMB > this.config.thresholds.highMemoryMB) {
            this.emit('memoryAlert', {
                type: 'high-memory',
                value: memoryMB,
                threshold: this.config.thresholds.highMemoryMB,
                timestamp: new Date().toISOString()
            });
        }
        this.recordHistogram('memory-heap-used-histogram', memUsage.heapUsed);
    }
    /**
     * Capture memory profile
     */
    captureMemoryProfile() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers || 0,
            peakUsage: 0, // Would need to track peak usage
            allocations: 0, // Would need to track allocations
            deallocations: 0, // Would need to track deallocations
            gcCount: this.gcStats.count,
            gcTime: this.gcStats.time
        };
    }
    /**
     * Check metric thresholds
     */
    checkThresholds(metric) {
        if (metric.type === 'timer' && metric.value > this.config.thresholds.slowOperationMs) {
            this.emit('slowOperation', {
                metric,
                threshold: this.config.thresholds.slowOperationMs
            });
        }
    }
    /**
     * Create histogram buckets
     */
    createHistogramBuckets(values) {
        const buckets = {};
        const bucketRanges = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
        for (const range of bucketRanges) {
            buckets[`le_${range}`] = values.filter(v => v <= range).length;
        }
        buckets['le_inf'] = values.length;
        return buckets;
    }
    /**
     * Calculate percentile
     */
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) {
            return sortedArray[lower];
        }
        const weight = index - lower;
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
    /**
     * Store metrics in Redis
     */
    async flushMetrics() {
        if (this.metrics.size === 0)
            return;
        try {
            const metricsArray = Array.from(this.metrics.values());
            const key = `${this.METRICS_PREFIX}batch:${Date.now()}`;
            await this.cacheService.set(key, metricsArray, {
                ttl: this.config.retentionPeriod * 24 * 60 * 60
            });
            this.metrics.clear();
            this.logger.debug(`Flushed ${metricsArray.length} metrics to Redis`);
        }
        catch (error) {
            this.logger.error('Failed to flush metrics:', getErrorMessage(error));
        }
    }
    /**
     * Store benchmark result
     */
    async storeBenchmark(benchmark) {
        try {
            const key = `${this.METRICS_PREFIX}${this.BENCHMARKS_KEY}:${benchmark.id}`;
            await this.cacheService.set(key, benchmark, {
                ttl: this.config.retentionPeriod * 24 * 60 * 60
            });
        }
        catch (error) {
            this.logger.error('Failed to store benchmark:', getErrorMessage(error));
        }
    }
    /**
     * Store performance profile
     */
    async storeProfile(profile) {
        try {
            const key = `${this.METRICS_PREFIX}${this.PROFILES_KEY}:${profile.id}`;
            await this.cacheService.set(key, profile, {
                ttl: this.config.retentionPeriod * 24 * 60 * 60
            });
        }
        catch (error) {
            this.logger.error('Failed to store profile:', getErrorMessage(error));
        }
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    /**
     * Get current metrics summary
     */
    getMetricsSummary() {
        return {
            activeTimers: this.timers.size,
            totalCounters: this.counters.size,
            totalGauges: this.gauges.size,
            totalHistograms: this.histograms.size,
            activeProfiles: this.activeProfiles.size
        };
    }
    /**
     * Get recent benchmarks
     */
    async getRecentBenchmarks(limit = 10) {
        try {
            // This is simplified - in production you'd use Redis SCAN
            // to find recent benchmark keys and retrieve them
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get recent benchmarks:', getErrorMessage(error));
            return [];
        }
    }
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics.clear();
        this.timers.clear();
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.logger.info('All performance metrics cleared');
    }
    /**
     * Get performance report
     */
    async getPerformanceReport() {
        const summary = this.getMetricsSummary();
        const recentBenchmarks = await this.getRecentBenchmarks();
        // Get recent slow operations
        const slowOperations = Array.from(this.metrics.values())
            .filter(m => m.type === 'timer' && m.value > this.config.thresholds.slowOperationMs)
            .slice(-10);
        const memoryUsage = process.memoryUsage();
        return {
            summary,
            recentBenchmarks,
            slowOperations,
            memoryUsage
        };
    }
}
export default PerformanceMetricsCollector;
//# sourceMappingURL=PerformanceMetricsCollector.js.map