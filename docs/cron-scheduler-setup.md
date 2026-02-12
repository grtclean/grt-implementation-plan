# Cron定时任务配置指南

本文档说明如何配置Cron定时任务以自动执行述职提醒、会议提醒等功能。

## 1. 定时任务脚本

系统提供了以下定时任务脚本：

### 1.1 述职提醒任务

```bash
# 每天上午9点检查并发送述职提醒
0 9 * * * curl -X POST https://your-domain.com/api/trpc/hrm.processScheduledTasks
```

### 1.2 会议提醒任务

```bash
# 每15分钟检查即将开始的会议
*/15 * * * * curl -X POST https://your-domain.com/api/trpc/agenda.processReminders
```

### 1.3 调度器状态检查

```bash
# 每小时检查调度器状态
0 * * * * curl https://your-domain.com/api/trpc/hrm.getSchedulerStatus
```

## 2. 配置方法

### 方法一：使用系统Crontab

```bash
# 编辑crontab
crontab -e

# 添加以下行
0 9 * * * curl -X POST https://your-domain.com/api/trpc/hrm.processScheduledTasks
*/15 * * * * curl -X POST https://your-domain.com/api/trpc/agenda.processReminders
```

### 方法二：使用云服务定时任务

#### AWS CloudWatch Events
```json
{
  "schedule": "cron(0 9 * * ? *)",
  "target": {
    "arn": "arn:aws:lambda:region:account:function:process-reminders",
    "input": "{\"action\": \"processScheduledTasks\"}"
  }
}
```

#### 阿里云函数计算
```yaml
triggers:
  - name: daily-reminder
    type: timer
    config:
      cronExpression: "0 0 9 * * *"
      enable: true
```

## 3. 任务类型说明

| 任务类型 | 执行频率 | 说明 |
|---------|---------|------|
| `performance_review_reminder` | 每日 | 检查并发送述职提醒 |
| `meeting_reminder` | 每15分钟 | 检查即将开始的会议 |
| `training_reminder` | 每日 | 检查培训提醒 |
| `custom` | 自定义 | 用户自定义任务 |

## 4. API端点

### 启动调度器
```
POST /api/trpc/hrm.startScheduler
```

### 停止调度器
```
POST /api/trpc/hrm.stopScheduler
```

### 获取调度器状态
```
GET /api/trpc/hrm.getSchedulerStatus
```

### 手动执行任务
```
POST /api/trpc/hrm.processScheduledTasks
```

## 5. 日志和监控

### 查看任务执行日志

任务执行记录保存在数据库 `scheduled_tasks` 表中：

```sql
SELECT * FROM scheduled_tasks 
WHERE status = 'completed' 
ORDER BY lastRunAt DESC 
LIMIT 20;
```

### 监控指标

- `task_execution_count`: 任务执行次数
- `task_success_rate`: 任务成功率
- `task_average_duration`: 平均执行时间

## 6. 故障排查

### 任务未执行

1. 检查Cron表达式是否正确
2. 检查API端点是否可访问
3. 检查任务状态是否为 `active`

### 提醒未发送

1. 检查通知服务配置
2. 检查收件人邮箱是否有效
3. 查看任务执行日志

## 7. 最佳实践

1. **错峰执行**：避免在整点执行大量任务
2. **重试机制**：配置失败重试策略
3. **超时设置**：设置合理的任务超时时间
4. **日志保留**：定期清理历史日志
5. **监控告警**：设置任务失败告警
