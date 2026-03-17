/**
 * AI Interpretation Service
 * Handles image processing, OCR, content interpretation, and relationship mapping
 * for the Annual Planning and Change Management System
 */

import { invokeLLM } from '../_core/llm';
import { z } from 'zod';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger('ai-interpretation');

// Types
export interface KPIInterpretation {
  name: string;
  category: 'Revenue' | 'Cost' | 'Quality' | 'Delivery' | 'Customer' | 'Employee' | 'Innovation';
  target: number;
  unit: string;
  owner?: string;
  description?: string;
  calculationMethod?: string;
  dataSource?: 'System' | 'Manual' | 'External';
  reviewFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual';
  confidence: number;
}

export interface OrgStructureInterpretation {
  departmentName: string;
  parentDepartment?: string;
  manager?: string;
  teamSize?: number;
  budget?: number;
  responsibilities?: string;
  changeType: 'New' | 'Modify' | 'Remove';
  confidence: number;
}

export interface ProcessInterpretation {
  processName: string;
  currentDescription?: string;
  proposedImprovement?: string;
  expectedBenefits?: string;
  implementationTimeline?: {
    start: string;
    end: string;
  };
  requiredResources?: string;
  riskAssessment?: string;
  priority: 'High' | 'Medium' | 'Low';
  confidence: number;
}

export interface DataQualityIssue {
  type: 'MISSING_FIELD' | 'INCONSISTENT_DATA' | 'DUPLICATE_ENTRY' | 'FORMAT_ERROR';
  severity: 'High' | 'Medium' | 'Low';
  message: string;
  affectedItem: string;
  suggestedAction: string;
}

export interface BusinessInsight {
  type: 'CONFLICT' | 'CONSTRAINT' | 'FEASIBILITY' | 'RISK';
  severity: 'High' | 'Medium' | 'Low';
  message: string;
  affectedItems: string[];
  recommendation: string;
}

export interface SystemImpact {
  affectedModule: string;
  impactType: 'Data Migration' | 'Configuration' | 'Integration' | 'Schema Change';
  description: string;
  estimatedEffort: 'Low' | 'Medium' | 'High';
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface Relationship {
  type: string;
  source: string;
  target: string;
  confidence: number;
  description?: string;
}

export interface InterpretationResult {
  kpis: KPIInterpretation[];
  orgStructure: OrgStructureInterpretation[];
  processes: ProcessInterpretation[];
  relationships: Relationship[];
  insights: {
    dataQuality: DataQualityIssue[];
    business: BusinessInsight[];
    systemImpact: SystemImpact[];
  };
  overallConfidence: number;
  summary: string;
}

/**
 * Interpret KPI content from text or OCR results
 */
export async function interpretKPIContent(content: string): Promise<KPIInterpretation[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in business KPI analysis. Extract KPI information from the provided text.
          Return a JSON array with the following structure for each KPI:
          - name: string (required)
          - category: enum (Revenue|Cost|Quality|Delivery|Customer|Employee|Innovation)
          - target: number (required)
          - unit: string (required)
          - owner: string (optional, person name)
          - description: string (optional)
          - calculationMethod: string (optional)
          - dataSource: enum (System|Manual|External)
          - reviewFrequency: enum (Daily|Weekly|Monthly|Quarterly|Annual)
          - confidence: number (0-100, your confidence in the extraction)`
        },
        {
          role: 'user',
          content: `Extract KPI information from this content:\n\n${content}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'kpi_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              kpis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                    target: { type: 'number' },
                    unit: { type: 'string' },
                    owner: { type: 'string' },
                    description: { type: 'string' },
                    calculationMethod: { type: 'string' },
                    dataSource: { type: 'string' },
                    reviewFrequency: { type: 'string' },
                    confidence: { type: 'number' }
                  },
                  required: ['name', 'category', 'target', 'unit', 'confidence']
                }
              }
            },
            required: ['kpis']
          }
        }
      }
    });

    const result = JSON.parse(response.choices![0].message.content!);
    return result.kpis || [];
  } catch (error) {
    log.error({ err: error }, "error interpreting KPI content");
    return [];
  }
}

/**
 * Interpret organization structure from text or OCR results
 */
export async function interpretOrgStructure(content: string): Promise<OrgStructureInterpretation[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in organizational structure analysis. Extract organization structure information from the provided text.
          Return a JSON array with the following structure for each department/team:
          - departmentName: string (required)
          - parentDepartment: string (optional, parent department name)
          - manager: string (optional, manager name)
          - teamSize: number (optional)
          - budget: number (optional)
          - responsibilities: string (optional)
          - changeType: enum (New|Modify|Remove)
          - confidence: number (0-100, your confidence in the extraction)`
        },
        {
          role: 'user',
          content: `Extract organization structure information from this content:\n\n${content}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'org_structure_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              departments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    departmentName: { type: 'string' },
                    parentDepartment: { type: 'string' },
                    manager: { type: 'string' },
                    teamSize: { type: 'number' },
                    budget: { type: 'number' },
                    responsibilities: { type: 'string' },
                    changeType: { type: 'string' },
                    confidence: { type: 'number' }
                  },
                  required: ['departmentName', 'changeType', 'confidence']
                }
              }
            },
            required: ['departments']
          }
        }
      }
    });

    const result = JSON.parse(response.choices![0].message.content!);
    return result.departments || [];
  } catch (error) {
    log.error({ err: error }, "error interpreting org structure");
    return [];
  }
}

/**
 * Interpret process improvements from text or OCR results
 */
export async function interpretProcessImprovements(content: string): Promise<ProcessInterpretation[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in process improvement analysis. Extract process improvement information from the provided text.
          Return a JSON array with the following structure for each process:
          - processName: string (required)
          - currentDescription: string (optional)
          - proposedImprovement: string (optional)
          - expectedBenefits: string (optional)
          - implementationTimeline: object with start and end dates (optional)
          - requiredResources: string (optional)
          - riskAssessment: string (optional)
          - priority: enum (High|Medium|Low)
          - confidence: number (0-100, your confidence in the extraction)`
        },
        {
          role: 'user',
          content: `Extract process improvement information from this content:\n\n${content}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'process_improvement_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              processes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    processName: { type: 'string' },
                    currentDescription: { type: 'string' },
                    proposedImprovement: { type: 'string' },
                    expectedBenefits: { type: 'string' },
                    implementationTimeline: {
                      type: 'object',
                      properties: {
                        start: { type: 'string' },
                        end: { type: 'string' }
                      }
                    },
                    requiredResources: { type: 'string' },
                    riskAssessment: { type: 'string' },
                    priority: { type: 'string' },
                    confidence: { type: 'number' }
                  },
                  required: ['processName', 'priority', 'confidence']
                }
              }
            },
            required: ['processes']
          }
        }
      }
    });

    const result = JSON.parse(response.choices![0].message.content!);
    return result.processes || [];
  } catch (error) {
    log.error({ err: error }, "error interpreting process improvements");
    return [];
  }
}

/**
 * Check data quality and generate issues
 */
export function checkDataQuality(
  kpis: KPIInterpretation[],
  orgStructure: OrgStructureInterpretation[],
  processes: ProcessInterpretation[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  // Check KPIs
  for (const kpi of kpis) {
    if (!kpi.name || kpi.name.trim() === '') {
      issues.push({
        type: 'MISSING_FIELD',
        severity: 'High',
        message: 'KPI name is missing',
        affectedItem: `KPI #${kpis.indexOf(kpi) + 1}`,
        suggestedAction: 'Provide a name for this KPI'
      });
    }

    if (!kpi.unit || kpi.unit.trim() === '') {
      issues.push({
        type: 'MISSING_FIELD',
        severity: 'Medium',
        message: `KPI "${kpi.name}" is missing unit`,
        affectedItem: `KPI: ${kpi.name}`,
        suggestedAction: 'Specify the unit of measurement'
      });
    }

    if (kpi.confidence < 70) {
      issues.push({
        type: 'FORMAT_ERROR',
        severity: 'Medium',
        message: `Low confidence in KPI "${kpi.name}" extraction (${kpi.confidence}%)`,
        affectedItem: `KPI: ${kpi.name}`,
        suggestedAction: 'Review and manually correct this KPI'
      });
    }
  }

  // Check for duplicate KPI names
  const kpiNames = kpis.map(k => k.name.toLowerCase());
  const duplicates = kpiNames.filter((name, index) => kpiNames.indexOf(name) !== index);
  for (const duplicate of duplicates) {
    issues.push({
      type: 'DUPLICATE_ENTRY',
      severity: 'High',
      message: `Duplicate KPI name found: "${duplicate}"`,
      affectedItem: `KPI: ${duplicate}`,
      suggestedAction: 'Rename or remove duplicate KPI'
    });
  }

  // Check org structure
  for (const dept of orgStructure) {
    if (!dept.departmentName || dept.departmentName.trim() === '') {
      issues.push({
        type: 'MISSING_FIELD',
        severity: 'High',
        message: 'Department name is missing',
        affectedItem: `Department #${orgStructure.indexOf(dept) + 1}`,
        suggestedAction: 'Provide a name for this department'
      });
    }

    if (dept.teamSize && dept.teamSize < 0) {
      issues.push({
        type: 'FORMAT_ERROR',
        severity: 'High',
        message: `Department "${dept.departmentName}" has invalid team size: ${dept.teamSize}`,
        affectedItem: `Department: ${dept.departmentName}`,
        suggestedAction: 'Correct the team size to a positive number'
      });
    }
  }

  // Check processes
  for (const process of processes) {
    if (!process.processName || process.processName.trim() === '') {
      issues.push({
        type: 'MISSING_FIELD',
        severity: 'High',
        message: 'Process name is missing',
        affectedItem: `Process #${processes.indexOf(process) + 1}`,
        suggestedAction: 'Provide a name for this process'
      });
    }

    if (process.implementationTimeline) {
      const start = new Date(process.implementationTimeline.start);
      const end = new Date(process.implementationTimeline.end);
      if (start > end) {
        issues.push({
          type: 'FORMAT_ERROR',
          severity: 'High',
          message: `Process "${process.processName}" has invalid timeline (start > end)`,
          affectedItem: `Process: ${process.processName}`,
          suggestedAction: 'Correct the implementation timeline'
        });
      }
    }
  }

  return issues;
}

/**
 * Analyze business logic and generate insights
 */
export async function analyzeBusinessLogic(
  kpis: KPIInterpretation[],
  orgStructure: OrgStructureInterpretation[],
  processes: ProcessInterpretation[]
): Promise<BusinessInsight[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert business analyst. Analyze the provided KPIs, organization structure, and processes for potential conflicts, constraints, and feasibility issues.
          Return a JSON array with the following structure for each insight:
          - type: enum (CONFLICT|CONSTRAINT|FEASIBILITY|RISK)
          - severity: enum (High|Medium|Low)
          - message: string (description of the issue)
          - affectedItems: array of strings (items affected)
          - recommendation: string (suggested action)`
        },
        {
          role: 'user',
          content: `Analyze these planning changes for business logic issues:
          
          KPIs: ${JSON.stringify(kpis, null, 2)}
          
          Organization Structure: ${JSON.stringify(orgStructure, null, 2)}
          
          Processes: ${JSON.stringify(processes, null, 2)}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'business_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              insights: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    severity: { type: 'string' },
                    message: { type: 'string' },
                    affectedItems: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    recommendation: { type: 'string' }
                  },
                  required: ['type', 'severity', 'message', 'affectedItems', 'recommendation']
                }
              }
            },
            required: ['insights']
          }
        }
      }
    });

    const result = JSON.parse(response.choices![0].message.content!);
    return result.insights || [];
  } catch (error) {
    log.error({ err: error }, "error analyzing business logic");
    return [];
  }
}

/**
 * Analyze system impact of proposed changes
 */
export async function analyzeSystemImpact(
  kpis: KPIInterpretation[],
  orgStructure: OrgStructureInterpretation[],
  processes: ProcessInterpretation[]
): Promise<SystemImpact[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert system architect. Analyze the proposed changes for system impact.
          Return a JSON array with the following structure for each impact:
          - affectedModule: string (which system module is affected)
          - impactType: enum (Data Migration|Configuration|Integration|Schema Change)
          - description: string (description of the impact)
          - estimatedEffort: enum (Low|Medium|High)
          - riskLevel: enum (Low|Medium|High)`
        },
        {
          role: 'user',
          content: `Analyze system impact of these changes:
          
          KPIs: ${JSON.stringify(kpis, null, 2)}
          
          Organization Structure: ${JSON.stringify(orgStructure, null, 2)}
          
          Processes: ${JSON.stringify(processes, null, 2)}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'system_impact_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              impacts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    affectedModule: { type: 'string' },
                    impactType: { type: 'string' },
                    description: { type: 'string' },
                    estimatedEffort: { type: 'string' },
                    riskLevel: { type: 'string' }
                  },
                  required: ['affectedModule', 'impactType', 'description', 'estimatedEffort', 'riskLevel']
                }
              }
            },
            required: ['impacts']
          }
        }
      }
    });

    const result = JSON.parse(response.choices![0].message.content!);
    return result.impacts || [];
  } catch (error) {
    log.error({ err: error }, "error analyzing system impact");
    return [];
  }
}

/**
 * Map relationships between entities
 */
export function mapRelationships(
  kpis: KPIInterpretation[],
  orgStructure: OrgStructureInterpretation[],
  processes: ProcessInterpretation[]
): Relationship[] {
  const relationships: Relationship[] = [];

  // Map KPIs to owners
  for (const kpi of kpis) {
    if (kpi.owner) {
      relationships.push({
        type: 'KPI_OWNER',
        source: `KPI: ${kpi.name}`,
        target: `Person: ${kpi.owner}`,
        confidence: kpi.confidence,
        description: `${kpi.name} is owned by ${kpi.owner}`
      });
    }
  }

  // Map processes to departments
  for (const process of processes) {
    // Try to find related departments from content
    for (const dept of orgStructure) {
      if (process.processName.toLowerCase().includes(dept.departmentName.toLowerCase()) ||
          process.currentDescription?.toLowerCase().includes(dept.departmentName.toLowerCase())) {
        relationships.push({
          type: 'PROCESS_DEPARTMENT',
          source: `Process: ${process.processName}`,
          target: `Department: ${dept.departmentName}`,
          confidence: 0.85,
          description: `${process.processName} is related to ${dept.departmentName}`
        });
      }
    }
  }

  // Map org structure hierarchy
  for (const dept of orgStructure) {
    if (dept.parentDepartment) {
      relationships.push({
        type: 'DEPARTMENT_HIERARCHY',
        source: `Department: ${dept.departmentName}`,
        target: `Department: ${dept.parentDepartment}`,
        confidence: dept.confidence,
        description: `${dept.departmentName} reports to ${dept.parentDepartment}`
      });
    }

    if (dept.manager) {
      relationships.push({
        type: 'DEPARTMENT_MANAGER',
        source: `Department: ${dept.departmentName}`,
        target: `Person: ${dept.manager}`,
        confidence: dept.confidence,
        description: `${dept.departmentName} is managed by ${dept.manager}`
      });
    }
  }

  return relationships;
}

/**
 * Generate comprehensive interpretation result
 */
export async function generateInterpretationResult(
  content: string,
  documentType: 'KPI' | 'OrgStructure' | 'Process' | 'Mixed'
): Promise<InterpretationResult> {
  try {
    // Extract content based on type
    let kpis: KPIInterpretation[] = [];
    let orgStructure: OrgStructureInterpretation[] = [];
    let processes: ProcessInterpretation[] = [];

    if (documentType === 'KPI' || documentType === 'Mixed') {
      kpis = await interpretKPIContent(content);
    }

    if (documentType === 'OrgStructure' || documentType === 'Mixed') {
      orgStructure = await interpretOrgStructure(content);
    }

    if (documentType === 'Process' || documentType === 'Mixed') {
      processes = await interpretProcessImprovements(content);
    }

    // Analyze quality
    const dataQualityIssues = checkDataQuality(kpis, orgStructure, processes);

    // Analyze business logic
    const businessInsights = await analyzeBusinessLogic(kpis, orgStructure, processes);

    // Analyze system impact
    const systemImpacts = await analyzeSystemImpact(kpis, orgStructure, processes);

    // Map relationships
    const relationships = mapRelationships(kpis, orgStructure, processes);

    // Calculate overall confidence
    const allItems = [...kpis, ...orgStructure, ...processes];
    const overallConfidence = allItems.length > 0
      ? allItems.reduce((sum, item) => sum + item.confidence, 0) / allItems.length
      : 0;

    // Generate summary
    const summary = `
      Interpretation Results:
      - ${kpis.length} KPIs identified
      - ${orgStructure.length} organization structure changes identified
      - ${processes.length} process improvements identified
      - ${relationships.length} relationships mapped
      - ${dataQualityIssues.length} data quality issues found
      - ${businessInsights.length} business insights generated
      - ${systemImpacts.length} system impacts identified
      - Overall confidence: ${overallConfidence.toFixed(1)}%
    `;

    return {
      kpis,
      orgStructure,
      processes,
      relationships,
      insights: {
        dataQuality: dataQualityIssues,
        business: businessInsights,
        systemImpact: systemImpacts
      },
      overallConfidence,
      summary: summary.trim()
    };
  } catch (error) {
    log.error({ err: error }, "error generating interpretation result");
    throw error;
  }
}

/**
 * Generate AI recommendations based on interpretation
 */
export async function generateAIRecommendations(
  interpretation: InterpretationResult
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a strategic business consultant. Provide actionable recommendations based on the analysis.'
        },
        {
          role: 'user',
          content: `Based on this annual planning analysis, provide strategic recommendations:
          
          ${JSON.stringify(interpretation, null, 2)}`
        }
      ]
    });

    return response.choices[0].message.content as any;
  } catch (error) {
    log.error({ err: error }, "error generating AI recommendations");
    return 'Unable to generate recommendations at this time.';
  }
}
