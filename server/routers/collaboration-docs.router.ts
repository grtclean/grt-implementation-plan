import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { storagePut, storageGet } from "../storage";
const log = createChildLogger("collab-docs");

// ---------------------------------------------------------------------------
// Ensure tables exist (auto-migrate)
// ---------------------------------------------------------------------------

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collaboration_docs_folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER,
        created_by VARCHAR(100) NOT NULL DEFAULT 'System',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collaboration_docs_files (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(20) NOT NULL DEFAULT 'xlsx',
        file_size INTEGER NOT NULL DEFAULT 0,
        folder_id INTEGER,
        uploaded_by VARCHAR(100) NOT NULL DEFAULT 'System',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        parsed_content JSONB,
        modified_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // New columns for real file storage
    await db.execute(sql`ALTER TABLE collaboration_docs_files ADD COLUMN IF NOT EXISTS file_path VARCHAR(1000)`);
    await db.execute(sql`ALTER TABLE collaboration_docs_files ADD COLUMN IF NOT EXISTS file_content_type VARCHAR(100) DEFAULT 'application/octet-stream'`);
    await db.execute(sql`ALTER TABLE collaboration_docs_files ADD COLUMN IF NOT EXISTS description TEXT`);
    tablesEnsured = true;
  } catch (e: any) {
    log.warn({ err: e }, "ensureTables failed");
    tablesEnsured = true;
  }
}

// ---------------------------------------------------------------------------
// Seed data (inserted once if tables are empty)
// ---------------------------------------------------------------------------

let seeded = false;

async function seedIfEmpty() {
  if (seeded) return;
  seeded = true;
  try {
    const db = await requireDb();
    const folderCount = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM collaboration_docs_folders`);
    if (Number((folderCount.rows as any[])[0]?.cnt) > 0) return;

    // ── Seed folders: GRT business-domain folder tree ──
    // Top-level: 10 business domains matching company operations
    // Sub-level: department/client/tool-specific sub-folders
    await db.execute(sql`
      INSERT INTO collaboration_docs_folders (id, name, parent_id, created_by, created_at) VALUES
        -- Top-level domains
        (1,  '机械设计',     NULL, 'CTO',  '2026-01-15T08:00:00Z'),
        (2,  '电气设计',     NULL, 'CTO',  '2026-01-15T08:00:00Z'),
        (3,  '机器人系统',   NULL, 'CTO',  '2026-01-15T08:00:00Z'),
        (4,  '项目文件',     NULL, 'COO',  '2026-01-15T08:00:00Z'),
        (5,  '客户资料',     NULL, 'COO',  '2026-01-15T08:00:00Z'),
        (6,  '质量管理',     NULL, 'QM',   '2026-01-15T08:00:00Z'),
        (7,  '运营管理',     NULL, 'COO',  '2026-01-15T08:00:00Z'),
        (8,  '数字展厅',     NULL, 'CMO',  '2026-01-15T08:00:00Z'),
        (9,  '会议纪要',     NULL, 'COO',  '2026-01-15T08:00:00Z'),
        (10, '模板库',       NULL, 'CTO',  '2026-01-15T08:00:00Z'),
        -- 机械设计 sub-folders
        (11, '3D模型',       1,   'ME',   '2026-01-16T08:00:00Z'),
        (12, '工程图纸',     1,   'ME',   '2026-01-16T08:00:00Z'),
        (13, '标准件库',     1,   'ME',   '2026-01-16T08:00:00Z'),
        -- 电气设计 sub-folders
        (14, '原理图',       2,   'EE',   '2026-01-16T08:00:00Z'),
        (15, '布局图',       2,   'EE',   '2026-01-16T08:00:00Z'),
        (16, '元器件清单',   2,   'EE',   '2026-01-16T08:00:00Z'),
        -- 机器人系统 sub-folders
        (17, 'FANUC程序',    3,   'Robot', '2026-01-16T08:00:00Z'),
        (18, 'KUKA程序',     3,   'Robot', '2026-01-16T08:00:00Z'),
        (19, 'ABB程序',      3,   'Robot', '2026-01-16T08:00:00Z'),
        (20, '视觉系统',     3,   'Robot', '2026-01-16T08:00:00Z'),
        -- 项目文件 sub-folders
        (21, '在建项目',     4,   'PM',   '2026-01-16T08:00:00Z'),
        (22, '已完成项目',   4,   'PM',   '2026-01-16T08:00:00Z'),
        -- 客户资料 sub-folders
        (23, 'Mercedes-Benz', 5,  'Sales', '2026-01-16T08:00:00Z'),
        (24, 'Stellantis',    5,  'Sales', '2026-01-16T08:00:00Z'),
        (25, 'GM',            5,  'Sales', '2026-01-16T08:00:00Z'),
        (26, '其他客户',      5,  'Sales', '2026-01-16T08:00:00Z'),
        -- 质量管理 sub-folders
        (27, 'IATF 16949',   6,   'QM',   '2026-01-16T08:00:00Z'),
        (28, '检验报告',     6,   'QM',   '2026-01-16T08:00:00Z'),
        (29, 'PPAP文件',     6,   'QM',   '2026-01-16T08:00:00Z'),
        -- 运营管理 sub-folders
        (30, '规章制度',     7,   'HR',   '2026-01-16T08:00:00Z'),
        (31, '培训资料',     7,   'HR',   '2026-01-16T08:00:00Z'),
        -- 数字展厅 sub-folders
        (32, '产品介绍',     8,   'CMO',  '2026-01-16T08:00:00Z'),
        (33, '客户VDO',      8,   'CMO',  '2026-01-16T08:00:00Z'),
        (34, '企业宣传',     8,   'CMO',  '2026-01-16T08:00:00Z'),
        -- 模板库 sub-folders
        (35, '项目模板',     10,  'PMO',  '2026-01-16T08:00:00Z'),
        (36, '报告模板',     10,  'PMO',  '2026-01-16T08:00:00Z')
    `);
    await db.execute(sql`SELECT setval('collaboration_docs_folders_id_seq', 36, true) LIMIT 1000`);

    // ── Seed files: representative industrial files across domains ──
    await db.execute(sql`
      INSERT INTO collaboration_docs_files (id, title, file_name, file_type, file_size, folder_id, uploaded_by, status, parsed_content, modified_at) VALUES
        -- 机械设计: SolidWorks 3D models & drawings
        (1, 'CL2000 清洗机总装图', 'CL2000-Assembly.sldasm', 'sldasm', 8547200, 11, '机械工程师', 'active',
         ${JSON.stringify({ type: "cad", description: "CL2000工业清洗机总装配体 — 含12个子装配体, 清洗槽/传动/管路/电气" })}::jsonb,
         '2026-02-20T10:00:00Z'),
        (2, 'CL2000 主框架', 'CL2000-MainFrame.sldprt', 'sldprt', 3251000, 11, '机械工程师', 'active',
         ${JSON.stringify({ type: "cad", description: "主体框架 304不锈钢 — 焊接结构, 长2400×宽1200×高1800mm" })}::jsonb,
         '2026-02-18T14:30:00Z'),
        (3, 'CL2000 清洗槽工程图', 'CL2000-WashTank-Drawing.slddrw', 'slddrw', 1024000, 12, '机械工程师', 'active',
         ${JSON.stringify({ type: "cad", description: "清洗槽三视图+剖面图 — A1幅面, GD&T标注, 符合奔驰VW标准" })}::jsonb,
         '2026-02-19T09:15:00Z'),

        -- 电气设计: EPLAN schematics
        (4, 'CL2000 电气原理图', 'CL2000-Electrical.elc', 'elc', 5120000, 14, '电气工程师', 'active',
         ${JSON.stringify({ type: "cad", description: "EPLAN P8原理图 — 主回路+控制回路+安全回路, 符合EN60204-1" })}::jsonb,
         '2026-02-21T11:00:00Z'),
        (5, 'CL2000 元器件清单', 'CL2000-BOM-Electrical.xlsx', 'xlsx', 45600, 16, '电气工程师', 'active',
         ${JSON.stringify([
           ["序号", "型号", "品牌", "规格", "数量", "供应商"],
           ["1", "6ES7 215-1AG40", "Siemens", "S7-1200 CPU", "1", "西门子代理"],
           ["2", "ATV320U22N4C", "Schneider", "变频器 2.2kW", "3", "施耐德代理"],
           ["3", "XS630B1PAL2", "Schneider", "接近开关 M30", "12", "施耐德代理"],
           ["4", "3RT2026-1BB40", "Siemens", "接触器 25A", "6", "西门子代理"],
           ["5", "5SY4210-7", "Siemens", "微断 C10 2P", "8", "西门子代理"],
         ])}::jsonb,
         '2026-02-22T08:45:00Z'),

        -- 机器人系统: FANUC/KUKA/ABB programs
        (6, 'CL2000 FANUC主程序', 'CL2000-FANUC-Main.tp', 'tp', 28400, 17, '机器人工程师', 'active',
         ${JSON.stringify({ text: "/PROG CL2000_MAIN\n/ATTR\n/MN\n  1: CALL WASH_CYCLE;\n  2: CALL DRY_CYCLE;\n  3: CALL UNLOAD;\n  4: JMP LBL[1];\n/END", type: "code" })}::jsonb,
         '2026-02-23T13:00:00Z'),
        (7, 'CL2000 KUKA取放程序', 'CL2000-KUKA-PickPlace.src', 'src', 18200, 18, '机器人工程师', 'active',
         ${JSON.stringify({ text: "&ACCESS RVP\n&REL 1\nDEF PickPlace()\n  PTP HOME Vel=100% DEFAULT\n  LIN P1 Vel=1.5m/s CPDAT1\n  ; Pick workpiece\n  $OUT[1]=TRUE\n  WAIT SEC 0.5\n  LIN P2 Vel=2.0m/s CPDAT2\n  ; Place workpiece\n  $OUT[1]=FALSE\nEND", type: "code" })}::jsonb,
         '2026-02-23T14:30:00Z'),
        (8, 'CL2000 ABB清洗程序', 'CL2000-ABB-WashCycle.mod', 'mod', 15600, 19, '机器人工程师', 'active',
         ${JSON.stringify({ text: "MODULE WashCycle\n  PROC main()\n    MoveJ pHome, v1000, z50, tGripper;\n    MoveL pWashIn, v500, fine, tGripper;\n    WaitTime 30; ! 30s wash cycle\n    MoveL pWashOut, v500, fine, tGripper;\n    MoveJ pDryStation, v1000, z50, tGripper;\n  ENDPROC\nENDMODULE", type: "code" })}::jsonb,
         '2026-02-23T15:00:00Z'),

        -- 客户资料: project specs
        (9, '奔驰 CL2000 项目技术规范', 'Mercedes-CL2000-TechSpec.docx', 'docx', 2457600, 23, '项目经理', 'active',
         ${JSON.stringify({ type: "word", description: "Mercedes-Benz清洗线技术规范书 — VDA 6.3过程审核要求, 设备OEE≥85%" })}::jsonb,
         '2026-02-15T10:00:00Z'),
        (10, 'Stellantis 报价清单', 'Stellantis-QuotationMatrix.xlsx', 'xlsx', 89400, 24, '销售经理', 'active',
         ${JSON.stringify([
           ["Item", "Description", "Unit Price (EUR)", "Qty", "Total"],
           ["CL3000", "超声波清洗线 3-station", "185000", "2", "370000"],
           ["CL2000", "喷淋清洗线 2-station", "125000", "1", "125000"],
           ["INST", "安装调试 (2 engineers × 4 weeks)", "32000", "1", "32000"],
           ["SPARE", "2年备件包", "18500", "3", "55500"],
         ])}::jsonb,
         '2026-02-10T09:15:00Z'),

        -- 质量管理: IATF & PPAP
        (11, 'IATF 16949 内审检查表', 'IATF16949-Audit-Checklist.xlsx', 'xlsx', 131584, 27, 'QM', 'active',
         ${JSON.stringify([
           ["条款", "审核项", "状态", "评分", "备注"],
           ["4.4", "过程方法-乌龟图", "通过", "92", "SPC待完善"],
           ["7.1.5.1", "MSA分析", "通过", "88", "更新Gage R&R"],
           ["8.5.1", "生产控制计划", "通过", "95", "CP已更新v3"],
           ["10.2.3", "问题解决 8D", "通过", "90", "CAPA闭环率100%"],
         ])}::jsonb,
         '2026-02-15T14:20:00Z'),

        -- 运营管理: annual plan
        (12, '2026年度运营计划', '2026-Annual-OperationPlan.xlsx', 'xlsx', 91853, 7, 'COO', 'active',
         ${JSON.stringify([
           ["Quarter", "Target", "KPI", "Owner", "Status"],
           ["Q1", "CL2000量产爬坡 → 5台/月", "产能利用率≥75%", "生产总监", "进行中"],
           ["Q2", "新增Stellantis项目", "合同签订", "销售总监", "洽谈中"],
           ["Q3", "EPLAN标准化推广", "设计效率+30%", "CTO", "规划中"],
           ["Q4", "GRT System全面上线", "用户活跃度≥80%", "CTO", "规划中"],
         ])}::jsonb,
         '2026-02-05T16:45:00Z'),

        -- 数字展厅: presentation
        (13, 'GRT 数字展厅介绍', 'GRT-DigitalShowroom.pptx', 'pptx', 15728640, 32, 'CMO', 'active',
         ${JSON.stringify({ type: "ppt", description: "GRT工业清洗设备数字展厅 — 产品线/客户案例/技术优势/VDO链接" })}::jsonb,
         '2026-01-20T16:00:00Z'),

        -- 模板库: templates
        (14, '项目启动检查表模板', 'ProjectKickoff-Template.xlsx', 'xlsx', 35200, 35, 'PMO', 'active',
         ${JSON.stringify([
           ["检查项", "负责人", "截止日期", "完成状态"],
           ["客户需求确认", "PM", "", "☐"],
           ["BOM初版发布", "ME", "", "☐"],
           ["电气方案评审", "EE", "", "☐"],
           ["机器人选型确认", "Robot", "", "☐"],
           ["供应商询价完成", "采购", "", "☐"],
           ["项目计划发布", "PM", "", "☐"],
         ])}::jsonb,
         '2026-01-25T10:00:00Z'),

        -- 会议纪要: sample meeting notes
        (15, '2026W09 周例会纪要', '2026W09-WeeklyMeeting.md', 'md', 2840, 9, 'PMO', 'active',
         ${JSON.stringify({ text: "# 2026 W09 周例会纪要\n\n## 出席\nCEO, CTO, COO, 各事业部总监\n\n## 议题\n1. CL2000 奔驰项目进度 — 机械装配完成80%, 电气待布线\n2. Stellantis RFQ回复 — 报价已提交, 等待技术澄清\n3. GRT System迭代 — v2.0功能清单评审\n\n## 决议\n- [ ] CTO: 本周完成EPLAN标准模板\n- [ ] PM: 更新奔驰项目Gantt图\n- [ ] 采购: 跟进Siemens PLC交期\n", type: "code" })}::jsonb,
         '2026-02-28T17:00:00Z')
    `);
    await db.execute(sql`SELECT setval('collaboration_docs_files_id_seq', 15, true) LIMIT 1000`);
  } catch (e: any) {
    log.warn({ err: e }, "seed failed");
  }
}

// ---------------------------------------------------------------------------
// Role levels (mirrors client ROLE_HIERARCHY)
// ---------------------------------------------------------------------------

const ROLE_LEVELS: Record<string, number> = {
  guest: 0, employee: 1, production_worker: 1,
  team_lead: 2, bu_sales: 2, bu_mech: 2, bu_elec: 2, procurement_eng: 2, cs_engineer: 2,
  dept_manager: 3, bu_pm: 3, hr_specialist: 3, finance_specialist: 3,
  hr_manager: 4, finance_manager: 4, director: 5, bu_gm: 6, admin: 10,
};

// Common SELECT columns
const FILE_COLS = `id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
       folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
       file_path AS "filePath", file_content_type AS "fileContentType", description,
       modified_at AS "modifiedAt"`;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const collaborationDocsRouter = router({
  // ── List files (supports search, fileType, folderId filters) ──
  listFiles: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        fileType: z.string().optional(),
        folderId: z.number().nullable().optional(),
        allFiles: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      const search = input?.search;
      const fileType = input?.fileType;
      const returnAll = input?.allFiles === true || (!input || (input.folderId === undefined && !search && !fileType));

      let result;
      if (returnAll && !search && !fileType) {
        // Return ALL active files (for frontend tree building)
        result = await db.execute(sql`
          SELECT ${sql.raw(FILE_COLS)}
          FROM collaboration_docs_files
          WHERE status != 'deleted'
          ORDER BY modified_at DESC
          LIMIT 1000
        `);
      } else if (search && fileType) {
        const q = `%${search}%`;
        const folderId = input?.folderId ?? null;
        result = await db.execute(sql`
          SELECT ${sql.raw(FILE_COLS)}
          FROM collaboration_docs_files
          WHERE status != 'deleted'
            AND (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND (title ILIKE ${q} OR file_name ILIKE ${q})
            AND file_type = ${fileType}
          ORDER BY modified_at DESC
          LIMIT 1000
        `);
      } else if (search) {
        const q = `%${search}%`;
        const folderId = input?.folderId ?? null;
        result = await db.execute(sql`
          SELECT ${sql.raw(FILE_COLS)}
          FROM collaboration_docs_files
          WHERE status != 'deleted'
            AND (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND (title ILIKE ${q} OR file_name ILIKE ${q})
          ORDER BY modified_at DESC
          LIMIT 1000
        `);
      } else if (fileType) {
        const folderId = input?.folderId ?? null;
        result = await db.execute(sql`
          SELECT ${sql.raw(FILE_COLS)}
          FROM collaboration_docs_files
          WHERE status != 'deleted'
            AND (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND file_type = ${fileType}
          ORDER BY modified_at DESC
          LIMIT 1000
        `);
      } else {
        const folderId = input?.folderId ?? null;
        if (folderId !== null) {
          result = await db.execute(sql`
            SELECT ${sql.raw(FILE_COLS)}
            FROM collaboration_docs_files
            WHERE status != 'deleted' AND folder_id = ${folderId}
            ORDER BY modified_at DESC
            LIMIT 1000
          `);
        } else {
          result = await db.execute(sql`
            SELECT ${sql.raw(FILE_COLS)}
            FROM collaboration_docs_files
            WHERE status != 'deleted' AND folder_id IS NULL
            ORDER BY modified_at DESC
            LIMIT 1000
          `);
        }
      }

      const items = (result.rows as any[]) || [];
      return { items, total: items.length };
    }),

  // ── Get single file with content ──
  getFile: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT ${sql.raw(FILE_COLS)},
               parsed_content AS "parsedContent"
        FROM collaboration_docs_files
        WHERE id = ${input.id}
        LIMIT 1
      `);
      const rows = (result.rows as any[]) || [];
      return rows[0] ?? null;
    }),

  // ── Download file — return presigned URL ──
  downloadFile: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT file_path AS "filePath", file_content_type AS "contentType", file_name AS "fileName"
        FROM collaboration_docs_files
        WHERE id = ${input.id}
        LIMIT 1
      `);
      const row = (result.rows as any[])[0];
      if (!row?.filePath) return { url: null, fileName: row?.fileName ?? "unknown", contentType: null };
      try {
        const { url } = await storageGet(row.filePath);
        return { url, fileName: row.fileName, contentType: row.contentType };
      } catch (err) {
        log.warn({ err, fileId: input.id }, "storageGet failed");
        return { url: null, fileName: row.fileName, contentType: row.contentType };
      }
    }),

  // ── Upload file with real storage ──
  uploadFile: requirePermission('collab:docs:manage')
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileData: z.string().optional(),
        contentType: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
        userRole: z.string().optional(),
        folderId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      const ext = input.fileName.split(".").pop()?.toLowerCase() || "other";
      const roleLevel = ROLE_LEVELS[input.userRole ?? "employee"] ?? 1;
      const status = roleLevel >= 3 ? "active" : "pending_approval";
      const title = input.fileName.replace(/\.[^.]+$/, "");
      const folderId = input.folderId ?? null;
      const uploadedBy = input.userRole ?? "Current User";
      const mimeType = input.contentType ?? "application/octet-stream";
      const description = input.description ?? null;

      let filePath: string | null = null;
      let fileSize = 0;
      let defaultContent: string | null = null;

      // Text-based extensions where we store decoded content in parsed_content
      const TEXT_EXTS = new Set([
        "md", "txt", "json", "xml", "yaml", "yml", "csv", "html", "htm",
        "ts", "tsx", "js", "jsx", "py", "sql", "sh", "bat", "cfg", "ini",
        "st", "scl", "gcode", "nc", "css", "log", "svg",
        // Robot programs (text-based)
        "tp", "ls", "src", "dat", "mod", "prg", "krl", "sys",
        // PLC / automation
        "awl", "scl",
      ]);

      if (input.fileData) {
        // Real file upload
        const buffer = Buffer.from(input.fileData, "base64");
        fileSize = buffer.length;
        const ts = Date.now().toString(36);
        const storageKey = `workspace-files/${folderId ?? "root"}/${ts}-${input.fileName}`;
        try {
          const { key } = await storagePut(storageKey, buffer, mimeType);
          filePath = key;
        } catch (err) {
          log.warn({ err, fileName: input.fileName }, "storagePut failed, saving metadata only");
        }

        // For text-based files, also store the decoded text in parsed_content
        // so the viewer can display it without a separate storage fetch
        if (TEXT_EXTS.has(ext) && buffer.length < 2 * 1024 * 1024) {
          try {
            const textContent = buffer.toString("utf-8");
            defaultContent = JSON.stringify({ text: textContent, type: "code" });
          } catch {
            // binary content, skip
          }
        }
      } else {
        // Metadata-only upload (backward compat)
        fileSize = Math.floor(Math.random() * 100000) + 5000;
        defaultContent = JSON.stringify([
          ["Column A", "Column B", "Column C"],
          ["(uploaded file)", "", ""],
        ]);
      }

      const result = await db.execute(sql`
        INSERT INTO collaboration_docs_files
          (title, file_name, file_type, file_size, folder_id, uploaded_by, status,
           parsed_content, file_path, file_content_type, description, modified_at)
        VALUES
          (${title}, ${input.fileName}, ${ext}, ${fileSize}, ${folderId}, ${uploadedBy}, ${status},
           ${defaultContent}::jsonb, ${filePath}, ${mimeType}, ${description}, NOW())
        RETURNING ${sql.raw(FILE_COLS)}
      `);
      return (result.rows as any[])[0];
    }),

  // ── Save file content (spreadsheet / code / rich text) ──
  saveFile: requirePermission('collab:docs:manage')
    .input(
      z.object({
        id: z.number(),
        parsedContent: z.array(z.array(z.string())).optional(),
        textContent: z.string().optional(),
        richContent: z.string().optional(),
        contentType: z.enum(["spreadsheet", "code", "richtext"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      let content: string;
      if (input.parsedContent !== undefined) {
        content = JSON.stringify(input.parsedContent);
      } else if (input.textContent !== undefined) {
        content = JSON.stringify({ text: input.textContent, type: input.contentType ?? "code" });
      } else if (input.richContent !== undefined) {
        content = JSON.stringify({ html: input.richContent, type: "richtext" });
      } else {
        return { success: false, id: input.id };
      }

      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET parsed_content = ${content}::jsonb, modified_at = NOW()
        WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

  // ── Delete file (soft delete) ──
  deleteFile: requirePermission('collab:docs:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET status = 'deleted', modified_at = NOW()
        WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

  // ── Rename file ──
  renameFile: requirePermission('collab:docs:manage')
    .input(z.object({ id: z.number(), newName: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const ext = input.newName.split(".").pop()?.toLowerCase() || "other";
      const title = input.newName.replace(/\.[^.]+$/, "");
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET file_name = ${input.newName}, title = ${title}, file_type = ${ext}, modified_at = NOW()
        WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

  // ── Move file to different folder ──
  moveFile: requirePermission('collab:docs:manage')
    .input(z.object({ id: z.number(), targetFolderId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET folder_id = ${input.targetFolderId}, modified_at = NOW()
        WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

  // ── List folders ──
  listFolders: protectedProcedure
    .input(
      z.object({
        parentId: z.number().nullable().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      const parentId = input?.parentId ?? null;

      let result;
      if (parentId !== null) {
        result = await db.execute(sql`
          SELECT id, name, parent_id AS "parentId", created_by AS "createdBy", created_at AS "createdAt"
          FROM collaboration_docs_folders
          WHERE parent_id = ${parentId}
          ORDER BY name
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, name, parent_id AS "parentId", created_by AS "createdBy", created_at AS "createdAt"
          FROM collaboration_docs_folders
          WHERE parent_id IS NULL
          ORDER BY name
        `);
      }
      return (result.rows as any[]) || [];
    }),

  // ── Create folder (+ auto-mirror to SharePoint if dept mapping has autoMirror) ──
  createFolder: requirePermission('collab:docs:manage')
    .input(
      z.object({
        name: z.string().min(1).max(200),
        parentId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const parentId = input.parentId ?? null;
      const result = await db.execute(sql`
        INSERT INTO collaboration_docs_folders (name, parent_id, created_by)
        VALUES (${input.name}, ${parentId}, 'Current User')
        RETURNING id, name, parent_id AS "parentId", created_by AS "createdBy", created_at AS "createdAt"
      `);
      const folder = (result.rows as any[])[0];

      // Auto-mirror to SharePoint (fire-and-forget)
      try {
        const msGraph = await import("../services/microsoft-graph/onedrive-sync.service");
        const configMod = await import("../services/microsoft-graph/config");
        const role = (ctx as any).user?.role ?? "employee";
        const buCode = (ctx as any).bu?.buCode ?? null;
        const deptCode = msGraph.departmentMappingService.resolveDeptFromRole(role, buCode);
        const spConfig = await msGraph.departmentMappingService.resolveSPPath(deptCode);
        if (spConfig && configMod.isGraphConfigured()) {
          const deptMappings = await msGraph.departmentMappingService.listDeptMappings();
          const mapping = deptMappings.find((m: any) => m.deptCode === deptCode);
          if (mapping?.autoMirror) {
            const mirrorPath = `${spConfig.spRootPath}/${input.name}`;
            await configMod.graphRequest(
              `https://graph.microsoft.com/v1.0/sites/${spConfig.spSiteId}/drive/root:${mirrorPath}:/children`,
              { method: "PUT", body: JSON.stringify({ name: input.name, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }) }
            );
            await msGraph.departmentMappingService.logSync({
              deptCode, action: "folder_mirror", sourceType: "grt",
              sourcePath: input.name, targetPath: mirrorPath, status: "success",
              triggeredBy: String((ctx as any).user?.id ?? "system"),
            });
          }
        }
      } catch (e: any) {
        // Non-blocking: log but don't fail folder creation
        try {
          const msGraph = await import("../services/microsoft-graph/onedrive-sync.service");
          await msGraph.departmentMappingService.logSync({
            action: "folder_mirror", sourceType: "grt",
            sourcePath: input.name, status: "error",
            errorMessage: e?.message?.substring(0, 200),
            triggeredBy: String((ctx as any).user?.id ?? "system"),
          });
        } catch { /* silent */ }
      }

      return folder;
    }),

  // ── Delete folder (soft-delete files, hard-delete folder) ──
  deleteFolder: requirePermission('collab:docs:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET status = 'deleted', modified_at = NOW()
        WHERE folder_id = ${input.id}
      `);
      await db.execute(sql`DELETE FROM collaboration_docs_folders WHERE id = ${input.id}`);
      return { success: true, id: input.id };
    }),

  // ── Rename folder ──
  renameFolder: requirePermission('collab:docs:manage')
    .input(z.object({ id: z.number(), newName: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE collaboration_docs_folders SET name = ${input.newName} WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

  // ── Approve pending file ──
  approveFile: requirePermission('collab:docs:manage')
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET status = 'active', modified_at = NOW()
        WHERE id = ${input.fileId} AND status = 'pending_approval'
      `);
      return { success: true, fileId: input.fileId };
    }),
});
