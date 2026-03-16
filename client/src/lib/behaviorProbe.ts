/**
 * 行为探针SDK
 * 用于采集用户行为数据，支持技能推断和个人智能体功能
 */

import React from 'react';

// 行为事件类型
export type BehaviorEventType = 
  | 'page_view'           // 页面访问
  | 'click'               // 点击事件
  | 'form_submit'         // 表单提交
  | 'file_upload'         // 文件上传
  | 'search'              // 搜索操作
  | 'navigation'          // 导航切换
  | 'feature_use'         // 功能使用
  | 'document_edit'       // 文档编辑
  | 'data_export'         // 数据导出
  | 'ai_interaction'      // AI交互
  | 'approval_action'     // 审批操作
  | 'project_action'      // 项目操作
  | 'custom';             // 自定义事件

// 行为事件数据结构
export interface BehaviorEvent {
  eventType: BehaviorEventType;
  context: string;           // 上下文（页面/模块名称）
  action: string;            // 具体操作
  actionData?: Record<string, any>;  // 操作相关数据
  impliedSkill?: string;     // AI推断的技能标签
  timestamp: number;         // 时间戳
  sessionId: string;         // 会话ID
  userId?: string;           // 用户ID（登录后）
  userDid?: string;          // 用户DID
  metadata?: {
    pageUrl: string;
    referrer: string;
    userAgent: string;
    screenSize: string;
    duration?: number;       // 操作持续时间
  };
}

// 技能推断规则
const skillInferenceRules: Record<string, { pattern: RegExp; skill: string }[]> = {
  'project_action': [
    { pattern: /gate.*pass/i, skill: '项目管理 - 阶段门禁管控' },
    { pattern: /risk.*create/i, skill: '风险管理 - 风险识别' },
    { pattern: /deliverable.*upload/i, skill: '项目管理 - 交付物管理' },
  ],
  'document_edit': [
    { pattern: /technical.*spec/i, skill: '技术文档编写' },
    { pattern: /quotation/i, skill: '商务报价' },
    { pattern: /solution.*design/i, skill: '方案设计' },
  ],
  'ai_interaction': [
    { pattern: /sales.*negotiation/i, skill: 'AI销售 - 谈判策略' },
    { pattern: /skill.*capsule/i, skill: '液态用工 - 技能胶囊管理' },
  ],
  'approval_action': [
    { pattern: /expense.*approve/i, skill: '财务审批' },
    { pattern: /gate.*review/i, skill: '项目评审' },
  ],
};

// 生成会话ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 获取或创建会话ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('grt_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('grt_session_id', sessionId);
  }
  return sessionId;
}

// 推断技能标签
function inferSkill(eventType: BehaviorEventType, action: string): string | undefined {
  const rules = skillInferenceRules[eventType];
  if (!rules) return undefined;
  
  for (const rule of rules) {
    if (rule.pattern.test(action)) {
      return rule.skill;
    }
  }
  return undefined;
}

// 事件队列
let eventQueue: BehaviorEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5秒批量发送
const MAX_QUEUE_SIZE = 50;   // 最大队列大小

// 发送事件到服务器
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;
  
  const eventsToSend = [...eventQueue];
  eventQueue = [];
  
  try {
    const response = await fetch('/api/trpc/gemini.recordBehavior', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: { events: eventsToSend }
      }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      // 发送失败，将事件放回队列
      eventQueue = [...eventsToSend, ...eventQueue].slice(0, MAX_QUEUE_SIZE * 2);
      console.warn('[BehaviorProbe] Failed to send events, will retry');
    }
  } catch (error) {
    // 网络错误，将事件放回队列
    eventQueue = [...eventsToSend, ...eventQueue].slice(0, MAX_QUEUE_SIZE * 2);
    console.warn('[BehaviorProbe] Network error, will retry');
  }
}

// 调度刷新
function scheduleFlush(): void {
  if (flushTimer) return;
  
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, FLUSH_INTERVAL);
}

// 行为探针类
class BehaviorProbe {
  private enabled: boolean = true;
  private userId?: string;
  private userDid?: string;
  private currentPage: string = '';
  private pageEnterTime: number = 0;

  // 初始化
  init(options?: { userId?: string; userDid?: string; enabled?: boolean }): void {
    if (options?.enabled === false) {
      this.enabled = false;
      return;
    }
    
    this.userId = options?.userId;
    this.userDid = options?.userDid;
    this.enabled = true;
    
    // 监听页面卸载，发送剩余事件
    window.addEventListener('beforeunload', () => {
      if (eventQueue.length > 0) {
        // 使用 sendBeacon 确保数据发送
        navigator.sendBeacon('/api/trpc/gemini.recordBehavior', JSON.stringify({
          json: { events: eventQueue }
        }));
      }
    });
    
    // 监听可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    });
  }

  // 设置用户信息
  setUser(userId: string, userDid?: string): void {
    this.userId = userId;
    this.userDid = userDid;
  }

  // 禁用探针
  disable(): void {
    this.enabled = false;
  }

  // 启用探针
  enable(): void {
    this.enabled = true;
  }

  // 记录事件
  track(
    eventType: BehaviorEventType,
    context: string,
    action: string,
    actionData?: Record<string, any>
  ): void {
    if (!this.enabled) return;
    
    const event: BehaviorEvent = {
      eventType,
      context,
      action,
      actionData,
      impliedSkill: inferSkill(eventType, action),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      userId: this.userId,
      userDid: this.userDid,
      metadata: {
        pageUrl: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      },
    };
    
    eventQueue.push(event);
    
    // 队列满时立即发送
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }

  // 页面访问
  trackPageView(pageName: string, pageData?: Record<string, any>): void {
    // 记录上一页面的停留时间
    if (this.currentPage && this.pageEnterTime) {
      const duration = Date.now() - this.pageEnterTime;
      this.track('page_view', this.currentPage, 'page_leave', { duration });
    }
    
    this.currentPage = pageName;
    this.pageEnterTime = Date.now();
    this.track('page_view', pageName, 'page_enter', pageData);
  }

  // 点击事件
  trackClick(context: string, elementName: string, elementData?: Record<string, any>): void {
    this.track('click', context, elementName, elementData);
  }

  // 表单提交
  trackFormSubmit(formName: string, formData?: Record<string, any>): void {
    this.track('form_submit', formName, 'submit', formData);
  }

  // 功能使用
  trackFeatureUse(featureName: string, action: string, data?: Record<string, any>): void {
    this.track('feature_use', featureName, action, data);
  }

  // 项目操作
  trackProjectAction(projectId: string, action: string, data?: Record<string, any>): void {
    this.track('project_action', `project_${projectId}`, action, data);
  }

  // AI交互
  trackAIInteraction(aiModule: string, action: string, data?: Record<string, any>): void {
    this.track('ai_interaction', aiModule, action, data);
  }

  // 审批操作
  trackApprovalAction(approvalType: string, action: string, data?: Record<string, any>): void {
    this.track('approval_action', approvalType, action, data);
  }

  // 搜索操作
  trackSearch(searchContext: string, query: string, resultCount?: number): void {
    this.track('search', searchContext, 'search', { query, resultCount });
  }

  // 文档编辑
  trackDocumentEdit(documentType: string, action: string, data?: Record<string, any>): void {
    this.track('document_edit', documentType, action, data);
  }

  // 数据导出
  trackDataExport(exportType: string, format: string, data?: Record<string, any>): void {
    this.track('data_export', exportType, format, data);
  }

  // 自定义事件
  trackCustom(context: string, action: string, data?: Record<string, any>): void {
    this.track('custom', context, action, data);
  }
}

// 导出单例
export const behaviorProbe = new BehaviorProbe();

// React Hook
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useBehaviorProbe(pageName: string, pageData?: Record<string, any>) {
  const [location] = useLocation();
  
  useEffect(() => {
    behaviorProbe.trackPageView(pageName, { ...pageData, path: location });
  }, [pageName, location]);
  
  return behaviorProbe;
}

// 高阶组件
export function withBehaviorProbe<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string
) {
  return function BehaviorProbeWrapper(props: P) {
    useBehaviorProbe(pageName);
    return React.createElement(WrappedComponent, props);
  };
}
