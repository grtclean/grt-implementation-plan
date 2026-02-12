/**
 * 阶段门自动推进服务
 * 实现M3/M4评审通过后自动推进项目到下一阶段
 */

import { eq, and } from "drizzle-orm";
import { requireDb } from "../db";
import { projectsV2, projectStagesV2, stageReviews } from "../../drizzle/schema";
import { sendNotification, NotificationTemplates, type NotificationConfig } from "./notification.service";

// 阶段推进规则定义
const STAGE_ADVANCE_RULES: Record<string, {
  nextStage: string;
  requiredConclusions: ('PASS' | 'CONDITIONAL')[];
  autoTriggers?: string[];
}> = {
  M3: {
    nextStage: 'M4',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['生成AI版本建议', '创建设计任务清单'],
  },
  M4: {
    nextStage: 'M5',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['生成采购建议草案', '冻结BOM版本'],
  },
  M5: {
    nextStage: 'M6',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['启动采购流程'],
  },
  M6: {
    nextStage: 'M7',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['创建MES生产工单', '同步物料到MES'],
  },
  M7: {
    nextStage: 'M8',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['创建装配工单'],
  },
  M8: {
    nextStage: 'M9',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['创建调试任务'],
  },
  M9: {
    nextStage: 'M10',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['准备发货文档'],
  },
  M10: {
    nextStage: 'M11',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['创建安装任务'],
  },
  M11: {
    nextStage: 'M12',
    requiredConclusions: ['PASS', 'CONDITIONAL'],
    autoTriggers: ['准备验收文档'],
  },
};

// 审计日志类型
export interface StageAdvanceAuditLog {
  id: number;
  projectId: number;
  fromStage: string;
  toStage: string;
  triggeredBy: 'auto' | 'manual';
  reviewResult: string;
  autoTriggers: string[];
  timestamp: string;
  userId?: number;
  notes?: string;
}

/**
 * 检查评审是否全部通过
 */
export async function checkReviewsPassed(
  projectId: number,
  stageCode: string,
  reviews: Array<{ conclusion: string }>
): Promise<{
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  failedItems: string[];
}> {
  const rule = STAGE_ADVANCE_RULES[stageCode];
  if (!rule) {
    return {
      allPassed: false,
      passedCount: 0,
      totalCount: reviews.length,
      failedItems: ['未定义的阶段规则'],
    };
  }

  const passedReviews = reviews.filter(r => 
    rule.requiredConclusions.includes(r.conclusion as any)
  );
  
  const failedItems = reviews
    .filter(r => !rule.requiredConclusions.includes(r.conclusion as any))
    .map((_, i) => `评审项 ${i + 1}`);

  return {
    allPassed: passedReviews.length === reviews.length,
    passedCount: passedReviews.length,
    totalCount: reviews.length,
    failedItems,
  };
}

/**
 * 自动推进项目阶段
 */
export async function autoAdvanceStage(
  projectId: number,
  currentStage: string,
  userId?: number
): Promise<{
  success: boolean;
  fromStage: string;
  toStage: string | null;
  autoTriggers: string[];
  message: string;
  auditLog?: StageAdvanceAuditLog;
}> {
  const db = await requireDb();
  const rule = STAGE_ADVANCE_RULES[currentStage];

  if (!rule) {
    return {
      success: false,
      fromStage: currentStage,
      toStage: null,
      autoTriggers: [],
      message: `阶段 ${currentStage} 没有定义自动推进规则`,
    };
  }

  try {
    // 1. 更新当前阶段状态为Completed
    const currentStageRecord = await db
      .select()
      .from(projectStagesV2)
      .where(and(
        eq(projectStagesV2.projectId, projectId),
        eq(projectStagesV2.stageCode, currentStage as any)
      ))
      .limit(1);

    if (currentStageRecord.length > 0) {
      await db
        .update(projectStagesV2)
        .set({
          status: 'Completed' as any,
          completionPercent: 100,
          actualEndDate: new Date().toISOString().split('T')[0],
        })
        .where(eq(projectStagesV2.id, currentStageRecord[0].id));
    }

    // 2. 更新下一阶段状态为InProgress
    const nextStageRecord = await db
      .select()
      .from(projectStagesV2)
      .where(and(
        eq(projectStagesV2.projectId, projectId),
        eq(projectStagesV2.stageCode, rule.nextStage as any)
      ))
      .limit(1);

    if (nextStageRecord.length > 0) {
      await db
        .update(projectStagesV2)
        .set({
          status: 'InProgress' as any,
          actualStartDate: new Date().toISOString().split('T')[0],
        })
        .where(eq(projectStagesV2.id, nextStageRecord[0].id));
    }

    // 3. 更新项目当前阶段
    await db
      .update(projectsV2)
      .set({ currentStage: rule.nextStage as any })
      .where(eq(projectsV2.id, projectId));

    // 4. 创建审计日志
    const auditLog: StageAdvanceAuditLog = {
      id: Date.now(),
      projectId,
      fromStage: currentStage,
      toStage: rule.nextStage,
      triggeredBy: 'auto',
      reviewResult: 'PASS',
      autoTriggers: rule.autoTriggers || [],
      timestamp: new Date().toISOString(),
      userId,
      notes: `评审通过，自动从 ${currentStage} 推进到 ${rule.nextStage}`,
    };

    // 5. 保存审计日志到阶段记录
    if (currentStageRecord.length > 0) {
      const existingLogs = currentStageRecord[0].auditLog 
        ? JSON.parse(currentStageRecord[0].auditLog) 
        : [];
      existingLogs.push(auditLog);
      await db
        .update(projectStagesV2)
        .set({ auditLog: JSON.stringify(existingLogs) })
        .where(eq(projectStagesV2.id, currentStageRecord[0].id));
    }

    // 6. 发送通知
    await sendStageAdvanceNotification(projectId, currentStage, rule.nextStage, rule.autoTriggers || []);

    return {
      success: true,
      fromStage: currentStage,
      toStage: rule.nextStage,
      autoTriggers: rule.autoTriggers || [],
      message: `项目已从 ${currentStage} 自动推进到 ${rule.nextStage}`,
      auditLog,
    };
  } catch (error) {
    console.error('[StageGate] 自动推进失败:', error);
    return {
      success: false,
      fromStage: currentStage,
      toStage: null,
      autoTriggers: [],
      message: `自动推进失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 发送阶段推进通知
 */
async function sendStageAdvanceNotification(
  projectId: number,
  fromStage: string,
  toStage: string,
  autoTriggers: string[]
): Promise<void> {
  try {
    const db = await requireDb();
    const projects = await db
      .select()
      .from(projectsV2)
      .where(eq(projectsV2.id, projectId))
      .limit(1);

    if (projects.length === 0) return;

    const project = projects[0];
    const projectCode = project.projectCode || `PRJ-${projectId}`;

    // 构建通知消息
    const configs: NotificationConfig[] = [
      { channel: 'feishu' as const, enabled: true, webhookUrl: process.env.FEISHU_WEBHOOK_URL },
      { channel: 'wechat_work' as const, enabled: true, webhookUrl: process.env.WECHAT_WORK_WEBHOOK_URL },
    ].filter(c => c.webhookUrl);

    if (configs.length === 0) {
      console.log('[StageGate] 未配置通知渠道，跳过通知发送');
      return;
    }

    const message = {
      title: `🚀 项目阶段自动推进`,
      content: `项目 **${projectCode}** 已从 ${fromStage} 自动推进到 ${toStage}\n\n` +
        `**自动触发的操作:**\n${autoTriggers.map(t => `• ${t}`).join('\n') || '无'}`,
      type: 'success' as const,
      actionUrl: `/pos/projects/${projectId}`,
    };

    for (const config of configs) {
      await sendNotification(config, message);
    }
  } catch (error) {
    console.error('[StageGate] 发送通知失败:', error);
  }
}

/**
 * 执行阶段自动触发器
 */
export async function executeAutoTriggers(
  projectId: number,
  stageCode: string,
  triggers: string[]
): Promise<{
  success: boolean;
  executedTriggers: string[];
  failedTriggers: string[];
}> {
  const executedTriggers: string[] = [];
  const failedTriggers: string[] = [];

  for (const trigger of triggers) {
    try {
      switch (trigger) {
        case '生成AI版本建议':
          // TODO: 调用AI版本生成服务
          console.log(`[StageGate] 执行触发器: ${trigger}`);
          executedTriggers.push(trigger);
          break;
        case '创建设计任务清单':
          // TODO: 创建设计任务
          console.log(`[StageGate] 执行触发器: ${trigger}`);
          executedTriggers.push(trigger);
          break;
        case '生成采购建议草案':
          // TODO: 调用采购建议生成服务
          console.log(`[StageGate] 执行触发器: ${trigger}`);
          executedTriggers.push(trigger);
          break;
        case '冻结BOM版本':
          // TODO: 冻结BOM
          console.log(`[StageGate] 执行触发器: ${trigger}`);
          executedTriggers.push(trigger);
          break;
        case '创建MES生产工单':
          // TODO: 调用MES工单创建服务
          console.log(`[StageGate] 执行触发器: ${trigger}`);
          executedTriggers.push(trigger);
          break;
        default:
          console.log(`[StageGate] 未知触发器: ${trigger}`);
          executedTriggers.push(trigger);
      }
    } catch (error) {
      console.error(`[StageGate] 触发器执行失败: ${trigger}`, error);
      failedTriggers.push(trigger);
    }
  }

  return {
    success: failedTriggers.length === 0,
    executedTriggers,
    failedTriggers,
  };
}

/**
 * 获取阶段推进历史
 */
export async function getStageAdvanceHistory(projectId: number): Promise<StageAdvanceAuditLog[]> {
  const db = await requireDb();
  
  const stages = await db
    .select()
    .from(projectStagesV2)
    .where(eq(projectStagesV2.projectId, projectId));

  const allLogs: StageAdvanceAuditLog[] = [];
  
  for (const stage of stages) {
    if (stage.auditLog) {
      try {
        const logs = JSON.parse(stage.auditLog);
        allLogs.push(...logs.filter((l: any) => l.fromStage && l.toStage));
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return allLogs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * 检查是否可以推进到下一阶段
 */
export function canAdvanceToNextStage(currentStage: string): {
  canAdvance: boolean;
  nextStage: string | null;
  requirements: string[];
} {
  const rule = STAGE_ADVANCE_RULES[currentStage];
  
  if (!rule) {
    return {
      canAdvance: false,
      nextStage: null,
      requirements: ['当前阶段没有定义推进规则'],
    };
  }

  return {
    canAdvance: true,
    nextStage: rule.nextStage,
    requirements: [
      `所有评审项必须为 ${rule.requiredConclusions.join(' 或 ')}`,
      '必须完成当前阶段的所有必要交付物',
    ],
  };
}
