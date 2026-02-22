/**
 * M0-M12 Dynamic Form Seeder (Pure TypeScript — no Python dependency)
 *
 * Pipeline:
 * 1. Reads data/form_structure_2026-02-17.csv via papaparse
 * 2. Groups rows by (阶段, 表单ID), maps Chinese types → English
 * 3. Upserts 25 form templates into oa_form_templates via a transaction
 *
 * Usage:
 *   npx tsx scripts/seed_m_forms.ts
 */

import Papa from "papaparse";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(PROJECT_ROOT, "data", "form_structure_2026-02-17.csv");

// ─── Chinese → English type mapping ─────────────────────────

const TYPE_MAP: Record<string, string> = {
  "文本":     "text",
  "多行文本": "textarea",
  "富文本":   "rich_text",
  "数字":     "number",
  "日期":     "date",
  "日期时间": "datetime",
  "单选":     "select",
  "多选":     "multiselect",
  "复选":     "checkbox",
  "文件":     "file",
  "人员":     "user",
  "部门":     "department",
  "地址":     "address",
};

// ─── Stage metadata ─────────────────────────────────────────

const STAGE_NAMES: Record<string, string> = {
  M0: "商机识别", M1: "需求确认", M2: "方案设计", M3: "立项评审",
  M4: "方案冻结", M5: "详细设计", M6: "采购制造", M7: "装配调试",
  M8: "FAT验收",  M9: "发货安装", M10: "现场调试", M11: "SAT验收",
  M12: "项目结项",
};

const STAGE_NAMES_EN: Record<string, string> = {
  M0: "Opportunity Identification", M1: "Requirements Confirmation",
  M2: "Solution Design",            M3: "Project Approval",
  M4: "Design Freeze",              M5: "Detailed Design",
  M6: "Procurement & Manufacturing", M7: "Assembly & Commissioning",
  M8: "Factory Acceptance Test",     M9: "Shipping & Installation",
  M10: "Site Commissioning",         M11: "Site Acceptance Test",
  M12: "Project Closure",
};

const STAGE_CATEGORY: Record<string, string> = {
  M0: "general", M1: "general",
  M2: "project", M3: "project", M4: "project", M5: "project",
  M6: "project", M7: "project", M8: "project", M9: "project",
  M10: "project", M11: "project", M12: "project",
};

const STAGE_ICON: Record<string, string> = {
  M0: "users",        M1: "clipboard-list", M2: "pen-tool",
  M3: "git-branch",   M4: "lock",           M5: "ruler",
  M6: "factory",      M7: "wrench",         M8: "check-square",
  M9: "truck",        M10: "settings",      M11: "shield-check",
  M12: "flag",
};

const STAGE_COLOR: Record<string, string> = {
  M0: "blue-500",    M1: "cyan-500",    M2: "teal-500",
  M3: "green-500",   M4: "emerald-600", M5: "lime-500",
  M6: "amber-500",   M7: "orange-500",  M8: "red-500",
  M9: "purple-500",  M10: "violet-500", M11: "indigo-500",
  M12: "gray-600",
};

// ─── Chinese label → camelCase field name mapping ───────────

const FIELD_NAME_MAP: Record<string, string> = {
  "客户名称": "customerName",
  "客户编码": "customerCode",
  "行业领域": "industry",
  "联系人": "contactPerson",
  "联系电话": "contactPhone",
  "联系邮箱": "contactEmail",
  "客户等级": "customerLevel",
  "所属区域": "region",
  "商机名称": "opportunityName",
  "预计金额": "expectedAmount",
  "预计成交日": "expectedCloseDate",
  "商机来源": "opportunitySource",
  "商机阶段": "opportunityStage",
  "负责人": "owner",
  "备注": "remarks",
  "项目名称": "projectName",
  "项目编号": "projectCode",
  "项目经理": "projectManager",
  "产品类型": "productType",
  "技术要求": "technicalRequirements",
  "性能指标": "performanceMetrics",
  "工艺要求": "processRequirements",
  "交付期限": "deliveryDeadline",
  "预算范围": "budgetRange",
  "分析人": "analyst",
  "技术方案概述": "solutionOverview",
  "关键技术难点": "technicalChallenges",
  "技术风险等级": "riskLevel",
  "可行性结论": "feasibilityConclusion",
  "所需资源": "requiredResources",
  "方案版本": "designVersion",
  "设计人": "designer",
  "总体方案描述": "overallDesign",
  "机械方案": "mechanicalDesign",
  "电气方案": "electricalDesign",
  "软件方案": "softwareDesign",
  "BOM初稿": "bomDraft",
  "预计成本": "estimatedCost",
  "报价金额": "quotationAmount",
  "报价有效期": "quotationValidity",
  "付款条件": "paymentTerms",
  "交货周期": "deliveryCycle",
  "质保条款": "warrantyTerms",
  "合同金额": "contractAmount",
  "毛利率": "grossMargin",
  "技术评审结论": "technicalReviewConclusion",
  "商务评审结论": "businessReviewConclusion",
  "综合评审结论": "overallReviewConclusion",
  "评审意见": "reviewComments",
  "会议日期": "meetingDate",
  "参会人员": "attendees",
  "项目里程碑计划": "milestonesPlan",
  "资源分配方案": "resourceAllocation",
  "风险识别": "riskIdentification",
  "待办事项": "actionItems",
  "冻结版本": "frozenVersion",
  "冻结日期": "freezeDate",
  "机械设计状态": "mechDesignStatus",
  "电气设计状态": "elecDesignStatus",
  "BOM冻结确认": "bomFreezeConfirm",
  "遗留问题": "openIssues",
  "确认签字": "signatureConfirm",
  "检查日期": "inspectionDate",
  "机械图纸完成度": "mechDrawingProgress",
  "电气图纸完成度": "elecDrawingProgress",
  "软件开发进度": "softwareProgress",
  "FMEA完成状态": "fmeaStatus",
  "控制计划状态": "controlPlanStatus",
  "设计评审结论": "designReviewConclusion",
  "BOM版本": "bomVersion",
  "物料总数": "totalMaterialCount",
  "采购件数量": "purchasedPartCount",
  "自制件数量": "inHousePartCount",
  "BOM成本合计": "bomTotalCost",
  "审批意见": "approvalComments",
  "工单编号": "workOrderCode",
  "计划开始日期": "plannedStartDate",
  "计划完成日期": "plannedEndDate",
  "优先级": "priority",
  "生产负责人": "productionManager",
  "申请编号": "requestCode",
  "物料名称": "materialName",
  "物料编码": "materialCode",
  "数量": "quantity",
  "预计单价": "estimatedUnitPrice",
  "需求日期": "requiredDate",
  "供应商建议": "suggestedSupplier",
  "检验编号": "inspectionCode",
  "供应商名称": "supplierName",
  "送检数量": "submittedQty",
  "抽检数量": "sampledQty",
  "合格数量": "qualifiedQty",
  "不合格数量": "unqualifiedQty",
  "检验结论": "inspectionConclusion",
  "检验员": "inspector",
  "工位编号": "stationCode",
  "装配日期": "assemblyDate",
  "机械装配状态": "mechAssemblyStatus",
  "电气接线状态": "elecWiringStatus",
  "气动/液压状态": "pneumaticStatus",
  "安全防护状态": "safetyGuardStatus",
  "异常记录": "anomalyLog",
  "调试日期": "debugDate",
  "调试工程师": "debugEngineer",
  "调试项目": "debugItem",
  "目标参数": "targetParams",
  "实际结果": "actualResult",
  "是否达标": "meetsTarget",
  "问题及处理": "issueResolution",
  "测试开始日期": "testStartDate",
  "测试结束日期": "testEndDate",
  "测试负责人": "testLead",
  "客户方代表": "customerRepresentative",
  "测试项目清单": "testItemList",
  "验收标准": "acceptanceCriteria",
  "测试日期": "testDate",
  "测试项目": "testItem",
  "测试结果": "testResult",
  "实测数据": "actualData",
  "偏差说明": "deviationNote",
  "客户签字确认": "customerSignOff",
  "发货日期": "shipmentDate",
  "收货地址": "deliveryAddress",
  "运输方式": "transportMode",
  "包装清单": "packingList",
  "随机文件清单": "documentList",
  "发货负责人": "shipmentManager",
  "安装地点": "installationSite",
  "安装团队": "installationTeam",
  "场地要求": "siteRequirements",
  "安全注意事项": "safetyNotes",
  "客户方配合人": "customerLiaison",
  "调试内容": "debugContent",
  "调试结果": "debugResult",
  "明日计划": "tomorrowPlan",
  "验收日期": "acceptanceDate",
  "客户方验收人": "customerAcceptor",
  "我方负责人": "ourRepresentative",
  "验收标准清单": "acceptanceCriteriaList",
  "性能指标要求": "performanceRequirements",
  "验收结论": "acceptanceConclusion",
  "遗留问题及整改计划": "openIssuesAndPlan",
  "实际完成日期": "actualEndDate",
  "实际成本": "actualCost",
  "利润率": "profitMargin",
  "项目总结": "projectSummary",
  "经验教训": "lessonsLearned",
  "改进建议": "improvementSuggestions",
  "调查日期": "surveyDate",
  "产品质量评分": "qualityScore",
  "交付及时性评分": "deliveryScore",
  "服务态度评分": "serviceScore",
  "技术支持评分": "techSupportScore",
  "综合满意度": "overallSatisfaction",
  "改进意见": "improvementFeedback",
  "产品名称": "productName",
};

// ─── Types ──────────────────────────────────────────────────

interface CsvRow {
  "阶段": string;
  "表单ID": string;
  "表单名称": string;
  "字段名称": string;
  "字段类型": string;
  "是否必填": string;
  "选项值": string;
  "分组": string;
  "帮助文本": string;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  group?: string;
  helpText?: string;
  validation?: Record<string, unknown>;
}

interface ParsedForm {
  templateCode: string;
  templateName: string;
  templateNameEn: string;
  description: string;
  stage: string;
  formId: string;
  category: string;
  icon: string;
  color: string;
  fields: FormField[];
  fieldCount: number;
}

interface ParsedOutput {
  version: string;
  totalForms: number;
  totalFields: number;
  forms: ParsedForm[];
}

// ─── Step 1: Parse CSV directly ─────────────────────────────

function sanitizeFieldName(label: string): string {
  if (FIELD_NAME_MAP[label]) return FIELD_NAME_MAP[label];
  // Fallback: generate a safe name
  const clean = label.replace(/[^\w]/g, "_");
  return `field_${clean}`;
}

function parseOptions(optionsStr: string): { value: string; label: string }[] {
  if (!optionsStr || !optionsStr.trim()) return [];
  return optionsStr.split("/").filter(p => p.trim()).map(p => ({
    value: p.trim(),
    label: p.trim(),
  }));
}

function parseCsvToForms(): ParsedOutput {
  console.log("[1/2] Parsing CSV with papaparse...");

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found: ${CSV_PATH}`);
  }

  // Read and strip BOM
  let content = fs.readFileSync(CSV_PATH, "utf-8");
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const parsed = Papa.parse<CsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.warn(`  CSV parse warnings: ${parsed.errors.length}`);
    for (const err of parsed.errors.slice(0, 3)) {
      console.warn(`    Row ${err.row}: ${err.message}`);
    }
  }

  // Group rows by (stage, formId) — Map preserves insertion order
  const formMap = new Map<string, {
    stage: string;
    formId: string;
    formName: string;
    fields: FormField[];
  }>();

  for (const row of parsed.data) {
    const stage = (row["阶段"] || "").trim();
    const formId = (row["表单ID"] || "").trim();
    const formName = (row["表单名称"] || "").trim();
    const fieldName = (row["字段名称"] || "").trim();
    const fieldType = (row["字段类型"] || "文本").trim();
    const required = (row["是否必填"] || "否").trim() === "是";
    const optionsStr = (row["选项值"] || "").trim();
    const group = (row["分组"] || "").trim();
    const helpText = (row["帮助文本"] || "").trim();

    if (!stage || !formId || !fieldName) continue;

    const key = `${stage}::${formId}`;
    if (!formMap.has(key)) {
      formMap.set(key, { stage, formId, formName, fields: [] });
    }

    const mappedType = TYPE_MAP[fieldType] || "text";

    const fieldDef: FormField = {
      name: sanitizeFieldName(fieldName),
      label: fieldName,
      type: mappedType,
      required,
    };

    // Add options for select/multiselect
    if ((mappedType === "select" || mappedType === "multiselect" || mappedType === "radio") && optionsStr) {
      fieldDef.options = parseOptions(optionsStr);
    }

    if (group) fieldDef.group = group;
    if (helpText) fieldDef.helpText = helpText;

    // Validation rules for number fields
    if (mappedType === "number") {
      if (helpText.includes("百分比")) {
        fieldDef.validation = { min: 0, max: 100 };
      } else if (helpText.includes("1-10分")) {
        fieldDef.validation = { min: 1, max: 10 };
      } else if (helpText.includes("单位")) {
        fieldDef.validation = { min: 0 };
      }
    }

    formMap.get(key)!.fields.push(fieldDef);
  }

  // Build ParsedForm[] output
  const forms: ParsedForm[] = [];
  let totalFields = 0;

  for (const [, formData] of formMap) {
    const { stage, formId, formName, fields } = formData;
    const templateCode = formId.replace(/-/g, "_").toUpperCase();

    forms.push({
      templateCode,
      templateName: formName,
      templateNameEn: `${stage} ${formName}`,
      description: `${STAGE_NAMES[stage] || stage}(${stage})阶段 — ${formName}`,
      stage,
      formId,
      category: STAGE_CATEGORY[stage] || "project",
      icon: STAGE_ICON[stage] || "file-text",
      color: STAGE_COLOR[stage] || "gray-500",
      fields,
      fieldCount: fields.length,
    });

    totalFields += fields.length;
  }

  console.log(`  Found ${forms.length} forms, ${totalFields} fields`);
  console.log(`  Stages: ${[...new Set(forms.map(f => f.stage))].join(", ")}`);

  return {
    version: "1.0",
    totalForms: forms.length,
    totalFields,
    forms,
  };
}

// ─── Step 2: Upsert to database ─────────────────────────────

async function upsertToDB(data: ParsedOutput): Promise<void> {
  console.log("[2/2] Upserting to oa_form_templates...");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("  Connected to database.");

  try {
    await client.query("BEGIN");

    let inserted = 0;
    let updated = 0;

    for (const form of data.forms) {
      // Check if template already exists
      const existing = await client.query(
        "SELECT id FROM oa_form_templates WHERE template_code = $1 LIMIT 1",
        [form.templateCode],
      );

      const fieldsJson = JSON.stringify(form.fields);
      const now = new Date().toISOString();

      // Build default approval flow (submitter supervisor → department head)
      const approvalFlow = JSON.stringify({
        steps: [
          {
            stepName: "直属上级审批",
            stepNameEn: "Supervisor Approval",
            approverType: "submitter_supervisor",
          },
          {
            stepName: "部门负责人审批",
            stepNameEn: "Dept Head Approval",
            approverType: "department_head",
            approverDepartmentLevel: 1,
          },
        ],
        allowWithdraw: true,
        autoApproveIfNoApprover: false,
      });

      if (existing.rows.length > 0) {
        // Update existing template
        await client.query(
          `UPDATE oa_form_templates
           SET template_name = $1,
               template_name_en = $2,
               description = $3,
               category = $4,
               icon = $5,
               color = $6,
               fields = $7::jsonb,
               approval_flow = $8::jsonb,
               is_active = true,
               is_system = true,
               updated_at = $9
           WHERE template_code = $10`,
          [
            form.templateName,
            form.templateNameEn,
            form.description,
            form.category,
            form.icon,
            form.color,
            fieldsJson,
            approvalFlow,
            now,
            form.templateCode,
          ],
        );
        updated++;
      } else {
        // Insert new template
        await client.query(
          `INSERT INTO oa_form_templates
             (template_code, template_name, template_name_en, description,
              category, icon, color, fields, approval_flow,
              version, is_active, is_system, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, 1, true, true, $10, $10)`,
          [
            form.templateCode,
            form.templateName,
            form.templateNameEn,
            form.description,
            form.category,
            form.icon,
            form.color,
            fieldsJson,
            approvalFlow,
            now,
          ],
        );
        inserted++;
      }
    }

    await client.query("COMMIT");
    console.log(
      `  Done: ${inserted} inserted, ${updated} updated (${data.totalForms} total)`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log("=== M0-M12 Dynamic Form Seeder (TypeScript) ===\n");

  try {
    // Step 1: Parse CSV directly (no Python)
    const data = parseCsvToForms();

    // Step 2: Upsert to DB
    await upsertToDB(data);

    console.log("\n=== Seed complete ===");
  } catch (err: any) {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
  }
}

main();
