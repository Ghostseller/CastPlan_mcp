/**
 * Project Analyzer
 *
 * Automatically detects project type, framework, and structure
 * to generate optimal configuration
 *
 * Created: 2025-07-31
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export class ProjectAnalyzer {
    logger;
    projectRoot;
    constructor(projectRoot, logger) {
        this.projectRoot = path.resolve(projectRoot);
        this.logger = logger;
    }
    /**
     * Analyze project and return comprehensive information
     */
    async analyzeProject() {
        try {
            this.logger.debug(`Analyzing project at: ${this.projectRoot}`);
            const [projectInfo, detectedFrameworks, packageManagers, documentationPatterns, recommendedCategories] = await Promise.all([
                this.detectProjectInfo(),
                this.detectFrameworks(),
                this.detectPackageManagers(),
                this.detectDocumentationPatterns(),
                this.generateRecommendedCategories()
            ]);
            const confidence = this.calculateConfidence(projectInfo, detectedFrameworks, packageManagers);
            return {
                projectInfo,
                detectedFrameworks,
                packageManagers,
                documentationPatterns,
                recommendedCategories,
                confidence
            };
        }
        catch (error) {
            this.logger.error('Failed to analyze project:', error);
            throw error;
        }
    }
    /**
     * Detect basic project information
     */
    async detectProjectInfo() {
        const projectName = await this.detectProjectName();
        const projectType = await this.detectProjectType();
        const framework = await this.detectPrimaryFramework();
        const version = await this.detectProjectVersion();
        const description = await this.detectProjectDescription();
        return {
            name: projectName,
            root: this.projectRoot,
            type: projectType,
            framework,
            version,
            description
        };
    }
    /**
     * Detect project name from various sources
     */
    async detectProjectName() {
        // Try package.json first
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            if (packageJson.name) {
                return this.sanitizeProjectName(packageJson.name);
            }
        }
        catch {
            // Ignore package.json errors
        }
        // Try pyproject.toml
        try {
            const pyprojectPath = path.join(this.projectRoot, 'pyproject.toml');
            const pyprojectContent = await fs.readFile(pyprojectPath, 'utf8');
            const nameMatch = pyprojectContent.match(/name\s*=\s*["']([^"']+)["']/);
            if (nameMatch) {
                return this.sanitizeProjectName(nameMatch[1]);
            }
        }
        catch {
            // Ignore pyproject.toml errors
        }
        // Try Cargo.toml
        try {
            const cargoPath = path.join(this.projectRoot, 'Cargo.toml');
            const cargoContent = await fs.readFile(cargoPath, 'utf8');
            const nameMatch = cargoContent.match(/name\s*=\s*["']([^"']+)["']/);
            if (nameMatch) {
                return this.sanitizeProjectName(nameMatch[1]);
            }
        }
        catch {
            // Ignore Cargo.toml errors
        }
        // Fall back to directory name
        return this.sanitizeProjectName(path.basename(this.projectRoot));
    }
    /**
     * Sanitize project name for use as environment variable prefix
     */
    sanitizeProjectName(name) {
        return name
            .replace(/[@\/\\]/g, '') // Remove package scope and path separators
            .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
            .replace(/_+/g, '_') // Collapse multiple underscores
            .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            .toUpperCase();
    }
    /**
     * Detect project type (node, python, mixed, unknown)
     */
    async detectProjectType() {
        const files = await this.getProjectFiles();
        const hasNodeFiles = files.some(f => f.endsWith('package.json') ||
            f.endsWith('.js') ||
            f.endsWith('.ts') ||
            f.endsWith('.jsx') ||
            f.endsWith('.tsx'));
        const hasPythonFiles = files.some(f => f.endsWith('pyproject.toml') ||
            f.endsWith('requirements.txt') ||
            f.endsWith('setup.py') ||
            f.endsWith('.py'));
        if (hasNodeFiles && hasPythonFiles) {
            return 'mixed';
        }
        else if (hasNodeFiles) {
            return 'node';
        }
        else if (hasPythonFiles) {
            return 'python';
        }
        return 'unknown';
    }
    /**
     * Detect primary framework
     */
    async detectPrimaryFramework() {
        const frameworks = await this.detectFrameworks();
        // Priority order for framework selection
        const frameworkPriority = [
            'react', 'vue', 'angular', 'express', 'fastapi', 'django', 'flask'
        ];
        for (const framework of frameworkPriority) {
            if (frameworks.includes(framework)) {
                return framework;
            }
        }
        return undefined;
    }
    /**
     * Detect all frameworks present in the project
     */
    async detectFrameworks() {
        const frameworks = [];
        try {
            // Check package.json dependencies
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
                ...packageJson.peerDependencies
            };
            // Node.js frameworks
            if (allDeps.react)
                frameworks.push('react');
            if (allDeps.vue)
                frameworks.push('vue');
            if (allDeps['@angular/core'])
                frameworks.push('angular');
            if (allDeps.express)
                frameworks.push('express');
            if (allDeps.next)
                frameworks.push('next');
            if (allDeps.nuxt)
                frameworks.push('nuxt');
            if (allDeps.svelte)
                frameworks.push('svelte');
        }
        catch {
            // Ignore package.json errors
        }
        try {
            // Check Python requirements
            const requirementsPath = path.join(this.projectRoot, 'requirements.txt');
            const requirements = await fs.readFile(requirementsPath, 'utf8');
            if (requirements.includes('fastapi'))
                frameworks.push('fastapi');
            if (requirements.includes('django'))
                frameworks.push('django');
            if (requirements.includes('flask'))
                frameworks.push('flask');
            if (requirements.includes('starlette'))
                frameworks.push('starlette');
        }
        catch {
            // Ignore requirements.txt errors
        }
        try {
            // Check pyproject.toml
            const pyprojectPath = path.join(this.projectRoot, 'pyproject.toml');
            const pyproject = await fs.readFile(pyprojectPath, 'utf8');
            if (pyproject.includes('fastapi'))
                frameworks.push('fastapi');
            if (pyproject.includes('django'))
                frameworks.push('django');
            if (pyproject.includes('flask'))
                frameworks.push('flask');
        }
        catch {
            // Ignore pyproject.toml errors
        }
        return [...new Set(frameworks)]; // Remove duplicates
    }
    /**
     * Detect available package managers
     */
    async detectPackageManagers() {
        const packageManagers = [];
        // Check for Node.js package managers
        if (await this.fileExists('package.json')) {
            if (await this.fileExists('package-lock.json'))
                packageManagers.push('npm');
            if (await this.fileExists('yarn.lock'))
                packageManagers.push('yarn');
            if (await this.fileExists('pnpm-lock.yaml'))
                packageManagers.push('pnpm');
        }
        // Check for Python package managers
        if (await this.fileExists('pyproject.toml')) {
            packageManagers.push('uv', 'uvx');
        }
        if (await this.fileExists('requirements.txt') || await this.fileExists('setup.py')) {
            packageManagers.push('pip');
        }
        return [...new Set(packageManagers)];
    }
    /**
     * Detect documentation patterns based on project structure
     */
    async detectDocumentationPatterns() {
        const patterns = ['**/*.md', '**/README.md'];
        // Add framework-specific patterns
        const frameworks = await this.detectFrameworks();
        if (frameworks.includes('react') || frameworks.includes('vue')) {
            patterns.push('**/components/**/*.md', '**/stories/**/*.md');
        }
        // Add common documentation directories
        if (await this.directoryExists('docs')) {
            patterns.push('docs/**/*.md', 'docs/**/*.rst');
        }
        if (await this.directoryExists('documentation')) {
            patterns.push('documentation/**/*.md');
        }
        if (await this.directoryExists('wiki')) {
            patterns.push('wiki/**/*.md');
        }
        return patterns;
    }
    /**
     * Generate recommended categories based on project analysis
     */
    async generateRecommendedCategories() {
        const categories = ['documentation', 'architecture', 'api'];
        const frameworks = await this.detectFrameworks();
        const projectType = await this.detectProjectType();
        // Add framework-specific categories
        if (frameworks.includes('react')) {
            categories.push('components', 'hooks', 'pages', 'utils', 'styles');
        }
        if (frameworks.includes('vue')) {
            categories.push('components', 'composables', 'pages', 'stores');
        }
        if (frameworks.includes('express')) {
            categories.push('routes', 'middleware', 'controllers', 'models', 'services');
        }
        if (frameworks.includes('fastapi') || frameworks.includes('django') || frameworks.includes('flask')) {
            categories.push('models', 'views', 'serializers', 'middleware', 'services');
        }
        // Add type-specific categories
        if (projectType === 'python') {
            categories.push('modules', 'classes', 'functions', 'tests');
        }
        if (projectType === 'node') {
            categories.push('modules', 'types', 'tests', 'config');
        }
        return [...new Set(categories)];
    }
    /**
     * Get project version from various sources
     */
    async detectProjectVersion() {
        // Try package.json
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            if (packageJson.version) {
                return packageJson.version;
            }
        }
        catch {
            // Ignore errors
        }
        // Try pyproject.toml
        try {
            const pyprojectPath = path.join(this.projectRoot, 'pyproject.toml');
            const pyprojectContent = await fs.readFile(pyprojectPath, 'utf8');
            const versionMatch = pyprojectContent.match(/version\s*=\s*["']([^"']+)["']/);
            if (versionMatch) {
                return versionMatch[1];
            }
        }
        catch {
            // Ignore errors
        }
        return undefined;
    }
    /**
     * Get project description from various sources
     */
    async detectProjectDescription() {
        // Try package.json
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            if (packageJson.description) {
                return packageJson.description;
            }
        }
        catch {
            // Ignore errors
        }
        // Try pyproject.toml
        try {
            const pyprojectPath = path.join(this.projectRoot, 'pyproject.toml');
            const pyprojectContent = await fs.readFile(pyprojectPath, 'utf8');
            const descMatch = pyprojectContent.match(/description\s*=\s*["']([^"']+)["']/);
            if (descMatch) {
                return descMatch[1];
            }
        }
        catch {
            // Ignore errors
        }
        return undefined;
    }
    /**
     * Calculate confidence score for the analysis
     */
    calculateConfidence(projectInfo, frameworks, packageManagers) {
        let confidence = 0;
        // Base confidence for successful detection
        if (projectInfo.type !== 'unknown')
            confidence += 0.3;
        if (projectInfo.framework)
            confidence += 0.2;
        if (projectInfo.version)
            confidence += 0.1;
        if (projectInfo.description)
            confidence += 0.1;
        // Framework detection confidence
        if (frameworks.length > 0)
            confidence += 0.2;
        if (frameworks.length > 1)
            confidence += 0.1;
        // Package manager detection confidence
        if (packageManagers.length > 0)
            confidence += 0.1;
        return Math.min(confidence, 1.0);
    }
    /**
     * Utility methods
     */
    async getProjectFiles() {
        try {
            const files = await fs.readdir(this.projectRoot, { recursive: true, withFileTypes: true });
            return files
                .filter(dirent => dirent.isFile())
                .map(dirent => path.relative(this.projectRoot, path.join(dirent.path || '', dirent.name)));
        }
        catch {
            return [];
        }
    }
    async fileExists(filePath) {
        try {
            const fullPath = path.join(this.projectRoot, filePath);
            await fs.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async directoryExists(dirPath) {
        try {
            const fullPath = path.join(this.projectRoot, dirPath);
            const stat = await fs.stat(fullPath);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=ProjectAnalyzer.js.map