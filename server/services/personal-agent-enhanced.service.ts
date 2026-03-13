/**
 * 个人智能体增强功能服务
 * 功能：行为探针数据采集、技能推断引擎
 */

import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("personal-agent");

// ==================== 行为探针数据采集 ====================

/**
 * 行为探针类型定义
 */
export interface BehaviorProbe {
  probeId: string;
  userId: number;
  probeType: ProbeType;
  eventData: any;
  timestamp: string;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
}

export type ProbeType =
  | "page_view"
  | "click"
  | "scroll"
  | "input"
  | "api_call"
  | "task_start"
  | "task_complete"
  | "error"
  | "search"
  | "file_operation"
  | "collaboration"
  | "learning"
  | "custom";

export interface DeviceInfo {
  userAgent?: string;
  screenSize?: string;
  timezone?: string;
  language?: string;
}

/**
 * 行为探针采集服务
 */
export class BehaviorProbeCollector {
  /**
   * 记录行为事件
   */
  static async recordEvent(probe: BehaviorProbe): Promise<{ id: number }> {
    const db: any = await requireDb();

    const [result] = await db.execute(
      `INSERT INTO behavior_probes 
       (probe_id, user_id, probe_type, event_data, session_id, device_info, event_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        probe.probeId,
        probe.userId,
        probe.probeType,
        JSON.stringify(probe.eventData),
        probe.sessionId || null,
        probe.deviceInfo ? JSON.stringify(probe.deviceInfo) : null,
        probe.timestamp,
      ]
    );

    return { id: (result as any).insertId };
  }

  /**
   * 批量记录行为事件
   */
  static async recordBatch(probes: BehaviorProbe[]): Promise<{ count: number }> {
    const db: any = await requireDb();
    let count = 0;

    for (const probe of probes) {
      try {
        await this.recordEvent(probe);
        count++;
      } catch (error) {
        log.error({ err: error }, "记录行为事件失败");
      }
    }

    return { count };
  }

  /**
   * 获取用户行为统计
   */
  static async getUserBehaviorStats(
    userId: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<BehaviorStats> {
    const db: any = await requireDb();

    let query = `SELECT 
      probe_type,
      COUNT(*) as count,
      DATE(event_time) as date
    FROM behavior_probes
    WHERE user_id = ?`;
    const params: any[] = [userId];

    if (dateFrom) {
      query += ` AND event_time >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND event_time <= ?`;
      params.push(dateTo);
    }

    query += ` GROUP BY probe_type, DATE(event_time) ORDER BY date DESC`;

    const [rows] = await db.execute(query, params);
    const data = rows as any[];

    // 按类型聚合
    const byType: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    for (const row of data) {
      byType[row.probe_type] = (byType[row.probe_type] || 0) + row.count;
      byDate[row.date] = (byDate[row.date] || 0) + row.count;
    }

    // 计算活跃度分数
    const totalEvents = Object.values(byType).reduce((a, b) => a + b, 0);
    const uniqueDays = Object.keys(byDate).length;
    const activityScore = Math.min(
      100,
      Math.round((totalEvents / 100) * 30 + uniqueDays * 5)
    );

    return {
      totalEvents,
      uniqueDays,
      activityScore,
      byType,
      byDate,
      topActivities: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
    };
  }

  /**
   * 获取用户行为模式
   */
  static async analyzeBehaviorPatterns(userId: number): Promise<BehaviorPattern[]> {
    const db: any = await requireDb();

    // 获取最近30天的行为数据
    const [rows] = await db.execute(
      `SELECT probe_type, event_data, event_time, EXTRACT(HOUR FROM event_time) as hour
       FROM behavior_probes
       WHERE user_id = ? AND event_time >= NOW() - INTERVAL '30 days'
       ORDER BY event_time DESC
       LIMIT 1000`,
      [userId]
    );
    const events = rows as any[];

    if (events.length === 0) {
      return [];
    }

    // 分析时间模式
    const hourCounts: Record<number, number> = {};
    for (const event of events) {
      hourCounts[event.hour] = (hourCounts[event.hour] || 0) + 1;
    }

    // 找出高峰时段
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // 分析行为序列
    const patterns: BehaviorPattern[] = [];

    // 时间模式
    patterns.push({
      type: "time_preference",
      name: "活跃时段偏好",
      description: `用户主要在 ${peakHours.map((h) => `${h}:00`).join(", ")} 时段活跃`,
      confidence: 80,
      data: { peakHours, hourDistribution: hourCounts },
    });

    // 功能使用模式
    const typeCounts: Record<string, number> = {};
    for (const event of events) {
      typeCounts[event.probe_type] = (typeCounts[event.probe_type] || 0) + 1;
    }

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    patterns.push({
      type: "feature_usage",
      name: "功能使用偏好",
      description: `用户最常使用的功能: ${topTypes.map(([t]) => t).join(", ")}`,
      confidence: 85,
      data: { typeDistribution: typeCounts, topTypes },
    });

    return patterns;
  }
}

// ==================== 技能推断引擎 ====================

/**
 * 技能推断引擎
 * 基于行为数据推断用户技能水平
 */
export class SkillInferenceEngine {
  /**
   * 推断用户技能
   */
  static async inferSkills(userId: number): Promise<InferredSkill[]> {
    const db: any = await requireDb();

    // 获取用户行为数据
    const [behaviorRows] = await db.execute(
      `SELECT probe_type, event_data, COUNT(*) as count
       FROM behavior_probes
       WHERE user_id = ? AND event_time >= NOW() - INTERVAL '90 days'
       GROUP BY probe_type, event_data->>'category'`,
      [userId]
    );
    const behaviors = behaviorRows as any[];

    // 获取用户任务完成记录
    const [taskRows] = await db.execute(
      `SELECT task_type, COUNT(*) as completed, AVG(quality_score) as avg_quality
       FROM task_completions
       WHERE user_id = ? AND completed_at >= NOW() - INTERVAL '90 days'
       GROUP BY task_type`,
      [userId]
    );
    const tasks = taskRows as any[];

    // 获取用户学习记录
    const [learningRows] = await db.execute(
      `SELECT course_category, COUNT(*) as courses, AVG(score) as avg_score
       FROM learning_records
       WHERE user_id = ? AND completed_at >= NOW() - INTERVAL '180 days'
       GROUP BY course_category`,
      [userId]
    );
    const learning = learningRows as any[];

    // 使用AI推断技能
    const inferredSkills = await this.aiInferSkills(behaviors, tasks, learning);

    // 保存推断结果
    for (const skill of inferredSkills) {
      await db.execute(
        `INSERT INTO inferred_skills 
         (user_id, skill_name, skill_domain, inferred_level, confidence, evidence)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         inferred_level = VALUES(inferred_level),
         confidence = VALUES(confidence),
         evidence = VALUES(evidence),
         updated_at = NOW()`,
        [
          userId,
          skill.name,
          skill.domain,
          skill.level,
          skill.confidence,
          JSON.stringify(skill.evidence),
        ]
      );
    }

    return inferredSkills;
  }

  /**
   * 使用AI推断技能
   */
  private static async aiInferSkills(
    behaviors: any[],
    tasks: any[],
    learning: any[]
  ): Promise<InferredSkill[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个技能评估专家。根据用户的行为数据、任务完成记录和学习记录，推断用户的技能水平。
输出JSON格式：
{
  "skills": [
    {
      "name": "技能名称",
      "domain": "T/S/D/C/K/L",
      "level": 1-5,
      "confidence": 0-100,
      "evidence": ["证据1", "证据2"]
    }
  ]
}

技能领域说明：
- T: 技术技能
- S: 软技能
- D: 设计技能
- C: 沟通技能
- K: 知识技能
- L: 领导力技能`,
          },
          {
            role: "user",
            content: `用户行为数据：
${JSON.stringify(behaviors.slice(0, 20), null, 2)}

任务完成记录：
${JSON.stringify(tasks, null, 2)}

学习记录：
${JSON.stringify(learning, null, 2)}

请推断用户的技能水平。`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "skill_inference",
            strict: true,
            schema: {
              type: "object",
              properties: {
                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      domain: { type: "string" },
                      level: { type: "number" },
                      confidence: { type: "number" },
                      evidence: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "domain", "level", "confidence", "evidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["skills"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.skills || [];
    } catch (error) {
      log.error({ err: error }, "AI技能推断失败");
      return [];
    }
  }

  /**
   * 获取用户技能画像
   */
  static async getSkillProfile(userId: number): Promise<SkillProfile> {
    const db: any = await requireDb();

    // 获取推断的技能
    const [skillRows] = await db.execute(
      `SELECT * FROM inferred_skills WHERE user_id = ? ORDER BY inferred_level DESC`,
      [userId]
    );
    const skills = skillRows as any[];

    // 获取已认证的技能
    const [certifiedRows] = await db.execute(
      `SELECT * FROM skill_capsules WHERE owner_id = ? AND is_active = 1`,
      [userId]
    );
    const certified = certifiedRows as any[];

    // 计算技能分布
    const domainDistribution: Record<string, number> = {};
    for (const skill of skills) {
      domainDistribution[skill.skill_domain] =
        (domainDistribution[skill.skill_domain] || 0) + 1;
    }

    // 计算综合技能分数
    const avgLevel =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.inferred_level, 0) / skills.length
        : 0;

    const avgConfidence =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length
        : 0;

    return {
      userId,
      totalSkills: skills.length,
      certifiedSkills: certified.length,
      averageLevel: Math.round(avgLevel * 10) / 10,
      averageConfidence: Math.round(avgConfidence),
      domainDistribution,
      topSkills: skills.slice(0, 5).map((s) => ({
        name: s.skill_name,
        domain: s.skill_domain,
        level: s.inferred_level,
        confidence: s.confidence,
      })),
      skillGaps: this.identifySkillGaps(skills, certified),
      growthRecommendations: this.generateGrowthRecommendations(skills),
    };
  }

  /**
   * 识别技能差距
   */
  private static identifySkillGaps(
    inferred: any[],
    certified: any[]
  ): SkillGap[] {
    const gaps: SkillGap[] = [];

    // 找出低置信度的技能
    for (const skill of inferred) {
      if (skill.confidence < 60) {
        gaps.push({
          skillName: skill.skill_name,
          currentLevel: skill.inferred_level,
          targetLevel: Math.min(skill.inferred_level + 1, 5),
          gapType: "confidence",
          recommendation: `建议通过实践或认证提升"${skill.skill_name}"的可信度`,
        });
      }
    }

    // 找出未认证的高级技能
    for (const skill of inferred) {
      if (skill.inferred_level >= 3) {
        const isCertified = certified.some(
          (c) =>
            c.name.toLowerCase().includes(skill.skill_name.toLowerCase()) ||
            skill.skill_name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (!isCertified) {
          gaps.push({
            skillName: skill.skill_name,
            currentLevel: skill.inferred_level,
            targetLevel: skill.inferred_level,
            gapType: "certification",
            recommendation: `建议认证"${skill.skill_name}"技能以获得正式认可`,
          });
        }
      }
    }

    return gaps;
  }

  /**
   * 生成成长建议
   */
  private static generateGrowthRecommendations(skills: any[]): string[] {
    const recommendations: string[] = [];

    // 基于技能分布给出建议
    const domainCounts: Record<string, number> = {};
    for (const skill of skills) {
      domainCounts[skill.skill_domain] =
        (domainCounts[skill.skill_domain] || 0) + 1;
    }

    // 找出薄弱领域
    const allDomains = ["T", "S", "D", "C", "K", "L"];
    const weakDomains = allDomains.filter(
      (d) => !domainCounts[d] || domainCounts[d] < 2
    );

    if (weakDomains.length > 0) {
      const domainNames: Record<string, string> = {
        T: "技术",
        S: "软技能",
        D: "设计",
        C: "沟通",
        K: "知识",
        L: "领导力",
      };
      recommendations.push(
        `建议加强${weakDomains.map((d) => domainNames[d]).join("、")}领域的技能发展`
      );
    }

    // 基于技能等级给出建议
    const lowLevelSkills = skills.filter((s) => s.inferred_level <= 2);
    if (lowLevelSkills.length > skills.length * 0.5) {
      recommendations.push("建议专注于提升现有技能的深度，而非广度");
    }

    // 通用建议
    recommendations.push("定期参与项目实践以巩固和提升技能");
    recommendations.push("考虑获取相关认证以增强技能可信度");

    return recommendations;
  }
}

// ==================== 类型定义 ====================

export interface BehaviorStats {
  totalEvents: number;
  uniqueDays: number;
  activityScore: number;
  byType: Record<string, number>;
  byDate: Record<string, number>;
  topActivities: { type: string; count: number }[];
}

export interface BehaviorPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  data: any;
}

export interface InferredSkill {
  name: string;
  domain: string;
  level: number;
  confidence: number;
  evidence: string[];
}

export interface SkillProfile {
  userId: number;
  totalSkills: number;
  certifiedSkills: number;
  averageLevel: number;
  averageConfidence: number;
  domainDistribution: Record<string, number>;
  topSkills: {
    name: string;
    domain: string;
    level: number;
    confidence: number;
  }[];
  skillGaps: SkillGap[];
  growthRecommendations: string[];
}

export interface SkillGap {
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  gapType: "confidence" | "certification" | "level";
  recommendation: string;
}
