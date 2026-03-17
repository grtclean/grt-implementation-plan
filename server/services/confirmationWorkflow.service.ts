/**
 * Confirmation Workflow Service
 * Handles multi-level confirmation process for annual planning changes
 */

import { invokeLLM } from '../_core/llm';
import { InterpretationResult } from './aiInterpretation.service';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("confirm-workflow");

export interface ConfirmationLevel {
  level: number;
  name: string;
  description: string;
  requiredRole: string;
  reviewers: number[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revised';
  comments?: string;
  reviewDate?: Date;
  approvalDate?: Date;
}

export interface ConfirmationWorkflow {
  id: string;
  batchId: string;
  year: number;
  levels: ConfirmationLevel[];
  currentLevel: number;
  overallStatus: 'In Progress' | 'Approved' | 'Rejected';
  createdAt: Date;
  completedAt?: Date;
  createdBy: number;
}

export interface ConfirmationChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  checked: boolean;
  notes?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface ConfirmationChecklist {
  level: number;
  items: ConfirmationChecklistItem[];
  completionPercentage: number;
  canApprove: boolean;
}

/**
 * Create confirmation workflow for a planning batch
 */
export async function createConfirmationWorkflow(
  batchId: string,
  year: number,
  createdBy: number
): Promise<ConfirmationWorkflow> {
  const levels: ConfirmationLevel[] = [
    {
      level: 1,
      name: 'Data Confirmation',
      description: 'Verify extracted data accuracy and completeness',
      requiredRole: 'Data Analyst',
      reviewers: [],
      status: 'Pending'
    },
    {
      level: 2,
      name: 'Business Confirmation',
      description: 'Review business logic and validate assumptions',
      requiredRole: 'Business Manager',
      reviewers: [],
      status: 'Pending'
    },
    {
      level: 3,
      name: 'Technical Confirmation',
      description: 'Review system impact and approve technical changes',
      requiredRole: 'Technical Lead',
      reviewers: [],
      status: 'Pending'
    },
    {
      level: 4,
      name: 'Executive Confirmation',
      description: 'Final approval and sign-off',
      requiredRole: 'Executive',
      reviewers: [],
      status: 'Pending'
    }
  ];

  return {
    id: `conf-${Date.now()}`,
    batchId,
    year,
    levels,
    currentLevel: 1,
    overallStatus: 'In Progress',
    createdAt: new Date(),
    createdBy
  };
}

/**
 * Generate confirmation checklist for a specific level
 */
export async function generateConfirmationChecklist(
  level: number,
  interpretation: InterpretationResult
): Promise<ConfirmationChecklist> {
  const items: ConfirmationChecklistItem[] = [];

  if (level === 1) {
    // Data Confirmation Level
    items.push({
      id: 'data-1',
      category: 'KPIs',
      title: 'All KPI names are clear and specific',
      description: 'Verify that KPI names are descriptive and unambiguous',
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'data-2',
      category: 'KPIs',
      title: 'All KPI targets are realistic',
      description: 'Confirm that target values are achievable and measurable',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'data-3',
      category: 'Organization',
      title: 'Department names are unique',
      description: 'Ensure no duplicate department names exist',
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'data-4',
      category: 'Organization',
      title: 'Manager assignments are valid',
      description: 'Verify that all managers are valid users',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'data-5',
      category: 'Processes',
      title: 'Process names are descriptive',
      description: 'Confirm that process names clearly describe the process',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'data-6',
      category: 'Data Quality',
      title: `No critical data quality issues (${interpretation.insights.dataQuality.filter(i => i.severity === 'High').length} found)`,
      description: 'Review and resolve high-severity data quality issues',
      checked: interpretation.insights.dataQuality.filter(i => i.severity === 'High').length === 0,
      severity: 'Critical'
    });
  } else if (level === 2) {
    // Business Confirmation Level
    items.push({
      id: 'biz-1',
      category: 'KPI Alignment',
      title: 'KPIs align with company strategy',
      description: 'Verify that KPIs support overall business objectives',
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'biz-2',
      category: 'Resource Planning',
      title: 'Organization structure supports KPI targets',
      description: 'Confirm that team sizes and budgets are adequate',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'biz-3',
      category: 'Process Feasibility',
      title: 'Process improvements are feasible',
      description: 'Review implementation timelines and resource requirements',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'biz-4',
      category: 'Risk Assessment',
      title: `No critical business risks (${interpretation.insights.business.filter(i => i.severity === 'High').length} found)`,
      description: 'Review and address high-severity business risks',
      checked: interpretation.insights.business.filter(i => i.severity === 'High').length === 0,
      severity: 'Critical'
    });

    items.push({
      id: 'biz-5',
      category: 'Dependencies',
      title: 'All dependencies are identified',
      description: 'Confirm that cross-functional dependencies are documented',
      checked: false,
      severity: 'Medium'
    });
  } else if (level === 3) {
    // Technical Confirmation Level
    items.push({
      id: 'tech-1',
      category: 'System Impact',
      title: 'System impact assessment is complete',
      description: `${interpretation.insights.systemImpact.length} impacts identified and reviewed`,
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'tech-2',
      category: 'Data Migration',
      title: 'Data migration plan is documented',
      description: 'Confirm that all data migrations are planned and tested',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'tech-3',
      category: 'Integration',
      title: 'Integration points are identified',
      description: 'Review all system integration requirements',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'tech-4',
      category: 'Configuration',
      title: 'Configuration changes are documented',
      description: 'Confirm that all configuration changes are specified',
      checked: false,
      severity: 'Medium'
    });

    items.push({
      id: 'tech-5',
      category: 'Risk Mitigation',
      title: 'Technical risks are mitigated',
      description: 'Review risk mitigation strategies for high-risk changes',
      checked: false,
      severity: 'High'
    });
  } else if (level === 4) {
    // Executive Confirmation Level
    items.push({
      id: 'exec-1',
      category: 'Strategic Alignment',
      title: 'Changes align with strategic objectives',
      description: 'Confirm alignment with 3-5 year business strategy',
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'exec-2',
      category: 'Financial Impact',
      title: 'Financial impact is acceptable',
      description: 'Review budget implications and ROI',
      checked: false,
      severity: 'Critical'
    });

    items.push({
      id: 'exec-3',
      category: 'Timeline',
      title: 'Implementation timeline is approved',
      description: 'Confirm that timeline meets business requirements',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'exec-4',
      category: 'Stakeholder Buy-in',
      title: 'Key stakeholders have approved',
      description: 'Verify approval from all affected departments',
      checked: false,
      severity: 'High'
    });

    items.push({
      id: 'exec-5',
      category: 'Overall Assessment',
      title: 'Ready for implementation',
      description: 'All confirmations complete, ready to proceed',
      checked: false,
      severity: 'Critical'
    });
  }

  const completionPercentage = (items.filter(i => i.checked).length / items.length) * 100;
  const canApprove = items.filter(i => i.severity === 'Critical').every(i => i.checked);

  return {
    level,
    items,
    completionPercentage,
    canApprove
  };
}

/**
 * Update confirmation checklist item
 */
export function updateChecklistItem(
  checklist: ConfirmationChecklist,
  itemId: string,
  checked: boolean,
  notes?: string
): ConfirmationChecklist {
  const item = checklist.items.find(i => i.id === itemId);
  if (item) {
    item.checked = checked;
    if (notes) {
      item.notes = notes;
    }
  }

  const completionPercentage = (checklist.items.filter(i => i.checked).length / checklist.items.length) * 100;
  const canApprove = checklist.items.filter(i => i.severity === 'Critical').every(i => i.checked);

  return {
    ...checklist,
    completionPercentage,
    canApprove
  };
}

/**
 * Generate AI-powered confirmation summary
 */
export async function generateConfirmationSummary(
  level: number,
  interpretation: InterpretationResult,
  checklist: ConfirmationChecklist
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a business process expert. Generate a concise summary of the confirmation level results.
          Include key findings, risks, and recommendations.`
        },
        {
          role: 'user',
          content: `Generate a confirmation summary for Level ${level}:
          
          Interpretation Results: ${JSON.stringify(interpretation, null, 2)}
          
          Checklist Status: ${JSON.stringify(checklist, null, 2)}`
        }
      ]
    });

    return response.choices[0].message.content as any;
  } catch (error) {
    log.error({ err: error }, "Error generating confirmation summary");
    return 'Unable to generate summary at this time.';
  }
}

/**
 * Advance workflow to next level
 */
export function advanceWorkflow(
  workflow: ConfirmationWorkflow,
  comments?: string
): ConfirmationWorkflow {
  const currentLevel = workflow.levels[workflow.currentLevel - 1];
  
  if (currentLevel) {
    currentLevel.status = 'Approved';
    currentLevel.approvalDate = new Date();
    if (comments) {
      currentLevel.comments = comments;
    }
  }

  if (workflow.currentLevel < workflow.levels.length) {
    workflow.currentLevel += 1;
  } else {
    workflow.overallStatus = 'Approved';
    workflow.completedAt = new Date();
  }

  return workflow;
}

/**
 * Reject workflow at current level
 */
export function rejectWorkflow(
  workflow: ConfirmationWorkflow,
  comments: string
): ConfirmationWorkflow {
  const currentLevel = workflow.levels[workflow.currentLevel - 1];
  
  if (currentLevel) {
    currentLevel.status = 'Rejected';
    currentLevel.comments = comments;
  }

  workflow.overallStatus = 'Rejected';
  workflow.completedAt = new Date();

  return workflow;
}

/**
 * Request revision at current level
 */
export function requestRevision(
  workflow: ConfirmationWorkflow,
  comments: string
): ConfirmationWorkflow {
  const currentLevel = workflow.levels[workflow.currentLevel - 1];
  
  if (currentLevel) {
    currentLevel.status = 'Revised';
    currentLevel.comments = comments;
  }

  return workflow;
}

/**
 * Get confirmation status summary
 */
export function getConfirmationStatusSummary(workflow: ConfirmationWorkflow): {
  overallStatus: string;
  currentLevel: string;
  completedLevels: number;
  remainingLevels: number;
  progressPercentage: number;
} {
  const completedLevels = workflow.levels.filter(l => l.status === 'Approved').length;
  const remainingLevels = workflow.levels.length - completedLevels;
  const progressPercentage = (completedLevels / workflow.levels.length) * 100;

  return {
    overallStatus: workflow.overallStatus,
    currentLevel: workflow.levels[workflow.currentLevel - 1]?.name || 'Unknown',
    completedLevels,
    remainingLevels,
    progressPercentage
  };
}

/**
 * Generate adjustment suggestions based on feedback
 */
export async function generateAdjustmentSuggestions(
  interpretation: InterpretationResult,
  feedback: string
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a business consultant. Based on the feedback, provide specific adjustment suggestions
          to improve the annual planning data.`
        },
        {
          role: 'user',
          content: `Feedback: ${feedback}
          
          Current Interpretation: ${JSON.stringify(interpretation, null, 2)}
          
          Provide specific adjustment suggestions.`
        }
      ]
    });

    return response.choices[0].message.content as any;
  } catch (error) {
    log.error({ err: error }, "Error generating adjustment suggestions");
    return 'Unable to generate suggestions at this time.';
  }
}
