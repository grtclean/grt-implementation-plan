# GRT智能系统权限架构 v2.6.0

## 概述

本文档定义GRT智能系统的完整权限体系，按优先级顺序定义用户类型、角色、权限和访问控制规则。

---

## 第一部分：用户类型定义（优先级顺序）

### 1. Admin（系统管理员）
**优先级：P0 - 最高**

**职责：**
- 系统配置和维护
- 用户和权限管理
- 数据备份和恢复
- 系统日志审计
- 全局设置管理

**权限范围：**
- ✓ 全系统访问权限
- ✓ 创建/编辑/删除所有数据
- ✓ 用户管理（创建、禁用、删除）
- ✓ 权限分配
- ✓ 系统配置
- ✓ 审计日志查看
- ✓ 数据导入/导出
- ✓ 备份管理

**访问控制：**
```typescript
// 权限检查
if (user.role !== 'admin') {
  throw new Error('Only admin can access this resource');
}
```

---

### 2. 开发专员（Development Specialist）
**优先级：P1**

**职责：**
- 系统功能开发和维护
- 代码审查
- 技术文档编写
- 系统集成管理
- 性能优化

**权限范围：**
- ✓ 访问开发环境
- ✓ 创建/编辑/删除开发数据
- ✓ 查看系统日志
- ✓ 管理API密钥
- ✓ 数据库Schema修改
- ✗ 生产环境直接修改（需要审批）
- ✗ 用户权限管理

**访问控制：**
```typescript
// 开发专员权限检查
if (!['admin', 'development_specialist'].includes(user.role)) {
  throw new Error('Development access required');
}
```

---

### 3. 开发工程师（Development Engineer）
**优先级：P2**

**职责：**
- 功能实现
- 单元测试
- Bug修复
- 代码提交
- 技术支持

**权限范围：**
- ✓ 访问开发环境
- ✓ 创建/编辑开发数据
- ✓ 查看系统日志（仅限自己的操作）
- ✓ 代码提交
- ✗ 数据库Schema修改（需要审批）
- ✗ API密钥管理
- ✗ 用户权限管理

**访问控制：**
```typescript
// 开发工程师权限检查
if (!['admin', 'development_specialist', 'development_engineer'].includes(user.role)) {
  throw new Error('Engineering access required');
}
```

---

### 4. 部门（Department）
**优先级：P3**

**职责：**
- 部门级数据管理
- 团队协作
- 部门报告生成
- 预算管理

**权限范围（按部门）：**
- ✓ 访问本部门数据
- ✓ 查看本部门成员信息
- ✓ 创建/编辑本部门项目
- ✓ 生成部门报告
- ✗ 访问其他部门数据（特殊情况除外）
- ✗ 跨部门数据修改

**部门列表：**
- 销售部（Sales）
- 项目部（Project Management）
- 工程部（Engineering）
- 制造部（Manufacturing）
- 售后服务部（After-Sales Service）
- 采购部（Procurement）
- 人力资源部（HR）
- 财务部（Finance）

**访问控制：**
```typescript
// 部门权限检查
if (user.department !== resource.department && user.role !== 'admin') {
  throw new Error('Department access required');
}
```

---

### 5. 角色（Role）
**优先级：P4**

**职责：**
- 岗位级权限管理
- 流程审批
- 数据审核

**标准角色定义：**

#### 5.1 销售经理（Sales Manager）
```json
{
  "name": "Sales Manager",
  "department": "Sales",
  "permissions": [
    "view_customers",
    "create_opportunities",
    "edit_opportunities",
    "view_sales_reports",
    "approve_discounts",
    "manage_team_members"
  ],
  "dataScope": "team_and_self"
}
```

#### 5.2 项目经理（Project Manager）
```json
{
  "name": "Project Manager",
  "department": "Project Management",
  "permissions": [
    "create_projects",
    "edit_projects",
    "manage_team_members",
    "view_project_reports",
    "approve_milestones",
    "manage_budget"
  ],
  "dataScope": "project"
}
```

#### 5.3 工程师（Engineer）
```json
{
  "name": "Engineer",
  "department": "Engineering",
  "permissions": [
    "view_projects",
    "create_designs",
    "edit_designs",
    "view_bom",
    "submit_reports",
    "view_team_designs"
  ],
  "dataScope": "team_and_self"
}
```

#### 5.4 现场服务工程师（Field Service Engineer）
```json
{
  "name": "Field Service Engineer",
  "department": "After-Sales Service",
  "permissions": [
    "view_service_requests",
    "create_service_reports",
    "edit_own_reports",
    "view_customer_info",
    "submit_feedback",
    "view_equipment_info"
  ],
  "dataScope": "assigned_customers"
}
```

#### 5.5 采购员（Procurement Officer）
```json
{
  "name": "Procurement Officer",
  "department": "Procurement",
  "permissions": [
    "view_purchase_orders",
    "create_purchase_orders",
    "edit_purchase_orders",
    "manage_suppliers",
    "view_inventory",
    "approve_purchases"
  ],
  "dataScope": "department"
}
```

#### 5.6 财务人员（Finance Officer）
```json
{
  "name": "Finance Officer",
  "department": "Finance",
  "permissions": [
    "view_invoices",
    "create_invoices",
    "approve_expenses",
    "view_financial_reports",
    "manage_budgets",
    "view_cost_analysis"
  ],
  "dataScope": "department"
}
```

#### 5.7 HR专员（HR Specialist）
```json
{
  "name": "HR Specialist",
  "department": "HR",
  "permissions": [
    "view_employees",
    "manage_training",
    "view_performance_reviews",
    "manage_leave_requests",
    "create_announcements",
    "manage_certifications"
  ],
  "dataScope": "department"
}
```

---

### 6. 访客授权（Guest Authorization）
**优先级：P5**

**职责：**
- 临时系统访问
- 数据查看（只读）
- 报告生成

**权限范围：**
- ✓ 查看指定数据（只读）
- ✓ 生成报告
- ✗ 创建/编辑/删除数据
- ✗ 访问敏感信息

**有效期：**
- 默认7天
- 可由Admin延期
- 过期自动禁用

**访问控制：**
```typescript
// 访客权限检查
if (user.type === 'guest' && user.expiresAt < new Date()) {
  throw new Error('Guest access expired');
}
```

---

### 7. 外部客户（External Customer）
**优先级：P6**

**职责：**
- 查看自己的项目状态
- 提交服务请求
- 查看服务报告

**权限范围：**
- ✓ 查看自己的项目
- ✓ 查看自己的服务报告
- ✓ 提交反馈
- ✓ 查看设备信息
- ✗ 访问其他客户数据
- ✗ 修改任何数据

**访问控制：**
```typescript
// 外部客户权限检查
if (user.type === 'external_customer') {
  // 只能访问自己的数据
  if (resource.customerId !== user.customerId) {
    throw new Error('Customer access denied');
  }
}
```

---

### 8. 外部技术人员（External Technical Personnel）
**优先级：P7**

**职责：**
- 提供技术支持
- 查看技术文档
- 提交技术建议

**权限范围：**
- ✓ 查看技术文档
- ✓ 查看分配的项目
- ✓ 提交技术建议
- ✓ 查看故障排查指南
- ✗ 修改系统数据
- ✗ 访问客户隐私数据

**访问控制：**
```typescript
// 外部技术人员权限检查
if (user.type === 'external_technical') {
  // 只能访问分配给他们的项目
  if (!user.assignedProjects.includes(resource.projectId)) {
    throw new Error('Technical access denied');
  }
}
```

---

## 第二部分：权限矩阵

### 核心功能权限矩阵

| 功能 | Admin | Dev Specialist | Dev Engineer | Manager | Engineer | Service | Customer | Tech |
|------|-------|-----------------|--------------|---------|----------|---------|----------|------|
| 用户管理 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 系统配置 | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 项目管理 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ○ | ○ |
| CRM管理 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ○ | ✗ |
| 服务管理 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| 财务管理 | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 报告生成 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| 数据导出 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

**图例：**
- ✓ = 完全权限
- ○ = 受限权限（仅自己的数据）
- ✗ = 无权限

---

## 第三部分：数据范围定义

### 数据范围类型

```typescript
enum DataScope {
  // 全局范围
  GLOBAL = 'global',           // 访问所有数据
  
  // 部门范围
  DEPARTMENT = 'department',   // 访问本部门数据
  
  // 团队范围
  TEAM = 'team',              // 访问本团队数据
  
  // 个人范围
  SELF = 'self',              // 仅访问自己的数据
  
  // 项目范围
  PROJECT = 'project',        // 访问分配的项目
  
  // 客户范围
  CUSTOMER = 'customer',      // 访问分配的客户
}
```

### 数据范围实现

```typescript
// 权限检查中间件
export async function checkDataScope(
  user: User,
  resource: any,
  requiredScope: DataScope
): Promise<boolean> {
  switch (requiredScope) {
    case DataScope.GLOBAL:
      return user.role === 'admin';
    
    case DataScope.DEPARTMENT:
      return user.department === resource.department || user.role === 'admin';
    
    case DataScope.TEAM:
      return user.teamId === resource.teamId || user.role === 'admin';
    
    case DataScope.SELF:
      return user.id === resource.userId || user.role === 'admin';
    
    case DataScope.PROJECT:
      return user.assignedProjects.includes(resource.projectId) || user.role === 'admin';
    
    case DataScope.CUSTOMER:
      return user.assignedCustomers.includes(resource.customerId) || user.role === 'admin';
    
    default:
      return false;
  }
}
```

---

## 第四部分：认证与授权流程

### 认证流程

```
用户登录 → 验证凭证 → 生成JWT Token → 返回Token
   ↓
Token包含：
- userId
- role
- department
- permissions
- expiresAt
```

### 授权流程

```
请求 → 提取Token → 验证Token有效性 → 检查权限 → 检查数据范围 → 执行操作
   ↓
如果任何步骤失败 → 返回401/403错误
```

### 权限检查实现

```typescript
// tRPC中间件
export const protectedProcedure = baseProcedure
  .use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx });
  });

// 角色检查
export const roleProtectedProcedure = (requiredRoles: string[]) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    if (!requiredRoles.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  });

// 数据范围检查
export const scopeProtectedProcedure = (requiredScope: DataScope) =>
  protectedProcedure.use(async ({ ctx, next, input }) => {
    const hasAccess = await checkDataScope(ctx.user, input, requiredScope);
    if (!hasAccess) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  });
```

---

## 第五部分：特殊权限规则

### 1. 凭证认证（Qualification Certificate）
某些高级功能需要特定的认证：

```typescript
// 示例：高级调试权限
if (resource.requiresCertification) {
  const hasCert = await checkCertification(
    user.id,
    'Advanced_Ultrasonic_Debugging'
  );
  if (!hasCert) {
    throw new Error('Required certification not found');
  }
}
```

### 2. 临时权限提升
某些操作需要临时提升权限：

```typescript
// 示例：紧急维护权限
if (isEmergency && user.role === 'engineer') {
  const approval = await getEmergencyApproval(user.id);
  if (!approval) {
    throw new Error('Emergency approval required');
  }
}
```

### 3. 审计日志
所有权限相关操作必须记录：

```typescript
await logAudit({
  userId: user.id,
  action: 'data_access',
  resource: resource.id,
  timestamp: new Date(),
  result: 'success' | 'denied',
  reason: 'reason if denied'
});
```

---

## 第六部分：实现检查清单

- [ ] 创建User表扩展（role, department, permissions）
- [ ] 创建Role表定义
- [ ] 创建Permission表定义
- [ ] 创建RolePermission关联表
- [ ] 实现权限检查中间件
- [ ] 实现数据范围检查
- [ ] 实现审计日志
- [ ] 创建权限管理UI
- [ ] 创建角色管理UI
- [ ] 编写权限检查测试
- [ ] 文档化权限规则
- [ ] 用户培训材料

---

## 附录：权限编码参考

```typescript
// 权限编码规范
export const PERMISSIONS = {
  // 用户管理
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // 项目管理
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  
  // CRM管理
  CRM_CREATE: 'crm:create',
  CRM_READ: 'crm:read',
  CRM_UPDATE: 'crm:update',
  CRM_DELETE: 'crm:delete',
  
  // 服务管理
  SERVICE_CREATE: 'service:create',
  SERVICE_READ: 'service:read',
  SERVICE_UPDATE: 'service:update',
  SERVICE_DELETE: 'service:delete',
  
  // 报告
  REPORT_CREATE: 'report:create',
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
  
  // 系统
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BACKUP: 'system:backup',
};
```

---

**版本历史：**
- v2.6.0 - 初始版本（2026-01-30）
