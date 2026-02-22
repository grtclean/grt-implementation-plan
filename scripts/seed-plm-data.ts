/**
 * PLM Demo Data Seed Script
 *
 * Seeds realistic demo data into the PLM tables for the GRT System CEO demo.
 *
 * Tables seeded:
 *   1. plm_documents         — 8 documents (mechanical, electrical, software, manual)
 *   2. plm_document_versions — Version history for each document
 *   3. plm_design_reviews    — 6 design reviews (approved, pending, rejected, revision_requested)
 *
 * Usage:
 *   npx tsx scripts/seed-plm-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Helper: generate a fake SHA-256 hash
// ---------------------------------------------------------------------------
function fakeHash(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  PLM Demo Data Seed Script");
  console.log("  GRT Light-PLM — CEO Demo 数据初始化");
  console.log("=".repeat(60));
  console.log();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[FATAL] DATABASE_URL is not set in environment.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("[DB] Connected to database.");
  console.log();

  try {
    // ---- Check for existing data ----
    const existing = await client.query(
      `SELECT id FROM plm_documents WHERE doc_number = 'DOC-MECH-001' LIMIT 1`
    );
    if (existing.rows.length > 0) {
      console.log("[SKIP] PLM demo data already exists (DOC-MECH-001 found). Exiting.");
      return;
    }

    // ---- Look up real employee IDs for FK integrity ----
    console.log("[LOOKUP] Querying company_employees for real IDs...");
    const empResult = await client.query(
      `SELECT id, name, department, position FROM company_employees LIMIT 10`
    );
    if (empResult.rows.length === 0) {
      console.error("[FATAL] No employees found in company_employees. Run seed-jiandaoyun-org.ts first.");
      process.exit(1);
    }
    for (const e of empResult.rows) {
      console.log(`  Employee: id=${e.id} name=${e.name} dept=${e.department} pos=${e.position}`);
    }
    console.log();

    console.log("[LOOKUP] Querying users table for user IDs...");
    const userResult = await client.query(
      `SELECT id, name FROM users LIMIT 5`
    );
    if (userResult.rows.length === 0) {
      console.error("[FATAL] No users found in users table. Ensure users are seeded first.");
      process.exit(1);
    }
    for (const u of userResult.rows) {
      console.log(`  User: id=${u.id} name=${u.name}`);
    }
    console.log();

    // Assign roles from real data
    const userId1 = userResult.rows[0].id;  // primary user (owner, uploader)
    const userName1 = userResult.rows[0].name;
    const userId2 = userResult.rows.length > 1 ? userResult.rows[1].id : userId1;
    const userName2 = userResult.rows.length > 1 ? userResult.rows[1].name : userName1;
    const userId3 = userResult.rows.length > 2 ? userResult.rows[2].id : userId1;
    const userName3 = userResult.rows.length > 2 ? userResult.rows[2].name : userName1;
    const userId4 = userResult.rows.length > 3 ? userResult.rows[3].id : userId2;
    const userName4 = userResult.rows.length > 3 ? userResult.rows[3].name : userName2;
    const userId5 = userResult.rows.length > 4 ? userResult.rows[4].id : userId3;
    const userName5 = userResult.rows.length > 4 ? userResult.rows[4].name : userName3;

    // Look up a project_id if available
    const projResult = await client.query(
      `SELECT id, name FROM projects WHERE name ILIKE '%detroit%' OR name ILIKE '%清洗%' LIMIT 1`
    );
    let projectId: number | null = null;
    let projectCode = "PRJ-DETROIT-2026";
    if (projResult.rows.length > 0) {
      projectId = projResult.rows[0].id;
      projectCode = `PRJ-${projectId}`;
      console.log(`[LOOKUP] Found project: id=${projectId} name=${projResult.rows[0].name}`);
    } else {
      // Try any project
      const anyProj = await client.query(`SELECT id, name FROM projects LIMIT 1`);
      if (anyProj.rows.length > 0) {
        projectId = anyProj.rows[0].id;
        projectCode = `PRJ-${projectId}`;
        console.log(`[LOOKUP] Using project: id=${projectId} name=${anyProj.rows[0].name}`);
      } else {
        console.log("[LOOKUP] No projects found, proceeding without project_id.");
      }
    }
    console.log();

    // ---- Begin Transaction ----
    await client.query("BEGIN");
    console.log("[TX] Transaction started.");
    console.log();

    // ========================================================================
    // 1. Insert PLM Documents
    // ========================================================================
    console.log("[DOCS] Inserting 8 PLM documents...");

    interface DocDef {
      docNumber: string;
      title: string;
      description: string;
      docType: string;
      currentStatus: string;
      currentVersionString: string;
      totalVersions: number;
      designFreezeApproved: boolean;
      designFreezeAt: string | null;
      designFreezeBy: number | null;
      fileExtension: string;
      mimeType: string;
      tags: string[];
      ownerUserId: number;
      ownerName: string;
    }

    const now = new Date().toISOString();
    const freezeDate = "2026-01-15T10:30:00.000Z";

    const docs: DocDef[] = [
      {
        docNumber: "DOC-MECH-001",
        title: "Detroit 缸体清洗线 主装配体",
        description: "Detroit项目缸体清洗产线主装配体三维模型，包含输送系统、清洗工位、吹干工位全部机械结构",
        docType: "mechanical",
        currentStatus: "released",
        currentVersionString: "V2.0",
        totalVersions: 3,
        designFreezeApproved: true,
        designFreezeAt: freezeDate,
        designFreezeBy: userId1,
        fileExtension: ".sldasm",
        mimeType: "application/sldworks",
        tags: ["Detroit", "缸体清洗", "主装配体", "V2"],
        ownerUserId: userId1,
        ownerName: userName1,
      },
      {
        docNumber: "DOC-MECH-002",
        title: "Detroit 高压喷淋系统",
        description: "高压喷淋系统总成图纸，含喷嘴布局、管路走向、压力分配歧管",
        docType: "mechanical",
        currentStatus: "released",
        currentVersionString: "V1.1",
        totalVersions: 2,
        designFreezeApproved: true,
        designFreezeAt: "2026-01-20T14:00:00.000Z",
        designFreezeBy: userId1,
        fileExtension: ".slddrw",
        mimeType: "application/sldworks",
        tags: ["Detroit", "高压喷淋", "喷嘴"],
        ownerUserId: userId2,
        ownerName: userName2,
      },
      {
        docNumber: "DOC-ELEC-001",
        title: "Detroit PLC控制系统",
        description: "基于Siemens S7-1500的PLC控制程序，包含清洗工艺逻辑、安全联锁、HMI通讯协议",
        docType: "electrical",
        currentStatus: "in_review",
        currentVersionString: "V1.2",
        totalVersions: 3,
        designFreezeApproved: false,
        designFreezeAt: null,
        designFreezeBy: null,
        fileExtension: ".elk",
        mimeType: "application/eplan",
        tags: ["Detroit", "PLC", "S7-1500", "控制系统"],
        ownerUserId: userId3,
        ownerName: userName3,
      },
      {
        docNumber: "DOC-ELEC-002",
        title: "Detroit HMI触摸屏程序",
        description: "Siemens TP1500 Comfort触摸屏程序，含产线状态监控、参数设定、报警画面",
        docType: "electrical",
        currentStatus: "draft",
        currentVersionString: "V0.1",
        totalVersions: 1,
        designFreezeApproved: false,
        designFreezeAt: null,
        designFreezeBy: null,
        fileExtension: ".hmi",
        mimeType: "application/wincc",
        tags: ["Detroit", "HMI", "TP1500", "触摸屏"],
        ownerUserId: userId3,
        ownerName: userName3,
      },
      {
        docNumber: "DOC-SW-001",
        title: "SCADA数据采集模块",
        description: "SCADA系统数据采集层，负责PLC变量读取、实时数据存储、OPC-UA通讯、历史趋势记录",
        docType: "software",
        currentStatus: "released",
        currentVersionString: "V3.0",
        totalVersions: 5,
        designFreezeApproved: true,
        designFreezeAt: "2026-02-01T09:00:00.000Z",
        designFreezeBy: userId1,
        fileExtension: ".zip",
        mimeType: "application/zip",
        tags: ["SCADA", "数据采集", "OPC-UA", "V3"],
        ownerUserId: userId4,
        ownerName: userName4,
      },
      {
        docNumber: "DOC-SW-002",
        title: "MES接口适配器",
        description: "MES系统集成适配器，实现工单下发、完工报告、质量数据上传的REST/MQTT双通道接口",
        docType: "software",
        currentStatus: "in_review",
        currentVersionString: "V1.0",
        totalVersions: 1,
        designFreezeApproved: false,
        designFreezeAt: null,
        designFreezeBy: null,
        fileExtension: ".zip",
        mimeType: "application/zip",
        tags: ["MES", "接口", "REST", "MQTT"],
        ownerUserId: userId4,
        ownerName: userName4,
      },
      {
        docNumber: "DOC-MAN-001",
        title: "Detroit产线操作手册",
        description: "Detroit缸体清洗产线完整操作手册，涵盖开机、运行、停机、异常处理流程",
        docType: "manual",
        currentStatus: "released",
        currentVersionString: "V1.0",
        totalVersions: 1,
        designFreezeApproved: false,
        designFreezeAt: null,
        designFreezeBy: null,
        fileExtension: ".pdf",
        mimeType: "application/pdf",
        tags: ["Detroit", "操作手册", "SOP"],
        ownerUserId: userId5,
        ownerName: userName5,
      },
      {
        docNumber: "DOC-MAN-002",
        title: "维护保养SOP",
        description: "设备维护保养标准作业程序，含日常点检、周保养、月度维护、年度大修计划",
        docType: "manual",
        currentStatus: "draft",
        currentVersionString: "V0.1",
        totalVersions: 1,
        designFreezeApproved: false,
        designFreezeAt: null,
        designFreezeBy: null,
        fileExtension: ".docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        tags: ["维护保养", "SOP", "点检"],
        ownerUserId: userId5,
        ownerName: userName5,
      },
    ];

    // Map docNumber -> inserted id
    const docIdMap: Record<string, number> = {};

    for (const doc of docs) {
      const res = await client.query(
        `INSERT INTO plm_documents
          (doc_number, title, description, doc_type, current_status,
           project_id, project_code, owner_user_id, owner_name,
           current_version_string, total_versions,
           design_freeze_approved, design_freeze_at, design_freeze_by,
           file_extension, mime_type, tags, metadata,
           created_by, updated_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11,
           $12, $13, $14,
           $15, $16, $17, $18,
           $19, $20, $21, $22)
         RETURNING id`,
        [
          doc.docNumber, doc.title, doc.description, doc.docType, doc.currentStatus,
          projectId, projectCode, doc.ownerUserId, doc.ownerName,
          doc.currentVersionString, doc.totalVersions,
          doc.designFreezeApproved, doc.designFreezeAt, doc.designFreezeBy,
          doc.fileExtension, doc.mimeType, JSON.stringify(doc.tags), JSON.stringify({ source: "seed-plm-data" }),
          doc.ownerUserId, doc.ownerUserId, now, now,
        ]
      );
      const docId = res.rows[0].id;
      docIdMap[doc.docNumber] = docId;
      console.log(`  [DOC] ${doc.docNumber} "${doc.title}" -> id=${docId}`);
    }

    console.log(`[DOCS] Inserted ${docs.length} documents.`);
    console.log();

    // ========================================================================
    // 2. Insert PLM Document Versions
    // ========================================================================
    console.log("[VERS] Inserting document versions...");

    interface VerDef {
      docNumber: string;
      versionString: string;
      versionMajor: number;
      versionMinor: number;
      filePath: string;
      originalFileName: string;
      fileSizeBytes: number;
      changeReason: string;
      uploadedBy: number;
      uploadedByName: string;
      uploadedAt: string;
      isLatest: boolean;
    }

    const versions: VerDef[] = [
      // DOC-MECH-001: 3 versions (V0.1 -> V1.0 -> V2.0)
      {
        docNumber: "DOC-MECH-001", versionString: "V0.1", versionMajor: 0, versionMinor: 1,
        filePath: "/data/plm/DOC-MECH-001/v0.1/main-assembly-draft.sldasm",
        originalFileName: "main-assembly-draft.sldasm", fileSizeBytes: 25_600_000,
        changeReason: "初始设计 — 基础框架搭建",
        uploadedBy: userId1, uploadedByName: userName1,
        uploadedAt: "2025-11-01T09:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-MECH-001", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-MECH-001/v1.0/main-assembly.sldasm",
        originalFileName: "main-assembly.sldasm", fileSizeBytes: 38_400_000,
        changeReason: "增加安全防护栏、优化输送系统布局",
        uploadedBy: userId1, uploadedByName: userName1,
        uploadedAt: "2025-12-15T14:30:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-MECH-001", versionString: "V2.0", versionMajor: 2, versionMinor: 0,
        filePath: "/data/plm/DOC-MECH-001/v2.0/main-assembly.sldasm",
        originalFileName: "main-assembly.sldasm", fileSizeBytes: 45_200_000,
        changeReason: "设计冻结版本 — 客户评审修改完成，增加排屑系统",
        uploadedBy: userId1, uploadedByName: userName1,
        uploadedAt: "2026-01-15T10:00:00.000Z", isLatest: true,
      },

      // DOC-MECH-002: 2 versions (V1.0 -> V1.1)
      {
        docNumber: "DOC-MECH-002", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-MECH-002/v1.0/spray-system.slddrw",
        originalFileName: "spray-system.slddrw", fileSizeBytes: 12_800_000,
        changeReason: "初始设计 — 喷淋系统总成",
        uploadedBy: userId2, uploadedByName: userName2,
        uploadedAt: "2025-12-01T10:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-MECH-002", versionString: "V1.1", versionMajor: 1, versionMinor: 1,
        filePath: "/data/plm/DOC-MECH-002/v1.1/spray-system.slddrw",
        originalFileName: "spray-system.slddrw", fileSizeBytes: 14_200_000,
        changeReason: "更新喷嘴规格 — 由扇形改为锥形，压力从80bar提升至120bar",
        uploadedBy: userId2, uploadedByName: userName2,
        uploadedAt: "2026-01-20T14:00:00.000Z", isLatest: true,
      },

      // DOC-ELEC-001: 3 versions (V0.1 -> V1.0 -> V1.2)
      {
        docNumber: "DOC-ELEC-001", versionString: "V0.1", versionMajor: 0, versionMinor: 1,
        filePath: "/data/plm/DOC-ELEC-001/v0.1/plc-control-draft.elk",
        originalFileName: "plc-control-draft.elk", fileSizeBytes: 5_400_000,
        changeReason: "初始设计 — PLC基础框架和I/O分配",
        uploadedBy: userId3, uploadedByName: userName3,
        uploadedAt: "2025-11-15T11:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-ELEC-001", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-ELEC-001/v1.0/plc-control.elk",
        originalFileName: "plc-control.elk", fileSizeBytes: 8_600_000,
        changeReason: "完成清洗工艺逻辑 — 增加安全联锁功能",
        uploadedBy: userId3, uploadedByName: userName3,
        uploadedAt: "2026-01-05T09:30:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-ELEC-001", versionString: "V1.2", versionMajor: 1, versionMinor: 2,
        filePath: "/data/plm/DOC-ELEC-001/v1.2/plc-control.elk",
        originalFileName: "plc-control.elk", fileSizeBytes: 9_100_000,
        changeReason: "客户评审修改 — 增加急停回路冗余、修改HMI通讯协议",
        uploadedBy: userId3, uploadedByName: userName3,
        uploadedAt: "2026-02-10T16:00:00.000Z", isLatest: true,
      },

      // DOC-ELEC-002: 1 version (V0.1)
      {
        docNumber: "DOC-ELEC-002", versionString: "V0.1", versionMajor: 0, versionMinor: 1,
        filePath: "/data/plm/DOC-ELEC-002/v0.1/hmi-screens.hmi",
        originalFileName: "hmi-screens.hmi", fileSizeBytes: 3_200_000,
        changeReason: "初始设计 — 主画面和报警画面框架",
        uploadedBy: userId3, uploadedByName: userName3,
        uploadedAt: "2026-02-15T10:00:00.000Z", isLatest: true,
      },

      // DOC-SW-001: 5 versions (V0.1 -> V1.0 -> V2.0 -> V2.1 -> V3.0)
      {
        docNumber: "DOC-SW-001", versionString: "V0.1", versionMajor: 0, versionMinor: 1,
        filePath: "/data/plm/DOC-SW-001/v0.1/scada-collector-alpha.zip",
        originalFileName: "scada-collector-alpha.zip", fileSizeBytes: 45_000,
        changeReason: "初始开发 — OPC-UA基础通讯模块",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2025-09-01T08:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-SW-001", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-SW-001/v1.0/scada-collector.zip",
        originalFileName: "scada-collector.zip", fileSizeBytes: 82_000,
        changeReason: "增加实时数据存储和历史趋势查询",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2025-10-15T11:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-SW-001", versionString: "V2.0", versionMajor: 2, versionMinor: 0,
        filePath: "/data/plm/DOC-SW-001/v2.0/scada-collector.zip",
        originalFileName: "scada-collector.zip", fileSizeBytes: 125_000,
        changeReason: "增加报警推送、数据压缩、断线重连机制",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2025-12-01T14:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-SW-001", versionString: "V2.1", versionMajor: 2, versionMinor: 1,
        filePath: "/data/plm/DOC-SW-001/v2.1/scada-collector.zip",
        originalFileName: "scada-collector.zip", fileSizeBytes: 130_000,
        changeReason: "修复内存泄漏Bug，优化采集频率配置",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2026-01-10T09:00:00.000Z", isLatest: false,
      },
      {
        docNumber: "DOC-SW-001", versionString: "V3.0", versionMajor: 3, versionMinor: 0,
        filePath: "/data/plm/DOC-SW-001/v3.0/scada-collector.zip",
        originalFileName: "scada-collector.zip", fileSizeBytes: 156_000,
        changeReason: "设计冻结版本 — 增加MQTT桥接、数据校验、全量回归测试通过",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2026-02-01T09:00:00.000Z", isLatest: true,
      },

      // DOC-SW-002: 1 version (V1.0)
      {
        docNumber: "DOC-SW-002", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-SW-002/v1.0/mes-adapter.zip",
        originalFileName: "mes-adapter.zip", fileSizeBytes: 98_000,
        changeReason: "初始版本 — REST/MQTT双通道接口实现",
        uploadedBy: userId4, uploadedByName: userName4,
        uploadedAt: "2026-02-05T15:00:00.000Z", isLatest: true,
      },

      // DOC-MAN-001: 1 version (V1.0)
      {
        docNumber: "DOC-MAN-001", versionString: "V1.0", versionMajor: 1, versionMinor: 0,
        filePath: "/data/plm/DOC-MAN-001/v1.0/detroit-operation-manual.pdf",
        originalFileName: "Detroit产线操作手册_V1.0.pdf", fileSizeBytes: 8_500_000,
        changeReason: "初版发布 — 涵盖完整操作流程",
        uploadedBy: userId5, uploadedByName: userName5,
        uploadedAt: "2026-01-25T11:00:00.000Z", isLatest: true,
      },

      // DOC-MAN-002: 1 version (V0.1)
      {
        docNumber: "DOC-MAN-002", versionString: "V0.1", versionMajor: 0, versionMinor: 1,
        filePath: "/data/plm/DOC-MAN-002/v0.1/maintenance-sop-draft.docx",
        originalFileName: "维护保养SOP_草稿.docx", fileSizeBytes: 2_300_000,
        changeReason: "初始草稿 — 日常点检表和周保养清单",
        uploadedBy: userId5, uploadedByName: userName5,
        uploadedAt: "2026-02-18T09:00:00.000Z", isLatest: true,
      },
    ];

    // Map (docNumber, versionString) -> inserted version id
    const verIdMap: Record<string, number> = {};
    let verCount = 0;

    for (const ver of versions) {
      const documentId = docIdMap[ver.docNumber];
      if (!documentId) {
        console.error(`  [ERROR] Document not found for version: ${ver.docNumber}`);
        continue;
      }

      const res = await client.query(
        `INSERT INTO plm_document_versions
          (document_id, version_string, version_major, version_minor,
           file_url_path, original_file_name, file_size_bytes, file_hash,
           change_reason, source_version_id,
           uploaded_by, uploaded_by_name, uploaded_at, is_latest, created_at)
         VALUES
          ($1, $2, $3, $4,
           $5, $6, $7, $8,
           $9, $10,
           $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          documentId, ver.versionString, ver.versionMajor, ver.versionMinor,
          ver.filePath, ver.originalFileName, ver.fileSizeBytes, fakeHash(),
          ver.changeReason, null,
          ver.uploadedBy, ver.uploadedByName, ver.uploadedAt, ver.isLatest, ver.uploadedAt,
        ]
      );
      const verId = res.rows[0].id;
      verIdMap[`${ver.docNumber}:${ver.versionString}`] = verId;
      verCount++;
      console.log(`  [VER] ${ver.docNumber} ${ver.versionString} -> id=${verId} (${(ver.fileSizeBytes / 1_000_000).toFixed(1)}MB)`);
    }

    console.log(`[VERS] Inserted ${verCount} versions.`);
    console.log();

    // ---- Update source_version_id links for version chains ----
    console.log("[LINK] Linking version chains (source_version_id)...");

    const chainLinks: Array<{ docNumber: string; version: string; sourceVersion: string }> = [
      { docNumber: "DOC-MECH-001", version: "V1.0", sourceVersion: "V0.1" },
      { docNumber: "DOC-MECH-001", version: "V2.0", sourceVersion: "V1.0" },
      { docNumber: "DOC-MECH-002", version: "V1.1", sourceVersion: "V1.0" },
      { docNumber: "DOC-ELEC-001", version: "V1.0", sourceVersion: "V0.1" },
      { docNumber: "DOC-ELEC-001", version: "V1.2", sourceVersion: "V1.0" },
      { docNumber: "DOC-SW-001",   version: "V1.0", sourceVersion: "V0.1" },
      { docNumber: "DOC-SW-001",   version: "V2.0", sourceVersion: "V1.0" },
      { docNumber: "DOC-SW-001",   version: "V2.1", sourceVersion: "V2.0" },
      { docNumber: "DOC-SW-001",   version: "V3.0", sourceVersion: "V2.1" },
    ];

    for (const link of chainLinks) {
      const verId = verIdMap[`${link.docNumber}:${link.version}`];
      const sourceId = verIdMap[`${link.docNumber}:${link.sourceVersion}`];
      if (verId && sourceId) {
        await client.query(
          `UPDATE plm_document_versions SET source_version_id = $1 WHERE id = $2`,
          [sourceId, verId]
        );
        console.log(`  [LINK] ${link.docNumber} ${link.version} -> source: ${link.sourceVersion} (id=${sourceId})`);
      }
    }

    console.log("[LINK] Version chains linked.");
    console.log();

    // ========================================================================
    // 3. Insert PLM Design Reviews
    // ========================================================================
    console.log("[REVW] Inserting 6 design reviews...");

    interface ReviewDef {
      docNumber: string;
      versionString: string;
      reviewerUserId: number;
      reviewerName: string;
      reviewerRole: string;
      reviewStatus: string;
      comments: string | null;
      requestedAt: string;
      dueDate: string;
      reviewedAt: string | null;
      requestedBy: number;
      isDesignFreezeReview: boolean;
    }

    const reviews: ReviewDef[] = [
      // Review 1: Approved — DOC-MECH-001 V2.0 design freeze
      {
        docNumber: "DOC-MECH-001", versionString: "V2.0",
        reviewerUserId: userId2, reviewerName: userName2,
        reviewerRole: "机械设计经理",
        reviewStatus: "approved",
        comments: "设计符合Detroit项目技术规格书要求，安全防护栏布局合理，输送系统节拍满足45秒/件目标。批准设计冻结。",
        requestedAt: "2026-01-12T09:00:00.000Z",
        dueDate: "2026-01-16T18:00:00.000Z",
        reviewedAt: "2026-01-15T10:30:00.000Z",
        requestedBy: userId1,
        isDesignFreezeReview: true,
      },
      // Review 2: Approved — DOC-SW-001 V3.0 design freeze
      {
        docNumber: "DOC-SW-001", versionString: "V3.0",
        reviewerUserId: userId1, reviewerName: userName1,
        reviewerRole: "技术总监",
        reviewStatus: "approved",
        comments: "SCADA模块功能测试全部通过，OPC-UA和MQTT双通道稳定运行72小时无异常。同意冻结。",
        requestedAt: "2026-01-28T09:00:00.000Z",
        dueDate: "2026-02-03T18:00:00.000Z",
        reviewedAt: "2026-02-01T09:00:00.000Z",
        requestedBy: userId4,
        isDesignFreezeReview: true,
      },
      // Review 3: Pending — DOC-ELEC-001 V1.2
      {
        docNumber: "DOC-ELEC-001", versionString: "V1.2",
        reviewerUserId: userId1, reviewerName: userName1,
        reviewerRole: "技术总监",
        reviewStatus: "pending",
        comments: null,
        requestedAt: "2026-02-11T09:00:00.000Z",
        dueDate: "2026-02-18T18:00:00.000Z",
        reviewedAt: null,
        requestedBy: userId3,
        isDesignFreezeReview: false,
      },
      // Review 4: Pending — DOC-SW-002 V1.0
      {
        docNumber: "DOC-SW-002", versionString: "V1.0",
        reviewerUserId: userId5, reviewerName: userName5,
        reviewerRole: "质量工程师",
        reviewStatus: "pending",
        comments: null,
        requestedAt: "2026-02-06T10:00:00.000Z",
        dueDate: "2026-02-13T18:00:00.000Z",
        reviewedAt: null,
        requestedBy: userId4,
        isDesignFreezeReview: false,
      },
      // Review 5: Rejected — DOC-ELEC-001 V1.0 (earlier version)
      {
        docNumber: "DOC-ELEC-001", versionString: "V1.0",
        reviewerUserId: userId2, reviewerName: userName2,
        reviewerRole: "安全工程师",
        reviewStatus: "rejected",
        comments: "急停回路缺少冗余设计，不符合ISO 13849 PLd等级要求。需增加双通道急停监控模块，并更新安全回路图纸。",
        requestedAt: "2026-01-06T09:00:00.000Z",
        dueDate: "2026-01-13T18:00:00.000Z",
        reviewedAt: "2026-01-10T15:00:00.000Z",
        requestedBy: userId3,
        isDesignFreezeReview: false,
      },
      // Review 6: Revision Requested — DOC-MECH-001 V1.0 (earlier version)
      {
        docNumber: "DOC-MECH-001", versionString: "V1.0",
        reviewerUserId: userId3, reviewerName: userName3,
        reviewerRole: "项目经理",
        reviewStatus: "revision_requested",
        comments: "整体结构可行，但需要补充以下内容：1) 排屑系统设计 2) 清洗液循环过滤方案 3) 设备吊装预留空间标注",
        requestedAt: "2025-12-16T09:00:00.000Z",
        dueDate: "2025-12-23T18:00:00.000Z",
        reviewedAt: "2025-12-20T11:00:00.000Z",
        requestedBy: userId1,
        isDesignFreezeReview: false,
      },
    ];

    let reviewCount = 0;
    for (const rev of reviews) {
      const verKey = `${rev.docNumber}:${rev.versionString}`;
      const documentVersionId = verIdMap[verKey];
      if (!documentVersionId) {
        console.error(`  [ERROR] Version not found for review: ${verKey}`);
        continue;
      }

      const res = await client.query(
        `INSERT INTO plm_design_reviews
          (document_version_id, reviewer_user_id, reviewer_name, reviewer_role,
           review_status, comments,
           requested_at, due_date, reviewed_at,
           requested_by, is_design_freeze_review,
           created_at, updated_at)
         VALUES
          ($1, $2, $3, $4,
           $5, $6,
           $7, $8, $9,
           $10, $11,
           $12, $13)
         RETURNING id`,
        [
          documentVersionId, rev.reviewerUserId, rev.reviewerName, rev.reviewerRole,
          rev.reviewStatus, rev.comments,
          rev.requestedAt, rev.dueDate, rev.reviewedAt,
          rev.requestedBy, rev.isDesignFreezeReview,
          now, now,
        ]
      );
      const reviewId = res.rows[0].id;
      reviewCount++;
      console.log(`  [REVW] ${rev.docNumber} ${rev.versionString} — ${rev.reviewStatus} (${rev.reviewerRole}) -> id=${reviewId}`);
    }

    console.log(`[REVW] Inserted ${reviewCount} reviews.`);
    console.log();

    // ---- Commit Transaction ----
    await client.query("COMMIT");
    console.log("[TX] Transaction committed successfully.");
    console.log();

    // ---- Verification ----
    console.log("=".repeat(60));
    console.log("  Verification / 验证结果");
    console.log("=".repeat(60));
    console.log();

    const docStats = await client.query(
      `SELECT doc_type, current_status, COUNT(*) AS cnt
       FROM plm_documents
       GROUP BY doc_type, current_status
       ORDER BY doc_type, current_status`
    );
    console.log("  Documents by type & status:");
    for (const row of docStats.rows) {
      console.log(`    ${row.doc_type.padEnd(12)} ${row.current_status.padEnd(12)} ${row.cnt}`);
    }

    const verStats = await client.query(
      `SELECT COUNT(*) AS total, SUM(file_size_bytes) AS total_bytes FROM plm_document_versions`
    );
    const totalBytes = Number(verStats.rows[0].total_bytes);
    console.log(`  Total versions: ${verStats.rows[0].total}`);
    console.log(`  Total file size: ${(totalBytes / 1_000_000).toFixed(1)} MB`);

    const revStats = await client.query(
      `SELECT review_status, COUNT(*) AS cnt
       FROM plm_design_reviews
       GROUP BY review_status
       ORDER BY review_status`
    );
    console.log("  Reviews by status:");
    for (const row of revStats.rows) {
      console.log(`    ${row.review_status.padEnd(20)} ${row.cnt}`);
    }

    console.log();

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Transaction rolled back due to error:");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("[DB] Database connection closed.");
  }

  console.log();
  console.log("=".repeat(60));
  console.log("  PLM seed complete!");
  console.log("=".repeat(60));
}

main();
