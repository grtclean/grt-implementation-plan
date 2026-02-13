/**
 * 模拟数据 - 用于系统演示和开发测试
 * 包含项目管理、销售管理、能力操作系统、HRM等模块的示例数据
 */

// ==================== 项目管理模拟数据 ====================
export const mockProjects = [
  {
    id: "PRJ-2026-001",
    name: "华为深圳工厂清洗设备项目",
    customer: "华为技术有限公司",
    type: "tier1",
    status: "in_progress",
    currentGate: "M4",
    progress: 35,
    budget: 2500000,
    actualCost: 875000,
    startDate: "2025-11-01",
    endDate: "2026-06-30",
    projectManager: "张伟",
    team: ["李明", "王芳", "陈强"],
    description: "为华为深圳工厂提供全自动化清洗设备解决方案",
    priority: "high",
    riskLevel: "medium"
  },
  {
    id: "PRJ-2026-002",
    name: "比亚迪电池清洗线项目",
    customer: "比亚迪股份有限公司",
    type: "tier1",
    status: "in_progress",
    currentGate: "M6",
    progress: 55,
    budget: 3200000,
    actualCost: 1760000,
    startDate: "2025-09-15",
    endDate: "2026-04-30",
    projectManager: "刘洋",
    team: ["赵敏", "孙磊", "周婷"],
    description: "电池生产线专用清洗设备定制开发",
    priority: "high",
    riskLevel: "low"
  },
  {
    id: "PRJ-2026-003",
    name: "宁德时代超声波清洗系统",
    customer: "宁德时代新能源科技",
    type: "tier1",
    status: "planning",
    currentGate: "M1",
    progress: 10,
    budget: 4500000,
    actualCost: 450000,
    startDate: "2026-01-15",
    endDate: "2026-09-30",
    projectManager: "王强",
    team: ["李娜", "张鹏"],
    description: "新能源电池超声波清洗系统研发",
    priority: "critical",
    riskLevel: "high"
  },
  {
    id: "PRJ-2026-004",
    name: "中芯国际晶圆清洗设备",
    customer: "中芯国际集成电路",
    type: "tier1",
    status: "in_progress",
    currentGate: "M8",
    progress: 75,
    budget: 5800000,
    actualCost: 4350000,
    startDate: "2025-06-01",
    endDate: "2026-03-15",
    projectManager: "陈明",
    team: ["吴涛", "郑丽", "马超", "黄蓉"],
    description: "半导体晶圆清洗设备定制项目",
    priority: "critical",
    riskLevel: "medium"
  },
  {
    id: "PRJ-2026-005",
    name: "长城汽车零部件清洗线",
    customer: "长城汽车股份有限公司",
    type: "standard",
    status: "completed",
    currentGate: "M12",
    progress: 100,
    budget: 1800000,
    actualCost: 1720000,
    startDate: "2025-03-01",
    endDate: "2025-12-20",
    projectManager: "赵强",
    team: ["钱伟", "孙丽"],
    description: "汽车零部件清洗生产线",
    priority: "medium",
    riskLevel: "low"
  }
];

// 阶段门定义
export const mockGateDefinitions = [
  { id: "M0", name: "项目立项", description: "项目可行性评估和立项审批", requiredDocs: ["可行性报告", "立项申请书"], approvers: ["项目总监", "财务总监"] },
  { id: "M1", name: "方案设计", description: "总体方案设计和技术评审", requiredDocs: ["技术方案", "设计评审报告"], approvers: ["技术总监"] },
  { id: "M2", name: "详细设计", description: "详细设计和图纸评审", requiredDocs: ["详细设计图", "BOM清单"], approvers: ["设计主管"] },
  { id: "M3", name: "采购准备", description: "物料采购和供应商确认", requiredDocs: ["采购清单", "供应商评估"], approvers: ["采购经理"] },
  { id: "M4", name: "生产制造", description: "设备生产和质量控制", requiredDocs: ["生产计划", "质检报告"], approvers: ["生产经理"] },
  { id: "M5", name: "厂内调试", description: "设备厂内调试和测试", requiredDocs: ["调试记录", "测试报告"], approvers: ["技术主管"] },
  { id: "M6", name: "出厂检验", description: "出厂前全面检验", requiredDocs: ["FAT报告", "检验清单"], approvers: ["质量经理"] },
  { id: "M7", name: "发货运输", description: "设备包装和运输安排", requiredDocs: ["发货单", "运输方案"], approvers: ["物流主管"] },
  { id: "M8", name: "现场安装", description: "客户现场设备安装", requiredDocs: ["安装报告", "现场记录"], approvers: ["项目经理"] },
  { id: "M9", name: "现场调试", description: "现场调试和参数优化", requiredDocs: ["调试记录", "参数表"], approvers: ["技术工程师"] },
  { id: "M10", name: "SAT测试", description: "现场验收测试", requiredDocs: ["SAT报告", "测试数据"], approvers: ["客户代表", "项目经理"] },
  { id: "M11", name: "试运行", description: "设备试运行和培训", requiredDocs: ["运行报告", "培训记录"], approvers: ["客户代表"] },
  { id: "M12", name: "项目验收", description: "最终验收和项目结项", requiredDocs: ["验收报告", "结项文档"], approvers: ["客户代表", "项目总监"] }
];

// 阶段审批记录
export const mockGateReviews = [
  { id: "REV-001", projectId: "PRJ-2026-001", gate: "M0", status: "approved", reviewer: "张总监", reviewDate: "2025-10-25", comments: "项目可行，批准立项" },
  { id: "REV-002", projectId: "PRJ-2026-001", gate: "M1", status: "approved", reviewer: "李技术总监", reviewDate: "2025-11-10", comments: "方案设计合理" },
  { id: "REV-003", projectId: "PRJ-2026-001", gate: "M2", status: "approved", reviewer: "王设计主管", reviewDate: "2025-11-25", comments: "详细设计通过" },
  { id: "REV-004", projectId: "PRJ-2026-001", gate: "M3", status: "approved", reviewer: "陈采购经理", reviewDate: "2025-12-10", comments: "采购计划确认" },
  { id: "REV-005", projectId: "PRJ-2026-002", gate: "M0", status: "approved", reviewer: "张总监", reviewDate: "2025-09-10", comments: "重点项目，优先推进" },
  { id: "REV-006", projectId: "PRJ-2026-002", gate: "M1", status: "approved", reviewer: "李技术总监", reviewDate: "2025-09-25", comments: "技术方案创新" },
  { id: "REV-007", projectId: "PRJ-2026-002", gate: "M2", status: "approved", reviewer: "王设计主管", reviewDate: "2025-10-15", comments: "设计优化完成" },
  { id: "REV-008", projectId: "PRJ-2026-002", gate: "M3", status: "approved", reviewer: "陈采购经理", reviewDate: "2025-10-30", comments: "供应商已确认" },
  { id: "REV-009", projectId: "PRJ-2026-002", gate: "M4", status: "approved", reviewer: "赵生产经理", reviewDate: "2025-11-20", comments: "生产进度正常" },
  { id: "REV-010", projectId: "PRJ-2026-002", gate: "M5", status: "approved", reviewer: "钱技术主管", reviewDate: "2025-12-15", comments: "厂内调试完成" }
];

// ==================== 销售管理模拟数据 ====================
export const mockCustomers = [
  { id: "CUS-001", name: "华为技术有限公司", type: "tier1", industry: "电子制造", region: "华南", contact: "李经理", phone: "13800138001", email: "li@huawei.com", status: "active", creditLevel: "A+" },
  { id: "CUS-002", name: "比亚迪股份有限公司", type: "tier1", industry: "新能源汽车", region: "华南", contact: "王总监", phone: "13800138002", email: "wang@byd.com", status: "active", creditLevel: "A+" },
  { id: "CUS-003", name: "宁德时代新能源科技", type: "tier1", industry: "新能源电池", region: "华东", contact: "张经理", phone: "13800138003", email: "zhang@catl.com", status: "active", creditLevel: "A" },
  { id: "CUS-004", name: "中芯国际集成电路", type: "tier1", industry: "半导体", region: "华东", contact: "陈总", phone: "13800138004", email: "chen@smic.com", status: "active", creditLevel: "A+" },
  { id: "CUS-005", name: "长城汽车股份有限公司", type: "standard", industry: "汽车制造", region: "华北", contact: "刘经理", phone: "13800138005", email: "liu@gwm.com", status: "active", creditLevel: "A" },
  { id: "CUS-006", name: "格力电器股份有限公司", type: "standard", industry: "家电制造", region: "华南", contact: "赵经理", phone: "13800138006", email: "zhao@gree.com", status: "active", creditLevel: "A" },
  { id: "CUS-007", name: "美的集团股份有限公司", type: "standard", industry: "家电制造", region: "华南", contact: "孙总监", phone: "13800138007", email: "sun@midea.com", status: "active", creditLevel: "A" },
  { id: "CUS-008", name: "海尔智家股份有限公司", type: "standard", industry: "家电制造", region: "华东", contact: "周经理", phone: "13800138008", email: "zhou@haier.com", status: "potential", creditLevel: "B+" }
];

export const mockOpportunities = [
  { id: "OPP-001", customerId: "CUS-003", name: "宁德时代超声波清洗系统", value: 4500000, stage: "proposal", probability: 70, expectedCloseDate: "2026-02-28", owner: "王强", source: "客户推荐" },
  { id: "OPP-002", customerId: "CUS-006", name: "格力空调生产线清洗设备", value: 1200000, stage: "negotiation", probability: 85, expectedCloseDate: "2026-01-31", owner: "李明", source: "展会获客" },
  { id: "OPP-003", customerId: "CUS-007", name: "美的工厂清洗系统升级", value: 2800000, stage: "qualification", probability: 50, expectedCloseDate: "2026-04-30", owner: "张伟", source: "老客户复购" },
  { id: "OPP-004", customerId: "CUS-008", name: "海尔智能清洗设备", value: 1800000, stage: "discovery", probability: 30, expectedCloseDate: "2026-06-30", owner: "刘洋", source: "官网咨询" },
  { id: "OPP-005", customerId: "CUS-001", name: "华为二期扩产项目", value: 3500000, stage: "proposal", probability: 75, expectedCloseDate: "2026-03-31", owner: "张伟", source: "老客户复购" }
];

// ==================== 能力操作系统模拟数据 ====================
export const mockCapabilityDomains = [
  { id: "T", name: "技术能力", description: "技术研发和创新能力", color: "#3B82F6" },
  { id: "S", name: "系统理解", description: "系统架构和集成能力", color: "#10B981" },
  { id: "D", name: "交付能力", description: "项目交付和执行能力", color: "#F59E0B" },
  { id: "C", name: "客户价值", description: "客户服务和价值创造", color: "#EF4444" },
  { id: "K", name: "知识沉淀", description: "知识管理和传承能力", color: "#8B5CF6" },
  { id: "L", name: "领导力", description: "团队领导和影响力", color: "#EC4899" }
];

export const mockCapabilities = [
  { id: "CAP-001", domainId: "T", name: "超声波清洗技术", level: "L4", description: "超声波清洗原理和应用", evidenceCount: 15 },
  { id: "CAP-002", domainId: "T", name: "PLC编程", level: "L3", description: "西门子/三菱PLC编程", evidenceCount: 12 },
  { id: "CAP-003", domainId: "T", name: "机械设计", level: "L4", description: "清洗设备机械结构设计", evidenceCount: 20 },
  { id: "CAP-004", domainId: "S", name: "系统集成", level: "L3", description: "清洗系统集成和调试", evidenceCount: 8 },
  { id: "CAP-005", domainId: "S", name: "工艺优化", level: "L4", description: "清洗工艺参数优化", evidenceCount: 18 },
  { id: "CAP-006", domainId: "D", name: "项目管理", level: "L3", description: "项目计划和执行管理", evidenceCount: 10 },
  { id: "CAP-007", domainId: "D", name: "现场交付", level: "L4", description: "设备现场安装调试", evidenceCount: 25 },
  { id: "CAP-008", domainId: "C", name: "客户沟通", level: "L3", description: "客户需求分析和沟通", evidenceCount: 6 },
  { id: "CAP-009", domainId: "K", name: "技术文档", level: "L2", description: "技术文档编写和管理", evidenceCount: 4 },
  { id: "CAP-010", domainId: "L", name: "团队管理", level: "L3", description: "团队建设和人员管理", evidenceCount: 7 }
];

export const mockEmployeeCapabilities = [
  { employeeId: "EMP-001", employeeName: "张伟", capabilities: [
    { capabilityId: "CAP-001", level: "L4", score: 92 },
    { capabilityId: "CAP-003", level: "L4", score: 88 },
    { capabilityId: "CAP-006", level: "L3", score: 85 },
    { capabilityId: "CAP-007", level: "L4", score: 90 }
  ]},
  { employeeId: "EMP-002", employeeName: "李明", capabilities: [
    { capabilityId: "CAP-002", level: "L3", score: 78 },
    { capabilityId: "CAP-004", level: "L3", score: 82 },
    { capabilityId: "CAP-008", level: "L3", score: 85 }
  ]},
  { employeeId: "EMP-003", employeeName: "王芳", capabilities: [
    { capabilityId: "CAP-001", level: "L3", score: 75 },
    { capabilityId: "CAP-005", level: "L4", score: 88 },
    { capabilityId: "CAP-009", level: "L2", score: 70 }
  ]},
  { employeeId: "EMP-004", employeeName: "刘洋", capabilities: [
    { capabilityId: "CAP-006", level: "L3", score: 80 },
    { capabilityId: "CAP-007", level: "L3", score: 78 },
    { capabilityId: "CAP-010", level: "L3", score: 82 }
  ]}
];

// ==================== HRM模拟数据 ====================
export const mockPositions = [
  { id: "POS-001", name: "电气研发工程师", department: "研发部", level: "P3", headcount: 5, filled: 4, requirements: "本科及以上，3年以上PLC编程经验", positionCode: "RD-EE-001", status: "active" as const, responsibilities: "负责PLC程序开发与调试", keyTasks: "编写PLC程序、电气设计", kpiIndicators: "项目交付率、代码质量" },
  { id: "POS-002", name: "机械工程师", department: "研发部", level: "P3", headcount: 4, filled: 3, requirements: "本科及以上，熟悉SolidWorks/AutoCAD", positionCode: "RD-ME-001", status: "active" as const, responsibilities: "负责机械结构设计", keyTasks: "3D建模、出图、BOM编制", kpiIndicators: "设计准确率、项目进度" },
  { id: "POS-003", name: "销售经理", department: "销售部", level: "M2", headcount: 3, filled: 2, requirements: "5年以上工业设备销售经验", positionCode: "SA-MG-001", status: "active" as const, responsibilities: "负责区域销售管理", keyTasks: "客户开发、订单跟进", kpiIndicators: "销售额、回款率" },
  { id: "POS-004", name: "技术工程师", department: "技术服务部", level: "P2", headcount: 8, filled: 6, requirements: "大专及以上，2年以上设备调试经验", positionCode: "TS-TE-001", status: "active" as const, responsibilities: "负责设备安装调试及售后", keyTasks: "设备调试、故障排查", kpiIndicators: "客户满意度、响应时效" },
  { id: "POS-005", name: "生产经理", department: "生产部", level: "M2", headcount: 2, filled: 2, requirements: "5年以上生产管理经验", positionCode: "PR-MG-001", status: "active" as const, responsibilities: "负责生产计划与管理", keyTasks: "排产、质量控制", kpiIndicators: "产能利用率、良品率" },
  { id: "POS-006", name: "品质工程师", department: "品管部", level: "P2", headcount: 3, filled: 2, requirements: "熟悉ISO9001质量管理体系", positionCode: "QA-QE-001", status: "active" as const, responsibilities: "负责质量检验与改进", keyTasks: "来料检验、过程检验", kpiIndicators: "检验合格率、不良率" }
];

export const mockCandidates = [
  { id: "CAN-001", name: "陈小明", position: "电气研发工程师", positionName: "电气研发工程师", status: "interviewing", source: "BOSS直聘", applyDate: "2026-01-15", phone: "13900139001", email: "chen@email.com", experience: "5年", education: "本科", age: 28, workYears: 5 },
  { id: "CAN-002", name: "李小红", position: "机械工程师", positionName: "机械工程师", status: "offer", source: "猎聘网", applyDate: "2026-01-10", phone: "13900139002", email: "li@email.com", experience: "4年", education: "硕士", age: 27, workYears: 4 },
  { id: "CAN-003", name: "王小强", position: "技术工程师", positionName: "技术工程师", status: "hired", source: "内部推荐", applyDate: "2025-12-20", phone: "13900139003", email: "wang@email.com", experience: "3年", education: "大专", age: 25, workYears: 3 },
  { id: "CAN-004", name: "张小丽", position: "销售经理", positionName: "销售经理", status: "new", source: "校园招聘", applyDate: "2026-01-20", phone: "13900139004", email: "zhang@email.com", experience: "6年", education: "本科", age: 30, workYears: 6 },
  { id: "CAN-005", name: "刘小伟", position: "品质工程师", positionName: "品质工程师", status: "rejected", source: "BOSS直聘", applyDate: "2026-01-05", phone: "13900139005", email: "liu@email.com", experience: "2年", education: "本科", age: 24, workYears: 2 }
];

export const mockEmployees = [
  { id: "EMP-001", name: "张伟", department: "研发部", position: "高级电气工程师", level: "P4", joinDate: "2020-03-15", status: "active", phone: "13800138101", email: "zhangwei@grt.com" },
  { id: "EMP-002", name: "李明", department: "销售部", position: "销售经理", level: "M2", joinDate: "2019-06-01", status: "active", phone: "13800138102", email: "liming@grt.com" },
  { id: "EMP-003", name: "王芳", department: "研发部", position: "机械工程师", level: "P3", joinDate: "2021-08-20", status: "active", phone: "13800138103", email: "wangfang@grt.com" },
  { id: "EMP-004", name: "刘洋", department: "技术服务部", position: "技术主管", level: "M1", joinDate: "2018-01-10", status: "active", phone: "13800138104", email: "liuyang@grt.com" },
  { id: "EMP-005", name: "陈强", department: "生产部", position: "生产经理", level: "M2", joinDate: "2017-05-15", status: "active", phone: "13800138105", email: "chenqiang@grt.com" },
  { id: "EMP-006", name: "赵敏", department: "品管部", position: "品质主管", level: "M1", joinDate: "2019-11-01", status: "active", phone: "13800138106", email: "zhaomin@grt.com" }
];

// ==================== 成本管理模拟数据 ====================
export const mockCostCategories = [
  { id: "CAT-001", name: "材料费", type: "direct", description: "原材料和零部件采购" },
  { id: "CAT-002", name: "人工费", type: "direct", description: "直接人工成本" },
  { id: "CAT-003", name: "设备费", type: "direct", description: "设备租赁和折旧" },
  { id: "CAT-004", name: "差旅费", type: "indirect", description: "出差交通和住宿" },
  { id: "CAT-005", name: "外协费", type: "direct", description: "外包加工费用" },
  { id: "CAT-006", name: "管理费", type: "indirect", description: "项目管理费用" }
];

export const mockProjectCosts = [
  { projectId: "PRJ-2026-001", categoryId: "CAT-001", budgetAmount: 1200000, actualAmount: 420000, description: "主要材料采购" },
  { projectId: "PRJ-2026-001", categoryId: "CAT-002", budgetAmount: 600000, actualAmount: 210000, description: "研发和生产人工" },
  { projectId: "PRJ-2026-001", categoryId: "CAT-003", budgetAmount: 300000, actualAmount: 105000, description: "设备使用费" },
  { projectId: "PRJ-2026-001", categoryId: "CAT-004", budgetAmount: 200000, actualAmount: 70000, description: "现场出差费用" },
  { projectId: "PRJ-2026-001", categoryId: "CAT-005", budgetAmount: 150000, actualAmount: 52500, description: "外协加工" },
  { projectId: "PRJ-2026-001", categoryId: "CAT-006", budgetAmount: 50000, actualAmount: 17500, description: "项目管理" }
];

// ==================== 质量管理模拟数据 ====================
export const mockQCRecords = [
  { id: "QC-001", projectId: "PRJ-2026-001", type: "incoming", result: "pass", inspector: "赵敏", inspectDate: "2026-01-10", items: 50, passItems: 48, failItems: 2, description: "原材料进货检验" },
  { id: "QC-002", projectId: "PRJ-2026-001", type: "process", result: "pass", inspector: "孙磊", inspectDate: "2026-01-15", items: 30, passItems: 29, failItems: 1, description: "过程检验" },
  { id: "QC-003", projectId: "PRJ-2026-002", type: "final", result: "pass", inspector: "赵敏", inspectDate: "2026-01-18", items: 100, passItems: 98, failItems: 2, description: "成品检验" },
  { id: "QC-004", projectId: "PRJ-2026-002", type: "incoming", result: "fail", inspector: "周婷", inspectDate: "2026-01-20", items: 40, passItems: 32, failItems: 8, description: "电气元件检验" }
];

// ==================== 售后服务模拟数据 ====================
export const mockServiceTickets = [
  { id: "SVC-001", customerId: "CUS-001", projectId: "PRJ-2026-001", type: "maintenance", status: "in_progress", priority: "high", createDate: "2026-01-25", assignee: "刘洋", description: "设备定期保养" },
  { id: "SVC-002", customerId: "CUS-002", projectId: "PRJ-2026-002", type: "repair", status: "pending", priority: "urgent", createDate: "2026-01-28", assignee: "李明", description: "清洗泵故障维修" },
  { id: "SVC-003", customerId: "CUS-005", projectId: "PRJ-2026-005", type: "consultation", status: "completed", priority: "normal", createDate: "2026-01-20", assignee: "王芳", description: "工艺参数咨询" }
];

// ==================== 培训管理模拟数据 ====================
export const mockTrainings = [
  { id: "TRN-001", name: "超声波清洗技术培训", type: "technical", status: "completed", startDate: "2026-01-10", endDate: "2026-01-12", trainer: "张伟", participants: 15, location: "培训室A" },
  { id: "TRN-002", name: "PLC编程进阶课程", type: "technical", status: "in_progress", startDate: "2026-01-25", endDate: "2026-01-30", trainer: "李明", participants: 10, location: "培训室B" },
  { id: "TRN-003", name: "项目管理基础", type: "management", status: "scheduled", startDate: "2026-02-15", endDate: "2026-02-17", trainer: "外部讲师", participants: 20, location: "会议室1" },
  { id: "TRN-004", name: "安全生产培训", type: "safety", status: "scheduled", startDate: "2026-02-01", endDate: "2026-02-01", trainer: "陈强", participants: 50, location: "大会议室" }
];

// 导出所有模拟数据
export const mockData = {
  projects: mockProjects,
  gateDefinitions: mockGateDefinitions,
  gateReviews: mockGateReviews,
  customers: mockCustomers,
  opportunities: mockOpportunities,
  capabilityDomains: mockCapabilityDomains,
  capabilities: mockCapabilities,
  employeeCapabilities: mockEmployeeCapabilities,
  positions: mockPositions,
  candidates: mockCandidates,
  employees: mockEmployees,
  costCategories: mockCostCategories,
  projectCosts: mockProjectCosts,
  qcRecords: mockQCRecords,
  serviceTickets: mockServiceTickets,
  trainings: mockTrainings
};
