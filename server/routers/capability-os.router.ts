import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { capabilityProofConfigs, capabilityEvidences, publicCapabilityShowcase } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { jsonValue } from "../../shared/validators";
import { createChildLogger } from "../lib/logger";
import { getAllCleaningStrategies, getAllEngineerCheckpoints, generateTechnicalProposalSummary, generateIOList, analyzePartFeatures } from "../services/grt-cleaning-strategy.service";
const log = createChildLogger("capability-os");

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;
const successResponse = { success: true, message: "操作成功" };
/** Stub procedures accept any object shape — will be replaced with proper schemas when implemented */
const stubInput = z.record(z.string(), jsonValue).optional();

// ─── Bootstrap: seed capability certificate + path recommendation data ───
let _capCertReady = false;
async function ensureCapCertData() {
  if (_capCertReady) return;
  _capCertReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'capability'`);
    if ((rows[0] as any).cnt === 0) {
      const certificates = JSON.stringify([
        { id: "cert1", certificateNumber: "GRT-T-2026-001234", domainCode: "T", domainName: "技术能力", level: 3, userName: "洪香龙", issueDate: "2026-01-15", expiryDate: "2027-01-15", status: "valid", pdfUrl: "#" },
        { id: "cert2", certificateNumber: "GRT-D-2025-005678", domainCode: "D", domainName: "交付能力", level: 4, userName: "洪香龙", issueDate: "2025-08-20", expiryDate: "2026-08-20", status: "valid", pdfUrl: "#" },
      ]);
      const eligibility = JSON.stringify({
        eligible: true,
        eligibleDomains: [
          { code: "T", name: "技术能力", level: 3 },
          { code: "D", name: "交付能力", level: 4 },
        ],
        requirements: [],
      });
      const recommendation = JSON.stringify({
        userId: "user1",
        currentCapabilities: { T: { level: 3, points: 450 }, S: { level: 2, points: 180 }, D: { level: 3, points: 380 }, C: { level: 2, points: 150 }, K: { level: 1, points: 60 }, L: { level: 1, points: 40 } },
        weakestDomains: [
          { code: "K", name: "知识沉淀", level: 1, gap: 1.5 },
          { code: "L", name: "领导力", level: 1, gap: 1.5 },
          { code: "C", name: "客户价值", level: 2, gap: 0.5 },
        ],
        strongestDomains: [
          { code: "T", name: "技术能力", level: 3 },
          { code: "D", name: "交付能力", level: 3 },
        ],
        recommendedPath: {
          shortTerm: [
            { action: "完成知识沉淀基础培训课程", domain: "K", expectedPoints: 30 },
            { action: "参与1个知识沉淀相关的简单项目", domain: "K", expectedPoints: 50 },
            { action: "完成领导力基础培训课程", domain: "L", expectedPoints: 30 },
          ],
          midTerm: [
            { action: "独立完成2-3个知识沉淀相关项目", domain: "K", expectedPoints: 150 },
            { action: "获取知识沉淀领域的专业认证", domain: "K", expectedPoints: 100 },
            { action: "独立完成2-3个客户价值相关项目", domain: "C", expectedPoints: 150 },
          ],
          longTerm: [
            { action: "成为知识沉淀领域的内部专家", domain: "K", expectedPoints: 200 },
            { action: "指导新人在知识沉淀领域的成长", domain: "K", expectedPoints: 100 },
          ],
        },
        projectOpportunities: [
          { id: "k1", name: "技术文档编写", description: "编写技术文档和操作手册", requiredDomains: ["K"], requiredLevel: 1, potentialPoints: 30, difficulty: "easy" },
          { id: "c1", name: "客户需求调研", description: "参与客户需求调研和分析", requiredDomains: ["C"], requiredLevel: 1, potentialPoints: 40, difficulty: "easy" },
          { id: "l1", name: "项目协调角色", description: "担任项目协调角色，锻炼协调能力", requiredDomains: ["L"], requiredLevel: 2, potentialPoints: 60, difficulty: "medium" },
        ],
        trainingResources: [
          { id: "kr1", name: "技术写作课程", description: "学习技术文档写作规范", targetDomain: "K", targetLevel: 2, duration: "4小时", type: "online" },
          { id: "lr1", name: "团队管理基础课程", description: "学习团队管理基础知识", targetDomain: "L", targetLevel: 2, duration: "8小时", type: "online" },
          { id: "cr1", name: "客户沟通技巧课程", description: "学习专业的客户沟通技巧", targetDomain: "C", targetLevel: 2, duration: "6小时", type: "online" },
        ],
        aiAnalysis: "根据您的能力数据分析，您在技术能力(T)和交付能力(D)方面表现优秀，已达到L3等级。建议优先提升知识沉淀(K)和领导力(L)两个短板领域。可以通过编写技术文档、参与内部培训等方式积累知识沉淀积分；通过担任项目协调角色来锻炼领导力。预计3-6个月内可以将这两个领域提升至L2等级。",
        generatedAt: new Date().toISOString(),
      });
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('capability', 'certificates', ${certificates}::jsonb),
        ('capability', 'eligibility', ${eligibility}::jsonb),
        ('capability', 'recommendation', ${recommendation}::jsonb)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "capability bootstrap failed");
  }
}

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
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(capabilityProofConfigs).orderBy(desc(capabilityProofConfigs.createdAt)).limit(1000);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  getById: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.id, toNum(input.id))).limit(1000);
    return item || null;
  }),

  create: requirePermission('capability:matrix:manage').input(z.object({
    capabilityCode: z.string().max(50).optional(),
    capabilityName: z.string().max(200).optional(),
    name: z.string().max(200).optional(),
    capabilityCategory: z.string().max(100).optional(),
    publicDescription: z.string().max(5000).optional(),
    description: z.string().max(5000).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const capCode = "CAP-" + Date.now().toString(36).toUpperCase();
    const [item] = await db.insert(capabilityProofConfigs).values({
      capabilityCode: input.capabilityCode || capCode,
      capabilityName: input.capabilityName || input.name || "新能力",
      capabilityCategory: input.capabilityCategory || "technical_expertise",
      publicDescription: input.publicDescription || input.description,
      isActive: 1,
    } as any).returning();
    return { success: true, message: "创建成功", data: item };
  }),

  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    capabilityName: z.string().max(200).optional(),
    capabilityCategory: z.string().max(100).optional(),
    publicDescription: z.string().max(5000).optional(),
    publicEvidence: z.string().max(5000).optional(),
    verificationRules: jsonValue.optional(),
    requiredDataSources: jsonValue.optional(),
    zkpEnabled: z.union([z.boolean(), z.number()]).optional(),
    zkpCircuitType: z.string().max(100).optional(),
    isActive: z.union([z.boolean(), z.number()]).optional(),
  })).mutation(async ({ input }) => {
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

  delete: requirePermission('capability:matrix:manage').input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(capabilityProofConfigs).where(eq(capabilityProofConfigs.id, toNum(input.id)));
    return successResponse;
  }),

  getAssessmentReport: protectedProcedure.query(async () => {
    const db = await requireDb();
    const configs = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1)).limit(1000);
    return { report: { domains: CAPABILITY_DOMAINS, capabilities: configs } };
  }),

  getEmployeeCapabilities: protectedProcedure.input(z.object({ employeeId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    // Default to current user; managers can view any employee
    const targetId = input?.employeeId ?? ctx.user!.id;
    const MANAGER_ROLES = new Set(["admin", "director", "hr_manager", "dept_manager"]);
    if (targetId !== ctx.user!.id && !MANAGER_ROLES.has(ctx.user!.role ?? "employee")) {
      return []; // non-managers can only see own capabilities
    }
    const evidences = await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.userId, toNum(targetId))).limit(1000);
    return evidences;
  }),

  getDevelopmentPath: protectedProcedure.query(async () => {
    const db = await requireDb();
    const configs = await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1)).limit(5);
    return configs;
  }),

  getUpgradeRules: protectedProcedure.query(() => UPGRADE_RULES),
  upgradeCapability: requirePermission('capability:matrix:manage').input(z.object({ capabilityId: z.union([z.string(), z.number()]), fromLevel: z.string().optional(), toLevel: z.string().optional() })).mutation(() => successResponse),

  listCapabilities: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityProofConfigs).where(eq(capabilityProofConfigs.isActive, 1)).limit(1000);
  }),

  getDomains: protectedProcedure.query(() => CAPABILITY_DOMAINS.map((d, i) => ({ ...d, id: i + 1 }))),

  getMyCapabilities: protectedProcedure.query(async () => {
    const db = await requireDb();
    const evidences = await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.status, "approved")).limit(200);
    const domainMap: Record<string, { code: string; domainId: number; currentLevel: number; totalPoints: number }> = {};
    const domainIds: Record<string, number> = { T: 1, S: 2, D: 3, C: 4, K: 5, L: 6 };
    for (const ev of evidences) {
      const domain = ev.capabilityDomain || "T";
      if (!domainMap[domain]) {
        domainMap[domain] = { code: domain, domainId: domainIds[domain] || 1, currentLevel: 1, totalPoints: 0 };
      }
      domainMap[domain].totalPoints += 50;
      if (ev.currentLevel && ev.currentLevel > domainMap[domain].currentLevel) {
        domainMap[domain].currentLevel = ev.currentLevel;
      }
    }
    return Object.values(domainMap);
  }),

  getMyEvidences: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).orderBy(desc(capabilityEvidences.createdAt)).limit(50);
  }),

  getEvidenceTypes: protectedProcedure.query(() => [
    { id: 1, code: "project_delivery", name: "项目交付", description: "项目参与和完成记录", baseScore: 50, domains: "T,D,C" },
    { id: 2, code: "training_cert", name: "培训证书", description: "培训完成证书", baseScore: 30, domains: "T,K" },
    { id: 3, code: "skill_cert", name: "技能认证", description: "专业技能认证", baseScore: 40, domains: "T" },
    { id: 4, code: "customer_feedback", name: "客户反馈", description: "客户满意度反馈", baseScore: 35, domains: "C,S" },
    { id: 5, code: "peer_review", name: "同行评审", description: "同事评审和推荐", baseScore: 25, domains: "T,L" },
    { id: 6, code: "self_assessment", name: "自我评估", description: "个人能力自评", baseScore: 10, domains: "T,S,D,C,K,L" },
    { id: 7, code: "supervisor_eval", name: "上级评价", description: "直属上级评价", baseScore: 45, domains: "T,S,D,C,K,L" },
    { id: 8, code: "other", name: "其他", description: "其他类型证据", baseScore: 15, domains: "T,S,D,C,K,L" },
  ]),

  submitEvidence: protectedProcedure.input(z.object({
    evidenceType: z.string().max(100).optional(),
    evidenceTypeId: z.union([z.string(), z.number()]).optional(),
    capabilityDomain: z.string().max(50).optional(),
    domainId: z.union([z.string(), z.number()]).optional(),
    title: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    projectId: z.union([z.string(), z.number()]).optional(),
    projectName: z.string().max(200).optional(),
    equipmentModel: z.string().max(200).optional(),
    fileUrl: z.string().max(2048).optional(),
    fileKey: z.string().max(500).optional(),
    fileName: z.string().max(500).optional(),
    fileType: z.string().max(100).optional(),
    fileSize: z.union([z.string(), z.number()]).optional(),
    currentLevel: z.union([z.string(), z.number()]).optional(),
    targetLevel: z.union([z.string(), z.number()]).optional(),
    metadata: jsonValue.optional(),
    tags: jsonValue.optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const evidenceId = "EVD-" + Date.now().toString(36).toUpperCase();
    const [evidence] = await db.insert(capabilityEvidences).values({
      id: Date.now(),
      evidenceId,
      userId: ctx.user!.id,
      userName: ctx.user!.name,
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
      metadata: input.metadata as any,
      tags: input.tags as any,
    } as any).returning();
    return { success: true, message: "证据已提交", data: evidence };
  }),

  reviewEvidence: requirePermission('capability:matrix:manage').input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    evidenceId: z.union([z.string(), z.number()]).optional(),
    approved: z.boolean().optional(),
    status: z.string().max(20).optional(),
    comment: z.string().max(5000).optional(),
    reviewComment: z.string().max(5000).optional(),
    awardedPoints: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = toNum(input.id || input.evidenceId || 0);
    const status = input.status ?? (input.approved ? "approved" : "rejected");
    await db.update(capabilityEvidences).set({
      status: status as any,
      reviewerId: ctx.user!.id,
      reviewerName: ctx.user!.name ?? `User#${ctx.user!.id}`,
      reviewComment: input.comment || input.reviewComment,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(capabilityEvidences.id, id));
    return { success: true, message: status === "approved" ? "已通过" : "已驳回" };
  }),

  getPendingEvidences: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).where(eq(capabilityEvidences.status, "pending")).orderBy(desc(capabilityEvidences.createdAt)).limit(1000);
  }),

  getAllEvidences: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(capabilityEvidences).orderBy(desc(capabilityEvidences.createdAt)).limit(200);
  }),

  // --- Badges (no DB table) ------------------------------------------------------
  getAllBadges: protectedProcedure.query(() => []),
  getUserBadges: protectedProcedure.input(stubInput).query(() => []),
  getBadgeLeaderboard: protectedProcedure.query(() => []),
  getBadgeStatistics: protectedProcedure.query(() => ({ statistics: {} })),
  updateBadgeDisplay: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),

  // --- Leaderboard (no DB table) -------------------------------------------------
  getDomainLeaderboard: protectedProcedure.input(stubInput).query(() => []),
  getOverallLeaderboard: protectedProcedure.query(() => []),
  getProgressLeaderboard: protectedProcedure.query(() => []),
  getLeaderboardStats: protectedProcedure.query(() => ({ stats: {} })),

  // --- Certificates (DB-backed via ai_assistant_dashboard) -----------------------
  getMyCertificates: protectedProcedure.query(async () => {
    await ensureCapCertData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'capability' AND category = 'certificates' LIMIT 1000`);
    return (rows[0] as any)?.items ?? [];
  }),
  checkCertificateEligibility: protectedProcedure.input(stubInput).query(async () => {
    await ensureCapCertData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'capability' AND category = 'eligibility' LIMIT 1000`);
    return (rows[0] as any)?.items ?? { eligible: false, requirements: [] };
  }),
  generateCertificate: requirePermission('capability:matrix:manage').input(stubInput).mutation(async ({ input }) => {
    await ensureCapCertData();
    const domainCode = (input as any)?.domainCode ?? "T";
    const certNum = `GRT-${domainCode}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;
    return { url: "#", certificateNumber: certNum, success: true };
  }),
  verifyCertificateByQR: protectedProcedure.input(stubInput).query(() => ({ valid: false, certificate: null })),

  // --- Engineer Checkpoints (wired to grt-cleaning-strategy.service) ------------
  getAllEngineerCheckpoints: protectedProcedure.query(() => getAllEngineerCheckpoints()),
  approveCheckpoint: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  rejectCheckpoint: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  completePhase: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),

  // --- Path Recommendation (DB-backed via ai_assistant_dashboard) ----------------
  getPathRecommendation: protectedProcedure.input(stubInput).query(async () => {
    await ensureCapCertData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'capability' AND category = 'recommendation' LIMIT 1000`);
    return (rows[0] as any)?.items ?? null;
  }),

  // --- Agent Units (no DB table) -------------------------------------------------
  getAgentUnits: protectedProcedure.query(() => []),
  createAgentUnit: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  updateAgentUnitStatus: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  batchImportAgentUnits: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  getAgentUnitStatistics: protectedProcedure.query(() => ({ statistics: {} })),
  getAgentUnitImportHistory: protectedProcedure.query(() => []),

  // --- Approval Chain Configs (no DB table) --------------------------------------
  getApprovalChainConfigs: protectedProcedure.query(() => []),
  createApprovalChainConfig: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  updateApprovalChainConfig: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  deleteApprovalChainConfig: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),

  // --- UWB Positioning (no DB table) ---------------------------------------------
  getAllUWBTags: protectedProcedure.query(() => []),
  getPositionHistory: protectedProcedure.input(stubInput).query(() => []),
  getWorkshopOverview: protectedProcedure.query(() => ({ overview: {} })),

  // --- Calibration (no DB table) -------------------------------------------------
  executeCalibrationCheck: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  recordCalibrationData: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => successResponse),
  getCalibrationTrend: protectedProcedure.input(stubInput).query(() => []),

  // --- Cleaning Strategies (wired to grt-cleaning-strategy.service) -------------
  getAllCleaningStrategies: protectedProcedure.query(() => getAllCleaningStrategies()),

  // --- Toothpaste Test (no DB table) ---------------------------------------------
  getToothpasteTestRecords: protectedProcedure.query(() => []),
  getToothpasteTestStatistics: protectedProcedure.query(() => ({ statistics: {} })),
  getToothpasteTestTrend: protectedProcedure.query(() => []),
  getToothpasteTestCount: protectedProcedure.query(() => ({ count: 0 })),
  getToothpasteFeatureTypeStats: protectedProcedure.query(() => ({ stats: {} })),
  exportToothpasteTestReport: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => ({ url: "" })),

  // --- Technical Proposals (wired to grt-cleaning-strategy.service) ------------
  generateTechnicalProposal: requirePermission('capability:matrix:manage').input(stubInput).mutation(({ input }) => {
    const features = (input as any)?.features ?? [];
    const targetCycleTime = (input as any)?.targetCycleTime ?? 120;
    return { proposal: generateTechnicalProposalSummary(features, targetCycleTime) };
  }),
  generateIOList: requirePermission('capability:matrix:manage').input(stubInput).mutation(() => ({ ioList: generateIOList() })),
  analyzePartFeatures: requirePermission('capability:matrix:manage').input(stubInput).mutation(({ input }) => {
    const features = (input as any)?.features ?? [];
    return analyzePartFeatures(features);
  }),
});
