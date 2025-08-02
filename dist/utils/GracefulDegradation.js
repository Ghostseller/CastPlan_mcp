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
import { EventEmitter } from 'events';
export var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["AVAILABLE"] = "AVAILABLE";
    ServiceStatus["DEGRADED"] = "DEGRADED";
    ServiceStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(ServiceStatus || (ServiceStatus = {}));
export var DegradationLevel;
(function (DegradationLevel) {
    DegradationLevel[DegradationLevel["NONE"] = 0] = "NONE";
    DegradationLevel[DegradationLevel["MINIMAL"] = 1] = "MINIMAL";
    DegradationLevel[DegradationLevel["MODERATE"] = 2] = "MODERATE";
    DegradationLevel[DegradationLevel["SEVERE"] = 3] = "SEVERE";
    DegradationLevel[DegradationLevel["CRITICAL"] = 4] = "CRITICAL";
})(DegradationLevel || (DegradationLevel = {}));
/**
 * Graceful Degradation Manager
 */
export class GracefulDegradationManager extends EventEmitter {
    logger;
    services = new Map();
    serviceStatuses = new Map();
    serviceFailures = new Map();
    serviceSuccesses = new Map();
    features = new Map();
    degradationRules = [];
    currentDegradationLevel = DegradationLevel.NONE;
    fallbacks = new Map();
    activeActions = new Set();
    constructor(logger) {
        super();
        this.logger = logger;
        this.setupDefaultRules();
    }
    /**
     * Register a service for degradation monitoring
     */
    registerService(config) {
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
    registerFeature(name, toggle) {
        this.features.set(name, toggle);
        this.logger.debug(`Registered feature: ${name}`, { enabled: toggle.enabled });
    }
    /**
     * Register a fallback function for a service or feature
     */
    registerFallback(name, fallback) {
        this.fallbacks.set(name, fallback);
        this.logger.debug(`Registered fallback for: ${name}`);
    }
    /**
     * Record service operation result
     */
    recordServiceResult(serviceName, success, responseTime) {
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
        }
        else {
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
    updateServiceStatus(serviceName, status) {
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
    evaluateDegradationLevel() {
        const context = {
            serviceStatuses: this.serviceStatuses,
            systemLoad: this.getSystemLoad(),
            errorRate: this.getErrorRate(),
            responseTime: this.getAverageResponseTime(),
            memoryUsage: this.getMemoryUsage(),
            activeUsers: this.getActiveUsers()
        };
        let highestLevel = DegradationLevel.NONE;
        const triggeredRules = [];
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
    setDegradationLevel(level, triggeredRules) {
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
    executeAction(action) {
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
    disableFeature(featureName) {
        const feature = this.features.get(featureName);
        if (feature) {
            feature.enabled = false;
            this.logger.warn(`Feature disabled due to degradation: ${featureName}`);
        }
    }
    /**
     * Activate fallback for a service or feature
     */
    activateFallback(name) {
        const fallback = this.fallbacks.get(name);
        if (fallback) {
            this.logger.info(`Fallback activated for: ${name}`);
            // Fallback activation is handled at the execution level
        }
    }
    /**
     * Reduce quality of a service
     */
    reduceQuality(serviceName, parameters) {
        this.logger.info(`Reducing quality for service: ${serviceName}`, parameters);
        // Implementation would depend on specific service
    }
    /**
     * Limit requests to a service
     */
    limitRequests(serviceName, parameters) {
        const limit = parameters?.limit || 10;
        this.logger.info(`Limiting requests to service: ${serviceName}`, { limit });
        // Implementation would use rate limiting
    }
    /**
     * Extend cache duration for a service
     */
    extendCache(serviceName, parameters) {
        const multiplier = parameters?.multiplier || 2;
        this.logger.info(`Extending cache duration for service: ${serviceName}`, { multiplier });
        // Implementation would adjust cache TTL
    }
    /**
     * Execute operation with automatic fallback
     */
    async executeWithFallback(operationName, primaryOperation, fallbackOperation) {
        // Check if service is available
        const serviceStatus = this.serviceStatuses.get(operationName);
        if (serviceStatus === ServiceStatus.UNAVAILABLE) {
            if (fallbackOperation) {
                this.logger.info(`Using fallback for unavailable service: ${operationName}`);
                return await fallbackOperation();
            }
            else {
                throw new Error(`Service unavailable and no fallback: ${operationName}`);
            }
        }
        try {
            const startTime = Date.now();
            const result = await primaryOperation();
            const responseTime = Date.now() - startTime;
            this.recordServiceResult(operationName, true, responseTime);
            return result;
        }
        catch (error) {
            this.recordServiceResult(operationName, false);
            // Try fallback on failure
            if (fallbackOperation) {
                this.logger.warn(`Primary operation failed, using fallback: ${operationName}`, {
                    error: error.message
                });
                try {
                    return await fallbackOperation();
                }
                catch (fallbackError) {
                    this.logger.error(`Fallback also failed: ${operationName}`, {
                        primaryError: error.message,
                        fallbackError: fallbackError.message
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
    isFeatureEnabled(featureName) {
        const feature = this.features.get(featureName);
        if (!feature)
            return true; // Default to enabled if not registered
        return feature.enabled && this.currentDegradationLevel <= feature.degradationLevel;
    }
    /**
     * Get current system status
     */
    getSystemStatus() {
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
    resetAllServices() {
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
    setupDefaultRules() {
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
    getSystemLoad() { return 0; }
    getErrorRate() { return 0; }
    getAverageResponseTime() { return 0; }
    getMemoryUsage() {
        return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    getActiveUsers() { return 0; }
}
//# sourceMappingURL=GracefulDegradation.js.map