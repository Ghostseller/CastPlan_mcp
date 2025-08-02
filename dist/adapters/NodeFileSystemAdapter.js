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
/**
 * Node.js async file system adapter
 * Wraps fs/promises for async operations
 */
export class NodeAsyncFileSystem {
    async readFile(filePath, encoding = 'utf8') {
        return await fsPromises.readFile(filePath, encoding);
    }
    async writeFile(filePath, data, encoding = 'utf8') {
        await fsPromises.writeFile(filePath, data, encoding);
    }
    async readdir(dirPath) {
        return await fsPromises.readdir(dirPath);
    }
    async stat(filePath) {
        return await fsPromises.stat(filePath);
    }
    async mkdir(dirPath, options) {
        await fsPromises.mkdir(dirPath, options);
    }
    async exists(filePath) {
        try {
            await fsPromises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
}
/**
 * Node.js sync file system adapter
 * Wraps fs for sync operations
 */
export class NodeSyncFileSystem {
    existsSync(filePath) {
        return fs.existsSync(filePath);
    }
    mkdirSync(dirPath, options) {
        fs.mkdirSync(dirPath, options);
    }
    readFileSync(filePath, encoding = 'utf8') {
        return fs.readFileSync(filePath, encoding);
    }
    writeFileSync(filePath, data, encoding = 'utf8') {
        fs.writeFileSync(filePath, data, encoding);
    }
    readdirSync(dirPath) {
        return fs.readdirSync(dirPath);
    }
    statSync(filePath) {
        return fs.statSync(filePath);
    }
}
/**
 * Node.js path utilities adapter
 * Wraps path module for path operations
 */
export class NodePathUtils {
    join(...paths) {
        return path.join(...paths);
    }
    relative(from, to) {
        return path.relative(from, to);
    }
    basename(filePath, ext) {
        return path.basename(filePath, ext);
    }
    dirname(filePath) {
        return path.dirname(filePath);
    }
    resolve(...paths) {
        return path.resolve(...paths);
    }
}
//# sourceMappingURL=NodeFileSystemAdapter.js.map