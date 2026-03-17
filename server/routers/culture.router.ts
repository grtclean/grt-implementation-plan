/**
 * Culture Router — 星火大屏 & 奋斗者殿堂 tRPC 路由
 *
 * Procedures:
 *   getSparkDashboardData — 并发获取战报 + 奋斗者 (首页大屏)
 *   getRecentFeeds        — 分页拉取前线战报
 *   addLiveFeed           — 新增前线战报
 *   awardStriver          — 颁发奋斗者勋章
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { striversHall, globalLiveFeeds } from "../../drizzle/spark-hope-schema";
import { eq, desc, sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("culture");

// ── Idempotent DDL ──────────────────────────────────────────
let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();

    // Enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE medal_level AS ENUM ('GOLD','SILVER','BRONZE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // strivers_hall
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS strivers_hall (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name VARCHAR(200) NOT NULL,
        achievement_title VARCHAR(500) NOT NULL,
        medal_level medal_level NOT NULL,
        story_summary TEXT,
        awarded_by VARCHAR(200),
        awarded_at TIMESTAMP DEFAULT NOW() NOT NULL,
        bu_code VARCHAR(50),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sh_user_idx ON strivers_hall (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sh_medal_idx ON strivers_hall (medal_level)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sh_awarded_idx ON strivers_hall (awarded_at)`);

    // global_live_feeds
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_live_feeds (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(100),
        project_name VARCHAR(300),
        location VARCHAR(200) NOT NULL,
        feed_message TEXT NOT NULL,
        feed_type VARCHAR(20) DEFAULT 'DAILY' NOT NULL,
        reported_by VARCHAR(200),
        importance VARCHAR(20) DEFAULT 'normal' NOT NULL,
        is_live BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS glf_project_idx ON global_live_feeds (project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS glf_location_idx ON global_live_feeds (location)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS glf_created_idx ON global_live_feeds (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS glf_live_idx ON global_live_feeds (is_live)`);

    // ── Seed data (idempotent) ──
    await seedInitialData(db);

    tablesEnsured = true;
    log.info("[Culture] Tables ensured");
  } catch (err) {
    log.warn({ err }, "[Culture] ensureTables failed");
  }
}

async function seedInitialData(db: any) {
  // Only seed if tables are empty
  const feedCount = await db.$count(globalLiveFeeds);
  if (feedCount === 0) {
    await db.insert(globalLiveFeeds).values([
      {
        projectId: "CHART-M11",
        projectName: "北美 Chart 13 站清洗线",
        location: "US-Detroit",
        feedMessage: "北美 Chart 现场：13 站设备水温与节拍均达到极值，完美运行第 4 小时，客户现场验收团队全程见证",
        feedType: "MILESTONE",
        reportedBy: "廉龙海 (海外BU)",
        importance: "high",
      },
      {
        projectId: "MEM-FAT-2026",
        projectName: "德国 Memmingen 清洗设备",
        location: "Germany-Memmingen",
        feedMessage: "德国 Memmingen 工厂：交付验收 FAT 全项一次通过，德方品质主管签署 Acceptance Certificate",
        feedType: "MILESTONE",
        reportedBy: "孙国祥 (海外BU)",
        importance: "high",
      },
      {
        projectId: "NEV-ZE-001",
        projectName: "新能源零排放产线",
        location: "CN-Suzhou",
        feedMessage: "乘用车 BU 新能源产线：零排放样本工程 M11 里程碑达成，全工序无废水排放验证通过",
        feedType: "MILESTONE",
        reportedBy: "李大鹏 (乘用车BU)",
        importance: "high",
      },
      {
        projectId: "SA-RIYADH-01",
        projectName: "沙特高温环境清洗线",
        location: "SA-Riyadh",
        feedMessage: "海外 BU 沙特项目：极端高温环境 52°C 连续运行测试通过，设备稳定性超出客户预期",
        feedType: "CELEBRATION",
        reportedBy: "洪小东 (海外BU)",
        importance: "normal",
      },
      {
        projectId: "SEMI-WAFER-03",
        projectName: "晶圆清洗设备",
        location: "CN-Shanghai",
        feedMessage: "半导体 BU：晶圆清洗设备良率突破 99.7% 行业标杆，打破国外设备垄断局面",
        feedType: "CELEBRATION",
        reportedBy: "孙坚 (半导体BU)",
        importance: "high",
      },
    ]);
    log.info("[Culture] Seeded 5 live feeds");
  }

  const striverCount = await db.$count(striversHall);
  if (striverCount === 0) {
    await db.insert(striversHall).values([
      {
        userName: "王海涛",
        achievementTitle: "零排放样本工程攻坚者",
        medalLevel: "GOLD",
        storySummary: "用 120 天完成通常需要 8 个月的全自动化产线交付。带领团队在客户现场连续奋战 45 天，实现零排放工艺从设计到量产的完整闭环，为公司打开了新能源清洗设备的全新市场。",
        awardedBy: "CEO",
        buCode: "overseas",
      },
      {
        userName: "李明",
        achievementTitle: "合规吹哨人",
        medalLevel: "SILVER",
        storySummary: "在高压下坚守原则，主动发现并举报供应链中的合规风险。推动全员签署月度自律承诺书制度的建立，从根本上提升了组织的合规文化水平。",
        awardedBy: "VP",
        buCode: "commercial",
      },
      {
        userName: "张静",
        achievementTitle: "700㎡极限空间重构者",
        medalLevel: "BRONZE",
        storySummary: "用专业捍卫尊严：在仅 700 平米的极限空间内完成全套自动化产线重构，创造性地解决了设备布局、物流动线和安全通道的三重约束问题，成为行业内紧凑型产线设计的标杆案例。",
        awardedBy: "Director",
        buCode: "passenger",
      },
    ]);
    log.info("[Culture] Seeded 3 strivers");
  }
}

// ═══════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════

export const cultureRouter = router({

  /**
   * 星火大屏核心数据 — 并发获取战报 + 奋斗者
   * 首页嵌入和独立大屏共用此 API
   */
  getSparkDashboardData: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const [feeds, strivers] = await Promise.all([
        db.select({
          id: globalLiveFeeds.id,
          projectName: globalLiveFeeds.projectName,
          location: globalLiveFeeds.location,
          feedMessage: globalLiveFeeds.feedMessage,
          feedType: globalLiveFeeds.feedType,
          reportedBy: globalLiveFeeds.reportedBy,
          importance: globalLiveFeeds.importance,
          createdAt: globalLiveFeeds.createdAt,
        })
          .from(globalLiveFeeds)
          .where(eq(globalLiveFeeds.isLive, true))
          .orderBy(desc(globalLiveFeeds.createdAt))
          .limit(5),

        db.select({
          id: striversHall.id,
          userName: striversHall.userName,
          achievementTitle: striversHall.achievementTitle,
          medalLevel: striversHall.medalLevel,
          storySummary: striversHall.storySummary,
          awardedAt: striversHall.awardedAt,
          buCode: striversHall.buCode,
        })
          .from(striversHall)
          .where(eq(striversHall.isActive, true))
          .orderBy(desc(striversHall.awardedAt))
          .limit(3),
      ]);

      return {
        feeds,
        strivers,
        ceoQuote: "努力工作，掌控自己的人生。",
      };
    }),

  /** 分页拉取前线战报 */
  getRecentFeeds: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      return db.select()
        .from(globalLiveFeeds)
        .where(eq(globalLiveFeeds.isLive, true))
        .orderBy(desc(globalLiveFeeds.createdAt))
        .limit(input?.limit ?? 10)
        .offset(input?.offset ?? 0);
    }),

  /** 新增前线战报 */
  addLiveFeed: requirePermission("project:edit")
    .input(z.object({
      projectId: z.string().max(100).optional(),
      projectName: z.string().max(300).optional(),
      location: z.string().min(1).max(200),
      feedMessage: z.string().min(1).max(5000),
      feedType: z.enum(["MILESTONE", "DAILY", "ALERT", "CELEBRATION"]).default("DAILY"),
      importance: z.enum(["high", "normal"]).default("normal"),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const [feed] = await db.insert(globalLiveFeeds).values({
        projectId: input.projectId ?? null,
        projectName: input.projectName ?? null,
        location: input.location,
        feedMessage: input.feedMessage,
        feedType: input.feedType,
        reportedBy: ctx.user!.name ?? String(ctx.user!.id),
        importance: input.importance,
      }).returning();

      log.info({ feedId: feed.id, location: input.location }, "Live feed added");
      return { success: true, feedId: feed.id };
    }),

  /** 颁发奋斗者勋章 */
  awardStriver: requirePermission("hr:performance:dept")
    .input(z.object({
      userId: z.number().optional(),
      userName: z.string().min(1).max(200),
      achievementTitle: z.string().min(1).max(500),
      medalLevel: z.enum(["GOLD", "SILVER", "BRONZE"]),
      storySummary: z.string().max(5000).optional(),
      buCode: z.string().max(50).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const [striver] = await db.insert(striversHall).values({
        userId: input.userId ?? null,
        userName: input.userName,
        achievementTitle: input.achievementTitle,
        medalLevel: input.medalLevel,
        storySummary: input.storySummary ?? null,
        awardedBy: ctx.user!.name ?? String(ctx.user!.id),
        buCode: input.buCode ?? null,
      }).returning();

      log.info({ striverId: striver.id, medal: input.medalLevel }, "Striver awarded");
      return { success: true, striverId: striver.id };
    }),
});
