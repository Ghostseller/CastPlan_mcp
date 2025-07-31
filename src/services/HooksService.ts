import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { 
  HookEvent, 
  HookResponse, 
  FileWatchConfig, 
  NotificationConfig,
  HookRequest
} from '../types/hooks.types.js';
import {
  FileSystemAdapter,
  PathAdapter,
  WatcherFactory,
  WatcherInstance,
  HooksServiceDependencies
} from '../interfaces/dependencies.js';

// Default implementations
class DefaultFileSystemAdapter implements FileSystemAdapter {
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  writeFileSync(path: string, data: string): void {
    fs.writeFileSync(path, data);
  }

  appendFileSync(path: string, data: string): void {
    fs.appendFileSync(path, data);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(path, options);
  }

  chmodSync(path: string, mode: number): void {
    fs.chmodSync(path, mode);
  }
}

class DefaultPathAdapter implements PathAdapter {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }
}

class ChokidarWatcherInstance implements WatcherInstance {
  constructor(private watcher: any) {}

  on(event: string, listener: (...args: any[]) => void): this {
    this.watcher.on(event, listener);
    return this;
  }

  async close(): Promise<void> {
    return await this.watcher.close();
  }
}

class DefaultWatcherFactory implements WatcherFactory {
  watch(patterns: string | string[], options?: any): WatcherInstance {
    const watcher = chokidar.watch(patterns, options);
    return new ChokidarWatcherInstance(watcher);
  }
}

export class HooksService extends EventEmitter {
  private projectRoot: string;
  private watchers: Map<string, WatcherInstance> = new Map();
  private eventHistory: HookEvent[] = [];
  private config: {
    fileWatch: FileWatchConfig;
    notifications: NotificationConfig;
    gitIntegration: boolean;
  };
  
  // Dependency injection
  private fileSystem: FileSystemAdapter;
  private pathAdapter: PathAdapter;
  private watcherFactory: WatcherFactory;

  constructor(projectRoot: string, dependencies?: HooksServiceDependencies) {
    super();
    this.projectRoot = projectRoot;
    
    // Initialize dependencies with defaults or injected instances
    this.fileSystem = dependencies?.fileSystem || new DefaultFileSystemAdapter();
    this.pathAdapter = dependencies?.pathAdapter || new DefaultPathAdapter();
    this.watcherFactory = dependencies?.watcherFactory || new DefaultWatcherFactory();
    
    this.config = this.getDefaultConfig();
    this.setupEventHandlers();
  }

  private getDefaultConfig() {
    return {
      fileWatch: {
        patterns: [
          '**/*.ts',
          '**/*.tsx',
          '**/*.js',
          '**/*.jsx',
          '**/*.md',
          '**/*.json',
          '**/package.json',
          '**/tsconfig.json',
          '**/.env*',
          '**/prisma/schema.prisma'
        ],
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/coverage/**',
          '**/logs/**',
          '**/*.log'
        ],
        persistent: true,
        ignoreInitial: true
      },
      notifications: {
        enabled: true,
        channels: ['console', 'file'] as ('console' | 'file' | 'webhook')[],
        logFile: this.pathAdapter.join(this.projectRoot, 'logs', 'hooks.log')
      },
      gitIntegration: true
    };
  }

  private setupEventHandlers(): void {
    this.on('file-change', this.handleFileChange.bind(this));
    this.on('pre-work', this.handlePreWork.bind(this));
    this.on('post-work', this.handlePostWork.bind(this));
    this.on('session-start', this.handleSessionStart.bind(this));
    this.on('session-end', this.handleSessionEnd.bind(this));
  }

  async processHookRequest(request: HookRequest): Promise<HookResponse> {
    try {
      // Update config if provided
      if (request.config) {
        this.updateConfig(request.config);
      }

      // Process the event
      const response = await this.processEvent(request.event);
      
      // Log the event
      this.logEvent(request.event);
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: `Hook processing failed: ${error.message}`
      };
    }
  }

  private async processEvent(event: HookEvent): Promise<HookResponse> {
    switch (event.type) {
      case 'pre-work':
        return await this.handlePreWorkEvent(event);
      case 'post-work':
        return await this.handlePostWorkEvent(event);
      case 'file-change':
        return await this.handleFileChangeEvent(event);
      case 'session-start':
        return await this.handleSessionStartEvent(event);
      case 'session-end':
        return await this.handleSessionEndEvent(event);
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  private async handlePreWorkEvent(event: HookEvent): Promise<HookResponse> {
    const files = event.data.files || [];
    const context = event.data.context || '';

    // Emit internal event for documentation service integration
    this.emit('pre-work', { files, context, timestamp: event.timestamp });

    // Generate notifications
    await this.notify('pre-work', `Starting work on ${files.length} files: ${context}`);

    return {
      success: true,
      message: `Pre-work hooks processed for ${files.length} files`,
      data: {
        files,
        context,
        recommendations: await this.generatePreWorkRecommendations(files, context)
      }
    };
  }

  private async handlePostWorkEvent(event: HookEvent): Promise<HookResponse> {
    const files = event.data.files || [];
    const changes = event.data.changes || '';
    const context = event.data.context || '';

    // Emit internal event for documentation service integration
    this.emit('post-work', { files, changes, context, timestamp: event.timestamp });

    // Generate notifications
    await this.notify('post-work', `Completed work on ${files.length} files: ${changes}`);

    // Run post-work validations
    const validations = await this.runPostWorkValidations(files, changes);

    return {
      success: true,
      message: `Post-work hooks processed for ${files.length} files`,
      data: {
        files,
        changes,
        context,
        validations
      }
    };
  }

  private async handleFileChangeEvent(event: HookEvent): Promise<HookResponse> {
    const filePath = event.data.filePath;
    const changeType = event.data.changeType; // 'add', 'change', 'unlink'

    // Emit internal event
    this.emit('file-change', { filePath, changeType, timestamp: event.timestamp });

    // Check if this is a significant change
    const isSignificant = await this.isSignificantChange(filePath, changeType);

    if (isSignificant) {
      await this.notify('file-change', `Significant file change detected: ${filePath} (${changeType})`);
    }

    return {
      success: true,
      message: `File change processed: ${filePath}`,
      data: {
        filePath,
        changeType,
        significant: isSignificant
      }
    };
  }

  private async handleSessionStartEvent(event: HookEvent): Promise<HookResponse> {
    const sessionInfo = event.data;

    // Emit internal event
    this.emit('session-start', { sessionInfo, timestamp: event.timestamp });

    // Setup session monitoring
    await this.setupSessionMonitoring(sessionInfo);

    await this.notify('session-start', `Development session started: ${sessionInfo.sessionId || 'unknown'}`);

    return {
      success: true,
      message: 'Session start hooks processed',
      data: sessionInfo
    };
  }

  private async handleSessionEndEvent(event: HookEvent): Promise<HookResponse> {
    const sessionInfo = event.data;

    // Emit internal event
    this.emit('session-end', { sessionInfo, timestamp: event.timestamp });

    // Cleanup session monitoring
    await this.cleanupSessionMonitoring(sessionInfo);

    // Generate session summary
    const summary = await this.generateSessionSummary(sessionInfo);

    await this.notify('session-end', `Development session ended with ${summary.filesModified} files modified`);

    return {
      success: true,
      message: 'Session end hooks processed',
      data: {
        sessionInfo,
        summary
      }
    };
  }

  // File watching methods
  async startFileWatching(patterns?: string[]): Promise<void> {
    const watchPatterns = patterns || this.config.fileWatch.patterns;
    
    const watcher = this.watcherFactory.watch(watchPatterns, {
      ignored: this.config.fileWatch.ignored,
      persistent: this.config.fileWatch.persistent,
      ignoreInitial: this.config.fileWatch.ignoreInitial,
      cwd: this.projectRoot
    });

    watcher
      .on('add', (path) => this.handleFileSystemEvent('add', path))
      .on('change', (path) => this.handleFileSystemEvent('change', path))
      .on('unlink', (path) => this.handleFileSystemEvent('unlink', path))
      .on('error', (error) => console.error('File watcher error:', error));

    this.watchers.set('main', watcher);
    await this.notify('system', 'File watching started');
  }

  async stopFileWatching(): Promise<void> {
    const watcherEntries = Array.from(this.watchers.entries());
    for (const [name, watcher] of watcherEntries) {
      await watcher.close();
      this.watchers.delete(name);
    }
    await this.notify('system', 'File watching stopped');
  }

  private async handleFileSystemEvent(eventType: string, filePath: string): Promise<void> {
    const event: HookEvent = {
      type: 'file-change',
      data: {
        filePath: this.pathAdapter.resolve(this.projectRoot, filePath),
        changeType: eventType
      },
      timestamp: new Date().toISOString()
    };

    await this.processEvent(event);
  }

  // Git integration methods
  async setupGitHooks(): Promise<boolean> {
    if (!this.config.gitIntegration) {
      return false;
    }

    const hooksDir = this.pathAdapter.join(this.projectRoot, '.git', 'hooks');
    
    if (!this.fileSystem.existsSync(hooksDir)) {
      return false;
    }

    try {
      // Create pre-commit hook
      const preCommitHook = this.generatePreCommitHook();
      this.fileSystem.writeFileSync(this.pathAdapter.join(hooksDir, 'pre-commit'), preCommitHook);

      // Create post-commit hook
      const postCommitHook = this.generatePostCommitHook();
      this.fileSystem.writeFileSync(this.pathAdapter.join(hooksDir, 'post-commit'), postCommitHook);

      // Make hooks executable (Unix systems)
      if (process.platform !== 'win32') {
        this.fileSystem.chmodSync(this.pathAdapter.join(hooksDir, 'pre-commit'), 0o755);
        this.fileSystem.chmodSync(this.pathAdapter.join(hooksDir, 'post-commit'), 0o755);
      }

      await this.notify('system', 'Git hooks setup completed');
      return true;
    } catch (error: any) {
      console.error('Failed to setup git hooks:', error);
      return false;
    }
  }

  private generatePreCommitHook(): string {
    return `#!/bin/sh
# CastPlan Automation Pre-commit Hook

# Get staged files
changed_files=$(git diff --cached --name-only)

if [ ! -z "$changed_files" ]; then
  echo "🔍 Running pre-commit hooks..."
  
  # Trigger pre-work event via MCP
  # This would typically call the MCP server
  echo "Files to be committed: $changed_files"
fi
`;
  }

  private generatePostCommitHook(): string {
    return `#!/bin/sh
# CastPlan Automation Post-commit Hook

# Get committed files
changed_files=$(git diff-tree --no-commit-id --name-only -r HEAD)
commit_message=$(git log -1 --pretty=%B)

if [ ! -z "$changed_files" ]; then
  echo "📝 Running post-commit hooks..."
  
  # Trigger post-work event via MCP
  # This would typically call the MCP server
  echo "Files committed: $changed_files"
  echo "Commit message: $commit_message"
fi
`;
  }

  // Utility methods
  private async generatePreWorkRecommendations(files: string[], context: string): Promise<string[]> {
    const recommendations: string[] = [];

    // Check if documentation should be referenced
    if (files.some(f => f.includes('.ts') || f.includes('.tsx'))) {
      recommendations.push('Consider reviewing TypeScript best practices documentation');
    }

    if (files.some(f => f.includes('test'))) {
      recommendations.push('Review testing guidelines and coverage requirements');
    }

    if (files.some(f => f.includes('api') || f.includes('route'))) {
      recommendations.push('Check API documentation and security guidelines');
    }

    if (context.toLowerCase().includes('security')) {
      recommendations.push('Review security documentation and run security checks');
    }

    return recommendations;
  }

  private async runPostWorkValidations(files: string[], changes: string): Promise<any[]> {
    const validations: any[] = [];

    try {
      // Lint check for TypeScript files
      const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      if (tsFiles.length > 0) {
        validations.push({
          type: 'lint',
          status: 'pending',
          message: `${tsFiles.length} TypeScript files need linting`
        });
      }

      // Test validation
      const testFiles = files.filter(f => f.includes('test') || f.includes('spec'));
      if (testFiles.length > 0) {
        validations.push({
          type: 'test',
          status: 'pending',
          message: `${testFiles.length} test files modified`
        });
      }

      // Documentation validation
      if (files.some(f => f.endsWith('.md'))) {
        validations.push({
          type: 'documentation',
          status: 'completed',
          message: 'Documentation files updated'
        });
      }

    } catch (error: any) {
      validations.push({
        type: 'error',
        status: 'failed',
        message: `Validation error: ${error.message}`
      });
    }

    return validations;
  }

  private async isSignificantChange(filePath: string, changeType: string): Promise<boolean> {
    // Configuration files are always significant
    const configFiles = ['package.json', 'tsconfig.json', '.env', 'schema.prisma'];
    if (configFiles.some(cf => filePath.includes(cf))) {
      return true;
    }

    // API and service files are significant
    if (filePath.includes('api/') || filePath.includes('service') || filePath.includes('route')) {
      return true;
    }

    // Database migrations are significant
    if (filePath.includes('migration') || filePath.includes('prisma')) {
      return true;
    }

    // New file additions in core directories
    if (changeType === 'add' && (filePath.includes('src/') || filePath.includes('components/'))) {
      return true;
    }

    return false;
  }

  private async setupSessionMonitoring(sessionInfo: any): Promise<void> {
    // Start file watching if not already active
    if (this.watchers.size === 0) {
      await this.startFileWatching();
    }

    // Setup session-specific monitoring
    sessionInfo.startTime = new Date().toISOString();
    sessionInfo.filesModified = [];
  }

  private async cleanupSessionMonitoring(sessionInfo: any): Promise<void> {
    // Keep file watching active for continuous monitoring
    // Just cleanup session-specific data
    sessionInfo.endTime = new Date().toISOString();
  }

  private async generateSessionSummary(sessionInfo: any): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(sessionInfo.startTime || endTime);
    const duration = endTime.getTime() - startTime.getTime();

    return {
      duration: Math.round(duration / 1000 / 60), // minutes
      filesModified: sessionInfo.filesModified?.length || 0,
      eventsProcessed: this.eventHistory.filter(e => 
        new Date(e.timestamp) >= startTime
      ).length
    };
  }

  private async notify(channel: string, message: string): Promise<void> {
    if (!this.config.notifications.enabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${channel.toUpperCase()}] ${message}`;

    // Console notification
    if (this.config.notifications.channels.includes('console')) {
      console.log(logMessage);
    }

    // File notification
    if (this.config.notifications.channels.includes('file') && this.config.notifications.logFile) {
      try {
        const logDir = this.pathAdapter.dirname(this.config.notifications.logFile);
        if (!this.fileSystem.existsSync(logDir)) {
          this.fileSystem.mkdirSync(logDir, { recursive: true });
        }
        this.fileSystem.appendFileSync(this.config.notifications.logFile, logMessage + '\n');
      } catch (error: any) {
        console.warn('Failed to write to log file:', error.message);
      }
    }

    // Webhook notification
    if (this.config.notifications.channels.includes('webhook') && this.config.notifications.webhookUrl) {
      try {
        // Would implement webhook notification here
        console.log('Webhook notification:', message);
      } catch (error: any) {
        console.warn('Failed to send webhook notification:', error.message);
      }
    }
  }

  private logEvent(event: HookEvent): void {
    this.eventHistory.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
  }

  private updateConfig(partialConfig: any): void {
    this.config = {
      ...this.config,
      ...partialConfig
    };
  }

  // Event handlers for integration with other services
  private async handleFileChange(data: any): Promise<void> {
    // This can be used by other services to react to file changes
    console.log('File change detected:', data);
  }

  private async handlePreWork(data: any): Promise<void> {
    // This can be used by documentation service
    console.log('Pre-work event:', data);
  }

  private async handlePostWork(data: any): Promise<void> {
    // This can be used by documentation service
    console.log('Post-work event:', data);
  }

  private async handleSessionStart(data: any): Promise<void> {
    console.log('Session started:', data);
  }

  private async handleSessionEnd(data: any): Promise<void> {
    console.log('Session ended:', data);
  }

  // Public API methods
  async getEventHistory(): Promise<HookEvent[]> {
    return [...this.eventHistory];
  }

  async getActiveWatchers(): Promise<string[]> {
    return Array.from(this.watchers.keys());
  }

  async getConfig(): Promise<any> {
    return { ...this.config };
  }

  async updateNotificationConfig(config: Partial<NotificationConfig>): Promise<void> {
    this.config.notifications = {
      ...this.config.notifications,
      ...config
    };
  }

  async updateFileWatchConfig(config: Partial<FileWatchConfig>): Promise<void> {
    this.config.fileWatch = {
      ...this.config.fileWatch,
      ...config
    };

    // Restart file watching with new config
    if (this.watchers.size > 0) {
      await this.stopFileWatching();
      await this.startFileWatching();
    }
  }
}