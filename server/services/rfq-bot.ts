/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GRT AI Supply Chain RFQ Bot
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Automated Request-for-Quotation engine that:
 *  1. Takes a missing BOM part (e.g. "Siemens PLC S7-1200")
 *  2. Looks up approved vendors from the AVL (Approved Vendor List)
 *  3. Generates polite, professional RFQ email templates
 *  4. (Future) Sends via Office 365 SMTP and tracks responses
 *
 *  Integration points:
 *  - BOM Management (generative BOM → missing parts list)
 *  - Supplier Assessment (AVL database)
 *  - Email service (Office 365 / SMTP)
 *  - RFQ Kanban UI (supply-chain-rfq page)
 */

// ══════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════

export interface AVLVendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  region: string;
  /** Supplier rating (1-5 stars) from last audit */
  rating: number;
  /** Typical lead time in business days */
  avgLeadTimeDays: number;
  /** Commodity categories this vendor covers */
  categories: string[];
  /** IATF 16949 certified */
  iatfCertified: boolean;
}

export interface BOMPart {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  /** Target unit price (budget estimate) */
  targetPrice?: number;
  /** Required delivery date */
  requiredByDate?: string;
  /** Project reference */
  projectCode?: string;
}

export interface RFQEmail {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  vendor: AVLVendor;
  part: BOMPart;
  rfqNumber: string;
  deadline: string;
}

export interface VendorQuote {
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  currency: string;
  leadTimeDays: number;
  moq: number;
  validUntil: string;
  notes: string;
  /** Composite score: price(40%) + lead time(30%) + rating(20%) + certification(10%) */
  score: number;
}

export interface RFQCard {
  id: string;
  rfqNumber: string;
  part: BOMPart;
  status: "pending_rfq" | "awaiting_reply" | "ready_for_approval" | "po_generated";
  vendors: AVLVendor[];
  quotes: VendorQuote[];
  sentEmails: RFQEmail[];
  createdAt: string;
  updatedAt: string;
  /** CEO's selected vendor (after approval) */
  approvedVendorId?: string;
}

// ══════════════════════════════════════════════════════════════
//  MOCK AVL DATABASE
// ══════════════════════════════════════════════════════════════

const MOCK_AVL: AVLVendor[] = [
  {
    id: "v-001",
    name: "西门子工业自动化 (上海)",
    contactPerson: "王建国",
    email: "wang.jianguo@siemens-sh.example.com",
    phone: "+86-21-5888-1234",
    region: "上海",
    rating: 4.8,
    avgLeadTimeDays: 3,
    categories: ["PLC", "HMI", "Drives", "I/O Modules"],
    iatfCertified: true,
  },
  {
    id: "v-002",
    name: "德普科电气 (深圳)",
    contactPerson: "李芳",
    email: "li.fang@depco-sz.example.com",
    phone: "+86-755-2688-5678",
    region: "深圳",
    rating: 4.2,
    avgLeadTimeDays: 7,
    categories: ["PLC", "Sensors", "Cables", "Power Supplies"],
    iatfCertified: true,
  },
  {
    id: "v-003",
    name: "华控自动化 (苏州)",
    contactPerson: "赵明",
    email: "zhao.ming@huakong-sz.example.com",
    phone: "+86-512-6788-9012",
    region: "苏州",
    rating: 3.9,
    avgLeadTimeDays: 10,
    categories: ["PLC", "HMI", "Motors", "Encoders"],
    iatfCertified: false,
  },
  {
    id: "v-004",
    name: "ABB Motion (北京)",
    contactPerson: "陈伟",
    email: "chen.wei@abb-bj.example.com",
    phone: "+86-10-8588-3456",
    region: "北京",
    rating: 4.6,
    avgLeadTimeDays: 5,
    categories: ["Drives", "Motors", "Robots", "Power Supplies"],
    iatfCertified: true,
  },
  {
    id: "v-005",
    name: "三菱电机 (大连)",
    contactPerson: "田中太郎",
    email: "tanaka@mitsubishi-dl.example.com",
    phone: "+86-411-8488-7890",
    region: "大连",
    rating: 4.5,
    avgLeadTimeDays: 8,
    categories: ["PLC", "Servos", "HMI", "Inverters"],
    iatfCertified: true,
  },
  {
    id: "v-006",
    name: "欧姆龙精密 (天津)",
    contactPerson: "山田花子",
    email: "yamada@omron-tj.example.com",
    phone: "+86-22-2388-1234",
    region: "天津",
    rating: 4.3,
    avgLeadTimeDays: 6,
    categories: ["Sensors", "PLC", "Safety", "Vision"],
    iatfCertified: true,
  },
];

// ══════════════════════════════════════════════════════════════
//  AVL LOOKUP
// ══════════════════════════════════════════════════════════════

/**
 * Finds approved vendors from the AVL that can supply the given part.
 * Matches by category keywords in the part description.
 * Returns top N vendors sorted by rating (descending).
 */
export function lookupAVLVendors(part: BOMPart, maxVendors = 3): AVLVendor[] {
  const desc = part.description.toLowerCase();
  const cat = part.category.toLowerCase();

  // Score each vendor by relevance
  const scored = MOCK_AVL.map((vendor) => {
    let relevance = 0;
    // Check if any vendor category matches the part
    for (const vc of vendor.categories) {
      if (desc.includes(vc.toLowerCase()) || cat.includes(vc.toLowerCase())) {
        relevance += 2;
      }
    }
    // Bonus for IATF certification
    if (vendor.iatfCertified) relevance += 1;
    // Bonus for high rating
    relevance += vendor.rating / 5;
    return { vendor, relevance };
  });

  return scored
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.vendor.rating - a.vendor.rating)
    .slice(0, maxVendors)
    .map((s) => s.vendor);
}

// ══════════════════════════════════════════════════════════════
//  RFQ EMAIL GENERATION
// ══════════════════════════════════════════════════════════════

let rfqCounter = 1000;

/** Generate a unique RFQ number: RFQ-2026-XXXX */
export function generateRFQNumber(): string {
  rfqCounter++;
  return `RFQ-2026-${String(rfqCounter).padStart(4, "0")}`;
}

/**
 * Generates a polite, professional RFQ email template.
 * Supports both Chinese and English.
 */
export function generateRFQEmail(
  vendor: AVLVendor,
  part: BOMPart,
  rfqNumber: string,
  language: "zh" | "en" = "zh"
): RFQEmail {
  const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const subject =
    language === "zh"
      ? `[GRT询价] ${rfqNumber} — ${part.description} x${part.quantity}${part.unit}`
      : `[GRT RFQ] ${rfqNumber} — ${part.description} x${part.quantity} ${part.unit}`;

  const body =
    language === "zh"
      ? `尊敬的 ${vendor.contactPerson} 先生/女士，

您好！感谢贵司长期以来对 GRT (Global Robot Technology) 的支持与配合。

现因项目需求，我司需采购以下物料，特向贵司询价：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  询价编号：${rfqNumber}
  物料描述：${part.description}
  物料编号：${part.partNumber}
  需求数量：${part.quantity} ${part.unit}
  ${part.projectCode ? `项目编号：${part.projectCode}` : ""}
  ${part.requiredByDate ? `期望交期：${part.requiredByDate}` : ""}
  ${part.targetPrice ? `预算参考：¥${part.targetPrice.toLocaleString()}/件` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请贵司在 ${deadline} 前回复以下信息：
  1. 单价（含税/不含税）
  2. 最小起订量（MOQ）
  3. 交货周期（自下单起）
  4. 报价有效期
  5. 付款条件

如有任何疑问，请随时联系我们的采购团队。

此致
敬礼

GRT 采购部
Global Robot Technology Co., Ltd.
📧 procurement@grt-automation.com
📞 +86-512-8888-0000`
      : `Dear ${vendor.contactPerson},

Thank you for your continued partnership with GRT (Global Robot Technology).

We are currently sourcing the following component and would like to request a quotation:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RFQ Number: ${rfqNumber}
  Description: ${part.description}
  Part Number: ${part.partNumber}
  Quantity: ${part.quantity} ${part.unit}
  ${part.projectCode ? `Project: ${part.projectCode}` : ""}
  ${part.requiredByDate ? `Required By: ${part.requiredByDate}` : ""}
  ${part.targetPrice ? `Budget Ref: $${part.targetPrice.toLocaleString()}/unit` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please provide the following by ${deadline}:
  1. Unit price (with/without tax)
  2. Minimum Order Quantity (MOQ)
  3. Lead time (from PO date)
  4. Quotation validity period
  5. Payment terms

Please don't hesitate to reach out if you need any clarification.

Best regards,

GRT Procurement Department
Global Robot Technology Co., Ltd.
procurement@grt-automation.com
+86-512-8888-0000`;

  return {
    to: vendor.email,
    subject,
    body,
    vendor,
    part,
    rfqNumber,
    deadline,
  };
}

// ══════════════════════════════════════════════════════════════
//  MOCK QUOTE GENERATION (simulates vendor responses)
// ══════════════════════════════════════════════════════════════

/**
 * Simulates receiving quotes from vendors.
 * In production, these would come from email parsing or a vendor portal.
 */
export function generateMockQuotes(
  vendors: AVLVendor[],
  part: BOMPart
): VendorQuote[] {
  const basePrice = part.targetPrice || 500;

  return vendors.map((vendor) => {
    // Simulate price variation: ±30% around target
    const priceMultiplier = 0.7 + Math.random() * 0.6;
    const unitPrice = Math.round(basePrice * priceMultiplier * 100) / 100;

    // Lead time influenced by vendor's avg + some variance
    const leadTimeDays =
      vendor.avgLeadTimeDays + Math.floor(Math.random() * 5) - 2;

    const moq = [1, 5, 10, 25, 50][Math.floor(Math.random() * 5)];

    // Composite score: price(40%) + lead time(30%) + rating(20%) + cert(10%)
    const priceScore = Math.max(0, 100 - ((unitPrice - basePrice * 0.5) / (basePrice * 1.0)) * 100);
    const leadScore = Math.max(0, 100 - leadTimeDays * 5);
    const ratingScore = (vendor.rating / 5) * 100;
    const certScore = vendor.iatfCertified ? 100 : 0;
    const score = Math.round(
      priceScore * 0.4 + leadScore * 0.3 + ratingScore * 0.2 + certScore * 0.1
    );

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      unitPrice,
      currency: "CNY",
      leadTimeDays: Math.max(1, leadTimeDays),
      moq,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      notes:
        vendor.iatfCertified
          ? "IATF 16949 certified, priority shipping available"
          : "Standard shipping, bulk discount available for 100+",
      score: Math.min(100, Math.max(0, score)),
    };
  });
}

// ══════════════════════════════════════════════════════════════
//  FULL RFQ PIPELINE
// ══════════════════════════════════════════════════════════════

/**
 * Runs the full RFQ pipeline for a single BOM part:
 * 1. Lookup vendors from AVL
 * 2. Generate RFQ emails for each vendor
 * 3. Simulate receiving quotes
 * 4. Return an RFQCard ready for the Kanban UI
 */
export function processRFQ(part: BOMPart): RFQCard {
  const rfqNumber = generateRFQNumber();
  const vendors = lookupAVLVendors(part, 3);
  const emails = vendors.map((v) => generateRFQEmail(v, part, rfqNumber));
  const quotes = generateMockQuotes(vendors, part).sort(
    (a, b) => b.score - a.score
  );

  return {
    id: `rfq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rfqNumber,
    part,
    status: "ready_for_approval",
    vendors,
    quotes,
    sentEmails: emails,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════
//  MOCK DATA — Pre-built RFQ cards for the Kanban demo
// ══════════════════════════════════════════════════════════════

export const MOCK_RFQ_CARDS: RFQCard[] = [
  // Column 1: Pending RFQ
  {
    id: "rfq-pending-1",
    rfqNumber: "RFQ-2026-0088",
    part: {
      id: "bom-p-001",
      partNumber: "6ES7214-1AG40-0XB0",
      description: "Siemens PLC S7-1200 CPU 1214C",
      category: "PLC",
      quantity: 12,
      unit: "pcs",
      targetPrice: 2800,
      requiredByDate: "2026-04-15",
      projectCode: "M6-PRJ-2026-003",
    },
    status: "pending_rfq",
    vendors: [],
    quotes: [],
    sentEmails: [],
    createdAt: "2026-02-24T08:00:00Z",
    updatedAt: "2026-02-24T08:00:00Z",
  },
  {
    id: "rfq-pending-2",
    rfqNumber: "RFQ-2026-0089",
    part: {
      id: "bom-p-002",
      partNumber: "1FL6042-1AF61-2AB1",
      description: "Siemens Servo Motor SIMOTICS S-1FL6",
      category: "Motors",
      quantity: 6,
      unit: "pcs",
      targetPrice: 8500,
      requiredByDate: "2026-04-20",
      projectCode: "M6-PRJ-2026-003",
    },
    status: "pending_rfq",
    vendors: [],
    quotes: [],
    sentEmails: [],
    createdAt: "2026-02-24T08:15:00Z",
    updatedAt: "2026-02-24T08:15:00Z",
  },

  // Column 2: Awaiting Vendor Reply
  {
    id: "rfq-awaiting-1",
    rfqNumber: "RFQ-2026-0085",
    part: {
      id: "bom-p-003",
      partNumber: "6AV2124-0GC01-0AX0",
      description: "Siemens HMI TP700 Comfort Panel 7\"",
      category: "HMI",
      quantity: 4,
      unit: "pcs",
      targetPrice: 6200,
      requiredByDate: "2026-04-10",
      projectCode: "M6-PRJ-2026-002",
    },
    status: "awaiting_reply",
    vendors: [MOCK_AVL[0], MOCK_AVL[1], MOCK_AVL[4]],
    quotes: [],
    sentEmails: [],
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-02-23T14:30:00Z",
  },
  {
    id: "rfq-awaiting-2",
    rfqNumber: "RFQ-2026-0086",
    part: {
      id: "bom-p-004",
      partNumber: "E3X-HD11",
      description: "Omron Fiber Optic Sensor E3X-HD11",
      category: "Sensors",
      quantity: 24,
      unit: "pcs",
      targetPrice: 350,
      requiredByDate: "2026-04-05",
      projectCode: "M6-PRJ-2026-001",
    },
    status: "awaiting_reply",
    vendors: [MOCK_AVL[5], MOCK_AVL[1]],
    quotes: [],
    sentEmails: [],
    createdAt: "2026-02-21T09:00:00Z",
    updatedAt: "2026-02-23T16:00:00Z",
  },

  // Column 3: Ready for CEO Approval (with full quotes)
  {
    id: "rfq-ready-1",
    rfqNumber: "RFQ-2026-0082",
    part: {
      id: "bom-p-005",
      partNumber: "6ES7215-1AG40-0XB0",
      description: "Siemens PLC S7-1200 CPU 1215C DC/DC/DC",
      category: "PLC",
      quantity: 8,
      unit: "pcs",
      targetPrice: 3500,
      requiredByDate: "2026-03-28",
      projectCode: "M6-PRJ-2026-001",
    },
    status: "ready_for_approval",
    vendors: [MOCK_AVL[0], MOCK_AVL[1], MOCK_AVL[2]],
    quotes: [
      {
        vendorId: "v-001",
        vendorName: "西门子工业自动化 (上海)",
        unitPrice: 3200,
        currency: "CNY",
        leadTimeDays: 3,
        moq: 1,
        validUntil: "2026-03-31",
        notes: "原厂直供，IATF 16949 认证，3天顺丰到厂",
        score: 92,
      },
      {
        vendorId: "v-002",
        vendorName: "德普科电气 (深圳)",
        unitPrice: 2850,
        currency: "CNY",
        leadTimeDays: 7,
        moq: 5,
        validUntil: "2026-03-25",
        notes: "代理渠道，IATF 认证，量大可议价",
        score: 78,
      },
      {
        vendorId: "v-003",
        vendorName: "华控自动化 (苏州)",
        unitPrice: 2650,
        currency: "CNY",
        leadTimeDays: 12,
        moq: 10,
        validUntil: "2026-03-20",
        notes: "本地仓库有少量现货，非IATF认证",
        score: 61,
      },
    ],
    sentEmails: [],
    createdAt: "2026-02-18T08:00:00Z",
    updatedAt: "2026-02-24T09:00:00Z",
  },
  {
    id: "rfq-ready-2",
    rfqNumber: "RFQ-2026-0083",
    part: {
      id: "bom-p-006",
      partNumber: "ACS580-01-12A6-4",
      description: "ABB Variable Frequency Drive ACS580 5.5kW",
      category: "Drives",
      quantity: 3,
      unit: "pcs",
      targetPrice: 12000,
      requiredByDate: "2026-04-01",
      projectCode: "M6-PRJ-2026-001",
    },
    status: "ready_for_approval",
    vendors: [MOCK_AVL[3], MOCK_AVL[0], MOCK_AVL[1]],
    quotes: [
      {
        vendorId: "v-004",
        vendorName: "ABB Motion (北京)",
        unitPrice: 11500,
        currency: "CNY",
        leadTimeDays: 5,
        moq: 1,
        validUntil: "2026-03-31",
        notes: "原厂直供，含调试支持，IATF 16949 认证",
        score: 89,
      },
      {
        vendorId: "v-001",
        vendorName: "西门子工业自动化 (上海)",
        unitPrice: 11800,
        currency: "CNY",
        leadTimeDays: 8,
        moq: 1,
        validUntil: "2026-03-28",
        notes: "授权代理，可提供技术培训",
        score: 74,
      },
      {
        vendorId: "v-002",
        vendorName: "德普科电气 (深圳)",
        unitPrice: 10200,
        currency: "CNY",
        leadTimeDays: 14,
        moq: 2,
        validUntil: "2026-03-20",
        notes: "渠道价格优势，交期略长",
        score: 65,
      },
    ],
    sentEmails: [],
    createdAt: "2026-02-19T10:00:00Z",
    updatedAt: "2026-02-24T10:30:00Z",
  },
];
