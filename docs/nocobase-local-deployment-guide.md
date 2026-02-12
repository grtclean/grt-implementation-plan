# GRT智能系统 NocoBase 本地部署完整指南

## 概述

本指南提供在Windows本地环境上部署NocoBase的完整步骤，用于GRT智能系统的数据管理和工作流配置。

---

## 第一阶段：环境准备

### 1.1 系统要求

- **操作系统**：Windows 10/11
- **Node.js**：18.0 或更高版本
- **MySQL**：8.0 或 PostgreSQL 12+
- **磁盘空间**：至少 5GB
- **内存**：至少 4GB（推荐 8GB）

### 1.2 检查环境

```powershell
# 检查 Node.js 版本
node -v
# 应该输出 v18.x.x 或更高

# 检查 npm 版本
npm -v

# 检查 yarn（如果已安装）
yarn -v
```

### 1.3 配置国内镜像

```powershell
# 设置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 设置 yarn 镜像（如果使用 yarn）
yarn config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
```

---

## 第二阶段：MySQL 数据库准备

### 2.1 安装 MySQL

**选项 A：使用 MySQL 官方安装程序**

1. 从 [MySQL官网](https://dev.mysql.com/downloads/mysql/) 下载 MySQL 8.0
2. 运行安装程序，选择"Developer Default"配置
3. 配置 MySQL Server：
   - 端口：3306（默认）
   - 字符集：utf8mb4
   - 排序规则：utf8mb4_unicode_ci

**选项 B：使用 Docker（推荐）**

```powershell
# 如果已安装 Docker Desktop
docker run --name grt-mysql -e MYSQL_ROOT_PASSWORD=nocobase123 -e MYSQL_DATABASE=grt_nocobase -p 3306:3306 -d registry.cn-hangzhou.aliyuncs.com/library/mysql:8.0

# 验证 MySQL 运行
docker ps | findstr grt-mysql
```

### 2.2 创建数据库

```powershell
# 使用 MySQL 命令行工具
mysql -u root -p

# 输入密码后执行以下命令
CREATE DATABASE grt_nocobase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nocobase'@'localhost' IDENTIFIED BY 'nocobase123';
GRANT ALL PRIVILEGES ON grt_nocobase.* TO 'nocobase'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 第三阶段：NocoBase 安装

### 3.1 创建项目目录

```powershell
# 创建项目目录
mkdir D:\GRT-NocoBase
cd D:\GRT-NocoBase

# 验证目录创建
Get-ChildItem
```

### 3.2 使用 create-nocobase-app 创建项目

```powershell
# 创建 NocoBase 应用（使用 MySQL）
yarn create nocobase-app grt-system -d mysql

# 如果 yarn 不可用，使用 npm
npm create nocobase-app@latest grt-system -- -d mysql

# 等待安装完成（通常需要 5-10 分钟）
```

### 3.3 进入项目目录

```powershell
cd grt-system

# 验证项目结构
Get-ChildItem

# 应该看到以下目录：
# - packages/
# - plugins/
# - .env
# - package.json
```

---

## 第四阶段：环境配置

### 4.1 编辑 .env 文件

```powershell
# 使用编辑器打开 .env 文件
notepad .env
```

**配置内容（.env）：**

```env
# 应用配置
APP_ENV=development
APP_PORT=13000
APP_KEY=grt-nocobase-secret-key-2026-$(Get-Random)

# 数据库配置
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=grt_nocobase
DB_USER=root
DB_PASSWORD=nocobase123
DB_TIMEZONE=+08:00
DB_LOGGING=false

# 管理员账号
INIT_ROOT_EMAIL=admin@grt.com
INIT_ROOT_PASSWORD=Admin@123456
INIT_ROOT_NICKNAME=GRT管理员

# 存储配置
LOCAL_STORAGE_BASE_URL=/storage/uploads
STORAGE_TYPE=local

# 日志配置
LOG_LEVEL=info
```

### 4.2 验证配置

```powershell
# 查看 .env 文件内容
Get-Content .env
```

---

## 第五阶段：初始化与启动

### 5.1 安装依赖

```powershell
# 安装所有依赖
yarn install

# 如果使用 npm
npm install

# 等待安装完成（通常需要 10-15 分钟）
```

### 5.2 初始化 NocoBase

```powershell
# 初始化数据库和应用
yarn nocobase install

# 如果使用 npm
npm run nocobase install

# 等待初始化完成
```

### 5.3 启动开发服务器

```powershell
# 启动 NocoBase
yarn dev

# 如果使用 npm
npm run dev

# 应该看到类似输出：
# [2026-01-24 10:00:00] [info] Server started on http://localhost:13000
```

### 5.4 访问 NocoBase

1. 打开浏览器
2. 访问 `http://localhost:13000`
3. 使用以下凭证登录：
   - 邮箱：`admin@grt.com`
   - 密码：`Admin@123456`

---

## 第六阶段：导入 GRT 系统配置

### 6.1 准备导入文件

从 GRT 项目中获取配置文件：

```powershell
# 从 GRT 项目复制配置文件
Copy-Item -Path "D:\grt-implementation-plan\nocobase\collections\*" -Destination "D:\GRT-NocoBase\grt-system\collections\" -Recurse

# 复制工作流配置
Copy-Item -Path "D:\grt-implementation-plan\nocobase\workflows\*" -Destination "D:\GRT-NocoBase\grt-system\workflows\" -Recurse
```

### 6.2 导入 Collections（数据表）

1. 在 NocoBase 管理界面中
2. 进入 **Settings** → **Collections**
3. 点击 **Import**
4. 选择 Collections 配置文件
5. 确认导入

**包含的 Collections（17个）：**

| Collection | 描述 |
|-----------|------|
| customers | 客户表 |
| leads | 线索表 |
| opportunities | 商机表 |
| contacts | 联系人表 |
| projects | 项目表 |
| project_phases | 项目阶段表 |
| tasks | 任务表 |
| milestones | 里程碑表 |
| gate_reviews | 门径评审表 |
| employees | 员工表 |
| skills | 技能表 |
| attendance | 考勤表 |
| budgets | 预算表 |
| cost_entries | 成本条目表 |
| payment_nodes | 付款节点表 |
| ai_conversations | AI对话记录表 |
| audit_logs | 审计日志表 |

### 6.3 导入 Workflows（工作流）

1. 进入 **Settings** → **Workflows**
2. 点击 **Import**
3. 选择 Workflow 配置文件
4. 确认导入

**包含的 Workflows（4个）：**

| Workflow | 描述 |
|----------|------|
| sales_pipeline | 销售流程工作流 |
| project_lifecycle | 项目生命周期工作流 |
| approval_process | 审批流程工作流 |
| ai_automation | AI自动化工作流 |

---

## 第七阶段：配置与优化

### 7.1 配置用户权限

1. 进入 **Settings** → **Users & Roles**
2. 创建以下角色：
   - **Admin**：完全权限
   - **Manager**：管理权限
   - **User**：基本权限
   - **Guest**：只读权限

### 7.2 配置字段验证

1. 编辑各 Collection 的字段
2. 设置必填字段、默认值、验证规则
3. 配置字段显示格式

### 7.3 创建视图

为每个 Collection 创建多个视图：

- **Grid View**：表格视图
- **Form View**：表单视图
- **Gallery View**：画廊视图
- **Calendar View**：日历视图（时间相关表）
- **Kanban View**：看板视图（状态相关表）

---

## 第八阶段：与 GRT 系统集成

### 8.1 配置 API 连接

```powershell
# 在 GRT 项目的 .env 中添加 NocoBase API 配置
NOCOBASE_API_URL=http://localhost:13000/api
NOCOBASE_API_TOKEN=your_api_token_here
```

### 8.2 获取 API Token

1. 在 NocoBase 中登录管理员账号
2. 进入 **Settings** → **API Tokens**
3. 点击 **Create Token**
4. 复制生成的 Token

### 8.3 数据同步

```powershell
# 在 GRT 项目中运行数据同步脚本
cd D:\grt-implementation-plan
node scripts/sync-to-nocobase.mjs
```

---

## 常见问题解决

### Q1：MySQL 连接失败

**错误信息**：`Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案**：
1. 确认 MySQL 服务运行中：`mysql -u root -p`
2. 检查 .env 中的数据库配置
3. 如果使用 Docker，确认容器运行：`docker ps`

### Q2：端口 13000 已被占用

**错误信息**：`Error: listen EADDRINUSE :::13000`

**解决方案**：
```powershell
# 查找占用端口的进程
Get-NetTCPConnection -LocalPort 13000

# 杀死进程（替换 PID）
Stop-Process -Id <PID> -Force

# 或修改 .env 中的 APP_PORT
```

### Q3：初始化失败

**解决方案**：
```powershell
# 清除旧数据
yarn nocobase reset

# 重新初始化
yarn nocobase install
```

### Q4：导入配置文件失败

**解决方案**：
1. 检查文件格式是否正确（JSON）
2. 确认文件编码为 UTF-8
3. 查看 NocoBase 日志获取详细错误信息

---

## 生产部署建议

### 部署前检查清单

- [ ] 数据库备份已创建
- [ ] 所有 Collections 已导入
- [ ] 所有 Workflows 已配置
- [ ] 用户权限已设置
- [ ] API 连接已测试
- [ ] 性能测试已完成

### 性能优化

1. **启用缓存**：在 .env 中配置 Redis
2. **数据库优化**：添加必要的索引
3. **文件存储**：配置 S3 或其他对象存储
4. **负载均衡**：使用 Nginx 进行反向代理

### 备份策略

```powershell
# 定期备份数据库
mysqldump -u root -p grt_nocobase > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# 备份 NocoBase 配置
Compress-Archive -Path "D:\GRT-NocoBase\grt-system" -DestinationPath "backup_$(Get-Date -Format "yyyyMMdd_HHmmss").zip"
```

---

## 下一步

1. **配置 Gemini AI 集成**：在 NocoBase 中配置 AI 助手
2. **设置工作流自动化**：配置触发器和自动化规则
3. **创建仪表板**：设计关键指标仪表板
4. **培训用户**：为团队成员提供使用培训

---

## 支持与反馈

如有问题或建议，请联系：
- 技术支持：tech@grt.com
- 文档反馈：docs@grt.com
