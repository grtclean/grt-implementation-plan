/**
 * 生产工序步骤管理服务 (Production Process Steps Service)
 * 
 * 核心功能：
 * 1. 工序步骤CRUD（工程师手动输入BOM步骤 - 左列）
 * 2. AI智慧预设步骤（基于历史项目参照 - 右列）
 * 3. 产线员工工时打卡（开始/结束按钮，自动计算工时）
 * 4. 附件/照片上传管理
 * 5. AI历史项目参照与BOM匹配
 * 6. T1-T15工序与M0-M12项目阶段映射
 */

import { requireDb } from "../db";
import { sql, eq, and, desc, asc, like, or, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createTimeRecord } from "../production-execution/production-execution.db";

// ============================================================
// 类型定义
// ============================================================

export interface BomStep {
  id?: number;
  processInstanceId: number;
  projectId: number;
  processCode: string; // T1-T15
  stepNumber: number;
  stepName: string;
  processRequirements?: string; // 工艺要求
  processDescription?: string; // 工艺步骤描述
  bomItemReference?: string; // BOM零件参照
  theoreticalHours?: number; // 理论工时
  plannedWorkerName?: string; // 计划产线员工
  plannedWorkerId?: number;
  status?: string; // pending/in_progress/completed
  createdBy?: number;
}

export interface AiPresetStep {
  id?: number;
  processInstanceId: number;
  projectId: number;
  processCode: string;
  stepNumber: number;
  stepName: string;
  processRequirements?: string;
  processDescription?: string;
  bomItemReference?: string;
  theoreticalHours?: number;
  sourceProjectId?: number;
  sourceProjectName?: string;
  matchScore?: number;
  confirmStatus?: string; // pending/confirmed/modified/rejected
  confirmedBy?: number;
}

export interface TimeLog {
  id?: number;
  bomStepId: number;
  workerId: number;
  workerName: string;
  startTime?: number; // UTC timestamp ms
  endTime?: number;
  actualHours?: number;
  notes?: string;
}

export interface StepAttachment {
  id?: number;
  stepId: number;
  stepType: string; // bom/ai_preset
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: number;
}

export interface HistoricalReference {
  id?: number;
  sourceProjectId: number;
  targetProjectId: number;
  processCode?: string;
  referenceScope: string; // single_step/all_steps/range
  rangeStart?: string;
  rangeEnd?: string;
  matchAlgorithm?: string;
  matchScore?: number;
  status?: string;
}

// T1-T15 与 M0-M12 映射关系
export const T_TO_M_MAPPING: Record<string, string[]> = {
  T1: ["M3", "M4"],           // 机加工 → 设计确认/采购阶段
  T2: ["M3", "M4"],           // 冷作 → 设计确认/采购阶段
  T3: ["M5", "M6"],           // 机械部件装配 → 生产准备/生产阶段
  T4: ["M5", "M6"],           // 机械装配 → 生产准备/生产阶段
  T5: ["M6", "M7"],           // 机械总装 → 生产/调试阶段
  T6: ["M6", "M7"],           // 电气装配 → 生产/调试阶段
  T7: ["M7", "M8"],           // 设备调试 → 调试/FAT阶段
  T8: ["M7", "M8"],           // 跑和 → 调试/FAT阶段
  T9: ["M8", "M9"],           // 包装 → FAT/发货阶段
  T10: ["M9"],                // 发货 → 发货阶段
  T11: ["M9", "M10"],         // 卸车 → 发货/安装阶段
  T12: ["M10"],               // 就位 → 安装阶段
  T13: ["M10", "M11"],        // 水电气连接 → 安装/SAT阶段
  T14: ["M11"],               // 现场调试 → SAT阶段
  T15: ["M12"],               // 终验收 → 终验收阶段
};

export const M_TO_T_MAPPING: Record<string, string[]> = {};
for (const [t, ms] of Object.entries(T_TO_M_MAPPING)) {
  for (const m of ms) {
    if (!M_TO_T_MAPPING[m]) M_TO_T_MAPPING[m] = [];
    M_TO_T_MAPPING[m].push(t);
  }
}

// ============================================================
// 1. BOM步骤管理（工程师手动输入 - 左列）
// ============================================================

export async function createBomStep(data: BomStep) {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO process_bom_steps 
    (process_instance_id, project_id, process_code, step_number, step_name,
     process_requirements, process_description, bom_item_reference,
     theoretical_hours, planned_worker_name, planned_worker_id, status, created_by)
    VALUES (${data.processInstanceId}, ${data.projectId}, ${data.processCode},
            ${data.stepNumber}, ${data.stepName}, ${data.processRequirements || null},
            ${data.processDescription || null}, ${data.bomItemReference || null},
            ${data.theoreticalHours || null}, ${data.plannedWorkerName || null},
            ${data.plannedWorkerId || null}, ${data.status || 'pending'},
            ${data.createdBy || null})
  `);
  return { id: (result as any)[0]?.insertId };
}

export async function updateBomStep(id: number, data: Partial<BomStep>) {
  const db = await requireDb();
  const setClauses: string[] = [];

  if (data.stepNumber !== undefined) { setClauses.push(`step_number = ${Number(data.stepNumber)}`); }
  if (data.stepName !== undefined) { setClauses.push(`step_name = '${String(data.stepName).replace(/'/g, "''")}'`); }
  if (data.processRequirements !== undefined) { setClauses.push(`process_requirements = '${String(data.processRequirements).replace(/'/g, "''")}'`); }
  if (data.processDescription !== undefined) { setClauses.push(`process_description = '${String(data.processDescription).replace(/'/g, "''")}'`); }
  if (data.bomItemReference !== undefined) { setClauses.push(`bom_item_reference = '${String(data.bomItemReference).replace(/'/g, "''")}'`); }
  if (data.theoreticalHours !== undefined) { setClauses.push(`theoretical_hours = ${Number(data.theoreticalHours)}`); }
  if (data.plannedWorkerName !== undefined) { setClauses.push(`planned_worker_name = '${String(data.plannedWorkerName).replace(/'/g, "''")}'`); }
  if (data.plannedWorkerId !== undefined) { setClauses.push(`planned_worker_id = ${Number(data.plannedWorkerId)}`); }
  if (data.status !== undefined) { setClauses.push(`status = '${String(data.status).replace(/'/g, "''")}'`); }

  if (setClauses.length === 0) return null;

  setClauses.push("updated_at = NOW()");

  await db.execute(sql.raw(`UPDATE process_bom_steps SET ${setClauses.join(", ")} WHERE id = ${Number(id)}`));
  return { success: true };
}

export async function deleteBomStep(id: number) {
  const db = await requireDb();
  await db.execute(sql`DELETE FROM process_bom_steps WHERE id = ${id}`);
  return { success: true };
}

export async function getBomSteps(processInstanceId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM process_bom_steps 
    WHERE process_instance_id = ${processInstanceId}
    ORDER BY step_number ASC
  `);
  return (result as any)[0] || [];
}

export async function getBomStepsByProject(projectId: number, processCode?: string) {
  const db = await requireDb();
  if (processCode) {
    const result = await db.execute(sql`
      SELECT * FROM process_bom_steps 
      WHERE project_id = ${projectId} AND process_code = ${processCode}
      ORDER BY step_number ASC
    `);
    return (result as any)[0] || [];
  }
  const result = await db.execute(sql`
    SELECT * FROM process_bom_steps 
    WHERE project_id = ${projectId}
    ORDER BY process_code ASC, step_number ASC
  `);
  return (result as any)[0] || [];
}

export async function getBomStepById(id: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM process_bom_steps WHERE id = ${id}
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function reorderBomSteps(processInstanceId: number, stepIds: number[]) {
  const db = await requireDb();
  for (let i = 0; i < stepIds.length; i++) {
    await db.execute(sql`
      UPDATE process_bom_steps SET step_number = ${i + 1}, updated_at = NOW()
      WHERE id = ${stepIds[i]} AND process_instance_id = ${processInstanceId}
    `);
  }
  return { success: true };
}

// ============================================================
// 2. AI预设步骤管理（AI智慧预设 - 右列）
// ============================================================

export async function createAiPresetStep(data: AiPresetStep) {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO process_ai_preset_steps
    (process_instance_id, project_id, process_code, step_number, step_name,
     process_requirements, process_description, bom_item_reference,
     theoretical_hours, source_project_id, source_project_name,
     match_score, confirm_status, confirmed_by)
    VALUES (${data.processInstanceId}, ${data.projectId}, ${data.processCode},
            ${data.stepNumber}, ${data.stepName}, ${data.processRequirements || null},
            ${data.processDescription || null}, ${data.bomItemReference || null},
            ${data.theoreticalHours || null}, ${data.sourceProjectId || null},
            ${data.sourceProjectName || null}, ${data.matchScore || null},
            ${data.confirmStatus || 'pending'}, ${data.confirmedBy || null})
  `);
  return { id: (result as any)[0]?.insertId };
}

export async function getAiPresetSteps(processInstanceId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM process_ai_preset_steps 
    WHERE process_instance_id = ${processInstanceId}
    ORDER BY step_number ASC
  `);
  return (result as any)[0] || [];
}

export async function getAiPresetStepsByProject(projectId: number, processCode?: string) {
  const db = await requireDb();
  if (processCode) {
    const result = await db.execute(sql`
      SELECT * FROM process_ai_preset_steps 
      WHERE project_id = ${projectId} AND process_code = ${processCode}
      ORDER BY step_number ASC
    `);
    return (result as any)[0] || [];
  }
  const result = await db.execute(sql`
    SELECT * FROM process_ai_preset_steps 
    WHERE project_id = ${projectId}
    ORDER BY process_code ASC, step_number ASC
  `);
  return (result as any)[0] || [];
}

export async function confirmAiPresetStep(id: number, userId: number, status: string, modifications?: Partial<AiPresetStep>) {
  const db = await requireDb();
  if (modifications && Object.keys(modifications).length > 0) {
    // 如果有修改，先更新内容
    const setClauses: string[] = [];
    if (modifications.stepName) { setClauses.push(`step_name = '${String(modifications.stepName).replace(/'/g, "''")}'`); }
    if (modifications.processRequirements) { setClauses.push(`process_requirements = '${String(modifications.processRequirements).replace(/'/g, "''")}'`); }
    if (modifications.processDescription) { setClauses.push(`process_description = '${String(modifications.processDescription).replace(/'/g, "''")}'`); }
    if (modifications.theoreticalHours) { setClauses.push(`theoretical_hours = ${Number(modifications.theoreticalHours)}`); }

    setClauses.push(`confirm_status = '${String(status).replace(/'/g, "''")}'`);
    setClauses.push(`confirmed_by = ${Number(userId)}`);
    setClauses.push("confirmed_at = NOW()");
    setClauses.push("updated_at = NOW()");

    await db.execute(sql.raw(`UPDATE process_ai_preset_steps SET ${setClauses.join(", ")} WHERE id = ${Number(id)}`));
  } else {
    await db.execute(sql`
      UPDATE process_ai_preset_steps 
      SET confirm_status = ${status}, confirmed_by = ${userId}, confirmed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `);
  }
  return { success: true };
}

export async function batchConfirmAiPresetSteps(ids: number[], userId: number, status: string) {
  const db = await requireDb();
  for (const id of ids) {
    await db.execute(sql`
      UPDATE process_ai_preset_steps 
      SET confirm_status = ${status}, confirmed_by = ${userId}, confirmed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `);
  }
  return { success: true, count: ids.length };
}

// 将AI预设步骤复制为BOM步骤（工程师确认采纳）
export async function adoptAiPresetAsBomStep(aiPresetId: number, userId: number) {
  const db = await requireDb();
  const presetResult = await db.execute(sql`
    SELECT * FROM process_ai_preset_steps WHERE id = ${aiPresetId}
  `);
  const preset = (presetResult as any)[0]?.[0];
  if (!preset) return null;

  // 获取当前最大步骤号
  const maxResult = await db.execute(sql`
    SELECT MAX(step_number) as max_step FROM process_bom_steps 
    WHERE process_instance_id = ${preset.process_instance_id}
  `);
  const maxStep = (maxResult as any)[0]?.[0]?.max_step || 0;

  // 创建BOM步骤
  const bomResult = await db.execute(sql`
    INSERT INTO process_bom_steps 
    (process_instance_id, project_id, process_code, step_number, step_name,
     process_requirements, process_description, bom_item_reference,
     theoretical_hours, status, created_by)
    VALUES (${preset.process_instance_id}, ${preset.project_id}, ${preset.process_code},
            ${maxStep + 1}, ${preset.step_name}, ${preset.process_requirements},
            ${preset.process_description}, ${preset.bom_item_reference},
            ${preset.theoretical_hours}, 'pending', ${userId})
  `);

  // 标记AI预设为已确认
  await confirmAiPresetStep(aiPresetId, userId, 'confirmed');

  return { bomStepId: (bomResult as any)[0]?.insertId, success: true };
}

// 批量采纳AI预设步骤
export async function batchAdoptAiPresets(aiPresetIds: number[], userId: number) {
  const results: Array<{ aiPresetId: number; bomStepId?: number; success: boolean }> = [];
  for (const id of aiPresetIds) {
    const result = await adoptAiPresetAsBomStep(id, userId);
    results.push({ aiPresetId: id, bomStepId: result?.bomStepId, success: !!result });
  }
  return results;
}

// ============================================================
// 3. 产线员工工时打卡
// ============================================================

export async function startTimeLog(bomStepId: number, workerId: number, workerName: string) {
  const db = await requireDb();
  
  // 检查是否已有未结束的打卡记录
  const existingResult = await db.execute(sql`
    SELECT id FROM process_step_time_logs 
    WHERE bom_step_id = ${bomStepId} AND worker_id = ${workerId} AND end_time IS NULL
    LIMIT 1
  `);
  const existing = (existingResult as any)[0];
  if (existing && existing.length > 0) {
    return { error: "已有未结束的工时记录，请先结束当前工时", existingId: existing[0].id };
  }

  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO process_step_time_logs 
    (bom_step_id, worker_id, worker_name, start_time, status)
    VALUES (${bomStepId}, ${workerId}, ${workerName}, ${now}, 'in_progress')
  `);

  // 更新BOM步骤状态为进行中
  await db.execute(sql`
    UPDATE process_bom_steps SET status = 'in_progress', updated_at = NOW()
    WHERE id = ${bomStepId} AND status = 'pending'
  `);

  return { id: (result as any)[0]?.insertId, startTime: now };
}

export async function endTimeLog(timeLogId: number, notes?: string) {
  const db = await requireDb();
  const now = Date.now();

  // 获取开始时间
  const logResult = await db.execute(sql`
    SELECT * FROM process_step_time_logs WHERE id = ${timeLogId}
  `);
  const log = (logResult as any)[0]?.[0];
  if (!log) return { error: "工时记录不存在" };
  if (log.end_time) return { error: "该工时记录已结束" };

  const startTime = Number(log.start_time);
  const actualHours = (now - startTime) / (1000 * 60 * 60); // 转换为小时

  await db.execute(sql`
    UPDATE process_step_time_logs 
    SET end_time = ${now}, actual_hours = ${Math.round(actualHours * 100) / 100},
        notes = ${notes || null}, status = 'completed', updated_at = NOW()
    WHERE id = ${timeLogId}
  `);

  return { endTime: now, actualHours: Math.round(actualHours * 100) / 100 };
}

export async function getTimeLogs(bomStepId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM process_step_time_logs 
    WHERE bom_step_id = ${bomStepId}
    ORDER BY start_time DESC
  `);
  return (result as any)[0] || [];
}

export async function getTimeLogsByWorker(workerId: number, projectId?: number) {
  const db = await requireDb();
  if (projectId) {
    const result = await db.execute(sql`
      SELECT t.*, b.step_name, b.process_code, b.project_id
      FROM process_step_time_logs t
      JOIN process_bom_steps b ON t.bom_step_id = b.id
      WHERE t.worker_id = ${workerId} AND b.project_id = ${projectId}
      ORDER BY t.start_time DESC
    `);
    return (result as any)[0] || [];
  }
  const result = await db.execute(sql`
    SELECT t.*, b.step_name, b.process_code, b.project_id
    FROM process_step_time_logs t
    JOIN process_bom_steps b ON t.bom_step_id = b.id
    WHERE t.worker_id = ${workerId}
    ORDER BY t.start_time DESC
  `);
  return (result as any)[0] || [];
}

export async function getActiveTimeLogs(workerId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT t.*, b.step_name, b.process_code, b.project_id
    FROM process_step_time_logs t
    JOIN process_bom_steps b ON t.bom_step_id = b.id
    WHERE t.worker_id = ${workerId} AND t.end_time IS NULL
    ORDER BY t.start_time DESC
  `);
  return (result as any)[0] || [];
}

// ============================================================
// 4. 附件管理
// ============================================================

export async function addStepAttachment(data: StepAttachment) {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO process_step_attachments 
    (step_id, step_type, file_name, file_url, file_type, file_size, uploaded_by)
    VALUES (${data.stepId}, ${data.stepType}, ${data.fileName}, ${data.fileUrl},
            ${data.fileType || null}, ${data.fileSize || null}, ${data.uploadedBy || null})
  `);
  return { id: (result as any)[0]?.insertId };
}

export async function getStepAttachments(stepId: number, stepType: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM process_step_attachments 
    WHERE step_id = ${stepId} AND step_type = ${stepType}
    ORDER BY created_at DESC
  `);
  return (result as any)[0] || [];
}

export async function deleteStepAttachment(id: number) {
  const db = await requireDb();
  await db.execute(sql`DELETE FROM process_step_attachments WHERE id = ${id}`);
  return { success: true };
}

// ============================================================
// 5. AI历史项目参照与智慧预设
// ============================================================

export async function createHistoricalReference(data: HistoricalReference) {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO ai_historical_references 
    (source_project_id, target_project_id, process_code, reference_scope,
     range_start, range_end, match_algorithm, match_score, status)
    VALUES (${data.sourceProjectId}, ${data.targetProjectId}, ${data.processCode || null},
            ${data.referenceScope}, ${data.rangeStart || null}, ${data.rangeEnd || null},
            ${data.matchAlgorithm || 'bom_similarity'}, ${data.matchScore || null},
            ${data.status || 'active'})
  `);
  return { id: (result as any)[0]?.insertId };
}

export async function getHistoricalReferences(targetProjectId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM ai_historical_references 
    WHERE target_project_id = ${targetProjectId}
    ORDER BY match_score DESC
  `);
  return (result as any)[0] || [];
}

/**
 * AI智慧预设核心功能：
 * 根据历史项目的BOM步骤，结合当前项目的BOM清单，
 * 利用AI生成预设步骤建议
 */
export async function generateAiPresetSteps(
  targetProjectId: number,
  processInstanceId: number,
  processCode: string,
  sourceProjectId: number,
  currentBomItems?: string // 当前项目的BOM清单（JSON字符串）
) {
  const db = await requireDb();

  // 1. 获取源项目的BOM步骤
  const sourceStepsResult = await db.execute(sql`
    SELECT * FROM process_bom_steps 
    WHERE project_id = ${sourceProjectId} AND process_code = ${processCode}
    ORDER BY step_number ASC
  `);
  const sourceSteps = (sourceStepsResult as any)[0] || [];

  if (sourceSteps.length === 0) {
    return { steps: [], message: "源项目在该工序下没有历史步骤数据" };
  }

  // 2. 获取源项目信息
  const sourceProjectResult = await db.execute(sql`
    SELECT project_name FROM grt_projects WHERE id = ${sourceProjectId} LIMIT 1
  `);
  const sourceProjectName = (sourceProjectResult as any)[0]?.[0]?.project_name || `项目#${sourceProjectId}`;

  // 3. 使用AI分析并生成预设步骤
  const sourceStepsText = sourceSteps.map((s: any, i: number) => 
    `步骤${s.step_number}: ${s.step_name}\n  工艺要求: ${s.process_requirements || '无'}\n  工艺描述: ${s.process_description || '无'}\n  BOM参照: ${s.bom_item_reference || '无'}\n  理论工时: ${s.theoretical_hours || '未设定'}小时`
  ).join("\n\n");

  const prompt = `你是一个工业清洗设备制造的生产工艺专家。请根据以下历史项目的工序步骤，为新项目生成预设步骤建议。

## 历史项目信息
- 项目名称: ${sourceProjectName}
- 工序代码: ${processCode}
- 历史步骤:
${sourceStepsText}

${currentBomItems ? `## 当前项目BOM清单\n${currentBomItems}` : ''}

## 要求
1. 参照历史步骤，生成适合新项目的预设步骤
2. 保持步骤的逻辑顺序
3. 如果有BOM清单，需要结合BOM清单调整步骤内容
4. 每个步骤需要包含：步骤名称、工艺要求、工艺描述、BOM参照、理论工时

请以JSON格式返回，格式如下：
{
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "步骤名称",
      "processRequirements": "工艺要求",
      "processDescription": "工艺步骤描述",
      "bomItemReference": "BOM零件参照",
      "theoreticalHours": 2.5
    }
  ],
  "matchAnalysis": "匹配分析说明",
  "adjustmentNotes": "调整说明"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是GRT工业清洗设备公司的生产工艺AI助手。请严格按照JSON格式返回结果。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_preset_steps",
          strict: true,
          schema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stepNumber: { type: "integer" },
                    stepName: { type: "string" },
                    processRequirements: { type: "string" },
                    processDescription: { type: "string" },
                    bomItemReference: { type: "string" },
                    theoreticalHours: { type: "number" }
                  },
                  required: ["stepNumber", "stepName", "processRequirements", "processDescription", "bomItemReference", "theoreticalHours"],
                  additionalProperties: false
                }
              },
              matchAnalysis: { type: "string" },
              adjustmentNotes: { type: "string" }
            },
            required: ["steps", "matchAnalysis", "adjustmentNotes"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return { steps: [], message: "AI未返回有效内容" };

    const parsed = JSON.parse(content);
    const createdSteps: any[] = [];

    // 4. 将AI生成的步骤保存到数据库
    for (const step of parsed.steps) {
      const result = await createAiPresetStep({
        processInstanceId,
        projectId: targetProjectId,
        processCode,
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        processRequirements: step.processRequirements,
        processDescription: step.processDescription,
        bomItemReference: step.bomItemReference,
        theoreticalHours: step.theoreticalHours,
        sourceProjectId,
        sourceProjectName,
        matchScore: 85, // 默认匹配度
        confirmStatus: 'pending'
      });
      createdSteps.push({ ...step, id: result.id });
    }

    // 5. 记录历史参照
    await createHistoricalReference({
      sourceProjectId,
      targetProjectId,
      processCode,
      referenceScope: 'single_step',
      matchAlgorithm: 'llm_analysis',
      matchScore: 85,
      status: 'active'
    });

    return {
      steps: createdSteps,
      matchAnalysis: parsed.matchAnalysis,
      adjustmentNotes: parsed.adjustmentNotes,
      sourceProjectName
    };
  } catch (error) {
    console.error("[AI Preset] Error generating preset steps:", error);
    
    // 降级方案：直接复制历史步骤
    const fallbackSteps: any[] = [];
    for (const step of sourceSteps) {
      const result = await createAiPresetStep({
        processInstanceId,
        projectId: targetProjectId,
        processCode,
        stepNumber: step.step_number,
        stepName: step.step_name,
        processRequirements: step.process_requirements,
        processDescription: step.process_description,
        bomItemReference: step.bom_item_reference,
        theoreticalHours: step.theoretical_hours ? Number(step.theoretical_hours) : undefined,
        sourceProjectId,
        sourceProjectName,
        matchScore: 70,
        confirmStatus: 'pending'
      });
      fallbackSteps.push({ ...step, id: result.id });
    }

    return {
      steps: fallbackSteps,
      matchAnalysis: "AI分析暂时不可用，已直接复制历史步骤作为参照",
      adjustmentNotes: "建议工程师手动审核并调整每个步骤",
      sourceProjectName,
      fallback: true
    };
  }
}

/**
 * 批量生成AI预设：对指定范围的T步骤全部借鉴
 */
export async function generateAiPresetsForRange(
  targetProjectId: number,
  sourceProjectId: number,
  processCodeStart: string,
  processCodeEnd: string,
  currentBomItems?: string
) {
  const allCodes = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","T13","T14","T15"];
  const startIdx = allCodes.indexOf(processCodeStart);
  const endIdx = allCodes.indexOf(processCodeEnd);
  
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    return { error: "无效的工序范围" };
  }

  const targetCodes = allCodes.slice(startIdx, endIdx + 1);
  const results: Record<string, unknown> = {};

  // 获取目标项目的工序实例
  const db = await requireDb();
  const instancesResult = await db.execute(sql`
    SELECT id, process_code FROM project_process_instances 
    WHERE project_id = ${targetProjectId} AND process_code IN (${sql.raw(targetCodes.map(c => `'${c}'`).join(','))})
  `);
  const instances = (instancesResult as any)[0] || [];
  const instanceMap = new Map<string, number>(instances.map((i: any) => [i.process_code, i.id]));

  for (const code of targetCodes) {
    const instanceId = instanceMap.get(code);
    if (!instanceId) {
      results[code] = { skipped: true, reason: "该工序暂无实例" };
      continue;
    }
    results[code] = await generateAiPresetSteps(
      targetProjectId, instanceId, code, sourceProjectId, currentBomItems
    );
  }

  // 记录范围参照
  await createHistoricalReference({
    sourceProjectId,
    targetProjectId,
    referenceScope: 'range',
    rangeStart: processCodeStart,
    rangeEnd: processCodeEnd,
    matchAlgorithm: 'llm_analysis',
    matchScore: 80,
    status: 'active'
  });

  return results;
}

/**
 * 查找相似历史项目（用于AI参照选择）
 */
export async function findSimilarProjects(projectId: number, limit: number = 10) {
  const db = await requireDb();
  
  // 获取当前项目信息
  const projectResult = await db.execute(sql`
    SELECT * FROM grt_projects WHERE id = ${projectId} LIMIT 1
  `);
  const project = (projectResult as any)[0]?.[0];
  if (!project) return [];

  // 查找有BOM步骤的历史项目
  const result = await db.execute(sql`
    SELECT DISTINCT p.id, p.project_name, p.project_code, p.status,
           COUNT(b.id) as step_count,
           GROUP_CONCAT(DISTINCT b.process_code) as process_codes
    FROM grt_projects p
    JOIN process_bom_steps b ON p.id = b.project_id
    WHERE p.id != ${projectId} AND b.status = 'completed'
    GROUP BY p.id
    ORDER BY step_count DESC
    LIMIT ${limit}
  `);
  return (result as any)[0] || [];
}

// ============================================================
// 6. T1-T15 与 M0-M12 映射查询
// ============================================================

export function getProcessCodesForMilestone(milestoneCode: string): string[] {
  return M_TO_T_MAPPING[milestoneCode] || [];
}

export function getMilestonesForProcessCode(processCode: string): string[] {
  return T_TO_M_MAPPING[processCode] || [];
}

export async function getProjectProcessOverview(projectId: number) {
  const db = await requireDb();
  
  // 获取所有工序实例
  const instancesResult = await db.execute(sql`
    SELECT * FROM project_process_instances 
    WHERE project_id = ${projectId}
    ORDER BY process_code ASC
  `);
  const instances = (instancesResult as any)[0] || [];

  // 获取每个工序的BOM步骤统计
  const stepsResult = await db.execute(sql`
    SELECT process_code, 
           COUNT(*) as total_steps,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_steps,
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_steps,
           SUM(COALESCE(theoretical_hours, 0)) as total_theoretical_hours
    FROM process_bom_steps 
    WHERE project_id = ${projectId}
    GROUP BY process_code
  `);
  const stepsStats = (stepsResult as any)[0] || [];
  const stepsMap = new Map(stepsStats.map((s: any) => [s.process_code, s]));

  // 获取AI预设步骤统计
  const aiResult = await db.execute(sql`
    SELECT process_code,
           COUNT(*) as total_presets,
           SUM(CASE WHEN confirm_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_presets,
           SUM(CASE WHEN confirm_status = 'pending' THEN 1 ELSE 0 END) as pending_presets
    FROM process_ai_preset_steps 
    WHERE project_id = ${projectId}
    GROUP BY process_code
  `);
  const aiStats = (aiResult as any)[0] || [];
  const aiMap = new Map(aiStats.map((a: any) => [a.process_code, a]));

  // 获取工时统计
  const timeResult = await db.execute(sql`
    SELECT b.process_code,
           SUM(t.actual_hours) as total_actual_hours,
           COUNT(DISTINCT t.worker_id) as worker_count
    FROM process_step_time_logs t
    JOIN process_bom_steps b ON t.bom_step_id = b.id
    WHERE b.project_id = ${projectId} AND t.status = 'completed'
    GROUP BY b.process_code
  `);
  const timeStats = (timeResult as any)[0] || [];
  const timeMap = new Map(timeStats.map((t: any) => [t.process_code, t]));

  return instances.map((inst: any) => ({
    ...inst,
    milestones: T_TO_M_MAPPING[inst.process_code] || [],
    bomSteps: stepsMap.get(inst.process_code) || { total_steps: 0, completed_steps: 0, in_progress_steps: 0, total_theoretical_hours: 0 },
    aiPresets: aiMap.get(inst.process_code) || { total_presets: 0, confirmed_presets: 0, pending_presets: 0 },
    timeStats: timeMap.get(inst.process_code) || { total_actual_hours: 0, worker_count: 0 }
  }));
}

// ============================================================
// 7. 统计与报表
// ============================================================

export async function getProcessStepStats(projectId: number) {
  const db = await requireDb();

  const bomResult = await db.execute(sql`
    SELECT COUNT(*) as total, 
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(COALESCE(theoretical_hours, 0)) as total_theoretical_hours
    FROM process_bom_steps WHERE project_id = ${projectId}
  `);
  const bomStats = (bomResult as any)[0]?.[0] || {};

  const aiResult = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN confirm_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
           SUM(CASE WHEN confirm_status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN confirm_status = 'modified' THEN 1 ELSE 0 END) as modified,
           SUM(CASE WHEN confirm_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM process_ai_preset_steps WHERE project_id = ${projectId}
  `);
  const aiStats = (aiResult as any)[0]?.[0] || {};

  const timeResult = await db.execute(sql`
    SELECT SUM(t.actual_hours) as total_actual_hours,
           COUNT(DISTINCT t.worker_id) as unique_workers,
           COUNT(*) as total_logs
    FROM process_step_time_logs t
    JOIN process_bom_steps b ON t.bom_step_id = b.id
    WHERE b.project_id = ${projectId} AND t.status = 'completed'
  `);
  const timeStats = (timeResult as any)[0]?.[0] || {};

  return {
    bomSteps: {
      total: Number(bomStats.total || 0),
      completed: Number(bomStats.completed || 0),
      inProgress: Number(bomStats.in_progress || 0),
      pending: Number(bomStats.pending || 0),
      totalTheoreticalHours: Number(bomStats.total_theoretical_hours || 0)
    },
    aiPresets: {
      total: Number(aiStats.total || 0),
      confirmed: Number(aiStats.confirmed || 0),
      pending: Number(aiStats.pending || 0),
      modified: Number(aiStats.modified || 0),
      rejected: Number(aiStats.rejected || 0)
    },
    timeLogs: {
      totalActualHours: Number(timeStats.total_actual_hours || 0),
      uniqueWorkers: Number(timeStats.unique_workers || 0),
      totalLogs: Number(timeStats.total_logs || 0)
    }
  };
}


// ============================================================
// 7. 工序进度看板统计 (Process Progress Dashboard)
// ============================================================

export interface ProcessProgressItem {
  processCode: string;
  processName: string;
  milestones: string[];
  totalSteps: number;
  completedSteps: number;
  inProgressSteps: number;
  pendingSteps: number;
  completionRate: number;
  totalTheoreticalHours: number;
  totalActualHours: number;
  hoursVariance: number; // 正数=超时, 负数=提前
  hoursVariancePercent: number;
}

export interface ProjectProgressSummary {
  projectId: number;
  overallCompletionRate: number;
  totalProcesses: number;
  completedProcesses: number;
  totalSteps: number;
  completedSteps: number;
  totalTheoreticalHours: number;
  totalActualHours: number;
  overallHoursVariance: number;
  processDetails: ProcessProgressItem[];
}

const PROCESS_NAMES: Record<string, string> = {
  T1: "机加工", T2: "冷作", T3: "机械部件装配", T4: "机械装配",
  T5: "机械总装", T6: "电气装配", T7: "设备调试", T8: "跑和",
  T9: "包装", T10: "发货", T11: "卸车", T12: "就位",
  T13: "水电气连接", T14: "现场调试", T15: "终验收"
};

export async function getProjectProgressDashboard(projectId: number): Promise<ProjectProgressSummary> {
  const db = await requireDb();

  // 获取每个工序的BOM步骤统计
  const stepStats = (await db.execute(sql`
    SELECT
      process_code,
      COUNT(*) as total_steps,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_steps,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_steps,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_steps,
      COALESCE(SUM(theoretical_hours), 0) as total_theoretical_hours
    FROM grt_bom_steps
    WHERE project_id = ${projectId}
    GROUP BY process_code
    ORDER BY process_code
  `)).rows;

  // 获取每个工序的实际工时统计
  const timeStats = (await db.execute(sql`
    SELECT
      bs.process_code,
      COALESCE(SUM(wt.actual_hours), 0) as total_actual_hours
    FROM grt_work_time_logs wt
    JOIN grt_bom_steps bs ON wt.bom_step_id = bs.id
    WHERE bs.project_id = ${projectId} AND wt.end_time IS NOT NULL
    GROUP BY bs.process_code
  `)).rows;

  const timeByProcess = new Map<string, number>();
  (timeStats as any[]).forEach((row: any) => {
    timeByProcess.set(row.process_code, Number(row.total_actual_hours || 0));
  });

  const processDetails: ProcessProgressItem[] = [];
  let totalSteps = 0;
  let completedSteps = 0;
  let totalTheoreticalHours = 0;
  let totalActualHours = 0;

  // 构建所有T1-T15的进度数据
  const processCodeOrder = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","T13","T14","T15"];
  const stepStatsMap = new Map<string, any>();
  (stepStats as any[]).forEach((row: any) => {
    stepStatsMap.set(row.process_code, row);
  });

  for (const code of processCodeOrder) {
    const row = stepStatsMap.get(code);
    const total = Number(row?.total_steps || 0);
    const completed = Number(row?.completed_steps || 0);
    const inProgress = Number(row?.in_progress_steps || 0);
    const pending = Number(row?.pending_steps || 0);
    const theoretical = Number(row?.total_theoretical_hours || 0);
    const actual = timeByProcess.get(code) || 0;
    const variance = theoretical > 0 ? actual - theoretical : 0;
    const variancePercent = theoretical > 0 ? ((actual - theoretical) / theoretical) * 100 : 0;

    processDetails.push({
      processCode: code,
      processName: PROCESS_NAMES[code] || code,
      milestones: T_TO_M_MAPPING[code] || [],
      totalSteps: total,
      completedSteps: completed,
      inProgressSteps: inProgress,
      pendingSteps: pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      totalTheoreticalHours: theoretical,
      totalActualHours: actual,
      hoursVariance: variance,
      hoursVariancePercent: variancePercent,
    });

    totalSteps += total;
    completedSteps += completed;
    totalTheoreticalHours += theoretical;
    totalActualHours += actual;
  }

  const completedProcesses = processDetails.filter(p => p.totalSteps > 0 && p.completionRate === 100).length;
  const processesWithSteps = processDetails.filter(p => p.totalSteps > 0).length;

  return {
    projectId,
    overallCompletionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    totalProcesses: processesWithSteps,
    completedProcesses,
    totalSteps,
    completedSteps,
    totalTheoreticalHours,
    totalActualHours,
    overallHoursVariance: totalTheoreticalHours > 0 ? totalActualHours - totalTheoreticalHours : 0,
    processDetails,
  };
}

// ============================================================
// 8. 产线员工移动端视图 (Worker Mobile View)
// ============================================================

export interface WorkerAssignment {
  bomStepId: number;
  stepNumber: number;
  stepName: string;
  processCode: string;
  processName: string;
  projectId: number;
  processRequirements: string | null;
  processDescription: string | null;
  bomItemReference: string | null;
  theoreticalHours: number | null;
  status: string;
  activeTimeLogId: number | null;
  activeStartTime: number | null;
}

export interface WorkerTimeHistory {
  id: number;
  bomStepId: number;
  stepName: string;
  processCode: string;
  projectId: number;
  startTime: number;
  endTime: number | null;
  actualHours: number | null;
  notes: string | null;
}

export async function getWorkerAssignments(workerId: number): Promise<WorkerAssignment[]> {
  const db = await requireDb();

  const rows = (await db.execute(sql`
    SELECT
      bs.id as bom_step_id,
      bs.step_number,
      bs.step_name,
      bs.process_code,
      bs.project_id,
      bs.process_requirements,
      bs.process_description,
      bs.bom_item_reference,
      bs.theoretical_hours,
      bs.status,
      wt.id as active_time_log_id,
      wt.start_time as active_start_time
    FROM grt_bom_steps bs
    LEFT JOIN grt_work_time_logs wt ON wt.bom_step_id = bs.id AND wt.worker_id = ${workerId} AND wt.end_time IS NULL
    WHERE bs.planned_worker_id = ${workerId} AND bs.status != 'completed'
    ORDER BY bs.process_code ASC, bs.step_number ASC
  `)).rows;

  return (rows as any[]).map((row: any) => ({
    bomStepId: row.bom_step_id,
    stepNumber: row.step_number,
    stepName: row.step_name,
    processCode: row.process_code,
    processName: PROCESS_NAMES[row.process_code] || row.process_code,
    projectId: row.project_id,
    processRequirements: row.process_requirements,
    processDescription: row.process_description,
    bomItemReference: row.bom_item_reference,
    theoreticalHours: row.theoretical_hours ? Number(row.theoretical_hours) : null,
    status: row.status,
    activeTimeLogId: row.active_time_log_id || null,
    activeStartTime: row.active_start_time ? Number(row.active_start_time) : null,
  }));
}

export async function getWorkerTimeHistory(workerId: number, limit: number = 50): Promise<WorkerTimeHistory[]> {
  const db = await requireDb();

  const rows = (await db.execute(sql`
    SELECT
      wt.id,
      wt.bom_step_id,
      bs.step_name,
      bs.process_code,
      bs.project_id,
      wt.start_time,
      wt.end_time,
      wt.actual_hours,
      wt.notes
    FROM grt_work_time_logs wt
    JOIN grt_bom_steps bs ON wt.bom_step_id = bs.id
    WHERE wt.worker_id = ${workerId}
    ORDER BY wt.start_time DESC
    LIMIT ${limit}
  `)).rows;

  return (rows as any[]).map((row: any) => ({
    id: row.id,
    bomStepId: row.bom_step_id,
    stepName: row.step_name,
    processCode: row.process_code,
    projectId: row.project_id,
    startTime: Number(row.start_time),
    endTime: row.end_time ? Number(row.end_time) : null,
    actualHours: row.actual_hours ? Number(row.actual_hours) : null,
    notes: row.notes,
  }));
}

export async function getWorkerDailySummary(workerId: number): Promise<{
  todayHours: number;
  todayTasks: number;
  weekHours: number;
  weekTasks: number;
  activeTask: WorkerAssignment | null;
}> {
  const db = await requireDb();
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const todayStats = (await db.execute(sql`
    SELECT
      COALESCE(SUM(actual_hours), 0) as total_hours,
      COUNT(*) as total_tasks
    FROM grt_work_time_logs
    WHERE worker_id = ${workerId} AND end_time IS NOT NULL AND start_time >= ${todayStart.getTime()}
  `)).rows;

  const weekStats = (await db.execute(sql`
    SELECT
      COALESCE(SUM(actual_hours), 0) as total_hours,
      COUNT(*) as total_tasks
    FROM grt_work_time_logs
    WHERE worker_id = ${workerId} AND end_time IS NOT NULL AND start_time >= ${weekStart.getTime()}
  `)).rows;

  const assignments = await getWorkerAssignments(workerId);
  const activeTask = assignments.find(a => a.activeTimeLogId !== null) || null;

  const today = (todayStats as any[])[0] || {};
  const week = (weekStats as any[])[0] || {};

  return {
    todayHours: Number(today.total_hours || 0),
    todayTasks: Number(today.total_tasks || 0),
    weekHours: Number(week.total_hours || 0),
    weekTasks: Number(week.total_tasks || 0),
    activeTask,
  };
}

// ============================================================
// 9. AI预设准确度反馈机制 (AI Preset Accuracy Feedback)
// ============================================================

export interface AiAccuracyStats {
  totalPresets: number;
  confirmedCount: number;
  modifiedCount: number;
  rejectedCount: number;
  pendingCount: number;
  adoptionRate: number; // (confirmed + modified) / total * 100
  directAdoptionRate: number; // confirmed / total * 100
  modificationRate: number; // modified / total * 100
  rejectionRate: number; // rejected / total * 100
}

export interface AiAccuracyByProcess {
  processCode: string;
  processName: string;
  stats: AiAccuracyStats;
}

export interface AiAccuracyByProject {
  projectId: number;
  projectName: string;
  stats: AiAccuracyStats;
}

export interface AiAccuracyDashboard {
  overall: AiAccuracyStats;
  byProcess: AiAccuracyByProcess[];
  byProject: AiAccuracyByProject[];
  trend: { period: string; adoptionRate: number; totalPresets: number }[];
  modificationAnalysis: {
    avgFieldsModified: number;
    mostModifiedFields: { field: string; count: number }[];
  };
}

function calculateAccuracyStats(rows: any[]): AiAccuracyStats {
  const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const confirmed = rows.reduce((sum, r) => sum + Number(r.confirmed || 0), 0);
  const modified = rows.reduce((sum, r) => sum + Number(r.modified || 0), 0);
  const rejected = rows.reduce((sum, r) => sum + Number(r.rejected || 0), 0);
  const pending = rows.reduce((sum, r) => sum + Number(r.pending || 0), 0);
  const decided = confirmed + modified + rejected;

  return {
    totalPresets: total,
    confirmedCount: confirmed,
    modifiedCount: modified,
    rejectedCount: rejected,
    pendingCount: pending,
    adoptionRate: decided > 0 ? ((confirmed + modified) / decided) * 100 : 0,
    directAdoptionRate: decided > 0 ? (confirmed / decided) * 100 : 0,
    modificationRate: decided > 0 ? (modified / decided) * 100 : 0,
    rejectionRate: decided > 0 ? (rejected / decided) * 100 : 0,
  };
}

export async function getAiAccuracyDashboard(projectId?: number): Promise<AiAccuracyDashboard> {
  const db = await requireDb();

  // 总体统计
  const projectFilter = projectId ? sql`WHERE project_id = ${projectId}` : sql``;
  const overallRows = (await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN confirm_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN confirm_status = 'modified' THEN 1 ELSE 0 END) as modified,
      SUM(CASE WHEN confirm_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN confirm_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM grt_ai_preset_steps
    ${projectFilter}
  `)).rows;

  const overall = calculateAccuracyStats(overallRows as any[]);

  // 按工序统计
  const byProcessRows = (await db.execute(sql`
    SELECT
      process_code,
      COUNT(*) as total,
      SUM(CASE WHEN confirm_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN confirm_status = 'modified' THEN 1 ELSE 0 END) as modified,
      SUM(CASE WHEN confirm_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN confirm_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM grt_ai_preset_steps
    ${projectFilter}
    GROUP BY process_code
    ORDER BY process_code
  `)).rows;

  const byProcess: AiAccuracyByProcess[] = (byProcessRows as any[]).map((row: any) => ({
    processCode: row.process_code,
    processName: PROCESS_NAMES[row.process_code] || row.process_code,
    stats: calculateAccuracyStats([row]),
  }));

  // 按项目统计
  const byProjectRows = (await db.execute(sql`
    SELECT
      project_id,
      COUNT(*) as total,
      SUM(CASE WHEN confirm_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN confirm_status = 'modified' THEN 1 ELSE 0 END) as modified,
      SUM(CASE WHEN confirm_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN confirm_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM grt_ai_preset_steps
    ${projectFilter}
    GROUP BY project_id
    ORDER BY project_id
  `)).rows;

  const byProject: AiAccuracyByProject[] = (byProjectRows as any[]).map((row: any) => ({
    projectId: Number(row.project_id),
    projectName: `项目#${row.project_id}`,
    stats: calculateAccuracyStats([row]),
  }));

  // 月度趋势（最近6个月）
  const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const trendRows = (await db.execute(sql`
    SELECT
      DATE_FORMAT(FROM_UNIXTIME(created_at / 1000), '%Y-%m') as period,
      COUNT(*) as total,
      SUM(CASE WHEN confirm_status IN ('confirmed', 'modified') THEN 1 ELSE 0 END) as adopted
    FROM grt_ai_preset_steps
    WHERE created_at >= ${sixMonthsAgo}
    ${projectId ? sql`AND project_id = ${projectId}` : sql``}
    GROUP BY period
    ORDER BY period
  `)).rows;

  const trend = (trendRows as any[]).map((row: any) => ({
    period: row.period,
    adoptionRate: Number(row.total) > 0 ? (Number(row.adopted) / Number(row.total)) * 100 : 0,
    totalPresets: Number(row.total),
  }));

  // 修改幅度分析 - 统计哪些字段被修改最多
  const modRows = (await db.execute(sql`
    SELECT
      COUNT(*) as total_modified,
      SUM(CASE WHEN modified_step_name IS NOT NULL AND modified_step_name != step_name THEN 1 ELSE 0 END) as name_changes,
      SUM(CASE WHEN modified_requirements IS NOT NULL THEN 1 ELSE 0 END) as req_changes,
      SUM(CASE WHEN modified_description IS NOT NULL THEN 1 ELSE 0 END) as desc_changes,
      SUM(CASE WHEN modified_hours IS NOT NULL THEN 1 ELSE 0 END) as hours_changes
    FROM grt_ai_preset_steps
    WHERE confirm_status = 'modified'
    ${projectId ? sql`AND project_id = ${projectId}` : sql``}
  `)).rows;

  const modData = (modRows as any[])[0] || {};
  const totalModified = Number(modData.total_modified || 0);
  const fieldChanges = [
    { field: "步骤名称", count: Number(modData.name_changes || 0) },
    { field: "工艺要求", count: Number(modData.req_changes || 0) },
    { field: "步骤描述", count: Number(modData.desc_changes || 0) },
    { field: "理论工时", count: Number(modData.hours_changes || 0) },
  ].sort((a, b) => b.count - a.count);

  const totalFieldChanges = fieldChanges.reduce((sum, f) => sum + f.count, 0);

  return {
    overall,
    byProcess,
    byProject,
    trend,
    modificationAnalysis: {
      avgFieldsModified: totalModified > 0 ? totalFieldChanges / totalModified : 0,
      mostModifiedFields: fieldChanges,
    },
  };
}

// ============================================================
// 10. 工时自动推断 (Auto Time Tracking on Step Completion)
// ============================================================

export async function completeStepWithAutoTime(
  stepId: number,
  projectId: number,
  processCode: string,
  userId: number,
  userName: string,
  notes?: string
): Promise<{ success: true; autoLoggedHours: number; timeRecordId: string }> {
  const db = await requireDb();

  // 1. 获取BOM步骤详情
  const stepResult = await db.execute(sql`
    SELECT * FROM process_bom_steps WHERE id = ${stepId}
  `);
  const step = (stepResult as any)[0]?.[0];
  if (!step) throw new Error("BOM步骤不存在");
  if (step.status === 'completed') throw new Error("该步骤已完成");

  const now = Date.now();

  // 2. 计算实际工时
  let autoLoggedHours: number;

  // 查找该步骤是否有进行中的工时打卡记录（有actual_start_time）
  const activeLogResult = await db.execute(sql`
    SELECT * FROM process_step_time_logs
    WHERE bom_step_id = ${stepId} AND end_time IS NULL
    ORDER BY start_time ASC
    LIMIT 1
  `);
  const activeLog = (activeLogResult as any)[0]?.[0];

  if (activeLog) {
    // 有活跃的打卡记录，使用实际start_time计算
    const startTime = Number(activeLog.start_time);
    autoLoggedHours = Math.round(((now - startTime) / (1000 * 60 * 60)) * 100) / 100;

    // 结束该打卡记录
    await db.execute(sql`
      UPDATE process_step_time_logs
      SET end_time = ${now}, actual_hours = ${autoLoggedHours},
          notes = ${notes || null}, status = 'completed', updated_at = NOW()
      WHERE id = ${activeLog.id}
    `);
  } else if (step.theoretical_hours) {
    // 没有活跃的打卡记录，使用理论工时作为fallback
    autoLoggedHours = Number(step.theoretical_hours);
  } else {
    // 无任何参考，默认0
    autoLoggedHours = 0;
  }

  // 3. 更新BOM步骤状态为completed
  await db.execute(sql`
    UPDATE process_bom_steps
    SET status = 'completed', updated_at = NOW()
    WHERE id = ${stepId}
  `);

  // 4. 使用production-execution的createTimeRecord自动创建工时记录
  const today = new Date();
  const recordDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const timeRecordId = await createTimeRecord({
    userId,
    userName,
    projectId,
    stageCode: processCode,
    recordDate,
    duration: autoLoggedHours,
    sourceType: 'AUTO_CALC',
    workType: 'REGULAR',
    description: notes || `自动工时: 完成步骤 "${step.step_name}"`,
  });

  return {
    success: true,
    autoLoggedHours,
    timeRecordId: String(timeRecordId),
  };
}

// ============================================================
// 11. AI预设工步批量采纳 (Batch AI Step Adoption by Project/Process)
// ============================================================

export async function batchAdoptAiPresetsByProject(
  projectId: number,
  processCode: string,
  userId: number,
  presetIds?: number[]
): Promise<{ success: true; adoptedCount: number; steps: Array<{ id: number; name: string }> }> {
  const db = await requireDb();

  // 1. 获取要采纳的AI预设步骤
  let presets: any[];
  if (presetIds && presetIds.length > 0) {
    // 只采纳指定的预设
    const idList = presetIds.map(Number).join(',');
    const result = await db.execute(sql.raw(
      `SELECT * FROM process_ai_preset_steps WHERE id IN (${idList}) AND project_id = ${Number(projectId)} AND process_code = '${String(processCode).replace(/'/g, "''")}'`
    ));
    presets = (result as any)[0] || [];
  } else {
    // 采纳该项目/工序下所有未确认的AI预设
    const result = await db.execute(sql`
      SELECT * FROM process_ai_preset_steps
      WHERE project_id = ${projectId} AND process_code = ${processCode}
        AND confirm_status = 'pending'
      ORDER BY step_number ASC
    `);
    presets = (result as any)[0] || [];
  }

  if (presets.length === 0) {
    return { success: true, adoptedCount: 0, steps: [] };
  }

  // 2. 获取当前最大步骤号
  const maxResult = await db.execute(sql`
    SELECT MAX(step_number) as max_step FROM process_bom_steps
    WHERE project_id = ${projectId} AND process_code = ${processCode}
  `);
  let nextStep = ((maxResult as any)[0]?.[0]?.max_step || 0) + 1;

  // 3. 逐个创建BOM步骤
  const adoptedSteps: Array<{ id: number; name: string }> = [];

  for (const preset of presets) {
    const bomResult = await db.execute(sql`
      INSERT INTO process_bom_steps
      (process_instance_id, project_id, process_code, step_number, step_name,
       process_requirements, process_description, bom_item_reference,
       theoretical_hours, status, created_by)
      VALUES (${preset.process_instance_id}, ${preset.project_id}, ${preset.process_code},
              ${nextStep}, ${preset.step_name}, ${preset.process_requirements},
              ${preset.process_description}, ${preset.bom_item_reference},
              ${preset.theoretical_hours}, 'pending', ${userId})
    `);

    const bomStepId = (bomResult as any)[0]?.insertId;
    adoptedSteps.push({ id: bomStepId, name: preset.step_name });

    // 标记AI预设为已确认
    await db.execute(sql`
      UPDATE process_ai_preset_steps
      SET confirm_status = 'confirmed', confirmed_by = ${userId}, confirmed_at = NOW(), updated_at = NOW()
      WHERE id = ${preset.id}
    `);

    nextStep++;
  }

  return {
    success: true,
    adoptedCount: adoptedSteps.length,
    steps: adoptedSteps,
  };
}

// ============================================================
// 12. 物料-工步关联与备料校验 (Step Materials)
// ============================================================

export async function linkMaterialToStep(
  bomStepId: number,
  materialCode: string,
  materialName: string,
  requiredQty: number,
  unit: string
) {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO step_materials
    (bom_step_id, material_code, material_name, required_qty, unit)
    VALUES (${bomStepId}, ${materialCode}, ${materialName}, ${requiredQty}, ${unit || 'pcs'})
    RETURNING id
  `);
  return { id: (result as any).rows?.[0]?.id };
}

export async function getStepMaterials(bomStepId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM step_materials
    WHERE bom_step_id = ${bomStepId}
    ORDER BY id ASC
  `);
  return (result as any).rows || [];
}

export async function checkMaterialReadiness(bomStepId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM step_materials
    WHERE bom_step_id = ${bomStepId}
    ORDER BY id ASC
  `);
  const materials = (result as any).rows || [];
  const missing = materials.filter((m: any) => !m.is_ready || Number(m.available_qty) < Number(m.required_qty));
  return {
    ready: missing.length === 0 && materials.length > 0,
    missing: missing.map((m: any) => ({
      id: m.id,
      materialCode: m.material_code,
      materialName: m.material_name,
      requiredQty: Number(m.required_qty),
      availableQty: Number(m.available_qty),
      shortfall: Number(m.required_qty) - Number(m.available_qty),
    })),
  };
}

export async function updateMaterialAvailability(stepMaterialId: number, availableQty: number) {
  const db = await requireDb();

  // First get the required qty to determine readiness
  const existing = await db.execute(sql`
    SELECT required_qty FROM step_materials WHERE id = ${stepMaterialId}
  `);
  const row = (existing as any).rows?.[0];
  if (!row) return { error: "物料记录不存在" };

  const isReady = availableQty >= Number(row.required_qty);

  await db.execute(sql`
    UPDATE step_materials
    SET available_qty = ${availableQty}, is_ready = ${isReady}
    WHERE id = ${stepMaterialId}
  `);
  return { success: true, isReady };
}

// ============================================================
// 13. BOM步骤返工流程 (Step Rework)
// ============================================================

export async function triggerRework(stepId: number, userId: number, reason: string) {
  const db = await requireDb();

  // 1. Validate step exists and is in 'completed' status
  const stepResult = await db.execute(sql`
    SELECT * FROM process_bom_steps WHERE id = ${stepId}
  `);
  const step = (stepResult as any)[0]?.[0] ?? (stepResult as any).rows?.[0];
  if (!step) throw new Error("BOM步骤不存在");
  if (step.status !== 'completed') throw new Error("只有已完成的步骤才能发起返工");

  // 2. Get current rework count
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM step_rework_history WHERE bom_step_id = ${stepId}
  `);
  const countRow = (countResult as any)[0]?.[0] ?? (countResult as any).rows?.[0];
  const newReworkCount = Number(countRow?.cnt || 0) + 1;

  // 3. Change step status to 'rework'
  await db.execute(sql`
    UPDATE process_bom_steps
    SET status = 'rework', updated_at = NOW()
    WHERE id = ${stepId}
  `);

  // 4. Record rework history
  await db.execute(sql`
    INSERT INTO step_rework_history
    (bom_step_id, rework_count, reason, triggered_by)
    VALUES (${stepId}, ${newReworkCount}, ${reason}, ${userId})
  `);

  // 5. Return the updated step
  const updatedResult = await db.execute(sql`
    SELECT * FROM process_bom_steps WHERE id = ${stepId}
  `);
  const updatedStep = (updatedResult as any)[0]?.[0] ?? (updatedResult as any).rows?.[0];
  return updatedStep;
}

export async function getReworkHistory(stepId: number) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM step_rework_history
    WHERE bom_step_id = ${stepId}
    ORDER BY rework_count ASC
  `);
  return (result as any).rows || (result as any)[0] || [];
}
