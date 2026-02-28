import { pgTable, AnyPgColumn, index, integer, varchar, text, pgEnum, decimal, timestamp, json, date, bigint, smallint, primaryKey, unique, real, boolean, time, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


// PostgreSQL Enum Definitions
export const categoryEnum = pgEnum('categoryEnum', ['business', 'role', 'planning', 'system']);
export const interactionTypeEnum = pgEnum('interactionTypeEnum', ['task', 'question', 'feedback', 'learning', 'coaching', 'chat']);
export const statusEnum = pgEnum('statusEnum', ['success', 'error', 'timeout', 'rate_limited']);
export const roleEnum = pgEnum('roleEnum', ['user', 'assistant', 'system']);
export const statusEnum1 = pgEnum('statusEnum1', ['active', 'archived', 'deleted']);
export const assistantTypeEnum = pgEnum('assistantTypeEnum', ['solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase', 'general']);
export const formatEnum = pgEnum('formatEnum', ['pdf', 'markdown', 'docx']);
export const statusEnum2 = pgEnum('statusEnum2', ['pending', 'completed', 'failed']);
export const contentTypeEnum = pgEnum('contentTypeEnum', ['text', 'table', 'code', 'file']);
export const feedbackEnum = pgEnum('feedbackEnum', ['positive', 'negative']);
export const assistantTypeEnum1 = pgEnum('assistantTypeEnum1', ['solution', 'quotation', 'planning', 'kpi', 'personal']);
export const executionModeEnum = pgEnum('executionModeEnum', ['internal', 'generative']);
export const speakerEnum = pgEnum('speakerEnum', ['candidate', 'interviewer', 'unknown']);
export const emotionDetectedEnum = pgEnum('emotionDetectedEnum', ['positive', 'neutral', 'negative', 'nervous', 'confident']);
export const typeEnum = pgEnum('typeEnum', ['document', 'faq', 'case', 'template', 'policy']);
export const learningSourceEnum = pgEnum('learningSourceEnum', ['interaction', 'task', 'feedback', 'document', 'meeting']);
export const suggestionTypeEnum = pgEnum('suggestionTypeEnum', ['field_update', 'process_link', 'content_match']);
export const statusEnum3 = pgEnum('statusEnum3', ['pending', 'accepted', 'rejected', 'modified']);
export const suggestionModeEnum = pgEnum('suggestionModeEnum', ['full_process', 'current_step', 'single_action']);
export const priorityEnum = pgEnum('priorityEnum', ['high', 'medium', 'low']);
export const statusEnum4 = pgEnum('statusEnum4', ['pending', 'running', 'completed', 'failed']);
export const statusEnum5 = pgEnum('statusEnum5', ['draft', 'active', 'archived']);
export const categoryEnum1 = pgEnum('categoryEnum1', ['culture', 'training', 'meeting', 'event', 'other']);
export const frequencyEnum = pgEnum('frequencyEnum', ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export const statusEnum6 = pgEnum('statusEnum6', ['pending', 'in_progress', 'completed', 'cancelled']);
export const updateTypeEnum = pgEnum('updateTypeEnum', ['create', 'copy', 'update', 'archive', 'ai_update']);
export const typeEnum1 = pgEnum('typeEnum1', ['company', 'department', 'project']);
export const statusEnum7 = pgEnum('statusEnum7', ['draft', 'submitted', 'approved', 'in_progress', 'completed']);
export const assemblyTypeEnum = pgEnum('assemblyTypeEnum', ['mechanical', 'electrical', 'pneumatic', 'hydraulic']);
export const statusEnum8 = pgEnum('statusEnum8', ['pending', 'in_progress', 'completed', 'rework']);
export const pathTypeEnum = pgEnum('pathTypeEnum', ['vertical', 'horizontal', 'cross_functional']);
export const statusEnum9 = pgEnum('statusEnum9', ['planning', 'in_progress', 'achieved', 'paused']);
export const alertLevelEnum = pgEnum('alertLevelEnum', ['warning', 'critical', 'emergency']);
export const statusEnum10 = pgEnum('statusEnum10', ['pending', 'acknowledged', 'resolved', 'ignored']);
export const templateTypeEnum = pgEnum('templateTypeEnum', ['builtin', 'custom']);
export const categoryEnum2 = pgEnum('categoryEnum2', ['budget', 'performance', 'cost', 'risk']);
export const scopeEnum = pgEnum('scopeEnum', ['all', 'project', 'category']);
export const alertTypeEnum = pgEnum('alertTypeEnum', ['budget_percent', 'absolute_amount', 'cpi']);
export const notifyTypeEnum = pgEnum('notifyTypeEnum', ['email', 'system', 'both']);
export const typeEnum2 = pgEnum('typeEnum2', ['direct', 'indirect', 'overhead']);
export const estimateTypeEnum = pgEnum('estimateTypeEnum', ['rough', 'detailed', 'final']);
export const rateTypeEnum = pgEnum('rateTypeEnum', ['labor_design', 'labor_manufacture', 'labor_install', 'transport', 'insurance', 'warranty']);
export const statusEnum11 = pgEnum('statusEnum11', ['pending', 'approved', 'rejected', 'paid']);
export const periodTypeEnum = pgEnum('periodTypeEnum', ['monthly', 'quarterly', 'yearly', 'phase']);
export const genderEnum = pgEnum('genderEnum', ['male', 'female', 'unknown']);
export const isKeyPersonEnum = pgEnum('isKeyPersonEnum', ['yes', 'no']);
export const decisionRoleEnum = pgEnum('decisionRoleEnum', ['decision_maker', 'influencer', 'user', 'gatekeeper']);
export const statusEnum12 = pgEnum('statusEnum12', ['active', 'inactive']);
export const typeEnum3 = pgEnum('typeEnum3', ['prospect', 'customer', 'partner']);
export const scaleEnum = pgEnum('scaleEnum', ['small', 'medium', 'large', 'enterprise']);
export const levelEnum = pgEnum('levelEnum', ['A', 'B', 'C', 'D']);
export const statusEnum13 = pgEnum('statusEnum13', ['active', 'inactive', 'blacklist']);
export const relatedTypeEnum = pgEnum('relatedTypeEnum', ['customer', 'opportunity']);
export const methodEnum = pgEnum('methodEnum', ['phone', 'visit', 'email', 'meeting', 'wechat']);
export const typeEnum4 = pgEnum('typeEnum4', ['new_business', 'expansion', 'renewal']);
export const stageEnum = pgEnum('stageEnum', ['lead', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);
export const statusEnum14 = pgEnum('statusEnum14', ['active', 'inactive', 'error']);
export const accountTypeEnum = pgEnum('accountTypeEnum', ['standard', 'premium', 'enterprise']);
export const statusEnum15 = pgEnum('statusEnum15', ['active', 'suspended', 'inactive']);
export const dataScopeEnum = pgEnum('dataScopeEnum', ['self', 'department', 'sub_departments', 'all']);
export const typeEnum5 = pgEnum('typeEnum5', ['feature', 'bugfix', 'refactor', 'docs', 'test']);
export const priorityEnum1 = pgEnum('priorityEnum1', ['critical', 'high', 'medium', 'low']);
export const statusEnum16 = pgEnum('statusEnum16', ['backlog', 'todo', 'in_progress', 'review', 'done']);
export const severityEnum = pgEnum('severityEnum', ['critical', 'major', 'minor', 'trivial']);
export const statusEnum17 = pgEnum('statusEnum17', ['open', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix', 'deferred']);
export const reportedByEnum = pgEnum('reportedByEnum', ['manus', 'claude_code', 'human', 'test']);
export const fixedByEnum = pgEnum('fixedByEnum', ['manus', 'claude_code', 'human']);
export const executionTypeEnum = pgEnum('executionTypeEnum', ['task_assign', 'code_implement', 'compile_check', 'test_run', 'code_review', 'function_verify', 'bug_fix', 'bug_verify', 'task_complete', 'task_block']);
export const statusEnum18 = pgEnum('statusEnum18', ['success', 'failed', 'partial', 'skipped']);
export const taskTypeEnum = pgEnum('taskTypeEnum', ['feature', 'bugfix', 'refactor', 'test', 'docs', 'infrastructure']);
export const priorityEnum2 = pgEnum('priorityEnum2', ['P0', 'P1', 'P2', 'P3']);
export const statusEnum19 = pgEnum('statusEnum19', ['pending', 'in_progress', 'in_review', 'testing', 'completed', 'blocked', 'cancelled']);
export const statusEnum20 = pgEnum('statusEnum20', ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']);
export const assistantTypeEnum2 = pgEnum('assistantTypeEnum2', ['general', 'sales', 'tech', 'pm', 'hr', 'finance', 'production', 'engineering']);
export const statusEnum21 = pgEnum('statusEnum21', ['active', 'paused', 'archived']);
export const statusEnum22 = pgEnum('statusEnum22', ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']);
export const priorityEnum3 = pgEnum('priorityEnum3', ['urgent', 'high', 'medium', 'low']);
export const priceTypeEnum = pgEnum('priceTypeEnum', ['standard', 'minimum', 'maximum']);
export const statusEnum23 = pgEnum('statusEnum23', ['active', 'deprecated', 'obsolete']);
export const changeTypeEnum = pgEnum('changeTypeEnum', ['manual', 'version_upgrade', 'correction']);
export const typeEnum6 = pgEnum('typeEnum6', ['suggestion', 'bug', 'other']);
export const statusEnum24 = pgEnum('statusEnum24', ['pending', 'reviewed', 'resolved']);
export const assistantTypeEnum3 = pgEnum('assistantTypeEnum3', ['solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase', 'engineering', 'quality']);
export const memberTypeEnum = pgEnum('memberTypeEnum', ['user', 'role', 'department']);
export const notificationTypeEnum = pgEnum('notificationTypeEnum', ['meeting', 'training', 'announcement', 'reminder', 'alert', 'custom']);
export const priorityEnum4 = pgEnum('priorityEnum4', ['low', 'normal', 'high', 'urgent']);
export const channelEnum = pgEnum('channelEnum', ['email', 'system', 'sms', 'wechat']);
export const statusEnum25 = pgEnum('statusEnum25', ['pending', 'sending', 'completed', 'failed']);
export const permissionEnum = pgEnum('permissionEnum', ['none', 'read', 'write', 'admin']);
export const scopeEnum1 = pgEnum('scopeEnum1', ['all', 'own_dept', 'own_team', 'self']);
export const customerTypeEnum = pgEnum('customerTypeEnum', ['oem', 'tier1', 'tier2', 'other']);
export const bidResultEnum = pgEnum('bidResultEnum', ['won', 'lost', 'pending', 'cancelled']);
export const sourceTypeEnum = pgEnum('sourceTypeEnum', ['grt_internal', 'competitor', 'industry_standard']);
export const workpieceCategoryEnum = pgEnum('workpieceCategoryEnum', ['shell', 'shaft', 'gear', 'valve', 'cylinder', 'precision', 'other']);
export const interviewTypeEnum = pgEnum('interviewTypeEnum', ['phone', 'video', 'onsite']);
export const recommendationEnum = pgEnum('recommendationEnum', ['hire', 'pending', 'reject']);
export const genderEnum1 = pgEnum('genderEnum1', ['male', 'female']);
export const statusEnum26 = pgEnum('statusEnum26', ['new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn']);
export const currentStageEnum = pgEnum('currentStageEnum', ['initial', 'assistant', 'collaboration', 'leading', 'replacement']);
export const subjectTypeEnum = pgEnum('subjectTypeEnum', ['employee', 'candidate', 'position']);
export const statusEnum27 = pgEnum('statusEnum27', ['probation', 'regular', 'resigned', 'terminated']);
export const reviewTypeEnum = pgEnum('reviewTypeEnum', ['3M', '6M', 'YEAR']);
export const statusEnum28 = pgEnum('statusEnum28', ['pending', 'sent', 'completed', 'cancelled']);
export const planTypeEnum = pgEnum('planTypeEnum', ['onboarding', 'ongoing', 'special']);
export const testTypeEnum = pgEnum('testTypeEnum', ['basic', 'skill', 'project']);
export const assessmentTypeEnum = pgEnum('assessmentTypeEnum', ['self', 'supervisor', 'peer', 'ai']);
export const communicationTypeEnum = pgEnum('communicationTypeEnum', ['coaching', 'review', 'recognition', 'warning', 'improvement']);
export const approvalStatusEnum = pgEnum('approvalStatusEnum', ['pending', 'approved', 'rejected', 'auto']);
export const kpiCategoryEnum = pgEnum('kpiCategoryEnum', ['task', 'quality', 'efficiency', 'collaboration', 'innovation']);
export const emailTypeEnum = pgEnum('emailTypeEnum', ['daily_reminder', 'weekly_summary', 'performance_alert', 'improvement_suggestion', 'recognition', 'task_reminder']);
export const recipientTypeEnum = pgEnum('recipientTypeEnum', ['employee', 'supervisor', 'team', 'hr']);
export const approvalStatusEnum1 = pgEnum('approvalStatusEnum1', ['not_required', 'pending', 'approved', 'rejected']);
export const deliveryStatusEnum = pgEnum('deliveryStatusEnum', ['pending', 'sent', 'delivered', 'failed']);
export const periodTypeEnum1 = pgEnum('periodTypeEnum1', ['current_day', 'daily', 'weekly', 'monthly', 'quarterly', 'annual']);
export const scoreLevelEnum = pgEnum('scoreLevelEnum', ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory']);
export const statusEnum29 = pgEnum('statusEnum29', ['pending', 'approved', 'rejected']);
export const roleEnum1 = pgEnum('roleEnum1', ['organizer', 'required', 'optional', 'presenter']);
export const responseStatusEnum = pgEnum('responseStatusEnum', ['pending', 'accepted', 'declined', 'tentative']);
export const attendanceStatusEnum = pgEnum('attendanceStatusEnum', ['unknown', 'attended', 'absent', 'late']);
export const levelEnum1 = pgEnum('levelEnum1', ['company', 'department', 'project', 'team', 'personal']);
export const statusEnum30 = pgEnum('statusEnum30', ['scheduled', 'in_progress', 'completed', 'cancelled']);
export const frequencyEnum1 = pgEnum('frequencyEnum1', ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'adhoc']);
export const statusEnum31 = pgEnum('statusEnum31', ['pending', 'in_progress', 'completed', 'failed', 'paused']);
export const phaseEnum = pgEnum('phaseEnum', ['development', 'testing', 'recording', 'release']);
export const statusEnum32 = pgEnum('statusEnum32', ['in_progress', 'completed', 'failed']);
export const requestTypeEnum = pgEnum('requestTypeEnum', ['add', 'modify', 'delete', 'correct']);
export const ruleTypeEnum = pgEnum('ruleTypeEnum', ['equipment', 'project', 'material']);
export const statusEnum33 = pgEnum('statusEnum33', ['pending', 'approved', 'rejected', 'implementing', 'testing', 'completed', 'cancelled']);
export const testResultEnum = pgEnum('testResultEnum', ['pass', 'fail', 'partial']);
export const ruleTypeEnum1 = pgEnum('ruleTypeEnum1', ['equipment', 'project', 'material', 'all']);
export const changeTypeEnum1 = pgEnum('changeTypeEnum1', ['add', 'modify', 'delete', 'correct', 'all']);
export const changeTypeEnum2 = pgEnum('changeTypeEnum2', ['major', 'minor', 'patch']);
export const entryTypeEnum = pgEnum('entryTypeEnum', ['text', 'file', 'image', 'voice']);
export const statusEnum34 = pgEnum('statusEnum34', ['pending', 'sent', 'delivered', 'failed', 'read']);
export const sendStatusEnum = pgEnum('sendStatusEnum', ['pending', 'sent', 'failed', 'bounced']);
export const changeTypeEnum3 = pgEnum('changeTypeEnum3', ['role_assignment', 'permission_update', 'department_change']);
export const typeEnum7 = pgEnum('typeEnum7', ['department', 'project', 'cross_dept', 'training', 'announcement', 'meeting', 'custom']);
export const sourceTypeEnum1 = pgEnum('sourceTypeEnum1', ['annual_plan', 'quarterly_plan', 'monthly_plan', 'customer_feedback', 'project_opl', 'project_status', 'meeting_minutes', 'supervisor_task', 'kpi_status', 'incomplete_plan', 'execution_note']);
export const planTypeEnum1 = pgEnum('planTypeEnum1', ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'training', 'visit', 'phase']);
export const statusEnum35 = pgEnum('statusEnum35', ['draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled']);
export const taskTypeEnum1 = pgEnum('taskTypeEnum1', ['work', 'training', 'visit', 'meeting', 'review', 'other']);
export const sourceTypeEnum2 = pgEnum('sourceTypeEnum2', ['annual_plan', 'quarterly_plan', 'monthly_plan', 'customer_feedback', 'opl', 'meeting', 'supervisor', 'kpi_gap', 'manual']);
export const statusEnum36 = pgEnum('statusEnum36', ['pending', 'in_progress', 'completed', 'cancelled', 'blocked']);
export const trackingSourceEnum = pgEnum('trackingSourceEnum', ['meeting', 'sop', 'training', 'email', 'report', 'customer', 'manual']);
export const statusEnum37 = pgEnum('statusEnum37', ['active', 'archived']);
export const accessLevelEnum = pgEnum('accessLevelEnum', ['view', 'interact', 'full']);
export const statusEnum38 = pgEnum('statusEnum38', ['draft', 'pending', 'approved', 'rejected']);
export const projectTypeEnum = pgEnum('projectTypeEnum', ['standard', 'custom', 'service']);
export const syncStatusEnum = pgEnum('syncStatusEnum', ['synced', 'pending', 'error']);
export const typeEnum8 = pgEnum('typeEnum8', ['contract', 'design', 'report', 'manual', 'other']);
export const statusEnum39 = pgEnum('statusEnum39', ['draft', 'published', 'archived']);
export const statusEnum40 = pgEnum('statusEnum40', ['pending', 'in_review', 'approved', 'rejected', 'waived']);
export const knowledgeTypeEnum = pgEnum('knowledgeTypeEnum', ['lesson_learned', 'best_practice', 'risk_pattern', 'solution']);
export const typeEnum9 = pgEnum('typeEnum9', ['deliverable', 'review', 'approval', 'other']);
export const statusEnum41 = pgEnum('statusEnum41', ['pending', 'completed', 'delayed', 'cancelled']);
export const suggestionTypeEnum1 = pgEnum('suggestionTypeEnum1', ['schedule', 'cost', 'resource', 'quality', 'process']);
export const implementationEffortEnum = pgEnum('implementationEffortEnum', ['easy', 'medium', 'hard']);
export const statusEnum42 = pgEnum('statusEnum42', ['pending', 'accepted', 'rejected', 'implemented']);
export const predictionTypeEnum = pgEnum('predictionTypeEnum', ['completion_date', 'cost', 'quality', 'risk']);
export const riskCategoryEnum = pgEnum('riskCategoryEnum', ['schedule', 'cost', 'quality', 'resource', 'scope']);
export const statusEnum43 = pgEnum('statusEnum43', ['active', 'acknowledged', 'resolved', 'expired']);
export const snapshotTypeEnum = pgEnum('snapshotTypeEnum', ['daily', 'weekly', 'milestone', 'manual']);
export const typeEnum10 = pgEnum('typeEnum10', ['task', 'issue', 'risk', 'change']);
export const statusEnum44 = pgEnum('statusEnum44', ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']);
export const roleEnum2 = pgEnum('roleEnum2', ['manager', 'lead', 'member', 'stakeholder']);
export const typeEnum11 = pgEnum('typeEnum11', ['standard', 'key', 'strategic']);
export const statusEnum45 = pgEnum('statusEnum45', ['draft', 'active', 'on_hold', 'completed', 'cancelled']);
export const riskLevelEnum = pgEnum('riskLevelEnum', ['low', 'medium', 'high', 'critical']);
export const healthStatusEnum = pgEnum('healthStatusEnum', ['green', 'yellow', 'red']);
export const learningTypeEnum = pgEnum('learningTypeEnum', ['bid_won', 'bid_lost', 'price_negotiation', 'market_change', 'competitor_intel']);
export const calculationTypeEnum = pgEnum('calculationTypeEnum', ['offer', 'adjustment', 'promotion', 'simulation']);
export const marketComparisonEnum = pgEnum('marketComparisonEnum', ['below', 'at', 'above']);
export const taskTypeEnum2 = pgEnum('taskTypeEnum2', ['performance_review_reminder', 'training_reminder', 'meeting_reminder', 'custom']);
export const lastRunStatusEnum = pgEnum('lastRunStatusEnum', ['success', 'failed', 'skipped']);
export const accessResultEnum = pgEnum('accessResultEnum', ['allowed', 'denied', 'partial']);
export const deviceTypeEnum = pgEnum('deviceTypeEnum', ['humanoid_robot', 'agv', 'inspection_system', 'cnc_machine', 'assembly_robot', 'vision_system', 'sensor_array']);
export const protocolEnum = pgEnum('protocolEnum', ['rest', 'grpc', 'mqtt', 'opc_ua', 'modbus']);
export const statusEnum46 = pgEnum('statusEnum46', ['online', 'offline', 'error', 'maintenance']);
export const learningTypeEnum1 = pgEnum('learningTypeEnum1', ['project_delivery', 'customer_feedback', 'performance_data', 'maintenance_record', 'optimization']);
export const statusEnum47 = pgEnum('statusEnum47', ['pending', 'approved', 'rejected', 'expired']);
export const channelEnum1 = pgEnum('channelEnum1', ['screen_popup', 'system_message', 'email', 'wechat', 'sms']);
export const statusEnum48 = pgEnum('statusEnum48', ['pending', 'scheduled', 'sent', 'delivered', 'confirmed', 'failed']);
export const recordingStatusEnum = pgEnum('recordingStatusEnum', ['not_started', 'recording', 'completed', 'failed']);
export const assessmentTypeEnum1 = pgEnum('assessmentTypeEnum1', ['quiz', 'survey', 'practical']);
export const statusEnum49 = pgEnum('statusEnum49', ['active', 'expired', 'revoked']);
export const registrationStatusEnum = pgEnum('registrationStatusEnum', ['registered', 'confirmed', 'cancelled']);
export const attendanceStatusEnum1 = pgEnum('attendanceStatusEnum1', ['unknown', 'attended', 'absent', 'partial']);
export const typeEnum12 = pgEnum('typeEnum12', ['internal', 'external', 'online', 'certification']);
export const categoryEnum3 = pgEnum('categoryEnum3', ['technical', 'management', 'safety', 'quality', 'compliance']);
export const statusEnum50 = pgEnum('statusEnum50', ['draft', 'planned', 'in_progress', 'completed', 'cancelled']);
export const roleEnum3 = pgEnum('roleEnum3', ['user', 'admin']);
export const languagePreferenceEnum = pgEnum('languagePreferenceEnum', ['zh', 'en', 'de', 'fr']);
export const typeEnum13 = pgEnum('typeEnum13', ['wecom', 'dingtalk', 'feishu', 'custom']);
export const retryStatusEnum = pgEnum('retryStatusEnum', ['pending', 'retrying', 'success', 'failed', 'exhausted']);
export const taskTypeEnum3 = pgEnum('taskTypeEnum3', ['installation', 'maintenance', 'repair', 'inspection', 'training', 'consultation']);
export const priorityEnum5 = pgEnum('priorityEnum5', ['low', 'medium', 'high', 'urgent']);
export const statusEnum51 = pgEnum('statusEnum51', ['draft', 'assigned', 'in_progress', 'pending_review', 'completed', 'cancelled']);
export const customerConfirmationStatusEnum = pgEnum('customerConfirmationStatusEnum', ['pending', 'confirmed', 'rejected']);
export const statusEnum52 = pgEnum('statusEnum52', ['planned', 'in_progress', 'completed', 'cancelled']);
export const transportationTypeEnum = pgEnum('transportationTypeEnum', ['flight', 'train', 'car', 'bus', 'other']);
export const contentTypeEnum1 = pgEnum('contentTypeEnum1', ['article', 'faq', 'manual', 'video', 'document', 'case_study']);
export const accessLevelEnum1 = pgEnum('accessLevelEnum1', ['public', 'certified', 'confidential']);
export const reviewStatusEnum = pgEnum('reviewStatusEnum', ['draft', 'pending_review', 'approved', 'rejected']);
export const claimTypeEnum = pgEnum('claimTypeEnum', ['travel', 'meal', 'transportation', 'accommodation', 'equipment', 'project', 'daily', 'other']);
export const statusEnum53 = pgEnum('statusEnum53', ['draft', 'submitted', 'ai_reviewing', 'pending_review', 'manager_approved', 'finance_reviewing', 'approved', 'payment_processing', 'rejected', 'paid', 'cancelled']);
export const statusEnum54 = pgEnum('statusEnum54', ['draft', 'pending_confirmation', 'confirmed', 'processing', 'completed', 'cancelled']);
export const auditTypeEnum = pgEnum('auditTypeEnum', ['expense', 'report', 'order', 'travel', 'timesheet']);
export const recommendationEnum1 = pgEnum('recommendationEnum1', ['auto_approve', 'manual_review', 'reject']);
export const reportTypeEnum = pgEnum('reportTypeEnum', ['installation', 'maintenance', 'repair', 'inspection', 'training']);
export const statusEnum55 = pgEnum('statusEnum55', ['draft', 'submitted', 'supervisor_review', 'supervisor_approved', 'customer_pending', 'customer_confirmed', 'invoice_issued', 'completed']);
export const locationTypeEnum = pgEnum('locationTypeEnum', ['clock_in', 'clock_out', 'check_point', 'real_time']);
export const authStatusEnum = pgEnum('authStatusEnum', ['unverified', 'pending', 'verified']);
export const authStatusEnum1 = pgEnum('authStatusEnum1', ['unverified', 'pending', 'verified', 'suspended']);
export const authLevelEnum = pgEnum('authLevelEnum', ['customer', 'employee', 'supervisor', 'admin']);
export const certificateLevelEnum = pgEnum('certificateLevelEnum', ['basic', 'intermediate', 'advanced', 'expert']);
export const verificationStatusEnum = pgEnum('verificationStatusEnum', ['pending', 'verified', 'expired', 'revoked']);
export const auditTypeEnum1 = pgEnum('auditTypeEnum1', ['expense', 'quotation', 'disbursement']);
export const recommendationEnum2 = pgEnum('recommendationEnum2', ['auto_approve', 'manual_review', 'reject', 'escalate']);
export const predictionTypeEnum1 = pgEnum('predictionTypeEnum1', ['demand', 'reorder', 'value_added_order']);
export const dataCategoryEnum = pgEnum('dataCategoryEnum', ['algorithm', 'formula', 'price', 'customer', 'equipment', 'employee']);
export const sensitivityLevelEnum = pgEnum('sensitivityLevelEnum', ['L0_public', 'L1_internal', 'L2_sensitive', 'L3_confidential', 'L4_top_secret']);
export const deploymentRequirementEnum = pgEnum('deploymentRequirementEnum', ['any', 'private_cloud', 'on_premise', 'air_gapped']);
export const participantRoleEnum = pgEnum('participantRoleEnum', ['engineer', 'supervisor', 'customer', 'ai_system']);
export const confirmationStatusEnum = pgEnum('confirmationStatusEnum', ['pending', 'confirmed', 'rejected', 'revision_requested']);
export const tierChangeRecommendationEnum = pgEnum('tierChangeRecommendationEnum', ['upgrade', 'maintain', 'downgrade']);
export const requestTypeEnum1 = pgEnum('requestTypeEnum1', ['vda_19_1_compliance', 'process_parameter', 'capability_proof', 'quality_standard', 'cost_range', 'delivery_capacity']);
export const requesterTypeEnum = pgEnum('requesterTypeEnum', ['customer_ai', 'internal_ai', 'human_user', 'external_system']);
export const targetEntityTypeEnum = pgEnum('targetEntityTypeEnum', ['project', 'product', 'process', 'equipment', 'capability']);
export const statusEnum56 = pgEnum('statusEnum56', ['pending', 'processing', 'verified', 'rejected', 'expired', 'error']);
export const parameterCategoryEnum = pgEnum('parameterCategoryEnum', ['temperature', 'pressure', 'flow_rate', 'concentration', 'time', 'speed', 'cleanliness']);
export const complianceRangeTypeEnum = pgEnum('complianceRangeTypeEnum', ['within_standard', 'above_minimum', 'below_maximum', 'exact_match']);
export const actionEnum = pgEnum('actionEnum', ['request_created', 'verification_started', 'proof_generated', 'verification_completed', 'verification_failed', 'result_accessed', 'proof_validated']);
export const actorTypeEnum = pgEnum('actorTypeEnum', ['system', 'ai_agent', 'human_user', 'external_api']);
export const capabilityCategoryEnum = pgEnum('capabilityCategoryEnum', ['production_capacity', 'quality_level', 'delivery_speed', 'technical_expertise', 'certification', 'equipment_capability']);
export const categoryEnum4 = pgEnum('categoryEnum4', ['cleaning_technology', 'quality_assurance', 'industry_solutions', 'case_studies', 'certifications']);
export const statusEnum57 = pgEnum('statusEnum57', ['draft', 'review', 'published', 'archived']);
export const roleTypeEnum = pgEnum('roleTypeEnum', ['office', 'field', 'hybrid']);
export const jurisdictionEnum = pgEnum('jurisdictionEnum', ['DE', 'US', 'CN', 'OTHER']);
export const contractTypeEnum = pgEnum('contractTypeEnum', ['full_time', 'part_time', 'contractor']);
export const exemptionTypeEnum = pgEnum('exemptionTypeEnum', ['executive', 'administrative', 'professional', 'outside_sales', 'computer', 'none']);
export const activityCategoryEnum = pgEnum('activityCategoryEnum', ['work', 'travel_paid', 'travel_unpaid', 'break', 'training', 'meeting', 'admin']);
export const complianceFlagEnum = pgEnum('complianceFlagEnum', ['OK', 'VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'VIOLATION_WEEKLY_LIMIT', 'EXEMPTION_REVIEW', 'PENDING_APPROVAL']);
export const supervisorApprovalEnum = pgEnum('supervisorApprovalEnum', ['pending', 'approved', 'rejected', 'auto_approved']);
export const alertTypeEnum1 = pgEnum('alertTypeEnum1', ['DAILY_10H_LIMIT', 'WEEKLY_48H_LIMIT', 'REST_PERIOD_11H', 'FLSA_EXEMPTION_REVIEW', 'OVERTIME_THRESHOLD', 'BREAK_VIOLATION']);
export const severityEnum1 = pgEnum('severityEnum1', ['info', 'warning', 'critical']);
export const statusEnum58 = pgEnum('statusEnum58', ['open', 'acknowledged', 'resolved', 'escalated']);
export const exemptionStatusEnum = pgEnum('exemptionStatusEnum', ['exempt', 'non_exempt', 'review_required']);
export const overallComplianceStatusEnum = pgEnum('overallComplianceStatusEnum', ['compliant', 'warning', 'violation']);
export const reportTypeEnum1 = pgEnum('reportTypeEnum1', ['daily', 'weekly', 'monthly', 'custom']);
export const formatEnum1 = pgEnum('formatEnum1', ['pdf', 'excel', 'csv']);
export const jurisdictionEnum1 = pgEnum('jurisdictionEnum1', ['DE', 'US', 'CN', 'OTHER', 'ALL']);
export const statusEnum59 = pgEnum('statusEnum59', ['generating', 'completed', 'failed']);
export const ruleTypeEnum2 = pgEnum('ruleTypeEnum2', ['daily_limit', 'weekly_limit', 'rest_period', 'overtime_limit', 'exemption_check']);
export const thresholdUnitEnum = pgEnum('thresholdUnitEnum', ['hours', 'minutes', 'days', 'percentage']);
export const alertTypeEnum2 = pgEnum('alertTypeEnum2', ['VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'EXEMPTION_AT_RISK', 'OVERTIME_WARNING', 'WEEKLY_SUMMARY']);
export const severityEnum2 = pgEnum('severityEnum2', ['critical', 'warning', 'info']);
export const platformEnum = pgEnum('platformEnum', ['wechat', 'wecom', 'dingtalk', 'other']);
export const roleEnum4 = pgEnum('roleEnum4', ['guest', 'employee', 'tech_lead', 'sales_manager', 'admin']);
export const statusEnum60 = pgEnum('statusEnum60', ['pending', 'active', 'muted', 'banned']);
export const verificationStatusEnum1 = pgEnum('verificationStatusEnum1', ['unverified', 'verified', 'rejected']);
export const activityLevelEnum = pgEnum('activityLevelEnum', ['inactive', 'low', 'medium', 'high']);
export const messageTypeEnum = pgEnum('messageTypeEnum', ['question', 'reply', 'announcement', 'knowledge_push']);
export const directionEnum = pgEnum('directionEnum', ['inbound', 'outbound']);
export const contentTypeEnum2 = pgEnum('contentTypeEnum2', ['text', 'image', 'file', 'voice', 'link']);
export const publishStatusEnum = pgEnum('publishStatusEnum', ['draft', 'queued', 'published', 'failed']);
export const contentTypeEnum3 = pgEnum('contentTypeEnum3', ['article', 'case_study', 'tip', 'faq', 'announcement', 'tutorial']);
export const sourceTypeEnum3 = pgEnum('sourceTypeEnum3', ['knowledge_base', 'solution_assistant', 'manual', 'external']);
export const desensitizationStatusEnum = pgEnum('desensitizationStatusEnum', ['pending', 'passed', 'failed']);
export const scheduleTypeEnum = pgEnum('scheduleTypeEnum', ['immediate', 'scheduled', 'recurring']);
export const pushStatusEnum = pgEnum('pushStatusEnum', ['unpublished', 'published', 'archived']);
export const interactionTypeEnum1 = pgEnum('interactionTypeEnum1', ['question', 'answer', 'feedback', 'complaint', 'suggestion', 'lead']);
export const responseModeEnum = pgEnum('responseModeEnum', ['ai_assisted', 'direct', 'auto']);
export const sentimentEnum = pgEnum('sentimentEnum', ['positive', 'neutral', 'negative']);
export const complianceStatusEnum = pgEnum('complianceStatusEnum', ['unchecked', 'passed', 'flagged', 'violation']);
export const categoryEnum5 = pgEnum('categoryEnum5', ['price', 'competitor', 'formula', 'customer', 'internal', 'legal', 'other']);
export const matchTypeEnum = pgEnum('matchTypeEnum', ['exact', 'contains', 'regex']);
export const actionEnum1 = pgEnum('actionEnum1', ['warn', 'block', 'replace', 'review']);
export const statTypeEnum = pgEnum('statTypeEnum', ['daily', 'weekly', 'monthly']);
export const gateStageEnum = pgEnum('gateStageEnum', ['M7', 'M8', 'M9']);
export const resultEnum = pgEnum('resultEnum', ['success', 'failure', 'blocked']);
export const licenseTypeEnum = pgEnum('licenseTypeEnum', ['trial', 'standard', 'enterprise', 'unlimited']);
export const deploymentTypeEnum = pgEnum('deploymentTypeEnum', ['cloud', 'on-premise', 'hybrid']);
export const statusEnum61 = pgEnum('statusEnum61', ['active', 'expired', 'revoked', 'suspended']);
export const configTypeEnum = pgEnum('configTypeEnum', ['string', 'number', 'boolean', 'json']);
export const mfaTypeEnum = pgEnum('mfaTypeEnum', ['totp', 'sms', 'email', 'hardware_key']);
export const changeTypeEnum4 = pgEnum('changeTypeEnum4', ['feature', 'bugfix', 'performance', 'security', 'config', 'database', 'infrastructure']);
export const urgencyEnum = pgEnum('urgencyEnum', ['normal', 'urgent', 'critical']);
export const applicantRoleEnum = pgEnum('applicantRoleEnum', ['developer', 'tester', 'admin', 'devops']);
export const statusEnum62 = pgEnum('statusEnum62', ['draft', 'submitted', 'reviewing', 'approved', 'rejected', 'executing', 'testing', 'verified', 'deployed', 'rolled_back', 'cancelled']);
export const targetEnvironmentEnum = pgEnum('targetEnvironmentEnum', ['test', 'production', 'both']);
export const environmentEnum = pgEnum('environmentEnum', ['test', 'production']);
export const consistencyCheckResultEnum = pgEnum('consistencyCheckResultEnum', ['passed', 'warning', 'failed']);
export const statusEnum63 = pgEnum('statusEnum63', ['started', 'executing', 'completed', 'failed', 'blocked', 'rolled_back']);
export const checkTypeEnum = pgEnum('checkTypeEnum', ['file', 'sql', 'command', 'data_impact', 'dependency']);
export const resultEnum1 = pgEnum('resultEnum1', ['match', 'mismatch', 'unexpected', 'missing']);
export const severityEnum3 = pgEnum('severityEnum3', ['info', 'warning', 'error', 'critical']);
export const actionTakenEnum = pgEnum('actionTakenEnum', ['allowed', 'blocked', 'warned']);
export const deploymentTypeEnum1 = pgEnum('deploymentTypeEnum1', ['windows', 'docker', 'kubernetes', 'manus_cloud']);
export const healthStatusEnum1 = pgEnum('healthStatusEnum1', ['healthy', 'degraded', 'unhealthy', 'unknown']);
export const syncTypeEnum = pgEnum('syncTypeEnum', ['schema', 'data', 'config', 'full']);
export const statusEnum64 = pgEnum('statusEnum64', ['pending', 'in_progress', 'completed', 'failed', 'rolled_back']);
export const notificationTypeEnum1 = pgEnum('notificationTypeEnum1', ['request_submitted', 'request_approved', 'request_rejected', 'execution_started', 'execution_completed', 'execution_failed', 'consistency_warning', 'consistency_failed', 'rollback_required', 'deployment_success', 'deployment_failed']);
export const channelEnum2 = pgEnum('channelEnum2', ['system', 'email', 'sms', 'webhook']);
export const evidenceTypeEnum = pgEnum('evidenceTypeEnum', ['project_delivery', 'training_cert', 'skill_cert', 'customer_feedback', 'peer_review', 'self_assessment', 'supervisor_eval', 'other']);
export const capabilityDomainEnum = pgEnum('capabilityDomainEnum', ['T', 'S', 'D', 'C', 'K', 'L']);
export const statusEnum65 = pgEnum('statusEnum65', ['pending', 'approved', 'rejected', 'archived']);
export const serviceTypeEnum = pgEnum('serviceTypeEnum', ['solution', 'quotation', 'planning', 'kpi']);
export const platformEnum1 = pgEnum('platformEnum1', ['wecom', 'dingtalk', 'feishu']);
export const syncStatusEnum1 = pgEnum('syncStatusEnum1', ['idle', 'syncing', 'error']);
export const skillLevelEnum = pgEnum('skillLevelEnum', ['L1', 'L2', 'L3', 'L4', 'L5']);
export const statusEnum66 = pgEnum('statusEnum66', ['Active', 'Inactive', 'OnLeave']);
export const alertTypeEnum3 = pgEnum('alertTypeEnum3', ['overtime', 'undertime', 'continuous_work', 'low_efficiency', 'quality_issue']);
export const statusEnum67 = pgEnum('statusEnum67', ['Pending', 'Acknowledged', 'Resolved', 'Ignored']);
export const syncStatusEnum2 = pgEnum('syncStatusEnum2', ['pending', 'synced', 'failed', 'manual']);
export const taskTypeEnum4 = pgEnum('taskTypeEnum4', ['user', 'department', 'role', 'role_members', 'form_data', 'full']);
export const syncDirectionEnum = pgEnum('syncDirectionEnum', ['jdy_to_grt', 'grt_to_jdy', 'bidirectional']);
export const lastRunStatusEnum1 = pgEnum('lastRunStatusEnum1', ['success', 'partial', 'failed']);
export const statusEnum68 = pgEnum('statusEnum68', ['running', 'success', 'partial', 'failed']);
export const triggeredByEnum = pgEnum('triggeredByEnum', ['schedule', 'manual', 'webhook']);
export const milestoneTypeEnum = pgEnum('milestoneTypeEnum', ['Q4_Strategy', 'Q1_Kickoff', 'Monthly_Review', 'Weekly_Check', 'Custom']);
export const statusEnum69 = pgEnum('statusEnum69', ['pending', 'completed', 'cancelled']);
export const statusEnum70 = pgEnum('statusEnum70', ['scheduled', 'completed', 'skipped']);
export const staffTypeEnum = pgEnum('staffTypeEnum', ['Sales', 'Support_Asia', 'Support_Local', 'Service_Asia', 'Service_Local', 'Support_Asia_Remote']);
export const statusEnum71 = pgEnum('statusEnum71', ['optimal', 'understaffed', 'overstaffed']);
export const statusEnum72 = pgEnum('statusEnum72', ['draft', 'approved', 'in_progress', 'completed', 'cancelled']);
export const certTypeEnum = pgEnum('certTypeEnum', ['quality', 'environment', 'safety', 'security', 'process', 'customer_specific', 'other']);
export const statusEnum73 = pgEnum('statusEnum73', ['valid', 'expired', 'pending', 'planned', 'suspended']);
export const statusEnum74 = pgEnum('statusEnum74', ['planned', 'in_progress', 'completed', 'delayed', 'cancelled']);
export const auditTypeEnum2 = pgEnum('auditTypeEnum2', ['initial', 'surveillance', 'recertification', 'special']);
export const resultEnum2 = pgEnum('resultEnum2', ['pass', 'conditional_pass', 'fail', 'pending']);
export const statusEnum75 = pgEnum('statusEnum75', ['draft', 'reviewed', 'approved', 'actioned']);
export const statusEnum76 = pgEnum('statusEnum76', ['pending', 'scheduled', 'completed', 'cancelled']);
export const revenueTypeEnum = pgEnum('revenueTypeEnum', ['actual', 'forecast', 'budget']);
export const alertTypeEnum4 = pgEnum('alertTypeEnum4', ['hiring', 'revenue', 'resource', 'performance']);
export const statusEnum77 = pgEnum('statusEnum77', ['active', 'acknowledged', 'resolved', 'dismissed']);
export const responsibleRoleEnum = pgEnum('responsibleRoleEnum', ['PROJECT_MANAGER', 'MECHANICAL', 'ELECTRICAL', 'ASSEMBLY', 'QC', 'SERVICE', 'ADMIN']);
export const statusEnum78 = pgEnum('statusEnum78', ['Pending', 'In_Progress', 'Completed', 'Alert', 'Blocked']);
export const sourceTypeEnum4 = pgEnum('sourceTypeEnum4', ['MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC']);
export const workTypeEnum = pgEnum('workTypeEnum', ['REGULAR', 'OVERTIME', 'TRAINING', 'MEETING', 'OTHER']);
export const deviceTypeEnum1 = pgEnum('deviceTypeEnum1', ['UWB_ANCHOR', 'UWB_TAG', 'CLOCK_MACHINE', 'BADGE_READER', 'MOBILE_APP']);
export const statusEnum79 = pgEnum('statusEnum79', ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DISABLED']);
export const statusEnum80 = pgEnum('statusEnum80', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'AUTO_APPROVED']);
export const approvalTypeEnum = pgEnum('approvalTypeEnum', ['STAGE_START', 'STAGE_COMPLETE', 'GATE_PASS', 'EXCEPTION']);
export const knowledgeTypeEnum1 = pgEnum('knowledgeTypeEnum1', ['SOP', 'RISK', 'BEST_PRACTICE', 'CHECKLIST', 'REFERENCE']);
export const priorityEnum6 = pgEnum('priorityEnum6', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const integrationTypeEnum = pgEnum('integrationTypeEnum', ['COPILOT_365', 'WECOM', 'DINGTALK', 'FEISHU', 'ERP', 'MES', 'OTHER']);
export const statusEnum81 = pgEnum('statusEnum81', ['CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING']);
export const customerTypeEnum1 = pgEnum('customerTypeEnum1', ['OEM', 'Tier1', 'Tier2', 'EndUser', 'Trader', 'SystemIntegrator', 'Other']);
export const scenesEnum = pgEnum('scenesEnum', ['Automotive', 'Aerospace', 'Medical', 'Electronics', 'Optics', 'PrecisionMachinery', 'Other']);
export const deliveryRiskEnum = pgEnum('deliveryRiskEnum', ['HIGH', 'MEDIUM', 'LOW']);
export const customerLevelEnum = pgEnum('customerLevelEnum', ['S', 'A', 'B', 'C', 'D']);
export const currentStageEnum1 = pgEnum('currentStageEnum1', ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']);
export const statusEnum82 = pgEnum('statusEnum82', ['Draft', 'Active', 'OnHold', 'Completed', 'Cancelled']);
export const statusEnum83 = pgEnum('statusEnum83', ['NotStarted', 'InProgress', 'Completed', 'Blocked', 'Skipped']);
export const statusEnum84 = pgEnum('statusEnum84', ['Draft', 'Active', 'Archived', 'Rejected']);
export const engineerConfirmEnum = pgEnum('engineerConfirmEnum', ['Pending', 'Approved', 'Rejected', 'Modified']);
export const statusEnum85 = pgEnum('statusEnum85', ['Draft', 'EngineerReview', 'ProcurementReview', 'Approved', 'Submitted', 'Completed']);
export const workOrderTypeEnum = pgEnum('workOrderTypeEnum', ['Production', 'Assembly', 'Testing', 'Debugging', 'Packaging', 'Other']);
export const syncDirectionEnum1 = pgEnum('syncDirectionEnum1', ['ToMES', 'FromMES', 'Bidirectional']);
export const syncStatusEnum3 = pgEnum('syncStatusEnum3', ['Pending', 'Syncing', 'Synced', 'Failed', 'Conflict']);
export const reviewTypeEnum1 = pgEnum('reviewTypeEnum1', ['M3_ProjectApproval', 'M4_DesignFreeze', 'M5_DetailDesign', 'M6_Procurement', 'M7_Production', 'M8_Assembly', 'M9_Testing', 'M10_Delivery', 'M11_Installation', 'M12_Acceptance']);
export const reviewCarriageEnum = pgEnum('reviewCarriageEnum', ['Mechanical', 'Electrical', 'Quality', 'Service', 'Procurement', 'General']);
export const conclusionEnum = pgEnum('conclusionEnum', ['Pass', 'ConditionalPass', 'Fail', 'Pending']);
export const connectorTypeEnum = pgEnum('connectorTypeEnum', ['ERP', 'MES', 'IM', 'Email', 'Webhook', 'API']);
export const lastTestResultEnum = pgEnum('lastTestResultEnum', ['Success', 'Failed', 'NotTested']);
export const roleEnum5 = pgEnum('roleEnum5', ['admin', 'manager', 'specialist', 'viewer']);
export const permissionTypeEnum = pgEnum('permissionTypeEnum', ['read', 'write', 'delete', 'admin', 'export', 'import']);
export const categoryEnum6 = pgEnum('categoryEnum6', ['core', 'business', 'analytics', 'admin', 'integration']);
export const widgetTypeEnum = pgEnum('widgetTypeEnum', ['chart', 'table', 'stat', 'list', 'calendar', 'map', 'custom']);
export const actionTypeEnum = pgEnum('actionTypeEnum', ['role_change', 'permission_grant', 'permission_revoke', 'module_access', 'login', 'logout']);
export const meetingTypeEnum = pgEnum('meetingTypeEnum', ['standup', 'review', 'planning', 'retrospective', 'other']);
export const visibilityEnum = pgEnum('visibilityEnum', ['public', 'private', 'confidential']);
export const roleEnum6 = pgEnum('roleEnum6', ['owner', 'manager', 'member', 'viewer']);
export const insightTypeEnum = pgEnum('insightTypeEnum', ['summary', 'action_items', 'decisions', 'risks', 'opportunities']);
export const roleEnum7 = pgEnum('roleEnum7', ['organizer', 'presenter', 'participant', 'observer']);
export const reasonEnum = pgEnum('reasonEnum', ['resignation', 'termination', 'retirement', 'contract_end', 'mutual_agreement', 'other']);
export const successorTypeEnum = pgEnum('successorTypeEnum', ['replacement', 'new_position', 'backup', 'none']);
export const dataRetentionPolicyEnum = pgEnum('dataRetentionPolicyEnum', ['permanent', 'archive_after_year', 'archive_after_3years']);
export const performanceDataHandlingEnum = pgEnum('performanceDataHandlingEnum', ['keep_under_original', 'transfer_to_successor', 'split_by_date']);
export const profileHandlingEnum = pgEnum('profileHandlingEnum', ['transfer_to_successor', 'create_new_for_successor', 'archive']);
export const phoneHandlingEnum = pgEnum('phoneHandlingEnum', ['transfer_to_successor', 'return_to_pool', 'deactivate']);
export const emailHandlingEnum = pgEnum('emailHandlingEnum', ['forward_to_successor', 'forward_to_manager', 'auto_reply_then_deactivate', 'deactivate']);
export const approvalStatusEnum2 = pgEnum('approvalStatusEnum2', ['draft', 'pending_supervisor', 'pending_hr', 'pending_finance', 'pending_it', 'approved', 'completed', 'cancelled']);
export const statusEnum86 = pgEnum('statusEnum86', ['draft', 'in_progress', 'handover_complete', 'approval_complete', 'completed', 'cancelled']);
export const categoryEnum7 = pgEnum('categoryEnum7', ['project', 'task', 'client', 'document', 'system_access', 'knowledge', 'equipment', 'other']);
export const statusEnum87 = pgEnum('statusEnum87', ['pending', 'in_progress', 'completed', 'verified']);
export const periodTypeEnum2 = pgEnum('periodTypeEnum2', ['daily', 'weekly', 'monthly', 'quarterly', 'annual']);
export const attributionTypeEnum = pgEnum('attributionTypeEnum', ['pre_departure', 'post_departure', 'shared']);
export const statusEnum88 = pgEnum('statusEnum88', ['pending_confirmation', 'confirmed', 'disputed', 'revised']);
export const assetCategoryEnum = pgEnum('assetCategoryEnum', ['profile', 'email_account', 'phone_number', 'laptop', 'monitor', 'access_card', 'keys', 'software_license', 'system_account', 'cloud_storage', 'vpn_access', 'other']);
export const handlingActionEnum = pgEnum('handlingActionEnum', ['transfer_to_successor', 'return_to_company', 'deactivate', 'forward', 'archive', 'delete', 'keep_active_temporary']);
export const approvalLevelEnum = pgEnum('approvalLevelEnum', ['supervisor', 'hr', 'finance', 'it']);
export const decisionEnum = pgEnum('decisionEnum', ['pending', 'approved', 'rejected', 'returned']);
export const queryTypeEnum = pgEnum('queryTypeEnum', ['performance', 'project', 'client', 'task', 'all']);
export const statusEnum89 = pgEnum('statusEnum89', ['active', 'inactive', 'planning']);
export const statusEnum90 = pgEnum('statusEnum90', ['active', 'inactive', 'on_leave']);

export const aiAssistantConfigs = pgTable("ai_assistant_configs", {
	id: serial('id').primaryKey(),
	assistantId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	category: categoryEnum('category').default('business').notNull(),
	systemPrompt: text(),
	modelConfig: text(),
	knowledgeBaseIds: text(),
	allowedRoles: text(),
	isEnabled: smallint().default(1).notNull(),
	rateLimitPerMinute: integer().default(10),
	maxContextLength: integer().default(4096),
	temperature: decimal({ precision: 3, scale: 2 }).default('0.7'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ai_assistant_configs_assistantId_unique").on(table.assistantId),
]);

export const aiAssistantInteractions = pgTable("ai_assistant_interactions", {
	id: serial('id').primaryKey(),
	assistantId: integer().notNull(),
	employeeId: integer().notNull(),
	sessionId: varchar({ length: 100 }).notNull(),
	interactionType: interactionTypeEnum('interactionType').default('chat'),
	context: text(),
	userInput: text(),
	assistantResponse: text(),
	feedbackScore: integer(),
	feedbackComment: text(),
	learningExtracted: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const aiAssistantLogs = pgTable("ai_assistant_logs", {
	id: serial('id').primaryKey(),
	assistantId: varchar({ length: 64 }).notNull(),
	userId: integer(),
	userName: varchar({ length: 100 }),
	sessionId: varchar({ length: 64 }),
	requestType: varchar({ length: 64 }).notNull(),
	requestSummary: text(),
	responseSummary: text(),
	inputTokens: integer().default(0),
	outputTokens: integer().default(0),
	totalTokens: integer().default(0),
	responseTimeMs: integer(),
	status: statusEnum('status').default('success').notNull(),
	errorMessage: text(),
	userRating: integer(),
	userFeedback: text(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiAssistantMessages = pgTable("ai_assistant_messages", {
	id: serial('id').primaryKey(),
	sessionId: varchar({ length: 100 }).notNull(),
	role: roleEnum('role').notNull(),
	content: text().notNull(),
	metadata: text(),
	tokens: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const aiAssistantSessions = pgTable("ai_assistant_sessions", {
	id: serial('id').primaryKey(),
	sessionId: varchar({ length: 100 }).notNull(),
	assistantId: integer().notNull(),
	userId: integer().notNull(),
	title: varchar({ length: 200 }),
	context: text(),
	messageCount: integer().default(0),
	status: statusEnum1('status').default('active'),
	lastMessageAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("sessionId").on(table.sessionId),
]);

export const aiAssistantTemplates = pgTable("ai_assistant_templates", {
	id: serial('id').primaryKey(),
	templateCode: varchar({ length: 50 }).notNull(),
	templateName: varchar({ length: 100 }).notNull(),
	assistantType: assistantTypeEnum('assistantType').notNull(),
	basePrompt: text(),
	capabilities: text(),
	knowledgeConfig: text(),
	toolsConfig: text(),
	description: text(),
	version: varchar({ length: 20 }).default('1.0'),
	isActive: smallint().default(1),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("templateCode").on(table.templateCode),
]);

export const aiChatExports = pgTable("ai_chat_exports", {
	id: serial('id').primaryKey(),
	userId: integer().notNull(),
	sessionId: integer().notNull(),
	format: formatEnum('format').notNull(),
	filePath: varchar({ length: 500 }),
	status: statusEnum2('status').default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
	id: serial('id').primaryKey(),
	sessionId: integer().notNull(),
	role: roleEnum('role').notNull(),
	content: text().notNull(),
	contentType: contentTypeEnum('contentType').default('text').notNull(),
	metadata: text(),
	feedback: feedbackEnum('feedback'),
	feedbackContent: text(),
	isBookmarked: smallint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiChatSessions = pgTable("ai_chat_sessions", {
	id: serial('id').primaryKey(),
	userId: integer().notNull(),
	assistantType: assistantTypeEnum1('assistantType').notNull(),
	title: varchar({ length: 200 }),
	status: statusEnum1('status').default('active').notNull(),
	projectId: integer(),
	customerId: integer(),
	metadata: text(),
	messageCount: integer().default(0).notNull(),
	lastActivityAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiChatTemplates = pgTable("ai_chat_templates", {
	id: serial('id').primaryKey(),
	userId: integer(),
	assistantType: assistantTypeEnum1('assistantType').notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	content: text().notNull(),
	category: varchar({ length: 50 }),
	usageCount: integer().default(0).notNull(),
	isPublic: smallint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiExecutionLogs = pgTable("ai_execution_logs", {
	id: serial('id').primaryKey(),
	sessionId: varchar("session_id", { length: 64 }).notNull(),
	assistantType: varchar("assistant_type", { length: 64 }).notNull(),
	executionMode: executionModeEnum('executionMode').notNull(),
	userId: integer("user_id"),
	inputContent: text("input_content"),
	outputContent: text("output_content"),
	responseTimeMs: integer("response_time_ms"),
	tokenUsage: json("token_usage"),
	isAdopted: smallint("is_adopted"),
	adoptionFeedback: text("adoption_feedback"),
	effectivenessScore: decimal("effectiveness_score", { precision: 3, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_session_id").on(table.sessionId),
	index("idx_assistant_type").on(table.assistantType),
	index("ai_execution_logs_idx_user_id").on(table.userId),
	index("ai_execution_logs_idx_created_at").on(table.createdAt),
]);

export const aiExecutionModeConfigs = pgTable("ai_execution_mode_configs", {
	id: serial('id').primaryKey(),
	assistantType: varchar("assistant_type", { length: 64 }).notNull(),
	defaultMode: executionModeEnum('defaultMode').default('internal'),
	internalPrompt: text("internal_prompt"),
	generativePrompt: text("generative_prompt"),
	internalKnowledgeSources: json("internal_knowledge_sources"),
	generativeModelConfig: json("generative_model_config"),
	isEnabled: smallint("is_enabled").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("uk_assistant_type").on(table.assistantType),
]);

export const aiInterviewAnalytics = pgTable("ai_interview_analytics", {
	id: serial('id').primaryKey(),
	meetingId: integer().notNull(),
	candidateId: integer().notNull(),
	analysisTime: timestamp({ mode: 'string' }).notNull(),
	speechSegment: text(),
	speaker: speakerEnum('speaker').default('unknown'),
	emotionDetected: emotionDetectedEnum('emotionDetected'),
	emotionConfidence: integer(),
	keywords: json(),
	technicalTerms: json(),
	answerQualityScore: integer(),
	aiSuggestion: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiKnowledgeBases = pgTable("ai_knowledge_bases", {
	id: serial('id').primaryKey(),
	knowledgeBaseId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	type: typeEnum('type').default('document').notNull(),
	domain: varchar({ length: 64 }),
	documentCount: integer().default(0),
	vectorCount: integer().default(0),
	lastUpdatedAt: timestamp({ mode: 'string' }),
	isEnabled: smallint().default(1).notNull(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ai_knowledge_bases_knowledgeBaseId_unique").on(table.knowledgeBaseId),
]);

export const aiLearningRecords = pgTable("ai_learning_records", {
	id: serial('id').primaryKey(),
	assistantId: integer().notNull(),
	employeeId: integer().notNull(),
	learningSource: learningSourceEnum('learningSource').notNull(),
	sourceReference: varchar({ length: 200 }),
	learnedContent: text(),
	contentCategory: varchar({ length: 100 }),
	confidenceScore: decimal({ precision: 3, scale: 2 }),
	appliedCount: integer().default(0),
	effectivenessScore: decimal({ precision: 3, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const aiNotebookSuggestions = pgTable("ai_notebook_suggestions", {
	id: serial('id').primaryKey(),
	entryId: bigint("entry_id", { mode: "number" }).notNull(),
	suggestionType: suggestionTypeEnum('suggestionType').notNull(),
	targetProcessType: varchar("target_process_type", { length: 50 }),
	targetProcessId: varchar("target_process_id", { length: 100 }),
	targetField: varchar("target_field", { length: 100 }),
	currentValue: text("current_value"),
	suggestedValue: text("suggested_value"),
	confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
	extractedKeywords: json("extracted_keywords"),
	reasoning: text(),
	status: statusEnum3('status').default('pending'),
	acceptedValue: text("accepted_value"),
	acceptedBy: bigint("accepted_by", { mode: "number" }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_entry").on(table.entryId),
	index("idx_status").on(table.status),
	index("idx_target").on(table.targetProcessType, table.targetProcessId),
]);

export const aiProcessSuggestions = pgTable("ai_process_suggestions", {
	id: serial('id').primaryKey(),
	processType: varchar({ length: 50 }).notNull(),
	processId: varchar({ length: 100 }).notNull(),
	stepCode: varchar({ length: 50 }).notNull(),
	stepName: varchar({ length: 200 }),
	suggestionMode: suggestionModeEnum('suggestionMode').notNull(),
	suggestionSummary: text(),
	suggestionDetails: text(),
	suggestedActions: text(),
	references: text(),
	priority: priorityEnum('priority').default('medium'),
	estimatedTime: integer(),
	assistantId: integer(),
	assistantType: varchar({ length: 50 }),
	isApplied: smallint().default(0).notNull(),
	appliedAt: timestamp({ mode: 'string' }),
	appliedBy: varchar({ length: 100 }),
	applyResult: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiSuggestionExecutionLogs = pgTable("ai_suggestion_execution_logs", {
	id: serial('id').primaryKey(),
	suggestionId: integer().notNull(),
	actionId: varchar({ length: 100 }).notNull(),
	actionName: varchar({ length: 200 }),
	executedBy: varchar({ length: 100 }).notNull(),
	status: statusEnum4('status').default('pending').notNull(),
	result: text(),
	errorMessage: text(),
	nextSuggestion: text(),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
	id: serial('id').primaryKey(),
	userId: integer(),
	eventType: varchar({ length: 64 }).notNull(),
	eventData: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const annualPlanningConfigs = pgTable("annual_planning_configs", {
	id: serial('id').primaryKey(),
	year: integer().notNull(),
	version: varchar({ length: 20 }).notNull(),
	versionName: varchar({ length: 200 }).notNull(),
	status: statusEnum5('status').default('draft').notNull(),
	basedOnId: integer(),
	effectiveDate: timestamp({ mode: 'string' }),
	archivedDate: timestamp({ mode: 'string' }),
	creatorId: integer().notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const annualPlanningDependencies = pgTable("annual_planning_dependencies", {
	id: serial('id').primaryKey(),
	configId: integer().notNull(),
	sourceItemId: integer().notNull(),
	targetItemId: integer().notNull(),
	dependencyType: varchar({ length: 20 }).default('finish_to_start'),
	lagDays: integer().default(0),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const annualPlanningItems = pgTable("annual_planning_items", {
	id: serial('id').primaryKey(),
	configId: integer().notNull(),
	category: categoryEnum1('category').default('other').notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	tasks: text(),
	frequency: frequencyEnum('frequency').default('once').notNull(),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	weekNumber: integer(),
	month: integer(),
	responsibleUserId: integer(),
	responsibleUserName: varchar({ length: 100 }),
	participantIds: text(),
	status: statusEnum6('status').default('pending').notNull(),
	sortOrder: integer().default(0).notNull(),
	isTemplate: smallint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const annualPlanningUpdateLogs = pgTable("annual_planning_update_logs", {
	id: serial('id').primaryKey(),
	configId: integer().notNull(),
	updateType: updateTypeEnum('updateType').notNull(),
	description: text(),
	beforeData: text(),
	afterData: text(),
	operatorId: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const annualPlans = pgTable("annual_plans", {
	id: serial('id').primaryKey(),
	year: integer().notNull(),
	type: typeEnum1('type').default('company').notNull(),
	departmentId: integer(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	revenueTarget: bigint({ mode: "number" }),
	profitTarget: bigint({ mode: "number" }),
	customerTarget: integer(),
	investmentBudget: bigint({ mode: "number" }),
	hiringBudget: integer(),
	trainingBudget: bigint({ mode: "number" }),
	keyInitiatives: text(),
	risksAndChallenges: text(),
	status: statusEnum7('status').default('draft').notNull(),
	creatorId: integer().notNull(),
	approverId: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	// Freeze & optimistic lock (Phase: HR & Risk Control)
	isFrozen: boolean('is_frozen').default(false),
	version: integer('version').default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const bomAssemblyTasks = pgTable("bom_assembly_tasks", {
	id: serial('id').primaryKey(),
	taskId: varchar({ length: 50 }).notNull(),
	bomItemId: integer().notNull(),
	bomItemName: varchar({ length: 200 }),
	bomLevel: integer().default(1),
	assemblyType: assemblyTypeEnum('assemblyType').notNull(),
	workstation: varchar({ length: 50 }),
	estimatedHours: decimal({ precision: 6, scale: 2 }),
	actualHours: decimal({ precision: 6, scale: 2 }),
	primaryAssigneeId: integer(),
	backupAssigneeId: integer(),
	supervisorId: integer(),
	selfCheck: smallint().default(0),
	mutualCheck: smallint().default(0),
	specialCheck: smallint().default(0),
	assemblyInstruction: varchar({ length: 500 }),
	qualityStandard: varchar({ length: 500 }),
	safetyProcedure: varchar({ length: 500 }),
	status: statusEnum8('status').default('pending'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("bom_assembly_tasks_taskId").on(table.taskId),
]);

export const cadModels = pgTable("cad_models", {
	id: serial('id').primaryKey(),
	modelId: varchar({ length: 50 }).notNull(),
	modelName: varchar({ length: 200 }).notNull(),
	modelType: varchar({ length: 50 }),
	originalFormat: varchar({ length: 20 }),
	originalFileUrl: varchar({ length: 500 }),
	stepFileUrl: varchar({ length: 500 }),
	gltfFileUrl: varchar({ length: 500 }),
	urdfFileUrl: varchar({ length: 500 }),
	assemblyTree: text(),
	features: text(),
	dimensions: text(),
	materials: text(),
	graspPoints: text(),
	assemblySequence: text(),
	equipmentModelId: integer(),
	bomHeaderId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("modelId").on(table.modelId),
]);

export const careerDevelopmentPaths = pgTable("career_development_paths", {
	id: serial('id').primaryKey(),
	employeeId: integer().notNull(),
	currentRole: varchar({ length: 100 }).notNull(),
	targetRole: varchar({ length: 100 }).notNull(),
	pathType: pathTypeEnum('pathType').default('vertical'),
	milestones: text(),
	requiredSkills: text(),
	requiredExperiences: text(),
	progressPercentage: integer().default(0),
	estimatedTimeline: varchar({ length: 50 }),
	mentorId: integer(),
	status: statusEnum9('status').default('planning'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const costAlertLogs = pgTable("cost_alert_logs", {
	id: serial('id').primaryKey(),
	ruleId: integer().notNull(),
	projectId: integer().notNull(),
	alertLevel: alertLevelEnum('alertLevel').notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	currentValue: bigint({ mode: "number" }).notNull(),
	thresholdValue: bigint({ mode: "number" }).notNull(),
	status: statusEnum10('status').default('pending').notNull(),
	handlerId: integer(),
	handleNote: text(),
	handledAt: timestamp({ mode: 'string' }),
	isNotified: smallint().default(0).notNull(),
	notifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costAlertRuleTemplates = pgTable("cost_alert_rule_templates", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	templateType: templateTypeEnum('templateType').default('custom').notNull(),
	category: categoryEnum2('category').default('budget').notNull(),
	ruleConfig: text().notNull(),
	usageCount: integer().default(0).notNull(),
	isActive: smallint().default(1).notNull(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costAlertRuleVersions = pgTable("cost_alert_rule_versions", {
	id: serial('id').primaryKey(),
	ruleId: integer().notNull(),
	versionNumber: integer().notNull(),
	ruleData: text().notNull(),
	changeSummary: varchar({ length: 500 }),
	changedBy: integer(),
	changedAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const costAlertRules = pgTable("cost_alert_rules", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	scope: scopeEnum('scope').default('all').notNull(),
	projectId: integer(),
	categoryId: integer(),
	alertType: alertTypeEnum('alertType').default('budget_percent').notNull(),
	threshold: bigint({ mode: "number" }).notNull(),
	alertLevel: alertLevelEnum('alertLevel').default('warning').notNull(),
	notifyType: notifyTypeEnum('notifyType').default('system').notNull(),
	notifyUserIds: text(),
	isActive: smallint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costCategories = pgTable("cost_categories", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 20 }).notNull(),
	parentId: integer(),
	type: typeEnum2('type').default('direct').notNull(),
	description: text(),
	sortOrder: integer().default(0),
	isActive: smallint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costEstimates = pgTable("cost_estimates", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	categoryId: integer().notNull(),
	name: varchar({ length: 200 }).notNull(),
	estimateType: estimateTypeEnum('estimateType').default('rough').notNull(),
	estimatedAmount: bigint({ mode: "number" }).notNull(),
	lowEstimate: bigint({ mode: "number" }),
	highEstimate: bigint({ mode: "number" }),
	confidence: integer().default(80),
	phaseCode: varchar({ length: 10 }),
	basis: text(),
	assumptions: text(),
	estimatorId: integer(),
	estimatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costRates = pgTable("cost_rates", {
	id: serial('id').primaryKey(),
	rateType: rateTypeEnum('rateType').notNull(),
	rateValue: decimal({ precision: 10, scale: 4 }).notNull(),
	rateUnit: varchar({ length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	notes: text(),
	isActive: smallint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_rate_type").on(table.rateType),
]);

export const costRecords = pgTable("cost_records", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	categoryId: integer().notNull(),
	costCode: varchar({ length: 50 }).notNull(),
	description: varchar({ length: 500 }).notNull(),
	amount: bigint({ mode: "number" }).notNull(),
	costDate: timestamp({ mode: 'string' }).notNull(),
	vendor: varchar({ length: 200 }),
	invoiceNo: varchar({ length: 100 }),
	taskId: integer(),
	milestoneId: integer(),
	phaseCode: varchar({ length: 10 }),
	status: statusEnum11('status').default('pending').notNull(),
	submitterId: integer(),
	reviewerId: integer(),
	reviewedAt: timestamp({ mode: 'string' }),
	attachmentUrl: varchar({ length: 500 }),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const costVarianceAnalysis = pgTable("cost_variance_analysis", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	periodType: periodTypeEnum('periodType').default('monthly').notNull(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	phaseCode: varchar({ length: 10 }),
	plannedCost: bigint({ mode: "number" }).notNull(),
	actualCost: bigint({ mode: "number" }).notNull(),
	costVariance: bigint({ mode: "number" }).notNull(),
	cpi: decimal({ precision: 5, scale: 2 }),
	varianceReason: text(),
	correctiveAction: text(),
	analyzerId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const crmBantScores = pgTable("crm_bant_scores", {
	id: serial('id').primaryKey(),
	opportunityId: integer().notNull(),
	budgetScore: integer().default(1),
	budgetNote: text(),
	authorityScore: integer().default(1),
	authorityNote: text(),
	needScore: integer().default(1),
	needNote: text(),
	timelineScore: integer().default(1),
	timelineNote: text(),
	totalScore: integer().default(4),
	aiSuggestion: text(),
	scorerId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const crmContacts = pgTable("crm_contacts", {
	id: serial('id').primaryKey(),
	customerId: integer().notNull(),
	name: varchar({ length: 100 }).notNull(),
	gender: genderEnum('gender').default('unknown'),
	position: varchar({ length: 100 }),
	department: varchar({ length: 100 }),
	mobile: varchar({ length: 20 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	wechat: varchar({ length: 100 }),
	isKeyPerson: isKeyPersonEnum('isKeyPerson').default('no'),
	decisionRole: decisionRoleEnum('decisionRole'),
	birthday: timestamp({ mode: 'string' }),
	hobbies: text(),
	remark: text(),
	status: statusEnum12('status').default('active').notNull(),
	jiandaoyunId: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const crmCustomers = pgTable("crm_customers", {
	id: serial('id').primaryKey(),
	customerCode: varchar({ length: 32 }),
	name: varchar({ length: 200 }).notNull(),
	shortName: varchar({ length: 100 }),
	type: typeEnum3('type').default('prospect').notNull(),
	source: varchar({ length: 100 }),
	industry: varchar({ length: 100 }),
	scale: scaleEnum('scale'),
	level: levelEnum('level').default('C'),
	province: varchar({ length: 50 }),
	city: varchar({ length: 50 }),
	address: text(),
	website: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	creditCode: varchar({ length: 50 }),
	legalPerson: varchar({ length: 100 }),
	registeredCapital: varchar({ length: 50 }),
	employeeCount: integer(),
	annualRevenue: integer(),
	status: statusEnum13('status').default('active').notNull(),
	ownerId: integer(),
	remark: text(),
	jiandaoyunId: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("crm_customers_customerCode_unique").on(table.customerCode),
]);

export const crmFollowUps = pgTable("crm_follow_ups", {
	id: serial('id').primaryKey(),
	relatedType: relatedTypeEnum('relatedType').notNull(),
	relatedId: integer().notNull(),
	method: methodEnum('method').default('phone').notNull(),
	content: text().notNull(),
	result: text(),
	nextPlan: text(),
	nextPlanDate: timestamp({ mode: 'string' }),
	followerId: integer(),
	followedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const crmOpportunities = pgTable("crm_opportunities", {
	id: serial('id').primaryKey(),
	opportunityCode: varchar({ length: 32 }),
	name: varchar({ length: 200 }).notNull(),
	customerId: integer().notNull(),
	contactId: integer(),
	source: varchar({ length: 100 }),
	type: typeEnum4('type').default('new_business'),
	expectedAmount: integer(),
	expectedCloseDate: timestamp({ mode: 'string' }),
	stage: stageEnum('stage').default('lead').notNull(),
	probability: integer().default(10),
	competitors: text(),
	painPoints: text(),
	ourAdvantages: text(),
	nextAction: text(),
	nextActionDate: timestamp({ mode: 'string' }),
	lostReason: text(),
	ownerId: integer(),
	remark: text(),
	jiandaoyunId: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("crm_opportunities_opportunityCode_unique").on(table.opportunityCode),
]);

export const customerAccessLogs = pgTable("customer_access_logs", {
	id: serial('id').primaryKey(),
	logId: varchar({ length: 50 }).notNull(),
	portalUserId: varchar({ length: 50 }).notNull(),
	action: varchar({ length: 100 }),
	resourceType: varchar({ length: 50 }),
	resourceId: varchar({ length: 50 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	requestData: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("logId").on(table.logId),
]);

export const customerAiConnections = pgTable("customer_ai_connections", {
	id: serial('id').primaryKey(),
	connectionId: varchar({ length: 50 }).notNull(),
	customerId: integer().notNull(),
	connectionName: varchar({ length: 100 }),
	apiEndpoint: varchar({ length: 500 }),
	authType: varchar({ length: 20 }),
	credentialsEncrypted: text(),
	syncEnabled: smallint().default(0),
	syncIntervalMinutes: integer().default(60),
	syncDataTypes: text(),
	status: statusEnum14('status').default('inactive'),
	lastSyncAt: timestamp({ mode: 'string' }),
	lastError: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("connectionId").on(table.connectionId),
]);

export const customerCommunications = pgTable("customer_communications", {
	id: serial('id').primaryKey(),
	communicationId: varchar({ length: 50 }).notNull(),
	projectId: integer().notNull(),
	phaseCode: varchar({ length: 10 }),
	communicationType: varchar({ length: 50 }),
	subject: varchar({ length: 200 }),
	summary: text(),
	actionItems: text(),
	customerContacts: text(),
	internalParticipants: text(),
	communicationDate: timestamp({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	nextFollowUp: date({ mode: 'string' }),
	aiSummary: text(),
	aiNextActions: text(),
	aiGeneratedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	createdBy: integer(),
},
(table) => [
	index("communicationId").on(table.communicationId),
]);

export const customerPortalAccounts = pgTable("customer_portal_accounts", {
	id: serial('id').primaryKey(),
	accountId: varchar({ length: 50 }).notNull(),
	customerId: integer().notNull(),
	accountType: accountTypeEnum('accountType').default('standard'),
	companyName: varchar({ length: 200 }),
	contactEmail: varchar({ length: 100 }),
	status: statusEnum15('status').default('active'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("accountId").on(table.accountId),
]);

export const customerPortalUsers = pgTable("customer_portal_users", {
	id: serial('id').primaryKey(),
	portalUserId: varchar({ length: 50 }).notNull(),
	accountId: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 100 }),
	role: varchar({ length: 50 }),
	passwordHash: varchar({ length: 255 }),
	lastLogin: timestamp({ mode: 'string' }),
	status: statusEnum15('status').default('active'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("portalUserId").on(table.portalUserId),
]);

export const departmentPermissionConfig = pgTable("department_permission_config", {
	id: serial('id').primaryKey(),
	departmentId: varchar("department_id", { length: 50 }).notNull(),
	departmentName: varchar("department_name", { length: 100 }).notNull(),
	parentDepartmentId: varchar("parent_department_id", { length: 50 }),
	defaultRoleId: varchar("default_role_id", { length: 50 }),
	allowedModules: text("allowed_modules"),
	restrictedModules: text("restricted_modules"),
	dataScope: dataScopeEnum('dataScope').default('department'),
	isActive: smallint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("department_id").on(table.departmentId),
]);

export const devTasks = pgTable("dev_tasks", {
	id: serial('id').primaryKey(),
	taskCode: varchar({ length: 32 }),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	version: varchar({ length: 20 }).notNull(),
	module: varchar({ length: 50 }).notNull(),
	type: typeEnum5('type').default('feature').notNull(),
	priority: priorityEnum1('priority').default('medium').notNull(),
	status: statusEnum16('status').default('backlog').notNull(),
	estimatedHours: integer(),
	actualHours: integer(),
	assigneeId: integer(),
	startDate: timestamp({ mode: 'string' }),
	dueDate: timestamp({ mode: 'string' }),
	completedDate: timestamp({ mode: 'string' }),
	attachments: text(),
	claudePrompt: text(),
	acceptanceCriteria: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("dev_tasks_taskCode_unique").on(table.taskCode),
]);

export const developmentBugs = pgTable("development_bugs", {
	id: serial('id').primaryKey(),
	bugCode: varchar({ length: 32 }).notNull(),
	taskId: integer(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	stepsToReproduce: text(),
	expectedBehavior: text(),
	actualBehavior: text(),
	severity: severityEnum('severity').default('minor').notNull(),
	status: statusEnum17('status').default('open').notNull(),
	fixAttempts: integer().default(0),
	maxFixAttempts: integer().default(3),
	reportedBy: reportedByEnum('reportedBy').default('test').notNull(),
	fixedBy: fixedByEnum('fixedBy'),
	impactAssessment: text(),
	fixSuggestion: text(),
	affectedFiles: text(),
	errorLog: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	fixedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("development_bugs_bugCode_unique").on(table.bugCode),
]);

export const developmentExecutionLogs = pgTable("development_execution_logs", {
	id: serial('id').primaryKey(),
	taskId: integer(),
	bugId: integer(),
	executionType: executionTypeEnum('executionType').notNull(),
	executor: fixedByEnum('executor').notNull(),
	status: statusEnum18('status').default('success').notNull(),
	details: text(),
	inputParams: text(),
	outputResult: text(),
	errorMessage: text(),
	durationSeconds: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const developmentTasks = pgTable("development_tasks", {
	id: serial('id').primaryKey(),
	taskCode: varchar({ length: 32 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	taskType: taskTypeEnum('taskType').default('feature').notNull(),
	priority: priorityEnum2('priority').default('P1').notNull(),
	status: statusEnum19('status').default('pending').notNull(),
	assignee: fixedByEnum('assignee').default('claude_code').notNull(),
	dependsOn: text(),
	estimatedHours: decimal({ precision: 5, scale: 1 }),
	actualHours: decimal({ precision: 5, scale: 1 }),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	milestone: varchar({ length: 64 }),
	documentPath: varchar({ length: 500 }),
	acceptanceCriteria: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("development_tasks_taskCode_unique").on(table.taskCode),
]);

export const deviceTasks = pgTable("device_tasks", {
	id: serial('id').primaryKey(),
	deviceTaskId: varchar({ length: 50 }).notNull(),
	deviceId: varchar({ length: 50 }).notNull(),
	taskType: varchar({ length: 50 }).notNull(),
	taskData: text(),
	projectId: integer(),
	bomItemId: integer(),
	engineeringTaskId: varchar({ length: 50 }),
	status: statusEnum20('status').default('pending'),
	progress: integer().default(0),
	result: text(),
	errorMessage: text(),
	scheduledAt: timestamp({ mode: 'string' }),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("deviceTaskId").on(table.deviceTaskId),
]);

export const employeeAiAssistants = pgTable("employee_ai_assistants", {
	id: serial('id').primaryKey(),
	employeeId: integer().notNull(),
	assistantCode: varchar({ length: 50 }).notNull(),
	assistantName: varchar({ length: 100 }).notNull(),
	assistantType: assistantTypeEnum2('assistantType').default('general'),
	personalityConfig: text(),
	knowledgeDomains: text(),
	learningProgress: text(),
	interactionStats: text(),
	skillLevels: text(),
	careerGoals: text(),
	status: statusEnum21('status').default('active'),
	lastActiveAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("assistantCode").on(table.assistantCode),
]);

export const employeeDigitalAssistants = pgTable("employee_digital_assistants", {
	id: serial('id').primaryKey(),
	employeeId: varchar({ length: 50 }).notNull(),
	assistantCode: varchar({ length: 100 }).notNull(),
	displayName: varchar({ length: 200 }),
	workHabits: text(),
	preferences: text(),
	expertise: text(),
	communicationStyle: varchar({ length: 50 }),
	canTaskAssist: smallint().default(1).notNull(),
	canScheduleManage: smallint().default(1).notNull(),
	canDocumentDraft: smallint().default(1).notNull(),
	canDataAnalysis: smallint().default(0).notNull(),
	canCommunicationProxy: smallint().default(0).notNull(),
	isActive: smallint().default(1).notNull(),
	lastActiveAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("employee_digital_assistants_assistantCode_unique").on(table.assistantCode),
]);

export const employeeSkillMaps = pgTable("employee_skill_maps", {
	id: serial('id').primaryKey(),
	employeeId: integer().notNull(),
	skillCategory: varchar({ length: 100 }).notNull(),
	skillName: varchar({ length: 200 }).notNull(),
	currentLevel: integer().default(1),
	targetLevel: integer(),
	evidence: text(),
	assessmentHistory: text(),
	improvementPlan: text(),
	lastAssessedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const engineeringInputs = pgTable("engineering_inputs", {
	id: serial('id').primaryKey(),
	inputId: varchar({ length: 50 }).notNull(),
	projectId: integer().notNull(),
	sourceType: varchar({ length: 50 }).notNull(),
	sourceId: varchar({ length: 50 }),
	inputCategory: varchar({ length: 50 }),
	inputContent: text(),
	importance: priorityEnum1('importance').default('medium'),
	aiProcessed: smallint().default(0),
	aiExtractedRequirements: text(),
	aiSuggestedTasks: text(),
	aiProcessedAt: timestamp({ mode: 'string' }),
	distributedTo: text(),
	distributionStatus: varchar({ length: 20 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("inputId").on(table.inputId),
]);

export const engineeringTasks = pgTable("engineering_tasks", {
	id: serial('id').primaryKey(),
	taskId: varchar({ length: 50 }).notNull(),
	projectId: integer().notNull(),
	phaseCode: varchar({ length: 10 }).notNull(),
	taskType: varchar({ length: 50 }).notNull(),
	taskName: varchar({ length: 200 }).notNull(),
	taskDescription: text(),
	primaryAssigneeId: integer(),
	backupAssigneeId: integer(),
	supervisorId: integer(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	plannedStartDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	plannedEndDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualStartDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	actualEndDate: date({ mode: 'string' }),
	status: statusEnum22('status').default('pending'),
	priority: priorityEnum3('priority').default('medium'),
	progress: integer().default(0),
	bomItemId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("engineering_tasks_taskId").on(table.taskId),
]);

export const equipmentBasePrices = pgTable("equipment_base_prices", {
	id: serial('id').primaryKey(),
	equipmentModel: varchar({ length: 50 }).notNull(),
	basePrice: decimal({ precision: 12, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('CNY'),
	priceType: priceTypeEnum('priceType').default('standard'),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date({ mode: 'string' }),
	notes: text(),
	isActive: smallint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("equipment_base_prices_idx_equipment_model").on(table.equipmentModel),
	index("idx_effective_date").on(table.effectiveDate),
]);

export const equipmentModels = pgTable("equipment_models", {
	id: serial('id').primaryKey(),
	numericCode: varchar({ length: 10 }).notNull(),
	functionCode: varchar({ length: 10 }).notNull(),
	categoryCode: varchar({ length: 5 }).notNull(),
	fullName: varchar({ length: 100 }).notNull(),
	chineseName: varchar({ length: 100 }).notNull(),
	displayName: varchar({ length: 100 }),
	chamberCount: integer(),
	processType: varchar({ length: 50 }),
	configLevel: varchar({ length: 20 }),
	applicableIndustry: varchar({ length: 100 }),
	namingVersion: varchar({ length: 20 }).default('V1.0').notNull(),
	effectiveDate: timestamp({ mode: 'string' }).notNull(),
	status: statusEnum23('status').default('active').notNull(),
	remark: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("equipment_models_numericCode_unique").on(table.numericCode),
]);

export const equipmentNameHistory = pgTable("equipment_name_history", {
	id: serial('id').primaryKey(),
	equipmentId: integer().notNull(),
	numericCode: varchar({ length: 10 }).notNull(),
	oldName: varchar({ length: 100 }),
	newName: varchar({ length: 100 }),
	oldChineseName: varchar({ length: 100 }),
	newChineseName: varchar({ length: 100 }),
	changeReason: text(),
	changeType: changeTypeEnum('changeType').notNull(),
	namingVersion: varchar({ length: 20 }).notNull(),
	effectiveDate: timestamp({ mode: 'string' }).notNull(),
	changeRequestId: integer(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
	id: serial('id').primaryKey(),
	userId: integer(),
	type: typeEnum6('type').default('suggestion').notNull(),
	content: text().notNull(),
	status: statusEnum24('status').default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const functionalAiAssistants = pgTable("functional_ai_assistants", {
	id: serial('id').primaryKey(),
	assistantType: assistantTypeEnum3('assistantType').notNull(),
	assistantCode: varchar({ length: 100 }).notNull(),
	displayName: varchar({ length: 200 }).notNull(),
	description: text(),
	systemPrompt: text(),
	temperature: decimal({ precision: 3, scale: 2 }).default('0.7'),
	maxTokens: integer().default(4096),
	dataAccess: text(),
	actions: text(),
	integrations: text(),
	isActive: smallint().default(1).notNull(),
	version: varchar({ length: 20 }).default('1.0.0'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("functional_ai_assistants_assistantCode_unique").on(table.assistantCode),
]);

export const groupMembers = pgTable("group_members", {
	id: serial('id').primaryKey(),
	groupId: integer().notNull(),
	memberType: memberTypeEnum('memberType').notNull(),
	userId: integer(),
	roleId: varchar({ length: 50 }),
	departmentId: varchar({ length: 50 }),
	isAdmin: smallint().default(0).notNull(),
	joinedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	addedBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const groupNotificationConfigs = pgTable("group_notification_configs", {
	id: serial('id').primaryKey(),
	groupId: integer().notNull(),
	notificationType: notificationTypeEnum('notificationType').notNull(),
	titleTemplate: varchar({ length: 200 }).notNull(),
	contentTemplate: text(),
	cronExpression: varchar({ length: 100 }),
	channels: json().notNull(),
	isEnabled: smallint().default(1).notNull(),
	priority: priorityEnum4('priority').default('normal').notNull(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const groupNotificationLogs = pgTable("group_notification_logs", {
	id: serial('id').primaryKey(),
	groupId: integer().notNull(),
	configId: integer(),
	title: varchar({ length: 200 }).notNull(),
	content: text(),
	notificationType: notificationTypeEnum('notificationType').notNull(),
	channel: channelEnum('channel').notNull(),
	recipientCount: integer().default(0).notNull(),
	successCount: integer().default(0).notNull(),
	failedCount: integer().default(0).notNull(),
	status: statusEnum25('status').default('pending').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	errorMessage: text(),
	sentBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const groupPermissions = pgTable("group_permissions", {
	id: serial('id').primaryKey(),
	groupId: integer().notNull(),
	moduleId: varchar({ length: 100 }).notNull(),
	permission: permissionEnum('permission').notNull(),
	scope: scopeEnum1('scope').default('self').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const historicalQuotations = pgTable("historical_quotations", {
	id: serial('id').primaryKey(),
	quotationId: varchar({ length: 50 }).notNull(),
	projectNo: varchar({ length: 50 }),
	solutionId: varchar({ length: 50 }),
	customerName: varchar({ length: 100 }).notNull(),
	customerType: customerTypeEnum('customerType').default('other'),
	equipmentModel: varchar({ length: 50 }).notNull(),
	equipmentQuantity: integer().default(1),
	basePrice: decimal({ precision: 12, scale: 2 }).notNull(),
	customizationCost: decimal({ precision: 12, scale: 2 }).default('0'),
	installationCost: decimal({ precision: 12, scale: 2 }).default('0'),
	trainingCost: decimal({ precision: 12, scale: 2 }).default('0'),
	warrantyCost: decimal({ precision: 12, scale: 2 }).default('0'),
	otherCosts: decimal({ precision: 12, scale: 2 }).default('0'),
	totalCost: decimal({ precision: 12, scale: 2 }).notNull(),
	totalPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	discountRate: decimal({ precision: 5, scale: 2 }).default('0'),
	finalPrice: decimal({ precision: 12, scale: 2 }),
	currency: varchar({ length: 10 }).default('CNY'),
	bidResult: bidResultEnum('bidResult').default('pending'),
	competitorPrice: decimal({ precision: 12, scale: 2 }),
	competitorName: varchar({ length: 100 }),
	profitMargin: decimal({ precision: 5, scale: 2 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	quotationDate: date({ mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	validUntil: date({ mode: 'string' }),
	paymentTerms: varchar({ length: 200 }),
	deliveryTerms: varchar({ length: 200 }),
	notes: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("historical_quotations_idx_equipment_model").on(table.equipmentModel),
	index("idx_customer_type").on(table.customerType),
	index("idx_bid_result").on(table.bidResult),
	index("idx_quotation_date").on(table.quotationDate),
	index("quotationId").on(table.quotationId),
]);

export const historicalSolutions = pgTable("historical_solutions", {
	id: serial('id').primaryKey(),
	solutionId: varchar({ length: 50 }).notNull(),
	solutionName: varchar({ length: 200 }).notNull(),
	sourceType: sourceTypeEnum('sourceType').default('grt_internal').notNull(),
	customerName: varchar({ length: 100 }),
	projectNo: varchar({ length: 50 }),
	equipmentModel: varchar({ length: 50 }),
	workpieceType: varchar({ length: 100 }),
	workpieceCategory: workpieceCategoryEnum('workpieceCategory').default('other'),
	workpieceMaterial: varchar({ length: 50 }),
	workpieceDimensions: varchar({ length: 100 }),
	workpieceWeight: decimal({ precision: 10, scale: 2 }),
	cleanlinessStandard: varchar({ length: 50 }),
	cleanlinessValue: varchar({ length: 50 }),
	cycleTime: integer(),
	dailyCapacity: integer(),
	loadingMethod: varchar({ length: 100 }),
	unloadingMethod: varchar({ length: 100 }),
	processFlow: text(),
	processParameters: text(),
	specialRequirements: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	deliveryDate: date({ mode: 'string' }),
	successRate: decimal({ precision: 5, scale: 2 }).default('100.00'),
	lessonsLearned: text(),
	isReference: smallint().default(1),
	isActive: smallint().default(1),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("historical_solutions_idx_equipment_model").on(table.equipmentModel),
	index("historical_solutions_idx_workpiece_category").on(table.workpieceCategory),
	index("idx_source_type").on(table.sourceType),
	index("solutionId").on(table.solutionId),
]);

export const hrmAiInterviewRecords = pgTable("hrm_ai_interview_records", {
	id: serial('id').primaryKey(),
	recordCode: varchar({ length: 50 }).notNull(),
	candidateId: integer().notNull(),
	positionId: integer(),
	round: integer().default(1),
	interviewType: interviewTypeEnum('interviewType').default('video').notNull(),
	interviewStrategy: text(),
	interviewQuestions: text(),
	transcript: text(),
	emotionAnalysis: text(),
	keywordsExtracted: text(),
	riskAssessment: text(),
	overallScore: integer(),
	recommendation: recommendationEnum('recommendation'),
	followUpActions: text(),
	interviewerId: integer(),
	interviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("recordCode").on(table.recordCode),
]);

export const hrmCandidates = pgTable("hrm_candidates", {
	id: serial('id').primaryKey(),
	candidateCode: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	gender: genderEnum1('gender'),
	age: integer(),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 100 }),
	positionId: integer(),
	positionName: varchar({ length: 100 }),
	source: varchar({ length: 50 }),
	resumeUrl: varchar({ length: 500 }),
	resumeAnalysis: text(),
	workYears: integer(),
	education: varchar({ length: 50 }),
	expectedSalary: bigint({ mode: "number" }),
	status: statusEnum26('status').default('new').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("candidateCode").on(table.candidateCode),
]);

export const hrmDigitalAgentModels = pgTable("hrm_digital_agent_models", {
	id: serial('id').primaryKey(),
	positionId: integer().notNull(),
	positionName: varchar({ length: 100 }).notNull(),
	department: varchar({ length: 50 }).notNull(),
	digitalizationScore: decimal({ precision: 5, scale: 2 }).default('0'),
	taskStandardization: decimal({ precision: 5, scale: 2 }).default('0'),
	decisionComplexity: decimal({ precision: 5, scale: 2 }).default('0'),
	interactionRequirement: decimal({ precision: 5, scale: 2 }).default('0'),
	creativityRequirement: decimal({ precision: 5, scale: 2 }).default('0'),
	technicalFeasibility: decimal({ precision: 5, scale: 2 }).default('0'),
	roadmap: text(),
	currentStage: currentStageEnum('currentStage').default('initial').notNull(),
	assessmentNotes: text(),
	lastAssessedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const hrmDocumentFiles = pgTable("hrm_document_files", {
	id: serial('id').primaryKey(),
	fileCode: varchar({ length: 100 }).notNull(),
	fileTypeCode: varchar({ length: 10 }).notNull(),
	subjectType: subjectTypeEnum('subjectType').notNull(),
	subjectId: integer().notNull(),
	fileName: varchar({ length: 200 }).notNull(),
	fileUrl: varchar({ length: 500 }),
	version: varchar({ length: 10 }).default('V1.0').notNull(),
	fileDate: timestamp({ mode: 'string' }).notNull(),
	status: statusEnum5('status').default('active').notNull(),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("fileCode").on(table.fileCode),
]);

export const hrmEmployees = pgTable("hrm_employees", {
	id: serial('id').primaryKey(),
	employeeCode: varchar({ length: 20 }).notNull(),
	userId: integer(),
	name: varchar({ length: 100 }).notNull(),
	englishName: varchar({ length: 100 }),
	gender: genderEnum1('gender').notNull(),
	birthDate: timestamp({ mode: 'string' }),
	idNumber: varchar({ length: 18 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 100 }),
	department: varchar({ length: 50 }).notNull(),
	position: varchar({ length: 100 }).notNull(),
	level: varchar({ length: 20 }),
	hireDate: timestamp({ mode: 'string' }).notNull(),
	regularDate: timestamp({ mode: 'string' }),
	managerId: integer(),
	seniorManagerId: integer(),
	hrbpId: integer(),
	status: statusEnum27('status').default('probation').notNull(),
	workLocation: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("employeeCode").on(table.employeeCode),
]);

export const hrmPerformanceGrades = pgTable("hrm_performance_grades", {
	id: serial('id').primaryKey(),
	gradeCode: varchar({ length: 10 }).notNull(),
	gradeName: varchar({ length: 50 }).notNull(),
	scoreMin: integer().notNull(),
	scoreMax: integer().notNull(),
	coefficient: decimal({ precision: 3, scale: 2 }).notNull(),
	description: varchar({ length: 200 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("gradeCode").on(table.gradeCode),
]);

export const hrmPerformanceReviewReminders = pgTable("hrm_performance_review_reminders", {
	id: serial('id').primaryKey(),
	employeeId: integer().notNull(),
	reviewType: reviewTypeEnum('reviewType').notNull(),
	reviewDate: timestamp({ mode: 'string' }).notNull(),
	reminderDateTime: timestamp({ mode: 'string' }).notNull(),
	recipients: text(),
	emailSubject: varchar({ length: 500 }),
	emailContent: text(),
	status: statusEnum28('status').default('pending').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const hrmPositions = pgTable("hrm_positions", {
	id: serial('id').primaryKey(),
	positionCode: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	englishName: varchar({ length: 100 }),
	department: varchar({ length: 50 }).notNull(),
	responsibilities: text(),
	keyTasks: text(),
	qualifications: text(),
	kpiIndicators: text(),
	digitalizationScore: decimal({ precision: 5, scale: 2 }).default('0'),
	digitalizationRoadmap: text(),
	status: statusEnum12('status').default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("positionCode").on(table.positionCode),
]);

export const hrmSalaryStructures = pgTable("hrm_salary_structures", {
	id: serial('id').primaryKey(),
	department: varchar({ length: 50 }).notNull(),
	level: varchar({ length: 20 }),
	baseSalaryRatioMin: decimal({ precision: 5, scale: 2 }).notNull(),
	baseSalaryRatioMax: decimal({ precision: 5, scale: 2 }).notNull(),
	performanceRatioMin: decimal({ precision: 5, scale: 2 }).notNull(),
	performanceRatioMax: decimal({ precision: 5, scale: 2 }).notNull(),
	bonusRatioMin: decimal({ precision: 5, scale: 2 }).notNull(),
	bonusRatioMax: decimal({ precision: 5, scale: 2 }).notNull(),
	benefitsRatioMin: decimal({ precision: 5, scale: 2 }).notNull(),
	benefitsRatioMax: decimal({ precision: 5, scale: 2 }).notNull(),
	effectiveDate: timestamp({ mode: 'string' }).notNull(),
	status: statusEnum12('status').default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const hrmTrainingPlans = pgTable("hrm_training_plans", {
	id: serial('id').primaryKey(),
	planCode: varchar({ length: 50 }).notNull(),
	employeeId: integer().notNull(),
	planType: planTypeEnum('planType').default('onboarding').notNull(),
	name: varchar({ length: 200 }).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	content: text(),
	stages: text(),
	status: statusEnum6('status').default('pending').notNull(),
	completionRate: integer().default(0),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("planCode").on(table.planCode),
]);

export const hrmTrainingTests = pgTable("hrm_training_tests", {
	id: serial('id').primaryKey(),
	testCode: varchar({ length: 50 }).notNull(),
	trainingPlanId: integer().notNull(),
	employeeId: integer().notNull(),
	name: varchar({ length: 200 }).notNull(),
	testType: testTypeEnum('testType').default('basic').notNull(),
	questions: text(),
	answers: text(),
	score: integer(),
	passingScore: integer().default(60),
	isPassed: smallint(),
	testedAt: timestamp({ mode: 'string' }),
	gradedById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("testCode").on(table.testCode),
]);

export const kpiAssessmentHistory = pgTable("kpi_assessment_history", {
	id: serial('id').primaryKey(),
	historyId: varchar({ length: 50 }).notNull(),
	employeeId: integer().notNull(),
	assessmentPeriod: varchar({ length: 20 }).notNull(),
	assessmentType: assessmentTypeEnum('assessmentType').notNull(),
	assessmentContent: text(),
	score: decimal({ precision: 5, scale: 2 }),
	assessedBy: integer(),
	assessedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("historyId").on(table.historyId),
]);

export const kpiCommunicationSuggestions = pgTable("kpi_communication_suggestions", {
	id: serial('id').primaryKey(),
	suggestionId: varchar({ length: 50 }).notNull(),
	employeeId: integer().notNull(),
	supervisorId: integer().notNull(),
	triggerReason: varchar({ length: 200 }).notNull(),
	communicationType: communicationTypeEnum('communicationType').notNull(),
	suggestedTime: timestamp({ mode: 'string' }),
	suggestedContent: text(),
	talkingPoints: text(),
	urgency: priorityEnum('urgency').default('medium'),
	requiresApproval: smallint().default(1),
	approvalStatus: approvalStatusEnum('approvalStatus').default('pending'),
	approvedBy: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	actualTime: timestamp({ mode: 'string' }),
	communicationNotes: text(),
	followUpActions: text(),
	effectivenessScore: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("suggestionId").on(table.suggestionId),
]);

export const kpiConfigurations = pgTable("kpi_configurations", {
	id: serial('id').primaryKey(),
	kpiId: varchar({ length: 50 }).notNull(),
	kpiName: varchar({ length: 100 }).notNull(),
	kpiCategory: kpiCategoryEnum('kpiCategory').notNull(),
	weight: decimal({ precision: 5, scale: 2 }).notNull(),
	calculationFormula: text(),
	targetValue: decimal({ precision: 10, scale: 2 }),
	unit: varchar({ length: 20 }),
	applicableRoles: text(),
	applicableDepartments: text(),
	isActive: smallint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("kpiId").on(table.kpiId),
]);

export const kpiEffectivenessTracking = pgTable("kpi_effectiveness_tracking", {
	id: serial('id').primaryKey(),
	trackingId: varchar({ length: 50 }).notNull(),
	communicationId: varchar({ length: 50 }).notNull(),
	employeeId: integer().notNull(),
	baselineScore: decimal({ precision: 5, scale: 2 }).notNull(),
	targetImprovement: decimal({ precision: 5, scale: 2 }),
	checkPoints: text(),
	actualImprovements: text(),
	finalScore: decimal({ precision: 5, scale: 2 }),
	improvementRate: decimal({ precision: 5, scale: 2 }),
	effectivenessAssessment: text(),
	furtherSuggestions: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("kpi_effectiveness_tracking_trackingId").on(table.trackingId),
]);

export const kpiEmailNotifications = pgTable("kpi_email_notifications", {
	id: serial('id').primaryKey(),
	notificationId: varchar({ length: 50 }).notNull(),
	emailType: emailTypeEnum('emailType').notNull(),
	recipientType: recipientTypeEnum('recipientType').notNull(),
	recipientId: integer().notNull(),
	recipientEmail: varchar({ length: 100 }),
	subject: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	relatedScoreId: varchar({ length: 50 }),
	requiresApproval: smallint().default(0),
	approvalStatus: approvalStatusEnum1('approvalStatus').default('not_required'),
	approvedBy: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }),
	deliveryStatus: deliveryStatusEnum('deliveryStatus').default('pending'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("kpi_email_notifications_notificationId").on(table.notificationId),
]);

export const kpiScoreRecords = pgTable("kpi_score_records", {
	id: serial('id').primaryKey(),
	scoreId: varchar({ length: 50 }).notNull(),
	employeeId: integer().notNull(),
	periodType: periodTypeEnum1('periodType').notNull(),
	periodValue: varchar({ length: 20 }).notNull(),
	totalScore: decimal({ precision: 5, scale: 2 }).notNull(),
	scoreBreakdown: text(),
	scoreLevel: scoreLevelEnum('scoreLevel').notNull(),
	comparisonData: text(),
	ranking: integer(),
	aiAnalysis: text(),
	aiSuggestions: text(),
	calculatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("scoreId").on(table.scoreId),
]);

export const laborCosts = pgTable("labor_costs", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	userId: integer().notNull(),
	workDate: timestamp({ mode: 'string' }).notNull(),
	hours: decimal({ precision: 5, scale: 2 }).notNull(),
	hourlyRate: integer().notNull(),
	totalCost: bigint({ mode: "number" }).notNull(),
	taskId: integer(),
	phaseCode: varchar({ length: 10 }),
	description: varchar({ length: 500 }),
	status: statusEnum29('status').default('pending').notNull(),
	reviewerId: integer(),
	reviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const meetingAttendees = pgTable("meeting_attendees", {
	id: serial('id').primaryKey(),
	meetingId: integer().notNull(),
	userId: integer().notNull(),
	role: roleEnum1('role').default('required').notNull(),
	responseStatus: responseStatusEnum('responseStatus').default('pending').notNull(),
	attendanceStatus: attendanceStatusEnum('attendanceStatus').default('unknown').notNull(),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const meetingReminders = pgTable("meeting_reminders", {
	id: serial('id').primaryKey(),
	meetingId: integer().notNull(),
	reminderMinutes: integer().default(30).notNull(),
	reminderType: notifyTypeEnum('reminderType').default('system').notNull(),
	isSent: smallint().default(0).notNull(),
	sentAt: timestamp({ mode: 'string' }),
	sendResult: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const meetingSchedules = pgTable("meeting_schedules", {
	id: serial('id').primaryKey(),
	typeId: integer().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	level: levelEnum1('level').default('department').notNull(),
	departmentId: integer(),
	projectId: integer(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }).notNull(),
	location: varchar({ length: 200 }),
	onlineLink: varchar({ length: 500 }),
	status: statusEnum30('status').default('scheduled').notNull(),
	organizerId: integer().notNull(),
	agenda: text(),
	minutes: text(),
	decisions: text(),
	actionItems: text(),
	isRecurring: smallint().default(0),
	recurrenceRule: varchar({ length: 200 }),
	parentId: integer(),
	reminderMinutes: integer().default(15),
	reminderSent: smallint().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const meetingTypes = pgTable("meeting_types", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 20 }).notNull(),
	level: levelEnum1('level').default('department').notNull(),
	frequency: frequencyEnum1('frequency').default('weekly').notNull(),
	defaultDuration: integer().default(60),
	defaultStartTime: varchar({ length: 5 }),
	defaultDayOfWeek: integer(),
	description: text(),
	agendaTemplate: text(),
	isActive: smallint().default(1).notNull(),
	sortOrder: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const migrationTasks = pgTable("migration_tasks", {
	id: serial('id').primaryKey(),
	moduleId: varchar({ length: 64 }).notNull(),
	moduleName: varchar({ length: 200 }).notNull(),
	sourceTable: varchar({ length: 200 }).notNull(),
	targetTable: varchar({ length: 200 }).notNull(),
	totalRecords: integer().default(0).notNull(),
	migratedRecords: integer().default(0).notNull(),
	validatedRecords: integer().default(0).notNull(),
	errorRecords: integer().default(0).notNull(),
	status: statusEnum31('status').default('pending').notNull(),
	priority: priorityEnum('priority').default('medium').notNull(),
	assigneeId: integer(),
	notes: text(),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const namingChangeImplementations = pgTable("naming_change_implementations", {
	id: serial('id').primaryKey(),
	requestId: integer().notNull(),
	phase: phaseEnum('phase').notNull(),
	executorId: integer(),
	executorName: varchar({ length: 100 }),
	startTime: timestamp({ mode: 'string' }),
	endTime: timestamp({ mode: 'string' }),
	status: statusEnum32('status').default('in_progress').notNull(),
	result: text(),
	notes: text(),
	attachments: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const namingChangeRequests = pgTable("naming_change_requests", {
	id: serial('id').primaryKey(),
	requestCode: varchar({ length: 30 }).notNull(),
	requestType: requestTypeEnum('requestType').notNull(),
	ruleType: ruleTypeEnum('ruleType').notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	reason: text().notNull(),
	impactScope: text(),
	requestorId: integer().notNull(),
	requestorName: varchar({ length: 100 }),
	requestDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: statusEnum33('status').default('pending').notNull(),
	currentApproverId: integer(),
	approverName: varchar({ length: 100 }),
	approvalDate: timestamp({ mode: 'string' }),
	approvalNotes: text(),
	oldVersion: varchar({ length: 20 }),
	newVersion: varchar({ length: 20 }),
	effectiveDate: timestamp({ mode: 'string' }),
	changeData: text(),
	attachments: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("naming_change_requests_requestCode_unique").on(table.requestCode),
]);

export const namingChangeTests = pgTable("naming_change_tests", {
	id: serial('id').primaryKey(),
	requestId: integer().notNull(),
	testerId: integer(),
	testerName: varchar({ length: 100 }),
	testDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	testEnvironment: varchar({ length: 50 }),
	testItems: text(),
	testResult: testResultEnum('testResult').notNull(),
	issues: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const namingRuleApprovers = pgTable("naming_rule_approvers", {
	id: serial('id').primaryKey(),
	userId: integer().notNull(),
	ruleType: ruleTypeEnum1('ruleType').notNull(),
	changeType: changeTypeEnum1('changeType').notNull(),
	approvalLevel: integer().default(1).notNull(),
	isActive: smallint().default(1).notNull(),
	remark: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const namingVersions = pgTable("naming_versions", {
	id: serial('id').primaryKey(),
	versionCode: varchar({ length: 20 }).notNull(),
	versionName: varchar({ length: 100 }),
	ruleType: ruleTypeEnum('ruleType').notNull(),
	effectiveDate: timestamp({ mode: 'string' }).notNull(),
	changeType: changeTypeEnum2('changeType').notNull(),
	changeDescription: text(),
	changeRequestId: integer(),
	isCurrent: smallint().default(0).notNull(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("naming_versions_versionCode_unique").on(table.versionCode),
]);

export const notebookEntries = pgTable("notebook_entries", {
	id: serial('id').primaryKey(),
	notebookId: bigint("notebook_id", { mode: "number" }).notNull(),
	entryType: entryTypeEnum('entryType').notNull(),
	content: text(),
	fileUrl: varchar("file_url", { length: 500 }),
	fileName: varchar("file_name", { length: 200 }),
	fileType: varchar("file_type", { length: 50 }),
	fileSize: integer("file_size"),
	voiceDuration: integer("voice_duration"),
	voiceTranscript: text("voice_transcript"),
	ocrResult: text("ocr_result"),
	createdBy: bigint("created_by", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	isAiProcessed: smallint("is_ai_processed").default(0),
},
(table) => [
	index("idx_notebook").on(table.notebookId),
	index("notebook_entries_idx_created_by").on(table.createdBy),
]);

export const notificationRecipients = pgTable("notification_recipients", {
	id: serial('id').primaryKey(),
	notificationLogId: integer().notNull(),
	userId: integer().notNull(),
	userName: varchar({ length: 100 }),
	channel: channelEnum('channel').notNull(),
	status: statusEnum34('status').default('pending').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	deliveredAt: timestamp({ mode: 'string' }),
	readAt: timestamp({ mode: 'string' }),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const performanceReviewEmailLogs = pgTable("performance_review_email_logs", {
	id: serial('id').primaryKey(),
	reminderId: integer().notNull(),
	employeeId: integer().notNull(),
	emailSubject: varchar({ length: 200 }).notNull(),
	recipients: json().notNull(),
	emailContent: text(),
	sendStatus: sendStatusEnum('sendStatus').default('pending').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	errorMessage: text(),
	retryCount: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const permissionChangeHistory = pgTable("permission_change_history", {
	id: serial('id').primaryKey(),
	changeType: changeTypeEnum3('changeType').notNull(),
	targetUserId: integer("target_user_id"),
	targetRoleId: varchar("target_role_id", { length: 50 }),
	targetDepartmentId: varchar("target_department_id", { length: 50 }),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedBy: integer("changed_by").notNull(),
	changedByName: varchar("changed_by_name", { length: 100 }),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_target_user_id").on(table.targetUserId),
	index("idx_changed_by").on(table.changedBy),
	index("permission_change_history_idx_created_at").on(table.createdAt),
]);

export const permissionGroups = pgTable("permission_groups", {
	id: serial('id').primaryKey(),
	groupCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	type: typeEnum7('type').notNull(),
	departmentId: varchar({ length: 50 }),
	description: text(),
	isActive: smallint().default(1).notNull(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("groupCode").on(table.groupCode),
]);

export const planningDataSources = pgTable("planning_data_sources", {
	id: serial('id').primaryKey(),
	sourceId: varchar({ length: 50 }).notNull(),
	planId: varchar({ length: 50 }).notNull(),
	sourceType: sourceTypeEnum1('sourceType').notNull(),
	sourceReferenceId: varchar({ length: 50 }),
	sourceSummary: text(),
	weight: decimal({ precision: 3, scale: 2 }).default('1.00'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("sourceId").on(table.sourceId),
]);

export const planningExecutionNotes = pgTable("planning_execution_notes", {
	id: serial('id').primaryKey(),
	noteId: varchar({ length: 50 }).notNull(),
	planId: varchar({ length: 50 }).notNull(),
	originalPlan: text(),
	actualExecution: text(),
	deviationReason: text(),
	lessonsLearned: text(),
	suggestions: text(),
	impactAssessment: text(),
	asNewPlanInput: smallint().default(1),
	createdBy: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("noteId").on(table.noteId),
]);

export const planningPlans = pgTable("planning_plans", {
	id: serial('id').primaryKey(),
	planId: varchar({ length: 50 }).notNull(),
	planType: planTypeEnum1('planType').notNull(),
	planPeriod: varchar({ length: 20 }).notNull(),
	ownerId: integer().notNull(),
	departmentId: integer(),
	parentPlanId: varchar({ length: 50 }),
	title: varchar({ length: 200 }).notNull(),
	objectives: text(),
	tasks: text(),
	resources: text(),
	risks: text(),
	status: statusEnum35('status').default('draft').notNull(),
	approvalStatus: approvalStatusEnum1('approvalStatus').default('not_required'),
	approvedBy: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date({ mode: 'string' }),
	completionRate: decimal({ precision: 5, scale: 2 }).default('0'),
	aiSummary: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("planId").on(table.planId),
]);

export const planningTasks = pgTable("planning_tasks", {
	id: serial('id').primaryKey(),
	taskId: varchar({ length: 50 }).notNull(),
	planId: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	priority: priorityEnum2('priority').default('P2').notNull(),
	taskType: taskTypeEnum1('taskType').default('work').notNull(),
	sourceType: sourceTypeEnum2('sourceType').default('manual'),
	sourceId: varchar({ length: 50 }),
	ownerId: integer().notNull(),
	collaborators: text(),
	estimatedHours: decimal({ precision: 6, scale: 2 }),
	actualHours: decimal({ precision: 6, scale: 2 }),
	dueDate: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	status: statusEnum36('status').default('pending').notNull(),
	progress: integer().default(0),
	deliverables: text(),
	dependencies: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("planning_tasks_taskId").on(table.taskId),
]);

export const planningTrackingRecords = pgTable("planning_tracking_records", {
	id: serial('id').primaryKey(),
	trackingId: varchar({ length: 50 }).notNull(),
	taskId: varchar({ length: 50 }).notNull(),
	trackingSource: trackingSourceEnum('trackingSource').notNull(),
	sourceReference: varchar({ length: 200 }),
	trackingContent: text().notNull(),
	progressUpdate: integer(),
	evidenceFiles: text(),
	recordedBy: integer().notNull(),
	recordedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("planning_tracking_records_trackingId").on(table.trackingId),
]);

export const processNotebooks = pgTable("process_notebooks", {
	id: serial('id').primaryKey(),
	processType: varchar("process_type", { length: 50 }).notNull(),
	processId: varchar("process_id", { length: 100 }).notNull(),
	processStep: varchar("process_step", { length: 50 }),
	title: varchar({ length: 200 }),
	createdBy: bigint("created_by", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	status: statusEnum37('status').default('active'),
},
(table) => [
	index("idx_process").on(table.processType, table.processId),
	index("process_notebooks_idx_created_by").on(table.createdBy),
]);

export const processTemplates = pgTable("process_templates", {
	id: serial('id').primaryKey(),
	templateId: varchar({ length: 50 }).notNull(),
	templateName: varchar({ length: 200 }).notNull(),
	workpieceCategory: workpieceCategoryEnum('workpieceCategory').default('other'),
	equipmentSeries: varchar({ length: 20 }),
	processFlow: text().notNull(),
	defaultParameters: text(),
	applicableConditions: text(),
	isActive: smallint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("process_templates_idx_workpiece_category").on(table.workpieceCategory),
	index("idx_equipment_series").on(table.equipmentSeries),
	index("templateId").on(table.templateId),
]);

export const projectAccessPermissions = pgTable("project_access_permissions", {
	id: serial('id').primaryKey(),
	permissionId: varchar({ length: 50 }).notNull(),
	accountId: varchar({ length: 50 }).notNull(),
	projectId: integer().notNull(),
	accessLevel: accessLevelEnum('accessLevel').default('view'),
	allowedModules: text(),
	dataScope: text(),
	grantedAt: timestamp({ mode: 'string' }).defaultNow(),
	expiresAt: timestamp({ mode: 'string' }),
	grantedBy: integer(),
},
(table) => [
	index("permissionId").on(table.permissionId),
]);

export const projectBudgets = pgTable("project_budgets", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	categoryId: integer().notNull(),
	budgetYear: integer().notNull(),
	budgetMonth: integer(),
	budgetAmount: bigint({ mode: "number" }).notNull(),
	usedAmount: bigint({ mode: "number" }).notNull(),
	version: varchar({ length: 20 }).default('v1'),
	status: statusEnum38('status').default('draft').notNull(),
	approverId: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectConversionHistory = pgTable("project_conversion_history", {
	id: serial('id').primaryKey(),
	tempProjectCode: varchar({ length: 20 }).notNull(),
	formalProjectCode: varchar({ length: 20 }).notNull(),
	conversionDate: timestamp({ mode: 'string' }).notNull(),
	contractNo: varchar({ length: 50 }),
	numberingVersion: varchar({ length: 20 }).notNull(),
	remark: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectDigitalTwins = pgTable("project_digital_twins", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	twinCode: varchar({ length: 50 }).notNull(),
	projectType: projectTypeEnum('projectType').default('standard'),
	currentPhase: varchar({ length: 50 }),
	healthScore: integer().default(100),
	progressModel: text(),
	costModel: text(),
	qualityModel: text(),
	resourceModel: text(),
	riskModel: text(),
	deliveryModel: text(),
	syncStatus: syncStatusEnum('syncStatus').default('synced'),
	lastSyncedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("twinCode").on(table.twinCode),
]);

export const projectDocuments = pgTable("project_documents", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	phaseCode: varchar({ length: 10 }),
	name: varchar({ length: 200 }).notNull(),
	type: typeEnum8('type').default('other').notNull(),
	version: varchar({ length: 20 }),
	filePath: text(),
	fileSize: integer(),
	mimeType: varchar({ length: 100 }),
	uploaderId: integer(),
	description: text(),
	status: statusEnum39('status').default('draft').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectGates = pgTable("project_gates", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	phaseCode: varchar({ length: 10 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	status: statusEnum40('status').default('pending').notNull(),
	plannedDate: timestamp({ mode: 'string' }),
	actualDate: timestamp({ mode: 'string' }),
	approverId: integer(),
	approvalComment: text(),
	attachments: text(),
	checklist: text(),
	checklistCompleted: integer().default(0),
	checklistTotal: integer().default(0),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectKnowledgeBase = pgTable("project_knowledge_base", {
	id: serial('id').primaryKey(),
	twinId: integer(),
	projectId: integer(),
	knowledgeType: knowledgeTypeEnum('knowledgeType').notNull(),
	category: varchar({ length: 100 }),
	title: varchar({ length: 200 }).notNull(),
	content: text(),
	context: text(),
	applicability: text(),
	useCount: integer().default(0),
	rating: decimal({ precision: 3, scale: 2 }),
	contributedBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const projectMilestones = pgTable("project_milestones", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	phaseCode: varchar({ length: 10 }),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	type: typeEnum9('type').default('deliverable').notNull(),
	plannedDate: timestamp({ mode: 'string' }),
	actualDate: timestamp({ mode: 'string' }),
	status: statusEnum41('status').default('pending').notNull(),
	ownerId: integer(),
	weight: integer().default(1),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectNumberCounters = pgTable("project_number_counters", {
	id: serial('id').primaryKey(),
	prefix: varchar({ length: 10 }).notNull(),
	currentMax: integer().default(0).notNull(),
	nextAvailable: integer().default(1).notNull(),
	formatDigits: integer().default(3).notNull(),
	numberingVersion: varchar({ length: 20 }).default('V1.0').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("project_number_counters_prefix_unique").on(table.prefix),
]);

export const projectOptimizationSuggestions = pgTable("project_optimization_suggestions", {
	id: serial('id').primaryKey(),
	twinId: integer().notNull(),
	suggestionType: suggestionTypeEnum1('suggestionType').notNull(),
	priority: priorityEnum('priority').default('medium'),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	expectedImpact: text(),
	implementationEffort: implementationEffortEnum('implementationEffort').default('medium'),
	supportingData: text(),
	status: statusEnum42('status').default('pending'),
	decisionBy: integer(),
	decisionReason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	decidedAt: timestamp({ mode: 'string' }),
});

export const projectPhases = pgTable("project_phases", {
	id: serial('id').primaryKey(),
	phaseCode: varchar({ length: 10 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameEn: varchar({ length: 100 }),
	description: text(),
	sequence: integer().notNull(),
	isKeyPhase: isKeyPersonEnum('isKeyPhase').default('no'),
	defaultDuration: integer(),
	color: varchar({ length: 20 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projectPredictions = pgTable("project_predictions", {
	id: serial('id').primaryKey(),
	twinId: integer().notNull(),
	predictionType: predictionTypeEnum('predictionType').notNull(),
	predictionModel: varchar({ length: 100 }),
	inputData: text(),
	predictionResult: text(),
	confidenceLevel: decimal({ precision: 3, scale: 2 }),
	actualResult: text(),
	accuracyScore: decimal({ precision: 3, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	validatedAt: timestamp({ mode: 'string' }),
});

export const projectRiskAlerts = pgTable("project_risk_alerts", {
	id: serial('id').primaryKey(),
	twinId: integer().notNull(),
	alertCode: varchar({ length: 50 }).notNull(),
	riskCategory: riskCategoryEnum('riskCategory').notNull(),
	severity: priorityEnum1('severity').default('medium'),
	description: text(),
	triggerConditions: text(),
	currentIndicators: text(),
	recommendedActions: text(),
	status: statusEnum43('status').default('active'),
	acknowledgedBy: integer(),
	resolvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("alertCode").on(table.alertCode),
]);

export const projectStateSnapshots = pgTable("project_state_snapshots", {
	id: serial('id').primaryKey(),
	twinId: integer().notNull(),
	snapshotType: snapshotTypeEnum('snapshotType').default('daily'),
	snapshotData: text(),
	deltaFromPrevious: text(),
	keyMetrics: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const projectTasks = pgTable("project_tasks", {
	id: serial('id').primaryKey(),
	taskCode: varchar({ length: 32 }),
	projectId: integer().notNull(),
	milestoneId: integer(),
	phaseCode: varchar({ length: 10 }),
	parentTaskId: integer(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	type: typeEnum10('type').default('task').notNull(),
	priority: priorityEnum1('priority').default('medium').notNull(),
	status: statusEnum44('status').default('backlog').notNull(),
	plannedStartDate: timestamp({ mode: 'string' }),
	plannedEndDate: timestamp({ mode: 'string' }),
	actualStartDate: timestamp({ mode: 'string' }),
	actualEndDate: timestamp({ mode: 'string' }),
	estimatedHours: integer(),
	actualHours: integer(),
	completionPercent: integer().default(0),
	assigneeId: integer(),
	acceptanceCriteria: text(),
	attachments: text(),
	remark: text(),
	jiandaoyunId: varchar({ length: 64 }),
	safetyChecklistCompleted: boolean('safety_checklist_completed').default(false),
	taskCategory: varchar('task_category', { length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("project_tasks_taskCode_unique").on(table.taskCode),
]);

export const projectTeamMembers = pgTable("project_team_members", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	userId: integer().notNull(),
	role: roleEnum2('role').default('member').notNull(),
	responsibility: text(),
	joinedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	leftAt: timestamp({ mode: 'string' }),
	status: statusEnum12('status').default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
	id: serial('id').primaryKey(),
	projectCode: varchar({ length: 32 }),
	name: varchar({ length: 200 }).notNull(),
	shortName: varchar({ length: 100 }),
	customerId: integer(),
	opportunityId: integer(),
	type: typeEnum11('type').default('standard').notNull(),
	status: statusEnum45('status').default('draft').notNull(),
	currentPhase: varchar({ length: 10 }).default('M0'),
	priority: priorityEnum1('priority').default('medium').notNull(),
	plannedStartDate: timestamp({ mode: 'string' }),
	plannedEndDate: timestamp({ mode: 'string' }),
	actualStartDate: timestamp({ mode: 'string' }),
	actualEndDate: timestamp({ mode: 'string' }),
	budget: integer(),
	actualCost: integer(),
	contractAmount: integer(),
	managerId: integer(),
	description: text(),
	objectives: text(),
	scope: text(),
	riskLevel: riskLevelEnum('riskLevel').default('medium'),
	healthStatus: healthStatusEnum('healthStatus').default('green'),
	completionPercent: integer().default(0),
	remark: text(),
	jiandaoyunId: varchar({ length: 64 }),
	version: integer('version').default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projects_projectCode_unique").on(table.projectCode),
]);

export const quotationLearningRecords = pgTable("quotation_learning_records", {
	id: serial('id').primaryKey(),
	learningId: varchar({ length: 50 }).notNull(),
	quotationId: varchar({ length: 50 }).notNull(),
	learningType: learningTypeEnum('learningType').notNull(),
	learningContent: text().notNull(),
	keyFindings: text(),
	priceDeviationAnalysis: text(),
	isApplied: smallint().default(0),
	appliedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_quotation_id").on(table.quotationId),
	index("quotation_learning_records_idx_learning_type").on(table.learningType),
	index("quotation_learning_records_learningId").on(table.learningId),
]);

export const quotationRecommendations = pgTable("quotation_recommendations", {
	id: serial('id').primaryKey(),
	recommendationId: varchar({ length: 50 }).notNull(),
	userId: integer().notNull(),
	solutionId: varchar({ length: 50 }),
	inputParameters: text().notNull(),
	costBreakdown: text().notNull(),
	priceRecommendations: text().notNull(),
	selectedStrategy: varchar({ length: 50 }),
	finalQuotationId: varchar({ length: 50 }),
	feedbackScore: integer(),
	feedbackComment: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("quotation_recommendations_idx_user_id").on(table.userId),
	index("quotation_recommendations_idx_created_at").on(table.createdAt),
	index("quotation_recommendations_recommendationId").on(table.recommendationId),
]);

export const salaryCalculations = pgTable("salary_calculations", {
	id: serial('id').primaryKey(),
	calculationCode: varchar({ length: 50 }).notNull(),
	employeeId: integer(),
	candidateId: integer(),
	department: varchar({ length: 50 }).notNull(),
	positionGrade: varchar({ length: 20 }),
	calculationType: calculationTypeEnum('calculationType').notNull(),
	baseSalary: decimal({ precision: 12, scale: 2 }).notNull(),
	performanceSalary: decimal({ precision: 12, scale: 2 }),
	bonus: decimal({ precision: 12, scale: 2 }),
	benefits: decimal({ precision: 12, scale: 2 }),
	monthlyTotal: decimal({ precision: 12, scale: 2 }).notNull(),
	annualTotal: decimal({ precision: 12, scale: 2 }).notNull(),
	calculationParams: json(),
	salaryBreakdown: json(),
	marketComparison: marketComparisonEnum('marketComparison'),
	remarks: text(),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("salary_calculations_calculationCode_unique").on(table.calculationCode),
]);

export const scheduledTasks = pgTable("scheduled_tasks", {
	id: serial('id').primaryKey(),
	taskCode: varchar({ length: 50 }).notNull(),
	taskName: varchar({ length: 100 }).notNull(),
	taskType: taskTypeEnum2('taskType').notNull(),
	cronExpression: varchar({ length: 50 }).notNull(),
	taskConfig: json(),
	isEnabled: smallint().default(1).notNull(),
	lastRunAt: timestamp({ mode: 'string' }),
	nextRunAt: timestamp({ mode: 'string' }),
	lastRunStatus: lastRunStatusEnum('lastRunStatus'),
	lastRunResult: text(),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("scheduled_tasks_taskCode_unique").on(table.taskCode),
]);

export const sensitiveDataAccessLog = pgTable("sensitive_data_access_log", {
	id: serial('id').primaryKey(),
	userId: integer("user_id").notNull(),
	userName: varchar("user_name", { length: 100 }),
	dataType: varchar("data_type", { length: 50 }).notNull(),
	dataId: varchar("data_id", { length: 100 }),
	action: varchar({ length: 50 }).notNull(),
	ipAddress: varchar("ip_address", { length: 50 }),
	userAgent: text("user_agent"),
	requestPath: varchar("request_path", { length: 500 }),
	requestData: text("request_data"),
	responseSummary: text("response_summary"),
	accessResult: accessResultEnum('accessResult').default('allowed'),
	denialReason: text("denial_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("sensitive_data_access_log_idx_user_id").on(table.userId),
	index("idx_data_type").on(table.dataType),
	index("sensitive_data_access_log_idx_created_at").on(table.createdAt),
]);

export const seoConfigurations = pgTable("seo_configurations", {
	id: serial('id').primaryKey(),
	seoId: varchar({ length: 50 }).notNull(),
	pageType: varchar({ length: 50 }).notNull(),
	pageId: varchar({ length: 50 }),
	title: varchar({ length: 200 }),
	description: varchar({ length: 500 }),
	keywords: text(),
	canonicalUrl: varchar({ length: 500 }),
	ogTitle: varchar({ length: 200 }),
	ogDescription: varchar({ length: 500 }),
	ogImage: varchar({ length: 500 }),
	structuredData: text(),
	status: statusEnum12('status').default('active'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("seoId").on(table.seoId),
]);

export const smartDevices = pgTable("smart_devices", {
	id: serial('id').primaryKey(),
	deviceId: varchar({ length: 50 }).notNull(),
	deviceType: deviceTypeEnum('deviceType').notNull(),
	deviceName: varchar({ length: 100 }).notNull(),
	manufacturer: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	protocol: protocolEnum('protocol').notNull(),
	endpoint: varchar({ length: 500 }),
	credentialsEncrypted: text(),
	capabilities: text(),
	status: statusEnum46('status').default('offline'),
	lastHeartbeat: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("deviceId").on(table.deviceId),
]);

export const solutionLearningRecords = pgTable("solution_learning_records", {
	id: serial('id').primaryKey(),
	learningId: varchar({ length: 50 }).notNull(),
	solutionId: varchar({ length: 50 }).notNull(),
	projectNo: varchar({ length: 50 }),
	learningType: learningTypeEnum1('learningType').notNull(),
	learningContent: text().notNull(),
	keyFindings: text(),
	isApplied: smallint().default(0),
	appliedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_solution_id").on(table.solutionId),
	index("solution_learning_records_idx_learning_type").on(table.learningType),
	index("solution_learning_records_learningId").on(table.learningId),
]);

export const solutionRecommendations = pgTable("solution_recommendations", {
	id: serial('id').primaryKey(),
	recommendationId: varchar({ length: 50 }).notNull(),
	userId: integer().notNull(),
	inputParameters: text().notNull(),
	recommendations: text().notNull(),
	selectedSolutionId: varchar({ length: 50 }),
	feedbackScore: integer(),
	feedbackComment: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("solution_recommendations_idx_user_id").on(table.userId),
	index("solution_recommendations_idx_created_at").on(table.createdAt),
	index("solution_recommendations_recommendationId").on(table.recommendationId),
]);

export const specialApprovals = pgTable("special_approvals", {
	id: serial('id').primaryKey(),
	approvalId: varchar({ length: 50 }).notNull(),
	accountId: varchar({ length: 50 }).notNull(),
	approvalType: varchar({ length: 50 }).notNull(),
	approvalScope: text(),
	conditions: text(),
	requestedAt: timestamp({ mode: 'string' }).defaultNow(),
	requestedBy: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	approvedBy: integer(),
	expiresAt: timestamp({ mode: 'string' }),
	status: statusEnum47('status').default('pending'),
},
(table) => [
	index("approvalId").on(table.approvalId),
]);

export const taskNotifications = pgTable("task_notifications", {
	id: serial('id').primaryKey(),
	notificationId: varchar({ length: 50 }).notNull(),
	taskId: varchar({ length: 50 }).notNull(),
	recipientId: integer().notNull(),
	channel: channelEnum1('channel').notNull(),
	subject: varchar({ length: 200 }),
	content: text(),
	priority: priorityEnum3('priority').default('medium'),
	scheduledAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }),
	confirmationRequired: smallint().default(0),
	confirmationDeadline: timestamp({ mode: 'string' }),
	confirmedAt: timestamp({ mode: 'string' }),
	confirmedBy: integer(),
	status: statusEnum48('status').default('pending'),
	retryCount: integer().default(0),
	lastError: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
},
(table) => [
	index("task_notifications_notificationId").on(table.notificationId),
]);

export const teamsMeetingConfigs = pgTable("teams_meeting_configs", {
	id: serial('id').primaryKey(),
	meetingCode: varchar({ length: 50 }).notNull(),
	interviewRecordId: integer(),
	candidateId: integer().notNull(),
	subject: varchar({ length: 200 }).notNull(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	durationMinutes: integer().default(60),
	meetingUrl: varchar({ length: 500 }),
	teamsMeetingId: varchar({ length: 100 }),
	meetingPassword: varchar({ length: 50 }),
	attendees: json(),
	status: statusEnum30('status').default('scheduled').notNull(),
	recordingStatus: recordingStatusEnum('recordingStatus').default('not_started'),
	recordingUrl: varchar({ length: 500 }),
	transcriptText: text(),
	aiAnalysis: json(),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("teams_meeting_configs_meetingCode_unique").on(table.meetingCode),
]);

export const trainingAssessmentResults = pgTable("training_assessment_results", {
	id: serial('id').primaryKey(),
	assessmentId: integer().notNull(),
	participantId: integer().notNull(),
	score: integer().notNull(),
	isPassed: smallint().default(0).notNull(),
	answers: text(),
	feedback: text(),
	completedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const trainingAssessments = pgTable("training_assessments", {
	id: serial('id').primaryKey(),
	trainingId: integer().notNull(),
	assessmentType: assessmentTypeEnum1('assessmentType').default('quiz').notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	totalScore: integer().default(100),
	passingScore: integer().default(60),
	questions: text(),
	status: statusEnum5('status').default('draft').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const trainingCertificates = pgTable("training_certificates", {
	id: serial('id').primaryKey(),
	trainingId: integer().notNull(),
	participantId: integer().notNull(),
	certificateNo: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	issueDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	expiryDate: timestamp({ mode: 'string' }),
	status: statusEnum49('status').default('active').notNull(),
	fileUrl: varchar({ length: 500 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const trainingParticipants = pgTable("training_participants", {
	id: serial('id').primaryKey(),
	trainingId: integer().notNull(),
	userId: integer().notNull(),
	registrationStatus: registrationStatusEnum('registrationStatus').default('registered').notNull(),
	attendanceStatus: attendanceStatusEnum1('attendanceStatus').default('unknown').notNull(),
	score: integer(),
	passed: smallint(),
	certificateNo: varchar({ length: 100 }),
	certificateExpiry: timestamp({ mode: 'string' }),
	feedbackRating: integer(),
	feedback: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const trainingPlans = pgTable("training_plans", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 200 }).notNull(),
	code: varchar({ length: 50 }),
	type: typeEnum12('type').default('internal').notNull(),
	category: categoryEnum3('category').default('technical').notNull(),
	description: text(),
	objectives: text(),
	trainerId: integer(),
	externalTrainer: varchar({ length: 100 }),
	trainingOrg: varchar({ length: 200 }),
	plannedStartDate: timestamp({ mode: 'string' }),
	plannedEndDate: timestamp({ mode: 'string' }),
	actualStartDate: timestamp({ mode: 'string' }),
	actualEndDate: timestamp({ mode: 'string' }),
	durationHours: integer(),
	location: varchar({ length: 200 }),
	budget: bigint({ mode: "number" }),
	actualCost: bigint({ mode: "number" }),
	maxParticipants: integer(),
	status: statusEnum50('status').default('draft').notNull(),
	materialsUrl: varchar({ length: 500 }),
	assessmentMethod: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
	id: serial('id').primaryKey(),
	userId: integer("user_id").notNull(),
	roleId: varchar("role_id", { length: 50 }).notNull(),
	departmentId: varchar("department_id", { length: 50 }),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignedBy: integer("assigned_by"),
	isActive: smallint("is_active").default(1),
},
(table) => [
	index("user_roles_idx_user_id").on(table.userId),
	index("idx_role_id").on(table.roleId),
]);

export const users = pgTable("users", {
	id: serial('id').primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: roleEnum3('role').default('user').notNull(),
	languagePreference: languagePreferenceEnum('languagePreference').default('zh'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export const webhookConfigs = pgTable("webhook_configs", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	type: typeEnum13('type').notNull(),
	webhookUrl: text().notNull(),
	enabled: smallint().default(1).notNull(),
	description: text(),
	triggerEvents: text(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	maxRetries: integer().default(3).notNull(),
	retryIntervalSeconds: integer().default(60).notNull(),
	useExponentialBackoff: smallint().default(1).notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
	id: serial('id').primaryKey(),
	webhookId: integer().notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	payload: text(),
	response: text(),
	statusCode: integer(),
	success: smallint().default(0).notNull(),
	errorMessage: text(),
	sentAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	retryCount: integer().default(0).notNull(),
	maxRetries: integer().default(3).notNull(),
	nextRetryAt: timestamp({ mode: 'string' }),
	retryStatus: retryStatusEnum('retryStatus').default('pending').notNull(),
});

export const webhookTemplates = pgTable("webhook_templates", {
	id: serial('id').primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	webhookType: typeEnum13('webhookType').notNull(),
	titleTemplate: text().notNull(),
	contentTemplate: text().notNull(),
	availableVariables: text(),
	isDefault: smallint().default(0).notNull(),
	createdBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const webhookTriggerConditions = pgTable("webhook_trigger_conditions", {
	id: serial('id').primaryKey(),
	webhookId: integer().notNull(),
	field: varchar({ length: 100 }).notNull(),
	operator: varchar({ length: 20 }).notNull(),
	value: text().notNull(),
	logicOperator: varchar({ length: 10 }).default('AND'),
	sortOrder: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});


// ==================== FINDIQ知识转移相关表 (v2.6.1) ====================

// 服务任务表 - 支持团队协作和客户确认
export const serviceTasks = pgTable("service_tasks", {
	id: serial('id').primaryKey(),
	taskCode: varchar("task_code", { length: 50 }).notNull(),
	taskType: taskTypeEnum3('taskType').notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	customerId: integer("customer_id"),
	equipmentId: integer("equipment_id"),
	projectId: integer("project_id"),
	assigneeId: integer("assignee_id"),
	supervisorId: integer("supervisor_id"),
	teamMembers: json("team_members"),
	priority: priorityEnum5('priority').default('medium'),
	status: statusEnum51('status').default('draft'),
	customerConfirmationStatus: customerConfirmationStatusEnum('customerConfirmationStatus').default('pending'),
	scheduledStartDate: timestamp("scheduled_start_date", { mode: 'string' }),
	scheduledEndDate: timestamp("scheduled_end_date", { mode: 'string' }),
	actualStartDate: timestamp("actual_start_date", { mode: 'string' }),
	actualEndDate: timestamp("actual_end_date", { mode: 'string' }),
	estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
	actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
	location: varchar({ length: 500 }),
	notes: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("service_tasks_task_code_unique").on(table.taskCode),
	index("service_tasks_customer_id_idx").on(table.customerId),
	index("service_tasks_assignee_id_idx").on(table.assigneeId),
	index("service_tasks_supervisor_id_idx").on(table.supervisorId),
]);

// 出差记录表 - 支持地理定位和报销关联
export const travelRecords = pgTable("travel_records", {
	id: serial('id').primaryKey(),
	recordCode: varchar("record_code", { length: 50 }).notNull(),
	employeeId: integer("employee_id").notNull(),
	travelPlanId: integer("travel_plan_id"),
	purpose: varchar({ length: 500 }).notNull(),
	destination: varchar({ length: 500 }).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	status: statusEnum52('status').default('planned'),
	clockInGeo: json("clock_in_geo"),
	commuteArrangements: json("commute_arrangements"),
	expenseClaimsId: integer("expense_claims_id"),
	transportationType: transportationTypeEnum('transportationType'),
	accommodationInfo: json("accommodation_info"),
	dailyAllowance: decimal("daily_allowance", { precision: 10, scale: 2 }),
	totalBudget: decimal("total_budget", { precision: 10, scale: 2 }),
	actualExpense: decimal("actual_expense", { precision: 10, scale: 2 }),
	approvalStatus: statusEnum29('approvalStatus').default('pending'),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("travel_records_record_code_unique").on(table.recordCode),
	index("travel_records_employee_id_idx").on(table.employeeId),
	index("travel_records_expense_claims_id_idx").on(table.expenseClaimsId),
]);

// 配件目录表 - 支持分级定价和编码规则
export const partsCatalog = pgTable("parts_catalog", {
	id: serial('id').primaryKey(),
	partCode: varchar("part_code", { length: 50 }).notNull(),
	partName: varchar("part_name", { length: 200 }).notNull(),
	category: varchar({ length: 100 }),
	subcategory: varchar({ length: 100 }),
	description: text(),
	specifications: json(),
	unitOfMeasure: varchar("unit_of_measure", { length: 20 }),
	basePrice: decimal("base_price", { precision: 10, scale: 2 }),
	costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
	clientTierPrices: json("client_tier_prices"),
	partCodeRules: json("part_code_rules"),
	supplierId: integer("supplier_id"),
	leadTimeDays: integer("lead_time_days"),
	minOrderQuantity: integer("min_order_quantity").default(1),
	stockQuantity: integer("stock_quantity").default(0),
	reorderLevel: integer("reorder_level").default(0),
	compatibleEquipment: json("compatible_equipment"),
	imageUrl: varchar("image_url", { length: 500 }),
	isActive: smallint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("parts_catalog_part_code_unique").on(table.partCode),
	index("parts_catalog_category_idx").on(table.category),
]);

// 知识库表 - 支持分级访问控制
export const knowledgeBase = pgTable("knowledge_base", {
	id: serial('id').primaryKey(),
	knowledgeCode: varchar("knowledge_code", { length: 50 }).notNull(),
	title: varchar({ length: 300 }).notNull(),
	category: varchar({ length: 100 }),
	subcategory: varchar({ length: 100 }),
	contentType: contentTypeEnum1('contentType').default('article'),
	content: text(),
	summary: text(),
	accessLevel: accessLevelEnum1('accessLevel').default('public'),
	equipmentIds: json("equipment_ids"),
	productSeries: varchar("product_series", { length: 100 }),
	tags: json(),
	attachments: json(),
	viewCount: integer("view_count").default(0),
	likeCount: integer("like_count").default(0),
	authorId: integer("author_id"),
	reviewerId: integer("reviewer_id"),
	reviewStatus: reviewStatusEnum('reviewStatus').default('draft'),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	version: varchar({ length: 20 }).default('1.0'),
	isActive: smallint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("knowledge_base_knowledge_code_unique").on(table.knowledgeCode),
	index("knowledge_base_access_level_idx").on(table.accessLevel),
	index("knowledge_base_category_idx").on(table.category),
]);

// 报销申请表 - 已扩展支持出差辅助系统 v4.5.0
export const expenseClaims = pgTable("expense_claims", {
	id: serial('id').primaryKey(),
	claimCode: varchar("claim_code", { length: 50 }).notNull(),
	submitterId: integer("submitter_id").notNull(),
	travelRecordId: integer("travel_record_id"),
	tripRequestId: integer("trip_request_id"), // 关联出差申请
	projectId: integer("project_id"), // 关联项目
	customerId: integer("customer_id"), // 关联客户
	departmentId: integer("department_id"),
	claimType: claimTypeEnum('claimType').notNull(),
	claimTitle: varchar("claim_title", { length: 200 }),
	description: text("description"),
	totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('CNY'),
	exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
	localAmount: decimal("local_amount", { precision: 12, scale: 2 }), // 本币金额
	items: json(),
	receipts: json(),
	policyCompliant: smallint("policy_compliant").default(1), // 是否符合政策
	policyViolations: text("policy_violations"), // JSON: 政策违规详情
	status: statusEnum53('status').default('draft'),
	aiAuditResult: json("ai_audit_result"),
	aiAuditScore: integer("ai_audit_score"), // AI审计分数 0-100
	aiAuditFlags: text("ai_audit_flags"), // JSON: AI标记的异常
	aiAnomalyRate: decimal("ai_anomaly_rate", { precision: 5, scale: 2 }),
	requiresManualReview: smallint("requires_manual_review").default(0),
	approvalChain: text("approval_chain"), // JSON: 审批链
	currentApprover: integer("current_approver"),
	reviewerId: integer("reviewer_id"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewNotes: text("review_notes"),
	managerApprovedAt: timestamp("manager_approved_at", { mode: 'string' }),
	managerApprovedBy: integer("manager_approved_by"),
	financeReviewedAt: timestamp("finance_reviewed_at", { mode: 'string' }),
	financeReviewedBy: integer("finance_reviewed_by"),
	paymentApprovedAt: timestamp("payment_approved_at", { mode: 'string' }),
	paymentApprovedBy: integer("payment_approved_by"),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	paymentReference: varchar("payment_reference", { length: 100 }),
	paymentMethod: varchar("payment_method", { length: 50 }),
	rejectionReason: text("rejection_reason"),
	notes: text("notes"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("expense_claims_claim_code_unique").on(table.claimCode),
	index("expense_claims_submitter_id_idx").on(table.submitterId),
	index("expense_claims_travel_record_id_idx").on(table.travelRecordId),
	index("expense_claims_trip_request_id_idx").on(table.tripRequestId),
]);

// 增值订单表 - 服务报告触发的增值销售
export const valueAddedOrders = pgTable("value_added_orders", {
	id: serial('id').primaryKey(),
	orderCode: varchar("order_code", { length: 50 }).notNull(),
	status: statusEnum54('status').default('draft'),
	sourceReportId: integer("source_report_id"),
	triggerKeyword: varchar("trigger_keyword", { length: 100 }),
	triggerContext: text("trigger_context"),
	items: json(),
	customerId: integer("customer_id"),
	customerContactId: integer("customer_contact_id"),
	salesRepId: integer("sales_rep_id"),
	totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
	currency: varchar({ length: 10 }).default('CNY'),
	confirmationEmailSent: smallint("confirmation_email_sent").default(0),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	confirmedBy: varchar("confirmed_by", { length: 100 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("value_added_orders_order_code_unique").on(table.orderCode),
	index("value_added_orders_customer_id_idx").on(table.customerId),
	index("value_added_orders_source_report_id_idx").on(table.sourceReportId),
]);

// AI审计日志表
export const aiAuditLogs = pgTable("ai_audit_logs", {
	id: serial('id').primaryKey().notNull(),
	auditType: auditTypeEnum('auditType').notNull(),
	targetId: integer("target_id").notNull(),
	targetType: varchar("target_type", { length: 50 }).notNull(),
	checks: json(),
	anomalyRate: decimal("anomaly_rate", { precision: 5, scale: 2 }),
	recommendation: recommendationEnum1('recommendation').notNull(),
	reviewerId: integer("reviewer_id"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ai_audit_logs_target_idx").on(table.targetId, table.targetType),
	index("ai_audit_logs_audit_type_idx").on(table.auditType),
]);

// 服务报告表 - 支持闭环流程
export const serviceReports = pgTable("service_reports", {
	id: serial('id').primaryKey(),
	reportCode: varchar("report_code", { length: 50 }).notNull(),
	serviceTaskId: integer("service_task_id").notNull(),
	customerId: integer("customer_id"),
	equipmentId: integer("equipment_id"),
	reportType: reportTypeEnum('reportType').notNull(),
	summary: text(),
	workPerformed: text("work_performed"),
	findings: text(),
	recommendations: text(),
	partsUsed: json("parts_used"),
	laborHours: decimal("labor_hours", { precision: 6, scale: 2 }),
	photos: json(),
	engineerId: integer("engineer_id"),
	status: statusEnum55('status').default('draft'),
	supervisorId: integer("supervisor_id"),
	supervisorApprovedAt: timestamp("supervisor_approved_at", { mode: 'string' }),
	supervisorNotes: text("supervisor_notes"),
	customerConfirmationUrl: varchar("customer_confirmation_url", { length: 500 }),
	customerConfirmedAt: timestamp("customer_confirmed_at", { mode: 'string' }),
	customerSignature: text("customer_signature"),
	customerRating: integer("customer_rating"),
	customerFeedback: text("customer_feedback"),
	invoiceId: integer("invoice_id"),
	invoiceIssuedAt: timestamp("invoice_issued_at", { mode: 'string' }),
	aiGeneratedContent: json("ai_generated_content"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("service_reports_report_code_unique").on(table.reportCode),
	index("service_reports_service_task_id_idx").on(table.serviceTaskId),
	index("service_reports_customer_id_idx").on(table.customerId),
	index("service_reports_status_idx").on(table.status),
]);

// 员工位置记录表 - 用于主管工作台地图展示
export const employeeLocations = pgTable("employee_locations", {
	id: serial('id').primaryKey(),
	employeeId: integer("employee_id").notNull(),
	serviceTaskId: integer("service_task_id"),
	latitude: decimal({ precision: 10, scale: 7 }).notNull(),
	longitude: decimal({ precision: 10, scale: 7 }).notNull(),
	accuracy: decimal({ precision: 6, scale: 2 }),
	address: varchar({ length: 500 }),
	locationType: locationTypeEnum('locationType').default('real_time'),
	deviceInfo: json("device_info"),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("employee_locations_employee_id_idx").on(table.employeeId),
	index("employee_locations_service_task_id_idx").on(table.serviceTaskId),
	index("employee_locations_recorded_at_idx").on(table.recordedAt),
]);

// 客户助理对话记录表
export const customerAssistantChats = pgTable("customer_assistant_chats", {
	id: serial('id').primaryKey(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	customerId: integer("customer_id").notNull(),
	authStatus: authStatusEnum('authStatus').default('unverified'),
	messageRole: roleEnum('messageRole').notNull(),
	messageContent: text("message_content").notNull(),
	attachments: json(),
	faultDiagnosisResult: json("fault_diagnosis_result"),
	suggestedActions: json("suggested_actions"),
	relatedKnowledgeIds: json("related_knowledge_ids"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("customer_assistant_chats_session_id_idx").on(table.sessionId),
	index("customer_assistant_chats_customer_id_idx").on(table.customerId),
]);

// 用户认证状态表 - 扩展用户表的认证信息
export const userAuthStatus = pgTable("user_auth_status", {
	id: serial('id').primaryKey(),
	userId: integer("user_id").notNull(),
	authStatus: authStatusEnum1('authStatus').default('unverified'),
	authLevel: authLevelEnum('authLevel').default('customer'),
	companyName: varchar("company_name", { length: 200 }),
	companyVerificationDoc: varchar("company_verification_doc", { length: 500 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	verifiedBy: integer("verified_by"),
	suspendedAt: timestamp("suspended_at", { mode: 'string' }),
	suspendedReason: text("suspended_reason"),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("user_auth_status_user_id_unique").on(table.userId),
	index("user_auth_status_auth_level_idx").on(table.authLevel),
]);


// ============================================================================
// RFC-030: 未来10年架构预留表 (Future 10-Year Architecture Reserved Tables)
// ============================================================================

// 资格证书表 - 工程师资质与DA权限绑定
export const qualificationCertificates = pgTable("qualification_certificates", {
	id: serial('id').primaryKey(),
	certificateCode: varchar("certificate_code", { length: 50 }).notNull(),
	certificateName: varchar("certificate_name", { length: 200 }).notNull(),
	employeeId: integer("employee_id").notNull(),
	issueDate: timestamp("issue_date", { mode: 'string' }).notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }).notNull(),
	issuingAuthority: varchar("issuing_authority", { length: 200 }),
	certificateLevel: certificateLevelEnum('certificateLevel').default('basic'),
	equipmentTypes: text("equipment_types"), // JSON array of equipment type codes
	unlockedPermissions: text("unlocked_permissions"), // JSON array of permission codes
	verificationStatus: verificationStatusEnum('verificationStatus').default('pending'),
	digitalSignature: text("digital_signature"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("qual_cert_employee_id_idx").on(table.employeeId),
	index("qual_cert_code_idx").on(table.certificateCode),
	index("qual_cert_expiry_idx").on(table.expiryDate),
]);

// DA权限绑定表 - 数字助手与资质证书的权限映射
export const daPermissionBindings = pgTable("da_permission_bindings", {
	id: serial('id').primaryKey(),
	employeeId: integer("employee_id").notNull(),
	assistantId: varchar("assistant_id", { length: 64 }).notNull(),
	requiredCertificates: text("required_certificates"), // JSON array of certificate codes
	grantedPermissions: text("granted_permissions"), // JSON array of granted permissions
	restrictedFeatures: text("restricted_features"), // JSON array of restricted features
	lastVerifiedAt: timestamp("last_verified_at", { mode: 'string' }),
	isActive: smallint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("da_perm_employee_idx").on(table.employeeId),
	index("da_perm_assistant_idx").on(table.assistantId),
]);

// 战略财务审计日志表 - Strategic_CFO_Assistant 审计记录
export const strategicCfoAuditLogs = pgTable("strategic_cfo_audit_logs", {
	id: serial('id').primaryKey(),
	auditType: auditTypeEnum1('auditType').notNull(),
	targetId: integer("target_id").notNull(),
	targetType: varchar("target_type", { length: 50 }).notNull(),
	anomalyScore: decimal("anomaly_score", { precision: 5, scale: 2 }),
	anomalyFactors: text("anomaly_factors"), // JSON object with anomaly details
	recommendation: recommendationEnum2('recommendation').notNull(),
	autoProcessed: smallint("auto_processed").default(0),
	reviewerId: integer("reviewer_id"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("cfo_audit_type_idx").on(table.auditType),
	index("cfo_audit_target_idx").on(table.targetId, table.targetType),
	index("cfo_audit_anomaly_idx").on(table.anomalyScore),
]);

// 供应链预测表 - Supply_Chain_Optimizer 预测记录
export const supplyChainPredictions = pgTable("supply_chain_predictions", {
	id: serial('id').primaryKey(),
	predictionType: predictionTypeEnum1('predictionType').notNull(),
	partId: integer("part_id"),
	customerId: integer("customer_id"),
	predictionHorizonDays: integer("prediction_horizon_days").notNull(),
	predictedQuantity: integer("predicted_quantity"),
	confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
	predictionFactors: text("prediction_factors"), // JSON object with prediction inputs
	actualQuantity: integer("actual_quantity"),
	accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }),
	modelVersion: varchar("model_version", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
},
(table) => [
	index("supply_pred_type_idx").on(table.predictionType),
	index("supply_pred_part_idx").on(table.partId),
	index("supply_pred_customer_idx").on(table.customerId),
]);

// 脱敏代理日志表 - De-identification Proxy 审计日志
export const deidentificationProxyLogs = pgTable("deidentification_proxy_logs", {
	id: serial('id').primaryKey(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	userId: integer("user_id").notNull(),
	assistantId: varchar("assistant_id", { length: 64 }).notNull(),
	originalDataHash: varchar("original_data_hash", { length: 64 }),
	deidentifiedDataHash: varchar("deidentified_data_hash", { length: 64 }),
	rulesApplied: text("rules_applied"), // JSON array of applied rules
	llmEndpoint: varchar("llm_endpoint", { length: 200 }),
	requestSizeBytes: integer("request_size_bytes"),
	responseSizeBytes: integer("response_size_bytes"),
	sensitiveDataDetected: smallint("sensitive_data_detected").default(0),
	blocked: smallint("blocked").default(0),
	blockReason: text("block_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("deident_session_idx").on(table.sessionId),
	index("deident_user_idx").on(table.userId),
	index("deident_sensitive_idx").on(table.sensitiveDataDetected),
	index("deident_blocked_idx").on(table.blocked),
]);

// 数据隐私配置表 - 敏感数据分类与保护规则
export const dataPrivacyConfigs = pgTable("data_privacy_configs", {
	id: serial('id').primaryKey(),
	configCode: varchar("config_code", { length: 50 }).notNull(),
	configName: varchar("config_name", { length: 200 }).notNull(),
	dataCategory: dataCategoryEnum('dataCategory').notNull(),
	sensitivityLevel: sensitivityLevelEnum('sensitivityLevel').notNull(),
	deploymentRequirement: deploymentRequirementEnum('deploymentRequirement').default('any'),
	encryptionRequired: smallint("encryption_required").default(1),
	encryptionMethod: varchar("encryption_method", { length: 50 }),
	deidentificationRules: text("deidentification_rules"), // JSON array of rule IDs
	auditRequired: smallint("audit_required").default(1),
	retentionDays: integer("retention_days").default(365),
	isActive: smallint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("privacy_config_code_idx").on(table.configCode),
	index("privacy_config_category_idx").on(table.dataCategory),
	index("privacy_config_level_idx").on(table.sensitivityLevel),
]);

// 多语言服务报告表 - 多方共识闭环报告
export const multiLanguageServiceReports = pgTable("multi_language_service_reports", {
	id: serial('id').primaryKey(),
	serviceReportId: integer("service_report_id").notNull(),
	language: varchar("language", { length: 10 }).notNull(), // zh-CN, en-US, de-DE, ja-JP
	reportContent: text("report_content"),
	translationEngine: varchar("translation_engine", { length: 50 }),
	translationQualityScore: decimal("translation_quality_score", { precision: 5, scale: 2 }),
	humanReviewed: smallint("human_reviewed").default(0),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ml_report_service_idx").on(table.serviceReportId),
	index("ml_report_language_idx").on(table.language),
]);

// 服务报告共识记录表 - 多方确认流程
export const serviceReportConsensus = pgTable("service_report_consensus", {
	id: serial('id').primaryKey(),
	serviceReportId: integer("service_report_id").notNull(),
	participantRole: participantRoleEnum('participantRole').notNull(),
	participantId: integer("participant_id"),
	participantName: varchar("participant_name", { length: 100 }),
	confirmationStatus: confirmationStatusEnum('confirmationStatus').default('pending'),
	confirmationContent: text("confirmation_content"), // JSON with confirmed items
	rejectionReason: text("rejection_reason"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	reminderSentAt: timestamp("reminder_sent_at", { mode: 'string' }),
	reminderCount: integer("reminder_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("consensus_report_idx").on(table.serviceReportId),
	index("consensus_role_idx").on(table.participantRole),
	index("consensus_status_idx").on(table.confirmationStatus),
]);

// 客户信用更新记录表 - 服务闭环后的信用评估
export const customerCreditUpdates = pgTable("customer_credit_updates", {
	id: serial('id').primaryKey(),
	customerId: integer("customer_id").notNull(),
	serviceReportId: integer("service_report_id"),
	paymentTimeliness: decimal("payment_timeliness", { precision: 5, scale: 2 }), // 0-100
	feedbackQuality: decimal("feedback_quality", { precision: 5, scale: 2 }), // 0-100
	cooperationLevel: decimal("cooperation_level", { precision: 5, scale: 2 }), // 0-100
	repeatBusinessRate: decimal("repeat_business_rate", { precision: 5, scale: 2 }), // 0-100
	previousCreditScore: decimal("previous_credit_score", { precision: 5, scale: 2 }),
	newCreditScore: decimal("new_credit_score", { precision: 5, scale: 2 }),
	creditScoreChange: decimal("credit_score_change", { precision: 5, scale: 2 }),
	tierChangeRecommendation: tierChangeRecommendationEnum('tierChangeRecommendation'),
	tierChangeApplied: smallint("tier_change_applied").default(0),
	effectiveDate: timestamp("effective_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("credit_update_customer_idx").on(table.customerId),
	index("credit_update_report_idx").on(table.serviceReportId),
	index("credit_update_effective_idx").on(table.effectiveDate),
]);


// ============================================================================
// ZKP零知识证明验证模块 - AI-AI销售系统核心组件
// ============================================================================

// ZKP验证请求表 - 记录所有ZKP验证请求
export const zkpVerificationRequests = pgTable("zkp_verification_requests", {
	id: serial('id').primaryKey(),
	requestCode: varchar("request_code", { length: 64 }).notNull(), // ZKP-{timestamp}-{random}
	requestType: requestTypeEnum1('requestType').notNull(),
	requesterId: integer("requester_id"), // 请求方ID（可能是客户AI）
	requesterType: requesterTypeEnum('requesterType').default('customer_ai'),
	requesterIdentity: varchar("requester_identity", { length: 200 }), // 请求方身份标识
	
	// 验证目标
	targetEntityType: targetEntityTypeEnum('targetEntityType').notNull(),
	targetEntityId: integer("target_entity_id"),
	targetEntityCode: varchar("target_entity_code", { length: 100 }),
	
	// 验证声明（要证明的内容）
	claimType: varchar("claim_type", { length: 100 }).notNull(), // 如 "cleanliness_level_meets_standard"
	claimDescription: text("claim_description"), // 声明描述
	claimParameters: text("claim_parameters"), // JSON: 声明参数
	
	// 验证状态
	status: statusEnum56('status').default('pending').notNull(),
	
	// 时间控制
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("zkp_request_code_idx").on(table.requestCode),
	index("zkp_request_type_idx").on(table.requestType),
	index("zkp_request_status_idx").on(table.status),
	index("zkp_requester_idx").on(table.requesterId, table.requesterType),
]);

// ZKP验证结果表 - 存储验证结果（不含原始数据）
export const zkpVerificationResults = pgTable("zkp_verification_results", {
	id: serial('id').primaryKey(),
	requestId: integer("request_id").notNull(), // 关联请求
	
	// 验证结果
	isVerified: smallint("is_verified").notNull(), // 1=验证通过, 0=验证失败
	verificationProof: text("verification_proof"), // ZKP证明数据（加密）
	proofHash: varchar("proof_hash", { length: 128 }), // 证明哈希
	
	// 验证元数据（不暴露具体值）
	confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }), // 置信度 0-100
	verificationMethod: varchar("verification_method", { length: 100 }), // 使用的验证方法
	
	// 公开的验证摘要（脱敏）
	publicSummary: text("public_summary"), // JSON: 可公开的验证摘要
	
	// 验证者信息
	verifierId: varchar("verifier_id", { length: 64 }), // 验证者标识
	verifierSignature: text("verifier_signature"), // 验证者签名
	
	// 区块链锚定（可选）
	blockchainTxHash: varchar("blockchain_tx_hash", { length: 128 }),
	blockchainNetwork: varchar("blockchain_network", { length: 50 }),
	blockNumber: bigint("block_number", { mode: "number" }),
	
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("zkp_result_request_idx").on(table.requestId),
	index("zkp_result_verified_idx").on(table.isVerified),
	index("zkp_result_proof_hash_idx").on(table.proofHash),
]);

// VDA 19.1清洁度标准表 - 存储清洁度等级定义
export const vda191CleanlinessStandards = pgTable("vda_191_cleanliness_standards", {
	id: serial('id').primaryKey(),
	standardCode: varchar("standard_code", { length: 50 }).notNull(), // 如 "CCC-A", "CCC-B"
	standardName: varchar("standard_name", { length: 200 }).notNull(),
	standardVersion: varchar("standard_version", { length: 20 }).default('VDA 19.1:2015'),
	
	// 清洁度等级参数（公开范围）
	particleSizeMin: integer("particle_size_min"), // 最小颗粒尺寸 μm
	particleSizeMax: integer("particle_size_max"), // 最大颗粒尺寸 μm
	particleCountLimit: integer("particle_count_limit"), // 颗粒数量限制
	gravimetricLimit: decimal("gravimetric_limit", { precision: 10, scale: 4 }), // 重量法限制 mg
	
	// 适用范围
	applicableIndustries: text("applicable_industries"), // JSON: 适用行业
	applicableComponents: text("applicable_components"), // JSON: 适用零部件类型
	
	// 验证方法
	testMethods: text("test_methods"), // JSON: 测试方法列表
	samplingRequirements: text("sampling_requirements"), // JSON: 取样要求
	
	isActive: smallint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("vda191_standard_code_idx").on(table.standardCode),
	index("vda191_version_idx").on(table.standardVersion),
]);

// 工艺参数合规性配置表 - 定义可验证的工艺参数范围
export const processParameterCompliance = pgTable("process_parameter_compliance", {
	id: serial('id').primaryKey(),
	parameterCode: varchar("parameter_code", { length: 64 }).notNull(),
	parameterName: varchar("parameter_name", { length: 200 }).notNull(),
	parameterCategory: parameterCategoryEnum('parameterCategory').notNull(),
	
	// 公开的合规范围（不暴露具体工艺值）
	complianceRangeType: complianceRangeTypeEnum('complianceRangeType').notNull(),
	publicRangeDescription: varchar("public_range_description", { length: 500 }), // 如 "符合VDA 19.1标准"
	
	// 内部参数范围（加密存储，仅用于验证）
	internalRangeMin: text("internal_range_min"), // 加密的最小值
	internalRangeMax: text("internal_range_max"), // 加密的最大值
	encryptionKeyId: varchar("encryption_key_id", { length: 64 }), // 加密密钥ID
	
	// 关联标准
	relatedStandardId: integer("related_standard_id"), // 关联VDA 19.1标准
	
	// 验证配置
	verificationEnabled: smallint("verification_enabled").default(1),
	zkpCircuitId: varchar("zkp_circuit_id", { length: 64 }), // ZKP电路ID
	
	isActive: smallint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("process_param_code_idx").on(table.parameterCode),
	index("process_param_category_idx").on(table.parameterCategory),
]);

// ZKP验证审计日志表 - 记录所有验证操作
export const zkpVerificationAuditLogs = pgTable("zkp_verification_audit_logs", {
	id: serial('id').primaryKey(),
	requestId: integer("request_id").notNull(),
	resultId: integer("result_id"),
	
	// 操作信息
	action: actionEnum('action').notNull(),
	actionDetails: text("action_details"), // JSON: 操作详情
	
	// 操作者信息
	actorType: actorTypeEnum('actorType').notNull(),
	actorId: varchar("actor_id", { length: 100 }),
	actorIp: varchar("actor_ip", { length: 45 }),
	
	// 安全信息
	requestSignature: varchar("request_signature", { length: 256 }),
	integrityHash: varchar("integrity_hash", { length: 128 }),
	
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("zkp_audit_request_idx").on(table.requestId),
	index("zkp_audit_action_idx").on(table.action),
	index("zkp_audit_actor_idx").on(table.actorType, table.actorId),
	index("zkp_audit_time_idx").on(table.createdAt),
]);

// 能力证明配置表 - 定义可证明的能力类型
export const capabilityProofConfigs = pgTable("capability_proof_configs", {
	id: serial('id').primaryKey(),
	capabilityCode: varchar("capability_code", { length: 64 }).notNull(),
	capabilityName: varchar("capability_name", { length: 200 }).notNull(),
	capabilityCategory: capabilityCategoryEnum('capabilityCategory').notNull(),
	
	// 公开展示内容
	publicDescription: text("public_description"),
	publicEvidence: text("public_evidence"), // JSON: 可公开的证据
	
	// 验证规则
	verificationRules: text("verification_rules"), // JSON: 验证规则定义
	requiredDataSources: text("required_data_sources"), // JSON: 需要的数据源
	
	// ZKP配置
	zkpEnabled: smallint("zkp_enabled").default(1),
	zkpCircuitType: varchar("zkp_circuit_type", { length: 50 }),
	
	// 有效期
	validFrom: timestamp("valid_from", { mode: 'string' }),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	
	isActive: smallint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("capability_code_idx").on(table.capabilityCode),
	index("capability_category_idx").on(table.capabilityCategory),
]);

// 公开能力展示表 - SEO友好的能力展示数据
export const publicCapabilityShowcase = pgTable("public_capability_showcase", {
	id: serial('id').primaryKey(),
	showcaseCode: varchar("showcase_code", { length: 64 }).notNull(),
	
	// SEO元数据
	title: varchar("title", { length: 200 }).notNull(),
	titleEn: varchar("title_en", { length: 200 }),
	slug: varchar("slug", { length: 200 }).notNull(), // URL友好的标识
	metaDescription: varchar("meta_description", { length: 500 }),
	metaKeywords: varchar("meta_keywords", { length: 500 }),
	
	// 展示内容
	category: categoryEnum4('category').notNull(),
	summary: text("summary"), // 摘要
	summaryEn: text("summary_en"),
	content: text("content"), // 详细内容（Markdown）
	contentEn: text("content_en"),
	
	// 媒体资源
	featuredImage: varchar("featured_image", { length: 500 }),
	gallery: text("gallery"), // JSON: 图片列表
	videos: text("videos"), // JSON: 视频列表
	
	// 关联的能力证明
	relatedCapabilityIds: text("related_capability_ids"), // JSON: 关联的能力ID
	
	// 统计数据（脱敏后的）
	publicStats: text("public_stats"), // JSON: 可公开的统计数据
	
	// 发布控制
	status: statusEnum57('status').default('draft').notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	
	// 排序和展示
	sortOrder: integer("sort_order").default(0),
	isFeatured: smallint("is_featured").default(0),
	
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("showcase_code_idx").on(table.showcaseCode),
	index("showcase_slug_idx").on(table.slug),
	index("showcase_category_idx").on(table.category),
	index("showcase_status_idx").on(table.status),
]);


// ==================== 德美跨国合规员工管理表 ====================

// 员工信息表 - 支持德国/美国合规
export const grtEmployees = pgTable("grt_employees", {
	id: serial('id').primaryKey(),
	employeeId: varchar("employee_id", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 200 }),
	department: varchar({ length: 100 }),
	roleType: roleTypeEnum('roleType').default('office').notNull(),
	jurisdiction: jurisdictionEnum('jurisdiction').default('CN').notNull(),
	supervisorId: integer("supervisor_id"),
	contractType: contractTypeEnum('contractType').default('full_time'),
	weeklyHoursLimit: integer("weekly_hours_limit").default(40),
	isExempt: smallint("is_exempt").default(0),
	exemptionType: exemptionTypeEnum('exemptionType').default('none'),
	hireDate: date("hire_date"),
	timezone: varchar({ length: 50 }).default('Europe/Berlin'),
	isActive: smallint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_employees_employee_id_idx").on(table.employeeId),
	index("grt_employees_jurisdiction_idx").on(table.jurisdiction),
	index("grt_employees_role_type_idx").on(table.roleType),
]);

// 工时记录表 - 支持德国10小时上限和美国FLSA合规
export const grtTimeEntries = pgTable("grt_time_entries", {
	id: serial('id').primaryKey(),
	employeeId: integer("employee_id").notNull(),
	date: date().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time"),
	durationMinutes: integer("duration_minutes").default(0),
	activityCategory: activityCategoryEnum('activityCategory').default('work').notNull(),
	jurisdiction: jurisdictionEnum('jurisdiction').default('CN').notNull(),
	projectId: integer("project_id"),
	customerId: integer("customer_id"),
	taskDescription: text("task_description"),
	location: varchar({ length: 200 }),
	geoLatitude: decimal("geo_latitude", { precision: 10, scale: 7 }),
	geoLongitude: decimal("geo_longitude", { precision: 10, scale: 7 }),
	isRemote: smallint("is_remote").default(0),
	complianceFlag: complianceFlagEnum('complianceFlag').default('OK'),
	complianceNotes: text("compliance_notes"),
	supervisorApproval: supervisorApprovalEnum('supervisorApproval').default('pending'),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	isOvertime: smallint("is_overtime").default(0),
	overtimeRate: decimal("overtime_rate", { precision: 3, scale: 2 }).default('1.5'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_time_entries_employee_id_idx").on(table.employeeId),
	index("grt_time_entries_date_idx").on(table.date),
	index("grt_time_entries_jurisdiction_idx").on(table.jurisdiction),
	index("grt_time_entries_compliance_flag_idx").on(table.complianceFlag),
]);

// 合规警报表 - 记录德美合规违规和预警
export const grtComplianceAlerts = pgTable("grt_compliance_alerts", {
	id: serial('id').primaryKey(),
	employeeId: integer("employee_id").notNull(),
	timeEntryId: integer("time_entry_id"),
	alertType: alertTypeEnum1('alertType').notNull(),
	jurisdiction: jurisdictionEnum('jurisdiction').default('CN').notNull(),
	severity: severityEnum1('severity').default('warning').notNull(),
	description: text(),
	legalReference: varchar("legal_reference", { length: 200 }),
	recommendedAction: text("recommended_action"),
	status: statusEnum58('status').default('open').notNull(),
	acknowledgedBy: integer("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedBy: integer("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolutionNotes: text("resolution_notes"),
	notificationSent: smallint("notification_sent").default(0),
	notificationSentAt: timestamp("notification_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_compliance_alerts_employee_id_idx").on(table.employeeId),
	index("grt_compliance_alerts_alert_type_idx").on(table.alertType),
	index("grt_compliance_alerts_status_idx").on(table.status),
]);

// 周合规汇总表 - 用于美国FLSA周度审计
export const grtWeeklyComplianceSummary = pgTable("grt_weekly_compliance_summary", {
	id: serial('id').primaryKey(),
	employeeId: integer("employee_id").notNull(),
	weekStartDate: date("week_start_date").notNull(),
	weekEndDate: date("week_end_date").notNull(),
	jurisdiction: jurisdictionEnum('jurisdiction').default('CN').notNull(),
	totalWorkMinutes: integer("total_work_minutes").default(0),
	totalTravelPaidMinutes: integer("total_travel_paid_minutes").default(0),
	totalOvertimeMinutes: integer("total_overtime_minutes").default(0),
	daysWorked: integer("days_worked").default(0),
	maxDailyMinutes: integer("max_daily_minutes").default(0),
	restPeriodViolations: integer("rest_period_violations").default(0),
	exemptionStatus: exemptionStatusEnum('exemptionStatus').default('non_exempt'),
	exemptionCriteriaMet: smallint("exemption_criteria_met").default(0),
	primaryDutyPercentage: decimal("primary_duty_percentage", { precision: 5, scale: 2 }),
	overallComplianceStatus: overallComplianceStatusEnum('overallComplianceStatus').default('compliant'),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_weekly_summary_employee_id_idx").on(table.employeeId),
	index("grt_weekly_summary_week_start_idx").on(table.weekStartDate),
	index("grt_weekly_summary_jurisdiction_idx").on(table.jurisdiction),
]);


// 合规报告历史表 - 记录每次生成的合规报告
export const grtComplianceReports = pgTable("grt_compliance_reports", {
	id: serial('id').primaryKey(),
	reportId: varchar("report_id", { length: 64 }).notNull(),
	reportType: reportTypeEnum1('reportType').default('weekly').notNull(),
	format: formatEnum1('format').default('pdf').notNull(),
	jurisdiction: jurisdictionEnum1('jurisdiction').default('ALL'),
	dateRangeStart: date("date_range_start"),
	dateRangeEnd: date("date_range_end"),
	generatedBy: integer("generated_by").notNull(),
	generatedByName: varchar("generated_by_name", { length: 100 }),
	fileUrl: text("file_url").notNull(),
	fileKey: varchar("file_key", { length: 255 }),
	fileSizeBytes: integer("file_size_bytes"),
	employeesIncluded: integer("employees_included").default(0),
	alertsIncluded: integer("alerts_included").default(0),
	includesDetails: smallint("includes_details").default(1),
	includesAlerts: smallint("includes_alerts").default(1),
	includesRecommendations: smallint("includes_recommendations").default(1),
	status: statusEnum59('status').default('generating').notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_compliance_reports_report_id_idx").on(table.reportId),
	index("grt_compliance_reports_generated_by_idx").on(table.generatedBy),
	index("grt_compliance_reports_created_at_idx").on(table.createdAt),
]);

// 合规规则配置表 - 存储各地区的工时阈值和预警规则
export const grtComplianceRules = pgTable("grt_compliance_rules", {
	id: serial('id').primaryKey(),
	ruleId: varchar("rule_id", { length: 64 }).notNull(),
	ruleName: varchar("rule_name", { length: 100 }).notNull(),
	ruleDescription: text("rule_description"),
	jurisdiction: jurisdictionEnum('jurisdiction').notNull(),
	ruleType: ruleTypeEnum2('ruleType').notNull(),
	thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }).notNull(),
	thresholdUnit: thresholdUnitEnum('thresholdUnit').default('hours').notNull(),
	warningThreshold: decimal("warning_threshold", { precision: 10, scale: 2 }),
	criticalThreshold: decimal("critical_threshold", { precision: 10, scale: 2 }),
	legalReference: varchar("legal_reference", { length: 200 }),
	legalReferenceUrl: text("legal_reference_url"),
	recommendedAction: text("recommended_action"),
	isEnabled: smallint("is_enabled").default(1).notNull(),
	priority: integer().default(100),
	effectiveFrom: date("effective_from"),
	effectiveTo: date("effective_to"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_compliance_rules_rule_id_idx").on(table.ruleId),
	index("grt_compliance_rules_jurisdiction_idx").on(table.jurisdiction),
	index("grt_compliance_rules_rule_type_idx").on(table.ruleType),
]);

// 合规邮件模板表 - 存储自定义邮件通知模板
export const grtComplianceEmailTemplates = pgTable("grt_compliance_email_templates", {
	id: serial('id').primaryKey(),
	templateId: varchar("template_id", { length: 64 }).notNull(),
	templateName: varchar("template_name", { length: 100 }).notNull(),
	templateDescription: text("template_description"),
	alertType: alertTypeEnum2('alertType').notNull(),
	severity: severityEnum2('severity').default('warning'),
	jurisdiction: jurisdictionEnum1('jurisdiction').default('ALL'),
	subjectTemplate: varchar("subject_template", { length: 200 }).notNull(),
	bodyTemplate: text("body_template").notNull(),
	isHtml: smallint("is_html").default(1),
	recipientTypes: text("recipient_types"), // JSON: ['employee', 'supervisor', 'hr', 'admin']
	isEnabled: smallint("is_enabled").default(1).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("grt_compliance_email_templates_template_id_idx").on(table.templateId),
	index("grt_compliance_email_templates_alert_type_idx").on(table.alertType),
]);

// ==================== 类型导出 ====================
// 用于TypeScript类型推断

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// User types
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

// Historical Solution types
export type HistoricalSolution = InferSelectModel<typeof historicalSolutions>;
export type InsertHistoricalSolution = InferInsertModel<typeof historicalSolutions>;

// Solution Recommendation types
export type SolutionRecommendation = InferSelectModel<typeof solutionRecommendations>;
export type InsertSolutionRecommendation = InferInsertModel<typeof solutionRecommendations>;

// Solution Learning Record types
export type SolutionLearningRecord = InferSelectModel<typeof solutionLearningRecords>;
export type InsertSolutionLearningRecord = InferInsertModel<typeof solutionLearningRecords>;

// Historical Quotation types
export type HistoricalQuotation = InferSelectModel<typeof historicalQuotations>;
export type InsertHistoricalQuotation = InferInsertModel<typeof historicalQuotations>;

// Quotation Recommendation types
export type QuotationRecommendation = InferSelectModel<typeof quotationRecommendations>;
export type InsertQuotationRecommendation = InferInsertModel<typeof quotationRecommendations>;

// Quotation Learning Record types
export type QuotationLearningRecord = InferSelectModel<typeof quotationLearningRecords>;
export type InsertQuotationLearningRecord = InferInsertModel<typeof quotationLearningRecords>;

// Employee types
export type Employee = InferSelectModel<typeof buEmployees>;
export type InsertEmployee = InferInsertModel<typeof buEmployees>;

// Training types
export type Training = InferSelectModel<typeof trainingPlans>;
export type InsertTraining = InferInsertModel<typeof trainingPlans>;

// Assessment types
export type Assessment = InferSelectModel<typeof trainingAssessments>;
export type InsertAssessment = InferInsertModel<typeof trainingAssessments>;

// Customer types
export type Customer = InferSelectModel<typeof customersV2>;
export type InsertCustomer = InferInsertModel<typeof customersV2>;

// Contact types
export type Contact = InferSelectModel<typeof crmContacts>;
export type InsertContact = InferInsertModel<typeof crmContacts>;

// Opportunity types
export type Opportunity = InferSelectModel<typeof crmOpportunities>;
export type InsertOpportunity = InferInsertModel<typeof crmOpportunities>;

// Project types
export type Project = InferSelectModel<typeof projects>;
export type InsertProject = InferInsertModel<typeof projects>;

// Migration Task types
export type MigrationTask = InferSelectModel<typeof migrationTasks>;
export type InsertMigrationTask = InferInsertModel<typeof migrationTasks>;

// Dev Task types
export type DevTask = InferSelectModel<typeof devTasks>;
export type InsertDevTask = InferInsertModel<typeof devTasks>;

// Feedback types
export type Feedback = InferSelectModel<typeof feedback>;
export type InsertFeedback = InferInsertModel<typeof feedback>;


// ==================== 补充缺失的类型导出 ====================

// Analytics Event types
export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type InsertAnalyticsEvent = InferInsertModel<typeof analyticsEvents>;

// AI Interview Analytic types
export type AiInterviewAnalytic = InferSelectModel<typeof aiInterviewAnalytics>;
export type InsertAiInterviewAnalytic = InferInsertModel<typeof aiInterviewAnalytics>;

// AI Process Suggestion types
export type AiProcessSuggestion = InferSelectModel<typeof aiProcessSuggestions>;
export type InsertAiProcessSuggestion = InferInsertModel<typeof aiProcessSuggestions>;

// AI Suggestion Execution Log types
export type AiSuggestionExecutionLog = InferSelectModel<typeof aiSuggestionExecutionLogs>;
export type InsertAiSuggestionExecutionLog = InferInsertModel<typeof aiSuggestionExecutionLogs>;

// Annual Planning types
export type AnnualPlanningConfig = InferSelectModel<typeof annualPlanningConfigs>;
export type InsertAnnualPlanningConfig = InferInsertModel<typeof annualPlanningConfigs>;

export type AnnualPlanningDependency = InferSelectModel<typeof annualPlanningDependencies>;
export type InsertAnnualPlanningDependency = InferInsertModel<typeof annualPlanningDependencies>;

export type AnnualPlanningItem = InferSelectModel<typeof annualPlanningItems>;
export type InsertAnnualPlanningItem = InferInsertModel<typeof annualPlanningItems>;

export type AnnualPlanningUpdateLog = InferSelectModel<typeof annualPlanningUpdateLogs>;
export type InsertAnnualPlanningUpdateLog = InferInsertModel<typeof annualPlanningUpdateLogs>;

// Cost Alert types
export type CostAlertLog = InferSelectModel<typeof costAlertLogs>;
export type InsertCostAlertLog = InferInsertModel<typeof costAlertLogs>;

export type CostAlertRule = InferSelectModel<typeof costAlertRules>;
export type InsertCostAlertRule = InferInsertModel<typeof costAlertRules>;

export type CostAlertRuleTemplate = InferSelectModel<typeof costAlertRuleTemplates>;
export type InsertCostAlertRuleTemplate = InferInsertModel<typeof costAlertRuleTemplates>;

export type CostAlertRuleVersion = InferSelectModel<typeof costAlertRuleVersions>;
export type InsertCostAlertRuleVersion = InferInsertModel<typeof costAlertRuleVersions>;

// Cost Management types
export type CostCategory = InferSelectModel<typeof costCategories>;
export type InsertCostCategory = InferInsertModel<typeof costCategories>;

export type CostEstimate = InferSelectModel<typeof costEstimates>;
export type InsertCostEstimate = InferInsertModel<typeof costEstimates>;

export type CostRecord = InferSelectModel<typeof costRecords>;
export type InsertCostRecord = InferInsertModel<typeof costRecords>;

export type CostVarianceAnalysis = InferSelectModel<typeof costVarianceAnalysis>;
export type InsertCostVarianceAnalysis = InferInsertModel<typeof costVarianceAnalysis>;

// CRM types
export type CrmBantScore = InferSelectModel<typeof crmBantScores>;
export type InsertCrmBantScore = InferInsertModel<typeof crmBantScores>;

export type CrmCustomer = InferSelectModel<typeof crmCustomers>;
export type InsertCrmCustomer = InferInsertModel<typeof crmCustomers>;

export type CrmContact = InferSelectModel<typeof crmContacts>;
export type InsertCrmContact = InferInsertModel<typeof crmContacts>;

export type CrmOpportunity = InferSelectModel<typeof crmOpportunities>;
export type InsertCrmOpportunity = InferInsertModel<typeof crmOpportunities>;

// Employee Digital Assistant types
export type EmployeeDigitalAssistant = InferSelectModel<typeof employeeDigitalAssistants>;
export type InsertEmployeeDigitalAssistant = InferInsertModel<typeof employeeDigitalAssistants>;

// Equipment types
export type EquipmentModel = InferSelectModel<typeof equipmentModels>;
export type InsertEquipmentModel = InferInsertModel<typeof equipmentModels>;

export type EquipmentNameHistory = InferSelectModel<typeof equipmentNameHistory>;
export type InsertEquipmentNameHistory = InferInsertModel<typeof equipmentNameHistory>;

// Functional AI Assistant types
export type FunctionalAiAssistant = InferSelectModel<typeof functionalAiAssistants>;
export type InsertFunctionalAiAssistant = InferInsertModel<typeof functionalAiAssistants>;

// HRM types
export type HrmAiInterviewRecord = InferSelectModel<typeof hrmAiInterviewRecords>;
export type InsertHrmAiInterviewRecord = InferInsertModel<typeof hrmAiInterviewRecords>;

export type HrmCandidate = InferSelectModel<typeof hrmCandidates>;
export type InsertHrmCandidate = InferInsertModel<typeof hrmCandidates>;

export type HrmDigitalAgentModel = InferSelectModel<typeof hrmDigitalAgentModels>;
export type InsertHrmDigitalAgentModel = InferInsertModel<typeof hrmDigitalAgentModels>;

export type HrmDocumentFile = InferSelectModel<typeof hrmDocumentFiles>;
export type InsertHrmDocumentFile = InferInsertModel<typeof hrmDocumentFiles>;

export type HrmEmployee = InferSelectModel<typeof hrmEmployees>;
export type InsertHrmEmployee = InferInsertModel<typeof hrmEmployees>;

export type HrmPerformanceGrade = InferSelectModel<typeof hrmPerformanceGrades>;
export type InsertHrmPerformanceGrade = InferInsertModel<typeof hrmPerformanceGrades>;

export type HrmPerformanceReviewReminder = InferSelectModel<typeof hrmPerformanceReviewReminders>;
export type InsertHrmPerformanceReviewReminder = InferInsertModel<typeof hrmPerformanceReviewReminders>;

export type HrmPosition = InferSelectModel<typeof hrmPositions>;
export type InsertHrmPosition = InferInsertModel<typeof hrmPositions>;

export type HrmSalaryStructure = InferSelectModel<typeof hrmSalaryStructures>;
export type InsertHrmSalaryStructure = InferInsertModel<typeof hrmSalaryStructures>;

export type HrmTrainingPlan = InferSelectModel<typeof hrmTrainingPlans>;
export type InsertHrmTrainingPlan = InferInsertModel<typeof hrmTrainingPlans>;

export type HrmTrainingTest = InferSelectModel<typeof hrmTrainingTests>;
export type InsertHrmTrainingTest = InferInsertModel<typeof hrmTrainingTests>;

// Labor Cost types
export type LaborCost = InferSelectModel<typeof laborCosts>;
export type InsertLaborCost = InferInsertModel<typeof laborCosts>;

// Meeting Reminder types
export type MeetingReminder = InferSelectModel<typeof meetingReminders>;
export type InsertMeetingReminder = InferInsertModel<typeof meetingReminders>;

// Naming types
export type NamingChangeImplementation = InferSelectModel<typeof namingChangeImplementations>;
export type InsertNamingChangeImplementation = InferInsertModel<typeof namingChangeImplementations>;

export type NamingChangeRequest = InferSelectModel<typeof namingChangeRequests>;
export type InsertNamingChangeRequest = InferInsertModel<typeof namingChangeRequests>;

export type NamingChangeTest = InferSelectModel<typeof namingChangeTests>;
export type InsertNamingChangeTest = InferInsertModel<typeof namingChangeTests>;

export type NamingRuleApprover = InferSelectModel<typeof namingRuleApprovers>;
export type InsertNamingRuleApprover = InferInsertModel<typeof namingRuleApprovers>;

export type NamingVersion = InferSelectModel<typeof namingVersions>;
export type InsertNamingVersion = InferInsertModel<typeof namingVersions>;

// Performance Review types
export type PerformanceReviewEmailLog = InferSelectModel<typeof performanceReviewEmailLogs>;
export type InsertPerformanceReviewEmailLog = InferInsertModel<typeof performanceReviewEmailLogs>;

// Project types
export type ProjectBudget = InferSelectModel<typeof projectBudgets>;
export type InsertProjectBudget = InferInsertModel<typeof projectBudgets>;

export type ProjectConversionHistory = InferSelectModel<typeof projectConversionHistory>;
export type InsertProjectConversionHistory = InferInsertModel<typeof projectConversionHistory>;

export type ProjectDocument = InferSelectModel<typeof projectDocuments>;
export type InsertProjectDocument = InferInsertModel<typeof projectDocuments>;

export type ProjectGate = InferSelectModel<typeof projectGates>;
export type InsertProjectGate = InferInsertModel<typeof projectGates>;

export type ProjectMilestone = InferSelectModel<typeof projectMilestones>;
export type InsertProjectMilestone = InferInsertModel<typeof projectMilestones>;

export type ProjectNumberCounter = InferSelectModel<typeof projectNumberCounters>;
export type InsertProjectNumberCounter = InferInsertModel<typeof projectNumberCounters>;

export type ProjectPhase = InferSelectModel<typeof projectPhases>;
export type InsertProjectPhase = InferInsertModel<typeof projectPhases>;

export type ProjectTask = InferSelectModel<typeof projectTasks>;
export type InsertProjectTask = InferInsertModel<typeof projectTasks>;

export type ProjectTeamMember = InferSelectModel<typeof projectTeamMembers>;
export type InsertProjectTeamMember = InferInsertModel<typeof projectTeamMembers>;

// Salary types
export type SalaryCalculation = InferSelectModel<typeof salaryCalculations>;
export type InsertSalaryCalculation = InferInsertModel<typeof salaryCalculations>;

// Scheduled Task types
export type ScheduledTask = InferSelectModel<typeof scheduledTasks>;
export type InsertScheduledTask = InferInsertModel<typeof scheduledTasks>;

// Teams Meeting Config types
export type TeamsMeetingConfig = InferSelectModel<typeof teamsMeetingConfigs>;
export type InsertTeamsMeetingConfig = InferInsertModel<typeof teamsMeetingConfigs>;

// Training types
export type TrainingAssessment = InferSelectModel<typeof trainingAssessments>;
export type InsertTrainingAssessment = InferInsertModel<typeof trainingAssessments>;

export type TrainingAssessmentResult = InferSelectModel<typeof trainingAssessmentResults>;
export type InsertTrainingAssessmentResult = InferInsertModel<typeof trainingAssessmentResults>;

export type TrainingCertificate = InferSelectModel<typeof trainingCertificates>;
export type InsertTrainingCertificate = InferInsertModel<typeof trainingCertificates>;

// Webhook types
export type WebhookConfig = InferSelectModel<typeof webhookConfigs>;
export type InsertWebhookConfig = InferInsertModel<typeof webhookConfigs>;

export type WebhookLog = InferSelectModel<typeof webhookLogs>;
export type InsertWebhookLog = InferInsertModel<typeof webhookLogs>;

export type WebhookTemplate = InferSelectModel<typeof webhookTemplates>;
export type InsertWebhookTemplate = InferInsertModel<typeof webhookTemplates>;

export type WebhookTriggerCondition = InferSelectModel<typeof webhookTriggerConditions>;
export type InsertWebhookTriggerCondition = InferInsertModel<typeof webhookTriggerConditions>;


// CRM Follow Up types
export type CrmFollowUp = InferSelectModel<typeof crmFollowUps>;
export type InsertCrmFollowUp = InferInsertModel<typeof crmFollowUps>;

// GRT Compliance types
export type GrtEmployee = InferSelectModel<typeof grtEmployees>;
export type InsertGrtEmployee = InferInsertModel<typeof grtEmployees>;

export type GrtTimeEntry = InferSelectModel<typeof grtTimeEntries>;
export type InsertGrtTimeEntry = InferInsertModel<typeof grtTimeEntries>;

export type GrtComplianceAlert = InferSelectModel<typeof grtComplianceAlerts>;
export type InsertGrtComplianceAlert = InferInsertModel<typeof grtComplianceAlerts>;

export type GrtWeeklyComplianceSummary = InferSelectModel<typeof grtWeeklyComplianceSummary>;
export type InsertGrtWeeklyComplianceSummary = InferInsertModel<typeof grtWeeklyComplianceSummary>;

// ============ Pilot D: 社群管理模块 (Community Management) ============
// 基于 GRTclean技术交流社群管理规范与系统集成方案 v1.0

/**
 * 社群成员表 - 管理技术交流群成员
 * 关联CRM客户，标记活跃度和技术偏好
 */
export const communityMembers = pgTable("community_members", {
id: serial('id').primaryKey(),
// 基础信息
externalId: varchar("external_id", { length: 100 }).notNull(), // 微信/企微/钉钉ID
platform: platformEnum('platform').default('wechat').notNull(),
nickname: varchar({ length: 100 }).notNull(),
avatar: varchar({ length: 500 }),
realName: varchar("real_name", { length: 100 }),
phone: varchar({ length: 20 }),
company: varchar({ length: 200 }),
// 关联CRM
customerId: integer("customer_id"), // 关联customers表
// 角色与权限
role: roleEnum4('role').default('guest').notNull(),
// 状态管理
status: statusEnum60('status').default('pending').notNull(),
verificationStatus: verificationStatusEnum1('verificationStatus').default('unverified').notNull(),
// 画像标签
tags: text(), // JSON数组: ["清洗技术", "超声波", "铝合金"]
activityLevel: activityLevelEnum('activityLevel').default('low'),
techPreferences: text("tech_preferences"), // JSON: 技术偏好
// 统计
messageCount: integer("message_count").default(0),
questionCount: integer("question_count").default(0),
lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
// 黑名单检查
isBlacklisted: smallint("is_blacklisted").default(0),
blacklistReason: text("blacklist_reason"),
// 时间戳
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
index("idx_community_members_external").on(table.externalId, table.platform),
index("idx_community_members_customer").on(table.customerId),
index("idx_community_members_status").on(table.status),
]);

/**
 * 社群消息表 - 记录群内消息及审批状态
 * 支持托管回复和直接回复两种模式
 */
export const communityMessages = pgTable("community_messages", {
id: serial('id').primaryKey(),
// 消息来源
memberId: integer("member_id").notNull(), // 发送者
messageType: messageTypeEnum('messageType').default('question').notNull(),
direction: directionEnum('direction').default('inbound').notNull(), // 入站(客户)或出站(GRT)
// 消息内容
content: text().notNull(),
contentType: contentTypeEnum2('contentType').default('text').notNull(),
attachments: text(), // JSON数组: 附件URL列表
// 审批流程
approvalStatus: supervisorApprovalEnum('approvalStatus').default('pending').notNull(),
approvedBy: integer("approved_by"),
approvedAt: timestamp("approved_at", { mode: 'string' }),
rejectionReason: text("rejection_reason"),
// AI辅助
aiDraftContent: text("ai_draft_content"), // AI生成的草稿
aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }), // AI置信度
aiSuggestions: text("ai_suggestions"), // JSON: AI建议
// 敏感词检查
sensitiveWordsDetected: text("sensitive_words_detected"), // JSON数组
sensitiveCheckPassed: smallint("sensitive_check_passed").default(1),
// 发布状态
publishStatus: publishStatusEnum('publishStatus').default('draft').notNull(),
publishedAt: timestamp("published_at", { mode: 'string' }),
// 关联
replyToMessageId: integer("reply_to_message_id"), // 回复的消息ID
threadId: varchar("thread_id", { length: 100 }), // 会话线程ID
// 时间戳
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
index("idx_community_messages_member").on(table.memberId),
index("idx_community_messages_approval").on(table.approvalStatus),
index("idx_community_messages_publish").on(table.publishStatus),
index("idx_community_messages_thread").on(table.threadId),
]);

/**
 * 知识推送库 - 存储待推送的技术文章和案例
 * 所有内容必须先"上架"，严禁直接转发未审核文件
 */
export const contentLibrary = pgTable("content_library", {
id: serial('id').primaryKey(),
// 内容信息
title: varchar({ length: 200 }).notNull(),
summary: text(),
content: text().notNull(),
contentType: contentTypeEnum3('contentType').default('article').notNull(),
category: varchar({ length: 100 }), // 分类: 清洗技术/保养维护/故障排查
tags: text(), // JSON数组: 标签
// 来源
sourceType: sourceTypeEnum3('sourceType').default('manual').notNull(),
sourceId: varchar("source_id", { length: 100 }), // 来源ID
authorId: integer("author_id"), // 作者
// 脱敏状态
desensitizationStatus: desensitizationStatusEnum('desensitizationStatus').default('pending').notNull(),
desensitizedContent: text("desensitized_content"), // 脱敏后内容
sensitiveItemsRemoved: text("sensitive_items_removed"), // JSON: 移除的敏感项
// 审批流程
approvalStatus: reviewStatusEnum('approvalStatus').default('draft').notNull(),
approvedBy: integer("approved_by"),
approvedAt: timestamp("approved_at", { mode: 'string' }),
// 推送计划
scheduleType: scheduleTypeEnum('scheduleType').default('immediate'),
scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
recurringRule: varchar("recurring_rule", { length: 100 }), // cron表达式
// 推送状态
pushStatus: pushStatusEnum('pushStatus').default('unpublished').notNull(),
pushedAt: timestamp("pushed_at", { mode: 'string' }),
pushCount: integer("push_count").default(0),
// 统计
viewCount: integer("view_count").default(0),
likeCount: integer("like_count").default(0),
shareCount: integer("share_count").default(0),
// 时间戳
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
index("idx_content_library_type").on(table.contentType),
index("idx_content_library_approval").on(table.approvalStatus),
index("idx_content_library_push").on(table.pushStatus),
]);

/**
 * 交互日志表 - 记录群内所有提问及GRT官方回复
 * 作为审计依据
 */
export const interactionLogs = pgTable("interaction_logs", {
id: serial('id').primaryKey(),
// 交互信息
interactionType: interactionTypeEnum1('interactionType').default('question').notNull(),
memberId: integer("member_id").notNull(),
messageId: integer("message_id"), // 关联消息
// 内容
originalContent: text("original_content").notNull(), // 原始内容
processedContent: text("processed_content"), // 处理后内容
responseContent: text("response_content"), // 回复内容
responseBy: integer("response_by"), // 回复人
responseMode: responseModeEnum('responseMode').default('ai_assisted'),
// 分类与标签
category: varchar({ length: 100 }),
priority: priorityEnum5('priority').default('medium'),
sentiment: sentimentEnum('sentiment').default('neutral'),
// 商机转化
isLeadConverted: smallint("is_lead_converted").default(0),
leadId: integer("lead_id"), // 关联CRM商机
// 合规检查
complianceStatus: complianceStatusEnum('complianceStatus').default('unchecked').notNull(),
complianceNotes: text("compliance_notes"),
// 时间戳
responseTime: integer("response_time"), // 响应时间(秒)
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
resolvedAt: timestamp("resolved_at", { mode: 'string' }),
},
(table) => [
index("idx_interaction_logs_member").on(table.memberId),
index("idx_interaction_logs_type").on(table.interactionType),
index("idx_interaction_logs_compliance").on(table.complianceStatus),
]);

/**
 * 敏感词库表 - 配置拦截词库
 * 防止泄露底价、回扣、客户私有配方等敏感信息
 */
export const sensitiveWords = pgTable("sensitive_words", {
id: serial('id').primaryKey(),
// 敏感词信息
word: varchar({ length: 100 }).notNull(),
category: categoryEnum5('category').default('other').notNull(),
severity: riskLevelEnum('severity').default('medium').notNull(),
// 匹配规则
matchType: matchTypeEnum('matchType').default('contains').notNull(),
regexPattern: varchar("regex_pattern", { length: 500 }),
// 处理方式
action: actionEnum1('action').default('block').notNull(),
replacementText: varchar("replacement_text", { length: 200 }),
// 状态
isActive: smallint("is_active").default(1).notNull(),
// 统计
triggerCount: integer("trigger_count").default(0),
lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
// 时间戳
createdBy: integer("created_by"),
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
index("idx_sensitive_words_category").on(table.category),
index("idx_sensitive_words_active").on(table.isActive),
]);

/**
 * 社群统计表 - 记录社群运营数据
 */
export const communityStats = pgTable("community_stats", {
id: serial('id').primaryKey(),
// 统计维度
statDate: date("stat_date").notNull(),
statType: statTypeEnum('statType').default('daily').notNull(),
// 成员统计
totalMembers: integer("total_members").default(0),
newMembers: integer("new_members").default(0),
activeMembers: integer("active_members").default(0),
bannedMembers: integer("banned_members").default(0),
// 消息统计
totalMessages: integer("total_messages").default(0),
inboundMessages: integer("inbound_messages").default(0),
outboundMessages: integer("outbound_messages").default(0),
questionsAsked: integer("questions_asked").default(0),
questionsAnswered: integer("questions_answered").default(0),
// 内容统计
contentPushed: integer("content_pushed").default(0),
contentViews: integer("content_views").default(0),
contentLikes: integer("content_likes").default(0),
// 审批统计
messagesApproved: integer("messages_approved").default(0),
messagesRejected: integer("messages_rejected").default(0),
sensitiveWordsBlocked: integer("sensitive_words_blocked").default(0),
// 转化统计
leadsGenerated: integer("leads_generated").default(0),
leadsConverted: integer("leads_converted").default(0),
// 响应时间
avgResponseTime: integer("avg_response_time").default(0), // 秒
// 时间戳
createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
index("idx_community_stats_date").on(table.statDate, table.statType),
]);

// ==================== 商机管理表 ====================

// 商机表
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  source: varchar('source').default("other"),
  status: varchar('status').default("new"),
  priority: varchar('priority').default("medium"),
  estimatedAmount: decimal("estimated_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  assignedTo: integer("assigned_to"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  aiAnalysis: text("ai_analysis"),
  lastContactAt: timestamp("last_contact_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  importLogId: integer("import_log_id"),
  crmCustomerId: integer("crm_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 商机导入日志表
export const leadImportLogs = pgTable("lead_import_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  totalRows: integer("total_rows").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  status: varchar('status').default("processing"),
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// 商机跟进任务表
export const leadFollowUpTasks = pgTable("lead_follow_up_tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  assignedTo: integer("assigned_to"),
  taskType: varchar('taskType').default("call"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar('status').default("pending"),
  priority: varchar('priority').default("medium"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 商机提醒表
export const leadReminders = pgTable("lead_reminders", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  userId: integer("user_id").notNull(),
  reminderType: varchar('reminderType').default("no_follow_up"),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 商机CRM同步日志表
export const leadCrmSyncLogs = pgTable("lead_crm_sync_logs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  crmCustomerId: integer("crm_customer_id"),
  action: varchar('action').notNull(),
  status: varchar('status').default("success"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ==================== v1.3.14 新增表 ====================

// 报表模板表
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar('category').default("custom"),
  reportTypes: text("report_types").notNull(), // JSON: ['summary', 'funnel', 'trend', 'source', 'performance']
  layout: text("layout"), // JSON: 布局配置
  styling: text("styling"), // JSON: 样式配置
  filters: text("filters"), // JSON: 默认筛选条件
  isDefault: smallint("is_default").default(0),
  isPublic: smallint("is_public").default(0),
  createdBy: integer("created_by"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 导入历史记录表
export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  importType: varchar('importType').notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  filePath: varchar("file_path", { length: 500 }),
  totalRows: integer("total_rows").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  fieldMapping: text("field_mapping"), // JSON: 字段映射配置
  errorLog: text("error_log"), // JSON: 错误详情
  importedData: text("imported_data"), // JSON: 导入的数据ID列表（用于回滚）
  status: varchar('status').default("pending"),
  rollbackAt: timestamp("rollback_at"),
  rollbackBy: integer("rollback_by"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// 任务执行日志表
export const taskExecutionLogs = pgTable("task_execution_logs", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 100 }).notNull(),
  taskName: varchar("task_name", { length: 200 }).notNull(),
  taskType: varchar('taskType').default("cron"),
  cronExpression: varchar("cron_expression", { length: 100 }),
  status: varchar('status').default("running"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // 执行时长（毫秒）
  inputParams: text("input_params"), // JSON: 输入参数
  outputResult: text("output_result"), // JSON: 输出结果
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  retryCount: integer("retry_count").default(0),
  triggeredBy: varchar("triggered_by", { length: 100 }), // 触发者（用户ID或system）
  metadata: text("metadata"), // JSON: 其他元数据
  createdAt: timestamp("created_at").defaultNow(),
});


// ============================================================================
// 出差辅助支持系统与财务报销系统 (Travel & Expense System)
// v4.5.0 - 2026-01-25
// ============================================================================

// 国家档案表 - 存储各国出差相关信息
export const countryProfiles = pgTable("country_profiles", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 3 }).notNull(), // ISO 3166-1 alpha-3
  countryNameEn: varchar("country_name_en", { length: 100 }).notNull(),
  countryNameZh: varchar("country_name_zh", { length: 100 }),
  region: varchar('region').notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(), // ISO 4217
  visaRequired: smallint("visa_required").default(1),
  visaLeadTimeDays: integer("visa_lead_time_days").default(14),
  healthRequirements: text("health_requirements"), // JSON: 健康要求
  safetyRating: varchar('safetyRating').default("low"),
  emergencyContacts: text("emergency_contacts"), // JSON: 紧急联系人
  localHolidays: text("local_holidays"), // JSON: 当地节假日
  businessCulture: text("business_culture"), // 商务文化注意事项
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 现场要求表 - 客户现场特殊要求
export const siteRequirements = pgTable("site_requirements", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(), // 关联客户
  siteName: varchar("site_name", { length: 200 }).notNull(),
  siteAddress: text("site_address"),
  countryId: integer("country_id"), // 关联国家档案
  accessRequirements: text("access_requirements"), // JSON: 门禁要求
  safetyRequirements: text("safety_requirements"), // JSON: 安全要求
  requiredCertifications: text("required_certifications"), // JSON: 所需资质
  dresscode: varchar("dresscode", { length: 200 }),
  parkingInfo: text("parking_info"),
  contactPerson: varchar("contact_person", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  specialNotes: text("special_notes"),
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 资质记录表 - 员工资质证书
export const qualificationRecords = pgTable("qualification_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // 关联用户
  qualificationType: varchar('qualificationType').notNull(),
  qualificationName: varchar("qualification_name", { length: 200 }).notNull(),
  issuingAuthority: varchar("issuing_authority", { length: 200 }),
  documentNumber: varchar("document_number", { length: 100 }),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  countryScope: varchar("country_scope", { length: 200 }), // 适用国家范围
  documentUrl: varchar("document_url", { length: 500 }), // 证书扫描件
  verificationStatus: varchar('verificationStatus').default("pending"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  reminderDays: integer("reminder_days").default(30), // 到期提醒天数
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 出差申请表
export const tripRequests = pgTable("trip_requests", {
  id: serial("id").primaryKey(),
  requestCode: varchar("request_code", { length: 50 }).notNull(), // 申请编号 TR-YYYYMMDD-XXX
  userId: integer("user_id").notNull(), // 申请人
  departmentId: integer("department_id"),
  tripPurpose: varchar('tripPurpose').notNull(),
  projectId: integer("project_id"), // 关联项目
  customerId: integer("customer_id"), // 关联客户
  destinationCountryId: integer("destination_country_id"),
  destinationCity: varchar("destination_city", { length: 100 }),
  siteId: integer("site_id"), // 关联现场要求
  plannedStartDate: date("planned_start_date").notNull(),
  plannedEndDate: date("planned_end_date").notNull(),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  tripDays: integer("trip_days"),
  isInternational: smallint("is_international").default(0),
  isFirstInternational: smallint("is_first_international").default(0), // 首次国际出差
  requiresDriving: smallint("requires_driving").default(0),
  requiresVisa: smallint("requires_visa").default(0),
  estimatedBudget: decimal("estimated_budget", { precision: 12, scale: 2 }),
  budgetCurrency: varchar("budget_currency", { length: 3 }).default("CNY"),
  justification: text("justification"), // 出差理由
  status: varchar('status').default("draft"),
  approvalChain: text("approval_chain"), // JSON: 审批链
  currentApprover: integer("current_approver"),
  managerApprovedAt: timestamp("manager_approved_at"),
  managerApprovedBy: integer("manager_approved_by"),
  adminProcessedAt: timestamp("admin_processed_at"),
  adminProcessedBy: integer("admin_processed_by"),
  rejectionReason: text("rejection_reason"),
  travelPackageUrl: varchar("travel_package_url", { length: 500 }), // 出差包下载链接
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 行程安排表
export const tripItineraries = pgTable("trip_itineraries", {
  id: serial("id").primaryKey(),
  tripRequestId: integer("trip_request_id").notNull(), // 关联出差申请
  sequenceNo: integer("sequence_no").notNull(), // 行程顺序
  itineraryDate: date("itinerary_date").notNull(),
  itineraryType: varchar('itineraryType').notNull(),
  fromLocation: varchar("from_location", { length: 200 }),
  toLocation: varchar("to_location", { length: 200 }),
  startTime: time("start_time"),
  endTime: time("end_time"),
  description: text("description"),
  bookingRequired: smallint("booking_required").default(0),
  bookingStatus: varchar('bookingStatus').default("not_required"),
  bookingReference: varchar("booking_reference", { length: 100 }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 预订记录表
export const tripBookings = pgTable("trip_bookings", {
  id: serial("id").primaryKey(),
  tripRequestId: integer("trip_request_id").notNull(),
  itineraryId: integer("itinerary_id"), // 关联行程
  bookingType: varchar('bookingType').notNull(),
  bookingChannel: varchar("booking_channel", { length: 100 }), // 预订渠道
  bookingReference: varchar("booking_reference", { length: 100 }),
  supplierName: varchar("supplier_name", { length: 200 }),
  supplierConfirmation: varchar("supplier_confirmation", { length: 100 }),
  bookingDetails: text("booking_details"), // JSON: 预订详情
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  departureTime: timestamp("departure_time"),
  arrivalTime: timestamp("arrival_time"),
  seatClass: varchar("seat_class", { length: 50 }),
  roomType: varchar("room_type", { length: 100 }),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  paymentStatus: varchar('paymentStatus').default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  invoiceRequired: smallint("invoice_required").default(1),
  invoiceReceived: smallint("invoice_received").default(0),
  cancellationPolicy: text("cancellation_policy"),
  status: varchar('status').default("pending"),
  bookedBy: integer("booked_by"),
  bookedAt: timestamp("booked_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 保险政策表
export const insurancePolicies = pgTable("insurance_policies", {
  id: serial("id").primaryKey(),
  policyName: varchar("policy_name", { length: 200 }).notNull(),
  policyType: varchar('policyType').notNull(),
  insurerName: varchar("insurer_name", { length: 200 }).notNull(),
  policyNumber: varchar("policy_number", { length: 100 }),
  coverageScope: text("coverage_scope"), // JSON: 保障范围
  coverageAmount: decimal("coverage_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  premiumPerDay: decimal("premium_per_day", { precision: 8, scale: 2 }),
  applicableRegions: text("applicable_regions"), // JSON: 适用地区
  exclusions: text("exclusions"), // 除外责任
  claimProcess: text("claim_process"), // 理赔流程
  emergencyHotline: varchar("emergency_hotline", { length: 50 }),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  isDefault: smallint("is_default").default(0),
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 出差保险记录表
export const tripInsuranceRecords = pgTable("trip_insurance_records", {
  id: serial("id").primaryKey(),
  tripRequestId: integer("trip_request_id").notNull(),
  policyId: integer("policy_id").notNull(),
  userId: integer("user_id").notNull(),
  coverageStartDate: date("coverage_start_date").notNull(),
  coverageEndDate: date("coverage_end_date").notNull(),
  premiumAmount: decimal("premium_amount", { precision: 8, scale: 2 }),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  certificateUrl: varchar("certificate_url", { length: 500 }),
  status: varchar('status').default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 驾驶审批表
export const drivingApprovals = pgTable("driving_approvals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tripRequestId: integer("trip_request_id"), // 可选关联出差申请
  approvalType: varchar('approvalType').notNull(),
  licenseType: varchar("license_type", { length: 50 }), // 驾照类型
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiryDate: date("license_expiry_date"),
  licenseCountry: varchar("license_country", { length: 3 }), // 驾照签发国
  drivingExperienceYears: integer("driving_experience_years"),
  safetyTestScore: integer("safety_test_score"), // 安全考试分数
  safetyTestDate: date("safety_test_date"),
  safetyTestPassed: smallint("safety_test_passed").default(0),
  approvalScope: text("approval_scope"), // JSON: 批准范围（国家/车型）
  approvalValidFrom: date("approval_valid_from"),
  approvalValidTo: date("approval_valid_to"),
  status: varchar('status').default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 租车记录表
export const vehicleRentals = pgTable("vehicle_rentals", {
  id: serial("id").primaryKey(),
  tripRequestId: integer("trip_request_id").notNull(),
  bookingId: integer("booking_id"), // 关联预订记录
  drivingApprovalId: integer("driving_approval_id"), // 关联驾驶审批
  rentalCompany: varchar("rental_company", { length: 200 }),
  vehicleCategory: varchar("vehicle_category", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  licensePlate: varchar("license_plate", { length: 50 }),
  pickupLocation: varchar("pickup_location", { length: 200 }),
  pickupTime: timestamp("pickup_time"),
  returnLocation: varchar("return_location", { length: 200 }),
  returnTime: timestamp("return_time"),
  actualReturnTime: timestamp("actual_return_time"),
  mileageStart: integer("mileage_start"),
  mileageEnd: integer("mileage_end"),
  fuelLevelStart: varchar("fuel_level_start", { length: 20 }),
  fuelLevelEnd: varchar("fuel_level_end", { length: 20 }),
  rentalCost: decimal("rental_cost", { precision: 10, scale: 2 }),
  fuelCost: decimal("fuel_cost", { precision: 10, scale: 2 }),
  tollsCost: decimal("tolls_cost", { precision: 10, scale: 2 }),
  otherCosts: decimal("other_costs", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  insuranceIncluded: smallint("insurance_included").default(1),
  damageReported: smallint("damage_reported").default(0),
  damageDetails: text("damage_details"),
  status: varchar('status').default("reserved"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 驾驶违章/事故记录表
export const drivingIncidents = pgTable("driving_incidents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vehicleRentalId: integer("vehicle_rental_id"),
  tripRequestId: integer("trip_request_id"),
  incidentType: varchar('incidentType').notNull(),
  incidentDate: timestamp("incident_date").notNull(),
  location: varchar("location", { length: 200 }),
  description: text("description"),
  severity: varchar('severity').default("minor"),
  fineAmount: decimal("fine_amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  pointsDeducted: integer("points_deducted"),
  insuranceClaim: smallint("insurance_claim").default(0),
  claimAmount: decimal("claim_amount", { precision: 10, scale: 2 }),
  evidenceUrls: text("evidence_urls"), // JSON: 证据文件
  policeReportNumber: varchar("police_report_number", { length: 100 }),
  resolution: text("resolution"),
  status: varchar('status').default("reported"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 出差知识库表
export const travelKnowledge = pgTable("travel_knowledge", {
  id: serial("id").primaryKey(),
  knowledgeType: varchar('knowledgeType').notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  countryId: integer("country_id"), // 关联国家
  customerId: integer("customer_id"), // 关联客户
  siteId: integer("site_id"), // 关联现场
  tags: text("tags"), // JSON: 标签
  accessLevel: varchar('accessLevel').default("internal"),
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  isVerified: smallint("is_verified").default(0),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 路线模板表
export const routeTemplates = pgTable("route_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 200 }).notNull(),
  description: text("description"),
  originCity: varchar("origin_city", { length: 100 }).notNull(),
  destinationCity: varchar("destination_city", { length: 100 }).notNull(),
  destinationCountryId: integer("destination_country_id"),
  customerId: integer("customer_id"), // 关联客户
  siteId: integer("site_id"), // 关联现场
  typicalDuration: integer("typical_duration"), // 典型天数
  recommendedItinerary: text("recommended_itinerary"), // JSON: 推荐行程
  preferredFlights: text("preferred_flights"), // JSON: 推荐航班
  preferredHotels: text("preferred_hotels"), // JSON: 推荐酒店
  preferredTransport: text("preferred_transport"), // JSON: 推荐交通
  estimatedBudget: decimal("estimated_budget", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 费用政策表
export const expensePolicies = pgTable("expense_policies", {
  id: serial("id").primaryKey(),
  policyCode: varchar("policy_code", { length: 50 }).notNull(),
  policyName: varchar("policy_name", { length: 200 }).notNull(),
  description: text("description"),
  policyType: varchar('policyType').notNull(),
  applicableRegion: varchar('applicableRegion').default("all"),
  applicableCountries: text("applicable_countries"), // JSON: 适用国家列表
  applicableRoles: text("applicable_roles"), // JSON: 适用角色
  applicableDepartments: text("applicable_departments"), // JSON: 适用部门
  dailyLimit: decimal("daily_limit", { precision: 10, scale: 2 }),
  perItemLimit: decimal("per_item_limit", { precision: 10, scale: 2 }),
  tripLimit: decimal("trip_limit", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  requiresReceipt: smallint("requires_receipt").default(1),
  requiresPreApproval: smallint("requires_pre_approval").default(0),
  preApprovalThreshold: decimal("pre_approval_threshold", { precision: 10, scale: 2 }),
  allowedCategories: text("allowed_categories"), // JSON: 允许的费用类别
  excludedCategories: text("excluded_categories"), // JSON: 排除的费用类别
  specialRules: text("special_rules"), // JSON: 特殊规则
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 费用申请表扩展字段已合并到上方的expenseClaims表定义中

// 费用明细表
export const expenseLineItems = pgTable("expense_line_items", {
  id: serial("id").primaryKey(),
  expenseClaimId: integer("expense_claim_id").notNull(), // 关联费用申请
  lineNumber: integer("line_number").notNull(),
  expenseDate: date("expense_date").notNull(),
  expenseCategory: varchar('expenseCategory').notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  vendor: varchar("vendor", { length: 200 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("CNY"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  localAmount: decimal("local_amount", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  policyId: integer("policy_id"), // 关联费用政策
  withinPolicy: smallint("within_policy").default(1),
  policyExceededAmount: decimal("policy_exceeded_amount", { precision: 10, scale: 2 }),
  policyExceededReason: text("policy_exceeded_reason"),
  receiptRequired: smallint("receipt_required").default(1),
  receiptProvided: smallint("receipt_provided").default(0),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceValidated: smallint("invoice_validated").default(0),
  aiValidationResult: text("ai_validation_result"), // JSON: AI验证结果
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 发票验证表
export const invoiceValidations = pgTable("invoice_validations", {
  id: serial("id").primaryKey(),
  expenseLineItemId: integer("expense_line_item_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceCode: varchar("invoice_code", { length: 50 }),
  invoiceDate: date("invoice_date"),
  invoiceType: varchar('invoiceType'),
  sellerName: varchar("seller_name", { length: 200 }),
  sellerTaxId: varchar("seller_tax_id", { length: 50 }),
  buyerName: varchar("buyer_name", { length: 200 }),
  buyerTaxId: varchar("buyer_tax_id", { length: 50 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  ocrResult: text("ocr_result"), // JSON: OCR识别结果
  ocrConfidence: integer("ocr_confidence"), // OCR置信度 0-100
  taxSystemValidation: smallint("tax_system_validation"), // 税务系统验证结果
  taxSystemResponse: text("tax_system_response"), // JSON: 税务系统响应
  duplicateCheck: smallint("duplicate_check").default(0), // 是否重复
  duplicateClaimId: integer("duplicate_claim_id"), // 重复的报销单
  validationStatus: varchar('validationStatus').default("pending"),
  validationErrors: text("validation_errors"), // JSON: 验证错误
  manualOverride: smallint("manual_override").default(0),
  overrideBy: integer("override_by"),
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 通知规则表
export const travelNotificationRules = pgTable("travel_notification_rules", {
  id: serial("id").primaryKey(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull(),
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  description: text("description"),
  eventType: varchar('eventType').notNull(),
  triggerConditions: text("trigger_conditions"), // JSON: 触发条件
  recipientType: varchar('recipientType').notNull(),
  customRecipients: text("custom_recipients"), // JSON: 自定义接收人
  channels: text("channels"), // JSON: 通知渠道 ["in_app", "email", "sms", "whatsapp"]
  regionRouting: text("region_routing"), // JSON: 区域路由配置
  templateId: integer("template_id"), // 关联消息模板
  priority: varchar('priority').default("normal"),
  sendTiming: varchar('sendTiming').default("immediate"),
  scheduledTime: time("scheduled_time"),
  batchInterval: integer("batch_interval"), // 批量发送间隔（分钟）
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 通知事件表
export const travelNotificationEvents = pgTable("travel_notification_events", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull(), // 关联通知规则
  eventType: varchar("event_type", { length: 50 }).notNull(),
  sourceType: varchar("source_type", { length: 50 }), // trip_request, expense_claim等
  sourceId: integer("source_id"),
  eventData: text("event_data"), // JSON: 事件数据
  recipientUserId: integer("recipient_user_id"),
  recipientEmail: varchar("recipient_email", { length: 200 }),
  recipientPhone: varchar("recipient_phone", { length: 50 }),
  status: varchar('status').default("pending"),
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 通知发送表
export const travelNotificationDispatches = pgTable("travel_notification_dispatches", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // 关联通知事件
  channel: varchar('channel').notNull(),
  recipientAddress: varchar("recipient_address", { length: 200 }).notNull(), // 邮箱/手机号/WhatsApp ID
  templateId: integer("template_id"),
  messageContent: text("message_content"),
  messageSubject: varchar("message_subject", { length: 200 }),
  language: varchar("language", { length: 10 }).default("zh-CN"),
  providerRequestId: varchar("provider_request_id", { length: 100 }), // 供应商请求ID
  providerResponse: text("provider_response"), // JSON: 供应商响应
  status: varchar('status').default("pending"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 确认记录表
export const travelAcknowledgements = pgTable("travel_acknowledgements", {
  id: serial("id").primaryKey(),
  acknowledgementType: varchar('acknowledgementType').notNull(),
  sourceType: varchar("source_type", { length: 50 }), // trip_request, expense_claim等
  sourceId: integer("source_id"),
  userId: integer("user_id").notNull(),
  requiredBy: timestamp("required_by"), // 要求确认的截止时间
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgementMethod: varchar('acknowledgementMethod'),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: varchar("user_agent", { length: 500 }),
  signatureUrl: varchar("signature_url", { length: 500 }), // 电子签名
  comments: text("comments"),
  status: varchar('status').default("pending"),
  waivedBy: integer("waived_by"),
  waivedReason: text("waived_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// AI审计日志表
export const aiExpenseAuditLogs = pgTable("ai_expense_audit_logs", {
  id: serial("id").primaryKey(),
  expenseClaimId: integer("expense_claim_id").notNull(),
  auditType: varchar('auditType').default("initial"),
  auditModel: varchar("audit_model", { length: 100 }), // 使用的AI模型
  inputData: text("input_data"), // JSON: 输入数据
  auditResult: text("audit_result"), // JSON: 审计结果
  overallScore: integer("overall_score"), // 总分 0-100
  riskLevel: varchar('riskLevel').default("low"),
  anomalies: text("anomalies"), // JSON: 发现的异常
  recommendations: text("recommendations"), // JSON: 建议
  comparisonWithTripPlan: text("comparison_with_trip_plan"), // JSON: 与出差计划对比
  historicalComparison: text("historical_comparison"), // JSON: 历史数据对比
  policyViolations: text("policy_violations"), // JSON: 政策违规
  duplicateFlags: text("duplicate_flags"), // JSON: 重复标记
  processingTimeMs: integer("processing_time_ms"),
  tokenUsage: integer("token_usage"),
  requiresHumanReview: smallint("requires_human_review").default(0),
  humanReviewedBy: integer("human_reviewed_by"),
  humanReviewedAt: timestamp("human_reviewed_at"),
  humanReviewResult: text("human_review_result"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 通知供应商配置表
export const notificationProviderConfigs = pgTable("notification_provider_configs", {
  id: serial("id").primaryKey(),
  providerType: varchar('providerType').notNull(),
  providerName: varchar("provider_name", { length: 100 }).notNull(),
  region: varchar('region').default("Global"),
  configuration: text("configuration"), // JSON: 加密的配置信息
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  rateLimitPerDay: integer("rate_limit_per_day").default(10000),
  currentUsageMinute: integer("current_usage_minute").default(0),
  currentUsageDay: integer("current_usage_day").default(0),
  lastResetMinute: timestamp("last_reset_minute"),
  lastResetDay: timestamp("last_reset_day"),
  healthStatus: varchar('healthStatus').default("healthy"),
  lastHealthCheck: timestamp("last_health_check"),
  failureCount: integer("failure_count").default(0),
  isActive: smallint("is_active").default(1),
  isPrimary: smallint("is_primary").default(0), // 是否为主要供应商
  fallbackProviderId: integer("fallback_provider_id"), // 备用供应商
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// 区域路由映射表
export const regionRoutingMappings = pgTable("region_routing_mappings", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 3 }).notNull(), // ISO 3166-1 alpha-3
  region: varchar('region').notNull(),
  smsProviderId: integer("sms_provider_id"), // 短信供应商
  whatsappProviderId: integer("whatsapp_provider_id"), // WhatsApp供应商
  emailProviderId: integer("email_provider_id"), // 邮件供应商
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  phonePrefix: varchar("phone_prefix", { length: 10 }), // 国际电话区号
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});


// ==================== v2.5.10 对话历史持久化表 ====================

// AI对话会话表（持久化版本）
export const conversationSessions = pgTable("conversation_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull().unique(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).default("新对话"),
  status: varchar('status').default("active"),
  messageCount: integer("message_count").default(0),
  lastMessage: text("last_message"),
  topic: varchar("topic", { length: 100 }),
  tags: text("tags"), // JSON array
  summary: text("summary"),
  contextData: text("context_data"), // JSON object
  totalTokens: integer("total_tokens").default(0),
  averageLatency: integer("average_latency").default(0), // 平均响应延迟(ms)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_conv_sessions_user_id").on(table.userId),
  index("idx_conv_sessions_status").on(table.status),
  index("idx_conv_sessions_created_at").on(table.createdAt),
]);

// AI对话消息表（持久化版本）
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  messageId: varchar("message_id", { length: 64 }).notNull().unique(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  role: varchar('role').notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 50 }),
  tokens: integer("tokens"),
  latency: integer("latency"), // 响应延迟(ms)
  contextData: text("context_data"), // JSON object
  isDeleted: smallint("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_conv_messages_session_id").on(table.sessionId),
  index("idx_conv_messages_role").on(table.role),
  index("idx_conv_messages_created_at").on(table.createdAt),
]);

// 对话统计日报表
export const conversationDailyStats = pgTable("conversation_daily_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 64 }),
  statDate: date("stat_date").notNull(),
  sessionsCreated: integer("sessions_created").default(0),
  messagesCount: integer("messages_count").default(0),
  userMessagesCount: integer("user_messages_count").default(0),
  assistantMessagesCount: integer("assistant_messages_count").default(0),
  totalTokens: integer("total_tokens").default(0),
  averageLatency: integer("average_latency").default(0),
  topTopics: text("top_topics"), // JSON array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_conv_daily_stats_user_date").on(table.userId, table.statDate),
]);

// 模型性能监控记录表
export const modelPredictionRecords = pgTable("model_prediction_records", {
  id: serial("id").primaryKey(),
  predictionId: varchar("prediction_id", { length: 64 }).notNull().unique(),
  modelType: varchar('modelType').notNull(),
  modelVersion: varchar("model_version", { length: 20 }).notNull(),
  inputData: text("input_data"), // JSON
  predictedValue: decimal("predicted_value", { precision: 15, scale: 4 }),
  actualValue: decimal("actual_value", { precision: 15, scale: 4 }),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  latency: integer("latency"), // ms
  status: varchar('status').default("pending"),
  errorMargin: decimal("error_margin", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
}, (table) => [
  index("idx_model_pred_type").on(table.modelType),
  index("idx_model_pred_status").on(table.status),
  index("idx_model_pred_created_at").on(table.createdAt),
]);

// 模型性能告警配置表
export const modelAlertConfigs = pgTable("model_alert_configs", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id", { length: 64 }).notNull().unique(),
  modelType: varchar("model_type", { length: 50 }).notNull(),
  accuracyThreshold: decimal("accuracy_threshold", { precision: 5, scale: 4 }).default("0.80"),
  latencyThreshold: integer("latency_threshold").default(5000), // ms
  callsThreshold: integer("calls_threshold").default(100),
  notificationChannels: text("notification_channels"), // JSON array
  isEnabled: smallint("is_enabled").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});


// ==================== v2.5.24 M5生产制造阶段数据模型 ====================

// 生产工单表 (Production_Work_Order)
export const productionWorkOrders = pgTable("production_work_orders", {
  id: serial("id").primaryKey(),
  workOrderCode: varchar("work_order_code", { length: 50 }).notNull().unique(),
  projectId: integer("project_id"), // 关联项目
  productName: varchar("product_name", { length: 200 }).notNull(),
  productModel: varchar("product_model", { length: 100 }),
  quantity: integer("quantity").notNull().default(1),
  priority: varchar('priority').default("Normal"),
  status: varchar('status').default("Draft"),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default("0.00"),
  assignedTeam: varchar("assigned_team", { length: 100 }),
  supervisorId: integer("supervisor_id"),
  notes: text("notes"),
  bomId: integer("bom_id"), // 关联BOM
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_work_order_code").on(table.workOrderCode),
  index("idx_work_order_project").on(table.projectId),
  index("idx_work_order_status").on(table.status),
  index("idx_work_order_priority").on(table.priority),
]);

// 制造任务项表 (Mfg_Task_Item)
export const mfgTaskItems = pgTable("mfg_task_items", {
  id: serial("id").primaryKey(),
  taskCode: varchar("task_code", { length: 50 }).notNull().unique(),
  workOrderId: integer("work_order_id").notNull(), // 关联工单
  taskType: varchar('taskType').notNull(),
  taskName: varchar("task_name", { length: 200 }).notNull(),
  description: text("description"),
  sequence: integer("sequence").default(1), // 任务顺序
  status: varchar('status').default("Pending"),
  assignedWorkerId: integer("assigned_worker_id"),
  assignedWorkerName: varchar("assigned_worker_name", { length: 100 }),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  qcStatus: varchar('qcStatus'),
  qcInspectorId: integer("qc_inspector_id"),
  qcInspectorName: varchar("qc_inspector_name", { length: 100 }),
  qcTime: timestamp("qc_time"),
  qcNotes: text("qc_notes"),
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }), // 效率 = 预估/实际
  bomItemId: integer("bom_item_id"), // 关联BOM物料项
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_task_code").on(table.taskCode),
  index("idx_task_work_order").on(table.workOrderId),
  index("idx_task_type").on(table.taskType),
  index("idx_task_status").on(table.status),
  index("idx_task_worker").on(table.assignedWorkerId),
]);

// 工时打卡记录表 (Work_Log)
export const workLogs = pgTable("work_logs", {
  id: serial("id").primaryKey(),
  logCode: varchar("log_code", { length: 50 }).notNull().unique(),
  taskId: integer("task_id").notNull(), // 关联任务
  workerId: integer("worker_id").notNull(),
  workerName: varchar("worker_name", { length: 100 }),
  logType: varchar('logType').notNull(),
  logTime: timestamp("log_time").notNull(),
  location: varchar("location", { length: 200 }),
  deviceId: varchar("device_id", { length: 100 }), // 打卡设备ID
  gpsCoordinates: varchar("gps_coordinates", { length: 100 }),
  notes: text("notes"),
  duration: decimal("duration", { precision: 8, scale: 2 }), // 时长(小时)
  isManualEntry: smallint("is_manual_entry").default(0), // 是否手动录入
  approvedBy: integer("approved_by"), // 手动录入审批人
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_work_log_code").on(table.logCode),
  index("idx_work_log_task").on(table.taskId),
  index("idx_work_log_worker").on(table.workerId),
  index("idx_work_log_time").on(table.logTime),
]);

// ==================== v2.5.25 生产看板与质检集成 ====================

// 生产看板配置表
export const productionDashboardConfigs = pgTable("production_dashboard_configs", {
  id: serial("id").primaryKey(),
  configCode: varchar("config_code", { length: 50 }).notNull().unique(),
  configName: varchar("config_name", { length: 200 }).notNull(),
  displayType: varchar('displayType').default("workshop_board"),
  refreshInterval: integer("refresh_interval").default(30), // 刷新间隔(秒)
  showMetrics: text("show_metrics"), // JSON: 显示的指标列表
  layout: text("layout"), // JSON: 布局配置
  filterWorkshop: varchar("filter_workshop", { length: 100 }),
  filterTeam: varchar("filter_team", { length: 100 }),
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_dashboard_config_code").on(table.configCode),
]);

// 质检记录表
export const qcInspectionRecords = pgTable("qc_inspection_records", {
  id: serial("id").primaryKey(),
  inspectionCode: varchar("inspection_code", { length: 50 }).notNull().unique(),
  taskId: integer("task_id").notNull(), // 关联任务
  workOrderId: integer("work_order_id").notNull(), // 关联工单
  inspectionType: varchar('inspectionType').notNull(),
  inspectorId: integer("inspector_id").notNull(),
  inspectorName: varchar("inspector_name", { length: 100 }),
  inspectionTime: timestamp("inspection_time").notNull(),
  result: varchar('result').notNull(),
  defectType: varchar("defect_type", { length: 100 }),
  defectDescription: text("defect_description"),
  defectImages: text("defect_images"), // JSON: 缺陷图片URL列表
  correctiveAction: text("corrective_action"),
  reworkRequired: smallint("rework_required").default(0),
  reworkTaskId: integer("rework_task_id"), // 返工任务ID
  checklistItems: text("checklist_items"), // JSON: 检查项及结果
  qualityScore: integer("quality_score"), // 质量评分 0-100
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_qc_inspection_code").on(table.inspectionCode),
  index("idx_qc_task").on(table.taskId),
  index("idx_qc_work_order").on(table.workOrderId),
  index("idx_qc_result").on(table.result),
]);

// 工时异常预警规则表
export const workHourAlertRules = pgTable("work_hour_alert_rules", {
  id: serial("id").primaryKey(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull().unique(),
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  description: text("description"),
  taskType: varchar('taskType').default("All"),
  thresholdPercent: decimal("threshold_percent", { precision: 5, scale: 2 }).default("120.00"), // 超时阈值百分比
  alertLevel: varchar('alertLevel').default("Warning"),
  notificationChannels: text("notification_channels"), // JSON: 通知渠道
  recipients: text("recipients"), // JSON: 接收人列表
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_work_hour_rule_code").on(table.ruleCode),
]);

// 工时异常预警记录表
export const workHourAlertLogs = pgTable("work_hour_alert_logs", {
  id: serial("id").primaryKey(),
  alertCode: varchar("alert_code", { length: 50 }).notNull().unique(),
  ruleId: integer("rule_id").notNull(), // 关联规则
  taskId: integer("task_id").notNull(), // 关联任务
  workOrderId: integer("work_order_id").notNull(), // 关联工单
  workerId: integer("worker_id"),
  workerName: varchar("worker_name", { length: 100 }),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  overrunPercent: decimal("overrun_percent", { precision: 5, scale: 2 }),
  alertLevel: varchar('alertLevel').notNull(),
  alertTime: timestamp("alert_time").notNull(),
  status: varchar('status').default("Pending"),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  notificationsSent: text("notifications_sent"), // JSON: 已发送通知记录
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_work_hour_alert_code").on(table.alertCode),
  index("idx_work_hour_alert_task").on(table.taskId),
  index("idx_work_hour_alert_status").on(table.status),
]);

// 工人效率统计表
export const workerEfficiencyStats = pgTable("worker_efficiency_stats", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  workerName: varchar("worker_name", { length: 100 }),
  statDate: date("stat_date").notNull(),
  taskType: varchar('taskType'),
  tasksCompleted: integer("tasks_completed").default(0),
  totalEstimatedHours: decimal("total_estimated_hours", { precision: 10, scale: 2 }).default("0.00"),
  totalActualHours: decimal("total_actual_hours", { precision: 10, scale: 2 }).default("0.00"),
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }), // 效率 = 预估/实际 * 100
  qualityPassRate: decimal("quality_pass_rate", { precision: 5, scale: 2 }), // 质检通过率
  reworkCount: integer("rework_count").default(0),
  ranking: integer("ranking"), // 当日排名
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("worker_efficiency_stats_idx_worker_efficiency_worker").on(table.workerId),
  index("worker_efficiency_stats_idx_worker_efficiency_date").on(table.statDate),
  index("idx_worker_efficiency_ranking").on(table.ranking),
]);


// ==================== v2.5.34 GRT生命周期管理系统升级 (M1-M4 + M7-M9) ====================

// 交付执行表 (Delivery_Execution) - M7/M8/M9阶段管理
export const deliveryExecutions = pgTable("delivery_executions", {
  id: serial("id").primaryKey(),
  deliveryCode: varchar("delivery_code", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").notNull(), // 关联项目
  projectNo: varchar("project_no", { length: 50 }),
  
  // 客户信息
  customerId: integer("customer_id"), // 关联客户
  customerName: varchar("customer_name", { length: 200 }), // 客户名称
  
  currentStage: varchar('currentStage').notNull().default("M7_Pre_Acceptance"),
  
  // 计划日期
  plannedM7Date: timestamp("planned_m7_date"),
  plannedM8Date: timestamp("planned_m8_date"),
  plannedM9Date: timestamp("planned_m9_date"),
  
  // 实际日期
  actualM7Date: timestamp("actual_m7_date"),
  actualM8Date: timestamp("actual_m8_date"),
  actualM9Date: timestamp("actual_m9_date"),
  
  // M7 Gate检查结果
  m7GateResult: varchar('m7GateResult'),
  m7GateNotes: text("m7_gate_notes"),
  
  // M9验收结果
  m9AcceptanceResult: varchar('m9AcceptanceResult'),
  m9AcceptanceNotes: text("m9_acceptance_notes"),
  
  // 现场地址信息
  siteAddress: text("site_address"),
  siteContactName: varchar("site_contact_name", { length: 100 }),
  siteContactPhone: varchar("site_contact_phone", { length: 20 }),
  specialRequirements: text("special_requirements"),
  
  // M7预验收相关
  shippingCleanlinessReport: text("shipping_cleanliness_report"), // 发货清洁度报告文件URL
  shippingCleanlinessStatus: varchar('shippingCleanlinessStatus').default("Pending"),
  
  // 节拍验证
  cycleTimeActual: decimal("cycle_time_actual", { precision: 10, scale: 2 }), // 实际节拍(秒)
  cycleTimeTarget: decimal("cycle_time_target", { precision: 10, scale: 2 }), // 目标节拍(秒)
  cycleTimeVariance: decimal("cycle_time_variance", { precision: 5, scale: 2 }), // 节拍偏差(%)
  cycleTimeStatus: varchar('cycleTimeStatus').default("Pending"),
  
  // PLC数据日志
  plcDataLog: text("plc_data_log"), // JSON: {pressure, temp, vacuum, timestamp}[]
  plcDataStatus: varchar('plcDataStatus').default("Normal"),
  
  // 现场工程师
  siteEngineerId: integer("site_engineer_id"),
  siteEngineerName: varchar("site_engineer_name", { length: 100 }),
  siteEngineerPhone: varchar("site_engineer_phone", { length: 20 }),
  
  // 客户签收
  customerSignoff: text("customer_signoff"), // 签名图片URL
  customerSignoffName: varchar("customer_signoff_name", { length: 100 }),
  customerSignoffDate: timestamp("customer_signoff_date"),
  customerSignoffNotes: text("customer_signoff_notes"),
  
  // 状态管理
  status: varchar('status').default("Pending"),
  blockReason: text("block_reason"), // 阻塞原因
  
  // AI分析
  aiGatekeeperResult: text("ai_gatekeeper_result"), // JSON: AI守门员检查结果
  aiGatekeeperCheckedAt: timestamp("ai_gatekeeper_checked_at"),
  
  // 时间线
  m7StartDate: timestamp("m7_start_date"),
  m7CompletedDate: timestamp("m7_completed_date"),
  m8StartDate: timestamp("m8_start_date"),
  m8CompletedDate: timestamp("m8_completed_date"),
  m9StartDate: timestamp("m9_start_date"),
  m9CompletedDate: timestamp("m9_completed_date"),
  
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_delivery_code").on(table.deliveryCode),
  index("idx_delivery_project").on(table.projectId),
  index("idx_delivery_stage").on(table.currentStage),
  index("idx_delivery_status").on(table.status),
]);

// 现场问题工单表 (Site_Issue_Ticket) - M8/M9现场问题管理
export const siteIssueTickets = pgTable("site_issue_tickets", {
  id: serial("id").primaryKey(),
  ticketCode: varchar("ticket_code", { length: 50 }).notNull().unique(),
  deliveryId: integer("delivery_id").notNull(), // 关联交付执行
  projectId: integer("project_id"),
  
  // 问题分类
  issueCategory: varchar('issueCategory').notNull(),
  
  // 问题描述
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  photoEvidence: text("photo_evidence"), // JSON: 图片URL列表
  videoEvidence: text("video_evidence"), // JSON: 视频URL列表
  
  // 严重程度
  severity: varchar('severity').default("Medium"),
  priority: varchar('priority').default("P2"),
  
  // AI解决方案建议
  resolutionSop: text("resolution_sop"), // AI生成的解决方案
  aiAnalysisResult: text("ai_analysis_result"), // JSON: AI分析结果
  aiSuggestedAt: timestamp("ai_suggested_at"),
  
  // 实际解决方案
  actualResolution: text("actual_resolution"),
  rootCause: text("root_cause"),
  preventiveMeasure: text("preventive_measure"),
  
  // 责任人
  reportedById: integer("reported_by_id"),
  reportedByName: varchar("reported_by_name", { length: 100 }),
  assignedToId: integer("assigned_to_id"),
  assignedToName: varchar("assigned_to_name", { length: 100 }),
  
  // 状态
  status: varchar('status').default("Open"),
  
  // 关联设计/生产
  relatedDesignPackageId: integer("related_design_package_id"),
  relatedBomItemId: integer("related_bom_item_id"),
  
  // 时间
  reportedAt: timestamp("reported_at").defaultNow(),
  targetResolutionDate: timestamp("target_resolution_date"),
  actualResolutionDate: timestamp("actual_resolution_date"),
  
  // 成本影响
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_site_issue_code").on(table.ticketCode),
  index("idx_site_issue_delivery").on(table.deliveryId),
  index("idx_site_issue_category").on(table.issueCategory),
  index("idx_site_issue_status").on(table.status),
  index("idx_site_issue_severity").on(table.severity),
]);

// 设计协同包表 (Design_Package) - M1/M2/M3/M4设计管理
export const designPackages = pgTable("design_packages", {
  id: serial("id").primaryKey(),
  packageCode: varchar("package_code", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").notNull(), // 关联项目
  projectNo: varchar("project_no", { length: 50 }),
  
  // URS文档 (User Requirement Spec)
  ursDoc: text("urs_doc"), // 文件URL
  ursVersion: varchar("urs_version", { length: 20 }),
  ursUploadedAt: timestamp("urs_uploaded_at"),
  ursStatus: varchar('ursStatus').default("Draft"),
  
  // AI风险评估 (M1启动会)
  riskAssessmentAi: text("risk_assessment_ai"), // AI生成的风险分析 (RichText)
  riskLevel: varchar('riskLevel').default("Medium"),
  riskAssessmentGeneratedAt: timestamp("risk_assessment_generated_at"),
  
  // 机械BOM状态
  mechanicalBomStatus: varchar('mechanicalBomStatus').default("Draft"),
  mechanicalBomId: integer("mechanical_bom_id"), // 关联BOM
  mechanicalBomFrozenAt: timestamp("mechanical_bom_frozen_at"),
  mechanicalBomFrozenBy: integer("mechanical_bom_frozen_by"),
  
  // 电气IO列表
  electricalIoList: text("electrical_io_list"), // 文件URL
  electricalIoVersion: varchar("electrical_io_version", { length: 20 }),
  electricalIoStatus: varchar('electricalIoStatus').default("Draft"),
  
  // 报警列表 (Alarm List) - M4 SOP基础
  alarmList: text("alarm_list"), // JSON: [{code, description, cause, action}]
  alarmListVersion: varchar("alarm_list_version", { length: 20 }),
  alarmListUpdatedAt: timestamp("alarm_list_updated_at"),
  
  // 生成的技术文档 (AI Technical Writer)
  generatedManualsIds: text("generated_manuals_ids"), // JSON: Technical_Document IDs
  troubleshootingGuide: text("troubleshooting_guide"), // AI生成的故障排除指南
  maintenanceSop: text("maintenance_sop"), // AI生成的维护SOP
  aiDocGeneratedAt: timestamp("ai_doc_generated_at"),
  
  // 设计评审
  designReviewStatus: varchar('designReviewStatus').default("Pending"),
  designReviewNotes: text("design_review_notes"),
  
  // 特殊要求
  specialRequirements: text("special_requirements"), // JSON: 特殊要求列表
  customerStandards: text("customer_standards"), // 客户标准要求
  
  // 历史项目参考
  similarProjectIds: text("similar_project_ids"), // JSON: 相似项目ID列表
  historicalLessons: text("historical_lessons"), // AI提取的历史教训
  
  // 负责人
  designLeadId: integer("design_lead_id"),
  designLeadName: varchar("design_lead_name", { length: 100 }),
  mechanicalEngineerId: integer("mechanical_engineer_id"),
  electricalEngineerId: integer("electrical_engineer_id"),
  
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_design_package_code").on(table.packageCode),
  index("idx_design_package_project").on(table.projectId),
  index("idx_design_package_bom_status").on(table.mechanicalBomStatus),
  index("idx_design_package_risk_level").on(table.riskLevel),
]);

// 技术文档表 (Technical_Document) - M4自动生成的文档
export const technicalDocuments = pgTable("technical_documents", {
  id: serial("id").primaryKey(),
  docCode: varchar("doc_code", { length: 50 }).notNull().unique(),
  designPackageId: integer("design_package_id").notNull(), // 关联设计包
  projectId: integer("project_id"),
  
  // 文档类型
  docType: varchar('docType').notNull(),
  
  // 文档内容
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"), // RichText内容
  fileUrl: text("file_url"), // 生成的文件URL
  version: varchar("version", { length: 20 }).default("1.0"),
  
  // AI生成信息
  isAiGenerated: smallint("is_ai_generated").default(1),
  aiGeneratedAt: timestamp("ai_generated_at"),
  aiPromptUsed: text("ai_prompt_used"),
  aiSourceData: text("ai_source_data"), // JSON: 使用的源数据
  
  // 审核
  reviewStatus: varchar('reviewStatus').default("Draft"),
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // 语言
  language: varchar("language", { length: 10 }).default("zh-CN"),
  translations: text("translations"), // JSON: {lang: docId}
  
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_tech_doc_code").on(table.docCode),
  index("idx_tech_doc_design_package").on(table.designPackageId),
  index("idx_tech_doc_type").on(table.docType),
  index("idx_tech_doc_status").on(table.reviewStatus),
]);

// AI Agent执行日志表 - 记录所有AI Agent的执行
export const aiAgentExecutionLogs = pgTable("ai_agent_execution_logs", {
  id: serial("id").primaryKey(),
  executionCode: varchar("execution_code", { length: 50 }).notNull().unique(),
  
  // Agent类型
  agentType: varchar('agentType').notNull(),
  
  // 触发信息
  triggerType: varchar('triggerType').default("Auto"),
  triggerCondition: text("trigger_condition"), // 触发条件描述
  
  // 关联实体
  projectId: integer("project_id"),
  deliveryId: integer("delivery_id"),
  designPackageId: integer("design_package_id"),
  siteIssueId: integer("site_issue_id"),
  
  // 输入输出
  inputData: text("input_data"), // JSON: 输入数据
  outputData: text("output_data"), // JSON: 输出数据
  promptUsed: text("prompt_used"),
  
  // 执行结果
  status: varchar('status').default("Pending"),
  errorMessage: text("error_message"),
  
  // 性能指标
  executionTimeMs: integer("execution_time_ms"),
  tokensUsed: integer("tokens_used"),
  
  // 结果应用
  resultApplied: smallint("result_applied").default(0),
  resultAppliedAt: timestamp("result_applied_at"),
  resultAppliedBy: integer("result_applied_by"),
  
  executedAt: timestamp("executed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_agent_exec_code").on(table.executionCode),
  index("idx_ai_agent_exec_type").on(table.agentType),
  index("idx_ai_agent_exec_status").on(table.status),
  index("idx_ai_agent_exec_project").on(table.projectId),
]);


// AI Agent自动触发器配置表
export const aiAgentTriggers = pgTable("ai_agent_triggers", {
  id: serial("id").primaryKey(),
  triggerCode: varchar("trigger_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Agent类型
  agentType: varchar('agentType').notNull(),
  
  // 触发类型
  triggerType: varchar('triggerType').notNull(),
  
  // 触发条件 (JSON)
  triggerConditions: text("trigger_conditions"), // JSON: { stage: "M7", event: "issue_created", threshold: { field: "risk_score", operator: ">", value: 70 } }
  
  // 时间触发配置
  cronExpression: varchar("cron_expression", { length: 100 }), // 如 "0 9 * * 1" 每周一9点
  
  // 阶段触发配置
  triggerOnStages: text("trigger_on_stages"), // JSON: ["M1", "M7", "M8", "M9"]
  
  // 事件触发配置
  triggerOnEvents: text("trigger_on_events"), // JSON: ["project_created", "issue_created", "gate_failed"]
  
  // 执行配置
  inputTemplate: text("input_template"), // JSON模板，用于构建Agent输入
  autoApplyResult: smallint("auto_apply_result").default(0), // 是否自动应用结果
  
  // 通知配置
  notifyOnSuccess: smallint("notify_on_success").default(1),
  notifyOnFailure: smallint("notify_on_failure").default(1),
  notifyWebhookId: integer("notify_webhook_id"), // 关联webhook配置
  notifyRecipients: text("notify_recipients"), // JSON: 通知接收人列表
  
  // 状态
  isEnabled: smallint("is_enabled").default(1).notNull(),
  priority: integer("priority").default(0), // 优先级，数字越大优先级越高
  
  // 统计
  executionCount: integer("execution_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  lastExecutionStatus: varchar("last_execution_status", { length: 20 }),
  
  // 元数据
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_ai_trigger_code").on(table.triggerCode),
  index("idx_ai_trigger_agent_type").on(table.agentType),
  index("idx_ai_trigger_type").on(table.triggerType),
  index("idx_ai_trigger_enabled").on(table.isEnabled),
]);

// AI Agent触发器执行记录表
export const aiAgentTriggerExecutions = pgTable("ai_agent_trigger_executions", {
  id: serial("id").primaryKey(),
  triggerId: integer("trigger_id").notNull(),
  executionLogId: integer("execution_log_id"), // 关联ai_agent_execution_logs
  
  // 触发上下文
  triggerContext: text("trigger_context"), // JSON: 触发时的上下文数据
  triggerSource: varchar("trigger_source", { length: 100 }), // 触发来源（如 project_123, issue_456）
  
  // 执行结果
  status: varchar('status').default("Queued"),
  errorMessage: text("error_message"),
  
  // 通知状态
  notificationSent: smallint("notification_sent").default(0),
  notificationSentAt: timestamp("notification_sent_at"),
  
  // 时间戳
  queuedAt: timestamp("queued_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_trigger_exec_trigger").on(table.triggerId),
  index("idx_trigger_exec_status").on(table.status),
  index("idx_trigger_exec_log").on(table.executionLogId),
]);

// 类型导出
export type AiAgentTrigger = InferSelectModel<typeof aiAgentTriggers>;
export type InsertAiAgentTrigger = InferInsertModel<typeof aiAgentTriggers>;
export type AiAgentTriggerExecution = InferSelectModel<typeof aiAgentTriggerExecutions>;
export type InsertAiAgentTriggerExecution = InferInsertModel<typeof aiAgentTriggerExecutions>;


// ============ v2.5.37 Gate检查清单配置表 ============

export const gateChecklistItems = pgTable("gate_checklist_items", {
  id: serial('id').primaryKey(),
  gateStage: gateStageEnum('gateStage').notNull(),
  category: varchar({ length: 50 }).notNull(),
  item: varchar({ length: 200 }).notNull(),
  criteria: text(),
  weight: integer().default(5).notNull(),
  required: smallint().default(0).notNull(),
  sortOrder: integer().default(0).notNull(),
  isActive: smallint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export type GateChecklistItem = InferSelectModel<typeof gateChecklistItems>;
export type InsertGateChecklistItem = InferInsertModel<typeof gateChecklistItems>;


// ============ v2.5.43 GRT_AfterSales_Core 售后服务核心模块 ============

// 客户档案表 (clients)
export const afterSalesClients = pgTable("after_sales_clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  tier: varchar('tier').default("Standard").notNull(),
  
  // 联系信息
  contactPerson: varchar("contact_person", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 100 }),
  address: text("address"),
  
  // 业务信息
  industry: varchar("industry", { length: 100 }),
  region: varchar("region", { length: 100 }),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  
  // 服务等级协议
  slaLevel: varchar('slaLevel').default("Silver"),
  responseTimeHours: integer("response_time_hours").default(24),
  
  // 状态
  status: varchar('status').default("Active"),
  notes: text("notes"),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_client_name").on(table.name),
  index("idx_client_tier").on(table.tier),
  index("idx_client_status").on(table.status),
]);

// 设备资产表 (equipments)
export const afterSalesEquipments = pgTable("after_sales_equipments", {
  id: serial("id").primaryKey(),
  serialNumber: varchar("serial_number", { length: 100 }).notNull().unique(),
  modelName: varchar("model_name", { length: 200 }).notNull(),
  
  // 客户关联
  clientId: integer("client_id").notNull(),
  
  // 设备信息
  equipmentType: varchar("equipment_type", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  installationDate: date("installation_date"),
  warrantyEndDate: date("warranty_end_date"),
  
  // 维护信息
  lastMaintenanceDate: date("last_maintenance_date"),
  nextDueDate: date("next_due_date"),
  maintenanceCycleMonths: integer("maintenance_cycle_months").default(6),
  
  // 运行状态
  operationalStatus: varchar('operationalStatus').default("Running"),
  runningHours: integer("running_hours").default(0),
  
  // 位置信息
  location: varchar("location", { length: 200 }),
  department: varchar("department", { length: 100 }),
  
  // 技术参数
  technicalSpecs: text("technical_specs"), // JSON格式存储技术参数
  
  // 状态
  status: varchar('status').default("Active"),
  notes: text("notes"),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_equipment_serial").on(table.serialNumber),
  index("idx_equipment_client").on(table.clientId),
  index("after_sales_equipments_idx_equipment_model").on(table.modelName),
  index("idx_equipment_status").on(table.status),
  index("idx_equipment_next_due").on(table.nextDueDate),
]);

// 服务工单表 (service_logs)
export const afterSalesServiceLogs = pgTable("after_sales_service_logs", {
  id: serial("id").primaryKey(),
  ticketId: varchar("ticket_id", { length: 50 }).notNull().unique(),
  
  // 客户关联 (v2.5.46新增)
  clientId: integer("client_id"),
  
  // 设备关联
  equipmentId: integer("equipment_id").notNull(),
  
  // 服务信息
  serviceType: varchar('serviceType').notNull(),
  priority: varchar('priority').default("Medium"),
  
  // 服务日期 (v2.5.46新增)
  serviceDate: date("service_date"),
  
  // 问题描述
  issueDescription: text("issue_description"),
  issueCategory: varchar("issue_category", { length: 100 }),
  
  // 解决方案 (v2.5.46新增)
  resolution: text("resolution"),
  
  // 服务人员
  assignedEngineerId: integer("assigned_engineer_id"),
  assignedEngineerName: varchar("assigned_engineer_name", { length: 100 }),
  engineerName: varchar("engineer_name", { length: 100 }), // v2.5.46新增
  
  // 时间安排
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  estimatedDuration: integer("estimated_duration"), // 分钟
  
  // 执行信息
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  actualDuration: integer("actual_duration"), // 分钟
  
  // 工作内容
  workPerformed: text("work_performed"),
  partsUsed: text("parts_used"), // JSON格式存储使用的备件
  
  // 状态
  status: varchar('status').default("Pending").notNull(),
  
  // 完成信息
  completionDate: date("completion_date"),
  resolutionNotes: text("resolution_notes"),
  
  // 客户签字确认 (v2.5.46新增/扩展)
  signatureStatus: varchar('signatureStatus').default("pending"),
  signatureUrl: varchar("signature_url", { length: 500 }),
  signerName: varchar("signer_name", { length: 100 }),
  signedAt: timestamp("signed_at"),
  
  // 客户反馈 (扩展)
  customerSignature: varchar("customer_signature", { length: 200 }),
  customerFeedback: text("customer_feedback"),
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  rating: integer("rating"), // v2.5.46新增: 1-5星评分
  feedback: text("feedback"), // v2.5.46新增: 客户反馈
  
  // 费用
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_service_ticket").on(table.ticketId),
  index("idx_service_equipment").on(table.equipmentId),
  index("idx_service_type").on(table.serviceType),
  index("idx_service_status").on(table.status),
  index("idx_service_scheduled").on(table.scheduledDate),
  index("idx_service_engineer").on(table.assignedEngineerId),
  index("idx_service_client").on(table.clientId),
  index("idx_service_signature_status").on(table.signatureStatus),
]);

// 类型导出
export type AfterSalesClient = InferSelectModel<typeof afterSalesClients>;
export type InsertAfterSalesClient = InferInsertModel<typeof afterSalesClients>;
export type AfterSalesEquipment = InferSelectModel<typeof afterSalesEquipments>;
export type InsertAfterSalesEquipment = InferInsertModel<typeof afterSalesEquipments>;
export type AfterSalesServiceLog = InferSelectModel<typeof afterSalesServiceLogs>;
export type InsertAfterSalesServiceLog = InferInsertModel<typeof afterSalesServiceLogs>;

// ============ v2.5.55 售后服务工单附件/证据表 (Task #58) ============

export const serviceLogAttachments = pgTable("service_log_attachments", {
  id: serial("id").primaryKey(),
  serviceLogId: integer("service_log_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  description: text("description"),
  capturedAt: timestamp("captured_at"),
  gpsLatitude: varchar("gps_latitude", { length: 20 }),
  gpsLongitude: varchar("gps_longitude", { length: 20 }),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ServiceLogAttachment = InferSelectModel<typeof serviceLogAttachments>;
export type InsertServiceLogAttachment = InferInsertModel<typeof serviceLogAttachments>;



// ===== 重新导出权限系统表 =====
// 注意：userRoles 和 qualificationCertificates 已在 schema.ts 中定义，不需要重新导出
export {
  roles,
  permissions,
  rolePermissions,
  dataScopes,
  permissionAuditLogs,
  temporaryPermissions,
  userPermissions,
  permissionBlacklist,
  permissionConfigs,
  routePermissions,
} from './permission-schema';

// ===== 重新导出菜单导航系统表 =====
// 检查这些表是否已在 schema.ts 中定义
export {
  menuItems,
  menuPermissions,
  menuRoles,
  userMenuCustomization,
  menuConfigs,
  menuAccessLogs,
  menuSearchIndex,
} from './menu-schema';

// ===== 重新导出来访申请系统表 =====
// 检查这些表是否已在 schema.ts 中定义
export {
  visitorRequests,
  visitorDetails,
  approvalWorkflows,
  visitorPasses,
  countryRules,
  accessLogs,
} from './visitor-request-schema';


// ===== 安全审计日志表 =====
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial('id').primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  severity: riskLevelEnum('severity').default('medium').notNull(),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  userAgent: text("user_agent"),
  action: varchar({ length: 500 }).notNull(),
  resource: varchar({ length: 100 }),
  resourceId: varchar("resource_id", { length: 100 }),
  result: resultEnum('result').default('success').notNull(),
  details: text(),
  requestPath: varchar("request_path", { length: 500 }),
  requestMethod: varchar("request_method", { length: 10 }),
  fingerprint: varchar({ length: 64 }).notNull(),
  chainHash: varchar("chain_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_security_audit_event_type").on(table.eventType),
  index("idx_security_audit_severity").on(table.severity),
  index("idx_security_audit_user_id").on(table.userId),
  index("idx_security_audit_ip_address").on(table.ipAddress),
  index("idx_security_audit_created_at").on(table.createdAt),
]);

// ===== IP黑名单表 =====
export const ipBlacklist = pgTable("ip_blacklist", {
  id: serial('id').primaryKey(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  ipRange: varchar("ip_range", { length: 50 }),
  reason: varchar({ length: 500 }).notNull(),
  blockedBy: integer("blocked_by"),
  blockedAt: timestamp("blocked_at", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  isActive: boolean("is_active").default(true).notNull(),
  hitCount: integer("hit_count").default(0).notNull(),
  lastHitAt: timestamp("last_hit_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_ip_blacklist_ip_address").on(table.ipAddress),
  index("idx_ip_blacklist_is_active").on(table.isActive),
]);

// ===== 许可证管理表 =====
export const systemLicenses = pgTable("system_licenses", {
  id: serial('id').primaryKey(),
  licenseKey: varchar("license_key", { length: 255 }).notNull(),
  licenseType: licenseTypeEnum('licenseType').default('standard').notNull(),
  hardwareFingerprint: varchar("hardware_fingerprint", { length: 255 }),
  issuedTo: varchar("issued_to", { length: 200 }).notNull(),
  issuedAt: timestamp("issued_at", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  maxUsers: integer("max_users").default(10).notNull(),
  allowedFeatures: text("allowed_features"),
  deploymentType: deploymentTypeEnum('deploymentType').default('cloud').notNull(),
  status: statusEnum61('status').default('active').notNull(),
  lastValidatedAt: timestamp("last_validated_at", { mode: 'string' }),
  validationCount: integer("validation_count").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_system_licenses_license_key").on(table.licenseKey),
  index("idx_system_licenses_status").on(table.status),
]);

// ===== 安全配置表 =====
export const securityConfigs = pgTable("security_configs", {
  id: serial('id').primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  configValue: text("config_value").notNull(),
  configType: configTypeEnum('configType').default('string').notNull(),
  description: varchar({ length: 500 }),
  isEncrypted: boolean("is_encrypted").default(false).notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_security_configs_config_key").on(table.configKey),
]);

// ===== MFA配置表 =====
export const userMfaConfigs = pgTable("user_mfa_configs", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  mfaType: mfaTypeEnum('mfaType').default('totp').notNull(),
  secret: varchar({ length: 255 }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  backupCodes: text("backup_codes"),
  lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_mfa_configs_user_id").on(table.userId),
]);

// ===== 用户会话表 =====
export const userSessions = pgTable("user_sessions", {
  id: serial('id').primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  userId: integer("user_id").notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  geoLocation: json("geo_location"),
  isActive: boolean("is_active").default(true).notNull(),
  lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_sessions_session_id").on(table.sessionId),
  index("idx_user_sessions_user_id").on(table.userId),
  index("idx_user_sessions_is_active").on(table.isActive),
]);


// ===== 变更管理系统表 =====

// 变更申请表
export const changeRequests = pgTable("change_requests", {
  id: serial('id').primaryKey(),
  requestNo: varchar("request_no", { length: 50 }).notNull(),
  title: varchar({ length: 200 }).notNull(),
  changeType: changeTypeEnum4('changeType').notNull(),
  urgency: urgencyEnum('urgency').default('normal').notNull(),
  
  // 申请人信息
  applicantId: integer("applicant_id").notNull(),
  applicantName: varchar("applicant_name", { length: 100 }),
  applicantRole: applicantRoleEnum('applicantRole').notNull(),
  
  // 变更详情
  description: text().notNull(),
  technicalPlan: text("technical_plan").notNull(),
  impactAnalysis: text("impact_analysis").notNull(),
  rollbackPlan: text("rollback_plan").notNull(),
  testPlan: text("test_plan").notNull(),
  
  // 变更范围
  affectedModules: json("affected_modules"),
  expectedFiles: json("expected_files"),
  expectedSql: json("expected_sql"),
  expectedCommands: json("expected_commands"),
  
  // 计划时间
  plannedStartTime: timestamp("planned_start_time"),
  plannedEndTime: timestamp("planned_end_time"),
  
  // 状态
  status: statusEnum62('status').default('draft').notNull(),
  
  // 技术审核信息
  reviewerId: integer("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 100 }),
  reviewTime: timestamp("review_time"),
  reviewComment: text("review_comment"),
  
  // 管理员审批信息
  approverId: integer("approver_id"),
  approverName: varchar("approver_name", { length: 100 }),
  approvalTime: timestamp("approval_time"),
  approvalComment: text("approval_comment"),
  
  // 执行令牌
  executionToken: varchar("execution_token", { length: 100 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // 目标环境
  targetEnvironment: targetEnvironmentEnum('targetEnvironment').default('test').notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_change_requests_request_no").on(table.requestNo),
  index("idx_change_requests_status").on(table.status),
  index("idx_change_requests_applicant").on(table.applicantId),
  index("idx_change_requests_created").on(table.createdAt),
]);

// 变更执行记录表
export const changeExecutions = pgTable("change_executions", {
  id: serial('id').primaryKey(),
  requestId: integer("request_id").notNull(),
  executionToken: varchar("execution_token", { length: 100 }).notNull(),
  
  // 执行环境
  environment: environmentEnum('environment').notNull(),
  
  // 实际执行内容
  actualFiles: json("actual_files"),
  actualSql: json("actual_sql"),
  actualCommands: json("actual_commands"),
  
  // 一致性检查
  consistencyCheckResult: consistencyCheckResultEnum('consistencyCheckResult'),
  consistencyDetails: json("consistency_details"),
  
  // 执行状态
  status: statusEnum63('status').default('started').notNull(),
  
  // 执行人
  executorId: integer("executor_id").notNull(),
  executorName: varchar("executor_name", { length: 100 }),
  
  // 时间记录
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // 结果
  resultSummary: text("result_summary"),
  errorMessage: text("error_message"),
  
  // Git信息
  gitCommitBefore: varchar("git_commit_before", { length: 50 }),
  gitCommitAfter: varchar("git_commit_after", { length: 50 }),
  gitBranch: varchar("git_branch", { length: 100 }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_change_executions_request").on(table.requestId),
  index("idx_change_executions_environment").on(table.environment),
  index("idx_change_executions_status").on(table.status),
]);

// 一致性检查日志表
export const consistencyCheckLogs = pgTable("consistency_check_logs", {
  id: serial('id').primaryKey(),
  executionId: integer("execution_id").notNull(),
  checkType: checkTypeEnum('checkType').notNull(),
  
  // 检查内容
  expectedValue: text("expected_value"),
  actualValue: text("actual_value"),
  
  // 检查结果
  result: resultEnum1('result').notNull(),
  severity: severityEnum3('severity').default('info').notNull(),
  
  // 详情
  details: json(),
  
  // 处理
  actionTaken: actionTakenEnum('actionTaken').notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_consistency_check_logs_execution").on(table.executionId),
  index("idx_consistency_check_logs_result").on(table.result),
]);

// 部署配置表
export const deploymentConfigs = pgTable("deployment_configs", {
  id: serial('id').primaryKey(),
  configName: varchar("config_name", { length: 100 }).notNull(),
  environment: environmentEnum('environment').notNull(),
  deploymentType: deploymentTypeEnum1('deploymentType').notNull(),
  
  // 配置详情
  configData: json("config_data").notNull(),
  
  // 状态
  isActive: boolean("is_active").default(false).notNull(),
  lastDeployedAt: timestamp("last_deployed_at"),
  deployedVersion: varchar("deployed_version", { length: 50 }),
  
  // 健康状态
  healthStatus: healthStatusEnum1('healthStatus').default('unknown').notNull(),
  lastHealthCheckAt: timestamp("last_health_check_at"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_deployment_configs_name_env").on(table.configName, table.environment),
]);

// 环境同步记录表
export const environmentSyncLogs = pgTable("environment_sync_logs", {
  id: serial('id').primaryKey(),
  syncType: syncTypeEnum('syncType').notNull(),
  sourceEnvironment: environmentEnum('sourceEnvironment').notNull(),
  targetEnvironment: environmentEnum('targetEnvironment').notNull(),
  
  // 同步内容
  syncScope: json("sync_scope"),
  dataMaskingApplied: boolean("data_masking_applied").default(false).notNull(),
  
  // 状态
  status: statusEnum64('status').default('pending').notNull(),
  
  // 执行信息
  initiatedBy: integer("initiated_by").notNull(),
  initiatorName: varchar("initiator_name", { length: 100 }),
  
  // 时间记录
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // 结果
  recordsAffected: integer("records_affected").default(0),
  errorMessage: text("error_message"),
  
  // 版本信息
  sourceVersion: varchar("source_version", { length: 50 }),
  targetVersionBefore: varchar("target_version_before", { length: 50 }),
  targetVersionAfter: varchar("target_version_after", { length: 50 }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_environment_sync_logs_status").on(table.status),
  index("idx_environment_sync_logs_type").on(table.syncType),
]);

// 变更通知表
export const changeNotifications = pgTable("change_notifications", {
  id: serial('id').primaryKey(),
  requestId: integer("request_id"),
  executionId: integer("execution_id"),
  
  // 通知类型
  notificationType: notificationTypeEnum1('notificationType').notNull(),
  
  // 接收人
  recipientId: integer("recipient_id").notNull(),
  recipientName: varchar("recipient_name", { length: 100 }),
  recipientRole: varchar("recipient_role", { length: 50 }),
  
  // 通知内容
  title: varchar({ length: 200 }).notNull(),
  message: text().notNull(),
  priority: priorityEnum4('priority').default('normal').notNull(),
  
  // 发送状态
  channel: channelEnum2('channel').default('system').notNull(),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  
  // 操作链接
  actionUrl: varchar("action_url", { length: 500 }),
  actionRequired: boolean("action_required").default(false).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_change_notifications_request").on(table.requestId),
  index("idx_change_notifications_recipient").on(table.recipientId),
  index("idx_change_notifications_type").on(table.notificationType),
]);


// ============================================================================
// v4.7.0 Gemini辅助模块 - 5大模块14个新表
// ============================================================================

// ----------------------------------------------------------------------------
// 模块1: 社群管理与AI助手系统 (Social Community Management)
// ----------------------------------------------------------------------------

// 社群/群组信息表
export const socialGroups = pgTable("social_groups", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  groupWxId: varchar("group_wx_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar('type').default("general").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0).notNull(),
  status: varchar('status').default("active").notNull(),
  bridgeConfig: json("bridge_config"), // Social Bridge配置
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_social_groups_wx_id").on(table.groupWxId),
  index("idx_social_groups_status").on(table.status),
]);

// 社群消息记录表
export const socialMessages = pgTable("social_messages", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  groupId: bigint("group_id", { mode: "number" }).notNull(),
  senderWxId: varchar("sender_wx_id", { length: 100 }).notNull(),
  senderName: varchar("sender_name", { length: 100 }),
  content: text("content").notNull(),
  contentType: varchar('contentType').default("text").notNull(),
  isSensitive: boolean("is_sensitive").default(false).notNull(),
  deidentifiedContent: text("deidentified_content"), // 脱敏后内容
  sensitiveKeywords: json("sensitive_keywords"), // 检测到的敏感关键词
  aiAnalysis: json("ai_analysis"), // AI分析结果（意图、情感等）
  needsReply: boolean("needs_reply").default(false).notNull(),
  receivedAt: timestamp("received_at").notNull(),
  processedAt: timestamp("processed_at"),
},
(table) => [
  index("idx_social_messages_group").on(table.groupId),
  index("idx_social_messages_sender").on(table.senderWxId),
  index("idx_social_messages_received").on(table.receivedAt),
  index("idx_social_messages_needs_reply").on(table.needsReply),
]);

// 社群成员信息表
export const socialMembers = pgTable("social_members", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  groupId: bigint("group_id", { mode: "number" }).notNull(),
  wxId: varchar("wx_id", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  customerId: bigint("customer_id", { mode: "number" }), // 关联客户ID
  employeeId: bigint("employee_id", { mode: "number" }), // 关联员工ID（如果是内部人员）
  role: varchar('role').default("member").notNull(),
  tags: json("tags"), // 标签列表
  interactionCount: integer("interaction_count").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at"),
  joinedAt: timestamp("joined_at").notNull(),
},
(table) => [
  index("idx_social_members_group").on(table.groupId),
  index("idx_social_members_wx").on(table.wxId),
  index("idx_social_members_customer").on(table.customerId),
]);

// AI草拟回复表
export const aiDraftReplies = pgTable("ai_draft_replies", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  messageId: bigint("message_id", { mode: "number" }).notNull(),
  draftContent: text("draft_content").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).default("0.00"),
  modelUsed: varchar("model_used", { length: 50 }).default("gemini-pro"),
  promptTemplate: varchar("prompt_template", { length: 100 }),
  reviewStatus: varchar('reviewStatus').default("pending").notNull(),
  reviewerId: bigint("reviewer_id", { mode: "number" }),
  reviewerComment: text("reviewer_comment"),
  finalContent: text("final_content"), // 最终发布内容（可能经过修改）
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
},
(table) => [
  index("idx_ai_draft_replies_message").on(table.messageId),
  index("idx_ai_draft_replies_status").on(table.reviewStatus),
  index("idx_ai_draft_replies_reviewer").on(table.reviewerId),
]);

// 发布队列表
export const publishQueue = pgTable("publish_queue", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  draftId: bigint("draft_id", { mode: "number" }).notNull(),
  targetGroupId: bigint("target_group_id", { mode: "number" }).notNull(),
  content: text("content").notNull(),
  scheduledAt: timestamp("scheduled_at"), // 计划发送时间（null表示立即发送）
  sentAt: timestamp("sent_at"),
  status: varchar('status').default("queued").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  bridgeResponse: json("bridge_response"), // Social Bridge返回的响应
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_publish_queue_draft").on(table.draftId),
  index("idx_publish_queue_group").on(table.targetGroupId),
  index("idx_publish_queue_status").on(table.status),
  index("idx_publish_queue_scheduled").on(table.scheduledAt),
]);

// ----------------------------------------------------------------------------
// 模块2: 液态用工与技能原子化 (Liquid Workforce)
// ----------------------------------------------------------------------------

// 技能胶囊表
export const skillCapsules = pgTable("skill_capsules", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  skillId: varchar("skill_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(), // 如: "高压喷嘴流体仿真 Level 5"
  description: text("description"),
  ownerDid: varchar("owner_did", { length: 200 }).notNull(), // 所有者DID身份
  ownerId: bigint("owner_id", { mode: "number" }), // 关联用户ID
  validationProof: text("validation_proof"), // ZKP能力证明哈希
  proofType: varchar('proofType').default("self_declared").notNull(),
  royaltyRate: decimal("royalty_rate", { precision: 5, scale: 2 }).default("0.00"), // 技能版税率 (%)
  usageCount: integer("usage_count").default(0).notNull(), // 被调用次数
  level: integer("level").default(1).notNull(), // 技能等级 (1-5)
  domain: varchar('domain').default("T").notNull(), // 技能域
  tags: json("tags"), // 标签列表
  evidenceIds: json("evidence_ids"), // 能力证据ID列表
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_skill_capsules_skill_id").on(table.skillId),
  index("idx_skill_capsules_owner_did").on(table.ownerDid),
  index("idx_skill_capsules_owner_id").on(table.ownerId),
  index("idx_skill_capsules_domain").on(table.domain),
  index("idx_skill_capsules_level").on(table.level),
]);

// 任务竞标池表
export const taskBids = pgTable("task_bids", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  taskId: bigint("task_id", { mode: "number" }).notNull(), // 关联任务
  bidderAgentId: varchar("bidder_agent_id", { length: 100 }).notNull(), // 竞标Agent ID
  bidderId: bigint("bidder_id", { mode: "number" }), // 关联用户ID
  bidPrice: decimal("bid_price", { precision: 12, scale: 2 }).notNull(), // 报价金额
  currency: varchar("currency", { length: 10 }).default("CNY").notNull(),
  promisedSla: json("promised_sla").notNull(), // 承诺SLA: { deliveryDays, qualityScore, revisionCount }
  creditScoreSnapshot: decimal("credit_score_snapshot", { precision: 5, scale: 2 }), // 竞标时信誉分
  aiJudgeScore: decimal("ai_judge_score", { precision: 5, scale: 2 }), // Gemini裁决预评估分
  aiJudgeReason: text("ai_judge_reason"), // AI评估理由
  requiredSkills: json("required_skills"), // 所需技能胶囊ID列表
  status: varchar('status').default("pending").notNull(),
  acceptedAt: timestamp("accepted_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
},
(table) => [
  index("idx_task_bids_task").on(table.taskId),
  index("idx_task_bids_bidder").on(table.bidderAgentId),
  index("idx_task_bids_status").on(table.status),
  index("idx_task_bids_ai_score").on(table.aiJudgeScore),
]);

// 智能合约账本表
export const smartContracts = pgTable("smart_contracts", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  contractAddress: varchar("contract_address", { length: 100 }), // 链上合约地址（可选）
  taskBidId: bigint("task_bid_id", { mode: "number" }).notNull(), // 关联竞标
  payerId: bigint("payer_id", { mode: "number" }).notNull(), // 付款方
  payeeId: bigint("payee_id", { mode: "number" }).notNull(), // 收款方
  paymentType: varchar('paymentType').default("CNY").notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(), // 合约金额
  triggerCondition: json("trigger_condition").notNull(), // 触发条件: { quality_score: ">90", delivery_on_time: true }
  executionStatus: varchar('executionStatus').default("draft").notNull(),
  lockedAt: timestamp("locked_at"),
  releasedAt: timestamp("released_at"),
  disputeReason: text("dispute_reason"),
  disputeResolution: text("dispute_resolution"),
  transactionHash: varchar("transaction_hash", { length: 100 }), // 链上交易哈希
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_smart_contracts_bid").on(table.taskBidId),
  index("idx_smart_contracts_payer").on(table.payerId),
  index("idx_smart_contracts_payee").on(table.payeeId),
  index("idx_smart_contracts_status").on(table.executionStatus),
]);

// ----------------------------------------------------------------------------
// 模块3: 自主销售与AI-to-AI交互 (Autonomous Sales)
// ----------------------------------------------------------------------------

// AI谈判会话表
export const negotiationSessions = pgTable("negotiation_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  sessionId: varchar("session_id", { length: 50 }).notNull().unique(),
  opportunityId: bigint("opportunity_id", { mode: "number" }), // 关联商机
  clientAgentId: varchar("client_agent_id", { length: 100 }).notNull(), // 客户采购AI ID
  clientCompany: varchar("client_company", { length: 200 }),
  ourAgentId: varchar("our_agent_id", { length: 100 }).default("grt-sales-agent").notNull(), // 我方销售AI
  productId: bigint("product_id", { mode: "number" }), // 关联产品
  productName: varchar("product_name", { length: 200 }),
  currentRound: integer("current_round").default(1).notNull(), // 当前谈判轮次
  maxRounds: integer("max_rounds").default(10).notNull(), // 最大谈判轮次
  ourOfferPrice: decimal("our_offer_price", { precision: 12, scale: 2 }), // 我方报价
  clientCounterOffer: decimal("client_counter_offer", { precision: 12, scale: 2 }), // 客户还价
  ourBottomPrice: decimal("our_bottom_price", { precision: 12, scale: 2 }), // 我方底价（内部）
  ourTargetPrice: decimal("our_target_price", { precision: 12, scale: 2 }), // 我方目标价（内部）
  sentimentAnalysis: json("sentiment_analysis"), // 客户情绪分析: { score, trend, keywords }
  zopaRange: json("zopa_range"), // 协议达成区间: [底价, 目标价]
  negotiationHistory: json("negotiation_history"), // 谈判历史记录
  strategyUsed: varchar("strategy_used", { length: 100 }), // 使用的谈判策略
  status: varchar('status').default("initializing").notNull(),
  finalPrice: decimal("final_price", { precision: 12, scale: 2 }), // 最终成交价
  humanOverrideRequired: boolean("human_override_required").default(false).notNull(),
  humanOverrideReason: text("human_override_reason"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
},
(table) => [
  index("idx_negotiation_sessions_session").on(table.sessionId),
  index("idx_negotiation_sessions_opportunity").on(table.opportunityId),
  index("idx_negotiation_sessions_client").on(table.clientAgentId),
  index("idx_negotiation_sessions_status").on(table.status),
]);

// 零知识证明注册表
export const zkpRegistry = pgTable("zkp_registry", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  proofId: varchar("proof_id", { length: 50 }).notNull().unique(),
  proofType: varchar('proofType').notNull(),
  entityType: varchar('entityType').notNull(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(), // 关联实体ID
  entityName: varchar("entity_name", { length: 200 }),
  publicInputs: json("public_inputs").notNull(), // 公开输入: { standard: "VDA", range: [90, 100] }
  proofHash: varchar("proof_hash", { length: 200 }).notNull(), // 生成的ZK Proof哈希
  proofData: text("proof_data"), // 完整证明数据（加密存储）
  verificationCircuit: varchar("verification_circuit", { length: 100 }), // 验证电路标识
  generatedBy: varchar("generated_by", { length: 100 }), // 生成方
  verifiedByClient: boolean("verified_by_client").default(false).notNull(),
  verifierClientId: varchar("verifier_client_id", { length: 100 }),
  verificationCount: integer("verification_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
},
(table) => [
  index("idx_zkp_registry_proof").on(table.proofId),
  index("idx_zkp_registry_type").on(table.proofType),
  index("idx_zkp_registry_entity").on(table.entityType, table.entityId),
  index("idx_zkp_registry_verified").on(table.verifiedByClient),
]);

// ----------------------------------------------------------------------------
// 模块4: 门径管理与生产拉动 (Stage Gate)
// ----------------------------------------------------------------------------

// 门径检查项表
export const gateChecklists = pgTable("gate_checklists", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull(), // 关联项目
  gateStage: varchar('gateStage').notNull(),
  checkItem: varchar("check_item", { length: 200 }).notNull(), // 检查项名称
  checkItemCode: varchar("check_item_code", { length: 50 }), // 检查项编码
  description: text("description"),
  category: varchar("category", { length: 100 }), // 检查项类别
  isMandatory: boolean("is_mandatory").default(false).notNull(), // 是否拥有一票否决权
  autoVerifySource: varchar("auto_verify_source", { length: 100 }), // 自动验证源: ERP_PO_Table/PLM_Drawing_Status
  autoVerifyQuery: text("auto_verify_query"), // 自动验证查询语句
  manualVerifyRequired: boolean("manual_verify_required").default(true).notNull(),
  status: varchar('status').default("not_started").notNull(),
  verifiedBy: bigint("verified_by", { mode: "number" }), // 验证人ID
  verifiedAt: timestamp("verified_at"),
  verificationEvidence: json("verification_evidence"), // 验证证据
  waiverReason: text("waiver_reason"), // 豁免原因
  waiverApprovedBy: bigint("waiver_approved_by", { mode: "number" }),
  notes: text("notes"),
  dueDate: timestamp("due_date"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_gate_checklists_project").on(table.projectId),
  index("idx_gate_checklists_stage").on(table.gateStage),
  index("idx_gate_checklists_status").on(table.status),
  index("idx_gate_checklists_mandatory").on(table.isMandatory),
]);

// 生产拉动信号表
export const productionPullSignals = pgTable("production_pull_signals", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  signalId: varchar("signal_id", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: "number" }), // 关联项目
  orderId: bigint("order_id", { mode: "number" }), // 关联订单
  upstreamGate: varchar("upstream_gate", { length: 20 }).notNull(), // 上游节点: M7
  triggerEvent: varchar("trigger_event", { length: 200 }).notNull(), // 触发事件: 上汽JIS订单到达
  triggerSource: varchar("trigger_source", { length: 100 }), // 触发源: ERP/MES/External
  triggerData: json("trigger_data"), // 触发数据
  targetAasId: varchar("target_aas_id", { length: 100 }), // 目标设备Active AAS ID
  targetDeviceName: varchar("target_device_name", { length: 200 }),
  actionPayload: json("action_payload").notNull(), // 发送给设备的指令
  priority: varchar('priority').default("normal").notNull(),
  status: varchar('status').default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  completedAt: timestamp("completed_at"),
  deviceResponse: json("device_response"), // 设备响应
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  triggeredAt: timestamp("triggered_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_production_pull_signals_signal").on(table.signalId),
  index("idx_production_pull_signals_project").on(table.projectId),
  index("idx_production_pull_signals_gate").on(table.upstreamGate),
  index("idx_production_pull_signals_status").on(table.status),
  index("idx_production_pull_signals_target").on(table.targetAasId),
]);

// ----------------------------------------------------------------------------
// 模块5: 个人智能体与YDW数据映射 (Personal Agent)
// ----------------------------------------------------------------------------

// 行为探针日志表
export const behaviorLogs = pgTable("behavior_logs", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  userDid: varchar("user_did", { length: 200 }), // 用户DID身份
  userId: bigint("user_id", { mode: "number" }).notNull(), // 关联用户ID
  context: varchar("context", { length: 100 }).notNull(), // 上下文: IDE_Code_Commit/CAD_Save/PLM_Review等
  contextCategory: varchar('contextCategory').default("other").notNull(),
  actionType: varchar("action_type", { length: 100 }), // 操作类型
  actionData: json("action_data"), // 具体操作数据
  impliedSkill: varchar("implied_skill", { length: 200 }), // AI推断的技能标签
  impliedSkillId: bigint("implied_skill_id", { mode: "number" }), // 关联技能胶囊ID
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 推断置信度
  duration: integer("duration"), // 操作持续时间（秒）
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分
  projectId: bigint("project_id", { mode: "number" }), // 关联项目
  sessionId: varchar("session_id", { length: 100 }), // 会话ID
  deviceInfo: json("device_info"), // 设备信息
  timestamp: timestamp("timestamp").notNull(),
  processedAt: timestamp("processed_at"),
},
(table) => [
  index("idx_behavior_logs_user").on(table.userId),
  index("idx_behavior_logs_user_did").on(table.userDid),
  index("idx_behavior_logs_context").on(table.context),
  index("idx_behavior_logs_skill").on(table.impliedSkill),
  index("idx_behavior_logs_timestamp").on(table.timestamp),
  index("idx_behavior_logs_project").on(table.projectId),
]);

// 过程笔记表
export const processNotes = pgTable("process_notes", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  noteId: varchar("note_id", { length: 50 }).notNull().unique(),
  userId: bigint("user_id", { mode: "number" }).notNull(), // 创建者ID
  projectId: bigint("project_id", { mode: "number" }), // 关联项目
  projectPhase: varchar("project_phase", { length: 20 }), // 项目阶段: M0-M12
  taskId: bigint("task_id", { mode: "number" }), // 关联任务
  title: varchar("title", { length: 200 }),
  problemDesc: text("problem_desc"), // 问题描述
  problemCategory: varchar("problem_category", { length: 100 }), // 问题类别
  solutionDesc: text("solution_desc"), // 解决方案描述
  solutionEffectiveness: varchar('solutionEffectiveness').default("pending").notNull(),
  aiExtractedKnowledge: json("ai_extracted_knowledge"), // AI提取的结构化知识
  relatedSkills: json("related_skills"), // 相关技能标签
  attachments: json("attachments"), // 附件列表
  tags: json("tags"), // 标签列表
  visibility: varchar('visibility').default("private").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  isTemplate: boolean("is_template").default(false).notNull(), // 是否为模板
  templateUsageCount: integer("template_usage_count").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_process_notes_note").on(table.noteId),
  index("idx_process_notes_user").on(table.userId),
  index("idx_process_notes_project").on(table.projectId),
  index("idx_process_notes_phase").on(table.projectPhase),
  index("idx_process_notes_category").on(table.problemCategory),
  index("idx_process_notes_visibility").on(table.visibility),
]);


// 用户偏好表 - 存储用户的语言、主题等个性化设置
export const userPreferences = pgTable("user_preferences", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().unique(), // 关联用户ID
  language: varchar("language", { length: 10 }).default("zh").notNull(), // 语言偏好: zh, en, de, fr
  theme: varchar("theme", { length: 20 }).default("dark").notNull(), // 主题偏好: dark, light, system
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(), // 侧边栏是否折叠
  dashboardLayout: json("dashboard_layout"), // 仪表盘布局配置
  notificationSettings: json("notification_settings"), // 通知设置
  timezone: varchar("timezone", { length: 50 }).default("Asia/Shanghai"), // 时区设置
  dateFormat: varchar("date_format", { length: 20 }).default("YYYY-MM-DD"), // 日期格式
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_preferences_user").on(table.userId),
]);


// 能力证据表 - 存储员工能力证据（项目交付物、培训证书、技能认证等）
export const capabilityEvidences = pgTable("capability_evidences", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  evidenceId: varchar("evidence_id", { length: 64 }).notNull().unique(), // 证据唯一标识
  userId: bigint("user_id", { mode: "number" }).notNull(), // 提交人ID
  userName: varchar("user_name", { length: 100 }), // 提交人姓名
  
  // 证据类型
  evidenceType: evidenceTypeEnum('evidenceType').notNull(),
  
  // 能力域
  capabilityDomain: capabilityDomainEnum('capabilityDomain').notNull(),
  
  // 证据详情
  title: varchar("title", { length: 200 }).notNull(), // 证据标题
  description: text("description"), // 证据描述
  
  // 关联信息
  projectId: varchar("project_id", { length: 64 }), // 关联项目ID
  projectName: varchar("project_name", { length: 200 }), // 关联项目名称
  equipmentModel: varchar("equipment_model", { length: 100 }), // 关联设备型号
  
  // 文件信息
  fileUrl: varchar("file_url", { length: 500 }), // 文件URL
  fileKey: varchar("file_key", { length: 200 }), // S3文件Key
  fileName: varchar("file_name", { length: 200 }), // 原始文件名
  fileType: varchar("file_type", { length: 50 }), // 文件类型
  fileSize: integer("file_size"), // 文件大小（字节）
  
  // 审核信息
  status: statusEnum65('status').default('pending').notNull(),
  reviewerId: bigint("reviewer_id", { mode: "number" }), // 审核人ID
  reviewerName: varchar("reviewer_name", { length: 100 }), // 审核人姓名
  reviewComment: text("review_comment"), // 审核意见
  reviewedAt: timestamp("reviewed_at", { mode: 'string' }), // 审核时间
  
  // 能力等级影响
  currentLevel: integer("current_level"), // 当前能力等级 (1-5)
  targetLevel: integer("target_level"), // 目标能力等级 (1-5)
  levelUpgraded: boolean("level_upgraded").default(false), // 是否已触发升级
  
  // 有效期
  validFrom: timestamp("valid_from", { mode: 'string' }), // 证据有效起始日期
  validUntil: timestamp("valid_until", { mode: 'string' }), // 证据有效截止日期
  
  // 元数据
  metadata: json("metadata"), // 额外元数据
  tags: json("tags"), // 标签
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_capability_evidences_user").on(table.userId),
  index("idx_capability_evidences_type").on(table.evidenceType),
  index("idx_capability_evidences_domain").on(table.capabilityDomain),
  index("idx_capability_evidences_status").on(table.status),
  index("idx_capability_evidences_project").on(table.projectId),
]);

// AI服务对话历史表 - 存储AI助手对话记录
export const aiServiceChatHistory = pgTable("ai_service_chat_history", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(), // 会话ID
  userId: bigint("user_id", { mode: "number" }).notNull(), // 用户ID
  userName: varchar("user_name", { length: 100 }), // 用户姓名
  
  // AI服务类型
  serviceType: serviceTypeEnum('serviceType').notNull(),
  
  // 消息内容
  role: roleEnum('role').notNull(),
  content: text("content").notNull(),
  
  // 上下文信息
  context: json("context"), // 对话上下文
  
  // Token统计
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  
  // 用户反馈
  rating: integer("rating"), // 1-5评分
  feedback: text("feedback"), // 用户反馈
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_ai_chat_history_session").on(table.sessionId),
  index("idx_ai_chat_history_user").on(table.userId),
  index("idx_ai_chat_history_service").on(table.serviceType),
]);


// 社群平台配置表
export const socialPlatformConfigs = pgTable("social_platform_configs", {
  id: serial('id').primaryKey(),
  platform: platformEnum1('platform').notNull(),
  enabled: smallint().default(0).notNull(),
  config: text(), // JSON格式的平台配置
  webhookUrl: varchar({ length: 500 }), // Webhook URL（如钉钉群机器人）
  webhookSecret: varchar({ length: 200 }), // Webhook签名密钥
  lastSyncAt: timestamp({ mode: 'string' }),
  syncStatus: syncStatusEnum1('syncStatus').default('idle'),
  syncErrorMsg: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("social_platform_configs_platform_unique").on(table.platform),
]);


// ==================== 工人管理表 ====================
// 工人基本信息表
export const workers = pgTable("workers", {
  id: serial('id').primaryKey(),
  employeeCode: varchar("employee_code", { length: 50 }), // 工号
  name: varchar({ length: 100 }).notNull(),
  department: varchar({ length: 100 }).notNull(),
  position: varchar({ length: 100 }).notNull(),
  skillLevel: skillLevelEnum('skillLevel').default('L2').notNull(),
  status: statusEnum66('status').default('Active').notNull(),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 100 }),
  joinDate: date("join_date", { mode: 'string' }),
  leaveDate: date("leave_date", { mode: 'string' }),
  uwbTagId: varchar("uwb_tag_id", { length: 50 }), // UWB标签ID
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_workers_employee_code").on(table.employeeCode),
  index("idx_workers_department").on(table.department),
  index("idx_workers_status").on(table.status),
]);

// 工人效率记录表
export const workerEfficiencyRecords = pgTable("worker_efficiency_records", {
  id: serial('id').primaryKey(),
  workerId: integer("worker_id").notNull(),
  recordDate: date("record_date", { mode: 'string' }).notNull(),
  tasksAssigned: integer("tasks_assigned").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  standardHours: decimal("standard_hours", { precision: 10, scale: 2 }).default('0'),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }).default('0'),
  efficiency: decimal({ precision: 5, scale: 2 }).default('100'), // 效率百分比
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }).default('100'), // 质量得分
  defectCount: integer("defect_count").default(0),
  reworkCount: integer("rework_count").default(0),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("worker_efficiency_records_idx_worker_efficiency_worker").on(table.workerId),
  index("worker_efficiency_records_idx_worker_efficiency_date").on(table.recordDate),
]);

// 工时预警表
export const workHourAlerts = pgTable("work_hour_alerts", {
  id: serial('id').primaryKey(),
  workerId: integer("worker_id").notNull(),
  alertType: alertTypeEnum3('alertType').notNull(),
  alertLevel: severityEnum1('alertLevel').default('warning').notNull(),
  message: text().notNull(),
  details: text(), // JSON格式的详细信息
  status: statusEnum67('status').default('Pending').notNull(),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  resolution: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_work_hour_alerts_worker").on(table.workerId),
  index("idx_work_hour_alerts_status").on(table.status),
  index("idx_work_hour_alerts_type").on(table.alertType),
]);

// 用户收藏菜单表
export const userFavorites = pgTable("user_favorites", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  menuPath: varchar("menu_path", { length: 200 }).notNull(),
  menuName: varchar("menu_name", { length: 100 }).notNull(),
  menuNameEn: varchar("menu_name_en", { length: 100 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_favorites_user").on(table.userId),
  index("idx_user_favorites_unique").on(table.userId, table.menuPath),
]);


// ===== 通用审批流程引擎表 =====
export {
  approvalTemplates,
  approvalInstances,
  approvalStepRecords,
  approvalActionLogs,
  approvalDelegations,
  redBlueConfigs,
  redBlueExecutions,
} from './approval-engine-schema';


// ===== T1-T15生产工序管理和客户需求问卷表 =====
export {
  processDefinitions,
  projectProcessInstances,
  m2InfoTags,
  sopTemplates,
  aiSopRecommendations,
  processRiskAlerts,
  processTimeRecords,
  customerQuestionnaires,
  questionnaireVersions,
} from './production-process-schema';


// ===== 简道云集成表 =====
// 简道云用户映射表 - 将简道云成员与GRT用户关联
export const jiandaoyunUserMappings = pgTable("jiandaoyun_user_mappings", {
  id: serial('id').primaryKey(),
  
  // 简道云用户信息
  jdyUsername: varchar("jdy_username", { length: 100 }).notNull(), // 简道云用户名（唯一标识）
  jdyName: varchar("jdy_name", { length: 100 }).notNull(), // 简道云显示名称
  jdyDepartments: json("jdy_departments"), // 简道云部门ID数组
  jdyStatus: integer("jdy_status").default(1), // 简道云状态：0=未确认，1=已加入
  jdyIntegrateId: varchar("jdy_integrate_id", { length: 100 }), // 简道云集成ID
  
  // GRT用户关联
  grtUserId: integer("grt_user_id"), // 关联的GRT用户ID
  grtOpenId: varchar("grt_open_id", { length: 64 }), // 关联的GRT用户OpenID
  
  // 同步状态
  syncStatus: syncStatusEnum2('syncStatus').default('pending').notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
  syncError: text("sync_error"),
  
  // 自动创建用户配置
  autoCreateUser: boolean("auto_create_user").default(false).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_user_mappings_username").on(table.jdyUsername),
  index("idx_jdy_user_mappings_grt_user").on(table.grtUserId),
  index("idx_jdy_user_mappings_sync_status").on(table.syncStatus),
]);

// 简道云部门映射表 - 将简道云部门与GRT部门关联
export const jiandaoyunDeptMappings = pgTable("jiandaoyun_dept_mappings", {
  id: serial('id').primaryKey(),
  
  // 简道云部门信息
  jdyDeptNo: integer("jdy_dept_no").notNull(), // 简道云部门编号
  jdyDeptName: varchar("jdy_dept_name", { length: 200 }).notNull(), // 简道云部门名称
  jdyParentNo: integer("jdy_parent_no"), // 简道云父部门编号
  jdyDeptType: integer("jdy_dept_type").default(0), // 0=常规部门，2=企业互联外部部门
  jdyDeptStatus: integer("jdy_dept_status").default(1), // 1=使用中，-1=已删除
  
  // GRT部门关联（如果有部门表的话）
  grtDeptId: integer("grt_dept_id"),
  grtDeptCode: varchar("grt_dept_code", { length: 50 }),
  
  // 同步状态
  syncStatus: syncStatusEnum2('syncStatus').default('pending').notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_dept_mappings_dept_no").on(table.jdyDeptNo),
  index("idx_jdy_dept_mappings_sync_status").on(table.syncStatus),
]);

// 简道云角色映射表 - 将简道云角色与GRT权限角色关联
export const jiandaoyunRoleMappings = pgTable("jiandaoyun_role_mappings", {
  id: serial('id').primaryKey(),
  
  // 简道云角色信息
  jdyRoleNo: integer("jdy_role_no").notNull(), // 简道云角色编号
  jdyGroupNo: integer("jdy_group_no").notNull(), // 简道云角色组编号
  jdyRoleName: varchar("jdy_role_name", { length: 200 }).notNull(), // 简道云角色名称
  jdyRoleType: integer("jdy_role_type").default(0), // 角色类型
  jdyRoleStatus: integer("jdy_role_status").default(1), // 角色状态
  
  // GRT权限角色关联
  grtRoleId: varchar("grt_role_id", { length: 50 }), // 关联的GRT权限角色ID
  grtRoleName: varchar("grt_role_name", { length: 100 }), // 关联的GRT权限角色名称
  
  // 权限映射配置
  permissionMapping: json("permission_mapping"), // 权限映射规则
  
  // 同步状态
  syncStatus: syncStatusEnum2('syncStatus').default('pending').notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_role_mappings_role_no").on(table.jdyRoleNo),
  index("idx_jdy_role_mappings_grt_role").on(table.grtRoleId),
]);

// 简道云角色成员表 - 记录角色下的成员列表
export const jiandaoyunRoleMembers = pgTable("jiandaoyun_role_members", {
  id: serial('id').primaryKey(),

  // 简道云角色成员信息
  jdyRoleNo: integer("jdy_role_no").notNull(), // 简道云角色编号
  jdyUsername: varchar("jdy_username", { length: 100 }).notNull(), // 简道云用户名
  jdyName: varchar("jdy_name", { length: 100 }).notNull(), // 简道云显示名称
  jdyDepartmentsRange: json("jdy_departments_range"), // 该用户在该角色下的部门范围
  jdyHasChild: boolean("jdy_has_child").default(false), // 是否包含子部门

  // 同步状态
  syncStatus: syncStatusEnum2('syncStatus').default('pending').notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_role_members_role_no").on(table.jdyRoleNo),
  index("idx_jdy_role_members_username").on(table.jdyUsername),
]);

// 简道云数据同步任务表 - 记录定时同步任务
export const jiandaoyunSyncTasks = pgTable("jiandaoyun_sync_tasks", {
  id: serial('id').primaryKey(),
  
  // 任务配置
  taskName: varchar("task_name", { length: 200 }).notNull(), // 任务名称
  taskType: taskTypeEnum4('taskType').notNull(), // 同步类型
  
  // 简道云数据源
  jdyAppId: varchar("jdy_app_id", { length: 50 }), // 简道云应用ID（表单同步时使用）
  jdyFormId: varchar("jdy_form_id", { length: 50 }), // 简道云表单ID（表单同步时使用）
  
  // 同步配置
  syncDirection: syncDirectionEnum('syncDirection').default('jdy_to_grt').notNull(),
  fieldMapping: json("field_mapping"), // 字段映射配置
  filterCondition: json("filter_condition"), // 过滤条件
  
  // 定时配置
  cronExpression: varchar("cron_expression", { length: 50 }), // Cron表达式
  isEnabled: boolean("is_enabled").default(true).notNull(),
  
  // 执行状态
  lastRunAt: timestamp("last_run_at", { mode: 'string' }),
  lastRunStatus: lastRunStatusEnum1('lastRunStatus'),
  lastRunRecords: integer("last_run_records").default(0), // 上次同步记录数
  lastRunError: text("last_run_error"),
  
  // 统计
  totalSyncCount: integer("total_sync_count").default(0), // 总同步次数
  totalRecordsSynced: integer("total_records_synced").default(0), // 总同步记录数
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_sync_tasks_type").on(table.taskType),
  index("idx_jdy_sync_tasks_enabled").on(table.isEnabled),
]);

// 简道云数据同步日志表 - 记录每次同步的详细日志
export const jiandaoyunSyncLogs = pgTable("jiandaoyun_sync_logs", {
  id: serial('id').primaryKey(),
  
  // 关联任务
  taskId: integer("task_id").notNull(),
  
  // 执行信息
  startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  duration: integer(), // 执行时长（毫秒）
  
  // 同步结果
  status: statusEnum68('status').default('running').notNull(),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsFailed: integer("records_failed").default(0),
  
  // 错误信息
  errorMessage: text("error_message"),
  errorDetails: json("error_details"),
  
  // 触发方式
  triggeredBy: triggeredByEnum('triggeredBy').default('manual').notNull(),
  triggeredByUser: integer("triggered_by_user"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_sync_logs_task").on(table.taskId),
  index("idx_jdy_sync_logs_status").on(table.status),
  index("idx_jdy_sync_logs_started").on(table.startedAt),
]);


// ===== 简道云全量导入表 =====

// 导入执行状态跟踪表
export const jiandaoyunImportRuns = pgTable("jiandaoyun_import_runs", {
  id: serial('id').primaryKey(),

  // 运行标识
  runCode: varchar("run_code", { length: 64 }).notNull().unique(),
  runType: varchar("run_type", { length: 20 }).notNull(), // full, org, project, approval

  // 状态
  status: varchar("status", { length: 20 }).default('pending').notNull(), // pending, running, completed, failed, cancelled

  // 进度
  currentPhase: varchar("current_phase", { length: 50 }),
  currentStep: varchar("current_step", { length: 100 }),
  progressPercent: integer("progress_percent").default(0),

  // 统计
  totalExpected: integer("total_expected").default(0),
  totalProcessed: integer("total_processed").default(0),
  totalCreated: integer("total_created").default(0),
  totalUpdated: integer("total_updated").default(0),
  totalSkipped: integer("total_skipped").default(0),
  totalFailed: integer("total_failed").default(0),

  // 详细结果
  phaseResults: json("phase_results"), // { phase1: {...}, phase2: {...} }
  errors: json("errors"), // [{ phase, message, record }]
  importConfig: json("import_config"), // { phases, dryRun, ... }

  // 时间
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),

  // 触发信息
  triggeredBy: integer("triggered_by"),

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_import_runs_code").on(table.runCode),
  index("idx_jdy_import_runs_status").on(table.status),
]);

// 表单发现与字段映射表
export const jiandaoyunFormMappings = pgTable("jiandaoyun_form_mappings", {
  id: serial('id').primaryKey(),

  // 简道云表单信息
  jdyAppId: varchar("jdy_app_id", { length: 64 }).notNull(),
  jdyAppName: varchar("jdy_app_name", { length: 200 }).notNull(),
  jdyFormId: varchar("jdy_form_id", { length: 64 }).notNull(),
  jdyFormName: varchar("jdy_form_name", { length: 200 }).notNull(),

  // GRT目标实体
  targetEntity: varchar("target_entity", { length: 50 }), // project, projectTask, approval_instance, etc.

  // 映射配置
  fieldMapping: json("field_mapping"), // { jdyField: grtColumn, ... }
  recordCount: integer("record_count").default(0),
  sampleData: json("sample_data"), // 前5条样例数据
  fieldSchema: json("field_schema"), // JDY字段结构

  // 确认状态
  isConfirmed: boolean("is_confirmed").default(false).notNull(),

  lastDiscoveredAt: timestamp("last_discovered_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_jdy_form_mappings_app").on(table.jdyAppId),
  index("idx_jdy_form_mappings_form").on(table.jdyFormId),
  index("idx_jdy_form_mappings_target").on(table.targetEntity),
]);


// ==================== Gemini设计功能 - 年度企业日程 ====================

// 年度企业日程主表
export const annualAgendas = pgTable("annual_agendas", {
  id: serial('id').primaryKey(),
  year: integer().notNull(), // 年份
  title: varchar("title", { length: 200 }).notNull(), // 日程标题
  description: text("description"), // 日程描述
  status: statusEnum39('status').default('draft').notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_annual_agendas_year").on(table.year),
]);

// 年度里程碑表
export const annualMilestones = pgTable("annual_milestones", {
  id: serial('id').primaryKey(),
  agendaId: integer("agenda_id").notNull(), // 关联年度日程
  milestoneType: milestoneTypeEnum('milestoneType').notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  scheduledDate: date("scheduled_date"), // 计划日期
  scheduledTime: varchar("scheduled_time", { length: 10 }), // 计划时间 HH:MM
  recurrenceRule: varchar("recurrence_rule", { length: 100 }), // 重复规则，如 "Last Friday of month"
  isRecurring: smallint("is_recurring").default(0),
  status: statusEnum69('status').default('pending').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_annual_milestones_agenda").on(table.agendaId),
  index("idx_annual_milestones_type").on(table.milestoneType),
]);

// 部门日程表
export const departmentAgendas = pgTable("department_agendas", {
  id: serial('id').primaryKey(),
  agendaId: integer("agenda_id").notNull(), // 关联年度日程
  departmentCode: varchar("department_code", { length: 50 }).notNull(),
  departmentName: varchar("department_name", { length: 100 }).notNull(),
  milestoneId: integer("milestone_id").notNull(), // 关联里程碑
  adjustedDate: date("adjusted_date"), // 调整后的日期（避开假期）
  adjustedTime: varchar("adjusted_time", { length: 10 }),
  adjustmentReason: varchar("adjustment_reason", { length: 200 }), // 调整原因
  status: statusEnum70('status').default('scheduled').notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_dept_agendas_agenda").on(table.agendaId),
  index("idx_dept_agendas_dept").on(table.departmentCode),
]);

// 全球假期表
export const globalHolidays = pgTable("global_holidays", {
  id: serial('id').primaryKey(),
  year: integer().notNull(),
  holidayCode: varchar("holiday_code", { length: 50 }).notNull(), // CNY, Xmas, Thanksgiving等
  holidayName: varchar("holiday_name", { length: 100 }).notNull(),
  region: varchar("region", { length: 50 }).notNull(), // CN, US, EU等
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isWorkday: smallint("is_workday").default(0), // 是否调休工作日
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_global_holidays_year").on(table.year),
  index("idx_global_holidays_region").on(table.region),
]);

// ==================== Gemini设计功能 - 客户价值视图 ====================

// 工作职能矩阵表
export const jobFunctionMatrix = pgTable("job_function_matrix", {
  id: serial('id').primaryKey(),
  roleCode: varchar("role_code", { length: 50 }).notNull(), // 如 Assembly_L3
  roleName: varchar("role_name", { length: 100 }).notNull(),
  roleLevel: integer("role_level").notNull(), // 1-5级
  department: varchar("department", { length: 50 }).notNull(),
  m0m12Roles: text("m0_m12_roles"), // M0-M12阶段角色，JSON格式
  requiredSkills: text("required_skills"), // 所需技能，JSON格式
  customerScenarios: text("customer_scenarios"), // 关联客户场景，JSON格式
  missionStatement: text("mission_statement"), // 使命宣言
  nextLevelRequirement: text("next_level_requirement"), // 晋升要求
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_job_function_role").on(table.roleCode),
  index("idx_job_function_dept").on(table.department),
]);

// 客户场景表
export const customerScenarios = pgTable("customer_scenarios", {
  id: serial('id').primaryKey(),
  scenarioCode: varchar("scenario_code", { length: 50 }).notNull(), // 如 Scenario_4
  scenarioName: varchar("scenario_name", { length: 200 }).notNull(),
  description: text("description"),
  customerRequirements: text("customer_requirements"), // 客户需求，JSON格式
  criticalMetrics: text("critical_metrics"), // 关键指标，如 < 50 micron particles
  relatedRoles: text("related_roles"), // 相关角色，JSON格式
  priority: integer().default(1), // 优先级 1-10
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_customer_scenarios_code").on(table.scenarioCode),
]);

// 用户任务视图表
export const userTaskViews = pgTable("user_task_views", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  roleCode: varchar("role_code", { length: 50 }).notNull(),
  currentTaskId: integer("current_task_id"), // 当前任务ID
  currentProjectId: integer("current_project_id"), // 当前项目ID
  currentStage: varchar("current_stage", { length: 20 }), // 当前阶段 M0-M12
  customerScenarioId: integer("customer_scenario_id"), // 关联客户场景
  actionItems: text("action_items"), // 待办事项，JSON格式
  lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_task_views_user").on(table.userId),
  index("idx_user_task_views_role").on(table.roleCode),
]);

// ==================== Gemini设计功能 - 全球增长追踪器 ====================

// 区域销售配置表
export const regionalSalesConfigs = pgTable("regional_sales_configs", {
  id: serial('id').primaryKey(),
  region: varchar("region", { length: 50 }).notNull(), // Europe, USA, Asia等
  year: integer().notNull(),
  salesTarget: decimal("sales_target", { precision: 15, scale: 2 }).notNull(), // 销售目标
  currency: varchar("currency", { length: 10 }).notNull(), // EUR, USD, CNY
  focusScenarios: text("focus_scenarios"), // 聚焦场景，JSON格式
  notes: text("notes"),
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_regional_sales_region").on(table.region),
  index("idx_regional_sales_year").on(table.year),
]);

// 区域人员配置表
export const regionalStaffConfigs = pgTable("regional_staff_configs", {
  id: serial('id').primaryKey(),
  regionConfigId: integer("region_config_id").notNull(), // 关联区域销售配置
  staffType: staffTypeEnum('staffType').notNull(),
  headcount: integer().notNull(), // 人数
  location: varchar("location", { length: 100 }), // 工作地点
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_regional_staff_config").on(table.regionConfigId),
]);

// 资源充足性检查记录表
export const resourceAdequacyChecks = pgTable("resource_adequacy_checks", {
  id: serial('id').primaryKey(),
  regionConfigId: integer("region_config_id").notNull(),
  checkDate: date("check_date").notNull(),
  currentRevenue: decimal("current_revenue", { precision: 15, scale: 2 }),
  requiredSupport: integer("required_support"), // 所需支持人数
  actualSupport: integer("actual_support"), // 实际支持人数
  supportRatio: decimal("support_ratio", { precision: 5, scale: 2 }), // 支持比例
  status: statusEnum71('status').notNull(),
  alertMessage: text("alert_message"),
  hiringPlanTriggered: smallint("hiring_plan_triggered").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_resource_checks_config").on(table.regionConfigId),
  index("idx_resource_checks_date").on(table.checkDate),
]);

// 招聘计划表
export const hiringPlans = pgTable("hiring_plans", {
  id: serial('id').primaryKey(),
  regionConfigId: integer("region_config_id").notNull(),
  checkId: integer("check_id"), // 关联资源检查记录
  planCode: varchar("plan_code", { length: 50 }).notNull(),
  staffType: varchar("staff_type", { length: 50 }).notNull(),
  requiredHeadcount: integer("required_headcount").notNull(),
  targetLocation: varchar("target_location", { length: 100 }),
  priority: priorityEnum('priority').default('medium').notNull(),
  status: statusEnum72('status').default('draft').notNull(),
  targetDate: date("target_date"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_hiring_plans_region").on(table.regionConfigId),
  index("idx_hiring_plans_status").on(table.status),
]);


// ==================== 资质管理系统 ====================

// 资质证书表
export const certifications = pgTable("certifications", {
  id: serial('id').primaryKey(),
  certCode: varchar("cert_code", { length: 50 }).notNull(), // 证书编码
  name: varchar("name", { length: 100 }).notNull(), // 证书名称
  nameEn: varchar("name_en", { length: 100 }), // 英文名称
  certNumber: varchar("cert_number", { length: 100 }), // 证书编号
  certType: certTypeEnum('certType').notNull(),
  issuingBody: varchar("issuing_body", { length: 200 }), // 发证机构
  issueDate: date("issue_date", { mode: 'string' }), // 发证日期
  expiryDate: date("expiry_date", { mode: 'string' }), // 到期日期
  scope: text("scope"), // 认证范围
  status: statusEnum73('status').default('planned').notNull(),
  fileUrl: varchar("file_url", { length: 500 }), // 证书文件URL
  priority: priorityEnum('priority').default('medium').notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_certifications_code").on(table.certCode),
  index("idx_certifications_status").on(table.status),
  index("idx_certifications_expiry").on(table.expiryDate),
]);

// 客户资质要求表
export const customerCertRequirements = pgTable("customer_cert_requirements", {
  id: serial('id').primaryKey(),
  customerName: varchar("customer_name", { length: 200 }).notNull(), // 客户名称
  customerNameEn: varchar("customer_name_en", { length: 200 }), // 英文名称
  customerType: customerTypeEnum('customerType').notNull(),
  country: varchar("country", { length: 50 }), // 国家
  region: varchar("region", { length: 50 }), // 区域
  portalUrl: varchar("portal_url", { length: 500 }), // 供应商门户URL
  certificationId: integer("certification_id"), // 关联资质
  certName: varchar("cert_name", { length: 100 }).notNull(), // 资质名称
  isMandatory: smallint("is_mandatory").default(1), // 是否必须
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_customer_cert_customer").on(table.customerName),
  index("idx_customer_cert_type").on(table.customerType),
]);

// 资质建设计划表
export const certBuildingPlans = pgTable("cert_building_plans", {
  id: serial('id').primaryKey(),
  planCode: varchar("plan_code", { length: 50 }).notNull(), // 计划编码
  certificationId: integer("certification_id"), // 关联资质
  certificationName: varchar("certification_name", { length: 100 }).notNull(), // 资质名称
  responsibleDept: varchar("responsible_dept", { length: 100 }), // 负责部门
  responsiblePerson: varchar("responsible_person", { length: 100 }), // 负责人
  budget: decimal("budget", { precision: 10, scale: 2 }), // 预算（万元）
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }), // 实际费用
  startDate: date("start_date", { mode: 'string' }), // 开始日期
  targetDate: date("target_date", { mode: 'string' }), // 目标日期
  completedDate: date("completed_date", { mode: 'string' }), // 完成日期
  status: statusEnum74('status').default('planned').notNull(),
  progress: integer("progress").default(0), // 进度百分比
  milestones: text("milestones"), // 里程碑，JSON格式
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_cert_plans_code").on(table.planCode),
  index("idx_cert_plans_status").on(table.status),
  index("idx_cert_plans_target").on(table.targetDate),
]);

// 资质审核记录表
export const certAuditRecords = pgTable("cert_audit_records", {
  id: serial('id').primaryKey(),
  certificationId: integer("certification_id").notNull(), // 关联资质
  auditType: auditTypeEnum2('auditType').notNull(),
  auditDate: date("audit_date", { mode: 'string' }).notNull(),
  auditor: varchar("auditor", { length: 100 }), // 审核员
  auditBody: varchar("audit_body", { length: 200 }), // 审核机构
  result: resultEnum2('result').default('pending').notNull(),
  findings: text("findings"), // 发现项
  correctiveActions: text("corrective_actions"), // 纠正措施
  nextAuditDate: date("next_audit_date", { mode: 'string' }), // 下次审核日期
  reportUrl: varchar("report_url", { length: 500 }), // 审核报告URL
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_cert_audits_cert").on(table.certificationId),
  index("idx_cert_audits_date").on(table.auditDate),
]);

// 资质差距分析表
export const certGapAnalysis = pgTable("cert_gap_analysis", {
  id: serial('id').primaryKey(),
  analysisCode: varchar("analysis_code", { length: 50 }).notNull(),
  targetCustomer: varchar("target_customer", { length: 200 }), // 目标客户
  analysisDate: date("analysis_date", { mode: 'string' }).notNull(),
  requiredCerts: text("required_certs"), // 所需资质，JSON格式
  currentCerts: text("current_certs"), // 现有资质，JSON格式
  gapCerts: text("gap_certs"), // 差距资质，JSON格式
  gapCount: integer("gap_count").default(0), // 差距数量
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }), // 预估费用
  estimatedTime: integer("estimated_time"), // 预估时间（月）
  recommendation: text("recommendation"), // 建议
  status: statusEnum75('status').default('draft').notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_gap_analysis_code").on(table.analysisCode),
  index("idx_gap_analysis_customer").on(table.targetCustomer),
]);


// ==================== v1.3.64 年度企业日程和全球增长追踪器 ====================

// 年度企业日程表
export const annualCorporateAgenda = pgTable("annual_corporate_agenda", {
  id: serial('id').primaryKey(),
  agendaCode: varchar("agenda_code", { length: 50 }).notNull(),
  year: integer("year").notNull(),
  milestoneId: varchar("milestone_id", { length: 50 }).notNull(),
  milestoneName: varchar("milestone_name", { length: 100 }).notNull(),
  milestoneNameEn: varchar("milestone_name_en", { length: 100 }),
  milestoneType: milestoneTypeEnum('milestoneType').notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  scheduledDate: date("scheduled_date", { mode: 'string' }).notNull(),
  originalDate: date("original_date", { mode: 'string' }),
  isShifted: smallint("is_shifted").default(0),
  shiftReason: varchar("shift_reason", { length: 200 }),
  status: statusEnum76('status').default('pending').notNull(),
  description: text("description"),
  descriptionEn: text("description_en"),
  attendees: text("attendees"), // JSON格式的参与者列表
  location: varchar("location", { length: 200 }),
  meetingLink: varchar("meeting_link", { length: 500 }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_agenda_code").on(table.agendaCode),
  index("idx_agenda_year").on(table.year),
  index("idx_agenda_dept").on(table.department),
  index("idx_agenda_date").on(table.scheduledDate),
]);


// 全球增长追踪器 - 区域配置表
export const globalGrowthRegions = pgTable("global_growth_regions", {
  id: serial('id').primaryKey(),
  regionCode: varchar("region_code", { length: 50 }).notNull(),
  regionName: varchar("region_name", { length: 100 }).notNull(),
  regionNameEn: varchar("region_name_en", { length: 100 }),
  salesTarget: varchar("sales_target", { length: 50 }).notNull(), // e.g., "6M EUR"
  salesTargetValue: decimal("sales_target_value", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  salesStaff: integer("sales_staff").default(0),
  supportAsiaStaff: integer("support_asia_staff").default(0),
  supportAsiaRemoteStaff: integer("support_asia_remote_staff").default(0),
  serviceLocalStaff: integer("service_local_staff").default(0),
  serviceAsiaStaff: integer("service_asia_staff").default(0),
  focusAreas: text("focus_areas"), // JSON格式的重点领域
  focusScenarios: text("focus_scenarios"), // JSON格式的重点场景ID
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_region_code").on(table.regionCode),
]);

// 全球增长追踪器 - 收入记录表
export const globalGrowthRevenue = pgTable("global_growth_revenue", {
  id: serial('id').primaryKey(),
  regionId: integer("region_id").notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(), // 1-4
  month: integer("month"), // 1-12, optional for monthly tracking
  revenue: decimal("revenue", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  revenueType: revenueTypeEnum('revenueType').default('actual').notNull(),
  orderCount: integer("order_count").default(0),
  newCustomerCount: integer("new_customer_count").default(0),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_revenue_region").on(table.regionId),
  index("idx_revenue_year").on(table.year),
  index("idx_revenue_quarter").on(table.quarter),
]);

// 全球增长追踪器 - 资源预警表
export const globalGrowthAlerts = pgTable("global_growth_alerts", {
  id: serial('id').primaryKey(),
  alertCode: varchar("alert_code", { length: 50 }).notNull(),
  regionId: integer("region_id").notNull(),
  alertType: alertTypeEnum4('alertType').notNull(),
  severity: severityEnum1('severity').default('info').notNull(),
  message: text("message").notNull(),
  messageEn: text("message_en"),
  details: text("details"), // JSON格式的详细信息
  status: statusEnum77('status').default('active').notNull(),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_alert_code").on(table.alertCode),
  index("idx_alert_region").on(table.regionId),
  index("idx_alert_status").on(table.status),
]);



// ============================================================================
// 生产执行模块 (Production Execution Module) - v1.3.74
// T1-T15工作流程管理、工时采集、阶段审批
// ============================================================================

// 生产阶段定义表 - T1-T15阶段配置
export const productionStageDefinitions = pgTable("production_stage_definitions", {
  id: serial('id').primaryKey(),
  stageCode: varchar("stage_code", { length: 20 }).notNull(), // T1, T2, ... T15
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  stageNameZh: varchar("stage_name_zh", { length: 100 }).notNull(),
  stageOrder: integer("stage_order").notNull(), // 1-15
  defaultDuration: integer("default_duration").default(8), // 默认工时（小时）
  responsibleRole: responsibleRoleEnum('responsibleRole').notNull(),
  description: text("description"),
  descriptionZh: text("description_zh"),
  sopDocument: varchar("sop_document", { length: 500 }), // SOP文档链接
  requiredCertifications: text("required_certifications"), // JSON格式的所需资质
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_stage_code").on(table.stageCode),
  index("idx_stage_order").on(table.stageOrder),
]);

// 项目生产阶段实例表 - 具体项目的T1-T15执行状态
export const productionStages = pgTable("production_stages", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(), // 关联项目表
  stageDefinitionId: integer("stage_definition_id").notNull(), // 关联阶段定义
  stageCode: varchar("stage_code", { length: 20 }).notNull(), // T1-T15
  status: statusEnum78('status').default('Pending').notNull(),
  plannedHours: decimal("planned_hours", { precision: 10, scale: 2 }).default('0'),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }).default('0'),
  plannedStartDate: date("planned_start_date", { mode: 'string' }),
  plannedEndDate: date("planned_end_date", { mode: 'string' }),
  actualStartDate: date("actual_start_date", { mode: 'string' }),
  actualEndDate: date("actual_end_date", { mode: 'string' }),
  assignedUserId: integer("assigned_user_id"), // 负责人
  assignedUserName: varchar("assigned_user_name", { length: 100 }),
  completionPercentage: integer("completion_percentage").default(0), // 0-100
  notes: text("notes"),
  aiInsights: text("ai_insights"), // JSON格式的AI洞察
  contextData: text("context_data"), // JSON格式的上下文数据（如M2 Kickoff信息）
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_prod_stage_project").on(table.projectId),
  index("idx_prod_stage_code").on(table.stageCode),
  index("idx_prod_stage_status").on(table.status),
]);

// 生产阶段状态变更日志表
export const productionStageLogs = pgTable("production_stage_logs", {
  id: serial('id').primaryKey(),
  productionStageId: integer("production_stage_id").notNull(),
  projectId: integer("project_id").notNull(),
  stageCode: varchar("stage_code", { length: 20 }).notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedBy: integer("changed_by"),
  changedByName: varchar("changed_by_name", { length: 100 }),
  changeReason: text("change_reason"),
  metadata: text("metadata"), // JSON格式的额外信息
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_stage_log_stage").on(table.productionStageId),
  index("idx_stage_log_project").on(table.projectId),
]);

// 工时记录表 - 支持多种采集方式
export const timeRecords = pgTable("time_records", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 100 }),
  projectId: integer("project_id").notNull(),
  productionStageId: integer("production_stage_id"),
  stageCode: varchar("stage_code", { length: 20 }),
  recordDate: date("record_date", { mode: 'string' }).notNull(),
  startTime: timestamp("start_time", { mode: 'string' }),
  endTime: timestamp("end_time", { mode: 'string' }),
  duration: decimal("duration", { precision: 10, scale: 2 }), // 工时（小时）
  sourceType: sourceTypeEnum4('sourceType').default('MANUAL').notNull(),
  deviceId: varchar("device_id", { length: 100 }), // 采集设备ID
  locationData: text("location_data"), // JSON格式的位置数据（UWB）
  workType: workTypeEnum('workType').default('REGULAR'),
  description: text("description"),
  isVerified: smallint("is_verified").default(0),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_time_user").on(table.userId),
  index("idx_time_project").on(table.projectId),
  index("idx_time_stage").on(table.productionStageId),
  index("idx_time_date").on(table.recordDate),
]);

// 工时采集设备配置表
export const timeCollectionDevices = pgTable("time_collection_devices", {
  id: serial('id').primaryKey(),
  deviceCode: varchar("device_code", { length: 50 }).notNull(),
  deviceName: varchar("device_name", { length: 100 }).notNull(),
  deviceType: deviceTypeEnum1('deviceType').notNull(),
  location: varchar("location", { length: 200 }), // 设备位置描述
  coordinates: varchar("coordinates", { length: 100 }), // 坐标（x,y,z）
  associatedStageCode: varchar("associated_stage_code", { length: 20 }), // 关联的生产阶段
  ipAddress: varchar("ip_address", { length: 50 }),
  macAddress: varchar("mac_address", { length: 50 }),
  status: statusEnum79('status').default('OFFLINE'),
  lastHeartbeat: timestamp("last_heartbeat", { mode: 'string' }),
  configuration: text("configuration"), // JSON格式的设备配置
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_device_code").on(table.deviceCode),
  index("idx_device_type").on(table.deviceType),
]);

// 阶段审批规则表
export const stageApprovalRules = pgTable("stage_approval_rules", {
  id: serial('id').primaryKey(),
  stageCode: varchar("stage_code", { length: 20 }).notNull(), // T1-T15
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleNameZh: varchar("rule_name_zh", { length: 100 }),
  approverRole: responsibleRoleEnum('approverRole').notNull(),
  approverLevel: integer("approver_level").default(1), // 审批层级
  isRequired: smallint("is_required").default(1), // 是否必须审批
  autoApproveConditions: text("auto_approve_conditions"), // JSON格式的自动审批条件
  prerequisiteStages: text("prerequisite_stages"), // JSON格式的前置阶段列表
  description: text("description"),
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_approval_rule_stage").on(table.stageCode),
]);

// 阶段审批记录表
export const stageApprovals = pgTable("stage_approvals", {
  id: serial('id').primaryKey(),
  productionStageId: integer("production_stage_id").notNull(),
  projectId: integer("project_id").notNull(),
  stageCode: varchar("stage_code", { length: 20 }).notNull(),
  approvalRuleId: integer("approval_rule_id"),
  requestedBy: integer("requested_by").notNull(),
  requestedByName: varchar("requested_by_name", { length: 100 }),
  requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
  approverId: integer("approver_id"),
  approverName: varchar("approver_name", { length: 100 }),
  approverRole: varchar("approver_role", { length: 50 }),
  status: statusEnum80('status').default('PENDING').notNull(),
  approvalType: approvalTypeEnum('approvalType').default('STAGE_COMPLETE').notNull(),
  comments: text("comments"),
  rejectionReason: text("rejection_reason"),
  attachments: text("attachments"), // JSON格式的附件列表
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  metadata: text("metadata"), // JSON格式的额外信息
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_approval_stage").on(table.productionStageId),
  index("idx_approval_project").on(table.projectId),
  index("idx_approval_status").on(table.status),
  index("idx_approval_approver").on(table.approverId),
]);

// AI洞察知识库表 - 存储各阶段的AI建议和SOP
export const productionAiKnowledge = pgTable("production_ai_knowledge", {
  id: serial('id').primaryKey(),
  stageCode: varchar("stage_code", { length: 20 }).notNull(),
  knowledgeType: knowledgeTypeEnum1('knowledgeType').notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  titleZh: varchar("title_zh", { length: 200 }),
  content: text("content").notNull(),
  contentZh: text("content_zh"),
  priority: priorityEnum6('priority').default('MEDIUM'),
  applicableConditions: text("applicable_conditions"), // JSON格式的适用条件
  relatedFiles: text("related_files"), // JSON格式的相关文件列表
  tags: text("tags"), // JSON格式的标签
  isActive: smallint("is_active").default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_ai_knowledge_stage").on(table.stageCode),
  index("idx_ai_knowledge_type").on(table.knowledgeType),
]);

// 集成状态表 - Copilot 365 / WeCom等外部系统连接状态
export const integrationStatus = pgTable("integration_status", {
  id: serial('id').primaryKey(),
  integrationCode: varchar("integration_code", { length: 50 }).notNull(),
  integrationName: varchar("integration_name", { length: 100 }).notNull(),
  integrationType: integrationTypeEnum('integrationType').notNull(),
  status: statusEnum81('status').default('DISCONNECTED'),
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
  syncFrequency: integer("sync_frequency"), // 同步频率（分钟）
  configuration: text("configuration"), // JSON格式的配置信息
  errorMessage: text("error_message"),
  metadata: text("metadata"),
  isActive: smallint("is_active").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_integration_code").on(table.integrationCode),
  index("idx_integration_type").on(table.integrationType),
]);


// ============================================
// POS 项目型组织操作系统 数据模型
// ============================================

/**
 * 客户画像表 (customers_v2)
 * 包含客户类型、场景、决策权重、关键联系人等
 */
export const customersV2 = pgTable("customers_v2", {
  id: serial('id').primaryKey(),
  customerCode: varchar("customer_code", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  // 客户类型 [7种]: OEM, Tier1, Tier2, 终端用户, 贸易商, 系统集成商, 其他
  customerType: customerTypeEnum1('customerType').default('Other'),
  // 应用场景 [7种]: 汽车零部件, 航空航天, 医疗器械, 电子元器件, 光学镜片, 精密机械, 其他
  scenes: scenesEnum('scenes').default('Other'),
  // 决策权重 JSON: {tech: 0-100, price: 0-100, value: 0-100, relation: 0-100, boss: 0-100}
  decisionWeights: text("decision_weights"),
  // 关键联系人 JSON数组
  keyContacts: text("key_contacts"),
  // 交付风险等级
  deliveryRisk: deliveryRiskEnum('deliveryRisk').default('MEDIUM'),
  // 风险解决方案
  riskSolution: text("risk_solution"),
  // Jared策略 [11种策略标签]
  jaredStrategy: text("jared_strategy"),
  // 客户地址
  address: text("address"),
  // 客户行业
  industry: varchar("industry", { length: 100 }),
  // 年营收规模
  annualRevenue: varchar("annual_revenue", { length: 50 }),
  // 员工规模
  employeeCount: varchar("employee_count", { length: 50 }),
  // 客户等级
  customerLevel: customerLevelEnum('customerLevel').default('C'),
  // 创建人
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

/**
 * 项目主表 (projects_v2)
 * 项目全生命周期管理
 */
export const projectsV2 = pgTable("projects_v2", {
  id: serial('id').primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).notNull(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  customerId: integer("customer_id").notNull(),
  // 当前阶段 M0-M12
  currentStage: currentStageEnum1('currentStage').default('M0'),
  // 项目经理
  pm: integer("pm"),
  // 技术负责人
  techLeader: integer("tech_leader"),
  // 销售负责人
  salesOwner: integer("sales_owner"),
  // 服务负责人
  serviceOwner: integer("service_owner"),
  // 场景快照 (M2时刻的客户场景)
  sceneSnapshot: text("scene_snapshot"),
  // 决策快照 (M2时刻的决策权重)
  decisionSnapshot: text("decision_snapshot"),
  // 当前激活版本
  activeVersion: varchar("active_version", { length: 20 }),
  // 项目状态
  status: statusEnum82('status').default('Draft'),
  // 项目优先级
  priority: priorityEnum2('priority').default('P2'),
  // 预计开始日期
  plannedStartDate: date("planned_start_date"),
  // 预计结束日期
  plannedEndDate: date("planned_end_date"),
  // 实际开始日期
  actualStartDate: date("actual_start_date"),
  // 实际结束日期
  actualEndDate: date("actual_end_date"),
  // 项目预算
  budget: decimal("budget", { precision: 15, scale: 2 }),
  // 项目描述
  description: text("description"),
  // 创建人
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("projects_v2_code_idx").on(table.projectCode),
  index("projects_v2_customer_idx").on(table.customerId),
]);

/**
 * 项目阶段表 (project_stages_v2)
 * M0-M12每个阶段的详细记录
 */
export const projectStagesV2 = pgTable("project_stages_v2", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: currentStageEnum1('stageCode').notNull(),
  stageName: varchar("stage_name", { length: 100 }),
  // 阶段状态
  status: statusEnum83('status').default('NotStarted'),
  // 阶段负责人
  owner: integer("owner"),
  // 计划开始日期
  plannedStartDate: date("planned_start_date"),
  // 计划结束日期
  plannedEndDate: date("planned_end_date"),
  // 实际开始日期
  actualStartDate: date("actual_start_date"),
  // 实际结束日期
  actualEndDate: date("actual_end_date"),
  // 输入物 JSON
  inputJson: text("input_json"),
  // 输出物 JSON
  outputJson: text("output_json"),
  // 任务列表 JSON
  tasksJson: text("tasks_json"),
  // 审计日志 JSON
  auditLog: text("audit_log"),
  // 阶段备注
  notes: text("notes"),
  // 完成百分比
  completionPercent: integer("completion_percent").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("project_stages_v2_project_idx").on(table.projectId),
  index("project_stages_v2_stage_idx").on(table.stageCode),
]);

/**
 * 项目版本表 (project_versions)
 * AI版本管理 AIV0/V1/V2...
 */
export const projectVersions = pgTable("project_versions", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  versionCode: varchar("version_code", { length: 20 }).notNull(),
  // 基线项目编号 (用于AIV0生成)
  baseProjectCode: varchar("base_project_code", { length: 50 }),
  // 差异输入 (工程师差异增强框内容)
  deltaInput: text("delta_input"),
  // 版本JSON (M3-M12基线配置)
  versionJson: text("version_json"),
  // 变更摘要
  changesSummary: text("changes_summary"),
  // 版本状态
  status: statusEnum84('status').default('Draft'),
  // 创建人
  createdBy: integer("created_by"),
  // 确认人 (工程师确认)
  confirmedBy: integer("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
  // 激活人
  activatedBy: integer("activated_by"),
  activatedAt: timestamp("activated_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("project_versions_project_idx").on(table.projectId),
  index("project_versions_code_idx").on(table.versionCode),
]);

/**
 * PO建议表 (po_suggestions)
 * 采购建议管理
 */
export const poSuggestions = pgTable("po_suggestions", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  versionId: integer("version_id"),
  // 建议物料列表 JSON
  items: text("items"),
  // 工程确认状态
  engineerConfirm: engineerConfirmEnum('engineerConfirm').default('Pending'),
  engineerConfirmBy: integer("engineer_confirm_by"),
  engineerConfirmAt: timestamp("engineer_confirm_at", { mode: 'string' }),
  engineerNotes: text("engineer_notes"),
  // 采购确认状态
  procurementConfirm: engineerConfirmEnum('procurementConfirm').default('Pending'),
  procurementConfirmBy: integer("procurement_confirm_by"),
  procurementConfirmAt: timestamp("procurement_confirm_at", { mode: 'string' }),
  procurementNotes: text("procurement_notes"),
  // 最终PO引用
  finalPoRef: varchar("final_po_ref", { length: 100 }),
  // 状态
  status: statusEnum85('status').default('Draft'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("po_suggestions_project_idx").on(table.projectId),
]);

/**
 * MES同步表 (mes_sync)
 * MES工单与回写映射
 */
export const mesSync = pgTable("mes_sync", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id"),
  // MES工单号
  mesWorkOrderId: varchar("mes_work_order_id", { length: 100 }),
  // 工单类型
  workOrderType: workOrderTypeEnum('workOrderType').default('Production'),
  // 同步方向
  syncDirection: syncDirectionEnum1('syncDirection').default('Bidirectional'),
  // 同步状态
  syncStatus: syncStatusEnum3('syncStatus').default('Pending'),
  // 最后同步时间
  lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
  // 同步数据 JSON
  syncData: text("sync_data"),
  // 回写数据 JSON
  writebackData: text("writeback_data"),
  // 错误信息
  errorMessage: text("error_message"),
  // 重试次数
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("mes_sync_project_idx").on(table.projectId),
  index("mes_sync_work_order_idx").on(table.mesWorkOrderId),
]);

/**
 * M3/M4评审记录表 (stage_reviews)
 * 列车式评审记录
 */
export const stageReviews = pgTable("stage_reviews", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id").notNull(),
  // 评审类型
  reviewType: reviewTypeEnum1('reviewType').notNull(),
  // 评审车厢 (M4有5节: 机械/电气/质量/服务/采购)
  reviewCarriage: reviewCarriageEnum('reviewCarriage').default('General'),
  // 评审结论
  conclusion: conclusionEnum('conclusion').default('Pending'),
  // 风险列表 JSON
  risks: text("risks"),
  // 责任人
  responsible: integer("responsible"),
  // 完成时间
  completionDate: date("completion_date"),
  // 评审意见
  comments: text("comments"),
  // 附件列表 JSON
  attachments: text("attachments"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("stage_reviews_project_idx").on(table.projectId),
  index("stage_reviews_stage_idx").on(table.stageId),
]);

/**
 * 第三方连接器配置表 (third_party_connectors)
 * 采购/ERP/MES/IM连接器配置
 */
export const thirdPartyConnectors = pgTable("third_party_connectors", {
  id: serial('id').primaryKey(),
  connectorCode: varchar("connector_code", { length: 50 }).notNull(),
  connectorName: varchar("connector_name", { length: 100 }).notNull(),
  // 连接器类型
  connectorType: connectorTypeEnum('connectorType').notNull(),
  // 连接配置 JSON (不含敏感信息)
  config: text("config"),
  // 是否启用
  isEnabled: smallint("is_enabled").default(1),
  // 最后测试时间
  lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
  // 最后测试结果
  lastTestResult: lastTestResultEnum('lastTestResult').default('NotTested'),
  // 错误信息
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("third_party_connectors_code_idx").on(table.connectorCode),
]);


// ============================================================================
// 用户角色权限系统 - v1.5.8 Gemini代码整合
// 基于PostgreSQL Schema转换为MySQL/Drizzle ORM格式
// ============================================================================

/**
 * 用户角色枚举类型
 * admin: 系统管理员 - 完全访问权限
 * manager: 部门经理 - 管理权限
 * specialist: 专员 - 操作权限
 * viewer: 访客 - 只读权限
 */
export const userProfileRoleEnum = pgEnum("user_profile_role", ['admin', 'manager', 'specialist', 'viewer']);

/**
 * 用户配置表 (user_profiles_v2)
 * 存储用户角色、仪表盘布局和可见模块配置
 */
export const userProfilesV2 = pgTable("user_profiles_v2", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(), // 关联users表
  // 用户角色
  role: roleEnum5('role').default('viewer').notNull(),
  // 仪表盘布局配置 JSON
  // 存储该角色特有的仪表盘布局，包括：
  // - widgets: 小部件列表及其位置
  // - columns: 列数配置
  // - theme: 主题偏好
  // - defaultView: 默认视图
  dashboardLayout: json("dashboard_layout"),
  // 可见模块列表 JSON数组
  // 存储该角色可访问的模块ID列表
  // 例如: ["pos", "crm", "hrm", "production", "service"]
  visibleModules: text("visible_modules"),
  // 权限覆盖 JSON
  // 用于特殊情况下覆盖角色默认权限
  permissionOverrides: json("permission_overrides"),
  // 是否激活
  isActive: smallint("is_active").default(1).notNull(),
  // 最后登录时间
  lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
  // 创建人
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("user_profiles_v2_user_idx").on(table.userId),
  index("user_profiles_v2_role_idx").on(table.role),
]);

/**
 * 角色权限定义表 (role_permissions)
 * 定义每个角色的默认权限配置
 */
export const rolePermissionsV2 = pgTable("role_permissions_v2", {
  id: serial('id').primaryKey(),
  roleCode: roleEnum5('roleCode').notNull(),
  // 模块代码
  moduleCode: varchar("module_code", { length: 50 }).notNull(),
  // 模块名称
  moduleName: varchar("module_name", { length: 100 }).notNull(),
  // 权限类型
  permissionType: permissionTypeEnum('permissionType').notNull(),
  // 是否允许
  isAllowed: smallint("is_allowed").default(0).notNull(),
  // 条件限制 JSON
  // 例如: {"department": "own", "project": "assigned"}
  conditions: json("conditions"),
  // 描述
  description: text("description"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("role_permissions_v2_role_idx").on(table.roleCode),
  index("role_permissions_v2_module_idx").on(table.moduleCode),
]);

/**
 * 模块定义表 (system_modules)
 * 系统模块注册表
 */
export const systemModules = pgTable("system_modules", {
  id: serial('id').primaryKey(),
  moduleCode: varchar("module_code", { length: 50 }).notNull(),
  moduleName: varchar("module_name", { length: 100 }).notNull(),
  moduleNameEn: varchar("module_name_en", { length: 100 }),
  // 模块分类
  category: categoryEnum6('category').default('business'),
  // 模块图标
  icon: varchar("icon", { length: 50 }),
  // 模块路径
  path: varchar("path", { length: 200 }),
  // 父模块ID
  parentId: integer("parent_id"),
  // 排序
  sortOrder: integer("sort_order").default(0),
  // 是否需要认证
  requiresAuth: smallint("requires_auth").default(1),
  // 最低角色要求
  minRole: roleEnum5('minRole').default('viewer'),
  // 是否启用
  isEnabled: smallint("is_enabled").default(1),
  // 描述
  description: text("description"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("system_modules_code_idx").on(table.moduleCode),
  index("system_modules_parent_idx").on(table.parentId),
]);

/**
 * 仪表盘小部件定义表 (dashboard_widgets)
 * 定义可用的仪表盘小部件
 */
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial('id').primaryKey(),
  widgetCode: varchar("widget_code", { length: 50 }).notNull(),
  widgetName: varchar("widget_name", { length: 100 }).notNull(),
  widgetNameEn: varchar("widget_name_en", { length: 100 }),
  // 小部件类型
  widgetType: widgetTypeEnum('widgetType').notNull(),
  // 数据源
  dataSource: varchar("data_source", { length: 200 }),
  // 默认配置 JSON
  defaultConfig: json("default_config"),
  // 支持的角色
  supportedRoles: text("supported_roles"), // JSON数组: ["admin", "manager"]
  // 默认尺寸
  defaultWidth: integer("default_width").default(4), // 1-12 grid columns
  defaultHeight: integer("default_height").default(2), // grid rows
  // 是否可调整大小
  resizable: smallint("resizable").default(1),
  // 是否启用
  isEnabled: smallint("is_enabled").default(1),
  // 描述
  description: text("description"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("dashboard_widgets_code_idx").on(table.widgetCode),
  index("dashboard_widgets_type_idx").on(table.widgetType),
]);

/**
 * 用户仪表盘配置表 (user_dashboard_configs)
 * 存储用户个性化的仪表盘配置
 */
export const userDashboardConfigs = pgTable("user_dashboard_configs", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  // 仪表盘名称
  dashboardName: varchar("dashboard_name", { length: 100 }).notNull(),
  // 是否为默认仪表盘
  isDefault: smallint("is_default").default(0),
  // 布局配置 JSON
  // 包含小部件位置、大小等信息
  layoutConfig: json("layout_config"),
  // 小部件列表 JSON
  widgets: json("widgets"),
  // 主题配置
  theme: varchar("theme", { length: 20 }).default('system'),
  // 刷新间隔（秒）
  refreshInterval: integer("refresh_interval").default(300),
  // 是否共享
  isShared: smallint("is_shared").default(0),
  // 共享给的角色
  sharedWithRoles: text("shared_with_roles"), // JSON数组
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("user_dashboard_configs_user_idx").on(table.userId),
]);

/**
 * 权限审计日志表 (permission_audit_logs)
 * 记录权限变更历史
 */
export const permissionAuditLogsV2 = pgTable("permission_audit_logs_v2", {
  id: serial('id').primaryKey(),
  userId: integer("user_id").notNull(),
  // 操作类型
  actionType: actionTypeEnum('actionType').notNull(),
  // 操作前状态 JSON
  previousState: json("previous_state"),
  // 操作后状态 JSON
  newState: json("new_state"),
  // 操作人
  performedBy: integer("performed_by"),
  // 操作原因
  reason: text("reason"),
  // IP地址
  ipAddress: varchar("ip_address", { length: 50 }),
  // 用户代理
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("permission_audit_logs_v2_user_idx").on(table.userId),
  index("permission_audit_logs_v2_action_idx").on(table.actionType),
  index("permission_audit_logs_v2_time_idx").on(table.createdAt),
]);


// ============================================================================
// Smart Meeting Module - Database Schema
// 智能会议模块 - 数据库模式
// ============================================================================

// 会议表
export const meetings = pgTable("meetings", {
	id: varchar({ length: 36 }).primaryKey(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	channelId: varchar({ length: 36 }).notNull(),
	createdBy: integer().notNull(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	status: statusEnum30('status').default('scheduled').notNull(),
	meetingType: meetingTypeEnum('meetingType').default('other').notNull(),
	projectPhase: varchar({ length: 10 }), // M0-M12
	revenueTarget: decimal({ precision: 15, scale: 2 }), // 50M
	profitMargin: decimal({ precision: 5, scale: 2 }), // 14%
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("meetings_channelId_idx").on(table.channelId),
	index("meetings_createdBy_idx").on(table.createdBy),
	index("meetings_status_idx").on(table.status),
	index("meetings_startTime_idx").on(table.startTime),
]);

// 频道表
export const channels = pgTable("channels", {
	id: varchar({ length: 36 }).primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	organizationId: integer().notNull(),
	visibility: visibilityEnum('visibility').default('private').notNull(),
	createdBy: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("channels_organizationId_idx").on(table.organizationId),
	index("channels_createdBy_idx").on(table.createdBy),
	index("channels_visibility_idx").on(table.visibility),
]);

// 频道成员表
export const channelMembers = pgTable("channel_members", {
	id: varchar({ length: 36 }).primaryKey(),
	channelId: varchar({ length: 36 }).notNull(),
	userId: integer().notNull(),
	role: roleEnum6('role').default('member').notNull(),
	joinedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("channel_members_channelId_idx").on(table.channelId),
	index("channel_members_userId_idx").on(table.userId),
]);

// 会议笔记表
export const meetingNotes = pgTable("meeting_notes", {
	id: varchar({ length: 36 }).primaryKey(),
	meetingId: varchar({ length: 36 }).notNull(),
	content: text().notNull(), // Tiptap JSON
	editedBy: integer().notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("meeting_notes_meetingId_idx").on(table.meetingId),
	index("meeting_notes_editedBy_idx").on(table.editedBy),
]);

// AI洞察表
export const aiInsights = pgTable("ai_insights", {
	id: varchar({ length: 36 }).primaryKey(),
	meetingId: varchar({ length: 36 }).notNull(),
	insightType: insightTypeEnum('insightType').notNull(),
	content: text().notNull(),
	confidenceScore: decimal({ precision: 3, scale: 2 }).default('0.95'),
	generatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	generatedBy: varchar({ length: 50 }).default('gemini-1.5-pro'),
}, (table) => [
	index("ai_insights_meetingId_idx").on(table.meetingId),
	index("ai_insights_insightType_idx").on(table.insightType),
]);

// 审计日志表
export const auditLogs = pgTable("audit_logs", {
	id: varchar({ length: 36 }).primaryKey(),
	userId: integer().notNull(),
	action: varchar({ length: 100 }).notNull(),
	resourceType: varchar({ length: 50 }),
	resourceId: varchar({ length: 36 }),
	details: json(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar({ length: 45 }),
}, (table) => [
	index("audit_logs_userId_idx").on(table.userId),
	index("audit_logs_action_idx").on(table.action),
	index("audit_logs_timestamp_idx").on(table.timestamp),
]);

// 会议参与者表
export const meetingParticipants = pgTable("meeting_participants", {
	id: varchar({ length: 36 }).primaryKey(),
	meetingId: varchar({ length: 36 }).notNull(),
	userId: integer().notNull(),
	role: roleEnum7('role').default('participant').notNull(),
	joinedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	leftAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("meeting_participants_meetingId_idx").on(table.meetingId),
	index("meeting_participants_userId_idx").on(table.userId),
]);

// 会议附件表
export const meetingAttachments = pgTable("meeting_attachments", {
	id: varchar({ length: 36 }).primaryKey(),
	meetingId: varchar({ length: 36 }).notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: integer().notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	uploadedBy: integer().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("meeting_attachments_meetingId_idx").on(table.meetingId),
	index("meeting_attachments_uploadedBy_idx").on(table.uploadedBy),
]);

// 实时协作状态表（用于Y.js同步）
export const collaborationStates = pgTable("collaboration_states", {
	id: varchar({ length: 36 }).primaryKey(),
	meetingId: varchar({ length: 36 }).notNull(),
	documentId: varchar({ length: 36 }).notNull(),
	state: text().notNull(), // Y.js binary state (base64 encoded)
	version: integer().default(0).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("collaboration_states_meetingId_idx").on(table.meetingId),
	index("collaboration_states_documentId_idx").on(table.documentId),
]);


// ========================================
// 员工离职数据管理模块 (Employee Offboarding)
// ========================================

/**
 * 离职记录主表 (employee_offboarding)
 * 记录员工离职的核心信息、顶替者、数据保留策略
 */
export const employeeOffboarding = pgTable("employee_offboarding", {
  id: serial('id').primaryKey(),
  // 离职员工信息
  employeeId: integer("employee_id").notNull(), // 关联 hrmEmployees.id
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  department: varchar({ length: 100 }).notNull(),
  position: varchar({ length: 100 }).notNull(),
  hireDate: date("hire_date"),
  offboardingDate: date("offboarding_date").notNull(), // 离职日期
  lastWorkingDate: date("last_working_date").notNull(), // 最后工作日
  // 离职原因
  reason: reasonEnum('reason').notNull(),
  reasonDetail: text("reason_detail"),
  // 顶替者/继任者信息
  successorType: successorTypeEnum('successorType').default('replacement').notNull(),
  successorId: integer("successor_id"), // 关联 hrmEmployees.id（顶替者）
  successorName: varchar("successor_name", { length: 100 }),
  backupPersonId: integer("backup_person_id"), // 临时Backup人员
  backupPersonName: varchar("backup_person_name", { length: 100 }),
  // 数据保留策略
  dataRetentionPolicy: dataRetentionPolicyEnum('dataRetentionPolicy').default('permanent').notNull(),
  performanceDataHandling: performanceDataHandlingEnum('performanceDataHandling').default('keep_under_original').notNull(),
  // Profile处理
  profileHandling: profileHandlingEnum('profileHandling').default('archive').notNull(),
  // 电话号码处理
  phoneHandling: phoneHandlingEnum('phoneHandling').default('return_to_pool').notNull(),
  companyPhone: varchar("company_phone", { length: 30 }),
  // 邮件处理
  emailHandling: emailHandlingEnum('emailHandling').default('forward_to_successor').notNull(),
  emailForwardTo: varchar("email_forward_to", { length: 200 }),
  emailForwardDuration: integer("email_forward_duration").default(90), // 转发天数
  // 审批状态
  approvalStatus: approvalStatusEnum2('approvalStatus').default('draft').notNull(),
  // 整体状态
  status: statusEnum86('status').default('draft').notNull(),
  // 备注
  notes: text(),
  // 创建和更新
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
  index("offboarding_employee_id_idx").on(table.employeeId),
  index("offboarding_successor_id_idx").on(table.successorId),
  index("offboarding_status_idx").on(table.status),
  index("offboarding_date_idx").on(table.offboardingDate),
]);

/**
 * 工作交接清单表 (offboarding_handover_items)
 * 记录离职员工需要交接的所有工作项目
 */
export const offboardingHandoverItems = pgTable("offboarding_handover_items", {
  id: serial('id').primaryKey(),
  offboardingId: integer("offboarding_id").notNull(), // 关联 employeeOffboarding.id
  // 交接项目信息
  category: categoryEnum7('category').notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  description: text(),
  priority: priorityEnum1('priority').default('medium').notNull(),
  // 关联信息
  relatedProjectId: integer("related_project_id"), // 关联项目ID
  relatedClientId: integer("related_client_id"), // 关联客户ID
  // 交接对象
  handoverToId: integer("handover_to_id"), // 接收人ID
  handoverToName: varchar("handover_to_name", { length: 100 }),
  // 交接状态
  status: statusEnum87('status').default('pending').notNull(),
  completionDate: date("completion_date"),
  verifiedBy: integer("verified_by"), // 验证人ID
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  // 备注
  notes: text(),
  attachmentUrl: text("attachment_url"), // 交接文档附件
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("handover_offboarding_id_idx").on(table.offboardingId),
  index("handover_category_idx").on(table.category),
  index("handover_status_idx").on(table.status),
]);

/**
 * 绩效归属记录表 (performance_attribution)
 * 记录离职前/后的绩效数据归属
 */
export const performanceAttribution = pgTable("performance_attribution", {
  id: serial('id').primaryKey(),
  offboardingId: integer("offboarding_id").notNull(),
  // 绩效项信息
  kpiName: varchar("kpi_name", { length: 200 }).notNull(),
  kpiCategory: varchar("kpi_category", { length: 100 }),
  period: varchar({ length: 50 }).notNull(), // e.g., "2026-Q1", "2026-01"
  periodType: periodTypeEnum2('periodType').notNull(),
  // 归属标注
  attributionType: attributionTypeEnum('attributionType').notNull(),
  // 离职者贡献
  originalEmployeeId: integer("original_employee_id").notNull(),
  originalEmployeeName: varchar("original_employee_name", { length: 100 }).notNull(),
  originalContributionPercent: integer("original_contribution_percent").default(100), // 0-100
  // 继任者贡献
  successorId: integer("successor_id"),
  successorName: varchar("successor_name", { length: 100 }),
  successorContributionPercent: integer("successor_contribution_percent").default(0), // 0-100
  // 绩效数据
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  unit: varchar({ length: 50 }),
  // 主管确认
  confirmedBy: integer("confirmed_by"), // 主管ID
  confirmedByName: varchar("confirmed_by_name", { length: 100 }),
  confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
  confirmationNotes: text("confirmation_notes"),
  // 数据来源备注
  dataSourceNote: text("data_source_note"), // e.g., "离职前数据 - 由张三在2026-03-15前完成"
  // 状态
  status: statusEnum88('status').default('pending_confirmation').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("perf_attr_offboarding_id_idx").on(table.offboardingId),
  index("perf_attr_original_employee_idx").on(table.originalEmployeeId),
  index("perf_attr_successor_idx").on(table.successorId),
  index("perf_attr_period_idx").on(table.period),
  index("perf_attr_type_idx").on(table.attributionType),
]);

/**
 * 资产交接表 (asset_handover)
 * 记录离职员工的IT资产、Profile、账号等交接
 */
export const assetHandover = pgTable("asset_handover", {
  id: serial('id').primaryKey(),
  offboardingId: integer("offboarding_id").notNull(),
  // 资产信息
  assetCategory: assetCategoryEnum('assetCategory').notNull(),
  assetName: varchar("asset_name", { length: 200 }).notNull(),
  assetDescription: text("asset_description"),
  assetIdentifier: varchar("asset_identifier", { length: 100 }), // 资产编号/账号
  // 处理方式
  handlingAction: handlingActionEnum('handlingAction').notNull(),
  // 转交对象
  transferToId: integer("transfer_to_id"),
  transferToName: varchar("transfer_to_name", { length: 100 }),
  // 临时保留设置
  temporaryRetainUntil: date("temporary_retain_until"), // 临时保留到期日
  // 状态
  status: statusEnum87('status').default('pending').notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: integer("completed_by"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("asset_offboarding_id_idx").on(table.offboardingId),
  index("asset_category_idx").on(table.assetCategory),
  index("asset_status_idx").on(table.status),
]);

/**
 * 离职审批流程表 (offboarding_approvals)
 * 多级审批：主管 → HR → 财务 → IT
 */
export const offboardingApprovals = pgTable("offboarding_approvals", {
  id: serial('id').primaryKey(),
  offboardingId: integer("offboarding_id").notNull(),
  // 审批级别
  approvalLevel: approvalLevelEnum('approvalLevel').notNull(),
  approvalOrder: integer("approval_order").notNull(), // 1=主管, 2=HR, 3=财务, 4=IT
  // 审批人
  approverId: integer("approver_id").notNull(),
  approverName: varchar("approver_name", { length: 100 }).notNull(),
  approverRole: varchar("approver_role", { length: 100 }),
  // 审批结果
  decision: decisionEnum('decision').default('pending').notNull(),
  comments: text(),
  // 审批检查项
  checklistItems: text("checklist_items"), // JSON: [{item: string, checked: boolean}]
  // 时间
  submittedAt: timestamp("submitted_at", { mode: 'string' }),
  decidedAt: timestamp("decided_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("approval_offboarding_id_idx").on(table.offboardingId),
  index("approval_level_idx").on(table.approvalLevel),
  index("approval_approver_idx").on(table.approverId),
  index("approval_decision_idx").on(table.decision),
]);

/**
 * 离职数据查询日志表 (offboarding_data_query_log)
 * 记录对离职员工数据的查询，支持按周期过滤和标注
 */
export const offboardingDataQueryLog = pgTable("offboarding_data_query_log", {
  id: serial('id').primaryKey(),
  queryUserId: integer("query_user_id").notNull(),
  queryType: queryTypeEnum('queryType').notNull(),
  queryPeriod: periodTypeEnum2('queryPeriod').notNull(),
  targetEmployeeId: integer("target_employee_id").notNull(),
  isOffboarded: smallint("is_offboarded").default(1).notNull(),
  offboardingDate: date("offboarding_date"),
  resultCount: integer("result_count").default(0),
  queryParams: text("query_params"), // JSON
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("query_log_user_idx").on(table.queryUserId),
  index("query_log_target_idx").on(table.targetEmployeeId),
]);


/**
 * ==========================================
 * 事业部管理系统 (Business Unit Management)
 * ==========================================
 */

/**
 * 事业部主表 (business_units)
 * 存储公司的各个事业部信息
 */
export const businessUnits = pgTable("business_units", {
  id: serial('id').primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: integer("manager_id"),
  parentBuId: integer("parent_bu_id"), // 支持嵌套事业部
  fiscalYear: integer("fiscal_year"),
  status: statusEnum89('status').default('active').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("bu_code_idx").on(table.code),
  index("bu_manager_idx").on(table.managerId),
  index("bu_status_idx").on(table.status),
]);

/**
 * 事业部绩效表 (bu_performance)
 * 存储事业部的各维度绩效指标
 */
export const buPerformance = pgTable("bu_performance", {
  id: serial('id').primaryKey(),
  buId: integer("bu_id").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalQuarter: integer("fiscal_quarter"), // Q1, Q2, Q3, Q4
  
  // 经营指标 (Operational)
  revenue: decimal("revenue", { precision: 15, scale: 2 }),
  revenueTarget: decimal("revenue_target", { precision: 15, scale: 2 }),
  revenueAchievementRate: decimal("revenue_achievement_rate", { precision: 5, scale: 2 }),
  
  // 交付指标 (Delivery)
  projectsCompleted: integer("projects_completed"),
  projectsOnTime: integer("projects_on_time"),
  deliveryOnTimeRate: decimal("delivery_on_time_rate", { precision: 5, scale: 2 }),
  projectSatisfaction: decimal("project_satisfaction", { precision: 3, scale: 2 }),
  
  // 成本指标 (Cost)
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }),
  costBudget: decimal("cost_budget", { precision: 15, scale: 2 }),
  costVarianceRate: decimal("cost_variance_rate", { precision: 5, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 15, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 15, scale: 2 }),
  
  // 质量指标 (Quality)
  defectRate: decimal("defect_rate", { precision: 5, scale: 2 }),
  reworkRate: decimal("rework_rate", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }),
  customerComplaintCount: integer("customer_complaint_count"),
  
  // 客户指标 (Customer)
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }),
  customerRetentionRate: decimal("customer_retention_rate", { precision: 5, scale: 2 }),
  newCustomerCount: integer("new_customer_count"),
  customerLifetimeValue: decimal("customer_lifetime_value", { precision: 15, scale: 2 }),
  
  // 人力资源指标 (HR)
  employeeCount: integer("employee_count"),
  employeeTurnoverRate: decimal("employee_turnover_rate", { precision: 5, scale: 2 }),
  trainingHoursPerEmployee: decimal("training_hours_per_employee", { precision: 8, scale: 2 }),
  employeeSatisfaction: decimal("employee_satisfaction", { precision: 3, scale: 2 }),
  
  // 创新指标 (Innovation)
  innovationProjects: integer("innovation_projects"),
  patentCount: integer("patent_count"),
  processImprovementCount: integer("process_improvement_count"),
  innovationInvestment: decimal("innovation_investment", { precision: 15, scale: 2 }),
  
  // 综合评分
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  overallRating: varchar("overall_rating", { length: 20 }), // A+, A, B+, B, C
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("perf_bu_idx").on(table.buId),
  index("perf_year_idx").on(table.fiscalYear),
  index("perf_quarter_idx").on(table.fiscalQuarter),
]);

/**
 * 关键绩效指标定义表 (bu_kpis)
 * 存储事业部的KPI定义和目标
 */
export const buKpis = pgTable("bu_kpis", {
  id: serial('id').primaryKey(),
  buId: integer("bu_id").notNull(),
  kpiCode: varchar("kpi_code", { length: 50 }).notNull(),
  kpiName: varchar("kpi_name", { length: 255 }).notNull(),
  dimension: varchar("dimension", { length: 50 }).notNull(), // operational, delivery, cost, quality, customer, hr, innovation
  unit: varchar("unit", { length: 50 }), // %, 万元, 个, 小时等
  
  fiscalYear: integer("fiscal_year").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }), // 权重 (%)
  
  // 阈值定义
  excellentThreshold: decimal("excellent_threshold", { precision: 15, scale: 2 }),
  goodThreshold: decimal("good_threshold", { precision: 15, scale: 2 }),
  acceptableThreshold: decimal("acceptable_threshold", { precision: 15, scale: 2 }),
  
  // 计算规则
  calculationMethod: varchar("calculation_method", { length: 100 }), // manual, formula, aggregation
  calculationFormula: text("calculation_formula"),
  dataSource: varchar("data_source", { length: 255 }),
  
  status: statusEnum12('status').default('active').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("kpi_bu_idx").on(table.buId),
  index("kpi_code_idx").on(table.kpiCode),
  index("kpi_dimension_idx").on(table.dimension),
]);

/**
 * 绩效历史表 (bu_performance_history)
 * 记录事业部绩效指标的变化历史
 */
export const buPerformanceHistory = pgTable("bu_performance_history", {
  id: serial('id').primaryKey(),
  buId: integer("bu_id").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalQuarter: integer("fiscal_quarter"),
  
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  oldValue: decimal("old_value", { precision: 15, scale: 2 }),
  newValue: decimal("new_value", { precision: 15, scale: 2 }),
  changeReason: text("change_reason"),
  
  changedBy: integer("changed_by"),
  changeTimestamp: timestamp("change_timestamp", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("hist_bu_idx").on(table.buId),
  index("hist_period_idx").on(table.fiscalYear, table.fiscalQuarter),
]);

/**
 * 项目评分表 (project_scores)
 * 存储项目的各维度评分
 */
export const projectScores = pgTable("project_scores", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  buId: integer("bu_id"),
  
  deliveryScore: decimal("delivery_score", { precision: 3, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }),
  costScore: decimal("cost_score", { precision: 3, scale: 2 }),
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }),
  
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }),
  
  evaluationDate: timestamp("evaluation_date", { mode: 'string' }),
  evaluatorId: integer("evaluator_id"),
  comments: text("comments"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("proj_score_project_idx").on(table.projectId),
  index("proj_score_bu_idx").on(table.buId),
]);

/**
 * 项目成员评分表 (project_member_scores)
 * 存储项目成员的个人评分
 */
export const projectMemberScores = pgTable("project_member_scores", {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  buId: integer("bu_id"),
  
  performanceScore: decimal("performance_score", { precision: 3, scale: 2 }),
  capabilityScore: decimal("capability_score", { precision: 3, scale: 2 }),
  collaborationScore: decimal("collaboration_score", { precision: 3, scale: 2 }),
  innovationScore: decimal("innovation_score", { precision: 3, scale: 2 }),
  
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }),
  
  evaluationDate: timestamp("evaluation_date", { mode: 'string' }),
  evaluatorId: integer("evaluator_id"),
  comments: text("comments"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("member_score_project_idx").on(table.projectId),
  index("member_score_employee_idx").on(table.employeeId),
  index("member_score_bu_idx").on(table.buId),
]);

/**
 * 事业部员工表 (bu_employees)
 * 存储事业部的员工信息
 */
export const buEmployees = pgTable("bu_employees", {
  id: serial('id').primaryKey(),
  buId: integer("bu_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  role: varchar("role", { length: 100 }),
  department: varchar("department", { length: 100 }),
  joinDate: date("join_date"),
  leaveDate: date("leave_date"),
  status: statusEnum90('status').default('active').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("bu_emp_bu_idx").on(table.buId),
  index("bu_emp_employee_idx").on(table.employeeId),
  index("bu_emp_status_idx").on(table.status),
]);

// =============================================================================
// Phase A: 工程文档AI推荐系统 (Document Intelligence)
// =============================================================================

/**
 * 文档向量嵌入表 (document_embeddings)
 * 存储文档的语义向量，用于相似度搜索和AI推荐
 * 嵌入向量以JSON文本存储，兼容所有PostgreSQL部署（无需pgvector扩展）
 */
export const documentEmbeddings = pgTable("document_embeddings", {
  id: serial("id").primaryKey(),

  // 文档来源 - 支持多个文档表
  sourceTable: varchar("source_table", { length: 50 }).notNull(), // 'project_documents' | 'technical_documents'
  sourceId: integer("source_id").notNull(),

  // 项目和阶段上下文
  projectId: integer("project_id"),
  stageCode: varchar("stage_code", { length: 10 }), // M0-M12

  // 文档元数据（冗余存储，避免频繁JOIN）
  documentTitle: varchar("document_title", { length: 300 }).notNull(),
  documentType: varchar("document_type", { length: 50 }),

  // 用于生成嵌入的文本摘要
  contentDigest: text("content_digest").notNull(),

  // 向量嵌入 (JSON数组 float[])
  embedding: text("embedding").notNull(), // JSON: number[] (1536 dims for OpenAI)
  embeddingModel: varchar("embedding_model", { length: 50 }).notNull(), // 'text-embedding-3-small'
  embeddingDim: integer("embedding_dim").notNull(), // 1536

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("doc_emb_source_idx").on(table.sourceTable, table.sourceId),
  index("doc_emb_project_idx").on(table.projectId),
  index("doc_emb_stage_idx").on(table.stageCode),
]);

/**
 * 阶段文档需求定义表 (stage_document_requirements)
 * 定义每个M阶段需要的文档类型和要求
 */
export const stageDocumentRequirements = pgTable("stage_document_requirements", {
  id: serial("id").primaryKey(),
  stageCode: varchar("stage_code", { length: 10 }).notNull(), // M0-M12

  documentName: varchar("document_name", { length: 200 }).notNull(),
  documentNameEn: varchar("document_name_en", { length: 200 }),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  description: text("description"),
  descriptionEn: text("description_en"),

  isMandatory: smallint("is_mandatory").default(1).notNull(), // 1=必须, 0=可选
  templateUrl: text("template_url"), // 文档模板链接

  sortOrder: integer("sort_order").default(0).notNull(),

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("stage_doc_req_stage_idx").on(table.stageCode),
]);

/**
 * 文档推荐日志表 (document_recommendation_logs)
 * 记录AI文档推荐的历史和用户反馈
 */
export const documentRecommendationLogs = pgTable("document_recommendation_logs", {
  id: serial("id").primaryKey(),

  // 推荐上下文
  projectId: integer("project_id").notNull(),
  stageCode: varchar("stage_code", { length: 10 }).notNull(),
  userId: integer("user_id").notNull(),

  // 推荐结果
  recommendedDocIds: text("recommended_doc_ids").notNull(), // JSON: number[]
  similarityScores: text("similarity_scores").notNull(), // JSON: number[]
  aiReasoning: text("ai_reasoning"), // AI生成的推荐理由

  // 用户反馈
  feedback: varchar("feedback", { length: 20 }), // 'helpful' | 'not_helpful' | null
  feedbackComment: text("feedback_comment"),

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("doc_rec_log_project_idx").on(table.projectId),
  index("doc_rec_log_stage_idx").on(table.stageCode),
]);

// ==================== CRM Module V2 Tables ====================

/**
 * CRM客户表V2 (crm_customers_v2)
 * 增强版客户主数据管理 - 支持编码自动生成、税号、年收入等字段
 */
export const crmCustomersV2 = pgTable("crm_customers_v2", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  shortName: varchar("short_name", { length: 100 }),
  type: varchar("type", { length: 20 }).notNull().default('prospect'),
  level: varchar("level", { length: 5 }).default('C'),
  industry: varchar("industry", { length: 100 }),
  region: varchar("region", { length: 100 }),
  address: text("address"),
  website: varchar("website", { length: 300 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  taxId: varchar("tax_id", { length: 50 }),
  annualRevenue: decimal("annual_revenue", { precision: 15, scale: 2 }),
  employeeCount: integer("employee_count"),
  source: varchar("source", { length: 50 }),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 20 }).default('active'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("crm_customers_v2_code_idx").on(table.code),
  index("crm_customers_v2_type_idx").on(table.type),
  index("crm_customers_v2_status_idx").on(table.status),
  index("crm_customers_v2_assigned_to_idx").on(table.assignedTo),
  index("crm_customers_v2_level_idx").on(table.level),
]);

/**
 * CRM联系人表V2 (crm_contacts_v2)
 * 增强版联系人管理 - 支持座机、微信、关键人标记
 */
export const crmContactsV2 = pgTable("crm_contacts_v2", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  mobile: varchar("mobile", { length: 50 }),
  landline: varchar("landline", { length: 50 }),
  email: varchar("email", { length: 200 }),
  wechat: varchar("wechat", { length: 100 }),
  isKeyPerson: boolean("is_key_person").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("crm_contacts_v2_customer_id_idx").on(table.customerId),
]);

/**
 * CRM商机表V2 (crm_opportunities_v2)
 * 增强版商机管理 - 支持多币种、项目关联、竞品分析
 */
export const crmOpportunitiesV2 = pgTable("crm_opportunities_v2", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  customerId: integer("customer_id").notNull(),
  contactId: integer("contact_id"),
  stage: varchar("stage", { length: 30 }).notNull().default('qualification'),
  expectedAmount: decimal("expected_amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default('CNY'),
  probability: integer("probability").default(20),
  expectedCloseDate: date("expected_close_date", { mode: 'string' }),
  actualCloseDate: date("actual_close_date", { mode: 'string' }),
  productInterest: text("product_interest"),
  competitorInfo: text("competitor_info"),
  lostReason: text("lost_reason"),
  assignedTo: integer("assigned_to"),
  projectId: integer("project_id"),
  source: varchar("source", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("crm_opportunities_v2_customer_id_idx").on(table.customerId),
  index("crm_opportunities_v2_stage_idx").on(table.stage),
  index("crm_opportunities_v2_assigned_to_idx").on(table.assignedTo),
  index("crm_opportunities_v2_contact_id_idx").on(table.contactId),
]);

/**
 * CRM线索表 (crm_leads)
 * 销售线索管理 - 支持AI信心评分、线索转换追踪
 */
export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  source: varchar("source", { length: 50 }),
  productInterest: text("product_interest"),
  estimatedBudget: decimal("estimated_budget", { precision: 15, scale: 2 }),
  priority: varchar("priority", { length: 20 }).default('medium'),
  status: varchar("status", { length: 30 }).default('new'),
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 4 }),
  assignedTo: integer("assigned_to"),
  convertedCustomerId: integer("converted_customer_id"),
  convertedOpportunityId: integer("converted_opportunity_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("crm_leads_status_idx").on(table.status),
  index("crm_leads_priority_idx").on(table.priority),
  index("crm_leads_assigned_to_idx").on(table.assignedTo),
]);

// ==================== 设计变更 → BOM → PO 联动事件表 ====================

/**
 * 变更事件表 (change_events)
 * 记录设计变更、BOM变更、采购单更新的链式事件
 *
 * 链路: design_change → bom_change → po_update
 * 当机械设计变更时，通知BOM更新；当BOM变更时，通知采购更新PO
 */
export const changeEvents = pgTable("change_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'design_change' | 'bom_change' | 'po_update'
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  sourceChangeId: integer("source_change_id"), // FK to self, for chaining (design_change → bom_change → po_update)
  status: varchar("status", { length: 30 }).notNull().default('pending'), // 'pending' | 'acknowledged' | 'resolved'
  affectedItems: text("affected_items"), // JSON array - list of affected BOM items or PO lines
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  acknowledgedBy: integer("acknowledged_by"),
}, (table) => [
  index("change_events_project_id_idx").on(table.projectId),
  index("change_events_type_idx").on(table.type),
  index("change_events_status_idx").on(table.status),
  index("change_events_source_change_id_idx").on(table.sourceChangeId),
  index("change_events_created_by_idx").on(table.createdBy),
]);

/**
 * CRM Interaction Log - Customer interaction tracking with complaint early warning
 *
 * Records all customer interactions (calls, emails, visits, complaints, meetings, wechat).
 * Complaint interactions are flagged with severity for early warning purposes.
 */
export const crmInteractions = pgTable("crm_interactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  opportunityId: integer("opportunity_id"),
  type: varchar("type", { length: 30 }).notNull(), // call, email, visit, complaint, meeting, wechat
  subject: varchar("subject", { length: 300 }).notNull(),
  content: text("content"),
  sentiment: varchar("sentiment", { length: 20 }).default("neutral"), // positive, neutral, negative
  isComplaint: boolean("is_complaint").default(false),
  complaintSeverity: varchar("complaint_severity", { length: 20 }), // low, medium, high, critical
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

/**
 * Knowledge Documents - RAG知识库文档表
 *
 * 存储GRT实施过程中的技术知识、工艺标准、材料规格、案例等知识条目，
 * 供AI助手进行检索增强生成(RAG)使用。
 */
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // technical, process, material, standard, case_study, faq
  content: text("content").notNull(),
  tags: text("tags"), // JSON array of tags
  projectId: integer("project_id"), // optional link to project
  stageCode: varchar("stage_code", { length: 10 }), // M0-M12 or T1-T15
  processCode: varchar("process_code", { length: 10 }), // T1-T15
  source: varchar("source", { length: 100 }), // manual, plm_import, erp_import, meeting_extract
  relevanceScore: integer("relevance_score").default(0), // usage-based ranking
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// ==================== 物料-工步关联 (Step Materials) ====================

/**
 * 工步物料关联表 (step_materials)
 * 记录每个BOM工步所需的物料及其备料状态
 */
export const stepMaterials = pgTable("step_materials", {
  id: serial("id").primaryKey(),
  bomStepId: integer("bom_step_id").notNull(),
  materialCode: varchar("material_code", { length: 50 }).notNull(),
  materialName: varchar("material_name", { length: 200 }).notNull(),
  requiredQty: integer("required_qty").notNull().default(1),
  unit: varchar("unit", { length: 20 }).default("pcs"),
  availableQty: integer("available_qty").default(0),
  isReady: boolean("is_ready").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// ==================== BOM步骤返工历史 (Step Rework History) ====================

/**
 * 工步返工历史表 (step_rework_history)
 * 记录BOM工步的每次返工事件
 */
export const stepReworkHistory = pgTable("step_rework_history", {
  id: serial("id").primaryKey(),
  bomStepId: integer("bom_step_id").notNull(),
  reworkCount: integer("rework_count").notNull(),
  reason: text("reason").notNull(),
  triggeredBy: integer("triggered_by").notNull(),
  triggeredAt: timestamp("triggered_at", { mode: "string" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "string" }),
});

// ==================== 质量缺陷附件 (Quality Defect Attachments) ====================

/**
 * Quality Defect Attachments - 质量缺陷附件表
 *
 * 存储质量检查过程中发现的缺陷相关附件（照片、报告等），
 * 关联到质量工序锁定记录。
 */
export const qualityDefectAttachments = pgTable("quality_defect_attachments", {
  id: serial("id").primaryKey(),
  lockId: varchar("lock_id", { length: 50 }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at", { mode: "string" }).defaultNow().notNull(),
});


// ==================== Spare Part Requests ====================

/**
 * spare_part_requests - 备件请求表
 * 现场服务工程师发起的备件申请工作流
 */
export const sparePartRequests = pgTable("spare_part_requests", {
  id: serial("id").primaryKey(),
  serviceLogId: integer("service_log_id"),
  projectId: integer("project_id"),
  partName: varchar("part_name", { length: 255 }).notNull(),
  partCode: varchar("part_code", { length: 50 }),
  quantity: integer("quantity").notNull().default(1),
  urgency: varchar("urgency", { length: 20 }).default("normal"),
  status: varchar("status", { length: 20 }).default("requested"),
  requestedBy: integer("requested_by"),
  requestedByName: varchar("requested_by_name", { length: 100 }),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  shipmentTracking: varchar("shipment_tracking", { length: 100 }),
  estimatedArrival: timestamp("estimated_arrival", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// ==================== Field Quality Escalations ====================

/**
 * field_quality_escalations - 现场质量上报表
 * 现场发现的质量问题上报到工厂的工作流
 */
export const fieldQualityEscalations = pgTable("field_quality_escalations", {
  id: serial("id").primaryKey(),
  serviceLogId: integer("service_log_id"),
  projectId: integer("project_id"),
  equipmentSerial: varchar("equipment_serial", { length: 100 }),
  severity: varchar("severity", { length: 20 }).notNull(),
  issueCategory: varchar("issue_category", { length: 50 }),
  description: text("description").notNull(),
  affectedProcess: varchar("affected_process", { length: 20 }),
  factoryLockId: integer("factory_lock_id"),
  status: varchar("status", { length: 20 }).default("reported"),
  reportedBy: integer("reported_by"),
  reportedByName: varchar("reported_by_name", { length: 100 }),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});


// ========== FAT/SAT Tables ==========

export const fatTestPlans = pgTable("fat_test_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  planType: varchar("plan_type", { length: 10 }).notNull(), // 'FAT' or 'SAT'
  planName: varchar("plan_name", { length: 255 }).notNull(),
  equipmentModel: varchar("equipment_model", { length: 100 }),
  customerName: varchar("customer_name", { length: 255 }),
  testLocation: text("test_location"),
  plannedDate: timestamp("planned_date"),
  status: varchar("status", { length: 20 }).default("draft"), // draft, in_progress, completed, cancelled
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fatTestItems = pgTable("fat_test_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // mechanical, electrical, safety, performance, environmental
  itemName: varchar("item_name", { length: 255 }).notNull(),
  specification: text("specification"), // e.g. "12 ± 1 MPa"
  passCriteria: text("pass_criteria"),
  actualValue: varchar("actual_value", { length: 100 }), // measured value
  unit: varchar("unit", { length: 20 }), // MPa, °C, mm, etc
  result: varchar("result", { length: 20 }).default("pending"), // pending, passed, failed, conditional
  testerId: integer("tester_id"),
  testerName: varchar("tester_name", { length: 100 }),
  testedAt: timestamp("tested_at"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fatChecklists = pgTable("fat_checklists", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // mechanical, electrical, safety, documentation
  itemName: varchar("item_name", { length: 255 }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  responsiblePerson: varchar("responsible_person", { length: 100 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fatSignoffs = pgTable("fat_signoffs", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  stepOrder: integer("step_order").notNull(), // 1=Internal QA, 2=Engineering, 3=Customer Rep, 4=Final
  stepName: varchar("step_name", { length: 100 }).notNull(),
  signerRole: varchar("signer_role", { length: 50 }).notNull(),
  signerName: varchar("signer_name", { length: 100 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  comment: text("comment"),
  signatureUrl: text("signature_url"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SAT-specific: extra test items for site conditions
export const satSiteConditions = pgTable("sat_site_conditions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  conditionType: varchar("condition_type", { length: 50 }).notNull(), // ambient_temp, water_quality, power_supply, humidity, vibration
  conditionName: varchar("condition_name", { length: 255 }).notNull(),
  expectedValue: varchar("expected_value", { length: 100 }),
  actualValue: varchar("actual_value", { length: 100 }),
  unit: varchar("unit", { length: 20 }),
  isWithinSpec: boolean("is_within_spec"),
  notes: text("notes"),
  measuredBy: varchar("measured_by", { length: 100 }),
  measuredAt: timestamp("measured_at"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ========== Gamification System ==========

export const employeeXP = pgTable("employee_xp", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  points: integer("points").notNull(),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: integer("source_id"),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

export const employeeAchievements = pgTable("employee_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementCode: varchar("achievement_code", { length: 100 }).notNull(),
  achievementName: varchar("achievement_name", { length: 200 }).notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url", { length: 500 }),
  tier: varchar("tier", { length: 20 }).default("bronze"), // bronze, silver, gold, platinum
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const employeeLevels = pgTable("employee_levels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalXP: integer("total_xp").default(0),
  currentLevel: integer("current_level").default(1),
  currentTitle: varchar("current_title", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== Performance Traceability ==========

export const performanceTraces = pgTable("performance_traces", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  metricCode: varchar("metric_code", { length: 100 }).notNull(),
  metricName: varchar("metric_name", { length: 200 }),
  value: real("value").notNull(),
  unit: varchar("unit", { length: 50 }),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: integer("source_id"),
  sourceDescription: text("source_description"),
  period: varchar("period", { length: 20 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// ========== IoT Digital Twin ==========

export const iotEquipmentTwins = pgTable("iot_equipment_twins", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  equipmentCode: varchar("equipment_code", { length: 100 }),
  equipmentName: varchar("equipment_name", { length: 300 }),
  location: varchar("location", { length: 200 }),
  lastTelemetryAt: timestamp("last_telemetry_at"),
  status: varchar("status", { length: 50 }).default("offline"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const iotTelemetryData = pgTable("iot_telemetry_data", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  value: real("value").notNull(),
  unit: varchar("unit", { length: 20 }),
  isAlert: boolean("is_alert").default(false),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const iotMaintenancePredictions = pgTable("iot_maintenance_predictions", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  predictedIssue: varchar("predicted_issue", { length: 300 }),
  confidence: real("confidence"),
  recommendedAction: text("recommended_action"),
  predictedDate: timestamp("predicted_date"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== IoT Fleet & Predictive Sales ==========

/** Global machine registry — every GRT machine worldwide */
export const iotFleetMachines = pgTable("iot_fleet_machines", {
  id: serial("id").primaryKey(),
  machineId: varchar("machine_id", { length: 50 }).notNull(),
  plantName: varchar("plant_name", { length: 200 }),
  lineName: varchar("line_name", { length: 200 }),
  country: varchar("country", { length: 50 }),
  machineType: varchar("machine_type", { length: 100 }),
  status: varchar("status", { length: 30 }).default("offline"),
  lastHeartbeat: timestamp("last_heartbeat"),
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  installDate: timestamp("install_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** AI-generated predictive alerts with spare part links */
export const iotPredictiveAlerts = pgTable("iot_predictive_alerts", {
  id: serial("id").primaryKey(),
  machineId: varchar("machine_id", { length: 50 }).notNull(),
  alertType: varchar("alert_type", { length: 50 }),
  severity: varchar("severity", { length: 20 }),
  currentValue: real("current_value"),
  thresholdValue: real("threshold_value"),
  predictedFailureDays: integer("predicted_failure_days"),
  recommendedPartCode: varchar("recommended_part_code", { length: 50 }),
  recommendedPartName: varchar("recommended_part_name", { length: 200 }),
  estimatedPartPrice: real("estimated_part_price"),
  quoteGenerated: boolean("quote_generated").default(false),
  quoteGeneratedAt: timestamp("quote_generated_at"),
  status: varchar("status", { length: 30 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========================================
// AI Early Warning System Tables (Tasks #71-73)
// ========================================

/** Project health scores - Layer 1: Health Scanner */
export const projectHealthScores = pgTable("project_health_scores", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  healthScore: integer("health_score").notNull(),
  issueCount: integer("issue_count").default(0),
  criticalCount: integer("critical_count").default(0),
  warningCount: integer("warning_count").default(0),
  infoCount: integer("info_count").default(0),
  issuesJson: text("issues_json"),
  scannedAt: timestamp("scanned_at").defaultNow(),
});

/** Risk notifications - Layer 2: Risk Scorer */
export const riskNotifications = pgTable("risk_notifications", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  recipientRole: varchar("recipient_role", { length: 50 }).notNull(),
  recipientUserId: integer("recipient_user_id"),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

/** Historical case matches - Layer 3: LLM Narrative Engine */
export const historicalCaseMatches = pgTable("historical_case_matches", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  matchedProjectId: integer("matched_project_id").notNull(),
  similarityScore: real("similarity_score").notNull(),
  matchFactors: text("match_factors"),
  outcome: varchar("outcome", { length: 100 }),
  lessonsLearned: text("lessons_learned"),
  matchedAt: timestamp("matched_at").defaultNow(),
});



// ========== Architecture Improvement Tables (Tasks #63, #64, #65, #67, #77) ==========

// Task #63 - V1/V2 Project Unification View
export const unifiedProjects = pgTable("unified_projects", {
  id: serial("id").primaryKey(),
  sourceTable: varchar("source_table", { length: 20 }).notNull(), // 'v1' or 'v2'
  sourceId: integer("source_id").notNull(),
  projectCode: varchar("project_code", { length: 100 }),
  name: varchar("name", { length: 500 }),
  status: varchar("status", { length: 50 }),
  currentStage: varchar("current_stage", { length: 20 }),
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  projectManager: varchar("project_manager", { length: 100 }),
  startDate: timestamp("start_date"),
  targetEndDate: timestamp("target_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  syncedAt: timestamp("synced_at").defaultNow(),
});

// Task #64 - FK Constraint Registry
export const fkConstraintRegistry = pgTable("fk_constraint_registry", {
  id: serial("id").primaryKey(),
  sourceTable: varchar("source_table", { length: 100 }).notNull(),
  sourceColumn: varchar("source_column", { length: 100 }).notNull(),
  targetTable: varchar("target_table", { length: 100 }).notNull(),
  targetColumn: varchar("target_column", { length: 100 }).notNull(),
  constraintName: varchar("constraint_name", { length: 200 }),
  isEnforced: boolean("is_enforced").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task #65 - JSON Normalization: Project Stage Tasks
export const projectStageTasks = pgTable("project_stage_tasks", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull(),
  projectId: integer("project_id").notNull(),
  taskName: varchar("task_name", { length: 500 }).notNull(),
  assignee: varchar("assignee", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task #65 - JSON Normalization: Project Stage Audit Logs
export const projectStageAuditLogs = pgTable("project_stage_audit_logs", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull(),
  projectId: integer("project_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  actor: varchar("actor", { length: 100 }),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Task #67 - Unified Customer Master Table
export const customerMaster = pgTable("customer_master", {
  id: serial("id").primaryKey(),
  externalCode: varchar("external_code", { length: 50 }),
  name: varchar("name", { length: 300 }).notNull(),
  nameEn: varchar("name_en", { length: 300 }),
  tier: varchar("tier", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  region: varchar("region", { length: 100 }),
  country: varchar("country", { length: 100 }),
  address: text("address"),
  primaryContact: varchar("primary_contact", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  // Source tracking for migration
  sourceCrmV1Id: integer("source_crm_v1_id"),
  sourceCrmV2Id: integer("source_crm_v2_id"),
  sourceCustomersV2Id: integer("source_customers_v2_id"),
  sourceAfterSalesId: integer("source_after_sales_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task #77 - Gate Checklist Items Extended (M0-M12)
export const gateChecklistItemsExtended = pgTable("gate_checklist_items_extended", {
  id: serial("id").primaryKey(),
  stageCode: varchar("stage_code", { length: 10 }).notNull(), // M0-M12
  category: varchar("category", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 500 }).notNull(),
  description: text("description"),
  weight: integer("weight").default(5),
  isRequired: boolean("is_required").default(false),
  passCriteria: text("pass_criteria"),
  applicableEquipmentTypes: text("applicable_equipment_types"), // comma-separated
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Cost Standards - 成本标准管理
// ============================================

export const costStandardCategoryEnum = pgEnum('cost_standard_category', [
  'labor', 'overhead', 'material_markup',
]);

export const costStandardAllocationBaseEnum = pgEnum('cost_standard_allocation_base', [
  'direct_labor_hours', 'machine_hours', 'production_units', 'project_count', 'floor_area', 'revenue',
]);

export const costStandards = pgTable("cost_standards", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // labor | overhead | material_markup
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  // Labor-specific
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 4, scale: 2 }).default("1.50"),
  // Overhead-specific
  monthlyAmount: decimal("monthly_amount", { precision: 14, scale: 2 }),
  allocationBase: varchar("allocation_base", { length: 50 }),
  allocationRate: decimal("allocation_rate", { precision: 10, scale: 2 }),
  allocationUnit: varchar("allocation_unit", { length: 50 }),
  // Material markup-specific
  markupPercent: decimal("markup_percent", { precision: 6, scale: 2 }),
  minMarkup: decimal("min_markup", { precision: 10, scale: 2 }),
  applyTo: varchar("apply_to", { length: 50 }), // all | imported | domestic
  // Common
  description: text("description"),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Product Configurations - 产品配置(设备型号->BOM->基准价)
// ============================================

export const productConfigurations = pgTable("product_configurations", {
  id: serial("id").primaryKey(),
  modelCode: varchar("model_code", { length: 50 }).notNull(),
  productName: varchar("product_name", { length: 300 }).notNull(),
  productNameEn: varchar("product_name_en", { length: 300 }),
  bomCode: varchar("bom_code", { length: 50 }),
  bomId: integer("bom_id"),
  // Cost breakdown
  materialCost: decimal("material_cost", { precision: 14, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 14, scale: 2 }).default("0"),
  overheadCost: decimal("overhead_cost", { precision: 14, scale: 2 }).default("0"),
  otherCost: decimal("other_cost", { precision: 14, scale: 2 }).default("0"),
  basePrice: decimal("base_price", { precision: 14, scale: 2 }).default("0"),
  marginPercent: decimal("margin_percent", { precision: 6, scale: 2 }),
  // Metadata
  equipmentType: varchar("equipment_type", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// G-IME: Meeting Contributions - 参会者贡献分析
// ============================================

export const meetingContributions = pgTable("meeting_contributions", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  employeeId: varchar("employee_id", { length: 36 }).notNull(),
  employeeName: varchar("employee_name", { length: 200 }),
  speakingTime: integer("speaking_time"),
  interventionCount: integer("intervention_count"),
  decisionCount: integer("decision_count"),
  actionItemCount: integer("action_item_count"),
  questionCount: integer("question_count"),
  insightCount: integer("insight_count"),
  contributionScore: real("contribution_score"),
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME: Meeting Effectiveness Scores - 会议效能评分
// ============================================

export const meetingEffectivenessScores = pgTable("meeting_effectiveness_scores", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  objectiveAchievement: real("objective_achievement"),
  participationBalance: real("participation_balance"),
  decisionClarity: real("decision_clarity"),
  actionableOutcomes: real("actionable_outcomes"),
  overallScore: real("overall_score"),
  aiNarrative: text("ai_narrative"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 2: Department Rollups - 部门汇总分析
// ============================================

export const imeDepartmentRollups = pgTable("ime_department_rollups", {
  id: serial("id").primaryKey(),
  department: varchar("department", { length: 100 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  meetingCount: integer("meeting_count").default(0),
  avgEffectiveness: real("avg_effectiveness"),
  avgContributionScore: real("avg_contribution_score"),
  totalDecisions: integer("total_decisions").default(0),
  totalActionItems: integer("total_action_items").default(0),
  activeParticipants: integer("active_participants").default(0),
  participationBalance: real("participation_balance"),
  topContributors: text("top_contributors"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 2: Meeting Patterns - 会议模式检测
// ============================================

export const imeMeetingPatterns = pgTable("ime_meeting_patterns", {
  id: serial("id").primaryKey(),
  patternType: varchar("pattern_type", { length: 50 }).notNull(),
  scope: varchar("scope", { length: 50 }).notNull(),
  scopeId: varchar("scope_id", { length: 100 }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }),
  metrics: text("metrics"),
  meetingIds: text("meeting_ids"),
  recommendation: text("recommendation"),
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 2: HR Signals - HR智能信号
// ============================================

export const imeHrSignals = pgTable("ime_hr_signals", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 36 }).notNull(),
  employeeName: varchar("employee_name", { length: 200 }),
  signalType: varchar("signal_type", { length: 50 }).notNull(),
  confidence: real("confidence"),
  evidence: text("evidence"),
  suggestedAction: text("suggested_action"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// G-IME Phase 2: Live Sessions - 实时会议会话
// ============================================

export const imeLiveSessions = pgTable("ime_live_sessions", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  sessionStatus: varchar("session_status", { length: 20 }).default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  startedBy: varchar("started_by", { length: 36 }).notNull(),
  liveSuggestions: text("live_suggestions"),
  liveContributionSnapshot: text("live_contribution_snapshot"),
  totalSegmentsProcessed: integer("total_segments_processed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 3: Meeting Cost Analysis - 会议成本分析
// ============================================

export const imeMeetingCosts = pgTable("ime_meeting_costs", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  durationMinutes: real("duration_minutes"),
  participantCount: integer("participant_count"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  costPerDecision: decimal("cost_per_decision", { precision: 12, scale: 2 }),
  costPerActionItem: decimal("cost_per_action_item", { precision: 12, scale: 2 }),
  roiScore: real("roi_score"),
  participantBreakdown: text("participant_breakdown"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 3: Action Item Tracker - 行动项追踪
// ============================================

export const imeActionItems = pgTable("ime_action_items", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  owner: varchar("owner", { length: 200 }),
  originMeetingId: varchar("origin_meeting_id", { length: 36 }).notNull(),
  originBlockId: integer("origin_block_id"),
  status: varchar("status", { length: 20 }).default("open"),
  meetingAppearances: text("meeting_appearances"),
  appearanceCount: integer("appearance_count").default(1),
  firstSeenDate: timestamp("first_seen_date").defaultNow(),
  lastSeenDate: timestamp("last_seen_date").defaultNow(),
  resolvedDate: timestamp("resolved_date"),
  aiMatchConfidence: real("ai_match_confidence"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// G-IME Phase 3: Topic Continuity - 跨会议议题追踪
// ============================================

export const imeTopicContinuity = pgTable("ime_topic_continuity", {
  id: serial("id").primaryKey(),
  topicName: varchar("topic_name", { length: 300 }).notNull(),
  topicDescription: text("topic_description"),
  status: varchar("status", { length: 20 }).default("introduced"),
  meetingAppearances: text("meeting_appearances"),
  appearanceCount: integer("appearance_count").default(1),
  firstSeenMeetingId: varchar("first_seen_meeting_id", { length: 36 }),
  firstSeenDate: timestamp("first_seen_date").defaultNow(),
  lastSeenDate: timestamp("last_seen_date").defaultNow(),
  resolvedMeetingId: varchar("resolved_meeting_id", { length: 36 }),
  resolvedDate: timestamp("resolved_date"),
  aiMatchConfidence: real("ai_match_confidence"),
  relatedTopicIds: text("related_topic_ids"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// G-IME Phase 4: Meeting Sentiment Analysis
// ============================================

export const imeMeetingSentiment = pgTable("ime_meeting_sentiment", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  overallSentiment: varchar("overall_sentiment", { length: 20 }),
  sentimentScore: real("sentiment_score"),
  tensionLevel: real("tension_level"),
  collaborationTone: real("collaboration_tone"),
  frustrationIndicators: integer("frustration_indicators").default(0),
  consensusReached: boolean("consensus_reached"),
  speakerSentiments: text("speaker_sentiments"),
  emotionalArc: text("emotional_arc"),
  conflictTopics: text("conflict_topics"),
  aiNarrative: text("ai_narrative"),
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 4: Meeting Health Score
// ============================================

export const imeMeetingHealth = pgTable("ime_meeting_health", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 50 }).notNull(),
  scopeId: varchar("scope_id", { length: 100 }),
  period: varchar("period", { length: 20 }),
  healthScore: real("health_score"),
  dimensions: text("dimensions"),
  grade: varchar("grade", { length: 2 }),
  recommendations: text("recommendations"),
  benchmarkComparison: text("benchmark_comparison"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// G-IME Phase 4: Digest & Alerts
// ============================================

export const imeDigestAlerts = pgTable("ime_digest_alerts", {
  id: serial("id").primaryKey(),
  digestType: varchar("digest_type", { length: 30 }).notNull(),
  scope: varchar("scope", { length: 50 }),
  scopeId: varchar("scope_id", { length: 100 }),
  period: varchar("period", { length: 30 }),
  summary: text("summary"),
  highlights: text("highlights"),
  alerts: text("alerts"),
  metrics: text("metrics"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// G-IME Phase 5: Meeting ROI, Attendee Optimization & Predictive Analytics
// ============================================================================

export const imeMeetingRoi = pgTable("ime_meeting_roi", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  decisionCount: integer("decision_count"),
  actionItemCount: integer("action_item_count"),
  completedActionCount: integer("completed_action_count"),
  costPerDecision: decimal("cost_per_decision", { precision: 12, scale: 2 }),
  costPerActionItem: decimal("cost_per_action_item", { precision: 12, scale: 2 }),
  outcomeScore: real("outcome_score"),
  roiGrade: varchar("roi_grade", { length: 2 }),
  outcomes: text("outcomes"),
  departmentId: varchar("department_id", { length: 100 }),
  aiNarrative: text("ai_narrative"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeAttendeeOptimization = pgTable("ime_attendee_optimization", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  scope: varchar("scope", { length: 50 }),
  meetingTitle: varchar("meeting_title", { length: 300 }),
  meetingTopic: text("meeting_topic"),
  currentParticipants: text("current_participants"),
  recommendedParticipants: text("recommended_participants"),
  overInvitedParticipants: text("over_invited_participants"),
  optimalSize: integer("optimal_size"),
  currentSize: integer("current_size"),
  estimatedCostSaving: decimal("estimated_cost_saving", { precision: 12, scale: 2 }),
  compositionAdvice: text("composition_advice"),
  aiNarrative: text("ai_narrative"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeMeetingPredictions = pgTable("ime_meeting_predictions", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  scope: varchar("scope", { length: 50 }),
  scopeId: varchar("scope_id", { length: 100 }),
  predictionType: varchar("prediction_type", { length: 50 }),
  predictedScore: real("predicted_score"),
  confidenceLevel: real("confidence_level"),
  riskLevel: varchar("risk_level", { length: 20 }),
  riskFactors: text("risk_factors"),
  features: text("features"),
  fatigueIndex: real("fatigue_index"),
  trendForecast: text("trend_forecast"),
  recommendations: text("recommendations"),
  aiNarrative: text("ai_narrative"),
  actualScore: real("actual_score"),
  predictionAccuracy: real("prediction_accuracy"),
  predictedAt: timestamp("predicted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeReportExports = pgTable("ime_report_exports", {
  id: serial("id").primaryKey(),
  reportType: varchar("report_type", { length: 30 }).notNull(), // meeting | dashboard | benchmark
  scope: varchar("scope", { length: 50 }),
  scopeId: varchar("scope_id", { length: 100 }),
  filters: text("filters"), // JSON string
  format: varchar("format", { length: 10 }).notNull(), // pdf | xlsx
  filename: varchar("filename", { length: 300 }),
  fileSize: integer("file_size"),
  generatedBy: varchar("generated_by", { length: 100 }),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 7: Meeting Intelligence & Organizational Learning

export const imeKnowledgeEntities = pgTable("ime_knowledge_entities", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // decision | risk | opportunity | dependency | insight
  entityValue: text("entity_value").notNull(),
  confidence: real("confidence"),
  relatedSpeaker: varchar("related_speaker", { length: 100 }),
  context: text("context"),
  aiNarrative: text("ai_narrative"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeEntityRelationships = pgTable("ime_entity_relationships", {
  id: serial("id").primaryKey(),
  entityFromId: integer("entity_from_id").notNull(),
  entityToId: integer("entity_to_id").notNull(),
  relationshipType: varchar("relationship_type", { length: 50 }).notNull(), // depends_on | follows_up | contradicts | supports | evolves_from
  strength: real("strength"),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeDecisionOutcomes = pgTable("ime_decision_outcomes", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(), // FK to ime_knowledge_entities (decision type)
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  decisionText: text("decision_text").notNull(),
  decisionDate: timestamp("decision_date"),
  outcomeStatus: varchar("outcome_status", { length: 30 }), // pending | implemented | reversed | modified | abandoned
  outcomeNotes: text("outcome_notes"),
  impactScore: real("impact_score"),
  lessonsLearned: text("lessons_learned"),
  trackedBy: varchar("tracked_by", { length: 100 }),
  outcomeDate: timestamp("outcome_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeMeetingRetrospectives = pgTable("ime_meeting_retrospectives", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  aiSummary: text("ai_summary"),
  keyLearnings: text("key_learnings"), // JSON array
  improvementAreas: text("improvement_areas"), // JSON array
  whatWentWell: text("what_went_well"), // JSON array
  actionableInsights: text("actionable_insights"), // JSON array
  overallGrade: varchar("overall_grade", { length: 5 }),
  aiNarrative: text("ai_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeExpertProfiles = pgTable("ime_expert_profiles", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  employeeName: varchar("employee_name", { length: 100 }),
  department: varchar("department", { length: 100 }),
  expertiseAreas: text("expertise_areas"), // JSON array
  credibilityScore: real("credibility_score"),
  meetingCount: integer("meeting_count"),
  avgContributionScore: real("avg_contribution_score"),
  decisionInfluenceRate: real("decision_influence_rate"),
  topTopics: text("top_topics"), // JSON array
  aiNarrative: text("ai_narrative"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeMeetingTemplates = pgTable("ime_meeting_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // standup | review | brainstorm | planning | retrospective | decision
  agendaTemplate: text("agenda_template"), // JSON structure
  successCriteria: text("success_criteria"), // JSON array
  recommendedDuration: integer("recommended_duration"), // minutes
  recommendedParticipants: text("recommended_participants"), // JSON
  sourceMeetingId: varchar("source_meeting_id", { length: 36 }),
  createdBy: varchar("created_by", { length: 100 }),
  usageCount: integer("usage_count").default(0),
  avgRating: real("avg_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 8: Meeting AI Assistant

export const imeMeetingBriefs = pgTable("ime_meeting_briefs", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  participantSummary: text("participant_summary"), // JSON — key participants + their history
  pendingActionItems: text("pending_action_items"), // JSON — unresolved items from prior meetings
  relevantDecisions: text("relevant_decisions"), // JSON — recent decisions related to this meeting
  topicHistory: text("topic_history"), // JSON — topics discussed in prior meetings
  suggestedQuestions: text("suggested_questions"), // JSON array
  riskAlerts: text("risk_alerts"), // JSON array
  aiNarrative: text("ai_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeMeetingMinutes = pgTable("ime_meeting_minutes", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  attendees: text("attendees"), // JSON array
  agendaItems: text("agenda_items"), // JSON array of {topic, discussion, outcome}
  decisionsRecorded: text("decisions_recorded"), // JSON array
  actionItemsSummary: text("action_items_summary"), // JSON array of {item, owner, due}
  keyDiscussionPoints: text("key_discussion_points"), // JSON array
  nextSteps: text("next_steps"), // JSON array
  followUpDate: timestamp("follow_up_date"),
  aiNarrative: text("ai_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeAiConversations = pgTable("ime_ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 50 }).notNull(),
  userId: varchar("user_id", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull(), // user | assistant
  content: text("content").notNull(),
  context: text("context"), // JSON — meeting IDs or scope used
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 9: Meeting Workflow Automation & Coaching

export const imeWorkflowRules = pgTable("ime_workflow_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(), // meeting_ended | health_below | action_overdue | roi_low | sentiment_negative
  conditionField: varchar("condition_field", { length: 100 }), // e.g. "overall_score", "roi_grade"
  conditionOperator: varchar("condition_operator", { length: 10 }), // <, >, <=, >=, ==, !=
  conditionValue: varchar("condition_value", { length: 100 }), // threshold value
  actionType: varchar("action_type", { length: 50 }).notNull(), // notify | generate_report | create_action_item | escalate | coaching
  actionConfig: text("action_config"), // JSON — action-specific params (recipients, template, etc.)
  scope: varchar("scope", { length: 50 }).default("global"), // global | department | channel
  scopeId: varchar("scope_id", { length: 100 }),
  isActive: integer("is_active").default(1),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imeWorkflowExecutions = pgTable("ime_workflow_executions", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull(),
  ruleName: varchar("rule_name", { length: 200 }),
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(),
  triggerMeetingId: varchar("trigger_meeting_id", { length: 36 }),
  conditionSnapshot: text("condition_snapshot"), // JSON — values at trigger time
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionResult: text("action_result"), // JSON — what was done
  status: varchar("status", { length: 20 }).default("success"), // success | failed | skipped
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const imeCoachingPlans = pgTable("ime_coaching_plans", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 50 }).notNull(), // individual | department | organization
  scopeId: varchar("scope_id", { length: 100 }),
  period: varchar("period", { length: 20 }), // monthly | quarterly
  cultureScore: real("culture_score"), // 0-100
  dimensions: text("dimensions"), // JSON — {punctuality, engagement, followThrough, inclusivity, efficiency}
  strengths: text("strengths"), // JSON array
  improvements: text("improvements"), // JSON array of {area, recommendation, priority, expectedImpact}
  actionPlan: text("action_plan"), // JSON array of {step, owner, timeline, metric}
  benchmarkComparison: text("benchmark_comparison"), // JSON — vs industry/company averages
  aiNarrative: text("ai_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 10: Meeting Integration Hub & System Settings

export const imeIntegrations = pgTable("ime_integrations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  integrationType: varchar("integration_type", { length: 50 }).notNull(), // calendar | task_manager | messaging | webhook | email
  provider: varchar("provider", { length: 50 }).notNull(), // outlook | google | slack | teams | jira | feishu | dingtalk | custom
  config: text("config"), // JSON — provider-specific settings (endpoint, token, channel, etc.)
  syncDirection: varchar("sync_direction", { length: 20 }).default("bidirectional"), // inbound | outbound | bidirectional
  syncFrequency: varchar("sync_frequency", { length: 20 }).default("manual"), // manual | hourly | daily | realtime
  status: varchar("status", { length: 20 }).default("active"), // active | paused | error | disconnected
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 20 }),
  errorMessage: text("error_message"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imeIntegrationLogs = pgTable("ime_integration_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull(),
  integrationName: varchar("integration_name", { length: 200 }),
  operation: varchar("operation", { length: 50 }).notNull(), // sync | push_action_items | push_calendar | push_notification | webhook_trigger
  direction: varchar("direction", { length: 20 }), // inbound | outbound
  recordsProcessed: integer("records_processed").default(0),
  recordsSucceeded: integer("records_succeeded").default(0),
  recordsFailed: integer("records_failed").default(0),
  details: text("details"), // JSON — operation-specific details
  status: varchar("status", { length: 20 }).default("success"), // success | partial | failed
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const imeSystemSettings = pgTable("ime_system_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 100 }).notNull(),
  settingValue: text("setting_value"),
  settingType: varchar("setting_type", { length: 20 }).default("string"), // string | number | boolean | json
  category: varchar("category", { length: 50 }).default("general"), // general | analysis | notification | threshold | display
  label: varchar("label", { length: 200 }),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 11: Meeting Gamification & Engagement

export const imeAchievements = pgTable("ime_achievements", {
  id: serial("id").primaryKey(),
  achievementKey: varchar("achievement_key", { length: 100 }).notNull(), // e.g. "first_meeting", "action_hero_10", "streak_5"
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // lucide icon name
  category: varchar("category", { length: 50 }).default("general"), // general | contribution | efficiency | collaboration | streak
  tier: varchar("tier", { length: 20 }).default("bronze"), // bronze | silver | gold | platinum
  criteria: text("criteria"), // JSON — {metric, operator, value} for auto-evaluation
  points: integer("points").default(10),
  isGlobal: integer("is_global").default(1), // 1 = definition row, 0 = user award
  userId: varchar("user_id", { length: 100 }), // NULL for definitions, set for awards
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeLeaderboards = pgTable("ime_leaderboards", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 20 }).notNull(), // weekly | monthly | quarterly
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  metric: varchar("metric", { length: 50 }).notNull(), // contribution_score | effectiveness | action_completion | meetings_led | culture_score
  userId: varchar("user_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 200 }),
  department: varchar("department", { length: 100 }),
  rank: integer("rank").notNull(),
  score: real("score").notNull(),
  trend: varchar("trend", { length: 10 }), // up | down | stable
  previousRank: integer("previous_rank"),
  snapshotAt: timestamp("snapshot_at").defaultNow(),
});

export const imeTeamChallenges = pgTable("ime_team_challenges", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  challengeType: varchar("challenge_type", { length: 50 }).notNull(), // reduce_duration | improve_effectiveness | action_completion | reduce_cost | boost_engagement
  targetMetric: varchar("target_metric", { length: 50 }).notNull(),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").default(0),
  baselineValue: real("baseline_value"), // starting value when challenge began
  scope: varchar("scope", { length: 50 }).default("organization"), // organization | department | team
  scopeId: varchar("scope_id", { length: 100 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("active"), // active | completed | failed | cancelled
  rewardDescription: text("reward_description"),
  participants: text("participants"), // JSON array of user IDs
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 12: Meeting Feedback & Continuous Improvement

export const imeMeetingFeedback = pgTable("ime_meeting_feedback", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  overallRating: integer("overall_rating").notNull(), // 1-5
  contentRelevance: integer("content_relevance"), // 1-5
  timeEfficiency: integer("time_efficiency"), // 1-5
  facilitation: integer("facilitation"), // 1-5
  actionClarity: integer("action_clarity"), // 1-5
  wouldRecommend: integer("would_recommend"), // 1 = yes, 0 = no (NPS-style)
  highlights: text("highlights"), // what went well
  improvements: text("improvements"), // what could be better
  suggestions: text("suggestions"), // specific suggestions
  anonymous: integer("anonymous").default(0),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const imeFeedbackAnalytics = pgTable("ime_feedback_analytics", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 50 }).notNull(), // meeting | department | organization
  scopeId: varchar("scope_id", { length: 100 }),
  period: varchar("period", { length: 20 }), // weekly | monthly | quarterly
  totalResponses: integer("total_responses").default(0),
  avgOverallRating: real("avg_overall_rating"),
  avgContentRelevance: real("avg_content_relevance"),
  avgTimeEfficiency: real("avg_time_efficiency"),
  avgFacilitation: real("avg_facilitation"),
  avgActionClarity: real("avg_action_clarity"),
  npsScore: real("nps_score"), // -100 to +100
  topHighlights: text("top_highlights"), // JSON array — most common positives
  topImprovements: text("top_improvements"), // JSON array — most common issues
  trendDirection: varchar("trend_direction", { length: 10 }), // up | down | stable
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});

export const imeImprovementInitiatives = pgTable("ime_improvement_initiatives", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // time_management | facilitation | content | engagement | follow_up
  priority: varchar("priority", { length: 10 }).default("P2"), // P0 | P1 | P2 | P3
  source: varchar("source", { length: 50 }).default("feedback"), // feedback | ai_analysis | manual
  scope: varchar("scope", { length: 50 }).default("organization"),
  scopeId: varchar("scope_id", { length: 100 }),
  targetMetric: varchar("target_metric", { length: 50 }),
  baselineValue: real("baseline_value"),
  targetValue: real("target_value"),
  currentValue: real("current_value"),
  status: varchar("status", { length: 20 }).default("proposed"), // proposed | approved | in_progress | completed | dismissed
  owner: varchar("owner", { length: 100 }),
  dueDate: timestamp("due_date"),
  aiNarrative: text("ai_narrative"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 13: Meeting Compliance & Governance

export const imeCompliancePolicies = pgTable("ime_compliance_policies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  policyType: varchar("policy_type", { length: 50 }).notNull(), // max_duration | min_participants | require_agenda | require_action_items | max_frequency | require_follow_up | min_effectiveness
  checkField: varchar("check_field", { length: 100 }), // field to check against
  operator: varchar("operator", { length: 10 }), // <, >, <=, >=, ==, !=, exists
  threshold: varchar("threshold", { length: 100 }), // threshold value
  severity: varchar("severity", { length: 20 }).default("warning"), // info | warning | violation | critical
  scope: varchar("scope", { length: 50 }).default("global"), // global | department | channel
  scopeId: varchar("scope_id", { length: 100 }),
  isActive: integer("is_active").default(1),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imeComplianceAudits = pgTable("ime_compliance_audits", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }).notNull(),
  meetingTitle: varchar("meeting_title", { length: 500 }),
  policyId: integer("policy_id").notNull(),
  policyName: varchar("policy_name", { length: 200 }),
  policyType: varchar("policy_type", { length: 50 }),
  result: varchar("result", { length: 20 }).notNull(), // pass | fail | warning | na
  severity: varchar("severity", { length: 20 }),
  actualValue: varchar("actual_value", { length: 200 }),
  expectedValue: varchar("expected_value", { length: 200 }),
  details: text("details"),
  auditedAt: timestamp("audited_at").defaultNow(),
});

export const imeGovernanceReports = pgTable("ime_governance_reports", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 20 }).notNull(), // weekly | monthly | quarterly
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  totalMeetingsAudited: integer("total_meetings_audited").default(0),
  complianceRate: real("compliance_rate"), // 0-100%
  totalViolations: integer("total_violations").default(0),
  totalWarnings: integer("total_warnings").default(0),
  topViolations: text("top_violations"), // JSON array of {policyName, count, severity}
  riskAreas: text("risk_areas"), // JSON array
  recommendations: text("recommendations"), // JSON array
  aiNarrative: text("ai_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// ============================================================================
// Phase 14: HR & Performance Linkage
// ============================================================================

export const imeLinkageRules = pgTable("ime_linkage_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  conditionType: varchar("condition_type", { length: 50 }).notNull(), // engagement_score | contribution_score | behavior_tag | action_item_accepted | decision_count | signal_type | question_count | insight_count
  conditionField: varchar("condition_field", { length: 100 }),
  conditionOperator: varchar("condition_operator", { length: 20 }).notNull(), // >= | <= | > | < | == | != | contains
  conditionThreshold: varchar("condition_threshold", { length: 100 }).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // update_kpi | flag_training | add_achievement | adjust_score | create_key_result | coaching_suggestion
  actionTarget: varchar("action_target", { length: 200 }),
  actionValue: varchar("action_value", { length: 200 }),
  actionDescription: text("action_description"),
  scope: varchar("scope", { length: 20 }).default("individual"), // individual | team | department
  scopeId: varchar("scope_id", { length: 100 }),
  impactDimension: varchar("impact_dimension", { length: 100 }),
  priority: integer("priority").default(0),
  isActive: integer("is_active").default(1),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imeHrActions = pgTable("ime_hr_actions", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  employeeName: varchar("employee_name", { length: 200 }),
  department: varchar("department", { length: 200 }),
  ruleId: integer("rule_id"), // FK → ime_linkage_rules
  ruleName: varchar("rule_name", { length: 200 }),
  meetingId: varchar("meeting_id", { length: 36 }),
  meetingTitle: varchar("meeting_title", { length: 500 }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionDescription: text("action_description"),
  reason: text("reason"),
  impactDimension: varchar("impact_dimension", { length: 100 }),
  impactValue: varchar("impact_value", { length: 50 }),
  sourceData: text("source_data"), // JSON: engagement scores, tags that triggered
  status: varchar("status", { length: 20 }).default("pending"), // pending | approved | rejected | executed
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  executedAt: timestamp("executed_at"),
  executionResult: text("execution_result"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ImeLinkageRule = typeof imeLinkageRules.$inferSelect;
export type InsertImeLinkageRule = typeof imeLinkageRules.$inferInsert;
export type ImeHrAction = typeof imeHrActions.$inferSelect;
export type InsertImeHrAction = typeof imeHrActions.$inferInsert;

// ============================================================================
// Phase 15: Meeting Intelligence API — API Key Management & Usage Logging
// ============================================================================

export const imeApiKeys = pgTable("ime_api_keys", {
  id: serial("id").primaryKey(),
  keyName: varchar("key_name", { length: 200 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull(), // SHA-256 hex
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(), // first 12 chars for display
  scopes: text("scopes").notNull(), // JSON array: read_analytics | read_contributions | read_signals | write_webhooks
  rateLimit: integer("rate_limit").default(1000),
  rateLimitWindow: varchar("rate_limit_window", { length: 20 }).default("hourly"), // hourly | daily
  requestCount: integer("request_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  errorCount: integer("error_count").default(0),
  isActive: integer("is_active").default(1),
  description: text("description"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const imeApiUsageLogs = pgTable("ime_api_usage_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id"),
  keyName: varchar("key_name", { length: 200 }), // denormalized
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET | POST
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  errorMessage: text("error_message"),
  requestedAt: timestamp("requested_at").defaultNow(),
});

export type ImeApiKey = typeof imeApiKeys.$inferSelect;
export type InsertImeApiKey = typeof imeApiKeys.$inferInsert;
export type ImeApiUsageLog = typeof imeApiUsageLogs.$inferSelect;
export type InsertImeApiUsageLog = typeof imeApiUsageLogs.$inferInsert;

// ============================================================================
// Phase 16: Collaboration Network Intelligence
// ============================================================================

export const imeCollaborationEdges = pgTable("ime_collaboration_edges", {
  id: serial("id").primaryKey(),
  participantA: varchar("participant_a", { length: 200 }).notNull(),
  participantB: varchar("participant_b", { length: 200 }).notNull(),
  employeeIdA: varchar("employee_id_a", { length: 100 }),
  employeeIdB: varchar("employee_id_b", { length: 100 }),
  departmentA: varchar("department_a", { length: 200 }),
  departmentB: varchar("department_b", { length: 200 }),
  meetingCount: integer("meeting_count").default(0),
  totalCoMeetingMinutes: integer("total_co_meeting_minutes").default(0),
  avgMeetingSize: integer("avg_meeting_size").default(0),
  collaborationScore: integer("collaboration_score").default(0),
  relationshipType: varchar("relationship_type", { length: 20 }).default("same_dept"), // same_dept | cross_dept
  sharedMeetingIds: text("shared_meeting_ids"), // JSON array
  firstCollaboration: timestamp("first_collaboration"),
  lastCollaboration: timestamp("last_collaboration"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeMeetingNecessityScores = pgTable("ime_meeting_necessity_scores", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 100 }).notNull(),
  necessityScore: integer("necessity_score").default(0), // 0-100
  necessityGrade: varchar("necessity_grade", { length: 2 }).default("C"), // A/B/C/D/F
  decisionComplexity: integer("decision_complexity").default(0), // 0-10
  collaborationRequirement: integer("collaboration_requirement").default(0), // 0-10
  informationRichness: integer("information_richness").default(0), // 0-10
  outcomeImpact: integer("outcome_impact").default(0), // 0-10
  participantAlignment: integer("participant_alignment").default(0), // 0-10
  timeEfficiency: integer("time_efficiency").default(0), // 0-10
  alternativeViability: varchar("alternative_viability", { length: 20 }).default("none"), // email|slack|doc|none
  alternativeRationale: text("alternative_rationale"),
  aiNarrative: text("ai_narrative"),
  recommendations: text("recommendations"), // JSON array
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeCollaborationEdge = typeof imeCollaborationEdges.$inferSelect;
export type InsertImeCollaborationEdge = typeof imeCollaborationEdges.$inferInsert;
export type ImeMeetingNecessityScore = typeof imeMeetingNecessityScores.$inferSelect;
export type InsertImeMeetingNecessityScore = typeof imeMeetingNecessityScores.$inferInsert;

// ============================================================================
// Phase 17: Meeting Load & Participant Well-being Intelligence
// ============================================================================

export const imeParticipantWorkload = pgTable("ime_participant_workload", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  employeeName: varchar("employee_name", { length: 200 }).notNull(),
  department: varchar("department", { length: 200 }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily | weekly | monthly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  meetingCount: integer("meeting_count").default(0),
  totalMeetingMinutes: integer("total_meeting_minutes").default(0),
  avgMeetingDuration: integer("avg_meeting_duration").default(0),
  maxMeetingDuration: integer("max_meeting_duration").default(0),
  backToBackCount: integer("back_to_back_count").default(0),
  backToBackRatio: integer("back_to_back_ratio").default(0), // 0-100
  focusTimeMinutes: integer("focus_time_minutes").default(0),
  meetingDensity: integer("meeting_density").default(0), // 0-100
  longestFocusBlock: integer("longest_focus_block").default(0), // minutes
  meetingsBeforeNoon: integer("meetings_before_noon").default(0),
  meetingsAfterNoon: integer("meetings_after_noon").default(0),
  uniqueCollaborators: integer("unique_collaborators").default(0),
  loadScore: integer("load_score").default(0), // 0-100
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // low | medium | high | critical
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeWellbeingAssessments = pgTable("ime_wellbeing_assessments", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  employeeName: varchar("employee_name", { length: 200 }).notNull(),
  department: varchar("department", { length: 200 }),
  wellbeingScore: integer("wellbeing_score").default(0), // 0-100
  wellbeingGrade: varchar("wellbeing_grade", { length: 2 }).default("C"), // A/B/C/D/F
  meetingLoadDimension: integer("meeting_load_dimension").default(0), // 0-10
  scheduleBalanceDimension: integer("schedule_balance_dimension").default(0), // 0-10
  collaborationDiversityDimension: integer("collaboration_diversity_dimension").default(0), // 0-10
  focusTimeDimension: integer("focus_time_dimension").default(0), // 0-10
  meetingEfficiencyDimension: integer("meeting_efficiency_dimension").default(0), // 0-10
  workloadTrendDimension: integer("workload_trend_dimension").default(0), // 0-10
  riskFactors: text("risk_factors"), // JSON array
  recommendations: text("recommendations"), // JSON array
  aiNarrative: text("ai_narrative"),
  assessedPeriodStart: timestamp("assessed_period_start"),
  assessedPeriodEnd: timestamp("assessed_period_end"),
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeParticipantWorkload = typeof imeParticipantWorkload.$inferSelect;
export type InsertImeParticipantWorkload = typeof imeParticipantWorkload.$inferInsert;
export type ImeWellbeingAssessment = typeof imeWellbeingAssessments.$inferSelect;
export type InsertImeWellbeingAssessment = typeof imeWellbeingAssessments.$inferInsert;

// ============================================================================
// Phase 18: Recurring Meeting Value Assessment & Optimization
// ============================================================================

export const imeRecurringSeries = pgTable("ime_recurring_series", {
  id: serial("id").primaryKey(),
  seriesKey: varchar("series_key", { length: 200 }),
  seriesTitle: varchar("series_title", { length: 300 }),
  channelId: varchar("channel_id", { length: 100 }),
  frequency: varchar("frequency", { length: 20 }), // daily|weekly|biweekly|monthly|irregular
  detectedInterval: integer("detected_interval"),
  firstOccurrence: timestamp("first_occurrence"),
  lastOccurrence: timestamp("last_occurrence"),
  occurrenceCount: integer("occurrence_count").default(0),
  avgParticipantCount: integer("avg_participant_count").default(0),
  coreParticipants: text("core_participants"), // JSON array of employee IDs present in >50% of meetings
  avgEffectivenessScore: integer("avg_effectiveness_score").default(0), // 0-100
  effectivenessTrend: varchar("effectiveness_trend", { length: 20 }), // improving|stable|declining|volatile
  trendSlope: integer("trend_slope").default(0), // -100 to +100
  avgRoiGrade: varchar("avg_roi_grade", { length: 2 }),
  totalCumulativeCost: integer("total_cumulative_cost").default(0),
  totalCumulativeMinutes: integer("total_cumulative_minutes").default(0),
  valueScore: integer("value_score").default(0), // 0-100
  valueGrade: varchar("value_grade", { length: 2 }), // A/B/C/D/F
  recommendation: varchar("recommendation", { length: 30 }), // continue|shorten|reduce_frequency|merge|cancel
  recommendationRationale: text("recommendation_rationale"),
  aiNarrative: text("ai_narrative"),
  meetingIds: text("meeting_ids"), // JSON array of all meeting IDs in series
  status: varchar("status", { length: 20 }).default("active"), // active|optimized|cancelled
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeSeriesOptimizationOutcomes = pgTable("ime_series_optimization_outcomes", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id"),
  seriesTitle: varchar("series_title", { length: 300 }),
  actionTaken: varchar("action_taken", { length: 30 }), // cancelled|reduced_frequency|shortened|merged|no_change
  actionDate: timestamp("action_date"),
  preActionValueScore: integer("pre_action_value_score").default(0),
  preActionEffectiveness: integer("pre_action_effectiveness").default(0),
  preActionWeeklyMinutes: integer("pre_action_weekly_minutes").default(0),
  postActionWeeklyMinutes: integer("post_action_weekly_minutes").default(0),
  minutesSavedPerWeek: integer("minutes_saved_per_week").default(0),
  costSavedPerWeek: integer("cost_saved_per_week").default(0),
  teamSatisfactionDelta: integer("team_satisfaction_delta").default(0), // -100 to +100
  productivityImpact: varchar("productivity_impact", { length: 20 }), // positive|neutral|negative
  aiAssessment: text("ai_assessment"),
  assessedAt: timestamp("assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeRecurringSeries = typeof imeRecurringSeries.$inferSelect;
export type InsertImeRecurringSeries = typeof imeRecurringSeries.$inferInsert;
export type ImeSeriesOptimizationOutcome = typeof imeSeriesOptimizationOutcomes.$inferSelect;
export type InsertImeSeriesOptimizationOutcome = typeof imeSeriesOptimizationOutcomes.$inferInsert;

// ============================================================================
// Phase 19: Decision Effectiveness & Outcome Intelligence
// ============================================================================

export const imeDecisionTracking = pgTable("ime_decision_tracking", {
  id: serial("id").primaryKey(),
  decisionId: integer("decision_id"), // optional FK to ime_decision_outcomes.id
  meetingId: varchar("meeting_id", { length: 36 }),
  decisionText: text("decision_text"),
  decisionMaker: varchar("decision_maker", { length: 200 }),
  stakeholders: text("stakeholders"), // JSON array
  department: varchar("department", { length: 200 }),
  decisionDate: timestamp("decision_date"),
  followThroughStatus: varchar("follow_through_status", { length: 20 }).default("pending"), // pending|in_progress|implemented|abandoned|reversed
  implementationStartDate: timestamp("implementation_start_date"),
  implementationEndDate: timestamp("implementation_end_date"),
  decisionToStartDays: integer("decision_to_start_days"),
  startToCompletionDays: integer("start_to_completion_days"),
  totalVelocityDays: integer("total_velocity_days"),
  velocityGrade: varchar("velocity_grade", { length: 2 }), // A/B/C/D/F
  isReversed: integer("is_reversed").default(0), // 0 or 1
  reversalMeetingId: varchar("reversal_meeting_id", { length: 36 }),
  reversalDate: timestamp("reversal_date"),
  reversalReason: text("reversal_reason"),
  impactScore: integer("impact_score"), // -100 to +100
  impactCategory: varchar("impact_category", { length: 20 }).default("neutral"), // positive|neutral|negative
  businessOutcome: text("business_outcome"),
  aiQualityScore: integer("ai_quality_score"), // 0-100
  aiClarityScore: integer("ai_clarity_score"), // 0-100
  aiAlignmentScore: integer("ai_alignment_score"), // 0-100
  aiNarrative: text("ai_narrative"),
  aiRecommendations: text("ai_recommendations"), // JSON array
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeDecisionIntelligenceSnapshots = pgTable("ime_decision_intelligence_snapshots", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 20 }), // org|department|team|individual
  scopeId: varchar("scope_id", { length: 200 }),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  totalDecisions: integer("total_decisions"),
  implementedCount: integer("implemented_count"),
  abandonedCount: integer("abandoned_count"),
  reversedCount: integer("reversed_count"),
  pendingCount: integer("pending_count"),
  followThroughRate: integer("follow_through_rate"), // 0-100
  reversalRate: integer("reversal_rate"), // 0-100
  avgVelocityDays: integer("avg_velocity_days"),
  medianVelocityDays: integer("median_velocity_days"),
  fastestVelocityDays: integer("fastest_velocity_days"),
  slowestVelocityDays: integer("slowest_velocity_days"),
  velocityGrade: varchar("velocity_grade", { length: 2 }),
  avgImpactScore: integer("avg_impact_score"), // -100 to +100
  positiveImpactCount: integer("positive_impact_count"),
  negativeImpactCount: integer("negative_impact_count"),
  avgQualityScore: integer("avg_quality_score"), // 0-100
  avgClarityScore: integer("avg_clarity_score"), // 0-100
  avgAlignmentScore: integer("avg_alignment_score"), // 0-100
  overallDecisionGrade: varchar("overall_decision_grade", { length: 2 }),
  topBottlenecks: text("top_bottlenecks"), // JSON array
  topReversalReasons: text("top_reversal_reasons"), // JSON array
  aiNarrative: text("ai_narrative"),
  trendVsPrevious: varchar("trend_vs_previous", { length: 20 }), // improving|stable|declining
  trendSlope: integer("trend_slope"), // -100 to +100
  recommendations: text("recommendations"), // JSON array
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeDecisionTracking = typeof imeDecisionTracking.$inferSelect;
export type InsertImeDecisionTracking = typeof imeDecisionTracking.$inferInsert;
export type ImeDecisionIntelligenceSnapshot = typeof imeDecisionIntelligenceSnapshots.$inferSelect;
export type InsertImeDecisionIntelligenceSnapshot = typeof imeDecisionIntelligenceSnapshots.$inferInsert;

// ============================================================================
// Phase 20: Meeting Agenda & Time Allocation Intelligence
// ============================================================================

export const imeMeetingStructureAnalysis = pgTable("ime_meeting_structure_analysis", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }),
  scheduleId: integer("schedule_id"),
  agendaItemIndex: integer("agenda_item_index"),
  agendaItemTitle: varchar("agenda_item_title", { length: 500 }),
  agendaItemCategory: varchar("agenda_item_category", { length: 50 }).default("other"), // discussion|decision|update|brainstorm|review|other
  plannedDurationMinutes: integer("planned_duration_minutes"),
  actualDurationMinutes: integer("actual_duration_minutes"),
  overrunMinutes: integer("overrun_minutes"),
  overrunPercent: integer("overrun_percent"),
  speakerCount: integer("speaker_count"),
  dominantSpeaker: varchar("dominant_speaker", { length: 200 }),
  dominantSpeakerPercent: integer("dominant_speaker_percent"),
  contentBlockCount: integer("content_block_count"),
  decisionsCount: integer("decisions_count"),
  actionItemsCount: integer("action_items_count"),
  engagementScore: integer("engagement_score"),
  productivityScore: integer("productivity_score"),
  timeEfficiencyGrade: varchar("time_efficiency_grade", { length: 2 }),
  aiSummary: text("ai_summary"),
  aiRecommendation: text("ai_recommendation"),
  wasSkipped: integer("was_skipped").default(0),
  totalMeetingDurationMinutes: integer("total_meeting_duration_minutes"),
  totalPlannedDurationMinutes: integer("total_planned_duration_minutes"),
  totalActualDurationMinutes: integer("total_actual_duration_minutes"),
  unplannedTimeMinutes: integer("unplanned_time_minutes"),
  meetingTimeEfficiencyScore: integer("meeting_time_efficiency_score"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeAgendaIntelligenceSnapshots = pgTable("ime_agenda_intelligence_snapshots", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 20 }), // org|department|team|individual
  scopeId: varchar("scope_id", { length: 200 }),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  totalMeetingsAnalyzed: integer("total_meetings_analyzed"),
  totalAgendaItems: integer("total_agenda_items"),
  avgAgendaItemsPerMeeting: integer("avg_agenda_items_per_meeting"),
  avgPlannedDuration: integer("avg_planned_duration"),
  avgActualDuration: integer("avg_actual_duration"),
  avgOverrunMinutes: integer("avg_overrun_minutes"),
  avgOverrunPercent: integer("avg_overrun_percent"),
  overrunRate: integer("overrun_rate"),
  underrunRate: integer("underrun_rate"),
  skippedRate: integer("skipped_rate"),
  avgEngagementScore: integer("avg_engagement_score"),
  avgProductivityScore: integer("avg_productivity_score"),
  avgTimeEfficiencyScore: integer("avg_time_efficiency_score"),
  overallGrade: varchar("overall_grade", { length: 2 }),
  topOverrunCategories: text("top_overrun_categories"), // JSON array
  topOverrunTopics: text("top_overrun_topics"), // JSON array
  optimalOrderRecommendation: text("optimal_order_recommendation"), // JSON array
  aiNarrative: text("ai_narrative"),
  trendVsPrevious: varchar("trend_vs_previous", { length: 20 }),
  trendSlope: integer("trend_slope"),
  recommendations: text("recommendations"), // JSON array
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeMeetingStructureAnalysis = typeof imeMeetingStructureAnalysis.$inferSelect;
export type InsertImeMeetingStructureAnalysis = typeof imeMeetingStructureAnalysis.$inferInsert;
export type ImeAgendaIntelligenceSnapshot = typeof imeAgendaIntelligenceSnapshots.$inferSelect;
export type InsertImeAgendaIntelligenceSnapshot = typeof imeAgendaIntelligenceSnapshots.$inferInsert;

// ============================================================================
// Phase 21: Facilitator Effectiveness Intelligence
// ============================================================================

export const imeFacilitatorAnalysis = pgTable("ime_facilitator_analysis", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 36 }),
  facilitatorName: varchar("facilitator_name", { length: 200 }),
  facilitatorId: varchar("facilitator_id", { length: 200 }),
  department: varchar("department", { length: 200 }),
  facilitationStyle: varchar("facilitation_style", { length: 30 }).default("unknown"),
  styleConfidence: integer("style_confidence"),
  overallEffectivenessScore: integer("overall_effectiveness_score"),
  engagementImpactScore: integer("engagement_impact_score"),
  decisionFacilitationScore: integer("decision_facilitation_score"),
  timeManagementScore: integer("time_management_score"),
  inclusivityScore: integer("inclusivity_score"),
  clarityScore: integer("clarity_score"),
  conflictResolutionScore: integer("conflict_resolution_score"),
  meetingEffectivenessScore: integer("meeting_effectiveness_score"),
  speakerBalanceIndex: integer("speaker_balance_index"),
  dominantSpeakerPercent: integer("dominant_speaker_percent"),
  totalSpeakers: integer("total_speakers"),
  facilitatorSpeakingPercent: integer("facilitator_speaking_percent"),
  decisionsCount: integer("decisions_count"),
  actionItemsCount: integer("action_items_count"),
  effectivenessGrade: varchar("effectiveness_grade", { length: 2 }),
  aiStrengths: text("ai_strengths"),
  aiWeaknesses: text("ai_weaknesses"),
  aiCoachingPoints: text("ai_coaching_points"),
  aiNarrative: text("ai_narrative"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imeFacilitatorIntelligenceSnapshots = pgTable("ime_facilitator_intelligence_snapshots", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 20 }),
  scopeId: varchar("scope_id", { length: 200 }),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  totalMeetingsAnalyzed: integer("total_meetings_analyzed"),
  totalFacilitators: integer("total_facilitators"),
  avgEffectivenessScore: integer("avg_effectiveness_score"),
  avgEngagementImpact: integer("avg_engagement_impact"),
  avgDecisionFacilitation: integer("avg_decision_facilitation"),
  avgTimeManagement: integer("avg_time_management"),
  avgInclusivity: integer("avg_inclusivity"),
  avgClarity: integer("avg_clarity"),
  avgConflictResolution: integer("avg_conflict_resolution"),
  avgSpeakerBalance: integer("avg_speaker_balance"),
  avgFacilitatorSpeakingPercent: integer("avg_facilitator_speaking_percent"),
  styleDistribution: text("style_distribution"),
  topFacilitators: text("top_facilitators"),
  bottomFacilitators: text("bottom_facilitators"),
  gradeDistribution: text("grade_distribution"),
  overallGrade: varchar("overall_grade", { length: 2 }),
  aiNarrative: text("ai_narrative"),
  bestPractices: text("best_practices"),
  trendVsPrevious: varchar("trend_vs_previous", { length: 20 }),
  trendSlope: integer("trend_slope"),
  recommendations: text("recommendations"),
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ImeFacilitatorAnalysis = typeof imeFacilitatorAnalysis.$inferSelect;
export type InsertImeFacilitatorAnalysis = typeof imeFacilitatorAnalysis.$inferInsert;
export type ImeFacilitatorIntelligenceSnapshot = typeof imeFacilitatorIntelligenceSnapshots.$inferSelect;
export type InsertImeFacilitatorIntelligenceSnapshot = typeof imeFacilitatorIntelligenceSnapshots.$inferInsert;


// ============ IATF 16949 Core Tool: FMEA (Failure Mode & Effects Analysis) ============

export const fmeaTypeEnum = pgEnum('fmeaTypeEnum', ['DFMEA', 'PFMEA']);
export const fmeaStatusEnum = pgEnum('fmeaStatusEnum', ['draft', 'in_review', 'approved', 'active', 'archived']);
export const fmeaActionStatusEnum = pgEnum('fmeaActionStatusEnum', ['open', 'in_progress', 'completed', 'verified', 'cancelled']);
export const severityLevelEnum = pgEnum('severityLevelEnum', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

// FMEA主表 — 一个FMEA文档对应一个产品/过程
export const fmeaDocuments = pgTable("fmea_documents", {
  id: serial('id').primaryKey(),
  fmeaCode: varchar("fmea_code", { length: 50 }).notNull(),
  projectId: integer("project_id"),
  fmeaType: fmeaTypeEnum("fmea_type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  scope: text("scope"),
  productName: varchar("product_name", { length: 200 }),
  processName: varchar("process_name", { length: 200 }),
  modelYear: varchar("model_year", { length: 20 }),
  teamMembers: text("team_members"), // JSON array of names
  status: fmeaStatusEnum("status").default('draft').notNull(),
  revision: integer("revision").default(1),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("fmea_documents_code_idx").on(table.fmeaCode),
  index("fmea_documents_project_idx").on(table.projectId),
  index("fmea_documents_type_idx").on(table.fmeaType),
]);

// FMEA失效模式行项 — 每行一个失效模式
export const fmeaItems = pgTable("fmea_items", {
  id: serial('id').primaryKey(),
  fmeaDocumentId: integer("fmea_document_id").notNull(),
  itemNumber: integer("item_number").notNull(),
  // 结构分析
  systemElement: varchar("system_element", { length: 200 }), // 系统/子系统/零件
  functionRequirement: text("function_requirement"), // 功能/要求
  // 失效分析
  failureMode: varchar("failure_mode", { length: 500 }).notNull(), // 潜在失效模式
  failureEffect: text("failure_effect"), // 潜在失效后果
  failureCause: text("failure_cause"), // 潜在失效原因/机制
  // 风险评估 (RPN = S × O × D)
  severity: integer("severity").default(1).notNull(), // 严重度 1-10
  occurrence: integer("occurrence").default(1).notNull(), // 频度 1-10
  detection: integer("detection").default(1).notNull(), // 探测度 1-10
  rpn: integer("rpn").default(1).notNull(), // 风险优先数
  // AP (Action Priority) per AIAG-VDA FMEA (replaces RPN in newer standard)
  actionPriority: varchar("action_priority", { length: 2 }), // H/M/L
  // 现行控制 - 预防
  currentPreventionControl: text("current_prevention_control"),
  // 现行控制 - 探测
  currentDetectionControl: text("current_detection_control"),
  // 改进后评估
  revisedSeverity: integer("revised_severity"),
  revisedOccurrence: integer("revised_occurrence"),
  revisedDetection: integer("revised_detection"),
  revisedRpn: integer("revised_rpn"),
  revisedActionPriority: varchar("revised_action_priority", { length: 2 }),
  // 特殊特性
  specialCharacteristic: varchar("special_characteristic", { length: 10 }), // CC/SC/空
  // 备注
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("fmea_items_document_idx").on(table.fmeaDocumentId),
  index("fmea_items_rpn_idx").on(table.rpn),
]);

// FMEA改进措施
export const fmeaActions = pgTable("fmea_actions", {
  id: serial('id').primaryKey(),
  fmeaItemId: integer("fmea_item_id").notNull(),
  actionDescription: text("action_description").notNull(),
  responsiblePerson: varchar("responsible_person", { length: 100 }),
  responsibleId: integer("responsible_id"),
  targetDate: timestamp("target_date", { mode: 'string' }),
  completionDate: timestamp("completion_date", { mode: 'string' }),
  status: fmeaActionStatusEnum("status").default('open').notNull(),
  verificationResult: text("verification_result"),
  evidence: text("evidence"), // 附件/证据链接
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("fmea_actions_item_idx").on(table.fmeaItemId),
  index("fmea_actions_status_idx").on(table.status),
]);


// ============ IATF 16949 Core Tool: Control Plan (控制计划) ============

export const controlPlanStatusEnum = pgEnum('controlPlanStatusEnum', ['draft', 'active', 'superseded', 'archived']);
export const controlPlanPhaseEnum = pgEnum('controlPlanPhaseEnum', ['prototype', 'pre_launch', 'production']);
export const controlMethodEnum = pgEnum('controlMethodEnum', ['visual', 'gauge', 'spc', 'cmm', 'test', 'audit', 'other']);

// 控制计划主表
export const controlPlans = pgTable("control_plans", {
  id: serial('id').primaryKey(),
  planCode: varchar("plan_code", { length: 50 }).notNull(),
  projectId: integer("project_id"),
  fmeaDocumentId: integer("fmea_document_id"), // 关联FMEA
  title: varchar("title", { length: 200 }).notNull(),
  partName: varchar("part_name", { length: 200 }),
  partNumber: varchar("part_number", { length: 100 }),
  phase: controlPlanPhaseEnum("phase").default('prototype').notNull(),
  revision: integer("revision").default(1),
  status: controlPlanStatusEnum("status").default('draft').notNull(),
  customerApprovalDate: timestamp("customer_approval_date", { mode: 'string' }),
  supplierApprovalDate: timestamp("supplier_approval_date", { mode: 'string' }),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("control_plans_code_idx").on(table.planCode),
  index("control_plans_project_idx").on(table.projectId),
  index("control_plans_fmea_idx").on(table.fmeaDocumentId),
]);

// 控制计划行项 — 每行一个工序/特性
export const controlPlanItems = pgTable("control_plan_items", {
  id: serial('id').primaryKey(),
  controlPlanId: integer("control_plan_id").notNull(),
  itemNumber: integer("item_number").notNull(),
  processStep: varchar("process_step", { length: 200 }), // 工序名称
  processNumber: varchar("process_number", { length: 50 }), // 工序编号
  machineTool: varchar("machine_tool", { length: 200 }), // 设备/工装
  // 特性
  characteristicName: varchar("characteristic_name", { length: 200 }).notNull(),
  characteristicNumber: varchar("characteristic_number", { length: 50 }),
  characteristicType: varchar("characteristic_type", { length: 20 }), // product/process
  specialCharacteristic: varchar("special_characteristic", { length: 10 }), // CC/SC
  // 规格/公差
  specification: text("specification"),
  tolerance: varchar("tolerance", { length: 200 }),
  // 控制方法
  controlMethod: controlMethodEnum("control_method").default('visual').notNull(),
  controlDescription: text("control_description"),
  sampleSize: varchar("sample_size", { length: 50 }),
  sampleFrequency: varchar("sample_frequency", { length: 100 }),
  // 反应计划
  reactionPlan: text("reaction_plan"),
  // 关联FMEA项
  fmeaItemId: integer("fmea_item_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("control_plan_items_plan_idx").on(table.controlPlanId),
]);


// ============ IATF 16949 Core Tool: PPAP (Production Part Approval Process) ============

export const ppapStatusEnum = pgEnum('ppapStatusEnum', ['draft', 'submitted', 'approved', 'rejected', 'interim_approved']);
export const ppapLevelEnum = pgEnum('ppapLevelEnum', ['1', '2', '3', '4', '5']);
export const ppapElementStatusEnum = pgEnum('ppapElementStatusEnum', ['not_started', 'in_progress', 'completed', 'not_applicable', 'rejected']);

// PPAP提交主表
export const ppapSubmissions = pgTable("ppap_submissions", {
  id: serial('id').primaryKey(),
  submissionCode: varchar("submission_code", { length: 50 }).notNull(),
  projectId: integer("project_id"),
  partName: varchar("part_name", { length: 200 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }).notNull(),
  revision: varchar("revision", { length: 20 }).default('A'),
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  submissionLevel: ppapLevelEnum("submission_level").default('3').notNull(),
  submissionReason: varchar("submission_reason", { length: 200 }), // Initial/Engineering Change/Tooling Change/etc
  status: ppapStatusEnum("status").default('draft').notNull(),
  submittedAt: timestamp("submitted_at", { mode: 'string' }),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  approvedBy: integer("approved_by"),
  customerDecision: text("customer_decision"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("ppap_submissions_code_idx").on(table.submissionCode),
  index("ppap_submissions_project_idx").on(table.projectId),
]);

// PPAP 18元素检查表
export const ppapElements = pgTable("ppap_elements", {
  id: serial('id').primaryKey(),
  submissionId: integer("submission_id").notNull(),
  elementNumber: integer("element_number").notNull(), // 1-18
  elementName: varchar("element_name", { length: 200 }).notNull(),
  required: smallint("required").default(1).notNull(), // 基于submission level
  status: ppapElementStatusEnum("status").default('not_started').notNull(),
  documentPath: text("document_path"), // 文件路径/链接
  reviewNotes: text("review_notes"),
  completedBy: integer("completed_by"),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("ppap_elements_submission_idx").on(table.submissionId),
]);


// ============ IATF 16949 Core Tool: MSA (Measurement System Analysis) ============

export const msaStudyTypeEnum = pgEnum('msaStudyTypeEnum', ['gage_rr', 'bias', 'linearity', 'stability', 'attribute_agreement']);
export const msaStudyStatusEnum = pgEnum('msaStudyStatusEnum', ['planned', 'in_progress', 'completed', 'failed', 'archived']);

// MSA研究主表
export const msaStudies = pgTable("msa_studies", {
  id: serial('id').primaryKey(),
  studyCode: varchar("study_code", { length: 50 }).notNull(),
  projectId: integer("project_id"),
  controlPlanItemId: integer("control_plan_item_id"), // 关联控制计划
  studyType: msaStudyTypeEnum("study_type").notNull(),
  gaugeName: varchar("gauge_name", { length: 200 }).notNull(),
  gaugeId: varchar("gauge_id", { length: 100 }),
  gaugeResolution: varchar("gauge_resolution", { length: 50 }),
  partName: varchar("part_name", { length: 200 }),
  characteristicName: varchar("characteristic_name", { length: 200 }),
  specification: text("specification"),
  tolerance: varchar("tolerance", { length: 100 }),
  // GR&R结果
  numOperators: integer("num_operators").default(3),
  numParts: integer("num_parts").default(10),
  numTrials: integer("num_trials").default(3),
  repeatability: decimal("repeatability", { precision: 8, scale: 4 }),
  reproducibility: decimal("reproducibility", { precision: 8, scale: 4 }),
  grrPercent: decimal("grr_percent", { precision: 8, scale: 4 }), // %GR&R (<10%=acceptable, 10-30%=marginal, >30%=unacceptable)
  ndc: integer("ndc"), // Number of Distinct Categories (≥5 is acceptable)
  // 判定
  status: msaStudyStatusEnum("status").default('planned').notNull(),
  conclusion: varchar("conclusion", { length: 50 }), // acceptable/marginal/unacceptable
  conductedBy: integer("conducted_by"),
  conductedAt: timestamp("conducted_at", { mode: 'string' }),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("msa_studies_code_idx").on(table.studyCode),
  index("msa_studies_project_idx").on(table.projectId),
]);

// MSA测量原始数据
export const msaMeasurements = pgTable("msa_measurements", {
  id: serial('id').primaryKey(),
  studyId: integer("study_id").notNull(),
  operatorId: integer("operator_id"),
  operatorName: varchar("operator_name", { length: 100 }),
  partNumber: integer("part_number").notNull(),
  trialNumber: integer("trial_number").notNull(),
  measuredValue: decimal("measured_value", { precision: 12, scale: 6 }).notNull(),
  referenceValue: decimal("reference_value", { precision: 12, scale: 6 }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("msa_measurements_study_idx").on(table.studyId),
]);


// ============ IATF 16949 Core Tool: 8D Problem Solving + CAPA ============

export const eightDStatusEnum = pgEnum('eightDStatusEnum', ['open', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'closed', 'verified']);
export const capaTypeEnum = pgEnum('capaTypeEnum', ['corrective', 'preventive']);
export const capaStatusEnum = pgEnum('capaStatusEnum', ['open', 'investigation', 'action_planned', 'implemented', 'verified', 'closed']);

// 8D报告主表
export const eightDReports = pgTable("eight_d_reports", {
  id: serial('id').primaryKey(),
  reportCode: varchar("report_code", { length: 50 }).notNull(),
  projectId: integer("project_id"),
  title: varchar("title", { length: 300 }).notNull(),
  problemDescription: text("problem_description"),
  severity: varchar("severity", { length: 20 }).default('medium'), // critical/high/medium/low
  source: varchar("source", { length: 100 }), // customer_complaint/internal_audit/supplier/field_return
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  partNumber: varchar("part_number", { length: 100 }),
  defectQuantity: integer("defect_quantity"),
  // D1: Team
  teamLeaderId: integer("team_leader_id"),
  teamMembers: text("team_members"), // JSON
  // D2: Problem Description (detailed)
  d2Description: text("d2_description"),
  d2IsWhat: text("d2_is_what"),
  d2IsNotWhat: text("d2_is_not_what"),
  // D3: Interim Containment Actions
  d3ContainmentActions: text("d3_containment_actions"), // JSON array
  d3ImplementedAt: timestamp("d3_implemented_at", { mode: 'string' }),
  // D4: Root Cause Analysis
  d4RootCauses: text("d4_root_causes"), // JSON array
  d4AnalysisMethod: varchar("d4_analysis_method", { length: 50 }), // 5why/fishbone/fault_tree
  d4VerificationData: text("d4_verification_data"),
  // D5: Permanent Corrective Actions
  d5CorrectiveActions: text("d5_corrective_actions"), // JSON array
  // D6: Implementation & Verification
  d6ImplementationDate: timestamp("d6_implementation_date", { mode: 'string' }),
  d6VerificationResult: text("d6_verification_result"),
  d6EffectivenessData: text("d6_effectiveness_data"),
  // D7: Prevent Recurrence
  d7PreventionActions: text("d7_prevention_actions"), // JSON array
  d7SystemChanges: text("d7_system_changes"),
  // D8: Congratulate Team
  d8LessonsLearned: text("d8_lessons_learned"),
  d8TeamRecognition: text("d8_team_recognition"),
  d8ClosureDate: timestamp("d8_closure_date", { mode: 'string' }),
  // Status
  currentStep: eightDStatusEnum("current_step").default('open').notNull(),
  dueDate: timestamp("due_date", { mode: 'string' }),
  closedAt: timestamp("closed_at", { mode: 'string' }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("eight_d_reports_code_idx").on(table.reportCode),
  index("eight_d_reports_project_idx").on(table.projectId),
  index("eight_d_reports_step_idx").on(table.currentStep),
]);

// CAPA记录表
export const capaRecords = pgTable("capa_records", {
  id: serial('id').primaryKey(),
  capaCode: varchar("capa_code", { length: 50 }).notNull(),
  eightDReportId: integer("eight_d_report_id"), // 可从8D发起
  projectId: integer("project_id"),
  capaType: capaTypeEnum("capa_type").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  rootCause: text("root_cause"),
  actionPlan: text("action_plan"), // JSON array of actions
  responsibleId: integer("responsible_id"),
  responsibleName: varchar("responsible_name", { length: 100 }),
  targetDate: timestamp("target_date", { mode: 'string' }),
  completionDate: timestamp("completion_date", { mode: 'string' }),
  verificationMethod: text("verification_method"),
  verificationResult: text("verification_result"),
  effectivenessCheck: text("effectiveness_check"),
  status: capaStatusEnum("status").default('open').notNull(),
  closedBy: integer("closed_by"),
  closedAt: timestamp("closed_at", { mode: 'string' }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("capa_records_code_idx").on(table.capaCode),
  index("capa_records_8d_idx").on(table.eightDReportId),
  index("capa_records_project_idx").on(table.projectId),
]);


// ============ Safety Rule Engine (工业安全规则) ============

export const safetyRuleSeverityEnum = pgEnum('safetyRuleSeverityEnum', ['fatal', 'critical', 'warning', 'info']);
export const safetyRuleCategoryEnum = pgEnum('safetyRuleCategoryEnum', ['physical', 'chemical', 'electrical', 'operational']);

export const safetyRules = pgTable("safety_rules", {
  id: serial('id').primaryKey(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: safetyRuleCategoryEnum("category").notNull(),
  description: text("description"),
  materialType: varchar("material_type", { length: 100 }), // aluminum/stainless_steel/plastic/etc
  equipmentModel: varchar("equipment_model", { length: 100 }), // GRT-SC-*/GRT-HP-* (支持通配符)
  parameterName: varchar("parameter_name", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  minValue: decimal("min_value", { precision: 12, scale: 4 }),
  maxValue: decimal("max_value", { precision: 12, scale: 4 }),
  forbiddenValues: text("forbidden_values"), // JSON array
  severity: safetyRuleSeverityEnum("severity").default('warning').notNull(),
  isActive: smallint("is_active").default(1).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("safety_rules_code_idx").on(table.ruleCode),
  index("safety_rules_material_idx").on(table.materialType),
  index("safety_rules_equipment_idx").on(table.equipmentModel),
]);

// ─── Smart Cockpit: Time Tracking Sessions ───
export const taskTimeSessions = pgTable("task_time_sessions", {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  projectId: integer('project_id').notNull(),
  userId: integer('user_id').notNull(),
  phaseCode: varchar('phase_code', { length: 10 }),
  startedAt: timestamp('started_at', { mode: 'string' }).notNull(),
  endedAt: timestamp('ended_at', { mode: 'string' }),
  durationMin: integer('duration_min'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("task_time_sessions_task_idx").on(table.taskId),
  index("task_time_sessions_user_idx").on(table.userId),
  index("task_time_sessions_active_idx").on(table.isActive),
  index("task_time_sessions_project_idx").on(table.projectId),
]);

// ─── Smart Cockpit: Task Prerequisites (stage-gate rules) ───
export const taskPrerequisites = pgTable("task_prerequisites", {
  id: serial('id').primaryKey(),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  phaseCode: varchar('phase_code', { length: 10 }).notNull(),
  description: text('description').notNull(),
  checkType: varchar('check_type', { length: 30 }).notNull(),
  requiredGateStage: varchar('required_gate_stage', { length: 10 }),
  requiredCheckItem: varchar('required_check_item', { length: 200 }),
  requiredTaskType: varchar('required_task_type', { length: 50 }),
  requiredTaskStatus: varchar('required_task_status', { length: 30 }).default('done'),
  requiredTableName: varchar('required_table_name', { length: 100 }),
  requiredColumnName: varchar('required_column_name', { length: 100 }),
  errorMessage: varchar('error_message', { length: 300 }).notNull(),
  severity: varchar('severity', { length: 20 }).default('hard'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("task_prerequisites_type_idx").on(table.taskType),
  index("task_prerequisites_phase_idx").on(table.phaseCode),
]);

// ── Testing & Template Engine enums ──
export const testTemplateDomainEnum = pgEnum('test_template_domain', [
  'software_uat', 'plc_test', 'fat_checklist', 'sat_checklist', 'custom'
]);
export const testTemplateStatusEnum = pgEnum('test_template_status', [
  'draft', 'active', 'archived'
]);
export const testCasePhaseEnum = pgEnum('test_case_phase', [
  'setup', 'execution', 'verification', 'teardown'
]);
export const testCaseCategoryEnum = pgEnum('test_case_category', [
  'functional', 'performance', 'safety', 'integration', 'regression', 'acceptance'
]);
export const testCasePriorityEnum = pgEnum('test_case_priority', [
  'critical', 'high', 'medium', 'low'
]);
export const testExecutionStatusEnum = pgEnum('test_execution_status', [
  'planned', 'in_progress', 'paused', 'completed', 'aborted'
]);
export const testExecutionEnvEnum = pgEnum('test_execution_env', [
  'dev', 'staging', 'prod', 'field', 'lab'
]);
export const testResultStatusEnum = pgEnum('test_result_status', [
  'not_started', 'pass', 'fail', 'blocked', 'skipped', 'partial'
]);
export const testResultSeverityEnum = pgEnum('test_result_severity', [
  'critical', 'major', 'minor', 'cosmetic'
]);
export const aiGenSourceEnum = pgEnum('ai_gen_source', [
  'template_generation', 'test_suggestion', 'case_optimization', 'risk_analysis'
]);

// ── Testing & Template Engine: test_templates ──
export const testTemplates = pgTable('test_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  domain: testTemplateDomainEnum('domain').notNull(),
  status: testTemplateStatusEnum('status').default('draft').notNull(),
  version: integer('version').default(1).notNull(),
  parentTemplateId: integer('parent_template_id'),
  description: text('description'),
  scope: text('scope'),
  applicablePhases: json('applicable_phases').$type<string[]>(),
  requiredRoles: json('required_roles').$type<string[]>(),
  tags: json('tags').$type<string[]>(),
  estimatedTotalHours: decimal('estimated_total_hours', { precision: 8, scale: 2 }),
  passingScorePercent: integer('passing_score_percent').default(80),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('test_templates_domain_idx').on(table.domain),
  index('test_templates_status_idx').on(table.status),
]);

// ── Testing & Template Engine: test_cases ──
export const testCases = pgTable('test_cases', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => testTemplates.id).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  code: varchar('code', { length: 50 }),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  phase: testCasePhaseEnum('phase').default('execution').notNull(),
  category: testCaseCategoryEnum('category').default('functional').notNull(),
  priority: testCasePriorityEnum('priority').default('medium').notNull(),
  preconditions: text('preconditions'),
  steps: json('steps').$type<{ step: number; action: string; expected: string }[]>(),
  expectedResult: text('expected_result'),
  requiredRole: varchar('required_role', { length: 50 }),
  skillLevel: varchar('skill_level', { length: 30 }),
  estimatedHours: decimal('estimated_hours', { precision: 6, scale: 2 }),
  automatable: boolean('automatable').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('test_cases_template_idx').on(table.templateId),
  index('test_cases_phase_idx').on(table.phase),
  index('test_cases_priority_idx').on(table.priority),
]);

// ── Testing & Template Engine: test_executions ──
export const testExecutions = pgTable('test_executions', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => testTemplates.id).notNull(),
  projectId: integer('project_id'),
  executionName: varchar('execution_name', { length: 200 }).notNull(),
  status: testExecutionStatusEnum('status').default('planned').notNull(),
  environment: testExecutionEnvEnum('environment').notNull(),
  plannedStartDate: timestamp('planned_start_date', { mode: 'string' }),
  plannedEndDate: timestamp('planned_end_date', { mode: 'string' }),
  actualStartDate: timestamp('actual_start_date', { mode: 'string' }),
  actualEndDate: timestamp('actual_end_date', { mode: 'string' }),
  leadUserId: integer('lead_user_id'),
  teamUserIds: json('team_user_ids').$type<number[]>(),
  totalCases: integer('total_cases').default(0),
  passedCases: integer('passed_cases').default(0),
  failedCases: integer('failed_cases').default(0),
  blockedCases: integer('blocked_cases').default(0),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  notes: text('notes'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('test_executions_template_idx').on(table.templateId),
  index('test_executions_project_idx').on(table.projectId),
  index('test_executions_status_idx').on(table.status),
  index('test_executions_env_idx').on(table.environment),
]);

// ── Testing & Template Engine: test_results ──
export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  executionId: integer('execution_id').references(() => testExecutions.id).notNull(),
  testCaseId: integer('test_case_id').references(() => testCases.id).notNull(),
  status: testResultStatusEnum('status').default('not_started').notNull(),
  executedBy: integer('executed_by'),
  executedAt: timestamp('executed_at', { mode: 'string' }),
  actualHours: decimal('actual_hours', { precision: 6, scale: 2 }),
  bugSeverity: testResultSeverityEnum('bug_severity'),
  bugDescription: text('bug_description'),
  bugTicketUrl: varchar('bug_ticket_url', { length: 500 }),
  evidenceUrls: json('evidence_urls').$type<string[]>(),
  notes: text('notes'),
  retestOf: integer('retest_of'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('test_results_execution_idx').on(table.executionId),
  index('test_results_case_idx').on(table.testCaseId),
  index('test_results_status_idx').on(table.status),
]);

// ── Testing & Template Engine: ai_generation_logs ──
export const aiGenerationLogs = pgTable('ai_generation_logs', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => testTemplates.id),
  source: aiGenSourceEnum('source').notNull(),
  promptInputConditions: json('prompt_input_conditions').$type<Record<string, unknown>>().notNull(),
  modelUsed: varchar('model_used', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  responseTokens: integer('response_tokens'),
  promptTokens: integer('prompt_tokens'),
  totalTokens: integer('total_tokens'),
  generatedContent: json('generated_content').$type<Record<string, unknown>>(),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }),
  userAccepted: boolean('user_accepted'),
  userModifications: text('user_modifications'),
  generatedBy: integer('generated_by'),
  generatedAt: timestamp('generated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ai_gen_logs_template_idx').on(table.templateId),
  index('ai_gen_logs_source_idx').on(table.source),
  index('ai_gen_logs_model_idx').on(table.modelUsed),
  index('ai_gen_logs_generated_at_idx').on(table.generatedAt),
]);

// ── Testing & Template Engine: Type Exports ──
export type TestTemplate = InferSelectModel<typeof testTemplates>;
export type InsertTestTemplate = InferInsertModel<typeof testTemplates>;
export type TestCase = InferSelectModel<typeof testCases>;
export type InsertTestCase = InferInsertModel<typeof testCases>;
export type TestExecution = InferSelectModel<typeof testExecutions>;
export type InsertTestExecution = InferInsertModel<typeof testExecutions>;
export type TestResult = InferSelectModel<typeof testResults>;
export type InsertTestResult = InferInsertModel<typeof testResults>;
export type AiGenerationLog = InferSelectModel<typeof aiGenerationLogs>;
export type InsertAiGenerationLog = InferInsertModel<typeof aiGenerationLogs>;

// ── BU Sales Target Planning (事业部年度目标分解) ──
export const buSalesPlans = pgTable('bu_sales_plans', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  departmentId: varchar('department_id', { length: 50 }).notNull(),
  totalSalesTarget: decimal('total_sales_target', { precision: 12, scale: 2 }),
  totalOutputTarget: decimal('total_output_target', { precision: 12, scale: 2 }),
  growthRules: json('growth_rules').$type<Record<string, number>>(),
  status: varchar('status', { length: 20 }).default('draft'),
  submittedBy: varchar('submitted_by', { length: 50 }),
  submittedAt: timestamp('submitted_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => [
  index('bu_sales_plans_year_idx').on(table.year),
  index('bu_sales_plans_dept_idx').on(table.departmentId),
]);

export const buSalesPlanDetails = pgTable('bu_sales_plan_details', {
  id: serial('id').primaryKey(),
  buSalesPlanId: integer('bu_sales_plan_id').references(() => buSalesPlans.id).notNull(),
  periodType: varchar('period_type', { length: 20 }),
  periodValue: integer('period_value'),
  salesTarget: decimal('sales_target', { precision: 12, scale: 2 }),
  outputTarget: decimal('output_target', { precision: 12, scale: 2 }),
  kpiTarget: decimal('kpi_target', { precision: 5, scale: 2 }),
  capabilityLevel: decimal('capability_level', { precision: 4, scale: 2 }),
  isAdjusted: boolean('is_adjusted').default(false),
}, (table) => [
  index('bu_sales_plan_details_plan_idx').on(table.buSalesPlanId),
]);

export const buSalesPlanAdjustments = pgTable('bu_sales_plan_adjustments', {
  id: serial('id').primaryKey(),
  buSalesPlanId: integer('bu_sales_plan_id').references(() => buSalesPlans.id).notNull(),
  applicantId: varchar('applicant_id', { length: 50 }),
  adjustmentReason: varchar('adjustment_reason', { length: 500 }),
  adjustmentType: varchar('adjustment_type', { length: 30 }).default('normal'),
  exceptionTag: varchar('exception_tag', { length: 50 }),
  originalData: json('original_data').$type<Record<string, unknown>>(),
  proposedData: json('proposed_data').$type<Record<string, unknown>>(),
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'),
  approvedBy: varchar('approved_by', { length: 50 }),
  reviewStep: varchar('review_step', { length: 20 }).default('finance_pmo'),
  financePmoStatus: varchar('finance_pmo_status', { length: 20 }),
  financePmoReviewedBy: varchar('finance_pmo_reviewed_by', { length: 50 }),
  financePmoReviewedAt: timestamp('finance_pmo_reviewed_at', { mode: 'string' }),
  financePmoComment: varchar('finance_pmo_comment', { length: 500 }),
  ceoStatus: varchar('ceo_status', { length: 20 }),
  ceoReviewedBy: varchar('ceo_reviewed_by', { length: 50 }),
  ceoReviewedAt: timestamp('ceo_reviewed_at', { mode: 'string' }),
  ceoComment: varchar('ceo_comment', { length: 500 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => [
  index('bu_sales_plan_adj_plan_idx').on(table.buSalesPlanId),
]);

// ── BU Sales Target Planning: Type Exports ──
export type BuSalesPlan = InferSelectModel<typeof buSalesPlans>;
export type InsertBuSalesPlan = InferInsertModel<typeof buSalesPlans>;
export type BuSalesPlanDetail = InferSelectModel<typeof buSalesPlanDetails>;
export type InsertBuSalesPlanDetail = InferInsertModel<typeof buSalesPlanDetails>;
export type BuSalesPlanAdjustment = InferSelectModel<typeof buSalesPlanAdjustments>;
export type InsertBuSalesPlanAdjustment = InferInsertModel<typeof buSalesPlanAdjustments>;

// ══════════════════════════════════════════════════════════════
// AI Tasks — General-purpose async AI task queue
// (e.g. HR_CAPABILITY_PARSING, DOCUMENT_ANALYSIS, etc.)
// ══════════════════════════════════════════════════════════════

export const aiTasks = pgTable('ai_tasks', {
  id: serial('id').primaryKey(),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  inputData: json('input_data').$type<Record<string, unknown>>(),
  resultData: json('result_data').$type<Record<string, unknown>>(),
  errorMessage: varchar('error_message', { length: 500 }),
  createdBy: varchar('created_by', { length: 50 }),
  startedAt: timestamp('started_at', { mode: 'string' }),
  completedAt: timestamp('completed_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  // Worker retry & lock fields (Phase: HR & Risk Control)
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  timeoutAt: timestamp('timeout_at', { mode: 'string' }),
  workerLockId: varchar('worker_lock_id', { length: 50 }),
}, (table) => [
  index('ai_tasks_type_idx').on(table.taskType),
  index('ai_tasks_status_idx').on(table.status),
  index('ai_tasks_worker_lock_idx').on(table.workerLockId),
]);

export type AiTask = InferSelectModel<typeof aiTasks>;
export type InsertAiTask = InferInsertModel<typeof aiTasks>;
