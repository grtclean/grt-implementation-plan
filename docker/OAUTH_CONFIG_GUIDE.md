# GRT智能系统 - OAuth认证配置指南

**版本**: v1.6.2  
**作者**: Manus AI  
**更新日期**: 2026年2月5日

---

## 概述

GRT智能系统使用Manus OAuth进行用户认证。本指南详细介绍如何配置OAuth认证，使本地部署的系统能够正常使用用户登录功能。

---

## 第一部分：OAuth配置概览

### 1.1 认证流程

GRT系统的OAuth认证流程如下：

```
用户访问系统 → 点击登录 → 跳转Manus登录页 → 用户授权 → 回调到系统 → 创建会话
```

### 1.2 必需的环境变量

| 变量名 | 用途 | 获取方式 |
|--------|------|----------|
| `VITE_APP_ID` | 应用唯一标识 | Manus平台自动生成 |
| `OAUTH_SERVER_URL` | OAuth服务器地址 | 固定值 |
| `VITE_OAUTH_PORTAL_URL` | 登录门户地址 | 固定值 |
| `JWT_SECRET` | 会话签名密钥 | 自行生成 |
| `OWNER_OPEN_ID` | 应用所有者ID | Manus平台获取 |
| `OWNER_NAME` | 应用所有者名称 | 自定义 |

---

## 第二部分：获取OAuth凭证

### 2.1 从Manus平台获取APP_ID

由于GRT系统是在Manus平台上创建的，`VITE_APP_ID` 已经自动配置。您可以通过以下方式查看：

**方法1：查看Management UI**

1. 在Manus平台打开项目
2. 点击右侧Management UI
3. 进入 Settings → Secrets
4. 查找 `VITE_APP_ID` 的值

**方法2：查看项目配置**

在项目的环境变量中，`VITE_APP_ID` 已经预设。

### 2.2 获取OWNER_OPEN_ID

`OWNER_OPEN_ID` 是您在Manus平台的用户标识：

1. 登录Manus平台
2. 进入个人设置页面
3. 查找您的Open ID或User ID

### 2.3 生成JWT_SECRET

JWT_SECRET用于签名用户会话，必须是一个强随机字符串：

```bash
# 方法1：使用openssl生成
openssl rand -base64 32

# 方法2：使用/dev/urandom
head -c 32 /dev/urandom | base64

# 方法3：使用node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **安全提示**: JWT_SECRET 至少应包含32个字符，且不应与其他系统共享。

---

## 第三部分：配置本地部署

### 3.1 编辑.env文件

在项目根目录编辑 `.env` 文件：

```bash
nano .env
```

添加或修改以下配置：

```env
# ============================================
# OAuth认证配置
# ============================================

# Manus OAuth应用ID（从Manus平台获取）
VITE_APP_ID=your_manus_app_id_here

# OAuth服务器地址（固定值）
OAUTH_SERVER_URL=https://api.manus.im

# Manus登录门户地址（固定值）
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# JWT会话签名密钥（自行生成的强随机字符串）
JWT_SECRET=your_generated_jwt_secret_at_least_32_chars

# 应用所有者信息
OWNER_OPEN_ID=your_manus_open_id
OWNER_NAME=Your Name
```

### 3.2 重启服务

配置完成后，重启服务使配置生效：

```bash
docker compose restart grt-app
```

### 3.3 验证配置

访问系统并测试登录功能：

1. 打开浏览器访问 `http://localhost:3000`
2. 点击"登录"按钮
3. 应跳转到Manus登录页面
4. 使用Manus账户登录
5. 授权后应自动跳转回系统并显示已登录状态

---

## 第四部分：本地开发模式（可选）

### 4.1 禁用OAuth（仅开发环境）

如果您需要在没有Manus OAuth的环境下进行本地开发，可以配置模拟认证：

```env
# 开发模式：禁用OAuth，使用模拟用户
DEV_AUTH_BYPASS=true
DEV_USER_ID=dev-user-001
DEV_USER_NAME=Developer
DEV_USER_ROLE=admin
```

> **警告**: 此配置仅适用于本地开发环境，切勿在生产环境中使用。

### 4.2 自定义OAuth提供商（高级）

如果您需要使用其他OAuth提供商（如Google、GitHub），需要修改以下文件：

- `server/_core/oauth.ts` - OAuth处理逻辑
- `client/src/const.ts` - 登录URL配置

---

## 第五部分：故障排除

### 问题1：登录后无法跳转回系统

**可能原因**: 回调URL配置不正确

**解决方案**: 
- 确保 `OAUTH_SERVER_URL` 配置正确
- 检查防火墙是否阻止了回调请求

### 问题2：会话无法保持

**可能原因**: JWT_SECRET配置问题

**解决方案**:
- 确保 `JWT_SECRET` 已正确配置
- 检查是否在重启后更改了 `JWT_SECRET`（会导致旧会话失效）

### 问题3：显示"未授权"错误

**可能原因**: `VITE_APP_ID` 配置错误

**解决方案**:
- 确认 `VITE_APP_ID` 与Manus平台上的应用ID一致
- 检查应用是否已在Manus平台激活

---

## 环境变量完整示例

```env
# ============================================
# 数据库配置
# ============================================
DATABASE_URL=mysql://grt:your_password@mysql:3306/grt_db
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_PASSWORD=your_password

# ============================================
# OAuth认证配置
# ============================================
VITE_APP_ID=abc123def456
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
JWT_SECRET=K8sD9fG2hJ4kL6mN8pQ0rS2tU4vW6xY8zA0bC2dE4fG6
OWNER_OPEN_ID=user_open_id_12345
OWNER_NAME=张三

# ============================================
# 应用配置
# ============================================
VITE_APP_TITLE=GRT智能系统
NODE_ENV=production
```

---

## 技术支持

如遇到OAuth配置问题，请通过以下渠道获取帮助：

- 提交GitHub Issue
- 联系系统管理员
- 查阅Manus平台OAuth文档

---

*本文档由 Manus AI 自动生成，最后更新于 2026年2月5日*
