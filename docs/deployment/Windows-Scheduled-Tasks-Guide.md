# Windows 定时任务配置指南

## 概述

本指南说明如何在Windows 11服务器上配置定时任务，实现会议提醒、成本预警、数据同步等自动化功能。

## 前提条件

- Windows 11 专业版或企业版
- 管理员权限
- Node.js 已安装
- GRT系统已部署在 `C:\Projects\grt-intelligent-system`

## 定时任务列表

| 任务名称 | 执行频率 | 功能描述 |
|---------|---------|---------|
| GRT-Meeting-Reminder | 每15分钟 | 检查即将开始的会议并发送提醒 |
| GRT-Cost-Alert | 每小时 | 检查项目成本超支并发送预警 |
| GRT-Calendar-Sync | 每30分钟 | 同步Outlook日历事件 |
| GRT-Teams-Sync | 每10分钟 | 同步Teams消息 |
| GRT-Daily-Report | 每天08:00 | 生成每日工作报告 |
| GRT-Weekly-Summary | 每周一09:00 | 生成周报摘要 |

## 方法一：使用PowerShell脚本自动配置

### 1.1 创建任务脚本目录
```powershell
New-Item -ItemType Directory -Path "C:\Projects\grt-intelligent-system\scripts\tasks" -Force
```

### 1.2 创建会议提醒脚本
创建文件 `C:\Projects\grt-intelligent-system\scripts\tasks\meeting-reminder.js`:
```javascript
// meeting-reminder.js
const https = require('https');

const API_BASE = process.env.GRT_API_URL || 'http://localhost:3000';

async function checkUpcomingMeetings() {
  console.log(`[${new Date().toISOString()}] 检查即将开始的会议...`);
  
  try {
    const response = await fetch(`${API_BASE}/api/trpc/microsoftGraph.getCalendarEvents`);
    const data = await response.json();
    
    const now = new Date();
    const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
    
    const upcomingMeetings = data.result?.data?.events?.filter(event => {
      const startTime = new Date(event.start);
      return startTime > now && startTime <= in15Min;
    }) || [];
    
    if (upcomingMeetings.length > 0) {
      console.log(`发现 ${upcomingMeetings.length} 个即将开始的会议`);
      // 发送通知逻辑
      for (const meeting of upcomingMeetings) {
        console.log(`- ${meeting.subject} @ ${meeting.start}`);
      }
    } else {
      console.log('没有即将开始的会议');
    }
  } catch (error) {
    console.error('检查会议失败:', error.message);
  }
}

checkUpcomingMeetings();
```

### 1.3 创建成本预警脚本
创建文件 `C:\Projects\grt-intelligent-system\scripts\tasks\cost-alert.js`:
```javascript
// cost-alert.js
const API_BASE = process.env.GRT_API_URL || 'http://localhost:3000';

async function checkCostAlerts() {
  console.log(`[${new Date().toISOString()}] 检查项目成本预警...`);
  
  try {
    const response = await fetch(`${API_BASE}/api/trpc/project.getCostOverview`);
    const data = await response.json();
    
    const overBudgetProjects = data.result?.data?.projects?.filter(p => 
      p.actualCost > p.budgetCost * 0.9
    ) || [];
    
    if (overBudgetProjects.length > 0) {
      console.log(`发现 ${overBudgetProjects.length} 个项目接近或超出预算`);
      for (const project of overBudgetProjects) {
        const percentage = ((project.actualCost / project.budgetCost) * 100).toFixed(1);
        console.log(`- ${project.name}: ${percentage}% (${project.actualCost}/${project.budgetCost})`);
      }
      // 发送预警通知
    } else {
      console.log('所有项目成本正常');
    }
  } catch (error) {
    console.error('检查成本失败:', error.message);
  }
}

checkCostAlerts();
```

### 1.4 批量注册定时任务
创建文件 `C:\Projects\grt-intelligent-system\scripts\register-tasks.ps1`:
```powershell
# register-tasks.ps1
# 以管理员身份运行

$ProjectPath = "C:\Projects\grt-intelligent-system"
$NodePath = "C:\Program Files\nodejs\node.exe"

# 会议提醒 - 每15分钟
$Action1 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\meeting-reminder.js" -WorkingDirectory $ProjectPath
$Trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "GRT-Meeting-Reminder" -Action $Action1 -Trigger $Trigger1 -Description "GRT会议提醒" -RunLevel Highest

# 成本预警 - 每小时
$Action2 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\cost-alert.js" -WorkingDirectory $ProjectPath
$Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "GRT-Cost-Alert" -Action $Action2 -Trigger $Trigger2 -Description "GRT成本预警" -RunLevel Highest

# 日历同步 - 每30分钟
$Action3 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\calendar-sync.js" -WorkingDirectory $ProjectPath
$Trigger3 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "GRT-Calendar-Sync" -Action $Action3 -Trigger $Trigger3 -Description "GRT日历同步" -RunLevel Highest

# Teams同步 - 每10分钟
$Action4 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\teams-sync.js" -WorkingDirectory $ProjectPath
$Trigger4 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName "GRT-Teams-Sync" -Action $Action4 -Trigger $Trigger4 -Description "GRT Teams同步" -RunLevel Highest

# 每日报告 - 每天08:00
$Action5 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\daily-report.js" -WorkingDirectory $ProjectPath
$Trigger5 = New-ScheduledTaskTrigger -Daily -At "08:00"
Register-ScheduledTask -TaskName "GRT-Daily-Report" -Action $Action5 -Trigger $Trigger5 -Description "GRT每日报告" -RunLevel Highest

# 周报摘要 - 每周一09:00
$Action6 = New-ScheduledTaskAction -Execute $NodePath -Argument "$ProjectPath\scripts\tasks\weekly-summary.js" -WorkingDirectory $ProjectPath
$Trigger6 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "09:00"
Register-ScheduledTask -TaskName "GRT-Weekly-Summary" -Action $Action6 -Trigger $Trigger6 -Description "GRT周报摘要" -RunLevel Highest

Write-Host "所有定时任务已注册完成！" -ForegroundColor Green
Get-ScheduledTask -TaskName "GRT-*" | Format-Table TaskName, State, LastRunTime
```

## 方法二：使用任务计划程序GUI配置

### 2.1 打开任务计划程序
1. 按 `Win + R` 打开运行对话框
2. 输入 `taskschd.msc` 并回车

### 2.2 创建新任务
1. 在右侧操作面板点击"创建任务"
2. **常规**选项卡：
   - 名称: `GRT-Meeting-Reminder`
   - 描述: `GRT会议提醒服务`
   - 勾选"使用最高权限运行"
3. **触发器**选项卡：
   - 点击"新建"
   - 选择"按计划"
   - 设置重复间隔: 15分钟
4. **操作**选项卡：
   - 点击"新建"
   - 操作: 启动程序
   - 程序: `C:\Program Files\nodejs\node.exe`
   - 参数: `C:\Projects\grt-intelligent-system\scripts\tasks\meeting-reminder.js`
   - 起始于: `C:\Projects\grt-intelligent-system`
5. 点击"确定"保存

## 方法三：使用PM2进程管理（推荐用于生产环境）

### 3.1 安装PM2
```powershell
npm install -g pm2
pm2 install pm2-windows-startup
```

### 3.2 创建PM2配置文件
创建 `C:\Projects\grt-intelligent-system\ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'grt-server',
      script: 'dist/index.js',
      cwd: 'C:/Projects/grt-intelligent-system',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'grt-meeting-reminder',
      script: 'scripts/tasks/meeting-reminder.js',
      cwd: 'C:/Projects/grt-intelligent-system',
      cron_restart: '*/15 * * * *',
      autorestart: false
    },
    {
      name: 'grt-cost-alert',
      script: 'scripts/tasks/cost-alert.js',
      cwd: 'C:/Projects/grt-intelligent-system',
      cron_restart: '0 * * * *',
      autorestart: false
    }
  ]
};
```

### 3.3 启动PM2
```powershell
cd C:\Projects\grt-intelligent-system
pm2 start ecosystem.config.js
pm2 save
```

## 日志管理

### 查看任务执行日志
```powershell
# 查看Windows事件日志
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" -MaxEvents 50 |
  Where-Object { $_.Message -like "*GRT*" } |
  Format-Table TimeCreated, Message -AutoSize

# 查看PM2日志
pm2 logs grt-meeting-reminder --lines 100
```

### 配置日志轮转
在PM2配置中添加:
```javascript
{
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  error_file: 'logs/error.log',
  out_file: 'logs/output.log',
  max_size: '10M',
  max_restarts: 10
}
```

## 故障排除

### 任务未执行
1. 检查任务状态: `Get-ScheduledTask -TaskName "GRT-*"`
2. 手动运行测试: `Start-ScheduledTask -TaskName "GRT-Meeting-Reminder"`
3. 查看历史记录: 任务计划程序 > 任务 > 历史记录

### Node.js路径错误
确保Node.js路径正确:
```powershell
where.exe node
# 应输出: C:\Program Files\nodejs\node.exe
```

### 权限问题
以管理员身份运行PowerShell，或在任务属性中勾选"使用最高权限运行"。

## 相关文档

- [Windows任务计划程序文档](https://docs.microsoft.com/windows/win32/taskschd/task-scheduler-start-page)
- [PM2文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
