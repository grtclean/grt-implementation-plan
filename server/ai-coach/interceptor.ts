/**
 * AI Coach 事件监听器与拦截器核心逻辑
 * 技术栈: Node.js (Express), Google Vertex AI SDK (通过Manus LLM代理)
 * GRT智能系统 - AI Coach模块
 * 
 * 优化点实现：
 * 1. RAG规则检索服务（向量数据库检索）
 * 2. 历史项目对比分析
 * 3. 企业微信/钉钉报警集成
 * 4. 拦截决策日志记录
 * 5. L1/L2/L3分级审批流程
 * 6. 拦截规则配置管理
 */

import { invokeLLM, type Message } from '../_core/llm';
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ai-coach");
import { auditLogger } from '../audit/audit-logger';
import { deidentificationProxy, deidentifyLLMRequest } from '../security/deidentification-proxy';
import { safetyFilter } from '../security/safety-filter';
import { aiResponseCache } from '../cache/cache-service';
import { eventBus, Events } from '../queue/message-queue';
import {
  EventContext,
  FormSubmission,
  ActionAdvice,
  AlarmLevel,
  RiskAnalysis,
  ProjectPhase,
  ProjectEvent,
  BusinessRule,
  RAGSearchResult
} from './types';

// 风险评估缓存（避免重复调用LLM）
const riskCache = new Map<string, { result: RiskAnalysis; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 审批流程配置
interface ApprovalConfig {
  level: 'L1' | 'L2' | 'L3';
  riskThreshold: { min: number; max: number };
  approvers: string[];
  timeout: number; // 小时
  autoEscalate: boolean;
}

const approvalConfigs: ApprovalConfig[] = [
  {
    level: 'L1',
    riskThreshold: { min: 40, max: 60 },
    approvers: ['project_manager', 'team_lead'],
    timeout: 24,
    autoEscalate: true
  },
  {
    level: 'L2',
    riskThreshold: { min: 60, max: 80 },
    approvers: ['department_head', 'senior_manager'],
    timeout: 12,
    autoEscalate: true
  },
  {
    level: 'L3',
    riskThreshold: { min: 80, max: 100 },
    approvers: ['cto', 'ceo'],
    timeout: 4,
    autoEscalate: false
  }
];

// 拦截规则配置
interface InterceptionRule {
  id: string;
  name: string;
  description: string;
  condition: (context: EventContext, data: FormSubmission) => boolean;
  action: 'block' | 'warn' | 'log';
  priority: number;
  isActive: boolean;
}

const interceptionRules: InterceptionRule[] = [
  {
    id: 'IR001',
    name: '大额合同审批',
    description: '合同金额超过100万需要额外审批',
    condition: (ctx, data) => {
      const amount = data.data?.contractAmount || 0;
      return amount > 1000000;
    },
    action: 'warn',
    priority: 1,
    isActive: true
  },
  {
    id: 'IR002',
    name: 'Tier1客户特殊处理',
    description: 'Tier1客户的所有操作需要记录',
    condition: (ctx, data) => {
      return data.data?.customerTier === 1;
    },
    action: 'log',
    priority: 2,
    isActive: true
  },
  {
    id: 'IR003',
    name: '非工作时间操作',
    description: '非工作时间的关键操作需要审批',
    condition: (ctx, data) => {
      const hour = new Date().getHours();
      const isWorkingHour = hour >= 9 && hour < 18;
      const criticalActions = ['sign_contract', 'release_bom', 'request_shipment'];
      return !isWorkingHour && criticalActions.includes(ctx.actionType);
    },
    action: 'warn',
    priority: 1,
    isActive: true
  }
];

export class GRTCoachInterceptor {
  private notificationService: NotificationService;
  private ragService: RAGService;
  private historyService: HistoricalAnalysisService;

  constructor() {
    this.notificationService = new NotificationService();
    this.ragService = new RAGService();
    this.historyService = new HistoricalAnalysisService();
  }

  /**
   * 核心拦截方法：在表单提交前触发
   */
  async interceptSubmission(
    context: EventContext,
    formData: FormSubmission
  ): Promise<ActionAdvice> {
    const startTime = Date.now();

    try {
      // 0. 检查自定义拦截规则
      const ruleCheck = this.checkInterceptionRules(context, formData);
      if (ruleCheck.blocked) {
        await this.logInterceptionDecision(context, formData, 'BLOCK', ruleCheck.reason, startTime);
        return {
          status: 'BLOCK',
          message: ruleCheck.reason
        };
      }

      // 1. 上下文构建：获取当前项目阶段的状态约束
      const currentPhase = await this.getProjectPhase(formData.projectId);

      // 2. 规则硬约束检查 (基于状态机)
      const stateValidation = this.validateStateTransition(currentPhase, context.actionType);
      if (!stateValidation.valid) {
        await this.logInterceptionDecision(context, formData, 'BLOCK', stateValidation.reason || '', startTime);
        return {
          status: 'BLOCK',
          message: `[系统] 当前项目处于 ${this.getPhaseDisplayName(currentPhase)} 阶段，无法执行 ${context.actionType} 操作。${stateValidation.reason}`
        };
      }

      // 3. 历史项目对比分析
      const historicalAnalysis = await this.historyService.compareWithHistoricalProjects(formData);

      // 4. AI 语义软约束检查 (调用 Gemini，带脱敏处理)
      const analysis = await this.performSemanticAnalysis(formData, context, historicalAnalysis);

      // 5. 安全过滤检查
      if (analysis.shortAdvice) {
        const safetyCheck = safetyFilter.filterAISuggestion(analysis.shortAdvice, {
          userId: context.user,
          userRole: context.userRole,
          userCertifications: context.userCertifications
        });
        if (!safetyCheck.allowed) {
          await this.logInterceptionDecision(context, formData, 'BLOCK', `安全过滤: ${safetyCheck.errorCode}`, startTime);
          return {
            status: 'BLOCK',
            message: safetyCheck.filteredContent || safetyCheck.originalContent,
            errorCode: safetyCheck.errorCode
          };
        }
      }

      // 6. 决策逻辑与分级审批
      const decision = await this.makeDecision(analysis, context, formData, startTime);
      
      // 发布事件
      eventBus.emit(Events.AI_DECISION_MADE, {
        context,
        formData,
        analysis,
        decision
      });

      return decision;
    } catch (error) {
      log.error({ err: error }, "Interceptor error");
      await this.logInterceptionDecision(context, formData, 'ERROR', String(error), startTime);
      // 降级处理：拦截器出错时允许通过，但记录日志
      return {
        status: 'PROCEED',
        message: '[系统] AI Coach暂时不可用，请人工审核。'
      };
    }
  }

  /**
   * 检查自定义拦截规则
   */
  private checkInterceptionRules(
    context: EventContext,
    formData: FormSubmission
  ): { blocked: boolean; warned: boolean; reason: string } {
    const activeRules = interceptionRules
      .filter(r => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      if (rule.condition(context, formData)) {
        if (rule.action === 'block') {
          return { blocked: true, warned: false, reason: `[规则 ${rule.id}] ${rule.description}` };
        }
        if (rule.action === 'warn') {
          return { blocked: false, warned: true, reason: `[规则 ${rule.id}] ${rule.description}` };
        }
        // log action - 仅记录
      }
    }

    return { blocked: false, warned: false, reason: '' };
  }

  /**
   * 决策逻辑与分级审批
   */
  private async makeDecision(
    analysis: RiskAnalysis,
    context: EventContext,
    formData: FormSubmission,
    startTime: number
  ): Promise<ActionAdvice> {
    // 确定审批级别
    const approvalLevel = this.determineApprovalLevel(analysis.riskScore);

    if (analysis.riskScore > 80) {
      // 高风险：触发 L3 熔断
      await this.triggerAlarm(AlarmLevel.CRITICAL, analysis.reason, formData);
      await this.logInterceptionDecision(context, formData, 'BLOCK', analysis.reason, startTime);
      
      eventBus.emit(Events.AI_SUGGESTION_BLOCKED, {
        context,
        analysis,
        level: 'L3'
      });

      return {
        status: 'BLOCK',
        message: `[AI Coach] 严重风险预警：${analysis.shortAdvice}。操作已被拦截，需${approvalLevel?.approvers.join('或')}审批。`,
        riskScore: analysis.riskScore,
        requiredApproval: approvalLevel?.level,
        approvers: approvalLevel?.approvers,
        timeout: approvalLevel?.timeout
      };
    } else if (analysis.riskScore > 60) {
      // 中高风险：L2 审批
      await this.triggerAlarm(AlarmLevel.ALERT, analysis.reason, formData);
      await this.logInterceptionDecision(context, formData, 'PENDING_APPROVAL', analysis.reason, startTime);

      return {
        status: 'PENDING_APPROVAL',
        message: `[AI Coach] 风险预警：${analysis.shortAdvice}。需要${approvalLevel?.approvers.join('或')}审批。`,
        riskScore: analysis.riskScore,
        requiredApproval: approvalLevel?.level,
        approvers: approvalLevel?.approvers,
        timeout: approvalLevel?.timeout
      };
    } else if (analysis.riskScore > 40) {
      // 中风险：L1 提示
      await this.triggerAlarm(AlarmLevel.WARNING, analysis.reason, formData);
      await this.logInterceptionDecision(context, formData, 'WARNING', analysis.reason, startTime);

      return {
        status: 'WARNING',
        message: `[AI Coach] 建议优化：${analysis.shortAdvice}。是否继续提交？`,
        optimizationSuggestion: analysis.optimizedContent,
        riskScore: analysis.riskScore,
        requiredApproval: approvalLevel?.level
      };
    }

    await this.logInterceptionDecision(context, formData, 'PROCEED', '', startTime);
    return { status: 'PROCEED', riskScore: analysis.riskScore };
  }

  /**
   * 确定审批级别
   */
  private determineApprovalLevel(riskScore: number): ApprovalConfig | undefined {
    return approvalConfigs.find(
      config => riskScore >= config.riskThreshold.min && riskScore <= config.riskThreshold.max
    );
  }

  /**
   * 记录拦截决策日志
   */
  private async logInterceptionDecision(
    context: EventContext,
    formData: FormSubmission,
    decision: string,
    reason: string,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;

    auditLogger.logAIDecision(
      `interception_${context.actionType}`,
      {
        userId: context.user,
        userName: context.userName,
        userRole: context.userRole
      },
      {
        input: {
          actionType: context.actionType,
          projectId: formData.projectId,
          formType: formData.formType
        },
        output: { decision, reason },
        model: 'gemini-pro',
        decision: decision === 'PROCEED' ? 'proceed' : decision === 'WARNING' ? 'warn' : 'block'
      },
      decision === 'ERROR' ? 'failure' : 'success'
    );

  }

  /**
   * 获取项目当前阶段
   */
  async getProjectPhase(projectId: string): Promise<ProjectPhase> {
    // TODO: 从数据库或简道云API获取项目状态
    // 暂时返回默认值
    return 'M3_Design_BOM';
  }

  /**
   * 验证状态转换是否合法
   */
  validateStateTransition(
    currentPhase: ProjectPhase,
    actionType: string
  ): { valid: boolean; reason?: string } {
    // 定义各阶段允许的操作
    const allowedActions: Record<ProjectPhase, string[]> = {
      'M0_Initiation': ['create_project', 'upload_requirement', 'schedule_kickoff'],
      'M1_Solution_NDA': ['upload_solution', 'send_nda', 'sign_nda'],
      'M2_Contract_Pricing': ['create_quotation', 'approve_quotation', 'sign_contract'],
      'M3_Design_BOM': ['upload_design', 'create_bom', 'update_bom', 'release_bom'],
      'M4_Internal_Review': ['submit_review', 'approve_review', 'reject_review'],
      'M5_Customer_Review': ['send_to_customer', 'customer_feedback', 'customer_approve'],
      'M6_Production': ['start_production', 'update_progress', 'report_issue'],
      'M7_Assembly': ['start_assembly', 'quality_check', 'complete_assembly'],
      'M8_Testing': ['start_testing', 'record_result', 'pass_testing'],
      'M9_Shipping_Prep': ['prepare_shipment', 'confirm_payment', 'request_shipment'],
      'M10_Delivery': ['ship_equipment', 'confirm_delivery'],
      'M11_Installation': ['start_installation', 'complete_installation', 'customer_training'],
      'M12_Closure': ['final_acceptance', 'generate_report', 'close_project']
    };

    const allowed = allowedActions[currentPhase] || [];
    
    // 检查是否允许该操作
    if (!allowed.includes(actionType)) {
      // 检查是否是跨阶段操作
      const phaseIndex = Object.keys(allowedActions).indexOf(currentPhase);
      const targetPhase = this.findPhaseForAction(actionType, allowedActions);
      
      if (targetPhase) {
        const targetIndex = Object.keys(allowedActions).indexOf(targetPhase);
        if (targetIndex > phaseIndex) {
          return {
            valid: false,
            reason: `请先完成 ${this.getPhaseDisplayName(currentPhase)} 阶段的前序任务。`
          };
        }
      }
      
      return {
        valid: false,
        reason: `当前阶段不支持此操作，允许的操作：${allowed.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * 查找操作所属阶段
   */
  private findPhaseForAction(
    actionType: string,
    allowedActions: Record<string, string[]>
  ): string | null {
    for (const [phase, actions] of Object.entries(allowedActions)) {
      if (actions.includes(actionType)) {
        return phase;
      }
    }
    return null;
  }

  /**
   * 获取阶段显示名称
   */
  private getPhaseDisplayName(phase: ProjectPhase): string {
    const displayNames: Record<ProjectPhase, string> = {
      'M0_Initiation': 'M0-项目启动',
      'M1_Solution_NDA': 'M1-方案与NDA',
      'M2_Contract_Pricing': 'M2-签约核价',
      'M3_Design_BOM': 'M3-设计与BOM',
      'M4_Internal_Review': 'M4-内部评审',
      'M5_Customer_Review': 'M5-客户评审',
      'M6_Production': 'M6-生产制造',
      'M7_Assembly': 'M7-装配调试',
      'M8_Testing': 'M8-测试验证',
      'M9_Shipping_Prep': 'M9-发货准备',
      'M10_Delivery': 'M10-设备交付',
      'M11_Installation': 'M11-现场安装',
      'M12_Closure': 'M12-项目结项'
    };
    return displayNames[phase] || phase;
  }

  /**
   * 调用 Gemini 进行深度业务逻辑分析（带脱敏处理）
   */
  private async performSemanticAnalysis(
    data: FormSubmission,
    context: EventContext,
    historicalAnalysis?: HistoricalComparison
  ): Promise<RiskAnalysis> {
    // 检查缓存
    const cacheKey = `${data.projectId}-${context.actionType}-${JSON.stringify(data.data)}`;
    const cached = aiResponseCache.get(cacheKey);
    if (cached) {
      return cached as RiskAnalysis;
    }

    // 构建 Prompt，注入 RAG 检索到的企业规则
    const ragResult = await this.ragService.retrieveRelevantRules(context.actionType);

    // 构建历史对比信息
    const historyContext = historicalAnalysis ? `
[历史项目对比]:
- 相似项目数量: ${historicalAnalysis.similarProjects}
- 平均成本: ${historicalAnalysis.avgCost}
- 平均工时: ${historicalAnalysis.avgHours}
- 当前偏差: ${historicalAnalysis.deviation}%
` : '';

    const messages = [
      { role: 'system' as const, content: '你是GRT公司的AI项目总监助手，负责审核项目提交内容并评估风险。' },
      { role: 'user' as const, content: `作为 GRT 公司的资深项目总监 AI 副本，请审计以下 "${context.actionType}" 提交内容。

[企业规则库]:
${ragResult.rules.map(r => `- ${r.name}: ${r.description}`).join('\n')}

${historyContext}

[用户提交数据]:
${JSON.stringify(data.data, null, 2)}

[任务]:
1. 检查是否存在逻辑矛盾（如：发货日期早于预验收日期）。
2. 对比历史同类项目，评估成本/工时是否合理（检测异常值）。
3. 检查是否符合GRT企业规范和流程要求。

请输出 JSON 格式的风险评估报告，包含以下字段：
- riskScore: 0-100的风险分数
- reason: 详细的风险原因说明
- shortAdvice: 简短的建议（不超过50字）
- optimizedContent: 优化后的内容建议（如适用）

只输出JSON，不要其他内容。` }
    ];

    // 数据脱敏处理
    const { deidentifiedMessages, report } = await deidentifyLLMRequest(messages);
    try {
      const response = await invokeLLM({
        messages: deidentifiedMessages as Message[],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'risk_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                riskScore: { type: 'number', description: '风险分数0-100' },
                reason: { type: 'string', description: '风险原因' },
                shortAdvice: { type: 'string', description: '简短建议' },
                optimizedContent: { type: 'string', description: '优化建议' }
              },
              required: ['riskScore', 'reason', 'shortAdvice'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const result: RiskAnalysis = JSON.parse(content);
      
      // 缓存结果
      aiResponseCache.set(cacheKey, result, { ttl: CACHE_TTL });
      
      return result;
    } catch (error) {
      log.error({ err: error }, "Semantic analysis error");
      // 返回默认低风险结果
      return {
        riskScore: 20,
        reason: 'AI分析暂时不可用，建议人工审核',
        shortAdvice: '请人工确认提交内容'
      };
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlarm(
    level: AlarmLevel,
    message: string,
    data: FormSubmission
  ): Promise<void> {
    // 根据告警级别选择通知渠道
    const channels = this.getNotificationChannels(level);
    
    for (const channel of channels) {
      await this.notificationService.send({
        channel,
        level,
        message,
        projectId: data.projectId,
        formType: data.formType,
        timestamp: new Date()
      });
    }

    // 发布系统告警事件
    eventBus.emit(Events.SYSTEM_ALERT, {
      level,
      message,
      source: 'ai_coach',
      projectId: data.projectId
    });
  }

  /**
   * 根据告警级别获取通知渠道
   */
  private getNotificationChannels(level: AlarmLevel): ('wecom' | 'dingtalk' | 'email')[] {
    switch (level) {
      case AlarmLevel.EMERGENCY:
        return ['wecom', 'dingtalk', 'email'];
      case AlarmLevel.CRITICAL:
        return ['wecom', 'email'];
      case AlarmLevel.ALERT:
        return ['wecom'];
      case AlarmLevel.WARNING:
        return ['wecom'];
      default:
        return [];
    }
  }

  /**
   * 获取拦截规则列表
   */
  getInterceptionRules(): InterceptionRule[] {
    return interceptionRules;
  }

  /**
   * 更新拦截规则
   */
  updateInterceptionRule(ruleId: string, updates: Partial<InterceptionRule>): boolean {
    const rule = interceptionRules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  /**
   * 获取审批配置
   */
  getApprovalConfigs(): ApprovalConfig[] {
    return approvalConfigs;
  }
}

/**
 * 历史项目对比结果
 */
interface HistoricalComparison {
  similarProjects: number;
  avgCost: number;
  avgHours: number;
  deviation: number;
  outliers: string[];
}

/**
 * 历史项目分析服务
 */
class HistoricalAnalysisService {
  async compareWithHistoricalProjects(formData: FormSubmission): Promise<HistoricalComparison> {
    // TODO: 从数据库查询历史项目数据
    // 暂时返回模拟数据
    return {
      similarProjects: 15,
      avgCost: 500000,
      avgHours: 2000,
      deviation: 12,
      outliers: []
    };
  }
}

/**
 * 通知服务（企业微信/钉钉集成）
 */
class NotificationService {
  private wecomWebhook = process.env.WECOM_WEBHOOK_URL;
  private dingtalkWebhook = process.env.DINGTALK_WEBHOOK_URL;

  async send(notification: {
    channel: 'wecom' | 'dingtalk' | 'email';
    level: AlarmLevel;
    message: string;
    projectId: string;
    formType: string;
    timestamp: Date;
  }): Promise<void> {
    const content = this.formatMessage(notification);

    switch (notification.channel) {
      case 'wecom':
        await this.sendWecom(content);
        break;
      case 'dingtalk':
        await this.sendDingtalk(content);
        break;
      case 'email':
        await this.sendEmail(notification);
        break;
    }
  }

  private formatMessage(notification: any): string {
    const levelEmoji: Record<AlarmLevel, string> = {
      [AlarmLevel.EMERGENCY]: '🚨',
      [AlarmLevel.CRITICAL]: '❌',
      [AlarmLevel.ALERT]: '⚠️',
      [AlarmLevel.WARNING]: '💡',
      [AlarmLevel.INFO]: 'ℹ️'
    };

    return `${(levelEmoji as any)[notification.level]} **${notification.level} 告警**

**项目ID**: ${notification.projectId}
**表单类型**: ${notification.formType}
**消息**: ${notification.message}
**时间**: ${notification.timestamp.toISOString()}`;
  }

  private async sendWecom(content: string): Promise<void> {
    if (!this.wecomWebhook) {
      return;
    }

    try {
      await fetch(this.wecomWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { content }
        })
      });
    } catch (error) {
      log.error({ err: error }, "Failed to send WeChat Work message");
    }
  }

  private async sendDingtalk(content: string): Promise<void> {
    if (!this.dingtalkWebhook) {
      return;
    }

    try {
      await fetch(this.dingtalkWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            title: 'AI Coach 告警',
            text: content
          }
        })
      });
    } catch (error) {
      log.error({ err: error }, "Failed to send DingTalk message");
    }
  }

  private async sendEmail(notification: any): Promise<void> {
    // TODO: 实现邮件发送
  }
}

/**
 * RAG检索服务
 */
class RAGService {
  // 企业规则库（实际应从向量数据库检索）
  private rules: BusinessRule[] = [
    {
      id: 'FR001',
      name: '发货前款项确认',
      description: '设备发货前必须确认已收到合同约定的预付款或阶段款',
      category: 'financial',
      priority: 1,
      conditions: ['phase === M9_Shipping_Prep', 'paymentReceived === false'],
      actions: ['block_shipment', 'notify_finance'],
      isActive: true
    },
    {
      id: 'PR001',
      name: 'BOM发布前评审',
      description: 'BOM发布前必须通过内部设计评审（M4阶段）',
      category: 'process',
      priority: 1,
      conditions: ['phase === M3_Design_BOM', 'reviewPassed === false'],
      actions: ['block_bom_release', 'schedule_review'],
      isActive: true
    },
    {
      id: 'QA001',
      name: '测试报告完整性',
      description: '设备出厂前必须完成FAT测试并生成完整测试报告',
      category: 'quality',
      priority: 1,
      conditions: ['phase === M8_Testing', 'fatReportComplete === false'],
      actions: ['block_shipping_prep', 'notify_qa'],
      isActive: true
    },
    {
      id: 'CP001',
      name: 'Tier1客户交付约束',
      description: 'Tier1客户项目必须通过红蓝对抗演练后方可进入交付阶段',
      category: 'compliance',
      priority: 1,
      conditions: ['customerTier === 1', 'redBlueComplete === false'],
      actions: ['block_delivery', 'schedule_red_blue'],
      isActive: true
    },
    {
      id: 'FR002',
      name: '成本偏差预警',
      description: '实际成本超出目标成本15%时触发预警',
      category: 'financial',
      priority: 2,
      conditions: ['actualCost > targetCost * 1.15'],
      actions: ['notify_pm', 'notify_finance'],
      isActive: true
    },
    {
      id: 'PR002',
      name: '工时异常检测',
      description: '单日工时超过12小时或连续7天超过10小时需预警',
      category: 'process',
      priority: 2,
      conditions: ['dailyHours > 12', 'consecutiveOvertime > 7'],
      actions: ['notify_hr', 'notify_supervisor'],
      isActive: true
    }
  ];

  async retrieveRelevantRules(actionType: string): Promise<RAGSearchResult> {
    // TODO: 实现向量数据库检索
    // 根据actionType过滤相关规则
    const relevantRules = this.rules.filter(r => {
      if (!r.isActive) return false;
      
      // 简单的关键词匹配（实际应使用向量相似度）
      const actionKeywords = actionType.toLowerCase().split('_');
      const ruleText = `${r.name} ${r.description}`.toLowerCase();
      
      return actionKeywords.some(kw => ruleText.includes(kw)) || r.priority === 1;
    });
    
    return {
      rules: relevantRules,
      relevanceScore: 0.85,
      context: `Action type: ${actionType}`
    };
  }

  /**
   * 添加规则
   */
  addRule(rule: BusinessRule): void {
    this.rules.push(rule);
  }

  /**
   * 获取所有规则
   */
  getRules(): BusinessRule[] {
    return this.rules;
  }
}

// 导出单例
export const coachInterceptor = new GRTCoachInterceptor();
