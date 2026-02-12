# Microsoft Graph API 配置指南

本文档说明如何配置Microsoft Graph API以启用真实的Teams视频会议功能。

## 1. 创建Azure AD应用

1. 登录 [Azure Portal](https://portal.azure.com)
2. 进入 **Azure Active Directory** > **应用注册** > **新注册**
3. 填写应用信息：
   - 名称：`GRT-HRM-Teams-Integration`
   - 支持的账户类型：选择适合您组织的选项
   - 重定向URI：`https://your-domain.com/api/oauth/microsoft/callback`

## 2. 配置API权限

在应用注册页面，进入 **API权限** > **添加权限**：

| 权限名称 | 类型 | 说明 |
|---------|------|------|
| `OnlineMeetings.ReadWrite` | 委托 | 创建和管理在线会议 |
| `User.Read` | 委托 | 读取用户信息 |
| `Calendars.ReadWrite` | 委托 | 管理日历事件 |

点击 **授予管理员同意** 完成权限配置。

## 3. 创建客户端密钥

1. 进入 **证书和密钥** > **新客户端密钥**
2. 设置描述和过期时间
3. 复制生成的密钥值（仅显示一次）

## 4. 配置环境变量

在系统设置中添加以下环境变量：

```bash
MICROSOFT_CLIENT_ID=<应用程序(客户端)ID>
MICROSOFT_CLIENT_SECRET=<客户端密钥值>
MICROSOFT_TENANT_ID=<目录(租户)ID>
```

### 获取这些值

- **Client ID**: 应用注册 > 概述 > 应用程序(客户端)ID
- **Tenant ID**: 应用注册 > 概述 > 目录(租户)ID
- **Client Secret**: 证书和密钥 > 客户端密钥值

## 5. 验证配置

配置完成后，系统会自动检测并启用真实的Teams会议功能：

1. 访问 HRM智能化管理 > Teams面试
2. 创建一个测试会议
3. 如果配置正确，会议链接将是真实的Teams会议URL

## 6. 模拟模式

如果未配置Microsoft Graph API，系统会自动使用模拟模式：

- 会议仍可创建和管理
- 会议链接为模拟链接
- 所有其他功能正常工作

## 常见问题

### Q: 为什么会议链接显示为模拟链接？

A: 检查环境变量是否正确配置，确保：
- 三个环境变量都已设置
- 值没有多余的空格或引号
- API权限已授予管理员同意

### Q: 如何测试API连接？

A: 可以调用以下API端点测试：
```
GET /api/trpc/hrm.checkMicrosoftGraphConfig
```

### Q: 支持哪些会议功能？

A: 当前支持：
- 创建在线会议
- 获取会议详情
- 更新会议信息
- 删除/取消会议

## 安全建议

1. 定期轮换客户端密钥
2. 使用最小权限原则
3. 监控API调用日志
4. 在生产环境使用证书认证
