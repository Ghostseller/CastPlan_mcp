/**
 * Version Tracking Types
 *
 * CastPlan MCP Phase 2: Complete type definitions for version tracking system
 *
 * Created: 2025-07-31
 * Author: Test Automation Specialist
 */
// =============================================================================
// ENUMS
// =============================================================================
export var VersionType;
(function (VersionType) {
    VersionType["MAJOR"] = "major";
    VersionType["MINOR"] = "minor";
    VersionType["PATCH"] = "patch";
    VersionType["DRAFT"] = "draft";
    VersionType["SNAPSHOT"] = "snapshot";
})(VersionType || (VersionType = {}));
export var ChangeType;
(function (ChangeType) {
    ChangeType["ADDITION"] = "addition";
    ChangeType["DELETION"] = "deletion";
    ChangeType["MODIFICATION"] = "modification";
    ChangeType["REORDER"] = "reorder";
    ChangeType["SPLIT"] = "split";
    ChangeType["MERGE"] = "merge";
    ChangeType["ADD"] = "addition";
    ChangeType["DELETE"] = "deletion";
    ChangeType["MODIFY"] = "modification";
    ChangeType["RESTRUCTURE"] = "restructure";
    ChangeType["MOVE"] = "move";
})(ChangeType || (ChangeType = {}));
export var ChangeScope;
(function (ChangeScope) {
    ChangeScope["DOCUMENT"] = "document";
    ChangeScope["SECTION"] = "section";
    ChangeScope["PARAGRAPH"] = "paragraph";
    ChangeScope["SENTENCE"] = "sentence";
    ChangeScope["WORD"] = "word";
    ChangeScope["SEMANTIC"] = "semantic";
})(ChangeScope || (ChangeScope = {}));
export var RelationshipType;
(function (RelationshipType) {
    RelationshipType["PARENT_CHILD"] = "parent_child";
    RelationshipType["BRANCH"] = "branch";
    RelationshipType["MERGE"] = "merge";
    RelationshipType["REFERENCE"] = "reference";
    RelationshipType["DEPENDENCY"] = "dependency";
})(RelationshipType || (RelationshipType = {}));
export class VersionTrackingError extends Error {
    code;
    details;
    timestamp;
    constructor(code, message, details) {
        super(message);
        this.name = 'VersionTrackingError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}
//# sourceMappingURL=version-tracking.types.js.map