/**
 * AI计划助手服务
 * 工作计划管理，整合多种输入源生成智能计划
 */

import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-planning");

export interface PlanInput {
  companyPlans?: CompanyPlan[];
  customerFeedback?: CustomerFeedback[];
  projectOPLs?: ProjectOPL[];
  meetingMinutes?: MeetingMinute[];
  supervisorAssignments?: Assignment[];
  kpiStatus?: KPIStatus;
  unfinishedPlans?: UnfinishedPlan[];
}

export interface CompanyPlan {
  id: string;
  type: 'annual' | 'quarterly' | 'monthly';
  title: string;
  objectives: string[];
  deadline: string;
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  customerName: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
}

export interface ProjectOPL {
  id: string;
  projectId: string;
  projectName: string;
  stage: string;
  items: string[];
  deadline: string;
}

export interface MeetingMinute {
  id: string;
  meetingType: string;
  date: string;
  actionItems: ActionItem[];
}

export interface ActionItem {
  description: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Assignment {
  id: string;
  from: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string;
}

export interface KPIStatus {
  currentScore: number;
  targetScore: number;
  gaps: string[];
}

export interface UnfinishedPlan {
  id: string;
  title: string;
  originalDeadline: string;
  reason: string;
}

export interface WorkPlan {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  tasks: PlannedTask[];
  trainingPlans?: TrainingPlan[];
  customerVisits?: CustomerVisit[];
  generatedAt: string;
  aiNotes: string[];
}

export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  deadline: string;
  linkedArtifacts?: string[];
}

export interface TrainingPlan {
  id: string;
  topic: string;
  trainer: string;
  participants: string[];
  scheduledDate: string;
  duration: number;
}

export interface CustomerVisit {
  id: string;
  customerId: string;
  customerName: string;
  purpose: string;
  scheduledDate: string;
  contactPerson: string;
}

/**
 * 生成智能工作计划
 */
export async function generateWorkPlan(
  input: PlanInput,
  planType: 'daily' | 'weekly' | 'monthly'
): Promise<WorkPlan> {
  try {
    const prompt = buildPlanningPrompt(input, planType);
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是GRT公司的AI计划助手，负责整合多种输入源生成智能工作计划。
你需要：
1. 分析公司计划、客户反馈、项目OPL、会议纪要等输入
2. 识别优先级和紧急程度
3. 合理安排时间和资源
4. 生成可执行的工作计划
5. 提供计划执行建议`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "work_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    source: { type: "string" },
                    priority: { type: "string" },
                    estimatedHours: { type: "number" },
                    deadline: { type: "string" }
                  },
                  required: ["title", "description", "source", "priority", "estimatedHours", "deadline"],
                  additionalProperties: false
                }
              },
              aiNotes: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["tasks", "aiNotes"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    
    // 计算计划周期
    const now = new Date();
    let period = "";
    if (planType === 'daily') {
      period = now.toISOString().split('T')[0];
    } else if (planType === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      period = `${weekStart.toISOString().split('T')[0]} ~ ${weekEnd.toISOString().split('T')[0]}`;
    } else {
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    return {
      id: `PLAN-${planType.toUpperCase()}-${Date.now()}`,
      type: planType,
      period,
      tasks: result.tasks.map((task: any, index: number) => ({
        id: `TASK-${Date.now()}-${index}`,
        ...task
      })),
      generatedAt: now.toISOString(),
      aiNotes: result.aiNotes
    };
  } catch (error) {
    log.error({ err: error }, "AI planning error");
    return getDefaultPlan(planType);
  }
}

/**
 * 构建计划提示词
 */
function buildPlanningPrompt(input: PlanInput, planType: string): string {
  let prompt = `请生成${planType === 'daily' ? '今日' : planType === 'weekly' ? '本周' : '本月'}工作计划。\n\n`;

  if (input.companyPlans && input.companyPlans.length > 0) {
    prompt += "## 公司计划\n";
    input.companyPlans.forEach(plan => {
      prompt += `- ${plan.title}（${plan.type}）：${plan.objectives.join(", ")}\n`;
    });
    prompt += "\n";
  }

  if (input.customerFeedback && input.customerFeedback.length > 0) {
    prompt += "## 客户反馈\n";
    input.customerFeedback.forEach(fb => {
      prompt += `- ${fb.customerName}（${fb.priority}优先级）：${fb.content}\n`;
    });
    prompt += "\n";
  }

  if (input.projectOPLs && input.projectOPLs.length > 0) {
    prompt += "## 项目OPL\n";
    input.projectOPLs.forEach(opl => {
      prompt += `- ${opl.projectName}（${opl.stage}）：${opl.items.join(", ")}\n`;
    });
    prompt += "\n";
  }

  if (input.meetingMinutes && input.meetingMinutes.length > 0) {
    prompt += "## 会议待办\n";
    input.meetingMinutes.forEach(mm => {
      mm.actionItems.filter(ai => ai.status !== 'completed').forEach(ai => {
        prompt += `- ${ai.description}（负责人：${ai.assignee}，截止：${ai.deadline}）\n`;
      });
    });
    prompt += "\n";
  }

  if (input.supervisorAssignments && input.supervisorAssignments.length > 0) {
    prompt += "## 主管分配\n";
    input.supervisorAssignments.forEach(assign => {
      prompt += `- ${assign.description}（${assign.priority}优先级，截止：${assign.deadline}）\n`;
    });
    prompt += "\n";
  }

  if (input.kpiStatus) {
    prompt += `## KPI状态\n当前得分：${input.kpiStatus.currentScore}，目标：${input.kpiStatus.targetScore}\n`;
    if (input.kpiStatus.gaps.length > 0) {
      prompt += `差距项：${input.kpiStatus.gaps.join(", ")}\n`;
    }
    prompt += "\n";
  }

  if (input.unfinishedPlans && input.unfinishedPlans.length > 0) {
    prompt += "## 未完成计划\n";
    input.unfinishedPlans.forEach(plan => {
      prompt += `- ${plan.title}（原截止：${plan.originalDeadline}，原因：${plan.reason}）\n`;
    });
    prompt += "\n";
  }

  prompt += "请根据以上输入，生成合理的工作计划，包括任务列表和执行建议。";

  return prompt;
}

/**
 * 获取默认计划
 */
function getDefaultPlan(planType: 'daily' | 'weekly' | 'monthly'): WorkPlan {
  const now = new Date();
  return {
    id: `PLAN-${planType.toUpperCase()}-${Date.now()}`,
    type: planType,
    period: now.toISOString().split('T')[0],
    tasks: [
      {
        id: `TASK-${Date.now()}-0`,
        title: "查看并处理邮件",
        description: "处理待办邮件，回复客户询问",
        source: "日常工作",
        priority: "medium",
        estimatedHours: 1,
        deadline: now.toISOString().split('T')[0]
      },
      {
        id: `TASK-${Date.now()}-1`,
        title: "项目进度跟进",
        description: "跟进当前项目进度，更新状态",
        source: "项目管理",
        priority: "high",
        estimatedHours: 2,
        deadline: now.toISOString().split('T')[0]
      }
    ],
    generatedAt: now.toISOString(),
    aiNotes: ["建议优先处理紧急客户需求", "注意合理安排休息时间"]
  };
}

/**
 * 更新计划执行状态
 */
export function updatePlanStatus(
  planId: string,
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed'
): boolean {
  // 实际实现中应更新数据库
  log.info({ taskId, planId, status }, "Updated task status in plan");
  return true;
}

/**
 * 获取计划执行报告
 */
export async function getPlanExecutionReport(planId: string): Promise<string> {
  // 生成执行报告
  return `计划 ${planId} 执行报告：执行中...`;
}
