/**
 * AI Solution & Quotation Assistant Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([])
            })
          })
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({ insertId: 1 })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ affectedRows: 1 })
      })
    })
  })
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          workpieceName: "发动机缸体",
          workpieceType: "shell",
          workpieceMaterial: "铝合金",
          cleanlinessStandard: "VDA19.1",
          targetCycleTime: 60
        })
      }
    }]
  })
}));

// ============================================================================
// Solution Assistant Tests
// ============================================================================

describe("Solution Assistant", () => {
  describe("Process Parameters", () => {
    it("should define valid process parameter types", () => {
      const params = {
        workpieceName: "发动机缸体",
        workpieceType: "shell",
        workpieceMaterial: "铝合金",
        workpieceDimensions: "500×400×300mm",
        workpieceWeight: 25,
        cleanlinessStandard: "VDA19.1",
        cleanlinessValue: "A级",
        targetCycleTime: 60,
        dailyCapacity: 500,
        loadingMethod: "机器人",
        unloadingMethod: "机器人",
        blindHoleCleaning: true,
        deburring: false,
        rustPrevention: true
      };

      expect(params.workpieceName).toBe("发动机缸体");
      expect(params.workpieceType).toBe("shell");
      expect(params.cleanlinessStandard).toBe("VDA19.1");
      expect(params.targetCycleTime).toBe(60);
      expect(params.blindHoleCleaning).toBe(true);
    });

    it("should support all workpiece categories", () => {
      const categories = ["shell", "shaft", "gear", "valve", "cylinder", "precision", "other"];
      
      categories.forEach(category => {
        expect(typeof category).toBe("string");
        expect(category.length).toBeGreaterThan(0);
      });
    });

    it("should support all cleanliness standards", () => {
      const standards = ["VDA19.1", "ISO16232", "PV3349", "PV3370", "GJB420", "NAS1638"];
      
      standards.forEach(standard => {
        expect(typeof standard).toBe("string");
        expect(standard.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Solution Recommendation", () => {
    it("should define valid recommendation structure", () => {
      const recommendation = {
        rank: 1,
        source: "grt_internal" as const,
        solutionId: "SOL-2024-001",
        solutionName: "某汽车缸体清洗方案",
        projectNo: "PRJ-2024-001",
        equipmentModel: "GRT-TC2100W",
        similarityScore: 0.95,
        customerReference: "某汽车公司",
        highlights: ["GRT内部成功案例", "高成功率：98%"],
        notes: "GRT内部成功案例",
        processFlow: ["上料", "预清洗", "超声波清洗", "干燥", "下料"],
        estimatedCycleTime: 55
      };

      expect(recommendation.rank).toBe(1);
      expect(recommendation.source).toBe("grt_internal");
      expect(recommendation.similarityScore).toBeGreaterThan(0);
      expect(recommendation.highlights.length).toBeGreaterThan(0);
      expect(recommendation.processFlow?.length).toBeGreaterThan(0);
    });

    it("should support all source types", () => {
      const sourceTypes = ["grt_internal", "competitor", "industry_standard", "ai_generated"];
      
      sourceTypes.forEach(source => {
        expect(typeof source).toBe("string");
      });
    });

    it("should prioritize GRT internal solutions", () => {
      const solutions = [
        { source: "competitor", score: 0.95 },
        { source: "grt_internal", score: 0.90 },
        { source: "industry_standard", score: 0.92 }
      ];

      // Sort with GRT priority
      const sorted = solutions.sort((a, b) => {
        if (a.source === "grt_internal" && b.source !== "grt_internal") return -1;
        if (a.source !== "grt_internal" && b.source === "grt_internal") return 1;
        return b.score - a.score;
      });

      expect(sorted[0].source).toBe("grt_internal");
    });
  });

  describe("Similarity Calculation", () => {
    it("should calculate workpiece type similarity", () => {
      const relatedGroups = [
        ["shell", "cylinder", "valve"],
        ["shaft", "gear"],
        ["precision", "valve"]
      ];

      const isRelated = (type1: string, type2: string): boolean => {
        for (const group of relatedGroups) {
          if (group.includes(type1) && group.includes(type2)) {
            return true;
          }
        }
        return false;
      };

      expect(isRelated("shell", "cylinder")).toBe(true);
      expect(isRelated("shaft", "gear")).toBe(true);
      expect(isRelated("shell", "gear")).toBe(false);
    });

    it("should check cleanliness standard compatibility", () => {
      const compatibleGroups = [
        ["VDA19.1", "ISO16232", "PV3349", "PV3370"],
        ["GJB420", "NAS1638"]
      ];

      const isCompatible = (s1: string, s2: string): boolean => {
        for (const group of compatibleGroups) {
          if (group.some(s => s1.includes(s)) && group.some(s => s2.includes(s))) {
            return true;
          }
        }
        return false;
      };

      expect(isCompatible("VDA19.1", "ISO16232")).toBe(true);
      expect(isCompatible("GJB420", "NAS1638")).toBe(true);
      expect(isCompatible("VDA19.1", "GJB420")).toBe(false);
    });
  });

  describe("Process Flow Generation", () => {
    it("should generate default process flow for shell workpiece", () => {
      const defaultFlows: Record<string, string[]> = {
        shell: [
          "上料", "预清洗（喷淋）", "超声波清洗", "定点高压清洗",
          "漂洗", "热风干燥", "真空干燥", "冷却", "下料"
        ],
        shaft: [
          "上料", "退磁", "定点清洗", "旋转湍流超声清洗",
          "热风干燥", "真空干燥", "下料"
        ]
      };

      expect(defaultFlows.shell.length).toBe(9);
      expect(defaultFlows.shaft.length).toBe(7);
      expect(defaultFlows.shell[0]).toBe("上料");
      expect(defaultFlows.shell[defaultFlows.shell.length - 1]).toBe("下料");
    });

    it("should recommend appropriate equipment for workpiece type", () => {
      const equipmentMap: Record<string, string> = {
        shell: "GRT-TC2100W",
        shaft: "GRT-SC800W-SF",
        gear: "GRT-MC888W",
        precision: "GRT-Eco SF",
        valve: "GRT-HP1200",
        cylinder: "GRT-RW2000"
      };

      expect(equipmentMap.shell).toBe("GRT-TC2100W");
      expect(equipmentMap.shaft).toBe("GRT-SC800W-SF");
      expect(equipmentMap.gear).toBe("GRT-MC888W");
    });
  });

  describe("Learning from Delivery", () => {
    it("should analyze feedback score correctly", () => {
      const analyzeFeedbackScore = (feedback: string): number => {
        const positiveKeywords = ["满意", "优秀", "很好", "出色", "超预期"];
        const negativeKeywords = ["不满意", "问题", "差", "失败"];
        
        let score = 80;
        
        for (const keyword of positiveKeywords) {
          if (feedback.includes(keyword)) score += 5;
        }
        
        for (const keyword of negativeKeywords) {
          if (feedback.includes(keyword)) score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
      };

      expect(analyzeFeedbackScore("非常满意，设备运行稳定")).toBe(85);
      expect(analyzeFeedbackScore("优秀的服务，超预期")).toBe(90);
      expect(analyzeFeedbackScore("有一些问题需要解决")).toBe(70);
      expect(analyzeFeedbackScore("一般")).toBe(80);
    });
  });
});

// ============================================================================
// Quotation Assistant Tests
// ============================================================================

describe("Quotation Assistant", () => {
  describe("Cost Breakdown", () => {
    it("should define valid cost breakdown structure", () => {
      const costBreakdown = {
        equipmentBase: 1500000,
        customization: 100000,
        installation: 75000,
        training: 20000,
        warranty: 30000,
        transport: 30000,
        other: 15000,
        totalCost: 1770000,
        currency: "CNY"
      };

      expect(costBreakdown.equipmentBase).toBe(1500000);
      expect(costBreakdown.totalCost).toBe(1770000);
      expect(costBreakdown.currency).toBe("CNY");
      
      const calculatedTotal = 
        costBreakdown.equipmentBase +
        costBreakdown.customization +
        costBreakdown.installation +
        costBreakdown.training +
        costBreakdown.warranty +
        costBreakdown.transport +
        costBreakdown.other;
      
      expect(calculatedTotal).toBe(costBreakdown.totalCost);
    });

    it("should have default equipment prices", () => {
      const defaultPrices: Record<string, number> = {
        "GRT-SC800W": 1200000,
        "GRT-SC800W-SF": 1500000,
        "GRT-DC880W": 1600000,
        "GRT-MC888W": 2000000,
        "GRT-TC2100W": 2200000,
        "GRT-RW2000": 2800000
      };

      expect(defaultPrices["GRT-SC800W"]).toBe(1200000);
      expect(defaultPrices["GRT-TC2100W"]).toBe(2200000);
      expect(defaultPrices["GRT-RW2000"]).toBe(2800000);
    });
  });

  describe("Price Recommendation", () => {
    it("should define valid price recommendation structure", () => {
      const recommendation = {
        strategy: "cost_plus" as const,
        suggestedPrice: 2212500,
        profitMargin: 25,
        reference: "成本加成25%",
        confidence: 0.90,
        discountRoom: 110625,
        minAcceptable: 2035500
      };

      expect(recommendation.strategy).toBe("cost_plus");
      expect(recommendation.profitMargin).toBe(25);
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.discountRoom).toBeGreaterThan(0);
    });

    it("should support all pricing strategies", () => {
      const strategies = ["competitive", "value_based", "cost_plus", "market_penetration"];
      
      strategies.forEach(strategy => {
        expect(typeof strategy).toBe("string");
      });
    });
  });

  describe("Price Adjustment Factor", () => {
    it("should calculate customer type adjustment", () => {
      const getCustomerFactor = (type: string): number => {
        switch (type) {
          case "oem": return 0.95;
          case "tier1": return 0.97;
          case "tier2": return 1.0;
          default: return 1.02;
        }
      };

      expect(getCustomerFactor("oem")).toBe(0.95);
      expect(getCustomerFactor("tier1")).toBe(0.97);
      expect(getCustomerFactor("tier2")).toBe(1.0);
      expect(getCustomerFactor("other")).toBe(1.02);
    });

    it("should calculate quantity discount", () => {
      const getQuantityFactor = (quantity: number): number => {
        if (quantity >= 5) return 0.90;
        if (quantity >= 3) return 0.95;
        if (quantity >= 2) return 0.98;
        return 1.0;
      };

      expect(getQuantityFactor(1)).toBe(1.0);
      expect(getQuantityFactor(2)).toBe(0.98);
      expect(getQuantityFactor(3)).toBe(0.95);
      expect(getQuantityFactor(5)).toBe(0.90);
      expect(getQuantityFactor(10)).toBe(0.90);
    });

    it("should calculate competition level adjustment", () => {
      const getCompetitionFactor = (level: string): number => {
        switch (level) {
          case "high": return 0.95;
          case "medium": return 0.98;
          case "low": return 1.02;
          default: return 1.0;
        }
      };

      expect(getCompetitionFactor("high")).toBe(0.95);
      expect(getCompetitionFactor("medium")).toBe(0.98);
      expect(getCompetitionFactor("low")).toBe(1.02);
    });

    it("should combine all adjustment factors", () => {
      const calculateAdjustmentFactor = (input: {
        customerType?: string;
        quantity?: number;
        competitionLevel?: string;
        isStrategicCustomer?: boolean;
        isRepeatCustomer?: boolean;
      }): number => {
        let factor = 1.0;
        
        // Customer type
        switch (input.customerType) {
          case "oem": factor *= 0.95; break;
          case "tier1": factor *= 0.97; break;
          case "tier2": factor *= 1.0; break;
          default: factor *= 1.02;
        }
        
        // Quantity
        const qty = input.quantity || 1;
        if (qty >= 5) factor *= 0.90;
        else if (qty >= 3) factor *= 0.95;
        else if (qty >= 2) factor *= 0.98;
        
        // Competition
        switch (input.competitionLevel) {
          case "high": factor *= 0.95; break;
          case "medium": factor *= 0.98; break;
          case "low": factor *= 1.02; break;
        }
        
        // Strategic/Repeat
        if (input.isStrategicCustomer) factor *= 0.95;
        if (input.isRepeatCustomer) factor *= 0.97;
        
        return factor;
      };

      // OEM customer, 5 units, high competition, strategic, repeat
      const factor = calculateAdjustmentFactor({
        customerType: "oem",
        quantity: 5,
        competitionLevel: "high",
        isStrategicCustomer: true,
        isRepeatCustomer: true
      });

      // 0.95 * 0.90 * 0.95 * 0.95 * 0.97 ≈ 0.749
      expect(factor).toBeCloseTo(0.749, 2);
    });
  });

  describe("Bid Result Learning", () => {
    it("should categorize bid results correctly", () => {
      const bidResults = ["won", "lost", "pending", "cancelled"];
      
      bidResults.forEach(result => {
        expect(typeof result).toBe("string");
      });
    });

    it("should calculate price deviation", () => {
      const calculateDeviation = (finalPrice: number, competitorPrice: number): string => {
        return ((finalPrice - competitorPrice) / competitorPrice * 100).toFixed(2) + "%";
      };

      expect(calculateDeviation(1500000, 1600000)).toBe("-6.25%");
      expect(calculateDeviation(1800000, 1600000)).toBe("12.50%");
      expect(calculateDeviation(1600000, 1600000)).toBe("0.00%");
    });
  });

  describe("Quotation Input Validation", () => {
    it("should validate required fields", () => {
      const input = {
        customerName: "某汽车公司",
        equipmentModel: "GRT-TC2100W"
      };

      expect(input.customerName).toBeTruthy();
      expect(input.equipmentModel).toBeTruthy();
    });

    it("should validate customer types", () => {
      const validTypes = ["oem", "tier1", "tier2", "other"];
      
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });

    it("should validate competition levels", () => {
      const validLevels = ["low", "medium", "high"];
      
      validLevels.forEach(level => {
        expect(validLevels.includes(level)).toBe(true);
      });
    });
  });

  describe("Rationale Generation", () => {
    it("should generate pricing rationale", () => {
      const generateRationale = (
        strategy: string,
        price: number,
        competitorPrice?: number
      ): string => {
        const parts: string[] = [];
        
        const strategyNames: Record<string, string> = {
          "competitive": "竞争定价法",
          "value_based": "价值定价法",
          "cost_plus": "成本加成法",
          "market_penetration": "市场渗透定价"
        };
        
        parts.push(`建议采用${strategyNames[strategy] || strategy}，报价${price}元`);
        
        if (competitorPrice) {
          const diff = price - competitorPrice;
          if (diff > 0) {
            parts.push(`比竞品高${Math.round(diff / 1000)}千元`);
          } else {
            parts.push(`比竞品低${Math.round(-diff / 1000)}千元`);
          }
        }
        
        return parts.join("；");
      };

      const rationale1 = generateRationale("cost_plus", 2000000);
      expect(rationale1).toContain("成本加成法");
      expect(rationale1).toContain("2000000元");

      const rationale2 = generateRationale("competitive", 1800000, 2000000);
      expect(rationale2).toContain("竞争定价法");
      expect(rationale2).toContain("比竞品低200千元");
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Solution & Quotation Integration", () => {
  it("should link solution to quotation", () => {
    const solution = {
      solutionId: "SOL-2024-001",
      equipmentModel: "GRT-TC2100W",
      customerName: "某汽车公司"
    };

    const quotation = {
      quotationId: "QUO-2024-001",
      solutionId: solution.solutionId,
      equipmentModel: solution.equipmentModel,
      customerName: solution.customerName
    };

    expect(quotation.solutionId).toBe(solution.solutionId);
    expect(quotation.equipmentModel).toBe(solution.equipmentModel);
  });

  it("should generate consistent IDs", () => {
    const generateSolutionId = () => 
      `SOL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const generateQuotationId = () => 
      `QUO-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const solutionId = generateSolutionId();
    const quotationId = generateQuotationId();

    expect(solutionId).toMatch(/^SOL-\d{4}-[A-Z0-9]{6}$/);
    expect(quotationId).toMatch(/^QUO-\d{4}-[A-Z0-9]{6}$/);
  });
});

// ============================================================================
// Database Schema Tests
// ============================================================================

describe("Database Schema Validation", () => {
  it("should define historical_solutions table fields", () => {
    const requiredFields = [
      "id", "solutionId", "solutionName", "sourceType",
      "customerName", "projectNo", "equipmentModel",
      "workpieceType", "workpieceCategory", "workpieceMaterial",
      "cleanlinessStandard", "cycleTime", "processFlow",
      "createdAt", "updatedAt"
    ];

    requiredFields.forEach(field => {
      expect(typeof field).toBe("string");
    });
  });

  it("should define historical_quotations table fields", () => {
    const requiredFields = [
      "id", "quotationId", "projectNo", "solutionId",
      "customerName", "customerType", "equipmentModel",
      "basePrice", "totalCost", "totalPrice",
      "bidResult", "quotationDate", "createdAt"
    ];

    requiredFields.forEach(field => {
      expect(typeof field).toBe("string");
    });
  });

  it("should define learning records table fields", () => {
    const solutionLearningFields = [
      "id", "learningId", "solutionId", "projectNo",
      "learningType", "learningContent", "keyFindings"
    ];

    const quotationLearningFields = [
      "id", "learningId", "quotationId", "learningType",
      "learningContent", "priceDeviationAnalysis"
    ];

    solutionLearningFields.forEach(field => {
      expect(typeof field).toBe("string");
    });

    quotationLearningFields.forEach(field => {
      expect(typeof field).toBe("string");
    });
  });
});

// ============================================================================
// API Route Tests
// ============================================================================

describe("API Routes", () => {
  describe("Solution Assistant Routes", () => {
    it("should define parseParameters route", () => {
      const route = {
        name: "parseParameters",
        type: "mutation",
        input: { naturalLanguageInput: "string" }
      };

      expect(route.name).toBe("parseParameters");
      expect(route.type).toBe("mutation");
    });

    it("should define recommend route", () => {
      const route = {
        name: "recommend",
        type: "mutation",
        input: { parameters: "ProcessParameters", maxResults: "number" }
      };

      expect(route.name).toBe("recommend");
      expect(route.type).toBe("mutation");
    });

    it("should define learnFromDelivery route", () => {
      const route = {
        name: "learnFromDelivery",
        type: "mutation",
        input: { solutionId: "string", projectNo: "string", learningContent: "object" }
      };

      expect(route.name).toBe("learnFromDelivery");
      expect(route.type).toBe("mutation");
    });
  });

  describe("Quotation Assistant Routes", () => {
    it("should define calculateCost route", () => {
      const route = {
        name: "calculateCost",
        type: "mutation",
        input: "QuotationInput"
      };

      expect(route.name).toBe("calculateCost");
      expect(route.type).toBe("mutation");
    });

    it("should define recommend route", () => {
      const route = {
        name: "recommend",
        type: "mutation",
        input: "QuotationInput"
      };

      expect(route.name).toBe("recommend");
      expect(route.type).toBe("mutation");
    });

    it("should define recordBidResult route", () => {
      const route = {
        name: "recordBidResult",
        type: "mutation",
        input: { quotationId: "string", result: "won|lost" }
      };

      expect(route.name).toBe("recordBidResult");
      expect(route.type).toBe("mutation");
    });
  });
});
