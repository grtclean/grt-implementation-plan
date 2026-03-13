/**
 * 客户需求问卷路由
 * 基于 GRTclean_Parts_Cleaning_Questionaire_EN_V1.docx 设计
 */

import { z } from "zod";
import { jsonValue } from "@shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// 模拟问卷数据
const mockQuestionnaires = [
  {
    id: 1,
    questionnaireNo: "QN-2026-001",
    status: "APPROVED",
    contactPerson: "张建华",
    company: "某汽车零部件公司",
    email: "zhang@example.com",
    phone: "13800138001",
    quoteType: "NEW_PROJECT",
    projectName: "发动机缸体清洗线",
    partName: "发动机缸体",
    partDescription: "铝合金材质，带复杂内腔",
    materialTypes: ["ALUMINUM", "CASTING"],
    partWeightMin: 15,
    partWeightMax: 25,
    partLengthMin: 400,
    partLengthMax: 500,
    partWidthMin: 300,
    partWidthMax: 400,
    partHeightMin: 250,
    partHeightMax: 350,
    cleaningProductType: "WATER_BASED",
    contaminationTypes: ["COOLANT", "CHIPS", "OIL"],
    qualityControlMethods: ["SPRAY_TEST", "VISUAL"],
    dryingLevel: "LEVEL_2",
    cleanlinessStandard: "ISO 16232 Class 12",
    dailyPartQuantity: 200,
    cycleTimeSeconds: 180,
    annualVolume: 50000,
    oeeTarget: 85,
    shiftPattern: "TWO_SHIFT",
    loadingMethod: "ROBOT",
    availableSpaceLength: 15000,
    availableSpaceWidth: 8000,
    availableSpaceHeight: 5000,
    investmentBudgetMin: 2000000,
    investmentBudgetMax: 3000000,
    budgetCurrency: "CNY",
    projectTimeline: "6个月",
    additionalRequirements: "需要配备MES接口，支持追溯",
    aiAnalysis: {
      recommendedProductLine: "IC-2000系列",
      estimatedPrice: 2500000,
      keyFeatures: ["机器人上下料", "真空干燥", "MES集成"],
      riskAssessment: "中等复杂度，技术可行",
    },
    aiRecommendedProducts: ["IC-2000-X", "IC-2000-PRO"],
    aiEstimatedPrice: 2500000,
    createdAt: "2026-01-10",
    updatedAt: "2026-01-15",
  },
  {
    id: 2,
    questionnaireNo: "QN-2026-002",
    status: "UNDER_REVIEW",
    contactPerson: "陈明辉",
    company: "精密机械有限公司",
    email: "chen.mh@precision.com",
    phone: "13900139002",
    quoteType: "NEW_PROJECT",
    projectName: "精密零件超声波清洗",
    partName: "液压阀体",
    partDescription: "不锈钢材质，高精度加工面",
    materialTypes: ["STEEL"],
    partWeightMin: 0.5,
    partWeightMax: 2,
    partLengthMin: 50,
    partLengthMax: 100,
    partWidthMin: 30,
    partWidthMax: 60,
    partHeightMin: 20,
    partHeightMax: 50,
    cleaningProductType: "MODIFIED_ALCOHOL",
    contaminationTypes: ["OIL", "DUST"],
    qualityControlMethods: ["ULTRASONIC_TEST", "INK_TEST"],
    dryingLevel: "LEVEL_3",
    cleanlinessStandard: "VDA 19.1",
    dailyPartQuantity: 500,
    cycleTimeSeconds: 60,
    annualVolume: 125000,
    oeeTarget: 90,
    shiftPattern: "THREE_SHIFT",
    loadingMethod: "CONVEYOR",
    availableSpaceLength: 10000,
    availableSpaceWidth: 5000,
    availableSpaceHeight: 4000,
    investmentBudgetMin: 800000,
    investmentBudgetMax: 1200000,
    budgetCurrency: "CNY",
    projectTimeline: "4个月",
    additionalRequirements: "需要洁净室级别环境",
    aiAnalysis: {
      recommendedProductLine: "UC-3000系列",
      estimatedPrice: 950000,
      keyFeatures: ["多槽超声波", "改性醇清洗", "真空干燥"],
      riskAssessment: "标准项目，技术成熟",
    },
    aiRecommendedProducts: ["UC-3000-STD"],
    aiEstimatedPrice: 950000,
    createdAt: "2026-01-18",
    updatedAt: "2026-01-20",
  },
];

// 材料类型选项
const MATERIAL_TYPE_OPTIONS = [
  { value: "STEEL", label: "钢材 Steel", labelEn: "Steel" },
  { value: "ALUMINUM", label: "铝材 Aluminum", labelEn: "Aluminum" },
  { value: "NON_FERROUS", label: "有色金属 Non-ferrous", labelEn: "Non-ferrous metals" },
  { value: "CASTING", label: "铸件 Casting", labelEn: "Casting" },
  { value: "PLASTIC", label: "塑料 Plastic", labelEn: "Plastic" },
  { value: "OTHER", label: "其他 Other", labelEn: "Other" },
];

// 清洗产品类型选项
const CLEANING_PRODUCT_OPTIONS = [
  { value: "WATER_BASED", label: "水基 Water-based", labelEn: "Water-based" },
  { value: "ACIDIC", label: "酸性 Acidic", labelEn: "Acidic" },
  { value: "MODIFIED_ALCOHOL", label: "改性醇 Modified Alcohol", labelEn: "Modified Alcohol" },
  { value: "HYDROCARBON", label: "碳氢化合物 Hydrocarbon", labelEn: "Hydrocarbon" },
  { value: "OTHER", label: "其他 Other", labelEn: "Other" },
];

// 污染类型选项
const CONTAMINATION_TYPE_OPTIONS = [
  { value: "COOLANT", label: "切削液 Coolant", labelEn: "Coolant" },
  { value: "CHIPS", label: "切屑 Chips", labelEn: "Chips" },
  { value: "BURRS", label: "毛刺 Burrs", labelEn: "Burrs" },
  { value: "OIL", label: "油污 Oil", labelEn: "Oil" },
  { value: "GREASE", label: "油脂 Grease", labelEn: "Grease" },
  { value: "DUST", label: "灰尘 Dust", labelEn: "Dust" },
  { value: "OTHER", label: "其他 Other", labelEn: "Other" },
];

// 上下料方式选项
const LOADING_METHOD_OPTIONS = [
  { value: "MANUAL", label: "手动 Manual", labelEn: "Manual" },
  { value: "AUTO_CHAIN", label: "自动链条 Auto Chain", labelEn: "Auto Chain" },
  { value: "ROBOT", label: "机器人 Robot", labelEn: "Robot" },
  { value: "GANTRY", label: "龙门 Gantry", labelEn: "Gantry" },
  { value: "CONVEYOR", label: "输送带 Conveyor", labelEn: "Conveyor" },
  { value: "OTHER", label: "其他 Other", labelEn: "Other" },
];

export const questionnaireRouter = router({
  // 获取问卷列表
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "CONVERTED"]).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(10),
    }).optional())
    .query(({ input }) => {
      let result = [...mockQuestionnaires];
      
      if (input?.status) {
        result = result.filter(q => q.status === input.status);
      }
      if (input?.search) {
        const search = input.search.toLowerCase();
        result = result.filter(q => 
          q.questionnaireNo.toLowerCase().includes(search) ||
          q.company.toLowerCase().includes(search) ||
          q.projectName.toLowerCase().includes(search) ||
          q.contactPerson.toLowerCase().includes(search)
        );
      }
      
      const total = result.length;
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 10;
      const start = (page - 1) * pageSize;
      const items = result.slice(start, start + pageSize);
      
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // 获取问卷详情
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(({ input }) => {
      const questionnaire = mockQuestionnaires.find(q => q.id === input.id);
      if (!questionnaire) {
        throw new Error("问卷不存在");
      }
      return questionnaire;
    }),

  // 创建问卷
  create: protectedProcedure
    .input(z.object({
      contactPerson: z.string(),
      company: z.string(),
      email: z.string().email(),
      phone: z.string(),
      quoteType: z.enum(["NEW_PROJECT", "REPLACEMENT", "UPGRADE", "CONSULTATION"]),
      projectName: z.string(),
      partName: z.string().optional(),
      partDescription: z.string().optional(),
      materialTypes: z.array(z.string()).optional(),
      cleaningProductType: z.string().optional(),
      contaminationTypes: z.array(z.string()).optional(),
      dailyPartQuantity: z.number().optional(),
      cycleTimeSeconds: z.number().optional(),
      loadingMethod: z.string().optional(),
      additionalRequirements: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const newId = mockQuestionnaires.length + 1;
      const questionnaireNo = `QN-2026-${String(newId).padStart(3, "0")}`;
      
      return {
        success: true,
        id: newId,
        questionnaireNo,
        message: "问卷创建成功",
      };
    }),

  // 更新问卷
  update: requirePermission('oa:questionnaire:manage')
    .input(z.object({
      id: z.number(),
      data: z.record(z.string(), jsonValue),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "问卷更新成功",
      };
    }),

  // 提交问卷
  submit: requirePermission('oa:questionnaire:manage')
    .input(z.object({
      id: z.number(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "问卷已提交审核",
      };
    }),

  // 审核问卷
  review: requirePermission('oa:questionnaire:manage')
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: input.approved ? "问卷已批准" : "问卷已退回",
      };
    }),

  // 获取AI分析
  getAiAnalysis: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(({ input }) => {
      const questionnaire = mockQuestionnaires.find(q => q.id === input.id);
      if (!questionnaire) {
        throw new Error("问卷不存在");
      }
      
      return {
        analysis: questionnaire.aiAnalysis,
        recommendedProducts: questionnaire.aiRecommendedProducts,
        estimatedPrice: questionnaire.aiEstimatedPrice,
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
      };
    }),

  // 触发AI分析
  triggerAiAnalysis: requirePermission('oa:questionnaire:manage')
    .input(z.object({
      id: z.number(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "AI分析已触发，请稍后查看结果",
        estimatedTime: "30秒",
      };
    }),

  // 转换为项目
  convertToProject: requirePermission('oa:questionnaire:manage')
    .input(z.object({
      id: z.number(),
      projectName: z.string(),
      assignedSalesId: z.number().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        projectId: 100 + input.id,
        message: "问卷已转换为项目",
      };
    }),

  // 获取表单选项
  getFormOptions: protectedProcedure.query(() => {
    return {
      materialTypes: MATERIAL_TYPE_OPTIONS,
      cleaningProducts: CLEANING_PRODUCT_OPTIONS,
      contaminationTypes: CONTAMINATION_TYPE_OPTIONS,
      loadingMethods: LOADING_METHOD_OPTIONS,
      quoteTypes: [
        { value: "NEW_PROJECT", label: "新项目 New Project" },
        { value: "REPLACEMENT", label: "替换 Replacement" },
        { value: "UPGRADE", label: "升级 Upgrade" },
        { value: "CONSULTATION", label: "咨询 Consultation" },
      ],
      dryingLevels: [
        { value: "LEVEL_0", label: "Level 0 - 无要求" },
        { value: "LEVEL_1", label: "Level 1 - 表面无水滴" },
        { value: "LEVEL_2", label: "Level 2 - 完全干燥" },
        { value: "LEVEL_3", label: "Level 3 - 真空干燥" },
        { value: "LEVEL_4", label: "Level 4 - 超洁净干燥" },
      ],
      shiftPatterns: [
        { value: "ONE_SHIFT", label: "单班 One Shift" },
        { value: "TWO_SHIFT", label: "双班 Two Shift" },
        { value: "THREE_SHIFT", label: "三班 Three Shift" },
        { value: "CONTINUOUS", label: "连续生产 Continuous" },
      ],
    };
  }),

  // 获取问卷统计
  getStats: protectedProcedure.query(() => {
    return {
      total: mockQuestionnaires.length,
      draft: mockQuestionnaires.filter(q => q.status === "DRAFT").length,
      submitted: mockQuestionnaires.filter(q => q.status === "SUBMITTED").length,
      underReview: mockQuestionnaires.filter(q => q.status === "UNDER_REVIEW").length,
      approved: mockQuestionnaires.filter(q => q.status === "APPROVED").length,
      converted: mockQuestionnaires.filter(q => q.status === "CONVERTED").length,
      avgBudget: Math.round(mockQuestionnaires.reduce((sum, q) => sum + (q.investmentBudgetMin + q.investmentBudgetMax) / 2, 0) / mockQuestionnaires.length),
      totalPotentialValue: mockQuestionnaires.reduce((sum, q) => sum + (q.aiEstimatedPrice || 0), 0),
    };
  }),
});

export type QuestionnaireRouter = typeof questionnaireRouter;
