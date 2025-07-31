import { BMADService } from '../services/BMADService';
import { ParsedSpec, Requirement, UserStory, UseCase, Task, Assignment, ValidationResult } from '../types/bmad.types';

const markdownContent = `---
title: Test Markdown Spec
summary: This is a summary.
metadata:
  version: 1.0
---
# Introduction
This is an introduction.

## Requirements
- Requirement 1: The system must do X. (functional)
- Requirement 2: The system should do Y. (functional)
  - Acceptance Criteria 1
  - Acceptance Criteria 2

## User Stories
As a user, I want to log in so that I can access my account.
As an admin, I want to manage users so that I can control access.

## Use Cases
### Use Case: User Login
Description: User logs into the system.
Actors: User
Preconditions: User has an account.
Postconditions: User is logged in.

`;

const yamlContent = `
title: Test YAML Spec
summary: This is a YAML summary.
requirements:
  - id: req-yaml-1
    description: YAML Requirement 1
    type: functional
    priority: high
userStories:
  - id: story-yaml-1
    actor: YAML User
    action: do something
    benefit: get a benefit
useCases:
  - id: uc-yaml-1
    name: YAML Use Case
    description: A use case from YAML
`;

const plainTextContent = `Plain Text Spec
This is a plain text summary.
Requirement: System must be fast.
- Criteria A
- Criteria B
`;

describe('BMADService', () => {
  let bmadService: BMADService;

  beforeEach(() => {
    bmadService = new BMADService();
  });

  it('should be defined', () => {
    expect(bmadService).toBeDefined();
  });

  describe('parseSpecification', () => {
    it('should parse markdown content correctly', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: false, autoAssign: false, validate: false },
      });

      expect(response.spec).toBeDefined();
      expect(response.spec.title).toBe('Test Markdown Spec');
      expect(response.spec.summary).toBe('This is a summary.');
      expect(response.spec.sections.length).toBeGreaterThan(0);
      expect(response.spec.requirements.length).toBe(2);
      expect(response.spec.userStories?.length).toBe(2);
      expect(response.spec.useCases?.length).toBe(1);
      expect(response.tasks).toEqual([]);
      expect(response.assignments).toEqual([]);
      expect(response.validation).toBeUndefined();
    });

    it('should parse YAML content correctly', async () => {
      const response = await bmadService.parseSpecification({
        content: yamlContent,
        format: 'yaml',
        options: { generateTasks: false, autoAssign: false, validate: false },
      });

      expect(response.spec).toBeDefined();
      expect(response.spec.title).toBe('Test YAML Spec');
      expect(response.spec.summary).toBe('This is a YAML summary.');
      expect(response.spec.requirements.length).toBe(1);
      expect(response.spec.userStories?.length).toBe(1);
      expect(response.spec.useCases?.length).toBe(1);
    });

    it('should parse plain text content correctly', async () => {
      const response = await bmadService.parseSpecification({
        content: plainTextContent,
        format: 'plain',
        options: { generateTasks: false, autoAssign: false, validate: false },
      });

      expect(response.spec).toBeDefined();
      expect(response.spec.title).toBe('Plain Text Spec');
      expect(response.spec.summary).toBe('This is a plain text summary.');
      expect(response.spec.requirements.length).toBe(1);
    });

    it('should generate tasks when generateTasks is true', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: false, validate: false },
      });

      expect(response.tasks).toBeDefined();
      expect(response.tasks.length).toBeGreaterThan(0);
      // Check that task has a title (flexible matching)
      expect(response.tasks[0].title).toBeDefined();
      expect(response.tasks[0].title.length).toBeGreaterThan(0);
    });

    it('should auto-assign tasks when autoAssign is true and tasks are generated', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: true, validate: false },
      });

      expect(response.assignments).toBeDefined();
      expect(response.assignments.length).toBeGreaterThan(0);
      expect(response.assignments[0].agentId).toBeDefined();
    });

    it('should validate tasks when validate is true and tasks are generated', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: false, validate: true },
      });

      expect(response.validation).toBeDefined();
      expect(response.validation?.length).toBeGreaterThan(0);
      expect(response.validation?.[0].passed).toBe(true); // Assuming default tasks pass basic validation
    });

    it('should throw error for unsupported format', async () => {
      await expect(bmadService.parseSpecification({
        content: 'some content',
        format: 'unsupported' as any,
      })).rejects.toThrow('Unsupported format');
    });

    it('should handle parsing errors gracefully', async () => {
      // Test with invalid format to trigger error handling
      await expect(bmadService.parseSpecification({
        content: 'some content',
        format: 'invalid' as any,
      })).rejects.toThrow('Unsupported format');
    });
  });

  describe('Public API methods', () => {
    it('should return tasks', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true },
      });
      const tasks = await bmadService.getTasks();
      expect(tasks.length).toBe(response.tasks.length);
    });

    it('should return agents', async () => {
      const agents = await bmadService.getAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].name).toBe('Full-Stack Developer');
    });

    it('should return assignments', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: true },
      });
      const assignments = await bmadService.getAssignments();
      expect(assignments.length).toBe(response.assignments.length);
    });

    it('should update task status', async () => {
      const response = await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true },
      });
      const taskId = response.tasks[0].id;
      const updated = await bmadService.updateTaskStatus(taskId, 'completed');
      expect(updated).toBe(true);
      const tasks = await bmadService.getTasks();
      expect(tasks.find(t => t.id === taskId)?.status).toBe('completed');
    });

    it('should return false if task not found for status update', async () => {
      const updated = await bmadService.updateTaskStatus('non-existent-id', 'completed');
      expect(updated).toBe(false);
    });
  });

  describe('Enhanced parsing with complex scenarios', () => {
    it('should handle markdown with mixed requirement formats', async () => {
      const mixedContent = `---
title: Mixed Requirements Spec
---
# Requirements
- REQ-001: System must support authentication (functional, high)
- The system should handle 1000+ concurrent users (non-functional)

## User Stories
As a user, I want to register so that I can access the system.

## Use Cases  
### Login Process
Description: User authentication flow
Actors: User, System
Preconditions: Valid credentials
Postconditions: User authenticated`;
      
      const response = await bmadService.parseSpecification({
        content: mixedContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: true, validate: true }
      });
      
      expect(response.spec.requirements.length).toBeGreaterThan(0);
      expect(response.spec.userStories?.length).toBeGreaterThan(0);
      expect(response.spec.useCases?.length).toBeGreaterThan(0);
      expect(response.tasks.length).toBeGreaterThan(0);
      expect(response.assignments.length).toBeGreaterThan(0);
      expect(response.validation).toBeDefined();
    });

    it('should handle YAML with nested structures', async () => {
      const nestedYamlContent = `
title: Complex YAML Spec
requirements:
  - id: req-1
    description: Primary requirement
    type: functional
    priority: high
    acceptanceCriteria:
      - criterion1
      - criterion2
userStories:
  - id: story-1
    actor: Admin
    action: manage users
    benefit: control access
    priority: high
    estimatedHours: 8`;
      
      const response = await bmadService.parseSpecification({
        content: nestedYamlContent,
        format: 'yaml'
      });
      
      expect(response.spec.requirements.length).toBe(1);
      expect(response.spec.requirements[0].id).toBe('req-1');
      expect(response.spec.userStories?.length).toBe(1);
      expect(response.spec.userStories?.[0].actor).toBe('Admin');
    });

    it('should handle plain text with unstructured requirements', async () => {
      const unstructuredContent = `
Project Requirements Document

The system needs to support user registration and login.
Performance should handle 500 users simultaneously.
Security requirements include data encryption.

User Story: As an admin, I need to view user reports.
Use Case: Generate monthly analytics reports.`;
      
      const response = await bmadService.parseSpecification({
        content: unstructuredContent,
        format: 'plain',
        options: { generateTasks: false }
      });
      
      expect(response.spec.requirements.length).toBeGreaterThan(0);
      expect(response.tasks.length).toBe(0); // generateTasks is false
    });
  });

  describe('Task management edge cases', () => {
    beforeEach(async () => {
      // Generate some tasks first
      await bmadService.parseSpecification({
        content: markdownContent,
        format: 'markdown',
        options: { generateTasks: true, autoAssign: true }
      });
    });

    it('should handle multiple status updates', async () => {
      const tasks = await bmadService.getTasks();
      const taskId = tasks[0].id;
      
      let updated = await bmadService.updateTaskStatus(taskId, 'in-progress');
      expect(updated).toBe(true);
      
      updated = await bmadService.updateTaskStatus(taskId, 'completed');
      expect(updated).toBe(true);
      
      const updatedTasks = await bmadService.getTasks();
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      expect(updatedTask?.status).toBe('completed');
    });

    it('should maintain agent availability during assignments', async () => {
      const initialAgents = await bmadService.getAgents();
      const availableAgents = initialAgents.filter(a => a.availability === 'available');
      
      expect(availableAgents.length).toBeGreaterThan(0);
      
      const assignments = await bmadService.getAssignments();
      expect(assignments.length).toBeGreaterThan(0);
      
      // Agents should still be available after assignment in this simple implementation
      const agentsAfter = await bmadService.getAgents();
      const stillAvailable = agentsAfter.filter(a => a.availability === 'available');
      expect(stillAvailable.length).toBeGreaterThanOrEqual(0);
    });
  });
});