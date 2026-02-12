# Windows Claude Code 安装与配置指南

> **版本**: 1.0  
> **更新日期**: 2026-01-18  
> **作者**: Manus AI

---

## 概述

Claude Code是Anthropic提供的AI编程助手，可以帮助开发者编写、调试和优化代码。本指南将详细说明如何在Windows系统上安装和配置Claude Code，以便与GRT智能系统开发工作流程集成。

---

## 1. 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10 64位 | Windows 11 |
| **Node.js** | 18.x 或更高 | 22.x LTS |
| **npm** | 9.x 或更高 | 10.x |
| **网络** | 稳定的互联网连接 | 低延迟连接 |
| **API密钥** | Anthropic API Key | - |

---

## 2. 前置条件

### 2.1 安装Node.js

如果尚未安装Node.js，请按以下步骤操作：

1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载LTS版本（推荐22.x）
3. 运行安装程序，选择默认选项
4. 验证安装：

```powershell
node --version
npm --version
```

### 2.2 获取Anthropic API密钥

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 注册或登录账户
3. 进入 **API Keys** 页面
4. 点击 **Create Key** 创建新密钥
5. 复制并安全保存密钥（密钥只显示一次）

> **重要**: API密钥是敏感信息，请勿分享或提交到代码仓库。

---

## 3. 安装Claude Code

### 3.1 方法一：使用npm全局安装（推荐）

打开PowerShell或命令提示符，执行：

```powershell
# 全局安装Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 验证安装
claude --version
```

### 3.2 方法二：使用npx运行（无需安装）

如果不想全局安装，可以使用npx直接运行：

```powershell
npx @anthropic-ai/claude-code --version
```

### 3.3 方法三：项目本地安装

在项目目录中安装：

```powershell
cd C:\your-project
npm install @anthropic-ai/claude-code

# 通过npx运行
npx claude --version
```

---

## 4. 配置API密钥

### 4.1 方法一：环境变量（推荐）

**临时设置（当前会话）：**

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-api03-your-api-key-here"
```

**永久设置（用户级别）：**

```powershell
# 使用PowerShell设置永久环境变量
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-api03-your-api-key-here", "User")

# 重启PowerShell后生效
```

**通过系统设置：**

1. 按 `Win + X`，选择"系统"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"用户变量"中点击"新建"
5. 变量名：`ANTHROPIC_API_KEY`
6. 变量值：`sk-ant-api03-your-api-key-here`
7. 点击"确定"保存

### 4.2 方法二：配置文件

创建配置文件 `~/.claude/config.json`：

```powershell
# 创建配置目录
mkdir $env:USERPROFILE\.claude -Force

# 创建配置文件
@"
{
  "api_key": "sk-ant-api03-your-api-key-here",
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096
}
"@ | Out-File -FilePath "$env:USERPROFILE\.claude\config.json" -Encoding UTF8
```

---

## 5. 验证安装

### 5.1 基本测试

```powershell
# 测试Claude Code是否正常工作
claude "Hello, can you help me understand how to use Claude Code?"
```

### 5.2 代码生成测试

```powershell
# 测试代码生成功能
claude "Write a simple Python function to calculate factorial"
```

### 5.3 项目分析测试

```powershell
# 在项目目录中测试
cd C:\nocobase
claude "Analyze the project structure and explain the main components"
```

---

## 6. 与GRT系统集成

### 6.1 初始化项目

在GRT项目目录中初始化Claude Code：

```powershell
cd C:\grt-implementation-plan
claude init
```

这将创建 `.claude` 目录，包含项目特定的配置。

### 6.2 创建自定义提示模板

创建文件 `C:\grt-implementation-plan\.claude\prompts\grt-assistant.md`：

```markdown
# GRT智能系统开发助手

你是GRT智能系统的开发助手，专注于工业清洗设备行业的企业管理系统开发。

## 系统背景

GRT系统是一个基于NocoBase的企业管理平台，包含以下核心模块：
- CRM客户关系管理
- 项目全生命周期管理（M0-M12阶段）
- 成本核算与报价系统
- AI辅助决策系统

## 开发规范

1. 使用TypeScript编写代码
2. 遵循tRPC路由规范
3. 使用Drizzle ORM进行数据库操作
4. 前端使用React + Tailwind CSS

## 任务要求

请根据用户的具体需求，提供：
1. 清晰的实现方案
2. 完整的代码示例
3. 必要的测试用例
4. 部署和配置说明
```

### 6.3 使用自定义提示

```powershell
claude --prompt grt-assistant "帮我实现一个项目阶段推进的API"
```

---

## 7. 常用命令

### 7.1 交互式对话

```powershell
# 开始交互式会话
claude chat

# 带上下文的对话
claude chat --context "我正在开发NocoBase插件"
```

### 7.2 代码审查

```powershell
# 审查特定文件
claude review server/routers.ts

# 审查整个目录
claude review server/ --recursive
```

### 7.3 代码生成

```powershell
# 生成代码到文件
claude generate "创建一个用户认证中间件" --output server/middleware/auth.ts

# 生成测试用例
claude generate "为auth.ts编写单元测试" --output server/auth.test.ts
```

### 7.4 代码解释

```powershell
# 解释代码
claude explain server/routers.ts

# 解释特定函数
claude explain "function handleAuth" --file server/auth.ts
```

---

## 8. 与Manus协作工作流

### 8.1 工作流概述

在GRT系统开发中，Claude Code与Manus协作的工作流程如下：

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus (规划/管理)                         │
│  1. 分析需求，制定开发计划                                    │
│  2. 分解任务，定义验收标准                                    │
│  3. 检查实现，验证功能                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓ 任务分配
┌─────────────────────────────────────────────────────────────┐
│                  Claude Code (实现/开发)                     │
│  1. 根据任务要求设计实现方案                                  │
│  2. 编写代码，创建测试                                        │
│  3. 调试修复，优化性能                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓ 提交验证
┌─────────────────────────────────────────────────────────────┐
│                    Manus (验证/反馈)                         │
│  1. 运行测试，检查结果                                        │
│  2. 验证功能是否满足需求                                      │
│  3. 通过则继续，否则反馈修改                                  │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 实践示例

**步骤1：Manus分配任务**

```
任务：实现AI助手对话历史持久化功能
验收标准：
- 创建ai_chat_sessions和ai_chat_messages表
- 实现CRUD API
- 编写单元测试
- 所有测试通过
```

**步骤2：Claude Code实现**

```powershell
claude chat
> 请帮我实现AI助手对话历史持久化功能，需要：
> 1. 创建数据库表schema
> 2. 实现tRPC路由
> 3. 编写单元测试
```

**步骤3：Manus验证**

```powershell
# 运行测试
pnpm test

# 检查功能
# 如果通过，继续下一个任务
# 如果失败，反馈给Claude Code修复
```

---

## 9. 故障排除

### 9.1 API密钥错误

**问题**: `Error: Invalid API key`

**解决**:
1. 检查API密钥是否正确
2. 确认环境变量已设置
3. 重启PowerShell

```powershell
# 检查环境变量
echo $env:ANTHROPIC_API_KEY
```

### 9.2 网络连接问题

**问题**: `Error: Network request failed`

**解决**:
1. 检查网络连接
2. 如果使用代理，配置代理设置

```powershell
# 设置代理（如需要）
$env:HTTPS_PROXY = "http://proxy.example.com:8080"
```

### 9.3 版本兼容问题

**问题**: `Error: Unsupported Node.js version`

**解决**:
1. 升级Node.js到18.x或更高版本
2. 使用nvm管理Node.js版本

```powershell
# 检查Node.js版本
node --version

# 如果版本过低，请重新安装最新LTS版本
```

---

## 10. 最佳实践

### 10.1 安全建议

- 永远不要将API密钥提交到代码仓库
- 使用环境变量或安全的密钥管理工具
- 定期轮换API密钥
- 监控API使用情况

### 10.2 效率建议

- 使用自定义提示模板提高一致性
- 利用上下文功能保持对话连贯
- 将常用命令创建为PowerShell别名
- 结合版本控制管理生成的代码

### 10.3 创建PowerShell别名

在PowerShell配置文件中添加别名：

```powershell
# 编辑PowerShell配置文件
notepad $PROFILE

# 添加以下内容
function grt-claude { claude --prompt grt-assistant $args }
function grt-review { claude review $args }
function grt-test { claude generate "编写测试" --output $args }
```

---

## 参考资料

1. [Anthropic Claude Documentation](https://docs.anthropic.com/claude/docs)
2. [Claude Code GitHub](https://github.com/anthropics/claude-code)
3. [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
4. [Node.js官方文档](https://nodejs.org/docs/)
