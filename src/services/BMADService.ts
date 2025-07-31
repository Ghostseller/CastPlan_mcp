import { marked } from 'marked';
import * as yaml from 'js-yaml';
import matter from 'gray-matter';
import { 
  ParsedSpec, 
  SpecSection, 
  Requirement, 
  Task, 
  Agent, 
  Assignment, 
  ValidationResult,
  UserStory,
  UseCase,
  DependencyGraph,
  ParseSpecRequest,
  ParseSpecResponse
} from '../types/bmad.types.js';

export class BMADService {
  private agents: Agent[] = [];
  private tasks: Task[] = [];
  private assignments: Assignment[] = [];

  constructor() {
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    this.agents = [
      {
        id: 'dev-001',
        name: 'Full-Stack Developer',
        type: 'developer',
        capabilities: ['typescript', 'react', 'nodejs', 'database', 'api'],
        availability: 'available',
        performance: {
          tasksCompleted: 0,
          averageScore: 0,
          specialties: ['frontend', 'backend']
        }
      },
      {
        id: 'ui-001',
        name: 'UI/UX Designer',
        type: 'designer',
        capabilities: ['figma', 'ui-design', 'prototyping', 'accessibility'],
        availability: 'available',
        performance: {
          tasksCompleted: 0,
          averageScore: 0,
          specialties: ['design', 'user-experience']
        }
      },
      {
        id: 'qa-001',
        name: 'QA Engineer',
        type: 'tester',
        capabilities: ['manual-testing', 'automation', 'performance', 'security'],
        availability: 'available',
        performance: {
          tasksCompleted: 0,
          averageScore: 0,
          specialties: ['testing', 'quality-assurance']
        }
      },
      {
        id: 'arch-001',
        name: 'Solution Architect',
        type: 'architect',
        capabilities: ['system-design', 'scalability', 'security', 'documentation'],
        availability: 'available',
        performance: {
          tasksCompleted: 0,
          averageScore: 0,
          specialties: ['architecture', 'documentation']
        }
      }
    ];
  }

  async parseSpecification(request: ParseSpecRequest): Promise<ParseSpecResponse> {
    const { content, format, options = { generateTasks: false, autoAssign: false, validate: false } } = request;
    
    let spec: ParsedSpec;
    
    try {
      switch (format) {
        case 'markdown':
          spec = await this.parseMarkdown(content);
          break;
        case 'yaml':
          spec = await this.parseYAML(content);
          break;
        case 'plain':
          spec = await this.parsePlainText(content);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      let tasks: Task[] = [];
      let assignments: Assignment[] = [];
      let validation: ValidationResult[] = [];

      if (options.generateTasks) {
        tasks = await this.generateTasks(spec);
        this.tasks.push(...tasks);
      }

      if (options.autoAssign && tasks.length > 0) {
        assignments = await this.assignTasks(tasks);
        this.assignments.push(...assignments);
      }

      if (options.validate && tasks.length > 0) {
        validation = await this.validateTasks(tasks);
      }

      return {
        spec,
        tasks,
        assignments,
        validation: validation.length > 0 ? validation : undefined
      };

    } catch (error: any) {
      throw new Error(`Failed to parse specification: ${error.message}`);
    }
  }

  private async parseMarkdown(content: string): Promise<ParsedSpec> {
    const { data: frontMatter, content: markdown } = matter(content);
    const tokens = marked.lexer(markdown);
    // console.log('Markdown Tokens:', JSON.stringify(tokens, null, 2));
    
    const spec: ParsedSpec = {
      id: this.generateId(),
      title: frontMatter.title || this.extractTitle(tokens),
      summary: frontMatter.summary || this.extractSummary(tokens),
      sections: this.extractSections(tokens),
      requirements: [],
      metadata: frontMatter,
      timestamp: new Date().toISOString()
    };

    // Extract requirements from sections
    spec.requirements = this.extractRequirements(spec.sections);
    
    // Extract user stories if present
    spec.userStories = this.extractUserStories(spec.sections);
    
    // Extract use cases if present
    spec.useCases = this.extractUseCases(spec.sections);

    return spec;
  }

  private async parseYAML(content: string): Promise<ParsedSpec> {
    try {
      const data = yaml.load(content) as any;
      
      return {
        id: this.generateId(),
        title: data.title || 'Untitled Specification',
        summary: data.summary || 'No summary provided',
        sections: this.convertYAMLToSections(data),
        requirements: data.requirements || [],
        metadata: data.metadata || {},
        timestamp: new Date().toISOString(),
        userStories: data.userStories || [],
        useCases: data.useCases || []
      };
    } catch (error: any) {
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  private async parsePlainText(content: string): Promise<ParsedSpec> {
    const lines = content.split('\n').filter(line => line.trim());
    const title = lines[0] || 'Untitled Specification';
    const summary = lines[1] || 'No summary provided';

    const sections: SpecSection[] = [{
      title: 'Content',
      content: content,
      level: 1
    }];

    return {
      id: this.generateId(),
      title,
      summary,
      sections,
      requirements: this.extractRequirementsFromText(content),
      metadata: {},
      timestamp: new Date().toISOString()
    };
  }

  private extractTitle(tokens: any[]): string {
    const heading = tokens.find(token => token.type === 'heading' && token.depth === 1);
    return heading ? heading.text : 'Untitled Specification';
  }

  private extractSummary(tokens: any[]): string {
    const firstParagraph = tokens.find(token => token.type === 'paragraph');
    return firstParagraph ? firstParagraph.text.substring(0, 200) + '...' : 'No summary provided';
  }

  private extractSections(tokens: any[]): SpecSection[] {
    const sections: SpecSection[] = [];
    let currentSection: SpecSection | null = null;
    let currentContent: string[] = [];

    for (const token of tokens) {
      if (token.type === 'heading') {
        if (currentSection) {
          currentSection.content = currentContent.join('\n');
          sections.push(currentSection);
        }
        
        currentSection = {
          title: token.text,
          content: '',
          level: token.depth
        };
        currentContent = [];
      } else if (currentSection && (token.type === 'paragraph' || token.type === 'list_item')) {
        currentContent.push(token.text);
      } else if (currentSection && token.type === 'list') {
        // Handle list tokens by extracting text from nested list items
        if (token.items) {
          for (const item of token.items) {
            if (item.text) {
              currentContent.push(item.text);
            }
          }
        }
      }
    }

    if (currentSection) {
      currentSection.content = currentContent.join('\n');
      sections.push(currentSection);
    }

    return sections;
  }

  private extractRequirements(sections: SpecSection[]): Requirement[] {
    const requirements: Requirement[] = [];
    
    for (const section of sections) {
      const sectionRequirements = this.extractRequirementsFromText(section.content);
      requirements.push(...sectionRequirements.map(req => ({
        ...req,
        source: section.title
      })));
    }

    return requirements;
  }

  private extractRequirementsFromText(text: string): Requirement[] {
    const requirements: Requirement[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for requirement patterns
      if (this.isRequirement(line)) {
        requirements.push({
          id: `req-${requirements.length + 1}`,
          description: this.cleanRequirementText(line),
          type: this.classifyRequirement(line),
          priority: this.determinePriority(line),
          acceptance_criteria: this.extractAcceptanceCriteria(lines, i)
        });
      }
    }

    return requirements;
  }

  private extractUserStories(sections: SpecSection[]): UserStory[] {
    const stories: UserStory[] = [];
    
    for (const section of sections) {
      if (section.title.toLowerCase().includes('user stor') || 
          section.title.toLowerCase().includes('story')) {
        const sectionStories = this.parseUserStories(section.content);
        stories.push(...sectionStories);
      }
    }

    return stories;
  }

  private extractUseCases(sections: SpecSection[]): UseCase[] {
    const useCases: UseCase[] = [];
    
    for (const section of sections) {
      // Check if this section is a use case section or contains use cases
      if (section.title.toLowerCase().includes('use case') || 
          section.title.toLowerCase().includes('usecase')) {
        
        // If this section itself is a specific use case (e.g., "Use Case: User Login")
        if (section.title.match(/use\s+case:\s*(.+)/i)) {
          const sectionUseCases = this.parseUseCases(section.title + '\n' + section.content);
          useCases.push(...sectionUseCases);
        } else {
          // This is a general use cases section, parse its content
          const sectionUseCases = this.parseUseCases(section.content);
          useCases.push(...sectionUseCases);
        }
      }
      
      // Also check if this section looks like a use case based on content structure
      else if (section.content.toLowerCase().includes('description:') && 
               (section.content.toLowerCase().includes('actors:') || 
                section.content.toLowerCase().includes('preconditions:'))) {
        // This section looks like a use case, treat the title as the use case name
        const useCase: UseCase = {
          id: `uc-${useCases.length + 1}`,
          name: section.title,
          description: '',
          actors: [],
          preconditions: [],
          postconditions: [],
          mainFlow: [],
          alternativeFlows: []
        };

        // Parse the content to extract use case details
        const lines = section.content.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('Description:')) {
            useCase.description = trimmedLine.substring(12).trim();
          } else if (trimmedLine.startsWith('Actors:')) {
            const actorsText = trimmedLine.substring(7).trim();
            useCase.actors = actorsText.split(',').map(a => a.trim()).filter(a => a);
          } else if (trimmedLine.startsWith('Preconditions:')) {
            const preconditionsText = trimmedLine.substring(14).trim();
            useCase.preconditions = [preconditionsText];
          } else if (trimmedLine.startsWith('Postconditions:')) {
            const postconditionsText = trimmedLine.substring(15).trim();
            useCase.postconditions = [postconditionsText];
          }
        }

        useCases.push(useCase);
      }
    }

    return useCases;
  }

  private parseUserStories(content: string): UserStory[] {
    const stories: UserStory[] = [];
    const storyPattern = /As\s+(?:a|an)\s+(.+?),\s*I\s+want\s+(.+?)\s+so\s+that\s+(.+?)(?:\.|\$)/gi;
    let match;

    while ((match = storyPattern.exec(content)) !== null) {
      stories.push({
        id: `story-${stories.length + 1}`,
        actor: match[1].trim(),
        action: match[2].trim(),
        benefit: match[3].trim(),
        acceptanceCriteria: [],
        priority: 'medium'
      });
    }

    return stories;
  }

  private parseUseCases(content: string): UseCase[] {
    const useCases: UseCase[] = [];
    const lines = content.split('\n');
    let currentUseCase: Partial<UseCase> | null = null;
    let useCaseCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match use case headers like "### Use Case: User Login" or "Use Case: User Login"
      const explicitUseCaseMatch = line.match(/^#+\s*Use\s+Case:\s*(.+)$/i) || line.match(/^Use\s+Case:\s*(.+)$/i);
      
      // Also match general headers if the section content looks like a use case
      const headerMatch = line.match(/^#+\s*(.+)$/i);
      const isUseCaseLikeSection = headerMatch && 
        (content.toLowerCase().includes('description:') && 
         (content.toLowerCase().includes('actors:') || content.toLowerCase().includes('preconditions:')));
      
      if (explicitUseCaseMatch || isUseCaseLikeSection) {
        // Save previous use case if exists
        if (currentUseCase && currentUseCase.name) {
          useCases.push({
            id: currentUseCase.id || `uc-${useCaseCounter++}`,
            name: currentUseCase.name,
            description: currentUseCase.description || '',
            actors: currentUseCase.actors || [],
            preconditions: currentUseCase.preconditions || [],
            postconditions: currentUseCase.postconditions || [],
            mainFlow: currentUseCase.mainFlow || [],
            alternativeFlows: currentUseCase.alternativeFlows || []
          });
        }
        
        // Start new use case
        const useCaseName = explicitUseCaseMatch ? explicitUseCaseMatch[1].trim() : (headerMatch?.[1]?.trim() || 'Unnamed Use Case');
        currentUseCase = {
          id: `uc-${useCaseCounter}`,
          name: useCaseName,
          description: '',
          actors: [],
          preconditions: [],
          postconditions: [],
          mainFlow: [],
          alternativeFlows: []
        };
        continue;
      }

      // Parse use case fields if we're inside a use case
      if (currentUseCase) {
        if (line.startsWith('Description:')) {
          currentUseCase.description = line.substring(12).trim();
        } else if (line.startsWith('Actors:')) {
          const actorsText = line.substring(7).trim();
          currentUseCase.actors = actorsText.split(',').map(a => a.trim()).filter(a => a);
        } else if (line.startsWith('Preconditions:')) {
          const preconditionsText = line.substring(14).trim();
          currentUseCase.preconditions = [preconditionsText];
        } else if (line.startsWith('Postconditions:')) {
          const postconditionsText = line.substring(15).trim();
          currentUseCase.postconditions = [postconditionsText];
        }
      }
    }

    // Add the last use case if exists
    if (currentUseCase && currentUseCase.name) {
      useCases.push({
        id: currentUseCase.id || `uc-${useCaseCounter}`,
        name: currentUseCase.name,
        description: currentUseCase.description || '',
        actors: currentUseCase.actors || [],
        preconditions: currentUseCase.preconditions || [],
        postconditions: currentUseCase.postconditions || [],
        mainFlow: currentUseCase.mainFlow || [],
        alternativeFlows: currentUseCase.alternativeFlows || []
      });
    }

    return useCases;
  }

  private convertYAMLToSections(data: any): SpecSection[] {
    const sections: SpecSection[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'object') {
        sections.push({
          title: key,
          content: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
          level: 1
        });
      }
    }

    return sections;
  }

  private isRequirement(line: string): boolean {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return false;
    
    // Skip markdown headers
    if (trimmedLine.startsWith('#')) return false;
    
    // Skip lines that are just section dividers or markdown syntax
    if (trimmedLine.match(/^[-=]+$/)) return false;
    
    // Look for requirement patterns
    const requirementPatterns = [
      // Bullet points that contain requirement keywords
      /^-\s+.*(requirement|must|shall|should|will|system|feature|function)/i,
      // Numbered list items that contain requirement keywords  
      /^\d+\.\s+.*(requirement|must|shall|should|will|system|feature|function)/i,
      // Direct requirement statements with modal verbs
      /^(requirement|req-|the system|system)\s+.*(must|shall|should|will)/i,
      // Plain "Requirement:" statements
      /^requirement:\s+.*/i,
      // Natural language requirements (sentences with needs/requirements)
      /.*(system|application|platform)\s+(needs?|requires?|should|must).*/i,
      // Performance and security requirements
      /.*(performance|security|reliability)\s+(should|must|needs?|requires?).*/i
    ];

    // Additional check: line should be substantial (not just acceptance criteria)
    const isSubstantial = trimmedLine.length > 15;
    
    // Exclude lines that look like acceptance criteria (typically short and start with dash)
    const isAcceptanceCriteria = trimmedLine.match(/^-\s+[A-Z][a-z]+\s+\d+$/) || 
                                trimmedLine.match(/^-\s+(criteria|criterion)/i);

    return isSubstantial && 
           !isAcceptanceCriteria && 
           requirementPatterns.some(pattern => pattern.test(trimmedLine));
  }

  private cleanRequirementText(text: string): string {
    return text.replace(/^[-\d\.\s]+/, '').trim();
  }

  private classifyRequirement(text: string): 'functional' | 'non-functional' | 'technical' | 'business' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('performance') || lowerText.includes('scalability') || 
        lowerText.includes('security') || lowerText.includes('usability')) {
      return 'non-functional';
    }
    
    if (lowerText.includes('technology') || lowerText.includes('framework') || 
        lowerText.includes('architecture') || lowerText.includes('implementation')) {
      return 'technical';
    }
    
    if (lowerText.includes('business') || lowerText.includes('revenue') || 
        lowerText.includes('cost') || lowerText.includes('roi')) {
      return 'business';
    }
    
    return 'functional';
  }

  private determinePriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('critical') || lowerText.includes('must') || lowerText.includes('required')) {
      return 'critical';
    }
    
    if (lowerText.includes('important') || lowerText.includes('should')) {
      return 'high';
    }
    
    if (lowerText.includes('nice to have') || lowerText.includes('may')) {
      return 'low';
    }
    
    return 'medium';
  }

  private extractAcceptanceCriteria(lines: string[], startIndex: number): string[] {
    const criteria: string[] = [];
    let i = startIndex + 1;
    
    while (i < lines.length && lines[i].trim().startsWith('-')) {
      criteria.push(lines[i].trim().substring(1).trim());
      i++;
    }
    
    return criteria;
  }

  private async generateTasks(spec: ParsedSpec): Promise<Task[]> {
    const tasks: Task[] = [];
    let taskCounter = 1;

    // Generate tasks from requirements
    for (const requirement of spec.requirements) {
      const task: Task = {
        id: `task-${taskCounter++}`,
        title: `Implement: ${requirement.description.substring(0, 50)}...`,
        description: requirement.description,
        type: this.mapRequirementToTaskType(requirement.type),
        priority: requirement.priority,
        status: 'pending',
        requirements: [requirement.id],
        estimatedHours: requirement.effort || this.estimateEffort(requirement),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      tasks.push(task);
    }

    // Generate tasks from user stories
    if (spec.userStories) {
      for (const story of spec.userStories) {
        const task: Task = {
          id: `task-${taskCounter++}`,
          title: `Story: ${story.action}`,
          description: `As ${story.actor}, I want ${story.action} so that ${story.benefit}`,
          type: 'development',
          priority: story.priority,
          status: 'pending',
          requirements: [],
          estimatedHours: story.effort || 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        tasks.push(task);
      }
    }

    return tasks;
  }

  private mapRequirementToTaskType(requirementType: string): Task['type'] {
    switch (requirementType) {
      case 'functional':
        return 'development';
      case 'non-functional':
        return 'testing';
      case 'technical':
        return 'development';
      case 'business':
        return 'documentation';
      default:
        return 'development';
    }
  }

  private estimateEffort(requirement: Requirement): number {
    const complexity = requirement.description.length > 100 ? 'high' : 
                     requirement.description.length > 50 ? 'medium' : 'low';
    
    const baseHours = {
      low: 4,
      medium: 8,
      high: 16
    };

    const priorityMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.2,
      critical: 1.5
    };

    return Math.round(baseHours[complexity] * priorityMultiplier[requirement.priority]);
  }

  private async assignTasks(tasks: Task[]): Promise<Assignment[]> {
    const assignments: Assignment[] = [];

    for (const task of tasks) {
      const bestAgent = this.findBestAgent(task);
      
      if (bestAgent) {
        const assignment: Assignment = {
          taskId: task.id,
          agentId: bestAgent.agent.id,
          agentName: bestAgent.agent.name,
          confidence: bestAgent.confidence,
          reason: bestAgent.reason,
          assignedAt: new Date().toISOString()
        };
        
        assignments.push(assignment);
        
        // Update task
        task.assignedAgent = bestAgent.agent.id;
        task.status = 'assigned';
        task.updatedAt = new Date().toISOString();
      }
    }

    return assignments;
  }

  private findBestAgent(task: Task): { agent: Agent; confidence: number; reason: string } | null {
    const availableAgents = this.agents.filter(agent => agent.availability === 'available');
    
    if (availableAgents.length === 0) {
      return null;
    }

    let bestMatch: { agent: Agent; confidence: number; reason: string } | null = null;

    for (const agent of availableAgents) {
      const match = this.calculateAgentMatch(agent, task);
      
      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    }

    return bestMatch;
  }

  private calculateAgentMatch(agent: Agent, task: Task): { agent: Agent; confidence: number; reason: string } {
    let confidence = 0;
    const reasons: string[] = [];

    // Check agent type compatibility
    const typeCompatibility = this.getTypeCompatibility(agent.type, task.type);
    confidence += typeCompatibility * 0.4;
    
    if (typeCompatibility > 0.7) {
      reasons.push(`Agent type (${agent.type}) matches task type (${task.type})`);
    }

    // Check capabilities
    const capabilityMatch = this.getCapabilityMatch(agent.capabilities, task.description);
    confidence += capabilityMatch * 0.3;
    
    if (capabilityMatch > 0.5) {
      reasons.push('Has relevant technical capabilities');
    }

    // Check workload
    const workload = this.getAgentWorkload(agent.id);
    const workloadScore = Math.max(0, 1 - (workload / 10)); // Prefer agents with less workload
    confidence += workloadScore * 0.2;

    // Check performance
    if (agent.performance && agent.performance.averageScore > 0) {
      confidence += (agent.performance.averageScore / 10) * 0.1;
      reasons.push(`Good performance history (${agent.performance.averageScore}/10)`);
    }

    return {
      agent,
      confidence: Math.min(confidence, 1),
      reason: reasons.join(', ') || 'Basic compatibility match'
    };
  }

  private getTypeCompatibility(agentType: string, taskType: string): number {
    const compatibility: Record<string, Record<string, number>> = {
      developer: { development: 1.0, testing: 0.7, documentation: 0.5, design: 0.3, review: 0.8 },
      designer: { design: 1.0, development: 0.4, testing: 0.2, documentation: 0.6, review: 0.7 },
      tester: { testing: 1.0, development: 0.6, documentation: 0.4, design: 0.2, review: 0.9 },
      reviewer: { review: 1.0, documentation: 0.8, testing: 0.7, development: 0.5, design: 0.5 },
      architect: { development: 0.8, design: 0.7, documentation: 0.9, testing: 0.6, review: 1.0 }
    };

    return compatibility[agentType]?.[taskType] || 0.3;
  }

  private getCapabilityMatch(capabilities: string[], taskDescription: string): number {
    const taskLower = taskDescription.toLowerCase();
    let matches = 0;

    for (const capability of capabilities) {
      if (taskLower.includes(capability.toLowerCase())) {
        matches++;
      }
    }

    return Math.min(matches / capabilities.length, 1);
  }

  private getAgentWorkload(agentId: string): number {
    return this.assignments.filter(assignment => 
      assignment.agentId === agentId && 
      this.tasks.find(task => task.id === assignment.taskId)?.status !== 'completed'
    ).length;
  }

  private async validateTasks(tasks: Task[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const task of tasks) {
      const validation = this.validateTask(task);
      results.push(validation);
    }

    return results;
  }

  private validateTask(task: Task): ValidationResult {
    const issues: any[] = [];
    let score = 100;

    // Check title
    if (!task.title || task.title.length < 5) {
      issues.push({
        severity: 'error',
        category: 'title',
        message: 'Task title is too short or missing'
      });
      score -= 20;
    }

    // Check description
    if (!task.description || task.description.length < 10) {
      issues.push({
        severity: 'warning',
        category: 'description',
        message: 'Task description should be more detailed'
      });
      score -= 10;
    }

    // Check estimation
    if (!task.estimatedHours || task.estimatedHours < 1) {
      issues.push({
        severity: 'warning',
        category: 'estimation',
        message: 'Task should have time estimation'
      });
      score -= 5;
    }

    return {
      id: `validation-${task.id}`,
      taskId: task.id,
      passed: issues.filter(i => i.severity === 'error').length === 0,
      score: Math.max(score, 0),
      issues,
      suggestions: this.generateSuggestions(task, issues),
      timestamp: new Date().toISOString()
    };
  }

  private generateSuggestions(task: Task, issues: any[]): string[] {
    const suggestions: string[] = [];

    if (issues.some(i => i.category === 'title')) {
      suggestions.push('Consider adding more descriptive title with action verb');
    }

    if (issues.some(i => i.category === 'description')) {
      suggestions.push('Add acceptance criteria and technical details');
    }

    if (issues.some(i => i.category === 'estimation')) {
      suggestions.push('Break down the task and estimate hours based on complexity');
    }

    return suggestions;
  }

  // Public API methods
  async getTasks(): Promise<Task[]> {
    return [...this.tasks];
  }

  async getAgents(): Promise<Agent[]> {
    return [...this.agents];
  }

  async getAssignments(): Promise<Assignment[]> {
    return [...this.assignments];
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<boolean> {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  private generateId(): string {
    return `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}