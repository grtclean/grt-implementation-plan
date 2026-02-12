/**
 * DLP中间件单元测试
 * 
 * 测试覆盖:
 * 1. CRM白名单检查
 * 2. 内容审计
 * 3. 邮件导出验证
 * 4. 文件导出验证
 * 5. 敏感数据识别
 */

import { describe, it, expect, beforeEach } from "vitest";

/**
 * 模拟DLP中间件
 */
class DLPMiddleware {
  private crmWhitelist: Set<string> = new Set([
    "sales@company.com",
    "crm@company.com",
    "admin@company.com",
  ]);

  private sensitivePatterns = {
    bom: /(?:BOM|物料清单|bill\s*of\s*materials)/i,
    price: /(?:价格|价钱|price|cost|¥|￥|\$)/i,
    cad: /(?:CAD|cad|\.dwg|\.dxf|\.step|\.iges)/i,
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  };

  /**
   * 检查CRM白名单
   */
  checkCRMWhitelist(email: string): { allowed: boolean; reason?: string } {
    if (!email) {
      return { allowed: false, reason: "邮箱地址为空" };
    }

    if (this.crmWhitelist.has(email)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `邮箱 ${email} 不在CRM白名单中`,
    };
  }

  /**
   * 审计内容
   */
  auditContent(content: string): {
    isSensitive: boolean;
    detectedPatterns: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
  } {
    if (!content) {
      return {
        isSensitive: false,
        detectedPatterns: [],
        riskLevel: "low",
      };
    }

    const detectedPatterns: string[] = [];

    // 检查敏感模式
    for (const [pattern, regex] of Object.entries(this.sensitivePatterns)) {
      if (regex.test(content)) {
        detectedPatterns.push(pattern);
      }
    }

    // 判断风险级别
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";

    if (detectedPatterns.length === 0) {
      riskLevel = "low";
    } else if (detectedPatterns.length === 1) {
      riskLevel = "medium";
    } else if (detectedPatterns.length <= 3) {
      riskLevel = "high";
    } else {
      riskLevel = "critical";
    }

    return {
      isSensitive: detectedPatterns.length > 0,
      detectedPatterns,
      riskLevel,
    };
  }

  /**
   * 验证邮件导出
   */
  validateEmailExport(
    senderEmail: string,
    recipients: string[],
    content: string
  ): {
    allowed: boolean;
    reason?: string;
    riskLevel?: string;
  } {
    // 1. 检查发送者是否在白名单
    const whitelistCheck = this.checkCRMWhitelist(senderEmail);
    if (!whitelistCheck.allowed) {
      return {
        allowed: false,
        reason: `发送者 ${senderEmail} 无权导出邮件`,
      };
    }

    // 2. 审计内容
    const contentAudit = this.auditContent(content);
    if (contentAudit.riskLevel === "critical") {
      return {
        allowed: false,
        reason: `邮件内容包含过多敏感信息 (${contentAudit.detectedPatterns.join(", ")})`,
        riskLevel: contentAudit.riskLevel,
      };
    }

    // 3. 检查收件人
    for (const recipient of recipients) {
      if (!recipient.includes("@")) {
        return {
          allowed: false,
          reason: `无效的收件人邮箱: ${recipient}`,
        };
      }
    }

    return {
      allowed: true,
      riskLevel: contentAudit.riskLevel,
    };
  }

  /**
   * 验证文件导出
   */
  validateFileExport(
    fileName: string,
    fileSize: number,
    content: string
  ): {
    allowed: boolean;
    reason?: string;
  } {
    // 1. 检查文件大小 (最大100MB)
    if (fileSize > 100 * 1024 * 1024) {
      return {
        allowed: false,
        reason: `文件过大 (${(fileSize / 1024 / 1024).toFixed(2)}MB > 100MB)`,
      };
    }

    // 2. 检查文件类型
    const allowedExtensions = [".xlsx", ".csv", ".pdf", ".txt", ".json"];
    const hasAllowedExtension = allowedExtensions.some((ext) =>
      fileName.toLowerCase().endsWith(ext)
    );

    if (!hasAllowedExtension) {
      return {
        allowed: false,
        reason: `不支持的文件类型: ${fileName}`,
      };
    }

    // 3. 审计内容
    const contentAudit = this.auditContent(content);
    if (contentAudit.riskLevel === "critical") {
      return {
        allowed: false,
        reason: `文件内容包含过多敏感信息 (${contentAudit.detectedPatterns.join(", ")})`,
      };
    }

    return { allowed: true };
  }

  /**
   * 记录合规事件
   */
  logComplianceEvent(
    eventType: string,
    details: Record<string, any>
  ): {
    eventId: string;
    timestamp: Date;
    logged: boolean;
  } {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      eventId,
      timestamp: new Date(),
      logged: true,
    };
  }

  /**
   * 添加到CRM白名单
   */
  addToWhitelist(email: string): void {
    this.crmWhitelist.add(email);
  }

  /**
   * 从CRM白名单移除
   */
  removeFromWhitelist(email: string): void {
    this.crmWhitelist.delete(email);
  }
}

// ============================================================================
// 单元测试
// ============================================================================

describe("DLPMiddleware", () => {
  let dlp: DLPMiddleware;

  beforeEach(() => {
    dlp = new DLPMiddleware();
  });

  describe("CRM白名单检查", () => {
    it("应该允许白名单中的邮箱", () => {
      const result = dlp.checkCRMWhitelist("sales@company.com");
      expect(result.allowed).toBe(true);
    });

    it("应该拒绝不在白名单中的邮箱", () => {
      const result = dlp.checkCRMWhitelist("unknown@example.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("不在CRM白名单中");
    });

    it("应该处理空邮箱", () => {
      const result = dlp.checkCRMWhitelist("");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("邮箱地址为空");
    });

    it("应该支持添加到白名单", () => {
      dlp.addToWhitelist("newuser@company.com");
      const result = dlp.checkCRMWhitelist("newuser@company.com");
      expect(result.allowed).toBe(true);
    });

    it("应该支持从白名单移除", () => {
      dlp.removeFromWhitelist("sales@company.com");
      const result = dlp.checkCRMWhitelist("sales@company.com");
      expect(result.allowed).toBe(false);
    });
  });

  describe("内容审计", () => {
    it("应该检测BOM相关内容", () => {
      const content = "This is a Bill of Materials document";
      const result = dlp.auditContent(content);
      expect(result.isSensitive).toBe(true);
      expect(result.detectedPatterns).toContain("bom");
    });

    it("应该检测价格相关内容", () => {
      const content = "The price is $100 per unit";
      const result = dlp.auditContent(content);
      expect(result.isSensitive).toBe(true);
      expect(result.detectedPatterns).toContain("price");
    });

    it("应该检测CAD文件引用", () => {
      const content = "Please see the design in model.dwg";
      const result = dlp.auditContent(content);
      expect(result.isSensitive).toBe(true);
      expect(result.detectedPatterns).toContain("cad");
    });

    it("应该检测IP地址", () => {
      const content = "Server IP: 192.168.1.1";
      const result = dlp.auditContent(content);
      expect(result.isSensitive).toBe(true);
      expect(result.detectedPatterns).toContain("ip");
    });

    it("应该检测电子邮件地址", () => {
      const content = "Contact: john.doe@example.com";
      const result = dlp.auditContent(content);
      expect(result.isSensitive).toBe(true);
      expect(result.detectedPatterns).toContain("email");
    });

    it("应该正确判断风险级别", () => {
      const lowRisk = dlp.auditContent("Normal content");
      expect(lowRisk.riskLevel).toBe("low");

      const mediumRisk = dlp.auditContent("Price: $100");
      expect(mediumRisk.riskLevel).toBe("medium");

      const highRisk = dlp.auditContent(
        "BOM document with price $100 and CAD file model.dwg"
      );
      expect(highRisk.riskLevel).toBe("high");

      const criticalRisk = dlp.auditContent(
        "BOM with price $100, CAD file model.dwg, IP 192.168.1.1, and email test@example.com"
      );
      expect(criticalRisk.riskLevel).toBe("critical");
    });

    it("应该处理空内容", () => {
      const result = dlp.auditContent("");
      expect(result.isSensitive).toBe(false);
      expect(result.detectedPatterns).toHaveLength(0);
      expect(result.riskLevel).toBe("low");
    });
  });

  describe("邮件导出验证", () => {
    it("应该允许白名单用户导出安全邮件", () => {
      const result = dlp.validateEmailExport(
        "sales@company.com",
        ["recipient@company.com"],
        "This is a normal email"
      );
      expect(result.allowed).toBe(true);
    });

    it("应该拒绝非白名单用户导出邮件", () => {
      const result = dlp.validateEmailExport(
        "unknown@example.com",
        ["recipient@company.com"],
        "This is a normal email"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("无权导出邮件");
    });

    it("应该拒绝包含关键敏感信息的邮件", () => {
      const result = dlp.validateEmailExport(
        "sales@company.com",
        ["recipient@company.com"],
        "BOM with price $100, CAD file model.dwg, IP 192.168.1.1, and email test@example.com"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("过多敏感信息");
    });

    it("应该验证收件人邮箱格式", () => {
      const result = dlp.validateEmailExport(
        "sales@company.com",
        ["invalid-email"],
        "This is a normal email"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("无效的收件人邮箱");
    });

    it("应该允许中等风险的邮件导出", () => {
      const result = dlp.validateEmailExport(
        "sales@company.com",
        ["recipient@company.com"],
        "Please see the price: $100"
      );
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe("medium");
    });
  });

  describe("文件导出验证", () => {
    it("应该允许导出小型安全文件", () => {
      const result = dlp.validateFileExport(
        "report.xlsx",
        1024 * 1024,
        "This is a normal report"
      );
      expect(result.allowed).toBe(true);
    });

    it("应该拒绝过大的文件", () => {
      const result = dlp.validateFileExport(
        "large_file.xlsx",
        101 * 1024 * 1024,
        "Content"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("文件过大");
    });

    it("应该拒绝不支持的文件类型", () => {
      const result = dlp.validateFileExport(
        "script.exe",
        1024,
        "Content"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("不支持的文件类型");
    });

    it("应该允许支持的文件类型", () => {
      const supportedTypes = ["report.xlsx", "data.csv", "doc.pdf", "text.txt", "config.json"];

      for (const fileName of supportedTypes) {
        const result = dlp.validateFileExport(
          fileName,
          1024,
          "Normal content"
        );
        expect(result.allowed).toBe(true);
      }
    });

    it("应该拒绝包含关键敏感信息的文件", () => {
      const result = dlp.validateFileExport(
        "data.xlsx",
        1024,
        "BOM with price $100, CAD file model.dwg, IP 192.168.1.1, and email test@example.com"
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("过多敏感信息");
    });

    it("应该区分大小写的文件扩展名", () => {
      const result1 = dlp.validateFileExport("report.XLSX", 1024, "Content");
      expect(result1.allowed).toBe(true);

      const result2 = dlp.validateFileExport("report.Xlsx", 1024, "Content");
      expect(result2.allowed).toBe(true);
    });
  });

  describe("合规事件日志", () => {
    it("应该生成唯一的事件ID", () => {
      const event1 = dlp.logComplianceEvent("export", { type: "email" });
      const event2 = dlp.logComplianceEvent("export", { type: "email" });

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it("应该记录事件时间戳", () => {
      const event = dlp.logComplianceEvent("export", { type: "email" });
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it("应该标记事件为已记录", () => {
      const event = dlp.logComplianceEvent("export", { type: "email" });
      expect(event.logged).toBe(true);
    });

    it("应该生成格式正确的事件ID", () => {
      const event = dlp.logComplianceEvent("export", { type: "email" });
      expect(event.eventId).toMatch(/^evt_\d+_[a-z0-9]+$/);
    });
  });

  describe("集成测试", () => {
    it("应该完整处理邮件导出流程", () => {
      // 1. 检查发送者
      const whitelistCheck = dlp.checkCRMWhitelist("sales@company.com");
      expect(whitelistCheck.allowed).toBe(true);

      // 2. 审计内容
      const contentAudit = dlp.auditContent("Please see the price: $100");
      expect(contentAudit.isSensitive).toBe(true);
      expect(contentAudit.riskLevel).toBe("medium");

      // 3. 验证导出
      const exportValidation = dlp.validateEmailExport(
        "sales@company.com",
        ["recipient@company.com"],
        "Please see the price: $100"
      );
      expect(exportValidation.allowed).toBe(true);

      // 4. 记录事件
      const event = dlp.logComplianceEvent("email_export", {
        sender: "sales@company.com",
        riskLevel: contentAudit.riskLevel,
      });
      expect(event.logged).toBe(true);
    });

    it("应该完整处理文件导出流程", () => {
      // 1. 验证文件
      const fileValidation = dlp.validateFileExport(
        "report.xlsx",
        5 * 1024 * 1024,
        "Sales report with price $100"
      );
      expect(fileValidation.allowed).toBe(true);

      // 2. 审计内容
      const contentAudit = dlp.auditContent("Sales report with price $100");
      expect(contentAudit.isSensitive).toBe(true);

      // 3. 记录事件
      const event = dlp.logComplianceEvent("file_export", {
        fileName: "report.xlsx",
        riskLevel: contentAudit.riskLevel,
      });
      expect(event.logged).toBe(true);
    });
  });
});
