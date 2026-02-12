# GRT智能系统 - CI/CD流水线配置指南

**版本**: 1.0.0  
**作者**: Manus AI  
**更新日期**: 2026年1月26日

---

## 目录

1. [概述](#1-概述)
2. [CI流水线](#2-ci流水线)
3. [CD流水线](#3-cd流水线)
4. [配置Secrets](#4-配置secrets)
5. [使用指南](#5-使用指南)

---

## 1. 概述

本项目使用GitHub Actions实现CI/CD自动化，包含代码检查、测试、构建和部署流程。

### 1.1 流水线架构

| 阶段 | 触发条件 | 主要任务 |
|------|----------|----------|
| CI | Push/PR到main/develop | 代码检查、测试、构建、Docker镜像 |
| CD | CI成功后/手动触发 | 部署到Staging/Production |

---

## 2. CI流水线

### 2.1 工作流文件

位置：`.github/workflows/ci.yml`

### 2.2 执行阶段

| 阶段 | 说明 |
|------|------|
| lint | 代码格式检查 |
| test | 单元测试 |
| build | 构建验证 |
| docker | Docker镜像构建和推送 |

---

## 3. CD流水线

### 3.1 工作流文件

位置：`.github/workflows/cd.yml`

### 3.2 部署环境

| 环境 | 触发方式 | 说明 |
|------|----------|------|
| Staging | CI成功后自动 | 测试环境 |
| Production | 手动触发 | 生产环境 |

---

## 4. 配置Secrets

在GitHub仓库Settings > Secrets and variables > Actions中配置：

| Secret | 说明 |
|--------|------|
| DOCKER_USERNAME | Docker Hub用户名 |
| DOCKER_PASSWORD | Docker Hub密码 |
| STAGING_HOST | Staging服务器地址 |
| STAGING_USER | Staging SSH用户名 |
| STAGING_SSH_KEY | Staging SSH私钥 |
| PRODUCTION_HOST | Production服务器地址 |
| PRODUCTION_USER | Production SSH用户名 |
| PRODUCTION_SSH_KEY | Production SSH私钥 |

---

## 5. 使用指南

### 5.1 手动触发部署

1. 进入GitHub仓库 > Actions
2. 选择"CD"工作流
3. 点击"Run workflow"
4. 选择部署环境
5. 点击"Run workflow"确认

### 5.2 查看部署状态

在Actions页面查看工作流执行状态和日志。

---

*本文档由Manus AI生成*
