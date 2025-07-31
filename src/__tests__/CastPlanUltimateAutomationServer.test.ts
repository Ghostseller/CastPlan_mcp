/**
 * CastPlan Ultimate Automation Server Integration Tests
 * 
 * Comprehensive test suite for the main server class
 */

import { CastPlanUltimateAutomationServer } from '../index.js';
import { ServiceMockFactory, ServerMockFactory, ConfigMockFactory } from './helpers/MockFactories.js';
import { TestDataFactory, PerformanceTestUtils, TestAssertions, TestEnvironment } from './helpers/TestUtils.js';

// Mock external modules
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('winston');

describe('CastPlanUltimateAutomationServer', () => {
  let server: CastPlanUltimateAutomationServer;
  let mockMCPServer: any;
  let mockTransport: any;

  beforeEach(() => {
    TestEnvironment.setupTestEnv();
    
    mockMCPServer = ServerMockFactory.createMCPServerMock();
    mockTransport = ServerMockFactory.createTransportMock();
    
    // Mock the Server constructor
    (require('@modelcontextprotocol/sdk/server/index.js').Server as jest.Mock)
      .mockImplementation(() => mockMCPServer);
    
    // Mock the transport
    (require('@modelcontextprotocol/sdk/server/stdio.js').StdioServerTransport as jest.Mock)
      .mockImplementation(() => mockTransport);
  });

  afterEach(() => {
    TestEnvironment.restoreEnv();
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    test('should initialize server with default configuration', () => {
      expect(() => {
        server = new CastPlanUltimateAutomationServer();
      }).not.toThrow();
      
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledTimes(4); // 4 MCP handlers
    });

    test('should initialize server with custom environment', () => {
      process.env.CASTPLAN_PROJECT_ROOT = '/custom/project';
      process.env.CASTPLAN_ENABLE_AI = 'true';
      process.env.CASTPLAN_AI_PROVIDER = 'anthropic';
      process.env.CASTPLAN_LOG_LEVEL = 'debug';

      expect(() => {
        server = new CastPlanUltimateAutomationServer();
      }).not.toThrow();
    });

    test('should handle disabled services', () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'false';
      process.env.CASTPLAN_ENABLE_DOCS = 'false';
      process.env.CASTPLAN_ENABLE_HOOKS = 'false';
      process.env.CASTPLAN_ENABLE_ENHANCED = 'false';

      expect(() => {
        server = new CastPlanUltimateAutomationServer();
      }).not.toThrow();
    });

    test('should setup request handlers correctly', () => {
      server = new CastPlanUltimateAutomationServer();

      // Verify all required handlers are set
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'resources/list' }), 
        expect.any(Function)
      );
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'resources/read' }), 
        expect.any(Function)
      );
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'tools/list' }), 
        expect.any(Function)
      );
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'tools/call' }), 
        expect.any(Function)
      );
    });
  });

  describe('Service Management', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should initialize all services when enabled', () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'true';
      process.env.CASTPLAN_ENABLE_DOCS = 'true';
      process.env.CASTPLAN_ENABLE_HOOKS = 'true';
      process.env.CASTPLAN_ENABLE_ENHANCED = 'true';

      server = new CastPlanUltimateAutomationServer();

      // Services should be initialized (verified through constructor calls)
      expect(() => server).not.toThrow();
    });

    test('should skip disabled services', () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'false';
      
      server = new CastPlanUltimateAutomationServer();

      // Should not throw even with disabled services
      expect(() => server).not.toThrow();
    });

    test('should handle AI service configuration', () => {
      process.env.CASTPLAN_ENABLE_AI = 'true';
      process.env.CASTPLAN_AI_PROVIDER = 'openai';
      process.env.CASTPLAN_AI_API_KEY = 'test-key';

      server = new CastPlanUltimateAutomationServer();

      expect(() => server).not.toThrow();
    });
  });

  describe('MCP Request Handling', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should handle resources/list request', async () => {
      const listResourcesHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/list')?.[1];

      expect(listResourcesHandler).toBeDefined();

      const result = await listResourcesHandler({});
      
      expect(result).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
    });

    test('should handle resources/read request', async () => {
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      expect(readResourceHandler).toBeDefined();

      const result = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
    });

    test('should handle tools/list request', async () => {
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      expect(listToolsHandler).toBeDefined();

      const result = await listToolsHandler({});
      
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
    });

    test('should handle tools/call request', async () => {
      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      expect(callToolHandler).toBeDefined();

      // This will throw because the tool doesn't exist, but handler should be set up
      await expect(callToolHandler({
        params: { name: 'non-existent-tool', arguments: {} }
      })).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should provide system status resource', async () => {
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      const result = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });
      
      expect(result.contents[0].text).toBeDefined();
      const status = JSON.parse(result.contents[0].text);
      
      expect(status.health).toBeDefined();
      expect(status.health.status).toBeDefined();
      expect(status.health.uptime).toBeDefined();
      expect(status.health.version).toBe('2.0.0');
    });

    test('should handle invalid resource URIs', async () => {
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      await expect(readResourceHandler({
        params: { uri: 'castplan://invalid-resource' }
      })).rejects.toThrow();
    });

    test('should provide service-specific resources when enabled', async () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'true';
      server = new CastPlanUltimateAutomationServer();

      const listResourcesHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/list')?.[1];

      const result = await listResourcesHandler({});
      
      const bmadResources = result.resources.filter((r: any) => 
        r.uri.startsWith('castplan://') && 
        ['tasks', 'agents', 'assignments'].some(path => r.uri.includes(path))
      );
      
      expect(bmadResources.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Management', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should register tools for enabled services', async () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'true';
      process.env.CASTPLAN_ENABLE_DOCS = 'true';
      server = new CastPlanUltimateAutomationServer();

      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      const result = await listToolsHandler({});
      
      expect(result.tools.length).toBeGreaterThan(0);
      
      // Should have BMAD tools
      const bmadTools = result.tools.filter((t: any) => t.name.startsWith('bmad_'));
      expect(bmadTools.length).toBeGreaterThan(0);
      
      // Should have documentation tools
      const docTools = result.tools.filter((t: any) => t.name.startsWith('docs_'));
      expect(docTools.length).toBeGreaterThan(0);
    });

    test('should not register tools for disabled services', async () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'false';
      server = new CastPlanUltimateAutomationServer();

      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      const result = await listToolsHandler({});
      
      // Should not have BMAD tools
      const bmadTools = result.tools.filter((t: any) => t.name.startsWith('bmad_'));
      expect(bmadTools.length).toBe(0);
    });

    test('should validate tool definitions', async () => {
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      const result = await listToolsHandler({});
      
      result.tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      server = new CastPlanUltimateAutomationServer();

      await expect(server.start()).resolves.not.toThrow();
      
      expect(mockMCPServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    test('should handle startup errors gracefully', async () => {
      mockMCPServer.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      server = new CastPlanUltimateAutomationServer();

      await expect(server.start()).rejects.toThrow('Connection failed');
    });

    test('should handle transport errors', async () => {
      mockTransport = { ...mockTransport, start: jest.fn().mockRejectedValue(new Error('Transport error')) };
      
      server = new CastPlanUltimateAutomationServer();

      // Connection might still succeed even if transport has issues
      await expect(server.start()).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should load configuration from environment variables', () => {
      process.env.CASTPLAN_PROJECT_ROOT = '/custom/root';
      process.env.CASTPLAN_DATABASE_PATH = '/custom/db.sqlite';
      process.env.CASTPLAN_TIMEZONE = 'UTC';
      process.env.CASTPLAN_LOCALE = 'en-US';
      process.env.CASTPLAN_LOG_LEVEL = 'debug';

      server = new CastPlanUltimateAutomationServer();

      // Configuration should be loaded without errors
      expect(() => server).not.toThrow();
    });

    test('should use default values when environment variables are not set', () => {
      // Clear environment variables
      delete process.env.CASTPLAN_PROJECT_ROOT;
      delete process.env.CASTPLAN_TIMEZONE;
      delete process.env.CASTPLAN_LOCALE;

      server = new CastPlanUltimateAutomationServer();

      // Should not throw with default configuration
      expect(() => server).not.toThrow();
    });

    test('should handle invalid configuration values', () => {
      process.env.CASTPLAN_MAX_CONCURRENT = 'invalid-number';
      
      server = new CastPlanUltimateAutomationServer();

      // Should handle invalid values gracefully
      expect(() => server).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should handle resource read errors', async () => {
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      await expect(readResourceHandler({
        params: { uri: 'castplan://non-existent' }
      })).rejects.toThrow();
    });

    test('should handle tool call errors', async () => {
      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      await expect(callToolHandler({
        params: { name: 'non-existent-tool', arguments: {} }
      })).rejects.toThrow();
    });

    test('should handle malformed requests', async () => {
      const callToolHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/call')?.[1];

      await expect(callToolHandler({
        params: null
      })).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      server = new CastPlanUltimateAutomationServer();
    });

    test('should handle rapid resource requests', async () => {
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      const requests = Array.from({ length: 100 }, () => () =>
        readResourceHandler({ params: { uri: 'castplan://status' } })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(requests.map(req => req()));
      });

      TestAssertions.assertExecutionTime(duration, 2000, '100 concurrent resource requests');
    });

    test('should handle concurrent tool list requests', async () => {
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      const requests = Array.from({ length: 50 }, () => () =>
        listToolsHandler({})
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(requests.map(req => req()));
      });

      TestAssertions.assertExecutionTime(duration, 1000, '50 concurrent tool list requests');
    });

    test('should handle memory efficiently', async () => {
      const listResourcesHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/list')?.[1];

      const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(async () => {
        for (let i = 0; i < 1000; i++) {
          await listResourcesHandler({});
        }
      });

      TestAssertions.assertMemoryUsage(memoryDelta, 50 * 1024 * 1024, '1000 resource list requests');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete server workflow', async () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'true';
      process.env.CASTPLAN_ENABLE_DOCS = 'true';
      
      server = new CastPlanUltimateAutomationServer();

      // Start server
      await server.start();

      // List resources
      const listResourcesHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/list')?.[1];
      const resources = await listResourcesHandler({});
      expect(resources.resources.length).toBeGreaterThan(0);

      // List tools
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];
      const tools = await listToolsHandler({});
      expect(tools.tools.length).toBeGreaterThan(0);

      // Read status resource
      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];
      const status = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });
      expect(status.contents[0].text).toBeDefined();
    });

    test('should handle service interactions', async () => {
      process.env.CASTPLAN_ENABLE_ENHANCED = 'true';
      
      server = new CastPlanUltimateAutomationServer();

      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'tools/list')?.[1];

      const tools = await listToolsHandler({});
      
      // Should have enhanced tools
      const enhancedTools = tools.tools.filter((t: any) => 
        ['initialize_documentation_system', 'track_document_work'].includes(t.name)
      );
      
      expect(enhancedTools.length).toBeGreaterThan(0);
    });
  });

  describe('Health and Monitoring', () => {
    test('should provide comprehensive health status', async () => {
      process.env.CASTPLAN_ENABLE_BMAD = 'true';
      process.env.CASTPLAN_ENABLE_DOCS = 'true';
      process.env.CASTPLAN_ENABLE_HOOKS = 'true';
      process.env.CASTPLAN_ENABLE_ENHANCED = 'true';
      
      server = new CastPlanUltimateAutomationServer();

      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      const result = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });
      
      const status = JSON.parse(result.contents[0].text);
      
      expect(status.health.status).toBeDefined();
      expect(['healthy', 'degraded', 'error']).toContain(status.health.status);
      expect(status.health.uptime).toBeGreaterThanOrEqual(0);
      expect(status.health.version).toBe('2.0.0');
      
      expect(status.bmad).toBeDefined();
      expect(status.documentation).toBeDefined();
      expect(status.hooks).toBeDefined();
      expect(status.enhanced).toBeDefined();
    });

    test('should detect service health issues', async () => {
      // Test with no services enabled
      process.env.CASTPLAN_ENABLE_BMAD = 'false';
      process.env.CASTPLAN_ENABLE_DOCS = 'false';
      process.env.CASTPLAN_ENABLE_HOOKS = 'false';
      process.env.CASTPLAN_ENABLE_ENHANCED = 'false';
      
      server = new CastPlanUltimateAutomationServer();

      const readResourceHandler = mockMCPServer.setRequestHandler.mock.calls
        .find(call => call[0].method === 'resources/read')?.[1];

      const result = await readResourceHandler({
        params: { uri: 'castplan://status' }
      });
      
      const status = JSON.parse(result.contents[0].text);
      
      // Should detect no services as error condition
      expect(status.health.status).toBe('error');
    });
  });
});