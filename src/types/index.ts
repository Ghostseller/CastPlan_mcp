/**
 * CastPlan Ultimate Automation MCP Server - Unified Type System
 * 
 * This file serves as the central type export for all integrated services:
 * - BMAD (Business Model & Architecture Documentation)
 * - Documentation Automation
 * - Hooks Integration
 * - Enhanced AI-powered Documentation Features
 */

// Re-export all type modules - conflicts resolved by removing duplicates from bmad.types.ts
export * from './bmad.types.js';
export * from './documentation.types.js';
export * from './hooks.types.js';
export * from './enhanced.types.js';

// Core MCP types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Unified System Status
export interface UltimateSystemStatus {
  // BMAD Status
  bmad: {
    active: boolean;
    tasksCount: number;
    agentsCount: number;
    lastActivity?: string;
  };
  // Documentation Status
  documentation: {
    active: boolean;
    watchedPaths: number;
    lastUpdate: string;
    documentsTracked: number;
  };
  // Hooks Status
  hooks: {
    active: boolean;
    watchersCount: number;
    eventsProcessed: number;
    gitHooksInstalled: boolean;
  };
  // Enhanced Features Status
  enhanced: {
    active: boolean;
    aiEnabled: boolean;
    aiProvider?: 'openai' | 'anthropic' | 'local';
    lifecycleTracking: boolean;
    treeVisualization: boolean;
  };
  // Overall Health
  health: {
    status: 'healthy' | 'degraded' | 'error';
    uptime: number;
    version: string;
  };
}

// Localization Configuration
export interface LocalizationConfig {
  locale?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
}

// Unified Configuration
export interface UltimateAutomationConfig {
  // Project Settings
  projectRoot: string;
  databasePath: string;
  
  // Service Toggles
  services: {
    bmad: boolean;
    documentation: boolean;
    hooks: boolean;
    enhanced: boolean;
  };
  
  // AI Configuration
  ai: {
    enabled: boolean;
    provider?: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model?: string;
  };
  
  // Time & Locale
  timeZone: string;
  locale: string;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFile?: string;
  
  // Performance
  cacheEnabled: boolean;
  maxConcurrentOperations: number;
  
  // Watch Mode
  watchMode: boolean;
  watchPatterns?: string[];
  watchIgnored?: string[];
}