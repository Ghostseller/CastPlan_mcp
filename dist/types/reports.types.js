/**
 * Reports Types - Comprehensive Type Definitions for Report Generation
 *
 * CastPlan MCP Phase 2 Week 3: Version-aware Analytics and Integration
 * Type definitions for automated report generation, templates, and scheduling
 *
 * Created: 2025-07-31
 * Author: Business Intelligence Specialist & Reports Architect
 */
// =============================================================================
// ERROR HANDLING
// =============================================================================
export class ReportError extends Error {
    code;
    timestamp;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'ReportError';
        this.code = code;
        this.timestamp = new Date().toISOString();
        this.details = details;
    }
}
//# sourceMappingURL=reports.types.js.map