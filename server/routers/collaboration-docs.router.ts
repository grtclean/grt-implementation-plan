import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
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

    // Seed folders
    await db.execute(sql`
      INSERT INTO collaboration_docs_folders (id, name, parent_id, created_by, created_at) VALUES
        (1, 'CEO 文件', NULL, 'CEO', '2026-02-10T08:00:00Z'),
        (2, '项目模板', NULL, 'COO', '2026-02-12T09:00:00Z')
    `);
    // Reset sequence
    await db.execute(sql`SELECT setval('collaboration_docs_folders_id_seq', 2, true)`);

    // Seed files
    await db.execute(sql`
      INSERT INTO collaboration_docs_files (id, title, file_name, file_type, file_size, folder_id, uploaded_by, status, parsed_content, modified_at) VALUES
        (1, 'CEO 3-Week Masterplan Tracker', 'CEO-3Week-Masterplan-Tracker.xlsx', 'xlsx', 52480, 1, 'CEO', 'active',
         ${JSON.stringify([
           ["Task ID", "To do", "suggestion execute time", "gemini preparation", "claude done"],
           ["1.1", "HR / RBAC User Management", "2026-02-25", "Role matrix designed", "✅ Complete"],
           ["1.2", "Collaboration & Document Hub", "2026-02-27", "OneDrive spec ready", "🔄 In Progress"],
           ["1.3", "OKR + Strategy Cockpit", "2026-02-28", "KPI tree drafted", "Pending"],
           ["2.1", "IoT Fleet Dashboard v2", "2026-03-01", "Sensor API mapped", "Pending"],
           ["2.2", "AI Performance Engine v2", "2026-03-02", "Scoring model tuned", "Pending"],
           ["2.3", "Meeting Intelligence Hub", "2026-03-03", "Diarization spec", "Pending"],
           ["3.1", "Mobile Super-App Shell", "2026-03-05", "DingTalk SDK ready", "Pending"],
           ["3.2", "Enterprise Search + Copilot", "2026-03-07", "RAG index built", "Pending"],
           ["3.3", "CEO Launch & Go-Live", "2026-03-10", "Launch checklist", "Pending"],
         ])}::jsonb,
         '2026-02-27T08:00:00Z'),
        (2, 'Q4 Quality Audit Report', 'Q4-Quality-Audit-Report.xlsx', 'xlsx', 131584, NULL, 'Quality Manager', 'active',
         ${JSON.stringify([
           ["Audit Item", "Status", "Score", "Remarks"],
           ["Process Control", "Passed", "92", "Minor observation on SPC"],
           ["Document Control", "Passed", "88", "Update revision matrix"],
           ["Calibration", "Passed", "95", "All instruments within spec"],
         ])}::jsonb,
         '2026-02-15T14:20:00Z'),
        (3, '供应商评估矩阵', '供应商评估矩阵.csv', 'csv', 23654, NULL, '采购部', 'active',
         ${JSON.stringify([
           ["供应商", "质量评分", "交期评分", "综合等级"],
           ["Supplier A", "95", "90", "A"],
           ["Supplier B", "88", "85", "B"],
           ["Supplier C", "72", "80", "C"],
         ])}::jsonb,
         '2026-02-10T09:15:00Z'),
        (4, '2026年度运营计划', '2026年度运营计划.xlsx', 'xlsx', 91853, 2, 'COO', 'active',
         ${JSON.stringify([
           ["Quarter", "Target", "KPI", "Owner"],
           ["Q1", "Launch GRT System v2", "System uptime > 99.5%", "CTO"],
           ["Q2", "Expand to 3 new BUs", "User adoption > 80%", "COO"],
           ["Q3", "AI Integration Phase 2", "Automation rate > 60%", "AI Lead"],
           ["Q4", "Full Digital Transformation", "Paper reduction > 90%", "CEO"],
         ])}::jsonb,
         '2026-02-05T16:45:00Z')
    `);
    // Reset sequence
    await db.execute(sql`SELECT setval('collaboration_docs_files_id_seq', 4, true)`);
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const collaborationDocsRouter = router({
  listFiles: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        fileType: z.string().optional(),
        folderId: z.number().nullable().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      const folderId = input?.folderId ?? null;
      const search = input?.search;
      const fileType = input?.fileType;

      let result;
      if (search && fileType) {
        const q = `%${search}%`;
        result = await db.execute(sql`
          SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                 folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                 modified_at AS "modifiedAt"
          FROM collaboration_docs_files
          WHERE (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND (title ILIKE ${q} OR file_name ILIKE ${q})
            AND file_type = ${fileType}
          ORDER BY modified_at DESC
        `);
      } else if (search) {
        const q = `%${search}%`;
        result = await db.execute(sql`
          SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                 folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                 modified_at AS "modifiedAt"
          FROM collaboration_docs_files
          WHERE (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND (title ILIKE ${q} OR file_name ILIKE ${q})
          ORDER BY modified_at DESC
        `);
      } else if (fileType) {
        result = await db.execute(sql`
          SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                 folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                 modified_at AS "modifiedAt"
          FROM collaboration_docs_files
          WHERE (folder_id = ${folderId} OR (${folderId} IS NULL AND folder_id IS NULL))
            AND file_type = ${fileType}
          ORDER BY modified_at DESC
        `);
      } else if (folderId !== null && folderId !== undefined) {
        result = await db.execute(sql`
          SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                 folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                 modified_at AS "modifiedAt"
          FROM collaboration_docs_files
          WHERE folder_id = ${folderId}
          ORDER BY modified_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                 folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                 modified_at AS "modifiedAt"
          FROM collaboration_docs_files
          WHERE folder_id IS NULL
          ORDER BY modified_at DESC
        `);
      }

      const items = (result.rows as any[]) || [];
      return { items, total: items.length };
    }),

  getFile: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
               folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
               parsed_content AS "parsedContent",
               modified_at AS "modifiedAt"
        FROM collaboration_docs_files
        WHERE id = ${input.id}
        LIMIT 1
      `);
      const rows = (result.rows as any[]) || [];
      return rows[0] ?? null;
    }),

  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
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
      const fileSize = Math.floor(Math.random() * 100000) + 5000;
      const folderId = input.folderId ?? null;
      const uploadedBy = input.userRole ?? "Current User";
      const defaultContent = JSON.stringify([
        ["Column A", "Column B", "Column C"],
        ["(uploaded file)", "", ""],
      ]);

      const result = await db.execute(sql`
        INSERT INTO collaboration_docs_files
          (title, file_name, file_type, file_size, folder_id, uploaded_by, status, parsed_content, modified_at)
        VALUES
          (${title}, ${input.fileName}, ${ext}, ${fileSize}, ${folderId}, ${uploadedBy}, ${status}, ${defaultContent}::jsonb, NOW())
        RETURNING id, title, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize",
                  folder_id AS "folderId", uploaded_by AS "uploadedBy", status,
                  modified_at AS "modifiedAt"
      `);
      return (result.rows as any[])[0];
    }),

  // ── Save file content (spreadsheet edits) ──
  saveFile: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        parsedContent: z.array(z.array(z.string())),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const content = JSON.stringify(input.parsedContent);
      await db.execute(sql`
        UPDATE collaboration_docs_files
        SET parsed_content = ${content}::jsonb, modified_at = NOW()
        WHERE id = ${input.id}
      `);
      return { success: true, id: input.id };
    }),

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

  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        parentId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parentId = input.parentId ?? null;
      const result = await db.execute(sql`
        INSERT INTO collaboration_docs_folders (name, parent_id, created_by)
        VALUES (${input.name}, ${parentId}, 'Current User')
        RETURNING id, name, parent_id AS "parentId", created_by AS "createdBy", created_at AS "createdAt"
      `);
      return (result.rows as any[])[0];
    }),

  approveFile: protectedProcedure
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
