import { DocumentationService } from '../services/DocumentationService';
import { DocumentationRequest, DocumentationResponse } from '../types/documentation.types';
import { MockSyncFileSystem, MockPathUtils } from '../interfaces/FileSystemAdapter';
import { Stats } from 'fs';

// No more module-level mocking - using dependency injection instead

describe('DocumentationService', () => {
  let service: DocumentationService;
  let mockFs: MockSyncFileSystem;
  let mockPath: MockPathUtils;
  
  const testProjectRoot = '/test/project';
  
  // Test fixtures
  const createMockDocumentationRequest = (overrides?: Partial<DocumentationRequest>): DocumentationRequest => ({
    action: 'reference',
    files: ['/test/project/frontend/components/Button.tsx'],
    context: 'implement new button component',
    workType: 'implement',
    ...overrides
  });
  
  const createMockStats = (isDirectory = false): Stats => ({
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
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
  } as Stats);

  beforeEach(() => {
    // Create fresh mock instances for each test
    mockFs = new MockSyncFileSystem();
    mockPath = new MockPathUtils();
    
    // Setup default directories
    mockFs.setDirectory(testProjectRoot + '/docs');
    mockFs.setDirectory(testProjectRoot + '/MASTER_DOCS');
    
    service = new DocumentationService(testProjectRoot, mockFs, mockPath);
  });

  describe('constructor', () => {
    it('should initialize with project root and create required directories', () => {
      // Create fresh mocks without existing directories
      const freshMockFs = new MockSyncFileSystem();
      const freshMockPath = new MockPathUtils();
      
      new DocumentationService(testProjectRoot, freshMockFs, freshMockPath);
      
      // Verify directories were created
      expect(freshMockFs.existsSync(testProjectRoot + '/docs')).toBe(true);
      expect(freshMockFs.existsSync(testProjectRoot + '/MASTER_DOCS')).toBe(true);
    });
    
    it('should not create directories if they already exist', () => {
      // Use the default setup where directories already exist
      const existingService = new DocumentationService(testProjectRoot, mockFs, mockPath);
      
      // Should not throw any errors and work normally
      expect(existingService).toBeDefined();
    });
  });

  describe('processDocumentationRequest', () => {
    it('should handle reference action for frontend files', async () => {
      const request = createMockDocumentationRequest({
        action: 'reference',
        files: ['/test/project/frontend/components/Button.tsx'],
        workType: 'implement'
      });
      
      // Mock documentation directories and files
      mockFs.setDirectory(testProjectRoot + '/docs/frontend');
      mockFs.setFile(testProjectRoot + '/docs/frontend/README.md', 'Frontend docs');
      mockFs.setStat(testProjectRoot + '/docs/frontend/README.md', createMockStats(false));
      
      const response = await service.processDocumentationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.documents).toBeDefined();
      expect(response.message).toContain('relevant documents');
      expect(response.message).toContain('frontend');
    });
    
    it('should handle update action with context changes', async () => {
      const request = createMockDocumentationRequest({
        action: 'update',
        context: 'Updated button component with new accessibility features'
      });
      
      // Mock existing documentation files
      mockFs.setDirectory(testProjectRoot + '/docs/frontend');
      mockFs.setFile(testProjectRoot + '/docs/frontend/README.md', '# Frontend Documentation\n\nExisting content');
      
      const response = await service.processDocumentationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.updates).toBeDefined();
      expect(response.updates!.length).toBeGreaterThan(0);
      // Check that the file was updated
      const updatedContent = mockFs.readFileSync(testProjectRoot + '/docs/frontend/README.md', 'utf8');
      expect(updatedContent).toContain('2025-07-30');
    });
    
    it('should handle unknown action with error', async () => {
      const request = createMockDocumentationRequest({
        action: 'unknown' as any
      });
      
      const response = await service.processDocumentationRequest(request);
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Unknown action');
    });
    
    it('should handle processing errors gracefully', async () => {
      const request = createMockDocumentationRequest();
      
      // Mock fs error by overriding the existsSync method
      const originalExistsSync = mockFs.existsSync;
      mockFs.existsSync = jest.fn().mockImplementation(() => {
        throw new Error('File system error');
      });
      
      const response = await service.processDocumentationRequest(request);
      
      // Restore original method
      mockFs.existsSync = originalExistsSync;
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Documentation processing failed');
    });
  });

  describe('category detection', () => {
    it('should detect frontend category from file paths', () => {
      const frontendFiles = [
        '/test/project/frontend/components/Button.tsx',
        '/test/project/castplan-electron/src/renderer/App.tsx',
        '/test/project/src/components/Header.jsx'
      ];
      
      frontendFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('frontend');
      });
    });
    
    it('should detect backend category from file paths', () => {
      const backendFiles = [
        '/test/project/backend/src/routes/api.ts',
        '/test/project/backend/services/UserService.js',
        '/test/project/src/graphql/resolvers.ts'
      ];
      
      backendFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('backend');
      });
    });
    
    it('should detect electron category for castplan-electron paths without conflicting patterns', () => {
      // Files with /castplan-electron/ but no backend patterns (.js, .ts, etc.) match electron
      const electronFiles = [
        '/test/project/castplan-electron/main.txt',     // No backend patterns
        '/test/project/castplan-electron/config.xml',   // No .js substring  
        '/test/project/castplan-electron/renderer/app.html'  // No backend extensions
      ];
      
      electronFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('electron');
      });
    });
    
    it('should prioritize backend patterns over electron for JS/TS files', () => {
      // Files with both /castplan-electron/ and backend extensions match backend first
      const backendFiles = [
        '/test/project/castplan-electron/main.js',      // .js matches backend first
        '/test/project/castplan-electron/config.ts'     // .ts matches backend first
      ];
      
      backendFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('backend');
      });
    });
    
    it('should prioritize backend over electron for ambiguous paths', () => {
      // Files with both backend and electron patterns should match backend first
      const backendFiles = [
        '/test/project/src/collectors/DataCollector.ts',  // Has collectors/ but not /castplan-electron/
        '/test/project/api/services/parser.js'  // Has services/ pattern
      ];
      
      backendFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('backend');
      });
    });
    
    it('should detect database category from file paths', () => {
      const dbFiles = [
        '/test/project/prisma/schema.prisma',
        '/test/project/migrations/init.sql',
        '/test/project/src/prisma/schema.prisma'
      ];
      
      dbFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('database');
      });
    });
    
    it('should detect testing category for test-specific patterns', () => {
      // Files that clearly match testing patterns before other categories
      const testFiles = [
        '/test/project/test-utils/helper.test.txt',  // .test. pattern, avoid .js
        '/test/project/spec/validation.spec.txt',   // .spec. pattern, avoid .js  
        '/test/project/tests/unit/helper.txt'       // /tests/ pattern, avoid .js
      ];
      
      testFiles.forEach(file => {
        const category = service['detectCategory'](file);
        expect(category).toBe('testing');
      });
    });
    
    it('should prioritize frontend/backend over testing for ambiguous test files', () => {
      // Test files that also match frontend/backend patterns should go to those categories
      const ambiguousFiles = [
        '/test/project/components/Button.test.tsx',  // Frontend wins (.tsx)
        '/test/project/api/UserService.spec.ts'     // Backend wins (.ts)
      ];
      
      const expectedCategories = ['frontend', 'backend'];
      
      ambiguousFiles.forEach((file, index) => {
        const category = service['detectCategory'](file);
        expect(category).toBe(expectedCategories[index]);
      });
    });
    
    it('should handle category precedence based on pattern matching order', () => {
      const categoryTests = [
        // These should match development (no matching patterns)
        { file: '/test/project/README.md', expected: 'development' },
        { file: '/test/project/CHANGELOG.txt', expected: 'development' },
        
        // Files that match specific patterns should go to their categories
        { file: '/test/project/castplan-electron/main.exe', expected: 'electron' },
        { file: '/test/project/schema.prisma', expected: 'database' },
        
        // Files with backend patterns match backend even if they seem generic
        { file: '/test/project/config/setup.js', expected: 'backend' },  // .js matches backend
        { file: '/test/project/utils/helper.ts', expected: 'backend' }   // .ts matches backend
      ];
      
      categoryTests.forEach(({ file, expected }) => {
        const category = service['detectCategory'](file);
        expect(category).toBe(expected);
      });
    });
  });

  describe('work type detection', () => {
    it('should detect implement work type', () => {
      const contexts = [
        'implement new user authentication system',
        'add payment processing functionality',
        'create dashboard component',
        'build API endpoint for orders'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('implement');
      });
    });
    
    it('should detect fix work type', () => {
      const contexts = [
        'fix login bug in authentication flow',
        'resolve error in payment processing',
        'bug in user registration form',
        'issue with database connection'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('fix');
      });
    });
    
    it('should detect refactor work type', () => {
      const contexts = [
        'refactor user service for better maintainability',
        'cleanup legacy authentication code',
        'restructure component hierarchy',
        'improve code organization'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('refactor');
      });
    });
    
    it('should detect optimize work type', () => {
      const contexts = [
        'optimize database queries',  // Pure optimize keyword
        'performance bottleneck analysis',  // Performance keyword
        'efficiency problems need attention',  // Efficiency keyword
        'speed optimization required'  // Speed keyword
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('optimize');
      });
    });
    
    it('should handle work type precedence correctly', () => {
      // Test cases where multiple keywords might match
      const workTypeTests = [
        { context: 'fix performance issues', expected: 'fix' },  // fix comes before optimize
        { context: 'improve and refactor code', expected: 'refactor' },  // refactor comes before optimize  
        { context: 'security vulnerability found', expected: 'security' },
        { context: 'implement optimization features', expected: 'implement' }  // implement comes first
      ];
      
      workTypeTests.forEach(({ context, expected }) => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe(expected);
      });
    });
    
    it('should detect test work type', () => {
      const contexts = [
        'test coverage for user service',
        'spec for authentication flow',
        'validate payment processing logic',
        'coverage analysis needed'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('test');
      });
    });
    
    it('should detect deploy work type', () => {
      const contexts = [
        'deploy application to production',
        'release new version to staging',
        'package application for distribution'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('deploy');
      });
    });
    
    it('should detect security work type', () => {
      const contexts = [
        'security audit recommendations',
        'authentication vulnerabilities found',
        'permission checks needed',
        'vulnerability assessment required'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('security');
      });
    });
    
    it('should default to implement for unrecognized contexts', () => {
      const contexts = [
        'some random context',
        'update documentation',
        'general maintenance'
      ];
      
      contexts.forEach(context => {
        const workType = service['detectWorkType'](context);
        expect(workType).toBe('implement');
      });
    });
  });

  describe('searchDocumentation', () => {
    it('should search for content in documentation files', async () => {
      // Setup mock files in both docs and master docs directories
      mockFs.setFile(testProjectRoot + '/docs/doc1.md', 'This file contains the search query');
      mockFs.setStat(testProjectRoot + '/docs/doc1.md', createMockStats(false));
      mockFs.setFile(testProjectRoot + '/docs/doc2.md', 'This file does not contain it');
      mockFs.setStat(testProjectRoot + '/docs/doc2.md', createMockStats(false));
      
      const results = await service.searchDocumentation('search query');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        path: expect.stringContaining('doc1.md'),
        category: expect.any(String),
        relevance: 'medium',
        lastModified: expect.any(Date)
      });
    });
    
    it('should search in both docs and master docs directories', async () => {
      // Setup files in both directories
      mockFs.setFile(testProjectRoot + '/docs/test1.md', 'contains query');
      mockFs.setStat(testProjectRoot + '/docs/test1.md', createMockStats(false));
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/test2.md', 'contains query too');
      mockFs.setStat(testProjectRoot + '/MASTER_DOCS/test2.md', createMockStats(false));
      
      const results = await service.searchDocumentation('query');
      
      // Should find files from both directories
      expect(results.length).toBe(2);
      expect(results.some(r => r.path.includes('/docs/'))).toBe(true);
      expect(results.some(r => r.path.includes('/MASTER_DOCS/'))).toBe(true);
    });
    
    it('should handle file read errors gracefully', async () => {
      // Setup a file that exists but will cause a read error
      const errorFile = testProjectRoot + '/docs/error.md';
      mockFs.setFile(errorFile, 'content'); // File must exist for scanDirectory to find it
      mockFs.setStat(errorFile, createMockStats(false));
      
      // Override readFileSync to throw error for specific file
      const originalReadFileSync = mockFs.readFileSync;
      mockFs.readFileSync = jest.fn().mockImplementation((path, encoding) => {
        if (path.includes('error.md')) {
          throw new Error('File read error');
        }
        return originalReadFileSync.call(mockFs, path, encoding);
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const results = await service.searchDocumentation('query');
      
      expect(results).toHaveLength(0);
      // Check that error was logged
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('Error searching file')
      )).toBe(true);
      
      // Restore mocks
      mockFs.readFileSync = originalReadFileSync;
      consoleSpy.mockRestore();
    });
    
    it('should handle missing directories', async () => {
      // Create a service with no directories set up
      const emptyMockFs = new MockSyncFileSystem();
      const emptyService = new DocumentationService(testProjectRoot, emptyMockFs, mockPath);
      
      const results = await emptyService.searchDocumentation('query');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('validateDocumentationStructure', () => {
    it('should validate complete documentation structure', async () => {
      // Setup all required directories and files
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/README.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/01-ARCHITECTURE-OVERVIEW.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/03-QUICK-START-GUIDE.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/04-API-REFERENCE.md', 'content');
      mockFs.setFile(testProjectRoot + '/CLAUDE.md', 'content');
      
      const result = await service.validateDocumentationStructure();
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
    
    it('should identify missing directories', async () => {
      // Create a service but remove directories after construction
      const emptyMockFs = new MockSyncFileSystem();
      const missingDirsService = new DocumentationService(testProjectRoot, emptyMockFs, mockPath);
      
      // Remove directories that were just created to simulate missing directories 
      emptyMockFs.clear();
      emptyMockFs.setFile(testProjectRoot + '/CLAUDE.md', 'content'); // CLAUDE.md exists
      
      const result = await missingDirsService.validateDocumentationStructure();
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing required directory: docs');
      expect(result.issues).toContain('Missing required directory: MASTER_DOCS');
    });
    
    it('should identify missing master documentation files', async () => {
      // Setup directories but not the required master doc files
      // (directories are already set up in beforeEach, just missing files)
      mockFs.setFile(testProjectRoot + '/CLAUDE.md', 'content'); // CLAUDE.md exists
      
      const result = await service.validateDocumentationStructure();
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing master documentation: README.md');
      expect(result.issues).toContain('Missing master documentation: 01-ARCHITECTURE-OVERVIEW.md');
      expect(result.issues).toContain('Missing master documentation: 03-QUICK-START-GUIDE.md');
      expect(result.issues).toContain('Missing master documentation: 04-API-REFERENCE.md');
    });
    
    it('should identify missing CLAUDE.md', async () => {
      // Setup required master docs but not CLAUDE.md
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/README.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/01-ARCHITECTURE-OVERVIEW.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/03-QUICK-START-GUIDE.md', 'content');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/04-API-REFERENCE.md', 'content');
      // Don't set CLAUDE.md
      
      const result = await service.validateDocumentationStructure();
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing CLAUDE.md in project root');
    });
  });

  describe('getChangeHistory', () => {
    it('should return change history', async () => {
      const history = await service.getChangeHistory();
      
      expect(Array.isArray(history)).toBe(true);
      // Initially empty
      expect(history).toHaveLength(0);
    });
    
    it('should include changes after update operations', async () => {
      const updateRequest = createMockDocumentationRequest({
        action: 'update',
        context: 'Updated component documentation'
      });
      
      // Setup existing documentation
      mockFs.setDirectory(testProjectRoot + '/docs/frontend');
      mockFs.setFile(testProjectRoot + '/docs/frontend/README.md', '# Documentation\n\nContent');
      mockFs.setDirectory(testProjectRoot + '/MASTER_DOCS');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/README.md', '# Master Docs\n\nContent');
      
      await service.processDocumentationRequest(updateRequest);
      const history = await service.getChangeHistory();
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toMatchObject({
        timestamp: expect.any(String),
        files: expect.any(Array),
        changes: expect.any(String),
        context: expect.any(String),
        category: expect.any(Array)
      });
    });
  });

  describe('error handling', () => {
    it('should handle file system permission errors during directory creation', () => {
      // Create a mock file system that throws on mkdir
      const brokenMockFs = new MockSyncFileSystem();
      brokenMockFs.mkdirSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      
      expect(() => {
        new DocumentationService('/restricted/path', brokenMockFs, mockPath);
      }).toThrow('EACCES: permission denied'); // Should propagate the error
    });
    
    it('should handle invalid project root paths', () => {
      const invalidPaths = [''] as any[];
      
      invalidPaths.forEach(invalidPath => {
        expect(() => {
          new DocumentationService(invalidPath);
        }).not.toThrow(); // Should handle gracefully
      });
    });
    
    it('should handle directory scanning errors', async () => {
      const request = createMockDocumentationRequest();
      
      // Setup a broken readdirSync method
      const originalReaddirSync = mockFs.readdirSync;
      mockFs.readdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Cannot read directory');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const response = await service.processDocumentationRequest(request);
      
      // Should still succeed despite directory scanning errors
      expect(response.success).toBe(true);
      
      // Restore original method
      mockFs.readdirSync = originalReaddirSync;
      consoleSpy.mockRestore();
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow for frontend component documentation', async () => {
      const request = createMockDocumentationRequest({
        action: 'reference',
        files: ['/test/project/frontend/components/Button.tsx'],
        context: 'implementing accessible button component',
        workType: 'implement'
      });
      
      // Mock complete file system setup
      mockFs.setDirectory(testProjectRoot + '/docs/frontend');
      mockFs.setFile(testProjectRoot + '/docs/frontend/README.md', 'Frontend README');
      mockFs.setFile(testProjectRoot + '/docs/frontend/components.md', 'Components guide');
      mockFs.setStat(testProjectRoot + '/docs/frontend/README.md', createMockStats(false));
      mockFs.setStat(testProjectRoot + '/docs/frontend/components.md', createMockStats(false));
      
      const response = await service.processDocumentationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.documents).toBeDefined();
      expect(response.documents!.length).toBeGreaterThan(0);
      
      // Verify category detection worked
      const context = service['buildDocumentationContext'](request);
      expect(context.category).toBe('frontend');
      expect(context.workType).toBe('implement');
    });
    
    it('should handle complete workflow for backend API documentation update', async () => {
      const request = createMockDocumentationRequest({
        action: 'update',
        files: ['/test/project/backend/src/routes/users.ts'],
        context: 'added new user authentication endpoints',
        workType: 'implement'
      });
      
      mockFs.setDirectory(testProjectRoot + '/docs/backend');
      mockFs.setFile(testProjectRoot + '/docs/backend/README.md', '# Backend API\n\nExisting documentation');
      mockFs.setDirectory(testProjectRoot + '/MASTER_DOCS');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/README.md', '# Master Docs\n\nContent');
      
      const response = await service.processDocumentationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.updates).toBeDefined();
      // Check that files were updated
      const backendContent = mockFs.readFileSync(testProjectRoot + '/docs/backend/README.md', 'utf8');
      expect(backendContent).toContain('2025-07-30');
      
      // Verify change history was recorded
      const history = await service.getChangeHistory();
      expect(history.length).toBeGreaterThan(0);
    });
    
    it('should maintain data consistency across multiple operations', async () => {
      const requests = [
        createMockDocumentationRequest({ action: 'update', context: 'First update' }),
        createMockDocumentationRequest({ action: 'update', context: 'Second update' }),
        createMockDocumentationRequest({ action: 'reference', context: 'Reference check' })
      ];
      
      // Setup documentation structure for multiple operations
      mockFs.setDirectory(testProjectRoot + '/docs/frontend');
      mockFs.setFile(testProjectRoot + '/docs/frontend/README.md', '# Documentation\n\nContent');
      mockFs.setStat(testProjectRoot + '/docs/frontend/README.md', createMockStats(false));
      mockFs.setDirectory(testProjectRoot + '/MASTER_DOCS');
      mockFs.setFile(testProjectRoot + '/MASTER_DOCS/README.md', '# Master Documentation\n\nContent');
      mockFs.setStat(testProjectRoot + '/MASTER_DOCS/README.md', createMockStats(false));
      
      // Process all requests
      for (const request of requests) {
        const response = await service.processDocumentationRequest(request);
        expect(response.success).toBe(true);
      }
      
      // Verify change history accumulated correctly
      const history = await service.getChangeHistory();
      expect(history).toHaveLength(2); // Only update actions record history
      
      // Verify search still works
      const searchResults = await service.searchDocumentation('Documentation');
      expect(searchResults).toBeDefined();
    });
  });
});