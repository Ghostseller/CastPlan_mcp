import { DocumentTreeService } from '../services/DocumentTreeService';
import { Logger } from 'winston';
import { DocumentMetadata, DocumentNode, DocumentLifecycleState } from '../types/enhanced.types';
import { v4 as uuidv4 } from 'uuid';
import { testUtils } from './setup';

// Mock database interface for dependency injection
interface MockDatabase {
  run: jest.MockedFunction<(query: string, params?: unknown[]) => Promise<{ lastID?: string | number; changes?: number }>>;
  all: jest.MockedFunction<(query: string, params?: unknown[]) => Promise<any[]>>;
  get: jest.MockedFunction<(query: string, params?: unknown[]) => Promise<any>>;
  close?: jest.MockedFunction<() => Promise<void>>;
}

// Mock factory functions
const createMockLogger = (): ReturnType<typeof testUtils.createMockLogger> => 
  testUtils.createMockLogger();

const createMockDatabase = (): MockDatabase => ({
  run: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
  all: jest.fn().mockResolvedValue([]),
  get: jest.fn().mockResolvedValue(null),
  close: jest.fn().mockImplementation(() => Promise.resolve()),
});

describe('DocumentTreeService', () => {
  let service: DocumentTreeService;
  let mockLogger: ReturnType<typeof testUtils.createMockLogger>;
  let mockDb: MockDatabase;
  const testDbPath = ':memory:';

  // Test fixtures
  const createMockDocument = (overrides: Partial<DocumentMetadata> = {}): DocumentMetadata => ({
    id: uuidv4(),
    filePath: '/test/document.md',
    title: 'Test Document',
    category: 'component',
    version: '1.0.0',
    state: DocumentLifecycleState.DRAFT,
    tags: [],
    dependencies: [],
    workConnections: [],
    lastModified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  const createMockNode = (overrides: Partial<DocumentNode> = {}): DocumentNode => ({
    id: uuidv4(),
    documentId: uuidv4(),
    parentId: undefined,
    children: [],
    depth: 0,
    order: 0,
    treeType: 'component',
    ...overrides,
  });

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockDb = createMockDatabase();
    // Inject the mock database directly into the service - this bypasses sqlite3 initialization
    // and allows real service logic to execute with controlled dependencies
    service = new DocumentTreeService(testDbPath, mockLogger as Logger, mockDb);
  });

  afterEach(() => {
    testUtils.forceGC();
  });

  describe('constructor', () => {
    it('should initialize with database path and logger', () => {
      expect(service).toBeDefined();
      expect(service['dbPath']).toBe(testDbPath);
      expect(service['logger']).toBe(mockLogger);
    });

    it('should accept mock database injection for testing', () => {
      expect(service['db']).toBe(mockDb);
    });
  });

  describe('initialize', () => {
    it('should initialize database and create tables', async () => {
      await service.initialize();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS document_tree')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_tree_parent')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_tree_depth')
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_tree_type')
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Document tree service initialized successfully');
    });

    it('should handle database initialization errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.run.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize document tree service:', error);
    });
  });

  describe('buildTree', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should build tree from document metadata array', async () => {
      const documents: DocumentMetadata[] = [
        createMockDocument({ category: 'master', title: 'Master Guide' }),
        createMockDocument({ category: 'component', title: 'Component A' }),
        createMockDocument({ category: 'component', title: 'Component B' }),
        createMockDocument({ category: 'api', title: 'API Documentation' }),
      ];

      const result = await service.buildTree(documents);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM document_tree');
      expect(result).toHaveLength(3); // master, component, api categories
      expect(mockLogger.info).toHaveBeenCalledWith('Document tree built with 3 nodes');
    });

    it('should categorize documents correctly', async () => {
      const documents: DocumentMetadata[] = [
        createMockDocument({ category: 'master' }),
        createMockDocument({ category: 'component' }),
        createMockDocument({ category: 'database' }),
        createMockDocument({ category: 'testing' }),
      ];

      const result = await service.buildTree(documents);

      expect(result).toHaveLength(4); // One root node per category
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO document_tree'),
        expect.arrayContaining([expect.any(String), 'root-master'])
      );
    });

    it('should handle empty document array', async () => {
      const result = await service.buildTree([]);

      expect(result).toHaveLength(0);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM document_tree');
    });

    it('should handle database errors during tree building', async () => {
      const documents = [createMockDocument()];
      const error = new Error('Database insert failed');
      mockDb.run.mockRejectedValue(error);

      await expect(service.buildTree(documents)).rejects.toThrow('Database insert failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to build document tree:', error);
    });

    it('should create proper parent-child relationships', async () => {
      const documents = [
        createMockDocument({ category: 'component', title: 'Parent' }),
        createMockDocument({ category: 'component', title: 'Child' }),
      ];

      await service.buildTree(documents);

      // Verify parent update calls
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE document_tree'),
        expect.arrayContaining([expect.stringContaining('['), expect.any(String)])
      );
    });
  });

  describe('addToTree', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add document as root node when no parent specified', async () => {
      const documentId = uuidv4();
      mockDb.get.mockResolvedValue(null); // No parent

      const result = await service.addToTree(documentId);

      expect(result.documentId).toBe(documentId);
      expect(result.parentId).toBeUndefined();
      expect(result.depth).toBe(0);
      expect(result.order).toBe(0);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO document_tree'),
        expect.arrayContaining([expect.any(String), documentId])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Document added to tree: ${documentId}`);
    });

    it('should add document as child of existing parent', async () => {
      const documentId = uuidv4();
      const parentId = uuidv4();
      mockDb.get
        .mockResolvedValueOnce({ depth: 1 }) // Parent depth
        .mockResolvedValueOnce({ count: 2 }) // Children count
        .mockResolvedValueOnce({ // Parent node
          id: parentId,
          children: JSON.stringify([]),
        });

      const result = await service.addToTree(documentId, parentId);

      expect(result.documentId).toBe(documentId);
      expect(result.parentId).toBe(parentId);
      expect(result.depth).toBe(2);
      expect(result.order).toBe(2);
    });

    it('should handle database errors during add operation', async () => {
      const documentId = uuidv4();
      const error = new Error('Database insert failed');
      mockDb.run.mockRejectedValue(error);

      await expect(service.addToTree(documentId)).rejects.toThrow('Database insert failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to add document to tree:', error);
    });

    it('should update parent children array when parent specified', async () => {
      const documentId = uuidv4();
      const parentId = uuidv4();
      mockDb.get
        .mockResolvedValueOnce({ depth: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({
          id: parentId,
          children: JSON.stringify([]),
        });

      await service.addToTree(documentId, parentId);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE document_tree'),
        expect.arrayContaining([expect.stringContaining(documentId), parentId])
      );
    });
  });

  describe('moveInTree', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should move node to new parent', async () => {
      const nodeId = uuidv4();
      const oldParentId = uuidv4();
      const newParentId = uuidv4();
      
      mockDb.get
        .mockResolvedValueOnce({ // Original node
          id: nodeId,
          parentId: oldParentId,
          depth: 1,
        })
        .mockResolvedValueOnce({ depth: 1 }) // New parent depth
        .mockResolvedValueOnce({ count: 1 }) // New parent children count
        .mockResolvedValueOnce({ // Old parent
          id: oldParentId,
          children: JSON.stringify([nodeId]),
        })
        .mockResolvedValueOnce({ // New parent
          id: newParentId,
          children: JSON.stringify([]),
        });

      await service.moveInTree(nodeId, newParentId);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE document_tree'),
        expect.arrayContaining([newParentId, 2, 1, nodeId])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Node moved in tree: ${nodeId}`);
    });

    it('should move node to root level when no new parent specified', async () => {
      const nodeId = uuidv4();
      const oldParentId = uuidv4();
      
      mockDb.get
        .mockResolvedValueOnce({ // Original node
          id: nodeId,
          parentId: oldParentId,
          depth: 2,
        })
        .mockResolvedValueOnce({ // Old parent
          id: oldParentId,
          children: JSON.stringify([nodeId]),
        });

      await service.moveInTree(nodeId);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE document_tree'),
        expect.arrayContaining([undefined, 0, 0, nodeId])
      );
    });

    it('should handle invalid node ID', async () => {
      const nodeId = uuidv4();
      mockDb.get.mockResolvedValueOnce(null);

      await expect(service.moveInTree(nodeId)).rejects.toThrow(`Node not found: ${nodeId}`);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to move node in tree:', expect.any(Error));
    });

    it('should handle database errors during move operation', async () => {
      const nodeId = uuidv4();
      const error = new Error('Database update failed');
      mockDb.get.mockResolvedValueOnce({ id: nodeId, parentId: null });
      mockDb.run.mockRejectedValue(error);

      await expect(service.moveInTree(nodeId)).rejects.toThrow('Database update failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to move node in tree:', error);
    });
  });

  describe('getSubtree', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return single node when no children exist', async () => {
      const rootId = uuidv4();
      const mockNode = createMockNode({ id: rootId, children: [] });
      
      mockDb.get.mockResolvedValueOnce({
        id: rootId,
        documentId: mockNode.documentId,
        parentId: null,
        children: JSON.stringify([]),
        depth: 0,
        order_index: 0,
        treeType: 'component',
      });

      const result = await service.getSubtree(rootId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(rootId);
      expect(result[0].children).toEqual([]);
    });

    it('should return full subtree recursively', async () => {
      const rootId = uuidv4();
      const childId = uuidv4();
      
      mockDb.get
        .mockResolvedValueOnce({ // Root node
          id: rootId,
          documentId: uuidv4(),
          parentId: null,
          children: JSON.stringify([childId]),
          depth: 0,
          order_index: 0,
          treeType: 'component',
        })
        .mockResolvedValueOnce({ // Child node
          id: childId,
          documentId: uuidv4(),
          parentId: rootId,
          children: JSON.stringify([]),
          depth: 1,
          order_index: 0,
          treeType: 'component',
        });

      const result = await service.getSubtree(rootId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(rootId);
      expect(result[1].id).toBe(childId);
    });

    it('should respect maxDepth parameter', async () => {
      const rootId = uuidv4();
      const childId = uuidv4();
      
      mockDb.get.mockResolvedValueOnce({
        id: rootId,
        documentId: uuidv4(),
        parentId: null,
        children: JSON.stringify([childId]),
        depth: 10, // At max depth
        order_index: 0,
        treeType: 'component',
      });

      const result = await service.getSubtree(rootId, 10);

      expect(result).toHaveLength(1); // Should not traverse children
      expect(mockDb.get).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid root ID', async () => {
      const rootId = uuidv4();
      mockDb.get.mockResolvedValueOnce(null);

      const result = await service.getSubtree(rootId);

      expect(result).toEqual([]);
    });

    it('should handle database errors during subtree retrieval', async () => {
      const rootId = uuidv4();
      const error = new Error('Database query failed');
      mockDb.get.mockRejectedValue(error);

      const result = await service.getSubtree(rootId);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get subtree:', error);
    });
  });

  describe('private helper methods', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    describe('categorizeDocuments', () => {
      it('should categorize documents by their category field', () => {
        const documents: DocumentMetadata[] = [
          createMockDocument({ category: 'master' }),
          createMockDocument({ category: 'component' }),
          createMockDocument({ category: 'api' }),
          createMockDocument({ category: 'database' }),
        ];

        const result = service['categorizeDocuments'](documents);

        expect(result.master).toHaveLength(1);
        expect(result.component).toHaveLength(1);
        expect(result.api).toHaveLength(1);
        expect(result.database).toHaveLength(1);
      });

      it('should default unknown categories to component', () => {
        const documents: DocumentMetadata[] = [
          createMockDocument({ category: 'unknown' as any }),
        ];

        const result = service['categorizeDocuments'](documents);

        expect(result.component).toHaveLength(1);
      });
    });

    describe('mapRowToNode', () => {
      it('should properly map database row to DocumentNode', () => {
        const row = {
          id: uuidv4(),
          documentId: uuidv4(),
          parentId: uuidv4(),
          children: JSON.stringify(['child1', 'child2']),
          depth: 2,
          order_index: 1,
          treeType: 'component',
        };

        const result = service['mapRowToNode'](row);

        expect(result).toEqual({
          id: row.id,
          documentId: row.documentId,
          parentId: row.parentId,
          children: ['child1', 'child2'],
          depth: 2,
          order: 1,
          treeType: 'component',
        });
      });

      it('should handle null children as empty array', () => {
        const row = {
          id: uuidv4(),
          documentId: uuidv4(),
          parentId: null,
          children: null,
          depth: 0,
          order_index: 0,
          treeType: 'master',
        };

        const result = service['mapRowToNode'](row);

        expect(result.children).toEqual([]);
      });
    });
  });
});