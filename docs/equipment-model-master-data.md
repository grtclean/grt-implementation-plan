# GRT设备型号基础数据表

> **版本**: 1.0  
> **生效日期**: 2026年1月17日  
> **适用范围**: GRT公司所有清洗设备产品  
> **作者**: Manus AI  
> **状态**: 正式发布

---

## 一、版本控制说明

### 1.1 版本管理规则

本基础数据表采用**版本化管理**，确保命名规则的可追溯性和一致性：

| 规则 | 说明 |
|------|------|
| **版本号格式** | V{主版本}.{次版本}，如 V1.0、V1.1、V2.0 |
| **生效日期** | 每个版本有明确的生效日期，新规则仅对生效日期后创建的记录有效 |
| **历史保留** | 旧版本规则作为备注保留，不删除，便于追溯 |
| **版本关联** | 每条设备记录必须关联创建时的命名版本号 |

### 1.2 版本变更类型

| 变更类型 | 版本号变化 | 说明 |
|----------|------------|------|
| **重大变更** | 主版本+1 | 命名体系结构调整、大类代码变更 |
| **次要变更** | 次版本+1 | 新增型号、配置参数调整 |
| **勘误修正** | 不变 | 文字错误修正，不影响编码 |

### 1.3 变更管理流程

本文档的变更需遵循《命名规则变更管理流程》（`naming-rules-change-management.md`），包括以下阶段：

```
提出要求 → 批准 → Claude Code更新 → 测试系统实施 → 更新记录 → 生成正式版本
```

| 阶段 | 说明 | 输出物 |
|------|------|--------|
| 1. 提出要求 | 填写变更请求单，明确变更内容和原因 | 变更请求单(CR单) |
| 2. 批准 | 审批人评估影响，批准或驳回 | 审批记录 |
| 3. Claude Code更新 | 在开发环境更新文档和代码 | 草稿版本(-draft) |
| 4. 测试系统实施 | 在测试环境验证变更 | 测试报告 |
| 5. 更新记录 | 确认测试通过，记录变更历史 | 变更历史记录 |
| 6. 生成正式版本 | 发布正式版本，通知相关人员 | 正式版本文档 |

> **重要提示**：任何对本文档的修改必须经过完整的变更管理流程，未经批准的修改不得发布。

### 1.4 版本历史

| 版本 | 生效日期 | 变更说明 | 变更请求号 | 状态 |
|------|----------|----------|------------|------|
| V1.0 | 2026-01-17 | 初始版本，建立设备命名体系 | - | ✅ 当前版本 |

---

## 二、设备大类定义表

### 2.1 大类代码表 (equipment_categories)

| 代码 | 英文名称 | 中文名称 | 说明 | 版本 | 生效日期 |
|------|----------|----------|------|------|----------|
| 2 | Standard | 标准清洗机 | 标准配置清洗设备 | V1.0 | 2026-01-17 |
| 3 | Specialized | 专用清洗机 | 特定行业/工艺专用 | V1.0 | 2026-01-17 |
| 5 | Passline | 通过式清洗线 | 连续式清洗生产线 | V1.0 | 2026-01-17 |
| 7 | Auxiliary | 辅助设备 | 过滤、供液、干燥等 | V1.0 | 2026-01-17 |
| 8 | Chamber | 腔体式清洗机 | 封闭腔体清洗设备 | V1.0 | 2026-01-17 |
| 9 | Custom | 定制设备 | 非标定制解决方案 | V1.0 | 2026-01-17 |

### 2.2 功能名称表 (function_names)

| 代码 | 英文名称 | 中文名称 | 适用大类 | 版本 | 生效日期 |
|------|----------|----------|----------|------|----------|
| US | Ultrasonic | 超声波清洗 | 2,3,8 | V1.0 | 2026-01-17 |
| SP | Spray | 喷淋清洗 | 2,3,8 | V1.0 | 2026-01-17 |
| IM | Immersion | 浸泡清洗 | 2,8 | V1.0 | 2026-01-17 |
| VC | Vacuum | 真空清洗/干燥 | 8 | V1.0 | 2026-01-17 |
| TB | Turbulent | 紊流清洗 | 8 | V1.0 | 2026-01-17 |
| DB | Deburring | 去毛刺 | 3 | V1.0 | 2026-01-17 |
| AQ | Aqueous | 水基清洗 | 2,3,8 | V1.0 | 2026-01-17 |
| SV | Solvent | 溶剂清洗 | 2,3,8 | V1.0 | 2026-01-17 |
| RB | Robot | 机器人清洗 | 9 | V1.0 | 2026-01-17 |
| PL | Passline | 通过式 | 5 | V1.0 | 2026-01-17 |
| FT | Filter | 过滤系统 | 7 | V1.0 | 2026-01-17 |
| DR | Dryer | 干燥系统 | 7 | V1.0 | 2026-01-17 |
| SU | Supply | 供液系统 | 7 | V1.0 | 2026-01-17 |
| CB | Combo | 组合式 | 8 | V1.0 | 2026-01-17 |

---

## 三、设备型号主数据表

### 3.1 腔体式清洗机 (8XX系列)

| 数字代码 | 完整型号 | 中文名称 | 腔体数 | 工艺类型 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|--------|----------|----------|------|----------|------|
| 801 | Ultrasonic 801 | 超声波腔体清洗机 | 1 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 802 | Ultrasonic 802 | 超声波腔体清洗机 | 2 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 803 | Ultrasonic 803 | 超声波腔体清洗机 | 3 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 804 | Ultrasonic 804 | 超声波腔体清洗机 | 4 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 805 | Ultrasonic 805 | 超声波腔体清洗机 | 5 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 811 | Ultrasonic 811 | 超声波增强腔体清洗机 | 1 | 超声波增强 | 增强 | V1.0 | 2026-01-17 | |
| 812 | Ultrasonic 812 | 超声波增强腔体清洗机 | 2 | 超声波增强 | 增强 | V1.0 | 2026-01-17 | |
| 821 | Spray 821 | 喷淋腔体清洗机 | 1 | 高压喷淋 | 标准 | V1.0 | 2026-01-17 | |
| 822 | Spray 822 | 喷淋腔体清洗机 | 2 | 高压喷淋 | 标准 | V1.0 | 2026-01-17 | |
| 831 | Vacuum 831 | 真空腔体清洗机 | 1 | 真空清洗 | 标准 | V1.0 | 2026-01-17 | |
| 832 | Vacuum 832 | 真空腔体清洗机 | 2 | 真空清洗 | 标准 | V1.0 | 2026-01-17 | |
| 841 | Combo 841 | 组合工艺腔体清洗机 | 1 | 组合工艺 | 标准 | V1.0 | 2026-01-17 | |
| 842 | Combo 842 | 组合工艺腔体清洗机 | 2 | 组合工艺 | 标准 | V1.0 | 2026-01-17 | |
| 851 | Ultrasonic 851 | 大型超声波腔体清洗机 | 1 | 超声波 | 大型 | V1.0 | 2026-01-17 | |
| 852 | Ultrasonic 852 | 大型超声波腔体清洗机 | 2 | 超声波 | 大型 | V1.0 | 2026-01-17 | |
| 853 | Ultrasonic 853 | 大型超声波腔体清洗机 | 3 | 超声波 | 大型 | V1.0 | 2026-01-17 | |

### 3.2 通过式清洗线 (5XXX系列)

| 数字代码 | 完整型号 | 中文名称 | 工位数 | 节拍类型 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|--------|----------|----------|------|----------|------|
| 5000 | Passline 5000 | 通过式清洗线 | 标准 | 标准节拍 | 基础 | V1.0 | 2026-01-17 | |
| 5010 | Passline 5010 | 通过式清洗线 | 标准 | 标准节拍 | 标准 | V1.0 | 2026-01-17 | |
| 5020 | Passline 5020 | 通过式清洗线 | 标准 | 标准节拍 | 增强 | V1.0 | 2026-01-17 | |
| 5030 | Passline 5030 | 通过式清洗线 | 标准 | 标准节拍 | 高端 | V1.0 | 2026-01-17 | |
| 5100 | Passline 5100 | 高速通过式清洗线 | 标准 | 高速节拍 | 基础 | V1.0 | 2026-01-17 | |
| 5110 | Passline 5110 | 高速通过式清洗线 | 标准 | 高速节拍 | 标准 | V1.0 | 2026-01-17 | |
| 5120 | Passline 5120 | 高速通过式清洗线 | 标准 | 高速节拍 | 增强 | V1.0 | 2026-01-17 | |
| 5200 | Passline 5200 | 柔性通过式清洗线 | 可变 | 柔性节拍 | 基础 | V1.0 | 2026-01-17 | |
| 5210 | Passline 5210 | 柔性通过式清洗线 | 可变 | 柔性节拍 | 标准 | V1.0 | 2026-01-17 | |

### 3.3 标准清洗机 (2XX系列)

| 数字代码 | 完整型号 | 中文名称 | 槽数 | 工艺类型 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|------|----------|----------|------|----------|------|
| 200 | Ultrasonic 200 | 超声波清洗机 | 单槽 | 超声波 | 基础 | V1.0 | 2026-01-17 | |
| 201 | Ultrasonic 201 | 超声波清洗机 | 单槽 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 202 | Ultrasonic 202 | 超声波清洗机 | 单槽 | 超声波 | 增强 | V1.0 | 2026-01-17 | |
| 210 | Ultrasonic 210 | 超声波清洗机 | 多槽 | 超声波 | 基础 | V1.0 | 2026-01-17 | |
| 211 | Ultrasonic 211 | 超声波清洗机 | 多槽 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 220 | Spray 220 | 喷淋清洗机 | 单槽 | 喷淋 | 基础 | V1.0 | 2026-01-17 | |
| 221 | Spray 221 | 喷淋清洗机 | 单槽 | 喷淋 | 标准 | V1.0 | 2026-01-17 | |

### 3.4 专用清洗机 (3XX系列)

| 数字代码 | 完整型号 | 中文名称 | 适用行业 | 工艺类型 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|----------|----------|----------|------|----------|------|
| 300 | Auto 300 | 汽车零部件清洗机 | 汽车 | 综合 | 基础 | V1.0 | 2026-01-17 | |
| 301 | Auto 301 | 汽车零部件清洗机 | 汽车 | 综合 | 标准 | V1.0 | 2026-01-17 | |
| 302 | Auto 302 | 汽车零部件清洗机 | 汽车 | 综合 | 增强 | V1.0 | 2026-01-17 | |
| 310 | NEV 310 | 新能源零部件清洗机 | 新能源 | 综合 | 基础 | V1.0 | 2026-01-17 | |
| 311 | NEV 311 | 新能源零部件清洗机 | 新能源 | 综合 | 标准 | V1.0 | 2026-01-17 | |
| 320 | Precision 320 | 精密零件清洗机 | 精密制造 | 超声波 | 基础 | V1.0 | 2026-01-17 | |
| 321 | Precision 321 | 精密零件清洗机 | 精密制造 | 超声波 | 标准 | V1.0 | 2026-01-17 | |
| 330 | Aero 330 | 航空零部件清洗机 | 航空航天 | 综合 | 基础 | V1.0 | 2026-01-17 | |
| 331 | Aero 331 | 航空零部件清洗机 | 航空航天 | 综合 | 标准 | V1.0 | 2026-01-17 | |

### 3.5 辅助设备 (7XX系列)

| 数字代码 | 完整型号 | 中文名称 | 设备类型 | 规格 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|----------|------|----------|------|----------|------|
| 700 | Filter 700 | 过滤系统 | 过滤 | 标准 | 基础 | V1.0 | 2026-01-17 | |
| 701 | Filter 701 | 过滤系统 | 过滤 | 标准 | 标准 | V1.0 | 2026-01-17 | |
| 710 | Dryer 710 | 干燥系统 | 干燥 | 标准 | 基础 | V1.0 | 2026-01-17 | |
| 711 | Dryer 711 | 干燥系统 | 干燥 | 标准 | 标准 | V1.0 | 2026-01-17 | |
| 720 | Supply 720 | 供液系统 | 供液 | 标准 | 基础 | V1.0 | 2026-01-17 | |
| 721 | Supply 721 | 供液系统 | 供液 | 标准 | 标准 | V1.0 | 2026-01-17 | |

### 3.6 定制设备 (9XX系列)

| 数字代码 | 完整型号 | 中文名称 | 定制类型 | 配置等级 | 版本 | 生效日期 | 备注 |
|----------|----------|----------|----------|----------|------|----------|------|
| 901 | Robot 901 | 机器人清洗设备 | 机器人集成 | 标准 | V1.0 | 2026-01-17 | |
| 902 | Robot 902 | 机器人清洗设备 | 机器人集成 | 增强 | V1.0 | 2026-01-17 | |
| 910 | Custom 910 | 定制清洗解决方案 | 非标定制 | 基础 | V1.0 | 2026-01-17 | |
| 911 | Custom 911 | 定制清洗解决方案 | 非标定制 | 标准 | V1.0 | 2026-01-17 | |

---

## 四、配置参数定义表

### 4.1 配置等级定义 (config_levels)

| 等级代码 | 等级名称 | 说明 | 适用系列 | 版本 | 生效日期 |
|----------|----------|------|----------|------|----------|
| 0 | 基础 | 基础配置，满足基本功能需求 | 全部 | V1.0 | 2026-01-17 |
| 1 | 标准 | 标准配置，满足常规生产需求 | 全部 | V1.0 | 2026-01-17 |
| 2 | 增强 | 增强配置，提供更高性能和更多功能 | 全部 | V1.0 | 2026-01-17 |
| 3 | 高端 | 高端配置，顶级性能和完整功能 | 全部 | V1.0 | 2026-01-17 |
| L | 大型 | 大型设备，处理大尺寸工件 | 8XX | V1.0 | 2026-01-17 |

### 4.2 工艺类型定义 (process_types)

| 类型代码 | 类型名称 | 说明 | 适用系列 | 版本 | 生效日期 |
|----------|----------|------|----------|------|----------|
| US | 超声波 | 利用超声波空化效应清洗 | 2XX,8XX | V1.0 | 2026-01-17 |
| US+ | 超声波增强 | 增强型超声波清洗 | 8XX | V1.0 | 2026-01-17 |
| SP | 喷淋 | 高压/低压喷淋清洗 | 2XX,8XX | V1.0 | 2026-01-17 |
| VC | 真空清洗 | 真空环境下清洗或干燥 | 8XX | V1.0 | 2026-01-17 |
| CB | 组合工艺 | 多种工艺组合 | 8XX | V1.0 | 2026-01-17 |
| MX | 综合 | 综合清洗工艺 | 3XX | V1.0 | 2026-01-17 |

### 4.3 后缀代码定义 (suffix_codes)

| 后缀 | 含义 | 说明 | 版本 | 生效日期 |
|------|------|------|------|----------|
| A | 自动化版本 | 全自动化操作 | V1.0 | 2026-01-17 |
| M | 手动版本 | 手动操作 | V1.0 | 2026-01-17 |
| R | 机器人集成 | 集成机器人上下料 | V1.0 | 2026-01-17 |
| S | 小型版本 | 紧凑型设计 | V1.0 | 2026-01-17 |
| L | 大型版本 | 大尺寸设计 | V1.0 | 2026-01-17 |
| P | 精密版本 | 高精度清洗 | V1.0 | 2026-01-17 |
| H | 高压版本 | 高压清洗 | V1.0 | 2026-01-17 |

---

## 五、命名调整历史记录机制

### 5.1 调整记录表结构 (equipment_name_history)

| 字段名 | 数据类型 | 说明 |
|--------|----------|------|
| id | INT | 主键 |
| equipment_id | INT | 设备记录ID |
| numeric_code | VARCHAR(10) | 数字代码 |
| old_name | VARCHAR(100) | 原名称 |
| new_name | VARCHAR(100) | 新名称 |
| old_chinese_name | VARCHAR(100) | 原中文名称 |
| new_chinese_name | VARCHAR(100) | 新中文名称 |
| change_reason | TEXT | 变更原因 |
| change_type | ENUM | 变更类型：manual(手动调整), version_upgrade(版本升级), correction(勘误) |
| naming_version | VARCHAR(10) | 命名版本号 |
| effective_date | DATE | 生效日期 |
| created_by | INT | 操作人ID |
| created_at | TIMESTAMP | 创建时间 |

### 5.2 调整规则

| 规则 | 说明 |
|------|------|
| **手动调整权限** | 仅管理员可进行手动调整 |
| **调整范围** | 可调整完整型号名称和中文名称，数字代码不可变更 |
| **历史保留** | 所有调整记录永久保留，不可删除 |
| **版本关联** | 调整时必须关联当前命名版本号 |
| **生效日期** | 调整仅对生效日期后创建的记录有效 |
| **备注显示** | 历史名称在系统中作为备注显示 |

### 5.3 调整示例

假设在V1.1版本中，将"Ultrasonic 801"调整为"UltraSonic 801"：

| 字段 | 值 |
|------|-----|
| numeric_code | 801 |
| old_name | Ultrasonic 801 |
| new_name | UltraSonic 801 |
| change_reason | 统一品牌命名风格 |
| change_type | version_upgrade |
| naming_version | V1.1 |
| effective_date | 2026-03-01 |

**系统显示效果**：
- 2026-03-01之前创建的设备：显示"Ultrasonic 801"，备注"依据命名版本V1.0"
- 2026-03-01之后创建的设备：显示"UltraSonic 801"，备注"依据命名版本V1.1"

---

## 六、数据库Schema设计

### 6.1 设备型号主表 (equipment_models)

```sql
CREATE TABLE equipment_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 编码信息
    numeric_code VARCHAR(10) NOT NULL UNIQUE COMMENT '数字代码，如801、5010',
    function_code VARCHAR(10) NOT NULL COMMENT '功能代码，如US、SP',
    category_code CHAR(1) NOT NULL COMMENT '大类代码，1-9',
    
    -- 名称信息
    full_name VARCHAR(100) NOT NULL COMMENT '完整型号，如Ultrasonic 801',
    chinese_name VARCHAR(100) NOT NULL COMMENT '中文名称',
    display_name VARCHAR(100) COMMENT '显示名称（可手动调整）',
    
    -- 配置信息
    chamber_count INT COMMENT '腔体数量（8XX系列）',
    process_type VARCHAR(20) COMMENT '工艺类型',
    config_level VARCHAR(10) COMMENT '配置等级',
    applicable_industry VARCHAR(100) COMMENT '适用行业（3XX系列）',
    
    -- 版本信息
    naming_version VARCHAR(10) NOT NULL DEFAULT 'V1.0' COMMENT '命名版本号',
    effective_date DATE NOT NULL COMMENT '生效日期',
    
    -- 状态
    status ENUM('active', 'deprecated', 'obsolete') DEFAULT 'active',
    
    -- 备注
    remark TEXT COMMENT '备注（含历史名称信息）',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category_code),
    INDEX idx_function (function_code),
    INDEX idx_version (naming_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备型号主表';
```

### 6.2 命名版本表 (naming_versions)

```sql
CREATE TABLE naming_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version_code VARCHAR(10) NOT NULL UNIQUE COMMENT '版本号，如V1.0',
    version_name VARCHAR(100) COMMENT '版本名称',
    effective_date DATE NOT NULL COMMENT '生效日期',
    change_type ENUM('major', 'minor', 'patch') NOT NULL COMMENT '变更类型',
    change_description TEXT COMMENT '变更说明',
    is_current BOOLEAN DEFAULT FALSE COMMENT '是否当前版本',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='命名版本表';
```

### 6.3 命名调整历史表 (equipment_name_history)

```sql
CREATE TABLE equipment_name_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL COMMENT '设备型号ID',
    numeric_code VARCHAR(10) NOT NULL COMMENT '数字代码',
    
    -- 变更前后
    old_name VARCHAR(100) COMMENT '原名称',
    new_name VARCHAR(100) COMMENT '新名称',
    old_chinese_name VARCHAR(100) COMMENT '原中文名称',
    new_chinese_name VARCHAR(100) COMMENT '新中文名称',
    
    -- 变更信息
    change_reason TEXT COMMENT '变更原因',
    change_type ENUM('manual', 'version_upgrade', 'correction') NOT NULL COMMENT '变更类型',
    naming_version VARCHAR(10) NOT NULL COMMENT '命名版本号',
    effective_date DATE NOT NULL COMMENT '生效日期',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_equipment (equipment_id),
    INDEX idx_code (numeric_code),
    INDEX idx_version (naming_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='命名调整历史表';
```

---

## 七、系统集成接口

### 7.1 获取设备型号名称

```typescript
/**
 * 根据数字代码和创建日期获取正确的设备型号名称
 * @param numericCode 数字代码，如"801"
 * @param createdDate 设备创建日期
 * @returns 设备型号信息，包含名称和版本
 */
function getEquipmentModelName(numericCode: string, createdDate: Date): {
    fullName: string;
    chineseName: string;
    displayName: string;
    namingVersion: string;
    remark: string;
}
```

### 7.2 手动调整设备名称

```typescript
/**
 * 手动调整设备型号名称
 * @param numericCode 数字代码
 * @param newName 新名称
 * @param newChineseName 新中文名称
 * @param changeReason 变更原因
 * @param effectiveDate 生效日期
 */
function adjustEquipmentName(
    numericCode: string,
    newName: string,
    newChineseName: string,
    changeReason: string,
    effectiveDate: Date
): void
```

### 7.3 查询命名历史

```typescript
/**
 * 查询设备型号的命名历史
 * @param numericCode 数字代码
 * @returns 命名历史记录列表
 */
function getEquipmentNameHistory(numericCode: string): NameHistoryRecord[]
```

---

## 八、使用说明

### 8.1 新建设备记录

1. 选择数字代码（如801）
2. 系统自动填充完整型号名称和中文名称
3. 系统自动关联当前命名版本号
4. 可手动调整显示名称（调整会记录到历史）

### 8.2 查看历史设备

1. 系统根据设备创建日期和命名版本显示对应名称
2. 如有名称调整，显示当前名称并在备注中显示历史名称
3. 备注格式："依据命名版本V1.0；历史名称：XXX（V1.0）"

### 8.3 版本升级流程

1. 创建新版本记录（如V1.1）
2. 更新需要变更的型号名称
3. 设置生效日期
4. 系统自动记录变更历史
5. 生效日期后的新记录使用新名称

---

## 参考资料

1. [Ecoclean Products](https://ecoclean-group.net/products) - Ecoclean官网产品页面
2. [杰瑞德工业清洗](https://www.gerrytech.com/) - 杰瑞德官网
