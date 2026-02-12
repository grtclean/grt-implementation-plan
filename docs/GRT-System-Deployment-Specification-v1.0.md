# GRT智能系统部署规范与架构设计文档

**版本**: v1.0  
**日期**: 2026年1月24日  
**作者**: Manus AI  
**状态**: 正式发布

---

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [技术栈与模块划分](#2-技术栈与模块划分)
3. [菜单与导航结构](#3-菜单与导航结构)
4. [数据库Schema设计](#4-数据库schema设计)
5. [权限体系设计](#5-权限体系设计)
6. [页面操作流程规范](#6-页面操作流程规范)
7. [API接口规范](#7-api接口规范)
8. [角色副手设计](#8-角色副手设计)
9. [阶段门管控设计](#9-阶段门管控设计)
10. [KPI体系设计](#10-kpi体系设计)
11. [变更治理规范](#11-变更治理规范)
12. [部署与运维规范](#12-部署与运维规范)

---

## 1. 系统架构总览

### 1.1 架构设计原则

GRT智能系统采用**前后端分离**的现代化架构，遵循以下核心设计原则：

| 原则 | 描述 | 实现方式 |
|------|------|----------|
| **数据主权** | 敏感数据本地化部署 | 客户分级价格、核心工艺配方存储于私有NocoBase实例 |
| **脱敏代理** | LLM交互数据脱敏 | 所有AI请求经过De-identification Proxy层 |
| **资质认证** | 基于证书的访问控制 | 高级功能需持有对应资质证书 |
| **安全红线** | AI建议安全过滤 | Safety_Filter拦截物理超限建议 |

### 1.2 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端展示层 (Frontend)                      │
│  React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui            │
├─────────────────────────────────────────────────────────────────┤
│                        API网关层 (Gateway)                       │
│  tRPC 11 + Express 4 + Superjson                               │
├─────────────────────────────────────────────────────────────────┤
│                        业务逻辑层 (Service)                       │
│  AI Assistants + Permission Middleware + Business Services      │
├─────────────────────────────────────────────────────────────────┤
│                        数据访问层 (Data)                          │
│  Drizzle ORM + MySQL/TiDB                                       │
├─────────────────────────────────────────────────────────────────┤
│                        外部集成层 (Integration)                   │
│  Microsoft Graph + Gemini API + 简道云 + S3 Storage             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心数据流

系统数据流遵循**请求-处理-响应**的标准模式，所有敏感操作均记录审计日志：

1. **用户请求** → 前端组件 → tRPC Client → HTTP/Batch请求
2. **网关处理** → Express中间件 → 认证检查 → 权限验证
3. **业务处理** → tRPC Procedure → Service层 → 数据库操作
4. **响应返回** → Superjson序列化 → 前端状态更新 → UI渲染

---

## 2. 技术栈与模块划分

### 2.1 技术栈清单

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | React | 19.x | UI组件化开发 |
| **类型系统** | TypeScript | 5.9.x | 类型安全 |
| **样式框架** | Tailwind CSS | 4.x | 原子化CSS |
| **UI组件库** | shadcn/ui | Latest | 可定制组件 |
| **状态管理** | TanStack Query | 5.x | 服务端状态 |
| **路由** | Wouter | Latest | 轻量路由 |
| **后端框架** | Express | 4.x | HTTP服务器 |
| **RPC框架** | tRPC | 11.x | 类型安全API |
| **ORM** | Drizzle | 0.44.x | 数据库操作 |
| **数据库** | MySQL/TiDB | 8.x | 数据存储 |
| **AI集成** | Gemini API | Latest | LLM服务 |
| **文件存储** | AWS S3 | Latest | 对象存储 |
| **邮件服务** | Microsoft Graph | Latest | 邮件发送 |

### 2.2 功能模块划分

系统按业务领域划分为以下核心模块：

| 模块代码 | 模块名称 | 功能描述 | 负责团队 |
|----------|----------|----------|----------|
| `CRM` | 客户关系管理 | 客户、联系人、商机、BANT评分 | 销售部 |
| `PM` | 项目管理 | 项目生命周期、阶段门、里程碑、任务 | 项目部 |
| `COST` | 成本管理 | 预算、成本记录、差异分析 | 财务部 |
| `HRM` | 人力资源 | 招聘、培训、绩效、薪酬 | HR部 |
| `AGENDA` | 议程管理 | 会议、培训计划、年度规划 | 行政部 |
| `AI` | 智能助手 | 方案助手、报价助手、规划助手 | 技术部 |
| `COMPLIANCE` | 合规管理 | 工时合规、预警、报告 | 法务部 |
| `SYS` | 系统管理 | 用户、角色、权限、审计 | IT部 |

---

## 3. 菜单与导航结构

### 3.1 主导航菜单层级

系统采用**侧边栏导航**模式，菜单结构如下：

```
📊 仪表板 (Dashboard)
   └── /dashboard - 系统概览

👥 客户管理 (CRM)
   ├── /crm/customers - 客户列表
   ├── /crm/contacts - 联系人管理
   ├── /crm/opportunities - 商机管理
   └── /crm/bant - BANT评分

📁 项目管理 (PM)
   ├── /projects - 项目列表
   ├── /projects/:id - 项目详情
   ├── /projects/:id/gates - 阶段门管理
   ├── /projects/:id/milestones - 里程碑
   ├── /projects/:id/tasks - 任务管理
   └── /projects/:id/gantt - 甘特图

💰 成本管理 (Cost)
   ├── /cost/budgets - 预算管理
   ├── /cost/records - 成本记录
   ├── /cost/variance - 差异分析
   └── /cost/alerts - 成本预警

👤 人力资源 (HRM)
   ├── /hrm/employees - 员工管理
   ├── /hrm/recruitment - 招聘管理
   ├── /hrm/training - 培训管理
   ├── /hrm/performance - 绩效管理
   ├── /hrm/salary - 薪酬管理
   └── /hrm/ai-interview - AI面试

📅 议程管理 (Agenda)
   ├── /agenda/meetings - 会议管理
   ├── /agenda/training-plans - 培训计划
   └── /agenda/annual-planning - 年度规划

🤖 智能助手 (AI)
   ├── /ai/chat - AI对话
   ├── /ai/solution - 方案助手
   ├── /ai/quotation - 报价助手
   ├── /ai/planning - 规划助手
   └── /ai/kpi - KPI助手

⚠️ 风险控制 (Compliance) [带预警徽章]
   ├── /compliance/dashboard - 合规仪表板
   ├── /compliance/employee/:id - 员工工时详情
   └── /compliance/rules - 规则配置

⚙️ 系统设置 (System)
   ├── /system/users - 用户管理
   ├── /system/roles - 角色管理
   ├── /system/permissions - 权限管理
   ├── /system/audit - 审计日志
   └── /system/webhooks - Webhook配置
```

### 3.2 路由配置规范

所有路由在 `client/src/App.tsx` 中集中配置：

```typescript
// 路由配置示例
<Route path="/compliance/dashboard" component={ComplianceDashboard} />
<Route path="/compliance/employee/:employeeId" component={EmployeeTimeDetails} />
<Route path="/compliance/rules" component={ComplianceRulesConfig} />
```

### 3.3 菜单权限控制

菜单项根据用户角色动态显示，权限检查逻辑：

| 菜单项 | 所需角色 | 最低权限级别 |
|--------|----------|--------------|
| 仪表板 | 所有登录用户 | read |
| 客户管理 | employee+ | read |
| 项目管理 | employee+ | read |
| 成本管理 | finance_specialist+ | read |
| 人力资源 | hr_specialist+ | read |
| 薪酬管理 | hr_manager+ | write |
| 合规管理 | hr_specialist+ | read |
| 规则配置 | admin | admin |
| 系统设置 | admin | admin |

---

## 4. 数据库Schema设计

### 4.1 核心业务表清单

系统包含**120+**数据库表，按模块分类如下：

#### 4.1.1 用户与权限表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `users` | 用户表 | id, name, email, role, openId | 用户基本信息 |
| `user_roles` | 用户角色表 | userId, roleId, departmentId | 角色分配 |
| `permission_groups` | 权限组表 | id, name, description | 权限组定义 |
| `group_members` | 组成员表 | groupId, userId | 组成员关系 |
| `group_permissions` | 组权限表 | groupId, moduleId, permission | 组权限配置 |
| `sensitive_data_access_log` | 敏感数据访问日志 | userId, dataType, action | 审计日志 |
| `permission_change_history` | 权限变更历史 | targetUserId, changeType | 变更记录 |

#### 4.1.2 CRM模块表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `customers` | 客户表 | id, name, industry, tier | 客户信息 |
| `contacts` | 联系人表 | id, customerId, name, phone | 联系人信息 |
| `opportunities` | 商机表 | id, customerId, stage, value | 商机管理 |
| `bant_scores` | BANT评分表 | opportunityId, budget, authority | 线索评分 |
| `follow_ups` | 跟进记录表 | relatedType, relatedId, content | 跟进记录 |

#### 4.1.3 项目管理模块表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `projects` | 项目表 | id, code, name, status, phase | 项目信息 |
| `project_phases` | 项目阶段表 | id, code, name, sequence | 阶段定义 |
| `project_gates` | 阶段门表 | projectId, phaseId, status | 门禁管理 |
| `project_milestones` | 里程碑表 | projectId, name, dueDate | 里程碑 |
| `project_tasks` | 任务表 | projectId, name, assignee | 任务管理 |
| `project_team_members` | 项目成员表 | projectId, userId, role | 团队成员 |
| `project_documents` | 项目文档表 | projectId, name, url | 文档管理 |

#### 4.1.4 成本管理模块表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `cost_categories` | 成本类别表 | id, code, name, type | 类别定义 |
| `project_budgets` | 项目预算表 | projectId, categoryId, amount | 预算管理 |
| `cost_records` | 成本记录表 | projectId, categoryId, amount | 成本记录 |
| `cost_estimates` | 成本估算表 | projectId, estimatedCost | 估算管理 |
| `labor_costs` | 人工成本表 | projectId, employeeId, hours | 人工成本 |
| `cost_variance_analysis` | 差异分析表 | projectId, variance | 差异分析 |
| `cost_alert_rules` | 成本预警规则表 | categoryId, threshold | 预警规则 |
| `cost_alert_logs` | 成本预警日志表 | ruleId, projectId, status | 预警日志 |

#### 4.1.5 人力资源模块表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `hrm_employees` | 员工表 | id, name, department, position | 员工信息 |
| `hrm_positions` | 岗位表 | id, name, level, requirements | 岗位定义 |
| `hrm_candidates` | 候选人表 | id, name, status, source | 招聘管理 |
| `hrm_training_plans` | 培训计划表 | id, name, trainer, schedule | 培训计划 |
| `hrm_performance_grades` | 绩效等级表 | id, grade, description | 绩效等级 |
| `hrm_salary_structures` | 薪酬结构表 | positionId, baseSalary | 薪酬结构 |
| `hrm_ai_interview_records` | AI面试记录表 | candidateId, score, analysis | AI面试 |

#### 4.1.6 合规管理模块表

| 表名 | 中文名 | 主要字段 | 用途 |
|------|--------|----------|------|
| `grt_employees` | 合规员工表 | id, name, region, exemptStatus | 员工合规信息 |
| `grt_time_entries` | 工时记录表 | employeeId, date, hours | 工时记录 |
| `grt_compliance_alerts` | 合规预警表 | employeeId, alertType, severity | 预警记录 |
| `grt_weekly_compliance_summary` | 周合规汇总表 | employeeId, weekStart, totalHours | 周汇总 |
| `grt_compliance_reports` | 合规报告表 | reportType, format, url | 报告记录 |
| `grt_compliance_rules` | 合规规则表 | region, ruleType, threshold | 规则配置 |
| `grt_compliance_email_templates` | 邮件模板表 | templateType, subject, body | 邮件模板 |

### 4.2 字段命名规范

所有数据库字段遵循以下命名规范：

| 规范项 | 规则 | 示例 |
|--------|------|------|
| 表名 | snake_case，复数形式 | `project_tasks` |
| 字段名 | camelCase | `createdAt`, `userId` |
| 主键 | `id`，自增整数 | `id INT AUTO_INCREMENT` |
| 外键 | `{关联表}Id` | `projectId`, `userId` |
| 时间戳 | `createdAt`, `updatedAt` | `TIMESTAMP DEFAULT NOW()` |
| 状态字段 | `status` 或 `{业务}Status` | `status`, `approvalStatus` |
| 布尔字段 | `is{Adjective}` | `isActive`, `isDeleted` |

### 4.3 关键表字段详解

#### 4.3.1 grt_employees（合规员工表）

```sql
CREATE TABLE grt_employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,      -- 员工编号
  name VARCHAR(100) NOT NULL,                    -- 姓名
  email VARCHAR(255),                            -- 邮箱
  department VARCHAR(100),                       -- 部门
  position VARCHAR(100),                         -- 职位
  region ENUM('DE', 'US', 'CN', 'OTHER'),       -- 地区（德国/美国/中国/其他）
  exempt_status ENUM('exempt', 'non_exempt'),   -- 豁免状态（美国FLSA）
  manager_id INT,                                -- 主管ID
  hire_date DATE,                                -- 入职日期
  is_active BOOLEAN DEFAULT TRUE,               -- 是否在职
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 4.3.2 grt_compliance_rules（合规规则表）

```sql
CREATE TABLE grt_compliance_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(50) NOT NULL UNIQUE,        -- 规则编码
  rule_name VARCHAR(200) NOT NULL,              -- 规则名称
  region ENUM('DE', 'US', 'CN', 'GLOBAL'),     -- 适用地区
  rule_type ENUM('daily_max', 'weekly_max', 'rest_period', 'overtime'), -- 规则类型
  threshold_value DECIMAL(10,2) NOT NULL,       -- 阈值
  threshold_unit ENUM('hours', 'days', 'percentage'), -- 单位
  severity ENUM('info', 'warning', 'critical'), -- 严重程度
  is_enabled BOOLEAN DEFAULT TRUE,              -- 是否启用
  description TEXT,                              -- 规则描述
  legal_reference VARCHAR(500),                 -- 法规引用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 5. 权限体系设计

### 5.1 角色定义

系统定义**10个标准角色**，按权限等级从低到高排列：

| 角色ID | 角色名称 | 英文名 | 等级 | 描述 |
|--------|----------|--------|------|------|
| `guest` | 访客 | Guest | 0 | 未登录用户 |
| `employee` | 普通员工 | Employee | 1 | 基础员工权限 |
| `team_lead` | 组长/主管 | Team Lead | 2 | 团队管理权限 |
| `dept_manager` | 部门经理 | Department Manager | 3 | 部门管理权限 |
| `hr_specialist` | HR专员 | HR Specialist | 3 | 人力资源专员 |
| `hr_manager` | HR经理 | HR Manager | 4 | 人力资源管理权限 |
| `finance_specialist` | 财务专员 | Finance Specialist | 3 | 财务专员权限 |
| `finance_manager` | 财务经理 | Finance Manager | 4 | 财务管理权限 |
| `director` | 总监 | Director | 5 | 高管权限 |
| `admin` | 系统管理员 | System Admin | 10 | 系统管理权限 |

### 5.2 权限级别定义

| 级别 | 代码 | 描述 | 允许操作 |
|------|------|------|----------|
| 无权限 | `none` | 不涉及，无法访问 | 无 |
| 只读 | `read` | 可读，只能查看 | 查看、导出 |
| 读写 | `write` | 可写，可以编辑和创建 | 查看、创建、编辑 |
| 管理 | `admin` | 管理员，完全控制 | 查看、创建、编辑、删除、配置 |

### 5.3 功能模块权限矩阵

#### 5.3.1 人力资源模块权限

| 模块 | employee | team_lead | hr_specialist | hr_manager | admin |
|------|----------|-----------|---------------|------------|-------|
| 员工基本信息 | read | read | write | admin | admin |
| 员工联系方式 | read | read | write | admin | admin |
| 员工身份信息 | none | none | read | write | admin |
| 薪酬结构 | none | none | read | write | admin |
| 员工薪资明细 | none* | none* | read | write | admin |
| 绩效管理 | read* | write | write | admin | admin |
| 招聘管理 | none | read | write | admin | admin |
| AI面试系统 | none | read | write | admin | admin |

> *注：`none*`表示只能查看自己的数据，`read*`表示只能查看自己的绩效

#### 5.3.2 项目管理模块权限

| 模块 | employee | team_lead | dept_manager | director | admin |
|------|----------|-----------|--------------|----------|-------|
| 项目列表 | read | read | write | admin | admin |
| 项目详情 | read | write | write | admin | admin |
| 项目成本 | none | read | write | admin | admin |
| 任务管理 | write | write | write | admin | admin |
| 阶段门管理 | read | read | write | admin | admin |

#### 5.3.3 系统管理模块权限

| 模块 | employee | team_lead | dept_manager | director | admin |
|------|----------|-----------|--------------|----------|-------|
| 用户管理 | none | none | none | read | admin |
| 角色管理 | none | none | none | none | admin |
| 权限管理 | none | none | none | none | admin |
| 审计日志 | none | none | none | read | admin |
| 系统配置 | none | none | none | none | admin |

### 5.4 数据范围控制

除功能权限外，系统还实现**数据范围控制**：

| 控制类型 | 描述 | 实现方式 |
|----------|------|----------|
| 本人数据 | 只能查看自己的数据 | `WHERE userId = ctx.user.id` |
| 部门数据 | 只能查看本部门数据 | `WHERE departmentId = ctx.user.departmentId` |
| 下属数据 | 可查看直接下属数据 | `WHERE managerId = ctx.user.id` |
| 项目数据 | 只能查看参与项目的数据 | `JOIN project_team_members` |
| 全部数据 | 可查看所有数据 | 无额外过滤 |

### 5.5 敏感数据访问控制

对于敏感数据，系统实施**分级访问控制**：

| 敏感级别 | 数据类型 | 访问要求 | 审计要求 |
|----------|----------|----------|----------|
| `low` | 员工姓名、部门 | 登录即可 | 无 |
| `medium` | 联系方式、绩效 | 需相关权限 | 记录访问日志 |
| `high` | 薪酬结构、成本 | 需高级权限 | 记录访问日志+原因 |
| `critical` | 身份证、银行卡、薪资明细 | 需特殊授权 | 记录访问日志+原因+审批 |

---

## 6. 页面操作流程规范

### 6.1 合规仪表板操作流程

#### 6.1.1 页面入口
- **路径**: `/compliance/dashboard`
- **权限**: `hr_specialist+` 或 `admin`
- **菜单位置**: 风险控制 → 合规仪表板

#### 6.1.2 页面功能区域

```
┌─────────────────────────────────────────────────────────────────┐
│ 合规仪表板                                    [生成测试数据] [导出报告] [规则配置] │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│ │ 总员工数   │ │ 合规率    │ │ 待处理预警 │ │ 本周工时   │        │
│ │   125     │ │  94.5%   │ │    12     │ │  4,850h   │        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
├─────────────────────────────────────────────────────────────────┤
│ 员工合规状态列表                                                  │
│ ┌─────┬──────┬──────┬──────┬──────┬──────┬──────┐              │
│ │ ID  │ 姓名  │ 部门  │ 地区  │ 本周工时│ 状态  │ 操作  │              │
│ ├─────┼──────┼──────┼──────┼──────┼──────┼──────┤              │
│ │ E001│ 张三  │ 技术部│ DE   │ 45h   │ ⚠️警告│ 查看  │              │
│ │ E002│ 李四  │ 销售部│ US   │ 38h   │ ✅正常│ 查看  │              │
│ └─────┴──────┴──────┴──────┴──────┴──────┴──────┘              │
├─────────────────────────────────────────────────────────────────┤
│ 调度器状态面板                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 德国每日检查: ✅运行中  下次执行: 2026-01-24 23:00 (Berlin)  │ │
│ │ 美国每周检查: ✅运行中  下次执行: 2026-01-26 23:00 (NY)      │ │
│ │ [手动触发德国检查] [手动触发美国检查] [停止调度器]            │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 报告历史面板                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 最近生成的报告                                               │ │
│ │ • 2026-01-24 周合规报告.pdf  [下载] [删除]                   │ │
│ │ • 2026-01-17 周合规报告.xlsx [下载] [删除]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.1.3 操作步骤说明

**步骤1: 查看合规概览**
1. 登录系统，点击侧边栏"风险控制"菜单
2. 系统自动加载合规统计数据
3. 查看四个统计卡片：总员工数、合规率、待处理预警、本周工时

**步骤2: 筛选员工列表**
1. 使用地区下拉框筛选（全部/德国/美国/中国）
2. 使用状态下拉框筛选（全部/正常/警告/违规）
3. 使用搜索框按姓名或员工ID搜索

**步骤3: 查看员工详情**
1. 点击员工行任意位置
2. 系统跳转到 `/compliance/employee/:employeeId` 页面
3. 查看员工完整工时记录、历史违规、趋势图表

**步骤4: 导出合规报告**
1. 点击"导出报告"按钮
2. 在弹出对话框中选择报告类型（周报/月报/年报）
3. 选择导出格式（PDF/Excel/CSV）
4. 点击"生成报告"按钮
5. 系统生成报告并自动下载

**步骤5: 生成测试数据（仅管理员）**
1. 确认当前用户角色为admin
2. 点击"生成测试数据"按钮
3. 系统插入示例员工、工时记录和预警数据
4. 刷新页面查看测试数据

### 6.2 员工工时详情页操作流程

#### 6.2.1 页面入口
- **路径**: `/compliance/employee/:employeeId`
- **权限**: `hr_specialist+` 或 `admin`
- **入口方式**: 从合规仪表板点击员工行

#### 6.2.2 页面功能区域

```
┌─────────────────────────────────────────────────────────────────┐
│ ← 返回合规仪表板                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 员工信息卡片                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 张三 (E001)                                              │ │
│ │ 部门: 技术服务部  职位: 高级工程师  地区: 德国              │ │
│ │ 豁免状态: 非豁免  入职日期: 2023-05-15                      │ │
│ │ 合规状态: ⚠️ 警告 (本周工时超过48小时)                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 周工时趋势图                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [折线图: 最近12周工时趋势，红线标注48小时阈值]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 工时记录列表                                                      │
│ ┌─────┬──────────┬──────┬──────┬──────┬──────────────────────┐ │
│ │ 日期 │ 开始时间  │ 结束时间│ 工时  │ 类型  │ 备注                │ │
│ ├─────┼──────────┼──────┼──────┼──────┼──────────────────────┤ │
│ │01-24│ 08:00    │ 19:00│ 11h  │ 正常  │ 项目紧急             │ │
│ │01-23│ 08:30    │ 17:30│ 9h   │ 正常  │                      │ │
│ └─────┴──────────┴──────┴──────┴──────┴──────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 历史违规记录                                                      │
│ ┌─────┬──────────┬──────────────┬──────┬──────────────────────┐ │
│ │ 日期 │ 违规类型  │ 描述          │ 严重性│ 状态                │ │
│ ├─────┼──────────┼──────────────┼──────┼──────────────────────┤ │
│ │01-20│ 日工时超限│ 单日工作11小时│ 警告  │ 已处理              │ │
│ └─────┴──────────┴──────────────┴──────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 合规规则配置页操作流程

#### 6.3.1 页面入口
- **路径**: `/compliance/rules`
- **权限**: `admin` only
- **入口方式**: 从合规仪表板点击"规则配置"按钮

#### 6.3.2 操作步骤说明

**步骤1: 查看现有规则**
1. 系统显示所有合规规则列表
2. 按地区分组显示（德国/美国/中国/全球）

**步骤2: 创建新规则**
1. 点击"添加规则"按钮
2. 填写规则表单：
   - 规则编码（如 `DE_DAILY_MAX`）
   - 规则名称（如 "德国每日最大工时"）
   - 适用地区（下拉选择）
   - 规则类型（每日最大/每周最大/休息时间/加班）
   - 阈值（数值）
   - 单位（小时/天/百分比）
   - 严重程度（信息/警告/严重）
   - 法规引用（可选）
3. 点击"保存"按钮

**步骤3: 编辑邮件模板**
1. 切换到"邮件模板"标签页
2. 选择要编辑的模板
3. 修改模板内容：
   - 主题行
   - 正文（支持变量替换）
   - 可用变量：`{{employeeName}}`, `{{alertType}}`, `{{date}}`, `{{details}}`
4. 点击"保存模板"按钮

---

## 7. API接口规范

### 7.1 tRPC路由器架构

系统采用**tRPC**作为API框架，所有接口通过类型安全的RPC调用：

```typescript
// 路由器注册结构
export const appRouter = router({
  system: systemRouter,           // 系统核心
  permission: permissionRouter,   // 权限管理
  aiAssistant: aiAssistantRouter, // AI助手
  compliance: complianceRouter,   // 合规管理
  // ... 其他路由器
});
```

### 7.2 合规模块API清单

| API端点 | 方法 | 权限 | 描述 |
|---------|------|------|------|
| `compliance.getDashboardStats` | Query | protected | 获取仪表板统计 |
| `compliance.getEmployeeList` | Query | protected | 获取员工列表 |
| `compliance.getEmployeeDetails` | Query | protected | 获取员工详情 |
| `compliance.getTimeEntries` | Query | protected | 获取工时记录 |
| `compliance.getAlerts` | Query | protected | 获取预警列表 |
| `compliance.resolveAlert` | Mutation | protected | 处理预警 |
| `compliance.exportReport` | Mutation | protected | 导出报告 |
| `compliance.seedTestData` | Mutation | admin | 生成测试数据 |
| `compliance.getSchedulerStatus` | Query | admin | 获取调度器状态 |
| `compliance.startSchedulers` | Mutation | admin | 启动调度器 |
| `compliance.stopSchedulers` | Mutation | admin | 停止调度器 |
| `compliance.getRules` | Query | admin | 获取规则列表 |
| `compliance.createRule` | Mutation | admin | 创建规则 |
| `compliance.updateRule` | Mutation | admin | 更新规则 |
| `compliance.deleteRule` | Mutation | admin | 删除规则 |
| `compliance.getEmailTemplates` | Query | admin | 获取邮件模板 |
| `compliance.updateEmailTemplate` | Mutation | admin | 更新邮件模板 |
| `compliance.getUnresolvedAlertCount` | Query | protected | 获取未处理预警数 |
| `compliance.getReportHistory` | Query | protected | 获取报告历史 |

### 7.3 API调用示例

#### 7.3.1 前端调用示例

```typescript
// 获取仪表板统计
const { data: stats, isLoading } = trpc.compliance.getDashboardStats.useQuery();

// 导出报告
const exportMutation = trpc.compliance.exportReport.useMutation({
  onSuccess: (data) => {
    window.open(data.downloadUrl, '_blank');
  }
});

// 调用导出
exportMutation.mutate({
  reportType: 'weekly',
  format: 'pdf',
  dateRange: { start: '2026-01-18', end: '2026-01-24' }
});
```

#### 7.3.2 后端Procedure定义

```typescript
// server/complianceRoutes.ts
export const complianceRouter = router({
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    // 查询统计数据
    const totalEmployees = await db.select({ count: sql`count(*)` })
      .from(grtEmployees)
      .where(eq(grtEmployees.isActive, true));
    // ... 返回统计结果
  }),

  exportReport: protectedProcedure
    .input(z.object({
      reportType: z.enum(['daily', 'weekly', 'monthly']),
      format: z.enum(['pdf', 'excel', 'csv']),
      dateRange: z.object({
        start: z.string(),
        end: z.string()
      })
    }))
    .mutation(async ({ ctx, input }) => {
      // 生成报告逻辑
      const report = await generateComplianceReport(input);
      // 上传到S3
      const { url } = await storagePut(`reports/${report.filename}`, report.buffer);
      return { downloadUrl: url };
    }),
});
```

---

## 8. 角色副手设计

### 8.1 AI助手角色体系

系统设计**6类AI角色副手**，每类助手有明确的职责边界和能力范围：

| 助手ID | 助手名称 | 职责范围 | 数据访问权限 |
|--------|----------|----------|--------------|
| `solution_assistant` | 方案助手 | 技术方案生成、设备选型建议 | 知识库、历史方案 |
| `quotation_assistant` | 报价助手 | 报价生成、成本估算 | 价格矩阵、历史报价 |
| `planning_assistant` | 规划助手 | 年度计划、议程生成 | 计划模板、历史计划 |
| `kpi_assistant` | KPI助手 | 绩效分析、改进建议 | KPI配置、评估历史 |
| `interview_assistant` | 面试助手 | 面试评估、候选人分析 | 面试记录、评估标准 |
| `employee_da` | 员工数字助手 | 个人任务、日程管理 | 个人数据、任务列表 |

### 8.2 角色副手功能边界

#### 8.2.1 方案助手 (Solution Assistant)

**可执行操作**:
- 根据客户需求生成技术方案
- 推荐设备配置和型号
- 分析历史相似案例
- 生成方案文档

**禁止操作**:
- 直接修改客户数据
- 访问财务敏感信息
- 发送外部邮件
- 执行合同签署

**交互流程**:
```
用户输入需求 → AI分析需求 → 检索知识库 → 生成方案草稿 → 用户确认 → 保存方案
```

#### 8.2.2 报价助手 (Quotation Assistant)

**可执行操作**:
- 根据方案生成报价单
- 计算成本和利润率
- 应用客户分级价格
- 生成报价文档

**禁止操作**:
- 修改价格矩阵
- 绕过审批流程
- 直接发送报价给客户

**交互流程**:
```
选择方案 → AI计算成本 → 应用定价规则 → 生成报价草稿 → 主管审批 → 发送客户
```

#### 8.2.3 KPI助手 (KPI Assistant)

**可执行操作**:
- 分析员工绩效数据
- 生成绩效报告
- 提供改进建议
- 预测绩效趋势

**禁止操作**:
- 直接修改绩效评分
- 访问薪资明细
- 发送绩效通知

**交互流程**:
```
选择评估周期 → AI收集数据 → 分析绩效指标 → 生成报告 → 主管审核 → 员工确认
```

### 8.3 DA跨角色订阅机制

每个员工数字助手(DA)自动订阅其岗位对应的功能助手：

| 岗位类型 | 订阅的功能助手 | 继承能力 |
|----------|----------------|----------|
| 销售工程师 | solution_assistant, quotation_assistant | 方案生成、报价计算 |
| 技术工程师 | solution_assistant | 故障诊断、技术方案 |
| 项目经理 | planning_assistant, kpi_assistant | 项目规划、绩效跟踪 |
| HR专员 | interview_assistant, kpi_assistant | 面试评估、绩效管理 |

### 8.4 安全红线规则

所有AI助手必须遵守**安全红线规则**：

| 规则ID | 规则名称 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|
| `AI_001` | 数据脱敏 | 输出包含敏感数据 | 自动脱敏处理 |
| `AI_002` | 权限越界 | 请求超出权限范围 | 拒绝并记录日志 |
| `AI_003` | 物理超限 | 建议涉及设备超限操作 | 强制拦截并告警 |
| `AI_004` | 财务异常 | 检测到异常财务模式 | 标记人工审核 |

---

## 9. 阶段门管控设计

### 9.1 项目生命周期阶段

GRT项目管理采用**M0-M12阶段门**模型，每个阶段有明确的准入和准出条件：

| 阶段 | 代码 | 名称 | 主要活动 | 交付物 |
|------|------|------|----------|--------|
| M0 | `m0_initiation` | 项目启动 | 需求收集、可行性分析 | 项目章程 |
| M1 | `m1_planning` | 项目规划 | 范围定义、计划制定 | 项目计划书 |
| M2 | `m2_design` | 方案设计 | 技术方案、设计评审 | 设计文档 |
| M3 | `m3_development` | 开发实施 | 设备制造、软件开发 | 产品原型 |
| M4 | `m4_testing` | 测试验证 | FAT测试、问题修复 | 测试报告 |
| M5 | `m5_delivery` | 交付安装 | 现场安装、SAT测试 | 验收报告 |
| M6 | `m6_acceptance` | 客户验收 | 客户培训、正式验收 | 验收签字 |
| M12 | `m12_warranty` | 质保服务 | 质保期服务、问题响应 | 服务记录 |

### 9.2 阶段门准入条件

每个阶段门设置**强制准入条件**和**推荐准入条件**：

#### 9.2.1 M2设计阶段门准入条件

| 条件类型 | 条件描述 | 验证方式 | 责任人 |
|----------|----------|----------|--------|
| **强制** | 项目计划书已批准 | 系统检查审批状态 | 项目经理 |
| **强制** | 预算已分配 | 系统检查预算记录 | 财务经理 |
| **强制** | 团队成员已分配 | 系统检查成员列表 | 项目经理 |
| 推荐 | 客户需求已确认 | 人工确认 | 销售经理 |
| 推荐 | 风险评估已完成 | 人工确认 | 项目经理 |

#### 9.2.2 M5交付阶段门准入条件

| 条件类型 | 条件描述 | 验证方式 | 责任人 |
|----------|----------|----------|--------|
| **强制** | FAT测试通过 | 系统检查测试报告 | 质量经理 |
| **强制** | 所有关键问题已关闭 | 系统检查问题列表 | 项目经理 |
| **强制** | 发货清单已确认 | 人工确认 | 物流经理 |
| 推荐 | 安装计划已制定 | 人工确认 | 技术经理 |

### 9.3 阶段门审批流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 项目经理    │ →  │ 部门经理    │ →  │ 质量经理    │ →  │ 总监       │
│ 发起申请    │    │ 初审       │    │ 质量审核    │    │ 最终批准    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      ↓                  ↓                  ↓                  ↓
   提交材料          检查完整性         检查质量标准        战略评估
   填写说明          确认资源            确认合规          批准/驳回
```

### 9.4 阶段门数据结构

```typescript
// 阶段门记录
interface ProjectGate {
  id: number;
  projectId: number;
  phaseId: string;           // 阶段代码
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  requestedAt: Date;         // 申请时间
  requestedBy: number;       // 申请人
  reviewedAt?: Date;         // 审核时间
  reviewedBy?: number;       // 审核人
  approvedAt?: Date;         // 批准时间
  approvedBy?: number;       // 批准人
  comments?: string;         // 审批意见
  checklistItems: GateChecklistItem[];  // 检查项
}

// 检查项
interface GateChecklistItem {
  id: number;
  gateId: number;
  itemName: string;          // 检查项名称
  isMandatory: boolean;      // 是否强制
  isCompleted: boolean;      // 是否完成
  completedAt?: Date;        // 完成时间
  completedBy?: number;      // 完成人
  evidence?: string;         // 证据/附件
}
```

---

## 10. KPI体系设计

### 10.1 KPI指标分类

系统KPI指标按**平衡计分卡**四个维度设计：

| 维度 | 指标类别 | 示例指标 | 权重 |
|------|----------|----------|------|
| **财务** | 收入、成本、利润 | 项目利润率、成本节约率 | 30% |
| **客户** | 满意度、留存率 | 客户满意度、复购率 | 25% |
| **内部流程** | 效率、质量 | 项目交付准时率、缺陷率 | 25% |
| **学习成长** | 能力、创新 | 培训完成率、创新提案数 | 20% |

### 10.2 部门KPI指标定义

#### 10.2.1 销售部KPI

| 指标ID | 指标名称 | 计算公式 | 目标值 | 权重 |
|--------|----------|----------|--------|------|
| `SALES_001` | 销售额达成率 | 实际销售额 / 目标销售额 × 100% | ≥100% | 30% |
| `SALES_002` | 新客户开发数 | 新签约客户数量 | ≥10个/季 | 20% |
| `SALES_003` | 商机转化率 | 成交商机数 / 总商机数 × 100% | ≥30% | 20% |
| `SALES_004` | 客户满意度 | 满意度调查平均分 | ≥4.5/5 | 15% |
| `SALES_005` | 回款率 | 实际回款 / 应收款 × 100% | ≥95% | 15% |

#### 10.2.2 技术服务部KPI

| 指标ID | 指标名称 | 计算公式 | 目标值 | 权重 |
|--------|----------|----------|--------|------|
| `TECH_001` | 项目交付准时率 | 准时交付项目数 / 总项目数 × 100% | ≥90% | 25% |
| `TECH_002` | 客户满意度 | 服务满意度调查平均分 | ≥4.5/5 | 20% |
| `TECH_003` | 首次修复率 | 一次解决问题数 / 总问题数 × 100% | ≥85% | 20% |
| `TECH_004` | 服务响应时间 | 平均响应时间 | ≤4小时 | 15% |
| `TECH_005` | 知识库贡献 | 新增知识条目数 | ≥5条/月 | 10% |
| `TECH_006` | 培训完成率 | 完成培训课时 / 计划课时 × 100% | ≥100% | 10% |

#### 10.2.3 HR部KPI

| 指标ID | 指标名称 | 计算公式 | 目标值 | 权重 |
|--------|----------|----------|--------|------|
| `HR_001` | 招聘完成率 | 实际招聘人数 / 计划招聘人数 × 100% | ≥95% | 25% |
| `HR_002` | 招聘周期 | 平均招聘天数 | ≤30天 | 15% |
| `HR_003` | 员工流失率 | 离职人数 / 平均在职人数 × 100% | ≤10% | 20% |
| `HR_004` | 培训覆盖率 | 参训人数 / 总人数 × 100% | ≥90% | 15% |
| `HR_005` | 绩效评估完成率 | 完成评估人数 / 应评估人数 × 100% | 100% | 15% |
| `HR_006` | 员工满意度 | 员工满意度调查平均分 | ≥4.0/5 | 10% |

### 10.3 KPI评估流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 数据采集    │ →  │ 指标计算    │ →  │ 评估审核    │ →  │ 结果应用    │
│ (自动/手动) │    │ (AI辅助)   │    │ (多级审批) │    │ (绩效/薪酬) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 10.4 KPI数据结构

```typescript
// KPI配置
interface KpiConfiguration {
  id: number;
  kpiCode: string;           // 指标编码
  kpiName: string;           // 指标名称
  category: 'financial' | 'customer' | 'process' | 'growth';
  department: string;        // 适用部门
  formula: string;           // 计算公式
  targetValue: number;       // 目标值
  unit: string;              // 单位
  weight: number;            // 权重
  dataSource: string;        // 数据来源
  frequency: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
}

// KPI评分记录
interface KpiScoreRecord {
  id: number;
  employeeId: number;
  kpiId: number;
  period: string;            // 评估周期 (如 "2026-Q1")
  actualValue: number;       // 实际值
  targetValue: number;       // 目标值
  score: number;             // 得分 (0-100)
  weightedScore: number;     // 加权得分
  evaluatorId: number;       // 评估人
  evaluatedAt: Date;         // 评估时间
  comments?: string;         // 评语
}
```

---

## 11. 变更治理规范

### 11.1 变更分类

系统变更按影响范围和紧急程度分类：

| 变更类型 | 描述 | 审批级别 | 实施窗口 |
|----------|------|----------|----------|
| **紧急变更** | 生产故障修复 | 技术负责人 | 立即 |
| **标准变更** | 预定义的低风险变更 | 自动审批 | 工作时间 |
| **普通变更** | 功能新增/修改 | 变更委员会 | 计划窗口 |
| **重大变更** | 架构调整/数据迁移 | 高管审批 | 专项窗口 |

### 11.2 变更请求流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 提交变更    │ →  │ 影响评估    │ →  │ 审批决策    │ →  │ 实施验证    │
│ 请求(CR)   │    │ (技术/业务) │    │ (CAB会议)  │    │ (测试/上线) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      ↓                  ↓                  ↓                  ↓
   填写CR表单        分析影响范围        审批/驳回/延期      执行变更计划
   附加需求文档      评估风险等级        记录决策理由        验证变更效果
```

### 11.3 变更请求表单

| 字段 | 必填 | 说明 |
|------|------|------|
| 变更标题 | ✓ | 简明描述变更内容 |
| 变更类型 | ✓ | 紧急/标准/普通/重大 |
| 变更原因 | ✓ | 为什么需要这个变更 |
| 变更描述 | ✓ | 详细描述变更内容 |
| 影响范围 | ✓ | 受影响的模块/用户 |
| 风险评估 | ✓ | 潜在风险和缓解措施 |
| 回滚计划 | ✓ | 变更失败时的回滚方案 |
| 测试计划 | ✓ | 变更验证方法 |
| 计划实施时间 | ✓ | 预计实施时间窗口 |
| 请求人 | ✓ | 自动填充当前用户 |
| 附件 | - | 需求文档、设计文档等 |

### 11.4 变更审批矩阵

| 变更类型 | 技术评审 | 业务评审 | 安全评审 | 最终审批 |
|----------|----------|----------|----------|----------|
| 紧急变更 | 技术负责人 | - | - | 技术负责人 |
| 标准变更 | 自动 | - | - | 自动 |
| 普通变更 | 技术经理 | 业务经理 | - | CAB |
| 重大变更 | 技术总监 | 业务总监 | 安全官 | CTO/CEO |

### 11.5 版本控制规范

系统采用**语义化版本号**：`MAJOR.MINOR.PATCH`

| 版本类型 | 触发条件 | 示例 |
|----------|----------|------|
| MAJOR | 不兼容的API变更 | 1.0.0 → 2.0.0 |
| MINOR | 向后兼容的功能新增 | 1.0.0 → 1.1.0 |
| PATCH | 向后兼容的问题修复 | 1.0.0 → 1.0.1 |

### 11.6 变更日志记录

每次变更必须记录以下信息：

```typescript
interface ChangeLog {
  version: string;           // 版本号
  releaseDate: Date;         // 发布日期
  changeType: 'feature' | 'fix' | 'refactor' | 'docs';
  category: string;          // 模块分类
  description: string;       // 变更描述
  crNumber?: string;         // 变更请求编号
  author: string;            // 开发者
  reviewer: string;          // 审核者
  testCases: string[];       // 测试用例
  rollbackPlan: string;      // 回滚方案
}
```

---

## 12. 部署与运维规范

### 12.1 环境配置

系统支持以下部署环境：

| 环境 | 用途 | 数据库 | 域名 |
|------|------|--------|------|
| Development | 开发调试 | 本地MySQL | localhost:3000 |
| Staging | 集成测试 | 测试TiDB | staging.grt.com |
| Production | 生产运行 | 生产TiDB | app.grt.com |

### 12.2 环境变量清单

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✓ | 数据库连接字符串 |
| `JWT_SECRET` | ✓ | JWT签名密钥 |
| `VITE_APP_ID` | ✓ | OAuth应用ID |
| `OAUTH_SERVER_URL` | ✓ | OAuth服务器地址 |
| `MICROSOFT_CLIENT_ID` | ✓ | Microsoft Graph客户端ID |
| `MICROSOFT_CLIENT_SECRET` | ✓ | Microsoft Graph客户端密钥 |
| `MICROSOFT_TENANT_ID` | ✓ | Microsoft租户ID |
| `GEMINI_API_KEY` | ✓ | Gemini API密钥 |
| `JIANDAOYUN_API_KEY` | - | 简道云API密钥 |
| `JIANDAOYUN_CORP_ID` | - | 简道云企业ID |

### 12.3 部署检查清单

**部署前检查**:
- [ ] 所有单元测试通过
- [ ] 代码审查已完成
- [ ] 变更请求已批准
- [ ] 数据库迁移脚本已准备
- [ ] 回滚方案已确认

**部署后验证**:
- [ ] 服务健康检查通过
- [ ] 关键功能冒烟测试通过
- [ ] 监控告警正常
- [ ] 日志无异常错误

### 12.4 监控告警配置

| 监控项 | 告警阈值 | 通知方式 |
|--------|----------|----------|
| CPU使用率 | > 80% | 邮件+短信 |
| 内存使用率 | > 85% | 邮件+短信 |
| 磁盘使用率 | > 90% | 邮件 |
| API响应时间 | > 3秒 | 邮件 |
| 错误率 | > 1% | 邮件+短信 |
| 数据库连接数 | > 80% | 邮件 |

---

## 附录

### 附录A: 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 阶段门 | Phase Gate | 项目生命周期中的检查点，需满足条件才能进入下一阶段 |
| BANT | Budget, Authority, Need, Timeline | 销售线索评分模型 |
| DA | Digital Assistant | 员工数字助手 |
| FAT | Factory Acceptance Test | 工厂验收测试 |
| SAT | Site Acceptance Test | 现场验收测试 |
| CAB | Change Advisory Board | 变更顾问委员会 |
| CR | Change Request | 变更请求 |

### 附录B: 参考文档

1. GRT系统需求规格说明书 v2.6.0
2. GRT系统数据库设计文档
3. GRT系统API接口文档
4. GRT系统用户手册

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-01-24 | Manus AI | 初始版本 |

---

*本文档由Manus AI自动生成，如有问题请联系系统管理员。*
