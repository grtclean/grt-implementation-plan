# GRT NocoBase 智能系统开发指南

**版本**: 1.0  
**日期**: 2026年1月16日  
**作者**: Manus AI  
**状态**: 正式发布

---

## 目录

1. [文档概述](#1-文档概述)
2. [系统架构设计](#2-系统架构设计)
3. [数据模型设计](#3-数据模型设计)
4. [简道云数据迁移规划](#4-简道云数据迁移规划)
5. [模块开发指南](#5-模块开发指南)
6. [AI智能化集成](#6-ai智能化集成)
7. [IoT硬件集成](#7-iot硬件集成)
8. [实施阶段规划](#8-实施阶段规划)
9. [Manus + Claude Code协作开发方案](#9-manus--claude-code协作开发方案)
10. [附录](#10-附录)

---

## 1. 文档概述

### 1.1 文档目的

本文档是GRT智能系统快速实施方案的核心开发指南，旨在为开发团队提供完整的技术规范和实施路径。文档整合了以下关键内容：

- 基于简道云现有系统的数据结构分析
- NocoBase低代码平台的开发规范
- AI Agent和IoT硬件的集成方案
- Manus与Claude Code的协作开发流程

### 1.2 适用范围

本指南适用于以下角色：

| 角色 | 使用场景 |
|------|----------|
| 项目经理 | 了解整体架构和实施计划 |
| 后端开发 | 数据模型设计和API开发 |
| 前端开发 | 界面开发和用户体验优化 |
| AI工程师 | Gemini Agent集成开发 |
| 硬件工程师 | UWB/CCD设备集成 |
| 运维工程师 | 部署和监控配置 |

### 1.3 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-01-16 | Manus AI | 初始版本，整合简道云数据结构和开发规范 |

---

## 2. 系统架构设计

### 2.1 整体架构

GRT智能系统采用分层架构设计，确保系统的可扩展性和可维护性。

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户接入层                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Web端  │  │ 移动端  │  │ 大屏端  │  │ API接口 │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        应用服务层                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NocoBase 低代码平台                    │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  CRM    │ │ 项目管理│ │ 成本管理│ │ 人事OA  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        智能服务层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Gemini Agent│  │  UWB定位    │  │  CCD视觉    │            │
│  │  销售助手   │  │  工时采集   │  │  质量检测   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        数据存储层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  PostgreSQL │  │    Redis    │  │  时序数据库  │            │
│  │   主数据库   │  │    缓存     │  │  IoT数据    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 18 + Ant Design | NocoBase默认前端框架 |
| 后端框架 | Node.js + Koa | NocoBase默认后端框架 |
| 数据库 | PostgreSQL 14+ | 主数据存储 |
| 缓存 | Redis 7+ | 会话和热数据缓存 |
| AI服务 | Google Gemini API | 智能销售助手 |
| IoT平台 | MQTT + InfluxDB | 设备数据采集 |
| 部署 | Docker + Kubernetes | 容器化部署 |

### 2.3 系统集成架构

```
                    ┌──────────────────┐
                    │   简道云现有系统   │
                    │  (数据迁移源)     │
                    └────────┬─────────┘
                             │ 数据迁移
                             ▼
┌────────────────────────────────────────────────────────────┐
│                     GRT NocoBase 系统                       │
│                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │   CRM    │◄──►│  项目管理 │◄──►│  成本管理 │            │
│  │  模块    │    │   模块   │    │   模块   │            │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│       │               │               │                   │
│       └───────────────┼───────────────┘                   │
│                       │                                    │
│              ┌────────▼────────┐                          │
│              │    数据中心     │                          │
│              │  (统一数据模型) │                          │
│              └────────┬────────┘                          │
│                       │                                    │
│       ┌───────────────┼───────────────┐                   │
│       │               │               │                   │
│  ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐            │
│  │ Gemini   │    │   UWB    │    │   CCD    │            │
│  │  Agent   │    │  定位    │    │  视觉    │            │
│  └──────────┘    └──────────┘    └──────────┘            │
└────────────────────────────────────────────────────────────┘
```

---

## 3. 数据模型设计

### 3.1 核心实体关系

基于简道云现有系统分析，GRT智能系统的核心数据模型包含以下实体：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │────►│ Opportunity │────►│   Project   │
│   客户      │ 1:N │   商机      │ 1:1 │   项目      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼───────┐          ┌───────▼───────┐
              │  Contract │            │     Task      │          │    Finance    │
              │   合同    │            │     任务      │          │    财务       │
              └───────────┘            └───────────────┘          └───────────────┘
```

### 3.2 客户管理数据模型 (CRM)

#### 3.2.1 客户表 (customers)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| company_name | VARCHAR(200) | 是 | 公司名称 | 客户名称 |
| company_code | VARCHAR(50) | 否 | 客户编码 | 客户编号 |
| industry | VARCHAR(100) | 否 | 所属行业 | 行业分类 |
| region | VARCHAR(100) | 否 | 所属区域 | 区域 |
| customer_type | ENUM | 是 | 客户类型 | 客户类型 |
| customer_level | ENUM | 否 | 客户等级 | 客户等级 |
| source | VARCHAR(100) | 否 | 客户来源 | 来源渠道 |
| owner_id | UUID | 是 | 负责人 | 销售负责人 |
| status | ENUM | 是 | 状态 | 客户状态 |
| created_at | TIMESTAMP | 是 | 创建时间 | 创建时间 |
| updated_at | TIMESTAMP | 是 | 更新时间 | 更新时间 |

**客户类型枚举值**:
- `prospect` - 潜在客户
- `active` - 活跃客户
- `inactive` - 非活跃客户
- `lost` - 流失客户

**客户等级枚举值**:
- `A` - 战略客户
- `B` - 重要客户
- `C` - 普通客户
- `D` - 小型客户

#### 3.2.2 联系人表 (contacts)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| customer_id | UUID | 是 | 关联客户 | 所属客户 |
| name | VARCHAR(100) | 是 | 姓名 | 联系人姓名 |
| title | VARCHAR(100) | 否 | 职位 | 职位 |
| department | VARCHAR(100) | 否 | 部门 | 部门 |
| phone | VARCHAR(50) | 否 | 电话 | 联系电话 |
| mobile | VARCHAR(50) | 否 | 手机 | 手机号码 |
| email | VARCHAR(200) | 否 | 邮箱 | 邮箱 |
| is_primary | BOOLEAN | 是 | 是否主要联系人 | 主要联系人 |
| decision_role | ENUM | 否 | 决策角色 | 决策角色 |

**决策角色枚举值**:
- `decision_maker` - 决策者
- `influencer` - 影响者
- `user` - 使用者
- `gatekeeper` - 把关者

#### 3.2.3 商机表 (opportunities)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| customer_id | UUID | 是 | 关联客户 | 所属客户 |
| name | VARCHAR(200) | 是 | 商机名称 | 商机名称 |
| opportunity_code | VARCHAR(50) | 否 | 商机编号 | 商机编号 |
| stage | ENUM | 是 | 销售阶段 | 商机阶段 |
| amount | DECIMAL(15,2) | 否 | 预估金额 | 预估金额 |
| probability | INTEGER | 否 | 成功概率 | 赢单概率 |
| expected_close_date | DATE | 否 | 预计成交日期 | 预计签约日期 |
| owner_id | UUID | 是 | 负责人 | 销售负责人 |
| source | VARCHAR(100) | 否 | 商机来源 | 来源 |
| product_type | VARCHAR(100) | 否 | 产品类型 | 产品类型 |
| bant_budget | BOOLEAN | 否 | BANT-预算 | - |
| bant_authority | BOOLEAN | 否 | BANT-决策权 | - |
| bant_need | BOOLEAN | 否 | BANT-需求 | - |
| bant_timeline | BOOLEAN | 否 | BANT-时间线 | - |
| bant_score | INTEGER | 否 | BANT评分 | - |
| created_at | TIMESTAMP | 是 | 创建时间 | 创建时间 |

**销售阶段枚举值**:
- `lead` - 线索 (M0)
- `qualification` - 资格确认 (M0)
- `proposal` - 方案阶段 (M1)
- `negotiation` - 商务谈判 (M2)
- `closed_won` - 赢单 (M3)
- `closed_lost` - 输单

### 3.3 项目管理数据模型 (M0-M12)

#### 3.3.1 项目表 (projects)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| project_code | VARCHAR(50) | 是 | 项目编号 | 项目编号 |
| project_name | VARCHAR(200) | 是 | 项目名称 | 项目名称 |
| customer_id | UUID | 是 | 关联客户 | 客户 |
| opportunity_id | UUID | 否 | 关联商机 | 商机 |
| contract_id | UUID | 否 | 关联合同 | 合同 |
| project_type | VARCHAR(100) | 否 | 项目类型 | 项目类型 |
| current_phase | ENUM | 是 | 当前阶段 | 项目阶段 |
| status | ENUM | 是 | 项目状态 | 项目状态 |
| priority | ENUM | 否 | 优先级 | 优先级 |
| project_manager_id | UUID | 是 | 项目经理 | 项目经理 |
| start_date | DATE | 否 | 计划开始日期 | 计划开始 |
| end_date | DATE | 否 | 计划结束日期 | 计划结束 |
| actual_start_date | DATE | 否 | 实际开始日期 | 实际开始 |
| actual_end_date | DATE | 否 | 实际结束日期 | 实际结束 |
| budget | DECIMAL(15,2) | 否 | 项目预算 | 预算金额 |
| contract_amount | DECIMAL(15,2) | 否 | 合同金额 | 合同金额 |
| progress | INTEGER | 否 | 完成进度 | 完成度 |

**项目阶段枚举值** (对应M0-M12):
- `M0` - 市场触达与线索
- `M1` - 机会评估与售前方案
- `M2` - 内部/客户评审
- `M3` - 合同签订与项目启动
- `M4` - 详细设计
- `M5` - 采购与外协
- `M6` - 制造与装配
- `M7` - 场内联调与预验收
- `M8` - 拆机与发运
- `M9` - 现场安装与调试
- `M10` - 验收与交付
- `M11` - 售后服务与备件
- `M12` - 项目收尾与复盘

**项目状态枚举值**:
- `not_started` - 未开始
- `in_progress` - 进行中
- `on_hold` - 暂停
- `completed` - 已完成
- `cancelled` - 已取消

#### 3.3.2 项目任务表 (project_tasks)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| project_id | UUID | 是 | 关联项目 | 所属项目 |
| parent_task_id | UUID | 否 | 父任务 | 父任务 |
| task_code | VARCHAR(50) | 否 | 任务编号 | WBS编号 |
| task_name | VARCHAR(200) | 是 | 任务名称 | 任务名称 |
| phase | ENUM | 是 | 所属阶段 | 阶段 |
| task_type | ENUM | 否 | 任务类型 | 任务类型 |
| assignee_id | UUID | 否 | 负责人 | 负责人 |
| status | ENUM | 是 | 状态 | 状态 |
| priority | ENUM | 否 | 优先级 | 优先级 |
| planned_start | DATE | 否 | 计划开始 | 计划开始 |
| planned_end | DATE | 否 | 计划结束 | 计划结束 |
| actual_start | DATE | 否 | 实际开始 | 实际开始 |
| actual_end | DATE | 否 | 实际结束 | 实际结束 |
| planned_hours | DECIMAL(10,2) | 否 | 计划工时 | 计划工时 |
| actual_hours | DECIMAL(10,2) | 否 | 实际工时 | 实际工时 |
| progress | INTEGER | 否 | 完成进度 | 完成度 |

**任务类型枚举值**:
- `milestone` - 里程碑
- `task` - 普通任务
- `subtask` - 子任务

### 3.4 财务管理数据模型

#### 3.4.1 合同表 (contracts)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| contract_code | VARCHAR(50) | 是 | 合同编号 | 合同编号 |
| contract_name | VARCHAR(200) | 是 | 合同名称 | 合同名称 |
| customer_id | UUID | 是 | 关联客户 | 客户 |
| project_id | UUID | 否 | 关联项目 | 项目 |
| contract_type | ENUM | 是 | 合同类型 | 合同类型 |
| amount | DECIMAL(15,2) | 是 | 合同金额 | 合同金额 |
| currency | VARCHAR(10) | 是 | 币种 | 币种 |
| sign_date | DATE | 否 | 签订日期 | 签订日期 |
| effective_date | DATE | 否 | 生效日期 | 生效日期 |
| expiry_date | DATE | 否 | 到期日期 | 到期日期 |
| status | ENUM | 是 | 状态 | 状态 |
| payment_terms | TEXT | 否 | 付款条款 | 付款条款 |

#### 3.4.2 回款计划表 (payment_plans)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| contract_id | UUID | 是 | 关联合同 | 合同 |
| project_id | UUID | 是 | 关联项目 | 项目 |
| plan_name | VARCHAR(200) | 是 | 计划名称 | 回款节点 |
| planned_amount | DECIMAL(15,2) | 是 | 计划金额 | 计划金额 |
| planned_date | DATE | 是 | 计划日期 | 计划日期 |
| milestone | VARCHAR(100) | 否 | 关联里程碑 | 里程碑 |
| status | ENUM | 是 | 状态 | 状态 |

#### 3.4.3 回款记录表 (payments)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| payment_plan_id | UUID | 否 | 关联计划 | 回款计划 |
| contract_id | UUID | 是 | 关联合同 | 合同 |
| project_id | UUID | 是 | 关联项目 | 项目 |
| amount | DECIMAL(15,2) | 是 | 回款金额 | 回款金额 |
| payment_date | DATE | 是 | 回款日期 | 回款日期 |
| payment_method | VARCHAR(50) | 否 | 付款方式 | 付款方式 |
| invoice_id | UUID | 否 | 关联发票 | 发票 |
| status | ENUM | 是 | 状态 | 状态 |

### 3.5 采购管理数据模型

#### 3.5.1 采购订单表 (purchase_orders)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| po_code | VARCHAR(50) | 是 | 采购单号 | 采购单号 |
| project_id | UUID | 否 | 关联项目 | 项目 |
| supplier_id | UUID | 是 | 供应商 | 供应商 |
| order_date | DATE | 是 | 下单日期 | 下单日期 |
| expected_date | DATE | 否 | 预计到货 | 预计到货 |
| total_amount | DECIMAL(15,2) | 是 | 总金额 | 总金额 |
| status | ENUM | 是 | 状态 | 状态 |
| buyer_id | UUID | 是 | 采购员 | 采购员 |

#### 3.5.2 供应商表 (suppliers)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| supplier_code | VARCHAR(50) | 是 | 供应商编码 | 供应商编号 |
| supplier_name | VARCHAR(200) | 是 | 供应商名称 | 供应商名称 |
| category | VARCHAR(100) | 否 | 供应商类别 | 类别 |
| contact_name | VARCHAR(100) | 否 | 联系人 | 联系人 |
| contact_phone | VARCHAR(50) | 否 | 联系电话 | 电话 |
| address | TEXT | 否 | 地址 | 地址 |
| status | ENUM | 是 | 状态 | 状态 |
| rating | INTEGER | 否 | 评级 | 评级 |

### 3.6 人事管理数据模型

#### 3.6.1 员工表 (employees)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| employee_code | VARCHAR(50) | 是 | 工号 | 工号 |
| name | VARCHAR(100) | 是 | 姓名 | 姓名 |
| department_id | UUID | 是 | 部门 | 部门 |
| position | VARCHAR(100) | 否 | 职位 | 职位 |
| entry_date | DATE | 否 | 入职日期 | 入职日期 |
| status | ENUM | 是 | 状态 | 在职状态 |
| phone | VARCHAR(50) | 否 | 电话 | 电话 |
| email | VARCHAR(200) | 否 | 邮箱 | 邮箱 |
| manager_id | UUID | 否 | 直属上级 | 直属上级 |

#### 3.6.2 工时记录表 (timesheets)

| 字段名 | 类型 | 必填 | 说明 | 简道云映射 |
|--------|------|------|------|------------|
| id | UUID | 是 | 主键 | 系统生成 |
| employee_id | UUID | 是 | 员工 | 员工 |
| project_id | UUID | 否 | 项目 | 项目 |
| task_id | UUID | 否 | 任务 | 任务 |
| work_date | DATE | 是 | 工作日期 | 日期 |
| hours | DECIMAL(5,2) | 是 | 工时 | 工时 |
| work_type | ENUM | 是 | 工作类型 | 类型 |
| location | VARCHAR(100) | 否 | 工作地点 | 地点 |
| source | ENUM | 是 | 数据来源 | - |
| uwb_device_id | VARCHAR(100) | 否 | UWB设备ID | - |

**工作类型枚举值**:
- `design` - 设计
- `manufacturing` - 制造
- `assembly` - 装配
- `testing` - 测试
- `installation` - 安装
- `commissioning` - 调试
- `meeting` - 会议
- `travel` - 出差
- `other` - 其他

**数据来源枚举值**:
- `manual` - 手工录入
- `uwb` - UWB自动采集
- `mobile` - 移动端打卡

---

## 4. 简道云数据迁移规划

### 4.1 迁移范围

基于简道云现有系统分析，需要迁移的数据包括：

| 模块 | 表单数量 | 预估记录数 | 优先级 |
|------|----------|------------|--------|
| 客户管理 (M0) | 8 | 500+ | 高 |
| 商机管理 (M0) | 4 | 200+ | 高 |
| 合同管理 (M3) | 3 | 100+ | 高 |
| 采购管理 (M5) | 5 | 1000+ | 中 |
| 员工档案 | 5 | 100+ | 中 |
| 项目数据 | 10+ | 50+ | 高 |

### 4.2 字段映射规则

#### 4.2.1 客户管理字段映射

| 简道云字段 | NocoBase字段 | 映射类型 | 转换规则 |
|------------|--------------|----------|----------|
| 客户名称 | company_name | 直接映射 | - |
| 客户编号 | company_code | 直接映射 | - |
| 行业分类 | industry | 直接映射 | - |
| 区域 | region | 直接映射 | - |
| 客户类型 | customer_type | 需转换 | 枚举值映射 |
| 客户等级 | customer_level | 需转换 | A/B/C/D映射 |
| 销售负责人 | owner_id | 需查找 | 员工ID关联 |
| 客户状态 | status | 需转换 | 枚举值映射 |
| 创建时间 | created_at | 直接映射 | 时间格式转换 |

#### 4.2.2 商机管理字段映射

| 简道云字段 | NocoBase字段 | 映射类型 | 转换规则 |
|------------|--------------|----------|----------|
| 商机名称 | name | 直接映射 | - |
| 商机编号 | opportunity_code | 直接映射 | - |
| 所属客户 | customer_id | 需查找 | 客户ID关联 |
| 商机阶段 | stage | 需转换 | 阶段枚举映射 |
| 预估金额 | amount | 直接映射 | 数值格式化 |
| 赢单概率 | probability | 直接映射 | 百分比转整数 |
| 预计签约日期 | expected_close_date | 直接映射 | 日期格式转换 |
| 销售负责人 | owner_id | 需查找 | 员工ID关联 |

### 4.3 迁移步骤

#### 步骤1: 数据清洗 (Week 1)

1. **重复数据处理**
   - 客户名称去重
   - 联系人去重
   - 商机去重

2. **格式标准化**
   - 电话号码格式统一
   - 日期格式统一
   - 金额单位统一

3. **缺失数据补充**
   - 必填字段检查
   - 默认值填充
   - 关联关系修复

#### 步骤2: 主数据迁移 (Week 2)

迁移顺序：
1. 部门数据
2. 员工数据
3. 客户数据
4. 供应商数据

#### 步骤3: 业务数据迁移 (Week 3-4)

迁移顺序：
1. 联系人数据
2. 商机数据
3. 合同数据
4. 项目数据
5. 采购数据
6. 财务数据

#### 步骤4: 数据验证 (Week 5)

验证项目：
- 记录数量对比
- 关键字段值对比
- 关联关系验证
- 计算字段验证

### 4.4 迁移脚本示例

#### 客户数据迁移脚本

```sql
-- 客户数据迁移脚本
-- 从简道云导出CSV导入NocoBase

-- 1. 创建临时表
CREATE TEMP TABLE temp_customers (
    jdy_id VARCHAR(50),
    company_name VARCHAR(200),
    company_code VARCHAR(50),
    industry VARCHAR(100),
    region VARCHAR(100),
    customer_type_jdy VARCHAR(50),
    customer_level_jdy VARCHAR(10),
    owner_name VARCHAR(100),
    status_jdy VARCHAR(50),
    created_at_jdy VARCHAR(50)
);

-- 2. 导入CSV数据
COPY temp_customers FROM '/data/jdy_customers.csv' 
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- 3. 转换并插入正式表
INSERT INTO customers (
    id,
    company_name,
    company_code,
    industry,
    region,
    customer_type,
    customer_level,
    owner_id,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    tc.company_name,
    tc.company_code,
    tc.industry,
    tc.region,
    CASE tc.customer_type_jdy
        WHEN '潜在客户' THEN 'prospect'
        WHEN '活跃客户' THEN 'active'
        WHEN '非活跃客户' THEN 'inactive'
        WHEN '流失客户' THEN 'lost'
        ELSE 'prospect'
    END,
    CASE tc.customer_level_jdy
        WHEN 'A级' THEN 'A'
        WHEN 'B级' THEN 'B'
        WHEN 'C级' THEN 'C'
        WHEN 'D级' THEN 'D'
        ELSE 'C'
    END,
    e.id,
    CASE tc.status_jdy
        WHEN '正常' THEN 'active'
        WHEN '停用' THEN 'inactive'
        ELSE 'active'
    END,
    TO_TIMESTAMP(tc.created_at_jdy, 'YYYY-MM-DD HH24:MI:SS'),
    NOW()
FROM temp_customers tc
LEFT JOIN employees e ON e.name = tc.owner_name;

-- 4. 清理临时表
DROP TABLE temp_customers;
```

#### 商机数据迁移脚本

```sql
-- 商机数据迁移脚本

-- 1. 创建临时表
CREATE TEMP TABLE temp_opportunities (
    jdy_id VARCHAR(50),
    name VARCHAR(200),
    opportunity_code VARCHAR(50),
    customer_name VARCHAR(200),
    stage_jdy VARCHAR(50),
    amount DECIMAL(15,2),
    probability INTEGER,
    expected_close_date VARCHAR(20),
    owner_name VARCHAR(100),
    source VARCHAR(100),
    product_type VARCHAR(100),
    created_at_jdy VARCHAR(50)
);

-- 2. 导入CSV数据
COPY temp_opportunities FROM '/data/jdy_opportunities.csv' 
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- 3. 转换并插入正式表
INSERT INTO opportunities (
    id,
    customer_id,
    name,
    opportunity_code,
    stage,
    amount,
    probability,
    expected_close_date,
    owner_id,
    source,
    product_type,
    created_at
)
SELECT 
    gen_random_uuid(),
    c.id,
    t.name,
    t.opportunity_code,
    CASE t.stage_jdy
        WHEN '线索' THEN 'lead'
        WHEN '资格确认' THEN 'qualification'
        WHEN '方案阶段' THEN 'proposal'
        WHEN '商务谈判' THEN 'negotiation'
        WHEN '赢单' THEN 'closed_won'
        WHEN '输单' THEN 'closed_lost'
        ELSE 'lead'
    END,
    t.amount,
    t.probability,
    TO_DATE(t.expected_close_date, 'YYYY-MM-DD'),
    e.id,
    t.source,
    t.product_type,
    TO_TIMESTAMP(t.created_at_jdy, 'YYYY-MM-DD HH24:MI:SS')
FROM temp_opportunities t
LEFT JOIN customers c ON c.company_name = t.customer_name
LEFT JOIN employees e ON e.name = t.owner_name;

-- 4. 清理临时表
DROP TABLE temp_opportunities;
```

---

## 5. 模块开发指南

### 5.1 CRM模块开发

#### 5.1.1 功能清单

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 客户管理 | P0 | 客户主数据CRUD |
| 联系人管理 | P0 | 联系人CRUD |
| 商机管理 | P0 | 商机全生命周期管理 |
| BANT评分 | P1 | 商机质量评估 |
| 销售漏斗 | P1 | 销售阶段可视化 |
| 跟进记录 | P1 | 客户互动记录 |
| 销售预测 | P2 | 基于AI的销售预测 |

#### 5.1.2 NocoBase Collection配置

```json
{
  "name": "customers",
  "title": "客户管理",
  "fields": [
    {
      "name": "company_name",
      "type": "string",
      "interface": "input",
      "uiSchema": {
        "title": "公司名称",
        "required": true
      }
    },
    {
      "name": "customer_type",
      "type": "string",
      "interface": "select",
      "uiSchema": {
        "title": "客户类型",
        "enum": [
          { "value": "prospect", "label": "潜在客户" },
          { "value": "active", "label": "活跃客户" },
          { "value": "inactive", "label": "非活跃客户" },
          { "value": "lost", "label": "流失客户" }
        ]
      }
    },
    {
      "name": "customer_level",
      "type": "string",
      "interface": "radioGroup",
      "uiSchema": {
        "title": "客户等级",
        "enum": [
          { "value": "A", "label": "A级-战略客户" },
          { "value": "B", "label": "B级-重要客户" },
          { "value": "C", "label": "C级-普通客户" },
          { "value": "D", "label": "D级-小型客户" }
        ]
      }
    },
    {
      "name": "owner",
      "type": "belongsTo",
      "target": "users",
      "foreignKey": "owner_id",
      "uiSchema": {
        "title": "销售负责人"
      }
    },
    {
      "name": "contacts",
      "type": "hasMany",
      "target": "contacts",
      "foreignKey": "customer_id",
      "uiSchema": {
        "title": "联系人"
      }
    },
    {
      "name": "opportunities",
      "type": "hasMany",
      "target": "opportunities",
      "foreignKey": "customer_id",
      "uiSchema": {
        "title": "商机"
      }
    }
  ]
}
```

#### 5.1.3 BANT评分算法

```typescript
// BANT评分计算逻辑
interface BANTScore {
  budget: boolean;      // 是否有预算
  authority: boolean;   // 是否有决策权
  need: boolean;        // 是否有明确需求
  timeline: boolean;    // 是否有时间线
}

function calculateBANTScore(bant: BANTScore): number {
  let score = 0;
  
  // 预算权重: 30分
  if (bant.budget) score += 30;
  
  // 决策权权重: 25分
  if (bant.authority) score += 25;
  
  // 需求权重: 25分
  if (bant.need) score += 25;
  
  // 时间线权重: 20分
  if (bant.timeline) score += 20;
  
  return score;
}

function getBANTLevel(score: number): string {
  if (score >= 80) return 'A'; // 高质量商机
  if (score >= 60) return 'B'; // 中等质量
  if (score >= 40) return 'C'; // 需培育
  return 'D'; // 低质量
}
```

### 5.2 项目管理模块开发

#### 5.2.1 M0-M12阶段门禁配置

```typescript
// 阶段门禁规则配置
const phaseGates = {
  M0: {
    name: '市场触达与线索',
    entryConditions: [],
    exitConditions: [
      { field: 'customer_id', required: true, message: '必须关联客户' },
      { field: 'opportunity_id', required: true, message: '必须创建商机' }
    ]
  },
  M1: {
    name: '机会评估与售前方案',
    entryConditions: [
      { previousPhase: 'M0', completed: true }
    ],
    exitConditions: [
      { field: 'proposal_approved', required: true, message: '方案必须通过评审' },
      { field: 'quotation_submitted', required: true, message: '必须提交报价' }
    ]
  },
  M2: {
    name: '内部/客户评审',
    entryConditions: [
      { previousPhase: 'M1', completed: true }
    ],
    exitConditions: [
      { field: 'internal_review_passed', required: true, message: '内部评审必须通过' },
      { field: 'customer_review_passed', required: true, message: '客户评审必须通过' }
    ]
  },
  M3: {
    name: '合同签订与项目启动',
    entryConditions: [
      { previousPhase: 'M2', completed: true }
    ],
    exitConditions: [
      { field: 'contract_signed', required: true, message: '合同必须签订' },
      { field: 'kickoff_completed', required: true, message: '必须完成项目启动会' }
    ]
  },
  // ... M4-M12 配置
};
```

#### 5.2.2 甘特图配置

```typescript
// 甘特图数据结构
interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  type: 'project' | 'milestone' | 'task';
  phase: string;
  assignee: string;
}

// 甘特图查询
const getProjectGanttData = async (projectId: string): Promise<GanttTask[]> => {
  const tasks = await db.collection('project_tasks')
    .find({
      project_id: projectId
    })
    .sort({ planned_start: 1 })
    .toArray();
  
  return tasks.map(task => ({
    id: task.id,
    name: task.task_name,
    start: task.planned_start,
    end: task.planned_end,
    progress: task.progress || 0,
    dependencies: task.dependencies || [],
    type: task.task_type,
    phase: task.phase,
    assignee: task.assignee_name
  }));
};
```

### 5.3 成本管理模块开发

#### 5.3.1 项目成本核算模型

```typescript
// 项目成本结构
interface ProjectCost {
  projectId: string;
  
  // 直接成本
  directCosts: {
    material: number;      // 材料成本
    labor: number;         // 人工成本
    outsourcing: number;   // 外协成本
    equipment: number;     // 设备成本
  };
  
  // 间接成本
  indirectCosts: {
    overhead: number;      // 管理费用
    travel: number;        // 差旅费用
    other: number;         // 其他费用
  };
  
  // 汇总
  totalCost: number;
  budgetVariance: number;  // 预算偏差
  costPerformanceIndex: number; // 成本绩效指数
}

// 成本核算函数
async function calculateProjectCost(projectId: string): Promise<ProjectCost> {
  // 获取材料成本
  const materialCost = await db.collection('purchase_orders')
    .aggregate([
      { $match: { project_id: projectId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
  
  // 获取人工成本
  const laborCost = await db.collection('timesheets')
    .aggregate([
      { $match: { project_id: projectId } },
      { $lookup: {
          from: 'employees',
          localField: 'employee_id',
          foreignField: 'id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      { $group: {
          _id: null,
          total: { $sum: { $multiply: ['$hours', '$employee.hourly_rate'] } }
        }
      }
    ]);
  
  // ... 其他成本计算
  
  return {
    projectId,
    directCosts: {
      material: materialCost[0]?.total || 0,
      labor: laborCost[0]?.total || 0,
      outsourcing: 0,
      equipment: 0
    },
    indirectCosts: {
      overhead: 0,
      travel: 0,
      other: 0
    },
    totalCost: 0,
    budgetVariance: 0,
    costPerformanceIndex: 1.0
  };
}
```

---

## 6. AI智能化集成

### 6.1 Gemini Agent架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Gemini Agent 架构                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Agent 控制器                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ 意图识别 │  │ 对话管理 │  │ 响应生成 │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   工具调用层                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ CRM查询 │  │ 项目查询 │  │ 报表生成 │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   知识库层                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ 产品知识 │  │ 销售话术 │  │ 行业知识 │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 智能销售助手功能

#### 6.2.1 Function Calling定义

```typescript
// Gemini Function Calling 定义
const salesAssistantTools = [
  {
    name: 'search_customers',
    description: '搜索客户信息',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '搜索关键词（客户名称、行业、区域等）'
        },
        customer_type: {
          type: 'string',
          enum: ['prospect', 'active', 'inactive', 'lost'],
          description: '客户类型筛选'
        },
        limit: {
          type: 'integer',
          description: '返回结果数量限制',
          default: 10
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'get_opportunity_details',
    description: '获取商机详细信息',
    parameters: {
      type: 'object',
      properties: {
        opportunity_id: {
          type: 'string',
          description: '商机ID'
        }
      },
      required: ['opportunity_id']
    }
  },
  {
    name: 'update_opportunity_stage',
    description: '更新商机阶段',
    parameters: {
      type: 'object',
      properties: {
        opportunity_id: {
          type: 'string',
          description: '商机ID'
        },
        new_stage: {
          type: 'string',
          enum: ['lead', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
          description: '新阶段'
        },
        notes: {
          type: 'string',
          description: '阶段变更说明'
        }
      },
      required: ['opportunity_id', 'new_stage']
    }
  },
  {
    name: 'generate_sales_report',
    description: '生成销售报表',
    parameters: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: ['pipeline', 'forecast', 'performance', 'activity'],
          description: '报表类型'
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          }
        },
        group_by: {
          type: 'string',
          enum: ['salesperson', 'region', 'product', 'stage'],
          description: '分组维度'
        }
      },
      required: ['report_type']
    }
  },
  {
    name: 'suggest_next_action',
    description: '基于商机状态建议下一步行动',
    parameters: {
      type: 'object',
      properties: {
        opportunity_id: {
          type: 'string',
          description: '商机ID'
        }
      },
      required: ['opportunity_id']
    }
  }
];
```

#### 6.2.2 Agent实现代码

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class SalesAssistantAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
      tools: salesAssistantTools
    });
  }
  
  async chat(userMessage: string, context: any = {}): Promise<string> {
    const systemPrompt = `你是GRT公司的智能销售助手。你可以帮助销售人员：
    1. 查询客户和商机信息
    2. 更新销售阶段
    3. 生成销售报表
    4. 提供销售建议
    
    当前用户: ${context.userName}
    当前时间: ${new Date().toISOString()}
    `;
    
    const chat = this.model.startChat({
      history: context.history || [],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });
    
    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    
    // 处理Function Calling
    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        const functionResult = await this.executeFunction(call.name, call.args);
        // 将函数结果发送回模型
        const followUp = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: functionResult
          }
        }]);
        return followUp.response.text();
      }
    }
    
    return response.text();
  }
  
  private async executeFunction(name: string, args: any): Promise<any> {
    switch (name) {
      case 'search_customers':
        return await this.searchCustomers(args);
      case 'get_opportunity_details':
        return await this.getOpportunityDetails(args);
      case 'update_opportunity_stage':
        return await this.updateOpportunityStage(args);
      case 'generate_sales_report':
        return await this.generateSalesReport(args);
      case 'suggest_next_action':
        return await this.suggestNextAction(args);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
  
  private async searchCustomers(args: any): Promise<any> {
    // 调用NocoBase API查询客户
    const response = await fetch('/api/customers:list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          $or: [
            { company_name: { $includes: args.keyword } },
            { industry: { $includes: args.keyword } },
            { region: { $includes: args.keyword } }
          ],
          ...(args.customer_type && { customer_type: args.customer_type })
        },
        pageSize: args.limit || 10
      })
    });
    return await response.json();
  }
  
  private async suggestNextAction(args: any): Promise<any> {
    const opportunity = await this.getOpportunityDetails(args);
    
    const suggestions = {
      lead: [
        '安排初次电话沟通，了解客户需求',
        '发送公司介绍和产品资料',
        '完成BANT评估'
      ],
      qualification: [
        '安排现场拜访，深入了解客户痛点',
        '准备初步技术方案',
        '确认决策链和时间线'
      ],
      proposal: [
        '提交正式技术方案',
        '安排技术交流会',
        '准备商务报价'
      ],
      negotiation: [
        '跟进报价反馈',
        '准备合同条款',
        '协调内部资源确认交期'
      ]
    };
    
    return {
      opportunity: opportunity,
      suggestions: suggestions[opportunity.stage] || [],
      nextFollowUpDate: this.calculateNextFollowUp(opportunity)
    };
  }
  
  private calculateNextFollowUp(opportunity: any): string {
    // 根据商机阶段计算建议跟进日期
    const daysMap = {
      lead: 3,
      qualification: 5,
      proposal: 7,
      negotiation: 2
    };
    const days = daysMap[opportunity.stage] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate.toISOString().split('T')[0];
  }
}
```

### 6.3 AI辅助功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 智能客户画像 | 基于历史数据生成客户画像 | Gemini + 数据分析 |
| 销售话术推荐 | 根据场景推荐销售话术 | RAG + 知识库 |
| 商机预测 | 预测商机成交概率 | 机器学习模型 |
| 自动跟进提醒 | 智能计算跟进时间 | 规则引擎 + AI |
| 会议纪要生成 | 自动生成会议纪要 | Gemini + 语音转文字 |
| 报价单生成 | 智能生成报价单 | 模板 + AI填充 |

---

## 7. IoT硬件集成

### 7.1 UWB定位系统

#### 7.1.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    UWB定位系统架构                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   定位引擎                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ TDOA算法│  │ 位置解算│  │ 轨迹平滑│            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   数据采集层                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ 基站1   │  │ 基站2   │  │ 基站N   │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   标签层                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │ 员工标签│  │ 设备标签│  │ 物料标签│            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 7.1.2 工时自动采集逻辑

```typescript
// UWB工时采集服务
interface UWBLocation {
  tagId: string;
  x: number;
  y: number;
  z: number;
  timestamp: Date;
  accuracy: number;
}

interface WorkZone {
  id: string;
  name: string;
  projectId: string;
  taskType: string;
  polygon: { x: number; y: number }[];
}

class UWBTimesheetService {
  private workZones: WorkZone[] = [];
  private activeWorkers: Map<string, { zone: WorkZone; enterTime: Date }> = new Map();
  
  async processLocation(location: UWBLocation): Promise<void> {
    const employee = await this.getEmployeeByTag(location.tagId);
    if (!employee) return;
    
    const currentZone = this.findZone(location.x, location.y);
    const activeRecord = this.activeWorkers.get(location.tagId);
    
    if (currentZone && !activeRecord) {
      // 进入工作区域
      this.activeWorkers.set(location.tagId, {
        zone: currentZone,
        enterTime: location.timestamp
      });
    } else if (!currentZone && activeRecord) {
      // 离开工作区域，记录工时
      const hours = this.calculateHours(activeRecord.enterTime, location.timestamp);
      await this.createTimesheet({
        employeeId: employee.id,
        projectId: activeRecord.zone.projectId,
        workDate: activeRecord.enterTime,
        hours: hours,
        workType: activeRecord.zone.taskType,
        source: 'uwb',
        uwbDeviceId: location.tagId
      });
      this.activeWorkers.delete(location.tagId);
    } else if (currentZone && activeRecord && currentZone.id !== activeRecord.zone.id) {
      // 切换工作区域
      const hours = this.calculateHours(activeRecord.enterTime, location.timestamp);
      await this.createTimesheet({
        employeeId: employee.id,
        projectId: activeRecord.zone.projectId,
        workDate: activeRecord.enterTime,
        hours: hours,
        workType: activeRecord.zone.taskType,
        source: 'uwb',
        uwbDeviceId: location.tagId
      });
      this.activeWorkers.set(location.tagId, {
        zone: currentZone,
        enterTime: location.timestamp
      });
    }
  }
  
  private findZone(x: number, y: number): WorkZone | null {
    for (const zone of this.workZones) {
      if (this.isPointInPolygon({ x, y }, zone.polygon)) {
        return zone;
      }
    }
    return null;
  }
  
  private isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
  
  private calculateHours(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / (1000 * 60 * 60) * 100) / 100;
  }
}
```

### 7.2 CCD视觉检测系统

#### 7.2.1 检测流程

```
┌─────────────────────────────────────────────────────────────┐
│                    CCD视觉检测流程                           │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  │ 图像采集 │───►│ 预处理  │───►│ 特征提取│───►│ 缺陷识别│ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
│                                                     │       │
│                                                     ▼       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  │ 报表生成│◄───│ 数据存储│◄───│ 结果判定│◄───│ 分类标注│ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 7.2.2 检测结果数据模型

```typescript
// CCD检测结果表
interface InspectionResult {
  id: string;
  projectId: string;
  taskId: string;
  inspectionType: 'surface' | 'dimension' | 'assembly';
  partNumber: string;
  partName: string;
  inspectionTime: Date;
  result: 'pass' | 'fail' | 'warning';
  defects: Defect[];
  imageUrl: string;
  operatorId: string;
  stationId: string;
}

interface Defect {
  type: string;
  severity: 'critical' | 'major' | 'minor';
  location: { x: number; y: number; width: number; height: number };
  confidence: number;
  description: string;
}

// 检测统计
interface InspectionStats {
  totalInspections: number;
  passRate: number;
  defectsByType: { type: string; count: number }[];
  defectsBySeverity: { severity: string; count: number }[];
  trendData: { date: string; passRate: number }[];
}
```

---

## 8. 实施阶段规划

### 8.1 总体时间线

```
Phase 1 (Week 1-4)     Phase 2 (Week 5-8)     Phase 3 (Week 9-12)    Phase 4 (Week 13-16)
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   基础架构搭建   │───►│   核心模块开发   │───►│   智能化集成    │───►│   上线与优化    │
│                 │    │                 │    │                 │    │                 │
│ • 环境部署      │    │ • CRM模块       │    │ • Gemini Agent  │    │ • 用户培训      │
│ • 数据迁移      │    │ • 项目管理      │    │ • UWB集成       │    │ • 性能优化      │
│ • 权限配置      │    │ • 成本管理      │    │ • CCD集成       │    │ • 持续迭代      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 8.2 详细里程碑

| 阶段 | 里程碑 | 交付物 | 时间 |
|------|--------|--------|------|
| Phase 1 | M1.1 环境就绪 | NocoBase部署完成 | Week 1 |
| Phase 1 | M1.2 数据迁移完成 | 主数据迁移验证报告 | Week 3 |
| Phase 1 | M1.3 基础配置完成 | 权限和工作流配置 | Week 4 |
| Phase 2 | M2.1 CRM上线 | CRM模块可用 | Week 6 |
| Phase 2 | M2.2 项目管理上线 | 项目管理模块可用 | Week 7 |
| Phase 2 | M2.3 成本管理上线 | 成本管理模块可用 | Week 8 |
| Phase 3 | M3.1 AI助手上线 | Gemini Agent可用 | Week 10 |
| Phase 3 | M3.2 UWB集成完成 | 工时自动采集可用 | Week 11 |
| Phase 3 | M3.3 CCD集成完成 | 质量检测可用 | Week 12 |
| Phase 4 | M4.1 全面上线 | 系统正式运行 | Week 14 |
| Phase 4 | M4.2 优化完成 | 性能优化报告 | Week 16 |

### 8.3 风险管理

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 数据迁移延期 | 中 | 高 | 提前进行数据清洗，准备回滚方案 |
| 用户接受度低 | 中 | 中 | 加强培训，收集反馈快速迭代 |
| 硬件集成困难 | 低 | 高 | 预留缓冲时间，准备备选方案 |
| AI效果不达预期 | 中 | 中 | 持续优化提示词，收集反馈数据 |

---

## 9. Manus + Claude Code协作开发方案

### 9.1 协作模式

```
┌─────────────────────────────────────────────────────────────┐
│                 Manus + Claude Code 协作流程                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Manus AI                          │   │
│  │  • 需求分析与规划                                    │   │
│  │  • 架构设计与文档                                    │   │
│  │  • 代码审查与优化建议                                │   │
│  │  • 测试用例设计                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Claude Code                        │   │
│  │  • 代码实现                                          │   │
│  │  • 单元测试编写                                      │   │
│  │  • Bug修复                                           │   │
│  │  • 重构优化                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   版本控制                           │   │
│  │  • Git分支管理                                       │   │
│  │  • Code Review                                       │   │
│  │  • CI/CD流水线                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 任务分工

| 任务类型 | Manus AI | Claude Code |
|----------|----------|-------------|
| 需求分析 | ✅ 主导 | 辅助 |
| 架构设计 | ✅ 主导 | 辅助 |
| 数据模型设计 | ✅ 主导 | 实现 |
| API设计 | ✅ 主导 | 实现 |
| 前端开发 | 审查 | ✅ 主导 |
| 后端开发 | 审查 | ✅ 主导 |
| 单元测试 | 设计 | ✅ 主导 |
| 集成测试 | ✅ 主导 | 辅助 |
| 文档编写 | ✅ 主导 | 辅助 |
| 代码审查 | ✅ 主导 | 辅助 |

### 9.3 开发规范

#### 9.3.1 代码规范

```typescript
// 命名规范
// - 文件名: kebab-case (customer-service.ts)
// - 类名: PascalCase (CustomerService)
// - 函数名: camelCase (getCustomerById)
// - 常量: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
// - 接口: I前缀 (ICustomer) 或直接 PascalCase (Customer)

// 注释规范
/**
 * 获取客户详情
 * @param customerId 客户ID
 * @returns 客户详细信息
 * @throws CustomerNotFoundError 当客户不存在时抛出
 */
async function getCustomerById(customerId: string): Promise<Customer> {
  // 实现代码
}

// 错误处理规范
class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

// 日志规范
logger.info('Customer created', { customerId, customerName });
logger.error('Failed to create customer', { error, input });
```

#### 9.3.2 Git工作流

```bash
# 分支命名规范
# - feature/xxx: 新功能
# - bugfix/xxx: Bug修复
# - hotfix/xxx: 紧急修复
# - release/x.x.x: 发布分支

# 提交信息规范
# <type>(<scope>): <subject>
# 
# type: feat, fix, docs, style, refactor, test, chore
# scope: crm, project, cost, ai, iot
# subject: 简短描述

# 示例
git commit -m "feat(crm): add BANT scoring for opportunities"
git commit -m "fix(project): correct phase gate validation logic"
git commit -m "docs(api): update customer API documentation"
```

### 9.4 版本迭代计划

| 版本 | 目标 | 主要功能 | 预计时间 |
|------|------|----------|----------|
| v1.0 | MVP | CRM + 项目管理基础功能 | Week 8 |
| v1.1 | 增强 | 成本管理 + 报表 | Week 10 |
| v1.2 | 智能化 | Gemini Agent | Week 12 |
| v1.3 | IoT | UWB + CCD集成 | Week 14 |
| v2.0 | 优化 | 性能优化 + 用户体验 | Week 16 |

---

## 10. 附录

### 10.1 简道云表单字段完整映射表

详见 `/docs/field_mapping_complete.xlsx`

### 10.2 NocoBase插件开发指南

详见 `/docs/nocobase_plugin_guide.md`

### 10.3 API接口文档

详见 `/docs/api_reference.md`

### 10.4 部署运维手册

详见 `/docs/deployment_guide.md`

### 10.5 用户操作手册

详见 `/docs/user_manual.md`

---

## 参考资料

1. [NocoBase官方文档](https://docs.nocobase.com/)
2. [Google Gemini API文档](https://ai.google.dev/docs)
3. [简道云API文档](https://hc.jiandaoyun.com/doc/api)
4. [PostgreSQL官方文档](https://www.postgresql.org/docs/)

---

**文档结束**

*本文档由Manus AI生成，版权归GRT公司所有。*
