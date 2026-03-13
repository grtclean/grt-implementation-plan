# TPL-RBAC权限矩阵

> **适用范围**：系统管理员、安全审计、新角色配置
> **更新频率**：角色或权限变更时更新
> **审批流程**：IT 提议 → 安全评审 → CTO 审批

## 模板

### 一、角色体系（18 个系统角色）

| 角色 ID | 角色名称 | 英文 | 等级 | 说明 |
|---------|----------|------|------|------|
| admin | 系统管理员 | Admin | 10 | 全权限 |
| ceo | CEO | CEO | 9 | 全公司查看 + 战略审批 |
| cto | CTO | CTO | 9 | 技术决策 + 系统管理 |
| vp | 副总裁 | VP | 8 | BU/部门管理 |
| director | 总监 | Director | 7 | 部门管理 |
| senior_manager | 高级经理 | Senior Manager | 6 | 跨团队管理 |
| manager | 经理 | Manager | 5 | 团队管理 |
| team_leader | 团队负责人 | Team Leader | 4 | 小组管理 |
| senior_engineer | 高级工程师 | Senior Engineer | 3 | 技术骨干 |
| engineer | 工程师 | Engineer | 2 | 标准岗位 |
| employee | 普通员工 | Employee | 1 | 基础权限 |
| intern | 实习生 | Intern | 0 | 最小权限 |
| bu_sales | BU 销售 | BU Sales | 3 | BU 销售权限 |
| bu_pm | BU 项目经理 | BU PM | 4 | BU 项目管理 |
| bu_mech | BU 机械工程师 | BU ME | 3 | BU 机械设计 |
| bu_elec | BU 电气工程师 | BU EE | 3 | BU 电气设计 |
| bu_gm | BU 总经理 | BU GM | 7 | BU 全权限 |
| customer | 客户 | Customer | 1 | 客户门户权限 |

### 二、权限矩阵（核心角色 × 权限类别）

#### 图例：全权限 / 读写 / 只读 / 无权限

| 权限类别 | admin | ceo | cto | director | manager | engineer | employee | customer |
|----------|-------|-----|-----|----------|---------|----------|----------|----------|
| **项目管理** | | | | | | | | |
| project:create | 全 | 读写 | 读写 | 读写 | 读写 | - | - | - |
| project:view | 全 | 全 | 全 | 读写 | 读写 | 只读 | 只读 | - |
| project:update | 全 | 读写 | 读写 | 读写 | 读写 | - | - | - |
| project:delete | 全 | - | 读写 | - | - | - | - | - |
| project:gate:approve | 全 | 读写 | 读写 | 读写 | - | - | - | - |
| **质量管理** | | | | | | | | |
| quality:fmea:manage | 全 | - | 读写 | 读写 | 读写 | 读写 | - | - |
| quality:fmea:view | 全 | 全 | 全 | 读写 | 读写 | 读写 | 只读 | - |
| quality:8d:manage | 全 | - | 读写 | 读写 | 读写 | 读写 | - | - |
| quality:audit:manage | 全 | - | 读写 | 读写 | - | - | - | - |
| quality:ppap:manage | 全 | - | 读写 | 读写 | 读写 | - | - | - |
| **生产管理** | | | | | | | | |
| production:view | 全 | 全 | 全 | 读写 | 读写 | 读写 | 只读 | - |
| production:manage | 全 | - | 读写 | 读写 | 读写 | 读写 | - | - |
| production:schedule | 全 | - | 读写 | 读写 | 读写 | - | - | - |
| production:worker:manage | 全 | - | - | 读写 | 读写 | - | - | - |
| **人力资源** | | | | | | | | |
| hr:employee:view | 全 | 全 | 全 | 读写 | 读写 | - | - | - |
| hr:employee:manage | 全 | - | - | 读写 | - | - | - | - |
| hr:salary:view | 全 | 读写 | - | 读写 | - | - | - | - |
| hr:salary:manage | 全 | - | - | 读写 | - | - | - | - |
| hr:training:manage | 全 | - | - | 读写 | 读写 | - | - | - |
| **财务管理** | | | | | | | | |
| finance:view | 全 | 全 | 只读 | 读写 | 只读 | - | - | - |
| finance:manage | 全 | 读写 | - | 读写 | - | - | - | - |
| finance:approve | 全 | 读写 | - | 读写 | - | - | - | - |
| **系统管理** | | | | | | | | |
| system:admin | 全 | - | 读写 | - | - | - | - | - |
| system:permission:manage | 全 | - | 读写 | - | - | - | - | - |
| system:audit:view | 全 | 读写 | 读写 | - | - | - | - | - |
| system:backup:manage | 全 | - | 读写 | - | - | - | - | - |
| **客户门户** | | | | | | | | |
| customer:portal:access | 全 | - | - | - | - | - | - | 全 |
| customer:nda:countersign | - | - | - | - | - | - | - | 全 |
| customer:authorization:view | 全 | 读写 | 读写 | 读写 | - | - | - | 只读 |
| **研发设计** | | | | | | | | |
| rnd:npi:manage | 全 | - | 读写 | 读写 | 读写 | 读写 | - | - |
| rnd:hmi:view | 全 | - | 读写 | 读写 | 读写 | 读写 | 只读 | - |
| rnd:plc:source:view | 全 | - | 读写 | 读写 | 读写 | 读写 | - | - |

### 三、BU 角色权限

| 权限 | bu_gm | bu_pm | bu_sales | bu_mech | bu_elec |
|------|-------|-------|----------|---------|---------|
| BU 内项目查看 | 全 | 全 | 只读 | 只读 | 只读 |
| BU 内项目管理 | 全 | 读写 | - | - | - |
| BU 销售管理 | 全 | 只读 | 读写 | - | - |
| BU 设计文档 | 全 | 只读 | - | 读写 | 读写 |
| BU 生产管理 | 全 | 只读 | - | 只读 | 只读 |
| BU 财务查看 | 全 | 只读 | 只读 | - | - |
| BU 人员管理 | 全 | - | - | - | - |

### 四、权限统计

| 统计项 | 数值 |
|--------|------|
| 总权限数 | 278 |
| 受保护的 mutations | 1,127 |
| 角色数 | 18 |
| 权限检查方式 | `requirePermission()` middleware |
| 未授权返回 | 403 Forbidden |
| 前端权限页面 | ForbiddenPage.tsx |

## 使用说明

1. **新增角色**：在 `shared/permissions.ts` 的 `SYSTEM_ROLES` 中添加，同步更新 `ROLE_PERMISSIONS`
2. **新增权限**：在 `seed-rbac-permissions.ts` 中添加权限种子数据
3. **权限检查**：后端 router 中使用 `requirePermission('permission:key')` 中间件
4. **前端控制**：使用 `allowedRoles` 和 `minLevel` 控制菜单项和页面可见性
5. **审计日志**：所有权限检查结果（通过/拒绝）均记录到审计日志
6. **最小权限原则**：新角色默认无权限，需显式分配所需权限
