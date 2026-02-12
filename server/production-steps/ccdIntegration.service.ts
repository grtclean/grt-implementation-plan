/**
 * v1.7.1 CCD检测与质量联动集成服务
 * CCD Integration Bridge Service
 * 
 * 功能：
 * 1. CCD检测结果自动触发质量联动（桥接层）
 * 2. CCD检测配置管理（阈值、自动触发开关、工序映射）
 * 3. CCD检测历史与质量联动关联查询
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import {
  triggerProcessLock,
  onQualityCheckCompleted,
  createQualityAlert,
} from "./qualityInterlock.service";

// ============================================================
// CCD检测工序映射配置
// ============================================================

/** CCD检测站点与工序的默认映射 */
const DEFAULT_CCD_PROCESS_MAP: Record<string, string> = {
  'CCD-T1': 'T1',  // 机加工CCD检测站
  'CCD-T3': 'T3',  // 机械部件装配CCD检测站
  'CCD-T5': 'T5',  // 机械总装CCD检测站
  'CCD-T7': 'T7',  // 设备调试CCD检测站
  'CCD-T10': 'T10', // 发货前CCD检测站
  'CCD-T14': 'T14', // 现场调试CCD检测站
};

/** 缺陷严重度映射（CCD检测分数 → 系统严重度） */
interface CcdSeverityThreshold {
  critical: number;  // 低于此分数为critical
  major: number;     // 低于此分数为major
  minor: number;     // 低于此分数为minor
}

const DEFAULT_SEVERITY_THRESHOLDS: CcdSeverityThreshold = {
  critical: 30,  // 检测分数 < 30 → critical
  major: 60,     // 检测分数 < 60 → major
  minor: 85,     // 检测分数 < 85 → minor
};

// ============================================================
// 1. CCD检测配置管理
// ============================================================

/** 获取CCD集成配置 */
export async function getCcdConfig(projectId?: string) {
  const db = await requireDb();
  
  if (projectId) {
    const rows = (await db.execute(sql`
      SELECT * FROM ccd_integration_config
      WHERE project_id = ${projectId} AND is_active = 1
      ORDER BY updated_at DESC LIMIT 1
    `)).rows;
    const config = (rows as any[])[0];
    if (config) return config;
  }

  // 返回全局默认配置
  const rows = (await db.execute(sql`
    SELECT * FROM ccd_integration_config
    WHERE project_id IS NULL AND is_active = 1
    ORDER BY updated_at DESC LIMIT 1
  `)).rows;
  const config = (rows as any[])[0];
  
  if (!config) {
    // 如果没有配置，返回默认值
    return {
      id: null,
      project_id: null,
      auto_trigger_enabled: 1,
      severity_threshold_critical: DEFAULT_SEVERITY_THRESHOLDS.critical,
      severity_threshold_major: DEFAULT_SEVERITY_THRESHOLDS.major,
      severity_threshold_minor: DEFAULT_SEVERITY_THRESHOLDS.minor,
      process_mapping: JSON.stringify(DEFAULT_CCD_PROCESS_MAP),
      auto_lock_on_critical: 1,
      auto_lock_on_major: 1,
      auto_notify_on_minor: 1,
      cooldown_minutes: 5,
      is_active: 1,
    };
  }
  
  return config;
}

/** 保存/更新CCD集成配置 */
export async function saveCcdConfig(params: {
  projectId?: string;
  autoTriggerEnabled?: boolean;
  severityThresholdCritical?: number;
  severityThresholdMajor?: number;
  severityThresholdMinor?: number;
  processMapping?: Record<string, string>;
  autoLockOnCritical?: boolean;
  autoLockOnMajor?: boolean;
  autoNotifyOnMinor?: boolean;
  cooldownMinutes?: number;
  updatedBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 检查是否已有配置
  const existing = (await db.execute(sql`
    SELECT id FROM ccd_integration_config
    WHERE project_id ${params.projectId ? sql`= ${params.projectId}` : sql`IS NULL`}
    LIMIT 1
  `)).rows;

  if ((existing as any[]).length > 0) {
    const configId = (existing as any[])[0].id;
    await db.execute(sql`
      UPDATE ccd_integration_config SET
        auto_trigger_enabled = ${params.autoTriggerEnabled !== false ? 1 : 0},
        severity_threshold_critical = ${params.severityThresholdCritical ?? DEFAULT_SEVERITY_THRESHOLDS.critical},
        severity_threshold_major = ${params.severityThresholdMajor ?? DEFAULT_SEVERITY_THRESHOLDS.major},
        severity_threshold_minor = ${params.severityThresholdMinor ?? DEFAULT_SEVERITY_THRESHOLDS.minor},
        process_mapping = ${JSON.stringify(params.processMapping || DEFAULT_CCD_PROCESS_MAP)},
        auto_lock_on_critical = ${params.autoLockOnCritical !== false ? 1 : 0},
        auto_lock_on_major = ${params.autoLockOnMajor !== false ? 1 : 0},
        auto_notify_on_minor = ${params.autoNotifyOnMinor !== false ? 1 : 0},
        cooldown_minutes = ${params.cooldownMinutes ?? 5},
        updated_by = ${params.updatedBy || null},
        updated_at = ${now}
      WHERE id = ${configId}
    `);
    return { id: configId, updated: true };
  } else {
    const result = (await db.execute(sql`
      INSERT INTO ccd_integration_config
      (project_id, auto_trigger_enabled,
       severity_threshold_critical, severity_threshold_major, severity_threshold_minor,
       process_mapping, auto_lock_on_critical, auto_lock_on_major, auto_notify_on_minor,
       cooldown_minutes, is_active, updated_by, created_at, updated_at)
      VALUES (${params.projectId || null}, ${params.autoTriggerEnabled !== false ? 1 : 0},
              ${params.severityThresholdCritical ?? DEFAULT_SEVERITY_THRESHOLDS.critical},
              ${params.severityThresholdMajor ?? DEFAULT_SEVERITY_THRESHOLDS.major},
              ${params.severityThresholdMinor ?? DEFAULT_SEVERITY_THRESHOLDS.minor},
              ${JSON.stringify(params.processMapping || DEFAULT_CCD_PROCESS_MAP)},
              ${params.autoLockOnCritical !== false ? 1 : 0},
              ${params.autoLockOnMajor !== false ? 1 : 0},
              ${params.autoNotifyOnMinor !== false ? 1 : 0},
              ${params.cooldownMinutes ?? 5}, 1,
              ${params.updatedBy || null}, ${now}, ${now})
    `)).rows;
    return { id: (result as any)[0]?.id, created: true };
  }
}

// ============================================================
// 2. CCD检测结果处理与质量联动桥接
// ============================================================

/** CCD检测结果数据结构 */
interface CcdDetectionResult {
  detectionId: string;        // CCD检测ID
  stationId: string;          // 检测站ID（如 CCD-T5）
  projectId: string;          // 项目ID
  partId?: string;            // 零部件ID
  partName?: string;          // 零部件名称
  overallScore: number;       // 总体检测分数 (0-100)
  defects: Array<{
    defectType: string;       // 缺陷类型（scratch, crack, deformation, contamination, misalignment）
    location: string;         // 缺陷位置
    confidence: number;       // 置信度 (0-1)
    area?: number;            // 缺陷面积 (mm²)
    description?: string;     // 缺陷描述
    imageUrl?: string;        // 缺陷图片URL
  }>;
  inspectedAt: number;        // 检测时间戳
  inspectorId?: string;       // 操作员ID
  equipmentId?: string;       // 设备ID
}

/** 
 * 核心桥接函数：处理CCD检测结果并触发质量联动
 * 当CCD检测完成后调用此函数，自动分析结果并触发相应的联动操作
 */
export async function onCcdDetectionResult(detection: CcdDetectionResult) {
  const db = await requireDb();
  const now = Date.now();
  
  // 1. 获取配置
  const config = await getCcdConfig(detection.projectId);
  
  // 2. 检查自动触发是否启用
  if (!config.auto_trigger_enabled) {
    return {
      processed: false,
      reason: 'CCD自动联动已关闭',
      detectionId: detection.detectionId,
    };
  }
  
  // 3. 解析工序映射
  let processMapping: Record<string, string>;
  try {
    processMapping = typeof config.process_mapping === 'string' 
      ? JSON.parse(config.process_mapping) 
      : config.process_mapping || DEFAULT_CCD_PROCESS_MAP;
  } catch {
    processMapping = DEFAULT_CCD_PROCESS_MAP;
  }
  
  const processCode = processMapping[detection.stationId];
  if (!processCode) {
    return {
      processed: false,
      reason: `未找到检测站 ${detection.stationId} 的工序映射`,
      detectionId: detection.detectionId,
    };
  }
  
  // 4. 冷却期检查（防止短时间内重复触发）
  const cooldownMs = (config.cooldown_minutes || 5) * 60 * 1000;
  const recentTriggers = (await db.execute(sql`
    SELECT id FROM ccd_detection_log
    WHERE project_id = ${detection.projectId}
      AND station_id = ${detection.stationId}
      AND triggered_interlock = 1
      AND detected_at > ${now - cooldownMs}
    LIMIT 1
  `)).rows;

  const inCooldown = (recentTriggers as any[]).length > 0;
  
  // 5. 确定缺陷严重度
  const thresholds: CcdSeverityThreshold = {
    critical: Number(config.severity_threshold_critical) || DEFAULT_SEVERITY_THRESHOLDS.critical,
    major: Number(config.severity_threshold_major) || DEFAULT_SEVERITY_THRESHOLDS.major,
    minor: Number(config.severity_threshold_minor) || DEFAULT_SEVERITY_THRESHOLDS.minor,
  };
  
  let severity: 'critical' | 'major' | 'minor' | 'pass';
  if (detection.overallScore < thresholds.critical) {
    severity = 'critical';
  } else if (detection.overallScore < thresholds.major) {
    severity = 'major';
  } else if (detection.overallScore < thresholds.minor) {
    severity = 'minor';
  } else {
    severity = 'pass';
  }
  
  // 6. 将CCD缺陷转换为系统缺陷格式
  const systemDefects = detection.defects.map((d, idx) => ({
    id: idx + 1,
    severity: d.confidence > 0.9 ? 'critical' : d.confidence > 0.7 ? 'major' : 'minor',
    description: `[CCD] ${d.defectType} - ${d.location}${d.description ? ': ' + d.description : ''} (置信度: ${(d.confidence * 100).toFixed(1)}%)`,
  }));
  
  // 7. 决定是否触发联动
  let triggeredInterlock = false;
  let interlockResult: any = null;
  
  if (!inCooldown) {
    if (severity === 'critical' && config.auto_lock_on_critical) {
      // 触发完整的质量联动（锁定后续工序）
      interlockResult = await onQualityCheckCompleted({
        projectId: detection.projectId,
        processCode,
        checkResultId: 0, // CCD自动检测无对应的检查记录ID
        result: 'fail',
        defects: systemDefects.map(d => ({ ...d, severity: 'critical' })),
        inspectorId: detection.inspectorId || 'CCD-AUTO',
      });
      triggeredInterlock = true;
    } else if (severity === 'major' && config.auto_lock_on_major) {
      interlockResult = await onQualityCheckCompleted({
        projectId: detection.projectId,
        processCode,
        checkResultId: 0,
        result: 'fail',
        defects: systemDefects.map(d => ({ ...d, severity: 'major' })),
        inspectorId: detection.inspectorId || 'CCD-AUTO',
      });
      triggeredInterlock = true;
    } else if (severity === 'minor' && config.auto_notify_on_minor) {
      // 仅发送通知，不锁定工序
      await createQualityAlert({
        projectId: detection.projectId,
        processCode,
        alertType: 'ccd_minor_defect',
        title: `CCD检测发现轻微缺陷 - ${processCode}`,
        message: `检测站 ${detection.stationId} 发现 ${detection.defects.length} 个轻微缺陷\n检测分数: ${detection.overallScore}\n请关注质量趋势。`,
        severity: 'low',
        recipientRole: 'quality_engineer',
      });
    }
  }
  
  // 8. 记录CCD检测日志
  const logResult = (await db.execute(sql`
    INSERT INTO ccd_detection_log
    (detection_id, station_id, project_id, process_code,
     part_id, part_name, overall_score, defect_count,
     severity, defect_details, triggered_interlock,
     interlock_result, in_cooldown, equipment_id,
     inspector_id, detected_at, created_at)
    VALUES (${detection.detectionId}, ${detection.stationId}, ${detection.projectId},
            ${processCode}, ${detection.partId || null}, ${detection.partName || null},
            ${detection.overallScore}, ${detection.defects.length},
            ${severity}, ${JSON.stringify(detection.defects)},
            ${triggeredInterlock ? 1 : 0},
            ${interlockResult ? JSON.stringify(interlockResult) : null},
            ${inCooldown ? 1 : 0}, ${detection.equipmentId || null},
            ${detection.inspectorId || null}, ${detection.inspectedAt || now}, ${now})
  `)).rows;

  return {
    processed: true,
    detectionId: detection.detectionId,
    stationId: detection.stationId,
    processCode,
    severity,
    overallScore: detection.overallScore,
    defectCount: detection.defects.length,
    triggeredInterlock,
    inCooldown,
    interlockResult,
    logId: (logResult as any)[0]?.id,
  };
}

// ============================================================
// 3. CCD检测日志查询
// ============================================================

/** 获取CCD检测日志列表 */
export async function getCcdDetectionLogs(options: {
  projectId?: string;
  stationId?: string;
  processCode?: string;
  severity?: string;
  triggeredOnly?: boolean;
  startTime?: number;
  endTime?: number;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options.limit || 50;
  
  // 基础查询
  if (options.projectId && options.triggeredOnly) {
    const rows = (await db.execute(sql`
      SELECT * FROM ccd_detection_log
      WHERE project_id = ${options.projectId} AND triggered_interlock = 1
      ORDER BY detected_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  if (options.projectId && options.severity) {
    const rows = (await db.execute(sql`
      SELECT * FROM ccd_detection_log
      WHERE project_id = ${options.projectId} AND severity = ${options.severity}
      ORDER BY detected_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  if (options.projectId && options.stationId) {
    const rows = (await db.execute(sql`
      SELECT * FROM ccd_detection_log
      WHERE project_id = ${options.projectId} AND station_id = ${options.stationId}
      ORDER BY detected_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  if (options.projectId) {
    const rows = (await db.execute(sql`
      SELECT * FROM ccd_detection_log
      WHERE project_id = ${options.projectId}
      ORDER BY detected_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  const rows = (await db.execute(sql`
    SELECT * FROM ccd_detection_log
    ORDER BY detected_at DESC
    LIMIT ${limit}
  `)).rows;
  return rows;
}

/** 获取CCD检测统计概览 */
export async function getCcdDetectionStats(projectId: string, timeRange?: { start: number; end: number }) {
  const db = await requireDb();
  
  let statsQuery;
  if (timeRange) {
    statsQuery = (await db.execute(sql`
      SELECT
        COUNT(*) as total_detections,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'major' THEN 1 ELSE 0 END) as major_count,
        SUM(CASE WHEN severity = 'minor' THEN 1 ELSE 0 END) as minor_count,
        SUM(CASE WHEN severity = 'pass' THEN 1 ELSE 0 END) as pass_count,
        AVG(overall_score) as avg_score,
        MIN(overall_score) as min_score,
        MAX(overall_score) as max_score,
        SUM(defect_count) as total_defects,
        SUM(CASE WHEN triggered_interlock = 1 THEN 1 ELSE 0 END) as interlock_triggers,
        SUM(CASE WHEN in_cooldown = 1 THEN 1 ELSE 0 END) as cooldown_skips
      FROM ccd_detection_log
      WHERE project_id = ${projectId}
        AND detected_at >= ${timeRange.start}
        AND detected_at <= ${timeRange.end}
    `)).rows;
  } else {
    statsQuery = (await db.execute(sql`
      SELECT
        COUNT(*) as total_detections,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'major' THEN 1 ELSE 0 END) as major_count,
        SUM(CASE WHEN severity = 'minor' THEN 1 ELSE 0 END) as minor_count,
        SUM(CASE WHEN severity = 'pass' THEN 1 ELSE 0 END) as pass_count,
        AVG(overall_score) as avg_score,
        MIN(overall_score) as min_score,
        MAX(overall_score) as max_score,
        SUM(defect_count) as total_defects,
        SUM(CASE WHEN triggered_interlock = 1 THEN 1 ELSE 0 END) as interlock_triggers,
        SUM(CASE WHEN in_cooldown = 1 THEN 1 ELSE 0 END) as cooldown_skips
      FROM ccd_detection_log
      WHERE project_id = ${projectId}
    `)).rows;
  }

  // 按检测站统计
  const stationStats = (await db.execute(sql`
    SELECT
      station_id, process_code,
      COUNT(*) as total,
      AVG(overall_score) as avg_score,
      SUM(CASE WHEN severity IN ('critical', 'major') THEN 1 ELSE 0 END) as serious_count
    FROM ccd_detection_log
    WHERE project_id = ${projectId}
    GROUP BY station_id, process_code
    ORDER BY station_id
  `)).rows;

  // 最近趋势（按天聚合）
  const trendData = (await db.execute(sql`
    SELECT
      DATE(FROM_UNIXTIME(detected_at / 1000)) as detection_date,
      COUNT(*) as total,
      AVG(overall_score) as avg_score,
      SUM(CASE WHEN severity IN ('critical', 'major') THEN 1 ELSE 0 END) as serious_count
    FROM ccd_detection_log
    WHERE project_id = ${projectId}
    GROUP BY DATE(FROM_UNIXTIME(detected_at / 1000))
    ORDER BY detection_date DESC
    LIMIT 30
  `)).rows;

  return {
    summary: (statsQuery as any[])[0] || {},
    byStation: stationStats as any[],
    trend: (trendData as any[]).reverse(),
  };
}

/** 获取CCD检测与质量联动的关联记录 */
export async function getCcdInterlockHistory(projectId: string, limit?: number) {
  const db = await requireDb();
  const queryLimit = limit || 20;
  
  const rows = (await db.execute(sql`
    SELECT
      cdl.*,
      qpl.locked_process_code,
      qpl.status as lock_status,
      qpl.lock_reason,
      qpl.approved_by,
      qpl.approved_at
    FROM ccd_detection_log cdl
    LEFT JOIN quality_process_locks qpl
      ON qpl.project_id = cdl.project_id
      AND qpl.trigger_process_code = cdl.process_code
      AND qpl.locked_at >= cdl.detected_at - 60000
      AND qpl.locked_at <= cdl.detected_at + 60000
    WHERE cdl.project_id = ${projectId}
      AND cdl.triggered_interlock = 1
    ORDER BY cdl.detected_at DESC
    LIMIT ${queryLimit}
  `)).rows;

  return rows;
}
