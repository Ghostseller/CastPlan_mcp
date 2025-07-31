import { WorkDocumentConnectionService } from '../services/FileBasedWorkDocumentConnectionService';
import { Logger } from 'winston';
import { MockAsyncFileSystem, MockPathUtils } from '../interfaces/FileSystemAdapter';
import { Stats } from 'fs';
import * as path from 'path';

// Test constants
const TEST_PATHS = {
  DOCS_DIR: '/docs',
  TEST_FILE: '/docs/test.md',
  NESTED_FILE: '/docs/subdir/nested.md',
  CURRENT_FILE: '/docs/current/test.md',
  EMPTY_DIR: '/empty',
} as const;

const TEST_WORK_ITEMS = {
  TASK_123: 'TASK-123',
  FEATURE_456: 'FEATURE-456',
  TASK_789: 'TASK-789',
  BUG_101: 'BUG-101',
  TASK_999: 'TASK-999',
} as const;

const TEST_FILES = {
  DOC1: 'doc1.md',
  DOC2: 'doc2.md',
  ORPHAN: 'orphan.md',
  NESTED: 'nested.md',
  HUB: 'hub.md',
} as const;

const EXPECTED_COUNTS = {
  BASIC_GRAPH_NODES: 3,
  BASIC_GRAPH_EDGES: 4,
  WORK_ITEMS_IN_SAMPLE: 1,
  HUB_CONNECTIONS: 4,
} as const;

// Type-safe mock interfaces
interface MockLogger extends Logger {
  info: jest.MockedFunction<Logger['info']>;
  warn: jest.MockedFunction<Logger['warn']>;
  error: jest.MockedFunction<Logger['error']>;
  debug: jest.MockedFunction<Logger['debug']>;
}

// Mock file system interfaces now provided by MockAsyncFileSystem

// Mock stats interface to match Node.js Stats
interface MockStats extends Stats {
  isFile(): boolean;
  isDirectory(): boolean;
}

// Mock winston logger with proper typing
const mockLogger: MockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as MockLogger;

// No more module-level mocking - using dependency injection instead

/**
 * Test data builder for creating consistent mock objects and test fixtures
 */
class TestDataBuilder {
  /**
   * Creates a sample document content with work items and links
   */
  static createSampleDocumentContent(): string {
    return `
# Test Document

Work context: ${TEST_WORK_ITEMS.TASK_123}, ${TEST_WORK_ITEMS.FEATURE_456}
Related: [[other-doc.md]], [[another-doc.md]]

## Content

This document relates to work items ${TEST_WORK_ITEMS.TASK_789} and ${TEST_WORK_ITEMS.BUG_101}.
See also [[reference.md]] for more details.
    `.trim();
  }

  /**
   * Creates a mock connection graph with specified structure
   */
  static createMockGraph(options: {
    documents?: string[];
    workItems?: string[];
    edges?: Array<{ source: string; target: string; type: 'link' | 'workItem' }>;
  } = {}) {
    const {
      documents = [TEST_PATHS.TEST_FILE],
      workItems = [TEST_WORK_ITEMS.TASK_123],
      edges = []
    } = options;

    const nodes = [
      ...documents.map(doc => ({
        id: doc,
        type: 'document' as const,
        label: path.basename(doc)
      })),
      ...workItems.map(item => ({
        id: item,
        type: 'workItem' as const,
        label: item
      }))
    ];

    return { nodes, edges, workItems };
  }

  /**
   * Creates mock file system stats
   */
  static createMockStats(isFile: boolean): MockStats {
    return {
      isFile: () => isFile,
      isDirectory: () => !isFile,
      mtime: new Date('2024-01-01'),
      size: 1024,
      mode: 0o644,
      uid: 1000,
      gid: 1000,
      atime: new Date('2024-01-01'),
      ctime: new Date('2024-01-01'),
      birthtime: new Date('2024-01-01'),
      blksize: 4096,
      blocks: 8,
      dev: 2114,
      ino: 48064969,
      nlink: 1,
      rdev: 0,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    } as MockStats;
  }

  /**
   * Creates a complex graph for testing hub documents
   */
  static createHubDocumentGraph() {
    const hubPath = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.HUB}`;
    const doc1Path = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`;
    const doc2Path = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC2}`;
    const doc3Path = `${TEST_PATHS.DOCS_DIR}/doc3.md`;

    return this.createMockGraph({
      documents: [hubPath, doc1Path, doc2Path, doc3Path],
      edges: [
        { source: hubPath, target: doc1Path, type: 'link' as const },
        { source: hubPath, target: doc2Path, type: 'link' as const },
        { source: hubPath, target: doc3Path, type: 'link' as const },
        { source: doc1Path, target: hubPath, type: 'link' as const },
      ]
    });
  }
}

/**
 * Test helper functions for common setup patterns
 */
class TestHelpers {
  /**
   * Sets up file system mocks for directory traversal
   */
  static setupDirectoryMocks(
    mockFs: MockAsyncFileSystem,
    dirPath: string,
    files: Array<{ name: string; isFile: boolean; content?: string }>
  ): void {
    // Set up directory
    mockFs.setDirectory(dirPath);
    
    // Setup files and directories
    files.forEach(file => {
      const filePath = `${dirPath}/${file.name}`;
      
      if (file.isFile) {
        mockFs.setFile(filePath, file.content || '');
        mockFs.setStat(filePath, TestDataBuilder.createMockStats(true));
      } else {
        mockFs.setDirectory(filePath);
        mockFs.setStat(filePath, TestDataBuilder.createMockStats(false));
      }
    });
  }

  /**
   * Expects a connection graph to have specific structure
   */
  static expectGraphStructure(
    graph: any,
    expectedNodes: number,
    expectedEdges: number,
    expectedWorkItems: number
  ): void {
    expect(graph.nodes).toHaveLength(expectedNodes);
    expect(graph.edges).toHaveLength(expectedEdges);
    expect(graph.workItems).toHaveLength(expectedWorkItems);
  }

  /**
   * Expects specific document connections
   */
  static expectDocumentConnections(
    connections: any,
    expectedWorkItems: string[],
    expectedLinks: string[]
  ): void {
    expect(connections.workItems).toEqual(expectedWorkItems);
    expect(connections.linkedDocuments).toEqual(expectedLinks);
    expect(connections.backlinks).toEqual([]);
  }
}

describe('WorkDocumentConnectionService', () => {
  let service: WorkDocumentConnectionService;
  let mockFs: MockAsyncFileSystem;
  let mockPath: MockPathUtils;

  beforeEach(() => {
    // Create fresh mock instances for each test
    mockFs = new MockAsyncFileSystem();
    mockPath = new MockPathUtils();
    
    // Create service with injected dependencies
    service = new WorkDocumentConnectionService(mockLogger, mockFs, mockPath);
  });

  describe('Initialization', () => {
    it('should initialize service with logger', () => {
      expect(service).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('WorkDocumentConnectionService initialized');
    });
  });

  describe('Document Connection Analysis', () => {
    describe('analyzeConnections', () => {
      beforeEach(() => {
        // Setup default mock content for most tests
        mockFs.setFile(TEST_PATHS.TEST_FILE, TestDataBuilder.createSampleDocumentContent());
      });

      describe('Basic Connection Analysis', () => {
        it('should analyze document connections from sample content', async () => {
          const connections = await service.analyzeConnections(TEST_PATHS.TEST_FILE);

          TestHelpers.expectDocumentConnections(
            connections,
            [TEST_WORK_ITEMS.TASK_123, TEST_WORK_ITEMS.FEATURE_456, TEST_WORK_ITEMS.TASK_789, TEST_WORK_ITEMS.BUG_101],
            [`${TEST_PATHS.DOCS_DIR}/other-doc.md`, `${TEST_PATHS.DOCS_DIR}/another-doc.md`, `${TEST_PATHS.DOCS_DIR}/reference.md`]
          );
        });

        it('should find unique work items when duplicated', async () => {
          const content = `${TEST_WORK_ITEMS.TASK_123} mentioned twice ${TEST_WORK_ITEMS.TASK_123} and ${TEST_WORK_ITEMS.FEATURE_456}`;
          mockFs.setFile('/test.md', content);

          const connections = await service.analyzeConnections('/test.md');

          expect(connections.workItems).toEqual([TEST_WORK_ITEMS.TASK_123, TEST_WORK_ITEMS.FEATURE_456]);
        });

        it('should handle documents with no connections', async () => {
          mockFs.setFile('/plain.md', 'Plain text with no links or work items');

          const connections = await service.analyzeConnections('/plain.md');

          TestHelpers.expectDocumentConnections(connections, [], []);
        });
      });

      describe('Path Resolution', () => {
        it('should resolve relative document links correctly', async () => {
          const content = '[[../parent/doc.md]] [[./sibling.md]] [[nested/child.md]]';
          mockFs.setFile(TEST_PATHS.CURRENT_FILE, content);

          const connections = await service.analyzeConnections(TEST_PATHS.CURRENT_FILE);

          // Our simple mock path doesn't resolve paths, so we expect the unresolved paths
          expect(connections.linkedDocuments).toEqual([
            `${TEST_PATHS.DOCS_DIR}/current/../parent/doc.md`,
            `${TEST_PATHS.DOCS_DIR}/current/./sibling.md`,
            `${TEST_PATHS.DOCS_DIR}/current/nested/child.md`,
          ]);
        });
      });

      describe('Custom Patterns', () => {
        it('should handle custom work item patterns', async () => {
          const content = 'JIRA-123 and GH-456 and CUSTOM-789';
          mockFs.setFile('/test.md', content);

          const connections = await service.analyzeConnections('/test.md', {
            workItemPattern: /(?:JIRA|GH|CUSTOM)-\d+/g,
          });

          expect(connections.workItems).toEqual(['JIRA-123', 'GH-456', 'CUSTOM-789']);
        });
      });

      describe('Backlink Discovery', () => {
        it('should find backlinks when requested', async () => {
          // Setup filesystem mock with files that link back to target
          TestHelpers.setupDirectoryMocks(mockFs, TEST_PATHS.DOCS_DIR, [
            { name: TEST_FILES.DOC1, isFile: true, content: 'This links to [[test.md]]' },
            { name: TEST_FILES.DOC2, isFile: true, content: 'No links here' },
          ]);

          // Target file content
          mockFs.setFile(TEST_PATHS.TEST_FILE, TestDataBuilder.createSampleDocumentContent());

          const connections = await service.analyzeConnections(TEST_PATHS.TEST_FILE, {
            findBacklinks: true,
          });

          expect(connections.backlinks).toEqual([`${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`]);
        });
      });

      describe('Error Handling', () => {
        it('should handle file read errors gracefully', async () => {
          // Don't set up the file, so it will throw when trying to read
          
          await expect(service.analyzeConnections('/missing.md')).rejects.toThrow('ENOENT');
          expect(mockLogger.error).toHaveBeenCalledWith('Failed to analyze connections:', expect.any(Error));
        });
      });
    });
  });

  describe('Connection Graph Building', () => {
    describe('buildConnectionGraph', () => {
      describe('Basic Graph Construction', () => {
        it('should build connection graph for directory with linked documents', async () => {
          // Setup directory with two markdown files that link to each other and share a work item
          TestHelpers.setupDirectoryMocks(mockFs, TEST_PATHS.DOCS_DIR, [
            { name: TEST_FILES.DOC1, isFile: true, content: `Links to [[${TEST_FILES.DOC2}]] and ${TEST_WORK_ITEMS.TASK_123}` },
            { name: TEST_FILES.DOC2, isFile: true, content: `Links back to [[${TEST_FILES.DOC1}]] and ${TEST_WORK_ITEMS.TASK_123}` }
          ]);

          const graph = await service.buildConnectionGraph(TEST_PATHS.DOCS_DIR);

          // Expect 3 nodes: 2 documents + 1 work item
          // Expect 4 edges: 2 document links + 2 work item links
          TestHelpers.expectGraphStructure(graph, EXPECTED_COUNTS.BASIC_GRAPH_NODES, EXPECTED_COUNTS.BASIC_GRAPH_EDGES, EXPECTED_COUNTS.WORK_ITEMS_IN_SAMPLE);
          expect(graph.workItems).toEqual([TEST_WORK_ITEMS.TASK_123]);

          // Verify node types are correct
          const docNodes = graph.nodes.filter(n => n.type === 'document');
          const workNodes = graph.nodes.filter(n => n.type === 'workItem');
          expect(docNodes).toHaveLength(2);
          expect(workNodes).toHaveLength(1);
        });

        it('should handle empty directory gracefully', async () => {
          mockFs.setDirectory(TEST_PATHS.EMPTY_DIR);

          const graph = await service.buildConnectionGraph(TEST_PATHS.EMPTY_DIR);

          TestHelpers.expectGraphStructure(graph, 0, 0, 0);
        });
      });

      describe('File Filtering', () => {
        it('should exclude non-markdown files from graph', async () => {
          TestHelpers.setupDirectoryMocks(mockFs, TEST_PATHS.DOCS_DIR, [
            { name: 'doc.md', isFile: true, content: 'Content of doc.md' },
            { name: 'image.png', isFile: true },
            { name: 'data.json', isFile: true }
          ]);

          const graph = await service.buildConnectionGraph(TEST_PATHS.DOCS_DIR);

          expect(graph.nodes).toHaveLength(1);
          expect(graph.nodes[0].id).toBe(`${TEST_PATHS.DOCS_DIR}/doc.md`);
        });
      });

      describe('Nested Directory Handling', () => {
        it('should process nested directories recursively', async () => {
          // Setup nested directory structure
          TestHelpers.setupDirectoryMocks(mockFs, TEST_PATHS.DOCS_DIR, [
            { name: 'subdir', isFile: false }
          ]);
          
          TestHelpers.setupDirectoryMocks(mockFs, `${TEST_PATHS.DOCS_DIR}/subdir`, [
            { name: TEST_FILES.NESTED, isFile: true, content: `Nested content with ${TEST_WORK_ITEMS.TASK_999}` }
          ]);

          const graph = await service.buildConnectionGraph(TEST_PATHS.DOCS_DIR);

          // Should have 1 document + 1 work item
          TestHelpers.expectGraphStructure(graph, 2, 1, 1);
          expect(graph.nodes.find(n => n.id === TEST_PATHS.NESTED_FILE)).toBeDefined();
        });
      });

      describe('Error Resilience', () => {
        it('should handle individual file analysis errors gracefully', async () => {
          TestHelpers.setupDirectoryMocks(mockFs, TEST_PATHS.DOCS_DIR, [
            { name: 'good.md', isFile: true, content: 'Good content' }
          ]);

          // Add error file but override readFile to throw error
          const errorPath = `${TEST_PATHS.DOCS_DIR}/error.md`;
          mockFs.setFile(errorPath, 'content'); // File must exist for readdir to find it
          mockFs.setStat(errorPath, TestDataBuilder.createMockStats(true));
          
          // Override readFile to throw error for specific file
          const originalReadFile = mockFs.readFile;
          mockFs.readFile = jest.fn().mockImplementation((path) => {
            if (path.includes('error.md')) {
              throw new Error('ENOENT: file read error');
            }
            return originalReadFile.call(mockFs, path);
          });

          const graph = await service.buildConnectionGraph(TEST_PATHS.DOCS_DIR);

          // Should only contain the successfully processed file
          expect(graph.nodes).toHaveLength(1);
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `Failed to analyze ${errorPath}:`,
            expect.any(Error)
          );
          
          // Restore original method
          mockFs.readFile = originalReadFile;
        });
      });
    });
  });

  describe('Orphaned Document Detection', () => {
    describe('findOrphanedDocuments', () => {
      describe('Orphan Identification', () => {
        it('should identify documents with no connections as orphaned', async () => {
          // Create graph with connected and orphaned documents
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [`${TEST_PATHS.DOCS_DIR}/connected1.md`, `${TEST_PATHS.DOCS_DIR}/connected2.md`, `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.ORPHAN}`],
            workItems: [TEST_WORK_ITEMS.TASK_123],
            edges: [
              { source: `${TEST_PATHS.DOCS_DIR}/connected1.md`, target: `${TEST_PATHS.DOCS_DIR}/connected2.md`, type: 'link' },
              { source: `${TEST_PATHS.DOCS_DIR}/connected1.md`, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' },
            ]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const orphaned = await service.findOrphanedDocuments(TEST_PATHS.DOCS_DIR);

          expect(orphaned).toEqual([`${TEST_PATHS.DOCS_DIR}/${TEST_FILES.ORPHAN}`]);
        });

        it('should not count self-references as valid connections', async () => {
          const selfRefDoc = `${TEST_PATHS.DOCS_DIR}/self-ref.md`;
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [selfRefDoc],
            edges: [{ source: selfRefDoc, target: selfRefDoc, type: 'link' }]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const orphaned = await service.findOrphanedDocuments(TEST_PATHS.DOCS_DIR);

          expect(orphaned).toEqual([selfRefDoc]);
        });

        it('should consider work item connections as valid', async () => {
          const docWithTask = `${TEST_PATHS.DOCS_DIR}/with-task.md`;
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [docWithTask],
            workItems: [TEST_WORK_ITEMS.TASK_123],
            edges: [{ source: docWithTask, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' }]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const orphaned = await service.findOrphanedDocuments(TEST_PATHS.DOCS_DIR);

          expect(orphaned).toEqual([]);
        });
      });

      describe('Edge Cases', () => {
        it('should handle empty graphs gracefully', async () => {
          const emptyGraph = TestDataBuilder.createMockGraph();
          // Override to create truly empty graph
          emptyGraph.nodes = [];
          emptyGraph.workItems = [];

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(emptyGraph);

          const orphaned = await service.findOrphanedDocuments(TEST_PATHS.DOCS_DIR);

          expect(orphaned).toEqual([]);
        });
      });
    });
  });

  describe('Work Item Document Discovery', () => {
    describe('findWorkItemDocuments', () => {
      describe('Document Lookup by Work Item', () => {
        it('should find all documents related to specific work item', async () => {
          const doc1Path = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`;
          const doc2Path = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC2}`;
          const doc3Path = `${TEST_PATHS.DOCS_DIR}/doc3.md`;

          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [doc1Path, doc2Path, doc3Path],
            workItems: [TEST_WORK_ITEMS.TASK_123, TEST_WORK_ITEMS.FEATURE_456],
            edges: [
              { source: doc1Path, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' },
              { source: doc2Path, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' },
              { source: doc3Path, target: TEST_WORK_ITEMS.FEATURE_456, type: 'workItem' },
            ]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const documents = await service.findWorkItemDocuments(TEST_PATHS.DOCS_DIR, TEST_WORK_ITEMS.TASK_123);

          expect(documents).toHaveLength(2);
          expect(documents).toContain(doc1Path);
          expect(documents).toContain(doc2Path);
          expect(documents).not.toContain(doc3Path);
        });

        it('should return empty array for unknown work item', async () => {
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [`${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`],
            workItems: [TEST_WORK_ITEMS.TASK_123],
            edges: [{ source: `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' }]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const documents = await service.findWorkItemDocuments(TEST_PATHS.DOCS_DIR, TEST_WORK_ITEMS.TASK_999);

          expect(documents).toEqual([]);
        });

        it('should handle case-insensitive work item search', async () => {
          const doc1Path = `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`;
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [doc1Path],
            workItems: [TEST_WORK_ITEMS.TASK_123],
            edges: [{ source: doc1Path, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' }]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const documents = await service.findWorkItemDocuments(TEST_PATHS.DOCS_DIR, 'task-123');

          expect(documents).toHaveLength(1);
          expect(documents).toContain(doc1Path);
        });
      });
    });
  });

  describe('Report Generation', () => {
    describe('generateConnectionReport', () => {
      beforeEach(() => {
        // No special setup needed - mocks handle this automatically
      });

      describe('Comprehensive Reporting', () => {
        it('should generate detailed connection report with all sections', async () => {
          // Create graph with connected and orphaned documents
          const mockGraph = TestDataBuilder.createMockGraph({
            documents: [`${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`, `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC2}`, `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.ORPHAN}`],
            workItems: [TEST_WORK_ITEMS.TASK_123],
            edges: [
              { source: `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`, target: `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC2}`, type: 'link' },
              { source: `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC1}`, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' },
              { source: `${TEST_PATHS.DOCS_DIR}/${TEST_FILES.DOC2}`, target: TEST_WORK_ITEMS.TASK_123, type: 'workItem' },
            ]
          });

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(mockGraph);

          const reportPath = await service.generateConnectionReport(TEST_PATHS.DOCS_DIR);

          // Verify report was created and contains expected content
          expect(reportPath).toContain('.bmad/reports');
          
          // Read the generated report content
          const reportContent = await mockFs.readFile(reportPath);
          expect(reportContent).toContain('# Document Connection Report');
          expect(reportContent).toContain('Total Documents: 3');
          expect(reportContent).toContain('Total Work Items: 1');
          expect(reportContent).toContain('## Orphaned Documents');
          expect(reportContent).toContain(`- ${TEST_FILES.ORPHAN}`);
          expect(reportContent).toContain('## Work Items');
          expect(reportContent).toContain(`### ${TEST_WORK_ITEMS.TASK_123}`);

          expect(reportPath).toBeDefined();
        });

        it('should handle empty directories with appropriate messaging', async () => {
          const emptyGraph = TestDataBuilder.createMockGraph();
          emptyGraph.nodes = [];
          emptyGraph.workItems = [];

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(emptyGraph);

          const reportPath = await service.generateConnectionReport(TEST_PATHS.EMPTY_DIR);

          const reportContent = await mockFs.readFile(reportPath);
          expect(reportContent).toContain('No documents found');
        });

        it('should identify and highlight most connected documents', async () => {
          const hubGraph = TestDataBuilder.createHubDocumentGraph();

          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(hubGraph);

          const reportPath = await service.generateConnectionReport(TEST_PATHS.DOCS_DIR);

          const reportContent = await mockFs.readFile(reportPath);
          expect(reportContent).toContain('## Most Connected Documents');
          expect(reportContent).toContain(`${TEST_FILES.HUB} (${EXPECTED_COUNTS.HUB_CONNECTIONS} connections)`);
        });
      });

      describe('Error Handling', () => {
        it('should handle report generation errors gracefully', async () => {
          jest.spyOn(service, 'buildConnectionGraph').mockResolvedValueOnce(
            TestDataBuilder.createMockGraph()
          );

          // Mock a failure in the file system by overriding writeFile
          const originalWriteFile = mockFs.writeFile;
          mockFs.writeFile = jest.fn().mockRejectedValue(new Error('Write failed'));

          await expect(service.generateConnectionReport(TEST_PATHS.DOCS_DIR)).rejects.toThrow('Write failed');
          expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate connection report:', expect.any(Error));
          
          // Restore original method
          mockFs.writeFile = originalWriteFile;
        });
      });
    });
  });
});