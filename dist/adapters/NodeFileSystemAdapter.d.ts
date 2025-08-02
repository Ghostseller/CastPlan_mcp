import { Stats } from 'fs';
import { IAsyncFileSystem, ISyncFileSystem, IPathUtils } from '../interfaces/FileSystemAdapter.js';
/**
 * Node.js async file system adapter
 * Wraps fs/promises for async operations
 */
export declare class NodeAsyncFileSystem implements IAsyncFileSystem {
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(filePath: string, data: string, encoding?: BufferEncoding): Promise<void>;
    readdir(dirPath: string): Promise<string[]>;
    stat(filePath: string): Promise<Stats>;
    mkdir(dirPath: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    exists(filePath: string): Promise<boolean>;
}
/**
 * Node.js sync file system adapter
 * Wraps fs for sync operations
 */
export declare class NodeSyncFileSystem implements ISyncFileSystem {
    existsSync(filePath: string): boolean;
    mkdirSync(dirPath: string, options?: {
        recursive?: boolean;
    }): void;
    readFileSync(filePath: string, encoding?: BufferEncoding): string;
    writeFileSync(filePath: string, data: string, encoding?: BufferEncoding): void;
    readdirSync(dirPath: string): string[];
    statSync(filePath: string): Stats;
}
/**
 * Node.js path utilities adapter
 * Wraps path module for path operations
 */
export declare class NodePathUtils implements IPathUtils {
    join(...paths: string[]): string;
    relative(from: string, to: string): string;
    basename(filePath: string, ext?: string): string;
    dirname(filePath: string): string;
    resolve(...paths: string[]): string;
}
//# sourceMappingURL=NodeFileSystemAdapter.d.ts.map