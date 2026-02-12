# GRT出差辅助支持系统与财务报销系统规范文档

## ChatGPT更新专用文档

**版本**: v1.0  
**导出时间**: 2026-01-25  
**用途**: 供ChatGPT整合更新后返回Manus执行  
**技术架构**: NocoBase + Claude Code + Gemini AI

---

## 目录

1. [系统概述](#1-系统概述)
2. [出差辅助支持系统规范](#2-出差辅助支持系统规范)
3. [财务报销系统规范](#3-财务报销系统规范)
4. [NocoBase架构设计](#4-nocobase架构设计)
5. [Claude Code实现规范](#5-claude-code实现规范)
6. [Gemini AI大脑集成方案](#6-gemini-ai大脑集成方案)
7. [数据模型与API规范](#7-数据模型与api规范)
8. [前端界面规范](#8-前端界面规范)
9. [实施计划与验收标准](#9-实施计划与验收标准)

---

## 1. 系统概述

### 1.1 系统定位

GRT出差辅助支持系统与财务报销系统是GRT智能系统的核心业务模块，服务于工业清洗设备制造企业的现场服务团队。系统采用**Gemini判断 + Claude执行**的双AI引擎架构，实现从出差申请到报销结算的端到端自动化管理。

### 1.2 核心价值

| 价值维度 | 传统模式痛点 | 智能系统解决方案 |
|----------|-------------|-----------------|
| 效率提升 | 人工审批周期长，平均3-5天 | AI自动审计，合规报销24小时内完成 |
| 成本控制 | 费用超标难以实时监控 | 实时预警，超标自动拦截 |
| 合规管理 | 票据核验依赖人工 | AI智能识别，异常率>20%自动标记 |
| 数据分析 | 历史数据难以追溯 | 全链路数据可视化，支持决策分析 |

### 1.3 技术架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    出差与报销系统架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    前端层 (React 19)                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │出差申请中心 │ │报销提交中心 │ │主管审批台   │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │员工位置地图 │ │费用分析报表 │ │移动端H5    │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AI服务层                              │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │   │
│  │  │Gemini判断引擎 │ │Claude执行引擎 │ │AI财务审计     │ │   │
│  │  │(业务逻辑决策) │ │(代码实现)     │ │(异常检测)     │ │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘ │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │   │
│  │  │Strategic_CFO  │ │Supply_Chain   │ │脱敏代理层     │ │   │
│  │  │_Assistant     │ │_Optimizer     │ │(数据隐私)     │ │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NocoBase数据层                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │travel_plans │ │expense_claims│ │ai_audit_logs│       │   │
│  │  │(出差计划)   │ │(报销申请)   │ │(审计日志)   │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 出差辅助支持系统规范

### 2.1 功能模块清单

| 模块名称 | 功能描述 | 优先级 | 状态 |
|----------|----------|--------|------|
| 出差申请 | 员工提交出差计划，包含目的地、时间、预算 | P0 | 待开发 |
| 行程规划 | AI智能推荐交通、住宿方案 | P1 | 待开发 |
| 位置追踪 | 实时GPS定位，打卡签到 | P0 | 待开发 |
| 通勤管理 | 机票/火车票/酒店预订集成 | P1 | 待开发 |
| 主管监控 | 地图视图展示团队位置和任务状态 | P0 | 待开发 |
| 异常预警 | 超时/偏离/紧急情况自动告警 | P0 | 待开发 |

### 2.2 出差计划数据模型

```typescript
interface TravelPlan {
  id: string;                          // 主键UUID
  planCode: string;                    // 计划编号 TP-2026-0125-001
  employeeId: string;                  // 申请人ID
  employeeName: string;                // 申请人姓名
  departmentId: string;                // 所属部门
  supervisorId: string;                // 直属主管ID
  
  // 出差基本信息
  purpose: 'service' | 'sales' | 'training' | 'meeting' | 'other';
  purposeDescription: string;          // 出差目的详述
  relatedProjectId?: string;           // 关联项目ID
  relatedCustomerId?: string;          // 关联客户ID
  
  // 时间地点
  departureDate: Date;                 // 出发日期
  returnDate: Date;                    // 返回日期
  destinations: TravelDestination[];   // 目的地列表（支持多地）
  
  // 预算信息
  estimatedBudget: {
    transportation: number;            // 交通预算
    accommodation: number;             // 住宿预算
    meals: number;                     // 餐饮预算
    other: number;                     // 其他预算
    total: number;                     // 总预算
  };
  
  // 通勤安排
  commuteArrangements: CommuteArrangement;
  
  // 审批流程
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalChain: ApprovalRecord[];
  
  // 执行状态
  executionStatus: 'not_started' | 'in_progress' | 'completed' | 'abnormal';
  clockInRecords: ClockInRecord[];     // 打卡记录
  
  // 关联报销
  expenseClaimIds: string[];           // 关联的报销单ID列表
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface TravelDestination {
  sequence: number;                    // 顺序
  city: string;                        // 城市
  address: string;                     // 详细地址
  arrivalDate: Date;                   // 到达日期
  departureDate: Date;                 // 离开日期
  contactPerson?: string;              // 当地联系人
  contactPhone?: string;               // 联系电话
}

interface CommuteArrangement {
  outbound: {
    type: 'flight' | 'train' | 'car' | 'bus' | 'other';
    departure: Date;
    arrival: Date;
    bookingRef?: string;               // 订单号
    carrier?: string;                  // 承运商
    flightNo?: string;                 // 航班/车次号
  };
  return: {
    type: 'flight' | 'train' | 'car' | 'bus' | 'other';
    departure: Date;
    arrival: Date;
    bookingRef?: string;
    carrier?: string;
    flightNo?: string;
  };
  accommodation: {
    hotelName: string;
    checkIn: Date;
    checkOut: Date;
    bookingRef?: string;
    roomType?: string;
    dailyRate?: number;
  }[];
}

interface ClockInRecord {
  id: string;
  timestamp: Date;
  type: 'check_in' | 'check_out' | 'task_start' | 'task_end';
  location: {
    type: 'Point';
    coordinates: [number, number];     // [经度, 纬度]
    accuracy: number;                  // 精度（米）
    address: string;                   // 地址
  };
  photoUrl?: string;                   // 现场照片
  remark?: string;                     // 备注
}
```

### 2.3 主管工作台功能规范

主管工作台是出差管理的核心监控界面，提供实时的团队位置和任务状态可视化。

**界面布局**：

```
┌─────────────────────────────────────────────────────────────┐
│  主管工作台                          [刷新] [设置] [导出]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │                     │  │  今日统计                   │  │
│  │                     │  │  ├─ 在途人员: 12           │  │
│  │      地图区域       │  │  ├─ 已完成: 8              │  │
│  │   (高德/百度地图)   │  │  ├─ 进行中: 4              │  │
│  │                     │  │  └─ 完成率: 66.7%          │  │
│  │  🟢 张工 - 上海浦东 │  ├─────────────────────────────┤  │
│  │  🟡 李工 - 苏州工业 │  │  预警列表                   │  │
│  │  🔴 王工 - 任务超时 │  │  ⚠️ 张工 - 任务超时 2h     │  │
│  │                     │  │  ⚠️ 李工 - 位置偏离 5km    │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  员工列表                                    [筛选] [搜索]  │
│  ┌─────┬──────┬──────────┬────────┬─────────┬───────────┐  │
│  │头像 │ 姓名 │ 当前任务 │ 状态   │ 位置    │ 操作      │  │
│  ├─────┼──────┼──────────┼────────┼─────────┼───────────┤  │
│  │ 👤  │ 张工 │ 设备维护 │ 🟢进行中│ 上海浦东│ [详情][联系]│
│  │ 👤  │ 李工 │ 安装调试 │ 🟡即将超│ 苏州工业│ [详情][联系]│
│  │ 👤  │ 王工 │ 客户拜访 │ 🔴已超时│ 杭州西湖│ [详情][联系]│
│  └─────┴──────┴──────────┴────────┴─────────┴───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**地图标记状态定义**：

| 标记颜色 | 状态代码 | 状态名称 | 触发条件 |
|----------|----------|----------|----------|
| 🟢 绿色 | normal | 正常执行中 | 任务进行中，无异常 |
| 🟡 黄色 | warning | 即将超时 | 距离计划完成时间<2小时 |
| 🔴 红色 | critical | 已超时/异常 | 超时或位置偏离>5km |
| 🔵 蓝色 | completed | 已完成 | 今日任务已完成 |
| ⚪ 灰色 | offline | 休息中/离线 | 非工作时间或无信号 |

---

## 3. 财务报销系统规范

### 3.1 功能模块清单

| 模块名称 | 功能描述 | 优先级 | 状态 |
|----------|----------|--------|------|
| 报销申请 | 员工提交报销单，上传票据 | P0 | 待开发 |
| AI票据识别 | OCR识别发票信息，自动填充 | P0 | 待开发 |
| AI财务审计 | 自动校验报销与出差计划一致性 | P0 | 待开发 |
| 审批流程 | 多级审批，支持加签/转签 | P0 | 待开发 |
| 费用标准 | 差旅费用标准配置 | P1 | 待开发 |
| 统计报表 | 部门/项目/个人费用分析 | P1 | 待开发 |

### 3.2 报销申请数据模型

```typescript
interface ExpenseClaim {
  id: string;                          // 主键UUID
  claimCode: string;                   // 报销单号 EC-2026-0125-001
  submitterId: string;                 // 申请人ID
  submitterName: string;               // 申请人姓名
  departmentId: string;                // 所属部门
  
  // 关联出差计划
  travelPlanId?: string;               // 关联出差计划ID
  travelPlanCode?: string;             // 关联出差计划编号
  
  // 报销类型
  claimType: 'travel' | 'business' | 'training' | 'other';
  
  // 费用明细
  items: ExpenseItem[];
  totalAmount: number;                 // 总金额
  currency: 'CNY' | 'USD' | 'EUR';     // 币种
  
  // 票据信息
  receipts: Receipt[];
  
  // 审批流程
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
  approvalChain: ApprovalRecord[];
  currentApproverId?: string;          // 当前审批人
  
  // AI审计结果
  aiAuditResult?: AiAuditResult;
  
  // 付款信息
  paymentStatus: 'unpaid' | 'processing' | 'paid';
  paymentDate?: Date;
  paymentRef?: string;                 // 付款凭证号
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}

interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  subcategory?: string;
  description: string;
  amount: number;
  expenseDate: Date;
  location?: string;                   // 消费地点
  receiptId?: string;                  // 关联票据ID
  
  // 费用标准校验
  standardAmount?: number;             // 标准金额
  isOverStandard: boolean;             // 是否超标
  overStandardReason?: string;         // 超标原因
}

type ExpenseCategory = 
  | 'transportation'                   // 交通费
  | 'accommodation'                    // 住宿费
  | 'meals'                            // 餐饮费
  | 'communication'                    // 通讯费
  | 'entertainment'                    // 招待费
  | 'office_supplies'                  // 办公用品
  | 'other';                           // 其他

interface Receipt {
  id: string;
  fileUrl: string;                     // 票据图片URL
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  
  // OCR识别结果
  ocrResult?: {
    invoiceType: string;               // 发票类型
    invoiceCode: string;               // 发票代码
    invoiceNumber: string;             // 发票号码
    invoiceDate: Date;                 // 开票日期
    amount: number;                    // 金额
    taxAmount?: number;                // 税额
    totalAmount: number;               // 价税合计
    sellerName: string;                // 销售方名称
    buyerName: string;                 // 购买方名称
    confidence: number;                // 识别置信度
  };
  
  // 验真结果
  verificationStatus: 'pending' | 'verified' | 'invalid' | 'duplicate';
  verificationMessage?: string;
}

interface AiAuditResult {
  auditId: string;
  auditTimestamp: Date;
  
  // 检查项
  checks: AuditCheck[];
  
  // 异常率
  anomalyRate: number;                 // 百分比
  
  // 审计建议
  recommendation: 'auto_approve' | 'manual_review' | 'reject';
  
  // 审计说明
  summary: string;
  
  // 人工复核
  reviewerId?: string;
  reviewedAt?: Date;
  reviewDecision?: 'approve' | 'reject';
  reviewComment?: string;
}

interface AuditCheck {
  type: AuditCheckType;
  status: 'pass' | 'warning' | 'fail';
  details: string;
  deviation?: number;                  // 偏差值
}

type AuditCheckType = 
  | 'time_consistency'                 // 时间一致性
  | 'location_consistency'             // 地点一致性
  | 'amount_reasonability'             // 金额合理性
  | 'receipt_completeness'             // 票据完整性
  | 'duplicate_check'                  // 重复报销检查
  | 'standard_compliance';             // 费用标准合规
```

### 3.3 AI财务审计规则

AI财务审计是系统的核心功能，通过自动比对报销申请与出差计划，检测异常并标记需人工复核的申请。

**审计规则矩阵**：

| 检查项 | 规则描述 | 异常阈值 | 异常处理 |
|--------|----------|----------|----------|
| 时间一致性 | 报销日期必须在出差计划时间范围内 | 偏差>1天 | 标记Warning |
| 地点一致性 | 报销地点必须与出差目的地匹配 | 距离>50km | 标记Warning |
| 金额合理性 | 单日费用不超过标准的150% | 超标>50% | 标记Fail |
| 票据完整性 | 每笔费用必须附带有效票据 | 缺失>20% | 标记Fail |
| 重复报销 | 同一票据不得重复报销 | 发现重复 | 标记Fail |
| 费用标准 | 各类费用不超过公司标准 | 超标>30% | 标记Warning |

**异常率计算公式**：

```
异常率 = (Warning项数量 × 0.5 + Fail项数量 × 1.0) / 总检查项数量 × 100%

审计建议规则：
- 异常率 = 0%：auto_approve（自动批准）
- 0% < 异常率 ≤ 20%：auto_approve（自动批准，附带提示）
- 20% < 异常率 ≤ 50%：manual_review（需人工复核）
- 异常率 > 50%：reject（建议拒绝）
```

### 3.4 费用标准配置

```typescript
interface ExpenseStandard {
  id: string;
  standardCode: string;                // 标准编号
  effectiveDate: Date;                 // 生效日期
  expiryDate?: Date;                   // 失效日期
  
  // 适用范围
  applicableRoles: string[];           // 适用职级
  applicableCities: CityTier[];        // 适用城市等级
  
  // 费用标准
  standards: {
    accommodation: {
      dailyLimit: number;              // 住宿日限额
      hotelStar: number;               // 酒店星级上限
    };
    transportation: {
      flightClass: 'economy' | 'business' | 'first';
      trainClass: 'second' | 'first' | 'business';
      dailyLocalLimit: number;         // 市内交通日限额
    };
    meals: {
      dailyLimit: number;              // 餐饮日限额
      perMealLimit: number;            // 单餐限额
    };
    communication: {
      dailyLimit: number;              // 通讯日限额
    };
  };
  
  // 元数据
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type CityTier = 'tier1' | 'tier2' | 'tier3' | 'overseas';
```

---

## 4. NocoBase架构设计

### 4.1 Collections设计

NocoBase作为低代码平台，通过Collections定义数据结构。以下是出差与报销系统的核心Collections设计。

**travel_plans Collection**：

```yaml
name: travel_plans
title: 出差计划
fields:
  - name: plan_code
    type: string
    unique: true
    title: 计划编号
    
  - name: employee_id
    type: belongsTo
    target: users
    title: 申请人
    
  - name: supervisor_id
    type: belongsTo
    target: users
    title: 直属主管
    
  - name: purpose
    type: select
    options:
      - { value: service, label: 现场服务 }
      - { value: sales, label: 商务拜访 }
      - { value: training, label: 培训学习 }
      - { value: meeting, label: 会议出席 }
      - { value: other, label: 其他 }
    title: 出差目的
    
  - name: departure_date
    type: date
    title: 出发日期
    
  - name: return_date
    type: date
    title: 返回日期
    
  - name: destinations
    type: json
    title: 目的地列表
    
  - name: estimated_budget
    type: json
    title: 预算信息
    
  - name: commute_arrangements
    type: json
    title: 通勤安排
    
  - name: approval_status
    type: select
    options:
      - { value: draft, label: 草稿 }
      - { value: pending, label: 待审批 }
      - { value: approved, label: 已批准 }
      - { value: rejected, label: 已拒绝 }
      - { value: cancelled, label: 已取消 }
    title: 审批状态
    
  - name: execution_status
    type: select
    options:
      - { value: not_started, label: 未开始 }
      - { value: in_progress, label: 进行中 }
      - { value: completed, label: 已完成 }
      - { value: abnormal, label: 异常 }
    title: 执行状态
    
  - name: clock_in_records
    type: json
    title: 打卡记录
    
  - name: expense_claims
    type: hasMany
    target: expense_claims
    title: 关联报销
```

**expense_claims Collection**：

```yaml
name: expense_claims
title: 报销申请
fields:
  - name: claim_code
    type: string
    unique: true
    title: 报销单号
    
  - name: submitter_id
    type: belongsTo
    target: users
    title: 申请人
    
  - name: travel_plan_id
    type: belongsTo
    target: travel_plans
    title: 关联出差计划
    
  - name: claim_type
    type: select
    options:
      - { value: travel, label: 差旅报销 }
      - { value: business, label: 业务报销 }
      - { value: training, label: 培训报销 }
      - { value: other, label: 其他 }
    title: 报销类型
    
  - name: items
    type: json
    title: 费用明细
    
  - name: total_amount
    type: decimal
    precision: 10
    scale: 2
    title: 总金额
    
  - name: receipts
    type: json
    title: 票据信息
    
  - name: approval_status
    type: select
    options:
      - { value: draft, label: 草稿 }
      - { value: pending, label: 待审批 }
      - { value: approved, label: 已批准 }
      - { value: rejected, label: 已拒绝 }
      - { value: paid, label: 已付款 }
    title: 审批状态
    
  - name: ai_audit_result
    type: json
    title: AI审计结果
    
  - name: payment_status
    type: select
    options:
      - { value: unpaid, label: 未付款 }
      - { value: processing, label: 处理中 }
      - { value: paid, label: 已付款 }
    title: 付款状态
```

### 4.2 权限架构

基于FINDIQ知识转移理念，系统采用四级分层授权机制。

```
┌─────────────────────────────────────────────────────────────┐
│                    系统管理员                                │
│  (全部权限 + 系统配置 + 用户管理 + 费用标准配置)            │
├─────────────────────────────────────────────────────────────┤
│                    财务主管                                  │
│  (报销审批 + 付款确认 + 费用统计 + AI审计复核)              │
├─────────────────────────────────────────────────────────────┤
│                    部门主管                                  │
│  (出差审批 + 报销初审 + 团队监控 + 预算管理)                │
├─────────────────────────────────────────────────────────────┤
│                    普通员工                                  │
│  (出差申请 + 报销提交 + 个人记录查看)                       │
└─────────────────────────────────────────────────────────────┘
```

**权限检查逻辑**：

```typescript
interface TravelExpenseAccessPolicy {
  // 员工级权限
  employee: {
    travel_plans: {
      filter: "employee_id = current_user_id",
      actions: ["create", "read", "update"]
    };
    expense_claims: {
      filter: "submitter_id = current_user_id",
      actions: ["create", "read", "update"]
    };
  };
  
  // 主管级权限
  supervisor: {
    travel_plans: {
      filter: "supervisor_id = current_user_id OR department_id = current_department_id",
      actions: ["read", "approve", "reject"]
    };
    expense_claims: {
      filter: "submitter.supervisor_id = current_user_id",
      actions: ["read", "approve", "reject", "request_revision"]
    };
  };
  
  // 财务主管权限
  finance_manager: {
    expense_claims: {
      filter: "approval_status = 'approved'",
      actions: ["read", "final_approve", "pay", "audit_review"]
    };
    ai_audit_logs: {
      filter: "recommendation = 'manual_review'",
      actions: ["read", "review", "override"]
    };
  };
}
```

---

## 5. Claude Code实现规范

### 5.1 服务层架构

Claude Code负责实现系统的业务逻辑层，遵循以下架构规范。

**目录结构**：

```
server/
├── services/
│   ├── travel-plan.service.ts       # 出差计划服务
│   ├── expense-claim.service.ts     # 报销申请服务
│   ├── ai-expense-audit.service.ts  # AI财务审计服务
│   ├── receipt-ocr.service.ts       # 票据OCR服务
│   └── expense-standard.service.ts  # 费用标准服务
├── routers/
│   ├── travel.router.ts             # 出差相关路由
│   └── expense.router.ts            # 报销相关路由
└── tests/
    ├── travel-plan.test.ts
    ├── expense-claim.test.ts
    └── ai-expense-audit.test.ts
```

### 5.2 核心服务实现规范

**travel-plan.service.ts 规范**：

```typescript
// 服务接口定义
interface TravelPlanService {
  // 创建出差计划
  createTravelPlan(input: CreateTravelPlanInput): Promise<TravelPlan>;
  
  // 获取出差计划列表
  getTravelPlans(options: GetTravelPlansOptions): Promise<TravelPlan[]>;
  
  // 获取单个出差计划
  getTravelPlanById(id: string): Promise<TravelPlan | null>;
  
  // 更新出差计划
  updateTravelPlan(id: string, input: UpdateTravelPlanInput): Promise<boolean>;
  
  // 提交审批
  submitForApproval(id: string): Promise<boolean>;
  
  // 审批操作
  approveTravelPlan(id: string, approverId: string, comment?: string): Promise<boolean>;
  rejectTravelPlan(id: string, approverId: string, reason: string): Promise<boolean>;
  
  // 打卡签到
  clockIn(planId: string, record: ClockInRecord): Promise<boolean>;
  
  // 获取团队位置
  getTeamLocations(supervisorId: string): Promise<EmployeeLocation[]>;
}

// 实现要点
// 1. 所有数据库操作使用 Drizzle ORM
// 2. 使用 tRPC 定义类型安全的 API
// 3. 错误处理使用标准错误码
// 4. 日志记录使用统一格式
```

**ai-expense-audit.service.ts 规范**：

```typescript
// AI审计服务接口
interface AiExpenseAuditService {
  // 执行AI审计
  auditExpenseClaim(claimId: string): Promise<AiAuditResult>;
  
  // 获取审计结果
  getAuditResult(claimId: string): Promise<AiAuditResult | null>;
  
  // 人工复核
  reviewAuditResult(
    auditId: string, 
    reviewerId: string, 
    decision: 'approve' | 'reject',
    comment?: string
  ): Promise<boolean>;
  
  // 获取待复核列表
  getPendingReviews(): Promise<AiAuditResult[]>;
}

// 审计逻辑实现
async function auditExpenseClaim(claimId: string): Promise<AiAuditResult> {
  const claim = await getExpenseClaimById(claimId);
  const travelPlan = claim.travelPlanId 
    ? await getTravelPlanById(claim.travelPlanId) 
    : null;
  
  const checks: AuditCheck[] = [];
  
  // 1. 时间一致性检查
  if (travelPlan) {
    const timeCheck = checkTimeConsistency(claim, travelPlan);
    checks.push(timeCheck);
  }
  
  // 2. 地点一致性检查
  if (travelPlan) {
    const locationCheck = checkLocationConsistency(claim, travelPlan);
    checks.push(locationCheck);
  }
  
  // 3. 金额合理性检查
  const amountCheck = checkAmountReasonability(claim);
  checks.push(amountCheck);
  
  // 4. 票据完整性检查
  const receiptCheck = checkReceiptCompleteness(claim);
  checks.push(receiptCheck);
  
  // 5. 重复报销检查
  const duplicateCheck = await checkDuplicateClaim(claim);
  checks.push(duplicateCheck);
  
  // 6. 费用标准合规检查
  const standardCheck = await checkStandardCompliance(claim);
  checks.push(standardCheck);
  
  // 计算异常率
  const anomalyRate = calculateAnomalyRate(checks);
  
  // 生成审计建议
  const recommendation = getRecommendation(anomalyRate);
  
  return {
    auditId: generateUUID(),
    auditTimestamp: new Date(),
    checks,
    anomalyRate,
    recommendation,
    summary: generateAuditSummary(checks, anomalyRate)
  };
}
```

### 5.3 tRPC路由定义

```typescript
// expense.router.ts
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';

export const expenseRouter = router({
  // 创建报销申请
  createClaim: protectedProcedure
    .input(z.object({
      travelPlanId: z.string().optional(),
      claimType: z.enum(['travel', 'business', 'training', 'other']),
      items: z.array(expenseItemSchema),
      receipts: z.array(receiptSchema)
    }))
    .mutation(async ({ ctx, input }) => {
      return await createExpenseClaim({
        ...input,
        submitterId: ctx.user.id
      });
    }),
  
  // 获取我的报销列表
  getMyClaims: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending', 'approved', 'rejected', 'paid']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20)
    }))
    .query(async ({ ctx, input }) => {
      return await getExpenseClaims({
        submitterId: ctx.user.id,
        ...input
      });
    }),
  
  // 提交报销申请
  submitClaim: protectedProcedure
    .input(z.object({
      claimId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 提交前执行AI审计
      const auditResult = await auditExpenseClaim(input.claimId);
      await saveAuditResult(input.claimId, auditResult);
      
      return await submitExpenseClaim(input.claimId);
    }),
  
  // 审批报销
  approveClaim: protectedProcedure
    .input(z.object({
      claimId: z.string(),
      comment: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查审批权限
      await checkApprovalPermission(ctx.user.id, input.claimId);
      
      return await approveExpenseClaim(input.claimId, ctx.user.id, input.comment);
    }),
  
  // 获取AI审计结果
  getAuditResult: protectedProcedure
    .input(z.object({
      claimId: z.string()
    }))
    .query(async ({ input }) => {
      return await getAuditResult(input.claimId);
    }),
  
  // 人工复核AI审计
  reviewAudit: protectedProcedure
    .input(z.object({
      auditId: z.string(),
      decision: z.enum(['approve', 'reject']),
      comment: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查财务权限
      await checkFinancePermission(ctx.user.id);
      
      return await reviewAuditResult(
        input.auditId,
        ctx.user.id,
        input.decision,
        input.comment
      );
    })
});
```

---

## 6. Gemini AI大脑集成方案

### 6.1 Gemini角色定位

在GRT智能系统中，Gemini作为"AI大脑"负责业务逻辑判断和决策建议，而Claude Code负责具体实现。

**职责分工**：

| 职责 | Gemini | Claude Code |
|------|--------|-------------|
| 业务规则判断 | ✅ 主导 | 执行 |
| 异常检测策略 | ✅ 设计 | 实现 |
| 审批流程决策 | ✅ 建议 | 执行 |
| 代码实现 | 指导 | ✅ 主导 |
| 数据库操作 | 设计 | ✅ 实现 |
| UI交互 | 设计 | ✅ 实现 |

### 6.2 Strategic_CFO_Assistant配置

Strategic_CFO_Assistant是专门用于财务审计的AI角色，由Gemini驱动。

```typescript
interface StrategicCFOAssistant {
  assistantId: 'strategic_cfo_assistant';
  displayName: '战略财务助手';
  
  capabilities: {
    // 报销审计能力
    expenseAudit: {
      enabled: true;
      autoApprovalThreshold: 5000;       // 5000元以下自动批准
      anomalyDetectionModel: 'gemini-2.0-pro';
      crossValidationSources: [
        'travel_plans',                   // 出差计划
        'expense_standards',              // 费用标准
        'historical_claims',              // 历史报销
        'market_prices'                   // 市场价格
      ];
    };
    
    // 报价监控能力
    quotationMonitoring: {
      enabled: true;
      marginFluctuationAlert: 0.15;      // 毛利波动15%预警
      competitorPriceTracking: true;
    };
    
    // 财务发放监控
    financialDisbursement: {
      enabled: true;
      cashFlowPrediction: true;
      paymentScheduleOptimization: true;
    };
  };
  
  // 审计规则配置
  auditRules: [
    {
      ruleId: 'TIME_CONSISTENCY',
      ruleName: '时间一致性',
      threshold: 1,                       // 允许偏差1天
      severity: 'warning'
    },
    {
      ruleId: 'LOCATION_CONSISTENCY',
      ruleName: '地点一致性',
      threshold: 50,                      // 允许偏差50km
      severity: 'warning'
    },
    {
      ruleId: 'AMOUNT_REASONABILITY',
      ruleName: '金额合理性',
      threshold: 1.5,                     // 允许超标50%
      severity: 'critical'
    },
    {
      ruleId: 'RECEIPT_COMPLETENESS',
      ruleName: '票据完整性',
      threshold: 0.8,                     // 票据覆盖率80%
      severity: 'critical'
    }
  ];
  
  // 报告频率
  reportingFrequency: 'daily';
}
```

### 6.3 Gemini调用规范

```typescript
// Gemini审计决策调用
async function geminiAuditDecision(
  claim: ExpenseClaim,
  travelPlan: TravelPlan | null,
  checks: AuditCheck[]
): Promise<GeminiDecision> {
  const prompt = `
作为GRT智能系统的战略财务助手，请分析以下报销申请：

## 报销信息
- 报销单号：${claim.claimCode}
- 申请人：${claim.submitterName}
- 报销类型：${claim.claimType}
- 总金额：${claim.totalAmount} 元

## 关联出差计划
${travelPlan ? `
- 计划编号：${travelPlan.planCode}
- 出差目的：${travelPlan.purpose}
- 出发日期：${travelPlan.departureDate}
- 返回日期：${travelPlan.returnDate}
- 目的地：${JSON.stringify(travelPlan.destinations)}
` : '无关联出差计划'}

## 自动检查结果
${checks.map(c => `- ${c.type}: ${c.status} - ${c.details}`).join('\n')}

请根据以上信息，给出审计建议：
1. 是否建议批准？
2. 需要关注的风险点？
3. 是否需要人工复核？
4. 其他建议？

请以JSON格式返回：
{
  "recommendation": "auto_approve" | "manual_review" | "reject",
  "riskPoints": string[],
  "requiresHumanReview": boolean,
  "suggestions": string[],
  "confidence": number
}
`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: STRATEGIC_CFO_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'audit_decision',
        strict: true,
        schema: geminiDecisionSchema
      }
    }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 6.4 脱敏代理层

为保护公司核心数据，所有LLM调用必须通过脱敏代理层。

```typescript
interface DeidentificationProxy {
  // 敏感字段定义
  sensitiveFields: {
    'client_tier_prices': true,         // 客户分级价格
    'core_process_formulas': true,      // 核心工艺配方
    'cost_structures': true,            // 成本结构
    'supplier_prices': true             // 供应商价格
  };
  
  // 脱敏规则
  rules: {
    // 金额脱敏：保留数量级
    amount: (value: number) => {
      const magnitude = Math.floor(Math.log10(value));
      return `约${Math.pow(10, magnitude)}元级别`;
    };
    
    // 客户名称脱敏
    customerName: (value: string) => {
      return value.substring(0, 2) + '***公司';
    };
    
    // 地址脱敏
    address: (value: string) => {
      return value.split('市')[0] + '市***';
    };
  };
}
```

---

## 7. 数据模型与API规范

### 7.1 数据库表结构

**travel_plans表**：

```sql
CREATE TABLE travel_plans (
  id VARCHAR(36) PRIMARY KEY,
  plan_code VARCHAR(50) UNIQUE NOT NULL,
  employee_id VARCHAR(36) NOT NULL REFERENCES users(id),
  supervisor_id VARCHAR(36) REFERENCES users(id),
  department_id VARCHAR(36) REFERENCES departments(id),
  
  purpose ENUM('service', 'sales', 'training', 'meeting', 'other') NOT NULL,
  purpose_description TEXT,
  related_project_id VARCHAR(36) REFERENCES projects(id),
  related_customer_id VARCHAR(36) REFERENCES customers(id),
  
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  destinations JSON NOT NULL,
  estimated_budget JSON NOT NULL,
  commute_arrangements JSON,
  
  approval_status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') DEFAULT 'draft',
  approval_chain JSON,
  
  execution_status ENUM('not_started', 'in_progress', 'completed', 'abnormal') DEFAULT 'not_started',
  clock_in_records JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) NOT NULL,
  
  INDEX idx_employee_id (employee_id),
  INDEX idx_supervisor_id (supervisor_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_departure_date (departure_date)
);
```

**expense_claims表**：

```sql
CREATE TABLE expense_claims (
  id VARCHAR(36) PRIMARY KEY,
  claim_code VARCHAR(50) UNIQUE NOT NULL,
  submitter_id VARCHAR(36) NOT NULL REFERENCES users(id),
  department_id VARCHAR(36) REFERENCES departments(id),
  
  travel_plan_id VARCHAR(36) REFERENCES travel_plans(id),
  claim_type ENUM('travel', 'business', 'training', 'other') NOT NULL,
  
  items JSON NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  currency ENUM('CNY', 'USD', 'EUR') DEFAULT 'CNY',
  
  receipts JSON,
  
  approval_status ENUM('draft', 'pending', 'approved', 'rejected', 'paid') DEFAULT 'draft',
  approval_chain JSON,
  current_approver_id VARCHAR(36) REFERENCES users(id),
  
  ai_audit_result JSON,
  
  payment_status ENUM('unpaid', 'processing', 'paid') DEFAULT 'unpaid',
  payment_date DATE,
  payment_ref VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  
  INDEX idx_submitter_id (submitter_id),
  INDEX idx_travel_plan_id (travel_plan_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_payment_status (payment_status)
);
```

**ai_audit_logs表**：

```sql
CREATE TABLE ai_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  audit_type ENUM('expense', 'quotation', 'disbursement') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  
  checks JSON NOT NULL,
  anomaly_rate DECIMAL(5,2) NOT NULL,
  recommendation ENUM('auto_approve', 'manual_review', 'reject') NOT NULL,
  summary TEXT,
  
  reviewer_id VARCHAR(36) REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_decision ENUM('approve', 'reject'),
  review_comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_target (target_type, target_id),
  INDEX idx_recommendation (recommendation),
  INDEX idx_reviewer_id (reviewer_id)
);
```

### 7.2 API端点清单

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/trpc/travel.create` | POST | 创建出差计划 | employee |
| `/api/trpc/travel.list` | GET | 获取出差计划列表 | employee |
| `/api/trpc/travel.getById` | GET | 获取单个出差计划 | employee |
| `/api/trpc/travel.update` | POST | 更新出差计划 | employee |
| `/api/trpc/travel.submit` | POST | 提交审批 | employee |
| `/api/trpc/travel.approve` | POST | 审批通过 | supervisor |
| `/api/trpc/travel.reject` | POST | 审批拒绝 | supervisor |
| `/api/trpc/travel.clockIn` | POST | 打卡签到 | employee |
| `/api/trpc/travel.teamLocations` | GET | 获取团队位置 | supervisor |
| `/api/trpc/expense.create` | POST | 创建报销申请 | employee |
| `/api/trpc/expense.list` | GET | 获取报销列表 | employee |
| `/api/trpc/expense.getById` | GET | 获取单个报销 | employee |
| `/api/trpc/expense.submit` | POST | 提交报销 | employee |
| `/api/trpc/expense.approve` | POST | 审批报销 | supervisor/finance |
| `/api/trpc/expense.reject` | POST | 拒绝报销 | supervisor/finance |
| `/api/trpc/expense.auditResult` | GET | 获取AI审计结果 | employee |
| `/api/trpc/expense.reviewAudit` | POST | 人工复核审计 | finance |
| `/api/trpc/expense.pay` | POST | 确认付款 | finance |

---

## 8. 前端界面规范

### 8.1 页面清单

| 页面名称 | 路由 | 功能描述 | 用户角色 |
|----------|------|----------|----------|
| 出差申请 | /travel/apply | 创建和编辑出差计划 | 员工 |
| 我的出差 | /travel/my | 查看个人出差记录 | 员工 |
| 出差审批 | /travel/approve | 审批下属出差申请 | 主管 |
| 团队监控 | /travel/monitor | 地图查看团队位置 | 主管 |
| 报销申请 | /expense/apply | 创建和编辑报销单 | 员工 |
| 我的报销 | /expense/my | 查看个人报销记录 | 员工 |
| 报销审批 | /expense/approve | 审批报销申请 | 主管/财务 |
| AI审计复核 | /expense/audit-review | 复核AI标记的异常报销 | 财务 |
| 费用统计 | /expense/statistics | 费用分析报表 | 主管/财务 |

### 8.2 组件规范

**TravelApplyForm组件**：

```tsx
interface TravelApplyFormProps {
  initialData?: TravelPlan;
  onSubmit: (data: CreateTravelPlanInput) => Promise<void>;
  onSaveDraft: (data: CreateTravelPlanInput) => Promise<void>;
}

// 表单字段
const formFields = [
  { name: 'purpose', label: '出差目的', type: 'select', required: true },
  { name: 'purposeDescription', label: '目的详述', type: 'textarea' },
  { name: 'departureDate', label: '出发日期', type: 'date', required: true },
  { name: 'returnDate', label: '返回日期', type: 'date', required: true },
  { name: 'destinations', label: '目的地', type: 'destination-list', required: true },
  { name: 'estimatedBudget', label: '预算信息', type: 'budget-form', required: true },
  { name: 'commuteArrangements', label: '通勤安排', type: 'commute-form' }
];
```

**ExpenseClaimForm组件**：

```tsx
interface ExpenseClaimFormProps {
  travelPlanId?: string;
  initialData?: ExpenseClaim;
  onSubmit: (data: CreateExpenseClaimInput) => Promise<void>;
  onSaveDraft: (data: CreateExpenseClaimInput) => Promise<void>;
}

// 费用明细表格
const expenseItemColumns = [
  { key: 'category', label: '费用类别', type: 'select' },
  { key: 'description', label: '费用说明', type: 'text' },
  { key: 'amount', label: '金额', type: 'number' },
  { key: 'expenseDate', label: '消费日期', type: 'date' },
  { key: 'receipt', label: '票据', type: 'upload' }
];
```

**AiAuditResultPanel组件**：

```tsx
interface AiAuditResultPanelProps {
  auditResult: AiAuditResult;
  onReview?: (decision: 'approve' | 'reject', comment?: string) => Promise<void>;
  showReviewActions?: boolean;
}

// 审计结果展示
// - 异常率指示器（绿/黄/红）
// - 检查项列表（通过/警告/失败）
// - AI建议说明
// - 人工复核操作（如有权限）
```

---

## 9. 实施计划与验收标准

### 9.1 实施阶段

| 阶段 | 内容 | 工期 | 交付物 |
|------|------|------|--------|
| 阶段1 | 数据模型设计与数据库迁移 | 1天 | Schema定义、迁移脚本 |
| 阶段2 | 出差计划核心功能 | 2天 | 申请/审批/打卡API |
| 阶段3 | 报销申请核心功能 | 2天 | 申请/审批/付款API |
| 阶段4 | AI财务审计服务 | 2天 | 审计服务、Gemini集成 |
| 阶段5 | 主管工作台（地图） | 1天 | 团队监控页面 |
| 阶段6 | 前端页面开发 | 3天 | 所有前端页面 |
| 阶段7 | 单元测试与集成测试 | 2天 | 测试报告 |
| 阶段8 | 文档与部署 | 1天 | 用户手册、部署文档 |

### 9.2 验收标准

**功能验收**：

| 验收项 | 验收标准 | 验收方法 |
|--------|----------|----------|
| 出差申请 | 员工可创建、编辑、提交出差计划 | 功能测试 |
| 出差审批 | 主管可审批、拒绝出差申请 | 功能测试 |
| 位置打卡 | 员工可GPS打卡，记录位置 | 功能测试 |
| 团队监控 | 主管可在地图查看团队位置 | 功能测试 |
| 报销申请 | 员工可创建、上传票据、提交报销 | 功能测试 |
| AI审计 | 提交报销自动触发AI审计 | 功能测试 |
| 审计复核 | 财务可复核AI标记的异常报销 | 功能测试 |
| 报销审批 | 主管/财务可审批报销申请 | 功能测试 |

**性能验收**：

| 指标 | 标准 | 测试方法 |
|------|------|----------|
| 页面加载 | <2秒 | 性能测试 |
| API响应 | <500ms | 性能测试 |
| AI审计 | <5秒 | 性能测试 |
| 并发用户 | 支持100并发 | 压力测试 |

**测试覆盖**：

| 测试类型 | 覆盖率要求 |
|----------|-----------|
| 单元测试 | ≥80% |
| 集成测试 | 核心流程100% |
| E2E测试 | 主要用户场景 |

---

## 10. Manus执行命令建议

ChatGPT更新完成后，请返回以下Manus命令格式：

```
@Manus 请执行以下开发任务：

## 任务1：数据库Schema创建
创建travel_plans、expense_claims、ai_audit_logs表，按照规范文档第7.1节定义

## 任务2：出差计划服务
实现travel-plan.service.ts，包含CRUD和审批功能

## 任务3：报销申请服务
实现expense-claim.service.ts，包含CRUD和审批功能

## 任务4：AI财务审计服务
实现ai-expense-audit.service.ts，集成Gemini决策

## 任务5：tRPC路由
实现travel.router.ts和expense.router.ts

## 任务6：前端页面
实现出差申请、报销申请、主管监控等页面

## 任务7：单元测试
为所有服务编写单元测试，覆盖率≥80%
```

---

**文档版本**: v1.0  
**作者**: Manus AI  
**最后更新**: 2026-01-25
