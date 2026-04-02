/**
 * Seed GRT TSDCKL Capability Assessment Data
 *
 * Imports:
 *   1. 30 employee assessments from GRT人员能力测评（202602）.xlsx (REAL CEO evaluation)
 *   2. ~80 rubric definitions from 副本六大能力模型与评分细则.xlsx
 *   3. Per-domain scores for period tracking
 *
 * Usage: npx tsx server/seed/seed-capability-assessment.ts
 * Or: import { seedCapabilityAssessment } from './seed-capability-assessment'
 */
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("seed-capability");

// ── Level parsing ─────────────────────────────────────────
function parseLevel(s: string | null | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const m = s.match(/L([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function levelLabel(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim();
}

// ── 37 Employee Assessments — REAL data from 副本GRT人员能力测评（202602）.xlsx ──
// Source: xlsx (38 rows, 倪微微无评分已排除)
// Levels support half-grades: L1, L1.5, L2, L2.5, L3, L3.5 etc.
interface EmployeeAssessment {
  grtId: string;
  name: string;
  position: string;
  department: string;
  T: string; S: string; D: string; C: string; K: string; L: string;
}

const ASSESSMENTS: EmployeeAssessment[] = [
  // ── 事业一部 ──
  { grtId: "GRT004", name: "戴晓燕", position: "高级销售经理", department: "事业一部", T: "L3", S: "L2.5", D: "L2.5", C: "L3", K: "L2", L: "L3" },
  { grtId: "GRT005", name: "金晓锋", position: "制造质量经理", department: "事业一部", T: "L3", S: "L2", D: "L2.5", C: "L3", K: "L2.5", L: "L3" },
  { grtId: "GRT022", name: "李大鹏", position: "电气工程师", department: "事业一部", T: "L2", S: "L2", D: "L2", C: "L2", K: "L2", L: "L2" },
  { grtId: "GRT030", name: "匡凯旋", position: "售后服务主管", department: "事业一部", T: "L2.5", S: "L2", D: "L2.5", C: "L2.5", K: "L2", L: "L2.5" },
  { grtId: "GRT035", name: "王志强", position: "销售与项目工程师", department: "事业一部", T: "L2", S: "L2", D: "L1.5", C: "L2", K: "L2", L: "L1.5" },
  { grtId: "GRT063", name: "刘健康", position: "销售与项目工程师", department: "事业一部", T: "L2", S: "L1.5", D: "L1", C: "L1.5", K: "L1.5", L: "L1" },
  { grtId: "GRT087", name: "梅奥杰", position: "助理电气工程师", department: "事业一部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  { grtId: "GRT088", name: "高嘉义", position: "助理电气工程师", department: "事业一部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  { grtId: "GRT090", name: "陈加丽", position: "助理机械研发工程师", department: "事业一部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  { grtId: "GRT104", name: "董纾雨", position: "销售与项目工程师", department: "事业一部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  // ── 事业二部 ──
  { grtId: "GRT006", name: "洪香龙", position: "机械设计经理", department: "事业二部", T: "L3", S: "L2.5", D: "L3", C: "L2.5", K: "L2", L: "L3" },
  { grtId: "GRT044", name: "洪小东", position: "机械研发工程师", department: "事业二部", T: "L2", S: "L2", D: "L2", C: "L1.5", K: "L1.5", L: "L2" },
  { grtId: "GRT094", name: "徐树奎", position: "事业二部经理", department: "事业二部", T: "L3", S: "L2", D: "L2.5", C: "L2.5", K: "L2.5", L: "L2.5" },
  { grtId: "GRT097", name: "钱佳奇", position: "电气工程师", department: "事业二部", T: "L2", S: "L2", D: "L2", C: "L2", K: "L2", L: "L2" },
  { grtId: "GRT099", name: "殷金刚", position: "机械研发工程师", department: "事业二部", T: "L2.5", S: "L2", D: "L2.5", C: "L2", K: "L1.5", L: "L2" },
  { grtId: "GRT062", name: "朱宇浩", position: "IT工程师&EHS", department: "事业二部", T: "L2", S: "L2.5", D: "L2", C: "L1.5", K: "L2", L: "L2" },
  // ── 事业三部 ──
  { grtId: "GRT003", name: "倪亚琴", position: "采购与项目工程师", department: "事业三部", T: "L2", S: "L2", D: "L2", C: "L1.5", K: "L2", L: "L2" },
  { grtId: "GRT007", name: "孙坚", position: "电气主管", department: "事业三部", T: "L3", S: "L3", D: "L2.5", C: "L2.5", K: "L2.5", L: "L2" },
  { grtId: "GRT019", name: "冯艳", position: "销售与项目工程师", department: "事业三部", T: "L2.5", S: "L2", D: "L2", C: "L2", K: "L2", L: "L1.5" },
  { grtId: "GRT043", name: "韩保程", position: "销售与项目工程师", department: "事业三部", T: "L2.5", S: "L2.5", D: "L2.5", C: "L2.5", K: "L2", L: "L2" },
  { grtId: "GRT045", name: "杨勇", position: "销售与项目服务经理", department: "事业三部", T: "L2", S: "L3", D: "L1.5", C: "L2", K: "L1.5", L: "L1.5" },
  { grtId: "GRT055", name: "沈迎凤", position: "采购经理", department: "事业三部", T: "L3", S: "L3", D: "L3", C: "L2", K: "L2", L: "L3.5" },
  { grtId: "GRT058", name: "周辉", position: "事业三部经理", department: "事业三部", T: "L3", S: "L2", D: "L2.5", C: "L2.5", K: "L2.5", L: "L2.5" },
  { grtId: "GRT089", name: "罗小玲", position: "助理机械研发工程师", department: "事业三部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  { grtId: "GRT093", name: "李柯瑶", position: "销售与项目工程师", department: "事业三部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  // ── 事业四部 ──
  { grtId: "GRT018", name: "孙国祥", position: "电气工程师", department: "事业四部", T: "L2", S: "L1.5", D: "L2", C: "L2", K: "L2", L: "L2" },
  // ── AI数智部 ──
  { grtId: "GRT049", name: "胡杨", position: "IT工程师", department: "AI数智部", T: "L2.5", S: "L2.5", D: "L3", C: "L2", K: "L2", L: "L2" },
  { grtId: "GRT080", name: "刘奥运", position: "董事长助理", department: "AI数智部", T: "L2", S: "L2", D: "L1", C: "L1.5", K: "L2", L: "L2" },
  { grtId: "GRT083", name: "刘坤", position: "市场主管", department: "AI数智部", T: "L2", S: "L2.5", D: "L2.5", C: "L1.5", K: "L2", L: "L2" },
  { grtId: "GRT103", name: "朱文韬", position: "市场专员", department: "AI数智部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  // ── 财务部 ──
  { grtId: "GRT054", name: "王秀萍", position: "总账会计", department: "财务部", T: "L2.5", S: "L2", D: "L2.5", C: "L2", K: "L2.5", L: "L2" },
  { grtId: "GRT081", name: "马康风", position: "供应链助理工程师", department: "财务部", T: "L2.5", S: "L2.5", D: "L1.5", C: "L1.5", K: "L2", L: "L2.5" },
  { grtId: "GRT101", name: "王汝月", position: "会计助理", department: "财务部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  // ── 人事行政部 ──
  { grtId: "GRT067", name: "沙建梅", position: "人事行政主管", department: "人事行政部", T: "L2", S: "L1.5", D: "L2", C: "L2", K: "L2", L: "L2" },
  { grtId: "GRT100", name: "田炜钰", position: "行政前台", department: "人事行政部", T: "L1", S: "L1", D: "L1", C: "L1", K: "L1", L: "L1" },
  // ── 事业十部 ──
  { grtId: "GRT020", name: "张洵", position: "采购与项目工程师", department: "事业一部", T: "L2.5", S: "L2", D: "L2", C: "L1.5", K: "L2", L: "L2" },
  { grtId: "GRT057", name: "滕顺英", position: "采购与项目工程师", department: "事业一部", T: "L2", S: "L2", D: "L2", C: "L1.5", K: "L2", L: "L2" },
];

// ── Role → Job Family Mapping ─────────────────────────────
function getJobFamily(position: string): string {
  if (/经理/.test(position) && /事业[一二三四十]部/.test(position)) return "事业部经理";
  if (/机械设计|机械研发/.test(position)) return "机械研发";
  if (/电气/.test(position)) return "电气工程";
  if (/销售|采购|项目/.test(position)) return "销售与项目";
  if (/售后|服务/.test(position)) return "售后服务";
  if (/IT|软件|EHS/.test(position)) return "IT&EHS";
  if (/董事长助理|董助/.test(position)) return "董助";
  if (/制造|质量|班组/.test(position)) return "制造质量";
  if (/仓库|市场|供应链/.test(position)) return "仓库市场销售";
  if (/人事|行政|前台/.test(position)) return "HR行政";
  if (/会计|财务/.test(position)) return "财务";
  return "通用";
}

// ── Role Target Levels ────────────────────────────────────
// Minimum expected TSDCKL levels by job family
const ROLE_TARGETS: Record<string, { T: number; S: number; D: number; C: number; K: number; L: number }> = {
  "事业部经理":   { T: 4, S: 4, D: 4, C: 4, K: 4, L: 4 },
  "机械研发":     { T: 4, S: 3, D: 4, C: 3, K: 3, L: 2 },
  "电气工程":     { T: 4, S: 3, D: 3, C: 3, K: 3, L: 2 },
  "销售与项目":   { T: 3, S: 4, D: 2, C: 4, K: 3, L: 3 },
  "售后服务":     { T: 3, S: 3, D: 2, C: 4, K: 3, L: 3 },
  "IT&EHS":       { T: 4, S: 3, D: 4, C: 3, K: 3, L: 2 },
  "董助":         { T: 3, S: 4, D: 3, C: 4, K: 3, L: 4 },
  "制造质量":     { T: 4, S: 3, D: 3, C: 3, K: 4, L: 3 },
  "仓库市场销售": { T: 2, S: 3, D: 2, C: 4, K: 3, L: 2 },
  "HR行政":       { T: 2, S: 4, D: 2, C: 4, K: 3, L: 3 },
  "财务":         { T: 3, S: 3, D: 2, C: 3, K: 4, L: 2 },
  "通用":         { T: 3, S: 3, D: 3, C: 3, K: 3, L: 2 },
};

// ── Rubric Data (from 六大能力模型与评分细则) ──────────────
// Each entry: [jobRole, domain, level, description]
const RUBRICS: [string, string, number, string][] = [
  // 事业部经理
  ["事业部经理", "T", 1, "在指导下跟踪单一标准化项目的生产进度；协助整理项目物料清单（BOM）"],
  ["事业部经理", "T", 2, "独立管理 1-2 个中型项目（如 KLT 双工位清洗机）；确保项目按节拍交付"],
  ["事业部经理", "T", 3, "统筹事业部整体运营；主导大型复杂项目的研发与交付；确保 OEE ≥ 90%"],
  ["事业部经理", "T", 4, "开拓新业务领域（如自动化装配线）；主导与全球顶级客户的战略合作"],
  ["事业部经理", "T", 5, "定义公司未来产品形态（如 AI 自适应清洗机器人）；驱动 AI Brain 全面落地"],
  ["事业部经理", "S", 1, "熟练使用 ERP 系统查询库存；掌握基本的甘特图绘制"],
  ["事业部经理", "S", 2, "熟练运用 D365 进行项目管理；具备处理常见设备故障的协调能力"],
  ["事业部经理", "S", 3, "精通全生命周期管理；具备极强的风险预警能力；能运用数据分析优化产能"],
  ["事业部经理", "S", 4, "具备卓越的商业洞察力；能利用 AI 工具优化排程与质量预测；跨文化管理"],
  ["事业部经理", "S", 5, "具备重新定义行业规则的能力；融合技术、商业与人文的顶层设计能力"],
  ["事业部经理", "D", 1, "仅对单一子任务的时效性负责；无预算审批权"],
  ["事业部经理", "D", 2, "对单项目的交付周期和直接材料成本负责；管控项目级 P&L"],
  ["事业部经理", "D", 3, "对事业部整体营收、毛利及现金流负责；负责团队人才梯队建设"],
  ["事业部经理", "D", 4, "对事业部长期战略（3-5 年）负责；行业级技术难题攻关；对人才密度负责"],
  ["事业部经理", "D", 5, "对公司的持续增长与行业地位负责；作为核心决策层参与集团战略制定"],
  ["事业部经理", "C", 1, "严格执行公司考勤与 EHS 规范；按时提交生产日报"],
  ["事业部经理", "C", 2, "确保项目符合 ISO9001 及客户特定标准；跨部门沟通顺畅"],
  ["事业部经理", "C", 3, "主动推动跨部门流程优化；确保 EHS 零事故；客户投诉 24 小时内闭环"],
  ["事业部经理", "C", 4, "建立行业标杆级交付标准；代表公司参与行业标准制定"],
  ["事业部经理", "C", 5, "构建开放、共生的产业生态；成为行业意见领袖"],
  ["事业部经理", "K", 1, "理解公司组织架构；熟悉核心产品型号的基本参数"],
  ["事业部经理", "K", 2, "掌握水基与溶剂清洗的工艺区别；熟悉机械与电气设计基础原理"],
  ["事业部经理", "K", 3, "深刻理解行业标准（ISO16232）及客户特殊规范；掌握精益生产理论"],
  ["事业部经理", "K", 4, "通晓全球自动化与清洁技术发展趋势；掌握企业财务与资本运作高级知识"],
  ["事业部经理", "K", 5, "拥有跨学科的深厚造诣；对未来工业形态有精准预判"],
  ["事业部经理", "L", 1, "能够自我管理，响应上级指令"],
  ["事业部经理", "L", 2, "能带领项目小组（机械/电气/装配）完成既定目标"],
  ["事业部经理", "L", 3, "具备团队影响力；能通过非职权影响力解决跨部门冲突；培养至少1名L2接班人"],
  ["事业部经理", "L", 4, "变革型领导者，能重塑团队文化，极大提升团队士气；输出管理方法论"],
  ["事业部经理", "L", 5, "精神领袖，能够凝聚全员共识，引领公司穿越经济周期"],
  // 机械研发
  ["机械研发", "T", 1, "熟练使用 CAD/SolidWorks 进行简单零部件制图；理解 BOM 表结构"],
  ["机械研发", "T", 2, "能独立设计标准清洗槽体及管路布局；掌握泵、电机等标准件选型计算"],
  ["机械研发", "T", 3, "主导高难度设备整体方案设计（如四腔真空清洗机）；精通有限元分析（FEA）"],
  ["机械研发", "T", 4, "能为客户设计行业领先的清洗解决方案；掌握仿真驱动设计（如 CFD 流场分析）"],
  ["机械研发", "T", 5, "定义下一代清洗设备的技术路线；主导新材料、新工艺的研发突破"],
  ["机械研发", "D", 1, "能对现有图纸进行简单的尺寸修正；辅助设计简单的管路支架"],
  ["机械研发", "D", 2, "能进行子模块（如过滤系统、加热系统）的优化设计；能设计防错工装"],
  ["机械研发", "D", 3, "从零开始完成整机方案设计；提出创新的结构方案简化装配工序、降低BOM成本"],
  ["机械研发", "D", 4, "创造性解决行业级技术难题；将 AI/IoT 技术融入机械设计"],
  ["机械研发", "D", 5, "开辟全新产品线；将基础科学（材料学、流体力学）转化为工业产品创新"],
  // 电气工程
  ["电气工程", "T", 1, "熟练使用 TIA Portal/RSLogix 进行简单的 PLC I/O 配置；会接线"],
  ["电气工程", "T", 2, "能独立完成中型项目电气原理图绘制及 PLC 程序编写；熟悉伺服驱动调试"],
  ["电气工程", "T", 3, "精通复杂系统集成（PROFINET/EtherCAT多轴联动）；能编写上位机（HMI/SCADA）"],
  ["电气工程", "T", 4, "精通工业通信协议栈；主导与客户 MES/ERP 系统对接；能进行功能安全设计"],
  ["电气工程", "T", 5, "定义下一代电气控制架构；将 AI 边缘计算融入实时控制系统"],
  // 售后服务
  ["售后服务", "T", 1, "掌握设备的基础保养（换油、换滤芯）操作"],
  ["售后服务", "T", 2, "熟悉 GRT 8 款核心产品的标准安装与验收流程；能指导基础电气连接"],
  ["售后服务", "T", 3, "能通过远程指导或现场排查，解决 80% 的常见电气/机械故障；熟悉 UL508A"],
  ["售后服务", "T", 4, "精通 PLC 程序修改、机器人示教及复杂工艺参数调整；能处理疑难杂症"],
  ["售后服务", "T", 5, "主导开发基于 IoT 数据的设备健康管理算法；利用 AI 进行故障预测"],
  ["售后服务", "C", 1, "服务态度端正，记录投诉详细"],
  ["售后服务", "C", 2, "及时响应客户报修，确保重大客诉处理不过夜（停机<8小时）"],
  ["售后服务", "C", 3, "在 T14/T15 阶段，专业配合客户进行 SAT 测试，提升客户信心"],
  ["售后服务", "C", 4, "变被动维修为主动顾问，为客户提供维保优化建议、备件储备方案"],
  ["售后服务", "C", 5, "建立全球 24 小时响应体系；通过极致服务体验促成客户二次购买与推荐"],
  // IT&EHS
  ["IT&EHS", "T", 1, "基础运维：能处理 PC、打印机等办公设备的基础故障"],
  ["IT&EHS", "T", 2, "系统管理：熟练配置 Windows/Linux 服务器，掌握 M365 基础管理"],
  ["IT&EHS", "T", 3, "架构与集成：能独立配置 UWB 基站与 MES 接口；解决网络延迟问题"],
  ["IT&EHS", "T", 4, "深度安全与合规：设计跨国 VPN 与零信任架构；主导 TISAX AL3 审计"],
  ["IT&EHS", "T", 5, "全球战略架构：构建中/美/德三地互联的全球 IT 灾备与安全体系"],
  // IT软件工程师
  ["IT软件工程师", "T", 1, "代码基础：掌握 SQL、Python 基础，能修改简单的 PLC 梯形图"],
  ["IT软件工程师", "T", 2, "系统维护：能处理 GIMS 系统的常见 Bug，维护 M365 权限"],
  ["IT软件工程师", "T", 3, "算法应用：独立设计基于流量/压力的清洗控制算法；实现 3D 视觉与机械臂通信对接"],
  ["IT软件工程师", "T", 4, "核心研发：开发自适应智能清洗算法；优化 AI Brain 的边缘计算效率"],
  ["IT软件工程师", "T", 5, "技术引领：架构 GRT 下一代工业互联网平台（IIoT），定义行业领先的智能清洗算法标准"],
  // 董助
  ["董助", "T", 1, "基础认知：理解 GRT 清洗设备的基本原理，能使用 Office 软件"],
  ["董助", "T", 2, "工具掌握：熟练操作 D365/M365 后台，理解 CRM/ERP 基础逻辑"],
  ["董助", "T", 3, "技术理解：能参与智能清洗项目的技术讨论，理解 AI 算法在工业场景的应用边界"],
  ["董助", "T", 4, "架构参与：深度参与公司 AI Brain 架构设计；精通中美德三国薪资税务合规"],
  ["董助", "T", 5, "技术战略：定义 GRT 下一代数字化运营技术栈；主导并购时的技术标准融合"],
  ["董助", "L", 1, "执行力：服从安排，不折不扣完成任务"],
  ["董助", "L", 2, "协调力：能协助领导安排跨部门会议，确保相关人员出席"],
  ["董助", "L", 3, "推动力：主动追踪'死角'问题，推动跨部门达成共识"],
  ["董助", "L", 4, "核心驱动：作为核心推动者解决团队冲突，确保重大战略项目落地"],
  ["董助", "L", 5, "战略伙伴：成为董事长的战略参谋，引领组织变革"],
  // 制造质量
  ["制造质量", "T", 1, "基础检验：会使用卡尺、千分尺等量具，能看懂基础装配图"],
  ["制造质量", "T", 2, "标准掌握：熟悉 AWS/ISO 焊接标准、VDA 19.1 清洁度标准"],
  ["制造质量", "T", 3, "问题诊断：熟练解决 T7 设备调试中的机械/电气干涉问题"],
  ["制造质量", "T", 4, "工艺优化：针对疑难杂症提出创新工艺方案；精通 PLC 逻辑与机械结构交互"],
  ["制造质量", "T", 5, "技术权威：定义 GRT 下一代制造工艺标准；主导核心部件的工艺迭代"],
  ["制造质量", "K", 1, "记录每天的工作日志"],
  ["制造质量", "K", 2, "整理调试记录单、出厂检验报告，确保文档齐全"],
  ["制造质量", "K", 3, "每月提交 ≥1 个非标工艺案例或质量改进案例，沉淀至知识库"],
  ["制造质量", "K", 4, "将历史典型故障及解决方案结构化，丰富故障知识库"],
  ["制造质量", "K", 5, "编写 GRT 全球制造与质量标准手册（GMS）；转化为 AI 知识图谱"],
];

// ── Development Path Generator ────────────────────────────
interface DevPathItem {
  domain: string;
  domainName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: "critical" | "high" | "medium" | "low";
  nextLevelRubric: string;
  actionItems: string[];
}

const DOMAIN_NAMES: Record<string, string> = {
  T: "硬核技术力", S: "软性通用力", D: "设计与创新力",
  C: "沟通协作力", K: "专业标准力", L: "领导与战略力",
};

function generateDevPath(assessment: EmployeeAssessment): DevPathItem[] {
  const jobFamily = getJobFamily(assessment.position);
  const targets = ROLE_TARGETS[jobFamily] || ROLE_TARGETS["通用"];
  const domains = ["T", "S", "D", "C", "K", "L"] as const;

  const items: DevPathItem[] = [];
  for (const d of domains) {
    const current = parseLevel(assessment[d]);
    const target = targets[d];
    const gap = target - current;
    if (gap <= 0) continue;

    const nextLevel = Math.min(Math.ceil(current) + 1, 5);
    const rubric = RUBRICS.find(r => r[0] === jobFamily && r[1] === d && r[2] === nextLevel);
    const fallbackRubric = RUBRICS.find(r => r[0] === "事业部经理" && r[1] === d && r[2] === nextLevel);

    const actions: string[] = [];
    if (current < 2) actions.push(`完成${DOMAIN_NAMES[d]}基础培训课程`);
    if (current < 2) actions.push("安排导师一对一带教（每周2次）");
    if (current >= 2 && current < 3) actions.push("主导一个实际项目中的相关任务");
    if (current >= 2 && current < 3) actions.push("提交能力提升证据至能力OS系统");
    if (current >= 3) actions.push("参与跨部门/跨BU协作项目");
    if (d === "K") actions.push("参加ISO/VDA标准认证培训");
    if (d === "C") actions.push("参与客户现场交流或内部跨部门工作坊");
    if (d === "L" && current < 2) actions.push("完成GRT内部领导力基础课程");
    if (d === "L" && current >= 2) actions.push("带教至少1名L1级员工");

    items.push({
      domain: d,
      domainName: DOMAIN_NAMES[d],
      currentLevel: current,
      targetLevel: target,
      gap: Math.round(gap * 10) / 10,
      priority: gap >= 2 ? "critical" : gap >= 1.5 ? "high" : gap >= 1 ? "medium" : "low",
      nextLevelRubric: rubric?.[3] || fallbackRubric?.[3] || `达到${DOMAIN_NAMES[d]} L${nextLevel}标准`,
      actionItems: actions,
    });
  }

  return items.sort((a, b) => b.gap - a.gap);
}

// ── Main Seed Function ────────────────────────────────────
export async function seedCapabilityAssessment(db: any): Promise<{
  assessments: number;
  rubrics: number;
  domainScores: number;
}> {
  const { sql } = await import("drizzle-orm");
  const {
    employeeCompetenceAssessments,
    competencyRubrics,
    employeeDomainScores,
  } = await import("../../drizzle/hr-competence-schema");

  let assessmentCount = 0;
  let rubricCount = 0;
  let domainScoreCount = 0;

  // 1. Seed assessments
  log.info("Seeding employee assessments...");
  for (const a of ASSESSMENTS) {
    const empNum = parseInt(a.grtId.replace("GRT", ""));
    try {
      await db.insert(employeeCompetenceAssessments).values({
        employeeId: empNum,
        employeeName: a.name,
        department: a.department,
        position: a.position,
        tScore: a.T,
        sScore: a.S,
        dScore: a.D,
        cScore: a.C,
        kScore: a.K,
        lScore: a.L,
        assessedAt: new Date("2026-02-15"),
      }).onConflictDoUpdate({
        target: [employeeCompetenceAssessments.employeeId, employeeCompetenceAssessments.assessedAt],
        set: {
          employeeName: a.name,
          department: a.department,
          position: a.position,
          tScore: a.T, sScore: a.S, dScore: a.D,
          cScore: a.C, kScore: a.K, lScore: a.L,
          updatedAt: new Date(),
        },
      });
      assessmentCount++;
    } catch (e) {
      log.warn({ grtId: a.grtId, error: e }, "Failed to seed assessment");
    }
  }

  // 2. Seed rubrics
  log.info("Seeding competency rubrics...");
  for (const [jobRole, domain, level, description] of RUBRICS) {
    try {
      await db.insert(competencyRubrics).values({
        jobRole, domain, level, description,
      }).onConflictDoUpdate({
        target: [competencyRubrics.jobRole, competencyRubrics.domain, competencyRubrics.level],
        set: { description, updatedAt: new Date() },
      });
      rubricCount++;
    } catch (e) {
      log.warn({ jobRole, domain, level, error: e }, "Failed to seed rubric");
    }
  }

  // 3. Seed domain scores
  log.info("Seeding domain scores...");
  const domains = ["T", "S", "D", "C", "K", "L"] as const;
  for (const a of ASSESSMENTS) {
    const empNum = parseInt(a.grtId.replace("GRT", ""));
    for (const d of domains) {
      const lvl = parseLevel(a[d]);
      try {
        await db.insert(employeeDomainScores).values({
          employeeId: empNum,
          domain: d,
          currentLevel: Math.floor(lvl),
          score: String(lvl),
          assessedBy: "CEO Assessment",
          assessmentPeriod: "2026-02",
        }).onConflictDoUpdate({
          target: [employeeDomainScores.employeeId, employeeDomainScores.domain, employeeDomainScores.assessmentPeriod],
          set: { currentLevel: Math.floor(lvl), score: String(lvl), updatedAt: new Date() },
        });
        domainScoreCount++;
      } catch (e) {
        // skip
      }
    }
  }

  log.info({ assessmentCount, rubricCount, domainScoreCount }, "Capability seed complete");
  return { assessments: assessmentCount, rubrics: rubricCount, domainScores: domainScoreCount };
}

// ── Exported Data for Router Use ──────────────────────────
export {
  ASSESSMENTS,
  RUBRICS,
  ROLE_TARGETS,
  DOMAIN_NAMES,
  getJobFamily,
  parseLevel,
  levelLabel,
  generateDevPath,
};
export type { EmployeeAssessment, DevPathItem };
