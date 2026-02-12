# GRT智能系统 - 权限管理与多角色系统架构设计

## 1. 系统概述

### 1.1 核心目标
实现**精细化、灵活的权限管理系统**，支持：
- 基于用户名/密码的精准权限对应
- 多维度权限控制（功能、项目、薪酬、绩效等）
- 动态角色和权限组合
- 内部员工和外部用户的差异化管理
- 权限配置的灵活性和可维护性

### 1.2 用户类型和角色体系

#### 内部用户
1. **系统管理员** (System Admin)
   - 权限：系统全部功能、权限管理、用户管理、审计日志
   - 可访问：所有数据、所有模块

2. **组织管理员** (Organization Admin)
   - 权限：部门/BU级别的权限管理、员工管理、项目管理
   - 可访问：所属组织的数据

3. **项目经理** (Project Manager)
   - 权限：项目创建、成员管理、进度跟踪、资源分配
   - 可访问：所属项目的数据

4. **部门经理** (Department Manager)
   - 权限：部门员工管理、绩效评估、薪酬审批
   - 可访问：所属部门的数据

5. **员工** (Employee)
   - 权限：查看自己的绩效、项目、薪酬、学习计划
   - 可访问：自己的数据 + 授权的项目/共享数据

6. **财务人员** (Finance)
   - 权限：薪酬管理、费用审批、财务报表
   - 可访问：财务相关数据

7. **HR人员** (HR)
   - 权限：员工管理、招聘、培训、绩效管理
   - 可访问：人力资源相关数据

#### 外部用户
1. **客户** (Customer)
   - 权限：查看相关项目、技术讨论、服务报告
   - 可访问：授权的项目和讨论池

2. **供应商** (Vendor)
   - 权限：查看相关项目、提交报价、沟通
   - 可访问：授权的项目

3. **合作伙伴** (Partner)
   - 权限：参与特定项目、技术讨论、知识共享
   - 可访问：授权的项目和讨论池

## 2. 数据库模型设计

### 2.1 核心表结构

#### users 表
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('internal', 'external') NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### user_profiles 表
```sql
CREATE TABLE user_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(255),
  phone VARCHAR(20),
  department_id BIGINT,
  position VARCHAR(100),
  manager_id BIGINT,
  hire_date DATE,
  bio TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES users(id)
);
```

#### roles 表
```sql
CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  organization_id BIGINT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

#### permissions 表
```sql
CREATE TABLE permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### role_permissions 表
```sql
CREATE TABLE role_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id),
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);
```

#### user_roles 表
```sql
CREATE TABLE user_roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  organization_id BIGINT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by BIGINT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE KEY unique_user_role_org (user_id, role_id, organization_id)
);
```

#### resource_permissions 表（细粒度权限）
```sql
CREATE TABLE resource_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id BIGINT NOT NULL,
  permission_type ENUM('view', 'edit', 'delete', 'approve', 'manage') NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by BIGINT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY unique_resource_permission (user_id, resource_type, resource_id, permission_type)
);
```

#### organizations 表
```sql
CREATE TABLE organizations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  parent_id BIGINT,
  type ENUM('company', 'department', 'team', 'business_unit') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES organizations(id)
);
```

#### departments 表
```sql
CREATE TABLE departments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  organization_id BIGINT NOT NULL,
  manager_id BIGINT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (manager_id) REFERENCES users(id)
);
```

#### projects 表
```sql
CREATE TABLE projects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id BIGINT NOT NULL,
  organization_id BIGINT,
  status ENUM('planning', 'active', 'completed', 'archived') DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

#### project_members 表
```sql
CREATE TABLE project_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_type ENUM('internal', 'external') NOT NULL,
  role VARCHAR(100),
  permissions JSON,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_project_member (project_id, user_id)
);
```

#### discussion_pools 表
```sql
CREATE TABLE discussion_pools (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id BIGINT,
  created_by BIGINT NOT NULL,
  topic VARCHAR(100),
  visibility ENUM('private', 'internal', 'public') DEFAULT 'private',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### discussion_pool_members 表
```sql
CREATE TABLE discussion_pool_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pool_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_type ENUM('internal', 'external') NOT NULL,
  can_post BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES discussion_pools(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_pool_member (pool_id, user_id)
);
```

## 3. 权限管理模型

### 3.1 权限分类

#### 功能权限 (Feature Permissions)
- 模块访问：个人AI助手、项目管理、薪酬管理、绩效评估等
- 操作权限：创建、编辑、删除、审批、导出等

#### 数据权限 (Data Permissions)
- 自己的数据：个人绩效、个人薪酬、个人项目
- 部门数据：部门员工、部门绩效、部门薪酬
- 项目数据：项目成员、项目进度、项目文档
- 组织数据：全组织数据（仅管理员）

#### 工作流权限 (Workflow Permissions)
- 审批权限：费用审批、薪酬审批、项目审批
- 分配权限：任务分配、资源分配、角色分配

### 3.2 权限矩阵示例

| 用户类型 | 个人AI助手 | 项目管理 | 薪酬管理 | 绩效评估 | 权限管理 |
|---------|----------|--------|--------|--------|--------|
| 系统管理员 | 全部 | 全部 | 全部 | 全部 | 全部 |
| 组织管理员 | 所属组织 | 所属组织 | 所属组织 | 所属组织 | 所属组织 |
| 项目经理 | 自己+项目 | 所属项目 | 自己 | 自己 | 无 |
| 部门经理 | 自己+部门 | 部门项目 | 部门员工 | 部门员工 | 无 |
| 员工 | 自己 | 授权项目 | 自己 | 自己 | 无 |
| 客户 | 无 | 授权项目 | 无 | 无 | 无 |

## 4. 认证与授权流程

### 4.1 用户认证流程
1. 用户输入用户名/密码
2. 系统验证凭证
3. 生成JWT token（包含用户ID、角色、权限）
4. 返回token给前端
5. 前端存储token并用于后续请求

### 4.2 权限检查流程
1. 请求到达时，检查token
2. 提取用户ID、角色、权限
3. 检查用户是否有访问该资源的权限
4. 检查用户是否有执行该操作的权限
5. 允许或拒绝请求

### 4.3 细粒度权限检查
```typescript
// 检查用户是否可以访问特定资源
async function checkResourceAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'view' | 'edit' | 'delete' | 'approve'
): Promise<boolean> {
  // 1. 检查用户角色的基础权限
  const hasRolePermission = await checkRolePermission(userId, resourceType, action);
  
  // 2. 检查用户的细粒度权限
  const hasResourcePermission = await checkResourcePermission(
    userId, resourceType, resourceId, action
  );
  
  // 3. 检查数据隔离规则
  const hasDataAccess = await checkDataAccess(userId, resourceType, resourceId);
  
  return hasRolePermission && hasResourcePermission && hasDataAccess;
}
```

## 5. 外部用户管理

### 5.1 外部用户邀请流程
1. 内部用户邀请外部用户加入项目或讨论池
2. 系统生成邀请链接
3. 外部用户点击链接，创建账户
4. 系统自动分配权限
5. 外部用户可访问授权的资源

### 5.2 外部用户权限范围
- 只能访问授权的项目
- 只能参与授权的讨论池
- 不能访问内部员工数据
- 不能访问薪酬、绩效等敏感信息

## 6. UI界面设计原则

### 6.1 动态界面
- 根据用户权限动态显示菜单和功能
- 隐藏无权限的功能，而不是禁用
- 提供清晰的权限提示

### 6.2 权限管理后台
- 用户管理：创建、编辑、删除用户
- 角色管理：创建、编辑、删除角色
- 权限分配：为用户分配角色和权限
- 审计日志：记录所有权限变更

### 6.3 个人设置
- 用户可以自定义界面主题、语言等
- 用户可以管理自己的API密钥
- 用户可以查看自己的活动日志

## 7. 实现路线图

### Phase 1: 数据库设计与实现
- [ ] 创建所有表结构
- [ ] 创建索引和约束
- [ ] 初始化系统角色和权限

### Phase 2: 认证系统优化
- [ ] 实现用户名/密码认证
- [ ] 实现JWT token生成和验证
- [ ] 实现token刷新机制

### Phase 3: 权限检查系统
- [ ] 实现角色权限检查
- [ ] 实现细粒度权限检查
- [ ] 实现数据隔离规则

### Phase 4: 权限管理后台
- [ ] 用户管理界面
- [ ] 角色管理界面
- [ ] 权限分配界面
- [ ] 审计日志界面

### Phase 5: UI界面重设计
- [ ] 根据权限动态生成菜单
- [ ] 优化用户体验
- [ ] 添加权限提示

### Phase 6: 外部用户支持
- [ ] 实现邀请机制
- [ ] 实现外部用户注册
- [ ] 实现项目和讨论池协作

## 8. 安全考虑

### 8.1 密码安全
- 使用bcrypt进行密码哈希
- 实现密码强度检查
- 实现密码过期和重置机制

### 8.2 Token安全
- 使用HTTPS传输
- 实现token过期机制
- 实现token黑名单（logout）

### 8.3 审计日志
- 记录所有权限变更
- 记录所有敏感操作
- 定期审计日志

### 8.4 数据隔离
- 确保用户只能访问授权的数据
- 实现行级安全（RLS）
- 实现列级安全（CLS）

## 9. 后续扩展

### 9.1 SSO集成
- 支持WeChat登录
- 支持Google登录
- 支持企业SSO

### 9.2 高级权限管理
- 基于属性的访问控制（ABAC）
- 时间限制的权限
- 条件权限（如IP限制）

### 9.3 权限分析
- 权限使用分析
- 权限冲突检测
- 权限优化建议
