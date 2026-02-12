# GRT系统 - 文件导航索引

**使用说明：** 点击下方任意文件路径，可以在Manus Management UI中查看该文件。或在沙箱中使用 `cat` 或 `code` 命令查看。

---

## 🎯 核心配置文件

| 文件 | 路径 | 说明 |
|-----|------|------|
| 项目配置 | `package.json` | 依赖和脚本配置 |
| TypeScript配置 | `tsconfig.json` | TypeScript编译配置 |
| Vite配置 | `vite.config.ts` | 前端构建配置 |
| 数据库配置 | `drizzle.config.ts` | Drizzle ORM配置 |
| 测试配置 | `vitest.config.ts` | Vitest测试配置 |

---

## 📱 前端代码 (client/src/)

### 核心文件
| 文件 | 路径 | 说明 |
|-----|------|------|
| 应用主文件 | `client/src/App.tsx` | 路由和布局定义 |
| 应用入口 | `client/src/main.tsx` | React应用启动 |
| 全局样式 | `client/src/index.css` | 全局CSS和主题 |
| HTML模板 | `client/index.html` | HTML入口 |

### 页面 (client/src/pages/)
| 页面 | 路径 | 说明 |
|-----|------|------|
| 首页 | `client/src/pages/Home.tsx` | 系统首页 |
| 权限管理 | `client/src/pages/PermissionManagement.tsx` | 权限管理界面 |
| 访客申请 | `client/src/pages/VisitorRequestForm.tsx` | 访客申请表单 |
| AI助手 | `client/src/pages/AiAssistantPanel.tsx` | AI助手面板 |
| 能力管理 | `client/src/pages/CapabilityManagement.tsx` | 能力管理界面 |

### 组件 (client/src/components/)
| 组件 | 路径 | 说明 |
|-----|------|------|
| 侧边栏导航 | `client/src/components/Navigation/Sidebar.tsx` | 左侧菜单 |
| 侧边栏样式 | `client/src/components/Navigation/Sidebar.css` | 侧边栏CSS |
| 顶部导航 | `client/src/components/Navigation/Topbar.tsx` | 顶部菜单 |
| 顶部样式 | `client/src/components/Navigation/Topbar.css` | 顶部CSS |
| 仪表板布局 | `client/src/components/DashboardLayout.tsx` | 仪表板布局 |
| AI聊天框 | `client/src/components/AIChatBox.tsx` | AI聊天组件 |
| 地图组件 | `client/src/components/Map.tsx` | 地图集成 |

### Hooks (client/src/_core/hooks/)
| Hook | 路径 | 说明 |
|-----|------|------|
| 认证Hook | `client/src/_core/hooks/useAuth.ts` | 用户认证状态 |
| 权限Hook | `client/src/_core/hooks/usePermission.ts` | 权限检查 |
| 菜单Hook | `client/src/_core/hooks/useMenu.ts` | 菜单数据 |

### 库 (client/src/lib/)
| 库 | 路径 | 说明 |
|-----|------|------|
| tRPC客户端 | `client/src/lib/trpc.ts` | tRPC配置 |

---

## 🔧 后端代码 (server/)

### 核心服务 (server/_core/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 服务器入口 | `server/_core/index.ts` | Express服务器启动 |
| tRPC配置 | `server/_core/trpc.ts` | tRPC基础设置 |
| 上下文 | `server/_core/context.ts` | tRPC上下文 |
| OAuth处理 | `server/_core/oauth.ts` | OAuth认证流程 |
| LLM集成 | `server/_core/llm.ts` | LLM API调用 |
| 图片生成 | `server/_core/imageGeneration.ts` | 图片生成服务 |
| 语音转文本 | `server/_core/voiceTranscription.ts` | 语音识别 |
| 地图服务 | `server/_core/map.ts` | 地图API |
| 通知服务 | `server/_core/notification.ts` | 通知系统 |
| 数据API | `server/_core/dataApi.ts` | 数据查询API |

### 数据库 (server/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 数据库连接 | `server/db.ts` | 数据库初始化 |
| 文件存储 | `server/storage.ts` | S3文件存储 |

### 主路由 (server/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 路由聚合 | `server/routers.ts` | 所有路由的入口 |

### 权限系统 (server/permission-management/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 权限服务 | `server/permission-management/permission.service.ts` | 权限业务逻辑 |
| 权限中间件 | `server/permission-management/permission.middleware.ts` | 权限检查中间件 |
| 权限路由 | `server/permission-management/permission.router.ts` | 权限API |

### 菜单系统 (server/menu-management/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 菜单服务 | `server/menu-management/menu.service.ts` | 菜单业务逻辑 |
| 菜单路由 | `server/menu-management/menu.router.ts` | 菜单API |

### 访客系统 (server/visitor-management/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 访客服务 | `server/visitor-management/visitor.service.ts` | 访客申请逻辑 |
| 访客路由 | `server/visitor-management/visitor.router.ts` | 访客API |

### AI助手 (server/ai-assistants/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| AI助手服务 | `server/ai-assistants/ai-assistant.service.ts` | AI助手逻辑 |
| AI助手路由 | `server/ai-assistants/ai-assistant.router.ts` | AI助手API |

### 能力管理 (server/capability-management/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 能力服务 | `server/capability-management/capability.service.ts` | 能力管理逻辑 |
| 能力路由 | `server/capability-management/capability.router.ts` | 能力管理API |

### 工具函数 (server/utils/)
| 文件 | 路径 | 说明 |
|-----|------|------|
| 数据库助手 | `server/utils/db-helpers.ts` | 数据库辅助函数 |

---

## 🗄️ 数据库 (drizzle/)

| 文件 | 路径 | 说明 |
|-----|------|------|
| 主Schema | `drizzle/schema.ts` | 所有数据库表定义（6085行） |
| 权限Schema | `drizzle/permission-schema.ts` | 权限系统表 |
| 菜单Schema | `drizzle/menu-schema.ts` | 菜单系统表 |
| 访客Schema | `drizzle/visitor-request-schema.ts` | 访客申请表 |
| 表关系 | `drizzle/relations.ts` | 表之间的关系定义 |
| 数据库配置 | `drizzle.config.ts` | Drizzle配置 |

---

## 📚 共享代码 (shared/)

| 文件 | 路径 | 说明 |
|-----|------|------|
| 类型定义 | `shared/types.ts` | 共享TypeScript类型 |
| 常量定义 | `shared/const.ts` | 共享常量 |
| 错误定义 | `shared/_core/errors.ts` | 错误类型 |

---

## 📖 文档 (docs/)

| 文档 | 路径 | 说明 |
|-----|------|------|
| 权限架构 | `docs/permission-architecture.md` | 权限系统设计 |
| 菜单架构 | `docs/menu-navigation-architecture.md` | 菜单导航设计 |
| 菜单系统设计 | `docs/menu-system-design.md` | 菜单配置系统 |
| 访客系统规范 | `docs/visitor-request-system.md` | 访客申请流程 |
| 安装部署指南 | `docs/system-installation-guide.md` | 系统部署说明 |
| 开发指南 | `docs/grt-drizzle-trpc-development-guide.md` | 技术开发指南 |
| 开发提示 | `docs/manus-code-development-prompts.md` | 代码开发提示 |
| 技术规范 | `docs/claude-code-nocobase-technical-specification.md` | 技术规范文档 |
| 历史参考 | `docs/NOCOBASE-LEGACY-NOTICE.md` | 历史参考声明 |

---

## 📋 任务追踪

| 文件 | 路径 | 说明 |
|-----|------|------|
| 开发任务看板 | `todo.md` | 4126项任务追踪 |
| 备份清单 | `BACKUP-MANIFEST-v2.5.57.md` | 备份内容清单 |
| 文件导航 | `FILE-NAVIGATION-INDEX.md` | 本文件 |

---

## 🔍 快速查找

### 按功能查找

**权限系统相关文件：**
- Schema: `drizzle/schema.ts` (搜索 `users`, `roles`, `permissions`)
- 服务: `server/permission-management/permission.service.ts`
- API: `server/permission-management/permission.router.ts`
- UI: `client/src/pages/PermissionManagement.tsx`
- Hook: `client/src/_core/hooks/usePermission.ts`

**菜单导航相关文件：**
- Schema: `drizzle/menu-schema.ts`
- 服务: `server/menu-management/menu.service.ts`
- API: `server/menu-management/menu.router.ts`
- 组件: `client/src/components/Navigation/Sidebar.tsx`
- Hook: `client/src/_core/hooks/useMenu.ts`

**访客申请相关文件：**
- Schema: `drizzle/visitor-request-schema.ts`
- 服务: `server/visitor-management/visitor.service.ts`
- API: `server/visitor-management/visitor.router.ts`
- UI: `client/src/pages/VisitorRequestForm.tsx`

**AI助手相关文件：**
- Schema: `drizzle/schema.ts` (搜索 `employeeDigitalAssistants`)
- 服务: `server/ai-assistants/ai-assistant.service.ts`
- API: `server/ai-assistants/ai-assistant.router.ts`
- UI: `client/src/pages/AiAssistantPanel.tsx`

**能力管理相关文件：**
- Schema: `drizzle/schema.ts` (搜索 `employeeCapabilities`)
- 服务: `server/capability-management/capability.service.ts`
- API: `server/capability-management/capability.router.ts`
- UI: `client/src/pages/CapabilityManagement.tsx`

### 按技术栈查找

**前端React文件：**
- 页面: `client/src/pages/`
- 组件: `client/src/components/`
- Hooks: `client/src/_core/hooks/`
- 样式: `client/src/index.css`

**后端Express/tRPC文件：**
- 路由: `server/routers.ts`
- 服务: `server/*/service.ts`
- 中间件: `server/*/middleware.ts`
- 数据库: `server/db.ts`

**数据库Drizzle文件：**
- Schema定义: `drizzle/schema.ts`
- 分散Schema: `drizzle/*-schema.ts`
- 表关系: `drizzle/relations.ts`

---

## 📥 如何在Manus中查看文件

### 方法1：使用Management UI Code面板
1. 打开项目的Management UI
2. 点击左侧菜单中的"Code"
3. 在文件树中找到对应文件
4. 点击查看或下载

### 方法2：使用沙箱命令行
```bash
# 查看文件内容
cat /home/ubuntu/grt-implementation-plan/client/src/App.tsx

# 编辑文件
code /home/ubuntu/grt-implementation-plan/client/src/App.tsx

# 搜索文件
find /home/ubuntu/grt-implementation-plan -name "*.tsx" -type f
```

### 方法3：下载整个项目
在Management UI的Code面板中点击"Download all files"按钮

---

## 🎯 下一步建议

1. **查看权限系统** - 从 `docs/permission-architecture.md` 开始
2. **查看菜单系统** - 从 `docs/menu-system-design.md` 开始
3. **查看访客系统** - 从 `docs/visitor-request-system.md` 开始
4. **查看源代码** - 从 `server/routers.ts` 开始了解API结构

---

**最后更新：** 2026-01-30  
**文件总数：** 458个TypeScript文件  
**文档总数：** 9个Markdown文档
