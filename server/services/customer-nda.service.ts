/**
 * Customer NDA/IP Agreement Service
 * 客户保密协议与知识产权协议服务
 *
 * - NDA template rendering (HTML template → variable substitution)
 * - SHA-256 hashing (proves exact version signed)
 * - Signature token generation (24h validity)
 */
import { randomBytes, createHash } from "crypto";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("customer-nda");

// ═══════════════════════════════════════════════════════════
// NDA Template
// ═══════════════════════════════════════════════════════════

const TIER_DESCRIPTIONS: Record<number, { zh: string; en: string }> = {
  1: { zh: "基础买方", en: "Basic Buyer" },
  2: { zh: "技术联系人", en: "Technical Contact" },
  3: { zh: "工程伙伴", en: "Engineering Partner" },
  4: { zh: "战略合作伙伴", en: "Strategic Partner" },
};

export interface NdaTemplateVars {
  companyName: string;
  contactName: string;
  contactEmail: string;
  projectName?: string;
  accessTier: number;
  validFrom: string;
  validUntil: string;
  grtSignerName?: string;
}

/**
 * Render the NDA full text with variable substitution.
 * Returns the rendered HTML and its SHA-256 hash.
 */
export function renderNdaTemplate(vars: NdaTemplateVars): { html: string; hash: string } {
  const tierDesc = TIER_DESCRIPTIONS[vars.accessTier] || TIER_DESCRIPTIONS[1];
  const today = new Date().toISOString().slice(0, 10);

  const html = `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>保密与知识产权协议 / NDA &amp; IP Agreement</title></head>
<body style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8;">

<h1 style="text-align: center;">保密与知识产权协议</h1>
<h2 style="text-align: center; color: #666;">Non-Disclosure &amp; Intellectual Property Agreement</h2>

<p><strong>协议日期 / Agreement Date:</strong> ${today}</p>
<p><strong>甲方 / Party A:</strong> GRT（上海格律特清洗设备有限公司）</p>
<p><strong>乙方 / Party B:</strong> ${vars.companyName}</p>
<p><strong>乙方签署人 / Party B Signatory:</strong> ${vars.contactName} (${vars.contactEmail})</p>
<p><strong>项目 / Project:</strong> ${vars.projectName || "通用授权"}</p>
<p><strong>授权等级 / Access Tier:</strong> T${vars.accessTier} — ${tierDesc.zh} / ${tierDesc.en}</p>
<p><strong>有效期 / Validity:</strong> ${vars.validFrom} 至 ${vars.validUntil}</p>

<hr>

<h3>第一条 / Article 1 — 保密义务 / Confidentiality Obligations</h3>
<p>乙方承诺对甲方提供的所有技术资料（包括但不限于：操作手册、维护手册、电气图纸、BOM清单、出厂参数、PLC源代码、HMI变量表、PID调参数据、历史运行数据、设计依据）严格保密，保密期限自本协议签署之日起<strong>五（5）年</strong>。</p>
<p>Party B agrees to keep strictly confidential all technical materials provided by Party A (including but not limited to: operation manuals, maintenance manuals, electrical drawings, BOMs, factory parameters, PLC source code, HMI variable tables, PID tuning data, historical operating data, and design rationale) for a period of <strong>five (5) years</strong> from the date of this agreement.</p>

<h3>第二条 / Article 2 — 知识产权声明 / Intellectual Property Declaration</h3>
<p>甲方提供的所有技术资料的知识产权（包括但不限于著作权、专利权、商业秘密权）均归甲方所有。乙方获得的仅为有限的查阅使用权，不得复制、传播、反向工程或用于任何非本项目约定用途。</p>
<p>All intellectual property rights (including but not limited to copyrights, patent rights, and trade secret rights) in the technical materials provided by Party A belong to Party A. Party B is granted only a limited right to view and use these materials, and shall not copy, distribute, reverse-engineer, or use them for any purpose other than those stipulated in this project agreement.</p>

<h3>第三条 / Article 3 — 使用限制 / Usage Restrictions</h3>
<p>所有技术资料仅限<strong>参考用途</strong>。T${vars.accessTier}级别（${tierDesc.zh}）授权范围内的文档可查阅，未经甲方书面同意，不得超出授权等级范围获取其他资料。</p>
<p>All technical materials are for <strong>reference purposes only</strong>. Documents within the T${vars.accessTier} (${tierDesc.en}) authorization scope may be viewed. No materials beyond the authorized tier may be accessed without prior written consent from Party A.</p>

<h3>第四条 / Article 4 — 数据处理同意 / Data Processing Consent</h3>
<p>乙方同意甲方记录其在客户门户中的所有访问行为（包括查看、下载、打印等），用于安全审计和合规目的。甲方将在所有共享文档中嵌入数字水印以追踪来源。</p>
<p>Party B consents to Party A recording all access activities in the customer portal (including viewing, downloading, printing, etc.) for security audit and compliance purposes. Party A will embed digital watermarks in all shared documents for source tracking.</p>

<h3>第五条 / Article 5 — 泄露通知义务 / Breach Notification</h3>
<p>如乙方发现或怀疑任何保密信息泄露，应在发现后<strong>24小时内</strong>书面通知甲方，并协助甲方进行调查和补救。</p>
<p>If Party B discovers or suspects any disclosure of confidential information, they must notify Party A in writing within <strong>24 hours</strong> of discovery and assist Party A in investigation and remediation.</p>

<h3>第六条 / Article 6 — 管辖法律 / Governing Law</h3>
<p>本协议适用中华人民共和国法律。因本协议引起的任何争议，双方应首先友好协商解决；协商不成的，提交上海仲裁委员会仲裁。</p>
<p>This agreement shall be governed by the laws of the People's Republic of China. Any disputes arising from this agreement shall first be resolved through amicable negotiation; failing which, they shall be submitted to the Shanghai Arbitration Commission for arbitration.</p>

<hr>
<p style="text-align: center; color: #999; font-size: 12px;">
  协议版本: v1.0 | 模板哈希将在签署后生成 | Template hash will be generated upon signing
</p>
</body>
</html>`.trim();

  const hash = createHash("sha256").update(html, "utf8").digest("hex");
  return { html, hash };
}

/**
 * Generate a cryptographically secure signature token (URL-safe, 48 bytes → 64 chars hex).
 */
export function generateSignatureToken(): string {
  return randomBytes(48).toString("hex");
}

/**
 * Compute the token expiry (24 hours from now).
 */
export function getTokenExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

/**
 * Generate a watermark token for document tracking.
 * Format: WM-{authId}-{docId}-{timestamp}-{random}
 */
export function generateWatermarkToken(authId: number, docId: number): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(6).toString("hex");
  return `WM-${authId}-${docId}-${ts}-${rand}`;
}
