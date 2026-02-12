/**
 * DLP (Data Loss Prevention) 审计中间件
 * 
 * 功能：
 * 1. 邮件导出前置检查（CRM白名单验证）
 * 2. 内容审计（AI审计服务调用）
 * 3. 敏感数据拦截（BOM表、价格矩阵、CAD链接）
 * 4. 合规日志记录
 */

import { TRPCError } from "@trpc/server";
import axios from "axios";

/**
 * DLP审计结果接口
 */
interface DLPAuditResult {
  riskScore: number; // 0-100
  violations: string[];
  sensitiveDataFound: boolean;
  recommendation: "allow" | "block" | "review";
  timestamp: Date;
}

/**
 * 邮件导出请求接口
 */
interface EmailExportRequest {
  recipients: string[];
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: Buffer;
    mimeType: string;
  }[];
}

/**
 * CRM白名单检查结果
 */
interface CRMWhitelistResult {
  isValid: boolean;
  reason?: string;
  allowedDomains: string[];
}

/**
 * 合规日志接口
 */
interface ComplianceLog {
  timestamp: Date;
  action: string;
  userId: string;
  status: "allowed" | "blocked" | "flagged";
  riskScore: number;
  details: string;
  violations: string[];
}

/**
 * CRM白名单 - 企业域名列表
 */
const CRM_WHITELIST = {
  domains: [
    "company.com",
    "jared.com",
    "gerrytech.com",
    "supplier-partner.com",
    // 添加更多企业域名
  ],
  emails: [
    "supplier@jared.com",
    "partner@gerrytech.com",
    // 添加特定的企业邮箱
  ],
};

/**
 * 敏感数据模式
 */
const SENSITIVE_PATTERNS = {
  bomTable: /BOM|物料清单|bill of materials/i,
  priceMatrix: /价格矩阵|价格表|pricing|cost matrix/i,
  cadLink: /\.dwg|\.dxf|\.step|\.iges|cad|CAD/i,
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
  internalIP: /100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}/,
  secretKeyword: /绝密|机密|confidential|secret|proprietary/i,
};

/**
 * 检查CRM白名单
 */
export async function checkCRMWhitelist(emailList: string[]): Promise<CRMWhitelistResult> {
  const invalidEmails: string[] = [];

  for (const email of emailList) {
    const isValid = validateEmailDomain(email);
    if (!isValid) {
      invalidEmails.push(email);
    }
  }

  if (invalidEmails.length > 0) {
    return {
      isValid: false,
      reason: `以下邮箱不在CRM白名单中: ${invalidEmails.join(", ")}`,
      allowedDomains: CRM_WHITELIST.domains,
    };
  }

  return {
    isValid: true,
    allowedDomains: CRM_WHITELIST.domains,
  };
}

/**
 * 验证邮箱域名
 */
function validateEmailDomain(email: string): boolean {
  const domain = email.split("@")[1];

  // 检查是否在白名单中
  if (CRM_WHITELIST.emails.includes(email)) {
    return true;
  }

  if (CRM_WHITELIST.domains.includes(domain)) {
    return true;
  }

  // 拒绝公共域名
  const publicDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  if (publicDomains.includes(domain)) {
    return false;
  }

  return false;
}

/**
 * 执行内容审计
 */
export async function auditContent(content: string): Promise<DLPAuditResult> {
  try {
    // 调用本地AI审计服务
    const response = await axios.post("http://ai-auditor:11434/audit", {
      content,
      checkSensitiveData: true,
      checkIPAddresses: true,
      checkSecretKeywords: true,
    });

    const result: DLPAuditResult = {
      riskScore: response.data.riskScore || 0,
      violations: response.data.violations || [],
      sensitiveDataFound: response.data.sensitiveDataFound || false,
      recommendation: response.data.recommendation || "allow",
      timestamp: new Date(),
    };

    return result;
  } catch (error) {
    console.error("[DLP] AI Auditor service error:", error);

    // 服务不可用时进行本地检查
    return performLocalAudit(content);
  }
}

/**
 * 本地内容审计（当AI服务不可用时）
 */
function performLocalAudit(content: string): DLPAuditResult {
  let riskScore = 0;
  const violations: string[] = [];
  let sensitiveDataFound = false;

  // 检查敏感数据
  if (SENSITIVE_PATTERNS.bomTable.test(content)) {
    violations.push("包含BOM表数据");
    riskScore += 30;
    sensitiveDataFound = true;
  }

  if (SENSITIVE_PATTERNS.priceMatrix.test(content)) {
    violations.push("包含价格矩阵数据");
    riskScore += 35;
    sensitiveDataFound = true;
  }

  if (SENSITIVE_PATTERNS.cadLink.test(content)) {
    violations.push("包含CAD文件链接");
    riskScore += 25;
    sensitiveDataFound = true;
  }

  if (SENSITIVE_PATTERNS.internalIP.test(content)) {
    violations.push("包含内部IP地址");
    riskScore += 40;
    sensitiveDataFound = true;
  }

  if (SENSITIVE_PATTERNS.secretKeyword.test(content)) {
    violations.push("包含绝密/机密关键词");
    riskScore += 50;
    sensitiveDataFound = true;
  }

  const recommendation = riskScore > 75 ? "block" : riskScore > 50 ? "review" : "allow";

  return {
    riskScore,
    violations,
    sensitiveDataFound,
    recommendation,
    timestamp: new Date(),
  };
}

/**
 * 邮件导出前置检查
 */
export async function validateEmailExport(request: EmailExportRequest): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // 步骤1: 检查CRM白名单
  const whitelistResult = await checkCRMWhitelist(request.recipients);
  if (!whitelistResult.isValid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `DLP策略拦截: ${whitelistResult.reason}。请使用经认证的企业邮箱。`,
    });
  }

  // 步骤2: 审计邮件内容
  const auditResult = await auditContent(request.body);

  if (auditResult.riskScore > 75) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `DLP策略拦截: 内容包含敏感数据。风险评分: ${auditResult.riskScore}/100。违规项: ${auditResult.violations.join(", ")}`,
    });
  }

  if (auditResult.recommendation === "review") {
    // 标记为需要审查，但允许发送
    console.warn("[DLP] Email flagged for review:", {
      recipients: request.recipients,
      riskScore: auditResult.riskScore,
      violations: auditResult.violations,
    });
  }

  // 步骤3: 检查附件
  if (request.attachments && request.attachments.length > 0) {
    for (const attachment of request.attachments) {
      if (
        attachment.filename.endsWith(".xlsx") ||
        attachment.filename.endsWith(".xls")
      ) {
        // BOM表格需要加密
        console.warn("[DLP] Excel attachment detected - encryption required");
      }
    }
  }

  return { allowed: true };
}

/**
 * 记录合规日志
 */
export async function logComplianceEvent(log: ComplianceLog): Promise<void> {
  // 将日志写入数据库或日志系统
  console.log("[COMPLIANCE LOG]", {
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    userId: log.userId,
    status: log.status,
    riskScore: log.riskScore,
    violations: log.violations,
    details: log.details,
  });

  // 如果是被拦截的操作，发送告警
  if (log.status === "blocked") {
    console.error("[ALERT] DLP Block Event:", log);
    // 可以在这里集成告警系统（邮件、Slack等）
  }
}

/**
 * 生成合规阻断日志
 */
export function generateBlockLog(
  action: string,
  userId: string,
  violations: string[]
): ComplianceLog {
  return {
    timestamp: new Date(),
    action,
    userId,
    status: "blocked",
    riskScore: 100,
    details: `操作被DLP策略拦截: ${action}`,
    violations,
  };
}

/**
 * 文件导出前置检查
 */
export async function validateFileExport(
  filename: string,
  content: Buffer | string,
  userId: string
): Promise<void> {
  const contentStr = typeof content === "string" ? content : content.toString();

  // 审计文件内容
  const auditResult = await auditContent(contentStr);

  if (auditResult.riskScore > 75) {
    const log = generateBlockLog(`File Export: ${filename}`, userId, auditResult.violations);
    await logComplianceEvent(log);

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `内容包含敏感IP，已触发DLP拦截。`,
    });
  }

  // 记录允许的导出
  await logComplianceEvent({
    timestamp: new Date(),
    action: `File Export: ${filename}`,
    userId,
    status: "allowed",
    riskScore: auditResult.riskScore,
    details: `文件导出已审计并通过`,
    violations: [],
  });
}
