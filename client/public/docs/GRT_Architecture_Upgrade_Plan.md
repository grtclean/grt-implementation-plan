# GRT智能系统架构升级规划

**版本**: 2.0  
**日期**: 2026年1月16日  
**作者**: Manus AI  
**状态**: 规划中

---

## 执行摘要

本文档规划了GRT智能系统从当前实施方案网站（localhost:3000）向完整业务系统的架构升级路径。核心目标是将简道云现有的47个应用、120+表单的数据结构科学化地迁移到新系统，同时建立便于Claude Code实施的开发规范和版本迭代流程。

---

## 1. 现状分析

### 1.1 当前系统架构

当前GRT智能系统实施方案网站基于以下技术栈构建：

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 19 + Tailwind 4 | 现代化前端架构 |
| 后端框架 | Express 4 + tRPC 11 | 类型安全的API层 |
| 数据库 | MySQL (TiDB) | 关系型数据存储 |
| 认证 | Manus OAuth | 统一身份认证 |
| 部署 | Manus Hosting | 托管服务 |

### 1.2 已实现功能模块

当前系统已实现以下功能：

| 模块 | 功能 | 状态 |
|------|------|------|
| 总览仪表盘 | 实时系统监控、项目统计 | ✅ 已完成 |
| 实施路径 | M0-M12阶段甘特图、里程碑管理 | ✅ 已完成 |
| 工具推荐 | NocoBase、AI、IoT工具评估 | ✅ 已完成 |
| 风险控制 | 风险矩阵、预警机制 | ✅ 已完成 |
| 系统分析 | 简道云结构分析、差距分析、依赖关系图 | ✅ 已完成 |
| 迁移管理 | 任务追踪、数据验证、脚本模板 | ✅ 已完成 |
| 文档中心 | 开发指南在线阅读 | ✅ 已完成 |

### 1.3 简道云数据结构概览

从简道云提取的系统结构包含：

| 业务领域 | 应用数量 | 表单数量 | 核心模块 |
|----------|----------|----------|----------|
| 项目管理 | 1 | 45+ | M0-M12全生命周期 |
| 人事OA | 1 | 35+ | 招聘、考勤、绩效、薪酬 |
| ERP模板 | 1 | 30+ | 销售、采购、生产、库存、财务 |
| 供应链 | 1 | 15+ | SRM协同管理 |
| 售后服务 | 1 | 10+ | 现场赋能 |

---

## 2. 架构升级方案

### 2.1 目标架构

升级后的系统将采用**三层架构**设计，实现业务功能与技术实现的分离：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           表现层 (Presentation Layer)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  管理后台   │  │  移动端APP  │  │  大屏看板   │  │  API网关    │   │
│  │  (React)    │  │  (React N.) │  │  (ECharts)  │  │  (tRPC)     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           业务层 (Business Layer)                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                        核心业务模块                                 │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │ │
│  │  │  CRM    │ │  项目   │ │  成本   │ │  人事   │ │  供应链 │    │ │
│  │  │  管理   │ │  管理   │ │  管理   │ │  OA     │ │  管理   │    │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                        智能服务模块                                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │ │
│  │  │ AI销售助手  │  │ UWB工时采集 │  │ CCD质量检测 │              │ │
│  │  │ (Gemini)    │  │ (IoT)       │  │ (视觉)      │              │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据层 (Data Layer)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  MySQL/     │  │   Redis     │  │  InfluxDB   │  │    S3       │   │
│  │  PostgreSQL │  │   缓存      │  │  时序数据   │  │   文件存储  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块化设计

系统将按照**领域驱动设计(DDD)**原则进行模块划分，每个模块独立开发、独立部署：

| 模块代码 | 模块名称 | 核心实体 | 简道云映射 |
|----------|----------|----------|------------|
| `crm` | 客户关系管理 | Customer, Contact, Opportunity | M0客户管理、商机管理 |
| `project` | 项目管理 | Project, Task, Milestone | M0-M12全生命周期 |
| `cost` | 成本管理 | Budget, Expense, Invoice | 项目收支、财务管理 |
| `hr` | 人事管理 | Employee, Attendance, Performance | 人事OA系统 |
| `scm` | 供应链管理 | Supplier, PurchaseOrder, Inventory | 采购、库存管理 |
| `ai` | AI智能服务 | ChatSession, BANTScore, Prediction | AI销售助手 |
| `iot` | IoT设备管理 | Device, Location, WorkHour | UWB定位、CCD检测 |

### 2.3 数据库Schema设计

基于简道云数据结构，设计统一的数据库Schema：

```sql
-- ============================================
-- GRT智能系统 数据库Schema v2.0
-- ============================================

-- 1. CRM模块
-- --------------------------------------------

-- 客户表
CREATE TABLE crm_customers (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    company_code VARCHAR(50) UNIQUE,
    industry VARCHAR(100),
    region VARCHAR(100),
    customer_type ENUM('prospect', 'active', 'inactive', 'lost') NOT NULL DEFAULT 'prospect',
    customer_level ENUM('A', 'B', 'C', 'D'),
    source VARCHAR(100),
    owner_id VARCHAR(36) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id),
    INDEX idx_type_level (customer_type, customer_level)
);

-- 联系人表
CREATE TABLE crm_contacts (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(200),
    is_primary BOOLEAN DEFAULT FALSE,
    decision_role ENUM('decision_maker', 'influencer', 'user', 'gatekeeper'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id)
);

-- 商机表
CREATE TABLE crm_opportunities (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    opportunity_code VARCHAR(50) UNIQUE,
    stage ENUM('lead', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost') NOT NULL DEFAULT 'lead',
    amount DECIMAL(15,2),
    probability INT,
    expected_close_date DATE,
    owner_id VARCHAR(36) NOT NULL,
    source VARCHAR(100),
    product_type VARCHAR(100),
    bant_budget BOOLEAN DEFAULT FALSE,
    bant_authority BOOLEAN DEFAULT FALSE,
    bant_need BOOLEAN DEFAULT FALSE,
    bant_timeline BOOLEAN DEFAULT FALSE,
    bant_score INT GENERATED ALWAYS AS (
        (CASE WHEN bant_budget THEN 25 ELSE 0 END) +
        (CASE WHEN bant_authority THEN 25 ELSE 0 END) +
        (CASE WHEN bant_need THEN 25 ELSE 0 END) +
        (CASE WHEN bant_timeline THEN 25 ELSE 0 END)
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id),
    INDEX idx_stage (stage),
    INDEX idx_owner (owner_id)
);

-- 2. 项目管理模块
-- --------------------------------------------

-- 项目表
CREATE TABLE pm_projects (
    id VARCHAR(36) PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    customer_id VARCHAR(36),
    opportunity_id VARCHAR(36),
    contract_id VARCHAR(36),
    project_type VARCHAR(100),
    current_phase ENUM('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12') NOT NULL DEFAULT 'M0',
    status ENUM('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled') NOT NULL DEFAULT 'not_started',
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    project_manager_id VARCHAR(36) NOT NULL,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    budget DECIMAL(15,2),
    contract_amount DECIMAL(15,2),
    progress INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id),
    FOREIGN KEY (opportunity_id) REFERENCES crm_opportunities(id),
    INDEX idx_phase_status (current_phase, status),
    INDEX idx_manager (project_manager_id)
);

-- 项目任务表
CREATE TABLE pm_tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    parent_task_id VARCHAR(36),
    task_code VARCHAR(50),
    task_name VARCHAR(200) NOT NULL,
    phase ENUM('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12') NOT NULL,
    task_type ENUM('milestone', 'task', 'subtask') DEFAULT 'task',
    assignee_id VARCHAR(36),
    status ENUM('pending', 'in_progress', 'completed', 'blocked') NOT NULL DEFAULT 'pending',
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    planned_start DATE,
    planned_end DATE,
    actual_start DATE,
    actual_end DATE,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    progress INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES pm_projects(id),
    FOREIGN KEY (parent_task_id) REFERENCES pm_tasks(id),
    INDEX idx_project_phase (project_id, phase),
    INDEX idx_assignee (assignee_id)
);

-- 3. 成本管理模块
-- --------------------------------------------

-- 项目预算表
CREATE TABLE cost_budgets (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    budget_type ENUM('labor', 'material', 'equipment', 'subcontract', 'travel', 'other') NOT NULL,
    budget_name VARCHAR(200) NOT NULL,
    planned_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    variance DECIMAL(15,2) GENERATED ALWAYS AS (planned_amount - actual_amount) STORED,
    status ENUM('draft', 'approved', 'closed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES pm_projects(id)
);

-- 费用记录表
CREATE TABLE cost_expenses (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    budget_id VARCHAR(36),
    expense_type ENUM('labor', 'material', 'equipment', 'subcontract', 'travel', 'other') NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    invoice_number VARCHAR(100),
    vendor VARCHAR(200),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    submitted_by VARCHAR(36) NOT NULL,
    approved_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES pm_projects(id),
    FOREIGN KEY (budget_id) REFERENCES cost_budgets(id)
);

-- 4. 人事管理模块
-- --------------------------------------------

-- 员工表
CREATE TABLE hr_employees (
    id VARCHAR(36) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    status ENUM('active', 'inactive', 'resigned') DEFAULT 'active',
    manager_id VARCHAR(36),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES hr_employees(id)
);

-- 考勤记录表
CREATE TABLE hr_attendance (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    work_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status ENUM('normal', 'late', 'early_leave', 'absent', 'leave') DEFAULT 'normal',
    location VARCHAR(200),
    device_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    UNIQUE KEY uk_employee_date (employee_id, attendance_date)
);

-- 5. 供应链管理模块
-- --------------------------------------------

-- 供应商表
CREATE TABLE scm_suppliers (
    id VARCHAR(36) PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(200),
    address TEXT,
    supplier_type ENUM('material', 'equipment', 'service', 'subcontract') NOT NULL,
    rating ENUM('A', 'B', 'C', 'D'),
    status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 采购订单表
CREATE TABLE scm_purchase_orders (
    id VARCHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'ordered', 'received', 'closed', 'cancelled') DEFAULT 'draft',
    created_by VARCHAR(36) NOT NULL,
    approved_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES scm_suppliers(id),
    FOREIGN KEY (project_id) REFERENCES pm_projects(id)
);

-- 6. AI服务模块
-- --------------------------------------------

-- AI对话会话表
CREATE TABLE ai_chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    session_type ENUM('sales_assistant', 'project_advisor', 'data_analyst') NOT NULL,
    context_type VARCHAR(50),
    context_id VARCHAR(36),
    status ENUM('active', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI对话消息表
CREATE TABLE ai_chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    tokens_used INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id)
);

-- BANT评分记录表
CREATE TABLE ai_bant_scores (
    id VARCHAR(36) PRIMARY KEY,
    opportunity_id VARCHAR(36) NOT NULL,
    budget_score INT DEFAULT 0,
    budget_notes TEXT,
    authority_score INT DEFAULT 0,
    authority_notes TEXT,
    need_score INT DEFAULT 0,
    need_notes TEXT,
    timeline_score INT DEFAULT 0,
    timeline_notes TEXT,
    total_score INT GENERATED ALWAYS AS (budget_score + authority_score + need_score + timeline_score) STORED,
    ai_recommendation TEXT,
    scored_by ENUM('manual', 'ai') DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES crm_opportunities(id)
);

-- 7. IoT设备模块
-- --------------------------------------------

-- IoT设备表
CREATE TABLE iot_devices (
    id VARCHAR(36) PRIMARY KEY,
    device_code VARCHAR(100) NOT NULL UNIQUE,
    device_name VARCHAR(200) NOT NULL,
    device_type ENUM('uwb_tag', 'uwb_anchor', 'ccd_camera', 'sensor') NOT NULL,
    location VARCHAR(200),
    status ENUM('online', 'offline', 'maintenance') DEFAULT 'offline',
    last_heartbeat TIMESTAMP,
    config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- UWB定位记录表
CREATE TABLE iot_uwb_locations (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    employee_id VARCHAR(36),
    x_coordinate DECIMAL(10,4),
    y_coordinate DECIMAL(10,4),
    z_coordinate DECIMAL(10,4),
    zone VARCHAR(100),
    accuracy DECIMAL(6,4),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES iot_devices(id),
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    INDEX idx_employee_time (employee_id, recorded_at)
);

-- 工时采集表
CREATE TABLE iot_work_hours (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    task_id VARCHAR(36),
    work_date DATE NOT NULL,
    zone VARCHAR(100),
    duration_minutes INT NOT NULL,
    source ENUM('uwb', 'manual', 'system') DEFAULT 'uwb',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (project_id) REFERENCES pm_projects(id),
    FOREIGN KEY (task_id) REFERENCES pm_tasks(id)
);
```

---

## 3. Claude Code实施规范

### 3.1 项目结构规范

Claude Code实施时应遵循以下项目结构：

```
grt-system/
├── client/                      # 前端代码
│   ├── src/
│   │   ├── components/          # 通用组件
│   │   │   ├── ui/              # shadcn/ui组件
│   │   │   └── business/        # 业务组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── crm/             # CRM模块页面
│   │   │   ├── project/         # 项目管理页面
│   │   │   ├── cost/            # 成本管理页面
│   │   │   ├── hr/              # 人事管理页面
│   │   │   ├── scm/             # 供应链页面
│   │   │   ├── ai/              # AI服务页面
│   │   │   └── iot/             # IoT管理页面
│   │   ├── hooks/               # 自定义Hooks
│   │   ├── contexts/            # React Context
│   │   ├── lib/                 # 工具函数
│   │   └── types/               # TypeScript类型
│   └── public/                  # 静态资源
├── server/                      # 后端代码
│   ├── routers/                 # tRPC路由
│   │   ├── crm.ts               # CRM API
│   │   ├── project.ts           # 项目管理API
│   │   ├── cost.ts              # 成本管理API
│   │   ├── hr.ts                # 人事管理API
│   │   ├── scm.ts               # 供应链API
│   │   ├── ai.ts                # AI服务API
│   │   └── iot.ts               # IoT API
│   ├── services/                # 业务逻辑
│   ├── db/                      # 数据库操作
│   └── _core/                   # 核心框架
├── drizzle/                     # 数据库Schema
│   ├── schema/                  # 分模块Schema
│   │   ├── crm.ts
│   │   ├── project.ts
│   │   ├── cost.ts
│   │   ├── hr.ts
│   │   ├── scm.ts
│   │   ├── ai.ts
│   │   └── iot.ts
│   └── migrations/              # 数据库迁移
├── shared/                      # 前后端共享
│   ├── types/                   # 共享类型
│   └── const/                   # 共享常量
├── docs/                        # 文档
│   ├── api/                     # API文档
│   ├── guides/                  # 开发指南
│   └── architecture/            # 架构文档
└── tests/                       # 测试代码
    ├── unit/                    # 单元测试
    ├── integration/             # 集成测试
    └── e2e/                     # 端到端测试
```

### 3.2 开发流程规范

Claude Code实施时应遵循以下开发流程：

| 阶段 | 操作 | 说明 |
|------|------|------|
| 1. 需求确认 | 阅读需求文档 | 确认功能范围和验收标准 |
| 2. Schema设计 | 更新drizzle/schema | 设计数据模型，运行db:push |
| 3. API开发 | 创建tRPC路由 | 实现CRUD操作和业务逻辑 |
| 4. 测试编写 | 编写Vitest测试 | 覆盖核心业务逻辑 |
| 5. 前端开发 | 创建页面组件 | 使用shadcn/ui和Tailwind |
| 6. 集成测试 | 端到端验证 | 确保功能完整性 |
| 7. 代码提交 | Git提交 | 遵循提交规范 |

### 3.3 代码规范

#### 3.3.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `customer-list.tsx` |
| 组件名 | PascalCase | `CustomerList` |
| 函数名 | camelCase | `getCustomerById` |
| 常量名 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| 数据库表名 | snake_case + 模块前缀 | `crm_customers` |
| API路由 | 模块.操作 | `crm.customers.list` |

#### 3.3.2 tRPC路由规范

```typescript
// server/routers/crm.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../db/crm';

export const crmRouter = router({
  customers: router({
    // 列表查询
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        type: z.enum(['prospect', 'active', 'inactive', 'lost']).optional(),
        level: z.enum(['A', 'B', 'C', 'D']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        return getCustomers(input, ctx.user.id);
      }),

    // 单条查询
    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        return getCustomerById(input.id);
      }),

    // 创建
    create: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1).max(200),
        companyCode: z.string().max(50).optional(),
        industry: z.string().max(100).optional(),
        region: z.string().max(100).optional(),
        customerType: z.enum(['prospect', 'active', 'inactive', 'lost']),
        customerLevel: z.enum(['A', 'B', 'C', 'D']).optional(),
        source: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createCustomer({ ...input, ownerId: ctx.user.id });
      }),

    // 更新
    update: protectedProcedure
      .input(z.object({
        id: z.string().uuid(),
        companyName: z.string().min(1).max(200).optional(),
        // ... 其他可更新字段
      }))
      .mutation(async ({ input }) => {
        return updateCustomer(input);
      }),

    // 删除
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        return deleteCustomer(input.id);
      }),
  }),
});
```

#### 3.3.3 前端组件规范

```tsx
// client/src/pages/crm/CustomerList.tsx
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { CustomerForm } from '@/components/business/crm/CustomerForm';

export default function CustomerList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const { data, isLoading, refetch } = trpc.crm.customers.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
  });

  const createMutation = trpc.crm.customers.create.useMutation({
    onSuccess: () => {
      refetch();
      // 显示成功提示
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <Button onClick={() => setShowForm(true)}>新建客户</Button>
      </div>
      
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        pagination={{
          page,
          pageSize: 20,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
```

---

## 4. 版本迭代计划

### 4.1 版本路线图

| 版本 | 目标 | 时间 | 核心功能 |
|------|------|------|----------|
| v1.0 | 基础架构 | 当前 | 实施方案网站、文档中心、迁移管理 |
| v1.1 | CRM基础 | Week 1-2 | 客户管理、联系人、商机管理 |
| v1.2 | 项目管理 | Week 3-4 | 项目CRUD、任务管理、甘特图 |
| v1.3 | 成本管理 | Week 5-6 | 预算管理、费用记录、报表 |
| v2.0 | AI集成 | Week 7-8 | BANT评分、销售助手、智能推荐 |
| v2.1 | IoT集成 | Week 9-10 | UWB定位、工时采集、设备管理 |
| v2.2 | 人事OA | Week 11-12 | 员工管理、考勤、绩效 |
| v3.0 | 供应链 | Week 13-14 | 供应商、采购、库存 |
| v3.1 | 数据分析 | Week 15-16 | 仪表盘、报表、数据导出 |

### 4.2 v1.1 CRM基础 - 详细任务

| 任务ID | 任务名称 | 优先级 | 预估工时 | 依赖 |
|--------|----------|--------|----------|------|
| CRM-001 | 创建CRM数据库Schema | P0 | 2h | - |
| CRM-002 | 实现客户CRUD API | P0 | 4h | CRM-001 |
| CRM-003 | 实现联系人CRUD API | P0 | 3h | CRM-001 |
| CRM-004 | 实现商机CRUD API | P0 | 4h | CRM-001 |
| CRM-005 | 客户列表页面 | P0 | 4h | CRM-002 |
| CRM-006 | 客户详情页面 | P0 | 3h | CRM-002 |
| CRM-007 | 客户表单组件 | P0 | 3h | CRM-002 |
| CRM-008 | 联系人管理组件 | P1 | 3h | CRM-003 |
| CRM-009 | 商机列表页面 | P0 | 4h | CRM-004 |
| CRM-010 | 商机详情页面 | P0 | 3h | CRM-004 |
| CRM-011 | 商机漏斗图 | P1 | 4h | CRM-004 |
| CRM-012 | 编写单元测试 | P0 | 4h | CRM-002,003,004 |
| CRM-013 | 数据迁移脚本 | P1 | 4h | CRM-001 |

### 4.3 Git分支策略

```
main                    # 生产分支
├── develop             # 开发分支
│   ├── feature/crm-customers    # 功能分支
│   ├── feature/crm-opportunities
│   └── feature/project-tasks
├── release/v1.1        # 发布分支
└── hotfix/xxx          # 紧急修复
```

### 4.4 提交信息规范

```
<type>(<scope>): <subject>

type: feat, fix, docs, style, refactor, test, chore
scope: crm, project, cost, hr, scm, ai, iot, core
subject: 简短描述（50字符以内）

示例:
feat(crm): 实现客户列表分页查询
fix(project): 修复任务状态更新bug
docs(api): 更新CRM模块API文档
test(crm): 添加客户CRUD单元测试
```

---

## 5. 数据迁移策略

### 5.1 迁移优先级

| 优先级 | 模块 | 数据量 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| P0 | 客户管理 | 350条 | 低 | 核心主数据，其他模块依赖 |
| P0 | 商机管理 | 280条 | 中 | 关联客户，需要字段映射 |
| P1 | 合同管理 | 420条 | 中 | 关联客户和商机 |
| P1 | 项目管理 | 150条 | 高 | M0-M12阶段映射 |
| P2 | 员工档案 | 200条 | 低 | 人事主数据 |
| P2 | 供应商 | 100条 | 低 | 供应链主数据 |
| P3 | 考勤记录 | 5000+ | 低 | 历史数据，可选迁移 |

### 5.2 迁移脚本模板

```typescript
// scripts/migrate-customers.ts
import { db } from '../server/db';
import { crmCustomers } from '../drizzle/schema/crm';
import { jiandaoyunApi } from '../server/jiandaoyun';

async function migrateCustomers() {
  console.log('开始迁移客户数据...');
  
  // 1. 从简道云获取数据
  const sourceData = await jiandaoyunApi.getFormData('M0-1_客户管理');
  console.log(`获取到 ${sourceData.length} 条客户记录`);
  
  // 2. 数据转换
  const transformedData = sourceData.map(item => ({
    id: generateUUID(),
    companyName: item['客户名称'],
    companyCode: item['客户编号'],
    industry: item['行业分类'],
    region: item['区域'],
    customerType: mapCustomerType(item['客户类型']),
    customerLevel: mapCustomerLevel(item['客户等级']),
    source: item['来源渠道'],
    ownerId: mapUserId(item['销售负责人']),
    status: 'active',
    createdAt: new Date(item['创建时间']),
    updatedAt: new Date(),
  }));
  
  // 3. 数据验证
  const validData = transformedData.filter(validateCustomer);
  const invalidData = transformedData.filter(d => !validateCustomer(d));
  
  if (invalidData.length > 0) {
    console.warn(`发现 ${invalidData.length} 条无效数据`);
    await saveInvalidRecords(invalidData);
  }
  
  // 4. 批量插入
  const batchSize = 100;
  for (let i = 0; i < validData.length; i += batchSize) {
    const batch = validData.slice(i, i + batchSize);
    await db.insert(crmCustomers).values(batch);
    console.log(`已迁移 ${Math.min(i + batchSize, validData.length)}/${validData.length}`);
  }
  
  console.log('客户数据迁移完成!');
}

// 字段映射函数
function mapCustomerType(source: string): string {
  const mapping: Record<string, string> = {
    '潜在客户': 'prospect',
    '活跃客户': 'active',
    '非活跃客户': 'inactive',
    '流失客户': 'lost',
  };
  return mapping[source] || 'prospect';
}
```

---

## 6. 质量保证

### 6.1 测试策略

| 测试类型 | 覆盖范围 | 工具 | 目标覆盖率 |
|----------|----------|------|------------|
| 单元测试 | 业务逻辑、工具函数 | Vitest | 80% |
| 集成测试 | API端点、数据库操作 | Vitest + Supertest | 70% |
| E2E测试 | 关键用户流程 | Playwright | 核心流程100% |

### 6.2 代码审查清单

- [ ] 代码符合命名规范
- [ ] 函数有适当的注释
- [ ] 错误处理完善
- [ ] 输入验证完整
- [ ] 单元测试覆盖
- [ ] 无硬编码敏感信息
- [ ] 性能考虑（分页、索引）
- [ ] 安全考虑（权限、SQL注入）

---

## 7. 附录

### 7.1 简道云字段映射表

| 简道云表单 | 简道云字段 | 目标表 | 目标字段 | 映射类型 |
|------------|------------|--------|----------|----------|
| M0-1_客户管理 | 客户名称 | crm_customers | company_name | 直接映射 |
| M0-1_客户管理 | 客户编号 | crm_customers | company_code | 直接映射 |
| M0-1_客户管理 | 行业分类 | crm_customers | industry | 直接映射 |
| M0-1_客户管理 | 客户类型 | crm_customers | customer_type | 枚举映射 |
| M0-1_客户管理 | 客户等级 | crm_customers | customer_level | 枚举映射 |
| M0-2_商机管理 | 商机名称 | crm_opportunities | name | 直接映射 |
| M0-2_商机管理 | 商机阶段 | crm_opportunities | stage | 枚举映射 |
| M0-2_商机管理 | 预估金额 | crm_opportunities | amount | 类型转换 |

### 7.2 环境变量配置

```env
# 数据库配置
DATABASE_URL=mysql://user:password@host:3306/grt_system

# 简道云API配置
JIANDAOYUN_API_KEY=your_api_key
JIANDAOYUN_APP_ID=your_app_id

# AI服务配置
GEMINI_API_KEY=your_gemini_key

# IoT服务配置
MQTT_BROKER_URL=mqtt://localhost:1883
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_token

# 其他配置
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

---

**文档结束**

*本文档由Manus AI生成，作为GRT智能系统架构升级的指导文件。*
