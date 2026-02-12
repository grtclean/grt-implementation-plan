/**
 * GRT 5.0 工业清洗设备物料编码体系
 * 
 * 编码规则: 大类-中类-小类-规格-序号
 * 示例: UC-PMP-CEN-DN50-0001 (超声波清洗-泵类-离心泵-DN50-0001)
 * 
 * 设计原则:
 * 1. 分类清晰 - 便于快速识别物料类型
 * 2. 扩展性强 - 预留编码空间支持未来扩展
 * 3. 唯一性 - 确保每个物料有唯一编码
 * 4. 可追溯 - 支持版本管理和历史记录
 */

// 物料大类定义（第一级）
export const MATERIAL_CATEGORIES = {
  // 设备类
  UC: { name: '超声波清洗设备', description: '超声波清洗机及相关设备' },
  SP: { name: '喷淋清洗设备', description: '高压喷淋清洗系统' },
  VP: { name: '真空清洗设备', description: '真空干燥清洗设备' },
  DG: { name: '脱脂清洗设备', description: '碱性/酸性脱脂设备' },
  PS: { name: '钝化设备', description: '钝化处理设备' },
  DR: { name: '干燥设备', description: '热风/真空干燥设备' },
  
  // 核心部件类
  PMP: { name: '泵类', description: '各类工业泵' },
  VLV: { name: '阀门', description: '控制阀、截止阀等' },
  HTR: { name: '加热器', description: '电加热器、蒸汽加热器' },
  TRD: { name: '换能器', description: '超声波换能器' },
  GEN: { name: '发生器', description: '超声波发生器' },
  FLT: { name: '过滤器', description: '各类过滤设备' },
  
  // 电气控制类
  PLC: { name: 'PLC控制', description: 'PLC及控制模块' },
  HMI: { name: '人机界面', description: '触摸屏、显示器' },
  SNS: { name: '传感器', description: '温度、液位、压力传感器' },
  MTR: { name: '电机', description: '驱动电机' },
  INV: { name: '变频器', description: '变频调速器' },
  
  // 结构件类
  TNK: { name: '槽体', description: '清洗槽、漂洗槽' },
  FRM: { name: '框架', description: '设备框架、支架' },
  CVR: { name: '盖板', description: '槽盖、防护罩' },
  BSK: { name: '料篮', description: '清洗料篮、工装' },
  
  // 管路配件类
  PIP: { name: '管道', description: '不锈钢管、塑料管' },
  FIT: { name: '管件', description: '弯头、三通、法兰' },
  GSK: { name: '密封件', description: '垫片、O型圈' },
  
  // 化学品类
  CLN: { name: '清洗剂', description: '碱性/酸性清洗剂' },
  RST: { name: '防锈剂', description: '防锈油、防锈水' },
  PSV: { name: '钝化剂', description: '钝化液' },
  
  // 耗材类
  CSM: { name: '耗材', description: '滤芯、密封圈等耗材' },
  
  // 外购件类
  OEM: { name: '外购件', description: '外购标准件' },
} as const;

// 物料中类定义（第二级）
export const MATERIAL_SUBCATEGORIES = {
  // 泵类细分
  CEN: { name: '离心泵', parent: 'PMP' },
  MAG: { name: '磁力泵', parent: 'PMP' },
  DPH: { name: '隔膜泵', parent: 'PMP' },
  GER: { name: '齿轮泵', parent: 'PMP' },
  
  // 阀门细分
  BLV: { name: '球阀', parent: 'VLV' },
  GTV: { name: '闸阀', parent: 'VLV' },
  CHK: { name: '止回阀', parent: 'VLV' },
  CTL: { name: '控制阀', parent: 'VLV' },
  SFV: { name: '安全阀', parent: 'VLV' },
  
  // 加热器细分
  EHT: { name: '电加热器', parent: 'HTR' },
  SHT: { name: '蒸汽加热器', parent: 'HTR' },
  OHT: { name: '油加热器', parent: 'HTR' },
  
  // 换能器细分
  T28: { name: '28kHz换能器', parent: 'TRD' },
  T40: { name: '40kHz换能器', parent: 'TRD' },
  T68: { name: '68kHz换能器', parent: 'TRD' },
  T80: { name: '80kHz换能器', parent: 'TRD' },
  T120: { name: '120kHz换能器', parent: 'TRD' },
  
  // 传感器细分
  TMP: { name: '温度传感器', parent: 'SNS' },
  LVL: { name: '液位传感器', parent: 'SNS' },
  PRS: { name: '压力传感器', parent: 'SNS' },
  FLW: { name: '流量传感器', parent: 'SNS' },
  
  // 槽体细分
  CLT: { name: '清洗槽', parent: 'TNK' },
  RNT: { name: '漂洗槽', parent: 'TNK' },
  DRT: { name: '干燥槽', parent: 'TNK' },
  STT: { name: '储液槽', parent: 'TNK' },
  
  // 管道细分
  SSP: { name: '不锈钢管', parent: 'PIP' },
  PPP: { name: 'PP管', parent: 'PIP' },
  PVP: { name: 'PVC管', parent: 'PIP' },
  PTF: { name: 'PTFE管', parent: 'PIP' },
  
  // 清洗剂细分
  ALK: { name: '碱性清洗剂', parent: 'CLN' },
  ACD: { name: '酸性清洗剂', parent: 'CLN' },
  NTL: { name: '中性清洗剂', parent: 'CLN' },
  SLV: { name: '溶剂型清洗剂', parent: 'CLN' },
} as const;

// 规格代码定义
export const SPECIFICATION_CODES = {
  // 管径规格
  DN15: '15mm管径',
  DN20: '20mm管径',
  DN25: '25mm管径',
  DN32: '32mm管径',
  DN40: '40mm管径',
  DN50: '50mm管径',
  DN65: '65mm管径',
  DN80: '80mm管径',
  DN100: '100mm管径',
  DN125: '125mm管径',
  DN150: '150mm管径',
  DN200: '200mm管径',
  
  // 功率规格
  P1K: '1kW',
  P2K: '2kW',
  P3K: '3kW',
  P5K: '5kW',
  P10K: '10kW',
  P15K: '15kW',
  P20K: '20kW',
  P30K: '30kW',
  P50K: '50kW',
  
  // 容量规格
  V50: '50L',
  V100: '100L',
  V200: '200L',
  V300: '300L',
  V500: '500L',
  V1000: '1000L',
  V2000: '2000L',
  V5000: '5000L',
  
  // 材质规格
  SS304: '304不锈钢',
  SS316: '316不锈钢',
  SS316L: '316L不锈钢',
  PTFE: '聚四氟乙烯',
  PP: '聚丙烯',
  PVC: '聚氯乙烯',
  
  // 通用规格
  STD: '标准型',
  HVY: '重型',
  LGT: '轻型',
  CUS: '定制型',
} as const;

// 物料编码生成器
export interface MaterialCode {
  category: keyof typeof MATERIAL_CATEGORIES;
  subcategory?: string;
  specification?: string;
  serialNumber: string;
  fullCode: string;
}

/**
 * 生成物料编码
 */
export function generateMaterialCode(
  category: keyof typeof MATERIAL_CATEGORIES,
  subcategory?: string,
  specification?: string,
  serialNumber?: string
): MaterialCode {
  const serial = serialNumber || generateSerialNumber();
  const parts: string[] = [category];
  
  if (subcategory) parts.push(subcategory);
  if (specification) parts.push(specification);
  parts.push(serial);
  
  return {
    category,
    subcategory,
    specification,
    serialNumber: serial,
    fullCode: parts.join('-'),
  };
}

/**
 * 生成序列号
 */
function generateSerialNumber(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

/**
 * 解析物料编码
 */
export function parseMaterialCode(code: string): MaterialCode | null {
  const parts = code.split('-');
  if (parts.length < 2) return null;
  
  const category = parts[0] as keyof typeof MATERIAL_CATEGORIES;
  if (!MATERIAL_CATEGORIES[category]) return null;
  
  return {
    category,
    subcategory: parts.length > 2 ? parts[1] : undefined,
    specification: parts.length > 3 ? parts[2] : undefined,
    serialNumber: parts[parts.length - 1],
    fullCode: code,
  };
}

/**
 * 验证物料编码格式
 */
export function validateMaterialCode(code: string): { valid: boolean; error?: string } {
  const parts = code.split('-');
  
  if (parts.length < 2) {
    return { valid: false, error: '编码格式不正确，至少需要大类和序号' };
  }
  
  const category = parts[0] as keyof typeof MATERIAL_CATEGORIES;
  if (!MATERIAL_CATEGORIES[category]) {
    return { valid: false, error: `无效的物料大类: ${parts[0]}` };
  }
  
  const serialNumber = parts[parts.length - 1];
  if (!/^\d{4}$/.test(serialNumber)) {
    return { valid: false, error: '序号必须是4位数字' };
  }
  
  return { valid: true };
}

// 编码规则版本管理
export interface CodingRuleVersion {
  version: string;
  effectiveDate: Date;
  description: string;
  changes: string[];
  isActive: boolean;
}

export const CODING_RULE_VERSIONS: CodingRuleVersion[] = [
  {
    version: '1.0.0',
    effectiveDate: new Date('2026-02-01'),
    description: 'GRT 5.0 初始物料编码规则',
    changes: [
      '建立5级物料编码体系',
      '定义工业清洗设备专用分类',
      '支持规格和序号自动生成',
    ],
    isActive: true,
  },
];
