/**
 * Interview Assistant - AI面试助手增强服务
 * 
 * 功能：
 * 1. 简历分析和关键信息提取
 * 2. 面试策略生成
 * 3. 面试问题推荐
 * 4. 候选人评估和建议
 * 5. 面试报告生成
 */

import { invokeAssistant, logAssistantCall } from "./gateway";
import { getAssistantConfig, INTERVIEW_ASSISTANT } from "./config";
import { getDb, requireDb } from "../db";
import { hrmCandidates, hrmAiInterviewRecords, hrmPositions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// 简历分析结果类型
export interface ResumeAnalysisResult {
  basicInfo: {
    name: string;
    age?: number;
    education: string;
    yearsOfExperience: number;
    currentPosition?: string;
    currentCompany?: string;
  };
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  experience: {
    company: string;
    position: string;
    duration: string;
    highlights: string[];
  }[];
  education: {
    school: string;
    degree: string;
    major: string;
    graduationYear: number;
  }[];
  strengths: string[];
  concerns: string[];
  overallScore: number; // 1-100
  recommendation: "strong_match" | "potential_match" | "weak_match" | "not_recommended";
}

// 面试策略类型
export interface InterviewStrategy {
  focusAreas: {
    area: string;
    reason: string;
    suggestedQuestions: string[];
  }[];
  redFlags: string[];
  positiveIndicators: string[];
  interviewFormat: {
    duration: number; // 分钟
    rounds: number;
    interviewers: string[];
  };
  assessmentCriteria: {
    criterion: string;
    weight: number;
    evaluationMethod: string;
  }[];
}

// 面试问题类型
export interface InterviewQuestion {
  id: string;
  category: "technical" | "behavioral" | "situational" | "cultural" | "motivation";
  question: string;
  followUpQuestions: string[];
  expectedAnswer?: string;
  evaluationCriteria: string;
  difficulty: "easy" | "medium" | "hard";
  timeAllocation: number; // 分钟
}

// 候选人评估类型
export interface CandidateAssessment {
  candidateId: number;
  overallScore: number;
  categoryScores: {
    category: string;
    score: number;
    comments: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  cultureFit: number;
  technicalFit: number;
  recommendation: "hire" | "pending" | "reject";
  recommendationReason: string;
  nextSteps: string[];
  salaryRecommendation?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * 分析候选人简历
 */
export async function analyzeResume(params: {
  userId: number;
  userName?: string;
  sessionId?: string;
  resumeText: string;
  positionId?: number;
}): Promise<{
  success: boolean;
  analysis?: ResumeAnalysisResult;
  error?: string;
}> {
  const db = await requireDb();
  
  // 获取职位信息（如果提供）
  let positionInfo = "";
  if (params.positionId && db) {
    const positions = await db
      .select()
      .from(hrmPositions)
      .where(eq(hrmPositions.id, params.positionId))
      .limit(1);
    
    if (positions.length > 0) {
      const pos = positions[0];
      positionInfo = `
目标职位信息：
- 职位名称：${pos.name}
- 职位代码：${pos.positionCode}
- 部门：${pos.department}
- 职级：${pos.department}
- 职位描述：${pos.responsibilities || "无"}
- 任职要求：${pos.qualifications || "无"}
`;
    }
  }

  const prompt = `请分析以下简历，提取关键信息并进行评估。

${positionInfo}

简历内容：
${params.resumeText}

请以JSON格式返回分析结果，包含以下字段：
{
  "basicInfo": {
    "name": "姓名",
    "age": 年龄（数字或null）,
    "education": "最高学历",
    "yearsOfExperience": 工作年限（数字）,
    "currentPosition": "当前职位",
    "currentCompany": "当前公司"
  },
  "skills": {
    "technical": ["技术技能列表"],
    "soft": ["软技能列表"],
    "languages": ["语言能力"],
    "certifications": ["证书列表"]
  },
  "experience": [
    {
      "company": "公司名",
      "position": "职位",
      "duration": "时间段",
      "highlights": ["工作亮点"]
    }
  ],
  "education": [
    {
      "school": "学校",
      "degree": "学位",
      "major": "专业",
      "graduationYear": 毕业年份
    }
  ],
  "strengths": ["优势列表"],
  "concerns": ["潜在问题或关注点"],
  "overallScore": 综合评分（1-100）,
  "recommendation": "strong_match|potential_match|weak_match|not_recommended"
}

只返回JSON，不要其他内容。`;

  const result = await invokeAssistant({
    assistantId: "interview",
    userId: params.userId,
    userName: params.userName,
    sessionId: params.sessionId,
    requestType: "resume_analysis",
    messages: [{ role: "user", content: prompt }],
  });

  if (!result.success || !result.response) {
    return { success: false, error: result.error || "Failed to analyze resume" };
  }

  try {
    // 尝试解析JSON响应
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "Invalid response format" };
    }
    
    const analysis = JSON.parse(jsonMatch[0]) as ResumeAnalysisResult;
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: "Failed to parse analysis result" };
  }
}

/**
 * 生成面试策略
 */
export async function generateInterviewStrategy(params: {
  userId: number;
  userName?: string;
  sessionId?: string;
  candidateId: number;
  positionId: number;
  resumeAnalysis?: ResumeAnalysisResult;
}): Promise<{
  success: boolean;
  strategy?: InterviewStrategy;
  error?: string;
}> {
  const db = await requireDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // 获取候选人信息
  const candidates = await db
    .select()
    .from(hrmCandidates)
    .where(eq(hrmCandidates.id, params.candidateId))
    .limit(1);

  if (candidates.length === 0) {
    return { success: false, error: "Candidate not found" };
  }

  const candidate = candidates[0];

  // 获取职位信息
  const positions = await db
    .select()
    .from(hrmPositions)
    .where(eq(hrmPositions.id, params.positionId))
    .limit(1);

  if (positions.length === 0) {
    return { success: false, error: "Position not found" };
  }

  const position = positions[0];

  const prompt = `请为以下候选人和职位生成面试策略。

候选人信息：
- 姓名：${candidate.name}
- 应聘职位：${candidate.positionName || "未知"}
- 工作年限：${candidate.workYears || "未知"}年
- 学历：${candidate.education || "未知"}
- 当前状态：${candidate.status}
${params.resumeAnalysis ? `
简历分析摘要：
- 综合评分：${params.resumeAnalysis.overallScore}/100
- 推荐等级：${params.resumeAnalysis.recommendation}
- 优势：${params.resumeAnalysis.strengths.join(", ")}
- 关注点：${params.resumeAnalysis.concerns.join(", ")}
` : ""}

目标职位：
- 职位名称：${position.name}
- 部门：${position.department}
- 职级：${position.department}
- 职位描述：${position.responsibilities || "无"}
- 任职要求：${position.qualifications || "无"}

请以JSON格式返回面试策略：
{
  "focusAreas": [
    {
      "area": "重点考察领域",
      "reason": "考察原因",
      "suggestedQuestions": ["建议问题1", "建议问题2"]
    }
  ],
  "redFlags": ["需要警惕的问题"],
  "positiveIndicators": ["积极信号"],
  "interviewFormat": {
    "duration": 面试时长（分钟）,
    "rounds": 建议轮次,
    "interviewers": ["建议面试官角色"]
  },
  "assessmentCriteria": [
    {
      "criterion": "评估标准",
      "weight": 权重（0-1）,
      "evaluationMethod": "评估方法"
    }
  ]
}

只返回JSON，不要其他内容。`;

  const result = await invokeAssistant({
    assistantId: "interview",
    userId: params.userId,
    userName: params.userName,
    sessionId: params.sessionId,
    requestType: "interview_strategy",
    messages: [{ role: "user", content: prompt }],
  });

  if (!result.success || !result.response) {
    return { success: false, error: result.error || "Failed to generate strategy" };
  }

  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "Invalid response format" };
    }
    
    const strategy = JSON.parse(jsonMatch[0]) as InterviewStrategy;
    return { success: true, strategy };
  } catch (error) {
    return { success: false, error: "Failed to parse strategy result" };
  }
}

/**
 * 生成面试问题
 */
export async function generateInterviewQuestions(params: {
  userId: number;
  userName?: string;
  sessionId?: string;
  positionId: number;
  category?: "technical" | "behavioral" | "situational" | "cultural" | "motivation";
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  customFocus?: string;
}): Promise<{
  success: boolean;
  questions?: InterviewQuestion[];
  error?: string;
}> {
  const db = await requireDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // 获取职位信息
  const positions = await db
    .select()
    .from(hrmPositions)
    .where(eq(hrmPositions.id, params.positionId))
    .limit(1);

  if (positions.length === 0) {
    return { success: false, error: "Position not found" };
  }

  const position = positions[0];
  const count = params.count || 5;
  const categoryText = params.category 
    ? `问题类型：${params.category}` 
    : "问题类型：综合（包含技术、行为、情境、文化、动机各类问题）";
  const difficultyText = params.difficulty 
    ? `难度级别：${params.difficulty}` 
    : "难度级别：混合";

  const prompt = `请为以下职位生成${count}个面试问题。

职位信息：
- 职位名称：${position.name}
- 部门：${position.department}
- 职级：${position.department}
- 职位描述：${position.responsibilities || "无"}
- 任职要求：${position.qualifications || "无"}

要求：
- ${categoryText}
- ${difficultyText}
${params.customFocus ? `- 特别关注：${params.customFocus}` : ""}

请以JSON数组格式返回问题列表：
[
  {
    "id": "Q001",
    "category": "technical|behavioral|situational|cultural|motivation",
    "question": "问题内容",
    "followUpQuestions": ["追问1", "追问2"],
    "expectedAnswer": "期望答案要点（可选）",
    "evaluationCriteria": "评估标准",
    "difficulty": "easy|medium|hard",
    "timeAllocation": 建议时间（分钟）
  }
]

只返回JSON数组，不要其他内容。`;

  const result = await invokeAssistant({
    assistantId: "interview",
    userId: params.userId,
    userName: params.userName,
    sessionId: params.sessionId,
    requestType: "generate_questions",
    messages: [{ role: "user", content: prompt }],
  });

  if (!result.success || !result.response) {
    return { success: false, error: result.error || "Failed to generate questions" };
  }

  try {
    const jsonMatch = result.response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, error: "Invalid response format" };
    }
    
    const questions = JSON.parse(jsonMatch[0]) as InterviewQuestion[];
    return { success: true, questions };
  } catch (error) {
    return { success: false, error: "Failed to parse questions result" };
  }
}

/**
 * 评估候选人
 */
export async function assessCandidate(params: {
  userId: number;
  userName?: string;
  sessionId?: string;
  candidateId: number;
  interviewNotes: string;
  interviewerFeedback?: string;
}): Promise<{
  success: boolean;
  assessment?: CandidateAssessment;
  error?: string;
}> {
  const db = await requireDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // 获取候选人信息
  const candidates = await db
    .select()
    .from(hrmCandidates)
    .where(eq(hrmCandidates.id, params.candidateId))
    .limit(1);

  if (candidates.length === 0) {
    return { success: false, error: "Candidate not found" };
  }

  const candidate = candidates[0];

  // 获取之前的面试记录
  const previousRecords = await db
    .select()
    .from(hrmAiInterviewRecords)
    .where(eq(hrmAiInterviewRecords.candidateId, params.candidateId))
    .orderBy(desc(hrmAiInterviewRecords.interviewedAt))
    .limit(5);

  const prompt = `请根据以下信息评估候选人。

候选人信息：
- 姓名：${candidate.name}
- 应聘职位：${candidate.positionName || "未知"}
- 工作年限：${candidate.workYears || "未知"}年
- 学历：${candidate.education || "未知"}

面试记录：
${params.interviewNotes}

${params.interviewerFeedback ? `面试官反馈：\n${params.interviewerFeedback}` : ""}

${previousRecords.length > 0 ? `
历史面试记录：
${previousRecords.map(r => `- ${r.interviewedAt}: 评分${r.overallScore}, 推荐${r.recommendation}`).join("\n")}
` : ""}

请以JSON格式返回评估结果：
{
  "candidateId": ${params.candidateId},
  "overallScore": 综合评分（1-100）,
  "categoryScores": [
    {
      "category": "评估维度",
      "score": 分数（1-100）,
      "comments": "评价"
    }
  ],
  "strengths": ["优势列表"],
  "weaknesses": ["不足列表"],
  "cultureFit": 文化契合度（1-100）,
  "technicalFit": 技术匹配度（1-100）,
  "recommendation": "hire|pending|reject",
  "recommendationReason": "推荐理由",
  "nextSteps": ["下一步建议"],
  "salaryRecommendation": {
    "min": 最低薪资,
    "max": 最高薪资,
    "currency": "CNY"
  }
}

只返回JSON，不要其他内容。`;

  const result = await invokeAssistant({
    assistantId: "interview",
    userId: params.userId,
    userName: params.userName,
    sessionId: params.sessionId,
    requestType: "candidate_assessment",
    messages: [{ role: "user", content: prompt }],
  });

  if (!result.success || !result.response) {
    return { success: false, error: result.error || "Failed to assess candidate" };
  }

  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "Invalid response format" };
    }
    
    const assessment = JSON.parse(jsonMatch[0]) as CandidateAssessment;
    
    // 保存评估记录到数据库
    const recordCode = `AIR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await db.insert(hrmAiInterviewRecords).values({
      recordCode,
      candidateId: params.candidateId,
      interviewType: "video",
      overallScore: assessment.overallScore,
      recommendation: assessment.recommendation,
      interviewStrategy: JSON.stringify({
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        technicalFit: assessment.technicalFit,
        cultureFit: assessment.cultureFit,
      }),
      transcript: params.interviewNotes,
      riskAssessment: JSON.stringify(assessment),
      interviewedAt: new Date().toISOString(),
    });
    
    return { success: true, assessment };
  } catch (error) {
    return { success: false, error: "Failed to parse assessment result" };
  }
}

/**
 * 生成面试报告
 */
export async function generateInterviewReport(params: {
  userId: number;
  userName?: string;
  sessionId?: string;
  candidateId: number;
  format?: "summary" | "detailed";
}): Promise<{
  success: boolean;
  report?: string;
  error?: string;
}> {
  const db = await requireDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // 获取候选人信息
  const candidates = await db
    .select()
    .from(hrmCandidates)
    .where(eq(hrmCandidates.id, params.candidateId))
    .limit(1);

  if (candidates.length === 0) {
    return { success: false, error: "Candidate not found" };
  }

  const candidate = candidates[0];

  // 获取所有面试记录
  const records = await db
    .select()
    .from(hrmAiInterviewRecords)
    .where(eq(hrmAiInterviewRecords.candidateId, params.candidateId))
    .orderBy(desc(hrmAiInterviewRecords.interviewedAt))
    .limit(1000);

  if (records.length === 0) {
    return { success: false, error: "No interview records found" };
  }

  const formatType = params.format || "summary";
  const prompt = `请根据以下信息生成候选人面试报告。

候选人信息：
- 姓名：${candidate.name}
- 应聘职位：${candidate.positionName || "未知"}
- 工作年限：${candidate.workYears || "未知"}年
- 学历：${candidate.education || "未知"}
- 当前状态：${candidate.status}

面试记录：
${records.map((r, i) => `
第${i + 1}轮面试（${r.interviewedAt ? new Date(r.interviewedAt).toLocaleDateString("zh-CN") : '未知'}\uff09\uff1a
- 类型：${r.interviewType}
- 综合评分：${r.overallScore}/100
- 推荐：${r.recommendation}
- 面试策略：${r.interviewStrategy || "无"}
- 记录：${r.transcript || "无"}
`).join("\n")}

请生成${formatType === "detailed" ? "详细" : "简要"}面试报告，使用Markdown格式，包含：
1. 候选人概况
2. 面试过程回顾
3. 能力评估
4. 综合结论
5. 录用建议

请直接输出Markdown格式的报告内容。`;

  const result = await invokeAssistant({
    assistantId: "interview",
    userId: params.userId,
    userName: params.userName,
    sessionId: params.sessionId,
    requestType: "generate_report",
    messages: [{ role: "user", content: prompt }],
  });

  if (!result.success || !result.response) {
    return { success: false, error: result.error || "Failed to generate report" };
  }

  return { success: true, report: result.response };
}
