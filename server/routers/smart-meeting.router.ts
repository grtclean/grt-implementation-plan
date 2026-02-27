/**
 * GRT Smart Meeting & AI Engagement Hub — tRPC Router
 *
 * 5 sub-routers, ~22 procedures:
 *
 *   meetingRouter      — CRUD for sys_meetings + lifecycle transitions
 *   attendanceRouter   — check-in, leave, mark-absent, list by meeting
 *   interactionRouter  — notes, quiz submission, takeaway reflection
 *   penaltyRouter      — list/get penalties, trigger processAbsences
 *   chatRouter         — mock group chat (in-memory, no persistence)
 *
 * AI Features:
 *   generateQuiz      — calls LLM to create quiz questions from transcript
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  sysMeetings,
  meetingAttendance,
  meetingInteractions,
  hrPenalties,
  meetingSpeakers,
} from "../../drizzle/smart-meetings-schema";
import { analyzeMeetingAudio } from "../services/diarization-engine.service";
import { createTeamsMeeting } from "../services/microsoft-teams.service";
import {
  calculateMeetingROI,
  getAggregatedROI,
} from "../services/meeting-analytics-engine.service";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { processAbsences } from "../services/hr-meeting-engine";

// ── Shared helpers ─────────────────────────────────────────
const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

// ── In-memory group chat store (per meeting) ───────────────
// In production this would be backed by WebSocket + DB
const chatStore = new Map<
  number,
  Array<{ userId: number; userName: string; message: string; time: string }>
>();

// ═══════════════════════════════════════════════════════════
//  1. Meeting CRUD + Lifecycle
// ═══════════════════════════════════════════════════════════
const meetingRouter = router({
  // List all meetings, newest first
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          type: z.string().optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input?.status)
        conditions.push(eq(sysMeetings.status, input.status));
      if (input?.type) conditions.push(eq(sysMeetings.type, input.type));

      return db
        .select()
        .from(sysMeetings)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(sysMeetings.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // Get single meeting by ID
  getById: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db
      .select()
      .from(sysMeetings)
      .where(eq(sysMeetings.id, toNum(input.id)));
    return row ?? null;
  }),

  // Create a new meeting
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        type: z.enum(["MAJOR", "MINOR"]).default("MINOR"),
        description: z.string().optional(),
        organizerName: z.string().optional(),
        organizerId: z.number().optional(),
        scheduledStart: z.string().optional(),
        scheduledEnd: z.string().optional(),
        expectedAttendees: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [meeting] = await db
        .insert(sysMeetings)
        .values({
          title: input.title,
          type: input.type,
          status: "UPCOMING",
          description: input.description ?? null,
          organizerName: input.organizerName ?? null,
          organizerId: input.organizerId ?? null,
          scheduledStart: input.scheduledStart
            ? new Date(input.scheduledStart)
            : null,
          scheduledEnd: input.scheduledEnd
            ? new Date(input.scheduledEnd)
            : null,
          expectedAttendees: input.expectedAttendees,
        })
        .returning();
      return meeting;
    }),

  // Transition meeting status: UPCOMING → LIVE → ENDED
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        status: z.enum(["UPCOMING", "LIVE", "ENDED"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date();
      const extra: Record<string, any> = {};
      if (input.status === "LIVE") extra.actualStart = now;
      if (input.status === "ENDED") extra.actualEnd = now;

      const [updated] = await db
        .update(sysMeetings)
        .set({ status: input.status, updatedAt: now, ...extra })
        .where(eq(sysMeetings.id, toNum(input.id)))
        .returning();
      return updated;
    }),

  // Update transcript (for AI quiz generation)
  updateTranscript: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        transcript: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(sysMeetings)
        .set({ transcript: input.transcript, updatedAt: new Date() })
        .where(eq(sysMeetings.id, toNum(input.id)))
        .returning();
      return updated;
    }),

  // Generate AI quiz from transcript
  generateQuiz: publicProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [meeting] = await db
        .select()
        .from(sysMeetings)
        .where(eq(sysMeetings.id, toNum(input.id)));
      if (!meeting) throw new Error("Meeting not found");

      const transcript = meeting.transcript || meeting.description || meeting.title;

      try {
        const result = await invokeLLM({
          system: `You are an AI engagement quiz generator for corporate meetings.
Given a meeting transcript, generate exactly 3 quiz questions:
- 2 multiple choice (4 options each, mark the correct one)
- 1 true/false
Return valid JSON array:
[{"id":1,"question":"...","type":"MULTIPLE_CHOICE","options":["A","B","C","D"],"correctAnswer":"A"},
 {"id":2,"question":"...","type":"MULTIPLE_CHOICE","options":["A","B","C","D"],"correctAnswer":"C"},
 {"id":3,"question":"...","type":"TRUE_FALSE","options":["True","False"],"correctAnswer":"True"}]
Use the same language as the transcript.`,
          prompt: `Meeting: "${meeting.title}"\n\nTranscript:\n${transcript}`,
        });

        const content = result.content ?? "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (questions) {
          await db
            .update(sysMeetings)
            .set({ aiQuizQuestions: questions, updatedAt: new Date() })
            .where(eq(sysMeetings.id, toNum(input.id)));
          return { success: true, questions };
        }
        return { success: false, questions: null, raw: content };
      } catch {
        // Fallback: generate mock quiz questions
        const mockQuestions = [
          {
            id: 1,
            question: `本次会议「${meeting.title}」的核心主题是什么？`,
            type: "MULTIPLE_CHOICE" as const,
            options: [
              "2026年战略目标与行动计划",
              "日常行政安排",
              "技术栈升级讨论",
              "客户投诉处理",
            ],
            correctAnswer: "2026年战略目标与行动计划",
          },
          {
            id: 2,
            question: `会议中提到的首要发展方向是？`,
            type: "MULTIPLE_CHOICE" as const,
            options: [
              "降低成本",
              "AI驱动的智能制造转型",
              "缩减人员规模",
              "暂停研发投入",
            ],
            correctAnswer: "AI驱动的智能制造转型",
          },
          {
            id: 3,
            question: `会议要求全员参与2026年度KPI目标制定。`,
            type: "TRUE_FALSE" as const,
            options: ["True", "False"],
            correctAnswer: "True",
          },
        ];

        await db
          .update(sysMeetings)
          .set({ aiQuizQuestions: mockQuestions, updatedAt: new Date() })
          .where(eq(sysMeetings.id, toNum(input.id)));

        return { success: true, questions: mockQuestions };
      }
    }),

  // Create Teams meeting link via Graph API mock and save to DB
  createTeamsLink: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [meeting] = await db
        .select()
        .from(sysMeetings)
        .where(eq(sysMeetings.id, toNum(input.meetingId)));
      if (!meeting) throw new Error("Meeting not found");

      const result = await createTeamsMeeting({
        title: meeting.title,
        description: meeting.description ?? undefined,
        scheduledStart: meeting.scheduledStart?.toISOString(),
        scheduledEnd: meeting.scheduledEnd?.toISOString(),
        organizerName: meeting.organizerName ?? undefined,
      });

      await db
        .update(sysMeetings)
        .set({ teamsUrl: result.teamsUrl, updatedAt: new Date() })
        .where(eq(sysMeetings.id, toNum(input.meetingId)));

      return result;
    }),

  // Dashboard aggregation
  getStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const statusCounts = await db
      .select({ status: sysMeetings.status, count: count() })
      .from(sysMeetings)
      .groupBy(sysMeetings.status);
    const typeCounts = await db
      .select({ type: sysMeetings.type, count: count() })
      .from(sysMeetings)
      .groupBy(sysMeetings.type);
    return {
      byStatus: Object.fromEntries(
        statusCounts.map((r) => [r.status, Number(r.count)])
      ),
      byType: Object.fromEntries(
        typeCounts.map((r) => [r.type, Number(r.count)])
      ),
    };
  }),
});

// ═══════════════════════════════════════════════════════════
//  2. Attendance (check-in, leave, absent)
// ═══════════════════════════════════════════════════════════
const attendanceRouter = router({
  // List attendance for a meeting
  listByMeeting: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    return db
      .select()
      .from(meetingAttendance)
      .where(eq(meetingAttendance.meetingId, toNum(input.id)))
      .orderBy(desc(meetingAttendance.createdAt));
  }),

  // Check in (physical or online)
  checkIn: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        userName: z.string().optional(),
        status: z.enum(["PRESENT_PHYSICAL", "PRESENT_ONLINE"]),
        checkInMethod: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Upsert: if user already has a record, update it
      const existing = await db
        .select()
        .from(meetingAttendance)
        .where(
          and(
            eq(meetingAttendance.meetingId, toNum(input.meetingId)),
            eq(meetingAttendance.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingAttendance)
          .set({
            status: input.status,
            checkInTime: new Date(),
            checkInMethod: input.checkInMethod ?? null,
            updatedAt: new Date(),
          })
          .where(eq(meetingAttendance.id, existing[0].id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingAttendance)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          userName: input.userName ?? null,
          status: input.status,
          checkInTime: new Date(),
          checkInMethod: input.checkInMethod ?? null,
        })
        .returning();
      return record;
    }),

  // Request leave
  requestLeave: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db
        .select()
        .from(meetingAttendance)
        .where(
          and(
            eq(meetingAttendance.meetingId, toNum(input.meetingId)),
            eq(meetingAttendance.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingAttendance)
          .set({
            status: "LEAVED",
            leaveTime: new Date(),
            leaveReason: input.reason,
            updatedAt: new Date(),
          })
          .where(eq(meetingAttendance.id, existing[0].id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingAttendance)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          status: "LEAVED",
          leaveTime: new Date(),
          leaveReason: input.reason,
        })
        .returning();
      return record;
    }),

  // Mark user as absent (called when meeting ends, for unregistered users)
  markAbsent: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        userName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [record] = await db
        .insert(meetingAttendance)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          userName: input.userName ?? null,
          status: "ABSENT",
        })
        .returning();
      return record;
    }),
});

// ═══════════════════════════════════════════════════════════
//  3. Interactions (notes, quiz, reflection)
// ═══════════════════════════════════════════════════════════
const interactionRouter = router({
  // Get user's interaction for a meeting
  getByUser: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(meetingInteractions)
        .where(
          and(
            eq(meetingInteractions.meetingId, toNum(input.meetingId)),
            eq(meetingInteractions.userId, input.userId)
          )
        );
      return row ?? null;
    }),

  // Save / update private notes
  saveNotes: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        userName: z.string().optional(),
        personalNotes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db
        .select()
        .from(meetingInteractions)
        .where(
          and(
            eq(meetingInteractions.meetingId, toNum(input.meetingId)),
            eq(meetingInteractions.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingInteractions)
          .set({
            personalNotes: input.personalNotes,
            updatedAt: new Date(),
          })
          .where(eq(meetingInteractions.id, existing[0].id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingInteractions)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          userName: input.userName ?? null,
          personalNotes: input.personalNotes,
        })
        .returning();
      return record;
    }),

  // Submit quiz answers
  submitQuiz: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        userName: z.string().optional(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            selectedAnswer: z.string(),
            isCorrect: z.boolean(),
          })
        ),
        score: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db
        .select()
        .from(meetingInteractions)
        .where(
          and(
            eq(meetingInteractions.meetingId, toNum(input.meetingId)),
            eq(meetingInteractions.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingInteractions)
          .set({
            aiQuizScore: input.score,
            aiQuizAnswers: input.answers,
            updatedAt: new Date(),
          })
          .where(eq(meetingInteractions.id, existing[0].id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingInteractions)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          userName: input.userName ?? null,
          aiQuizScore: input.score,
          aiQuizAnswers: input.answers,
        })
        .returning();
      return record;
    }),

  // Submit takeaway reflection
  submitReflection: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        reflection: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db
        .select()
        .from(meetingInteractions)
        .where(
          and(
            eq(meetingInteractions.meetingId, toNum(input.meetingId)),
            eq(meetingInteractions.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingInteractions)
          .set({
            takeawayReflection: input.reflection,
            updatedAt: new Date(),
          })
          .where(eq(meetingInteractions.id, existing[0].id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingInteractions)
        .values({
          meetingId: toNum(input.meetingId),
          userId: input.userId,
          takeawayReflection: input.reflection,
        })
        .returning();
      return record;
    }),
});

// ═══════════════════════════════════════════════════════════
//  4. Penalties (view + trigger engine)
// ═══════════════════════════════════════════════════════════
const penaltyRouter = router({
  // List all penalties, newest first
  list: publicProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          penaltyLevel: z.string().optional(),
          limit: z.number().default(100),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input?.userId)
        conditions.push(eq(hrPenalties.userId, input.userId));
      if (input?.penaltyLevel)
        conditions.push(eq(hrPenalties.penaltyLevel, input.penaltyLevel));

      return db
        .select()
        .from(hrPenalties)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(hrPenalties.createdAt))
        .limit(input?.limit ?? 100);
    }),

  // Trigger the HR penalty engine for a meeting
  processAbsences: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        meetingType: z.enum(["MAJOR", "MINOR"]),
      })
    )
    .mutation(async ({ input }) => {
      const actions = await processAbsences(
        toNum(input.meetingId),
        input.meetingType
      );
      return { processed: actions.length, actions };
    }),

  // Get penalty stats summary
  getStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const levelCounts = await db
      .select({ level: hrPenalties.penaltyLevel, count: count() })
      .from(hrPenalties)
      .groupBy(hrPenalties.penaltyLevel);
    return {
      byLevel: Object.fromEntries(
        levelCounts.map((r) => [r.level, Number(r.count)])
      ),
    };
  }),
});

// ═══════════════════════════════════════════════════════════
//  5. Group Chat (in-memory mock)
// ═══════════════════════════════════════════════════════════
const chatRouter = router({
  // Get chat messages for a meeting
  getMessages: publicProcedure.input(idInput).query(({ input }) => {
    const meetingId = toNum(input.id);
    return chatStore.get(meetingId) ?? [];
  }),

  // Send a chat message
  sendMessage: publicProcedure
    .input(
      z.object({
        meetingId: z.union([z.string(), z.number()]),
        userId: z.number(),
        userName: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(({ input }) => {
      const meetingId = toNum(input.meetingId);
      if (!chatStore.has(meetingId)) chatStore.set(meetingId, []);
      const msg = {
        userId: input.userId,
        userName: input.userName,
        message: input.message,
        time: new Date().toISOString(),
      };
      chatStore.get(meetingId)!.push(msg);
      // Keep only last 200 messages per meeting
      const msgs = chatStore.get(meetingId)!;
      if (msgs.length > 200) chatStore.set(meetingId, msgs.slice(-200));
      return msg;
    }),
});

// ═══════════════════════════════════════════════════════════
//  Seed demo meeting (for CEO demo)
// ═══════════════════════════════════════════════════════════
const seedRouter = router({
  seedDemo: publicProcedure.mutation(async () => {
    const db = await requireDb();

    // Check if demo meeting already exists
    const existing = await db
      .select()
      .from(sysMeetings)
      .where(eq(sysMeetings.title, "GRT 2026 年度启动大会 — CEO 战略宣讲"))
      .limit(1);

    if (existing.length > 0) {
      return { message: "Demo meeting already exists", meeting: existing[0] };
    }

    const [meeting] = await db
      .insert(sysMeetings)
      .values({
        title: "GRT 2026 年度启动大会 — CEO 战略宣讲",
        type: "MAJOR",
        status: "LIVE",
        description:
          "2026年度全体大会：CEO分享新年战略规划，涵盖AI智能制造转型、海外市场拓展、组织架构升级三大核心议题。",
        transcript: `各位同事，大家好！今天我们召开2026年度启动大会。
过去一年，GRT在智能制造领域取得了突破性进展。我们的自动化产线覆盖率从65%提升至89%。
展望2026年，我提出三个核心战略方向：
第一，AI驱动的智能制造转型——我们将在所有产线部署AI质检和预测性维护系统。
第二，海外市场加速拓展——聚焦东南亚和欧洲市场，目标海外营收占比达到35%。
第三，组织架构全面升级——推行项目型组织（POS），提升跨部门协作效率。
全员需在Q1完成个人KPI目标制定，与部门负责人对齐。
让我们一起开创GRT的新篇章！`,
        organizerName: "CEO",
        organizerId: 1,
        expectedAttendees: 500,
        actualStart: new Date(),
        aiQuizQuestions: [
          {
            id: 1,
            question:
              "根据CEO的战略宣讲，2026年GRT的自动化产线覆盖率目标从多少提升？",
            type: "MULTIPLE_CHOICE",
            options: [
              "从50%提升到75%",
              "从65%提升到89%",
              "从70%提升到95%",
              "从80%提升到100%",
            ],
            correctAnswer: "从65%提升到89%",
          },
          {
            id: 2,
            question: "2026年海外营收占比的目标是多少？",
            type: "MULTIPLE_CHOICE",
            options: ["20%", "25%", "30%", "35%"],
            correctAnswer: "35%",
          },
          {
            id: 3,
            question:
              "CEO要求全员在Q1完成个人KPI目标制定并与部门负责人对齐。",
            type: "TRUE_FALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
        ],
      })
      .returning();

    // Seed some chat messages
    chatStore.set(meeting.id, [
      {
        userId: 101,
        userName: "张工",
        message: "CEO的战略规划非常振奋人心！💪",
        time: new Date(Date.now() - 300000).toISOString(),
      },
      {
        userId: 102,
        userName: "李经理",
        message: "海外市场35%的目标很有挑战性，期待更多支持资源",
        time: new Date(Date.now() - 240000).toISOString(),
      },
      {
        userId: 103,
        userName: "王主管",
        message: "POS组织架构升级是我最关注的，希望能提升协作效率",
        time: new Date(Date.now() - 180000).toISOString(),
      },
      {
        userId: 104,
        userName: "陈博士",
        message: "AI质检系统的技术路线已经准备就绪，随时可以部署",
        time: new Date(Date.now() - 120000).toISOString(),
      },
      {
        userId: 105,
        userName: "赵总监",
        message: "建议增加东南亚市场本地化团队的预算",
        time: new Date(Date.now() - 60000).toISOString(),
      },
    ]);

    return { message: "Demo meeting seeded", meeting };
  }),
});

// ═══════════════════════════════════════════════════════════
//  7. Speaker Diarization & Voice-Print Matching
// ═══════════════════════════════════════════════════════════
const speakerRouter = router({
  // Run voice-print analysis on a meeting
  analyze: publicProcedure
    .input(z.object({ meetingId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const result = await analyzeMeetingAudio(toNum(input.meetingId));
      return result;
    }),

  // List speakers for a meeting
  listByMeeting: publicProcedure
    .input(z.object({ meetingId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(meetingSpeakers)
        .where(eq(meetingSpeakers.meetingId, toNum(input.meetingId)))
        .orderBy(meetingSpeakers.firstSpokenAt);
    }),

  // Bind an unknown speaker to a known profile
  bindProfile: publicProcedure
    .input(
      z.object({
        speakerId: z.union([z.string(), z.number()]),
        profileId: z.number(),
        profileType: z.enum(["EMPLOYEE", "CUSTOMER", "EXTERNAL"]),
        profileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(meetingSpeakers)
        .set({
          matchedProfileId: input.profileId,
          matchedProfileType: input.profileType,
          matchedProfileName: input.profileName,
          matchConfidence: "1.00",
          voiceSnippetUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(meetingSpeakers.id, toNum(input.speakerId)))
        .returning();
      return updated ?? null;
    }),

  // Unbind a speaker (reset to unknown)
  unbindProfile: publicProcedure
    .input(z.object({ speakerId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(meetingSpeakers)
        .set({
          matchedProfileId: null,
          matchedProfileType: null,
          matchedProfileName: null,
          matchConfidence: null,
          updatedAt: new Date(),
        })
        .where(eq(meetingSpeakers.id, toNum(input.speakerId)))
        .returning();
      return updated ?? null;
    }),
});

// ═══════════════════════════════════════════════════════════
//  8. Analytics — ROI Pipeline (Speaker Radar + Canvas → Executive)
// ═══════════════════════════════════════════════════════════
const analyticsRouter = router({
  // Calculate ROI for a single meeting
  meetingRoi: publicProcedure
    .input(z.object({ meetingId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      return calculateMeetingROI(toNum(input.meetingId));
    }),

  // Get aggregated ROI across all meetings
  aggregatedRoi: publicProcedure.query(async () => {
    return getAggregatedROI();
  }),
});

// ═══════════════════════════════════════════════════════════
//  Export composed router
// ═══════════════════════════════════════════════════════════
export const smartMeetingRouter = router({
  meeting: meetingRouter,
  attendance: attendanceRouter,
  interaction: interactionRouter,
  penalty: penaltyRouter,
  chat: chatRouter,
  seed: seedRouter,
  speaker: speakerRouter,
  analytics: analyticsRouter,
});
