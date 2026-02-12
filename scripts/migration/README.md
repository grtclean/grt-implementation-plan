# GRT智能系统 - 数据迁移工具

## 概述

本工具用于将GRT智能系统从Manus云端服务器迁移到Windows 11本地服务器，支持：

- **数据导出**：从云端MySQL数据库导出所有业务数据
- **数据导入**：将导出的数据导入到本地MySQL数据库
- **增量同步**：支持增量数据同步，只同步变更的数据
- **数据回滚**：支持回滚到之前的备份状态

## 前置要求

- Node.js 18.0.0 或更高版本
- MySQL 8.0 或更高版本
- 网络连接（用于访问云端数据库）

## 安装依赖

```bash
cd scripts/migration
npm install mysql2
```

## 使用方法

### 方式一：交互式界面（推荐）

```powershell
# Windows PowerShell
.\migrate-data.ps1
```

运行后会显示交互式菜单，按提示操作即可。

### 方式二：命令行模式

#### 导出数据

```bash
node migrate-data.mjs export --source "mysql://user:password@cloud-host:3306/grt_db"
```

#### 导入数据

```bash
# 追加模式（保留现有数据）
node migrate-data.mjs import \
  --target "mysql://root:password@localhost:3306/grt_local" \
  --file ./exports/grt_export_2026-01-25.json

# 覆盖模式（清空后导入）
node migrate-data.mjs import \
  --target "mysql://root:password@localhost:3306/grt_local" \
  --file ./exports/grt_export_2026-01-25.json \
  --overwrite
```

#### 增量同步

```bash
node migrate-data.mjs sync \
  --source "mysql://user:password@cloud-host:3306/grt_db" \
  --target "mysql://root:password@localhost:3306/grt_local"
```

#### 数据回滚

```bash
node migrate-data.mjs rollback \
  --target "mysql://root:password@localhost:3306/grt_local" \
  --file ./backups/backup_2026-01-25.json
```

## 命令参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--source` | 源数据库URL | `mysql://user:pass@host:3306/db` |
| `--target` | 目标数据库URL | `mysql://root:pass@localhost:3306/db` |
| `--file` | 导出/备份文件路径 | `./exports/grt_export_xxx.json` |
| `--overwrite` | 覆盖模式（清空目标表后导入） | - |
| `--skip-backup` | 跳过导入前备份 | - |

## 数据库URL格式

```
mysql://用户名:密码@主机:端口/数据库名
```

示例：
- 云端：`mysql://grt_user:MyP@ssw0rd@db.manus.cloud:3306/grt_production`
- 本地：`mysql://root:localpass@localhost:3306/grt_system`

## 迁移的数据表

| 表名 | 说明 |
|------|------|
| `user` | 用户信息 |
| `opportunity` | 商机数据 |
| `opportunity_follow_up` | 商机跟进记录 |
| `opportunity_import_history` | 导入历史 |
| `report_schedule` | 报表调度配置 |
| `report_send_history` | 报表发送历史 |
| `report_template` | 报表模板 |
| `alert_rule` | 告警规则 |
| `alert_notification` | 告警通知记录 |
| `task_execution_log` | 任务执行日志 |
| `field_mapping_config` | 字段映射配置 |
| `template_usage_stats` | 模板使用统计 |

## 目录结构

```
scripts/migration/
├── migrate-data.mjs      # 主迁移脚本（Node.js）
├── migrate-data.ps1      # PowerShell交互式包装器
├── README.md             # 本文档
├── exports/              # 导出文件目录
│   └── grt_export_*.json
├── backups/              # 备份文件目录
│   └── backup_*.json
└── logs/                 # 日志文件目录
    ├── export_*.json
    ├── import_*.json
    ├── sync_*.json
    └── last_sync.json
```

## 迁移流程建议

### 首次完整迁移

1. **准备工作**
   - 确保本地MySQL已安装并运行
   - 创建目标数据库
   - 确保网络可以访问云端数据库

2. **导出云端数据**
   ```powershell
   .\migrate-data.ps1
   # 选择 [1] 导出数据
   # 输入云端数据库连接信息
   ```

3. **导入到本地**
   ```powershell
   .\migrate-data.ps1
   # 选择 [2] 导入数据
   # 选择导出文件
   # 输入本地数据库连接信息
   ```

4. **验证数据**
   - 检查导入日志
   - 登录系统验证数据完整性

### 增量同步（过渡期）

在完全切换到本地服务器之前，可以定期执行增量同步：

```powershell
.\migrate-data.ps1
# 选择 [3] 增量同步
```

建议设置Windows计划任务自动执行：

```powershell
# 创建计划任务（每天凌晨2点同步）
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\GRT-System\scripts\migration\migrate-data.ps1 sync --source 'mysql://...' --target 'mysql://...'"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "GRT-DataSync" -Action $action -Trigger $trigger
```

## 故障排除

### 连接失败

1. 检查数据库URL格式是否正确
2. 确认网络连接正常
3. 验证用户名密码是否正确
4. 检查防火墙设置

### 导入失败

1. 检查目标数据库是否存在
2. 确认表结构已通过 `pnpm db:push` 创建
3. 查看 `logs/` 目录下的详细日志

### 数据不一致

1. 使用回滚功能恢复备份
2. 重新执行完整导出和导入
3. 检查是否有外键约束问题

## 安全建议

1. **不要在脚本中硬编码密码**，使用环境变量或交互式输入
2. **定期备份**，导入前工具会自动创建备份
3. **限制数据库访问权限**，使用专用迁移账户
4. **迁移完成后删除敏感文件**，如包含密码的日志

## 技术支持

如遇到问题，请：

1. 查看 `logs/` 目录下的详细日志
2. 检查本文档的故障排除章节
3. 联系技术支持团队
