/**
 * BMAD Tool Handlers
 */

import { BMADService } from '../../services/BMADService.js';
import { MCPTool } from '../../types/index.js';

export function registerBMADTools(
  tools: Map<string, Function>,
  bmadService: BMADService
): MCPTool[] {
  // Tool definitions
  const bmadTools: MCPTool[] = [
    {
      name: 'bmad_parse_specification',
      description: 'Parse a business specification document and generate tasks',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The specification content to parse'
          },
          format: {
            type: 'string',
            enum: ['markdown', 'yaml', 'plain'],
            description: 'Format of the specification content'
          },
          generateTasks: {
            type: 'boolean',
            description: 'Whether to automatically generate tasks from requirements',
            default: true
          },
          autoAssign: {
            type: 'boolean',
            description: 'Whether to automatically assign tasks to agents',
            default: false
          },
          validate: {
            type: 'boolean',
            description: 'Whether to validate generated tasks',
            default: true
          }
        },
        required: ['content', 'format']
      }
    },
    {
      name: 'bmad_update_task_status',
      description: 'Update the status of a specific task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID of the task to update'
          },
          status: {
            type: 'string',
            enum: ['pending', 'assigned', 'in-progress', 'needs-revision', 'completed'],
            description: 'New status for the task'
          }
        },
        required: ['taskId', 'status']
      }
    }
  ];
  
  // Register tool handlers
  tools.set('bmad_parse_specification', async (args: any) => {
    return await bmadService.parseSpecification(args);
  });
  
  tools.set('bmad_update_task_status', async (args: any) => {
    const updated = await bmadService.updateTaskStatus(args.taskId, args.status);
    return { success: updated, taskId: args.taskId, status: args.status };
  });
  
  return bmadTools;
}