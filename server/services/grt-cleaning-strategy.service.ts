/**
 * GRT Cleaning Strategy Service
 * Manages cleaning strategies, part feature analysis, engineer checkpoints, and I/O lists.
 */

export interface CleaningStrategy {
  featureType: string;
  recommendedAction: string;
  description: string;
  parameters: Record<string, any>;
}

const STRATEGIES: CleaningStrategy[] = [
  {
    featureType: "blind_hole",
    recommendedAction: "spiral_tilt",
    description: "盲孔螺旋倾斜清洗",
    parameters: { angle: 15, pressure: 120 },
  },
  {
    featureType: "ribbing",
    recommendedAction: "linear_sweep",
    description: "加强筋线性扫描清洗",
    parameters: { speed: 50, pressure: 100 },
  },
  {
    featureType: "sealing_face",
    recommendedAction: "overlap_scan",
    description: "密封面重叠扫描清洗",
    parameters: { overlap: 30, pressure: 80 },
  },
  {
    featureType: "thread",
    recommendedAction: "rotary_flush",
    description: "螺纹旋转冲洗",
    parameters: { rpm: 200, pressure: 110 },
  },
  {
    featureType: "deep_cavity",
    recommendedAction: "pulsed_jet",
    description: "深腔脉冲喷射清洗",
    parameters: { pulseFreq: 5, pressure: 150 },
  },
];

export function getCleaningStrategy(featureType: string): CleaningStrategy {
  const strategy = STRATEGIES.find((s) => s.featureType === featureType);
  if (strategy) return strategy;
  return {
    featureType,
    recommendedAction: "standard_wash",
    description: "标准清洗",
    parameters: { pressure: 100 },
  };
}

export function getAllCleaningStrategies(): CleaningStrategy[] {
  return [...STRATEGIES];
}

export interface PartFeatureAnalysis {
  strategies: CleaningStrategy[];
  cycleTimeEstimate: number;
  layoutRecommendation: string;
}

export function analyzePartFeatures(features: string[]): PartFeatureAnalysis {
  const strategies = features.map((f) => getCleaningStrategy(f));
  const cycleTimeEstimate = strategies.length * 15; // 15 seconds per feature
  return {
    strategies,
    cycleTimeEstimate,
    layoutRecommendation: strategies.length > 2
      ? "建议使用多工位并行清洗布局"
      : "建议使用单工位顺序清洗布局",
  };
}

export interface FailureZone {
  zone: string;
  description: string;
  severity: "minor" | "moderate" | "severe";
}

export interface FailureHandlingResult {
  suggestedActions: string[];
  retestRequired: boolean;
}

export function handleToothpasteTestFailure(
  failureZones: FailureZone[]
): FailureHandlingResult {
  const suggestedActions = failureZones.map(
    (zone) => `调整${zone.zone}区域清洗参数: ${zone.description}`
  );
  const hasSevere = failureZones.some((z) => z.severity === "severe");
  return {
    suggestedActions,
    retestRequired: hasSevere || failureZones.length > 0,
  };
}

export interface EngineerCheckpoint {
  checkpointId: string;
  phaseCode: string;
  checkpointName: string;
  required: boolean;
}

const ENGINEER_CHECKPOINTS: EngineerCheckpoint[] = [
  // M0
  { checkpointId: "M0-CHK-001", phaseCode: "M0", checkpointName: "项目需求确认", required: true },
  { checkpointId: "M0-CHK-002", phaseCode: "M0", checkpointName: "可行性评估", required: true },
  // M1
  { checkpointId: "M1-CHK-001", phaseCode: "M1", checkpointName: "概念设计确认", required: true },
  // M2
  { checkpointId: "M2-CHK-001", phaseCode: "M2", checkpointName: "详细设计确认", required: true },
  // M3
  { checkpointId: "M3-CHK-001", phaseCode: "M3", checkpointName: "清洗策略确认", required: true },
  // M4
  { checkpointId: "M4-CHK-001", phaseCode: "M4", checkpointName: "采购确认", required: true },
  // M5
  { checkpointId: "M5-CHK-001", phaseCode: "M5", checkpointName: "机械设计确认", required: true },
  { checkpointId: "M5-CHK-002", phaseCode: "M5", checkpointName: "电气设计确认", required: true },
  // M6
  { checkpointId: "M6-CHK-001", phaseCode: "M6", checkpointName: "装配确认", required: true },
  // M7
  { checkpointId: "M7-CHK-001", phaseCode: "M7", checkpointName: "调试确认", required: true },
  // M8
  { checkpointId: "M8-CHK-001", phaseCode: "M8", checkpointName: "牙膏试验确认", required: true },
  { checkpointId: "M8-CHK-002", phaseCode: "M8", checkpointName: "清洁度检测确认", required: true },
  // M9
  { checkpointId: "M9-CHK-001", phaseCode: "M9", checkpointName: "FAT确认", required: true },
  // M10
  { checkpointId: "M10-CHK-001", phaseCode: "M10", checkpointName: "发货确认", required: true },
  // M11
  { checkpointId: "M11-CHK-001", phaseCode: "M11", checkpointName: "SAT确认", required: true },
  // M12
  { checkpointId: "M12-CHK-001", phaseCode: "M12", checkpointName: "项目关闭确认", required: true },
];

export function getEngineerCheckpoints(phaseCode: string): EngineerCheckpoint[] {
  return ENGINEER_CHECKPOINTS.filter((cp) => cp.phaseCode === phaseCode);
}

export function getAllEngineerCheckpoints(): EngineerCheckpoint[] {
  return [...ENGINEER_CHECKPOINTS];
}

export interface Confirmation {
  checkpointId: string;
  confirmed: boolean;
  confirmedBy: string;
}

export interface ValidationResult {
  allConfirmed: boolean;
  pendingCheckpoints: EngineerCheckpoint[];
}

export function validateEngineerConfirmation(
  phaseCode: string,
  confirmations: Confirmation[]
): ValidationResult {
  const checkpoints = getEngineerCheckpoints(phaseCode);
  const confirmedIds = new Set(
    confirmations.filter((c) => c.confirmed).map((c) => c.checkpointId)
  );
  const pendingCheckpoints = checkpoints.filter(
    (cp) => cp.required && !confirmedIds.has(cp.checkpointId)
  );
  return {
    allConfirmed: pendingCheckpoints.length === 0,
    pendingCheckpoints,
  };
}

export interface TechnicalProposalSummary {
  cleaningDifficulties: string[];
  cycleTimeCalculation: {
    totalCycleTime: number;
    meetsTarget: boolean;
  };
  layoutSuggestion: string;
  pumpSizing: string;
}

export function generateTechnicalProposalSummary(
  features: string[],
  targetCycleTime: number
): TechnicalProposalSummary {
  const analysis = analyzePartFeatures(features);
  const cleaningDifficulties = features.map(
    (f) => `${f}特征需要特殊清洗策略`
  );
  return {
    cleaningDifficulties,
    cycleTimeCalculation: {
      totalCycleTime: analysis.cycleTimeEstimate,
      meetsTarget: analysis.cycleTimeEstimate <= targetCycleTime,
    },
    layoutSuggestion: analysis.layoutRecommendation,
    pumpSizing: features.includes("deep_cavity")
      ? "建议使用高压泵（150bar以上）"
      : "标准泵即可满足需求",
  };
}

export interface IOSignal {
  name: string;
  address: string;
  type: string;
  description: string;
}

export interface IOList {
  inputs: IOSignal[];
  outputs: IOSignal[];
}

export function generateIOList(): IOList {
  return {
    inputs: [
      { name: "Robot_Enter_Request", address: "I0.0", type: "DI", description: "机器人进入请求" },
      { name: "Emergency_Stop", address: "I0.1", type: "DI", description: "急停信号" },
      { name: "Part_Sensor", address: "I0.2", type: "DI", description: "工件检测传感器" },
      { name: "Pressure_Feedback", address: "IW64", type: "AI", description: "压力反馈" },
      { name: "Temperature_Feedback", address: "IW66", type: "AI", description: "温度反馈" },
    ],
    outputs: [
      { name: "Pump_Run", address: "Q0.0", type: "DO", description: "泵运行" },
      { name: "Robot_Enable", address: "Q0.1", type: "DO", description: "机器人使能" },
      { name: "Valve_Open", address: "Q0.2", type: "DO", description: "阀门开启" },
      { name: "Heater_On", address: "Q0.3", type: "DO", description: "加热器开启" },
    ],
  };
}
