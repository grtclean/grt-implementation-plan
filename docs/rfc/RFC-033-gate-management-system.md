# RFC-033: GRT门径管理体系（Gate Management System）

**版本**: v2.6.4  
**状态**: 已批准  
**创建日期**: 2026-01-18  
**作者**: Manus AI

---

## 1. 执行摘要

本RFC基于《GRT公司战略运营框架：基于门径管理（Gate）的全生命周期流程统筹与数字化实施报告》研究文档，定义GRT智能系统的完整门径管理体系。该体系采用"双螺旋"架构，同时管理人力资本价值流（HC-Stream，H1-H4门径）和项目生产价值流（PP-Stream，M0-M12门径），实现从面试到绩效、从订单到交付的全链路可控。

门径管理的核心哲学在于：每一个Gate都是一道"质量防火墙"，具有否决权的决策机制，确保只有成熟的、符合战略要求的信息流和实物流才能进入下一个高成本阶段。

---

## 2. 业务背景与战略目标

### 2.1 GRT的ETO业务特性

GRT公司作为工程橡胶制造与IT解决方案的综合性实体，其核心运营模式属于按单设计（Engineer-to-Order, ETO）。在ETO模式下，客户的一个"新订单"不仅仅是发货指令，而是一个微型的研发项目，需要经过设计、确认、原材料采购、模具开发、试产等一系列复杂过程。

### 2.2 双流治理挑战

GRT面临两个最基本的运营场景：

| 价值流 | 起点 | 终点 | 核心数据 |
|--------|------|------|----------|
| 人力资本价值流（HC-Stream） | 面试 | 绩效（KPI） | 能力标签 |
| 项目生产价值流（PP-Stream） | 客户订单 | 项目交付 | BOM与项目号 |

### 2.3 战略目标

通过引入工业界标准的M系列里程碑（M0-M12）和人力资本门径（H1-H4），实现：

1. **流程起点控制**：严格的门径管理体系，防止不可控的成本消耗或质量风险
2. **全过程可追溯**：从销售承诺到生产交付零偏差
3. **数据驱动决策**：基于结构化数据的科学治理

---

## 3. M0-M12里程碑门径体系

### 3.1 阶段划分

M0-M12里程碑门径体系分为四个主要阶段：

| 阶段 | 门径范围 | 核心活动 | 系统工具 |
|------|----------|----------|----------|
| Phase I: 订单接入 | M0-M2 | 战略筛选、报价、订单确认 | CRM → ERP |
| Phase II: 工程设计 | M3-M6 | 项目启动、系统设计、详细设计、原型验证 | PLM |
| Phase III: 工业化 | M7-M9 | 工业化准备、过程验证、量产就绪 | ERP → MES |
| Phase IV: 执行交付 | M10-M12 | 量产启动、爬坡稳定、项目关闭 | MES |

### 3.2 门径详细定义

#### M0: 战略筛选（Strategic Screening）

| 属性 | 内容 |
|------|------|
| **关键输入** | 市场趋势报告、客户意向书 |
| **核心活动** | 战略匹配度分析、宏观资源评估 |
| **关键输出** | 构想书（Concept Paper） |
| **否决标准** | 不符合公司长期战略方向 |

#### M1: 报价启动（Quotation Initiation）

| 属性 | 内容 |
|------|------|
| **关键输入** | 客户RFQ、技术粗略方案 |
| **核心活动** | 跨部门成本估算（销售+工程+采购） |
| **关键输出** | 初步报价单（Quotation） |
| **否决标准** | 预估利润率低于公司红线 |

#### M2: 订单确认（Order Confirmation）

| 属性 | 内容 |
|------|------|
| **关键输入** | 客户PO（扫描件）、合同草案 |
| **核心活动** | 合同评审、信用检查、项目号创建 |
| **关键输出** | 签署的合同、ERP项目立项 |
| **否决标准** | 客户信用评级不达标或合同条款有无法接受的法律风险 |

#### M3: 项目启动（Program Launch）

| 属性 | 内容 |
|------|------|
| **关键输入** | 项目章程、核心团队名单 |
| **核心活动** | 召开启动会、锁定L1计划、风险登记 |
| **关键输出** | 冻结的需求规范（SRS）、项目计划书 |
| **否决标准** | 核心资源（人/资金）无法到位 |
| **检查清单** | 项目章程已签署、客户需求已转化为内部技术规范、预算已下达 |

#### M4: 系统设计（System Design / PDR）

| 属性 | 内容 |
|------|------|
| **关键输入** | 需求规范、类似项目经验 |
| **核心活动** | 架构设计、关键物料选型、采购长周期件 |
| **关键输出** | 初步设计评审报告（PDR）、初步BOM |
| **否决标准** | 关键技术路径存在未解决的重大缺陷 |

#### M5: 详细设计（Detailed Design / CDR）

| 属性 | 内容 |
|------|------|
| **关键输入** | 3D模型、电路图、软件代码 |
| **核心活动** | 详细设计评审（CDR）、模具开模指令 |
| **关键输出** | 冻结的BOM、发布的图纸、模具PO |
| **否决标准** | 设计未完成验证，或成本超支且无补救方案 |
| **重要说明** | M5是"硬模具"节点，一旦通过，修改设计的成本将成倍增加 |

#### M6: 原型验证（Prototype / DVP&R）

| 属性 | 内容 |
|------|------|
| **关键输入** | 样件/样机、测试计划 |
| **核心活动** | 原型制造、实验室测试（DVP） |
| **关键输出** | 验证报告（DVP&R）、初始PFMEA |
| **否决标准** | 原型机性能不满足客户M2合同指标 |

#### M7: 工业化准备（Industrialization）

| 属性 | 内容 |
|------|------|
| **关键输入** | 工装夹具图、SOP草案 |
| **核心活动** | 生产线搭建、供应商PPAP、人员培训 |
| **关键输出** | 试产准备就绪检查表 |
| **否决标准** | 供应链（物料）未就绪或产线存在安全隐患 |

#### M8: 过程验证（Process Validation / Pilot Run）

| 属性 | 内容 |
|------|------|
| **关键输入** | 试产物料、控制计划 |
| **核心活动** | 试生产（Pilot Run）、全尺寸测量、Cpk分析 |
| **关键输出** | 过程审核报告、首件报告（FAI） |
| **否决标准** | 过程能力不足（Cpk < 1.33）、良率过低 |

#### M9: 量产签发（Launch Readiness）

| 属性 | 内容 |
|------|------|
| **关键输入** | 试产合格品、包装规范 |
| **核心活动** | 产能确认、销售发货培训、最终审核 |
| **关键输出** | 量产批准书（PSW/SOP）、发货计划 |
| **否决标准** | 仍有未关闭的质量红线问题 |

#### M10: 量产启动（Start of Production）

| 属性 | 内容 |
|------|------|
| **关键输入** | 正式订单、物流计划 |
| **核心活动** | 批量生产监控、早期爬坡支持 |
| **关键输出** | 每日产量报表、发货单 |
| **否决标准** | 发生重大停线事故或客户退货 |

#### M11: 爬坡稳定（Ramp-up Stabilization）

| 属性 | 内容 |
|------|------|
| **关键输入** | 质量数据、效率数据 |
| **核心活动** | 瓶颈工序优化、节拍提升 |
| **关键输出** | 产能达标报告 |
| **否决标准** | 持续无法达到设计产能 |

#### M12: 项目关闭（Project Close）

| 属性 | 内容 |
|------|------|
| **关键输入** | 财务报表、客户反馈 |
| **核心活动** | 成本决算、团队解散、经验总结 |
| **关键输出** | 项目结项报告、知识库条目 |
| **否决标准** | 仍有未结清的财务款项或法律纠纷 |

---

## 4. H1-H4人力资本门径体系

### 4.1 核心理念

面试不是终点，而是KPI设定的起点。岗位职责（JD）不仅是招聘广告，更是未来的考核标准。

### 4.2 门径详细定义

#### H1: 岗位定义结构化（JD as Data）

| 属性 | 内容 |
|------|------|
| **输入** | 业务部门的战略目标、预算审批 |
| **关键动作** | AI分析历史高绩效员工的行为数据，建议该岗位的核心职责权重 |
| **输出** | 结构化的JD数据包（包含权重化的技能标签） |
| **决策点** | 该岗位是否具备明确的可量化产出？如果JD模糊不清，Gate H1不予通过 |

#### H2: 面试数据结构化采集（ATS Phase）

| 属性 | 内容 |
|------|------|
| **系统配置** | 面试评价表必须与Gate H1定义的"关键能力模型"一一对应 |
| **数据采集** | 面试官必须对每个能力维度进行打分，并记录"待发展项"（Development Needs） |
| **决策依据** | 候选人的能力雷达图与岗位模型的匹配度 |
| **风险控制** | 背景调查必须作为硬性条件 |
| **输出** | 带有"能力Gap标签"的录用通知（Offer） |

#### H3: 入职扫描与数字化握手（HRIS Input）

| 属性 | 内容 |
|------|------|
| **场景** | 新员工报到当天，证件、学历证书、资质证明的审核 |
| **智能扫描** | OCR技术自动提取姓名、证件号、有效期等信息 |
| **数据迁移** | ATS中积累的"能力Gap标签"和"岗位职责数据"无损传输到HRIS系统 |
| **合规性Gate** | 系统自动校验扫描件的真实性，如果证件过期或伪造，系统直接锁定流程 |

#### H4: 基于面试数据的KPI自动生成

| 属性 | 内容 |
|------|------|
| **输入1（岗位职责）** | 来自Gate H1的JD数据 |
| **输入2（能力短板）** | 来自Gate H2的面试评价"Gap标签" |
| **处理引擎** | 绩效管理系统调用AI引擎或规则库 |
| **输出** | 系统自动为新员工生成第一份绩效合约（Performance Contract） |

### 4.3 KPI自动生成示例

| 面试维度 | 面试评价 | ATS→HRIS映射标签 | 推荐试用期KPI | 权重 |
|----------|----------|------------------|---------------|------|
| 专业技能 | 5/5 - 卓越 | Skill_Python_Expert | 担任部门内部数据分析讲师 | 10% |
| 项目管理 | 2/5 - 较弱 | Gap_Agile_Weak | 30天内获得Scrum Master基础认证 | 20% |
| 沟通协作 | 3/5 - 一般 | Trait_Introvert_Logical | 跨部门协作满意度评分≥4.0 | 15% |
| 岗位核心职责 | N/A | Role_Std_Deliverable | 按时完成分配的代码模块 | 55% |

---

## 5. 双螺旋流程架构

### 5.1 系统集成视图

```
左螺旋（人）：ATS → HRIS → LMS → PMS
                ↓        ↓       ↓
              能力标签  培训记录  绩效评分
                        ↓
                    M-Gate交汇点
                        ↓
              BOM与项目号  生产数据  交付记录
                ↓        ↓       ↓
右螺旋（事）：CRM → PLM → ERP → MES
```

### 5.2 M-Gate交汇点

两条价值流在M-Gate处交汇：

1. **项目（事）的M3阶段**需要指派项目经理（人），此时系统应自动检查该员工的KPI（人）是否包含"项目管理认证"
2. **项目（事）的M12结算数据**，直接成为项目成员年度绩效（人）的评分依据

---

## 6. 流程模型选项

### 6.1 敏捷型门径（Agile Gate Model）

| 属性 | 内容 |
|------|------|
| **适用对象** | GRT IT Solutions（软件开发业务） |
| **特点** | 合并M4-M6为若干个Sprint；文档要求轻量化；管理层仅在M3和M9介入 |
| **优势** | 响应速度快，适应需求变更 |
| **劣势** | 过程文档可能缺失，大型项目风险难以把控 |

### 6.2 V模型严控门径（V-Model Rigorous Gate）

| 属性 | 内容 |
|------|------|
| **适用对象** | GRT Rubber Technologies（涉及安全件、高模具投入的制造业） |
| **特点** | 严格执行M0-M12所有节点；M5和M9必须召开指导委员会；"红灯项"具有绝对否决权 |
| **优势** | 质量风险最低，可追溯性最强 |
| **劣势** | 流程长，管理成本高 |

### 6.3 混合ETO模型（Hybrid ETO Model）—— 推荐采用

| 属性 | 内容 |
|------|------|
| **适用对象** | 跨部门的复杂交付项目 |
| **主门径（Hard Gates）** | M3（启动）、M7（投入）、M12（结算）由高管审批 |
| **子门径（Checkpoints）** | M4、M5、M6等由项目经理负责，系统自动根据KPI和交付物状态进行"红绿灯"预警 |
| **数字化驱动** | 利用CRM扫描件作为唯一真理来源（Single Source of Truth） |

---

## 7. 类似简道云的流程固化功能

### 7.1 核心功能模块

| 模块 | 功能描述 | 实现方式 |
|------|----------|----------|
| **WorkflowEngine** | 工作流引擎，支持流程定义、实例化、状态流转 | 基于状态机模式 |
| **FormBuilder** | 表单构建器，支持拖拽式表单设计 | JSON Schema驱动 |
| **ApprovalFlow** | 审批流程，支持多级审批、会签、或签 | 规则引擎 |
| **DataCollection** | 数据采集，支持OCR、扫码、API导入 | IDP集成 |
| **ProcessVisualization** | 流程可视化，甘特图、看板、驾驶舱 | 图表组件 |

### 7.2 门径状态看板（驾驶舱）

CEO需要一个"驾驶舱"来监控全过程：

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| 🟢 绿色 | 按时，预算内 | 所有检查项通过 |
| 🟡 黄色 | 风险可控，需关注 | 存在未关闭的黄灯项 |
| 🔴 红色 | 逾期或超支 | 存在红灯项，需Steering Committee介入 |

---

## 8. 数据库Schema设计

### 8.1 M0-M12里程碑门径表

```sql
-- 门径定义表
CREATE TABLE milestone_gates (
  id VARCHAR(36) PRIMARY KEY,
  gate_code VARCHAR(10) NOT NULL,  -- M0, M1, M2...M12
  gate_name VARCHAR(100) NOT NULL,
  gate_name_en VARCHAR(100),
  phase VARCHAR(50) NOT NULL,  -- order_intake, engineering, industrialization, execution
  sequence_order INT NOT NULL,
  description TEXT,
  key_inputs JSON,
  core_activities JSON,
  key_outputs JSON,
  kill_criteria JSON,
  approval_level ENUM('project_manager', 'department_head', 'steering_committee') DEFAULT 'project_manager',
  is_hard_gate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 门径检查项表
CREATE TABLE gate_check_items (
  id VARCHAR(36) PRIMARY KEY,
  gate_id VARCHAR(36) NOT NULL,
  check_item_code VARCHAR(20) NOT NULL,
  check_item_name VARCHAR(200) NOT NULL,
  check_item_type ENUM('mandatory', 'optional', 'conditional') DEFAULT 'mandatory',
  verification_method TEXT,
  responsible_role VARCHAR(50),
  sequence_order INT,
  FOREIGN KEY (gate_id) REFERENCES milestone_gates(id)
);

-- 项目门径状态表
CREATE TABLE project_gate_status (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  gate_id VARCHAR(36) NOT NULL,
  status ENUM('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'on_hold') DEFAULT 'not_started',
  planned_date DATE,
  actual_date DATE,
  reviewer_id VARCHAR(36),
  review_notes TEXT,
  traffic_light ENUM('green', 'yellow', 'red') DEFAULT 'green',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gate_id) REFERENCES milestone_gates(id)
);

-- 门径评审记录表
CREATE TABLE gate_reviews (
  id VARCHAR(36) PRIMARY KEY,
  project_gate_status_id VARCHAR(36) NOT NULL,
  review_type ENUM('self_check', 'peer_review', 'management_review', 'steering_committee') NOT NULL,
  review_date TIMESTAMP NOT NULL,
  reviewer_id VARCHAR(36) NOT NULL,
  decision ENUM('approved', 'approved_with_conditions', 'rejected', 'deferred') NOT NULL,
  conditions JSON,
  comments TEXT,
  attachments JSON,
  FOREIGN KEY (project_gate_status_id) REFERENCES project_gate_status(id)
);

-- 门径检查项完成状态表
CREATE TABLE gate_check_item_status (
  id VARCHAR(36) PRIMARY KEY,
  project_gate_status_id VARCHAR(36) NOT NULL,
  check_item_id VARCHAR(36) NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed', 'not_applicable') DEFAULT 'not_started',
  evidence_url VARCHAR(500),
  completed_by VARCHAR(36),
  completed_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (project_gate_status_id) REFERENCES project_gate_status(id),
  FOREIGN KEY (check_item_id) REFERENCES gate_check_items(id)
);
```

### 8.2 H1-H4人力资本门径表

```sql
-- 结构化岗位描述表
CREATE TABLE job_descriptions (
  id VARCHAR(36) PRIMARY KEY,
  job_code VARCHAR(20) NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  competency_model JSON,  -- 关键能力模型
  skill_tags JSON,  -- 权重化的技能标签
  quantifiable_outputs JSON,  -- 可量化产出
  h1_approved BOOLEAN DEFAULT FALSE,
  h1_approved_by VARCHAR(36),
  h1_approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 面试评估记录表
CREATE TABLE interview_assessments (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) NOT NULL,
  job_description_id VARCHAR(36) NOT NULL,
  interviewer_id VARCHAR(36) NOT NULL,
  interview_date TIMESTAMP NOT NULL,
  competency_scores JSON,  -- 能力维度评分
  overall_rating DECIMAL(3,2),
  recommendation ENUM('strong_hire', 'hire', 'no_hire', 'strong_no_hire'),
  notes TEXT,
  FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id)
);

-- 能力Gap标签表
CREATE TABLE candidate_gap_tags (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) NOT NULL,
  assessment_id VARCHAR(36) NOT NULL,
  competency_dimension VARCHAR(100) NOT NULL,
  gap_level ENUM('minor', 'moderate', 'significant') NOT NULL,
  gap_description TEXT,
  development_suggestion TEXT,
  FOREIGN KEY (assessment_id) REFERENCES interview_assessments(id)
);

-- 自动KPI建议表
CREATE TABLE auto_kpi_suggestions (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  job_description_id VARCHAR(36) NOT NULL,
  kpi_type ENUM('core_duty', 'development', 'behavioral') NOT NULL,
  kpi_description TEXT NOT NULL,
  target_value VARCHAR(100),
  weight DECIMAL(5,2),
  source ENUM('jd_standard', 'gap_tag', 'ai_recommendation') NOT NULL,
  source_gap_tag_id VARCHAR(36),
  status ENUM('suggested', 'accepted', 'modified', 'rejected') DEFAULT 'suggested',
  manager_notes TEXT,
  FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id),
  FOREIGN KEY (source_gap_tag_id) REFERENCES candidate_gap_tags(id)
);
```

---

## 9. Claude Code实施指南

### 9.1 NocoBase Collection配置

在NocoBase中配置以下Collection：

1. **milestone_gates**: M0-M12门径定义
2. **gate_check_items**: 门径检查项
3. **project_gate_status**: 项目门径状态
4. **gate_reviews**: 门径评审记录
5. **job_descriptions**: 结构化岗位描述
6. **interview_assessments**: 面试评估记录
7. **candidate_gap_tags**: 能力Gap标签
8. **auto_kpi_suggestions**: 自动KPI建议

### 9.2 工作流配置

配置以下工作流：

1. **Gate Review Workflow**: 门径评审流程
2. **KPI Generation Workflow**: KPI自动生成流程
3. **Escalation Workflow**: 红灯项升级流程

### 9.3 AI集成点

| 集成点 | AI功能 | 实现方式 |
|--------|--------|----------|
| H1 | JD生成与能力模型建议 | LLM分析历史高绩效员工数据 |
| H4 | KPI自动生成 | 规则引擎+LLM推荐 |
| M2 | AI推荐标准化项目元素 | 历史案例匹配 |
| M12 | 经验教训自动提取 | NLP分析项目文档 |

---

## 10. 实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| 标准化定义 | Month 1-2 | 发布GRT全集团统一的《门径管理手册》 |
| 系统打通 | Month 3-6 | 实施OCR插件，打通CRM与ERP；配置ATS与HRIS接口 |
| 试点运行 | Month 7-9 | 选择一个橡胶新品研发项目和一个IT交付项目试行 |
| 全面推广 | Month 10+ | 将门径通过率纳入各级管理者的KPI |

---

## 11. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 流程过于僵化 | 影响响应速度 | 采用混合ETO模型，区分Hard Gate和Checkpoint |
| 数据质量不足 | AI推荐不准确 | 建立数据治理机制，强制结构化输入 |
| 用户抵触 | 推广困难 | 分阶段实施，先试点后推广 |
| 系统集成复杂 | 实施周期长 | 优先打通核心数据流，逐步完善 |

---

## 12. 参考资料

1. GRT公司战略运营框架：基于门径管理（Gate）的全生命周期流程统筹与数字化实施报告
2. Stage-Gate System (Cooper, R.G.)
3. APQP (Advanced Product Quality Planning) - AIAG
4. ISO/TS 16949 质量管理体系标准
