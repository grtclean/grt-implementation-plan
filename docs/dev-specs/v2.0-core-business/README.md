# GRT v2.0 核心业务功能规划

**版本**: 2.0  
**规划日期**: 2026-01-17  
**实施方**: Claude Code  
**协作模式**: Manus + Claude Code + NocoBase

---

## 1. 版本概述

v2.0版本聚焦于GRT工业清洗设备供应商的**核心业务流程数字化**，涵盖从方案设计到报价、从研发BOM到仓库管理的全链条功能。

### 1.1 核心业务流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GRT 核心业务流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ 客户需求 │───▶│ AI方案   │───▶│ 产品配置 │───▶│ 报价单   │              │
│  │ 输入     │    │ 推荐     │    │ & BOM    │    │ 生成     │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │              │                │               │                     │
│       ▼              ▼                ▼               ▼                     │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    项目立项 (M0-M12)                          │          │
│  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐     │          │
│  │  │ M0 │─▶│ M1 │─▶│ M2 │─▶│ M3 │─▶│ M4 │─▶│ M5 │─▶│... │     │          │
│  │  └────┘  └────┘  └────┘  └────┘  └────┘  └────┘  └────┘     │          │
│  │     │              │       │              │                   │          │
│  │     ▼              ▼       ▼              ▼                   │          │
│  │  AI推荐         AI推荐   BOM确定      采购执行               │          │
│  │  方案/报价      SOP/BOM  设计评审     物料管理               │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                │                                            │
│                                ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                      BOM物料管理系统                          │          │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐               │          │
│  │  │ 研发BOM  │───▶│ 采购执行 │───▶│ 仓库管理 │               │          │
│  │  │ (设计)   │    │ (物料号) │    │ (料位)   │               │          │
│  │  └──────────┘    └──────────┘    └──────────┘               │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
                    ┌─────────────────────┐
                    │  Module 1           │
                    │  AI方案设计系统     │
                    │  (历史案例+推荐)    │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Module 2       │ │  Module 3       │ │  Module 4       │
│  BOM物料管理    │ │  项目阶段AI     │ │  产品配置与     │
│  (全流程)       │ │  推荐(M1-M12)   │ │  报价系统       │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │  现有系统           │
                    │  (项目管理/CRM/     │
                    │   成本管理等)       │
                    └─────────────────────┘
```

---

## 2. 模块清单

| 模块 | 名称 | 优先级 | 预计工时 | 依赖 | 文档 |
|------|------|--------|----------|------|------|
| Module 1 | AI方案设计系统 | P0 | 20-25小时 | 无 | [详细规划](module1-ai-solution-design.md) |
| Module 2 | BOM物料管理系统 | P0 | 25-30小时 | Module 1 | [详细规划](module2-bom-material-management.md) |
| Module 3 | 项目阶段AI推荐 | P1 | 15-20小时 | Module 1, 2 | [详细规划](module3-project-phase-ai-recommend.md) |
| Module 4 | 产品配置与报价 | P1 | 18-22小时 | Module 2 | [详细规划](module4-product-config-quotation.md) |

**总预计工时**: 78-97小时

---

## 3. 三层协作模式

### 3.1 角色分工

| 角色 | 职责 | 工具/平台 |
|------|------|-----------|
| **Manus** | 架构设计、规划文档、任务分解、进度跟踪 | Manus平台 |
| **Claude Code** | 代码实现、单元测试、Bug修复 | VS Code + Claude |
| **NocoBase** | 低代码配置、数据管理、流程配置 | NocoBase平台 |

### 3.2 迭代模式

```
┌─────────────────────────────────────────────────────────────────┐
│                        迭代周期 (1-2周)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │ Manus   │──▶│ Claude  │──▶│ 测试    │──▶│ 交付    │        │
│  │ 规划    │   │ Code    │   │ 验收    │   │ 部署    │        │
│  │         │   │ 实施    │   │         │   │         │        │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│       │             │             │             │              │
│       ▼             ▼             ▼             ▼              │
│  - 需求分析     - 数据库实现   - 单元测试    - 保存检查点     │
│  - 架构设计     - API开发      - 功能测试    - 更新文档       │
│  - 任务分解     - 前端开发     - Bug修复     - 版本发布       │
│  - 文档编写     - 代码审查     - 性能优化                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 文档规范

每个模块的规划文档必须包含：

1. **业务背景** - 业务场景、核心功能、输入输出
2. **数据库Schema** - SQL定义 + Drizzle Schema
3. **API路由设计** - tRPC路由 + 核心函数
4. **前端组件设计** - 页面结构 + 组件示例
5. **实施步骤** - 分Phase的任务清单
6. **验收标准** - 功能验收 + 测试覆盖
7. **检查清单** - 实施前/中/后检查项

---

## 4. 实施路线图

### 4.1 Phase 1: 基础模块 (Week 1-2)

| 周 | 模块 | 任务 | 负责人 |
|----|------|------|--------|
| Week 1 | Module 1 | AI方案设计系统 - 历史案例管理 | Claude Code |
| Week 1 | Module 1 | AI方案设计系统 - 智能推荐 | Claude Code |
| Week 2 | Module 2 | BOM物料管理 - 研发BOM | Claude Code |
| Week 2 | Module 2 | BOM物料管理 - 物料编号系统 | Claude Code |

### 4.2 Phase 2: 核心流程 (Week 3-4)

| 周 | 模块 | 任务 | 负责人 |
|----|------|------|--------|
| Week 3 | Module 2 | BOM物料管理 - 采购流程 | Claude Code |
| Week 3 | Module 2 | BOM物料管理 - 仓库管理 | Claude Code |
| Week 4 | Module 3 | 项目阶段AI推荐 | Claude Code |
| Week 4 | Module 4 | 产品配置与报价 - 成本基准 | Claude Code |

### 4.3 Phase 3: 高级功能 (Week 5-6)

| 周 | 模块 | 任务 | 负责人 |
|----|------|------|--------|
| Week 5 | Module 4 | 产品配置与报价 - 报价生成 | Claude Code |
| Week 5 | 集成 | 模块集成测试 | Claude Code |
| Week 6 | 优化 | 性能优化、Bug修复 | Claude Code |
| Week 6 | 文档 | 用户手册、培训材料 | Manus |

---

## 5. 数据库Schema总览

### 5.1 新增表清单

| 模块 | 表名 | 说明 |
|------|------|------|
| Module 1 | historical_cases | 历史案例表 |
| Module 1 | case_parameters | 案例参数表 |
| Module 1 | ai_solution_recommendations | AI方案推荐记录表 |
| Module 2 | bom_headers | BOM主表 |
| Module 2 | bom_items | BOM明细表 |
| Module 2 | materials | 物料主数据表 |
| Module 2 | material_numbers | 物料编号表 |
| Module 2 | purchase_orders | 采购订单表 |
| Module 2 | purchase_order_items | 采购订单明细表 |
| Module 2 | warehouse_locations | 仓库料位表 |
| Module 2 | inventory | 库存表 |
| Module 2 | inventory_transactions | 库存事务表 |
| Module 3 | project_phase_documents | 项目阶段资料表 |
| Module 3 | standard_operating_procedures | SOP标准作业程序表 |
| Module 3 | project_ai_recommendations | 项目AI推荐记录表 |
| Module 4 | annual_cost_standards | 年度成本基准表 |
| Module 4 | product_configurations | 产品配置模板表 |
| Module 4 | quotations | 报价单表 |
| Module 4 | quotation_items | 报价单明细表 |

### 5.2 表关系图

```
historical_cases ──┬── case_parameters
                   └── ai_solution_recommendations
                              │
                              ▼
                    ┌─────────────────┐
                    │   projects      │
                    │   (现有表)      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ bom_headers     │ │ project_phase_  │ │ quotations      │
│      │          │ │ documents       │ │      │          │
│      ▼          │ │      │          │ │      ▼          │
│ bom_items ──────│─│──────│──────────│─│ quotation_items │
│      │          │ │      ▼          │ │                 │
│      ▼          │ │ standard_       │ │                 │
│ materials ◀─────│─│ operating_      │ │                 │
│      │          │ │ procedures      │ │                 │
│      ▼          │ └─────────────────┘ └─────────────────┘
│ material_       │
│ numbers         │
│      │          │
│      ▼          │
│ purchase_orders │
│      │          │
│      ▼          │
│ inventory       │
└─────────────────┘
```

---

## 6. API路由总览

### 6.1 新增路由清单

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| Module 1 | `historicalCase.*` | 历史案例管理 |
| Module 1 | `aiSolution.*` | AI方案推荐 |
| Module 2 | `bom.*` | BOM管理 |
| Module 2 | `material.*` | 物料管理 |
| Module 2 | `purchaseOrder.*` | 采购订单 |
| Module 2 | `warehouse.*` | 仓库管理 |
| Module 2 | `inventory.*` | 库存管理 |
| Module 3 | `projectPhase.documents.*` | 阶段资料 |
| Module 3 | `projectPhase.sop.*` | SOP管理 |
| Module 3 | `projectPhase.aiRecommend.*` | 阶段AI推荐 |
| Module 4 | `costStandard.*` | 成本基准 |
| Module 4 | `productConfig.*` | 产品配置 |
| Module 4 | `quotation.*` | 报价单 |

---

## 7. 前端页面总览

### 7.1 新增页面清单

| 模块 | 路由 | 页面 |
|------|------|------|
| Module 1 | `/cases` | 历史案例列表 |
| Module 1 | `/cases/[id]` | 案例详情 |
| Module 1 | `/ai-solution` | AI方案推荐 |
| Module 2 | `/bom` | BOM列表 |
| Module 2 | `/bom/[id]` | BOM详情 |
| Module 2 | `/materials` | 物料主数据 |
| Module 2 | `/purchase-orders` | 采购订单 |
| Module 2 | `/warehouse` | 仓库管理 |
| Module 2 | `/inventory` | 库存管理 |
| Module 3 | `/project/[id]/phases` | 项目阶段 |
| Module 3 | `/project/[id]/phases/[code]/ai-recommend` | 阶段AI推荐 |
| Module 3 | `/sop` | SOP模板库 |
| Module 4 | `/settings/cost-standards` | 成本基准设置 |
| Module 4 | `/products` | 产品配置 |
| Module 4 | `/quotations` | 报价单列表 |
| Module 4 | `/quotations/create` | 创建报价单 |
| Module 4 | `/quotations/[id]` | 报价单详情 |

---

## 8. 检查清单

### 8.1 规划阶段检查

- [x] 业务需求分析完成
- [x] 模块划分合理
- [x] 依赖关系明确
- [x] 数据库Schema设计完成
- [x] API路由设计完成
- [x] 前端页面规划完成
- [x] 实施步骤分解完成
- [x] 验收标准定义完成

### 8.2 实施阶段检查

- [ ] Module 1 实施完成
- [ ] Module 2 实施完成
- [ ] Module 3 实施完成
- [ ] Module 4 实施完成
- [ ] 集成测试通过
- [ ] 性能测试通过
- [ ] 用户验收通过

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI推荐准确度不足 | 用户体验差 | 持续收集反馈，优化Prompt |
| 物料编号规则复杂 | 实施困难 | 先实现基础规则，逐步扩展 |
| 报价计算逻辑复杂 | 开发周期长 | 分阶段实现，先核心后扩展 |
| 数据迁移困难 | 上线延迟 | 提前准备迁移脚本和验证 |

---

## 10. 附录

### 10.1 相关文档

- [Claude Code实施手册](../Claude_Code_Implementation_Manual.md)
- [GRT架构升级计划](../GRT_Architecture_Upgrade_Plan.md)
- [开发工作流指南](../development-workflow-guide.md)

### 10.2 参考资料

- GRT业务流程文档
- 工业清洗设备行业标准
- ERP/MES系统设计参考

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI
