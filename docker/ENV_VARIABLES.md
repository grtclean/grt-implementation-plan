# GRT Intelligent System - Environment Variables Guide

## Sprint 4: 生产环境准备

本文档列出了部署GRT智能系统所需的所有环境变量。

---

## 数据库配置 (Database)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | MySQL 连接字符串 | `mysql://grt:password@localhost:3306/grt_db` |
| `MYSQL_ROOT_PASSWORD` | MySQL Root 密码 (Docker) | `your_root_password` |
| `MYSQL_PASSWORD` | MySQL 用户密码 (Docker) | `your_password` |

---

## 认证配置 (Authentication)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 (至少32字符) | `your-super-secret-jwt-key-min-32-chars` |
| `VITE_APP_ID` | Manus OAuth 应用 ID | `your_manus_app_id` |
| `OAUTH_SERVER_URL` | Manus OAuth 服务器 URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus 登录门户 URL | `https://manus.im/login` |
| `OWNER_OPEN_ID` | 应用所有者 Open ID | `your_owner_open_id` |
| `OWNER_NAME` | 应用所有者名称 | `Your Name` |

---

## 应用配置 (Application)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `VITE_APP_TITLE` | 应用标题 | `GRT智能系统` |
| `VITE_APP_LOGO` | 应用 Logo URL | `https://example.com/logo.png` |
| `VITE_API_URL` | API 基础 URL | `http://localhost/api` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `3000` |

---

## AI 服务配置 (AI Services)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL | `https://api.manus.im/forge` |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API 密钥 | `your_forge_api_key` |
| `VITE_FRONTEND_FORGE_API_URL` | 前端 Forge API URL | `https://api.manus.im/forge` |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端 Forge API 密钥 | `your_frontend_forge_api_key` |
| `GEMINI_API_KEY` | Google Gemini API 密钥 | `your_gemini_api_key` |

---

## 第三方集成 (Third-party Integrations)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `JIANDAOYUN_API_KEY` | 简道云 API 密钥 | `your_jiandaoyun_api_key` |
| `JIANDAOYUN_CORP_ID` | 简道云企业 ID | `your_jiandaoyun_corp_id` |
| `MICROSOFT_CLIENT_ID` | Microsoft Graph 客户端 ID | `your_microsoft_client_id` |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Graph 客户端密钥 | `your_microsoft_client_secret` |
| `MICROSOFT_TENANT_ID` | Microsoft Graph 租户 ID | `your_microsoft_tenant_id` |

---

## 缓存配置 (Cache)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `REDIS_PASSWORD` | Redis 密码 (Docker) | `your_redis_password` |

---

## 分析配置 (Analytics)

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `VITE_ANALYTICS_ENDPOINT` | 分析服务端点 | `https://analytics.example.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | 网站分析 ID | `your_website_id` |

---

## Windows 11 本地部署

### WSL 2 端口转发

如需从 Windows 主机访问 WSL 2 中运行的服务，请以管理员身份运行 PowerShell：

```powershell
# 添加端口转发
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=$(wsl hostname -I)

# 查看端口转发规则
netsh interface portproxy show all

# 删除端口转发
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
```

### 防火墙配置

```powershell
# 允许入站连接
New-NetFirewallRule -DisplayName "GRT System HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

---

## 快速开始

1. 复制环境变量模板
2. 在 Manus 平台的 Settings → Secrets 中配置所有必需的环境变量
3. 运行 `docker-compose up -d` 启动服务
4. 访问 `http://localhost` 查看应用
