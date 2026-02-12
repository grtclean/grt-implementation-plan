# GRT项目编号基础数据表

> **版本**: 1.0  
> **生效日期**: 2026年1月17日  
> **适用范围**: GRT公司所有项目编号管理  
> **作者**: Manus AI  
> **状态**: 正式发布

---

## 一、版本控制说明

### 1.1 版本管理规则

本基础数据表采用**版本化管理**，确保项目编号规则的可追溯性和一致性：

| 规则 | 说明 |
|------|------|
| **版本号格式** | V{主版本}.{次版本}，如 V1.0、V1.1、V2.0 |
| **生效日期** | 每个版本有明确的生效日期，新规则仅对生效日期后创建的项目有效 |
| **历史保留** | 旧版本规则作为备注保留，不删除，便于追溯 |
| **版本关联** | 每个项目记录必须关联创建时的编号版本号 |

### 1.2 变更管理流程

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

### 1.3 版本历史

| 版本 | 生效日期 | 变更说明 | 变更请求号 | 状态 |
|------|----------|----------|------------|------|
| V1.0 | 2026-01-17 | 初始版本，建立项目编号体系 | - | ✅ 当前版本 |

---

## 二、项目编号规则定义表

### 2.1 编号前缀定义 (project_prefixes)

| 前缀 | 名称 | 适用阶段 | 说明 | 版本 | 生效日期 |
|------|------|----------|------|------|----------|
| T | 临时项目 | 商务阶段 | 询价、报价、方案设计阶段使用 | V1.0 | 2026-01-17 |
| GRT | 正式项目 | 执行阶段 | 签订合同后使用 | V1.0 | 2026-01-17 |

### 2.2 编号格式规则 (numbering_formats)

| 规则ID | 前缀 | 格式 | 范围 | 示例 | 版本 | 生效日期 |
|--------|------|------|------|------|------|----------|
| T-3D | T | T + 3位数字 | 001-999 | T001, T501, T999 | V1.0 | 2026-01-17 |
| T-4D | T | T + 4位数字 | 1000-9999 | T1000, T1500, T9999 | V1.0 | 2026-01-17 |
| GRT-3D | GRT | GRT + 3位数字 | 001-999 | GRT001, GRT501, GRT999 | V1.0 | 2026-01-17 |
| GRT-4D | GRT | GRT + 4位数字 | 1000-9999 | GRT1000, GRT1500, GRT9999 | V1.0 | 2026-01-17 |

### 2.3 自动升级规则 (auto_upgrade_rules)

| 规则ID | 触发条件 | 升级动作 | 说明 | 版本 | 生效日期 |
|--------|----------|----------|------|------|----------|
| T-UPGRADE | T编号达到T999 | 下一个编号为T1000 | 3位自动升级为4位 | V1.0 | 2026-01-17 |
| GRT-UPGRADE | GRT编号达到GRT999 | 下一个编号为GRT1000 | 3位自动升级为4位 | V1.0 | 2026-01-17 |

---

## 三、项目编号当前状态表

### 3.1 编号计数器 (number_counters)

| 前缀 | 当前最大值 | 下一个可用 | 格式状态 | 更新时间 | 版本 |
|------|------------|------------|----------|----------|------|
| T | ~500 | T501 | 3位数字 | 2026-01-17 | V1.0 |
| GRT | ~500 | GRT501 | 3位数字 | 2026-01-17 | V1.0 |

> **注意**：上表中的"当前最大值"为估计值，实际值需从业务系统中确认。

---

## 四、关联文档编号规则

### 4.1 文档编号格式 (document_formats)

| 文档类型 | 编号格式 | 示例 | 说明 | 版本 | 生效日期 |
|----------|----------|------|------|------|----------|
| 询价登记 | {T编号} | T501 | 直接使用T编号 | V1.0 | 2026-01-17 |
| 技术方案 | {T编号}-FA-V{版本} | T501-FA-V1.0 | FA=Technical Proposal | V1.0 | 2026-01-17 |
| 商务报价 | {T编号}-QT-V{版本} | T501-QT-V1.0 | QT=Quotation | V1.0 | 2026-01-17 |
| 合同 | {GRT编号}-CT | GRT501-CT | CT=Contract | V1.0 | 2026-01-17 |
| 生产订单 | {GRT编号}-PO-{序号} | GRT501-PO-001 | PO=Production Order | V1.0 | 2026-01-17 |
| 发货单 | {GRT编号}-DN-{序号} | GRT501-DN-001 | DN=Delivery Note | V1.0 | 2026-01-17 |
| 验收报告 | {GRT编号}-AR-{序号} | GRT501-AR-001 | AR=Acceptance Report | V1.0 | 2026-01-17 |

### 4.2 文档类型代码表 (document_type_codes)

| 代码 | 英文全称 | 中文名称 | 适用阶段 | 版本 | 生效日期 |
|------|----------|----------|----------|------|----------|
| FA | Technical Proposal | 技术方案 | 商务阶段 | V1.0 | 2026-01-17 |
| QT | Quotation | 商务报价 | 商务阶段 | V1.0 | 2026-01-17 |
| CT | Contract | 合同 | 执行阶段 | V1.0 | 2026-01-17 |
| PO | Production Order | 生产订单 | 执行阶段 | V1.0 | 2026-01-17 |
| DN | Delivery Note | 发货单 | 执行阶段 | V1.0 | 2026-01-17 |
| AR | Acceptance Report | 验收报告 | 执行阶段 | V1.0 | 2026-01-17 |
| SR | Service Report | 服务报告 | 售后阶段 | V1.0 | 2026-01-17 |

---

## 五、编号转换规则

### 5.1 转换规则表 (conversion_rules)

| 规则ID | 源编号类型 | 目标编号类型 | 触发条件 | 转换方式 | 版本 | 生效日期 |
|--------|------------|--------------|----------|----------|------|----------|
| T2GRT | T编号 | GRT编号 | 签订合同 | 分配新GRT编号 | V1.0 | 2026-01-17 |

### 5.2 转换记录表结构 (project_conversion_history)

| 字段名 | 数据类型 | 说明 |
|--------|----------|------|
| id | INT | 主键 |
| temp_project_code | VARCHAR(20) | 临时项目编号（T编号） |
| formal_project_code | VARCHAR(20) | 正式项目编号（GRT编号） |
| conversion_date | DATE | 转换日期 |
| contract_no | VARCHAR(50) | 合同编号 |
| numbering_version | VARCHAR(10) | 编号版本号 |
| created_by | INT | 操作人ID |
| created_at | TIMESTAMP | 创建时间 |
| remark | TEXT | 备注 |

---

## 六、编号调整历史记录机制

### 6.1 调整记录表结构 (project_number_history)

| 字段名 | 数据类型 | 说明 |
|--------|----------|------|
| id | INT | 主键 |
| project_id | INT | 项目记录ID |
| old_code | VARCHAR(20) | 原编号 |
| new_code | VARCHAR(20) | 新编号 |
| change_reason | TEXT | 变更原因 |
| change_type | ENUM | 变更类型：manual(手动调整), conversion(转换), correction(勘误) |
| numbering_version | VARCHAR(10) | 编号版本号 |
| effective_date | DATE | 生效日期 |
| created_by | INT | 操作人ID |
| created_at | TIMESTAMP | 创建时间 |

### 6.2 调整规则

| 规则 | 说明 |
|------|------|
| **手动调整权限** | 仅管理员可进行手动调整 |
| **调整范围** | 特殊情况下可调整编号，但需详细记录原因 |
| **历史保留** | 所有调整记录永久保留，不可删除 |
| **版本关联** | 调整时必须关联当前编号版本号 |
| **生效日期** | 调整仅对生效日期后创建的记录有效 |
| **备注显示** | 历史编号在系统中作为备注显示 |

---

## 七、数据库Schema设计

### 7.1 项目编号计数器表 (project_number_counters)

```sql
CREATE TABLE project_number_counters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL UNIQUE COMMENT '编号前缀：T/GRT',
    current_max INT NOT NULL DEFAULT 0 COMMENT '当前最大序号',
    next_available INT NOT NULL DEFAULT 1 COMMENT '下一个可用序号',
    format_digits INT NOT NULL DEFAULT 3 COMMENT '当前格式位数：3或4',
    numbering_version VARCHAR(10) NOT NULL DEFAULT 'V1.0' COMMENT '编号版本号',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目编号计数器表';

-- 初始数据
INSERT INTO project_number_counters (prefix, current_max, next_available, format_digits) VALUES
('T', 500, 501, 3),
('GRT', 500, 501, 3);
```

### 7.2 项目编号版本表 (project_numbering_versions)

```sql
CREATE TABLE project_numbering_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version_code VARCHAR(10) NOT NULL UNIQUE COMMENT '版本号，如V1.0',
    version_name VARCHAR(100) COMMENT '版本名称',
    effective_date DATE NOT NULL COMMENT '生效日期',
    change_type ENUM('major', 'minor', 'patch') NOT NULL COMMENT '变更类型',
    change_description TEXT COMMENT '变更说明',
    is_current BOOLEAN DEFAULT FALSE COMMENT '是否当前版本',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目编号版本表';

-- 初始数据
INSERT INTO project_numbering_versions (version_code, version_name, effective_date, change_type, change_description, is_current) VALUES
('V1.0', '初始版本', '2026-01-17', 'major', '建立项目编号体系：T临时编号/GRT正式编号，支持3位到4位自动升级', TRUE);
```

### 7.3 项目转换记录表 (project_conversion_history)

```sql
CREATE TABLE project_conversion_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temp_project_code VARCHAR(20) NOT NULL COMMENT '临时项目编号（T编号）',
    formal_project_code VARCHAR(20) NOT NULL COMMENT '正式项目编号（GRT编号）',
    conversion_date DATE NOT NULL COMMENT '转换日期',
    contract_no VARCHAR(50) COMMENT '合同编号',
    numbering_version VARCHAR(10) NOT NULL COMMENT '编号版本号',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark TEXT COMMENT '备注',
    
    INDEX idx_temp (temp_project_code),
    INDEX idx_formal (formal_project_code),
    INDEX idx_version (numbering_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目转换记录表';
```

### 7.4 项目编号调整历史表 (project_number_history)

```sql
CREATE TABLE project_number_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL COMMENT '项目记录ID',
    old_code VARCHAR(20) COMMENT '原编号',
    new_code VARCHAR(20) COMMENT '新编号',
    change_reason TEXT COMMENT '变更原因',
    change_type ENUM('manual', 'conversion', 'correction') NOT NULL COMMENT '变更类型',
    numbering_version VARCHAR(10) NOT NULL COMMENT '编号版本号',
    effective_date DATE NOT NULL COMMENT '生效日期',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_project (project_id),
    INDEX idx_version (numbering_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目编号调整历史表';
```

---

## 八、系统集成接口

### 8.1 获取下一个项目编号

```typescript
/**
 * 获取下一个可用的项目编号
 * @param prefix 编号前缀：'T' 或 'GRT'
 * @returns 下一个可用的项目编号
 */
async function getNextProjectNumber(prefix: 'T' | 'GRT'): Promise<{
    projectCode: string;
    numberingVersion: string;
}> {
    // 1. 获取当前计数器
    const counter = await db.query('SELECT * FROM project_number_counters WHERE prefix = ?', [prefix]);
    
    // 2. 计算下一个编号
    const nextNum = counter.next_available;
    let projectCode: string;
    
    if (nextNum <= 999) {
        projectCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    } else {
        projectCode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }
    
    // 3. 更新计数器
    await db.query('UPDATE project_number_counters SET current_max = ?, next_available = ? WHERE prefix = ?', 
        [nextNum, nextNum + 1, prefix]);
    
    return {
        projectCode,
        numberingVersion: counter.numbering_version
    };
}
```

### 8.2 转换项目编号

```typescript
/**
 * 将临时项目编号转换为正式项目编号
 * @param tempProjectCode 临时项目编号（T编号）
 * @param contractNo 合同编号
 * @returns 正式项目编号（GRT编号）
 */
async function convertProjectNumber(
    tempProjectCode: string,
    contractNo: string
): Promise<{
    formalProjectCode: string;
    numberingVersion: string;
}> {
    // 1. 获取新的GRT编号
    const { projectCode, numberingVersion } = await getNextProjectNumber('GRT');
    
    // 2. 记录转换历史
    await db.query(`
        INSERT INTO project_conversion_history 
        (temp_project_code, formal_project_code, conversion_date, contract_no, numbering_version)
        VALUES (?, ?, CURDATE(), ?, ?)
    `, [tempProjectCode, projectCode, contractNo, numberingVersion]);
    
    // 3. 更新项目记录
    await db.query(`
        UPDATE projects 
        SET project_code = ?, 
            temp_project_code = ?,
            status = 'active',
            numbering_version = ?
        WHERE project_code = ?
    `, [projectCode, tempProjectCode, numberingVersion, tempProjectCode]);
    
    return {
        formalProjectCode: projectCode,
        numberingVersion
    };
}
```

### 8.3 查询编号历史

```typescript
/**
 * 查询项目编号的变更历史
 * @param projectId 项目ID
 * @returns 编号变更历史记录列表
 */
async function getProjectNumberHistory(projectId: number): Promise<NumberHistoryRecord[]> {
    return await db.query(`
        SELECT * FROM project_number_history 
        WHERE project_id = ? 
        ORDER BY created_at DESC
    `, [projectId]);
}
```

---

## 九、使用说明

### 9.1 新建临时项目

1. 系统自动分配下一个可用的T编号
2. 系统自动关联当前编号版本号
3. 项目状态设为"商务阶段"

### 9.2 转换为正式项目

1. 选择要转换的临时项目（T编号）
2. 输入合同编号
3. 系统自动分配新的GRT编号
4. 系统自动记录转换历史
5. 原T编号保留在系统中，标记为"已转换"

### 9.3 查看历史项目

1. 系统根据项目创建日期和编号版本显示对应编号
2. 如有编号调整，显示当前编号并在备注中显示历史编号
3. 备注格式："依据编号版本V1.0；原编号：XXX"

---

## 参考资料

1. GRT公司现有项目编号实践
2. 工业设备制造企业项目管理最佳实践
