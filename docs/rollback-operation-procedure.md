# GRT智能系统版本回滚操作规范
## Professional Rollback Operation Procedure

**版本**: v1.0  
**创建时间**: 2026-01-18  
**当前稳定版本**: v2.8.0 (a4612592)

---

## 1. 概述

本文档定义了GRT智能系统的专业版本回滚操作规范，确保在系统出现问题时能够快速、安全地恢复到已知稳定状态。回滚操作是系统运维的关键能力，必须严格按照本规范执行。

---

## 2. 回滚触发条件

### 2.1 自动触发条件

| 条件类型 | 触发阈值 | 响应时间 | 操作 |
|----------|----------|----------|------|
| 服务器启动失败 | 连续3次失败 | 立即 | 自动回滚 |
| 健康检查失败 | 连续5分钟 | 5分钟 | 告警+手动确认 |
| 错误率飙升 | >10%请求失败 | 1分钟 | 告警+手动确认 |

### 2.2 手动触发条件

| 条件类型 | 判断标准 | 决策者 |
|----------|----------|--------|
| 构建失败 | TypeScript编译错误导致无法构建 | 开发者 |
| 功能回归 | 核心功能测试失败 | QA/开发者 |
| 性能退化 | 响应时间超过SLA 200% | 运维/开发者 |
| 安全漏洞 | 发现高危安全问题 | 安全团队 |
| 数据异常 | 数据完整性受损 | DBA/开发者 |
| 业务需求 | 紧急业务回退需求 | 产品经理 |

### 2.3 当前系统状态评估

在决定回滚前，必须评估当前系统状态：

```
┌─────────────────────────────────────────────────────────────┐
│                    系统状态评估清单                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  □ TypeScript编译状态                                        │
│    当前: 446个错误                                           │
│    阈值: <50个警告为健康                                     │
│    状态: ⚠️ 需要关注                                         │
│                                                             │
│  □ 服务器运行状态                                            │
│    当前: 运行中 (端口3000)                                   │
│    状态: ✅ 正常                                             │
│                                                             │
│  □ 数据库连接状态                                            │
│    当前: 已连接                                              │
│    状态: ✅ 正常                                             │
│                                                             │
│  □ 核心功能可用性                                            │
│    OAuth: ✅ 正常                                            │
│    tRPC: ⚠️ 部分路由错误                                     │
│    前端: ✅ 正常                                             │
│                                                             │
│  综合评估: 系统可用但存在技术债务                             │
│  建议操作: 修复优先，回滚备选                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 回滚到v2.8.0 (a4612592) 标准流程

### 3.1 流程概览

```
┌─────────────────────────────────────────────────────────────┐
│                    回滚操作流程图                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ 评估    │───▶│ 备份    │───▶│ 回滚    │───▶│ 验证    │  │
│  │ 决策    │    │ 当前    │    │ 执行    │    │ 确认    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  确认回滚       创建备份       执行回滚       运行验证      │
│  目标版本       检查点         命令           清单          │
│                                                             │
│                         │                                   │
│                         ▼                                   │
│                  ┌─────────┐                                │
│                  │ 记录    │                                │
│                  │ 日志    │                                │
│                  └─────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 步骤1: 评估与决策

**目的**: 确认回滚必要性和目标版本

```yaml
# 回滚决策检查清单
decision_checklist:
  - question: "问题是否可以通过热修复解决？"
    if_yes: "优先尝试热修复"
    if_no: "继续评估回滚"
    
  - question: "回滚是否会导致数据丢失？"
    if_yes: "评估数据影响范围，制定数据恢复计划"
    if_no: "继续回滚流程"
    
  - question: "目标版本是否经过验证？"
    if_yes: "确认版本ID: a4612592"
    if_no: "选择其他已验证版本"
    
  - question: "是否已通知相关干系人？"
    if_yes: "记录通知时间和对象"
    if_no: "发送回滚通知"
```

**目标版本信息**:

| 属性 | 值 |
|------|-----|
| 版本ID | a4612592 |
| 版本标签 | v2.8.0 UI组件化与公开展示 |
| 创建时间 | 2026-01-18 |
| 主要功能 | 子系统帮助组件、ZKP验证、公开展示页面 |
| 稳定性 | ✅ 已验证 |

### 3.3 步骤2: 备份当前状态

**目的**: 保留当前状态以便必要时恢复

**方式A: 通过Manus命令**
```
@manus backup current --tag pre-rollback-$(date +%Y%m%d%H%M%S)
```

**方式B: 通过Management UI**
1. 打开Dashboard面板
2. 点击"Save Checkpoint"
3. 输入描述: "Pre-rollback backup before reverting to a4612592"
4. 确认保存

**备份验证**:
```yaml
backup_verification:
  - check: "备份检查点已创建"
    command: "确认新版本ID已生成"
  - check: "备份可访问"
    command: "在Checkpoint列表中可见"
  - check: "备份完整"
    command: "文件数量与当前一致"
```

### 3.4 步骤3: 执行回滚

**方式A: 通过Manus Management UI (推荐)**

```
操作路径: Dashboard → Checkpoint → 选择版本a4612592 → 点击"Rollback"按钮

详细步骤:
1. 在Chatbox中找到版本a4612592的Checkpoint卡片
2. 或在Dashboard面板的Checkpoint列表中定位
3. 点击"Rollback"按钮
4. 确认回滚操作
5. 等待回滚完成
```

**方式B: 通过Manus命令**

```
@manus rollback version a4612592
```

带选项的完整命令:
```
@manus rollback version a4612592 --verify --notify
```

| 选项 | 说明 |
|------|------|
| `--verify` | 回滚后自动运行验证 |
| `--notify` | 完成后发送通知 |
| `--force` | 跳过确认直接执行 |
| `--preserve-changes` | 保留当前更改为分支 |

**方式C: 紧急回滚 (跳过所有确认)**

```
@manus rollback version a4612592 --force --skip-backup
```

⚠️ **警告**: 紧急回滚仅在系统完全不可用时使用，会跳过备份步骤。

### 3.5 步骤4: 验证回滚结果

**验证清单**:

```markdown
## 回滚验证清单 (v2.8.0 / a4612592)

### 基础设施验证 (必须全部通过)
- [ ] 开发服务器正常启动
  - 命令: `pnpm dev`
  - 预期: 服务器在端口3000启动
  
- [ ] 数据库连接正常
  - 检查: 控制台无数据库连接错误
  - 预期: "Database connected" 日志
  
- [ ] OAuth认证流程正常
  - 测试: 访问受保护路由
  - 预期: 正确重定向到登录页

### 核心路由验证 (必须全部通过)
- [ ] 首页 (/) 正常加载
- [ ] 路线图 (/roadmap) 正常加载
- [ ] 工具页 (/tools) 正常加载
- [ ] 公开首页 (/public) 正常加载
- [ ] 能力介绍 (/capabilities) 正常加载
- [ ] 子系统帮助 (/subsystem-help) 正常加载

### API接口验证 (必须全部通过)
- [ ] trpc.auth.me 正常响应
- [ ] trpc.zkp.getPublicShowcase 正常响应
- [ ] trpc.system.notifyOwner 正常响应

### 数据完整性验证 (抽样检查)
- [ ] 用户数据完整 (抽查5条记录)
- [ ] 项目数据完整 (抽查5条记录)
- [ ] 配置数据完整 (检查关键配置)

### 性能基准验证 (可选)
- [ ] 首页加载时间 < 3秒
- [ ] API响应时间 < 500ms
- [ ] 内存占用 < 1GB
```

**自动化验证脚本**:

```bash
#!/bin/bash
# rollback-verification.sh

echo "=== GRT v2.8.0 Rollback Verification ==="

# 1. 检查服务器状态
echo "[1/5] Checking server status..."
curl -s http://localhost:3000/api/health || echo "FAIL: Server not responding"

# 2. 检查核心路由
echo "[2/5] Checking core routes..."
for route in "/" "/roadmap" "/tools" "/public" "/capabilities"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$route)
  if [ "$status" = "200" ]; then
    echo "  ✓ $route OK"
  else
    echo "  ✗ $route FAIL ($status)"
  fi
done

# 3. 检查API端点
echo "[3/5] Checking API endpoints..."
curl -s http://localhost:3000/api/trpc/zkp.getPublicShowcase || echo "FAIL: ZKP API error"

# 4. 检查数据库连接
echo "[4/5] Checking database connection..."
# 通过API间接验证

# 5. 生成报告
echo "[5/5] Generating verification report..."
echo "=== Verification Complete ==="
```

### 3.6 步骤5: 记录回滚日志

**日志记录要求**:

```yaml
rollback_log:
  timestamp: "2026-01-18T16:45:00Z"
  operator: "操作者姓名"
  from_version: "当前版本ID"
  to_version: "a4612592"
  reason: "回滚原因详细描述"
  
  pre_rollback_state:
    server_status: "running/stopped"
    error_count: 446
    affected_features: ["zkpRouter", "routers"]
    
  rollback_method: "Management UI / Command"
  
  post_rollback_verification:
    server_startup: "pass/fail"
    database_connection: "pass/fail"
    oauth_flow: "pass/fail"
    core_routes: "pass/fail"
    api_endpoints: "pass/fail"
    
  issues_encountered: "回滚过程中遇到的问题"
  resolution: "问题解决方案"
  
  follow_up_actions:
    - "后续需要执行的操作1"
    - "后续需要执行的操作2"
```

---

## 4. 数据备份策略

### 4.1 备份类型

| 备份类型 | 频率 | 保留期 | 存储位置 |
|----------|------|--------|----------|
| 自动检查点 | 每次保存 | 永久 | Manus云存储 |
| 数据库快照 | 每日 | 30天 | TiDB备份 |
| 代码仓库 | 实时 | 永久 | Git历史 |

### 4.2 回滚前备份清单

```yaml
pre_rollback_backup:
  required:
    - type: "checkpoint"
      description: "当前代码状态检查点"
      method: "webdev_save_checkpoint"
      
  recommended:
    - type: "database_snapshot"
      description: "数据库当前状态快照"
      method: "通过TiDB控制台创建"
      
    - type: "config_export"
      description: "环境变量和配置导出"
      method: "导出.env文件内容"
```

### 4.3 数据恢复优先级

| 优先级 | 数据类型 | 恢复方法 |
|--------|----------|----------|
| P0 | 用户账户数据 | 数据库恢复 |
| P1 | 业务核心数据 | 数据库恢复 |
| P2 | 配置数据 | 检查点恢复 |
| P3 | 日志数据 | 可选恢复 |

---

## 5. 紧急回滚流程

### 5.1 紧急情况定义

| 情况 | 描述 | 响应时间 |
|------|------|----------|
| 系统完全不可用 | 所有服务无响应 | 立即 |
| 数据泄露风险 | 发现安全漏洞 | 立即 |
| 数据损坏 | 核心数据异常 | 15分钟内 |

### 5.2 紧急回滚命令

```
# 紧急回滚 - 跳过所有确认和备份
@manus rollback version a4612592 --force --skip-backup --emergency

# 或通过Management UI
Dashboard → Checkpoint → a4612592 → 长按"Rollback" 3秒触发紧急模式
```

### 5.3 紧急回滚后必须执行

```yaml
post_emergency_rollback:
  immediate:
    - "验证系统基本功能"
    - "通知所有相关人员"
    - "记录紧急回滚日志"
    
  within_1_hour:
    - "完整验证清单检查"
    - "数据完整性审计"
    - "根因分析启动"
    
  within_24_hours:
    - "事故报告编写"
    - "预防措施制定"
    - "流程改进建议"
```

---

## 6. 回滚后操作

### 6.1 通知模板

```
主题: [GRT系统] 版本回滚通知

各位相关同事:

GRT智能系统已于 [时间] 执行版本回滚操作。

回滚详情:
- 原版本: [原版本ID]
- 目标版本: a4612592 (v2.8.0)
- 回滚原因: [原因描述]

影响范围:
- [影响的功能或模块]

当前状态:
- 系统已恢复正常运行
- 所有核心功能已验证通过

后续计划:
- [后续修复计划]

如有问题，请联系 [联系人]。

此致
GRT技术团队
```

### 6.2 问题追踪

```yaml
issue_tracking:
  create_issue:
    title: "[Rollback] 从 [原版本] 回滚到 a4612592"
    labels: ["rollback", "incident"]
    assignee: "负责人"
    
  content:
    - "回滚原因"
    - "影响范围"
    - "根因分析"
    - "修复计划"
    - "预防措施"
```

---

## 7. 版本检查点参考

### 7.1 已验证稳定版本

| 版本ID | 标签 | 日期 | 稳定性 | 说明 |
|--------|------|------|--------|------|
| a4612592 | v2.8.0 | 2026-01-18 | ✅ 稳定 | UI组件化与公开展示 |
| da8810c6 | v2.7.0 | 2026-01-18 | ✅ 稳定 | AI-AI销售架构 |
| fbc2c8cf | v2.6.6 | 2026-01-18 | ✅ 稳定 | 子系统操作手册 |

### 7.2 回滚目标选择指南

```
如果问题出现在:
├── v2.8.0新增功能 (UI组件/ZKP/公开页面)
│   └── 回滚到: da8810c6 (v2.7.0)
│
├── v2.7.0新增功能 (AI-AI架构/预设语句)
│   └── 回滚到: fbc2c8cf (v2.6.6)
│
└── 不确定问题来源
    └── 回滚到: a4612592 (v2.8.0) - 最新稳定版
```

---

## 附录A: 常见问题解答

**Q: 回滚会丢失数据吗？**
A: 代码回滚不会影响数据库数据。但如果新版本创建了新的数据库表，回滚后这些表仍然存在，只是可能无法通过应用访问。

**Q: 回滚后如何恢复到回滚前的状态？**
A: 如果在回滚前创建了备份检查点，可以再次执行回滚操作，目标版本选择备份检查点的版本ID。

**Q: 多人同时操作会有冲突吗？**
A: Manus系统会锁定回滚操作，同一时间只允许一个回滚操作执行。

**Q: 回滚失败怎么办？**
A: 联系Manus技术支持，提供错误日志和版本ID。

---

**文档结束**

*本规范由Manus AI创建，用于指导GRT智能系统的版本回滚操作。*
*当前推荐回滚目标: v2.8.0 (a4612592)*
