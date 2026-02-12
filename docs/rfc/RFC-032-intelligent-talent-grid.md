# RFC-032: GRT智能人才网格协议

**版本**: v2.6.3  
**状态**: 已批准  
**作者**: Manus AI  
**日期**: 2026-01-18  

---

## 1. 概述

GRT智能人才网格协议旨在构建一个以人才为核心的智能化管理系统，通过技能图谱、心理安全日志、DA跨岗位逻辑和安全红线规则，实现人才能力的精准评估、个性化发展路径规划以及工业安全的全面保障。该协议将人才管理与AI助手深度融合，确保每位员工的数字助理（DA）能够自动继承其岗位所需的专业知识和故障处理能力。

---

## 2. 核心目标

| 目标维度 | 具体目标 | 成功指标 |
|---------|---------|---------|
| **人才画像** | 构建多维度技能图谱 | 覆盖100%在职员工 |
| **心理安全** | 建立心理健康监测机制 | 字段级加密保护率100% |
| **DA智能化** | 实现跨岗位助手自动订阅 | DA-助手绑定准确率99% |
| **安全保障** | 物理超限强制拦截 | 安全事故率降低90% |
| **故障排除** | 清洗工艺引导路径 | 故障诊断准确率≥90% |

---

## 3. 技术架构

### 3.1 grt_talent_profiles 数据模型

人才档案表采用分层设计，核心数据与敏感数据分离存储，敏感字段实施字段级加密。

```typescript
// 人才档案核心结构
interface TalentProfile {
  // 基础信息
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  hireDate: Date;
  
  // 技能图谱 (JSON)
  skillGraph: SkillGraph;
  
  // 心理安全日志 (加密存储)
  psychologicalSafetyLogs: EncryptedField<PsychologicalLog[]>;
  
  // DA配置
  daConfig: DAConfiguration;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
}

// 技能图谱结构
interface SkillGraph {
  // 技术技能
  technicalSkills: SkillNode[];
  // 软技能
  softSkills: SkillNode[];
  // 认证资质
  certifications: Certification[];
  // 技能关系图
  skillRelations: SkillRelation[];
  // 发展路径
  developmentPath: DevelopmentMilestone[];
}

interface SkillNode {
  skillId: string;
  skillName: string;
  category: 'technical' | 'soft' | 'domain';
  level: 1 | 2 | 3 | 4 | 5;  // 初级/中级/高级/专家/大师
  assessmentDate: Date;
  assessmentMethod: 'self' | 'peer' | 'supervisor' | 'certification' | 'project';
  evidence: string[];  // 证明材料链接
  targetLevel?: number;
  developmentPlan?: string;
}
```

### 3.2 字段级加密实现

心理安全日志等敏感数据采用AES-256-GCM加密，密钥由KMS管理。

```typescript
// 加密字段类型
interface EncryptedField<T> {
  ciphertext: string;      // 加密后的数据
  iv: string;              // 初始化向量
  authTag: string;         // 认证标签
  keyVersion: string;      // 密钥版本
  algorithm: 'AES-256-GCM';
}

// 心理安全日志结构
interface PsychologicalLog {
  logId: string;
  timestamp: Date;
  type: 'assessment' | 'incident' | 'support' | 'feedback';
  confidentialityLevel: 'L3' | 'L4';  // 机密/绝密
  content: {
    summary: string;
    indicators: SafetyIndicator[];
    recommendations: string[];
    followUpRequired: boolean;
  };
  recordedBy: string;
  accessLog: AccessRecord[];
}

interface SafetyIndicator {
  dimension: 'stress' | 'engagement' | 'wellbeing' | 'workload' | 'support';
  score: number;  // 1-10
  trend: 'improving' | 'stable' | 'declining';
  notes?: string;
}
```

---

## 4. DA跨岗位逻辑

### 4.1 功能型助手订阅机制

每个员工的数字助理（{ID}-DA）必须自动订阅其岗位对应的功能型助手，继承专业知识和故障处理逻辑。

| 岗位类型 | 自动订阅助手 | 继承能力 |
|---------|-------------|---------|
| 技术工程师 | Engineering_Assistant | 故障逻辑链、设备调试、工艺参数 |
| 销售代表 | Sales_Assistant | 客户沟通、报价策略、商机管理 |
| 项目经理 | Project_Assistant | 进度管控、资源调配、风险预警 |
| 财务人员 | Finance_Assistant | 审计逻辑、报销审核、成本分析 |
| 采购人员 | Purchase_Assistant | 供应商评估、价格比对、库存预警 |
| 生产主管 | Production_Assistant | 排产优化、质量控制、设备维护 |

### 4.2 DA配置结构

```typescript
interface DAConfiguration {
  daId: string;
  employeeId: string;
  
  // 订阅的功能型助手
  subscribedAssistants: AssistantSubscription[];
  
  // 权限级别
  permissionLevel: 'basic' | 'standard' | 'advanced' | 'expert';
  
  // 自定义配置
  customizations: {
    preferredLanguage: string;
    notificationPreferences: NotificationConfig;
    workflowAutomation: AutomationRule[];
  };
  
  // 故障逻辑链继承
  inheritedLogicChains: LogicChain[];
}

interface AssistantSubscription {
  assistantType: string;
  subscriptionDate: Date;
  autoUpdate: boolean;
  capabilities: string[];
  restrictions?: string[];
}

interface LogicChain {
  chainId: string;
  chainName: string;
  sourceAssistant: string;
  triggerConditions: TriggerCondition[];
  actions: ChainAction[];
  safetyChecks: SafetyCheck[];
}
```

---

## 5. Safety_Filter安全红线规则

### 5.1 安全过滤器架构

在llmService.ts中实现Safety_Filter，确保所有AI建议在下发至操作工前必须通过安全规则库校验。

```typescript
// Safety_Filter 核心接口
interface SafetyFilter {
  // 过滤器ID
  filterId: string;
  
  // 过滤规则
  rules: SafetyRule[];
  
  // 物理参数限制
  physicalLimits: PhysicalLimit[];
  
  // 拦截配置
  interceptConfig: InterceptConfiguration;
}

interface SafetyRule {
  ruleId: string;
  ruleName: string;
  category: 'physical' | 'chemical' | 'electrical' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // 规则条件
  conditions: RuleCondition[];
  
  // 触发动作
  actions: {
    intercept: boolean;
    errorCode: string;  // AI_003, AI_009, AI_010
    notification: NotificationTarget[];
    logging: LoggingConfig;
  };
}

interface PhysicalLimit {
  parameterType: 'temperature' | 'pressure' | 'speed' | 'voltage' | 'current' | 'flow_rate';
  unit: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  
  // 设备/材质特定限制
  equipmentSpecific?: {
    equipmentType: string;
    materialType?: string;
    customLimits: { min?: number; max?: number };
  }[];
}
```

### 5.2 拦截流程

```
AI建议生成 → Safety_Filter校验 → 物理参数检查 → 安全规则匹配
                                        ↓
                              [通过] → 下发至操作工
                              [超限] → 触发AI_003错误 → 记录日志 → 通知主管
```

### 5.3 错误码定义

| 错误码 | 名称 | 描述 | 处理方式 |
|-------|-----|------|---------|
| AI_003 | 数据验证失败 | AI建议参数超出安全阈值 | 强制拦截，通知主管 |
| AI_009 | 安全规则冲突 | 建议与安全规则库冲突 | 拦截并记录 |
| AI_010 | 物联网指令超时 | IoT设备响应超时 | 重试或人工介入 |
| AI_011 | 物理超限警告 | 参数接近安全边界 | 警告但允许执行 |
| AI_012 | 资质不足 | 操作员资质不满足要求 | 拦截并提示培训 |

---

## 6. 清洗工艺手册故障排除引导路径

### 6.1 知识图谱结构

将《清洗工艺手册》转化为结构化的故障排除知识图谱，实现90%以上的诊断准确率。

```typescript
// 故障排除知识图谱
interface TroubleshootingKnowledgeGraph {
  // 故障节点
  faultNodes: FaultNode[];
  
  // 原因节点
  causeNodes: CauseNode[];
  
  // 解决方案节点
  solutionNodes: SolutionNode[];
  
  // 关系边
  edges: KnowledgeEdge[];
  
  // 引导路径
  guidedPaths: GuidedPath[];
}

interface FaultNode {
  faultId: string;
  faultName: string;
  faultCode: string;
  category: 'mechanical' | 'electrical' | 'chemical' | 'software' | 'operational';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  symptoms: string[];
  affectedEquipment: string[];
  frequency: 'common' | 'occasional' | 'rare';
}

interface CauseNode {
  causeId: string;
  causeName: string;
  causeType: 'root' | 'contributing' | 'symptom';
  probability: number;  // 0-1
  detectability: 'easy' | 'moderate' | 'difficult';
  diagnosticSteps: DiagnosticStep[];
}

interface SolutionNode {
  solutionId: string;
  solutionName: string;
  solutionType: 'immediate' | 'temporary' | 'permanent';
  complexity: 'simple' | 'moderate' | 'complex';
  requiredSkillLevel: 1 | 2 | 3 | 4 | 5;
  estimatedTime: string;
  requiredParts: string[];
  steps: SolutionStep[];
  safetyPrecautions: string[];
}

// 引导路径
interface GuidedPath {
  pathId: string;
  pathName: string;
  entryFault: string;
  steps: GuidedStep[];
  expectedAccuracy: number;
  averageResolutionTime: string;
}

interface GuidedStep {
  stepNumber: number;
  stepType: 'question' | 'action' | 'observation' | 'decision';
  content: string;
  options?: StepOption[];
  nextStep: string | { [key: string]: string };
  aiAssistance?: string;
}
```

### 6.2 故障诊断流程

```
故障现象输入 → 症状匹配 → 可能原因排序 → 诊断步骤引导
                              ↓
                    [确认原因] → 解决方案推荐 → 执行指导
                              ↓
                    [解决成功] → 知识库更新 → 案例归档
```

---

## 7. Claude Code工程实施支持

### 7.1 自动化Schema构建

Claude Code可直接读取本规范，通过以下命令自动生成NocoBase的Collection定义：

```bash
# 生成Collection定义
yarn pm create grt_talent_profiles --fields="skill_graph:json,psychological_safety_logs:encrypted_json,da_config:json"

# 生成关联表
yarn pm create da_assistant_subscriptions --fields="da_id:string,assistant_type:string,capabilities:json"
```

### 7.2 Server-side Hook实现

财务报销"三单合一"审计逻辑的Server-side Hook示例：

```typescript
// 三单合一审计Hook
export const expenseAuditHook = {
  name: 'expense-three-in-one-audit',
  trigger: 'beforeCreate',
  collection: 'expense_claims',
  
  async handler(ctx) {
    const { travelPlan, invoice, receipt } = ctx.data;
    
    // 1. 时间一致性检查
    const timeConsistency = checkTimeConsistency(travelPlan, invoice, receipt);
    
    // 2. 金额一致性检查
    const amountConsistency = checkAmountConsistency(invoice, receipt);
    
    // 3. 地点一致性检查
    const locationConsistency = checkLocationConsistency(travelPlan, invoice);
    
    // 4. 异常率计算
    const anomalyRate = calculateAnomalyRate(timeConsistency, amountConsistency, locationConsistency);
    
    if (anomalyRate > 0.2) {
      ctx.data.auditStatus = 'manual_review_required';
      ctx.data.auditFlags = { timeConsistency, amountConsistency, locationConsistency, anomalyRate };
      
      // 触发通知
      await notifyAuditor(ctx.data);
    }
    
    return ctx;
  }
};
```

### 7.3 Process Notebook组件

左右分栏的Process Notebook组件，实现"文字/语音录入 - AI实时建议"闭环：

```typescript
// Process Notebook组件接口
interface ProcessNotebookProps {
  // 左侧：输入区
  inputPanel: {
    textInput: boolean;
    voiceInput: boolean;
    imageUpload: boolean;
    templates: NoteTemplate[];
  };
  
  // 右侧：AI建议区
  suggestionPanel: {
    realTimeSuggestions: boolean;
    suggestionTypes: ('action' | 'reference' | 'warning' | 'optimization')[];
    autoApply: boolean;
    feedbackEnabled: boolean;
  };
  
  // 闭环配置
  closedLoop: {
    autoSave: boolean;
    versionControl: boolean;
    auditTrail: boolean;
    notificationTriggers: NotificationTrigger[];
  };
}
```

---

## 8. 数据库表结构

### 8.1 新增表清单

| 表名 | 描述 | 关键字段 |
|-----|------|---------|
| grt_talent_profiles | 人才档案 | skill_graph, psychological_safety_logs, da_config |
| da_assistant_subscriptions | DA助手订阅 | da_id, assistant_type, capabilities |
| safety_filter_rules | 安全过滤规则 | rule_conditions, physical_limits, intercept_config |
| troubleshooting_knowledge | 故障排除知识 | fault_nodes, cause_nodes, solution_nodes |
| guided_paths | 引导路径 | entry_fault, steps, expected_accuracy |
| skill_assessments | 技能评估记录 | employee_id, skill_id, level, assessment_date |
| psychological_safety_access_logs | 心理安全访问日志 | profile_id, accessor_id, access_type, timestamp |

---

## 9. 安全与合规

### 9.1 数据保护要求

| 数据类型 | 保护级别 | 加密要求 | 访问控制 |
|---------|---------|---------|---------|
| 技能图谱 | L1-内部 | 传输加密 | 部门级 |
| 心理安全日志 | L4-绝密 | 字段级加密 | 个人+HR主管 |
| DA配置 | L2-敏感 | 存储加密 | 个人+IT管理员 |
| 故障知识库 | L1-内部 | 传输加密 | 全员可读 |

### 9.2 审计要求

所有对心理安全日志的访问必须记录完整审计日志，包括访问者身份、访问时间、访问原因和查看内容摘要。

---

## 10. 实施计划

| 阶段 | 任务 | 时间 | 负责方 |
|-----|------|-----|-------|
| Phase 1 | 数据库Schema创建 | Week 1 | Claude Code |
| Phase 2 | 字段级加密实现 | Week 1-2 | Claude Code |
| Phase 3 | DA订阅机制开发 | Week 2-3 | Claude Code |
| Phase 4 | Safety_Filter实现 | Week 3-4 | Claude Code |
| Phase 5 | 故障知识图谱构建 | Week 4-6 | Manus + Claude Code |
| Phase 6 | Process Notebook组件 | Week 6-7 | Claude Code |
| Phase 7 | 集成测试与优化 | Week 7-8 | 联合测试 |

---

## 11. 参考文献

[1] GRT智能系统技术规范 v2.6.2  
[2] NocoBase Collection定义规范  
[3] AES-256-GCM加密标准  
[4] 工业安全拦截器设计文档 (RFC-028)  
[5] 数据隐私与脱敏代理层架构 (RFC-030)  

---

**文档状态**: 已批准  
**下次审核**: 2026-04-18
