# GRT智能系统 Gemini辅助模块实现计划 v4.7.0

**版本**: v4.7.0  
**日期**: 2026年1月31日  
**作者**: Manus AI  

---

## 1. 概述

本文档详细描述了基于Gemini辅助生成的5大功能模块的实现计划，这些模块将适配现有的Drizzle ORM + tRPC + React架构，扩展GRT智能系统的能力边界。

### 1.1 模块总览

| 模块编号 | 模块名称 | 中文名称 | 数据库表数 | 核心功能 |
|----------|----------|----------|------------|----------|
| M1 | Social Community | 社群管理与AI助手 | 5 | 微信群消息监听、AI回复草拟、人工审核发布 |
| M2 | Liquid Workforce | 液态用工与技能原子化 | 3 | 技能胶囊、任务竞标、智能合约支付 |
| M3 | Autonomous Sales | 自主销售与AI-to-AI交互 | 2 | AI谈判会话、零知识证明验证 |
| M4 | Stage Gate | 门径管理与生产拉动 | 2 | M3-M12门禁检查、JIT/JIS拉动信号 |
| M5 | Personal Agent | 个人智能体与YDW映射 | 2 | 行为探针、过程笔记、技能推断 |

**总计**: 14个新数据库表、5个tRPC路由模块、9个前端页面、5份指导书

---

## 2. 模块详细设计

### 2.1 模块1: 社群管理与AI助手系统 (Social Community Management)

#### 2.1.1 架构流程

```
外部客户/群成员 ←→ 微信技术交流群
        ↓
    Social Bridge (监听/转发)
        ↓
    脱敏代理 & 安全过滤 (已有模块集成)
        ↓
    社群管理模块 (NocoBase/GRT)
        ↓
    社群AI助手 (Gemini LLM)
        ↓
    待审核回复池
        ↓
    GRT技术专家/管理员 (人工审核)
        ↓
    发布队列 → Social Bridge → 微信群
```

#### 2.1.2 数据库表设计

| 表名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **social_groups** | id | bigint | 主键 |
| | group_wx_id | varchar(100) | 微信群ID |
| | name | varchar(200) | 群名称 |
| | type | enum | 群类型: technical/sales/support |
| | member_count | int | 成员数量 |
| | status | enum | 状态: active/archived |
| | created_at | datetime | 创建时间 |
| **social_messages** | id | bigint | 主键 |
| | group_id | bigint | 关联群组 |
| | sender_wx_id | varchar(100) | 发送者微信ID |
| | sender_name | varchar(100) | 发送者昵称 |
| | content | text | 消息内容 |
| | content_type | enum | 类型: text/image/file |
| | is_sensitive | boolean | 是否包含敏感信息 |
| | deidentified_content | text | 脱敏后内容 |
| | received_at | datetime | 接收时间 |
| **social_members** | id | bigint | 主键 |
| | group_id | bigint | 关联群组 |
| | wx_id | varchar(100) | 微信ID |
| | nickname | varchar(100) | 昵称 |
| | customer_id | bigint | 关联客户ID(可选) |
| | role | enum | 角色: member/admin/expert |
| | joined_at | datetime | 加入时间 |
| **ai_draft_replies** | id | bigint | 主键 |
| | message_id | bigint | 关联原消息 |
| | draft_content | text | AI草拟内容 |
| | confidence_score | decimal | 置信度评分 |
| | review_status | enum | 审核状态: pending/approved/rejected/modified |
| | reviewer_id | bigint | 审核人ID |
| | final_content | text | 最终发布内容 |
| | reviewed_at | datetime | 审核时间 |
| **publish_queue** | id | bigint | 主键 |
| | draft_id | bigint | 关联草稿 |
| | target_group_id | bigint | 目标群组 |
| | scheduled_at | datetime | 计划发送时间 |
| | sent_at | datetime | 实际发送时间 |
| | status | enum | 状态: queued/sent/failed |
| | error_message | text | 错误信息 |

#### 2.1.3 核心功能点

1. **消息接收与脱敏**: 集成现有的AI脱敏代理层，自动过滤敏感信息
2. **AI回复草拟**: 调用Gemini LLM生成回复建议，附带置信度评分
3. **人工审核流程**: 技术专家审核、修改或拒绝AI草稿
4. **定时发布**: 支持即时发送和定时发送队列

---

### 2.2 模块2: 液态用工与技能原子化 (Liquid Workforce)

#### 2.2.1 核心概念

**技能胶囊 (Skill Capsules)**: 将个人技能原子化、标准化，通过DID身份绑定和ZKP零知识证明实现技能的可验证、可交易。

#### 2.2.2 数据库表设计

| 表名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **skill_capsules** | id | bigint | 主键 |
| | skill_id | varchar(50) | 技能唯一标识 |
| | name | varchar(200) | 技能名称 (如: "高压喷嘴流体仿真 Level 5") |
| | owner_did | varchar(200) | 所有者DID身份 |
| | validation_proof | text | ZKP能力证明哈希 |
| | royalty_rate | decimal(5,2) | 技能版税率 (%) |
| | usage_count | int | 被调用次数 |
| | level | int | 技能等级 (1-5) |
| | domain | enum | 技能域: T/S/D/C/K/L |
| | created_at | datetime | 创建时间 |
| **task_bids** | id | bigint | 主键 |
| | task_id | bigint | 关联任务 |
| | bidder_agent_id | varchar(100) | 竞标Agent ID |
| | bid_price | decimal(12,2) | 报价金额 |
| | promised_sla | json | 承诺SLA (交付时间、质量标准) |
| | credit_score_snapshot | decimal(5,2) | 竞标时信誉分 |
| | ai_judge_score | decimal(5,2) | Gemini裁决预评估分 |
| | status | enum | 状态: pending/accepted/rejected |
| | created_at | datetime | 竞标时间 |
| **smart_contracts** | id | bigint | 主键 |
| | contract_address | varchar(100) | 链上合约地址 |
| | task_bid_id | bigint | 关联竞标 |
| | payment_type | enum | 支付类型: e-CNY/USDT/G-Token |
| | amount | decimal(18,4) | 合约金额 |
| | trigger_condition | json | 触发条件 (如: {"quality_score": ">90"}) |
| | execution_status | enum | 状态: locked/released/disputed |
| | created_at | datetime | 创建时间 |
| | executed_at | datetime | 执行时间 |

#### 2.2.3 核心功能点

1. **技能胶囊管理**: 创建、验证、交易技能胶囊
2. **任务竞标**: 发布任务、Agent自动竞标、AI评估排名
3. **智能合约**: 条件触发支付、争议处理机制

---

### 2.3 模块3: 自主销售与AI-to-AI交互 (Autonomous Sales)

#### 2.3.1 核心概念

**AI-to-AI谈判**: 实现GRT销售AI与客户采购AI之间的自动化谈判，包含多轮报价、情绪分析、ZOPA区间计算。

#### 2.3.2 数据库表设计

| 表名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **negotiation_sessions** | id | bigint | 主键 |
| | session_id | varchar(50) | 会话唯一标识 |
| | client_agent_id | varchar(100) | 客户采购AI ID |
| | opportunity_id | bigint | 关联商机 |
| | current_round | int | 当前谈判轮次 |
| | our_offer_price | decimal(12,2) | 我方报价 |
| | client_counter_offer | decimal(12,2) | 客户还价 |
| | sentiment_analysis | json | 客户情绪分析结果 |
| | zopa_range | json | 协议达成区间 [底价, 目标价] |
| | status | enum | 状态: negotiating/deal_reached/walk_away |
| | created_at | datetime | 创建时间 |
| | updated_at | datetime | 更新时间 |
| **zkp_registry** | id | bigint | 主键 |
| | proof_id | varchar(50) | 证明唯一标识 |
| | proof_type | enum | 类型: capacity/compliance/green_energy |
| | entity_id | bigint | 关联实体ID |
| | public_inputs | json | 公开输入 (如VDA标准范围) |
| | proof_hash | varchar(200) | 生成的ZK Proof哈希 |
| | verified_by_client | boolean | 客户是否验证通过 |
| | created_at | datetime | 创建时间 |
| | verified_at | datetime | 验证时间 |

#### 2.3.3 核心功能点

1. **谈判会话管理**: 多轮谈判记录、报价历史、情绪分析
2. **ZOPA计算**: 自动计算协议达成区间，指导谈判策略
3. **ZKP证明**: 生成和验证能力证明、合规证明、绿色能源证明

---

### 2.4 模块4: 门径管理与生产拉动 (Stage Gate)

#### 2.4.1 核心概念

**门径管理**: M3-M12阶段的门禁检查，支持一票否决权和自动验证（ERP/PLM集成）。

**生产拉动**: JIT/JIS模式的生产拉动信号，上游节点触发下游设备指令。

#### 2.4.2 数据库表设计

| 表名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **gate_checklists** | id | bigint | 主键 |
| | project_id | bigint | 关联项目 |
| | gate_stage | enum | 门径阶段: M3/M4/M5/M7/M12 |
| | check_item | varchar(200) | 检查项 (如: "模具PO已下达") |
| | is_mandatory | boolean | 是否拥有一票否决权 |
| | auto_verify_source | varchar(100) | 自动验证源: ERP_PO_Table/PLM_Drawing_Status |
| | status | enum | 状态: pending/pass/fail |
| | verified_by | bigint | 验证人ID |
| | verified_at | datetime | 验证时间 |
| | notes | text | 备注 |
| **production_pull_signals** | id | bigint | 主键 |
| | signal_id | varchar(50) | 信号唯一标识 |
| | project_id | bigint | 关联项目 |
| | upstream_gate | varchar(20) | 上游节点 (如: M7) |
| | trigger_event | varchar(200) | 触发事件 (如: 上汽JIS订单到达) |
| | target_aas_id | varchar(100) | 目标设备Active AAS ID |
| | action_payload | json | 发送给设备的指令 |
| | status | enum | 状态: pending/sent/acknowledged/completed |
| | triggered_at | datetime | 触发时间 |
| | completed_at | datetime | 完成时间 |

#### 2.4.3 核心功能点

1. **门径检查清单**: 按阶段分组、自动/手动验证、一票否决标记
2. **生产拉动信号**: 信号监控、触发历史、设备状态追踪
3. **与现有项目管理集成**: 深度集成M0-M12项目阶段

---

### 2.5 模块5: 个人智能体与YDW数据映射 (Personal Agent)

#### 2.5.1 核心概念

**行为探针**: 采集用户在IDE、CAD等工具中的行为数据，AI自动推断技能标签。

**过程笔记**: 记录项目过程中的问题-解决方案对，AI提取结构化知识。

#### 2.5.2 数据库表设计

| 表名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| **behavior_logs** | id | bigint | 主键 |
| | user_did | varchar(200) | 用户DID身份 |
| | user_id | bigint | 关联用户ID |
| | context | varchar(100) | 上下文: IDE_Code_Commit/CAD_Save等 |
| | action_data | json | 具体操作数据 |
| | implied_skill | varchar(200) | AI推断的技能标签 |
| | confidence | decimal(5,2) | 推断置信度 |
| | timestamp | datetime | 时间戳 |
| **process_notes** | id | bigint | 主键 |
| | note_id | varchar(50) | 笔记唯一标识 |
| | user_id | bigint | 创建者ID |
| | project_id | bigint | 关联项目 |
| | project_phase | varchar(20) | 项目阶段 |
| | problem_desc | text | 问题描述 |
| | solution_desc | text | 解决方案描述 |
| | ai_extracted_knowledge | json | AI提取的结构化知识 |
| | tags | json | 标签列表 |
| | created_at | datetime | 创建时间 |
| | updated_at | datetime | 更新时间 |

#### 2.5.3 核心功能点

1. **行为日志分析**: 技能画像、行为轨迹、能力成长曲线
2. **过程笔记管理**: 知识库、问题-方案检索、AI知识图谱
3. **与技能胶囊关联**: 行为数据→技能证明的自动转化

---

## 3. 实现优先级

基于业务价值和技术依赖关系，建议按以下优先级实现：

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | 门径管理 (M4) | 与现有项目管理深度集成，立即可用 |
| P1 | 个人智能体 (M5) | 支撑能力OS核心理念，数据基础 |
| P1 | 液态用工 (M2) | 技能胶囊是能力系统的核心 |
| P2 | AI销售 (M3) | 创新功能，需要更多业务验证 |
| P2 | 社群管理 (M1) | 需要外部集成（微信Bridge） |

---

## 4. 左侧导航栏更新计划

新增5个一级菜单项：

| 菜单名称 | 图标 | 路由 | 权限 |
|----------|------|------|------|
| 社群管理 | MessageSquare | /social-community | admin |
| 技能市场 | Sparkles | /skill-market | all |
| AI销售 | Bot | /ai-sales | admin |
| 门径管理 | CheckSquare | /stage-gate | all |
| 个人智能体 | User | /personal-agent | all |

---

## 5. 指导书目录

每个模块将创建对应的指导书文档：

1. `docs/guides/social-community-guide.md` - 社群管理使用指南
2. `docs/guides/liquid-workforce-guide.md` - 液态用工与技能市场指南
3. `docs/guides/autonomous-sales-guide.md` - AI销售与谈判指南
4. `docs/guides/stage-gate-guide.md` - 门径管理操作手册
5. `docs/guides/personal-agent-guide.md` - 个人智能体使用指南

---

## 6. 技术架构适配

### 6.1 后端架构 (Drizzle ORM + tRPC)

```
server/
├── modules/
│   ├── socialCommunity/
│   │   ├── socialCommunity.schema.ts  # Drizzle表定义
│   │   ├── socialCommunity.service.ts # 业务逻辑
│   │   └── socialCommunity.router.ts  # tRPC路由
│   ├── liquidWorkforce/
│   ├── autonomousSales/
│   ├── stageGate/
│   └── personalAgent/
```

### 6.2 前端架构 (React + tRPC Client)

```
client/src/pages/
├── SocialCommunity/
│   ├── index.tsx
│   ├── MessageList.tsx
│   ├── DraftReview.tsx
│   └── PublishQueue.tsx
├── SkillMarket/
├── AISales/
├── StageGate/
└── PersonalAgent/
```

---

## 7. 下一步行动

1. **创建数据库Schema** - 在drizzle/schema.ts中添加14个新表
2. **实现tRPC路由** - 按优先级顺序实现5个模块的API
3. **开发前端页面** - 创建9个新页面并集成到路由
4. **更新导航栏** - 在DashboardLayout中添加5个新菜单
5. **编写指导书** - 为每个模块创建详细的使用文档
6. **编写测试** - 为每个模块编写单元测试和集成测试

---

**文档版本历史**

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v4.7.0 | 2026-01-31 | 初始版本，基于Gemini辅助代码分析 |
