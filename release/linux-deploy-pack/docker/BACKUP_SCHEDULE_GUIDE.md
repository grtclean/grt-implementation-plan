# GRT智能系统 - 数据库备份计划配置指南

**版本**: v1.6.2  
**作者**: Manus AI  
**更新日期**: 2026年2月5日

---

## 概述

本指南介绍如何配置GRT智能系统的自动数据库备份计划，确保数据安全和灾难恢复能力。

---

## 第一部分：备份脚本说明

### 1.1 备份脚本 (backup.sh)

备份脚本位于 `docker/backup.sh`，功能包括：

| 功能 | 说明 |
|------|------|
| 完整备份 | 导出数据库所有表、存储过程、触发器和事件 |
| 自动压缩 | 使用gzip压缩备份文件，节省存储空间 |
| 自动清理 | 删除超过保留期限的旧备份 |
| 状态报告 | 显示备份结果和统计信息 |

### 1.2 恢复脚本 (restore.sh)

恢复脚本位于 `docker/restore.sh`，功能包括：

| 功能 | 说明 |
|------|------|
| 安全恢复 | 恢复前自动创建当前数据库备份 |
| 确认机制 | 恢复操作需要用户确认 |
| 自动解压 | 支持直接恢复压缩的备份文件 |
| 验证检查 | 恢复后验证数据库表数量 |

---

## 第二部分：手动备份

### 2.1 执行手动备份

```bash
# 进入项目目录
cd ~/projects/grt-implementation-plan

# 运行备份脚本
./docker/backup.sh
```

### 2.2 自定义备份参数

```bash
# 指定备份目录
BACKUP_DIR=/data/backups ./docker/backup.sh

# 指定保留天数
RETENTION_DAYS=60 ./docker/backup.sh

# 指定容器名称
CONTAINER_NAME=my-mysql ./docker/backup.sh
```

---

## 第三部分：配置自动备份

### 3.1 使用Cron定时任务

在WSL 2或Linux环境中，使用cron配置定时备份：

```bash
# 编辑crontab
crontab -e

# 添加以下行（每天凌晨2点执行备份）
0 2 * * * cd /home/ubuntu/projects/grt-implementation-plan && ./docker/backup.sh >> /var/log/grt-backup.log 2>&1
```

### 3.2 常用备份计划

| 计划 | Cron表达式 | 说明 |
|------|------------|------|
| 每天凌晨2点 | `0 2 * * *` | 推荐用于生产环境 |
| 每6小时 | `0 */6 * * *` | 高频备份需求 |
| 每周日凌晨3点 | `0 3 * * 0` | 周备份 |
| 每月1日凌晨4点 | `0 4 1 * *` | 月备份 |

### 3.3 多级备份策略

推荐配置多级备份策略：

```bash
# 编辑crontab
crontab -e

# 每日备份（保留7天）
0 2 * * * RETENTION_DAYS=7 BACKUP_DIR=/data/backups/daily cd /home/ubuntu/projects/grt-implementation-plan && ./docker/backup.sh

# 每周备份（保留4周）
0 3 * * 0 RETENTION_DAYS=28 BACKUP_DIR=/data/backups/weekly cd /home/ubuntu/projects/grt-implementation-plan && ./docker/backup.sh

# 每月备份（保留12个月）
0 4 1 * * RETENTION_DAYS=365 BACKUP_DIR=/data/backups/monthly cd /home/ubuntu/projects/grt-implementation-plan && ./docker/backup.sh
```

---

## 第四部分：Windows任务计划程序

### 4.1 创建批处理文件

在Windows中创建 `backup.bat`：

```batch
@echo off
wsl -d Ubuntu -e bash -c "cd /home/ubuntu/projects/grt-implementation-plan && ./docker/backup.sh"
```

### 4.2 配置任务计划程序

1. 打开"任务计划程序"（Task Scheduler）
2. 点击"创建基本任务"
3. 名称：GRT数据库备份
4. 触发器：每天，凌晨2:00
5. 操作：启动程序
6. 程序/脚本：`C:\path\to\backup.bat`
7. 完成创建

---

## 第五部分：恢复数据库

### 5.1 查看可用备份

```bash
# 列出所有备份文件
ls -lht ~/grt-backups/
```

### 5.2 恢复指定备份

```bash
# 进入项目目录
cd ~/projects/grt-implementation-plan

# 恢复最新备份
./docker/restore.sh ~/grt-backups/grt_db_20260205_020000.sql.gz

# 或直接指定文件名（脚本会在备份目录中查找）
./docker/restore.sh grt_db_20260205_020000.sql.gz
```

---

## 第六部分：备份存储建议

### 6.1 本地存储

```bash
# 创建专用备份分区或目录
mkdir -p /data/backups
chmod 700 /data/backups
```

### 6.2 远程存储（可选）

配置备份同步到远程存储：

```bash
# 使用rsync同步到远程服务器
rsync -avz ~/grt-backups/ user@backup-server:/backups/grt/

# 使用rclone同步到云存储
rclone sync ~/grt-backups/ remote:grt-backups/
```

---

## 第七部分：监控和告警

### 7.1 备份日志

```bash
# 查看备份日志
tail -f /var/log/grt-backup.log

# 检查最近的备份状态
grep -E "(SUCCESS|ERROR)" /var/log/grt-backup.log | tail -10
```

### 7.2 邮件告警（可选）

在备份脚本末尾添加邮件通知：

```bash
# 安装邮件工具
sudo apt install mailutils

# 在backup.sh末尾添加
echo "GRT数据库备份完成: $BACKUP_FILE ($COMPRESSED_SIZE)" | mail -s "GRT备份通知" admin@example.com
```

---

## 常见问题

### Q1: 备份文件过大

**解决方案**: 
- 检查是否有大量日志数据，考虑定期清理
- 增加压缩级别：`gzip -9`

### Q2: 备份失败

**解决方案**:
- 检查Docker容器是否运行
- 检查数据库密码是否正确
- 检查磁盘空间是否充足

### Q3: 恢复后数据不完整

**解决方案**:
- 使用恢复前自动创建的备份回滚
- 检查备份文件是否完整

---

*本文档由 Manus AI 自动生成，最后更新于 2026年2月5日*
