# GRT智能系统 - 部署文档索引

**版本**: v1.3.36  
**更新日期**: 2026年1月26日

---

## 文档概述

本目录包含GRT智能系统的完整部署文档，涵盖本地部署、云部署和代码查验流程。

---

## 文档列表

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [Windows 11 本地部署指南](./windows11-local-deployment-guide.md) | 完整的Windows 11本地服务器部署流程 | 本地开发、内网部署 |
| [Claude Code 代码查验流程](./claude-code-review-workflow.md) | 代码查验标准流程和最佳实践 | 开发过程质量控制 |
| [云部署地理位置建议](./cloud-deployment-recommendations.md) | 基于地理位置的云部署建议 | 云服务器选型 |
| [Docker 部署指南](./docker-deployment-guide.md) | Docker容器化部署完整流程 | 容器化部署 |
| [CI/CD 流水线配置指南](./cicd-guide.md) | GitHub Actions自动化流水线配置 | 自动化测试和部署 |

---

## 快速开始

### 本地部署（Windows 11）

```powershell
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
Copy-Item .env.example .env
# 编辑.env文件

# 3. 初始化数据库
pnpm db:push

# 4. 启动开发服务器
pnpm dev
```

### 生产部署

```powershell
# 1. 构建项目
pnpm build

# 2. 使用PM2启动
pm2 start ecosystem.config.cjs
```

---

## 相关脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| 代码查验 | `scripts/code-review.ps1` | 自动化代码检查 |
| 数据库备份 | `scripts/backup-db.ps1` | MySQL数据库备份 |
| 健康检查 | `scripts/health-check.ps1` | 系统健康状态检查 |

---

## 技术支持

如有问题，请参考相关文档或提交Issue。
