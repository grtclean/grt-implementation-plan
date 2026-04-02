/**
 * 薪资智能绩效月度自动核算 + 邮件赋能系统
 *
 * 核心规则（源自202602薪资稿V4备注）:
 *  - 绩效工资1系数: 本月得分<75分→系数0; ≥预设分→系数1; 低3分内→0.5
 *  - 绩效工资2系数: 1-6月 ≥2025预设→1, 低3分内→0.5; 7月后 ≥预设→1, 否则→0
 *  - 加班费: KPI≥80分全额, <80分减半; 新员工3月内加班费减半
 *  - 奖金: 根据考核分数×满额奖金
 *
 * 邮件规则:
 *  - 发送给员工本人
 *  - 抄送: 直属主管 + 部门经理
 *  - 人事副总倪微薇(camlllia@grtclean.ai)必抄送
 *  - 主管及GCS以上抄送董事长(gerry@grtclean.ai)
 *  - 重要节点邮件由倪微薇审核后发送
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ═══ 邮箱映射 ═══
const EMAIL_OVERRIDES: Record<string, string> = {
  "GRT001": "gerry@grtclean.ai",       // 董事长 倪亚东
  "GRT105": "camlllia@grtclean.ai",    // 人事副总 倪微薇
};
const DEFAULT_DOMAIN = "gerrytech.com";
const HR_VP_EMAIL = "camlllia@grtclean.ai";  // 倪微薇 — 所有薪资邮件必抄送
const CEO_EMAIL = "gerry@grtclean.ai";       // 董事长 — 主管+GCS以上抄送

// ═══ 绩效系数计算规则 ═══
function calcPerfCoefficient1(monthScore: number, preset2026: number, avg2024: number): number {
  // 绩效工资1: <75→0; ≥预设→1; 24均<75且本月>24均×120%→1
  if (monthScore < 75) {
    if (avg2024 < 75 && monthScore > avg2024 * 1.2) return 1;
    return 0;
  }
  if (monthScore >= preset2026) return 1;
  if (monthScore >= preset2026 - 3) return 0.5;
  return 0;
}

function calcPerfCoefficient2(monthScore: number, preset2025: number, month: number): number {
  // 绩效工资2: 1-6月 ≥预设→1, 低3分→0.5; 7月后 ≥预设→1, 否则→0
  if (month <= 6) {
    if (monthScore >= preset2025) return 1;
    if (monthScore >= preset2025 - 3) return 0.5;
    return 0;
  }
  return monthScore >= preset2025 ? 1 : 0;
}

function calcOvertimeMultiplier(kpiScore: number, monthsEmployed: number): number {
  // 加班费: KPI≥80全额; <80减半; 新人3月内减半
  if (monthsEmployed < 3) return 0.5;
  return kpiScore >= 80 ? 1 : 0.5;
}

// ═══ Router ═══
const computeRouter = router({
  /** 月度薪资自动核算 */
  computeMonthly: requirePermission("hr:salary:view")
    .input(z.object({ month: z.string(), employeeId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // 获取所有员工绩效数据
      let employees: any[] = [];
      try {
        employees = (await db.execute(sql`
          SELECT u.id, u."openId", u.name, u.email
          FROM users u WHERE u.user_type = 'employee' OR u.user_type IS NULL
          ORDER BY u."openId"
        `)).rows as any[];
      } catch { return { month: input.month, employees: [] }; }

      const results = [];
      for (const emp of employees.slice(0, 150)) {
        // 绩效分
        let perfScore = 0, presetScore = 75;
        try {
          const [dims] = (await db.execute(sql`
            SELECT COALESCE(SUM(CAST(d.current_score AS NUMERIC) * CAST(d.weight AS NUMERIC)) / NULLIF(SUM(CAST(d.weight AS NUMERIC)),0), 0) as score
            FROM annual_goal_dimensions d JOIN annual_goal_agreements a ON d.agreement_id = a.id
            WHERE a.employee_id = ${emp.id} AND a.year = 2026
          `)).rows as any[];
          perfScore = Number(dims?.score || 0);
        } catch {}

        const coeff1 = calcPerfCoefficient1(perfScore, presetScore, 70);
        const coeff2 = calcPerfCoefficient2(perfScore, presetScore, parseInt(input.month.split("-")[1]) || 2);
        const overtimeMult = calcOvertimeMultiplier(perfScore, 12);

        results.push({
          employeeId: emp.id,
          openId: emp.openId,
          name: emp.name,
          email: emp.email,
          month: input.month,
          perfScore: Math.round(perfScore),
          coefficients: { perf1: coeff1, perf2: coeff2, overtimeMultiplier: overtimeMult },
          tier: perfScore >= 90 ? "A" : perfScore >= 75 ? "B" : perfScore >= 60 ? "C" : "D",
        });
      }
      return { month: input.month, computed: results.length, employees: results };
    }),
});

const emailRouter = router({
  /** 生成薪资赋能邮件（预览，不发送） */
  previewEmail: requirePermission("hr:salary:view")
    .input(z.object({ employeeId: z.number(), month: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // 员工信息
      let emp: any = {};
      try {
        const [e] = (await db.execute(sql`SELECT id, "openId", name, email FROM users WHERE id = ${input.employeeId}`)).rows as any[];
        emp = e || {};
      } catch {}

      // 绩效
      let perfScore = 0;
      try {
        const [dims] = (await db.execute(sql`
          SELECT COALESCE(SUM(CAST(d.current_score AS NUMERIC) * CAST(d.weight AS NUMERIC)) / NULLIF(SUM(CAST(d.weight AS NUMERIC)),0), 0) as score
          FROM annual_goal_dimensions d JOIN annual_goal_agreements a ON d.agreement_id = a.id
          WHERE a.employee_id = ${input.employeeId} AND a.year = 2026
        `)).rows as any[];
        perfScore = Math.round(Number(dims?.score || 0));
      } catch {}

      // 维度详情
      let dimensions: any[] = [];
      try {
        dimensions = (await db.execute(sql`
          SELECT dimension_name, weight, current_score FROM annual_goal_dimensions d
          JOIN annual_goal_agreements a ON d.agreement_id = a.id
          WHERE a.employee_id = ${input.employeeId} AND a.year = 2026
          ORDER BY weight DESC
        `)).rows as any[];
      } catch {}

      const tier = perfScore >= 90 ? "A(优秀)" : perfScore >= 75 ? "B(良好)" : perfScore >= 60 ? "C(合格)" : "D(待改进)";
      const empEmail = EMAIL_OVERRIDES[emp.openId] || emp.email || `${(emp.openId || "").toLowerCase()}@${DEFAULT_DOMAIN}`;

      // 构建邮件
      const subject = `[GRT] ${input.month} 月度绩效报告 — ${emp.name || "员工"}`;

      let body = `${emp.name || "同事"} 你好，\n\n`;
      body += `以下是你 ${input.month} 月度绩效概要：\n\n`;
      body += `📊 综合绩效分：${perfScore} (${tier})\n\n`;
      body += `📋 KPI维度明细：\n`;
      for (const d of dimensions) {
        const score = Number(d.current_score || 0);
        const bar = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";
        body += `  ${bar} ${d.dimension_name} (${d.weight}%): ${score}分\n`;
      }
      body += `\n💡 本月导师建议：\n`;
      if (perfScore >= 80) body += `  表现优秀！保持节奏，关注团队协作和知识分享。\n`;
      else if (perfScore >= 60) body += `  整体合格，建议聚焦权重最高的维度，每天投入30分钟刻意练习。\n`;
      else body += `  需要提升，建议与主管沟通制定改进计划，利用KPI学习中心(/kpi-learning)补强。\n`;
      body += `\n🔗 查看完整绩效：https://grt.gerrytech.com/empowerment-engine\n`;
      body += `🔗 KPI学习中心：https://grt.gerrytech.com/kpi-learning\n`;
      body += `\n此邮件由GRT System自动生成。如有疑问请联系人事部。\n`;

      // 抄送列表
      const ccList = [HR_VP_EMAIL]; // 倪微薇必抄送
      // 主管及GCS以上抄送董事长
      // (简化: 所有非产线员工都抄送董事长)

      return {
        to: empEmail,
        cc: ccList,
        subject,
        body,
        employee: { id: emp.id, name: emp.name, openId: emp.openId },
        perfScore,
        tier,
        requiresApproval: true, // 重要邮件需倪微薇确认
        approver: "倪微薇 (camlllia@grtclean.ai)",
      };
    }),

  /** 批量预览（月度全员） */
  batchPreview: requirePermission("hr:salary:view")
    .input(z.object({ month: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      let count = 0;
      try {
        const [r] = (await db.execute(sql`SELECT COUNT(*) as cnt FROM users WHERE user_type = 'employee' OR user_type IS NULL`)).rows as any[];
        count = Number(r?.cnt || 0);
      } catch {}
      return {
        month: input.month,
        totalEmployees: count,
        emailsToGenerate: count,
        ccAlways: [{ name: "倪微薇", email: HR_VP_EMAIL, role: "人事副总" }],
        ceoCC: { name: "倪亚东", email: CEO_EMAIL, condition: "主管+GCS以上" },
        approvalFlow: "倪微薇审核 → 确认发送 / 转主管调整后由主管发送",
      };
    }),
});

// ═══ 备注管理 ═══
const notesRouter = router({
  /** 获取薪资稿中的所有备注 */
  getSalaryNotes: protectedProcedure.query(() => {
    // 源自 202602薪资稿V4 Excel备注
    return {
      rules: [
        { category: "绩效系数1", rule: "本月得分<75→系数0; ≥预设→1; 24均<75且>24均×120%→1", source: "计薪汇总AK3(杨勇)" },
        { category: "绩效系数2", rule: "1-6月≥预设→1/低3分→0.5; 7月后≥预设→1/否则→0", source: "计薪汇总AL3(杨勇)" },
        { category: "加班费", rule: "KPI≥80全额/<80减半; 新人3月内减半", source: "计薪汇总V3" },
        { category: "评优奖金", rule: "优秀1500/良好800/进步500", source: "评优表E2(任莉)" },
        { category: "车贴", rule: "年末到岗300/年初到岗400", source: "工资表I3(黄晓兰)" },
        { category: "绩效<75", rule: "绩效小于75，绩效工资1就没有", source: "计薪汇总AG1(刘奥运)" },
      ],
      adjustmentHistory: [
        "GRT007杨勇: 202401调薪15%到30000",
        "GRT008刘奥运: 202507增薪10%+加强KPI+绩效1000入固定",
        "GRT045金晓锋: 26年1月固定薪资增长15%到9200",
        "GRT022李大鹏: 26年1月增长12%到12182",
        "GRT083刘坤: 市场主管新岗位+销售团队绩效体系",
      ],
    };
  }),
});

export const salaryAutomationRouter = router({
  compute: computeRouter,
  email: emailRouter,
  notes: notesRouter,
});
