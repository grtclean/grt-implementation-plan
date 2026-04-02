/**
 * Employee Consultant Agent Router
 *
 * 员工顾问智能体 — 基于"人设×组织设"理论
 * 高人设 → 正向输入20-30% (肯定、赋能、授权)
 * 低人设 → 干预+安抚+方法指导+重建信心
 *
 * 5 sub-routers: persona | outputs | strategy | sessions | engine
 */
import { z } from "zod";
import { eq, and, desc, sql, asc, gte, lte } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../permissions/middleware";
import { db } from "../db";
import {
  employeePersonaProfiles,
  consultantAgentOutputs,
  consultantStrategyConfigs,
  consultantAgentSessions,
  consultantAgentMessages,
} from "../../drizzle/consultant-agent-schema";

// ── Helper: build system prompt based on persona tier ──
function buildConsultantSystemPrompt(persona: any, strategy: any, goals: any) {
  const tier = persona?.personaTier || "mid";
  const name = persona?.employeeName || "同事";
  const dept = persona?.department || "";
  const position = persona?.position || "";
  const aspirations = persona?.careerAspirations || "";
  const commitments = (persona?.interviewCommitmentsJson as any[]) || [];
  const yearlyPerf = (persona?.yearlyPerformanceSummaryJson as any[]) || [];
  const traits = persona?.personalityTraitsJson as any;
  const commStyle = persona?.communicationStyle || "balanced";
  const fbMode = persona?.preferredFeedbackMode || "mixed";
  const resilience = persona?.emotionalResilience || "moderate";

  const goalDims = goals?.dimensions || [];
  const goalAgreement = goals?.agreement;

  // Tier-specific coaching philosophy
  const tierPhilosophy: Record<string, string> = {
    high: `${name}是高人设员工(${persona?.personaScore}/100)。团队和客户高度认同TA。你的角色是"赋能型教练"：
- 给予充分肯定和信任，强化正向循环
- 主动提供高价值资源和人脉连接建议
- 鼓励TA挑战更高目标，输出领导力
- 当TA遇到困难时，以平等姿态协助分析，而非指导
- 每次互动注入20-30%的额外正向能量`,

    mid: `${name}是中人设员工(${persona?.personaScore}/100)。有潜力但需要持续引导。你的角色是"引导型伙伴"：
- 平衡肯定与建设性反馈(7:3比例)
- 主动提供方法论和流程建议
- 帮助TA建立与团队的正向互动习惯
- 在TA完成小目标时及时庆祝
- 逐步提升TA的自信心和团队影响力`,

    low: `${name}是低人设员工(${persona?.personaScore}/100)。需要重点关注和支持。你的角色是"安抚型守护者"：
- 优先安抚情绪，理解困难处境
- 拆解大目标为小步骤，降低焦虑感
- 每次对话开头先找到值得肯定的点
- 不批评，只提供具体可执行的建议
- 主动帮助安排工作优先级，减轻压力
- 关注心理健康信号，必要时建议寻求帮助`,
  };

  return `你是GRT杰瑞德自动化公司的"员工顾问智能体"，专属服务于${name}(${dept} ${position})。

## 核心理念
"人设×组织设"理论：员工的年度目标达成程度，取决于TA的人设(motivation)是否在高水平上与团队互动，取得内外客户的高度认同、同事及主管的肯定。高人设员工每天工作中会获得外界20%-30%的有效正向输入；低人设员工则得不到甚至得到负面输入。你的使命是帮助${name}建立和维持高人设。

## 人设诊断
${tierPhilosophy[tier] || tierPhilosophy.mid}

## 沟通风格适配
- 沟通偏好: ${commStyle === "direct" ? "直接高效" : commStyle === "supportive" ? "温暖支持" : commStyle === "analytical" ? "数据驱动" : "平衡兼顾"}
- 反馈模式: ${fbMode === "praise_first" ? "先肯定后建议" : fbMode === "direct_honest" ? "直接坦诚" : fbMode === "data_driven" ? "用数据说话" : "综合灵活"}
- 情绪韧性: ${resilience === "high" ? "韧性强，可直接挑战" : resilience === "low" ? "韧性弱，需要温和铺垫" : "适中，注意节奏"}
${traits?.strengths?.length ? `- 优势: ${traits.strengths.join("、")}` : ""}
${traits?.growthAreas?.length ? `- 成长领域: ${traits.growthAreas.join("、")}` : ""}

## 面试承诺
${commitments.length > 0 ? commitments.map((c: any) => `- [${c.category}] ${c.commitment} (${c.status || "进行中"})`).join("\n") : "暂无记录"}

## 历年表现
${yearlyPerf.length > 0 ? yearlyPerf.map((y: any) => `- ${y.year}年: ${y.overallGrade} (奖金${y.bonusMonths}月)${y.keyAchievements?.length ? " 亮点: " + y.keyAchievements.join("、") : ""}${y.keyGaps?.length ? " 待改进: " + y.keyGaps.join("、") : ""}`).join("\n") : "首年入职"}

## ${new Date().getFullYear()}年度目标
${goalAgreement ? `状态: ${goalAgreement.status} | 预估奖金: ${goalAgreement.projectedBonusMonths}月` : "尚未制定"}
${goalDims.length > 0 ? goalDims.map((d: any) => `- ${d.dimensionName} (${d.weight}%): 当前${d.currentScore}/100`).join("\n") : ""}
${aspirations ? `\n## 职业愿望\n${aspirations}` : ""}

## 输出规范
1. 每次回复控制在300字以内，简洁有力
2. 根据人设等级调整语气：高人设→平等赋能，中人设→温和引导，低人设→温暖安抚
3. 每次互动至少包含一个具体可执行的建议
4. 适时引导使用系统内的智能助手完成具体工作
5. 关注目标进度，及时提醒检查点和截止日期
6. 庆祝每一个小成就，强化正向行为

## 可以帮助的领域
- 📋 每日工作安排与优先级建议
- 📅 每周工作计划与目标拆解
- 💬 情绪疏导与工作动力激发
- 🔧 方法论建议与流程推荐
- 📝 会议纪要整理与跟进提醒
- 🤖 引导使用AI工具提升效率
- 🎯 目标进度追踪与偏差预警
- 🏆 里程碑庆祝与正向反馈`;
}

// ══════════════════════════════════════════════════════
// Sub-router 1: Persona Profile
// ══════════════════════════════════════════════════════
const personaRouter = router({
  get: protectedProcedure
    .input(z.object({ employeeId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const [profile] = await db.select().from(employeePersonaProfiles)
        .where(and(eq(employeePersonaProfiles.employeeId, input.employeeId), eq(employeePersonaProfiles.year, year)))
        .limit(1);
      return profile ?? null;
    }),

  upsert: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      employeeId: z.number(),
      employeeName: z.string(),
      employeeCode: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      year: z.number().optional(),
      interviewCommitmentsJson: z.any().optional(),
      hireDate: z.string().optional(),
      interviewNotes: z.string().optional(),
      personaScore: z.string().optional(),
      motivationScore: z.string().optional(),
      teamInteractionScore: z.string().optional(),
      clientRecognitionScore: z.string().optional(),
      peerApprovalScore: z.string().optional(),
      managerConfidenceScore: z.string().optional(),
      personalityTraitsJson: z.any().optional(),
      communicationStyle: z.string().optional(),
      preferredFeedbackMode: z.string().optional(),
      emotionalResilience: z.string().optional(),
      yearlyPerformanceSummaryJson: z.any().optional(),
      careerAspirations: z.string().optional(),
      longTermGoal: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const year = input.year ?? new Date().getFullYear();
      const score = parseFloat(input.personaScore || "50");
      const tier = score >= 70 ? "high" : score >= 40 ? "mid" : "low";

      const existing = await db.select({ id: employeePersonaProfiles.id })
        .from(employeePersonaProfiles)
        .where(and(eq(employeePersonaProfiles.employeeId, input.employeeId), eq(employeePersonaProfiles.year, year)))
        .limit(1);

      const data = {
        ...input,
        year,
        personaTier: tier,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
        updatedBy: (ctx.user as any)?.id ?? 0,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        const [updated] = await db.update(employeePersonaProfiles)
          .set(data).where(eq(employeePersonaProfiles.id, existing[0].id)).returning();
        return updated;
      }
      const [created] = await db.insert(employeePersonaProfiles).values(data).returning();
      return created;
    }),

  listByDepartment: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ year: z.number().optional(), department: z.string().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const conditions = [eq(employeePersonaProfiles.year, year)];
      if (input.department) conditions.push(eq(employeePersonaProfiles.department, input.department));

      return db.select().from(employeePersonaProfiles)
        .where(and(...conditions))
        .orderBy(desc(employeePersonaProfiles.personaScore))
        .limit(200);
    }),

  tierDistribution: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const all = await db.select({
        tier: employeePersonaProfiles.personaTier,
        count: sql<number>`count(*)`,
      }).from(employeePersonaProfiles)
        .where(eq(employeePersonaProfiles.year, year))
        .groupBy(employeePersonaProfiles.personaTier);
      return all;
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 2: Agent Outputs (推送/日报/周计划)
// ══════════════════════════════════════════════════════
const outputsRouter = router({
  list: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      outputType: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(consultantAgentOutputs.employeeId, input.employeeId)];
      if (input.outputType) conditions.push(eq(consultantAgentOutputs.outputType, input.outputType));

      return db.select().from(consultantAgentOutputs)
        .where(and(...conditions))
        .orderBy(desc(consultantAgentOutputs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getLatestDigest: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const [digest] = await db.select().from(consultantAgentOutputs)
        .where(and(
          eq(consultantAgentOutputs.employeeId, input.employeeId),
          eq(consultantAgentOutputs.outputType, "daily_digest"),
        ))
        .orderBy(desc(consultantAgentOutputs.createdAt))
        .limit(1);
      return digest ?? null;
    }),

  markRead: protectedProcedure
    .input(z.object({ outputId: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(consultantAgentOutputs)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(consultantAgentOutputs.id, input.outputId));
      return { success: true };
    }),

  submitFeedback: protectedProcedure
    .input(z.object({ outputId: z.number(), rating: z.number().min(1).max(5), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(consultantAgentOutputs)
        .set({ feedbackRating: input.rating, feedbackNote: input.note ?? null })
        .where(eq(consultantAgentOutputs.id, input.outputId));
      return { success: true };
    }),

  // ── 生成每日简报 (由 engine 调用) ──
  generateDailyDigest: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      // Load persona
      const year = new Date().getFullYear();
      const [persona] = await db.select().from(employeePersonaProfiles)
        .where(and(eq(employeePersonaProfiles.employeeId, input.employeeId), eq(employeePersonaProfiles.year, year)))
        .limit(1);

      if (!persona) return { error: "No persona profile found" };

      const tier = persona.personaTier || "mid";
      const name = persona.employeeName;

      // Determine strategy
      const toneMap: Record<string, string> = {
        high: "warm_encouraging", mid: "professional_supportive", low: "empathetic_calming",
      };
      const strategyMap: Record<string, string> = {
        high: "positive_reinforcement", mid: "gentle_guidance", low: "urgent_intervention",
      };

      // Build digest content based on persona tier
      const today = new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" });
      let content = "";

      if (tier === "high") {
        content = `☀️ ${name}，早上好！${today}\n\n`;
        content += `你最近的表现非常出色，团队对你的贡献有目共睹。今天建议：\n\n`;
        content += `📌 继续保持高效节奏，你的工作质量是团队标杆\n`;
        content += `💡 今天可以考虑分享一个你的工作心得给团队\n`;
        content += `🎯 距离季度检查点还有一段时间，你的进度非常健康\n\n`;
        content += `有什么需要帮忙的随时告诉我！`;
      } else if (tier === "mid") {
        content = `🌅 ${name}，新的一天开始了！${today}\n\n`;
        content += `今天是推进目标的好机会。建议重点关注：\n\n`;
        content += `📋 优先处理最重要的1-2件事，不必面面俱到\n`;
        content += `🤝 今天尝试主动找一位同事交流工作想法\n`;
        content += `📝 下班前花5分钟记录今日进展和明天计划\n\n`;
        content += `记住，每天进步一点点就是最好的节奏。加油！`;
      } else {
        content = `🌤️ ${name}，今天也是全新的开始。${today}\n\n`;
        content += `不用急，我们一步一步来。今天只需要做好一件事：\n\n`;
        content += `✅ 选择今天最容易完成的一项任务开始\n`;
        content += `💬 如果遇到困难，可以直接问我，我来帮你理清思路\n`;
        content += `🌱 你每天都在成长，只是有时候自己感觉不到\n\n`;
        content += `我一直在这里，需要任何帮助随时说。`;
      }

      const [output] = await db.insert(consultantAgentOutputs).values({
        employeeId: input.employeeId,
        outputType: "daily_digest",
        channel: "in_system",
        title: `${today} — 每日简报`,
        content,
        personaTierAtTime: tier,
        strategyApplied: strategyMap[tier],
        toneProfile: toneMap[tier],
        scheduledFor: new Date(),
        deliveredAt: new Date(),
      }).returning();

      return output;
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 3: Strategy Config
// ══════════════════════════════════════════════════════
const strategyRouter = router({
  list: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .query(async () => {
      return db.select().from(consultantStrategyConfigs).orderBy(asc(consultantStrategyConfigs.personaTier));
    }),

  upsert: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      personaTier: z.string(),
      strategyName: z.string(),
      description: z.string().optional(),
      dailyDigestEnabled: z.boolean().optional(),
      weeklyPlanEnabled: z.boolean().optional(),
      emotionalSupportFrequency: z.string().optional(),
      proactiveGuidanceLevel: z.string().optional(),
      toneDefault: z.string().optional(),
      contentMixJson: z.any().optional(),
      systemPromptOverride: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.select({ id: consultantStrategyConfigs.id })
        .from(consultantStrategyConfigs)
        .where(eq(consultantStrategyConfigs.personaTier, input.personaTier))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db.update(consultantStrategyConfigs)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(consultantStrategyConfigs.id, existing[0].id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(consultantStrategyConfigs).values(input).returning();
      return created;
    }),

  seedDefaults: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .mutation(async () => {
      const defaults = [
        {
          personaTier: "high", strategyName: "赋能型教练",
          description: "高人设员工：肯定、赋能、授权、挑战更高目标",
          toneDefault: "warm_encouraging",
          proactiveGuidanceLevel: "minimal",
          emotionalSupportFrequency: "rarely",
          contentMixJson: { praise: 35, taskGuidance: 15, methodAdvice: 20, processRec: 10, emotionalSupport: 5, aiToolGuide: 15 },
        },
        {
          personaTier: "mid", strategyName: "引导型伙伴",
          description: "中人设员工：7:3肯定与建设性反馈，逐步提升",
          toneDefault: "professional_supportive",
          proactiveGuidanceLevel: "moderate",
          emotionalSupportFrequency: "twice_weekly",
          contentMixJson: { praise: 25, taskGuidance: 25, methodAdvice: 20, processRec: 15, emotionalSupport: 10, aiToolGuide: 5 },
        },
        {
          personaTier: "low", strategyName: "安抚型守护者",
          description: "低人设员工：情绪安抚、小步前进、无批评、持续鼓励",
          toneDefault: "empathetic_calming",
          proactiveGuidanceLevel: "aggressive",
          emotionalSupportFrequency: "daily",
          contentMixJson: { praise: 30, taskGuidance: 15, methodAdvice: 10, processRec: 10, emotionalSupport: 30, aiToolGuide: 5 },
        },
      ];

      for (const d of defaults) {
        const existing = await db.select({ id: consultantStrategyConfigs.id })
          .from(consultantStrategyConfigs)
          .where(eq(consultantStrategyConfigs.personaTier, d.personaTier))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(consultantStrategyConfigs).values(d);
        }
      }
      return { seeded: defaults.length };
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 4: Chat Sessions (双向对话)
// ══════════════════════════════════════════════════════
const sessionsRouter = router({
  list: protectedProcedure
    .input(z.object({ employeeId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return db.select().from(consultantAgentSessions)
        .where(eq(consultantAgentSessions.employeeId, input.employeeId))
        .orderBy(desc(consultantAgentSessions.lastMessageAt))
        .limit(input.limit);
    }),

  create: protectedProcedure
    .input(z.object({ employeeId: z.number(), topic: z.string().optional() }))
    .mutation(async ({ input }) => {
      const sessionId = `consultant-${input.employeeId}-${Date.now()}`;
      const [session] = await db.insert(consultantAgentSessions).values({
        sessionId,
        employeeId: input.employeeId,
        topic: input.topic || "general",
      }).returning();
      return session;
    }),

  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.string(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return db.select().from(consultantAgentMessages)
        .where(eq(consultantAgentMessages.sessionId, input.sessionId))
        .orderBy(asc(consultantAgentMessages.createdAt))
        .limit(input.limit);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      employeeId: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Save user message
      await db.insert(consultantAgentMessages).values({
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
      });

      // Load persona + goals for context
      const year = new Date().getFullYear();
      const [persona] = await db.select().from(employeePersonaProfiles)
        .where(and(eq(employeePersonaProfiles.employeeId, input.employeeId), eq(employeePersonaProfiles.year, year)))
        .limit(1);

      // Load conversation history
      const history = await db.select().from(consultantAgentMessages)
        .where(eq(consultantAgentMessages.sessionId, input.sessionId))
        .orderBy(asc(consultantAgentMessages.createdAt))
        .limit(20);

      // Load annual goals
      let goals: any = { agreement: null, dimensions: [] };
      try {
        const { annualGoalAgreements, annualGoalDimensions } = await import("../../drizzle/annual-goal-incentive-schema");
        const [agreement] = await db.select().from(annualGoalAgreements)
          .where(and(eq(annualGoalAgreements.employeeId, input.employeeId), eq(annualGoalAgreements.year, year)))
          .limit(1);
        if (agreement) {
          const dimensions = await db.select().from(annualGoalDimensions)
            .where(eq(annualGoalDimensions.agreementId, agreement.id));
          goals = { agreement, dimensions };
        }
      } catch { /* annual-goal tables may not exist yet */ }

      // Build system prompt
      const systemPrompt = buildConsultantSystemPrompt(persona, null, goals);

      // Call LLM
      let reply = "";
      try {
        const { invokeLLM } = await import("../_core/llm");
        const messages = history.map((m: any) => ({
          role: m.role === "consultant" ? "assistant" : m.role,
          content: m.content,
        }));

        const result = await invokeLLM({
          system: systemPrompt,
          messages: [...messages, { role: "user" as const, content: input.content }],
        });
        reply = typeof result === "string" ? result : (result as any)?.content || "抱歉，暂时无法回复。";
      } catch (err: any) {
        reply = `我理解你的问题。目前AI服务暂时不可用，但你可以：\n1. 查看"目标跟踪看板"了解进度\n2. 在"年度目标协定"中查看具体维度\n3. 联系主管进行面对面沟通\n\n我会在服务恢复后第一时间帮助你。`;
      }

      // Save consultant reply
      const [msg] = await db.insert(consultantAgentMessages).values({
        sessionId: input.sessionId,
        role: "consultant",
        content: reply,
      }).returning();

      // Update session
      await db.update(consultantAgentSessions).set({
        messageCount: sql`${consultantAgentSessions.messageCount} + 2`,
        lastMessageAt: new Date(),
      }).where(eq(consultantAgentSessions.sessionId, input.sessionId));

      return { reply, messageId: msg.id };
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 5: Engine (批量生成/分析)
// ══════════════════════════════════════════════════════
const engineRouter = router({
  // 批量生成所有员工的每日简报
  generateAllDailyDigests: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .mutation(async () => {
      const year = new Date().getFullYear();
      const profiles = await db.select().from(employeePersonaProfiles)
        .where(eq(employeePersonaProfiles.year, year))
        .limit(200);

      let generated = 0;
      for (const p of profiles) {
        const tier = p.personaTier || "mid";
        const name = p.employeeName;
        const today = new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" });

        const toneMap: Record<string, string> = { high: "warm_encouraging", mid: "professional_supportive", low: "empathetic_calming" };
        const strategyMap: Record<string, string> = { high: "positive_reinforcement", mid: "gentle_guidance", low: "urgent_intervention" };

        // Simple template-based digest (LLM version would be richer)
        let content = tier === "high"
          ? `☀️ ${name}，${today}！你的持续优秀表现让团队更有动力。今天继续发挥你的影响力吧！`
          : tier === "mid"
          ? `🌅 ${name}，${today}！新的一天，新的机会。今天选一件最重要的事优先完成，一步步来。`
          : `🌤️ ${name}，${today}！不用急，今天只做好一件小事就是胜利。我随时在这里帮你。`;

        await db.insert(consultantAgentOutputs).values({
          employeeId: p.employeeId,
          outputType: "daily_digest",
          channel: "in_system",
          title: `${today} — 每日简报`,
          content,
          personaTierAtTime: tier,
          strategyApplied: strategyMap[tier],
          toneProfile: toneMap[tier],
          deliveredAt: new Date(),
        });
        generated++;
      }
      return { generated, total: profiles.length };
    }),

  // 人设评分自动计算 (基于现有数据)
  recalculatePersonaScores: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ year: z.number().optional() }))
    .mutation(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const profiles = await db.select().from(employeePersonaProfiles)
        .where(eq(employeePersonaProfiles.year, year)).limit(200);

      let updated = 0;
      for (const p of profiles) {
        // Weighted average of 5 dimensions
        const motivation = parseFloat(p.motivationScore || "50");
        const teamInteraction = parseFloat(p.teamInteractionScore || "50");
        const clientRecognition = parseFloat(p.clientRecognitionScore || "50");
        const peerApproval = parseFloat(p.peerApprovalScore || "50");
        const managerConfidence = parseFloat(p.managerConfidenceScore || "50");

        // Weights: motivation 25%, team 20%, client 25%, peer 15%, manager 15%
        const score = motivation * 0.25 + teamInteraction * 0.20 + clientRecognition * 0.25
          + peerApproval * 0.15 + managerConfidence * 0.15;
        const tier = score >= 70 ? "high" : score >= 40 ? "mid" : "low";

        await db.update(employeePersonaProfiles).set({
          personaScore: String(Math.round(score * 100) / 100),
          personaTier: tier,
          updatedAt: new Date(),
        }).where(eq(employeePersonaProfiles.id, p.id));
        updated++;
      }
      return { updated };
    }),
});

// ══════════════════════════════════════════════════════
// Main Router
// ══════════════════════════════════════════════════════
export const consultantAgentRouter = router({
  persona: personaRouter,
  outputs: outputsRouter,
  strategy: strategyRouter,
  sessions: sessionsRouter,
  engine: engineRouter,
});
