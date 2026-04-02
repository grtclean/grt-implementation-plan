/**
 * 项目质量追责与积分引擎
 *
 * 流程：
 *   1. 任何员工发现问题 → 提交反馈（图纸缺失/错误/物料延迟/工序阻塞等）
 *   2. 系统自动通知绩效委员会主席（倪微薇）+ 事业部经理
 *   3. 绩效委员会确认 → 责任人扣分 + 反馈者奖分
 *   4. 事业部经理提交改善措施 → 跟踪闭环
 *   5. 积分汇总 → 绩效考核输入
 *
 * Tables:
 *   quality_issues        — 质量问题/依赖阻塞反馈单
 *   quality_point_ledger  — 积分流水账（奖/扣）
 *   quality_improvements  — 改善措施跟踪
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

let _ready = false;
async function ensureTables() {
  if (_ready) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quality_issues (
      id SERIAL PRIMARY KEY,
      issue_code VARCHAR(30) NOT NULL UNIQUE,
      project_code VARCHAR(50) NOT NULL,
      bu_code VARCHAR(20),

      -- 问题分类
      issue_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      title VARCHAR(200) NOT NULL,
      description TEXT,
      evidence_urls TEXT,

      -- 依赖关系
      blocking_process VARCHAR(100),
      blocked_process VARCHAR(100),
      impact_hours NUMERIC(10,2) DEFAULT 0,

      -- 人员
      reporter_id VARCHAR(50) NOT NULL,
      reporter_name VARCHAR(100) NOT NULL,
      responsible_id VARCHAR(50),
      responsible_name VARCHAR(100),
      responsible_dept VARCHAR(100),
      bu_manager_id VARCHAR(50),
      bu_manager_name VARCHAR(100),

      -- 状态
      status VARCHAR(30) NOT NULL DEFAULT 'reported',
      committee_verdict VARCHAR(30),
      reward_points INTEGER DEFAULT 0,
      penalty_points INTEGER DEFAULT 0,
      reviewed_by VARCHAR(100),
      reviewed_at TIMESTAMP,

      -- 时间
      reported_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quality_point_ledger (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) NOT NULL,
      employee_name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      bu_code VARCHAR(20),
      point_type VARCHAR(20) NOT NULL,
      points INTEGER NOT NULL,
      reason VARCHAR(300) NOT NULL,
      issue_id INTEGER,
      project_code VARCHAR(50),
      awarded_by VARCHAR(100) DEFAULT '绩效委员会',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quality_improvements (
      id SERIAL PRIMARY KEY,
      issue_id INTEGER NOT NULL,
      bu_code VARCHAR(20),
      submitted_by VARCHAR(100) NOT NULL,
      improvement_plan TEXT NOT NULL,
      root_cause TEXT,
      corrective_action TEXT,
      preventive_action TEXT,
      target_date DATE,
      status VARCHAR(30) DEFAULT 'submitted',
      verified_by VARCHAR(100),
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qi_project ON quality_issues(project_code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qi_status ON quality_issues(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qpl_employee ON quality_point_ledger(employee_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qpl_type ON quality_point_ledger(point_type)`);
  } catch { /* */ }
  _ready = true;
}

// 问题类型定义
const ISSUE_TYPES = [
  { code: "drawing_missing",      name: "图纸缺失",     penaltyBase: 10, rewardBase: 5,  dept: "研发" },
  { code: "drawing_error",        name: "图纸错误",     penaltyBase: 15, rewardBase: 8,  dept: "研发" },
  { code: "bom_error",            name: "BOM错误",      penaltyBase: 12, rewardBase: 6,  dept: "研发" },
  { code: "material_delay",       name: "物料延迟",     penaltyBase: 8,  rewardBase: 4,  dept: "采购" },
  { code: "material_wrong",       name: "物料错误",     penaltyBase: 15, rewardBase: 8,  dept: "采购" },
  { code: "process_blocking",     name: "工序阻塞",     penaltyBase: 10, rewardBase: 5,  dept: "生产" },
  { code: "quality_defect",       name: "质量缺陷",     penaltyBase: 20, rewardBase: 10, dept: "质量" },
  { code: "spec_unclear",         name: "规格不明确",   penaltyBase: 8,  rewardBase: 4,  dept: "销售/PM" },
  { code: "schedule_miss",        name: "节点延误",     penaltyBase: 12, rewardBase: 6,  dept: "项目" },
  { code: "safety_violation",     name: "安全违规",     penaltyBase: 25, rewardBase: 15, dept: "EHS" },
  { code: "communication_gap",    name: "信息断层",     penaltyBase: 5,  rewardBase: 3,  dept: "通用" },
  { code: "other",                name: "其他问题",     penaltyBase: 5,  rewardBase: 3,  dept: "通用" },
];

const SEVERITY_MULTIPLIER: Record<string, number> = {
  low: 0.5, medium: 1, high: 1.5, critical: 2,
};

export const qualityAccountabilityRouter = router({

  /** 获取问题类型列表 */
  getIssueTypes: protectedProcedure.query(() => ISSUE_TYPES),

  /** 提交质量问题反馈 */
  reportIssue: protectedProcedure
    .input(z.object({
      projectCode: z.string(),
      buCode: z.string().optional(),
      issueType: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      title: z.string().min(5),
      description: z.string().optional(),
      blockingProcess: z.string().optional(),
      blockedProcess: z.string().optional(),
      impactHours: z.number().optional(),
      responsibleId: z.string().optional(),
      responsibleName: z.string().optional(),
      responsibleDept: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const ts = Date.now().toString(36);
      const issueCode = `QI-${input.projectCode}-${ts}`.substring(0, 30);
      const reporterName = (ctx as any).userName || "员工";
      const reporterId = (ctx as any).userId?.toString() || "unknown";

      await db.execute(sql`
        INSERT INTO quality_issues (issue_code, project_code, bu_code, issue_type, severity,
          title, description, blocking_process, blocked_process, impact_hours,
          reporter_id, reporter_name, responsible_id, responsible_name, responsible_dept, status)
        VALUES (${issueCode}, ${input.projectCode}, ${input.buCode ?? null},
          ${input.issueType}, ${input.severity}, ${input.title}, ${input.description ?? null},
          ${input.blockingProcess ?? null}, ${input.blockedProcess ?? null}, ${input.impactHours ?? 0},
          ${reporterId}, ${reporterName},
          ${input.responsibleId ?? null}, ${input.responsibleName ?? null}, ${input.responsibleDept ?? null},
          'reported')
      `);

      return { success: true, issueCode };
    }),

  /** 绩效委员会审核 — 确认/驳回 + 自动奖扣分 */
  reviewIssue: protectedProcedure
    .input(z.object({
      issueId: z.number(),
      verdict: z.enum(["confirmed", "rejected", "needs_investigation"]),
      responsibleId: z.string().optional(),
      responsibleName: z.string().optional(),
      responsibleDept: z.string().optional(),
      adjustPenalty: z.number().optional(),
      adjustReward: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get the issue
      const issue = await db.execute(sql`SELECT * FROM quality_issues WHERE id = ${input.issueId}`);
      if (!(issue.rows as any[]).length) return { success: false, message: "Issue not found" };
      const q = (issue.rows as any[])[0];

      const issueTypeDef = ISSUE_TYPES.find(t => t.code === q.issue_type) ?? ISSUE_TYPES[ISSUE_TYPES.length - 1];
      const mult = SEVERITY_MULTIPLIER[q.severity] ?? 1;

      let penalty = 0, reward = 0;

      if (input.verdict === "confirmed") {
        penalty = input.adjustPenalty ?? Math.round(issueTypeDef.penaltyBase * mult);
        reward = input.adjustReward ?? Math.round(issueTypeDef.rewardBase * mult);

        const respId = input.responsibleId ?? q.responsible_id;
        const respName = input.responsibleName ?? q.responsible_name ?? "待定";

        // 扣分 — 责任人
        if (respId) {
          await db.execute(sql`
            INSERT INTO quality_point_ledger (employee_id, employee_name, department, bu_code, point_type, points, reason, issue_id, project_code)
            VALUES (${respId}, ${respName}, ${input.responsibleDept ?? q.responsible_dept ?? null}, ${q.bu_code},
              'penalty', ${-penalty},
              ${`${issueTypeDef.name}(${q.severity}) — ${q.title}`},
              ${input.issueId}, ${q.project_code})
          `);
        }

        // 奖分 — 反馈者
        await db.execute(sql`
          INSERT INTO quality_point_ledger (employee_id, employee_name, department, bu_code, point_type, points, reason, issue_id, project_code)
          VALUES (${q.reporter_id}, ${q.reporter_name}, null, ${q.bu_code},
            'reward', ${reward},
            ${`质量问题反馈奖励 — ${issueTypeDef.name}`},
            ${input.issueId}, ${q.project_code})
        `);

        // Update responsible if provided
        if (input.responsibleId) {
          await db.execute(sql`
            UPDATE quality_issues SET responsible_id = ${input.responsibleId},
              responsible_name = ${respName}, responsible_dept = ${input.responsibleDept ?? null}
            WHERE id = ${input.issueId}
          `);
        }
      }

      await db.execute(sql`
        UPDATE quality_issues SET
          status = ${input.verdict === "confirmed" ? "confirmed" : input.verdict === "rejected" ? "rejected" : "investigating"},
          committee_verdict = ${input.verdict},
          reward_points = ${reward}, penalty_points = ${penalty},
          reviewed_by = '倪微薇(绩效委员会)',
          reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ${input.issueId}
      `);

      return { success: true, penalty, reward, verdict: input.verdict };
    }),

  /** 事业部经理提交改善措施 */
  submitImprovement: protectedProcedure
    .input(z.object({
      issueId: z.number(),
      rootCause: z.string(),
      correctiveAction: z.string(),
      preventiveAction: z.string().optional(),
      targetDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const submittedBy = (ctx as any).userName || "事业部经理";
      const issue = await db.execute(sql`SELECT bu_code FROM quality_issues WHERE id = ${input.issueId}`);
      const buCode = (issue.rows as any[])[0]?.bu_code;

      await db.execute(sql`
        INSERT INTO quality_improvements (issue_id, bu_code, submitted_by,
          improvement_plan, root_cause, corrective_action, preventive_action, target_date)
        VALUES (${input.issueId}, ${buCode},  ${submittedBy},
          ${input.correctiveAction}, ${input.rootCause}, ${input.correctiveAction},
          ${input.preventiveAction ?? null}, ${input.targetDate ?? null})
      `);

      await db.execute(sql`
        UPDATE quality_issues SET status = 'improving', updated_at = NOW()
        WHERE id = ${input.issueId}
      `);

      return { success: true };
    }),

  /** 验证改善闭环 */
  verifyImprovement: protectedProcedure
    .input(z.object({
      improvementId: z.number(),
      issueId: z.number(),
      passed: z.boolean(),
      bonusPoints: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      await db.execute(sql`
        UPDATE quality_improvements SET
          status = ${input.passed ? "verified" : "rework"},
          verified_by = '倪微薇(绩效委员会)',
          verified_at = NOW(), updated_at = NOW()
        WHERE id = ${input.improvementId}
      `);

      if (input.passed) {
        await db.execute(sql`
          UPDATE quality_issues SET status = 'closed', resolved_at = NOW(), updated_at = NOW()
          WHERE id = ${input.issueId}
        `);

        // 改善完成奖励事业部经理
        if (input.bonusPoints && input.bonusPoints > 0) {
          const issue = await db.execute(sql`SELECT bu_manager_id, bu_manager_name, bu_code, project_code FROM quality_issues WHERE id = ${input.issueId}`);
          const q = (issue.rows as any[])[0];
          if (q?.bu_manager_id) {
            await db.execute(sql`
              INSERT INTO quality_point_ledger (employee_id, employee_name, bu_code, point_type, points, reason, issue_id, project_code)
              VALUES (${q.bu_manager_id}, ${q.bu_manager_name}, ${q.bu_code}, 'reward', ${input.bonusPoints},
                '高质量改善完成奖励', ${input.issueId}, ${q.project_code})
            `);
          }
        }
      }
      return { success: true };
    }),

  /** 查询问题列表 */
  listIssues: protectedProcedure
    .input(z.object({
      projectCode: z.string().optional(),
      buCode: z.string().optional(),
      status: z.string().optional(),
      issueType: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT qi.*,
          (SELECT count(*) FROM quality_improvements qim WHERE qim.issue_id = qi.id) AS improvement_count
        FROM quality_issues qi
        ORDER BY qi.reported_at DESC
        LIMIT ${input?.limit ?? 50}
      `);
      let rows = result.rows as any[];
      if (input?.projectCode) rows = rows.filter(r => r.project_code === input.projectCode);
      if (input?.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      if (input?.status) rows = rows.filter(r => r.status === input.status);
      if (input?.issueType) rows = rows.filter(r => r.issue_type === input.issueType);
      return rows;
    }),

  /** 积分排行榜 */
  getPointsLeaderboard: protectedProcedure
    .input(z.object({
      buCode: z.string().optional(),
      pointType: z.enum(["reward", "penalty", "all"]).default("all"),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const result = await db.execute(sql`
        SELECT employee_id, employee_name, department, bu_code,
          sum(CASE WHEN points > 0 THEN points ELSE 0 END) AS total_rewards,
          sum(CASE WHEN points < 0 THEN points ELSE 0 END) AS total_penalties,
          sum(points) AS net_points,
          count(*) AS transaction_count
        FROM quality_point_ledger
        GROUP BY employee_id, employee_name, department, bu_code
        ORDER BY net_points DESC
        LIMIT ${input?.limit ?? 20}
      `);
      let rows = result.rows as any[];
      if (input?.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      return rows;
    }),

  /** 个人积分明细 */
  getEmployeePoints: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const ledger = await db.execute(sql`
        SELECT * FROM quality_point_ledger WHERE employee_id = ${input.employeeId}
        ORDER BY created_at DESC LIMIT 100
      `);

      const summary = await db.execute(sql`
        SELECT
          sum(CASE WHEN points > 0 THEN points ELSE 0 END) AS total_rewards,
          sum(CASE WHEN points < 0 THEN points ELSE 0 END) AS total_penalties,
          sum(points) AS net_points
        FROM quality_point_ledger WHERE employee_id = ${input.employeeId}
      `);

      return {
        ledger: ledger.rows,
        summary: (summary.rows as any[])[0] ?? { total_rewards: 0, total_penalties: 0, net_points: 0 },
      };
    }),

  /** 事业部质量统计 */
  getBUQualityStats: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const stats = await db.execute(sql`
        SELECT bu_code,
          count(*) AS total_issues,
          count(*) FILTER (WHERE status = 'closed') AS closed_issues,
          count(*) FILTER (WHERE status IN ('reported','confirmed','investigating')) AS open_issues,
          count(*) FILTER (WHERE severity = 'critical') AS critical_count,
          round(avg(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - reported_at)) / 3600)::numeric, 1) AS avg_resolution_hours,
          sum(impact_hours) AS total_impact_hours,
          sum(penalty_points) AS total_penalties,
          sum(reward_points) AS total_rewards
        FROM quality_issues
        GROUP BY bu_code ORDER BY total_issues DESC
      `);

      // Issue type distribution
      const typeDist = await db.execute(sql`
        SELECT issue_type, count(*) AS cnt,
          sum(penalty_points) AS penalty_sum
        FROM quality_issues
        GROUP BY issue_type ORDER BY cnt DESC
      `);

      return { buStats: stats.rows, issueTypeDistribution: typeDist.rows };
    }),

  /** 种子示例数据 */
  seedDemoIssues: protectedProcedure
    .mutation(async () => {
      await ensureTables();
      const db = await requireDb();

      const DEMO = [
        { proj: "GRT-414", bu: "BU1", type: "drawing_missing", sev: "high", title: "03.工作腔喷嘴安装孔位图纸缺失", reporter: "GRT010", reporterName: "吴卫成", resp: "GRT044", respName: "洪小东", respDept: "事业二部/机械研发", impact: 16 },
        { proj: "GRT-414", bu: "BU1", type: "drawing_error", sev: "critical", title: "09管路装配法兰孔距尺寸标注错误(Ø150标为Ø130)", reporter: "GRT031", reporterName: "沈龙翔", resp: "GRT044", respName: "洪小东", respDept: "事业二部/机械研发", impact: 24 },
        { proj: "GRT-422", bu: "BU2", type: "material_delay", sev: "medium", title: "真空泵供应商交期延迟2周", reporter: "GRT055", reporterName: "沈迎凤", resp: "GRT003", respName: "倪亚琴", respDept: "事业三部/采购", impact: 40 },
        { proj: "GRT-436", bu: "BU3", type: "bom_error", sev: "high", title: "BOM中PLC型号规格错误导致重新采购", reporter: "GRT007", reporterName: "孙坚", resp: "GRT097", respName: "钱佳奇", respDept: "事业二部/电气研发", impact: 32 },
        { proj: "GRT-440", bu: "BU1", type: "quality_defect", sev: "critical", title: "焊缝探伤不合格率超标(>5%), 需返工", reporter: "GRT005", reporterName: "金晓锋", resp: "GRT017", respName: "田坪珍", respDept: "事业一部/焊接", impact: 48 },
        { proj: "GRT-424", bu: "BU2", type: "process_blocking", sev: "medium", title: "机加工工序等待电气图纸3天", reporter: "GRT024", reporterName: "张腾飞", resp: "GRT018", respName: "孙国祥", respDept: "事业四部/电气", impact: 24 },
        { proj: "GRT-414", bu: "BU1", type: "spec_unclear", sev: "low", title: "客户对清洗压力参数要求不明确", reporter: "GRT063", reporterName: "刘健康", resp: "GRT004", respName: "戴晓燕", respDept: "事业一部/销售", impact: 8 },
        { proj: "GRT-448", bu: "BU3", type: "schedule_miss", sev: "high", title: "M5机械装配延误1周, 影响M7调试", reporter: "GRT045", reporterName: "杨勇", resp: "GRT058", respName: "周辉", respDept: "事业三部/生产", impact: 40 },
      ];

      let count = 0;
      for (const d of DEMO) {
        const code = `QI-${d.proj}-${Date.now().toString(36)}${count}`;
        await db.execute(sql`
          INSERT INTO quality_issues (issue_code, project_code, bu_code, issue_type, severity, title,
            blocking_process, impact_hours, reporter_id, reporter_name,
            responsible_id, responsible_name, responsible_dept, status)
          VALUES (${code}, ${d.proj}, ${d.bu}, ${d.type}, ${d.sev}, ${d.title},
            null, ${d.impact}, ${d.reporter}, ${d.reporterName},
            ${d.resp}, ${d.respName}, ${d.respDept}, 'reported')
          ON CONFLICT (issue_code) DO NOTHING
        `);
        count++;
      }

      // Auto-review first 4 issues (simulate 倪微薇 already reviewed)
      const openIssues = await db.execute(sql`SELECT id, issue_type, severity, reporter_id, reporter_name, responsible_id, responsible_name, bu_code, project_code, title FROM quality_issues WHERE status = 'reported' ORDER BY id LIMIT 4`);
      for (const q of openIssues.rows as any[]) {
        const typeDef = ISSUE_TYPES.find(t => t.code === q.issue_type) ?? ISSUE_TYPES[ISSUE_TYPES.length - 1];
        const mult = SEVERITY_MULTIPLIER[q.severity] ?? 1;
        const penalty = Math.round(typeDef.penaltyBase * mult);
        const reward = Math.round(typeDef.rewardBase * mult);

        if (q.responsible_id) {
          await db.execute(sql`
            INSERT INTO quality_point_ledger (employee_id, employee_name, bu_code, point_type, points, reason, issue_id, project_code)
            VALUES (${q.responsible_id}, ${q.responsible_name}, ${q.bu_code}, 'penalty', ${-penalty}, ${`${typeDef.name} — ${q.title}`}, ${q.id}, ${q.project_code})
          `);
        }
        await db.execute(sql`
          INSERT INTO quality_point_ledger (employee_id, employee_name, bu_code, point_type, points, reason, issue_id, project_code)
          VALUES (${q.reporter_id}, ${q.reporter_name}, ${q.bu_code}, 'reward', ${reward}, ${'质量反馈奖励 — ' + typeDef.name}, ${q.id}, ${q.project_code})
        `);
        await db.execute(sql`
          UPDATE quality_issues SET status = 'confirmed', committee_verdict = 'confirmed',
            reward_points = ${reward}, penalty_points = ${penalty},
            reviewed_by = '倪微薇(绩效委员会)', reviewed_at = NOW() WHERE id = ${q.id}
        `);
      }

      return { success: true, issuesCreated: count, reviewed: Math.min(4, (openIssues.rows as any[]).length) };
    }),

  getIssueById: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`SELECT * FROM quality_issues WHERE id = ${Number(input.id)} LIMIT 1`);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  deleteIssue: requirePermission("quality:accountability:manage")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`DELETE FROM quality_issues WHERE id = ${Number(input.id)}`);
      return { success: true, message: "质量问题已删除" };
    }),
});
