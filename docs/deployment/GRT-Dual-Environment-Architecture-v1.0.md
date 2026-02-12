# GRT智能系统 - 测试/正式双环境管理体系架构设计

**版本**: v1.0  
**日期**: 2026年1月30日  
**作者**: Manus AI  
**状态**: 设计完成

---

## 1. 概述

本文档定义了GRT智能系统的测试环境与正式环境双环境管理体系，包括环境架构、变更管理流程、自动化验证机制和部署安装方案。该体系确保所有系统变更经过严格的测试验证后才能部署到生产环境，同时提供灵活的部署选项支持Windows 11服务器和云端环境。

### 1.1 设计目标

| 目标 | 描述 |
|------|------|
| **安全性** | 确保生产系统稳定，所有变更必须先在测试环境验证 |
| **可追溯性** | 完整记录所有变更申请、审批和执行过程 |
| **一致性** | 自动检测申请内容与实际执行的一致性 |
| **灵活性** | 支持多种部署方式（本地服务器/云端） |
| **自动化** | 最大程度减少人工干预，降低人为错误 |

---

## 2. 双环境架构

### 2.1 环境定义

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GRT智能系统双环境架构                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────┐         ┌─────────────────────┐           │
│   │    测试环境 (TEST)   │ ──────▶ │   正式环境 (PROD)   │           │
│   │                     │  验证通过 │                     │           │
│   │  • 开发测试         │  后同步   │  • 生产运行         │           │
│   │  • 功能验证         │         │  • 用户访问         │           │
│   │  • 性能测试         │         │  • 数据持久化       │           │
│   │  • 安全扫描         │         │  • 高可用保障       │           │
│   └─────────────────────┘         └─────────────────────┘           │
│            ▲                                ▲                        │
│            │                                │                        │
│   ┌────────┴────────┐              ┌────────┴────────┐              │
│   │  测试数据库      │              │  生产数据库      │              │
│   │  (隔离/脱敏)     │              │  (真实数据)      │              │
│   └─────────────────┘              └─────────────────┘              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 环境配置对比

| 配置项 | 测试环境 (TEST) | 正式环境 (PROD) |
|--------|-----------------|-----------------|
| **数据库** | 独立测试库，使用脱敏数据 | 生产数据库，真实数据 |
| **API端点** | `https://test-api.grt.local` | `https://api.grt.local` |
| **文件存储** | 测试S3桶 | 生产S3桶 |
| **日志级别** | DEBUG | INFO |
| **性能限制** | 无限制 | 速率限制启用 |
| **监控告警** | 仅记录 | 实时告警 |
| **备份策略** | 每周备份 | 每日备份 + 实时复制 |
| **访问控制** | 开发/测试人员 | 全部授权用户 |

### 2.3 数据同步策略

测试环境作为正式环境的镜像备份，采用以下同步策略：

1. **结构同步**: 数据库Schema变更先在测试环境执行，验证后同步到正式环境
2. **数据脱敏**: 从正式环境同步数据时自动脱敏敏感信息
3. **增量同步**: 仅同步变更部分，减少同步时间
4. **版本标记**: 每次同步记录版本号，支持回滚

---

## 3. 变更管理流程

### 3.1 流程概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           变更管理流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ 1.申请   │───▶│ 2.审批   │───▶│ 3.测试   │───▶│ 4.验证   │───▶│5.部署  │ │
│  │          │    │          │    │   执行   │    │          │    │        │ │
│  │ 开发人员 │    │ 管理员   │    │ 测试环境 │    │ 自动检测 │    │正式环境│ │
│  │ 提交申请 │    │ 审批请求 │    │ 实施变更 │    │ 一致性   │    │同步    │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        变更记录数据库                                  │  │
│  │  • 申请详情  • 审批记录  • 执行日志  • 验证结果  • 部署状态          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        异常处理机制                                    │  │
│  │  • 验证失败 → 阻断部署 → 通知申请人和管理员                           │  │
│  │  • 一致性不符 → 回滚测试环境 → 要求重新申请                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 变更申请表单

变更申请必须包含以下信息：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **申请标题** | 文本 | 是 | 简明描述变更内容 |
| **变更类型** | 枚举 | 是 | 功能新增/Bug修复/性能优化/安全补丁/配置变更 |
| **影响范围** | 多选 | 是 | 前端/后端/数据库/配置/文档 |
| **变更描述** | 长文本 | 是 | 详细说明变更内容和原因 |
| **技术方案** | 长文本 | 是 | 实现方案和技术细节 |
| **影响评估** | 长文本 | 是 | 对现有功能的影响分析 |
| **回滚方案** | 长文本 | 是 | 如何回滚此变更 |
| **测试计划** | 长文本 | 是 | 测试用例和验收标准 |
| **预计文件** | 文件列表 | 是 | 将要修改的文件清单 |
| **预计SQL** | SQL列表 | 否 | 数据库变更SQL |
| **紧急程度** | 枚举 | 是 | 常规/紧急/特急 |
| **计划时间** | 日期时间 | 是 | 预计执行时间 |

### 3.3 审批流程

```
申请人提交 → 技术负责人审核 → 管理员审批 → 执行授权
     │              │              │              │
     │              │              │              ▼
     │              │              │         生成执行令牌
     │              │              │         (有效期24小时)
     │              │              │
     │              │              ▼
     │              │         检查影响范围
     │              │         评估风险等级
     │              │
     │              ▼
     │         技术方案评审
     │         代码审查
     │
     ▼
  填写申请表单
  上传变更包
```

### 3.4 执行令牌机制

审批通过后，系统生成唯一的执行令牌：

```typescript
interface ExecutionToken {
  tokenId: string;           // 唯一标识
  changeRequestId: number;   // 关联的变更申请
  applicantId: number;       // 申请人ID
  approverId: number;        // 审批人ID
  scope: {
    allowedFiles: string[];  // 允许修改的文件
    allowedSql: string[];    // 允许执行的SQL
    allowedCommands: string[]; // 允许执行的命令
  };
  validFrom: Date;           // 生效时间
  validUntil: Date;          // 失效时间
  usedAt?: Date;             // 使用时间
  status: 'pending' | 'used' | 'expired' | 'revoked';
}
```

---

## 4. 自动化验证机制

### 4.1 一致性检测

系统自动检测申请内容与实际执行的一致性：

```
┌─────────────────────────────────────────────────────────────────────┐
│                      一致性检测流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐                                               │
│   │  变更申请内容    │                                               │
│   │  • 预计文件列表  │                                               │
│   │  • 预计SQL语句   │                                               │
│   │  • 预计命令      │                                               │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────┐                                               │
│   │   对比引擎       │◀──────────────────────────────┐              │
│   │                 │                                │              │
│   │  • 文件差异分析  │                                │              │
│   │  • SQL解析对比   │                                │              │
│   │  • 命令匹配检查  │                                │              │
│   └────────┬────────┘                                │              │
│            │                                         │              │
│            ▼                                         │              │
│   ┌─────────────────┐                    ┌─────────────────┐       │
│   │   实际执行内容   │                    │   执行监控器     │       │
│   │  • 实际修改文件  │◀───────────────────│                 │       │
│   │  • 实际SQL执行   │                    │  • Git Hook     │       │
│   │  • 实际命令记录  │                    │  • DB Trigger   │       │
│   └────────┬────────┘                    │  • Command Log  │       │
│            │                              └─────────────────┘       │
│            ▼                                                         │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                      验证结果                                 │  │
│   │                                                               │  │
│   │  ✅ 一致 → 允许继续 → 生成验证报告                            │  │
│   │  ❌ 不一致 → 阻断执行 → 通知相关人员 → 要求说明               │  │
│   │                                                               │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 检测规则

| 检测项 | 规则 | 不一致处理 |
|--------|------|-----------|
| **文件变更** | 实际修改的文件必须在申请的文件列表中 | 阻断，要求补充申请 |
| **新增文件** | 新增文件必须在申请中声明 | 阻断，要求补充申请 |
| **SQL执行** | 执行的SQL必须与申请中的SQL语义等价 | 阻断，要求确认 |
| **数据影响** | 影响的数据行数不能超过申请预估的200% | 警告，需人工确认 |
| **配置变更** | 配置项变更必须在申请中列出 | 阻断，要求补充 |
| **依赖变更** | 新增依赖必须在申请中说明 | 警告，需确认 |

### 4.3 异常处理流程

```typescript
interface ConsistencyCheckResult {
  requestId: number;
  checkTime: Date;
  status: 'passed' | 'warning' | 'failed';
  details: {
    fileChanges: {
      expected: string[];
      actual: string[];
      unexpected: string[];
      missing: string[];
    };
    sqlChanges: {
      expected: string[];
      actual: string[];
      mismatch: Array<{
        expected: string;
        actual: string;
        reason: string;
      }>;
    };
    dataImpact: {
      expectedRows: number;
      actualRows: number;
      exceedsThreshold: boolean;
    };
  };
  actions: Array<{
    type: 'block' | 'warn' | 'notify';
    target: string;
    message: string;
  }>;
}
```

---

## 5. 部署安装方案

### 5.1 部署选项

系统支持以下部署方式：

| 部署方式 | 适用场景 | 特点 |
|----------|----------|------|
| **Windows 11服务器** | 本地私有部署 | 数据完全自主控制 |
| **Docker容器** | 云端/混合部署 | 快速部署，易于扩展 |
| **Kubernetes** | 大规模云端部署 | 高可用，自动伸缩 |
| **Manus云端** | 快速启动 | 零运维，即开即用 |

### 5.2 菜单式安装向导

```
╔══════════════════════════════════════════════════════════════════════╗
║                    GRT智能系统 - 安装向导 v1.0                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  欢迎使用GRT智能系统安装向导！                                         ║
║                                                                       ║
║  请选择部署环境:                                                       ║
║                                                                       ║
║    [1] Windows 11 服务器 (本地部署)                                   ║
║        └─ 适合: 数据安全要求高，需要完全自主控制                        ║
║                                                                       ║
║    [2] Docker 容器 (云端/混合部署)                                    ║
║        └─ 适合: 快速部署，易于迁移和扩展                               ║
║                                                                       ║
║    [3] Kubernetes 集群 (大规模部署)                                   ║
║        └─ 适合: 高可用要求，自动伸缩                                   ║
║                                                                       ║
║    [4] Manus 云端托管 (零运维)                                        ║
║        └─ 适合: 快速启动，无需运维                                     ║
║                                                                       ║
║  请输入选项 [1-4]: _                                                  ║
║                                                                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 5.3 Windows 11服务器安装流程

```
步骤1: 环境检测
├── 检查操作系统版本 (Windows 11 Pro/Enterprise)
├── 检查内存 (最低8GB，推荐16GB)
├── 检查磁盘空间 (最低50GB)
├── 检查网络连接
└── 检查端口可用性 (3000, 3306, 6379)

步骤2: 依赖安装
├── Node.js 22.x LTS
├── MySQL 8.0 / TiDB
├── Redis 7.x (可选，用于缓存)
├── Git (用于版本控制)
└── PM2 (进程管理)

步骤3: 系统配置
├── 创建数据库和用户
├── 配置环境变量
├── 生成SSL证书 (可选)
├── 配置防火墙规则
└── 设置Windows服务

步骤4: 应用部署
├── 克隆代码仓库
├── 安装依赖 (pnpm install)
├── 数据库迁移 (pnpm db:push)
├── 构建应用 (pnpm build)
└── 启动服务 (pm2 start)

步骤5: 验证安装
├── 健康检查 API
├── 数据库连接测试
├── 功能测试
└── 生成安装报告
```

### 5.4 环境配置选项

安装过程中可配置的选项：

```
╔══════════════════════════════════════════════════════════════════════╗
║                    系统配置选项                                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  基础配置:                                                             ║
║    [x] 启用HTTPS (推荐)                                               ║
║    [x] 启用数据库备份                                                  ║
║    [ ] 启用Redis缓存                                                   ║
║                                                                       ║
║  安全配置:                                                             ║
║    [x] 启用双因素认证                                                  ║
║    [x] 启用IP白名单                                                    ║
║    [x] 启用审计日志                                                    ║
║    [x] 启用入侵检测                                                    ║
║                                                                       ║
║  功能模块:                                                             ║
║    [x] CRM客户管理                                                     ║
║    [x] 项目管理                                                        ║
║    [x] 成本管理                                                        ║
║    [x] 培训管理                                                        ║
║    [ ] AI助手 (需要API密钥)                                           ║
║                                                                       ║
║  环境类型:                                                             ║
║    ( ) 测试环境                                                        ║
║    (x) 正式环境                                                        ║
║                                                                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 6. 数据库设计

### 6.1 变更申请表

```sql
CREATE TABLE change_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_no VARCHAR(50) UNIQUE NOT NULL,      -- 申请编号 CR-2026-0001
  title VARCHAR(200) NOT NULL,                  -- 申请标题
  change_type ENUM('feature', 'bugfix', 'performance', 'security', 'config') NOT NULL,
  urgency ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
  
  -- 申请人信息
  applicant_id INT NOT NULL,
  applicant_name VARCHAR(100),
  applicant_role ENUM('developer', 'tester', 'admin') NOT NULL,
  
  -- 变更详情
  description TEXT NOT NULL,                    -- 变更描述
  technical_plan TEXT NOT NULL,                 -- 技术方案
  impact_analysis TEXT NOT NULL,                -- 影响评估
  rollback_plan TEXT NOT NULL,                  -- 回滚方案
  test_plan TEXT NOT NULL,                      -- 测试计划
  
  -- 变更范围
  affected_modules JSON,                        -- 影响模块 ["frontend", "backend", "database"]
  expected_files JSON,                          -- 预计修改文件列表
  expected_sql JSON,                            -- 预计执行SQL
  expected_commands JSON,                       -- 预计执行命令
  
  -- 计划时间
  planned_start_time DATETIME,
  planned_end_time DATETIME,
  
  -- 状态
  status ENUM('draft', 'submitted', 'reviewing', 'approved', 'rejected', 
              'executing', 'testing', 'verified', 'deployed', 'rolled_back') DEFAULT 'draft',
  
  -- 审批信息
  reviewer_id INT,
  reviewer_name VARCHAR(100),
  review_time DATETIME,
  review_comment TEXT,
  
  approver_id INT,
  approver_name VARCHAR(100),
  approval_time DATETIME,
  approval_comment TEXT,
  
  -- 执行令牌
  execution_token VARCHAR(100),
  token_expires_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_status (status),
  INDEX idx_applicant (applicant_id),
  INDEX idx_created (created_at)
);
```

### 6.2 执行记录表

```sql
CREATE TABLE change_executions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  execution_token VARCHAR(100) NOT NULL,
  
  -- 执行环境
  environment ENUM('test', 'production') NOT NULL,
  
  -- 实际执行内容
  actual_files JSON,                            -- 实际修改的文件
  actual_sql JSON,                              -- 实际执行的SQL
  actual_commands JSON,                         -- 实际执行的命令
  
  -- 一致性检查
  consistency_check_result ENUM('passed', 'warning', 'failed'),
  consistency_details JSON,
  
  -- 执行状态
  status ENUM('started', 'executing', 'completed', 'failed', 'blocked', 'rolled_back'),
  
  -- 执行人
  executor_id INT NOT NULL,
  executor_name VARCHAR(100),
  
  -- 时间记录
  started_at DATETIME,
  completed_at DATETIME,
  
  -- 结果
  result_summary TEXT,
  error_message TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES change_requests(id),
  INDEX idx_request (request_id),
  INDEX idx_environment (environment),
  INDEX idx_status (status)
);
```

### 6.3 一致性检查日志表

```sql
CREATE TABLE consistency_check_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  execution_id INT NOT NULL,
  check_type ENUM('file', 'sql', 'command', 'data_impact'),
  
  -- 检查内容
  expected_value TEXT,
  actual_value TEXT,
  
  -- 检查结果
  result ENUM('match', 'mismatch', 'unexpected', 'missing'),
  severity ENUM('info', 'warning', 'error', 'critical'),
  
  -- 详情
  details JSON,
  
  -- 处理
  action_taken ENUM('allowed', 'blocked', 'warned'),
  notification_sent BOOLEAN DEFAULT FALSE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (execution_id) REFERENCES change_executions(id),
  INDEX idx_execution (execution_id),
  INDEX idx_result (result)
);
```

### 6.4 部署配置表

```sql
CREATE TABLE deployment_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_name VARCHAR(100) NOT NULL,
  environment ENUM('test', 'production') NOT NULL,
  deployment_type ENUM('windows', 'docker', 'kubernetes', 'manus_cloud') NOT NULL,
  
  -- 配置详情
  config_data JSON NOT NULL,
  /*
  {
    "database": {
      "host": "localhost",
      "port": 3306,
      "name": "grt_system"
    },
    "server": {
      "port": 3000,
      "ssl": true
    },
    "features": {
      "crm": true,
      "project": true,
      "cost": true,
      "training": true,
      "ai": false
    },
    "security": {
      "twoFactor": true,
      "ipWhitelist": true,
      "auditLog": true
    }
  }
  */
  
  -- 状态
  is_active BOOLEAN DEFAULT FALSE,
  last_deployed_at DATETIME,
  deployed_version VARCHAR(50),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_name_env (config_name, environment)
);
```

---

## 7. API设计

### 7.1 变更申请API

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/changes` | POST | 创建变更申请 | developer, tester |
| `/api/changes` | GET | 获取变更申请列表 | all |
| `/api/changes/:id` | GET | 获取变更申请详情 | all |
| `/api/changes/:id` | PUT | 更新变更申请 | applicant |
| `/api/changes/:id/submit` | POST | 提交审批 | applicant |
| `/api/changes/:id/review` | POST | 技术审核 | reviewer |
| `/api/changes/:id/approve` | POST | 管理员审批 | admin |
| `/api/changes/:id/reject` | POST | 拒绝申请 | reviewer, admin |
| `/api/changes/:id/execute` | POST | 开始执行 | applicant |
| `/api/changes/:id/verify` | POST | 验证执行结果 | system |
| `/api/changes/:id/deploy` | POST | 部署到正式环境 | admin |
| `/api/changes/:id/rollback` | POST | 回滚变更 | admin |

### 7.2 一致性检查API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/consistency/check` | POST | 执行一致性检查 |
| `/api/consistency/logs/:executionId` | GET | 获取检查日志 |
| `/api/consistency/report/:requestId` | GET | 生成检查报告 |

### 7.3 部署管理API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/deployment/configs` | GET | 获取部署配置列表 |
| `/api/deployment/configs` | POST | 创建部署配置 |
| `/api/deployment/configs/:id` | PUT | 更新部署配置 |
| `/api/deployment/install` | POST | 执行安装 |
| `/api/deployment/status` | GET | 获取部署状态 |
| `/api/deployment/sync` | POST | 同步测试环境到正式环境 |

---

## 8. 安全考虑

### 8.1 访问控制

| 角色 | 权限 |
|------|------|
| **开发人员** | 创建申请、执行测试环境变更 |
| **测试人员** | 创建申请、执行测试、验证结果 |
| **技术负责人** | 技术审核、代码审查 |
| **管理员** | 审批申请、部署正式环境、回滚 |
| **超级管理员** | 所有权限、系统配置 |

### 8.2 审计追踪

所有操作都记录到审计日志：
- 申请创建、修改、删除
- 审批操作
- 执行操作
- 一致性检查结果
- 部署操作
- 回滚操作

### 8.3 数据保护

- 测试环境数据自动脱敏
- 敏感配置加密存储
- 执行令牌一次性使用
- 操作日志防篡改（区块链式哈希链）

---

## 9. 实施计划

### 9.1 阶段划分

| 阶段 | 内容 | 时间 |
|------|------|------|
| **Phase 1** | 数据库Schema和基础API | 1周 |
| **Phase 2** | 变更申请和审批流程 | 1周 |
| **Phase 3** | 一致性检测引擎 | 1周 |
| **Phase 4** | 部署安装器 | 1周 |
| **Phase 5** | 前端界面 | 1周 |
| **Phase 6** | 测试和文档 | 1周 |

### 9.2 里程碑

1. **M1**: 变更申请系统上线
2. **M2**: 自动化验证系统上线
3. **M3**: Windows安装器发布
4. **M4**: Docker镜像发布
5. **M5**: 完整文档发布

---

## 10. 附录

### 10.1 术语表

| 术语 | 定义 |
|------|------|
| **变更申请** | 对系统进行修改的正式请求 |
| **执行令牌** | 授权执行变更的一次性凭证 |
| **一致性检查** | 验证实际执行与申请内容是否一致 |
| **环境同步** | 将测试环境的变更同步到正式环境 |

### 10.2 参考文档

- GRT智能系统安全防护架构设计 v1.0
- GRT智能系统开发规范指南
- NocoBase开发指南

---

**文档结束**
