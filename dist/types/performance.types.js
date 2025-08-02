/**
 * Performance Types - Comprehensive Type Definitions for Performance Monitoring
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for performance monitoring, optimization, and benchmarking
 *
 * Created: 2025-07-31
 * Author: Performance Engineering Team & Type System Architect
 */
// =============================================================================
// ERROR HANDLING
// =============================================================================
export class PerformanceError extends Error {
    code;
    category;
    timestamp;
    context;
    constructor(message, code, category, context) {
        super(message);
        this.name = 'PerformanceError';
        this.code = code;
        this.category = category;
        this.timestamp = new Date().toISOString();
        this.context = context;
    }
}
export default {
    PerformanceError,
    // Export all interfaces for use in other modules
};
//# sourceMappingURL=performance.types.js.map