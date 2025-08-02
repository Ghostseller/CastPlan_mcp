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
    mkdir(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    exists(path: string): Promise<boolean>;
}
/**
 * Synchronous file system operations interface
 * Used for services that require sync file operations
 */
export interface ISyncFileSystem {
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): void;
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
export declare class MockAsyncFileSystem implements IAsyncFileSystem {
    private files;
    private directories;
    private stats;
    readFile(path: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<Stats>;
    mkdir(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    exists(path: string): Promise<boolean>;
    setFile(path: string, content: string): void;
    setDirectory(path: string): void;
    setStat(path: string, stat: Stats): void;
    clear(): void;
}
/**
 * Mock implementation for sync file system
 * Used in tests to control file system behavior
 */
export declare class MockSyncFileSystem implements ISyncFileSystem {
    private files;
    private directories;
    private stats;
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): void;
    readFileSync(path: string, encoding?: BufferEncoding): string;
    writeFileSync(path: string, data: string, encoding?: BufferEncoding): void;
    readdirSync(path: string): string[];
    statSync(path: string): Stats;
    setFile(path: string, content: string): void;
    setDirectory(path: string): void;
    setStat(path: string, stat: Stats): void;
    clear(): void;
}
/**
 * Mock implementation for path utilities
 * Used in tests to control path operations
 */
export declare class MockPathUtils implements IPathUtils {
    join(...paths: string[]): string;
    relative(from: string, to: string): string;
    basename(path: string, ext?: string): string;
    dirname(path: string): string;
    resolve(...paths: string[]): string;
}
//# sourceMappingURL=FileSystemAdapter.d.ts.map