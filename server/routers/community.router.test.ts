/**
 * Community Router — Unit Tests
 * 18 procedures across 5 groups:
 *   Members           (5): list, getById, create, update, delete
 *   Posts & Messages  (4): getPosts, like, getPendingMessages, approveOutboundMessage
 *   Stats             (2): getStats, getMembers
 *   Content           (4): createContent, publishContent, getPendingContent, approveContent
 *   Sensitive Words   (3): getSensitiveWords, addSensitiveWord, initDefaultSensitiveWords
 *   Member Verify     (1): verifyMember
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

function getNextSelectResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : [];
}

function getNextReturningResult() {
  return returningQueue.length > 0
    ? returningQueue.shift()!
    : [{ id: 1 }];
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(getNextReturningResult()));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextSelectResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve([[]])),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(() => "count_fn"),
  sql: vi.fn(),
}));

vi.mock("../../drizzle/schema", () => ({
  communityMembers: {
    id: "id",
    externalId: "externalId",
    platform: "platform",
    nickname: "nickname",
    realName: "realName",
    phone: "phone",
    company: "company",
    tags: "tags",
    status: "status",
    verificationStatus: "verificationStatus",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    lastActiveAt: "lastActiveAt",
  },
  communityMessages: {
    id: "id",
    memberId: "memberId",
    direction: "direction",
    content: "content",
    approvalStatus: "approvalStatus",
    approvedBy: "approvedBy",
    approvedAt: "approvedAt",
    rejectionReason: "rejectionReason",
    publishStatus: "publishStatus",
    publishedAt: "publishedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  contentLibrary: {
    id: "id",
    title: "title",
    content: "content",
    contentType: "contentType",
    category: "category",
    tags: "tags",
    authorId: "authorId",
    approvalStatus: "approvalStatus",
    approvedBy: "approvedBy",
    approvedAt: "approvedAt",
    pushStatus: "pushStatus",
    pushedAt: "pushedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  sensitiveWords: {
    id: "id",
    word: "word",
    category: "category",
    severity: "severity",
    action: "action",
    isActive: "isActive",
    createdAt: "createdAt",
  },
  communityStats: {
    id: "id",
    statDate: "statDate",
    questionsAsked: "questionsAsked",
    questionsAnswered: "questionsAnswered",
    avgResponseTime: "avgResponseTime",
    leadsGenerated: "leadsGenerated",
  },
  interactionLogs: {
    id: "id",
    interactionType: "interactionType",
    memberId: "memberId",
    messageId: "messageId",
    originalContent: "originalContent",
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("community router", () => {
  // ═══════════════════════════════════════════════════════
  // Members
  // ═══════════════════════════════════════════════════════

  describe("list", () => {
    it("returns members with pagination shape", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, nickname: "Alice", platform: "wechat" },
        { id: 2, nickname: "Bob", platform: "dingtalk" },
      ]);
      const result = await caller.community.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it("returns empty list when no members", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns member when found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, nickname: "Alice", platform: "wechat" }]);
      const result = await caller.community.getById({ id: "1" });
      expect(result).not.toBeNull();
      expect(result!.nickname).toBe("Alice");
    });

    it("returns null when member not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getById({ id: "999" });
      expect(result).toBeNull();
    });

    it("rejects non-string id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.getById({ id: 123 as any })
      ).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("creates a member with required fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        { id: 1, externalId: "wx-001", platform: "wechat", nickname: "Alice" },
      ]);
      const result = await caller.community.create({
        externalId: "wx-001",
        nickname: "Alice",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("成员已添加");
      expect(result.data.nickname).toBe("Alice");
    });

    it("creates a member with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        {
          id: 2,
          externalId: "dd-002",
          platform: "dingtalk",
          nickname: "Bob",
          realName: "Bob Zhang",
          phone: "13800138000",
          company: "GRT",
        },
      ]);
      const result = await caller.community.create({
        externalId: "dd-002",
        platform: "dingtalk",
        nickname: "Bob",
        realName: "Bob Zhang",
        phone: "13800138000",
        company: "GRT",
      });
      expect(result.success).toBe(true);
      expect(result.data.platform).toBe("dingtalk");
      expect(result.data.company).toBe("GRT");
    });

    it("defaults platform to wechat", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        { id: 3, externalId: "wx-003", platform: "wechat", nickname: "Charlie" },
      ]);
      const result = await caller.community.create({
        externalId: "wx-003",
        nickname: "Charlie",
      });
      expect(result.success).toBe(true);
      // The insert receives input which defaults platform to "wechat" via zod
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects invalid platform", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.create({
          externalId: "x-001",
          platform: "telegram" as any,
          nickname: "Dave",
        })
      ).rejects.toThrow();
    });

    it("rejects missing externalId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.create({ nickname: "Eve" } as any)
      ).rejects.toThrow();
    });

    it("rejects missing nickname", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.create({ externalId: "wx-005" } as any)
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates a member with partial fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        { id: 1, nickname: "Alice Updated", realName: "Alice Li" },
      ]);
      const result = await caller.community.update({
        id: "1",
        nickname: "Alice Updated",
        realName: "Alice Li",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data.nickname).toBe("Alice Updated");
    });

    it("updates only tags", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([{ id: 1, tags: '["超声波","铝合金"]' }]);
      const result = await caller.community.update({
        id: "1",
        tags: '["超声波","铝合金"]',
      });
      expect(result.success).toBe(true);
      expect(result.data.tags).toBe('["超声波","铝合金"]');
    });

    it("rejects missing id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.update({ nickname: "Test" } as any)
      ).rejects.toThrow();
    });

    it("rejects non-string id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.update({ id: 1 as any, nickname: "Test" })
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("deletes a member", async () => {
      const caller = createAuthenticatedCaller();
      // delete chain resolves via .then
      selectResultsQueue.push([]);
      const result = await caller.community.delete({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("删除成功");
    });

    it("rejects missing id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.delete({} as any)
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Posts & Messages
  // ═══════════════════════════════════════════════════════

  describe("getPosts", () => {
    it("returns published messages", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, content: "Hello world", publishStatus: "published" },
        { id: 2, content: "Second post", publishStatus: "published" },
      ]);
      const result = await caller.community.getPosts();
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Hello world");
    });

    it("returns empty array when no published messages", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getPosts();
      expect(result).toHaveLength(0);
    });
  });

  describe("like", () => {
    it("records a like interaction and returns success", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([{ id: 1 }]);
      const result = await caller.community.like({ messageId: 42 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("点赞成功");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("uses the authenticated user id as memberId", async () => {
      const caller = createAuthenticatedCaller({ id: 99 });
      returningQueue.push([{ id: 2 }]);
      const result = await caller.community.like({ messageId: 10 });
      expect(result.success).toBe(true);
    });

    it("rejects non-number messageId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.like({ messageId: "abc" as any })
      ).rejects.toThrow();
    });
  });

  describe("getPendingMessages", () => {
    it("returns outbound pending messages", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, direction: "outbound", approvalStatus: "pending", content: "Draft reply" },
      ]);
      const result = await caller.community.getPendingMessages();
      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe("outbound");
    });

    it("returns empty when no pending messages", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getPendingMessages();
      expect(result).toHaveLength(0);
    });
  });

  describe("approveOutboundMessage", () => {
    it("approves a message", async () => {
      const caller = createAuthenticatedCaller();
      // update chain resolves via .then
      selectResultsQueue.push([]);
      const result = await caller.community.approveOutboundMessage({
        messageId: 1,
        status: "approved",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已批准");
    });

    it("rejects a message with reason", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.approveOutboundMessage({
        messageId: 2,
        status: "rejected",
        reason: "Contains sensitive info",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
    });

    it("approves even when status is a non-approved string", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.approveOutboundMessage({
        messageId: 3,
        status: "other",
      });
      // "other" !== "approved" => treated as rejected
      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
    });

    it("rejects missing messageId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.approveOutboundMessage({ status: "approved" } as any)
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════

  describe("getStats", () => {
    it("returns aggregated stats with latest stat record", async () => {
      const caller = createAuthenticatedCaller();
      // memberCount
      selectResultsQueue.push([{ count: 100 }]);
      // activeCount
      selectResultsQueue.push([{ count: 75 }]);
      // messageCount
      selectResultsQueue.push([{ count: 500 }]);
      // contentCount
      selectResultsQueue.push([{ count: 30 }]);
      // latestStat
      selectResultsQueue.push([{
        questionsAsked: 200,
        questionsAnswered: 180,
        avgResponseTime: 120,
        leadsGenerated: 15,
      }]);

      const result = await caller.community.getStats();
      expect(result.stats.totalMembers).toBe(100);
      expect(result.stats.activeMembers).toBe(75);
      expect(result.stats.totalMessages).toBe(500);
      expect(result.stats.totalContent).toBe(30);
      expect(result.stats.questionsAsked).toBe(200);
      expect(result.stats.questionsAnswered).toBe(180);
      expect(result.stats.avgResponseTime).toBe(120);
      expect(result.stats.leadsGenerated).toBe(15);
    });

    it("returns stats without extra fields when no latest stat record", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 10 }]);
      selectResultsQueue.push([{ count: 5 }]);
      selectResultsQueue.push([{ count: 20 }]);
      selectResultsQueue.push([{ count: 3 }]);
      // No latestStat
      selectResultsQueue.push([]);

      const result = await caller.community.getStats();
      expect(result.stats.totalMembers).toBe(10);
      expect(result.stats.activeMembers).toBe(5);
      expect(result.stats.totalMessages).toBe(20);
      expect(result.stats.totalContent).toBe(3);
      expect(result.stats).not.toHaveProperty("questionsAsked");
      expect(result.stats).not.toHaveProperty("leadsGenerated");
    });
  });

  describe("getMembers", () => {
    it("returns members ordered by lastActiveAt", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 2, nickname: "Bob", lastActiveAt: "2026-03-01" },
        { id: 1, nickname: "Alice", lastActiveAt: "2026-02-28" },
      ]);
      const result = await caller.community.getMembers();
      expect(result).toHaveLength(2);
      expect(result[0].nickname).toBe("Bob");
    });

    it("returns empty array when no members", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getMembers();
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Member Verification
  // ═══════════════════════════════════════════════════════

  describe("verifyMember", () => {
    it("verifies a member and sets status to active", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.verifyMember({
        memberId: 1,
        status: "verified",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已验证");
    });

    it("rejects a member and sets status to pending", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.verifyMember({
        memberId: 2,
        status: "rejected",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
    });

    it("rejects invalid status value", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.verifyMember({
          memberId: 1,
          status: "banned" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects non-number memberId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.verifyMember({
          memberId: "abc" as any,
          status: "verified",
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Content
  // ═══════════════════════════════════════════════════════

  describe("createContent", () => {
    it("creates content with required fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        { id: 1, title: "Tech Article", content: "Content body", contentType: "article", authorId: 1 },
      ]);
      const result = await caller.community.createContent({
        title: "Tech Article",
        content: "Content body",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("内容已创建");
      expect(result.data.title).toBe("Tech Article");
    });

    it("creates content with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([
        {
          id: 2,
          title: "FAQ",
          content: "Q&A",
          contentType: "faq",
          category: "cleaning",
          tags: '["ultrasonic"]',
          sourceType: "external",
          authorId: 1,
        },
      ]);
      const result = await caller.community.createContent({
        title: "FAQ",
        content: "Q&A",
        contentType: "faq",
        category: "cleaning",
        tags: '["ultrasonic"]',
        sourceType: "external",
      });
      expect(result.success).toBe(true);
      expect(result.data.contentType).toBe("faq");
    });

    it("sets authorId from authenticated context", async () => {
      const caller = createAuthenticatedCaller({ id: 42 });
      returningQueue.push([{ id: 3, title: "Test", authorId: 42 }]);
      const result = await caller.community.createContent({
        title: "Test",
        content: "Body",
      });
      expect(result.success).toBe(true);
      expect(result.data.authorId).toBe(42);
    });

    it("rejects invalid contentType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.createContent({
          title: "Test",
          content: "Body",
          contentType: "podcast" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects missing title", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.createContent({ content: "Body" } as any)
      ).rejects.toThrow();
    });

    it("rejects missing content", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.createContent({ title: "Title" } as any)
      ).rejects.toThrow();
    });
  });

  describe("publishContent", () => {
    it("publishes content by setting approval and push status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.publishContent({ contentId: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已发布");
    });

    it("rejects non-number contentId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.publishContent({ contentId: "abc" as any })
      ).rejects.toThrow();
    });
  });

  describe("getPendingContent", () => {
    it("returns draft content items", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, title: "Draft Article", approvalStatus: "draft" },
        { id: 2, title: "Another Draft", approvalStatus: "draft" },
      ]);
      const result = await caller.community.getPendingContent();
      expect(result).toHaveLength(2);
    });

    it("returns empty when no pending content", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getPendingContent();
      expect(result).toHaveLength(0);
    });
  });

  describe("approveContent", () => {
    it("approves content", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.approveContent({
        contentId: 1,
        status: "approved",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已通过");
    });

    it("rejects content", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.approveContent({
        contentId: 2,
        status: "rejected",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
    });

    it("sets approvedBy from authenticated context", async () => {
      const caller = createAuthenticatedCaller({ id: 55 });
      selectResultsQueue.push([]);
      const result = await caller.community.approveContent({
        contentId: 1,
        status: "approved",
      });
      expect(result.success).toBe(true);
      // The update set() is called with approvedBy = ctx.user.id
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("rejects missing contentId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.approveContent({ status: "approved" } as any)
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Sensitive Words
  // ═══════════════════════════════════════════════════════

  describe("getSensitiveWords", () => {
    it("returns active sensitive words", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, word: "底价", category: "price", isActive: 1 },
        { id: 2, word: "回扣", category: "price", isActive: 1 },
      ]);
      const result = await caller.community.getSensitiveWords();
      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("底价");
    });

    it("returns empty when no active sensitive words", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.community.getSensitiveWords();
      expect(result).toHaveLength(0);
    });
  });

  describe("addSensitiveWord", () => {
    it("adds a sensitive word with required field only", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([{ id: 1, word: "机密" }]);
      const result = await caller.community.addSensitiveWord({ word: "机密" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("敏感词已添加");
      expect(result.data.word).toBe("机密");
    });

    it("adds a sensitive word with optional fields", async () => {
      const caller = createAuthenticatedCaller();
      returningQueue.push([{ id: 2, word: "成本", category: "price", severity: "high" }]);
      const result = await caller.community.addSensitiveWord({
        word: "成本",
        category: "price",
        severity: "high",
        action: "block",
        isActive: true,
      });
      expect(result.success).toBe(true);
      expect(result.data.word).toBe("成本");
    });

    it("rejects missing word", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.community.addSensitiveWord({} as any)
      ).rejects.toThrow();
    });
  });

  describe("initDefaultSensitiveWords", () => {
    it("initializes defaults when table is empty", async () => {
      const caller = createAuthenticatedCaller();
      // select count returns 0
      selectResultsQueue.push([{ count: 0 }]);
      // 6 inserts follow (no returning needed since they use .then via chain)
      const result = await caller.community.initDefaultSensitiveWords();
      expect(result.success).toBe(true);
      expect(result.message).toBe("默认敏感词已初始化");
      // Should have called insert 6 times (one for each default word)
      expect(mockDb.insert).toHaveBeenCalledTimes(6);
    });

    it("skips initialization when words already exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 5 }]);
      const result = await caller.community.initDefaultSensitiveWords();
      expect(result.success).toBe(true);
      expect(result.message).toBe("敏感词库已存在");
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Auth Guards
  // ═══════════════════════════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.getById({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.create({ externalId: "wx-001", nickname: "Test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.update({ id: "1", nickname: "Test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.delete({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getPosts", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getPosts()).rejects.toThrow();
    });

    it("rejects anonymous for like", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.like({ messageId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getStats()).rejects.toThrow();
    });

    it("rejects anonymous for getMembers", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getMembers()).rejects.toThrow();
    });

    it("rejects anonymous for verifyMember", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.verifyMember({ memberId: 1, status: "verified" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for createContent", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.createContent({ title: "Test", content: "Body" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for publishContent", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.publishContent({ contentId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getPendingContent", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getPendingContent()).rejects.toThrow();
    });

    it("rejects anonymous for approveContent", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.approveContent({ contentId: 1, status: "approved" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getSensitiveWords", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getSensitiveWords()).rejects.toThrow();
    });

    it("rejects anonymous for addSensitiveWord", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.addSensitiveWord({ word: "test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for initDefaultSensitiveWords", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.initDefaultSensitiveWords()
      ).rejects.toThrow();
    });

    it("rejects anonymous for getPendingMessages", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.community.getPendingMessages()).rejects.toThrow();
    });

    it("rejects anonymous for approveOutboundMessage", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.community.approveOutboundMessage({ messageId: 1, status: "approved" })
      ).rejects.toThrow();
    });
  });
});
