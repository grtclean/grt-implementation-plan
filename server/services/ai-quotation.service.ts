/**
 * AI报价助手服务
 * 智能报价生成，基于历史数据和成本模型
 */

import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-quotation");

export interface QuotationRequest {
  solutionId: string;
  equipmentType: string;
  customizations: string[];
  quantity: number;
  deliveryLocation: string;
  urgency: 'normal' | 'urgent' | 'very_urgent';
}

export interface QuotationItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'equipment' | 'installation' | 'training' | 'warranty' | 'other';
}

export interface Quotation {
  id: string;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  discountReason?: string;
  tax: number;
  total: number;
  deliveryTime: string;
  paymentTerms: string;
  notes: string[];
  confidence: number;
}

// 基础成本数据（年度确定）
const baseCosts = {
  laborHourRate: 150,        // 工时费率（元/小时）
  overheadRate: 0.25,        // 管理费率
  profitMargin: 0.15,        // 利润率
  installationRate: 0.08,    // 安装费率
  trainingRate: 0.03,        // 培训费率
  warrantyRate: 0.05         // 质保费率
};

// 设备基础价格表
const equipmentPrices: Record<string, number> = {
  "GRT-USC-1000": 280000,
  "GRT-USC-2000": 450000,
  "GRT-USC-3000": 680000,
  "GRT-VUC-1000": 350000,
  "GRT-VUC-2000": 580000,
  "GRT-WBC-1000": 220000,
  "GRT-WBC-1500": 320000,
  "GRT-SPC-2000": 380000,
  "GRT-HYB-2000": 550000,
  "GRT-HYB-3000": 780000
};

/**
 * 生成智能报价
 */
export async function generateQuotation(
  request: QuotationRequest
): Promise<Quotation> {
  try {
    // 获取设备基础价格
    const basePrice = equipmentPrices[request.equipmentType] || 500000;
    
    // 计算定制化附加费用
    const customizationCost = calculateCustomizationCost(request.customizations, basePrice);
    
    // 使用AI优化报价
    const aiSuggestions = await getAIQuotationSuggestions(request, basePrice);
    
    // 构建报价明细
    const items: QuotationItem[] = [
      {
        name: `${request.equipmentType} 清洗设备`,
        description: "主设备及标准配置",
        quantity: request.quantity,
        unitPrice: basePrice,
        totalPrice: basePrice * request.quantity,
        category: 'equipment'
      }
    ];

    // 添加定制化项目
    if (request.customizations.length > 0) {
      items.push({
        name: "定制化配置",
        description: request.customizations.join(", "),
        quantity: 1,
        unitPrice: customizationCost,
        totalPrice: customizationCost,
        category: 'equipment'
      });
    }

    // 添加安装费
    const equipmentTotal = items.reduce((sum, item) => 
      item.category === 'equipment' ? sum + item.totalPrice : sum, 0);
    
    items.push({
      name: "安装调试费",
      description: "现场安装、调试及验收",
      quantity: 1,
      unitPrice: equipmentTotal * baseCosts.installationRate,
      totalPrice: equipmentTotal * baseCosts.installationRate,
      category: 'installation'
    });

    // 添加培训费
    items.push({
      name: "操作培训费",
      description: "操作人员培训及技术支持",
      quantity: 1,
      unitPrice: equipmentTotal * baseCosts.trainingRate,
      totalPrice: equipmentTotal * baseCosts.trainingRate,
      category: 'training'
    });

    // 添加质保费
    items.push({
      name: "延保服务费",
      description: "两年延长质保服务",
      quantity: 1,
      unitPrice: equipmentTotal * baseCosts.warrantyRate,
      totalPrice: equipmentTotal * baseCosts.warrantyRate,
      category: 'warranty'
    });

    // 计算小计
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // 计算折扣
    let discount = 0;
    let discountReason: string | undefined;
    
    if (request.quantity >= 3) {
      discount = subtotal * 0.05;
      discountReason = "批量采购优惠";
    } else if (aiSuggestions.suggestedDiscount > 0) {
      discount = subtotal * (aiSuggestions.suggestedDiscount / 100);
      discountReason = aiSuggestions.discountReason;
    }

    // 计算税费
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.13;

    // 计算总价
    const total = taxableAmount + tax;

    // 计算交付时间
    let deliveryTime = "8-10周";
    if (request.urgency === 'urgent') {
      deliveryTime = "6-8周（加急）";
    } else if (request.urgency === 'very_urgent') {
      deliveryTime = "4-6周（特急）";
    }

    return {
      id: `QUO-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      subtotal,
      discount,
      discountReason,
      tax,
      total,
      deliveryTime,
      paymentTerms: "30%预付款，60%发货前，10%验收后",
      notes: aiSuggestions.notes,
      confidence: aiSuggestions.confidence
    };
  } catch (error) {
    log.error({ err: error }, "AI quotation generation error");
    throw error;
  }
}

/**
 * 计算定制化成本
 */
function calculateCustomizationCost(customizations: string[], basePrice: number): number {
  const customizationRates: Record<string, number> = {
    "自动上下料": 0.15,
    "机器人集成": 0.25,
    "MES系统对接": 0.08,
    "远程监控": 0.05,
    "防爆设计": 0.20,
    "不锈钢材质升级": 0.12,
    "多工位设计": 0.18,
    "真空干燥": 0.10
  };

  return customizations.reduce((total, custom) => {
    const rate = customizationRates[custom] || 0.05;
    return total + basePrice * rate;
  }, 0);
}

/**
 * 获取AI报价建议
 */
async function getAIQuotationSuggestions(
  request: QuotationRequest,
  basePrice: number
): Promise<{
  suggestedDiscount: number;
  discountReason?: string;
  notes: string[];
  confidence: number;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是GRT公司的AI报价助手，负责优化报价策略。
分析客户需求，提供：
1. 建议折扣（0-10%）
2. 折扣理由
3. 报价注意事项
4. 置信度评估`
        },
        {
          role: "user",
          content: `请分析以下报价请求：
- 设备型号：${request.equipmentType}
- 基础价格：${basePrice}元
- 定制项：${request.customizations.join(", ") || "无"}
- 数量：${request.quantity}
- 交付地点：${request.deliveryLocation}
- 紧急程度：${request.urgency}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quotation_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestedDiscount: { type: "number", description: "建议折扣百分比 0-10" },
              discountReason: { type: "string", description: "折扣理由" },
              notes: {
                type: "array",
                items: { type: "string" },
                description: "报价注意事项"
              },
              confidence: { type: "number", description: "置信度 0-100" }
            },
            required: ["suggestedDiscount", "discountReason", "notes", "confidence"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    log.error({ err: error }, "AI quotation suggestions error");
    return {
      suggestedDiscount: 0,
      notes: ["标准报价，如需特殊优惠请联系销售经理"],
      confidence: 70
    };
  }
}

/**
 * 获取历史报价参考
 */
export function getHistoricalQuotations(equipmentType: string): Quotation[] {
  // 模拟历史报价数据
  return [];
}
