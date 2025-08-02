/**
 * Mock implementation for async file system
 * Used in tests to control file system behavior
 */
export class MockAsyncFileSystem {
    files = new Map();
    directories = new Set();
    stats = new Map();
    async readFile(path, encoding) {
        if (!this.files.has(path)) {
            throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return this.files.get(path);
    }
    async writeFile(path, data, encoding) {
        this.files.set(path, data);
    }
    async readdir(path) {
        if (!this.directories.has(path)) {
            throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
        }
        const result = [];
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
    async stat(path) {
        if (!this.stats.has(path)) {
            throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }
        return this.stats.get(path);
    }
    async mkdir(path, options) {
        this.directories.add(path);
    }
    async exists(path) {
        return this.files.has(path) || this.directories.has(path);
    }
    // Test helper methods
    setFile(path, content) {
        this.files.set(path, content);
    }
    setDirectory(path) {
        this.directories.add(path);
    }
    setStat(path, stat) {
        this.stats.set(path, stat);
    }
    clear() {
        this.files.clear();
        this.directories.clear();
        this.stats.clear();
    }
}
/**
 * Mock implementation for sync file system
 * Used in tests to control file system behavior
 */
export class MockSyncFileSystem {
    files = new Map();
    directories = new Set();
    stats = new Map();
    existsSync(path) {
        return this.files.has(path) || this.directories.has(path);
    }
    mkdirSync(path, options) {
        this.directories.add(path);
    }
    readFileSync(path, encoding) {
        if (!this.files.has(path)) {
            throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return this.files.get(path);
    }
    writeFileSync(path, data, encoding) {
        this.files.set(path, data);
    }
    readdirSync(path) {
        if (!this.directories.has(path)) {
            throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
        }
        const result = [];
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
    statSync(path) {
        if (!this.stats.has(path)) {
            throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }
        return this.stats.get(path);
    }
    // Test helper methods
    setFile(path, content) {
        this.files.set(path, content);
    }
    setDirectory(path) {
        this.directories.add(path);
    }
    setStat(path, stat) {
        this.stats.set(path, stat);
    }
    clear() {
        this.files.clear();
        this.directories.clear();
        this.stats.clear();
    }
}
/**
 * Mock implementation for path utilities
 * Used in tests to control path operations
 */
export class MockPathUtils {
    join(...paths) {
        return paths.join('/');
    }
    relative(from, to) {
        return to.replace(from + '/', '');
    }
    basename(path, ext) {
        const base = path.split('/').pop() || '';
        return ext ? base.replace(ext, '') : base;
    }
    dirname(path) {
        return path.split('/').slice(0, -1).join('/');
    }
    resolve(...paths) {
        return paths.join('/');
    }
}
//# sourceMappingURL=FileSystemAdapter.js.map