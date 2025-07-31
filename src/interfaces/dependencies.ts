/**
 * Dependency Injection Interfaces for HooksService
 * Enables testability by abstracting external dependencies
 */

export interface FileSystemAdapter {
  existsSync(path: string): boolean;
  writeFileSync(path: string, data: string): void;
  appendFileSync(path: string, data: string): void;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  chmodSync(path: string, mode: number): void;
}

export interface PathAdapter {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
}

export interface WatcherInstance {
  on(event: string, listener: (...args: any[]) => void): this;
  close(): Promise<void>;
}

export interface WatcherFactory {
  watch(patterns: string | string[], options?: any): WatcherInstance;
}

export interface HooksServiceDependencies {
  fileSystem?: FileSystemAdapter;
  pathAdapter?: PathAdapter;
  watcherFactory?: WatcherFactory;
}