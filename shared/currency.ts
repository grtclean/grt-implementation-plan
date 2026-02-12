/**
 * GRT智能系统 - 多币种支持工具库
 * 版本: v2.6.2
 * 
 * 规范：
 * - 支持CNY、EUR、USD、GBP、JPY五种主要货币
 * - 汇率从currency_exchange_rates表动态获取
 * - 金额计算使用decimal精度，避免浮点数误差
 */

// 支持的货币列表
export const SUPPORTED_CURRENCIES = ['CNY', 'EUR', 'USD', 'GBP', 'JPY'] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// 货币信息
export interface CurrencyInfo {
  code: SupportedCurrency;
  symbol: string;
  name: { zh: string; en: string; de: string };
  decimalPlaces: number;
  region: string;
}

// 货币详细信息
export const CURRENCY_INFO: Record<SupportedCurrency, CurrencyInfo> = {
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: { zh: '人民币', en: 'Chinese Yuan', de: 'Chinesischer Yuan' },
    decimalPlaces: 2,
    region: 'asia'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: { zh: '欧元', en: 'Euro', de: 'Euro' },
    decimalPlaces: 2,
    region: 'europe'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: { zh: '美元', en: 'US Dollar', de: 'US-Dollar' },
    decimalPlaces: 2,
    region: 'americas'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: { zh: '英镑', en: 'British Pound', de: 'Britisches Pfund' },
    decimalPlaces: 2,
    region: 'europe'
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: { zh: '日元', en: 'Japanese Yen', de: 'Japanischer Yen' },
    decimalPlaces: 0,
    region: 'asia'
  }
};

// 区域到默认货币映射
export const REGION_CURRENCY_MAP: Record<string, SupportedCurrency> = {
  'asia': 'CNY',
  'europe': 'EUR',
  'americas': 'USD'
};

// 汇率记录接口
export interface ExchangeRate {
  baseCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  rate: number;
  effectiveDate: string;
  source: 'manual' | 'api' | 'bank';
}

/**
 * 货币金额类 - 使用整数存储避免浮点数精度问题
 */
export class Money {
  private readonly amountInCents: number;
  private readonly currency: SupportedCurrency;

  constructor(amount: number, currency: SupportedCurrency) {
    const info = CURRENCY_INFO[currency];
    const multiplier = Math.pow(10, info.decimalPlaces);
    this.amountInCents = Math.round(amount * multiplier);
    this.currency = currency;
  }

  /**
   * 获取金额（标准单位）
   */
  getAmount(): number {
    const info = CURRENCY_INFO[this.currency];
    const multiplier = Math.pow(10, info.decimalPlaces);
    return this.amountInCents / multiplier;
  }

  /**
   * 获取货币代码
   */
  getCurrency(): SupportedCurrency {
    return this.currency;
  }

  /**
   * 格式化显示
   */
  format(locale: string = 'zh-CN'): string {
    const info = CURRENCY_INFO[this.currency];
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: info.decimalPlaces,
      maximumFractionDigits: info.decimalPlaces
    }).format(this.getAmount());
  }

  /**
   * 加法
   */
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add different currencies: ${this.currency} and ${other.currency}`);
    }
    return new Money(this.getAmount() + other.getAmount(), this.currency);
  }

  /**
   * 减法
   */
  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot subtract different currencies: ${this.currency} and ${other.currency}`);
    }
    return new Money(this.getAmount() - other.getAmount(), this.currency);
  }

  /**
   * 乘法
   */
  multiply(factor: number): Money {
    return new Money(this.getAmount() * factor, this.currency);
  }

  /**
   * 货币转换
   */
  convert(targetCurrency: SupportedCurrency, rate: number): Money {
    const convertedAmount = this.getAmount() * rate;
    return new Money(convertedAmount, targetCurrency);
  }
}

/**
 * 验证货币代码是否有效
 */
export function isValidCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * 获取货币显示名称
 */
export function getCurrencyDisplayName(
  currency: SupportedCurrency,
  language: 'zh' | 'en' | 'de' = 'zh'
): string {
  return CURRENCY_INFO[currency]?.name[language] || currency;
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_INFO[currency]?.symbol || currency;
}

/**
 * 根据区域获取默认货币
 */
export function getDefaultCurrencyForRegion(region: string): SupportedCurrency {
  return REGION_CURRENCY_MAP[region.toLowerCase()] || 'CNY';
}

/**
 * 格式化金额显示
 */
export function formatAmount(
  amount: number,
  currency: SupportedCurrency,
  locale: string = 'zh-CN'
): string {
  const info = CURRENCY_INFO[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: info.decimalPlaces,
    maximumFractionDigits: info.decimalPlaces
  }).format(amount);
}

/**
 * 解析金额字符串
 */
export function parseAmount(amountStr: string, currency: SupportedCurrency): number {
  // 移除货币符号和千分位分隔符
  const cleanStr = amountStr.replace(/[^0-9.-]/g, '');
  const amount = parseFloat(cleanStr);
  
  if (isNaN(amount)) {
    throw new Error(`Invalid amount string: ${amountStr}`);
  }
  
  return amount;
}

/**
 * 计算汇率转换后的金额
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const toInfo = CURRENCY_INFO[toCurrency];
  const convertedAmount = amount * rate;
  const multiplier = Math.pow(10, toInfo.decimalPlaces);
  
  return Math.round(convertedAmount * multiplier) / multiplier;
}

/**
 * 汇率计算器接口
 */
export interface ExchangeRateCalculator {
  getRate(from: SupportedCurrency, to: SupportedCurrency, date?: Date): Promise<number>;
  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency, date?: Date): Promise<number>;
}
