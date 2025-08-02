import { NodeSyncFileSystem, NodePathUtils } from '../adapters/NodeFileSystemAdapter.ts';
import { I18nService } from './I18nService.ts';
import { Mutex } from 'async-mutex';
export class DocumentationService {
    projectRoot;
    docsRoot;
    masterDocs;
    claudeMd;
    changeHistory = [];
    fs;
    path;
    i18nService;
    historyMutex = new Mutex();
    // Documentation category mapping
    DOC_CATEGORIES = {
        frontend: {
            patterns: ['/frontend/', '/castplan-electron/src/renderer/', '.tsx', '.jsx', 'components/', 'pages/'],
            docPath: 'frontend',
            priority: ['components', 'pages', 'architecture', 'workflows']
        },
        backend: {
            patterns: ['/backend/', '.ts', '.js', 'api/', 'routes/', 'services/', 'graphql/'],
            docPath: 'backend',
            priority: ['api', 'services', 'database', 'deployment']
        },
        electron: {
            patterns: ['/castplan-electron/', 'collectors/', 'parsers/', 'main/', 'preload'],
            docPath: 'electron',
            priority: ['collectors', 'architecture', 'build-deployment', 'integration']
        },
        database: {
            patterns: ['schema.prisma', 'migrations/', '/prisma/'],
            docPath: 'backend/database',
            priority: ['database', 'api']
        },
        testing: {
            patterns: ['.test.', '.spec.', '/tests/', '__tests__/'],
            docPath: 'test-reports',
            priority: ['testing', 'coverage']
        }
    };
    // Work type to documentation mapping
    WORK_TYPE_DOCS = {
        implement: ['architecture', 'api', 'components'],
        fix: ['troubleshooting', 'testing', 'development'],
        refactor: ['architecture', 'components', 'workflows'],
        optimize: ['performance', 'architecture', 'testing'],
        test: ['testing', 'coverage', 'development'],
        deploy: ['deployment', 'build-deployment', 'development'],
        security: ['security', 'api', 'backend']
    };
    constructor(projectRoot, fs, path, localizationConfig) {
        this.projectRoot = projectRoot;
        this.fs = fs || new NodeSyncFileSystem();
        this.path = path || new NodePathUtils();
        this.i18nService = new I18nService(localizationConfig);
        this.docsRoot = this.path.join(projectRoot, 'docs');
        this.masterDocs = this.path.join(projectRoot, 'MASTER_DOCS');
        this.claudeMd = this.path.join(projectRoot, 'CLAUDE.md');
        this.ensureDirectories();
    }
    ensureDirectories() {
        const dirs = [this.docsRoot, this.masterDocs];
        dirs.forEach(dir => {
            if (!this.fs.existsSync(dir)) {
                this.fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    async processDocumentationRequest(request) {
        try {
            const context = this.buildDocumentationContext(request);
            if (request.action === 'reference') {
                return await this.referenceDocumentation(context);
            }
            else if (request.action === 'update') {
                return await this.updateDocumentation(context, request.context);
            }
            else {
                throw new Error(`Unknown action: ${request.action}`);
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Documentation processing failed: ${error.message}`
            };
        }
    }
    buildDocumentationContext(request) {
        const categories = new Set();
        const workType = this.detectWorkType(request.context);
        // Detect categories from file paths
        for (const filePath of request.files) {
            const category = this.detectCategory(filePath);
            categories.add(category);
        }
        return {
            category: Array.from(categories)[0] || 'development', // Use first category as primary
            workType: request.workType || workType,
            files: request.files,
            context: request.context
        };
    }
    async referenceDocumentation(context) {
        const relevantDocs = await this.findRelevantDocumentation(context);
        return {
            success: true,
            documents: relevantDocs,
            message: `Found ${relevantDocs.length} relevant documents for ${context.category} ${context.workType} work`
        };
    }
    async updateDocumentation(context, changes) {
        const updates = [];
        try {
            // Update category-specific documentation
            const categoryUpdates = await this.updateCategoryDocumentation(context, changes);
            updates.push(...categoryUpdates);
            // Update master documentation
            const masterUpdates = await this.updateMasterDocumentation(context, changes);
            updates.push(...masterUpdates);
            // Record change history
            await this.recordChangeHistory(context, changes);
            updates.push('Updated change history');
            return {
                success: true,
                updates,
                message: `Successfully updated ${updates.length} documentation sections`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Documentation update failed: ${error.message}`
            };
        }
    }
    async findRelevantDocumentation(context) {
        const docs = [];
        // Get category-specific documentation
        const categoryDocs = await this.getCategoryDocumentation(context.category, context.workType);
        docs.push(...categoryDocs);
        // Get master documentation
        const masterDocs = await this.getMasterDocumentation(context);
        docs.push(...masterDocs);
        // Sort by relevance
        return docs.sort((a, b) => {
            const relevanceOrder = { essential: 0, high: 1, medium: 2, low: 3 };
            return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
        });
    }
    async getCategoryDocumentation(category, workType) {
        const docs = [];
        const categoryConfig = this.DOC_CATEGORIES[category];
        if (!categoryConfig) {
            return docs;
        }
        const categoryPath = this.path.join(this.docsRoot, categoryConfig.docPath);
        if (!this.fs.existsSync(categoryPath)) {
            return docs;
        }
        // Get priority documents based on work type
        const priorities = [
            ...(this.WORK_TYPE_DOCS[workType] || []),
            ...categoryConfig.priority
        ];
        // Scan for priority documents
        for (const priority of priorities) {
            const priorityPath = this.path.join(categoryPath, priority);
            if (this.fs.existsSync(priorityPath)) {
                const files = await this.scanDirectory(priorityPath, '.md');
                docs.push(...files.map(file => ({
                    path: file,
                    category: priority,
                    relevance: 'high',
                    lastModified: this.fs.statSync(file).mtime
                })));
            }
        }
        // Add category README
        const readmePath = this.path.join(categoryPath, 'README.md');
        if (this.fs.existsSync(readmePath)) {
            docs.unshift({
                path: readmePath,
                category: 'index',
                relevance: 'essential',
                lastModified: this.fs.statSync(readmePath).mtime
            });
        }
        return docs;
    }
    async getMasterDocumentation(context) {
        const docs = [];
        if (!this.fs.existsSync(this.masterDocs)) {
            return docs;
        }
        const masterFiles = await this.scanDirectory(this.masterDocs, '.md');
        // Prioritize based on context
        const priorities = this.getMasterDocPriorities(context);
        for (const file of masterFiles) {
            const fileName = this.path.basename(file, '.md');
            const priority = priorities.find(p => fileName.includes(p));
            docs.push({
                path: file,
                category: 'master',
                relevance: priority ? 'essential' : 'medium',
                lastModified: this.fs.statSync(file).mtime
            });
        }
        return docs;
    }
    getMasterDocPriorities(context) {
        const basePriorities = ['ARCHITECTURE-OVERVIEW', 'QUICK-START-GUIDE'];
        switch (context.category) {
            case 'backend':
                return [...basePriorities, 'API-REFERENCE', 'DATABASE-SCHEMA'];
            case 'frontend':
                return [...basePriorities, 'UI-COMPONENTS', 'FRONTEND-GUIDE'];
            case 'electron':
                return [...basePriorities, 'PLATFORM-INTEGRATION', 'ELECTRON-GUIDE'];
            case 'database':
                return [...basePriorities, 'DATABASE-SCHEMA', 'API-REFERENCE'];
            case 'testing':
                return [...basePriorities, 'TESTING-GUIDE', 'QA-PROCEDURES'];
            default:
                return basePriorities;
        }
    }
    async updateCategoryDocumentation(context, changes) {
        const updates = [];
        const categoryConfig = this.DOC_CATEGORIES[context.category];
        if (!categoryConfig) {
            return updates;
        }
        const categoryPath = this.path.join(this.docsRoot, categoryConfig.docPath);
        const readmePath = this.path.join(categoryPath, 'README.md');
        if (this.fs.existsSync(readmePath)) {
            try {
                let content = this.fs.readFileSync(readmePath, 'utf8');
                const today = new Date().toISOString().split('T')[0];
                // Update last modified date
                const lastUpdatedLabel = this.i18nService.translate('docs.lastUpdated', 'Last Updated');
                const formattedDate = this.i18nService.getCurrentDateString();
                // Support both Korean and English patterns for backward compatibility
                content = content.replace(/최종 업데이트: \d{4}-\d{2}-\d{2}/, `${lastUpdatedLabel}: ${formattedDate}`).replace(/Last Updated: \d{4}-\d{2}-\d{2}/, `${lastUpdatedLabel}: ${formattedDate}`);
                // Add change history entry
                const changeEntry = `- ${formattedDate}: ${changes}`;
                const changeHistoryLabel = this.i18nService.translate('docs.changeHistory', 'Change History');
                if (content.includes('## 변경 이력') || content.includes(`## ${changeHistoryLabel}`)) {
                    content = content.replace(/## (변경 이력|Change History)\n/, `## ${changeHistoryLabel}\n${changeEntry}\n`);
                }
                else {
                    content += `\n\n## ${changeHistoryLabel}\n\n${changeEntry}\n`;
                }
                this.fs.writeFileSync(readmePath, content);
                updates.push(`Updated ${context.category} README.md`);
            }
            catch (error) {
                console.warn(`Failed to update category README: ${error.message}`);
            }
        }
        return updates;
    }
    async updateMasterDocumentation(context, changes) {
        const updates = [];
        const masterReadme = this.path.join(this.masterDocs, 'README.md');
        if (this.fs.existsSync(masterReadme)) {
            try {
                let content = this.fs.readFileSync(masterReadme, 'utf8');
                const today = new Date().toISOString().split('T')[0];
                // Update last modified date
                const lastUpdatedLabel = this.i18nService.translate('docs.lastUpdated', 'Last Updated');
                const formattedDate = this.i18nService.getCurrentDateString();
                content = content.replace(/\*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/, `**${lastUpdatedLabel}**: ${formattedDate}`).replace(/\*\*최종 업데이트\*\*: \d{4}-\d{2}-\d{2}/, `**${lastUpdatedLabel}**: ${formattedDate}`);
                // Add recent update entry
                const updateEntry = `- **${formattedDate}**: ${changes}`;
                const recentUpdatesLabel = this.i18nService.translate('docs.recentMajorUpdates', 'Recent Major Updates');
                if (content.includes('### Recent Major Updates') || content.includes(`### ${recentUpdatesLabel}`)) {
                    content = content.replace(/### (Recent Major Updates|주요 최신 업데이트)\n/, `### ${recentUpdatesLabel}\n${updateEntry}\n`);
                }
                this.fs.writeFileSync(masterReadme, content);
                updates.push('Updated MASTER_DOCS README.md');
            }
            catch (error) {
                console.warn(`Failed to update master README: ${error.message}`);
            }
        }
        return updates;
    }
    async recordChangeHistory(context, changes) {
        return this.historyMutex.runExclusive(async () => {
            const record = {
                timestamp: new Date().toISOString(),
                files: context.files,
                changes,
                context: context.context,
                category: [context.category]
            };
            // Thread-safe array update using immutable pattern
            this.changeHistory = [...this.changeHistory, record];
            // Also write to file
            const changesFile = this.path.join(this.docsRoot, 'CHANGE_HISTORY.md');
            const entry = this.formatChangeEntry(record);
            if (this.fs.existsSync(changesFile)) {
                const existingContent = this.fs.readFileSync(changesFile, 'utf8');
                this.fs.writeFileSync(changesFile, entry + existingContent);
            }
            else {
                const headerTitle = this.i18nService.translate('docs.changeHistoryTitle', 'CastPlan Documentation Change History');
                const headerDescription = this.i18nService.translate('docs.changeHistoryDescription', 'This file automatically records documentation changes that occur during project development.');
                const header = `# ${headerTitle}

${headerDescription}

---

`;
                this.fs.writeFileSync(changesFile, header + entry);
            }
        });
    }
    formatChangeEntry(record) {
        const date = this.i18nService.formatDate(new Date(record.timestamp));
        const filesModifiedLabel = this.i18nService.translate('docs.filesModified', 'Files Modified');
        const categoryLabel = this.i18nService.translate('docs.category', 'Category');
        const changesLabel = this.i18nService.translate('docs.changes', 'Changes');
        const timestampLabel = this.i18nService.translate('docs.timestamp', 'Timestamp');
        return `## ${date} - ${record.context}

**${filesModifiedLabel}**: ${record.files.map(f => this.path.relative(this.projectRoot, f)).join(', ')}

**${categoryLabel}**: ${record.category.join(', ')}

**${changesLabel}**: ${record.changes}

**${timestampLabel}**: ${record.timestamp}

---

`;
    }
    // Utility methods
    detectCategory(filePath) {
        for (const [category, config] of Object.entries(this.DOC_CATEGORIES)) {
            if (config.patterns.some(pattern => filePath.includes(pattern))) {
                return category;
            }
        }
        return 'development';
    }
    detectWorkType(context) {
        const lowerContext = context.toLowerCase();
        const keywords = {
            implement: ['implement', 'add', 'create', 'build'],
            fix: ['fix', 'bug', 'error', 'issue', 'resolve'],
            refactor: ['refactor', 'cleanup', 'restructure', 'improve'],
            optimize: ['optimize', 'performance', 'speed', 'efficiency'],
            test: ['test', 'spec', 'coverage', 'validate'],
            deploy: ['deploy', 'release', 'build', 'package'],
            security: ['security', 'auth', 'permission', 'vulnerability']
        };
        for (const [type, words] of Object.entries(keywords)) {
            if (words.some(word => lowerContext.includes(word))) {
                return type;
            }
        }
        return 'implement';
    }
    async scanDirectory(dirPath, extension) {
        const files = [];
        try {
            const items = this.fs.readdirSync(dirPath);
            for (const item of items) {
                const itemPath = this.path.join(dirPath, item);
                const stat = this.fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    const subFiles = await this.scanDirectory(itemPath, extension);
                    files.push(...subFiles);
                }
                else if (item.endsWith(extension)) {
                    files.push(itemPath);
                }
            }
        }
        catch (error) {
            console.warn(`Error scanning directory ${dirPath}: ${error.message}`);
        }
        return files;
    }
    /**
     * Generate a localized business plan template
     */
    generateBusinessPlanTemplate() {
        const title = this.i18nService.translate('template.businessPlan.title', 'Business Plan');
        const overview = this.i18nService.translate('template.businessPlan.overview', 'Overview');
        const marketAnalysis = this.i18nService.translate('template.businessPlan.marketAnalysis', 'Market Analysis');
        const financialProjections = this.i18nService.translate('template.businessPlan.financialProjections', 'Financial Projections');
        const conclusion = this.i18nService.translate('template.businessPlan.conclusion', 'Conclusion');
        const currentDate = this.i18nService.getCurrentDateString();
        const lastUpdated = this.i18nService.translate('docs.lastUpdated', 'Last Updated');
        // Get localized placeholder text
        const businessOverviewPlaceholder = this.i18nService.translate('template.placeholder.businessOverview', '[Write business overview here]');
        const marketAnalysisPlaceholder = this.i18nService.translate('template.placeholder.marketAnalysis', '[Write market analysis content here]');
        const financialProjectionsPlaceholder = this.i18nService.translate('template.placeholder.financialProjections', '[Write financial plans and projections here]');
        const conclusionPlaceholder = this.i18nService.translate('template.placeholder.conclusion', '[Write conclusion and next steps here]');
        return `# ${title}

**${lastUpdated}**: ${currentDate}

## ${overview}

${businessOverviewPlaceholder}

## ${marketAnalysis}

${marketAnalysisPlaceholder}

## ${financialProjections}

${financialProjectionsPlaceholder}

## ${conclusion}

${conclusionPlaceholder}
`;
    }
    /**
     * Generate localized document templates based on type
     */
    generateDocumentTemplate(type) {
        switch (type) {
            case 'businessPlan':
                return this.generateBusinessPlanTemplate();
            case 'readme':
                return this.generateReadmeTemplate();
            case 'changelog':
                return this.generateChangelogTemplate();
            default:
                throw new Error(`Unknown template type: ${type}`);
        }
    }
    generateReadmeTemplate() {
        const lastUpdated = this.i18nService.translate('docs.lastUpdated', 'Last Updated');
        const changeHistory = this.i18nService.translate('docs.changeHistory', 'Change History');
        const currentDate = this.i18nService.getCurrentDateString();
        const projectOverviewPlaceholder = this.i18nService.translate('template.placeholder.projectOverview', '[Write project overview here]');
        return `# Project Documentation

**${lastUpdated}**: ${currentDate}

## Overview

${projectOverviewPlaceholder}

## ${changeHistory}

- ${currentDate}: Initial documentation created

`;
    }
    generateChangelogTemplate() {
        const changeHistoryTitle = this.i18nService.translate('docs.changeHistoryTitle', 'CastPlan Documentation Change History');
        const changeHistoryDescription = this.i18nService.translate('docs.changeHistoryDescription', 'This file automatically records documentation changes that occur during project development.');
        return `# ${changeHistoryTitle}

${changeHistoryDescription}

---

`;
    }
    /**
     * Get the I18nService instance for external use
     */
    getI18nService() {
        return this.i18nService;
    }
    /**
     * Update localization configuration
     */
    updateLocalization(config) {
        this.i18nService.updateConfig(config);
    }
    // Public API methods
    async getChangeHistory() {
        return [...this.changeHistory];
    }
    async searchDocumentation(query) {
        const allDocs = [];
        // Search in all documentation directories
        const searchDirs = [this.docsRoot, this.masterDocs];
        for (const searchDir of searchDirs) {
            if (this.fs.existsSync(searchDir)) {
                const files = await this.scanDirectory(searchDir, '.md');
                for (const file of files) {
                    try {
                        const content = this.fs.readFileSync(file, 'utf8');
                        if (content.toLowerCase().includes(query.toLowerCase())) {
                            allDocs.push({
                                path: file,
                                category: this.path.relative(this.projectRoot, this.path.dirname(file)),
                                relevance: 'medium',
                                lastModified: this.fs.statSync(file).mtime
                            });
                        }
                    }
                    catch (error) {
                        console.warn(`Error searching file ${file}: ${error.message}`);
                    }
                }
            }
        }
        return allDocs;
    }
    async validateDocumentationStructure() {
        const issues = [];
        // Check for required directories
        const requiredDirs = [this.docsRoot, this.masterDocs];
        for (const dir of requiredDirs) {
            if (!this.fs.existsSync(dir)) {
                issues.push(`Missing required directory: ${this.path.relative(this.projectRoot, dir)}`);
            }
        }
        // Check for master documentation files
        const requiredMasterDocs = [
            'README.md',
            '01-ARCHITECTURE-OVERVIEW.md',
            '03-QUICK-START-GUIDE.md',
            '04-API-REFERENCE.md'
        ];
        for (const doc of requiredMasterDocs) {
            const docPath = this.path.join(this.masterDocs, doc);
            if (!this.fs.existsSync(docPath)) {
                issues.push(`Missing master documentation: ${doc}`);
            }
        }
        // Check CLAUDE.md
        if (!this.fs.existsSync(this.claudeMd)) {
            issues.push('Missing CLAUDE.md in project root');
        }
        return {
            valid: issues.length === 0,
            issues
        };
    }
}
//# sourceMappingURL=DocumentationService.js.map