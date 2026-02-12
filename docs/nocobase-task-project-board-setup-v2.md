# GRT NocoBase任务与项目看板配置指南 v2.0

> **文档版本**: 2.0  
> **创建日期**: 2026-01-17  
> **作者**: Manus AI  
> **状态**: 正式发布

---

## 第一部分：NocoBase任务看板配置

### 1.1 任务数据表结构

在NocoBase中创建以下数据表：

#### 1.1.1 任务主表 (tasks)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| task_id | 自动编号 | 前缀: TASK- |
| title | 单行文本 | 必填 |
| description | 多行文本 | 支持Markdown |
| task_type | 单选 | 开发/设计/测试/文档/部署 |
| priority | 单选 | P0-紧急/P1-高/P2-中/P3-低 |
| status | 单选 | 待开始/进行中/待审核/已完成/已取消 |
| assignee | 关联用户 | 多选 |
| reviewer | 关联用户 | 单选 |
| parent_task | 关联任务 | 支持子任务 |
| dependencies | 关联任务 | 多选，前置任务 |
| estimated_hours | 数字 | 预估工时 |
| actual_hours | 数字 | 实际工时 |
| start_date | 日期 | 计划开始 |
| due_date | 日期 | 计划完成 |
| completed_at | 日期时间 | 实际完成时间 |
| tags | 多选 | 标签分类 |
| attachments | 附件 | 支持多文件 |
| created_by | 关联用户 | 创建人 |
| created_at | 日期时间 | 创建时间 |
| updated_at | 日期时间 | 更新时间 |

#### 1.1.2 任务评论表 (task_comments)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| task | 关联任务 | 必填 |
| content | 多行文本 | 支持Markdown |
| author | 关联用户 | 自动填充 |
| attachments | 附件 | 支持多文件 |
| created_at | 日期时间 | 自动填充 |

#### 1.1.3 任务时间记录表 (task_time_logs)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| task | 关联任务 | 必填 |
| user | 关联用户 | 自动填充 |
| hours | 数字 | 工时 |
| work_date | 日期 | 工作日期 |
| description | 单行文本 | 工作描述 |
| created_at | 日期时间 | 自动填充 |

### 1.2 17个AI助手开发任务导入

以下是需要导入NocoBase的17个具体任务：

```json
[
  {
    "task_id": "TASK-001",
    "title": "AI助手数据库Schema设计与创建",
    "description": "设计并创建AI助手相关的数据库表结构，包括助手配置表、调用日志表、会话记录表等",
    "task_type": "开发",
    "priority": "P0-紧急",
    "phase": "Phase 1 - 基础架构",
    "estimated_hours": 16,
    "dependencies": [],
    "deliverables": ["数据库Schema文件", "迁移脚本", "表结构文档"]
  },
  {
    "task_id": "TASK-002",
    "title": "AI助手配置管理模块开发",
    "description": "开发AI助手配置管理模块，支持助手注册、配置更新、状态管理等功能",
    "task_type": "开发",
    "priority": "P0-紧急",
    "phase": "Phase 1 - 基础架构",
    "estimated_hours": 24,
    "dependencies": ["TASK-001"],
    "deliverables": ["配置管理API", "配置界面", "单元测试"]
  },
  {
    "task_id": "TASK-003",
    "title": "AI助手API网关开发",
    "description": "开发统一的AI助手API网关，实现请求路由、负载均衡、速率限制、日志记录等功能",
    "task_type": "开发",
    "priority": "P0-紧急",
    "phase": "Phase 1 - 基础架构",
    "estimated_hours": 32,
    "dependencies": ["TASK-001", "TASK-002"],
    "deliverables": ["API网关服务", "路由配置", "监控仪表盘"]
  },
  {
    "task_id": "TASK-004",
    "title": "Secrets管理模块开发",
    "description": "开发安全的Secrets管理模块，支持API密钥、凭证的加密存储和安全访问",
    "task_type": "开发",
    "priority": "P0-紧急",
    "phase": "Phase 1 - 基础架构",
    "estimated_hours": 16,
    "dependencies": ["TASK-001"],
    "deliverables": ["Secrets管理API", "加密存储", "访问控制"]
  },
  {
    "task_id": "TASK-005",
    "title": "Interview Assistant核心功能开发",
    "description": "开发面试助手核心功能，包括简历分析、面试策略生成、问题推荐、候选人评估等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 2 - 核心助手",
    "estimated_hours": 40,
    "dependencies": ["TASK-003", "TASK-004"],
    "deliverables": ["Interview Assistant服务", "tRPC路由", "单元测试"]
  },
  {
    "task_id": "TASK-006",
    "title": "Solution Assistant核心功能开发",
    "description": "开发方案助手核心功能，包括工艺参数解析、方案推荐、历史方案学习等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 2 - 核心助手",
    "estimated_hours": 40,
    "dependencies": ["TASK-003", "TASK-004"],
    "deliverables": ["Solution Assistant服务", "方案库", "推荐算法"]
  },
  {
    "task_id": "TASK-007",
    "title": "Quotation Assistant核心功能开发",
    "description": "开发报价助手核心功能，包括成本计算、价格推荐、竞争分析等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 2 - 核心助手",
    "estimated_hours": 40,
    "dependencies": ["TASK-006"],
    "deliverables": ["Quotation Assistant服务", "定价模型", "报价模板"]
  },
  {
    "task_id": "TASK-008",
    "title": "Planning Assistant核心功能开发",
    "description": "开发计划助手核心功能，包括计划生成、任务分解、进度跟踪等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 2 - 核心助手",
    "estimated_hours": 40,
    "dependencies": ["TASK-003", "TASK-004"],
    "deliverables": ["Planning Assistant服务", "计划模板", "跟踪机制"]
  },
  {
    "task_id": "TASK-009",
    "title": "KPI Assistant核心功能开发",
    "description": "开发绩效助手核心功能，包括绩效评估、沟通建议、邮件通知等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 2 - 核心助手",
    "estimated_hours": 40,
    "dependencies": ["TASK-008"],
    "deliverables": ["KPI Assistant服务", "评分模型", "通知系统"]
  },
  {
    "task_id": "TASK-010",
    "title": "Purchase Assistant核心功能开发",
    "description": "开发采购助手核心功能，包括供应商推荐、价格比较、采购建议等",
    "task_type": "开发",
    "priority": "P2-中",
    "phase": "Phase 3 - 扩展助手",
    "estimated_hours": 32,
    "dependencies": ["TASK-003", "TASK-004"],
    "deliverables": ["Purchase Assistant服务", "供应商库", "比价算法"]
  },
  {
    "task_id": "TASK-011",
    "title": "员工AI助手个人化模块开发",
    "description": "开发员工AI助手个人化模块，实现助手复制、个性化配置、学习机制等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 3 - 扩展助手",
    "estimated_hours": 48,
    "dependencies": ["TASK-005", "TASK-008", "TASK-009"],
    "deliverables": ["个人化引擎", "学习系统", "职业发展模块"]
  },
  {
    "task_id": "TASK-012",
    "title": "项目数字孪生核心模块开发",
    "description": "开发项目数字孪生核心模块，包括状态同步、预测分析、风险预警等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 3 - 扩展助手",
    "estimated_hours": 56,
    "dependencies": ["TASK-003"],
    "deliverables": ["数字孪生引擎", "预测模型", "预警系统"]
  },
  {
    "task_id": "TASK-013",
    "title": "AI助手前端界面开发",
    "description": "开发AI助手统一前端界面，包括助手列表、对话界面、配置管理等",
    "task_type": "开发",
    "priority": "P1-高",
    "phase": "Phase 4 - 界面集成",
    "estimated_hours": 40,
    "dependencies": ["TASK-005", "TASK-006", "TASK-007", "TASK-008", "TASK-009"],
    "deliverables": ["前端组件", "对话界面", "管理界面"]
  },
  {
    "task_id": "TASK-014",
    "title": "数字孪生可视化仪表盘开发",
    "description": "开发项目数字孪生可视化仪表盘，包括项目状态、预测图表、风险地图等",
    "task_type": "开发",
    "priority": "P2-中",
    "phase": "Phase 4 - 界面集成",
    "estimated_hours": 32,
    "dependencies": ["TASK-012"],
    "deliverables": ["可视化组件", "仪表盘页面", "报表导出"]
  },
  {
    "task_id": "TASK-015",
    "title": "Manus-Claude协作流程实现",
    "description": "实现Manus-Claude Code协作开发流程，包括任务分发、Bug修复循环、影响评估等",
    "task_type": "开发",
    "priority": "P2-中",
    "phase": "Phase 4 - 界面集成",
    "estimated_hours": 24,
    "dependencies": ["TASK-003"],
    "deliverables": ["协作流程引擎", "任务队列", "状态追踪"]
  },
  {
    "task_id": "TASK-016",
    "title": "系统集成测试",
    "description": "进行全面的系统集成测试，验证所有AI助手功能和数字孪生系统的正确性",
    "task_type": "测试",
    "priority": "P1-高",
    "phase": "Phase 5 - 测试部署",
    "estimated_hours": 40,
    "dependencies": ["TASK-013", "TASK-014", "TASK-015"],
    "deliverables": ["测试报告", "Bug列表", "性能报告"]
  },
  {
    "task_id": "TASK-017",
    "title": "文档编写与培训准备",
    "description": "编写系统文档、用户手册，准备培训材料",
    "task_type": "文档",
    "priority": "P2-中",
    "phase": "Phase 5 - 测试部署",
    "estimated_hours": 24,
    "dependencies": ["TASK-016"],
    "deliverables": ["用户手册", "API文档", "培训PPT"]
  }
]
```

### 1.3 看板视图配置

#### 1.3.1 看板视图 (Kanban)

创建按状态分组的看板视图：

```yaml
看板视图配置:
  名称: "任务看板"
  分组字段: status
  列配置:
    - 待开始: 
        颜色: gray
        WIP限制: 无
    - 进行中:
        颜色: blue
        WIP限制: 5
    - 待审核:
        颜色: yellow
        WIP限制: 3
    - 已完成:
        颜色: green
        WIP限制: 无
    - 已取消:
        颜色: red
        隐藏: true
  卡片显示字段:
    - title
    - priority
    - assignee
    - due_date
    - tags
  快速筛选:
    - assignee
    - priority
    - task_type
```

#### 1.3.2 甘特图视图 (Gantt)

创建项目进度甘特图：

```yaml
甘特图配置:
  名称: "项目进度"
  开始日期字段: start_date
  结束日期字段: due_date
  进度字段: 计算字段（基于子任务完成率）
  分组: phase
  依赖关系: dependencies
  里程碑标记: 
    - Phase 1完成
    - Phase 2完成
    - Phase 3完成
    - Phase 4完成
    - Phase 5完成
  颜色编码:
    - 按时: green
    - 延期: red
    - 进行中: blue
```

#### 1.3.3 日历视图 (Calendar)

创建任务日历视图：

```yaml
日历视图配置:
  名称: "任务日历"
  日期字段: due_date
  标题字段: title
  颜色字段: priority
  颜色映射:
    P0-紧急: red
    P1-高: orange
    P2-中: blue
    P3-低: gray
  显示字段:
    - assignee
    - status
```

### 1.4 自动化规则配置

#### 1.4.1 任务状态自动更新

```yaml
规则1 - 自动开始:
  触发条件: 当前日期 >= start_date AND status = "待开始"
  执行动作: 更新status为"进行中"
  通知: 发送通知给assignee

规则2 - 逾期提醒:
  触发条件: 当前日期 > due_date AND status != "已完成"
  执行动作: 
    - 添加"逾期"标签
    - 发送提醒给assignee和reviewer
  频率: 每日检查

规则3 - 完成通知:
  触发条件: status变更为"已完成"
  执行动作:
    - 记录completed_at
    - 通知reviewer
    - 更新依赖任务状态
```

#### 1.4.2 工时自动汇总

```yaml
规则4 - 工时汇总:
  触发条件: task_time_logs新增记录
  执行动作: 更新任务actual_hours = SUM(关联time_logs.hours)

规则5 - 工时预警:
  触发条件: actual_hours > estimated_hours * 0.8
  执行动作: 发送预警通知给assignee和项目经理
```

---

## 第二部分：NocoBase项目看板配置

### 2.1 项目数据表结构

#### 2.1.1 项目主表 (projects)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| project_id | 自动编号 | 前缀: PRJ- |
| project_code | 单行文本 | 项目编码 |
| project_name | 单行文本 | 项目名称 |
| customer | 关联客户 | 客户信息 |
| project_type | 单选 | 标准/定制/服务 |
| current_phase | 单选 | M0-M12阶段 |
| status | 单选 | 规划中/进行中/暂停/已完成/已取消 |
| health_score | 数字 | 健康度评分 |
| project_manager | 关联用户 | 项目经理 |
| team_members | 关联用户 | 多选 |
| start_date | 日期 | 开始日期 |
| planned_end_date | 日期 | 计划结束 |
| actual_end_date | 日期 | 实际结束 |
| budget | 数字 | 预算金额 |
| actual_cost | 数字 | 实际成本 |
| progress | 数字 | 进度百分比 |
| risk_level | 单选 | 高/中/低 |
| description | 多行文本 | 项目描述 |
| created_at | 日期时间 | 创建时间 |
| updated_at | 日期时间 | 更新时间 |

#### 2.1.2 项目里程碑表 (project_milestones)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| project | 关联项目 | 必填 |
| milestone_name | 单行文本 | 里程碑名称 |
| phase | 单选 | M0-M12 |
| planned_date | 日期 | 计划日期 |
| actual_date | 日期 | 实际日期 |
| status | 单选 | 待开始/进行中/已完成/已延期 |
| deliverables | 多行文本 | 交付物 |
| gate_review_result | 单选 | 通过/有条件通过/不通过 |
| reviewer | 关联用户 | 评审人 |
| notes | 多行文本 | 备注 |

#### 2.1.3 项目风险表 (project_risks)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| project | 关联项目 | 必填 |
| risk_code | 单行文本 | 风险编码 |
| risk_category | 单选 | 进度/成本/质量/资源/范围 |
| description | 多行文本 | 风险描述 |
| probability | 单选 | 高/中/低 |
| impact | 单选 | 高/中/低 |
| risk_score | 数字 | 风险评分 |
| mitigation_plan | 多行文本 | 缓解计划 |
| owner | 关联用户 | 责任人 |
| status | 单选 | 已识别/监控中/已缓解/已发生/已关闭 |
| identified_date | 日期 | 识别日期 |
| resolved_date | 日期 | 解决日期 |

### 2.2 项目看板视图配置

#### 2.2.1 项目概览看板

```yaml
看板视图配置:
  名称: "项目概览"
  分组字段: current_phase
  列配置:
    - M0-M1 (立项):
        颜色: purple
    - M2-M3 (设计):
        颜色: blue
    - M4-M5 (生产):
        颜色: cyan
    - M6-M7 (测试):
        颜色: yellow
    - M8-M9 (安装):
        颜色: orange
    - M10-M12 (验收):
        颜色: green
  卡片显示字段:
    - project_name
    - customer
    - health_score
    - progress
    - project_manager
    - risk_level
  卡片颜色:
    基于: health_score
    规则:
      - ">80": green
      - "60-80": yellow
      - "<60": red
```

#### 2.2.2 项目甘特图

```yaml
甘特图配置:
  名称: "项目进度甘特图"
  开始日期字段: start_date
  结束日期字段: planned_end_date
  进度字段: progress
  分组: project_type
  里程碑: 关联project_milestones
  基线对比: 显示计划vs实际
  关键路径: 高亮显示
```

#### 2.2.3 项目仪表盘

```yaml
仪表盘配置:
  名称: "项目管理仪表盘"
  组件:
    - 类型: 统计卡片
      指标:
        - 进行中项目数
        - 本月完成项目数
        - 平均健康度
        - 高风险项目数
    
    - 类型: 饼图
      数据: 项目按阶段分布
      
    - 类型: 柱状图
      数据: 项目按类型分布
      
    - 类型: 折线图
      数据: 月度项目完成趋势
      
    - 类型: 表格
      数据: 高风险项目列表
      字段: [project_name, risk_level, health_score, project_manager]
      
    - 类型: 日历
      数据: 里程碑日历
```

### 2.3 项目自动化规则

```yaml
规则1 - 健康度自动计算:
  触发条件: 项目数据更新
  计算公式: |
    health_score = (
      进度得分 * 0.3 +
      成本得分 * 0.25 +
      质量得分 * 0.25 +
      风险得分 * 0.2
    )

规则2 - 阶段门禁提醒:
  触发条件: 里程碑计划日期前3天
  执行动作: 
    - 发送提醒给项目经理
    - 生成阶段评审清单

规则3 - 风险升级:
  触发条件: risk_score > 15
  执行动作:
    - 更新项目risk_level为"高"
    - 通知项目总监
    - 创建风险处理任务

规则4 - 项目完成:
  触发条件: current_phase变更为"M12"
  执行动作:
    - 更新status为"已完成"
    - 记录actual_end_date
    - 触发项目总结流程
```

---

## 第三部分：Manus-Claude协作流程配置

### 3.1 协作流程数据表

#### 3.1.1 协作任务表 (collaboration_tasks)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| task_code | 单行文本 | 任务编码 |
| title | 单行文本 | 任务标题 |
| description | 多行文本 | 任务描述 |
| source_task | 关联任务 | 来源任务 |
| assigned_to | 单选 | Manus/Claude |
| status | 单选 | 待分配/进行中/待审核/已完成/需修复 |
| priority | 单选 | 高/中/低 |
| bug_fix_count | 数字 | Bug修复次数 |
| max_fix_attempts | 数字 | 最大修复次数（默认3） |
| execution_log | 多行文本 | 执行日志 |
| review_result | 单选 | 通过/有Bug/无法修复 |
| review_notes | 多行文本 | 审核备注 |
| impact_assessment | JSON | 影响评估 |
| created_at | 日期时间 | 创建时间 |
| completed_at | 日期时间 | 完成时间 |

#### 3.1.2 Bug修复记录表 (bug_fix_records)

| 字段名 | 字段类型 | 配置 |
|--------|----------|------|
| id | 自动编号 | - |
| collaboration_task | 关联协作任务 | 必填 |
| attempt_number | 数字 | 修复次数 |
| bug_description | 多行文本 | Bug描述 |
| fix_approach | 多行文本 | 修复方案 |
| fix_result | 单选 | 成功/失败/部分成功 |
| test_result | 多行文本 | 测试结果 |
| executed_by | 单选 | Manus/Claude |
| reviewed_by | 单选 | Manus/Claude |
| created_at | 日期时间 | 创建时间 |

### 3.2 协作流程自动化

```yaml
流程1 - 任务分发:
  触发条件: 新建协作任务
  执行动作:
    - 分析任务复杂度
    - 分配给Claude Code执行
    - 设置超时时间
    - 记录分发日志

流程2 - 执行完成审核:
  触发条件: Claude完成任务
  执行动作:
    - Manus进行代码审核
    - 运行自动化测试
    - 记录审核结果

流程3 - Bug修复循环:
  触发条件: 审核发现Bug AND bug_fix_count < 3
  执行动作:
    - 记录Bug详情
    - 生成修复指导
    - 分配给Claude修复
    - 增加bug_fix_count

流程4 - 无法修复处理:
  触发条件: bug_fix_count >= 3 AND 仍有Bug
  执行动作:
    - 保存执行调试内容
    - 生成影响评估报告
    - 提出优化建议
    - 标记为"需人工介入"
    - 继续下一个任务

流程5 - 任务完成:
  触发条件: 审核通过
  执行动作:
    - 更新任务状态
    - 合并代码
    - 分配下一个任务
```

---

## 第四部分：10周执行计划

### 4.1 时间线概览

| 周次 | 日期范围 | 主要任务 | 里程碑 |
|------|----------|----------|--------|
| Week 1 | 1/20-1/24 | TASK-001, TASK-002 | 数据库Schema完成 |
| Week 2 | 1/27-1/31 | TASK-003, TASK-004 | 基础架构完成 |
| Week 3 | 2/3-2/7 | TASK-005, TASK-006 | Interview/Solution助手 |
| Week 4 | 2/10-2/14 | TASK-007, TASK-008 | Quotation/Planning助手 |
| Week 5 | 2/17-2/21 | TASK-009, TASK-010 | KPI/Purchase助手 |
| Week 6 | 2/24-2/28 | TASK-011 | 员工AI助手个人化 |
| Week 7 | 3/3-3/7 | TASK-012 | 项目数字孪生 |
| Week 8 | 3/10-3/14 | TASK-013, TASK-014 | 前端界面 |
| Week 9 | 3/17-3/21 | TASK-015, TASK-016 | 协作流程/集成测试 |
| Week 10 | 3/24-3/28 | TASK-017 | 文档/培训 |

### 4.2 工时汇总

| 阶段 | 任务数 | 基础工时 | 风险缓冲(20%) | 总工时 |
|------|--------|----------|---------------|--------|
| Phase 1 | 4 | 88h | 17.6h | 105.6h |
| Phase 2 | 5 | 200h | 40h | 240h |
| Phase 3 | 3 | 136h | 27.2h | 163.2h |
| Phase 4 | 3 | 96h | 19.2h | 115.2h |
| Phase 5 | 2 | 64h | 12.8h | 76.8h |
| **总计** | **17** | **584h** | **116.8h** | **700.8h** |

---

## 参考资料

1. GRT AI助手架构设计 v1.0 - docs/ai-assistant-architecture.md
2. GRT Manus-Claude协作流程 v1.0 - docs/manus-claude-collaboration-workflow.md
3. GRT NocoBase任务分解计划 v1.0 - docs/nocobase-task-decomposition.md
