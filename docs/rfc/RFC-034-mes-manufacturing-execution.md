# RFC-034: NocoBase架构下的MES制造执行系统

**版本**: 1.0  
**日期**: 2026-01-18  
**作者**: Manus AI  
**状态**: 已批准

---

## 1. 执行摘要

本RFC基于《面向全球化的工业清洗设备非标自动化管理系统（GRT）深度研究报告》，规划在NocoBase架构下实现完整的MES（制造执行系统）功能模块。该系统将支持年产50-80台非标自动化设备的全生命周期管理（M0-M12），涵盖多事业部矩阵管理、AI赋能采购与供应链协同、工时自动管理、以及3-3-3-1财务管控体系。

核心目标是解决非标自动化行业典型的"高混合、低产量"（High-Mix, Low-Volume）管理痛点，通过Claude Code CLI开发工具与Manus AI智能体的杰瑞德自动化，实现从商机到交付的全流程闭环管理。

---

## 2. 战略背景分析

### 2.1 行业特征与挑战

工业清洗设备制造属于典型的ETO（Engineer-to-Order）模式，每台设备需根据客户具体零件（发动机缸体、变速箱齿轮、精密轴承）进行定制化设计。企业面临的核心挑战包括：

| 挑战维度 | 具体表现 | 系统解决方案 |
|---------|---------|-------------|
| 技术标准多元化 | 海外市场（CE/UL）与国内标准差异 | 多语言界面、可配置文档模板 |
| 供应链远程化 | 零部件命名规则、交货准确性 | AI自动询价、供应商门户 |
| BOM结构动态性 | M6阶段仍可能发生设计变更 | 版本控制、ECN工程变更流程 |
| 项目维度缺失 | 难以获取单一项目实时成本 | 项目为核心的成本归集 |

### 2.2 现有系统局限性

天思ERP在非标自动化行业的ETO模式下存在明显局限：BOM结构僵化、项目维度缺失、智能化缺失。GRT系统将通过NocoBase的灵活性和AI集成能力，从根本上解决这些问题。

---

## 3. 多事业部矩阵管理体系

### 3.1 事业部垂直管理架构

GRT系统需支持多租户或多逻辑隔离能力，确保数据安全的同时实现集团层面统筹。

| 事业部 | 特征 | 系统需求 |
|-------|------|---------|
| 第一事业部（海外） | 高单价、长周期、高文档要求 | 多语言界面、汇率管理、HS Code管理 |
| 第二事业部（商用车） | 工件大、油污重、工艺成熟 | 大型结构件BOM管理、内部协同 |
| 第三事业部（乘用车） | 节拍快、清洁度高、自动化程度高 | 电气BOM管理、版本控制 |
| 第十事业部（机加工） | 内部工厂、成本/利润双中心 | 内部订单、Transfer Pricing |

### 3.2 矩阵式角色权限

```typescript
// 角色权限矩阵定义
interface BURole {
  roleId: string;
  roleName: string;
  responsibilities: string[];
  coreModules: string[];
  permissions: Permission[];
}

const BU_ROLES: BURole[] = [
  {
    roleId: 'bu_head',
    roleName: '事业部负责人',
    responsibilities: ['P&L负责', '资源调配', '重大异常决策'],
    coreModules: ['经营驾驶舱', '毛利分析', '现金流监控'],
    permissions: ['view_all', 'approve_budget', 'escalate']
  },
  {
    roleId: 'bu_deputy',
    roleName: '事业部副经理',
    responsibilities: ['日常运营', '多项目进度协调'],
    coreModules: ['多项目甘特图', '资源负荷平衡'],
    permissions: ['view_bu', 'assign_resource', 'schedule']
  },
  {
    roleId: 'sales_engineer',
    roleName: '销售与项目工程师',
    responsibilities: ['M0-M1阶段主导', '客户需求对接'],
    coreModules: ['CRM模块', '商机录入', '报价生成'],
    permissions: ['create_opportunity', 'generate_quote', 'contract_review']
  },
  {
    roleId: 'mech_engineer',
    roleName: '机械/电气与项目工程师',
    responsibilities: ['M2-M4设计主导', 'M6-M9技术支持'],
    coreModules: ['PDM/BOM模块', '图纸上传', 'ECN申请'],
    permissions: ['upload_drawing', 'manage_bom', 'request_ecn']
  },
  {
    roleId: 'procurement_engineer',
    roleName: '采购与项目工程师',
    responsibilities: ['M5阶段主导', '供应商管理'],
    coreModules: ['SRM模块', '自动询价', 'PO生成'],
    permissions: ['create_po', 'manage_supplier', 'track_delivery']
  },
  {
    roleId: 'technician',
    roleName: '机械安装技工/技师/调整工',
    responsibilities: ['M6-M11执行主导', '现场反馈'],
    coreModules: ['MES移动端', '工时扫码', '领料申请'],
    permissions: ['clock_time', 'request_material', 'report_issue']
  }
];
```

---

## 4. NocoBase核心数据表设计

### 4.1 项目主表 (Projects)

```typescript
interface Project {
  id: string;                    // P-2026-001格式
  name: string;                  // 项目名称
  buId: string;                  // 所属事业部
  pmId: string;                  // 项目经理
  customerId: string;            // 客户ID
  status: MilestoneStatus;       // M0-M12状态
  paymentTerms: PaymentTerms;    // 付款条款
  budgetMaterial: number;        // 材料预算限额
  budgetLabor: number;           // 人工预算限额
  costActualMaterial: number;    // 实时材料成本
  costActualLabor: number;       // 实时人工成本
  costActualExpense: number;     // 实时专项费用
  costActualOverhead: number;    // 实时制造费用
  createdAt: Date;
  updatedAt: Date;
}

type MilestoneStatus = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 
                       'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11' | 'M12';

interface PaymentTerms {
  type: '3-3-3-1' | '4-5-1' | 'custom';
  milestones: PaymentMilestone[];
}
```

### 4.2 物料主表 (Items)

```typescript
interface Item {
  sku: string;                   // M-ELE-001格式
  nameCn: string;                // 中文名称
  nameEn: string;                // 英文名称（海外SOP用）
  spec: string;                  // 规格型号
  brand: string;                 // 品牌
  category: ItemCategory;        // 分类
  unit: string;                  // 单位
  stdCost: number;               // 标准成本
  stockQty: number;              // 当前库存
  binLocation: string;           // 默认库位
  drawingLink: string;           // 图纸链接
  embedding: number[];           // 向量数据（AI相似性搜索）
  aiTags: string[];              // AI标签
  leadTime: number;              // 交货周期（天）
  hsCode: string;                // 海关编码
}

type ItemCategory = 'standard' | 'non_standard' | 'self_made' | 
                    'electrical' | 'mechanical' | 'auxiliary';
```

### 4.3 BOM结构表 (BOM_Structures)

```typescript
interface BOMStructure {
  id: string;
  parentId: string;              // 父物料ID
  childId: string;               // 子物料ID
  qty: number;                   // 数量
  projectId: string;             // 项目ID
  phase: 'M3' | 'M4';           // 设计阶段
  version: string;               // 版本号
  isActive: boolean;             // 是否当前版本
  createdBy: string;
  createdAt: Date;
}
```

### 4.4 采购订单表 (Purchase_Orders)

```typescript
interface PurchaseOrder {
  poNumber: string;              // PO单号
  supplierId: string;            // 供应商
  projectId: string;             // 归属项目
  items: POItem[];               // 订单明细
  totalAmount: number;           // 总金额
  currency: string;              // 币种
  status: POStatus;              // 状态
  emailTraceId: string;          // Manus邮件追踪ID
  expectedDelivery: Date;        // 预计交货日期
  actualDelivery: Date;          // 实际交货日期
  createdAt: Date;
}

type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial_received' | 
                'received' | 'cancelled';
```

---

## 5. AI赋能采购与供应链协同

### 5.1 Manus AI智能体工作流

```typescript
// M5采购自动化工作流
interface ManusAIProcurementWorkflow {
  trigger: 'M4_BOM_Release';
  steps: WorkflowStep[];
}

const PROCUREMENT_WORKFLOW: ManusAIProcurementWorkflow = {
  trigger: 'M4_BOM_Release',
  steps: [
    {
      name: 'group',
      action: 'aggregate_by_supplier',
      description: '按供应商分组采购需求'
    },
    {
      name: 'draft',
      action: 'generate_po_pdf',
      description: '使用NocoBase模板生成PO PDF'
    },
    {
      name: 'send_email',
      action: 'send_rfq',
      template: {
        to: '{{supplier.email}}',
        subject: 'PO [{{po_number}}] - GRT Equipment',
        body: 'Dear {{contact}}, Please find attached PO for Project {{project_name}}. Please confirm delivery date by replying to this email.'
      }
    },
    {
      name: 'listen',
      action: 'monitor_inbox',
      rules: [
        { condition: 'reply_contains_date', action: 'update_expected_delivery' },
        { condition: 'no_reply_24h', action: 'send_reminder' },
        { condition: 'price_change', action: 'flag_for_human' }
      ]
    }
  ]
};
```

### 5.2 AI BOM清洗与匹配

```typescript
// AI BOM清洗引擎
class AIBOMCleansingEngine {
  // 标准化物料名称
  async standardizeName(rawName: string): Promise<string> {
    // "SMC Cylinder" 和 "SMC气缸" 统一为标准名称
    const standardized = await this.llmService.standardize(rawName);
    return standardized;
  }

  // 库存匹配检查
  async checkInventoryMatch(item: BOMItem): Promise<InventoryMatch[]> {
    // 检查闲置库存，建议优先使用
    const matches = await this.inventoryService.findSimilar(item);
    return matches.map(m => ({
      itemId: m.id,
      qty: m.qty,
      sourceProject: m.projectId,
      savingsEstimate: m.qty * item.stdCost
    }));
  }

  // 长交期预警
  async checkLeadTimeWarning(items: BOMItem[]): Promise<LeadTimeWarning[]> {
    return items
      .filter(item => item.leadTime > 8 * 7) // 超过8周
      .map(item => ({
        itemId: item.id,
        itemName: item.nameCn,
        leadTime: item.leadTime,
        urgency: 'high',
        recommendation: '需立即请购'
      }));
  }
}
```

---

## 6. MES制造执行与工时管理

### 6.1 任务卡管理

```typescript
interface TaskCard {
  id: string;
  projectId: string;
  taskType: TaskType;
  name: string;
  description: string;
  assignedTo: string;
  skillRequired: string[];
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
  startTime: Date;
  endTime: Date;
  parentTaskId: string;
}

type TaskType = 'frame_assembly' | 'piping_install' | 'electrical_wiring' | 
                'single_debug' | 'system_debug' | 'fat_test';

type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'blocked';
```

### 6.2 工时自动管理引擎

```typescript
class WorkTimeEngine {
  // 开始任务计时
  async startTask(taskId: string, userId: string): Promise<void> {
    await this.db.insert(workTimeRecords).values({
      taskId,
      userId,
      startTime: new Date(),
      status: 'active'
    });
  }

  // 暂停/完成任务
  async stopTask(taskId: string, userId: string, action: 'pause' | 'complete'): Promise<void> {
    const record = await this.getActiveRecord(taskId, userId);
    const duration = Date.now() - record.startTime.getTime();
    
    await this.db.update(workTimeRecords)
      .set({
        endTime: new Date(),
        duration,
        status: action === 'complete' ? 'completed' : 'paused'
      })
      .where(eq(workTimeRecords.id, record.id));

    // 更新项目实际人工成本
    await this.updateProjectLaborCost(record.projectId, duration);
  }

  // 工时超标预警
  async checkOvertime(projectId: string): Promise<OvertimeAlert | null> {
    const project = await this.getProject(projectId);
    const actualHours = await this.getTotalActualHours(projectId);
    const budgetHours = project.budgetLabor / this.hourlyRate;
    
    if (actualHours > budgetHours * 1.5) {
      return {
        projectId,
        alertLevel: 'critical',
        overagePercent: ((actualHours / budgetHours) - 1) * 100,
        recommendation: '工时超标50%，请工艺部门分析原因'
      };
    }
    return null;
  }
}
```

---

## 7. 3-3-3-1财务管控体系

### 7.1 付款条款模板

```typescript
interface PaymentTermsTemplate {
  type: string;
  milestones: PaymentMilestone[];
  controls: PaymentControl[];
}

const PAYMENT_TEMPLATES: PaymentTermsTemplate[] = [
  {
    type: '3-3-3-1',
    milestones: [
      { phase: 'M1', percentage: 30, name: '预付款', trigger: 'contract_signed' },
      { phase: 'M5-M6', percentage: 30, name: '提货款/进度款', trigger: 'main_parts_received' },
      { phase: 'M9', percentage: 30, name: '发货款', trigger: 'fat_passed' },
      { phase: 'M11+12m', percentage: 10, name: '质保金', trigger: 'sat_signed' }
    ],
    controls: [
      { milestone: 'M1', rule: 'block_m5_procurement_if_unpaid' },
      { milestone: 'M9', rule: 'block_delivery_if_unpaid' }
    ]
  },
  {
    type: '4-5-1',
    milestones: [
      { phase: 'M1', percentage: 40, name: '预付款', trigger: 'contract_signed' },
      { phase: 'M9', percentage: 50, name: '发货款', trigger: 'fat_passed' },
      { phase: 'M11+12m', percentage: 10, name: '质保金', trigger: 'sat_signed' }
    ],
    controls: [
      { milestone: 'M1', rule: 'block_m5_procurement_if_unpaid' },
      { milestone: 'M9', rule: 'block_delivery_if_unpaid' }
    ]
  }
];
```

### 7.2 成本分类管理

| 成本分类 | 代码 | 包含内容 | 管理策略 | 系统功能 |
|---------|------|---------|---------|---------|
| 直接材料 (DM) | cost_dm | BOM内所有采购件 | 量价双控 | 采购超预算需审批；AI推荐低价替代品 |
| 直接人工 (DL) | cost_dl | 焊工、装配工、电工、调试工 | 工时定额 | MES工时统计 vs 标准工时；超额预警 |
| 专项费用 (DE) | cost_de | 差旅费、运费、特殊包装费 | 项目归集 | 报销时必须关联项目号；实报实销 |
| 制造费用 (MO) | cost_mo | 厂房折旧、辅料、第十事业部加工费 | 分摊机制 | 第十事业部通过内部结算价向项目收费 |

---

## 8. 质量验收与交付

### 8.1 FAT/SAT验收流程

```typescript
interface FATChecklist {
  id: string;
  projectId: string;
  items: ChecklistItem[];
  status: 'draft' | 'in_progress' | 'passed' | 'failed';
  customerSignature: string;
  signatureDate: Date;
  photos: string[];
}

// FAT通过后解锁发货
async function unlockDelivery(projectId: string): Promise<boolean> {
  const fat = await getFATChecklist(projectId);
  const payment = await getPaymentStatus(projectId, 'M9');
  
  if (fat.status !== 'passed') {
    throw new Error('FAT未通过，无法发货');
  }
  
  if (!payment.received) {
    throw new Error('发货款未到账，无法发货');
  }
  
  // 解锁发货通知单打印权限
  await enableDeliveryNotice(projectId);
  return true;
}
```

---

## 9. AI SOP生成与知识沉淀

### 9.1 AI SOP自动生成引擎

```typescript
class AISOPGenerator {
  async generateSOP(projectId: string): Promise<SOPDocument> {
    // 收集项目数据
    const project = await this.getProject(projectId);
    const bom = await this.getBOM(projectId);
    const debugLogs = await this.getDebugLogs(projectId);
    const drawings = await this.get3DScreenshots(projectId);

    // 调用LLM生成SOP
    const sopContent = await this.llmService.generateSOP({
      projectInfo: project,
      bomStructure: bom,
      debugHistory: debugLogs,
      visualAssets: drawings
    });

    // 生成多语言版本
    const sopCn = sopContent;
    const sopEn = await this.llmService.translate(sopContent, 'en');
    const sopDe = await this.llmService.translate(sopContent, 'de');

    return {
      projectId,
      versions: [
        { language: 'zh-CN', content: sopCn },
        { language: 'en', content: sopEn },
        { language: 'de', content: sopDe }
      ],
      generatedAt: new Date()
    };
  }
}
```

---

## 10. 实施路线图

### 第一阶段：数字化骨架搭建（M1-M3月）

| 任务 | 负责方 | 交付物 |
|------|-------|--------|
| NocoBase平台部署 | IT团队 | 生产环境就绪 |
| 天思数据清洗与迁移 | Claude Code | ETL脚本、数据质量报告 |
| 项目管理模块上线 | Manus | M0-M12流程配置 |

### 第二阶段：供应链与制造协同（M4-M6月）

| 任务 | 负责方 | 交付物 |
|------|-------|--------|
| 采购模块上线 | Claude Code | PO生成、供应商门户 |
| 仓库二维码管理 | IT团队 | 标签打印、扫码入库 |
| MES工时管理 | Manus | 车间终端、工时统计 |

### 第三阶段：AI深度赋能（M7-M12月）

| 任务 | 负责方 | 交付物 |
|------|-------|--------|
| Manus AI智能体部署 | AI团队 | 自动询比价、订单发送 |
| AI BOM继承模块 | Claude Code | 设计复用、知识库 |
| AI SOP生成插件 | Manus | 多语言文档自动化 |

---

## 11. 技术评估与风险分析

### 11.1 技术可行性

| 模块 | 技术方案 | 复杂度 | 风险等级 |
|------|---------|--------|---------|
| 多事业部管理 | NocoBase多租户 | 中 | 低 |
| AI采购自动化 | Manus + Email API | 高 | 中 |
| MES工时管理 | 移动端 + 扫码 | 中 | 低 |
| 3-3-3-1财务管控 | 工作流引擎 | 中 | 低 |

### 11.2 风险缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据迁移质量 | 高 | AI辅助清洗 + 人工复核 |
| 用户接受度 | 中 | 分阶段培训 + 试点先行 |
| AI准确性 | 中 | 人工审核关键决策 |

---

## 12. 结论

通过构建基于NocoBase架构、杰瑞德自动化AI技术（Claude Code/Manus）的GRT MES系统，企业将能够从根本上解决非标自动化制造中的"信息孤岛"和"效率黑洞"问题。该系统将使销售能基于精准的历史成本数据报价，设计能复用公司沉淀的知识资产，采购能利用AI智能体即时响应供应链变化，制造能清晰掌控每一分钟工时和每一个螺丝的去向，管理层能实时透视全球各事业部的现金流与盈利状况。

---

## 参考文献

[1] GRT智能系统MES深度研究报告 - 内部文档  
[2] NocoBase官方文档 - https://docs.nocobase.com  
[3] Claude Code CLI文档 - https://docs.anthropic.com/claude-code
