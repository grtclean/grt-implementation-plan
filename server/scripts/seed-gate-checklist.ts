/**
 * Gate Checklist Seed Data Templates
 * M7/M8/M9 gate checklist items, trigger configs, and webhook configs
 */

export interface GateChecklistItem {
  category: string;
  item: string;
  weight: number;
  required: boolean;
  criteria: string;
  sortOrder: number;
}

export interface TriggerConfig {
  triggerCode: string;
  name: string;
  agentType: "Risk_Radar" | "Technical_Writer" | "Gatekeeper" | "Site_Copilot";
  triggerType: "Stage_Change" | "Time_Based" | "Event_Based" | "Threshold_Based" | "Manual";
  triggerConditions: string;
  triggerOnStages: string;
  isEnabled: number;
  priority: number;
}

export interface WebhookConfig {
  configCode: string;
  name: string;
  webhookUrl: string;
  webhookType: "wecom" | "dingtalk" | "feishu" | "custom";
  eventTypes: string;
  isEnabled: number;
}

// ============ M7 Pre-Acceptance Checklist (28 items, 7 categories) ============
const M7: GateChecklistItem[] = [
  // cleaning_performance (5 items)
  { category: "cleaning_performance", item: "清洗效果目视检查", weight: 10, required: true, criteria: "清洗后工件表面无可见油污、切屑残留", sortOrder: 1 },
  { category: "cleaning_performance", item: "清洁度测试（ISO 16232标准）", weight: 15, required: true, criteria: "符合ISO 16232标准，颗粒物残留量低于客户要求阈值", sortOrder: 2 },
  { category: "cleaning_performance", item: "颗粒物计数检测", weight: 12, required: true, criteria: "颗粒物尺寸和数量符合ISO 16232 CCC规范", sortOrder: 3 },
  { category: "cleaning_performance", item: "清洗剂浓度验证", weight: 8, required: true, criteria: "清洗液浓度在设定范围内波动不超过5%", sortOrder: 4 },
  { category: "cleaning_performance", item: "干燥效果验证", weight: 8, required: true, criteria: "清洗后干燥工件无水渍残留", sortOrder: 5 },
  // mechanical_system (5 items)
  { category: "mechanical_system", item: "喷淋系统压力测试", weight: 10, required: true, criteria: "喷淋压力稳定在设定值+-5%范围内", sortOrder: 6 },
  { category: "mechanical_system", item: "传输系统运行测试", weight: 8, required: true, criteria: "传输带速度均匀，无卡顿", sortOrder: 7 },
  { category: "mechanical_system", item: "泵组运行状态检查", weight: 8, required: true, criteria: "所有泵组运行正常，无异常振动和噪音", sortOrder: 8 },
  { category: "mechanical_system", item: "过滤系统效能测试", weight: 9, required: true, criteria: "过滤精度达到设计要求", sortOrder: 9 },
  // electrical_control (4 items)
  { category: "electrical_control", item: "PLC程序功能测试", weight: 12, required: true, criteria: "PLC程序所有逻辑功能正常运行", sortOrder: 10 },
  { category: "electrical_control", item: "HMI界面功能验证", weight: 8, required: true, criteria: "HMI所有画面和操作功能正常", sortOrder: 11 },
  { category: "electrical_control", item: "传感器信号验证", weight: 9, required: true, criteria: "所有传感器信号准确可靠", sortOrder: 12 },
  { category: "electrical_control", item: "变频器参数验证", weight: 7, required: true, criteria: "变频器参数设置正确，运行平稳", sortOrder: 13 },
  // process_parameters (4 items)
  { category: "process_parameters", item: "温度控制精度测试", weight: 10, required: true, criteria: "温度控制精度在+-2度范围内", sortOrder: 14 },
  { category: "process_parameters", item: "清洗时间参数验证", weight: 8, required: true, criteria: "各工位清洗时间符合工艺要求", sortOrder: 15 },
  { category: "process_parameters", item: "超声波功率测试", weight: 10, required: true, criteria: "超声波功率输出稳定在设定值+-10%范围内", sortOrder: 16 },
  { category: "process_parameters", item: "真空干燥参数验证", weight: 7, required: true, criteria: "真空度和干燥时间符合工艺规范", sortOrder: 17 },
  // cycle_time (3 items)
  { category: "cycle_time", item: "单件节拍时间测试", weight: 10, required: true, criteria: "单件清洗节拍时间不超过设定值", sortOrder: 18 },
  { category: "cycle_time", item: "连续运行稳定性测试", weight: 12, required: true, criteria: "连续运行4小时，节拍波动不超过5%", sortOrder: 19 },
  { category: "cycle_time", item: "换型时间验证", weight: 6, required: false, criteria: "换型时间不超过15分钟", sortOrder: 20 },
  // safety_compliance (4 items)
  { category: "safety_compliance", item: "急停功能测试", weight: 15, required: true, criteria: "所有急停按钮功能正常，响应时间<1秒", sortOrder: 21 },
  { category: "safety_compliance", item: "安全防护装置检查", weight: 12, required: true, criteria: "安全门、光幕等防护装置功能正常", sortOrder: 22 },
  { category: "safety_compliance", item: "电气安全测试", weight: 10, required: true, criteria: "接地电阻、绝缘电阻符合标准", sortOrder: 23 },
  { category: "safety_compliance", item: "CE标识合规检查", weight: 8, required: true, criteria: "设备符合CE认证要求", sortOrder: 24 },
  // documentation (3 items)
  { category: "documentation", item: "操作手册完整性检查", weight: 6, required: true, criteria: "操作手册包含完整的操作和维护说明", sortOrder: 25 },
  { category: "documentation", item: "电气图纸一致性检查", weight: 7, required: true, criteria: "电气图纸与实际接线一致", sortOrder: 26 },
  { category: "documentation", item: "质量记录文件检查", weight: 5, required: true, criteria: "所有检测报告和质量记录完整", sortOrder: 27 },
  { category: "documentation", item: "培训记录确认", weight: 4, required: false, criteria: "操作人员培训已完成并记录", sortOrder: 28 },
];

// ============ M8 Final Acceptance Checklist (13 items) ============
const M8: GateChecklistItem[] = [
  { category: "customer_verification", item: "客户现场验收测试", weight: 15, required: true, criteria: "客户代表现场确认设备运行正常", sortOrder: 1 },
  { category: "customer_verification", item: "客户验收报告签署", weight: 12, required: true, criteria: "客户签署正式验收报告", sortOrder: 2 },
  { category: "performance_validation", item: "产线节拍匹配测试", weight: 15, required: true, criteria: "设备节拍与客户产线节拍匹配，误差不超过3%", sortOrder: 3 },
  { category: "performance_validation", item: "连续生产稳定性验证", weight: 12, required: true, criteria: "连续生产8小时无故障", sortOrder: 4 },
  { category: "performance_validation", item: "产品质量一致性验证", weight: 10, required: true, criteria: "批量清洗质量一致性Cpk>=1.33", sortOrder: 5 },
  { category: "integration", item: "MES系统对接验证", weight: 8, required: true, criteria: "与客户MES系统数据交互正常", sortOrder: 6 },
  { category: "integration", item: "远程监控功能验证", weight: 7, required: true, criteria: "远程监控和诊断功能正常", sortOrder: 7 },
  { category: "documentation", item: "最终技术文档交付", weight: 6, required: true, criteria: "所有技术文档已交付客户", sortOrder: 8 },
  { category: "documentation", item: "备件清单确认", weight: 5, required: true, criteria: "备件清单和推荐库存已确认", sortOrder: 9 },
  { category: "training", item: "操作培训完成确认", weight: 7, required: true, criteria: "客户操作人员培训已完成", sortOrder: 10 },
  { category: "training", item: "维护培训完成确认", weight: 6, required: true, criteria: "客户维护人员培训已完成", sortOrder: 11 },
  { category: "handover", item: "质保条款确认", weight: 8, required: true, criteria: "质保期限和条款已确认", sortOrder: 12 },
  { category: "handover", item: "售后服务协议签署", weight: 7, required: true, criteria: "售后服务协议已签署", sortOrder: 13 },
];

// ============ M9 Warranty Period Checklist (11 items) ============
const M9: GateChecklistItem[] = [
  { category: "monitoring", item: "OEE监控达标检查", weight: 12, required: true, criteria: "设备OEE持续达到85%以上", sortOrder: 1 },
  { category: "monitoring", item: "远程监控数据分析", weight: 8, required: true, criteria: "远程监控数据无异常趋势", sortOrder: 2 },
  { category: "monitoring", item: "能耗监控评估", weight: 6, required: true, criteria: "能耗在设计范围内", sortOrder: 3 },
  { category: "maintenance", item: "定期维护执行确认", weight: 10, required: true, criteria: "按维护计划执行所有维护项目", sortOrder: 4 },
  { category: "maintenance", item: "易损件更换记录", weight: 7, required: true, criteria: "易损件按计划更换并记录", sortOrder: 5 },
  { category: "maintenance", item: "预防性维护计划更新", weight: 6, required: true, criteria: "根据运行数据更新维护计划", sortOrder: 6 },
  { category: "quality", item: "清洗质量趋势分析", weight: 10, required: true, criteria: "清洗质量保持稳定无退化趋势", sortOrder: 7 },
  { category: "quality", item: "客户投诉处理记录", weight: 8, required: true, criteria: "所有客户投诉已处理并关闭", sortOrder: 8 },
  { category: "reporting", item: "质保期总结报告", weight: 7, required: true, criteria: "编制完整的质保期运行总结报告", sortOrder: 9 },
  { category: "reporting", item: "改进建议清单", weight: 5, required: false, criteria: "基于运行数据提出改进建议", sortOrder: 10 },
  { category: "handover", item: "质保期结束确认", weight: 8, required: true, criteria: "客户确认质保期结束，设备状态良好", sortOrder: 11 },
];

// ============ Trigger Configurations (7+ triggers) ============
const TRIGGER: TriggerConfig[] = [
  {
    triggerCode: "TRG-M7-GATE-001",
    name: "M7阶段Gate检查触发器",
    agentType: "Gatekeeper",
    triggerType: "Stage_Change",
    triggerConditions: JSON.stringify({
      fromPhase: "M6_Manufacturing",
      toPhase: "M7_Pre_Acceptance",
    }),
    triggerOnStages: JSON.stringify(["M7"]),
    isEnabled: 1,
    priority: 1,
  },
  {
    triggerCode: "TRG-M8-GATE-001",
    name: "M8阶段Gate检查触发器",
    agentType: "Gatekeeper",
    triggerType: "Stage_Change",
    triggerConditions: JSON.stringify({
      fromPhase: "M7_Pre_Acceptance",
      toPhase: "M8_Final_Acceptance",
      requireM7Passed: true,
    }),
    triggerOnStages: JSON.stringify(["M8"]),
    isEnabled: 1,
    priority: 1,
  },
  {
    triggerCode: "TRG-M9-GATE-001",
    name: "M9阶段Gate检查触发器",
    agentType: "Gatekeeper",
    triggerType: "Stage_Change",
    triggerConditions: JSON.stringify({
      fromPhase: "M8_Final_Acceptance",
      toPhase: "M9_Warranty",
      requireM8Passed: true,
    }),
    triggerOnStages: JSON.stringify(["M9"]),
    isEnabled: 1,
    priority: 1,
  },
  {
    triggerCode: "TRG-M9-PERIODIC-001",
    name: "M9定期检查触发器",
    agentType: "Gatekeeper",
    triggerType: "Time_Based",
    triggerConditions: JSON.stringify({
      interval: "monthly",
      phase: "M9_Warranty",
    }),
    triggerOnStages: JSON.stringify(["M9"]),
    isEnabled: 1,
    priority: 2,
  },
  {
    triggerCode: "TRG-RISK-001",
    name: "Tier1客户风险分析触发器",
    agentType: "Risk_Radar",
    triggerType: "Event_Based",
    triggerConditions: JSON.stringify({
      customerTier: "Tier1",
      events: ["quality_issue", "delivery_delay", "cost_overrun"],
    }),
    triggerOnStages: JSON.stringify(["M5", "M6", "M7", "M8", "M9"]),
    isEnabled: 1,
    priority: 1,
  },
  {
    triggerCode: "TRG-SITE-001",
    name: "现场问题诊断触发器",
    agentType: "Site_Copilot",
    triggerType: "Event_Based",
    triggerConditions: JSON.stringify({
      severity: ["Critical", "High"],
      requireOnSite: true,
    }),
    triggerOnStages: JSON.stringify(["M7", "M8", "M9"]),
    isEnabled: 1,
    priority: 2,
  },
  {
    triggerCode: "TRG-DOC-001",
    name: "技术文档生成触发器",
    agentType: "Technical_Writer",
    triggerType: "Event_Based",
    triggerConditions: JSON.stringify({
      events: ["gate_check_completed", "phase_change"],
    }),
    triggerOnStages: JSON.stringify(["M7", "M8", "M9"]),
    isEnabled: 1,
    priority: 3,
  },
];

// ============ Webhook Configurations ============
const WEBHOOK: WebhookConfig[] = [
  {
    configCode: "WH-GATE-001",
    name: "Gate检查结果通知",
    webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=gate-check-key",
    webhookType: "wecom",
    eventTypes: "gate_check_passed,gate_check_failed,gate_check_conditional",
    isEnabled: 1,
  },
  {
    configCode: "WH-AI-001",
    name: "AI诊断建议通知",
    webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=ai-diagnosis-token",
    webhookType: "dingtalk",
    eventTypes: "ai_diagnosis_completed,risk_alert_high",
    isEnabled: 1,
  },
];

export const TEMPLATES = {
  M7,
  M8,
  M9,
  TRIGGER,
  WEBHOOK,
};
