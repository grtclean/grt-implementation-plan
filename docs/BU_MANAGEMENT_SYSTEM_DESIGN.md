# 事业部管理系统设计文档

## 1. 系统概述

### 1.1 目标
创建一个完整的事业部（Business Unit, BU）管理系统，集成绩效管理体系，支持多维度的经营、交付、成本、质量、客户等指标管理。

### 1.2 核心特性
- **多维度绩效指标**：经营、交付、成本、质量、客户、人力资源、创新等7个维度
- **分层级管理**：公司级 → 事业部级 → 项目级 → 个人级
- **实时数据聚合**：自动从项目、成本、质量等系统聚合数据
- **智能指标计算**：基于规则引擎的自动计算，支持加权、阈值、趋势分析
- **可视化仪表板**：多维度的数据展示和分析
- **历史追踪**：完整的指标变化历史记录

---

## 2. 数据模型设计

### 2.1 核心实体关系图

```
BusinessUnits (事业部)
├── BU_Projects (事业部项目)
├── BU_Performance (事业部绩效)
├── BU_KPIs (关键绩效指标)
├── BU_Employees (事业部员工)
└── BU_PerformanceHistory (绩效历史)

Projects (项目)
├── ProjectScores (项目评分)
├── ProjectMembers (项目成员)
└── ProjectMemberScores (成员项目评分)

Performance Dimensions (绩效维度)
├── OperationalMetrics (经营指标)
├── DeliveryMetrics (交付指标)
├── CostMetrics (成本指标)
├── QualityMetrics (质量指标)
├── CustomerMetrics (客户指标)
├── HRMetrics (人力资源指标)
└── InnovationMetrics (创新指标)
```

### 2.2 数据表结构

#### 2.2.1 BusinessUnits（事业部主表）
```sql
CREATE TABLE business_units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,           -- BU代码 (BU1, BU2, ...)
  name VARCHAR(255) NOT NULL,                 -- 事业部名称
  description TEXT,                           -- 描述
  manager_id INT,                             -- 事业部经理ID
  parent_bu_id INT,                           -- 父事业部ID (支持嵌套)
  fiscal_year INT,                            -- 财政年度
  status ENUM('active', 'inactive', 'planning'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2.2.2 BU_Performance（事业部绩效）
```sql
CREATE TABLE bu_performance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bu_id INT NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_quarter INT,                         -- Q1, Q2, Q3, Q4
  
  -- 经营指标 (Operational)
  revenue DECIMAL(15,2),                      -- 收入
  revenue_target DECIMAL(15,2),               -- 收入目标
  revenue_achievement_rate DECIMAL(5,2),      -- 收入达成率 (%)
  
  -- 交付指标 (Delivery)
  projects_completed INT,                     -- 完成项目数
  projects_on_time INT,                       -- 按时完成项目数
  delivery_on_time_rate DECIMAL(5,2),         -- 交付准时率 (%)
  project_satisfaction DECIMAL(3,2),          -- 项目满意度 (1-5)
  
  -- 成本指标 (Cost)
  total_cost DECIMAL(15,2),                   -- 总成本
  cost_budget DECIMAL(15,2),                  -- 成本预算
  cost_variance_rate DECIMAL(5,2),            -- 成本差异率 (%)
  labor_cost DECIMAL(15,2),                   -- 劳动成本
  material_cost DECIMAL(15,2),                -- 物料成本
  
  -- 质量指标 (Quality)
  defect_rate DECIMAL(5,2),                   -- 缺陷率 (%)
  rework_rate DECIMAL(5,2),                   -- 返工率 (%)
  quality_score DECIMAL(3,2),                 -- 质量评分 (1-5)
  customer_complaint_count INT,               -- 客户投诉数
  
  -- 客户指标 (Customer)
  customer_satisfaction DECIMAL(3,2),         -- 客户满意度 (1-5)
  customer_retention_rate DECIMAL(5,2),       -- 客户留存率 (%)
  new_customer_count INT,                     -- 新客户数
  customer_lifetime_value DECIMAL(15,2),      -- 客户生命周期价值
  
  -- 人力资源指标 (HR)
  employee_count INT,                         -- 员工数
  employee_turnover_rate DECIMAL(5,2),        -- 员工流失率 (%)
  training_hours_per_employee DECIMAL(8,2),   -- 人均培训小时数
  employee_satisfaction DECIMAL(3,2),         -- 员工满意度 (1-5)
  
  -- 创新指标 (Innovation)
  innovation_projects INT,                    -- 创新项目数
  patent_count INT,                           -- 专利数
  process_improvement_count INT,              -- 流程改进数
  innovation_investment DECIMAL(15,2),        -- 创新投资
  
  -- 综合评分
  overall_score DECIMAL(5,2),                 -- 综合评分 (1-100)
  overall_rating VARCHAR(20),                 -- 评级 (A+, A, B+, B, C)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bu_id) REFERENCES business_units(id),
  UNIQUE KEY unique_bu_period (bu_id, fiscal_year, fiscal_quarter)
);
```

#### 2.2.3 BU_KPIs（关键绩效指标定义）
```sql
CREATE TABLE bu_kpis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bu_id INT NOT NULL,
  kpi_code VARCHAR(50) NOT NULL,              -- KPI代码 (如 REV_TARGET)
  kpi_name VARCHAR(255) NOT NULL,             -- KPI名称
  dimension VARCHAR(50) NOT NULL,             -- 维度 (operational, delivery, cost, quality, customer, hr, innovation)
  unit VARCHAR(50),                           -- 单位 (%, 万元, 个, 小时等)
  
  -- 目标和权重
  fiscal_year INT NOT NULL,
  target_value DECIMAL(15,2),                 -- 目标值
  weight DECIMAL(5,2),                        -- 权重 (%)
  
  -- 阈值定义
  excellent_threshold DECIMAL(15,2),          -- 优秀阈值
  good_threshold DECIMAL(15,2),               -- 良好阈值
  acceptable_threshold DECIMAL(15,2),         -- 可接受阈值
  
  -- 计算规则
  calculation_method VARCHAR(100),            -- 计算方法 (manual, formula, aggregation)
  calculation_formula TEXT,                   -- 计算公式
  data_source VARCHAR(255),                   -- 数据来源
  
  status ENUM('active', 'inactive'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bu_id) REFERENCES business_units(id),
  UNIQUE KEY unique_kpi (bu_id, kpi_code, fiscal_year)
);
```

#### 2.2.4 BU_PerformanceHistory（绩效历史）
```sql
CREATE TABLE bu_performance_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bu_id INT NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_quarter INT,
  
  -- 记录变化
  metric_name VARCHAR(255) NOT NULL,
  old_value DECIMAL(15,2),
  new_value DECIMAL(15,2),
  change_reason TEXT,
  
  -- 审计信息
  changed_by INT,                             -- 修改者ID
  change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bu_id) REFERENCES business_units(id),
  INDEX idx_bu_period (bu_id, fiscal_year, fiscal_quarter)
);
```

#### 2.2.5 ProjectScores（项目评分）
```sql
CREATE TABLE project_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  bu_id INT,                                  -- 关联事业部
  
  -- 评分维度
  delivery_score DECIMAL(3,2),                -- 交付评分 (1-5)
  quality_score DECIMAL(3,2),                 -- 质量评分 (1-5)
  cost_score DECIMAL(3,2),                    -- 成本评分 (1-5)
  customer_satisfaction DECIMAL(3,2),         -- 客户满意度 (1-5)
  
  -- 综合评分
  overall_score DECIMAL(3,2),                 -- 综合评分 (1-5)
  
  evaluation_date TIMESTAMP,
  evaluator_id INT,
  comments TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (bu_id) REFERENCES business_units(id)
);
```

#### 2.2.6 ProjectMemberScores（项目成员评分）
```sql
CREATE TABLE project_member_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  employee_id INT NOT NULL,
  bu_id INT,
  
  -- 个人评分
  performance_score DECIMAL(3,2),             -- 绩效评分 (1-5)
  capability_score DECIMAL(3,2),              -- 能力评分 (1-5)
  collaboration_score DECIMAL(3,2),           -- 协作评分 (1-5)
  innovation_score DECIMAL(3,2),              -- 创新评分 (1-5)
  
  -- 综合评分
  overall_score DECIMAL(3,2),                 -- 综合评分 (1-5)
  
  evaluation_date TIMESTAMP,
  evaluator_id INT,
  comments TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (employee_id) REFERENCES users(id),
  FOREIGN KEY (bu_id) REFERENCES business_units(id)
);
```

---

## 3. 绩效指标体系

### 3.1 七维度指标框架

| 维度 | 英文 | 关键指标 | 权重 | 数据来源 |
|------|------|---------|------|---------|
| 经营 | Operational | 收入、利润、市场份额 | 25% | 财务系统、销售系统 |
| 交付 | Delivery | 按时率、满意度、完成度 | 20% | 项目管理系统 |
| 成本 | Cost | 成本差异、劳动成本、物料成本 | 20% | 成本管理系统 |
| 质量 | Quality | 缺陷率、返工率、投诉数 | 15% | 质量管理系统 |
| 客户 | Customer | 满意度、留存率、新客户 | 10% | CRM系统、调查问卷 |
| 人力 | HR | 员工数、流失率、培训 | 5% | HR系统 |
| 创新 | Innovation | 创新项目、专利、改进 | 5% | 创新管理系统 |

### 3.2 指标计算规则

#### 3.2.1 收入达成率
```
收入达成率 = (实际收入 / 收入目标) × 100%
评级标准：
  ≥ 100%: A+ (优秀)
  ≥ 95%: A (良好)
  ≥ 85%: B+ (可接受)
  ≥ 75%: B (基本)
  < 75%: C (需改进)
```

#### 3.2.2 交付准时率
```
交付准时率 = (按时完成项目数 / 总完成项目数) × 100%
评级标准：
  ≥ 95%: A+ (优秀)
  ≥ 90%: A (良好)
  ≥ 80%: B+ (可接受)
  ≥ 70%: B (基本)
  < 70%: C (需改进)
```

#### 3.2.3 成本差异率
```
成本差异率 = ((实际成本 - 预算成本) / 预算成本) × 100%
评级标准（越低越好）：
  ≤ 0%: A+ (优秀)
  ≤ 5%: A (良好)
  ≤ 10%: B+ (可接受)
  ≤ 15%: B (基本)
  > 15%: C (需改进)
```

#### 3.2.4 综合评分
```
综合评分 = Σ(各维度评分 × 权重)

评级标准：
  90-100: A+ (优秀)
  80-89: A (良好)
  70-79: B+ (可接受)
  60-69: B (基本)
  < 60: C (需改进)
```

---

## 4. 系统架构

### 4.1 后端架构

```
server/
├── routers/
│   ├── bu.router.ts              # 事业部管理路由
│   ├── bu-performance.router.ts   # 绩效管理路由
│   ├── bu-kpi.router.ts           # KPI管理路由
│   └── bu-analytics.router.ts     # 分析和报告路由
├── services/
│   ├── bu.service.ts              # 事业部业务逻辑
│   ├── performance.service.ts      # 绩效计算引擎
│   ├── kpi.service.ts              # KPI管理
│   └── analytics.service.ts        # 数据分析
├── db/
│   └── bu-queries.ts              # 数据库查询函数
└── utils/
    ├── performance-calculator.ts   # 绩效计算工具
    ├── score-evaluator.ts          # 评分评估工具
    └── data-aggregator.ts          # 数据聚合工具
```

### 4.2 前端架构

```
client/src/
├── pages/
│   ├── BUManagement.tsx            # 事业部管理页面
│   ├── BUPerformanceDashboard.tsx   # 绩效仪表板
│   ├── BUAnalytics.tsx              # 分析报告页面
│   └── BUSettings.tsx               # 配置页面
├── components/
│   ├── BUList.tsx                   # 事业部列表
│   ├── PerformanceCard.tsx           # 绩效卡片
│   ├── KPIChart.tsx                 # KPI图表
│   ├── TrendAnalysis.tsx             # 趋势分析
│   └── ComparisonView.tsx            # 对比视图
└── hooks/
    ├── useBUData.ts                 # 事业部数据hook
    └── usePerformanceMetrics.ts      # 绩效指标hook
```

---

## 5. 实施计划

### 5.1 第一阶段：数据库和API（第1-2周）
- [ ] 创建数据库表结构
- [ ] 实现事业部CRUD API
- [ ] 实现绩效数据API
- [ ] 实现KPI定义API
- [ ] 编写数据库查询函数

### 5.2 第二阶段：绩效计算引擎（第3周）
- [ ] 实现指标计算引擎
- [ ] 实现评分评估逻辑
- [ ] 实现数据聚合逻辑
- [ ] 编写单元测试

### 5.3 第三阶段：前端UI（第4-5周）
- [ ] 创建事业部管理页面
- [ ] 创建绩效仪表板
- [ ] 创建分析报告页面
- [ ] 实现数据可视化

### 5.4 第四阶段：集成和优化（第6周）
- [ ] 与现有系统集成
- [ ] 性能优化
- [ ] 完整测试
- [ ] 用户培训

---

## 6. 集成点

### 6.1 与现有系统的集成

| 系统 | 集成点 | 数据流向 |
|------|--------|---------|
| 项目管理 | 项目完成度、交付时间 | 项目→绩效 |
| 成本管理 | 实际成本、预算 | 成本→绩效 |
| 质量管理 | 缺陷率、投诉数 | 质量→绩效 |
| CRM | 客户满意度、新客户 | CRM→绩效 |
| HR系统 | 员工数、流失率、培训 | HR→绩效 |
| 财务系统 | 收入、利润 | 财务→绩效 |

### 6.2 数据流向

```
┌─────────────────────────────────────────────────────────┐
│                    各业务系统                            │
│  (项目、成本、质量、CRM、HR、财务)                       │
└──────────────┬──────────────────────────────────────────┘
               │ 数据聚合
               ↓
┌─────────────────────────────────────────────────────────┐
│              事业部绩效数据中心                          │
│  (BU_Performance, BU_KPIs)                              │
└──────────────┬──────────────────────────────────────────┘
               │ 指标计算
               ↓
┌─────────────────────────────────────────────────────────┐
│              绩效指标计算引擎                            │
│  (Performance Calculator)                               │
└──────────────┬──────────────────────────────────────────┘
               │ 结果展示
               ↓
┌─────────────────────────────────────────────────────────┐
│              绩效仪表板和报告                            │
│  (Dashboard, Analytics, Reports)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 关键特性

### 7.1 实时数据聚合
- 自动从各业务系统收集数据
- 支持定时任务和手动触发
- 数据一致性校验

### 7.2 灵活的指标定义
- 支持自定义KPI
- 支持加权计算
- 支持公式配置

### 7.3 完整的历史追踪
- 记录每次指标变化
- 支持趋势分析
- 支持对比分析

### 7.4 多维度可视化
- 仪表板视图
- 详细报告
- 对比分析
- 趋势分析

---

## 8. 性能考虑

### 8.1 数据库优化
- 为关键查询字段建立索引
- 使用物化视图缓存常用计算
- 定期数据归档

### 8.2 API优化
- 实现分页和缓存
- 使用异步计算
- 支持批量操作

### 8.3 前端优化
- 使用虚拟滚动处理大数据
- 实现图表懒加载
- 使用Web Workers处理复杂计算

---

## 9. 安全考虑

### 9.1 数据访问控制
- 基于角色的访问控制（RBAC）
- 事业部级别的数据隔离
- 审计日志记录

### 9.2 数据保护
- 敏感数据加密
- 定期备份
- 灾难恢复计划

---

## 10. 后续扩展

### 10.1 短期（1-2个月）
- 支持预测分析
- 支持异常告警
- 支持自动化报告

### 10.2 中期（3-6个月）
- 支持AI驱动的建议
- 支持基准对标
- 支持场景模拟

### 10.3 长期（6个月+）
- 支持战略规划
- 支持资源优化
- 支持决策支持系统

---

## 附录：事业部列表

| 代码 | 名称 | 描述 |
|------|------|------|
| BU1 | 海外事业部 | Overseas Business Unit |
| BU2 | 商用车事业部 | Commercial Vehicle Business Unit |
| BU3 | 乘用车事业部 | Passenger Vehicle Business Unit |
| BU4 | 半导体事业部 | Semiconductor Business Unit |
| BU5 | 工业通用事业部 | Industrial General Business Unit |

