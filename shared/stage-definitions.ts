/**
 * 统一阶段定义 - M0-M12 权威数据源
 * 消除多个页面中的重复定义，提供单一引用点
 */

// ============================================
// 类型定义
// ============================================

export type StageCategory = 'concept' | 'design' | 'validation' | 'production' | 'launch';

export interface Stage {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  category: StageCategory;
  color: string;
  icon: string;
}

export interface ReviewDimension {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ReviewCarriage {
  id: string;
  name: string;
  icon: string;
  color: string;
  checkItems: string[];
}

export type ReviewConclusion = 'PASS' | 'CONDITIONAL' | 'FAIL';

export interface GateStatus {
  key: string;
  label: string;
  color: string;
}

// ============================================
// M0-M12 阶段定义 (13个阶段)
// ============================================

export const STAGES: Stage[] = [
  { id: 'M0',  code: 'M0',  name: '商机识别', nameEn: 'Opportunity Identification', description: '客户需求识别与初步评估',           category: 'concept',    color: 'bg-slate-500',   icon: 'Search' },
  { id: 'M1',  code: 'M1',  name: '需求确认', nameEn: 'Requirements Confirmation',  description: '详细需求调研与技术可行性分析',     category: 'concept',    color: 'bg-slate-600',   icon: 'ClipboardCheck' },
  { id: 'M2',  code: 'M2',  name: '方案设计', nameEn: 'Solution Design',            description: '技术方案设计与报价',               category: 'concept',    color: 'bg-indigo-500',  icon: 'Lightbulb' },
  { id: 'M3',  code: 'M3',  name: '立项评审', nameEn: 'Project Approval Review',    description: '项目立项与资源分配',               category: 'design',     color: 'bg-blue-500',    icon: 'FileCheck' },
  { id: 'M4',  code: 'M4',  name: '方案冻结', nameEn: 'Design Freeze',              description: '设计评审与方案冻结',               category: 'design',     color: 'bg-blue-600',    icon: 'Lock' },
  { id: 'M5',  code: 'M5',  name: '详细设计', nameEn: 'Detailed Design',            description: '机械/电气/软件详细设计',           category: 'design',     color: 'bg-cyan-500',    icon: 'Cog' },
  { id: 'M6',  code: 'M6',  name: '采购制造', nameEn: 'Procurement & Manufacturing', description: '物料采购与零部件制造',            category: 'validation', color: 'bg-green-500',   icon: 'ShoppingCart' },
  { id: 'M7',  code: 'M7',  name: '装配调试', nameEn: 'Assembly & Commissioning',   description: '设备装配与厂内调试',               category: 'validation', color: 'bg-green-600',   icon: 'Wrench' },
  { id: 'M8',  code: 'M8',  name: 'FAT验收',  nameEn: 'Factory Acceptance Test',    description: '工厂验收测试',                     category: 'validation', color: 'bg-emerald-500', icon: 'TestTube' },
  { id: 'M9',  code: 'M9',  name: '发货安装', nameEn: 'Shipping & Installation',    description: '设备发货与现场安装',               category: 'production', color: 'bg-orange-500',  icon: 'Truck' },
  { id: 'M10', code: 'M10', name: '现场调试', nameEn: 'Site Commissioning',         description: '客户现场调试',                     category: 'production', color: 'bg-orange-600',  icon: 'Settings' },
  { id: 'M11', code: 'M11', name: 'SAT验收',  nameEn: 'Site Acceptance Test',       description: '现场验收测试',                     category: 'production', color: 'bg-amber-500',   icon: 'CheckCircle' },
  { id: 'M12', code: 'M12', name: '项目结项', nameEn: 'Project Closure',            description: '项目总结与知识沉淀',               category: 'launch',     color: 'bg-purple-500',  icon: 'Flag' },
];

/** 按 ID 索引的阶段查找表 */
export const STAGE_MAP: Record<string, Stage> = Object.fromEntries(
  STAGES.map(s => [s.id, s])
);

// ============================================
// 阶段分类定义
// ============================================

export const STAGE_CATEGORIES: Record<StageCategory, { name: string; nameEn: string; stages: string[]; color: string }> = {
  concept:    { name: '概念阶段',   nameEn: 'Concept',    stages: ['M0', 'M1', 'M2'],          color: 'bg-indigo-500' },
  design:     { name: '设计阶段',   nameEn: 'Design',     stages: ['M3', 'M4', 'M5'],          color: 'bg-blue-500' },
  validation: { name: '验证阶段',   nameEn: 'Validation', stages: ['M6', 'M7', 'M8'],          color: 'bg-green-500' },
  production: { name: '生产阶段',   nameEn: 'Production', stages: ['M9', 'M10', 'M11'],        color: 'bg-orange-500' },
  launch:     { name: '发布阶段',   nameEn: 'Launch',     stages: ['M12'],                      color: 'bg-purple-500' },
};

// ============================================
// M3 立项评审 - 五维度定义
// ============================================

export const M3_DIMENSIONS: ReviewDimension[] = [
  { id: 'tech_feasibility', name: '技术可行性', icon: 'Cpu',            description: '技术方案可行性、创新点与技术风险评估' },
  { id: 'cost_analysis',    name: '成本分析',   icon: 'DollarSign',     description: '项目投资回报、BOM成本与预算合理性分析' },
  { id: 'quality_standard', name: '质量标准',   icon: 'Shield',         description: '质量计划、检测标准与IATF 16949合规性' },
  { id: 'supply_chain',     name: '供应链',     icon: 'Truck',          description: '供应商评估、长周期件识别与采购风险' },
  { id: 'schedule',         name: '时间进度',   icon: 'Clock',          description: '项目时间线、里程碑与关键路径分析' },
];

// ============================================
// M4 方案冻结 - 五大车评审定义
// ============================================

export const M4_CARRIAGES: ReviewCarriage[] = [
  {
    id: 'mechanical',
    name: '机械',
    icon: 'Wrench',
    color: 'bg-blue-500',
    checkItems: ['结构设计完成', '材料选型确认', '加工工艺可行', '装配方案确认', '强度校核通过'],
  },
  {
    id: 'electrical',
    name: '电气',
    icon: 'Zap',
    color: 'bg-yellow-500',
    checkItems: ['电气原理图完成', '控制系统设计', 'PLC程序框架', '安全回路设计', '接线图完成'],
  },
  {
    id: 'quality',
    name: '质量',
    icon: 'Shield',
    color: 'bg-green-500',
    checkItems: ['质量计划制定', '检测点定义', 'FAT方案确认', 'SAT方案确认', '文档清单确认'],
  },
  {
    id: 'service',
    name: '服务',
    icon: 'Headphones',
    color: 'bg-purple-500',
    checkItems: ['培训计划制定', '备件清单确认', '维护手册框架', '远程支持方案', '现场服务计划'],
  },
  {
    id: 'procurement',
    name: '采购',
    icon: 'ShoppingCart',
    color: 'bg-orange-500',
    checkItems: ['BOM初版完成', '长周期件识别', '供应商预选', '成本预算确认', '交期风险评估'],
  },
];

// ============================================
// M5 详细设计评审 - 设计评审门定义
// ============================================

export interface M5DesignCheckItem {
  id: string;
  name: string;
  description: string;
  category: M5ReviewCategory;
  isMandatory: boolean;
  weight: number; // 权重百分比，用于计算加权完成度
  autoVerifySource?: string;
  responsibleRoles: string[];
}

export type M5ReviewCategory =
  | 'mechanical_design'
  | 'electrical_design'
  | 'bom_accuracy'
  | 'design_review_record'
  | 'simulation_verification';

export interface M5ReviewCategoryDef {
  id: M5ReviewCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
  targetScore: number; // 目标完成度百分比
}

/** M5 设计评审五大类别定义 */
export const M5_REVIEW_CATEGORIES: M5ReviewCategoryDef[] = [
  {
    id: 'mechanical_design',
    name: '机械设计完成度',
    icon: 'Wrench',
    color: 'bg-blue-500',
    description: '机械结构详细设计、加工图纸、公差分析、材料清单完整性',
    targetScore: 95,
  },
  {
    id: 'electrical_design',
    name: '电气设计完成度',
    icon: 'Zap',
    color: 'bg-yellow-500',
    description: '电气原理图、接线图、PLC程序、HMI界面、安全电路设计',
    targetScore: 95,
  },
  {
    id: 'bom_accuracy',
    name: 'BOM准确度',
    icon: 'ClipboardCheck',
    color: 'bg-green-500',
    description: 'BOM完整性、物料编码正确性、规格匹配度、替代料标注',
    targetScore: 98,
  },
  {
    id: 'design_review_record',
    name: '设计评审记录',
    icon: 'FileCheck',
    color: 'bg-purple-500',
    description: '各专业评审会议记录、问题跟踪、签字确认、变更记录',
    targetScore: 100,
  },
  {
    id: 'simulation_verification',
    name: '仿真验证通过',
    icon: 'TestTube',
    color: 'bg-cyan-500',
    description: '结构仿真(FEA)、运动仿真、流体仿真、热仿真验证结果',
    targetScore: 90,
  },
];

/** M5 按类别索引的查找表 */
export const M5_REVIEW_CATEGORY_MAP: Record<string, M5ReviewCategoryDef> = Object.fromEntries(
  M5_REVIEW_CATEGORIES.map(c => [c.id, c])
);

/** M5 详细设计评审检查项清单 */
export const M5_DESIGN_CHECKLIST: M5DesignCheckItem[] = [
  // --- 机械设计完成度 ---
  {
    id: 'm5_mech_01',
    name: '3D模型最终版发布',
    description: '所有零部件3D模型完成并在PLM中发布为正式版本',
    category: 'mechanical_design',
    isMandatory: true,
    weight: 20,
    autoVerifySource: 'PLM_Model_Status',
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_mech_02',
    name: '加工图纸及公差标注完成',
    description: '全部零件加工图纸完成，关键尺寸公差标注符合GD&T规范',
    category: 'mechanical_design',
    isMandatory: true,
    weight: 20,
    autoVerifySource: 'PLM_Drawing_Status',
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_mech_03',
    name: '装配图及装配顺序确认',
    description: '总装图、子装配图完成，装配工艺顺序已定义并评审',
    category: 'mechanical_design',
    isMandatory: true,
    weight: 15,
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_mech_04',
    name: '关键外购件选型确认',
    description: '轴承、导轨、气缸等关键外购件选型计算完成并确认',
    category: 'mechanical_design',
    isMandatory: false,
    weight: 10,
    responsibleRoles: ['bu_mech', 'procurement_eng'],
  },
  {
    id: 'm5_mech_05',
    name: '干涉检查与运动空间校验',
    description: '3D模型干涉检查通过，运动部件活动空间满足要求',
    category: 'mechanical_design',
    isMandatory: true,
    weight: 15,
    responsibleRoles: ['bu_mech'],
  },

  // --- 电气设计完成度 ---
  {
    id: 'm5_elec_01',
    name: '电气原理图最终版发布',
    description: '主电路、控制电路原理图完成并经过校审',
    category: 'electrical_design',
    isMandatory: true,
    weight: 20,
    autoVerifySource: 'PLM_Drawing_Status',
    responsibleRoles: ['bu_elec'],
  },
  {
    id: 'm5_elec_02',
    name: 'PLC程序设计完成',
    description: 'PLC控制程序完成编写，I/O分配表确认，逻辑测试通过',
    category: 'electrical_design',
    isMandatory: true,
    weight: 20,
    responsibleRoles: ['bu_elec'],
  },
  {
    id: 'm5_elec_03',
    name: 'HMI界面设计完成',
    description: '人机界面画面布局、操作逻辑、报警信息设计完成',
    category: 'electrical_design',
    isMandatory: true,
    weight: 15,
    responsibleRoles: ['bu_elec'],
  },
  {
    id: 'm5_elec_04',
    name: '安全回路设计验证',
    description: '急停、安全门、光幕等安全回路设计符合CE/机械安全标准',
    category: 'electrical_design',
    isMandatory: true,
    weight: 20,
    responsibleRoles: ['bu_elec'],
  },
  {
    id: 'm5_elec_05',
    name: '接线图与线缆清单完成',
    description: '柜内接线图、柜外接线图完成，线缆规格清单已生成',
    category: 'electrical_design',
    isMandatory: false,
    weight: 10,
    responsibleRoles: ['bu_elec'],
  },

  // --- BOM准确度 ---
  {
    id: 'm5_bom_01',
    name: 'BOM与3D模型一致性校验',
    description: 'BOM清单与最新3D模型零件清单完全一致',
    category: 'bom_accuracy',
    isMandatory: true,
    weight: 25,
    autoVerifySource: 'ERP_BOM_Consistency',
    responsibleRoles: ['bu_mech', 'bu_elec'],
  },
  {
    id: 'm5_bom_02',
    name: '物料编码与规格匹配',
    description: '所有物料编码正确，规格描述与实际需求匹配',
    category: 'bom_accuracy',
    isMandatory: true,
    weight: 25,
    autoVerifySource: 'ERP_Material_Validation',
    responsibleRoles: ['procurement_eng'],
  },
  {
    id: 'm5_bom_03',
    name: '长周期件提前采购确认',
    description: '识别的长周期物料已提前下达采购订单',
    category: 'bom_accuracy',
    isMandatory: true,
    weight: 20,
    autoVerifySource: 'ERP_PO_Table',
    responsibleRoles: ['procurement_eng'],
  },
  {
    id: 'm5_bom_04',
    name: '替代物料与成本确认',
    description: '关键物料的替代方案标注完成，BOM成本卷积与预算偏差在5%以内',
    category: 'bom_accuracy',
    isMandatory: false,
    weight: 15,
    responsibleRoles: ['procurement_eng', 'bu_pm'],
  },

  // --- 设计评审记录 ---
  {
    id: 'm5_rev_01',
    name: '机械设计评审会议记录',
    description: '机械专业设计评审会议已召开，评审意见已记录并签字确认',
    category: 'design_review_record',
    isMandatory: true,
    weight: 25,
    responsibleRoles: ['bu_pm', 'bu_mech'],
  },
  {
    id: 'm5_rev_02',
    name: '电气设计评审会议记录',
    description: '电气专业设计评审会议已召开，评审意见已记录并签字确认',
    category: 'design_review_record',
    isMandatory: true,
    weight: 25,
    responsibleRoles: ['bu_pm', 'bu_elec'],
  },
  {
    id: 'm5_rev_03',
    name: '评审问题跟踪闭环',
    description: '所有评审问题已在跟踪表中记录，关键问题已闭环或有明确整改计划',
    category: 'design_review_record',
    isMandatory: true,
    weight: 30,
    responsibleRoles: ['bu_pm'],
  },
  {
    id: 'm5_rev_04',
    name: '设计变更记录完整',
    description: '自M4方案冻结以来的所有设计变更已记录并经审批',
    category: 'design_review_record',
    isMandatory: true,
    weight: 20,
    responsibleRoles: ['bu_pm'],
  },

  // --- 仿真验证通过 ---
  {
    id: 'm5_sim_01',
    name: '结构强度仿真(FEA)通过',
    description: '关键承载结构件有限元分析完成，安全系数满足设计要求',
    category: 'simulation_verification',
    isMandatory: true,
    weight: 30,
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_sim_02',
    name: '运动仿真验证通过',
    description: '多轴运动轨迹、速度、加速度仿真验证，无干涉和超限',
    category: 'simulation_verification',
    isMandatory: false,
    weight: 25,
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_sim_03',
    name: '流体/热仿真验证',
    description: '清洗液流场仿真、温控系统热仿真(如适用)验证通过',
    category: 'simulation_verification',
    isMandatory: false,
    weight: 25,
    responsibleRoles: ['bu_mech'],
  },
  {
    id: 'm5_sim_04',
    name: '仿真报告归档',
    description: '所有仿真分析报告已归档到PLM系统，包含边界条件和结论',
    category: 'simulation_verification',
    isMandatory: true,
    weight: 20,
    autoVerifySource: 'PLM_Document_Archive',
    responsibleRoles: ['bu_mech'],
  },
];

/** 按类别分组的 M5 检查项 */
export const M5_CHECKLIST_BY_CATEGORY: Record<M5ReviewCategory, M5DesignCheckItem[]> = {
  mechanical_design: M5_DESIGN_CHECKLIST.filter(i => i.category === 'mechanical_design'),
  electrical_design: M5_DESIGN_CHECKLIST.filter(i => i.category === 'electrical_design'),
  bom_accuracy: M5_DESIGN_CHECKLIST.filter(i => i.category === 'bom_accuracy'),
  design_review_record: M5_DESIGN_CHECKLIST.filter(i => i.category === 'design_review_record'),
  simulation_verification: M5_DESIGN_CHECKLIST.filter(i => i.category === 'simulation_verification'),
};

// ============================================
// 门径状态定义
// ============================================

export const GATE_STATUSES: Record<string, GateStatus> = {
  pending:     { key: 'pending',     label: '待审批',       color: 'bg-yellow-500' },
  in_review:   { key: 'in_review',   label: '审批中',       color: 'bg-blue-500' },
  approved:    { key: 'approved',    label: '已通过',       color: 'bg-green-500' },
  rejected:    { key: 'rejected',    label: '已驳回',       color: 'bg-red-500' },
  conditional: { key: 'conditional', label: '有条件通过',   color: 'bg-orange-500' },
};

export const CHECKLIST_STATUSES = {
  pending: { label: '待检查', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  pass:    { label: '通过',   color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  fail:    { label: '未通过', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  waived:  { label: '豁免',   color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  not_applicable: { label: '不适用', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
} as const;
