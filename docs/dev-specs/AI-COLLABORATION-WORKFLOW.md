# GRT智能系统 AI协作开发工作流程指南

> **文档版本**: v1.0  
> **适用场景**: Windows 11本地服务器开发环境  
> **编写日期**: 2026-02-04  
> **作者**: Manus AI

---

## 概述

本文档详细定义了在Windows 11本地服务器环境中，使用Manus、Claude Code、ChatGPT和Gemini进行GRT智能系统开发的协作工作流程。通过明确各AI工具的职责分工和协作规范，确保开发过程的高效性和代码质量。

---

## 第一部分：AI工具角色与职责

### 1.1 角色分工矩阵

| AI工具 | 角色定位 | 核心职责 | 适用场景 |
|--------|----------|----------|----------|
| **Manus** | 项目经理/架构师 | 任务规划、需求分析、质量验收、整体协调 | 新功能规划、架构设计、代码审查、验收测试 |
| **Claude Code** | 开发工程师 | 代码实现、功能开发、Bug修复 | 编写业务逻辑、实现UI组件、API开发 |
| **ChatGPT** | 技术顾问 | 方案优化、技术咨询、代码审查 | 性能优化、架构讨论、最佳实践建议 |
| **Gemini** | 智能助手 | 系统内置AI功能、数据分析 | AI问答、智能报表、数据洞察 |

### 1.2 职责边界说明

**Manus的职责范围：**
- 接收和分析用户需求
- 制定开发计划和任务分解
- 协调各AI工具的工作
- 验证功能实现是否符合需求
- 管理代码版本和发布流程
- 维护项目文档和规范

**Claude Code的职责范围：**
- 根据Manus的设计实现代码
- 编写单元测试
- 修复Bug和代码重构
- 遵循项目编码规范
- 提交代码并说明变更内容

**ChatGPT的职责范围：**
- 提供技术方案建议
- 审查代码质量
- 分析性能问题
- 讨论架构优化方案
- 解答技术疑问

**Gemini的职责范围：**
- 提供系统内置的AI问答服务
- 执行数据分析任务
- 生成智能报表和洞察
- 支持自然语言交互功能

---

## 第二部分：标准开发流程

### 2.1 新功能开发流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     新功能开发标准流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  阶段1: 需求分析 (Manus)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 接收用户需求描述                                      │   │
│  │ 2. 分析需求可行性                                        │   │
│  │ 3. 评估工作量和影响范围                                  │   │
│  │ 4. 制定开发计划                                          │   │
│  │ 5. 更新todo.md任务清单                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  阶段2: 技术设计 (Manus + ChatGPT)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 设计数据库Schema（如需要）                            │   │
│  │ 2. 设计API接口规范                                       │   │
│  │ 3. 设计前端组件结构                                      │   │
│  │ 4. 与ChatGPT讨论技术方案（可选）                         │   │
│  │ 5. 确定实现细节                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  阶段3: 代码实现 (Claude Code)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 实现数据库Schema                                      │   │
│  │ 2. 实现后端API                                           │   │
│  │ 3. 实现前端页面                                          │   │
│  │ 4. 编写单元测试                                          │   │
│  │ 5. 本地测试验证                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  阶段4: 代码审查 (Manus + ChatGPT)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Manus验证功能是否符合需求                             │   │
│  │ 2. ChatGPT审查代码质量（可选）                           │   │
│  │ 3. 运行自动化测试                                        │   │
│  │ 4. 记录审查结果                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│                    ┌─────────────────┐                         │
│                    │   审查通过？     │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│              ┌──────────────┴──────────────┐                   │
│              ↓                              ↓                   │
│         ┌────────┐                    ┌────────┐               │
│         │   是   │                    │   否   │               │
│         └────┬───┘                    └────┬───┘               │
│              ↓                              ↓                   │
│  阶段5: 发布部署                    返回阶段3修复               │
│  ┌─────────────────────┐                                       │
│  │ 1. 保存检查点        │                                       │
│  │ 2. 更新todo.md       │                                       │
│  │ 3. 同步到生产环境    │                                       │
│  │ 4. 验证部署结果      │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Bug修复流程

```
1. 问题报告
   ↓
2. Manus分析问题原因
   ↓
3. Claude Code定位并修复
   ↓
4. 编写回归测试
   ↓
5. Manus验证修复
   ↓
6. 更新版本并部署
```

### 2.3 系统优化流程

```
1. 识别优化需求（性能/代码质量/用户体验）
   ↓
2. ChatGPT分析并提供优化方案
   ↓
3. Manus评估方案可行性
   ↓
4. Claude Code实施优化
   ↓
5. 性能测试验证
   ↓
6. Manus验收并发布
```

---

## 第三部分：Manus协作规范

### 3.1 与Manus沟通的最佳实践

**需求描述模板：**

```markdown
## 功能需求

### 需求背景
[描述为什么需要这个功能]

### 功能描述
[详细描述功能的具体内容]

### 预期效果
[描述功能实现后的预期效果]

### 验收标准
1. [验收条件1]
2. [验收条件2]
3. [验收条件3]

### 优先级
[高/中/低]

### 备注
[其他补充信息]
```

**Bug报告模板：**

```markdown
## Bug报告

### 问题描述
[简要描述问题]

### 复现步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

### 预期行为
[描述正确的行为应该是什么]

### 实际行为
[描述当前的错误行为]

### 环境信息
- 系统版本：
- 浏览器：
- 相关日志：

### 截图/录屏
[如有]
```

### 3.2 代码同步流程

**从本地推送到Manus：**

```powershell
# 1. 确保代码已提交到Git
git add .
git commit -m "feat: 功能描述"

# 2. 推送到GitHub
git push origin main

# 3. Manus通过GitHub集成自动同步
# 或在Manus平台手动触发同步
```

**从Manus拉取更新：**

```powershell
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖（如有）
pnpm install

# 3. 同步数据库结构（如有变更）
pnpm db:push

# 4. 重新构建
pnpm build

# 5. 重启服务
pm2 restart grt-system
```

### 3.3 版本管理规范

**版本号格式：** `v主版本.次版本.修订号`

- **主版本**：重大架构变更或不兼容更新
- **次版本**：新功能添加
- **修订号**：Bug修复和小改进

**提交信息规范：**

```
类型: 简短描述

[可选的详细描述]

[可选的关联issue]
```

类型包括：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

---

## 第四部分：Claude Code开发规范

### 4.1 开发环境配置

**VS Code推荐设置：**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**推荐扩展：**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- Claude Code

### 4.2 编码规范

**文件组织：**

```typescript
// 1. 导入顺序
// React/框架导入
import { useState, useEffect } from 'react';
// 第三方库
import { useQuery } from '@tanstack/react-query';
// 内部组件
import { Button } from '@/components/ui/button';
// 类型定义
import type { User } from '@/types';
// 样式
import './styles.css';

// 2. 组件结构
export function MyComponent({ prop1, prop2 }: Props) {
  // Hooks
  const [state, setState] = useState();
  
  // 副作用
  useEffect(() => {
    // ...
  }, []);
  
  // 事件处理
  const handleClick = () => {
    // ...
  };
  
  // 渲染
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**命名规范：**

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `user-management.tsx` |
| 组件名 | PascalCase | `UserManagement` |
| 函数名 | camelCase | `getUserById` |
| 常量名 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 类型名 | PascalCase | `UserProfile` |
| CSS类名 | kebab-case | `user-card` |

### 4.3 测试规范

**测试文件命名：** `*.test.ts` 或 `*.spec.ts`

**测试结构：**

```typescript
import { describe, it, expect } from 'vitest';

describe('功能模块名称', () => {
  describe('子功能', () => {
    it('应该正确处理正常情况', () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('应该正确处理边界情况', () => {
      // ...
    });
    
    it('应该正确处理错误情况', () => {
      // ...
    });
  });
});
```

---

## 第五部分：ChatGPT优化指南

### 5.1 代码审查请求模板

```markdown
## 代码审查请求

### 审查范围
[描述需要审查的代码范围]

### 关注点
- [ ] 代码质量和可读性
- [ ] 性能问题
- [ ] 安全漏洞
- [ ] 最佳实践
- [ ] 错误处理

### 代码片段
\`\`\`typescript
// 粘贴需要审查的代码
\`\`\`

### 上下文信息
[提供必要的背景信息]
```

### 5.2 性能优化请求模板

```markdown
## 性能优化请求

### 问题描述
[描述性能问题的表现]

### 性能指标
- 当前响应时间：
- 目标响应时间：
- 影响范围：

### 相关代码
\`\`\`typescript
// 粘贴相关代码
\`\`\`

### 已尝试的优化
[列出已经尝试过的优化方案]

### 约束条件
[列出任何技术或业务约束]
```

### 5.3 架构讨论请求模板

```markdown
## 架构讨论请求

### 当前架构
[描述当前的系统架构]

### 面临的挑战
[描述当前架构存在的问题]

### 改进目标
[描述期望达到的效果]

### 约束条件
- 技术约束：
- 时间约束：
- 资源约束：

### 初步方案（如有）
[描述已有的初步想法]
```

---

## 第六部分：Gemini集成指南

### 6.1 API调用示例

```typescript
// server/services/ai.service.ts
import { invokeLLM } from '../_core/llm';

export async function askGemini(question: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: '你是GRT智能系统的AI助手，专注于工业清洗设备领域。' },
      { role: 'user', content: question },
    ],
  });
  
  return response.choices[0].message.content;
}
```

### 6.2 结构化输出示例

```typescript
const structured = await invokeLLM({
  messages: [
    { role: 'system', content: '分析以下数据并返回JSON格式的结果。' },
    { role: 'user', content: data },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'analysis_result',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          insights: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
        required: ['summary', 'insights', 'recommendations'],
      },
    },
  },
});
```

---

## 第七部分：协作检查清单

### 7.1 功能开发检查清单

- [ ] 需求已明确并记录在todo.md
- [ ] 技术方案已确定
- [ ] 数据库Schema已设计（如需要）
- [ ] API接口已定义
- [ ] 前端组件已实现
- [ ] 单元测试已编写
- [ ] 代码已通过审查
- [ ] 功能已在测试环境验证
- [ ] 文档已更新
- [ ] 检查点已保存

### 7.2 代码提交检查清单

- [ ] 代码符合编码规范
- [ ] 所有测试通过
- [ ] 没有console.log调试语句
- [ ] 没有硬编码的敏感信息
- [ ] 提交信息符合规范
- [ ] 相关文档已更新

### 7.3 部署检查清单

- [ ] 所有依赖已安装
- [ ] 环境变量已配置
- [ ] 数据库已同步
- [ ] 构建成功完成
- [ ] 服务正常启动
- [ ] 健康检查通过
- [ ] 关键功能验证通过

---

## 附录：常用命令速查

```powershell
# 开发命令
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm test             # 运行测试
pnpm db:push          # 同步数据库

# Git命令
git status            # 查看状态
git add .             # 暂存所有更改
git commit -m "msg"   # 提交
git push              # 推送
git pull              # 拉取

# PM2命令
pm2 start             # 启动
pm2 restart           # 重启
pm2 logs              # 查看日志
pm2 status            # 查看状态
```

---

**文档结束**

*遵循本指南可确保AI协作开发的高效性和代码质量。*
