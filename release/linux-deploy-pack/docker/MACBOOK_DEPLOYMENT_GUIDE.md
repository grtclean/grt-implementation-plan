# GRT智能系统 - MacBook 部署与 Manus 更新指南

**版本**: v1.6.4  
**作者**: Manus AI  
**更新日期**: 2026年2月5日

---

## 概述

本指南专门针对在 MacBook 上部署 GRT 智能系统，并详细分析如何通过 Manus 平台便捷地更新本地服务器。文档包含部署方案对比、更新流程设计，以及有利条件和不利条件的全面分析。

---

## 第一部分：MacBook 部署方案

### 1.1 部署方案对比

在 MacBook 上部署 GRT 系统有两种主要方案，各有优劣：

| 对比维度 | Docker Desktop for Mac | 原生 macOS (Homebrew) |
|----------|------------------------|----------------------|
| **安装复杂度** | 低（一键安装） | 中等（需分别安装组件） |
| **资源占用** | 较高（Docker VM） | 较低（原生运行） |
| **环境一致性** | 高（与生产环境一致） | 中等（可能有差异） |
| **启动速度** | 较慢（需启动Docker） | 快（直接运行） |
| **更新便捷性** | 高（容器替换） | 中等（需手动操作） |
| **调试便利性** | 中等 | 高（直接访问文件） |
| **Apple Silicon兼容** | 良好（原生支持） | 优秀 |

> **推荐**：如果您追求环境一致性和更新便捷性，选择 Docker Desktop；如果追求性能和调试便利，选择原生 Homebrew 方案。

### 1.2 方案A：Docker Desktop for Mac

Docker Desktop 是在 MacBook 上运行容器化应用的最简单方式，特别适合需要与生产环境保持一致的场景。

#### 安装步骤

首先从 Docker 官网下载 Docker Desktop for Mac。对于 Apple Silicon (M1/M2/M3) 芯片，请选择 "Apple Chip" 版本；对于 Intel 芯片，选择 "Intel Chip" 版本。

```bash
# 安装完成后，验证 Docker
docker --version
docker compose version

# 克隆项目代码
cd ~/Projects
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git
cd grt-implementation-plan

# 配置环境变量
cp .env.example .env
nano .env  # 或使用 vim、VS Code 编辑

# 启动服务
docker compose up -d --build

# 查看服务状态
docker compose ps
```

启动成功后，访问 http://localhost:3000 即可使用系统。

#### Docker Desktop 资源配置

为获得最佳性能，建议在 Docker Desktop 设置中调整资源分配：

| 资源 | 推荐配置 | 最低配置 |
|------|----------|----------|
| CPU | 4 核 | 2 核 |
| 内存 | 8 GB | 4 GB |
| 磁盘 | 60 GB | 20 GB |

### 1.3 方案B：原生 macOS (Homebrew)

使用 Homebrew 直接在 macOS 上安装运行时环境，性能更好，调试更方便。

#### 安装依赖

```bash
# 安装 Homebrew（如果尚未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js 22
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 安装 MySQL 8.0
brew install mysql@8.0
brew services start mysql@8.0

# 安装 Redis（可选）
brew install redis
brew services start redis

# 安装 pnpm
npm install -g pnpm
```

#### 配置数据库

```bash
# 设置 MySQL root 密码
mysql_secure_installation

# 登录 MySQL 创建数据库
mysql -u root -p
```

```sql
CREATE DATABASE grt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'grt'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON grt_db.* TO 'grt'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 运行项目

```bash
# 克隆项目
cd ~/Projects
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git
cd grt-implementation-plan

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
nano .env
# 设置 DATABASE_URL=mysql://grt:your_password@localhost:3306/grt_db

# 初始化数据库
pnpm db:push

# 启动开发服务器
pnpm dev
```

---

## 第二部分：通过 Manus 更新本地服务器

### 2.1 更新流程概述

通过 Manus 平台更新本地 MacBook 服务器的核心流程如下：

```
Manus 平台开发 → 导出到 GitHub → 本地 git pull → 重启服务
```

这种方式将 Manus 作为开发环境，MacBook 作为运行环境，通过 Git 实现代码同步。

### 2.2 有利条件分析

| 有利条件 | 详细说明 |
|----------|----------|
| **可视化开发** | 在 Manus 平台上可以直接预览效果，所见即所得 |
| **AI 辅助开发** | 通过自然语言描述需求，Manus 自动生成代码 |
| **版本管理** | 每次保存 Checkpoint 都有完整的版本记录，可随时回滚 |
| **无需本地开发环境** | 不需要在 MacBook 上配置复杂的开发工具链 |
| **代码审查** | 通过 GitHub 可以查看每次更新的具体变更 |
| **测试环境隔离** | Manus 平台提供独立的测试环境，不影响本地生产 |
| **自动化部署脚本** | 可以编写脚本实现一键更新 |

### 2.3 不利条件分析

| 不利条件 | 详细说明 | 缓解方案 |
|----------|----------|----------|
| **网络依赖** | 需要稳定的网络连接才能使用 Manus | 使用稳定的网络环境 |
| **同步延迟** | 从 Manus 到本地需要手动同步 | 编写自动化脚本 |
| **数据库迁移** | Schema 变更需要手动执行迁移 | 使用 `pnpm db:push` 自动迁移 |
| **环境差异** | Manus 和本地环境可能存在细微差异 | 使用 Docker 保持环境一致 |
| **离线无法开发** | 没有网络时无法使用 Manus | 保留本地开发能力作为备份 |
| **敏感数据处理** | 某些配置不应提交到 Git | 使用 .env 文件管理敏感配置 |

### 2.4 便捷更新步骤

为了实现直观便捷的更新流程，我们设计了以下标准化步骤：

#### 步骤1：在 Manus 平台完成开发

在 Manus 平台上完成功能开发和测试后，保存 Checkpoint 并导出到 GitHub。

#### 步骤2：本地执行更新脚本

在 MacBook 上创建更新脚本 `update.sh`：

```bash
#!/bin/bash
# GRT 系统更新脚本 - MacBook 版

set -e

echo "=========================================="
echo "  GRT 智能系统更新脚本"
echo "=========================================="

# 配置
PROJECT_DIR=~/Projects/grt-implementation-plan
BACKUP_DIR=~/Projects/grt-backups

# 创建备份
echo "[1/5] 创建备份..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp -r $PROJECT_DIR $BACKUP_DIR/backup_$TIMESTAMP

# 拉取最新代码
echo "[2/5] 拉取最新代码..."
cd $PROJECT_DIR
git fetch origin
git pull origin main

# 安装依赖
echo "[3/5] 更新依赖..."
pnpm install

# 执行数据库迁移
echo "[4/5] 执行数据库迁移..."
pnpm db:push

# 重启服务
echo "[5/5] 重启服务..."
if command -v docker &> /dev/null && docker compose ps | grep -q "grt"; then
    # Docker 模式
    docker compose down
    docker compose up -d --build
else
    # 原生模式 - 使用 PM2
    pm2 restart grt-system || pnpm dev &
fi

echo "=========================================="
echo "  更新完成！"
echo "  访问: http://localhost:3000"
echo "=========================================="
```

赋予执行权限并运行：

```bash
chmod +x update.sh
./update.sh
```

#### 步骤3：验证更新

更新完成后，访问 http://localhost:3000 验证系统是否正常运行。如果发现问题，可以使用备份快速回滚：

```bash
# 回滚到上一个备份
cd ~/Projects/grt-backups
ls -la  # 查看可用备份
cp -r backup_YYYYMMDD_HHMMSS ~/Projects/grt-implementation-plan
```

---

## 第三部分：自动化更新方案

### 3.1 GitHub Actions 自动通知

可以配置 GitHub Actions，在代码推送后自动发送通知到您的 MacBook：

```yaml
# .github/workflows/notify-update.yml
name: Notify Update Available

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          curl -X POST "https://your-webhook-url" \
            -H "Content-Type: application/json" \
            -d '{"text": "GRT 系统有新更新可用，请执行 ./update.sh"}'
```

### 3.2 定时检查更新

在 MacBook 上配置 cron 任务，定期检查是否有新更新：

```bash
# 编辑 crontab
crontab -e

# 每小时检查一次更新
0 * * * * cd ~/Projects/grt-implementation-plan && git fetch origin && git log HEAD..origin/main --oneline | head -1 && osascript -e 'display notification "GRT 系统有新更新" with title "更新提醒"'
```

### 3.3 一键更新快捷方式

在 macOS 上创建 Automator 应用或 Shell 脚本快捷方式：

```bash
# 创建桌面快捷方式
cat > ~/Desktop/更新GRT系统.command << 'EOF'
#!/bin/bash
cd ~/Projects/grt-implementation-plan
./update.sh
read -p "按回车键关闭..."
EOF
chmod +x ~/Desktop/更新GRT系统.command
```

---

## 第四部分：最佳实践建议

### 4.1 开发工作流

为了最大化利用 Manus 平台的优势，建议采用以下工作流：

1. **日常开发**：在 Manus 平台上进行，利用 AI 辅助和可视化预览
2. **代码审查**：通过 GitHub 查看变更，确保代码质量
3. **本地测试**：更新到 MacBook 后进行完整测试
4. **生产部署**：确认无误后部署到生产服务器

### 4.2 数据同步策略

| 数据类型 | 同步策略 |
|----------|----------|
| 代码文件 | 通过 Git 同步 |
| 数据库 Schema | 通过 `pnpm db:push` 迁移 |
| 业务数据 | 不同步（各环境独立） |
| 环境变量 | 手动配置（不提交到 Git） |
| 上传文件 | 使用 S3 或独立存储 |

### 4.3 故障恢复

如果更新后出现问题，可以按以下步骤恢复：

```bash
# 1. 停止服务
docker compose down  # Docker 模式
# 或
pm2 stop grt-system  # 原生模式

# 2. 恢复备份
cp -r ~/Projects/grt-backups/backup_最新时间戳 ~/Projects/grt-implementation-plan

# 3. 重启服务
docker compose up -d  # Docker 模式
# 或
pm2 start grt-system  # 原生模式
```

---

## 总结

在 MacBook 上部署 GRT 系统并通过 Manus 更新是一种高效的开发运维模式。通过本指南提供的方案和脚本，您可以实现：

- **便捷部署**：Docker 或 Homebrew 两种方案可选
- **直观更新**：一键脚本完成代码同步和服务重启
- **安全可靠**：自动备份确保可以快速回滚
- **高效协作**：Manus 平台提供 AI 辅助开发能力

如有任何问题，请参考故障排除章节或联系技术支持。

---

*本文档由 Manus AI 自动生成，最后更新于 2026年2月5日*
