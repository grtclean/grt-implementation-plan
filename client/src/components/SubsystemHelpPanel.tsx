import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Lightbulb,
  Play,
  Settings,
  Target,
  Workflow,
  AlertTriangle,
  Info,
} from "lucide-react";

// 子系统类型定义
export type SubsystemType = 
  | "mes" 
  | "ai-purchase" 
  | "finance-3331" 
  | "gate-management" 
  | "workflow-engine" 
  | "talent-grid";

// 操作步骤接口
interface OperationStep {
  id: string;
  title: string;
  description: string;
  details?: string[];
  tips?: string[];
  warnings?: string[];
}

// 前期输入接口
interface PrerequisiteInput {
  id: string;
  name: string;
  description: string;
  required: boolean;
  format?: string;
  example?: string;
}

// 执行效果接口
interface ExecutionEffect {
  id: string;
  metric: string;
  description: string;
  expectedValue?: string;
}

// 子系统帮助内容接口
export interface SubsystemHelpContent {
  id: SubsystemType;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ReactNode;
  overview: string;
  prerequisites: PrerequisiteInput[];
  operationFlows: {
    id: string;
    name: string;
    steps: OperationStep[];
  }[];
  effects: ExecutionEffect[];
  errorCodes?: {
    code: string;
    description: string;
    solution: string;
  }[];
}

// MES制造执行系统帮助内容
export const mesHelpContent: SubsystemHelpContent = {
  id: "mes",
  name: "MES制造执行系统",
  nameEn: "Manufacturing Execution System",
  description: "管理生产执行全流程，包括项目创建、BOM导入、任务分解、工时记录和质量检验",
  icon: <Settings className="h-5 w-5" />,
  overview: `MES制造执行系统是GRT智能系统的核心生产管理模块，负责从项目立项到生产完成的全流程管控。
系统支持多事业部矩阵管理（海外、商用车、乘用车、机加工、第十事业部），实现BOM自动导入、
任务卡智能分解、工时实时采集和质量检验闭环。`,
  prerequisites: [
    {
      id: "org-structure",
      name: "组织架构数据",
      description: "事业部、部门、岗位、人员的完整组织架构",
      required: true,
      format: "Excel或JSON",
      example: "事业部代码(BU-OVERSEAS)、部门代码、岗位代码、员工工号"
    },
    {
      id: "material-master",
      name: "物料主数据",
      description: "所有物料的编码、名称、规格、单位等基础信息",
      required: true,
      format: "按物料编码规则导入",
      example: "物料编码(M-01-001-0001)、物料名称、规格型号、计量单位"
    },
    {
      id: "bom-structure",
      name: "BOM结构数据",
      description: "产品的物料清单结构，包含父子关系和用量",
      required: true,
      format: "多级BOM结构",
      example: "父物料编码、子物料编码、用量、损耗率"
    },
    {
      id: "supplier-info",
      name: "供应商信息",
      description: "合格供应商名录及其供货物料范围",
      required: true,
      format: "供应商主数据表",
      example: "供应商代码、供应商名称、供货物料清单、资质等级"
    },
    {
      id: "process-route",
      name: "工艺路线数据",
      description: "产品的加工工序、工时定额、设备要求",
      required: false,
      format: "工艺路线表",
      example: "工序代码、工序名称、标准工时、设备类型"
    }
  ],
  operationFlows: [
    {
      id: "project-creation",
      name: "项目创建流程",
      steps: [
        {
          id: "step-1",
          title: "项目立项",
          description: "在系统中创建新项目，填写项目基本信息",
          details: [
            "进入【项目管理】→【新建项目】",
            "填写项目编号（系统自动生成或手动输入）",
            "选择所属事业部和项目类型",
            "填写客户信息和交付日期"
          ],
          tips: ["项目编号格式：P-{年份}-{事业部代码}-{序号}"]
        },
        {
          id: "step-2",
          title: "BOM导入",
          description: "导入项目所需的物料清单",
          details: [
            "点击【导入BOM】按钮",
            "选择BOM模板或从历史项目复制",
            "AI自动推荐相似项目的BOM结构",
            "确认或调整BOM内容后保存"
          ],
          tips: ["AI推荐基于历史项目相似度匹配，匹配度>80%的方案优先展示"],
          warnings: ["BOM导入后需经工程师确认才能生效"]
        },
        {
          id: "step-3",
          title: "任务卡分解",
          description: "将项目分解为可执行的任务卡",
          details: [
            "系统根据BOM和工艺路线自动生成任务卡",
            "设置任务卡的计划开始/完成时间",
            "分配任务责任人",
            "设置任务依赖关系"
          ],
          tips: ["任务卡支持甘特图视图，可直观查看进度"]
        }
      ]
    },
    {
      id: "production-execution",
      name: "生产执行流程",
      steps: [
        {
          id: "exec-1",
          title: "任务领取",
          description: "生产人员领取待执行的任务卡",
          details: [
            "登录系统查看【我的任务】",
            "选择待执行任务并点击【开始】",
            "系统记录任务开始时间",
            "扫描工位二维码确认工位"
          ]
        },
        {
          id: "exec-2",
          title: "工时记录",
          description: "实时记录生产工时和进度",
          details: [
            "系统自动计时或手动输入工时",
            "记录实际用料数量",
            "上传过程照片或视频（可选）",
            "填写生产备注"
          ],
          tips: ["支持UWB定位自动采集工时（需硬件支持）"]
        },
        {
          id: "exec-3",
          title: "质量检验",
          description: "完成质量检验并记录结果",
          details: [
            "根据检验标准执行检验",
            "记录检验数据和结果",
            "不合格品触发异常流程",
            "合格后流转至下一工序"
          ],
          warnings: ["关键工序必须通过质检才能流转"]
        },
        {
          id: "exec-4",
          title: "进度更新",
          description: "更新任务完成状态",
          details: [
            "点击【完成任务】按钮",
            "系统自动更新项目进度",
            "触发下游任务通知",
            "生成工时统计报表"
          ]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "项目进度可视化",
      description: "实时查看项目整体进度和各任务状态",
      expectedValue: "进度偏差<5%"
    },
    {
      id: "effect-2",
      metric: "工时采集准确率",
      description: "生产工时数据的采集准确程度",
      expectedValue: ">95%"
    },
    {
      id: "effect-3",
      metric: "质量追溯覆盖率",
      description: "可追溯到具体工序和人员的质量记录比例",
      expectedValue: "100%"
    },
    {
      id: "effect-4",
      metric: "任务响应时间",
      description: "从任务分配到开始执行的平均时间",
      expectedValue: "<2小时"
    }
  ],
  errorCodes: [
    {
      code: "MES_001",
      description: "BOM结构不完整",
      solution: "检查BOM是否包含所有必需物料，确保父子关系正确"
    },
    {
      code: "MES_002",
      description: "任务依赖冲突",
      solution: "检查任务依赖关系，确保没有循环依赖"
    },
    {
      code: "MES_003",
      description: "工时超出标准",
      solution: "核实实际工时，如确实超出需填写原因说明"
    }
  ]
};

// AI采购系统帮助内容
export const aiPurchaseHelpContent: SubsystemHelpContent = {
  id: "ai-purchase",
  name: "AI赋能采购系统",
  nameEn: "AI-Powered Procurement System",
  description: "AI驱动的智能采购管理，支持自动询价、OCR识别、价格分析和供应商评估",
  icon: <Target className="h-5 w-5" />,
  overview: `AI赋能采购系统通过人工智能技术优化采购全流程，包括自动生成询价邮件（支持中英德三语）、
OCR自动识别报价单、AI价格分析与最佳价值评估、供应商风险评估等功能。系统与MES和财务系统
深度集成，实现采购到付款的闭环管理。`,
  prerequisites: [
    {
      id: "supplier-list",
      name: "合格供应商名录",
      description: "已审核通过的供应商清单及联系方式",
      required: true,
      format: "供应商主数据表",
      example: "供应商代码、名称、联系人、邮箱、供货品类"
    },
    {
      id: "material-catalog",
      name: "物料目录",
      description: "需采购物料的完整信息",
      required: true,
      format: "物料主数据",
      example: "物料编码、名称、规格、历史价格"
    },
    {
      id: "price-history",
      name: "历史价格数据",
      description: "物料的历史采购价格记录",
      required: false,
      format: "价格记录表",
      example: "物料编码、供应商、价格、日期"
    }
  ],
  operationFlows: [
    {
      id: "auto-inquiry",
      name: "AI自动询价流程",
      steps: [
        {
          id: "inq-1",
          title: "创建询价单",
          description: "创建采购询价需求",
          details: [
            "进入【采购管理】→【新建询价】",
            "选择需询价的物料清单",
            "选择目标供应商（支持多选）",
            "设置询价截止日期"
          ]
        },
        {
          id: "inq-2",
          title: "AI生成询价邮件",
          description: "AI自动生成专业询价邮件",
          details: [
            "AI根据物料信息生成询价内容",
            "自动选择语言（中/英/德）",
            "包含技术规格和交付要求",
            "预览并确认邮件内容"
          ],
          tips: ["AI会根据供应商所在地区自动选择语言"]
        },
        {
          id: "inq-3",
          title: "发送与跟踪",
          description: "发送询价邮件并跟踪状态",
          details: [
            "批量发送询价邮件",
            "系统自动跟踪邮件状态",
            "到期前自动发送提醒",
            "记录供应商响应时间"
          ]
        },
        {
          id: "inq-4",
          title: "OCR识别报价",
          description: "自动识别供应商报价单",
          details: [
            "上传供应商报价单（PDF/图片）",
            "AI自动识别报价信息",
            "提取价格、交期、付款条款",
            "人工确认识别结果"
          ],
          tips: ["支持多种报价单格式，识别准确率>95%"]
        }
      ]
    },
    {
      id: "price-analysis",
      name: "价格分析与决策流程",
      steps: [
        {
          id: "ana-1",
          title: "AI价格分析",
          description: "AI自动分析各供应商报价",
          details: [
            "对比各供应商报价",
            "与历史价格对比分析",
            "计算综合成本（含运费、税费）",
            "生成价格分析报告"
          ]
        },
        {
          id: "ana-2",
          title: "最佳价值评估",
          description: "综合评估供应商价值",
          details: [
            "价格权重评分",
            "质量历史评分",
            "交付准时率评分",
            "服务响应评分"
          ],
          tips: ["评分权重可在系统设置中调整"]
        },
        {
          id: "ana-3",
          title: "风险评估",
          description: "评估采购风险",
          details: [
            "供应商财务风险评估",
            "供货能力风险评估",
            "地缘政治风险评估",
            "替代供应商建议"
          ],
          warnings: ["高风险供应商需额外审批"]
        },
        {
          id: "ana-4",
          title: "采购决策",
          description: "生成采购建议并决策",
          details: [
            "AI生成采购建议",
            "提交审批流程",
            "审批通过后生成采购订单",
            "同步至财务系统"
          ]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "询价效率提升",
      description: "相比人工询价的效率提升比例",
      expectedValue: ">300%"
    },
    {
      id: "effect-2",
      metric: "OCR识别准确率",
      description: "报价单自动识别的准确程度",
      expectedValue: ">95%"
    },
    {
      id: "effect-3",
      metric: "采购成本节约",
      description: "通过AI分析实现的成本节约",
      expectedValue: "5-15%"
    },
    {
      id: "effect-4",
      metric: "供应商响应率",
      description: "供应商在截止日期前响应的比例",
      expectedValue: ">90%"
    }
  ],
  errorCodes: [
    {
      code: "AI_001",
      description: "OCR识别失败",
      solution: "确保上传文件清晰，支持PDF、PNG、JPG格式"
    },
    {
      code: "AI_002",
      description: "邮件发送失败",
      solution: "检查供应商邮箱地址是否正确，检查邮件服务配置"
    },
    {
      code: "AI_003",
      description: "价格分析数据不足",
      solution: "需要至少3家供应商报价才能进行有效分析"
    }
  ]
};

// 3-3-3-1财务管控系统帮助内容
export const finance3331HelpContent: SubsystemHelpContent = {
  id: "finance-3331",
  name: "3-3-3-1财务管控系统",
  nameEn: "3-3-3-1 Financial Control System",
  description: "基于3-3-3-1付款节点的项目财务管控，实现预算编制、付款管控和成本监控",
  icon: <ClipboardList className="h-5 w-5" />,
  overview: `3-3-3-1财务管控系统基于GRT特有的付款节点模式（合同签订30%、发货前30%、验收后30%、
质保期后10%），实现项目全生命周期的财务管控。系统支持预算编制与审批、付款节点自动触发、
成本实时监控和预警、以及与MES和采购系统的深度集成。`,
  prerequisites: [
    {
      id: "cost-center",
      name: "成本中心设置",
      description: "项目成本中心和费用科目配置",
      required: true,
      format: "成本中心主数据",
      example: "成本中心代码、名称、所属事业部、费用科目"
    },
    {
      id: "budget-template",
      name: "预算模板",
      description: "项目预算编制的标准模板",
      required: true,
      format: "预算模板表",
      example: "费用类别、预算比例、审批层级"
    },
    {
      id: "payment-terms",
      name: "付款条款配置",
      description: "3-3-3-1付款节点的具体条款",
      required: true,
      format: "付款条款表",
      example: "节点名称、比例、触发条件、审批要求"
    }
  ],
  operationFlows: [
    {
      id: "budget-flow",
      name: "项目预算编制流程",
      steps: [
        {
          id: "bud-1",
          title: "预算初始化",
          description: "创建项目预算",
          details: [
            "进入【财务管理】→【预算编制】",
            "选择项目和预算模板",
            "AI根据历史项目推荐预算",
            "填写各费用科目预算金额"
          ],
          tips: ["AI推荐基于相似项目的历史数据"]
        },
        {
          id: "bud-2",
          title: "预算审批",
          description: "提交预算审批",
          details: [
            "预算编制完成后提交审批",
            "根据金额自动匹配审批流程",
            "审批人在线审批或驳回",
            "审批通过后预算生效"
          ],
          warnings: ["超过100万的预算需总经理审批"]
        },
        {
          id: "bud-3",
          title: "预算下达",
          description: "预算下达至执行部门",
          details: [
            "审批通过后自动下达",
            "通知相关部门负责人",
            "预算数据同步至成本监控",
            "开放费用报销和采购申请"
          ]
        }
      ]
    },
    {
      id: "payment-control",
      name: "付款节点管控流程",
      steps: [
        {
          id: "pay-1",
          title: "付款条款配置",
          description: "配置项目付款节点",
          details: [
            "在项目中配置3-3-3-1付款条款",
            "设置各节点触发条件",
            "关联里程碑和验收标准",
            "配置付款审批流程"
          ]
        },
        {
          id: "pay-2",
          title: "节点触发确认",
          description: "确认付款节点触发",
          details: [
            "系统自动检测触发条件",
            "满足条件后通知财务",
            "财务确认并发起收款",
            "记录收款状态和日期"
          ],
          tips: ["节点触发后24小时内需确认"]
        },
        {
          id: "pay-3",
          title: "业务锁定机制",
          description: "未付款时锁定相关业务",
          details: [
            "客户未按时付款时触发锁定",
            "锁定发货、生产等业务操作",
            "发送催款通知给客户",
            "付款确认后自动解锁"
          ],
          warnings: ["锁定操作需销售经理确认"]
        }
      ]
    },
    {
      id: "cost-monitor",
      name: "成本实时监控流程",
      steps: [
        {
          id: "cost-1",
          title: "成本归集",
          description: "自动归集项目成本",
          details: [
            "采购成本自动归集",
            "工时成本自动计算",
            "费用报销自动归集",
            "外协成本自动归集"
          ]
        },
        {
          id: "cost-2",
          title: "预算对比",
          description: "实时对比预算与实际",
          details: [
            "查看预算执行进度",
            "分析预算偏差原因",
            "预测最终成本",
            "生成成本分析报告"
          ]
        },
        {
          id: "cost-3",
          title: "预警审批",
          description: "成本超支预警与审批",
          details: [
            "超支80%时黄色预警",
            "超支100%时红色预警",
            "超支需申请追加预算",
            "审批通过后更新预算"
          ],
          warnings: ["红色预警会暂停相关采购申请"]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "预算控制率",
      description: "项目实际成本在预算范围内的比例",
      expectedValue: ">90%"
    },
    {
      id: "effect-2",
      metric: "回款及时率",
      description: "客户按节点及时付款的比例",
      expectedValue: ">85%"
    },
    {
      id: "effect-3",
      metric: "成本可视化程度",
      description: "成本数据实时可查的覆盖率",
      expectedValue: "100%"
    },
    {
      id: "effect-4",
      metric: "预警响应时间",
      description: "从预警触发到处理完成的平均时间",
      expectedValue: "<24小时"
    }
  ],
  errorCodes: [
    {
      code: "FIN_001",
      description: "预算科目不存在",
      solution: "联系财务管理员添加费用科目"
    },
    {
      code: "FIN_002",
      description: "付款节点触发失败",
      solution: "检查触发条件是否满足，确认里程碑状态"
    },
    {
      code: "FIN_003",
      description: "成本归集异常",
      solution: "检查成本中心配置，确认费用单据状态"
    }
  ]
};

// 门径管理系统帮助内容
export const gateManagementHelpContent: SubsystemHelpContent = {
  id: "gate-management",
  name: "门径管理系统",
  nameEn: "Gate Management System",
  description: "M0-M12项目里程碑门径管理和H1-H4人力资本门径管理",
  icon: <Workflow className="h-5 w-5" />,
  overview: `门径管理系统实现项目和人力资源的阶段性管控，包括M0-M12项目里程碑门径（从商机到质保结束）
和H1-H4人力资本门径（从JD发布到转正）。系统区分硬门径（必须通过）和软门径（可条件通过），
支持检查清单、评审会议和否决机制。`,
  prerequisites: [
    {
      id: "gate-template",
      name: "门径模板配置",
      description: "各类型项目的门径模板",
      required: true,
      format: "门径模板表",
      example: "门径代码、名称、类型（硬/软）、检查项"
    },
    {
      id: "checklist-items",
      name: "检查清单项",
      description: "各门径的检查清单明细",
      required: true,
      format: "检查清单表",
      example: "检查项代码、名称、必填/选填、评分标准"
    },
    {
      id: "reviewer-config",
      name: "评审人员配置",
      description: "各门径的评审人员和权限",
      required: true,
      format: "评审配置表",
      example: "门径代码、评审角色、否决权限"
    }
  ],
  operationFlows: [
    {
      id: "m0-m12-flow",
      name: "M0-M12里程碑管理流程",
      steps: [
        {
          id: "m-1",
          title: "里程碑初始化",
          description: "项目创建时初始化里程碑",
          details: [
            "创建项目时自动生成M0-M12里程碑",
            "根据项目类型加载门径模板",
            "设置各里程碑计划日期",
            "分配里程碑负责人"
          ]
        },
        {
          id: "m-2",
          title: "检查清单填写",
          description: "完成门径检查清单",
          details: [
            "进入当前里程碑检查清单",
            "逐项填写完成情况",
            "上传支撑文件和证据",
            "提交检查清单审核"
          ],
          tips: ["必填项必须全部完成才能提交"]
        },
        {
          id: "m-3",
          title: "门径评审会议",
          description: "组织门径评审会议",
          details: [
            "系统自动发送评审会议邀请",
            "评审人员在线评审检查清单",
            "记录评审意见和决议",
            "投票决定是否通过"
          ]
        },
        {
          id: "m-4",
          title: "否决与放行机制",
          description: "处理门径评审结果",
          details: [
            "硬门径：必须全票通过",
            "软门径：可条件通过",
            "否决后记录原因和整改要求",
            "整改完成后重新评审"
          ],
          warnings: ["硬门径否决将暂停项目进度"]
        }
      ]
    },
    {
      id: "h1-h4-flow",
      name: "H1-H4人力资本门径流程",
      steps: [
        {
          id: "h-1",
          title: "JD结构化",
          description: "创建结构化岗位说明书",
          details: [
            "使用AI辅助生成JD",
            "定义岗位能力要求",
            "设置面试评估标准",
            "发布招聘需求"
          ],
          tips: ["AI会参考历史JD和行业标准"]
        },
        {
          id: "h-2",
          title: "面试评估",
          description: "结构化面试评估",
          details: [
            "按能力维度设计面试题",
            "多轮面试评分记录",
            "AI辅助评估候选人",
            "生成综合评估报告"
          ]
        },
        {
          id: "h-3",
          title: "入职KPI生成",
          description: "自动生成入职KPI",
          details: [
            "根据JD自动生成试用期KPI",
            "设置KPI考核周期",
            "分配导师和辅导计划",
            "启动试用期跟踪"
          ]
        },
        {
          id: "h-4",
          title: "转正评审",
          description: "试用期转正评审",
          details: [
            "汇总试用期KPI完成情况",
            "导师评价和360度反馈",
            "转正评审会议",
            "通过后更新员工状态"
          ],
          warnings: ["KPI完成率<80%需延长试用期"]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "门径通过率",
      description: "首次评审即通过的比例",
      expectedValue: ">75%"
    },
    {
      id: "effect-2",
      metric: "项目延期率",
      description: "因门径问题导致延期的项目比例",
      expectedValue: "<10%"
    },
    {
      id: "effect-3",
      metric: "试用期转正率",
      description: "试用期员工成功转正的比例",
      expectedValue: ">85%"
    },
    {
      id: "effect-4",
      metric: "评审效率",
      description: "从提交到评审完成的平均时间",
      expectedValue: "<3工作日"
    }
  ],
  errorCodes: [
    {
      code: "GATE_001",
      description: "检查清单不完整",
      solution: "确保所有必填项已填写并上传支撑文件"
    },
    {
      code: "GATE_002",
      description: "评审人员不足",
      solution: "联系项目管理员配置评审人员"
    },
    {
      code: "GATE_003",
      description: "门径顺序错误",
      solution: "必须按顺序通过门径，不能跳过"
    }
  ]
};

// 工作流引擎帮助内容
export const workflowEngineHelpContent: SubsystemHelpContent = {
  id: "workflow-engine",
  name: "工作流引擎系统",
  nameEn: "Workflow Engine System",
  description: "可视化流程设计、表单构建和流程执行管理",
  icon: <Workflow className="h-5 w-5" />,
  overview: `工作流引擎系统提供可视化的流程设计和表单构建能力，支持审批流程、业务流程和自动化流程的
配置和执行。系统与其他子系统深度集成，实现跨系统的流程协同。`,
  prerequisites: [
    {
      id: "org-data",
      name: "组织架构数据",
      description: "用于流程中的人员选择和审批",
      required: true,
      format: "组织架构表",
      example: "部门、岗位、人员、汇报关系"
    },
    {
      id: "role-config",
      name: "角色权限配置",
      description: "流程中各角色的权限设置",
      required: true,
      format: "角色权限表",
      example: "角色代码、流程权限、数据权限"
    }
  ],
  operationFlows: [
    {
      id: "process-design",
      name: "流程设计流程",
      steps: [
        {
          id: "des-1",
          title: "创建流程",
          description: "创建新的业务流程",
          details: [
            "进入【流程管理】→【新建流程】",
            "选择流程模板或从空白开始",
            "填写流程基本信息",
            "进入可视化设计器"
          ]
        },
        {
          id: "des-2",
          title: "节点设计",
          description: "设计流程节点",
          details: [
            "拖拽添加流程节点",
            "配置节点类型（审批/抄送/条件/自动）",
            "设置节点处理人",
            "配置节点超时和提醒"
          ],
          tips: ["支持按角色、部门、指定人员等多种方式配置处理人"]
        },
        {
          id: "des-3",
          title: "属性配置",
          description: "配置流程属性",
          details: [
            "配置流程触发条件",
            "设置流程优先级",
            "配置异常处理规则",
            "设置流程SLA"
          ]
        },
        {
          id: "des-4",
          title: "发布流程",
          description: "测试并发布流程",
          details: [
            "在测试环境验证流程",
            "检查流程完整性",
            "提交流程审批",
            "审批通过后发布"
          ],
          warnings: ["发布后的流程修改需要重新审批"]
        }
      ]
    },
    {
      id: "form-build",
      name: "表单构建流程",
      steps: [
        {
          id: "form-1",
          title: "创建表单",
          description: "创建流程表单",
          details: [
            "进入【表单管理】→【新建表单】",
            "选择表单模板或空白表单",
            "填写表单基本信息"
          ]
        },
        {
          id: "form-2",
          title: "字段添加",
          description: "添加表单字段",
          details: [
            "拖拽添加表单字段",
            "支持文本、数字、日期、选择等类型",
            "支持关联其他数据表",
            "支持公式计算字段"
          ]
        },
        {
          id: "form-3",
          title: "属性配置",
          description: "配置字段属性",
          details: [
            "设置字段必填/选填",
            "配置字段校验规则",
            "设置默认值和提示",
            "配置字段联动规则"
          ]
        },
        {
          id: "form-4",
          title: "权限配置",
          description: "配置表单权限",
          details: [
            "设置各节点的字段可见性",
            "设置各节点的字段可编辑性",
            "配置数据范围权限",
            "保存并关联流程"
          ]
        }
      ]
    },
    {
      id: "process-exec",
      name: "流程执行流程",
      steps: [
        {
          id: "exec-1",
          title: "发起流程",
          description: "发起业务流程",
          details: [
            "选择要发起的流程",
            "填写流程表单",
            "上传附件（如需要）",
            "提交流程"
          ]
        },
        {
          id: "exec-2",
          title: "审批处理",
          description: "处理待审批任务",
          details: [
            "查看【我的待办】",
            "审阅流程表单和附件",
            "填写审批意见",
            "同意/驳回/转办"
          ]
        },
        {
          id: "exec-3",
          title: "流程流转",
          description: "流程自动流转",
          details: [
            "系统自动流转至下一节点",
            "发送通知给下一处理人",
            "记录流程日志",
            "更新流程状态"
          ]
        },
        {
          id: "exec-4",
          title: "流程归档",
          description: "流程结束归档",
          details: [
            "流程结束后自动归档",
            "生成流程完成报告",
            "数据同步至业务系统",
            "支持流程查询和导出"
          ]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "流程处理时效",
      description: "流程从发起到完成的平均时间",
      expectedValue: "较人工减少50%"
    },
    {
      id: "effect-2",
      metric: "流程合规率",
      description: "按规定流程执行的比例",
      expectedValue: "100%"
    },
    {
      id: "effect-3",
      metric: "审批及时率",
      description: "在SLA内完成审批的比例",
      expectedValue: ">95%"
    },
    {
      id: "effect-4",
      metric: "流程可追溯性",
      description: "流程记录完整可追溯的比例",
      expectedValue: "100%"
    }
  ],
  errorCodes: [
    {
      code: "WF_001",
      description: "流程节点配置错误",
      solution: "检查节点处理人配置，确保有有效的处理人"
    },
    {
      code: "WF_002",
      description: "表单校验失败",
      solution: "检查必填字段是否填写，数据格式是否正确"
    },
    {
      code: "WF_003",
      description: "流程超时",
      solution: "联系当前节点处理人或管理员进行催办"
    }
  ]
};

// 智能人才网格帮助内容
export const talentGridHelpContent: SubsystemHelpContent = {
  id: "talent-grid",
  name: "智能人才网格系统",
  nameEn: "Intelligent Talent Grid System",
  description: "技能图谱管理、DA跨岗位逻辑和安全红线规则",
  icon: <Target className="h-5 w-5" />,
  overview: `智能人才网格系统实现员工技能的可视化管理和智能匹配，包括技能图谱构建、能力评估、
发展规划和数字助手（DA）的跨岗位协作。系统支持安全红线规则配置，确保敏感操作的合规性。`,
  prerequisites: [
    {
      id: "skill-catalog",
      name: "技能目录",
      description: "企业技能分类和定义",
      required: true,
      format: "技能目录表",
      example: "技能代码、名称、类别、等级定义"
    },
    {
      id: "position-skill",
      name: "岗位技能要求",
      description: "各岗位的技能要求矩阵",
      required: true,
      format: "岗位技能表",
      example: "岗位代码、技能代码、要求等级"
    },
    {
      id: "redline-rules",
      name: "安全红线规则",
      description: "需要特殊管控的操作规则",
      required: true,
      format: "红线规则表",
      example: "规则代码、触发条件、管控措施"
    }
  ],
  operationFlows: [
    {
      id: "skill-map",
      name: "技能图谱管理流程",
      steps: [
        {
          id: "skill-1",
          title: "技能录入",
          description: "录入员工技能信息",
          details: [
            "员工自评技能等级",
            "上传技能证书和证明",
            "主管确认技能评估",
            "系统记录技能档案"
          ]
        },
        {
          id: "skill-2",
          title: "能力评估",
          description: "定期能力评估",
          details: [
            "系统发起定期评估",
            "360度评估反馈",
            "技能测试（如适用）",
            "生成能力评估报告"
          ],
          tips: ["建议每季度进行一次能力评估"]
        },
        {
          id: "skill-3",
          title: "差距分析",
          description: "分析能力差距",
          details: [
            "对比岗位要求和实际能力",
            "识别关键能力差距",
            "AI推荐提升路径",
            "生成差距分析报告"
          ]
        },
        {
          id: "skill-4",
          title: "发展规划",
          description: "制定发展规划",
          details: [
            "根据差距制定发展计划",
            "匹配培训资源",
            "设置发展里程碑",
            "跟踪发展进度"
          ]
        }
      ]
    },
    {
      id: "da-cross",
      name: "DA跨岗位逻辑流程",
      steps: [
        {
          id: "da-1",
          title: "DA初始化",
          description: "初始化员工数字助手",
          details: [
            "员工入职时自动创建DA",
            "DA继承岗位基础能力",
            "配置DA个性化参数",
            "DA开始学习员工行为"
          ]
        },
        {
          id: "da-2",
          title: "助手订阅",
          description: "订阅功能型AI助手",
          details: [
            "DA根据岗位自动订阅相关助手",
            "员工可手动订阅额外助手",
            "配置助手优先级",
            "设置助手交互偏好"
          ],
          tips: ["DA会根据工作内容智能推荐助手"]
        },
        {
          id: "da-3",
          title: "故障继承",
          description: "DA故障时的继承机制",
          details: [
            "DA故障时自动切换备用",
            "继承历史交互记录",
            "保持工作连续性",
            "故障恢复后同步数据"
          ]
        },
        {
          id: "da-4",
          title: "跨部门协作",
          description: "DA跨部门协作",
          details: [
            "DA代表员工参与跨部门协作",
            "自动同步协作信息",
            "协调会议和任务",
            "生成协作报告"
          ]
        }
      ]
    },
    {
      id: "redline-flow",
      name: "安全红线规则流程",
      steps: [
        {
          id: "red-1",
          title: "规则配置",
          description: "配置安全红线规则",
          details: [
            "定义红线触发条件",
            "设置管控措施",
            "配置例外审批流程",
            "设置预警通知"
          ],
          warnings: ["红线规则修改需要安全管理员审批"]
        },
        {
          id: "red-2",
          title: "AI校验",
          description: "AI实时校验操作",
          details: [
            "AI监控用户操作",
            "实时匹配红线规则",
            "触发规则时拦截操作",
            "记录校验日志"
          ]
        },
        {
          id: "red-3",
          title: "拦截预警",
          description: "红线触发时的处理",
          details: [
            "拦截违规操作",
            "向用户显示警告",
            "通知安全管理员",
            "记录违规事件"
          ]
        },
        {
          id: "red-4",
          title: "例外审批",
          description: "特殊情况的例外处理",
          details: [
            "用户申请例外审批",
            "说明例外原因",
            "安全管理员审批",
            "审批通过后临时放行"
          ],
          tips: ["例外审批有时间限制，过期需重新申请"]
        }
      ]
    }
  ],
  effects: [
    {
      id: "effect-1",
      metric: "技能覆盖率",
      description: "员工技能档案完整的比例",
      expectedValue: ">95%"
    },
    {
      id: "effect-2",
      metric: "能力匹配度",
      description: "员工能力与岗位要求的匹配程度",
      expectedValue: ">80%"
    },
    {
      id: "effect-3",
      metric: "DA活跃率",
      description: "员工日常使用DA的比例",
      expectedValue: ">70%"
    },
    {
      id: "effect-4",
      metric: "红线拦截率",
      description: "违规操作被成功拦截的比例",
      expectedValue: "100%"
    }
  ],
  errorCodes: [
    {
      code: "TG_001",
      description: "技能评估冲突",
      solution: "自评与主管评估差异过大，需要沟通确认"
    },
    {
      code: "TG_002",
      description: "DA同步失败",
      solution: "检查网络连接，稍后重试或联系技术支持"
    },
    {
      code: "TG_003",
      description: "红线规则冲突",
      solution: "多条规则冲突，联系安全管理员调整规则优先级"
    }
  ]
};

// 所有子系统帮助内容
export const allSubsystemHelpContents: SubsystemHelpContent[] = [
  mesHelpContent,
  aiPurchaseHelpContent,
  finance3331HelpContent,
  gateManagementHelpContent,
  workflowEngineHelpContent,
  talentGridHelpContent,
];

// 子系统帮助面板组件属性
interface SubsystemHelpPanelProps {
  subsystem: SubsystemType;
  onClose?: () => void;
}

// 子系统帮助面板组件
export default function SubsystemHelpPanel({ subsystem, onClose }: SubsystemHelpPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const content = allSubsystemHelpContents.find(c => c.id === subsystem);
  
  if (!content) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center text-muted-foreground">
          未找到子系统帮助内容
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {content.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{content.name}</CardTitle>
              <CardDescription className="text-xs">{content.nameEn}</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              概述
            </TabsTrigger>
            <TabsTrigger value="prerequisites" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              前期输入
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              操作流程
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              执行效果
            </TabsTrigger>
          </TabsList>
          
          {/* 概述标签页 */}
          <TabsContent value="overview" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {content.overview}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      前期输入项
                    </div>
                    <p className="text-2xl font-bold">{content.prerequisites.length}</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Workflow className="h-4 w-4 text-primary" />
                      操作流程
                    </div>
                    <p className="text-2xl font-bold">{content.operationFlows.length}</p>
                  </Card>
                </div>
                
                {content.errorCodes && content.errorCodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      常见错误码
                    </h4>
                    <div className="space-y-2">
                      {content.errorCodes.map(error => (
                        <div key={error.code} className="p-2 rounded border text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono">{error.code}</Badge>
                            <span className="text-muted-foreground">{error.description}</span>
                          </div>
                          <p className="text-muted-foreground pl-4">
                            <span className="text-primary">解决方案：</span>{error.solution}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* 前期输入标签页 */}
          <TabsContent value="prerequisites" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {content.prerequisites.map(prereq => (
                  <Card key={prereq.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{prereq.name}</span>
                      </div>
                      <Badge variant={prereq.required ? "default" : "secondary"} className="text-xs">
                        {prereq.required ? "必填" : "选填"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{prereq.description}</p>
                    {prereq.format && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">格式要求：</span>
                        <span className="text-primary">{prereq.format}</span>
                      </div>
                    )}
                    {prereq.example && (
                      <div className="text-xs mt-1">
                        <span className="text-muted-foreground">示例：</span>
                        <span className="font-mono text-xs">{prereq.example}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* 操作流程标签页 */}
          <TabsContent value="operations" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="w-full">
                {content.operationFlows.map(flow => (
                  <AccordionItem key={flow.id} value={flow.id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-primary" />
                        {flow.name}
                        <Badge variant="outline" className="text-xs ml-2">
                          {flow.steps.length}步骤
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-6">
                        {flow.steps.map((step, index) => (
                          <div key={step.id} className="relative">
                            {index < flow.steps.length - 1 && (
                              <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />
                            )}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1 pb-4">
                                <h5 className="font-medium text-sm mb-1">{step.title}</h5>
                                <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                                
                                {step.details && step.details.length > 0 && (
                                  <div className="space-y-1 mb-2">
                                    {step.details.map((detail, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <ChevronRight className="h-3 w-3 text-muted-foreground mt-0.5" />
                                        <span>{detail}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {step.tips && step.tips.length > 0 && (
                                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 mb-2">
                                    {step.tips.map((tip, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                                        <Lightbulb className="h-3 w-3 mt-0.5" />
                                        <span>{tip}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {step.warnings && step.warnings.length > 0 && (
                                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                    {step.warnings.map((warning, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                                        <AlertTriangle className="h-3 w-3 mt-0.5" />
                                        <span>{warning}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </TabsContent>
          
          {/* 执行效果标签页 */}
          <TabsContent value="effects" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {content.effects.map(effect => (
                  <Card key={effect.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">{effect.metric}</span>
                      </div>
                      {effect.expectedValue && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {effect.expectedValue}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{effect.description}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// 子系统帮助按钮组件
interface SubsystemHelpButtonProps {
  subsystem: SubsystemType;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SubsystemHelpButton({ subsystem, variant = "ghost", size = "icon" }: SubsystemHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = allSubsystemHelpContents.find(c => c.id === subsystem);
  
  if (!content) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        title={`${content.name}帮助`}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4">
            <SubsystemHelpPanel subsystem={subsystem} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
