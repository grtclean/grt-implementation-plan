/**
 * AI KPI助手服务
 * 绩效评估、提醒和沟通建议
 */

import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-kpi");

export interface KPIAssessment {
  employeeId: string;
  employeeName: string;
  period: 'daily' | 'weekly' | 'monthly' | 'annual';
  date: string;
  scores: KPIScores;
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  feedback: string;
  suggestions: string[];
  communicationSuggestion?: CommunicationSuggestion;
}

export interface KPIScores {
  taskCompletion: number;      // 任务完成率
  quality: number;             // 工作质量
  efficiency: number;          // 工作效率
  collaboration: number;       // 团队协作
  innovation: number;          // 创新贡献
  customerSatisfaction: number; // 客户满意度
}

export interface CommunicationSuggestion {
  timing: string;
  content: string;
  recipients: string[];
  requiresApproval: boolean;
}

export interface KPIReminder {
  id: string;
  type: 'task' | 'deadline' | 'meeting' | 'review';
  title: string;
  description: string;
  scheduledTime: string;
  priority: 'high' | 'medium' | 'low';
  requiresApproval: boolean;
}

export interface EmployeeWorkData {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  tasksCompleted: number;
  tasksPending: number;
  emailsSent: number;
  emailsReceived: number;
  meetingsAttended: number;
  documentsCreated: number;
  customerInteractions: number;
  projectContributions: ProjectContribution[];
}

export interface ProjectContribution {
  projectId: string;
  projectName: string;
  hoursWorked: number;
  deliverables: string[];
  feedback: string;
}

/**
 * 评估员工KPI
 */
export async function assessKPI(
  workData: EmployeeWorkData,
  period: 'daily' | 'weekly' | 'monthly' | 'annual'
): Promise<KPIAssessment> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是GRT公司的AI KPI助手，负责对员工进行科学、理性、及时的绩效评估。
评估维度：
1. 任务完成率 (0-100)
2. 工作质量 (0-100)
3. 工作效率 (0-100)
4. 团队协作 (0-100)
5. 创新贡献 (0-100)
6. 客户满意度 (0-100)

评估原则：
- 客观公正，基于数据
- 关注成长，提供建设性建议
- 识别优势和改进空间`
        },
        {
          role: "user",
          content: `请评估以下员工的${period === 'daily' ? '今日' : period === 'weekly' ? '本周' : period === 'monthly' ? '本月' : '年度'}绩效：

员工信息：
- 姓名：${workData.employeeName}
- 角色：${workData.role}
- 部门：${workData.department}

工作数据：
- 完成任务：${workData.tasksCompleted}
- 待办任务：${workData.tasksPending}
- 发送邮件：${workData.emailsSent}
- 接收邮件：${workData.emailsReceived}
- 参加会议：${workData.meetingsAttended}
- 创建文档：${workData.documentsCreated}
- 客户互动：${workData.customerInteractions}

项目贡献：
${workData.projectContributions.map(pc => 
  `- ${pc.projectName}：${pc.hoursWorked}小时，交付物：${pc.deliverables.join(", ")}`
).join("\n")}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "kpi_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scores: {
                type: "object",
                properties: {
                  taskCompletion: { type: "number" },
                  quality: { type: "number" },
                  efficiency: { type: "number" },
                  collaboration: { type: "number" },
                  innovation: { type: "number" },
                  customerSatisfaction: { type: "number" }
                },
                required: ["taskCompletion", "quality", "efficiency", "collaboration", "innovation", "customerSatisfaction"],
                additionalProperties: false
              },
              overallScore: { type: "number" },
              trend: { type: "string" },
              feedback: { type: "string" },
              suggestions: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["scores", "overallScore", "trend", "feedback", "suggestions"],
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

    return {
      employeeId: workData.employeeId,
      employeeName: workData.employeeName,
      period,
      date: new Date().toISOString().split('T')[0],
      scores: result.scores,
      overallScore: result.overallScore,
      trend: result.trend as 'improving' | 'stable' | 'declining',
      feedback: result.feedback,
      suggestions: result.suggestions
    };
  } catch (error) {
    log.error({ err: error }, "AI KPI assessment error");
    return getDefaultAssessment(workData, period);
  }
}

/**
 * 生成沟通建议
 */
export async function generateCommunicationSuggestion(
  assessment: KPIAssessment
): Promise<CommunicationSuggestion> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是GRT公司的AI KPI助手，负责建议适当的沟通时间和内容。
沟通原则：
- 及时反馈，正向激励
- 问题导向，建设性建议
- 尊重隐私，保护员工`
        },
        {
          role: "user",
          content: `基于以下绩效评估，请建议沟通内容：
员工：${assessment.employeeName}
评估周期：${assessment.period}
总分：${assessment.overallScore}
趋势：${assessment.trend}
反馈：${assessment.feedback}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "communication_suggestion",
          strict: true,
          schema: {
            type: "object",
            properties: {
              timing: { type: "string", description: "建议沟通时间" },
              content: { type: "string", description: "沟通内容要点" },
              recipients: {
                type: "array",
                items: { type: "string" },
                description: "沟通对象"
              },
              requiresApproval: { type: "boolean", description: "是否需要主管审批" }
            },
            required: ["timing", "content", "recipients", "requiresApproval"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    log.error({ err: error }, "AI communication suggestion error");
    return {
      timing: "下午3点",
      content: "绩效反馈沟通",
      recipients: [assessment.employeeName],
      requiresApproval: false
    };
  }
}

/**
 * 生成智能提醒
 */
export function generateReminders(
  workData: EmployeeWorkData,
  assessments: KPIAssessment[]
): KPIReminder[] {
  const reminders: KPIReminder[] = [];
  const now = new Date();

  // 任务提醒
  if (workData.tasksPending > 5) {
    reminders.push({
      id: `REM-${Date.now()}-1`,
      type: 'task',
      title: "待办任务较多",
      description: `您有${workData.tasksPending}个待办任务，建议优先处理紧急任务`,
      scheduledTime: now.toISOString(),
      priority: 'high',
      requiresApproval: false
    });
  }

  // 绩效趋势提醒
  const latestAssessment = assessments[0];
  if (latestAssessment && latestAssessment.trend === 'declining') {
    reminders.push({
      id: `REM-${Date.now()}-2`,
      type: 'review',
      title: "绩效趋势提醒",
      description: "近期绩效有下降趋势，建议关注工作效率和任务完成情况",
      scheduledTime: now.toISOString(),
      priority: 'medium',
      requiresApproval: false
    });
  }

  // 会议提醒（示例）
  reminders.push({
    id: `REM-${Date.now()}-3`,
    type: 'meeting',
    title: "周例会提醒",
    description: "明天上午9:00有部门周例会",
    scheduledTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    requiresApproval: false
  });

  return reminders;
}

/**
 * 获取默认评估
 */
function getDefaultAssessment(
  workData: EmployeeWorkData,
  period: 'daily' | 'weekly' | 'monthly' | 'annual'
): KPIAssessment {
  const completionRate = workData.tasksCompleted / (workData.tasksCompleted + workData.tasksPending) * 100;
  
  return {
    employeeId: workData.employeeId,
    employeeName: workData.employeeName,
    period,
    date: new Date().toISOString().split('T')[0],
    scores: {
      taskCompletion: Math.round(completionRate),
      quality: 85,
      efficiency: 80,
      collaboration: 82,
      innovation: 75,
      customerSatisfaction: 88
    },
    overallScore: Math.round((completionRate + 85 + 80 + 82 + 75 + 88) / 6),
    trend: 'stable',
    feedback: "工作表现稳定，建议继续保持。",
    suggestions: [
      "提高任务完成效率",
      "加强团队协作",
      "关注创新贡献"
    ]
  };
}

/**
 * 获取实时得分
 */
export function getRealTimeScore(employeeId: string): {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
  current: number;
} {
  // 实际实现中应从数据库获取
  return {
    daily: 87,
    weekly: 85,
    monthly: 86,
    annual: 84,
    current: 88
  };
}
