/**
 * Tier1 Customer Project Seed Data
 * Sample data for Tier1 customers, projects, and gate check records
 */

export interface Tier1Customer {
  name: string;
  code: string;
  tier: string;
  industry: string;
  region: string;
  contact: string;
  requirements: string;
}

export interface PhaseHistoryEntry {
  phase: string;
  startDate: string;
  endDate?: string;
  status: string;
}

export interface Tier1Project {
  projectCode: string;
  customerCode: string;
  currentPhase: string;
  isRedBlueRequired: boolean;
  complexity: string;
  phaseHistory: PhaseHistoryEntry[];
  cleaningProcess: string;
  targetCleanliness: string;
  cycleTime: number;
}

export interface CheckItem {
  category: string;
  item: string;
  result: string;
  score: number;
}

export interface Issue {
  id: string;
  description: string;
  severity: string;
  status: string;
}

export interface AiDiagnosis {
  riskScore: number;
  recommendations: string[];
  confidence: number;
}

export interface GateCheckRecord {
  recordId: string;
  projectCode: string;
  gate: string;
  checkDate: string;
  checker: string;
  overallResult: string;
  checkItems: CheckItem[];
  issues: Issue[];
  aiDiagnosis: AiDiagnosis;
}

export const SAMPLE_TIER1_CUSTOMERS: Tier1Customer[] = [
  {
    name: "博世汽车部件（苏州）有限公司",
    code: "BOSCH-SZ",
    tier: "tier1",
    industry: "汽车零部件",
    region: "华东",
    contact: "张经理",
    requirements: "清洁度要求ISO 16232标准，颗粒物限值CCC-A级",
  },
  {
    name: "采埃孚（上海）汽车系统有限公司",
    code: "ZF-SH",
    tier: "tier1",
    industry: "变速箱及传动系统",
    region: "华东",
    contact: "李振国",
    requirements: "变速箱零件清洗，VDA 19.1标准，颗粒度要求严格",
  },
  {
    name: "大陆集团（芜湖）有限公司",
    code: "CONTI-WH",
    tier: "tier1",
    industry: "汽车电子",
    region: "华东",
    contact: "王志远",
    requirements: "电子元器件精密清洗，ESD防护要求，洁净度Class 100",
  },
];

export const SAMPLE_TIER1_PROJECTS: Tier1Project[] = [
  {
    projectCode: "PRJ-BOSCH-2024-001",
    customerCode: "BOSCH-SZ",
    currentPhase: "M7",
    isRedBlueRequired: true,
    complexity: "high",
    phaseHistory: [
      { phase: "M1", startDate: "2024-01-15", endDate: "2024-02-28", status: "completed" },
      { phase: "M2", startDate: "2024-03-01", endDate: "2024-04-15", status: "completed" },
      { phase: "M3", startDate: "2024-04-16", endDate: "2024-06-30", status: "completed" },
      { phase: "M4", startDate: "2024-07-01", endDate: "2024-08-15", status: "completed" },
      { phase: "M5", startDate: "2024-08-16", endDate: "2024-10-31", status: "completed" },
      { phase: "M6", startDate: "2024-11-01", endDate: "2025-01-15", status: "completed" },
      { phase: "M7", startDate: "2025-01-16", status: "in_progress" },
    ],
    cleaningProcess: "多工位超声波+喷淋+真空干燥",
    targetCleanliness: "ISO 16232 CCC-A",
    cycleTime: 120,
  },
  {
    projectCode: "PRJ-ZF-2024-002",
    customerCode: "ZF-SH",
    currentPhase: "M6",
    isRedBlueRequired: true,
    complexity: "very_high",
    phaseHistory: [
      { phase: "M1", startDate: "2024-02-01", endDate: "2024-03-15", status: "completed" },
      { phase: "M2", startDate: "2024-03-16", endDate: "2024-05-31", status: "completed" },
      { phase: "M3", startDate: "2024-06-01", endDate: "2024-08-31", status: "completed" },
      { phase: "M4", startDate: "2024-09-01", endDate: "2024-10-15", status: "completed" },
      { phase: "M5", startDate: "2024-10-16", endDate: "2024-12-31", status: "completed" },
      { phase: "M6", startDate: "2025-01-01", status: "in_progress" },
    ],
    cleaningProcess: "高压喷淋+超声波+热风干燥",
    targetCleanliness: "VDA 19.1 Level 2",
    cycleTime: 90,
  },
];

export const SAMPLE_GATE_CHECK_RECORDS: GateCheckRecord[] = [
  {
    recordId: "GCR-BOSCH-M7-001",
    projectCode: "PRJ-BOSCH-2024-001",
    gate: "M7",
    checkDate: "2025-01-20",
    checker: "质量工程师A",
    overallResult: "conditional_pass",
    checkItems: [
      { category: "cleaning_performance", item: "清洗效果目视检查", result: "pass", score: 95 },
      { category: "cleaning_performance", item: "清洁度测试（ISO 16232）", result: "pass", score: 90 },
      { category: "cleaning_performance", item: "颗粒物计数检测", result: "pass", score: 88 },
      { category: "cleaning_performance", item: "清洗剂浓度验证", result: "pass", score: 92 },
      { category: "mechanical_system", item: "喷淋系统压力测试", result: "pass", score: 95 },
      { category: "mechanical_system", item: "传输系统运行测试", result: "pass", score: 90 },
      { category: "mechanical_system", item: "泵组运行状态检查", result: "conditional", score: 78 },
      { category: "electrical_control", item: "PLC程序功能测试", result: "pass", score: 96 },
      { category: "electrical_control", item: "HMI界面功能验证", result: "pass", score: 94 },
      { category: "electrical_control", item: "传感器信号验证", result: "pass", score: 91 },
      { category: "process_parameters", item: "温度控制精度测试", result: "pass", score: 93 },
      { category: "process_parameters", item: "清洗时间参数验证", result: "pass", score: 90 },
      { category: "cycle_time", item: "单件节拍时间测试", result: "pass", score: 85 },
      { category: "safety_compliance", item: "急停功能测试", result: "pass", score: 100 },
      { category: "safety_compliance", item: "安全防护装置检查", result: "pass", score: 98 },
      { category: "documentation", item: "操作手册完整性检查", result: "conditional", score: 75 },
    ],
    issues: [
      {
        id: "ISS-001",
        description: "3号泵组运行时有轻微异常振动",
        severity: "medium",
        status: "open",
      },
      {
        id: "ISS-002",
        description: "操作手册中维护章节缺少详细步骤",
        severity: "low",
        status: "open",
      },
    ],
    aiDiagnosis: {
      riskScore: 35,
      recommendations: [
        "建议对3号泵组进行详细振动分析，可能需要更换轴承",
        "操作手册维护章节需补充详细维护步骤和维护周期表",
        "建议增加泵组运行监控传感器以实现预测性维护",
      ],
      confidence: 0.85,
    },
  },
];

/**
 * Validate Tier1 delivery requirements for a project
 */
export function validateTier1DeliveryRequirements(project: Tier1Project): {
  isRedBlueRequired: boolean;
  requiredChecks: string[];
  weightMultiplier: number;
} {
  const isRedBlueRequired =
    project.isRedBlueRequired ||
    project.complexity === "very_high" ||
    project.complexity === "high";

  const requiredChecks: string[] = [
    "cleaning_performance",
    "mechanical_system",
    "electrical_control",
    "safety_compliance",
  ];

  const weightMultiplier = project.complexity === "very_high" ? 1.5 : 1.2;

  return {
    isRedBlueRequired,
    requiredChecks,
    weightMultiplier,
  };
}
