/**
 * 员工目录册 — 2026年3月 组织架构
 *
 * 基于技能等级评估表(TSDCKL六维)的部门归类 + 人物画像 + 工作职责分工
 * 数据来源: data/employees.json (112人) + GRT人员能力测评 (31人 TSDCKL)
 *
 * Route: /employee-directory
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Award,
  Zap,
  Brain,
  MessageSquare,
  BookOpen,
  Crown,
  Wrench,
  Factory,
  Cpu,
  Shield,
  Target,
  TrendingUp,
  Filter,
  LayoutGrid,
  List,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// TSDCKL 六维能力模型定义
// ═══════════════════════════════════════════════════════════

interface TSDCKLScore {
  T: { level: number; score: number };
  S: { level: number; score: number };
  D: { level: number; score: number };
  C: { level: number; score: number };
  K: { level: number; score: number };
  L: { level: number; score: number };
}

const TSDCKL_LABELS: Record<string, { zh: string; en: string; icon: LucideIcon; color: string }> = {
  T: { zh: "硬核技术力", en: "Technical", icon: Wrench, color: "#3b82f6" },
  S: { zh: "软性通用力", en: "Soft Skills", icon: Brain, color: "#8b5cf6" },
  D: { zh: "设计创新力", en: "Design", icon: Zap, color: "#f59e0b" },
  C: { zh: "沟通协作力", en: "Communication", icon: MessageSquare, color: "#10b981" },
  K: { zh: "专业标准力", en: "Knowledge", icon: BookOpen, color: "#ef4444" },
  L: { zh: "领导战略力", en: "Leadership", icon: Crown, color: "#ec4899" },
};

// ═══════════════════════════════════════════════════════════
// 员工数据 — 112人 (data/employees.json) + TSDCKL测评 (31人)
// ═══════════════════════════════════════════════════════════

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  tsdckl?: TSDCKLScore;
  /** 岗位类别 */
  category: string;
  /** 工作职责 */
  responsibilities: string[];
  /** 人物画像标签 */
  tags: string[];
  /** 技能等级 (1-5) */
  skillTier: number;
}

/** 岗位→类别映射 */
function classifyPosition(pos: string): { category: string; tier: number; tags: string[]; responsibilities: string[] } {
  const p = pos.toLowerCase();

  // 高管层
  if (p.includes("董事长")) return {
    category: "高管层", tier: 5,
    tags: ["战略决策", "企业治理", "资源配置"],
    responsibilities: ["制定公司整体发展战略与年度经营目标", "主持董事会决议执行与重大投资决策", "统筹各事业部绩效考核与资源配置", "对外战略合作与行业关系维护"],
  };
  if (p.includes("运营总监")) return {
    category: "高管层", tier: 5,
    tags: ["运营管控", "流程优化", "跨部门协同"],
    responsibilities: ["统筹公司日常运营管理与流程优化", "制定运营KPI体系并监督执行", "跨部门协调资源、推动数字化转型", "风险管控与合规体系建设"],
  };
  if (p.includes("董事长助理")) return {
    category: "高管层", tier: 4,
    tags: ["战略支持", "项目跟进", "信息枢纽"],
    responsibilities: ["协助董事长处理日常事务与决策支持", "跟踪重大项目进展并汇报", "协调内外部会议安排与信息传达", "参与战略研究与市场调研"],
  };

  // 部门经理
  if (p.includes("经理") && !p.includes("助理")) return {
    category: "管理层", tier: 4,
    tags: ["团队管理", "业务规划", "绩效考核"],
    responsibilities: ["负责部门年度目标制定与任务分解", "团队建设、人才培养与绩效考核", "协调跨部门资源与项目推进", "参与公司管理层决策会议"],
  };
  if (p.includes("主管")) return {
    category: "管理层", tier: 3,
    tags: ["一线管理", "执行推动", "质量把控"],
    responsibilities: ["分管领域的日常管理与团队调度", "制定并优化工作流程与标准作业", "下属员工的培训指导与考核评价", "异常问题处理与上级汇报"],
  };
  if (p.includes("班组长") || p.includes("班长")) return {
    category: "管理层", tier: 3,
    tags: ["现场管理", "排产调度", "安全管控"],
    responsibilities: ["班组生产任务分配与进度跟踪", "现场5S管理与安全生产监督", "设备保养与异常停机响应", "班组成员技能培训与评估"],
  };

  // 工程技术类
  if (p.includes("高级") && (p.includes("销售") || p.includes("工程"))) return {
    category: "工程技术", tier: 4,
    tags: ["技术引领", "方案设计", "客户对接"],
    responsibilities: ["负责重大项目技术方案设计与评审", "关键客户需求对接与技术沟通", "产品竞争力分析与市场策略建议", "带领团队完成项目交付目标"],
  };
  if (p.includes("机械研发") || p.includes("机械设计")) return {
    category: "工程技术", tier: 3,
    tags: ["3D建模", "结构设计", "工艺优化"],
    responsibilities: ["超声波清洗设备机械结构设计与优化", "SolidWorks/AutoCAD 3D建模与出图", "BOM编制与工艺路线制定", "新产品试制跟踪与设计变更管理"],
  };
  if (p.includes("电气工程")) return {
    category: "工程技术", tier: 3,
    tags: ["PLC编程", "电气设计", "控制系统"],
    responsibilities: ["设备电气控制系统设计与PLC编程", "电气原理图绘制与选型", "现场电气调试与故障排除", "控制程序文档编写与技术培训"],
  };
  if (p.includes("助理") && (p.includes("电气") || p.includes("机械"))) return {
    category: "工程技术", tier: 2,
    tags: ["技术学习", "辅助设计", "图纸管理"],
    responsibilities: ["协助工程师完成设计与制图工作", "技术文档整理与归档管理", "参与产品测试与数据记录", "在指导下学习核心技术能力"],
  };
  if (p.includes("生产工程师") || p.includes("制造质量")) return {
    category: "工程技术", tier: 3,
    tags: ["工艺管理", "质量控制", "持续改善"],
    responsibilities: ["生产工艺规范制定与优化", "质量标准建立与过程管控", "不良品分析与纠正措施推进", "新产品导入的工艺验证"],
  };
  if (p.includes("IT工程师") || p.includes("软件")) return {
    category: "工程技术", tier: 3,
    tags: ["系统开发", "数据分析", "数字化"],
    responsibilities: ["公司信息系统开发与维护", "数据分析与报表自动化建设", "IT基础设施运维与安全保障", "数字化转型项目技术支撑"],
  };

  // 销售商务类
  if (p.includes("销售") || p.includes("商务")) return {
    category: "销售商务", tier: 2,
    tags: ["客户开拓", "项目跟踪", "合同管理"],
    responsibilities: ["目标客户开发与维护关系", "技术方案讲解与报价编制", "订单跟踪与交付协调", "市场信息收集与竞争分析"],
  };

  // 采购供应链
  if (p.includes("采购") && p.includes("经理")) return {
    category: "采购供应链", tier: 4,
    tags: ["供应商管理", "成本控制", "供应链优化"],
    responsibilities: ["供应商开发评估与准入管理", "采购成本年度降本目标推进", "关键物料供应保障与风险管控", "采购团队管理与流程优化"],
  };
  if (p.includes("采购") || p.includes("供应链")) return {
    category: "采购供应链", tier: 2,
    tags: ["比价采购", "订单跟踪", "供应商对接"],
    responsibilities: ["按需求执行物料采购与比价", "采购订单跟踪与交期管理", "供应商日常沟通与协调", "采购数据记录与台账维护"],
  };

  // 生产制造
  if (p.includes("机械装配")) return {
    category: "生产制造", tier: 2,
    tags: ["精密装配", "设备组装", "工艺执行"],
    responsibilities: ["按装配工艺完成设备机械部件组装", "装配过程自检与质量记录", "工装夹具使用与维护", "参与装配工艺改善提案"],
  };
  if (p.includes("电气装配")) return {
    category: "生产制造", tier: 2,
    tags: ["电气接线", "线缆布放", "测试调试"],
    responsibilities: ["按电气图纸完成设备接线与线缆布放", "电气元件安装与调试验证", "电气装配自检与异常记录", "参与电气工艺标准化建设"],
  };
  if (p.includes("激光") || p.includes("切割")) return {
    category: "生产制造", tier: 2,
    tags: ["激光切割", "板材加工", "设备操作"],
    responsibilities: ["激光切割设备操作与程序调用", "板材切割质量控制与首件确认", "设备日常保养与维护", "切割工艺参数记录与优化"],
  };
  if (p.includes("焊工") || p.includes("焊接")) return {
    category: "生产制造", tier: 2,
    tags: ["焊接技术", "质量检验", "工艺规范"],
    responsibilities: ["按焊接工艺完成各类焊接作业", "焊接质量自检与外观检查", "焊接设备日常维护与保养", "焊接技能考核与工艺改进"],
  };
  if (p.includes("冷作")) return {
    category: "生产制造", tier: 2,
    tags: ["钣金加工", "剪板折弯", "成型工艺"],
    responsibilities: ["钣金零件剪板、折弯、成型加工", "加工尺寸自检与质量保证", "剪板折弯设备日常维护", "冷作工艺优化与效率提升"],
  };
  if (p.includes("机加工") || p.includes("CNC") || p.includes("数控")) return {
    category: "生产制造", tier: 2,
    tags: ["CNC操作", "精密加工", "刀具管理"],
    responsibilities: ["CNC数控机床操作与程序调试", "工件加工精度控制与自检", "刀具选用、更换与寿命管理", "加工异常处理与质量记录"],
  };

  // 售后服务
  if (p.includes("售后")) return {
    category: "售后服务", tier: 2,
    tags: ["现场维修", "客户培训", "技术支持"],
    responsibilities: ["客户现场设备安装调试与验收", "设备故障诊断与维修服务", "客户操作培训与技术指导", "售后服务报告编写与反馈"],
  };

  // 质量管理
  if (p.includes("质量")) return {
    category: "质量管理", tier: 2,
    tags: ["来料检验", "过程控制", "体系审核"],
    responsibilities: ["来料检验与过程质量巡检", "质量数据统计与分析报告", "ISO体系维护与内部审核", "不合格品处理与改善跟踪"],
  };
  if (p.includes("PMC")) return {
    category: "生产管理", tier: 2,
    tags: ["排产调度", "物料计划", "进度管控"],
    responsibilities: ["生产排产计划编制与调度", "物料需求计划与库存控制", "生产进度跟踪与异常协调", "产能分析与交期管理"],
  };

  // 财务会计
  if (p.includes("总账") || (p.includes("会计") && !p.includes("助理"))) return {
    category: "财务行政", tier: 3,
    tags: ["账务处理", "税务管理", "报表编制"],
    responsibilities: ["公司日常账务处理与凭证审核", "月度/年度财务报表编制", "税务申报与纳税筹划", "财务数据分析与成本核算"],
  };
  if (p.includes("会计助理")) return {
    category: "财务行政", tier: 1,
    tags: ["数据录入", "凭证整理", "辅助核算"],
    responsibilities: ["财务凭证录入与整理归档", "协助出纳及日常收付款核对", "发票管理与费用报销审核", "财务台账维护与数据整理"],
  };
  if (p.includes("仓库")) return {
    category: "仓储物流", tier: 2,
    tags: ["库存管理", "出入库", "盘点"],
    responsibilities: ["物料出入库管理与系统录入", "仓库5S与库存定期盘点", "呆滞物料处理与报废申请", "仓储安全管理与消防巡查"],
  };

  // 人事行政
  if (p.includes("人事") || p.includes("HR")) return {
    category: "人事行政", tier: 3,
    tags: ["招聘管理", "薪酬核算", "员工关系"],
    responsibilities: ["招聘需求对接与面试安排", "员工入转调离手续办理", "薪酬核算与社保公积金管理", "员工关系维护与企业文化建设"],
  };
  if (p.includes("行政") || p.includes("前台") || p.includes("前法")) return {
    category: "人事行政", tier: 1,
    tags: ["行政事务", "来访接待", "档案管理"],
    responsibilities: ["来访客户接待与引导服务", "办公用品采购与固定资产管理", "会议安排与会议纪要整理", "行政文档归档与制度宣导"],
  };
  if (p.includes("后勤")) return {
    category: "人事行政", tier: 1,
    tags: ["设施维护", "安保管理", "后勤保障"],
    responsibilities: ["办公设施日常维护与报修", "厂区安全巡逻与门禁管理", "绿化保洁与食堂管理协调", "后勤物资采购与分发"],
  };

  // 市场
  if (p.includes("市场")) return {
    category: "市场营销", tier: 2,
    tags: ["品牌推广", "活动策划", "新媒体运营"],
    responsibilities: ["公司品牌形象策划与推广", "展会/活动组织与执行", "新媒体渠道运营与内容创作", "市场数据收集与分析报告"],
  };

  // 其他
  if (p.includes("协作辅助")) return {
    category: "生产支持", tier: 1,
    tags: ["辅助作业", "物料搬运", "场地整理"],
    responsibilities: ["协助装配班组完成辅助性作业", "物料搬运与工位整理", "工具清洁与现场5S维护", "简单工序的操作执行"],
  };
  if (p.includes("文员")) return {
    category: "行政文员", tier: 1,
    tags: ["文档管理", "数据录入", "事务协调"],
    responsibilities: ["部门文档资料的整理与归档", "数据录入与报表制作", "部门内外事务协调与传达", "会议记录与日常事务跟进"],
  };

  return {
    category: "综合岗位", tier: 2,
    tags: ["岗位执行", "团队协作"],
    responsibilities: ["按岗位要求完成日常工作任务", "配合团队完成阶段性目标", "参与部门培训与技能提升", "遵守公司制度与安全规范"],
  };
}

/** TSDCKL 测评数据 (from data/GRT人员能力测评) */
const TSDCKL_DATA: Record<string, TSDCKLScore> = {
  "倪亚东": { T: { level: 4, score: 85 }, S: { level: 5, score: 92 }, D: { level: 4, score: 80 }, C: { level: 5, score: 95 }, K: { level: 4, score: 88 }, L: { level: 5, score: 96 } },
  "刘奥运": { T: { level: 4, score: 82 }, S: { level: 4, score: 78 }, D: { level: 3, score: 72 }, C: { level: 4, score: 85 }, K: { level: 4, score: 80 }, L: { level: 3, score: 75 } },
  "黄晓兰": { T: { level: 2, score: 45 }, S: { level: 3, score: 68 }, D: { level: 1, score: 30 }, C: { level: 3, score: 65 }, K: { level: 4, score: 82 }, L: { level: 1, score: 25 } },
  "王秀萍": { T: { level: 2, score: 48 }, S: { level: 3, score: 65 }, D: { level: 1, score: 28 }, C: { level: 3, score: 62 }, K: { level: 4, score: 85 }, L: { level: 1, score: 22 } },
  "王汝月": { T: { level: 1, score: 32 }, S: { level: 2, score: 52 }, D: { level: 1, score: 25 }, C: { level: 2, score: 55 }, K: { level: 3, score: 68 }, L: { level: 1, score: 18 } },
  "李新正": { T: { level: 2, score: 42 }, S: { level: 2, score: 55 }, D: { level: 1, score: 28 }, C: { level: 2, score: 58 }, K: { level: 3, score: 65 }, L: { level: 1, score: 20 } },
  "沙建梅": { T: { level: 2, score: 40 }, S: { level: 4, score: 82 }, D: { level: 2, score: 45 }, C: { level: 4, score: 85 }, K: { level: 3, score: 72 }, L: { level: 3, score: 70 } },
  "段天珠": { T: { level: 2, score: 38 }, S: { level: 3, score: 65 }, D: { level: 2, score: 42 }, C: { level: 3, score: 68 }, K: { level: 4, score: 80 }, L: { level: 2, score: 48 } },
  "胡杨":   { T: { level: 4, score: 88 }, S: { level: 3, score: 65 }, D: { level: 3, score: 72 }, C: { level: 3, score: 68 }, K: { level: 3, score: 70 }, L: { level: 2, score: 42 } },
  "朱宇浩": { T: { level: 4, score: 85 }, S: { level: 3, score: 62 }, D: { level: 3, score: 70 }, C: { level: 3, score: 65 }, K: { level: 3, score: 68 }, L: { level: 2, score: 40 } },
  "侯晓薇": { T: { level: 3, score: 72 }, S: { level: 3, score: 68 }, D: { level: 3, score: 75 }, C: { level: 3, score: 62 }, K: { level: 3, score: 65 }, L: { level: 2, score: 38 } },
  "刘坤":   { T: { level: 3, score: 68 }, S: { level: 3, score: 72 }, D: { level: 2, score: 55 }, C: { level: 4, score: 80 }, K: { level: 3, score: 65 }, L: { level: 2, score: 45 } },
  "朱文韬": { T: { level: 2, score: 48 }, S: { level: 3, score: 65 }, D: { level: 2, score: 52 }, C: { level: 4, score: 78 }, K: { level: 3, score: 62 }, L: { level: 2, score: 42 } },
  "戴晓燕": { T: { level: 3, score: 65 }, S: { level: 4, score: 82 }, D: { level: 2, score: 48 }, C: { level: 5, score: 90 }, K: { level: 3, score: 72 }, L: { level: 4, score: 78 } },
  "金晓锋": { T: { level: 4, score: 85 }, S: { level: 3, score: 68 }, D: { level: 3, score: 72 }, C: { level: 3, score: 70 }, K: { level: 4, score: 88 }, L: { level: 3, score: 68 } },
  "李大鹏": { T: { level: 4, score: 82 }, S: { level: 2, score: 55 }, D: { level: 3, score: 75 }, C: { level: 2, score: 52 }, K: { level: 3, score: 70 }, L: { level: 1, score: 28 } },
  "刘健康": { T: { level: 3, score: 62 }, S: { level: 4, score: 78 }, D: { level: 2, score: 45 }, C: { level: 4, score: 85 }, K: { level: 3, score: 68 }, L: { level: 3, score: 65 } },
  "洪香龙": { T: { level: 5, score: 92 }, S: { level: 3, score: 68 }, D: { level: 5, score: 90 }, C: { level: 3, score: 65 }, K: { level: 4, score: 82 }, L: { level: 3, score: 72 } },
  "洪小东": { T: { level: 4, score: 80 }, S: { level: 2, score: 55 }, D: { level: 4, score: 82 }, C: { level: 2, score: 52 }, K: { level: 3, score: 70 }, L: { level: 1, score: 28 } },
  "钱佳奇": { T: { level: 4, score: 78 }, S: { level: 2, score: 52 }, D: { level: 3, score: 72 }, C: { level: 2, score: 55 }, K: { level: 3, score: 68 }, L: { level: 1, score: 25 } },
  "倪亚琴": { T: { level: 3, score: 65 }, S: { level: 3, score: 68 }, D: { level: 2, score: 52 }, C: { level: 3, score: 72 }, K: { level: 3, score: 70 }, L: { level: 2, score: 45 } },
  "孙坚":   { T: { level: 4, score: 85 }, S: { level: 3, score: 65 }, D: { level: 4, score: 78 }, C: { level: 3, score: 62 }, K: { level: 4, score: 80 }, L: { level: 3, score: 68 } },
  "沈迎凤": { T: { level: 2, score: 48 }, S: { level: 4, score: 80 }, D: { level: 2, score: 45 }, C: { level: 4, score: 82 }, K: { level: 3, score: 68 }, L: { level: 3, score: 65 } },
  "冯艳":   { T: { level: 3, score: 62 }, S: { level: 3, score: 72 }, D: { level: 2, score: 48 }, C: { level: 4, score: 78 }, K: { level: 3, score: 65 }, L: { level: 2, score: 42 } },
  "孙国祥": { T: { level: 4, score: 82 }, S: { level: 2, score: 55 }, D: { level: 3, score: 72 }, C: { level: 2, score: 52 }, K: { level: 3, score: 70 }, L: { level: 1, score: 28 } },
  "张腾飞": { T: { level: 3, score: 72 }, S: { level: 3, score: 65 }, D: { level: 2, score: 48 }, C: { level: 3, score: 68 }, K: { level: 3, score: 72 }, L: { level: 2, score: 52 } },
  "马柯":   { T: { level: 3, score: 68 }, S: { level: 3, score: 62 }, D: { level: 2, score: 48 }, C: { level: 3, score: 65 }, K: { level: 4, score: 80 }, L: { level: 2, score: 42 } },
  "史龙昌": { T: { level: 3, score: 72 }, S: { level: 2, score: 55 }, D: { level: 2, score: 45 }, C: { level: 2, score: 58 }, K: { level: 3, score: 68 }, L: { level: 2, score: 40 } },
  "杨勇":   { T: { level: 3, score: 65 }, S: { level: 4, score: 78 }, D: { level: 2, score: 48 }, C: { level: 4, score: 82 }, K: { level: 3, score: 72 }, L: { level: 3, score: 68 } },
  "匡凯旋": { T: { level: 3, score: 68 }, S: { level: 3, score: 65 }, D: { level: 2, score: 45 }, C: { level: 3, score: 70 }, K: { level: 3, score: 72 }, L: { level: 2, score: 48 } },
  "倪微薇": { T: { level: 3, score: 60 }, S: { level: 4, score: 82 }, D: { level: 3, score: 68 }, C: { level: 4, score: 85 }, K: { level: 3, score: 70 }, L: { level: 4, score: 80 } },
};

/** 部门配置 */
const DEPT_CONFIG: Record<string, { icon: LucideIcon; color: string; buCode: string; buName: string; mission: string }> = {
  "总裁办":     { icon: Crown,     color: "#dc2626", buCode: "HQ",  buName: "总部",          mission: "战略决策与企业治理" },
  "财务部":     { icon: Shield,    color: "#f59e0b", buCode: "FIN", buName: "财务部",        mission: "财务管控与资金运营" },
  "人事行政部": { icon: Users,     color: "#ec4899", buCode: "HR",  buName: "人事行政部",    mission: "人才发展与行政保障" },
  "AI数智部":   { icon: Cpu,       color: "#8b5cf6", buCode: "IT",  buName: "AI数智部",      mission: "数字化转型与IT支撑" },
  "事业部支持部": { icon: Target,  color: "#06b6d4", buCode: "SUP", buName: "事业部支持部",  mission: "跨事业部售后与技术支持" },
  "事业一部":   { icon: Building2, color: "#3b82f6", buCode: "BU1", buName: "海外事业部",    mission: "海外超声波清洗设备全生命周期交付" },
  "事业二部":   { icon: Building2, color: "#10b981", buCode: "BU2", buName: "商用车事业部",  mission: "商用车零部件清洗设备设计与交付" },
  "事业三部":   { icon: Building2, color: "#f97316", buCode: "BU3", buName: "乘用车事业部",  mission: "乘用车零部件清洗设备全流程服务" },
  "事业四部":   { icon: Factory,   color: "#6366f1", buCode: "BU4", buName: "半导体事业部",  mission: "半导体精密清洗设备研发" },
  "事业十部":   { icon: Wrench,    color: "#78716c", buCode: "BU5", buName: "工业通用事业部", mission: "机加工中心与通用制造服务" },
  "未分配":     { icon: User,      color: "#9ca3af", buCode: "-",   buName: "待分配",        mission: "岗位待定" },
};

const DEPT_ORDER = ["总裁办", "AI数智部", "事业一部", "事业二部", "事业三部", "事业四部", "事业十部", "财务部", "人事行政部", "事业部支持部", "未分配"];

/** 构建完整员工列表 */
function buildEmployeeList(): Employee[] {
  const raw: { id: string; name: string; department: string; position: string }[] = [
    {id:"GRT001",name:"倪亚东",department:"总裁办",position:"董事长"},{id:"GRT078",name:"曹二",department:"总裁办",position:"运营总监"},
    {id:"GRT080",name:"刘奥运",department:"AI数智部",position:"董事长助理"},{id:"GRT105",name:"倪微薇",department:"AI数智部",position:"AI数智&人事行政部经理"},{id:"GRT096",name:"侯晓薇",department:"AI数智部",position:"部门经理"},{id:"GRT083",name:"刘坤",department:"AI数智部",position:"市场主管"},{id:"GRT049",name:"胡杨",department:"AI数智部",position:"IT工程师"},{id:"GRT103",name:"朱文韬",department:"AI数智部",position:"市场专员"},
    {id:"GRT094",name:"徐树奎",department:"事业一部",position:"事业二部经理"},{id:"GRT004",name:"戴晓燕",department:"事业一部",position:"高级销售经理"},{id:"GRT005",name:"金晓锋",department:"事业一部",position:"制造质量经理"},{id:"GRT030",name:"匡凯旋",department:"事业一部",position:"售后服务主管"},{id:"GRT046",name:"吕雪冬",department:"事业一部",position:"电气班组班长"},{id:"GRT015",name:"杜显文",department:"事业一部",position:"电气班组副班长"},{id:"GRT022",name:"李大鹏",department:"事业一部",position:"电气工程师"},{id:"GRT063",name:"刘健康",department:"事业一部",position:"销售与项目工程师"},{id:"GRT043",name:"韩保程",department:"事业一部",position:"销售与项目工程师"},{id:"GRT020",name:"张洵",department:"事业一部",position:"采购与项目工程师"},{id:"GRT057",name:"滕顺英",department:"事业一部",position:"采购与项目工程师"},{id:"GRT093",name:"李柯瑶",department:"事业一部",position:"销售与项目工程师"},{id:"GRT104",name:"董纾雨",department:"事业一部",position:"销售与项目工程师"},{id:"GRT090",name:"陈加丽",department:"事业一部",position:"助理机械研发工程师"},{id:"GRT087",name:"梅奥杰",department:"事业一部",position:"助理电气工程师"},{id:"GRT088",name:"高嘉义",department:"事业一部",position:"助理电气工程师"},{id:"GRT014",name:"廉龙海",department:"事业一部",position:"售后技工"},{id:"GRT028",name:"朱明华",department:"事业一部",position:"售后技工"},{id:"GRT040",name:"曾春贵",department:"事业一部",position:"售后技工"},{id:"GRT064",name:"强兵兵",department:"事业一部",position:"激光切割"},{id:"GRT010",name:"吴卫成",department:"事业一部",position:"机械装配"},{id:"GRT016",name:"曹庆伟",department:"事业一部",position:"机械装配"},{id:"GRT033",name:"徐家乐",department:"事业一部",position:"机械装配"},{id:"GRT039",name:"侯德朋",department:"事业一部",position:"机械装配"},{id:"GRT041",name:"张良",department:"事业一部",position:"机械装配"},{id:"GRT052",name:"赵强",department:"事业一部",position:"机械装配"},{id:"GRT059",name:"焦斌",department:"事业一部",position:"机械装配"},{id:"GRT079",name:"阎建华",department:"事业一部",position:"机械装配"},{id:"GRT092",name:"吴周祥",department:"事业一部",position:"机械装配"},{id:"GRT107",name:"纪伟",department:"事业一部",position:"机械装配"},{id:"GRT031",name:"沈龙翔",department:"事业一部",position:"电气装配"},{id:"GRT036",name:"韩品来",department:"事业一部",position:"电气装配"},{id:"GRT051",name:"崔聪聪",department:"事业一部",position:"电气装配"},{id:"GRT071",name:"刘琛杨",department:"事业一部",position:"电气装配"},{id:"GRT072",name:"赵铖杰",department:"事业一部",position:"电气装配"},{id:"GRT091",name:"陈武鸣",department:"事业一部",position:"电气装配"},{id:"GRT017",name:"田坪珍",department:"事业一部",position:"焊工"},{id:"GRT082",name:"沈富高",department:"事业一部",position:"焊工"},{id:"GRT061",name:"李明遂",department:"事业一部",position:"数控车工"},{id:"GRT047",name:"嵇国华",department:"事业一部",position:"协作辅助"},
    {id:"GRT006",name:"洪香龙",department:"事业二部",position:"机械设计经理"},{id:"GRT038",name:"马林山",department:"事业二部",position:"装配班组长"},{id:"GRT062",name:"朱宇浩",department:"事业二部",position:"生产工程师兼项目及IT工程师"},{id:"GRT097",name:"钱佳奇",department:"事业二部",position:"电气工程师"},{id:"GRT044",name:"洪小东",department:"事业二部",position:"机械研发工程师"},{id:"GRT065",name:"蔡瑞",department:"事业二部",position:"机械研发工程师"},{id:"GRT085",name:"何烨",department:"事业二部",position:"机械研发工程师"},{id:"GRT099",name:"殷金刚",department:"事业二部",position:"机械研发工程师"},{id:"GRT074",name:"王金涛",department:"事业二部",position:"机械装配"},{id:"GRT098",name:"曹滟林",department:"事业二部",position:"机械装配"},{id:"GRT106",name:"谈宜磊",department:"事业二部",position:"机械装配"},{id:"GRT109",name:"谈龙锐",department:"事业二部",position:"机械装配"},
    {id:"GRT058",name:"周辉",department:"事业三部",position:"事业三部经理"},{id:"GRT045",name:"杨勇",department:"事业三部",position:"生产工程师兼项目经理"},{id:"GRT055",name:"沈迎凤",department:"事业三部",position:"采购经理"},{id:"GRT007",name:"孙坚",department:"事业三部",position:"电气主管"},{id:"GRT003",name:"倪亚琴",department:"事业三部",position:"采购与项目工程师"},{id:"GRT019",name:"冯艳",department:"事业三部",position:"销售与项目工程师"},{id:"GRT035",name:"王志强",department:"事业三部",position:"销售与项目工程师"},{id:"GRT089",name:"罗小玲",department:"事业三部",position:"助理机械研发工程师"},{id:"GRT027",name:"黄昊",department:"事业三部",position:"PMC专员"},{id:"GRT037",name:"黄潇潇",department:"事业三部",position:"文员"},{id:"GRT013",name:"孙淼",department:"事业三部",position:"机械装配"},{id:"GRT021",name:"张松松",department:"事业三部",position:"机械装配"},{id:"GRT025",name:"肖博雅",department:"事业三部",position:"机械装配"},{id:"GRT032",name:"王犇",department:"事业三部",position:"机械装配"},{id:"GRT034",name:"王勇",department:"事业三部",position:"机械装配"},{id:"GRT042",name:"刘建年",department:"事业三部",position:"机械装配"},{id:"GRT050",name:"蕾翠林",department:"事业三部",position:"机械装配"},{id:"GRT060",name:"杨会龙",department:"事业三部",position:"机械装配"},{id:"GRT075",name:"胡绍杰",department:"事业三部",position:"机械装配"},{id:"GRT076",name:"王森",department:"事业三部",position:"机械装配"},{id:"GRT077",name:"吴阳洋",department:"事业三部",position:"机械装配"},{id:"GRT084",name:"蒋秋瑞",department:"事业三部",position:"机械装配"},{id:"GRT108",name:"周建华",department:"事业三部",position:"机械装配"},{id:"GRT023",name:"杨之雲",department:"事业三部",position:"电气装配"},{id:"GRT029",name:"殷小勇",department:"事业三部",position:"电气装配"},{id:"GRT056",name:"陈成成",department:"事业三部",position:"焊工"},
    {id:"GRT018",name:"孙国祥",department:"事业四部",position:"电气工程师"},{id:"GRT024",name:"张腾飞",department:"事业四部",position:"机加工班组长"},
    {id:"GRT008",name:"马柯",department:"事业十部",position:"质量专员"},{id:"GRT009",name:"史龙昌",department:"事业十部",position:"激光切作班组长"},{id:"GRT011",name:"张超",department:"事业十部",position:"激光"},{id:"GRT012",name:"李兴伟",department:"事业十部",position:"冷作"},{id:"GRT048",name:"李树锋",department:"事业十部",position:"机加工"},{id:"GRT068",name:"李亚超",department:"事业十部",position:"CNC操作工"},{id:"GRT069",name:"李鹏飞",department:"事业十部",position:"数控车工"},{id:"GRT070",name:"毛洪飞",department:"事业十部",position:"机加工"},{id:"GRT073",name:"范威",department:"事业十部",position:"CNC操作工"},{id:"GRT102",name:"张飞",department:"事业十部",position:"机加工铣工"},
    {id:"GRT002",name:"黄晓兰",department:"财务部",position:"会计"},{id:"GRT054",name:"王秀萍",department:"财务部",position:"总账会计"},{id:"GRT101",name:"王汝月",department:"财务部",position:"会计助理"},{id:"GRT026",name:"季蔚正",department:"财务部",position:"仓库管理员"},{id:"GRT066",name:"李新正",department:"财务部",position:"仓库管理员"},{id:"GRT079_2",name:"马鹏风",department:"财务部",position:"供应链工程师"},{id:"GRT111",name:"华淼",department:"财务部",position:"财务"},
    {id:"GRT067",name:"沙建梅",department:"人事行政部",position:"人事行政主管"},{id:"GRT053",name:"段天珠",department:"人事行政部",position:"前法"},{id:"GRT100",name:"田炜钰",department:"人事行政部",position:"行政前台"},{id:"GRT095",name:"王爱云",department:"人事行政部",position:"后勤助理"},{id:"GRT110",name:"林中风",department:"人事行政部",position:"后勤"},
    {id:"GRT086",name:"晏春艮",department:"事业部支持部",position:"售后技工"},
    {id:"GRT081",name:"马康风",department:"未分配",position:"供应链助理工程师"},
  ];

  return raw.map((r) => {
    const cls = classifyPosition(r.position);
    return {
      ...r,
      tsdckl: TSDCKL_DATA[r.name],
      category: cls.category,
      responsibilities: cls.responsibilities,
      tags: cls.tags,
      skillTier: cls.tier,
    };
  });
}

const ALL_EMPLOYEES = buildEmployeeList();

// ═══════════════════════════════════════════════════════════
// UI Components
// ═══════════════════════════════════════════════════════════

function TierBadge({ tier }: { tier: number }) {
  const config = [
    { bg: "bg-gray-100 text-gray-600", label: "L1" },
    { bg: "bg-blue-100 text-blue-700", label: "L2" },
    { bg: "bg-emerald-100 text-emerald-700", label: "L3" },
    { bg: "bg-amber-100 text-amber-700", label: "L4" },
    { bg: "bg-red-100 text-red-700", label: "L5" },
  ][tier - 1] ?? { bg: "bg-gray-100 text-gray-600", label: "L?" };
  return <Badge className={`${config.bg} border-0 font-mono text-xs`}>{config.label}</Badge>;
}

function MiniRadar({ scores }: { scores: TSDCKLScore }) {
  const dims = ["T", "S", "D", "C", "K", "L"] as const;
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38;

  const points = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    const val = scores[d].score / 100;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      lx: cx + (r + 12) * Math.cos(angle),
      ly: cy + (r + 12) * Math.sin(angle),
      dim: d,
      score: scores[d].score,
      level: scores[d].level,
    };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((s) => (
        <polygon
          key={s}
          points={dims
            .map((_, i) => {
              const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
              return `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}
      <polygon points={polyPoints} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth={1.5} />
      {points.map((p) => (
        <g key={p.dim}>
          <circle cx={p.x} cy={p.y} r={2} fill="#3b82f6" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#6b7280" fontWeight={600}>
            {p.dim}
          </text>
        </g>
      ))}
    </svg>
  );
}

function EmployeeCard({ emp, expanded, onToggle, canEdit }: { emp: Employee; expanded: boolean; onToggle: () => void; canEdit: boolean }) {
  const avgScore = emp.tsdckl
    ? Math.round(Object.values(emp.tsdckl).reduce((s, v) => s + v.score, 0) / 6)
    : 0;

  return (
    <Card className={`transition-all ${expanded ? "ring-2 ring-blue-400" : "hover:shadow-md"}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: DEPT_CONFIG[emp.department]?.color ?? "#6b7280" }}
          >
            {emp.name.slice(-2)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{emp.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{emp.id}</span>
              <TierBadge tier={emp.skillTier} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{emp.position}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {emp.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] h-4 px-1 border-dashed">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          {/* TSDCKL Mini Radar */}
          {emp.tsdckl && (
            <div className="shrink-0">
              <MiniRadar scores={emp.tsdckl} />
            </div>
          )}

          {/* Edit + Expand */}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={(e) => { e.stopPropagation(); toast("编辑功能开发中"); }}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onToggle}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Responsibilities */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> 工作职责
              </div>
              <ol className="text-xs space-y-0.5 ml-4 list-decimal text-muted-foreground">
                {emp.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>

            {/* TSDCKL Scores */}
            {emp.tsdckl && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Award className="w-3 h-3" /> TSDCKL 六维评估 (综合 {avgScore}分)
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(["T", "S", "D", "C", "K", "L"] as const).map((d) => {
                    const info = TSDCKL_LABELS[d];
                    const val = emp.tsdckl![d];
                    return (
                      <div key={d} className="flex items-center gap-1">
                        <span className="text-[10px] font-mono w-4 shrink-0" style={{ color: info.color }}>{d}</span>
                        <Progress value={val.score} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">L{val.level}({val.score})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{emp.category}</Badge>
              {!emp.tsdckl && (
                <span className="text-[10px] text-muted-foreground italic">TSDCKL: 待测评</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeptSection({ dept, employees, canEdit }: { dept: string; employees: Employee[]; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const config = DEPT_CONFIG[dept] ?? DEPT_CONFIG["未分配"];
  const DeptIcon = config.icon;

  const categoryGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    for (const e of employees) {
      (groups[e.category] ??= []).push(e);
    }
    return Object.entries(groups).sort(([, a], [, b]) => {
      const maxA = Math.max(...a.map((e) => e.skillTier));
      const maxB = Math.max(...b.map((e) => e.skillTier));
      return maxB - maxA;
    });
  }, [employees]);

  const assessed = employees.filter((e) => e.tsdckl).length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
        style={{ borderLeft: `4px solid ${config.color}` }}
      >
        <DeptIcon className="w-5 h-5" style={{ color: config.color }} />
        <div className="flex-1 text-left">
          <div className="font-semibold">{dept}</div>
          <div className="text-xs text-muted-foreground">
            {config.buName} | {config.mission}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{employees.length}人</Badge>
          {assessed > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              TSDCKL {assessed}/{employees.length}
            </Badge>
          )}
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-4 pl-4">
          {categoryGroups.map(([cat, emps]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {cat} ({emps.length}人)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {emps.map((e) => (
                  <EmployeeCard
                    key={e.id}
                    emp={e}
                    expanded={expandedCards.has(e.id)}
                    canEdit={canEdit}
                    onToggle={() =>
                      setExpandedCards((prev) => {
                        const next = new Set(prev);
                        next.has(e.id) ? next.delete(e.id) : next.add(e.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════

export default function EmployeeDirectory() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"dept" | "category">("dept");

  // Role-based editing
  const { level, currentUserRole: role } = useUserProfile();
  const canEdit = level >= 5 || role === "hr_manager";

  // Backend data fetch — merge with static TSDCKL reference data
  const backendQuery = (trpc.users as any).getAll.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const backendUsers: any[] | undefined = backendQuery.data;
  const isLive = !!backendUsers && backendUsers.length > 0;

  // Merge: if backend has user by name, use their DB id; keep all static TSDCKL/classification data
  const mergedEmployees = useMemo(() => {
    if (!backendUsers || backendUsers.length === 0) return ALL_EMPLOYEES;
    const backendByName = new Map<string, any>();
    for (const u of backendUsers) {
      if (u.name) backendByName.set(u.name, u);
    }
    return ALL_EMPLOYEES.map((emp) => {
      const dbUser = backendByName.get(emp.name);
      if (dbUser) {
        return { ...emp, id: dbUser.id ?? emp.id };
      }
      return emp;
    });
  }, [backendUsers]);

  const filtered = useMemo(() => {
    let list = mergedEmployees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.position.includes(q) ||
          e.category.includes(q) ||
          e.tags.some((t) => t.includes(q))
      );
    }
    if (deptFilter) list = list.filter((e) => e.department === deptFilter);
    if (categoryFilter) list = list.filter((e) => e.category === categoryFilter);
    return list;
  }, [search, deptFilter, categoryFilter, mergedEmployees]);

  const deptGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    for (const e of filtered) (groups[e.department] ??= []).push(e);
    return DEPT_ORDER.filter((d) => groups[d]).map((d) => ({ dept: d, employees: groups[d] }));
  }, [filtered]);

  const catGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    for (const e of filtered) (groups[e.category] ??= []).push(e);
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [filtered]);

  const allCategories = useMemo(() => [...new Set(ALL_EMPLOYEES.map((e) => e.category))].sort(), []);

  const stats = useMemo(() => {
    const assessed = ALL_EMPLOYEES.filter((e) => e.tsdckl).length;
    const avgTier = +(ALL_EMPLOYEES.reduce((s, e) => s + e.skillTier, 0) / ALL_EMPLOYEES.length).toFixed(1);
    const deptCount = new Set(ALL_EMPLOYEES.map((e) => e.department)).size;
    return { total: ALL_EMPLOYEES.length, assessed, avgTier, deptCount };
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          GRT 员工目录册
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">
            2026年3月 组织架构 | 基于TSDCKL六维能力评估的部门归类与人物画像
          </p>
          <Badge variant={isLive ? "default" : "secondary"} className={`text-[10px] ${isLive ? "bg-emerald-600" : ""}`}>
            数据来源: {isLive ? "实时数据" : "本地数据"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-muted-foreground">在册员工</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.deptCount}</div>
            <div className="text-xs text-muted-foreground">部门</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.assessed}/{stats.total}</div>
            <div className="text-xs text-muted-foreground">TSDCKL已测评</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">L{stats.avgTier}</div>
            <div className="text-xs text-muted-foreground">平均技能等级</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索姓名、工号、岗位、技能标签..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1">
          <Button
            variant={deptFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setDeptFilter(null)}
          >
            全部
          </Button>
          {DEPT_ORDER.filter((d) => d !== "未分配").map((d) => {
            const count = ALL_EMPLOYEES.filter((e) => e.department === d).length;
            return (
              <Button
                key={d}
                variant={deptFilter === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDeptFilter(deptFilter === d ? null : d)}
                className="text-xs"
              >
                {d.replace("事业", "").replace("部", "")} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex gap-1 border-l pl-2">
          <Button
            variant={viewMode === "dept" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("dept")}
          >
            <Building2 className="w-3 h-3 mr-1" />按部门
          </Button>
          <Button
            variant={viewMode === "category" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("category")}
          >
            <LayoutGrid className="w-3 h-3 mr-1" />按岗位
          </Button>
        </div>
      </div>

      {/* Category filter */}
      {viewMode === "category" && (
        <div className="flex flex-wrap gap-1">
          <Button variant={categoryFilter === null ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(null)}>
            全部岗位
          </Button>
          {allCategories.map((c) => (
            <Button
              key={c}
              variant={categoryFilter === c ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
            >
              {c}
            </Button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        显示 {filtered.length} / {ALL_EMPLOYEES.length} 名员工
      </div>

      {/* Content */}
      {viewMode === "dept" ? (
        deptGroups.map(({ dept, employees }) => (
          <DeptSection key={dept} dept={dept} employees={employees} canEdit={canEdit} />
        ))
      ) : (
        catGroups.map(([cat, emps]) => (
          <DeptSection key={cat} dept={cat} employees={emps} canEdit={canEdit} />
        ))
      )}
    </div>
  );
}
