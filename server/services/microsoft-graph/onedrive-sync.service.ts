/**
 * Microsoft Graph — OneDrive Sync Service
 *
 * Enables dual storage: files exist in both GRT workspace and OneDrive/SharePoint.
 * Changes in GRT are pushed to OneDrive, and OneDrive changes can be pulled.
 */
import { graphRequest, isGraphConfigured } from "./config";
import { createChildLogger } from "../../lib/logger";
import { requireDb } from "../../db";
import { sql } from "drizzle-orm";

const log = createChildLogger("ms-graph-onedrive-sync");

// ── Graph API response types ─────────────────────────────

interface GraphDriveItem {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType?: string };
  webUrl?: string;
  "@microsoft.graph.downloadUrl"?: string;
  lastModifiedDateTime?: string;
  createdBy?: { user?: { displayName?: string } };
  parentReference?: { path?: string };
}

interface GraphDriveItemResponse {
  id: string;
  webUrl?: string;
}

interface GraphDeltaResponse {
  value?: GraphDriveItem[];
  "@odata.deltaLink"?: string;
}

/** Raw row returned from sharepoint_folder_mappings */
interface FolderMappingRow {
  id: number;
  grt_folder_id: number;
  grt_folder_name: string;
  sharepoint_site_id: string;
  sharepoint_folder_id: string | null;
  sharepoint_path: string;
  sync_direction: string;
  auto_sync: boolean;
  last_sync_at: string | null;
  status: string;
  created_at: string;
  cnt?: number;
}

/** Raw row returned from organization_nodes */
interface OrgNodeRow {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  parent_id: number | null;
  bu_id: number | null;
  sp_site_id: string | null;
  sp_root_path: string | null;
  sp_token_scope: string | null;
  data_scope: string | null;
  is_active: boolean | null;
  cluster: string | null;
  site_code: string | null;
  sort_order: number | null;
}

/** Raw row returned from department_sp_mappings */
interface DeptSpMappingRow {
  id: number;
  dept_code: string;
  sp_site_id: string;
  sp_root_path: string;
  sync_direction: string | null;
  auto_sync: boolean;
  auto_mirror: boolean;
  status: string | null;
}

/** Raw row returned from sync_logs */
interface SyncLogRow {
  id: number;
  dept_code: string | null;
  action: string;
  source_type: string;
  source_path: string | null;
  target_path: string | null;
  status: string;
  error_message: string | null;
  file_count: number | null;
  bytes_transferred: number | null;
  triggered_by: string | null;
  created_at: string | null;
}

/** Raw row returned from collaboration_docs_files */
interface DocFileRow {
  id: number;
  file_name: string;
  file_path: string | null;
  file_size: number;
}

// ── Types ────────────────────────────────────────────────

export interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  webUrl: string;
  downloadUrl: string;
  lastModifiedDateTime: string;
  createdBy: string;
  parentPath: string;
}

export interface SyncResult {
  success: boolean;
  oneDriveId?: string;
  webUrl?: string;
  error?: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  itemsSynced: number;
  pendingUploads: number;
  pendingDownloads: number;
  errors: number;
}

// ── Folder mapping types ──

export interface FolderMapping {
  id: number;
  grtFolderId: number;
  grtFolderName: string;
  sharepointSiteId: string;
  sharepointFolderId: string | null;
  sharepointPath: string;
  syncDirection: "bidirectional" | "grt_to_sp" | "sp_to_grt";
  autoSync: boolean;
  lastSyncAt: string | null;
  status: "active" | "paused" | "error";
  createdAt: string;
}

// ── DB table for folder mapping + sync registry ──
let folderMappingTableEnsured = false;

async function ensureFolderMappingTable() {
  if (folderMappingTableEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sharepoint_folder_mappings (
        id SERIAL PRIMARY KEY,
        grt_folder_id INTEGER NOT NULL,
        grt_folder_name VARCHAR(255) NOT NULL,
        sharepoint_site_id VARCHAR(255) NOT NULL DEFAULT 'default',
        sharepoint_folder_id VARCHAR(500),
        sharepoint_path VARCHAR(1000) NOT NULL,
        sync_direction VARCHAR(20) NOT NULL DEFAULT 'bidirectional',
        auto_sync BOOLEAN NOT NULL DEFAULT false,
        last_sync_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS onedrive_sync_registry (
        id SERIAL PRIMARY KEY,
        grt_file_id INTEGER NOT NULL,
        onedrive_id VARCHAR(500) NOT NULL,
        web_url VARCHAR(2000),
        last_sync_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(grt_file_id)
      )
    `);
    folderMappingTableEnsured = true;
  } catch (e: unknown) {
    log.warn({ err: e }, "ensureFolderMappingTable failed");
    folderMappingTableEnsured = true;
  }
}

// ── In-memory sync tracking (fallback, DB-backed when available) ──
const syncRegistry = new Map<number, { oneDriveId: string; lastSyncAt: string; webUrl: string }>();

// ── Mock Data ────────────────────────────────────────────

const mockDriveItems: OneDriveItem[] = [
  {
    id: "od-1", name: "GRT-CL2000-BOM.xlsx", size: 245760, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    webUrl: "https://grt365.sharepoint.com/sites/engineering/GRT-CL2000-BOM.xlsx",
    downloadUrl: "", lastModifiedDateTime: "2026-03-05T10:30:00Z",
    createdBy: "孙国祥", parentPath: "/drives/root/Engineering/GRT-CL2000",
  },
  {
    id: "od-2", name: "设计评审记录.docx", size: 102400, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    webUrl: "https://grt365.sharepoint.com/sites/engineering/设计评审记录.docx",
    downloadUrl: "", lastModifiedDateTime: "2026-03-04T14:00:00Z",
    createdBy: "李大鹏", parentPath: "/drives/root/Engineering/Reviews",
  },
  {
    id: "od-3", name: "清洗槽-V3.step", size: 5242880, mimeType: "application/step",
    webUrl: "https://grt365.sharepoint.com/sites/engineering/清洗槽-V3.step",
    downloadUrl: "", lastModifiedDateTime: "2026-03-03T16:00:00Z",
    createdBy: "洪香龙", parentPath: "/drives/root/Engineering/CAD",
  },
];

// ── Service ──────────────────────────────────────────────

export const oneDriveSyncService = {
  /**
   * Upload a file from GRT workspace to OneDrive.
   * Returns the OneDrive item URL for dual-link tracking.
   */
  async uploadToOneDrive(input: {
    fileName: string;
    fileBuffer: Buffer;
    contentType: string;
    folderPath?: string;
    grtFileId: number;
  }): Promise<SyncResult> {
    const { fileName, fileBuffer, contentType, folderPath, grtFileId } = input;
    log.info({ fileName, grtFileId, folderPath }, "Uploading to OneDrive");

    if (!isGraphConfigured()) {
      // Simulate successful upload
      const mockResult: SyncResult = {
        success: true,
        oneDriveId: `od-mock-${Date.now()}`,
        webUrl: `https://grt365.sharepoint.com/sites/engineering/${encodeURIComponent(fileName)}`,
      };
      syncRegistry.set(grtFileId, {
        oneDriveId: mockResult.oneDriveId!,
        lastSyncAt: new Date().toISOString(),
        webUrl: mockResult.webUrl!,
      });
      return mockResult;
    }

    try {
      const path = folderPath
        ? `/me/drive/root:/${folderPath}/${fileName}:/content`
        : `/me/drive/root:/${fileName}:/content`;

      const endpoint = `https://graph.microsoft.com/v1.0${path}`;

      const result = await graphRequest<GraphDriveItemResponse>(endpoint, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: fileBuffer as unknown as BodyInit,
      });

      if (!result?.id) {
        return { success: false, error: "Upload failed — no ID returned" };
      }

      syncRegistry.set(grtFileId, {
        oneDriveId: result.id,
        lastSyncAt: new Date().toISOString(),
        webUrl: result.webUrl ?? "",
      });

      return {
        success: true,
        oneDriveId: result.id,
        webUrl: result.webUrl,
      };
    } catch (error: unknown) {
      log.error({ err: error, fileName }, "OneDrive upload failed");
      return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
    }
  },

  /**
   * List files in a OneDrive folder.
   */
  async listFiles(folderPath?: string): Promise<OneDriveItem[]> {
    if (!isGraphConfigured()) return mockDriveItems;

    const path = folderPath
      ? `/me/drive/root:/${folderPath}:/children`
      : "/me/drive/root/children";

    const endpoint = `https://graph.microsoft.com/v1.0${path}?$top=100`;
    const result = await graphRequest<{ value: GraphDriveItem[] }>(endpoint);
    if (!result?.value) return mockDriveItems;

    return result.value
      .filter((item) => item.file) // only files, not folders
      .map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size ?? 0,
        mimeType: item.file?.mimeType ?? "application/octet-stream",
        webUrl: item.webUrl ?? "",
        downloadUrl: item["@microsoft.graph.downloadUrl"] ?? "",
        lastModifiedDateTime: item.lastModifiedDateTime ?? "",
        createdBy: item.createdBy?.user?.displayName ?? "",
        parentPath: item.parentReference?.path ?? "",
      }));
  },

  /**
   * Download a file from OneDrive (returns download URL).
   */
  async getDownloadUrl(oneDriveItemId: string): Promise<string | null> {
    if (!isGraphConfigured()) {
      const item = mockDriveItems.find(i => i.id === oneDriveItemId);
      return item?.webUrl ?? null;
    }

    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${oneDriveItemId}`;
    const result = await graphRequest<GraphDriveItem>(endpoint);
    return result?.["@microsoft.graph.downloadUrl"] ?? null;
  },

  /**
   * Get sync status for GRT workspace.
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSyncAt: syncRegistry.size > 0
        ? Array.from(syncRegistry.values()).sort((a, b) => b.lastSyncAt.localeCompare(a.lastSyncAt))[0].lastSyncAt
        : null,
      itemsSynced: syncRegistry.size,
      pendingUploads: 0,
      pendingDownloads: 0,
      errors: 0,
    };
  },

  /**
   * Get the OneDrive link for a GRT workspace file (if synced).
   */
  getOneDriveLink(grtFileId: number): { oneDriveId: string; webUrl: string; lastSyncAt: string } | null {
    return syncRegistry.get(grtFileId) ?? null;
  },

  /**
   * Pull changes from OneDrive to GRT workspace (delta sync).
   */
  async pullChanges(deltaToken?: string): Promise<{
    items: OneDriveItem[];
    nextDeltaToken: string;
  }> {
    if (!isGraphConfigured()) {
      return { items: mockDriveItems, nextDeltaToken: `mock-delta-${Date.now()}` };
    }

    const endpoint = deltaToken
      ? `https://graph.microsoft.com/v1.0/me/drive/root/delta?token=${deltaToken}`
      : "https://graph.microsoft.com/v1.0/me/drive/root/delta";

    const result = await graphRequest<GraphDeltaResponse>(endpoint);
    if (!result?.value) {
      return { items: [], nextDeltaToken: deltaToken ?? "" };
    }

    const items: OneDriveItem[] = result.value
      .filter((item) => item.file)
      .map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size ?? 0,
        mimeType: item.file?.mimeType ?? "",
        webUrl: item.webUrl ?? "",
        downloadUrl: item["@microsoft.graph.downloadUrl"] ?? "",
        lastModifiedDateTime: item.lastModifiedDateTime ?? "",
        createdBy: item.createdBy?.user?.displayName ?? "",
        parentPath: item.parentReference?.path ?? "",
      }));

    // Extract next delta token from @odata.deltaLink
    const nextToken = result["@odata.deltaLink"]?.split("token=")[1] ?? "";

    return { items, nextDeltaToken: nextToken };
  },
};

// ── SharePoint Folder Mapping Service ──

/** Default mappings: GRT workspace folders → SharePoint site structure */
const DEFAULT_FOLDER_MAPPINGS: Array<Omit<FolderMapping, "id" | "createdAt">> = [
  { grtFolderId: 1,  grtFolderName: "机械设计",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Engineering/Mechanical",      syncDirection: "bidirectional", autoSync: true,  lastSyncAt: null, status: "active" },
  { grtFolderId: 2,  grtFolderName: "电气设计",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Engineering/Electrical",      syncDirection: "bidirectional", autoSync: true,  lastSyncAt: null, status: "active" },
  { grtFolderId: 3,  grtFolderName: "机器人系统", sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Engineering/Robotics",        syncDirection: "bidirectional", autoSync: true,  lastSyncAt: null, status: "active" },
  { grtFolderId: 4,  grtFolderName: "项目文件",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Projects",                    syncDirection: "bidirectional", autoSync: true,  lastSyncAt: null, status: "active" },
  { grtFolderId: 5,  grtFolderName: "客户资料",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Sales/Customers",             syncDirection: "grt_to_sp",    autoSync: false, lastSyncAt: null, status: "active" },
  { grtFolderId: 6,  grtFolderName: "质量管理",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Quality",                     syncDirection: "bidirectional", autoSync: true,  lastSyncAt: null, status: "active" },
  { grtFolderId: 7,  grtFolderName: "运营管理",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Operations",                  syncDirection: "grt_to_sp",    autoSync: false, lastSyncAt: null, status: "active" },
  { grtFolderId: 8,  grtFolderName: "数字展厅",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Marketing/DigitalShowroom",   syncDirection: "grt_to_sp",    autoSync: false, lastSyncAt: null, status: "active" },
  { grtFolderId: 9,  grtFolderName: "会议纪要",   sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Meetings",                    syncDirection: "bidirectional", autoSync: false, lastSyncAt: null, status: "active" },
  { grtFolderId: 10, grtFolderName: "模板库",     sharepointSiteId: "default", sharepointFolderId: null, sharepointPath: "/Templates",                   syncDirection: "sp_to_grt",    autoSync: false, lastSyncAt: null, status: "active" },
];

export const folderMappingService = {
  /** List all folder mappings */
  async listMappings(): Promise<FolderMapping[]> {
    await ensureFolderMappingTable();
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, grt_folder_id, grt_folder_name, sharepoint_site_id,
               sharepoint_folder_id, sharepoint_path, sync_direction,
               auto_sync, last_sync_at, status, created_at
        FROM sharepoint_folder_mappings
        ORDER BY grt_folder_id
        LIMIT 1000
      `);
      return (result.rows as unknown as FolderMappingRow[]).map(r => ({
        id: r.id,
        grtFolderId: r.grt_folder_id,
        grtFolderName: r.grt_folder_name,
        sharepointSiteId: r.sharepoint_site_id,
        sharepointFolderId: r.sharepoint_folder_id,
        sharepointPath: r.sharepoint_path,
        syncDirection: r.sync_direction as FolderMapping["syncDirection"],
        autoSync: r.auto_sync,
        lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : null,
        status: r.status as FolderMapping["status"],
        createdAt: new Date(r.created_at).toISOString(),
      }));
    } catch {
      return DEFAULT_FOLDER_MAPPINGS.map((m, i) => ({
        ...m,
        id: i + 1,
        createdAt: new Date().toISOString(),
      }));
    }
  },

  /** Create or update a folder mapping */
  async upsertMapping(input: {
    grtFolderId: number;
    grtFolderName: string;
    sharepointPath: string;
    sharepointSiteId?: string;
    sharepointFolderId?: string | null;
    syncDirection?: "bidirectional" | "grt_to_sp" | "sp_to_grt";
    autoSync?: boolean;
  }): Promise<FolderMapping> {
    await ensureFolderMappingTable();
    const db = await requireDb();
    const siteId = input.sharepointSiteId ?? "default";
    const dir = input.syncDirection ?? "bidirectional";
    const auto = input.autoSync ?? false;

    // Upsert by grt_folder_id
    const existing = await db.execute(sql`
      SELECT id FROM sharepoint_folder_mappings WHERE grt_folder_id = ${input.grtFolderId} LIMIT 1
    `);
    if ((existing.rows as unknown as FolderMappingRow[]).length > 0) {
      await db.execute(sql`
        UPDATE sharepoint_folder_mappings SET
          grt_folder_name = ${input.grtFolderName},
          sharepoint_site_id = ${siteId},
          sharepoint_folder_id = ${input.sharepointFolderId ?? null},
          sharepoint_path = ${input.sharepointPath},
          sync_direction = ${dir},
          auto_sync = ${auto}
        WHERE grt_folder_id = ${input.grtFolderId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO sharepoint_folder_mappings (grt_folder_id, grt_folder_name, sharepoint_site_id, sharepoint_folder_id, sharepoint_path, sync_direction, auto_sync)
        VALUES (${input.grtFolderId}, ${input.grtFolderName}, ${siteId}, ${input.sharepointFolderId ?? null}, ${input.sharepointPath}, ${dir}, ${auto})
      `);
    }

    const result = await db.execute(sql`
      SELECT * FROM sharepoint_folder_mappings WHERE grt_folder_id = ${input.grtFolderId} LIMIT 1
    `);
    const r = (result.rows as unknown as FolderMappingRow[])[0];
    return {
      id: r.id, grtFolderId: r.grt_folder_id, grtFolderName: r.grt_folder_name,
      sharepointSiteId: r.sharepoint_site_id, sharepointFolderId: r.sharepoint_folder_id,
      sharepointPath: r.sharepoint_path, syncDirection: r.sync_direction as FolderMapping["syncDirection"],
      autoSync: r.auto_sync, lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : null,
      status: r.status as FolderMapping["status"], createdAt: new Date(r.created_at).toISOString(),
    };
  },

  /** Delete a folder mapping */
  async deleteMapping(grtFolderId: number): Promise<void> {
    await ensureFolderMappingTable();
    const db = await requireDb();
    await db.execute(sql`DELETE FROM sharepoint_folder_mappings WHERE grt_folder_id = ${grtFolderId}`);
  },

  /** Seed default mappings if table is empty */
  async seedDefaultMappings(): Promise<number> {
    await ensureFolderMappingTable();
    const db = await requireDb();
    const count = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM sharepoint_folder_mappings`);
    if (Number((count.rows as unknown as FolderMappingRow[])[0]?.cnt) > 0) return 0;

    let inserted = 0;
    for (const m of DEFAULT_FOLDER_MAPPINGS) {
      try {
        await db.execute(sql`
          INSERT INTO sharepoint_folder_mappings (grt_folder_id, grt_folder_name, sharepoint_site_id, sharepoint_path, sync_direction, auto_sync, status)
          VALUES (${m.grtFolderId}, ${m.grtFolderName}, ${m.sharepointSiteId}, ${m.sharepointPath}, ${m.syncDirection}, ${m.autoSync}, ${m.status})
        `);
        inserted++;
      } catch { /* skip duplicates */ }
    }
    return inserted;
  },

  /** Toggle auto-sync for a mapping */
  async toggleAutoSync(grtFolderId: number, autoSync: boolean): Promise<void> {
    await ensureFolderMappingTable();
    const db = await requireDb();
    await db.execute(sql`
      UPDATE sharepoint_folder_mappings SET auto_sync = ${autoSync} WHERE grt_folder_id = ${grtFolderId}
    `);
  },

  /** Update sync status after a sync operation */
  async markSynced(grtFolderId: number, status: "active" | "error" = "active"): Promise<void> {
    await ensureFolderMappingTable();
    const db = await requireDb();
    await db.execute(sql`
      UPDATE sharepoint_folder_mappings SET last_sync_at = NOW(), status = ${status} WHERE grt_folder_id = ${grtFolderId}
    `);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Organization Node + Department→SP Mapping + Sync Log Services
// ═══════════════════════════════════════════════════════════════════

export interface OrgNode {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  type: string; // "bu"|"functional"|"support"|"company"|"personal"|"external"
  parentId: number | null;
  buId: number | null;
  spSiteId: string | null;
  spRootPath: string | null;
  spTokenScope: string | null;
  dataScope: string;
  isActive: boolean;
  cluster: string | null;    // "A"|"B"|"C"|"D"
  siteCode: string | null;   // "00_GRT_Portal", "07_Project_Hub"
  sortOrder: number;
}

export interface DeptSpMapping {
  id: number;
  deptCode: string;
  spSiteId: string;
  spRootPath: string;
  syncDirection: string;
  autoSync: boolean;
  autoMirror: boolean;
  status: string;
}

export interface SyncLogEntry {
  id: number;
  deptCode: string | null;
  action: string;
  sourceType: string;
  sourcePath: string | null;
  targetPath: string | null;
  status: string;
  errorMessage: string | null;
  fileCount: number;
  bytesTransferred: number;
  triggeredBy: string | null;
  createdAt: string;
}

const DEFAULT_ORG_NODES: Array<Omit<OrgNode, "id" | "isActive">> = [
  // ═══ Cluster A: Company Wide ═══
  { code: "GRT_PORTAL",  name: "公司主页",       nameEn: "GRT Portal",            type: "company",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/00_GRT_Portal",          spTokenScope: null, dataScope: "global",     cluster: "A", siteCode: "00_GRT_Portal",        sortOrder: 0 },
  { code: "MGMT_OFFICE", name: "管理层办公室",   nameEn: "Management Office",     type: "company",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/01_Management_Office",   spTokenScope: null, dataScope: "global",     cluster: "A", siteCode: "01_Management_Office",  sortOrder: 1 },
  { code: "ADM",          name: "行政部",         nameEn: "Administration",        type: "support",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/01_Management_Office/Admin", spTokenScope: null, dataScope: "global", cluster: "A", siteCode: null,                    sortOrder: 2 },

  // ═══ Cluster B: Support Functions ═══
  { code: "HR",           name: "人力资源中心",   nameEn: "HR Center",             type: "support",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/02_HR_Center",            spTokenScope: null, dataScope: "global",     cluster: "B", siteCode: "02_HR_Center",         sortOrder: 0 },
  { code: "FIN",          name: "财务法务",       nameEn: "Finance & Legal",       type: "support",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/03_Finance_Legal",        spTokenScope: null, dataScope: "global",     cluster: "B", siteCode: "03_Finance_Legal",      sortOrder: 1 },
  { code: "IT_AI",        name: "IT与AI实验室",   nameEn: "IT & AI Lab",           type: "support",    parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/04_IT_AI_Lab",            spTokenScope: null, dataScope: "global",     cluster: "B", siteCode: "04_IT_AI_Lab",         sortOrder: 2 },
  { code: "RND",          name: "研发中心",       nameEn: "R&D Center",            type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/04_IT_AI_Lab/Engineering", spTokenScope: null, dataScope: "department", cluster: "B", siteCode: null,                    sortOrder: 3 },

  // ═══ Cluster C: Core Business ═══
  { code: "MKT",          name: "市场营销",       nameEn: "Marketing & Sales",     type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/05_Marketing_Sales",      spTokenScope: null, dataScope: "department", cluster: "C", siteCode: "05_Marketing_Sales",    sortOrder: 0 },
  { code: "SCM",          name: "供应链管理",     nameEn: "Supply Chain",          type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/06_Supply_Chain",         spTokenScope: null, dataScope: "department", cluster: "C", siteCode: "06_Supply_Chain",       sortOrder: 1 },
  { code: "OPS",          name: "运营部",         nameEn: "Operations",            type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/06_Supply_Chain/Operations", spTokenScope: null, dataScope: "department", cluster: "C", siteCode: null,                sortOrder: 2 },
  { code: "PROJ_HUB",     name: "项目中心",       nameEn: "Project Hub",           type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/07_Project_Hub",          spTokenScope: null, dataScope: "department", cluster: "C", siteCode: "07_Project_Hub",        sortOrder: 3 },
  { code: "BU_HUB",       name: "事业部总站",     nameEn: "Business Units Hub",    type: "functional", parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/08_Business_Units",       spTokenScope: null, dataScope: "bu",         cluster: "C", siteCode: "08_Business_Units",     sortOrder: 4 },
  { code: "BU1",           name: "海外事业部",     nameEn: "Overseas Division",     type: "bu",         parentId: null, buId: 1,    spSiteId: "default", spRootPath: "/sites/08_Business_Units/BU1_Overseas",    spTokenScope: null, dataScope: "bu", cluster: "C", siteCode: null, sortOrder: 5 },
  { code: "BU2",           name: "商用车事业部",   nameEn: "Commercial Vehicle",    type: "bu",         parentId: null, buId: 2,    spSiteId: "default", spRootPath: "/sites/08_Business_Units/BU2_Commercial",  spTokenScope: null, dataScope: "bu", cluster: "C", siteCode: null, sortOrder: 6 },
  { code: "BU3",           name: "乘用车事业部",   nameEn: "Passenger Vehicle",     type: "bu",         parentId: null, buId: 3,    spSiteId: "default", spRootPath: "/sites/08_Business_Units/BU3_Passenger",   spTokenScope: null, dataScope: "bu", cluster: "C", siteCode: null, sortOrder: 7 },
  { code: "BU4",           name: "半导体事业部",   nameEn: "Semiconductor",         type: "bu",         parentId: null, buId: 4,    spSiteId: "default", spRootPath: "/sites/08_Business_Units/BU4_Semiconductor", spTokenScope: null, dataScope: "bu", cluster: "C", siteCode: null, sortOrder: 8 },
  { code: "BU5",           name: "工业通用事业部", nameEn: "General Industrial",    type: "bu",         parentId: null, buId: 5,    spSiteId: "default", spRootPath: "/sites/08_Business_Units/BU5_Industrial",  spTokenScope: null, dataScope: "bu", cluster: "C", siteCode: null, sortOrder: 9 },

  // ═══ Cluster D: Personal / External ═══
  { code: "MY_WORKSPACE",  name: "个人空间",       nameEn: "My Workspace",          type: "personal",   parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/My_Workspace",            spTokenScope: null, dataScope: "self",       cluster: "D", siteCode: "My_Workspace",          sortOrder: 0 },
  { code: "CLIENT_EXT",    name: "客户外网",       nameEn: "Client Extranet",       type: "external",   parentId: null, buId: null, spSiteId: "default", spRootPath: "/sites/Client_Extranet",         spTokenScope: null, dataScope: "global",     cluster: "D", siteCode: "Client_Extranet",        sortOrder: 1 },
];

let orgTablesCreated = false;

async function ensureOrgTables(): Promise<void> {
  if (orgTablesCreated) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organization_nodes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        type VARCHAR(20) NOT NULL DEFAULT 'functional',
        parent_id INTEGER,
        bu_id INTEGER,
        manager_id INTEGER,
        sp_site_id VARCHAR(255),
        sp_root_path VARCHAR(500),
        sp_token_scope VARCHAR(500),
        data_scope VARCHAR(20) DEFAULT 'department',
        cluster VARCHAR(1),
        site_code VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // Migrate: widen code column + add new columns for existing tables
    try {
      await db.execute(sql`ALTER TABLE organization_nodes ALTER COLUMN code TYPE VARCHAR(50)`);
    } catch { /* already wide enough */ }
    try {
      await db.execute(sql`ALTER TABLE organization_nodes ADD COLUMN IF NOT EXISTS cluster VARCHAR(1)`);
      await db.execute(sql`ALTER TABLE organization_nodes ADD COLUMN IF NOT EXISTS site_code VARCHAR(50)`);
      await db.execute(sql`ALTER TABLE organization_nodes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
    } catch { /* columns may already exist */ }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS department_sp_mappings (
        id SERIAL PRIMARY KEY,
        dept_code VARCHAR(20) NOT NULL,
        sp_site_id VARCHAR(255) NOT NULL,
        sp_root_path VARCHAR(500) NOT NULL,
        sync_direction VARCHAR(20) DEFAULT 'bidirectional',
        auto_sync BOOLEAN DEFAULT false,
        auto_mirror BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        dept_code VARCHAR(20),
        action VARCHAR(50) NOT NULL,
        source_type VARCHAR(20) NOT NULL,
        source_path VARCHAR(1000),
        target_path VARCHAR(1000),
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        file_count INTEGER DEFAULT 0,
        bytes_transferred INTEGER DEFAULT 0,
        triggered_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // ═══ New tables for 4-cluster site architecture ═══
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sharepoint_sites (
        id SERIAL PRIMARY KEY,
        site_code VARCHAR(50) NOT NULL UNIQUE,
        cluster VARCHAR(1) NOT NULL,
        name VARCHAR(200) NOT NULL,
        name_en VARCHAR(200),
        description TEXT,
        sp_site_id VARCHAR(500),
        sp_site_url VARCHAR(1000),
        org_node_id INTEGER,
        owner_dept_code VARCHAR(50),
        folder_template VARCHAR(50),
        sync_policy VARCHAR(20) DEFAULT 'manual',
        sync_cron_expr VARCHAR(30),
        access_level VARCHAR(20) DEFAULT 'internal',
        allowed_roles TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sharepoint_site_folders (
        id SERIAL PRIMARY KEY,
        site_code VARCHAR(50) NOT NULL,
        folder_path VARCHAR(500) NOT NULL,
        folder_name VARCHAR(200) NOT NULL,
        folder_name_zh VARCHAR(200),
        parent_path VARCHAR(500),
        is_template BOOLEAN DEFAULT false,
        project_code VARCHAR(30),
        sync_direction VARCHAR(20) DEFAULT 'bidirectional',
        auto_sync BOOLEAN DEFAULT false,
        sp_folder_id VARCHAR(500),
        last_sync_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    orgTablesCreated = true;
  } catch (e: unknown) {
    log.warn({ err: e }, "Failed to create org tables (may already exist)");
    orgTablesCreated = true;
  }
}

/**
 * Resolve department code from user role + BU code.
 * Pure function — no DB access.
 */
export function resolveDeptFromRole(role: string, buCode: string | null): string {
  // Engineering → R&D (under IT_AI Lab)
  if (role === "bu_mech" || role === "bu_elec") return "RND";
  // Sales → Marketing & Sales
  if (role === "bu_sales" || role === "cs_engineer") return "MKT";
  // PM → Project Hub or BU
  if (role === "bu_pm") return buCode ?? "PROJ_HUB";
  // Quality/Procurement → Supply Chain
  if (role === "quality_eng" || role === "procurement_eng") return "SCM";
  // Support departments
  if (role.startsWith("hr_")) return "HR";
  if (role.startsWith("finance_")) return "FIN";
  if (role === "admin") return "ADM";
  // Leadership → Management Office or BU
  if (role === "director") return "MGMT_OFFICE";
  if (role === "bu_gm") return buCode ?? "BU_HUB";
  // IT roles → IT & AI Lab
  if (role === "it_admin" || role === "developer") return "IT_AI";
  // Default → Company Portal
  return "GRT_PORTAL";
}

export const departmentMappingService = {
  /** List all organization nodes */
  async listOrgNodes(): Promise<OrgNode[]> {
    await ensureOrgTables();
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, code, name, name_en, type, parent_id, bu_id, sp_site_id, sp_root_path, sp_token_scope, data_scope, is_active, cluster, site_code, sort_order
        FROM organization_nodes WHERE is_active = true ORDER BY cluster, sort_order, code LIMIT 200
      `);
      return (result.rows as unknown as OrgNodeRow[]).map(r => ({
        id: r.id, code: r.code, name: r.name, nameEn: r.name_en, type: r.type,
        parentId: r.parent_id, buId: r.bu_id, spSiteId: r.sp_site_id, spRootPath: r.sp_root_path,
        spTokenScope: r.sp_token_scope, dataScope: r.data_scope ?? "department", isActive: r.is_active ?? true,
        cluster: r.cluster ?? null, siteCode: r.site_code ?? null, sortOrder: r.sort_order ?? 0,
      }));
    } catch {
      return [];
    }
  },

  /** Resolve SharePoint path for a department code */
  async resolveSPPath(deptCode: string): Promise<{ spSiteId: string; spRootPath: string } | null> {
    await ensureOrgTables();
    try {
      const db = await requireDb();
      // First check department_sp_mappings
      const mapResult = await db.execute(sql`
        SELECT sp_site_id, sp_root_path FROM department_sp_mappings
        WHERE dept_code = ${deptCode} AND status = 'active' LIMIT 1
      `);
      if ((mapResult.rows as unknown as DeptSpMappingRow[]).length > 0) {
        const r = (mapResult.rows as unknown as DeptSpMappingRow[])[0];
        return { spSiteId: r.sp_site_id, spRootPath: r.sp_root_path };
      }
      // Fallback to organization_nodes
      const nodeResult = await db.execute(sql`
        SELECT sp_site_id, sp_root_path FROM organization_nodes
        WHERE code = ${deptCode} AND is_active = true LIMIT 1
      `);
      if ((nodeResult.rows as unknown as OrgNodeRow[]).length > 0) {
        const r = (nodeResult.rows as unknown as OrgNodeRow[])[0];
        if (r.sp_root_path) return { spSiteId: r.sp_site_id ?? "default", spRootPath: r.sp_root_path };
      }
      return null;
    } catch {
      return null;
    }
  },

  resolveDeptFromRole,

  /** List department→SP mappings */
  async listDeptMappings(): Promise<DeptSpMapping[]> {
    await ensureOrgTables();
    try {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, dept_code, sp_site_id, sp_root_path, sync_direction, auto_sync, auto_mirror, status
        FROM department_sp_mappings WHERE status != 'deleted' ORDER BY dept_code LIMIT 100
      `);
      return (result.rows as unknown as DeptSpMappingRow[]).map(r => ({
        id: r.id, deptCode: r.dept_code, spSiteId: r.sp_site_id, spRootPath: r.sp_root_path,
        syncDirection: r.sync_direction ?? "bidirectional", autoSync: !!r.auto_sync,
        autoMirror: !!r.auto_mirror, status: r.status ?? "active",
      }));
    } catch {
      return [];
    }
  },

  /** Upsert department→SP mapping */
  async upsertDeptMapping(input: {
    deptCode: string; spSiteId: string; spRootPath: string;
    syncDirection?: string; autoSync?: boolean; autoMirror?: boolean;
  }): Promise<DeptSpMapping> {
    await ensureOrgTables();
    const db = await requireDb();
    const dir = input.syncDirection ?? "bidirectional";
    const autoSync = input.autoSync ?? false;
    const autoMirror = input.autoMirror ?? false;

    // Check existing
    const existing = await db.execute(sql`
      SELECT id FROM department_sp_mappings WHERE dept_code = ${input.deptCode} LIMIT 1
    `);
    if ((existing.rows as unknown as DeptSpMappingRow[]).length > 0) {
      const id = (existing.rows as unknown as DeptSpMappingRow[])[0].id;
      await db.execute(sql`
        UPDATE department_sp_mappings
        SET sp_site_id = ${input.spSiteId}, sp_root_path = ${input.spRootPath},
            sync_direction = ${dir}, auto_sync = ${autoSync}, auto_mirror = ${autoMirror}
        WHERE id = ${id}
      `);
      return { id, deptCode: input.deptCode, spSiteId: input.spSiteId, spRootPath: input.spRootPath,
               syncDirection: dir, autoSync, autoMirror, status: "active" };
    }

    await db.execute(sql`
      INSERT INTO department_sp_mappings (dept_code, sp_site_id, sp_root_path, sync_direction, auto_sync, auto_mirror)
      VALUES (${input.deptCode}, ${input.spSiteId}, ${input.spRootPath}, ${dir}, ${autoSync}, ${autoMirror})
    `);
    return { id: 0, deptCode: input.deptCode, spSiteId: input.spSiteId, spRootPath: input.spRootPath,
             syncDirection: dir, autoSync, autoMirror, status: "active" };
  },

  /** Seed default org nodes (20 nodes, 4 clusters) — upsert mode */
  async seedOrgNodes(): Promise<number> {
    await ensureOrgTables();
    const db = await requireDb();

    let upserted = 0;
    for (const n of DEFAULT_ORG_NODES) {
      try {
        // Check if exists
        const existing = await db.execute(sql`SELECT id FROM organization_nodes WHERE code = ${n.code} LIMIT 1`);
        if ((existing.rows as unknown as OrgNodeRow[]).length > 0) {
          await db.execute(sql`
            UPDATE organization_nodes SET name = ${n.name}, name_en = ${n.nameEn}, type = ${n.type},
              sp_root_path = ${n.spRootPath}, data_scope = ${n.dataScope},
              cluster = ${n.cluster ?? null}, site_code = ${n.siteCode ?? null}, sort_order = ${n.sortOrder}
            WHERE code = ${n.code}
          `);
        } else {
          await db.execute(sql`
            INSERT INTO organization_nodes (code, name, name_en, type, parent_id, bu_id, sp_site_id, sp_root_path, sp_token_scope, data_scope, cluster, site_code, sort_order)
            VALUES (${n.code}, ${n.name}, ${n.nameEn}, ${n.type}, ${n.parentId}, ${n.buId},
                    ${n.spSiteId}, ${n.spRootPath}, ${n.spTokenScope}, ${n.dataScope},
                    ${n.cluster ?? null}, ${n.siteCode ?? null}, ${n.sortOrder})
          `);
        }
        upserted++;
      } catch { /* skip errors */ }
    }

    // Set parentId relations: BU1-BU5 → BU_HUB, ADM → MGMT_OFFICE, RND → IT_AI, OPS → SCM
    try {
      await db.execute(sql`UPDATE organization_nodes SET parent_id = (SELECT id FROM organization_nodes WHERE code = 'BU_HUB' LIMIT 1) WHERE code IN ('BU1','BU2','BU3','BU4','BU5') AND parent_id IS NULL`);
      await db.execute(sql`UPDATE organization_nodes SET parent_id = (SELECT id FROM organization_nodes WHERE code = 'MGMT_OFFICE' LIMIT 1) WHERE code = 'ADM' AND parent_id IS NULL`);
      await db.execute(sql`UPDATE organization_nodes SET parent_id = (SELECT id FROM organization_nodes WHERE code = 'IT_AI' LIMIT 1) WHERE code = 'RND' AND parent_id IS NULL`);
      await db.execute(sql`UPDATE organization_nodes SET parent_id = (SELECT id FROM organization_nodes WHERE code = 'SCM' LIMIT 1) WHERE code = 'OPS' AND parent_id IS NULL`);
    } catch { /* silent */ }

    return upserted;
  },

  /** List org nodes grouped by cluster */
  async listOrgNodesByCluster(): Promise<Record<string, OrgNode[]>> {
    const nodes = await this.listOrgNodes();
    const grouped: Record<string, OrgNode[]> = {};
    for (const n of nodes) {
      const c = n.cluster ?? "?";
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(n);
    }
    return grouped;
  },

  /** Record a sync log entry */
  async logSync(entry: {
    deptCode?: string | null; action: string; sourceType: string;
    sourcePath?: string | null; targetPath?: string | null; status: string;
    errorMessage?: string | null; fileCount?: number; bytesTransferred?: number;
    triggeredBy?: string | null;
  }): Promise<void> {
    await ensureOrgTables();
    try {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO sync_logs (dept_code, action, source_type, source_path, target_path, status, error_message, file_count, bytes_transferred, triggered_by)
        VALUES (${entry.deptCode ?? null}, ${entry.action}, ${entry.sourceType},
                ${entry.sourcePath ?? null}, ${entry.targetPath ?? null}, ${entry.status},
                ${entry.errorMessage ?? null}, ${entry.fileCount ?? 0}, ${entry.bytesTransferred ?? 0},
                ${entry.triggeredBy ?? null})
      `);
    } catch (e: unknown) {
      log.warn({ err: e }, "Failed to write sync log");
    }
  },

  /** Query recent sync logs */
  async getSyncLogs(limit = 50, deptCode?: string): Promise<SyncLogEntry[]> {
    await ensureOrgTables();
    try {
      const db = await requireDb();
      const result = deptCode
        ? await db.execute(sql`
            SELECT * FROM sync_logs WHERE dept_code = ${deptCode}
            ORDER BY created_at DESC LIMIT ${limit}
          `)
        : await db.execute(sql`
            SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ${limit}
          `);
      return (result.rows as unknown as SyncLogRow[]).map(r => ({
        id: r.id, deptCode: r.dept_code, action: r.action, sourceType: r.source_type,
        sourcePath: r.source_path, targetPath: r.target_path, status: r.status,
        errorMessage: r.error_message, fileCount: r.file_count ?? 0,
        bytesTransferred: r.bytes_transferred ?? 0, triggeredBy: r.triggered_by,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
      }));
    } catch {
      return [];
    }
  },
};

// ═══════ Showroom Sync Service ═══════

export const showroomSyncService = {
  /** Sync digital showroom files to SharePoint /Marketing/DigitalShowroom */
  async syncShowroomFiles(): Promise<{ synced: number; failed: number }> {
    let synced = 0, failed = 0;
    try {
      const db = await requireDb();
      // Get showroom folder IDs (数字展厅 + sub-folders)
      const folderResult = await db.execute(sql`
        SELECT id FROM collaboration_docs_folders WHERE name LIKE '%展厅%' OR name LIKE '%VDO%' LIMIT 20
      `);
      const folderIds = (folderResult.rows as Array<{ id: number }>).map((r) => r.id);
      if (folderIds.length === 0) return { synced: 0, failed: 0 };

      // Get files not yet synced
      for (const fid of folderIds) {
        const filesResult = await db.execute(sql`
          SELECT f.id, f.file_name, f.file_path, f.file_size
          FROM collaboration_docs_files f
          LEFT JOIN onedrive_sync_registry s ON s.grt_file_id = f.id
          WHERE f.folder_id = ${fid} AND f.status != 'deleted' AND s.id IS NULL
          LIMIT 50
        `);
        for (const file of (filesResult.rows as unknown as DocFileRow[])) {
          try {
            if (file.file_path && isGraphConfigured()) {
              // Mark as synced in registry (actual upload deferred to scheduled job)
              await db.execute(sql`
                INSERT INTO onedrive_sync_registry (grt_file_id, onedrive_id, sync_status, last_synced_at)
                VALUES (${file.id}, ${"showroom-pending"}, ${"pending"}, NOW())
                ON CONFLICT (grt_file_id) DO UPDATE SET sync_status = 'pending', last_synced_at = NOW()
              `);
              synced++;
            }
          } catch {
            failed++;
          }
        }
      }
      await departmentMappingService.logSync({
        deptCode: "MKT", action: "showroom_publish", sourceType: "grt",
        sourcePath: "collaboration_docs/showroom", targetPath: "/Marketing/DigitalShowroom",
        status: failed === 0 ? "success" : "error", fileCount: synced,
        triggeredBy: "system",
      });
    } catch (e: unknown) {
      log.warn({ err: e }, "Showroom sync failed");
    }
    return { synced, failed };
  },

  /** Get showroom sync status */
  async getShowroomSyncStatus(): Promise<{ lastSync: string | null; fileCount: number; status: string }> {
    try {
      const db = await requireDb();
      const logResult = await db.execute(sql`
        SELECT created_at, file_count, status FROM sync_logs
        WHERE action = 'showroom_publish' ORDER BY created_at DESC LIMIT 1
      `);
      if ((logResult.rows as unknown as SyncLogRow[]).length > 0) {
        const r = (logResult.rows as unknown as SyncLogRow[])[0];
        return { lastSync: r.created_at ? new Date(r.created_at).toISOString() : null, fileCount: r.file_count ?? 0, status: r.status };
      }
      return { lastSync: null, fileCount: 0, status: "never" };
    } catch {
      return { lastSync: null, fileCount: 0, status: "error" };
    }
  },
};
