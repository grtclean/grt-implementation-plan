# GRT智能系统 - GitHub导出与本地部署指南

**版本**: v1.6.2  
**作者**: Manus AI  
**更新日期**: 2026年2月5日

---

## 概述

本指南详细介绍如何将GRT智能系统从Manus平台导出到GitHub，并在本地Windows 11服务器上完成部署。

---

## 第一部分：从Manus平台导出到GitHub

### 1.1 准备工作

在开始导出之前，请确保您已具备以下条件：

| 准备项 | 说明 |
|--------|------|
| GitHub账户 | 已注册并登录的GitHub账户 |
| 仓库权限 | 有权限创建新仓库或推送到现有仓库 |
| Manus登录 | 已登录Manus平台并打开项目 |

### 1.2 导出步骤

按照以下步骤将代码导出到GitHub：

**步骤1：打开Management UI**

在Manus平台的项目页面，点击右侧的Management UI面板图标（或点击聊天框上方的图标）。

**步骤2：进入Settings**

在Management UI中，点击左侧导航栏的 **Settings** 选项卡。

**步骤3：选择GitHub**

在Settings子菜单中，点击 **GitHub** 选项。

**步骤4：授权GitHub**

如果是首次使用，系统会提示您授权Manus访问您的GitHub账户。点击 **Authorize** 按钮并完成GitHub OAuth授权流程。

**步骤5：配置导出选项**

填写以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| Repository Owner | 选择仓库所有者（个人或组织） | your-username |
| Repository Name | 输入新仓库名称 | grt-implementation-plan |
| Visibility | 选择仓库可见性 | Private（推荐） |

**步骤6：执行导出**

点击 **Export to GitHub** 按钮。系统将自动创建仓库并推送所有代码。

**步骤7：确认导出成功**

导出完成后，您将看到成功提示和仓库链接。点击链接可直接访问GitHub仓库。

---

## 第二部分：在本地Windows 11服务器部署

### 2.1 克隆代码

在WSL 2 Ubuntu终端中执行以下命令：

```bash
# 创建项目目录
mkdir -p ~/projects && cd ~/projects

# 克隆仓库（替换为您的仓库地址）
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git

# 进入项目目录
cd grt-implementation-plan
```

如果是私有仓库，您需要配置GitHub认证：

```bash
# 方式1：使用Personal Access Token
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/grt-implementation-plan.git

# 方式2：配置SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 将公钥添加到GitHub Settings → SSH and GPG keys
git clone git@github.com:YOUR_USERNAME/grt-implementation-plan.git
```

### 2.2 运行安装脚本

使用菜单驱动的安装脚本完成部署：

```bash
# 进入项目目录
cd ~/projects/grt-implementation-plan

# 运行安装脚本
./docker/install.sh
```

安装脚本将引导您完成以下步骤：

1. 检查系统要求（Docker、Docker Compose）
2. 选择部署环境（Windows 11 / Linux / Cloud / Dev）
3. 配置环境变量（自动生成安全密钥）
4. 启动所有服务
5. 初始化数据库

### 2.3 手动部署（可选）

如果您希望手动控制部署过程：

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑环境变量
nano .env

# 3. 构建并启动服务
docker compose up -d --build

# 4. 查看服务状态
docker compose ps

# 5. 执行数据库迁移
docker compose exec grt-app sh -c "pnpm db:push"
```

---

## 第三部分：后续更新

### 3.1 从GitHub拉取更新

当Manus平台有新版本时，重新导出到GitHub，然后在本地执行：

```bash
# 进入项目目录
cd ~/projects/grt-implementation-plan

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build

# 执行数据库迁移（如有）
docker compose exec grt-app sh -c "pnpm db:push"
```

### 3.2 处理合并冲突

如果本地有修改，可能会遇到合并冲突：

```bash
# 暂存本地修改
git stash

# 拉取远程更新
git pull origin main

# 恢复本地修改
git stash pop

# 解决冲突后提交
git add .
git commit -m "Merge remote changes"
```

---

## 常见问题

### Q1: 导出失败，提示权限不足

**解决方案**: 检查GitHub授权是否过期，重新进行OAuth授权。

### Q2: 克隆私有仓库失败

**解决方案**: 使用Personal Access Token或配置SSH密钥进行认证。

### Q3: Docker构建失败

**解决方案**: 检查Docker Desktop是否正常运行，确保WSL 2集成已启用。

---

## 技术支持

如遇到问题，请通过以下渠道获取帮助：

- 提交GitHub Issue
- 联系系统管理员
- 查阅Manus平台文档

---

*本文档由 Manus AI 自动生成，最后更新于 2026年2月5日*
