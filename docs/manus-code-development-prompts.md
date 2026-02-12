# GRT 智能系统 Manus 代码开发提示指令

## 概述

本文档定义了在 GRT 智能系统开发过程中，Manus AI 代理应遵循的代码开发提示指令。这些指令确保开发过程的一致性、可维护性和高质量。

**文档版本**：v1.0  
**更新日期**：2026-01-30  
**适用范围**：GRT 智能系统 Drizzle ORM + tRPC + React 技术栈

---

## 一、技术栈规范

### 1.1 核心技术栈

当开发 GRT 智能系统功能时，必须使用以下技术栈：

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + Tailwind CSS 4 + shadcn/ui | 用户界面 |
| API | tRPC 11 | 类型安全 RPC |
| 后端 | Express 4 + Node.js 22 | HTTP 服务器 |
| ORM | Drizzle ORM | 数据库访问 |
| 数据库 | MySQL/TiDB | 关系型数据库 |
| 测试 | Vitest | 单元测试 |

### 1.2 禁止使用的技术

以下技术已被弃用，不应在新开发中使用：

- NocoBase（已标记为历史参考）
- 直接 SQL 查询（应使用 Drizzle ORM）
- Axios/fetch 包装器（应使用 tRPC）
- 手动 Cookie 处理（应使用 useAuth）

---

## 二、数据库开发指令

### 2.1 Schema 定义

```
当定义新的数据库表时：
1. 在 server/db/schema.ts 中使用 Drizzle ORM 定义
2. 表名使用 snake_case 和复数形式
3. 按功能模块添加前缀（如 crm_, pm_, hrm_）
4. 字段名使用 snake_case
5. 布尔字段以 is_ 或 has_ 开头
6. 时间字段以 _at 结尾
7. ID 字段以 _id 结尾
```

### 2.2 数据库操作

```
当执行数据库操作时：
1. 必须使用 requireDb() 助手函数处理 null 检查
2. 在 server/db.ts 中添加查询助手函数
3. 使用 Drizzle 的类型安全查询构建器
4. 运行 pnpm db:push 同步数据库变更
```

### 2.3 requireDb() 使用示例

```typescript
import { requireDb } from './utils/db-helpers';

export async function getEmployeeById(id: number) {
  const db = await requireDb();
  return db.query.employees.findFirst({
    where: eq(employees.id, id),
  });
}
```

---

## 三、tRPC API 开发指令

### 3.1 路由定义

```
当创建新的 API 端点时：
1. 在 server/routers.ts 或 server/routers/*.ts 中定义
2. 使用 publicProcedure 或 protectedProcedure
3. 使用 Zod 进行输入验证
4. 返回类型安全的响应
5. 使用 TRPCError 处理错误
```

### 3.2 输入验证

```
当定义 API 输入时：
1. 使用 Zod schema 进行验证
2. 为必填字段添加 .min() 或其他验证
3. 使用 .optional() 标记可选字段
4. 提供有意义的错误消息
```

### 3.3 错误处理

```
当处理 API 错误时：
1. 使用标准错误代码（AI_001 到 AI_008）
2. 抛出 TRPCError 而非普通 Error
3. 包含有意义的错误消息
4. 记录错误日志以便调试
```

---

## 四、前端开发指令

### 4.1 组件开发

```
当创建前端组件时：
1. 使用函数组件和 React Hooks
2. 使用 trpc.*.useQuery/useMutation 进行数据获取
3. 使用 useAuth() 获取认证状态
4. 使用 shadcn/ui 组件保持 UI 一致性
5. 处理 loading、error、empty 状态
```

### 4.2 避免常见错误

```
当编写前端代码时：
1. 避免在 render 中创建新对象作为查询输入（使用 useState/useMemo）
2. 不要在 render 阶段调用 setState/navigation（使用 useEffect）
3. 不要嵌套 anchor 标签
4. 确保 Select.Item 有非空 value
5. 配对使用 bg-* 和 text-*-foreground 类
```

### 4.3 tRPC 使用

```
当使用 tRPC 时：
1. 使用 useQuery 进行数据获取
2. 使用 useMutation 进行数据变更
3. 使用 invalidate 刷新缓存
4. 对列表操作使用乐观更新
5. 对关键操作使用 loading 状态
```

---

## 五、AI 助手开发指令

### 5.1 双层体系

```
当开发 AI 助手功能时：
1. 员工数字助手（DA）：命名为 {员工号}-DA
2. 功能型 AI 助手：按功能命名（solution, quotation, planning 等）
3. 支持两种执行模式：internal（快速）和 generative（深度）
```

### 5.2 LLM 集成

```
当集成 LLM 功能时：
1. 使用 invokeLLM() 助手函数
2. 只在服务端调用 LLM
3. 为不同助手类型配置不同的 system prompt
4. 使用 Streamdown 组件渲染 Markdown 响应
```

### 5.3 AI 建议面板

```
当实现 AI 建议功能时：
1. 支持三种建议模式：全过程、本过程、单步执行
2. 使用淡色显示不干扰主流程
3. 允许用户选择执行模式（internal/generative）
4. 记录 AI 执行日志用于效果追踪
```

---

## 六、能力系统开发指令

### 6.1 能力等级

```
当开发能力管理功能时：
1. 实现 L1-L5 能力等级
2. 能力升级必须基于证据驱动
3. 禁止主观手动升级
4. 自动收集和验证能力证据
```

### 6.2 能力域

```
当定义能力域时：
1. 技术能力（T）：专业技术知识
2. 系统理解（S）：整体系统把控
3. 交付能力（D）：项目执行
4. 客户价值（C）：创造客户价值
5. 知识沉淀（K）：知识传承
6. 领导力（L）：团队影响力
```

---

## 七、Tier 1 交付开发指令

### 7.1 红蓝对抗

```
当开发 Tier 1 交付功能时：
1. 实现红蓝对抗交付流程
2. 红队模拟客户和不确定性
3. 蓝队只能依赖系统响应
4. 触发条件：Tier 1 客户、高复杂度、跨区域
```

### 7.2 系统性学习

```
当实现问题管理功能时：
1. 记录问题根因分析
2. 定义预防措施
3. 更新系统约束
4. 确保"问题只允许发生一次"
```

---

## 八、测试开发指令

### 8.1 单元测试

```
当编写测试时：
1. 使用 Vitest 框架
2. 测试文件命名为 *.test.ts
3. 使用 describe/it/expect 结构
4. 在 beforeEach 中清理 mock
5. 测试成功和失败路径
```

### 8.2 测试覆盖

```
当完成功能开发时：
1. 必须编写对应的单元测试
2. 测试数据库查询函数
3. 测试 tRPC 路由逻辑
4. 测试业务服务函数
5. 运行 pnpm test 确保通过
```

---

## 九、开发工作流指令

### 9.1 标准流程

```
当开发新功能时：
1. 更新 server/db/schema.ts 定义表结构
2. 运行 pnpm db:push 同步数据库
3. 在 server/db.ts 添加查询助手
4. 在 server/routers.ts 定义 tRPC 路由
5. 在 client/src/pages/ 构建前端 UI
6. 在 server/*.test.ts 编写测试
7. 在浏览器中验证功能
```

### 9.2 检查清单

```
在提交功能前检查：
- [ ] Schema 已定义并推送
- [ ] 查询助手已添加
- [ ] tRPC 路由已创建
- [ ] 前端 UI 已实现
- [ ] 测试已编写并通过
- [ ] 功能已在浏览器验证
```

### 9.3 检查点保存

```
当完成重要功能时：
1. 更新 todo.md 标记完成项
2. 使用 webdev_save_checkpoint 保存
3. 提供有意义的检查点描述
4. 包含版本号和功能摘要
```

---

## 十、文档维护指令

### 10.1 NocoBase 文档

```
当遇到 NocoBase 相关文档时：
1. 这些文档已标记为"历史参考"
2. 业务需求和功能规范仍然有效
3. 技术实现应使用当前技术栈
4. 参考 NOCOBASE-LEGACY-NOTICE.md 了解详情
```

### 10.2 开发指南

```
当需要开发指导时：
1. 参考 grt-drizzle-trpc-development-guide.md
2. 遵循本文档的提示指令
3. 查阅架构决策记录了解设计决策
```

---

## 附录：快速参考

### A. 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 同步数据库 Schema |

### B. 关键文件

| 文件 | 说明 |
|------|------|
| `server/db/schema.ts` | 数据库 Schema 定义 |
| `server/db.ts` | 数据库查询助手 |
| `server/routers.ts` | tRPC 路由定义 |
| `server/utils/db-helpers.ts` | 数据库工具函数 |
| `client/src/lib/trpc.ts` | tRPC 客户端 |

### C. 错误代码

| 代码 | 说明 |
|------|------|
| AI_001 | LLM 调用失败 |
| AI_002 | 方案匹配失败 |
| AI_003 | 数据验证失败 |
| AI_004 | 权限不足 |
| AI_005 | 资源不存在 |
| AI_006 | 员工 DA 不存在 |
| AI_007 | 功能型助手配置错误 |
| AI_008 | AI 建议生成失败 |

---

*本文档由 GRT 智能系统架构迁移项目生成*
