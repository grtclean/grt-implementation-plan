/**
 * IDO (Intelligent Document Optimization) Service — 文档智优中心
 *
 * Three intelligence engines:
 *   A: Storage Recommendation — recommend where to store an uploaded file
 *   B: File-Open Context — show related docs, next actions, stage progress
 *   C: Workflow Document Tracker — per-project M0-M12 completion status
 */

import { eq, and, sql, inArray, like, desc } from "drizzle-orm";
import { requireDb } from "../db";
import { idoStageDocumentUiMap, idoStorageRecommendations } from "../../drizzle/ido-schema";
import { projectDocuments, projects } from "../../drizzle/schema";
import { STAGES, STAGE_MAP } from "../../shared/stage-definitions";
import {
  classifyFile,
  extractExtension,
  suggestSharepointFolders,
  type FileClassification,
} from "./ido-file-classifier.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ido-service");

// ── Types ──────────────────────────────────────────────────────────────────

export interface StorageRecommendation {
  recommendedPath: string;
  sharepointFolder: string | null;
  sharepointSubfolder: string | null;
  uiPagePath: string | null;
  uiPageName: string | null;
  matchedMapId: number | null;
  confidence: number;
  reasoning: string;
  classification: FileClassification;
}

export interface FileOpenContext {
  currentDoc: {
    documentName: string | null;
    stageCode: string | null;
    stageName: string | null;
    uiPagePath: string | null;
  };
  relatedDocs: Array<{
    id: number;
    documentName: string;
    uiPagePath: string | null;
    fulfilled: boolean;
  }>;
  nextActions: string[];
  stageProgress: {
    stageCode: string;
    stageName: string;
    totalRequired: number;
    fulfilled: number;
    completionPct: number;
  } | null;
}

export interface StageDocCompletion {
  stageCode: string;
  stageName: string;
  category: string;
  color: string;
  totalRequired: number;
  totalMandatory: number;
  fulfilled: number;
  mandatoryFulfilled: number;
  completionPct: number;
  mandatoryCompletionPct: number;
  missingDocs: Array<{
    mapId: number;
    documentName: string;
    documentNameEn: string | null;
    uiPagePath: string | null;
    uiPageName: string | null;
    isMandatory: boolean;
  }>;
}

// ── Seed data ──────────────────────────────────────────────────────────────

interface SeedRow {
  stageCode: string;
  documentTypeKey: string;
  documentName: string;
  documentNameEn: string;
  documentCategory: string;
  fileExtensions: string;
  uiPagePath: string;
  uiPageName: string;
  uiPageNameEn: string;
  sharepointFolder: string;
  isMandatory: boolean;
  sortOrder: number;
  responsibleRoles: string[];
}

const SEED_DATA: SeedRow[] = [
  // M0
  { stageCode: "M0", documentTypeKey: "m0_customer_requirements", documentName: "客户需求记录", documentNameEn: "Customer Requirements Record", documentCategory: "report", fileExtensions: ".docx,.pdf,.xlsx", uiPagePath: "/crm-workbench", uiPageName: "CRM工作台", uiPageNameEn: "CRM Workbench", sharepointFolder: "01_Requirements", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_sales"] },
  { stageCode: "M0", documentTypeKey: "m0_opportunity_assessment", documentName: "商机评估表", documentNameEn: "Opportunity Assessment", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/crm-workbench", uiPageName: "CRM工作台", uiPageNameEn: "CRM Workbench", sharepointFolder: "01_Requirements", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_sales", "bu_pm"] },
  // M1
  { stageCode: "M1", documentTypeKey: "m1_requirements_spec", documentName: "详细需求规格书", documentNameEn: "Detailed Requirements Specification", documentCategory: "design", fileExtensions: ".docx,.pdf", uiPagePath: "/project-phase-documents", uiPageName: "项目阶段文档", uiPageNameEn: "Project Phase Documents", sharepointFolder: "01_Requirements", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm", "bu_sales"] },
  { stageCode: "M1", documentTypeKey: "m1_feasibility_report", documentName: "技术可行性报告", documentNameEn: "Technical Feasibility Report", documentCategory: "report", fileExtensions: ".docx,.pdf", uiPagePath: "/project-phase-documents", uiPageName: "项目阶段文档", uiPageNameEn: "Project Phase Documents", sharepointFolder: "01_Requirements", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M1", documentTypeKey: "m1_competitive_analysis", documentName: "竞品分析报告", documentNameEn: "Competitive Analysis", documentCategory: "report", fileExtensions: ".docx,.pdf,.pptx", uiPagePath: "/project-phase-documents", uiPageName: "项目阶段文档", uiPageNameEn: "Project Phase Documents", sharepointFolder: "01_Requirements", isMandatory: false, sortOrder: 2, responsibleRoles: ["bu_sales"] },
  // M2
  { stageCode: "M2", documentTypeKey: "m2_technical_proposal", documentName: "技术方案书", documentNameEn: "Technical Proposal", documentCategory: "design", fileExtensions: ".docx,.pdf,.pptx", uiPagePath: "/solution-engine", uiPageName: "方案引擎", uiPageNameEn: "Solution Engine", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_mech", "bu_elec", "bu_pm"] },
  { stageCode: "M2", documentTypeKey: "m2_quotation", documentName: "商务报价单", documentNameEn: "Commercial Quotation", documentCategory: "contract", fileExtensions: ".xlsx,.pdf", uiPagePath: "/contract", uiPageName: "合同管理", uiPageNameEn: "Contract Management", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_sales", "bu_pm"] },
  { stageCode: "M2", documentTypeKey: "m2_project_schedule", documentName: "项目进度计划", documentNameEn: "Project Schedule", documentCategory: "report", fileExtensions: ".xlsx,.mpp,.pdf", uiPagePath: "/project-hub", uiPageName: "项目中心", uiPageNameEn: "Project Hub", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_pm"] },
  // M3
  { stageCode: "M3", documentTypeKey: "m3_initiation_request", documentName: "立项申请书", documentNameEn: "Project Initiation Request", documentCategory: "report", fileExtensions: ".docx,.pdf", uiPagePath: "/stage-gate-dashboard", uiPageName: "阶段门控", uiPageNameEn: "Stage Gate Dashboard", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm"] },
  { stageCode: "M3", documentTypeKey: "m3_raci_matrix", documentName: "RACI矩阵", documentNameEn: "RACI Matrix", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/project-hub", uiPageName: "项目中心", uiPageNameEn: "Project Hub", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_pm"] },
  { stageCode: "M3", documentTypeKey: "m3_risk_register", documentName: "风险登记册", documentNameEn: "Risk Register", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/project-hub", uiPageName: "项目中心", uiPageNameEn: "Project Hub", sharepointFolder: "02_Proposal", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_pm"] },
  { stageCode: "M3", documentTypeKey: "m3_roi_analysis", documentName: "投资回报分析", documentNameEn: "ROI Analysis", documentCategory: "report", fileExtensions: ".xlsx,.pdf", uiPagePath: "/project-hub", uiPageName: "项目中心", uiPageNameEn: "Project Hub", sharepointFolder: "02_Proposal", isMandatory: false, sortOrder: 3, responsibleRoles: ["bu_pm", "bu_gm"] },
  // M4
  { stageCode: "M4", documentTypeKey: "m4_design_freeze_approval", documentName: "设计冻结审批表", documentNameEn: "Design Freeze Approval", documentCategory: "design", fileExtensions: ".docx,.pdf", uiPagePath: "/stage-gate-dashboard", uiPageName: "阶段门控", uiPageNameEn: "Stage Gate Dashboard", sharepointFolder: "03_Mechanical_Design", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm", "bu_gm"] },
  { stageCode: "M4", documentTypeKey: "m4_mechanical_ga", documentName: "机械设计总图", documentNameEn: "Mechanical General Drawing", documentCategory: "design", fileExtensions: ".sldasm,.slddrw,.step,.dxf", uiPagePath: "/mechanical-design", uiPageName: "机械设计", uiPageNameEn: "Mechanical Design", sharepointFolder: "03_Mechanical_Design", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech"] },
  { stageCode: "M4", documentTypeKey: "m4_electrical_schematic", documentName: "电气原理图", documentNameEn: "Electrical Schematic", documentCategory: "design", fileExtensions: ".elp,.elk,.pdf", uiPagePath: "/electrical-design", uiPageName: "电气设计", uiPageNameEn: "Electrical Design", sharepointFolder: "04_Electrical_Design", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_elec"] },
  { stageCode: "M4", documentTypeKey: "m4_bom_initial", documentName: "BOM清单(初版)", documentNameEn: "BOM (Initial)", documentCategory: "design", fileExtensions: ".xlsx,.csv", uiPagePath: "/bom-verification", uiPageName: "BOM校验", uiPageNameEn: "BOM Verification", sharepointFolder: "05_BOM_Procurement", isMandatory: true, sortOrder: 3, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M4", documentTypeKey: "m4_quality_plan", documentName: "质量计划", documentNameEn: "Quality Plan", documentCategory: "report", fileExtensions: ".docx,.xlsx,.pdf", uiPagePath: "/quality-workbench", uiPageName: "质量工作台", uiPageNameEn: "Quality Workbench", sharepointFolder: "07_Testing_QC", isMandatory: true, sortOrder: 4, responsibleRoles: ["quality_eng"] },
  // M5
  { stageCode: "M5", documentTypeKey: "m5_mechanical_detailed", documentName: "详细机械图纸", documentNameEn: "Detailed Mechanical Drawings", documentCategory: "design", fileExtensions: ".sldprt,.slddrw,.step,.dxf,.dwg", uiPagePath: "/mechanical-design", uiPageName: "机械设计", uiPageNameEn: "Mechanical Design", sharepointFolder: "03_Mechanical_Design", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_mech"] },
  { stageCode: "M5", documentTypeKey: "m5_wiring_diagrams", documentName: "电气接线图", documentNameEn: "Wiring Diagrams", documentCategory: "design", fileExtensions: ".elp,.elk,.pdf,.dwg", uiPagePath: "/electrical-design", uiPageName: "电气设计", uiPageNameEn: "Electrical Design", sharepointFolder: "04_Electrical_Design", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_elec"] },
  { stageCode: "M5", documentTypeKey: "m5_plc_program", documentName: "PLC程序文档", documentNameEn: "PLC Program Documentation", documentCategory: "design", fileExtensions: ".plc,.gx3,.pdf,.docx", uiPagePath: "/electrical-design", uiPageName: "电气设计", uiPageNameEn: "Electrical Design", sharepointFolder: "04_Electrical_Design", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_elec"] },
  { stageCode: "M5", documentTypeKey: "m5_bom_final", documentName: "BOM清单(终版)", documentNameEn: "BOM (Final)", documentCategory: "design", fileExtensions: ".xlsx,.csv", uiPagePath: "/bom-management", uiPageName: "BOM管理", uiPageNameEn: "BOM Management", sharepointFolder: "05_BOM_Procurement", isMandatory: true, sortOrder: 3, responsibleRoles: ["bu_mech", "bu_elec"] },
  // M6
  { stageCode: "M6", documentTypeKey: "m6_po_summary", documentName: "采购订单汇总", documentNameEn: "Purchase Order Summary", documentCategory: "report", fileExtensions: ".xlsx,.pdf", uiPagePath: "/procurement", uiPageName: "采购管理", uiPageNameEn: "Procurement", sharepointFolder: "05_BOM_Procurement", isMandatory: true, sortOrder: 0, responsibleRoles: ["procurement_eng"] },
  { stageCode: "M6", documentTypeKey: "m6_supplier_confirmation", documentName: "供应商确认单", documentNameEn: "Supplier Confirmation", documentCategory: "contract", fileExtensions: ".docx,.pdf", uiPagePath: "/procurement", uiPageName: "采购管理", uiPageNameEn: "Procurement", sharepointFolder: "05_BOM_Procurement", isMandatory: true, sortOrder: 1, responsibleRoles: ["procurement_eng"] },
  { stageCode: "M6", documentTypeKey: "m6_inspection_plan", documentName: "来料检验计划", documentNameEn: "Incoming Inspection Plan", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/procurement", uiPageName: "采购管理", uiPageNameEn: "Procurement", sharepointFolder: "05_BOM_Procurement", isMandatory: false, sortOrder: 2, responsibleRoles: ["quality_eng"] },
  // M7
  { stageCode: "M7", documentTypeKey: "m7_assembly_instructions", documentName: "装配作业指导书", documentNameEn: "Assembly Work Instructions", documentCategory: "manual", fileExtensions: ".docx,.pdf", uiPagePath: "/process-steps", uiPageName: "工艺步骤", uiPageNameEn: "Process Steps", sharepointFolder: "06_Assembly", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_mech"] },
  { stageCode: "M7", documentTypeKey: "m7_commissioning_records", documentName: "调试记录表", documentNameEn: "Commissioning Records", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "06_Assembly", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M7", documentTypeKey: "m7_issue_tracking", documentName: "问题整改跟踪表", documentNameEn: "Issue Tracking Sheet", documentCategory: "report", fileExtensions: ".xlsx,.docx", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "06_Assembly", isMandatory: false, sortOrder: 2, responsibleRoles: ["bu_pm"] },
  // M8
  { stageCode: "M8", documentTypeKey: "m8_fat_protocol", documentName: "FAT测试方案", documentNameEn: "FAT Test Protocol", documentCategory: "report", fileExtensions: ".docx,.xlsx,.pdf", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm", "quality_eng"] },
  { stageCode: "M8", documentTypeKey: "m8_fat_report", documentName: "FAT测试报告", documentNameEn: "FAT Test Report", documentCategory: "report", fileExtensions: ".docx,.pdf", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 1, responsibleRoles: ["quality_eng"] },
  { stageCode: "M8", documentTypeKey: "m8_customer_signoff", documentName: "客户签字确认单", documentNameEn: "Customer Sign-off", documentCategory: "contract", fileExtensions: ".pdf,.docx", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_pm", "bu_sales"] },
  // M9
  { stageCode: "M9", documentTypeKey: "m9_shipping_list", documentName: "发货清单", documentNameEn: "Shipping List", documentCategory: "report", fileExtensions: ".xlsx,.pdf", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "09_Shipping", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm"] },
  { stageCode: "M9", documentTypeKey: "m9_installation_plan", documentName: "安装方案", documentNameEn: "Installation Plan", documentCategory: "manual", fileExtensions: ".docx,.pdf", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "10_Site_Installation", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M9", documentTypeKey: "m9_transport_insurance", documentName: "运输保险单", documentNameEn: "Transport Insurance", documentCategory: "contract", fileExtensions: ".pdf,.docx", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "09_Shipping", isMandatory: false, sortOrder: 2, responsibleRoles: ["bu_pm"] },
  // M10
  { stageCode: "M10", documentTypeKey: "m10_commissioning_report", documentName: "现场调试报告", documentNameEn: "On-site Commissioning Report", documentCategory: "report", fileExtensions: ".docx,.pdf,.xlsx", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "10_Site_Installation", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M10", documentTypeKey: "m10_process_validation", documentName: "工艺验证报告", documentNameEn: "Process Validation Report", documentCategory: "report", fileExtensions: ".docx,.pdf,.xlsx", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "10_Site_Installation", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech", "quality_eng"] },
  // M11
  { stageCode: "M11", documentTypeKey: "m11_sat_protocol", documentName: "SAT测试方案", documentNameEn: "SAT Test Protocol", documentCategory: "report", fileExtensions: ".docx,.xlsx,.pdf", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm", "quality_eng"] },
  { stageCode: "M11", documentTypeKey: "m11_sat_report", documentName: "SAT测试报告", documentNameEn: "SAT Test Report", documentCategory: "report", fileExtensions: ".docx,.pdf", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 1, responsibleRoles: ["quality_eng"] },
  { stageCode: "M11", documentTypeKey: "m11_training_records", documentName: "培训记录", documentNameEn: "Training Records", documentCategory: "report", fileExtensions: ".xlsx,.docx,.pdf", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "10_Site_Installation", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_pm", "cs_engineer"] },
  { stageCode: "M11", documentTypeKey: "m11_final_acceptance", documentName: "客户终验收单", documentNameEn: "Final Acceptance Certificate", documentCategory: "contract", fileExtensions: ".pdf,.docx", uiPagePath: "/fat-sat", uiPageName: "FAT/SAT", uiPageNameEn: "FAT/SAT", sharepointFolder: "08_FAT_SAT", isMandatory: true, sortOrder: 3, responsibleRoles: ["bu_pm", "bu_sales"] },
  // M12
  { stageCode: "M12", documentTypeKey: "m12_project_summary", documentName: "项目总结报告", documentNameEn: "Project Summary Report", documentCategory: "report", fileExtensions: ".docx,.pdf,.pptx", uiPagePath: "/project-phase-documents", uiPageName: "项目阶段文档", uiPageNameEn: "Project Phase Documents", sharepointFolder: "12_Lessons_Learned", isMandatory: true, sortOrder: 0, responsibleRoles: ["bu_pm"] },
  { stageCode: "M12", documentTypeKey: "m12_om_manual", documentName: "操作维护手册", documentNameEn: "O&M Manual", documentCategory: "manual", fileExtensions: ".docx,.pdf", uiPagePath: "/delivery", uiPageName: "交付管理", uiPageNameEn: "Delivery", sharepointFolder: "11_Warranty_Service", isMandatory: true, sortOrder: 1, responsibleRoles: ["bu_mech", "bu_elec"] },
  { stageCode: "M12", documentTypeKey: "m12_spare_parts", documentName: "备件清单", documentNameEn: "Spare Parts List", documentCategory: "report", fileExtensions: ".xlsx,.pdf", uiPagePath: "/spare-parts", uiPageName: "备件管理", uiPageNameEn: "Spare Parts", sharepointFolder: "11_Warranty_Service", isMandatory: true, sortOrder: 2, responsibleRoles: ["bu_mech"] },
  { stageCode: "M12", documentTypeKey: "m12_lessons_learned", documentName: "知识沉淀文档", documentNameEn: "Lessons Learned", documentCategory: "report", fileExtensions: ".docx,.pdf,.pptx", uiPagePath: "/project-phase-documents", uiPageName: "项目阶段文档", uiPageNameEn: "Project Phase Documents", sharepointFolder: "12_Lessons_Learned", isMandatory: false, sortOrder: 3, responsibleRoles: ["bu_pm"] },
];

// ── Engine A: Storage Recommendation ───────────────────────────────────────

export async function recommendStorage(input: {
  fileName: string;
  fileExtension?: string;
  mimeType?: string;
  projectId?: number;
  stageCode?: string;
  userId: number;
}): Promise<StorageRecommendation> {
  const db = await requireDb();
  const ext = input.fileExtension || extractExtension(input.fileName);
  const classification = classifyFile(input.fileName, ext, input.mimeType);

  // Resolve stage from project if not provided
  let stageCode = input.stageCode || null;
  let projectCode: string | null = null;
  if (!stageCode && input.projectId) {
    try {
      const [project] = await db
        .select({ currentStage: projects.currentPhase, projectCode: projects.projectCode })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (project) {
        stageCode = project.currentStage;
        projectCode = project.projectCode;
      }
    } catch {
      // projects table may not have currentStage column — graceful degradation
    }
  }

  // Query mapping table for best match
  let bestMatch: (typeof idoStageDocumentUiMap.$inferSelect) | null = null;
  let confidence = classification.confidence;

  if (stageCode) {
    // Try exact stage + extension match
    const mappings = await db
      .select()
      .from(idoStageDocumentUiMap)
      .where(
        and(
          eq(idoStageDocumentUiMap.stageCode, stageCode),
          eq(idoStageDocumentUiMap.isActive, true),
        ),
      )
      .orderBy(idoStageDocumentUiMap.sortOrder)
      .limit(100);

    for (const m of mappings) {
      if (m.fileExtensions && ext) {
        const exts = m.fileExtensions.split(",").map((e) => e.trim().toLowerCase());
        if (exts.includes(ext.toLowerCase())) {
          bestMatch = m;
          confidence = Math.min(100, confidence + 30);
          break;
        }
      }
    }

    // Fallback: match by document category
    if (!bestMatch && classification.documentCategory) {
      for (const m of mappings) {
        if (m.documentCategory === classification.documentCategory) {
          bestMatch = m;
          confidence = Math.min(85, confidence + 15);
          break;
        }
      }
    }
  }

  // If still no match, try keyword-based matching across all stages
  if (!bestMatch && classification.documentTypeHint) {
    try {
      const allMappings = await db
        .select()
        .from(idoStageDocumentUiMap)
        .where(eq(idoStageDocumentUiMap.isActive, true))
        .limit(200);

      for (const m of allMappings) {
        if (m.documentTypeKey.includes(classification.documentTypeHint)) {
          bestMatch = m;
          confidence = Math.min(60, confidence);
          break;
        }
      }
    } catch {
      // table may not exist yet
    }
  }

  // Build recommendation
  const spFolderSuggestions = suggestSharepointFolders(
    classification.documentCategory,
    classification.documentTypeHint,
  );

  const sharepointFolder = bestMatch?.sharepointFolder || spFolderSuggestions[0] || null;
  const sharepointSubfolder = bestMatch?.sharepointSubfolder || null;
  const pathParts = [projectCode || "Project", sharepointFolder, sharepointSubfolder].filter(Boolean);
  const recommendedPath = pathParts.join("/");

  const reasoning = bestMatch
    ? `文件 "${input.fileName}" 匹配到 ${bestMatch.stageCode} 阶段的 "${bestMatch.documentName}"，建议存储在 SharePoint ${sharepointFolder}/ 目录下。`
    : `基于文件类型 (${classification.fileCategory}) 和关键词分析，建议存储在 ${sharepointFolder || "项目文件"}/ 目录下。`;

  // Log recommendation
  try {
    await db.insert(idoStorageRecommendations).values({
      userId: input.userId,
      projectId: input.projectId ?? null,
      stageCode: stageCode ?? null,
      fileName: input.fileName,
      fileExtension: ext || null,
      fileSizeBytes: null,
      mimeType: input.mimeType ?? null,
      recommendedPath,
      recommendedSpFolder: sharepointFolder,
      recommendedPlmDocType: bestMatch?.plmDocType ?? null,
      matchedMapId: bestMatch?.id ?? null,
      confidenceScore: confidence,
      aiReasoning: reasoning,
      userAction: "pending",
    });
  } catch (err) {
    log.warn({ err }, "Failed to log storage recommendation");
  }

  return {
    recommendedPath,
    sharepointFolder,
    sharepointSubfolder,
    uiPagePath: bestMatch?.uiPagePath ?? null,
    uiPageName: bestMatch?.uiPageName ?? null,
    matchedMapId: bestMatch?.id ?? null,
    confidence,
    reasoning,
    classification,
  };
}

// ── Engine B: File-Open Context ────────────────────────────────────────────

export async function buildFileOpenContext(input: {
  fileName: string;
  projectId?: number;
  stageCode?: string;
}): Promise<FileOpenContext> {
  const db = await requireDb();

  // Determine stage
  let stageCode = input.stageCode || null;
  if (!stageCode && input.projectId) {
    try {
      const [project] = await db
        .select({ currentStage: projects.currentPhase })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (project) stageCode = project.currentStage;
    } catch {
      // graceful degradation
    }
  }

  const stage = stageCode ? STAGE_MAP[stageCode] : null;

  // Match current file to mapping
  const classification = classifyFile(input.fileName);
  let currentDocMatch: (typeof idoStageDocumentUiMap.$inferSelect) | null = null;

  if (stageCode) {
    try {
      const mappings = await db
        .select()
        .from(idoStageDocumentUiMap)
        .where(
          and(
            eq(idoStageDocumentUiMap.stageCode, stageCode),
            eq(idoStageDocumentUiMap.isActive, true),
          ),
        )
        .orderBy(idoStageDocumentUiMap.sortOrder)
        .limit(100);

      // Try name-based match first
      for (const m of mappings) {
        if (input.fileName.includes(m.documentName) || m.documentName.includes(input.fileName.replace(/\.[^.]+$/, ""))) {
          currentDocMatch = m;
          break;
        }
      }

      // Fallback to extension match
      if (!currentDocMatch) {
        const ext = extractExtension(input.fileName).toLowerCase();
        for (const m of mappings) {
          if (m.fileExtensions?.split(",").map((e) => e.trim().toLowerCase()).includes(ext)) {
            currentDocMatch = m;
            break;
          }
        }
      }
    } catch {
      // table may not exist
    }
  }

  // Get related docs for the same stage
  const relatedDocs: FileOpenContext["relatedDocs"] = [];
  if (stageCode) {
    try {
      const stageMappings = await db
        .select()
        .from(idoStageDocumentUiMap)
        .where(
          and(
            eq(idoStageDocumentUiMap.stageCode, stageCode),
            eq(idoStageDocumentUiMap.isActive, true),
          ),
        )
        .orderBy(idoStageDocumentUiMap.sortOrder)
        .limit(100);

      // Check which documents exist for the project
      let existingDocNames: string[] = [];
      if (input.projectId) {
        try {
          const docs = await db
            .select({ docName: projectDocuments.name })
            .from(projectDocuments)
            .where(eq(projectDocuments.projectId, input.projectId))
            .limit(1000);
          existingDocNames = docs.map((d) => d.docName);
        } catch {
          // table may not exist
        }
      }

      for (const m of stageMappings) {
        if (m.id === currentDocMatch?.id) continue;
        const fulfilled = existingDocNames.some((name) =>
          name.includes(m.documentName) || m.documentName.includes(name),
        );
        relatedDocs.push({
          id: m.id,
          documentName: m.documentName,
          uiPagePath: m.uiPagePath,
          fulfilled,
        });
      }
    } catch {
      // graceful degradation
    }
  }

  // Build next actions
  const nextActions: string[] = [];
  const missingMandatory = relatedDocs.filter((d) => !d.fulfilled);
  if (missingMandatory.length > 0) {
    nextActions.push(`${stageCode || "当前"}阶段还缺 ${missingMandatory.length} 份文档`);
  }

  // Stage progress
  let stageProgress: FileOpenContext["stageProgress"] = null;
  if (stageCode && stage) {
    const totalRequired = relatedDocs.length + (currentDocMatch ? 1 : 0);
    const fulfilled = relatedDocs.filter((d) => d.fulfilled).length + (currentDocMatch ? 1 : 0);
    stageProgress = {
      stageCode,
      stageName: stage.name,
      totalRequired,
      fulfilled,
      completionPct: totalRequired > 0 ? Math.round((fulfilled / totalRequired) * 100) : 0,
    };
  }

  return {
    currentDoc: {
      documentName: currentDocMatch?.documentName ?? null,
      stageCode: stageCode ?? null,
      stageName: stage?.name ?? null,
      uiPagePath: currentDocMatch?.uiPagePath ?? null,
    },
    relatedDocs,
    nextActions,
    stageProgress,
  };
}

// ── Engine C: Workflow Document Tracker ─────────────────────────────────────

export async function getProjectDocumentCompletion(
  projectId: number,
): Promise<StageDocCompletion[]> {
  const db = await requireDb();

  // Get all active mappings
  let allMappings: (typeof idoStageDocumentUiMap.$inferSelect)[] = [];
  try {
    allMappings = await db
      .select()
      .from(idoStageDocumentUiMap)
      .where(eq(idoStageDocumentUiMap.isActive, true))
      .orderBy(idoStageDocumentUiMap.stageCode, idoStageDocumentUiMap.sortOrder)
      .limit(1000);
  } catch {
    return [];
  }

  // Get existing project documents
  let existingDocNames: string[] = [];
  try {
    const docs = await db
      .select({ docName: projectDocuments.name })
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .limit(1000);
    existingDocNames = docs.map((d) => d.docName);
  } catch {
    // table may not exist
  }

  // Group by stage
  const byStage = new Map<string, (typeof idoStageDocumentUiMap.$inferSelect)[]>();
  for (const m of allMappings) {
    const arr = byStage.get(m.stageCode) || [];
    arr.push(m);
    byStage.set(m.stageCode, arr);
  }

  // Build completion for each stage
  const result: StageDocCompletion[] = [];
  for (const stage of STAGES) {
    const mappings = byStage.get(stage.code) || [];
    if (mappings.length === 0) {
      result.push({
        stageCode: stage.code,
        stageName: stage.name,
        category: stage.category,
        color: stage.color,
        totalRequired: 0,
        totalMandatory: 0,
        fulfilled: 0,
        mandatoryFulfilled: 0,
        completionPct: 100,
        mandatoryCompletionPct: 100,
        missingDocs: [],
      });
      continue;
    }

    let fulfilled = 0;
    let mandatoryFulfilled = 0;
    const totalMandatory = mappings.filter((m) => m.isMandatory).length;
    const missingDocs: StageDocCompletion["missingDocs"] = [];

    for (const m of mappings) {
      const found = existingDocNames.some(
        (name) => name.includes(m.documentName) || m.documentName.includes(name),
      );
      if (found) {
        fulfilled++;
        if (m.isMandatory) mandatoryFulfilled++;
      } else {
        missingDocs.push({
          mapId: m.id,
          documentName: m.documentName,
          documentNameEn: m.documentNameEn,
          uiPagePath: m.uiPagePath,
          uiPageName: m.uiPageName,
          isMandatory: m.isMandatory,
        });
      }
    }

    result.push({
      stageCode: stage.code,
      stageName: stage.name,
      category: stage.category,
      color: stage.color,
      totalRequired: mappings.length,
      totalMandatory,
      fulfilled,
      mandatoryFulfilled,
      completionPct: mappings.length > 0 ? Math.round((fulfilled / mappings.length) * 100) : 100,
      mandatoryCompletionPct: totalMandatory > 0 ? Math.round((mandatoryFulfilled / totalMandatory) * 100) : 100,
      missingDocs,
    });
  }

  return result;
}

// ── Seed Mapping Table ─────────────────────────────────────────────────────

export async function seedMappingTable(): Promise<number> {
  const db = await requireDb();

  // Check if already seeded
  const existing = await db
    .select({ value: sql<number>`count(*)` })
    .from(idoStageDocumentUiMap)
    .limit(1);
  const count = Number(existing[0]?.value || 0);
  if (count > 0) {
    log.info({ count }, "IDO mapping table already seeded");
    return count;
  }

  let inserted = 0;
  for (const row of SEED_DATA) {
    await db.insert(idoStageDocumentUiMap).values({
      stageCode: row.stageCode,
      documentTypeKey: row.documentTypeKey,
      documentName: row.documentName,
      documentNameEn: row.documentNameEn,
      documentCategory: row.documentCategory,
      fileExtensions: row.fileExtensions,
      uiPagePath: row.uiPagePath,
      uiPageName: row.uiPageName,
      uiPageNameEn: row.uiPageNameEn,
      sharepointFolder: row.sharepointFolder,
      isMandatory: row.isMandatory,
      sortOrder: row.sortOrder,
      responsibleRoles: row.responsibleRoles,
      isActive: true,
    });
    inserted++;
  }

  log.info({ inserted }, "IDO mapping table seeded");
  return inserted;
}
