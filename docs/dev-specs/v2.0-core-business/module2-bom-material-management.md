# 模块2：BOM物料管理系统

**模块代码**: BOM-MATERIAL  
**优先级**: P0  
**预计工时**: 30-35小时  
**依赖模块**: AI-SOLUTION（可选）  
**实施方**: Claude Code

---

## 1. 业务背景

### 1.1 业务流程概述

BOM物料管理系统覆盖从研发设计到仓库管理的全流程：

```
研发工程师 → 创建/导入BOM → 采购申请 → 供应商报价 → 采购订单 → 供应商送货 → 仓库收货 → 物料上架 → 生产领料
```

### 1.2 核心业务场景

| 场景 | 角色 | 操作 | 说明 |
|------|------|------|------|
| BOM创建 | 研发工程师 | 从设备Load BOM或AI推荐 | 支持100%采用、局部更新、全部更新 |
| BOM审批 | 项目经理 | 审批BOM变更 | 变更需要审批流程 |
| 采购申请 | 采购员 | 根据BOM生成采购清单 | 自动关联供应商 |
| 供应商送货 | 供应商 | 扫码送货 | 获取物料号和预设存储位置 |
| 仓库收货 | 仓库管理员 | 扫码入库 | 验证物料并放置到指定料位 |
| 生产领料 | 生产人员 | 扫码领料 | 从指定料位领取物料 |

### 1.3 物料编号规则

物料编号采用结构化编码规则：

```
[类别代码]-[子类代码]-[序列号]-[版本号]
例如：ELE-MOT-00001-A

类别代码（3位）：
- ELE: 电气件
- MEC: 机械件
- HYD: 液压件
- PNE: 气动件
- STD: 标准件
- RAW: 原材料

子类代码（3位）：
- MOT: 电机
- SEN: 传感器
- PLC: 控制器
- BRG: 轴承
- SCR: 螺丝
...

序列号（5位）：00001-99999
版本号（1位）：A-Z
```

---

## 2. 数据库Schema设计

### 2.1 物料主数据表 (materials)

```sql
-- 物料主数据表 - 存储所有物料的基本信息
CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 物料编号
    material_code VARCHAR(32) UNIQUE NOT NULL COMMENT '物料编号，如：ELE-MOT-00001-A',
    
    -- 基本信息
    name VARCHAR(200) NOT NULL COMMENT '物料名称',
    name_en VARCHAR(200) COMMENT '英文名称',
    description TEXT COMMENT '物料描述',
    specification VARCHAR(500) COMMENT '规格型号',
    
    -- 分类信息
    category_code VARCHAR(10) NOT NULL COMMENT '类别代码：ELE/MEC/HYD/PNE/STD/RAW',
    sub_category_code VARCHAR(10) COMMENT '子类代码',
    category_name VARCHAR(100) COMMENT '类别名称',
    
    -- 单位信息
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS' COMMENT '基本单位：PCS/KG/M/L',
    unit_name VARCHAR(50) COMMENT '单位名称',
    
    -- 采购信息
    default_supplier_id INT COMMENT '默认供应商ID',
    lead_time_days INT DEFAULT 7 COMMENT '采购周期(天)',
    min_order_qty DECIMAL(10,2) DEFAULT 1 COMMENT '最小订购量',
    price_unit DECIMAL(15,4) COMMENT '单价(元)',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
    
    -- 库存信息
    safety_stock DECIMAL(10,2) DEFAULT 0 COMMENT '安全库存',
    max_stock DECIMAL(10,2) COMMENT '最大库存',
    current_stock DECIMAL(10,2) DEFAULT 0 COMMENT '当前库存',
    
    -- 存储信息
    default_location_id INT COMMENT '默认存储位置ID',
    storage_conditions VARCHAR(200) COMMENT '存储条件',
    shelf_life_days INT COMMENT '保质期(天)',
    
    -- 质量信息
    inspection_required BOOLEAN DEFAULT FALSE COMMENT '是否需要检验',
    inspection_standard VARCHAR(200) COMMENT '检验标准',
    
    -- 状态
    status ENUM('active', 'inactive', 'obsolete') DEFAULT 'active',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category_code),
    INDEX idx_supplier (default_supplier_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料主数据表';
```

### 2.2 BOM表头 (bom_headers)

```sql
-- BOM表头 - 存储BOM的基本信息
CREATE TABLE bom_headers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- BOM编号
    bom_code VARCHAR(32) UNIQUE NOT NULL COMMENT 'BOM编号，如：BOM-2024-00001',
    
    -- 关联信息
    project_id INT COMMENT '关联项目ID',
    equipment_id INT COMMENT '关联设备ID',
    equipment_name VARCHAR(200) COMMENT '设备名称',
    
    -- BOM信息
    bom_name VARCHAR(200) NOT NULL COMMENT 'BOM名称',
    bom_type ENUM('standard', 'engineering', 'production') DEFAULT 'engineering' COMMENT 'BOM类型',
    version VARCHAR(10) NOT NULL DEFAULT 'A' COMMENT '版本号',
    
    -- 状态
    status ENUM('draft', 'pending_approval', 'approved', 'released', 'obsolete') DEFAULT 'draft',
    
    -- 审批信息
    submitted_by INT COMMENT '提交人',
    submitted_at TIMESTAMP COMMENT '提交时间',
    approved_by INT COMMENT '审批人',
    approved_at TIMESTAMP COMMENT '审批时间',
    approval_notes TEXT COMMENT '审批备注',
    
    -- AI推荐信息
    ai_recommended BOOLEAN DEFAULT FALSE COMMENT '是否AI推荐',
    ai_source_bom_id INT COMMENT 'AI参考的源BOM ID',
    ai_similarity_score DECIMAL(5,2) COMMENT 'AI相似度评分',
    
    -- 统计信息
    total_items INT DEFAULT 0 COMMENT '物料项数',
    total_cost DECIMAL(15,2) DEFAULT 0 COMMENT '总成本',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project (project_id),
    INDEX idx_equipment (equipment_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM表头';
```

### 2.3 BOM明细表 (bom_items)

```sql
-- BOM明细表 - 存储BOM的物料明细
CREATE TABLE bom_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    bom_id INT NOT NULL COMMENT '关联BOM ID',
    material_id INT NOT NULL COMMENT '关联物料ID',
    
    -- 行号
    line_number INT NOT NULL COMMENT '行号',
    
    -- 数量信息
    quantity DECIMAL(10,4) NOT NULL COMMENT '数量',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    
    -- 位置信息
    position_code VARCHAR(50) COMMENT '装配位置代码',
    position_description VARCHAR(200) COMMENT '装配位置描述',
    
    -- 替代料信息
    is_substitute BOOLEAN DEFAULT FALSE COMMENT '是否替代料',
    substitute_group VARCHAR(20) COMMENT '替代料组',
    substitute_priority INT DEFAULT 1 COMMENT '替代优先级',
    
    -- 成本信息
    unit_price DECIMAL(15,4) COMMENT '单价',
    total_price DECIMAL(15,2) COMMENT '总价',
    
    -- 备注
    remark TEXT COMMENT '备注',
    
    -- 状态
    status ENUM('active', 'deleted') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_bom (bom_id),
    INDEX idx_material (material_id),
    UNIQUE KEY uk_bom_line (bom_id, line_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM明细表';
```

### 2.4 采购订单表 (purchase_orders)

```sql
-- 采购订单表
CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 订单编号
    po_code VARCHAR(32) UNIQUE NOT NULL COMMENT '采购订单号，如：PO-2024-00001',
    
    -- 关联信息
    project_id INT COMMENT '关联项目ID',
    bom_id INT COMMENT '关联BOM ID',
    supplier_id INT NOT NULL COMMENT '供应商ID',
    
    -- 订单信息
    order_date DATE NOT NULL COMMENT '订单日期',
    expected_date DATE COMMENT '预计到货日期',
    
    -- 金额信息
    total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '订单总金额',
    currency VARCHAR(10) DEFAULT 'CNY',
    tax_rate DECIMAL(5,2) DEFAULT 13 COMMENT '税率(%)',
    tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
    
    -- 状态
    status ENUM('draft', 'submitted', 'confirmed', 'partial_received', 'completed', 'cancelled') DEFAULT 'draft',
    
    -- 收货信息
    received_amount DECIMAL(15,2) DEFAULT 0 COMMENT '已收货金额',
    received_at TIMESTAMP COMMENT '收货完成时间',
    
    -- 备注
    remark TEXT,
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project (project_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单表';
```

### 2.5 采购订单明细表 (purchase_order_items)

```sql
-- 采购订单明细表
CREATE TABLE purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    po_id INT NOT NULL COMMENT '关联采购订单ID',
    material_id INT NOT NULL COMMENT '关联物料ID',
    bom_item_id INT COMMENT '关联BOM明细ID',
    
    -- 行号
    line_number INT NOT NULL COMMENT '行号',
    
    -- 数量信息
    quantity DECIMAL(10,4) NOT NULL COMMENT '订购数量',
    received_quantity DECIMAL(10,4) DEFAULT 0 COMMENT '已收货数量',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    
    -- 价格信息
    unit_price DECIMAL(15,4) NOT NULL COMMENT '单价',
    total_price DECIMAL(15,2) NOT NULL COMMENT '总价',
    
    -- 供应商物料号
    supplier_material_code VARCHAR(50) COMMENT '供应商物料号',
    
    -- 状态
    status ENUM('pending', 'partial_received', 'completed', 'cancelled') DEFAULT 'pending',
    
    -- 备注
    remark TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_po (po_id),
    INDEX idx_material (material_id),
    UNIQUE KEY uk_po_line (po_id, line_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单明细表';
```

### 2.6 仓库位置表 (warehouse_locations)

```sql
-- 仓库位置表 - 存储所有料位信息
CREATE TABLE warehouse_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 位置编码
    location_code VARCHAR(32) UNIQUE NOT NULL COMMENT '位置编码，如：WH01-A-01-01',
    
    -- 位置层级
    warehouse_code VARCHAR(10) NOT NULL COMMENT '仓库代码：WH01/WH02/ONLINE/LINE',
    zone_code VARCHAR(10) COMMENT '区域代码：A/B/C',
    rack_code VARCHAR(10) COMMENT '货架代码：01/02/03',
    shelf_code VARCHAR(10) COMMENT '层位代码：01/02/03',
    
    -- 位置类型
    location_type ENUM('warehouse', 'online', 'production_line', 'quality_area') DEFAULT 'warehouse',
    
    -- 位置信息
    location_name VARCHAR(100) COMMENT '位置名称',
    description TEXT COMMENT '位置描述',
    
    -- 容量信息
    max_capacity DECIMAL(10,2) COMMENT '最大容量',
    current_usage DECIMAL(10,2) DEFAULT 0 COMMENT '当前使用量',
    capacity_unit VARCHAR(20) DEFAULT 'PCS' COMMENT '容量单位',
    
    -- 关联信息
    project_id INT COMMENT '关联项目ID（产线旁料位）',
    
    -- 状态
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    
    -- QR码
    qr_code VARCHAR(100) UNIQUE COMMENT '二维码内容',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_warehouse (warehouse_code),
    INDEX idx_type (location_type),
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库位置表';
```

### 2.7 库存记录表 (inventory_records)

```sql
-- 库存记录表 - 存储物料在各位置的库存
CREATE TABLE inventory_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    material_id INT NOT NULL COMMENT '物料ID',
    location_id INT NOT NULL COMMENT '位置ID',
    
    -- 库存信息
    quantity DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '库存数量',
    reserved_quantity DECIMAL(10,4) DEFAULT 0 COMMENT '预留数量',
    available_quantity DECIMAL(10,4) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED COMMENT '可用数量',
    
    -- 批次信息
    batch_number VARCHAR(50) COMMENT '批次号',
    production_date DATE COMMENT '生产日期',
    expiry_date DATE COMMENT '过期日期',
    
    -- 关联项目
    project_id INT COMMENT '关联项目ID',
    
    -- 状态
    status ENUM('normal', 'locked', 'quality_hold') DEFAULT 'normal',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_material_location_batch (material_id, location_id, batch_number),
    INDEX idx_material (material_id),
    INDEX idx_location (location_id),
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存记录表';
```

### 2.8 库存事务表 (inventory_transactions)

```sql
-- 库存事务表 - 记录所有库存变动
CREATE TABLE inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 事务编号
    transaction_code VARCHAR(32) UNIQUE NOT NULL COMMENT '事务编号',
    
    -- 事务类型
    transaction_type ENUM(
        'receive',           -- 采购入库
        'return_to_supplier',-- 退货给供应商
        'issue',             -- 生产领料
        'return_from_prod',  -- 生产退料
        'transfer',          -- 库存转移
        'adjustment',        -- 库存调整
        'scrap'              -- 报废
    ) NOT NULL,
    
    -- 关联信息
    material_id INT NOT NULL,
    from_location_id INT COMMENT '源位置ID',
    to_location_id INT COMMENT '目标位置ID',
    
    -- 数量信息
    quantity DECIMAL(10,4) NOT NULL COMMENT '数量',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    
    -- 关联单据
    reference_type VARCHAR(50) COMMENT '关联单据类型：PO/MO/TRANSFER',
    reference_id INT COMMENT '关联单据ID',
    reference_code VARCHAR(50) COMMENT '关联单据号',
    
    -- 项目信息
    project_id INT COMMENT '关联项目ID',
    
    -- 批次信息
    batch_number VARCHAR(50) COMMENT '批次号',
    
    -- 操作信息
    operated_by INT NOT NULL COMMENT '操作人ID',
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    
    -- 备注
    remark TEXT,
    
    INDEX idx_material (material_id),
    INDEX idx_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_operated (operated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存事务表';
```

### 2.9 供应商物料映射表 (supplier_material_mapping)

```sql
-- 供应商物料映射表 - 存储供应商物料号与内部物料号的对应关系
CREATE TABLE supplier_material_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    supplier_id INT NOT NULL COMMENT '供应商ID',
    material_id INT NOT NULL COMMENT '内部物料ID',
    
    -- 供应商物料信息
    supplier_material_code VARCHAR(50) NOT NULL COMMENT '供应商物料号',
    supplier_material_name VARCHAR(200) COMMENT '供应商物料名称',
    
    -- 价格信息
    unit_price DECIMAL(15,4) COMMENT '采购单价',
    currency VARCHAR(10) DEFAULT 'CNY',
    price_valid_from DATE COMMENT '价格生效日期',
    price_valid_to DATE COMMENT '价格失效日期',
    
    -- 采购信息
    min_order_qty DECIMAL(10,2) DEFAULT 1 COMMENT '最小订购量',
    lead_time_days INT DEFAULT 7 COMMENT '交货周期(天)',
    
    -- 状态
    is_preferred BOOLEAN DEFAULT FALSE COMMENT '是否首选供应商',
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_supplier_material (supplier_id, material_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商物料映射表';
```

---

## 3. API路由设计

### 3.1 物料管理API

```typescript
// server/routers/material.ts
export const materialRouter = router({
  // 获取物料列表
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      search: z.string().optional(),
      categoryCode: z.string().optional(),
      status: z.enum(["active", "inactive", "obsolete"]).optional(),
    }))
    .query(async ({ input }) => {
      return getMaterials(input);
    }),

  // 获取物料详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMaterialById(input.id);
    }),

  // 创建物料
  create: protectedProcedure
    .input(createMaterialSchema)
    .mutation(async ({ input, ctx }) => {
      return createMaterial({ ...input, createdBy: ctx.user.id });
    }),

  // 更新物料
  update: protectedProcedure
    .input(updateMaterialSchema)
    .mutation(async ({ input }) => {
      return updateMaterial(input);
    }),

  // 生成物料编号
  generateCode: protectedProcedure
    .input(z.object({
      categoryCode: z.string(),
      subCategoryCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return generateMaterialCode(input);
    }),

  // 批量导入物料
  batchImport: protectedProcedure
    .input(z.object({
      materials: z.array(createMaterialSchema),
    }))
    .mutation(async ({ input, ctx }) => {
      return batchImportMaterials(input.materials, ctx.user.id);
    }),
});
```

### 3.2 BOM管理API

```typescript
// server/routers/bom.ts
export const bomRouter = router({
  // 获取BOM列表
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      projectId: z.number().optional(),
      status: z.enum(["draft", "pending_approval", "approved", "released", "obsolete"]).optional(),
    }))
    .query(async ({ input }) => {
      return getBomHeaders(input);
    }),

  // 获取BOM详情（含明细）
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getBomWithItems(input.id);
    }),

  // 创建BOM
  create: protectedProcedure
    .input(createBomSchema)
    .mutation(async ({ input, ctx }) => {
      return createBom({ ...input, createdBy: ctx.user.id });
    }),

  // 更新BOM
  update: protectedProcedure
    .input(updateBomSchema)
    .mutation(async ({ input }) => {
      return updateBom(input);
    }),

  // 添加BOM明细
  addItem: protectedProcedure
    .input(addBomItemSchema)
    .mutation(async ({ input }) => {
      return addBomItem(input);
    }),

  // 更新BOM明细
  updateItem: protectedProcedure
    .input(updateBomItemSchema)
    .mutation(async ({ input }) => {
      return updateBomItem(input);
    }),

  // 删除BOM明细
  deleteItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteBomItem(input.id);
    }),

  // 提交审批
  submitForApproval: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return submitBomForApproval(input.id, ctx.user.id);
    }),

  // 审批BOM
  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return approveBom(input, ctx.user.id);
    }),

  // 复制BOM
  copy: protectedProcedure
    .input(z.object({
      sourceId: z.number(),
      newName: z.string(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return copyBom(input, ctx.user.id);
    }),

  // AI推荐相似BOM
  aiRecommend: protectedProcedure
    .input(z.object({
      equipmentType: z.string(),
      equipmentModel: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return aiRecommendSimilarBom(input);
    }),

  // 从AI推荐创建BOM
  createFromAiRecommend: protectedProcedure
    .input(z.object({
      sourceBomId: z.number(),
      projectId: z.number(),
      adoptionType: z.enum(["full", "partial"]),
      selectedItems: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createBomFromAiRecommend(input, ctx.user.id);
    }),

  // 生成采购清单
  generatePurchaseList: protectedProcedure
    .input(z.object({ bomId: z.number() }))
    .query(async ({ input }) => {
      return generatePurchaseListFromBom(input.bomId);
    }),
});
```

### 3.3 采购订单API

```typescript
// server/routers/purchase.ts
export const purchaseRouter = router({
  orders: router({
    // 获取采购订单列表
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        projectId: z.number().optional(),
        supplierId: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getPurchaseOrders(input);
      }),

    // 获取订单详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getPurchaseOrderWithItems(input.id);
      }),

    // 从BOM创建采购订单
    createFromBom: protectedProcedure
      .input(z.object({
        bomId: z.number(),
        supplierId: z.number(),
        expectedDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createPurchaseOrderFromBom(input, ctx.user.id);
      }),

    // 确认订单
    confirm: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return confirmPurchaseOrder(input.id, ctx.user.id);
      }),

    // 收货
    receive: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        items: z.array(z.object({
          itemId: z.number(),
          receivedQty: z.number(),
          locationId: z.number(),
          batchNumber: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        return receivePurchaseOrder(input, ctx.user.id);
      }),
  }),

  // 供应商物料映射
  supplierMapping: router({
    // 获取供应商物料映射
    list: protectedProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        materialId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getSupplierMaterialMappings(input);
      }),

    // 创建映射
    create: protectedProcedure
      .input(createMappingSchema)
      .mutation(async ({ input }) => {
        return createSupplierMaterialMapping(input);
      }),

    // 更新映射
    update: protectedProcedure
      .input(updateMappingSchema)
      .mutation(async ({ input }) => {
        return updateSupplierMaterialMapping(input);
      }),
  }),
});
```

### 3.4 仓库管理API

```typescript
// server/routers/warehouse.ts
export const warehouseRouter = router({
  locations: router({
    // 获取位置列表
    list: protectedProcedure
      .input(z.object({
        warehouseCode: z.string().optional(),
        locationType: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getWarehouseLocations(input);
      }),

    // 获取位置详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getWarehouseLocationById(input.id);
      }),

    // 创建位置
    create: protectedProcedure
      .input(createLocationSchema)
      .mutation(async ({ input }) => {
        return createWarehouseLocation(input);
      }),

    // 扫码获取位置信息
    getByQrCode: protectedProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        return getLocationByQrCode(input.qrCode);
      }),

    // 生成位置二维码
    generateQrCode: protectedProcedure
      .input(z.object({ locationId: z.number() }))
      .query(async ({ input }) => {
        return generateLocationQrCode(input.locationId);
      }),
  }),

  inventory: router({
    // 获取库存列表
    list: protectedProcedure
      .input(z.object({
        materialId: z.number().optional(),
        locationId: z.number().optional(),
        projectId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getInventoryRecords(input);
      }),

    // 获取物料库存汇总
    getMaterialSummary: protectedProcedure
      .input(z.object({ materialId: z.number() }))
      .query(async ({ input }) => {
        return getMaterialInventorySummary(input.materialId);
      }),

    // 库存调整
    adjust: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        locationId: z.number(),
        adjustmentQty: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return adjustInventory(input, ctx.user.id);
      }),

    // 库存转移
    transfer: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        fromLocationId: z.number(),
        toLocationId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return transferInventory(input, ctx.user.id);
      }),

    // 生产领料
    issue: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        items: z.array(z.object({
          materialId: z.number(),
          locationId: z.number(),
          quantity: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        return issueInventory(input, ctx.user.id);
      }),
  }),

  transactions: router({
    // 获取事务记录
    list: protectedProcedure
      .input(z.object({
        materialId: z.number().optional(),
        transactionType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return getInventoryTransactions(input);
      }),
  }),

  // 扫码入库
  scanReceive: protectedProcedure
    .input(z.object({
      materialCode: z.string(),
      locationQrCode: z.string(),
      quantity: z.number(),
      poCode: z.string().optional(),
      batchNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return scanAndReceive(input, ctx.user.id);
    }),

  // 扫码获取物料信息和预设位置
  scanMaterial: protectedProcedure
    .input(z.object({
      materialCode: z.string(),
      supplierMaterialCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getMaterialInfoByCode(input);
    }),
});
```

---

## 4. 前端组件设计

### 4.1 页面结构

```
client/src/pages/
├── materials/
│   ├── index.tsx                # 物料列表
│   ├── MaterialDetail.tsx       # 物料详情
│   └── MaterialForm.tsx         # 物料编辑
├── bom/
│   ├── index.tsx                # BOM列表
│   ├── BomDetail.tsx            # BOM详情
│   ├── BomEditor.tsx            # BOM编辑器
│   └── AiBomRecommend.tsx       # AI BOM推荐
├── purchase/
│   ├── index.tsx                # 采购订单列表
│   ├── OrderDetail.tsx          # 订单详情
│   └── ReceiveGoods.tsx         # 收货操作
└── warehouse/
    ├── index.tsx                # 仓库概览
    ├── LocationList.tsx         # 位置列表
    ├── InventoryList.tsx        # 库存列表
    ├── ScanReceive.tsx          # 扫码入库
    └── ScanIssue.tsx            # 扫码领料
```

### 4.2 核心组件示例

```tsx
// client/src/pages/bom/BomEditor.tsx
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles, Copy, Save, Send } from "lucide-react";

interface BomItem {
  id?: number;
  lineNumber: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  positionCode?: string;
  remark?: string;
}

export default function BomEditor({ bomId }: { bomId?: number }) {
  const [bomHeader, setBomHeader] = useState({
    bomName: "",
    projectId: null,
    equipmentName: "",
  });
  const [items, setItems] = useState<BomItem[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showAiRecommend, setShowAiRecommend] = useState(false);

  const { data: bomData } = trpc.bom.get.useQuery(
    { id: bomId! },
    { enabled: !!bomId }
  );

  const createMutation = trpc.bom.create.useMutation();
  const updateMutation = trpc.bom.update.useMutation();
  const addItemMutation = trpc.bom.addItem.useMutation();
  const submitMutation = trpc.bom.submitForApproval.useMutation();
  const aiRecommendQuery = trpc.bom.aiRecommend.useQuery(
    { equipmentType: bomHeader.equipmentName },
    { enabled: false }
  );

  useEffect(() => {
    if (bomData) {
      setBomHeader({
        bomName: bomData.bomName,
        projectId: bomData.projectId,
        equipmentName: bomData.equipmentName,
      });
      setItems(bomData.items);
    }
  }, [bomData]);

  const handleAddItem = (material: any) => {
    const newItem: BomItem = {
      lineNumber: items.length + 1,
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.name,
      quantity: 1,
      unit: material.unit,
      unitPrice: material.priceUnit || 0,
      totalPrice: material.priceUnit || 0,
    };
    setItems([...items, newItem]);
    setShowMaterialPicker(false);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].totalPrice = quantity * newItems[index].unitPrice;
    setItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // 重新编号
    newItems.forEach((item, i) => {
      item.lineNumber = i + 1;
    });
    setItems(newItems);
  };

  const handleAiRecommend = async () => {
    const result = await aiRecommendQuery.refetch();
    if (result.data) {
      setShowAiRecommend(true);
    }
  };

  const handleApplyAiRecommend = (recommendedBom: any, adoptionType: "full" | "partial") => {
    if (adoptionType === "full") {
      // 100%采用
      setItems(recommendedBom.items);
    } else {
      // 局部更新 - 合并
      const mergedItems = [...items];
      recommendedBom.items.forEach((recItem: BomItem) => {
        const existingIndex = mergedItems.findIndex(
          (item) => item.materialId === recItem.materialId
        );
        if (existingIndex === -1) {
          mergedItems.push({
            ...recItem,
            lineNumber: mergedItems.length + 1,
          });
        }
      });
      setItems(mergedItems);
    }
    setShowAiRecommend(false);
  };

  const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {bomId ? "编辑BOM" : "创建BOM"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAiRecommend}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI推荐相似BOM
          </Button>
          <Button variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            复制BOM
          </Button>
        </div>
      </div>

      {/* BOM表头 */}
      <Card>
        <CardHeader>
          <CardTitle>BOM基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">BOM名称</label>
            <Input
              value={bomHeader.bomName}
              onChange={(e) => setBomHeader({ ...bomHeader, bomName: e.target.value })}
              placeholder="输入BOM名称"
            />
          </div>
          <div>
            <label className="text-sm font-medium">设备名称</label>
            <Input
              value={bomHeader.equipmentName}
              onChange={(e) => setBomHeader({ ...bomHeader, equipmentName: e.target.value })}
              placeholder="输入设备名称"
            />
          </div>
          <div>
            <label className="text-sm font-medium">总成本</label>
            <div className="text-2xl font-bold text-primary">
              ¥{totalCost.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM明细 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>BOM明细 ({items.length}项)</CardTitle>
          <Button onClick={() => setShowMaterialPicker(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加物料
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">行号</TableHead>
                <TableHead>物料编号</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead className="w-24">数量</TableHead>
                <TableHead className="w-20">单位</TableHead>
                <TableHead className="w-28">单价</TableHead>
                <TableHead className="w-28">总价</TableHead>
                <TableHead>装配位置</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.lineNumber}</TableCell>
                  <TableCell className="font-mono">{item.materialCode}</TableCell>
                  <TableCell>{item.materialName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>¥{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>¥{item.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      value={item.positionCode || ""}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].positionCode = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="位置代码"
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    暂无物料，点击"添加物料"或使用"AI推荐相似BOM"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          <Save className="mr-2 h-4 w-4" />
          保存草稿
        </Button>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          提交审批
        </Button>
      </div>

      {/* AI推荐对话框 */}
      <Dialog open={showAiRecommend} onOpenChange={setShowAiRecommend}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI推荐相似BOM</DialogTitle>
          </DialogHeader>
          {/* AI推荐内容 */}
          <div className="space-y-4">
            <p className="text-muted-foreground">
              根据设备类型"{bomHeader.equipmentName}"，AI推荐以下相似BOM：
            </p>
            {/* 推荐BOM列表 */}
            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={() => handleApplyAiRecommend(aiRecommendQuery.data, "partial")}>
                局部更新
              </Button>
              <Button onClick={() => handleApplyAiRecommend(aiRecommendQuery.data, "full")}>
                100%采用
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 5. 扫码功能设计

### 5.1 扫码入库流程

```
供应商送货 → 扫描物料条码 → 获取物料信息和预设位置 → 确认数量 → 扫描料位二维码 → 确认入库
```

### 5.2 扫码组件

```tsx
// client/src/components/Scanner.tsx
import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X } from "lucide-react";

interface ScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const startScanning = async () => {
    const scanner = new Html5Qrcode("scanner-container");
    scannerRef.current = scanner;
    
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop();
          setIsScanning(false);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">扫描条码/二维码</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div id="scanner-container" className="w-full aspect-square bg-muted rounded-lg overflow-hidden">
          {!isScanning && (
            <div className="w-full h-full flex items-center justify-center">
              <Button onClick={startScanning}>
                <Camera className="mr-2 h-4 w-4" />
                开始扫描
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. 实施步骤

### 6.1 Phase 1: 物料主数据（8小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1.1 | 创建物料相关Schema | 2小时 |
| 1.2 | 实现物料CRUD API | 2小时 |
| 1.3 | 创建物料列表和编辑页面 | 3小时 |
| 1.4 | 编写单元测试 | 1小时 |

### 6.2 Phase 2: BOM管理（10小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 2.1 | 创建BOM相关Schema | 2小时 |
| 2.2 | 实现BOM CRUD API | 3小时 |
| 2.3 | 实现AI推荐BOM功能 | 2小时 |
| 2.4 | 创建BOM编辑器页面 | 2小时 |
| 2.5 | 编写单元测试 | 1小时 |

### 6.3 Phase 3: 采购管理（8小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 3.1 | 创建采购相关Schema | 2小时 |
| 3.2 | 实现采购订单API | 2小时 |
| 3.3 | 实现供应商物料映射 | 1.5小时 |
| 3.4 | 创建采购订单页面 | 2小时 |
| 3.5 | 编写单元测试 | 0.5小时 |

### 6.4 Phase 4: 仓库管理（9小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 4.1 | 创建仓库相关Schema | 2小时 |
| 4.2 | 实现库存管理API | 2小时 |
| 4.3 | 实现扫码入库/领料功能 | 2小时 |
| 4.4 | 创建仓库管理页面 | 2小时 |
| 4.5 | 编写单元测试 | 1小时 |

---

## 7. 验收标准

### 7.1 功能验收

- [ ] 可以创建、编辑、删除物料
- [ ] 物料编号自动生成且唯一
- [ ] 可以创建、编辑BOM
- [ ] 可以使用AI推荐相似BOM
- [ ] 支持100%采用、局部更新、全部更新BOM
- [ ] 可以从BOM生成采购订单
- [ ] 供应商物料号与内部物料号正确映射
- [ ] 扫码入库功能正常
- [ ] 库存实时更新
- [ ] 库存事务记录完整

### 7.2 测试覆盖

- [ ] 物料CRUD测试通过
- [ ] BOM操作测试通过
- [ ] 采购订单流程测试通过
- [ ] 库存事务测试通过
- [ ] 扫码功能测试通过

---

## 8. 检查清单

### 8.1 实施前检查

- [ ] 阅读并理解本规划文档
- [ ] 确认开发环境正常
- [ ] 确认数据库连接正常

### 8.2 实施中检查

- [ ] 每完成一个步骤运行 `npx tsc`
- [ ] 每完成一个Phase运行 `pnpm test`
- [ ] 及时更新 `todo.md`

### 8.3 实施后检查

- [ ] 所有测试通过
- [ ] 功能验收通过
- [ ] 代码已提交

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI
