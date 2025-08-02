import { Logger } from 'winston';
import { DocumentStructure } from './SemanticChunkingService.ts';
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
export declare class ContentParser {
    private logger;
    private initialized;
    private readonly DOCUMENT_TYPE_PATTERNS;
    private readonly MARKDOWN_PATTERNS;
    private readonly CODE_PATTERNS;
    constructor(logger: Logger);
    /**
     * Initialize the content parser
     */
    initialize(): Promise<void>;
    /**
     * Parse document content and analyze structure
     */
    parseDocument(content: string, documentId: string, filePath?: string): Promise<DocumentStructure>;
    /**
     * Detect document type based on content and file path
     */
    private detectDocumentType;
    /**
     * Parse Markdown content
     */
    private parseMarkdown;
    /**
     * Parse special Markdown elements (code blocks, lists, tables)
     */
    private parseMarkdownSpecialElements;
    /**
     * Parse code content
     */
    private parseCode;
    /**
     * Parse JSON content
     */
    private parseJSON;
    /**
     * Parse XML content
     */
    private parseXML;
    /**
     * Parse YAML content
     */
    private parseYAML;
    /**
     * Parse plain text content
     */
    private parseText;
    /**
     * Extract Markdown metadata
     */
    private extractMarkdownMetadata;
    /**
     * Extract code metadata
     */
    private extractCodeMetadata;
    /**
     * Extract JSON metadata
     */
    private extractJSONMetadata;
    /**
     * Extract XML metadata
     */
    private extractXMLMetadata;
    /**
     * Extract YAML metadata
     */
    private extractYAMLMetadata;
    /**
     * Extract text metadata
     */
    private extractTextMetadata;
    /**
     * Detect programming language
     */
    private detectLanguage;
    /**
     * Extract function body from code
     */
    private extractFunctionBody;
    /**
     * Extract class body from code
     */
    private extractClassBody;
    /**
     * Check if line represents a significant break in code
     */
    private isSignificantBreak;
    /**
     * Flatten JSON structure into sections
     */
    private flattenJSONToSections;
    /**
     * Calculate JSON depth
     */
    private calculateJSONDepth;
    /**
     * Ensure parser is initialized
     */
    private ensureInitialized;
    /**
     * Shutdown the parser
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ContentParser.d.ts.map