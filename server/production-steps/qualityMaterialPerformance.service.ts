/**
 * 质量检查、物料流转追踪、员工绩效排行榜服务
 * Quality Checkpoints, Material Flow Tracking, Worker Performance Leaderboard
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("qm-perf");

// ============================================================
// 类型定义
// ============================================================

// --- 质量检查 ---
export interface QualityCheckpoint {
  id?: number;
  projectId: string;
  processCode: string;
  bomStepId?: number;
  checkpointName: string;
  checkpointType: 'visual_inspection' | 'ccd_detection' | 'dimensional_check' | 'functional_test' | 'pressure_test' | 'cleanliness_test';
  description?: string;
  acceptanceCriteria?: string;
  isMandatory?: boolean;
  sortOrder?: number;
  createdBy?: string;
}

export interface QualityCheckResult {
  id?: number;
  checkpointId: number;
  projectId: string;
  processCode: string;
  inspectorId?: string;
  inspectorName?: string;
  result: 'pass' | 'fail' | 'conditional_pass' | 'pending';
  score?: number;
  ccdImageUrl?: string;
  ccdAnalysisData?: any;
  defectCount?: number;
  remarks?: string;
}

export interface QualityDefect {
  id?: number;
  checkResultId: number;
  projectId: string;
  processCode: string;
  defectType: 'dimensional' | 'surface' | 'functional' | 'assembly' | 'material' | 'cleanliness' | 'other';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  description: string;
  imageUrl?: string;
  rootCause?: string;
  correctiveAction?: string;
  assignedTo?: string;
}

// --- 物料流转 ---
export interface MaterialFlowRecord {
  id?: number;
  projectId: string;
  materialId: string;
  materialName: string;
  materialType: 'part' | 'component' | 'assembly' | 'raw_material' | 'consumable';
  fromProcess?: string;
  toProcess: string;
  quantity?: number;
  operatorId?: string;
  operatorName?: string;
  remarks?: string;
}

export interface MaterialLocation {
  materialId: string;
  projectId?: string;
  uwbTagId?: string;
  locationX?: number;
  locationY?: number;
  locationZ?: number;
  zoneName?: string;
  currentProcess?: string;
}

// --- 员工绩效 ---
export interface WorkerPerformanceQuery {
  periodType: 'daily' | 'weekly' | 'monthly';
  periodStart?: number;
  periodEnd?: number;
  projectId?: string;
  processCode?: string;
  limit?: number;
}

// ============================================================
// 1. 质量检查点管理
// ============================================================

/** 创建质量检查点 */
export async function createQualityCheckpoint(data: QualityCheckpoint) {
  const db = await requireDb();
  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO quality_checkpoints
    (project_id, process_code, bom_step_id, checkpoint_name, checkpoint_type,
     description, acceptance_criteria, is_mandatory, sort_order, created_by, created_at, updated_at)
    VALUES (${data.projectId}, ${data.processCode}, ${data.bomStepId || null},
            ${data.checkpointName}, ${data.checkpointType},
            ${data.description || null}, ${data.acceptanceCriteria || null},
            ${data.isMandatory !== false}, ${data.sortOrder || 0},
            ${data.createdBy || null}, ${now}, ${now})
  `) as any;
  return { id: (result.rows?.[0] ?? result).insertId ?? result.insertId, ...data, createdAt: now };
}

/** 获取项目工序的质量检查点列表 */
export async function getQualityCheckpoints(projectId: string, processCode?: string) {
  const db = await requireDb();
  if (processCode) {
    const rows = await db.execute(sql`
      SELECT * FROM quality_checkpoints
      WHERE project_id = ${projectId} AND process_code = ${processCode}
      ORDER BY sort_order ASC, created_at ASC
    `) as any;
    return rows.rows ?? rows;
  }
  const rows = await db.execute(sql`
    SELECT * FROM quality_checkpoints
    WHERE project_id = ${projectId}
    ORDER BY process_code ASC, sort_order ASC
  `) as any;
  return rows.rows ?? rows;
}

/** 更新质量检查点 */
export async function updateQualityCheckpoint(id: number, data: Partial<QualityCheckpoint>) {
  const db = await requireDb();
  const now = Date.now();
  await db.execute(sql`
    UPDATE quality_checkpoints SET
      checkpoint_name = COALESCE(${data.checkpointName || null}, checkpoint_name),
      checkpoint_type = COALESCE(${data.checkpointType || null}, checkpoint_type),
      description = COALESCE(${data.description || null}, description),
      acceptance_criteria = COALESCE(${data.acceptanceCriteria || null}, acceptance_criteria),
      is_mandatory = COALESCE(${data.isMandatory !== undefined ? data.isMandatory : null}, is_mandatory),
      sort_order = COALESCE(${data.sortOrder !== undefined ? data.sortOrder : null}, sort_order),
      updated_at = ${now}
    WHERE id = ${id}
  `);
  return { id, ...data, updatedAt: now };
}

/** 删除质量检查点 */
export async function deleteQualityCheckpoint(id: number) {
  const db = await requireDb();
  await db.execute(sql`DELETE FROM quality_checkpoints WHERE id = ${id}`);
  return { success: true };
}

// ============================================================
// 2. 质量检查结果管理
// ============================================================

/** 提交质量检查结果 */
export async function submitCheckResult(data: QualityCheckResult) {
  const db = await requireDb();
  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO quality_check_results
    (checkpoint_id, project_id, process_code, inspector_id, inspector_name,
     result, score, ccd_image_url, ccd_analysis_data, defect_count, remarks, checked_at, created_at)
    VALUES (${data.checkpointId}, ${data.projectId}, ${data.processCode},
            ${data.inspectorId || null}, ${data.inspectorName || null},
            ${data.result}, ${data.score || null}, ${data.ccdImageUrl || null},
            ${data.ccdAnalysisData ? JSON.stringify(data.ccdAnalysisData) : null},
            ${data.defectCount || 0}, ${data.remarks || null}, ${now}, ${now})
  `) as any;
  return { id: (result.rows?.[0] ?? result).insertId ?? result.insertId, ...data, checkedAt: now };
}

/** 获取检查结果列表 */
export async function getCheckResults(projectId: string, processCode?: string) {
  const db = await requireDb();
  if (processCode) {
    const rows = await db.execute(sql`
      SELECT r.*, c.checkpoint_name, c.checkpoint_type, c.acceptance_criteria
      FROM quality_check_results r
      JOIN quality_checkpoints c ON r.checkpoint_id = c.id
      WHERE r.project_id = ${projectId} AND r.process_code = ${processCode}
      ORDER BY r.created_at DESC
    `) as any;
    return rows.rows ?? rows;
  }
  const rows = await db.execute(sql`
    SELECT r.*, c.checkpoint_name, c.checkpoint_type, c.acceptance_criteria
    FROM quality_check_results r
    JOIN quality_checkpoints c ON r.checkpoint_id = c.id
    WHERE r.project_id = ${projectId}
    ORDER BY r.process_code ASC, r.created_at DESC
  `) as any;
  return rows.rows ?? rows;
}

/** AI分析CCD视觉检测结果 */
export async function analyzeCCDImage(imageUrl: string, checkpointName: string, acceptanceCriteria?: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个工业质量检测AI助手。分析CCD视觉检测图片，判断产品质量。
请基于检查点名称和验收标准进行分析。返回JSON格式：
{
  "overallResult": "pass" | "fail" | "conditional_pass",
  "score": 0-100,
  "defects": [{"type": "surface|dimensional|assembly|other", "severity": "critical|major|minor|cosmetic", "description": "...", "location": "..."}],
  "analysis": "详细分析说明",
  "recommendations": ["建议1", "建议2"]
}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: `检查点：${checkpointName}\n验收标准：${acceptanceCriteria || '标准检查'}\n请分析此CCD检测图片的质量状况。` },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ccd_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallResult: { type: "string", enum: ["pass", "fail", "conditional_pass"] },
              score: { type: "number" },
              defects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    severity: { type: "string" },
                    description: { type: "string" },
                    location: { type: "string" }
                  },
                  required: ["type", "severity", "description", "location"],
                  additionalProperties: false
                }
              },
              analysis: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } }
            },
            required: ["overallResult", "score", "defects", "analysis", "recommendations"],
            additionalProperties: false
          }
        }
      }
    });
    const content = response.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    log.error({ err: error }, "CCD analysis error");
    return null;
  }
}

// ============================================================
// 3. 质量缺陷管理
// ============================================================

/** 记录质量缺陷 */
export async function createQualityDefect(data: QualityDefect) {
  const db = await requireDb();
  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO quality_defects
    (check_result_id, project_id, process_code, defect_type, severity,
     description, image_url, root_cause, corrective_action, assigned_to,
     status, created_at, updated_at)
    VALUES (${data.checkResultId}, ${data.projectId}, ${data.processCode},
            ${data.defectType}, ${data.severity}, ${data.description},
            ${data.imageUrl || null}, ${data.rootCause || null},
            ${data.correctiveAction || null}, ${data.assignedTo || null},
            'open', ${now}, ${now})
  `) as any;
  return { id: (result.rows?.[0] ?? result).insertId ?? result.insertId, ...data, status: 'open', createdAt: now };
}

/** 获取缺陷列表 */
export async function getQualityDefects(projectId: string, processCode?: string, status?: string) {
  const db = await requireDb();
  let queryResult: any;
  if (processCode && status) {
    queryResult = await db.execute(sql`
      SELECT * FROM quality_defects
      WHERE project_id = ${projectId} AND process_code = ${processCode} AND status = ${status}
      ORDER BY FIELD(severity, 'critical', 'major', 'minor', 'cosmetic'), created_at DESC
    `) as any;
  } else if (processCode) {
    queryResult = await db.execute(sql`
      SELECT * FROM quality_defects
      WHERE project_id = ${projectId} AND process_code = ${processCode}
      ORDER BY FIELD(severity, 'critical', 'major', 'minor', 'cosmetic'), created_at DESC
    `) as any;
  } else {
    queryResult = await db.execute(sql`
      SELECT * FROM quality_defects
      WHERE project_id = ${projectId}
      ORDER BY FIELD(severity, 'critical', 'major', 'minor', 'cosmetic'), created_at DESC
    `) as any;
  }
  return queryResult.rows ?? queryResult;
}

/** 更新缺陷状态 */
export async function updateDefectStatus(id: number, status: string, rootCause?: string, correctiveAction?: string) {
  const db = await requireDb();
  const now = Date.now();
  const resolvedAt = (status === 'resolved' || status === 'closed') ? now : null;
  await db.execute(sql`
    UPDATE quality_defects SET
      status = ${status},
      root_cause = COALESCE(${rootCause || null}, root_cause),
      corrective_action = COALESCE(${correctiveAction || null}, corrective_action),
      resolved_at = COALESCE(${resolvedAt}, resolved_at),
      updated_at = ${now}
    WHERE id = ${id}
  `);
  return { id, status, updatedAt: now };
}

/** 质量统计仪表盘数据 */
export async function getQualityDashboardStats(projectId: string) {
  const db = await requireDb();

  // 检查结果统计
  const resultStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as pass_count,
      SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as fail_count,
      SUM(CASE WHEN result = 'conditional_pass' THEN 1 ELSE 0 END) as conditional_count,
      SUM(CASE WHEN result = 'pending' THEN 1 ELSE 0 END) as pending_count,
      AVG(score) as avg_score
    FROM quality_check_results WHERE project_id = ${projectId}
  `) as any;

  // 缺陷统计
  const defectStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_defects,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
      SUM(CASE WHEN severity = 'major' THEN 1 ELSE 0 END) as major_count,
      SUM(CASE WHEN severity = 'minor' THEN 1 ELSE 0 END) as minor_count,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved_count
    FROM quality_defects WHERE project_id = ${projectId}
  `) as any;

  // 按工序统计合格率
  const processStats = await db.execute(sql`
    SELECT
      process_code,
      COUNT(*) as total,
      SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
      ROUND(SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as pass_rate
    FROM quality_check_results
    WHERE project_id = ${projectId}
    GROUP BY process_code
    ORDER BY process_code
  `) as any;

  // 缺陷类型分布
  const defectTypeDistribution = await db.execute(sql`
    SELECT defect_type, COUNT(*) as count
    FROM quality_defects WHERE project_id = ${projectId}
    GROUP BY defect_type ORDER BY count DESC
  `) as any;

  const resultStatsRows = resultStats.rows ?? resultStats;
  const defectStatsRows = defectStats.rows ?? defectStats;
  const processStatsRows = processStats.rows ?? processStats;
  const defectTypeRows = defectTypeDistribution.rows ?? defectTypeDistribution;

  return {
    results: (resultStatsRows as any[])[0] || {},
    defects: (defectStatsRows as any[])[0] || {},
    processPassRates: processStatsRows as any[],
    defectTypeDistribution: defectTypeRows as any[],
  };
}

// ============================================================
// 4. 物料流转追踪
// ============================================================

/** 记录物料流转 */
export async function createMaterialFlow(data: MaterialFlowRecord) {
  const db = await requireDb();
  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO material_flow_records
    (project_id, material_id, material_name, material_type, from_process, to_process,
     quantity, status, operator_id, operator_name, transit_start_time, remarks, created_at)
    VALUES (${data.projectId}, ${data.materialId}, ${data.materialName}, ${data.materialType},
            ${data.fromProcess || null}, ${data.toProcess}, ${data.quantity || 1},
            'in_transit', ${data.operatorId || null}, ${data.operatorName || null},
            ${now}, ${data.remarks || null}, ${now})
  `) as any;
  return { id: (result.rows?.[0] ?? result).insertId ?? result.insertId, ...data, status: 'in_transit', transitStartTime: now };
}

/** 更新物料流转状态 */
export async function updateMaterialFlowStatus(id: number, status: string) {
  const db = await requireDb();
  const now = Date.now();

  if (status === 'arrived' || status === 'completed') {
    // 计算流转耗时
    const existing = await db.execute(sql`
      SELECT transit_start_time FROM material_flow_records WHERE id = ${id}
    `) as any;
    const existingRows = existing.rows ?? existing;
    const record = (existingRows as any[])[0];
    const duration = record ? (now - Number(record.transit_start_time)) / 60000 : 0;

    await db.execute(sql`
      UPDATE material_flow_records SET
        status = ${status},
        transit_end_time = ${now},
        transit_duration_minutes = ${Math.round(duration * 100) / 100}
      WHERE id = ${id}
    `);
  } else {
    await db.execute(sql`
      UPDATE material_flow_records SET status = ${status} WHERE id = ${id}
    `);
  }
  return { id, status, updatedAt: now };
}

/** 获取项目物料流转记录 */
export async function getMaterialFlowRecords(projectId: string, processCode?: string) {
  const db = await requireDb();
  if (processCode) {
    const rows = await db.execute(sql`
      SELECT * FROM material_flow_records
      WHERE project_id = ${projectId} AND (from_process = ${processCode} OR to_process = ${processCode})
      ORDER BY created_at DESC
    `) as any;
    return rows.rows ?? rows;
  }
  const rows = await db.execute(sql`
    SELECT * FROM material_flow_records
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `) as any;
  return rows.rows ?? rows;
}

/** 更新物料UWB位置 */
export async function updateMaterialLocation(data: MaterialLocation) {
  const db = await requireDb();
  const now = Date.now();

  // Upsert: 如果存在则更新，否则插入
  const existing = await db.execute(sql`
    SELECT id FROM material_locations WHERE material_id = ${data.materialId} LIMIT 1
  `) as any;
  const existingRows = existing.rows ?? existing;

  if ((existingRows as any[]).length > 0) {
    await db.execute(sql`
      UPDATE material_locations SET
        project_id = COALESCE(${data.projectId || null}, project_id),
        uwb_tag_id = COALESCE(${data.uwbTagId || null}, uwb_tag_id),
        location_x = COALESCE(${data.locationX ?? null}, location_x),
        location_y = COALESCE(${data.locationY ?? null}, location_y),
        location_z = COALESCE(${data.locationZ ?? null}, location_z),
        zone_name = COALESCE(${data.zoneName || null}, zone_name),
        current_process = COALESCE(${data.currentProcess || null}, current_process),
        last_movement_time = ${now},
        is_stationary = FALSE,
        stationary_duration_minutes = 0,
        updated_at = ${now}
      WHERE material_id = ${data.materialId}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO material_locations
      (material_id, project_id, uwb_tag_id, location_x, location_y, location_z,
       zone_name, current_process, last_movement_time, is_stationary, stationary_duration_minutes, updated_at)
      VALUES (${data.materialId}, ${data.projectId || null}, ${data.uwbTagId || null},
              ${data.locationX ?? null}, ${data.locationY ?? null}, ${data.locationZ ?? null},
              ${data.zoneName || null}, ${data.currentProcess || null}, ${now}, FALSE, 0, ${now})
    `);
  }
  return { ...data, updatedAt: now };
}

/** 获取物料实时位置 */
export async function getMaterialLocations(projectId?: string) {
  const db = await requireDb();
  if (projectId) {
    const rows = await db.execute(sql`
      SELECT * FROM material_locations WHERE project_id = ${projectId} ORDER BY updated_at DESC
    `) as any;
    return rows.rows ?? rows;
  }
  const rows = await db.execute(sql`
    SELECT * FROM material_locations ORDER BY updated_at DESC
  `) as any;
  return rows.rows ?? rows;
}

/** 物料流转统计（T1-T15工序间流转图数据） */
export async function getMaterialFlowStats(projectId: string) {
  const db = await requireDb();

  // 工序间流转量统计
  const flowStats = await db.execute(sql`
    SELECT
      from_process, to_process,
      COUNT(*) as flow_count,
      AVG(transit_duration_minutes) as avg_duration,
      SUM(quantity) as total_quantity
    FROM material_flow_records
    WHERE project_id = ${projectId} AND from_process IS NOT NULL
    GROUP BY from_process, to_process
    ORDER BY from_process, to_process
  `) as any;

  // 各工序物料状态统计
  const processStats = await db.execute(sql`
    SELECT
      to_process as process_code,
      COUNT(*) as total_materials,
      SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
      SUM(CASE WHEN status = 'arrived' THEN 1 ELSE 0 END) as arrived,
      SUM(CASE WHEN status = 'in_process' THEN 1 ELSE 0 END) as in_process,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM material_flow_records
    WHERE project_id = ${projectId}
    GROUP BY to_process ORDER BY to_process
  `) as any;

  // 静止物料（潜在瓶颈）
  const stationaryMaterials = await db.execute(sql`
    SELECT * FROM material_locations
    WHERE project_id = ${projectId} AND is_stationary = TRUE AND stationary_duration_minutes > 30
    ORDER BY stationary_duration_minutes DESC
  `) as any;

  return {
    flowBetweenProcesses: (flowStats.rows ?? flowStats) as any[],
    processStatus: (processStats.rows ?? processStats) as any[],
    stationaryAlerts: (stationaryMaterials.rows ?? stationaryMaterials) as any[],
  };
}

// ============================================================
// 5. 生产瓶颈分析
// ============================================================

/** 自动检测生产瓶颈 */
export async function detectBottlenecks(projectId: string) {
  const db = await requireDb();
  const now = Date.now();
  const detectedBottlenecks: any[] = [];

  // 1. 时间延迟瓶颈：平均流转时间超过60分钟的工序
  const timeDelaysResult = await db.execute(sql`
    SELECT
      to_process as process_code,
      AVG(transit_duration_minutes) as avg_delay,
      COUNT(*) as affected_count
    FROM material_flow_records
    WHERE project_id = ${projectId} AND transit_duration_minutes > 60
    GROUP BY to_process
    HAVING AVG(transit_duration_minutes) > 60
  `) as any;
  const timeDelays = (timeDelaysResult.rows ?? timeDelaysResult) as any[];

  for (const delay of timeDelays) {
    const severity = delay.avg_delay > 240 ? 'critical' : delay.avg_delay > 120 ? 'high' : 'medium';
    detectedBottlenecks.push({
      processCode: delay.process_code,
      type: 'time_delay',
      severity,
      avgDelay: delay.avg_delay,
      affected: delay.affected_count,
      description: `工序${delay.process_code}平均物料流转耗时${Math.round(delay.avg_delay)}分钟，超出标准阈值`,
    });
  }

  // 2. 物料等待瓶颈：静止超过2小时的物料
  const materialWaitsResult = await db.execute(sql`
    SELECT current_process as process_code, COUNT(*) as waiting_count
    FROM material_locations
    WHERE project_id = ${projectId} AND is_stationary = TRUE AND stationary_duration_minutes > 120
    GROUP BY current_process
  `) as any;
  const materialWaits = (materialWaitsResult.rows ?? materialWaitsResult) as any[];

  for (const wait of materialWaits) {
    detectedBottlenecks.push({
      processCode: wait.process_code,
      type: 'material_wait',
      severity: wait.waiting_count > 5 ? 'high' : 'medium',
      affected: wait.waiting_count,
      description: `工序${wait.process_code}有${wait.waiting_count}个物料等待超过2小时`,
    });
  }

  // 3. 质量返工瓶颈：不合格率超过10%的工序
  const qualityIssuesResult = await db.execute(sql`
    SELECT
      process_code,
      COUNT(*) as total_checks,
      SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as fail_count,
      ROUND(SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as fail_rate
    FROM quality_check_results
    WHERE project_id = ${projectId}
    GROUP BY process_code
    HAVING fail_rate > 10
  `) as any;
  const qualityIssues = (qualityIssuesResult.rows ?? qualityIssuesResult) as any[];

  for (const issue of qualityIssues) {
    detectedBottlenecks.push({
      processCode: issue.process_code,
      type: 'quality_rework',
      severity: issue.fail_rate > 30 ? 'critical' : issue.fail_rate > 20 ? 'high' : 'medium',
      affected: issue.fail_count,
      description: `工序${issue.process_code}质量不合格率${issue.fail_rate}%，需要返工`,
    });
  }

  // 保存检测到的瓶颈
  for (const bn of detectedBottlenecks) {
    await db.execute(sql`
      INSERT INTO production_bottlenecks
      (project_id, process_code, bottleneck_type, severity, avg_delay_minutes,
       affected_materials, description, status, detected_at, created_at)
      VALUES (${projectId}, ${bn.processCode}, ${bn.type}, ${bn.severity},
              ${bn.avgDelay || null}, ${bn.affected || 0}, ${bn.description},
              'detected', ${now}, ${now})
    `);
  }

  // AI生成改善建议
  if (detectedBottlenecks.length > 0) {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个工业生产优化专家。分析生产瓶颈并给出改善建议。返回JSON格式：{\"suggestions\": [{\"processCode\": \"T1\", \"suggestion\": \"...\", \"priority\": \"high|medium|low\"}]}"
          },
          {
            role: "user",
            content: `以下是检测到的生产瓶颈：\n${JSON.stringify(detectedBottlenecks, null, 2)}\n请给出改善建议。`
          }
        ]
      });
      const content = response.choices?.[0]?.message?.content;
      if (content) {
        const suggestions = JSON.parse(content);
        // 更新瓶颈记录的建议
        for (const s of suggestions.suggestions || []) {
          await db.execute(sql`
            UPDATE production_bottlenecks SET suggestion = ${s.suggestion}
            WHERE project_id = ${projectId} AND process_code = ${s.processCode} AND status = 'detected'
            ORDER BY created_at DESC LIMIT 1
          `);
        }
      }
    } catch (e) {
      log.error({ err: e }, "Error generating bottleneck suggestions");
    }
  }

  return { detected: detectedBottlenecks.length, bottlenecks: detectedBottlenecks };
}

/** 获取瓶颈列表 */
export async function getBottlenecks(projectId: string, status?: string) {
  const db = await requireDb();
  if (status) {
    const rows = await db.execute(sql`
      SELECT * FROM production_bottlenecks
      WHERE project_id = ${projectId} AND status = ${status}
      ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low'), detected_at DESC
    `) as any;
    return rows.rows ?? rows;
  }
  const rows = await db.execute(sql`
    SELECT * FROM production_bottlenecks
    WHERE project_id = ${projectId}
    ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low'), detected_at DESC
  `) as any;
  return rows.rows ?? rows;
}

/** 更新瓶颈状态 */
export async function updateBottleneckStatus(id: number, status: string) {
  const db = await requireDb();
  const now = Date.now();
  const resolvedAt = status === 'resolved' ? now : null;
  await db.execute(sql`
    UPDATE production_bottlenecks SET
      status = ${status},
      resolved_at = COALESCE(${resolvedAt}, resolved_at)
    WHERE id = ${id}
  `);
  return { id, status };
}

// ============================================================
// 6. 员工绩效排行榜
// ============================================================

/** 计算并更新员工绩效 */
export async function calculateWorkerPerformance(workerId: string, workerName: string, periodType: 'daily' | 'weekly' | 'monthly', periodStart: number, periodEnd: number) {
  const db = await requireDb();
  const now = Date.now();

  // 获取工时记录
  const timeRecordsResult = await db.execute(sql`
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN end_time IS NOT NULL THEN 1 ELSE 0 END) as completed_tasks,
      SUM(theoretical_hours) as theoretical_hours,
      SUM(actual_hours) as actual_hours
    FROM work_time_records
    WHERE worker_id = ${workerId}
      AND start_time >= ${periodStart} AND start_time <= ${periodEnd}
  `) as any;
  const timeRecords = (timeRecordsResult.rows ?? timeRecordsResult) as any[];

  // 获取质量记录
  const qualityRecordsResult = await db.execute(sql`
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as pass_count,
      SUM(defect_count) as total_defects
    FROM quality_check_results
    WHERE inspector_id = ${workerId}
      AND created_at >= ${periodStart} AND created_at <= ${periodEnd}
  `) as any;
  const qualityRecords = (qualityRecordsResult.rows ?? qualityRecordsResult) as any[];

  const timeData = timeRecords[0] || {};
  const qualityData = qualityRecords[0] || {};

  const totalTasks = Number(timeData.total_tasks) || 0;
  const completedTasks = Number(timeData.completed_tasks) || 0;
  const theoreticalHours = Number(timeData.theoretical_hours) || 0;
  const actualHours = Number(timeData.actual_hours) || 0;
  const totalChecks = Number(qualityData.total_checks) || 0;
  const passCount = Number(qualityData.pass_count) || 0;
  const defectCount = Number(qualityData.total_defects) || 0;

  // 计算效率率
  const efficiencyRate = actualHours > 0 ? Math.min((theoreticalHours / actualHours) * 100, 150) : 0;
  // 质量合格率
  const qualityPassRate = totalChecks > 0 ? (passCount / totalChecks) * 100 : 100;
  // 准时完成率
  const onTimeRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  // 综合评分 = 效率(40%) + 质量(35%) + 完成率(25%)
  const overallScore = Math.round((efficiencyRate * 0.4 + qualityPassRate * 0.35 + onTimeRate * 0.25) * 100) / 100;

  // 插入或更新绩效记录
  const existingResult = await db.execute(sql`
    SELECT id FROM worker_performance_records
    WHERE worker_id = ${workerId} AND period_type = ${periodType}
      AND period_start = ${periodStart} AND period_end = ${periodEnd}
    LIMIT 1
  `) as any;
  const existing = (existingResult.rows ?? existingResult) as any[];

  if (existing.length > 0) {
    const existingId = existing[0].id;
    await db.execute(sql`
      UPDATE worker_performance_records SET
        total_tasks = ${totalTasks}, completed_tasks = ${completedTasks},
        theoretical_hours = ${theoreticalHours}, actual_hours = ${actualHours},
        efficiency_rate = ${efficiencyRate}, quality_pass_rate = ${qualityPassRate},
        defect_count = ${defectCount}, on_time_rate = ${onTimeRate},
        overall_score = ${overallScore}, updated_at = ${now}
      WHERE id = ${existingId}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO worker_performance_records
      (worker_id, worker_name, period_type, period_start, period_end,
       total_tasks, completed_tasks, theoretical_hours, actual_hours,
       efficiency_rate, quality_pass_rate, defect_count, on_time_rate,
       overall_score, created_at, updated_at)
      VALUES (${workerId}, ${workerName}, ${periodType}, ${periodStart}, ${periodEnd},
              ${totalTasks}, ${completedTasks}, ${theoreticalHours}, ${actualHours},
              ${efficiencyRate}, ${qualityPassRate}, ${defectCount}, ${onTimeRate},
              ${overallScore}, ${now}, ${now})
    `);
  }

  return {
    workerId, workerName, periodType,
    totalTasks, completedTasks, theoreticalHours, actualHours,
    efficiencyRate: Math.round(efficiencyRate * 10) / 10,
    qualityPassRate: Math.round(qualityPassRate * 10) / 10,
    onTimeRate: Math.round(onTimeRate * 10) / 10,
    overallScore,
  };
}

/** 获取绩效排行榜 */
export async function getPerformanceLeaderboard(query: WorkerPerformanceQuery) {
  const db = await requireDb();
  const limit = query.limit || 20;

  let rowsResult: any;
  if (query.periodStart && query.periodEnd) {
    rowsResult = await db.execute(sql`
      SELECT * FROM worker_performance_records
      WHERE period_type = ${query.periodType}
        AND period_start >= ${query.periodStart} AND period_end <= ${query.periodEnd}
      ORDER BY overall_score DESC
      LIMIT ${limit}
    `) as any;
  } else {
    // 获取最新一个周期的排行
    rowsResult = await db.execute(sql`
      SELECT * FROM worker_performance_records
      WHERE period_type = ${query.periodType}
      ORDER BY period_start DESC, overall_score DESC
      LIMIT ${limit}
    `) as any;
  }

  const rows = (rowsResult.rows ?? rowsResult) as any[];

  // 添加排名
  const ranked = rows.map((row: any, index: number) => ({
    ...row,
    rank: index + 1,
  }));

  return ranked;
}

/** 获取员工绩效趋势 */
export async function getWorkerPerformanceTrend(workerId: string, periodType: 'daily' | 'weekly' | 'monthly', limit?: number) {
  const db = await requireDb();
  const rowsResult = await db.execute(sql`
    SELECT * FROM worker_performance_records
    WHERE worker_id = ${workerId} AND period_type = ${periodType}
    ORDER BY period_start DESC
    LIMIT ${limit || 12}
  `) as any;
  const rows = (rowsResult.rows ?? rowsResult) as any[];
  return rows.reverse(); // 按时间正序返回
}

/** 获取团队绩效对比 */
export async function getTeamPerformanceComparison(periodType: 'daily' | 'weekly' | 'monthly', periodStart: number, periodEnd: number) {
  const db = await requireDb();
  const rowsResult = await db.execute(sql`
    SELECT
      worker_id, worker_name,
      AVG(efficiency_rate) as avg_efficiency,
      AVG(quality_pass_rate) as avg_quality,
      AVG(on_time_rate) as avg_on_time,
      AVG(overall_score) as avg_score,
      SUM(completed_tasks) as total_completed,
      SUM(actual_hours) as total_hours
    FROM worker_performance_records
    WHERE period_type = ${periodType}
      AND period_start >= ${periodStart} AND period_end <= ${periodEnd}
    GROUP BY worker_id, worker_name
    ORDER BY avg_score DESC
  `) as any;
  return rowsResult.rows ?? rowsResult;
}
