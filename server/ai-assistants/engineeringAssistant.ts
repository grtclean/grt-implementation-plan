/**
 * AI Engineering Assistant - 工程助手服务
 * 负责项目全生命周期(M0-M12)的任务分配、通知管理和进度跟踪
 */

import { invokeLLM } from '../_core/llm';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("eng-assistant");

// 项目生命周期阶段定义
export const PROJECT_PHASES = {
  M0: { code: 'M0', name: '项目启动', activities: '需求确认、合同签订', output: '项目启动书' },
  M1: { code: 'M1', name: '方案设计', activities: '技术方案、工艺设计', output: '设计方案书' },
  M2: { code: 'M2', name: '设计评审', activities: '内部评审、客户确认', output: '评审报告' },
  M3: { code: 'M3', name: '详细设计', activities: '机械/电气详细设计', output: '设计图纸' },
  M4: { code: 'M4', name: 'BOM发布', activities: '物料清单、采购申请', output: 'BOM清单' },
  M5: { code: 'M5', name: '生产准备', activities: '物料到货、生产排程', output: '生产计划' },
  M6: { code: 'M6', name: '机械装配', activities: '结构件装配、管路安装', output: '装配记录' },
  M7: { code: 'M7', name: '电气装配', activities: '电气柜装配、布线', output: '电气检查单' },
  M8: { code: 'M8', name: '整机调试', activities: '功能调试、性能测试', output: '调试报告' },
  M9: { code: 'M9', name: '厂内验收', activities: 'FAT测试、客户预验收', output: 'FAT报告' },
  M10: { code: 'M10', name: '发货拆解', activities: '设备拆解、包装发运', output: '发货清单' },
  M11: { code: 'M11', name: '现场安装', activities: '客户端安装、调试', output: '安装报告' },
  M12: { code: 'M12', name: '终验收', activities: 'SAT测试、正式验收', output: '验收证书' },
} as const;

// 角色定义
export const ENGINEERING_ROLES = {
  PM: { code: 'PM', name: '项目经理', responsibilities: '项目整体协调、进度管控' },
  ME: { code: 'ME', name: '机械工程师', responsibilities: '机械设计、装配指导' },
  EE: { code: 'EE', name: '电气工程师', responsibilities: '电气设计、PLC编程' },
  PE: { code: 'PE', name: '工艺工程师', responsibilities: '工艺方案、参数优化' },
  QE: { code: 'QE', name: '质量工程师', responsibilities: '质量检验、问题跟踪' },
  SE: { code: 'SE', name: '售后工程师', responsibilities: '现场安装、客户培训' },
  PP: { code: 'PP', name: '生产计划员', responsibilities: '生产排程、物料协调' },
  PU: { code: 'PU', name: '采购员', responsibilities: '物料采购、供应商管理' },
} as const;

// 阶段-角色责任矩阵 (● = 主责, ○ = 参与)
export const PHASE_ROLE_MATRIX: Record<string, Record<string, 'primary' | 'participate' | null>> = {
  M0: { PM: 'primary', ME: null, EE: null, PE: 'participate', QE: null, SE: null, PP: null, PU: null },
  M1: { PM: 'participate', ME: 'primary', EE: 'primary', PE: 'primary', QE: null, SE: null, PP: null, PU: null },
  M2: { PM: 'primary', ME: 'participate', EE: 'participate', PE: 'participate', QE: 'participate', SE: null, PP: null, PU: null },
  M3: { PM: 'participate', ME: 'primary', EE: 'primary', PE: 'participate', QE: null, SE: null, PP: null, PU: null },
  M4: { PM: 'participate', ME: 'primary', EE: 'primary', PE: null, QE: null, SE: null, PP: 'participate', PU: 'primary' },
  M5: { PM: 'participate', ME: null, EE: null, PE: null, QE: null, SE: null, PP: 'primary', PU: 'primary' },
  M6: { PM: 'participate', ME: 'primary', EE: null, PE: null, QE: 'participate', SE: null, PP: 'participate', PU: null },
  M7: { PM: 'participate', ME: null, EE: 'primary', PE: null, QE: 'participate', SE: null, PP: 'participate', PU: null },
  M8: { PM: 'participate', ME: 'participate', EE: 'primary', PE: 'primary', QE: 'participate', SE: null, PP: null, PU: null },
  M9: { PM: 'primary', ME: 'participate', EE: 'participate', PE: 'participate', QE: 'primary', SE: null, PP: null, PU: null },
  M10: { PM: 'participate', ME: null, EE: null, PE: null, QE: null, SE: 'participate', PP: 'primary', PU: null },
  M11: { PM: 'participate', ME: 'participate', EE: 'participate', PE: null, QE: null, SE: 'primary', PP: null, PU: null },
  M12: { PM: 'primary', ME: null, EE: null, PE: null, QE: 'primary', SE: 'participate', PP: null, PU: null },
};

// 通知渠道配置
export const NOTIFICATION_CHANNELS = {
  screen_popup: { priority: 'urgent', confirmRequired: true, description: '屏幕弹窗' },
  system_message: { priority: 'high', confirmRequired: false, description: '系统消息' },
  email: { priority: 'medium', confirmRequired: true, description: '邮件通知' },
  wechat: { priority: 'medium', confirmRequired: false, description: '企业微信' },
  sms: { priority: 'urgent', confirmRequired: true, description: '短信通知' },
} as const;

// 通知优先级时间规则
export const PRIORITY_TIMING = {
  urgent: 'immediate',      // 紧急：立即发送
  high: 'within_30_minutes', // 高：30分钟内
  medium: 'next_work_hour',  // 中：下一个工作小时
  low: 'daily_digest',       // 低：每日汇总
} as const;

// 任务类型定义
export interface EngineeringTaskInput {
  projectId: number;
  projectName: string;
  phaseCode: string;
  taskType: string;
  taskDescription?: string;
  bomItems?: BomItemInfo[];
  deadline?: Date;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

export interface BomItemInfo {
  itemId: number;
  itemName: string;
  level: number;
  assemblyType: 'mechanical' | 'electrical' | 'pneumatic' | 'hydraulic';
  estimatedHours?: number;
}

export interface TaskAssignment {
  taskId: string;
  taskName: string;
  taskType: string;
  phaseCode: string;
  primaryAssignee: {
    roleCode: string;
    roleName: string;
    userId?: number;
  };
  backupAssignee?: {
    roleCode: string;
    roleName: string;
    userId?: number;
  };
  estimatedHours: number;
  deadline?: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  notifications: NotificationPlan[];
  qualityCheckpoints: QualityCheckpoint[];
}

export interface NotificationPlan {
  channel: keyof typeof NOTIFICATION_CHANNELS;
  timing: string;
  recipients: string[];
  subject: string;
  contentTemplate: string;
  confirmationRequired: boolean;
  escalationRules?: EscalationRule[];
}

export interface EscalationRule {
  triggerAfterHours: number;
  action: 'reminder' | 'escalate_to_manager' | 'escalate_to_director';
  recipients: string[];
}

export interface QualityCheckpoint {
  checkType: 'self' | 'mutual' | 'special';
  checkItems: string[];
  standard: string;
  required: boolean;
}

export interface CustomerCommunicationInput {
  projectId: number;
  phaseCode: string;
  communicationType: string;
  rawContent: string;
  customerContacts: string[];
  internalParticipants: string[];
}

export interface CustomerCommunicationSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  followUpDate?: Date;
  risks?: string[];
}

export interface ActionItem {
  description: string;
  assignee: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface EngineeringInputAnalysis {
  sourceType: string;
  extractedRequirements: ExtractedRequirement[];
  suggestedTasks: SuggestedTask[];
  impactAssessment: ImpactAssessment;
  distributionPlan: DistributionPlan;
}

export interface ExtractedRequirement {
  category: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  affectedPhases: string[];
}

export interface SuggestedTask {
  taskName: string;
  taskType: string;
  phaseCode: string;
  assigneeRole: string;
  estimatedHours: number;
  dependencies: string[];
}

export interface ImpactAssessment {
  scheduleImpact: 'none' | 'minor' | 'moderate' | 'major';
  costImpact: 'none' | 'minor' | 'moderate' | 'major';
  qualityImpact: 'none' | 'minor' | 'moderate' | 'major';
  riskLevel: 'low' | 'medium' | 'high';
  mitigationSuggestions: string[];
}

export interface DistributionPlan {
  recipients: {
    roleCode: string;
    reason: string;
    urgency: 'immediate' | 'same_day' | 'next_day';
  }[];
  notificationChannels: string[];
}

/**
 * AI Engineering Assistant 主类
 */
export class AIEngineeringAssistant {
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = `你是GRT工业清洗设备公司的AI工程助手，专门负责项目全生命周期管理。

你的职责包括：
1. 根据项目阶段自动分配任务给相应角色
2. 生成智能通知计划，确保信息及时传达
3. 分析客户沟通内容，提取关键信息和行动项
4. 处理各类工程输入，分发给相关人员
5. 优化任务时间安排，避免资源冲突

项目阶段(M0-M12)：
- M0项目启动 → M1方案设计 → M2设计评审 → M3详细设计
- M4 BOM发布 → M5生产准备 → M6机械装配 → M7电气装配
- M8整机调试 → M9厂内验收(FAT) → M10发货拆解 → M11现场安装 → M12终验收(SAT)

角色职责：
- PM(项目经理): 项目协调、进度管控
- ME(机械工程师): 机械设计、装配指导
- EE(电气工程师): 电气设计、PLC编程
- PE(工艺工程师): 工艺方案、参数优化
- QE(质量工程师): 质量检验、问题跟踪
- SE(售后工程师): 现场安装、客户培训
- PP(生产计划员): 生产排程、物料协调
- PU(采购员): 物料采购、供应商管理

请始终以JSON格式返回结果。`;
  }

  /**
   * 生成任务分配方案
   */
  async generateTaskAssignments(input: EngineeringTaskInput): Promise<TaskAssignment[]> {
    const phaseInfo = PROJECT_PHASES[input.phaseCode as keyof typeof PROJECT_PHASES];
    const roleMatrix = PHASE_ROLE_MATRIX[input.phaseCode];

    if (!phaseInfo || !roleMatrix) {
      throw new Error(`Invalid phase code: ${input.phaseCode}`);
    }

    const prompt = `请为以下项目任务生成详细的任务分配方案：

项目信息：
- 项目ID: ${input.projectId}
- 项目名称: ${input.projectName}
- 当前阶段: ${input.phaseCode} - ${phaseInfo.name}
- 阶段活动: ${phaseInfo.activities}
- 预期输出: ${phaseInfo.output}
- 任务类型: ${input.taskType}
- 任务描述: ${input.taskDescription || '无'}
- 截止日期: ${input.deadline ? input.deadline.toISOString() : '未指定'}
- 优先级: ${input.priority || 'medium'}

${input.bomItems ? `BOM物料信息：
${input.bomItems.map(item => `- ${item.itemName} (Level ${item.level}, ${item.assemblyType}, 预计${item.estimatedHours || 0}小时)`).join('\n')}` : ''}

阶段角色矩阵：
${Object.entries(roleMatrix)
  .filter(([_, role]) => role !== null)
  .map(([code, role]) => `- ${code}: ${role === 'primary' ? '主责' : '参与'}`)
  .join('\n')}

请生成JSON格式的任务分配方案，包含：
1. 任务列表（每个任务包含ID、名称、类型、主责人、备选人、预计工时、截止日期、优先级）
2. 通知计划（渠道、时机、接收人、主题、内容模板、是否需要确认、升级规则）
3. 质量检查点（检查类型、检查项、标准、是否必需）

返回格式：
{
  "tasks": [
    {
      "taskId": "TASK-xxx",
      "taskName": "任务名称",
      "taskType": "任务类型",
      "phaseCode": "M1",
      "primaryAssignee": { "roleCode": "ME", "roleName": "机械工程师" },
      "backupAssignee": { "roleCode": "EE", "roleName": "电气工程师" },
      "estimatedHours": 8,
      "deadline": "2026-01-20",
      "priority": "high",
      "notifications": [...],
      "qualityCheckpoints": [...]
    }
  ]
}`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'task_assignments',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskId: { type: 'string' },
                      taskName: { type: 'string' },
                      taskType: { type: 'string' },
                      phaseCode: { type: 'string' },
                      primaryAssignee: {
                        type: 'object',
                        properties: {
                          roleCode: { type: 'string' },
                          roleName: { type: 'string' }
                        },
                        required: ['roleCode', 'roleName'],
                        additionalProperties: false
                      },
                      backupAssignee: {
                        type: 'object',
                        properties: {
                          roleCode: { type: 'string' },
                          roleName: { type: 'string' }
                        },
                        required: ['roleCode', 'roleName'],
                        additionalProperties: false
                      },
                      estimatedHours: { type: 'number' },
                      deadline: { type: 'string' },
                      priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
                      notifications: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            channel: { type: 'string' },
                            timing: { type: 'string' },
                            recipients: { type: 'array', items: { type: 'string' } },
                            subject: { type: 'string' },
                            contentTemplate: { type: 'string' },
                            confirmationRequired: { type: 'boolean' }
                          },
                          required: ['channel', 'timing', 'recipients', 'subject', 'contentTemplate', 'confirmationRequired'],
                          additionalProperties: false
                        }
                      },
                      qualityCheckpoints: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            checkType: { type: 'string', enum: ['self', 'mutual', 'special'] },
                            checkItems: { type: 'array', items: { type: 'string' } },
                            standard: { type: 'string' },
                            required: { type: 'boolean' }
                          },
                          required: ['checkType', 'checkItems', 'standard', 'required'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['taskId', 'taskName', 'taskType', 'phaseCode', 'primaryAssignee', 'estimatedHours', 'priority', 'notifications', 'qualityCheckpoints'],
                    additionalProperties: false
                  }
                }
              },
              required: ['tasks'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Empty or invalid response from LLM');
      }

      const result = JSON.parse(content);
      return result.tasks;
    } catch (error) {
      log.error({ err: error }, "Error generating task assignments");
      // 返回基于规则的默认分配
      return this.generateDefaultTaskAssignments(input, phaseInfo, roleMatrix);
    }
  }

  /**
   * 基于规则的默认任务分配
   */
  private generateDefaultTaskAssignments(
    input: EngineeringTaskInput,
    phaseInfo: typeof PROJECT_PHASES[keyof typeof PROJECT_PHASES],
    roleMatrix: Record<string, 'primary' | 'participate' | null>
  ): TaskAssignment[] {
    const primaryRoles = Object.entries(roleMatrix)
      .filter(([_, role]) => role === 'primary')
      .map(([code]) => code);

    const participateRoles = Object.entries(roleMatrix)
      .filter(([_, role]) => role === 'participate')
      .map(([code]) => code);

    const tasks: TaskAssignment[] = [];
    const taskId = `TASK-${input.projectId}-${input.phaseCode}-${Date.now()}`;

    const primaryRole = primaryRoles[0] || 'PM';
    const backupRole = primaryRoles[1] || participateRoles[0];

    tasks.push({
      taskId,
      taskName: `${phaseInfo.name} - ${input.taskType}`,
      taskType: input.taskType,
      phaseCode: input.phaseCode,
      primaryAssignee: {
        roleCode: primaryRole,
        roleName: ENGINEERING_ROLES[primaryRole as keyof typeof ENGINEERING_ROLES]?.name || primaryRole
      },
      backupAssignee: backupRole ? {
        roleCode: backupRole,
        roleName: ENGINEERING_ROLES[backupRole as keyof typeof ENGINEERING_ROLES]?.name || backupRole
      } : undefined,
      estimatedHours: 8,
      deadline: input.deadline,
      priority: input.priority || 'medium',
      notifications: [
        {
          channel: 'email',
          timing: 'immediate',
          recipients: [primaryRole, ...(backupRole ? [backupRole] : [])],
          subject: `[${input.projectName}] ${phaseInfo.name}任务分配`,
          contentTemplate: `您有新的${phaseInfo.name}任务需要处理，请及时查看。`,
          confirmationRequired: true
        }
      ],
      qualityCheckpoints: [
        {
          checkType: 'self',
          checkItems: ['完成度检查', '文档完整性'],
          standard: phaseInfo.output,
          required: true
        }
      ]
    });

    return tasks;
  }

  /**
   * 分析客户沟通内容
   */
  async analyzeCustomerCommunication(input: CustomerCommunicationInput): Promise<CustomerCommunicationSummary> {
    const prompt = `请分析以下客户沟通内容，提取关键信息：

项目ID: ${input.projectId}
阶段: ${input.phaseCode}
沟通类型: ${input.communicationType}
客户联系人: ${input.customerContacts.join(', ')}
内部参与人: ${input.internalParticipants.join(', ')}

沟通内容：
${input.rawContent}

请提取：
1. 沟通摘要（100字以内）
2. 关键要点（列表）
3. 行动项（包含描述、负责人、截止日期、优先级）
4. 下一步计划
5. 建议的跟进日期
6. 潜在风险（如有）

返回JSON格式。`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'communication_summary',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                actionItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      assignee: { type: 'string' },
                      deadline: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    },
                    required: ['description', 'assignee', 'priority'],
                    additionalProperties: false
                  }
                },
                nextSteps: { type: 'array', items: { type: 'string' } },
                followUpDate: { type: 'string' },
                risks: { type: 'array', items: { type: 'string' } }
              },
              required: ['summary', 'keyPoints', 'actionItems', 'nextSteps'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Empty or invalid response from LLM');
      }

      const result = JSON.parse(content);
      return {
        ...result,
        followUpDate: result.followUpDate ? new Date(result.followUpDate) : undefined,
        actionItems: result.actionItems.map((item: any) => ({
          ...item,
          deadline: item.deadline ? new Date(item.deadline) : undefined
        }))
      };
    } catch (error) {
      log.error({ err: error }, "Error analyzing customer communication");
      return {
        summary: '沟通内容分析失败，请人工处理',
        keyPoints: ['需要人工审核'],
        actionItems: [],
        nextSteps: ['请项目经理人工分析沟通内容']
      };
    }
  }

  /**
   * 分析工程输入并生成分发计划
   */
  async analyzeEngineeringInput(
    projectId: number,
    sourceType: string,
    inputContent: string
  ): Promise<EngineeringInputAnalysis> {
    const prompt = `请分析以下工程输入内容，提取需求并生成任务建议：

项目ID: ${projectId}
输入来源: ${sourceType}
输入内容：
${inputContent}

请分析：
1. 提取的需求（类别、描述、重要性、影响的阶段）
2. 建议的任务（任务名称、类型、阶段、负责角色、预计工时、依赖关系）
3. 影响评估（进度影响、成本影响、质量影响、风险等级、缓解建议）
4. 分发计划（接收人角色、原因、紧急程度、通知渠道）

返回JSON格式。`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'engineering_input_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                extractedRequirements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      description: { type: 'string' },
                      importance: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                      affectedPhases: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['category', 'description', 'importance', 'affectedPhases'],
                    additionalProperties: false
                  }
                },
                suggestedTasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskName: { type: 'string' },
                      taskType: { type: 'string' },
                      phaseCode: { type: 'string' },
                      assigneeRole: { type: 'string' },
                      estimatedHours: { type: 'number' },
                      dependencies: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['taskName', 'taskType', 'phaseCode', 'assigneeRole', 'estimatedHours', 'dependencies'],
                    additionalProperties: false
                  }
                },
                impactAssessment: {
                  type: 'object',
                  properties: {
                    scheduleImpact: { type: 'string', enum: ['none', 'minor', 'moderate', 'major'] },
                    costImpact: { type: 'string', enum: ['none', 'minor', 'moderate', 'major'] },
                    qualityImpact: { type: 'string', enum: ['none', 'minor', 'moderate', 'major'] },
                    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                    mitigationSuggestions: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['scheduleImpact', 'costImpact', 'qualityImpact', 'riskLevel', 'mitigationSuggestions'],
                  additionalProperties: false
                },
                distributionPlan: {
                  type: 'object',
                  properties: {
                    recipients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          roleCode: { type: 'string' },
                          reason: { type: 'string' },
                          urgency: { type: 'string', enum: ['immediate', 'same_day', 'next_day'] }
                        },
                        required: ['roleCode', 'reason', 'urgency'],
                        additionalProperties: false
                      }
                    },
                    notificationChannels: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['recipients', 'notificationChannels'],
                  additionalProperties: false
                }
              },
              required: ['extractedRequirements', 'suggestedTasks', 'impactAssessment', 'distributionPlan'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Empty or invalid response from LLM');
      }

      const result = JSON.parse(content);
      return {
        sourceType,
        ...result
      };
    } catch (error) {
      log.error({ err: error }, "Error analyzing engineering input");
      return {
        sourceType,
        extractedRequirements: [],
        suggestedTasks: [],
        impactAssessment: {
          scheduleImpact: 'none',
          costImpact: 'none',
          qualityImpact: 'none',
          riskLevel: 'low',
          mitigationSuggestions: ['需要人工分析']
        },
        distributionPlan: {
          recipients: [{ roleCode: 'PM', reason: '需要人工审核', urgency: 'same_day' }],
          notificationChannels: ['email']
        }
      };
    }
  }

  /**
   * 优化通知发送时间
   */
  optimizeNotificationTiming(
    notifications: NotificationPlan[],
    userPreferences: {
      preferredTime?: string;
      quietHours?: string[];
      timezone?: string;
    }
  ): NotificationPlan[] {
    const workingHours = { start: '08:30', end: '17:30' };
    const now = new Date();

    return notifications.map(notification => {
      let scheduledTime: Date;

      switch (notification.timing) {
        case 'immediate':
          scheduledTime = now;
          break;
        case 'within_30_minutes':
          scheduledTime = new Date(now.getTime() + 30 * 60 * 1000);
          break;
        case 'next_work_hour':
          scheduledTime = this.getNextWorkHour(now, workingHours);
          break;
        case 'daily_digest':
          scheduledTime = this.getNextDigestTime(now, userPreferences.preferredTime || '09:00');
          break;
        default:
          scheduledTime = now;
      }

      // 避开免打扰时段
      if (userPreferences.quietHours) {
        scheduledTime = this.avoidQuietHours(scheduledTime, userPreferences.quietHours);
      }

      return {
        ...notification,
        timing: scheduledTime.toISOString()
      };
    });
  }

  private getNextWorkHour(now: Date, workingHours: { start: string; end: string }): Date {
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const result = new Date(now);
    result.setMinutes(0, 0, 0);
    result.setHours(result.getHours() + 1);

    const hour = result.getHours();
    if (hour < startHour || (hour === startHour && result.getMinutes() < startMin)) {
      result.setHours(startHour, startMin);
    } else if (hour >= endHour) {
      result.setDate(result.getDate() + 1);
      result.setHours(startHour, startMin);
    }

    return result;
  }

  private getNextDigestTime(now: Date, preferredTime: string): Date {
    const [hour, min] = preferredTime.split(':').map(Number);
    const result = new Date(now);
    result.setHours(hour, min, 0, 0);

    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  private avoidQuietHours(time: Date, quietHours: string[]): Date {
    // 简单实现：如果在免打扰时段，推迟到下一个工作时间
    const hour = time.getHours();
    for (const qh of quietHours) {
      const [start, end] = qh.split('-').map(h => parseInt(h));
      if (hour >= start && hour < end) {
        time.setHours(end, 0, 0, 0);
        break;
      }
    }
    return time;
  }

  /**
   * 获取阶段信息
   */
  getPhaseInfo(phaseCode: string) {
    return PROJECT_PHASES[phaseCode as keyof typeof PROJECT_PHASES];
  }

  /**
   * 获取角色信息
   */
  getRoleInfo(roleCode: string) {
    return ENGINEERING_ROLES[roleCode as keyof typeof ENGINEERING_ROLES];
  }

  /**
   * 获取阶段角色矩阵
   */
  getPhaseRoleMatrix(phaseCode: string) {
    return PHASE_ROLE_MATRIX[phaseCode];
  }
}

// 导出单例实例
export const engineeringAssistant = new AIEngineeringAssistant();
