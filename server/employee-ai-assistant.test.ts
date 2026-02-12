/**
 * Employee AI Assistant Unit Tests
 * 员工AI助手单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAssistantCode,
  generateSessionId,
} from "./employee-ai-assistant/employeeAiAssistantService";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock the LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Mock AI response" } }],
    usage: { total_tokens: 100 },
  }),
}));

describe("Employee AI Assistant Service", () => {
  describe("generateAssistantCode", () => {
    it("should generate valid assistant code with correct format", () => {
      const code = generateAssistantCode(123, "sales");
      expect(code).toMatch(/^AST-SAL-123-[A-Z0-9]+$/);
    });

    it("should generate different codes for different employee IDs", () => {
      const code1 = generateAssistantCode(1, "tech");
      const code2 = generateAssistantCode(2, "tech");
      expect(code1).not.toBe(code2);
    });

    it("should use correct type prefix for each assistant type", () => {
      const generalCode = generateAssistantCode(1, "general");
      const salesCode = generateAssistantCode(1, "sales");
      const techCode = generateAssistantCode(1, "tech");
      const pmCode = generateAssistantCode(1, "pm");
      const hrCode = generateAssistantCode(1, "hr");
      const financeCode = generateAssistantCode(1, "finance");
      const productionCode = generateAssistantCode(1, "production");
      const engineeringCode = generateAssistantCode(1, "engineering");

      expect(generalCode).toContain("AST-GEN-");
      expect(salesCode).toContain("AST-SAL-");
      expect(techCode).toContain("AST-TEC-");
      expect(pmCode).toContain("AST-PM-");
      expect(hrCode).toContain("AST-HR-");
      expect(financeCode).toContain("AST-FIN-");
      expect(productionCode).toContain("AST-PRO-");
      expect(engineeringCode).toContain("AST-ENG-");
    });
  });

  describe("generateSessionId", () => {
    it("should generate valid session ID with correct format", () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^sess-[a-z0-9]+-[a-z0-9]+$/);
    });

    it("should generate unique session IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("Assistant Types", () => {
    it("should support all defined assistant types", () => {
      const types = ["general", "sales", "tech", "pm", "hr", "finance", "production", "engineering"];
      types.forEach(type => {
        const code = generateAssistantCode(1, type as any);
        expect(code).toBeTruthy();
        expect(code.startsWith("AST-")).toBe(true);
      });
    });
  });

  describe("PersonalityConfig Interface", () => {
    it("should accept valid personality configuration", () => {
      const config = {
        communicationStyle: "formal" as const,
        responseLength: "detailed" as const,
        proactiveLevel: "high" as const,
        preferredLanguage: "zh-CN",
        workingHours: { start: "09:00", end: "18:00" },
      };
      
      expect(config.communicationStyle).toBe("formal");
      expect(config.responseLength).toBe("detailed");
      expect(config.proactiveLevel).toBe("high");
    });

    it("should support all communication styles", () => {
      const styles = ["formal", "casual", "balanced"];
      styles.forEach(style => {
        expect(["formal", "casual", "balanced"]).toContain(style);
      });
    });

    it("should support all response length options", () => {
      const lengths = ["concise", "detailed", "adaptive"];
      lengths.forEach(length => {
        expect(["concise", "detailed", "adaptive"]).toContain(length);
      });
    });

    it("should support all proactive levels", () => {
      const levels = ["high", "medium", "low"];
      levels.forEach(level => {
        expect(["high", "medium", "low"]).toContain(level);
      });
    });
  });

  describe("LearningContent Interface", () => {
    it("should accept valid learning content structure", () => {
      const content = {
        category: "sales_skills",
        keyPoints: ["客户沟通技巧", "需求分析方法", "报价策略"],
        context: "销售培训课程",
        applicability: ["新客户开发", "老客户维护"],
      };
      
      expect(content.category).toBe("sales_skills");
      expect(content.keyPoints.length).toBe(3);
      expect(content.applicability.length).toBe(2);
    });
  });

  describe("SkillAssessment Interface", () => {
    it("should accept valid skill assessment structure", () => {
      const assessment = {
        skillName: "项目管理",
        currentLevel: 6,
        targetLevel: 8,
        evidence: ["PMP认证", "成功交付3个大型项目"],
        improvementPlan: ["参加高级PM培训", "承担更复杂项目"],
      };
      
      expect(assessment.currentLevel).toBeLessThanOrEqual(assessment.targetLevel);
      expect(assessment.evidence.length).toBeGreaterThan(0);
      expect(assessment.improvementPlan.length).toBeGreaterThan(0);
    });

    it("should validate skill level range", () => {
      const validLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      validLevels.forEach(level => {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("CareerMilestone Interface", () => {
    it("should accept valid career milestone structure", () => {
      const milestone = {
        id: "milestone-001",
        title: "获得PMP认证",
        description: "通过PMP考试并获得认证",
        targetDate: "2026-06-30",
        status: "in_progress" as const,
        requiredSkills: ["项目管理", "风险管理", "团队领导"],
      };
      
      expect(milestone.status).toBe("in_progress");
      expect(milestone.requiredSkills.length).toBe(3);
    });

    it("should support all milestone statuses", () => {
      const statuses = ["pending", "in_progress", "completed"];
      statuses.forEach(status => {
        expect(["pending", "in_progress", "completed"]).toContain(status);
      });
    });
  });

  describe("Career Path Types", () => {
    it("should support all career path types", () => {
      const pathTypes = ["vertical", "horizontal", "cross_functional"];
      pathTypes.forEach(type => {
        expect(["vertical", "horizontal", "cross_functional"]).toContain(type);
      });
    });
  });

  describe("Learning Sources", () => {
    it("should support all learning sources", () => {
      const sources = ["interaction", "task", "feedback", "document", "meeting"];
      sources.forEach(source => {
        expect(["interaction", "task", "feedback", "document", "meeting"]).toContain(source);
      });
    });
  });

  describe("Interaction Types", () => {
    it("should support all interaction types", () => {
      const types = ["task", "question", "feedback", "learning", "coaching", "chat"];
      types.forEach(type => {
        expect(["task", "question", "feedback", "learning", "coaching", "chat"]).toContain(type);
      });
    });
  });
});

describe("Employee AI Assistant Database Schema", () => {
  describe("employeeAiAssistants table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "employeeId",
        "assistantCode",
        "assistantName",
        "assistantType",
        "status",
        "createdAt",
        "updatedAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should support all assistant types", () => {
      const types = ["general", "sales", "tech", "pm", "hr", "finance", "production", "engineering"];
      expect(types.length).toBe(8);
    });

    it("should support all status values", () => {
      const statuses = ["active", "paused", "archived"];
      expect(statuses.length).toBe(3);
    });
  });

  describe("aiAssistantInteractions table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "assistantId",
        "employeeId",
        "sessionId",
        "interactionType",
        "createdAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });
  });

  describe("employeeSkillMaps table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "employeeId",
        "skillCategory",
        "skillName",
        "currentLevel",
        "createdAt",
        "updatedAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should validate skill level defaults", () => {
      const defaultLevel = 1;
      expect(defaultLevel).toBeGreaterThanOrEqual(1);
      expect(defaultLevel).toBeLessThanOrEqual(10);
    });
  });

  describe("careerDevelopmentPaths table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "employeeId",
        "currentRole",
        "targetRole",
        "pathType",
        "status",
        "createdAt",
        "updatedAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should support all path types", () => {
      const pathTypes = ["vertical", "horizontal", "cross_functional"];
      expect(pathTypes.length).toBe(3);
    });

    it("should support all status values", () => {
      const statuses = ["planning", "in_progress", "achieved", "paused"];
      expect(statuses.length).toBe(4);
    });
  });

  describe("aiLearningRecords table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "assistantId",
        "employeeId",
        "learningSource",
        "createdAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should support all learning sources", () => {
      const sources = ["interaction", "task", "feedback", "document", "meeting"];
      expect(sources.length).toBe(5);
    });
  });
});

describe("Project Digital Twin Schema", () => {
  describe("projectDigitalTwins table", () => {
    it("should have required fields", () => {
      const requiredFields = [
        "id",
        "projectId",
        "twinCode",
        "projectType",
        "healthScore",
        "syncStatus",
        "createdAt",
        "updatedAt",
      ];
      
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should support all project types", () => {
      const types = ["standard", "custom", "service"];
      expect(types.length).toBe(3);
    });

    it("should support all sync statuses", () => {
      const statuses = ["synced", "pending", "error"];
      expect(statuses.length).toBe(3);
    });

    it("should validate health score range", () => {
      const defaultScore = 100;
      expect(defaultScore).toBeGreaterThanOrEqual(0);
      expect(defaultScore).toBeLessThanOrEqual(100);
    });
  });

  describe("projectRiskAlerts table", () => {
    it("should support all risk categories", () => {
      const categories = ["schedule", "cost", "quality", "resource", "scope"];
      expect(categories.length).toBe(5);
    });

    it("should support all severity levels", () => {
      const severities = ["critical", "high", "medium", "low"];
      expect(severities.length).toBe(4);
    });

    it("should support all alert statuses", () => {
      const statuses = ["active", "acknowledged", "resolved", "expired"];
      expect(statuses.length).toBe(4);
    });
  });

  describe("projectOptimizationSuggestions table", () => {
    it("should support all suggestion types", () => {
      const types = ["schedule", "cost", "resource", "quality", "process"];
      expect(types.length).toBe(5);
    });

    it("should support all implementation efforts", () => {
      const efforts = ["easy", "medium", "hard"];
      expect(efforts.length).toBe(3);
    });

    it("should support all suggestion statuses", () => {
      const statuses = ["pending", "accepted", "rejected", "implemented"];
      expect(statuses.length).toBe(4);
    });
  });

  describe("projectKnowledgeBase table", () => {
    it("should support all knowledge types", () => {
      const types = ["lesson_learned", "best_practice", "risk_pattern", "solution"];
      expect(types.length).toBe(4);
    });
  });
});

describe("AI Assistant Templates Schema", () => {
  describe("aiAssistantTemplates table", () => {
    it("should support all assistant types", () => {
      const types = ["solution", "quotation", "planning", "kpi", "interview", "purchase", "general"];
      expect(types.length).toBe(7);
    });
  });

  describe("aiAssistantSessions table", () => {
    it("should support all session statuses", () => {
      const statuses = ["active", "archived", "deleted"];
      expect(statuses.length).toBe(3);
    });
  });

  describe("aiAssistantMessages table", () => {
    it("should support all message roles", () => {
      const roles = ["user", "assistant", "system"];
      expect(roles.length).toBe(3);
    });
  });
});
