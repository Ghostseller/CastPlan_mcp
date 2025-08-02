/**
 * Type definitions for CastPlan MCP
 */

import type { Logger } from 'winston';

export interface ServerConfig {
  projectRoot: string;
  databasePath: string;
  services: {
    bmad: boolean;
    documentation: boolean;
    hooks: boolean;
    enhanced: boolean;
  };
  ai: {
    enabled: boolean;
    provider: 'openai' | 'claude' | 'google' | 'azure';
    apiKey?: string;
    model?: string;
  };
  timeZone: string;
  locale: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logFile?: string;
  cacheEnabled: boolean;
  maxConcurrentOperations: number;
  watchMode: boolean;
  watchPatterns?: string[];
  watchIgnored?: string[];
}

export type ToolHandler = (args: any) => Promise<any>;

export interface ServiceStatus {
  bmad: {
    enabled: boolean;
    taskCount: number;
    backlogCount: number;
    currentTodo?: string;
  };
  documentation: {
    enabled: boolean;
    projectCount: number;
    trackMode: string;
    pendingAnalysis: number;
  };
  hooks: {
    enabled: boolean;
    configuredHooks: number;
    executionHistory: number;
    recentExecutions: any[];
  };
  enhanced: {
    enabled: boolean;
    aiEnabled: boolean;
    i18nLocale?: string;
    cacheConnected: boolean;
    documentsTracked: number;
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
    status?: 'healthy' | 'degraded' | 'error';
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  message: string;
  timestamp: Date;
}

export interface DegradationConfig {
  name: string;
  essential: boolean;
  fallbackAvailable: boolean;
  degradationThreshold: number;
  recoveryThreshold: number;
}

export interface FeatureConfig {
  enabled: boolean;
  degradationLevel: number;
  fallback?: () => Promise<any>;
}

export interface I18nConfig {
  locale: string;
  timezone: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix: string;
  enableTLS: boolean;
  connectionTimeout: number;
  commandTimeout: number;
}

export interface AIAnalysisResult {
  score: number | null;
  insights: string[];
  suggestions: string[];
  metrics?: Record<string, any>;
}

export interface DocumentLifecycle {
  id: string;
  path: string;
  type: string;
  phase: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface DocumentConnection {
  source: string;
  target: string;
  type: string;
  strength: number;
  metadata?: Record<string, any>;
}

export interface BMADModel {
  businessModel: {
    vision: string;
    mission: string;
    values: string[];
    objectives: string[];
  };
  architecture: {
    layers: string[];
    components: Record<string, any>;
    dependencies: string[];
  };
  documentation: {
    documents: any[];
    lastUpdated: Date;
  };
}

export interface HookConfig {
  id: string;
  event: string;
  command: string;
  active: boolean;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface TaskDefinition {
  id: string;
  task_name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  updated_at: Date;
  assigned_to?: string;
  due_date?: Date;
  tags?: string[];
  dependencies?: string[];
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  priority: number;
  effort_estimate?: number;
  business_value?: number;
  created_at: Date;
  updated_at: Date;
  tags?: string[];
  acceptance_criteria?: string[];
}

export interface DocumentationProject {
  id: string;
  name: string;
  path: string;
  trackMode: 'manual' | 'auto';
  status: 'active' | 'archived';
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface EnhancedServices {
  dateTimeService: any;
  lifecycleService: any;
  connectionService: any;
  treeService: any;
  aiService?: any;
  i18nService?: any;
  cacheService?: any;
  logger: Logger;
  config: ServerConfig;
}