import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./schema";

// ══════════════════════════════════════════════════════════════
// Sales Material Categories — hierarchical tree structure
// ══════════════════════════════════════════════════════════════

export const salesMaterialCategories = pgTable("sales_material_categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),                                  // self-ref for tree
  code: varchar("code", { length: 30 }).unique(),
  name: varchar("name", { length: 200 }),
  nameEn: varchar("name_en", { length: 200 }),
  icon: varchar("icon", { length: 30 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ══════════════════════════════════════════════════════════════
// Sales Materials — document library entries
// ══════════════════════════════════════════════════════════════

export const salesMaterials = pgTable("sales_materials", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id"),
  title: varchar("title", { length: 300 }),
  titleEn: varchar("title_en", { length: 300 }),
  equipmentModel: varchar("equipment_model", { length: 50 }),      // GRT model association
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 200 }),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 20 }),                  // pdf | docx | pptx | dwg | step | image
  thumbnailUrl: text("thumbnail_url"),
  version: varchar("version", { length: 20 }),
  tags: text("tags"),                                               // JSON array
  isPublic: boolean("is_public").default(false),
  applicableIndustries: text("applicable_industries"),              // JSON: [automotive, semiconductor, ...]
  applicableRegions: text("applicable_regions"),                    // JSON: [US, EU, CN]
  status: varchar("status", { length: 20 }).default("draft"),      // draft | active | archived
  uploadedBy: varchar("uploaded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ══════════════════════════════════════════════════════════════
// Project Drawings — BDO & engineering drawing management
// ══════════════════════════════════════════════════════════════

export const projectDrawings = pgTable("project_drawings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  drawingNumber: varchar("drawing_number", { length: 50 }).unique(), // DWG-CM2026-001-GA-01
  drawingTitle: varchar("drawing_title", { length: 300 }),
  drawingTitleEn: varchar("drawing_title_en", { length: 300 }),
  drawingType: varchar("drawing_type", { length: 30 }),             // general_arrangement | layout | piping | electrical | foundation | assembly | detail
  category: varchar("category", { length: 30 }),                    // bdo | manufacturing | installation | customer_approval
  revision: varchar("revision", { length: 10 }),                    // A, B, C...
  scale: varchar("scale", { length: 20 }),                          // 1:10
  paperSize: varchar("paper_size", { length: 20 }),                 // A0 | A1 | A2
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 200 }),
  fileType: varchar("file_type", { length: 20 }),                   // dwg | pdf | step | dxf
  discipline: varchar("discipline", { length: 20 }),                // mechanical | electrical | piping
  productModel: varchar("product_model", { length: 50 }),           // GRT equipment model
  status: varchar("status", { length: 20 }).default("draft"),       // draft | for_review | approved | superseded
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  reviewDate: varchar("review_date", { length: 20 }),
  approvedDate: varchar("approved_date", { length: 20 }),
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Seed data: 5 top-level categories + 15 sub-categories
 */
export const SALES_MATERIAL_CATEGORIES_SEED = [
  { code: "CATALOG", name: "产品目录", nameEn: "Product Catalog", icon: "BookOpen", children: [
    { code: "CAT_SPEC", name: "产品规格书", nameEn: "Product Specifications", icon: "FileText" },
    { code: "CAT_PHOTO", name: "产品图片", nameEn: "Product Images", icon: "Image" },
    { code: "CAT_VIDEO", name: "产品视频", nameEn: "Product Videos", icon: "Video" },
  ]},
  { code: "PROCESS", name: "工艺流程图", nameEn: "Process Flow Diagrams", icon: "Workflow", children: [
    { code: "PROC_AUTO", name: "汽车行业", nameEn: "Automotive Industry", icon: "Car" },
    { code: "PROC_SEMI", name: "半导体行业", nameEn: "Semiconductor Industry", icon: "Cpu" },
    { code: "PROC_MED", name: "医疗行业", nameEn: "Medical Industry", icon: "Heart" },
  ]},
  { code: "FEATURES", name: "设备特性", nameEn: "Equipment Features", icon: "Star", children: [
    { code: "FEAT_DIFF", name: "技术差异化", nameEn: "Technical Differentiation", icon: "Zap" },
    { code: "FEAT_OPT", name: "选装配置", nameEn: "Optional Configurations", icon: "Settings" },
    { code: "FEAT_COMP", name: "技术对比表", nameEn: "Technical Comparison", icon: "BarChart" },
  ]},
  { code: "BDO", name: "BDO与图纸", nameEn: "BDO & Drawings", icon: "FileText", children: [
    { code: "BDO_GA", name: "总布置图", nameEn: "General Arrangement", icon: "Layout" },
    { code: "BDO_SHOP", name: "车间布局图", nameEn: "Workshop Layout", icon: "Grid" },
    { code: "BDO_FOUND", name: "基础图", nameEn: "Foundation Drawing", icon: "Square" },
  ]},
  { code: "COMPETITOR", name: "竞争对手分析", nameEn: "Competitor Analysis", icon: "Users", children: [
    { code: "COMP_PROF", name: "竞争对手画像", nameEn: "Competitor Profiles", icon: "UserCheck" },
    { code: "COMP_TABLE", name: "竞品对比表", nameEn: "Competitive Comparison", icon: "Table" },
    { code: "COMP_WL", name: "胜败分析", nameEn: "Win/Loss Analysis", icon: "TrendingUp" },
  ]},
] as const;
