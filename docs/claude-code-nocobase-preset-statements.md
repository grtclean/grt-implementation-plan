# Claude Code NocoBase预设语句规范

**版本**: v1.0  
**作者**: Manus AI  
**日期**: 2026-01-18  
**适用范围**: GRT智能系统AI-AI架构实施

---

## 目录

1. [概述](#1-概述)
2. [数据分层架构](#2-数据分层架构)
3. [SEO友好的公开内容预设](#3-seo友好的公开内容预设)
4. [核心IP保护的私有数据结构](#4-核心ip保护的私有数据结构)
5. [客户门户受控访问接口](#5-客户门户受控访问接口)
6. [AI智能体数据库Schema](#6-ai智能体数据库schema)
7. [ZKP验证接口设计](#7-zkp验证接口设计)

---

## 1. 概述

### 1.1 文档目的

本文档定义了Claude Code在NocoBase架构中实施AI-AI销售系统时的预设语句规范。这些预设语句确保系统既能支持SEO推广和客户访问，又能有效保护GRT的核心资产（工艺参数、化学配方、定价模型）。

### 1.2 设计原则

GRT智能系统的数据架构遵循以下核心原则：

**透明度分层原则**：数据按可见性分为四个层级（L0公开/L1注册/L2客户/L3核心），每个层级有明确的访问控制规则。

**SEO与安全平衡原则**：公开内容设计为SEO友好的结构化数据，但不包含任何可被竞争对手利用的敏感信息。

**零知识验证原则**：对于需要向客户证明但不能泄露的信息，通过ZKP接口提供验证能力而非原始数据。

---

## 2. 数据分层架构

### 2.1 四层数据可见性模型

| 层级 | 名称 | 可见范围 | 数据类型 | SEO价值 |
|-----|------|---------|---------|---------|
| L0 | 公开展示层 | 全网可见 | 能力介绍、案例摘要、技术博客 | 高 |
| L1 | 注册可见层 | 注册用户 | 详细案例、技术白皮书、设备规格 | 中 |
| L2 | 客户专属层 | 授权客户 | 项目状态、报价详情、质量报告 | 低 |
| L3 | 核心IP层 | 仅内部 | 工艺参数、化学配方、成本构成 | 无 |

### 2.2 数据库表前缀规范

为便于识别数据可见性，所有数据库表采用统一前缀：

```sql
-- L0层：公开展示（SEO友好）
CREATE TABLE pub_* ...  -- public

-- L1层：注册可见
CREATE TABLE reg_* ...  -- registered

-- L2层：客户专属
CREATE TABLE cust_* ... -- customer

-- L3层：核心IP（加密存储）
CREATE TABLE core_* ... -- core/confidential
```

---

## 3. SEO友好的公开内容预设

### 3.1 公开能力展示表（pub_capabilities）

```typescript
// Drizzle Schema定义
export const pubCapabilities = mysqlTable('pub_capabilities', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // SEO元数据
  slug: varchar('slug', { length: 100 }).notNull().unique(), // URL友好标识
  title: varchar('title', { length: 200 }).notNull(),
  metaDescription: varchar('meta_description', { length: 300 }),
  keywords: json('keywords').$type<string[]>(),
  
  // 结构化内容
  category: mysqlEnum('category', [
    'cleaning_technology',    // 清洗技术
    'equipment_type',         // 设备类型
    'industry_solution',      // 行业解决方案
    'compliance_standard'     // 合规标准
  ]).notNull(),
  
  summary: text('summary').notNull(),           // 摘要（SEO描述）
  content: text('content').notNull(),           // 详细内容（Markdown）
  featuredImage: varchar('featured_image', { length: 500 }),
  
  // 技术参数（公开范围）
  publicSpecs: json('public_specs').$type<{
    cleanlinessRange: string;      // "VDA 19.1 Class A-D"
    cycleTimeRange: string;        // "30-120秒"
    workpieceTypes: string[];      // ["压铸件", "机加工件"]
    industryApplications: string[]; // ["汽车", "航空", "医疗"]
  }>(),
  
  // SEO增强
  schemaOrgType: varchar('schema_org_type', { length: 50 }), // Product/Service
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  
  // 状态
  status: mysqlEnum('status', ['draft', 'published', 'archived']).default('draft'),
  publishedAt: timestamp('published_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 3.2 公开案例摘要表（pub_case_summaries）

```typescript
export const pubCaseSummaries = mysqlTable('pub_case_summaries', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // SEO元数据
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  metaDescription: varchar('meta_description', { length: 300 }),
  
  // 案例信息（脱敏）
  industryCategory: mysqlEnum('industry_category', [
    'automotive_oem',        // 汽车OEM
    'automotive_tier1',      // 汽车Tier1
    'aerospace',             // 航空航天
    'medical_device',        // 医疗器械
    'precision_machinery'    // 精密机械
  ]).notNull(),
  
  // 公开展示的客户信息（需客户授权）
  customerDisplayName: varchar('customer_display_name', { length: 100 }), // "某德系豪华品牌"
  customerLogo: varchar('customer_logo', { length: 500 }),
  customerTestimonial: text('customer_testimonial'),
  
  // 技术亮点（公开范围）
  workpieceDescription: varchar('workpiece_description', { length: 200 }), // "变速箱壳体"
  cleanlinessAchieved: varchar('cleanliness_achieved', { length: 50 }),    // "VDA 19.1 Class A"
  cycleTimeAchieved: varchar('cycle_time_achieved', { length: 50 }),       // "45秒"
  
  // 成果数据（公开范围）
  publicResults: json('public_results').$type<{
    productionYears: number;       // 投产年数
    totalUnitsProcessed: string;   // "500万+"
    qualityPassRate: string;       // ">99.9%"
    customerSatisfaction: string;  // "5星"
  }>(),
  
  // 关联的内部项目（不公开）
  internalProjectId: varchar('internal_project_id', { length: 36 }),
  
  // 状态
  status: mysqlEnum('status', ['draft', 'published', 'archived']).default('draft'),
  publishedAt: timestamp('published_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 3.3 技术博客表（pub_tech_articles）

```typescript
export const pubTechArticles = mysqlTable('pub_tech_articles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // SEO元数据
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  metaDescription: varchar('meta_description', { length: 300 }),
  keywords: json('keywords').$type<string[]>(),
  
  // 文章内容
  category: mysqlEnum('category', [
    'industry_insight',      // 行业洞察
    'technology_trend',      // 技术趋势
    'standard_update',       // 标准更新
    'case_analysis',         // 案例分析
    'best_practice'          // 最佳实践
  ]).notNull(),
  
  excerpt: text('excerpt').notNull(),           // 摘要
  content: text('content').notNull(),           // 正文（Markdown）
  featuredImage: varchar('featured_image', { length: 500 }),
  
  // 作者信息
  authorName: varchar('author_name', { length: 100 }),
  authorTitle: varchar('author_title', { length: 100 }),
  authorAvatar: varchar('author_avatar', { length: 500 }),
  
  // SEO增强
  readingTime: int('reading_time'),             // 阅读时间（分钟）
  relatedCapabilities: json('related_capabilities').$type<string[]>(),
  relatedCases: json('related_cases').$type<string[]>(),
  
  // 状态
  status: mysqlEnum('status', ['draft', 'published', 'archived']).default('draft'),
  publishedAt: timestamp('published_at'),
  viewCount: int('view_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

---

## 4. 核心IP保护的私有数据结构

### 4.1 核心工艺参数表（core_process_parameters）

```typescript
// 核心IP表：字段级加密存储
export const coreProcessParameters = mysqlTable('core_process_parameters', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 关联
  equipmentModelId: varchar('equipment_model_id', { length: 36 }).notNull(),
  workpieceTypeId: varchar('workpiece_type_id', { length: 36 }).notNull(),
  
  // 加密存储的核心参数
  encryptedParameters: text('encrypted_parameters').notNull(), // AES-256加密
  encryptionIv: varchar('encryption_iv', { length: 32 }).notNull(),
  encryptionAuthTag: varchar('encryption_auth_tag', { length: 32 }).notNull(),
  keyVersion: int('key_version').notNull().default(1),
  
  // 参数元数据（不加密，用于索引）
  parameterType: mysqlEnum('parameter_type', [
    'temperature_profile',    // 温度曲线
    'pressure_profile',       // 压力曲线
    'chemical_formula',       // 化学配方
    'ultrasonic_config',      // 超声波配置
    'drying_profile'          // 干燥曲线
  ]).notNull(),
  
  // 合规范围（用于ZKP验证）
  complianceRanges: json('compliance_ranges').$type<{
    standard: string;         // "VDA 19.1"
    minValue: number;
    maxValue: number;
    unit: string;
  }[]>(),
  
  // 版本控制
  version: varchar('version', { length: 20 }).notNull(),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),
  
  // 审计
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  approvedBy: varchar('approved_by', { length: 36 }),
  approvedAt: timestamp('approved_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 4.2 化学配方表（core_chemical_formulas）

```typescript
export const coreChemicalFormulas = mysqlTable('core_chemical_formulas', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 配方标识
  formulaCode: varchar('formula_code', { length: 50 }).notNull().unique(),
  formulaName: varchar('formula_name', { length: 100 }).notNull(),
  
  // 加密存储的配方成分
  encryptedIngredients: text('encrypted_ingredients').notNull(), // AES-256加密
  encryptionIv: varchar('encryption_iv', { length: 32 }).notNull(),
  encryptionAuthTag: varchar('encryption_auth_tag', { length: 32 }).notNull(),
  keyVersion: int('key_version').notNull().default(1),
  
  // 合规信息（用于ZKP验证）
  reachCompliant: boolean('reach_compliant').notNull(),
  rohsCompliant: boolean('rohs_compliant').notNull(),
  
  // 禁限用物质Merkle Tree Root（用于ZKP非成员证明）
  prohibitedSubstancesMerkleRoot: varchar('prohibited_substances_merkle_root', { length: 66 }),
  
  // 公开的安全信息（MSDS摘要）
  publicSafetyInfo: json('public_safety_info').$type<{
    hazardClass: string;
    storageRequirements: string;
    disposalMethod: string;
  }>(),
  
  // 版本控制
  version: varchar('version', { length: 20 }).notNull(),
  effectiveFrom: timestamp('effective_from').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 4.3 成本模型表（core_cost_models）

```typescript
export const coreCostModels = mysqlTable('core_cost_models', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 模型标识
  modelCode: varchar('model_code', { length: 50 }).notNull().unique(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  
  // 加密存储的成本参数
  encryptedCostFactors: text('encrypted_cost_factors').notNull(), // AES-256加密
  encryptionIv: varchar('encryption_iv', { length: 32 }).notNull(),
  encryptionAuthTag: varchar('encryption_auth_tag', { length: 32 }).notNull(),
  keyVersion: int('key_version').notNull().default(1),
  
  // 成本类型
  costType: mysqlEnum('cost_type', [
    'material',           // 材料成本
    'labor',              // 人工成本
    'overhead',           // 制造费用
    'margin'              // 利润率
  ]).notNull(),
  
  // 适用范围
  applicableEquipmentTypes: json('applicable_equipment_types').$type<string[]>(),
  applicableIndustries: json('applicable_industries').$type<string[]>(),
  
  // 版本控制
  version: varchar('version', { length: 20 }).notNull(),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),
  
  // 审计
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  approvedBy: varchar('approved_by', { length: 36 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

---

## 5. 客户门户受控访问接口

### 5.1 客户项目状态表（cust_project_status）

```typescript
export const custProjectStatus = mysqlTable('cust_project_status', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 关联
  projectId: varchar('project_id', { length: 36 }).notNull(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  
  // 客户可见的项目信息
  projectCode: varchar('project_code', { length: 50 }).notNull(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  
  // 里程碑状态（客户可见）
  currentMilestone: mysqlEnum('current_milestone', [
    'M0_OPPORTUNITY', 'M1_QUOTATION', 'M2_CONTRACT',
    'M3_DESIGN_MECH', 'M4_DESIGN_ELEC', 'M5_PROCUREMENT',
    'M6_ASSEMBLY', 'M7_INTERNAL_TEST', 'M8_FAT',
    'M9_DELIVERY', 'M10_INSTALLATION', 'M11_SAT', 'M12_HANDOVER'
  ]).notNull(),
  
  milestoneProgress: int('milestone_progress').notNull(), // 0-100
  
  // 关键日期（客户可见）
  plannedDeliveryDate: timestamp('planned_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  plannedFatDate: timestamp('planned_fat_date'),
  actualFatDate: timestamp('actual_fat_date'),
  plannedSatDate: timestamp('planned_sat_date'),
  actualSatDate: timestamp('actual_sat_date'),
  
  // 质量状态（客户可见，通过ZKP验证）
  qualityStatus: mysqlEnum('quality_status', [
    'pending',
    'in_progress',
    'passed',
    'conditional_pass',
    'failed'
  ]).default('pending'),
  
  // ZKP验证结果
  latestZkpProofId: varchar('latest_zkp_proof_id', { length: 36 }),
  zkpVerificationStatus: mysqlEnum('zkp_verification_status', [
    'not_required',
    'pending',
    'verified',
    'failed'
  ]).default('not_required'),
  
  // 客户通知
  lastNotificationAt: timestamp('last_notification_at'),
  notificationPreferences: json('notification_preferences').$type<{
    email: boolean;
    sms: boolean;
    webhook: boolean;
  }>(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 5.2 客户访问令牌表（cust_access_tokens）

```typescript
export const custAccessTokens = mysqlTable('cust_access_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 关联
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  projectId: varchar('project_id', { length: 36 }), // 可为空表示全项目访问
  
  // 令牌信息
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  tokenType: mysqlEnum('token_type', [
    'project_view',       // 项目查看
    'quality_report',     // 质量报告
    'zkp_verification',   // ZKP验证
    'full_access'         // 完整访问
  ]).notNull(),
  
  // 权限范围
  permissions: json('permissions').$type<{
    viewProjectStatus: boolean;
    viewQualityReports: boolean;
    requestZkpVerification: boolean;
    downloadDocuments: boolean;
  }>(),
  
  // 有效期
  expiresAt: timestamp('expires_at').notNull(),
  
  // 使用记录
  lastUsedAt: timestamp('last_used_at'),
  usageCount: int('usage_count').default(0),
  
  // 状态
  status: mysqlEnum('status', ['active', 'revoked', 'expired']).default('active'),
  revokedAt: timestamp('revoked_at'),
  revokedBy: varchar('revoked_by', { length: 36 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 5.3 客户门户API路由定义

```typescript
// tRPC路由定义：客户门户
export const customerPortalRouter = router({
  // 项目状态查询（需要令牌验证）
  getProjectStatus: publicProcedure
    .input(z.object({
      projectId: z.string(),
      accessToken: z.string()
    }))
    .query(async ({ input, ctx }) => {
      // 验证访问令牌
      const token = await verifyCustomerToken(input.accessToken, input.projectId);
      if (!token) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // 返回客户可见的项目状态
      return await getCustomerVisibleProjectStatus(input.projectId);
    }),
  
  // 质量报告查询（需要令牌验证）
  getQualityReport: publicProcedure
    .input(z.object({
      projectId: z.string(),
      accessToken: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const token = await verifyCustomerToken(input.accessToken, input.projectId);
      if (!token || !token.permissions.viewQualityReports) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // 返回质量报告（包含ZKP验证结果，不包含原始数据）
      return await getCustomerQualityReport(input.projectId);
    }),
  
  // 请求ZKP验证
  requestZkpVerification: publicProcedure
    .input(z.object({
      projectId: z.string(),
      accessToken: z.string(),
      verificationType: z.enum(['process_compliance', 'chemical_safety', 'visual_inspection'])
    }))
    .mutation(async ({ input, ctx }) => {
      const token = await verifyCustomerToken(input.accessToken, input.projectId);
      if (!token || !token.permissions.requestZkpVerification) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // 触发ZKP证明生成
      return await generateZkpProof(input.projectId, input.verificationType);
    })
});
```

---

## 6. AI智能体数据库Schema

### 6.1 智能体配置表（ai_agent_configs）

```typescript
export const aiAgentConfigs = mysqlTable('ai_agent_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 智能体标识
  agentType: mysqlEnum('agent_type', [
    'listener',       // The Listener - 接口智能体
    'estimator',      // The Estimator - 算力智能体
    'negotiator',     // The Negotiator - 商业智能体
    'guardian',       // The Guardian - 合规智能体
    'builder'         // The Builder - 构建智能体
  ]).notNull(),
  
  agentName: varchar('agent_name', { length: 100 }).notNull(),
  agentVersion: varchar('agent_version', { length: 20 }).notNull(),
  
  // 配置参数
  modelConfig: json('model_config').$type<{
    modelName: string;        // "claude-3.5-sonnet"
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  }>(),
  
  // 护栏配置
  guardrails: json('guardrails').$type<{
    profitGuardrail: {
      minMargin: number;
      escalationPath: string;
    };
    capabilityGuardrail: {
      requireConobaseVerification: boolean;
      escalationPath: string;
    };
    emotionalGuardrail: {
      toneProfile: string;
      regenerateOnViolation: boolean;
    };
  }>(),
  
  // 协议支持
  supportedProtocols: json('supported_protocols').$type<string[]>(), // ["L1_NL", "L2_AAS"]
  
  // 状态
  status: mysqlEnum('status', ['active', 'inactive', 'testing']).default('inactive'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### 6.2 智能体交互日志表（ai_agent_interactions）

```typescript
export const aiAgentInteractions = mysqlTable('ai_agent_interactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 交互标识
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  agentType: mysqlEnum('agent_type', [
    'listener', 'estimator', 'negotiator', 'guardian', 'builder'
  ]).notNull(),
  
  // 交互方
  initiatorType: mysqlEnum('initiator_type', [
    'customer_ai',    // 客户AI
    'internal_agent', // 内部智能体
    'human_user'      // 人类用户
  ]).notNull(),
  initiatorId: varchar('initiator_id', { length: 36 }),
  
  // 交互内容
  protocol: mysqlEnum('protocol', ['L1_NL', 'L2_AAS']).notNull(),
  inputType: mysqlEnum('input_type', ['text', 'aas', 'cad', 'multimodal']).notNull(),
  inputHash: varchar('input_hash', { length: 64 }).notNull(), // 输入内容哈希
  
  // 输出内容（不存储敏感信息）
  outputType: mysqlEnum('output_type', ['text', 'aas', 'quote', 'proof']).notNull(),
  outputHash: varchar('output_hash', { length: 64 }).notNull(), // 输出内容哈希
  
  // 护栏触发记录
  guardrailTriggered: boolean('guardrail_triggered').default(false),
  guardrailType: mysqlEnum('guardrail_type', ['profit', 'capability', 'emotional']),
  guardrailAction: mysqlEnum('guardrail_action', ['block', 'escalate', 'regenerate']),
  
  // 性能指标
  processingTimeMs: int('processing_time_ms'),
  tokenCount: int('token_count'),
  
  // 关联
  projectId: varchar('project_id', { length: 36 }),
  customerId: varchar('customer_id', { length: 36 }),
  
  createdAt: timestamp('created_at').defaultNow()
});
```

---

## 7. ZKP验证接口设计

### 7.1 ZKP证明记录表（zkp_proofs）

```typescript
export const zkpProofs = mysqlTable('zkp_proofs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 证明类型
  proofType: mysqlEnum('proof_type', [
    'process_compliance',   // 工艺参数合规性
    'chemical_safety',      // 化学配方安全性
    'visual_inspection'     // 视觉检测防伪
  ]).notNull(),
  
  // 关联
  projectId: varchar('project_id', { length: 36 }).notNull(),
  batchId: varchar('batch_id', { length: 36 }),
  
  // 公开输入（可验证）
  publicInputs: json('public_inputs').$type<{
    standard: string;           // "VDA 19.1"
    complianceRanges: object;   // 合规范围
    dataCommitment: string;     // 数据承诺（哈希）
  }>(),
  
  // 证明数据
  proofData: text('proof_data').notNull(),        // zk-SNARK证明
  verificationKey: text('verification_key').notNull(),
  
  // 验证状态
  verificationStatus: mysqlEnum('verification_status', [
    'pending',
    'verified',
    'failed',
    'expired'
  ]).default('pending'),
  
  verifiedAt: timestamp('verified_at'),
  verifiedBy: varchar('verified_by', { length: 36 }), // 验证者（客户AI标识）
  
  // 有效期
  expiresAt: timestamp('expires_at').notNull(),
  
  createdAt: timestamp('created_at').defaultNow()
});
```

### 7.2 ZKP验证API路由定义

```typescript
// tRPC路由定义：ZKP验证
export const zkpRouter = router({
  // 请求生成证明
  generateProof: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      proofType: z.enum(['process_compliance', 'chemical_safety', 'visual_inspection']),
      batchId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // 验证权限
      await checkProjectAccess(ctx.user.id, input.projectId);
      
      // 调用ZKP Prover集群生成证明
      const proof = await zkpProverService.generateProof({
        type: input.proofType,
        projectId: input.projectId,
        batchId: input.batchId
      });
      
      return {
        proofId: proof.id,
        publicInputs: proof.publicInputs,
        proofData: proof.proofData,
        verificationKey: proof.verificationKey
      };
    }),
  
  // 验证证明（客户AI调用）
  verifyProof: publicProcedure
    .input(z.object({
      proofId: z.string(),
      accessToken: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // 验证访问令牌
      const token = await verifyCustomerToken(input.accessToken);
      if (!token) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // 执行证明验证
      const result = await zkpVerifierService.verify(input.proofId);
      
      // 记录验证结果
      await recordVerification(input.proofId, token.customerId, result);
      
      return {
        verified: result.verified,
        publicInputs: result.publicInputs,
        verifiedAt: new Date()
      };
    }),
  
  // 查询证明状态
  getProofStatus: publicProcedure
    .input(z.object({
      proofId: z.string(),
      accessToken: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const token = await verifyCustomerToken(input.accessToken);
      if (!token) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      return await getProofStatus(input.proofId);
    })
});
```

---

## 附录A：数据加密规范

### A.1 加密算法选择

| 数据类型 | 加密算法 | 密钥长度 | 密钥轮换周期 |
|---------|---------|---------|------------|
| 核心工艺参数 | AES-256-GCM | 256位 | 90天 |
| 化学配方 | AES-256-GCM | 256位 | 90天 |
| 成本模型 | AES-256-GCM | 256位 | 90天 |
| 客户访问令牌 | SHA-256 | - | 不适用 |

### A.2 密钥管理

密钥存储在独立的密钥管理服务（KMS）中，不与数据库同存。密钥轮换时，旧版本密钥保留用于解密历史数据，新数据使用新版本密钥加密。

---

## 附录B：SEO元数据模板

### B.1 能力介绍页面模板

```html
<head>
  <title>{capability_title} | GRT工业清洗设备</title>
  <meta name="description" content="{meta_description}">
  <meta name="keywords" content="{keywords}">
  <link rel="canonical" href="{canonical_url}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="{capability_title}">
  <meta property="og:description" content="{meta_description}">
  <meta property="og:image" content="{featured_image}">
  <meta property="og:type" content="product">
  
  <!-- Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "{capability_title}",
    "description": "{meta_description}",
    "brand": {
      "@type": "Brand",
      "name": "GRT"
    },
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock"
    }
  }
  </script>
</head>
```

---

**文档结束**
