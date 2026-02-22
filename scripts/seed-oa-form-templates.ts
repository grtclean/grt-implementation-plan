/**
 * OA Dynamic Form Templates — Seed Script
 *
 * Seeds 5 demo form templates into `oa_form_templates`, 3 demo submissions
 * into `oa_form_submissions`, and approval records into `oa_form_approval_records`.
 *
 * Templates:
 *   1. TRAVEL_REQ     — 出差申请       (hr)
 *   2. PURCHASE_REQ   — 采购申请       (admin)
 *   3. EXPENSE_CLAIM  — 报销申请       (finance)
 *   4. SEAL_REQ       — 用印申请       (admin)
 *   5. PROJECT_INIT   — 项目立项申请   (project)
 *
 * Usage:
 *   npx tsx scripts/seed-oa-form-templates.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

// ---------------------------------------------------------------------------
// Helper — safe user accessor
// ---------------------------------------------------------------------------
interface UserRow {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  // ── Idempotency check ──
  const exists = await client.query(
    "SELECT id FROM oa_form_templates WHERE template_code = 'TRAVEL_REQ' LIMIT 1"
  );
  if (exists.rows.length > 0) {
    console.log("Already seeded (TRAVEL_REQ template exists). Skipping.");
    await client.end();
    return;
  }

  // ── Look up user IDs ──
  const userResult = await client.query("SELECT id, name FROM users LIMIT 5");
  const users: UserRow[] = userResult.rows.map((r: any) => ({
    id: r.id as number,
    name: r.name as string,
  }));
  if (users.length === 0) {
    console.error("No users found in database. Please seed users first.");
    await client.end();
    process.exit(1);
  }
  console.log(
    "Users:",
    users.map((u) => `${u.id}:${u.name}`).join(", ")
  );

  // Safe accessor — wraps around if fewer than 5 users
  const u = (idx: number) => users[idx % users.length];

  try {
    await client.query("BEGIN");

    // =========================================================================
    // 1. Form Templates (5 rows)
    // =========================================================================

    const TEMPLATE_INSERT = `
      INSERT INTO oa_form_templates
        (template_code, template_name, template_name_en, description, category, icon, color,
         fields, approval_flow, version, is_active, is_system, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, 1, true, true, $10, NOW(), NOW())
      RETURNING id
    `;

    // ── Template 1: 出差申请 (TRAVEL_REQ) ──
    const travelFields = [
      // group: 出差信息
      { name: "destination", label: "目的地", type: "text", required: true, group: "出差信息" },
      { name: "startDate", label: "出发日期", type: "date", required: true, group: "出差信息" },
      { name: "endDate", label: "返回日期", type: "date", required: true, group: "出差信息" },
      { name: "reason", label: "出差事由", type: "textarea", required: true, placeholder: "请说明出差目的和计划", group: "出差信息" },
      // group: 费用预算
      { name: "travelType", label: "出差类型", type: "select", required: true, options: [{ value: "domestic", label: "国内" }, { value: "international", label: "国际" }], group: "费用预算" },
      { name: "estimatedBudget", label: "预计费用(元)", type: "number", validation: { min: 0 }, group: "费用预算" },
      { name: "needVisa", label: "需要签证", type: "checkbox", visibleIf: { field: "travelType", operator: "eq", value: "international" }, group: "费用预算" },
      // group: 备注
      { name: "remarks", label: "备注", type: "textarea", group: "备注" },
    ];
    const travelFlow = {
      steps: [
        { stepName: "部门经理审批", approverType: "fixed_user", approverIds: [u(1).id] },
        { stepName: "总经理审批", approverType: "fixed_user", approverIds: [u(0).id] },
      ],
      allowWithdraw: true,
    };
    const travelRes = await client.query(TEMPLATE_INSERT, [
      "TRAVEL_REQ", "出差申请", "Travel Request",
      "员工出差审批流程，包含行程信息、费用预算和审批链",
      "hr", "plane", "blue-500",
      JSON.stringify(travelFields), JSON.stringify(travelFlow),
      u(0).id,
    ]);
    const travelTemplateId = travelRes.rows[0].id;
    console.log(`Template 1: TRAVEL_REQ (id=${travelTemplateId})`);

    // ── Template 2: 采购申请 (PURCHASE_REQ) ──
    const purchaseFields = [
      // group: 采购信息
      { name: "itemName", label: "物品名称", type: "text", required: true, group: "采购信息" },
      { name: "quantity", label: "数量", type: "number", required: true, validation: { min: 1 }, group: "采购信息" },
      { name: "unit", label: "单位", type: "select", options: [{ value: "个", label: "个" }, { value: "台", label: "台" }, { value: "套", label: "套" }, { value: "箱", label: "箱" }, { value: "批", label: "批" }], group: "采购信息" },
      { name: "unitPrice", label: "单价(元)", type: "number", validation: { min: 0 }, group: "采购信息" },
      { name: "totalAmount", label: "总金额(元)", type: "number", readOnly: true, group: "采购信息" },
      { name: "urgency", label: "紧急程度", type: "radio", required: true, options: [{ value: "normal", label: "一般" }, { value: "urgent", label: "紧急" }, { value: "emergency", label: "特急" }], group: "采购信息" },
      // group: 供应商
      { name: "supplier", label: "建议供应商", type: "text", group: "供应商" },
      { name: "reason", label: "采购理由", type: "textarea", required: true, group: "供应商" },
    ];
    const purchaseFlow = {
      steps: [
        { stepName: "采购经理审批", approverType: "fixed_user", approverIds: [u(2).id] },
        { stepName: "财务审批", approverType: "fixed_user", approverIds: [u(0).id] },
      ],
    };
    const purchaseRes = await client.query(TEMPLATE_INSERT, [
      "PURCHASE_REQ", "采购申请", "Purchase Request",
      "物资采购审批流程，包含采购信息、供应商建议和审批链",
      "admin", "shopping-cart", "emerald-500",
      JSON.stringify(purchaseFields), JSON.stringify(purchaseFlow),
      u(0).id,
    ]);
    console.log(`Template 2: PURCHASE_REQ (id=${purchaseRes.rows[0].id})`);

    // ── Template 3: 报销申请 (EXPENSE_CLAIM) ──
    const expenseFields = [
      // group: 报销信息
      { name: "expenseType", label: "费用类型", type: "select", required: true, options: [{ value: "travel", label: "差旅费" }, { value: "meal", label: "餐饮费" }, { value: "transport", label: "交通费" }, { value: "accommodation", label: "住宿费" }, { value: "office", label: "办公用品" }, { value: "other", label: "其他" }], group: "报销信息" },
      { name: "amount", label: "报销金额(元)", type: "number", required: true, validation: { min: 0.01 }, group: "报销信息" },
      { name: "expenseDate", label: "费用发生日期", type: "date", required: true, group: "报销信息" },
      { name: "invoiceCount", label: "发票数量", type: "number", validation: { min: 0 }, group: "报销信息" },
      // group: 详情
      { name: "description", label: "费用说明", type: "textarea", required: true, group: "详情" },
      { name: "projectCode", label: "项目编号", type: "text", helpText: "如有关联项目请填写", group: "详情" },
      { name: "attachments", label: "附件/发票", type: "file", group: "详情" },
    ];
    const expenseFlow = {
      steps: [
        { stepName: "部门经理审批", approverType: "fixed_user", approverIds: [u(1).id] },
        { stepName: "财务确认", approverType: "fixed_user", approverIds: [u(0).id] },
      ],
      allowWithdraw: true,
    };
    const expenseRes = await client.query(TEMPLATE_INSERT, [
      "EXPENSE_CLAIM", "报销申请", "Expense Claim",
      "费用报销审批流程，支持多种费用类型和发票附件",
      "finance", "receipt", "amber-500",
      JSON.stringify(expenseFields), JSON.stringify(expenseFlow),
      u(0).id,
    ]);
    console.log(`Template 3: EXPENSE_CLAIM (id=${expenseRes.rows[0].id})`);

    // ── Template 4: 用印申请 (SEAL_REQ) ──
    const sealFields = [
      // group: 用印信息
      { name: "sealType", label: "印章类型", type: "select", required: true, options: [{ value: "company", label: "公章" }, { value: "contract", label: "合同章" }, { value: "finance", label: "财务章" }, { value: "legal", label: "法人章" }], group: "用印信息" },
      { name: "documentTitle", label: "文件名称", type: "text", required: true, group: "用印信息" },
      { name: "documentType", label: "文件类型", type: "select", required: true, options: [{ value: "contract", label: "合同" }, { value: "letter", label: "函件" }, { value: "certificate", label: "证明" }, { value: "report", label: "报告" }, { value: "other", label: "其他" }], group: "用印信息" },
      { name: "copies", label: "份数", type: "number", required: true, validation: { min: 1, max: 20 }, group: "用印信息" },
      // group: 说明
      { name: "purpose", label: "用印事由", type: "textarea", required: true, group: "说明" },
      { name: "isExternal", label: "是否外带", type: "checkbox", group: "说明" },
      { name: "returnDate", label: "预计归还日期", type: "date", visibleIf: { field: "isExternal", operator: "eq", value: true }, group: "说明" },
    ];
    const sealFlow = {
      steps: [
        { stepName: "行政主管审批", approverType: "fixed_user", approverIds: [u(0).id] },
      ],
    };
    const sealRes = await client.query(TEMPLATE_INSERT, [
      "SEAL_REQ", "用印申请", "Seal Request",
      "公司印章使用审批流程，支持多种印章类型和外带管理",
      "admin", "stamp", "red-500",
      JSON.stringify(sealFields), JSON.stringify(sealFlow),
      u(0).id,
    ]);
    console.log(`Template 4: SEAL_REQ (id=${sealRes.rows[0].id})`);

    // ── Template 5: 项目立项申请 (PROJECT_INIT) ──
    const projectFields = [
      // group: 项目基本信息
      { name: "projectName", label: "项目名称", type: "text", required: true, group: "项目基本信息" },
      { name: "projectType", label: "项目类型", type: "select", required: true, options: [{ value: "new", label: "新项目" }, { value: "extension", label: "续期" }, { value: "internal", label: "内部项目" }], group: "项目基本信息" },
      { name: "customerName", label: "客户名称", type: "text", group: "项目基本信息" },
      { name: "estimatedValue", label: "预计合同金额(元)", type: "number", validation: { min: 0 }, group: "项目基本信息" },
      { name: "startDate", label: "计划开始日期", type: "date", required: true, group: "项目基本信息" },
      { name: "endDate", label: "计划结束日期", type: "date", required: true, group: "项目基本信息" },
      // group: 项目详情
      { name: "scope", label: "项目范围描述", type: "textarea", required: true, group: "项目详情" },
      { name: "teamSize", label: "预计团队人数", type: "number", validation: { min: 1 }, group: "项目详情" },
      { name: "risks", label: "风险评估", type: "textarea", group: "项目详情" },
    ];
    const projectFlow = {
      steps: [
        { stepName: "技术总监审核", approverType: "fixed_user", approverIds: [u(3).id] },
        { stepName: "财务评估", approverType: "fixed_user", approverIds: [u(2).id] },
        { stepName: "总经理批准", approverType: "fixed_user", approverIds: [u(0).id] },
      ],
      allowWithdraw: true,
    };
    const projectRes = await client.query(TEMPLATE_INSERT, [
      "PROJECT_INIT", "项目立项申请", "Project Initiation",
      "新项目立项审批流程，包含项目信息、预算评估和三级审批",
      "project", "folder-open", "violet-500",
      JSON.stringify(projectFields), JSON.stringify(projectFlow),
      u(0).id,
    ]);
    console.log(`Template 5: PROJECT_INIT (id=${projectRes.rows[0].id})`);

    console.log("\n5 form templates inserted.");

    // =========================================================================
    // 2. Demo Submissions (3 rows for TRAVEL_REQ)
    // =========================================================================

    const SUBMISSION_INSERT = `
      INSERT INTO oa_form_submissions
        (submission_code, template_id, template_code, template_name,
         applicant_id, applicant_name, title, form_data,
         status, current_approver_id, current_approver_name, current_approval_step,
         approved_at, rejected_at, rejection_reason,
         priority, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb,
              $9, $10, $11, $12,
              $13, $14, $15,
              $16, NOW(), NOW())
      RETURNING id
    `;

    // ── Submission 1: approved ──
    const sub1Applicant = u(2);
    const sub1Data = {
      destination: "底特律",
      startDate: "2026-02-25",
      endDate: "2026-03-05",
      reason: "拜访Detroit Engine Corp客户，进行发动机测试台架技术交流和项目验收",
      travelType: "international",
      estimatedBudget: 45000,
      needVisa: true,
      remarks: "需提前办理美国B1签证",
    };
    const sub1Res = await client.query(SUBMISSION_INSERT, [
      "DF-20260222-0001", travelTemplateId, "TRAVEL_REQ", "出差申请",
      sub1Applicant.id, sub1Applicant.name,
      `${sub1Applicant.name} \u2014 出差申请（苏州→底特律）`,
      JSON.stringify(sub1Data),
      "approved", null, null, 2,
      new Date().toISOString(), null, null,
      "normal",
    ]);
    const sub1Id = sub1Res.rows[0].id;
    console.log(`Submission 1: DF-20260222-0001 (id=${sub1Id}, approved)`);

    // ── Submission 2: pending ──
    const sub2Applicant = u(3);
    const sub2Approver = u(1);
    const sub2Data = {
      destination: "上海",
      startDate: "2026-03-10",
      endDate: "2026-03-12",
      reason: "参加上汽通用IATF 16949年度审核会议",
      travelType: "domestic",
      estimatedBudget: 3500,
      needVisa: false,
      remarks: "",
    };
    const sub2Res = await client.query(SUBMISSION_INSERT, [
      "DF-20260222-0002", travelTemplateId, "TRAVEL_REQ", "出差申请",
      sub2Applicant.id, sub2Applicant.name,
      `${sub2Applicant.name} \u2014 出差申请（苏州→上海）`,
      JSON.stringify(sub2Data),
      "pending", sub2Approver.id, sub2Approver.name, 0,
      null, null, null,
      "normal",
    ]);
    const sub2Id = sub2Res.rows[0].id;
    console.log(`Submission 2: DF-20260222-0002 (id=${sub2Id}, pending)`);

    // ── Submission 3: rejected ──
    const sub3Applicant = users.length >= 5 ? u(4) : u(1);
    const sub3Data = {
      destination: "北京",
      startDate: "2026-03-15",
      endDate: "2026-03-20",
      reason: "参加中国国际汽车零部件博览会并拜访潍柴动力客户",
      travelType: "domestic",
      estimatedBudget: 18000,
      needVisa: false,
      remarks: "预计参展3天+客户拜访2天",
    };
    const sub3Res = await client.query(SUBMISSION_INSERT, [
      "DF-20260222-0003", travelTemplateId, "TRAVEL_REQ", "出差申请",
      sub3Applicant.id, sub3Applicant.name,
      `${sub3Applicant.name} \u2014 出差申请（苏州→北京）`,
      JSON.stringify(sub3Data),
      "rejected", null, null, 0,
      null, new Date().toISOString(), "预算超标，请调整后重新提交",
      "normal",
    ]);
    const sub3Id = sub3Res.rows[0].id;
    console.log(`Submission 3: DF-20260222-0003 (id=${sub3Id}, rejected)`);

    console.log("\n3 demo submissions inserted.");

    // =========================================================================
    // 3. Approval Records
    // =========================================================================

    const APPROVAL_INSERT = `
      INSERT INTO oa_form_approval_records
        (submission_id, step_index, step_name, approver_id, approver_name,
         action, comment, action_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    // ── Submission 1 approval records (2 approvals) ──
    const approver1Step1 = u(1);
    await client.query(APPROVAL_INSERT, [
      sub1Id, 0, "部门经理审批", approver1Step1.id, approver1Step1.name,
      "approve", "同意，注意行程安全",
      new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    ]);

    const approver1Step2 = u(0);
    await client.query(APPROVAL_INSERT, [
      sub1Id, 1, "总经理审批", approver1Step2.id, approver1Step2.name,
      "approve", "批准，请提前办理签证",
      new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
    ]);
    console.log("Inserted 2 approval records for submission 1 (both approve).");

    // ── Submission 3 approval record (1 rejection) ──
    const rejecter = u(1);
    await client.query(APPROVAL_INSERT, [
      sub3Id, 0, "部门经理审批", rejecter.id, rejecter.name,
      "reject", "预算超标，请调整后重新提交",
      new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    ]);
    console.log("Inserted 1 approval record for submission 3 (reject).");

    await client.query("COMMIT");
    console.log("\nTransaction committed.");

    // =========================================================================
    // Summary
    // =========================================================================
    console.log("\n========== Seed Summary ==========");

    const tplCount = await client.query(
      "SELECT category, count(*) as cnt FROM oa_form_templates WHERE is_system = true GROUP BY category ORDER BY category"
    );
    console.log("\nTemplates by category:");
    for (const r of tplCount.rows) {
      console.log(`  ${r.category}: ${r.cnt}`);
    }

    const subCount = await client.query(
      "SELECT status, count(*) as cnt FROM oa_form_submissions GROUP BY status ORDER BY status"
    );
    console.log("\nSubmissions by status:");
    for (const r of subCount.rows) {
      console.log(`  ${r.status}: ${r.cnt}`);
    }

    const aprCount = await client.query(
      "SELECT action, count(*) as cnt FROM oa_form_approval_records GROUP BY action ORDER BY action"
    );
    console.log("\nApproval records by action:");
    for (const r of aprCount.rows) {
      console.log(`  ${r.action}: ${r.cnt}`);
    }

    console.log("\n========== OA Form Templates Seed Complete ==========");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back due to error:", err);
    throw err;
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
