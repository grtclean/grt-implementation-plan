import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ScrollText, FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Users, BarChart3, GitBranch, ChevronDown, ChevronRight, Plus,
  BookOpen, Shield, Edit, Eye, Calendar, Flag, Bell, Search,
  Check, RefreshCw, XCircle,
} from "lucide-react";

// ─── demo: Department list ────────────────────────────────────────────────────
const DEPARTMENTS = [
  "总裁办", "事业部", "AI数智部", "财务部", "人事行政部",
  "质量部", "生产部", "研发部", "采购部", "仓库物流部",
]; // demo

// ─── demo: Procedure types ────────────────────────────────────────────────────
const PROC_TYPES = ["核心流程", "规章制度", "合规要求", "异常处理"] as const; // demo
type ProcType = typeof PROC_TYPES[number];

// ─── demo: Compliance heatmap data (department × type → rate%) ────────────────
const COMPLIANCE_RATES: Record<string, Record<ProcType, number>> = {
  "总裁办":    { "核心流程": 98, "规章制度": 100, "合规要求": 97, "异常处理": 95 },
  "事业部":    { "核心流程": 92, "规章制度": 88,  "合规要求": 91, "异常处理": 79 },
  "AI数智部":  { "核心流程": 95, "规章制度": 96,  "合规要求": 98, "异常处理": 94 },
  "财务部":    { "核心流程": 99, "规章制度": 100, "合规要求": 100,"异常处理": 97 },
  "人事行政部":{ "核心流程": 96, "规章制度": 97,  "合规要求": 95, "异常处理": 88 },
  "质量部":    { "核心流程": 94, "规章制度": 92,  "合规要求": 97, "异常处理": 85 },
  "生产部":    { "核心流程": 82, "规章制度": 80,  "合规要求": 78, "异常处理": 65 },
  "研发部":    { "核心流程": 90, "规章制度": 87,  "合规要求": 93, "异常处理": 83 },
  "采购部":    { "核心流程": 85, "规章制度": 83,  "合规要求": 89, "异常处理": 72 },
  "仓库物流部":{ "核心流程": 78, "规章制度": 75,  "合规要求": 80, "异常处理": 58 },
}; // demo

function complianceColor(rate: number) {
  if (rate >= 95) return "bg-green-100 text-green-800";
  if (rate >= 80) return "bg-blue-100 text-blue-800";
  if (rate >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

// ─── 编号规则说明 ─────────────────────────────────────────────────────────────
// 编号格式: GRT-{部门代码}-{三位顺序号}
// 部门代码: OA=总裁办, BU=事业部, AI=AI数智部, FIN=财务部, HR=人事行政部,
//          QA=质量部, MFG=生产部, RND=研发部, PUR=采购部, WH=仓库物流部
// 顺序号: 每个部门独立编号，从 001 开始递增
// 示例: GRT-FIN-001 = 财务部第1号制度

const DEPT_CODE_MAP: Record<string, string> = {
  "总裁办": "OA", "事业部": "BU", "AI数智部": "AI", "财务部": "FIN",
  "人事行政部": "HR", "质量部": "QA", "生产部": "MFG", "研发部": "RND",
  "采购部": "PUR", "仓库物流部": "WH",
};

// ─── Procedures list with full content ────────────────────────────────────────
interface Procedure {
  id: string;
  code: string;
  title: string;
  department: string;
  type: ProcType;
  status: "draft" | "effective" | "archived";
  version: string;
  owner: string;
  effectiveDate: string;
  ackProgress: number; // 0-100
  summary: string;
  penaltyRules: string;
  /** 完整程序性文件正文（Markdown 格式） */
  content: string;
}

const PROCEDURES: Procedure[] = [
  {
    id: "P001", code: "GRT-OA-001", title: "公文管理及用印规范", department: "总裁办", type: "核心流程", status: "effective", version: "V2.1", owner: "倪亚东", effectiveDate: "2025-01-01", ackProgress: 97,
    summary: "规范公文起草、审批、用印及归档流程，确保公司对外文件的合规性与一致性。",
    penaltyRules: "未按规程用印，首次警告；二次以上记过处分。",
    content: `1. 目的
规范公司公文的起草、审批、签发、用印及归档流程，确保对外文件的合法性、合规性与一致性，防止印章滥用和文件管理混乱。

2. 适用范围
适用于杰瑞德自动化公司（GRT）全体员工、各部门在日常经营活动中涉及的所有公文和用印行为。

3. 职责
3.1 总裁办：负责公文管理制度的制定、修订和监督执行；负责公司印章的保管、使用登记和年度盘点。
3.2 各部门负责人：负责本部门公文的审核，确保内容准确、格式规范。
3.3 总经理/授权人：负责重要公文的最终签发审批。

4. 公文起草规范
4.1 公文应使用公司统一模板（OA系统中下载），标题格式为："关于XXX的通知/决定/请示/报告"。
4.2 正文应包含：背景说明、具体事项、执行要求、生效日期。
4.3 涉及数据引用的，须注明数据来源和统计口径。

5. 审批流程
5.1 内部通知类：部门负责人审批 → 总裁办备案。
5.2 对外函件类：部门负责人审批 → 总裁办审核 → 总经理签批。
5.3 合同/协议类：部门负责人 → 法务审核 → 财务确认 → 总经理签批。

6. 用印管理
6.1 用印须填写《用印申请表》，注明用途、份数、用印类型。
6.2 公章使用须双人在场（保管人+申请人），逐笔登记。
6.3 严禁在空白纸张、空白合同上盖章。
6.4 外带印章须经总经理批准，24小时内归还。

7. 归档要求
7.1 所有签发公文须在 3 个工作日内上传 OA 系统归档。
7.2 纸质原件交总裁办统一保管，保存期限不少于 5 年。

8. 违规处理
8.1 未按规程用印：首次书面警告，二次以上记过处分。
8.2 伪造、私刻印章：立即解除劳动合同，保留法律追诉权利。
8.3 公文内容失实造成损失的，追究起草人和审批人连带责任。`,
  },
  {
    id: "P002", code: "GRT-BU-001", title: "项目立项及里程碑管理", department: "事业部", type: "核心流程", status: "effective", version: "V3.0", owner: "周辉", effectiveDate: "2025-03-01", ackProgress: 88,
    summary: "明确项目从立项申请、评审、资源分配到各阶段里程碑验收的完整管理流程。",
    penaltyRules: "里程碑未按时汇报，项目经理绩效扣减5分/次。",
    content: `1. 目的
建立项目从立项、执行到验收的全生命周期管理规范，确保项目目标明确、资源合理分配、进度可控。

2. 适用范围
适用于 GRT 公司所有客户项目、内部项目及研发项目的立项与执行管理。

3. 职责
3.1 项目经理：负责编制立项申请、制定里程碑计划、按时汇报进度。
3.2 事业部总经理：负责项目立项评审和资源分配审批。
3.3 PMO：负责项目管理标准的维护、跨项目资源协调和绩效统计。

4. 立项流程
4.1 项目经理在系统中提交《项目立项申请书》，内容包括：项目背景、目标、预算、工期、风险评估。
4.2 PMO 初审（2个工作日内）→ 事业部评审会（每周三） → 总经理审批（金额≥50万元）。
4.3 立项通过后，系统自动分配项目编号（格式：PRJ-{年份}{月份}-{序号}）。

5. 里程碑管理
5.1 标准里程碑节点（M0-M12）：
  - M0: 立项启动  M1: 技术方案确认  M2: 设计评审  M3: 样品/原型完成
  - M4: 测试验证  M5: 小批量试产  M6: 量产导入  M7-M12: 交付与运维
5.2 每个里程碑须提交验收报告，包含：完成情况、质量指标、成本偏差、风险更新。
5.3 里程碑延期超过 5 个工作日须提交《延期申请》，说明原因和补救措施。

6. 进度汇报
6.1 项目经理每周五 17:00 前在系统提交周报。
6.2 红色项目（进度偏差>10%或成本偏差>15%）须每日汇报，直至恢复绿色。
6.3 月度项目评审会由 PMO 组织，全体项目经理参加。

7. 违规处理
7.1 里程碑未按时汇报：项目经理绩效扣减 5 分/次。
7.2 连续 2 个月为红色项目且无有效改善：项目经理降级处理。
7.3 虚报项目进度或隐瞒风险：记过处分，取消年度评优资格。`,
  },
  {
    id: "P003", code: "GRT-AI-001", title: "AI模型上线审批流程", department: "AI数智部", type: "合规要求", status: "effective", version: "V1.2", owner: "倪微薇", effectiveDate: "2025-06-01", ackProgress: 96,
    summary: "规定AI算法模型在生产环境部署前必须通过数据安全、模型性能、伦理合规三重审批。",
    penaltyRules: "未经审批擅自上线，取消当月绩效奖金。",
    content: `1. 目的
规范 AI 算法模型从开发到生产部署的审批流程，确保模型安全、可靠、合规，防范数据泄露和算法偏见风险。

2. 适用范围
适用于 GRT 公司所有使用人工智能、机器学习技术的系统、产品和服务。

3. 审批三重关
3.1 第一关 — 数据安全审查（由信息安全负责人签字）
  a) 训练数据是否经过脱敏处理
  b) 是否涉及客户隐私数据（姓名、身份证、银行卡等）
  c) 数据存储和传输是否符合等保三级要求
3.2 第二关 — 模型性能验证（由技术负责人签字）
  a) 模型准确率/召回率是否达到上线阈值（准确率≥95%）
  b) 推理延迟是否满足 SLA（P99 ≤ 200ms）
  c) 压力测试是否通过（10倍峰值流量持续30分钟无降级）
3.3 第三关 — 伦理合规审查（由合规负责人签字）
  a) 模型是否存在性别、年龄、地域等偏见
  b) 决策过程是否可解释
  c) 是否配备人工复核机制

4. 上线流程
4.1 开发完成 → 提交《AI模型上线申请表》→ 三重审查（并行，5个工作日内完成）
4.2 三方均通过 → 灰度发布（5%流量，持续3天）→ 全量发布
4.3 任一环节未通过 → 退回整改 → 重新提交

5. 监控与回滚
5.1 上线后 72 小时为观察期，出现异常自动回滚。
5.2 每月输出模型健康报告，准确率下降超过 3% 须触发重新评估。

6. 违规处理
6.1 未经审批擅自上线 AI 模型：取消当月绩效奖金，限期整改。
6.2 因审查疏漏导致数据泄露：审查责任人连带处分。
6.3 故意规避审查流程：记大过一次，取消年度评优资格。`,
  },
  {
    id: "P004", code: "GRT-FIN-001", title: "费用报销管理制度", department: "财务部", type: "规章制度", status: "effective", version: "V4.0", owner: "黄晓兰", effectiveDate: "2024-07-01", ackProgress: 100,
    summary: "规定各类费用报销的申请条件、审批权限、凭证要求及时限，杜绝虚假报销。",
    penaltyRules: "虚假报销按金额3倍追缴，并予以处分。",
    content: `1. 目的
规范公司各类费用报销的申请、审批和支付流程，确保费用支出合理、合规、可追溯，防范财务风险。

2. 适用范围
适用于 GRT 公司全体员工在履行工作职责过程中发生的各类费用报销。

3. 费用类别及标准
3.1 差旅费：
  a) 交通：高铁二等座/经济舱（部门经理及以上可商务座/商务舱）
  b) 住宿：一线城市 ≤500元/晚，二线 ≤350元/晚，三线 ≤250元/晚
  c) 餐饮补贴：100元/天（无需发票）
3.2 招待费：须提前审批，单次 ≤2000元部门经理审批，>2000元总经理审批
3.3 办公用品：统一由行政部采购，个人采购须特殊审批
3.4 培训费：须纳入年度培训计划，临时培训须部门总监审批

4. 报销流程
4.1 员工在费用发生后 30 个自然日内通过 OA 系统提交报销申请。
4.2 附件要求：正规发票原件（电子发票可打印）、消费明细、审批单据。
4.3 审批路径：直属上级 → 部门负责人 → 财务审核 → 出纳付款。
4.4 金额 ≥10,000 元须总经理加签。

5. 时限要求
5.1 审批人须在 3 个工作日内完成审批，超时系统自动提醒。
5.2 财务审核通过后 5 个工作日内完成付款（每周二、四为付款日）。
5.3 超过 90 天未报销的费用，原则上不予受理（特殊情况须总经理批准）。

6. 违规处理
6.1 虚假报销：按金额 3 倍追缴，给予记过处分；金额 ≥5000元，解除劳动合同。
6.2 发票不合规：退回补正，3次以上暂停报销资格1个月。
6.3 超标准报销：超出部分个人承担，审批人连带责任。`,
  },
  {
    id: "P005", code: "GRT-HR-001", title: "员工入职及试用期管理", department: "人事行政部", type: "核心流程", status: "effective", version: "V2.3", owner: "沙建梅", effectiveDate: "2025-02-01", ackProgress: 95,
    summary: "明确新员工入职手续、岗位培训、试用期考核及转正流程。",
    penaltyRules: "未完成入职培训即上岗，责任部门负责人警告处分。",
    content: `1. 目的
规范新员工从入职到转正的全流程管理，确保员工快速融入团队、胜任岗位，同时保障公司用工合规。

2. 适用范围
适用于 GRT 公司所有新入职员工（含正式员工、实习生、劳务派遣）。

3. 入职手续
3.1 入职前 — HR 发送 Offer 及入职通知，员工准备：
  a) 身份证原件及复印件
  b) 学历/学位证书原件
  c) 前单位离职证明
  d) 体检报告（三个月内有效）
  e) 银行卡信息（工资发放用）
3.2 入职当天 — HR 办理：
  a) 签订劳动合同（一式两份）
  b) 录入人事系统、分配工号
  c) 发放工牌、门禁卡、办公用品
  d) 安排工位、开通系统账号

4. 入职培训（必修）
4.1 公司文化与规章制度培训（第1天，HR主讲）
4.2 信息安全与保密培训（第1天，IT部门主讲）
4.3 岗位技能培训（第1-2周，部门导师负责）
4.4 安全生产培训（生产岗位必修，上岗前完成）
4.5 所有培训须在 OA 系统中确认签到，考核通过后方可独立上岗。

5. 试用期管理
5.1 试用期一般为 3 个月（合同期≥3年的岗位可延长至6个月）。
5.2 入职 1 个月时进行首次面谈，由直属上级完成。
5.3 转正前 2 周提交《试用期考核表》，评估维度：工作能力、态度、团队协作、学习成长。
5.4 考核评分 ≥80 分准予转正；60-79 分延长试用期1个月；<60 分不予转正。

6. 违规处理
6.1 未完成入职培训即安排上岗：责任部门负责人书面警告。
6.2 入职材料造假：立即解除劳动合同，不予经济补偿。
6.3 试用期考核弄虚作假：考核作废，重新评估。`,
  },
  {
    id: "P006", code: "GRT-QA-001", title: "产品质量异常处理规程", department: "质量部", type: "异常处理", status: "effective", version: "V1.5", owner: "张洵", effectiveDate: "2025-01-15", ackProgress: 85,
    summary: "规定质量异常的识别、上报、8D分析、改善验证及关闭的标准操作程序。",
    penaltyRules: "漏报或迟报质量异常，相关责任人扣绩效10分。",
    content: `1. 目的
建立质量异常的快速响应和闭环处理机制，确保异常被及时发现、有效遏制、彻底解决并防止再发。

2. 适用范围
适用于 GRT 公司生产过程、来料检验、成品检验及客户投诉中发现的所有质量异常。

3. 异常分级
3.1 A级（重大）：影响产品安全、导致批量报废或客户停线，须 2 小时内上报总经理。
3.2 B级（严重）：影响产品性能或外观、可能导致客户投诉，须 4 小时内上报质量总监。
3.3 C级（轻微）：不影响使用但偏离标准，须 24 小时内记录并启动改善。

4. 处理流程（8D方法）
4.1 D0 — 异常发现：发现人填写《质量异常报告单》，注明产品型号、批次、数量、异常描述。
4.2 D1 — 组建团队：质量工程师在 4 小时内指定责任团队（含研发、生产、质量代表）。
4.3 D2 — 问题描述：5W2H 方法详细描述问题（What/Where/When/Who/Why/How/How many）。
4.4 D3 — 临时措施：24 小时内实施遏制措施（隔离、筛选、通知客户）。
4.5 D4 — 根因分析：使用鱼骨图+5Why 分析法找到根本原因。
4.6 D5 — 纠正措施：制定并实施永久纠正措施，明确责任人和完成日期。
4.7 D6 — 效果验证：连续 3 个批次无复发，验证合格。
4.8 D7 — 预防措施：更新 FMEA/控制计划，举一反三到类似产品和工序。
4.9 D8 — 关闭：质量总监审批关闭，团队表彰。

5. 时限要求
5.1 A级异常：48 小时内完成 D3，10 个工作日内完成 D5-D8。
5.2 B级异常：72 小时内完成 D3，15 个工作日内完成全部步骤。
5.3 C级异常：5 个工作日内完成全部步骤。

6. 违规处理
6.1 漏报或迟报质量异常：相关责任人扣绩效 10 分/次。
6.2 伪造检验数据：立即停岗调查，记大过处分。
6.3 未按时限关闭异常且无合理说明：部门月度质量 KPI 扣减 5 分。`,
  },
  {
    id: "P007", code: "GRT-MFG-001", title: "生产安全操作规程", department: "生产部", type: "合规要求", status: "effective", version: "V5.0", owner: "韩保程", effectiveDate: "2024-04-01", ackProgress: 80,
    summary: "规定生产现场安全操作标准、防护装备使用要求及紧急事故处置程序。",
    penaltyRules: "违反安全规程，依情节轻重给予警告至停岗处理。",
    content: `1. 目的
保障生产现场人员安全和设备安全，预防生产事故，建立安全操作标准和应急处置程序。

2. 适用范围
适用于 GRT 公司所有生产车间、仓库、实验室等作业场所的全体人员（含外来人员）。

3. 个人防护装备（PPE）要求
3.1 生产车间：工作服、安全鞋、护目镜（必须）
3.2 化学品区域：防化手套、防护面罩、耐酸碱围裙（额外）
3.3 高空作业（≥2米）：安全带、安全帽（额外）
3.4 噪音区域（≥85dB）：耳塞或耳罩（额外）

4. 设备操作规范
4.1 操作前：检查设备状态、安全装置是否正常，确认无异常后方可启动。
4.2 操作中：严禁擅自拆除安全防护装置；禁止戴手套操作旋转设备。
4.3 操作后：关闭电源、清理工位、填写设备运行记录。
4.4 维修保养：须挂牌上锁（LOTO），经确认断电后方可作业。

5. 特殊工种管理
5.1 电工、焊工、叉车驾驶等特殊工种须持证上岗，证书年审不得过期。
5.2 新入职特殊工种须在老带新指导下操作满 40 小时后方可独立作业。

6. 应急处置
6.1 火灾：按下最近火灾报警按钮 → 使用灭火器初期扑救 → 拨打 119 → 撤离至集合点。
6.2 化学品泄漏：佩戴防护装备 → 使用吸附材料围堵 → 通知 EHS 负责人。
6.3 人身伤害：立即呼叫急救 → 进行现场急救 → 送医 → 24小时内报工伤。
6.4 每半年组织一次应急演练，全员参加，缺席者须补训。

7. 违规处理
7.1 未佩戴 PPE 进入生产区域：首次口头警告，二次书面警告。
7.2 违章操作设备：立即停岗培训，考核合格后方可复岗。
7.3 造成安全事故：视情节给予记过至解除合同处分，涉嫌犯罪的移交司法机关。`,
  },
  {
    id: "P008", code: "GRT-RND-001", title: "设计变更控制程序", department: "研发部", type: "核心流程", status: "effective", version: "V2.0", owner: "曹庆伟", effectiveDate: "2025-04-01", ackProgress: 90,
    summary: "规范产品设计变更的提出、评估、审批、实施及验证全流程，确保工程更改受控。",
    penaltyRules: "未经ECO审批擅自变更设计，责任人记大过一次。",
    content: `1. 目的
建立设计变更的受控管理流程，确保每一项工程更改都经过充分评估、正式审批、有效实施和验证确认。

2. 适用范围
适用于 GRT 公司所有产品的设计变更，包括图纸、BOM、工艺、材料、软件等方面的更改。

3. 变更分类
3.1 ECR（工程变更请求）：提出变更需求，说明原因和预期效果。
3.2 ECO（工程变更指令）：经评审通过后，正式下达变更执行指令。
3.3 ECN（工程变更通知）：变更实施完成后，通知所有相关方。

4. 变更流程
4.1 提出 ECR：任何人可在 PLM 系统中提交 ECR，须包含：
  a) 变更原因（质量改善/成本优化/客户要求/法规合规）
  b) 变更内容描述（before vs. after）
  c) 受影响的零部件清单
4.2 影响评估（5个工作日内）：
  a) 技术影响：性能、可靠性、互换性
  b) 成本影响：模具、材料、工时
  c) 库存影响：在制品、成品、原材料
  d) 供应链影响：供应商、交期
4.3 评审会议：由研发总监主持，生产、质量、采购、项目经理参加。
4.4 审批：
  - A类变更（影响产品安全/性能/互换性）：总经理审批
  - B类变更（不影响性能，优化类）：研发总监审批
  - C类变更（文档修正、标注调整）：项目经理审批
4.5 执行 ECO：更新图纸、BOM、工艺文件，通知生产和仓库切换。
4.6 验证：首件检验合格后，发布 ECN，归档全部变更文件。

5. 编号规则
ECR/ECO/ECN 编号格式：{类型}-{年份}-{四位序号}，例如 ECO-2026-0042。

6. 违规处理
6.1 未经 ECO 审批擅自变更设计或工艺：责任人记大过一次。
6.2 变更评估遗漏导致批量问题：评估团队负连带责任。
6.3 变更文件未及时更新：责任人扣绩效 5 分/次。`,
  },
  {
    id: "P009", code: "GRT-PUR-001", title: "供应商准入及评估管理", department: "采购部", type: "规章制度", status: "effective", version: "V3.1", owner: "沈迎凤", effectiveDate: "2025-05-01", ackProgress: 83,
    summary: "规定新供应商资质审核、样品认可、年度评分及淘汰机制，保障供应链质量。",
    penaltyRules: "绕过准入流程采购，取消采购人员当月采购佣金。",
    content: `1. 目的
建立供应商全生命周期管理机制，确保供应商的质量、交期和服务能力满足公司要求。

2. 适用范围
适用于 GRT 公司所有生产性物料和关键非生产性物料的供应商管理。

3. 供应商准入流程
3.1 初筛：采购提供候选供应商基本信息，质量部进行资质预审（营业执照、体系认证、行业口碑）。
3.2 现场审核：质量+采购+技术组成审核小组，按《供应商审核检查表》进行现场评估，评分≥70分通过。
3.3 样品认可：供应商提供 PPAP 文件和样品，经 IQC 检验和试装验证合格。
3.4 小批量试用：3个批次小批量供货，合格率≥98% 方可列入合格供应商名录（AVL）。

4. 供应商分级
4.1 A级（战略供应商）：年评分≥90，优先分配订单，参与新产品开发。
4.2 B级（优选供应商）：年评分 75-89，正常供货。
4.3 C级（观察供应商）：年评分 60-74，限期整改，减少订单份额。
4.4 D级（淘汰供应商）：年评分<60 或发生重大质量事故，启动退出机制。

5. 年度评估维度
5.1 质量（40%）：来料合格率、客户投诉关联次数。
5.2 交期（25%）：准时交付率、紧急订单响应时间。
5.3 价格（20%）：价格竞争力、年度降本配合度。
5.4 服务（15%）：异常响应速度、技术支持能力。

6. 违规处理
6.1 绕过准入流程直接采购：取消采购人员当月佣金，相关订单追溯审查。
6.2 供应商行贿/回扣：立即终止合作，涉事采购人员解除合同，移交司法。
6.3 年度评估中弄虚作假：评估作废，重新评估，责任人记过处分。`,
  },
  {
    id: "P010", code: "GRT-WH-001", title: "物料出入库管理规范", department: "仓库物流部", type: "核心流程", status: "effective", version: "V2.2", owner: "李新正", effectiveDate: "2024-11-01", ackProgress: 75,
    summary: "明确物料接收、检验、存储、发料、退料及盘点的操作标准和系统录入要求。",
    penaltyRules: "账实不符，责任人扣绩效5分/次，累计3次以上降级处理。",
    content: `1. 目的
规范仓库物料管理全流程，确保账、卡、物一致，降低库存损耗和呆滞风险。

2. 适用范围
适用于 GRT 公司所有仓库（原材料库、半成品库、成品库、工具库）的物料管理。

3. 入库管理
3.1 收货：仓库收到物料后核对《送货单》与《采购订单》，品名、数量、规格须一致。
3.2 IQC检验：将来料送检验区，IQC 按 AQL 抽检标准进行检验。
3.3 入库上架：检验合格品按库位编码规则存放，在 ERP 系统中录入入库信息。
3.4 不合格品：标识红色标签，隔离存放于不合格品区，通知采购处理。

4. 出库管理
4.1 领料：生产部门凭系统审批通过的《领料单》到仓库领料。
4.2 先进先出（FIFO）：出库时须遵循先进先出原则，防止物料过期。
4.3 系统操作：出库后即时在 ERP 中扣减库存，不允许事后补录。

5. 退料管理
5.1 生产退料：填写《退料单》注明原因，经主管审批后退回仓库。
5.2 退回物料须经质量确认：合格品回库位，不合格品进隔离区。

6. 盘点管理
6.1 日盘点：高价值物料（A类）每日循环盘点。
6.2 月盘点：全仓库月末盘点，出具盘点差异报告。
6.3 年度大盘点：每年 12 月由财务主导，仓库配合，全面清查。
6.4 盘点差异率要求：A类物料 ≤0.1%，B类 ≤0.5%，C类 ≤1.0%。

7. 违规处理
7.1 账实不符：责任人扣绩效 5 分/次，累计 3 次以上降级处理。
7.2 不按 FIFO 出库导致物料过期：仓管员承担损失的 20%。
7.3 私自挪用或调换物料：记大过处分，情节严重者解除合同。`,
  },
  {
    id: "P011", code: "GRT-HR-002", title: "薪酬保密管理规定", department: "人事行政部", type: "规章制度", status: "effective", version: "V1.0", owner: "沙建梅", effectiveDate: "2025-08-01", ackProgress: 92,
    summary: "规定员工薪酬信息的保密义务，禁止相互打探、泄露薪酬数据。",
    penaltyRules: "违反薪酬保密，书面警告；情节严重者解除劳动合同。",
    content: `1. 目的
保护公司薪酬体系的公平性和员工个人隐私，维护内部和谐的工作氛围。

2. 适用范围
适用于 GRT 公司全体员工，包括正式员工、试用期员工、兼职人员。

3. 保密范围
3.1 个人基本工资、绩效工资、奖金、补贴、股权激励等全部薪酬组成。
3.2 薪酬调整记录、晋升加薪幅度。
3.3 他人的薪酬信息（无论通过何种渠道获知）。
3.4 公司薪酬结构表、等级对照表、预算分配表等管理文件。

4. 保密义务
4.1 员工不得主动或被动向任何同事透露自己的薪酬信息。
4.2 员工不得打探、询问、推算他人的薪酬水平。
4.3 管理人员不得向非授权人员透露下属的薪酬信息。
4.4 HR 和财务人员须对薪酬数据实施最小权限访问，离岗时锁屏/锁柜。

5. 薪酬数据管理
5.1 薪酬数据在系统中实施字段级加密，仅限 HR 总监和财务总监查看全量数据。
5.2 工资条通过系统推送至个人，纸质工资条严禁张贴或共享。
5.3 薪酬相关文档标注"机密"水印，打印后须在 24 小时内销毁。

6. 违规处理
6.1 首次违反：书面警告，计入个人档案。
6.2 二次违反：扣除当月绩效奖金的 50%。
6.3 情节严重（如大范围泄露或恶意传播）：解除劳动合同。
6.4 管理人员违反：加重处理，降级或免职。`,
  },
  {
    id: "P012", code: "GRT-AI-002", title: "数据安全与隐私保护规程", department: "AI数智部", type: "合规要求", status: "draft", version: "V0.9", owner: "倪微薇", effectiveDate: "", ackProgress: 0,
    summary: "草拟中：规范公司数据分类分级、访问控制、传输加密及泄露应急处置要求。",
    penaltyRules: "待定",
    content: `（草案，待审批）

1. 目的
规范公司数据资产的分类分级、访问控制、传输加密及泄露应急处置，满足《数据安全法》和《个人信息保护法》要求。

2. 数据分级
2.1 L4 — 绝密：核心算法源码、客户身份证/银行卡信息、薪酬全量数据。
2.2 L3 — 机密：客户合同、财务报表、产品成本结构。
2.3 L2 — 内部：内部通知、会议纪要、培训资料。
2.4 L1 — 公开：官网内容、公开产品资料。

3. 访问控制
3.1 L4 数据：仅限授权名单人员访问，须双因素认证 + 审批日志。
3.2 L3 数据：部门负责人授权，角色级访问控制。
3.3 L2/L1 数据：全员可访问（L2 限内网）。

4. 传输与存储
4.1 L3 及以上数据传输须使用 TLS 1.2+ 加密通道。
4.2 禁止通过个人邮箱、微信等社交工具传输 L3+ 数据。
4.3 数据存储须加密静态数据，密钥由安全团队统一管理。

5. 泄露应急
5.1 发现数据泄露后 30 分钟内报告信息安全负责人。
5.2 2 小时内启动应急响应，评估影响范围。
5.3 涉及个人信息的须在 72 小时内向监管部门报告。

6. 违规处理（待定）
6.1 待合规部门审定后补充。`,
  },
];

// ─── demo: Pending acknowledgements ──────────────────────────────────────────
interface PendingAck {
  id: string;
  title: string;
  department: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  procedureId: string;
}

const PENDING_ACKS: PendingAck[] = [
  { id: "A001", title: "生产安全操作规程 (V5.0)", department: "生产部", priority: "high", deadline: "2026-03-15", procedureId: "P007" },
  { id: "A002", title: "产品质量异常处理规程 (V1.5)", department: "质量部", priority: "high", deadline: "2026-03-16", procedureId: "P006" },
  { id: "A003", title: "项目立项及里程碑管理 (V3.0)", department: "事业部", priority: "medium", deadline: "2026-03-20", procedureId: "P002" },
  { id: "A004", title: "物料出入库管理规范 (V2.2)", department: "仓库物流部", priority: "medium", deadline: "2026-03-22", procedureId: "P010" },
  { id: "A005", title: "供应商准入及评估管理 (V3.1)", department: "采购部", priority: "low", deadline: "2026-03-25", procedureId: "P009" },
  { id: "A006", title: "费用报销管理制度 (V4.0)", department: "财务部", priority: "low", deadline: "2026-03-28", procedureId: "P004" },
  { id: "A007", title: "设计变更控制程序 (V2.0)", department: "研发部", priority: "medium", deadline: "2026-03-18", procedureId: "P008" },
  { id: "A008", title: "薪酬保密管理规定 (V1.0)", department: "人事行政部", priority: "high", deadline: "2026-03-14", procedureId: "P011" },
]; // demo

// ─── demo: Version history ────────────────────────────────────────────────────
interface Version {
  ver: string;
  date: string;
  changeType: "新增" | "修订" | "废止";
  summary: string;
  approver: string;
}

const VERSION_HISTORY: Record<string, Version[]> = {
  "P004": [
    { ver: "V1.0", date: "2020-01-01", changeType: "新增", summary: "初始版本，建立费用报销基本框架", approver: "倪亚东" },
    { ver: "V2.0", date: "2022-07-01", changeType: "修订", summary: "增加差旅费标准，调整审批层级", approver: "黄晓兰" },
    { ver: "V3.0", date: "2023-07-01", changeType: "修订", summary: "引入在线报销流程，取消纸质单据", approver: "倪亚东" },
    { ver: "V4.0", date: "2024-07-01", changeType: "修订", summary: "新增AI自动审核规则，强化反腐条款", approver: "倪亚东" },
  ],
  "P007": [
    { ver: "V1.0", date: "2018-04-01", changeType: "新增", summary: "建立生产安全基本操作规程", approver: "韩保程" },
    { ver: "V2.0", date: "2020-06-01", changeType: "修订", summary: "加入半导体清洗设备特殊安全要求", approver: "倪亚东" },
    { ver: "V3.0", date: "2021-09-01", changeType: "修订", summary: "引入5S管理要求，更新急救流程", approver: "金晓锋" },
    { ver: "V4.0", date: "2023-01-15", changeType: "修订", summary: "新增UWB定位安全预警联动规则", approver: "韩保程" },
    { ver: "V5.0", date: "2024-04-01", changeType: "修订", summary: "全面升级符合IATF16949安全附录要求", approver: "倪亚东" },
  ],
  "P008": [
    { ver: "V1.0", date: "2023-01-01", changeType: "新增", summary: "建立初版设计变更管理体系", approver: "曹庆伟" },
    { ver: "V2.0", date: "2025-04-01", changeType: "修订", summary: "引入PLM系统联动，增加成本影响评估模块", approver: "倪亚东" },
  ],
}; // demo

// ─── demo: Exception records ──────────────────────────────────────────────────
interface ExceptionRecord {
  id: string;
  title: string;
  procedureCode: string;
  department: string;
  severity: "minor" | "major" | "critical";
  status: "待处理" | "调查中" | "已解决" | "已关闭";
  reportedBy: string;
  reportedDate: string;
  description: string;
}

const EXCEPTIONS: ExceptionRecord[] = [
  { id: "E001", title: "仓库未按规程执行实物盘点", procedureCode: "GRT-WH-001", department: "仓库物流部", severity: "major", status: "调查中", reportedBy: "张洵", reportedDate: "2026-03-08", description: "3月例行稽查发现B库区连续2周未完成每日进出库系统录入，账实差异率达4.7%。" },
  { id: "E002", title: "采购绕过供应商准入直接下单", procedureCode: "GRT-PUR-001", department: "采购部", severity: "critical", status: "待处理", reportedBy: "倪亚东", reportedDate: "2026-03-10", description: "发现某紧急采购单未经供应商资质审核即完成付款，金额约18万元，涉及一家未注册供应商。" },
  { id: "E003", title: "生产线操作人员未佩戴护目镜", procedureCode: "GRT-MFG-001", department: "生产部", severity: "minor", status: "已解决", reportedBy: "韩保程", reportedDate: "2026-03-05", description: "班前巡检中发现2名操作员在化学清洗液喷淋区域未按规定佩戴防护眼镜，已当场纠正并记录。" },
]; // demo

// ─── demo: KPI linkage data ───────────────────────────────────────────────────
interface KpiLink {
  procedureCode: string;
  procedureTitle: string;
  department: string;
  kpiName: string;
  target: string;
  weight: string;
}

const KPI_LINKS: KpiLink[] = [
  { procedureCode: "GRT-QA-001", procedureTitle: "产品质量异常处理规程", department: "质量部", kpiName: "质量异常关闭及时率", target: "≥95%", weight: "15%" },
  { procedureCode: "GRT-QA-001", procedureTitle: "产品质量异常处理规程", department: "质量部", kpiName: "8D报告完成率", target: "100%", weight: "10%" },
  { procedureCode: "GRT-MFG-001", procedureTitle: "生产安全操作规程", department: "生产部", kpiName: "安全事故次数", target: "0次", weight: "20%" },
  { procedureCode: "GRT-BU-001", procedureTitle: "项目立项及里程碑管理", department: "事业部", kpiName: "里程碑准时完成率", target: "≥90%", weight: "20%" },
  { procedureCode: "GRT-FIN-001", procedureTitle: "费用报销管理制度", department: "财务部", kpiName: "报销差错率", target: "≤0.5%", weight: "10%" },
  { procedureCode: "GRT-PUR-001", procedureTitle: "供应商准入及评估管理", department: "采购部", kpiName: "合格供应商占比", target: "≥85%", weight: "15%" },
  { procedureCode: "GRT-WH-001", procedureTitle: "物料出入库管理规范", department: "仓库物流部", kpiName: "库存账实准确率", target: "≥99%", weight: "20%" },
  { procedureCode: "GRT-HR-001", procedureTitle: "员工入职及试用期管理", department: "人事行政部", kpiName: "试用期转正达标率", target: "≥90%", weight: "10%" },
  { procedureCode: "GRT-RND-001", procedureTitle: "设计变更控制程序", department: "研发部", kpiName: "ECO审批周期", target: "≤5工作日", weight: "15%" },
  { procedureCode: "GRT-AI-001", procedureTitle: "AI模型上线审批流程", department: "AI数智部", kpiName: "模型合规率", target: "100%", weight: "25%" },
]; // demo

// ─── Helper: status/priority/severity badge ───────────────────────────────────
function StatusBadge({ status }: { status: Procedure["status"] }) {
  const map = {
    draft:     { label: "草稿", className: "bg-gray-100 text-gray-600" },
    effective: { label: "生效中", className: "bg-green-100 text-green-700" },
    archived:  { label: "已归档", className: "bg-slate-100 text-slate-500" },
  };
  const { label, className } = map[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function TypeBadge({ type }: { type: ProcType }) {
  const map: Record<ProcType, string> = {
    "核心流程": "bg-blue-100 text-blue-700",
    "规章制度": "bg-purple-100 text-purple-700",
    "合规要求": "bg-orange-100 text-orange-700",
    "异常处理": "bg-red-100 text-red-600",
  };
  return <Badge className={`text-xs ${map[type]}`}>{type}</Badge>;
}

function PriorityBadge({ priority }: { priority: PendingAck["priority"] }) {
  const map = {
    high:   { label: "紧急", className: "bg-red-100 text-red-700" },
    medium: { label: "普通", className: "bg-yellow-100 text-yellow-700" },
    low:    { label: "低",   className: "bg-gray-100 text-gray-500" },
  };
  const { label, className } = map[priority];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function SeverityBadge({ severity }: { severity: ExceptionRecord["severity"] }) {
  const map = {
    minor:    { label: "轻微", className: "bg-gray-100 text-gray-600" },
    major:    { label: "严重", className: "bg-yellow-100 text-yellow-800" },
    critical: { label: "重大", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = map[severity];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function ExStatusBadge({ status }: { status: ExceptionRecord["status"] }) {
  const map: Record<ExceptionRecord["status"], string> = {
    "待处理": "bg-red-100 text-red-700",
    "调查中": "bg-yellow-100 text-yellow-800",
    "已解决": "bg-blue-100 text-blue-700",
    "已关闭": "bg-gray-100 text-gray-500",
  };
  return <Badge className={`text-xs ${map[status]}`}>{status}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DeptProceduresWorkbench() {
  const { t } = useLanguage();

  // Tab 2 filters
  const [deptFilter, setDeptFilter] = useState<string>("全部");
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [statusFilter, setStatusFilter] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProc, setExpandedProc] = useState<string | null>(null);

  // Tab 3 acknowledged set
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  // Track which procedures have been fully read (scrolled to bottom)
  const [fullyRead, setFullyRead] = useState<Set<string>>(new Set());

  // Full-text viewer dialog
  const [viewingProc, setViewingProc] = useState<Procedure | null>(null);
  // Context: "browse" = just reading, "ack" = must read before confirming
  const [viewContext, setViewContext] = useState<"browse" | "ack">("browse");
  // Pending ack ID when viewing in ack context
  const [pendingAckId, setPendingAckId] = useState<string | null>(null);

  // Tab 4 version selector
  const [selectedProcForVersion, setSelectedProcForVersion] = useState("P004");

  // Tab 5 exception dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [newException, setNewException] = useState({ title: "", department: "质量部", severity: "minor", description: "" });

  // Tab 6 kpi dept filter
  const [kpiDeptFilter, setKpiDeptFilter] = useState("全部");

  // Tab 7 editor form
  const [editorForm, setEditorForm] = useState({
    department: "事业部",
    type: "核心流程",
    code: "",
    title: "",
    summary: "",
    content: "",
    priority: "medium",
    roles: "",
    legalBasis: "",
    industryStd: "",
    reviewFreq: "年度",
  });

  // Derived filtered procedures
  const filteredProcedures = PROCEDURES.filter(p => {
    if (deptFilter !== "全部" && p.department !== deptFilter) return false;
    if (typeFilter !== "全部" && p.type !== typeFilter) return false;
    if (statusFilter !== "全部") {
      const map: Record<string, string> = { draft: "草稿", effective: "生效中", archived: "已归档" };
      if (map[p.status] !== statusFilter) return false;
    }
    if (searchQuery && !p.title.includes(searchQuery) && !p.code.includes(searchQuery)) return false;
    return true;
  });

  const pendingCount = PENDING_ACKS.filter(a => !acknowledged.has(a.id)).length;

  // Procedures with version history available
  const versionedProcs = PROCEDURES.filter(p => VERSION_HISTORY[p.id]);

  function handleAck(id: string) {
    setAcknowledged(prev => new Set([...prev, id]));
  }

  function generateCode() {
    const prefix = DEPT_CODE_MAP[editorForm.department] || "XX";
    // 计算该部门现有制度的最大编号，+1
    const existingCodes = PROCEDURES
      .filter(p => p.code.startsWith(`GRT-${prefix}-`))
      .map(p => parseInt(p.code.split("-")[2], 10))
      .filter(n => !isNaN(n));
    const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    setEditorForm(f => ({ ...f, code: `GRT-${prefix}-${String(nextNum).padStart(3, "0")}` }));
  }

  /** Open full-text viewer */
  function openFullText(proc: Procedure, context: "browse" | "ack" = "browse", ackId?: string) {
    setViewingProc(proc);
    setViewContext(context);
    setPendingAckId(ackId ?? null);
  }

  /** Handle scroll-to-bottom detection in the content viewer */
  function handleContentScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!viewingProc) return;
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) {
      setFullyRead(prev => new Set([...prev, viewingProc.id]));
    }
  }

  /** Confirm learning after reading full text */
  function confirmAfterReading() {
    if (pendingAckId) {
      setAcknowledged(prev => new Set([...prev, pendingAckId]));
    }
    setViewingProc(null);
    setPendingAckId(null);
  }

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <ScrollText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">企业制度管理工作台</h1>
          <p className="text-muted-foreground text-sm">
            部门制度 · 合规要求 · 版本管控 · 异常处理 · KPI关联
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">制度总览</TabsTrigger>
          <TabsTrigger value="procedures">部门制度</TabsTrigger>
          <TabsTrigger value="pending">
            待确认
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">版本管理</TabsTrigger>
          <TabsTrigger value="exceptions">异常记录</TabsTrigger>
          <TabsTrigger value="kpi">KPI关联</TabsTrigger>
          <TabsTrigger value="editor">制度编辑</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════
            Tab 1: 制度总览
        ═══════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "制度总数",   value: "73", icon: FileText,     color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "生效中",     value: "73", icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
              { label: "待确认",     value: String(pendingCount), icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "异常记录",   value: "3",  icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50" },
            ].map(card => (
              <Card key={card.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Compliance heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                合规热力图 — 各部门 × 制度类型确认率
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-3 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> ≥95%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> 80–94%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> 60–79%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> &lt;60%</span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">部门</TableHead>
                    {PROC_TYPES.map(t => (
                      <TableHead key={t} className="text-center">{t}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEPARTMENTS.map(dept => (
                    <TableRow key={dept}>
                      <TableCell className="font-medium text-sm">{dept}</TableCell>
                      {PROC_TYPES.map(type => {
                        const rate = COMPLIANCE_RATES[dept][type];
                        return (
                          <TableCell key={type} className="text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${complianceColor(rate)}`}>
                              {rate}%
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 2: 部门制度
        ═══════════════════════════════════════════ */}
        <TabsContent value="procedures" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索制度编号或名称..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部部门</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部类型</SelectItem>
                {PROC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部状态</SelectItem>
                <SelectItem value="草稿">草稿</SelectItem>
                <SelectItem value="生效中">生效中</SelectItem>
                <SelectItem value="已归档">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">共 {filteredProcedures.length} 条制度</p>

          {/* Procedure cards */}
          <div className="space-y-3">
            {filteredProcedures.map(proc => (
              <Card key={proc.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{proc.code}</span>
                        <TypeBadge type={proc.type} />
                        <StatusBadge status={proc.status} />
                        <Badge variant="outline" className="text-xs">{proc.version}</Badge>
                      </div>
                      <CardTitle className="text-base">{proc.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProc(expandedProc === proc.id ? null : proc.id)}
                    >
                      {expandedProc === proc.id
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {proc.department}</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> 负责人: {proc.owner}</span>
                    {proc.effectiveDate && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> 生效: {proc.effectiveDate}</span>
                    )}
                  </div>
                </CardHeader>
                {proc.status === "effective" && (
                  <CardContent className="pt-0 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">确认进度</span>
                      <Progress value={proc.ackProgress} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold">{proc.ackProgress}%</span>
                    </div>
                  </CardContent>
                )}
                {expandedProc === proc.id && (
                  <CardContent className="border-t bg-muted/20 pt-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">制度摘要</p>
                        <p>{proc.summary}</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">违规处理规则</p>
                        <p className="text-red-700 bg-red-50 p-2 rounded text-xs">{proc.penaltyRules}</p>
                      </div>
                      <div className="pt-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openFullText(proc)}>
                          <Eye className="h-3.5 w-3.5" />查看全文
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 3: 待确认
        ═══════════════════════════════════════════ */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-yellow-500" />
                我的待确认制度
                <Badge className="bg-yellow-100 text-yellow-800 ml-1">
                  {pendingCount} 项待处理
                </Badge>
              </CardTitle>
              <CardDescription>请在截止日期前阅读并确认以下制度，确认后不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PENDING_ACKS.map(ack => {
                const done = acknowledged.has(ack.id);
                const proc = PROCEDURES.find(p => p.id === ack.procedureId);
                const hasRead = proc ? fullyRead.has(proc.id) : false;
                return (
                  <div
                    key={ack.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      done ? "border-green-200 bg-green-50/50 opacity-60" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <PriorityBadge priority={ack.priority} />
                        <span className="text-sm font-medium">{ack.title}</span>
                        {!done && hasRead && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700">已阅读</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ack.department}</span>
                        <span className="flex items-center gap-1"><Flag className="h-3 w-3" />截止: {ack.deadline}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!done && proc && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openFullText(proc, "ack", ack.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {hasRead ? "重新阅读" : "阅读全文"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={done ? "outline" : "default"}
                        className={done ? "text-green-600 border-green-300" : ""}
                        disabled={done || !hasRead}
                        onClick={() => handleAck(ack.id)}
                        title={!hasRead && !done ? "请先点击「阅读全文」并阅读到底部" : ""}
                      >
                        {done
                          ? <><Check className="h-3 w-3 mr-1" />已确认</>
                          : <><BookOpen className="h-3 w-3 mr-1" />学习确认</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pendingCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p>所有制度均已确认，感谢您的配合！</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 4: 版本管理
        ═══════════════════════════════════════════ */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-indigo-500" />
                版本历史时间轴
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedProcForVersion} onValueChange={setSelectedProcForVersion}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="选择制度" />
                </SelectTrigger>
                <SelectContent>
                  {versionedProcs.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {VERSION_HISTORY[selectedProcForVersion] && (
                <div className="relative pl-8">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {[...VERSION_HISTORY[selectedProcForVersion]].reverse().map((ver, i) => {
                      const isLatest = i === 0;
                      const typeColor: Record<Version["changeType"], string> = {
                        "新增": "bg-green-100 text-green-700",
                        "修订": "bg-blue-100 text-blue-700",
                        "废止": "bg-red-100 text-red-700",
                      };
                      return (
                        <div key={ver.ver} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-5 w-3 h-3 rounded-full border-2 ${isLatest ? "bg-indigo-500 border-indigo-300" : "bg-white border-border"}`} />
                          <div className={`ml-2 p-3 rounded-lg border ${isLatest ? "border-indigo-200 bg-indigo-50/30" : "bg-card"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-sm">{ver.ver}</span>
                              {isLatest && <Badge className="bg-indigo-100 text-indigo-700 text-xs">当前版本</Badge>}
                              <Badge className={`text-xs ${typeColor[ver.changeType]}`}>{ver.changeType}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{ver.date}</span>
                            </div>
                            <p className="text-sm">{ver.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" />审批人: {ver.approver}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 5: 异常记录
        ═══════════════════════════════════════════ */}
        <TabsContent value="exceptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">制度执行异常记录</h3>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />报告异常
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>报告制度执行异常</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>异常标题</Label>
                    <Input
                      placeholder="简要描述异常情况..."
                      value={newException.title}
                      onChange={e => setNewException(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>所属部门</Label>
                    <Select value={newException.department} onValueChange={v => setNewException(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>严重程度</Label>
                    <Select value={newException.severity} onValueChange={v => setNewException(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">轻微</SelectItem>
                        <SelectItem value="major">严重</SelectItem>
                        <SelectItem value="critical">重大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>详细描述</Label>
                    <Textarea
                      placeholder="请详细描述异常情况、发现时间、涉及人员..."
                      rows={4}
                      value={newException.description}
                      onChange={e => setNewException(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setReportDialogOpen(false)}>取消</Button>
                    <Button onClick={() => setReportDialogOpen(false)}>提交异常</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status pipeline legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>状态流程:</span>
            {["待处理", "调查中", "已解决", "已关闭"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1">
                <Badge className={`text-xs ${
                  s === "待处理" ? "bg-red-100 text-red-700" :
                  s === "调查中" ? "bg-yellow-100 text-yellow-800" :
                  s === "已解决" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{s}</Badge>
                {i < arr.length - 1 && <span>→</span>}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {EXCEPTIONS.map(exc => (
              <Card key={exc.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <SeverityBadge severity={exc.severity} />
                        <ExStatusBadge status={exc.status} />
                        <span className="text-xs font-mono text-muted-foreground">{exc.procedureCode}</span>
                      </div>
                      <CardTitle className="text-base">{exc.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span><Users className="h-3 w-3 inline mr-1" />{exc.department}</span>
                    <span><Shield className="h-3 w-3 inline mr-1" />报告人: {exc.reportedBy}</span>
                    <span><Calendar className="h-3 w-3 inline mr-1" />{exc.reportedDate}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{exc.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 6: KPI关联
        ═══════════════════════════════════════════ */}
        <TabsContent value="kpi" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={kpiDeptFilter} onValueChange={setKpiDeptFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部部门</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              共 {KPI_LINKS.filter(k => kpiDeptFilter === "全部" || k.department === kpiDeptFilter).length} 条关联
            </span>
          </div>

          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>制度编码</TableHead>
                    <TableHead>制度名称</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>KPI指标</TableHead>
                    <TableHead>目标值</TableHead>
                    <TableHead className="text-right">权重</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KPI_LINKS
                    .filter(k => kpiDeptFilter === "全部" || k.department === kpiDeptFilter)
                    .map((k, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{k.procedureCode}</TableCell>
                        <TableCell className="text-sm">{k.procedureTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{k.department}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{k.kpiName}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700 text-xs">{k.target}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{k.weight}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 7: 制度编辑 (for managers)
        ═══════════════════════════════════════════ */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="h-4 w-4 text-indigo-500" />
                制度草案编辑器
              </CardTitle>
              <CardDescription>仅限部门经理及以上职级使用。保存草稿后需提交审批方可生效。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <Label>所属部门 <span className="text-red-500">*</span></Label>
                  <Select value={editorForm.department} onValueChange={v => setEditorForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label>制度类型 <span className="text-red-500">*</span></Label>
                  <Select value={editorForm.type} onValueChange={v => setEditorForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Code (auto-generated) */}
                <div className="space-y-1.5">
                  <Label>制度编码</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="GRT-XX-000"
                      value={editorForm.code}
                      onChange={e => setEditorForm(f => ({ ...f, code: e.target.value }))}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={generateCode}>
                      <RefreshCw className="h-3 w-3 mr-1" />自动生成
                    </Button>
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label>优先级</Label>
                  <Select value={editorForm.priority} onValueChange={v => setEditorForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高优先级</SelectItem>
                      <SelectItem value="medium">普通</SelectItem>
                      <SelectItem value="low">低优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度名称 <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="例：XX部门XX管理规定"
                    value={editorForm.title}
                    onChange={e => setEditorForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Summary */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度摘要</Label>
                  <Textarea
                    placeholder="用2-3句话概括本制度的核心目的和管控范围..."
                    rows={2}
                    value={editorForm.summary}
                    onChange={e => setEditorForm(f => ({ ...f, summary: e.target.value }))}
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度正文 <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="请输入完整制度条款内容。建议使用条款编号（1. 目的；2. 适用范围；3. 职责；4. 具体规定；5. 违规处理）..."
                    rows={8}
                    value={editorForm.content}
                    onChange={e => setEditorForm(f => ({ ...f, content: e.target.value }))}
                  />
                </div>

                {/* Applicable roles */}
                <div className="space-y-1.5">
                  <Label>适用岗位/角色</Label>
                  <Input
                    placeholder="例：全体员工 / 部门经理以上 / 生产操作员"
                    value={editorForm.roles}
                    onChange={e => setEditorForm(f => ({ ...f, roles: e.target.value }))}
                  />
                </div>

                {/* Review frequency */}
                <div className="space-y-1.5">
                  <Label>复审周期</Label>
                  <Select value={editorForm.reviewFreq} onValueChange={v => setEditorForm(f => ({ ...f, reviewFreq: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="季度">季度复审</SelectItem>
                      <SelectItem value="年度">年度复审</SelectItem>
                      <SelectItem value="两年">两年一次</SelectItem>
                      <SelectItem value="事件驱动">事件驱动</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Legal basis */}
                <div className="space-y-1.5">
                  <Label>法律依据</Label>
                  <Input
                    placeholder="例：《劳动合同法》第XX条"
                    value={editorForm.legalBasis}
                    onChange={e => setEditorForm(f => ({ ...f, legalBasis: e.target.value }))}
                  />
                </div>

                {/* Industry standard */}
                <div className="space-y-1.5">
                  <Label>行业标准</Label>
                  <Input
                    placeholder="例：IATF 16949:2016 / ISO 9001:2015"
                    value={editorForm.industryStd}
                    onChange={e => setEditorForm(f => ({ ...f, industryStd: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t mt-4">
                <Button variant="outline" className="gap-1">
                  <BookOpen className="h-4 w-4" />保存草稿
                </Button>
                <Button className="gap-1">
                  <CheckCircle2 className="h-4 w-4" />提交审批
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════
          Full-text Viewer Dialog
      ═══════════════════════════════════════════ */}
      <Dialog open={!!viewingProc} onOpenChange={(open) => { if (!open) { setViewingProc(null); setPendingAckId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{viewingProc?.code}</span>
              {viewingProc && <TypeBadge type={viewingProc.type} />}
              {viewingProc && <StatusBadge status={viewingProc.status} />}
              <Badge variant="outline" className="text-xs">{viewingProc?.version}</Badge>
            </div>
            <DialogTitle className="text-lg">{viewingProc?.title}</DialogTitle>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{viewingProc?.department}</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />负责人: {viewingProc?.owner}</span>
              {viewingProc?.effectiveDate && (
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />生效日期: {viewingProc.effectiveDate}</span>
              )}
            </div>
          </DialogHeader>

          {/* Scrollable content area */}
          <div
            className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 min-h-[300px]"
            onScroll={handleContentScroll}
          >
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {viewingProc?.content.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-3" />;
                // Section headers (e.g., "1. 目的", "3.1 xxx")
                if (/^\d+\.\s/.test(trimmed)) {
                  return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{trimmed}</h3>;
                }
                // Sub-section headers (e.g., "3.1 xxx")
                if (/^\d+\.\d+\s/.test(trimmed)) {
                  return <p key={i} className="font-semibold mt-2 mb-1">{trimmed}</p>;
                }
                // List items
                if (/^[a-z]\)\s/.test(trimmed) || /^-\s/.test(trimmed)) {
                  return <p key={i} className="ml-6 text-sm">{trimmed}</p>;
                }
                return <p key={i} className="text-sm leading-relaxed">{trimmed}</p>;
              })}
            </div>

            {/* Penalty rules highlight */}
            {viewingProc && viewingProc.penaltyRules !== "待定" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />违规处理
                </p>
                <p className="text-sm text-red-700">{viewingProc.penaltyRules}</p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {viewingProc && fullyRead.has(viewingProc.id) ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />已阅读完毕
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ChevronDown className="h-3.5 w-3.5 animate-bounce" />请滚动至底部完成阅读
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {viewContext === "ack" && pendingAckId && viewingProc && fullyRead.has(viewingProc.id) && (
                <Button size="sm" onClick={confirmAfterReading} className="gap-1">
                  <Check className="h-3.5 w-3.5" />学习确认
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setViewingProc(null); setPendingAckId(null); }}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
