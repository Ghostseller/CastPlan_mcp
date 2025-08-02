/**
 * Dashboard Types - Comprehensive Type Definitions for Analytics Dashboard
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for dashboard components, widgets, charts, and user interfaces
 *
 * Created: 2025-07-31
 * Author: Frontend Architect & Dashboard Specialist
 */
// =============================================================================
// ERROR HANDLING
// =============================================================================
export class DashboardError extends Error {
    code;
    timestamp;
    constructor(message, code) {
        super(message);
        this.name = 'DashboardError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}
//# sourceMappingURL=dashboard.types.js.map