// server/services/microsoft-graph/outlook.service.ts
// Outlook 邮件服务 - 连接 Microsoft Graph Mail API

import { graphRequest, isGraphConfigured } from "./config";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("outlook-mail");

// ============================================
// 类型定义
// ============================================

export interface GraphMailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>;
  ccRecipients?: Array<{ emailAddress: { name: string; address: string } }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  importance: "low" | "normal" | "high";
  hasAttachments: boolean;
  flag: { flagStatus: "notFlagged" | "flagged" | "complete" };
  parentFolderId: string;
  conversationId: string;
  webLink?: string;
}

export interface GraphMailFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

interface GraphListResponse<T> {
  value: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

// ============================================
// Graph API 邮件函数
// ============================================

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** 获取收件箱邮件列表 */
export async function getInboxMessages(
  userId: string,
  top: number = 25,
  skip: number = 0,
): Promise<GraphMailMessage[]> {
  if (!isGraphConfigured()) return getMockMessages();

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/mailFolders/inbox/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,flag,parentFolderId,conversationId`;
  const res = await graphRequest<GraphListResponse<GraphMailMessage>>(url);
  return res?.value ?? getMockMessages();
}

/** 获取未读邮件数量 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!isGraphConfigured()) return getMockMessages().filter((m) => !m.isRead).length;

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/mailFolders/inbox`;
  const res = await graphRequest<GraphMailFolder>(url);
  return res?.unreadItemCount ?? 0;
}

/** 获取邮件文件夹列表 */
export async function getMailFolders(userId: string): Promise<GraphMailFolder[]> {
  if (!isGraphConfigured()) return getMockFolders();

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/mailFolders?$top=20`;
  const res = await graphRequest<GraphListResponse<GraphMailFolder>>(url);
  return res?.value ?? getMockFolders();
}

/** 获取单封邮件详情（含完整body） */
export async function getMessageDetail(
  userId: string,
  messageId: string,
): Promise<GraphMailMessage | null> {
  if (!isGraphConfigured()) {
    return getMockMessages().find((m) => m.id === messageId) ?? null;
  }

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`;
  return graphRequest<GraphMailMessage>(url);
}

/** 发送邮件 */
export async function sendMail(
  userId: string,
  message: {
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    bodyType?: "Text" | "HTML";
  },
): Promise<boolean> {
  if (!isGraphConfigured()) {
    log.info({ userId, subject: message.subject }, "Mock sendMail");
    return true;
  }

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/sendMail`;
  const payload = {
    message: {
      subject: message.subject,
      body: { contentType: message.bodyType ?? "HTML", content: message.body },
      toRecipients: message.to.map((r) => ({
        emailAddress: { address: r.email, name: r.name ?? r.email },
      })),
      ccRecipients: message.cc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name ?? r.email },
      })),
    },
    saveToSentItems: true,
  };

  const res = await graphRequest<void>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // sendMail returns 202 with no body on success — graphRequest returns null for empty bodies
  return true;
}

/** 回复邮件 */
export async function replyMail(
  userId: string,
  messageId: string,
  comment: string,
): Promise<boolean> {
  if (!isGraphConfigured()) {
    log.info({ userId, messageId }, "Mock replyMail");
    return true;
  }

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/reply`;
  await graphRequest<void>(url, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
  return true;
}

/** 转发邮件 */
export async function forwardMail(
  userId: string,
  messageId: string,
  toRecipients: Array<{ email: string; name?: string }>,
  comment?: string,
): Promise<boolean> {
  if (!isGraphConfigured()) {
    log.info({ userId, messageId }, "Mock forwardMail");
    return true;
  }

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/forward`;
  await graphRequest<void>(url, {
    method: "POST",
    body: JSON.stringify({
      comment: comment ?? "",
      toRecipients: toRecipients.map((r) => ({
        emailAddress: { address: r.email, name: r.name ?? r.email },
      })),
    }),
  });
  return true;
}

/** 标记邮件为已读 */
export async function markAsRead(
  userId: string,
  messageId: string,
): Promise<boolean> {
  if (!isGraphConfigured()) return true;

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`;
  await graphRequest<void>(url, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });
  return true;
}

/** 删除邮件 */
export async function deleteMail(
  userId: string,
  messageId: string,
): Promise<boolean> {
  if (!isGraphConfigured()) return true;

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`;
  await graphRequest<void>(url, { method: "DELETE" });
  return true;
}

/** 搜索邮件 */
export async function searchMail(
  userId: string,
  query: string,
  top: number = 25,
): Promise<GraphMailMessage[]> {
  if (!isGraphConfigured()) {
    const q = query.toLowerCase();
    return getMockMessages().filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.from.emailAddress.name.toLowerCase().includes(q) ||
        m.bodyPreview.toLowerCase().includes(q),
    );
  }

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(userId)}/messages?$search="${encodeURIComponent(query)}"&$top=${top}&$orderby=receivedDateTime desc`;
  const res = await graphRequest<GraphListResponse<GraphMailMessage>>(url);
  return res?.value ?? [];
}

// ============================================
// Mock 数据（Graph API 未配置时使用）
// ============================================

function getMockMessages(): GraphMailMessage[] {
  const now = Date.now();
  const hour = 3600000;

  return [
    {
      id: "mock-mail-1",
      subject: "M3阶段评审会议通知",
      bodyPreview: "各位同事，M3阶段评审会议定于本周五下午2点在A301会议室召开，请提前准备相关材料...",
      body: { contentType: "HTML", content: "<p>各位同事，</p><p>M3阶段评审会议定于本周五下午2点在A301会议室召开，请提前准备以下材料：</p><ul><li>项目进度报告</li><li>风险评估矩阵</li><li>FMEA更新</li></ul><p>请准时参加。</p><p>洪小东</p>" },
      from: { emailAddress: { name: "洪小东", address: "hong.xd@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 0.5 * hour).toISOString(),
      sentDateTime: new Date(now - 0.5 * hour).toISOString(),
      isRead: false,
      importance: "high",
      hasAttachments: true,
      flag: { flagStatus: "flagged" },
      parentFolderId: "inbox",
      conversationId: "conv-1",
    },
    {
      id: "mock-mail-2",
      subject: "BOM变更审批 — BU4半导体项目",
      bodyPreview: "附件为最新的BOM变更申请表，涉及3个零部件替代方案，请审核后签字确认...",
      body: { contentType: "HTML", content: "<p>李大鹏，</p><p>附件为最新的BOM变更申请表，涉及3个零部件替代方案：</p><ol><li>电容C23: 村田→TDK（等效替代）</li><li>连接器J5: TE→Molex（客户指定）</li><li>IC U12: TI→ADI（性能升级）</li></ol><p>请审核后签字确认。</p><p>孙坚</p>" },
      from: { emailAddress: { name: "孙坚", address: "sun.jian@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 2 * hour).toISOString(),
      sentDateTime: new Date(now - 2 * hour).toISOString(),
      isRead: false,
      importance: "high",
      hasAttachments: true,
      flag: { flagStatus: "notFlagged" },
      parentFolderId: "inbox",
      conversationId: "conv-2",
    },
    {
      id: "mock-mail-3",
      subject: "供应商交期延迟通知 — 订单PO-2026-0342",
      bodyPreview: "通知贵司，因原材料短缺，订单PO-2026-0342的交期将延迟5个工作日...",
      body: { contentType: "HTML", content: "<p>尊敬的采购部：</p><p>通知贵司，因原材料短缺，订单PO-2026-0342的交期将延迟5个工作日。新的预计交付日期为3月15日。</p><p>我们将尽力加快生产进度，如有进展会及时通知。</p><p>张经理<br/>华东精密零部件有限公司</p>" },
      from: { emailAddress: { name: "张经理（华东精密）", address: "zhang@huadong-parts.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 4 * hour).toISOString(),
      sentDateTime: new Date(now - 4 * hour).toISOString(),
      isRead: false,
      importance: "normal",
      hasAttachments: false,
      flag: { flagStatus: "notFlagged" },
      parentFolderId: "inbox",
      conversationId: "conv-3",
    },
    {
      id: "mock-mail-4",
      subject: "PPAP文件包提交确认",
      bodyPreview: "PPAP第三阶段文件已成功提交至客户质量平台，等待客户审核...",
      body: { contentType: "HTML", content: "<p>团队，</p><p>PPAP第三阶段文件包已成功提交至客户质量平台，包含以下文件：</p><ul><li>尺寸检验报告</li><li>材料认证证书</li><li>过程能力研究(Cpk报告)</li><li>控制计划</li></ul><p>预计客户审核周期为5-7个工作日。</p><p>洪香龙</p>" },
      from: { emailAddress: { name: "洪香龙", address: "hong.xl@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 6 * hour).toISOString(),
      sentDateTime: new Date(now - 6 * hour).toISOString(),
      isRead: true,
      importance: "normal",
      hasAttachments: true,
      flag: { flagStatus: "complete" },
      parentFolderId: "inbox",
      conversationId: "conv-4",
    },
    {
      id: "mock-mail-5",
      subject: "本周绩效数据汇总",
      bodyPreview: "附件为本周各BU绩效数据汇总表，OEE整体提升2.3%，详见附件...",
      body: { contentType: "HTML", content: "<p>各位领导，</p><p>附件为本周各BU绩效数据汇总表：</p><table border='1' style='border-collapse:collapse;padding:4px'><tr><th>BU</th><th>OEE</th><th>产量达成</th></tr><tr><td>海外</td><td>92.1%</td><td>98.5%</td></tr><tr><td>商用车</td><td>88.7%</td><td>95.2%</td></tr><tr><td>乘用车</td><td>91.3%</td><td>97.8%</td></tr><tr><td>半导体</td><td>94.5%</td><td>99.1%</td></tr></table><p>OEE整体提升2.3%。详见附件。</p><p>数据分析部</p>" },
      from: { emailAddress: { name: "数据分析部", address: "analytics@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 8 * hour).toISOString(),
      sentDateTime: new Date(now - 8 * hour).toISOString(),
      isRead: true,
      importance: "normal",
      hasAttachments: true,
      flag: { flagStatus: "notFlagged" },
      parentFolderId: "inbox",
      conversationId: "conv-5",
    },
    {
      id: "mock-mail-6",
      subject: "8D报告审批 — 客诉CQ-2026-089",
      bodyPreview: "请审批附件中的8D报告，客户要求本周五前回复根因分析和纠正措施...",
      body: { contentType: "HTML", content: "<p>质量经理，</p><p>客诉CQ-2026-089的8D报告已完成，请审批：</p><p><b>问题描述：</b>产品表面划痕超标<br/><b>根本原因：</b>包装缓冲材料老化<br/><b>纠正措施：</b>更换EPE缓冲材料，增加包装检验工位</p><p>客户要求本周五前回复。</p><p>品管部 钱绍辉</p>" },
      from: { emailAddress: { name: "钱绍辉", address: "qian.sh@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 12 * hour).toISOString(),
      sentDateTime: new Date(now - 12 * hour).toISOString(),
      isRead: true,
      importance: "high",
      hasAttachments: true,
      flag: { flagStatus: "flagged" },
      parentFolderId: "inbox",
      conversationId: "conv-6",
    },
    {
      id: "mock-mail-7",
      subject: "IT系统维护通知 — GRT平台升级",
      bodyPreview: "GRT系统将于今晚22:00-次日2:00进行维护升级，届时系统将暂停服务...",
      body: { contentType: "HTML", content: "<p>全体员工，</p><p>GRT系统将于今晚22:00-次日2:00进行维护升级，届时以下服务将暂停：</p><ul><li>GRT工作台</li><li>生产执行系统</li><li>OA审批流程</li></ul><p>请提前保存工作。如有紧急事项请联系IT值班热线：8888。</p><p>IT运维部</p>" },
      from: { emailAddress: { name: "IT运维部", address: "it-ops@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "全体员工", address: "all@grt-group.com" } }],
      receivedDateTime: new Date(now - 18 * hour).toISOString(),
      sentDateTime: new Date(now - 18 * hour).toISOString(),
      isRead: true,
      importance: "normal",
      hasAttachments: false,
      flag: { flagStatus: "notFlagged" },
      parentFolderId: "inbox",
      conversationId: "conv-7",
    },
    {
      id: "mock-mail-8",
      subject: "新员工培训安排 — 3月第一周",
      bodyPreview: "3月第一周新员工入职培训安排如下，请相关部门准备培训材料...",
      body: { contentType: "HTML", content: "<p>各部门培训负责人，</p><p>3月第一周新员工入职培训安排：</p><p>周一: 公司文化与制度<br/>周二: 安全生产培训<br/>周三: 质量体系(IATF 16949)基础<br/>周四: GRT系统操作培训<br/>周五: 岗位实操</p><p>请相关部门提前准备培训材料。</p><p>HR部 周主管</p>" },
      from: { emailAddress: { name: "周主管", address: "zhou@grt-group.com" } },
      toRecipients: [{ emailAddress: { name: "我", address: "me@grt-group.com" } }],
      receivedDateTime: new Date(now - 24 * hour).toISOString(),
      sentDateTime: new Date(now - 24 * hour).toISOString(),
      isRead: true,
      importance: "normal",
      hasAttachments: false,
      flag: { flagStatus: "notFlagged" },
      parentFolderId: "inbox",
      conversationId: "conv-8",
    },
  ];
}

function getMockFolders(): GraphMailFolder[] {
  return [
    { id: "inbox", displayName: "收件箱", parentFolderId: "", childFolderCount: 0, unreadItemCount: 3, totalItemCount: 128 },
    { id: "sentitems", displayName: "已发送邮件", parentFolderId: "", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 45 },
    { id: "drafts", displayName: "草稿", parentFolderId: "", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 2 },
    { id: "deleteditems", displayName: "已删除邮件", parentFolderId: "", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 15 },
    { id: "junkemail", displayName: "垃圾邮件", parentFolderId: "", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 7 },
  ];
}

export const outlookService = {
  getInboxMessages,
  getUnreadCount,
  getMailFolders,
  getMessageDetail,
  sendMail,
  replyMail,
  forwardMail,
  markAsRead,
  deleteMail,
  searchMail,
};
