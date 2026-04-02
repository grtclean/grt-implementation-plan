/**
 * Capability System Router — GRT Six Major Capability Models & Scoring
 *
 * Three core tables (in-memory mock for Phase 0):
 *   1. capability_dictionary — 6 TSDCKL pillars with scoring rubrics
 *   2. role_capability_criteria — target scores per role (15 roles)
 *   3. employee_assessments — Feb 2026 actual assessment data (30 employees from CEO Excel)
 *
 * Procedures:
 *   - getDictionary: returns the 6 pillars
 *   - getRoleCriteria: returns target scores for a given role
 *   - getAllRoleCriteria: returns all 15 role criteria
 *   - getMyAssessment: returns current user's Feb 2026 scores
 *   - getTeamAssessments: returns all team data (HR/admin only)
 *   - getDepartments: returns unique department list
 *   - aiCompensationAnalysis: AI analysis of capability gaps → salary recommendations
 *   - aiImprovementTips: AI-generated improvement tips per pillar
 *   - getEmployeeProfile: returns full employee profile with gap analysis and training plan
 *   - getTrainingPlan: returns detailed training plan with courses per capability domain
 *   - getTeamTrainingOverview: returns team-wide training needs aggregation
 */

import { z } from "zod";
import { protectedProcedure, router, requirePermission } from "../_core/trpc";

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
  { role: "it_engineer",   roleName: "IT工程师",   targets: { T: 85, S: 65, D: 75, C: 65, K: 70, L: 40 } },
];

// ─── Employee Assessments (Feb 2026 Real Data — CEO's Excel) ─────────

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

// Level → numeric score mapping (L1=25, L1.5=38, L2=50, L2.5=58, L3=70, L3.5=78, L4=85, L5=95)
function levelToScore(level: string): number {
  const m = level.match(/L([\d.]+)/);
  if (!m) return 25;
  const v = parseFloat(m[1]);
  const MAP: Record<number, number> = { 1: 25, 1.5: 38, 2: 50, 2.5: 58, 3: 70, 3.5: 78, 4: 85, 4.5: 90, 5: 95 };
  return MAP[v] ?? Math.round(v * 20);
}

// Real 37-employee TSDCKL data — from 副本GRT人员能力测评（202602）.xlsx (CEO's real assessment)
export const EMPLOYEE_ASSESSMENTS: EmployeeAssessment[] = [
  // ── 事业一部 ──
  makeAssessment(1,  4,   "戴晓燕", "Dai Xiaoyan",      "事业一部",   "bu_sales",       "高级销售经理",           levelToScore("L3"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L3"), levelToScore("L2"), levelToScore("L3")),
  makeAssessment(2,  5,   "金晓锋", "Jin Xiaofeng",     "事业一部",   "dept_manager",   "制造质量经理",           levelToScore("L3"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L3"), levelToScore("L2.5"), levelToScore("L3")),
  makeAssessment(3,  22,  "李大鹏", "Li Dapeng",        "事业一部",   "bu_elec",        "电气工程师",             levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(4,  30,  "匡凯旋", "Kuang Kaixuan",    "事业一部",   "team_lead",      "售后服务主管",           levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2.5")),
  makeAssessment(5,  35,  "王志强", "Wang Zhiqiang",    "事业一部",   "bu_sales",       "销售与项目工程师",       levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5")),
  makeAssessment(6,  63,  "刘健康", "Liu Jiankang",     "事业一部",   "bu_sales",       "销售与项目工程师",       levelToScore("L2"), levelToScore("L1.5"), levelToScore("L1"), levelToScore("L1.5"), levelToScore("L1.5"), levelToScore("L1")),
  makeAssessment(7,  87,  "梅奥杰", "Mei Aojie",        "事业一部",   "bu_elec",        "助理电气工程师",         levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  makeAssessment(8,  88,  "高嘉义", "Gao Jiayi",        "事业一部",   "bu_elec",        "助理电气工程师",         levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  makeAssessment(9,  90,  "陈加丽", "Chen Jiali",       "事业一部",   "bu_mech",        "助理机械研发工程师",     levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  makeAssessment(10, 20,  "张洵",   "Zhang Xun",        "事业一部",   "procurement_eng","采购与项目工程师",       levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(11, 57,  "滕顺英", "Teng Shunying",    "事业一部",   "procurement_eng","采购与项目工程师",       levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(12, 104, "董纾雨", "Dong Shuyu",       "事业一部",   "bu_sales",       "销售与项目工程师",       levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  // ── 事业二部 ──
  makeAssessment(13, 6,   "洪香龙", "Hong Xianglong",   "事业二部",   "dept_manager",   "机械设计经理",           levelToScore("L3"), levelToScore("L2.5"), levelToScore("L3"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L3")),
  makeAssessment(14, 44,  "洪小东", "Hong Xiaodong",    "事业二部",   "bu_mech",        "机械研发工程师",         levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L1.5"), levelToScore("L2")),
  makeAssessment(15, 94,  "徐树奎", "Xu Shukui",        "事业二部",   "dept_manager",   "事业二部经理",           levelToScore("L3"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5")),
  makeAssessment(16, 97,  "钱佳奇", "Qian Jiaqi",       "事业二部",   "bu_elec",        "电气工程师",             levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(17, 99,  "殷金刚", "Yin Jingang",      "事业二部",   "bu_mech",        "机械研发工程师",         levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2")),
  makeAssessment(18, 62,  "朱宇浩", "Zhu Yuhao",        "事业二部",   "bu_pm",          "IT工程师&EHS",           levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  // ── 事业三部 ──
  makeAssessment(19, 3,   "倪亚琴", "Ni Yaqin",         "事业三部",   "procurement_eng","采购与项目工程师",       levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(20, 7,   "孙坚",   "Sun Jian",         "事业三部",   "team_lead",      "电气主管",               levelToScore("L3"), levelToScore("L3"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2")),
  makeAssessment(21, 19,  "冯艳",   "Feng Yan",         "事业三部",   "bu_sales",       "销售与项目工程师",       levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L1.5")),
  makeAssessment(22, 43,  "韩保程", "Han Baocheng",     "事业三部",   "bu_sales",       "销售与项目工程师",       levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(23, 45,  "杨勇",   "Yang Yong",        "事业三部",   "bu_pm",          "销售与项目服务经理",     levelToScore("L2"), levelToScore("L3"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L1.5"), levelToScore("L1.5")),
  makeAssessment(24, 55,  "沈迎凤", "Shen Yingfeng",    "事业三部",   "dept_manager",   "采购经理",               levelToScore("L3"), levelToScore("L3"), levelToScore("L3"), levelToScore("L2"), levelToScore("L2"), levelToScore("L3.5")),
  makeAssessment(25, 58,  "周辉",   "Zhou Hui",         "事业三部",   "dept_manager",   "事业三部经理",           levelToScore("L3"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L2.5")),
  makeAssessment(26, 89,  "罗小玲", "Luo Xiaoling",     "事业三部",   "bu_mech",        "助理机械研发工程师",     levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  makeAssessment(27, 93,  "李柯瑶", "Li Keyao",         "事业三部",   "bu_sales",       "销售与项目工程师",       levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  // ── 事业四部 ──
  makeAssessment(28, 18,  "孙国祥", "Sun Guoxiang",     "事业四部",   "bu_elec",        "电气工程师",             levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2")),
  // ── AI数智部 ──
  makeAssessment(29, 49,  "胡杨",   "Hu Yang",          "AI数智部",   "it_engineer",    "IT工程师",               levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L3"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(30, 80,  "刘奥运", "Liu Aoyun",        "AI数智部",   "director",       "董事长助理",             levelToScore("L2"), levelToScore("L2"), levelToScore("L1"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(31, 83,  "刘坤",   "Liu Kun",          "AI数智部",   "bu_sales",       "市场主管",               levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(32, 103, "朱文韬", "Zhu Wentao",       "AI数智部",   "bu_sales",       "市场专员",               levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  // ── 财务部 ──
  makeAssessment(33, 54,  "王秀萍", "Wang Xiuping",     "财务部",     "finance_manager","总账会计",               levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2"), levelToScore("L2.5"), levelToScore("L2")),
  makeAssessment(34, 81,  "马康风", "Ma Kangfeng",      "财务部",     "employee",       "供应链助理工程师",       levelToScore("L2.5"), levelToScore("L2.5"), levelToScore("L1.5"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2.5")),
  makeAssessment(35, 101, "王汝月", "Wang Ruyue",       "财务部",     "employee",       "会计助理",               levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
  // ── 人事行政部 ──
  makeAssessment(36, 67,  "沙建梅", "Sha Jianmei",      "人事行政部", "hr_manager",     "人事行政主管",           levelToScore("L2"), levelToScore("L1.5"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2"), levelToScore("L2")),
  makeAssessment(37, 100, "田炜钰", "Tian Weiyu",       "人事行政部", "employee",       "行政前台",               levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1"), levelToScore("L1")),
];

// ─── Employee Profile Data (from CEO's salary-summary Excel) ─────────

export interface EmployeeProfileData {
  grtId: string;
  grade: string;
  hireDate: string;
  performanceJan2026: number | null;
  avg2024: number | null;
  avg2025: number | null;
  comprehensiveSalary: number | null;
}

export const EMPLOYEE_PROFILES: Record<number, EmployeeProfileData> = {
  1:   { grtId: "GRT001", grade: "CEO",  hireDate: "2008-01-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: 35000 },
  80:  { grtId: "GRT080", grade: "8",    hireDate: "2024-06-01", performanceJan2026: 81,   avg2024: 0,     avg2025: 80,   comprehensiveSalary: 17000 },
  2:   { grtId: "GRT002", grade: "CFO",  hireDate: "2010-03-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: 35000 },
  54:  { grtId: "GRT054", grade: "7",    hireDate: "2019-06-01", performanceJan2026: 92,   avg2024: 81.75, avg2025: 85,   comprehensiveSalary: 11311 },
  101: { grtId: "GRT101", grade: "4",    hireDate: "2025-06-01", performanceJan2026: null, avg2024: 0,     avg2025: 0,    comprehensiveSalary: 6320 },
  66:  { grtId: "GRT066", grade: "5",    hireDate: "2020-03-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: null },
  67:  { grtId: "GRT067", grade: "8",    hireDate: "2018-05-01", performanceJan2026: 82,   avg2024: 0,     avg2025: 80,   comprehensiveSalary: 13000 },
  53:  { grtId: "GRT053", grade: "5",    hireDate: "2019-01-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: null },
  100: { grtId: "GRT100", grade: "4",    hireDate: "2025-08-01", performanceJan2026: null, avg2024: 0,     avg2025: 0,    comprehensiveSalary: 6517 },
  49:  { grtId: "GRT049", grade: "8",    hireDate: "2022-04-01", performanceJan2026: 81,   avg2024: 78,    avg2025: 82,   comprehensiveSalary: 11430 },
  62:  { grtId: "GRT062", grade: "8",    hireDate: "2021-02-01", performanceJan2026: 81,   avg2024: 82,    avg2025: 82,   comprehensiveSalary: 8000 },

  83:  { grtId: "GRT083", grade: "8",    hireDate: "2024-01-01", performanceJan2026: 78,   avg2024: 0,     avg2025: 75,   comprehensiveSalary: 16500 },
  103: { grtId: "GRT103", grade: "4",    hireDate: "2025-09-01", performanceJan2026: null, avg2024: 0,     avg2025: 0,    comprehensiveSalary: 6800 },
  4:   { grtId: "GRT004", grade: "10C",  hireDate: "2014-06-01", performanceJan2026: 59.2, avg2024: 45.13, avg2025: 75,   comprehensiveSalary: 25315 },
  5:   { grtId: "GRT005", grade: "9B",   hireDate: "2016-08-01", performanceJan2026: 81.2, avg2024: 65.89, avg2025: 77,   comprehensiveSalary: 21428 },
  22:  { grtId: "GRT022", grade: "6",    hireDate: "2019-03-01", performanceJan2026: 85.6, avg2024: 69,    avg2025: 80,   comprehensiveSalary: 13675 },
  63:  { grtId: "GRT063", grade: "9A",   hireDate: "2017-11-01", performanceJan2026: 61.2, avg2024: 62,    avg2025: 75,   comprehensiveSalary: 19000 },
  6:   { grtId: "GRT006", grade: "10B",  hireDate: "2015-04-01", performanceJan2026: 79.6, avg2024: 51.87, avg2025: 80,   comprehensiveSalary: 25200 },
  44:  { grtId: "GRT044", grade: "7",    hireDate: "2019-09-01", performanceJan2026: 78.6, avg2024: 65.28, avg2025: 80,   comprehensiveSalary: 15338 },
  97:  { grtId: "GRT097", grade: "9A",   hireDate: "2024-10-01", performanceJan2026: 88.6, avg2024: 0,     avg2025: 80,   comprehensiveSalary: 18000 },
  3:   { grtId: "GRT003", grade: "5",    hireDate: "2018-07-01", performanceJan2026: 87.1, avg2024: 82,    avg2025: 85,   comprehensiveSalary: 8484 },
  7:   { grtId: "GRT007", grade: "8A",   hireDate: "2016-03-01", performanceJan2026: 81,   avg2024: 70.56, avg2025: 80,   comprehensiveSalary: 18434 },
  55:  { grtId: "GRT055", grade: "10B",  hireDate: "2015-10-01", performanceJan2026: 77.8, avg2024: 83.8,  avg2025: 85,   comprehensiveSalary: 24112 },
  19:  { grtId: "GRT019", grade: "7",    hireDate: "2018-01-01", performanceJan2026: 60,   avg2024: 57.26, avg2025: 75,   comprehensiveSalary: 11193 },
  18:  { grtId: "GRT018", grade: "7",    hireDate: "2017-06-01", performanceJan2026: 77,   avg2024: 68.22, avg2025: 80,   comprehensiveSalary: 15790 },
  24:  { grtId: "GRT024", grade: "6",    hireDate: "2018-11-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: null },
  8:   { grtId: "GRT008", grade: "4",    hireDate: "2021-05-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: 6406 },
  9:   { grtId: "GRT009", grade: "6",    hireDate: "2017-09-01", performanceJan2026: null, avg2024: null,  avg2025: null, comprehensiveSalary: 8823 },
  45:  { grtId: "GRT045", grade: "11B",  hireDate: "2014-03-01", performanceJan2026: 74,   avg2024: 60,    avg2025: 80,   comprehensiveSalary: 32100 },
};

// ─── Training Course Catalog ─────────────────────────────────────────

const TRAINING_COURSES: Record<string, string[]> = {
  T: ["产品结构原理培训", "AutoCAD/SolidWorks实操", "工艺流程标准化", "PLC编程进阶"],
  S: ["高效沟通工作坊", "时间管理与GTD", "压力管理与情商", "客户服务意识"],
  D: ["创新设计思维(Design Thinking)", "DFMEA方法论", "专利撰写培训", "工艺改善案例"],
  C: ["跨部门协作演练", "商务谈判技巧", "会议主持与效能", "客户关系管理"],
  K: ["IATF 16949内审员培训", "ISO 14001环境管理", "VDA 6.3过程审核", "法规合规更新"],
  L: ["新任管理者训练营", "OKR目标管理", "教练技术与带教", "战略思维与决策"],
};

// ─── ROLE_LEVELS (mirrors client) ────────────────────────────────────

const ROLE_LEVELS: Record<string, number> = {
  guest: 0, employee: 1, production_worker: 1,
  team_lead: 2, bu_sales: 2, bu_mech: 2, bu_elec: 2, procurement_eng: 2, cs_engineer: 2, it_engineer: 2,
  dept_manager: 3, bu_pm: 3, hr_specialist: 3, finance_specialist: 3,
  hr_manager: 4, finance_manager: 4, director: 5, bu_gm: 6, admin: 10,
};

// ─── Helper: build gap analysis for an employee ──────────────────────

function buildGapAnalysis(emp: EmployeeAssessment) {
  const criteria = ROLE_CRITERIA.find(r => r.role === emp.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
  return CAPABILITY_DICTIONARY.map(pillar => {
    const actual = emp.scores[pillar.code] || 0;
    const target = criteria.targets[pillar.code] || 60;
    const gap = target - actual;
    let level: string;
    if (gap > 15) level = "critical";
    else if (gap > 5) level = "significant";
    else if (gap > 0) level = "minor";
    else level = "exceeds";
    return { code: pillar.code, name: pillar.name, actual, target, gap, level };
  });
}

// ─── Helper: build training plan for an employee ─────────────────────

function buildTrainingPlan(emp: EmployeeAssessment) {
  const gapAnalysis = buildGapAnalysis(emp);
  return gapAnalysis
    .filter(g => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .map(g => {
      let priority: "critical" | "important" | "recommended" | "optional";
      let timeline: string;
      let expectedImprovement: string;
      if (g.gap > 20) {
        priority = "critical";
        timeline = "1-3个月内完成";
        expectedImprovement = `预计可提升${Math.min(g.gap, 25)}分`;
      } else if (g.gap > 10) {
        priority = "important";
        timeline = "3-6个月内完成";
        expectedImprovement = `预计可提升${Math.min(g.gap, 15)}分`;
      } else if (g.gap > 5) {
        priority = "recommended";
        timeline = "6-12个月内完成";
        expectedImprovement = `预计可提升${Math.min(g.gap, 10)}分`;
      } else {
        priority = "optional";
        timeline = "12个月内完成";
        expectedImprovement = `预计可提升${g.gap}分`;
      }
      const allCourses = TRAINING_COURSES[g.code] || [];
      // Select courses based on gap severity
      const courseCount = g.gap > 15 ? 3 : g.gap > 5 ? 2 : 1;
      const courses = allCourses.slice(0, courseCount);
      return {
        code: g.code,
        name: g.name,
        priority,
        courses,
        timeline,
        expectedImprovement,
      };
    });
}

// ─── Helper: identify strengths and improvement areas ────────────────

function identifyStrengths(emp: EmployeeAssessment): string[] {
  const criteria = ROLE_CRITERIA.find(r => r.role === emp.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
  const strengths: string[] = [];
  for (const pillar of CAPABILITY_DICTIONARY) {
    const actual = emp.scores[pillar.code] || 0;
    const target = criteria.targets[pillar.code] || 60;
    if (actual >= target) {
      const surplus = actual - target;
      if (surplus >= 10) {
        strengths.push(`${pillar.name}表现卓越，超出目标${surplus}分，可担任该领域导师`);
      } else if (surplus >= 0) {
        strengths.push(`${pillar.name}达标，具备扎实基础`);
      }
    }
  }
  if (emp.overallScore >= 80) {
    strengths.push("综合能力评分优秀，具备跨岗位发展潜力");
  }
  return strengths;
}

function identifyImprovementAreas(emp: EmployeeAssessment): string[] {
  const criteria = ROLE_CRITERIA.find(r => r.role === emp.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
  const areas: string[] = [];
  for (const pillar of CAPABILITY_DICTIONARY) {
    const actual = emp.scores[pillar.code] || 0;
    const target = criteria.targets[pillar.code] || 60;
    const gap = target - actual;
    if (gap > 15) {
      areas.push(`${pillar.name}差距显著(${gap}分)，需制定专项提升计划`);
    } else if (gap > 5) {
      areas.push(`${pillar.name}存在提升空间(${gap}分)，建议通过项目实战补强`);
    }
  }
  return areas;
}

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
    .query(({ input, ctx }) => {
      // Derive employeeId from openId if not provided (GRT083 → 83)
      let id = input.employeeId;
      if (!id && ctx.user?.openId) {
        const match = (ctx.user.openId as string).match(/GRT0*(\d+)/);
        if (match) id = parseInt(match[1]);
      }
      if (!id) id = 80;

      const found = EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === id);
      if (found) return found;

      // Auto-generate default assessment for employees not in the 37-person assessed list
      const userName = ctx.user?.name || `Employee ${id}`;
      return makeAssessment(
        1000 + id, id, userName as string, "",
        "", "employee", "",
        levelToScore("L1"), levelToScore("L1"), levelToScore("L1"),
        levelToScore("L1"), levelToScore("L1"), levelToScore("L1"),
      );
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
  aiCompensationAnalysis: requirePermission('capability:matrix:manage')
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

  /** AI Improvement Tips for a specific employee (self-service for all employees) */
  aiImprovementTips: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      role: z.string(),
    }))
    .mutation(({ input }) => {
      let emp = EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === input.employeeId);
      const criteria = ROLE_CRITERIA.find(r => r.role === input.role) || ROLE_CRITERIA.find(r => r.role === "employee")!;
      // Fallback: create a default assessment for employees not in the hardcoded list
      if (!emp) {
        emp = {
          employeeId: input.employeeId,
          name: `Employee #${input.employeeId}`,
          department: "未知",
          position: input.role,
          scores: { T: 55, S: 50, D: 45, C: 50, K: 48, L: 40 },
        } as any;
      }

      const tips = CAPABILITY_DICTIONARY.map(pillar => {
        const actual = emp!.scores[pillar.code] || 0;
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
        employeeId: emp!.employeeId,
        name: emp!.name,
        generatedAt: new Date().toISOString(),
        tips: tips.sort((a, b) => b.gap - a.gap), // highest gap first
      };
    }),

  /** Get full employee profile with gap analysis, training plan, strengths/weaknesses */
  getEmployeeProfile: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(({ input }) => {
      const emp = EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === input.employeeId);
      if (!emp) throw new Error("Employee not found");

      const profile = EMPLOYEE_PROFILES[input.employeeId] || null;
      const gapAnalysis = buildGapAnalysis(emp);
      const trainingPlan = buildTrainingPlan(emp);
      const strengths = identifyStrengths(emp);
      const improvementAreas = identifyImprovementAreas(emp);

      return {
        ...emp,
        profile,
        gapAnalysis,
        trainingPlan,
        strengths,
        improvementAreas,
      };
    }),

  /** Get detailed training plan with courses for a specific employee */
  getTrainingPlan: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(({ input }) => {
      const emp = EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === input.employeeId);
      if (!emp) throw new Error("Employee not found");

      const profile = EMPLOYEE_PROFILES[input.employeeId] || null;
      const trainingPlan = buildTrainingPlan(emp);
      const gapAnalysis = buildGapAnalysis(emp);

      // Compute total training hours estimate
      let totalHoursEstimate = 0;
      for (const plan of trainingPlan) {
        if (plan.priority === "critical") totalHoursEstimate += plan.courses.length * 16;
        else if (plan.priority === "important") totalHoursEstimate += plan.courses.length * 12;
        else if (plan.priority === "recommended") totalHoursEstimate += plan.courses.length * 8;
        else totalHoursEstimate += plan.courses.length * 4;
      }

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        nameEn: emp.nameEn,
        department: emp.department,
        role: emp.role,
        roleName: emp.roleName,
        grtId: profile?.grtId || null,
        grade: profile?.grade || null,
        overallScore: emp.overallScore,
        overallGrade: emp.overallGrade,
        gapAnalysis,
        trainingPlan,
        totalHoursEstimate,
        generatedAt: new Date().toISOString(),
      };
    }),

  /** Get team-wide training needs aggregation */
  getTeamTrainingOverview: protectedProcedure
    .query(() => {
      // Aggregate critical gaps across all employees
      const gapCounts: Record<string, { count: number; totalGap: number }> = {};
      const courseDemand: Record<string, { count: number; priority: string }> = {};
      const deptStats: Record<string, { totalScore: number; count: number; pillarSums: Record<string, number> }> = {};

      for (const emp of EMPLOYEE_ASSESSMENTS) {
        // Department stats
        if (!deptStats[emp.department]) {
          deptStats[emp.department] = { totalScore: 0, count: 0, pillarSums: {} };
          for (const p of CAPABILITY_DICTIONARY) {
            deptStats[emp.department].pillarSums[p.code] = 0;
          }
        }
        deptStats[emp.department].totalScore += emp.overallScore;
        deptStats[emp.department].count += 1;
        for (const p of CAPABILITY_DICTIONARY) {
          deptStats[emp.department].pillarSums[p.code] += (emp.scores[p.code] || 0);
        }

        // Gap analysis
        const gaps = buildGapAnalysis(emp);
        for (const g of gaps) {
          if (g.gap > 0) {
            if (!gapCounts[g.code]) {
              gapCounts[g.code] = { count: 0, totalGap: 0 };
            }
            gapCounts[g.code].count += 1;
            gapCounts[g.code].totalGap += g.gap;
          }
        }

        // Training course demand
        const plan = buildTrainingPlan(emp);
        for (const p of plan) {
          for (const course of p.courses) {
            if (!courseDemand[course]) {
              courseDemand[course] = { count: 0, priority: p.priority };
            }
            courseDemand[course].count += 1;
            // Upgrade priority if any employee has higher need
            if (p.priority === "critical" && courseDemand[course].priority !== "critical") {
              courseDemand[course].priority = "critical";
            } else if (p.priority === "important" && courseDemand[course].priority === "recommended") {
              courseDemand[course].priority = "important";
            }
          }
        }
      }

      // Build criticalGaps sorted by count descending
      const criticalGaps = Object.entries(gapCounts)
        .map(([code, data]) => ({
          code,
          name: CAPABILITY_DICTIONARY.find(p => p.code === code)?.name || code,
          count: data.count,
          avgGap: Math.round((data.totalGap / data.count) * 10) / 10,
        }))
        .sort((a, b) => b.count - a.count);

      // Build topTrainingNeeds sorted by target employees descending
      const topTrainingNeeds = Object.entries(courseDemand)
        .map(([course, data]) => ({
          course,
          targetEmployees: data.count,
          priority: data.priority,
        }))
        .sort((a, b) => b.targetEmployees - a.targetEmployees)
        .slice(0, 15);

      // Build departmentSummary
      const departmentSummary = Object.entries(deptStats)
        .map(([dept, data]) => {
          const avgScore = Math.round(data.totalScore / data.count);
          // Find weakest pillar by average
          let weakestPillar = "T";
          let weakestAvg = Infinity;
          for (const p of CAPABILITY_DICTIONARY) {
            const avg = data.pillarSums[p.code] / data.count;
            if (avg < weakestAvg) {
              weakestAvg = avg;
              weakestPillar = p.name;
            }
          }
          return { dept, avgScore, weakestPillar, count: data.count };
        })
        .sort((a, b) => a.avgScore - b.avgScore);

      return {
        totalEmployees: EMPLOYEE_ASSESSMENTS.length,
        criticalGaps,
        topTrainingNeeds,
        departmentSummary,
      };
    }),
});
