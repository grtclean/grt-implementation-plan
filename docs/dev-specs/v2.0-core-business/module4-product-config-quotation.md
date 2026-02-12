# 模块4：产品配置与报价系统

**模块代码**: PRODUCT-CONFIG-QUOTATION  
**优先级**: P1  
**预计工时**: 18-22小时  
**依赖模块**: BOM-MATERIAL  
**实施方**: Claude Code

---

## 1. 业务背景

### 1.1 业务场景

GRT作为工业清洗设备供应商，需要一套完整的产品配置与报价系统来支持：

1. **年度成本基准管理** - 设定人员工时成本、管理费用分摊等年度基准数据
2. **产品配置管理** - 管理设备选配项、可选模块、配件组合
3. **智能报价生成** - 根据客户需求自动生成报价单
4. **历史报价参考** - 参照历史案例进行报价优化

### 1.2 成本构成模型

```
设备报价 = 直接材料成本 + 直接人工成本 + 制造费用 + 管理费用 + 利润
         = BOM成本 + (工时 × 工时单价) + 制造费用分摊 + 管理费用分摊 + 利润率
```

| 成本项目 | 计算方式 | 更新频率 |
|----------|----------|----------|
| 直接材料成本 | BOM物料成本汇总 | 实时（随采购价变动） |
| 直接人工成本 | 工时 × 工时单价 | 年度调整 |
| 制造费用 | 按比例分摊 | 年度调整 |
| 管理费用 | 按比例分摊 | 年度调整 |
| 利润 | 成本 × 利润率 | 项目定价 |

### 1.3 核心功能

1. **年度成本基准配置** - 管理员设定年度工时单价、费用分摊比例
2. **产品配置器** - 选择设备型号、配置选项、可选模块
3. **BOM成本计算** - 自动计算物料成本
4. **报价单生成** - 生成专业报价单（含明细/汇总）
5. **报价审批流程** - 支持多级审批
6. **历史报价分析** - 报价成功率、利润分析

---

## 2. 数据库Schema设计

### 2.1 年度成本基准表 (annual_cost_standards)

```sql
-- 年度成本基准表 - 管理员每年设定一次
CREATE TABLE annual_cost_standards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 年度
    fiscal_year INT NOT NULL COMMENT '财年，如：2026',
    
    -- 人工成本基准
    labor_cost_per_hour DECIMAL(10,2) NOT NULL COMMENT '人工工时单价（元/小时）',
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.50 COMMENT '加班工时倍率',
    
    -- 各岗位工时单价（可选细分）
    engineer_hourly_rate DECIMAL(10,2) COMMENT '工程师工时单价',
    technician_hourly_rate DECIMAL(10,2) COMMENT '技术员工时单价',
    operator_hourly_rate DECIMAL(10,2) COMMENT '操作员工时单价',
    
    -- 费用分摊比例
    manufacturing_overhead_rate DECIMAL(5,4) NOT NULL COMMENT '制造费用分摊率（如0.15表示15%）',
    admin_overhead_rate DECIMAL(5,4) NOT NULL COMMENT '管理费用分摊率',
    sales_overhead_rate DECIMAL(5,4) NOT NULL COMMENT '销售费用分摊率',
    
    -- 默认利润率
    default_profit_margin DECIMAL(5,4) DEFAULT 0.20 COMMENT '默认利润率',
    min_profit_margin DECIMAL(5,4) DEFAULT 0.10 COMMENT '最低利润率',
    
    -- 其他成本
    warranty_reserve_rate DECIMAL(5,4) DEFAULT 0.02 COMMENT '质保预留率',
    contingency_rate DECIMAL(5,4) DEFAULT 0.05 COMMENT '风险预留率',
    
    -- 状态
    status ENUM('draft', 'active', 'archived') DEFAULT 'draft',
    is_current BOOLEAN DEFAULT FALSE COMMENT '是否为当前生效版本',
    
    -- 审批
    approved_by INT COMMENT '审批人',
    approved_at TIMESTAMP COMMENT '审批时间',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_year (fiscal_year),
    INDEX idx_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='年度成本基准表';
```

### 2.2 产品配置模板表 (product_configurations)

```sql
-- 产品配置模板表
CREATE TABLE product_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 产品信息
    product_code VARCHAR(32) UNIQUE NOT NULL COMMENT '产品配置编号',
    product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
    product_category ENUM(
        'standard_cleaner',     -- 标准清洗机
        'ultrasonic_cleaner',   -- 超声波清洗机
        'spray_cleaner',        -- 喷淋清洗机
        'vacuum_cleaner',       -- 真空清洗机
        'custom_cleaner'        -- 定制清洗机
    ) NOT NULL COMMENT '产品类别',
    
    -- 基础配置
    base_model VARCHAR(50) COMMENT '基础型号',
    description TEXT COMMENT '产品描述',
    
    -- 技术参数
    specifications JSON COMMENT '技术规格参数',
    /*
    specifications格式：
    {
      "workpieceSize": { "length": 500, "width": 300, "height": 200 },
      "tankVolume": 200,
      "cleaningCapacity": 50,
      "cycleTime": 180,
      "powerConsumption": 15
    }
    */
    
    -- 关联BOM
    base_bom_id INT COMMENT '基础BOM ID',
    
    -- 可选配置项
    optional_modules JSON COMMENT '可选模块列表',
    /*
    optional_modules格式：
    [
      {
        "moduleCode": "MOD-DRY-001",
        "moduleName": "热风干燥系统",
        "description": "高效热风干燥",
        "bomId": 123,
        "additionalCost": 15000,
        "additionalHours": 8
      }
    ]
    */
    
    -- 配置选项
    configuration_options JSON COMMENT '配置选项',
    /*
    configuration_options格式：
    [
      {
        "optionGroup": "清洗槽数量",
        "options": [
          { "value": 3, "label": "3槽", "priceAdjustment": 0 },
          { "value": 5, "label": "5槽", "priceAdjustment": 20000 },
          { "value": 7, "label": "7槽", "priceAdjustment": 40000 }
        ]
      }
    ]
    */
    
    -- 标准工时
    standard_design_hours DECIMAL(10,2) COMMENT '标准设计工时',
    standard_assembly_hours DECIMAL(10,2) COMMENT '标准装配工时',
    standard_testing_hours DECIMAL(10,2) COMMENT '标准测试工时',
    
    -- 状态
    status ENUM('draft', 'active', 'discontinued') DEFAULT 'active',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (product_category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品配置模板表';
```

### 2.3 报价单表 (quotations)

```sql
-- 报价单表
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 报价单号
    quotation_number VARCHAR(32) UNIQUE NOT NULL COMMENT '报价单号，如：QT-2026-0001',
    
    -- 关联信息
    project_id INT COMMENT '关联项目ID',
    customer_id INT COMMENT '客户ID',
    opportunity_id INT COMMENT '商机ID',
    
    -- 报价版本
    version INT DEFAULT 1 COMMENT '版本号',
    parent_quotation_id INT COMMENT '父报价单ID（修订时）',
    
    -- 客户信息
    customer_name VARCHAR(200) NOT NULL COMMENT '客户名称',
    customer_contact VARCHAR(100) COMMENT '客户联系人',
    customer_phone VARCHAR(50) COMMENT '联系电话',
    customer_email VARCHAR(100) COMMENT '邮箱',
    
    -- 产品配置
    product_configuration_id INT COMMENT '产品配置模板ID',
    selected_options JSON COMMENT '选择的配置选项',
    selected_modules JSON COMMENT '选择的可选模块',
    custom_requirements TEXT COMMENT '定制需求说明',
    
    -- 关联BOM
    quotation_bom_id INT COMMENT '报价BOM ID',
    
    -- 成本明细
    material_cost DECIMAL(12,2) DEFAULT 0 COMMENT '物料成本',
    labor_cost DECIMAL(12,2) DEFAULT 0 COMMENT '人工成本',
    manufacturing_overhead DECIMAL(12,2) DEFAULT 0 COMMENT '制造费用',
    admin_overhead DECIMAL(12,2) DEFAULT 0 COMMENT '管理费用',
    sales_overhead DECIMAL(12,2) DEFAULT 0 COMMENT '销售费用',
    warranty_reserve DECIMAL(12,2) DEFAULT 0 COMMENT '质保预留',
    contingency DECIMAL(12,2) DEFAULT 0 COMMENT '风险预留',
    
    -- 汇总
    total_cost DECIMAL(12,2) DEFAULT 0 COMMENT '总成本',
    profit_margin DECIMAL(5,4) COMMENT '利润率',
    profit_amount DECIMAL(12,2) DEFAULT 0 COMMENT '利润金额',
    
    -- 报价金额
    subtotal DECIMAL(12,2) DEFAULT 0 COMMENT '小计（不含税）',
    tax_rate DECIMAL(5,4) DEFAULT 0.13 COMMENT '税率',
    tax_amount DECIMAL(12,2) DEFAULT 0 COMMENT '税额',
    total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额（含税）',
    
    -- 工时明细
    design_hours DECIMAL(10,2) DEFAULT 0 COMMENT '设计工时',
    assembly_hours DECIMAL(10,2) DEFAULT 0 COMMENT '装配工时',
    testing_hours DECIMAL(10,2) DEFAULT 0 COMMENT '测试工时',
    total_hours DECIMAL(10,2) DEFAULT 0 COMMENT '总工时',
    
    -- 交付信息
    delivery_days INT COMMENT '交货周期（天）',
    delivery_terms VARCHAR(200) COMMENT '交货条款',
    payment_terms VARCHAR(200) COMMENT '付款条款',
    warranty_terms VARCHAR(200) COMMENT '质保条款',
    
    -- 有效期
    valid_from DATE COMMENT '报价有效期起',
    valid_until DATE COMMENT '报价有效期止',
    
    -- 状态
    status ENUM(
        'draft',        -- 草稿
        'pending',      -- 待审批
        'approved',     -- 已审批
        'sent',         -- 已发送
        'accepted',     -- 已接受
        'rejected',     -- 已拒绝
        'expired',      -- 已过期
        'cancelled'     -- 已取消
    ) DEFAULT 'draft',
    
    -- 审批
    submitted_by INT COMMENT '提交人',
    submitted_at TIMESTAMP COMMENT '提交时间',
    approved_by INT COMMENT '审批人',
    approved_at TIMESTAMP COMMENT '审批时间',
    approval_comments TEXT COMMENT '审批意见',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer (customer_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价单表';
```

### 2.4 报价单明细表 (quotation_items)

```sql
-- 报价单明细表
CREATE TABLE quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL COMMENT '报价单ID',
    
    -- 明细类型
    item_type ENUM(
        'base_product',     -- 基础产品
        'optional_module',  -- 可选模块
        'accessory',        -- 配件
        'service',          -- 服务
        'custom'            -- 定制项
    ) NOT NULL,
    
    -- 明细信息
    item_code VARCHAR(32) COMMENT '项目编号',
    item_name VARCHAR(200) NOT NULL COMMENT '项目名称',
    description TEXT COMMENT '描述',
    
    -- 数量和单价
    quantity DECIMAL(10,2) DEFAULT 1 COMMENT '数量',
    unit VARCHAR(20) DEFAULT '台' COMMENT '单位',
    unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
    
    -- 成本
    material_cost DECIMAL(12,2) DEFAULT 0 COMMENT '物料成本',
    labor_cost DECIMAL(12,2) DEFAULT 0 COMMENT '人工成本',
    labor_hours DECIMAL(10,2) DEFAULT 0 COMMENT '工时',
    
    -- 金额
    amount DECIMAL(12,2) DEFAULT 0 COMMENT '金额',
    
    -- 关联BOM
    bom_id INT COMMENT '关联BOM ID',
    
    -- 排序
    sort_order INT DEFAULT 0 COMMENT '排序',
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_quotation (quotation_id),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价单明细表';
```

### 2.5 Drizzle Schema定义

```typescript
// drizzle/schema/quotation.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  date,
} from "drizzle-orm/mysql-core";

/**
 * 年度成本基准表
 */
export const annualCostStandards = mysqlTable("annual_cost_standards", {
  id: int("id").autoincrement().primaryKey(),
  fiscalYear: int("fiscal_year").notNull(),
  
  // 人工成本
  laborCostPerHour: decimal("labor_cost_per_hour", { precision: 10, scale: 2 }).notNull(),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.50"),
  engineerHourlyRate: decimal("engineer_hourly_rate", { precision: 10, scale: 2 }),
  technicianHourlyRate: decimal("technician_hourly_rate", { precision: 10, scale: 2 }),
  operatorHourlyRate: decimal("operator_hourly_rate", { precision: 10, scale: 2 }),
  
  // 费用分摊
  manufacturingOverheadRate: decimal("manufacturing_overhead_rate", { precision: 5, scale: 4 }).notNull(),
  adminOverheadRate: decimal("admin_overhead_rate", { precision: 5, scale: 4 }).notNull(),
  salesOverheadRate: decimal("sales_overhead_rate", { precision: 5, scale: 4 }).notNull(),
  
  // 利润率
  defaultProfitMargin: decimal("default_profit_margin", { precision: 5, scale: 4 }).default("0.20"),
  minProfitMargin: decimal("min_profit_margin", { precision: 5, scale: 4 }).default("0.10"),
  
  // 其他
  warrantyReserveRate: decimal("warranty_reserve_rate", { precision: 5, scale: 4 }).default("0.02"),
  contingencyRate: decimal("contingency_rate", { precision: 5, scale: 4 }).default("0.05"),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft"),
  isCurrent: boolean("is_current").default(false),
  
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AnnualCostStandard = typeof annualCostStandards.$inferSelect;
export type InsertAnnualCostStandard = typeof annualCostStandards.$inferInsert;

/**
 * 产品配置模板表
 */
export const productConfigurations = mysqlTable("product_configurations", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("product_code", { length: 32 }).unique().notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productCategory: mysqlEnum("product_category", [
    "standard_cleaner", "ultrasonic_cleaner", "spray_cleaner",
    "vacuum_cleaner", "custom_cleaner"
  ]).notNull(),
  
  baseModel: varchar("base_model", { length: 50 }),
  description: text("description"),
  specifications: json("specifications"),
  
  baseBomId: int("base_bom_id"),
  optionalModules: json("optional_modules"),
  configurationOptions: json("configuration_options"),
  
  standardDesignHours: decimal("standard_design_hours", { precision: 10, scale: 2 }),
  standardAssemblyHours: decimal("standard_assembly_hours", { precision: 10, scale: 2 }),
  standardTestingHours: decimal("standard_testing_hours", { precision: 10, scale: 2 }),
  
  status: mysqlEnum("status", ["draft", "active", "discontinued"]).default("active"),
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProductConfiguration = typeof productConfigurations.$inferSelect;
export type InsertProductConfiguration = typeof productConfigurations.$inferInsert;

/**
 * 报价单表
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotation_number", { length: 32 }).unique().notNull(),
  
  projectId: int("project_id"),
  customerId: int("customer_id"),
  opportunityId: int("opportunity_id"),
  
  version: int("version").default(1),
  parentQuotationId: int("parent_quotation_id"),
  
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerContact: varchar("customer_contact", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 100 }),
  
  productConfigurationId: int("product_configuration_id"),
  selectedOptions: json("selected_options"),
  selectedModules: json("selected_modules"),
  customRequirements: text("custom_requirements"),
  
  quotationBomId: int("quotation_bom_id"),
  
  // 成本
  materialCost: decimal("material_cost", { precision: 12, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
  manufacturingOverhead: decimal("manufacturing_overhead", { precision: 12, scale: 2 }).default("0"),
  adminOverhead: decimal("admin_overhead", { precision: 12, scale: 2 }).default("0"),
  salesOverhead: decimal("sales_overhead", { precision: 12, scale: 2 }).default("0"),
  warrantyReserve: decimal("warranty_reserve", { precision: 12, scale: 2 }).default("0"),
  contingency: decimal("contingency", { precision: 12, scale: 2 }).default("0"),
  
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 4 }),
  profitAmount: decimal("profit_amount", { precision: 12, scale: 2 }).default("0"),
  
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0.13"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  
  designHours: decimal("design_hours", { precision: 10, scale: 2 }).default("0"),
  assemblyHours: decimal("assembly_hours", { precision: 10, scale: 2 }).default("0"),
  testingHours: decimal("testing_hours", { precision: 10, scale: 2 }).default("0"),
  totalHours: decimal("total_hours", { precision: 10, scale: 2 }).default("0"),
  
  deliveryDays: int("delivery_days"),
  deliveryTerms: varchar("delivery_terms", { length: 200 }),
  paymentTerms: varchar("payment_terms", { length: 200 }),
  warrantyTerms: varchar("warranty_terms", { length: 200 }),
  
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  
  status: mysqlEnum("status", [
    "draft", "pending", "approved", "sent",
    "accepted", "rejected", "expired", "cancelled"
  ]).default("draft"),
  
  submittedBy: int("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalComments: text("approval_comments"),
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * 报价单明细表
 */
export const quotationItems = mysqlTable("quotation_items", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotation_id").notNull(),
  
  itemType: mysqlEnum("item_type", [
    "base_product", "optional_module", "accessory", "service", "custom"
  ]).notNull(),
  
  itemCode: varchar("item_code", { length: 32 }),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  description: text("description"),
  
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unit: varchar("unit", { length: 20 }).default("台"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).default("0"),
  
  materialCost: decimal("material_cost", { precision: 12, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
  laborHours: decimal("labor_hours", { precision: 10, scale: 2 }).default("0"),
  
  amount: decimal("amount", { precision: 12, scale: 2 }).default("0"),
  
  bomId: int("bom_id"),
  sortOrder: int("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;
```

---

## 3. API路由设计

### 3.1 年度成本基准API

```typescript
// server/routers/costStandard.ts
export const costStandardRouter = router({
  // 获取当前生效的成本基准
  getCurrent: protectedProcedure.query(async () => {
    return getCurrentCostStandard();
  }),

  // 获取所有年度成本基准
  list: protectedProcedure.query(async () => {
    return getAllCostStandards();
  }),

  // 获取指定年度的成本基准
  getByYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      return getCostStandardByYear(input.year);
    }),

  // 创建年度成本基准（管理员）
  create: adminProcedure
    .input(createCostStandardSchema)
    .mutation(async ({ input, ctx }) => {
      return createCostStandard({ ...input, createdBy: ctx.user.id });
    }),

  // 更新年度成本基准（管理员）
  update: adminProcedure
    .input(updateCostStandardSchema)
    .mutation(async ({ input }) => {
      return updateCostStandard(input);
    }),

  // 激活年度成本基准（管理员）
  activate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return activateCostStandard(input.id, ctx.user.id);
    }),
});
```

### 3.2 产品配置API

```typescript
// server/routers/productConfig.ts
export const productConfigRouter = router({
  // 获取产品配置列表
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getProductConfigurations(input);
    }),

  // 获取产品配置详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getProductConfigurationById(input.id);
    }),

  // 创建产品配置
  create: protectedProcedure
    .input(createProductConfigSchema)
    .mutation(async ({ input, ctx }) => {
      return createProductConfiguration({ ...input, createdBy: ctx.user.id });
    }),

  // 更新产品配置
  update: protectedProcedure
    .input(updateProductConfigSchema)
    .mutation(async ({ input }) => {
      return updateProductConfiguration(input);
    }),

  // 计算配置成本
  calculateCost: protectedProcedure
    .input(z.object({
      configurationId: z.number(),
      selectedOptions: z.array(z.any()),
      selectedModules: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      return calculateConfigurationCost(input);
    }),
});
```

### 3.3 报价单API

```typescript
// server/routers/quotation.ts
export const quotationRouter = router({
  // 获取报价单列表
  list: protectedProcedure
    .input(z.object({
      customerId: z.number().optional(),
      projectId: z.number().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return getQuotations(input);
    }),

  // 获取报价单详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getQuotationById(input.id);
    }),

  // 创建报价单
  create: protectedProcedure
    .input(createQuotationSchema)
    .mutation(async ({ input, ctx }) => {
      return createQuotation({ ...input, createdBy: ctx.user.id });
    }),

  // 更新报价单
  update: protectedProcedure
    .input(updateQuotationSchema)
    .mutation(async ({ input }) => {
      return updateQuotation(input);
    }),

  // 计算报价
  calculate: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
      profitMargin: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return calculateQuotation(input);
    }),

  // 提交审批
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return submitQuotation(input.id, ctx.user.id);
    }),

  // 审批报价单
  approve: adminProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return approveQuotation(input, ctx.user.id);
    }),

  // 发送报价单
  send: protectedProcedure
    .input(z.object({
      id: z.number(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      return sendQuotation(input);
    }),

  // 复制报价单（创建新版本）
  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return duplicateQuotation(input.id, ctx.user.id);
    }),

  // 导出报价单PDF
  exportPdf: protectedProcedure
    .input(z.object({
      id: z.number(),
      template: z.enum(["detailed", "summary"]).default("detailed"),
    }))
    .mutation(async ({ input }) => {
      return exportQuotationPdf(input);
    }),

  // 报价分析
  analytics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getQuotationAnalytics(input);
    }),
});
```

### 3.4 报价计算核心函数

```typescript
// server/services/quotationCalculator.ts

interface QuotationCalculationInput {
  quotationId: number;
  profitMargin?: number;
}

interface QuotationCalculationResult {
  materialCost: number;
  laborCost: number;
  manufacturingOverhead: number;
  adminOverhead: number;
  salesOverhead: number;
  warrantyReserve: number;
  contingency: number;
  totalCost: number;
  profitAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  breakdown: QuotationItemBreakdown[];
}

export async function calculateQuotation(
  input: QuotationCalculationInput
): Promise<QuotationCalculationResult> {
  // 1. 获取报价单信息
  const quotation = await getQuotationById(input.quotationId);
  
  // 2. 获取当前成本基准
  const costStandard = await getCurrentCostStandard();
  if (!costStandard) {
    throw new Error("未设置年度成本基准");
  }
  
  // 3. 计算物料成本（从BOM）
  let materialCost = 0;
  if (quotation.quotationBomId) {
    const bomCost = await calculateBomCost(quotation.quotationBomId);
    materialCost = bomCost.totalCost;
  }
  
  // 4. 计算人工成本
  const totalHours = 
    Number(quotation.designHours || 0) +
    Number(quotation.assemblyHours || 0) +
    Number(quotation.testingHours || 0);
  
  const laborCost = totalHours * Number(costStandard.laborCostPerHour);
  
  // 5. 计算各项费用分摊
  const directCost = materialCost + laborCost;
  const manufacturingOverhead = directCost * Number(costStandard.manufacturingOverheadRate);
  const adminOverhead = directCost * Number(costStandard.adminOverheadRate);
  const salesOverhead = directCost * Number(costStandard.salesOverheadRate);
  
  // 6. 计算预留
  const baseCost = directCost + manufacturingOverhead + adminOverhead + salesOverhead;
  const warrantyReserve = baseCost * Number(costStandard.warrantyReserveRate);
  const contingency = baseCost * Number(costStandard.contingencyRate);
  
  // 7. 计算总成本
  const totalCost = baseCost + warrantyReserve + contingency;
  
  // 8. 计算利润
  const profitMargin = input.profitMargin ?? Number(costStandard.defaultProfitMargin);
  const profitAmount = totalCost * profitMargin;
  
  // 9. 计算报价金额
  const subtotal = totalCost + profitAmount;
  const taxRate = Number(quotation.taxRate || 0.13);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  
  // 10. 更新报价单
  await updateQuotationCosts(input.quotationId, {
    materialCost,
    laborCost,
    manufacturingOverhead,
    adminOverhead,
    salesOverhead,
    warrantyReserve,
    contingency,
    totalCost,
    profitMargin,
    profitAmount,
    subtotal,
    taxAmount,
    totalAmount,
    totalHours,
  });
  
  return {
    materialCost,
    laborCost,
    manufacturingOverhead,
    adminOverhead,
    salesOverhead,
    warrantyReserve,
    contingency,
    totalCost,
    profitAmount,
    subtotal,
    taxAmount,
    totalAmount,
    breakdown: [], // 明细分解
  };
}
```

---

## 4. 前端组件设计

### 4.1 页面结构

```
client/src/pages/
├── settings/
│   └── cost-standards.tsx       # 年度成本基准设置
├── products/
│   ├── index.tsx                # 产品配置列表
│   ├── [id].tsx                 # 产品配置详情
│   └── configurator.tsx         # 产品配置器
├── quotations/
│   ├── index.tsx                # 报价单列表
│   ├── [id].tsx                 # 报价单详情
│   ├── create.tsx               # 创建报价单
│   └── analytics.tsx            # 报价分析
```

### 4.2 核心组件示例

```tsx
// client/src/pages/quotations/create.tsx
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator, FileText, Send } from "lucide-react";
import { toast } from "sonner";

export default function CreateQuotation() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: "",
    customerContact: "",
    customerPhone: "",
    customerEmail: "",
    productConfigurationId: null as number | null,
    selectedOptions: [] as any[],
    selectedModules: [] as number[],
    customRequirements: "",
    profitMargin: 0.20,
  });

  const { data: products } = trpc.productConfig.list.useQuery({ status: "active" });
  const { data: selectedProduct } = trpc.productConfig.get.useQuery(
    { id: formData.productConfigurationId! },
    { enabled: !!formData.productConfigurationId }
  );
  const { data: costPreview } = trpc.productConfig.calculateCost.useQuery(
    {
      configurationId: formData.productConfigurationId!,
      selectedOptions: formData.selectedOptions,
      selectedModules: formData.selectedModules,
    },
    { enabled: !!formData.productConfigurationId }
  );

  const createMutation = trpc.quotation.create.useMutation();
  const calculateMutation = trpc.quotation.calculate.useMutation();

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync(formData);
    await calculateMutation.mutateAsync({
      quotationId: result.id,
      profitMargin: formData.profitMargin,
    });
    toast.success("报价单创建成功");
    navigate(`/quotations/${result.id}`);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">创建报价单</h1>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-4 mb-8">
        {["客户信息", "产品配置", "成本预览", "确认创建"].map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step > index + 1 ? "bg-primary text-primary-foreground" : 
                step === index + 1 ? "bg-primary text-primary-foreground" : 
                "bg-muted text-muted-foreground"}`}>
              {index + 1}
            </div>
            <span className={step === index + 1 ? "font-medium" : "text-muted-foreground"}>
              {label}
            </span>
            {index < 3 && <div className="w-12 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: 客户信息 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>客户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>客户名称 *</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="请输入客户名称"
                />
              </div>
              <div className="space-y-2">
                <Label>联系人</Label>
                <Input
                  value={formData.customerContact}
                  onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                  placeholder="请输入联系人"
                />
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="请输入联系电话"
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!formData.customerName}>
                下一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 产品配置 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>产品配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 产品选择 */}
            <div className="space-y-2">
              <Label>选择产品 *</Label>
              <Select
                value={formData.productConfigurationId?.toString()}
                onValueChange={(v) => setFormData({
                  ...formData,
                  productConfigurationId: Number(v),
                  selectedOptions: [],
                  selectedModules: [],
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择产品" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.productName} ({product.productCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 配置选项 */}
            {selectedProduct?.configurationOptions && (
              <div className="space-y-4">
                <h3 className="font-medium">配置选项</h3>
                {(selectedProduct.configurationOptions as any[]).map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-2">
                    <Label>{group.optionGroup}</Label>
                    <Select
                      value={formData.selectedOptions[groupIndex]?.value?.toString()}
                      onValueChange={(v) => {
                        const newOptions = [...formData.selectedOptions];
                        newOptions[groupIndex] = {
                          group: group.optionGroup,
                          value: v,
                          option: group.options.find((o: any) => o.value.toString() === v),
                        };
                        setFormData({ ...formData, selectedOptions: newOptions });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.options.map((option: any, optIndex: number) => (
                          <SelectItem key={optIndex} value={option.value.toString()}>
                            {option.label}
                            {option.priceAdjustment > 0 && ` (+¥${option.priceAdjustment.toLocaleString()})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {/* 可选模块 */}
            {selectedProduct?.optionalModules && (
              <div className="space-y-4">
                <h3 className="font-medium">可选模块</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(selectedProduct.optionalModules as any[]).map((module) => (
                    <div key={module.moduleCode} className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        checked={formData.selectedModules.includes(module.bomId)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedModules: [...formData.selectedModules, module.bomId],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedModules: formData.selectedModules.filter(id => id !== module.bomId),
                            });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{module.moduleName}</p>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        <p className="text-sm text-primary mt-1">
                          +¥{module.additionalCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
              <Button onClick={() => setStep(3)} disabled={!formData.productConfigurationId}>
                下一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 成本预览 */}
      {step === 3 && costPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              成本预览
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">成本构成</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">物料成本</span>
                    <span>¥{costPreview.materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">人工成本</span>
                    <span>¥{costPreview.laborCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">制造费用</span>
                    <span>¥{costPreview.manufacturingOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">管理费用</span>
                    <span>¥{costPreview.adminOverhead.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>总成本</span>
                    <span>¥{costPreview.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">报价设置</h3>
                <div className="space-y-2">
                  <Label>利润率</Label>
                  <Select
                    value={formData.profitMargin.toString()}
                    onValueChange={(v) => setFormData({ ...formData, profitMargin: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.15">15%</SelectItem>
                      <SelectItem value="0.20">20%</SelectItem>
                      <SelectItem value="0.25">25%</SelectItem>
                      <SelectItem value="0.30">30%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span>预估报价</span>
                    <span className="text-primary">
                      ¥{(costPreview.totalCost * (1 + formData.profitMargin) * 1.13).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">含13%增值税</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
              <Button onClick={() => setStep(4)}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: 确认创建 */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              确认创建
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">客户信息</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-24 text-muted-foreground">客户名称</dt>
                    <dd>{formData.customerName}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted-foreground">联系人</dt>
                    <dd>{formData.customerContact || "-"}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted-foreground">联系电话</dt>
                    <dd>{formData.customerPhone || "-"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="font-medium mb-4">产品配置</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-24 text-muted-foreground">产品</dt>
                    <dd>{selectedProduct?.productName}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted-foreground">可选模块</dt>
                    <dd>{formData.selectedModules.length}个</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>上一步</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                <Send className="mr-2 h-4 w-4" />
                创建报价单
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 5. 实施步骤

### 5.1 Phase 1: 数据库和基础API（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1.1 | 创建年度成本基准Schema | 1小时 |
| 1.2 | 创建产品配置Schema | 1.5小时 |
| 1.3 | 创建报价单Schema | 2小时 |
| 1.4 | 运行 `pnpm db:push` 同步数据库 | 0.5小时 |
| 1.5 | 创建数据库操作函数 | 1小时 |

### 5.2 Phase 2: 成本计算和报价API（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 2.1 | 实现年度成本基准API | 1.5小时 |
| 2.2 | 实现产品配置API | 1.5小时 |
| 2.3 | 实现报价计算核心函数 | 2小时 |
| 2.4 | 实现报价单CRUD API | 1小时 |

### 5.3 Phase 3: 前端页面（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 3.1 | 创建年度成本基准设置页面 | 1.5小时 |
| 3.2 | 创建产品配置管理页面 | 1.5小时 |
| 3.3 | 创建报价单创建向导 | 2小时 |
| 3.4 | 创建报价单列表和详情页面 | 1小时 |

### 5.4 Phase 4: 高级功能（4小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 4.1 | 实现报价单PDF导出 | 1.5小时 |
| 4.2 | 实现报价分析仪表盘 | 1.5小时 |
| 4.3 | 编写单元测试 | 1小时 |

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 管理员可以设置年度成本基准
- [ ] 可以创建和管理产品配置模板
- [ ] 可以通过向导创建报价单
- [ ] 报价计算正确（物料+人工+费用分摊+利润）
- [ ] 支持报价单审批流程
- [ ] 可以导出报价单PDF
- [ ] 报价分析数据正确

### 6.2 测试覆盖

- [ ] 年度成本基准CRUD测试通过
- [ ] 产品配置CRUD测试通过
- [ ] 报价计算测试通过
- [ ] 报价单流程测试通过

---

## 7. 检查清单

### 7.1 实施前检查

- [ ] 阅读并理解本规划文档
- [ ] 确认BOM-MATERIAL模块已实现
- [ ] 确认年度成本基准数据已准备

### 7.2 实施中检查

- [ ] 每完成一个步骤运行 `npx tsc`
- [ ] 每完成一个Phase运行 `pnpm test`
- [ ] 及时更新 `todo.md`

### 7.3 实施后检查

- [ ] 所有测试通过
- [ ] 功能验收通过
- [ ] 代码已提交

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI
