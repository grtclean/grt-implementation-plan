# 任务1：甘特图资源负载分析

**版本**: v1.3.12  
**任务编号**: TASK-1  
**负责方**: Claude Code  
**检查方**: Manus  
**预计工时**: 4-6小时  
**优先级**: P1

---

## 1. 任务概述

本任务旨在为甘特图模块添加资源负载分析功能，帮助项目经理识别资源冲突、过载情况，并提供资源平衡建议。该功能将与现有的关键路径计算和依赖关系管理功能协同工作，形成完整的项目资源管理解决方案。

### 1.1 业务价值

资源负载分析是项目管理的核心功能之一，能够帮助团队在项目规划阶段识别潜在的资源瓶颈，避免因资源冲突导致的项目延期。通过可视化的资源利用率图表，项目经理可以直观地了解每个资源在不同时间段的工作负载，从而做出更合理的资源分配决策。

### 1.2 功能范围

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| 资源分配管理 | 为任务分配资源（人员/设备） | P1 |
| 利用率计算 | 计算资源在各时间段的利用率 | P1 |
| 负载可视化 | 堆叠柱状图展示资源负载 | P1 |
| 冲突检测 | 识别资源过载和冲突 | P1 |
| 平衡建议 | 提供资源调整建议 | P2 |

---

## 2. 技术设计

### 2.1 数据库Schema设计

在 `drizzle/schema.ts` 中添加以下表定义：

```typescript
// 资源表 - 存储可用资源（人员/设备）
export const annualPlanningResources = mysqlTable("annual_planning_resources", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["person", "equipment", "material"]).default("person").notNull(),
  capacity: int("capacity").default(100).notNull(), // 日产能百分比，100表示全职
  department: varchar("department", { length: 100 }),
  email: varchar("email", { length: 200 }),
  color: varchar("color", { length: 20 }).default("#3B82F6"), // 资源颜色标识
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 资源分配表 - 任务与资源的关联
export const annualPlanningResourceAssignments = mysqlTable("annual_planning_resource_assignments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  itemId: varchar("item_id", { length: 36 }).notNull(), // 关联年度规划项目
  resourceId: varchar("resource_id", { length: 36 }).notNull(), // 关联资源
  allocation: int("allocation").default(100).notNull(), // 分配百分比
  startDate: date("start_date"), // 可选：覆盖任务日期
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AnnualPlanningResource = typeof annualPlanningResources.$inferSelect;
export type InsertAnnualPlanningResource = typeof annualPlanningResources.$inferInsert;
export type AnnualPlanningResourceAssignment = typeof annualPlanningResourceAssignments.$inferSelect;
export type InsertAnnualPlanningResourceAssignment = typeof annualPlanningResourceAssignments.$inferInsert;
```

### 2.2 数据库函数设计

在 `server/db.ts` 中添加以下函数：

```typescript
// ==================== 资源管理函数 ====================

/**
 * 获取所有资源列表
 */
export async function getResources(): Promise<AnnualPlanningResource[]>

/**
 * 创建资源
 */
export async function createResource(data: Omit<InsertAnnualPlanningResource, "id" | "createdAt" | "updatedAt">): Promise<AnnualPlanningResource>

/**
 * 更新资源
 */
export async function updateResource(id: string, data: Partial<InsertAnnualPlanningResource>): Promise<{ success: boolean }>

/**
 * 删除资源
 */
export async function deleteResource(id: string): Promise<{ success: boolean }>

// ==================== 资源分配函数 ====================

/**
 * 获取任务的资源分配
 */
export async function getItemResourceAssignments(itemId: string): Promise<AnnualPlanningResourceAssignment[]>

/**
 * 获取资源的所有分配
 */
export async function getResourceAssignments(resourceId: string): Promise<AnnualPlanningResourceAssignment[]>

/**
 * 创建资源分配
 */
export async function createResourceAssignment(data: Omit<InsertAnnualPlanningResourceAssignment, "id" | "createdAt" | "updatedAt">): Promise<AnnualPlanningResourceAssignment>

/**
 * 更新资源分配
 */
export async function updateResourceAssignment(id: string, data: Partial<InsertAnnualPlanningResourceAssignment>): Promise<{ success: boolean }>

/**
 * 删除资源分配
 */
export async function deleteResourceAssignment(id: string): Promise<{ success: boolean }>

// ==================== 资源负载分析函数 ====================

/**
 * 计算资源负载
 * @param resourceId - 资源ID（可选，不传则计算所有资源）
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 按日期分组的资源负载数据
 */
export async function calculateResourceLoad(
  resourceId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ResourceLoadResult[]>

/**
 * 检测资源冲突
 * @returns 过载的资源和时间段列表
 */
export async function detectResourceConflicts(): Promise<ResourceConflict[]>

/**
 * 生成资源平衡建议
 * @returns 资源调整建议列表
 */
export async function generateBalanceSuggestions(): Promise<BalanceSuggestion[]>
```

### 2.3 API路由设计

在 `server/routers.ts` 中添加以下路由：

```typescript
// 资源管理路由
resource: router({
  list: protectedProcedure.query(async () => {
    return getResources();
  }),
  
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      type: z.enum(["person", "equipment", "material"]).default("person"),
      capacity: z.number().min(0).max(200).default(100),
      department: z.string().max(100).optional(),
      email: z.string().email().optional(),
      color: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      return createResource(input);
    }),
    
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      type: z.enum(["person", "equipment", "material"]).optional(),
      capacity: z.number().min(0).max(200).optional(),
      department: z.string().max(100).optional(),
      email: z.string().email().optional(),
      color: z.string().max(20).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateResource(id, data);
    }),
    
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return deleteResource(input.id);
    }),
}),

// 资源分配路由
resourceAssignment: router({
  getByItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ input }) => {
      return getItemResourceAssignments(input.itemId);
    }),
    
  getByResource: protectedProcedure
    .input(z.object({ resourceId: z.string() }))
    .query(async ({ input }) => {
      return getResourceAssignments(input.resourceId);
    }),
    
  create: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      resourceId: z.string(),
      allocation: z.number().min(0).max(100).default(100),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return createResourceAssignment(input);
    }),
    
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      allocation: z.number().min(0).max(100).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateResourceAssignment(id, data);
    }),
    
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return deleteResourceAssignment(input.id);
    }),
}),

// 资源负载分析路由
resourceLoad: router({
  calculate: protectedProcedure
    .input(z.object({
      resourceId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return calculateResourceLoad(
        input.resourceId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),
    
  conflicts: protectedProcedure.query(async () => {
    return detectResourceConflicts();
  }),
  
  suggestions: protectedProcedure.query(async () => {
    return generateBalanceSuggestions();
  }),
}),
```

### 2.4 前端组件设计

#### 2.4.1 资源负载图表组件

在 `client/src/pages/AnnualPlanning.tsx` 中添加资源负载可视化：

```typescript
// 资源负载数据类型
interface ResourceLoadData {
  date: string;
  resources: {
    id: string;
    name: string;
    color: string;
    load: number; // 百分比
    tasks: string[]; // 任务名称列表
  }[];
  totalLoad: number;
  isOverloaded: boolean;
}

// 资源负载图表组件
function ResourceLoadChart({ data }: { data: ResourceLoadData[] }) {
  // 使用堆叠柱状图展示每日资源负载
  // 超过100%的部分用红色警示
  // 悬停显示具体任务分配
}
```

#### 2.4.2 资源管理对话框

```typescript
// 资源管理对话框
function ResourceManagementDialog({ open, onClose }: Props) {
  // 资源列表（支持CRUD）
  // 资源类型筛选
  // 资源搜索
  // 批量操作
}

// 资源分配对话框
function ResourceAssignmentDialog({ itemId, open, onClose }: Props) {
  // 选择资源
  // 设置分配百分比
  // 设置日期范围（可选）
  // 添加备注
}
```

#### 2.4.3 资源冲突提示

```typescript
// 资源冲突警告组件
function ResourceConflictAlert({ conflicts }: { conflicts: ResourceConflict[] }) {
  // 显示冲突数量
  // 点击展开详情
  // 提供快速跳转到冲突任务
}

// 资源平衡建议组件
function BalanceSuggestions({ suggestions }: { suggestions: BalanceSuggestion[] }) {
  // 显示建议列表
  // 一键应用建议
  // 忽略建议
}
```

---

## 3. 实施步骤

### 步骤1：数据库Schema创建

1. 在 `drizzle/schema.ts` 中添加 `annualPlanningResources` 和 `annualPlanningResourceAssignments` 表
2. 运行 `pnpm db:push` 同步数据库
3. 验证表结构正确创建

**验收标准**：
- [ ] 两个新表成功创建
- [ ] 字段类型和约束正确
- [ ] 外键关系正确（如有）

### 步骤2：数据库函数实现

1. 在 `server/db.ts` 中实现资源CRUD函数
2. 实现资源分配CRUD函数
3. 实现资源负载计算函数
4. 实现冲突检测函数
5. 实现平衡建议函数

**验收标准**：
- [ ] 所有函数有完整的JSDoc注释
- [ ] 函数返回类型正确
- [ ] 错误处理完善

### 步骤3：API路由实现

1. 在 `server/routers.ts` 中添加 `resource` 路由
2. 添加 `resourceAssignment` 路由
3. 添加 `resourceLoad` 路由
4. 添加输入验证

**验收标准**：
- [ ] 所有API端点可正常调用
- [ ] 输入验证正确
- [ ] 错误响应格式统一

### 步骤4：单元测试编写

1. 创建 `server/v1.3.12-resource-load.test.ts`
2. 编写资源CRUD测试
3. 编写资源分配测试
4. 编写负载计算测试
5. 编写冲突检测测试

**测试用例清单**：

| 测试场景 | 描述 |
|----------|------|
| 资源创建 | 验证资源创建成功 |
| 资源更新 | 验证资源更新成功 |
| 资源删除 | 验证资源删除成功 |
| 资源分配创建 | 验证分配创建成功 |
| 资源分配更新 | 验证分配更新成功 |
| 资源分配删除 | 验证分配删除成功 |
| 负载计算-单资源 | 验证单个资源负载计算正确 |
| 负载计算-多资源 | 验证多个资源负载计算正确 |
| 负载计算-日期范围 | 验证指定日期范围计算正确 |
| 冲突检测-无冲突 | 验证无冲突时返回空数组 |
| 冲突检测-有冲突 | 验证检测到冲突时返回正确数据 |
| 平衡建议生成 | 验证建议生成逻辑正确 |

**验收标准**：
- [ ] 测试覆盖所有核心场景
- [ ] 所有测试通过
- [ ] 无跳过的测试

### 步骤5：前端开发

1. 在 `AnnualPlanning.tsx` 中添加资源负载Tab
2. 实现资源负载图表组件
3. 实现资源管理对话框
4. 实现资源分配对话框
5. 实现冲突提示和建议组件
6. 添加国际化翻译

**验收标准**：
- [ ] 资源负载图表正确渲染
- [ ] 资源管理CRUD功能正常
- [ ] 资源分配功能正常
- [ ] 冲突提示正确显示
- [ ] 平衡建议可正常使用

### 步骤6：集成测试

1. 在浏览器中测试完整流程
2. 验证数据流正确
3. 检查错误处理
4. 验证响应式布局

**验收标准**：
- [ ] 创建资源 → 分配到任务 → 查看负载图表 流程正常
- [ ] 过载时正确显示警告
- [ ] 建议功能可正常使用
- [ ] 移动端布局正常

---

## 4. 数据结构定义

### 4.1 资源负载计算结果

```typescript
interface ResourceLoadResult {
  date: string; // YYYY-MM-DD
  resourceId: string;
  resourceName: string;
  resourceColor: string;
  capacity: number; // 资源产能
  allocated: number; // 已分配百分比
  utilization: number; // 利用率 = allocated / capacity
  tasks: {
    itemId: string;
    itemName: string;
    allocation: number;
  }[];
  isOverloaded: boolean; // utilization > 100
}
```

### 4.2 资源冲突

```typescript
interface ResourceConflict {
  resourceId: string;
  resourceName: string;
  date: string;
  totalAllocation: number; // 总分配百分比
  overloadAmount: number; // 超载量
  conflictingTasks: {
    itemId: string;
    itemName: string;
    allocation: number;
  }[];
}
```

### 4.3 平衡建议

```typescript
interface BalanceSuggestion {
  type: "reduce" | "reassign" | "reschedule";
  priority: "high" | "medium" | "low";
  description: string;
  affectedResource: string;
  affectedTasks: string[];
  suggestedAction: string;
  estimatedImpact: string;
}
```

---

## 5. UI设计参考

### 5.1 资源负载图表

资源负载图表采用堆叠柱状图设计，横轴为日期，纵轴为负载百分比。每个资源用不同颜色表示，超过100%的部分用红色虚线标识。

**交互设计**：
- 悬停柱状图显示详细分配信息
- 点击柱状图跳转到对应日期的任务列表
- 支持日期范围筛选
- 支持资源筛选

### 5.2 资源管理界面

资源管理采用表格+对话框模式，支持：
- 资源列表展示（姓名、类型、部门、产能、状态）
- 新建/编辑资源对话框
- 批量删除
- 搜索和筛选

### 5.3 冲突提示

冲突提示采用Alert组件，显示在甘特图上方：
- 红色警告图标
- 冲突数量统计
- 点击展开详细冲突列表
- 快速跳转到冲突任务

---

## 6. 检查清单

### 6.1 代码检查

- [ ] 代码符合命名规范
- [ ] 包含必要的注释
- [ ] 无TypeScript类型错误
- [ ] 无ESLint警告

### 6.2 功能检查

- [ ] 资源CRUD功能正常
- [ ] 资源分配功能正常
- [ ] 负载计算正确
- [ ] 冲突检测正确
- [ ] 建议生成合理

### 6.3 测试检查

- [ ] 单元测试全部通过
- [ ] 测试覆盖核心场景
- [ ] 无跳过的测试用例

### 6.4 文档检查

- [ ] todo.md已更新
- [ ] CHANGELOG.md已更新
- [ ] 代码注释完整

---

## 7. 参考资源

### 7.1 现有代码参考

| 功能 | 文件路径 | 参考内容 |
|------|----------|----------|
| 关键路径计算 | `server/db.ts` | `calculateCriticalPath` 函数 |
| 依赖关系管理 | `server/db.ts` | `addItemDependency` 等函数 |
| 甘特图渲染 | `client/src/pages/AnnualPlanning.tsx` | 甘特图组件 |
| 对话框模式 | `client/src/pages/CostManagement.tsx` | 各种管理对话框 |

### 7.2 外部参考

- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [tRPC 文档](https://trpc.io/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Recharts 图表库](https://recharts.org/)

---

**文档版本**: 1.0  
**创建日期**: 2026-01-16  
**作者**: Manus AI
