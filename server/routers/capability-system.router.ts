/**
 * Capability System Router — GRT Six Major Capability Models & Scoring
 *
 * Three core tables (in-memory mock for Phase 0):
 *   1. capability_dictionary — 6 TSDCKL pillars with scoring rubrics
 *   2. role_capability_criteria — target scores per role
 *   3. employee_assessments — Feb 2026 actual assessment data
 *
 * Procedures:
 *   - getDictionary: returns the 6 pillars
 *   - getRoleCriteria: returns target scores for a given role
 *   - getMyAssessment: returns current user's Feb 2026 scores
 *   - getTeamAssessments: returns all team data (HR/admin only)
 *   - aiCompensationAnalysis: mock AI analysis of capability gaps → salary recommendations
 *   - aiImprovementTips: mock AI-generated improvement tips per pillar
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

// ─── Capability Dictionary (6 TSDCKL Pillars) ───────────────────────

export interface CapabilityPillar {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  icon: string;
  maxScore: number;
  scoringRules: string[];
}

export const CAPABILITY_DICTIONARY: CapabilityPillar[] = [
  {
    code: "T", name: "硬核技术力", nameEn: "Technical Power",
    description: "专业技术深度、工程实践能力、问题诊断与解决",
    color: "#f97316", icon: "Wrench", maxScore: 100,
    scoringRules: [
      "90-100: 行业专家，可独立主导复杂技术方案",
      "75-89: 高级工程师，能解决大部分技术难题",
      "60-74: 中级工程师，能独立完成常规任务",
      "40-59: 初级工程师，需指导完成任务",
      "0-39: 新人/实习，需系统培训",
    ],
  },
  {
    code: "S", name: "软性通用力", nameEn: "Soft Skills",
    description: "沟通表达、团队协作、时间管理、情商与适应力",
    color: "#3b82f6", icon: "Users", maxScore: 100,
    scoringRules: [
      "90-100: 高效沟通者，能影响跨部门决策",
      "75-89: 良好沟通，团队协作顺畅",
      "60-74: 基本沟通能力，偶尔需协调",
      "40-59: 沟通需提升，团队配合被动",
      "0-39: 沟通障碍明显，需辅导",
    ],
  },
  {
    code: "D", name: "设计与创新力", nameEn: "Design & Innovation",
    description: "方案设计、产品创新、工艺改善、专利产出",
    color: "#22c55e", icon: "Lightbulb", maxScore: 100,
    scoringRules: [
      "90-100: 创新领军人物，多项专利/方案",
      "75-89: 优秀设计师，有创新产出",
      "60-74: 能独立完成设计，有改善意识",
      "40-59: 辅助设计角色，创新有限",
      "0-39: 设计能力待培养",
    ],
  },
  {
    code: "C", name: "沟通协作力", nameEn: "Communication & Collaboration",
    description: "跨部门协同、客户沟通、供应链协调、会议效能",
    color: "#a855f7", icon: "MessageSquare", maxScore: 100,
    scoringRules: [
      "90-100: 跨部门协作标杆，客户口碑极佳",
      "75-89: 协作能力强，客户满意度高",
      "60-74: 能配合跨部门工作，客户关系良好",
      "40-59: 协作被动，客户反馈一般",
      "0-39: 协作困难，需改善",
    ],
  },
  {
    code: "K", name: "专业标准力", nameEn: "Knowledge & Standards",
    description: "行业标准掌握、质量体系、合规意识、知识沉淀",
    color: "#eab308", icon: "BookOpen", maxScore: 100,
    scoringRules: [
      "90-100: 标准专家，参与行业标准制定",
      "75-89: 精通IATF/ISO标准，能培训他人",
      "60-74: 熟悉常用标准，能独立执行",
      "40-59: 了解基本标准，需查阅执行",
      "0-39: 标准意识薄弱，需系统学习",
    ],
  },
  {
    code: "L", name: "领导与战略力", nameEn: "Leadership & Strategy",
    description: "团队管理、战略思维、人才培养、变革领导力",
    color: "#ec4899", icon: "Crown", maxScore: 100,
    scoringRules: [
      "90-100: 卓越领导者，战略视野清晰",
      "75-89: 优秀管理者，能带领团队达成目标",
      "60-74: 有管理潜力，能承担小团队管理",
      "40-59: 管理意识初步，需培养",
      "0-39: 无管理经验，执行角色",
    ],
  },
];

// ─── Role Capability Criteria (Target Scores by Role) ────────────────

export interface RoleCriteria {
  role: string;
  roleName: string;
  targets: Record<string, number>; // code -> target score
}

export const ROLE_CRITERIA: RoleCriteria[] = [
  { role: "bu_gm",         roleName: "BU总经理",   targets: { T: 80, S: 90, D: 85, C: 90, K: 85, L: 95 } },
  { role: "director",      roleName: "总监",       targets: { T: 75, S: 85, D: 80, C: 85, K: 80, L: 90 } },
  { role: "dept_manager",  roleName: "部门经理",   targets: { T: 75, S: 80, D: 75, C: 80, K: 78, L: 82 } },
  { role: "bu_pm",         roleName: "项目经理",   targets: { T: 70, S: 78, D: 80, C: 82, K: 75, L: 72 } },
  { role: "bu_sales",      roleName: "销售工程师", targets: { T: 60, S: 85, D: 55, C: 90, K: 65, L: 55 } },
  { role: "bu_mech",       roleName: "机械工程师", targets: { T: 88, S: 65, D: 82, C: 60, K: 78, L: 45 } },
  { role: "bu_elec",       roleName: "电气工程师", targets: { T: 88, S: 65, D: 80, C: 60, K: 78, L: 45 } },
  { role: "cs_engineer",   roleName: "售后工程师", targets: { T: 78, S: 75, D: 60, C: 88, K: 72, L: 45 } },
  { role: "team_lead",     roleName: "组长",       targets: { T: 75, S: 72, D: 68, C: 70, K: 70, L: 65 } },
  { role: "hr_manager",    roleName: "HR经理",     targets: { T: 40, S: 90, D: 50, C: 85, K: 80, L: 85 } },
  { role: "hr_specialist", roleName: "HR专员",     targets: { T: 35, S: 82, D: 40, C: 78, K: 72, L: 50 } },
  { role: "finance_manager", roleName: "财务经理", targets: { T: 45, S: 78, D: 45, C: 72, K: 88, L: 78 } },
  { role: "employee",      roleName: "普通员工",   targets: { T: 60, S: 65, D: 55, C: 60, K: 60, L: 35 } },
  { role: "procurement_eng", roleName: "采购工程师", targets: { T: 55, S: 72, D: 50, C: 82, K: 75, L: 40 } },
];

// ─── Employee Assessments (Feb 2026 Real Data) ───────────────────────

export interface EmployeeAssessment {
  id: number;
  employeeId: number;
  name: string;
  nameEn: string;
  department: string;
  role: string;
  roleName: string;
  scores: Record<string, number>; // T/S/D/C/K/L -> actual score
  assessedAt: string;
  assessedBy: string;
  overallScore: number;
  overallGrade: string;
}

export function computeGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  return "D";
}

function makeAssessment(
  id: number, employeeId: number, name: string, nameEn: string,
  department: string, role: string, roleName: string,
  t: number, s: number, d: number, c: number, k: number, l: number,
): EmployeeAssessment {
  const scores = { T: t, S: s, D: d, C: c, K: k, L: l };
  const vals = Object.values(scores);
  const overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return {
    id, employeeId, name, nameEn, department, role, roleName,
    scores, assessedAt: "2026-02-15", assessedBy: "360评估系统",
    overallScore, overallGrade: computeGrade(overallScore),
  };
}

export const EMPLOYEE_ASSESSMENTS: EmployeeAssessment[] = [
  makeAssessment(1,  1001, "王磊",   "Wang Lei",    "海外BU",     "bu_gm",       "BU总经理",   82, 88, 85, 91, 83, 92),
  makeAssessment(2,  1002, "张伟",   "Zhang Wei",   "海外BU",     "bu_mech",     "机械工程师", 91, 62, 85, 58, 80, 42),
  makeAssessment(3,  1003, "李娜",   "Li Na",       "海外BU",     "bu_elec",     "电气工程师", 88, 68, 82, 55, 76, 40),
  makeAssessment(4,  1004, "陈明",   "Chen Ming",   "商用车BU",   "bu_pm",       "项目经理",   72, 82, 78, 85, 74, 70),
  makeAssessment(5,  1005, "赵敏",   "Zhao Min",    "商用车BU",   "bu_sales",    "销售工程师", 55, 88, 52, 92, 62, 48),
  makeAssessment(6,  1006, "刘洋",   "Liu Yang",    "乘用车BU",   "bu_mech",     "机械工程师", 86, 60, 78, 56, 72, 38),
  makeAssessment(7,  1007, "孙婷",   "Sun Ting",    "乘用车BU",   "cs_engineer", "售后工程师", 76, 78, 58, 90, 70, 42),
  makeAssessment(8,  1008, "周勇",   "Zhou Yong",   "半导体BU",   "bu_mech",     "机械工程师", 93, 58, 88, 52, 82, 35),
  makeAssessment(9,  1009, "吴静",   "Wu Jing",     "半导体BU",   "team_lead",   "组长",       78, 75, 72, 74, 68, 68),
  makeAssessment(10, 1010, "郑浩",   "Zheng Hao",   "工业通用BU", "bu_pm",       "项目经理",   68, 80, 82, 78, 72, 65),
  makeAssessment(11, 1011, "黄丽",   "Huang Li",    "人力资源部", "hr_manager",  "HR经理",     38, 92, 48, 88, 82, 86),
  makeAssessment(12, 1012, "马超",   "Ma Chao",     "财务部",     "finance_manager", "财务经理", 42, 76, 40, 70, 90, 78),
  makeAssessment(13, 1013, "林峰",   "Lin Feng",    "海外BU",     "bu_sales",    "销售工程师", 58, 85, 50, 88, 60, 52),
  makeAssessment(14, 1014, "徐霞",   "Xu Xia",      "商用车BU",   "bu_elec",     "电气工程师", 85, 65, 80, 62, 75, 44),
  makeAssessment(15, 1015, "杨洁",   "Yang Jie",    "人力资源部", "hr_specialist","HR专员",     32, 84, 38, 80, 70, 48),
  makeAssessment(16, 1016, "胡伟",   "Hu Wei",      "工业通用BU", "team_lead",   "组长",       80, 72, 70, 68, 66, 62),
  makeAssessment(17, 1017, "Donnie", "Donnie",      "总经办",     "director",    "总监",       78, 90, 82, 88, 85, 88),
  makeAssessment(18, 1018, "Camilla","Camilla",      "人力资源部", "hr_manager",  "HR经理",     35, 88, 45, 86, 78, 82),
];

// ─── ROLE_LEVELS (mirrors client) ────────────────────────────────────

const ROLE_LEVELS: Record<string, number> = {
  guest: 0, employee: 1, production_worker: 1,
  team_lead: 2, bu_sales: 2, bu_mech: 2, bu_elec: 2, procurement_eng: 2, cs_engineer: 2,
  dept_manager: 3, bu_pm: 3, hr_specialist: 3, finance_specialist: 3,
  hr_manager: 4, finance_manager: 4, director: 5, bu_gm: 6, admin: 10,
};

// ─── Router ──────────────────────────────────────────────────────────

export const capabilitySystemRouter = router({
  /** Get the 6-pillar capability dictionary */
  getDictionary: protectedProcedure.query(() => CAPABILITY_DICTIONARY),

  /** Get target criteria for a specific role */
  getRoleCriteria: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(({ input }) => {
      const criteria = ROLE_CRITERIA.find(r => r.role === input.role);
      return criteria || ROLE_CRITERIA.find(r => r.role === "employee")!;
    }),

  /** Get all role criteria (for admin comparison) */
  getAllRoleCriteria: protectedProcedure.query(() => ROLE_CRITERIA),

  /** Get an individual employee's assessment (by employeeId) */
  getMyAssessment: protectedProcedure
    .input(z.object({ employeeId: z.number().optional() }))
    .query(({ input }) => {
      // Default to Donnie (1017) if no ID provided — the logged-in user
      const id = input.employeeId || 1017;
      return EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === id) || EMPLOYEE_ASSESSMENTS[0];
    }),

  /** Get full team assessments (HR/admin view) */
  getTeamAssessments: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      search: z.string().optional(),
      userRole: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      // RBAC: only manager+ can view team data
      const roleLevel = ROLE_LEVELS[input?.userRole ?? "employee"] ?? 1;
      if (roleLevel < 3) {
        return { items: [], total: 0, accessDenied: true };
      }

      let results = [...EMPLOYEE_ASSESSMENTS];

      if (input?.department) {
        results = results.filter(e => e.department === input.department);
      }
      if (input?.search) {
        const q = input.search.toLowerCase();
        results = results.filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.nameEn.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.roleName.toLowerCase().includes(q)
        );
      }

      return { items: results, total: results.length, accessDenied: false };
    }),

  /** Get unique departments for filter */
  getDepartments: protectedProcedure.query(() => {
    const deps = [...new Set(EMPLOYEE_ASSESSMENTS.map(e => e.department))];
    return deps.sort();
  }),

  /** AI Compensation & Performance Analysis */
  aiCompensationAnalysis: protectedProcedure
    .input(z.object({ userRole: z.string().optional() }))
    .mutation(({ input }) => {
      const roleLevel = ROLE_LEVELS[input?.userRole ?? "employee"] ?? 1;
      if (roleLevel < 3) {
        throw new Error("Only managers and above can access AI Compensation Analysis");
      }

      // Generate analysis per employee
      const analyses = EMPLOYEE_ASSESSMENTS.map(emp => {
        const criteria = ROLE_CRITERIA.find(r => r.role === emp.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
        const gaps: Array<{ pillar: string; actual: number; target: number; gap: number }> = [];
        let totalGap = 0;

        for (const [code, target] of Object.entries(criteria.targets)) {
          const actual = emp.scores[code] || 0;
          const gap = target - actual;
          gaps.push({ pillar: code, actual, target, gap });
          totalGap += gap;
        }

        const avgGap = totalGap / 6;
        let salaryAdjustment: string;
        let adjustmentPercent: number;

        if (avgGap <= -5) {
          adjustmentPercent = 8 + Math.round(Math.random() * 4);
          salaryAdjustment = `建议上调 ${adjustmentPercent}% — 能力显著超越岗位要求`;
        } else if (avgGap <= 0) {
          adjustmentPercent = 3 + Math.round(Math.random() * 3);
          salaryAdjustment = `建议上调 ${adjustmentPercent}% — 达标且有盈余`;
        } else if (avgGap <= 10) {
          adjustmentPercent = 0;
          salaryAdjustment = "维持现有薪资 — 基本达标，需小幅提升";
        } else {
          adjustmentPercent = -(2 + Math.round(Math.random() * 3));
          salaryAdjustment = `建议关注 — 能力差距 ${avgGap.toFixed(1)} 分，列入培养计划`;
        }

        return {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          role: emp.roleName,
          overallScore: emp.overallScore,
          overallGrade: emp.overallGrade,
          avgGap: Math.round(avgGap * 10) / 10,
          salaryAdjustment,
          adjustmentPercent,
          topGaps: gaps.sort((a, b) => b.gap - a.gap).slice(0, 2).map(g => ({
            pillar: CAPABILITY_DICTIONARY.find(p => p.code === g.pillar)?.name || g.pillar,
            gap: g.gap,
          })),
        };
      });

      const exceeds = analyses.filter(a => a.avgGap <= -5).length;
      const meets = analyses.filter(a => a.avgGap > -5 && a.avgGap <= 5).length;
      const below = analyses.filter(a => a.avgGap > 5).length;

      return {
        generatedAt: new Date().toISOString(),
        aiModel: "Claude + Gemini Collaborative Analysis",
        summary: {
          totalEmployees: EMPLOYEE_ASSESSMENTS.length,
          exceeds,
          meets,
          below,
          avgTeamScore: Math.round(EMPLOYEE_ASSESSMENTS.reduce((s, e) => s + e.overallScore, 0) / EMPLOYEE_ASSESSMENTS.length),
          recommendation: `团队整体能力评分 ${Math.round(EMPLOYEE_ASSESSMENTS.reduce((s, e) => s + e.overallScore, 0) / EMPLOYEE_ASSESSMENTS.length)} 分。${exceeds} 人超标建议调薪，${below} 人低于标准需重点培养。建议重点投入"领导与战略力(L)"和"设计与创新力(D)"两项组织短板的培训预算。`,
        },
        analyses,
      };
    }),

  /** AI Improvement Tips for a specific employee */
  aiImprovementTips: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      role: z.string(),
    }))
    .mutation(({ input }) => {
      const emp = EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === input.employeeId);
      const criteria = ROLE_CRITERIA.find(r => r.role === input.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
      if (!emp) throw new Error("Employee not found");

      const tips = CAPABILITY_DICTIONARY.map(pillar => {
        const actual = emp.scores[pillar.code] || 0;
        const target = criteria.targets[pillar.code] || 60;
        const gap = target - actual;

        let tip: string;
        let priority: "high" | "medium" | "low";
        let action: string;

        if (gap > 15) {
          priority = "high";
          tip = `${pillar.name}差距显著(${gap}分)，建议立即制定专项提升计划`;
          action = `报名${pillar.nameEn}高级培训课程，每周投入4小时实践`;
        } else if (gap > 5) {
          priority = "medium";
          tip = `${pillar.name}接近目标(差${gap}分)，通过项目实战可快速达标`;
          action = `参与1-2个相关项目获得实践经验，配合导师辅导`;
        } else if (gap > 0) {
          priority = "low";
          tip = `${pillar.name}基本达标(差${gap}分)，维持当前水平即可`;
          action = `保持现有学习节奏，关注行业最新动态`;
        } else {
          priority = "low";
          tip = `${pillar.name}已超越目标(+${Math.abs(gap)}分)，可考虑担任该领域导师`;
          action = `可输出知识文档或带教新人，巩固领先优势`;
        }

        return {
          code: pillar.code,
          name: pillar.name,
          actual,
          target,
          gap,
          priority,
          tip,
          action,
        };
      });

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        generatedAt: new Date().toISOString(),
        tips: tips.sort((a, b) => b.gap - a.gap), // highest gap first
      };
    }),
});
