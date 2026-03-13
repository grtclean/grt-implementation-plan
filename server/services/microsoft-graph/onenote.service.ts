/**
 * Microsoft Graph — OneNote Service
 *
 * Provides access to OneNote notebooks for document/meeting notes.
 * Data is dual-stored in both OneNote and GRT collaboration docs.
 */
import { graphRequest, isGraphConfigured } from "./config";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("ms-graph-onenote");

// ── Types ────────────────────────────────────────────────

export interface OneNoteNotebook {
  id: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isDefault: boolean;
  sectionCount: number;
}

export interface OneNoteSection {
  id: string;
  displayName: string;
  notebookId: string;
  createdDateTime: string;
  pageCount: number;
}

export interface OneNotePage {
  id: string;
  title: string;
  sectionId: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  contentUrl: string;
  content?: string; // HTML body
}

// ── Mock Data ────────────────────────────────────────────

const mockNotebooks: OneNoteNotebook[] = [
  {
    id: "nb-1", displayName: "GRT 项目笔记",
    createdDateTime: "2026-01-05T09:00:00Z", lastModifiedDateTime: "2026-03-05T14:30:00Z",
    isDefault: true, sectionCount: 3,
  },
  {
    id: "nb-2", displayName: "技术文档",
    createdDateTime: "2026-01-15T09:00:00Z", lastModifiedDateTime: "2026-03-04T11:00:00Z",
    isDefault: false, sectionCount: 2,
  },
];

const mockSections: OneNoteSection[] = [
  { id: "sec-1", displayName: "会议记录", notebookId: "nb-1", createdDateTime: "2026-01-05T09:00:00Z", pageCount: 5 },
  { id: "sec-2", displayName: "设计评审", notebookId: "nb-1", createdDateTime: "2026-01-10T09:00:00Z", pageCount: 3 },
  { id: "sec-3", displayName: "客户沟通", notebookId: "nb-1", createdDateTime: "2026-02-01T09:00:00Z", pageCount: 2 },
  { id: "sec-4", displayName: "PLC 程序笔记", notebookId: "nb-2", createdDateTime: "2026-01-15T09:00:00Z", pageCount: 4 },
  { id: "sec-5", displayName: "BOM 变更记录", notebookId: "nb-2", createdDateTime: "2026-02-10T09:00:00Z", pageCount: 2 },
];

const mockPages: OneNotePage[] = [
  {
    id: "page-1", title: "M3 阶段评审会议纪要", sectionId: "sec-1",
    createdDateTime: "2026-03-01T10:00:00Z", lastModifiedDateTime: "2026-03-01T12:00:00Z",
    contentUrl: "", content: "<h1>M3 阶段评审</h1><p>日期：2026-03-01</p><h2>议题</h2><ul><li>机械结构完成度 75%</li><li>PLC 程序完成度 50%</li><li>BOM 清单待审核</li></ul><h2>决议</h2><p>M3 阶段延期1周，需完成 BOM 审核后进入 M4。</p>",
  },
  {
    id: "page-2", title: "清洗槽结构优化讨论", sectionId: "sec-2",
    createdDateTime: "2026-02-28T14:00:00Z", lastModifiedDateTime: "2026-02-28T16:30:00Z",
    contentUrl: "", content: "<h1>清洗槽结构优化</h1><p>参会：孙国祥、李大鹏、洪香龙</p><h2>问题</h2><p>现有清洗槽内壁容易积垢，影响清洗效果。</p><h2>方案</h2><ol><li>采用斜面设计，角度 15°</li><li>增加超声波辅助</li><li>喷嘴布局从 4 点改为 6 点环形</li></ol>",
  },
  {
    id: "page-3", title: "ABC 公司需求确认", sectionId: "sec-3",
    createdDateTime: "2026-02-20T09:00:00Z", lastModifiedDateTime: "2026-02-20T11:00:00Z",
    contentUrl: "", content: "<h1>ABC 公司需求确认</h1><p>客户：ABC 半导体</p><h2>需求要点</h2><ul><li>清洗能力：300片/小时</li><li>兼容尺寸：6寸/8寸</li><li>洁净度：Class 100</li></ul><h2>交付时间</h2><p>2026年 Q3 交付首台样机</p>",
  },
  {
    id: "page-4", title: "PLC 程序架构设计", sectionId: "sec-4",
    createdDateTime: "2026-02-15T09:00:00Z", lastModifiedDateTime: "2026-03-03T10:00:00Z",
    contentUrl: "", content: "<h1>PLC 程序架构</h1><h2>模块划分</h2><ul><li>Main：主循环控制</li><li>Motion：运动控制（X/Y/Z 轴）</li><li>Process：工艺参数管理</li><li>Safety：安全联锁</li><li>IO：输入输出映射</li></ul><h2>通讯协议</h2><p>HMI 通过 Modbus TCP 连接，上位机通过 OPC UA。</p>",
  },
];

// ── Service ──────────────────────────────────────────────

export const onenoteService = {
  /**
   * List all notebooks.
   */
  async getNotebooks(userId?: string): Promise<OneNoteNotebook[]> {
    if (!isGraphConfigured()) return mockNotebooks;

    const base = userId
      ? `https://graph.microsoft.com/v1.0/users/${userId}`
      : "https://graph.microsoft.com/v1.0/me";
    const result = await graphRequest<{ value: any[] }>(`${base}/onenote/notebooks`);
    if (!result?.value) return mockNotebooks;

    return result.value.map((nb: any) => ({
      id: nb.id,
      displayName: nb.displayName,
      createdDateTime: nb.createdDateTime ?? "",
      lastModifiedDateTime: nb.lastModifiedDateTime ?? "",
      isDefault: nb.isDefault ?? false,
      sectionCount: nb.sectionsUrl ? 0 : 0,
    }));
  },

  /**
   * List sections in a notebook.
   */
  async getSections(notebookId: string): Promise<OneNoteSection[]> {
    if (!isGraphConfigured()) return mockSections.filter(s => s.notebookId === notebookId);

    const endpoint = `https://graph.microsoft.com/v1.0/me/onenote/notebooks/${notebookId}/sections`;
    const result = await graphRequest<{ value: any[] }>(endpoint);
    if (!result?.value) return mockSections.filter(s => s.notebookId === notebookId);

    return result.value.map((s: any) => ({
      id: s.id,
      displayName: s.displayName,
      notebookId,
      createdDateTime: s.createdDateTime ?? "",
      pageCount: 0,
    }));
  },

  /**
   * List pages in a section.
   */
  async getPages(sectionId: string, top = 20): Promise<OneNotePage[]> {
    if (!isGraphConfigured()) return mockPages.filter(p => p.sectionId === sectionId);

    const endpoint = `https://graph.microsoft.com/v1.0/me/onenote/sections/${sectionId}/pages?$top=${top}&$orderby=lastModifiedDateTime desc`;
    const result = await graphRequest<{ value: any[] }>(endpoint);
    if (!result?.value) return mockPages.filter(p => p.sectionId === sectionId);

    return result.value.map((p: any) => ({
      id: p.id,
      title: p.title ?? "Untitled",
      sectionId,
      createdDateTime: p.createdDateTime ?? "",
      lastModifiedDateTime: p.lastModifiedDateTime ?? "",
      contentUrl: p.contentUrl ?? "",
    }));
  },

  /**
   * Get page content (HTML body).
   */
  async getPageContent(pageId: string): Promise<string> {
    if (!isGraphConfigured()) {
      const page = mockPages.find(p => p.id === pageId);
      return page?.content ?? "<p>Page not found</p>";
    }

    const endpoint = `https://graph.microsoft.com/v1.0/me/onenote/pages/${pageId}/content`;
    const result = await graphRequest<any>(endpoint);
    return typeof result === "string" ? result : "<p>Unable to load content</p>";
  },

  /**
   * Create a new page in a section.
   */
  async createPage(sectionId: string, title: string, htmlContent: string): Promise<OneNotePage | null> {
    log.info({ sectionId, title }, "Creating OneNote page");

    if (!isGraphConfigured()) {
      const newPage: OneNotePage = {
        id: `page-${Date.now()}`,
        title,
        sectionId,
        createdDateTime: new Date().toISOString(),
        lastModifiedDateTime: new Date().toISOString(),
        contentUrl: "",
        content: htmlContent,
      };
      mockPages.push(newPage);
      return newPage;
    }

    const endpoint = `https://graph.microsoft.com/v1.0/me/onenote/sections/${sectionId}/pages`;

    // OneNote API expects text/html body for page creation
    const body = `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>${htmlContent}</body>
</html>`;

    const result = await graphRequest<any>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/html" },
      body,
    });

    if (!result) return null;

    return {
      id: result.id,
      title: result.title ?? title,
      sectionId,
      createdDateTime: result.createdDateTime ?? new Date().toISOString(),
      lastModifiedDateTime: result.lastModifiedDateTime ?? new Date().toISOString(),
      contentUrl: result.contentUrl ?? "",
    };
  },

  /**
   * Update a page's content.
   */
  async updatePage(pageId: string, htmlContent: string): Promise<boolean> {
    log.info({ pageId }, "Updating OneNote page");

    if (!isGraphConfigured()) {
      const page = mockPages.find(p => p.id === pageId);
      if (page) {
        page.content = htmlContent;
        page.lastModifiedDateTime = new Date().toISOString();
      }
      return true;
    }

    const endpoint = `https://graph.microsoft.com/v1.0/me/onenote/pages/${pageId}/content`;
    const patchBody = JSON.stringify([
      { target: "body", action: "replace", content: htmlContent },
    ]);

    const result = await graphRequest<any>(endpoint, {
      method: "PATCH",
      body: patchBody,
    });

    return result !== null;
  },
};
