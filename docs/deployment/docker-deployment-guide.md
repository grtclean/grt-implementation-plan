# GRT智能系统 - Docker部署指南

**版本**: 1.0.0  
**作者**: Manus AI  
**更新日期**: 2026年1月26日

---

## 目录

1. [概述](#1-概述)
2. [前置要求](#2-前置要求)
3. [快速开始](#3-快速开始)
4. [配置说明](#4-配置说明)
5. [运维操作](#5-运维操作)
6. [故障排查](#6-故障排查)

---

## 1. 概述

本文档提供GRT智能系统的Docker容器化部署指南。通过Docker Compose，您可以一键部署包含应用服务、MySQL数据库和Redis缓存的完整系统。

### 1.1 部署架构

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| grt-app | 自构建 | 3000 | GRT应用主服务 |
| mysql | mysql:8.0 | 3306 | MySQL数据库 |
| redis | redis:7-alpine | 6379 | Redis缓存 |
| adminer | adminer:latest | 8080 | 数据库管理（开发环境） |

### 1.2 系统要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 50GB+ |
| Docker | 20.10+ | 最新稳定版 |

---

## 2. 前置要求

### 2.1 安装Docker

**Linux (Ubuntu/Debian)**

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Windows**

下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)，启用WSL 2后端。

---

## 3. 快速开始

### 3.1 配置环境变量

```bash
cp .env.docker.example .env
# 编辑.env文件，配置数据库密码和JWT密钥
```

### 3.2 启动服务

```bash
docker compose up -d
docker compose ps
docker compose logs -f grt-app
```

### 3.3 访问系统

| 服务 | 地址 |
|------|------|
| GRT应用 | http://localhost:3000 |
| Adminer | http://localhost:8080 |

---

## 4. 配置说明

### 4.1 必需环境变量

| 变量 | 说明 |
|------|------|
| MYSQL_ROOT_PASSWORD | MySQL root密码 |
| MYSQL_PASSWORD | GRT用户密码 |
| DATABASE_URL | 数据库连接字符串 |
| JWT_SECRET | JWT签名密钥（至少32字符） |

---

## 5. 运维操作

### 5.1 常用命令

```bash
# 启动/停止服务
docker compose up -d
docker compose down

# 查看日志
docker compose logs -f grt-app

# 备份数据库
docker compose exec mysql mysqldump -u root -p grt_db > backup.sql

# 健康检查
curl http://localhost:3000/api/health
```

---

## 6. 故障排查

**MySQL启动失败**：检查内存是否充足，端口是否被占用

**应用无法连接数据库**：检查DATABASE_URL配置和网络连接

**容器频繁重启**：查看日志 `docker compose logs --tail=50 grt-app`

---

*本文档由Manus AI生成*
