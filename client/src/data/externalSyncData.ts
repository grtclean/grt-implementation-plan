// 表单字段详情数据 - M0到M12完整数据
export const formFieldsData: Record<string, { name: string; nameEn: string; type: string; required: boolean; desc: string }[]> = {
  // M0 市场触达与线索
  "M0-1": [
    { name: "客户名称", nameEn: "Customer Name", type: "文本", required: true, desc: "客户公司全称" },
    { name: "客户简称", nameEn: "Short Name", type: "文本", required: false, desc: "客户简称" },
    { name: "客户类型", nameEn: "Customer Type", type: "单选", required: true, desc: "终端客户/集成商/代理商" },
    { name: "行业", nameEn: "Industry", type: "单选", required: true, desc: "所属行业分类" },
    { name: "客户来源", nameEn: "Source", type: "单选", required: false, desc: "客户获取渠道" },
    { name: "客户等级", nameEn: "Level", type: "单选", required: false, desc: "A/B/C/D等级" },
    { name: "负责人", nameEn: "Owner", type: "成员", required: true, desc: "客户负责销售" },
    { name: "地址", nameEn: "Address", type: "地址", required: false, desc: "客户地址" },
    { name: "备注", nameEn: "Remarks", type: "多行文本", required: false, desc: "其他信息" },
  ],
  "M0-2": [
    { name: "联系人姓名", nameEn: "Contact Name", type: "文本", required: true, desc: "联系人全名" },
    { name: "关联客户", nameEn: "Customer", type: "关联", required: true, desc: "关联客户表" },
    { name: "职位", nameEn: "Position", type: "文本", required: false, desc: "职位名称" },
    { name: "部门", nameEn: "Department", type: "文本", required: false, desc: "所在部门" },
    { name: "手机", nameEn: "Mobile", type: "手机", required: true, desc: "手机号码" },
    { name: "邮箱", nameEn: "Email", type: "邮箱", required: false, desc: "电子邮箱" },
    { name: "角色", nameEn: "Role", type: "单选", required: false, desc: "决策者/影响者/使用者" },
  ],
  "M0-3": [
    { name: "商机名称", nameEn: "Opportunity Name", type: "文本", required: true, desc: "商机标题" },
    { name: "关联客户", nameEn: "Customer", type: "关联", required: true, desc: "关联客户表" },
    { name: "预计金额", nameEn: "Expected Amount", type: "数字", required: false, desc: "预估合同金额" },
    { name: "预计成交日期", nameEn: "Expected Close Date", type: "日期", required: false, desc: "预计签约日期" },
    { name: "商机阶段", nameEn: "Stage", type: "单选", required: true, desc: "初步接触/需求确认/方案报价/商务谈判/赢单/输单" },
    { name: "赢率", nameEn: "Win Rate", type: "数字", required: false, desc: "成交概率百分比" },
    { name: "竞争对手", nameEn: "Competitors", type: "多行文本", required: false, desc: "竞争对手信息" },
  ],
  "M0-4": [
    { name: "跟进主题", nameEn: "Follow-up Subject", type: "文本", required: true, desc: "跟进事项标题" },
    { name: "关联商机", nameEn: "Opportunity", type: "关联", required: true, desc: "关联商机表" },
    { name: "跟进方式", nameEn: "Method", type: "单选", required: true, desc: "电话/拜访/邮件/微信" },
    { name: "跟进内容", nameEn: "Content", type: "多行文本", required: true, desc: "详细跟进记录" },
    { name: "下次跟进", nameEn: "Next Follow-up", type: "日期", required: false, desc: "下次跟进日期" },
  ],
  
  // M1 机会评估与售前方案
  "M1-1": [
    { name: "方案名称", nameEn: "Proposal Name", type: "文本", required: true, desc: "售前方案标题" },
    { name: "关联商机", nameEn: "Opportunity", type: "关联", required: true, desc: "关联商机表" },
    { name: "方案类型", nameEn: "Type", type: "单选", required: true, desc: "技术方案/商务方案/综合方案" },
    { name: "方案状态", nameEn: "Status", type: "单选", required: true, desc: "编制中/内审中/已提交/已通过" },
    { name: "方案负责人", nameEn: "Owner", type: "成员", required: true, desc: "方案编制负责人" },
    { name: "技术评审人", nameEn: "Tech Reviewer", type: "成员", required: false, desc: "技术评审负责人" },
    { name: "方案附件", nameEn: "Attachments", type: "附件", required: false, desc: "方案文档" },
  ],
  "M1-2": [
    { name: "报价单号", nameEn: "Quote No.", type: "流水号", required: true, desc: "自动生成报价单号" },
    { name: "关联方案", nameEn: "Proposal", type: "关联", required: true, desc: "关联售前方案" },
    { name: "报价金额", nameEn: "Quote Amount", type: "数字", required: true, desc: "报价总金额" },
    { name: "有效期", nameEn: "Valid Until", type: "日期", required: true, desc: "报价有效期" },
    { name: "付款条款", nameEn: "Payment Terms", type: "多行文本", required: false, desc: "付款条件说明" },
    { name: "报价明细", nameEn: "Line Items", type: "子表单", required: true, desc: "产品/服务明细" },
  ],
  
  // M2 内部/客户评审
  "M2-1": [
    { name: "评审主题", nameEn: "Review Subject", type: "文本", required: true, desc: "评审会议主题" },
    { name: "评审类型", nameEn: "Review Type", type: "单选", required: true, desc: "内部评审/客户评审" },
    { name: "关联方案", nameEn: "Proposal", type: "关联", required: true, desc: "关联售前方案" },
    { name: "评审日期", nameEn: "Review Date", type: "日期", required: true, desc: "评审会议日期" },
    { name: "参与人员", nameEn: "Participants", type: "成员", required: true, desc: "评审参与人" },
    { name: "评审结论", nameEn: "Conclusion", type: "单选", required: false, desc: "通过/有条件通过/不通过" },
    { name: "评审意见", nameEn: "Comments", type: "多行文本", required: false, desc: "评审意见记录" },
  ],
  
  // M3 合同签订与项目启动
  "M3-1": [
    { name: "合同编号", nameEn: "Contract No.", type: "流水号", required: true, desc: "自动生成合同编号" },
    { name: "合同名称", nameEn: "Contract Name", type: "文本", required: true, desc: "合同标题" },
    { name: "关联客户", nameEn: "Customer", type: "关联", required: true, desc: "签约客户" },
    { name: "关联商机", nameEn: "Opportunity", type: "关联", required: true, desc: "关联商机" },
    { name: "合同金额", nameEn: "Contract Amount", type: "数字", required: true, desc: "合同总金额" },
    { name: "签约日期", nameEn: "Sign Date", type: "日期", required: true, desc: "合同签订日期" },
    { name: "交付日期", nameEn: "Delivery Date", type: "日期", required: true, desc: "预计交付日期" },
    { name: "合同状态", nameEn: "Status", type: "单选", required: true, desc: "待签/已签/执行中/已完成" },
    { name: "合同附件", nameEn: "Attachments", type: "附件", required: true, desc: "合同扫描件" },
  ],
  "M3-2": [
    { name: "项目编号", nameEn: "Project No.", type: "流水号", required: true, desc: "自动生成项目编号" },
    { name: "项目名称", nameEn: "Project Name", type: "文本", required: true, desc: "项目标题" },
    { name: "关联合同", nameEn: "Contract", type: "关联", required: true, desc: "关联合同" },
    { name: "项目经理", nameEn: "Project Manager", type: "成员", required: true, desc: "项目负责人" },
    { name: "项目团队", nameEn: "Team", type: "成员", required: false, desc: "项目成员" },
    { name: "启动日期", nameEn: "Start Date", type: "日期", required: true, desc: "项目启动日期" },
    { name: "计划完成", nameEn: "Plan End Date", type: "日期", required: true, desc: "计划完成日期" },
    { name: "项目状态", nameEn: "Status", type: "单选", required: true, desc: "启动/进行中/暂停/完成" },
  ],
  
  // M4 详细设计
  "M4-1": [
    { name: "设计任务", nameEn: "Design Task", type: "文本", required: true, desc: "设计任务名称" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "设计类型", nameEn: "Design Type", type: "单选", required: true, desc: "机械/电气/软件/系统" },
    { name: "设计负责人", nameEn: "Designer", type: "成员", required: true, desc: "设计工程师" },
    { name: "计划开始", nameEn: "Plan Start", type: "日期", required: true, desc: "计划开始日期" },
    { name: "计划完成", nameEn: "Plan End", type: "日期", required: true, desc: "计划完成日期" },
    { name: "实际完成", nameEn: "Actual End", type: "日期", required: false, desc: "实际完成日期" },
    { name: "设计文档", nameEn: "Documents", type: "附件", required: false, desc: "设计文档附件" },
    { name: "评审状态", nameEn: "Review Status", type: "单选", required: false, desc: "待评审/评审中/已通过" },
  ],
  
  // M5 采购与外协
  "M5-1": [
    { name: "采购申请单号", nameEn: "PR No.", type: "流水号", required: true, desc: "自动生成申请单号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "申请人", nameEn: "Requester", type: "成员", required: true, desc: "采购申请人" },
    { name: "申请日期", nameEn: "Request Date", type: "日期", required: true, desc: "申请日期" },
    { name: "需求日期", nameEn: "Required Date", type: "日期", required: true, desc: "期望到货日期" },
    { name: "采购明细", nameEn: "Line Items", type: "子表单", required: true, desc: "采购物料明细" },
    { name: "预算金额", nameEn: "Budget", type: "数字", required: false, desc: "预算金额" },
    { name: "审批状态", nameEn: "Approval Status", type: "单选", required: true, desc: "待审批/已批准/已拒绝" },
  ],
  "M5-2": [
    { name: "采购订单号", nameEn: "PO No.", type: "流水号", required: true, desc: "自动生成订单号" },
    { name: "关联申请", nameEn: "PR", type: "关联", required: true, desc: "关联采购申请" },
    { name: "供应商", nameEn: "Supplier", type: "关联", required: true, desc: "供应商" },
    { name: "订单金额", nameEn: "Order Amount", type: "数字", required: true, desc: "订单总金额" },
    { name: "下单日期", nameEn: "Order Date", type: "日期", required: true, desc: "下单日期" },
    { name: "预计到货", nameEn: "ETA", type: "日期", required: true, desc: "预计到货日期" },
    { name: "订单状态", nameEn: "Status", type: "单选", required: true, desc: "已下单/生产中/已发货/已收货" },
  ],
  "M5-3": [
    { name: "外协单号", nameEn: "Outsource No.", type: "流水号", required: true, desc: "自动生成外协单号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "外协类型", nameEn: "Type", type: "单选", required: true, desc: "加工/组装/测试/其他" },
    { name: "外协供应商", nameEn: "Supplier", type: "关联", required: true, desc: "外协供应商" },
    { name: "外协内容", nameEn: "Content", type: "多行文本", required: true, desc: "外协工作内容" },
    { name: "外协金额", nameEn: "Amount", type: "数字", required: true, desc: "外协费用" },
    { name: "计划完成", nameEn: "Plan End", type: "日期", required: true, desc: "计划完成日期" },
  ],
  
  // M6 制造与装配
  "M6-1": [
    { name: "生产工单", nameEn: "Work Order", type: "流水号", required: true, desc: "自动生成工单号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "产品型号", nameEn: "Product Model", type: "文本", required: true, desc: "生产产品型号" },
    { name: "生产数量", nameEn: "Quantity", type: "数字", required: true, desc: "生产数量" },
    { name: "计划开始", nameEn: "Plan Start", type: "日期", required: true, desc: "计划开始日期" },
    { name: "计划完成", nameEn: "Plan End", type: "日期", required: true, desc: "计划完成日期" },
    { name: "生产状态", nameEn: "Status", type: "单选", required: true, desc: "待生产/生产中/已完成" },
    { name: "负责人", nameEn: "Owner", type: "成员", required: true, desc: "生产负责人" },
  ],
  
  // M7 场内联调与预验收
  "M7-1": [
    { name: "FAT编号", nameEn: "FAT No.", type: "流水号", required: true, desc: "自动生成FAT编号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "测试日期", nameEn: "Test Date", type: "日期", required: true, desc: "FAT测试日期" },
    { name: "测试负责人", nameEn: "Tester", type: "成员", required: true, desc: "测试负责人" },
    { name: "客户代表", nameEn: "Customer Rep", type: "文本", required: false, desc: "客户见证人" },
    { name: "测试项目", nameEn: "Test Items", type: "子表单", required: true, desc: "测试项目清单" },
    { name: "测试结论", nameEn: "Conclusion", type: "单选", required: false, desc: "通过/有条件通过/不通过" },
    { name: "问题记录", nameEn: "Issues", type: "多行文本", required: false, desc: "问题及整改记录" },
  ],
  
  // M8 拆机与发运
  "M8-1": [
    { name: "发运单号", nameEn: "Shipping No.", type: "流水号", required: true, desc: "自动生成发运单号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "发运日期", nameEn: "Ship Date", type: "日期", required: true, desc: "发运日期" },
    { name: "收货地址", nameEn: "Destination", type: "地址", required: true, desc: "收货地址" },
    { name: "物流公司", nameEn: "Logistics", type: "文本", required: true, desc: "物流公司名称" },
    { name: "运单号", nameEn: "Tracking No.", type: "文本", required: false, desc: "物流运单号" },
    { name: "发运清单", nameEn: "Packing List", type: "子表单", required: true, desc: "发运物品清单" },
    { name: "发运状态", nameEn: "Status", type: "单选", required: true, desc: "待发运/运输中/已签收" },
  ],
  
  // M9 现场安装与调试
  "M9-1": [
    { name: "安装任务", nameEn: "Installation Task", type: "文本", required: true, desc: "安装任务名称" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "现场地址", nameEn: "Site Address", type: "地址", required: true, desc: "安装现场地址" },
    { name: "计划开始", nameEn: "Plan Start", type: "日期", required: true, desc: "计划开始日期" },
    { name: "计划完成", nameEn: "Plan End", type: "日期", required: true, desc: "计划完成日期" },
    { name: "安装人员", nameEn: "Installers", type: "成员", required: true, desc: "安装调试人员" },
    { name: "安装进度", nameEn: "Progress", type: "数字", required: false, desc: "安装进度百分比" },
    { name: "问题记录", nameEn: "Issues", type: "多行文本", required: false, desc: "现场问题记录" },
  ],
  
  // M10 验收与交付
  "M10-1": [
    { name: "SAT编号", nameEn: "SAT No.", type: "流水号", required: true, desc: "自动生成SAT编号" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "验收日期", nameEn: "Acceptance Date", type: "日期", required: true, desc: "验收日期" },
    { name: "验收负责人", nameEn: "Acceptor", type: "成员", required: true, desc: "验收负责人" },
    { name: "客户签字人", nameEn: "Customer Signer", type: "文本", required: true, desc: "客户签字人" },
    { name: "验收项目", nameEn: "Acceptance Items", type: "子表单", required: true, desc: "验收项目清单" },
    { name: "验收结论", nameEn: "Conclusion", type: "单选", required: true, desc: "通过/有条件通过/不通过" },
    { name: "验收报告", nameEn: "Report", type: "附件", required: false, desc: "验收报告附件" },
  ],
  
  // M11 售后服务与备件
  "M11-1": [
    { name: "服务单号", nameEn: "Service No.", type: "流水号", required: true, desc: "自动生成服务单号" },
    { name: "关联客户", nameEn: "Customer", type: "关联", required: true, desc: "服务客户" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: false, desc: "关联项目" },
    { name: "服务类型", nameEn: "Service Type", type: "单选", required: true, desc: "保修/维修/保养/咨询" },
    { name: "问题描述", nameEn: "Issue Description", type: "多行文本", required: true, desc: "问题详细描述" },
    { name: "优先级", nameEn: "Priority", type: "单选", required: true, desc: "紧急/高/中/低" },
    { name: "服务人员", nameEn: "Service Staff", type: "成员", required: false, desc: "服务负责人" },
    { name: "处理状态", nameEn: "Status", type: "单选", required: true, desc: "待处理/处理中/已完成" },
    { name: "处理结果", nameEn: "Resolution", type: "多行文本", required: false, desc: "处理结果记录" },
  ],
  
  // M12 项目收尾与复盘
  "M12-1": [
    { name: "复盘主题", nameEn: "Review Subject", type: "文本", required: true, desc: "复盘会议主题" },
    { name: "关联项目", nameEn: "Project", type: "关联", required: true, desc: "关联项目" },
    { name: "复盘日期", nameEn: "Review Date", type: "日期", required: true, desc: "复盘会议日期" },
    { name: "参与人员", nameEn: "Participants", type: "成员", required: true, desc: "复盘参与人" },
    { name: "项目总结", nameEn: "Summary", type: "多行文本", required: true, desc: "项目整体总结" },
    { name: "经验教训", nameEn: "Lessons Learned", type: "多行文本", required: true, desc: "经验教训记录" },
    { name: "改进建议", nameEn: "Improvements", type: "多行文本", required: false, desc: "改进建议" },
    { name: "复盘附件", nameEn: "Attachments", type: "附件", required: false, desc: "复盘相关文档" },
  ],
};

// 项目管理M0-M12阶段数据
export const projectPhases = [
  { id: "M0", name: "市场触达与线索", nameEn: "Market & Leads", forms: 10, status: "active", 
    formList: [
      { id: "M0-1", name: "客户管理", nameEn: "Customer Management", type: "表单" },
      { id: "M0-1.1", name: "客户内部详细信息", nameEn: "Customer Details", type: "表单" },
      { id: "M0-2", name: "联系人管理", nameEn: "Contact Management", type: "表单" },
      { id: "M0-2.1", name: "客户互动记录", nameEn: "Interaction Records", type: "表单" },
      { id: "M0-3", name: "商机管理", nameEn: "Opportunity Management", type: "表单" },
      { id: "M0-3.1", name: "产品描述", nameEn: "Product Description", type: "表单" },
      { id: "M0-4", name: "跟进记录", nameEn: "Follow-up Records", type: "表单" },
    ]
  },
  { id: "M1", name: "机会评估与售前方案", nameEn: "Opportunity & Presales", forms: 4, status: "active", 
    formList: [
      { id: "M1-1", name: "售前方案", nameEn: "Presales Proposal", type: "表单" },
      { id: "M1-2", name: "报价单", nameEn: "Quotation", type: "流程表单" },
      { id: "M1-3", name: "技术规格书", nameEn: "Technical Spec", type: "表单" },
      { id: "M1-4", name: "竞争分析", nameEn: "Competitive Analysis", type: "表单" },
    ]
  },
  { id: "M2", name: "内部/客户评审", nameEn: "Internal/Customer Review", forms: 2, status: "partial", 
    formList: [
      { id: "M2-1", name: "评审记录", nameEn: "Review Record", type: "流程表单" },
      { id: "M2-2", name: "评审问题跟踪", nameEn: "Review Issues", type: "表单" },
    ]
  },
  { id: "M3", name: "合同签订与项目启动", nameEn: "Contract & Kickoff", forms: 2, status: "active", 
    formList: [
      { id: "M3-1", name: "合同管理", nameEn: "Contract Management", type: "流程表单" },
      { id: "M3-2", name: "项目立项", nameEn: "Project Initiation", type: "流程表单" },
    ]
  },
  { id: "M4", name: "详细设计", nameEn: "Detailed Design", forms: 1, status: "partial", 
    formList: [
      { id: "M4-1", name: "设计任务", nameEn: "Design Task", type: "表单" },
    ]
  },
  { id: "M5", name: "采购与外协", nameEn: "Procurement & Outsourcing", forms: 5, status: "active", 
    formList: [
      { id: "M5-1", name: "采购申请", nameEn: "Purchase Request", type: "流程表单" },
      { id: "M5-2", name: "采购订单", nameEn: "Purchase Order", type: "流程表单" },
      { id: "M5-3", name: "外协管理", nameEn: "Outsourcing", type: "流程表单" },
      { id: "M5-4", name: "供应商管理", nameEn: "Supplier Management", type: "表单" },
      { id: "M5-5", name: "到货检验", nameEn: "Incoming Inspection", type: "表单" },
    ]
  },
  { id: "M6", name: "制造与装配", nameEn: "Manufacturing", forms: 0, status: "pending", 
    formList: [
      { id: "M6-1", name: "生产工单", nameEn: "Work Order", type: "表单" },
    ]
  },
  { id: "M7", name: "场内联调与预验收", nameEn: "FAT Testing", forms: 1, status: "partial", 
    formList: [
      { id: "M7-1", name: "FAT测试", nameEn: "FAT Test", type: "流程表单" },
    ]
  },
  { id: "M8", name: "拆机与发运", nameEn: "Disassembly & Shipping", forms: 1, status: "partial", 
    formList: [
      { id: "M8-1", name: "发运管理", nameEn: "Shipping Management", type: "流程表单" },
    ]
  },
  { id: "M9", name: "现场安装与调试", nameEn: "Site Installation", forms: 1, status: "partial", 
    formList: [
      { id: "M9-1", name: "安装调试", nameEn: "Installation", type: "表单" },
    ]
  },
  { id: "M10", name: "验收与交付", nameEn: "SAT & Delivery", forms: 1, status: "partial", 
    formList: [
      { id: "M10-1", name: "SAT验收", nameEn: "SAT Acceptance", type: "流程表单" },
    ]
  },
  { id: "M11", name: "售后服务与备件", nameEn: "After-sales Service", forms: 1, status: "partial", 
    formList: [
      { id: "M11-1", name: "服务工单", nameEn: "Service Ticket", type: "流程表单" },
    ]
  },
  { id: "M12", name: "项目收尾与复盘", nameEn: "Project Closure", forms: 1, status: "partial", 
    formList: [
      { id: "M12-1", name: "项目复盘", nameEn: "Project Review", type: "表单" },
    ]
  },
];

// 差距分析数据
export const gapAnalysisData = [
  { 
    module: "CRM销售管理", moduleEn: "CRM Sales",
    current: 65, target: 100,
    gaps: [
      { item: "BANT线索评分", itemEn: "BANT Lead Scoring", status: "missing" },
      { item: "销售漏斗可视化", itemEn: "Sales Funnel Visualization", status: "partial" },
      { item: "销售预测模型", itemEn: "Sales Forecasting", status: "missing" },
    ]
  },
  { 
    module: "项目管理", moduleEn: "Project Management",
    current: 80, target: 100,
    gaps: [
      { item: "甘特图自动生成", itemEn: "Auto Gantt Chart", status: "partial" },
      { item: "资源负载分析", itemEn: "Resource Load Analysis", status: "missing" },
      { item: "里程碑预警", itemEn: "Milestone Alerts", status: "exists" },
    ]
  },
  { 
    module: "成本管理", moduleEn: "Cost Management",
    current: 45, target: 100,
    gaps: [
      { item: "项目成本核算", itemEn: "Project Cost Accounting", status: "partial" },
      { item: "利润分析报表", itemEn: "Profit Analysis Report", status: "missing" },
      { item: "预算vs实际对比", itemEn: "Budget vs Actual", status: "missing" },
    ]
  },
  { 
    module: "AI智能化", moduleEn: "AI Intelligence",
    current: 20, target: 100,
    gaps: [
      { item: "智能销售助手", itemEn: "AI Sales Assistant", status: "missing" },
      { item: "自动工时采集", itemEn: "Auto Time Tracking", status: "missing" },
      { item: "智能文档分析", itemEn: "Smart Doc Analysis", status: "partial" },
    ]
  },
];

// 系统依赖关系数据
export const systemDependencies = [
  { from: "M0-客户管理", to: "M0-联系人管理", type: "1:N", desc: "一个客户有多个联系人" },
  { from: "M0-客户管理", to: "M0-商机管理", type: "1:N", desc: "一个客户有多个商机" },
  { from: "M0-商机管理", to: "M1-售前方案", type: "1:1", desc: "商机转化为售前方案" },
  { from: "M1-售前方案", to: "M3-合同签订", type: "1:1", desc: "方案确认后签订合同" },
  { from: "M3-合同签订", to: "M5-采购管理", type: "1:N", desc: "项目触发采购需求" },
  { from: "M5-采购管理", to: "库存管理", type: "N:N", desc: "采购入库" },
  { from: "M3-合同签订", to: "财务-回款计划", type: "1:N", desc: "合同生成回款计划" },
  { from: "M10-验收交付", to: "财务-开票申请", type: "1:N", desc: "验收后申请开票" },
];

// 人事OA系统模块
export const hrmModules = [
  { name: "招聘管理", nameEn: "Recruitment", forms: 5 },
  { name: "入转调离", nameEn: "Employee Lifecycle", forms: 5 },
  { name: "考勤管理", nameEn: "Attendance", forms: 11 },
  { name: "绩效管理", nameEn: "Performance", forms: 5 },
  { name: "薪酬管理", nameEn: "Compensation", forms: 3 },
  { name: "会议管理", nameEn: "Meeting", forms: 2 },
  { name: "车辆管理", nameEn: "Vehicle", forms: 2 },
  { name: "物资管理", nameEn: "Assets", forms: 3 },
];

// ERP模块
export const erpModules = [
  { name: "销售管理", nameEn: "Sales", forms: 3 },
  { name: "采购管理", nameEn: "Procurement", forms: 4 },
  { name: "生产管理", nameEn: "Production", forms: 7 },
  { name: "库存管理", nameEn: "Inventory", forms: 9 },
  { name: "财务管理", nameEn: "Finance", forms: 9 },
];

// 系统统计数据
export const systemStats = {
  totalApps: 47,
  coreApps: 6,
  totalForms: 120,
  workflows: 35,
  dashboards: 12,
};

// 数据迁移规划数据
export const migrationPlanData = [
  {
    sourceModule: "M0-客户管理",
    sourceModuleEn: "M0-Customer",
    targetModule: "CRM-客户主数据",
    targetModuleEn: "CRM-Customer Master",
    fieldMappings: [
      { source: "客户名称", target: "company_name", status: "direct", note: "直接映射" },
      { source: "客户类型", target: "customer_type", status: "transform", note: "需要值转换" },
      { source: "行业", target: "industry_code", status: "transform", note: "映射到行业代码" },
      { source: "客户等级", target: "tier", status: "direct", note: "直接映射" },
      { source: "负责人", target: "owner_id", status: "lookup", note: "需要用户ID查找" },
    ],
    priority: "high",
    estimatedRecords: 500,
    complexity: "medium",
  },
  {
    sourceModule: "M0-商机管理",
    sourceModuleEn: "M0-Opportunity",
    targetModule: "CRM-商机",
    targetModuleEn: "CRM-Opportunity",
    fieldMappings: [
      { source: "商机名称", target: "opportunity_name", status: "direct", note: "直接映射" },
      { source: "关联客户", target: "account_id", status: "lookup", note: "需要客户ID查找" },
      { source: "预计金额", target: "amount", status: "direct", note: "直接映射" },
      { source: "商机阶段", target: "stage", status: "transform", note: "阶段值映射" },
      { source: "赢率", target: "probability", status: "direct", note: "直接映射" },
    ],
    priority: "high",
    estimatedRecords: 200,
    complexity: "medium",
  },
  {
    sourceModule: "M3-合同管理",
    sourceModuleEn: "M3-Contract",
    targetModule: "合同管理",
    targetModuleEn: "Contract Management",
    fieldMappings: [
      { source: "合同编号", target: "contract_no", status: "direct", note: "直接映射" },
      { source: "合同名称", target: "contract_name", status: "direct", note: "直接映射" },
      { source: "合同金额", target: "total_amount", status: "direct", note: "直接映射" },
      { source: "签约日期", target: "sign_date", status: "transform", note: "日期格式转换" },
      { source: "合同状态", target: "status", status: "transform", note: "状态值映射" },
    ],
    priority: "high",
    estimatedRecords: 150,
    complexity: "low",
  },
  {
    sourceModule: "M5-采购订单",
    sourceModuleEn: "M5-Purchase Order",
    targetModule: "采购管理",
    targetModuleEn: "Procurement",
    fieldMappings: [
      { source: "采购订单号", target: "po_number", status: "direct", note: "直接映射" },
      { source: "供应商", target: "vendor_id", status: "lookup", note: "需要供应商ID查找" },
      { source: "订单金额", target: "total_amount", status: "direct", note: "直接映射" },
      { source: "订单状态", target: "status", status: "transform", note: "状态值映射" },
    ],
    priority: "medium",
    estimatedRecords: 800,
    complexity: "medium",
  },
  {
    sourceModule: "员工档案",
    sourceModuleEn: "Employee Profile",
    targetModule: "HR-员工主数据",
    targetModuleEn: "HR-Employee Master",
    fieldMappings: [
      { source: "员工姓名", target: "full_name", status: "direct", note: "直接映射" },
      { source: "工号", target: "employee_id", status: "direct", note: "直接映射" },
      { source: "部门", target: "department_id", status: "lookup", note: "需要部门ID查找" },
      { source: "职位", target: "position", status: "direct", note: "直接映射" },
      { source: "入职日期", target: "hire_date", status: "transform", note: "日期格式转换" },
    ],
    priority: "medium",
    estimatedRecords: 100,
    complexity: "low",
  },
];


// 迁移进度追踪数据
export interface MigrationProgress {
  moduleId: string;
  moduleName: string;
  moduleNameEn: string;
  status: 'pending' | 'in_progress' | 'validating' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  migratedRecords: number;
  validatedRecords: number;
  errorRecords: number;
  startTime?: string;
  endTime?: string;
  lastUpdated: string;
}

export const migrationProgressData: MigrationProgress[] = [
  {
    moduleId: "M0-customer",
    moduleName: "客户管理",
    moduleNameEn: "Customer Management",
    status: "completed",
    progress: 100,
    totalRecords: 500,
    migratedRecords: 500,
    validatedRecords: 498,
    errorRecords: 2,
    startTime: "2026-01-10 09:00:00",
    endTime: "2026-01-10 10:30:00",
    lastUpdated: "2026-01-10 10:30:00",
  },
  {
    moduleId: "M0-opportunity",
    moduleName: "商机管理",
    moduleNameEn: "Opportunity Management",
    status: "validating",
    progress: 85,
    totalRecords: 200,
    migratedRecords: 200,
    validatedRecords: 170,
    errorRecords: 0,
    startTime: "2026-01-10 11:00:00",
    lastUpdated: "2026-01-10 12:00:00",
  },
  {
    moduleId: "M3-contract",
    moduleName: "合同管理",
    moduleNameEn: "Contract Management",
    status: "in_progress",
    progress: 45,
    totalRecords: 150,
    migratedRecords: 68,
    validatedRecords: 0,
    errorRecords: 0,
    startTime: "2026-01-10 14:00:00",
    lastUpdated: "2026-01-10 14:30:00",
  },
  {
    moduleId: "M5-purchase",
    moduleName: "采购订单",
    moduleNameEn: "Purchase Order",
    status: "pending",
    progress: 0,
    totalRecords: 800,
    migratedRecords: 0,
    validatedRecords: 0,
    errorRecords: 0,
    lastUpdated: "2026-01-10 08:00:00",
  },
  {
    moduleId: "HR-employee",
    moduleName: "员工档案",
    moduleNameEn: "Employee Profile",
    status: "pending",
    progress: 0,
    totalRecords: 100,
    migratedRecords: 0,
    validatedRecords: 0,
    errorRecords: 0,
    lastUpdated: "2026-01-10 08:00:00",
  },
];

// 数据验证规则
export interface ValidationRule {
  id: string;
  name: string;
  nameEn: string;
  type: 'required' | 'format' | 'range' | 'reference' | 'unique' | 'custom';
  description: string;
  descriptionEn: string;
  severity: 'error' | 'warning' | 'info';
}

export const validationRules: ValidationRule[] = [
  { id: "V001", name: "必填字段检查", nameEn: "Required Field Check", type: "required", description: "检查必填字段是否为空", descriptionEn: "Check if required fields are empty", severity: "error" },
  { id: "V002", name: "日期格式验证", nameEn: "Date Format Validation", type: "format", description: "验证日期字段格式是否正确", descriptionEn: "Validate date field format", severity: "error" },
  { id: "V003", name: "金额范围检查", nameEn: "Amount Range Check", type: "range", description: "检查金额是否在合理范围内", descriptionEn: "Check if amount is within reasonable range", severity: "warning" },
  { id: "V004", name: "外键引用验证", nameEn: "Foreign Key Reference", type: "reference", description: "验证关联字段引用是否存在", descriptionEn: "Validate foreign key references exist", severity: "error" },
  { id: "V005", name: "唯一性检查", nameEn: "Uniqueness Check", type: "unique", description: "检查唯一字段是否有重复", descriptionEn: "Check for duplicate unique fields", severity: "error" },
  { id: "V006", name: "状态值映射", nameEn: "Status Value Mapping", type: "custom", description: "验证状态值是否正确映射", descriptionEn: "Validate status value mapping", severity: "warning" },
];

// 数据验证结果
export interface ValidationResult {
  moduleId: string;
  moduleName: string;
  moduleNameEn: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  lastValidated: string;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  ruleId: string;
  ruleName: string;
  ruleNameEn: string;
  severity: 'error' | 'warning' | 'info';
  affectedRecords: number;
  sampleData: string;
  suggestion: string;
  suggestionEn: string;
}

export const validationResults: ValidationResult[] = [
  {
    moduleId: "M0-customer",
    moduleName: "客户管理",
    moduleNameEn: "Customer Management",
    totalChecks: 6,
    passedChecks: 4,
    failedChecks: 1,
    warningChecks: 1,
    lastValidated: "2026-01-10 10:25:00",
    issues: [
      { ruleId: "V004", ruleName: "外键引用验证", ruleNameEn: "Foreign Key Reference", severity: "error", affectedRecords: 2, sampleData: "客户ID: C-0123, C-0456", suggestion: "检查负责人ID是否存在于用户表", suggestionEn: "Check if owner_id exists in users table" },
      { ruleId: "V003", ruleName: "金额范围检查", ruleNameEn: "Amount Range Check", severity: "warning", affectedRecords: 5, sampleData: "预估金额为0或负数", suggestion: "确认金额数据是否正确", suggestionEn: "Confirm if amount data is correct" },
    ],
  },
  {
    moduleId: "M0-opportunity",
    moduleName: "商机管理",
    moduleNameEn: "Opportunity Management",
    totalChecks: 6,
    passedChecks: 6,
    failedChecks: 0,
    warningChecks: 0,
    lastValidated: "2026-01-10 12:00:00",
    issues: [],
  },
];

// 迁移脚本模板
export interface MigrationScript {
  id: string;
  name: string;
  nameEn: string;
  type: 'sql' | 'etl' | 'api';
  sourceTable: string;
  targetTable: string;
  description: string;
  descriptionEn: string;
  script: string;
}

export const migrationScripts: MigrationScript[] = [
  {
    id: "MS001",
    name: "客户数据迁移SQL",
    nameEn: "Customer Data Migration SQL",
    type: "sql",
    sourceTable: "ext_customers",
    targetTable: "crm_customers",
    description: "从外部数据平台客户表迁移到NocoBase CRM客户表",
    descriptionEn: "Migrate from Jiandaoyun customer table to NocoBase CRM customer table",
    script: `-- 客户数据迁移脚本
-- 源表: ext_customers (外部数据平台)
-- 目标表: crm_customers (NocoBase)

INSERT INTO crm_customers (
  company_name,
  short_name,
  customer_type,
  industry_code,
  source,
  tier,
  owner_id,
  address,
  remarks,
  created_at,
  updated_at
)
SELECT 
  jc.customer_name AS company_name,
  jc.short_name,
  CASE jc.customer_type
    WHEN '终端客户' THEN 'end_user'
    WHEN '集成商' THEN 'integrator'
    WHEN '代理商' THEN 'distributor'
    ELSE 'other'
  END AS customer_type,
  ind.industry_code,
  jc.source,
  jc.customer_level AS tier,
  u.id AS owner_id,
  jc.address,
  jc.remarks,
  jc.created_at,
  NOW() AS updated_at
FROM ext_customers jc
LEFT JOIN industry_mapping ind ON jc.industry = ind.ext_industry
LEFT JOIN users u ON jc.owner_name = u.name
WHERE jc.is_deleted = 0;`,
  },
  {
    id: "MS002",
    name: "商机数据迁移SQL",
    nameEn: "Opportunity Data Migration SQL",
    type: "sql",
    sourceTable: "ext_opportunities",
    targetTable: "crm_opportunities",
    description: "从外部数据平台商机表迁移到NocoBase CRM商机表",
    descriptionEn: "Migrate from Jiandaoyun opportunity table to NocoBase CRM opportunity table",
    script: `-- 商机数据迁移脚本
-- 源表: ext_opportunities (外部数据平台)
-- 目标表: crm_opportunities (NocoBase)

INSERT INTO crm_opportunities (
  opportunity_name,
  account_id,
  amount,
  expected_close_date,
  stage,
  probability,
  competitors,
  created_at,
  updated_at
)
SELECT 
  jo.opportunity_name,
  cc.id AS account_id,
  jo.expected_amount AS amount,
  jo.expected_close_date,
  CASE jo.stage
    WHEN '初步接触' THEN 'prospecting'
    WHEN '需求确认' THEN 'qualification'
    WHEN '方案报价' THEN 'proposal'
    WHEN '商务谈判' THEN 'negotiation'
    WHEN '赢单' THEN 'closed_won'
    WHEN '输单' THEN 'closed_lost'
    ELSE 'prospecting'
  END AS stage,
  jo.win_rate AS probability,
  jo.competitors,
  jo.created_at,
  NOW() AS updated_at
FROM ext_opportunities jo
LEFT JOIN crm_customers cc ON jo.customer_id = cc.source_id
WHERE jo.is_deleted = 0;`,
  },
  {
    id: "MS003",
    name: "合同数据迁移SQL",
    nameEn: "Contract Data Migration SQL",
    type: "sql",
    sourceTable: "ext_contracts",
    targetTable: "contracts",
    description: "从外部数据平台合同表迁移到NocoBase合同表",
    descriptionEn: "Migrate from Jiandaoyun contract table to NocoBase contract table",
    script: `-- 合同数据迁移脚本
-- 源表: ext_contracts (外部数据平台)
-- 目标表: contracts (NocoBase)

INSERT INTO contracts (
  contract_no,
  contract_name,
  customer_id,
  opportunity_id,
  total_amount,
  sign_date,
  delivery_date,
  status,
  attachment_url,
  created_at,
  updated_at
)
SELECT 
  jc.contract_no,
  jc.contract_name,
  cc.id AS customer_id,
  co.id AS opportunity_id,
  jc.contract_amount AS total_amount,
  STR_TO_DATE(jc.sign_date, '%Y-%m-%d') AS sign_date,
  STR_TO_DATE(jc.delivery_date, '%Y-%m-%d') AS delivery_date,
  CASE jc.contract_status
    WHEN '待签' THEN 'pending'
    WHEN '已签' THEN 'signed'
    WHEN '执行中' THEN 'executing'
    WHEN '已完成' THEN 'completed'
    ELSE 'pending'
  END AS status,
  jc.attachment_url,
  jc.created_at,
  NOW() AS updated_at
FROM ext_contracts jc
LEFT JOIN crm_customers cc ON jc.customer_id = cc.source_id
LEFT JOIN crm_opportunities co ON jc.opportunity_id = co.source_id
WHERE jc.is_deleted = 0;`,
  },
  {
    id: "MS004",
    name: "数据验证脚本",
    nameEn: "Data Validation Script",
    type: "sql",
    sourceTable: "multiple",
    targetTable: "multiple",
    description: "迁移后数据完整性和一致性验证脚本",
    descriptionEn: "Post-migration data integrity and consistency validation script",
    script: `-- 数据验证脚本
-- 验证迁移后的数据完整性和一致性

-- 1. 记录数对比
SELECT 'customers' AS table_name,
  (SELECT COUNT(*) FROM ext_customers WHERE is_deleted = 0) AS source_count,
  (SELECT COUNT(*) FROM crm_customers) AS target_count,
  CASE WHEN (SELECT COUNT(*) FROM ext_customers WHERE is_deleted = 0) = 
            (SELECT COUNT(*) FROM crm_customers) 
       THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT 'opportunities' AS table_name,
  (SELECT COUNT(*) FROM ext_opportunities WHERE is_deleted = 0) AS source_count,
  (SELECT COUNT(*) FROM crm_opportunities) AS target_count,
  CASE WHEN (SELECT COUNT(*) FROM ext_opportunities WHERE is_deleted = 0) = 
            (SELECT COUNT(*) FROM crm_opportunities) 
       THEN 'PASS' ELSE 'FAIL' END AS status;

-- 2. 外键完整性检查
SELECT 'orphan_opportunities' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM crm_opportunities o
WHERE o.account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM crm_customers c WHERE c.id = o.account_id);

-- 3. 必填字段检查
SELECT 'null_company_names' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM crm_customers WHERE company_name IS NULL OR company_name = '';

-- 4. 金额汇总对比
SELECT 'total_contract_amount' AS check_name,
  (SELECT SUM(contract_amount) FROM ext_contracts WHERE is_deleted = 0) AS source_sum,
  (SELECT SUM(total_amount) FROM contracts) AS target_sum,
  CASE WHEN ABS((SELECT SUM(contract_amount) FROM ext_contracts WHERE is_deleted = 0) - 
                (SELECT SUM(total_amount) FROM contracts)) < 0.01
       THEN 'PASS' ELSE 'FAIL' END AS status;`,
  },
];
