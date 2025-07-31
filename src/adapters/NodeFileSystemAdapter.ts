/**
 * Node.js File System Adapter Implementation
 * 
 * Production implementations of file system interfaces that wrap
 * the actual Node.js fs and path modules.
 * 
 * Created: 2025-07-30
 */
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { Stats } from 'fs';
import { IAsyncFileSystem, ISyncFileSystem, IPathUtils } from '../interfaces/FileSystemAdapter.js';

/**
 * Node.js async file system adapter
 * Wraps fs/promises for async operations
 */
export class NodeAsyncFileSystem implements IAsyncFileSystem {
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return await fsPromises.readFile(filePath, encoding);
  }

  async writeFile(filePath: string, data: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
    await fsPromises.writeFile(filePath, data, encoding);
  }

  async readdir(dirPath: string): Promise<string[]> {
    return await fsPromises.readdir(dirPath);
  }

  async stat(filePath: string): Promise<Stats> {
    return await fsPromises.stat(filePath);
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fsPromises.mkdir(dirPath, options);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Node.js sync file system adapter
 * Wraps fs for sync operations
 */
export class NodeSyncFileSystem implements ISyncFileSystem {
  existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  mkdirSync(dirPath: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(dirPath, options);
  }

  readFileSync(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    return fs.readFileSync(filePath, encoding);
  }

  writeFileSync(filePath: string, data: string, encoding: BufferEncoding = 'utf8'): void {
    fs.writeFileSync(filePath, data, encoding);
  }

  readdirSync(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  }

  statSync(filePath: string): Stats {
    return fs.statSync(filePath);
  }
}

/**
 * Node.js path utilities adapter
 * Wraps path module for path operations
 */
export class NodePathUtils implements IPathUtils {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }
}