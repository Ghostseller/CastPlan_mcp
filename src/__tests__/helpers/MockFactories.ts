/**
 * Advanced Mock Factories for Comprehensive Testing
 * 
 * Creates realistic mocks for all services and dependencies
 */

import { BMADService } from '../../services/BMADService.js';
import { DocumentationService } from '../../services/DocumentationService.js';
import { HooksService } from '../../services/HooksService.js';
import { DateTimeService } from '../../services/DateTimeService.js';
import { DocumentLifecycleService } from '../../services/DocumentLifecycleService.js';
import { WorkDocumentConnectionService } from '../../services/WorkDocumentConnectionService.js';
import { DocumentTreeService } from '../../services/DocumentTreeService.js';
import { AIAnalysisService } from '../../services/AIAnalysisService.js';
import { TestDataFactory, MockLoggerFactory } from './TestUtils.js';
import { MockI18nServiceFactory, TEST_LOCALES, LocaleTestUtils } from './I18nTestUtils.js';
import type { I18nTestConfig, MockI18nService } from './I18nTestUtils.js';

export class ServiceMockFactory {
  
  // BMAD Service Mock
  static createBMADServiceMock(): jest.Mocked<BMADService> {
    const mockTasks = [
      TestDataFactory.createMockTask({ id: '1', title: 'Frontend Development' }),
      TestDataFactory.createMockTask({ id: '2', title: 'Backend API Implementation' })
    ];
    
    const mockAgents = [
      TestDataFactory.createMockAgent({ id: '1', name: 'Frontend Dev', role: 'frontend' }),
      TestDataFactory.createMockAgent({ id: '2', name: 'Backend Dev', role: 'backend' })
    ];
    
    const mockAssignments = [
      { id: '1', taskId: '1', agentId: '1', assignedAt: new Date().toISOString() },
      { id: '2', taskId: '2', agentId: '2', assignedAt: new Date().toISOString() }
    ];

    return {
      parseSpecification: jest.fn().mockResolvedValue({
        tasks: mockTasks,
        agents: mockAgents,
        assignments: mockAssignments.slice(0, 1), // Only one auto-assignment
        success: true
      }),
      
      getTasks: jest.fn().mockResolvedValue(mockTasks),
      getAgents: jest.fn().mockResolvedValue(mockAgents),
      getAssignments: jest.fn().mockResolvedValue(mockAssignments),
      
      updateTaskStatus: jest.fn().mockImplementation(async (taskId: string, status: string) => {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          task.updatedAt = new Date().toISOString();
          return true;
        }
        return false;
      }),
      
      assignTaskToAgent: jest.fn().mockResolvedValue(true),
      createTask: jest.fn().mockImplementation(async (taskData: any) => {
        const newTask = TestDataFactory.createMockTask(taskData);
        mockTasks.push(newTask);
        return newTask;
      }),
      
      deleteTask: jest.fn().mockImplementation(async (taskId: string) => {
        const index = mockTasks.findIndex(t => t.id === taskId);
        if (index > -1) {
          mockTasks.splice(index, 1);
          return true;
        }
        return false;
      })
    } as jest.Mocked<BMADService>;
  }

  // Documentation Service Mock
  static createDocumentationServiceMock(): jest.Mocked<DocumentationService> {
    const mockChangeHistory = [
      {
        id: '1',
        filePath: '/docs/api.md',
        changeType: 'updated',
        timestamp: new Date().toISOString(),
        description: 'Updated API documentation'
      }
    ];

    return {
      processDocumentationRequest: jest.fn().mockImplementation(async (request: any) => {
        const { action, files, context, category, workType } = request;
        
        switch (action) {
          case 'reference':
            return {
              relevantDocs: files.map((file: string) => ({
                path: `/docs/${path.basename(file, path.extname(file))}.md`,
                relevance: 0.8,
                lastUpdated: new Date().toISOString()
              })),
              recommendations: ['Update API documentation', 'Add code examples'],
              category: category || 'general',
              workType: workType || 'implement'
            };
            
          case 'update':
            mockChangeHistory.push({
              id: String(mockChangeHistory.length + 1),
              filePath: files[0],
              changeType: 'updated',
              timestamp: new Date().toISOString(),
              description: context
            });
            return {
              updatedDocs: files,
              success: true,
              changes: mockChangeHistory.slice(-1)
            };
            
          default:
            return { success: false, error: 'Unknown action' };
        }
      }),
      
      getChangeHistory: jest.fn().mockResolvedValue(mockChangeHistory),
      
      searchDocumentation: jest.fn().mockImplementation(async (query: string) => {
        return [
          {
            path: '/docs/search-result.md',
            title: `Documentation for ${query}`,
            excerpt: `This document contains information about ${query}...`,
            relevance: 0.9
          }
        ];
      }),
      
      validateDocumentationStructure: jest.fn().mockResolvedValue({
        isValid: true,
        issues: [],
        recommendations: ['Consider adding more examples'],
        score: 0.85
      })
    } as jest.Mocked<DocumentationService>;
  }

  // Hooks Service Mock
  static createHooksServiceMock(): jest.Mocked<HooksService> {
    const mockEventHistory = [
      TestDataFactory.createMockHookEvent({ type: 'pre-work', data: { workType: 'frontend' } }),
      TestDataFactory.createMockHookEvent({ type: 'file-change', data: { filePath: '/src/index.ts' } })
    ];

    const mockActiveWatchers = [
      { id: '1', pattern: '**/*.ts', active: true },
      { id: '2', pattern: '**/*.md', active: true }
    ];

    return {
      processHookRequest: jest.fn().mockImplementation(async (request: any) => {
        const { event } = request;
        mockEventHistory.push(event);
        
        return {
          success: true,
          event: event,
          processedAt: new Date().toISOString(),
          triggeredActions: ['documentation-update', 'validation']
        };
      }),
      
      getEventHistory: jest.fn().mockResolvedValue(mockEventHistory),
      getActiveWatchers: jest.fn().mockResolvedValue(mockActiveWatchers),
      
      setupGitHooks: jest.fn().mockResolvedValue(true),
      
      startFileWatching: jest.fn().mockImplementation(async (patterns?: string[]) => {
        const newWatchers = (patterns || ['**/*']).map((pattern, index) => ({
          id: String(mockActiveWatchers.length + index + 1),
          pattern,
          active: true
        }));
        mockActiveWatchers.push(...newWatchers);
        return true;
      }),
      
      stopFileWatching: jest.fn().mockImplementation(async () => {
        mockActiveWatchers.forEach(watcher => watcher.active = false);
        return true;
      }),
      
      getConfig: jest.fn().mockResolvedValue({
        watchPatterns: ['**/*.ts', '**/*.md'],
        gitHooksEnabled: true,
        eventProcessing: true
      })
    } as jest.Mocked<HooksService>;
  }

  // DateTime Service Mock - with configurable locale/timezone support
  static createDateTimeServiceMock(config: I18nTestConfig = TEST_LOCALES['UTC']): jest.Mocked<DateTimeService> {
    const fixedDate = new Date('2025-01-30T10:00:00.000Z');
    
    return {
      getCurrentTimestamp: jest.fn().mockReturnValue(fixedDate.toISOString()),
      
      // Locale-aware date formatting
      getCurrentKoreanDate: jest.fn().mockImplementation(() => {
        if (config.locale.startsWith('ko')) {
          return '2025년 1월 30일 19:00';
        } else if (config.locale.startsWith('ja')) {
          return '2025年1月30日 19:00';
        } else if (config.locale.startsWith('zh')) {
          return '2025年1月30日 19:00';
        } else {
          return 'January 30, 2025 19:00';
        }
      }),
      
      formatDate: jest.fn().mockImplementation((date: Date | string, format?: string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (format === 'korean' || config.locale.startsWith('ko')) {
          const localDate = LocaleTestUtils.formatDate(dateObj, config);
          return localDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일');
        } else if (format === 'japanese' || config.locale.startsWith('ja')) {
          const localDate = LocaleTestUtils.formatDate(dateObj, config);
          return localDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日');
        } else if (format && format.includes('custom')) {
          return LocaleTestUtils.formatDate(dateObj, config);
        }
        
        // Default format in specified timezone
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: config.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(dateObj).replace(',', '');
      }),
      
      parseDate: jest.fn().mockImplementation((dateString: string, format?: string) => {
        try {
          return new Date(dateString);
        } catch {
          return null;
        }
      }),
      
      addDays: jest.fn().mockImplementation((date: Date, days: number) => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
      }),
      
      getDaysBetween: jest.fn().mockImplementation((startDate: Date, endDate: Date) => {
        const diffTime = endDate.getTime() - startDate.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }),
      
      // Business day logic should work consistently across timezones
      isBusinessDay: jest.fn().mockImplementation((date: Date) => {
        // Convert to local timezone date
        const localDate = new Date(date.toLocaleString('en-US', { timeZone: config.timezone }));
        const dayOfWeek = localDate.getDay(); // 0 = Sunday, 6 = Saturday
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
      }),
      
      getNextBusinessDay: jest.fn().mockImplementation((date: Date) => {
        let nextDay = new Date(date);
        do {
          nextDay.setDate(nextDay.getDate() + 1);
          const localNextDay = new Date(nextDay.toLocaleString('en-US', { timeZone: config.timezone }));
          const dayOfWeek = localNextDay.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            break;
          }
        } while (true);
        return nextDay;
      }),
      
      getBusinessDaysBetween: jest.fn().mockImplementation((startDate: Date, endDate: Date) => {
        let count = 0;
        const current = new Date(startDate);
        current.setDate(current.getDate() + 1); // Start from next day
        
        while (current < endDate) {
          const localCurrent = new Date(current.toLocaleString('en-US', { timeZone: config.timezone }));
          const dayOfWeek = localCurrent.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        return endDate < startDate ? -count : count;
      }),
      
      formatRelativeTime: jest.fn().mockImplementation((date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} days ago`;
        
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks} weeks ago`;
      }),
      
      getTimezone: jest.fn().mockReturnValue(config.timezone)
    } as jest.Mocked<DateTimeService>;
  }

  // Document Lifecycle Service Mock
  static createDocumentLifecycleServiceMock(): jest.Mocked<DocumentLifecycleService> {
    const mockDocuments = [
      TestDataFactory.createMockDocument({ id: '1', title: 'API Documentation', state: 'published' }),
      TestDataFactory.createMockDocument({ id: '2', title: 'User Guide', state: 'draft' }),
      TestDataFactory.createMockDocument({ id: '3', title: 'Architecture Overview', state: 'review' })
    ];

    return {
      initialize: jest.fn().mockResolvedValue(undefined),
      
      getAllDocuments: jest.fn().mockResolvedValue(mockDocuments),
      
      getDocumentById: jest.fn().mockImplementation(async (id: string) => {
        return mockDocuments.find(doc => doc.id === id) || null;
      }),
      
      createDocument: jest.fn().mockImplementation(async (docData: any) => {
        const newDoc = TestDataFactory.createMockDocument(docData);
        mockDocuments.push(newDoc);
        return newDoc;
      }),
      
      updateDocumentState: jest.fn().mockImplementation(async (id: string, state: string) => {
        const doc = mockDocuments.find(d => d.id === id);
        if (doc) {
          doc.state = state;
          doc.lastModified = new Date().toISOString();
          return true;
        }
        return false;
      }),
      
      scheduleReview: jest.fn().mockResolvedValue(true),
      
      getDocumentsByState: jest.fn().mockImplementation(async (state: string) => {
        return mockDocuments.filter(doc => doc.state === state);
      }),
      
      deleteDocument: jest.fn().mockImplementation(async (id: string) => {
        const index = mockDocuments.findIndex(doc => doc.id === id);
        if (index > -1) {
          mockDocuments.splice(index, 1);
          return true;
        }
        return false;
      })
    } as jest.Mocked<DocumentLifecycleService>;
  }

  // Work Document Connection Service Mock
  static createWorkDocumentConnectionServiceMock(): jest.Mocked<WorkDocumentConnectionService> {
    const mockConnections = [
      TestDataFactory.createMockConnection({ id: '1', workType: 'frontend' }),
      TestDataFactory.createMockConnection({ id: '2', workType: 'backend' })
    ];

    return {
      initialize: jest.fn().mockResolvedValue(undefined),
      
      getAllConnections: jest.fn().mockResolvedValue(mockConnections),
      
      createConnection: jest.fn().mockImplementation(async (connectionData: any) => {
        const newConnection = TestDataFactory.createMockConnection(connectionData);
        mockConnections.push(newConnection);
        return newConnection;
      }),
      
      updateConnectionStrength: jest.fn().mockImplementation(async (id: string, strength: number) => {
        const connection = mockConnections.find(c => c.id === id);
        if (connection) {
          connection.connectionStrength = strength;
          return true;
        }
        return false;
      }),
      
      getConnectionsByWorkType: jest.fn().mockImplementation(async (workType: string) => {
        return mockConnections.filter(conn => conn.workType === workType);
      }),
      
      deleteConnection: jest.fn().mockImplementation(async (id: string) => {
        const index = mockConnections.findIndex(conn => conn.id === id);
        if (index > -1) {
          mockConnections.splice(index, 1);
          return true;
        }
        return false;
      })
    } as jest.Mocked<WorkDocumentConnectionService>;
  }

  // Document Tree Service Mock
  static createDocumentTreeServiceMock(): jest.Mocked<DocumentTreeService> {
    const mockTreeNodes = [
      TestDataFactory.createMockTreeNode({ id: '1', treeType: 'master', depth: 0 }),
      TestDataFactory.createMockTreeNode({ id: '2', treeType: 'component', depth: 1, parentId: '1' }),
      TestDataFactory.createMockTreeNode({ id: '3', treeType: 'category', depth: 1, parentId: '1' })
    ];

    return {
      initialize: jest.fn().mockResolvedValue(undefined),
      
      buildTree: jest.fn().mockImplementation(async (documents: any[]) => {
        return mockTreeNodes.slice(0, documents.length);
      }),
      
      getTreeNodes: jest.fn().mockResolvedValue(mockTreeNodes),
      
      createTreeNode: jest.fn().mockImplementation(async (nodeData: any) => {
        const newNode = TestDataFactory.createMockTreeNode(nodeData);
        mockTreeNodes.push(newNode);
        return newNode;
      }),
      
      updateTreeStructure: jest.fn().mockResolvedValue(true),
      
      deleteTreeNode: jest.fn().mockImplementation(async (id: string) => {
        const index = mockTreeNodes.findIndex(node => node.id === id);
        if (index > -1) {
          mockTreeNodes.splice(index, 1);
          return true;
        }
        return false;
      })
    } as jest.Mocked<DocumentTreeService>;
  }

  // AI Analysis Service Mock
  static createAIAnalysisServiceMock(provider: 'openai' | 'anthropic' = 'openai'): jest.Mocked<AIAnalysisService> {
    return {
      analyzeQuality: jest.fn().mockImplementation(async (documentPath: string) => {
        return {
          score: 0.85,
          insights: [
            'Document structure is well-organized',
            'Good use of headings and sections',
            'Could benefit from more code examples'
          ],
          suggestions: [
            'Add more practical examples',
            'Include troubleshooting section',
            'Consider adding diagrams'
          ]
        };
      }),
      
      detectDuplicates: jest.fn().mockImplementation(async (documentPath: string) => {
        return {
          score: 0.1, // Low score means few duplicates
          insights: [
            'Minimal content duplication detected',
            'Some common patterns in code examples'
          ],
          suggestions: [
            'Consider extracting common examples to shared section'
          ]
        };
      }),
      
      calculateRelevance: jest.fn().mockImplementation(async (context: string, workDescription: string) => {
        return {
          score: 0.78,
          insights: [
            'Good alignment with current work',
            'Relevant to project requirements',
            'Matches technical stack'
          ],
          suggestions: [
            'Update after implementation',
            'Add performance considerations'
          ]
        };
      }),
      
      getProvider: jest.fn().mockReturnValue(provider),
      
      isEnabled: jest.fn().mockReturnValue(true)
    } as jest.Mocked<AIAnalysisService>;
  }

  // I18n Service Mock - for internationalization testing
  static createI18nServiceMock(config: I18nTestConfig = TEST_LOCALES['en-US']): jest.Mocked<MockI18nService> {
    return MockI18nServiceFactory.create(config);
  }

  /**
   * Create a complete service suite with configurable locale/timezone
   */
  static createServiceSuite(config: I18nTestConfig = TEST_LOCALES['en-US']) {
    return {
      dateTimeService: this.createDateTimeServiceMock(config),
      i18nService: this.createI18nServiceMock(config),
      lifecycleService: this.createDocumentLifecycleServiceMock(),
      connectionService: this.createWorkDocumentConnectionServiceMock(),
      treeService: this.createDocumentTreeServiceMock(),
      aiService: this.createAIAnalysisServiceMock(),
      bmadService: this.createBMADServiceMock(),
      documentationService: this.createDocumentationServiceMock(),
      hooksService: this.createHooksServiceMock(),
      logger: MockLoggerFactory.create()
    };
  }

  /**
   * Create service suites for multiple locale configurations
   */
  static createMultiLocaleServiceSuites(
    locales: (keyof typeof TEST_LOCALES)[] = ['en-US', 'ko-KR', 'de-DE', 'ja-JP']
  ) {
    return locales.reduce((suites, localeKey) => {
      suites[localeKey] = this.createServiceSuite(TEST_LOCALES[localeKey]);
      return suites;
    }, {} as Record<string, ReturnType<typeof ServiceMockFactory.createServiceSuite>>);
  }
}

// Server Mock Factory
export class ServerMockFactory {
  static createMCPServerMock() {
    return {
      setRequestHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined)
    };
  }

  static createTransportMock() {
    return {
      start: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    };
  }
}

// Configuration Mock Factory
export class ConfigMockFactory {
  static createUltimateAutomationConfig(overrides: any = {}) {
    // Support configurable locale/timezone with sensible defaults
    const i18nConfig = overrides.i18n || TEST_LOCALES['en-US'];
    
    return {
      projectRoot: '/test/project',
      databasePath: ':memory:',
      
      services: {
        bmad: true,
        documentation: true,
        hooks: true,
        enhanced: true,
        ...overrides.services
      },
      
      ai: {
        enabled: false,
        provider: 'openai',
        apiKey: undefined,
        model: undefined,
        ...overrides.ai
      },
      
      // Use configurable i18n settings, with fallback to original values for backward compatibility
      timeZone: overrides.timeZone || i18nConfig.timezone || 'UTC',
      locale: overrides.locale || i18nConfig.locale || 'en-US',
      
      // Additional i18n configuration
      i18n: {
        timezone: i18nConfig.timezone || 'UTC',
        locale: i18nConfig.locale || 'en-US',
        dateFormat: i18nConfig.dateFormat || 'yyyy-MM-dd',
        currency: i18nConfig.currency || 'USD',
        rtl: i18nConfig.rtl || false,
        ...overrides.i18n
      },
      
      logLevel: 'error',
      logFile: undefined,
      
      cacheEnabled: true,
      maxConcurrentOperations: 5,
      
      watchMode: false,
      watchPatterns: undefined,
      watchIgnored: undefined,
      
      ...overrides
    };
  }

  /**
   * Create configuration for specific locale/timezone testing
   */
  static createLocaleSpecificConfig(
    localeKey: keyof typeof TEST_LOCALES, 
    overrides: any = {}
  ) {
    const localeConfig = TEST_LOCALES[localeKey];
    return this.createUltimateAutomationConfig({
      i18n: localeConfig,
      timeZone: localeConfig.timezone,
      locale: localeConfig.locale,
      ...overrides
    });
  }

  /**
   * Create configuration for cross-timezone testing
   */
  static createCrossTimezoneConfigs(
    timezones: string[] = ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London']
  ) {
    return timezones.map(timezone => this.createUltimateAutomationConfig({
      i18n: { ...TEST_LOCALES['en-US'], timezone },
      timeZone: timezone
    }));
  }

  /**
   * Create configurations for comprehensive locale testing
   */
  static createMultiLocaleConfigs(
    locales: (keyof typeof TEST_LOCALES)[] = ['en-US', 'ko-KR', 'de-DE', 'ja-JP']
  ) {
    return locales.map(localeKey => this.createLocaleSpecificConfig(localeKey));
  }
}

// File System Mock Factory
export class FileSystemMockFactory {
  static createNodeFileSystemAdapterMock() {
    const mockFiles = new Map<string, string>();
    
    return {
      readFile: jest.fn().mockImplementation(async (filePath: string) => {
        const content = mockFiles.get(filePath);
        if (content === undefined) {
          throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        }
        return content;
      }),
      
      writeFile: jest.fn().mockImplementation(async (filePath: string, content: string) => {
        mockFiles.set(filePath, content);
      }),
      
      exists: jest.fn().mockImplementation(async (filePath: string) => {
        return mockFiles.has(filePath);
      }),
      
      mkdir: jest.fn().mockResolvedValue(undefined),
      
      readdir: jest.fn().mockImplementation(async (dirPath: string) => {
        const files = Array.from(mockFiles.keys())
          .filter(path => path.startsWith(dirPath))
          .map(path => path.replace(dirPath + '/', ''));
        return [...new Set(files)];
      }),
      
      stat: jest.fn().mockImplementation(async (filePath: string) => {
        if (!mockFiles.has(filePath)) {
          throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
        }
        return {
          isFile: () => true,
          isDirectory: () => false,
          size: mockFiles.get(filePath)?.length || 0,
          mtime: new Date()
        };
      }),
      
      // Helper for tests
      _setMockFile: (filePath: string, content: string) => {
        mockFiles.set(filePath, content);
      },
      
      _clearMockFiles: () => {
        mockFiles.clear();
      }
    };
  }
}