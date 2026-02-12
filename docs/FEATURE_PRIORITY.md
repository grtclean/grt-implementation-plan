# GRT系统功能优先级清单

## 概述

本文档列出系统中需要实现的功能，按优先级分类。当前系统有约63个placeholder路由需要逐步替换为真实实现。

## 优先级说明

- **P0 - 关键功能**：影响核心业务流程，必须优先实现
- **P1 - 重要功能**：提升用户体验，应尽快实现
- **P2 - 一般功能**：增强功能，可按需实现
- **P3 - 低优先级**：锦上添花，后续迭代

---

## P0 - 关键功能（已实现）

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户认证 | ✅ 已实现 | OAuth登录、会话管理 |
| 项目管理基础 | ✅ 已实现 | 项目列表、详情查看 |
| 开发任务看板 | ✅ 已实现 | 任务CRUD、筛选、详情 |
| 生产看板 | ✅ 已实现 | 工单状态、进度监控 |
| 能力仪表盘 | ✅ 已实现 | 能力等级、证据管理 |

---

## P0 - 关键功能（待实现）

| 功能 | 路由 | 说明 |
|------|------|------|
| 审批流程 | approvals | 审批列表、审批操作 |
| 采购订单管理 | procurement | 采购单CRUD、状态流转 |
| 成本核算 | costTracking | 成本记录、预算对比 |
| 项目Gate检查 | projectGate | Gate检查项、审批 |

---

## P1 - 重要功能（待实现）

| 功能 | 路由 | 说明 |
|------|------|------|
| CRM客户管理 | crmCustomers | 客户信息CRUD |
| CRM商机管理 | crmOpportunities | 商机跟踪、转化 |
| 线索管理 | leadManagement | 线索导入、评分 |
| 报价管理 | quotations | 报价生成、审批 |
| 合同管理 | contracts | 合同CRUD、状态 |
| 发票管理 | invoices | 发票生成、跟踪 |

---

## P2 - 一般功能（待实现）

| 功能 | 路由 | 说明 |
|------|------|------|
| 供应商管理 | suppliers | 供应商信息、评级 |
| 物料管理 | materials | 物料主数据 |
| 库存管理 | inventory | 库存查询、调整 |
| 质量检验 | qualityInspection | 检验记录、报告 |
| 设备管理 | equipments | 设备台账、维护 |
| 工时管理 | timesheets | 工时记录、统计 |

---

## P3 - 低优先级（待实现）

| 功能 | 路由 | 说明 |
|------|------|------|
| 知识库 | knowledgeBase | 文档管理、搜索 |
| 培训管理 | training | 培训计划、记录 |
| 绩效管理 | performance | 绩效评估、目标 |
| 报表中心 | reports | 自定义报表 |
| 系统设置 | systemSettings | 参数配置 |

---

## 占位符按钮处理策略

### 已处理

1. **M1启动会 - 配置红蓝对抗计划**：添加配置对话框
2. **开发任务看板**：完整CRUD功能

### 处理中

所有占位符按钮统一使用 `PlaceholderButton` 组件或 `usePlaceholderToast` hook，显示"功能完善中"提示。

### 使用方法

```tsx
// 方法1：使用PlaceholderButton组件
import { PlaceholderButton } from '@/components/PlaceholderFeature';

<PlaceholderButton featureName="报表导出">
  导出报表
</PlaceholderButton>

// 方法2：使用usePlaceholderToast hook
import { usePlaceholderToast } from '@/components/PlaceholderFeature';

const { showPlaceholder } = usePlaceholderToast();

<Button onClick={() => showPlaceholder('报表导出')}>
  导出报表
</Button>
```

---

## 更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-02-02 | 创建功能优先级清单 |
| 2026-02-02 | 实现红蓝对抗配置对话框 |
| 2026-02-02 | 创建PlaceholderFeature组件 |
