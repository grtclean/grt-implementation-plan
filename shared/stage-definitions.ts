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
  { id: 'M0',  code: 'M0',  name: '商机识别', description: '客户需求识别与初步评估',           category: 'concept',    color: 'bg-slate-500',   icon: 'Search' },
  { id: 'M1',  code: 'M1',  name: '需求确认', description: '详细需求调研与技术可行性分析',     category: 'concept',    color: 'bg-slate-600',   icon: 'ClipboardCheck' },
  { id: 'M2',  code: 'M2',  name: '方案设计', description: '技术方案设计与报价',               category: 'concept',    color: 'bg-indigo-500',  icon: 'Lightbulb' },
  { id: 'M3',  code: 'M3',  name: '立项评审', description: '项目立项与资源分配',               category: 'design',     color: 'bg-blue-500',    icon: 'FileCheck' },
  { id: 'M4',  code: 'M4',  name: '方案冻结', description: '设计评审与方案冻结',               category: 'design',     color: 'bg-blue-600',    icon: 'Lock' },
  { id: 'M5',  code: 'M5',  name: '详细设计', description: '机械/电气/软件详细设计',           category: 'design',     color: 'bg-cyan-500',    icon: 'Cog' },
  { id: 'M6',  code: 'M6',  name: '采购制造', description: '物料采购与零部件制造',             category: 'validation', color: 'bg-green-500',   icon: 'ShoppingCart' },
  { id: 'M7',  code: 'M7',  name: '装配调试', description: '设备装配与厂内调试',               category: 'validation', color: 'bg-green-600',   icon: 'Wrench' },
  { id: 'M8',  code: 'M8',  name: 'FAT验收',  description: '工厂验收测试',                     category: 'validation', color: 'bg-emerald-500', icon: 'TestTube' },
  { id: 'M9',  code: 'M9',  name: '发货安装', description: '设备发货与现场安装',               category: 'production', color: 'bg-orange-500',  icon: 'Truck' },
  { id: 'M10', code: 'M10', name: '现场调试', description: '客户现场调试',                     category: 'production', color: 'bg-orange-600',  icon: 'Settings' },
  { id: 'M11', code: 'M11', name: 'SAT验收',  description: '现场验收测试',                     category: 'production', color: 'bg-amber-500',   icon: 'CheckCircle' },
  { id: 'M12', code: 'M12', name: '项目结项', description: '项目总结与知识沉淀',               category: 'launch',     color: 'bg-purple-500',  icon: 'Flag' },
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
  { id: 'business_value', name: '商业价值', icon: 'FileCheck',      description: '项目投资回报与战略价值评估' },
  { id: 'scope',          name: '范围定义', icon: 'FileCheck',      description: '项目范围、边界与交付物明确' },
  { id: 'resources',      name: '资源配置', icon: 'User',           description: '人员、设备、资金分配计划' },
  { id: 'raci',           name: 'RACI矩阵', icon: 'User',          description: '责任分配与决策权限定义' },
  { id: 'risks',          name: '风险评估', icon: 'AlertTriangle',  description: '风险识别、评估与应对措施' },
];

// ============================================
// M4 方案冻结 - 五大车评审定义
// ============================================

export const M4_CARRIAGES: ReviewCarriage[] = [
  {
    id: 'mechanical',
    name: '机械评审',
    icon: 'Wrench',
    color: 'bg-blue-500',
    checkItems: ['结构设计完成', '材料选型确认', '加工工艺可行', '装配方案确认', '强度校核通过'],
  },
  {
    id: 'electrical',
    name: '电气评审',
    icon: 'Zap',
    color: 'bg-yellow-500',
    checkItems: ['电气原理图完成', '控制系统设计', 'PLC程序框架', '安全回路设计', '接线图完成'],
  },
  {
    id: 'quality',
    name: '质量评审',
    icon: 'Shield',
    color: 'bg-green-500',
    checkItems: ['质量计划制定', '检测点定义', 'FAT方案确认', 'SAT方案确认', '文档清单确认'],
  },
  {
    id: 'service',
    name: '服务评审',
    icon: 'HeadphonesIcon',
    color: 'bg-purple-500',
    checkItems: ['培训计划制定', '备件清单确认', '维护手册框架', '远程支持方案', '现场服务计划'],
  },
  {
    id: 'procurement',
    name: '采购评审',
    icon: 'ShoppingCart',
    color: 'bg-orange-500',
    checkItems: ['BOM初版完成', '长周期件识别', '供应商预选', '成本预算确认', '交期风险评估'],
  },
];

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
