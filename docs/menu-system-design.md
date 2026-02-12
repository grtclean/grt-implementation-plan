# GRT系统菜单架构设计文档

## 目录
1. [菜单架构概述](#菜单架构概述)
2. [两级菜单结构](#两级菜单结构)
3. [菜单配置系统](#菜单配置系统)
4. [权限集成](#权限集成)
5. [实现规范](#实现规范)

---

## 菜单架构概述

### 设计目标
- **清晰的导航层级**：一级菜单（主类别）+ 二级菜单（功能项）
- **完整的功能覆盖**：所有100+个功能模块都有明确的菜单入口
- **权限驱动的显示**：根据用户角色动态显示菜单项
- **易于维护和扩展**：集中配置，易于添加新功能

### 菜单分类原则
菜单项按照**业务域**和**用户角色**进行分类，确保用户能快速找到所需功能。

---

## 两级菜单结构

### 一级菜单分类（11个主类别）

| 菜单名称 | 英文名 | 图标 | 权限要求 | 描述 |
|---------|--------|------|---------|------|
| 📊 首页 | Dashboard | Home | public | 系统首页和概览 |
| 👥 CRM管理 | CRM | Users | user | 客户关系管理 |
| 📋 项目管理 | Projects | Briefcase | user | 项目和交付管理 |
| 💰 财务管理 | Finance | DollarSign | user | 成本预算和报表 |
| 👨‍💼 人力资源 | HRM | Users | user | 人事和培训管理 |
| 🎯 能力管理 | Capabilities | Target | user | 能力等级和证书 |
| 🏭 生产制造 | Manufacturing | Factory | user | 生产和质量管理 |
| 🔧 系统配置 | Settings | Settings | admin | 系统设置和规则 |
| 📚 知识库 | Knowledge | BookOpen | user | 文档和帮助 |
| 🤖 AI助手 | AI | Zap | user | AI功能和工具 |
| 👤 个人中心 | Profile | User | user | 用户个人设置 |

### 二级菜单详细结构

#### 1. 📊 首页 (Dashboard)
```
├── 系统概览 (Overview) - 首页
├── 我的任务 (My Tasks) - 任务看板
├── 数据分析 (Analytics) - 分析仪表盘
└── 快速链接 (Quick Links) - 常用功能
```

#### 2. 👥 CRM管理 (CRM)
```
├── 客户管理 (Customers) - 客户列表
├── 商机管理 (Opportunities) - 商机管道
├── 联系人管理 (Contacts) - 联系人
├── 线索管理 (Leads) - 线索评分
├── 跟进记录 (Follow-ups) - 跟进管理
└── CRM报表 (Reports) - 销售分析
```

#### 3. 📋 项目管理 (Projects)
```
├── 项目列表 (Projects) - 项目管理
├── 项目详情 (Details) - 项目详情
├── 里程碑 (Milestones) - 里程碑管理
├── Gate管理 (Gates) - 阶段门禁
├── 交付管理 (Delivery) - 交付追踪
└── 项目报表 (Reports) - 项目分析
```

#### 4. 💰 财务管理 (Finance)
```
├── 成本管理 (Cost) - 成本预算
├── 预算管理 (Budget) - 预算规划
├── 报表管理 (Reports) - 财务报表
├── 预警规则 (Alerts) - 成本预警
├── 报表调度 (Scheduler) - 定时报表
└── 导入管理 (Import) - 数据导入
```

#### 5. 👨‍💼 人力资源 (HRM)
```
├── 议程管理 (Agenda) - 会议日程
├── 培训管理 (Training) - 培训计划
├── 年度规划 (Annual) - 年度计划
├── 合规管理 (Compliance) - 合规检查
├── 出差管理 (Travel) - 出差申请
├── 报销管理 (Expense) - 报销审批
└── HR报表 (Reports) - HR分析
```

#### 6. 🎯 能力管理 (Capabilities)
```
├── 能力等级 (Levels) - 能力评级
├── 能力证书 (Certificates) - 证书管理
├── 证据提交 (Evidence) - 证据上传
├── 能力路径 (Paths) - 发展路径
├── 团队分析 (Team) - 团队能力
└── 排行榜 (Leaderboard) - 能力排行
```

#### 7. 🏭 生产制造 (Manufacturing)
```
├── 生产仪表板 (Dashboard) - 生产概览
├── 工人管理 (Workers) - 工人管理
├── 质量管理 (QC) - 质量检查
├── UWB管理 (UWB) - 位置追踪
├── 交付追踪 (Delivery) - M1/M7-M9
└── 制造报表 (Reports) - 生产分析
```

#### 8. 🔧 系统配置 (Settings)
```
├── 权限管理 (Permissions) - 角色权限
├── 菜单管理 (Menu) - 菜单配置
├── 访客申请 (Visitors) - 来访管理
├── 规则配置 (Rules) - 命名规则
├── Webhook配置 (Webhooks) - 集成配置
├── 任务调度 (Scheduler) - 定时任务
└── 系统日志 (Logs) - 审计日志
```

#### 9. 📚 知识库 (Knowledge)
```
├── 文档中心 (Docs) - 文档阅读
├── 开发指南 (Guide) - 开发规范
├── 系统指南 (System) - 系统说明
├── 帮助中心 (Help) - 常见问题
├── 部署规范 (Deployment) - 部署指南
└── 笔记搜索 (Search) - 知识搜索
```

#### 10. 🤖 AI助手 (AI)
```
├── AI助手中心 (Hub) - 助手管理
├── 数字助手 (Digital) - DA配置
├── AI诊断 (Diagnostic) - 系统诊断
├── 效果追踪 (Effectiveness) - 效果分析
├── 模型管理 (Models) - 模型配置
└── AI报表 (Reports) - AI分析
```

#### 11. 👤 个人中心 (Profile)
```
├── 个人信息 (Profile) - 个人资料
├── 账户设置 (Settings) - 账户管理
├── 通知设置 (Notifications) - 通知配置
├── 我的证书 (Certificates) - 我的证书
└── 登出 (Logout) - 退出登录
```

---

## 菜单配置系统

### 菜单配置数据结构

```typescript
// 菜单项接口
interface MenuItem {
  id: string;                    // 唯一标识
  label: string;                 // 显示文本
  labelEn: string;              // 英文文本
  icon: string;                 // 图标名称
  path?: string;                // 路由路径
  children?: MenuItem[];        // 子菜单
  permissions?: string[];       // 需要的权限
  roles?: string[];             // 需要的角色
  visible?: boolean;            // 是否显示
  order?: number;               // 排序
  description?: string;         // 描述
  badge?: string;               // 徽章（如"New"）
}

// 菜单配置文件
interface MenuConfig {
  version: string;
  lastUpdated: string;
  menus: MenuItem[];
}
```

### 菜单配置文件示例

```typescript
// client/src/config/menu-config.ts
export const menuConfig: MenuConfig = {
  version: '1.0.0',
  lastUpdated: '2026-01-30',
  menus: [
    {
      id: 'dashboard',
      label: '首页',
      labelEn: 'Dashboard',
      icon: 'Home',
      path: '/',
      order: 1,
      children: [
        {
          id: 'overview',
          label: '系统概览',
          labelEn: 'Overview',
          icon: 'BarChart3',
          path: '/dashboard/overview',
          permissions: ['view_dashboard'],
        },
        // ... 其他子菜单
      ],
    },
    // ... 其他一级菜单
  ],
};
```

---

## 权限集成

### 权限检查逻辑

```typescript
// 菜单项是否对当前用户可见
function isMenuItemVisible(
  menuItem: MenuItem,
  userPermissions: string[],
  userRoles: string[]
): boolean {
  // 1. 检查显示标志
  if (menuItem.visible === false) {
    return false;
  }

  // 2. 检查权限
  if (menuItem.permissions && menuItem.permissions.length > 0) {
    const hasPermission = menuItem.permissions.some(p => 
      userPermissions.includes(p)
    );
    if (!hasPermission) {
      return false;
    }
  }

  // 3. 检查角色
  if (menuItem.roles && menuItem.roles.length > 0) {
    const hasRole = menuItem.roles.some(r => 
      userRoles.includes(r)
    );
    if (!hasRole) {
      return false;
    }
  }

  return true;
}
```

### 权限定义

| 权限 | 描述 | 默认角色 |
|------|------|---------|
| `view_dashboard` | 查看首页 | user |
| `manage_crm` | 管理CRM | user |
| `manage_projects` | 管理项目 | user |
| `manage_finance` | 管理财务 | manager |
| `manage_hrm` | 管理人力资源 | manager |
| `manage_capabilities` | 管理能力 | user |
| `manage_manufacturing` | 管理生产 | manager |
| `manage_system` | 管理系统 | admin |
| `manage_visitors` | 管理访客 | admin |
| `manage_permissions` | 管理权限 | admin |

---

## 实现规范

### 1. 菜单组件实现

```typescript
// client/src/components/Navigation/Menu.tsx
export function Menu() {
  const { user } = useAuth();
  const userPermissions = useUserPermissions(user?.id);
  const userRoles = user?.roles || [];

  // 过滤可见的菜单项
  const visibleMenus = menuConfig.menus.filter(menu =>
    isMenuItemVisible(menu, userPermissions, userRoles)
  );

  return (
    <nav className="menu">
      {visibleMenus.map(menu => (
        <MenuItem key={menu.id} item={menu} />
      ))}
    </nav>
  );
}
```

### 2. 菜单项组件

```typescript
// client/src/components/Navigation/MenuItem.tsx
export function MenuItem({ item }: { item: MenuItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="menu-item">
      <Link to={item.path || '#'}>
        <Icon name={item.icon} />
        <span>{item.label}</span>
        {item.badge && <Badge>{item.badge}</Badge>}
      </Link>
      {hasChildren && (
        <div className={`submenu ${expanded ? 'expanded' : ''}`}>
          {item.children?.map(child => (
            <MenuItem key={child.id} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. 菜单搜索功能

```typescript
// client/src/hooks/useMenuSearch.ts
export function useMenuSearch(query: string) {
  const results = useMemo(() => {
    if (!query) return [];

    return flattenMenuItems(menuConfig.menus).filter(item =>
      item.label.includes(query) ||
      item.labelEn.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.includes(query)
    );
  }, [query]);

  return results;
}
```

### 4. 面包屑导航

```typescript
// client/src/components/Navigation/Breadcrumb.tsx
export function Breadcrumb() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbsFromPath(location[0]);

  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((item, index) => (
        <span key={index}>
          <Link to={item.path}>{item.label}</Link>
          {index < breadcrumbs.length - 1 && <span>/</span>}
        </span>
      ))}
    </nav>
  );
}
```

---

## 迁移计划

### Phase 1: 菜单配置文件创建
- 创建 `menu-config.ts` 配置文件
- 定义所有菜单项和路由映射
- 创建权限定义文档

### Phase 2: 菜单组件实现
- 实现菜单组件和菜单项组件
- 实现权限检查逻辑
- 实现菜单搜索功能

### Phase 3: 前端集成
- 在App.tsx中集成菜单
- 更新路由定义
- 实现面包屑导航

### Phase 4: 测试和优化
- 测试所有菜单导航
- 测试权限检查
- 性能优化

---

## 常见问题

### Q: 如何添加新的菜单项？
A: 在 `menu-config.ts` 中添加新的 `MenuItem` 对象，指定 `id`、`label`、`path` 等属性。

### Q: 如何隐藏某个菜单项？
A: 设置菜单项的 `visible: false` 或在权限中排除该用户。

### Q: 如何实现菜单的国际化？
A: 使用 `label` 和 `labelEn` 字段，根据用户语言偏好显示。

### Q: 如何处理动态菜单？
A: 从后端API获取菜单配置，支持运行时更新。
