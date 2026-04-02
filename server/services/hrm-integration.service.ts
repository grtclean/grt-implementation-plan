/**
 * HRM集成服务 — 连接能力评估→培训→薪酬的断裂链路
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('hrm-integration');

/**
 * When training is completed, update competency score
 */
export async function onTrainingCompleted(params: {
  employeeId: number;
  trainingId: string;
  competencyDimension: string; // T/S/D/C/K/L
  scoreImprovement: number;
}): Promise<{ updated: boolean; message: string }> {
  log.info(params, 'Training completed → updating competency');

  try {
    const { requireDb } = await import('../db');
    const db = await requireDb();
    const { sql } = await import('drizzle-orm');

    // Update competency assessment score
    await db.execute(sql`
      UPDATE employee_competence_assessments
      SET score = LEAST(100, COALESCE(score, 0) + ${params.scoreImprovement}),
          updated_at = NOW()
      WHERE employee_id = ${params.employeeId}
        AND dimension = ${params.competencyDimension}
    `);

    // Log to project activity timeline if available
    await db.execute(sql`
      INSERT INTO project_activity_timeline (project_id, activity_type, activity_title, source_module, performed_by, performed_at)
      VALUES (0, 'training_completed', ${`员工${params.employeeId}完成培训: ${params.trainingId}`}, 'hrm', ${params.employeeId}, NOW())
    `).catch(() => {});

    return { updated: true, message: `能力维度 ${params.competencyDimension} 评分已更新 (+${params.scoreImprovement})` };
  } catch (err: any) {
    log.warn({ err }, 'competency update failed');
    return { updated: false, message: err.message };
  }
}

/**
 * When competency assessment completes, identify training gaps
 */
export function identifyTrainingGaps(assessments: Array<{
  dimension: string;
  score: number;
  requiredScore: number;
}>): Array<{ dimension: string; gap: number; recommendation: string }> {
  const gaps = [];
  const recommendations: Record<string, string> = {
    T: '技术技能培训(SolidWorks/EPLAN/PLC)',
    S: '软技能培训(沟通/协作/汇报)',
    D: '领域知识培训(清洗工艺/行业标准)',
    C: '合规培训(ISO/IATF/安全)',
    K: '知识管理培训(SOP编写/经验沉淀)',
    L: '领导力培训(项目管理/团队带教)',
  };

  for (const a of assessments) {
    if (a.score < a.requiredScore) {
      gaps.push({
        dimension: a.dimension,
        gap: a.requiredScore - a.score,
        recommendation: recommendations[a.dimension] || '通用提升培训',
      });
    }
  }

  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Record project activity for cross-module timeline
 */
export async function recordProjectActivity(params: {
  projectId: number;
  projectCode?: string;
  activityType: string;
  activityTitle: string;
  sourceModule: string;
  sourceDocType?: string;
  sourceDocId?: number;
  sourceDocCode?: string;
  projectPhase?: string;
  amount?: number;
  performedBy: number;
  performedByName?: string;
}): Promise<void> {
  try {
    const { requireDb } = await import('../db');
    const db = await requireDb();
    const { sql } = await import('drizzle-orm');

    await db.execute(sql`
      INSERT INTO project_activity_timeline
      (project_id, project_code, activity_type, activity_title, source_module,
       source_doc_type, source_doc_id, source_doc_code, project_phase, amount,
       performed_by, performed_by_name, performed_at)
      VALUES (${params.projectId}, ${params.projectCode || null}, ${params.activityType},
              ${params.activityTitle}, ${params.sourceModule},
              ${params.sourceDocType || null}, ${params.sourceDocId || null}, ${params.sourceDocCode || null},
              ${params.projectPhase || null}, ${params.amount || null},
              ${params.performedBy}, ${params.performedByName || null}, NOW())
    `);
  } catch (err) {
    log.warn({ err, ...params }, 'Failed to record project activity');
  }
}
