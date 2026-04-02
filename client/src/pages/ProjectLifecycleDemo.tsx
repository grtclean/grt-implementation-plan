/**
 * 项目全生命周期实战演练 — 蔚来汽车·电驱清洗产线
 *
 * CTO/CEO视角: 一个真实项目如何穿越M0-M12的13个阶段门,
 * 每个角色在每个阶段做什么, 数据如何流转, 信息如何披露.
 *
 * 项目: 蔚来汽车-电驱系统清洗产线 (PRJ-2026-NIO-001)
 * 金额: ¥320万
 * 周期: 180天 (M0→M12)
 * DA团队: 戴晓燕→洪香龙→孙坚→金晓锋→沈迎凤→马林山→杨勇
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Play, ChevronRight, ChevronLeft, CheckCircle, Clock, AlertTriangle,
  Target, FileText, Wrench, Zap, ShieldCheck, ShoppingCart, Factory,
  Truck, Settings2, Users, DollarSign, Star, ArrowRight, Milestone,
  Phone, MapPin, Package, ClipboardCheck, Lock, Power, Award, Eye,
  TrendingUp, Calendar, MessageSquare, Briefcase
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  项目定义
// ═══════════════════════════════════════════════════════════════

const PROJECT = {
  code: "PRJ-2026-NIO-001",
  name: "蔚来汽车-电驱系统清洗产线",
  customer: "蔚来汽车(NIO)",
  type: "strategic",
  budget: 3200000,
  duration: 180,
  pm: "焦斌",
  bu: "事业一部(海外/乘用车)",
};

const DA_TEAM = [
  { code: "GRT004", name: "戴晓燕", role: "销售工程师", icon: Briefcase, color: "bg-orange-500", phases: ["M0", "M1", "M2"] },
  { code: "GRT006", name: "洪香龙", role: "机械设计工程师", icon: Wrench, color: "bg-sky-500", phases: ["M3", "M4", "M5"] },
  { code: "GRT007", name: "孙坚", role: "电气设计工程师", icon: Zap, color: "bg-yellow-500", phases: ["M4", "M5"] },
  { code: "GRT005", name: "金晓锋", role: "质量工程师", icon: ShieldCheck, color: "bg-green-500", phases: ["M6", "M7", "M8"] },
  { code: "GRT055", name: "沈迎凤", role: "采购工程师", icon: ShoppingCart, color: "bg-purple-500", phases: ["M5", "M6"] },
  { code: "GRT038", name: "马林山", role: "生产班组长", icon: Factory, color: "bg-red-500", phases: ["M6", "M7"] },
  { code: "GRT045", name: "杨勇", role: "调试/现场工程师", icon: Power, color: "bg-indigo-500", phases: ["M7", "M8", "M9", "M10", "M11"] },
];

// ═══════════════════════════════════════════════════════════════
//  M0-M12 阶段详情 (每个阶段: 关键活动 + 角色任务 + 交付物 + 数据流)
// ═══════════════════════════════════════════════════════════════

interface PhaseData {
  id: string;
  name: string;
  nameEn: string;
  duration: string;
  icon: typeof Target;
  color: string;
  owner: string;
  ownerRole: string;
  summary: string;
  tasks: { role: string; task: string; output: string; system: string; status: "done" | "active" | "pending" }[];
  gate: { name: string; criteria: string[]; result: string };
  dataFlow: { from: string; to: string; data: string }[];
  kpis: { label: string; value: string; target: string }[];
}

const PHASES: PhaseData[] = [
  {
    id: "M0", name: "商机识别", nameEn: "Opportunity ID", duration: "D1-D7", icon: Target, color: "bg-purple-600", owner: "戴晓燕", ownerRole: "销售工程师",
    summary: "蔚来汽车VP王总来电咨询电驱系统清洗方案。线索评分95分,标记为🔥热线索。",
    tasks: [
      { role: "戴晓燕(销售)", task: "接听客户来电,登记线索LD-2026-038", output: "线索卡片(客户/需求/预算/时间线)", system: "销售工作台→线索Tab", status: "done" },
      { role: "戴晓燕(销售)", task: "24h内回电确认需求:电驱定子+转子清洗,年产10万台", output: "需求初步摘要", system: "销售工作台→今日任务", status: "done" },
      { role: "戴晓燕(销售)", task: "安排CTO演示(3月31日)", output: "演示日程", system: "会议系统", status: "done" },
    ],
    gate: { name: "M0→M1 阶段门: 商机确认", criteria: ["客户决策人确认", "预算范围明确(¥300-350万)", "技术可行性初判", "竞争对手识别(杜尔Dürr/马勒MAHLE)"], result: "PASS — 转入M1" },
    dataFlow: [
      { from: "销售工作台", to: "CRM系统", data: "线索→商机转化(OPP-004)" },
      { from: "数字营销", to: "销售工作台", data: "线索来源归因:展会获取" },
    ],
    kpis: [{ label: "线索响应时间", value: "4h", target: "<24h" }, { label: "AI评分", value: "95/100", target: ">70" }],
  },
  {
    id: "M1", name: "需求确认", nameEn: "Requirements", duration: "D8-D21", icon: FileText, color: "bg-blue-600", owner: "戴晓燕", ownerRole: "销售工程师",
    summary: "现场勘查蔚来合肥工厂,确认URS(用户需求规格书)。清洁度要求≤0.3mg,节拍≤60s/件。",
    tasks: [
      { role: "戴晓燕(销售)", task: "现场勘查蔚来合肥工厂(2天)", output: "URS文档v1.0", system: "销售工作台→商机管道", status: "done" },
      { role: "洪香龙(机械)", task: "参与勘查,测量现场布局尺寸", output: "现场布局CAD", system: "机械工程师工作台", status: "done" },
      { role: "孙坚(电气)", task: "确认电源/气源/水源接口规格", output: "公用接口清单", system: "电气工程师工作台", status: "done" },
      { role: "金晓锋(质量)", task: "确认VDA 19清洁度标准适用性", output: "质量标准矩阵", system: "质量工程师工作台", status: "done" },
      { role: "戴晓燕(销售)", task: "编制技术方案PPT(58页)", output: "方案v1.0", system: "销售工作台→报价Tab", status: "done" },
    ],
    gate: { name: "M1→M2 阶段门: URS评审", criteria: ["URS客户签字确认", "技术方案评审通过", "清洁度指标可达性确认", "交期可行性评估(180天)"], result: "PASS — 转入M2" },
    dataFlow: [
      { from: "销售工作台", to: "机械工程师工作台", data: "URS → 机械设计输入" },
      { from: "销售工作台", to: "电气工程师工作台", data: "公用接口 → 电气设计输入" },
      { from: "质量工程师工作台", to: "项目经理工作台", data: "清洁度标准 → 项目质量目标" },
    ],
    kpis: [{ label: "URS完整度", value: "100%", target: "100%" }, { label: "客户签字", value: "已签", target: "必签" }],
  },
  {
    id: "M2", name: "合同签约", nameEn: "Contract", duration: "D22-D35", icon: DollarSign, color: "bg-green-600", owner: "戴晓燕", ownerRole: "销售工程师",
    summary: "报价¥320万,客户要求降至¥298万。经商务谈判+CEO审批,最终¥310万成交,付款30/30/30/10。",
    tasks: [
      { role: "戴晓燕(销售)", task: "编制报价书QT-2026-016 v1.0(¥320万)", output: "报价书", system: "销售工作台→报价Tab", status: "done" },
      { role: "戴晓燕(销售)", task: "客户反馈:要求降至¥298万", output: "谈判记录", system: "CRM→交互记录", status: "done" },
      { role: "沈迎凤(采购)", task: "比价分析:关键物料成本压缩空间¥8万", output: "成本分析表", system: "采购驾驶舱", status: "done" },
      { role: "戴晓燕(销售)", task: "二轮谈判:¥310万+延保1年,CEO审批通过", output: "合同v1.0", system: "审批系统", status: "done" },
      { role: "焦斌(PM)", task: "立项登记PRJ-2026-NIO-001,分配DA团队", output: "项目立项单", system: "项目经理工作台", status: "done" },
    ],
    gate: { name: "M2→M3 阶段门: 合同签约", criteria: ["合同双方签字盖章", "首付款30%(¥93万)到账", "项目立项审批通过", "DA团队确认"], result: "PASS — 转入M3" },
    dataFlow: [
      { from: "销售工作台", to: "项目经理工作台", data: "合同 → 项目预算¥310万" },
      { from: "采购驾驶舱", to: "销售工作台", data: "成本分析 → 报价支撑" },
      { from: "项目经理工作台", to: "所有工作台", data: "立项通知 → 各角色任务分配" },
    ],
    kpis: [{ label: "毛利率", value: "32%", target: ">25%" }, { label: "首付到账", value: "¥93万", target: "30%" }],
  },
  {
    id: "M3", name: "机械设计", nameEn: "Mechanical Design", duration: "D36-D65", icon: Wrench, color: "bg-sky-600", owner: "洪香龙", ownerRole: "机械设计工程师",
    summary: "30天完成整线机械设计。超声波清洗→高压喷淋→真空干燥→风切→下料。BOM 287项。",
    tasks: [
      { role: "洪香龙(机械)", task: "概念方案3D建模(SolidWorks)", output: "3D总装图v1.0", system: "机械工程师工作台→设计任务", status: "done" },
      { role: "洪香龙(机械)", task: "5工位详细设计:清洗/喷淋/干燥/风切/下料", output: "详图包(85张)", system: "图纸库", status: "done" },
      { role: "洪香龙(机械)", task: "关键部件FEA强度分析(主轴/框架)", output: "FEA报告", system: "机械工程师工作台→设计任务", status: "done" },
      { role: "洪香龙(机械)", task: "BOM编制(287项物料)", output: "制造BOM v1.0", system: "BOM管理", status: "done" },
      { role: "金晓锋(质量)", task: "设计评审:DFMEA(42项风险)", output: "DFMEA报告", system: "质量工程师工作台", status: "done" },
    ],
    gate: { name: "M3→M4 阶段门: 方案评审", criteria: ["3D模型客户确认", "DFMEA风险≤3项高等级", "BOM成本≤预算85%", "标准化率≥80%"], result: "PASS(条件) — DFMEA需补充2项措施" },
    dataFlow: [
      { from: "机械工程师工作台", to: "电气工程师工作台", data: "布局图 → 电气柜/走线设计输入" },
      { from: "机械工程师工作台", to: "BOM管理", data: "BOM 287项 → 采购需求输入" },
      { from: "机械工程师工作台", to: "采购驾驶舱", data: "长交期物料(液压缸21天/电机21天)预警" },
    ],
    kpis: [{ label: "设计完成率", value: "100%", target: "100%" }, { label: "标准化率", value: "85%", target: "≥80%" }],
  },
  {
    id: "M4", name: "电气设计", nameEn: "Electrical Design", duration: "D50-D75", icon: Zap, color: "bg-yellow-600", owner: "孙坚", ownerRole: "电气设计工程师",
    summary: "与M3并行。S7-1500 PLC,128点I/O,HMI 15寸,CE+SEMI认证。EPLAN出图45张。",
    tasks: [
      { role: "孙坚(电气)", task: "电气原理图设计(EPLAN,45张)", output: "电气图纸包", system: "电气工程师工作台→设计任务", status: "done" },
      { role: "孙坚(电气)", task: "PLC程序编写(S7-1500,8500步)", output: "PLC程序v1.0", system: "电气工程师工作台→PLC编程", status: "done" },
      { role: "孙坚(电气)", task: "I/O分配表(DI:85/DO:42/AI:12/AO:5)", output: "I/O分配表", system: "电气工程师工作台→I/O分配", status: "done" },
      { role: "孙坚(电气)", task: "HMI画面设计(15寸,28页)", output: "HMI程序", system: "电气工程师工作台→HMI设计", status: "done" },
      { role: "孙坚(电气)", task: "CE+SEMI安全合规检查(6项)", output: "合规报告", system: "电气工程师工作台→安全合规", status: "done" },
    ],
    gate: { name: "M4→M5 阶段门: 设计冻结", criteria: ["电气图纸评审通过", "PLC程序模拟测试OK", "安全合规6/6项PASS", "I/O余量≥15%"], result: "PASS — 设计冻结,通知采购" },
    dataFlow: [
      { from: "电气工程师工作台", to: "BOM管理", data: "电气BOM(62项) → 合并入总BOM" },
      { from: "电气工程师工作台", to: "采购驾驶舱", data: "电气物料清单 → 采购下单" },
      { from: "设计冻结", to: "生产排产", data: "BOM冻结通知 → SmartProductionScheduling" },
    ],
    kpis: [{ label: "I/O利用率", value: "78%", target: "<85%" }, { label: "安全合规", value: "6/6", target: "100%" }],
  },
  {
    id: "M5", name: "采购备料", nameEn: "Procurement", duration: "D65-D95", icon: ShoppingCart, color: "bg-purple-600", owner: "沈迎凤", ownerRole: "采购工程师",
    summary: "BOM 349项(机械287+电气62)。生成PO 45张,总采购额¥128万。长交期件提前2周下单。",
    tasks: [
      { role: "沈迎凤(采购)", task: "BOM→采购需求分解(349项→180项需采购)", output: "采购需求单", system: "工程师物料需求→采购驾驶舱", status: "done" },
      { role: "沈迎凤(采购)", task: "供应商比价(关键件3家比价)", output: "比价分析表", system: "采购驾驶舱→供应商Tab", status: "done" },
      { role: "沈迎凤(采购)", task: "生成PO 45张(总额¥128万)", output: "45张PO", system: "采购驾驶舱→订单Tab", status: "done" },
      { role: "仓库(张建国)", task: "收货质检:已收32/45批次", output: "GRN收货单", system: "收货质检工作台", status: "active" },
      { role: "金晓锋(质量)", task: "IQC来料检验:已检30批,合格率97%", output: "IQC报告", system: "质量工程师工作台→IQC", status: "active" },
    ],
    gate: { name: "M5→M6 阶段门: 物料齐套", criteria: ["关键物料到齐率≥95%", "IQC合格率≥95%", "长交期件全部到货", "缺料替代方案确认"], result: "进行中 — 32/45批次已到,等待13批" },
    dataFlow: [
      { from: "BOM管理", to: "采购驾驶舱", data: "BOM爆炸 → 349项物料需求" },
      { from: "采购驾驶舱", to: "收货质检工作台", data: "PO → 收货通知" },
      { from: "收货质检工作台", to: "质量工程师工作台", data: "收货 → IQC送检" },
      { from: "质量工程师工作台", to: "仓库管理", data: "IQC通过 → 入库上架" },
    ],
    kpis: [{ label: "到货率", value: "71%", target: "≥95%" }, { label: "IQC合格率", value: "97%", target: "≥95%" }],
  },
  {
    id: "M6", name: "生产制造", nameEn: "Manufacturing", duration: "D85-D130", icon: Factory, color: "bg-red-600", owner: "马林山", ownerRole: "生产班组长",
    summary: "T1-T15工序执行。5台设备同步装配。智能排产优化,实际工时1,850h。",
    tasks: [
      { role: "马林山(生产)", task: "智能排产:5台设备×15道工序", output: "排产计划甘特图", system: "SmartProductionScheduling", status: "active" },
      { role: "马林山(生产)", task: "T1-T8工序执行(下料→焊接→机加→表处)", output: "工序报工", system: "MES工作台", status: "active" },
      { role: "车间工人", task: "每日报工:工时/数量/质量", output: "work_logs", system: "ShopfloorTerminal", status: "active" },
      { role: "金晓锋(质量)", task: "过程巡检(每工序3个检查点)", output: "巡检记录", system: "质量工程师工作台→过程巡检", status: "active" },
      { role: "金晓锋(质量)", task: "首件确认(FAI):5个关键零件", output: "FAI报告", system: "质量工程师工作台→首件", status: "active" },
    ],
    gate: { name: "M6→M7 阶段门: 生产完工", criteria: ["所有工序完工", "过程巡检0重大不合格", "FAI全部通过", "工时在预算内(±10%)"], result: "进行中 — T1-T8完成, T9-T15进行中" },
    dataFlow: [
      { from: "SmartProductionScheduling", to: "MES工作台", data: "排产计划 → 工单派发" },
      { from: "MES工作台", to: "质量工程师工作台", data: "工序完工 → 触发巡检" },
      { from: "车间报工", to: "项目经理工作台", data: "实际工时 → 预算跟踪" },
    ],
    kpis: [{ label: "工序完成率", value: "53%", target: "100%" }, { label: "FPY直通率", value: "94%", target: "≥90%" }],
  },
  {
    id: "M7", name: "装配调试", nameEn: "Assembly & Test", duration: "D120-D145", icon: Settings2, color: "bg-teal-600", owner: "杨勇", ownerRole: "调试工程师",
    summary: "5台设备总装→电气接线→PLC联调→单机调试→联机调试→清洁度验证。",
    tasks: [
      { role: "马林山(生产)", task: "总装(T9-T12):5台设备机械组装", output: "总装完成单", system: "MES工作台", status: "pending" },
      { role: "孙坚(电气)", task: "电气接线+PLC程序下载", output: "接线报告", system: "电气工程师工作台→调试准备", status: "pending" },
      { role: "杨勇(调试)", task: "单机调试:每台8h", output: "调试记录", system: "M7M9DeliveryTrack", status: "pending" },
      { role: "杨勇(调试)", task: "联机调试:整线联动48h", output: "联调报告", system: "M7M9DeliveryTrack", status: "pending" },
      { role: "金晓锋(质量)", task: "终检:33项(机械8+电气6+功能10+清洁度4+外观5)", output: "终检报告", system: "质量工程师工作台→终检", status: "pending" },
    ],
    gate: { name: "M7→M8 阶段门: 出厂检验", criteria: ["终检33项全部PASS", "清洁度≤0.3mg实测验证", "安全测试通过", "操作手册编制完成"], result: "待执行" },
    dataFlow: [
      { from: "MES工作台", to: "M7M9DeliveryTrack", data: "总装完工 → 调试启动" },
      { from: "电气工程师工作台", to: "M7M9DeliveryTrack", data: "PLC程序 → 调试" },
      { from: "质量工程师工作台", to: "项目经理工作台", data: "终检PASS → 出厂放行" },
    ],
    kpis: [{ label: "调试通过率", value: "-", target: "≥95%" }, { label: "终检通过率", value: "-", target: "100%" }],
  },
  {
    id: "M8", name: "FAT验收", nameEn: "Factory Acceptance", duration: "D140-D150", icon: Award, color: "bg-amber-600", owner: "杨勇", ownerRole: "调试工程师",
    summary: "蔚来工程师到厂见证FAT。按URS逐项验证,清洁度实测0.22mg(要求≤0.3mg)。",
    tasks: [
      { role: "杨勇(调试)", task: "FAT执行:28项测试(客户见证)", output: "FAT报告", system: "FatSatExecutionDashboard", status: "pending" },
      { role: "金晓锋(质量)", task: "清洁度实测:取样5次,最大0.22mg", output: "清洁度证书", system: "质量工程师工作台", status: "pending" },
      { role: "戴晓燕(销售)", task: "陪同客户验收,处理punch list", output: "FAT签字单", system: "销售工作台", status: "pending" },
    ],
    gate: { name: "M8→M9 阶段门: FAT签字", criteria: ["28项FAT测试全PASS", "客户签字确认", "punch list≤5项(非功能性)", "第二笔30%(¥93万)收款"], result: "待执行" },
    dataFlow: [
      { from: "FatSatDashboard", to: "项目经理工作台", data: "FAT PASS → M8完成" },
      { from: "销售工作台", to: "财务系统", data: "FAT签字 → 触发收款¥93万" },
    ],
    kpis: [{ label: "FAT通过率", value: "-", target: "100%" }, { label: "清洁度", value: "-", target: "≤0.3mg" }],
  },
  {
    id: "M9", name: "发货安装", nameEn: "Shipping & Install", duration: "D150-D165", icon: Truck, color: "bg-lime-600", owner: "杨勇", ownerRole: "调试/现场工程师",
    summary: "5台设备拆解包装→物流发运(合肥)→现场安装→水电气接驳→安装验收。",
    tasks: [
      { role: "马林山(生产)", task: "设备拆解+防护包装(木箱)", output: "装箱清单", system: "仓库管理", status: "pending" },
      { role: "物流", task: "专车发运:上海→合肥(约6h)", output: "运单", system: "物流系统", status: "pending" },
      { role: "杨勇(现场)", task: "现场安装:10天(5台设备)", output: "安装报告", system: "FieldEngineerDashboard", status: "pending" },
      { role: "杨勇(现场)", task: "水电气接驳+设备调平", output: "接驳确认单", system: "FieldEngineerDashboard", status: "pending" },
    ],
    gate: { name: "M9→M10 阶段门: 安装验收", criteria: ["5台设备安装定位完成", "水电气接驳测试OK", "无运输损坏"], result: "待执行" },
    dataFlow: [{ from: "仓库管理", to: "FieldEngineerDashboard", data: "装箱清单 → 现场核对" }],
    kpis: [{ label: "安装周期", value: "-", target: "≤10天" }],
  },
  {
    id: "M10", name: "现场调试", nameEn: "Site Commissioning", duration: "D165-D172", icon: Power, color: "bg-cyan-600", owner: "杨勇", ownerRole: "调试工程师",
    summary: "现场联机调试+工艺参数优化+操作员培训(3天)。",
    tasks: [
      { role: "杨勇(现场)", task: "现场PLC联调+参数优化", output: "调试记录", system: "FieldEngineerDashboard", status: "pending" },
      { role: "杨勇(现场)", task: "操作员培训(3天,12人)", output: "培训签到表+考核", system: "培训系统", status: "pending" },
      { role: "孙坚(远程)", task: "远程协助PLC参数微调", output: "远程支持记录", system: "电气工程师工作台", status: "pending" },
    ],
    gate: { name: "M10→M11 阶段门: 调试完成", criteria: ["整线连续运行48h无故障", "12名操作员考核通过", "工艺参数固化"], result: "待执行" },
    dataFlow: [{ from: "FieldEngineerDashboard", to: "电气工程师工作台", data: "现场参数 → PLC最终版本" }],
    kpis: [{ label: "连续运行", value: "-", target: "≥48h" }],
  },
  {
    id: "M11", name: "SAT验收", nameEn: "Site Acceptance", duration: "D172-D178", icon: CheckCircle, color: "bg-emerald-600", owner: "杨勇", ownerRole: "调试工程师",
    summary: "蔚来质量部+工程部联合SAT验收。清洁度现场实测,产能达标验证。",
    tasks: [
      { role: "杨勇(现场)", task: "SAT执行:32项验收(客户+GRT联合)", output: "SAT报告", system: "FatSatExecutionDashboard", status: "pending" },
      { role: "金晓锋(远程)", task: "清洁度远程指导+数据审核", output: "清洁度确认", system: "质量工程师工作台", status: "pending" },
      { role: "戴晓燕(销售)", task: "SAT签字+第三笔30%(¥93万)收款", output: "SAT签字单", system: "销售工作台→签约Tab", status: "pending" },
    ],
    gate: { name: "M11→M12 阶段门: SAT签字", criteria: ["32项SAT全PASS", "产能达标(≥10万台/年)", "客户签字验收", "第三笔¥93万到账"], result: "待执行" },
    dataFlow: [
      { from: "FatSatDashboard", to: "项目经理工作台", data: "SAT PASS → 项目交付" },
      { from: "销售工作台", to: "财务系统", data: "SAT签字 → 收款¥93万" },
    ],
    kpis: [{ label: "SAT通过率", value: "-", target: "100%" }, { label: "累计回款", value: "-", target: "90%" }],
  },
  {
    id: "M12", name: "项目结项", nameEn: "Closure", duration: "D178-D180", icon: Star, color: "bg-rose-600", owner: "焦斌", ownerRole: "项目经理",
    summary: "项目复盘+知识沉淀+保修启动+尾款10%(¥31万)收取。经验写入知识库。",
    tasks: [
      { role: "焦斌(PM)", task: "项目复盘会议(DA全员参加)", output: "复盘报告", system: "项目经理工作台", status: "pending" },
      { role: "焦斌(PM)", task: "成本核算:实际vs预算", output: "成本分析报告", system: "项目经理工作台→预算Tab", status: "pending" },
      { role: "戴晓燕(销售)", task: "尾款10%(¥31万)收取+保修合同", output: "保修启动", system: "销售工作台→签约Tab", status: "pending" },
      { role: "全员", task: "知识沉淀:设计模板+工艺参数+问题库", output: "知识库更新", system: "知识管理系统", status: "pending" },
    ],
    gate: { name: "M12 结项: 项目关闭", criteria: ["尾款到账", "保修合同签署", "复盘报告归档", "知识库更新"], result: "待执行" },
    dataFlow: [
      { from: "项目经理工作台", to: "知识库", data: "复盘经验 → 模板化" },
      { from: "销售工作台", to: "售后系统", data: "保修合同 → 保修期跟踪" },
    ],
    kpis: [{ label: "毛利率", value: "-", target: "≥25%" }, { label: "客户满意度", value: "-", target: "≥90分" }],
  },
];

// ═══════════════════════════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════════════════════════

export default function ProjectLifecycleDemo() {
  const { language } = useLanguage();
  const [currentPhase, setCurrentPhase] = useState(0);
  const phase = PHASES[currentPhase];

  const TASK_STATUS_ICON = { done: CheckCircle, active: Clock, pending: Clock };
  const TASK_STATUS_COLOR = { done: "text-green-500", active: "text-blue-500 animate-pulse", pending: "text-gray-300" };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Milestone className="h-7 w-7 text-rose-600" />
            {language === "zh" ? "项目全生命周期实战" : "Project Lifecycle Walkthrough"}
          </h1>
          <p className="text-muted-foreground">{PROJECT.name} · {PROJECT.code} · ¥{(PROJECT.budget / 10000).toFixed(0)}万 · {PROJECT.duration}天 · PM: {PROJECT.pm}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white text-sm px-3 py-1">{phase.id} {phase.name}</Badge>
          <span className="text-sm text-muted-foreground">{currentPhase + 1}/13</span>
        </div>
      </div>

      {/* Phase Timeline */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-0.5">
            {PHASES.map((p, i) => (
              <button key={p.id} onClick={() => setCurrentPhase(i)}
                className={`flex-1 h-9 flex items-center justify-center text-[10px] font-bold rounded-sm transition-all cursor-pointer
                  ${i < currentPhase ? "bg-green-500 text-white" : i === currentPhase ? `${p.color} text-white ring-2 ring-offset-1 ring-blue-400 scale-105` : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                {p.id}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-muted-foreground">{language === "zh" ? "概念" : "Concept"}</span>
            <span className="text-[10px] text-muted-foreground">{language === "zh" ? "设计" : "Design"}</span>
            <span className="text-[10px] text-muted-foreground">{language === "zh" ? "验证" : "Validation"}</span>
            <span className="text-[10px] text-muted-foreground">{language === "zh" ? "交付" : "Delivery"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentPhase === 0} onClick={() => setCurrentPhase(currentPhase - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />{language === "zh" ? "上一阶段" : "Previous"}
        </Button>
        <div className="text-center">
          <div className="flex items-center gap-2">
            <phase.icon className="h-6 w-6" />
            <span className="text-xl font-bold">{phase.id} — {phase.name}</span>
            <Badge variant="outline">{phase.nameEn}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{phase.duration} · {language === "zh" ? "负责人:" : "Owner:"} {phase.owner}({phase.ownerRole})</p>
        </div>
        <Button variant="outline" disabled={currentPhase === PHASES.length - 1} onClick={() => setCurrentPhase(currentPhase + 1)}>
          {language === "zh" ? "下一阶段" : "Next"}<ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Phase Summary */}
      <Card className={`border-l-4 ${phase.color.replace("bg-", "border-l-")}`}>
        <CardContent className="p-4">
          <p className="text-base">{phase.summary}</p>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />{language === "zh" ? "角色任务清单" : "Role Task List"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {phase.tasks.map((t, i) => {
                const Icon = TASK_STATUS_ICON[t.status];
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${t.status === "active" ? "bg-blue-50 border-blue-200" : t.status === "done" ? "bg-green-50/50 border-green-200" : "bg-gray-50"}`}>
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${TASK_STATUS_COLOR[t.status]}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px] font-bold">{t.role}</Badge>
                        <span className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.task}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{language === "zh" ? "交付:" : "Output:"} <span className="text-foreground">{t.output}</span></span>
                        <span>→ <span className="text-blue-600">{t.system}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Gate Review */}
          <Card className="border-2 border-dashed border-amber-300 bg-amber-50/30">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" />{phase.gate.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {phase.gate.criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {currentPhase <= 5 ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <Clock className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                    <span>{c}</span>
                  </div>
                ))}
              </div>
              <Badge className={phase.gate.result.includes("PASS") ? "bg-green-600 text-white" : phase.gate.result.includes("进行中") ? "bg-blue-600 text-white" : "bg-gray-400 text-white"}>
                {phase.gate.result}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Right: Data Flow + KPIs + DA Team */}
        <div className="space-y-4">
          {/* Data Flow */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" />{language === "zh" ? "数据流转" : "Data Flow"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {phase.dataFlow.map((df, i) => (
                <div key={i} className="text-xs p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="flex items-center gap-1 text-blue-700 font-medium">
                    <span>{df.from}</span><ArrowRight className="h-3 w-3" /><span>{df.to}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{df.data}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />KPI</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {phase.kpis.map((kpi, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{kpi.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{kpi.value}</span>
                    <Badge variant="outline" className="text-[10px]">{language === "zh" ? "目标" : "Target"}: {kpi.target}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* DA Team */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />DA {language === "zh" ? "团队" : "Team"}</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {DA_TEAM.map(da => {
                const isActive = da.phases.includes(phase.id);
                return (
                  <div key={da.code} className={`flex items-center gap-2 p-1.5 rounded text-sm ${isActive ? "bg-blue-50 font-medium" : "text-muted-foreground"}`}>
                    <div className={`w-2 h-2 rounded-full ${isActive ? da.color : "bg-gray-300"}`} />
                    <da.icon className={`h-3.5 w-3.5 ${isActive ? "" : "opacity-30"}`} />
                    <span>{da.name}</span>
                    <span className="text-[10px]">({da.role})</span>
                    {isActive && <Badge className="ml-auto text-[9px] h-4 bg-blue-600">{language === "zh" ? "当前" : "Active"}</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
