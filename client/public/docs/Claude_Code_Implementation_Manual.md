# Claude Code 实施手册

**版本**: 1.0  
**日期**: 2026年1月16日  
**作者**: Manus AI  
**状态**: 正式发布

---

## 1. 概述

本手册为Claude Code提供GRT智能系统开发的标准化实施指南。通过遵循本手册，Claude Code可以高效、准确地完成各模块的开发任务，确保代码质量和系统一致性。

---

## 2. 开发环境

### 2.1 项目基础信息

| 配置项 | 值 |
|--------|-----|
| 项目名称 | grt-implementation-plan |
| 项目路径 | /home/ubuntu/grt-implementation-plan |
| 开发服务器 | http://localhost:3000 |
| 数据库 | MySQL (TiDB) |
| 包管理器 | pnpm |

### 2.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.x |
| 样式框架 | Tailwind CSS | 4.x |
| UI组件库 | shadcn/ui | latest |
| 后端框架 | Express + tRPC | 4.x / 11.x |
| ORM | Drizzle ORM | 0.44.x |
| 测试框架 | Vitest | latest |
| 类型检查 | TypeScript | 5.9.x |

### 2.3 常用命令

```bash
# 启动开发服务器
pnpm dev

# 数据库迁移
pnpm db:push

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format
```

---

## 3. 模块开发流程

### 3.1 标准开发流程

每个功能模块的开发应遵循以下标准流程：

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 需求分析                                                │
│  - 阅读任务描述                                                  │
│  - 确认功能范围                                                  │
│  - 识别依赖关系                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 数据库Schema设计                                        │
│  - 在 drizzle/schema/ 创建或更新表定义                           │
│  - 运行 pnpm db:push 同步数据库                                  │
│  - 验证表结构正确                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: API开发                                                 │
│  - 在 server/routers/ 创建tRPC路由                               │
│  - 在 server/db/ 创建数据库操作函数                              │
│  - 添加输入验证 (Zod)                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: 测试编写                                                │
│  - 在 server/*.test.ts 编写单元测试                              │
│  - 运行 pnpm test 确保通过                                       │
│  - 覆盖正常和异常场景                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: 前端开发                                                │
│  - 在 client/src/pages/ 创建页面组件                             │
│  - 使用 shadcn/ui 组件                                           │
│  - 调用 trpc hooks 获取数据                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: 集成验证                                                │
│  - 在浏览器中测试功能                                            │
│  - 验证数据流正确                                                │
│  - 检查错误处理                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: 更新todo.md                                             │
│  - 标记已完成任务 [x]                                            │
│  - 添加新发现的任务 [ ]                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 文件创建顺序

开发新模块时，按以下顺序创建文件：

| 顺序 | 文件路径 | 说明 |
|------|----------|------|
| 1 | `drizzle/schema/{module}.ts` | 数据库表定义 |
| 2 | `server/db/{module}.ts` | 数据库操作函数 |
| 3 | `server/routers/{module}.ts` | tRPC路由定义 |
| 4 | `server/{module}.test.ts` | 单元测试 |
| 5 | `client/src/pages/{module}/` | 页面组件 |
| 6 | `client/src/components/business/{module}/` | 业务组件 |

---

## 4. 代码模板

### 4.1 数据库Schema模板

```typescript
// drizzle/schema/crm.ts
import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  date
} from "drizzle-orm/mysql-core";

/**
 * 客户表
 * 存储客户基本信息，是CRM模块的核心表
 */
export const crmCustomers = mysqlTable("crm_customers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  companyCode: varchar("company_code", { length: 50 }).unique(),
  industry: varchar("industry", { length: 100 }),
  region: varchar("region", { length: 100 }),
  customerType: mysqlEnum("customer_type", ["prospect", "active", "inactive", "lost"])
    .default("prospect")
    .notNull(),
  customerLevel: mysqlEnum("customer_level", ["A", "B", "C", "D"]),
  source: varchar("source", { length: 100 }),
  ownerId: varchar("owner_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrmCustomer = typeof crmCustomers.$inferSelect;
export type InsertCrmCustomer = typeof crmCustomers.$inferInsert;
```

### 4.2 数据库操作模板

```typescript
// server/db/crm.ts
import { db } from "./_core/db";
import { crmCustomers, type InsertCrmCustomer } from "../../drizzle/schema/crm";
import { eq, like, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// 分页查询参数类型
interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: string;
  level?: string;
}

// 分页查询结果类型
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取客户列表（分页）
 */
export async function getCustomers(
  params: ListParams,
  ownerId?: string
): Promise<PaginatedResult<CrmCustomer>> {
  const { page, pageSize, search, type, level } = params;
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  const conditions = [];
  if (search) {
    conditions.push(like(crmCustomers.companyName, `%${search}%`));
  }
  if (type) {
    conditions.push(eq(crmCustomers.customerType, type));
  }
  if (level) {
    conditions.push(eq(crmCustomers.customerLevel, level));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询数据
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(crmCustomers)
      .where(whereClause)
      .orderBy(desc(crmCustomers.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(crmCustomers)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 根据ID获取客户
 */
export async function getCustomerById(id: string): Promise<CrmCustomer | null> {
  const result = await db
    .select()
    .from(crmCustomers)
    .where(eq(crmCustomers.id, id))
    .limit(1);
  return result[0] ?? null;
}

/**
 * 创建客户
 */
export async function createCustomer(
  data: Omit<InsertCrmCustomer, "id" | "createdAt" | "updatedAt">
): Promise<CrmCustomer> {
  const id = uuidv4();
  await db.insert(crmCustomers).values({
    id,
    ...data,
  });
  return getCustomerById(id) as Promise<CrmCustomer>;
}

/**
 * 更新客户
 */
export async function updateCustomer(
  id: string,
  data: Partial<InsertCrmCustomer>
): Promise<{ success: boolean }> {
  await db
    .update(crmCustomers)
    .set(data)
    .where(eq(crmCustomers.id, id));
  return { success: true };
}

/**
 * 删除客户
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean }> {
  await db.delete(crmCustomers).where(eq(crmCustomers.id, id));
  return { success: true };
}
```

### 4.3 tRPC路由模板

```typescript
// server/routers/crm.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../db/crm";

// 输入验证Schema
const customerTypeEnum = z.enum(["prospect", "active", "inactive", "lost"]);
const customerLevelEnum = z.enum(["A", "B", "C", "D"]);

const listInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: customerTypeEnum.optional(),
  level: customerLevelEnum.optional(),
});

const createInputSchema = z.object({
  companyName: z.string().min(1, "公司名称不能为空").max(200),
  companyCode: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  customerType: customerTypeEnum.default("prospect"),
  customerLevel: customerLevelEnum.optional(),
  source: z.string().max(100).optional(),
});

const updateInputSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1).max(200).optional(),
  companyCode: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  customerType: customerTypeEnum.optional(),
  customerLevel: customerLevelEnum.optional(),
  source: z.string().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const crmRouter = router({
  customers: router({
    /**
     * 获取客户列表（分页）
     */
    list: protectedProcedure
      .input(listInputSchema)
      .query(async ({ input, ctx }) => {
        return getCustomers(input, ctx.user?.id?.toString());
      }),

    /**
     * 获取单个客户详情
     */
    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const customer = await getCustomerById(input.id);
        if (!customer) {
          throw new Error("客户不存在");
        }
        return customer;
      }),

    /**
     * 创建客户
     */
    create: protectedProcedure
      .input(createInputSchema)
      .mutation(async ({ input, ctx }) => {
        return createCustomer({
          ...input,
          ownerId: ctx.user?.id?.toString() ?? "",
        });
      }),

    /**
     * 更新客户
     */
    update: protectedProcedure
      .input(updateInputSchema)
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCustomer(id, data);
      }),

    /**
     * 删除客户
     */
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        return deleteCustomer(input.id);
      }),
  }),
});
```

### 4.4 测试模板

```typescript
// server/crm.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock数据库函数
vi.mock("./db/crm", () => ({
  getCustomers: vi.fn().mockResolvedValue({
    items: [
      {
        id: "test-uuid-1",
        companyName: "测试公司",
        companyCode: "TEST001",
        customerType: "active",
        customerLevel: "A",
        ownerId: "user-1",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }),
  getCustomerById: vi.fn().mockResolvedValue({
    id: "test-uuid-1",
    companyName: "测试公司",
    companyCode: "TEST001",
    customerType: "active",
    customerLevel: "A",
    ownerId: "user-1",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createCustomer: vi.fn().mockResolvedValue({
    id: "new-uuid",
    companyName: "新公司",
    customerType: "prospect",
    ownerId: "user-1",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateCustomer: vi.fn().mockResolvedValue({ success: true }),
  deleteCustomer: vi.fn().mockResolvedValue({ success: true }),
}));

// 创建测试上下文
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("CRM Customers API", () => {
  describe("customers.list", () => {
    it("should return paginated customer list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.list({
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].companyName).toBe("测试公司");
    });

    it("should filter by customer type", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.list({
        page: 1,
        pageSize: 20,
        type: "active",
      });

      expect(result).toBeDefined();
    });
  });

  describe("customers.get", () => {
    it("should return customer by id", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.get({
        id: "test-uuid-1",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("test-uuid-1");
      expect(result.companyName).toBe("测试公司");
    });
  });

  describe("customers.create", () => {
    it("should create new customer", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.create({
        companyName: "新公司",
        customerType: "prospect",
      });

      expect(result).toBeDefined();
      expect(result.companyName).toBe("新公司");
    });

    it("should validate required fields", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.crm.customers.create({
          companyName: "", // 空字符串应该失败
          customerType: "prospect",
        })
      ).rejects.toThrow();
    });
  });

  describe("customers.update", () => {
    it("should update customer", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.update({
        id: "test-uuid-1",
        companyName: "更新后的公司名",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("customers.delete", () => {
    it("should delete customer", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.crm.customers.delete({
        id: "test-uuid-1",
      });

      expect(result.success).toBe(true);
    });
  });
});
```

### 4.5 前端页面模板

```tsx
// client/src/pages/crm/CustomerList.tsx
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Edit,
  Trash2,
} from "lucide-react";

// 客户类型映射
const customerTypeMap = {
  prospect: { label: "潜在客户", variant: "secondary" as const },
  active: { label: "活跃客户", variant: "default" as const },
  inactive: { label: "非活跃", variant: "outline" as const },
  lost: { label: "流失", variant: "destructive" as const },
};

// 客户等级映射
const customerLevelMap = {
  A: { label: "A级", color: "text-green-500" },
  B: { label: "B级", color: "text-blue-500" },
  C: { label: "C级", color: "text-yellow-500" },
  D: { label: "D级", color: "text-gray-500" },
};

export default function CustomerList() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");

  // 获取客户列表
  const {
    data,
    isLoading,
    refetch,
  } = trpc.crm.customers.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    type: typeFilter || undefined,
    level: levelFilter || undefined,
  });

  // 删除客户
  const deleteMutation = trpc.crm.customers.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // 加载状态
  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              客户管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理和追踪所有客户信息
            </p>
          </div>
          <Link href="/crm/customers/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建客户
            </Button>
          </Link>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索客户名称..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="客户类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部类型</SelectItem>
              <SelectItem value="prospect">潜在客户</SelectItem>
              <SelectItem value="active">活跃客户</SelectItem>
              <SelectItem value="inactive">非活跃</SelectItem>
              <SelectItem value="lost">流失</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="客户等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部等级</SelectItem>
              <SelectItem value="A">A级</SelectItem>
              <SelectItem value="B">B级</SelectItem>
              <SelectItem value="C">C级</SelectItem>
              <SelectItem value="D">D级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>公司名称</TableHead>
                <TableHead>客户编号</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>行业</TableHead>
                <TableHead>区域</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link href={`/crm/customers/${customer.id}`}>
                      <span className="hover:underline cursor-pointer">
                        {customer.companyName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{customer.companyCode || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={customerTypeMap[customer.customerType]?.variant}>
                      {customerTypeMap[customer.customerType]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.customerLevel ? (
                      <span className={customerLevelMap[customer.customerLevel]?.color}>
                        {customerLevelMap[customer.customerLevel]?.label}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{customer.industry || "-"}</TableCell>
                  <TableCell>{customer.region || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/crm/customers/${customer.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("确定要删除这个客户吗？")) {
                            deleteMutation.mutate({ id: customer.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">暂无客户数据</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

---

## 5. 版本迭代任务清单

### 5.1 v1.1 CRM基础模块

| 任务ID | 任务描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| CRM-001 | 创建crm数据库Schema（customers, contacts, opportunities） | P0 | [ ] |
| CRM-002 | 实现客户CRUD API | P0 | [ ] |
| CRM-003 | 实现联系人CRUD API | P0 | [ ] |
| CRM-004 | 实现商机CRUD API | P0 | [ ] |
| CRM-005 | 编写CRM模块单元测试 | P0 | [ ] |
| CRM-006 | 客户列表页面 | P0 | [ ] |
| CRM-007 | 客户详情页面 | P0 | [ ] |
| CRM-008 | 客户表单组件（新建/编辑） | P0 | [ ] |
| CRM-009 | 联系人管理组件 | P1 | [ ] |
| CRM-010 | 商机列表页面 | P0 | [ ] |
| CRM-011 | 商机详情页面 | P0 | [ ] |
| CRM-012 | 商机漏斗图组件 | P1 | [ ] |
| CRM-013 | 添加CRM导航菜单 | P0 | [ ] |
| CRM-014 | 简道云客户数据迁移脚本 | P1 | [ ] |

### 5.2 v1.2 项目管理模块

| 任务ID | 任务描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| PM-001 | 创建project数据库Schema（projects, tasks, milestones） | P0 | [ ] |
| PM-002 | 实现项目CRUD API | P0 | [ ] |
| PM-003 | 实现任务CRUD API | P0 | [ ] |
| PM-004 | 实现里程碑API | P1 | [ ] |
| PM-005 | 编写项目管理模块单元测试 | P0 | [ ] |
| PM-006 | 项目列表页面 | P0 | [ ] |
| PM-007 | 项目详情页面（含任务列表） | P0 | [ ] |
| PM-008 | 项目表单组件 | P0 | [ ] |
| PM-009 | 任务看板组件（Kanban） | P1 | [ ] |
| PM-010 | 甘特图组件 | P1 | [ ] |
| PM-011 | M0-M12阶段切换组件 | P0 | [ ] |
| PM-012 | 添加项目管理导航菜单 | P0 | [ ] |

### 5.3 v2.0 AI集成模块

| 任务ID | 任务描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| AI-001 | 创建ai数据库Schema（chat_sessions, messages, bant_scores） | P0 | [ ] |
| AI-002 | 集成Gemini API | P0 | [ ] |
| AI-003 | 实现BANT评分API | P0 | [ ] |
| AI-004 | 实现AI对话API | P0 | [ ] |
| AI-005 | 编写AI模块单元测试 | P0 | [ ] |
| AI-006 | AI销售助手对话界面 | P0 | [ ] |
| AI-007 | BANT评分表单组件 | P0 | [ ] |
| AI-008 | AI推荐展示组件 | P1 | [ ] |
| AI-009 | 商机AI分析集成 | P1 | [ ] |

---

## 6. 常见问题处理

### 6.1 数据库迁移失败

```bash
# 问题：pnpm db:push 失败
# 解决：检查schema语法，确保表名和字段名正确

# 重置数据库（开发环境）
pnpm db:push --force
```

### 6.2 类型错误

```typescript
// 问题：tRPC类型不匹配
// 解决：确保输入Schema和数据库类型一致

// 使用Zod推断类型
type CreateInput = z.infer<typeof createInputSchema>;
```

### 6.3 测试失败

```bash
# 问题：测试无法运行
# 解决：确保mock正确设置

# 运行单个测试文件
pnpm test server/crm.test.ts

# 查看详细输出
pnpm test --reporter=verbose
```

---

## 7. 检查清单

每次提交代码前，请确认以下事项：

- [ ] 代码符合命名规范
- [ ] 数据库Schema已更新并推送
- [ ] API有完整的输入验证
- [ ] 单元测试已编写并通过
- [ ] 前端页面响应式适配
- [ ] 错误处理完善
- [ ] todo.md已更新

---

**文档结束**

*本手册由Manus AI生成，作为Claude Code实施GRT智能系统的标准化指南。*
