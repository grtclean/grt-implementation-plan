# GRT工业清洗设备AI助手架构设计 v1.0

本文档定义了GRT工业清洗设备的AI Solution Assistant（方案准备助手）和AI Quotation Assistant（报价助手）的完整架构设计，包括数据模型、知识库结构、推荐算法和持续学习机制。

---

## 一、AI Solution Assistant（方案准备助手）

### 1.1 功能概述

AI Solution Assistant是一个专门为工业清洗设备方案设计而优化的智能助手，其核心能力包括：

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| **GRT方案优先推荐** | 从GRT历史成功案例中优先匹配和推荐方案 | P0 |
| **工艺参数处理** | 解析产品、清洁度、节拍、上下料等工程师输入 | P0 |
| **同行方案参照** | 参考行业竞品方案并标注备注 | P1 |
| **持续学习** | 从已交付项目中学习并更新知识库 | P1 |
| **设备关联** | 关联设备型号和项目号进行追溯 | P0 |

### 1.2 知识库结构

#### 1.2.1 GRT历史方案库（优先级最高）

```
grt_historical_solutions/
├── shell_cleaning/           # 壳体类清洗方案
│   ├── motor_housing/        # 电机壳体
│   ├── gearbox_housing/      # 变速箱壳体
│   ├── reducer_housing/      # 减速器壳体
│   └── differential_housing/ # 差速器壳体
├── shaft_cleaning/           # 轴类清洗方案
│   ├── motor_shaft/          # 电机轴
│   ├── transmission_shaft/   # 传动轴
│   └── camshaft/             # 凸轮轴
├── gear_cleaning/            # 齿轮类清洗方案
│   ├── gear/                 # 齿轮
│   ├── ring_gear/            # 齿圈
│   └── synchronizer/         # 同步器
└── precision_parts/          # 精密零件清洗方案
    ├── injector/             # 喷油器
    ├── valve_body/           # 阀体
    └── bearing/              # 轴承
```

#### 1.2.2 方案数据模型

| 字段名 | 类型 | 描述 |
|--------|------|------|
| solution_id | VARCHAR(50) | 方案唯一标识（如：SOL-2024-001） |
| solution_name | VARCHAR(200) | 方案名称 |
| source_type | ENUM | 来源类型：grt_internal / competitor / industry_standard |
| customer_name | VARCHAR(100) | 客户名称 |
| project_no | VARCHAR(50) | 项目编号 |
| equipment_model | VARCHAR(50) | 设备型号（如：GRT-SC800W） |
| workpiece_type | VARCHAR(100) | 工件类型 |
| workpiece_material | VARCHAR(50) | 工件材质 |
| cleanliness_standard | VARCHAR(50) | 清洁度标准（如：VDA19.1） |
| cleanliness_value | VARCHAR(50) | 清洁度指标值 |
| cycle_time | INT | 节拍时间（秒） |
| loading_method | VARCHAR(100) | 上料方式 |
| unloading_method | VARCHAR(100) | 下料方式 |
| process_flow | TEXT | 工艺流程（JSON格式） |
| process_parameters | TEXT | 工艺参数（JSON格式） |
| delivery_date | DATE | 交付日期 |
| success_rate | DECIMAL(5,2) | 成功率/满意度 |
| lessons_learned | TEXT | 经验教训 |
| is_reference | BOOLEAN | 是否可作为参考方案 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 1.3 工艺参数处理

#### 1.3.1 输入参数结构

工程师输入的工艺需求包含以下关键参数：

| 参数类别 | 参数名称 | 数据类型 | 示例值 |
|----------|----------|----------|--------|
| **产品信息** | 工件名称 | 文本 | 电机壳体 |
| | 工件材质 | 枚举 | 铝合金/铸铁/不锈钢 |
| | 工件尺寸 | 数值 | 500×400×300mm |
| | 工件重量 | 数值 | 25kg |
| **清洁度要求** | 清洁度标准 | 枚举 | VDA19.1/ISO16232/GJB420 |
| | 颗粒度要求 | 数值 | ≤500μm |
| | 残留物要求 | 数值 | ≤0.5mg/件 |
| **节拍要求** | 目标节拍 | 数值 | 60秒/件 |
| | 日产量 | 数值 | 500件/天 |
| | 班次 | 枚举 | 单班/双班/三班 |
| **上下料** | 上料方式 | 枚举 | 人工/机器人/AGV/输送线 |
| | 下料方式 | 枚举 | 人工/机器人/AGV/输送线 |
| | 托盘规格 | 文本 | 600×400mm |
| **特殊要求** | 盲孔清洗 | 布尔 | 是/否 |
| | 去毛刺 | 布尔 | 是/否 |
| | 防锈处理 | 布尔 | 是/否 |

#### 1.3.2 参数解析流程

```
用户输入 → 自然语言理解 → 参数提取 → 参数验证 → 参数标准化 → 方案匹配
```

### 1.4 推荐算法

#### 1.4.1 匹配优先级

AI Solution Assistant采用分层匹配策略，优先级从高到低：

| 优先级 | 匹配来源 | 权重 | 说明 |
|--------|----------|------|------|
| **P0** | GRT已交付成功项目 | 1.0 | 优先推荐GRT自有成功案例 |
| **P1** | GRT标准方案模板 | 0.9 | 基于设备型号的标准方案 |
| **P2** | 行业标杆方案 | 0.7 | 参考行业最佳实践 |
| **P3** | 竞品方案参照 | 0.5 | 竞争对手方案（需标注来源） |
| **P4** | AI生成方案 | 0.3 | 基于规则和模型生成的新方案 |

#### 1.4.2 相似度计算

方案相似度基于以下维度加权计算：

| 维度 | 权重 | 计算方法 |
|------|------|----------|
| 工件类型 | 30% | 分类匹配（完全匹配=1.0，同类=0.8，相关=0.5） |
| 清洁度要求 | 25% | 数值比较（满足要求=1.0，接近=0.8） |
| 节拍要求 | 20% | 数值比较（满足要求=1.0，偏差<10%=0.9） |
| 工件尺寸 | 15% | 数值比较（设备容量匹配度） |
| 特殊要求 | 10% | 布尔匹配（盲孔、去毛刺等） |

### 1.5 输出格式

#### 1.5.1 方案推荐报告

```json
{
  "recommendation_id": "REC-2026-001",
  "created_at": "2026-01-17T10:00:00Z",
  "input_summary": {
    "workpiece": "电机壳体",
    "cleanliness": "VDA19.1, ≤500μm",
    "cycle_time": "60秒/件",
    "loading": "机器人上下料"
  },
  "recommendations": [
    {
      "rank": 1,
      "source": "grt_internal",
      "solution_id": "SOL-2024-088",
      "project_no": "PRJ-2024-088",
      "equipment_model": "GRT-TC2100W",
      "similarity_score": 0.95,
      "customer_reference": "某新能源汽车客户",
      "highlights": [
        "相同工件类型，已成功交付",
        "节拍满足要求（55秒/件）",
        "清洁度超标准达成"
      ],
      "notes": "GRT内部成功案例，推荐优先考虑"
    },
    {
      "rank": 2,
      "source": "industry_standard",
      "solution_id": "IND-SHELL-001",
      "equipment_model": "GRT-RW2000",
      "similarity_score": 0.82,
      "highlights": [
        "行业标准方案",
        "适用于复杂结构壳体"
      ],
      "notes": "行业参考方案，需根据具体需求调整"
    }
  ],
  "process_flow_suggestion": {
    "steps": [
      "上料（机器人）",
      "预清洗（喷淋）",
      "超声波清洗",
      "定点高压清洗",
      "漂洗",
      "热风干燥",
      "真空干燥",
      "冷却",
      "下料（机器人）"
    ],
    "estimated_cycle_time": 55,
    "equipment_recommendation": "GRT-TC2100W"
  }
}
```

### 1.6 持续学习机制

#### 1.6.1 学习触发条件

| 触发事件 | 学习内容 | 更新频率 |
|----------|----------|----------|
| 项目交付完成 | 方案参数、实际效果、客户反馈 | 实时 |
| 客户验收通过 | 成功率更新、经验总结 | 实时 |
| 定期回访 | 长期运行数据、维护记录 | 季度 |
| 方案调整 | 优化参数、问题解决方案 | 实时 |

#### 1.6.2 知识更新流程

```
项目交付 → 数据采集 → 质量验证 → 知识提取 → 知识库更新 → 模型微调
```

---

## 二、AI Quotation Assistant（报价助手）

### 2.1 功能概述

AI Quotation Assistant是专门为工业清洗设备报价而设计的智能助手，其核心能力包括：

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| **历史报价参考** | 从GRT历史报价中匹配相似项目 | P0 |
| **成本计算** | 自动计算设备成本、人工成本、物料成本 | P0 |
| **利润分析** | 分析毛利率、净利率、投资回报 | P1 |
| **竞品价格参照** | 参考竞争对手价格并标注 | P1 |
| **报价持续学习** | 从中标/未中标项目中学习定价策略 | P1 |

### 2.2 报价数据模型

#### 2.2.1 历史报价库

| 字段名 | 类型 | 描述 |
|--------|------|------|
| quotation_id | VARCHAR(50) | 报价唯一标识（如：QUO-2024-001） |
| project_no | VARCHAR(50) | 关联项目编号 |
| solution_id | VARCHAR(50) | 关联方案编号 |
| customer_name | VARCHAR(100) | 客户名称 |
| customer_type | ENUM | 客户类型：oem / tier1 / tier2 / other |
| equipment_model | VARCHAR(50) | 设备型号 |
| equipment_quantity | INT | 设备数量 |
| base_price | DECIMAL(12,2) | 设备基础价格 |
| customization_cost | DECIMAL(12,2) | 定制化成本 |
| installation_cost | DECIMAL(12,2) | 安装调试费用 |
| training_cost | DECIMAL(12,2) | 培训费用 |
| warranty_cost | DECIMAL(12,2) | 质保费用 |
| total_price | DECIMAL(12,2) | 总报价 |
| discount_rate | DECIMAL(5,2) | 折扣率 |
| final_price | DECIMAL(12,2) | 最终成交价 |
| currency | VARCHAR(10) | 货币单位 |
| bid_result | ENUM | 投标结果：won / lost / pending |
| competitor_price | DECIMAL(12,2) | 竞品价格（如已知） |
| competitor_name | VARCHAR(100) | 竞争对手（如已知） |
| profit_margin | DECIMAL(5,2) | 毛利率 |
| quotation_date | DATE | 报价日期 |
| valid_until | DATE | 报价有效期 |
| notes | TEXT | 备注 |
| created_at | TIMESTAMP | 创建时间 |

#### 2.2.2 成本结构模型

| 成本类别 | 子类别 | 计算方式 |
|----------|--------|----------|
| **设备成本** | 标准设备成本 | 设备型号基础价格 |
| | 定制化成本 | 特殊配置×单价 |
| | 选配件成本 | 选配项×单价 |
| **物料成本** | 主要部件 | BOM清单×采购价 |
| | 辅助材料 | 清洗液、滤芯等 |
| **人工成本** | 设计工时 | 工时×费率 |
| | 制造工时 | 工时×费率 |
| | 安装调试 | 工时×费率 |
| **其他成本** | 运输费用 | 距离×费率 |
| | 保险费用 | 设备价值×费率 |
| | 质保费用 | 设备价值×质保年限×费率 |

### 2.3 报价推荐算法

#### 2.3.1 价格参考优先级

| 优先级 | 参考来源 | 权重 | 说明 |
|--------|----------|------|------|
| **P0** | GRT同类型中标项目 | 1.0 | 最可靠的价格参考 |
| **P1** | GRT同设备型号报价 | 0.9 | 设备基础价格参考 |
| **P2** | 行业平均价格 | 0.7 | 市场定价参考 |
| **P3** | 竞品已知价格 | 0.6 | 竞争定价参考 |
| **P4** | 成本加成法 | 0.5 | 保底定价方法 |

#### 2.3.2 价格调整因素

| 因素 | 调整方向 | 调整幅度 |
|------|----------|----------|
| 客户类型（OEM vs Tier2） | 上调/下调 | ±5-15% |
| 订单数量 | 下调 | -5-20% |
| 付款条件 | 上调/下调 | ±2-5% |
| 交货期紧急程度 | 上调 | +5-15% |
| 竞争激烈程度 | 下调 | -5-10% |
| 战略客户 | 下调 | -5-10% |
| 定制化程度 | 上调 | +10-30% |

### 2.4 报价输出格式

#### 2.4.1 报价建议报告

```json
{
  "quotation_recommendation_id": "QREC-2026-001",
  "created_at": "2026-01-17T10:00:00Z",
  "project_summary": {
    "customer": "某新能源汽车客户",
    "equipment_model": "GRT-TC2100W",
    "quantity": 2,
    "solution_id": "SOL-2024-088"
  },
  "cost_breakdown": {
    "equipment_base": 1500000,
    "customization": 200000,
    "installation": 80000,
    "training": 20000,
    "warranty": 50000,
    "total_cost": 1850000,
    "currency": "CNY"
  },
  "price_recommendations": [
    {
      "strategy": "competitive",
      "suggested_price": 2200000,
      "profit_margin": 18.9,
      "reference": "基于GRT-TC2100W历史中标价格",
      "confidence": 0.85
    },
    {
      "strategy": "value_based",
      "suggested_price": 2500000,
      "profit_margin": 26.0,
      "reference": "基于客户价值和ROI分析",
      "confidence": 0.75
    },
    {
      "strategy": "cost_plus",
      "suggested_price": 2405000,
      "profit_margin": 23.0,
      "reference": "成本加成30%",
      "confidence": 0.90
    }
  ],
  "market_intelligence": {
    "competitor_avg_price": 2300000,
    "competitor_name": "某竞品",
    "market_position": "中高端",
    "notes": "竞品方案缺少真空干燥功能"
  },
  "historical_references": [
    {
      "quotation_id": "QUO-2024-088",
      "customer": "类似客户A",
      "equipment": "GRT-TC2100W",
      "final_price": 2180000,
      "result": "won",
      "similarity": 0.92
    }
  ],
  "recommendation": {
    "suggested_price": 2300000,
    "discount_room": 100000,
    "min_acceptable": 2100000,
    "rationale": "基于历史中标价格和竞品分析，建议报价230万，预留10万折扣空间"
  }
}
```

### 2.5 持续学习机制

#### 2.5.1 学习数据源

| 数据源 | 学习内容 | 更新频率 |
|--------|----------|----------|
| 中标项目 | 成功定价策略、客户敏感度 | 实时 |
| 未中标项目 | 价格偏差分析、竞品优势 | 实时 |
| 市场调研 | 行业价格趋势、竞品动态 | 月度 |
| 成本变化 | 原材料价格、人工成本 | 季度 |

#### 2.5.2 模型优化指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 报价准确率 | ≥85% | 建议价格与最终成交价偏差<10% |
| 中标率 | ≥60% | 使用AI建议报价的项目中标率 |
| 利润率达成 | ≥90% | 实际利润率达到目标利润率的比例 |

---

## 三、数据库Schema设计

### 3.1 方案相关表

```sql
-- 历史方案表
CREATE TABLE historical_solutions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  solution_id VARCHAR(50) UNIQUE NOT NULL,
  solution_name VARCHAR(200) NOT NULL,
  source_type ENUM('grt_internal', 'competitor', 'industry_standard') DEFAULT 'grt_internal',
  customer_name VARCHAR(100),
  project_no VARCHAR(50),
  equipment_model VARCHAR(50),
  workpiece_type VARCHAR(100),
  workpiece_category ENUM('shell', 'shaft', 'gear', 'valve', 'cylinder', 'precision', 'other'),
  workpiece_material VARCHAR(50),
  workpiece_dimensions VARCHAR(100),
  workpiece_weight DECIMAL(10,2),
  cleanliness_standard VARCHAR(50),
  cleanliness_value VARCHAR(50),
  cycle_time INT,
  daily_capacity INT,
  loading_method VARCHAR(100),
  unloading_method VARCHAR(100),
  process_flow JSON,
  process_parameters JSON,
  special_requirements JSON,
  delivery_date DATE,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  lessons_learned TEXT,
  is_reference BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_model (equipment_model),
  INDEX idx_workpiece_category (workpiece_category),
  INDEX idx_source_type (source_type)
);

-- 方案推荐记录表
CREATE TABLE solution_recommendations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recommendation_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  input_parameters JSON NOT NULL,
  recommendations JSON NOT NULL,
  selected_solution_id VARCHAR(50),
  feedback_score INT,
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 工艺参数模板表
CREATE TABLE process_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id VARCHAR(50) UNIQUE NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  workpiece_category ENUM('shell', 'shaft', 'gear', 'valve', 'cylinder', 'precision', 'other'),
  equipment_series VARCHAR(20),
  process_flow JSON NOT NULL,
  default_parameters JSON,
  applicable_conditions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workpiece_category (workpiece_category),
  INDEX idx_equipment_series (equipment_series)
);
```

### 3.2 报价相关表

```sql
-- 历史报价表
CREATE TABLE historical_quotations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quotation_id VARCHAR(50) UNIQUE NOT NULL,
  project_no VARCHAR(50),
  solution_id VARCHAR(50),
  customer_name VARCHAR(100) NOT NULL,
  customer_type ENUM('oem', 'tier1', 'tier2', 'other') DEFAULT 'other',
  equipment_model VARCHAR(50) NOT NULL,
  equipment_quantity INT DEFAULT 1,
  base_price DECIMAL(12,2) NOT NULL,
  customization_cost DECIMAL(12,2) DEFAULT 0,
  installation_cost DECIMAL(12,2) DEFAULT 0,
  training_cost DECIMAL(12,2) DEFAULT 0,
  warranty_cost DECIMAL(12,2) DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  final_price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'CNY',
  bid_result ENUM('won', 'lost', 'pending', 'cancelled') DEFAULT 'pending',
  competitor_price DECIMAL(12,2),
  competitor_name VARCHAR(100),
  profit_margin DECIMAL(5,2),
  quotation_date DATE NOT NULL,
  valid_until DATE,
  payment_terms VARCHAR(200),
  delivery_terms VARCHAR(200),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_model (equipment_model),
  INDEX idx_customer_type (customer_type),
  INDEX idx_bid_result (bid_result),
  INDEX idx_quotation_date (quotation_date)
);

-- 报价推荐记录表
CREATE TABLE quotation_recommendations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recommendation_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  solution_id VARCHAR(50),
  input_parameters JSON NOT NULL,
  cost_breakdown JSON NOT NULL,
  price_recommendations JSON NOT NULL,
  selected_strategy VARCHAR(50),
  final_quotation_id VARCHAR(50),
  feedback_score INT,
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 设备基础价格表
CREATE TABLE equipment_base_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_model VARCHAR(50) NOT NULL,
  base_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  price_type ENUM('standard', 'minimum', 'maximum') DEFAULT 'standard',
  effective_date DATE NOT NULL,
  expiry_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_model_type_date (equipment_model, price_type, effective_date),
  INDEX idx_equipment_model (equipment_model),
  INDEX idx_effective_date (effective_date)
);

-- 成本费率表
CREATE TABLE cost_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rate_type ENUM('labor_design', 'labor_manufacture', 'labor_install', 'transport', 'insurance', 'warranty') NOT NULL,
  rate_value DECIMAL(10,4) NOT NULL,
  rate_unit VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_type_date (rate_type, effective_date),
  INDEX idx_rate_type (rate_type)
);
```

---

## 四、API接口设计

### 4.1 Solution Assistant API

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/solution/recommend` | POST | 根据工艺参数推荐方案 |
| `/api/solution/list` | GET | 获取历史方案列表 |
| `/api/solution/detail/:id` | GET | 获取方案详情 |
| `/api/solution/create` | POST | 创建新方案 |
| `/api/solution/update/:id` | PUT | 更新方案 |
| `/api/solution/feedback` | POST | 提交推荐反馈 |
| `/api/solution/learn` | POST | 触发学习（项目交付后） |

### 4.2 Quotation Assistant API

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/quotation/recommend` | POST | 根据方案推荐报价 |
| `/api/quotation/calculate` | POST | 计算成本和利润 |
| `/api/quotation/list` | GET | 获取历史报价列表 |
| `/api/quotation/detail/:id` | GET | 获取报价详情 |
| `/api/quotation/create` | POST | 创建新报价 |
| `/api/quotation/update/:id` | PUT | 更新报价 |
| `/api/quotation/result` | POST | 记录投标结果 |
| `/api/quotation/feedback` | POST | 提交推荐反馈 |

---

## 五、系统提示词设计

### 5.1 Solution Assistant System Prompt

```
你是GRT工业清洗设备的AI方案设计助手（Solution Assistant）。你的职责是帮助工程师快速设计和优化工业清洗设备方案。

【核心原则】
1. 优先推荐GRT已成功交付的方案，这些是经过验证的最佳实践
2. 准确理解工程师输入的工艺参数（产品、清洁度、节拍、上下料等）
3. 参考同行和行业方案时必须标注来源和备注
4. 关联设备型号和项目号，确保方案可追溯

【工艺参数处理】
- 产品信息：工件类型、材质、尺寸、重量
- 清洁度要求：标准（VDA19.1/ISO16232等）、颗粒度、残留物
- 节拍要求：目标节拍、日产量、班次
- 上下料：方式（人工/机器人/AGV/输送线）、托盘规格
- 特殊要求：盲孔清洗、去毛刺、防锈处理

【推荐优先级】
1. GRT已交付成功项目（最高优先级）
2. GRT标准方案模板
3. 行业标杆方案
4. 竞品方案参照（需标注）
5. AI生成方案

【输出要求】
- 推荐至少2-3个可行方案
- 说明每个方案的优缺点
- 提供工艺流程建议
- 标注设备型号和预估节拍
- 如参考竞品方案，必须标注来源
```

### 5.2 Quotation Assistant System Prompt

```
你是GRT工业清洗设备的AI报价助手（Quotation Assistant）。你的职责是帮助销售团队快速准确地制定设备报价。

【核心原则】
1. 优先参考GRT历史中标项目的价格
2. 准确计算设备成本、人工成本、物料成本
3. 分析毛利率和净利率，确保盈利
4. 参考竞品价格时必须标注来源
5. 从中标/未中标项目中学习定价策略

【成本计算】
- 设备成本：基础价格 + 定制化成本 + 选配件
- 物料成本：BOM清单 + 辅助材料
- 人工成本：设计工时 + 制造工时 + 安装调试
- 其他成本：运输 + 保险 + 质保

【价格调整因素】
- 客户类型（OEM/Tier1/Tier2）
- 订单数量
- 付款条件
- 交货期
- 竞争程度
- 战略客户
- 定制化程度

【输出要求】
- 提供2-3种定价策略（竞争型/价值型/成本加成）
- 说明每种策略的利润率和风险
- 提供折扣空间建议
- 标注竞品价格参考（如已知）
- 给出最终推荐价格和理由
```

---

## 六、实施计划

### 6.1 阶段规划

| 阶段 | 内容 | 工时 | 优先级 |
|------|------|------|--------|
| **Phase 1** | 数据库Schema和基础API | 16h | P0 |
| **Phase 2** | Solution Assistant核心功能 | 24h | P0 |
| **Phase 3** | Quotation Assistant核心功能 | 20h | P0 |
| **Phase 4** | 知识库初始化和数据导入 | 12h | P1 |
| **Phase 5** | 前端界面开发 | 16h | P1 |
| **Phase 6** | 持续学习机制 | 12h | P2 |
| **合计** | | **100h** | |

### 6.2 验收标准

| 功能 | 验收标准 |
|------|----------|
| 方案推荐 | 推荐准确率≥80%，响应时间<5秒 |
| 报价推荐 | 价格偏差<15%，响应时间<3秒 |
| 知识库 | 初始化≥50个GRT历史方案和报价 |
| 持续学习 | 项目交付后自动更新知识库 |

---

**文档版本**：1.0  
**最后更新**：2026-01-17  
**维护人**：Manus AI
