/**
 * GRT智能人才网格 - 清洗工艺手册故障排除引导路径
 * 
 * 将《清洗工艺手册》转化为90%准确率的故障排除引导路径
 * 基于GRT工业清洗设备的专业知识构建
 */

// ============================================================================
// 故障类型定义
// ============================================================================

export type FaultCategory = 
  | 'mechanical'      // 机械故障
  | 'electrical'      // 电气故障
  | 'hydraulic'       // 液压故障
  | 'pneumatic'       // 气动故障
  | 'process'         // 工艺故障
  | 'quality'         // 质量故障
  | 'safety'          // 安全故障
  | 'software';       // 软件故障

export type EquipmentType = 
  | 'ultrasonic_cleaner'      // 超声波清洗机
  | 'spray_washer'            // 喷淋清洗机
  | 'immersion_tank'          // 浸泡槽
  | 'high_pressure_washer'    // 高压清洗机
  | 'vacuum_dryer'            // 真空干燥机
  | 'centrifugal_dryer'       // 离心干燥机
  | 'hot_air_dryer'           // 热风干燥机
  | 'conveyor_system'         // 输送系统
  | 'filtration_system'       // 过滤系统
  | 'chemical_dosing';        // 化学品投加系统

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// 故障症状定义
// ============================================================================

export interface FaultSymptom {
  symptomId: string;
  symptomName: string;
  symptomNameEn: string;
  description: string;
  category: FaultCategory;
  applicableEquipment: EquipmentType[];
  severity: SeverityLevel;
  keywords: string[];
  relatedSymptoms: string[];
}

// ============================================================================
// 故障原因定义
// ============================================================================

export interface FaultCause {
  causeId: string;
  causeName: string;
  causeNameEn: string;
  description: string;
  probability: number;  // 0-100 概率百分比
  requiredSkillLevel: 1 | 2 | 3 | 4 | 5;
  diagnosticSteps: DiagnosticStep[];
  relatedCauses: string[];
}

export interface DiagnosticStep {
  stepNumber: number;
  instruction: string;
  expectedResult: string;
  tools?: string[];
  safetyNotes?: string[];
  timeEstimate?: number;  // 分钟
}

// ============================================================================
// 解决方案定义
// ============================================================================

export interface Solution {
  solutionId: string;
  solutionName: string;
  solutionNameEn: string;
  description: string;
  steps: SolutionStep[];
  requiredParts: RequiredPart[];
  requiredTools: string[];
  estimatedTime: number;  // 分钟
  requiredSkillLevel: 1 | 2 | 3 | 4 | 5;
  safetyPrecautions: string[];
  verificationSteps: string[];
  successRate: number;  // 0-100
}

export interface SolutionStep {
  stepNumber: number;
  instruction: string;
  detailedDescription?: string;
  imageUrl?: string;
  videoUrl?: string;
  warningNotes?: string[];
  checkpoints?: string[];
}

export interface RequiredPart {
  partCode: string;
  partName: string;
  quantity: number;
  isOptional: boolean;
  alternativeParts?: string[];
}

// ============================================================================
// 故障排除路径定义
// ============================================================================

export interface TroubleshootingPath {
  pathId: string;
  symptom: FaultSymptom;
  possibleCauses: FaultCause[];
  solutions: Map<string, Solution[]>;  // causeId -> solutions
  decisionTree: DecisionNode;
  confidenceScore: number;  // 0-100
  lastUpdated: Date;
  sourceReference: string;
}

export interface DecisionNode {
  nodeId: string;
  nodeType: 'question' | 'action' | 'solution' | 'escalate';
  content: string;
  yesPath?: DecisionNode;
  noPath?: DecisionNode;
  solutionId?: string;
  escalationReason?: string;
}

// ============================================================================
// 清洗工艺故障知识库
// ============================================================================

export const FAULT_SYMPTOMS: FaultSymptom[] = [
  // 超声波清洗机故障症状
  {
    symptomId: 'SYM_USC_001',
    symptomName: '超声波功率不足',
    symptomNameEn: 'Insufficient Ultrasonic Power',
    description: '清洗效果明显下降，工件表面污渍残留',
    category: 'mechanical',
    applicableEquipment: ['ultrasonic_cleaner'],
    severity: 'high',
    keywords: ['功率', '清洗效果', '污渍残留', '超声波'],
    relatedSymptoms: ['SYM_USC_002', 'SYM_USC_003']
  },
  {
    symptomId: 'SYM_USC_002',
    symptomName: '超声波振子异响',
    symptomNameEn: 'Abnormal Transducer Noise',
    description: '超声波振子发出异常噪音或振动',
    category: 'mechanical',
    applicableEquipment: ['ultrasonic_cleaner'],
    severity: 'medium',
    keywords: ['振子', '异响', '噪音', '振动'],
    relatedSymptoms: ['SYM_USC_001']
  },
  {
    symptomId: 'SYM_USC_003',
    symptomName: '清洗液温度异常',
    symptomNameEn: 'Abnormal Cleaning Solution Temperature',
    description: '清洗液温度无法达到设定值或波动过大',
    category: 'process',
    applicableEquipment: ['ultrasonic_cleaner', 'immersion_tank'],
    severity: 'medium',
    keywords: ['温度', '加热', '温控', '波动'],
    relatedSymptoms: ['SYM_USC_001']
  },
  
  // 喷淋清洗机故障症状
  {
    symptomId: 'SYM_SPR_001',
    symptomName: '喷淋压力不足',
    symptomNameEn: 'Insufficient Spray Pressure',
    description: '喷淋压力低于设定值，清洗效果下降',
    category: 'hydraulic',
    applicableEquipment: ['spray_washer', 'high_pressure_washer'],
    severity: 'high',
    keywords: ['压力', '喷淋', '清洗效果'],
    relatedSymptoms: ['SYM_SPR_002', 'SYM_SPR_003']
  },
  {
    symptomId: 'SYM_SPR_002',
    symptomName: '喷嘴堵塞',
    symptomNameEn: 'Nozzle Blockage',
    description: '喷嘴部分或完全堵塞，喷淋不均匀',
    category: 'mechanical',
    applicableEquipment: ['spray_washer', 'high_pressure_washer'],
    severity: 'medium',
    keywords: ['喷嘴', '堵塞', '不均匀'],
    relatedSymptoms: ['SYM_SPR_001']
  },
  {
    symptomId: 'SYM_SPR_003',
    symptomName: '泵浦异常振动',
    symptomNameEn: 'Abnormal Pump Vibration',
    description: '清洗泵发出异常振动或噪音',
    category: 'mechanical',
    applicableEquipment: ['spray_washer', 'high_pressure_washer'],
    severity: 'high',
    keywords: ['泵', '振动', '噪音'],
    relatedSymptoms: ['SYM_SPR_001']
  },
  
  // 干燥设备故障症状
  {
    symptomId: 'SYM_DRY_001',
    symptomName: '干燥效果不佳',
    symptomNameEn: 'Poor Drying Performance',
    description: '工件干燥后仍有水渍或潮湿',
    category: 'process',
    applicableEquipment: ['vacuum_dryer', 'centrifugal_dryer', 'hot_air_dryer'],
    severity: 'medium',
    keywords: ['干燥', '水渍', '潮湿'],
    relatedSymptoms: ['SYM_DRY_002', 'SYM_DRY_003']
  },
  {
    symptomId: 'SYM_DRY_002',
    symptomName: '真空度不足',
    symptomNameEn: 'Insufficient Vacuum Level',
    description: '真空干燥机无法达到设定真空度',
    category: 'pneumatic',
    applicableEquipment: ['vacuum_dryer'],
    severity: 'high',
    keywords: ['真空', '真空度', '泄漏'],
    relatedSymptoms: ['SYM_DRY_001']
  },
  {
    symptomId: 'SYM_DRY_003',
    symptomName: '离心机振动过大',
    symptomNameEn: 'Excessive Centrifuge Vibration',
    description: '离心干燥机运行时振动异常',
    category: 'mechanical',
    applicableEquipment: ['centrifugal_dryer'],
    severity: 'critical',
    keywords: ['离心', '振动', '不平衡'],
    relatedSymptoms: ['SYM_DRY_001']
  },
  
  // 质量相关故障症状
  {
    symptomId: 'SYM_QUA_001',
    symptomName: '清洁度不达标',
    symptomNameEn: 'Cleanliness Below Standard',
    description: '工件清洗后清洁度检测不合格',
    category: 'quality',
    applicableEquipment: ['ultrasonic_cleaner', 'spray_washer', 'immersion_tank', 'high_pressure_washer'],
    severity: 'high',
    keywords: ['清洁度', '不合格', '检测'],
    relatedSymptoms: ['SYM_USC_001', 'SYM_SPR_001']
  },
  {
    symptomId: 'SYM_QUA_002',
    symptomName: '工件表面损伤',
    symptomNameEn: 'Workpiece Surface Damage',
    description: '清洗后工件表面出现划痕、腐蚀或变色',
    category: 'quality',
    applicableEquipment: ['ultrasonic_cleaner', 'spray_washer', 'immersion_tank'],
    severity: 'critical',
    keywords: ['表面', '损伤', '划痕', '腐蚀', '变色'],
    relatedSymptoms: ['SYM_USC_003']
  }
];

export const FAULT_CAUSES: FaultCause[] = [
  // 超声波功率不足的原因
  {
    causeId: 'CAU_USC_001',
    causeName: '超声波发生器故障',
    causeNameEn: 'Ultrasonic Generator Failure',
    description: '超声波发生器输出功率下降或不稳定',
    probability: 35,
    requiredSkillLevel: 4,
    diagnosticSteps: [
      {
        stepNumber: 1,
        instruction: '检查发生器显示面板，确认功率输出读数',
        expectedResult: '功率读数应与设定值一致',
        tools: ['万用表'],
        timeEstimate: 5
      },
      {
        stepNumber: 2,
        instruction: '测量发生器输出电压',
        expectedResult: '输出电压应在额定范围内（±10%）',
        tools: ['示波器', '万用表'],
        safetyNotes: ['确保设备断电后再进行测量'],
        timeEstimate: 15
      },
      {
        stepNumber: 3,
        instruction: '检查发生器内部电容和功率管',
        expectedResult: '无明显烧毁或膨胀迹象',
        tools: ['螺丝刀', '万用表'],
        safetyNotes: ['等待电容放电后再操作'],
        timeEstimate: 20
      }
    ],
    relatedCauses: ['CAU_USC_002', 'CAU_USC_003']
  },
  {
    causeId: 'CAU_USC_002',
    causeName: '振子脱胶或损坏',
    causeNameEn: 'Transducer Debonding or Damage',
    description: '超声波振子与槽体粘接脱落或振子本身损坏',
    probability: 25,
    requiredSkillLevel: 3,
    diagnosticSteps: [
      {
        stepNumber: 1,
        instruction: '排空清洗槽，检查振子表面',
        expectedResult: '振子表面无裂纹、脱落迹象',
        tools: ['手电筒', '检查镜'],
        timeEstimate: 10
      },
      {
        stepNumber: 2,
        instruction: '用手轻敲振子，听声音判断粘接状态',
        expectedResult: '声音清脆，无空洞感',
        timeEstimate: 5
      },
      {
        stepNumber: 3,
        instruction: '测量振子阻抗',
        expectedResult: '阻抗值应在规格范围内',
        tools: ['阻抗分析仪'],
        timeEstimate: 15
      }
    ],
    relatedCauses: ['CAU_USC_001']
  },
  {
    causeId: 'CAU_USC_003',
    causeName: '清洗液浓度不当',
    causeNameEn: 'Improper Cleaning Solution Concentration',
    description: '清洗液浓度过高或过低影响超声波传导',
    probability: 20,
    requiredSkillLevel: 2,
    diagnosticSteps: [
      {
        stepNumber: 1,
        instruction: '使用折光仪测量清洗液浓度',
        expectedResult: '浓度应在推荐范围内（通常3-8%）',
        tools: ['折光仪'],
        timeEstimate: 5
      },
      {
        stepNumber: 2,
        instruction: '检查清洗液外观和气味',
        expectedResult: '液体清澈，无异味或沉淀',
        timeEstimate: 3
      },
      {
        stepNumber: 3,
        instruction: '测量清洗液pH值',
        expectedResult: 'pH值应在工艺要求范围内',
        tools: ['pH计'],
        timeEstimate: 5
      }
    ],
    relatedCauses: []
  },
  
  // 喷淋压力不足的原因
  {
    causeId: 'CAU_SPR_001',
    causeName: '泵浦磨损',
    causeNameEn: 'Pump Wear',
    description: '清洗泵叶轮或密封件磨损导致效率下降',
    probability: 30,
    requiredSkillLevel: 3,
    diagnosticSteps: [
      {
        stepNumber: 1,
        instruction: '检查泵浦运行电流',
        expectedResult: '电流应在额定范围内',
        tools: ['钳形电流表'],
        timeEstimate: 5
      },
      {
        stepNumber: 2,
        instruction: '检查泵浦出口压力',
        expectedResult: '压力应达到设计值',
        tools: ['压力表'],
        timeEstimate: 5
      },
      {
        stepNumber: 3,
        instruction: '检查泵浦是否有泄漏',
        expectedResult: '无明显泄漏',
        timeEstimate: 10
      }
    ],
    relatedCauses: ['CAU_SPR_002']
  },
  {
    causeId: 'CAU_SPR_002',
    causeName: '过滤器堵塞',
    causeNameEn: 'Filter Blockage',
    description: '进液过滤器堵塞导致流量下降',
    probability: 40,
    requiredSkillLevel: 2,
    diagnosticSteps: [
      {
        stepNumber: 1,
        instruction: '检查过滤器压差',
        expectedResult: '压差应小于0.5bar',
        tools: ['压差表'],
        timeEstimate: 3
      },
      {
        stepNumber: 2,
        instruction: '目视检查过滤器滤芯',
        expectedResult: '滤芯无明显堵塞或变色',
        timeEstimate: 10
      }
    ],
    relatedCauses: ['CAU_SPR_001']
  }
];

export const SOLUTIONS: Solution[] = [
  // 超声波发生器故障解决方案
  {
    solutionId: 'SOL_USC_001',
    solutionName: '更换超声波发生器',
    solutionNameEn: 'Replace Ultrasonic Generator',
    description: '更换故障的超声波发生器',
    steps: [
      {
        stepNumber: 1,
        instruction: '关闭设备电源，断开主电源',
        warningNotes: ['确保完全断电', '等待5分钟让电容放电'],
        checkpoints: ['电源指示灯熄灭']
      },
      {
        stepNumber: 2,
        instruction: '拆除发生器与振子的连接线',
        detailedDescription: '记录连接线的位置和颜色，便于安装新发生器时正确连接',
        checkpoints: ['拍照记录连接方式']
      },
      {
        stepNumber: 3,
        instruction: '拆除发生器固定螺丝，取出旧发生器',
        checkpoints: ['检查安装位置是否清洁']
      },
      {
        stepNumber: 4,
        instruction: '安装新发生器，连接振子线',
        checkpoints: ['确认连接线颜色对应正确']
      },
      {
        stepNumber: 5,
        instruction: '设置发生器参数，进行功能测试',
        checkpoints: ['功率输出正常', '无异常报警']
      }
    ],
    requiredParts: [
      {
        partCode: 'USG-001',
        partName: '超声波发生器',
        quantity: 1,
        isOptional: false
      }
    ],
    requiredTools: ['螺丝刀套装', '万用表', '绝缘手套'],
    estimatedTime: 60,
    requiredSkillLevel: 4,
    safetyPrecautions: [
      '必须完全断电后操作',
      '等待电容放电（至少5分钟）',
      '佩戴绝缘手套'
    ],
    verificationSteps: [
      '检查功率输出是否达到额定值',
      '运行清洗测试，检查清洗效果',
      '监控运行1小时，确认无异常'
    ],
    successRate: 95
  },
  
  // 振子脱胶解决方案
  {
    solutionId: 'SOL_USC_002',
    solutionName: '重新粘接振子',
    solutionNameEn: 'Re-bond Transducer',
    description: '使用专用胶水重新粘接脱落的振子',
    steps: [
      {
        stepNumber: 1,
        instruction: '排空清洗槽，清洁振子安装面',
        detailedDescription: '使用丙酮或酒精彻底清洁振子和槽体接触面',
        checkpoints: ['表面无油污、无残胶']
      },
      {
        stepNumber: 2,
        instruction: '打磨振子和槽体接触面',
        detailedDescription: '使用细砂纸轻微打磨，增加粘接面积',
        warningNotes: ['不要过度打磨'],
        checkpoints: ['表面均匀粗糙']
      },
      {
        stepNumber: 3,
        instruction: '涂抹专用环氧胶',
        detailedDescription: '均匀涂抹，避免气泡',
        checkpoints: ['胶层厚度均匀']
      },
      {
        stepNumber: 4,
        instruction: '定位振子，施加压力固化',
        detailedDescription: '使用夹具固定，保持24小时',
        checkpoints: ['振子位置正确', '无移位']
      },
      {
        stepNumber: 5,
        instruction: '固化完成后进行测试',
        checkpoints: ['阻抗值正常', '功率输出正常']
      }
    ],
    requiredParts: [
      {
        partCode: 'EPX-001',
        partName: '超声波振子专用环氧胶',
        quantity: 1,
        isOptional: false
      }
    ],
    requiredTools: ['砂纸', '丙酮', '夹具', '阻抗分析仪'],
    estimatedTime: 120,
    requiredSkillLevel: 3,
    safetyPrecautions: [
      '在通风良好的环境操作',
      '佩戴防护手套',
      '避免胶水接触皮肤'
    ],
    verificationSteps: [
      '测量振子阻抗',
      '进行空载功率测试',
      '进行负载清洗测试'
    ],
    successRate: 85
  },
  
  // 清洗液浓度调整解决方案
  {
    solutionId: 'SOL_USC_003',
    solutionName: '调整清洗液浓度',
    solutionNameEn: 'Adjust Cleaning Solution Concentration',
    description: '根据工艺要求调整清洗液浓度',
    steps: [
      {
        stepNumber: 1,
        instruction: '测量当前清洗液浓度',
        checkpoints: ['记录当前浓度值']
      },
      {
        stepNumber: 2,
        instruction: '计算需要添加的清洗剂或水量',
        detailedDescription: '根据槽体容积和目标浓度计算',
        checkpoints: ['计算结果经过复核']
      },
      {
        stepNumber: 3,
        instruction: '缓慢添加清洗剂或水',
        warningNotes: ['边添加边搅拌', '分多次添加'],
        checkpoints: ['添加量准确']
      },
      {
        stepNumber: 4,
        instruction: '充分搅拌后重新测量浓度',
        checkpoints: ['浓度达到目标值']
      }
    ],
    requiredParts: [
      {
        partCode: 'CLN-001',
        partName: '清洗剂',
        quantity: 1,
        isOptional: false,
        alternativeParts: ['CLN-002', 'CLN-003']
      }
    ],
    requiredTools: ['折光仪', '量杯', '搅拌棒'],
    estimatedTime: 30,
    requiredSkillLevel: 2,
    safetyPrecautions: [
      '佩戴防护手套和护目镜',
      '避免清洗剂溅入眼睛'
    ],
    verificationSteps: [
      '浓度测量值在目标范围内',
      '进行清洗测试验证效果'
    ],
    successRate: 98
  },
  
  // 过滤器清洗/更换解决方案
  {
    solutionId: 'SOL_SPR_001',
    solutionName: '清洗或更换过滤器',
    solutionNameEn: 'Clean or Replace Filter',
    description: '清洗堵塞的过滤器或更换新滤芯',
    steps: [
      {
        stepNumber: 1,
        instruction: '关闭进出阀门，释放系统压力',
        warningNotes: ['缓慢释放压力'],
        checkpoints: ['压力表显示为零']
      },
      {
        stepNumber: 2,
        instruction: '拆卸过滤器外壳',
        checkpoints: ['注意密封圈位置']
      },
      {
        stepNumber: 3,
        instruction: '取出滤芯，检查堵塞程度',
        detailedDescription: '如果滤芯可清洗，用清水反向冲洗；如果严重堵塞，更换新滤芯',
        checkpoints: ['评估滤芯状态']
      },
      {
        stepNumber: 4,
        instruction: '安装清洗后的滤芯或新滤芯',
        checkpoints: ['滤芯方向正确', '密封圈完好']
      },
      {
        stepNumber: 5,
        instruction: '组装过滤器，打开阀门，排气',
        checkpoints: ['无泄漏', '压差正常']
      }
    ],
    requiredParts: [
      {
        partCode: 'FLT-001',
        partName: '过滤器滤芯',
        quantity: 1,
        isOptional: true
      },
      {
        partCode: 'ORG-001',
        partName: '密封圈',
        quantity: 1,
        isOptional: true
      }
    ],
    requiredTools: ['扳手', '清洗刷', '压差表'],
    estimatedTime: 45,
    requiredSkillLevel: 2,
    safetyPrecautions: [
      '确保系统卸压后操作',
      '佩戴防护手套'
    ],
    verificationSteps: [
      '检查压差是否恢复正常',
      '检查系统压力是否恢复',
      '运行测试确认流量正常'
    ],
    successRate: 95
  }
];

// ============================================================================
// 故障排除引擎
// ============================================================================

export interface TroubleshootingSession {
  sessionId: string;
  startTime: Date;
  equipmentType: EquipmentType;
  reportedSymptoms: string[];
  diagnosticHistory: DiagnosticRecord[];
  currentNode?: DecisionNode;
  resolvedCause?: string;
  appliedSolution?: string;
  status: 'in_progress' | 'resolved' | 'escalated' | 'abandoned';
}

export interface DiagnosticRecord {
  timestamp: Date;
  action: string;
  result: string;
  notes?: string;
}

export class TroubleshootingEngine {
  private symptoms: Map<string, FaultSymptom>;
  private causes: Map<string, FaultCause>;
  private solutions: Map<string, Solution>;
  private sessions: Map<string, TroubleshootingSession>;
  
  constructor() {
    this.symptoms = new Map(FAULT_SYMPTOMS.map(s => [s.symptomId, s]));
    this.causes = new Map(FAULT_CAUSES.map(c => [c.causeId, c]));
    this.solutions = new Map(SOLUTIONS.map(s => [s.solutionId, s]));
    this.sessions = new Map();
  }
  
  /**
   * 开始新的故障排除会话
   */
  startSession(equipmentType: EquipmentType, reportedSymptoms: string[]): TroubleshootingSession {
    const sessionId = `TS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TroubleshootingSession = {
      sessionId,
      startTime: new Date(),
      equipmentType,
      reportedSymptoms,
      diagnosticHistory: [],
      status: 'in_progress'
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  /**
   * 根据症状匹配可能的故障
   */
  matchSymptoms(keywords: string[], equipmentType?: EquipmentType): FaultSymptom[] {
    const matches: Array<{ symptom: FaultSymptom; score: number }> = [];
    
    for (const symptom of Array.from(this.symptoms.values())) {
      // 检查设备类型匹配
      if (equipmentType && !symptom.applicableEquipment.includes(equipmentType)) {
        continue;
      }
      
      // 计算关键词匹配分数
      let score = 0;
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (symptom.symptomName.toLowerCase().includes(lowerKeyword)) {
          score += 3;
        }
        if (symptom.description.toLowerCase().includes(lowerKeyword)) {
          score += 2;
        }
        if (symptom.keywords.some((k: string) => k.toLowerCase().includes(lowerKeyword))) {
          score += 1;
        }
      }
      
      if (score > 0) {
        matches.push({ symptom, score });
      }
    }
    
    // 按分数排序
    matches.sort((a, b) => b.score - a.score);
    
    return matches.map(m => m.symptom);
  }
  
  /**
   * 获取症状的可能原因
   */
  getPossibleCauses(symptomId: string): FaultCause[] {
    const symptom = this.symptoms.get(symptomId);
    if (!symptom) return [];
    
    // 根据症状类别和设备类型筛选相关原因
    const relevantCauses: FaultCause[] = [];
    
    for (const cause of Array.from(this.causes.values())) {
      // 这里应该有更复杂的匹配逻辑
      // 目前简化为返回所有原因，按概率排序
      relevantCauses.push(cause);
    }
    
    // 按概率排序
    relevantCauses.sort((a, b) => b.probability - a.probability);
    
    return relevantCauses;
  }
  
  /**
   * 获取原因的解决方案
   */
  getSolutions(causeId: string): Solution[] {
    const cause = this.causes.get(causeId);
    if (!cause) return [];
    
    // 根据原因ID匹配解决方案
    const relevantSolutions: Solution[] = [];
    
    for (const solution of Array.from(this.solutions.values())) {
      // 简化匹配逻辑
      if (solution.solutionId.includes(causeId.split('_')[1])) {
        relevantSolutions.push(solution);
      }
    }
    
    // 按成功率排序
    relevantSolutions.sort((a, b) => b.successRate - a.successRate);
    
    return relevantSolutions;
  }
  
  /**
   * 生成故障排除引导路径
   */
  generateGuidancePath(
    symptomId: string,
    operatorSkillLevel: number
  ): {
    steps: GuidanceStep[];
    estimatedTime: number;
    confidenceScore: number;
  } {
    const symptom = this.symptoms.get(symptomId);
    if (!symptom) {
      return { steps: [], estimatedTime: 0, confidenceScore: 0 };
    }
    
    const causes = this.getPossibleCauses(symptomId);
    const steps: GuidanceStep[] = [];
    let totalTime = 0;
    
    // 生成诊断步骤
    for (const cause of causes) {
      // 检查操作员技能等级
      if (cause.requiredSkillLevel > operatorSkillLevel) {
        steps.push({
          stepType: 'escalate',
          instruction: `此诊断步骤需要技能等级 ${cause.requiredSkillLevel}，请联系高级工程师`,
          causeId: cause.causeId,
          causeName: cause.causeName
        });
        continue;
      }
      
      // 添加诊断步骤
      for (const diagStep of cause.diagnosticSteps) {
        steps.push({
          stepType: 'diagnose',
          instruction: diagStep.instruction,
          expectedResult: diagStep.expectedResult,
          tools: diagStep.tools,
          safetyNotes: diagStep.safetyNotes,
          causeId: cause.causeId,
          causeName: cause.causeName
        });
        totalTime += diagStep.timeEstimate || 10;
      }
      
      // 添加解决方案步骤
      const solutions = this.getSolutions(cause.causeId);
      for (const solution of solutions) {
        if (solution.requiredSkillLevel <= operatorSkillLevel) {
          steps.push({
            stepType: 'solution',
            instruction: `如果确认是"${cause.causeName}"，执行解决方案：${solution.solutionName}`,
            solutionId: solution.solutionId,
            solutionName: solution.solutionName,
            estimatedTime: solution.estimatedTime,
            successRate: solution.successRate
          });
          totalTime += solution.estimatedTime;
        }
      }
    }
    
    // 计算置信度（基于匹配的原因数量和解决方案成功率）
    const avgSuccessRate = steps
      .filter(s => s.successRate)
      .reduce((sum, s) => sum + (s.successRate || 0), 0) / 
      Math.max(1, steps.filter(s => s.successRate).length);
    
    return {
      steps,
      estimatedTime: totalTime,
      confidenceScore: Math.min(90, avgSuccessRate)  // 最高90%，保持谦逊
    };
  }
  
  /**
   * 记录诊断结果
   */
  recordDiagnosticResult(
    sessionId: string,
    action: string,
    result: string,
    notes?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.diagnosticHistory.push({
      timestamp: new Date(),
      action,
      result,
      notes
    });
  }
  
  /**
   * 完成故障排除会话
   */
  completeSession(
    sessionId: string,
    resolvedCause: string,
    appliedSolution: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.resolvedCause = resolvedCause;
    session.appliedSolution = appliedSolution;
    session.status = 'resolved';
  }
  
  /**
   * 升级故障排除会话
   */
  escalateSession(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = 'escalated';
    session.diagnosticHistory.push({
      timestamp: new Date(),
      action: 'escalate',
      result: 'Session escalated to senior engineer',
      notes: reason
    });
  }
  
  /**
   * 获取会话状态
   */
  getSession(sessionId: string): TroubleshootingSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 获取所有症状
   */
  getAllSymptoms(): FaultSymptom[] {
    return Array.from(this.symptoms.values());
  }
  
  /**
   * 获取所有解决方案
   */
  getAllSolutions(): Solution[] {
    return Array.from(this.solutions.values());
  }
}

// ============================================================================
// 引导步骤类型
// ============================================================================

export interface GuidanceStep {
  stepType: 'diagnose' | 'solution' | 'escalate';
  instruction: string;
  expectedResult?: string;
  tools?: string[];
  safetyNotes?: string[];
  causeId?: string;
  causeName?: string;
  solutionId?: string;
  solutionName?: string;
  estimatedTime?: number;
  successRate?: number;
}

// ============================================================================
// 导出默认引擎实例
// ============================================================================

export const createTroubleshootingEngine = (): TroubleshootingEngine => {
  return new TroubleshootingEngine();
};
