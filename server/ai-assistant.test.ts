/**
 * AI Assistant 单元测试
 * 
 * 测试AI助手的基础功能和Interview Assistant的增强功能
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getAssistantConfig,
  getAssistantsByCategory,
  getAssistantsByRole,
  isAssistantEnabled,
  ALL_ASSISTANTS,
} from "./ai-assistants/config";
import {
  getAvailableAssistants,
  checkRateLimit,
  getSessionContext,
  updateSessionContext,
  clearSessionContext,
} from "./ai-assistants/gateway";

describe("AI Assistant Configuration", () => {
  it("should load all assistants", () => {
    expect(ALL_ASSISTANTS.length).toBeGreaterThan(0);
    expect(ALL_ASSISTANTS.length).toBe(17); // 9 business + 8 role assistants
  });

  it("should get assistant by ID", () => {
    const interview = getAssistantConfig("interview");
    expect(interview).toBeDefined();
    expect(interview?.id).toBe("interview");
    expect(interview?.chineseName).toBe("AI面试助手");
  });

  it("should get assistants by category", () => {
    const business = getAssistantsByCategory("business");
    expect(business.length).toBeGreaterThan(0);
    expect(business.every(a => a.category === "business")).toBe(true);

    const role = getAssistantsByCategory("role");
    expect(role.length).toBeGreaterThan(0);
    expect(role.every(a => a.category === "role")).toBe(true);

    const planning = getAssistantsByCategory("planning");
    expect(planning.length).toBeGreaterThan(0);
    expect(planning.every(a => a.category === "planning")).toBe(true);
  });

  it("should get assistants by role", () => {
    const hrAssistants = getAssistantsByRole("hr");
    expect(hrAssistants.length).toBeGreaterThan(0);
    expect(hrAssistants.every(a => a.allowedRoles.includes("hr"))).toBe(true);
  });

  it("should check if assistant is enabled", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.isEnabled).toBeTruthy();
    
    const enabled = isAssistantEnabled("interview", {});
    expect(enabled).toBeTruthy();
  });

  it("should get available assistants with filters", () => {
    const business = getAvailableAssistants({ category: "business", enabledOnly: true });
    expect(business.length).toBeGreaterThan(0);
    expect(business.every(a => a.isEnabled)).toBeTruthy();

    const hrRole = getAvailableAssistants({ role: "hr" });
    expect(hrRole.length).toBeGreaterThan(0);
    expect(hrRole.every(a => a.allowedRoles.includes("hr"))).toBe(true);
  });
});

describe("Rate Limiting", () => {
  it("should check rate limit for user", () => {
    const result = checkRateLimit("interview", 1, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("should enforce rate limit after exceeding limit", () => {
    const assistantId = "interview";
    const userId = 999;
    const limit = 2;

    // First call
    let result = checkRateLimit(assistantId, userId, limit);
    expect(result.allowed).toBe(true);

    // Second call
    result = checkRateLimit(assistantId, userId, limit);
    expect(result.allowed).toBe(true);

    // Third call should be rate limited
    result = checkRateLimit(assistantId, userId, limit);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("Session Context Management", () => {
  const sessionId = "test-session-001";

  it("should initialize empty session context", () => {
    const context = getSessionContext(sessionId);
    expect(Array.isArray(context)).toBe(true);
    expect(context.length).toBe(0);
  });

  it("should update session context", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    
    updateSessionContext(sessionId, messages);
    const context = getSessionContext(sessionId);
    expect(context.length).toBe(2);
    expect(context[0].content).toBe("Hello");
  });

  it("should clear session context", () => {
    updateSessionContext(sessionId, [
      { role: "user", content: "Test" },
    ]);
    
    let context = getSessionContext(sessionId);
    expect(context.length).toBeGreaterThan(0);
    
    clearSessionContext(sessionId);
    context = getSessionContext(sessionId);
    expect(context.length).toBe(0);
  });
});

describe("Interview Assistant Configuration", () => {
  it("should have interview assistant configured", () => {
    const interview = getAssistantConfig("interview");
    expect(interview).toBeDefined();
    expect(interview?.id).toBe("interview");
    expect(interview?.category).toBe("business");
    expect(interview?.isEnabled).toBeTruthy();
  });

  it("should have interview assistant system prompt", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.systemPrompt).toBeDefined();
    expect(interview?.systemPrompt).toContain("面试");
  });

  it("should have correct model config for interview", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.modelConfig.model).toBe("gpt-4");
    expect(interview?.modelConfig.maxTokens).toBeGreaterThan(0);
    expect(interview?.modelConfig.temperature).toBeGreaterThanOrEqual(0);
    expect(interview?.modelConfig.temperature).toBeLessThanOrEqual(1);
  });

  it("should have rate limit configured", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.rateLimit).toBeGreaterThan(0);
  });

  it("should allow HR roles to use interview assistant", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.allowedRoles).toContain("hr");
    expect(interview?.allowedRoles).toContain("recruiter");
  });
});

describe("Solution Assistant Configuration", () => {
  it("should have solution assistant configured", () => {
    const solution = getAssistantConfig("solution");
    expect(solution).toBeDefined();
    expect(solution?.id).toBe("solution");
    expect(solution?.chineseName).toBe("AI方案设计助手");
  });

  it("should have correct allowed roles", () => {
    const solution = getAssistantConfig("solution");
    expect(solution?.allowedRoles.length).toBeGreaterThan(0);
    expect(["sales", "engineer", "manager"].some(r => solution?.allowedRoles.includes(r))).toBe(true);
  });
});

describe("Quotation Assistant Configuration", () => {
  it("should have quotation assistant configured", () => {
    const quotation = getAssistantConfig("quotation");
    expect(quotation).toBeDefined();
    expect(quotation?.id).toBe("quotation");
    expect(quotation?.chineseName).toBe("AI报价助手");
  });

  it("should allow sales roles", () => {
    const quotation = getAssistantConfig("quotation");
    expect(quotation?.allowedRoles).toContain("sales");
    expect(quotation?.allowedRoles).toContain("finance");
  });
});

describe("KPI Assistant Configuration", () => {
  it("should have kpi assistant configured", () => {
    const kpi = getAssistantConfig("kpi");
    expect(kpi).toBeDefined();
    expect(kpi?.id).toBe("kpi");
    expect(kpi?.chineseName).toBe("AI绩效助手");
  });

  it("should allow HR and manager roles", () => {
    const kpi = getAssistantConfig("kpi");
    expect(kpi?.allowedRoles).toContain("hr");
    expect(kpi?.allowedRoles).toContain("manager");
  });
});

describe("Purchase Assistant Configuration", () => {
  it("should have purchase assistant configured", () => {
    const purchase = getAssistantConfig("purchase");
    expect(purchase).toBeDefined();
    expect(purchase?.id).toBe("purchase");
    expect(purchase?.chineseName).toBe("AI采购助手");
  });

  it("should allow procurement roles", () => {
    const purchase = getAssistantConfig("purchase");
    expect(purchase?.allowedRoles).toContain("procurement");
    expect(purchase?.allowedRoles).toContain("finance");
  });
});

describe("Planning Assistant Configuration", () => {
  it("should have planning assistants configured", () => {
    const planning = getAssistantsByCategory("planning");
    expect(planning.length).toBeGreaterThan(0);
    
    // Check for different planning levels
    const planning1 = getAssistantConfig("planning_1");
    expect(planning1).toBeDefined();
    expect(planning1?.chineseName).toContain("计划");
  });

  it("should have different planning levels", () => {
    const planning = getAssistantsByCategory("planning");
    const ids = planning.map(p => p.id);
    
    expect(ids).toContain("planning_1");
    expect(ids).toContain("planning_2");
    expect(ids).toContain("planning_3");
    expect(ids).toContain("planning_4");
  });
});

describe("Role Agents Configuration", () => {
  it("should have all role agents configured", () => {
    const roleAgents = getAssistantsByCategory("role");
    expect(roleAgents.length).toBeGreaterThanOrEqual(8);
    
    const ids = roleAgents.map(a => a.id);
    expect(ids).toContain("tech_agent");
    expect(ids).toContain("pm_agent");
    expect(ids).toContain("qa_agent");
    expect(ids).toContain("hr_agent");
  });

  it("should have system prompt for each role agent", () => {
    const roleAgents = getAssistantsByCategory("role");
    roleAgents.forEach(agent => {
      expect(agent.systemPrompt).toBeDefined();
      expect(agent.systemPrompt.length).toBeGreaterThan(0);
    });
  });
});

describe("Assistant Priority and Status", () => {
  it("should have priority levels", () => {
    const assistants = getAvailableAssistants();
    const priorities = new Set(assistants.map(a => a.priority));
    
    expect(priorities.has("P0") || priorities.has("P1")).toBe(true);
  });

  it("should have enabled status", () => {
    const assistants = getAvailableAssistants({ enabledOnly: true });
    assistants.forEach(a => {
      expect(a.isEnabled).toBeTruthy();
    });
  });

  it("should have descriptions", () => {
    const assistants = getAvailableAssistants();
    assistants.forEach(a => {
      expect(a.description).toBeDefined();
      expect(a.description.length).toBeGreaterThan(0);
    });
  });
});

describe("Knowledge Base Configuration", () => {
  it("should have knowledge base IDs", () => {
    const interview = getAssistantConfig("interview");
    expect(interview?.knowledgeBaseId).toBeDefined();
    expect(interview?.knowledgeBaseId).toMatch(/^kb_/);
  });

  it("should have unique knowledge base IDs", () => {
    const assistants = getAvailableAssistants();
    const kbIds = assistants.map(a => a.knowledgeBaseId).filter(Boolean);
    const uniqueKbIds = new Set(kbIds);
    
    expect(uniqueKbIds.size).toBe(kbIds.length);
  });
});
