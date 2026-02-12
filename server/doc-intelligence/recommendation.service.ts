/**
 * 文档推荐服务 (Document Recommendation Service)
 * Phase A: 工程文档AI推荐系统
 *
 * 职责：
 * - 基于阶段定义推荐当前阶段所需文档
 * - 基于历史项目推荐参考文档
 * - AI生成推荐理由
 * - 文档完备性检查
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import { requireDb } from "../db";
import {
  documentEmbeddings,
  projectDocuments,
  stageDocumentRequirements,
  documentRecommendationLogs,
} from "../../drizzle/schema";
import { STAGES } from "../../shared/stage-definitions";
import {
  searchSimilarByText,
  type SimilarDocument,
} from "./embedding.service";
import { generateText } from "../ai-adapter/AIServiceFactory";

// =============================================================================
// 类型定义
// =============================================================================

export interface StageDocumentRequirement {
  id: number;
  stageCode: string;
  documentName: string;
  documentNameEn: string | null;
  documentType: string;
  description: string | null;
  descriptionEn: string | null;
  isMandatory: boolean;
  templateUrl: string | null;
  sortOrder: number;
}

export interface DocumentCompleteness {
  stageCode: string;
  stageName: string;
  requirements: StageRequirementStatus[];
  completionRate: number;
  mandatoryCompletionRate: number;
}

export interface StageRequirementStatus {
  requirement: StageDocumentRequirement;
  fulfilled: boolean;
  matchedDocumentId: number | null;
  matchedDocumentName: string | null;
}

export interface StageRecommendation {
  stageCode: string;
  stageName: string;
  /** 必需但缺失的文档 */
  missingDocuments: StageDocumentRequirement[];
  /** 来自历史项目的推荐文档 */
  referenceDocuments: SimilarDocument[];
  /** AI生成的推荐理由 */
  aiReasoning: string | null;
}

// =============================================================================
// 默认阶段文档需求定义
// =============================================================================

/** M0-M12 各阶段的默认文档需求 */
const DEFAULT_STAGE_REQUIREMENTS: Record<string, { name: string; nameEn: string; type: string; mandatory: boolean; desc: string }[]> = {
  M0: [
    { name: "客户需求记录", nameEn: "Customer Requirements Record", type: "report", mandatory: true, desc: "初始客户需求与应用场景记录" },
    { name: "商机评估表", nameEn: "Opportunity Assessment", type: "report", mandatory: true, desc: "商机可行性初步评估" },
  ],
  M1: [
    { name: "详细需求规格书", nameEn: "Detailed Requirements Specification", type: "design", mandatory: true, desc: "详细功能需求与技术参数" },
    { name: "技术可行性报告", nameEn: "Technical Feasibility Report", type: "report", mandatory: true, desc: "技术方案可行性分析" },
    { name: "竞品分析报告", nameEn: "Competitive Analysis", type: "report", mandatory: false, desc: "行业竞品对比分析" },
  ],
  M2: [
    { name: "技术方案书", nameEn: "Technical Proposal", type: "design", mandatory: true, desc: "完整技术方案与系统架构" },
    { name: "商务报价单", nameEn: "Commercial Quotation", type: "contract", mandatory: true, desc: "客户报价文件" },
    { name: "项目进度计划", nameEn: "Project Schedule", type: "report", mandatory: true, desc: "初版项目里程碑与进度计划" },
  ],
  M3: [
    { name: "立项申请书", nameEn: "Project Initiation Request", type: "report", mandatory: true, desc: "正式立项申请与资源需求" },
    { name: "RACI矩阵", nameEn: "RACI Matrix", type: "report", mandatory: true, desc: "项目角色与责任分配表" },
    { name: "风险登记册", nameEn: "Risk Register", type: "report", mandatory: true, desc: "已识别风险与应对措施" },
    { name: "投资回报分析", nameEn: "ROI Analysis", type: "report", mandatory: false, desc: "项目投资回报率分析" },
  ],
  M4: [
    { name: "设计冻结审批表", nameEn: "Design Freeze Approval", type: "design", mandatory: true, desc: "设计方案冻结审批记录" },
    { name: "机械设计总图", nameEn: "Mechanical General Drawing", type: "design", mandatory: true, desc: "设备总装图与关键尺寸" },
    { name: "电气原理图", nameEn: "Electrical Schematic", type: "design", mandatory: true, desc: "电气控制原理图" },
    { name: "BOM清单(初版)", nameEn: "BOM (Initial)", type: "design", mandatory: true, desc: "物料清单初版" },
    { name: "质量计划", nameEn: "Quality Plan", type: "report", mandatory: true, desc: "项目质量保证计划" },
  ],
  M5: [
    { name: "详细机械图纸", nameEn: "Detailed Mechanical Drawings", type: "design", mandatory: true, desc: "所有零件加工图与装配图" },
    { name: "电气接线图", nameEn: "Wiring Diagrams", type: "design", mandatory: true, desc: "完整电气接线与线路图" },
    { name: "PLC程序文档", nameEn: "PLC Program Documentation", type: "design", mandatory: true, desc: "控制程序设计文档" },
    { name: "BOM清单(终版)", nameEn: "BOM (Final)", type: "design", mandatory: true, desc: "终版物料清单" },
  ],
  M6: [
    { name: "采购订单汇总", nameEn: "Purchase Order Summary", type: "report", mandatory: true, desc: "所有采购订单汇总状态" },
    { name: "供应商确认单", nameEn: "Supplier Confirmation", type: "contract", mandatory: true, desc: "关键供应商交期确认" },
    { name: "来料检验计划", nameEn: "Incoming Inspection Plan", type: "report", mandatory: false, desc: "物料入库检验标准" },
  ],
  M7: [
    { name: "装配作业指导书", nameEn: "Assembly Work Instructions", type: "manual", mandatory: true, desc: "设备装配步骤与注意事项" },
    { name: "调试记录表", nameEn: "Commissioning Records", type: "report", mandatory: true, desc: "厂内调试参数与结果记录" },
    { name: "问题整改跟踪表", nameEn: "Issue Tracking Sheet", type: "report", mandatory: false, desc: "装配调试中发现的问题跟踪" },
  ],
  M8: [
    { name: "FAT测试方案", nameEn: "FAT Test Protocol", type: "report", mandatory: true, desc: "工厂验收测试方案与标准" },
    { name: "FAT测试报告", nameEn: "FAT Test Report", type: "report", mandatory: true, desc: "工厂验收测试结果报告" },
    { name: "客户签字确认单", nameEn: "Customer Sign-off", type: "contract", mandatory: true, desc: "客户FAT签字确认文件" },
  ],
  M9: [
    { name: "发货清单", nameEn: "Shipping List", type: "report", mandatory: true, desc: "设备发货明细清单" },
    { name: "安装方案", nameEn: "Installation Plan", type: "manual", mandatory: true, desc: "现场安装方案与要求" },
    { name: "运输保险单", nameEn: "Transport Insurance", type: "contract", mandatory: false, desc: "设备运输保险文件" },
  ],
  M10: [
    { name: "现场调试报告", nameEn: "On-site Commissioning Report", type: "report", mandatory: true, desc: "客户现场调试参数与结果" },
    { name: "工艺验证报告", nameEn: "Process Validation Report", type: "report", mandatory: true, desc: "清洗工艺参数验证结果" },
  ],
  M11: [
    { name: "SAT测试方案", nameEn: "SAT Test Protocol", type: "report", mandatory: true, desc: "现场验收测试方案" },
    { name: "SAT测试报告", nameEn: "SAT Test Report", type: "report", mandatory: true, desc: "现场验收测试结果报告" },
    { name: "培训记录", nameEn: "Training Records", type: "report", mandatory: true, desc: "客户操作人员培训记录" },
    { name: "客户终验收单", nameEn: "Final Acceptance Certificate", type: "contract", mandatory: true, desc: "客户终验收签字文件" },
  ],
  M12: [
    { name: "项目总结报告", nameEn: "Project Summary Report", type: "report", mandatory: true, desc: "项目全过程总结" },
    { name: "操作维护手册", nameEn: "O&M Manual", type: "manual", mandatory: true, desc: "设备操作与维护手册" },
    { name: "备件清单", nameEn: "Spare Parts List", type: "report", mandatory: true, desc: "推荐备件清单与规格" },
    { name: "知识沉淀文档", nameEn: "Lessons Learned", type: "report", mandatory: false, desc: "项目经验教训总结" },
  ],
};

// =============================================================================
// 阶段文档需求管理
// =============================================================================

/**
 * 初始化默认阶段文档需求（首次使用时调用）
 */
export async function initDefaultRequirements(): Promise<number> {
  const db = await requireDb();
  // 检查是否已初始化
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stageDocumentRequirements);

  if (Number(existing.count) > 0) {
    return Number(existing.count);
  }

  let inserted = 0;
  for (const [stageCode, requirements] of Object.entries(DEFAULT_STAGE_REQUIREMENTS)) {
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      await db.insert(stageDocumentRequirements).values({
        stageCode,
        documentName: req.name,
        documentNameEn: req.nameEn,
        documentType: req.type,
        description: req.desc,
        descriptionEn: req.desc,
        isMandatory: req.mandatory ? 1 : 0,
        sortOrder: i,
      });
      inserted++;
    }
  }

  return inserted;
}

/**
 * 获取指定阶段的文档需求
 */
export async function getStageRequirements(stageCode: string): Promise<StageDocumentRequirement[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(stageDocumentRequirements)
    .where(eq(stageDocumentRequirements.stageCode, stageCode))
    .orderBy(stageDocumentRequirements.sortOrder);

  return rows.map((r) => ({
    id: r.id,
    stageCode: r.stageCode,
    documentName: r.documentName,
    documentNameEn: r.documentNameEn,
    documentType: r.documentType,
    description: r.description,
    descriptionEn: r.descriptionEn,
    isMandatory: r.isMandatory === 1,
    templateUrl: r.templateUrl,
    sortOrder: r.sortOrder,
  }));
}

/**
 * 获取所有阶段的文档需求
 */
export async function getAllStageRequirements(): Promise<Record<string, StageDocumentRequirement[]>> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(stageDocumentRequirements)
    .orderBy(stageDocumentRequirements.stageCode, stageDocumentRequirements.sortOrder);

  const grouped: Record<string, StageDocumentRequirement[]> = {};
  for (const r of rows) {
    if (!grouped[r.stageCode]) grouped[r.stageCode] = [];
    grouped[r.stageCode].push({
      id: r.id,
      stageCode: r.stageCode,
      documentName: r.documentName,
      documentNameEn: r.documentNameEn,
      documentType: r.documentType,
      description: r.description,
      descriptionEn: r.descriptionEn,
      isMandatory: r.isMandatory === 1,
      templateUrl: r.templateUrl,
      sortOrder: r.sortOrder,
    });
  }
  return grouped;
}

// =============================================================================
// 文档完备性检查
// =============================================================================

/**
 * 检查项目在指定阶段的文档完备性
 */
export async function checkDocumentCompleteness(
  projectId: number,
  stageCode: string
): Promise<DocumentCompleteness> {
  const db = await requireDb();
  const stage = STAGES.find((s) => s.code === stageCode);
  const requirements = await getStageRequirements(stageCode);

  // 获取项目在该阶段的所有文档
  const existingDocs = await db
    .select()
    .from(projectDocuments)
    .where(
      and(
        eq(projectDocuments.projectId, projectId),
        eq(projectDocuments.phaseCode, stageCode)
      )
    );

  // 检查每个需求是否满足（简单的名称匹配）
  const statuses: StageRequirementStatus[] = requirements.map((req) => {
    const matched = existingDocs.find(
      (doc) =>
        doc.name.includes(req.documentName) ||
        req.documentName.includes(doc.name) ||
        (req.documentNameEn && doc.name.toLowerCase().includes(req.documentNameEn.toLowerCase()))
    );

    return {
      requirement: req,
      fulfilled: !!matched,
      matchedDocumentId: matched?.id ?? null,
      matchedDocumentName: matched?.name ?? null,
    };
  });

  const totalReqs = statuses.length;
  const fulfilledReqs = statuses.filter((s) => s.fulfilled).length;
  const mandatoryReqs = statuses.filter((s) => s.requirement.isMandatory);
  const fulfilledMandatory = mandatoryReqs.filter((s) => s.fulfilled).length;

  return {
    stageCode,
    stageName: stage?.name || stageCode,
    requirements: statuses,
    completionRate: totalReqs > 0 ? Math.round((fulfilledReqs / totalReqs) * 100) : 100,
    mandatoryCompletionRate:
      mandatoryReqs.length > 0
        ? Math.round((fulfilledMandatory / mandatoryReqs.length) * 100)
        : 100,
  };
}

// =============================================================================
// AI文档推荐
// =============================================================================

/**
 * 为项目的指定阶段生成文档推荐
 */
export async function getStageRecommendations(
  projectId: number,
  stageCode: string,
  opts: { includeAiReasoning?: boolean } = {}
): Promise<StageRecommendation> {
  const stage = STAGES.find((s) => s.code === stageCode);

  // 1. 获取文档完备性
  const completeness = await checkDocumentCompleteness(projectId, stageCode);
  const missingDocs = completeness.requirements
    .filter((s) => !s.fulfilled)
    .map((s) => s.requirement);

  // 2. 搜索历史项目中该阶段的相似文档
  const searchQuery = `${stage?.name || stageCode} ${stage?.description || ''} ${missingDocs.map((d) => d.documentName).join(' ')}`;
  const referenceDocuments = await searchSimilarByText(searchQuery, {
    stageCode,
    limit: 5,
    minSimilarity: 0.2,
  });

  // 3. 可选：AI生成推荐理由
  let aiReasoning: string | null = null;
  if (opts.includeAiReasoning && missingDocs.length > 0) {
    try {
      const result = await generateText({
        messages: [
          {
            role: "system",
            content: `你是GRT工业清洗设备项目管理专家。请为项目阶段文档准备提供简洁的建议。用中文回答，不超过200字。`,
          },
          {
            role: "user",
            content: `项目当前处于 ${stageCode}(${stage?.name}) 阶段。
以下文档尚未准备:
${missingDocs.map((d) => `- ${d.documentName}: ${d.description}`).join("\n")}

请给出文档准备的优先级建议和注意事项。`,
          },
        ],
        temperature: 0.5,
        maxTokens: 500,
      });
      aiReasoning = result.content;
    } catch (err) {
      console.error("[DocIntelligence] AI reasoning generation failed:", err);
    }
  }

  return {
    stageCode,
    stageName: stage?.name || stageCode,
    missingDocuments: missingDocs,
    referenceDocuments,
    aiReasoning,
  };
}

/**
 * 获取项目所有阶段的文档完备性总览
 */
export async function getProjectDocumentOverview(
  projectId: number
): Promise<DocumentCompleteness[]> {
  const results: DocumentCompleteness[] = [];

  for (const stage of STAGES) {
    const completeness = await checkDocumentCompleteness(projectId, stage.code);
    results.push(completeness);
  }

  return results;
}

/**
 * 记录推荐日志
 */
export async function logRecommendation(params: {
  projectId: number;
  stageCode: string;
  userId: number;
  recommendedDocIds: number[];
  similarityScores: number[];
  aiReasoning: string | null;
}): Promise<void> {
  const db = await requireDb();
  await db.insert(documentRecommendationLogs).values({
    projectId: params.projectId,
    stageCode: params.stageCode,
    userId: params.userId,
    recommendedDocIds: JSON.stringify(params.recommendedDocIds),
    similarityScores: JSON.stringify(params.similarityScores),
    aiReasoning: params.aiReasoning,
  });
}

/**
 * 更新推荐日志的用户反馈
 */
export async function updateRecommendationFeedback(
  logId: number,
  feedback: "helpful" | "not_helpful",
  comment?: string
): Promise<void> {
  const db = await requireDb();
  await db
    .update(documentRecommendationLogs)
    .set({
      feedback,
      feedbackComment: comment || null,
    })
    .where(eq(documentRecommendationLogs.id, logId));
}
