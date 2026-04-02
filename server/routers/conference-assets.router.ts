/**
 * 行业大会资料管理 Router
 *
 * 管理各行业大会的演讲资料(PPTX/PDF/VDO)，支持上传、替换、下载。
 * 资料存储在 public/conference-assets/ 目录，通过静态服务直接访问。
 *
 * Tables:
 *   conference_assets — 大会资料元数据（文件名、类型、上传人、版本）
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

let _ready = false;
async function ensureTables() {
  if (_ready) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conference_assets (
      id SERIAL PRIMARY KEY,
      conference_slug VARCHAR(50) NOT NULL,
      conference_name VARCHAR(200) NOT NULL,
      asset_type VARCHAR(30) NOT NULL,
      file_name VARCHAR(300) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size_bytes BIGINT DEFAULT 0,
      mime_type VARCHAR(100),
      version INTEGER DEFAULT 1,
      description TEXT,
      uploaded_by VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(conference_slug, asset_type, version)
    );
  `);
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ca_slug ON conference_assets(conference_slug)`);
  } catch { /* */ }
  _ready = true;
}

// Conference + company intro definitions
const CONFERENCES = [
  { slug: "company-intro",     name: "GRT公司介绍",      nameEn: "GRT Company Introduction", category: "company" },
  { slug: "gear-shaft",       name: "齿轴行业大会",     nameEn: "Gear Shaft Conference",     category: "conference" },
  { slug: "aluminum-casting",  name: "铝铸件行业大会",   nameEn: "Aluminum Casting Conference", category: "conference" },
  { slug: "engine-block",      name: "发动机缸体大会",   nameEn: "Engine Block Conference",     category: "conference" },
  { slug: "injection-system",  name: "喷射系统大会",     nameEn: "Injection System Conference", category: "conference" },
];

const ASSET_TYPES = [
  { code: "presentation", name: "演讲PPT", accept: ".pptx,.ppt,.pdf" },
  { code: "video",        name: "演讲视频", accept: ".mp4,.mov,.avi" },
  { code: "brochure",     name: "产品手册", accept: ".pdf" },
  { code: "poster",       name: "展板/海报", accept: ".pdf,.png,.jpg" },
  { code: "demo_video",   name: "演示视频", accept: ".mp4,.mov" },
  { code: "case_study",   name: "案例资料", accept: ".pdf,.pptx" },
];

export const conferenceAssetsRouter = router({

  /** 获取大会列表 */
  getConferences: protectedProcedure.query(() => CONFERENCES),

  /** 获取资料类型列表 */
  getAssetTypes: protectedProcedure.query(() => ASSET_TYPES),

  /** 获取某大会的所有资料 */
  getAssets: protectedProcedure
    .input(z.object({ conferenceSlug: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = input?.conferenceSlug
        ? await db.execute(sql`
            SELECT * FROM conference_assets
            WHERE conference_slug = ${input.conferenceSlug} AND is_active = true
            ORDER BY asset_type, version DESC
          `)
        : await db.execute(sql`
            SELECT * FROM conference_assets WHERE is_active = true
            ORDER BY conference_slug, asset_type, version DESC
          `);
      return result.rows;
    }),

  /** 注册/更新资料元数据（文件已在 public/conference-assets/ 中） */
  registerAsset: protectedProcedure
    .input(z.object({
      conferenceSlug: z.string(),
      assetType: z.string(),
      fileName: z.string(),
      filePath: z.string(),
      fileSizeBytes: z.number().optional(),
      mimeType: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const conf = CONFERENCES.find(c => c.slug === input.conferenceSlug);
      const confName = conf?.name ?? input.conferenceSlug;
      const uploadedBy = (ctx as any).userName || "CTO";

      // Get next version
      const verRes = await db.execute(sql`
        SELECT COALESCE(max(version), 0) + 1 AS next_ver
        FROM conference_assets
        WHERE conference_slug = ${input.conferenceSlug} AND asset_type = ${input.assetType}
      `);
      const nextVer = Number((verRes.rows as any[])[0]?.next_ver ?? 1);

      // Deactivate old versions
      await db.execute(sql`
        UPDATE conference_assets SET is_active = false, updated_at = NOW()
        WHERE conference_slug = ${input.conferenceSlug} AND asset_type = ${input.assetType}
      `);

      await db.execute(sql`
        INSERT INTO conference_assets (conference_slug, conference_name, asset_type, file_name,
          file_path, file_size_bytes, mime_type, version, description, uploaded_by)
        VALUES (${input.conferenceSlug}, ${confName}, ${input.assetType}, ${input.fileName},
          ${input.filePath}, ${input.fileSizeBytes ?? 0}, ${input.mimeType ?? null},
          ${nextVer}, ${input.description ?? null}, ${uploadedBy})
      `);

      return { success: true, version: nextVer };
    }),

  /** 删除资料 */
  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE conference_assets SET is_active = false, updated_at = NOW()
        WHERE id = ${input.assetId}
      `);
      return { success: true };
    }),

  /** 种子：注册现有的轴齿大会PPTX */
  seedGearShaftAssets: protectedProcedure
    .mutation(async () => {
      await ensureTables();
      const db = await requireDb();

      // Check if file exists
      const assetPath = "/conference-assets/gear-shaft-presentation.pptx";
      const fileName = "轴齿零部件精密清洗智能化解决方案.pptx";

      await db.execute(sql`
        UPDATE conference_assets SET is_active = false
        WHERE conference_slug = 'gear-shaft' AND asset_type = 'presentation'
      `);

      await db.execute(sql`
        INSERT INTO conference_assets (conference_slug, conference_name, asset_type, file_name,
          file_path, file_size_bytes, mime_type, version, description, uploaded_by, is_active)
        VALUES ('gear-shaft', '齿轴行业大会', 'presentation', ${fileName},
          ${assetPath}, 42384955, 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          1, '明日验收用 — 轴齿零部件精密清洗智能化解决方案', 'CTO', true)
        ON CONFLICT (conference_slug, asset_type, version) DO UPDATE SET
          file_name = ${fileName}, file_path = ${assetPath}, is_active = true, updated_at = NOW()
      `);

      return { success: true, message: "齿轴大会PPTX已注册" };
    }),
});
