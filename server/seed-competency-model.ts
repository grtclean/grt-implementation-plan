/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       GRT SYSTEM — TSDCKL Competency Model Seed Script          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Seeds the Six Competency Model (六大能力模型) from real XLSX:   ║
 * ║    Phase A: Parse 六大能力模型与评分细则.xlsx → 360 rubrics      ║
 * ║             (12 roles × 6 domains × 5 levels)                   ║
 * ║    Phase B: Seed ~44 skills across TSDCKL domains               ║
 * ║    Phase C: Employee assessments from real user roster           ║
 * ║                                                                 ║
 * ║  Source XLSX Sheets:                                            ║
 * ║    1. 六大能力模型定义            — T/S/D/C/K/L definitions     ║
 * ║    2. 事业部经理L1-L5评分细则     — 1 role (7 cols, no 岗位)    ║
 * ║    3. 事业部成员L1-L5评分细则     — 4 roles (8 cols, merged)    ║
 * ║    4. 职能和支持类岗位L1-L5评分细则   — 2 roles                 ║
 * ║    5. 职能和支持类岗位L1-L5评分细则(2) — 5 roles                ║
 * ║                                                                 ║
 * ║  12 Job Roles:                                                  ║
 * ║    事业部经理, 机械研发, 电气研发, 销售与项目, 采购与项目,       ║
 * ║    供应链工程（仓库）, 市场, IT/EHS, 董事长助理, HR, 行政前台, 财务 ║
 * ║                                                                 ║
 * ║  Run:  npx tsx server/seed-competency-model.ts                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { users } from "../drizzle/schema";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require("xlsx") as typeof import("xlsx");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  competencyRubrics,
  skillDictionary,
  employeeCapabilities,
  employeeDomainScores,
} from "../drizzle/hr-competence-schema";

type Domain = "T" | "S" | "D" | "C" | "K" | "L";
const DOMAINS: Domain[] = ["T", "S", "D", "C", "K", "L"];

// ══════════════════════════════════════════════════════
// Phase A: Parse real XLSX → Rubrics
// ══════════════════════════════════════════════════════

interface RubricRow {
  jobRole: string;
  domain: Domain;
  level: number;
  description: string;
}

/**
 * Resolve merged cells in a worksheet.
 * For each merged region, propagate the top-left cell value to all cells in the region.
 */
function fillMergedCells(ws: any): void {
  if (!ws["!merges"]) return;
  for (const merge of ws["!merges"]) {
    const topLeftAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const val = ws[topLeftAddr]?.v;
    if (val === undefined && val !== 0) continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) {
          ws[addr] = { t: "s", v: val };
        }
      }
    }
  }
}

/**
 * Parse level string "L1" → 1, "L2" → 2, etc.
 */
function parseLevel(s: string): number {
  const m = /L(\d)/i.exec(String(s).trim());
  return m ? parseInt(m[1]) : 0;
}

/**
 * Parse Sheet 2: 事业部经理L1-L5评分细则
 * Structure: 7 cols — 等级, T, S, D, C, K, L  (no 岗位 column, single role)
 * Row 0 = title, Row 1 = headers, Rows 2-6 = L1-L5
 */
function parseManagerSheet(ws: any): RubricRow[] {
  const rows: RubricRow[] = [];
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const jobRole = "事业部经理";

  // Data rows start at index 2 (after title + header)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const level = parseLevel(String(row[0]));
    if (level < 1 || level > 5) continue;

    // Columns: 0=等级, 1=T, 2=S, 3=D, 4=C, 5=K, 6=L
    DOMAINS.forEach((domain, idx) => {
      const desc = row[idx + 1];
      if (desc && String(desc).trim()) {
        rows.push({ jobRole, domain, level, description: String(desc).trim() });
      }
    });
  }
  return rows;
}

/**
 * Parse sheets with 8 columns: 岗位, 等级, T, S, D, C, K, L
 * Handles merged cells on 岗位 column (role spans 5 rows for L1-L5)
 */
function parseMemberSheet(ws: any, hasTitle: boolean): RubricRow[] {
  fillMergedCells(ws);
  const rows: RubricRow[] = [];
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  // Find header row (first row containing "等级")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row && row.some((c: any) => String(c).includes("等级"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return rows;

  let currentRole = "";
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every((c: any) => !c && c !== 0)) continue;

    // Column 0 = 岗位 (may be filled from merged cell)
    if (row[0] && String(row[0]).trim()) {
      currentRole = String(row[0]).trim();
    }
    if (!currentRole) continue;

    // Column 1 = 等级
    const level = parseLevel(String(row[1] || ""));
    if (level < 1 || level > 5) continue;

    // Columns 2-7 = T, S, D, C, K, L
    DOMAINS.forEach((domain, idx) => {
      const desc = row[idx + 2];
      if (desc && String(desc).trim()) {
        rows.push({ jobRole: currentRole, domain, level, description: String(desc).trim() });
      }
    });
  }
  return rows;
}

/**
 * Parse all sheets from the xlsx file and return all rubric rows.
 */
function parseRubricsFromXlsx(filePath: string): RubricRow[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`[XLSX] File not found: ${filePath}`);
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const allRubrics: RubricRow[] = [];

  console.log(`  [XLSX] Found ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(", ")}`);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];

    if (sheetName === "六大能力模型定义") {
      // Skip — this is the domain definition sheet, not rubrics
      console.log(`  [XLSX] Skipping definition sheet: ${sheetName}`);
      continue;
    }

    if (sheetName.includes("事业部经理")) {
      // Sheet 2: Single role, 7 columns (no 岗位)
      const rows = parseManagerSheet(ws);
      console.log(`  [XLSX] ${sheetName}: ${rows.length} rubrics extracted`);
      allRubrics.push(...rows);
    } else {
      // Sheets 3, 4, 5: Multiple roles, 8 columns with merged 岗位
      const hasTitle = sheetName.includes("成员");
      const rows = parseMemberSheet(ws, hasTitle);
      console.log(`  [XLSX] ${sheetName}: ${rows.length} rubrics extracted`);
      allRubrics.push(...rows);
    }
  }

  // Deduplicate by (jobRole, domain, level) — keep last occurrence
  const seen = new Map<string, RubricRow>();
  for (const r of allRubrics) {
    seen.set(`${r.jobRole}|${r.domain}|${r.level}`, r);
  }
  const deduped = Array.from(seen.values());

  // Report roles found
  const roles = [...new Set(deduped.map((r) => r.jobRole))];
  console.log(`  [XLSX] Total: ${deduped.length} unique rubrics across ${roles.length} roles`);
  console.log(`  [XLSX] Roles: ${roles.join(", ")}`);

  return deduped;
}

// ══════════════════════════════════════════════════════
// Phase B: Skill Dictionary Definitions (~44 skills)
// ══════════════════════════════════════════════════════

interface SkillDef {
  code: string;
  name: string;
  nameZh: string;
  domain: Domain;
  category: string;
  description: string;
  isCertifiable: boolean;
}

const SKILL_DEFINITIONS: SkillDef[] = [
  // T — Technical Power (硬核技术力) — derived from rubric mentions
  { code: "SOLIDWORKS", name: "SolidWorks Design", nameZh: "SolidWorks设计", domain: "T", category: "CAD/CAM", description: "3D mechanical design using SolidWorks (from 机械研发 L1 rubric)", isCertifiable: true },
  { code: "TIA_PORTAL", name: "TIA Portal PLC", nameZh: "TIA Portal PLC编程", domain: "T", category: "Automation", description: "Siemens TIA Portal PLC programming (from 电气研发 L2 rubric)", isCertifiable: true },
  { code: "ERP_OPERATION", name: "ERP Operation", nameZh: "ERP系统操作", domain: "T", category: "IT Systems", description: "ERP system operations — Tiansi/D365 (from 仓库 L1/采购 L1 rubrics)", isCertifiable: false },
  { code: "CRM_SYSTEM", name: "CRM System", nameZh: "CRM客户管理", domain: "T", category: "IT Systems", description: "CRM system (from 销售与项目 L1 rubric)", isCertifiable: false },
  { code: "CAD_DRAFTING", name: "CAD Drafting", nameZh: "CAD制图", domain: "T", category: "CAD/CAM", description: "2D/3D CAD drafting and BOM structure (from 机械研发 L1)", isCertifiable: true },
  { code: "PUMP_MOTOR_SELECT", name: "Pump/Motor Selection", nameZh: "泵/电机选型", domain: "T", category: "Mechanical", description: "Standard component selection and sizing (from 机械研发 L2)", isCertifiable: false },
  { code: "HMI_DESIGN", name: "HMI Design", nameZh: "HMI界面设计", domain: "T", category: "Automation", description: "Human-machine interface design (from 电气研发 L2)", isCertifiable: false },
  { code: "MRP_PLANNING", name: "MRP Planning", nameZh: "MRP物料计划", domain: "T", category: "Supply Chain", description: "Material requirements planning (from 供应链 L3 rubric)", isCertifiable: false },
  { code: "FINANCIAL_ACCOUNTING", name: "Financial Accounting", nameZh: "财务核算", domain: "T", category: "Finance", description: "Full-cycle accounting, AR/AP, tax filing (from 财务 L2 rubric)", isCertifiable: true },
  { code: "VIDEO_CONTENT", name: "Video/Content Creation", nameZh: "视频/内容制作", domain: "T", category: "Marketing", description: "Video editing, SEO, social media operations (from 市场 L1 rubric)", isCertifiable: false },

  // S — Soft Skills (软性通用力)
  { code: "PROBLEM_SOLVING", name: "Problem Solving", nameZh: "问题解决能力", domain: "S", category: "Analytical", description: "Root cause analysis and systematic resolution", isCertifiable: false },
  { code: "STRESS_MGMT", name: "Stress Management", nameZh: "压力管理", domain: "S", category: "Personal", description: "Performing under pressure in delivery/commissioning scenarios", isCertifiable: false },
  { code: "DATA_ANALYSIS", name: "Data Analysis", nameZh: "数据分析", domain: "S", category: "Analytical", description: "Data sensitivity and analytical insight (from 仓库/市场/HR rubrics)", isCertifiable: false },
  { code: "NEGOTIATION", name: "Negotiation", nameZh: "谈判技巧", domain: "S", category: "Interpersonal", description: "Effective negotiation — commercial and supplier (from 销售 L3/采购 L3)", isCertifiable: false },
  { code: "TIME_MGMT", name: "Time Management", nameZh: "时间管理", domain: "S", category: "Personal", description: "Effective prioritization and deadline management", isCertifiable: false },
  { code: "FAULT_DIAGNOSIS", name: "Fault Diagnosis", nameZh: "故障诊断", domain: "S", category: "Analytical", description: "Field troubleshooting — mechanical/electrical (from 电气研发 L2)", isCertifiable: false },
  { code: "PRESENTATION", name: "Presentation Skills", nameZh: "演讲汇报", domain: "S", category: "Interpersonal", description: "Effective presentation and public speaking", isCertifiable: false },
  { code: "COMMERCIAL_INSIGHT", name: "Commercial Insight", nameZh: "商业洞察力", domain: "S", category: "Analytical", description: "Business acumen and market opportunity sensing (from 事业部经理 L4)", isCertifiable: false },

  // D — Design & Innovation (设计与创新力)
  { code: "PROCESS_OPT", name: "Process Optimization", nameZh: "流程优化", domain: "D", category: "Improvement", description: "Lean process optimization and waste reduction", isCertifiable: false },
  { code: "MODULAR_DESIGN", name: "Modular Design", nameZh: "模块化设计", domain: "D", category: "Engineering", description: "Modular product architecture — 标准化平台 (from 机械研发 L3)", isCertifiable: false },
  { code: "SOLUTION_ARCH", name: "Solution Architecture", nameZh: "方案架构", domain: "D", category: "Engineering", description: "End-to-end technical solution design (from 销售 L3)", isCertifiable: false },
  { code: "DIGITAL_TWIN", name: "Digital Twin", nameZh: "数字孪生", domain: "D", category: "Digital", description: "Digital twin for commissioning (from 机械研发 L5/电气研发 L4)", isCertifiable: false },
  { code: "COST_REDUCTION", name: "Cost Reduction Design", nameZh: "降本设计", domain: "D", category: "Improvement", description: "DFMA/VA-VE — 板材利用率优化 (from 机械研发 L3)", isCertifiable: false },
  { code: "INNOVATION_MGMT", name: "Innovation Management", nameZh: "创新管理", domain: "D", category: "Improvement", description: "Patent design, new platform R&D (from 机械研发 L4)", isCertifiable: false },

  // C — Communication & Collaboration (沟通协作力)
  { code: "CROSS_DEPT", name: "Cross-Dept Coordination", nameZh: "跨部门协调", domain: "C", category: "Organizational", description: "Cross-department alignment (from 事业部经理 L3)", isCertifiable: false },
  { code: "CUSTOMER_COMM", name: "Customer Communication", nameZh: "客户沟通", domain: "C", category: "External", description: "Technical clarification meetings — Halms, BorgWarner (from 机械研发 L3)", isCertifiable: false },
  { code: "TECH_CLARIFICATION", name: "Technical Clarification", nameZh: "技术澄清", domain: "C", category: "Technical", description: "Customer FAT/SAT acceptance coordination (from 电气研发 L3)", isCertifiable: false },
  { code: "SUPPLIER_NEGO", name: "Supplier Negotiation", nameZh: "供应商谈判", domain: "C", category: "External", description: "Supplier relationship and joint development (from 采购 L3)", isCertifiable: false },
  { code: "CRISIS_MGMT", name: "Crisis Management", nameZh: "危机管理", domain: "C", category: "Organizational", description: "Major quality incident coordination (from 事业部经理 L3)", isCertifiable: false },
  { code: "REPORT_WRITING", name: "Report Writing", nameZh: "报告撰写", domain: "C", category: "Technical", description: "Technical report and documentation (from 董事长助理 L3)", isCertifiable: false },

  // K — Knowledge & Standards (专业标准力)
  { code: "ISO_16232", name: "ISO 16232 Cleanliness", nameZh: "ISO 16232清洁度", domain: "K", category: "Quality Standards", description: "Automotive cleanliness standard (from 机械研发 L3 rubric)", isCertifiable: true },
  { code: "VDA_6_3", name: "VDA 6.3 Process Audit", nameZh: "VDA 6.3过程审核", domain: "K", category: "Quality Standards", description: "Process audit per VDA 6.3", isCertifiable: true },
  { code: "ISO_9001", name: "ISO 9001 QMS", nameZh: "ISO 9001质量管理", domain: "K", category: "Quality Standards", description: "Quality management (from 机械研发 L1 rubric)", isCertifiable: true },
  { code: "CE_UL_CERT", name: "CE/UL Certification", nameZh: "CE/UL产品认证", domain: "K", category: "Product Standards", description: "CE/UL certification — mechanical safety (from 电气研发 L3)", isCertifiable: true },
  { code: "IATF_16949", name: "IATF 16949", nameZh: "IATF 16949汽车质量", domain: "K", category: "Quality Standards", description: "Automotive quality management system", isCertifiable: true },
  { code: "LEAN_MFG", name: "Lean Manufacturing", nameZh: "精益生产", domain: "K", category: "Methodology", description: "Lean principles — 事业部经理 L3 rubric", isCertifiable: true },
  { code: "CONTRACT_LAW", name: "Contract Law", nameZh: "合同法", domain: "K", category: "Legal", description: "Contract law and Incoterms (from 销售 L3/采购 L3)", isCertifiable: false },
  { code: "GDPR_PRIVACY", name: "GDPR / Data Privacy", nameZh: "GDPR数据保护", domain: "K", category: "Legal", description: "Data privacy (from 市场 L3 rubric)", isCertifiable: true },
  { code: "ISO_45001", name: "ISO 45001 Safety", nameZh: "ISO 45001安全管理", domain: "K", category: "Safety Standards", description: "Occupational safety standard (from IT/EHS L2 rubric)", isCertifiable: true },
  { code: "ACCOUNTING_STANDARDS", name: "Accounting Standards", nameZh: "会计准则", domain: "K", category: "Finance Standards", description: "Enterprise accounting standards and IFRS (from 财务 L3/L4)", isCertifiable: true },

  // L — Leadership & Strategy (领导与战略力)
  { code: "TEAM_LEAD", name: "Team Leadership", nameZh: "团队领导", domain: "L", category: "Management", description: "Direct team leadership (from 事业部经理 L2/销售 L3)", isCertifiable: false },
  { code: "MENTORING", name: "Mentoring", nameZh: "人才辅导", domain: "L", category: "People Development", description: "Coaching L1/L2 staff (from multiple L3+ rubrics)", isCertifiable: false },
  { code: "STRATEGIC_PLAN", name: "Strategic Planning", nameZh: "战略规划", domain: "L", category: "Strategy", description: "3-5 year strategy (from 事业部经理 L4)", isCertifiable: false },
  { code: "PNL_MGMT", name: "P&L Management", nameZh: "损益管理", domain: "L", category: "Finance", description: "Project/BU P&L responsibility (from 事业部经理 L2/销售 L4)", isCertifiable: false },
  { code: "CHANGE_MGMT", name: "Change Management", nameZh: "变革管理", domain: "L", category: "Strategy", description: "Organizational change and culture transformation (from L5 rubrics)", isCertifiable: false },
  { code: "TALENT_PIPELINE", name: "Talent Pipeline", nameZh: "人才梯队", domain: "L", category: "People Development", description: "Building successor pipeline (from 事业部经理 L3/HR L4)", isCertifiable: false },
];

// ══════════════════════════════════════════════════════
// Phase C: Employee role matching & assessment seeding
// ══════════════════════════════════════════════════════

interface RoleProfile {
  keywords: string[];
  jobRole: string;
  baseLevels: Record<Domain, [number, number]>;
}

const ROLE_PROFILES: RoleProfile[] = [
  { keywords: ["总经理", "事业部经理", "General Manager", "BU Manager", "Director"], jobRole: "事业部经理", baseLevels: { T: [3, 4], S: [4, 5], D: [3, 5], C: [4, 5], K: [3, 5], L: [4, 5] } },
  { keywords: ["机械", "Mechanical", "结构"], jobRole: "机械研发", baseLevels: { T: [3, 5], S: [2, 3], D: [3, 5], C: [2, 3], K: [3, 4], L: [1, 3] } },
  { keywords: ["电气", "Electrical", "PLC", "自动化", "Automation"], jobRole: "电气研发", baseLevels: { T: [3, 5], S: [2, 3], D: [3, 4], C: [2, 3], K: [3, 4], L: [1, 3] } },
  { keywords: ["销售", "Sales", "项目经理", "Project Manager", "PM"], jobRole: "销售与项目", baseLevels: { T: [1, 3], S: [3, 5], D: [2, 3], C: [4, 5], K: [2, 4], L: [2, 4] } },
  { keywords: ["采购", "Procurement", "Purchasing"], jobRole: "采购与项目", baseLevels: { T: [1, 3], S: [3, 4], D: [2, 3], C: [3, 5], K: [3, 4], L: [2, 3] } },
  { keywords: ["仓库", "Warehouse", "物流", "供应链", "Supply Chain", "Logistics"], jobRole: "供应链工程（仓库）", baseLevels: { T: [2, 3], S: [2, 3], D: [1, 3], C: [2, 3], K: [2, 4], L: [1, 3] } },
  { keywords: ["市场", "Marketing"], jobRole: "市场", baseLevels: { T: [1, 3], S: [3, 5], D: [3, 4], C: [4, 5], K: [2, 3], L: [2, 4] } },
  { keywords: ["IT", "EHS", "安全", "信息", "Infrastructure"], jobRole: "IT/EHS", baseLevels: { T: [3, 5], S: [2, 4], D: [2, 4], C: [2, 3], K: [3, 5], L: [1, 3] } },
  { keywords: ["助理", "Assistant", "秘书"], jobRole: "董事长助理", baseLevels: { T: [1, 3], S: [3, 5], D: [2, 3], C: [4, 5], K: [2, 4], L: [2, 4] } },
  { keywords: ["HR", "人力", "Human Resources", "人事"], jobRole: "HR", baseLevels: { T: [1, 3], S: [3, 5], D: [2, 3], C: [3, 5], K: [3, 4], L: [2, 4] } },
  { keywords: ["前台", "行政", "Admin", "Reception"], jobRole: "行政前台", baseLevels: { T: [1, 2], S: [3, 4], D: [1, 2], C: [3, 4], K: [1, 3], L: [1, 2] } },
  { keywords: ["财务", "Finance", "Accounting", "会计", "CFO"], jobRole: "财务", baseLevels: { T: [2, 4], S: [2, 4], D: [1, 3], C: [2, 3], K: [3, 5], L: [1, 3] } },
];

function matchJobRole(title: string, dept: string): RoleProfile {
  const combined = `${title} ${dept}`.toLowerCase();
  for (const profile of ROLE_PROFILES) {
    if (profile.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return profile;
    }
  }
  return {
    keywords: [],
    jobRole: "行政前台",
    baseLevels: { T: [1, 3], S: [2, 3], D: [1, 3], C: [2, 3], K: [1, 3], L: [1, 2] },
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randScore(level: number): string {
  const baseScore = (level - 1) * 20;
  return (baseScore + Math.random() * 20).toFixed(2);
}

// Skills relevant to each job role
const ROLE_SKILL_MAP: Record<string, string[]> = {
  "事业部经理": ["ERP_OPERATION", "STRATEGIC_PLAN", "PNL_MGMT", "TEAM_LEAD", "CHANGE_MGMT", "CRISIS_MGMT", "NEGOTIATION", "COMMERCIAL_INSIGHT"],
  "机械研发": ["SOLIDWORKS", "CAD_DRAFTING", "PUMP_MOTOR_SELECT", "MODULAR_DESIGN", "ISO_16232", "COST_REDUCTION"],
  "电气研发": ["TIA_PORTAL", "HMI_DESIGN", "CAD_DRAFTING", "DIGITAL_TWIN", "CE_UL_CERT", "FAULT_DIAGNOSIS"],
  "销售与项目": ["CRM_SYSTEM", "CUSTOMER_COMM", "NEGOTIATION", "PRESENTATION", "CONTRACT_LAW", "TEAM_LEAD", "SOLUTION_ARCH"],
  "采购与项目": ["ERP_OPERATION", "SUPPLIER_NEGO", "CONTRACT_LAW", "MRP_PLANNING", "COST_REDUCTION", "DATA_ANALYSIS"],
  "供应链工程（仓库）": ["ERP_OPERATION", "MRP_PLANNING", "LEAN_MFG", "DATA_ANALYSIS", "PROCESS_OPT", "TIME_MGMT"],
  "市场": ["CRM_SYSTEM", "PRESENTATION", "DATA_ANALYSIS", "CUSTOMER_COMM", "INNOVATION_MGMT", "REPORT_WRITING", "VIDEO_CONTENT", "GDPR_PRIVACY"],
  "IT/EHS": ["ERP_OPERATION", "ISO_45001", "PROBLEM_SOLVING", "PROCESS_OPT", "ISO_9001", "REPORT_WRITING"],
  "董事长助理": ["PRESENTATION", "REPORT_WRITING", "CROSS_DEPT", "TIME_MGMT", "DATA_ANALYSIS", "NEGOTIATION"],
  "HR": ["DATA_ANALYSIS", "NEGOTIATION", "MENTORING", "TALENT_PIPELINE", "CONTRACT_LAW", "TEAM_LEAD"],
  "行政前台": ["TIME_MGMT", "CUSTOMER_COMM", "REPORT_WRITING", "CROSS_DEPT", "STRESS_MGMT"],
  "财务": ["FINANCIAL_ACCOUNTING", "ACCOUNTING_STANDARDS", "DATA_ANALYSIS", "CONTRACT_LAW", "ERP_OPERATION", "REPORT_WRITING"],
};

// ══════════════════════════════════════════════════════
// CSV Import function (for when the CEO provides the file)
// ══════════════════════════════════════════════════════

export async function importAssessmentCSV(
  db: ReturnType<typeof drizzle>,
  filePath: string
) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n");
  if (lines.length < 2) {
    console.log("[CSV] File is empty or has no data rows.");
    return 0;
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const nameCol = headers.findIndex((h) => /^(Name|姓名|name)$/i.test(h));
  const domainCols: Record<Domain, number> = {} as any;
  for (const d of DOMAINS) {
    domainCols[d] = headers.findIndex(
      (h) => h === `${d}_Score` || h === `${d}_score` || h === d || h.startsWith(`${d}(`) || h.startsWith(`${d}（`)
    );
  }

  let importCount = 0;
  const period = new Date().toISOString().slice(0, 7);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = nameCol >= 0 ? cols[nameCol] : "";
    if (!name) continue;

    const [user] = await db.select().from(users).where(eq(users.name, name)).limit(1);
    if (!user) { console.log(`  [skip] User "${name}" not found`); continue; }

    for (const d of DOMAINS) {
      const colIdx = domainCols[d];
      if (colIdx < 0 || !cols[colIdx]) continue;
      const rawScore = parseFloat(cols[colIdx]);
      if (isNaN(rawScore)) continue;
      const level = Math.min(5, Math.max(1, Math.ceil(rawScore / 20)));

      await db.insert(employeeDomainScores).values({
        employeeId: user.id, domain: d, currentLevel: level,
        score: rawScore.toFixed(2), assessedBy: "csv_import", assessmentPeriod: period,
      }).onConflictDoUpdate({
        target: [employeeDomainScores.employeeId, employeeDomainScores.domain, employeeDomainScores.assessmentPeriod],
        set: { currentLevel: level, score: rawScore.toFixed(2), assessedBy: "csv_import", updatedAt: new Date() },
      });
      importCount++;
    }
  }
  console.log(`[CSV] Imported ${importCount} domain scores.`);
  return importCount;
}

// ══════════════════════════════════════════════════════
// Main Seed Execution
// ══════════════════════════════════════════════════════

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT TSDCKL Competency Model — Seed Script                ║");
  console.log("║   Source: 六大能力模型与评分细则.xlsx (CEO's TSDCKL Model)  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let rubricCount = 0;
  let skillCount = 0;
  let capabilityCount = 0;
  let scoreCount = 0;

  try {
    // ── Phase A: Parse XLSX → Seed Rubrics ──
    console.log("[Phase A] Parsing XLSX and seeding rubrics...");

    // Try multiple possible file locations
    const possiblePaths = [
      path.resolve(__dirname, "../docs/六大能力模型与评分细则.xlsx"),
      "C:/Users/GRT/Desktop/智慧会议数据/六大能力模型与评分细则.xlsx",
      path.resolve(__dirname, "../六大能力模型与评分细则.xlsx"),
    ];

    let rubricRows: RubricRow[] = [];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`  Found XLSX at: ${p}`);
        rubricRows = parseRubricsFromXlsx(p);
        break;
      }
    }

    if (rubricRows.length === 0) {
      console.log("  [WARN] XLSX not found. No rubrics to seed.");
    } else {
      for (const r of rubricRows) {
        const existing = await db.select().from(competencyRubrics)
          .where(and(
            eq(competencyRubrics.jobRole, r.jobRole),
            eq(competencyRubrics.domain, r.domain),
            eq(competencyRubrics.level, r.level)
          ));

        if (existing.length > 0) {
          // Update if description changed
          if (existing[0].description !== r.description) {
            await db.update(competencyRubrics)
              .set({ description: r.description })
              .where(eq(competencyRubrics.id, existing[0].id));
            rubricCount++;
          }
          continue;
        }

        await db.insert(competencyRubrics).values({
          jobRole: r.jobRole,
          domain: r.domain,
          level: r.level,
          description: r.description,
        });
        rubricCount++;
      }
    }
    console.log(`  => ${rubricCount} rubrics seeded/updated.\n`);

    // ── Phase B: Seed Skill Dictionary ──
    console.log("[Phase B] Seeding skill dictionary...");
    for (const skill of SKILL_DEFINITIONS) {
      const existing = await db.select().from(skillDictionary).where(eq(skillDictionary.code, skill.code));
      if (existing.length > 0) continue;

      await db.insert(skillDictionary).values({
        code: skill.code, name: skill.name, nameZh: skill.nameZh,
        domain: skill.domain, category: skill.category,
        description: skill.description, isCertifiable: skill.isCertifiable,
      });
      skillCount++;
    }
    console.log(`  => ${skillCount} skills seeded.\n`);

    // ── Phase C: Seed Employee Assessments ──
    console.log("[Phase C] Seeding employee assessments from user roster...");
    const allUsers = await db.select().from(users);
    console.log(`  Found ${allUsers.length} users in DB.`);

    const allSkills = await db.select().from(skillDictionary);
    const skillMap = new Map(allSkills.map((s) => [s.code, s.id]));
    const period = new Date().toISOString().slice(0, 7);

    for (const user of allUsers) {
      const profile = matchJobRole(user.email || "", user.name || "");

      // Seed domain scores
      for (const domain of DOMAINS) {
        const [min, max] = profile.baseLevels[domain];
        const level = randInt(min, max);

        const existing = await db.select().from(employeeDomainScores)
          .where(and(
            eq(employeeDomainScores.employeeId, user.id),
            eq(employeeDomainScores.domain, domain),
            eq(employeeDomainScores.assessmentPeriod, period)
          ));
        if (existing.length === 0) {
          await db.insert(employeeDomainScores).values({
            employeeId: user.id, domain, currentLevel: level,
            score: randScore(level), assessedBy: "seed", assessmentPeriod: period,
          });
          scoreCount++;
        }
      }

      // Seed skill-level capabilities
      const roleSkills = ROLE_SKILL_MAP[profile.jobRole] || [];
      for (const skillCode of roleSkills) {
        const skillId = skillMap.get(skillCode);
        if (!skillId) continue;

        const existing = await db.select().from(employeeCapabilities)
          .where(and(eq(employeeCapabilities.employeeId, user.id), eq(employeeCapabilities.skillId, skillId)));
        if (existing.length > 0) continue;

        const skillDef = SKILL_DEFINITIONS.find((s) => s.code === skillCode);
        const domainKey = skillDef?.domain || "T";
        const [min, max] = profile.baseLevels[domainKey];
        const currentLevel = randInt(min, max);
        const targetLevel = Math.min(5, currentLevel + randInt(0, 2));

        await db.insert(employeeCapabilities).values({
          employeeId: user.id, skillId, currentLevel, targetLevel, assessedBy: "seed",
          certifiedBy: skillDef?.isCertifiable ? (currentLevel >= 3 ? "Internal Audit" : null) : null,
          certificationExpiryDate: skillDef?.isCertifiable && currentLevel >= 3
            ? new Date(Date.now() + randInt(30, 365) * 86400000).toISOString().slice(0, 10)
            : null,
        });
        capabilityCount++;
      }
    }

    console.log(`  => ${scoreCount} domain scores seeded.`);
    console.log(`  => ${capabilityCount} employee capabilities seeded.\n`);

    // ── Summary ──
    const roles = rubricRows.length > 0 ? [...new Set(rubricRows.map((r) => r.jobRole))] : [];
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║                   SEED COMPLETE                             ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Rubrics (from XLSX):       ${String(rubricCount).padStart(4)}                           ║`);
    console.log(`║  Job Roles:                 ${String(roles.length).padStart(4)}                           ║`);
    console.log(`║  Skills:                    ${String(skillCount).padStart(4)}                           ║`);
    console.log(`║  Domain Scores:             ${String(scoreCount).padStart(4)}                           ║`);
    console.log(`║  Employee Capabilities:     ${String(capabilityCount).padStart(4)}                           ║`);
    console.log(`║  Users processed:           ${String(allUsers.length).padStart(4)}                           ║`);
    if (roles.length > 0) {
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log("║  Roles from XLSX:                                           ║");
      for (const r of roles) {
        console.log(`║    · ${r.padEnd(54)}║`);
      }
    }
    console.log("╚══════════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
