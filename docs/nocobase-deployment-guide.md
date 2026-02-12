# NocoBase 部署与任务导入指南

> **文档版本**: 1.0  
> **创建日期**: 2026-01-17  
> **作者**: Manus AI  
> **适用版本**: NocoBase v1.x

---

## 目录

1. [概述](#概述)
2. [部署方式选择](#部署方式选择)
3. [Docker部署（推荐）](#docker部署推荐)
4. [本地源码部署](#本地源码部署)
5. [初始配置](#初始配置)
6. [任务数据表创建](#任务数据表创建)
7. [17个AI助手任务导入](#17个ai助手任务导入)
8. [看板视图配置](#看板视图配置)
9. [与GRT系统集成](#与grt系统集成)
10. [常见问题](#常见问题)

---

## 概述

NocoBase是一个开源的无代码/低代码开发平台，本指南将帮助您完成以下目标：

1. 在本地服务器或云环境部署NocoBase
2. 创建任务管理数据表结构
3. 导入17个AI助手开发任务
4. 配置看板、甘特图等可视化视图
5. 实现与GRT智能系统的数据集成

**系统要求**：

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 50GB+ |
| 操作系统 | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 LTS |
| Docker | 20.10+ | 最新稳定版 |
| Node.js | 18.x | 20.x LTS |

---

## 部署方式选择

NocoBase支持多种部署方式，根据您的环境和需求选择：

| 部署方式 | 适用场景 | 复杂度 | 推荐指数 |
|----------|----------|--------|----------|
| Docker Compose | 快速部署、测试环境 | 低 | ⭐⭐⭐⭐⭐ |
| Docker单容器 | 开发测试 | 低 | ⭐⭐⭐⭐ |
| 源码部署 | 二次开发、定制需求 | 中 | ⭐⭐⭐ |
| Kubernetes | 生产环境、高可用 | 高 | ⭐⭐⭐⭐ |

---

## Docker部署（推荐）

### 3.1 前置准备

首先确保已安装Docker和Docker Compose：

```bash
# 安装Docker（Ubuntu）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 3.2 创建部署目录

```bash
# 创建NocoBase目录
mkdir -p /opt/nocobase
cd /opt/nocobase

# 创建数据持久化目录
mkdir -p data/storage data/db
```

### 3.3 创建docker-compose.yml

创建`docker-compose.yml`文件：

```yaml
version: '3.8'

services:
  nocobase:
    image: nocobase/nocobase:latest
    container_name: nocobase
    restart: unless-stopped
    ports:
      - "13000:80"
    environment:
      # 应用配置
      - APP_ENV=production
      - APP_KEY=your-secret-key-change-this
      - APP_PORT=80
      
      # 数据库配置（使用内置SQLite）
      - DB_DIALECT=sqlite
      - DB_STORAGE=/app/storage/db/nocobase.db
      
      # 或使用MySQL（推荐生产环境）
      # - DB_DIALECT=mysql
      # - DB_HOST=mysql
      # - DB_PORT=3306
      # - DB_DATABASE=nocobase
      # - DB_USER=nocobase
      # - DB_PASSWORD=your-db-password
      
      # 时区设置
      - TZ=Asia/Shanghai
      
    volumes:
      - ./data/storage:/app/storage
    networks:
      - nocobase-network

  # 可选：MySQL数据库（生产环境推荐）
  # mysql:
  #   image: mysql:8.0
  #   container_name: nocobase-mysql
  #   restart: unless-stopped
  #   environment:
  #     - MYSQL_ROOT_PASSWORD=root-password
  #     - MYSQL_DATABASE=nocobase
  #     - MYSQL_USER=nocobase
  #     - MYSQL_PASSWORD=your-db-password
  #   volumes:
  #     - ./data/db:/var/lib/mysql
  #   networks:
  #     - nocobase-network

networks:
  nocobase-network:
    driver: bridge
```

### 3.4 启动服务

```bash
# 启动NocoBase
docker-compose up -d

# 查看日志
docker-compose logs -f nocobase

# 检查服务状态
docker-compose ps
```

### 3.5 访问验证

服务启动后，访问 `http://your-server-ip:13000` 进入NocoBase。

首次访问将进入初始化向导：
1. 设置管理员账号和密码
2. 选择语言（中文）
3. 完成初始化

---

## 本地源码部署

如果需要进行二次开发或定制，可以选择源码部署：

### 4.1 环境准备

```bash
# 安装Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm

# 安装Git
sudo apt-get install -y git
```

### 4.2 克隆源码

```bash
# 克隆NocoBase仓库
git clone https://github.com/nocobase/nocobase.git
cd nocobase

# 切换到稳定版本
git checkout main
```

### 4.3 安装依赖

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 4.4 配置环境变量

创建`.env`文件：

```bash
# 应用配置
APP_ENV=development
APP_KEY=your-secret-key-change-this
APP_PORT=13000

# 数据库配置
DB_DIALECT=sqlite
DB_STORAGE=./storage/db/nocobase.db

# 或MySQL
# DB_DIALECT=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_DATABASE=nocobase
# DB_USER=root
# DB_PASSWORD=your-password
```

### 4.5 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start
```

---

## 初始配置

### 5.1 登录系统

使用初始化时设置的管理员账号登录系统。

### 5.2 安装必要插件

进入**设置 → 插件管理**，确保以下插件已启用：

| 插件名称 | 用途 | 状态 |
|----------|------|------|
| 数据表管理 | 创建和管理数据表 | 必须启用 |
| 区块管理 | 创建看板、表格等视图 | 必须启用 |
| 工作流 | 自动化流程 | 推荐启用 |
| 导入导出 | 数据导入导出 | 推荐启用 |
| API文档 | API接口文档 | 可选 |

### 5.3 配置用户权限

1. 进入**设置 → 用户和权限**
2. 创建角色：管理员、项目经理、开发人员、测试人员
3. 为每个角色配置相应的数据表访问权限

---

## 任务数据表创建

### 6.1 创建任务主表

进入**设置 → 数据表管理 → 新建数据表**：

**表名**: `tasks`  
**标题**: 任务管理

添加以下字段：

| 字段名 | 显示名称 | 字段类型 | 配置 |
|--------|----------|----------|------|
| task_id | 任务编号 | 自动编号 | 前缀: TASK-, 位数: 3 |
| title | 任务标题 | 单行文本 | 必填, 最大长度: 200 |
| description | 任务描述 | 多行文本 | 支持Markdown |
| task_type | 任务类型 | 单选 | 选项: 开发/设计/测试/文档/部署 |
| priority | 优先级 | 单选 | 选项: P0-紧急/P1-高/P2-中/P3-低 |
| status | 状态 | 单选 | 选项: 待开始/进行中/待审核/已完成/已取消 |
| phase | 所属阶段 | 单行文本 | - |
| assignee | 负责人 | 关联用户 | 多选 |
| reviewer | 审核人 | 关联用户 | 单选 |
| estimated_hours | 预估工时 | 数字 | 小数位: 1 |
| actual_hours | 实际工时 | 数字 | 小数位: 1 |
| start_date | 开始日期 | 日期 | - |
| due_date | 截止日期 | 日期 | - |
| completed_at | 完成时间 | 日期时间 | - |
| deliverables | 交付物 | 多行文本 | JSON格式 |
| dependencies | 前置任务 | 多行文本 | 任务ID列表 |
| tags | 标签 | 多选 | 自定义标签 |

### 6.2 创建任务评论表

**表名**: `task_comments`  
**标题**: 任务评论

| 字段名 | 显示名称 | 字段类型 | 配置 |
|--------|----------|----------|------|
| task_id | 关联任务 | 关联字段 | 关联tasks表 |
| content | 评论内容 | 多行文本 | 支持Markdown |
| author | 评论人 | 关联用户 | 自动填充当前用户 |
| created_at | 评论时间 | 日期时间 | 自动填充 |

### 6.3 创建工时记录表

**表名**: `task_time_logs`  
**标题**: 工时记录

| 字段名 | 显示名称 | 字段类型 | 配置 |
|--------|----------|----------|------|
| task_id | 关联任务 | 关联字段 | 关联tasks表 |
| user | 记录人 | 关联用户 | 自动填充 |
| hours | 工时 | 数字 | 小数位: 1 |
| work_date | 工作日期 | 日期 | - |
| description | 工作描述 | 单行文本 | - |

---

## 17个AI助手任务导入

### 7.1 任务数据

以下是需要导入的17个AI助手开发任务：

#### Phase 1 - 基础架构（4个任务）

| 任务ID | 标题 | 优先级 | 预估工时 | 依赖 |
|--------|------|--------|----------|------|
| TASK-001 | AI助手数据库Schema设计与创建 | P0-紧急 | 16h | - |
| TASK-002 | AI助手配置管理模块开发 | P0-紧急 | 24h | TASK-001 |
| TASK-003 | AI助手API网关开发 | P0-紧急 | 32h | TASK-001, TASK-002 |
| TASK-004 | Secrets管理模块开发 | P0-紧急 | 16h | TASK-001 |

#### Phase 2 - 核心助手（5个任务）

| 任务ID | 标题 | 优先级 | 预估工时 | 依赖 |
|--------|------|--------|----------|------|
| TASK-005 | Interview Assistant核心功能开发 | P1-高 | 40h | TASK-003, TASK-004 |
| TASK-006 | Solution Assistant核心功能开发 | P1-高 | 40h | TASK-003, TASK-004 |
| TASK-007 | Quotation Assistant核心功能开发 | P1-高 | 40h | TASK-006 |
| TASK-008 | Planning Assistant核心功能开发 | P1-高 | 40h | TASK-003, TASK-004 |
| TASK-009 | KPI Assistant核心功能开发 | P1-高 | 40h | TASK-008 |

#### Phase 3 - 扩展助手（3个任务）

| 任务ID | 标题 | 优先级 | 预估工时 | 依赖 |
|--------|------|--------|----------|------|
| TASK-010 | Purchase Assistant核心功能开发 | P2-中 | 32h | TASK-003, TASK-004 |
| TASK-011 | 员工AI助手个人化模块开发 | P1-高 | 48h | TASK-005, TASK-008, TASK-009 |
| TASK-012 | 项目数字孪生核心模块开发 | P1-高 | 56h | TASK-003 |

#### Phase 4 - 界面集成（3个任务）

| 任务ID | 标题 | 优先级 | 预估工时 | 依赖 |
|--------|------|--------|----------|------|
| TASK-013 | AI助手前端界面开发 | P1-高 | 40h | TASK-005~009 |
| TASK-014 | 数字孪生可视化仪表盘开发 | P2-中 | 32h | TASK-012 |
| TASK-015 | Manus-Claude协作流程实现 | P2-中 | 24h | TASK-003 |

#### Phase 5 - 测试部署（2个任务）

| 任务ID | 标题 | 优先级 | 预估工时 | 依赖 |
|--------|------|--------|----------|------|
| TASK-016 | 系统集成测试 | P1-高 | 40h | TASK-013~015 |
| TASK-017 | 文档编写与培训准备 | P2-中 | 24h | TASK-016 |

### 7.2 导入方法

#### 方法一：手动录入

1. 进入任务管理页面
2. 点击"新建"按钮
3. 按照上表逐条录入任务信息

#### 方法二：CSV导入

1. 下载CSV模板（见附录A）
2. 填写任务数据
3. 进入**设置 → 导入导出 → 导入**
4. 选择tasks表，上传CSV文件

#### 方法三：API批量导入

使用NocoBase API批量导入：

```bash
# 获取API Token
curl -X POST http://localhost:13000/api/auth:signIn \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# 批量创建任务
curl -X POST http://localhost:13000/api/tasks:create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "AI助手数据库Schema设计与创建",
    "task_type": "开发",
    "priority": "P0-紧急",
    "phase": "Phase 1 - 基础架构",
    "estimated_hours": 16,
    "status": "待开始"
  }'
```

---

## 看板视图配置

### 8.1 创建任务看板

1. 进入任务管理页面
2. 点击右上角"添加区块"
3. 选择"看板"类型
4. 配置分组字段为`status`

**看板列配置**：

| 列名 | 颜色 | WIP限制 |
|------|------|---------|
| 待开始 | 灰色 | 无 |
| 进行中 | 蓝色 | 5 |
| 待审核 | 黄色 | 3 |
| 已完成 | 绿色 | 无 |
| 已取消 | 红色 | 隐藏 |

### 8.2 创建甘特图视图

1. 添加"日历"或"时间线"区块
2. 配置开始日期字段为`start_date`
3. 配置结束日期字段为`due_date`
4. 按`phase`字段分组显示

### 8.3 创建统计仪表盘

添加以下统计区块：

1. **任务状态分布**：饼图，按status分组
2. **优先级分布**：柱状图，按priority分组
3. **阶段进度**：进度条，按phase分组统计完成率
4. **工时统计**：数字卡片，显示总预估/实际工时

---

## 与GRT系统集成

### 9.1 API集成方案

NocoBase提供RESTful API，可与GRT系统进行数据同步：

```typescript
// GRT系统中调用NocoBase API示例
const NOCOBASE_API = process.env.NOCOBASE_API_URL;
const NOCOBASE_TOKEN = process.env.NOCOBASE_API_TOKEN;

// 获取任务列表
async function getNocobaseTasks() {
  const response = await fetch(`${NOCOBASE_API}/api/tasks:list`, {
    headers: {
      'Authorization': `Bearer ${NOCOBASE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

// 更新任务状态
async function updateTaskStatus(taskId: string, status: string) {
  const response = await fetch(`${NOCOBASE_API}/api/tasks:update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOCOBASE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filterByTk: taskId,
      values: { status }
    })
  });
  return response.json();
}
```

### 9.2 Webhook配置

在NocoBase中配置Webhook，当任务状态变更时通知GRT系统：

1. 进入**设置 → 工作流**
2. 创建新工作流，触发条件：tasks表数据更新
3. 添加"HTTP请求"节点
4. 配置目标URL为GRT系统的Webhook接收地址

### 9.3 数据同步策略

| 同步方向 | 数据类型 | 同步频率 | 方式 |
|----------|----------|----------|------|
| NocoBase → GRT | 任务状态变更 | 实时 | Webhook |
| GRT → NocoBase | AI助手执行结果 | 实时 | API调用 |
| 双向 | 工时记录 | 每小时 | 定时任务 |

---

## 常见问题

### Q1: Docker容器启动失败

**问题**：容器无法启动，日志显示数据库连接失败

**解决方案**：
1. 检查数据库配置是否正确
2. 确保数据库服务已启动
3. 检查网络连接和防火墙设置

```bash
# 查看容器日志
docker logs nocobase

# 检查网络
docker network inspect nocobase-network
```

### Q2: 无法访问Web界面

**问题**：浏览器无法访问NocoBase

**解决方案**：
1. 确认端口映射正确
2. 检查防火墙是否开放端口
3. 确认服务已正常启动

```bash
# 检查端口占用
netstat -tlnp | grep 13000

# 开放防火墙端口
sudo ufw allow 13000
```

### Q3: 数据导入失败

**问题**：CSV导入时报错

**解决方案**：
1. 确保CSV编码为UTF-8
2. 检查字段名是否与表结构匹配
3. 验证数据格式是否正确

### Q4: 性能优化

**问题**：系统响应缓慢

**解决方案**：
1. 增加服务器资源
2. 使用MySQL替代SQLite
3. 配置Redis缓存
4. 优化数据库索引

---

## 附录

### 附录A：任务导入CSV模板

```csv
task_id,title,description,task_type,priority,status,phase,estimated_hours,dependencies,deliverables
TASK-001,AI助手数据库Schema设计与创建,设计并创建AI助手相关的数据库表结构,开发,P0-紧急,待开始,Phase 1 - 基础架构,16,,"数据库Schema文件,迁移脚本,表结构文档"
TASK-002,AI助手配置管理模块开发,开发AI助手配置管理模块,开发,P0-紧急,待开始,Phase 1 - 基础架构,24,TASK-001,"配置管理API,配置界面,单元测试"
```

### 附录B：环境变量参考

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| APP_ENV | 运行环境 | production |
| APP_KEY | 应用密钥 | 随机32位字符串 |
| APP_PORT | 服务端口 | 80 |
| DB_DIALECT | 数据库类型 | mysql/sqlite/postgres |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_DATABASE | 数据库名 | nocobase |
| DB_USER | 数据库用户 | nocobase |
| DB_PASSWORD | 数据库密码 | your-password |

---

**文档结束**

如有问题，请联系技术支持或查阅NocoBase官方文档：https://docs.nocobase.com/
