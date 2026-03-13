/**
 * SharePoint Site Service — 4集群站点架构管理
 *
 * Manages the company-level SharePoint site registry (11 sites across 4 clusters),
 * standardized project folder templates (12-folder structure for P-{year}-{seq}),
 * and site-level sync policies.
 */
import { graphRequest, isGraphConfigured } from "./config";
import { departmentMappingService } from "./onedrive-sync.service";
import { createChildLogger } from "../../lib/logger";
import { requireDb } from "../../db";
import { sql } from "drizzle-orm";

const log = createChildLogger("sp-site-service");

// ── Types ────────────────────────────────────────────────

export interface SPSite {
  id: number;
  siteCode: string;
  cluster: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  spSiteId: string | null;
  spSiteUrl: string | null;
  orgNodeId: number | null;
  ownerDeptCode: string | null;
  folderTemplate: string | null;
  syncPolicy: string;
  syncCronExpr: string | null;
  accessLevel: string;
  allowedRoles: string | null;
  isActive: boolean;
}

export interface SPSiteFolder {
  id: number;
  siteCode: string;
  folderPath: string;
  folderName: string;
  folderNameZh: string | null;
  parentPath: string | null;
  isTemplate: boolean;
  projectCode: string | null;
  syncDirection: string;
  autoSync: boolean;
  spFolderId: string | null;
  lastSyncAt: string | null;
  status: string;
}

export interface ClusterSummary {
  cluster: string;
  clusterName: string;
  clusterNameEn: string;
  siteCount: number;
  totalFolders: number;
}

// ── Seed Data ────────────────────────────────────────────

const DEFAULT_SP_SITES: Array<Omit<SPSite, "id" | "isActive" | "spSiteId" | "spSiteUrl" | "orgNodeId" | "description" | "syncCronExpr" | "allowedRoles">> = [
  // Cluster A: Company Wide
  { siteCode: "00_GRT_Portal",        cluster: "A", name: "公司主页/公告/新闻",          nameEn: "Company Portal / Announcements / News",           ownerDeptCode: "ADM",        folderTemplate: "flat",        syncPolicy: "auto",      accessLevel: "internal" },
  { siteCode: "01_Management_Office",  cluster: "A", name: "决策文件/战略规划/合规审计",  nameEn: "Decision Docs / Strategy / Compliance",            ownerDeptCode: "MGMT_OFFICE", folderTemplate: "flat",       syncPolicy: "manual",    accessLevel: "confidential" },

  // Cluster B: Support Functions
  { siteCode: "02_HR_Center",          cluster: "B", name: "人事制度/培训资料/绩效数据",  nameEn: "HR Policies / Training / Performance",             ownerDeptCode: "HR",          folderTemplate: "flat",       syncPolicy: "scheduled", accessLevel: "restricted" },
  { siteCode: "03_Finance_Legal",      cluster: "B", name: "财务报表/合同模板/法务合规",  nameEn: "Financial Reports / Contracts / Legal Compliance",  ownerDeptCode: "FIN",         folderTemplate: "flat",       syncPolicy: "manual",    accessLevel: "confidential" },
  { siteCode: "04_IT_AI_Lab",          cluster: "B", name: "系统文档/AI知识库/开发规范",  nameEn: "System Docs / AI Knowledge Base / Dev Standards",   ownerDeptCode: "IT_AI",       folderTemplate: "flat",       syncPolicy: "auto",      accessLevel: "internal" },

  // Cluster C: Core Business
  { siteCode: "05_Marketing_Sales",    cluster: "C", name: "市场策划/客户档案/数字展厅",  nameEn: "Marketing Plan / Customer Files / Digital Showroom", ownerDeptCode: "MKT",        folderTemplate: "flat",       syncPolicy: "auto",      accessLevel: "internal" },
  { siteCode: "06_Supply_Chain",       cluster: "C", name: "供应商文件/采购合同/物流记录", nameEn: "Supplier Docs / Purchase Contracts / Logistics",    ownerDeptCode: "SCM",        folderTemplate: "flat",       syncPolicy: "scheduled", accessLevel: "internal" },
  { siteCode: "07_Project_Hub",        cluster: "C", name: "项目中心 (P-{year}-{seq})",  nameEn: "Project Hub (50-100 units/year)",                   ownerDeptCode: "PROJ_HUB",   folderTemplate: "project_12", syncPolicy: "auto",      accessLevel: "internal" },
  { siteCode: "08_Business_Units",     cluster: "C", name: "事业部总站 (BU1-BU5)",       nameEn: "Business Units Hub (BU1-BU5)",                     ownerDeptCode: "BU_HUB",     folderTemplate: "bu_standard", syncPolicy: "auto",     accessLevel: "restricted" },

  // Cluster D: Personal / External
  { siteCode: "My_Workspace",          cluster: "D", name: "个人文档/草稿/收藏",         nameEn: "Personal Docs / Drafts / Favorites",               ownerDeptCode: null,          folderTemplate: "flat",       syncPolicy: "auto",      accessLevel: "public" },
  { siteCode: "Client_Extranet",       cluster: "D", name: "客户共享文件/报告/证书",     nameEn: "Client-Facing Shared Files / Reports / Certs",      ownerDeptCode: null,          folderTemplate: "flat",       syncPolicy: "manual",    accessLevel: "public" },
];

const PROJECT_FOLDER_TEMPLATE = [
  { folderName: "01_Requirements",      folderNameZh: "01_需求文档" },
  { folderName: "02_Proposal",          folderNameZh: "02_方案设计" },
  { folderName: "03_Mechanical_Design", folderNameZh: "03_机械设计" },
  { folderName: "04_Electrical_Design", folderNameZh: "04_电气设计" },
  { folderName: "05_BOM_Procurement",   folderNameZh: "05_BOM与采购" },
  { folderName: "06_Assembly",          folderNameZh: "06_装配记录" },
  { folderName: "07_Testing_QC",        folderNameZh: "07_测试质检" },
  { folderName: "08_FAT_SAT",          folderNameZh: "08_出厂与现场验收" },
  { folderName: "09_Shipping",          folderNameZh: "09_发货记录" },
  { folderName: "10_Site_Installation", folderNameZh: "10_现场安装" },
  { folderName: "11_Warranty_Service",  folderNameZh: "11_质保售后" },
  { folderName: "12_Lessons_Learned",   folderNameZh: "12_经验教训" },
];

const BU_FOLDER_TEMPLATE = [
  { folderName: "Sales",            folderNameZh: "销售" },
  { folderName: "Engineering",      folderNameZh: "工程" },
  { folderName: "Projects",         folderNameZh: "项目" },
  { folderName: "Quality",          folderNameZh: "质量" },
  { folderName: "Procurement",      folderNameZh: "采购" },
  { folderName: "Customer_Service", folderNameZh: "客户服务" },
];

const CLUSTER_NAMES: Record<string, { zh: string; en: string }> = {
  A: { zh: "公司级", en: "Company Wide" },
  B: { zh: "支持职能", en: "Support Functions" },
  C: { zh: "核心业务", en: "Core Business" },
  D: { zh: "个人/外部", en: "Personal / External" },
};

// ── Helper ──────────────────────────────────────────────

function mapSiteRow(r: any): SPSite {
  return {
    id: r.id,
    siteCode: r.site_code,
    cluster: r.cluster,
    name: r.name,
    nameEn: r.name_en ?? null,
    description: r.description ?? null,
    spSiteId: r.sp_site_id ?? null,
    spSiteUrl: r.sp_site_url ?? null,
    orgNodeId: r.org_node_id ?? null,
    ownerDeptCode: r.owner_dept_code ?? null,
    folderTemplate: r.folder_template ?? null,
    syncPolicy: r.sync_policy ?? "manual",
    syncCronExpr: r.sync_cron_expr ?? null,
    accessLevel: r.access_level ?? "internal",
    allowedRoles: r.allowed_roles ?? null,
    isActive: r.is_active ?? true,
  };
}

function mapFolderRow(r: any): SPSiteFolder {
  return {
    id: r.id,
    siteCode: r.site_code,
    folderPath: r.folder_path,
    folderName: r.folder_name,
    folderNameZh: r.folder_name_zh ?? null,
    parentPath: r.parent_path ?? null,
    isTemplate: !!r.is_template,
    projectCode: r.project_code ?? null,
    syncDirection: r.sync_direction ?? "bidirectional",
    autoSync: !!r.auto_sync,
    spFolderId: r.sp_folder_id ?? null,
    lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : null,
    status: r.status ?? "active",
  };
}

// ── Service ─────────────────────────────────────────────

export const sharepointSiteService = {
  /** List all sites, optionally filtered by cluster */
  async listSites(cluster?: string): Promise<SPSite[]> {
    try {
      const db = await requireDb();
      const result = cluster
        ? await db.execute(sql`
            SELECT * FROM sharepoint_sites WHERE is_active = true AND cluster = ${cluster}
            ORDER BY cluster, site_code LIMIT 100
          `)
        : await db.execute(sql`
            SELECT * FROM sharepoint_sites WHERE is_active = true
            ORDER BY cluster, site_code LIMIT 100
          `);
      return (result.rows as any[]).map(mapSiteRow);
    } catch {
      return DEFAULT_SP_SITES.filter(s => !cluster || s.cluster === cluster).map((s, i) => ({
        ...s, id: i + 1, description: null, spSiteId: null, spSiteUrl: null,
        orgNodeId: null, syncCronExpr: null, allowedRoles: null, isActive: true,
      }));
    }
  },

  /** Get a single site by code */
  async getSite(siteCode: string): Promise<SPSite | null> {
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM sharepoint_sites WHERE site_code = ${siteCode} LIMIT 1
      `);
      if ((result.rows as any[]).length === 0) return null;
      return mapSiteRow((result.rows as any[])[0]);
    } catch {
      const fallback = DEFAULT_SP_SITES.find(s => s.siteCode === siteCode);
      if (!fallback) return null;
      return { ...fallback, id: 0, description: null, spSiteId: null, spSiteUrl: null, orgNodeId: null, syncCronExpr: null, allowedRoles: null, isActive: true };
    }
  },

  /** Upsert a site configuration */
  async upsertSite(input: {
    siteCode: string; cluster: string; name: string;
    nameEn?: string; description?: string; spSiteId?: string; spSiteUrl?: string;
    ownerDeptCode?: string; folderTemplate?: string;
    syncPolicy?: string; syncCronExpr?: string; accessLevel?: string; allowedRoles?: string;
  }): Promise<SPSite> {
    const db = await requireDb();
    const existing = await db.execute(sql`SELECT id FROM sharepoint_sites WHERE site_code = ${input.siteCode} LIMIT 1`);
    if ((existing.rows as any[]).length > 0) {
      const id = (existing.rows as any[])[0].id;
      await db.execute(sql`
        UPDATE sharepoint_sites SET
          cluster = ${input.cluster}, name = ${input.name}, name_en = ${input.nameEn ?? null},
          description = ${input.description ?? null}, sp_site_id = ${input.spSiteId ?? null},
          sp_site_url = ${input.spSiteUrl ?? null}, owner_dept_code = ${input.ownerDeptCode ?? null},
          folder_template = ${input.folderTemplate ?? null}, sync_policy = ${input.syncPolicy ?? "manual"},
          sync_cron_expr = ${input.syncCronExpr ?? null}, access_level = ${input.accessLevel ?? "internal"},
          allowed_roles = ${input.allowedRoles ?? null}
        WHERE id = ${id}
      `);
      return { id, ...input, nameEn: input.nameEn ?? null, description: input.description ?? null,
        spSiteId: input.spSiteId ?? null, spSiteUrl: input.spSiteUrl ?? null, orgNodeId: null,
        ownerDeptCode: input.ownerDeptCode ?? null, folderTemplate: input.folderTemplate ?? null,
        syncPolicy: input.syncPolicy ?? "manual", syncCronExpr: input.syncCronExpr ?? null,
        accessLevel: input.accessLevel ?? "internal", allowedRoles: input.allowedRoles ?? null, isActive: true };
    }

    await db.execute(sql`
      INSERT INTO sharepoint_sites (site_code, cluster, name, name_en, description, sp_site_id, sp_site_url,
        owner_dept_code, folder_template, sync_policy, sync_cron_expr, access_level, allowed_roles)
      VALUES (${input.siteCode}, ${input.cluster}, ${input.name}, ${input.nameEn ?? null},
        ${input.description ?? null}, ${input.spSiteId ?? null}, ${input.spSiteUrl ?? null},
        ${input.ownerDeptCode ?? null}, ${input.folderTemplate ?? null}, ${input.syncPolicy ?? "manual"},
        ${input.syncCronExpr ?? null}, ${input.accessLevel ?? "internal"}, ${input.allowedRoles ?? null})
    `);
    return { id: 0, ...input, nameEn: input.nameEn ?? null, description: input.description ?? null,
      spSiteId: input.spSiteId ?? null, spSiteUrl: input.spSiteUrl ?? null, orgNodeId: null,
      ownerDeptCode: input.ownerDeptCode ?? null, folderTemplate: input.folderTemplate ?? null,
      syncPolicy: input.syncPolicy ?? "manual", syncCronExpr: input.syncCronExpr ?? null,
      accessLevel: input.accessLevel ?? "internal", allowedRoles: input.allowedRoles ?? null, isActive: true };
  },

  /** Seed 11 default sites (upsert mode) */
  async seedDefaultSites(): Promise<number> {
    let count = 0;
    for (const s of DEFAULT_SP_SITES) {
      try {
        await this.upsertSite(s);
        count++;
      } catch { /* skip */ }
    }
    return count;
  },

  /** List folder templates for a site */
  async listFolderTemplates(siteCode: string): Promise<SPSiteFolder[]> {
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM sharepoint_site_folders
        WHERE site_code = ${siteCode} AND is_template = true
        ORDER BY folder_name LIMIT 100
      `);
      return (result.rows as any[]).map(mapFolderRow);
    } catch {
      if (siteCode === "07_Project_Hub") {
        return PROJECT_FOLDER_TEMPLATE.map((t, i) => ({
          id: i + 1, siteCode, folderPath: `/${t.folderName}`, folderName: t.folderName,
          folderNameZh: t.folderNameZh, parentPath: null, isTemplate: true, projectCode: null,
          syncDirection: "bidirectional", autoSync: false, spFolderId: null, lastSyncAt: null, status: "active",
        }));
      }
      return [];
    }
  },

  /** Seed project folder templates (12 rows for 07_Project_Hub + 6 for BU) */
  async seedProjectFolderTemplates(): Promise<number> {
    let count = 0;
    try {
      const db = await requireDb();
      for (const t of PROJECT_FOLDER_TEMPLATE) {
        try {
          const existing = await db.execute(sql`
            SELECT id FROM sharepoint_site_folders
            WHERE site_code = '07_Project_Hub' AND folder_name = ${t.folderName} AND is_template = true LIMIT 1
          `);
          if ((existing.rows as any[]).length === 0) {
            await db.execute(sql`
              INSERT INTO sharepoint_site_folders (site_code, folder_path, folder_name, folder_name_zh, is_template, sync_direction, auto_sync)
              VALUES ('07_Project_Hub', ${`/${t.folderName}`}, ${t.folderName}, ${t.folderNameZh}, true, 'bidirectional', false)
            `);
            count++;
          }
        } catch { /* skip */ }
      }
      // BU standard folders for 08_Business_Units
      for (const t of BU_FOLDER_TEMPLATE) {
        try {
          const existing = await db.execute(sql`
            SELECT id FROM sharepoint_site_folders
            WHERE site_code = '08_Business_Units' AND folder_name = ${t.folderName} AND is_template = true LIMIT 1
          `);
          if ((existing.rows as any[]).length === 0) {
            await db.execute(sql`
              INSERT INTO sharepoint_site_folders (site_code, folder_path, folder_name, folder_name_zh, is_template, sync_direction, auto_sync)
              VALUES ('08_Business_Units', ${`/${t.folderName}`}, ${t.folderName}, ${t.folderNameZh}, true, 'bidirectional', false)
            `);
            count++;
          }
        } catch { /* skip */ }
      }
    } catch (e: any) {
      log.warn({ err: e }, "Failed to seed folder templates");
    }
    return count;
  },

  /** Create standardized project folders (12 sub-folders) for a project code */
  async createProjectFolders(projectCode: string, buCode?: string): Promise<{ created: number; siteCode: string; folders: string[] }> {
    const siteCode = "07_Project_Hub";
    const folders: string[] = [];
    let created = 0;

    try {
      const db = await requireDb();

      // Check if folders already exist for this project
      const check = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM sharepoint_site_folders
        WHERE site_code = ${siteCode} AND project_code = ${projectCode} AND is_template = false
      `);
      if (Number((check.rows as any[])[0]?.cnt) > 0) {
        return { created: 0, siteCode, folders: [] };
      }

      for (const t of PROJECT_FOLDER_TEMPLATE) {
        const folderPath = `/${projectCode}/${t.folderName}`;
        try {
          await db.execute(sql`
            INSERT INTO sharepoint_site_folders (site_code, folder_path, folder_name, folder_name_zh, parent_path, is_template, project_code, sync_direction, auto_sync)
            VALUES (${siteCode}, ${folderPath}, ${t.folderName}, ${t.folderNameZh}, ${`/${projectCode}`}, false, ${projectCode}, 'bidirectional', true)
          `);
          folders.push(folderPath);
          created++;
        } catch { /* skip */ }
      }

      // Create actual SharePoint folders if Graph is configured
      if (isGraphConfigured() && created > 0) {
        try {
          const site = await this.getSite(siteCode);
          const spSiteId = site?.spSiteId;
          if (spSiteId && spSiteId !== "default") {
            // Create project root folder
            await graphRequest(`https://graph.microsoft.com/v1.0/sites/${spSiteId}/drive/root:/${projectCode}:/children`, {
              method: "POST",
              body: JSON.stringify({ name: projectCode, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
            });
            // Create sub-folders
            for (const t of PROJECT_FOLDER_TEMPLATE) {
              await graphRequest(`https://graph.microsoft.com/v1.0/sites/${spSiteId}/drive/root:/${projectCode}/${t.folderName}:/children`, {
                method: "POST",
                body: JSON.stringify({ name: t.folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
              });
            }
          }
        } catch (e: any) {
          log.warn({ err: e, projectCode }, "Failed to create SP folders (local DB rows created)");
        }
      }

      // Log sync
      await departmentMappingService.logSync({
        deptCode: buCode ?? "PROJ_HUB",
        action: "project_folder_create",
        sourceType: "grt",
        sourcePath: projectCode,
        targetPath: `/sites/07_Project_Hub/${projectCode}`,
        status: "success",
        fileCount: created,
        triggeredBy: "system",
      });
    } catch (e: any) {
      log.error({ err: e, projectCode }, "Failed to create project folders");
    }

    return { created, siteCode, folders };
  },

  /** Get next available project code (P-{year}-{seq}) */
  async getNextProjectCode(year?: number): Promise<string> {
    const y = year ?? new Date().getFullYear();
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT project_code FROM sharepoint_site_folders
        WHERE project_code LIKE ${`P-${y}-%`} AND is_template = false
        ORDER BY project_code DESC LIMIT 1
      `);
      if ((result.rows as any[]).length > 0) {
        const lastCode = (result.rows as any[])[0].project_code as string;
        const seq = parseInt(lastCode.split("-")[2], 10);
        return `P-${y}-${String(seq + 1).padStart(3, "0")}`;
      }
    } catch { /* fall through */ }
    return `P-${y}-001`;
  },

  /** Get cluster-level summary statistics */
  async getClusterSummary(): Promise<ClusterSummary[]> {
    const summaries: ClusterSummary[] = [];
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT s.cluster, COUNT(DISTINCT s.id) as site_count,
          COALESCE((SELECT COUNT(*) FROM sharepoint_site_folders f WHERE f.site_code = ANY(ARRAY_AGG(s.site_code))), 0) as folder_count
        FROM sharepoint_sites s WHERE s.is_active = true
        GROUP BY s.cluster ORDER BY s.cluster LIMIT 10
      `);
      for (const r of (result.rows as any[])) {
        const c = r.cluster as string;
        const meta = CLUSTER_NAMES[c] ?? { zh: c, en: c };
        summaries.push({
          cluster: c,
          clusterName: meta.zh,
          clusterNameEn: meta.en,
          siteCount: Number(r.site_count) || 0,
          totalFolders: Number(r.folder_count) || 0,
        });
      }
    } catch {
      // Fallback from seed data
      const byCluster: Record<string, number> = {};
      for (const s of DEFAULT_SP_SITES) {
        byCluster[s.cluster] = (byCluster[s.cluster] || 0) + 1;
      }
      for (const [c, count] of Object.entries(byCluster)) {
        const meta = CLUSTER_NAMES[c] ?? { zh: c, en: c };
        summaries.push({ cluster: c, clusterName: meta.zh, clusterNameEn: meta.en, siteCount: count, totalFolders: 0 });
      }
    }
    return summaries;
  },

  /** Run site-level sync for a specific site */
  async runSiteLevelSync(siteCode: string): Promise<{ synced: number; errors: number }> {
    let synced = 0, errors = 0;
    const site = await this.getSite(siteCode);
    if (!site || site.syncPolicy === "disabled") return { synced, errors };

    try {
      const db = await requireDb();
      const folders = await db.execute(sql`
        SELECT * FROM sharepoint_site_folders
        WHERE site_code = ${siteCode} AND is_template = false AND status = 'active' AND auto_sync = true
        LIMIT 500
      `);

      for (const r of (folders.rows as any[])) {
        try {
          // Mark as synced (actual Graph sync deferred to scheduled job)
          await db.execute(sql`
            UPDATE sharepoint_site_folders SET last_sync_at = NOW() WHERE id = ${r.id}
          `);
          synced++;
        } catch {
          errors++;
        }
      }

      await departmentMappingService.logSync({
        deptCode: site.ownerDeptCode,
        action: "site_sync",
        sourceType: "grt",
        sourcePath: siteCode,
        targetPath: site.spSiteUrl ?? siteCode,
        status: errors === 0 ? "success" : "error",
        fileCount: synced,
        triggeredBy: "system",
      });
    } catch (e: any) {
      log.warn({ err: e, siteCode }, "Site-level sync failed");
    }
    return { synced, errors };
  },
};
