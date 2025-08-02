/**
 * Change Impact Analyzer
 *
 * Comprehensive impact assessment and risk analysis system for document changes.
 * Provides detailed analysis of how changes affect different aspects of the system.
 *
 * Phase 2 Week 2: Document Evolution Tracking
 * CastPlan MCP Version-Aware Documentation System
 *
 * Created: 2025-07-31
 * Author: Backend Architect
 */
import { Logger } from 'winston';
import { ChangeImpactAnalysis, DocumentChange, DocumentContext, RiskAssessment, ChangeImpactAnalyzer as IChangeImpactAnalyzer } from '../types/version-tracking.types';
import { AIAnalysisService } from './AIAnalysisService';
import { SemanticChunkingService } from './SemanticChunkingService';
import { SemanticFingerprintGenerator } from './SemanticFingerprintGenerator';
export interface ImpactMetrics {
    changeComplexity: number;
    affectedSystemsCount: number;
    dependencyBreakageRisk: number;
    qualityDegradationRisk: number;
    userImpactSeverity: number;
    rollbackComplexity: number;
}
export interface SystemIntegration {
    systemId: string;
    systemName: string;
    integrationType: 'strong' | 'weak' | 'indirect';
    breakageRisk: number;
    recoveryTime: number;
}
export interface ChangePattern {
    patternType: string;
    frequency: number;
    successRate: number;
    averageImpact: number;
    commonIssues: string[];
}
export interface ImpactPrediction {
    predictedImpact: number;
    confidence: number;
    basedOnPatterns: ChangePattern[];
    keyRiskFactors: string[];
}
/**
 * Enhanced Change Impact Analyzer
 *
 * Provides comprehensive impact assessment with:
 * - Multi-dimensional impact analysis (structural, semantic, quality, relationships)
 * - Risk assessment with detailed mitigation strategies
 * - Pattern-based impact prediction
 * - System integration impact analysis
 * - Automated recommendation generation
 */
export declare class ChangeImpactAnalyzer implements IChangeImpactAnalyzer {
    private logger;
    private aiAnalysisService;
    private semanticChunkingService;
    private semanticFingerprintGenerator;
    private initialized;
    private changePatterns;
    private systemIntegrations;
    private readonly RISK_THRESHOLDS;
    private readonly IMPACT_WEIGHTS;
    constructor(logger: Logger, aiAnalysisService: AIAnalysisService, semanticChunkingService: SemanticChunkingService, semanticFingerprintGenerator: SemanticFingerprintGenerator);
    /**
     * Initialize the change impact analyzer
     */
    initialize(): Promise<void>;
    /**
     * Analyze comprehensive impact of document changes
     */
    analyzeImpact(changes: DocumentChange[]): Promise<ChangeImpactAnalysis>;
    /**
     * Assess risk based on changes and context
     */
    assessRisk(changes: DocumentChange[], context?: DocumentContext): Promise<RiskAssessment>;
    /**
     * Generate actionable recommendations
     */
    generateRecommendations(analysis: ChangeImpactAnalysis): Promise<string[]>;
    /**
     * Analyze structural impact
     */
    private analyzeStructuralImpact;
    /**
     * Analyze semantic impact
     */
    private analyzeSemanticImpact;
    /**
     * Analyze quality impact
     */
    private analyzeQualityImpact;
    /**
     * Analyze relationship impact
     */
    private analyzeRelationshipImpact;
    /**
     * Calculate overall impact score
     */
    private calculateOverallImpact;
    /**
     * Identify affected systems
     */
    private identifyAffectedSystems;
    /**
     * Calculate various risk factors
     */
    private calculateChangeScopeRisk;
    private calculateSemanticShiftRisk;
    private calculateQualityImpactRisk;
    private calculateRelationshipBreakageRisk;
    private calculateSystemComplexityRisk;
    /**
     * Generate mitigation strategies
     */
    private generateMitigationStrategies;
    /**
     * Generate review requirements
     */
    private generateReviewRequirements;
    /**
     * Generate pattern-based recommendations
     */
    private generatePatternBasedRecommendations;
    /**
     * Helper methods
     */
    private createEmptyAnalysis;
    private extractAffectedSections;
    private countHierarchyChanges;
    private analyzeContentQualityChange;
    private analyzeChunkRelationships;
    private extractSystemReferences;
    private generateImpactSummary;
    private loadChangePatterns;
    private loadSystemIntegrations;
    private ensureInitialized;
    /**
     * Shutdown service
     */
    shutdown(): Promise<void>;
}
export default ChangeImpactAnalyzer;
//# sourceMappingURL=ChangeImpactAnalyzer.d.ts.map