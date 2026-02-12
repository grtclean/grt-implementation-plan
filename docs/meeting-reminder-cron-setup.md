# 会议提醒定时任务配置指南

## 概述

会议提醒系统通过定时任务自动检查即将开始的会议，并向相关人员发送提醒通知。

## 工作原理

1. **提醒创建**: 创建会议时，系统自动创建提醒记录（默认提前15分钟）
2. **定时检查**: 定时任务每5分钟检查一次待发送的提醒
3. **发送通知**: 对于到达提醒时间的会议，发送系统通知
4. **记录结果**: 标记提醒为已发送，记录发送时间和结果

## 配置方式

### 方式一：通过Manus调度器（推荐）

在Manus平台中，可以使用内置的调度功能配置定时任务：

```
调度类型: cron
Cron表达式: 0 */5 * * * * (每5分钟执行一次)
任务: 调用 POST /api/trpc/meetingReminder.processReminders
```

### 方式二：通过API手动触发

管理员可以通过API手动触发提醒处理：

```bash
# 处理所有待发送的提醒
curl -X POST https://your-domain/api/trpc/meetingReminder.processReminders \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"

# 查看待发送的提醒
curl https://your-domain/api/trpc/meetingReminder.getReadyToSend \
  -H "Cookie: your-session-cookie"
```

### 方式三：服务器Cron Job

如果部署在自有服务器，可以配置系统cron：

```bash
# 编辑crontab
crontab -e

# 添加以下行（每5分钟执行）
*/5 * * * * curl -X POST https://your-domain/api/trpc/meetingReminder.processReminders -H "Authorization: Bearer YOUR_API_KEY"
```

## 提醒类型

系统支持三种提醒类型：

| 类型 | 说明 |
|------|------|
| system | 系统内通知（默认） |
| email | 邮件通知（需配置邮件服务） |
| both | 同时发送系统通知和邮件 |

## Webhook集成 (v1.3.5)

会议提醒现已集成Webhook通知功能，支持以下平台：

| 平台 | 类型 | 说明 |
|------|------|------|
| 企业微信 | wecom | 支持Markdown格式消息 |
| 钉钉 | dingtalk | 支持Markdown格式消息 |
| 飞书 | feishu | 支持交互式卡片消息 |
| 自定义 | custom | 支持任意Webhook端点 |

### 配置Webhook

1. 在系统设置中添加Webhook配置
2. 选择触发事件类型为 `meeting_reminder`
3. 使用测试功能验证Webhook是否正常工作

### Webhook消息格式

```json
{
  "title": "📅 会议提醒: 会议主题",
  "content": "**会议主题**: xxx\n**开始时间**: 2026-01-16 14:00\n**会议地点**: 会议室A",
  "timestamp": "2026-01-16T06:00:00.000Z",
  "source": "GRT-System"
}
```

### 通过API配置Webhook

```typescript
// 创建Webhook配置
await trpc.webhook.create.mutate({
  name: "项目组企业微信群",
  type: "wecom",
  webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
  enabled: true,
  triggerEvents: ["meeting_reminder", "cost_alert"],
});

// 测试Webhook
await trpc.webhook.test.mutate({
  id: 1,
  message: "这是一条测试消息",
});
```

## 提醒时间配置

创建会议时可以指定提醒时间：

```typescript
// 创建会议时设置提醒
await trpc.agenda.createMeeting.mutate({
  title: "项目周会",
  startTime: new Date("2026-01-20T09:00:00"),
  reminderMinutes: 30, // 提前30分钟提醒
  // ...其他字段
});
```

常用提醒时间：
- 15分钟（默认）
- 30分钟
- 60分钟（1小时）
- 1440分钟（1天）

## 监控与日志

### 查看提醒处理日志

```bash
# 查看服务器日志中的提醒处理记录
grep "Meeting Reminder Job" /var/log/app.log
```

### 数据库查询

```sql
-- 查看待发送的提醒
SELECT mr.*, ms.title, ms.start_time 
FROM meeting_reminders mr
JOIN meeting_schedules ms ON mr.meeting_id = ms.id
WHERE mr.is_sent = 0;

-- 查看已发送的提醒
SELECT mr.*, ms.title, mr.sent_at, mr.send_result
FROM meeting_reminders mr
JOIN meeting_schedules ms ON mr.meeting_id = ms.id
WHERE mr.is_sent = 1
ORDER BY mr.sent_at DESC
LIMIT 20;
```

## 故障排除

### 提醒未发送

1. 检查定时任务是否正常运行
2. 确认会议时间设置正确
3. 查看服务器日志中的错误信息

### 重复发送

系统会自动标记已发送的提醒，正常情况下不会重复发送。如果出现重复：
1. 检查数据库中的 `is_sent` 字段
2. 确认没有多个定时任务实例同时运行

## AI自动更新说明

当年度规划变更时，AI可以自动：
1. 识别受影响的会议
2. 更新会议时间
3. 重新创建提醒记录
4. 通知相关人员变更信息

详见 [年度规划AI更新指南](./annual-planning-ai-update.md)
