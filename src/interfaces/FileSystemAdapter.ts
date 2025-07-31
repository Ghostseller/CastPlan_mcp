/**
 * File System Adapter Interfaces
 * 
 * Provides abstraction layer for file system operations to enable
 * dependency injection and proper testing of business logic.
 * 
 * Created: 2025-07-30
 */
import { Stats } from 'fs';

/**
 * Asynchronous file system operations interface
 * Used for services that require async file operations
 */
export interface IAsyncFileSystem {
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<Stats>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/**
 * Synchronous file system operations interface
 * Used for services that require sync file operations
 */
export interface ISyncFileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readFileSync(path: string, encoding?: BufferEncoding): string;
  writeFileSync(path: string, data: string, encoding?: BufferEncoding): void;
  readdirSync(path: string): string[];
  statSync(path: string): Stats;
}

/**
 * Path utilities interface
 * Provides path manipulation operations
 */
export interface IPathUtils {
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  basename(path: string, ext?: string): string;
  dirname(path: string): string;
  resolve(...paths: string[]): string;
}

/**
 * Mock implementation for async file system
 * Used in tests to control file system behavior
 */
export class MockAsyncFileSystem implements IAsyncFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private stats: Map<string, Stats> = new Map();

  async readFile(path: string, encoding?: BufferEncoding): Promise<string> {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.files.get(path)!;
  }

  async writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void> {
    this.files.set(path, data);
  }

  async readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    
    const result: string[] = [];
    // Find all files and directories that are direct children of the path
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/') && !filePath.substring(path.length + 1).includes('/')) {
        result.push(filePath.substring(path.length + 1));
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(path + '/') && !dirPath.substring(path.length + 1).includes('/')) {
        result.push(dirPath.substring(path.length + 1));
      }
    }
    return result;
  }

  async stat(path: string): Promise<Stats> {
    if (!this.stats.has(path)) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    return this.stats.get(path)!;
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    this.directories.add(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  // Test helper methods
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  setDirectory(path: string): void {
    this.directories.add(path);
  }

  setStat(path: string, stat: Stats): void {
    this.stats.set(path, stat);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.stats.clear();
  }
}

/**
 * Mock implementation for sync file system
 * Used in tests to control file system behavior
 */
export class MockSyncFileSystem implements ISyncFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private stats: Map<string, Stats> = new Map();

  existsSync(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    this.directories.add(path);
  }

  readFileSync(path: string, encoding?: BufferEncoding): string {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.files.get(path)!;
  }

  writeFileSync(path: string, data: string, encoding?: BufferEncoding): void {
    this.files.set(path, data);
  }

  readdirSync(path: string): string[] {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    
    const result: string[] = [];
    // Find all files and directories that are direct children of the path
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/') && !filePath.substring(path.length + 1).includes('/')) {
        result.push(filePath.substring(path.length + 1));
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(path + '/') && !dirPath.substring(path.length + 1).includes('/')) {
        result.push(dirPath.substring(path.length + 1));
      }
    }
    return result;
  }

  statSync(path: string): Stats {
    if (!this.stats.has(path)) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    return this.stats.get(path)!;
  }

  // Test helper methods
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  setDirectory(path: string): void {
    this.directories.add(path);
  }

  setStat(path: string, stat: Stats): void {
    this.stats.set(path, stat);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.stats.clear();
  }
}

/**
 * Mock implementation for path utilities
 * Used in tests to control path operations
 */
export class MockPathUtils implements IPathUtils {
  join(...paths: string[]): string {
    return paths.join('/');
  }

  relative(from: string, to: string): string {
    return to.replace(from + '/', '');
  }

  basename(path: string, ext?: string): string {
    const base = path.split('/').pop() || '';
    return ext ? base.replace(ext, '') : base;
  }

  dirname(path: string): string {
    return path.split('/').slice(0, -1).join('/');
  }

  resolve(...paths: string[]): string {
    return paths.join('/');
  }
}