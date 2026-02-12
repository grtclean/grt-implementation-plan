/**
 * AI Coach 事件监听器与拦截器类型定义
 * GRT智能系统 - AI Coach模块
 */

// 事件上下文
export interface EventContext {
  actionType: string;
  user: string;
  userId: string;
  userName?: string;
  userRole?: string;
  userCertifications?: string[];
  timestamp: Date;
  source: 'web' | 'mobile' | 'api';
  sessionId: string;
}

// 表单提交数据
export interface FormSubmission {
  projectId: string;
  formType: string;
  data: Record<string, any>;
  attachments?: string[];
  submittedAt: Date;
}

// 操作建议
export interface ActionAdvice {
  status: 'PROCEED' | 'WARNING' | 'BLOCK' | 'PENDING_APPROVAL';
  message?: string;
  optimizationSuggestion?: string;
  riskScore?: number;
  requiredApproval?: string;
  errorCode?: string;
  approvers?: string[];
  timeout?: number;
}

// 告警级别
export enum AlarmLevel {
  INFO = 'INFO',           // L0: 信息提示
  WARNING = 'WARNING',     // L1: 警告
  ALERT = 'ALERT',         // L2: 需关注
  CRITICAL = 'CRITICAL',   // L3: 严重，需熔断
  EMERGENCY = 'EMERGENCY'  // L4: 紧急，需CTO介入
}

// 风险分析结果
export interface RiskAnalysis {
  riskScore: number;       // 0-100
  reason: string;
  shortAdvice: string;
  optimizedContent?: string;
  relatedRules?: string[];
  historicalComparison?: {
    avgCost: number;
    avgDuration: number;
    deviation: number;
  };
}

// 项目阶段定义
export type ProjectPhase = 
  | 'M0_Initiation'
  | 'M1_Solution_NDA'
  | 'M2_Contract_Pricing'
  | 'M3_Design_BOM'
  | 'M4_Internal_Review'
  | 'M5_Customer_Review'
  | 'M6_Production'
  | 'M7_Assembly'
  | 'M8_Testing'
  | 'M9_Shipping_Prep'
  | 'M10_Delivery'
  | 'M11_Installation'
  | 'M12_Closure';

// 状态转换事件
export type ProjectEvent =
  | 'KICKOFF_MEETING_HELD'
  | 'NDA_SIGNED'
  | 'CONTRACT_SIGNED'
  | 'BOM_RELEASED'
  | 'REVIEW_PASSED'
  | 'REVIEW_FAILED'
  | 'CUSTOMER_APPROVED'
  | 'PRODUCTION_COMPLETE'
  | 'ASSEMBLY_COMPLETE'
  | 'TESTING_PASSED'
  | 'SHIPMENT_REQUESTED'
  | 'DELIVERED'
  | 'INSTALLATION_COMPLETE'
  | 'ACCEPTANCE_SIGNED';

// 企业规则
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'process' | 'quality' | 'compliance';
  priority: number;
  conditions: string[];
  actions: string[];
  isActive: boolean;
}

// 通知配置
export interface NotificationConfig {
  channel: 'wecom' | 'dingtalk' | 'email' | 'sms';
  webhookUrl?: string;
  recipients: string[];
  template: string;
}

// RAG检索结果
export interface RAGSearchResult {
  rules: BusinessRule[];
  relevanceScore: number;
  context: string;
}
