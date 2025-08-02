export interface ParsedSpec {
    id: string;
    title: string;
    summary: string;
    sections: SpecSection[];
    requirements: Requirement[];
    metadata?: Record<string, any>;
    timestamp: string;
    userStories?: UserStory[];
    useCases?: UseCase[];
    dependencyGraph?: DependencyGraph;
    totalEffort?: number;
}
export interface SpecSection {
    title: string;
    content: string;
    level: number;
    children?: SpecSection[];
}
export interface Requirement {
    id: string;
    description: string;
    type: 'functional' | 'non-functional' | 'technical' | 'business';
    priority: 'low' | 'medium' | 'high' | 'critical';
    acceptance_criteria?: string[];
    dependencies?: string[];
    constraints?: string[];
    effort?: number;
    source?: string;
}
export interface Task {
    id: string;
    title: string;
    description: string;
    type: 'development' | 'design' | 'testing' | 'documentation' | 'review';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'assigned' | 'in-progress' | 'needs-revision' | 'completed';
    requirements: string[];
    dependencies?: string[];
    assignedAgent?: string;
    estimatedHours?: number;
    createdAt: string;
    updatedAt: string;
}
export interface Agent {
    id: string;
    name: string;
    type: 'developer' | 'designer' | 'tester' | 'reviewer' | 'architect';
    capabilities: string[];
    availability: 'available' | 'busy' | 'offline';
    performance?: {
        tasksCompleted: number;
        averageScore: number;
        specialties: string[];
    };
}
export interface Assignment {
    taskId: string;
    agentId: string;
    agentName: string;
    confidence: number;
    reason: string;
    assignedAt: string;
}
export interface ValidationResult {
    id: string;
    taskId: string;
    passed: boolean;
    score: number;
    issues: ValidationIssue[];
    suggestions: string[];
    timestamp: string;
}
export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    location?: string;
}
export interface UserStory {
    id: string;
    actor: string;
    action: string;
    benefit: string;
    acceptanceCriteria: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort?: number;
}
export interface UseCase {
    id: string;
    name: string;
    description?: string;
    actors: string[];
    preconditions: string[];
    mainFlow: string[];
    alternativeFlows?: string[][];
    postconditions: string[];
    exceptions?: string[];
}
export interface DependencyGraph {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
}
export interface DependencyNode {
    id: string;
    type: 'requirement' | 'story' | 'usecase' | 'task';
    name: string;
    effort?: number;
}
export interface DependencyEdge {
    from: string;
    to: string;
    type: 'blocks' | 'requires' | 'related';
}
export interface ServiceConfig {
    bmad: {
        enabled: boolean;
        outputDir: string;
        autoAssign: boolean;
        validationEnabled: boolean;
    };
    documentation: {
        enabled: boolean;
        autoUpdate: boolean;
        watchPaths: string[];
        categories: Record<string, any>;
    };
    hooks: {
        enabled: boolean;
        fileWatch: any;
        notifications: any;
        gitIntegration: boolean;
    };
}
export interface ParseSpecRequest {
    content: string;
    format: 'markdown' | 'yaml' | 'plain';
    options?: {
        generateTasks: boolean;
        autoAssign: boolean;
        validate: boolean;
    };
}
export interface ParseSpecResponse {
    spec: ParsedSpec;
    tasks: Task[];
    assignments: Assignment[];
    validation?: ValidationResult[];
}
export interface SystemStatus {
    bmad: {
        active: boolean;
        tasksCount: number;
        agentsCount: number;
    };
    documentation: {
        active: boolean;
        watchedPaths: number;
        lastUpdate: string;
    };
    hooks: {
        active: boolean;
        watchersCount: number;
        eventsProcessed: number;
    };
}
//# sourceMappingURL=bmad.types.d.ts.map