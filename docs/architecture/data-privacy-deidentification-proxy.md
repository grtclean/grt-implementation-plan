# GRT智能系统数据隐私与脱敏代理层架构

**版本**: 1.0  
**日期**: 2026-01-18  
**作者**: Manus AI  
**分类**: CTO级架构文档  

---

## 1. 架构背景与目标

在未来10年的维度下，数据隐私与主权是GRT智能系统面临的最大挑战。本文档定义了数据隐私保护的核心架构，确保GRT的核心竞争资产（清洗算法、工艺配方、客户分级价格）不会被公有大模型吸收，同时满足日益严格的数据合规要求。

### 1.1 核心目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 资产保护 | 防止核心算法和配方泄露至公有LLM | P0 |
| 合规满足 | 符合GDPR、中国数据安全法等法规 | P0 |
| 功能保障 | 在保护数据的同时不影响AI功能 | P1 |
| 审计追溯 | 完整记录所有数据流动 | P1 |

---

## 2. 数据分类与敏感级别

### 2.1 数据敏感级别定义

GRT智能系统将数据分为四个敏感级别，每个级别对应不同的保护策略：

| 级别 | 名称 | 定义 | 示例数据 |
|------|------|------|----------|
| L4 | 绝密 | GRT核心竞争优势，泄露将造成不可逆损失 | 清洗算法参数、核心工艺配方 |
| L3 | 机密 | 重要商业信息，泄露将造成重大损失 | 客户分级价格、设备控制逻辑 |
| L2 | 敏感 | 客户相关信息，需保护隐私 | 客户设备数据、服务记录 |
| L1 | 内部 | 一般业务数据，限内部使用 | 员工信息、项目进度 |
| L0 | 公开 | 可公开信息 | 产品规格、公司介绍 |

### 2.2 数据资产清单

```
┌─────────────────────────────────────────────────────────────────┐
│                    GRT 数据资产分类                              │
├─────────────────────────────────────────────────────────────────┤
│  L4 绝密资产                                                     │
│  ├── 清洗算法库 (washing_algorithms)                            │
│  │   ├── 超声波频率优化算法                                      │
│  │   ├── 高压喷射路径算法                                        │
│  │   └── 清洁度预测模型                                          │
│  ├── 工艺配方库 (process_formulas)                              │
│  │   ├── 清洗剂配比公式                                          │
│  │   ├── 温度-时间曲线                                           │
│  │   └── 材质兼容性矩阵                                          │
│  └── 设备控制参数 (equipment_params)                            │
│      ├── PLC控制逻辑                                             │
│      └── 安全阈值配置                                            │
├─────────────────────────────────────────────────────────────────┤
│  L3 机密资产                                                     │
│  ├── 客户分级价格 (tiered_pricing)                              │
│  ├── 成本结构数据 (cost_structure)                              │
│  └── 供应商协议 (supplier_agreements)                           │
├─────────────────────────────────────────────────────────────────┤
│  L2 敏感资产                                                     │
│  ├── 客户设备清单 (customer_equipment)                          │
│  ├── 服务历史记录 (service_history)                             │
│  └── 故障诊断数据 (fault_diagnosis)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 私有部署架构

### 3.1 部署拓扑

L4和L3级别数据**必须**运行在私有部署环境中，与公有云完全隔离：

```
┌─────────────────────────────────────────────────────────────────┐
│                    GRT 私有数据中心                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              安全隔离区 (Air-Gapped Zone)                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ 算法服务器  │  │ 配方数据库  │  │ HSM密钥管理 │      │   │
│  │  │ (L4数据)    │  │ (L4数据)    │  │             │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                         │                                │   │
│  │                    ┌────┴────┐                           │   │
│  │                    │ 内部API │                           │   │
│  │                    └────┬────┘                           │   │
│  └─────────────────────────┼───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │              私有云区 (Private Cloud Zone)               │   │
│  │  ┌─────────────┐  ┌─────┴─────┐  ┌─────────────┐        │   │
│  │  │ NocoBase    │  │ 脱敏代理  │  │ 审计日志    │        │   │
│  │  │ (L3数据)    │  │ 层        │  │ 服务        │        │   │
│  │  └─────────────┘  └─────┬─────┘  └─────────────┘        │   │
│  └─────────────────────────┼───────────────────────────────┘   │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │ (仅脱敏数据)
                             ▼
              ┌─────────────────────────┐
              │   公有云 LLM 服务        │
              │   (OpenAI / Claude)     │
              └─────────────────────────┘
```

### 3.2 加密要求

| 数据级别 | 传输加密 | 存储加密 | 密钥管理 |
|----------|----------|----------|----------|
| L4 | TLS 1.3 + mTLS | AES-256-GCM | HSM (FIPS 140-2 Level 3) |
| L3 | TLS 1.3 | AES-256-GCM | HSM (FIPS 140-2 Level 2) |
| L2 | TLS 1.3 | AES-256 | 软件密钥管理 |
| L1 | TLS 1.2+ | 可选 | 软件密钥管理 |

---

## 4. 脱敏代理层 (De-identification Proxy)

### 4.1 架构设计

脱敏代理层是GRT智能系统与公有LLM之间的强制中间层，所有AI交互必须经过此层处理：

```
┌─────────────────────────────────────────────────────────────────┐
│                    脱敏代理层 (De-identification Proxy)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   请求拦截   │───▶│   敏感检测   │───▶│   脱敏处理   │       │
│  │   Gateway    │    │   Scanner    │    │   Engine     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         │                   ▼                   │                │
│         │           ┌──────────────┐            │                │
│         │           │   规则引擎   │            │                │
│         │           │   Rules DB   │            │                │
│         │           └──────────────┘            │                │
│         │                                       │                │
│         ▼                                       ▼                │
│  ┌──────────────┐                       ┌──────────────┐        │
│  │   审计日志   │                       │   还原映射   │        │
│  │   Audit Log  │                       │   Mapping    │        │
│  └──────────────┘                       └──────────────┘        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  输入: 原始请求 (含敏感数据)                                     │
│  输出: 脱敏请求 (安全数据)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 脱敏方法

系统支持多种脱敏方法，根据数据类型和业务需求选择：

| 方法 | 描述 | 适用场景 | 可逆性 |
|------|------|----------|--------|
| **替换** (Replace) | 用占位符替换敏感值 | 客户名称、公司名 | 可逆 |
| **掩码** (Mask) | 部分字符用*替换 | 电话号码、邮箱 | 不可逆 |
| **泛化** (Generalize) | 降低数据精度 | 价格→价格区间 | 不可逆 |
| **抑制** (Suppress) | 完全移除敏感字段 | 核心算法参数 | 可逆 |
| **噪声** (Noise) | 添加随机扰动 | 数值型数据 | 不可逆 |
| **令牌化** (Tokenize) | 用令牌替换并存储映射 | 需要还原的数据 | 可逆 |

### 4.3 脱敏规则配置

```typescript
// 脱敏规则配置示例
const deidentificationRules: DeidentificationRule[] = [
  {
    ruleId: 'RULE_001',
    ruleName: '清洗算法参数脱敏',
    dataCategory: 'algorithm',
    patterns: [
      /frequency:\s*\d+(\.\d+)?/gi,
      /pressure:\s*\d+(\.\d+)?/gi,
      /temperature:\s*\d+(\.\d+)?/gi
    ],
    deidentificationMethod: 'suppress',
    parameters: {
      replacementText: '[ALGORITHM_PARAM_REDACTED]'
    },
    reversible: true,
    auditRequired: true,
    severity: 'critical'
  },
  {
    ruleId: 'RULE_002',
    ruleName: '客户分级价格脱敏',
    dataCategory: 'price',
    patterns: [
      /price:\s*¥?\d+(\.\d+)?/gi,
      /cost:\s*¥?\d+(\.\d+)?/gi
    ],
    deidentificationMethod: 'generalize',
    parameters: {
      generalizationLevel: 2,  // 精确到千元
      ranges: ['<10K', '10K-50K', '50K-100K', '100K-500K', '>500K']
    },
    reversible: false,
    auditRequired: true,
    severity: 'high'
  },
  {
    ruleId: 'RULE_003',
    ruleName: '客户名称令牌化',
    dataCategory: 'customer',
    patterns: [
      /customer:\s*[\u4e00-\u9fa5a-zA-Z\s]+/gi,
      /company:\s*[\u4e00-\u9fa5a-zA-Z\s]+/gi
    ],
    deidentificationMethod: 'tokenize',
    parameters: {
      tokenPrefix: 'CUST_',
      tokenLength: 8
    },
    reversible: true,
    auditRequired: false,
    severity: 'medium'
  }
];
```

### 4.4 处理流程

```
请求进入
    │
    ▼
┌─────────────────┐
│ 1. 请求解析     │  解析JSON/文本，提取待检测内容
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 敏感词扫描   │  使用正则+ML模型检测敏感内容
└────────┬────────┘
         │
    ┌────┴────┐
    │ 发现敏感 │
    │ 内容?   │
    └────┬────┘
    是   │   否
    │    │    │
    ▼    │    ▼
┌───────┐│┌─────────────────┐
│ 阻断? │││ 3. 直接放行     │
└───┬───┘│└─────────────────┘
  是│ 否 │
    │    │
    ▼    ▼
┌───────┐┌─────────────────┐
│ 拒绝  ││ 4. 应用脱敏规则 │
│ 请求  │└────────┬────────┘
└───────┘         │
                  ▼
         ┌─────────────────┐
         │ 5. 生成映射表   │  用于响应还原
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ 6. 记录审计日志 │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ 7. 转发至LLM    │
         └─────────────────┘
```

---

## 5. 审计与监控

### 5.1 审计日志结构

所有经过脱敏代理层的请求都会生成详细的审计日志：

```typescript
interface DeidentificationAuditLog {
  logId: string;
  timestamp: Date;
  sessionId: string;
  userId: number;
  userName: string;
  assistantId: string;
  
  // 请求信息
  requestHash: string;           // 原始请求哈希（不存储原文）
  deidentifiedRequestHash: string;
  requestSizeBytes: number;
  
  // 脱敏详情
  rulesApplied: {
    ruleId: string;
    matchCount: number;
    method: string;
  }[];
  sensitiveDataTypes: string[];
  deidentificationDuration: number;
  
  // LLM交互
  llmEndpoint: string;
  llmModel: string;
  responseSizeBytes: number;
  
  // 安全事件
  securityEvents: {
    eventType: 'detection' | 'block' | 'alert';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  
  // 结果
  status: 'success' | 'blocked' | 'error';
  blockReason?: string;
}
```

### 5.2 监控指标

| 指标名称 | 描述 | 告警阈值 |
|----------|------|----------|
| `deident_requests_total` | 脱敏请求总数 | - |
| `deident_blocked_total` | 被阻断请求数 | >10/小时 |
| `deident_sensitive_detected` | 检测到敏感数据次数 | >100/小时 |
| `deident_latency_ms` | 脱敏处理延迟 | >500ms |
| `deident_rule_match_rate` | 规则匹配率 | <50% 需检查规则 |

### 5.3 告警配置

```yaml
alerts:
  - name: SensitiveDataLeakAttempt
    condition: deident_blocked_total > 10
    window: 1h
    severity: critical
    actions:
      - notify_security_team
      - block_user_session
      - generate_incident_report
      
  - name: HighSensitiveDetectionRate
    condition: deident_sensitive_detected > 100
    window: 1h
    severity: high
    actions:
      - notify_admin
      - increase_logging_level
      
  - name: ProxyLatencyHigh
    condition: deident_latency_ms_p99 > 500
    window: 5m
    severity: medium
    actions:
      - notify_ops
      - scale_proxy_instances
```

---

## 6. 紧急响应机制

### 6.1 紧急关闭开关

当检测到严重数据泄露风险时，系统支持紧急关闭所有LLM交互：

```typescript
interface EmergencyShutdown {
  enabled: boolean;
  triggers: {
    criticalBlocksThreshold: number;    // 触发阈值
    timeWindowMinutes: number;          // 时间窗口
    autoShutdown: boolean;              // 自动关闭
  };
  actions: {
    blockAllLLMRequests: boolean;
    notifySecurityTeam: boolean;
    generateForensicReport: boolean;
    preserveAuditLogs: boolean;
  };
  recoveryProcedure: string;            // 恢复流程文档链接
}
```

### 6.2 事件响应流程

```
检测到异常
    │
    ▼
┌─────────────────┐
│ 1. 自动评估     │  评估威胁级别
└────────┬────────┘
         │
    ┌────┴────┐
    │ 级别?   │
    └────┬────┘
         │
    ┌────┼────┬────┐
    │    │    │    │
   低   中   高  严重
    │    │    │    │
    ▼    ▼    ▼    ▼
  记录  告警  阻断  紧急
  日志  通知  会话  关闭
```

---

## 7. 合规性映射

### 7.1 法规合规对照

| 法规要求 | GRT实现 | 状态 |
|----------|---------|------|
| GDPR Art.25 - 数据保护设计 | 脱敏代理层强制启用 | ✓ |
| GDPR Art.30 - 处理记录 | 完整审计日志 | ✓ |
| GDPR Art.32 - 安全措施 | AES-256加密 + HSM | ✓ |
| 中国数据安全法 - 数据分类 | 四级分类体系 | ✓ |
| 中国数据安全法 - 出境管理 | 私有部署隔离 | ✓ |

---

## 8. 实施路线图

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| Phase 1 | 2026 Q1 | 脱敏代理层基础架构 |
| Phase 2 | 2026 Q2 | 规则引擎与审计系统 |
| Phase 3 | 2026 Q3 | 私有部署环境搭建 |
| Phase 4 | 2026 Q4 | 合规认证与审计 |

---

## 9. 附录：敏感数据模式库

### 9.1 GRT特有敏感模式

```regex
# 清洗算法参数
/ultrasonic_freq:\s*\d+(\.\d+)?\s*(kHz|MHz)/gi
/spray_pressure:\s*\d+(\.\d+)?\s*(bar|MPa|psi)/gi
/cleaning_temp:\s*\d+(\.\d+)?\s*°?C/gi
/cycle_time:\s*\d+(\.\d+)?\s*(s|min)/gi

# 工艺配方
/detergent_ratio:\s*\d+:\d+/gi
/concentration:\s*\d+(\.\d+)?%/gi
/ph_value:\s*\d+(\.\d+)?/gi

# 设备控制
/plc_register:\s*[A-Z]\d+/gi
/control_logic:\s*\{[^}]+\}/gi
```

---

**文档结束**
