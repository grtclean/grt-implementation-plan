# RFC-027: 流程笔记系统扩展

## 基本信息

| 字段 | 内容 |
|------|------|
| RFC编号 | RFC-027 |
| 标题 | 流程笔记系统扩展 |
| 状态 | 已批准 |
| 作者 | Manus AI |
| 创建日期 | 2026-01-18 |
| 评审日期 | 2026-01-18 |
| 实施优先级 | P1 |

---

## 1. 需求概述

### 1.1 背景

RFC-026已成功实现流程笔记系统的核心功能，包括ProcessNotebook组件、笔记CRUD API和AI内容识别。为进一步提升系统的实用性和知识沉淀能力，需要扩展以下功能：

1. **业务页面集成**：将流程笔记组件集成到CRM客户详情、商机管理、成本管理等核心业务页面
2. **AI识别规则库**：配置GRT产品型号、客户名称、清洁度标准等业务数据，提升AI识别准确率
3. **笔记搜索和导出**：支持跨项目笔记搜索和批量导出，便于知识复用

### 1.2 目标

- 实现流程笔记在所有核心业务模块的全覆盖
- 建立GRT业务领域的AI识别规则库
- 提供高效的笔记检索和导出能力

---

## 2. 技术方案

### 2.1 业务页面集成

#### 2.1.1 集成页面清单

| 页面 | 路由 | 实体类型 | 集成方式 |
|------|------|----------|----------|
| CRM客户详情 | /crm/customers | customer | Tab页集成 |
| 商机管理 | /crm/opportunities | opportunity | Tab页集成 |
| 成本管理 | /cost-management | cost_budget | 侧边栏集成 |

#### 2.1.2 集成代码示例

```tsx
import ProcessNotebook from '@/components/ProcessNotebook';

// 在业务页面中集成
<ProcessNotebook
  entityType="customer"
  entityId={customerId}
  processStep="客户沟通"
/>
```

### 2.2 AI识别规则库

#### 2.2.1 数据库Schema

```sql
CREATE TABLE ai_recognition_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_type VARCHAR(50) NOT NULL,      -- product_model/cleanliness_standard/customer_name/amount/date
  pattern VARCHAR(500) NOT NULL,        -- 匹配模式（正则表达式或关键词）
  target_field VARCHAR(100) NOT NULL,   -- 目标字段
  target_entity VARCHAR(100),           -- 目标实体类型
  priority INT DEFAULT 0,               -- 优先级
  is_active TINYINT DEFAULT 1,          -- 是否启用
  metadata JSON,                        -- 扩展元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2.2.2 预置规则数据

| 规则类型 | 匹配模式示例 | 目标字段 |
|----------|--------------|----------|
| product_model | GRT-SC800W, GRT-DC880W, GRT-MC888W | equipment_model |
| cleanliness_standard | VDA19.1, ISO16232, PV3349, NAS1638 | cleanliness_level |
| customer_name | 从CRM客户库动态加载 | customer_id |
| amount | ¥\d+, \d+万, \d+元 | quotation_amount |
| date | \d{4}-\d{2}-\d{2}, \d{4}年\d{1,2}月 | milestone_date |
| cycle_time | \d+秒/件, \d+s/pc, 节拍\d+ | cycle_time |

### 2.3 笔记搜索和导出

#### 2.3.1 搜索功能

- **全文搜索**：支持笔记内容、标题、标签的全文检索
- **过滤条件**：按实体类型、时间范围、创建人筛选
- **排序方式**：按相关度、时间、更新频率排序

#### 2.3.2 导出功能

| 导出格式 | 内容 | 用途 |
|----------|------|------|
| PDF | 笔记内容+附件列表+AI建议 | 正式文档归档 |
| Excel | 笔记列表+元数据 | 数据分析 |
| Markdown | 纯文本内容 | 知识库导入 |

---

## 3. 实施计划

### 3.1 任务分解

| 任务 | 预计工时 | 优先级 |
|------|----------|--------|
| 集成到CRM客户详情页面 | 2小时 | P1 |
| 集成到商机管理页面 | 2小时 | P1 |
| 集成到成本管理页面 | 2小时 | P1 |
| 创建AI识别规则数据库表 | 1小时 | P1 |
| 导入GRT产品型号数据 | 1小时 | P1 |
| 导入清洁度标准数据 | 0.5小时 | P1 |
| 实现规则匹配API | 2小时 | P1 |
| 实现笔记全文搜索API | 2小时 | P2 |
| 实现笔记导出功能 | 2小时 | P2 |
| 创建笔记搜索页面 | 2小时 | P2 |

**总计预计工时**：16.5小时

### 3.2 里程碑

| 里程碑 | 完成标准 | 目标日期 |
|--------|----------|----------|
| M1 | 业务页面集成完成 | 2026-01-18 |
| M2 | AI识别规则库配置完成 | 2026-01-18 |
| M3 | 搜索和导出功能完成 | 2026-01-18 |

---

## 4. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 规则匹配性能问题 | 中 | 低 | 使用缓存和索引优化 |
| 全文搜索准确率 | 中 | 中 | 使用分词和权重调整 |
| 导出文件过大 | 低 | 低 | 分页导出和压缩 |

---

## 5. 评审记录

| 评审项 | 结果 | 备注 |
|--------|------|------|
| 技术可行性 | ✅ 通过 | 基于现有架构扩展 |
| 安全性评估 | ✅ 通过 | 复用现有权限体系 |
| 性能评估 | ✅ 通过 | 需要索引优化 |
| 资源评估 | ✅ 通过 | 工时合理 |

**评审结论**：批准实施

---

## 6. 参考文档

- [RFC-026: 流程笔记系统](./RFC-026-process-notebook-system.md)
- [Claude Code + NocoBase技术规范](../claude-code-nocobase-technical-specification.md)
- [设备型号基础数据表](../equipment-model-master-data-v1.1.md)
