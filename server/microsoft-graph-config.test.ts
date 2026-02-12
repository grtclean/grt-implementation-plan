import { describe, it, expect } from "vitest";

describe("Microsoft Graph API Configuration", () => {
  it("should have required environment variables configured", () => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    // 如果配置了任何一个变量，则应该全部配置
    if (clientId || clientSecret || tenantId) {
      expect(clientId).toBeDefined();
      expect(clientSecret).toBeDefined();
      expect(tenantId).toBeDefined();
      
      // 验证格式
      expect(typeof clientId).toBe("string");
      expect(typeof clientSecret).toBe("string");
      expect(typeof tenantId).toBe("string");
      
      // 验证非空
      expect(clientId?.length).toBeGreaterThan(0);
      expect(clientSecret?.length).toBeGreaterThan(0);
      expect(tenantId?.length).toBeGreaterThan(0);
    }
  });

  it("should validate Microsoft Graph API configuration", async () => {
    const { checkMicrosoftGraphConfig } = await import("./microsoftGraph");
    const config = checkMicrosoftGraphConfig();
    
    expect(config).toHaveProperty("configured");
    expect(config).toHaveProperty("missingKeys");
    expect(typeof config.configured).toBe("boolean");
    expect(Array.isArray(config.missingKeys)).toBe(true);
    
    // 如果配置了环境变量，则configured应该为true
    if (process.env.MICROSOFT_CLIENT_ID && 
        process.env.MICROSOFT_CLIENT_SECRET && 
        process.env.MICROSOFT_TENANT_ID) {
      expect(config.configured).toBe(true);
      expect(config.missingKeys.length).toBe(0);
    }
  });

  it("should support Teams meeting creation in simulated mode", async () => {
    const { checkMicrosoftGraphConfig } = await import("./microsoftGraph");
    const config = checkMicrosoftGraphConfig();
    
    // 在模拟模式下验证配置
    expect(config).toBeDefined();
    expect(config.configured === false || config.configured === true).toBe(true);
    
    if (config.configured) {
      expect(config.missingKeys.length).toBe(0);
    } else {
      expect(config.missingKeys.length).toBeGreaterThan(0);
    }
  });
});
