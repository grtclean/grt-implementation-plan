/**
 * Production Execution Module - Database Helpers
 * T1-T15工作流程管理、工时采集、阶段审批
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================================
// 类型定义
// ============================================================================

export type StageStatus = 'Pending' | 'In_Progress' | 'Completed' | 'Alert' | 'Blocked';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'AUTO_APPROVED';
export type ApprovalType = 'STAGE_START' | 'STAGE_COMPLETE' | 'GATE_PASS' | 'EXCEPTION';
export type TimeSourceType = 'MANUAL' | 'CLOCK_IN' | 'UWB' | 'BADGE' | 'AUTO_CALC';
export type WorkType = 'REGULAR' | 'OVERTIME' | 'TRAINING' | 'MEETING' | 'OTHER';
export type ResponsibleRole = 'PROJECT_MANAGER' | 'MECHANICAL' | 'ELECTRICAL' | 'ASSEMBLY' | 'QC' | 'SERVICE' | 'ADMIN';

export interface StageDefinition {
  id: number;
  stageCode: string;
  stageName: string;
  stageNameZh: string;
  stageOrder: number;
  defaultDuration: number;
  responsibleRole: ResponsibleRole;
  description: string | null;
  descriptionZh: string | null;
  sopDocument: string | null;
  requiredCertifications: string | null;
  isActive: number;
}

export interface ProductionStage {
  id: number;
  projectId: number;
  stageDefinitionId: number;
  stageCode: string;
  status: StageStatus;
  plannedHours: string;
  actualHours: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  completionPercentage: number;
  notes: string | null;
  aiInsights: string | null;
  contextData: string | null;
}

export interface TimeRecord {
  id: number;
  userId: number;
  userName: string | null;
  projectId: number;
  productionStageId: number | null;
  stageCode: string | null;
  recordDate: string;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  sourceType: TimeSourceType;
  deviceId: string | null;
  locationData: string | null;
  workType: WorkType;
  description: string | null;
  isVerified: number;
  verifiedBy: number | null;
  verifiedAt: string | null;
}

export interface StageApproval {
  id: number;
  productionStageId: number;
  projectId: number;
  stageCode: string;
  approvalRuleId: number | null;
  requestedBy: number;
  requestedByName: string | null;
  requestedAt: string;
  approverId: number | null;
  approverName: string | null;
  approverRole: string | null;
  status: ApprovalStatus;
  approvalType: ApprovalType;
  comments: string | null;
  rejectionReason: string | null;
  attachments: string | null;
  approvedAt: string | null;
  metadata: string | null;
}

export interface IntegrationStatusRecord {
  id: number;
  integrationCode: string;
  integrationName: string;
  integrationType: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';
  lastSyncAt: string | null;
  syncFrequency: number | null;
}

// ============================================================================
// 阶段定义查询
// ============================================================================

export async function getStageDefinitions(): Promise<StageDefinition[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      id, stage_code as stageCode, stage_name as stageName, 
      stage_name_zh as stageNameZh, stage_order as stageOrder,
      default_duration as defaultDuration, responsible_role as responsibleRole,
      description, description_zh as descriptionZh, sop_document as sopDocument,
      required_certifications as requiredCertifications, is_active as isActive
    FROM production_stage_definitions
    WHERE is_active = 1
    ORDER BY stage_order ASC
  `);
  return result.rows as unknown as StageDefinition[];
}

export async function getStageDefinitionByCode(stageCode: string): Promise<StageDefinition | null> {
  const result = await (await requireDb()).execute(sql`
    SELECT
      id, stage_code as stageCode, stage_name as stageName,
      stage_name_zh as stageNameZh, stage_order as stageOrder,
      default_duration as defaultDuration, responsible_role as responsibleRole,
      description, description_zh as descriptionZh, sop_document as sopDocument,
      required_certifications as requiredCertifications, is_active as isActive
    FROM production_stage_definitions
    WHERE stage_code = ${stageCode} AND is_active = 1
  `);
  return (result.rows[0] as unknown as StageDefinition) || null;
}

// ============================================================================
// 项目生产阶段查询
// ============================================================================

export async function getProjectStages(projectId: number): Promise<ProductionStage[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      id, project_id as projectId, stage_definition_id as stageDefinitionId,
      stage_code as stageCode, status, planned_hours as plannedHours,
      actual_hours as actualHours, planned_start_date as plannedStartDate,
      planned_end_date as plannedEndDate, actual_start_date as actualStartDate,
      actual_end_date as actualEndDate, assigned_user_id as assignedUserId,
      assigned_user_name as assignedUserName, completion_percentage as completionPercentage,
      notes, ai_insights as aiInsights, context_data as contextData
    FROM production_stages
    WHERE project_id = ${projectId}
    ORDER BY stage_code ASC
  `);
  return result.rows as unknown as ProductionStage[];
}

export async function getStageById(stageId: number): Promise<ProductionStage | null> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      id, project_id as projectId, stage_definition_id as stageDefinitionId,
      stage_code as stageCode, status, planned_hours as plannedHours,
      actual_hours as actualHours, planned_start_date as plannedStartDate,
      planned_end_date as plannedEndDate, actual_start_date as actualStartDate,
      actual_end_date as actualEndDate, assigned_user_id as assignedUserId,
      assigned_user_name as assignedUserName, completion_percentage as completionPercentage,
      notes, ai_insights as aiInsights, context_data as contextData
    FROM production_stages
    WHERE id = ${stageId}
  `);
  return (result.rows[0] as unknown as ProductionStage) || null;
}

export async function createProjectStages(projectId: number, contextData?: string): Promise<void> {
  // 获取所有阶段定义
  const definitions = await getStageDefinitions();
  
  for (const def of definitions) {
    await (await requireDb()).execute(sql`
      INSERT INTO production_stages (
        project_id, stage_definition_id, stage_code, status,
        planned_hours, actual_hours, completion_percentage, context_data
      ) VALUES (
        ${projectId}, ${def.id}, ${def.stageCode}, 'Pending',
        ${def.defaultDuration}, 0, 0, ${contextData || null}
      )
    `);
  }
}

export async function updateStageStatus(
  stageId: number,
  status: StageStatus,
  userId?: number,
  userName?: string,
  reason?: string
): Promise<void> {
  // 获取当前状态
  const currentStage = await getStageById(stageId);
  if (!currentStage) throw new Error('Stage not found');
  
  // 更新状态
  await (await requireDb()).execute(sql`
    UPDATE production_stages
    SET status = ${status},
        actual_start_date = CASE 
          WHEN ${status} = 'In_Progress' AND actual_start_date IS NULL 
          THEN CURDATE() 
          ELSE actual_start_date 
        END,
        actual_end_date = CASE 
          WHEN ${status} = 'Completed' 
          THEN CURDATE() 
          ELSE actual_end_date 
        END,
        completion_percentage = CASE 
          WHEN ${status} = 'Completed' THEN 100
          WHEN ${status} = 'In_Progress' AND completion_percentage = 0 THEN 10
          ELSE completion_percentage
        END,
        updated_at = NOW()
    WHERE id = ${stageId}
  `);
  
  // 记录状态变更日志
  await (await requireDb()).execute(sql`
    INSERT INTO production_stage_logs (
      production_stage_id, project_id, stage_code,
      previous_status, new_status, changed_by, changed_by_name, change_reason
    ) VALUES (
      ${stageId}, ${currentStage.projectId}, ${currentStage.stageCode},
      ${currentStage.status}, ${status}, ${userId || null}, ${userName || null}, ${reason || null}
    )
  `);
}

export async function updateStageProgress(
  stageId: number,
  completionPercentage: number,
  actualHours?: number,
  notes?: string
): Promise<void> {
  await (await requireDb()).execute(sql`
    UPDATE production_stages
    SET completion_percentage = ${completionPercentage},
        actual_hours = COALESCE(${actualHours}, actual_hours),
        notes = COALESCE(${notes}, notes),
        status = CASE 
          WHEN ${completionPercentage} >= 100 THEN 'Completed'
          WHEN ${completionPercentage} > 0 THEN 'In_Progress'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = ${stageId}
  `);
}

// ============================================================================
// 工时记录查询
// ============================================================================

export async function getTimeRecords(params: {
  projectId?: number;
  userId?: number;
  stageId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<TimeRecord[]> {
  let whereClause = 'WHERE 1=1';
  
  if (params.projectId) whereClause += ` AND project_id = ${params.projectId}`;
  if (params.userId) whereClause += ` AND user_id = ${params.userId}`;
  if (params.stageId) whereClause += ` AND production_stage_id = ${params.stageId}`;
  if (params.startDate) whereClause += ` AND record_date >= '${params.startDate}'`;
  if (params.endDate) whereClause += ` AND record_date <= '${params.endDate}'`;
  
  const result = await (await requireDb()).execute(sql.raw(`
    SELECT 
      id, user_id as userId, user_name as userName, project_id as projectId,
      production_stage_id as productionStageId, stage_code as stageCode,
      record_date as recordDate, start_time as startTime, end_time as endTime,
      duration, source_type as sourceType, device_id as deviceId,
      location_data as locationData, work_type as workType, description,
      is_verified as isVerified, verified_by as verifiedBy, verified_at as verifiedAt
    FROM time_records
    ${whereClause}
    ORDER BY record_date DESC, start_time DESC
  `));
  return result.rows as unknown as TimeRecord[];
}

export async function createTimeRecord(record: {
  userId: number;
  userName?: string;
  projectId: number;
  productionStageId?: number;
  stageCode?: string;
  recordDate: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  sourceType: TimeSourceType;
  deviceId?: string;
  locationData?: string;
  workType?: WorkType;
  description?: string;
}): Promise<number> {
  const result = await (await requireDb()).execute(sql`
    INSERT INTO time_records (
      user_id, user_name, project_id, production_stage_id, stage_code,
      record_date, start_time, end_time, duration, source_type,
      device_id, location_data, work_type, description
    ) VALUES (
      ${record.userId}, ${record.userName || null}, ${record.projectId},
      ${record.productionStageId || null}, ${record.stageCode || null},
      ${record.recordDate}, ${record.startTime || null}, ${record.endTime || null},
      ${record.duration || null}, ${record.sourceType},
      ${record.deviceId || null}, ${record.locationData || null},
      ${record.workType || 'REGULAR'}, ${record.description || null}
    )
  `);
  
  // 更新阶段的实际工时
  if (record.productionStageId && record.duration) {
    await (await requireDb()).execute(sql`
      UPDATE production_stages
      SET actual_hours = actual_hours + ${record.duration},
          updated_at = NOW()
      WHERE id = ${record.productionStageId}
    `);
  }
  
  return (result as any).insertId || 0;
}

export async function getTimeSummaryByProject(projectId: number): Promise<{
  stageCode: string;
  totalHours: number;
  recordCount: number;
}[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      stage_code as stageCode,
      COALESCE(SUM(duration), 0) as totalHours,
      COUNT(*) as recordCount
    FROM time_records
    WHERE project_id = ${projectId}
    GROUP BY stage_code
    ORDER BY stage_code
  `);
  return result.rows as any[];
}

// ============================================================================
// 阶段审批查询
// ============================================================================

export async function getStageApprovals(params: {
  projectId?: number;
  stageId?: number;
  status?: ApprovalStatus;
  approverId?: number;
}): Promise<StageApproval[]> {
  let whereClause = 'WHERE 1=1';
  
  if (params.projectId) whereClause += ` AND project_id = ${params.projectId}`;
  if (params.stageId) whereClause += ` AND production_stage_id = ${params.stageId}`;
  if (params.status) whereClause += ` AND status = '${params.status}'`;
  if (params.approverId) whereClause += ` AND approver_id = ${params.approverId}`;
  
  const result = await (await requireDb()).execute(sql.raw(`
    SELECT 
      id, production_stage_id as productionStageId, project_id as projectId,
      stage_code as stageCode, approval_rule_id as approvalRuleId,
      requested_by as requestedBy, requested_by_name as requestedByName,
      requested_at as requestedAt, approver_id as approverId,
      approver_name as approverName, approver_role as approverRole,
      status, approval_type as approvalType, comments,
      rejection_reason as rejectionReason, attachments,
      approved_at as approvedAt, metadata
    FROM stage_approvals
    ${whereClause}
    ORDER BY requested_at DESC
  `));
  return result.rows as unknown as StageApproval[];
}

export async function createApprovalRequest(request: {
  productionStageId: number;
  projectId: number;
  stageCode: string;
  approvalRuleId?: number;
  requestedBy: number;
  requestedByName?: string;
  approvalType: ApprovalType;
  comments?: string;
}): Promise<number> {
  const result = await (await requireDb()).execute(sql`
    INSERT INTO stage_approvals (
      production_stage_id, project_id, stage_code, approval_rule_id,
      requested_by, requested_by_name, approval_type, comments, status
    ) VALUES (
      ${request.productionStageId}, ${request.projectId}, ${request.stageCode},
      ${request.approvalRuleId || null}, ${request.requestedBy},
      ${request.requestedByName || null}, ${request.approvalType},
      ${request.comments || null}, 'PENDING'
    )
  `);
  return (result as any).insertId || 0;
}

export async function processApproval(
  approvalId: number,
  approverId: number,
  approverName: string,
  approverRole: string,
  status: 'APPROVED' | 'REJECTED',
  comments?: string,
  rejectionReason?: string
): Promise<void> {
  await (await requireDb()).execute(sql`
    UPDATE stage_approvals
    SET approver_id = ${approverId},
        approver_name = ${approverName},
        approver_role = ${approverRole},
        status = ${status},
        comments = COALESCE(${comments}, comments),
        rejection_reason = ${rejectionReason || null},
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = ${approvalId}
  `);
  
  // 如果审批通过，更新阶段状态
  if (status === 'APPROVED') {
    const approval = await (await requireDb()).execute(sql`
      SELECT production_stage_id, approval_type FROM stage_approvals WHERE id = ${approvalId}
    `);
    const approvalData = (approval.rows[0] as any);
    
    if (approvalData) {
      const newStatus = approvalData.approval_type === 'STAGE_COMPLETE' ? 'Completed' : 'In_Progress';
      await updateStageStatus(
        approvalData.production_stage_id,
        newStatus as StageStatus,
        approverId,
        approverName,
        `Approved by ${approverName}`
      );
    }
  }
}

export async function getPendingApprovalsForUser(userId: number, userRole: string): Promise<StageApproval[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      sa.id, sa.production_stage_id as productionStageId, sa.project_id as projectId,
      sa.stage_code as stageCode, sa.approval_rule_id as approvalRuleId,
      sa.requested_by as requestedBy, sa.requested_by_name as requestedByName,
      sa.requested_at as requestedAt, sa.approver_id as approverId,
      sa.approver_name as approverName, sa.approver_role as approverRole,
      sa.status, sa.approval_type as approvalType, sa.comments,
      sa.rejection_reason as rejectionReason, sa.attachments,
      sa.approved_at as approvedAt, sa.metadata
    FROM stage_approvals sa
    LEFT JOIN stage_approval_rules sar ON sa.stage_code = sar.stage_code
    WHERE sa.status = 'PENDING'
      AND (sar.approver_role = ${userRole} OR sa.approver_id = ${userId})
    ORDER BY sa.requested_at ASC
  `);
  return result.rows as unknown as StageApproval[];
}

// ============================================================================
// 集成状态查询
// ============================================================================

export async function getIntegrationStatuses(): Promise<IntegrationStatusRecord[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      id, integration_code as integrationCode, integration_name as integrationName,
      integration_type as integrationType, status, last_sync_at as lastSyncAt,
      sync_frequency as syncFrequency
    FROM integration_status
    WHERE is_active = 1
  `);
  return result.rows as unknown as IntegrationStatusRecord[];
}

export async function updateIntegrationStatus(
  integrationCode: string,
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING',
  errorMessage?: string
): Promise<void> {
  await (await requireDb()).execute(sql`
    UPDATE integration_status
    SET status = ${status},
        last_sync_at = CASE WHEN ${status} = 'CONNECTED' THEN NOW() ELSE last_sync_at END,
        error_message = ${errorMessage || null},
        updated_at = NOW()
    WHERE integration_code = ${integrationCode}
  `);
}

// ============================================================================
// AI知识库查询
// ============================================================================

export async function getAiKnowledgeForStage(stageCode: string): Promise<{
  id: number;
  knowledgeType: string;
  title: string;
  titleZh: string | null;
  content: string;
  contentZh: string | null;
  priority: string;
  relatedFiles: string | null;
}[]> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      id, knowledge_type as knowledgeType, title, title_zh as titleZh,
      content, content_zh as contentZh, priority, related_files as relatedFiles
    FROM production_ai_knowledge
    WHERE stage_code = ${stageCode} AND is_active = 1
    ORDER BY 
      CASE priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
      END
  `);
  return result.rows as any[];
}

// ============================================================================
// 统计查询
// ============================================================================

export async function getProjectStageStats(projectId: number): Promise<{
  totalStages: number;
  completedStages: number;
  inProgressStages: number;
  pendingStages: number;
  alertStages: number;
  blockedStages: number;
  overallProgress: number;
  totalPlannedHours: number;
  totalActualHours: number;
}> {
  const result = await (await requireDb()).execute(sql`
    SELECT 
      COUNT(*) as totalStages,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedStages,
      SUM(CASE WHEN status = 'In_Progress' THEN 1 ELSE 0 END) as inProgressStages,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingStages,
      SUM(CASE WHEN status = 'Alert' THEN 1 ELSE 0 END) as alertStages,
      SUM(CASE WHEN status = 'Blocked' THEN 1 ELSE 0 END) as blockedStages,
      AVG(completion_percentage) as overallProgress,
      SUM(planned_hours) as totalPlannedHours,
      SUM(actual_hours) as totalActualHours
    FROM production_stages
    WHERE project_id = ${projectId}
  `);
  
  const row = result.rows[0] as any;
  return {
    totalStages: Number(row.totalStages) || 0,
    completedStages: Number(row.completedStages) || 0,
    inProgressStages: Number(row.inProgressStages) || 0,
    pendingStages: Number(row.pendingStages) || 0,
    alertStages: Number(row.alertStages) || 0,
    blockedStages: Number(row.blockedStages) || 0,
    overallProgress: Math.round(Number(row.overallProgress) || 0),
    totalPlannedHours: Number(row.totalPlannedHours) || 0,
    totalActualHours: Number(row.totalActualHours) || 0,
  };
}
