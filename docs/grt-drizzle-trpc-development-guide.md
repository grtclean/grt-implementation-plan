# GRT 智能系统开发指南

## Drizzle ORM + tRPC + React 技术栈

---

**文档版本**：v1.0  
**体系编号**：GRT-DEV-GUIDE-2026-001  
**更新日期**：2026-01-30  
**审核状态**：已批准  
**作者**：Manus AI

---

## 一、概述

本文档定义了 GRT 智能系统的开发规范和最佳实践，基于 **Drizzle ORM + tRPC + React** 技术栈。本指南整合了原 NocoBase 规划文档中的业务需求，并适配到当前技术架构。

### 1.1 技术栈概览

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| **前端框架** | React | 19.x | 用户界面构建 |
| **样式方案** | Tailwind CSS | 4.x | 原子化 CSS |
| **UI 组件库** | shadcn/ui + Radix UI | 最新 | 无障碍组件 |
| **状态管理** | TanStack Query | 5.x | 服务端状态 |
| **API 层** | tRPC | 11.x | 类型安全 RPC |
| **后端框架** | Express | 4.x | HTTP 服务器 |
| **ORM** | Drizzle ORM | 0.44.x | 类型安全数据库访问 |
| **数据库** | MySQL/TiDB | 8.x | 关系型数据库 |
| **测试框架** | Vitest | 最新 | 单元测试 |
| **运行时** | Node.js | 22.x | JavaScript 运行时 |

### 1.2 项目结构

```
grt-implementation-plan/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── _core/            # 核心功能（认证等）
│   │   ├── components/       # 可复用组件
│   │   ├── contexts/         # React Context
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── lib/              # 工具库（tRPC 客户端等）
│   │   ├── pages/            # 页面组件
│   │   ├── App.tsx           # 路由配置
│   │   ├── main.tsx          # 应用入口
│   │   └── index.css         # 全局样式
│   └── public/               # 静态资源
├── server/                    # 后端代码
│   ├── _core/                # 核心框架（OAuth、LLM 等）
│   ├── db/                   # 数据库相关
│   │   └── schema.ts         # Drizzle Schema 定义
│   ├── services/             # 业务服务层
│   ├── utils/                # 工具函数
│   ├── routers.ts            # tRPC 路由定义
│   ├── db.ts                 # 数据库查询助手
│   └── storage.ts            # S3 存储助手
├── drizzle/                   # Drizzle 配置
│   ├── schema.ts             # Schema 导出
│   ├── relations.ts          # 关系定义
│   └── migrations/           # 数据库迁移
├── shared/                    # 前后端共享代码
│   ├── types.ts              # 共享类型定义
│   └── const.ts              # 共享常量
└── docs/                      # 文档目录
```

---

## 二、数据库开发规范

### 2.1 Schema 定义规范

所有数据库表定义位于 `server/db/schema.ts`，使用 Drizzle ORM 的类型安全 Schema 定义。

#### 2.1.1 表命名规范

| 规范 | 说明 | 示例 |
|------|------|------|
| 小写字母和下划线 | 使用 snake_case | `grt_employees`, `project_milestones` |
| 模块前缀 | 按功能模块添加前缀 | `crm_leads`, `pm_tasks`, `hrm_employees` |
| 复数形式 | 表名使用复数 | `users`, `projects`, `equipments` |

#### 2.1.2 字段命名规范

| 规范 | 说明 | 示例 |
|------|------|------|
| snake_case | 所有字段使用下划线分隔 | `employee_id`, `created_at` |
| 布尔字段前缀 | 以 `is_` 或 `has_` 开头 | `is_active`, `has_permission` |
| 时间字段后缀 | 以 `_at` 结尾 | `created_at`, `updated_at`, `deleted_at` |
| ID 字段后缀 | 以 `_id` 结尾 | `employee_id`, `project_id` |
| 代码字段后缀 | 以 `_code` 结尾 | `assistant_code`, `step_code` |

#### 2.1.3 Schema 定义示例

```typescript
// server/db/schema.ts
import { mysqlTable, int, varchar, text, timestamp, tinyint, json, mysqlEnum, decimal } from 'drizzle-orm/mysql-core';

// 员工数字助手表
export const employeeDigitalAssistants = mysqlTable('grt_employee_digital_assistants', {
  id: int().autoincrement().primaryKey(),
  employeeId: varchar('employee_id', { length: 32 }).notNull(),
  assistantCode: varchar('assistant_code', { length: 64 }).notNull(),
  displayName: varchar('display_name', { length: 128 }),
  learningData: json('learning_data'),
  capabilities: json('capabilities'),
  isActive: tinyint('is_active').default(1).notNull(),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 功能型 AI 助手表
export const functionalAiAssistants = mysqlTable('grt_functional_ai_assistants', {
  id: int().autoincrement().primaryKey(),
  assistantType: mysqlEnum('assistant_type', [
    'solution', 'quotation', 'planning', 'kpi',
    'interview', 'purchase', 'engineering', 'quality'
  ]).notNull(),
  assistantCode: varchar('assistant_code', { length: 64 }).notNull(),
  displayName: varchar('display_name', { length: 128 }),
  description: text('description'),
  systemPrompt: text('system_prompt'),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.7'),
  maxTokens: int('max_tokens').default(2000),
  capabilities: json('capabilities'),
  isActive: tinyint('is_active').default(1).notNull(),
  version: varchar('version', { length: 16 }).default('1.0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
```

### 2.2 数据库操作规范

#### 2.2.1 使用 requireDb() 助手函数

由于 `getDb()` 返回 `Promise<Database | null>`，所有数据库操作必须使用 `requireDb()` 助手函数处理 null 检查：

```typescript
// server/utils/db-helpers.ts
import { getDb } from '../db';

export async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
}
```

#### 2.2.2 查询示例

```typescript
// server/db.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireDb } from './utils/db-helpers';
import { employeeDigitalAssistants, functionalAiAssistants } from './db/schema';

// 获取员工数字助手
export async function getEmployeeDA(employeeId: string) {
  const db = await requireDb();
  return db.query.employeeDigitalAssistants.findFirst({
    where: eq(employeeDigitalAssistants.employeeId, employeeId),
  });
}

// 获取所有活跃的功能型助手
export async function getActiveFunctionalAssistants() {
  const db = await requireDb();
  return db.query.functionalAiAssistants.findMany({
    where: eq(functionalAiAssistants.isActive, 1),
    orderBy: [desc(functionalAiAssistants.updatedAt)],
  });
}

// 创建员工数字助手
export async function createEmployeeDA(data: {
  employeeId: string;
  displayName?: string;
  capabilities?: object;
}) {
  const db = await requireDb();
  const assistantCode = `${data.employeeId}-DA`;
  
  const [result] = await db.insert(employeeDigitalAssistants).values({
    employeeId: data.employeeId,
    assistantCode,
    displayName: data.displayName,
    capabilities: data.capabilities,
  });
  
  return { id: result.insertId, assistantCode };
}
```

### 2.3 数据库迁移

使用 Drizzle Kit 管理数据库迁移：

```bash
# 生成迁移文件并执行迁移
pnpm db:push

# 该命令等同于：
# drizzle-kit generate && drizzle-kit migrate
```

---

## 三、tRPC API 开发规范

### 3.1 路由定义规范

所有 tRPC 路由定义位于 `server/routers.ts` 或按模块拆分到 `server/routers/` 目录。

#### 3.1.1 路由结构

```typescript
// server/routers.ts
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import * as db from './db';

export const appRouter = router({
  // 公开路由（无需认证）
  health: publicProcedure.query(() => ({ status: 'ok' })),
  
  // 受保护路由（需要认证）
  employeeDA: router({
    // 获取当前用户的数字助手
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmployeeDA(ctx.user.openId);
    }),
    
    // 创建数字助手
    create: protectedProcedure
      .input(z.object({
        displayName: z.string().optional(),
        capabilities: z.object({
          taskAssist: z.boolean().default(true),
          scheduleManage: z.boolean().default(true),
          documentDraft: z.boolean().default(false),
          dataAnalysis: z.boolean().default(false),
          communicationProxy: z.boolean().default(false),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createEmployeeDA({
          employeeId: ctx.user.openId,
          ...input,
        });
      }),
    
    // 更新数字助手
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        displayName: z.string().optional(),
        capabilities: z.object({}).passthrough().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateEmployeeDA(input.id, input);
      }),
  }),
  
  // 功能型 AI 助手
  functionalAssistant: router({
    list: protectedProcedure.query(async () => {
      return db.getActiveFunctionalAssistants();
    }),
    
    getByType: protectedProcedure
      .input(z.object({
        type: z.enum([
          'solution', 'quotation', 'planning', 'kpi',
          'interview', 'purchase', 'engineering', 'quality'
        ]),
      }))
      .query(async ({ input }) => {
        return db.getFunctionalAssistantByType(input.type);
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

#### 3.1.2 输入验证规范

使用 Zod 进行输入验证，确保类型安全：

```typescript
// 复杂输入验证示例
const solutionRecommendInput = z.object({
  // 必填参数
  product: z.string().min(1, '产品类型不能为空'),
  cleanlinessLevel: z.string(),
  cycleTime: z.number().positive('节拍时间必须为正数'),
  loadingUnloadingForm: z.string(),
  
  // 可选参数
  workpieceDimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  specialRequirements: z.array(z.string()).optional(),
  budgetRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
  }).optional(),
});
```

### 3.2 错误处理规范

```typescript
import { TRPCError } from '@trpc/server';

// 标准错误代码
const ErrorCodes = {
  AI_001: 'LLM 调用失败',
  AI_002: '方案匹配失败',
  AI_003: '数据验证失败',
  AI_004: '权限不足',
  AI_005: '资源不存在',
  AI_006: '员工 DA 不存在',
  AI_007: '功能型助手配置错误',
  AI_008: 'AI 建议生成失败',
} as const;

// 抛出业务错误
throw new TRPCError({
  code: 'NOT_FOUND',
  message: ErrorCodes.AI_006,
  cause: { employeeId },
});

// 抛出权限错误
throw new TRPCError({
  code: 'FORBIDDEN',
  message: ErrorCodes.AI_004,
});
```

---

## 四、前端开发规范

### 4.1 组件开发规范

#### 4.1.1 页面组件结构

```tsx
// client/src/pages/EmployeeDAPage.tsx
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function EmployeeDAPage() {
  const { user, isAuthenticated } = useAuth();
  
  // 使用 tRPC 查询
  const { data: myDA, isLoading, error } = trpc.employeeDA.getMine.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  // 使用 tRPC 变更
  const createDA = trpc.employeeDA.create.useMutation({
    onSuccess: () => {
      // 刷新数据
      trpc.useUtils().employeeDA.getMine.invalidate();
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-destructive p-4">
        加载失败：{error.message}
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>我的数字助手</CardTitle>
        </CardHeader>
        <CardContent>
          {myDA ? (
            <div>
              <p>助手代码：{myDA.assistantCode}</p>
              <p>显示名称：{myDA.displayName}</p>
            </div>
          ) : (
            <Button
              onClick={() => createDA.mutate({ displayName: `${user?.name}的助手` })}
              disabled={createDA.isPending}
            >
              {createDA.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建数字助手
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4.1.2 避免无限循环

```tsx
// ❌ 错误：每次渲染创建新对象，导致无限查询
const { data } = trpc.items.getByDate.useQuery({
  date: new Date(), // 新对象每次渲染
});

// ✅ 正确：使用 useState 初始化一次
const [date] = useState(() => new Date());
const { data } = trpc.items.getByDate.useQuery({ date });

// ✅ 正确：使用 useMemo 稳定引用
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.items.getByIds.useQuery({ ids });
```

### 4.2 AI 建议面板组件

根据业务需求，实现 AI 建议面板组件：

```tsx
// client/src/components/AISuggestionPanel.tsx
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, Play, Database } from 'lucide-react';

interface AISuggestionPanelProps {
  processType: 'project' | 'crm' | 'hrm' | 'cost' | 'training';
  processId: string;
  currentStep?: string;
}

export function AISuggestionPanel({ processType, processId, currentStep }: AISuggestionPanelProps) {
  const [executionMode, setExecutionMode] = useState<'internal' | 'generative'>('internal');
  
  // 获取全过程建议
  const fullProcessSuggestions = trpc.aiSuggestion.getFullProcess.useQuery({
    processType,
    processId,
  });
  
  // 获取当前步骤建议
  const currentStepSuggestion = trpc.aiSuggestion.getCurrentStep.useQuery(
    { processType, processId, stepCode: currentStep! },
    { enabled: !!currentStep }
  );
  
  // 执行单步 AI 任务
  const executeSingleAction = trpc.aiSuggestion.executeSingleAction.useMutation();
  
  return (
    <Card className="bg-primary/5 border-l-4 border-l-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-primary/70 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI 智能建议
          </CardTitle>
          
          {/* 执行模式选择 */}
          <Select value={executionMode} onValueChange={(v) => setExecutionMode(v as 'internal' | 'generative')}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>系统内 AI</span>
                  <Badge variant="secondary" className="text-xs">快速</Badge>
                </div>
              </SelectItem>
              <SelectItem value="generative">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  <span>泛互式 AI</span>
                  <Badge variant="outline" className="text-xs">深度</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 当前步骤建议 */}
        {currentStepSuggestion.data && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">{currentStepSuggestion.data.stepName}</p>
            <p>{currentStepSuggestion.data.suggestion.summary}</p>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10"
            onClick={() => fullProcessSuggestions.refetch()}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI 全过程建议
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10"
            onClick={() => currentStepSuggestion.refetch()}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            本过程建议
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10"
            onClick={() => {
              if (currentStep) {
                executeSingleAction.mutate({
                  processType,
                  processId,
                  stepCode: currentStep,
                  actionId: 'default',
                  mode: executionMode,
                });
              }
            }}
            disabled={!currentStep || executeSingleAction.isPending}
          >
            <Play className="h-3 w-3 mr-1" />
            AI 执行
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 五、AI 助手体系架构

### 5.1 双层 AI 助手体系

GRT 智能系统采用双层 AI 助手体系架构：

#### 5.1.1 第一层：员工数字助手（DA）

每个员工可配置专属的数字助手，命名规则为 `{员工号}-DA`。

| 员工类型 | 员工号格式 | DA 命名示例 | 说明 |
|----------|------------|-------------|------|
| 普通员工 | E001, E002 | E001-DA, E002-DA | 通用员工数字助手 |
| 项目经理 | PM001, PM002 | PM001-DA, PM002-DA | 项目管理专属助手 |
| 销售人员 | SA001, SA002 | SA001-DA, SA002-DA | 销售支持专属助手 |
| 技术工程师 | TE001, TE002 | TE001-DA, TE002-DA | 技术支持专属助手 |
| 质量工程师 | QE001, QE002 | QE001-DA, QE002-DA | 质量管理专属助手 |

#### 5.1.2 第二层：功能型 AI 助手

无真实员工的岗位设定功能型 AI 助手，按功能命名：

| 助手类型 | 英文标识 | 中文名称 | 功能定位 |
|----------|----------|----------|----------|
| solution | AI Solution Assistant | AI 方案助手 | 方案设计和解决方案推荐 |
| quotation | AI Quotation Assistant | AI 报价助手 | 报价生成和成本分析 |
| planning | AI Planning Assistant | AI 规划助手 | 工作计划、培训计划、客户拜访计划 |
| kpi | AI KPI Assistant | AI 绩效助手 | 绩效评估、实时评分、沟通建议 |
| interview | AI Interview Assistant | AI 面试助手 | 面试评估和候选人分析 |
| purchase | AI Purchase Assistant | AI 采购助手 | 采购管理和供应商协调 |
| engineering | AI Engineering Assistant | AI 工程助手 | M0-M12 项目全生命周期管理 |
| quality | AI Quality Assistant | AI 质量助手 | 质量检验和问题分析 |

### 5.2 AI 执行模式

#### 5.2.1 模式定义

| 模式 | 英文标识 | 特点 | 适用场景 |
|------|----------|------|----------|
| **系统内 AI** | `internal` | 轻度 AI，基于案例库，快速响应 | 日常任务、标准流程 |
| **泛互式 AI** | `generative` | 深度推理，创新建议 | 复杂决策、方案设计 |

#### 5.2.2 模式对比

| 维度 | 系统内 AI | 泛互式 AI |
|------|-----------|-----------|
| **知识来源** | 案例库、历史数据、SOP | LLM 通用知识 + 案例库 |
| **响应时间** | <2 秒 | 5-30 秒 |
| **Token 消耗** | 低（500-1000） | 高（2000-8000） |
| **结果特点** | 标准化、可预测 | 创新性、多样化 |

### 5.3 LLM 集成

使用预配置的 LLM 助手进行 AI 功能开发：

```typescript
// server/services/ai-assistant.service.ts
import { invokeLLM } from '../_core/llm';

export async function generateAISuggestion(
  assistantType: string,
  mode: 'internal' | 'generative',
  content: string,
  context?: object
) {
  const config = await getAssistantConfig(assistantType);
  
  const systemPrompt = mode === 'internal' 
    ? config.internalPrompt 
    : config.generativePrompt;
  
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ content, context }) },
    ],
    ...(mode === 'generative' && { 
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  
  return response.choices[0].message.content;
}
```

---

## 六、能力操作系统（Capability OS）

### 6.1 核心概念

GRT 智能系统的架构被定义为"能力操作系统"，而非简单的 HRM、项目和服务系统组合。

#### 6.1.1 能力等级（L1-L5）

| 等级 | 名称 | 说明 |
|------|------|------|
| L1 | 入门级 | 基础技能，需要指导 |
| L2 | 熟练级 | 独立完成标准任务 |
| L3 | 专家级 | 解决复杂问题，指导他人 |
| L4 | 资深级 | 创新方案，跨领域整合 |
| L5 | 大师级 | 行业领先，战略规划 |

#### 6.1.2 能力域定义

| 能力域 | 代码 | 说明 |
|--------|------|------|
| 技术能力 | T | 专业技术知识和技能 |
| 系统理解 | S | 对整体系统的理解和把控 |
| 交付能力 | D | 项目交付和执行能力 |
| 客户价值 | C | 创造客户价值的能力 |
| 知识沉淀 | K | 知识总结和传承能力 |
| 领导力 | L | 团队领导和影响力 |

### 6.2 证据驱动升级

能力升级必须基于可验证的"能力证据"，禁止主观手动升级：

```typescript
// server/services/capability.service.ts
export interface CapabilityEvidence {
  type: 'project_completion' | 'service_delivery' | 'quality_result' | 'customer_feedback';
  sourceId: string;
  sourceName: string;
  evidenceData: object;
  verifiedAt: Date;
  verifiedBy: string;
}

export async function evaluateCapabilityUpgrade(
  employeeId: string,
  capabilityDomain: string
): Promise<{
  currentLevel: number;
  eligibleForUpgrade: boolean;
  evidences: CapabilityEvidence[];
  missingRequirements: string[];
}> {
  // 获取员工当前能力等级
  const currentCapability = await getEmployeeCapability(employeeId, capabilityDomain);
  
  // 获取升级所需证据
  const requiredEvidences = getUpgradeRequirements(currentCapability.level + 1);
  
  // 收集员工的能力证据
  const collectedEvidences = await collectCapabilityEvidences(employeeId, capabilityDomain);
  
  // 评估是否满足升级条件
  const { eligible, missing } = evaluateEvidences(requiredEvidences, collectedEvidences);
  
  return {
    currentLevel: currentCapability.level,
    eligibleForUpgrade: eligible,
    evidences: collectedEvidences,
    missingRequirements: missing,
  };
}
```

---

## 七、Tier 1 交付系统

### 7.1 红蓝对抗交付

对于 Tier 1 客户和高复杂度项目，必须执行红蓝对抗交付流程：

| 角色 | 职责 |
|------|------|
| **红队** | 模拟客户和不确定性，挑战交付方案 |
| **蓝队** | 只能依赖系统响应，验证交付能力 |

#### 7.1.1 触发条件

- Tier 1 客户项目
- 高复杂度非标项目
- 跨区域交付项目

#### 7.1.2 流程实现

```typescript
// server/services/delivery.service.ts
export interface RedBlueConfrontation {
  projectId: string;
  redTeamFindings: Array<{
    category: 'technical' | 'process' | 'resource' | 'timeline';
    description: string;
    severity: 'critical' | 'major' | 'minor';
    simulatedScenario: string;
  }>;
  blueTeamResponses: Array<{
    findingId: string;
    systemResponse: string;
    manualIntervention: boolean;
    resolutionTime: number; // 分钟
  }>;
  overallAssessment: {
    passed: boolean;
    systemReadiness: number; // 0-100
    identifiedGaps: string[];
    recommendations: string[];
  };
}

export async function initiateRedBlueConfrontation(projectId: string): Promise<RedBlueConfrontation> {
  const project = await getProjectById(projectId);
  
  // 验证是否需要红蓝对抗
  if (!requiresRedBlueConfrontation(project)) {
    throw new Error('项目不满足红蓝对抗触发条件');
  }
  
  // 创建红蓝对抗记录
  return createRedBlueConfrontation(projectId);
}
```

### 7.2 系统性学习机制

实现"问题只允许发生一次"的系统性学习：

```typescript
// server/services/learning.service.ts
export interface SystemicLearning {
  issueId: string;
  issueDescription: string;
  rootCause: string;
  preventiveMeasures: Array<{
    type: 'process' | 'system' | 'training' | 'tool';
    description: string;
    implementedAt: Date;
    verifiedBy: string;
  }>;
  systemUpdates: Array<{
    component: string;
    changeDescription: string;
    changeType: 'constraint' | 'validation' | 'automation';
  }>;
}

export async function recordSystemicLearning(
  issueId: string,
  learning: Omit<SystemicLearning, 'issueId'>
): Promise<void> {
  // 记录学习内容
  await saveSystemicLearning({ issueId, ...learning });
  
  // 更新相关系统约束
  for (const update of learning.systemUpdates) {
    await applySystemConstraint(update);
  }
  
  // 通知相关人员
  await notifyStakeholders(issueId, learning);
}
```

---

## 八、测试规范

### 8.1 单元测试

使用 Vitest 框架编写单元测试：

```typescript
// server/services/employee-da.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEmployeeDA, getEmployeeDA, updateEmployeeDA } from './employee-da.service';

describe('EmployeeDAService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('createEmployeeDA', () => {
    it('should generate correct DA code from employee ID', async () => {
      const result = await createEmployeeDA({
        employeeId: 'E001',
        displayName: '测试助手',
      });
      
      expect(result.assistantCode).toBe('E001-DA');
    });
    
    it('should create DA with default capabilities', async () => {
      const result = await createEmployeeDA({
        employeeId: 'E002',
      });
      
      expect(result.capabilities).toEqual({
        taskAssist: true,
        scheduleManage: true,
        documentDraft: false,
        dataAnalysis: false,
        communicationProxy: false,
      });
    });
  });
  
  describe('getEmployeeDA', () => {
    it('should return null for non-existent employee', async () => {
      const result = await getEmployeeDA('NON_EXISTENT');
      expect(result).toBeNull();
    });
  });
});
```

### 8.2 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test server/services/employee-da.test.ts

# 监视模式
pnpm test --watch
```

---

## 九、部署规范

### 9.1 环境变量

系统预定义的环境变量（无需手动配置）：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | 数据库连接字符串 |
| `JWT_SECRET` | 会话 Cookie 签名密钥 |
| `VITE_APP_ID` | Manus OAuth 应用 ID |
| `OAUTH_SERVER_URL` | Manus OAuth 后端 URL |
| `BUILT_IN_FORGE_API_URL` | Manus 内置 API URL |
| `BUILT_IN_FORGE_API_KEY` | Manus 内置 API 密钥 |

### 9.2 地理位置部署建议

根据客户分布，建议以下部署策略：

| 区域 | 推荐云服务 | 数据中心位置 |
|------|------------|--------------|
| 欧洲 | AWS EU / Azure EU | 法兰克福 / 阿姆斯特丹 |
| 北美 | AWS US / Azure US | 弗吉尼亚 / 俄勒冈 |
| 亚太 | AWS AP / 阿里云 | 新加坡 / 上海 |

### 9.3 发布流程

1. 完成功能开发和测试
2. 使用 `webdev_save_checkpoint` 保存检查点
3. 在管理 UI 中点击"发布"按钮
4. 验证生产环境功能

---

## 十、开发工作流

### 10.1 标准开发循环

1. **更新 Schema**：在 `server/db/schema.ts` 中定义表结构
2. **推送迁移**：运行 `pnpm db:push` 同步数据库
3. **添加查询助手**：在 `server/db.ts` 中添加数据库查询函数
4. **定义 tRPC 路由**：在 `server/routers.ts` 中添加 API 端点
5. **构建前端 UI**：使用 tRPC hooks 调用 API
6. **编写测试**：在 `server/*.test.ts` 中添加单元测试
7. **验证功能**：在浏览器中测试成功和错误路径

### 10.2 功能检查清单

- [ ] 数据库表已在 `server/db/schema.ts` 中定义
- [ ] 迁移已推送（`pnpm db:push`）
- [ ] 查询助手已添加到 `server/db.ts`
- [ ] tRPC 路由已创建（选择 `public` 或 `protected`）
- [ ] 前端通过 `trpc.*.useQuery/useMutation` 调用 API
- [ ] 成功和错误路径已在浏览器中验证
- [ ] 单元测试已编写并通过

---

## 附录 A：常见问题

### A.1 TypeScript 编译错误

**问题**：`TS2339: Property 'xxx' does not exist on type`

**解决方案**：检查字段名是否与 Schema 定义一致，确保使用 camelCase 而非 snake_case。

**问题**：`TS18047: 'xxx' is possibly 'null'`

**解决方案**：使用 `requireDb()` 助手函数处理数据库连接的 null 检查。

### A.2 数据库连接问题

**问题**：数据库连接超时

**解决方案**：
1. 检查 `DATABASE_URL` 环境变量
2. 确保数据库服务正在运行
3. 检查网络连接和防火墙设置

---

## 附录 B：参考文档

- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [tRPC 文档](https://trpc.io/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [shadcn/ui 组件](https://ui.shadcn.com/)

---

## 更新记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-01-30 | v1.0 | 初始版本，整合 NocoBase 业务需求到新技术栈 |

---

*本文档由 GRT 智能系统架构迁移项目生成*
