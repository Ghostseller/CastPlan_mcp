/**
 * Content Parser
 *
 * Responsible for parsing documents and analyzing their structure.
 * Supports multiple document types including Markdown, code files, and plain text.
 * Extracts structural elements like headings, sections, code blocks, and metadata.
 *
 * Phase 1 Week 3 Implementation - Document Structure Analysis
 *
 * Created: 2025-07-31
 * Author: CastPlan MCP Semantic Enhancement
 */
export class ContentParser {
    logger;
    initialized = false;
    // Document type patterns
    DOCUMENT_TYPE_PATTERNS = {
        markdown: ['.md', '.mdx', '.markdown'],
        code: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php'],
        text: ['.txt', '.log', '.csv'],
        json: ['.json', '.jsonl'],
        xml: ['.xml', '.html', '.xhtml'],
        yaml: ['.yml', '.yaml'],
        config: ['.env', '.conf', '.config', '.ini', '.toml']
    };
    // Markdown patterns
    MARKDOWN_PATTERNS = {
        heading: /^(#{1,6})\s+(.+)$/gm,
        codeBlock: /^```(\w+)?\n([\s\S]*?)^```$/gm,
        inlineCode: /`([^`]+)`/g,
        list: /^(\s*)[*\-+]\s+(.+)$/gm,
        orderedList: /^(\s*)\d+\.\s+(.+)$/gm,
        table: /^\|(.+)\|$/gm,
        blockquote: /^>\s+(.+)$/gm,
        horizontalRule: /^---+$/gm,
        link: /\[([^\]]+)\]\(([^)]+)\)/g,
        image: /!\[([^\]]*)\]\(([^)]+)\)/g
    };
    // Code patterns
    CODE_PATTERNS = {
        function: /(?:function|def|fn|func|method|procedure)\s+(\w+)/gi,
        class: /(?:class|interface|struct|enum)\s+(\w+)/gi,
        import: /(?:import|require|include|use|from)\s+([^\s;]+)/gi,
        comment: /(?:\/\/|#|\/\*|\*\/|<!--)/gi,
        string: /(?:"[^"]*"|'[^']*'|`[^`]*`)/gi
    };
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Initialize the content parser
     */
    async initialize() {
        try {
            this.logger.info('Initializing ContentParser...');
            // Initialize any required resources
            this.initialized = true;
            this.logger.info('ContentParser initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ContentParser:', error);
            throw error;
        }
    }
    /**
     * Parse document content and analyze structure
     */
    async parseDocument(content, documentId, filePath) {
        try {
            this.ensureInitialized();
            const startTime = Date.now();
            this.logger.info(`Parsing document ${documentId}${filePath ? ` (${filePath})` : ''}`);
            // Determine document type
            const documentType = this.detectDocumentType(content, filePath);
            // Parse based on document type
            let sections = [];
            let metadata = {
                documentId,
                filePath,
                contentLength: content.length,
                lineCount: content.split('\n').length,
                processingTime: 0
            };
            switch (documentType) {
                case 'markdown':
                    sections = await this.parseMarkdown(content);
                    metadata = { ...metadata, ...this.extractMarkdownMetadata(content) };
                    break;
                case 'code':
                    sections = await this.parseCode(content, filePath);
                    metadata = { ...metadata, ...this.extractCodeMetadata(content, filePath) };
                    break;
                case 'json':
                    sections = await this.parseJSON(content);
                    metadata = { ...metadata, ...this.extractJSONMetadata(content) };
                    break;
                case 'xml':
                    sections = await this.parseXML(content);
                    metadata = { ...metadata, ...this.extractXMLMetadata(content) };
                    break;
                case 'yaml':
                    sections = await this.parseYAML(content);
                    metadata = { ...metadata, ...this.extractYAMLMetadata(content) };
                    break;
                default:
                    sections = await this.parseText(content);
                    metadata = { ...metadata, ...this.extractTextMetadata(content) };
            }
            const processingTime = Date.now() - startTime;
            metadata.processingTime = processingTime;
            const structure = {
                type: documentType,
                sections,
                metadata,
                language: this.detectLanguage(content, filePath),
                encoding: 'utf-8' // Assume UTF-8 for now
            };
            this.logger.info(`Parsed document ${documentId} (${documentType}) with ${sections.length} sections in ${processingTime}ms`);
            return structure;
        }
        catch (error) {
            this.logger.error('Failed to parse document:', error);
            throw error;
        }
    }
    /**
     * Detect document type based on content and file path
     */
    detectDocumentType(content, filePath) {
        // Check file extension first
        if (filePath) {
            const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
            for (const [type, extensions] of Object.entries(this.DOCUMENT_TYPE_PATTERNS)) {
                if (extensions.includes(extension)) {
                    return type;
                }
            }
        }
        // Check content patterns
        const trimmedContent = content.trim();
        // JSON detection
        if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
            (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
            try {
                JSON.parse(trimmedContent);
                return 'mixed'; // JSON is mixed type
            }
            catch {
                // Not valid JSON
            }
        }
        // XML/HTML detection
        if (trimmedContent.startsWith('<?xml') ||
            trimmedContent.startsWith('<!DOCTYPE') ||
            /<[^>]+>/.test(trimmedContent)) {
            return 'mixed';
        }
        // Markdown detection
        if (this.MARKDOWN_PATTERNS.heading.test(content) ||
            this.MARKDOWN_PATTERNS.codeBlock.test(content) ||
            content.includes('```')) {
            return 'markdown';
        }
        // Code detection
        if (this.CODE_PATTERNS.function.test(content) ||
            this.CODE_PATTERNS.class.test(content) ||
            this.CODE_PATTERNS.import.test(content)) {
            return 'code';
        }
        // Default to text
        return 'text';
    }
    /**
     * Parse Markdown content
     */
    async parseMarkdown(content) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = null;
        let lineIndex = 0;
        for (const line of lines) {
            const lineStart = content.indexOf(line, lineIndex);
            const lineEnd = lineStart + line.length;
            // Check for headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }
                // Create new heading section
                currentSection = {
                    type: 'heading',
                    level: headingMatch[1].length,
                    title: headingMatch[2].trim(),
                    content: line,
                    startPosition: lineStart,
                    endPosition: lineEnd,
                    metadata: { headingLevel: headingMatch[1].length }
                };
            }
            else if (line.trim() === '' && currentSection) {
                // Empty line - extend current section
                currentSection.content += '\n' + line;
                currentSection.endPosition = lineEnd;
            }
            else if (currentSection) {
                // Regular content - extend current section
                currentSection.content += '\n' + line;
                currentSection.endPosition = lineEnd;
            }
            else {
                // Start new paragraph section
                currentSection = {
                    type: 'paragraph',
                    content: line,
                    startPosition: lineStart,
                    endPosition: lineEnd
                };
            }
            lineIndex = lineEnd + 1;
        }
        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }
        // Parse special markdown elements
        this.parseMarkdownSpecialElements(content, sections);
        return sections;
    }
    /**
     * Parse special Markdown elements (code blocks, lists, tables)
     */
    parseMarkdownSpecialElements(content, sections) {
        // Parse code blocks
        let match;
        this.MARKDOWN_PATTERNS.codeBlock.lastIndex = 0;
        while ((match = this.MARKDOWN_PATTERNS.codeBlock.exec(content)) !== null) {
            const codeSection = {
                type: 'code',
                content: match[2],
                startPosition: match.index,
                endPosition: match.index + match[0].length,
                metadata: {
                    language: match[1] || 'text',
                    isCodeBlock: true
                }
            };
            sections.push(codeSection);
        }
        // Parse tables
        const tableRows = content.split('\n').filter(line => line.trim().startsWith('|'));
        if (tableRows.length > 0) {
            const tableContent = tableRows.join('\n');
            const tableSection = {
                type: 'table',
                content: tableContent,
                startPosition: content.indexOf(tableRows[0]),
                endPosition: content.indexOf(tableRows[tableRows.length - 1]) + tableRows[tableRows.length - 1].length,
                metadata: {
                    rowCount: tableRows.length,
                    isTable: true
                }
            };
            sections.push(tableSection);
        }
    }
    /**
     * Parse code content
     */
    async parseCode(content, filePath) {
        const sections = [];
        const language = this.detectLanguage(content, filePath);
        // Parse functions
        let match;
        this.CODE_PATTERNS.function.lastIndex = 0;
        while ((match = this.CODE_PATTERNS.function.exec(content)) !== null) {
            const functionSection = {
                type: 'code',
                title: match[1],
                content: this.extractFunctionBody(content, match.index),
                startPosition: match.index,
                endPosition: match.index + match[0].length,
                metadata: {
                    language,
                    elementType: 'function',
                    functionName: match[1]
                }
            };
            sections.push(functionSection);
        }
        // Parse classes
        this.CODE_PATTERNS.class.lastIndex = 0;
        while ((match = this.CODE_PATTERNS.class.exec(content)) !== null) {
            const classSection = {
                type: 'code',
                title: match[1],
                content: this.extractClassBody(content, match.index),
                startPosition: match.index,
                endPosition: match.index + match[0].length,
                metadata: {
                    language,
                    elementType: 'class',
                    className: match[1]
                }
            };
            sections.push(classSection);
        }
        // If no specific code structures found, create general sections
        if (sections.length === 0) {
            const lines = content.split('\n');
            let currentSection = '';
            let startPos = 0;
            for (let i = 0; i < lines.length; i++) {
                currentSection += lines[i] + '\n';
                // Create section every 50 lines or at significant breaks
                if (i > 0 && (i % 50 === 0 || this.isSignificantBreak(lines[i]))) {
                    sections.push({
                        type: 'code',
                        content: currentSection.trim(),
                        startPosition: startPos,
                        endPosition: startPos + currentSection.length,
                        metadata: { language, lineRange: [startPos, i] }
                    });
                    startPos = i + 1;
                    currentSection = '';
                }
            }
            // Add remaining content
            if (currentSection.trim()) {
                sections.push({
                    type: 'code',
                    content: currentSection.trim(),
                    startPosition: startPos,
                    endPosition: content.length,
                    metadata: { language, lineRange: [startPos, lines.length - 1] }
                });
            }
        }
        return sections;
    }
    /**
     * Parse JSON content
     */
    async parseJSON(content) {
        try {
            const jsonData = JSON.parse(content);
            const sections = [];
            // Flatten JSON structure into sections
            this.flattenJSONToSections(jsonData, '', sections, 0, content);
            return sections;
        }
        catch (error) {
            // If JSON parsing fails, treat as text
            return this.parseText(content);
        }
    }
    /**
     * Parse XML content
     */
    async parseXML(content) {
        const sections = [];
        // Simple XML tag extraction
        const tagPattern = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
        let match;
        while ((match = tagPattern.exec(content)) !== null) {
            sections.push({
                type: 'other',
                title: match[1],
                content: match[2],
                startPosition: match.index,
                endPosition: match.index + match[0].length,
                metadata: {
                    elementType: 'xml-tag',
                    tagName: match[1]
                }
            });
        }
        return sections.length > 0 ? sections : this.parseText(content);
    }
    /**
     * Parse YAML content
     */
    async parseYAML(content) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = null;
        let lineIndex = 0;
        for (const line of lines) {
            const lineStart = content.indexOf(line, lineIndex);
            const lineEnd = lineStart + line.length;
            // Check for YAML keys
            if (line.match(/^[\w-]+:/)) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }
                // Create new section
                const key = line.split(':')[0].trim();
                currentSection = {
                    type: 'other',
                    title: key,
                    content: line,
                    startPosition: lineStart,
                    endPosition: lineEnd,
                    metadata: {
                        elementType: 'yaml-key',
                        key
                    }
                };
            }
            else if (currentSection && line.trim()) {
                // Extend current section
                currentSection.content += '\n' + line;
                currentSection.endPosition = lineEnd;
            }
            lineIndex = lineEnd + 1;
        }
        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }
        return sections.length > 0 ? sections : this.parseText(content);
    }
    /**
     * Parse plain text content
     */
    async parseText(content) {
        const sections = [];
        const paragraphs = content.split(/\n\s*\n/);
        let position = 0;
        for (const paragraph of paragraphs) {
            if (paragraph.trim()) {
                const startPos = content.indexOf(paragraph, position);
                sections.push({
                    type: 'paragraph',
                    content: paragraph.trim(),
                    startPosition: startPos,
                    endPosition: startPos + paragraph.length,
                    metadata: {
                        wordCount: paragraph.trim().split(/\s+/).length,
                        characterCount: paragraph.length
                    }
                });
                position = startPos + paragraph.length;
            }
        }
        return sections;
    }
    // =============================================================================
    // METADATA EXTRACTION METHODS
    // =============================================================================
    /**
     * Extract Markdown metadata
     */
    extractMarkdownMetadata(content) {
        const metadata = {};
        // Count elements
        metadata.headingCount = (content.match(this.MARKDOWN_PATTERNS.heading) || []).length;
        metadata.codeBlockCount = (content.match(this.MARKDOWN_PATTERNS.codeBlock) || []).length;
        metadata.linkCount = (content.match(this.MARKDOWN_PATTERNS.link) || []).length;
        metadata.imageCount = (content.match(this.MARKDOWN_PATTERNS.image) || []).length;
        // Extract heading structure
        const headings = [];
        let match;
        this.MARKDOWN_PATTERNS.heading.lastIndex = 0;
        while ((match = this.MARKDOWN_PATTERNS.heading.exec(content)) !== null) {
            headings.push({
                level: match[1].length,
                title: match[2].trim(),
                position: match.index
            });
        }
        metadata.headingStructure = headings;
        return metadata;
    }
    /**
     * Extract code metadata
     */
    extractCodeMetadata(content, filePath) {
        const metadata = {};
        metadata.language = this.detectLanguage(content, filePath);
        metadata.functionCount = (content.match(this.CODE_PATTERNS.function) || []).length;
        metadata.classCount = (content.match(this.CODE_PATTERNS.class) || []).length;
        metadata.importCount = (content.match(this.CODE_PATTERNS.import) || []).length;
        metadata.commentLines = content.split('\n').filter(line => line.trim().startsWith('//') ||
            line.trim().startsWith('#') ||
            line.trim().startsWith('/*')).length;
        return metadata;
    }
    /**
     * Extract JSON metadata
     */
    extractJSONMetadata(content) {
        try {
            const jsonData = JSON.parse(content);
            return {
                jsonType: Array.isArray(jsonData) ? 'array' : 'object',
                keyCount: Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length,
                depth: this.calculateJSONDepth(jsonData)
            };
        }
        catch {
            return { jsonType: 'invalid' };
        }
    }
    /**
     * Extract XML metadata
     */
    extractXMLMetadata(content) {
        const tagMatches = content.match(/<(\w+)[^>]*>/g) || [];
        const uniqueTags = [...new Set(tagMatches.map(tag => tag.replace(/<(\w+)[^>]*>/, '$1')))];
        return {
            elementCount: tagMatches.length,
            uniqueElements: uniqueTags.length,
            elements: uniqueTags
        };
    }
    /**
     * Extract YAML metadata
     */
    extractYAMLMetadata(content) {
        const keyMatches = content.match(/^[\w-]+:/gm) || [];
        return {
            keyCount: keyMatches.length,
            topLevelKeys: keyMatches.map(key => key.replace(':', ''))
        };
    }
    /**
     * Extract text metadata
     */
    extractTextMetadata(content) {
        const words = content.trim().split(/\s+/);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            paragraphCount: paragraphs.length,
            averageWordsPerSentence: Math.round(words.length / sentences.length) || 0,
            averageSentencesPerParagraph: Math.round(sentences.length / paragraphs.length) || 0
        };
    }
    // =============================================================================
    // HELPER METHODS
    // =============================================================================
    /**
     * Detect programming language
     */
    detectLanguage(content, filePath) {
        if (filePath) {
            const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
            const languageMap = {
                '.ts': 'typescript',
                '.tsx': 'typescript',
                '.js': 'javascript',
                '.jsx': 'javascript',
                '.py': 'python',
                '.java': 'java',
                '.cpp': 'cpp',
                '.c': 'c',
                '.go': 'go',
                '.rs': 'rust',
                '.php': 'php',
                '.rb': 'ruby',
                '.swift': 'swift',
                '.kt': 'kotlin'
            };
            if (languageMap[extension]) {
                return languageMap[extension];
            }
        }
        // Content-based detection
        if (content.includes('function ') || content.includes('const ') || content.includes('let ')) {
            return 'javascript';
        }
        if (content.includes('def ') || content.includes('import ') && content.includes('from ')) {
            return 'python';
        }
        if (content.includes('public class ') || content.includes('private ')) {
            return 'java';
        }
        return 'text';
    }
    /**
     * Extract function body from code
     */
    extractFunctionBody(content, startIndex) {
        // Simple extraction - would need more sophisticated parsing for production
        const lines = content.substring(startIndex).split('\n');
        let braceCount = 0;
        let result = '';
        let foundOpenBrace = false;
        for (const line of lines) {
            result += line + '\n';
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                }
                else if (char === '}') {
                    braceCount--;
                }
            }
            if (foundOpenBrace && braceCount === 0) {
                break;
            }
        }
        return result.trim();
    }
    /**
     * Extract class body from code
     */
    extractClassBody(content, startIndex) {
        // Similar to function body extraction
        return this.extractFunctionBody(content, startIndex);
    }
    /**
     * Check if line represents a significant break in code
     */
    isSignificantBreak(line) {
        const trimmed = line.trim();
        return trimmed === '' ||
            trimmed.startsWith('//') ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('/*') ||
            trimmed.includes('TODO') ||
            trimmed.includes('FIXME') ||
            trimmed.includes('NOTE');
    }
    /**
     * Flatten JSON structure into sections
     */
    flattenJSONToSections(obj, prefix, sections, startPos, originalContent) {
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    const key = `${prefix}[${index}]`;
                    this.flattenJSONToSections(item, key, sections, startPos, originalContent);
                });
            }
            else {
                Object.entries(obj).forEach(([key, value]) => {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    sections.push({
                        type: 'other',
                        title: fullKey,
                        content: JSON.stringify(value, null, 2),
                        startPosition: startPos,
                        endPosition: startPos + JSON.stringify(value).length,
                        metadata: {
                            elementType: 'json-property',
                            key: fullKey,
                            valueType: typeof value
                        }
                    });
                    if (typeof value === 'object' && value !== null) {
                        this.flattenJSONToSections(value, fullKey, sections, startPos, originalContent);
                    }
                });
            }
        }
    }
    /**
     * Calculate JSON depth
     */
    calculateJSONDepth(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return 0;
        }
        let maxDepth = 0;
        for (const value of Object.values(obj)) {
            const depth = this.calculateJSONDepth(value);
            maxDepth = Math.max(maxDepth, depth);
        }
        return maxDepth + 1;
    }
    /**
     * Ensure parser is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('ContentParser not initialized. Call initialize() first.');
        }
    }
    /**
     * Shutdown the parser
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down ContentParser...');
            this.initialized = false;
            this.logger.info('ContentParser shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during ContentParser shutdown:', error);
        }
    }
}
//# sourceMappingURL=ContentParser.js.map