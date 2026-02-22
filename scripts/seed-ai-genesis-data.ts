/**
 * AI Genesis Knowledge & Proposals -- Seed Script
 *
 * Seeds demo data into:
 *   - ai_knowledge_documents  (5 rows)
 *   - genesis_proposals        (4 rows)
 *   - proposal_chat_logs       (8 rows)
 *
 * Idempotency: skips if ai_knowledge_documents already has > 3 rows.
 *
 * Usage:
 *   npx tsx scripts/seed-ai-genesis-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

interface UserRow {
  id: number;
  name: string;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  // ── Idempotency check ──
  const countRes = await client.query(
    "SELECT count(*)::int AS cnt FROM ai_knowledge_documents"
  );
  const docCount = countRes.rows[0].cnt;
  if (docCount > 3) {
    console.log(
      `ai_knowledge_documents already has ${docCount} rows (> 3). Skipping seed.`
    );
    await client.end();
    return;
  }

  // ── Look up existing users ──
  const usersRes = await client.query<UserRow>(
    "SELECT id, name FROM users LIMIT 5"
  );
  const users = usersRes.rows;
  if (users.length === 0) {
    console.error("No users found in the users table. Cannot seed.");
    await client.end();
    process.exit(1);
  }
  console.log(
    `Found ${users.length} users: ${users.map((u) => u.name).join(", ")}`
  );

  const u = (idx: number) => users[Math.min(idx, users.length - 1)].id;

  // ════════════════════════════════════════════════════════════
  // 1. Seed knowledge_documents (5 rows)
  // ════════════════════════════════════════════════════════════

  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400_000).toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 86400_000).toISOString();

  const docInsertSql = `
    INSERT INTO ai_knowledge_documents
      (file_name, file_type, file_path, file_size_bytes, mime_type, status,
       extracted_text, summary, key_entities, analysis_result, tags,
       uploaded_by, processed_at, error_message, metadata, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id
  `;

  // Doc 1: ISO 16232 Cleanliness Standard
  const doc1Res = await client.query(docInsertSql, [
    "ISO_16232_清洁度标准.pdf",
    "POLICY",
    "/uploads/knowledge/2026/02/iso-16232-cleanliness.pdf",
    2_411_724, // ~2.3MB
    "application/pdf",
    "ANALYZED",
    "ISO 16232:2018 道路车辆 — 零部件和系统的清洁度。本标准规定了通过颗粒物分析评估汽车零部件清洁度的方法。" +
      "包括：萃取方法（压力冲洗、超声波清洗、搅动法）、分析方法（重量法、光学显微镜法、自动光学粒子计数法）。" +
      "关键参数：最大允许颗粒尺寸、颗粒数量分布、单位面积/体积的颗粒质量。" +
      "适用范围：发动机零部件、液压系统、燃油喷射系统、制动系统等对清洁度有严格要求的零部件。" +
      "参考标准：VDA 19 (德国汽车工业协会清洁度检测标准)。",
    "ISO 16232标准定义了汽车零部件清洁度检测的完整方法论，覆盖萃取、分析和报告三大环节，适用于对颗粒物敏感的关键零部件。",
    JSON.stringify(["ISO 16232", "VDA 19", "颗粒物分析", "清洁度检测"]),
    JSON.stringify({
      topicsDetected: [
        "清洁度检测方法",
        "颗粒物尺寸分类",
        "萃取工艺参数",
        "质量控制标准",
      ],
      suggestedActions: [
        "创建清洁度检测字典配置",
        "添加颗粒物等级到质量检测模板",
        "关联VDA 19对照条目",
      ],
      relatedStandards: ["ISO 16232:2018", "VDA 19", "ISO 4407", "ISO 4406"],
      processingTime: 12.4,
      pageCount: 87,
    }),
    JSON.stringify(["cleanliness", "ISO", "quality"]),
    u(0),
    twoDaysAgo,
    null,
    JSON.stringify({ source: "quality-team-upload", version: "2018" }),
    fiveDaysAgo,
    twoDaysAgo,
  ]);
  const doc1Id = doc1Res.rows[0].id;
  console.log(`  Doc 1 inserted: id=${doc1Id} (ISO 16232)`);

  // Doc 2: IATF 16949 Internal Audit Manual
  const doc2Res = await client.query(docInsertSql, [
    "IATF_16949_内审手册_2026.docx",
    "MANUAL",
    "/uploads/knowledge/2026/02/iatf-16949-audit-manual-2026.docx",
    1_887_436, // ~1.8MB
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "ANALYZED",
    "IATF 16949:2016 质量管理体系 — 汽车生产及相关服务件组织的质量管理体系要求。" +
      "本内审手册基于ISO 9001:2015框架，增加了汽车行业特定要求。" +
      "审核范围：领导力与承诺、策划、支持（含能力管理与培训）、运行（含APQP/PPAP）、绩效评价、改进。" +
      "审核频次要求：过程审核每季度至少1次；产品审核每月至少1次；体系审核每年至少1次完整覆盖。" +
      "不符合项分类：严重（Major）— 系统性失效；轻微（Minor）— 偶发偏离。",
    "内审手册覆盖IATF 16949全部条款，定义了审核计划、检查表模板、不符合项管理流程和纠正措施跟踪机制。",
    JSON.stringify(["IATF 16949", "ISO 9001", "内部审核", "APQP", "PPAP"]),
    JSON.stringify({
      topicsDetected: [
        "质量管理体系",
        "内部审核流程",
        "不符合项管理",
        "APQP阶段审核",
        "培训能力矩阵",
      ],
      suggestedActions: [
        "标准化审核模板",
        "创建审核检查表工作流",
        "关联培训记录与能力要求",
      ],
      relatedStandards: [
        "IATF 16949:2016",
        "ISO 9001:2015",
        "ISO 19011:2018",
      ],
      processingTime: 18.7,
      pageCount: 142,
    }),
    JSON.stringify(["audit", "IATF", "quality-management"]),
    u(1),
    twoDaysAgo,
    null,
    JSON.stringify({ source: "quality-department", version: "2026-v1" }),
    tenDaysAgo,
    twoDaysAgo,
  ]);
  const doc2Id = doc2Res.rows[0].id;
  console.log(`  Doc 2 inserted: id=${doc2Id} (IATF 16949 Audit Manual)`);

  // Doc 3: VDA 6.3 Process Audit Guide
  const doc3Res = await client.query(docInsertSql, [
    "VDA_6.3_过程审核指南.pdf",
    "SOP",
    "/uploads/knowledge/2026/02/vda-63-process-audit-guide.pdf",
    3_250_585, // ~3.1MB
    "application/pdf",
    "ANALYZED",
    "VDA 6.3 过程审核 — 德国汽车工业协会发布的过程审核标准，第3版（2016年修订）。" +
      "审核模块：P2 项目管理、P3 产品和过程开发的策划、P4 产品和过程开发的实现、" +
      "P5 供应商管理、P6 过程分析/生产（6.1-6.6子过程）、P7 顾客关怀。" +
      "评分规则：0分（未实施）、4分（大部分实施）、6分（有效偏差管理）、8分（大部分有效）、10分（完全有效）。" +
      "总体合规度计算：各子过程加权平均，≥90%为A级（完全符合），80-89%为B级（有条件符合），<80%为C级（不符合）。",
    "VDA 6.3过程审核指南详细定义了P2-P7六大审核模块及10分制评分标准，适用于供应商开发和内部制造过程能力评估。",
    JSON.stringify(["VDA 6.3", "过程审核", "供应商管理", "P6生产过程"]),
    JSON.stringify({
      topicsDetected: [
        "VDA过程审核模块",
        "评分方法论",
        "供应商资质评估",
        "生产过程控制",
        "风险降级策略",
      ],
      suggestedActions: [
        "创建VDA 6.3审核工作流模板",
        "添加P2-P7过程评分字段到审核表",
        "配置供应商等级自动计算",
      ],
      relatedStandards: ["VDA 6.3:2016", "IATF 16949", "VDA 6.5"],
      processingTime: 22.1,
      pageCount: 198,
    }),
    JSON.stringify(["VDA", "process-audit"]),
    u(0),
    fiveDaysAgo,
    null,
    JSON.stringify({ source: "quality-team-upload", edition: "3rd-2016" }),
    tenDaysAgo,
    fiveDaysAgo,
  ]);
  const doc3Id = doc3Res.rows[0].id;
  console.log(`  Doc 3 inserted: id=${doc3Id} (VDA 6.3)`);

  // Doc 4: HR Training Management (not yet analyzed)
  const doc4Res = await client.query(docInsertSql, [
    "HR_培训管理制度_v3.docx",
    "POLICY",
    "/uploads/knowledge/2026/02/hr-training-policy-v3.docx",
    876_544, // ~856KB
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "UPLOADED",
    null, // not yet extracted
    null, // not yet summarized
    null, // no entities yet
    null, // no analysis yet
    null, // no tags yet
    u(2),
    null, // not yet processed
    null,
    JSON.stringify({ source: "hr-department", version: "v3" }),
    oneHourAgo,
    oneHourAgo,
  ]);
  const doc4Id = doc4Res.rows[0].id;
  console.log(`  Doc 4 inserted: id=${doc4Id} (HR Training - UPLOADED)`);

  // Doc 5: ERP Legacy Export (currently processing)
  const doc5Res = await client.query(docInsertSql, [
    "ERP_旧系统导出数据.csv",
    "SPREADSHEET",
    "/uploads/knowledge/2026/02/erp-legacy-export-2025.csv",
    13_107_200, // ~12.5MB
    "text/csv",
    "PROCESSING",
    null, // extraction in progress
    null,
    null,
    null,
    null,
    u(3),
    null,
    null,
    JSON.stringify({
      source: "it-department",
      description: "Legacy ERP data migration export",
      rowCount: 48720,
    }),
    oneHourAgo,
    now,
  ]);
  const doc5Id = doc5Res.rows[0].id;
  console.log(`  Doc 5 inserted: id=${doc5Id} (ERP Legacy - PROCESSING)`);

  console.log("Knowledge documents seeded.");

  // ════════════════════════════════════════════════════════════
  // 2. Seed genesis_proposals (4 rows)
  // ════════════════════════════════════════════════════════════

  const proposalInsertSql = `
    INSERT INTO genesis_proposals
      (title, description, source_document_id, proposal_type, target_entity,
       proposed_json_diff, current_snapshot, impact_analysis,
       status, confidence, reviewed_by, reviewed_at, review_comment,
       committed_at, committed_by, created_by, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING id
  `;

  // Proposal 1: Add ISO 16232 cleanliness dictionary entries (APPROVED)
  const prop1Res = await client.query(proposalInsertSql, [
    "添加ISO 16232清洁度检测配置",
    "根据ISO 16232标准文档分析，系统中尚缺清洁度检测相关的字典配置项。建议新增颗粒物等级、萃取方法、分析方法等字典条目，以支持清洁度检验流程的数字化管理。",
    doc1Id,
    "DICTIONARY_UPDATE",
    "sys_dictionaries",
    JSON.stringify({
      action: "ADD_ENTRIES",
      dictionaryGroup: "quality_inspection",
      entries: [
        {
          code: "PARTICLE_CLASS_A",
          label: "A级颗粒(5-15μm)",
          sortOrder: 1,
        },
        {
          code: "PARTICLE_CLASS_B",
          label: "B级颗粒(15-25μm)",
          sortOrder: 2,
        },
        {
          code: "PARTICLE_CLASS_C",
          label: "C级颗粒(25-50μm)",
          sortOrder: 3,
        },
        {
          code: "PARTICLE_CLASS_D",
          label: "D级颗粒(50-100μm)",
          sortOrder: 4,
        },
        {
          code: "PARTICLE_CLASS_E",
          label: "E级颗粒(100-200μm)",
          sortOrder: 5,
        },
        {
          code: "EXTRACTION_PRESSURE_RINSE",
          label: "压力冲洗法",
          sortOrder: 10,
        },
        {
          code: "EXTRACTION_ULTRASONIC",
          label: "超声波清洗法",
          sortOrder: 11,
        },
        {
          code: "ANALYSIS_GRAVIMETRIC",
          label: "重量法分析",
          sortOrder: 20,
        },
        {
          code: "ANALYSIS_OPTICAL_MICROSCOPY",
          label: "光学显微镜法",
          sortOrder: 21,
        },
        {
          code: "ANALYSIS_AUTO_PARTICLE_COUNT",
          label: "自动粒子计数法",
          sortOrder: 22,
        },
      ],
    }),
    JSON.stringify({
      existingEntries: [],
      note: "sys_dictionaries中当前无quality_inspection分组条目",
    }),
    JSON.stringify({
      affectedRecords: 0,
      riskLevel: "LOW",
      dependencies: ["质量检测模板需同步更新"],
      estimatedEffort: "30分钟配置",
    }),
    "APPROVED",
    0.85,
    u(0),
    twoDaysAgo,
    "字典配置准确，已审核通过。请在下一个部署窗口应用。",
    null,
    null,
    u(0), // AI agent using first user context
    fiveDaysAgo,
    twoDaysAgo,
  ]);
  const prop1Id = prop1Res.rows[0].id;
  console.log(`  Proposal 1 inserted: id=${prop1Id} (ISO 16232 Dictionary - APPROVED)`);

  // Proposal 2: VDA 6.3 Audit Workflow (PENDING_REVIEW)
  const prop2Res = await client.query(proposalInsertSql, [
    "新增VDA 6.3过程审核工作流",
    "基于VDA 6.3过程审核指南，建议在工作流系统中新增标准化的过程审核流程模板。包含P2-P7六大审核模块、10分制评分、自动等级计算（A/B/C级）。",
    doc3Id,
    "WORKFLOW_CHANGE",
    "sys_workflow_definitions",
    JSON.stringify({
      action: "CREATE_WORKFLOW",
      workflowCode: "VDA63_PROCESS_AUDIT",
      workflowName: "VDA 6.3过程审核",
      steps: [
        {
          step: 1,
          name: "审核策划",
          assigneeRole: "quality_engineer",
          fields: ["auditScope", "auditDate", "auditorTeam"],
        },
        {
          step: 2,
          name: "P2-P4 项目与开发审核",
          assigneeRole: "quality_engineer",
          fields: ["p2Score", "p3Score", "p4Score"],
        },
        {
          step: 3,
          name: "P5 供应商管理审核",
          assigneeRole: "quality_engineer",
          fields: ["p5Score", "supplierEvidence"],
        },
        {
          step: 4,
          name: "P6 生产过程审核",
          assigneeRole: "quality_engineer",
          fields: [
            "p61Score",
            "p62Score",
            "p63Score",
            "p64Score",
            "p65Score",
            "p66Score",
          ],
        },
        {
          step: 5,
          name: "P7 顾客关怀审核",
          assigneeRole: "quality_engineer",
          fields: ["p7Score", "customerFeedback"],
        },
        {
          step: 6,
          name: "综合评定与报告",
          assigneeRole: "quality_manager",
          fields: ["overallGrade", "correctionPlan", "approvalDecision"],
        },
      ],
    }),
    JSON.stringify({
      existingWorkflows: ["INCOMING_INSPECTION", "FINAL_INSPECTION"],
      note: "当前无VDA专用审核工作流",
    }),
    JSON.stringify({
      affectedRecords: 0,
      riskLevel: "MEDIUM",
      dependencies: [
        "需配置审核评分字典",
        "需关联供应商管理模块",
        "质量工程师权限需扩展",
      ],
      estimatedEffort: "2小时配置 + 1小时测试",
    }),
    "PENDING_REVIEW",
    0.72,
    null, // not yet reviewed
    null,
    null,
    null,
    null,
    u(0),
    twoDaysAgo,
    twoDaysAgo,
  ]);
  const prop2Id = prop2Res.rows[0].id;
  console.log(`  Proposal 2 inserted: id=${prop2Id} (VDA 6.3 Workflow - PENDING_REVIEW)`);

  // Proposal 3: IATF 16949 Audit Template Standardization (DRAFT)
  const prop3Res = await client.query(proposalInsertSql, [
    "IATF 16949审核模板标准化",
    "分析IATF 16949内审手册后，AI建议对现有审核模板进行结构化改造。将手册中定义的检查表、不符合项分类和纠正措施流程映射到系统schema中。此变更涉及较多现有数据结构调整，标记为高风险。",
    doc2Id,
    "SCHEMA_SUGGESTION",
    "audit_templates",
    JSON.stringify({
      action: "MODIFY_SCHEMA",
      tableName: "audit_templates",
      changes: [
        {
          type: "ADD_COLUMN",
          column: "iatf_clause_ref",
          dataType: "varchar(50)",
          description: "IATF条款引用编号",
        },
        {
          type: "ADD_COLUMN",
          column: "nonconformity_severity",
          dataType: "enum('MAJOR','MINOR','OBSERVATION')",
          description: "不符合项严重性分级",
        },
        {
          type: "ADD_COLUMN",
          column: "corrective_action_deadline_days",
          dataType: "integer",
          description: "纠正措施完成期限(天)",
        },
        {
          type: "ADD_TABLE",
          tableName: "audit_checklist_items",
          columns: [
            "id",
            "template_id",
            "clause_number",
            "question_text",
            "evidence_required",
            "scoring_criteria",
          ],
        },
      ],
    }),
    JSON.stringify({
      currentSchema: {
        audit_templates: ["id", "name", "category", "created_at"],
      },
      note: "现有审核模板表结构简单，缺乏IATF特定字段",
    }),
    JSON.stringify({
      affectedRecords: 15,
      riskLevel: "HIGH",
      dependencies: [
        "需要数据库迁移",
        "现有审核记录需要回填",
        "前端审核表单需改造",
        "可能影响报表导出",
      ],
      estimatedEffort: "1天开发 + 半天测试",
      rollbackPlan: "可通过反向迁移回退schema变更",
    }),
    "DRAFT",
    0.68,
    null,
    null,
    null,
    null,
    null,
    u(1),
    fiveDaysAgo,
    fiveDaysAgo,
  ]);
  const prop3Id = prop3Res.rows[0].id;
  console.log(`  Proposal 3 inserted: id=${prop3Id} (IATF Template - DRAFT)`);

  // Proposal 4: Training Records Data Migration (COMMITTED)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString();
  const prop4Res = await client.query(proposalInsertSql, [
    "培训记录数据迁移方案",
    "基于人工评估，将旧系统中的培训记录按照新的能力矩阵框架进行数据迁移。迁移方案包含字段映射、数据清洗规则和验证步骤。此方案已经评审通过并已提交至控制塔执行。",
    null, // manual proposal, no source document
    "POLICY_ADD",
    "training_records",
    JSON.stringify({
      action: "DATA_MIGRATION",
      sourceTable: "legacy_training_log",
      targetTable: "training_records",
      fieldMapping: {
        employee_no: "employee_id (lookup by code)",
        course_name: "training_course_id (match or create)",
        train_date: "completed_at",
        score: "assessment_score",
        trainer: "instructor_name",
        cert_no: "certificate_number",
      },
      cleansingRules: [
        "去除重复记录(employee_no + course_name + train_date)",
        "日期格式统一为ISO 8601",
        "成绩归一化为百分制",
      ],
      validationSteps: [
        "源表总数 vs 目标表总数 (差异<1%)",
        "随机抽样50条人工核验",
        "能力矩阵覆盖率检查",
      ],
      estimatedRows: 3420,
    }),
    JSON.stringify({
      legacyRecordCount: 3420,
      uniqueEmployees: 287,
      uniqueCourses: 64,
    }),
    JSON.stringify({
      affectedRecords: 3420,
      riskLevel: "MEDIUM",
      dependencies: ["能力矩阵表需先创建", "员工编码映射表需准备"],
      estimatedEffort: "4小时执行 + 2小时验证",
    }),
    "COMMITTED",
    0.91,
    u(0),
    threeDaysAgo,
    "迁移方案经HR部门和IT部门联合评审通过。",
    twoDaysAgo,
    u(0),
    u(1),
    fiveDaysAgo,
    twoDaysAgo,
  ]);
  const prop4Id = prop4Res.rows[0].id;
  console.log(`  Proposal 4 inserted: id=${prop4Id} (Training Migration - COMMITTED)`);

  console.log("Genesis proposals seeded.");

  // ════════════════════════════════════════════════════════════
  // 3. Seed proposal_chat_logs (8 rows)
  // ════════════════════════════════════════════════════════════

  const chatInsertSql = `
    INSERT INTO proposal_chat_logs
      (proposal_id, role, content, attachments, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const fourDaysAgo = new Date(Date.now() - 4 * 86400_000).toISOString();
  const threeDaysAgoMinus1h = new Date(
    Date.now() - 3 * 86400_000 - 3600_000
  ).toISOString();
  const threeDaysAgoMinus30m = new Date(
    Date.now() - 3 * 86400_000 - 1800_000
  ).toISOString();

  // -- Proposal 1 chat (3 messages) --

  // Chat 1.1: USER asks about key parameters
  await client.query(chatInsertSql, [
    prop1Id,
    "USER",
    "这个标准包含哪些关键检测参数？我需要确认字典配置是否覆盖了所有必要的检测维度。",
    null,
    JSON.stringify({ userId: u(0) }),
    fourDaysAgo,
  ]);

  // Chat 1.2: AI responds with ISO 16232 details
  await client.query(chatInsertSql, [
    prop1Id,
    "AI",
    "根据ISO 16232文档分析，关键检测参数包括以下维度：\n\n" +
      "**1. 颗粒物尺寸分级**\n" +
      "- A级：5-15μm（微细颗粒）\n" +
      "- B级：15-25μm（细颗粒）\n" +
      "- C级：25-50μm（中等颗粒）\n" +
      "- D级：50-100μm（粗颗粒）\n" +
      "- E级：100-200μm（大颗粒）\n\n" +
      "**2. 萃取方法**\n" +
      "- 压力冲洗法（最常用，适用于管路类零件）\n" +
      "- 超声波清洗法（适用于复杂几何形状零件）\n\n" +
      "**3. 分析方法**\n" +
      "- 重量法（总颗粒质量）\n" +
      "- 光学显微镜法（颗粒形态分析）\n" +
      "- 自动粒子计数法（最高效，推荐使用）\n\n" +
      "当前提议的字典配置已覆盖上述全部参数。建议后续还可以添加清洁度等级（CCC编码）的字典条目。",
    null,
    JSON.stringify({
      model: "gpt-4-turbo",
      tokensUsed: 847,
      latencyMs: 3200,
      sourceChunks: 4,
    }),
    new Date(new Date(fourDaysAgo).getTime() + 30_000).toISOString(),
  ]);

  // Chat 1.3: SYSTEM records approval
  await client.query(chatInsertSql, [
    prop1Id,
    "SYSTEM",
    `提案已被 ${users[0].name} 审核通过。审核意见：字典配置准确，已审核通过。请在下一个部署窗口应用。`,
    null,
    JSON.stringify({
      event: "PROPOSAL_APPROVED",
      reviewerId: u(0),
      previousStatus: "PENDING_REVIEW",
      newStatus: "APPROVED",
    }),
    twoDaysAgo,
  ]);

  // -- Proposal 2 chat (2 messages) --

  // Chat 2.1: USER asks about audit flow steps
  await client.query(chatInsertSql, [
    prop2Id,
    "USER",
    "审核流程需要几个步骤？每个步骤的评分标准是怎样的？",
    null,
    JSON.stringify({ userId: u(0) }),
    threeDaysAgoMinus1h,
  ]);

  // Chat 2.2: AI responds with VDA 6.3 steps
  await client.query(chatInsertSql, [
    prop2Id,
    "AI",
    "根据VDA 6.3过程审核指南，建议的工作流包含 **6个步骤**：\n\n" +
      "**步骤1 — 审核策划**\n" +
      "确定审核范围、日期和审核团队。\n\n" +
      "**步骤2 — P2-P4 项目与开发审核**\n" +
      "覆盖项目管理(P2)、开发策划(P3)和开发实现(P4)。每个子过程按0-10分制评分。\n\n" +
      "**步骤3 — P5 供应商管理审核**\n" +
      "评估供应商选择、开发和监控过程。\n\n" +
      "**步骤4 — P6 生产过程审核**（核心步骤）\n" +
      "包含6个子过程：\n" +
      "- P6.1 过程输入\n" +
      "- P6.2 过程管理\n" +
      "- P6.3 人力资源\n" +
      "- P6.4 物质资源\n" +
      "- P6.5 有效性/效率\n" +
      "- P6.6 过程输出\n\n" +
      "**步骤5 — P7 顾客关怀审核**\n" +
      "评估客户满意度和服务过程。\n\n" +
      "**步骤6 — 综合评定**\n" +
      "加权计算总分：≥90%=A级、80-89%=B级、<80%=C级。\n\n" +
      "评分标准：0分(未实施) → 4分(大部分实施) → 6分(有偏差管理) → 8分(大部分有效) → 10分(完全有效)",
    null,
    JSON.stringify({
      model: "gpt-4-turbo",
      tokensUsed: 1124,
      latencyMs: 4100,
      sourceChunks: 6,
    }),
    threeDaysAgoMinus30m,
  ]);

  // -- Proposal 4 chat (3 messages) --

  // Chat 4.1: USER creates manual proposal note
  await client.query(chatInsertSql, [
    prop4Id,
    "USER",
    "这是手动创建的迁移方案，数据来源于旧ERP系统的培训模块导出。请AI帮忙验证字段映射的合理性。",
    null,
    JSON.stringify({ userId: u(1) }),
    fourDaysAgo,
  ]);

  // Chat 4.2: AI validates mapping
  await client.query(chatInsertSql, [
    prop4Id,
    "AI",
    "字段映射分析完成，验证结果：\n\n" +
      "- `employee_no → employee_id`：需通过员工编码映射表转换，已确认287个唯一编码均可在新系统中找到对应记录。\n" +
      "- `course_name → training_course_id`：64个课程名称中，52个可精确匹配现有课程库，12个需新建课程记录。\n" +
      "- `train_date → completed_at`：存在3种日期格式(yyyy-MM-dd, yyyy/MM/dd, dd-MM-yyyy)，已制定统一转换规则。\n" +
      "- `score → assessment_score`：原始数据范围为0-100，与目标字段一致，无需转换。\n\n" +
      "**风险提示**：12条记录的employee_no在新系统中未找到对应，建议人工确认是否为离职员工。\n\n" +
      "总体评估：迁移方案可行，置信度91%。",
    null,
    JSON.stringify({
      model: "gpt-4-turbo",
      tokensUsed: 956,
      latencyMs: 3800,
      sourceChunks: 2,
    }),
    new Date(new Date(fourDaysAgo).getTime() + 60_000).toISOString(),
  ]);

  // Chat 4.3: SYSTEM records commitment
  await client.query(chatInsertSql, [
    prop4Id,
    "SYSTEM",
    `迁移方案已提交至系统控制塔执行。执行人：${users[0].name}。预计影响3420条培训记录，涉及287名员工。执行窗口：${twoDaysAgo}。`,
    null,
    JSON.stringify({
      event: "PROPOSAL_COMMITTED",
      committedById: u(0),
      previousStatus: "APPROVED",
      newStatus: "COMMITTED",
      affectedRows: 3420,
    }),
    twoDaysAgo,
  ]);

  console.log("Chat logs seeded (8 messages).");

  // ── Done ──
  await client.end();
  console.log("\nAI Genesis seed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
