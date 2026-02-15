/**
 * GRT智能系统 - 区域增值税/税率定义
 * 覆盖: CN增值税 / EU VAT / US Sales Tax
 */

// ============================================================
// 中国增值税税率 (2026)
// ============================================================
export const CN_VAT_RATES = {
  /** 货物销售（工业清洗设备属此档） */
  goods: { rate: 0.13, label: "13% 货物销售", labelEn: "13% Goods" },
  /** 建筑/运输 */
  construction: { rate: 0.09, label: "9% 建筑运输", labelEn: "9% Construction/Transport" },
  /** 服务（技术咨询、维保服务等） */
  services: { rate: 0.06, label: "6% 现代服务", labelEn: "6% Services" },
  /** 小规模纳税人 */
  smallScale: { rate: 0.03, label: "3% 小规模", labelEn: "3% Small Scale" },
  /** 出口退税率(清洗设备) */
  exportRefund: { rate: 0.13, label: "13% 出口退税", labelEn: "13% Export Refund" },
} as const;

// ============================================================
// EU增值税税率 (标准税率, 工业设备适用)
// ============================================================
export const EU_VAT_RATES: Record<string, { rate: number; country: string; countryEn: string }> = {
  DE: { rate: 0.19, country: "德国", countryEn: "Germany" },
  FR: { rate: 0.20, country: "法国", countryEn: "France" },
  IT: { rate: 0.22, country: "意大利", countryEn: "Italy" },
  NL: { rate: 0.21, country: "荷兰", countryEn: "Netherlands" },
  AT: { rate: 0.20, country: "奥地利", countryEn: "Austria" },
  ES: { rate: 0.21, country: "西班牙", countryEn: "Spain" },
  PL: { rate: 0.23, country: "波兰", countryEn: "Poland" },
  CZ: { rate: 0.21, country: "捷克", countryEn: "Czech Republic" },
  HU: { rate: 0.27, country: "匈牙利", countryEn: "Hungary" },
  SE: { rate: 0.25, country: "瑞典", countryEn: "Sweden" },
};

// ============================================================
// US州销售税 (GRT重点客户所在州)
// ============================================================
export const US_SALES_TAX: Record<string, { rate: number; state: string }> = {
  CA: { rate: 0.0725, state: "California" },
  TX: { rate: 0.0625, state: "Texas" },
  OH: { rate: 0.0575, state: "Ohio" },
  MI: { rate: 0.06, state: "Michigan" },
  IN: { rate: 0.07, state: "Indiana" },
  IL: { rate: 0.0625, state: "Illinois" },
  PA: { rate: 0.06, state: "Pennsylvania" },
  SC: { rate: 0.06, state: "South Carolina" },
  NH: { rate: 0, state: "New Hampshire" },
  OR: { rate: 0, state: "Oregon" },
};

// ============================================================
// 类型定义
// ============================================================
export interface VATCalculation {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  taxType: string;
  currency: string;
  breakdown: Array<{ item: string; rate: string; amount: number; notes: string }>;
  invoiceRequirements: string;
  notes: string[];
  recommendations: string[];
}

export interface TaxBreakdown {
  region: string;
  taxType: string;
  rate: number;
  amount: number;
  notes: string;
}

/**
 * 获取区域增值税率
 */
export function getVATRate(region: string, productType: "goods" | "services" = "goods"): number {
  // CN
  if (region === "CN") {
    return productType === "services" ? CN_VAT_RATES.services.rate : CN_VAT_RATES.goods.rate;
  }
  // EU
  if (EU_VAT_RATES[region]) {
    return EU_VAT_RATES[region].rate;
  }
  // US
  if (US_SALES_TAX[region]) {
    return US_SALES_TAX[region].rate;
  }
  return 0;
}

/**
 * 支持的币种
 */
export const SUPPORTED_CURRENCIES = ["CNY", "EUR", "USD", "GBP", "JPY", "CHF"] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
