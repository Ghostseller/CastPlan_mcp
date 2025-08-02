/**
 * Analytics Types - Comprehensive Type Definitions for Version Analytics
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for analytics service, metrics, trends, and reports
 *
 * Created: 2025-07-31
 * Author: TypeScript Architect & Analytics Specialist
 */
// =============================================================================
// ERROR HANDLING
// =============================================================================
export class AnalyticsError extends Error {
    code;
    timestamp;
    constructor(message, code) {
        super(message);
        this.name = 'AnalyticsError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}
//# sourceMappingURL=analytics.types.js.map