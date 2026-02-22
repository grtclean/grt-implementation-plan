import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { capabilityProofConfigs, capabilityEvidences, publicCapabilityShowcase } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;
const successResponse = { success: true, message: "操作成功" };

const UPGRADE_RULES = [
  { id: "RULE-001", fromLevel: "L1", toLevel: "L2", requiredEvidences: 3, description: "L1升L2需要3个能力证据" },
  { id: "RULE-002", fromLevel: "L2", toLevel: "L3", requiredEvidences: 5, description: "L2升L3需要5个能力证据" },
  { id: "RULE-003", fromLevel: "L3", toLevel: "L4", requiredEvidences: 8, description: "L3升L4需要8个能力证据" },
  { id: "RULE-004", fromLevel: "L4", toLevel: "L5", requiredEvidences: 12, description: "L4升L5需要12个能力证据" },
];

const CAPABILITY_DOMAINS = [
  { code: "T", name: "技术能力", description: "专业技术和工程能力" },
  { code: "S", name: "销售能力", description: "市场开拓和客户管理" },
  { code: "D", name: "交付能力", description: "项目交付和执行能力" },
  { code: "C", name: "客户价值", description: "客户服务和价值创造" },
  { code: "K", name: "知识沉淀", description: "知识管理和经验沉淀" },
  { code: "L", name: "领导力", description: "团队管理和领导能力" },
];

export const capabilityOsRouter = router({
  // --- Basic CRUD ----------------------------------------------------------------
  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(capabilityProofConfigs).orderBy(desc(capabilityProofConfigs.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  getById: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.id, toNum(input.id)));
    return item || null;
  }),

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const capCode = "CAP-" + Date.now().toString(36).toUpperCase();
    const [item] = await db.insert(capabilityProofConfigs).values({
      capabilityCode: input.capabilityCode || capCode,
      capabilityName: input.capabilityName || input.name || "新能力",
      capabilityCategory: input.capabilityCategory || "technical_expertise",
      publicDescription: input.publicDescription || input.description,
      isActive: 1,
    }).returning();
    return { success: true, message: "创建成功", data: item };
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.capabilityName !== undefined) updates.capabilityName = input.capabilityName;
    if (input.capabilityCategory !== undefined) updates.capabilityCategory = input.capabilityCategory;
    if (input.publicDescription !== undefined) updates.publicDescription = input.publicDescription;
    if (input.publicEvidence !== undefined) updates.publicEvidence = input.publicEvidence;
    if (input.verificationRules !== undefined) updates.verificationRules = input.verificationRules;
    if (input.requiredDataSources !== undefined) updates.requiredDataSources = input.requiredDataSources;
    if (input.zkpEnabled !== undefined) updates.zkpEnabled = input.zkpEnabled ? 1 : 0;
    if (input.zkpCircuitType !== undefined) updates.zkpCircuitType = input.zkpCircuitType;
    if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
    const [item] = await db.update(capabilityProofConfigs).set(updates).where(eq(capabilityProofConfigs.id, id)).returning();
    return { success: true, message: "更新成功", data: item };
  }),

  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(capabilityProofConfigs).where(eq(capabilityProofConfigs.id, toNum(input.id)));
    return successResponse;
  }),

  getAssessmentReport: publicProcedure.input(z.any()).query(async () => {
    const db = await requireDb();
    const configs = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1));
    return { report: { domains: CAPABILITY_DOMAINS, capabilities: configs } };
  }),

  getEmployeeCapabilities: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const userId = input?.employeeId || input?.userId;
    if (!userId) return [];
    const evidences = await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.userId, toNum(userId)));
    return evidences;
  }),

  getDevelopmentPath: publicProcedure.input(z.any()).query(async () => {
    const db = await requireDb();
    const configs = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1)).limit(5);
    return configs;
  }),

  getUpgradeRules: publicProcedure.query(() => UPGRADE_RULES),
  upgradeCapability: protectedProcedure.input(z.any()).mutation(() => successResponse),

  listCapabilities: publicProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1));
  }),

  getDomains: publicProcedure.query(() => CAPABILITY_DOMAINS.map((d, i) => ({ ...d, id: i + 1 }))),

  getMyCapabilities: publicProcedure.query(async () => {
    const db = await requireDb();
    const evidences = await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.status, "approved")).limit(200);
    // Aggregate by domain → { domainId, currentLevel, totalPoints }
    const domainMap: Record<string, { code: string; domainId: number; currentLevel: number; totalPoints: number }> = {};
    const domainIds: Record<string, number> = { T: 1, S: 2, D: 3, C: 4, K: 5, L: 6 };
    for (const ev of evidences) {
      const domain = ev.capabilityDomain || "T";
      if (!domainMap[domain]) {
        domainMap[domain] = { code: domain, domainId: domainIds[domain] || 1, currentLevel: 1, totalPoints: 0 };
      }
      domainMap[domain].totalPoints += 50; // base score per approved evidence
      if (ev.currentLevel && ev.currentLevel > domainMap[domain].currentLevel) {
        domainMap[domain].currentLevel = ev.currentLevel;
      }
    }
    return Object.values(domainMap);
  }),

  getMyEvidences: publicProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).orderBy(desc(capabilityEvidences.createdAt)).limit(50);
  }),

  getEvidenceTypes: publicProcedure.query(() => [
    { id: 1, code: "project_delivery", name: "项目交付", description: "项目参与和完成记录", baseScore: 50, domains: "T,D,C" },
    { id: 2, code: "training_cert", name: "培训证书", description: "培训完成证书", baseScore: 30, domains: "T,K" },
    { id: 3, code: "skill_cert", name: "技能认证", description: "专业技能认证", baseScore: 40, domains: "T" },
    { id: 4, code: "customer_feedback", name: "客户反馈", description: "客户满意度反馈", baseScore: 35, domains: "C,S" },
    { id: 5, code: "peer_review", name: "同行评审", description: "同事评审和推荐", baseScore: 25, domains: "T,L" },
    { id: 6, code: "self_assessment", name: "自我评估", description: "个人能力自评", baseScore: 10, domains: "T,S,D,C,K,L" },
    { id: 7, code: "supervisor_eval", name: "上级评价", description: "直属上级评价", baseScore: 45, domains: "T,S,D,C,K,L" },
    { id: 8, code: "other", name: "其他", description: "其他类型证据", baseScore: 15, domains: "T,S,D,C,K,L" },
  ]),

  submitEvidence: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const evidenceId = "EVD-" + Date.now().toString(36).toUpperCase();
    const [evidence] = await db.insert(capabilityEvidences).values({
      id: Date.now(),
      evidenceId,
      userId: toNum(input.userId || 1),
      userName: input.userName,
      evidenceType: input.evidenceType || "project_delivery",
      capabilityDomain: input.capabilityDomain || "T",
      title: input.title || "新证据",
      description: input.description,
      projectId: input.projectId,
      projectName: input.projectName,
      equipmentModel: input.equipmentModel,
      fileUrl: input.fileUrl,
      fileKey: input.fileKey,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize ? toNum(input.fileSize) : undefined,
      status: "pending",
      currentLevel: input.currentLevel ? toNum(input.currentLevel) : undefined,
      targetLevel: input.targetLevel ? toNum(input.targetLevel) : undefined,
      metadata: input.metadata,
      tags: input.tags,
    }).returning();
    return { success: true, message: "证据已提交", data: evidence };
  }),

  reviewEvidence: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id || input.evidenceId);
    const status = input.approved ? "approved" : "rejected";
    await db.update(capabilityEvidences).set({
      status: status as any,
      reviewerId: toNum(input.reviewerId || 1),
      reviewerName: input.reviewerName,
      reviewComment: input.comment || input.reviewComment,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(capabilityEvidences.id, id));
    return { success: true, message: status === "approved" ? "已通过" : "已驳回" };
  }),

  getPendingEvidences: publicProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.status, "pending")).orderBy(desc(capabilityEvidences.createdAt));
  }),

  getAllEvidences: publicProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).orderBy(desc(capabilityEvidences.createdAt)).limit(200);
  }),

  // --- Badges (no DB table) ------------------------------------------------------
  getAllBadges: publicProcedure.query(() => []),
  getUserBadges: publicProcedure.input(z.any()).query(() => []),
  getBadgeLeaderboard: publicProcedure.query(() => []),
  getBadgeStatistics: publicProcedure.query(() => ({ statistics: {} })),
  updateBadgeDisplay: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // --- Leaderboard (no DB table) -------------------------------------------------
  getDomainLeaderboard: publicProcedure.input(z.any()).query(() => []),
  getOverallLeaderboard: publicProcedure.query(() => []),
  getProgressLeaderboard: publicProcedure.query(() => []),
  getLeaderboardStats: publicProcedure.query(() => ({ stats: {} })),

  // --- Certificates (no DB table) ------------------------------------------------
  getMyCertificates: publicProcedure.query(() => []),
  checkCertificateEligibility: publicProcedure.input(z.any()).query(() => ({ eligible: false, requirements: [] })),
  generateCertificate: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
  verifyCertificateByQR: publicProcedure.input(z.any()).query(() => ({ valid: false, certificate: null })),

  // --- Engineer Checkpoints (no DB table) ----------------------------------------
  getAllEngineerCheckpoints: publicProcedure.query(() => []),
  approveCheckpoint: protectedProcedure.input(z.any()).mutation(() => successResponse),
  rejectCheckpoint: protectedProcedure.input(z.any()).mutation(() => successResponse),
  completePhase: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // --- Path Recommendation (static mock) -----------------------------------------
  getPathRecommendation: publicProcedure.input(z.any()).query(() => ({
    userId: "user1",
    currentCapabilities: {
      T: { level: 3, points: 450 },
      S: { level: 2, points: 180 },
      D: { level: 3, points: 380 },
      C: { level: 2, points: 150 },
      K: { level: 1, points: 60 },
      L: { level: 1, points: 40 },
    },
    weakestDomains: [
      { code: "K", name: "知识沉淀", level: 1, gap: 1.5 },
      { code: "L", name: "领导力", level: 1, gap: 1.5 },
    ],
    strongestDomains: [
      { code: "T", name: "技术能力", level: 3 },
      { code: "D", name: "交付能力", level: 3 },
    ],
    recommendedPath: {
      shortTerm: [{ action: "完成知识沉淀基础培训课程", domain: "K", expectedPoints: 30 }],
      midTerm: [{ action: "独立完成2-3个知识沉淀相关项目", domain: "K", expectedPoints: 150 }],
      longTerm: [{ action: "成为知识沉淀领域的内部专家", domain: "K", expectedPoints: 200 }],
    },
    projectOpportunities: [],
    trainingResources: [],
    aiAnalysis: "根据您的能力数据分析，建议优先提升知识沉淀(K)和领导力(L)两个短板领域。",
    generatedAt: new Date().toISOString(),
  })),

  // --- Agent Units (no DB table) -------------------------------------------------
  getAgentUnits: publicProcedure.query(() => []),
  createAgentUnit: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateAgentUnitStatus: protectedProcedure.input(z.any()).mutation(() => successResponse),
  batchImportAgentUnits: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getAgentUnitStatistics: publicProcedure.query(() => ({ statistics: {} })),
  getAgentUnitImportHistory: publicProcedure.query(() => []),

  // --- Approval Chain Configs (no DB table) --------------------------------------
  getApprovalChainConfigs: publicProcedure.query(() => []),
  createApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // --- UWB Positioning (no DB table) ---------------------------------------------
  getAllUWBTags: publicProcedure.query(() => []),
  getPositionHistory: publicProcedure.input(z.any()).query(() => []),
  getWorkshopOverview: publicProcedure.query(() => ({ overview: {} })),

  // --- Calibration (no DB table) -------------------------------------------------
  executeCalibrationCheck: protectedProcedure.input(z.any()).mutation(() => successResponse),
  recordCalibrationData: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getCalibrationTrend: publicProcedure.input(z.any()).query(() => []),

  // --- Cleaning Strategies (no DB table) -----------------------------------------
  getAllCleaningStrategies: publicProcedure.query(() => []),

  // --- Toothpaste Test (no DB table) ---------------------------------------------
  getToothpasteTestRecords: publicProcedure.query(() => []),
  getToothpasteTestStatistics: publicProcedure.query(() => ({ statistics: {} })),
  getToothpasteTestTrend: publicProcedure.query(() => []),
  getToothpasteTestCount: publicProcedure.query(() => ({ count: 0 })),
  getToothpasteFeatureTypeStats: publicProcedure.query(() => ({ stats: {} })),
  exportToothpasteTestReport: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),

  // --- Technical Proposals (no DB table) -----------------------------------------
  generateTechnicalProposal: protectedProcedure.input(z.any()).mutation(() => ({ proposal: "" })),
  generateIOList: protectedProcedure.input(z.any()).mutation(() => ({ ioList: [] })),
  analyzePartFeatures: protectedProcedure.input(z.any()).mutation(() => []),
});
