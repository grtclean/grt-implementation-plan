/**
 * AI Version Generation Service
 * 
 * 在M2阶段提供AI辅助功能：
 * - 项目摘要自动生成
 * - 相似项目推荐
 * - AI版本建议（AIV0/V1/V2）
 */

import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";
import { projects, projectVersions } from "../../drizzle/schema";
import { eq, desc, sql, like, and, or } from "drizzle-orm";

// 项目信息接口
interface ProjectInfo {
  id: number;
  name: string;
  description?: string;
  customerName?: string;
  productType?: string;
  cleanlinessLevel?: string;
  cycleTime?: string;
  loadingForm?: string;
  budget?: number;
  requirements?: string;
}

// AI版本接口
interface AIVersion {
  versionCode: string; // AIV0, AIV1, AIV2
  versionName: string;
  description: string;
  features: string[];
  estimatedCost: number;
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

// 相似项目接口
interface SimilarProject {
  id: number;
  name: string;
  similarity: number; // 0-100
  matchedCriteria: string[];
  completionDate?: string;
  outcome?: string;
}

/**
 * 生成项目摘要
 */
export async function generateProjectSummary(project: ProjectInfo): Promise<string> {
  const prompt = `作为GRT智能清洗系统的AI方案助手，请根据以下项目信息生成一份专业的项目摘要：

项目名称：${project.name}
客户名称：${project.customerName || '未指定'}
产品类型：${project.productType || '未指定'}
清洁度要求：${project.cleanlinessLevel || '未指定'}
节拍要求：${project.cycleTime || '未指定'}
上下料方式：${project.loadingForm || '未指定'}
预算范围：${project.budget ? `${project.budget}万元` : '未指定'}
详细需求：${project.requirements || project.description || '未提供'}

请生成一份简洁专业的项目摘要（200-300字），包括：
1. 项目背景和目标
2. 关键技术要求
3. 主要挑战和风险点
4. 建议的解决方向

请直接输出摘要内容，不要包含标题或编号。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是GRT智能清洗系统的AI方案助手，专注于工业清洗设备的方案设计和项目规划。" },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0]?.message?.content || "无法生成项目摘要";
  } catch (error) {
    console.error("Error generating project summary:", error);
    return "项目摘要生成失败，请稍后重试";
  }
}

/**
 * 查找相似项目
 */
export async function findSimilarProjects(project: ProjectInfo): Promise<SimilarProject[]> {
  try {
    // 从数据库查询历史项目
    const db = await requireDb();
    if (!db) {
      return getMockSimilarProjects();
    }
    const historicalProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          sql`${projects.id} != ${project.id}`,
          or(
            project.productType ? like(projects.description, `%${project.productType}%`) : sql`1=0`,
            project.customerName ? like(projects.description, `%${project.customerName}%`) : sql`1=0`
          )
        )
      )
      .limit(10);

    // 使用AI分析相似度
    if (historicalProjects.length === 0) {
      // 返回模拟数据
      return getMockSimilarProjects();
    }

    const prompt = `作为GRT智能清洗系统的AI分析助手，请分析以下项目与历史项目的相似度：

当前项目：
- 名称：${project.name}
- 产品类型：${project.productType || '未指定'}
- 清洁度要求：${project.cleanlinessLevel || '未指定'}
- 节拍要求：${project.cycleTime || '未指定'}

历史项目列表：
${historicalProjects.map((p, i) => `${i + 1}. ${p.name} - ${p.description || '无描述'}`).join('\n')}

请以JSON格式返回相似度分析结果，格式如下：
{
  "projects": [
    {
      "index": 1,
      "similarity": 85,
      "matchedCriteria": ["产品类型相同", "清洁度要求相近"],
      "recommendation": "可参考该项目的技术方案"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是GRT智能清洗系统的AI分析助手，专注于项目相似度分析。请以JSON格式返回分析结果。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "similar_projects",
          strict: true,
          schema: {
            type: "object",
            properties: {
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    similarity: { type: "integer" },
                    matchedCriteria: { type: "array", items: { type: "string" } },
                    recommendation: { type: "string" }
                  },
                  required: ["index", "similarity", "matchedCriteria", "recommendation"],
                  additionalProperties: false
                }
              }
            },
            required: ["projects"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return getMockSimilarProjects();
    }

    const result = JSON.parse(content);
    return result.projects.map((p: any, i: number) => ({
      id: historicalProjects[p.index - 1]?.id || i + 1,
      name: historicalProjects[p.index - 1]?.name || `历史项目${i + 1}`,
      similarity: p.similarity,
      matchedCriteria: p.matchedCriteria,
      completionDate: historicalProjects[p.index - 1]?.updatedAt?.split('T')[0],
      outcome: p.recommendation
    }));
  } catch (error) {
    console.error("Error finding similar projects:", error);
    return getMockSimilarProjects();
  }
}

/**
 * 生成AI版本建议
 */
export async function generateAIVersions(project: ProjectInfo): Promise<AIVersion[]> {
  const prompt = `作为GRT智能清洗系统的AI方案助手，请根据以下项目信息生成三个不同级别的AI版本建议（AIV0基础版、AIV1标准版、AIV2高级版）：

项目名称：${project.name}
客户名称：${project.customerName || '未指定'}
产品类型：${project.productType || '未指定'}
清洁度要求：${project.cleanlinessLevel || '未指定'}
节拍要求：${project.cycleTime || '未指定'}
上下料方式：${project.loadingForm || '未指定'}
预算范围：${project.budget ? `${project.budget}万元` : '未指定'}
详细需求：${project.requirements || project.description || '未提供'}

请以JSON格式返回三个版本的建议，每个版本包括：
- versionCode: 版本代码（AIV0/AIV1/AIV2）
- versionName: 版本名称
- description: 版本描述
- features: 主要功能列表（数组）
- estimatedCost: 预估成本（万元）
- estimatedDuration: 预估工期
- riskLevel: 风险等级（low/medium/high）
- recommendation: 推荐理由`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是GRT智能清洗系统的AI方案助手，专注于工业清洗设备的方案设计。请以JSON格式返回版本建议。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_versions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    versionCode: { type: "string" },
                    versionName: { type: "string" },
                    description: { type: "string" },
                    features: { type: "array", items: { type: "string" } },
                    estimatedCost: { type: "number" },
                    estimatedDuration: { type: "string" },
                    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                    recommendation: { type: "string" }
                  },
                  required: ["versionCode", "versionName", "description", "features", "estimatedCost", "estimatedDuration", "riskLevel", "recommendation"],
                  additionalProperties: false
                }
              }
            },
            required: ["versions"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return getMockAIVersions(project);
    }

    const result = JSON.parse(content);
    return result.versions;
  } catch (error) {
    console.error("Error generating AI versions:", error);
    return getMockAIVersions(project);
  }
}

/**
 * 保存AI版本到数据库
 */
export async function saveAIVersion(
  projectId: number,
  version: AIVersion,
  createdBy: string
): Promise<number> {
  try {
    const db = await requireDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [result] = await db.insert(projectVersions).values({
      projectId,
      versionCode: version.versionCode,
      baseProjectCode: version.versionCode,
      deltaInput: version.description || '',
      versionJson: JSON.stringify({
        versionName: version.versionName,
        features: version.features,
        estimatedCost: version.estimatedCost,
        estimatedDuration: version.estimatedDuration,
        riskLevel: version.riskLevel,
        recommendation: version.recommendation,
      }),
      changesSummary: version.description || '',
      status: 'Draft',
      createdBy: Number(createdBy) || undefined,
    } as any).returning();

    return result?.id ?? 0;
  } catch (error) {
    console.error("Error saving AI version:", error);
    throw error;
  }
}

/**
 * 获取项目的AI版本列表
 */
export async function getProjectVersions(projectId: number): Promise<any[]> {
  try {
    const db = await requireDb();
    if (!db) {
      return [];
    }
    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.createdAt));

    return versions.map(v => {
      const versionData = v.versionJson ? JSON.parse(v.versionJson as string) : {};
      return {
        ...v,
        features: versionData.features || [],
      };
    });
  } catch (error) {
    console.error("Error getting project versions:", error);
    return [];
  }
}

// 模拟数据函数
function getMockSimilarProjects(): SimilarProject[] {
  return [
    {
      id: 101,
      name: "汽车零部件超声波清洗系统",
      similarity: 92,
      matchedCriteria: ["产品类型相同", "清洁度要求相近", "节拍要求相似"],
      completionDate: "2023-08-15",
      outcome: "项目成功交付，客户满意度高"
    },
    {
      id: 102,
      name: "精密零件多槽清洗线",
      similarity: 78,
      matchedCriteria: ["清洁度要求相近", "上下料方式相同"],
      completionDate: "2023-06-20",
      outcome: "可参考该项目的工艺流程设计"
    },
    {
      id: 103,
      name: "航空零件高精度清洗设备",
      similarity: 65,
      matchedCriteria: ["清洁度要求相近"],
      completionDate: "2023-04-10",
      outcome: "该项目采用了先进的干燥技术"
    }
  ];
}

function getMockAIVersions(project: ProjectInfo): AIVersion[] {
  const baseCost = project.budget || 100;
  
  return [
    {
      versionCode: "AIV0",
      versionName: "基础版",
      description: "满足基本清洗需求的标准配置方案，适合预算有限或需求简单的场景",
      features: [
        "单槽超声波清洗",
        "基础PLC控制系统",
        "手动上下料",
        "标准干燥系统",
        "基础水处理"
      ],
      estimatedCost: Math.round(baseCost * 0.7),
      estimatedDuration: "8-10周",
      riskLevel: "low",
      recommendation: "适合预算有限、清洁度要求不高的场景，性价比最高"
    },
    {
      versionCode: "AIV1",
      versionName: "标准版",
      description: "满足中等清洁度要求的优化配置方案，平衡性能与成本",
      features: [
        "多槽超声波清洗",
        "智能PLC控制系统",
        "半自动上下料",
        "热风+真空干燥",
        "循环水处理系统",
        "基础MES接口"
      ],
      estimatedCost: Math.round(baseCost * 1.0),
      estimatedDuration: "10-12周",
      riskLevel: "medium",
      recommendation: "推荐方案，满足大多数工业清洗需求，具有良好的扩展性"
    },
    {
      versionCode: "AIV2",
      versionName: "高级版",
      description: "满足高精度清洁要求的全自动化方案，适合高端制造场景",
      features: [
        "多槽超声波+喷淋清洗",
        "智能控制系统+AI优化",
        "全自动机械手上下料",
        "真空干燥+氮气保护",
        "超纯水处理系统",
        "完整MES/ERP集成",
        "在线清洁度检测",
        "远程监控和诊断"
      ],
      estimatedCost: Math.round(baseCost * 1.5),
      estimatedDuration: "14-16周",
      riskLevel: "medium",
      recommendation: "适合高端制造、航空航天等对清洁度要求极高的场景"
    }
  ];
}

export default {
  generateProjectSummary,
  findSimilarProjects,
  generateAIVersions,
  saveAIVersion,
  getProjectVersions
};
