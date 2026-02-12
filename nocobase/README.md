# GRT智能系统 NocoBase 配置

## 概述

本目录包含GRT智能系统导出的NocoBase配置文件，可用于在NocoBase中快速搭建系统。

## 目录结构

```
nocobase/
├── collections/          # 数据模型配置
│   ├── customers.json    # 客户
│   ├── leads.json        # 线索
│   ├── opportunities.json # 商机
│   ├── projects.json     # 项目
│   ├── ...
│   └── _all_collections.json
├── workflows/            # 工作流配置
│   ├── sales_process.json
│   ├── project_gate_review.json
│   ├── expense_approval.json
│   ├── deadlock_detection.json
│   └── _all_workflows.json
└── README.md
```

## 导入步骤

1. 登录NocoBase管理后台
2. 进入"数据表管理"
3. 点击"导入"，选择collections目录下的JSON文件
4. 进入"工作流管理"
5. 点击"导入"，选择workflows目录下的JSON文件

## Collection列表

| 名称 | 标题 | 说明 |
|------|------|------|
| customers | 客户 | 12个字段 |
| leads | 线索 | 11个字段 |
| opportunities | 商机 | 8个字段 |
| projects | 项目 | 11个字段 |
| project_phases | 项目阶段 | 9个字段 |
| tasks | 任务 | 10个字段 |
| employees | 员工 | 9个字段 |
| skills | 技能 | 3个字段 |
| employee_skills | 员工技能 | 4个字段 |
| attendance | 考勤 | 6个字段 |
| budgets | 预算 | 6个字段 |
| cost_entries | 成本条目 | 8个字段 |
| payment_nodes | 付款节点 | 8个字段 |
| ai_assistants | AI助手配置 | 6个字段 |
| ai_conversations | AI对话记录 | 6个字段 |
| deadlock_records | 死锁记录 | 6个字段 |
| audit_logs | 审计日志 | 8个字段 |

## Workflow列表

| 名称 | 标题 | 触发方式 |
|------|------|----------|
| sales_process | 销售流程 | collection |
| project_gate_review | 项目门径评审 | collection |
| expense_approval | 费用审批 | collection |
| deadlock_detection | 死锁检测 | schedule |

## 注意事项

1. 导入前请确保NocoBase版本兼容
2. 关联字段需要按顺序导入（先导入被引用的表）
3. 工作流中的脚本节点需要根据实际环境调整

## 生成时间

2026-01-23T18:57:38.632Z
