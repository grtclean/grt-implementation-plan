/**
 * 项目生命周期安全检查点单元测试
 * 
 * 测试覆盖:
 * 1. M0阶段检查
 * 2. M2阶段检查
 * 3. M4阶段检查
 * 4. M6阶段检查
 * 5. M8阶段检查
 * 6. M12阶段检查
 */

import { describe, it, expect, beforeEach } from "vitest";

/**
 * 生命周期安全检查点
 */
class LifecycleSecurityGates {
  /**
   * M0阶段检查：销售人员访问、提案审计、PDF水印
   */
  checkM0Gate(data: {
    salesPersonEmail: string;
    proposalContent: string;
    hasPDFWatermark: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. 销售人员邮箱验证
    checks.salesPersonEmailValid = /^[a-zA-Z0-9._%+-]+@company\.com$/.test(
      data.salesPersonEmail
    );
    if (!checks.salesPersonEmailValid) {
      issues.push("销售人员邮箱不是公司邮箱");
    }

    // 2. 提案内容审计
    checks.proposalContentValid = data.proposalContent && data.proposalContent.length > 100;
    if (!checks.proposalContentValid) {
      issues.push("提案内容不足或为空");
    }

    // 3. PDF水印检查
    checks.pdfWatermarkPresent = data.hasPDFWatermark;
    if (!checks.pdfWatermarkPresent) {
      issues.push("提案PDF缺少水印");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * M2阶段检查：项目UUID生成、ACL更新、权限配置
   */
  checkM2Gate(data: {
    projectUUID: string;
    aclUpdated: boolean;
    permissionsConfigured: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. 项目UUID验证
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    checks.projectUUIDValid = uuidRegex.test(data.projectUUID);
    if (!checks.projectUUIDValid) {
      issues.push("项目UUID格式不正确");
    }

    // 2. ACL更新检查
    checks.aclUpdated = data.aclUpdated;
    if (!checks.aclUpdated) {
      issues.push("ACL未更新");
    }

    // 3. 权限配置检查
    checks.permissionsConfigured = data.permissionsConfigured;
    if (!checks.permissionsConfigured) {
      issues.push("权限未配置");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * M4阶段检查：CAD合规扫描、敏感组件验证
   */
  checkM4Gate(data: {
    cadFileScanned: boolean;
    complianceCheckPassed: boolean;
    sensitiveComponentsValidated: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. CAD文件扫描
    checks.cadFileScanned = data.cadFileScanned;
    if (!checks.cadFileScanned) {
      issues.push("CAD文件未扫描");
    }

    // 2. 合规检查
    checks.complianceCheckPassed = data.complianceCheckPassed;
    if (!checks.complianceCheckPassed) {
      issues.push("合规检查失败");
    }

    // 3. 敏感组件验证
    checks.sensitiveComponentsValidated = data.sensitiveComponentsValidated;
    if (!checks.sensitiveComponentsValidated) {
      issues.push("敏感组件未验证");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * M6阶段检查：供应商邮箱验证、Excel加密、密码发送
   */
  checkM6Gate(data: {
    supplierEmails: string[];
    excelEncrypted: boolean;
    passwordSentSecurely: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. 供应商邮箱验证
    checks.supplierEmailsValid =
      data.supplierEmails.length > 0 &&
      data.supplierEmails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!checks.supplierEmailsValid) {
      issues.push("供应商邮箱格式不正确或为空");
    }

    // 2. Excel加密检查
    checks.excelEncrypted = data.excelEncrypted;
    if (!checks.excelEncrypted) {
      issues.push("Excel文件未加密");
    }

    // 3. 密码安全发送检查
    checks.passwordSentSecurely = data.passwordSentSecurely;
    if (!checks.passwordSentSecurely) {
      issues.push("密码未通过安全通道发送");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * M8阶段检查：PLC设备IP验证、单向数据流配置
   */
  checkM8Gate(data: {
    plcDeviceIPs: string[];
    ipRangeValid: boolean;
    unidirectionalDataFlowConfigured: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. PLC设备IP验证
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    checks.plcDeviceIPsValid =
      data.plcDeviceIPs.length > 0 && data.plcDeviceIPs.every((ip) => ipRegex.test(ip));
    if (!checks.plcDeviceIPsValid) {
      issues.push("PLC设备IP格式不正确");
    }

    // 2. IP范围验证
    checks.ipRangeValid = data.ipRangeValid;
    if (!checks.ipRangeValid) {
      issues.push("IP地址超出允许范围");
    }

    // 3. 单向数据流配置
    checks.unidirectionalDataFlowConfigured = data.unidirectionalDataFlowConfigured;
    if (!checks.unidirectionalDataFlowConfigured) {
      issues.push("单向数据流未配置");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * M12阶段检查：审计日志生成、数据访问记录导出
   */
  checkM12Gate(data: {
    auditLogGenerated: boolean;
    auditLogComplete: boolean;
    dataAccessRecordsExported: boolean;
  }): {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // 1. 审计日志生成
    checks.auditLogGenerated = data.auditLogGenerated;
    if (!checks.auditLogGenerated) {
      issues.push("审计日志未生成");
    }

    // 2. 审计日志完整性
    checks.auditLogComplete = data.auditLogComplete;
    if (!checks.auditLogComplete) {
      issues.push("审计日志不完整");
    }

    // 3. 数据访问记录导出
    checks.dataAccessRecordsExported = data.dataAccessRecordsExported;
    if (!checks.dataAccessRecordsExported) {
      issues.push("数据访问记录未导出");
    }

    const passed = Object.values(checks).every((v) => v);

    return { passed, checks, issues };
  }

  /**
   * 执行生命周期安全检查点
   */
  executeLifecycleSecurityGate(stage: string, data: any): {
    stage: string;
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  } {
    let result;

    switch (stage) {
      case "M0":
        result = this.checkM0Gate(data);
        break;
      case "M2":
        result = this.checkM2Gate(data);
        break;
      case "M4":
        result = this.checkM4Gate(data);
        break;
      case "M6":
        result = this.checkM6Gate(data);
        break;
      case "M8":
        result = this.checkM8Gate(data);
        break;
      case "M12":
        result = this.checkM12Gate(data);
        break;
      default:
        throw new Error(`未知的阶段: ${stage}`);
    }

    return {
      stage,
      ...result,
    };
  }

  /**
   * 获取生命周期安全检查清单
   */
  getLifecycleSecurityChecklist(): Record<string, string[]> {
    return {
      M0: [
        "销售人员邮箱验证",
        "提案内容审计",
        "PDF水印检查",
      ],
      M2: [
        "项目UUID生成",
        "ACL更新",
        "权限配置",
      ],
      M4: [
        "CAD文件扫描",
        "合规检查",
        "敏感组件验证",
      ],
      M6: [
        "供应商邮箱验证",
        "Excel加密",
        "密码安全发送",
      ],
      M8: [
        "PLC设备IP验证",
        "IP范围检查",
        "单向数据流配置",
      ],
      M12: [
        "审计日志生成",
        "审计日志完整性",
        "数据访问记录导出",
      ],
    };
  }
}

// ============================================================================
// 单元测试
// ============================================================================

describe("LifecycleSecurityGates", () => {
  let gates: LifecycleSecurityGates;

  beforeEach(() => {
    gates = new LifecycleSecurityGates();
  });

  describe("M0阶段检查", () => {
    it("应该通过有效的M0检查", () => {
      const result = gates.checkM0Gate({
        salesPersonEmail: "john.doe@company.com",
        proposalContent: "This is a detailed proposal with more than 100 characters...",
        hasPDFWatermark: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝无效的销售人员邮箱", () => {
      const result = gates.checkM0Gate({
        salesPersonEmail: "john@external.com",
        proposalContent: "This is a detailed proposal with more than 100 characters...",
        hasPDFWatermark: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("销售人员邮箱不是公司邮箱");
    });

    it("应该拒绝缺少PDF水印的提案", () => {
      const result = gates.checkM0Gate({
        salesPersonEmail: "john.doe@company.com",
        proposalContent: "This is a detailed proposal with more than 100 characters...",
        hasPDFWatermark: false,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("提案PDF缺少水印");
    });

    it("应该拒绝内容不足的提案", () => {
      const result = gates.checkM0Gate({
        salesPersonEmail: "john.doe@company.com",
        proposalContent: "Short",
        hasPDFWatermark: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("提案内容不足或为空");
    });
  });

  describe("M2阶段检查", () => {
    it("应该通过有效的M2检查", () => {
      const result = gates.checkM2Gate({
        projectUUID: "550e8400-e29b-41d4-a716-446655440000",
        aclUpdated: true,
        permissionsConfigured: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝无效的UUID格式", () => {
      const result = gates.checkM2Gate({
        projectUUID: "invalid-uuid",
        aclUpdated: true,
        permissionsConfigured: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("项目UUID格式不正确");
    });

    it("应该拒绝未更新ACL的项目", () => {
      const result = gates.checkM2Gate({
        projectUUID: "550e8400-e29b-41d4-a716-446655440000",
        aclUpdated: false,
        permissionsConfigured: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("ACL未更新");
    });

    it("应该拒绝未配置权限的项目", () => {
      const result = gates.checkM2Gate({
        projectUUID: "550e8400-e29b-41d4-a716-446655440000",
        aclUpdated: true,
        permissionsConfigured: false,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("权限未配置");
    });
  });

  describe("M4阶段检查", () => {
    it("应该通过有效的M4检查", () => {
      const result = gates.checkM4Gate({
        cadFileScanned: true,
        complianceCheckPassed: true,
        sensitiveComponentsValidated: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝未扫描的CAD文件", () => {
      const result = gates.checkM4Gate({
        cadFileScanned: false,
        complianceCheckPassed: true,
        sensitiveComponentsValidated: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("CAD文件未扫描");
    });

    it("应该拒绝合规检查失败的项目", () => {
      const result = gates.checkM4Gate({
        cadFileScanned: true,
        complianceCheckPassed: false,
        sensitiveComponentsValidated: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("合规检查失败");
    });
  });

  describe("M6阶段检查", () => {
    it("应该通过有效的M6检查", () => {
      const result = gates.checkM6Gate({
        supplierEmails: ["supplier1@company.com", "supplier2@company.com"],
        excelEncrypted: true,
        passwordSentSecurely: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝无效的供应商邮箱", () => {
      const result = gates.checkM6Gate({
        supplierEmails: ["invalid-email"],
        excelEncrypted: true,
        passwordSentSecurely: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("供应商邮箱格式不正确或为空");
    });

    it("应该拒绝未加密的Excel文件", () => {
      const result = gates.checkM6Gate({
        supplierEmails: ["supplier@company.com"],
        excelEncrypted: false,
        passwordSentSecurely: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("Excel文件未加密");
    });

    it("应该拒绝未通过安全通道发送的密码", () => {
      const result = gates.checkM6Gate({
        supplierEmails: ["supplier@company.com"],
        excelEncrypted: true,
        passwordSentSecurely: false,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("密码未通过安全通道发送");
    });
  });

  describe("M8阶段检查", () => {
    it("应该通过有效的M8检查", () => {
      const result = gates.checkM8Gate({
        plcDeviceIPs: ["192.168.1.100", "192.168.1.101"],
        ipRangeValid: true,
        unidirectionalDataFlowConfigured: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝无效的PLC设备IP", () => {
      const result = gates.checkM8Gate({
        plcDeviceIPs: ["invalid-ip"],
        ipRangeValid: true,
        unidirectionalDataFlowConfigured: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("PLC设备IP格式不正确");
    });

    it("应该拒绝超出范围的IP地址", () => {
      const result = gates.checkM8Gate({
        plcDeviceIPs: ["192.168.1.100"],
        ipRangeValid: false,
        unidirectionalDataFlowConfigured: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("IP地址超出允许范围");
    });

    it("应该拒绝未配置单向数据流的项目", () => {
      const result = gates.checkM8Gate({
        plcDeviceIPs: ["192.168.1.100"],
        ipRangeValid: true,
        unidirectionalDataFlowConfigured: false,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("单向数据流未配置");
    });
  });

  describe("M12阶段检查", () => {
    it("应该通过有效的M12检查", () => {
      const result = gates.checkM12Gate({
        auditLogGenerated: true,
        auditLogComplete: true,
        dataAccessRecordsExported: true,
      });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("应该拒绝未生成审计日志的项目", () => {
      const result = gates.checkM12Gate({
        auditLogGenerated: false,
        auditLogComplete: true,
        dataAccessRecordsExported: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("审计日志未生成");
    });

    it("应该拒绝不完整的审计日志", () => {
      const result = gates.checkM12Gate({
        auditLogGenerated: true,
        auditLogComplete: false,
        dataAccessRecordsExported: true,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("审计日志不完整");
    });

    it("应该拒绝未导出数据访问记录的项目", () => {
      const result = gates.checkM12Gate({
        auditLogGenerated: true,
        auditLogComplete: true,
        dataAccessRecordsExported: false,
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContain("数据访问记录未导出");
    });
  });

  describe("执行生命周期安全检查点", () => {
    it("应该正确执行M0检查", () => {
      const result = gates.executeLifecycleSecurityGate("M0", {
        salesPersonEmail: "john.doe@company.com",
        proposalContent: "This is a detailed proposal with more than 100 characters...",
        hasPDFWatermark: true,
      });

      expect(result.stage).toBe("M0");
      expect(result.passed).toBe(true);
    });

    it("应该正确执行M2检查", () => {
      const result = gates.executeLifecycleSecurityGate("M2", {
        projectUUID: "550e8400-e29b-41d4-a716-446655440000",
        aclUpdated: true,
        permissionsConfigured: true,
      });

      expect(result.stage).toBe("M2");
      expect(result.passed).toBe(true);
    });

    it("应该抛出未知阶段错误", () => {
      expect(() => {
        gates.executeLifecycleSecurityGate("M99", {});
      }).toThrow("未知的阶段: M99");
    });
  });

  describe("生命周期安全检查清单", () => {
    it("应该返回完整的检查清单", () => {
      const checklist = gates.getLifecycleSecurityChecklist();

      expect(checklist).toHaveProperty("M0");
      expect(checklist).toHaveProperty("M2");
      expect(checklist).toHaveProperty("M4");
      expect(checklist).toHaveProperty("M6");
      expect(checklist).toHaveProperty("M8");
      expect(checklist).toHaveProperty("M12");
    });

    it("应该为每个阶段提供检查项", () => {
      const checklist = gates.getLifecycleSecurityChecklist();

      for (const stage of Object.keys(checklist)) {
        expect(Array.isArray(checklist[stage])).toBe(true);
        expect(checklist[stage].length).toBeGreaterThan(0);
      }
    });
  });
});
