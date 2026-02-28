import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

// ---------------------------------------------------------------------------
// Excellence Culture Model — Data Types
// ---------------------------------------------------------------------------

interface Behavior {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  weight: number;
}

interface Pillar {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  icon: string; // lucide icon name
  score: number; // 0-100
  targetScore: number;
  behaviors: Behavior[];
}

interface ExcellenceModel {
  version: string;
  updatedAt: string;
  updatedBy: string;
  pillars: Pillar[];
}

// ---------------------------------------------------------------------------
// Seed Data — GRT Excellence Culture Model (6 Pillars)
// ---------------------------------------------------------------------------

let currentModel: ExcellenceModel = {
  version: "2.0",
  updatedAt: "2026-02-27T08:00:00Z",
  updatedBy: "CEO",
  pillars: [
    {
      id: "customer",
      name: "客户至上",
      nameEn: "Customer First",
      color: "#0078D4",
      icon: "Users",
      score: 82,
      targetScore: 95,
      behaviors: [
        { id: "c1", name: "客户需求洞察", nameEn: "Customer Insight", description: "深度理解客户业务流程和痛点", weight: 30 },
        { id: "c2", name: "解决方案导向", nameEn: "Solution-Oriented", description: "主动提供超越期望的解决方案", weight: 25 },
        { id: "c3", name: "交付承诺", nameEn: "Delivery Promise", description: "按时按质交付，言出必行", weight: 25 },
        { id: "c4", name: "售后响应", nameEn: "After-Sales Response", description: "24小时内响应客户问题", weight: 20 },
      ],
    },
    {
      id: "innovation",
      name: "持续创新",
      nameEn: "Continuous Innovation",
      color: "#107C10",
      icon: "Lightbulb",
      score: 68,
      targetScore: 90,
      behaviors: [
        { id: "i1", name: "技术前瞻", nameEn: "Tech Foresight", description: "关注行业前沿技术趋势", weight: 30 },
        { id: "i2", name: "流程改善", nameEn: "Process Improvement", description: "持续优化工作流程和方法", weight: 25 },
        { id: "i3", name: "跨界学习", nameEn: "Cross-Domain Learning", description: "主动学习跨领域知识", weight: 25 },
        { id: "i4", name: "创意落地", nameEn: "Idea Execution", description: "将创新想法转化为可执行方案", weight: 20 },
      ],
    },
    {
      id: "quality",
      name: "品质卓越",
      nameEn: "Quality Excellence",
      color: "#C239B3",
      icon: "Award",
      score: 88,
      targetScore: 98,
      behaviors: [
        { id: "q1", name: "零缺陷思维", nameEn: "Zero-Defect Mindset", description: "一次做对，追求完美", weight: 30 },
        { id: "q2", name: "标准化执行", nameEn: "Standardized Execution", description: "严格遵循SOP和质量标准", weight: 25 },
        { id: "q3", name: "持续改进", nameEn: "Continuous Improvement", description: "运用PDCA/8D方法论改进", weight: 25 },
        { id: "q4", name: "全员质量意识", nameEn: "Quality Awareness", description: "每位员工都是质量守门人", weight: 20 },
      ],
    },
    {
      id: "teamwork",
      name: "协同共赢",
      nameEn: "Collaborative Win-Win",
      color: "#4F6BED",
      icon: "Handshake",
      score: 75,
      targetScore: 92,
      behaviors: [
        { id: "t1", name: "跨部门协作", nameEn: "Cross-Dept Collaboration", description: "打破部门壁垒，主动协同", weight: 30 },
        { id: "t2", name: "知识共享", nameEn: "Knowledge Sharing", description: "主动分享经验和知识", weight: 25 },
        { id: "t3", name: "信任文化", nameEn: "Trust Culture", description: "建立互信互助的团队氛围", weight: 25 },
        { id: "t4", name: "冲突管理", nameEn: "Conflict Management", description: "建设性地解决分歧", weight: 20 },
      ],
    },
    {
      id: "execution",
      name: "高效执行",
      nameEn: "Efficient Execution",
      color: "#D83B01",
      icon: "Zap",
      score: 79,
      targetScore: 93,
      behaviors: [
        { id: "e1", name: "目标导向", nameEn: "Goal-Oriented", description: "聚焦关键目标，结果说话", weight: 30 },
        { id: "e2", name: "敏捷响应", nameEn: "Agile Response", description: "快速适应变化，灵活调整", weight: 25 },
        { id: "e3", name: "资源优化", nameEn: "Resource Optimization", description: "最小投入获取最大产出", weight: 25 },
        { id: "e4", name: "闭环思维", nameEn: "Closed-Loop Thinking", description: "任务有始有终，及时复盘", weight: 20 },
      ],
    },
    {
      id: "integrity",
      name: "诚信正直",
      nameEn: "Integrity & Ethics",
      color: "#744DA9",
      icon: "Shield",
      score: 92,
      targetScore: 100,
      behaviors: [
        { id: "g1", name: "合规经营", nameEn: "Compliance", description: "严守法律法规和公司制度", weight: 30 },
        { id: "g2", name: "透明沟通", nameEn: "Transparent Communication", description: "坦诚沟通，不隐瞒不回避", weight: 25 },
        { id: "g3", name: "社会责任", nameEn: "Social Responsibility", description: "关注ESG和企业社会责任", weight: 25 },
        { id: "g4", name: "以身作则", nameEn: "Lead by Example", description: "管理者率先垂范", weight: 20 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ROLE_LEVELS (mirrors client)
// ---------------------------------------------------------------------------

const ROLE_LEVELS: Record<string, number> = {
  guest: 0, employee: 1, production_worker: 1,
  team_lead: 2, bu_sales: 2, bu_mech: 2, bu_elec: 2, procurement_eng: 2, cs_engineer: 2,
  dept_manager: 3, bu_pm: 3, hr_specialist: 3, finance_specialist: 3,
  hr_manager: 4, finance_manager: 4, director: 5, bu_gm: 6, admin: 10,
};

// ---------------------------------------------------------------------------
// CSV Parser — converts CSV text to pillar data
// ---------------------------------------------------------------------------

function parseCsvToModel(csvText: string, csvUploadedBy: string): ExcellenceModel {
  const lines = csvText.trim().split("\n").map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = lines[0].map(h => h.toLowerCase());
  const pillarIdx = headers.findIndex(h => h.includes("pillar") || h.includes("维度") || h.includes("dimension"));
  const behaviorIdx = headers.findIndex(h => h.includes("behavior") || h.includes("行为") || h.includes("value"));
  const descIdx = headers.findIndex(h => h.includes("description") || h.includes("描述") || h.includes("detail"));
  const scoreIdx = headers.findIndex(h => h.includes("score") || h.includes("评分") || h.includes("rating"));
  const targetIdx = headers.findIndex(h => h.includes("target") || h.includes("目标"));
  const weightIdx = headers.findIndex(h => h.includes("weight") || h.includes("权重"));

  const colors = ["#0078D4", "#107C10", "#C239B3", "#4F6BED", "#D83B01", "#744DA9", "#008272", "#B4009E"];
  const icons = ["Users", "Lightbulb", "Award", "Handshake", "Zap", "Shield", "Heart", "Star"];

  // Group rows by pillar
  const pillarMap = new Map<string, { behaviors: Array<{ name: string; desc: string; weight: number }>; score: number; target: number }>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length < 2) continue;
    const pillarName = pillarIdx >= 0 ? row[pillarIdx] : row[0];
    const behaviorName = behaviorIdx >= 0 ? row[behaviorIdx] : row[1];
    const desc = descIdx >= 0 ? row[descIdx] : (row[2] || "");
    const score = scoreIdx >= 0 ? parseFloat(row[scoreIdx]) || 0 : 80;
    const target = targetIdx >= 0 ? parseFloat(row[targetIdx]) || 0 : 95;
    const weight = weightIdx >= 0 ? parseFloat(row[weightIdx]) || 25 : 25;

    if (!pillarName) continue;
    if (!pillarMap.has(pillarName)) {
      pillarMap.set(pillarName, { behaviors: [], score, target });
    }
    const pillar = pillarMap.get(pillarName)!;
    if (behaviorName) {
      pillar.behaviors.push({ name: behaviorName, desc, weight });
    }
    // Use max score/target seen for the pillar
    if (score > pillar.score) pillar.score = score;
    if (target > pillar.target) pillar.target = target;
  }

  const pillars: Pillar[] = [];
  let idx = 0;
  for (const [name, data] of pillarMap) {
    const pillarId = name.replace(/\s+/g, "_").toLowerCase().substring(0, 20);
    pillars.push({
      id: pillarId,
      name,
      nameEn: name, // CSV may not have English names
      color: colors[idx % colors.length],
      icon: icons[idx % icons.length],
      score: data.score,
      targetScore: data.target,
      behaviors: data.behaviors.map((b, bi) => ({
        id: `${pillarId}_${bi}`,
        name: b.name,
        nameEn: b.name,
        description: b.desc,
        weight: b.weight,
      })),
    });
    idx++;
  }

  return {
    version: `csv-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    updatedBy: csvUploadedBy,
    pillars,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const excellenceCultureRouter = router({
  getModel: protectedProcedure.query(() => {
    return currentModel;
  }),

  uploadCsv: protectedProcedure
    .input(z.object({
      csvContent: z.string().min(10),
      userRole: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const roleLevel = ROLE_LEVELS[input.userRole ?? "employee"] ?? 1;
      if (roleLevel < 5) {
        throw new Error("Only directors and above can update the Excellence Model");
      }
      const newModel = parseCsvToModel(input.csvContent, input.userRole ?? "admin");
      currentModel = newModel;
      return { success: true, pillarCount: newModel.pillars.length, version: newModel.version };
    }),

  analyzeAlignment: protectedProcedure
    .input(z.object({
      employeeName: z.string().optional(),
      userRole: z.string().optional(),
    }))
    .mutation(({ input }) => {
      // Mock AI alignment analysis
      const pillars = currentModel.pillars;
      const analysis = pillars.map(p => {
        const alignmentScore = Math.floor(Math.random() * 30) + 60; // 60-90
        const gap = p.targetScore - alignmentScore;
        let recommendation: string;
        if (gap <= 5) recommendation = `在"${p.name}"维度表现优秀，继续保持！`;
        else if (gap <= 15) recommendation = `在"${p.name}"维度接近目标，建议参加相关培训提升至${p.targetScore}分`;
        else recommendation = `在"${p.name}"维度存在明显差距(${gap}分)，建议制定专项改进计划`;
        return {
          pillarId: p.id,
          pillarName: p.name,
          alignmentScore,
          targetScore: p.targetScore,
          gap,
          recommendation,
          strengths: p.behaviors.slice(0, 2).map(b => b.name),
          improvements: p.behaviors.slice(-1).map(b => b.name),
        };
      });

      const overallScore = Math.round(analysis.reduce((s, a) => s + a.alignmentScore, 0) / analysis.length);
      const overallGrade = overallScore >= 85 ? "A" : overallScore >= 75 ? "B" : overallScore >= 65 ? "C" : "D";

      return {
        employeeName: input.employeeName || "当前用户",
        overallScore,
        overallGrade,
        generatedAt: new Date().toISOString(),
        aiModel: "Claude + Gemini Collaborative Analysis",
        analysis,
        summary: overallScore >= 80
          ? `${input.employeeName || "您"}与GRT卓越文化模型高度对齐(${overallScore}分/${overallGrade}级)。核心优势在品质卓越和诚信正直维度。建议在持续创新维度加强跨界学习。`
          : `${input.employeeName || "您"}与GRT卓越文化模型整体对齐度为${overallScore}分(${overallGrade}级)。建议重点关注低于目标的维度，制定季度改进计划。`,
      };
    }),
});
