/**
 * 帮助内容配置 - 各页面/模块的上下文帮助内容
 * Help Content Configuration - Context-aware help content for each page/module
 */

export interface HelpStep {
  title: string;
  description: string;
}

export interface HelpFAQ {
  question: string;
  answer: string;
}

export interface PageHelpContent {
  title: string;
  description: string;
  overview: string;
  steps: HelpStep[];
  faq: HelpFAQ[];
}

/**
 * 路由路径 → 帮助内容映射
 */
export const helpContentMap: Record<string, PageHelpContent> = {
  // ========== 首页 ==========
  "/": {
    title: "我的看板",
    description: "个人工作台与数据概览",
    overview: "我的看板是您进入系统后的首页，汇总展示与您相关的项目进度、待办任务、通知消息和关键指标。您可以快速了解当前工作状态并跳转到具体功能模块。",
    steps: [
      { title: "查看待办事项", description: "看板顶部显示您待处理的审批、任务和通知" },
      { title: "查看项目进度", description: "中部区域展示您参与项目的整体进度" },
      { title: "快速导航", description: "点击任意卡片可直接跳转到对应功能页面" },
    ],
    faq: [
      { question: "看板数据多久更新一次？", answer: "看板数据每30秒自动刷新，您也可以手动刷新。" },
      { question: "如何自定义看板内容？", answer: "目前看板内容根据您的角色和权限自动生成，暂不支持自定义布局。" },
    ],
  },

  // ========== 生产制造 ==========
  "/production-command-center": {
    title: "生产指挥中心",
    description: "统一聚合生产制造各模块数据",
    overview: "生产指挥中心是生产管理的综合看板，聚合工序进度、排程执行、质量监控和工人分布等关键数据，帮助管理者实时掌控生产全局。",
    steps: [
      { title: "查看核心指标", description: "顶部5个指标卡片显示进行中工单、设备利用率、质量通过率等" },
      { title: "切换查看维度", description: "通过Tab切换查看工序进度、排程执行、质量监控、工人分布" },
      { title: "处理异常", description: "异常预警区域标记需要关注的问题，点击可查看详情" },
    ],
    faq: [
      { question: "数据来源是什么？", answer: "数据来自各生产子模块的实时API查询，包括工单系统、质检系统和UWB定位系统。" },
      { question: "如何导出报表？", answer: "点击右上角的导出按钮可导出当前看板数据为Excel格式。" },
    ],
  },

  "/production-dashboard": {
    title: "M5 生产看板",
    description: "车间实时生产状态监控",
    overview: "M5生产看板用于车间大屏展示，实时监控工单进度、任务状态和工人效率。支持自动刷新和全屏模式，适合挂载在车间显示器上。",
    steps: [
      { title: "选择视图模式", description: "可切换「车间大屏」和「管理视图」两种展示模式" },
      { title: "设置刷新频率", description: "支持10秒到5分钟的自动刷新间隔" },
      { title: "查看工人排名", description: "效率排名Tab展示基于综合指标的工人排行榜" },
      { title: "查看异常预警", description: "预警Tab显示工时超预估、质检待处理等问题" },
    ],
    faq: [
      { question: "如何进入全屏模式？", answer: "点击右上角的全屏按钮，或按F11键进入全屏展示。" },
      { question: "工人效率如何计算？", answer: "综合考虑任务完成数、工时效率和质量通过率三个维度。" },
    ],
  },

  "/process-management": {
    title: "工序管理",
    description: "T1-T15工序步骤管理",
    overview: "工序管理页面用于管理T1-T15标准工序，包括BOM步骤编辑、AI智慧预设和工时打卡功能。支持双列编辑模式，工程师可以手动录入步骤或采纳AI建议。",
    steps: [
      { title: "选择项目", description: "在右上角输入项目ID以加载该项目的工序数据" },
      { title: "展开工序", description: "点击T1-T15工序卡片展开查看详细步骤" },
      { title: "添加BOM步骤", description: "点击「添加步骤」按钮手动录入步骤信息" },
      { title: "使用AI预设", description: "点击「AI智慧预设」从历史项目生成步骤建议" },
      { title: "工时打卡", description: "点击「开始工时」按钮开始计时，完成后点击「结束工时」" },
    ],
    faq: [
      { question: "AI预设是如何生成的？", answer: "系统分析历史相似项目的BOM步骤和工艺数据，结合当前项目的BOM清单进行匹配生成建议。" },
      { question: "可以批量采纳AI建议吗？", answer: "可以，展开工序后点击「全部借鉴采纳」按钮即可批量采纳待确认的AI步骤。" },
    ],
  },

  "/production-execution": {
    title: "项目执行指挥舱",
    description: "T1-T15工作流程可视化",
    overview: "项目执行指挥舱提供T1-T15工序的可视化时间轴，展示各工序的执行状态、审批进度和集成信号。支持角色视角切换和工时记录管理。",
    steps: [
      { title: "查看工序流水线", description: "横向滚动查看T1-T15各工序的执行状态" },
      { title: "查看工序详情", description: "点击某个工序卡片查看详细信息和AI洞察" },
      { title: "工时记录", description: "在工序详情中管理时间记录" },
      { title: "审批管理", description: "查看和处理阶段审批" },
    ],
    faq: [
      { question: "灰色工序表示什么？", answer: "灰色表示该工序超出您的角色权限范围，您只能查看但无法编辑。" },
      { question: "集成信号是什么？", answer: "显示Copilot 365和企业微信等外部系统的连接状态。" },
    ],
  },

  // ========== 质量管理 ==========
  "/qc-management": {
    title: "质检管理",
    description: "质量检查全流程管理",
    overview: "质检管理页面用于创建、执行和跟踪质量检查记录。支持按工单、产品筛选，记录检查结果和缺陷信息，并可创建返工任务。",
    steps: [
      { title: "创建质检记录", description: "点击「新建质检」按钮创建新的检查记录" },
      { title: "执行检查", description: "按检查项逐一记录检查结果" },
      { title: "记录缺陷", description: "发现不合格时记录缺陷类型和描述" },
      { title: "处理不合格", description: "对不合格项创建返工任务或发起报废流程" },
    ],
    faq: [
      { question: "质检有哪些结果类型？", answer: "分为通过(Pass)、不合格(Fail)和有条件通过(Conditional)三种。" },
      { question: "如何查看历史质检记录？", answer: "使用搜索和筛选功能按工单号、日期或结果类型查询历史记录。" },
    ],
  },

  "/quality-checkpoints": {
    title: "质量检查点管理",
    description: "设置和管理质量检查关键节点",
    overview: "质量检查点管理用于定义和配置生产过程中的质量检查节点，设置检查项、严重程度和检查标准。确保关键工序的质量控制不遗漏。",
    steps: [
      { title: "添加检查点", description: "点击「添加检查点」定义新的质量检查节点" },
      { title: "设置检查项", description: "为每个检查点配置具体的检查指标和标准" },
      { title: "设置严重程度", description: "标记检查项的严重程度：关键/主要/次要" },
      { title: "查看检查结果", description: "在列表中查看各检查点的执行情况" },
    ],
    faq: [
      { question: "检查点可以修改吗？", answer: "已创建的检查点可以修改检查项和标准，但已执行的历史记录不受影响。" },
      { question: "严重程度如何影响流程？", answer: "关键级别的不合格项会自动触发工序锁定，需要审批后才能继续。" },
    ],
  },

  "/quality-interlock": {
    title: "质量工序联动",
    description: "工序间质量联锁控制",
    overview: "质量工序联动实现了工序间的质量联锁控制，当某工序质检不合格时自动锁定后续工序，防止不合格品流入下一环节。",
    steps: [
      { title: "查看联锁状态", description: "查看各工序的锁定/解锁状态" },
      { title: "设置联锁规则", description: "配置工序间的质量联锁触发条件" },
      { title: "处理锁定", description: "对锁定的工序进行审批解锁或创建返工" },
      { title: "查看联锁历史", description: "查看历史联锁记录和处理结果" },
    ],
    faq: [
      { question: "工序被锁定后如何解锁？", answer: "需要质量主管审批解锁，或完成返工后自动解锁。" },
      { question: "联锁规则可以关闭吗？", answer: "关键工序的联锁规则不可关闭，非关键工序可以由管理员调整。" },
    ],
  },

  // ========== 物料管理 ==========
  "/material-tracking": {
    title: "物料追踪",
    description: "物料全流程追踪与库存管理",
    overview: "物料追踪页面提供物料从入库到领料的全流程追踪，支持批次管理、库位查询和库存预警。帮助生产线快速定位所需物料。",
    steps: [
      { title: "搜索物料", description: "使用搜索框按物料编码或名称快速查找" },
      { title: "查看库位", description: "每个物料显示当前库位和数量信息" },
      { title: "入库登记", description: "点击「入库登记」记录新到物料" },
      { title: "领料申请", description: "点击「领料申请」提交物料领用申请" },
    ],
    faq: [
      { question: "低库存预警阈值如何设置？", answer: "在物料管理的编码规则中可以设置各物料的最低库存预警线。" },
      { question: "如何查看物料流转历史？", answer: "点击物料列表中的某个物料可查看其完整的入库/出库流转记录。" },
    ],
  },

  "/material-flow": {
    title: "物料流转追踪",
    description: "物料在生产线上的流转追踪",
    overview: "物料流转追踪记录物料在各生产工序间的流转路径，帮助追溯物料使用情况，支持按项目、工序和时间维度查询。",
    steps: [
      { title: "选择项目", description: "选择要查看的项目，加载其物料流转数据" },
      { title: "查看流转记录", description: "按时间顺序查看物料的领用、退库和转移记录" },
      { title: "追溯物料批次", description: "点击批次号查看该批次物料的完整流转路径" },
    ],
    faq: [
      { question: "物料流转记录可以导出吗？", answer: "可以，点击导出按钮即可导出为Excel格式。" },
    ],
  },

  "/warehouse-management": {
    title: "仓库管理",
    description: "仓库库位与出入库管理",
    overview: "仓库管理页面用于管理仓库库位、出入库操作和库存盘点。支持多仓库管理和库位可视化。",
    steps: [
      { title: "管理库位", description: "查看和编辑仓库库位结构" },
      { title: "出入库操作", description: "执行物料的入库和出库操作" },
      { title: "库存盘点", description: "发起库存盘点任务并记录结果" },
    ],
    faq: [
      { question: "如何新增仓库？", answer: "仓库的新增需要管理员权限，在系统设置中进行配置。" },
    ],
  },

  "/inventory-dashboard": {
    title: "库存看板",
    description: "库存数据可视化看板",
    overview: "库存看板提供库存数据的可视化展示，包括库存金额、周转率、积压预警等关键指标，帮助管理者把握库存健康度。",
    steps: [
      { title: "查看库存概况", description: "查看总库存金额、SKU数量等核心指标" },
      { title: "分析库存结构", description: "按分类查看库存分布和占比" },
      { title: "处理预警", description: "关注低库存和积压预警，及时调整采购计划" },
    ],
    faq: [
      { question: "库存周转率如何计算？", answer: "库存周转率 = 年度出库金额 / 平均库存金额。" },
    ],
  },

  // ========== 财务管理 ==========
  "/budget-management": {
    title: "预算管理",
    description: "项目预算编制与执行监控",
    overview: "预算管理页面用于编制项目预算、监控预算执行情况，设置预算预警线。支持按部门、项目和费用类型多维度管理预算。",
    steps: [
      { title: "创建预算", description: "为项目或部门创建年度/季度预算计划" },
      { title: "监控执行", description: "实时查看各预算项的执行率和剩余额度" },
      { title: "设置预警", description: "设置预算使用率预警阈值（如80%、90%）" },
      { title: "调整预算", description: "根据实际情况申请预算调整" },
    ],
    faq: [
      { question: "预算超支后还能报销吗？", answer: "预算超支后需要走超支审批流程，经上级审批后方可继续报销。" },
      { question: "预算可以跨期结转吗？", answer: "默认不结转，需要在系统中单独申请结转。" },
    ],
  },

  "/budget-overrun-approval": {
    title: "超支审批",
    description: "预算超支审批流程管理",
    overview: "超支审批页面用于处理预算超支的审批请求。当某项费用超出预算限额时，系统自动生成审批单据，由有权限的管理者进行审批。",
    steps: [
      { title: "查看待审批", description: "查看所有待处理的超支审批请求" },
      { title: "审核详情", description: "查看超支原因、金额和相关凭证" },
      { title: "审批操作", description: "批准、驳回或转交审批请求" },
    ],
    faq: [
      { question: "审批权限如何分级？", answer: "超支10%以内由部门主管审批，10%-20%由总监审批，20%以上需总经理审批。" },
    ],
  },

  "/cost": {
    title: "成本管理",
    description: "项目成本核算与分析",
    overview: "成本管理页面用于项目成本的归集、核算和分析。支持BOM成本、人工成本、制造费用的多维度管理。",
    steps: [
      { title: "查看成本概况", description: "查看项目的整体成本构成和趋势" },
      { title: "核算工时成本", description: "根据工时记录自动核算人工成本" },
      { title: "对比分析", description: "将实际成本与标准成本进行对比分析" },
      { title: "导出报表", description: "导出成本分析报表" },
    ],
    faq: [
      { question: "成本数据来源是什么？", answer: "物料成本来自采购系统，人工成本来自工时系统，制造费用按预设分摊规则计算。" },
      { question: "标准成本如何设置？", answer: "在「成本标准配置」页面设置各类成本的标准单价和分摊规则。" },
    ],
  },

  "/cost-standards": {
    title: "成本标准配置",
    description: "成本标准单价与分摊规则配置",
    overview: "成本标准配置用于设置各类成本的标准单价、工时费率和制造费用分摊规则，为成本核算提供基准数据。",
    steps: [
      { title: "设置工时费率", description: "配置不同工种的标准工时费率" },
      { title: "设置物料标准价", description: "维护物料的标准采购单价" },
      { title: "配置分摊规则", description: "设置制造费用的分摊方式和比例" },
    ],
    faq: [
      { question: "标准价格多久更新一次？", answer: "建议每季度根据市场行情更新一次标准价格。" },
    ],
  },

  // ========== 研发设计 ==========
  "/requirements-analysis": {
    title: "需求分析",
    description: "客户需求分析与管理",
    overview: "需求分析页面用于记录和管理客户的技术需求，支持需求分类、优先级排序和需求追溯。",
    steps: [
      { title: "录入需求", description: "记录客户的功能需求和技术参数" },
      { title: "分析需求", description: "对需求进行分类和可行性分析" },
      { title: "确认需求", description: "与客户确认最终需求清单" },
    ],
    faq: [
      { question: "需求变更如何处理？", answer: "通过变更管理流程提交需求变更申请，经评审后更新。" },
    ],
  },

  "/mechanical-design": {
    title: "机械设计",
    description: "机械结构设计管理",
    overview: "机械设计页面用于管理机械结构设计任务，包括设计图纸、BOM清单和设计审核流程。",
    steps: [
      { title: "创建设计任务", description: "新建机械设计任务并分配给设计师" },
      { title: "上传设计图纸", description: "上传CAD图纸和3D模型文件" },
      { title: "设计审核", description: "提交设计评审并记录评审意见" },
    ],
    faq: [
      { question: "支持哪些图纸格式？", answer: "支持DWG、STEP、IGES、PDF等常见CAD格式。" },
    ],
  },

  "/electrical-design": {
    title: "电气设计",
    description: "电气系统设计管理",
    overview: "电气设计页面用于管理电气系统设计，包括电气原理图、PLC程序和配电设计。",
    steps: [
      { title: "创建电气设计", description: "新建电气设计方案" },
      { title: "管理电气BOM", description: "维护电气元器件清单" },
      { title: "设计审核", description: "提交电气设计评审" },
    ],
    faq: [
      { question: "PLC程序如何管理？", answer: "PLC程序文件以附件形式上传和版本管理。" },
    ],
  },

  "/bom-management": {
    title: "BOM管理",
    description: "物料清单管理",
    overview: "BOM管理页面用于创建和维护产品的多级物料清单，支持BOM对比、版本管理和成本估算。",
    steps: [
      { title: "创建BOM", description: "为产品创建物料清单" },
      { title: "添加物料行", description: "逐行添加物料编码、数量和单位" },
      { title: "BOM审核", description: "提交BOM审核并锁定版本" },
    ],
    faq: [
      { question: "BOM可以导入吗？", answer: "支持从Excel模板批量导入BOM数据。" },
    ],
  },

  // ========== 销售管理 ==========
  "/sales-analytics": {
    title: "销售分析",
    description: "销售业绩分析与预测",
    overview: "销售分析页面提供销售数据的多维度分析，包括营收趋势、目标达成率、客户分布和产品销售排名。",
    steps: [
      { title: "查看销售指标", description: "查看总营收、目标达成率等核心指标" },
      { title: "分析趋势", description: "查看月度/季度销售趋势图" },
      { title: "客户分析", description: "按客户维度分析销售贡献" },
    ],
    faq: [
      { question: "销售目标如何设定？", answer: "销售目标由管理层在年度规划中设定，按BU和个人分解。" },
    ],
  },

  "/crm/customers": {
    title: "客户管理",
    description: "客户信息管理",
    overview: "客户管理页面用于管理客户的基本信息、联系记录和合作历史，是CRM系统的核心模块。",
    steps: [
      { title: "查看客户列表", description: "浏览所有客户信息并使用搜索筛选" },
      { title: "编辑客户信息", description: "点击客户卡片编辑详细信息" },
      { title: "记录跟进", description: "添加客户跟进记录和沟通备注" },
    ],
    faq: [
      { question: "如何导入客户数据？", answer: "支持从Excel模板批量导入客户数据。" },
    ],
  },

  "/crm/opportunities": {
    title: "商机管理",
    description: "销售商机全流程管理",
    overview: "商机管理页面用于跟踪销售机会从发现到成交的全过程，支持阶段管理、概率预测和赢单分析。",
    steps: [
      { title: "创建商机", description: "录入新的销售机会信息" },
      { title: "推进阶段", description: "根据跟进情况推进商机阶段" },
      { title: "预测分析", description: "查看商机的预计金额和成交概率" },
    ],
    faq: [
      { question: "商机阶段有哪些？", answer: "包括：线索识别、需求确认、方案提交、商务谈判、合同签订。" },
    ],
  },

  // ========== HR管理 ==========
  "/hr-lifecycle": {
    title: "HR链路",
    description: "人力资源全生命周期管理",
    overview: "HR链路页面覆盖员工从入职到离职的全生命周期管理，包括入职办理、培训安排、绩效考核和离职流程。",
    steps: [
      { title: "入职办理", description: "为新员工办理入职手续和资料录入" },
      { title: "培训安排", description: "安排新员工入职培训和技能培训" },
      { title: "绩效管理", description: "设定绩效目标并进行考核评估" },
    ],
    faq: [
      { question: "试用期多长？", answer: "标准试用期为3个月，具体根据岗位和合同约定。" },
    ],
  },

  "/training": {
    title: "培训管理",
    description: "员工培训计划与记录管理",
    overview: "培训管理页面用于创建培训计划、安排培训课程、记录培训参与情况和评估培训效果。",
    steps: [
      { title: "创建培训计划", description: "制定年度/季度培训计划" },
      { title: "安排课程", description: "为培训计划安排具体课程和讲师" },
      { title: "记录参与", description: "记录员工的培训参与和完成情况" },
    ],
    faq: [
      { question: "培训是否计入工时？", answer: "是的，培训时间计入员工考勤和工时记录。" },
    ],
  },

  "/my-performance": {
    title: "我的绩效",
    description: "个人绩效目标与考核",
    overview: "我的绩效页面展示您的绩效目标完成情况、考核结果和历史绩效趋势。",
    steps: [
      { title: "查看当期目标", description: "查看本期的绩效目标和权重" },
      { title: "更新进度", description: "定期更新目标完成进度" },
      { title: "查看评估结果", description: "查看主管的绩效评估和反馈" },
    ],
    faq: [
      { question: "绩效考核周期是多久？", answer: "标准考核周期为季度考核，年底进行年度综合评估。" },
    ],
  },

  "/employee-performance": {
    title: "员工智能绩效",
    description: "综合绩效评估与智能分析",
    overview: "员工智能绩效页面整合日/周/月/季/年绩效数据，结合工作计划输出、会议表现、项目表现等多维度指标，通过雷达图、折线图和热力图进行可视化分析，支持AI智能评估。",
    steps: [
      { title: "选择员工", description: "在员工信息区域选择要查看绩效的员工" },
      { title: "查看综合评分", description: "顶部统计卡片展示综合评分、工作计划、会议和项目表现" },
      { title: "多维分析", description: "通过雷达图和趋势图查看各维度绩效表现" },
      { title: "AI对比分析", description: "点击对比分析按钮，AI自动生成绩效对比报告" },
    ],
    faq: [
      { question: "绩效评分如何计算？", answer: "综合评分基于工作计划完成度(40%)、会议表现(20%)、项目贡献(30%)和协作评价(10%)加权计算。" },
      { question: "如何导出绩效报告？", answer: "点击右上角的导出报告按钮，可导出PDF格式的完整绩效报告。" },
    ],
  },

  "/employee-management": {
    title: "员工管理",
    description: "公司组织架构和人员信息管理",
    overview: "员工管理页面提供公司组织架构和人员信息的统一管理，支持按事业部查看员工分布，一键同步简道云数据以保持信息最新。",
    steps: [
      { title: "查看BU分布", description: "顶部统计卡片展示各事业部员工数量" },
      { title: "搜索员工", description: "使用搜索框按姓名、工号或部门搜索员工" },
      { title: "同步数据", description: "点击一键更新组织架构按钮同步最新数据" },
    ],
    faq: [
      { question: "数据来源是什么？", answer: "员工数据来自简道云HR系统，通过API自动同步。" },
      { question: "如何初始化数据？", answer: "首次使用时点击初始化数据按钮，系统将从简道云拉取全量员工数据。" },
    ],
  },

  "/compliance/employee/:id": {
    title: "员工工时详情",
    description: "员工工时记录和合规状态",
    overview: "员工工时详情页面展示单个员工的完整工时记录、历史违规情况和合规趋势图表，帮助管理者监控员工的工时合规性。",
    steps: [
      { title: "查看基本信息", description: "顶部展示员工的姓名、部门、岗位等基本信息" },
      { title: "查看工时统计", description: "统计卡片显示本周工时、待处理预警、已解决预警和合规率" },
      { title: "分析趋势", description: "通过图表查看历史工时趋势和合规变化" },
    ],
    faq: [
      { question: "合规率如何计算？", answer: "合规率 = (合规工时天数 / 总工作天数) × 100%，低于90%会触发预警。" },
      { question: "预警处理流程是什么？", answer: "预警产生后由主管确认，需要在3个工作日内处理并提交说明。" },
    ],
  },

  "/offboarding": {
    title: "员工离职数据管理",
    description: "员工离职流程与数据保留管理",
    overview: "员工离职数据管理页面提供完整的离职流程管理，包括离职记录创建、工作交接跟踪、绩效归属确认和历史数据查询功能。",
    steps: [
      { title: "新建离职记录", description: "点击新建按钮创建员工离职记录" },
      { title: "跟踪工作交接", description: "在工作交接标签页查看和管理交接进度" },
      { title: "确认绩效归属", description: "在绩效归属标签页确认离职员工的绩效数据归属" },
      { title: "数据查询", description: "在数据查询标签页搜索历史离职记录" },
    ],
    faq: [
      { question: "离职数据保留多久？", answer: "离职员工数据保留5年，符合劳动法规要求。" },
      { question: "交接进度如何更新？", answer: "由交接负责人在系统中逐项确认完成状态，系统自动计算总进度。" },
    ],
  },

  "/hr/offboarding-new": {
    title: "员工离职管理",
    description: "从离职申请到交接完成的流程管理",
    overview: "员工离职管理页面用于处理完整的离职流程，从离职申请提交、审批到最终交接完成，支持AI智能预估离职补偿。",
    steps: [
      { title: "创建离职申请", description: "点击新建离职申请按钮，填写员工信息和离职原因" },
      { title: "审批处理", description: "对待审批的离职申请进行审核" },
      { title: "跟踪交接", description: "监控离职员工的工作交接进度" },
      { title: "查看统计", description: "通过统计卡片了解离职申请的整体情况" },
    ],
    faq: [
      { question: "审批流程是什么？", answer: "离职申请需经过直属主管→HR→部门总监三级审批。" },
      { question: "AI补偿预估准确吗？", answer: "AI基于员工工龄、薪资和历史数据预估，供参考使用，最终以HR核算为准。" },
    ],
  },

  "/hrm-intelligent": {
    title: "HRM智能化管理",
    description: "人力资源智能化管理系统",
    overview: "HRM智能化管理系统集成岗位职责管理、AI面试评估、培训计划制定和薪酬体系分析等功能，通过AI技术提升人力资源管理效率。",
    steps: [
      { title: "管理岗位", description: "创建和维护岗位职责描述，AI自动生成岗位画像" },
      { title: "AI面试", description: "使用AI辅助面试评估，自动生成候选人评分" },
      { title: "培训管理", description: "制定智能培训计划，AI推荐个性化学习路径" },
      { title: "薪酬分析", description: "查看薪酬体系分析和市场对标数据" },
    ],
    faq: [
      { question: "AI面试如何评估候选人？", answer: "AI通过分析候选人简历、面试回答和行为特征进行多维度评估，生成综合评分报告。" },
      { question: "如何添加新岗位？", answer: "在岗位管理标签页点击新增岗位，填写岗位信息后AI将自动生成岗位职责描述。" },
    ],
  },

  "/salary-bonus": {
    title: "薪酬奖金管理",
    description: "奖金计算与发放管理",
    overview: "薪酬奖金管理页面用于管理员工的奖金计算、审批和发放流程，支持批量计算和CSV导出。",
    steps: [
      { title: "查看奖金列表", description: "浏览当前周期所有员工的奖金计算结果" },
      { title: "批量计算", description: "点击批量计算按钮，按月份和BU进行奖金批量计算" },
      { title: "调整和审核", description: "对计算结果进行调整和审核" },
      { title: "导出数据", description: "点击导出CSV按钮导出奖金数据" },
    ],
    faq: [
      { question: "奖金计算公式是什么？", answer: "奖金基于绩效评分、岗位系数和部门预算综合计算，具体公式由HR部门设定。" },
      { question: "如何修改奖金金额？", answer: "点击对应记录的编辑按钮可手动调整金额，调整后需重新审批。" },
    ],
  },

  "/salary-approval": {
    title: "薪酬审批工作流",
    description: "多级薪酬审批流程管理",
    overview: "薪酬审批工作流页面管理薪酬方案的多级审批流程，从计算完成到主管审核、HR确认、财务发放的完整链路。",
    steps: [
      { title: "提交审批", description: "选择要提交的薪酬方案，点击提交审批按钮" },
      { title: "审批处理", description: "审批人查看详情后进行批准或驳回操作" },
      { title: "查看进度", description: "通过审批流程图查看当前审批进度" },
    ],
    faq: [
      { question: "审批需要多长时间？", answer: "标准审批流程预计3-5个工作日，加急审批1-2个工作日。" },
      { question: "被驳回后如何处理？", answer: "收到驳回通知后修改方案重新提交，系统会记录每次修改历史。" },
    ],
  },

  "/salary-report": {
    title: "薪酬报告",
    description: "薪酬数据统计与分析报告",
    overview: "薪酬报告页面提供全面的薪酬数据统计和分析，包括员工数、奖金总额、平均奖金、平均评分和处罚总额等核心指标。",
    steps: [
      { title: "选择周期", description: "通过顶部下拉框选择要查看的统计周期" },
      { title: "查看核心指标", description: "五个统计卡片展示关键薪酬指标" },
      { title: "分析详情", description: "查看部门分布、趋势变化等详细分析" },
    ],
    faq: [
      { question: "报告数据是否实时？", answer: "报告数据每日凌晨更新，如需最新数据可点击刷新按钮。" },
      { question: "如何导出报告？", answer: "页面底部提供导出功能，支持Excel和PDF格式。" },
    ],
  },

  "/worker-performance": {
    title: "工人绩效排行榜",
    description: "一线工人绩效排名与分析",
    overview: "工人绩效排行榜页面展示一线生产工人的绩效排名，支持按不同时间周期查看，帮助管理者了解工人产能和工作表现。",
    steps: [
      { title: "选择周期", description: "选择日/周/月/季度查看不同时间维度的排名" },
      { title: "查看排行", description: "浏览工人绩效排名和各项指标得分" },
      { title: "分析个人", description: "点击工人姓名查看详细的绩效分析" },
    ],
    faq: [
      { question: "绩效如何排名？", answer: "基于产量、质量、效率和出勤等多维度指标加权计算综合排名。" },
      { question: "排名多久更新一次？", answer: "日排名每天凌晨更新，周/月排名在周期结束后次日更新。" },
    ],
  },

  "/bu-performance": {
    title: "BU绩效看板",
    description: "事业部绩效综合展示",
    overview: "BU绩效看板页面展示各事业部的综合绩效数据，支持按不同时间周期和事业部筛选查看，帮助管理层横向对比各BU表现。",
    steps: [
      { title: "选择筛选条件", description: "通过顶部的周期和BU下拉框筛选数据" },
      { title: "查看总览", description: "查看各BU的核心绩效指标对比" },
      { title: "深入分析", description: "点击具体BU卡片进入详细分析页面" },
    ],
    faq: [
      { question: "BU绩效包含哪些指标？", answer: "包括营收、利润率、项目完成率、客户满意度和人均产出等核心指标。" },
      { question: "数据来源是什么？", answer: "数据聚合自财务、项目管理、客户服务等多个子系统。" },
    ],
  },

  // ========== 客户服务 ==========
  "/field-installation": {
    title: "现场安装",
    description: "设备现场安装管理",
    overview: "现场安装页面用于管理设备到客户现场后的安装过程，包括安装计划、进度跟踪和安装验收。",
    steps: [
      { title: "创建安装任务", description: "为已发货设备创建安装任务" },
      { title: "安排工程师", description: "指派现场工程师负责安装" },
      { title: "跟踪进度", description: "实时跟踪安装进度和问题" },
      { title: "安装验收", description: "完成安装后进行现场验收" },
    ],
    faq: [
      { question: "安装需要多长时间？", answer: "根据设备复杂度不同，一般3-15个工作日。" },
    ],
  },

  "/sat-testing": {
    title: "SAT测试",
    description: "现场验收测试管理",
    overview: "SAT(Site Acceptance Test)测试页面用于管理设备在客户现场的验收测试过程，确保设备满足合同约定的技术指标。",
    steps: [
      { title: "制定测试方案", description: "根据合同要求制定SAT测试方案" },
      { title: "执行测试", description: "按方案逐项执行测试并记录结果" },
      { title: "处理偏差", description: "对测试不合格项进行偏差处理" },
      { title: "签署报告", description: "生成SAT报告并获取客户签字确认" },
    ],
    faq: [
      { question: "SAT不通过怎么办？", answer: "需要分析原因，制定整改方案，完成整改后重新测试。" },
    ],
  },

  "/service-tickets": {
    title: "售后工单",
    description: "售后服务工单管理",
    overview: "售后工单页面用于创建、分配和跟踪售后服务请求，支持工单优先级管理和SLA监控。",
    steps: [
      { title: "创建工单", description: "记录客户的售后服务请求" },
      { title: "分配工单", description: "将工单分配给对应的服务工程师" },
      { title: "处理工单", description: "记录处理过程和结果" },
      { title: "关闭工单", description: "问题解决后关闭工单并记录客户反馈" },
    ],
    faq: [
      { question: "工单响应时间要求是什么？", answer: "紧急工单4小时内响应，普通工单24小时内响应。" },
    ],
  },

  "/customer-feedback": {
    title: "客户反馈",
    description: "客户意见与满意度管理",
    overview: "客户反馈页面用于收集和管理客户的反馈意见，支持满意度调查和问题跟踪。",
    steps: [
      { title: "查看反馈", description: "查看客户提交的反馈和建议" },
      { title: "分类处理", description: "对反馈进行分类和优先级排序" },
      { title: "跟进处理", description: "指派责任人跟进处理反馈问题" },
    ],
    faq: [
      { question: "满意度评分标准是什么？", answer: "采用1-5分制，5分为非常满意，3分以下为需要改进。" },
    ],
  },

  // ========== 通用 ==========
  "/help": {
    title: "帮助中心",
    description: "系统使用指南与常见问题",
    overview: "帮助中心提供系统各模块的使用指南、操作教程和常见问题解答。",
    steps: [
      { title: "搜索帮助", description: "在搜索框输入关键词查找相关帮助文档" },
      { title: "浏览分类", description: "按功能模块浏览帮助文档" },
      { title: "联系支持", description: "如无法解决问题，可联系技术支持" },
    ],
    faq: [
      { question: "如何提交问题反馈？", answer: "在侧边栏底部点击「反馈」按钮提交问题。" },
    ],
  },

  // ========== Gemini 模块 ==========
  "/social-community": {
    title: "社群管理",
    description: "微信群消息监听、AI智能回复、人工审核发布",
    overview: "社群管理模块对接微信/钉钉/飞书等社群平台，自动监听群消息并识别客户问题。AI引擎根据知识库生成回复草稿，经人工审核后安全发布到群聊，实现7×24小时客户服务响应。",
    steps: [
      { title: "添加群组", description: "点击「添加群组」配置需要监听的社群群组，填写群组名称、平台和群组ID" },
      { title: "查看消息", description: "在消息列表Tab浏览群内消息，可按群组筛选和搜索内容" },
      { title: "生成AI回复", description: "对标记为问题的消息点击「生成回复」，AI将根据知识库自动生成回复草稿" },
      { title: "审核草稿", description: "在AI草稿审核Tab查看待审核回复，可编辑内容后批准或拒绝" },
      { title: "发布消息", description: "已审核通过的消息进入发布队列，可立即发布或定时发布" },
    ],
    faq: [
      { question: "AI回复的准确率如何保证？", answer: "AI基于企业知识库生成回复，每条回复都附带置信度评分，低置信度回复会优先推送审核。" },
      { question: "支持哪些社群平台？", answer: "目前支持微信、钉钉、飞书和Telegram四个平台。" },
      { question: "消息监听会影响群组性能吗？", answer: "不会，消息监听采用被动接收机制，不会对群组产生额外负担。" },
    ],
  },

  "/liquid-workforce": {
    title: "液态用工",
    description: "技能胶囊管理、任务竞标、智能合约支付",
    overview: "液态用工平台将员工专业技能原子化为「技能胶囊」，通过AI匹配和市场竞标机制实现跨部门技能共享。智能合约自动管理任务交付和报酬支付，构建组织内部的技能流通市场。",
    steps: [
      { title: "创建技能胶囊", description: "点击「创建技能胶囊」将您的专业能力原子化，设置技能等级和版税率" },
      { title: "浏览任务", description: "在任务竞标Tab查看开放任务，筛选适合自己技能的项目" },
      { title: "提交竞标", description: "点击「竞标」按钮，填写报价、交付承诺后提交" },
      { title: "查看竞标结果", description: "在我的竞标Tab跟踪竞标状态，查看AI评分和中标结果" },
      { title: "管理合约", description: "中标后在智能合约Tab查看合约状态和资金流转" },
    ],
    faq: [
      { question: "版税率是什么意思？", answer: "当您的技能胶囊被其他员工调用时，您将按设定的版税率获得报酬分成。" },
      { question: "竞标评审标准是什么？", answer: "AI综合考虑报价、信誉分、历史交付质量和技能匹配度进行评分排名。" },
      { question: "智能合约如何保障权益？", answer: "合约采用资金锁定机制，任务完成并验收后自动释放资金，争议由平台仲裁。" },
    ],
  },

  "/ai-sales": {
    title: "AI销售",
    description: "AI-to-AI谈判、ZOPA区间计算、ZKP证明",
    overview: "AI销售模块实现了AI-to-AI自动谈判能力，我方销售AI与客户采购AI进行多轮自动报价还价。系统自动计算ZOPA（可能成交区间），通过零知识证明（ZKP）向客户证明产能和合规资质而不泄露敏感信息。",
    steps: [
      { title: "新建谈判", description: "点击「新建谈判」配置客户Agent、产品、底价和目标价，启动AI自动谈判" },
      { title: "推进谈判", description: "在谈判会话中点击「继续谈判」推进下一轮，查看双方报价和ZOPA进度" },
      { title: "生成ZKP", description: "点击「生成ZKP」创建产能证明或合规证明，向客户展示资质" },
      { title: "配置策略", description: "在谈判策略Tab设置默认让步策略、情绪响应模式和终止阈值" },
      { title: "查看结果", description: "谈判结束后查看成交价格、轮次统计和情绪分析" },
    ],
    faq: [
      { question: "ZOPA是什么？", answer: "ZOPA（Zone of Possible Agreement）是双方可能达成协议的价格区间，即我方底价和客户预期价格的重叠区域。" },
      { question: "ZKP证明如何保护隐私？", answer: "零知识证明允许向客户证明我们满足某项标准（如产能>1000件/月）而不泄露具体数值。" },
      { question: "谈判失败后可以重启吗？", answer: "可以，创建新的谈判会话即可重新开始，系统会参考历史谈判数据优化策略。" },
    ],
  },

  "/personal-agent": {
    title: "个人智能体",
    description: "行为探针、过程笔记、技能推断与知识提取",
    overview: "个人智能体基于YDW（Your Digital Worker）数据映射，通过行为探针自动采集您在IDE、CAD、文档编辑等工具中的操作行为，结合过程笔记和AI分析，自动推断技能等级并构建个人知识图谱。",
    steps: [
      { title: "查看能力画像", description: "能力画像Tab展示您的T/S/D/C/K/L六维技能等级和最近成长记录" },
      { title: "查看行为日志", description: "行为探针Tab显示系统自动采集的操作行为，可点击「推断技能」提取隐含能力" },
      { title: "记录过程笔记", description: "在过程笔记Tab点击「新建笔记」记录项目中的问题和解决方案" },
      { title: "AI知识提取", description: "对笔记点击「AI提取知识」，系统将自动提取结构化知识" },
      { title: "查看知识图谱", description: "知识图谱Tab展示从行为和笔记中积累的知识网络" },
    ],
    faq: [
      { question: "行为数据如何采集？", answer: "通过IDE插件、CAD插件等工具自动采集操作事件，仅记录行为模式不记录具体内容。" },
      { question: "技能等级如何计算？", answer: "基于行为频率、复杂度和项目成果综合分析，分为L1-L5五个等级。" },
      { question: "过程笔记和普通笔记有什么区别？", answer: "过程笔记强调问题-解决方案结构，AI可以从中提取可复用的结构化知识。" },
    ],
  },

  // ========== 能力体系 ==========
  "/capability-os": {
    title: "GRT 能力操作系统",
    description: "TSDCKL六大能力域与L1-L5等级体系",
    overview: "GRT能力操作系统是组织能力管理的核心平台，围绕TSDCKL六大能力域（技术、系统、交付、客户、知识、领导力），采用L1-L5等级体系，通过证据驱动自动升级机制，实现组织能力的系统化管理。",
    steps: [
      { title: "了解能力域", description: "浏览TSDCKL六大能力域的定义和能力要求" },
      { title: "查看等级体系", description: "了解L1-L5各等级的标准和升级条件" },
      { title: "提交能力证据", description: "点击「提交能力证据」进入证据提交页面" },
      { title: "查看红蓝对抗", description: "了解Tier1客户红蓝对抗交付机制" },
    ],
    faq: [
      { question: "能力等级如何升级？", answer: "能力等级完全由系统根据证据自动计算，达到阈值后自动触发升级，不允许人工主观升级。" },
      { question: "TSDCKL是什么意思？", answer: "T=技术能力、S=系统理解、D=交付能力、C=客户价值、K=知识沉淀、L=领导与影响，是GRT的六大核心能力域。" },
    ],
  },

  "/capability-dashboard": {
    title: "能力仪表盘",
    description: "TSDCKL六大能力域数据可视化",
    overview: "能力仪表盘提供个人和组织在TSDCKL六大能力域的数据可视化展示，包括能力雷达图、等级分布、升级动态和能力标杆。基于证据积分自动计算。",
    steps: [
      { title: "查看雷达图", description: "能力域Tab展示个人TSDCKL六维雷达图" },
      { title: "分析等级分布", description: "等级Tab查看L1-L5各等级在不同能力域的人数分布" },
      { title: "关注动态", description: "动态Tab查看最近能力升级记录和能力标杆" },
    ],
    faq: [
      { question: "雷达图数据如何更新？", answer: "雷达图基于您的证据积分实时计算，提交证据并审核通过后自动更新。" },
      { question: "如何成为能力标杆？", answer: "综合六大能力域的平均等级排名靠前的工程师会被展示为能力标杆。" },
    ],
  },

  "/evidence-submission": {
    title: "能力证据提交",
    description: "提交项目、服务、知识等能力证据",
    overview: "能力证据提交页面用于提交您完成的工作作为能力证据。系统根据证据类型和质量自动计算积分，积分达到阈值后自动触发能力等级升级。",
    steps: [
      { title: "选择证据类型", description: "从项目完成、服务报告、问题解决等类型中选择" },
      { title: "填写详情", description: "填写证据标题、描述和关联项目" },
      { title: "选择能力域", description: "选择该证据主要对应的TSDCKL能力域" },
      { title: "提交审核", description: "确认信息后提交，等待审核通过自动计分" },
    ],
    faq: [
      { question: "提交后多久审核？", answer: "一般在1-3个工作日内完成审核，紧急项目证据优先处理。" },
      { question: "积分如何计算？", answer: "基础积分由证据类型决定，最终积分由审核人根据证据质量确定。" },
    ],
  },

  "/capability-certificates": {
    title: "能力证书中心",
    description: "申请、管理和验证能力证书",
    overview: "能力证书中心用于管理您的能力证书。当能力等级达到L3及以上时，可以申请对应能力域的官方证书。证书支持在线验证和分享。",
    steps: [
      { title: "查看我的证书", description: "在「我的证书」Tab查看已获得的能力证书" },
      { title: "申请新证书", description: "在「申请证书」Tab查看可申请的证书并提交申请" },
      { title: "验证证书", description: "在「验证证书」Tab输入证书编号验证真伪" },
    ],
    faq: [
      { question: "证书有效期多长？", answer: "证书有效期为1年，到期后需要重新评估能力等级。" },
      { question: "证书可以对外展示吗？", answer: "可以，证书附带唯一编号和验证链接，可用于对外展示和验证。" },
    ],
  },

  "/capability-badges": {
    title: "能力徽章",
    description: "TSDCKL成就徽章收集与展示",
    overview: "能力徽章系统记录您在TSDCKL六大能力域获得的成就。徽章分为普通、优秀、稀有、史诗和传说五个稀有度等级，通过证据积累自动授予。",
    steps: [
      { title: "查看我的徽章", description: "在「我的徽章」Tab查看已获得的徽章和展示状态" },
      { title: "浏览全部徽章", description: "在「全部徽章」Tab查看所有可获得的徽章和收集进度" },
      { title: "查看排行榜", description: "在「排行榜」Tab查看徽章综合得分排名" },
    ],
    faq: [
      { question: "如何获得传说级徽章？", answer: "传说级徽章需要在某个能力域达到L5等级并完成特定的高难度成就。" },
      { question: "徽章展示有什么用？", answer: "展示的徽章会出现在您的个人主页，其他同事可以看到您的能力成就。" },
    ],
  },

  "/capability-path": {
    title: "能力发展路径",
    description: "AI智能推荐能力提升路径",
    overview: "能力发展路径页面由AI分析您的当前能力数据，识别短板和优势，推荐个性化的能力提升路径，包括短期、中期和长期行动计划。",
    steps: [
      { title: "查看AI分析", description: "顶部卡片展示AI对您能力状况的综合分析" },
      { title: "关注短板", description: "查看需要提升的能力域和差距" },
      { title: "制定计划", description: "参考推荐的短期/中期/长期行动计划" },
      { title: "寻找机会", description: "浏览推荐的项目机会和培训资源" },
    ],
    faq: [
      { question: "推荐路径多久更新？", answer: "每次提交新证据或能力等级变化后，AI会自动重新分析并更新推荐路径。" },
      { question: "可以自定义发展目标吗？", answer: "目前由AI自动推荐，未来将支持自定义目标设置。" },
    ],
  },

  "/team-capability-analysis": {
    title: "团队能力对比分析",
    description: "多成员TSDCKL能力对比与差距分析",
    overview: "团队能力对比分析页面支持选择多个团队成员，通过雷达图、差距分析和详细数据表格进行能力对比，帮助管理者识别团队能力短板和培养方向。",
    steps: [
      { title: "选择成员", description: "点击团队成员按钮选择要对比的人员" },
      { title: "雷达图对比", description: "在「雷达图对比」Tab查看可视化能力对比" },
      { title: "差距分析", description: "在「差距分析」Tab查看各能力域的差距和改进建议" },
      { title: "导出报告", description: "点击「导出报告」下载JSON格式的分析报告" },
    ],
    faq: [
      { question: "最多可以对比多少人？", answer: "建议同时对比不超过5人，以保证雷达图的可读性。" },
      { question: "数据是实时的吗？", answer: "是的，数据基于最新的能力积分和等级实时计算。" },
    ],
  },

  "/capability-leaderboard": {
    title: "能力排行榜",
    description: "综合能力、能力域、进步和徽章排行",
    overview: "能力排行榜展示团队成员在不同维度的能力排名，包括综合排行、能力域排行、进步排行和徽章排行，激励团队持续提升能力。",
    steps: [
      { title: "查看综合排行", description: "综合排行Tab展示基于所有能力域的综合得分排名" },
      { title: "筛选能力域", description: "能力域排行Tab可按TSDCKL各域筛选查看" },
      { title: "关注进步", description: "进步排行Tab展示积分增长最快的成员" },
      { title: "设置时间范围", description: "右上角选择器可切换查看不同时间段的排行" },
    ],
    faq: [
      { question: "排名多久更新？", answer: "排名实时计算，每次有新的证据审核通过后即时更新。" },
      { question: "综合得分如何计算？", answer: "综合得分基于六大能力域的积分加权计算，同时考虑等级和域覆盖度。" },
    ],
  },

  "/evidence-review": {
    title: "证据审核管理",
    description: "审核能力证据、管理积分发放",
    overview: "证据审核管理页面供审核人员审核提交的能力证据，决定是否通过并分配相应积分。支持按能力域筛选和搜索，确保能力评估的公正性。",
    steps: [
      { title: "查看待审核", description: "「待审核」Tab列出所有待处理的证据" },
      { title: "审核证据", description: "点击「审核」按钮查看详情，填写意见和积分" },
      { title: "批准或拒绝", description: "根据证据质量选择批准（并分配积分）或拒绝" },
      { title: "查看历史", description: "切换Tab查看已通过和已拒绝的历史记录" },
    ],
    faq: [
      { question: "谁有审核权限？", answer: "团队主管（minLevel 2及以上）具有证据审核权限。" },
      { question: "审核积分可以调整吗？", answer: "可以，审核人可以在申请积分基础上调整实际授予积分。" },
    ],
  },

  "/capability/evidence-upload": {
    title: "能力证据上传",
    description: "上传项目交付物、证书等证据文件",
    overview: "能力证据上传页面用于上传项目交付物、培训证书、荣誉奖项等文件作为能力升级依据。支持PDF、DOC、图片等格式，提交后进入审核流程。",
    steps: [
      { title: "选择类型", description: "选择证据类型：项目交付物、资格证书、培训记录或荣誉奖项" },
      { title: "填写信息", description: "填写证据标题、描述和所属能力领域" },
      { title: "上传文件", description: "选择或拖拽文件到上传区域（最大10MB）" },
      { title: "提交审核", description: "确认信息后提交，等待审核通过自动计分" },
    ],
    faq: [
      { question: "支持哪些文件格式？", answer: "支持PDF、DOC、DOCX、JPG、PNG格式，单个文件最大10MB。" },
      { question: "上传后可以删除吗？", answer: "待审核状态下可以删除，已审核通过的证据不可删除。" },
    ],
  },

  // ========== 门径管理 ==========
  "/stage-gate": {
    title: "门径管理",
    description: "M0-M12 阶段门禁检查与生产拉动信号",
    overview: "门径管理是项目全生命周期阶段门禁检查系统，覆盖M0（商机识别）到M12（项目结项）共13个阶段。每个阶段设有检查清单（含一票否决项），支持自动验证对接ERP/PLM系统，以及生产拉动信号管理（JIT/JIS）。",
    steps: [
      { title: "选择项目", description: "在页面右上角的项目选择器中选择要管理的项目" },
      { title: "查看总览", description: "总览Tab展示M0-M12流水线，点击阶段查看通过性检查结果" },
      { title: "管理检查项", description: "检查项Tab可筛选、新增、更新检查项状态，支持自动验证" },
      { title: "导入模板", description: "在总览Tab点击「导入标准模板」为项目快速初始化M3-M12检查项" },
      { title: "管理拉动信号", description: "拉动信号Tab可创建、发送和确认生产拉动信号" },
      { title: "查看分析", description: "分析Tab展示各阶段通过率、信号分布和验证方式统计" },
    ],
    faq: [
      { question: "什么是一票否决项？", answer: "一票否决项是标记为强制必须通过的检查项。只要有任何一个一票否决项未通过，该阶段门径就不允许通过。" },
      { question: "自动验证是如何工作的？", answer: "配置了自动验证源（如PLM_Model_Status、ERP_BOM_Consistency）的检查项可以自动对接外部系统验证。点击「自动验证」按钮即可触发。" },
      { question: "如何导入模板检查项？", answer: "在总览Tab点击「导入标准模板」按钮，系统会为项目批量创建M3-M12的标准检查项模板。" },
      { question: "拉动信号的用途是什么？", answer: "拉动信号用于门径通过后自动触发下游生产设备的JIT/JIS拉动动作，如通知AAS设备开始加工准备。" },
    ],
  },

  // ========== AI助手 ==========
  "/ai-assistant": {
    title: "AI助手管理",
    description: "管理和配置AI助手实例",
    overview: "AI助手管理页面集中管理所有AI助手配置，包括员工数字助手、功能型助手和建议执行统计。",
    steps: [
      { title: "查看助手列表", description: "浏览已配置的AI助手及其运行状态" },
      { title: "配置助手", description: "新建或编辑AI助手的模型、提示词和权限设置" },
      { title: "查看执行记录", description: "查看AI建议执行情况和效果统计" },
    ],
    faq: [
      { question: "如何创建新的AI助手？", answer: "点击页面右上角的「新建助手」按钮，填写助手名称、模型和提示词配置即可。" },
    ],
  },
  "/ai-sales-hub": {
    title: "AI销售中心",
    description: "AI-to-AI谈判、ZOPA分析、情绪洞察",
    overview: "AI销售中心提供AI辅助的销售谈判功能，包括实时谈判模拟、ZOPA（可能达成协议区间）分析、ZKP零知识证明验证，以及客户情绪洞察。",
    steps: [
      { title: "启动谈判", description: "点击「启动新谈判」创建AI辅助的谈判会话" },
      { title: "分析ZOPA", description: "系统自动计算双方的可接受价格区间" },
      { title: "查看情绪分析", description: "AI实时分析客户情绪变化和谈判意愿" },
    ],
    faq: [
      { question: "什么是ZOPA分析？", answer: "ZOPA（Zone of Possible Agreement）是买卖双方可能达成一致的价格区间，AI会根据历史数据和市场情况自动计算。" },
    ],
  },
  "/ai-sales-enhanced": {
    title: "AI销售中心（增强版）",
    description: "AI谈判可视化、ZOPA计算、情绪分析",
    overview: "增强版AI销售中心提供更丰富的可视化和分析功能，支持谈判过程回放和深度情绪分析。",
    steps: [
      { title: "查看谈判仪表盘", description: "总览所有进行中和已完成的AI谈判" },
      { title: "分析谈判数据", description: "深度分析谈判成功率、平均周期等指标" },
    ],
    faq: [
      { question: "增强版和标准版有什么区别？", answer: "增强版提供更详细的数据可视化和高级分析功能，适合管理层使用。" },
    ],
  },
  "/ai/solution-assistant": {
    title: "AI方案助手",
    description: "智能方案生成与优化",
    overview: "AI方案助手根据客户需求自动生成技术方案，支持方案比对、优化建议和一键导出。",
    steps: [
      { title: "输入需求", description: "描述客户需求和技术要求" },
      { title: "生成方案", description: "AI根据需求自动生成推荐方案" },
      { title: "优化调整", description: "根据反馈调整方案细节" },
    ],
    faq: [
      { question: "AI方案准确度如何？", answer: "方案基于历史成功案例库生成，准确度取决于需求描述的详细程度，建议结合专家审核使用。" },
    ],
  },
  "/ai/quotation-assistant": {
    title: "AI报价助手",
    description: "智能报价计算与优化",
    overview: "AI报价助手自动计算项目报价，综合考虑成本、市场价格和历史数据，生成最优报价方案。",
    steps: [
      { title: "选择产品配置", description: "选择需要报价的产品和配置项" },
      { title: "AI计算报价", description: "系统自动计算成本和建议售价" },
      { title: "调整导出", description: "调整利润率和折扣后导出报价单" },
    ],
    faq: [
      { question: "报价是如何计算的？", answer: "AI综合考虑原材料成本、加工工时、市场竞品价格和历史成交数据计算建议报价。" },
    ],
  },
  "/ai/planning-assistant": {
    title: "AI规划助手",
    description: "智能项目规划与排程",
    overview: "AI规划助手自动生成项目计划，优化资源分配和时间排程，支持多方案对比。",
    steps: [
      { title: "设定目标", description: "定义项目目标、约束条件和优先级" },
      { title: "生成规划", description: "AI自动生成最优项目规划方案" },
      { title: "调整确认", description: "微调资源分配和关键节点后确认方案" },
    ],
    faq: [
      { question: "AI如何优化排程？", answer: "AI考虑资源可用性、依赖关系和历史工期数据，使用优化算法生成最短路径方案。" },
    ],
  },
  "/ai/kpi-assistant": {
    title: "AI KPI助手",
    description: "智能KPI分析与预测",
    overview: "AI KPI助手自动分析关键绩效指标趋势，提供预测和改进建议。",
    steps: [
      { title: "选择指标", description: "选择要分析的KPI指标维度" },
      { title: "查看分析", description: "AI展示趋势分析和异常检测结果" },
      { title: "获取建议", description: "查看AI生成的改进建议和行动项" },
    ],
    faq: [
      { question: "KPI预测准确吗？", answer: "预测基于历史数据趋势和季节性模型，短期预测（1-3个月）准确度较高。" },
    ],
  },
  "/ai-accuracy": {
    title: "AI准确度分析",
    description: "AI预设准确度分析仪表盘",
    overview: "监控和分析AI模型预测准确度，追踪模型性能变化趋势，及时发现精度下降问题。",
    steps: [
      { title: "查看总览", description: "查看各AI模型的综合准确度指标" },
      { title: "分析趋势", description: "查看准确度随时间变化的趋势图" },
      { title: "对比模型", description: "对比不同模型或不同版本的准确度差异" },
    ],
    faq: [
      { question: "准确度低于阈值怎么办？", answer: "系统会自动告警，建议检查训练数据质量或考虑模型重训。" },
    ],
  },

  // ========== 社区/社群 ==========
  "/community": {
    title: "社群管理",
    description: "技术交流群管理与消息审批",
    overview: "社群管理页面提供企业技术社群的统一管理，包括群组管理、消息审核、成员管理和商机转化追踪。",
    steps: [
      { title: "查看社群列表", description: "浏览和管理所有技术交流群" },
      { title: "审核消息", description: "查看和处理待审核的群消息" },
      { title: "管理成员", description: "添加、移除或调整社群成员权限" },
    ],
    faq: [
      { question: "如何创建新的社群？", answer: "在社群列表页点击「新建群组」按钮，填写群名、描述并添加初始成员即可。" },
    ],
  },
  "/liquid-workforce-hub": {
    title: "液态用工中心",
    description: "技能胶囊市场、任务竞标、智能合约",
    overview: "液态用工中心提供内部人力资源灵活调配平台，支持技能胶囊发布、任务竞标和基于智能合约的自动结算。",
    steps: [
      { title: "浏览技能市场", description: "查看可用的技能胶囊和持有者信息" },
      { title: "参与任务竞标", description: "查看开放任务并提交竞标方案" },
      { title: "管理合约", description: "查看执行中的智能合约状态和支付进度" },
    ],
    faq: [
      { question: "什么是技能胶囊？", answer: "技能胶囊是将个人专业技能结构化封装后的可交易单元，包含技能等级、验证证明和使用记录。" },
    ],
  },
  "/liquid-workforce-enhanced": {
    title: "液态用工中心（增强版）",
    description: "技能认证审核、竞标智能匹配、版税管理",
    overview: "增强版液态用工中心提供更完善的管理功能，包括技能认证审核流程和智能竞标匹配算法。",
    steps: [
      { title: "审核技能认证", description: "管理员审核技能认证申请" },
      { title: "配置匹配规则", description: "设置任务与技能的智能匹配参数" },
    ],
    faq: [
      { question: "增强版有什么额外功能？", answer: "增强版增加了管理员审核流程、AI智能匹配和版税分成管理功能。" },
    ],
  },
  "/personal-agent-hub": {
    title: "个人智能体中心",
    description: "行为探针、技能推断、知识图谱",
    overview: "个人智能体中心通过行为数据采集和AI分析，自动推断个人技能画像，构建知识图谱并追踪成长轨迹。",
    steps: [
      { title: "查看行为数据", description: "浏览系统采集的个人行为记录" },
      { title: "查看技能推断", description: "AI根据行为数据推断的技能画像" },
      { title: "浏览知识图谱", description: "查看个人知识关联图谱" },
    ],
    faq: [
      { question: "行为数据包含哪些内容？", answer: "包括系统操作记录、项目参与情况、知识库贡献和培训完成情况等。" },
    ],
  },
  "/personal-agent-enhanced": {
    title: "个人智能体中心（增强版）",
    description: "行为聚合、技能推断、知识图谱可视化",
    overview: "增强版提供更深度的行为分析和可视化的知识图谱展示功能。",
    steps: [
      { title: "查看详细分析", description: "深度分析个人行为模式和技能成长趋势" },
      { title: "探索知识图谱", description: "交互式探索个人知识关联网络" },
    ],
    faq: [
      { question: "知识图谱如何生成？", answer: "AI从项目文档、代码贡献和交流记录中自动提取知识节点并建立关联关系。" },
    ],
  },
  "/social-community-hub": {
    title: "社群管理中心",
    description: "消息审核、AI回复、脱敏过滤",
    overview: "社群管理中心提供消息审核、AI自动回复配置和敏感信息脱敏过滤功能。",
    steps: [
      { title: "审核消息", description: "查看和审核待发布的社群消息" },
      { title: "配置AI回复", description: "设置AI自动回复模板和触发规则" },
      { title: "管理脱敏规则", description: "配置敏感信息检测和脱敏规则" },
    ],
    faq: [
      { question: "AI回复如何工作？", answer: "AI根据预设模板和上下文自动生成回复建议，需人工审核后发布。" },
    ],
  },
  "/social-community-enhanced": {
    title: "社群管理中心（增强版）",
    description: "批量审核、AI评分、脱敏测试",
    overview: "增强版社群管理中心支持批量消息审核、AI回复质量评分和脱敏规则测试功能。",
    steps: [
      { title: "批量审核", description: "选择多条消息进行批量审核操作" },
      { title: "AI评分分析", description: "查看AI回复的质量评分和改进建议" },
    ],
    faq: [
      { question: "批量审核如何操作？", answer: "勾选多条消息后，使用顶部批量操作栏进行通过、拒绝或标记操作。" },
    ],
  },
  "/social-community-settings": {
    title: "社群管理设置",
    description: "脱敏规则、AI模板、Webhook配置",
    overview: "配置社群管理的全局设置，包括消息脱敏规则、AI回复模板和Webhook集成。",
    steps: [
      { title: "配置脱敏规则", description: "设置敏感信息检测正则和替换规则" },
      { title: "管理AI模板", description: "创建和编辑AI自动回复模板" },
      { title: "配置Webhook", description: "设置消息事件的Webhook通知地址" },
    ],
    faq: [
      { question: "脱敏规则支持自定义吗？", answer: "支持，可以配置自定义正则表达式和替换文本来定义脱敏规则。" },
    ],
  },
  "/social-community-analytics": {
    title: "消息统计分析",
    description: "消息数据分析、成员画像、活跃度统计",
    overview: "社群消息统计分析页面提供消息量趋势、成员活跃度排行、影响力分析等数据。",
    steps: [
      { title: "选择范围", description: "选择要分析的群组和时间范围" },
      { title: "查看趋势", description: "查看消息量随时间变化的趋势图" },
      { title: "分析成员", description: "查看成员活跃度排行和影响力指数" },
    ],
    faq: [
      { question: "影响力指数如何计算？", answer: "综合消息数量、被引用次数、话题发起量和回复互动率计算。" },
    ],
  },

  // ========== CRM/销售 ==========
  "/crm": {
    title: "客户管理",
    description: "客户信息管理与分级维护",
    overview: "CRM客户管理模块提供客户全生命周期管理，包括客户录入、分级、跟进记录和商机追踪。",
    steps: [
      { title: "查看客户列表", description: "浏览和搜索已录入的客户信息" },
      { title: "新建客户", description: "点击「新建客户」录入客户基本信息" },
      { title: "管理分级", description: "根据客户价值设置A/B/C/D等级" },
    ],
    faq: [
      { question: "客户等级如何划分？", answer: "A级为核心客户，B级为重要客户，C级为一般客户，D级为潜在客户。等级影响跟进策略和资源分配。" },
    ],
  },
  "/crm/opportunities": {
    title: "商机管理",
    description: "销售商机跟踪与预测",
    overview: "管理销售漏斗中的商机，追踪每个商机的阶段进展、预计金额和成交概率。",
    steps: [
      { title: "查看商机列表", description: "浏览所有活跃商机及其当前阶段" },
      { title: "创建商机", description: "关联客户创建新的销售商机" },
      { title: "更新进展", description: "推进商机阶段并记录跟进情况" },
    ],
    faq: [
      { question: "加权金额是如何计算的？", answer: "加权金额 = 预计金额 × 成交概率。用于预测销售收入。" },
    ],
  },
  "/crm/contacts": {
    title: "联系人管理",
    description: "客户联系人信息维护",
    overview: "管理客户的关键联系人信息，包括职位、联系方式和关键决策人标记。",
    steps: [
      { title: "查看联系人", description: "浏览所有客户联系人信息" },
      { title: "添加联系人", description: "为客户添加新的联系人" },
      { title: "标记关键人", description: "将重要联系人标记为关键决策人" },
    ],
    faq: [
      { question: "什么是关键联系人？", answer: "关键联系人是客户方参与决策的重要人员，标记后会在商机跟进中优先显示。" },
    ],
  },
  "/leads": {
    title: "商机管理",
    description: "商机线索跟踪与AI预测",
    overview: "商机管理页面集中管理所有销售线索，支持AI置信度预测和预估金额统计。",
    steps: [
      { title: "查看商机列表", description: "浏览全部商机线索及优先级排序" },
      { title: "导入线索", description: "从外部渠道批量导入商机线索" },
      { title: "AI分析", description: "查看AI对商机成交概率的预测分析" },
    ],
    faq: [
      { question: "AI置信度是什么？", answer: "AI根据客户行为、历史数据和市场趋势计算的商机成交概率预测值。" },
    ],
  },
  "/customer-questionnaire": {
    title: "客户需求问卷",
    description: "智能需求采集与AI方案推荐",
    overview: "通过结构化问卷采集客户需求信息，AI自动分析需求并推荐最佳技术方案。",
    steps: [
      { title: "填写需求", description: "按模块填写客户的技术需求和业务场景" },
      { title: "AI推荐", description: "点击「AI方案推荐」获取智能推荐方案" },
      { title: "保存导出", description: "保存草稿或导出完整的需求分析报告" },
    ],
    faq: [
      { question: "AI推荐方案准确吗？", answer: "AI基于历史成功案例库推荐方案，建议结合实际情况和专家意见做最终决策。" },
    ],
  },
  "/customer-value-view": {
    title: "客户价值视图",
    description: "基于角色的客户场景映射",
    overview: "客户价值视图根据不同角色展示定制化的客户信息和任务驱动视图。",
    steps: [
      { title: "选择角色", description: "选择当前查看角色（销售/技术/管理等）" },
      { title: "查看场景", description: "浏览该角色关注的客户场景和任务" },
      { title: "执行任务", description: "从视图直接跳转到相关任务操作" },
    ],
    faq: [
      { question: "不同角色看到的内容不同吗？", answer: "是的，系统根据角色自动筛选最相关的客户信息和待办任务。" },
    ],
  },

  // ========== 系统管理 ==========
  "/admin-dashboard": {
    title: "管理员仪表盘",
    description: "系统运维监控与管理",
    overview: "管理员仪表盘提供系统整体运行状态概览，包括用户活跃度、系统性能和告警信息。",
    steps: [
      { title: "查看系统状态", description: "监控服务器、数据库和应用的运行状态" },
      { title: "处理告警", description: "查看和处理系统告警通知" },
      { title: "管理用户", description: "快捷入口管理系统用户和权限" },
    ],
    faq: [
      { question: "告警多久更新一次？", answer: "系统状态每30秒自动刷新，关键告警实时推送。" },
    ],
  },
  "/monitoring": {
    title: "系统监控",
    description: "服务器与应用性能监控",
    overview: "系统监控仪表盘展示服务器资源、应用性能和接口响应时间等关键指标。",
    steps: [
      { title: "查看资源监控", description: "监控CPU、内存和磁盘使用情况" },
      { title: "查看性能指标", description: "查看接口响应时间和吞吐量" },
      { title: "设置告警", description: "配置性能阈值告警规则" },
    ],
    faq: [
      { question: "如何设置告警阈值？", answer: "在告警设置中配置指标名称、阈值和通知方式即可。" },
    ],
  },
  "/audit-logs": {
    title: "审计日志",
    description: "系统操作审计追踪",
    overview: "审计日志记录系统中所有关键操作，支持按时间、用户和操作类型筛选查询。",
    steps: [
      { title: "筛选日志", description: "设置时间范围和操作类型进行筛选" },
      { title: "查看详情", description: "点击日志条目查看操作详细信息" },
      { title: "导出报告", description: "导出审计日志为报告文件" },
    ],
    faq: [
      { question: "审计日志保留多长时间？", answer: "默认保留180天，可在系统设置中调整保留策略。" },
    ],
  },
  "/deadlock-monitor": {
    title: "死锁监控",
    description: "数据库死锁检测与分析",
    overview: "死锁监控页面实时检测数据库死锁事件，分析死锁原因并提供优化建议。",
    steps: [
      { title: "查看死锁事件", description: "浏览近期发生的死锁事件列表" },
      { title: "分析原因", description: "查看死锁涉及的SQL语句和锁等待图" },
      { title: "优化建议", description: "查看AI分析的优化建议" },
    ],
    faq: [
      { question: "如何预防死锁？", answer: "确保事务中访问表的顺序一致，避免长事务，适当使用索引。" },
    ],
  },
  "/error-logs": {
    title: "错误日志",
    description: "系统错误日志查看与分析",
    overview: "集中查看和分析系统运行中产生的错误日志，支持按级别和模块筛选。",
    steps: [
      { title: "筛选错误", description: "按错误级别、模块和时间范围筛选" },
      { title: "查看堆栈", description: "查看错误详情和调用堆栈信息" },
      { title: "标记处理", description: "标记已处理的错误并记录解决方案" },
    ],
    faq: [
      { question: "如何设置错误告警？", answer: "在通知设置中配置错误级别阈值和通知渠道。" },
    ],
  },
  "/permissions": {
    title: "权限管理",
    description: "用户角色与权限配置",
    overview: "权限管理页面配置系统角色和权限策略，支持RBAC和属性级别的访问控制。",
    steps: [
      { title: "管理角色", description: "创建和编辑角色及其权限集合" },
      { title: "分配权限", description: "为用户分配角色和特殊权限" },
      { title: "查看权限矩阵", description: "查看角色-功能权限对照矩阵" },
    ],
    faq: [
      { question: "权限变更多久生效？", answer: "权限变更即时生效，用户下次请求时将使用新的权限策略。" },
    ],
  },
  "/menu-management": {
    title: "菜单管理",
    description: "系统导航菜单配置",
    overview: "管理系统侧边栏导航菜单，配置菜单项的顺序、可见性和权限控制。",
    steps: [
      { title: "查看菜单树", description: "浏览当前菜单结构和层级关系" },
      { title: "编辑菜单项", description: "修改菜单名称、图标、路径等属性" },
      { title: "调整排序", description: "拖拽调整菜单项的显示顺序" },
    ],
    faq: [
      { question: "菜单变更需要发布吗？", answer: "菜单配置修改后即时生效，无需额外发布操作。" },
    ],
  },
  "/system-deployment": {
    title: "系统部署",
    description: "环境配置与部署管理",
    overview: "系统部署页面管理多环境部署配置、版本发布和回滚操作。",
    steps: [
      { title: "查看环境", description: "查看各环境的部署状态和版本信息" },
      { title: "发布版本", description: "选择环境执行版本发布操作" },
      { title: "回滚操作", description: "如需回滚，选择历史版本执行回滚" },
    ],
    faq: [
      { question: "回滚操作安全吗？", answer: "回滚会还原到指定版本的代码和数据库迁移，建议先在测试环境验证。" },
    ],
  },
  "/security": {
    title: "安全仪表盘",
    description: "系统安全态势感知",
    overview: "安全仪表盘展示系统安全状态，包括访问异常检测、漏洞扫描和安全评分。",
    steps: [
      { title: "查看安全评分", description: "查看系统整体安全评分和各维度得分" },
      { title: "处理告警", description: "查看和处理安全告警事件" },
      { title: "漏洞管理", description: "查看已发现的漏洞和修复进度" },
    ],
    faq: [
      { question: "安全评分如何计算？", answer: "综合考虑漏洞数量、告警处理率、密码策略合规度等多个维度计算。" },
    ],
  },
  "/grt-operation": {
    title: "GRT运营仪表盘",
    description: "GRT系统运营数据分析",
    overview: "GRT运营仪表盘展示系统使用情况、功能活跃度和用户行为分析数据。",
    steps: [
      { title: "查看使用概览", description: "查看日活、月活和功能使用排行" },
      { title: "分析用户行为", description: "分析用户的使用路径和偏好" },
      { title: "生成报告", description: "生成运营分析报告" },
    ],
    faq: [
      { question: "数据更新频率是多少？", answer: "运营数据每小时汇总更新一次，实时数据可在监控页面查看。" },
    ],
  },
  "/admin/notification-settings": {
    title: "通知设置",
    description: "系统通知渠道与规则配置",
    overview: "配置系统通知的发送规则、通知渠道和接收人策略。",
    steps: [
      { title: "配置渠道", description: "设置邮件、站内信和Webhook通知渠道" },
      { title: "设置规则", description: "配置不同事件类型的通知规则" },
      { title: "管理模板", description: "编辑通知消息模板" },
    ],
    faq: [
      { question: "支持哪些通知渠道？", answer: "支持站内信、邮件、企业微信和自定义Webhook四种通知渠道。" },
    ],
  },
  "/guide": {
    title: "系统使用指南",
    description: "GRT系统使用教程",
    overview: "系统使用指南提供各模块的操作教程和最佳实践，帮助用户快速上手。",
    steps: [
      { title: "选择模块", description: "选择要学习的功能模块" },
      { title: "阅读教程", description: "按步骤阅读操作指南" },
      { title: "实践操作", description: "在沙箱环境中实践所学内容" },
    ],
    faq: [
      { question: "有视频教程吗？", answer: "部分核心模块提供视频教程，可在教程详情页查看。" },
    ],
  },
  "/system-guide": {
    title: "系统引导",
    description: "新用户引导与功能介绍",
    overview: "系统引导页面为新用户提供分步引导，介绍系统核心功能和操作流程。",
    steps: [
      { title: "完成引导", description: "按提示完成新用户引导流程" },
      { title: "了解功能", description: "浏览各功能模块的简要介绍" },
    ],
    faq: [
      { question: "可以跳过引导吗？", answer: "可以，点击「跳过」按钮直接进入系统。之后可在设置中重新启动引导。" },
    ],
  },
  "/user-profile": {
    title: "个人设置",
    description: "个人信息与偏好设置",
    overview: "个人设置页面管理用户基本信息、工作计划偏好和通知提醒设置。",
    steps: [
      { title: "编辑基本信息", description: "更新姓名、部门等基本信息" },
      { title: "配置工作计划", description: "设置工作计划频率和提醒时间" },
      { title: "通知偏好", description: "配置各类通知的接收偏好" },
    ],
    faq: [
      { question: "如何修改密码？", answer: "在安全设置Tab中点击「修改密码」按钮。" },
    ],
  },
  "/user-status-management": {
    title: "用户状态管理",
    description: "管理所有用户Profile配置状态",
    overview: "用户状态管理页面供管理员查看所有用户的Profile配置情况，追踪未配置用户和逾期任务。",
    steps: [
      { title: "查看用户列表", description: "浏览所有用户及其Profile配置状态" },
      { title: "筛选用户", description: "按事业部、配置状态筛选用户" },
      { title: "发送提醒", description: "向未配置用户发送配置提醒通知" },
    ],
    faq: [
      { question: "如何提醒用户完成配置？", answer: "在用户列表中点击邮件图标可向该用户发送配置提醒。" },
    ],
  },
  "/notifications": {
    title: "通知中心",
    description: "系统通知与消息管理",
    overview: "通知中心集中展示系统通知、任务提醒和消息推送，支持已读标记和批量管理。",
    steps: [
      { title: "查看通知", description: "浏览所有未读和已读通知" },
      { title: "标记已读", description: "单个或批量标记通知为已读" },
      { title: "管理偏好", description: "设置通知接收偏好和免打扰时段" },
    ],
    faq: [
      { question: "如何关闭某类通知？", answer: "在通知设置中取消对应类型的通知开关即可。" },
    ],
  },
  "/organization-management": {
    title: "组织架构管理",
    description: "事业部与部门架构管理",
    overview: "组织架构管理页面维护企业组织架构树，管理事业部、部门和岗位信息。",
    steps: [
      { title: "查看架构树", description: "浏览企业组织架构层级关系" },
      { title: "管理部门", description: "创建、编辑或调整部门信息" },
      { title: "人员管理", description: "查看各部门人员配置情况" },
    ],
    faq: [
      { question: "组织架构变更会影响权限吗？", answer: "会的，部门调整会自动更新关联用户的BU归属和相应权限。" },
    ],
  },
  "/temporary-permissions": {
    title: "临时权限",
    description: "临时权限授予与管理",
    overview: "临时权限功能允许管理员为用户授予限时权限，到期自动回收。",
    steps: [
      { title: "授予权限", description: "选择用户和权限项，设置有效期" },
      { title: "查看记录", description: "浏览当前生效的临时权限列表" },
      { title: "撤销权限", description: "提前撤销不再需要的临时权限" },
    ],
    faq: [
      { question: "临时权限最长多久？", answer: "默认最长30天，管理员可根据需要设置更长期限。" },
    ],
  },
  "/permission-blacklist": {
    title: "权限黑名单",
    description: "权限禁止列表管理",
    overview: "权限黑名单管理特定用户或角色的权限禁止规则，黑名单优先级高于角色权限。",
    steps: [
      { title: "添加黑名单", description: "选择用户和要禁止的权限项" },
      { title: "查看列表", description: "浏览当前生效的黑名单规则" },
      { title: "移除规则", description: "删除不再需要的黑名单规则" },
    ],
    faq: [
      { question: "黑名单和角色权限冲突怎么办？", answer: "黑名单优先级最高，即使角色有某权限，黑名单也会阻止访问。" },
    ],
  },
  "/menu-analytics": {
    title: "菜单分析",
    description: "菜单使用数据分析",
    overview: "菜单分析仪表盘展示各菜单项的使用频率、用户偏好和访问路径分析。",
    steps: [
      { title: "查看热度图", description: "查看菜单项使用频率热度图" },
      { title: "分析路径", description: "分析用户的导航路径和行为模式" },
      { title: "优化建议", description: "查看基于数据的菜单优化建议" },
    ],
    faq: [
      { question: "数据统计范围是多久？", answer: "默认统计近30天数据，可切换为7天、90天或自定义时间范围。" },
    ],
  },
  "/operations-analytics": {
    title: "运营分析",
    description: "系统运营数据统计与分析",
    overview: "运营分析页面提供系统各维度的运营数据统计，支持多维度交叉分析和趋势预测。",
    steps: [
      { title: "选择维度", description: "选择要分析的数据维度和指标" },
      { title: "查看报表", description: "查看统计图表和明细数据" },
      { title: "导出数据", description: "导出分析报表" },
    ],
    faq: [
      { question: "支持自定义报表吗？", answer: "支持，可在报表配置中自定义维度、指标和可视化类型。" },
    ],
  },

  // ========== Batch G: 项目/规划/会议/工作流 ==========
  "/project-hub": {
    title: "项目中心",
    description: "项目总览与管理入口",
    overview: "项目中心展示所有项目的状态概览，支持快速导航到具体项目的各阶段详情。",
    steps: [
      { title: "查看项目列表", description: "浏览所有项目及其当前状态" },
      { title: "筛选项目", description: "按BU、状态、阶段等条件筛选" },
      { title: "进入项目详情", description: "点击项目卡片查看详细信息" },
    ],
    faq: [
      { question: "如何创建新项目？", answer: "点击右上角'创建项目'按钮，填写基本信息后提交。" },
    ],
  },
  "/project-enhanced": {
    title: "项目中心增强版",
    description: "增强版项目管理视图",
    overview: "提供更丰富的项目可视化和分析功能，包括项目时间线、资源分配等高级视图。",
    steps: [
      { title: "选择视图", description: "在不同视图模式间切换" },
      { title: "分析项目", description: "查看项目健康度和风险指标" },
    ],
    faq: [
      { question: "和标准版有什么区别？", answer: "增强版提供更多可视化图表和高级分析功能。" },
    ],
  },
  "/annual-agenda": {
    title: "年度日程",
    description: "年度会议与活动日程管理",
    overview: "管理全年的重要会议、评审和活动安排，支持日历视图和列表视图。",
    steps: [
      { title: "查看日程", description: "在日历或列表中查看年度日程" },
      { title: "创建日程", description: "添加新的会议或活动" },
      { title: "同步日历", description: "与外部日历同步" },
    ],
    faq: [
      { question: "可以导出日程吗？", answer: "支持导出为Excel或同步到钉钉/飞书日历。" },
    ],
  },
  "/annual-planning": {
    title: "年度规划管理",
    description: "年度项目规划与目标管理",
    overview: "制定和管理年度项目计划，包括目标设定、资源分配和进度追踪。",
    steps: [
      { title: "设定目标", description: "设定年度业务目标和KPI" },
      { title: "分配资源", description: "规划人员和预算资源" },
      { title: "跟踪进度", description: "监控各项目执行进度" },
    ],
    faq: [
      { question: "规划可以调整吗？", answer: "支持通过变更管理流程调整年度规划。" },
    ],
  },
  "/agenda": {
    title: "议程管理",
    description: "会议议程安排与培训计划管理",
    overview: "统一管理各类会议议程、培训计划和年度活动安排。",
    steps: [
      { title: "创建议程", description: "新建会议或培训议程" },
      { title: "分配参与者", description: "添加参会人员和主持人" },
      { title: "跟踪执行", description: "记录会议纪要和行动项" },
    ],
    faq: [
      { question: "如何查看本周会议？", answer: "首页统计卡片显示本周会议数，点击可查看详情。" },
    ],
  },
  "/gantt": {
    title: "甘特图",
    description: "项目进度甘特图可视化",
    overview: "以甘特图形式展示项目任务的时间安排和依赖关系，支持拖拽调整。",
    steps: [
      { title: "选择项目", description: "选择要查看的项目" },
      { title: "查看进度", description: "在甘特图中查看任务进度" },
      { title: "调整计划", description: "拖拽任务条调整时间安排" },
    ],
    faq: [
      { question: "支持导出甘特图吗？", answer: "支持导出为图片或PDF格式。" },
    ],
  },
  "/process-progress": {
    title: "工序进度看板",
    description: "生产工序进度实时监控",
    overview: "实时展示各工序的完成进度、人员效率和异常情况。",
    steps: [
      { title: "选择项目", description: "输入项目ID查看工序进度" },
      { title: "查看看板", description: "查看各工序的完成率和状态" },
      { title: "分析瓶颈", description: "识别效率瓶颈工序" },
    ],
    faq: [
      { question: "数据多久更新一次？", answer: "看板数据每分钟自动刷新，也可手动刷新。" },
    ],
  },
  "/change-management": {
    title: "变更治理中心",
    description: "项目变更请求管理与审批",
    overview: "管理项目变更请求(CR)的全生命周期，包括提交、评审、审批和执行。",
    steps: [
      { title: "提交变更", description: "创建变更请求并填写影响分析" },
      { title: "评审变更", description: "相关方评审变更影响和方案" },
      { title: "执行变更", description: "批准后执行变更并跟踪结果" },
    ],
    faq: [
      { question: "变更需要几级审批？", answer: "根据变更影响等级，分为一级(部门)和二级(跨部门)审批。" },
    ],
  },
  "/intelligent-scheduling": {
    title: "智能排程中心",
    description: "AI智能生产排程与资源优化",
    overview: "利用AI算法自动优化生产排程，考虑设备产能、人员可用性和交付优先级。",
    steps: [
      { title: "导入需求", description: "导入待排程的生产任务" },
      { title: "运行排程", description: "AI自动计算最优排程方案" },
      { title: "确认执行", description: "确认并下发排程计划" },
    ],
    faq: [
      { question: "排程考虑哪些因素？", answer: "考虑设备产能、人员技能、交付时间和物料可用性。" },
    ],
  },
  "/collaboration": {
    title: "实时协作工作台",
    description: "团队多人协作空间",
    overview: "提供多人实时协作的工作台，支持文档协同编辑和实时沟通。",
    steps: [
      { title: "创建空间", description: "创建新的协作空间" },
      { title: "邀请成员", description: "邀请团队成员加入" },
      { title: "协同工作", description: "多人实时编辑和讨论" },
    ],
    faq: [
      { question: "最多支持多少人同时协作？", answer: "单个空间支持最多50人同时在线协作。" },
    ],
  },
  "/tasks": {
    title: "开发任务看板",
    description: "开发任务管理与追踪",
    overview: "管理和追踪开发任务的完整生命周期，支持看板、列表等多种视图。",
    steps: [
      { title: "创建任务", description: "创建新的开发任务" },
      { title: "分配任务", description: "将任务分配给开发人员" },
      { title: "跟踪进度", description: "更新任务状态和工时" },
    ],
    faq: [
      { question: "如何查看逾期任务？", answer: "顶部统计卡片显示逾期任务数，点击可筛选查看。" },
    ],
  },
  "/workflow-management": {
    title: "工作流管理",
    description: "自动化工作流配置与监控",
    overview: "创建和管理自动化工作流，监控执行状态和成功率。",
    steps: [
      { title: "创建工作流", description: "定义工作流的触发条件和执行步骤" },
      { title: "配置动作", description: "设置每个节点的执行动作" },
      { title: "监控执行", description: "查看工作流执行日志和统计" },
    ],
    faq: [
      { question: "工作流失败后会重试吗？", answer: "支持配置自动重试策略，包括重试次数和间隔。" },
    ],
  },
  "/knowledge-graph-approval": {
    title: "知识图谱扩展审批",
    description: "知识图谱自动扩展建议审批",
    overview: "审批和管理AI自动生成的知识图谱扩展建议，确保知识库质量。",
    steps: [
      { title: "查看建议", description: "浏览AI生成的扩展建议" },
      { title: "审核内容", description: "评估建议的准确性和相关性" },
      { title: "批准/拒绝", description: "批准有效建议或拒绝不当内容" },
    ],
    faq: [
      { question: "批准后多久生效？", answer: "批准后立即应用到知识图谱，可在'已应用'标签查看。" },
    ],
  },
  "/meeting-intelligence": {
    title: "会议智能",
    description: "AI驱动的智能会议管理",
    overview: "利用AI技术辅助会议管理，包括自动纪要生成、行动项提取和会议效率分析。",
    steps: [
      { title: "创建会议", description: "设置会议主题和参与者" },
      { title: "AI纪要", description: "会议结束后AI自动生成纪要" },
      { title: "跟踪行动项", description: "追踪会议产生的行动项" },
    ],
    faq: [
      { question: "AI纪要准确吗？", answer: "AI纪要准确率约90%，可以人工编辑和修正。" },
    ],
  },

  // ========== Batch H: 工程/BOM/POS/清洗 ==========
  "/bom-excel-import": {
    title: "BOM Excel导入",
    description: "通过Excel批量导入BOM数据",
    overview: "支持通过Excel模板批量导入BOM(物料清单)数据，包含数据校验和错误提示。",
    steps: [
      { title: "下载模板", description: "下载标准BOM Excel模板" },
      { title: "填写数据", description: "按模板格式填写BOM数据" },
      { title: "上传导入", description: "上传Excel文件并确认导入" },
    ],
    faq: [
      { question: "支持什么格式？", answer: "支持.xlsx和.xls格式的Excel文件。" },
    ],
  },
  "/bom-import": {
    title: "BOM导入",
    description: "BOM数据导入管理",
    overview: "管理BOM数据的导入记录，查看导入历史和统计信息。",
    steps: [
      { title: "选择导入方式", description: "选择Excel导入或API同步" },
      { title: "数据校验", description: "系统自动校验数据格式和完整性" },
      { title: "确认导入", description: "确认数据无误后执行导入" },
    ],
    faq: [
      { question: "导入失败怎么办？", answer: "可查看错误详情，修正后重新导入失败的记录。" },
    ],
  },
  "/bom-verification": {
    title: "BOM验证",
    description: "BOM数据完整性验证",
    overview: "对导入的BOM数据进行完整性和一致性验证，确保数据质量。",
    steps: [
      { title: "选择BOM", description: "选择要验证的BOM数据" },
      { title: "运行验证", description: "执行自动化验证规则" },
      { title: "查看结果", description: "查看验证报告并处理异常" },
    ],
    faq: [
      { question: "验证包含哪些检查？", answer: "包括层级完整性、物料编码有效性、数量合理性等检查。" },
    ],
  },
  "/engineer-checkpoints": {
    title: "工程师检查点",
    description: "工程检查点管理与审批",
    overview: "管理项目各阶段的工程检查点，包括审批流程和状态跟踪。",
    steps: [
      { title: "创建检查点", description: "为项目阶段创建检查点" },
      { title: "提交审批", description: "完成检查后提交审批" },
      { title: "查看结果", description: "查看审批状态和反馈" },
    ],
    faq: [
      { question: "检查点通过率如何计算？", answer: "通过率 = 已通过数 / 总提交数 × 100%。" },
    ],
  },
  "/gemini-spec": {
    title: "Gemini规格书",
    description: "Gemini项目规格书管理",
    overview: "管理Gemini项目的规格书文档，支持版本管理和协同编辑。",
    steps: [
      { title: "创建规格书", description: "基于模板创建新的规格书" },
      { title: "编辑内容", description: "填写技术参数和要求" },
      { title: "审核发布", description: "提交审核后正式发布" },
    ],
    faq: [
      { question: "规格书支持版本对比吗？", answer: "支持，可对比任意两个版本的差异。" },
    ],
  },
  "/deployment-spec": {
    title: "部署规格",
    description: "系统部署技术规格管理",
    overview: "管理系统部署的技术规格文档，包括环境要求、配置参数和部署步骤。",
    steps: [
      { title: "查看规格", description: "查看当前部署规格文档" },
      { title: "编辑配置", description: "更新部署参数和配置" },
      { title: "导出文档", description: "导出部署规格书" },
    ],
    faq: [
      { question: "支持快捷键吗？", answer: "支持，查看顶部操作区的快捷键提示。" },
    ],
  },
  "/fat-coordination": {
    title: "FAT协调工作台",
    description: "工厂验收测试协调管理",
    overview: "协调和管理工厂验收测试(FAT)的全过程，包括计划、执行和报告。",
    steps: [
      { title: "制定计划", description: "创建FAT测试计划和用例" },
      { title: "执行测试", description: "记录测试执行结果" },
      { title: "生成报告", description: "生成FAT测试报告" },
    ],
    faq: [
      { question: "FAT和SAT有什么区别？", answer: "FAT是工厂验收测试，SAT是现场验收测试，FAT在出厂前进行。" },
    ],
  },
  "/gate-checklist-settings": {
    title: "Gate检查清单配置",
    description: "Stage Gate检查项配置管理",
    overview: "配置各阶段Gate评审的检查清单项，定义必选项和评分标准。",
    steps: [
      { title: "选择Gate", description: "选择要配置的Gate阶段" },
      { title: "编辑检查项", description: "添加或修改检查清单项" },
      { title: "设置规则", description: "配置必选项和评分权重" },
    ],
    faq: [
      { question: "可以按项目类型配置不同清单吗？", answer: "支持，可为不同项目类型设置独立的检查清单模板。" },
    ],
  },
  "/architecture": {
    title: "架构规划",
    description: "系统架构设计与规划",
    overview: "管理系统架构设计文档，包括技术选型、模块划分和接口定义。",
    steps: [
      { title: "查看架构", description: "查看当前系统架构图" },
      { title: "编辑设计", description: "更新架构设计文档" },
      { title: "下载文档", description: "导出架构设计文档" },
    ],
    faq: [
      { question: "架构文档支持协同编辑吗？", answer: "支持，多人可同时编辑不同章节。" },
    ],
  },
  "/model-explainability": {
    title: "模型可解释性报告",
    description: "AI模型决策可解释性分析",
    overview: "展示AI模型的决策过程和可解释性分析报告，帮助理解模型预测逻辑。",
    steps: [
      { title: "选择模型", description: "选择要分析的AI模型" },
      { title: "查看报告", description: "查看特征重要性和决策路径" },
      { title: "导出报告", description: "导出可解释性分析报告" },
    ],
    faq: [
      { question: "支持哪些解释方法？", answer: "支持SHAP值、特征重要性排序和决策树可视化。" },
    ],
  },
  "/pos/connectors": {
    title: "连接器配置",
    description: "第三方系统连接器管理",
    overview: "配置和管理与第三方系统的数据连接，支持多种连接协议。",
    steps: [
      { title: "添加连接器", description: "创建新的系统连接" },
      { title: "配置参数", description: "设置连接参数和认证信息" },
      { title: "测试连接", description: "验证连接是否正常" },
    ],
    faq: [
      { question: "支持哪些连接协议？", answer: "支持REST API、GraphQL、SOAP和数据库直连。" },
    ],
  },
  "/pos/customers": {
    title: "客户管理",
    description: "POS客户画像与分析",
    overview: "管理POS系统中的客户信息，包括客户画像、决策结构和项目关联。",
    steps: [
      { title: "添加客户", description: "录入客户基本信息" },
      { title: "完善画像", description: "补充决策人和组织结构" },
      { title: "关联项目", description: "将客户与项目关联" },
    ],
    faq: [
      { question: "客户等级如何划分？", answer: "按年度采购额和合作深度分为Tier1/Tier2/Tier3。" },
    ],
  },
  "/cleaning-trajectory-3d": {
    title: "清洗轨迹3D可视化",
    description: "清洗轨迹三维可视化展示",
    overview: "以3D方式展示清洗设备的运动轨迹和覆盖范围。",
    steps: [
      { title: "选择记录", description: "选择要查看的清洗记录" },
      { title: "3D查看", description: "在3D视图中查看轨迹" },
      { title: "分析覆盖", description: "分析清洗覆盖率" },
    ],
    faq: [
      { question: "需要特殊浏览器吗？", answer: "需要支持WebGL的现代浏览器，推荐Chrome。" },
    ],
  },
  "/grt-cleaning-strategy": {
    title: "GRT清洗策略动作库",
    description: "清洗策略配置与动作管理",
    overview: "管理GRT清洗设备的策略库，定义清洗动作序列和参数。",
    steps: [
      { title: "查看策略", description: "浏览现有清洗策略" },
      { title: "创建策略", description: "定义新的清洗策略" },
      { title: "验证测试", description: "通过模拟验证策略效果" },
    ],
    faq: [
      { question: "策略可以复用吗？", answer: "支持，可以基于现有策略创建副本并修改。" },
    ],
  },
  "/toothpaste-test": {
    title: "牙膏试验数据录入",
    description: "牙膏清洗试验数据采集",
    overview: "录入清洗设备牙膏试验的测试数据，包括参数和结果。",
    steps: [
      { title: "选择工位", description: "选择测试工位和设备" },
      { title: "录入数据", description: "输入试验参数和测试结果" },
      { title: "提交保存", description: "确认数据后提交保存" },
    ],
    faq: [
      { question: "数据可以修改吗？", answer: "提交前可以修改，提交后需要管理员审批才能修改。" },
    ],
  },
  "/toothpaste-test-history": {
    title: "牙膏试验历史记录",
    description: "历史试验数据查询与分析",
    overview: "查询和分析历史牙膏试验数据，支持趋势分析和对比。",
    steps: [
      { title: "筛选条件", description: "按时间、工位等条件筛选" },
      { title: "查看数据", description: "查看历史试验记录" },
      { title: "导出报告", description: "导出试验数据报告" },
    ],
    faq: [
      { question: "可以对比不同批次吗？", answer: "支持，选择多条记录后可进行批次间对比分析。" },
    ],
  },

  // ========== Batch K: 集成/配置 ==========
  "/cron-monitor": {
    title: "定时任务监控",
    description: "系统定时任务状态监控",
    overview: "监控所有定时任务的运行状态、执行历史和错误日志。",
    steps: [
      { title: "查看任务列表", description: "浏览所有定时任务及其状态" },
      { title: "查看执行历史", description: "查看任务的执行记录" },
      { title: "处理异常", description: "排查和处理任务异常" },
    ],
    faq: [
      { question: "任务失败会通知吗？", answer: "会，支持钉钉、邮件等多渠道告警通知。" },
    ],
  },
  "/admin/dingtalk-settings": {
    title: "钉钉设置",
    description: "钉钉集成配置管理",
    overview: "配置钉钉机器人、通知渠道和消息模板。",
    steps: [
      { title: "配置机器人", description: "添加钉钉群机器人" },
      { title: "设置模板", description: "配置消息通知模板" },
      { title: "测试发送", description: "测试消息推送" },
    ],
    faq: [
      { question: "支持多个群吗？", answer: "支持，可配置多个群机器人并按场景分配。" },
    ],
  },
  "/admin/erp-configuration": {
    title: "ERP连接配置",
    description: "ERP系统连接配置管理",
    overview: "配置SAP、Oracle、金蝶等ERP系统的数据同步连接。",
    steps: [
      { title: "添加连接", description: "配置ERP连接参数" },
      { title: "测试连接", description: "验证连接是否正常" },
      { title: "数据同步", description: "执行增量或全量同步" },
    ],
    faq: [
      { question: "支持哪些ERP系统？", answer: "支持SAP、Oracle、金蝶和自定义ERP系统。" },
    ],
  },
  "/admin/erp-connection": {
    title: "ERP连接管理",
    description: "ERP系统连接状态管理",
    overview: "管理和监控ERP系统连接的健康状态和同步日志。",
    steps: [
      { title: "查看连接", description: "查看所有ERP连接状态" },
      { title: "检查同步", description: "查看数据同步日志" },
      { title: "排查问题", description: "诊断并修复连接问题" },
    ],
    faq: [
      { question: "同步冲突如何处理？", answer: "系统会标记冲突记录，由管理员手动处理。" },
    ],
  },
  "/jiandaoyun": {
    title: "简道云分析",
    description: "简道云数据分析与报表",
    overview: "对接简道云平台数据，提供数据分析和可视化报表。",
    steps: [
      { title: "连接数据源", description: "配置简道云API连接" },
      { title: "选择表单", description: "选择要分析的表单数据" },
      { title: "生成报表", description: "生成数据分析报表" },
    ],
    faq: [
      { question: "数据实时同步吗？", answer: "支持定时同步和手动刷新两种模式。" },
    ],
  },
  "/jiandaoyun-integration": {
    title: "简道云集成",
    description: "简道云系统集成配置",
    overview: "配置与简道云平台的数据集成，支持双向数据同步。",
    steps: [
      { title: "配置连接", description: "设置API密钥和权限" },
      { title: "映射字段", description: "配置字段映射关系" },
      { title: "启动同步", description: "启动数据同步任务" },
    ],
    faq: [
      { question: "支持双向同步吗？", answer: "支持，可配置GRT到简道云和简道云到GRT的双向同步。" },
    ],
  },
  "/migration": {
    title: "迁移任务",
    description: "系统数据迁移任务管理",
    overview: "管理系统间的数据迁移任务，支持增量和全量迁移。",
    steps: [
      { title: "创建任务", description: "配置迁移源和目标" },
      { title: "预览数据", description: "预览将要迁移的数据" },
      { title: "执行迁移", description: "执行迁移任务并监控进度" },
    ],
    faq: [
      { question: "迁移过程中可以回滚吗？", answer: "支持，系统会自动创建回滚点。" },
    ],
  },
  "/naming-rules": {
    title: "命名规则管理",
    description: "系统编码命名规则配置",
    overview: "管理系统中各类编码的命名规则，确保编码规范统一。",
    steps: [
      { title: "查看规则", description: "浏览现有命名规则" },
      { title: "编辑规则", description: "修改命名规则模板" },
      { title: "验证规则", description: "测试规则是否生效" },
    ],
    faq: [
      { question: "修改规则会影响现有编码吗？", answer: "不会，规则只对新创建的编码生效。" },
    ],
  },
  "/notification-aggregation-config": {
    title: "消息聚合配置",
    description: "通知消息聚合规则配置",
    overview: "配置消息聚合规则，减少重复通知，提升消息质量。",
    steps: [
      { title: "创建规则", description: "定义消息聚合规则" },
      { title: "设置条件", description: "配置聚合条件和时间窗口" },
      { title: "测试预览", description: "预览聚合效果" },
    ],
    faq: [
      { question: "聚合会丢失消息吗？", answer: "不会，聚合只合并展示方式，所有原始消息都保留。" },
    ],
  },
  "/notification-aggregation": {
    title: "消息聚合预览",
    description: "聚合通知效果预览",
    overview: "预览消息聚合后的展示效果，确认聚合规则是否符合预期。",
    steps: [
      { title: "选择规则", description: "选择要预览的聚合规则" },
      { title: "查看效果", description: "查看聚合前后的对比" },
      { title: "调整优化", description: "根据预览结果调整规则" },
    ],
    faq: [
      { question: "预览是实时数据吗？", answer: "是，使用最近24小时的真实通知数据。" },
    ],
  },
  "/scheduler": {
    title: "调度管理",
    description: "系统任务调度配置",
    overview: "管理系统中的定时任务调度，包括创建、暂停和监控调度任务。",
    steps: [
      { title: "创建调度", description: "配置调度任务和执行周期" },
      { title: "管理任务", description: "暂停、恢复或删除调度" },
      { title: "查看日志", description: "查看任务执行日志" },
    ],
    faq: [
      { question: "支持Cron表达式吗？", answer: "支持，可使用标准Cron表达式定义执行周期。" },
    ],
  },
  "/webhook": {
    title: "Webhook管理",
    description: "Webhook事件订阅管理",
    overview: "配置和管理系统Webhook，支持事件订阅和回调通知。",
    steps: [
      { title: "创建Webhook", description: "配置回调URL和事件类型" },
      { title: "设置认证", description: "配置签名密钥和认证方式" },
      { title: "测试回调", description: "发送测试事件验证配置" },
    ],
    faq: [
      { question: "Webhook失败会重试吗？", answer: "会，默认重试3次，间隔递增。" },
    ],
  },
  "/webhook-settings": {
    title: "Webhook设置",
    description: "Webhook全局配置",
    overview: "配置Webhook的全局参数，包括超时、重试策略和日志保留。",
    steps: [
      { title: "配置参数", description: "设置全局超时和重试策略" },
      { title: "管理密钥", description: "管理签名密钥" },
      { title: "查看日志", description: "查看全局调用日志" },
    ],
    faq: [
      { question: "日志保留多久？", answer: "默认保留30天，可在设置中调整。" },
    ],
  },
  "/admin/webhooks": {
    title: "Webhook管理后台",
    description: "管理员Webhook配置",
    overview: "管理员级别的Webhook配置和监控，支持全局管理所有Webhook。",
    steps: [
      { title: "查看所有Webhook", description: "浏览系统中所有已配置的Webhook" },
      { title: "管理配置", description: "编辑或删除Webhook配置" },
      { title: "监控状态", description: "监控Webhook调用状态和成功率" },
    ],
    faq: [
      { question: "可以批量管理吗？", answer: "支持批量启用、禁用和删除操作。" },
    ],
  },
  "/group-notifications": {
    title: "群组通知管理",
    description: "群组消息通知配置",
    overview: "管理各群组的通知配置，包括消息类型、发送频率和接收人。",
    steps: [
      { title: "选择群组", description: "选择要配置的群组" },
      { title: "配置规则", description: "设置通知规则和模板" },
      { title: "测试发送", description: "发送测试通知" },
    ],
    faq: [
      { question: "支持哪些群组类型？", answer: "支持钉钉群、企业微信群和飞书群。" },
    ],
  },
  "/settings/microsoft-graph": {
    title: "Microsoft Graph设置",
    description: "Microsoft Graph API配置",
    overview: "配置Microsoft Graph API连接，用于Office 365集成。",
    steps: [
      { title: "注册应用", description: "在Azure AD中注册应用" },
      { title: "配置权限", description: "设置API权限和范围" },
      { title: "测试连接", description: "验证API连接是否正常" },
    ],
    faq: [
      { question: "需要Azure订阅吗？", answer: "需要Azure AD租户，用于OAuth2认证。" },
    ],
  },
  "/settings/social-platform": {
    title: "社交平台设置",
    description: "社交平台集成配置",
    overview: "配置微信、钉钉等社交平台的集成参数。",
    steps: [
      { title: "选择平台", description: "选择要配置的社交平台" },
      { title: "配置参数", description: "设置AppID、密钥等参数" },
      { title: "测试集成", description: "测试平台连接" },
    ],
    faq: [
      { question: "支持哪些平台？", answer: "支持微信、企业微信、钉钉和飞书。" },
    ],
  },
  "/production/notification-channels": {
    title: "通知渠道设置",
    description: "生产通知渠道配置",
    overview: "配置生产系统的通知渠道，支持多种告警方式。",
    steps: [
      { title: "添加渠道", description: "配置新的通知渠道" },
      { title: "设置模板", description: "定义通知消息模板" },
      { title: "测试推送", description: "发送测试通知验证配置" },
    ],
    faq: [
      { question: "渠道故障有备选吗？", answer: "支持配置备用渠道，主渠道故障时自动切换。" },
    ],
  },

  // ========== Batch L: 业务/财务/合规 ==========
  "/after-sales-advanced": {
    title: "售后服务高级功能",
    description: "售后服务高级分析与管理",
    overview: "提供售后服务的高级分析功能，包括服务趋势、客户满意度和SLA监控。",
    steps: [
      { title: "查看概览", description: "查看售后服务关键指标" },
      { title: "分析趋势", description: "分析服务请求趋势" },
      { title: "优化流程", description: "基于数据优化服务流程" },
    ],
    faq: [
      { question: "SLA违规会通知吗？", answer: "会，系统自动监控SLA并在接近违规时告警。" },
    ],
  },
  "/after-sales": {
    title: "售后服务管理",
    description: "售后服务工单管理",
    overview: "管理售后服务工单的全生命周期，从创建到关闭。",
    steps: [
      { title: "创建工单", description: "录入客户服务请求" },
      { title: "分配处理", description: "将工单分配给服务工程师" },
      { title: "跟踪关闭", description: "跟踪处理进度直至关闭" },
    ],
    faq: [
      { question: "工单优先级如何确定？", answer: "根据客户等级和问题类型自动计算优先级。" },
    ],
  },
  "/business-units": {
    title: "事业部管理",
    description: "事业部信息与绩效管理",
    overview: "管理各事业部的基本信息、绩效指标和关键业绩数据。",
    steps: [
      { title: "查看事业部", description: "浏览所有事业部列表" },
      { title: "编辑信息", description: "更新事业部基本信息" },
      { title: "查看绩效", description: "查看各事业部KPI达成情况" },
    ],
    faq: [
      { question: "如何添加新事业部？", answer: "点击'创建事业部'按钮，填写基本信息后提交。" },
    ],
  },
  "/bu-team-management": {
    title: "BU团队管理",
    description: "事业部人员管理与映射",
    overview: "管理事业部人员配置，支持自动匹配和手动映射。",
    steps: [
      { title: "查看人员", description: "查看各BU的人员配置" },
      { title: "自动匹配", description: "使用AI自动匹配人员归属" },
      { title: "手动调整", description: "手动调整人员映射关系" },
    ],
    faq: [
      { question: "自动匹配准确率如何？", answer: "基于历史数据，匹配准确率约95%。" },
    ],
  },
  "/capability-management": {
    title: "能力管理",
    description: "组织能力评估与管理",
    overview: "评估和管理组织各项能力指标，支持能力差距分析和提升计划。",
    steps: [
      { title: "评估能力", description: "对各项能力指标进行评估" },
      { title: "分析差距", description: "识别能力差距和改进方向" },
      { title: "制定计划", description: "制定能力提升计划" },
    ],
    faq: [
      { question: "评估周期是多久？", answer: "建议每季度评估一次，年度进行全面评估。" },
    ],
  },
  "/ccd-integration": {
    title: "CCD视觉检测集成",
    description: "CCD视觉检测系统数据集成",
    overview: "集成CCD视觉检测设备的数据，实时获取检测结果和统计信息。",
    steps: [
      { title: "配置设备", description: "注册CCD检测设备" },
      { title: "数据同步", description: "同步检测数据到系统" },
      { title: "查看结果", description: "查看检测结果和统计" },
    ],
    faq: [
      { question: "支持哪些CCD品牌？", answer: "支持海康、大华等主流CCD品牌设备。" },
    ],
  },
  "/ccd-realtime": {
    title: "CCD检测实时推送",
    description: "CCD检测结果实时监控",
    overview: "实时接收和展示CCD视觉检测结果，支持异常告警。",
    steps: [
      { title: "连接设备", description: "确认CCD设备连接状态" },
      { title: "实时监控", description: "查看实时检测数据流" },
      { title: "处理异常", description: "处理检测异常告警" },
    ],
    faq: [
      { question: "推送延迟大吗？", answer: "通常在1秒内，依赖网络环境。" },
    ],
  },
  "/certification-management": {
    title: "资质管理中心",
    description: "企业资质证书管理",
    overview: "管理企业各类资质证书，包括有效期提醒和续期跟踪。",
    steps: [
      { title: "录入证书", description: "录入资质证书信息" },
      { title: "设置提醒", description: "配置到期提醒规则" },
      { title: "续期管理", description: "管理证书续期流程" },
    ],
    faq: [
      { question: "证书到期前多久提醒？", answer: "默认提前30天和7天各提醒一次，可自定义。" },
    ],
  },
  "/admin/certificates": {
    title: "证书模板管理",
    description: "能力证书模板配置",
    overview: "管理能力认证证书的模板，包括布局设计和字段配置。",
    steps: [
      { title: "创建模板", description: "设计新的证书模板" },
      { title: "配置字段", description: "定义证书中的动态字段" },
      { title: "预览发布", description: "预览证书效果后发布" },
    ],
    faq: [
      { question: "模板支持自定义logo吗？", answer: "支持，可上传企业logo和自定义背景图。" },
    ],
  },
  "/compliance-dashboard": {
    title: "合规仪表盘",
    description: "跨国合规监控与管理",
    overview: "监控企业合规状态，包括数据合规、贸易合规和审计报告。",
    steps: [
      { title: "查看概览", description: "查看合规状态总览" },
      { title: "处理预警", description: "处理合规风险预警" },
      { title: "生成报告", description: "生成合规审计报告" },
    ],
    faq: [
      { question: "支持哪些合规标准？", answer: "支持GDPR、SOX、中国网络安全法等主要合规标准。" },
    ],
  },
  "/compliance/rules-config": {
    title: "合规规则配置",
    description: "合规检查规则管理",
    overview: "配置合规检查规则，定义检查项、阈值和处理流程。",
    steps: [
      { title: "创建规则", description: "定义合规检查规则" },
      { title: "设置阈值", description: "配置告警阈值和处理流程" },
      { title: "启用规则", description: "激活规则开始自动检查" },
    ],
    faq: [
      { question: "规则变更需要审批吗？", answer: "需要，合规规则变更需要合规官审批。" },
    ],
  },
  "/expense-comparison": {
    title: "费用对比",
    description: "多维度费用对比分析",
    overview: "对比分析不同时期、部门、项目的费用数据。",
    steps: [
      { title: "选择维度", description: "选择对比维度和时间范围" },
      { title: "查看对比", description: "查看费用对比图表" },
      { title: "导出报表", description: "导出对比分析报表" },
    ],
    faq: [
      { question: "支持同比环比吗？", answer: "支持，可选择同比(年)和环比(月)两种对比方式。" },
    ],
  },
  "/expense-forecast": {
    title: "费用预测",
    description: "AI驱动的费用预测分析",
    overview: "基于历史数据和AI模型预测未来费用趋势。",
    steps: [
      { title: "选择范围", description: "选择预测的费用类别和时间" },
      { title: "查看预测", description: "查看AI生成的预测结果" },
      { title: "调整参数", description: "调整预测模型参数" },
    ],
    faq: [
      { question: "预测准确度如何？", answer: "历史验证准确度约85%，随数据积累持续提升。" },
    ],
  },
  "/expense-report": {
    title: "费用报告",
    description: "费用统计报表生成",
    overview: "生成各类费用统计报表，支持自定义报表模板。",
    steps: [
      { title: "选择模板", description: "选择报表模板或自定义" },
      { title: "设置参数", description: "配置时间范围和筛选条件" },
      { title: "生成导出", description: "生成报表并导出" },
    ],
    faq: [
      { question: "报表可以定时发送吗？", answer: "可以，在报表调度中配置定时生成和发送。" },
    ],
  },
  "/expense-report-scheduler": {
    title: "费用报告调度",
    description: "费用报表定时生成配置",
    overview: "配置费用报表的自动生成和发送调度。",
    steps: [
      { title: "创建调度", description: "配置报表生成周期" },
      { title: "设置收件人", description: "添加报表接收人" },
      { title: "启动调度", description: "激活自动调度任务" },
    ],
    faq: [
      { question: "最短调度周期是多少？", answer: "支持每日、每周、每月三种调度周期。" },
    ],
  },
  "/global-growth-tracker": {
    title: "全球增长追踪",
    description: "全球业务增长数据追踪",
    overview: "追踪和分析全球各区域的业务增长数据。",
    steps: [
      { title: "选择区域", description: "选择要查看的业务区域" },
      { title: "查看数据", description: "查看增长趋势和关键指标" },
      { title: "对比分析", description: "区域间增长数据对比" },
    ],
    faq: [
      { question: "数据来源是什么？", answer: "数据来自各区域ERP和CRM系统的自动同步。" },
    ],
  },
  "/quotation-create": {
    title: "报价生成",
    description: "AI辅助报价生成",
    overview: "利用AI辅助生成报价方案，支持智能定价和竞品分析。",
    steps: [
      { title: "输入需求", description: "输入客户需求和项目参数" },
      { title: "AI生成", description: "AI自动生成报价方案" },
      { title: "调整提交", description: "人工调整后提交审批" },
    ],
    faq: [
      { question: "AI报价依据什么？", answer: "基于历史成交价、成本模型和市场数据综合计算。" },
    ],
  },
  "/travel-dashboard": {
    title: "差旅仪表盘",
    description: "差旅费用统计与分析",
    overview: "展示差旅相关的费用统计和趋势分析。",
    steps: [
      { title: "查看统计", description: "查看差旅费用总览" },
      { title: "分析趋势", description: "分析差旅费用趋势" },
      { title: "管理预算", description: "监控差旅预算执行" },
    ],
    faq: [
      { question: "可以按部门查看吗？", answer: "支持按部门、项目和人员等维度查看。" },
    ],
  },
  "/trip-request": {
    title: "出差申请",
    description: "出差申请提交与审批",
    overview: "提交出差申请，包括行程安排、预算估算和审批流程。",
    steps: [
      { title: "填写申请", description: "填写出差目的、行程和预算" },
      { title: "提交审批", description: "提交给上级审批" },
      { title: "跟踪状态", description: "查看审批进度" },
    ],
    faq: [
      { question: "审批需要多久？", answer: "一般1-2个工作日，紧急出差可走加急流程。" },
    ],
  },

  // ========== Batch M: IoT/UWB/文档/杂项 ==========
  "/iot-dashboard": {
    title: "物联网仪表盘",
    description: "IoT设备监控与管理",
    overview: "实时监控IoT设备状态，展示设备数据和告警信息。",
    steps: [
      { title: "选择设备", description: "选择要监控的设备组" },
      { title: "查看数据", description: "查看设备实时数据" },
      { title: "处理告警", description: "响应设备异常告警" },
    ],
    faq: [
      { question: "设备离线会通知吗？", answer: "会，设备离线超过5分钟自动触发告警。" },
    ],
  },
  "/uwb-management": {
    title: "UWB定位系统管理",
    description: "UWB室内定位系统管理",
    overview: "管理UWB定位标签和基站，监控定位精度和设备状态。",
    steps: [
      { title: "管理设备", description: "添加和管理UWB标签和基站" },
      { title: "查看定位", description: "查看实时定位地图" },
      { title: "分析数据", description: "分析定位数据和轨迹" },
    ],
    faq: [
      { question: "定位精度是多少？", answer: "在良好环境下精度可达10-30cm。" },
    ],
  },
  "/production/uwb-devices": {
    title: "UWB设备管理",
    description: "UWB硬件设备配置管理",
    overview: "管理UWB定位系统的硬件设备，包括基站、标签和中继器。",
    steps: [
      { title: "添加设备", description: "注册新的UWB设备" },
      { title: "配置参数", description: "设置设备参数和分组" },
      { title: "监控状态", description: "监控设备在线状态和电量" },
    ],
    faq: [
      { question: "设备固件可以远程升级吗？", answer: "支持，可通过管理界面远程推送固件更新。" },
    ],
  },
  "/worker-import": {
    title: "工人数据导入",
    description: "批量导入工人信息",
    overview: "通过Excel批量导入工人基本信息和技能数据。",
    steps: [
      { title: "下载模板", description: "下载标准导入模板" },
      { title: "准备数据", description: "按模板格式填写工人数据" },
      { title: "上传导入", description: "上传文件并确认导入" },
    ],
    faq: [
      { question: "重复数据怎么处理？", answer: "系统自动识别重复记录，可选择覆盖或跳过。" },
    ],
  },
  "/worker-management": {
    title: "工人管理",
    description: "产线工人信息管理",
    overview: "管理产线工人的基本信息、技能等级、考勤和绩效数据。",
    steps: [
      { title: "查看工人", description: "浏览工人列表和详细信息" },
      { title: "管理技能", description: "更新工人技能等级和认证" },
      { title: "查看绩效", description: "查看工人绩效排行" },
    ],
    faq: [
      { question: "如何批量导入工人？", answer: "使用'工人数据导入'功能可通过Excel批量导入。" },
    ],
  },
  "/m/field-dashboard": {
    title: "现场工程师工作台",
    description: "现场工程师移动端工作台",
    overview: "现场工程师的专属工作台，支持现场任务管理和数据采集。",
    steps: [
      { title: "查看任务", description: "查看今日待办任务" },
      { title: "现场记录", description: "记录现场情况和数据" },
      { title: "提交报告", description: "提交现场工作报告" },
    ],
    faq: [
      { question: "支持离线使用吗？", answer: "基本功能支持离线，联网后自动同步数据。" },
    ],
  },
  "/certificate-verify": {
    title: "能力证书验证",
    description: "在线证书真伪验证",
    overview: "验证能力认证证书的真实性和有效期。",
    steps: [
      { title: "输入编号", description: "输入证书编号" },
      { title: "查看结果", description: "查看验证结果和证书详情" },
    ],
    faq: [
      { question: "支持扫码验证吗？", answer: "支持，证书上的二维码可直接扫码验证。" },
    ],
  },
  "/docs/guide": {
    title: "指南阅读器",
    description: "系统指南文档阅读",
    overview: "在线阅读系统使用指南和操作手册。",
    steps: [
      { title: "选择文档", description: "选择要阅读的指南文档" },
      { title: "阅读内容", description: "阅读文档内容" },
      { title: "打印/导出", description: "打印或导出文档" },
    ],
    faq: [
      { question: "文档可以下载吗？", answer: "支持下载PDF格式的离线文档。" },
    ],
  },
  "/docs": {
    title: "文档中心",
    description: "系统文档与知识库",
    overview: "系统所有文档的统一入口，包括使用手册、API文档和最佳实践。",
    steps: [
      { title: "搜索文档", description: "按关键词搜索相关文档" },
      { title: "浏览分类", description: "按分类浏览文档列表" },
      { title: "阅读文档", description: "点击查看文档详情" },
    ],
    faq: [
      { question: "可以贡献文档吗？", answer: "可以，在文档详情页点击'编辑'按钮提交修改建议。" },
    ],
  },
  "/subsystem-help": {
    title: "子系统操作手册",
    description: "各子系统操作指南",
    overview: "提供各子系统的详细操作手册和最佳实践指南。",
    steps: [
      { title: "选择子系统", description: "选择要查看的子系统" },
      { title: "查看手册", description: "阅读操作手册内容" },
      { title: "实践操作", description: "按手册步骤进行操作" },
    ],
    faq: [
      { question: "手册有视频教程吗？", answer: "部分模块提供视频教程，标记有视频图标。" },
    ],
  },
  "/gamification": {
    title: "成就系统",
    description: "用户成就与积分系统",
    overview: "展示用户的成就徽章、积分排行和挑战进度。",
    steps: [
      { title: "查看成就", description: "查看已获得和待解锁的成就" },
      { title: "参与挑战", description: "参加各类积分挑战活动" },
      { title: "兑换奖励", description: "使用积分兑换奖励" },
    ],
    faq: [
      { question: "积分怎么获得？", answer: "完成任务、参加培训、贡献文档等都可以获得积分。" },
    ],
  },
  "/live-documents": {
    title: "活文档管理",
    description: "实时更新的活文档系统",
    overview: "管理可实时更新的活文档，支持版本追踪和协同编辑。",
    steps: [
      { title: "创建文档", description: "创建新的活文档" },
      { title: "编辑内容", description: "在线编辑文档内容" },
      { title: "发布版本", description: "发布文档新版本" },
    ],
    faq: [
      { question: "活文档和普通文档的区别？", answer: "活文档支持嵌入实时数据源，内容随数据自动更新。" },
    ],
  },
  "/notebook-search": {
    title: "笔记搜索与导出",
    description: "笔记全文搜索和批量导出",
    overview: "对系统中的笔记进行全文搜索，支持高级筛选和批量导出。",
    steps: [
      { title: "输入关键词", description: "输入搜索关键词" },
      { title: "筛选结果", description: "使用标签和日期筛选" },
      { title: "导出笔记", description: "选择笔记批量导出" },
    ],
    faq: [
      { question: "支持哪些导出格式？", answer: "支持PDF、Markdown和Word格式。" },
    ],
  },
  "/red-blue-board": {
    title: "红蓝对抗看板",
    description: "红蓝对抗项目管理看板",
    overview: "管理红蓝对抗项目的攻防进度，跟踪问题发现和解决。",
    steps: [
      { title: "选择项目", description: "选择红蓝对抗项目" },
      { title: "查看进度", description: "查看攻防双方进度" },
      { title: "处理问题", description: "记录和解决发现的问题" },
    ],
    faq: [
      { question: "红蓝对抗是什么？", answer: "红队模拟攻击，蓝队负责防御，用于评估系统安全性。" },
    ],
  },
  "/translation-contribute": {
    title: "翻译贡献",
    description: "多语言翻译协作平台",
    overview: "参与系统多语言翻译工作，提交翻译建议和审核翻译质量。",
    steps: [
      { title: "选择语言", description: "选择要翻译的目标语言" },
      { title: "提交翻译", description: "对未翻译内容提交翻译" },
      { title: "审核翻译", description: "审核其他人的翻译建议" },
    ],
    faq: [
      { question: "翻译被采纳有奖励吗？", answer: "有，每条被采纳的翻译可获得积分奖励。" },
    ],
  },
};

/**
 * 获取当前路由的帮助内容
 * 支持精确匹配和前缀匹配
 */
export function getHelpContent(path: string): PageHelpContent | null {
  // 精确匹配
  if (helpContentMap[path]) {
    return helpContentMap[path];
  }

  // 前缀匹配（处理带参数的路由如 /projects/123）
  const pathParts = path.split('/').filter(Boolean);
  while (pathParts.length > 0) {
    const testPath = '/' + pathParts.join('/');
    if (helpContentMap[testPath]) {
      return helpContentMap[testPath];
    }
    pathParts.pop();
  }

  return null;
}

/**
 * 默认帮助内容（未配置页面使用）
 */
export const defaultHelpContent: PageHelpContent = {
  title: "帮助",
  description: "当前页面帮助内容",
  overview: "该页面的帮助内容正在完善中。如需帮助，请访问帮助中心或联系AI助手。",
  steps: [
    { title: "查看帮助中心", description: "在侧边栏找到「帮助中心」获取更多信息" },
    { title: "联系AI助手", description: "点击右下角的AI助手按钮获取智能帮助" },
  ],
  faq: [
    { question: "如何获取帮助？", answer: "您可以通过帮助中心、AI助手或联系管理员获取帮助。" },
  ],
};
