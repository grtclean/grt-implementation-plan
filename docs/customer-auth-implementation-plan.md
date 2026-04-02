# 客户注册/登录 + 权限裁剪 + 工作台整合 Showcase — 实施计划

> 文档版本: 2026-03-26 v1.0
> 状态: 分析完成 · 待实施
> 作者: CTO Architecture Review

---

## 一、现有架构分析

### 1.1 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React | 19.2.1 |
| 路由 | Wouter | 3.3.5 |
| 状态管理 | Zustand | 5.0.12 |
| UI组件 | shadcn/ui + Radix | - |
| 样式 | Tailwind CSS | 4.1.14 |
| 构建 | Vite | 7.1.7 |
| HTTP/RPC | tRPC (client+server) | 11.6.0 |
| 后端 | Express | 4.21.2 |
| ORM | Drizzle ORM | 0.44.7 |
| 数据库 | PostgreSQL | - |
| 认证 | 自定义 JWT (jose) | 6.1.0 |

### 1.2 认证系统

**认证模式**: 本地 JWT (非 OAuth)

```
用户输入 username + password
    ↓
POST /api/auth/login
    ↓
验证 bcrypt hash (loginMethod = "local:{hash}")
    ↓
签发 JWT → Set-Cookie: app_session_id (HttpOnly, 1年有效)
    ↓
前端 useAuth() 调用 GET /api/auth/me → 获取用户信息 + effectiveRole + maxLevel
```

**关键文件**:
- `server/_core/local-auth.ts` — 登录/注册/改密/me 端点
- `client/src/_core/hooks/useAuth.ts` — 前端 auth 单例 store
- `client/src/components/RequireAuth.tsx` — 路由守卫
- `shared/const.ts` — Cookie 名称 `app_session_id`, 有效期 `ONE_YEAR_MS`
- `server/_core/context.ts` — tRPC context 创建 (从 cookie 解析 user)

**JWT payload**: `{ openId, appId: "local", name, exp }`

**用户查找逻辑** (local-auth.ts:134-141):
1. 先按 `openId` 精确匹配 (员工号如 GRT112)
2. 回退按 email 模糊匹配 (`{username}@grt-group.com`)

### 1.3 用户 & 角色体系

**用户表**: `users` (drizzle/schema.ts)
- 关键字段: `id`, `openId`, `name`, `email`, `loginMethod`, `role`, `languagePreference`

**RBAC 表** (drizzle/permission-schema.ts):
- `grt_roles` — 16个角色定义 (name, display_name, level 0-10)
- `grt_user_roles` — userId → roleId 映射 (varchar user_id = openId)

**已存在的客户角色**:
- `customer` — level 0, 客户代表
- `guest` — level 0, 访客

**前端角色体系** (client/src/contexts/UserProfileContext.tsx):
- 24个 UserRole 类型 (含 `customer`, `guest`)
- `ROLE_HIERARCHY` 映射 role → level (0-10)
- `ProfileSwitcher` 按 `maxLevel` 过滤可选角色

### 1.4 路由守卫

**公开页面白名单** (RequireAuth.tsx:146 + App.tsx:641-642):
```typescript
STANDALONE_PATHS = ['/login', '/login-success', '/gateway', '/kiosk', ...]
STANDALONE_PREFIXES = ['/showcase/', '/showroom', '/guest/', '/customer-portal/', '/client-portal/', ...]
```

**ProtectedRoute 模式**:
```tsx
<Route path="/protected-page">
  <ProtectedRoute component={PageComponent} />
</Route>
```

公开页面 (`/showcase/*`, `/client-portal/*`) 不经过 ProtectedRoute，直接渲染。

### 1.5 Showcase 路由现状

| 路由 | 组件 | 认证 | 类型 |
|------|------|------|------|
| `/showcase/:industry` | ShowcasePortal | 公开 | 参数化 (die-casting/ice/new-energy/fuel-injection) |
| `/showcase/company-intro` | CompanyIntroVDO | 公开 | 独立 |
| `/showcase/supplier-conference/:token` | SupplierConferenceView | Token 门控 | 独立 |
| `/guest/showcase/:token` | GuestCloudHall | Token 门控 | V-VIP |
| `/client-portal/meilixin-vip` | MeilixinVipPortal | 公开 | 独立 |
| `/client-portal/:slug` | AluminumCastingVipPortal | 公开 | 参数化 |
| `/showcase-hub` | ShowcaseHub | 员工登录 | 侧边栏 |
| `/customer-digital-twin` | CustomerDigitalTwinPortal | 员工登录 | 侧边栏 |

**Token 门控机制** (guest_authorizations 表):
- 64字符 hex token, 有过期时间和最大查看次数
- 后端通过 `targetedShowcase.guestLink.*` 管理
- 前端 GuestCloudHall 通过 URL `:token` 参数自验证

### 1.6 菜单数据来源

**纯静态配置**: `client/src/config/menuConfig.ts`
- 非 API 驱动, 非数据库
- 按 `superCategory` 分组: portal / strategy / operations / resources
- 支持字段: `allowedRoles`, `minLevel`, `requiresBU`, `isNew`, `isSandbox`
- 菜单过滤在 `Layout.tsx` 中按当前 `currentUserRole` 动态裁剪

### 1.7 工作台 (Home 页)

**文件**: `client/src/pages/Home.tsx`
- 本地认证模式: 未登录 → 重定向 `/login`
- 已登录 → 显示 `LiveDashboard` (个人工作台)
- 无客户专属逻辑

---

## 二、需求拆解

### 2.1 客户注册/登录

**目标**: 外部客户 (美利信/旭升/爱柯迪等) 可自主注册并登录系统
**最小改动方案**:

| 改动 | 文件 | 侵入性 |
|------|------|--------|
| 开放客户注册端点 | `server/_core/local-auth.ts` | 低 — 新增 `/api/auth/customer-register` 端点, 不动现有 `/register` |
| 客户注册页 | 新建 `client/src/pages/CustomerLogin.tsx` | 零侵入 — 新文件 |
| 自动分配 customer 角色 | `server/_core/local-auth.ts` | 低 — 注册时 insert grt_user_roles |
| 客户登录路由 | `App.tsx` 新增 `/customer-login` 路由 | 低 |

**不需要改的**:
- JWT 签发逻辑 (复用现有)
- Cookie 机制 (复用现有)
- 前端 useAuth() (复用现有)
- RequireAuth (复用现有, `/customer-portal/` 已在白名单)

### 2.2 客户权限裁剪

**目标**: customer 角色用户只看到限定模块
**最小改动方案**:

| 改动 | 文件 | 侵入性 |
|------|------|--------|
| 客户专属菜单 | `menuConfig.ts` 新增 customer 分组 | 低 |
| 菜单过滤逻辑 | `Layout.tsx` 已有 allowedRoles 过滤 | 零改动 |
| 路由权限 | `UserProfileContext.tsx` 已有 `canAccessRoute()` | 零改动 |
| 后端 RBAC | `permission-schema.ts` customer 角色已存在 (level 0) | 零改动 |

**客户可见模块** (建议):
- 个人项目看板 (从 VIP Portal 演化)
- 质量报告查看
- 设备报修提交
- FAT 数字孪生验收
- 反馈提交
- Showcase 浏览

### 2.3 工作台整合 Showcase

**目标**: 客户登录后, 工作台集成 showcase 内容 (行业方案/产品展示/案例)
**最小改动方案**:

| 改动 | 文件 | 侵入性 |
|------|------|--------|
| 客户 Home 页 | 新建 `client/src/pages/CustomerHome.tsx` | 零侵入 |
| Home 路由判断 | `Home.tsx` 增加 role 判断 → 重定向 | 极低 |
| Showcase 卡片复用 | 引用现有 ShowcasePortal 组件 | 零改动 |

---

## 三、关键文件清单

### 必须修改的文件

| # | 文件 | 改动类型 | 优先级 |
|---|------|---------|--------|
| 1 | `server/_core/local-auth.ts` | 新增客户注册端点 | P0 |
| 2 | `client/src/App.tsx` | 新增 2 条路由 | P0 |
| 3 | `client/src/config/menuConfig.ts` | 新增客户菜单分组 | P1 |

### 必须新建的文件

| # | 文件 | 说明 | 优先级 |
|---|------|------|--------|
| 1 | `client/src/pages/CustomerLogin.tsx` | 客户注册/登录页 | P0 |
| 2 | `client/src/pages/CustomerHome.tsx` | 客户工作台 | P1 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `useAuth.ts` | 复用现有 singleton auth store |
| `RequireAuth.tsx` | `/customer-portal/` 已在白名单 |
| `UserProfileContext.tsx` | customer 角色已定义 (level 0) |
| `permission-schema.ts` | customer 角色已存在 |
| `drizzle/schema.ts` | users 表结构足够 |
| `drizzle/showcase-schema.ts` | 现有 showcase 表足够 |

---

## 四、实施阶段划分

### Phase 1: 客户注册/登录 (1天)

```
1. server/_core/local-auth.ts
   ├── 新增 POST /api/auth/customer-register
   ├── 输入: companyName, contactName, email, phone, password
   ├── 自动创建 users 记录 (role="user", openId=email)
   ├── 自动分配 grt_user_roles (roleId = customer)
   └── 返回: { success, openId }

2. client/src/pages/CustomerLogin.tsx
   ├── 注册表单 (公司名/联系人/邮箱/手机/密码)
   ├── 登录表单 (复用现有 /api/auth/login)
   └── 品牌化 UI (GRT + 客户门户标识)

3. client/src/App.tsx
   ├── 新增: const CustomerLogin = React.lazy(...)
   ├── 新增: <Route path="/customer-login" component={CustomerLogin} />
   └── 加入 STANDALONE_PATHS
```

### Phase 2: 客户权限裁剪 (0.5天)

```
1. client/src/config/menuConfig.ts
   └── 新增 customer 专属菜单组:
       ├── 我的项目 (/customer-portal/my-projects)
       ├── 质量报告 (/customer-portal/quality)
       ├── 设备报修 (/customer-portal/service)
       ├── FAT验收 (/customer-digital-twin)
       └── 行业方案 (/showcase/die-casting 等)

2. client/src/pages/Home.tsx (极小改动)
   └── if (user.effectiveRole === "customer") navigate("/customer-portal/home")
```

### Phase 3: 客户工作台 (1天)

```
1. client/src/pages/CustomerHome.tsx
   ├── 复用 AluminumCastingVipPortal 的组件
   ├── 动态获取客户自己的项目/质量/服务数据
   ├── 集成 showcase 卡片 (行业方案入口)
   └── 集成报修/反馈入口
```

### Phase 4: 数据打通 (后续)

```
1. 客户-项目关联表 (新建)
2. 客户可见项目过滤 (后端)
3. 质量数据客户视角 (后端)
4. 通知系统 (邮件/站内)
```

---

## 五、潜在风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 客户注册后能看到内部页面 | 高 | Phase 2 菜单裁剪 + allowedRoles 过滤 |
| openId 冲突 (客户邮箱 vs 员工号) | 中 | 客户 openId 用 `c:{email}` 前缀 |
| 客户直接访问内部 URL | 中 | 后端 tRPC requirePermission 已防护 |
| 密码安全 (客户自注册) | 低 | 复用现有密码规则 (8+字符) |
| 现有 Showcase 公开页面变需登录 | 高 | **不改** — 保持 /showcase/* 公开, 登录后多看到"我的项目"等私有模块 |

---

## 六、下一步建议

### 立即可做 (本次已完成)
- [x] 项目结构分析
- [x] 关键文件定位
- [x] 实施计划文档

### 下一步优先改的文件 (Phase 1)
1. **`server/_core/local-auth.ts`** — 新增客户注册端点 (约50行代码)
2. **`client/src/pages/CustomerLogin.tsx`** — 新建客户登录页 (约200行)
3. **`client/src/App.tsx`** — 新增 1 条路由 + 1 个 lazy import (2行)

### 不要先动的文件
- `menuConfig.ts` — 等 Phase 1 登录跑通后再裁剪菜单
- `Home.tsx` — 等 Phase 2 菜单就绪后再加重定向
- 任何数据库 schema — 现有表结构足够支撑 Phase 1-3

---

## 附录: 数据流图

```
客户注册
  POST /api/auth/customer-register
    ├── INSERT users (openId=c:{email}, role=user)
    ├── INSERT grt_user_roles (userId=c:{email}, roleId=customer)
    └── 返回 { success }

客户登录
  POST /api/auth/login (复用现有)
    ├── 查找 users WHERE openId = input
    ├── 验证 bcrypt hash
    ├── 签发 JWT → Set-Cookie
    └── 返回 { success, mustChangePassword: false }

客户访问系统
  GET /api/auth/me (复用现有)
    ├── 验证 JWT
    ├── 查询 grt_user_roles → effectiveRole = "customer"
    ├── maxLevel = 0
    └── 返回 { user, effectiveRole, maxLevel }

前端路由
  useAuth() → user.effectiveRole === "customer"
    ├── Home.tsx → 重定向 /customer-portal/home
    ├── ProfileSwitcher → 只显示 customer/guest (level ≤ 0)
    └── menuConfig → 过滤出 customer 允许的菜单项
```
