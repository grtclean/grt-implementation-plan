/**
 * Business Unit (BU) 和 Transaction (TX) 工序类型定义
 * 
 * BU - 业务单元：完整的业务单元，包含销售、机械设计、电气设计、采购等完整的工程师团队
 * TX - 工序类型：具体的工序/工作类型，如机加工、装配、调试等
 */

// ==================== Business Unit (BU) 定义 ====================

export interface BusinessUnit {
  id: number;
  code: string;  // BU1, BU2, BU3, BU4, BU5
  name: string;
  description?: string;
  salesLeadId?: number;
  mechLeadId?: number;
  elecLeadId?: number;
  procurementLeadId?: number;
  isActive: boolean;
}

/**
 * 默认的BU列表
 * BU是完整的业务单元/事业部，包含销售、机械设计、电气设计、采购等完整的工程师团队
 */
export const DEFAULT_BUSINESS_UNITS: BusinessUnit[] = [
  { 
    id: 1, 
    code: "BU1", 
    name: "BU1 - 海外事业部", 
    description: "负责海外市场的清洗设备业务，包含完整的销售、机械设计、电气设计、采购工程师团队",
    isActive: true 
  },
  { 
    id: 2, 
    code: "BU2", 
    name: "BU2 - 商用车事业部", 
    description: "专注于商用车行业的清洗设备业务，包含完整的销售、机械设计、电气设计、采购工程师团队",
    isActive: true 
  },
  { 
    id: 3, 
    code: "BU3", 
    name: "BU3 - 乘用车事业部", 
    description: "专注于乘用车行业的清洗设备业务，包含完整的销售、机械设计、电气设计、采购工程师团队",
    isActive: true 
  },
  { 
    id: 4, 
    code: "BU4", 
    name: "BU4 - 半导体事业部", 
    description: "专注于半导体行业的清洗设备业务，包含完整的销售、机械设计、电气设计、采购工程师团队",
    isActive: true 
  },
  { 
    id: 5, 
    code: "BU5", 
    name: "BU5 - 工业通用事业部", 
    description: "通用工业清洗设备业务，包含完整的销售、机械设计、电气设计、采购工程师团队",
    isActive: true 
  },
];

// ==================== Transaction (TX) 工序类型定义 ====================

export type TXCategory = 'manufacturing' | 'assembly' | 'testing' | 'delivery' | 'installation' | 'other';

export interface TransactionType {
  id: number;
  code: string;  // TX-001, TX-002, etc.
  name: string;
  description?: string;
  category: TXCategory;
  estimatedDays?: number;
  requiredRoles?: string[];
  isActive: boolean;
}

/**
 * 默认的TX工序类型列表
 * TX代表具体的工序/工作类型
 */
export const DEFAULT_TRANSACTION_TYPES: TransactionType[] = [
  { id: 1, code: "TX-001", name: "需求分析", category: "manufacturing", estimatedDays: 5, description: "与客户沟通需求，进行可行性分析", isActive: true },
  { id: 2, code: "TX-002", name: "方案设计", category: "manufacturing", estimatedDays: 7, description: "完成初步方案设计和技术方案评审", isActive: true },
  { id: 3, code: "TX-003", name: "机械设计", category: "manufacturing", estimatedDays: 14, description: "完成机械部分的详细设计", isActive: true },
  { id: 4, code: "TX-004", name: "电气设计", category: "manufacturing", estimatedDays: 12, description: "完成电气控制系统的设计", isActive: true },
  { id: 5, code: "TX-005", name: "BOM采购", category: "manufacturing", estimatedDays: 21, description: "物料采购和供应商管理", isActive: true },
  { id: 6, code: "TX-006", name: "机械装配", category: "assembly", estimatedDays: 14, description: "机械部分的组装和调试", isActive: true },
  { id: 7, code: "TX-007", name: "电气装配", category: "assembly", estimatedDays: 10, description: "电气部分的组装和调试", isActive: true },
  { id: 8, code: "TX-008", name: "系统集成", category: "assembly", estimatedDays: 7, description: "整体系统集成和初步测试", isActive: true },
  { id: 9, code: "TX-009", name: "调试", category: "testing", estimatedDays: 10, description: "系统调试和性能优化", isActive: true },
  { id: 10, code: "TX-010", name: "内部测试", category: "testing", estimatedDays: 5, description: "内部测试和质量检查", isActive: true },
  { id: 11, code: "TX-011", name: "拆机", category: "testing", estimatedDays: 3, description: "设备拆卸和包装", isActive: true },
  { id: 12, code: "TX-012", name: "发货", category: "delivery", estimatedDays: 5, description: "物流发货和跟踪", isActive: true },
  { id: 13, code: "TX-013", name: "现场安装", category: "installation", estimatedDays: 7, description: "客户现场安装和调试", isActive: true },
  { id: 14, code: "TX-014", name: "SAT测试", category: "installation", estimatedDays: 5, description: "现场验收测试", isActive: true },
  { id: 15, code: "TX-015", name: "终验收", category: "installation", estimatedDays: 3, description: "最终验收和交付", isActive: true },
];

// ==================== 项目角色类型定义 ====================

/**
 * 项目角色类型
 * 注意：这些是项目中的角色，不是工序类型
 */
export type ProjectRoleType = 
  | "Sales"      // 销售与项目工程师
  | "Mech"       // 机械设计与项目工程师
  | "Elec"       // 电气设计与项目工程师
  | "Procurement" // 采购与项目工程师
  | "Assembly"   // 装配工程师
  | "Debug"      // 调试工程师
  | "Delivery"   // 发货/物流
  | "CS";        // 客户服务/现场服务

/**
 * 项目角色信息
 */
export const PROJECT_ROLES: { code: ProjectRoleType; name: string; description: string }[] = [
  { code: "Sales", name: "销售与项目工程师", description: "负责客户需求分析、方案设计和商务沟通" },
  { code: "Mech", name: "机械设计与项目工程师", description: "负责机械部分的设计和技术支持" },
  { code: "Elec", name: "电气设计与项目工程师", description: "负责电气控制系统的设计和技术支持" },
  { code: "Procurement", name: "采购与项目工程师", description: "负责物料采购和供应商管理" },
  { code: "Assembly", name: "装配工程师", description: "负责设备的组装和初步调试" },
  { code: "Debug", name: "调试工程师", description: "负责系统调试和性能优化" },
  { code: "Delivery", name: "发货/物流", description: "负责设备的包装和物流发货" },
  { code: "CS", name: "客户服务/现场服务", description: "负责现场安装、调试和客户培训" },
];

// ==================== TX工序类别信息 ====================

export const TX_CATEGORIES: { code: TXCategory; name: string; color: string }[] = [
  { code: "manufacturing", name: "设计制造", color: "bg-blue-500" },
  { code: "assembly", name: "装配集成", color: "bg-green-500" },
  { code: "testing", name: "测试验证", color: "bg-yellow-500" },
  { code: "delivery", name: "发货物流", color: "bg-purple-500" },
  { code: "installation", name: "现场安装", color: "bg-orange-500" },
  { code: "other", name: "其他", color: "bg-gray-500" },
];

// ==================== 辅助函数 ====================

/**
 * 根据BU代码获取BU信息
 */
export function getBUByCode(code: string): BusinessUnit | undefined {
  return DEFAULT_BUSINESS_UNITS.find(bu => bu.code === code);
}

/**
 * 根据TX代码获取TX信息
 */
export function getTXByCode(code: string): TransactionType | undefined {
  return DEFAULT_TRANSACTION_TYPES.find(tx => tx.code === code);
}

/**
 * 获取TX类别的显示信息
 */
export function getTXCategoryInfo(category: TXCategory) {
  return TX_CATEGORIES.find(c => c.code === category);
}
