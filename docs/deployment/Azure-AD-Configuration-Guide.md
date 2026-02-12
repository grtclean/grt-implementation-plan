# Azure AD 应用配置指南

## 概述

本指南详细说明如何在Azure Portal中注册应用程序，获取Microsoft Graph API所需的凭据，以启用Outlook日历和Teams消息同步功能。

## 前提条件

- Microsoft 365 企业版或教育版订阅
- Azure AD 全局管理员或应用程序管理员权限
- 访问 [Azure Portal](https://portal.azure.com)

## 步骤一：注册Azure AD应用程序

### 1.1 登录Azure Portal
1. 访问 https://portal.azure.com
2. 使用组织管理员账户登录

### 1.2 创建应用注册
1. 在搜索栏输入"应用注册"或"App registrations"
2. 点击"+ 新注册"按钮
3. 填写应用信息：
   - **名称**: `GRT-Intelligent-System`
   - **支持的账户类型**: 选择"仅此组织目录中的账户"
   - **重定向URI**: 
     - 类型: Web
     - URI: `https://your-domain.com/api/oauth/microsoft/callback`
4. 点击"注册"

### 1.3 记录应用ID
注册完成后，记录以下信息：
- **应用程序(客户端) ID**: 这是 `MICROSOFT_CLIENT_ID`
- **目录(租户) ID**: 这是 `MICROSOFT_TENANT_ID`

## 步骤二：配置客户端密钥

### 2.1 创建密钥
1. 在应用注册页面，点击左侧"证书和密码"
2. 点击"+ 新客户端密码"
3. 填写描述（如：`GRT-System-Secret`）
4. 选择过期时间（建议24个月）
5. 点击"添加"

### 2.2 保存密钥
**重要**: 密钥值只显示一次，请立即复制保存！
- **值**: 这是 `MICROSOFT_CLIENT_SECRET`

## 步骤三：配置API权限

### 3.1 添加Microsoft Graph权限
1. 点击左侧"API权限"
2. 点击"+ 添加权限"
3. 选择"Microsoft Graph"
4. 选择"委托的权限"

### 3.2 所需权限列表

#### 日历权限
- `Calendars.Read` - 读取用户日历
- `Calendars.ReadWrite` - 读写用户日历

#### Teams权限
- `Chat.Read` - 读取聊天消息
- `ChannelMessage.Read.All` - 读取频道消息

#### 用户权限
- `User.Read` - 读取用户基本信息
- `User.ReadBasic.All` - 读取组织用户基本信息

#### 邮件权限（可选）
- `Mail.Read` - 读取用户邮件

### 3.3 授予管理员同意
1. 添加完所有权限后
2. 点击"为 [组织名称] 授予管理员同意"
3. 确认授权

## 步骤四：在GRT系统中配置凭据

### 4.1 通过系统界面配置
1. 登录GRT智能系统
2. 进入"系统设置" > "Microsoft Graph API配置"
3. 填写以下信息：
   - 租户ID: `MICROSOFT_TENANT_ID`
   - 客户端ID: `MICROSOFT_CLIENT_ID`
   - 客户端密钥: `MICROSOFT_CLIENT_SECRET`
4. 点击"测试连接"验证配置
5. 点击"保存配置"

### 4.2 通过环境变量配置（本地部署）
在 `.env` 文件中添加：
```env
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

## 步骤五：验证配置

### 5.1 测试日历同步
1. 进入系统首页
2. 查看"今日日程"组件
3. 确认显示Outlook日历事件

### 5.2 测试Teams消息
1. 查看"Teams消息"组件
2. 确认显示最新Teams消息

## 常见问题

### Q: 测试连接失败，提示"Invalid client secret"
A: 客户端密钥可能已过期或输入错误。请在Azure Portal重新生成密钥。

### Q: 权限不足，无法读取日历
A: 确保已添加 `Calendars.Read` 权限并授予管理员同意。

### Q: Teams消息无法同步
A: Teams API需要额外的许可证。确保您的Microsoft 365订阅包含Teams功能。

### Q: 如何更新过期的密钥？
A: 
1. 在Azure Portal创建新密钥
2. 在GRT系统中更新密钥配置
3. 删除旧密钥

## 安全建议

1. **定期轮换密钥**: 建议每6-12个月更换一次客户端密钥
2. **最小权限原则**: 只申请必要的API权限
3. **审计日志**: 定期检查Azure AD登录日志
4. **条件访问**: 配置条件访问策略限制应用访问

## 相关链接

- [Azure AD 应用注册文档](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph API 权限参考](https://docs.microsoft.com/graph/permissions-reference)
- [Microsoft Graph API 文档](https://docs.microsoft.com/graph/overview)
