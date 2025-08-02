/**
 * Project Analyzer
 *
 * Automatically detects project type, framework, and structure
 * to generate optimal configuration
 *
 * Created: 2025-07-31
 */
import { Logger } from 'winston';
import { ProjectInfo, PackageManagerType } from './types.ts';
export interface ProjectAnalysisResult {
    projectInfo: ProjectInfo;
    detectedFrameworks: string[];
    packageManagers: PackageManagerType[];
    documentationPatterns: string[];
    recommendedCategories: string[];
    confidence: number;
}
export declare class ProjectAnalyzer {
    private logger;
    private projectRoot;
    constructor(projectRoot: string, logger: Logger);
    /**
     * Analyze project and return comprehensive information
     */
    analyzeProject(): Promise<ProjectAnalysisResult>;
    /**
     * Detect basic project information
     */
    private detectProjectInfo;
    /**
     * Detect project name from various sources
     */
    private detectProjectName;
    /**
     * Sanitize project name for use as environment variable prefix
     */
    private sanitizeProjectName;
    /**
     * Detect project type (node, python, mixed, unknown)
     */
    private detectProjectType;
    /**
     * Detect primary framework
     */
    private detectPrimaryFramework;
    /**
     * Detect all frameworks present in the project
     */
    private detectFrameworks;
    /**
     * Detect available package managers
     */
    private detectPackageManagers;
    /**
     * Detect documentation patterns based on project structure
     */
    private detectDocumentationPatterns;
    /**
     * Generate recommended categories based on project analysis
     */
    private generateRecommendedCategories;
    /**
     * Get project version from various sources
     */
    private detectProjectVersion;
    /**
     * Get project description from various sources
     */
    private detectProjectDescription;
    /**
     * Calculate confidence score for the analysis
     */
    private calculateConfidence;
    /**
     * Utility methods
     */
    private getProjectFiles;
    private fileExists;
    private directoryExists;
}
//# sourceMappingURL=ProjectAnalyzer.d.ts.map