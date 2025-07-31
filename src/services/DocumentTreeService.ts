import { Logger } from 'winston';
import Database from 'better-sqlite3';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentTreeService as IDocumentTreeService,
  DocumentNode,
  DocumentMetadata
} from '../types/enhanced.types.js';

/**
 * Document Tree Structure Service
 * 
 * Manages hierarchical organization of documentation.
 * Builds and maintains tree structures for navigation and organization.
 * 
 * Created: 2025-07-29
 */
export class DocumentTreeService implements IDocumentTreeService {
  private db: any;
  private dbPath: string;
  private logger: Logger;

  constructor(databasePath: string, logger: Logger, mockDb?: any) {
    this.dbPath = databasePath;
    this.logger = logger;
    // Allow mock database injection for testing
    if (mockDb) {
      this.db = mockDb;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Only create real database if mock not provided
      if (!this.db) {
        this.db = new Database(this.dbPath);
        
        // Promisify database methods only for real database
        const dbRun = promisify(this.db.run.bind(this.db));
        const dbAll = promisify(this.db.all.bind(this.db));
        const dbGet = promisify(this.db.get.bind(this.db));
        
        this.db.run = dbRun;
        this.db.all = dbAll;
        this.db.get = dbGet;
      }
      // When mockDb is provided, this.db is already set in constructor and doesn't need promisification

      // Create document_tree table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS document_tree (
          id TEXT PRIMARY KEY,
          documentId TEXT NOT NULL UNIQUE,
          parentId TEXT,
          children TEXT DEFAULT '[]',
          depth INTEGER DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          treeType TEXT DEFAULT 'component',
          FOREIGN KEY (documentId) REFERENCES documents (id),
          FOREIGN KEY (parentId) REFERENCES document_tree (id)
        )
      `);

      // Create indexes for tree operations
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_tree_parent ON document_tree(parentId)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_tree_depth ON document_tree(depth)`);
      await this.db.run(`CREATE INDEX IF NOT EXISTS idx_tree_type ON document_tree(treeType)`);

      this.logger.info('Document tree service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize document tree service:', error);
      throw error;
    }
  }

  async buildTree(documents: DocumentMetadata[]): Promise<DocumentNode[]> {
    try {
      const nodes: DocumentNode[] = [];
      
      // Clear existing tree
      await this.db.run(`DELETE FROM document_tree`);
      
      // Organize documents by category for tree structure
      const categorizedDocs = this.categorizeDocuments(documents);
      
      // Build tree nodes
      for (const [category, docs] of Object.entries(categorizedDocs)) {
        const rootNode = await this.createTreeNode({
          documentId: `root-${category}`,
          treeType: category === 'master' ? 'master' : 'category',
          depth: 0,
          order: 0
        });
        
        nodes.push(rootNode);
        
        // Add child nodes
        for (let i = 0; i < docs.length; i++) {
          const childNode = await this.createTreeNode({
            documentId: docs[i].id,
            parentId: rootNode.id,
            treeType: 'component',
            depth: 1,
            order: i
          });
          
          nodes.push(childNode);
          
          // Update parent's children array
          await this.updateParentChildren(rootNode.id, childNode.id);
        }
      }
      
      this.logger.info(`Document tree built with ${nodes.length} nodes`);
      return nodes;
    } catch (error) {
      this.logger.error('Failed to build document tree:', error);
      throw error;
    }
  }

  async addToTree(documentId: string, parentId?: string): Promise<DocumentNode> {
    try {
      const depth = parentId ? await this.getNodeDepth(parentId) + 1 : 0;
      const order = parentId ? await this.getChildrenCount(parentId) : 0;
      
      const node = await this.createTreeNode({
        documentId,
        parentId,
        depth,
        order,
        treeType: 'component'
      });
      
      if (parentId) {
        await this.updateParentChildren(parentId, node.id);
      }
      
      this.logger.info(`Document added to tree: ${documentId}`);
      return node;
    } catch (error) {
      this.logger.error('Failed to add document to tree:', error);
      throw error;
    }
  }

  async moveInTree(nodeId: string, newParentId?: string): Promise<void> {
    try {
      const node = await this.getNodeById(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      
      // Remove from old parent
      if (node.parentId) {
        await this.removeFromParentChildren(node.parentId, nodeId);
      }
      
      // Calculate new depth and order
      const newDepth = newParentId ? await this.getNodeDepth(newParentId) + 1 : 0;
      const newOrder = newParentId ? await this.getChildrenCount(newParentId) : 0;
      
      // Update node
      await this.db.run(`
        UPDATE document_tree 
        SET parentId = ?, depth = ?, order_index = ?
        WHERE id = ?
      `, [newParentId, newDepth, newOrder, nodeId]);
      
      // Add to new parent
      if (newParentId) {
        await this.updateParentChildren(newParentId, nodeId);
      }
      
      this.logger.info(`Node moved in tree: ${nodeId}`);
    } catch (error) {
      this.logger.error('Failed to move node in tree:', error);
      throw error;
    }
  }

  async getSubtree(rootId: string, maxDepth: number = 10): Promise<DocumentNode[]> {
    try {
      const nodes: DocumentNode[] = [];
      const rootNode = await this.getNodeById(rootId);
      
      if (!rootNode) {
        return nodes;
      }
      
      nodes.push(rootNode);
      
      if (rootNode.depth < maxDepth) {
        for (const childId of rootNode.children) {
          const subtree = await this.getSubtree(childId, maxDepth);
          nodes.push(...subtree);
        }
      }
      
      return nodes;
    } catch (error) {
      this.logger.error('Failed to get subtree:', error);
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private categorizeDocuments(documents: DocumentMetadata[]): Record<string, DocumentMetadata[]> {
    const categories: Record<string, DocumentMetadata[]> = {
      master: [],
      component: [],
      api: [],
      database: [],
      electron: [],
      testing: [],
      deployment: []
    };
    
    for (const doc of documents) {
      if (categories[doc.category]) {
        categories[doc.category].push(doc);
      } else {
        categories.component.push(doc);
      }
    }
    
    return categories;
  }

  private async createTreeNode(nodeData: {
    documentId: string;
    parentId?: string;
    treeType?: string;
    depth?: number;
    order?: number;
  }): Promise<DocumentNode> {
    const node: DocumentNode = {
      id: uuidv4(),
      documentId: nodeData.documentId,
      parentId: nodeData.parentId,
      children: [],
      depth: nodeData.depth || 0,
      order: nodeData.order || 0,
      treeType: (nodeData.treeType as any) || 'component'
    };
    
    await this.db.run(`
      INSERT INTO document_tree (
        id, documentId, parentId, children, depth, order_index, treeType
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      node.id,
      node.documentId,
      node.parentId,
      JSON.stringify(node.children),
      node.depth,
      node.order,
      node.treeType
    ]);
    
    return node;
  }

  private async getNodeById(id: string): Promise<DocumentNode | null> {
    try {
      const row = await this.db.get(`
        SELECT * FROM document_tree WHERE id = ?
      `, [id]);
      
      return row ? this.mapRowToNode(row) : null;
    } catch (error) {
      this.logger.error('Failed to get node by ID:', error);
      return null;
    }
  }

  private async getNodeDepth(nodeId: string): Promise<number> {
    try {
      const row = await this.db.get(`
        SELECT depth FROM document_tree WHERE id = ?
      `, [nodeId]);
      
      return row ? row.depth : 0;
    } catch (error) {
      this.logger.error('Failed to get node depth:', error);
      return 0;
    }
  }

  private async getChildrenCount(parentId: string): Promise<number> {
    try {
      const row = await this.db.get(`
        SELECT COUNT(*) as count FROM document_tree WHERE parentId = ?
      `, [parentId]);
      
      return row ? row.count : 0;
    } catch (error) {
      this.logger.error('Failed to get children count:', error);
      return 0;
    }
  }

  private async updateParentChildren(parentId: string, childId: string): Promise<void> {
    try {
      const parent = await this.getNodeById(parentId);
      if (parent) {
        const updatedChildren = [...parent.children, childId];
        
        await this.db.run(`
          UPDATE document_tree 
          SET children = ?
          WHERE id = ?
        `, [JSON.stringify(updatedChildren), parentId]);
      }
    } catch (error) {
      this.logger.error('Failed to update parent children:', error);
    }
  }

  private async removeFromParentChildren(parentId: string, childId: string): Promise<void> {
    try {
      const parent = await this.getNodeById(parentId);
      if (parent) {
        const updatedChildren = parent.children.filter(id => id !== childId);
        
        await this.db.run(`
          UPDATE document_tree 
          SET children = ?
          WHERE id = ?
        `, [JSON.stringify(updatedChildren), parentId]);
      }
    } catch (error) {
      this.logger.error('Failed to remove from parent children:', error);
    }
  }

  private mapRowToNode(row: any): DocumentNode {
    return {
      id: row.id,
      documentId: row.documentId,
      parentId: row.parentId,
      children: JSON.parse(row.children || '[]'),
      depth: row.depth,
      order: row.order_index,
      treeType: row.treeType
    };
  }
}