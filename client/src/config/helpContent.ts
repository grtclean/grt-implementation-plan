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
