/**
 * GRT智能系统 v2.6.5 - AI赋能采购与供应链协同
 * 
 * 基于RFC-034 MES制造执行系统规范
 * 实现Manus AI自动询价、供应商邮件发送、OCR识别等功能
 */

// ============================================================
// 类型定义
// ============================================================

/** 询价请求 */
export interface RFQRequest {
  rfqId: string;
  projectId: string;
  projectNumber: string;
  items: RFQItem[];
  requiredDeliveryDate: Date;
  deliveryAddress: string;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

/** 询价物料项 */
export interface RFQItem {
  itemId: string;
  sku: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  targetPrice?: number;
  lastPurchasePrice?: number;
  bomLineId?: string;
}

/** 供应商报价 */
export interface SupplierQuotation {
  quotationId: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  items: QuotationItem[];
  totalAmount: number;
  currency: string;
  validUntil: Date;
  deliveryDays: number;
  paymentTerms: string;
  status: 'pending' | 'received' | 'accepted' | 'rejected';
  receivedAt?: Date;
  receivedVia: 'email' | 'portal' | 'manual';
  ocrConfidence?: number;
  originalDocUrl?: string;
}

/** 报价物料项 */
export interface QuotationItem {
  itemId: string;
  sku: string;
  qty: number;
  unitPrice: number;
  amount: number;
  deliveryDate?: Date;
  moq?: number;
  remark?: string;
}

/** 供应商匹配结果 */
export interface SupplierMatch {
  supplierId: string;
  supplierCode: string;
  companyName: string;
  rating: 'A' | 'B' | 'C' | 'D';
  matchScore: number;
  matchReasons: string[];
  historicalPerformance: {
    avgDeliveryDays: number;
    onTimeRate: number;
    qualityRate: number;
    avgResponseTime: number;
  };
  lastPurchaseDate?: Date;
  totalPurchaseAmount?: number;
}

/** AI采购建议 */
export interface AIProcurementSuggestion {
  suggestionId: string;
  rfqId: string;
  recommendedSuppliers: SupplierMatch[];
  priceAnalysis: PriceAnalysis;
  riskAssessment: RiskAssessment;
  optimizationTips: string[];
  confidence: number;
  generatedAt: Date;
}

/** 价格分析 */
export interface PriceAnalysis {
  totalBudget: number;
  estimatedCost: number;
  savingsPotential: number;
  priceBreakdown: {
    itemId: string;
    sku: string;
    avgMarketPrice: number;
    lowestQuote: number;
    highestQuote: number;
    recommendedPrice: number;
  }[];
}

/** 风险评估 */
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: {
    factor: string;
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }[];
}

/** 邮件模板 */
export interface EmailTemplate {
  templateId: string;
  templateName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  language: 'zh' | 'en' | 'de';
  variables: string[];
}

/** 邮件发送记录 */
export interface EmailSendRecord {
  recordId: string;
  rfqId: string;
  supplierId: string;
  templateId: string;
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  repliedAt?: Date;
  manusTraceId?: string;
}

/** OCR识别结果 */
export interface OCRResult {
  resultId: string;
  sourceType: 'email_attachment' | 'upload' | 'scan';
  sourceUrl: string;
  documentType: 'quotation' | 'invoice' | 'delivery_note' | 'unknown';
  confidence: number;
  extractedData: {
    supplierName?: string;
    documentNumber?: string;
    documentDate?: Date;
    items?: {
      description: string;
      qty?: number;
      unitPrice?: number;
      amount?: number;
    }[];
    totalAmount?: number;
    currency?: string;
    paymentTerms?: string;
  };
  rawText: string;
  processedAt: Date;
}

// ============================================================
// AI采购引擎
// ============================================================

/**
 * AI采购引擎 - 智能询价与供应商管理
 */
export class AIProcurementEngine {
  private supplierDatabase: Map<string, SupplierMatch> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private emailTemplates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认邮件模板
   */
  private initializeDefaultTemplates(): void {
    // 中文询价模板
    this.emailTemplates.set('rfq_zh', {
      templateId: 'rfq_zh',
      templateName: '询价单-中文',
      subject: '【询价】{{projectNumber}} - {{companyName}}',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif;">
          <p>尊敬的 {{supplierContact}} 先生/女士：</p>
          <p>您好！我司现有以下物料需要询价，请贵司提供报价：</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #f0f0f0;">
              <th>序号</th><th>物料编码</th><th>名称规格</th><th>数量</th><th>单位</th><th>需求日期</th>
            </tr>
            {{itemRows}}
          </table>
          <p><strong>交货地址：</strong>{{deliveryAddress}}</p>
          <p><strong>需求日期：</strong>{{requiredDate}}</p>
          <p><strong>备注：</strong>{{notes}}</p>
          <p>请于 {{deadline}} 前回复报价，谢谢！</p>
          <p>如有疑问，请联系：{{contactInfo}}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            此邮件由GRT智能系统自动发送，请勿直接回复。<br>
            如需报价，请点击：<a href="{{portalLink}}">在线报价</a>
          </p>
        </div>
      `,
      bodyText: '询价单 - {{projectNumber}}',
      language: 'zh',
      variables: ['projectNumber', 'companyName', 'supplierContact', 'itemRows', 'deliveryAddress', 'requiredDate', 'notes', 'deadline', 'contactInfo', 'portalLink']
    });

    // 英文询价模板
    this.emailTemplates.set('rfq_en', {
      templateId: 'rfq_en',
      templateName: 'RFQ-English',
      subject: '[RFQ] {{projectNumber}} - {{companyName}}',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif;">
          <p>Dear {{supplierContact}},</p>
          <p>We would like to request a quotation for the following items:</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #f0f0f0;">
              <th>No.</th><th>Part No.</th><th>Description</th><th>Qty</th><th>Unit</th><th>Required Date</th>
            </tr>
            {{itemRows}}
          </table>
          <p><strong>Delivery Address:</strong> {{deliveryAddress}}</p>
          <p><strong>Required Date:</strong> {{requiredDate}}</p>
          <p><strong>Notes:</strong> {{notes}}</p>
          <p>Please submit your quotation by {{deadline}}. Thank you!</p>
          <p>For any questions, please contact: {{contactInfo}}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent automatically by GRT Intelligent System.<br>
            To submit your quotation, please click: <a href="{{portalLink}}">Online Quotation Portal</a>
          </p>
        </div>
      `,
      bodyText: 'RFQ - {{projectNumber}}',
      language: 'en',
      variables: ['projectNumber', 'companyName', 'supplierContact', 'itemRows', 'deliveryAddress', 'requiredDate', 'notes', 'deadline', 'contactInfo', 'portalLink']
    });

    // 德文询价模板
    this.emailTemplates.set('rfq_de', {
      templateId: 'rfq_de',
      templateName: 'Anfrage-Deutsch',
      subject: '[Anfrage] {{projectNumber}} - {{companyName}}',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif;">
          <p>Sehr geehrte(r) {{supplierContact}},</p>
          <p>Wir möchten ein Angebot für die folgenden Artikel anfordern:</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #f0f0f0;">
              <th>Nr.</th><th>Artikelnr.</th><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>Lieferdatum</th>
            </tr>
            {{itemRows}}
          </table>
          <p><strong>Lieferadresse:</strong> {{deliveryAddress}}</p>
          <p><strong>Benötigtes Datum:</strong> {{requiredDate}}</p>
          <p><strong>Hinweise:</strong> {{notes}}</p>
          <p>Bitte senden Sie Ihr Angebot bis {{deadline}}. Vielen Dank!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Diese E-Mail wurde automatisch vom GRT Intelligent System gesendet.<br>
            Angebot einreichen: <a href="{{portalLink}}">Online-Angebotsportal</a>
          </p>
        </div>
      `,
      bodyText: 'Anfrage - {{projectNumber}}',
      language: 'de',
      variables: ['projectNumber', 'companyName', 'supplierContact', 'itemRows', 'deliveryAddress', 'requiredDate', 'notes', 'deadline', 'contactInfo', 'portalLink']
    });
  }

  /**
   * 智能匹配供应商
   * 基于物料类别、历史交易、评级等因素
   */
  async matchSuppliers(rfq: RFQRequest): Promise<SupplierMatch[]> {
    const matches: SupplierMatch[] = [];
    
    // 模拟供应商匹配逻辑
    // 实际实现需要查询数据库和AI模型
    
    // 1. 根据物料类别筛选供应商
    const itemCategories = new Set(rfq.items.map(item => this.getItemCategory(item.sku)));
    
    // 2. 计算匹配分数
    // 考虑因素：
    // - 供应商评级 (40%)
    // - 历史交易记录 (25%)
    // - 交货准时率 (20%)
    // - 价格竞争力 (15%)
    
    // 3. 排序并返回Top 5
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  /**
   * 获取物料类别
   */
  private getItemCategory(sku: string): string {
    // 根据SKU编码规则解析类别
    // M-ELE-001 -> electrical
    // M-MEC-001 -> mechanical
    const parts = sku.split('-');
    if (parts.length >= 2) {
      const categoryCode = parts[1].toUpperCase();
      const categoryMap: Record<string, string> = {
        'ELE': 'electrical',
        'MEC': 'mechanical',
        'STD': 'standard',
        'NST': 'non_standard',
        'AUX': 'auxiliary'
      };
      return categoryMap[categoryCode] || 'unknown';
    }
    return 'unknown';
  }

  /**
   * 生成AI采购建议
   */
  async generateProcurementSuggestion(
    rfq: RFQRequest,
    quotations: SupplierQuotation[]
  ): Promise<AIProcurementSuggestion> {
    const suppliers = await this.matchSuppliers(rfq);
    
    // 价格分析
    const priceAnalysis = this.analyzePrices(rfq, quotations);
    
    // 风险评估
    const riskAssessment = this.assessRisks(rfq, quotations);
    
    // 优化建议
    const optimizationTips = this.generateOptimizationTips(rfq, quotations, priceAnalysis);
    
    return {
      suggestionId: `SUGG-${Date.now()}`,
      rfqId: rfq.rfqId,
      recommendedSuppliers: suppliers,
      priceAnalysis,
      riskAssessment,
      optimizationTips,
      confidence: this.calculateConfidence(quotations),
      generatedAt: new Date()
    };
  }

  /**
   * 分析价格
   */
  private analyzePrices(rfq: RFQRequest, quotations: SupplierQuotation[]): PriceAnalysis {
    const priceBreakdown = rfq.items.map(item => {
      const itemQuotes = quotations.flatMap(q => 
        q.items.filter(qi => qi.itemId === item.itemId).map(qi => qi.unitPrice)
      );
      
      const avgPrice = itemQuotes.length > 0 
        ? itemQuotes.reduce((a, b) => a + b, 0) / itemQuotes.length 
        : item.lastPurchasePrice || 0;
      
      return {
        itemId: item.itemId,
        sku: item.sku,
        avgMarketPrice: avgPrice,
        lowestQuote: itemQuotes.length > 0 ? Math.min(...itemQuotes) : avgPrice,
        highestQuote: itemQuotes.length > 0 ? Math.max(...itemQuotes) : avgPrice,
        recommendedPrice: avgPrice * 0.95 // 建议价格为平均价的95%
      };
    });

    const totalBudget = rfq.items.reduce((sum, item) => 
      sum + (item.targetPrice || item.lastPurchasePrice || 0) * item.qty, 0
    );
    
    const estimatedCost = priceBreakdown.reduce((sum, pb) => 
      sum + pb.recommendedPrice * (rfq.items.find(i => i.itemId === pb.itemId)?.qty || 0), 0
    );

    return {
      totalBudget,
      estimatedCost,
      savingsPotential: totalBudget - estimatedCost,
      priceBreakdown
    };
  }

  /**
   * 评估风险
   */
  private assessRisks(rfq: RFQRequest, quotations: SupplierQuotation[]): RiskAssessment {
    const riskFactors: RiskAssessment['riskFactors'] = [];
    
    // 1. 供应商数量风险
    if (quotations.length < 3) {
      riskFactors.push({
        factor: '供应商数量不足',
        level: 'medium',
        description: `仅收到${quotations.length}家供应商报价，竞争性不足`,
        mitigation: '建议扩大询价范围，增加备选供应商'
      });
    }
    
    // 2. 交期风险
    const requiredDays = Math.ceil(
      (rfq.requiredDeliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (requiredDays < 14) {
      riskFactors.push({
        factor: '交期紧张',
        level: 'high',
        description: `距离需求日期仅${requiredDays}天，可能影响交付`,
        mitigation: '建议与供应商确认加急可行性，或调整项目计划'
      });
    }
    
    // 3. 价格波动风险
    const priceVariance = this.calculatePriceVariance(quotations);
    if (priceVariance > 0.3) {
      riskFactors.push({
        factor: '价格波动大',
        level: 'medium',
        description: `报价差异超过30%，市场价格不稳定`,
        mitigation: '建议锁定价格或签订长期协议'
      });
    }
    
    // 计算整体风险等级
    const highRisks = riskFactors.filter(r => r.level === 'high').length;
    const mediumRisks = riskFactors.filter(r => r.level === 'medium').length;
    
    let overallRisk: RiskAssessment['overallRisk'] = 'low';
    if (highRisks > 0) {
      overallRisk = 'high';
    } else if (mediumRisks >= 2) {
      overallRisk = 'medium';
    }
    
    return { overallRisk, riskFactors };
  }

  /**
   * 计算价格方差
   */
  private calculatePriceVariance(quotations: SupplierQuotation[]): number {
    if (quotations.length < 2) return 0;
    
    const totals = quotations.map(q => q.totalAmount);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / totals.length;
    
    return Math.sqrt(variance) / avg;
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationTips(
    rfq: RFQRequest,
    quotations: SupplierQuotation[],
    priceAnalysis: PriceAnalysis
  ): string[] {
    const tips: string[] = [];
    
    // 1. 批量采购建议
    if (rfq.items.some(item => item.qty < 10)) {
      tips.push('部分物料采购量较小，建议合并同类物料或与其他项目联合采购以获得更优价格');
    }
    
    // 2. 供应商整合建议
    const supplierCount = new Set(quotations.map(q => q.supplierId)).size;
    if (supplierCount > 5) {
      tips.push('供应商数量较多，建议整合至3-5家核心供应商，提高议价能力');
    }
    
    // 3. 付款条款优化
    if (priceAnalysis.totalBudget > 100000) {
      tips.push('订单金额较大，建议协商分期付款或账期延长');
    }
    
    // 4. 国产替代建议
    tips.push('建议评估关键物料的国产替代方案，降低供应链风险');
    
    return tips;
  }

  /**
   * 计算建议置信度
   */
  private calculateConfidence(quotations: SupplierQuotation[]): number {
    // 基于报价数量和OCR置信度计算
    let confidence = 0.5; // 基础置信度
    
    // 报价数量加成
    confidence += Math.min(quotations.length * 0.1, 0.3);
    
    // OCR置信度加成
    const avgOcrConfidence = quotations
      .filter(q => q.ocrConfidence)
      .reduce((sum, q) => sum + (q.ocrConfidence || 0), 0) / quotations.length || 0;
    confidence += avgOcrConfidence * 0.2;
    
    return Math.min(confidence, 0.95);
  }

  /**
   * 发送询价邮件
   */
  async sendRFQEmail(
    rfq: RFQRequest,
    supplierId: string,
    supplierEmail: string,
    supplierContact: string,
    language: 'zh' | 'en' | 'de' = 'zh'
  ): Promise<EmailSendRecord> {
    const template = this.emailTemplates.get(`rfq_${language}`);
    if (!template) {
      throw new Error(`Email template not found for language: ${language}`);
    }

    // 生成物料行HTML
    const itemRows = rfq.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.sku}</td>
        <td>${item.name} ${item.spec || ''}</td>
        <td>${item.qty}</td>
        <td>${item.unit}</td>
        <td>${rfq.requiredDeliveryDate.toLocaleDateString()}</td>
      </tr>
    `).join('');

    // 替换模板变量
    const variables: Record<string, string> = {
      projectNumber: rfq.projectNumber,
      companyName: 'GRT Industrial Cleaning',
      supplierContact,
      itemRows,
      deliveryAddress: rfq.deliveryAddress,
      requiredDate: rfq.requiredDeliveryDate.toLocaleDateString(),
      notes: rfq.notes || '-',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      contactInfo: 'procurement@gerrytech.com',
      portalLink: `https://portal.gerrytech.com/rfq/${rfq.rfqId}`
    };

    let subject = template.subject;
    let body = template.bodyHtml;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    const record: EmailSendRecord = {
      recordId: `EMAIL-${Date.now()}`,
      rfqId: rfq.rfqId,
      supplierId,
      templateId: template.templateId,
      to: supplierEmail,
      subject,
      body,
      status: 'pending',
      manusTraceId: `MANUS-${Date.now()}`
    };

    // 实际发送邮件（通过Manus API）
    // await this.sendViaManus(record);

    return record;
  }

  /**
   * 处理OCR识别结果
   */
  async processOCRResult(ocrResult: OCRResult, rfqId: string): Promise<SupplierQuotation | null> {
    if (ocrResult.documentType !== 'quotation' || ocrResult.confidence < 0.7) {
      return null;
    }

    const extractedData = ocrResult.extractedData;
    if (!extractedData.items || extractedData.items.length === 0) {
      return null;
    }

    // 将OCR结果转换为报价记录
    const quotation: SupplierQuotation = {
      quotationId: `QUO-${Date.now()}`,
      rfqId,
      supplierId: '', // 需要根据supplierName匹配
      supplierName: extractedData.supplierName || 'Unknown',
      items: extractedData.items.map((item, index) => ({
        itemId: `ITEM-${index}`,
        sku: '',
        qty: item.qty || 0,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || (item.qty || 0) * (item.unitPrice || 0)
      })),
      totalAmount: extractedData.totalAmount || 0,
      currency: extractedData.currency || 'CNY',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deliveryDays: 14,
      paymentTerms: extractedData.paymentTerms || '',
      status: 'received',
      receivedAt: new Date(),
      receivedVia: 'email',
      ocrConfidence: ocrResult.confidence,
      originalDocUrl: ocrResult.sourceUrl
    };

    return quotation;
  }
}

// ============================================================
// 供应商协同门户
// ============================================================

/**
 * 供应商协同门户配置
 */
export interface SupplierPortalConfig {
  baseUrl: string;
  tokenExpiry: number; // 小时
  allowedActions: string[];
}

/**
 * 供应商门户会话
 */
export interface SupplierPortalSession {
  sessionId: string;
  supplierId: string;
  rfqId: string;
  token: string;
  expiresAt: Date;
  actions: string[];
}

/**
 * 生成供应商门户访问链接
 */
export function generateSupplierPortalLink(
  config: SupplierPortalConfig,
  supplierId: string,
  rfqId: string
): { link: string; session: SupplierPortalSession } {
  const token = `${supplierId}-${rfqId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + config.tokenExpiry * 60 * 60 * 1000);
  
  const session: SupplierPortalSession = {
    sessionId: `SESSION-${Date.now()}`,
    supplierId,
    rfqId,
    token,
    expiresAt,
    actions: config.allowedActions
  };
  
  const link = `${config.baseUrl}/supplier-portal?token=${encodeURIComponent(token)}&rfq=${rfqId}`;
  
  return { link, session };
}

// ============================================================
// 导出默认实例
// ============================================================

export const aiProcurementEngine = new AIProcurementEngine();

export default aiProcurementEngine;
