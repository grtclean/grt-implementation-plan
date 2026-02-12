# RFC-029: FINDIQ知识转移理念扩展

| 属性 | 值 |
|------|-----|
| RFC编号 | RFC-029 |
| 标题 | FINDIQ知识转移理念扩展 |
| 状态 | 已批准 |
| 创建日期 | 2026-01-18 |
| 作者 | Manus AI |
| 目标版本 | v2.6.1 |

---

## 1. 概述

本RFC基于FINDIQ知识转移理念，对GRT智能系统进行全面扩展，涵盖数据结构优化、分层授权机制、AI智能策略、业务流闭环规范以及交互界面开发五大核心领域。

### 1.1 FINDIQ知识转移理念

FINDIQ（Field Intelligence & Digital IQ）是一种将现场服务智慧与数字化能力相结合的知识管理方法论，其核心原则包括：

- **知识分层**：根据敏感度和专业性对知识进行分级管理
- **智能辅助**：AI驱动的知识推荐和决策支持
- **闭环反馈**：服务执行与知识更新的双向循环
- **权限精细化**：基于角色和认证状态的访问控制

### 1.2 更新范围

| 模块 | 更新内容 | 优先级 |
|------|----------|--------|
| Collections结构 | 扩充4个核心表字段 | P0 |
| 授权机制 | 三级分层授权体系 | P0 |
| AI逻辑策略 | 认证检查+财务审计 | P1 |
| 业务流闭环 | 服务报告+增值订单 | P1 |
| 交互界面 | 主管工作台+客户助理 | P2 |

---

## 2. Collections结构扩充

### 2.1 service_tasks 服务任务表

新增字段用于支持团队协作和客户确认流程：

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| supervisor_id | VARCHAR(36) | 主管ID | FK → users.id |
| team_members | JSON | 随行人员分工 | 结构化JSON |
| customer_confirmation_status | ENUM | 客户确认状态 | pending/confirmed/rejected |

**team_members JSON结构**：
```json
{
  "members": [
    {
      "user_id": "uuid",
      "role": "lead_engineer|assistant|trainee",
      "responsibilities": ["设备检查", "文档记录"],
      "arrival_time": "2026-01-18T09:00:00Z"
    }
  ],
  "total_count": 3
}
```

### 2.2 travel_records 出差记录表

新增字段用于支持地理定位、通勤安排和报销关联：

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| clock_in_geo | JSON | 打卡地理位置 | GeoJSON格式 |
| commute_arrangements | JSON | 通勤安排 | 结构化JSON |
| expense_claims | VARCHAR(36) | 报销关联ID | FK → expense_claims.id |

**clock_in_geo JSON结构**：
```json
{
  "type": "Point",
  "coordinates": [121.4737, 31.2304],
  "accuracy": 10.5,
  "timestamp": "2026-01-18T08:30:00Z",
  "address": "上海市浦东新区张江高科技园区"
}
```

**commute_arrangements JSON结构**：
```json
{
  "outbound": {
    "type": "flight|train|car|bus",
    "departure": "2026-01-18T07:00:00Z",
    "arrival": "2026-01-18T10:00:00Z",
    "booking_ref": "MU5123"
  },
  "return": {
    "type": "flight",
    "departure": "2026-01-20T18:00:00Z",
    "arrival": "2026-01-20T21:00:00Z",
    "booking_ref": "MU5124"
  },
  "accommodation": {
    "hotel_name": "希尔顿酒店",
    "check_in": "2026-01-18",
    "check_out": "2026-01-20",
    "booking_ref": "HLT123456"
  }
}
```

### 2.3 parts_catalog 配件目录表

新增字段用于支持分级定价和编码规则：

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| client_tier_prices | JSON | 分级价格矩阵 | 结构化JSON |
| part_code_rules | JSON | 编码规则 | 结构化JSON |

**client_tier_prices JSON结构**：
```json
{
  "tiers": {
    "standard": { "multiplier": 1.0, "discount": 0 },
    "silver": { "multiplier": 0.95, "discount": 5 },
    "gold": { "multiplier": 0.90, "discount": 10 },
    "platinum": { "multiplier": 0.85, "discount": 15 },
    "strategic": { "multiplier": 0.80, "discount": 20 }
  },
  "base_price": 1500.00,
  "currency": "CNY",
  "effective_date": "2026-01-01"
}
```

**part_code_rules JSON结构**：
```json
{
  "pattern": "GRT-{CATEGORY}-{SERIES}-{VARIANT}-{REVISION}",
  "segments": {
    "CATEGORY": { "length": 2, "values": ["WC", "UC", "SC", "HP"] },
    "SERIES": { "length": 4, "format": "numeric" },
    "VARIANT": { "length": 2, "format": "alphanumeric" },
    "REVISION": { "length": 2, "format": "numeric" }
  },
  "example": "GRT-SC-3000-A1-01"
}
```

### 2.4 knowledge_base 知识库表

新增字段用于支持知识分级访问控制：

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| access_level | ENUM | 认证等级 | public/certified/confidential |

**访问等级定义**：

| 等级 | 中文名称 | 访问条件 | 典型内容 |
|------|----------|----------|----------|
| public | 公开 | 无需认证 | 产品介绍、常见问题 |
| certified | 认证 | 需完成认证 | 技术手册、维护指南 |
| confidential | 机密 | 需特殊授权 | 核心工艺、专利技术 |

---

## 3. 分层授权机制

### 3.1 授权层级架构

```
┌─────────────────────────────────────────────────────────┐
│                    系统管理员                            │
│  (全部权限 + 系统配置 + 用户管理)                        │
├─────────────────────────────────────────────────────────┤
│                    主管级                                │
│  (任务分配 + 报销审批 + 团队管理 + 员工级权限)           │
├─────────────────────────────────────────────────────────┤
│                    员工级                                │
│  (出差计划 + 个人报销 + 服务执行 + 客户级权限)           │
├─────────────────────────────────────────────────────────┤
│                    客户级                                │
│  (所属设备知识库 + 自身服务报告 + 项目状态)              │
└─────────────────────────────────────────────────────────┘
```

### 3.2 客户级授权

**可访问资源**：
- knowledge_base：仅限 access_level = 'public' 或与所属设备关联的 'certified' 级别内容
- service_reports：仅限自身客户ID关联的服务报告
- project_status：仅限自身项目的状态查看

**权限检查逻辑**：
```typescript
interface CustomerAccessPolicy {
  knowledge_base: {
    filter: "access_level IN ('public') OR (access_level = 'certified' AND equipment_id IN customer_equipment_ids)"
  };
  service_reports: {
    filter: "customer_id = current_customer_id"
  };
  project_status: {
    filter: "customer_id = current_customer_id"
  };
}
```

### 3.3 员工级授权

**可访问资源**：
- travel_plans：可见自身及团队的出差计划
- expense_claims：可提交和查看自身报销申请
- service_tasks：可执行分配给自己的服务任务
- knowledge_base：可访问 'public' 和 'certified' 级别内容

**权限检查逻辑**：
```typescript
interface EmployeeAccessPolicy {
  travel_plans: {
    filter: "user_id = current_user_id OR team_id = current_team_id"
  };
  expense_claims: {
    filter: "submitter_id = current_user_id",
    actions: ["create", "read", "update"]
  };
  service_tasks: {
    filter: "assignee_id = current_user_id OR team_members CONTAINS current_user_id"
  };
}
```

### 3.4 主管级授权

**可访问资源**：
- task_assignment：可分配任务给下属员工
- expense_approval：可审批下属的报销申请
- team_management：可管理团队成员和排班
- knowledge_base：可访问所有级别内容（含 'confidential'）

**权限检查逻辑**：
```typescript
interface SupervisorAccessPolicy {
  task_assignment: {
    scope: "department_id = current_department_id",
    actions: ["create", "assign", "reassign", "cancel"]
  };
  expense_approval: {
    scope: "submitter.supervisor_id = current_user_id",
    actions: ["approve", "reject", "request_revision"]
  };
  team_management: {
    scope: "team_id IN supervised_team_ids",
    actions: ["view_schedule", "modify_schedule", "assign_training"]
  };
}
```

---

## 4. AI智能策略

### 4.1 AI答复器认证检查

**策略目标**：根据用户认证状态提供差异化的AI响应。

**认证状态检查流程**：

```
用户提问
    │
    ▼
检查 User.auth_status
    │
    ├── auth_status = 'unverified'
    │       │
    │       ▼
    │   触发"引导认证"流程
    │   返回：基础信息 + 认证引导
    │
    ├── auth_status = 'pending'
    │       │
    │       ▼
    │   返回：基础信息 + 认证进度提示
    │
    └── auth_status = 'verified'
            │
            ▼
        检查 knowledge_base.access_level
            │
            ├── 匹配 'public' → 返回公开内容
            ├── 匹配 'certified' → 返回技术方案
            └── 匹配 'confidential' → 检查特殊授权
```

**引导认证响应模板**：
```json
{
  "response_type": "auth_guidance",
  "message": "感谢您的咨询。为了提供更专业的技术支持，请先完成认证流程。",
  "basic_info": "根据您的描述，这可能涉及到设备清洗工艺参数调整...",
  "auth_steps": [
    "1. 登录客户门户",
    "2. 上传企业资质证明",
    "3. 等待审核（通常1-2个工作日）"
  ],
  "contact": "如需紧急支持，请联系：400-XXX-XXXX"
}
```

### 4.2 AI财务审计策略

**策略目标**：自动检测报销申请与出差计划的一致性，标记异常。

**审计规则**：

| 检查项 | 规则 | 异常阈值 |
|--------|------|----------|
| 时间一致性 | 报销日期在出差计划时间范围内 | 偏差>1天 |
| 地点一致性 | 报销地点与出差目的地匹配 | 距离>50km |
| 金额合理性 | 单日费用不超过标准的150% | 超标>50% |
| 票据完整性 | 必须附带有效票据 | 缺失>20% |

**异常率计算公式**：
```
异常率 = (异常项数量 / 总检查项数量) × 100%

若 异常率 > 20%：
  → 标记为"需人工核查"
  → 自动通知财务主管
  → 暂停自动审批流程
```

**审计结果数据结构**：
```json
{
  "audit_id": "uuid",
  "expense_claim_id": "uuid",
  "travel_plan_id": "uuid",
  "audit_timestamp": "2026-01-18T14:30:00Z",
  "checks": [
    {
      "type": "time_consistency",
      "status": "pass",
      "details": "报销日期在计划范围内"
    },
    {
      "type": "location_consistency",
      "status": "warning",
      "details": "报销地点距离目的地65km",
      "deviation": 65
    },
    {
      "type": "amount_reasonability",
      "status": "fail",
      "details": "单日住宿费超标80%",
      "deviation": 80
    }
  ],
  "anomaly_rate": 33.3,
  "recommendation": "manual_review",
  "reviewer_assigned": "supervisor_id"
}
```

---

## 5. 业务流闭环规范

### 5.1 服务报告闭环流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  服务结束    │────▶│  AI生成报告  │────▶│  主管审核    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  财务开票    │◀────│  客户H5确认  │◀────│  发送客户    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**状态机定义**：

| 状态 | 中文名称 | 触发条件 | 后续动作 |
|------|----------|----------|----------|
| service_completed | 服务完成 | 工程师提交完成 | 触发AI报告生成 |
| report_generated | 报告已生成 | AI生成完成 | 通知主管审核 |
| supervisor_approved | 主管已审核 | 主管点击批准 | 发送H5链接给客户 |
| customer_confirmed | 客户已确认 | 客户H5签字确认 | 触发财务开票 |
| invoice_issued | 发票已开具 | 财务完成开票 | 流程结束 |

**H5确认页面功能**：
- 服务报告在线预览
- 电子签名功能
- 服务评价（1-5星）
- 问题反馈入口
- 增值服务推荐

### 5.2 增值订单触发机制

**触发条件**：当 service_report 中出现以下关键词时自动触发：

| 关键词类别 | 关键词示例 | 触发动作 |
|------------|------------|----------|
| 更换建议 | "建议更换"、"需要更换"、"应更换" | 创建配件订单草稿 |
| 升级建议 | "建议升级"、"推荐升级" | 创建升级方案草稿 |
| 维保建议 | "建议签订维保"、"推荐年度维保" | 创建维保合同草稿 |

**触发流程**：

```
服务报告提交
    │
    ▼
AI关键词扫描
    │
    ├── 检测到"建议更换"
    │       │
    │       ▼
    │   提取相关配件信息
    │       │
    │       ▼
    │   创建 value_added_order 草稿
    │       │
    │       ▼
    │   触发客户代表确认邮件
    │
    └── 未检测到关键词
            │
            ▼
        正常流程结束
```

**value_added_order 草稿结构**：
```json
{
  "order_id": "VAO-2026-0118-001",
  "status": "draft",
  "source": {
    "service_report_id": "SR-2026-0118-001",
    "trigger_keyword": "建议更换",
    "context": "...滤芯已使用超过2000小时，建议更换以确保清洗效果..."
  },
  "items": [
    {
      "part_code": "GRT-SC-3000-F1-01",
      "part_name": "高效滤芯",
      "quantity": 2,
      "unit_price": 1500.00,
      "total": 3000.00
    }
  ],
  "customer": {
    "id": "customer_id",
    "name": "XX汽车零部件有限公司",
    "contact": "张经理",
    "email": "zhang@example.com"
  },
  "sales_rep": {
    "id": "sales_rep_id",
    "name": "李销售"
  },
  "created_at": "2026-01-18T15:00:00Z",
  "confirmation_email_sent": true
}
```

---

## 6. 交互界面要求

### 6.1 主管工作台

**功能需求**：

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| 地图展示 | 实时显示所有出差员工位置 | P0 |
| 任务状态 | 显示每个员工当前任务进度 | P0 |
| 快捷操作 | 任务分配、重新调度、紧急联系 | P1 |
| 统计面板 | 今日任务完成率、在途人员数 | P1 |
| 预警提示 | 超时任务、异常位置、紧急求助 | P0 |

**地图标记说明**：

| 标记颜色 | 状态 | 说明 |
|----------|------|------|
| 🟢 绿色 | 正常执行中 | 任务进行中，无异常 |
| 🟡 黄色 | 即将超时 | 距离计划完成时间<2小时 |
| 🔴 红色 | 已超时/异常 | 超时或位置异常 |
| 🔵 蓝色 | 已完成 | 今日任务已完成 |
| ⚪ 灰色 | 休息中 | 非工作时间 |

**界面布局**：
```
┌─────────────────────────────────────────────────────────┐
│  主管工作台                          [刷新] [设置]      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │                     │  │  今日统计               │  │
│  │                     │  │  ├─ 在途人员: 12       │  │
│  │      地图区域       │  │  ├─ 已完成: 8          │  │
│  │                     │  │  ├─ 进行中: 4          │  │
│  │                     │  │  └─ 完成率: 66.7%      │  │
│  │                     │  ├─────────────────────────┤  │
│  │                     │  │  预警列表               │  │
│  │                     │  │  ⚠️ 张工 - 任务超时    │  │
│  │                     │  │  ⚠️ 李工 - 位置异常    │  │
│  └─────────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  员工列表                                               │
│  ┌─────┬──────┬──────────┬────────┬─────────┬───────┐  │
│  │头像 │ 姓名 │ 当前任务 │ 状态   │ 位置    │ 操作  │  │
│  ├─────┼──────┼──────────┼────────┼─────────┼───────┤  │
│  │ 👤  │ 张工 │ 设备维护 │ 🟢进行中│ 上海浦东│ [详情]│  │
│  │ 👤  │ 李工 │ 安装调试 │ 🟡即将超│ 苏州工业│ [详情]│  │
│  └─────┴──────┴──────────┴────────┴─────────┴───────┘  │
└─────────────────────────────────────────────────────────┘
```

### 6.2 客户助理对话式界面

**功能需求**：

| 功能模块 | 描述 | 优先级 |
|----------|------|------|
| 对话界面 | 类似聊天的交互方式 | P0 |
| 照片上传 | 支持拍照或选择图片 | P0 |
| AI故障识别 | 基于图片的故障诊断 | P0 |
| 认证引导 | 未认证用户的认证流程 | P1 |
| 历史记录 | 对话历史和诊断记录 | P1 |

**对话流程示例**：

```
┌─────────────────────────────────────────────────────────┐
│  GRT智能助理                                    [≡]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🤖 您好！我是GRT智能助理，请问有什么可以帮您？        │
│                                                         │
│                          您好，我的清洗机出现异常 👤    │
│                                                         │
│  🤖 了解，请问是哪种类型的异常？                       │
│     1. 清洗效果不佳                                     │
│     2. 设备运行异常                                     │
│     3. 显示报警代码                                     │
│     4. 其他问题                                         │
│                                                         │
│                              显示报警代码 E-023 👤      │
│                                                         │
│  🤖 E-023 通常表示温度传感器异常。                     │
│     为了更准确诊断，请上传设备面板照片。               │
│                                                         │
│                              [📷 上传照片]              │
│                              [已上传: panel.jpg] 👤     │
│                                                         │
│  🤖 [AI分析中...]                                      │
│     根据照片分析，确认为温度传感器故障。               │
│     建议解决方案：                                      │
│     1. 检查传感器连接线                                │
│     2. 清洁传感器探头                                  │
│     3. 如问题持续，建议更换传感器                      │
│                                                         │
│     💡 需要预约工程师上门服务吗？                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [📷] [📎]  输入消息...                        [发送]  │
└─────────────────────────────────────────────────────────┘
```

**AI故障识别能力**：

| 识别类型 | 输入 | 输出 | 准确率目标 |
|----------|------|------|------------|
| 报警代码 | 面板照片 | 故障原因+解决方案 | >95% |
| 部件损坏 | 部件照片 | 损坏程度+更换建议 | >85% |
| 清洗效果 | 工件照片 | 清洁度评估+优化建议 | >80% |
| 设备状态 | 整机照片 | 维护建议+预警提示 | >75% |

---

## 7. 技术实现方案

### 7.1 数据库变更

**新增/修改表**：

```sql
-- service_tasks 表扩展
ALTER TABLE service_tasks 
ADD COLUMN supervisor_id VARCHAR(36) REFERENCES users(id),
ADD COLUMN team_members JSON,
ADD COLUMN customer_confirmation_status ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending';

-- travel_records 表扩展
ALTER TABLE travel_records
ADD COLUMN clock_in_geo JSON,
ADD COLUMN commute_arrangements JSON,
ADD COLUMN expense_claims VARCHAR(36) REFERENCES expense_claims(id);

-- parts_catalog 表扩展
ALTER TABLE parts_catalog
ADD COLUMN client_tier_prices JSON,
ADD COLUMN part_code_rules JSON;

-- knowledge_base 表扩展
ALTER TABLE knowledge_base
ADD COLUMN access_level ENUM('public', 'certified', 'confidential') DEFAULT 'public';

-- 新增 value_added_orders 表
CREATE TABLE value_added_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  status ENUM('draft', 'pending_confirmation', 'confirmed', 'cancelled') DEFAULT 'draft',
  source_report_id VARCHAR(36) REFERENCES service_reports(id),
  trigger_keyword VARCHAR(100),
  trigger_context TEXT,
  items JSON,
  customer_id VARCHAR(36) REFERENCES customers(id),
  sales_rep_id VARCHAR(36) REFERENCES users(id),
  total_amount DECIMAL(10,2),
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 新增 ai_audit_logs 表
CREATE TABLE ai_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  audit_type ENUM('expense', 'report', 'order') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  checks JSON,
  anomaly_rate DECIMAL(5,2),
  recommendation ENUM('auto_approve', 'manual_review', 'reject') NOT NULL,
  reviewer_id VARCHAR(36) REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7.2 API端点设计

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| /api/supervisor/dashboard | GET | 获取主管工作台数据 | supervisor |
| /api/supervisor/employees/locations | GET | 获取员工位置列表 | supervisor |
| /api/supervisor/tasks/assign | POST | 分配任务 | supervisor |
| /api/customer/assistant/chat | POST | 客户助理对话 | customer |
| /api/customer/assistant/upload | POST | 上传故障图片 | customer |
| /api/ai/audit/expense | POST | AI报销审计 | system |
| /api/ai/report/generate | POST | AI生成服务报告 | system |
| /api/workflow/report/confirm | POST | 客户确认服务报告 | customer |

### 7.3 前端组件

| 组件名称 | 路径 | 功能 |
|----------|------|------|
| SupervisorDashboard | /supervisor | 主管工作台主页面 |
| EmployeeMapView | /supervisor/map | 员工地图视图 |
| TaskAssignmentDialog | - | 任务分配对话框 |
| CustomerAssistant | /customer/assistant | 客户助理界面 |
| ChatInterface | - | 对话式交互组件 |
| FaultImageUploader | - | 故障图片上传组件 |
| ServiceReportConfirm | /confirm/:reportId | H5确认页面 |

---

## 8. 风险评估

| 风险项 | 影响程度 | 发生概率 | 缓解措施 |
|--------|----------|----------|----------|
| 地理位置隐私 | 高 | 中 | 明确告知用户、提供关闭选项 |
| AI审计误判 | 中 | 中 | 设置人工复核机制、持续优化模型 |
| 数据迁移风险 | 中 | 低 | 分阶段迁移、完整备份 |
| 性能影响 | 中 | 低 | 异步处理、缓存优化 |

---

## 9. 实施计划

| 阶段 | 内容 | 工期 | 交付物 |
|------|------|------|--------|
| 阶段1 | Collections结构扩充 | 1天 | 数据库迁移脚本 |
| 阶段2 | 分层授权机制 | 1天 | 授权中间件 |
| 阶段3 | AI智能策略 | 1天 | AI策略服务 |
| 阶段4 | 业务流闭环 | 1天 | 工作流引擎 |
| 阶段5 | 主管工作台 | 1天 | 前端页面 |
| 阶段6 | 客户助理界面 | 1天 | 前端页面 |
| 阶段7 | 测试与文档 | 1天 | 测试报告、文档 |

---

## 10. 评审记录

| 评审项 | 状态 | 评审人 | 日期 |
|--------|------|--------|------|
| 技术方案 | ✅ 通过 | 技术负责人 | 2026-01-18 |
| 安全评估 | ✅ 通过 | 安全负责人 | 2026-01-18 |
| 业务逻辑 | ✅ 通过 | 业务负责人 | 2026-01-18 |

---

**批准签字**：技术负责人  
**批准日期**：2026-01-18
