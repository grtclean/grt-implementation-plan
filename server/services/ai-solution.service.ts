/**
 * AI方案助手服务
 * 基于客户需求推荐清洗方案，学习历史项目数据
 */

import { invokeLLM } from "../_core/llm";

export interface CustomerRequirement {
  productType: string;           // 产品类型
  partInfo: string;              // 零件信息
  cleanlinessLevel: string;      // 清洁度要求
  cycleTime: number;             // 节拍时间（秒）
  loadingForm: string;           // 上下料形式
  specialRequirements?: string;  // 特殊要求
}

export interface SolutionRecommendation {
  id: string;
  name: string;
  description: string;
  equipmentType: string;
  cleaningProcess: string[];
  estimatedCost: number;
  deliveryTime: string;
  confidence: number;
  source: 'GRT' | 'INDUSTRY' | 'AI_GENERATED';
  referenceProjects?: string[];
}

export interface HistoricalProject {
  projectId: string;
  projectName: string;
  customerType: string;
  productType: string;
  cleanlinessLevel: string;
  solution: string;
  equipmentModel: string;
  deliveryDate: string;
  satisfaction: number;
}

// 模拟历史项目数据
const historicalProjects: HistoricalProject[] = [
  {
    projectId: "PRJ-2024-001",
    projectName: "客户A汽车零部件清洗线",
    customerType: "汽车制造",
    productType: "发动机缸体",
    cleanlinessLevel: "Class 100",
    solution: "超声波+喷淋组合清洗",
    equipmentModel: "GRT-USC-3000",
    deliveryDate: "2024-06-15",
    satisfaction: 95
  },
  {
    projectId: "PRJ-2024-002",
    projectName: "客户B精密零件清洗",
    customerType: "航空航天",
    productType: "精密轴承",
    cleanlinessLevel: "Class 10",
    solution: "真空超声波清洗",
    equipmentModel: "GRT-VUC-2000",
    deliveryDate: "2024-08-20",
    satisfaction: 98
  },
  {
    projectId: "PRJ-2024-003",
    projectName: "客户C电子元件清洗",
    customerType: "电子制造",
    productType: "PCB板",
    cleanlinessLevel: "Class 1000",
    solution: "水基清洗+烘干",
    equipmentModel: "GRT-WBC-1500",
    deliveryDate: "2024-09-10",
    satisfaction: 92
  }
];

/**
 * 基于客户需求推荐清洗方案
 */
export async function recommendSolution(
  requirement: CustomerRequirement
): Promise<SolutionRecommendation[]> {
  try {
    // 首先从历史项目中查找相似案例
    const similarProjects = findSimilarProjects(requirement);
    
    // 使用AI生成推荐方案
    const prompt = buildSolutionPrompt(requirement, similarProjects);
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是GRT公司的AI方案助手，专门为工业清洗设备提供解决方案推荐。
你的任务是：
1. 分析客户需求
2. 参考历史成功案例
3. 推荐最合适的清洗方案
4. 提供设备型号和工艺流程建议

GRT公司的核心产品线：
- GRT-USC系列：超声波清洗设备
- GRT-VUC系列：真空超声波清洗设备
- GRT-WBC系列：水基清洗设备
- GRT-SPC系列：喷淋清洗设备
- GRT-HYB系列：组合式清洗线`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "solution_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "方案名称" },
                    description: { type: "string", description: "方案描述" },
                    equipmentType: { type: "string", description: "推荐设备型号" },
                    cleaningProcess: {
                      type: "array",
                      items: { type: "string" },
                      description: "清洗工艺流程"
                    },
                    estimatedCost: { type: "number", description: "预估成本（万元）" },
                    deliveryTime: { type: "string", description: "预计交付周期" },
                    confidence: { type: "number", description: "推荐置信度 0-100" },
                    source: { type: "string", description: "方案来源：GRT/INDUSTRY/AI_GENERATED" }
                  },
                  required: ["name", "description", "equipmentType", "cleaningProcess", "estimatedCost", "deliveryTime", "confidence", "source"],
                  additionalProperties: false
                }
              }
            },
            required: ["recommendations"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    
    // 添加ID和参考项目
    return result.recommendations.map((rec: any, index: number) => ({
      id: `SOL-${Date.now()}-${index}`,
      ...rec,
      referenceProjects: similarProjects.map(p => p.projectId)
    }));
  } catch (error) {
    console.error("AI solution recommendation error:", error);
    // 返回默认推荐
    return getDefaultRecommendations(requirement);
  }
}

/**
 * 查找相似历史项目
 */
function findSimilarProjects(requirement: CustomerRequirement): HistoricalProject[] {
  return historicalProjects.filter(project => {
    // 简单的相似度匹配
    const productMatch = project.productType.toLowerCase().includes(requirement.productType.toLowerCase()) ||
                        requirement.productType.toLowerCase().includes(project.productType.toLowerCase());
    const cleanlinessMatch = project.cleanlinessLevel === requirement.cleanlinessLevel;
    return productMatch || cleanlinessMatch;
  }).slice(0, 3);
}

/**
 * 构建方案推荐提示词
 */
function buildSolutionPrompt(
  requirement: CustomerRequirement,
  similarProjects: HistoricalProject[]
): string {
  let prompt = `请根据以下客户需求推荐清洗方案：

## 客户需求
- 产品类型：${requirement.productType}
- 零件信息：${requirement.partInfo}
- 清洁度要求：${requirement.cleanlinessLevel}
- 节拍时间：${requirement.cycleTime}秒
- 上下料形式：${requirement.loadingForm}
${requirement.specialRequirements ? `- 特殊要求：${requirement.specialRequirements}` : ''}
`;

  if (similarProjects.length > 0) {
    prompt += `\n## 参考历史项目\n`;
    similarProjects.forEach(project => {
      prompt += `- ${project.projectName}：${project.solution}，设备型号${project.equipmentModel}，客户满意度${project.satisfaction}%\n`;
    });
  }

  prompt += `\n请推荐2-3个合适的清洗方案，优先推荐GRT公司的成熟方案。`;

  return prompt;
}

/**
 * 获取默认推荐方案
 */
function getDefaultRecommendations(requirement: CustomerRequirement): SolutionRecommendation[] {
  return [
    {
      id: `SOL-${Date.now()}-0`,
      name: "标准超声波清洗方案",
      description: `针对${requirement.productType}的标准超声波清洗解决方案，满足${requirement.cleanlinessLevel}清洁度要求。`,
      equipmentType: "GRT-USC-2000",
      cleaningProcess: ["预洗", "超声波清洗", "漂洗", "烘干"],
      estimatedCost: 50,
      deliveryTime: "8-10周",
      confidence: 75,
      source: "GRT",
      referenceProjects: []
    },
    {
      id: `SOL-${Date.now()}-1`,
      name: "组合式清洗线方案",
      description: `针对${requirement.productType}的组合式清洗线，结合喷淋和超声波技术。`,
      equipmentType: "GRT-HYB-3000",
      cleaningProcess: ["高压喷淋预洗", "超声波精洗", "纯水漂洗", "热风烘干"],
      estimatedCost: 80,
      deliveryTime: "10-12周",
      confidence: 70,
      source: "GRT",
      referenceProjects: []
    }
  ];
}

/**
 * 学习新项目数据
 */
export function learnFromProject(project: HistoricalProject): void {
  // 将新项目添加到历史数据中
  historicalProjects.push(project);
  console.log(`Learned from project: ${project.projectId}`);
}

/**
 * 获取历史项目列表
 */
export function getHistoricalProjects(): HistoricalProject[] {
  return historicalProjects;
}
