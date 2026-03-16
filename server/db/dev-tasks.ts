/**
 * Development tasks CRUD + initialization with defaults
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, or, like, and, sql } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");
import {
  projects, Project, crmCustomers, crmContacts,
  crmOpportunities, crmBantScores, devTasks, InsertDevTask,
  DevTask,
} from "../../drizzle/schema";

// ============= Development Tasks Functions =============

export async function createDevTask(data: InsertDevTask) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate task code
    const count = await db.select({ count: sql<number>`count(*)` }).from(devTasks);
    const code = `TASK-${String(count[0].count + 1).padStart(4, '0')}`;
    
    const result = await db.insert(devTasks).values({
      ...data,
      taskCode: code,
    });
    return { id: result[0].insertId, taskCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create dev task");
    throw error;
  }
}

export async function getAllDevTasks(filters?: {
  version?: string;
  module?: string;
  status?: string;
  priority?: string;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(devTasks);
  
  const conditions = [];
  if (filters?.version) {
    conditions.push(eq(devTasks.version, filters.version));
  }
  if (filters?.module) {
    conditions.push(eq(devTasks.module, filters.module));
  }
  if (filters?.status) {
    conditions.push(eq(devTasks.status, filters.status as any));
  }
  if (filters?.priority) {
    conditions.push(eq(devTasks.priority, filters.priority as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(devTasks.title, `%${filters.search}%`),
        like(devTasks.taskCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(devTasks.createdAt)).limit(1000);
}

export async function getDevTaskById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(devTasks).where(eq(devTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDevTask(id: number, data: Partial<Omit<DevTask, "id" | "createdAt" | "updatedAt" | "taskCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(devTasks).set(data).where(eq(devTasks.id, id));
  return { success: true };
}

export async function deleteDevTask(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(devTasks).where(eq(devTasks.id, id));
  return { success: true };
}

export async function initDefaultDevTasks() {
  const db = await requireDb();
  if (!db) return null;

  // Check if tasks already exist
  const existing = await db.select().from(devTasks).limit(1);
  if (existing.length > 0) {
    return { success: true, message: "Tasks already initialized" };
  }

  // Default development tasks based on version roadmap
  const defaultTasks: Omit<InsertDevTask, "taskCode">[] = [
    // v1.0 Core Infrastructure Tasks
    {
      title: "核心数据模型设计",
      description: "设计系统核心数据模型，包括用户、组织架构、权限等基础表",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现核心数据模型。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：
   - organizations (组织架构)
   - departments (部门)
   - roles (角色)
   - permissions (权限)
   - role_permissions (角色权限关联)

2. 执行 pnpm db:push 同步数据库

3. 在 server/db.ts 中添加基础CRUD函数

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md
- docs/GRT_Architecture_Upgrade_Plan.md

## 验收标准
- 数据库表创建成功
- 基础CRUD函数可用
- 通过 pnpm test 测试`,
      acceptanceCriteria: "1. 数据库表创建成功\n2. 基础CRUD函数可用\n3. 通过pnpm test测试",
    },
    {
      title: "基础API框架搭建",
      description: "搭建tRPC API框架，实现认证、授权、日志中间件",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 12,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中完善API框架。

## 任务要求
1. 在 server/routers.ts 中添加：
   - adminProcedure (管理员权限检查)
   - loggedProcedure (操作日志记录)
   - rateLimitedProcedure (限流保护)

2. 实现统一错误处理

3. 添加请求日志中间件

## 验收标准
- 权限检查正常工作
- 操作日志记录完整
- 错误响应格式统一`,
      acceptanceCriteria: "1. 权限检查正常工作\n2. 操作日志记录完整\n3. 错误响应格式统一",
    },
    {
      title: "前端框架搭建",
      description: "搭建前端基础框架，包括路由、状态管理、UI组件库",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中完善前端框架。

## 任务要求
1. 在 client/src/App.tsx 中配置路由结构
2. 在 client/src/contexts/ 中添加全局状态管理
3. 在 client/src/components/ 中创建通用UI组件
4. 配置Tailwind主题和样式变量

## 验收标准
- 路由导航正常
- 主题切换可用
- 响应式布局正常`,
      acceptanceCriteria: "1. 路由导航正常\n2. 主题切换可用\n3. 响应式布局正常",
    },
    // v1.1 CRM Tasks
    {
      title: "客户管理CRUD接口",
      description: "实现客户的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM客户管理。

## 任务要求
1. 在 server/routers.ts 中添加crm路由：
   - crm.customer.create
   - crm.customer.list
   - crm.customer.getById
   - crm.customer.update
   - crm.customer.delete

2. 在 server/db.ts 中实现数据库操作

3. 支持筛选：客户类型、等级、状态

## 参考数据结构
- drizzle/schema.ts 中的 crmCustomers 表

## 验收标准
- 所有CRUD接口可用
- 筛选功能正常
- 通过 pnpm test 测试`,
      acceptanceCriteria: "1. 所有CRUD接口可用\n2. 支持按类型、等级、状态筛选\n3. 支持关键词搜索",
    },
    {
      title: "联系人管理CRUD接口",
      description: "实现联系人的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 6,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM联系人管理。

## 任务要求
1. 在 server/routers.ts 中添加contact路由：
   - crm.contact.create
   - crm.contact.list
   - crm.contact.getById
   - crm.contact.update
   - crm.contact.delete

2. 联系人必须关联客户(customerId)

3. 支持按客户筛选联系人

## 参考数据结构
- drizzle/schema.ts 中的 crmContacts 表

## 验收标准
- 联系人关联客户
- 支持按客户筛选联系人`,
      acceptanceCriteria: "1. 联系人关联客户\n2. 支持按客户筛选联系人",
    },
    {
      title: "商机管理CRUD接口",
      description: "实现商机的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM商机管理。

## 任务要求
1. 在 server/routers.ts 中添加opportunity路由：
   - crm.opportunity.create
   - crm.opportunity.list
   - crm.opportunity.getById
   - crm.opportunity.update
   - crm.opportunity.updateStage (阶段流转)
   - crm.opportunity.delete

2. 实现商机阶段流转：
   - 线索 -> 商机 -> 方案 -> 报价 -> 谈判 -> 赢单/输单

3. 实现BANT评分：
   - Budget(预算) / Authority(决策权) / Need(需求) / Timeline(时间线)

## 参考数据结构
- drizzle/schema.ts 中的 crmOpportunities, crmBantScores 表

## 验收标准
- 商机关联客户和联系人
- 阶段流转正常
- BANT评分可用`,
      acceptanceCriteria: "1. 商机关联客户和联系人\n2. 支持阶段流转\n3. 支持BANT评分",
    },
    {
      title: "CRM前端页面开发",
      description: "开发客户、联系人、商机的管理页面",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 24,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM前端页面。

## 任务要求
1. 创建以下页面：
   - client/src/pages/CrmCustomers.tsx (客户列表)
   - client/src/pages/CrmContacts.tsx (联系人管理)
   - client/src/pages/CrmOpportunities.tsx (商机管道)

2. 客户列表功能：
   - 表格展示客户信息
   - 支持筛选（类型、等级、状态）
   - 支持搜索
   - 新建/编辑客户弹窗

3. 商机管道功能：
   - Kanban看板展示商机阶段
   - 支持拖拽切换阶段
   - 商机详情弹窗

4. 在 App.tsx 中添加路由
5. 在 Layout.tsx 中添加导航

## 验收标准
- 客户列表支持筛选和搜索
- 商机看板展示正常
- 响应式设计`,
      acceptanceCriteria: "1. 客户列表支持筛选和搜索\n2. 商机看板支持拖拽\n3. 响应式设计",
    },
    // v1.2 Project Tasks
    {
      title: "项目管理数据库Schema",
      description: "设计项目管理模块的数据库表结构",
      version: "v1.2",
      module: "project",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现项目管理数据库Schema。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：

### projects 项目表
- id, projectCode, name, description
- customerId (关联客户)
- opportunityId (关联商机)
- type: internal/external/rd
- status: planning/active/on_hold/completed/cancelled
- currentPhase: M0-M12
- startDate, endDate, actualEndDate
- budget, actualCost
- managerId, createdBy
- createdAt, updatedAt

### project_phases 项目阶段表
- id, projectId, phaseCode (M0-M12)
- name, description
- status: pending/in_progress/completed/skipped
- plannedStartDate, plannedEndDate
- actualStartDate, actualEndDate
- gateCheckPassed: boolean
- gateCheckDate, gateCheckBy
- notes

### project_tasks 项目任务表
- id, projectId, phaseId, taskCode
- title, description
- type: task/milestone/deliverable
- status: todo/in_progress/review/done
- priority: critical/high/medium/low
- assigneeId, estimatedHours, actualHours
- startDate, dueDate, completedDate
- dependencies (JSON)

### project_milestones 里程碑表
- id, projectId, phaseId, name
- description, dueDate, completedDate
- status: pending/completed/overdue
- deliverables (JSON)

2. 执行 pnpm db:push 同步数据库

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md 第三章 数据模型设计
- 外部数据平台项目管理结构: external_sync_extraction/project_management_structure.md

## 验收标准
- 数据库表创建成功
- 字段类型和约束正确
- 外键关系正确`,
    },
    {
      title: "M0-M12阶段门禁",
      description: "实现项目从M0到M12的阶段门禁管控",
      version: "v1.2",
      module: "project",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现M0-M12阶段门禁。

## 任务要求
1. 在 drizzle/schema.ts 中添加：
   - phase_gate_items (门禁检查项)
   - phase_gate_checks (门禁检查记录)

2. 实现门禁检查逻辑：
   - 每个阶段有预定义的检查项
   - 所有检查项通过才能进入下一阶段
   - 支持强制跳过(需管理员审批)

3. M0-M12阶段定义：
   - M0: 市场触达与线索
   - M1: 机会评估与售前方案
   - M2: 技术方案与报价
   - M3: 合同签订与项目启动
   - M4: 设计评审
   - M5: 采购与外协
   - M6: 生产制造
   - M7: 装配调试
   - M8: FAT工厂验收
   - M9: 发货与安装
   - M10: SAT现场验收
   - M11: 试运行
   - M12: 终验与移交

## 参考文档
- external_sync_extraction/project_management_structure.md

## 验收标准
- 门禁检查逻辑正确
- 支持强制跳过
- 检查记录可追溯`,
    },
    // v1.3 Cost Management Tasks
    {
      title: "成本管理数据库Schema",
      description: "设计成本管理模块的数据库表结构",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本管理数据库Schema。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：

### cost_categories 成本科目表
- id, code, name, parentId
- type: direct_material/direct_labor/manufacturing_overhead/period_cost
- description, isActive

### cost_budgets 预算表
- id, projectId, phaseId, categoryId
- budgetAmount, currency
- startDate, endDate
- status: draft/approved/locked
- approvedBy, approvedAt
- notes

### cost_actuals 实际成本表
- id, projectId, phaseId, categoryId
- amount, currency, quantity, unitPrice
- costDate, description
- sourceType: purchase/labor/expense/other
- sourceId (关联采购单/工时单等)
- createdBy, createdAt

### cost_reports 成本报表表
- id, projectId, reportType: monthly/quarterly/final
- periodStart, periodEnd
- totalBudget, totalActual, variance
- status: draft/published
- generatedAt, generatedBy

2. 执行 pnpm db:push 同步数据库

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md 第三章

## 验收标准
- 数据库表创建成功
- 字段类型和约束正确`,
    },
    {
      title: "项目成本CRUD接口",
      description: "实现项目成本的创建、读取、更新、删除API接口",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本管理API。

## 任务要求
1. 在 server/routers.ts 中添加cost路由：

### 预算管理
- cost.budget.create
- cost.budget.list
- cost.budget.getByProject
- cost.budget.update
- cost.budget.approve
- cost.budget.lock

### 实际成本
- cost.actual.create
- cost.actual.list
- cost.actual.getByProject
- cost.actual.update
- cost.actual.delete

### 成本分析
- cost.analysis.getProjectSummary
- cost.analysis.getBudgetVsActual
- cost.analysis.getCostTrend
- cost.analysis.getCostBreakdown

2. 在 server/db.ts 中实现数据库操作

## 验收标准
- 预算CRUD可用
- 实际成本CRUD可用
- 成本分析接口返回正确数据`,
    },
    {
      title: "成本报表与可视化",
      description: "实现成本报表和图表展示",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本报表页面。

## 任务要求
1. 创建 client/src/pages/CostReports.tsx

2. 实现以下图表(使用recharts或chart.js)：
   - 预算vs实际对比柱状图
   - 成本趋势折线图(按月/周)
   - 成本结构饼图(按科目分类)
   - 项目成本排名横向条形图

3. 实现筛选功能：
   - 按项目筛选
   - 按时间范围筛选
   - 按成本科目筛选

4. 实现导出功能：
   - 导出Excel报表
   - 导出PDF报表

## 验收标准
- 图表渲染正确
- 筛选功能正常
- 导出功能可用`,
    },
    // v2.0 AI Tasks
    {
      title: "Gemini API集成",
      description: "集成Google Gemini API实现AI销售助手",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "集成Gemini API，实现销售话术推荐、客户画像分析、商机预测",
    },
    {
      title: "BANT自动评分",
      description: "基于AI分析自动生成BANT评分建议",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: "使用LLM分析商机信息，自动生成BANT评分建议",
    },
    {
      title: "AI销售助手前端界面",
      description: "创建AI销售助手的对话界面",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "创建AI销售助手页面，包括对话界面、历史记录、建议卡片",
    },
    // v2.1 IoT Tasks
    {
      title: "UWB定位集成",
      description: "集成UWB定位系统实现人员定位",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 24,
      claudePrompt: "集成UWB定位API，实现人员位置实时跟踪和工时自动采集",
    },
    {
      title: "CCD视觉检测集成",
      description: "集成CCD视觉检测系统实现质量检测",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "集成CCD视觉检测API，实现产品质量自动检测和缺陷识别",
    },
    {
      title: "IoT数据看板",
      description: "创建IoT数据可视化看板",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "创建IoT数据看板，展示设备状态、位置地图、检测结果统计",
    },
    // v2.2 HR & OA Tasks
    {
      title: "人事管理数据库Schema",
      description: "设计人事管理模块的数据库表结构",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: "设计人事管理的数据库Schema，包括employees, attendance, performance表",
    },
    {
      title: "员工档案管理",
      description: "实现员工档案的CRUD操作",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: "实现员工档案管理，包括入职、转正、调动、离职流程",
    },
    {
      title: "考勤管理系统",
      description: "实现考勤打卡和请假审批",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "实现考勤管理，包括打卡记录、请假申请、加班申请、审批流程",
    },
    // v3.0 Supply Chain Tasks
    {
      title: "供应链数据库Schema",
      description: "设计供应链管理模块的数据库表结构",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: "设计供应链的数据库Schema，包括suppliers, purchase_orders, inventory表",
    },
    {
      title: "采购管理系统",
      description: "实现采购订单的全流程管理",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "实现采购管理，包括采购申请、供应商选择、订单跟踪、到货验收",
    },
    {
      title: "库存管理系统",
      description: "实现库存的入库、出库、盘点管理",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "实现库存管理，包括入库单、出库单、库存盘点、库存预警",
    },
  ];

  for (const task of defaultTasks) {
    const count = await db.select({ count: sql<number>`count(*)` }).from(devTasks);
    const code = `TASK-${String(count[0].count + 1).padStart(4, '0')}`;
    await db.insert(devTasks).values({ ...task, taskCode: code });
  }

  return { success: true, message: "Default dev tasks initialized" };
}
