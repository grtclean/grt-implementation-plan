/**
 * 客户方案沟通确认会议服务
 * Customer Solution Meeting Service
 * 
 * 提供AI案例匹配、智能方案建议、技术资料调用、语音识别和版本管理功能
 */

import { v4 as uuidv4 } from 'uuid';
import { requireDb } from '../db';
import { invokeLLM } from '../_core/llm';
import { transcribeAudio } from '../_core/voiceTranscription';
import { storagePut } from '../storage';

// ============================================================================
// 类型定义
// ============================================================================

export interface CustomerSolutionMeeting {
  id: string;
  title: string;
  meetingType: 'internal' | 'external';
  meetingMode: 'online' | 'offline' | 'hybrid';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  customerId?: string;
  customerName?: string;
  customerContact?: string;
  customerRequirements?: string;
  cleanlinessLevel?: string;
  cleanlinessStandard?: string;
  cleanlinessDetails?: any;
  productType?: string;
  partName?: string;
  partMaterial?: string;
  partDimensions?: any;
  cycleTime?: number;
  loadingForm?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  organizerId: string;
  organizerName: string;
  internalParticipants?: any[];
  externalParticipants?: any[];
  aiCaseMatchingEnabled: boolean;
  aiSolutionSuggestionEnabled: boolean;
  aiVoiceRecognitionEnabled: boolean;
  relatedProjectId?: string;
  relatedOpportunityId?: string;
  createdBy: string;
}

export interface CaseMatchRequest {
  meetingId: string;
  productType?: string;
  partMaterial?: string;
  cleanlinessLevel?: string;
  cleanlinessStandard?: string;
  cycleTime?: number;
  customerIndustry?: string;
  keywords?: string[];
  uploadedFileIds?: string[];
}

export interface MatchedCase {
  caseId: string;
  caseNumber: string;
  caseName: string;
  similarityScore: number;
  matchDimensions: {
    productType: number;
    material: number;
    cleanliness: number;
    cycleTime: number;
    industry: number;
    overall: number;
  };
  highlights: string[];
}

export interface SolutionSuggestion {
  title: string;
  summary: string;
  equipmentConfig: any;
  processFlow: any[];
  processSteps: any[];
  projectPhases: any[];
  estimatedCost?: number;
  deliveryTime?: number;
  confidence: number;
  referenceCases: string[];
  aiAnalysis: string;
}

// ============================================================================
// 1. 会议管理服务
// ============================================================================

/**
 * 创建客户方案会议
 */
export async function createCustomerSolutionMeeting(
  meeting: Omit<CustomerSolutionMeeting, 'id'>
): Promise<{ id: string }> {
  const db = await requireDb();
  const id = uuidv4();
  
  await (db as any).execute({
    sql: `INSERT INTO customer_solution_meetings (
      id, title, meeting_type, meeting_mode, status,
      customer_id, customer_name, customer_contact, customer_requirements,
      cleanliness_level, cleanliness_standard, cleanliness_details,
      product_type, part_name, part_material, part_dimensions, cycle_time, loading_form,
      scheduled_start, scheduled_end,
      organizer_id, organizer_name, internal_participants, external_participants,
      ai_case_matching_enabled, ai_solution_suggestion_enabled, ai_voice_recognition_enabled,
      related_project_id, related_opportunity_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, meeting.title, meeting.meetingType, meeting.meetingMode || 'online', meeting.status || 'scheduled',
      meeting.customerId || null, meeting.customerName || null, meeting.customerContact || null, meeting.customerRequirements || null,
      meeting.cleanlinessLevel || null, meeting.cleanlinessStandard || null, JSON.stringify(meeting.cleanlinessDetails || null),
      meeting.productType || null, meeting.partName || null, meeting.partMaterial || null, JSON.stringify(meeting.partDimensions || null), meeting.cycleTime || null, meeting.loadingForm || null,
      meeting.scheduledStart || null, meeting.scheduledEnd || null,
      meeting.organizerId, meeting.organizerName, JSON.stringify(meeting.internalParticipants || []), JSON.stringify(meeting.externalParticipants || []),
      meeting.aiCaseMatchingEnabled ?? true, meeting.aiSolutionSuggestionEnabled ?? true, meeting.aiVoiceRecognitionEnabled ?? true,
      meeting.relatedProjectId || null, meeting.relatedOpportunityId || null, meeting.createdBy
    ]
  });
  
  return { id };
}

/**
 * 获取会议详情
 */
export async function getCustomerSolutionMeeting(meetingId: string): Promise<CustomerSolutionMeeting | null> {
  const db = await requireDb();
  const result = await (db as any).execute({
    sql: `SELECT * FROM customer_solution_meetings WHERE id = ?`,
    args: [meetingId]
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0] as any;
  return {
    id: row.id,
    title: row.title,
    meetingType: row.meeting_type,
    meetingMode: row.meeting_mode,
    status: row.status,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerContact: row.customer_contact,
    customerRequirements: row.customer_requirements,
    cleanlinessLevel: row.cleanliness_level,
    cleanlinessStandard: row.cleanliness_standard,
    cleanlinessDetails: row.cleanliness_details ? JSON.parse(row.cleanliness_details) : null,
    productType: row.product_type,
    partName: row.part_name,
    partMaterial: row.part_material,
    partDimensions: row.part_dimensions ? JSON.parse(row.part_dimensions) : null,
    cycleTime: row.cycle_time,
    loadingForm: row.loading_form,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    internalParticipants: row.internal_participants ? JSON.parse(row.internal_participants) : [],
    externalParticipants: row.external_participants ? JSON.parse(row.external_participants) : [],
    aiCaseMatchingEnabled: row.ai_case_matching_enabled,
    aiSolutionSuggestionEnabled: row.ai_solution_suggestion_enabled,
    aiVoiceRecognitionEnabled: row.ai_voice_recognition_enabled,
    relatedProjectId: row.related_project_id,
    relatedOpportunityId: row.related_opportunity_id,
    createdBy: row.created_by
  };
}

/**
 * 获取会议列表
 */
export async function listCustomerSolutionMeetings(params: {
  meetingType?: 'internal' | 'external';
  status?: string;
  customerId?: string;
  organizerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ meetings: CustomerSolutionMeeting[]; total: number }> {
  const db = await requireDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  let whereClause = '1=1';
  const args: any[] = [];
  
  if (params.meetingType) {
    whereClause += ' AND meeting_type = ?';
    args.push(params.meetingType);
  }
  if (params.status) {
    whereClause += ' AND status = ?';
    args.push(params.status);
  }
  if (params.customerId) {
    whereClause += ' AND customer_id = ?';
    args.push(params.customerId);
  }
  if (params.organizerId) {
    whereClause += ' AND organizer_id = ?';
    args.push(params.organizerId);
  }
  if (params.startDate) {
    whereClause += ' AND scheduled_start >= ?';
    args.push(params.startDate);
  }
  if (params.endDate) {
    whereClause += ' AND scheduled_start <= ?';
    args.push(params.endDate);
  }
  
  // 获取总数
  const countResult = await (db as any).execute({
    sql: `SELECT COUNT(*) as total FROM customer_solution_meetings WHERE ${whereClause}`,
    args
  });
  const total = (countResult.rows[0] as any).total;
  
  // 获取列表
  const result = await (db as any).execute({
    sql: `SELECT * FROM customer_solution_meetings WHERE ${whereClause} ORDER BY scheduled_start DESC LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset]
  });
  
  const meetings = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    meetingType: row.meeting_type,
    meetingMode: row.meeting_mode,
    status: row.status,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerContact: row.customer_contact,
    customerRequirements: row.customer_requirements,
    cleanlinessLevel: row.cleanliness_level,
    cleanlinessStandard: row.cleanliness_standard,
    cleanlinessDetails: row.cleanliness_details ? JSON.parse(row.cleanliness_details) : null,
    productType: row.product_type,
    partName: row.part_name,
    partMaterial: row.part_material,
    partDimensions: row.part_dimensions ? JSON.parse(row.part_dimensions) : null,
    cycleTime: row.cycle_time,
    loadingForm: row.loading_form,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    internalParticipants: row.internal_participants ? JSON.parse(row.internal_participants) : [],
    externalParticipants: row.external_participants ? JSON.parse(row.external_participants) : [],
    aiCaseMatchingEnabled: row.ai_case_matching_enabled,
    aiSolutionSuggestionEnabled: row.ai_solution_suggestion_enabled,
    aiVoiceRecognitionEnabled: row.ai_voice_recognition_enabled,
    relatedProjectId: row.related_project_id,
    relatedOpportunityId: row.related_opportunity_id,
    createdBy: row.created_by
  }));
  
  return { meetings, total };
}

// ============================================================================
// 2. 客户资料上传服务
// ============================================================================

/**
 * 上传客户资料
 */
export async function uploadCustomerFile(params: {
  meetingId: string;
  fileName: string;
  fileType: 'drawing' | 'cleanliness_spec' | 'part_photo' | 'document' | 'video' | 'audio' | 'other';
  fileCategory?: string;
  fileBuffer: Buffer;
  mimeType: string;
  description?: string;
  tags?: string[];
  uploadedBy: string;
}): Promise<{ id: string; fileUrl: string }> {
  const db = await requireDb();
  const id = uuidv4();
  
  // 上传到S3
  const fileKey = `customer-uploads/${params.meetingId}/${id}-${params.fileName}`;
  const { url: fileUrl } = await storagePut(fileKey, params.fileBuffer, params.mimeType);
  
  await (db as any).execute({
    sql: `INSERT INTO customer_uploads (
      id, meeting_id, file_name, file_type, file_category, file_url, file_size, mime_type,
      description, tags, ai_analysis_status, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [
      id, params.meetingId, params.fileName, params.fileType, params.fileCategory || null,
      fileUrl, params.fileBuffer.length, params.mimeType,
      params.description || null, JSON.stringify(params.tags || []), params.uploadedBy
    ]
  });
  
  return { id, fileUrl };
}

/**
 * 获取会议的所有上传文件
 */
export async function getCustomerUploads(meetingId: string): Promise<any[]> {
  const db = await requireDb();
  const result = await (db as any).execute({
    sql: `SELECT * FROM customer_uploads WHERE meeting_id = ? AND is_latest = TRUE ORDER BY uploaded_at DESC`,
    args: [meetingId]
  });
  
  return result.rows.map((row: any) => ({
    id: row.id,
    meetingId: row.meeting_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileCategory: row.file_category,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : [],
    aiAnalysisStatus: row.ai_analysis_status,
    aiExtractedText: row.ai_extracted_text,
    aiIdentifiedSpecs: row.ai_identified_specs ? JSON.parse(row.ai_identified_specs) : null,
    aiSuggestedCases: row.ai_suggested_cases ? JSON.parse(row.ai_suggested_cases) : null,
    version: row.version,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at
  }));
}

/**
 * AI分析上传的文件
 */
export async function analyzeUploadedFile(fileId: string): Promise<{
  extractedText: string;
  identifiedSpecs: any;
  suggestedCases: string[];
}> {
  const db = await requireDb();
  
  // 获取文件信息
  const fileResult = await (db as any).execute({
    sql: `SELECT * FROM customer_uploads WHERE id = ?`,
    args: [fileId]
  });
  
  if (fileResult.rows.length === 0) {
    throw new Error('File not found');
  }
  
  const file = fileResult.rows[0] as any;
  
  // 更新状态为处理中
  await (db as any).execute({
    sql: `UPDATE customer_uploads SET ai_analysis_status = 'processing' WHERE id = ?`,
    args: [fileId]
  });
  
  try {
    // 使用LLM分析文件内容
    const analysisPrompt = `请分析以下客户上传的文件信息，提取关键规格参数：

文件名：${file.file_name}
文件类型：${file.file_type}
文件描述：${file.description || '无'}

请提取以下信息（如果适用）：
1. 产品/零件名称
2. 材质
3. 尺寸规格
4. 清洁度要求
5. 工艺要求
6. 其他关键参数

请以JSON格式返回结果。`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是一个工业清洗设备技术专家，擅长分析客户提供的技术文档和图纸。' },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'file_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              productName: { type: 'string', description: '产品/零件名称' },
              material: { type: 'string', description: '材质' },
              dimensions: { type: 'object', description: '尺寸规格' },
              cleanlinessRequirement: { type: 'string', description: '清洁度要求' },
              processRequirements: { type: 'array', items: { type: 'string' }, description: '工艺要求' },
              otherSpecs: { type: 'object', description: '其他关键参数' },
              summary: { type: 'string', description: '分析摘要' }
            },
            required: ['summary'],
            additionalProperties: false
          }
        }
      }
    });
    
    const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
    
    // 更新分析结果
    await (db as any).execute({
      sql: `UPDATE customer_uploads SET 
        ai_analysis_status = 'completed',
        ai_extracted_text = ?,
        ai_identified_specs = ?
      WHERE id = ?`,
      args: [analysisResult.summary, JSON.stringify(analysisResult), fileId]
    });
    
    return {
      extractedText: analysisResult.summary,
      identifiedSpecs: analysisResult,
      suggestedCases: []
    };
  } catch (error) {
    await (db as any).execute({
      sql: `UPDATE customer_uploads SET ai_analysis_status = 'failed' WHERE id = ?`,
      args: [fileId]
    });
    throw error;
  }
}

// ============================================================================
// 3. AI案例匹配服务
// ============================================================================

/**
 * 执行AI案例匹配
 */
export async function matchCases(request: CaseMatchRequest): Promise<{
  matchedCases: MatchedCase[];
  aiAnalysis: string;
  recommendations: string[];
}> {
  const db = await requireDb();
  
  // 构建查询条件
  let whereClause = 'case_status = "active"';
  const args: any[] = [];
  
  if (request.productType) {
    whereClause += ' AND (product_type = ? OR product_type LIKE ?)';
    args.push(request.productType, `%${request.productType}%`);
  }
  if (request.partMaterial) {
    whereClause += ' AND (part_material = ? OR part_material LIKE ?)';
    args.push(request.partMaterial, `%${request.partMaterial}%`);
  }
  if (request.cleanlinessLevel) {
    whereClause += ' AND (cleanliness_level = ? OR cleanliness_level LIKE ?)';
    args.push(request.cleanlinessLevel, `%${request.cleanlinessLevel}%`);
  }
  if (request.customerIndustry) {
    whereClause += ' AND (customer_industry = ? OR customer_industry LIKE ?)';
    args.push(request.customerIndustry, `%${request.customerIndustry}%`);
  }
  
  // 查询匹配的案例
  const casesResult = await (db as any).execute({
    sql: `SELECT * FROM solution_cases WHERE ${whereClause} ORDER BY success_rate DESC, created_at DESC LIMIT 20`,
    args
  });
  
  // 计算相似度分数
  const matchedCases: MatchedCase[] = casesResult.rows.map((row: any) => {
    const matchDimensions = calculateSimilarity(request, row);
    return {
      caseId: row.id,
      caseNumber: row.case_number,
      caseName: row.case_name,
      similarityScore: matchDimensions.overall,
      matchDimensions,
      highlights: generateHighlights(request, row)
    };
  });
  
  // 按相似度排序
  matchedCases.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // 使用LLM生成分析和建议
  const aiAnalysisResult = await generateCaseMatchAnalysis(request, matchedCases.slice(0, 5));
  
  // 保存匹配记录
  const matchRecordId = uuidv4();
  await (db as any).execute({
    sql: `INSERT INTO case_match_records (
      id, meeting_id, match_request, matched_cases, total_matches,
      similarity_scores, ai_analysis, ai_recommendations, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      matchRecordId, request.meetingId, JSON.stringify(request),
      JSON.stringify(matchedCases.map(c => c.caseId)), matchedCases.length,
      JSON.stringify(matchedCases.map(c => ({ caseId: c.caseId, score: c.similarityScore }))),
      aiAnalysisResult.analysis, JSON.stringify(aiAnalysisResult.recommendations),
      'system'
    ]
  });
  
  return {
    matchedCases,
    aiAnalysis: aiAnalysisResult.analysis,
    recommendations: aiAnalysisResult.recommendations
  };
}

/**
 * 计算案例相似度
 */
function calculateSimilarity(request: CaseMatchRequest, caseRow: any): {
  productType: number;
  material: number;
  cleanliness: number;
  cycleTime: number;
  industry: number;
  overall: number;
} {
  let productType = 0, material = 0, cleanliness = 0, cycleTime = 0, industry = 0;
  
  // 产品类型匹配
  if (request.productType && caseRow.product_type) {
    if (request.productType === caseRow.product_type) productType = 100;
    else if (caseRow.product_type.includes(request.productType) || request.productType.includes(caseRow.product_type)) productType = 70;
    else productType = 30;
  }
  
  // 材质匹配
  if (request.partMaterial && caseRow.part_material) {
    if (request.partMaterial === caseRow.part_material) material = 100;
    else if (caseRow.part_material.includes(request.partMaterial) || request.partMaterial.includes(caseRow.part_material)) material = 70;
    else material = 30;
  }
  
  // 清洁度匹配
  if (request.cleanlinessLevel && caseRow.cleanliness_level) {
    if (request.cleanlinessLevel === caseRow.cleanliness_level) cleanliness = 100;
    else cleanliness = 50;
  }
  
  // 节拍匹配
  if (request.cycleTime && caseRow.cycle_time) {
    const diff = Math.abs(request.cycleTime - caseRow.cycle_time);
    if (diff === 0) cycleTime = 100;
    else if (diff <= 10) cycleTime = 80;
    else if (diff <= 30) cycleTime = 60;
    else cycleTime = 40;
  }
  
  // 行业匹配
  if (request.customerIndustry && caseRow.customer_industry) {
    if (request.customerIndustry === caseRow.customer_industry) industry = 100;
    else industry = 30;
  }
  
  // 计算综合得分（加权平均）
  const weights = { productType: 0.25, material: 0.2, cleanliness: 0.25, cycleTime: 0.15, industry: 0.15 };
  const overall = Math.round(
    productType * weights.productType +
    material * weights.material +
    cleanliness * weights.cleanliness +
    cycleTime * weights.cycleTime +
    industry * weights.industry
  );
  
  return { productType, material, cleanliness, cycleTime, industry, overall };
}

/**
 * 生成匹配亮点
 */
function generateHighlights(request: CaseMatchRequest, caseRow: any): string[] {
  const highlights: string[] = [];
  
  if (request.productType === caseRow.product_type) {
    highlights.push(`产品类型完全匹配：${caseRow.product_type}`);
  }
  if (request.partMaterial === caseRow.part_material) {
    highlights.push(`材质完全匹配：${caseRow.part_material}`);
  }
  if (request.cleanlinessLevel === caseRow.cleanliness_level) {
    highlights.push(`清洁度等级匹配：${caseRow.cleanliness_level}`);
  }
  if (caseRow.success_rate >= 95) {
    highlights.push(`高成功率案例：${caseRow.success_rate}%`);
  }
  if (caseRow.customer_satisfaction >= 4) {
    highlights.push(`客户满意度高：${caseRow.customer_satisfaction}/5`);
  }
  
  return highlights;
}

/**
 * 使用LLM生成案例匹配分析
 */
async function generateCaseMatchAnalysis(request: CaseMatchRequest, topCases: MatchedCase[]): Promise<{
  analysis: string;
  recommendations: string[];
}> {
  const prompt = `作为工业清洗设备技术专家，请分析以下客户需求与匹配案例：

客户需求：
- 产品类型：${request.productType || '未指定'}
- 材质：${request.partMaterial || '未指定'}
- 清洁度等级：${request.cleanlinessLevel || '未指定'}
- 清洁度标准：${request.cleanlinessStandard || '未指定'}
- 节拍要求：${request.cycleTime ? request.cycleTime + '秒' : '未指定'}
- 客户行业：${request.customerIndustry || '未指定'}

匹配到的Top案例：
${topCases.map((c, i) => `${i + 1}. ${c.caseName} (相似度: ${c.similarityScore}%)`).join('\n')}

请提供：
1. 案例匹配分析（说明为什么这些案例与客户需求相关）
2. 方案建议（基于匹配案例给出的建议）
3. 需要注意的风险点`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是GRT工业清洗设备公司的技术专家，擅长根据客户需求匹配历史案例并提供方案建议。' },
        { role: 'user', content: prompt }
      ]
    });
    
    const content = response.choices[0].message.content || '';
    
    return {
      analysis: content,
      recommendations: [
        '建议参考相似度最高的案例进行方案设计',
        '注意客户特殊的清洁度要求',
        '考虑节拍要求对设备配置的影响'
      ]
    };
  } catch (error) {
    return {
      analysis: '案例匹配分析生成失败，请手动查看匹配案例。',
      recommendations: ['请联系技术专家进行人工分析']
    };
  }
}

// ============================================================================
// 4. 智能方案建议服务
// ============================================================================

/**
 * 生成智能方案建议
 */
export async function generateSolutionSuggestion(params: {
  meetingId: string;
  customerRequirements: string;
  productType?: string;
  partMaterial?: string;
  cleanlinessLevel?: string;
  cleanlinessStandard?: string;
  cycleTime?: number;
  loadingForm?: string;
  referenceCaseIds?: string[];
}): Promise<SolutionSuggestion> {
  const db = await requireDb();
  
  // 获取参考案例详情
  let referenceCasesInfo = '';
  if (params.referenceCaseIds && params.referenceCaseIds.length > 0) {
    const casesResult = await (db as any).execute({
      sql: `SELECT * FROM solution_cases WHERE id IN (${params.referenceCaseIds.map(() => '?').join(',')})`,
      args: params.referenceCaseIds
    });
    
    referenceCasesInfo = casesResult.rows.map((row: any) => `
案例：${row.case_name}
方案摘要：${row.solution_summary}
设备配置：${row.equipment_config}
工艺流程：${row.process_flow}
`).join('\n---\n');
  }
  
  // 使用LLM生成方案建议
  const prompt = `作为GRT工业清洗设备技术专家，请根据以下客户需求生成完整的技术方案建议：

客户需求：
${params.customerRequirements}

技术参数：
- 产品类型：${params.productType || '未指定'}
- 材质：${params.partMaterial || '未指定'}
- 清洁度等级：${params.cleanlinessLevel || '未指定'}
- 清洁度标准：${params.cleanlinessStandard || '未指定'}
- 节拍要求：${params.cycleTime ? params.cycleTime + '秒' : '未指定'}
- 上下料形式：${params.loadingForm || '未指定'}

${referenceCasesInfo ? `参考案例：\n${referenceCasesInfo}` : ''}

请生成包含以下内容的技术方案：
1. 方案标题和摘要
2. 推荐的设备配置（清洗机型号、超声波配置、干燥系统等）
3. 工艺流程（清洗、漂洗、干燥等步骤）
4. 工序步骤（T1-T15）
5. 项目阶段规划（M0-M12）
6. 预估交付周期

请以JSON格式返回。`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: '你是GRT工业清洗设备公司的资深技术专家，擅长根据客户需求设计清洗设备方案。你的方案应该专业、详细、可执行。' },
      { role: 'user', content: prompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'solution_suggestion',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '方案标题' },
            summary: { type: 'string', description: '方案摘要' },
            equipmentConfig: {
              type: 'object',
              properties: {
                mainEquipment: { type: 'string', description: '主设备型号' },
                ultrasonicConfig: { type: 'string', description: '超声波配置' },
                dryingSystem: { type: 'string', description: '干燥系统' },
                conveyorSystem: { type: 'string', description: '输送系统' },
                additionalEquipment: { type: 'array', items: { type: 'string' }, description: '附加设备' }
              },
              required: ['mainEquipment'],
              additionalProperties: false
            },
            processFlow: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  duration: { type: 'number' },
                  parameters: { type: 'object' }
                },
                required: ['step', 'name', 'description'],
                additionalProperties: false
              }
            },
            processSteps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: '工序代码（T1-T15）' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  responsible: { type: 'string' }
                },
                required: ['code', 'name'],
                additionalProperties: false
              }
            },
            projectPhases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phase: { type: 'string', description: '阶段代码（M0-M12）' },
                  name: { type: 'string' },
                  duration: { type: 'number', description: '持续天数' },
                  deliverables: { type: 'array', items: { type: 'string' } },
                  milestones: { type: 'array', items: { type: 'string' } }
                },
                required: ['phase', 'name'],
                additionalProperties: false
              }
            },
            deliveryTime: { type: 'number', description: '预估交付周期（天）' },
            confidence: { type: 'number', description: '方案置信度（0-100）' },
            analysis: { type: 'string', description: '方案分析说明' }
          },
          required: ['title', 'summary', 'equipmentConfig', 'processFlow', 'confidence', 'analysis'],
          additionalProperties: false
        }
      }
    }
  });
  
  const suggestion = JSON.parse(response.choices[0].message.content || '{}');
  
  return {
    title: suggestion.title,
    summary: suggestion.summary,
    equipmentConfig: suggestion.equipmentConfig,
    processFlow: suggestion.processFlow || [],
    processSteps: suggestion.processSteps || [],
    projectPhases: suggestion.projectPhases || [],
    deliveryTime: suggestion.deliveryTime,
    confidence: suggestion.confidence,
    referenceCases: params.referenceCaseIds || [],
    aiAnalysis: suggestion.analysis
  };
}

// ============================================================================
// 5. 技术资料调用服务
// ============================================================================

/**
 * 搜索技术资料
 */
export async function searchTechnicalDocs(params: {
  query: string;
  projectPhase?: string;
  processStep?: string;
  docType?: string;
  limit?: number;
}): Promise<any[]> {
  const db = await requireDb();
  const limit = params.limit || 10;
  
  let whereClause = '1=1';
  const args: any[] = [];
  
  if (params.projectPhase) {
    whereClause += ' AND project_phase = ?';
    args.push(params.projectPhase);
  }
  if (params.processStep) {
    whereClause += ' AND process_step = ?';
    args.push(params.processStep);
  }
  if (params.docType) {
    whereClause += ' AND doc_type = ?';
    args.push(params.docType);
  }
  
  // 关键词搜索
  if (params.query) {
    whereClause += ' AND (doc_title LIKE ? OR doc_summary LIKE ? OR doc_content LIKE ?)';
    const searchTerm = `%${params.query}%`;
    args.push(searchTerm, searchTerm, searchTerm);
  }
  
  const result = await (db as any).execute({
    sql: `SELECT * FROM technical_docs_index WHERE ${whereClause} ORDER BY reference_count DESC, view_count DESC LIMIT ?`,
    args: [...args, limit]
  });
  
  return result.rows.map((row: any) => ({
    id: row.id,
    docNumber: row.doc_number,
    docTitle: row.doc_title,
    docType: row.doc_type,
    docCategory: row.doc_category,
    projectPhase: row.project_phase,
    processStep: row.process_step,
    docSummary: row.doc_summary,
    docUrl: row.doc_url,
    keywords: row.keywords ? JSON.parse(row.keywords) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    viewCount: row.view_count,
    referenceCount: row.reference_count
  }));
}

/**
 * 获取M0-M12阶段资料
 */
export async function getProjectPhaseDocs(phase: string): Promise<any[]> {
  return searchTechnicalDocs({ query: '', projectPhase: phase, limit: 50 });
}

/**
 * 获取T1-T15工序资料
 */
export async function getProcessStepDocs(step: string): Promise<any[]> {
  return searchTechnicalDocs({ query: '', processStep: step, limit: 50 });
}

// ============================================================================
// 6. AI语音识别服务
// ============================================================================

/**
 * 上传并转写会议录音
 */
export async function transcribeMeetingRecording(params: {
  meetingId: string;
  audioBuffer: Buffer;
  audioFormat: string;
  language?: string;
  createdBy: string;
}): Promise<{
  recordId: string;
  transcriptionText: string;
  segments: any[];
  aiSummary: string;
  aiKeyPoints: string[];
  aiActionItems: string[];
}> {
  const db = await requireDb();
  const recordId = uuidv4();
  
  // 上传录音到S3
  const fileKey = `meeting-recordings/${params.meetingId}/${recordId}.${params.audioFormat}`;
  const { url: recordingUrl } = await storagePut(fileKey, params.audioBuffer, `audio/${params.audioFormat}`);
  
  // 创建录音记录
  await (db as any).execute({
    sql: `INSERT INTO meeting_voice_records (
      id, meeting_id, recording_url, recording_size, recording_format,
      transcription_status, transcription_language, recorded_at, created_by
    ) VALUES (?, ?, ?, ?, ?, 'processing', ?, NOW(), ?)`,
    args: [recordId, params.meetingId, recordingUrl, params.audioBuffer.length, params.audioFormat, params.language || 'zh', params.createdBy]
  });
  
  try {
    // 调用语音转写API
    const transcriptionResult = await transcribeAudio({
      audioUrl: recordingUrl,
      language: params.language || 'zh',
      prompt: '这是一个工业清洗设备方案沟通会议的录音'
    });

    // 检查转写是否成功
    if ('error' in transcriptionResult) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    // 使用LLM分析转写内容
    const analysisResult = await analyzeMeetingTranscription(transcriptionResult.text);

    // 更新转写结果
    await (db as any).execute({
      sql: `UPDATE meeting_voice_records SET
        transcription_status = 'completed',
        transcription_text = ?,
        transcription_segments = ?,
        transcribed_at = NOW(),
        ai_summary = ?,
        ai_key_points = ?,
        ai_action_items = ?
      WHERE id = ?`,
      args: [
        transcriptionResult.text,
        JSON.stringify(transcriptionResult.segments || []),
        analysisResult.summary,
        JSON.stringify(analysisResult.keyPoints),
        JSON.stringify(analysisResult.actionItems),
        recordId
      ]
    });

    return {
      recordId,
      transcriptionText: transcriptionResult.text,
      segments: transcriptionResult.segments || [],
      aiSummary: analysisResult.summary,
      aiKeyPoints: analysisResult.keyPoints,
      aiActionItems: analysisResult.actionItems
    };
  } catch (error) {
    await (db as any).execute({
      sql: `UPDATE meeting_voice_records SET transcription_status = 'failed' WHERE id = ?`,
      args: [recordId]
    });
    throw error;
  }
}

/**
 * 分析会议转写内容
 */
async function analyzeMeetingTranscription(transcriptionText: string): Promise<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}> {
  const prompt = `请分析以下会议转写内容，提取关键信息：

${transcriptionText.substring(0, 8000)}

请提供：
1. 会议摘要（200字以内）
2. 关键讨论点（列表形式）
3. 行动项（包含负责人和截止时间，如果提到的话）`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是一个专业的会议记录分析助手，擅长从会议内容中提取关键信息。' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'meeting_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '会议摘要' },
              keyPoints: { type: 'array', items: { type: 'string' }, description: '关键讨论点' },
              actionItems: { type: 'array', items: { type: 'string' }, description: '行动项' }
            },
            required: ['summary', 'keyPoints', 'actionItems'],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    return {
      summary: '会议分析生成失败',
      keyPoints: [],
      actionItems: []
    };
  }
}

// ============================================================================
// 7. AI资料检索呈现服务
// ============================================================================

/**
 * AI智能资料检索
 */
export async function aiDocRetrieval(params: {
  meetingId: string;
  query: string;
  queryType?: 'keyword' | 'semantic' | 'hybrid';
  filters?: {
    projectPhase?: string;
    processStep?: string;
    docType?: string;
  };
  triggeredBy?: 'manual' | 'voice' | 'auto';
  createdBy: string;
}): Promise<{
  logId: string;
  documents: any[];
  aiPresentation: any;
  aiHighlights: string[];
  aiSuggestions: string[];
}> {
  const db = await requireDb();
  const logId = uuidv4();
  const startTime = Date.now();
  
  // 执行文档检索
  const documents = await searchTechnicalDocs({
    query: params.query,
    projectPhase: params.filters?.projectPhase,
    processStep: params.filters?.processStep,
    docType: params.filters?.docType,
    limit: 20
  });
  
  // 使用LLM生成智能呈现
  const presentationResult = await generateDocPresentation(params.query, documents);
  
  const retrievalTime = Date.now() - startTime;
  
  // 保存检索日志
  await (db as any).execute({
    sql: `INSERT INTO ai_doc_retrieval_logs (
      id, meeting_id, query_text, query_type, query_filters,
      retrieved_docs, total_results, retrieval_time_ms,
      ai_presentation, ai_highlights, ai_suggestions,
      triggered_by, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      logId, params.meetingId, params.query, params.queryType || 'hybrid',
      JSON.stringify(params.filters || {}),
      JSON.stringify(documents.map(d => d.id)), documents.length, retrievalTime,
      JSON.stringify(presentationResult.presentation),
      JSON.stringify(presentationResult.highlights),
      JSON.stringify(presentationResult.suggestions),
      params.triggeredBy || 'manual', params.createdBy
    ]
  });
  
  return {
    logId,
    documents,
    aiPresentation: presentationResult.presentation,
    aiHighlights: presentationResult.highlights,
    aiSuggestions: presentationResult.suggestions
  };
}

/**
 * 生成文档智能呈现
 */
async function generateDocPresentation(query: string, documents: any[]): Promise<{
  presentation: any;
  highlights: string[];
  suggestions: string[];
}> {
  if (documents.length === 0) {
    return {
      presentation: { message: '未找到相关文档' },
      highlights: [],
      suggestions: ['尝试使用不同的关键词搜索', '检查项目阶段或工序筛选条件']
    };
  }
  
  const docList = documents.slice(0, 10).map(d => `- ${d.docTitle} (${d.docType}, ${d.projectPhase || ''} ${d.processStep || ''})`).join('\n');
  
  const prompt = `用户查询：${query}

找到的相关文档：
${docList}

请：
1. 按相关性对文档进行分组和排序
2. 高亮与查询最相关的内容点
3. 建议用户可能还需要查看的其他资料`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是一个技术文档检索助手，帮助用户快速找到需要的技术资料。' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'doc_presentation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              groupedDocs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupName: { type: 'string' },
                    docs: { type: 'array', items: { type: 'string' } },
                    relevance: { type: 'string' }
                  },
                  required: ['groupName', 'docs'],
                  additionalProperties: false
                }
              },
              highlights: { type: 'array', items: { type: 'string' } },
              suggestions: { type: 'array', items: { type: 'string' } }
            },
            required: ['groupedDocs', 'highlights', 'suggestions'],
            additionalProperties: false
          }
        }
      }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      presentation: result.groupedDocs,
      highlights: result.highlights || [],
      suggestions: result.suggestions || []
    };
  } catch (error) {
    return {
      presentation: { documents: documents.map(d => d.docTitle) },
      highlights: [],
      suggestions: []
    };
  }
}

// ============================================================================
// 8. 方案版本管理服务
// ============================================================================

/**
 * 创建方案版本
 */
export async function createSolutionVersion(params: {
  meetingId: string;
  solutionTitle: string;
  solutionSummary?: string;
  solutionContent: unknown;
  equipmentConfig?: unknown;
  processFlow?: Record<string, unknown>[];
  processSteps?: Record<string, unknown>[];
  projectPhases?: Record<string, unknown>[];
  estimatedCost?: number;
  quotedPrice?: number;
  deliveryTime?: number;
  aiGenerated?: boolean;
  aiModel?: string;
  aiPrompt?: string;
  aiConfidence?: number;
  referenceCases?: string[];
  createdBy: string;
}): Promise<{ id: string; versionNumber: number }> {
  const db = await requireDb();
  const id = uuidv4();
  
  // 获取当前最大版本号
  const versionResult = await (db as any).execute({
    sql: `SELECT MAX(version_number) as max_version FROM solution_versions WHERE meeting_id = ?`,
    args: [params.meetingId]
  });
  const maxVersion = (versionResult.rows[0] as any).max_version || 0;
  const versionNumber = maxVersion + 1;
  
  await (db as any).execute({
    sql: `INSERT INTO solution_versions (
      id, meeting_id, version_number, version_status,
      solution_title, solution_summary, solution_content,
      equipment_config, process_flow, process_steps, project_phases,
      estimated_cost, quoted_price, delivery_time,
      ai_generated, ai_model, ai_prompt, ai_confidence,
      reference_cases, created_by
    ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, params.meetingId, versionNumber,
      params.solutionTitle, params.solutionSummary || null, JSON.stringify(params.solutionContent),
      JSON.stringify(params.equipmentConfig || null), JSON.stringify(params.processFlow || []),
      JSON.stringify(params.processSteps || []), JSON.stringify(params.projectPhases || []),
      params.estimatedCost || null, params.quotedPrice || null, params.deliveryTime || null,
      params.aiGenerated || false, params.aiModel || null, params.aiPrompt || null, params.aiConfidence || null,
      JSON.stringify(params.referenceCases || []), params.createdBy
    ]
  });
  
  return { id, versionNumber };
}

/**
 * 获取方案版本列表
 */
export async function getSolutionVersions(meetingId: string): Promise<any[]> {
  const db = await requireDb();
  const result = await (db as any).execute({
    sql: `SELECT * FROM solution_versions WHERE meeting_id = ? ORDER BY version_number DESC`,
    args: [meetingId]
  });
  
  return result.rows.map((row: any) => ({
    id: row.id,
    meetingId: row.meeting_id,
    versionNumber: row.version_number,
    versionName: row.version_name,
    versionStatus: row.version_status,
    solutionTitle: row.solution_title,
    solutionSummary: row.solution_summary,
    solutionContent: row.solution_content ? JSON.parse(row.solution_content) : null,
    equipmentConfig: row.equipment_config ? JSON.parse(row.equipment_config) : null,
    processFlow: row.process_flow ? JSON.parse(row.process_flow) : [],
    processSteps: row.process_steps ? JSON.parse(row.process_steps) : [],
    projectPhases: row.project_phases ? JSON.parse(row.project_phases) : [],
    estimatedCost: row.estimated_cost,
    quotedPrice: row.quoted_price,
    deliveryTime: row.delivery_time,
    aiGenerated: row.ai_generated,
    aiConfidence: row.ai_confidence,
    referenceCases: row.reference_cases ? JSON.parse(row.reference_cases) : [],
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name,
    reviewComments: row.review_comments,
    reviewedAt: row.reviewed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 比较两个方案版本
 */
export async function compareSolutionVersions(versionId1: string, versionId2: string): Promise<{
  version1: any;
  version2: any;
  differences: any[];
}> {
  const db = await requireDb();
  
  const result1 = await (db as any).execute({
    sql: `SELECT * FROM solution_versions WHERE id = ?`,
    args: [versionId1]
  });
  const result2 = await (db as any).execute({
    sql: `SELECT * FROM solution_versions WHERE id = ?`,
    args: [versionId2]
  });
  
  if (result1.rows.length === 0 || result2.rows.length === 0) {
    throw new Error('Version not found');
  }
  
  const v1 = result1.rows[0] as any;
  const v2 = result2.rows[0] as any;
  
  // 比较差异
  const differences: any[] = [];
  
  const fieldsToCompare = [
    'solution_title', 'solution_summary', 'equipment_config',
    'process_flow', 'process_steps', 'project_phases',
    'estimated_cost', 'quoted_price', 'delivery_time'
  ];
  
  for (const field of fieldsToCompare) {
    const val1 = typeof v1[field] === 'string' && (v1[field].startsWith('{') || v1[field].startsWith('['))
      ? JSON.stringify(JSON.parse(v1[field]))
      : v1[field];
    const val2 = typeof v2[field] === 'string' && (v2[field].startsWith('{') || v2[field].startsWith('['))
      ? JSON.stringify(JSON.parse(v2[field]))
      : v2[field];
    
    if (val1 !== val2) {
      differences.push({
        field,
        version1Value: val1,
        version2Value: val2
      });
    }
  }
  
  return {
    version1: v1,
    version2: v2,
    differences
  };
}

/**
 * 审批方案版本
 */
export async function reviewSolutionVersion(params: {
  versionId: string;
  status: 'approved' | 'rejected';
  reviewerId: string;
  reviewerName: string;
  reviewComments?: string;
}): Promise<void> {
  const db = await requireDb();
  
  await (db as any).execute({
    sql: `UPDATE solution_versions SET
      version_status = ?,
      reviewer_id = ?,
      reviewer_name = ?,
      review_comments = ?,
      reviewed_at = NOW()
    WHERE id = ?`,
    args: [params.status, params.reviewerId, params.reviewerName, params.reviewComments || null, params.versionId]
  });
  
  // 如果审批通过，将之前的版本标记为superseded
  if (params.status === 'approved') {
    const versionResult = await (db as any).execute({
      sql: `SELECT meeting_id, version_number FROM solution_versions WHERE id = ?`,
      args: [params.versionId]
    });
    
    if (versionResult.rows.length > 0) {
      const { meeting_id, version_number } = versionResult.rows[0] as any;
      await (db as any).execute({
        sql: `UPDATE solution_versions SET version_status = 'superseded' 
              WHERE meeting_id = ? AND version_number < ? AND version_status = 'approved'`,
        args: [meeting_id, version_number]
      });
    }
  }
}
