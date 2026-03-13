/**
 * Organization Schema — BU + 职能部门统一组织树 + 部门→SharePoint映射 + 同步日志 + 站点架构
 *
 * Tables:
 *   organization_nodes       — 组织节点 (BU / functional / support / company / personal / external)
 *   department_sp_mappings   — 部门→SharePoint 站点映射
 *   sync_logs                — 文件同步日志 (folder_mirror / file_sync / showroom_publish / planner_sync / project_folder_create / site_sync)
 *   sharepoint_sites         — SharePoint 站点集合 (4集群: A=公司级 / B=支持职能 / C=核心业务 / D=个人外部)
 *   sharepoint_site_folders  — 站点内标准文件夹结构 (模板 + 实例)
 */
import { pgTable, serial, varchar, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";

/** 组织节点 — BU 与职能部门统一树 */
export const organizationNodes = pgTable("organization_nodes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),       // "BU1", "RND", "GRT_PORTAL", "MGMT_OFFICE"
  name: varchar("name", { length: 100 }).notNull(),                // "海外事业部", "研发中心"
  nameEn: varchar("name_en", { length: 100 }),                     // "Overseas Division", "R&D Center"
  type: varchar("type", { length: 20 }).notNull(),                 // "bu"|"functional"|"support"|"company"|"personal"|"external"
  parentId: integer("parent_id"),                                   // 上级节点 (null = 顶级)
  buId: integer("bu_id"),                                           // BU关联 (functional部门 → null)
  managerId: integer("manager_id"),                                 // 部门负责人
  spSiteId: varchar("sp_site_id", { length: 255 }),                // SharePoint Site ID
  spRootPath: varchar("sp_root_path", { length: 500 }),            // SharePoint Root Path
  spTokenScope: varchar("sp_token_scope", { length: 500 }),        // Graph API scope for this dept
  dataScope: varchar("data_scope", { length: 20 }).default("department"), // "self"|"department"|"bu"|"global"
  cluster: varchar("cluster", { length: 1 }),                       // "A"|"B"|"C"|"D" — 站点集群
  siteCode: varchar("site_code", { length: 50 }),                   // "00_GRT_Portal", "07_Project_Hub"
  sortOrder: integer("sort_order").default(0),                      // 集群内排序
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 部门→SharePoint 站点映射 */
export const departmentSpMappings = pgTable("department_sp_mappings", {
  id: serial("id").primaryKey(),
  deptCode: varchar("dept_code", { length: 20 }).notNull(),        // "RND", "MKT", "OPS", "BU1"
  spSiteId: varchar("sp_site_id", { length: 255 }).notNull(),
  spRootPath: varchar("sp_root_path", { length: 500 }).notNull(),  // "/sites/RND-Engineering"
  syncDirection: varchar("sync_direction", { length: 20 }).default("bidirectional"),
  autoSync: boolean("auto_sync").default(false),
  autoMirror: boolean("auto_mirror").default(false),               // 自动镜像新建文件夹
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 同步日志 */
export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  deptCode: varchar("dept_code", { length: 20 }),
  action: varchar("action", { length: 50 }).notNull(),             // "folder_mirror"|"file_sync"|"showroom_publish"|"planner_sync"|"project_folder_create"|"site_sync"
  sourceType: varchar("source_type", { length: 20 }).notNull(),    // "grt" | "sharepoint" | "planner"
  sourcePath: varchar("source_path", { length: 1000 }),
  targetPath: varchar("target_path", { length: 1000 }),
  status: varchar("status", { length: 20 }).notNull(),             // "success" | "error" | "pending"
  errorMessage: text("error_message"),
  fileCount: integer("file_count").default(0),
  bytesTransferred: integer("bytes_transferred").default(0),
  triggeredBy: varchar("triggered_by", { length: 100 }),           // userId or "system"
  createdAt: timestamp("created_at").defaultNow(),
});

/** SharePoint 站点集合 — 4集群全局架构 */
export const sharepointSites = pgTable("sharepoint_sites", {
  id: serial("id").primaryKey(),
  siteCode: varchar("site_code", { length: 50 }).notNull().unique(), // "00_GRT_Portal", "07_Project_Hub"
  cluster: varchar("cluster", { length: 1 }).notNull(),              // "A"|"B"|"C"|"D"
  name: varchar("name", { length: 200 }).notNull(),                  // "公司主页/公告/新闻"
  nameEn: varchar("name_en", { length: 200 }),                       // "Company Portal / Announcements / News"
  description: text("description"),
  spSiteId: varchar("sp_site_id", { length: 500 }),                  // Microsoft Graph siteId
  spSiteUrl: varchar("sp_site_url", { length: 1000 }),               // https://grt365.sharepoint.com/sites/...
  orgNodeId: integer("org_node_id"),                                  // FK → organization_nodes.id
  ownerDeptCode: varchar("owner_dept_code", { length: 50 }),         // 所属部门代码
  folderTemplate: varchar("folder_template", { length: 50 }),        // "project_12"|"bu_standard"|"flat"
  syncPolicy: varchar("sync_policy", { length: 20 }).default("manual"), // "auto"|"manual"|"scheduled"|"disabled"
  syncCronExpr: varchar("sync_cron_expr", { length: 30 }),           // cron表达式 "0 2 * * *"
  accessLevel: varchar("access_level", { length: 20 }).default("internal"), // "public"|"internal"|"restricted"|"confidential"
  allowedRoles: text("allowed_roles"),                                // JSON array: ["bu_pm","director"]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 站点内标准文件夹结构 (模板行 + 项目实例行) */
export const sharepointSiteFolders = pgTable("sharepoint_site_folders", {
  id: serial("id").primaryKey(),
  siteCode: varchar("site_code", { length: 50 }).notNull(),          // FK → sharepoint_sites.site_code
  folderPath: varchar("folder_path", { length: 500 }).notNull(),     // "/01_Requirements", "/P-2026-001/03_Mechanical_Design"
  folderName: varchar("folder_name", { length: 200 }).notNull(),     // "01_Requirements"
  folderNameZh: varchar("folder_name_zh", { length: 200 }),          // "01_需求文档"
  parentPath: varchar("parent_path", { length: 500 }),               // null=top-level, "/P-2026-001"
  isTemplate: boolean("is_template").default(false),                  // true=模板行 false=实例行
  projectCode: varchar("project_code", { length: 30 }),              // "P-2026-001" (实例行)
  syncDirection: varchar("sync_direction", { length: 20 }).default("bidirectional"),
  autoSync: boolean("auto_sync").default(false),
  spFolderId: varchar("sp_folder_id", { length: 500 }),              // SP folder itemId (创建后回填)
  lastSyncAt: timestamp("last_sync_at"),
  status: varchar("status", { length: 20 }).default("active"),       // "active"|"pending"|"archived"
  createdAt: timestamp("created_at").defaultNow(),
});
