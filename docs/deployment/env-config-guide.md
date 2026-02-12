# GRT智能系统 环境变量配置指南

> **版本**: v2.5.21  
> **适用于**: Windows 11 本地服务器部署

---

## 配置文件创建

在项目根目录创建 `.env` 文件，内容如下：

```env
# ============================================================
# GRT智能系统 环境变量配置
# ============================================================

# ------------------------------------------------------------
# 数据库配置 (必填)
# ------------------------------------------------------------
DATABASE_URL=mysql://grt_user:your_password_here@localhost:3306/grt_system

# ------------------------------------------------------------
# 安全配置 (必填)
# ------------------------------------------------------------
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# ------------------------------------------------------------
# 应用配置
# ------------------------------------------------------------
NODE_ENV=production
VITE_APP_TITLE=GRT智能系统
VITE_APP_ID=grt-local
VITE_APP_LOGO=

# ------------------------------------------------------------
# OAuth认证配置 (本地开发可留空)
# ------------------------------------------------------------
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
OWNER_NAME=

# ------------------------------------------------------------
# AI服务配置 (可选)
# ------------------------------------------------------------
GEMINI_API_KEY=

# ------------------------------------------------------------
# 简道云集成 (可选)
# ------------------------------------------------------------
JIANDAOYUN_API_KEY=
JIANDAOYUN_CORP_ID=

# ------------------------------------------------------------
# Microsoft集成 (可选)
# ------------------------------------------------------------
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

---

## 配置项详解

### 必填配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | MySQL连接字符串 | `mysql://grt_user:password@localhost:3306/grt_system` |
| `JWT_SECRET` | JWT签名密钥，至少32字符 | 使用 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成 |

### 应用配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `VITE_APP_TITLE` | 应用标题 | `GRT智能系统` |
| `VITE_APP_ID` | 应用ID | `grt-local` |

### AI服务配置

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `GEMINI_API_KEY` | Google Gemini API密钥 | https://makersuite.google.com/app/apikey |

---

## 生成JWT密钥

在PowerShell中执行：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将输出的字符串复制到 `JWT_SECRET`。

---

## 验证配置

启动服务后检查日志，确认没有配置相关的错误：

```powershell
pnpm dev
# 或
pm2 logs grt-system
```

---

## 安全注意事项

1. **不要将 `.env` 文件提交到版本控制**
2. **定期更换 JWT_SECRET**
3. **使用强密码作为数据库密码**
4. **生产环境使用 HTTPS**
