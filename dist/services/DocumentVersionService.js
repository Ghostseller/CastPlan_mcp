/**
 * Document Version Service
 *
 * CastPlan MCP Phase 2: Core version tracking system
 * Handles document versioning, comparison, and change detection
 *
 * Created: 2025-07-31
 * Author: Test Automation Specialist
 */
import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import { getErrorMessage } from '../utils/typeHelpers';
import { VersionType, ChangeType, ChangeScope, RelationshipType, VersionTrackingError } from '../types/version-tracking.types';
// =============================================================================
// CORE DOCUMENT VERSION SERVICE
// =============================================================================
export class DocumentVersionService {
    db;
    logger;
    isInitialized = false;
    // In-memory locks for concurrency control
    locks = new Map();
    // Configuration
    maxVersionHistory = 1000;
    maxConcurrentOperations = 10;
    constructor(databasePath, logger) {
        this.logger = logger;
        this.db = new Database(databasePath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 10000');
    }
    // =============================================================================
    // INITIALIZATION AND SETUP
    // =============================================================================
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            await this.setupDatabase();
            this.isInitialized = true;
            this.logger.info('DocumentVersionService initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize DocumentVersionService:', error);
            throw new VersionTrackingError('INIT_FAILED', 'Service initialization failed', { error: getErrorMessage(error) });
        }
    }
    async setupDatabase() {
        // Create tables with proper indexes
        const tables = [
            `CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        version_type TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        semantic_hash TEXT NOT NULL,
        parent_version_id TEXT,
        branch_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_version_id) REFERENCES document_versions(id),
        UNIQUE(document_id, version_number)
      )`,
            `CREATE TABLE IF NOT EXISTS chunk_versions (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        version_id TEXT NOT NULL,
        content TEXT NOT NULL,
        semantic_embedding TEXT,
        position INTEGER NOT NULL,
        hash TEXT NOT NULL,
        change_type TEXT,
        confidence REAL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (version_id) REFERENCES document_versions(id) ON DELETE CASCADE
      )`,
            `CREATE TABLE IF NOT EXISTS version_relationships (
        id TEXT PRIMARY KEY,
        source_version_id TEXT NOT NULL,
        target_version_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (source_version_id) REFERENCES document_versions(id) ON DELETE CASCADE,
        FOREIGN KEY (target_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
      )`,
            `CREATE TABLE IF NOT EXISTS document_branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document_id TEXT NOT NULL,
        parent_branch_id TEXT,
        head_version_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (head_version_id) REFERENCES document_versions(id),
        FOREIGN KEY (parent_branch_id) REFERENCES document_branches(id),
        UNIQUE(document_id, name)
      )`
        ];
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_document_versions_parent ON document_versions(parent_version_id)',
            'CREATE INDEX IF NOT EXISTS idx_chunk_versions_version_id ON chunk_versions(version_id)',
            'CREATE INDEX IF NOT EXISTS idx_chunk_versions_position ON chunk_versions(version_id, position)',
            'CREATE INDEX IF NOT EXISTS idx_version_relationships_source ON version_relationships(source_version_id)',
            'CREATE INDEX IF NOT EXISTS idx_version_relationships_target ON version_relationships(target_version_id)',
            'CREATE INDEX IF NOT EXISTS idx_document_branches_document_id ON document_branches(document_id)'
        ];
        // Execute table creation
        for (const sql of tables) {
            this.db.exec(sql);
        }
        // Execute index creation
        for (const sql of indexes) {
            this.db.exec(sql);
        }
    }
    // =============================================================================
    // VERSION MANAGEMENT
    // =============================================================================
    async createVersion(documentId, options = {}) {
        this.ensureInitialized();
        return this.executeWithLock(`create_version_${documentId}`, async () => {
            const transaction = this.db.transaction(() => {
                try {
                    // Generate version details
                    const versionId = this.generateId('version');
                    const versionNumber = this.generateVersionNumber(documentId, options.versionType || VersionType.MINOR);
                    const contentHash = this.generateContentHash(documentId);
                    const semanticHash = this.generateSemanticHash(documentId);
                    // Check version history limit
                    this.enforceVersionHistoryLimit(documentId);
                    // Create version object
                    const version = {
                        id: versionId,
                        documentId,
                        versionNumber,
                        versionType: options.versionType || VersionType.MINOR,
                        contentHash,
                        semanticHash,
                        parentVersionId: options.parentVersionId,
                        branchId: options.branchId,
                        metadata: {
                            tags: options.tags || [],
                            description: options.description || '',
                            author: options.author || 'system',
                            ...options.metadata
                        },
                        chunks: [],
                        relationships: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    // Insert into database
                    const insertStmt = this.db.prepare(`
            INSERT INTO document_versions (
              id, document_id, version_number, version_type, content_hash, semantic_hash,
              parent_version_id, branch_id, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
                    insertStmt.run(version.id, version.documentId, version.versionNumber, version.versionType, version.contentHash, version.semanticHash, version.parentVersionId || null, version.branchId || null, JSON.stringify(version.metadata), version.createdAt, version.updatedAt);
                    // Create parent relationship if specified
                    if (options.parentVersionId) {
                        this.createRelationship(options.parentVersionId, versionId, RelationshipType.PARENT_CHILD, 1.0);
                    }
                    this.logger.info(`Created version ${versionNumber} for document ${documentId}`);
                    return version;
                }
                catch (error) {
                    this.logger.error('Version creation failed:', error);
                    throw new VersionTrackingError('VERSION_CREATE_FAILED', 'Failed to create version', { documentId, error: getErrorMessage(error) });
                }
            });
            return transaction();
        });
    }
    async getVersion(versionId) {
        this.ensureInitialized();
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM document_versions WHERE id = ?
      `);
            const row = stmt.get(versionId);
            if (!row) {
                return null;
            }
            const version = this.mapRowToVersion(row);
            // Load chunks and relationships
            version.chunks = await this.getVersionChunks(versionId);
            version.relationships = await this.getVersionRelationships(versionId);
            return version;
        }
        catch (error) {
            this.logger.error('Failed to get version:', error);
            throw new VersionTrackingError('VERSION_GET_FAILED', 'Failed to retrieve version', { versionId, error: getErrorMessage(error) });
        }
    }
    async updateVersion(versionId, updates) {
        this.ensureInitialized();
        return this.executeWithLock(`update_version_${versionId}`, async () => {
            const transaction = this.db.transaction(() => {
                try {
                    const checkStmt = this.db.prepare('SELECT id FROM document_versions WHERE id = ?');
                    const existing = checkStmt.get(versionId);
                    if (!existing) {
                        throw new VersionTrackingError('VERSION_NOT_FOUND', 'Version not found', { versionId });
                    }
                    const updateFields = [];
                    const updateValues = [];
                    // Build dynamic update query
                    if (updates.metadata !== undefined) {
                        updateFields.push('metadata = ?');
                        updateValues.push(JSON.stringify(updates.metadata));
                    }
                    if (updates.versionType !== undefined) {
                        updateFields.push('version_type = ?');
                        updateValues.push(updates.versionType);
                    }
                    if (updateFields.length === 0) {
                        throw new VersionTrackingError('NO_UPDATES', 'No valid updates provided');
                    }
                    updateFields.push('updated_at = ?');
                    updateValues.push(new Date().toISOString());
                    updateValues.push(versionId);
                    const updateStmt = this.db.prepare(`
            UPDATE document_versions 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
          `);
                    updateStmt.run(...updateValues);
                    this.logger.info(`Updated version ${versionId}`);
                    // Return a placeholder version - this will be handled by the transaction wrapper
                    return { id: versionId };
                }
                catch (error) {
                    this.logger.error('Version update failed:', error);
                    throw error instanceof VersionTrackingError ? error :
                        new VersionTrackingError('VERSION_UPDATE_FAILED', 'Failed to update version', { versionId, error: getErrorMessage(error) });
                }
            });
            const result = transaction();
            // Get the updated version after transaction
            const updatedVersion = await this.getVersion(versionId);
            if (!updatedVersion) {
                throw new VersionTrackingError('VERSION_UPDATE_FAILED', 'Failed to retrieve updated version', { versionId });
            }
            return updatedVersion;
        });
    }
    async deleteVersion(versionId) {
        this.ensureInitialized();
        return this.executeWithLock(`delete_version_${versionId}`, async () => {
            const transaction = this.db.transaction(() => {
                try {
                    // Check if version exists and has no child versions
                    const childrenStmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM document_versions WHERE parent_version_id = ?
          `);
                    const childrenResult = childrenStmt.get(versionId);
                    if (childrenResult.count > 0) {
                        throw new VersionTrackingError('VERSION_HAS_CHILDREN', 'Cannot delete version with child versions', { versionId });
                    }
                    // Delete version (cascading deletes will handle chunks and relationships)
                    const deleteStmt = this.db.prepare('DELETE FROM document_versions WHERE id = ?');
                    const result = deleteStmt.run(versionId);
                    if (result.changes === 0) {
                        return false;
                    }
                    this.logger.info(`Deleted version ${versionId}`);
                    return true;
                }
                catch (error) {
                    this.logger.error('Version deletion failed:', error);
                    throw error instanceof VersionTrackingError ? error :
                        new VersionTrackingError('VERSION_DELETE_FAILED', 'Failed to delete version', { versionId, error: getErrorMessage(error) });
                }
            });
            return transaction();
        });
    }
    // =============================================================================
    // VERSION COMPARISON
    // =============================================================================
    async compareVersions(versionId1, versionId2, options = {}) {
        this.ensureInitialized();
        try {
            const [version1, version2] = await Promise.all([
                this.getVersion(versionId1),
                this.getVersion(versionId2)
            ]);
            if (!version1 || !version2) {
                throw new VersionTrackingError('VERSION_NOT_FOUND', 'One or both versions not found', { versionId1, versionId2 });
            }
            const startTime = Date.now();
            // Perform comparison based on options
            const changes = await this.detectChangesBetweenVersions(version1, version2, options);
            const chunkComparisons = options.chunkLevel ? await this.compareChunks(version1.chunks, version2.chunks) : [];
            // Calculate similarity metrics
            const semanticSimilarity = this.calculateSemanticSimilarity(version1, version2);
            const structuralSimilarity = this.calculateStructuralSimilarity(version1, version2);
            const comparison = {
                version1Id: versionId1,
                version2Id: versionId2,
                changes,
                chunkComparisons,
                summary: {
                    totalChanges: changes.length,
                    addedChunks: chunkComparisons.filter(c => c.changeType === ChangeType.ADDITION).length,
                    removedChunks: chunkComparisons.filter(c => c.changeType === ChangeType.DELETION).length,
                    modifiedChunks: chunkComparisons.filter(c => c.changeType === ChangeType.MODIFICATION).length,
                    semanticSimilarity,
                    structuralSimilarity
                },
                metadata: {
                    comparisonType: options.detailed ? 'detailed' : 'summary',
                    comparedAt: new Date().toISOString(),
                    processingTime: Date.now() - startTime
                }
            };
            this.logger.info(`Compared versions ${versionId1} and ${versionId2} - found ${changes.length} changes`);
            return comparison;
        }
        catch (error) {
            this.logger.error('Version comparison failed:', error);
            throw error instanceof VersionTrackingError ? error :
                new VersionTrackingError('COMPARISON_FAILED', 'Failed to compare versions', { versionId1, versionId2, error: getErrorMessage(error) });
        }
    }
    // =============================================================================
    // CHANGE DETECTION
    // =============================================================================
    async detectChanges(documentId, options = {}) {
        this.ensureInitialized();
        try {
            const versions = await this.getDocumentVersions(documentId, {
                limit: options.analysisDepth === 'deep' ? 50 : options.analysisDepth === 'medium' ? 20 : 10,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
            if (versions.length < 2) {
                return {
                    documentId,
                    changes: [],
                    summary: {
                        totalChanges: 0,
                        changeTypes: [],
                        averageConfidence: 0,
                        detectionOptions: options
                    },
                    timestamp: new Date().toISOString()
                };
            }
            const changes = [];
            // Compare consecutive versions
            for (let i = 0; i < versions.length - 1; i++) {
                const newer = versions[i];
                const older = versions[i + 1];
                const versionChanges = await this.detectChangesBetweenVersions(newer, older, {
                    confidenceThreshold: options.confidenceThreshold || 0.5
                });
                changes.push(...versionChanges);
            }
            // Filter by confidence threshold
            const filteredChanges = changes.filter(change => change.confidence >= (options.confidenceThreshold || 0.5));
            const result = {
                documentId,
                changes: filteredChanges,
                summary: {
                    totalChanges: filteredChanges.length,
                    changeTypes: Array.from(new Set(filteredChanges.map(c => c.type))),
                    averageConfidence: filteredChanges.reduce((sum, c) => sum + c.confidence, 0) / filteredChanges.length || 0,
                    detectionOptions: options
                },
                timestamp: new Date().toISOString()
            };
            this.logger.info(`Detected ${filteredChanges.length} changes for document ${documentId}`);
            return result;
        }
        catch (error) {
            this.logger.error('Change detection failed:', error);
            throw new VersionTrackingError('CHANGE_DETECTION_FAILED', 'Failed to detect changes', { documentId, error: getErrorMessage(error) });
        }
    }
    // =============================================================================
    // VERSION ROLLBACK
    // =============================================================================
    async rollbackToVersion(documentId, targetVersionId) {
        this.ensureInitialized();
        return this.executeWithLock(`rollback_${documentId}`, async () => {
            const transaction = this.db.transaction(() => {
                try {
                    const targetVersionStmt = this.db.prepare('SELECT * FROM document_versions WHERE id = ? AND document_id = ?');
                    const targetVersionRow = targetVersionStmt.get(targetVersionId, documentId);
                    if (!targetVersionRow) {
                        throw new VersionTrackingError('INVALID_ROLLBACK_TARGET', 'Invalid rollback target version', { documentId, targetVersionId });
                    }
                    const targetVersion = this.mapRowToVersion(targetVersionRow);
                    // Create new version based on target version
                    const rollbackVersionData = {
                        versionType: VersionType.MAJOR,
                        parentVersionId: targetVersionId,
                        description: `Rollback to version ${targetVersion.versionNumber}`,
                        author: 'system',
                        tags: ['rollback'],
                        metadata: {
                            rollbackSource: targetVersionId,
                            rollbackTimestamp: new Date().toISOString()
                        }
                    };
                    // Generate rollback version details
                    const rollbackVersionId = this.generateId('version');
                    const rollbackVersionNumber = this.generateVersionNumber(documentId, VersionType.MAJOR);
                    const contentHash = this.generateContentHash(documentId);
                    const semanticHash = this.generateSemanticHash(documentId);
                    const rollbackVersion = {
                        id: rollbackVersionId,
                        documentId,
                        versionNumber: rollbackVersionNumber,
                        versionType: VersionType.MAJOR,
                        contentHash,
                        semanticHash,
                        parentVersionId: targetVersionId,
                        branchId: rollbackVersionData.branchId,
                        metadata: {
                            tags: rollbackVersionData.tags || [],
                            description: rollbackVersionData.description || '',
                            author: rollbackVersionData.author || 'system',
                            ...rollbackVersionData.metadata
                        },
                        chunks: [],
                        relationships: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    // Insert rollback version into database
                    const insertStmt = this.db.prepare(`
            INSERT INTO document_versions (
              id, document_id, version_number, version_type, content_hash, semantic_hash,
              parent_version_id, branch_id, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
                    insertStmt.run(rollbackVersion.id, rollbackVersion.documentId, rollbackVersion.versionNumber, rollbackVersion.versionType, rollbackVersion.contentHash, rollbackVersion.semanticHash, rollbackVersion.parentVersionId || null, rollbackVersion.branchId || null, JSON.stringify(rollbackVersion.metadata), rollbackVersion.createdAt, rollbackVersion.updatedAt);
                    this.logger.info(`Rolled back document ${documentId} to version ${targetVersion.versionNumber}`);
                    return rollbackVersion;
                }
                catch (error) {
                    this.logger.error('Rollback failed:', error);
                    throw error instanceof VersionTrackingError ? error :
                        new VersionTrackingError('ROLLBACK_FAILED', 'Failed to rollback version', { documentId, targetVersionId, error: getErrorMessage(error) });
                }
            });
            return transaction();
        });
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new VersionTrackingError('SERVICE_NOT_INITIALIZED', 'Service not initialized. Call initialize() first.');
        }
    }
    async executeWithLock(lockKey, operation) {
        // Check for existing lock
        if (this.locks.has(lockKey)) {
            await this.locks.get(lockKey);
        }
        // Create new lock
        const lockPromise = operation();
        this.locks.set(lockKey, lockPromise);
        try {
            const result = await lockPromise;
            return result;
        }
        finally {
            this.locks.delete(lockKey);
        }
    }
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    generateVersionNumber(documentId, versionType) {
        // Get latest version number for document
        const stmt = this.db.prepare(`
      SELECT version_number FROM document_versions 
      WHERE document_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
        const result = stmt.get(documentId);
        if (!result) {
            return '1.0.0';
        }
        const parts = result.version_number.split('.').map(Number);
        const [major, minor, patch] = parts.length === 3 ? parts : [1, 0, 0];
        switch (versionType) {
            case VersionType.MAJOR:
                return `${major + 1}.0.0`;
            case VersionType.MINOR:
                return `${major}.${minor + 1}.0`;
            case VersionType.PATCH:
                return `${major}.${minor}.${patch + 1}`;
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    }
    generateContentHash(documentId) {
        return crypto.createHash('sha256')
            .update(`${documentId}_${Date.now()}_content`)
            .digest('hex');
    }
    generateSemanticHash(documentId) {
        return crypto.createHash('sha256')
            .update(`${documentId}_${Date.now()}_semantic`)
            .digest('hex');
    }
    enforceVersionHistoryLimit(documentId) {
        const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM document_versions WHERE document_id = ?
    `);
        const result = countStmt.get(documentId);
        if (result.count >= this.maxVersionHistory) {
            // Delete oldest versions beyond limit
            const deleteStmt = this.db.prepare(`
        DELETE FROM document_versions 
        WHERE document_id = ? 
        AND id IN (
          SELECT id FROM document_versions 
          WHERE document_id = ? 
          ORDER BY created_at ASC 
          LIMIT ?
        )
      `);
            const deleteCount = result.count - this.maxVersionHistory + 1;
            deleteStmt.run(documentId, documentId, deleteCount);
            this.logger.warn(`Deleted ${deleteCount} old versions for document ${documentId} to enforce history limit`);
        }
    }
    mapRowToVersion(row) {
        return {
            id: row.id,
            documentId: row.document_id,
            versionNumber: row.version_number,
            versionType: row.version_type,
            contentHash: row.content_hash,
            semanticHash: row.semantic_hash,
            parentVersionId: row.parent_version_id,
            branchId: row.branch_id,
            metadata: JSON.parse(row.metadata || '{}'),
            chunks: [], // Loaded separately
            relationships: [], // Loaded separately
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async getVersionChunks(versionId) {
        const stmt = this.db.prepare(`
      SELECT * FROM chunk_versions WHERE version_id = ? ORDER BY position
    `);
        const rows = stmt.all(versionId);
        return rows.map(row => ({
            id: row.id,
            chunkId: row.chunk_id,
            versionId: row.version_id,
            content: row.content,
            semanticEmbedding: row.semantic_embedding ? JSON.parse(row.semantic_embedding) : undefined,
            position: row.position,
            hash: row.hash,
            changeType: row.change_type,
            confidence: row.confidence,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    async getVersionRelationships(versionId) {
        const stmt = this.db.prepare(`
      SELECT * FROM version_relationships 
      WHERE source_version_id = ? OR target_version_id = ?
    `);
        const rows = stmt.all(versionId, versionId);
        return rows.map(row => ({
            id: row.id,
            sourceVersionId: row.source_version_id,
            targetVersionId: row.target_version_id,
            relationshipType: row.relationship_type,
            confidence: row.confidence,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    createRelationship(sourceVersionId, targetVersionId, relationshipType, confidence, metadata = {}) {
        const stmt = this.db.prepare(`
      INSERT INTO version_relationships (id, source_version_id, target_version_id, relationship_type, confidence, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(this.generateId('rel'), sourceVersionId, targetVersionId, relationshipType, confidence, JSON.stringify(metadata));
    }
    async getDocumentVersions(documentId, options = {}) {
        const limit = options.limit || 50;
        const offset = ((options.page || 1) - 1) * limit;
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder || 'desc';
        const stmt = this.db.prepare(`
      SELECT * FROM document_versions 
      WHERE document_id = ? 
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()} 
      LIMIT ? OFFSET ?
    `);
        const rows = stmt.all(documentId, limit, offset);
        return Promise.all(rows.map(async (row) => {
            const version = this.mapRowToVersion(row);
            version.chunks = await this.getVersionChunks(version.id);
            version.relationships = await this.getVersionRelationships(version.id);
            return version;
        }));
    }
    async detectChangesBetweenVersions(version1, version2, options = {}) {
        const changes = [];
        // Compare metadata
        if (JSON.stringify(version1.metadata) !== JSON.stringify(version2.metadata)) {
            changes.push({
                id: this.generateId('change'),
                type: ChangeType.MODIFICATION,
                scope: ChangeScope.DOCUMENT,
                confidence: 0.95,
                impact: 0.3,
                description: 'Metadata changed',
                timestamp: new Date().toISOString(),
                changeType: ChangeType.MODIFICATION,
                changeScope: ChangeScope.DOCUMENT,
                affectedChunks: [],
                metadata: {
                    oldMetadata: version2.metadata,
                    newMetadata: version1.metadata
                }
            });
        }
        // Compare chunks
        const chunkChanges = this.detectChunkChanges(version1.chunks, version2.chunks);
        changes.push(...chunkChanges);
        return changes.filter(change => change.confidence >= (options.confidenceThreshold || 0.5));
    }
    detectChunkChanges(chunks1, chunks2) {
        const changes = [];
        const chunks2Map = new Map(chunks2.map(c => [c.position, c]));
        // Check for additions and modifications
        for (const chunk1 of chunks1) {
            const chunk2 = chunks2Map.get(chunk1.position);
            if (!chunk2) {
                changes.push({
                    id: this.generateId('change'),
                    type: ChangeType.ADDITION,
                    scope: ChangeScope.PARAGRAPH,
                    confidence: 0.9,
                    impact: 0.5,
                    description: `Chunk added at position ${chunk1.position}`,
                    timestamp: new Date().toISOString(),
                    changeType: ChangeType.ADDITION,
                    changeScope: ChangeScope.PARAGRAPH,
                    affectedChunks: [chunk1.id],
                    metadata: { chunkId: chunk1.id, position: chunk1.position }
                });
            }
            else if (chunk1.hash !== chunk2.hash) {
                changes.push({
                    id: this.generateId('change'),
                    type: ChangeType.MODIFICATION,
                    scope: ChangeScope.PARAGRAPH,
                    confidence: 0.85,
                    impact: 0.4,
                    description: `Chunk modified at position ${chunk1.position}`,
                    timestamp: new Date().toISOString(),
                    changeType: ChangeType.MODIFICATION,
                    changeScope: ChangeScope.PARAGRAPH,
                    affectedChunks: [chunk1.id],
                    metadata: { chunkId: chunk1.id, position: chunk1.position }
                });
            }
        }
        // Check for deletions
        const chunks1Map = new Map(chunks1.map(c => [c.position, c]));
        for (const chunk2 of chunks2) {
            if (!chunks1Map.has(chunk2.position)) {
                changes.push({
                    id: this.generateId('change'),
                    type: ChangeType.DELETION,
                    scope: ChangeScope.PARAGRAPH,
                    confidence: 0.9,
                    impact: 0.6,
                    description: `Chunk deleted from position ${chunk2.position}`,
                    timestamp: new Date().toISOString(),
                    changeType: ChangeType.DELETION,
                    changeScope: ChangeScope.PARAGRAPH,
                    affectedChunks: [chunk2.id],
                    metadata: { chunkId: chunk2.id, position: chunk2.position }
                });
            }
        }
        return changes;
    }
    async compareChunks(chunks1, chunks2) {
        const comparisons = [];
        const maxLength = Math.max(chunks1.length, chunks2.length);
        for (let i = 0; i < maxLength; i++) {
            const chunk1 = chunks1[i];
            const chunk2 = chunks2[i];
            if (chunk1 && chunk2) {
                const similarity = this.calculateTextSimilarity(chunk1.content, chunk2.content);
                comparisons.push({
                    chunk1Id: chunk1.id,
                    chunk2Id: chunk2.id,
                    changeType: similarity > 0.9 ? ChangeType.MODIFICATION : ChangeType.MODIFICATION,
                    similarity,
                    confidence: similarity,
                    details: `Chunks at position ${i} compared`
                });
            }
            else if (chunk1) {
                comparisons.push({
                    chunk1Id: chunk1.id,
                    changeType: ChangeType.ADDITION,
                    similarity: 0,
                    confidence: 0.9,
                    details: `Chunk added at position ${i}`
                });
            }
            else if (chunk2) {
                comparisons.push({
                    chunk2Id: chunk2.id,
                    changeType: ChangeType.DELETION,
                    similarity: 0,
                    confidence: 0.9,
                    details: `Chunk deleted from position ${i}`
                });
            }
        }
        return comparisons;
    }
    calculateSemanticSimilarity(version1, version2) {
        // Simplified semantic similarity calculation
        if (version1.semanticHash === version2.semanticHash) {
            return 1.0;
        }
        // Compare chunk content similarity
        const totalChunks = Math.max(version1.chunks.length, version2.chunks.length);
        if (totalChunks === 0)
            return 1.0;
        let similaritySum = 0;
        for (let i = 0; i < totalChunks; i++) {
            const chunk1 = version1.chunks[i];
            const chunk2 = version2.chunks[i];
            if (chunk1 && chunk2) {
                similaritySum += this.calculateTextSimilarity(chunk1.content, chunk2.content);
            }
        }
        return similaritySum / totalChunks;
    }
    calculateStructuralSimilarity(version1, version2) {
        // Compare structural elements
        const structure1 = {
            chunkCount: version1.chunks.length,
            relationshipCount: version1.relationships.length,
            metadataKeys: Object.keys(version1.metadata).length
        };
        const structure2 = {
            chunkCount: version2.chunks.length,
            relationshipCount: version2.relationships.length,
            metadataKeys: Object.keys(version2.metadata).length
        };
        // Calculate similarity based on structural differences
        const chunkSimilarity = 1 - Math.abs(structure1.chunkCount - structure2.chunkCount) / Math.max(structure1.chunkCount, structure2.chunkCount, 1);
        const relationshipSimilarity = 1 - Math.abs(structure1.relationshipCount - structure2.relationshipCount) / Math.max(structure1.relationshipCount, structure2.relationshipCount, 1);
        const metadataSimilarity = 1 - Math.abs(structure1.metadataKeys - structure2.metadataKeys) / Math.max(structure1.metadataKeys, structure2.metadataKeys, 1);
        return (chunkSimilarity + relationshipSimilarity + metadataSimilarity) / 3;
    }
    calculateTextSimilarity(text1, text2) {
        // Simple Jaccard similarity
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
        const union = new Set([...Array.from(words1), ...Array.from(words2)]);
        return union.size === 0 ? 1 : intersection.size / union.size;
    }
    // =============================================================================
    // CLEANUP
    // =============================================================================
    async destroy() {
        try {
            // Wait for all pending operations
            await Promise.all(this.locks.values());
            // Close database
            this.db.close();
            // Clear locks
            this.locks.clear();
            this.isInitialized = false;
            this.logger.info('DocumentVersionService destroyed');
        }
        catch (error) {
            this.logger.error('Error during service destruction:', error);
            throw error;
        }
    }
}
export default DocumentVersionService;
//# sourceMappingURL=DocumentVersionService.js.map