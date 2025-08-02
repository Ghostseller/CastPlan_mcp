import { Task, Agent, Assignment, ParseSpecRequest, ParseSpecResponse } from '../types/bmad.types.ts';
export declare class BMADService {
    private agents;
    private tasks;
    private assignments;
    private stateMutex;
    constructor();
    private initializeDefaultAgents;
    /**
     * Parse specification document with comprehensive error handling
     * @param request - Parse specification request with content and options
     * @returns Promise resolving to parsed specification response
     * @throws Error with detailed context if parsing fails
     */
    parseSpecification(request: ParseSpecRequest): Promise<ParseSpecResponse>;
    private parseMarkdown;
    private parseYAML;
    private parsePlainText;
    private extractTitle;
    private extractSummary;
    private extractSections;
    private extractRequirements;
    private extractRequirementsFromText;
    private extractUserStories;
    private extractUseCases;
    private parseUserStories;
    private parseUseCases;
    private convertYAMLToSections;
    private isRequirement;
    private cleanRequirementText;
    private classifyRequirement;
    private determinePriority;
    private extractAcceptanceCriteria;
    private generateTasks;
    private mapRequirementToTaskType;
    private estimateEffort;
    private assignTasks;
    private findBestAgent;
    private calculateAgentMatch;
    private getTypeCompatibility;
    private getCapabilityMatch;
    private getAgentWorkload;
    private validateTasks;
    private validateTask;
    private generateSuggestions;
    getTasks(): Promise<Task[]>;
    getAgents(): Promise<Agent[]>;
    getAssignments(): Promise<Assignment[]>;
    updateTaskStatus(taskId: string, status: Task['status']): Promise<boolean>;
    private generateId;
}
//# sourceMappingURL=BMADService.d.ts.map