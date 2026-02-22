CREATE TYPE "public"."accessLevelEnum" AS ENUM('view', 'interact', 'full');--> statement-breakpoint
CREATE TYPE "public"."accessLevelEnum1" AS ENUM('public', 'certified', 'confidential');--> statement-breakpoint
CREATE TYPE "public"."accessResultEnum" AS ENUM('allowed', 'denied', 'partial');--> statement-breakpoint
CREATE TYPE "public"."accountTypeEnum" AS ENUM('standard', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."actionEnum" AS ENUM('request_created', 'verification_started', 'proof_generated', 'verification_completed', 'verification_failed', 'result_accessed', 'proof_validated');--> statement-breakpoint
CREATE TYPE "public"."actionEnum1" AS ENUM('warn', 'block', 'replace', 'review');--> statement-breakpoint
CREATE TYPE "public"."actionTakenEnum" AS ENUM('allowed', 'blocked', 'warned');--> statement-breakpoint
CREATE TYPE "public"."actionTypeEnum" AS ENUM('role_change', 'permission_grant', 'permission_revoke', 'module_access', 'login', 'logout');--> statement-breakpoint
CREATE TYPE "public"."activityCategoryEnum" AS ENUM('work', 'travel_paid', 'travel_unpaid', 'break', 'training', 'meeting', 'admin');--> statement-breakpoint
CREATE TYPE "public"."activityLevelEnum" AS ENUM('inactive', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."actorTypeEnum" AS ENUM('system', 'ai_agent', 'human_user', 'external_api');--> statement-breakpoint
CREATE TYPE "public"."alertLevelEnum" AS ENUM('warning', 'critical', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."alertTypeEnum" AS ENUM('budget_percent', 'absolute_amount', 'cpi');--> statement-breakpoint
CREATE TYPE "public"."alertTypeEnum1" AS ENUM('DAILY_10H_LIMIT', 'WEEKLY_48H_LIMIT', 'REST_PERIOD_11H', 'FLSA_EXEMPTION_REVIEW', 'OVERTIME_THRESHOLD', 'BREAK_VIOLATION');--> statement-breakpoint
CREATE TYPE "public"."alertTypeEnum2" AS ENUM('VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'EXEMPTION_AT_RISK', 'OVERTIME_WARNING', 'WEEKLY_SUMMARY');--> statement-breakpoint
CREATE TYPE "public"."alertTypeEnum3" AS ENUM('overtime', 'undertime', 'continuous_work', 'low_efficiency', 'quality_issue');--> statement-breakpoint
CREATE TYPE "public"."alertTypeEnum4" AS ENUM('hiring', 'revenue', 'resource', 'performance');--> statement-breakpoint
CREATE TYPE "public"."applicantRoleEnum" AS ENUM('developer', 'tester', 'admin', 'devops');--> statement-breakpoint
CREATE TYPE "public"."approvalLevelEnum" AS ENUM('supervisor', 'hr', 'finance', 'it');--> statement-breakpoint
CREATE TYPE "public"."approvalStatusEnum" AS ENUM('pending', 'approved', 'rejected', 'auto');--> statement-breakpoint
CREATE TYPE "public"."approvalStatusEnum1" AS ENUM('not_required', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approvalStatusEnum2" AS ENUM('draft', 'pending_supervisor', 'pending_hr', 'pending_finance', 'pending_it', 'approved', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approvalTypeEnum" AS ENUM('STAGE_START', 'STAGE_COMPLETE', 'GATE_PASS', 'EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."assemblyTypeEnum" AS ENUM('mechanical', 'electrical', 'pneumatic', 'hydraulic');--> statement-breakpoint
CREATE TYPE "public"."assessmentTypeEnum" AS ENUM('self', 'supervisor', 'peer', 'ai');--> statement-breakpoint
CREATE TYPE "public"."assessmentTypeEnum1" AS ENUM('quiz', 'survey', 'practical');--> statement-breakpoint
CREATE TYPE "public"."assetCategoryEnum" AS ENUM('profile', 'email_account', 'phone_number', 'laptop', 'monitor', 'access_card', 'keys', 'software_license', 'system_account', 'cloud_storage', 'vpn_access', 'other');--> statement-breakpoint
CREATE TYPE "public"."assistantTypeEnum" AS ENUM('solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase', 'general');--> statement-breakpoint
CREATE TYPE "public"."assistantTypeEnum1" AS ENUM('solution', 'quotation', 'planning', 'kpi', 'personal');--> statement-breakpoint
CREATE TYPE "public"."assistantTypeEnum2" AS ENUM('general', 'sales', 'tech', 'pm', 'hr', 'finance', 'production', 'engineering');--> statement-breakpoint
CREATE TYPE "public"."assistantTypeEnum3" AS ENUM('solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase', 'engineering', 'quality');--> statement-breakpoint
CREATE TYPE "public"."attendanceStatusEnum" AS ENUM('unknown', 'attended', 'absent', 'late');--> statement-breakpoint
CREATE TYPE "public"."attendanceStatusEnum1" AS ENUM('unknown', 'attended', 'absent', 'partial');--> statement-breakpoint
CREATE TYPE "public"."attributionTypeEnum" AS ENUM('pre_departure', 'post_departure', 'shared');--> statement-breakpoint
CREATE TYPE "public"."auditTypeEnum" AS ENUM('expense', 'report', 'order', 'travel', 'timesheet');--> statement-breakpoint
CREATE TYPE "public"."auditTypeEnum1" AS ENUM('expense', 'quotation', 'disbursement');--> statement-breakpoint
CREATE TYPE "public"."auditTypeEnum2" AS ENUM('initial', 'surveillance', 'recertification', 'special');--> statement-breakpoint
CREATE TYPE "public"."authLevelEnum" AS ENUM('customer', 'employee', 'supervisor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."authStatusEnum" AS ENUM('unverified', 'pending', 'verified');--> statement-breakpoint
CREATE TYPE "public"."authStatusEnum1" AS ENUM('unverified', 'pending', 'verified', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."bidResultEnum" AS ENUM('won', 'lost', 'pending', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calculationTypeEnum" AS ENUM('offer', 'adjustment', 'promotion', 'simulation');--> statement-breakpoint
CREATE TYPE "public"."capabilityCategoryEnum" AS ENUM('production_capacity', 'quality_level', 'delivery_speed', 'technical_expertise', 'certification', 'equipment_capability');--> statement-breakpoint
CREATE TYPE "public"."capabilityDomainEnum" AS ENUM('T', 'S', 'D', 'C', 'K', 'L');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum" AS ENUM('business', 'role', 'planning', 'system');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum1" AS ENUM('culture', 'training', 'meeting', 'event', 'other');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum2" AS ENUM('budget', 'performance', 'cost', 'risk');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum3" AS ENUM('technical', 'management', 'safety', 'quality', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum4" AS ENUM('cleaning_technology', 'quality_assurance', 'industry_solutions', 'case_studies', 'certifications');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum5" AS ENUM('price', 'competitor', 'formula', 'customer', 'internal', 'legal', 'other');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum6" AS ENUM('core', 'business', 'analytics', 'admin', 'integration');--> statement-breakpoint
CREATE TYPE "public"."categoryEnum7" AS ENUM('project', 'task', 'client', 'document', 'system_access', 'knowledge', 'equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."certTypeEnum" AS ENUM('quality', 'environment', 'safety', 'security', 'process', 'customer_specific', 'other');--> statement-breakpoint
CREATE TYPE "public"."certificateLevelEnum" AS ENUM('basic', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."changeTypeEnum" AS ENUM('manual', 'version_upgrade', 'correction');--> statement-breakpoint
CREATE TYPE "public"."changeTypeEnum1" AS ENUM('add', 'modify', 'delete', 'correct', 'all');--> statement-breakpoint
CREATE TYPE "public"."changeTypeEnum2" AS ENUM('major', 'minor', 'patch');--> statement-breakpoint
CREATE TYPE "public"."changeTypeEnum3" AS ENUM('role_assignment', 'permission_update', 'department_change');--> statement-breakpoint
CREATE TYPE "public"."changeTypeEnum4" AS ENUM('feature', 'bugfix', 'performance', 'security', 'config', 'database', 'infrastructure');--> statement-breakpoint
CREATE TYPE "public"."channelEnum" AS ENUM('email', 'system', 'sms', 'wechat');--> statement-breakpoint
CREATE TYPE "public"."channelEnum1" AS ENUM('screen_popup', 'system_message', 'email', 'wechat', 'sms');--> statement-breakpoint
CREATE TYPE "public"."channelEnum2" AS ENUM('system', 'email', 'sms', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."checkTypeEnum" AS ENUM('file', 'sql', 'command', 'data_impact', 'dependency');--> statement-breakpoint
CREATE TYPE "public"."claimTypeEnum" AS ENUM('travel', 'meal', 'transportation', 'accommodation', 'equipment', 'project', 'daily', 'other');--> statement-breakpoint
CREATE TYPE "public"."communicationTypeEnum" AS ENUM('coaching', 'review', 'recognition', 'warning', 'improvement');--> statement-breakpoint
CREATE TYPE "public"."complianceFlagEnum" AS ENUM('OK', 'VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'VIOLATION_WEEKLY_LIMIT', 'EXEMPTION_REVIEW', 'PENDING_APPROVAL');--> statement-breakpoint
CREATE TYPE "public"."complianceRangeTypeEnum" AS ENUM('within_standard', 'above_minimum', 'below_maximum', 'exact_match');--> statement-breakpoint
CREATE TYPE "public"."complianceStatusEnum" AS ENUM('unchecked', 'passed', 'flagged', 'violation');--> statement-breakpoint
CREATE TYPE "public"."conclusionEnum" AS ENUM('Pass', 'ConditionalPass', 'Fail', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."configTypeEnum" AS ENUM('string', 'number', 'boolean', 'json');--> statement-breakpoint
CREATE TYPE "public"."confirmationStatusEnum" AS ENUM('pending', 'confirmed', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."connectorTypeEnum" AS ENUM('ERP', 'MES', 'IM', 'Email', 'Webhook', 'API');--> statement-breakpoint
CREATE TYPE "public"."consistencyCheckResultEnum" AS ENUM('passed', 'warning', 'failed');--> statement-breakpoint
CREATE TYPE "public"."contentTypeEnum" AS ENUM('text', 'table', 'code', 'file');--> statement-breakpoint
CREATE TYPE "public"."contentTypeEnum1" AS ENUM('article', 'faq', 'manual', 'video', 'document', 'case_study');--> statement-breakpoint
CREATE TYPE "public"."contentTypeEnum2" AS ENUM('text', 'image', 'file', 'voice', 'link');--> statement-breakpoint
CREATE TYPE "public"."contentTypeEnum3" AS ENUM('article', 'case_study', 'tip', 'faq', 'announcement', 'tutorial');--> statement-breakpoint
CREATE TYPE "public"."contractTypeEnum" AS ENUM('full_time', 'part_time', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."cost_standard_allocation_base" AS ENUM('direct_labor_hours', 'machine_hours', 'production_units', 'project_count', 'floor_area', 'revenue');--> statement-breakpoint
CREATE TYPE "public"."cost_standard_category" AS ENUM('labor', 'overhead', 'material_markup');--> statement-breakpoint
CREATE TYPE "public"."currentStageEnum" AS ENUM('initial', 'assistant', 'collaboration', 'leading', 'replacement');--> statement-breakpoint
CREATE TYPE "public"."currentStageEnum1" AS ENUM('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12');--> statement-breakpoint
CREATE TYPE "public"."customerConfirmationStatusEnum" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."customerLevelEnum" AS ENUM('S', 'A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."customerTypeEnum" AS ENUM('oem', 'tier1', 'tier2', 'other');--> statement-breakpoint
CREATE TYPE "public"."customerTypeEnum1" AS ENUM('OEM', 'Tier1', 'Tier2', 'EndUser', 'Trader', 'SystemIntegrator', 'Other');--> statement-breakpoint
CREATE TYPE "public"."dataCategoryEnum" AS ENUM('algorithm', 'formula', 'price', 'customer', 'equipment', 'employee');--> statement-breakpoint
CREATE TYPE "public"."dataRetentionPolicyEnum" AS ENUM('permanent', 'archive_after_year', 'archive_after_3years');--> statement-breakpoint
CREATE TYPE "public"."dataScopeEnum" AS ENUM('self', 'department', 'sub_departments', 'all');--> statement-breakpoint
CREATE TYPE "public"."decisionEnum" AS ENUM('pending', 'approved', 'rejected', 'returned');--> statement-breakpoint
CREATE TYPE "public"."decisionRoleEnum" AS ENUM('decision_maker', 'influencer', 'user', 'gatekeeper');--> statement-breakpoint
CREATE TYPE "public"."deliveryRiskEnum" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."deliveryStatusEnum" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."deploymentRequirementEnum" AS ENUM('any', 'private_cloud', 'on_premise', 'air_gapped');--> statement-breakpoint
CREATE TYPE "public"."deploymentTypeEnum" AS ENUM('cloud', 'on-premise', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."deploymentTypeEnum1" AS ENUM('windows', 'docker', 'kubernetes', 'manus_cloud');--> statement-breakpoint
CREATE TYPE "public"."desensitizationStatusEnum" AS ENUM('pending', 'passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."deviceTypeEnum" AS ENUM('humanoid_robot', 'agv', 'inspection_system', 'cnc_machine', 'assembly_robot', 'vision_system', 'sensor_array');--> statement-breakpoint
CREATE TYPE "public"."deviceTypeEnum1" AS ENUM('UWB_ANCHOR', 'UWB_TAG', 'CLOCK_MACHINE', 'BADGE_READER', 'MOBILE_APP');--> statement-breakpoint
CREATE TYPE "public"."directionEnum" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."emailHandlingEnum" AS ENUM('forward_to_successor', 'forward_to_manager', 'auto_reply_then_deactivate', 'deactivate');--> statement-breakpoint
CREATE TYPE "public"."emailTypeEnum" AS ENUM('daily_reminder', 'weekly_summary', 'performance_alert', 'improvement_suggestion', 'recognition', 'task_reminder');--> statement-breakpoint
CREATE TYPE "public"."emotionDetectedEnum" AS ENUM('positive', 'neutral', 'negative', 'nervous', 'confident');--> statement-breakpoint
CREATE TYPE "public"."engineerConfirmEnum" AS ENUM('Pending', 'Approved', 'Rejected', 'Modified');--> statement-breakpoint
CREATE TYPE "public"."entryTypeEnum" AS ENUM('text', 'file', 'image', 'voice');--> statement-breakpoint
CREATE TYPE "public"."environmentEnum" AS ENUM('test', 'production');--> statement-breakpoint
CREATE TYPE "public"."estimateTypeEnum" AS ENUM('rough', 'detailed', 'final');--> statement-breakpoint
CREATE TYPE "public"."evidenceTypeEnum" AS ENUM('project_delivery', 'training_cert', 'skill_cert', 'customer_feedback', 'peer_review', 'self_assessment', 'supervisor_eval', 'other');--> statement-breakpoint
CREATE TYPE "public"."executionModeEnum" AS ENUM('internal', 'generative');--> statement-breakpoint
CREATE TYPE "public"."executionTypeEnum" AS ENUM('task_assign', 'code_implement', 'compile_check', 'test_run', 'code_review', 'function_verify', 'bug_fix', 'bug_verify', 'task_complete', 'task_block');--> statement-breakpoint
CREATE TYPE "public"."exemptionStatusEnum" AS ENUM('exempt', 'non_exempt', 'review_required');--> statement-breakpoint
CREATE TYPE "public"."exemptionTypeEnum" AS ENUM('executive', 'administrative', 'professional', 'outside_sales', 'computer', 'none');--> statement-breakpoint
CREATE TYPE "public"."feedbackEnum" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TYPE "public"."fixedByEnum" AS ENUM('manus', 'claude_code', 'human');--> statement-breakpoint
CREATE TYPE "public"."formatEnum" AS ENUM('pdf', 'markdown', 'docx');--> statement-breakpoint
CREATE TYPE "public"."formatEnum1" AS ENUM('pdf', 'excel', 'csv');--> statement-breakpoint
CREATE TYPE "public"."frequencyEnum" AS ENUM('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."frequencyEnum1" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'adhoc');--> statement-breakpoint
CREATE TYPE "public"."gateStageEnum" AS ENUM('M7', 'M8', 'M9');--> statement-breakpoint
CREATE TYPE "public"."genderEnum" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."genderEnum1" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."handlingActionEnum" AS ENUM('transfer_to_successor', 'return_to_company', 'deactivate', 'forward', 'archive', 'delete', 'keep_active_temporary');--> statement-breakpoint
CREATE TYPE "public"."healthStatusEnum" AS ENUM('green', 'yellow', 'red');--> statement-breakpoint
CREATE TYPE "public"."healthStatusEnum1" AS ENUM('healthy', 'degraded', 'unhealthy', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."implementationEffortEnum" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."insightTypeEnum" AS ENUM('summary', 'action_items', 'decisions', 'risks', 'opportunities');--> statement-breakpoint
CREATE TYPE "public"."integrationTypeEnum" AS ENUM('COPILOT_365', 'WECOM', 'DINGTALK', 'FEISHU', 'ERP', 'MES', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."interactionTypeEnum" AS ENUM('task', 'question', 'feedback', 'learning', 'coaching', 'chat');--> statement-breakpoint
CREATE TYPE "public"."interactionTypeEnum1" AS ENUM('question', 'answer', 'feedback', 'complaint', 'suggestion', 'lead');--> statement-breakpoint
CREATE TYPE "public"."interviewTypeEnum" AS ENUM('phone', 'video', 'onsite');--> statement-breakpoint
CREATE TYPE "public"."isKeyPersonEnum" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."jurisdictionEnum" AS ENUM('DE', 'US', 'CN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."jurisdictionEnum1" AS ENUM('DE', 'US', 'CN', 'OTHER', 'ALL');--> statement-breakpoint
CREATE TYPE "public"."knowledgeTypeEnum" AS ENUM('lesson_learned', 'best_practice', 'risk_pattern', 'solution');--> statement-breakpoint
CREATE TYPE "public"."knowledgeTypeEnum1" AS ENUM('SOP', 'RISK', 'BEST_PRACTICE', 'CHECKLIST', 'REFERENCE');--> statement-breakpoint
CREATE TYPE "public"."kpiCategoryEnum" AS ENUM('task', 'quality', 'efficiency', 'collaboration', 'innovation');--> statement-breakpoint
CREATE TYPE "public"."languagePreferenceEnum" AS ENUM('zh', 'en', 'de', 'fr');--> statement-breakpoint
CREATE TYPE "public"."lastRunStatusEnum" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."lastRunStatusEnum1" AS ENUM('success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lastTestResultEnum" AS ENUM('Success', 'Failed', 'NotTested');--> statement-breakpoint
CREATE TYPE "public"."learningSourceEnum" AS ENUM('interaction', 'task', 'feedback', 'document', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."learningTypeEnum" AS ENUM('bid_won', 'bid_lost', 'price_negotiation', 'market_change', 'competitor_intel');--> statement-breakpoint
CREATE TYPE "public"."learningTypeEnum1" AS ENUM('project_delivery', 'customer_feedback', 'performance_data', 'maintenance_record', 'optimization');--> statement-breakpoint
CREATE TYPE "public"."levelEnum" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."levelEnum1" AS ENUM('company', 'department', 'project', 'team', 'personal');--> statement-breakpoint
CREATE TYPE "public"."licenseTypeEnum" AS ENUM('trial', 'standard', 'enterprise', 'unlimited');--> statement-breakpoint
CREATE TYPE "public"."locationTypeEnum" AS ENUM('clock_in', 'clock_out', 'check_point', 'real_time');--> statement-breakpoint
CREATE TYPE "public"."marketComparisonEnum" AS ENUM('below', 'at', 'above');--> statement-breakpoint
CREATE TYPE "public"."matchTypeEnum" AS ENUM('exact', 'contains', 'regex');--> statement-breakpoint
CREATE TYPE "public"."meetingTypeEnum" AS ENUM('standup', 'review', 'planning', 'retrospective', 'other');--> statement-breakpoint
CREATE TYPE "public"."memberTypeEnum" AS ENUM('user', 'role', 'department');--> statement-breakpoint
CREATE TYPE "public"."messageTypeEnum" AS ENUM('question', 'reply', 'announcement', 'knowledge_push');--> statement-breakpoint
CREATE TYPE "public"."methodEnum" AS ENUM('phone', 'visit', 'email', 'meeting', 'wechat');--> statement-breakpoint
CREATE TYPE "public"."mfaTypeEnum" AS ENUM('totp', 'sms', 'email', 'hardware_key');--> statement-breakpoint
CREATE TYPE "public"."milestoneTypeEnum" AS ENUM('Q4_Strategy', 'Q1_Kickoff', 'Monthly_Review', 'Weekly_Check', 'Custom');--> statement-breakpoint
CREATE TYPE "public"."notificationTypeEnum" AS ENUM('meeting', 'training', 'announcement', 'reminder', 'alert', 'custom');--> statement-breakpoint
CREATE TYPE "public"."notificationTypeEnum1" AS ENUM('request_submitted', 'request_approved', 'request_rejected', 'execution_started', 'execution_completed', 'execution_failed', 'consistency_warning', 'consistency_failed', 'rollback_required', 'deployment_success', 'deployment_failed');--> statement-breakpoint
CREATE TYPE "public"."notifyTypeEnum" AS ENUM('email', 'system', 'both');--> statement-breakpoint
CREATE TYPE "public"."overallComplianceStatusEnum" AS ENUM('compliant', 'warning', 'violation');--> statement-breakpoint
CREATE TYPE "public"."parameterCategoryEnum" AS ENUM('temperature', 'pressure', 'flow_rate', 'concentration', 'time', 'speed', 'cleanliness');--> statement-breakpoint
CREATE TYPE "public"."participantRoleEnum" AS ENUM('engineer', 'supervisor', 'customer', 'ai_system');--> statement-breakpoint
CREATE TYPE "public"."pathTypeEnum" AS ENUM('vertical', 'horizontal', 'cross_functional');--> statement-breakpoint
CREATE TYPE "public"."performanceDataHandlingEnum" AS ENUM('keep_under_original', 'transfer_to_successor', 'split_by_date');--> statement-breakpoint
CREATE TYPE "public"."periodTypeEnum" AS ENUM('monthly', 'quarterly', 'yearly', 'phase');--> statement-breakpoint
CREATE TYPE "public"."periodTypeEnum1" AS ENUM('current_day', 'daily', 'weekly', 'monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."periodTypeEnum2" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."permissionEnum" AS ENUM('none', 'read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."permissionTypeEnum" AS ENUM('read', 'write', 'delete', 'admin', 'export', 'import');--> statement-breakpoint
CREATE TYPE "public"."phaseEnum" AS ENUM('development', 'testing', 'recording', 'release');--> statement-breakpoint
CREATE TYPE "public"."phoneHandlingEnum" AS ENUM('transfer_to_successor', 'return_to_pool', 'deactivate');--> statement-breakpoint
CREATE TYPE "public"."planTypeEnum" AS ENUM('onboarding', 'ongoing', 'special');--> statement-breakpoint
CREATE TYPE "public"."planTypeEnum1" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'training', 'visit', 'phase');--> statement-breakpoint
CREATE TYPE "public"."platformEnum" AS ENUM('wechat', 'wecom', 'dingtalk', 'other');--> statement-breakpoint
CREATE TYPE "public"."platformEnum1" AS ENUM('wecom', 'dingtalk', 'feishu');--> statement-breakpoint
CREATE TYPE "public"."predictionTypeEnum" AS ENUM('completion_date', 'cost', 'quality', 'risk');--> statement-breakpoint
CREATE TYPE "public"."predictionTypeEnum1" AS ENUM('demand', 'reorder', 'value_added_order');--> statement-breakpoint
CREATE TYPE "public"."priceTypeEnum" AS ENUM('standard', 'minimum', 'maximum');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum1" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum2" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum3" AS ENUM('urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum4" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum5" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum6" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."profileHandlingEnum" AS ENUM('transfer_to_successor', 'create_new_for_successor', 'archive');--> statement-breakpoint
CREATE TYPE "public"."projectTypeEnum" AS ENUM('standard', 'custom', 'service');--> statement-breakpoint
CREATE TYPE "public"."protocolEnum" AS ENUM('rest', 'grpc', 'mqtt', 'opc_ua', 'modbus');--> statement-breakpoint
CREATE TYPE "public"."publishStatusEnum" AS ENUM('draft', 'queued', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pushStatusEnum" AS ENUM('unpublished', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."queryTypeEnum" AS ENUM('performance', 'project', 'client', 'task', 'all');--> statement-breakpoint
CREATE TYPE "public"."rateTypeEnum" AS ENUM('labor_design', 'labor_manufacture', 'labor_install', 'transport', 'insurance', 'warranty');--> statement-breakpoint
CREATE TYPE "public"."reasonEnum" AS ENUM('resignation', 'termination', 'retirement', 'contract_end', 'mutual_agreement', 'other');--> statement-breakpoint
CREATE TYPE "public"."recipientTypeEnum" AS ENUM('employee', 'supervisor', 'team', 'hr');--> statement-breakpoint
CREATE TYPE "public"."recommendationEnum" AS ENUM('hire', 'pending', 'reject');--> statement-breakpoint
CREATE TYPE "public"."recommendationEnum1" AS ENUM('auto_approve', 'manual_review', 'reject');--> statement-breakpoint
CREATE TYPE "public"."recommendationEnum2" AS ENUM('auto_approve', 'manual_review', 'reject', 'escalate');--> statement-breakpoint
CREATE TYPE "public"."recordingStatusEnum" AS ENUM('not_started', 'recording', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."registrationStatusEnum" AS ENUM('registered', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."relatedTypeEnum" AS ENUM('customer', 'opportunity');--> statement-breakpoint
CREATE TYPE "public"."reportTypeEnum" AS ENUM('installation', 'maintenance', 'repair', 'inspection', 'training');--> statement-breakpoint
CREATE TYPE "public"."reportTypeEnum1" AS ENUM('daily', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."reportedByEnum" AS ENUM('manus', 'claude_code', 'human', 'test');--> statement-breakpoint
CREATE TYPE "public"."requestTypeEnum" AS ENUM('add', 'modify', 'delete', 'correct');--> statement-breakpoint
CREATE TYPE "public"."requestTypeEnum1" AS ENUM('vda_19_1_compliance', 'process_parameter', 'capability_proof', 'quality_standard', 'cost_range', 'delivery_capacity');--> statement-breakpoint
CREATE TYPE "public"."requesterTypeEnum" AS ENUM('customer_ai', 'internal_ai', 'human_user', 'external_system');--> statement-breakpoint
CREATE TYPE "public"."responseModeEnum" AS ENUM('ai_assisted', 'direct', 'auto');--> statement-breakpoint
CREATE TYPE "public"."responseStatusEnum" AS ENUM('pending', 'accepted', 'declined', 'tentative');--> statement-breakpoint
CREATE TYPE "public"."responsibleRoleEnum" AS ENUM('PROJECT_MANAGER', 'MECHANICAL', 'ELECTRICAL', 'ASSEMBLY', 'QC', 'SERVICE', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."resultEnum" AS ENUM('success', 'failure', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."resultEnum1" AS ENUM('match', 'mismatch', 'unexpected', 'missing');--> statement-breakpoint
CREATE TYPE "public"."resultEnum2" AS ENUM('pass', 'conditional_pass', 'fail', 'pending');--> statement-breakpoint
CREATE TYPE "public"."retryStatusEnum" AS ENUM('pending', 'retrying', 'success', 'failed', 'exhausted');--> statement-breakpoint
CREATE TYPE "public"."revenueTypeEnum" AS ENUM('actual', 'forecast', 'budget');--> statement-breakpoint
CREATE TYPE "public"."reviewCarriageEnum" AS ENUM('Mechanical', 'Electrical', 'Quality', 'Service', 'Procurement', 'General');--> statement-breakpoint
CREATE TYPE "public"."reviewStatusEnum" AS ENUM('draft', 'pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reviewTypeEnum" AS ENUM('3M', '6M', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."reviewTypeEnum1" AS ENUM('M3_ProjectApproval', 'M4_DesignFreeze', 'M5_DetailDesign', 'M6_Procurement', 'M7_Production', 'M8_Assembly', 'M9_Testing', 'M10_Delivery', 'M11_Installation', 'M12_Acceptance');--> statement-breakpoint
CREATE TYPE "public"."riskCategoryEnum" AS ENUM('schedule', 'cost', 'quality', 'resource', 'scope');--> statement-breakpoint
CREATE TYPE "public"."riskLevelEnum" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."roleEnum" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."roleEnum1" AS ENUM('organizer', 'required', 'optional', 'presenter');--> statement-breakpoint
CREATE TYPE "public"."roleEnum2" AS ENUM('manager', 'lead', 'member', 'stakeholder');--> statement-breakpoint
CREATE TYPE "public"."roleEnum3" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."roleEnum4" AS ENUM('guest', 'employee', 'tech_lead', 'sales_manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."roleEnum5" AS ENUM('admin', 'manager', 'specialist', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."roleEnum6" AS ENUM('owner', 'manager', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."roleEnum7" AS ENUM('organizer', 'presenter', 'participant', 'observer');--> statement-breakpoint
CREATE TYPE "public"."roleTypeEnum" AS ENUM('office', 'field', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."ruleTypeEnum" AS ENUM('equipment', 'project', 'material');--> statement-breakpoint
CREATE TYPE "public"."ruleTypeEnum1" AS ENUM('equipment', 'project', 'material', 'all');--> statement-breakpoint
CREATE TYPE "public"."ruleTypeEnum2" AS ENUM('daily_limit', 'weekly_limit', 'rest_period', 'overtime_limit', 'exemption_check');--> statement-breakpoint
CREATE TYPE "public"."scaleEnum" AS ENUM('small', 'medium', 'large', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."scenesEnum" AS ENUM('Automotive', 'Aerospace', 'Medical', 'Electronics', 'Optics', 'PrecisionMachinery', 'Other');--> statement-breakpoint
CREATE TYPE "public"."scheduleTypeEnum" AS ENUM('immediate', 'scheduled', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."scopeEnum" AS ENUM('all', 'project', 'category');--> statement-breakpoint
CREATE TYPE "public"."scopeEnum1" AS ENUM('all', 'own_dept', 'own_team', 'self');--> statement-breakpoint
CREATE TYPE "public"."scoreLevelEnum" AS ENUM('excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory');--> statement-breakpoint
CREATE TYPE "public"."sendStatusEnum" AS ENUM('pending', 'sent', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."sensitivityLevelEnum" AS ENUM('L0_public', 'L1_internal', 'L2_sensitive', 'L3_confidential', 'L4_top_secret');--> statement-breakpoint
CREATE TYPE "public"."sentimentEnum" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."serviceTypeEnum" AS ENUM('solution', 'quotation', 'planning', 'kpi');--> statement-breakpoint
CREATE TYPE "public"."severityEnum" AS ENUM('critical', 'major', 'minor', 'trivial');--> statement-breakpoint
CREATE TYPE "public"."severityEnum1" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."severityEnum2" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."severityEnum3" AS ENUM('info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."skillLevelEnum" AS ENUM('L1', 'L2', 'L3', 'L4', 'L5');--> statement-breakpoint
CREATE TYPE "public"."snapshotTypeEnum" AS ENUM('daily', 'weekly', 'milestone', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sourceTypeEnum" AS ENUM('grt_internal', 'competitor', 'industry_standard');--> statement-breakpoint
CREATE TYPE "public"."sourceTypeEnum1" AS ENUM('annual_plan', 'quarterly_plan', 'monthly_plan', 'customer_feedback', 'project_opl', 'project_status', 'meeting_minutes', 'supervisor_task', 'kpi_status', 'incomplete_plan', 'execution_note');--> statement-breakpoint
CREATE TYPE "public"."sourceTypeEnum2" AS ENUM('annual_plan', 'quarterly_plan', 'monthly_plan', 'customer_feedback', 'opl', 'meeting', 'supervisor', 'kpi_gap', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sourceTypeEnum3" AS ENUM('knowledge_base', 'solution_assistant', 'manual', 'external');--> statement-breakpoint
CREATE TYPE "public"."sourceTypeEnum4" AS ENUM('MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC');--> statement-breakpoint
CREATE TYPE "public"."speakerEnum" AS ENUM('candidate', 'interviewer', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."staffTypeEnum" AS ENUM('Sales', 'Support_Asia', 'Support_Local', 'Service_Asia', 'Service_Local', 'Support_Asia_Remote');--> statement-breakpoint
CREATE TYPE "public"."stageEnum" AS ENUM('lead', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."statTypeEnum" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."statusEnum" AS ENUM('success', 'error', 'timeout', 'rate_limited');--> statement-breakpoint
CREATE TYPE "public"."statusEnum1" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."statusEnum10" AS ENUM('pending', 'acknowledged', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."statusEnum11" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."statusEnum12" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."statusEnum13" AS ENUM('active', 'inactive', 'blacklist');--> statement-breakpoint
CREATE TYPE "public"."statusEnum14" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."statusEnum15" AS ENUM('active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."statusEnum16" AS ENUM('backlog', 'todo', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."statusEnum17" AS ENUM('open', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."statusEnum18" AS ENUM('success', 'failed', 'partial', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."statusEnum19" AS ENUM('pending', 'in_progress', 'in_review', 'testing', 'completed', 'blocked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum2" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum20" AS ENUM('pending', 'queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum21" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum22" AS ENUM('pending', 'in_progress', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum23" AS ENUM('active', 'deprecated', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."statusEnum24" AS ENUM('pending', 'reviewed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."statusEnum25" AS ENUM('pending', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum26" AS ENUM('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."statusEnum27" AS ENUM('probation', 'regular', 'resigned', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."statusEnum28" AS ENUM('pending', 'sent', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum29" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."statusEnum3" AS ENUM('pending', 'accepted', 'rejected', 'modified');--> statement-breakpoint
CREATE TYPE "public"."statusEnum30" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum31" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."statusEnum32" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum33" AS ENUM('pending', 'approved', 'rejected', 'implementing', 'testing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum34" AS ENUM('pending', 'sent', 'delivered', 'failed', 'read');--> statement-breakpoint
CREATE TYPE "public"."statusEnum35" AS ENUM('draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum36" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."statusEnum37" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum38" AS ENUM('draft', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."statusEnum39" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum4" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum40" AS ENUM('pending', 'in_review', 'approved', 'rejected', 'waived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum41" AS ENUM('pending', 'completed', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum42" AS ENUM('pending', 'accepted', 'rejected', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."statusEnum43" AS ENUM('active', 'acknowledged', 'resolved', 'expired');--> statement-breakpoint
CREATE TYPE "public"."statusEnum44" AS ENUM('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum45" AS ENUM('draft', 'active', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum46" AS ENUM('online', 'offline', 'error', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."statusEnum47" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."statusEnum48" AS ENUM('pending', 'scheduled', 'sent', 'delivered', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum49" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."statusEnum5" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum50" AS ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum51" AS ENUM('draft', 'assigned', 'in_progress', 'pending_review', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum52" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum53" AS ENUM('draft', 'submitted', 'ai_reviewing', 'pending_review', 'manager_approved', 'finance_reviewing', 'approved', 'payment_processing', 'rejected', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum54" AS ENUM('draft', 'pending_confirmation', 'confirmed', 'processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum55" AS ENUM('draft', 'submitted', 'supervisor_review', 'supervisor_approved', 'customer_pending', 'customer_confirmed', 'invoice_issued', 'completed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum56" AS ENUM('pending', 'processing', 'verified', 'rejected', 'expired', 'error');--> statement-breakpoint
CREATE TYPE "public"."statusEnum57" AS ENUM('draft', 'review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum58" AS ENUM('open', 'acknowledged', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."statusEnum59" AS ENUM('generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum6" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum60" AS ENUM('pending', 'active', 'muted', 'banned');--> statement-breakpoint
CREATE TYPE "public"."statusEnum61" AS ENUM('active', 'expired', 'revoked', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."statusEnum62" AS ENUM('draft', 'submitted', 'reviewing', 'approved', 'rejected', 'executing', 'testing', 'verified', 'deployed', 'rolled_back', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum63" AS ENUM('started', 'executing', 'completed', 'failed', 'blocked', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."statusEnum64" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."statusEnum65" AS ENUM('pending', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statusEnum66" AS ENUM('Active', 'Inactive', 'OnLeave');--> statement-breakpoint
CREATE TYPE "public"."statusEnum67" AS ENUM('Pending', 'Acknowledged', 'Resolved', 'Ignored');--> statement-breakpoint
CREATE TYPE "public"."statusEnum68" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum69" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum7" AS ENUM('draft', 'submitted', 'approved', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum70" AS ENUM('scheduled', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."statusEnum71" AS ENUM('optimal', 'understaffed', 'overstaffed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum72" AS ENUM('draft', 'approved', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum73" AS ENUM('valid', 'expired', 'pending', 'planned', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."statusEnum74" AS ENUM('planned', 'in_progress', 'completed', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum75" AS ENUM('draft', 'reviewed', 'approved', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."statusEnum76" AS ENUM('pending', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum77" AS ENUM('active', 'acknowledged', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum78" AS ENUM('Pending', 'In_Progress', 'Completed', 'Alert', 'Blocked');--> statement-breakpoint
CREATE TYPE "public"."statusEnum79" AS ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."statusEnum8" AS ENUM('pending', 'in_progress', 'completed', 'rework');--> statement-breakpoint
CREATE TYPE "public"."statusEnum80" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'AUTO_APPROVED');--> statement-breakpoint
CREATE TYPE "public"."statusEnum81" AS ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING');--> statement-breakpoint
CREATE TYPE "public"."statusEnum82" AS ENUM('Draft', 'Active', 'OnHold', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum83" AS ENUM('NotStarted', 'InProgress', 'Completed', 'Blocked', 'Skipped');--> statement-breakpoint
CREATE TYPE "public"."statusEnum84" AS ENUM('Draft', 'Active', 'Archived', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."statusEnum85" AS ENUM('Draft', 'EngineerReview', 'ProcurementReview', 'Approved', 'Submitted', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."statusEnum86" AS ENUM('draft', 'in_progress', 'handover_complete', 'approval_complete', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."statusEnum87" AS ENUM('pending', 'in_progress', 'completed', 'verified');--> statement-breakpoint
CREATE TYPE "public"."statusEnum88" AS ENUM('pending_confirmation', 'confirmed', 'disputed', 'revised');--> statement-breakpoint
CREATE TYPE "public"."statusEnum89" AS ENUM('active', 'inactive', 'planning');--> statement-breakpoint
CREATE TYPE "public"."statusEnum9" AS ENUM('planning', 'in_progress', 'achieved', 'paused');--> statement-breakpoint
CREATE TYPE "public"."statusEnum90" AS ENUM('active', 'inactive', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."subjectTypeEnum" AS ENUM('employee', 'candidate', 'position');--> statement-breakpoint
CREATE TYPE "public"."successorTypeEnum" AS ENUM('replacement', 'new_position', 'backup', 'none');--> statement-breakpoint
CREATE TYPE "public"."suggestionModeEnum" AS ENUM('full_process', 'current_step', 'single_action');--> statement-breakpoint
CREATE TYPE "public"."suggestionTypeEnum" AS ENUM('field_update', 'process_link', 'content_match');--> statement-breakpoint
CREATE TYPE "public"."suggestionTypeEnum1" AS ENUM('schedule', 'cost', 'resource', 'quality', 'process');--> statement-breakpoint
CREATE TYPE "public"."supervisorApprovalEnum" AS ENUM('pending', 'approved', 'rejected', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."syncDirectionEnum" AS ENUM('jdy_to_grt', 'grt_to_jdy', 'bidirectional');--> statement-breakpoint
CREATE TYPE "public"."syncDirectionEnum1" AS ENUM('ToMES', 'FromMES', 'Bidirectional');--> statement-breakpoint
CREATE TYPE "public"."syncStatusEnum" AS ENUM('synced', 'pending', 'error');--> statement-breakpoint
CREATE TYPE "public"."syncStatusEnum1" AS ENUM('idle', 'syncing', 'error');--> statement-breakpoint
CREATE TYPE "public"."syncStatusEnum2" AS ENUM('pending', 'synced', 'failed', 'manual');--> statement-breakpoint
CREATE TYPE "public"."syncStatusEnum3" AS ENUM('Pending', 'Syncing', 'Synced', 'Failed', 'Conflict');--> statement-breakpoint
CREATE TYPE "public"."syncTypeEnum" AS ENUM('schema', 'data', 'config', 'full');--> statement-breakpoint
CREATE TYPE "public"."targetEntityTypeEnum" AS ENUM('project', 'product', 'process', 'equipment', 'capability');--> statement-breakpoint
CREATE TYPE "public"."targetEnvironmentEnum" AS ENUM('test', 'production', 'both');--> statement-breakpoint
CREATE TYPE "public"."taskTypeEnum" AS ENUM('feature', 'bugfix', 'refactor', 'test', 'docs', 'infrastructure');--> statement-breakpoint
CREATE TYPE "public"."taskTypeEnum1" AS ENUM('work', 'training', 'visit', 'meeting', 'review', 'other');--> statement-breakpoint
CREATE TYPE "public"."taskTypeEnum2" AS ENUM('performance_review_reminder', 'training_reminder', 'meeting_reminder', 'custom');--> statement-breakpoint
CREATE TYPE "public"."taskTypeEnum3" AS ENUM('installation', 'maintenance', 'repair', 'inspection', 'training', 'consultation');--> statement-breakpoint
CREATE TYPE "public"."taskTypeEnum4" AS ENUM('user', 'department', 'role', 'role_members', 'form_data', 'full');--> statement-breakpoint
CREATE TYPE "public"."templateTypeEnum" AS ENUM('builtin', 'custom');--> statement-breakpoint
CREATE TYPE "public"."testResultEnum" AS ENUM('pass', 'fail', 'partial');--> statement-breakpoint
CREATE TYPE "public"."testTypeEnum" AS ENUM('basic', 'skill', 'project');--> statement-breakpoint
CREATE TYPE "public"."thresholdUnitEnum" AS ENUM('hours', 'minutes', 'days', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."tierChangeRecommendationEnum" AS ENUM('upgrade', 'maintain', 'downgrade');--> statement-breakpoint
CREATE TYPE "public"."trackingSourceEnum" AS ENUM('meeting', 'sop', 'training', 'email', 'report', 'customer', 'manual');--> statement-breakpoint
CREATE TYPE "public"."transportationTypeEnum" AS ENUM('flight', 'train', 'car', 'bus', 'other');--> statement-breakpoint
CREATE TYPE "public"."triggeredByEnum" AS ENUM('schedule', 'manual', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."typeEnum" AS ENUM('document', 'faq', 'case', 'template', 'policy');--> statement-breakpoint
CREATE TYPE "public"."typeEnum1" AS ENUM('company', 'department', 'project');--> statement-breakpoint
CREATE TYPE "public"."typeEnum10" AS ENUM('task', 'issue', 'risk', 'change');--> statement-breakpoint
CREATE TYPE "public"."typeEnum11" AS ENUM('standard', 'key', 'strategic');--> statement-breakpoint
CREATE TYPE "public"."typeEnum12" AS ENUM('internal', 'external', 'online', 'certification');--> statement-breakpoint
CREATE TYPE "public"."typeEnum13" AS ENUM('wecom', 'dingtalk', 'feishu', 'custom');--> statement-breakpoint
CREATE TYPE "public"."typeEnum2" AS ENUM('direct', 'indirect', 'overhead');--> statement-breakpoint
CREATE TYPE "public"."typeEnum3" AS ENUM('prospect', 'customer', 'partner');--> statement-breakpoint
CREATE TYPE "public"."typeEnum4" AS ENUM('new_business', 'expansion', 'renewal');--> statement-breakpoint
CREATE TYPE "public"."typeEnum5" AS ENUM('feature', 'bugfix', 'refactor', 'docs', 'test');--> statement-breakpoint
CREATE TYPE "public"."typeEnum6" AS ENUM('suggestion', 'bug', 'other');--> statement-breakpoint
CREATE TYPE "public"."typeEnum7" AS ENUM('department', 'project', 'cross_dept', 'training', 'announcement', 'meeting', 'custom');--> statement-breakpoint
CREATE TYPE "public"."typeEnum8" AS ENUM('contract', 'design', 'report', 'manual', 'other');--> statement-breakpoint
CREATE TYPE "public"."typeEnum9" AS ENUM('deliverable', 'review', 'approval', 'other');--> statement-breakpoint
CREATE TYPE "public"."updateTypeEnum" AS ENUM('create', 'copy', 'update', 'archive', 'ai_update');--> statement-breakpoint
CREATE TYPE "public"."urgencyEnum" AS ENUM('normal', 'urgent', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_profile_role" AS ENUM('admin', 'manager', 'specialist', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."verificationStatusEnum" AS ENUM('pending', 'verified', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."verificationStatusEnum1" AS ENUM('unverified', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibilityEnum" AS ENUM('public', 'private', 'confidential');--> statement-breakpoint
CREATE TYPE "public"."widgetTypeEnum" AS ENUM('chart', 'table', 'stat', 'list', 'calendar', 'map', 'custom');--> statement-breakpoint
CREATE TYPE "public"."workOrderTypeEnum" AS ENUM('Production', 'Assembly', 'Testing', 'Debugging', 'Packaging', 'Other');--> statement-breakpoint
CREATE TYPE "public"."workTypeEnum" AS ENUM('REGULAR', 'OVERTIME', 'TRAINING', 'MEETING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."workpieceCategoryEnum" AS ENUM('shell', 'shaft', 'gear', 'valve', 'cylinder', 'precision', 'other');--> statement-breakpoint
CREATE TABLE "grt_approval_action_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"step_record_id" integer,
	"action" varchar(50) NOT NULL,
	"operator_id" integer NOT NULL,
	"operator_name" varchar(128) NOT NULL,
	"operator_role" varchar(64),
	"previous_status" varchar(32),
	"new_status" varchar(32),
	"comment" text,
	"metadata" json,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_approval_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"delegator_id" integer NOT NULL,
	"delegator_name" varchar(128) NOT NULL,
	"delegatee_id" integer NOT NULL,
	"delegatee_name" varchar(128) NOT NULL,
	"business_types" json,
	"template_ids" json,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_approval_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_code" varchar(64) NOT NULL,
	"template_id" integer NOT NULL,
	"template_code" varchar(64) NOT NULL,
	"business_type" varchar(64) NOT NULL,
	"business_id" varchar(64) NOT NULL,
	"business_table" varchar(64) NOT NULL,
	"business_title" varchar(256),
	"applicant_id" integer NOT NULL,
	"applicant_name" varchar(128) NOT NULL,
	"applicant_department" varchar(128),
	"summary" text,
	"amount" numeric(15, 2),
	"currency" varchar(8) DEFAULT 'CNY',
	"urgency" varchar(50) DEFAULT 'normal',
	"status" varchar(50) DEFAULT 'draft',
	"current_step" integer DEFAULT 1,
	"total_steps" integer NOT NULL,
	"current_approver_id" integer,
	"current_approver_name" varchar(128),
	"final_result" varchar(50),
	"final_comment" text,
	"attachments" json,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_approval_instances_instance_code_unique" UNIQUE("instance_code")
);
--> statement-breakpoint
CREATE TABLE "grt_approval_step_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"instance_code" varchar(64) NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" varchar(128) NOT NULL,
	"approver_role" varchar(64) NOT NULL,
	"approver_type" varchar(50) DEFAULT 'user',
	"approver_id" integer,
	"approver_name" varchar(128),
	"approver_email" varchar(128),
	"status" varchar(50) DEFAULT 'pending',
	"action" varchar(50),
	"comment" text,
	"delegated_to" integer,
	"delegated_to_name" varchar(128),
	"delegate_reason" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp,
	"completed_at" timestamp,
	"processing_time" integer
);
--> statement-breakpoint
CREATE TABLE "grt_approval_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_code" varchar(64) NOT NULL,
	"template_name" varchar(128) NOT NULL,
	"business_type" varchar(50) NOT NULL,
	"description" text,
	"steps" json NOT NULL,
	"condition_rules" json,
	"notification_config" json,
	"default_timeout_hours" integer DEFAULT 48,
	"auto_approve_on_timeout" boolean DEFAULT false,
	"escalate_on_timeout" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"version" varchar(20) DEFAULT '1.0',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_approval_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE "grt_red_blue_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_code" varchar(64) NOT NULL,
	"config_name" varchar(128) NOT NULL,
	"project_id" integer,
	"project_code" varchar(64),
	"project_name" varchar(256),
	"customer_id" integer,
	"customer_name" varchar(256),
	"customer_tier" varchar(50) DEFAULT 'other',
	"red_team_leader_id" integer,
	"red_team_leader_name" varchar(128),
	"red_team_members" json,
	"red_team_objectives" text,
	"red_team_scenarios" json,
	"blue_team_leader_id" integer,
	"blue_team_leader_name" varchar(128),
	"blue_team_members" json,
	"blue_team_objectives" text,
	"blue_team_resources" json,
	"schedule" json,
	"evaluation_criteria" json,
	"trigger_conditions" json,
	"status" varchar(50) DEFAULT 'draft',
	"approval_instance_id" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"results" json,
	"lessons_learned" text,
	"improvement_actions" json,
	"created_by" integer NOT NULL,
	"created_by_name" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_red_blue_configs_config_code_unique" UNIQUE("config_code")
);
--> statement-breakpoint
CREATE TABLE "grt_red_blue_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"config_code" varchar(64) NOT NULL,
	"phase" varchar(64) NOT NULL,
	"phase_name" varchar(128) NOT NULL,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"red_team_actions" json,
	"red_team_findings" text,
	"blue_team_responses" json,
	"blue_team_performance" text,
	"red_team_score" numeric(5, 2),
	"blue_team_score" numeric(5, 2),
	"issues_found" json,
	"status" varchar(50) DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"delegationCode" varchar(50) NOT NULL,
	"delegatedFrom" integer NOT NULL,
	"delegatedFromName" varchar(100),
	"delegatedTo" integer NOT NULL,
	"delegatedToName" varchar(100),
	"documentTypes" text NOT NULL,
	"approvalLevels" text,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_delegations_uk_delegation_code" UNIQUE("delegationCode")
);
--> statement-breakpoint
CREATE TABLE "approval_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"documentId" integer NOT NULL,
	"documentCode" varchar(50) NOT NULL,
	"processId" integer NOT NULL,
	"approvalLevel" integer NOT NULL,
	"approvedBy" integer NOT NULL,
	"approvedByName" varchar(100),
	"approvedByRole" varchar(100),
	"action" varchar(50) NOT NULL,
	"actionReason" text,
	"comments" text,
	"actionTime" timestamp DEFAULT now() NOT NULL,
	"nextApprover" integer,
	"nextApproverName" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"roleId" integer NOT NULL,
	"roleName" varchar(100) NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"approvalLevel" integer NOT NULL,
	"maxApprovalAmount" integer,
	"scope" varchar(50) DEFAULT 'department' NOT NULL,
	"applicableDepartments" text,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_permissions_uk_role_document" UNIQUE("roleId","documentType")
);
--> statement-breakpoint
CREATE TABLE "approval_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processCode" varchar(50) NOT NULL,
	"processName" varchar(100) NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"description" text,
	"processDefinition" text NOT NULL,
	"approvalLevels" integer NOT NULL,
	"levelDefinition" text NOT NULL,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"version" integer DEFAULT 1,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_processes_uk_process_code" UNIQUE("processCode")
);
--> statement-breakpoint
CREATE TABLE "approval_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruleCode" varchar(50) NOT NULL,
	"ruleName" varchar(100) NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"condition" text NOT NULL,
	"action" text NOT NULL,
	"priority" integer DEFAULT 0,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_rules_uk_rule_code" UNIQUE("ruleCode")
);
--> statement-breakpoint
CREATE TABLE "approval_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"statisticDate" timestamp DEFAULT now() NOT NULL,
	"pendingTasksCount" integer DEFAULT 0,
	"overdueTasksCount" integer DEFAULT 0,
	"averageApprovalTime" integer,
	"rejectionRate" integer,
	"approverCount" integer DEFAULT 0,
	"topApprover" varchar(100),
	"documentTypeStats" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskCode" varchar(50) NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"documentId" integer NOT NULL,
	"documentCode" varchar(50) NOT NULL,
	"processId" integer NOT NULL,
	"currentLevel" integer NOT NULL,
	"totalLevels" integer NOT NULL,
	"assignedTo" integer NOT NULL,
	"assignedToName" varchar(100),
	"assignedToRole" varchar(100),
	"documentTitle" varchar(200),
	"documentAmount" integer,
	"submittedBy" integer NOT NULL,
	"submittedByName" varchar(100),
	"submittedAt" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"approvalNotes" text,
	"approvalTime" timestamp,
	"dueDate" timestamp,
	"isOverdue" varchar(50) DEFAULT 'no',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_tasks_uk_task_code" UNIQUE("taskCode")
);
--> statement-breakpoint
CREATE TABLE "bom_cost_rollups" (
	"id" serial PRIMARY KEY NOT NULL,
	"bomMasterId" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"costType" varchar(50) DEFAULT 'standard' NOT NULL,
	"calculatedAt" timestamp NOT NULL,
	"materialCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"purchaseCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"laborCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"overheadCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"outsourceCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"totalCost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"costBreakdown" json,
	"currency" varchar(3) DEFAULT 'CNY',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bomMasterId" integer NOT NULL,
	"parentItemId" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200) NOT NULL,
	"materialSpec" varchar(200),
	"quantity" numeric(10, 4) NOT NULL,
	"unit" varchar(20) DEFAULT '个' NOT NULL,
	"scrapRate" numeric(5, 2) DEFAULT '0.00',
	"isCritical" boolean DEFAULT false,
	"sourceType" varchar(50) DEFAULT 'purchase' NOT NULL,
	"processCode" varchar(20),
	"leadTimeDays" integer DEFAULT 0,
	"substituteCode" varchar(50),
	"substituteRatio" numeric(5, 2),
	"unitCost" numeric(10, 2) DEFAULT '0.00',
	"extendedCost" numeric(12, 2) DEFAULT '0.00',
	"preferredSupplierId" integer,
	"erpItemId" varchar(50),
	"remarks" text,
	"effectiveFrom" timestamp,
	"effectiveTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"productCode" varchar(50) NOT NULL,
	"productName" varchar(200) NOT NULL,
	"bomType" varchar(50) DEFAULT 'manufacturing' NOT NULL,
	"currentVersion" varchar(20) DEFAULT '1.0' NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"buCode" varchar(50),
	"productCategory" varchar(50),
	"maxLevel" integer DEFAULT 1,
	"standardQty" numeric(10, 2) DEFAULT '1.00',
	"standardUnit" varchar(20) DEFAULT '台',
	"totalMaterialCost" numeric(12, 2) DEFAULT '0.00',
	"totalLaborCost" numeric(12, 2) DEFAULT '0.00',
	"totalOverheadCost" numeric(12, 2) DEFAULT '0.00',
	"erpBomId" varchar(50),
	"erpSyncStatus" varchar(50) DEFAULT 'not_synced',
	"erpLastSyncAt" timestamp,
	"createdBy" integer,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"description" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bom_masters_uk_product_version" UNIQUE("productCode","currentVersion")
);
--> statement-breakpoint
CREATE TABLE "bom_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bomMasterId" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"changeType" varchar(50) NOT NULL,
	"ecnNumber" varchar(50),
	"changeReason" text,
	"changeDescription" text,
	"changeDetails" json,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"effectiveDate" timestamp,
	"expiryDate" timestamp,
	"requestedBy" integer,
	"reviewedBy" integer,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"bomSnapshot" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bom_versions_uk_bom_version" UNIQUE("bomMasterId","version")
);
--> statement-breakpoint
CREATE TABLE "contract_ai_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"contract_id" integer NOT NULL,
	"analysis_type" varchar(50) DEFAULT 'full',
	"extracted_requirements" json,
	"module_mapping" json,
	"raw_response" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"applied_by" integer,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"file_path" text NOT NULL,
	"doc_type" varchar(30) DEFAULT 'other' NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_code" varchar(50) NOT NULL,
	"customer_id" integer,
	"opportunity_id" integer,
	"title" varchar(300) NOT NULL,
	"type" varchar(30) DEFAULT 'sales' NOT NULL,
	"amount" numeric(15, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"sign_date" varchar(20),
	"start_date" varchar(20),
	"end_date" varchar(20),
	"terms" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_contract_code_unique" UNIQUE("contract_code")
);
--> statement-breakpoint
CREATE TABLE "customer_comm_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_code" varchar(50) NOT NULL,
	"ticket_id" integer,
	"customer_name" varchar(200) NOT NULL,
	"comm_type" varchar(30) DEFAULT 'email' NOT NULL,
	"subject" varchar(300) NOT NULL,
	"content" text,
	"summary" text,
	"participants" json,
	"comm_date" timestamp NOT NULL,
	"duration" integer,
	"action_items" text,
	"next_follow_up_date" varchar(20),
	"created_by" integer NOT NULL,
	"created_by_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ccr_uk_record_code" UNIQUE("record_code")
);
--> statement-breakpoint
CREATE TABLE "customer_requirement_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"customer_name" varchar(200) NOT NULL,
	"customer_contact" varchar(100),
	"source" varchar(50) DEFAULT 'internal' NOT NULL,
	"category" varchar(50) DEFAULT 'requirement' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(30) DEFAULT 'submitted' NOT NULL,
	"assignee_id" integer,
	"assignee_name" varchar(100),
	"due_date" varchar(20),
	"estimated_hours" numeric(6, 2),
	"actual_hours" numeric(6, 2),
	"resolution" text,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"rated_at" timestamp,
	"created_by" integer NOT NULL,
	"created_by_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "crt_uk_ticket_code" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "expiry_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruleName" varchar(100) NOT NULL,
	"materialCode" varchar(50),
	"materialCategory" varchar(50),
	"warningDays" integer DEFAULT 30 NOT NULL,
	"criticalDays" integer DEFAULT 7 NOT NULL,
	"notifyRoles" json,
	"notifyUsers" json,
	"notifyChannel" varchar(50) DEFAULT 'system',
	"autoQuarantine" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"lotNumber" varchar(50) NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200),
	"initialQty" numeric(10, 2) NOT NULL,
	"currentQty" numeric(10, 2) NOT NULL,
	"reservedQty" numeric(10, 2) DEFAULT '0.00',
	"unit" varchar(20) DEFAULT '个' NOT NULL,
	"sourceType" varchar(50) NOT NULL,
	"sourcePOCode" varchar(30),
	"sourceWorkOrder" varchar(30),
	"supplierLotNumber" varchar(50),
	"supplierId" integer,
	"supplierName" varchar(200),
	"warehouseId" integer,
	"locationId" integer,
	"locationCode" varchar(30),
	"productionDate" timestamp,
	"receivedDate" timestamp,
	"expiryDate" timestamp,
	"warrantyDate" timestamp,
	"qcStatus" varchar(50) DEFAULT 'pending',
	"qcReportId" integer,
	"qcCertificateNumber" varchar(50),
	"status" varchar(50) DEFAULT 'available' NOT NULL,
	"unitCost" numeric(10, 2),
	"totalCost" numeric(12, 2),
	"erpLotId" varchar(50),
	"erpSyncStatus" varchar(50) DEFAULT 'not_synced',
	"traceAttributes" json,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_lots_uk_lot_number" UNIQUE("lotNumber")
);
--> statement-breakpoint
CREATE TABLE "lot_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"lotId" integer NOT NULL,
	"lotNumber" varchar(50) NOT NULL,
	"allocationType" varchar(50) NOT NULL,
	"targetDocType" varchar(20),
	"targetDocId" integer,
	"targetDocCode" varchar(30),
	"processInstanceId" integer,
	"processCode" varchar(20),
	"allocatedQty" numeric(10, 2) NOT NULL,
	"usedQty" numeric(10, 2) DEFAULT '0.00',
	"returnedQty" numeric(10, 2) DEFAULT '0.00',
	"scrapQty" numeric(10, 2) DEFAULT '0.00',
	"status" varchar(50) DEFAULT 'allocated' NOT NULL,
	"allocatedBy" integer,
	"allocatedByName" varchar(50),
	"allocatedAt" timestamp,
	"completedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serial_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"serialNumber" varchar(100) NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200),
	"lotId" integer,
	"lotNumber" varchar(50),
	"warehouseId" integer,
	"locationId" integer,
	"status" varchar(50) DEFAULT 'in_stock' NOT NULL,
	"currentProjectCode" varchar(50),
	"currentProcessCode" varchar(20),
	"currentHolderId" integer,
	"purchaseOrderCode" varchar(30),
	"supplierId" integer,
	"receivedDate" timestamp,
	"warrantyExpiry" timestamp,
	"lifecycleEvents" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "serial_numbers_uk_serial_number" UNIQUE("serialNumber")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"warehouseId" integer,
	"locationCode" varchar(50),
	"quantityOnHand" integer DEFAULT 0,
	"quantityReserved" integer DEFAULT 0,
	"quantityAvailable" integer DEFAULT 0,
	"quantityInTransit" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'good' NOT NULL,
	"lastCountDate" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_uk_material_warehouse" UNIQUE("materialId","warehouseId")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"transactionType" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"warehouseFromId" integer,
	"warehouseToId" integer,
	"referenceDocumentType" varchar(50),
	"referenceDocumentId" integer,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoryCode" varchar(10) NOT NULL,
	"categoryName" varchar(100) NOT NULL,
	"parentCategoryCode" varchar(10),
	"description" text,
	"level" integer NOT NULL,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_categories_uk_category_code" UNIQUE("categoryCode")
);
--> statement-breakpoint
CREATE TABLE "material_change_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"changeType" varchar(50) NOT NULL,
	"fieldName" varchar(100),
	"oldValue" text,
	"newValue" text,
	"reason" text,
	"changedBy" integer NOT NULL,
	"changedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_coding_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(20) NOT NULL,
	"description" text,
	"ruleDefinition" text NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"expiryDate" timestamp,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"changes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_coding_rules_uk_version" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "material_import_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"importBatchId" varchar(50) NOT NULL,
	"sourceSystem" varchar(50) NOT NULL,
	"totalRecords" integer NOT NULL,
	"successRecords" integer DEFAULT 0,
	"failedRecords" integer DEFAULT 0,
	"importData" text,
	"errorLog" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"importedBy" integer NOT NULL,
	"importedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "material_specifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"specCode" varchar(20) NOT NULL,
	"specName" varchar(100) NOT NULL,
	"specType" varchar(50) NOT NULL,
	"specValue" varchar(100) NOT NULL,
	"unit" varchar(20),
	"description" text,
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_specifications_uk_spec_code" UNIQUE("specCode")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200) NOT NULL,
	"categoryCode" varchar(10) NOT NULL,
	"subcategoryCode" varchar(10),
	"specificationCode" varchar(20),
	"description" text,
	"materialType" varchar(50) NOT NULL,
	"manufacturer" varchar(100),
	"manufacturerCode" varchar(50),
	"standardCost" numeric(12, 2),
	"lastPurchasePrice" numeric(12, 2),
	"lastPurchaseDate" timestamp,
	"minStockLevel" integer DEFAULT 0,
	"maxStockLevel" integer DEFAULT 0,
	"safetyStockLevel" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"isApproved" varchar(50) DEFAULT 'no' NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"version" integer DEFAULT 1,
	"effectiveDate" timestamp DEFAULT now() NOT NULL,
	"expiryDate" timestamp,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "materials_uk_material_code" UNIQUE("materialCode")
);
--> statement-breakpoint
CREATE TABLE "supplier_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"materialId" integer NOT NULL,
	"supplierMaterialCode" varchar(50) NOT NULL,
	"supplierMaterialName" varchar(200),
	"unitPrice" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CNY',
	"minimumOrderQuantity" integer DEFAULT 1,
	"leadTimeDays" integer,
	"qualityGrade" varchar(50) DEFAULT 'A',
	"certifications" text,
	"isPreferred" varchar(50) DEFAULT 'no',
	"isActive" varchar(50) DEFAULT 'yes' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_materials_uk_supplier_material" UNIQUE("supplierId","materialId")
);
--> statement-breakpoint
CREATE TABLE "grt_menu_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"menu_item_id" integer NOT NULL,
	"menu_code" varchar(128),
	"menu_path" varchar(256),
	"access_count" integer DEFAULT 1,
	"last_access_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_menu_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(128) NOT NULL,
	"config_value" json NOT NULL,
	"description" text,
	"config_type" varchar(64),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_menu_configs_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "grt_menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"icon" varchar(64),
	"path" varchar(256),
	"parent_id" integer,
	"level" integer DEFAULT 1,
	"order" integer DEFAULT 0,
	"menu_type" varchar(32) DEFAULT 'link',
	"required_permission" varchar(128),
	"required_role" varchar(128),
	"required_certificate" varchar(128),
	"visible_roles" json,
	"hidden_roles" json,
	"i18n_key" varchar(256),
	"description_i18n_key" varchar(256),
	"badge" varchar(64),
	"badge_color" varchar(32),
	"is_external" boolean DEFAULT false,
	"open_in_new_tab" boolean DEFAULT false,
	"divider" boolean DEFAULT false,
	"collapsible" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"is_visible" boolean DEFAULT true,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_menu_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "grt_menu_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"permission_type" varchar(32) DEFAULT 'required',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_menu_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"is_visible" boolean DEFAULT true,
	"can_access" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_menu_search_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"menu_code" varchar(128) NOT NULL,
	"search_text" text,
	"keywords" json,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_user_menu_customization" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"menu_item_id" integer NOT NULL,
	"is_hidden" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"custom_name" varchar(128),
	"custom_icon" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_data_scopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_type" varchar(50) NOT NULL,
	"user_id" varchar(64),
	"role_id" integer,
	"department_id" varchar(64),
	"allowed_departments" json,
	"allowed_teams" json,
	"allowed_projects" json,
	"allowed_customers" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_permission_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" varchar(64) NOT NULL,
	"operator_name" varchar(128),
	"action" varchar(64) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"target_user_id" varchar(64),
	"target_role_id" integer,
	"target_permission_id" integer,
	"details" json,
	"result" varchar(50) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_permission_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"blacklist_type" varchar(50) NOT NULL,
	"blacklist_value" varchar(256) NOT NULL,
	"reason" text,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_permission_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(128) NOT NULL,
	"config_value" json NOT NULL,
	"description" text,
	"config_type" varchar(64),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_permission_configs_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "grt_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"category" varchar(64) NOT NULL,
	"module" varchar(64) NOT NULL,
	"action" varchar(50) NOT NULL,
	"level" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "grt_qualification_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"certificate_code" varchar(128) NOT NULL,
	"certificate_name" varchar(256) NOT NULL,
	"certificate_level" varchar(32),
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"issuing_organization" varchar(256),
	"description" text,
	"certificate_number" varchar(128),
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "grt_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"description" text,
	"role_type" varchar(50) DEFAULT 'custom',
	"default_data_scope" varchar(50) DEFAULT 'self',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grt_temporary_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"permission_id" integer,
	"role_id" integer,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text,
	"approved_by" varchar(64),
	"approval_date" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(64),
	"department_id" varchar(64),
	"data_scope" varchar(50) DEFAULT 'self',
	"permission_tags" json,
	"is_active" boolean DEFAULT true,
	"is_locked" boolean DEFAULT false,
	"qualification_certificates" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"locked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "grt_user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"role_id" integer NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceNumber" varchar(50) NOT NULL,
	"invoiceDate" timestamp NOT NULL,
	"purchaseOrderId" integer NOT NULL,
	"poNumber" varchar(50) NOT NULL,
	"supplierId" integer NOT NULL,
	"supplierName" varchar(200) NOT NULL,
	"invoiceAmount" numeric(12, 2) NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0.00',
	"totalAmount" numeric(12, 2) NOT NULL,
	"paymentStatus" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"dueDate" timestamp,
	"paidAmount" numeric(12, 2) DEFAULT '0.00',
	"paidDate" timestamp,
	"notes" text,
	"attachments" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_invoices_uk_invoice_number" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"poNumber" varchar(50) NOT NULL,
	"poDate" timestamp DEFAULT now() NOT NULL,
	"supplierId" integer NOT NULL,
	"supplierCode" varchar(50) NOT NULL,
	"supplierName" varchar(200) NOT NULL,
	"materialId" integer NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"deliveryAddress" text,
	"expectedDeliveryDate" timestamp NOT NULL,
	"actualDeliveryDate" timestamp,
	"paymentTerms" varchar(100),
	"paymentStatus" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"purchaseRequestId" integer,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_uk_po_number" UNIQUE("poNumber")
);
--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiptNumber" varchar(50) NOT NULL,
	"receiptDate" timestamp DEFAULT now() NOT NULL,
	"purchaseOrderId" integer NOT NULL,
	"poNumber" varchar(50) NOT NULL,
	"receivedQuantity" integer NOT NULL,
	"receivedBy" integer NOT NULL,
	"warehouseId" integer,
	"locationCode" varchar(50),
	"qualityStatus" varchar(50) DEFAULT 'passed' NOT NULL,
	"defectiveQuantity" integer DEFAULT 0,
	"qualityNotes" text,
	"inspectedBy" integer,
	"inspectedAt" timestamp,
	"notes" text,
	"attachments" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_receipts_uk_receipt_number" UNIQUE("receiptNumber")
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestCode" varchar(50) NOT NULL,
	"requestDate" timestamp DEFAULT now() NOT NULL,
	"department" varchar(100) NOT NULL,
	"requestedBy" integer NOT NULL,
	"requiredDate" timestamp NOT NULL,
	"materialId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"estimatedUnitPrice" numeric(12, 2),
	"estimatedTotalAmount" numeric(12, 2),
	"purpose" text,
	"notes" text,
	"attachments" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_requests_uk_request_code" UNIQUE("requestCode")
);
--> statement-breakpoint
CREATE TABLE "purchase_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"statisticDate" timestamp DEFAULT now() NOT NULL,
	"totalPOAmount" numeric(12, 2) DEFAULT '0.00',
	"totalPOCount" integer DEFAULT 0,
	"averagePOAmount" numeric(12, 2) DEFAULT '0.00',
	"activeSupplierCount" integer DEFAULT 0,
	"preferredSupplierCount" integer DEFAULT 0,
	"onTimeDeliveryRate" numeric(5, 2) DEFAULT '0.00',
	"qualityPassRate" numeric(5, 2) DEFAULT '0.00',
	"unpaidAmount" numeric(12, 2) DEFAULT '0.00',
	"overdueAmount" numeric(12, 2) DEFAULT '0.00',
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierCode" varchar(50) NOT NULL,
	"supplierName" varchar(200) NOT NULL,
	"supplierCategory" varchar(50) NOT NULL,
	"contactPerson" varchar(100),
	"contactPhone" varchar(20),
	"contactEmail" varchar(100),
	"country" varchar(50),
	"province" varchar(50),
	"city" varchar(50),
	"address" text,
	"postalCode" varchar(20),
	"registrationNumber" varchar(100),
	"taxId" varchar(100),
	"businessLicense" varchar(200),
	"qualityRating" varchar(50) DEFAULT 'C',
	"deliveryRating" varchar(50) DEFAULT 'C',
	"serviceRating" varchar(50) DEFAULT 'C',
	"overallRating" numeric(3, 2) DEFAULT '3.00',
	"paymentTerms" varchar(100),
	"creditLimit" numeric(12, 2),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"isPreferred" varchar(50) DEFAULT 'no',
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_uk_supplier_code" UNIQUE("supplierCode")
);
--> statement-breakpoint
CREATE TABLE "ai_sop_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"process_instance_id" integer,
	"sop_template_id" integer NOT NULL,
	"recommendation_reason" text,
	"match_score" numeric(5, 2),
	"context_factors" json,
	"is_accepted" boolean,
	"accepted_by" integer,
	"accepted_at" timestamp,
	"feedback" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_questionnaires" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionnaire_no" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"contact_person" varchar(100),
	"company" varchar(200),
	"email" varchar(200),
	"phone" varchar(50),
	"quote_type" varchar(50),
	"project_name" varchar(200),
	"part_name" varchar(200),
	"part_description" text,
	"part_drawing_url" varchar(500),
	"material_types" json,
	"material_other" varchar(200),
	"part_weight_min" numeric(10, 3),
	"part_weight_max" numeric(10, 3),
	"part_length_min" numeric(10, 2),
	"part_length_max" numeric(10, 2),
	"part_width_min" numeric(10, 2),
	"part_width_max" numeric(10, 2),
	"part_height_min" numeric(10, 2),
	"part_height_max" numeric(10, 2),
	"cleaning_product_type" varchar(50),
	"cleaning_product_other" varchar(200),
	"contamination_types" json,
	"contamination_other" varchar(200),
	"part_temp_before" numeric(5, 1),
	"part_temp_after" numeric(5, 1),
	"quality_control_methods" json,
	"drying_level" varchar(50),
	"cleanliness_standard" varchar(200),
	"daily_part_quantity" integer,
	"cycle_time_seconds" integer,
	"annual_volume" integer,
	"oee_target" numeric(5, 2),
	"shift_pattern" varchar(50),
	"loading_method" varchar(50),
	"loading_method_other" varchar(200),
	"available_space_length" numeric(10, 2),
	"available_space_width" numeric(10, 2),
	"available_space_height" numeric(10, 2),
	"noise_limit" integer,
	"investment_budget_min" numeric(15, 2),
	"investment_budget_max" numeric(15, 2),
	"budget_currency" varchar(10) DEFAULT 'CNY',
	"project_timeline" varchar(100),
	"expected_delivery_date" timestamp,
	"additional_requirements" text,
	"attachments" json,
	"customer_id" integer,
	"opportunity_id" integer,
	"assigned_sales_id" integer,
	"converted_project_id" integer,
	"ai_analysis" json,
	"ai_recommended_products" json,
	"ai_estimated_price" numeric(15, 2),
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_questionnaires_questionnaire_no_unique" UNIQUE("questionnaire_no")
);
--> statement-breakpoint
CREATE TABLE "m2_info_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"meeting_id" integer,
	"tag_category" varchar(50) NOT NULL,
	"tag_name" varchar(200) NOT NULL,
	"tag_value" text,
	"related_process_codes" json,
	"priority" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"source_text" text,
	"ai_confidence" numeric(5, 2),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" integer,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_zh" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"standard_duration_hours" numeric(10, 2),
	"required_capability_level" varchar(50),
	"sop_template_id" integer,
	"checklist_items" json,
	"risk_factors" json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "process_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "process_risk_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"process_instance_id" integer,
	"process_code" varchar(20),
	"risk_type" varchar(50) NOT NULL,
	"severity" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"suggested_actions" json,
	"historical_reference" json,
	"ai_analysis" text,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"mitigation_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_time_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_instance_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"work_date" timestamp NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_minutes" integer NOT NULL,
	"work_type" varchar(50) DEFAULT 'REGULAR' NOT NULL,
	"task_description" text,
	"is_auto_collected" boolean DEFAULT false NOT NULL,
	"device_id" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_process_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"work_order_id" integer,
	"process_definition_id" integer NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'NOT_STARTED' NOT NULL,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"planned_duration_hours" numeric(10, 2),
	"actual_duration_hours" numeric(10, 2),
	"assigned_user_id" integer,
	"assigned_team" varchar(100),
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"quality_score" numeric(5, 2),
	"notes" text,
	"blocker_description" text,
	"m2_tags" json,
	"ai_recommendations" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaire_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionnaire_id" integer NOT NULL,
	"version" integer NOT NULL,
	"changes" json,
	"changed_by" integer,
	"change_reason" text,
	"snapshot_data" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sop_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"process_code" varchar(20),
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"category" varchar(100),
	"applicable_products" json,
	"steps" json,
	"required_tools" json,
	"safety_precautions" json,
	"quality_checkpoints" json,
	"estimated_duration_minutes" integer,
	"difficulty_level" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sop_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "grt_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_pass_id" integer NOT NULL,
	"request_id" integer NOT NULL,
	"access_type" varchar(50) NOT NULL,
	"area" varchar(256),
	"location" varchar(256),
	"operator_id" varchar(64),
	"operator_name" varchar(128),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "after_sales_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"tier" varchar DEFAULT 'Standard' NOT NULL,
	"contact_person" varchar(100),
	"contact_phone" varchar(50),
	"contact_email" varchar(100),
	"address" text,
	"industry" varchar(100),
	"region" varchar(100),
	"contract_start_date" date,
	"contract_end_date" date,
	"slaLevel" varchar DEFAULT 'Silver',
	"response_time_hours" integer DEFAULT 24,
	"status" varchar DEFAULT 'Active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "after_sales_equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"model_name" varchar(200) NOT NULL,
	"client_id" integer NOT NULL,
	"equipment_type" varchar(100),
	"manufacturer" varchar(100),
	"installation_date" date,
	"warranty_end_date" date,
	"last_maintenance_date" date,
	"next_due_date" date,
	"maintenance_cycle_months" integer DEFAULT 6,
	"operationalStatus" varchar DEFAULT 'Running',
	"running_hours" integer DEFAULT 0,
	"location" varchar(200),
	"department" varchar(100),
	"technical_specs" text,
	"status" varchar DEFAULT 'Active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "after_sales_equipments_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "after_sales_service_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" varchar(50) NOT NULL,
	"client_id" integer,
	"equipment_id" integer NOT NULL,
	"serviceType" varchar NOT NULL,
	"priority" varchar DEFAULT 'Medium',
	"service_date" date,
	"issue_description" text,
	"issue_category" varchar(100),
	"resolution" text,
	"assigned_engineer_id" integer,
	"assigned_engineer_name" varchar(100),
	"engineer_name" varchar(100),
	"scheduled_date" date,
	"scheduled_time" time,
	"estimated_duration" integer,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"actual_duration" integer,
	"work_performed" text,
	"parts_used" text,
	"status" varchar DEFAULT 'Pending' NOT NULL,
	"completion_date" date,
	"resolution_notes" text,
	"signatureStatus" varchar DEFAULT 'pending',
	"signature_url" varchar(500),
	"signer_name" varchar(100),
	"signed_at" timestamp,
	"customer_signature" varchar(200),
	"customer_feedback" text,
	"satisfaction_rating" integer,
	"rating" integer,
	"feedback" text,
	"labor_cost" numeric(10, 2),
	"parts_cost" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "after_sales_service_logs_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "ai_agent_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_code" varchar(50) NOT NULL,
	"agentType" varchar NOT NULL,
	"triggerType" varchar DEFAULT 'Auto',
	"trigger_condition" text,
	"project_id" integer,
	"delivery_id" integer,
	"design_package_id" integer,
	"site_issue_id" integer,
	"input_data" text,
	"output_data" text,
	"prompt_used" text,
	"status" varchar DEFAULT 'Pending',
	"error_message" text,
	"execution_time_ms" integer,
	"tokens_used" integer,
	"result_applied" smallint DEFAULT 0,
	"result_applied_at" timestamp,
	"result_applied_by" integer,
	"executed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_agent_execution_logs_execution_code_unique" UNIQUE("execution_code")
);
--> statement-breakpoint
CREATE TABLE "ai_agent_trigger_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_id" integer NOT NULL,
	"execution_log_id" integer,
	"trigger_context" text,
	"trigger_source" varchar(100),
	"status" varchar DEFAULT 'Queued',
	"error_message" text,
	"notification_sent" smallint DEFAULT 0,
	"notification_sent_at" timestamp,
	"queued_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_agent_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"agentType" varchar NOT NULL,
	"triggerType" varchar NOT NULL,
	"trigger_conditions" text,
	"cron_expression" varchar(100),
	"trigger_on_stages" text,
	"trigger_on_events" text,
	"input_template" text,
	"auto_apply_result" smallint DEFAULT 0,
	"notify_on_success" smallint DEFAULT 1,
	"notify_on_failure" smallint DEFAULT 1,
	"notify_webhook_id" integer,
	"notify_recipients" text,
	"is_enabled" smallint DEFAULT 1 NOT NULL,
	"priority" integer DEFAULT 0,
	"execution_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"last_execution_status" varchar(20),
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_agent_triggers_trigger_code_unique" UNIQUE("trigger_code")
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistantId" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" "categoryEnum" DEFAULT 'business' NOT NULL,
	"systemPrompt" text,
	"modelConfig" text,
	"knowledgeBaseIds" text,
	"allowedRoles" text,
	"isEnabled" smallint DEFAULT 1 NOT NULL,
	"rateLimitPerMinute" integer DEFAULT 10,
	"maxContextLength" integer DEFAULT 4096,
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistantId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"sessionId" varchar(100) NOT NULL,
	"interactionType" "interactionTypeEnum" DEFAULT 'chat',
	"context" text,
	"userInput" text,
	"assistantResponse" text,
	"feedbackScore" integer,
	"feedbackComment" text,
	"learningExtracted" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistantId" varchar(64) NOT NULL,
	"userId" integer,
	"userName" varchar(100),
	"sessionId" varchar(64),
	"requestType" varchar(64) NOT NULL,
	"requestSummary" text,
	"responseSummary" text,
	"inputTokens" integer DEFAULT 0,
	"outputTokens" integer DEFAULT 0,
	"totalTokens" integer DEFAULT 0,
	"responseTimeMs" integer,
	"status" "statusEnum" DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"userRating" integer,
	"userFeedback" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(100) NOT NULL,
	"role" "roleEnum" NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"tokens" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(100) NOT NULL,
	"assistantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(200),
	"context" text,
	"messageCount" integer DEFAULT 0,
	"status" "statusEnum1" DEFAULT 'active',
	"lastMessageAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateCode" varchar(50) NOT NULL,
	"templateName" varchar(100) NOT NULL,
	"assistantType" "assistantTypeEnum" NOT NULL,
	"basePrompt" text,
	"capabilities" text,
	"knowledgeConfig" text,
	"toolsConfig" text,
	"description" text,
	"version" varchar(20) DEFAULT '1.0',
	"isActive" smallint DEFAULT 1,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"auditType" "auditTypeEnum" NOT NULL,
	"target_id" integer NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"checks" json,
	"anomaly_rate" numeric(5, 2),
	"recommendation" "recommendationEnum1" NOT NULL,
	"reviewer_id" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionId" integer NOT NULL,
	"format" "formatEnum" NOT NULL,
	"filePath" varchar(500),
	"status" "statusEnum2" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"role" "roleEnum" NOT NULL,
	"content" text NOT NULL,
	"contentType" "contentTypeEnum" DEFAULT 'text' NOT NULL,
	"metadata" text,
	"feedback" "feedbackEnum",
	"feedbackContent" text,
	"isBookmarked" smallint DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"assistantType" "assistantTypeEnum1" NOT NULL,
	"title" varchar(200),
	"status" "statusEnum1" DEFAULT 'active' NOT NULL,
	"projectId" integer,
	"customerId" integer,
	"metadata" text,
	"messageCount" integer DEFAULT 0 NOT NULL,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"assistantType" "assistantTypeEnum1" NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"category" varchar(50),
	"usageCount" integer DEFAULT 0 NOT NULL,
	"isPublic" smallint DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_draft_replies" (
	"id" bigint PRIMARY KEY NOT NULL,
	"message_id" bigint NOT NULL,
	"draft_content" text NOT NULL,
	"confidence_score" numeric(5, 2) DEFAULT '0.00',
	"model_used" varchar(50) DEFAULT 'gemini-pro',
	"prompt_template" varchar(100),
	"reviewStatus" varchar DEFAULT 'pending' NOT NULL,
	"reviewer_id" bigint,
	"reviewer_comment" text,
	"final_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"assistant_type" varchar(64) NOT NULL,
	"executionMode" "executionModeEnum" NOT NULL,
	"user_id" integer,
	"input_content" text,
	"output_content" text,
	"response_time_ms" integer,
	"token_usage" json,
	"is_adopted" smallint,
	"adoption_feedback" text,
	"effectiveness_score" numeric(3, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_execution_mode_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistant_type" varchar(64) NOT NULL,
	"defaultMode" "executionModeEnum" DEFAULT 'internal',
	"internal_prompt" text,
	"generative_prompt" text,
	"internal_knowledge_sources" json,
	"generative_model_config" json,
	"is_enabled" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_expense_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_claim_id" integer NOT NULL,
	"auditType" varchar DEFAULT 'initial',
	"audit_model" varchar(100),
	"input_data" text,
	"audit_result" text,
	"overall_score" integer,
	"riskLevel" varchar DEFAULT 'low',
	"anomalies" text,
	"recommendations" text,
	"comparison_with_trip_plan" text,
	"historical_comparison" text,
	"policy_violations" text,
	"duplicate_flags" text,
	"processing_time_ms" integer,
	"token_usage" integer,
	"requires_human_review" smallint DEFAULT 0,
	"human_reviewed_by" integer,
	"human_reviewed_at" timestamp,
	"human_review_result" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"meetingId" varchar(36) NOT NULL,
	"insightType" "insightTypeEnum" NOT NULL,
	"content" text NOT NULL,
	"confidenceScore" numeric(3, 2) DEFAULT '0.95',
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"generatedBy" varchar(50) DEFAULT 'gemini-1.5-pro'
);
--> statement-breakpoint
CREATE TABLE "ai_interview_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"candidateId" integer NOT NULL,
	"analysisTime" timestamp NOT NULL,
	"speechSegment" text,
	"speaker" "speakerEnum" DEFAULT 'unknown',
	"emotionDetected" "emotionDetectedEnum",
	"emotionConfidence" integer,
	"keywords" json,
	"technicalTerms" json,
	"answerQualityScore" integer,
	"aiSuggestion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge_bases" (
	"id" serial PRIMARY KEY NOT NULL,
	"knowledgeBaseId" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" "typeEnum" DEFAULT 'document' NOT NULL,
	"domain" varchar(64),
	"documentCount" integer DEFAULT 0,
	"vectorCount" integer DEFAULT 0,
	"lastUpdatedAt" timestamp,
	"isEnabled" smallint DEFAULT 1 NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_learning_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistantId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"learningSource" "learningSourceEnum" NOT NULL,
	"sourceReference" varchar(200),
	"learnedContent" text,
	"contentCategory" varchar(100),
	"confidenceScore" numeric(3, 2),
	"appliedCount" integer DEFAULT 0,
	"effectivenessScore" numeric(3, 2),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_notebook_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" bigint NOT NULL,
	"suggestionType" "suggestionTypeEnum" NOT NULL,
	"target_process_type" varchar(50),
	"target_process_id" varchar(100),
	"target_field" varchar(100),
	"current_value" text,
	"suggested_value" text,
	"confidence_score" numeric(3, 2),
	"extracted_keywords" json,
	"reasoning" text,
	"status" "statusEnum3" DEFAULT 'pending',
	"accepted_value" text,
	"accepted_by" bigint,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_process_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"processType" varchar(50) NOT NULL,
	"processId" varchar(100) NOT NULL,
	"stepCode" varchar(50) NOT NULL,
	"stepName" varchar(200),
	"suggestionMode" "suggestionModeEnum" NOT NULL,
	"suggestionSummary" text,
	"suggestionDetails" text,
	"suggestedActions" text,
	"references" text,
	"priority" "priorityEnum" DEFAULT 'medium',
	"estimatedTime" integer,
	"assistantId" integer,
	"assistantType" varchar(50),
	"isApplied" smallint DEFAULT 0 NOT NULL,
	"appliedAt" timestamp,
	"appliedBy" varchar(100),
	"applyResult" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_service_chat_history" (
	"id" bigint PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"user_id" bigint NOT NULL,
	"user_name" varchar(100),
	"serviceType" "serviceTypeEnum" NOT NULL,
	"role" "roleEnum" NOT NULL,
	"content" text NOT NULL,
	"context" json,
	"input_tokens" integer,
	"output_tokens" integer,
	"rating" integer,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_suggestion_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggestionId" integer NOT NULL,
	"actionId" varchar(100) NOT NULL,
	"actionName" varchar(200),
	"executedBy" varchar(100) NOT NULL,
	"status" "statusEnum4" DEFAULT 'pending' NOT NULL,
	"result" text,
	"errorMessage" text,
	"nextSuggestion" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"eventType" varchar(64) NOT NULL,
	"eventData" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_agendas" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "statusEnum39" DEFAULT 'draft' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_corporate_agenda" (
	"id" serial PRIMARY KEY NOT NULL,
	"agenda_code" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"milestone_id" varchar(50) NOT NULL,
	"milestone_name" varchar(100) NOT NULL,
	"milestone_name_en" varchar(100),
	"milestoneType" "milestoneTypeEnum" NOT NULL,
	"department" varchar(50) NOT NULL,
	"scheduled_date" date NOT NULL,
	"original_date" date,
	"is_shifted" smallint DEFAULT 0,
	"shift_reason" varchar(200),
	"status" "statusEnum76" DEFAULT 'pending' NOT NULL,
	"description" text,
	"description_en" text,
	"attendees" text,
	"location" varchar(200),
	"meeting_link" varchar(500),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"agenda_id" integer NOT NULL,
	"milestoneType" "milestoneTypeEnum" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"scheduled_date" date,
	"scheduled_time" varchar(10),
	"recurrence_rule" varchar(100),
	"is_recurring" smallint DEFAULT 0,
	"status" "statusEnum69" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_planning_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"versionName" varchar(200) NOT NULL,
	"status" "statusEnum5" DEFAULT 'draft' NOT NULL,
	"basedOnId" integer,
	"effectiveDate" timestamp,
	"archivedDate" timestamp,
	"creatorId" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_planning_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"configId" integer NOT NULL,
	"sourceItemId" integer NOT NULL,
	"targetItemId" integer NOT NULL,
	"dependencyType" varchar(20) DEFAULT 'finish_to_start',
	"lagDays" integer DEFAULT 0,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_planning_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"configId" integer NOT NULL,
	"category" "categoryEnum1" DEFAULT 'other' NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"tasks" text,
	"frequency" "frequencyEnum" DEFAULT 'once' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"weekNumber" integer,
	"month" integer,
	"responsibleUserId" integer,
	"responsibleUserName" varchar(100),
	"participantIds" text,
	"status" "statusEnum6" DEFAULT 'pending' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isTemplate" smallint DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_planning_update_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"configId" integer NOT NULL,
	"updateType" "updateTypeEnum" NOT NULL,
	"description" text,
	"beforeData" text,
	"afterData" text,
	"operatorId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"type" "typeEnum1" DEFAULT 'company' NOT NULL,
	"departmentId" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"revenueTarget" bigint,
	"profitTarget" bigint,
	"customerTarget" integer,
	"investmentBudget" bigint,
	"hiringBudget" integer,
	"trainingBudget" bigint,
	"keyInitiatives" text,
	"risksAndChallenges" text,
	"status" "statusEnum7" DEFAULT 'draft' NOT NULL,
	"creatorId" integer NOT NULL,
	"approverId" integer,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_approval_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" varchar(128) NOT NULL,
	"approver_role" varchar(128) NOT NULL,
	"approver_id" varchar(64),
	"approver_name" varchar(128),
	"approver_email" varchar(128),
	"status" varchar(50) DEFAULT 'pending',
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "asset_handover" (
	"id" serial PRIMARY KEY NOT NULL,
	"offboarding_id" integer NOT NULL,
	"assetCategory" "assetCategoryEnum" NOT NULL,
	"asset_name" varchar(200) NOT NULL,
	"asset_description" text,
	"asset_identifier" varchar(100),
	"handlingAction" "handlingActionEnum" NOT NULL,
	"transfer_to_id" integer,
	"transfer_to_name" varchar(100),
	"temporary_retain_until" date,
	"status" "statusEnum87" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"completed_by" integer,
	"verified_by" integer,
	"verified_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"resourceType" varchar(50),
	"resourceId" varchar(36),
	"details" json,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ipAddress" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "behavior_logs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_did" varchar(200),
	"user_id" bigint NOT NULL,
	"context" varchar(100) NOT NULL,
	"contextCategory" varchar DEFAULT 'other' NOT NULL,
	"action_type" varchar(100),
	"action_data" json,
	"implied_skill" varchar(200),
	"implied_skill_id" bigint,
	"confidence" numeric(5, 2),
	"duration" integer,
	"quality_score" numeric(5, 2),
	"project_id" bigint,
	"session_id" varchar(100),
	"device_info" json,
	"timestamp" timestamp NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bom_assembly_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"bomItemId" integer NOT NULL,
	"bomItemName" varchar(200),
	"bomLevel" integer DEFAULT 1,
	"assemblyType" "assemblyTypeEnum" NOT NULL,
	"workstation" varchar(50),
	"estimatedHours" numeric(6, 2),
	"actualHours" numeric(6, 2),
	"primaryAssigneeId" integer,
	"backupAssigneeId" integer,
	"supervisorId" integer,
	"selfCheck" smallint DEFAULT 0,
	"mutualCheck" smallint DEFAULT 0,
	"specialCheck" smallint DEFAULT 0,
	"assemblyInstruction" varchar(500),
	"qualityStandard" varchar(500),
	"safetyProcedure" varchar(500),
	"status" "statusEnum8" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bu_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"role" varchar(100),
	"department" varchar(100),
	"join_date" date,
	"leave_date" date,
	"status" "statusEnum90" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bu_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_id" integer NOT NULL,
	"kpi_code" varchar(50) NOT NULL,
	"kpi_name" varchar(255) NOT NULL,
	"dimension" varchar(50) NOT NULL,
	"unit" varchar(50),
	"fiscal_year" integer NOT NULL,
	"target_value" numeric(15, 2),
	"weight" numeric(5, 2),
	"excellent_threshold" numeric(15, 2),
	"good_threshold" numeric(15, 2),
	"acceptable_threshold" numeric(15, 2),
	"calculation_method" varchar(100),
	"calculation_formula" text,
	"data_source" varchar(255),
	"status" "statusEnum12" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bu_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_id" integer NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_quarter" integer,
	"revenue" numeric(15, 2),
	"revenue_target" numeric(15, 2),
	"revenue_achievement_rate" numeric(5, 2),
	"projects_completed" integer,
	"projects_on_time" integer,
	"delivery_on_time_rate" numeric(5, 2),
	"project_satisfaction" numeric(3, 2),
	"total_cost" numeric(15, 2),
	"cost_budget" numeric(15, 2),
	"cost_variance_rate" numeric(5, 2),
	"labor_cost" numeric(15, 2),
	"material_cost" numeric(15, 2),
	"defect_rate" numeric(5, 2),
	"rework_rate" numeric(5, 2),
	"quality_score" numeric(3, 2),
	"customer_complaint_count" integer,
	"customer_satisfaction" numeric(3, 2),
	"customer_retention_rate" numeric(5, 2),
	"new_customer_count" integer,
	"customer_lifetime_value" numeric(15, 2),
	"employee_count" integer,
	"employee_turnover_rate" numeric(5, 2),
	"training_hours_per_employee" numeric(8, 2),
	"employee_satisfaction" numeric(3, 2),
	"innovation_projects" integer,
	"patent_count" integer,
	"process_improvement_count" integer,
	"innovation_investment" numeric(15, 2),
	"overall_score" numeric(5, 2),
	"overall_rating" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bu_performance_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_id" integer NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_quarter" integer,
	"metric_name" varchar(255) NOT NULL,
	"old_value" numeric(15, 2),
	"new_value" numeric(15, 2),
	"change_reason" text,
	"changed_by" integer,
	"change_timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"manager_id" integer,
	"parent_bu_id" integer,
	"fiscal_year" integer,
	"status" "statusEnum89" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cad_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"modelId" varchar(50) NOT NULL,
	"modelName" varchar(200) NOT NULL,
	"modelType" varchar(50),
	"originalFormat" varchar(20),
	"originalFileUrl" varchar(500),
	"stepFileUrl" varchar(500),
	"gltfFileUrl" varchar(500),
	"urdfFileUrl" varchar(500),
	"assemblyTree" text,
	"features" text,
	"dimensions" text,
	"materials" text,
	"graspPoints" text,
	"assemblySequence" text,
	"equipmentModelId" integer,
	"bomHeaderId" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capability_evidences" (
	"id" bigint PRIMARY KEY NOT NULL,
	"evidence_id" varchar(64) NOT NULL,
	"user_id" bigint NOT NULL,
	"user_name" varchar(100),
	"evidenceType" "evidenceTypeEnum" NOT NULL,
	"capabilityDomain" "capabilityDomainEnum" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"project_id" varchar(64),
	"project_name" varchar(200),
	"equipment_model" varchar(100),
	"file_url" varchar(500),
	"file_key" varchar(200),
	"file_name" varchar(200),
	"file_type" varchar(50),
	"file_size" integer,
	"status" "statusEnum65" DEFAULT 'pending' NOT NULL,
	"reviewer_id" bigint,
	"reviewer_name" varchar(100),
	"review_comment" text,
	"reviewed_at" timestamp,
	"current_level" integer,
	"target_level" integer,
	"level_upgraded" boolean DEFAULT false,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"metadata" json,
	"tags" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "capability_evidences_evidence_id_unique" UNIQUE("evidence_id")
);
--> statement-breakpoint
CREATE TABLE "capability_proof_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_code" varchar(64) NOT NULL,
	"capability_name" varchar(200) NOT NULL,
	"capabilityCategory" "capabilityCategoryEnum" NOT NULL,
	"public_description" text,
	"public_evidence" text,
	"verification_rules" text,
	"required_data_sources" text,
	"zkp_enabled" smallint DEFAULT 1,
	"zkp_circuit_type" varchar(50),
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_development_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"currentRole" varchar(100) NOT NULL,
	"targetRole" varchar(100) NOT NULL,
	"pathType" "pathTypeEnum" DEFAULT 'vertical',
	"milestones" text,
	"requiredSkills" text,
	"requiredExperiences" text,
	"progressPercentage" integer DEFAULT 0,
	"estimatedTimeline" varchar(50),
	"mentorId" integer,
	"status" "statusEnum9" DEFAULT 'planning',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cert_audit_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"certification_id" integer NOT NULL,
	"auditType" "auditTypeEnum2" NOT NULL,
	"audit_date" date NOT NULL,
	"auditor" varchar(100),
	"audit_body" varchar(200),
	"result" "resultEnum2" DEFAULT 'pending' NOT NULL,
	"findings" text,
	"corrective_actions" text,
	"next_audit_date" date,
	"report_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cert_building_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"certification_id" integer,
	"certification_name" varchar(100) NOT NULL,
	"responsible_dept" varchar(100),
	"responsible_person" varchar(100),
	"budget" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"start_date" date,
	"target_date" date,
	"completed_date" date,
	"status" "statusEnum74" DEFAULT 'planned' NOT NULL,
	"progress" integer DEFAULT 0,
	"milestones" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cert_gap_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_code" varchar(50) NOT NULL,
	"target_customer" varchar(200),
	"analysis_date" date NOT NULL,
	"required_certs" text,
	"current_certs" text,
	"gap_certs" text,
	"gap_count" integer DEFAULT 0,
	"estimated_cost" numeric(10, 2),
	"estimated_time" integer,
	"recommendation" text,
	"status" "statusEnum75" DEFAULT 'draft' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"cert_code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"cert_number" varchar(100),
	"certType" "certTypeEnum" NOT NULL,
	"issuing_body" varchar(200),
	"issue_date" date,
	"expiry_date" date,
	"scope" text,
	"status" "statusEnum73" DEFAULT 'planned' NOT NULL,
	"file_url" varchar(500),
	"priority" "priorityEnum" DEFAULT 'medium' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"source_change_id" integer,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"affected_items" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" integer
);
--> statement-breakpoint
CREATE TABLE "change_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"execution_token" varchar(100) NOT NULL,
	"environment" "environmentEnum" NOT NULL,
	"actual_files" json,
	"actual_sql" json,
	"actual_commands" json,
	"consistencyCheckResult" "consistencyCheckResultEnum",
	"consistency_details" json,
	"status" "statusEnum63" DEFAULT 'started' NOT NULL,
	"executor_id" integer NOT NULL,
	"executor_name" varchar(100),
	"started_at" timestamp,
	"completed_at" timestamp,
	"result_summary" text,
	"error_message" text,
	"git_commit_before" varchar(50),
	"git_commit_after" varchar(50),
	"git_branch" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"execution_id" integer,
	"notificationType" "notificationTypeEnum1" NOT NULL,
	"recipient_id" integer NOT NULL,
	"recipient_name" varchar(100),
	"recipient_role" varchar(50),
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"priority" "priorityEnum4" DEFAULT 'normal' NOT NULL,
	"channel" "channelEnum2" DEFAULT 'system' NOT NULL,
	"sent_at" timestamp,
	"read_at" timestamp,
	"action_url" varchar(500),
	"action_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_no" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"changeType" "changeTypeEnum4" NOT NULL,
	"urgency" "urgencyEnum" DEFAULT 'normal' NOT NULL,
	"applicant_id" integer NOT NULL,
	"applicant_name" varchar(100),
	"applicantRole" "applicantRoleEnum" NOT NULL,
	"description" text NOT NULL,
	"technical_plan" text NOT NULL,
	"impact_analysis" text NOT NULL,
	"rollback_plan" text NOT NULL,
	"test_plan" text NOT NULL,
	"affected_modules" json,
	"expected_files" json,
	"expected_sql" json,
	"expected_commands" json,
	"planned_start_time" timestamp,
	"planned_end_time" timestamp,
	"status" "statusEnum62" DEFAULT 'draft' NOT NULL,
	"reviewer_id" integer,
	"reviewer_name" varchar(100),
	"review_time" timestamp,
	"review_comment" text,
	"approver_id" integer,
	"approver_name" varchar(100),
	"approval_time" timestamp,
	"approval_comment" text,
	"execution_token" varchar(100),
	"token_expires_at" timestamp,
	"targetEnvironment" "targetEnvironmentEnum" DEFAULT 'test' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"channelId" varchar(36) NOT NULL,
	"userId" integer NOT NULL,
	"role" "roleEnum6" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"organizationId" integer NOT NULL,
	"visibility" "visibilityEnum" DEFAULT 'private' NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_states" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"meetingId" varchar(36) NOT NULL,
	"documentId" varchar(36) NOT NULL,
	"state" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"platform" "platformEnum" DEFAULT 'wechat' NOT NULL,
	"nickname" varchar(100) NOT NULL,
	"avatar" varchar(500),
	"real_name" varchar(100),
	"phone" varchar(20),
	"company" varchar(200),
	"customer_id" integer,
	"role" "roleEnum4" DEFAULT 'guest' NOT NULL,
	"status" "statusEnum60" DEFAULT 'pending' NOT NULL,
	"verificationStatus" "verificationStatusEnum1" DEFAULT 'unverified' NOT NULL,
	"tags" text,
	"activityLevel" "activityLevelEnum" DEFAULT 'low',
	"tech_preferences" text,
	"message_count" integer DEFAULT 0,
	"question_count" integer DEFAULT 0,
	"last_active_at" timestamp,
	"joined_at" timestamp DEFAULT now(),
	"is_blacklisted" smallint DEFAULT 0,
	"blacklist_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"messageType" "messageTypeEnum" DEFAULT 'question' NOT NULL,
	"direction" "directionEnum" DEFAULT 'inbound' NOT NULL,
	"content" text NOT NULL,
	"contentType" "contentTypeEnum2" DEFAULT 'text' NOT NULL,
	"attachments" text,
	"approvalStatus" "supervisorApprovalEnum" DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"ai_draft_content" text,
	"ai_confidence" numeric(3, 2),
	"ai_suggestions" text,
	"sensitive_words_detected" text,
	"sensitive_check_passed" smallint DEFAULT 1,
	"publishStatus" "publishStatusEnum" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"reply_to_message_id" integer,
	"thread_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"stat_date" date NOT NULL,
	"statType" "statTypeEnum" DEFAULT 'daily' NOT NULL,
	"total_members" integer DEFAULT 0,
	"new_members" integer DEFAULT 0,
	"active_members" integer DEFAULT 0,
	"banned_members" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"inbound_messages" integer DEFAULT 0,
	"outbound_messages" integer DEFAULT 0,
	"questions_asked" integer DEFAULT 0,
	"questions_answered" integer DEFAULT 0,
	"content_pushed" integer DEFAULT 0,
	"content_views" integer DEFAULT 0,
	"content_likes" integer DEFAULT 0,
	"messages_approved" integer DEFAULT 0,
	"messages_rejected" integer DEFAULT 0,
	"sensitive_words_blocked" integer DEFAULT 0,
	"leads_generated" integer DEFAULT 0,
	"leads_converted" integer DEFAULT 0,
	"avg_response_time" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consistency_check_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"checkType" "checkTypeEnum" NOT NULL,
	"expected_value" text,
	"actual_value" text,
	"result" "resultEnum1" NOT NULL,
	"severity" "severityEnum3" DEFAULT 'info' NOT NULL,
	"details" json,
	"actionTaken" "actionTakenEnum" NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_library" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"contentType" "contentTypeEnum3" DEFAULT 'article' NOT NULL,
	"category" varchar(100),
	"tags" text,
	"sourceType" "sourceTypeEnum3" DEFAULT 'manual' NOT NULL,
	"source_id" varchar(100),
	"author_id" integer,
	"desensitizationStatus" "desensitizationStatusEnum" DEFAULT 'pending' NOT NULL,
	"desensitized_content" text,
	"sensitive_items_removed" text,
	"approvalStatus" "reviewStatusEnum" DEFAULT 'draft' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"scheduleType" "scheduleTypeEnum" DEFAULT 'immediate',
	"scheduled_at" timestamp,
	"recurring_rule" varchar(100),
	"pushStatus" "pushStatusEnum" DEFAULT 'unpublished' NOT NULL,
	"pushed_at" timestamp,
	"push_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"stat_date" date NOT NULL,
	"sessions_created" integer DEFAULT 0,
	"messages_count" integer DEFAULT 0,
	"user_messages_count" integer DEFAULT 0,
	"assistant_messages_count" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"average_latency" integer DEFAULT 0,
	"top_topics" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" varchar(64) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"model" varchar(50),
	"tokens" integer,
	"latency" integer,
	"context_data" text,
	"is_deleted" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "conversation_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"title" varchar(200) DEFAULT '新对话',
	"status" varchar DEFAULT 'active',
	"message_count" integer DEFAULT 0,
	"last_message" text,
	"topic" varchar(100),
	"tags" text,
	"summary" text,
	"context_data" text,
	"total_tokens" integer DEFAULT 0,
	"average_latency" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "conversation_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "cost_alert_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruleId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"alertLevel" "alertLevelEnum" NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"currentValue" bigint NOT NULL,
	"thresholdValue" bigint NOT NULL,
	"status" "statusEnum10" DEFAULT 'pending' NOT NULL,
	"handlerId" integer,
	"handleNote" text,
	"handledAt" timestamp,
	"isNotified" smallint DEFAULT 0 NOT NULL,
	"notifiedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_alert_rule_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"templateType" "templateTypeEnum" DEFAULT 'custom' NOT NULL,
	"category" "categoryEnum2" DEFAULT 'budget' NOT NULL,
	"ruleConfig" text NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_alert_rule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruleId" integer NOT NULL,
	"versionNumber" integer NOT NULL,
	"ruleData" text NOT NULL,
	"changeSummary" varchar(500),
	"changedBy" integer,
	"changedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"scope" "scopeEnum" DEFAULT 'all' NOT NULL,
	"projectId" integer,
	"categoryId" integer,
	"alertType" "alertTypeEnum" DEFAULT 'budget_percent' NOT NULL,
	"threshold" bigint NOT NULL,
	"alertLevel" "alertLevelEnum" DEFAULT 'warning' NOT NULL,
	"notifyType" "notifyTypeEnum" DEFAULT 'system' NOT NULL,
	"notifyUserIds" text,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"parentId" integer,
	"type" "typeEnum2" DEFAULT 'direct' NOT NULL,
	"description" text,
	"sortOrder" integer DEFAULT 0,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"estimateType" "estimateTypeEnum" DEFAULT 'rough' NOT NULL,
	"estimatedAmount" bigint NOT NULL,
	"lowEstimate" bigint,
	"highEstimate" bigint,
	"confidence" integer DEFAULT 80,
	"phaseCode" varchar(10),
	"basis" text,
	"assumptions" text,
	"estimatorId" integer,
	"estimatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"rateType" "rateTypeEnum" NOT NULL,
	"rateValue" numeric(10, 4) NOT NULL,
	"rateUnit" varchar(50) NOT NULL,
	"effectiveDate" date NOT NULL,
	"expiryDate" date,
	"notes" text,
	"isActive" smallint DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"costCode" varchar(50) NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" bigint NOT NULL,
	"costDate" timestamp NOT NULL,
	"vendor" varchar(200),
	"invoiceNo" varchar(100),
	"taskId" integer,
	"milestoneId" integer,
	"phaseCode" varchar(10),
	"status" "statusEnum11" DEFAULT 'pending' NOT NULL,
	"submitterId" integer,
	"reviewerId" integer,
	"reviewedAt" timestamp,
	"attachmentUrl" varchar(500),
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"hourly_rate" numeric(10, 2),
	"daily_rate" numeric(10, 2),
	"overtime_multiplier" numeric(4, 2) DEFAULT '1.50',
	"monthly_amount" numeric(14, 2),
	"allocation_base" varchar(50),
	"allocation_rate" numeric(10, 2),
	"allocation_unit" varchar(50),
	"markup_percent" numeric(6, 2),
	"min_markup" numeric(10, 2),
	"apply_to" varchar(50),
	"description" text,
	"effective_from" date,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_variance_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"periodType" "periodTypeEnum" DEFAULT 'monthly' NOT NULL,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"phaseCode" varchar(10),
	"plannedCost" bigint NOT NULL,
	"actualCost" bigint NOT NULL,
	"costVariance" bigint NOT NULL,
	"cpi" numeric(5, 2),
	"varianceReason" text,
	"correctiveAction" text,
	"analyzerId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "country_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"country_name_en" varchar(100) NOT NULL,
	"country_name_zh" varchar(100),
	"region" varchar NOT NULL,
	"timezone" varchar(50) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"visa_required" smallint DEFAULT 1,
	"visa_lead_time_days" integer DEFAULT 14,
	"health_requirements" text,
	"safetyRating" varchar DEFAULT 'low',
	"emergency_contacts" text,
	"local_holidays" text,
	"business_culture" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grt_country_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(8) NOT NULL,
	"country_name" varchar(128) NOT NULL,
	"region" varchar(128),
	"rule_version" varchar(32) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"approval_steps" json NOT NULL,
	"requires_background_check" boolean DEFAULT false,
	"requires_nda" boolean DEFAULT false,
	"requires_visa" boolean DEFAULT false,
	"default_access_level" varchar(50) DEFAULT 'public',
	"allow_factory_access" boolean DEFAULT false,
	"allow_production_floor" boolean DEFAULT false,
	"allow_lab_access" boolean DEFAULT false,
	"max_visit_duration" integer,
	"max_visitors_per_request" integer DEFAULT 10,
	"advance_notice_required" integer DEFAULT 3,
	"rules" json,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_country_rules_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE "crm_bant_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunityId" integer NOT NULL,
	"budgetScore" integer DEFAULT 1,
	"budgetNote" text,
	"authorityScore" integer DEFAULT 1,
	"authorityNote" text,
	"needScore" integer DEFAULT 1,
	"needNote" text,
	"timelineScore" integer DEFAULT 1,
	"timelineNote" text,
	"totalScore" integer DEFAULT 4,
	"aiSuggestion" text,
	"scorerId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"gender" "genderEnum" DEFAULT 'unknown',
	"position" varchar(100),
	"department" varchar(100),
	"mobile" varchar(20),
	"phone" varchar(50),
	"email" varchar(320),
	"wechat" varchar(100),
	"isKeyPerson" "isKeyPersonEnum" DEFAULT 'no',
	"decisionRole" "decisionRoleEnum",
	"birthday" timestamp,
	"hobbies" text,
	"remark" text,
	"status" "statusEnum12" DEFAULT 'active' NOT NULL,
	"jiandaoyunId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" varchar(100),
	"department" varchar(100),
	"mobile" varchar(50),
	"landline" varchar(50),
	"email" varchar(200),
	"wechat" varchar(100),
	"is_key_person" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerCode" varchar(32),
	"name" varchar(200) NOT NULL,
	"shortName" varchar(100),
	"type" "typeEnum3" DEFAULT 'prospect' NOT NULL,
	"source" varchar(100),
	"industry" varchar(100),
	"scale" "scaleEnum",
	"level" "levelEnum" DEFAULT 'C',
	"province" varchar(50),
	"city" varchar(50),
	"address" text,
	"website" varchar(255),
	"phone" varchar(50),
	"email" varchar(320),
	"creditCode" varchar(50),
	"legalPerson" varchar(100),
	"registeredCapital" varchar(50),
	"employeeCount" integer,
	"annualRevenue" integer,
	"status" "statusEnum13" DEFAULT 'active' NOT NULL,
	"ownerId" integer,
	"remark" text,
	"jiandaoyunId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_customers_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"short_name" varchar(100),
	"type" varchar(20) DEFAULT 'prospect' NOT NULL,
	"level" varchar(5) DEFAULT 'C',
	"industry" varchar(100),
	"region" varchar(100),
	"address" text,
	"website" varchar(300),
	"phone" varchar(50),
	"email" varchar(200),
	"tax_id" varchar(50),
	"annual_revenue" numeric(15, 2),
	"employee_count" integer,
	"source" varchar(50),
	"assigned_to" integer,
	"status" varchar(20) DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_customers_v2_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "crm_follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"relatedType" "relatedTypeEnum" NOT NULL,
	"relatedId" integer NOT NULL,
	"method" "methodEnum" DEFAULT 'phone' NOT NULL,
	"content" text NOT NULL,
	"result" text,
	"nextPlan" text,
	"nextPlanDate" timestamp,
	"followerId" integer,
	"followedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"opportunity_id" integer,
	"type" varchar(30) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"content" text,
	"sentiment" varchar(20) DEFAULT 'neutral',
	"is_complaint" boolean DEFAULT false,
	"complaint_severity" varchar(20),
	"resolution" text,
	"resolved_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(100),
	"contact_phone" varchar(50),
	"contact_email" varchar(200),
	"source" varchar(50),
	"product_interest" text,
	"estimated_budget" numeric(15, 2),
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(30) DEFAULT 'new',
	"ai_confidence_score" numeric(5, 4),
	"assigned_to" integer,
	"converted_customer_id" integer,
	"converted_opportunity_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunityCode" varchar(32),
	"name" varchar(200) NOT NULL,
	"customerId" integer NOT NULL,
	"contactId" integer,
	"source" varchar(100),
	"type" "typeEnum4" DEFAULT 'new_business',
	"expectedAmount" integer,
	"expectedCloseDate" timestamp,
	"stage" "stageEnum" DEFAULT 'lead' NOT NULL,
	"probability" integer DEFAULT 10,
	"competitors" text,
	"painPoints" text,
	"ourAdvantages" text,
	"nextAction" text,
	"nextActionDate" timestamp,
	"lostReason" text,
	"ownerId" integer,
	"remark" text,
	"jiandaoyunId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_opportunities_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"customer_id" integer NOT NULL,
	"contact_id" integer,
	"stage" varchar(30) DEFAULT 'qualification' NOT NULL,
	"expected_amount" numeric(15, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"probability" integer DEFAULT 20,
	"expected_close_date" date,
	"actual_close_date" date,
	"product_interest" text,
	"competitor_info" text,
	"lost_reason" text,
	"assigned_to" integer,
	"project_id" integer,
	"source" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"logId" varchar(50) NOT NULL,
	"portalUserId" varchar(50) NOT NULL,
	"action" varchar(100),
	"resourceType" varchar(50),
	"resourceId" varchar(50),
	"ipAddress" varchar(45),
	"userAgent" text,
	"requestData" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_ai_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"connectionId" varchar(50) NOT NULL,
	"customerId" integer NOT NULL,
	"connectionName" varchar(100),
	"apiEndpoint" varchar(500),
	"authType" varchar(20),
	"credentialsEncrypted" text,
	"syncEnabled" smallint DEFAULT 0,
	"syncIntervalMinutes" integer DEFAULT 60,
	"syncDataTypes" text,
	"status" "statusEnum14" DEFAULT 'inactive',
	"lastSyncAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_assistant_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"customer_id" integer NOT NULL,
	"authStatus" "authStatusEnum" DEFAULT 'unverified',
	"messageRole" "roleEnum" NOT NULL,
	"message_content" text NOT NULL,
	"attachments" json,
	"fault_diagnosis_result" json,
	"suggested_actions" json,
	"related_knowledge_ids" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_cert_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_name_en" varchar(200),
	"customerType" "customerTypeEnum" NOT NULL,
	"country" varchar(50),
	"region" varchar(50),
	"portal_url" varchar(500),
	"certification_id" integer,
	"cert_name" varchar(100) NOT NULL,
	"is_mandatory" smallint DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"communicationId" varchar(50) NOT NULL,
	"projectId" integer NOT NULL,
	"phaseCode" varchar(10),
	"communicationType" varchar(50),
	"subject" varchar(200),
	"summary" text,
	"actionItems" text,
	"customerContacts" text,
	"internalParticipants" text,
	"communicationDate" timestamp,
	"nextFollowUp" date,
	"aiSummary" text,
	"aiNextActions" text,
	"aiGeneratedAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"createdBy" integer
);
--> statement-breakpoint
CREATE TABLE "customer_credit_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"service_report_id" integer,
	"payment_timeliness" numeric(5, 2),
	"feedback_quality" numeric(5, 2),
	"cooperation_level" numeric(5, 2),
	"repeat_business_rate" numeric(5, 2),
	"previous_credit_score" numeric(5, 2),
	"new_credit_score" numeric(5, 2),
	"credit_score_change" numeric(5, 2),
	"tierChangeRecommendation" "tierChangeRecommendationEnum",
	"tier_change_applied" smallint DEFAULT 0,
	"effective_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_code" varchar(50),
	"name" varchar(300) NOT NULL,
	"name_en" varchar(300),
	"tier" varchar(50),
	"industry" varchar(100),
	"region" varchar(100),
	"country" varchar(100),
	"address" text,
	"primary_contact" varchar(200),
	"contact_phone" varchar(50),
	"contact_email" varchar(200),
	"source_crm_v1_id" integer,
	"source_crm_v2_id" integer,
	"source_customers_v2_id" integer,
	"source_after_sales_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_portal_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" varchar(50) NOT NULL,
	"customerId" integer NOT NULL,
	"accountType" "accountTypeEnum" DEFAULT 'standard',
	"companyName" varchar(200),
	"contactEmail" varchar(100),
	"status" "statusEnum15" DEFAULT 'active',
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_portal_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"portalUserId" varchar(50) NOT NULL,
	"accountId" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"name" varchar(100),
	"role" varchar(50),
	"passwordHash" varchar(255),
	"lastLogin" timestamp,
	"status" "statusEnum15" DEFAULT 'active',
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_code" varchar(50) NOT NULL,
	"scenario_name" varchar(200) NOT NULL,
	"description" text,
	"customer_requirements" text,
	"critical_metrics" text,
	"related_roles" text,
	"priority" integer DEFAULT 1,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_code" varchar(50) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customerType" "customerTypeEnum1" DEFAULT 'Other',
	"scenes" "scenesEnum" DEFAULT 'Other',
	"decision_weights" text,
	"key_contacts" text,
	"deliveryRisk" "deliveryRiskEnum" DEFAULT 'MEDIUM',
	"risk_solution" text,
	"jared_strategy" text,
	"address" text,
	"industry" varchar(100),
	"annual_revenue" varchar(50),
	"employee_count" varchar(50),
	"customerLevel" "customerLevelEnum" DEFAULT 'C',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "da_permission_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"assistant_id" varchar(64) NOT NULL,
	"required_certificates" text,
	"granted_permissions" text,
	"restricted_features" text,
	"last_verified_at" timestamp,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"widget_code" varchar(50) NOT NULL,
	"widget_name" varchar(100) NOT NULL,
	"widget_name_en" varchar(100),
	"widgetType" "widgetTypeEnum" NOT NULL,
	"data_source" varchar(200),
	"default_config" json,
	"supported_roles" text,
	"default_width" integer DEFAULT 4,
	"default_height" integer DEFAULT 2,
	"resizable" smallint DEFAULT 1,
	"is_enabled" smallint DEFAULT 1,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_privacy_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_code" varchar(50) NOT NULL,
	"config_name" varchar(200) NOT NULL,
	"dataCategory" "dataCategoryEnum" NOT NULL,
	"sensitivityLevel" "sensitivityLevelEnum" NOT NULL,
	"deploymentRequirement" "deploymentRequirementEnum" DEFAULT 'any',
	"encryption_required" smallint DEFAULT 1,
	"encryption_method" varchar(50),
	"deidentification_rules" text,
	"audit_required" smallint DEFAULT 1,
	"retention_days" integer DEFAULT 365,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deidentification_proxy_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"user_id" integer NOT NULL,
	"assistant_id" varchar(64) NOT NULL,
	"original_data_hash" varchar(64),
	"deidentified_data_hash" varchar(64),
	"rules_applied" text,
	"llm_endpoint" varchar(200),
	"request_size_bytes" integer,
	"response_size_bytes" integer,
	"sensitive_data_detected" smallint DEFAULT 0,
	"blocked" smallint DEFAULT 0,
	"block_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_code" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"project_no" varchar(50),
	"customer_id" integer,
	"customer_name" varchar(200),
	"currentStage" varchar DEFAULT 'M7_Pre_Acceptance' NOT NULL,
	"planned_m7_date" timestamp,
	"planned_m8_date" timestamp,
	"planned_m9_date" timestamp,
	"actual_m7_date" timestamp,
	"actual_m8_date" timestamp,
	"actual_m9_date" timestamp,
	"m7GateResult" varchar,
	"m7_gate_notes" text,
	"m9AcceptanceResult" varchar,
	"m9_acceptance_notes" text,
	"site_address" text,
	"site_contact_name" varchar(100),
	"site_contact_phone" varchar(20),
	"special_requirements" text,
	"shipping_cleanliness_report" text,
	"shippingCleanlinessStatus" varchar DEFAULT 'Pending',
	"cycle_time_actual" numeric(10, 2),
	"cycle_time_target" numeric(10, 2),
	"cycle_time_variance" numeric(5, 2),
	"cycleTimeStatus" varchar DEFAULT 'Pending',
	"plc_data_log" text,
	"plcDataStatus" varchar DEFAULT 'Normal',
	"site_engineer_id" integer,
	"site_engineer_name" varchar(100),
	"site_engineer_phone" varchar(20),
	"customer_signoff" text,
	"customer_signoff_name" varchar(100),
	"customer_signoff_date" timestamp,
	"customer_signoff_notes" text,
	"status" varchar DEFAULT 'Pending',
	"block_reason" text,
	"ai_gatekeeper_result" text,
	"ai_gatekeeper_checked_at" timestamp,
	"m7_start_date" timestamp,
	"m7_completed_date" timestamp,
	"m8_start_date" timestamp,
	"m8_completed_date" timestamp,
	"m9_start_date" timestamp,
	"m9_completed_date" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_executions_delivery_code_unique" UNIQUE("delivery_code")
);
--> statement-breakpoint
CREATE TABLE "department_agendas" (
	"id" serial PRIMARY KEY NOT NULL,
	"agenda_id" integer NOT NULL,
	"department_code" varchar(50) NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"milestone_id" integer NOT NULL,
	"adjusted_date" date,
	"adjusted_time" varchar(10),
	"adjustment_reason" varchar(200),
	"status" "statusEnum70" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_permission_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" varchar(50) NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"parent_department_id" varchar(50),
	"default_role_id" varchar(50),
	"allowed_modules" text,
	"restricted_modules" text,
	"dataScope" "dataScopeEnum" DEFAULT 'department',
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deployment_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_name" varchar(100) NOT NULL,
	"environment" "environmentEnum" NOT NULL,
	"deploymentType" "deploymentTypeEnum1" NOT NULL,
	"config_data" json NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_deployed_at" timestamp,
	"deployed_version" varchar(50),
	"healthStatus" "healthStatusEnum1" DEFAULT 'unknown' NOT NULL,
	"last_health_check_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_code" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"project_no" varchar(50),
	"urs_doc" text,
	"urs_version" varchar(20),
	"urs_uploaded_at" timestamp,
	"ursStatus" varchar DEFAULT 'Draft',
	"risk_assessment_ai" text,
	"riskLevel" varchar DEFAULT 'Medium',
	"risk_assessment_generated_at" timestamp,
	"mechanicalBomStatus" varchar DEFAULT 'Draft',
	"mechanical_bom_id" integer,
	"mechanical_bom_frozen_at" timestamp,
	"mechanical_bom_frozen_by" integer,
	"electrical_io_list" text,
	"electrical_io_version" varchar(20),
	"electricalIoStatus" varchar DEFAULT 'Draft',
	"alarm_list" text,
	"alarm_list_version" varchar(20),
	"alarm_list_updated_at" timestamp,
	"generated_manuals_ids" text,
	"troubleshooting_guide" text,
	"maintenance_sop" text,
	"ai_doc_generated_at" timestamp,
	"designReviewStatus" varchar DEFAULT 'Pending',
	"design_review_notes" text,
	"special_requirements" text,
	"customer_standards" text,
	"similar_project_ids" text,
	"historical_lessons" text,
	"design_lead_id" integer,
	"design_lead_name" varchar(100),
	"mechanical_engineer_id" integer,
	"electrical_engineer_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "design_packages_package_code_unique" UNIQUE("package_code")
);
--> statement-breakpoint
CREATE TABLE "dev_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskCode" varchar(32),
	"title" varchar(200) NOT NULL,
	"description" text,
	"version" varchar(20) NOT NULL,
	"module" varchar(50) NOT NULL,
	"type" "typeEnum5" DEFAULT 'feature' NOT NULL,
	"priority" "priorityEnum1" DEFAULT 'medium' NOT NULL,
	"status" "statusEnum16" DEFAULT 'backlog' NOT NULL,
	"estimatedHours" integer,
	"actualHours" integer,
	"assigneeId" integer,
	"startDate" timestamp,
	"dueDate" timestamp,
	"completedDate" timestamp,
	"attachments" text,
	"claudePrompt" text,
	"acceptanceCriteria" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_bugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"bugCode" varchar(32) NOT NULL,
	"taskId" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"stepsToReproduce" text,
	"expectedBehavior" text,
	"actualBehavior" text,
	"severity" "severityEnum" DEFAULT 'minor' NOT NULL,
	"status" "statusEnum17" DEFAULT 'open' NOT NULL,
	"fixAttempts" integer DEFAULT 0,
	"maxFixAttempts" integer DEFAULT 3,
	"reportedBy" "reportedByEnum" DEFAULT 'test' NOT NULL,
	"fixedBy" "fixedByEnum",
	"impactAssessment" text,
	"fixSuggestion" text,
	"affectedFiles" text,
	"errorLog" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"fixedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "development_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer,
	"bugId" integer,
	"executionType" "executionTypeEnum" NOT NULL,
	"executor" "fixedByEnum" NOT NULL,
	"status" "statusEnum18" DEFAULT 'success' NOT NULL,
	"details" text,
	"inputParams" text,
	"outputResult" text,
	"errorMessage" text,
	"durationSeconds" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskCode" varchar(32) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"taskType" "taskTypeEnum" DEFAULT 'feature' NOT NULL,
	"priority" "priorityEnum2" DEFAULT 'P1' NOT NULL,
	"status" "statusEnum19" DEFAULT 'pending' NOT NULL,
	"assignee" "fixedByEnum" DEFAULT 'claude_code' NOT NULL,
	"dependsOn" text,
	"estimatedHours" numeric(5, 1),
	"actualHours" numeric(5, 1),
	"startedAt" timestamp,
	"completedAt" timestamp,
	"milestone" varchar(64),
	"documentPath" varchar(500),
	"acceptanceCriteria" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceTaskId" varchar(50) NOT NULL,
	"deviceId" varchar(50) NOT NULL,
	"taskType" varchar(50) NOT NULL,
	"taskData" text,
	"projectId" integer,
	"bomItemId" integer,
	"engineeringTaskId" varchar(50),
	"status" "statusEnum20" DEFAULT 'pending',
	"progress" integer DEFAULT 0,
	"result" text,
	"errorMessage" text,
	"scheduledAt" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_table" varchar(50) NOT NULL,
	"source_id" integer NOT NULL,
	"project_id" integer,
	"stage_code" varchar(10),
	"document_title" varchar(300) NOT NULL,
	"document_type" varchar(50),
	"content_digest" text NOT NULL,
	"embedding" text NOT NULL,
	"embedding_model" varchar(50) NOT NULL,
	"embedding_dim" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_recommendation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"user_id" integer NOT NULL,
	"recommended_doc_ids" text NOT NULL,
	"similarity_scores" text NOT NULL,
	"ai_reasoning" text,
	"feedback" varchar(20),
	"feedback_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driving_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"trip_request_id" integer,
	"approvalType" varchar NOT NULL,
	"license_type" varchar(50),
	"license_number" varchar(100),
	"license_expiry_date" date,
	"license_country" varchar(3),
	"driving_experience_years" integer,
	"safety_test_score" integer,
	"safety_test_date" date,
	"safety_test_passed" smallint DEFAULT 0,
	"approval_scope" text,
	"approval_valid_from" date,
	"approval_valid_to" date,
	"status" varchar DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driving_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"vehicle_rental_id" integer,
	"trip_request_id" integer,
	"incidentType" varchar NOT NULL,
	"incident_date" timestamp NOT NULL,
	"location" varchar(200),
	"description" text,
	"severity" varchar DEFAULT 'minor',
	"fine_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"points_deducted" integer,
	"insurance_claim" smallint DEFAULT 0,
	"claim_amount" numeric(10, 2),
	"evidence_urls" text,
	"police_report_number" varchar(100),
	"resolution" text,
	"status" varchar DEFAULT 'reported',
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_code" varchar(100) NOT NULL,
	"achievement_name" varchar(200) NOT NULL,
	"description" text,
	"icon_url" varchar(500),
	"tier" varchar(20) DEFAULT 'bronze',
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_ai_assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"assistantCode" varchar(50) NOT NULL,
	"assistantName" varchar(100) NOT NULL,
	"assistantType" "assistantTypeEnum2" DEFAULT 'general',
	"personalityConfig" text,
	"knowledgeDomains" text,
	"learningProgress" text,
	"interactionStats" text,
	"skillLevels" text,
	"careerGoals" text,
	"status" "statusEnum21" DEFAULT 'active',
	"lastActiveAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_digital_assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" varchar(50) NOT NULL,
	"assistantCode" varchar(100) NOT NULL,
	"displayName" varchar(200),
	"workHabits" text,
	"preferences" text,
	"expertise" text,
	"communicationStyle" varchar(50),
	"canTaskAssist" smallint DEFAULT 1 NOT NULL,
	"canScheduleManage" smallint DEFAULT 1 NOT NULL,
	"canDocumentDraft" smallint DEFAULT 1 NOT NULL,
	"canDataAnalysis" smallint DEFAULT 0 NOT NULL,
	"canCommunicationProxy" smallint DEFAULT 0 NOT NULL,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"lastActiveAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_xp" integer DEFAULT 0,
	"current_level" integer DEFAULT 1,
	"current_title" varchar(100),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"service_task_id" integer,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy" numeric(6, 2),
	"address" varchar(500),
	"locationType" "locationTypeEnum" DEFAULT 'real_time',
	"device_info" json,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_offboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"department" varchar(100) NOT NULL,
	"position" varchar(100) NOT NULL,
	"hire_date" date,
	"offboarding_date" date NOT NULL,
	"last_working_date" date NOT NULL,
	"reason" "reasonEnum" NOT NULL,
	"reason_detail" text,
	"successorType" "successorTypeEnum" DEFAULT 'replacement' NOT NULL,
	"successor_id" integer,
	"successor_name" varchar(100),
	"backup_person_id" integer,
	"backup_person_name" varchar(100),
	"dataRetentionPolicy" "dataRetentionPolicyEnum" DEFAULT 'permanent' NOT NULL,
	"performanceDataHandling" "performanceDataHandlingEnum" DEFAULT 'keep_under_original' NOT NULL,
	"profileHandling" "profileHandlingEnum" DEFAULT 'archive' NOT NULL,
	"phoneHandling" "phoneHandlingEnum" DEFAULT 'return_to_pool' NOT NULL,
	"company_phone" varchar(30),
	"emailHandling" "emailHandlingEnum" DEFAULT 'forward_to_successor' NOT NULL,
	"email_forward_to" varchar(200),
	"email_forward_duration" integer DEFAULT 90,
	"approvalStatus" "approvalStatusEnum2" DEFAULT 'draft' NOT NULL,
	"status" "statusEnum86" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employee_skill_maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"skillCategory" varchar(100) NOT NULL,
	"skillName" varchar(200) NOT NULL,
	"currentLevel" integer DEFAULT 1,
	"targetLevel" integer,
	"evidence" text,
	"assessmentHistory" text,
	"improvementPlan" text,
	"lastAssessedAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_xp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"points" integer NOT NULL,
	"source_type" varchar(50),
	"source_id" integer,
	"awarded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "engineering_inputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"inputId" varchar(50) NOT NULL,
	"projectId" integer NOT NULL,
	"sourceType" varchar(50) NOT NULL,
	"sourceId" varchar(50),
	"inputCategory" varchar(50),
	"inputContent" text,
	"importance" "priorityEnum1" DEFAULT 'medium',
	"aiProcessed" smallint DEFAULT 0,
	"aiExtractedRequirements" text,
	"aiSuggestedTasks" text,
	"aiProcessedAt" timestamp,
	"distributedTo" text,
	"distributionStatus" varchar(20),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "engineering_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"projectId" integer NOT NULL,
	"phaseCode" varchar(10) NOT NULL,
	"taskType" varchar(50) NOT NULL,
	"taskName" varchar(200) NOT NULL,
	"taskDescription" text,
	"primaryAssigneeId" integer,
	"backupAssigneeId" integer,
	"supervisorId" integer,
	"plannedStartDate" date,
	"plannedEndDate" date,
	"actualStartDate" date,
	"actualEndDate" date,
	"status" "statusEnum22" DEFAULT 'pending',
	"priority" "priorityEnum3" DEFAULT 'medium',
	"progress" integer DEFAULT 0,
	"bomItemId" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "environment_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"syncType" "syncTypeEnum" NOT NULL,
	"sourceEnvironment" "environmentEnum" NOT NULL,
	"targetEnvironment" "environmentEnum" NOT NULL,
	"sync_scope" json,
	"data_masking_applied" boolean DEFAULT false NOT NULL,
	"status" "statusEnum64" DEFAULT 'pending' NOT NULL,
	"initiated_by" integer NOT NULL,
	"initiator_name" varchar(100),
	"started_at" timestamp,
	"completed_at" timestamp,
	"records_affected" integer DEFAULT 0,
	"error_message" text,
	"source_version" varchar(50),
	"target_version_before" varchar(50),
	"target_version_after" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_base_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipmentModel" varchar(50) NOT NULL,
	"basePrice" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY',
	"priceType" "priceTypeEnum" DEFAULT 'standard',
	"effectiveDate" date NOT NULL,
	"expiryDate" date,
	"notes" text,
	"isActive" smallint DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"numericCode" varchar(10) NOT NULL,
	"functionCode" varchar(10) NOT NULL,
	"categoryCode" varchar(5) NOT NULL,
	"fullName" varchar(100) NOT NULL,
	"chineseName" varchar(100) NOT NULL,
	"displayName" varchar(100),
	"chamberCount" integer,
	"processType" varchar(50),
	"configLevel" varchar(20),
	"applicableIndustry" varchar(100),
	"namingVersion" varchar(20) DEFAULT 'V1.0' NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"status" "statusEnum23" DEFAULT 'active' NOT NULL,
	"remark" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_name_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipmentId" integer NOT NULL,
	"numericCode" varchar(10) NOT NULL,
	"oldName" varchar(100),
	"newName" varchar(100),
	"oldChineseName" varchar(100),
	"newChineseName" varchar(100),
	"changeReason" text,
	"changeType" "changeTypeEnum" NOT NULL,
	"namingVersion" varchar(20) NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"changeRequestId" integer,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"claim_code" varchar(50) NOT NULL,
	"submitter_id" integer NOT NULL,
	"travel_record_id" integer,
	"trip_request_id" integer,
	"project_id" integer,
	"customer_id" integer,
	"department_id" integer,
	"claimType" "claimTypeEnum" NOT NULL,
	"claim_title" varchar(200),
	"description" text,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY',
	"exchange_rate" numeric(10, 6),
	"local_amount" numeric(12, 2),
	"items" json,
	"receipts" json,
	"policy_compliant" smallint DEFAULT 1,
	"policy_violations" text,
	"status" "statusEnum53" DEFAULT 'draft',
	"ai_audit_result" json,
	"ai_audit_score" integer,
	"ai_audit_flags" text,
	"ai_anomaly_rate" numeric(5, 2),
	"requires_manual_review" smallint DEFAULT 0,
	"approval_chain" text,
	"current_approver" integer,
	"reviewer_id" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"manager_approved_at" timestamp,
	"manager_approved_by" integer,
	"finance_reviewed_at" timestamp,
	"finance_reviewed_by" integer,
	"payment_approved_at" timestamp,
	"payment_approved_by" integer,
	"paid_at" timestamp,
	"payment_reference" varchar(100),
	"payment_method" varchar(50),
	"rejection_reason" text,
	"notes" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_claim_id" integer NOT NULL,
	"line_number" integer NOT NULL,
	"expense_date" date NOT NULL,
	"expenseCategory" varchar NOT NULL,
	"description" varchar(500) NOT NULL,
	"vendor" varchar(200),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CNY',
	"exchange_rate" numeric(10, 6),
	"local_amount" numeric(10, 2),
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(10, 2),
	"tax_amount" numeric(10, 2),
	"policy_id" integer,
	"within_policy" smallint DEFAULT 1,
	"policy_exceeded_amount" numeric(10, 2),
	"policy_exceeded_reason" text,
	"receipt_required" smallint DEFAULT 1,
	"receipt_provided" smallint DEFAULT 0,
	"receipt_url" varchar(500),
	"invoice_number" varchar(100),
	"invoice_validated" smallint DEFAULT 0,
	"ai_validation_result" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_code" varchar(50) NOT NULL,
	"policy_name" varchar(200) NOT NULL,
	"description" text,
	"policyType" varchar NOT NULL,
	"applicableRegion" varchar DEFAULT 'all',
	"applicable_countries" text,
	"applicable_roles" text,
	"applicable_departments" text,
	"daily_limit" numeric(10, 2),
	"per_item_limit" numeric(10, 2),
	"trip_limit" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"requires_receipt" smallint DEFAULT 1,
	"requires_pre_approval" smallint DEFAULT 0,
	"pre_approval_threshold" numeric(10, 2),
	"allowed_categories" text,
	"excluded_categories" text,
	"special_rules" text,
	"effective_from" date,
	"effective_to" date,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fat_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"is_completed" boolean DEFAULT false,
	"responsible_person" varchar(100),
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fat_signoffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"signer_role" varchar(50) NOT NULL,
	"signer_name" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"comment" text,
	"signature_url" text,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fat_test_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"specification" text,
	"pass_criteria" text,
	"actual_value" varchar(100),
	"unit" varchar(20),
	"result" varchar(20) DEFAULT 'pending',
	"tester_id" integer,
	"tester_name" varchar(100),
	"tested_at" timestamp,
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fat_test_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"plan_type" varchar(10) NOT NULL,
	"plan_name" varchar(255) NOT NULL,
	"equipment_model" varchar(100),
	"customer_name" varchar(255),
	"test_location" text,
	"planned_date" timestamp,
	"status" varchar(20) DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"type" "typeEnum6" DEFAULT 'suggestion' NOT NULL,
	"content" text NOT NULL,
	"status" "statusEnum24" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_quality_escalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_log_id" integer,
	"project_id" integer,
	"equipment_serial" varchar(100),
	"severity" varchar(20) NOT NULL,
	"issue_category" varchar(50),
	"description" text NOT NULL,
	"affected_process" varchar(20),
	"factory_lock_id" integer,
	"status" varchar(20) DEFAULT 'reported',
	"reported_by" integer,
	"reported_by_name" varchar(100),
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fk_constraint_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_table" varchar(100) NOT NULL,
	"source_column" varchar(100) NOT NULL,
	"target_table" varchar(100) NOT NULL,
	"target_column" varchar(100) NOT NULL,
	"constraint_name" varchar(200),
	"is_enforced" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "functional_ai_assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistantType" "assistantTypeEnum3" NOT NULL,
	"assistantCode" varchar(100) NOT NULL,
	"displayName" varchar(200) NOT NULL,
	"description" text,
	"systemPrompt" text,
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"maxTokens" integer DEFAULT 4096,
	"dataAccess" text,
	"actions" text,
	"integrations" text,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateStage" "gateStageEnum" NOT NULL,
	"category" varchar(50) NOT NULL,
	"item" varchar(200) NOT NULL,
	"criteria" text,
	"weight" integer DEFAULT 5 NOT NULL,
	"required" smallint DEFAULT 0 NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_checklist_items_extended" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"category" varchar(100) NOT NULL,
	"item_name" varchar(500) NOT NULL,
	"description" text,
	"weight" integer DEFAULT 5,
	"is_required" boolean DEFAULT false,
	"pass_criteria" text,
	"applicable_equipment_types" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gate_checklists" (
	"id" bigint PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"gateStage" varchar NOT NULL,
	"check_item" varchar(200) NOT NULL,
	"check_item_code" varchar(50),
	"description" text,
	"category" varchar(100),
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"auto_verify_source" varchar(100),
	"auto_verify_query" text,
	"manual_verify_required" boolean DEFAULT true NOT NULL,
	"status" varchar DEFAULT 'not_started' NOT NULL,
	"verified_by" bigint,
	"verified_at" timestamp,
	"verification_evidence" json,
	"waiver_reason" text,
	"waiver_approved_by" bigint,
	"notes" text,
	"due_date" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_growth_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_code" varchar(50) NOT NULL,
	"region_id" integer NOT NULL,
	"alertType" "alertTypeEnum4" NOT NULL,
	"severity" "severityEnum1" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"message_en" text,
	"details" text,
	"status" "statusEnum77" DEFAULT 'active' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_growth_regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_code" varchar(50) NOT NULL,
	"region_name" varchar(100) NOT NULL,
	"region_name_en" varchar(100),
	"sales_target" varchar(50) NOT NULL,
	"sales_target_value" numeric(15, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"sales_staff" integer DEFAULT 0,
	"support_asia_staff" integer DEFAULT 0,
	"support_asia_remote_staff" integer DEFAULT 0,
	"service_local_staff" integer DEFAULT 0,
	"service_asia_staff" integer DEFAULT 0,
	"focus_areas" text,
	"focus_scenarios" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_growth_revenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"month" integer,
	"revenue" numeric(15, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"revenueType" "revenueTypeEnum" DEFAULT 'actual' NOT NULL,
	"order_count" integer DEFAULT 0,
	"new_customer_count" integer DEFAULT 0,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"holiday_code" varchar(50) NOT NULL,
	"holiday_name" varchar(100) NOT NULL,
	"region" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_workday" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"memberType" "memberTypeEnum" NOT NULL,
	"userId" integer,
	"roleId" varchar(50),
	"departmentId" varchar(50),
	"isAdmin" smallint DEFAULT 0 NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"addedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_notification_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"notificationType" "notificationTypeEnum" NOT NULL,
	"titleTemplate" varchar(200) NOT NULL,
	"contentTemplate" text,
	"cronExpression" varchar(100),
	"channels" json NOT NULL,
	"isEnabled" smallint DEFAULT 1 NOT NULL,
	"priority" "priorityEnum4" DEFAULT 'normal' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"configId" integer,
	"title" varchar(200) NOT NULL,
	"content" text,
	"notificationType" "notificationTypeEnum" NOT NULL,
	"channel" "channelEnum" NOT NULL,
	"recipientCount" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failedCount" integer DEFAULT 0 NOT NULL,
	"status" "statusEnum25" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"completedAt" timestamp,
	"errorMessage" text,
	"sentBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"moduleId" varchar(100) NOT NULL,
	"permission" "permissionEnum" NOT NULL,
	"scope" "scopeEnum1" DEFAULT 'self' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_compliance_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"time_entry_id" integer,
	"alertType" "alertTypeEnum1" NOT NULL,
	"jurisdiction" "jurisdictionEnum" DEFAULT 'CN' NOT NULL,
	"severity" "severityEnum1" DEFAULT 'warning' NOT NULL,
	"description" text,
	"legal_reference" varchar(200),
	"recommended_action" text,
	"status" "statusEnum58" DEFAULT 'open' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"notification_sent" smallint DEFAULT 0,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_compliance_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"template_description" text,
	"alertType" "alertTypeEnum2" NOT NULL,
	"severity" "severityEnum2" DEFAULT 'warning',
	"jurisdiction" "jurisdictionEnum1" DEFAULT 'ALL',
	"subject_template" varchar(200) NOT NULL,
	"body_template" text NOT NULL,
	"is_html" smallint DEFAULT 1,
	"recipient_types" text,
	"is_enabled" smallint DEFAULT 1 NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_compliance_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" varchar(64) NOT NULL,
	"reportType" "reportTypeEnum1" DEFAULT 'weekly' NOT NULL,
	"format" "formatEnum1" DEFAULT 'pdf' NOT NULL,
	"jurisdiction" "jurisdictionEnum1" DEFAULT 'ALL',
	"date_range_start" date,
	"date_range_end" date,
	"generated_by" integer NOT NULL,
	"generated_by_name" varchar(100),
	"file_url" text NOT NULL,
	"file_key" varchar(255),
	"file_size_bytes" integer,
	"employees_included" integer DEFAULT 0,
	"alerts_included" integer DEFAULT 0,
	"includes_details" smallint DEFAULT 1,
	"includes_alerts" smallint DEFAULT 1,
	"includes_recommendations" smallint DEFAULT 1,
	"status" "statusEnum59" DEFAULT 'generating' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_compliance_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" varchar(64) NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"rule_description" text,
	"jurisdiction" "jurisdictionEnum" NOT NULL,
	"ruleType" "ruleTypeEnum2" NOT NULL,
	"threshold_value" numeric(10, 2) NOT NULL,
	"thresholdUnit" "thresholdUnitEnum" DEFAULT 'hours' NOT NULL,
	"warning_threshold" numeric(10, 2),
	"critical_threshold" numeric(10, 2),
	"legal_reference" varchar(200),
	"legal_reference_url" text,
	"recommended_action" text,
	"is_enabled" smallint DEFAULT 1 NOT NULL,
	"priority" integer DEFAULT 100,
	"effective_from" date,
	"effective_to" date,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(200),
	"department" varchar(100),
	"roleType" "roleTypeEnum" DEFAULT 'office' NOT NULL,
	"jurisdiction" "jurisdictionEnum" DEFAULT 'CN' NOT NULL,
	"supervisor_id" integer,
	"contractType" "contractTypeEnum" DEFAULT 'full_time',
	"weekly_hours_limit" integer DEFAULT 40,
	"is_exempt" smallint DEFAULT 0,
	"exemptionType" "exemptionTypeEnum" DEFAULT 'none',
	"hire_date" date,
	"timezone" varchar(50) DEFAULT 'Europe/Berlin',
	"is_active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"duration_minutes" integer DEFAULT 0,
	"activityCategory" "activityCategoryEnum" DEFAULT 'work' NOT NULL,
	"jurisdiction" "jurisdictionEnum" DEFAULT 'CN' NOT NULL,
	"project_id" integer,
	"customer_id" integer,
	"task_description" text,
	"location" varchar(200),
	"geo_latitude" numeric(10, 7),
	"geo_longitude" numeric(10, 7),
	"is_remote" smallint DEFAULT 0,
	"complianceFlag" "complianceFlagEnum" DEFAULT 'OK',
	"compliance_notes" text,
	"supervisorApproval" "supervisorApprovalEnum" DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"is_overtime" smallint DEFAULT 0,
	"overtime_rate" numeric(3, 2) DEFAULT '1.5',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_weekly_compliance_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"jurisdiction" "jurisdictionEnum" DEFAULT 'CN' NOT NULL,
	"total_work_minutes" integer DEFAULT 0,
	"total_travel_paid_minutes" integer DEFAULT 0,
	"total_overtime_minutes" integer DEFAULT 0,
	"days_worked" integer DEFAULT 0,
	"max_daily_minutes" integer DEFAULT 0,
	"rest_period_violations" integer DEFAULT 0,
	"exemptionStatus" "exemptionStatusEnum" DEFAULT 'non_exempt',
	"exemption_criteria_met" smallint DEFAULT 0,
	"primary_duty_percentage" numeric(5, 2),
	"overallComplianceStatus" "overallComplianceStatusEnum" DEFAULT 'compliant',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_config_id" integer NOT NULL,
	"check_id" integer,
	"plan_code" varchar(50) NOT NULL,
	"staff_type" varchar(50) NOT NULL,
	"required_headcount" integer NOT NULL,
	"target_location" varchar(100),
	"priority" "priorityEnum" DEFAULT 'medium' NOT NULL,
	"status" "statusEnum72" DEFAULT 'draft' NOT NULL,
	"target_date" date,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_case_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"matched_project_id" integer NOT NULL,
	"similarity_score" real NOT NULL,
	"match_factors" text,
	"outcome" varchar(100),
	"lessons_learned" text,
	"matched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotationId" varchar(50) NOT NULL,
	"projectNo" varchar(50),
	"solutionId" varchar(50),
	"customerName" varchar(100) NOT NULL,
	"customerType" "customerTypeEnum" DEFAULT 'other',
	"equipmentModel" varchar(50) NOT NULL,
	"equipmentQuantity" integer DEFAULT 1,
	"basePrice" numeric(12, 2) NOT NULL,
	"customizationCost" numeric(12, 2) DEFAULT '0',
	"installationCost" numeric(12, 2) DEFAULT '0',
	"trainingCost" numeric(12, 2) DEFAULT '0',
	"warrantyCost" numeric(12, 2) DEFAULT '0',
	"otherCosts" numeric(12, 2) DEFAULT '0',
	"totalCost" numeric(12, 2) NOT NULL,
	"totalPrice" numeric(12, 2) NOT NULL,
	"discountRate" numeric(5, 2) DEFAULT '0',
	"finalPrice" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"bidResult" "bidResultEnum" DEFAULT 'pending',
	"competitorPrice" numeric(12, 2),
	"competitorName" varchar(100),
	"profitMargin" numeric(5, 2),
	"quotationDate" date NOT NULL,
	"validUntil" date,
	"paymentTerms" varchar(200),
	"deliveryTerms" varchar(200),
	"notes" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"solutionId" varchar(50) NOT NULL,
	"solutionName" varchar(200) NOT NULL,
	"sourceType" "sourceTypeEnum" DEFAULT 'grt_internal' NOT NULL,
	"customerName" varchar(100),
	"projectNo" varchar(50),
	"equipmentModel" varchar(50),
	"workpieceType" varchar(100),
	"workpieceCategory" "workpieceCategoryEnum" DEFAULT 'other',
	"workpieceMaterial" varchar(50),
	"workpieceDimensions" varchar(100),
	"workpieceWeight" numeric(10, 2),
	"cleanlinessStandard" varchar(50),
	"cleanlinessValue" varchar(50),
	"cycleTime" integer,
	"dailyCapacity" integer,
	"loadingMethod" varchar(100),
	"unloadingMethod" varchar(100),
	"processFlow" text,
	"processParameters" text,
	"specialRequirements" text,
	"deliveryDate" date,
	"successRate" numeric(5, 2) DEFAULT '100.00',
	"lessonsLearned" text,
	"isReference" smallint DEFAULT 1,
	"isActive" smallint DEFAULT 1,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_ai_interview_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordCode" varchar(50) NOT NULL,
	"candidateId" integer NOT NULL,
	"positionId" integer,
	"round" integer DEFAULT 1,
	"interviewType" "interviewTypeEnum" DEFAULT 'video' NOT NULL,
	"interviewStrategy" text,
	"interviewQuestions" text,
	"transcript" text,
	"emotionAnalysis" text,
	"keywordsExtracted" text,
	"riskAssessment" text,
	"overallScore" integer,
	"recommendation" "recommendationEnum",
	"followUpActions" text,
	"interviewerId" integer,
	"interviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidateCode" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"gender" "genderEnum1",
	"age" integer,
	"phone" varchar(20),
	"email" varchar(100),
	"positionId" integer,
	"positionName" varchar(100),
	"source" varchar(50),
	"resumeUrl" varchar(500),
	"resumeAnalysis" text,
	"workYears" integer,
	"education" varchar(50),
	"expectedSalary" bigint,
	"status" "statusEnum26" DEFAULT 'new' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_digital_agent_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"positionId" integer NOT NULL,
	"positionName" varchar(100) NOT NULL,
	"department" varchar(50) NOT NULL,
	"digitalizationScore" numeric(5, 2) DEFAULT '0',
	"taskStandardization" numeric(5, 2) DEFAULT '0',
	"decisionComplexity" numeric(5, 2) DEFAULT '0',
	"interactionRequirement" numeric(5, 2) DEFAULT '0',
	"creativityRequirement" numeric(5, 2) DEFAULT '0',
	"technicalFeasibility" numeric(5, 2) DEFAULT '0',
	"roadmap" text,
	"currentStage" "currentStageEnum" DEFAULT 'initial' NOT NULL,
	"assessmentNotes" text,
	"lastAssessedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_document_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileCode" varchar(100) NOT NULL,
	"fileTypeCode" varchar(10) NOT NULL,
	"subjectType" "subjectTypeEnum" NOT NULL,
	"subjectId" integer NOT NULL,
	"fileName" varchar(200) NOT NULL,
	"fileUrl" varchar(500),
	"version" varchar(10) DEFAULT 'V1.0' NOT NULL,
	"fileDate" timestamp NOT NULL,
	"status" "statusEnum5" DEFAULT 'active' NOT NULL,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeCode" varchar(20) NOT NULL,
	"userId" integer,
	"name" varchar(100) NOT NULL,
	"englishName" varchar(100),
	"gender" "genderEnum1" NOT NULL,
	"birthDate" timestamp,
	"idNumber" varchar(18),
	"phone" varchar(20),
	"email" varchar(100),
	"department" varchar(50) NOT NULL,
	"position" varchar(100) NOT NULL,
	"level" varchar(20),
	"hireDate" timestamp NOT NULL,
	"regularDate" timestamp,
	"managerId" integer,
	"seniorManagerId" integer,
	"hrbpId" integer,
	"status" "statusEnum27" DEFAULT 'probation' NOT NULL,
	"workLocation" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_performance_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"gradeCode" varchar(10) NOT NULL,
	"gradeName" varchar(50) NOT NULL,
	"scoreMin" integer NOT NULL,
	"scoreMax" integer NOT NULL,
	"coefficient" numeric(3, 2) NOT NULL,
	"description" varchar(200),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_performance_review_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"reviewType" "reviewTypeEnum" NOT NULL,
	"reviewDate" timestamp NOT NULL,
	"reminderDateTime" timestamp NOT NULL,
	"recipients" text,
	"emailSubject" varchar(500),
	"emailContent" text,
	"status" "statusEnum28" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"positionCode" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"englishName" varchar(100),
	"department" varchar(50) NOT NULL,
	"responsibilities" text,
	"keyTasks" text,
	"qualifications" text,
	"kpiIndicators" text,
	"digitalizationScore" numeric(5, 2) DEFAULT '0',
	"digitalizationRoadmap" text,
	"status" "statusEnum12" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(50) NOT NULL,
	"level" varchar(20),
	"baseSalaryRatioMin" numeric(5, 2) NOT NULL,
	"baseSalaryRatioMax" numeric(5, 2) NOT NULL,
	"performanceRatioMin" numeric(5, 2) NOT NULL,
	"performanceRatioMax" numeric(5, 2) NOT NULL,
	"bonusRatioMin" numeric(5, 2) NOT NULL,
	"bonusRatioMax" numeric(5, 2) NOT NULL,
	"benefitsRatioMin" numeric(5, 2) NOT NULL,
	"benefitsRatioMax" numeric(5, 2) NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"status" "statusEnum12" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"planCode" varchar(50) NOT NULL,
	"employeeId" integer NOT NULL,
	"planType" "planTypeEnum" DEFAULT 'onboarding' NOT NULL,
	"name" varchar(200) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"content" text,
	"stages" text,
	"status" "statusEnum6" DEFAULT 'pending' NOT NULL,
	"completionRate" integer DEFAULT 0,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_training_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"testCode" varchar(50) NOT NULL,
	"trainingPlanId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"testType" "testTypeEnum" DEFAULT 'basic' NOT NULL,
	"questions" text,
	"answers" text,
	"score" integer,
	"passingScore" integer DEFAULT 60,
	"isPassed" smallint,
	"testedAt" timestamp,
	"gradedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ime_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"achievement_key" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"category" varchar(50) DEFAULT 'general',
	"tier" varchar(20) DEFAULT 'bronze',
	"criteria" text,
	"points" integer DEFAULT 10,
	"is_global" integer DEFAULT 1,
	"user_id" varchar(100),
	"awarded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"owner" varchar(200),
	"origin_meeting_id" varchar(36) NOT NULL,
	"origin_block_id" integer,
	"status" varchar(20) DEFAULT 'open',
	"meeting_appearances" text,
	"appearance_count" integer DEFAULT 1,
	"first_seen_date" timestamp DEFAULT now(),
	"last_seen_date" timestamp DEFAULT now(),
	"resolved_date" timestamp,
	"ai_match_confidence" real,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_agenda_intelligence_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(20),
	"scope_id" varchar(200),
	"period_start" timestamp,
	"period_end" timestamp,
	"total_meetings_analyzed" integer,
	"total_agenda_items" integer,
	"avg_agenda_items_per_meeting" integer,
	"avg_planned_duration" integer,
	"avg_actual_duration" integer,
	"avg_overrun_minutes" integer,
	"avg_overrun_percent" integer,
	"overrun_rate" integer,
	"underrun_rate" integer,
	"skipped_rate" integer,
	"avg_engagement_score" integer,
	"avg_productivity_score" integer,
	"avg_time_efficiency_score" integer,
	"overall_grade" varchar(2),
	"top_overrun_categories" text,
	"top_overrun_topics" text,
	"optimal_order_recommendation" text,
	"ai_narrative" text,
	"trend_vs_previous" varchar(20),
	"trend_slope" integer,
	"recommendations" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(50) NOT NULL,
	"user_id" varchar(100),
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_name" varchar(200) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"scopes" text NOT NULL,
	"rate_limit" integer DEFAULT 1000,
	"rate_limit_window" varchar(20) DEFAULT 'hourly',
	"request_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"error_count" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"description" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ime_api_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"key_name" varchar(200),
	"endpoint" varchar(500) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer,
	"response_time_ms" integer,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"error_message" text,
	"requested_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_attendee_optimization" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"scope" varchar(50),
	"meeting_title" varchar(300),
	"meeting_topic" text,
	"current_participants" text,
	"recommended_participants" text,
	"over_invited_participants" text,
	"optimal_size" integer,
	"current_size" integer,
	"estimated_cost_saving" numeric(12, 2),
	"composition_advice" text,
	"ai_narrative" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_coaching_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(50) NOT NULL,
	"scope_id" varchar(100),
	"period" varchar(20),
	"culture_score" real,
	"dimensions" text,
	"strengths" text,
	"improvements" text,
	"action_plan" text,
	"benchmark_comparison" text,
	"ai_narrative" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_collaboration_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_a" varchar(200) NOT NULL,
	"participant_b" varchar(200) NOT NULL,
	"employee_id_a" varchar(100),
	"employee_id_b" varchar(100),
	"department_a" varchar(200),
	"department_b" varchar(200),
	"meeting_count" integer DEFAULT 0,
	"total_co_meeting_minutes" integer DEFAULT 0,
	"avg_meeting_size" integer DEFAULT 0,
	"collaboration_score" integer DEFAULT 0,
	"relationship_type" varchar(20) DEFAULT 'same_dept',
	"shared_meeting_ids" text,
	"first_collaboration" timestamp,
	"last_collaboration" timestamp,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_compliance_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"meeting_title" varchar(500),
	"policy_id" integer NOT NULL,
	"policy_name" varchar(200),
	"policy_type" varchar(50),
	"result" varchar(20) NOT NULL,
	"severity" varchar(20),
	"actual_value" varchar(200),
	"expected_value" varchar(200),
	"details" text,
	"audited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_compliance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"policy_type" varchar(50) NOT NULL,
	"check_field" varchar(100),
	"operator" varchar(10),
	"threshold" varchar(100),
	"severity" varchar(20) DEFAULT 'warning',
	"scope" varchar(50) DEFAULT 'global',
	"scope_id" varchar(100),
	"is_active" integer DEFAULT 1,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_decision_intelligence_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(20),
	"scope_id" varchar(200),
	"period_start" timestamp,
	"period_end" timestamp,
	"total_decisions" integer,
	"implemented_count" integer,
	"abandoned_count" integer,
	"reversed_count" integer,
	"pending_count" integer,
	"follow_through_rate" integer,
	"reversal_rate" integer,
	"avg_velocity_days" integer,
	"median_velocity_days" integer,
	"fastest_velocity_days" integer,
	"slowest_velocity_days" integer,
	"velocity_grade" varchar(2),
	"avg_impact_score" integer,
	"positive_impact_count" integer,
	"negative_impact_count" integer,
	"avg_quality_score" integer,
	"avg_clarity_score" integer,
	"avg_alignment_score" integer,
	"overall_decision_grade" varchar(2),
	"top_bottlenecks" text,
	"top_reversal_reasons" text,
	"ai_narrative" text,
	"trend_vs_previous" varchar(20),
	"trend_slope" integer,
	"recommendations" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_decision_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"decision_text" text NOT NULL,
	"decision_date" timestamp,
	"outcome_status" varchar(30),
	"outcome_notes" text,
	"impact_score" real,
	"lessons_learned" text,
	"tracked_by" varchar(100),
	"outcome_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_decision_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"decision_id" integer,
	"meeting_id" varchar(36),
	"decision_text" text,
	"decision_maker" varchar(200),
	"stakeholders" text,
	"department" varchar(200),
	"decision_date" timestamp,
	"follow_through_status" varchar(20) DEFAULT 'pending',
	"implementation_start_date" timestamp,
	"implementation_end_date" timestamp,
	"decision_to_start_days" integer,
	"start_to_completion_days" integer,
	"total_velocity_days" integer,
	"velocity_grade" varchar(2),
	"is_reversed" integer DEFAULT 0,
	"reversal_meeting_id" varchar(36),
	"reversal_date" timestamp,
	"reversal_reason" text,
	"impact_score" integer,
	"impact_category" varchar(20) DEFAULT 'neutral',
	"business_outcome" text,
	"ai_quality_score" integer,
	"ai_clarity_score" integer,
	"ai_alignment_score" integer,
	"ai_narrative" text,
	"ai_recommendations" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_department_rollups" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(100) NOT NULL,
	"period" varchar(20) NOT NULL,
	"meeting_count" integer DEFAULT 0,
	"avg_effectiveness" real,
	"avg_contribution_score" real,
	"total_decisions" integer DEFAULT 0,
	"total_action_items" integer DEFAULT 0,
	"active_participants" integer DEFAULT 0,
	"participation_balance" real,
	"top_contributors" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_digest_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"digest_type" varchar(30) NOT NULL,
	"scope" varchar(50),
	"scope_id" varchar(100),
	"period" varchar(30),
	"summary" text,
	"highlights" text,
	"alerts" text,
	"metrics" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_entity_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_from_id" integer NOT NULL,
	"entity_to_id" integer NOT NULL,
	"relationship_type" varchar(50) NOT NULL,
	"strength" real,
	"context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_expert_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"employee_name" varchar(100),
	"department" varchar(100),
	"expertise_areas" text,
	"credibility_score" real,
	"meeting_count" integer,
	"avg_contribution_score" real,
	"decision_influence_rate" real,
	"top_topics" text,
	"ai_narrative" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_facilitator_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36),
	"facilitator_name" varchar(200),
	"facilitator_id" varchar(200),
	"department" varchar(200),
	"facilitation_style" varchar(30) DEFAULT 'unknown',
	"style_confidence" integer,
	"overall_effectiveness_score" integer,
	"engagement_impact_score" integer,
	"decision_facilitation_score" integer,
	"time_management_score" integer,
	"inclusivity_score" integer,
	"clarity_score" integer,
	"conflict_resolution_score" integer,
	"meeting_effectiveness_score" integer,
	"speaker_balance_index" integer,
	"dominant_speaker_percent" integer,
	"total_speakers" integer,
	"facilitator_speaking_percent" integer,
	"decisions_count" integer,
	"action_items_count" integer,
	"effectiveness_grade" varchar(2),
	"ai_strengths" text,
	"ai_weaknesses" text,
	"ai_coaching_points" text,
	"ai_narrative" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_facilitator_intelligence_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(20),
	"scope_id" varchar(200),
	"period_start" timestamp,
	"period_end" timestamp,
	"total_meetings_analyzed" integer,
	"total_facilitators" integer,
	"avg_effectiveness_score" integer,
	"avg_engagement_impact" integer,
	"avg_decision_facilitation" integer,
	"avg_time_management" integer,
	"avg_inclusivity" integer,
	"avg_clarity" integer,
	"avg_conflict_resolution" integer,
	"avg_speaker_balance" integer,
	"avg_facilitator_speaking_percent" integer,
	"style_distribution" text,
	"top_facilitators" text,
	"bottom_facilitators" text,
	"grade_distribution" text,
	"overall_grade" varchar(2),
	"ai_narrative" text,
	"best_practices" text,
	"trend_vs_previous" varchar(20),
	"trend_slope" integer,
	"recommendations" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_feedback_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(50) NOT NULL,
	"scope_id" varchar(100),
	"period" varchar(20),
	"total_responses" integer DEFAULT 0,
	"avg_overall_rating" real,
	"avg_content_relevance" real,
	"avg_time_efficiency" real,
	"avg_facilitation" real,
	"avg_action_clarity" real,
	"nps_score" real,
	"top_highlights" text,
	"top_improvements" text,
	"trend_direction" varchar(10),
	"analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_governance_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"total_meetings_audited" integer DEFAULT 0,
	"compliance_rate" real,
	"total_violations" integer DEFAULT 0,
	"total_warnings" integer DEFAULT 0,
	"top_violations" text,
	"risk_areas" text,
	"recommendations" text,
	"ai_narrative" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_hr_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(100) NOT NULL,
	"employee_name" varchar(200),
	"department" varchar(200),
	"rule_id" integer,
	"rule_name" varchar(200),
	"meeting_id" varchar(36),
	"meeting_title" varchar(500),
	"action_type" varchar(50) NOT NULL,
	"action_description" text,
	"reason" text,
	"impact_dimension" varchar(100),
	"impact_value" varchar(50),
	"source_data" text,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" varchar(100),
	"reviewed_at" timestamp,
	"review_notes" text,
	"executed_at" timestamp,
	"execution_result" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_hr_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(36) NOT NULL,
	"employee_name" varchar(200),
	"signal_type" varchar(50) NOT NULL,
	"confidence" real,
	"evidence" text,
	"suggested_action" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_improvement_initiatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"category" varchar(50),
	"priority" varchar(10) DEFAULT 'P2',
	"source" varchar(50) DEFAULT 'feedback',
	"scope" varchar(50) DEFAULT 'organization',
	"scope_id" varchar(100),
	"target_metric" varchar(50),
	"baseline_value" real,
	"target_value" real,
	"current_value" real,
	"status" varchar(20) DEFAULT 'proposed',
	"owner" varchar(100),
	"due_date" timestamp,
	"ai_narrative" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_integration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"integration_name" varchar(200),
	"operation" varchar(50) NOT NULL,
	"direction" varchar(20),
	"records_processed" integer DEFAULT 0,
	"records_succeeded" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"details" text,
	"status" varchar(20) DEFAULT 'success',
	"error_message" text,
	"duration_ms" integer,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"integration_type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"config" text,
	"sync_direction" varchar(20) DEFAULT 'bidirectional',
	"sync_frequency" varchar(20) DEFAULT 'manual',
	"status" varchar(20) DEFAULT 'active',
	"last_sync_at" timestamp,
	"last_sync_status" varchar(20),
	"error_message" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_knowledge_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_value" text NOT NULL,
	"confidence" real,
	"related_speaker" varchar(100),
	"context" text,
	"ai_narrative" text,
	"extracted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_leaderboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"metric" varchar(50) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"user_name" varchar(200),
	"department" varchar(100),
	"rank" integer NOT NULL,
	"score" real NOT NULL,
	"trend" varchar(10),
	"previous_rank" integer,
	"snapshot_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_linkage_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"condition_type" varchar(50) NOT NULL,
	"condition_field" varchar(100),
	"condition_operator" varchar(20) NOT NULL,
	"condition_threshold" varchar(100) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"action_target" varchar(200),
	"action_value" varchar(200),
	"action_description" text,
	"scope" varchar(20) DEFAULT 'individual',
	"scope_id" varchar(100),
	"impact_dimension" varchar(100),
	"priority" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_live_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"session_status" varchar(20) DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"started_by" varchar(36) NOT NULL,
	"live_suggestions" text,
	"live_contribution_snapshot" text,
	"total_segments_processed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"participant_summary" text,
	"pending_action_items" text,
	"relevant_decisions" text,
	"topic_history" text,
	"suggested_questions" text,
	"risk_alerts" text,
	"ai_narrative" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"duration_minutes" real,
	"participant_count" integer,
	"total_cost" numeric(12, 2),
	"cost_per_decision" numeric(12, 2),
	"cost_per_action_item" numeric(12, 2),
	"roi_score" real,
	"participant_breakdown" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"overall_rating" integer NOT NULL,
	"content_relevance" integer,
	"time_efficiency" integer,
	"facilitation" integer,
	"action_clarity" integer,
	"would_recommend" integer,
	"highlights" text,
	"improvements" text,
	"suggestions" text,
	"anonymous" integer DEFAULT 0,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(50) NOT NULL,
	"scope_id" varchar(100),
	"period" varchar(20),
	"health_score" real,
	"dimensions" text,
	"grade" varchar(2),
	"recommendations" text,
	"benchmark_comparison" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_minutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"attendees" text,
	"agenda_items" text,
	"decisions_recorded" text,
	"action_items_summary" text,
	"key_discussion_points" text,
	"next_steps" text,
	"follow_up_date" timestamp,
	"ai_narrative" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_necessity_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(100) NOT NULL,
	"necessity_score" integer DEFAULT 0,
	"necessity_grade" varchar(2) DEFAULT 'C',
	"decision_complexity" integer DEFAULT 0,
	"collaboration_requirement" integer DEFAULT 0,
	"information_richness" integer DEFAULT 0,
	"outcome_impact" integer DEFAULT 0,
	"participant_alignment" integer DEFAULT 0,
	"time_efficiency" integer DEFAULT 0,
	"alternative_viability" varchar(20) DEFAULT 'none',
	"alternative_rationale" text,
	"ai_narrative" text,
	"recommendations" text,
	"analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"scope" varchar(50) NOT NULL,
	"scope_id" varchar(100),
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20),
	"metrics" text,
	"meeting_ids" text,
	"recommendation" text,
	"detected_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"scope" varchar(50),
	"scope_id" varchar(100),
	"prediction_type" varchar(50),
	"predicted_score" real,
	"confidence_level" real,
	"risk_level" varchar(20),
	"risk_factors" text,
	"features" text,
	"fatigue_index" real,
	"trend_forecast" text,
	"recommendations" text,
	"ai_narrative" text,
	"actual_score" real,
	"prediction_accuracy" real,
	"predicted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_retrospectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"ai_summary" text,
	"key_learnings" text,
	"improvement_areas" text,
	"what_went_well" text,
	"actionable_insights" text,
	"overall_grade" varchar(5),
	"ai_narrative" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_roi" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"total_cost" numeric(12, 2),
	"decision_count" integer,
	"action_item_count" integer,
	"completed_action_count" integer,
	"cost_per_decision" numeric(12, 2),
	"cost_per_action_item" numeric(12, 2),
	"outcome_score" real,
	"roi_grade" varchar(2),
	"outcomes" text,
	"department_id" varchar(100),
	"ai_narrative" text,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_sentiment" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"overall_sentiment" varchar(20),
	"sentiment_score" real,
	"tension_level" real,
	"collaboration_tone" real,
	"frustration_indicators" integer DEFAULT 0,
	"consensus_reached" boolean,
	"speaker_sentiments" text,
	"emotional_arc" text,
	"conflict_topics" text,
	"ai_narrative" text,
	"analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_structure_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36),
	"schedule_id" integer,
	"agenda_item_index" integer,
	"agenda_item_title" varchar(500),
	"agenda_item_category" varchar(50) DEFAULT 'other',
	"planned_duration_minutes" integer,
	"actual_duration_minutes" integer,
	"overrun_minutes" integer,
	"overrun_percent" integer,
	"speaker_count" integer,
	"dominant_speaker" varchar(200),
	"dominant_speaker_percent" integer,
	"content_block_count" integer,
	"decisions_count" integer,
	"action_items_count" integer,
	"engagement_score" integer,
	"productivity_score" integer,
	"time_efficiency_grade" varchar(2),
	"ai_summary" text,
	"ai_recommendation" text,
	"was_skipped" integer DEFAULT 0,
	"total_meeting_duration_minutes" integer,
	"total_planned_duration_minutes" integer,
	"total_actual_duration_minutes" integer,
	"unplanned_time_minutes" integer,
	"meeting_time_efficiency_score" integer,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_meeting_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50),
	"agenda_template" text,
	"success_criteria" text,
	"recommended_duration" integer,
	"recommended_participants" text,
	"source_meeting_id" varchar(36),
	"created_by" varchar(100),
	"usage_count" integer DEFAULT 0,
	"avg_rating" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_participant_workload" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(100) NOT NULL,
	"employee_name" varchar(200) NOT NULL,
	"department" varchar(200),
	"period_type" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"meeting_count" integer DEFAULT 0,
	"total_meeting_minutes" integer DEFAULT 0,
	"avg_meeting_duration" integer DEFAULT 0,
	"max_meeting_duration" integer DEFAULT 0,
	"back_to_back_count" integer DEFAULT 0,
	"back_to_back_ratio" integer DEFAULT 0,
	"focus_time_minutes" integer DEFAULT 0,
	"meeting_density" integer DEFAULT 0,
	"longest_focus_block" integer DEFAULT 0,
	"meetings_before_noon" integer DEFAULT 0,
	"meetings_after_noon" integer DEFAULT 0,
	"unique_collaborators" integer DEFAULT 0,
	"load_score" integer DEFAULT 0,
	"risk_level" varchar(20) DEFAULT 'low',
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_recurring_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_key" varchar(200),
	"series_title" varchar(300),
	"channel_id" varchar(100),
	"frequency" varchar(20),
	"detected_interval" integer,
	"first_occurrence" timestamp,
	"last_occurrence" timestamp,
	"occurrence_count" integer DEFAULT 0,
	"avg_participant_count" integer DEFAULT 0,
	"core_participants" text,
	"avg_effectiveness_score" integer DEFAULT 0,
	"effectiveness_trend" varchar(20),
	"trend_slope" integer DEFAULT 0,
	"avg_roi_grade" varchar(2),
	"total_cumulative_cost" integer DEFAULT 0,
	"total_cumulative_minutes" integer DEFAULT 0,
	"value_score" integer DEFAULT 0,
	"value_grade" varchar(2),
	"recommendation" varchar(30),
	"recommendation_rationale" text,
	"ai_narrative" text,
	"meeting_ids" text,
	"status" varchar(20) DEFAULT 'active',
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_report_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_type" varchar(30) NOT NULL,
	"scope" varchar(50),
	"scope_id" varchar(100),
	"filters" text,
	"format" varchar(10) NOT NULL,
	"filename" varchar(300),
	"file_size" integer,
	"generated_by" varchar(100),
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_series_optimization_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer,
	"series_title" varchar(300),
	"action_taken" varchar(30),
	"action_date" timestamp,
	"pre_action_value_score" integer DEFAULT 0,
	"pre_action_effectiveness" integer DEFAULT 0,
	"pre_action_weekly_minutes" integer DEFAULT 0,
	"post_action_weekly_minutes" integer DEFAULT 0,
	"minutes_saved_per_week" integer DEFAULT 0,
	"cost_saved_per_week" integer DEFAULT 0,
	"team_satisfaction_delta" integer DEFAULT 0,
	"productivity_impact" varchar(20),
	"ai_assessment" text,
	"assessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text,
	"setting_type" varchar(20) DEFAULT 'string',
	"category" varchar(50) DEFAULT 'general',
	"label" varchar(200),
	"description" text,
	"updated_by" varchar(100),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_team_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"challenge_type" varchar(50) NOT NULL,
	"target_metric" varchar(50) NOT NULL,
	"target_value" real NOT NULL,
	"current_value" real DEFAULT 0,
	"baseline_value" real,
	"scope" varchar(50) DEFAULT 'organization',
	"scope_id" varchar(100),
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"reward_description" text,
	"participants" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_topic_continuity" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_name" varchar(300) NOT NULL,
	"topic_description" text,
	"status" varchar(20) DEFAULT 'introduced',
	"meeting_appearances" text,
	"appearance_count" integer DEFAULT 1,
	"first_seen_meeting_id" varchar(36),
	"first_seen_date" timestamp DEFAULT now(),
	"last_seen_date" timestamp DEFAULT now(),
	"resolved_meeting_id" varchar(36),
	"resolved_date" timestamp,
	"ai_match_confidence" real,
	"related_topic_ids" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_wellbeing_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(100) NOT NULL,
	"employee_name" varchar(200) NOT NULL,
	"department" varchar(200),
	"wellbeing_score" integer DEFAULT 0,
	"wellbeing_grade" varchar(2) DEFAULT 'C',
	"meeting_load_dimension" integer DEFAULT 0,
	"schedule_balance_dimension" integer DEFAULT 0,
	"collaboration_diversity_dimension" integer DEFAULT 0,
	"focus_time_dimension" integer DEFAULT 0,
	"meeting_efficiency_dimension" integer DEFAULT 0,
	"workload_trend_dimension" integer DEFAULT 0,
	"risk_factors" text,
	"recommendations" text,
	"ai_narrative" text,
	"assessed_period_start" timestamp,
	"assessed_period_end" timestamp,
	"assessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_workflow_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"rule_name" varchar(200),
	"trigger_event" varchar(50) NOT NULL,
	"trigger_meeting_id" varchar(36),
	"condition_snapshot" text,
	"action_type" varchar(50) NOT NULL,
	"action_result" text,
	"status" varchar(20) DEFAULT 'success',
	"error_message" text,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ime_workflow_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"trigger_event" varchar(50) NOT NULL,
	"condition_field" varchar(100),
	"condition_operator" varchar(10),
	"condition_value" varchar(100),
	"action_type" varchar(50) NOT NULL,
	"action_config" text,
	"scope" varchar(50) DEFAULT 'global',
	"scope_id" varchar(100),
	"is_active" integer DEFAULT 1,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"importType" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"file_path" varchar(500),
	"total_rows" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"skipped_count" integer DEFAULT 0,
	"field_mapping" text,
	"error_log" text,
	"imported_data" text,
	"status" varchar DEFAULT 'pending',
	"rollback_at" timestamp,
	"rollback_by" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "insurance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_name" varchar(200) NOT NULL,
	"policyType" varchar NOT NULL,
	"insurer_name" varchar(200) NOT NULL,
	"policy_number" varchar(100),
	"coverage_scope" text,
	"coverage_amount" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"premium_per_day" numeric(8, 2),
	"applicable_regions" text,
	"exclusions" text,
	"claim_process" text,
	"emergency_hotline" varchar(50),
	"valid_from" date,
	"valid_to" date,
	"is_default" smallint DEFAULT 0,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_code" varchar(50) NOT NULL,
	"integration_name" varchar(100) NOT NULL,
	"integrationType" "integrationTypeEnum" NOT NULL,
	"status" "statusEnum81" DEFAULT 'DISCONNECTED',
	"last_sync_at" timestamp,
	"sync_frequency" integer,
	"configuration" text,
	"error_message" text,
	"metadata" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"interactionType" "interactionTypeEnum1" DEFAULT 'question' NOT NULL,
	"member_id" integer NOT NULL,
	"message_id" integer,
	"original_content" text NOT NULL,
	"processed_content" text,
	"response_content" text,
	"response_by" integer,
	"responseMode" "responseModeEnum" DEFAULT 'ai_assisted',
	"category" varchar(100),
	"priority" "priorityEnum5" DEFAULT 'medium',
	"sentiment" "sentimentEnum" DEFAULT 'neutral',
	"is_lead_converted" smallint DEFAULT 0,
	"lead_id" integer,
	"complianceStatus" "complianceStatusEnum" DEFAULT 'unchecked' NOT NULL,
	"compliance_notes" text,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "invoice_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_line_item_id" integer NOT NULL,
	"invoice_number" varchar(100),
	"invoice_code" varchar(50),
	"invoice_date" date,
	"invoiceType" varchar,
	"seller_name" varchar(200),
	"seller_tax_id" varchar(50),
	"buyer_name" varchar(200),
	"buyer_tax_id" varchar(50),
	"total_amount" numeric(10, 2),
	"tax_amount" numeric(10, 2),
	"currency" varchar(3),
	"ocr_result" text,
	"ocr_confidence" integer,
	"tax_system_validation" smallint,
	"tax_system_response" text,
	"duplicate_check" smallint DEFAULT 0,
	"duplicate_claim_id" integer,
	"validationStatus" varchar DEFAULT 'pending',
	"validation_errors" text,
	"manual_override" smallint DEFAULT 0,
	"override_by" integer,
	"override_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_equipment_twins" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"equipment_code" varchar(100),
	"equipment_name" varchar(300),
	"location" varchar(200),
	"last_telemetry_at" timestamp,
	"status" varchar(50) DEFAULT 'offline',
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_maintenance_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"predicted_issue" varchar(300),
	"confidence" real,
	"recommended_action" text,
	"predicted_date" timestamp,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_telemetry_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(20),
	"is_alert" boolean DEFAULT false,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ip_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" varchar(50) NOT NULL,
	"ip_range" varchar(50),
	"reason" varchar(500) NOT NULL,
	"blocked_by" integer,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_dept_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_dept_no" integer NOT NULL,
	"jdy_dept_name" varchar(200) NOT NULL,
	"jdy_parent_no" integer,
	"jdy_dept_type" integer DEFAULT 0,
	"jdy_dept_status" integer DEFAULT 1,
	"grt_dept_id" integer,
	"grt_dept_code" varchar(50),
	"syncStatus" "syncStatusEnum2" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_role_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_role_no" integer NOT NULL,
	"jdy_group_no" integer NOT NULL,
	"jdy_role_name" varchar(200) NOT NULL,
	"jdy_role_type" integer DEFAULT 0,
	"jdy_role_status" integer DEFAULT 1,
	"grt_role_id" varchar(50),
	"grt_role_name" varchar(100),
	"permission_mapping" json,
	"syncStatus" "syncStatusEnum2" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_role_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_role_no" integer NOT NULL,
	"jdy_username" varchar(100) NOT NULL,
	"jdy_name" varchar(100) NOT NULL,
	"jdy_departments_range" json,
	"jdy_has_child" boolean DEFAULT false,
	"syncStatus" "syncStatusEnum2" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"status" "statusEnum68" DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_message" text,
	"error_details" json,
	"triggeredBy" "triggeredByEnum" DEFAULT 'manual' NOT NULL,
	"triggered_by_user" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_sync_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_name" varchar(200) NOT NULL,
	"taskType" "taskTypeEnum4" NOT NULL,
	"jdy_app_id" varchar(50),
	"jdy_form_id" varchar(50),
	"syncDirection" "syncDirectionEnum" DEFAULT 'jdy_to_grt' NOT NULL,
	"field_mapping" json,
	"filter_condition" json,
	"cron_expression" varchar(50),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"lastRunStatus" "lastRunStatusEnum1",
	"last_run_records" integer DEFAULT 0,
	"last_run_error" text,
	"total_sync_count" integer DEFAULT 0,
	"total_records_synced" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_user_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_username" varchar(100) NOT NULL,
	"jdy_name" varchar(100) NOT NULL,
	"jdy_departments" json,
	"jdy_status" integer DEFAULT 1,
	"jdy_integrate_id" varchar(100),
	"grt_user_id" integer,
	"grt_open_id" varchar(64),
	"syncStatus" "syncStatusEnum2" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"sync_error" text,
	"auto_create_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_function_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_code" varchar(50) NOT NULL,
	"role_name" varchar(100) NOT NULL,
	"role_level" integer NOT NULL,
	"department" varchar(50) NOT NULL,
	"m0_m12_roles" text,
	"required_skills" text,
	"customer_scenarios" text,
	"mission_statement" text,
	"next_level_requirement" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"knowledge_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"category" varchar(100),
	"subcategory" varchar(100),
	"contentType" "contentTypeEnum1" DEFAULT 'article',
	"content" text,
	"summary" text,
	"accessLevel" "accessLevelEnum1" DEFAULT 'public',
	"equipment_ids" json,
	"product_series" varchar(100),
	"tags" json,
	"attachments" json,
	"view_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"author_id" integer,
	"reviewer_id" integer,
	"reviewStatus" "reviewStatusEnum" DEFAULT 'draft',
	"published_at" timestamp,
	"expires_at" timestamp,
	"version" varchar(20) DEFAULT '1.0',
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"category" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"project_id" integer,
	"stage_code" varchar(10),
	"process_code" varchar(10),
	"source" varchar(100),
	"relevance_score" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_assessment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"historyId" varchar(50) NOT NULL,
	"employeeId" integer NOT NULL,
	"assessmentPeriod" varchar(20) NOT NULL,
	"assessmentType" "assessmentTypeEnum" NOT NULL,
	"assessmentContent" text,
	"score" numeric(5, 2),
	"assessedBy" integer,
	"assessedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_communication_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggestionId" varchar(50) NOT NULL,
	"employeeId" integer NOT NULL,
	"supervisorId" integer NOT NULL,
	"triggerReason" varchar(200) NOT NULL,
	"communicationType" "communicationTypeEnum" NOT NULL,
	"suggestedTime" timestamp,
	"suggestedContent" text,
	"talkingPoints" text,
	"urgency" "priorityEnum" DEFAULT 'medium',
	"requiresApproval" smallint DEFAULT 1,
	"approvalStatus" "approvalStatusEnum" DEFAULT 'pending',
	"approvedBy" integer,
	"approvedAt" timestamp,
	"actualTime" timestamp,
	"communicationNotes" text,
	"followUpActions" text,
	"effectivenessScore" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"kpiId" varchar(50) NOT NULL,
	"kpiName" varchar(100) NOT NULL,
	"kpiCategory" "kpiCategoryEnum" NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"calculationFormula" text,
	"targetValue" numeric(10, 2),
	"unit" varchar(20),
	"applicableRoles" text,
	"applicableDepartments" text,
	"isActive" smallint DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_effectiveness_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"trackingId" varchar(50) NOT NULL,
	"communicationId" varchar(50) NOT NULL,
	"employeeId" integer NOT NULL,
	"baselineScore" numeric(5, 2) NOT NULL,
	"targetImprovement" numeric(5, 2),
	"checkPoints" text,
	"actualImprovements" text,
	"finalScore" numeric(5, 2),
	"improvementRate" numeric(5, 2),
	"effectivenessAssessment" text,
	"furtherSuggestions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "kpi_email_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" varchar(50) NOT NULL,
	"emailType" "emailTypeEnum" NOT NULL,
	"recipientType" "recipientTypeEnum" NOT NULL,
	"recipientId" integer NOT NULL,
	"recipientEmail" varchar(100),
	"subject" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"relatedScoreId" varchar(50),
	"requiresApproval" smallint DEFAULT 0,
	"approvalStatus" "approvalStatusEnum1" DEFAULT 'not_required',
	"approvedBy" integer,
	"approvedAt" timestamp,
	"sentAt" timestamp,
	"deliveryStatus" "deliveryStatusEnum" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_score_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"scoreId" varchar(50) NOT NULL,
	"employeeId" integer NOT NULL,
	"periodType" "periodTypeEnum1" NOT NULL,
	"periodValue" varchar(20) NOT NULL,
	"totalScore" numeric(5, 2) NOT NULL,
	"scoreBreakdown" text,
	"scoreLevel" "scoreLevelEnum" NOT NULL,
	"comparisonData" text,
	"ranking" integer,
	"aiAnalysis" text,
	"aiSuggestions" text,
	"calculatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"userId" integer NOT NULL,
	"workDate" timestamp NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"hourlyRate" integer NOT NULL,
	"totalCost" bigint NOT NULL,
	"taskId" integer,
	"phaseCode" varchar(10),
	"description" varchar(500),
	"status" "statusEnum29" DEFAULT 'pending' NOT NULL,
	"reviewerId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_crm_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"crm_customer_id" integer,
	"action" varchar NOT NULL,
	"status" varchar DEFAULT 'success',
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_follow_up_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"assigned_to" integer,
	"taskType" varchar DEFAULT 'call',
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'pending',
	"priority" varchar DEFAULT 'medium',
	"due_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"total_rows" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"status" varchar DEFAULT 'processing',
	"error_details" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reminderType" varchar DEFAULT 'no_follow_up',
	"message" text,
	"is_read" boolean DEFAULT false,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"company_name" varchar(255),
	"source" varchar DEFAULT 'other',
	"status" varchar DEFAULT 'new',
	"priority" varchar DEFAULT 'medium',
	"estimated_amount" numeric(15, 2),
	"notes" text,
	"assigned_to" integer,
	"confidence_score" numeric(5, 2),
	"ai_analysis" text,
	"last_contact_at" timestamp,
	"next_follow_up_at" timestamp,
	"import_log_id" integer,
	"crm_customer_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_attachments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"meetingId" varchar(36) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" integer NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	"uploadedBy" integer NOT NULL,
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "roleEnum1" DEFAULT 'required' NOT NULL,
	"responseStatus" "responseStatusEnum" DEFAULT 'pending' NOT NULL,
	"attendanceStatus" "attendanceStatusEnum" DEFAULT 'unknown' NOT NULL,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"employee_id" varchar(36) NOT NULL,
	"employee_name" varchar(200),
	"speaking_time" integer,
	"intervention_count" integer,
	"decision_count" integer,
	"action_item_count" integer,
	"question_count" integer,
	"insight_count" integer,
	"contribution_score" real,
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_effectiveness_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" varchar(36) NOT NULL,
	"objective_achievement" real,
	"participation_balance" real,
	"decision_clarity" real,
	"actionable_outcomes" real,
	"overall_score" real,
	"ai_narrative" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_notes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"meetingId" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"editedBy" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"meetingId" varchar(36) NOT NULL,
	"userId" integer NOT NULL,
	"role" "roleEnum7" DEFAULT 'participant' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"leftAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "meeting_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"reminderMinutes" integer DEFAULT 30 NOT NULL,
	"reminderType" "notifyTypeEnum" DEFAULT 'system' NOT NULL,
	"isSent" smallint DEFAULT 0 NOT NULL,
	"sentAt" timestamp,
	"sendResult" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"typeId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"level" "levelEnum1" DEFAULT 'department' NOT NULL,
	"departmentId" integer,
	"projectId" integer,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"location" varchar(200),
	"onlineLink" varchar(500),
	"status" "statusEnum30" DEFAULT 'scheduled' NOT NULL,
	"organizerId" integer NOT NULL,
	"agenda" text,
	"minutes" text,
	"decisions" text,
	"actionItems" text,
	"isRecurring" smallint DEFAULT 0,
	"recurrenceRule" varchar(200),
	"parentId" integer,
	"reminderMinutes" integer DEFAULT 15,
	"reminderSent" smallint DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"level" "levelEnum1" DEFAULT 'department' NOT NULL,
	"frequency" "frequencyEnum1" DEFAULT 'weekly' NOT NULL,
	"defaultDuration" integer DEFAULT 60,
	"defaultStartTime" varchar(5),
	"defaultDayOfWeek" integer,
	"description" text,
	"agendaTemplate" text,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"channelId" varchar(36) NOT NULL,
	"createdBy" integer NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"status" "statusEnum30" DEFAULT 'scheduled' NOT NULL,
	"meetingType" "meetingTypeEnum" DEFAULT 'other' NOT NULL,
	"projectPhase" varchar(10),
	"revenueTarget" numeric(15, 2),
	"profitMargin" numeric(5, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "mes_sync" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"mes_work_order_id" varchar(100),
	"workOrderType" "workOrderTypeEnum" DEFAULT 'Production',
	"syncDirection" "syncDirectionEnum1" DEFAULT 'Bidirectional',
	"syncStatus" "syncStatusEnum3" DEFAULT 'Pending',
	"last_sync_at" timestamp,
	"sync_data" text,
	"writeback_data" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_task_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_code" varchar(50) NOT NULL,
	"work_order_id" integer NOT NULL,
	"taskType" varchar NOT NULL,
	"task_name" varchar(200) NOT NULL,
	"description" text,
	"sequence" integer DEFAULT 1,
	"status" varchar DEFAULT 'Pending',
	"assigned_worker_id" integer,
	"assigned_worker_name" varchar(100),
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"start_time" timestamp,
	"end_time" timestamp,
	"qcStatus" varchar,
	"qc_inspector_id" integer,
	"qc_inspector_name" varchar(100),
	"qc_time" timestamp,
	"qc_notes" text,
	"efficiency" numeric(5, 2),
	"bom_item_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mfg_task_items_task_code_unique" UNIQUE("task_code")
);
--> statement-breakpoint
CREATE TABLE "migration_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"moduleId" varchar(64) NOT NULL,
	"moduleName" varchar(200) NOT NULL,
	"sourceTable" varchar(200) NOT NULL,
	"targetTable" varchar(200) NOT NULL,
	"totalRecords" integer DEFAULT 0 NOT NULL,
	"migratedRecords" integer DEFAULT 0 NOT NULL,
	"validatedRecords" integer DEFAULT 0 NOT NULL,
	"errorRecords" integer DEFAULT 0 NOT NULL,
	"status" "statusEnum31" DEFAULT 'pending' NOT NULL,
	"priority" "priorityEnum" DEFAULT 'medium' NOT NULL,
	"assigneeId" integer,
	"notes" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_alert_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" varchar(64) NOT NULL,
	"model_type" varchar(50) NOT NULL,
	"accuracy_threshold" numeric(5, 4) DEFAULT '0.80',
	"latency_threshold" integer DEFAULT 5000,
	"calls_threshold" integer DEFAULT 100,
	"notification_channels" text,
	"is_enabled" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "model_alert_configs_alert_id_unique" UNIQUE("alert_id")
);
--> statement-breakpoint
CREATE TABLE "model_prediction_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"prediction_id" varchar(64) NOT NULL,
	"modelType" varchar NOT NULL,
	"model_version" varchar(20) NOT NULL,
	"input_data" text,
	"predicted_value" numeric(15, 4),
	"actual_value" numeric(15, 4),
	"confidence" numeric(5, 4),
	"latency" integer,
	"status" varchar DEFAULT 'pending',
	"error_margin" numeric(10, 4),
	"created_at" timestamp DEFAULT now(),
	"verified_at" timestamp,
	CONSTRAINT "model_prediction_records_prediction_id_unique" UNIQUE("prediction_id")
);
--> statement-breakpoint
CREATE TABLE "multi_language_service_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_report_id" integer NOT NULL,
	"language" varchar(10) NOT NULL,
	"report_content" text,
	"translation_engine" varchar(50),
	"translation_quality_score" numeric(5, 2),
	"human_reviewed" smallint DEFAULT 0,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naming_change_implementations" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"phase" "phaseEnum" NOT NULL,
	"executorId" integer,
	"executorName" varchar(100),
	"startTime" timestamp,
	"endTime" timestamp,
	"status" "statusEnum32" DEFAULT 'in_progress' NOT NULL,
	"result" text,
	"notes" text,
	"attachments" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naming_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestCode" varchar(30) NOT NULL,
	"requestType" "requestTypeEnum" NOT NULL,
	"ruleType" "ruleTypeEnum" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"reason" text NOT NULL,
	"impactScope" text,
	"requestorId" integer NOT NULL,
	"requestorName" varchar(100),
	"requestDate" timestamp DEFAULT now() NOT NULL,
	"status" "statusEnum33" DEFAULT 'pending' NOT NULL,
	"currentApproverId" integer,
	"approverName" varchar(100),
	"approvalDate" timestamp,
	"approvalNotes" text,
	"oldVersion" varchar(20),
	"newVersion" varchar(20),
	"effectiveDate" timestamp,
	"changeData" text,
	"attachments" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naming_change_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"testerId" integer,
	"testerName" varchar(100),
	"testDate" timestamp DEFAULT now() NOT NULL,
	"testEnvironment" varchar(50),
	"testItems" text,
	"testResult" "testResultEnum" NOT NULL,
	"issues" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naming_rule_approvers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"ruleType" "ruleTypeEnum1" NOT NULL,
	"changeType" "changeTypeEnum1" NOT NULL,
	"approvalLevel" integer DEFAULT 1 NOT NULL,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"remark" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naming_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"versionCode" varchar(20) NOT NULL,
	"versionName" varchar(100),
	"ruleType" "ruleTypeEnum" NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"changeType" "changeTypeEnum2" NOT NULL,
	"changeDescription" text,
	"changeRequestId" integer,
	"isCurrent" smallint DEFAULT 0 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_sessions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"session_id" varchar(50) NOT NULL,
	"opportunity_id" bigint,
	"client_agent_id" varchar(100) NOT NULL,
	"client_company" varchar(200),
	"our_agent_id" varchar(100) DEFAULT 'grt-sales-agent' NOT NULL,
	"product_id" bigint,
	"product_name" varchar(200),
	"current_round" integer DEFAULT 1 NOT NULL,
	"max_rounds" integer DEFAULT 10 NOT NULL,
	"our_offer_price" numeric(12, 2),
	"client_counter_offer" numeric(12, 2),
	"our_bottom_price" numeric(12, 2),
	"our_target_price" numeric(12, 2),
	"sentiment_analysis" json,
	"zopa_range" json,
	"negotiation_history" json,
	"strategy_used" varchar(100),
	"status" varchar DEFAULT 'initializing' NOT NULL,
	"final_price" numeric(12, 2),
	"human_override_required" boolean DEFAULT false NOT NULL,
	"human_override_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "negotiation_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "notebook_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notebook_id" bigint NOT NULL,
	"entryType" "entryTypeEnum" NOT NULL,
	"content" text,
	"file_url" varchar(500),
	"file_name" varchar(200),
	"file_type" varchar(50),
	"file_size" integer,
	"voice_duration" integer,
	"voice_transcript" text,
	"ocr_result" text,
	"created_by" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"is_ai_processed" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "notification_provider_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerType" varchar NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"region" varchar DEFAULT 'Global',
	"configuration" text,
	"rate_limit_per_minute" integer DEFAULT 60,
	"rate_limit_per_day" integer DEFAULT 10000,
	"current_usage_minute" integer DEFAULT 0,
	"current_usage_day" integer DEFAULT 0,
	"last_reset_minute" timestamp,
	"last_reset_day" timestamp,
	"healthStatus" varchar DEFAULT 'healthy',
	"last_health_check" timestamp,
	"failure_count" integer DEFAULT 0,
	"is_active" smallint DEFAULT 1,
	"is_primary" smallint DEFAULT 0,
	"fallback_provider_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationLogId" integer NOT NULL,
	"userId" integer NOT NULL,
	"userName" varchar(100),
	"channel" "channelEnum" NOT NULL,
	"status" "statusEnum34" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"deliveredAt" timestamp,
	"readAt" timestamp,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"offboarding_id" integer NOT NULL,
	"approvalLevel" "approvalLevelEnum" NOT NULL,
	"approval_order" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"approver_name" varchar(100) NOT NULL,
	"approver_role" varchar(100),
	"decision" "decisionEnum" DEFAULT 'pending' NOT NULL,
	"comments" text,
	"checklist_items" text,
	"submitted_at" timestamp,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_data_query_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_user_id" integer NOT NULL,
	"queryType" "queryTypeEnum" NOT NULL,
	"queryPeriod" "periodTypeEnum2" NOT NULL,
	"target_employee_id" integer NOT NULL,
	"is_offboarded" smallint DEFAULT 1 NOT NULL,
	"offboarding_date" date,
	"result_count" integer DEFAULT 0,
	"query_params" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding_handover_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"offboarding_id" integer NOT NULL,
	"category" "categoryEnum7" NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"description" text,
	"priority" "priorityEnum1" DEFAULT 'medium' NOT NULL,
	"related_project_id" integer,
	"related_client_id" integer,
	"handover_to_id" integer,
	"handover_to_name" varchar(100),
	"status" "statusEnum87" DEFAULT 'pending' NOT NULL,
	"completion_date" date,
	"verified_by" integer,
	"verified_at" timestamp,
	"notes" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_code" varchar(50) NOT NULL,
	"part_name" varchar(200) NOT NULL,
	"category" varchar(100),
	"subcategory" varchar(100),
	"description" text,
	"specifications" json,
	"unit_of_measure" varchar(20),
	"base_price" numeric(10, 2),
	"cost_price" numeric(10, 2),
	"client_tier_prices" json,
	"part_code_rules" json,
	"supplier_id" integer,
	"lead_time_days" integer,
	"min_order_quantity" integer DEFAULT 1,
	"stock_quantity" integer DEFAULT 0,
	"reorder_level" integer DEFAULT 0,
	"compatible_equipment" json,
	"image_url" varchar(500),
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_attribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"offboarding_id" integer NOT NULL,
	"kpi_name" varchar(200) NOT NULL,
	"kpi_category" varchar(100),
	"period" varchar(50) NOT NULL,
	"periodType" "periodTypeEnum2" NOT NULL,
	"attributionType" "attributionTypeEnum" NOT NULL,
	"original_employee_id" integer NOT NULL,
	"original_employee_name" varchar(100) NOT NULL,
	"original_contribution_percent" integer DEFAULT 100,
	"successor_id" integer,
	"successor_name" varchar(100),
	"successor_contribution_percent" integer DEFAULT 0,
	"target_value" numeric(15, 2),
	"actual_value" numeric(15, 2),
	"unit" varchar(50),
	"confirmed_by" integer,
	"confirmed_by_name" varchar(100),
	"confirmed_at" timestamp,
	"confirmation_notes" text,
	"data_source_note" text,
	"status" "statusEnum88" DEFAULT 'pending_confirmation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_review_email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"reminderId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"emailSubject" varchar(200) NOT NULL,
	"recipients" json NOT NULL,
	"emailContent" text,
	"sendStatus" "sendStatusEnum" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_traces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"metric_code" varchar(100) NOT NULL,
	"metric_name" varchar(200),
	"value" real NOT NULL,
	"unit" varchar(50),
	"source_type" varchar(50),
	"source_id" integer,
	"source_description" text,
	"period" varchar(20),
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_audit_logs_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"actionType" "actionTypeEnum" NOT NULL,
	"previous_state" json,
	"new_state" json,
	"performed_by" integer,
	"reason" text,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_change_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"changeType" "changeTypeEnum3" NOT NULL,
	"target_user_id" integer,
	"target_role_id" varchar(50),
	"target_department_id" varchar(50),
	"old_value" text,
	"new_value" text,
	"changed_by" integer NOT NULL,
	"changed_by_name" varchar(100),
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupCode" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "typeEnum7" NOT NULL,
	"departmentId" varchar(50),
	"description" text,
	"isActive" smallint DEFAULT 1 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" varchar(50) NOT NULL,
	"planId" varchar(50) NOT NULL,
	"sourceType" "sourceTypeEnum1" NOT NULL,
	"sourceReferenceId" varchar(50),
	"sourceSummary" text,
	"weight" numeric(3, 2) DEFAULT '1.00',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_execution_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"noteId" varchar(50) NOT NULL,
	"planId" varchar(50) NOT NULL,
	"originalPlan" text,
	"actualExecution" text,
	"deviationReason" text,
	"lessonsLearned" text,
	"suggestions" text,
	"impactAssessment" text,
	"asNewPlanInput" smallint DEFAULT 1,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"planId" varchar(50) NOT NULL,
	"planType" "planTypeEnum1" NOT NULL,
	"planPeriod" varchar(20) NOT NULL,
	"ownerId" integer NOT NULL,
	"departmentId" integer,
	"parentPlanId" varchar(50),
	"title" varchar(200) NOT NULL,
	"objectives" text,
	"tasks" text,
	"resources" text,
	"risks" text,
	"status" "statusEnum35" DEFAULT 'draft' NOT NULL,
	"approvalStatus" "approvalStatusEnum1" DEFAULT 'not_required',
	"approvedBy" integer,
	"approvedAt" timestamp,
	"startDate" date,
	"endDate" date,
	"completionRate" numeric(5, 2) DEFAULT '0',
	"aiSummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"planId" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"priority" "priorityEnum2" DEFAULT 'P2' NOT NULL,
	"taskType" "taskTypeEnum1" DEFAULT 'work' NOT NULL,
	"sourceType" "sourceTypeEnum2" DEFAULT 'manual',
	"sourceId" varchar(50),
	"ownerId" integer NOT NULL,
	"collaborators" text,
	"estimatedHours" numeric(6, 2),
	"actualHours" numeric(6, 2),
	"dueDate" timestamp,
	"completedAt" timestamp,
	"status" "statusEnum36" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"deliverables" text,
	"dependencies" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_tracking_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"trackingId" varchar(50) NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"trackingSource" "trackingSourceEnum" NOT NULL,
	"sourceReference" varchar(200),
	"trackingContent" text NOT NULL,
	"progressUpdate" integer,
	"evidenceFiles" text,
	"recordedBy" integer NOT NULL,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"version_id" integer,
	"items" text,
	"engineerConfirm" "engineerConfirmEnum" DEFAULT 'Pending',
	"engineer_confirm_by" integer,
	"engineer_confirm_at" timestamp,
	"engineer_notes" text,
	"procurementConfirm" "engineerConfirmEnum" DEFAULT 'Pending',
	"procurement_confirm_by" integer,
	"procurement_confirm_at" timestamp,
	"procurement_notes" text,
	"final_po_ref" varchar(100),
	"status" "statusEnum85" DEFAULT 'Draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_notebooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_type" varchar(50) NOT NULL,
	"process_id" varchar(100) NOT NULL,
	"process_step" varchar(50),
	"title" varchar(200),
	"created_by" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" "statusEnum37" DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "process_notes" (
	"id" bigint PRIMARY KEY NOT NULL,
	"note_id" varchar(50) NOT NULL,
	"user_id" bigint NOT NULL,
	"project_id" bigint,
	"project_phase" varchar(20),
	"task_id" bigint,
	"title" varchar(200),
	"problem_desc" text,
	"problem_category" varchar(100),
	"solution_desc" text,
	"solutionEffectiveness" varchar DEFAULT 'pending' NOT NULL,
	"ai_extracted_knowledge" json,
	"related_skills" json,
	"attachments" json,
	"tags" json,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "process_notes_note_id_unique" UNIQUE("note_id")
);
--> statement-breakpoint
CREATE TABLE "process_parameter_compliance" (
	"id" serial PRIMARY KEY NOT NULL,
	"parameter_code" varchar(64) NOT NULL,
	"parameter_name" varchar(200) NOT NULL,
	"parameterCategory" "parameterCategoryEnum" NOT NULL,
	"complianceRangeType" "complianceRangeTypeEnum" NOT NULL,
	"public_range_description" varchar(500),
	"internal_range_min" text,
	"internal_range_max" text,
	"encryption_key_id" varchar(64),
	"related_standard_id" integer,
	"verification_enabled" smallint DEFAULT 1,
	"zkp_circuit_id" varchar(64),
	"is_active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateId" varchar(50) NOT NULL,
	"templateName" varchar(200) NOT NULL,
	"workpieceCategory" "workpieceCategoryEnum" DEFAULT 'other',
	"equipmentSeries" varchar(20),
	"processFlow" text NOT NULL,
	"defaultParameters" text,
	"applicableConditions" text,
	"isActive" smallint DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_code" varchar(50) NOT NULL,
	"product_name" varchar(300) NOT NULL,
	"product_name_en" varchar(300),
	"bom_code" varchar(50),
	"bom_id" integer,
	"material_cost" numeric(14, 2) DEFAULT '0',
	"labor_cost" numeric(14, 2) DEFAULT '0',
	"overhead_cost" numeric(14, 2) DEFAULT '0',
	"other_cost" numeric(14, 2) DEFAULT '0',
	"base_price" numeric(14, 2) DEFAULT '0',
	"margin_percent" numeric(6, 2),
	"equipment_type" varchar(100),
	"description" text,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_ai_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"knowledgeType" "knowledgeTypeEnum1" NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_zh" varchar(200),
	"content" text NOT NULL,
	"content_zh" text,
	"priority" "priorityEnum6" DEFAULT 'MEDIUM',
	"applicable_conditions" text,
	"related_files" text,
	"tags" text,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_dashboard_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_code" varchar(50) NOT NULL,
	"config_name" varchar(200) NOT NULL,
	"displayType" varchar DEFAULT 'workshop_board',
	"refresh_interval" integer DEFAULT 30,
	"show_metrics" text,
	"layout" text,
	"filter_workshop" varchar(100),
	"filter_team" varchar(100),
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_dashboard_configs_config_code_unique" UNIQUE("config_code")
);
--> statement-breakpoint
CREATE TABLE "production_pull_signals" (
	"id" bigint PRIMARY KEY NOT NULL,
	"signal_id" varchar(50) NOT NULL,
	"project_id" bigint,
	"order_id" bigint,
	"upstream_gate" varchar(20) NOT NULL,
	"trigger_event" varchar(200) NOT NULL,
	"trigger_source" varchar(100),
	"trigger_data" json,
	"target_aas_id" varchar(100),
	"target_device_name" varchar(200),
	"action_payload" json NOT NULL,
	"priority" varchar DEFAULT 'normal' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"acknowledged_at" timestamp,
	"completed_at" timestamp,
	"device_response" json,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_pull_signals_signal_id_unique" UNIQUE("signal_id")
);
--> statement-breakpoint
CREATE TABLE "production_stage_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"stage_name" varchar(100) NOT NULL,
	"stage_name_zh" varchar(100) NOT NULL,
	"stage_order" integer NOT NULL,
	"default_duration" integer DEFAULT 8,
	"responsibleRole" "responsibleRoleEnum" NOT NULL,
	"description" text,
	"description_zh" text,
	"sop_document" varchar(500),
	"required_certifications" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_stage_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"changed_by" integer,
	"changed_by_name" varchar(100),
	"change_reason" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_definition_id" integer NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"status" "statusEnum78" DEFAULT 'Pending' NOT NULL,
	"planned_hours" numeric(10, 2) DEFAULT '0',
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"assigned_user_id" integer,
	"assigned_user_name" varchar(100),
	"completion_percentage" integer DEFAULT 0,
	"notes" text,
	"ai_insights" text,
	"context_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_code" varchar(50) NOT NULL,
	"project_id" integer,
	"product_name" varchar(200) NOT NULL,
	"product_model" varchar(100),
	"quantity" integer DEFAULT 1 NOT NULL,
	"priority" varchar DEFAULT 'Normal',
	"status" varchar DEFAULT 'Draft',
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"estimated_hours" numeric(10, 2),
	"actual_hours" numeric(10, 2),
	"completion_rate" numeric(5, 2) DEFAULT '0.00',
	"assigned_team" varchar(100),
	"supervisor_id" integer,
	"notes" text,
	"bom_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_work_orders_work_order_code_unique" UNIQUE("work_order_code")
);
--> statement-breakpoint
CREATE TABLE "project_access_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"permissionId" varchar(50) NOT NULL,
	"accountId" varchar(50) NOT NULL,
	"projectId" integer NOT NULL,
	"accessLevel" "accessLevelEnum" DEFAULT 'view',
	"allowedModules" text,
	"dataScope" text,
	"grantedAt" timestamp DEFAULT now(),
	"expiresAt" timestamp,
	"grantedBy" integer
);
--> statement-breakpoint
CREATE TABLE "project_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"budgetYear" integer NOT NULL,
	"budgetMonth" integer,
	"budgetAmount" bigint NOT NULL,
	"usedAmount" bigint NOT NULL,
	"version" varchar(20) DEFAULT 'v1',
	"status" "statusEnum38" DEFAULT 'draft' NOT NULL,
	"approverId" integer,
	"approvedAt" timestamp,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_conversion_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tempProjectCode" varchar(20) NOT NULL,
	"formalProjectCode" varchar(20) NOT NULL,
	"conversionDate" timestamp NOT NULL,
	"contractNo" varchar(50),
	"numberingVersion" varchar(20) NOT NULL,
	"remark" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_digital_twins" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"twinCode" varchar(50) NOT NULL,
	"projectType" "projectTypeEnum" DEFAULT 'standard',
	"currentPhase" varchar(50),
	"healthScore" integer DEFAULT 100,
	"progressModel" text,
	"costModel" text,
	"qualityModel" text,
	"resourceModel" text,
	"riskModel" text,
	"deliveryModel" text,
	"syncStatus" "syncStatusEnum" DEFAULT 'synced',
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"phaseCode" varchar(10),
	"name" varchar(200) NOT NULL,
	"type" "typeEnum8" DEFAULT 'other' NOT NULL,
	"version" varchar(20),
	"filePath" text,
	"fileSize" integer,
	"mimeType" varchar(100),
	"uploaderId" integer,
	"description" text,
	"status" "statusEnum39" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_gates" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"phaseCode" varchar(10) NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" "statusEnum40" DEFAULT 'pending' NOT NULL,
	"plannedDate" timestamp,
	"actualDate" timestamp,
	"approverId" integer,
	"approvalComment" text,
	"attachments" text,
	"checklist" text,
	"checklistCompleted" integer DEFAULT 0,
	"checklistTotal" integer DEFAULT 0,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"health_score" integer NOT NULL,
	"issue_count" integer DEFAULT 0,
	"critical_count" integer DEFAULT 0,
	"warning_count" integer DEFAULT 0,
	"info_count" integer DEFAULT 0,
	"issues_json" text,
	"scanned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"twinId" integer,
	"projectId" integer,
	"knowledgeType" "knowledgeTypeEnum" NOT NULL,
	"category" varchar(100),
	"title" varchar(200) NOT NULL,
	"content" text,
	"context" text,
	"applicability" text,
	"useCount" integer DEFAULT 0,
	"rating" numeric(3, 2),
	"contributedBy" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_member_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"bu_id" integer,
	"performance_score" numeric(3, 2),
	"capability_score" numeric(3, 2),
	"collaboration_score" numeric(3, 2),
	"innovation_score" numeric(3, 2),
	"overall_score" numeric(3, 2),
	"evaluation_date" timestamp,
	"evaluator_id" integer,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"phaseCode" varchar(10),
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" "typeEnum9" DEFAULT 'deliverable' NOT NULL,
	"plannedDate" timestamp,
	"actualDate" timestamp,
	"status" "statusEnum41" DEFAULT 'pending' NOT NULL,
	"ownerId" integer,
	"weight" integer DEFAULT 1,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_number_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" varchar(10) NOT NULL,
	"currentMax" integer DEFAULT 0 NOT NULL,
	"nextAvailable" integer DEFAULT 1 NOT NULL,
	"formatDigits" integer DEFAULT 3 NOT NULL,
	"numberingVersion" varchar(20) DEFAULT 'V1.0' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_optimization_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"twinId" integer NOT NULL,
	"suggestionType" "suggestionTypeEnum1" NOT NULL,
	"priority" "priorityEnum" DEFAULT 'medium',
	"title" varchar(200) NOT NULL,
	"description" text,
	"expectedImpact" text,
	"implementationEffort" "implementationEffortEnum" DEFAULT 'medium',
	"supportingData" text,
	"status" "statusEnum42" DEFAULT 'pending',
	"decisionBy" integer,
	"decisionReason" text,
	"createdAt" timestamp DEFAULT now(),
	"decidedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"phaseCode" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"nameEn" varchar(100),
	"description" text,
	"sequence" integer NOT NULL,
	"isKeyPhase" "isKeyPersonEnum" DEFAULT 'no',
	"defaultDuration" integer,
	"color" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"twinId" integer NOT NULL,
	"predictionType" "predictionTypeEnum" NOT NULL,
	"predictionModel" varchar(100),
	"inputData" text,
	"predictionResult" text,
	"confidenceLevel" numeric(3, 2),
	"actualResult" text,
	"accuracyScore" numeric(3, 2),
	"createdAt" timestamp DEFAULT now(),
	"validatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_risk_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"twinId" integer NOT NULL,
	"alertCode" varchar(50) NOT NULL,
	"riskCategory" "riskCategoryEnum" NOT NULL,
	"severity" "priorityEnum1" DEFAULT 'medium',
	"description" text,
	"triggerConditions" text,
	"currentIndicators" text,
	"recommendedActions" text,
	"status" "statusEnum43" DEFAULT 'active',
	"acknowledgedBy" integer,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"bu_id" integer,
	"delivery_score" numeric(3, 2),
	"quality_score" numeric(3, 2),
	"cost_score" numeric(3, 2),
	"customer_satisfaction" numeric(3, 2),
	"overall_score" numeric(3, 2),
	"evaluation_date" timestamp,
	"evaluator_id" integer,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stage_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"actor" varchar(100),
	"details" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_stage_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"task_name" varchar(500) NOT NULL,
	"assignee" varchar(100),
	"status" varchar(50) DEFAULT 'pending',
	"due_date" timestamp,
	"completed_at" timestamp,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_stages_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stageCode" "currentStageEnum1" NOT NULL,
	"stage_name" varchar(100),
	"status" "statusEnum83" DEFAULT 'NotStarted',
	"owner" integer,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"input_json" text,
	"output_json" text,
	"tasks_json" text,
	"audit_log" text,
	"notes" text,
	"completion_percent" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_state_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"twinId" integer NOT NULL,
	"snapshotType" "snapshotTypeEnum" DEFAULT 'daily',
	"snapshotData" text,
	"deltaFromPrevious" text,
	"keyMetrics" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskCode" varchar(32),
	"projectId" integer NOT NULL,
	"milestoneId" integer,
	"phaseCode" varchar(10),
	"parentTaskId" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" "typeEnum10" DEFAULT 'task' NOT NULL,
	"priority" "priorityEnum1" DEFAULT 'medium' NOT NULL,
	"status" "statusEnum44" DEFAULT 'backlog' NOT NULL,
	"plannedStartDate" timestamp,
	"plannedEndDate" timestamp,
	"actualStartDate" timestamp,
	"actualEndDate" timestamp,
	"estimatedHours" integer,
	"actualHours" integer,
	"completionPercent" integer DEFAULT 0,
	"assigneeId" integer,
	"acceptanceCriteria" text,
	"attachments" text,
	"remark" text,
	"jiandaoyunId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "roleEnum2" DEFAULT 'member' NOT NULL,
	"responsibility" text,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"leftAt" timestamp,
	"status" "statusEnum12" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"version_code" varchar(20) NOT NULL,
	"base_project_code" varchar(50),
	"delta_input" text,
	"version_json" text,
	"changes_summary" text,
	"status" "statusEnum84" DEFAULT 'Draft',
	"created_by" integer,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"activated_by" integer,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectCode" varchar(32),
	"name" varchar(200) NOT NULL,
	"shortName" varchar(100),
	"customerId" integer,
	"opportunityId" integer,
	"type" "typeEnum11" DEFAULT 'standard' NOT NULL,
	"status" "statusEnum45" DEFAULT 'draft' NOT NULL,
	"currentPhase" varchar(10) DEFAULT 'M0',
	"priority" "priorityEnum1" DEFAULT 'medium' NOT NULL,
	"plannedStartDate" timestamp,
	"plannedEndDate" timestamp,
	"actualStartDate" timestamp,
	"actualEndDate" timestamp,
	"budget" integer,
	"actualCost" integer,
	"contractAmount" integer,
	"managerId" integer,
	"description" text,
	"objectives" text,
	"scope" text,
	"riskLevel" "riskLevelEnum" DEFAULT 'medium',
	"healthStatus" "healthStatusEnum" DEFAULT 'green',
	"completionPercent" integer DEFAULT 0,
	"remark" text,
	"jiandaoyunId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"project_name" varchar(200) NOT NULL,
	"customer_id" integer NOT NULL,
	"currentStage" "currentStageEnum1" DEFAULT 'M0',
	"pm" integer,
	"tech_leader" integer,
	"sales_owner" integer,
	"service_owner" integer,
	"scene_snapshot" text,
	"decision_snapshot" text,
	"active_version" varchar(20),
	"status" "statusEnum82" DEFAULT 'Draft',
	"priority" "priorityEnum2" DEFAULT 'P2',
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"budget" numeric(15, 2),
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_capability_showcase" (
	"id" serial PRIMARY KEY NOT NULL,
	"showcase_code" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_en" varchar(200),
	"slug" varchar(200) NOT NULL,
	"meta_description" varchar(500),
	"meta_keywords" varchar(500),
	"category" "categoryEnum4" NOT NULL,
	"summary" text,
	"summary_en" text,
	"content" text,
	"content_en" text,
	"featured_image" varchar(500),
	"gallery" text,
	"videos" text,
	"related_capability_ids" text,
	"public_stats" text,
	"status" "statusEnum57" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"sort_order" integer DEFAULT 0,
	"is_featured" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_queue" (
	"id" bigint PRIMARY KEY NOT NULL,
	"draft_id" bigint NOT NULL,
	"target_group_id" bigint NOT NULL,
	"content" text NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"bridge_response" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qc_inspection_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_code" varchar(50) NOT NULL,
	"task_id" integer NOT NULL,
	"work_order_id" integer NOT NULL,
	"inspectionType" varchar NOT NULL,
	"inspector_id" integer NOT NULL,
	"inspector_name" varchar(100),
	"inspection_time" timestamp NOT NULL,
	"result" varchar NOT NULL,
	"defect_type" varchar(100),
	"defect_description" text,
	"defect_images" text,
	"corrective_action" text,
	"rework_required" smallint DEFAULT 0,
	"rework_task_id" integer,
	"checklist_items" text,
	"quality_score" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "qc_inspection_records_inspection_code_unique" UNIQUE("inspection_code")
);
--> statement-breakpoint
CREATE TABLE "qualification_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"certificate_code" varchar(50) NOT NULL,
	"certificate_name" varchar(200) NOT NULL,
	"employee_id" integer NOT NULL,
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"issuing_authority" varchar(200),
	"certificateLevel" "certificateLevelEnum" DEFAULT 'basic',
	"equipment_types" text,
	"unlocked_permissions" text,
	"verificationStatus" "verificationStatusEnum" DEFAULT 'pending',
	"digital_signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"qualificationType" varchar NOT NULL,
	"qualification_name" varchar(200) NOT NULL,
	"issuing_authority" varchar(200),
	"document_number" varchar(100),
	"issue_date" date,
	"expiry_date" date,
	"country_scope" varchar(200),
	"document_url" varchar(500),
	"verificationStatus" varchar DEFAULT 'pending',
	"verified_by" integer,
	"verified_at" timestamp,
	"reminder_days" integer DEFAULT 30,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_defect_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lock_id" varchar(50) NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_url" varchar(1000) NOT NULL,
	"file_type" varchar(50),
	"file_size" integer,
	"description" text,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_learning_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"learningId" varchar(50) NOT NULL,
	"quotationId" varchar(50) NOT NULL,
	"learningType" "learningTypeEnum" NOT NULL,
	"learningContent" text NOT NULL,
	"keyFindings" text,
	"priceDeviationAnalysis" text,
	"isApplied" smallint DEFAULT 0,
	"appliedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendationId" varchar(50) NOT NULL,
	"userId" integer NOT NULL,
	"solutionId" varchar(50),
	"inputParameters" text NOT NULL,
	"costBreakdown" text NOT NULL,
	"priceRecommendations" text NOT NULL,
	"selectedStrategy" varchar(50),
	"finalQuotationId" varchar(50),
	"feedbackScore" integer,
	"feedbackComment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_routing_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"region" varchar NOT NULL,
	"sms_provider_id" integer,
	"whatsapp_provider_id" integer,
	"email_provider_id" integer,
	"preferred_language" varchar(10) DEFAULT 'en',
	"phone_prefix" varchar(10),
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regional_sales_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"sales_target" numeric(15, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"focus_scenarios" text,
	"notes" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_staff_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_config_id" integer NOT NULL,
	"staffType" "staffTypeEnum" NOT NULL,
	"headcount" integer NOT NULL,
	"location" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar DEFAULT 'custom',
	"report_types" text NOT NULL,
	"layout" text,
	"styling" text,
	"filters" text,
	"is_default" smallint DEFAULT 0,
	"is_public" smallint DEFAULT 0,
	"created_by" integer,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_adequacy_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_config_id" integer NOT NULL,
	"check_date" date NOT NULL,
	"current_revenue" numeric(15, 2),
	"required_support" integer,
	"actual_support" integer,
	"support_ratio" numeric(5, 2),
	"status" "statusEnum71" NOT NULL,
	"alert_message" text,
	"hiring_plan_triggered" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"recipient_role" varchar(50) NOT NULL,
	"recipient_user_id" integer,
	"risk_level" varchar(20) NOT NULL,
	"title" varchar(300) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_permissions_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"roleCode" "roleEnum5" NOT NULL,
	"module_code" varchar(50) NOT NULL,
	"module_name" varchar(100) NOT NULL,
	"permissionType" "permissionTypeEnum" NOT NULL,
	"is_allowed" smallint DEFAULT 0 NOT NULL,
	"conditions" json,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" varchar(200) NOT NULL,
	"description" text,
	"origin_city" varchar(100) NOT NULL,
	"destination_city" varchar(100) NOT NULL,
	"destination_country_id" integer,
	"customer_id" integer,
	"site_id" integer,
	"typical_duration" integer,
	"recommended_itinerary" text,
	"preferred_flights" text,
	"preferred_hotels" text,
	"preferred_transport" text,
	"estimated_budget" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculationCode" varchar(50) NOT NULL,
	"employeeId" integer,
	"candidateId" integer,
	"department" varchar(50) NOT NULL,
	"positionGrade" varchar(20),
	"calculationType" "calculationTypeEnum" NOT NULL,
	"baseSalary" numeric(12, 2) NOT NULL,
	"performanceSalary" numeric(12, 2),
	"bonus" numeric(12, 2),
	"benefits" numeric(12, 2),
	"monthlyTotal" numeric(12, 2) NOT NULL,
	"annualTotal" numeric(12, 2) NOT NULL,
	"calculationParams" json,
	"salaryBreakdown" json,
	"marketComparison" "marketComparisonEnum",
	"remarks" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sat_site_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"condition_type" varchar(50) NOT NULL,
	"condition_name" varchar(255) NOT NULL,
	"expected_value" varchar(100),
	"actual_value" varchar(100),
	"unit" varchar(20),
	"is_within_spec" boolean,
	"notes" text,
	"measured_by" varchar(100),
	"measured_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskCode" varchar(50) NOT NULL,
	"taskName" varchar(100) NOT NULL,
	"taskType" "taskTypeEnum2" NOT NULL,
	"cronExpression" varchar(50) NOT NULL,
	"taskConfig" json,
	"isEnabled" smallint DEFAULT 1 NOT NULL,
	"lastRunAt" timestamp,
	"nextRunAt" timestamp,
	"lastRunStatus" "lastRunStatusEnum",
	"lastRunResult" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"severity" "riskLevelEnum" DEFAULT 'medium' NOT NULL,
	"user_id" integer,
	"user_name" varchar(100),
	"ip_address" varchar(50) NOT NULL,
	"user_agent" text,
	"action" varchar(500) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar(100),
	"result" "resultEnum" DEFAULT 'success' NOT NULL,
	"details" text,
	"request_path" varchar(500),
	"request_method" varchar(10),
	"fingerprint" varchar(64) NOT NULL,
	"chain_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"configType" "configTypeEnum" DEFAULT 'string' NOT NULL,
	"description" varchar(500),
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensitive_data_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"data_type" varchar(50) NOT NULL,
	"data_id" varchar(100),
	"action" varchar(50) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"request_path" varchar(500),
	"request_data" text,
	"response_summary" text,
	"accessResult" "accessResultEnum" DEFAULT 'allowed',
	"denial_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sensitive_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(100) NOT NULL,
	"category" "categoryEnum5" DEFAULT 'other' NOT NULL,
	"severity" "riskLevelEnum" DEFAULT 'medium' NOT NULL,
	"matchType" "matchTypeEnum" DEFAULT 'contains' NOT NULL,
	"regex_pattern" varchar(500),
	"action" "actionEnum1" DEFAULT 'block' NOT NULL,
	"replacement_text" varchar(200),
	"is_active" smallint DEFAULT 1 NOT NULL,
	"trigger_count" integer DEFAULT 0,
	"last_triggered_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"seoId" varchar(50) NOT NULL,
	"pageType" varchar(50) NOT NULL,
	"pageId" varchar(50),
	"title" varchar(200),
	"description" varchar(500),
	"keywords" text,
	"canonicalUrl" varchar(500),
	"ogTitle" varchar(200),
	"ogDescription" varchar(500),
	"ogImage" varchar(500),
	"structuredData" text,
	"status" "statusEnum12" DEFAULT 'active',
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_log_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_log_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_type" varchar(50),
	"file_size" integer,
	"description" text,
	"captured_at" timestamp,
	"gps_latitude" varchar(20),
	"gps_longitude" varchar(20),
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_report_consensus" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_report_id" integer NOT NULL,
	"participantRole" "participantRoleEnum" NOT NULL,
	"participant_id" integer,
	"participant_name" varchar(100),
	"confirmationStatus" "confirmationStatusEnum" DEFAULT 'pending',
	"confirmation_content" text,
	"rejection_reason" text,
	"confirmed_at" timestamp,
	"reminder_sent_at" timestamp,
	"reminder_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"service_task_id" integer NOT NULL,
	"customer_id" integer,
	"equipment_id" integer,
	"reportType" "reportTypeEnum" NOT NULL,
	"summary" text,
	"work_performed" text,
	"findings" text,
	"recommendations" text,
	"parts_used" json,
	"labor_hours" numeric(6, 2),
	"photos" json,
	"engineer_id" integer,
	"status" "statusEnum55" DEFAULT 'draft',
	"supervisor_id" integer,
	"supervisor_approved_at" timestamp,
	"supervisor_notes" text,
	"customer_confirmation_url" varchar(500),
	"customer_confirmed_at" timestamp,
	"customer_signature" text,
	"customer_rating" integer,
	"customer_feedback" text,
	"invoice_id" integer,
	"invoice_issued_at" timestamp,
	"ai_generated_content" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_code" varchar(50) NOT NULL,
	"taskType" "taskTypeEnum3" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"customer_id" integer,
	"equipment_id" integer,
	"project_id" integer,
	"assignee_id" integer,
	"supervisor_id" integer,
	"team_members" json,
	"priority" "priorityEnum5" DEFAULT 'medium',
	"status" "statusEnum51" DEFAULT 'draft',
	"customerConfirmationStatus" "customerConfirmationStatusEnum" DEFAULT 'pending',
	"scheduled_start_date" timestamp,
	"scheduled_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"estimated_hours" numeric(6, 2),
	"actual_hours" numeric(6, 2),
	"location" varchar(500),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_issue_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"delivery_id" integer NOT NULL,
	"project_id" integer,
	"issueCategory" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"photo_evidence" text,
	"video_evidence" text,
	"severity" varchar DEFAULT 'Medium',
	"priority" varchar DEFAULT 'P2',
	"resolution_sop" text,
	"ai_analysis_result" text,
	"ai_suggested_at" timestamp,
	"actual_resolution" text,
	"root_cause" text,
	"preventive_measure" text,
	"reported_by_id" integer,
	"reported_by_name" varchar(100),
	"assigned_to_id" integer,
	"assigned_to_name" varchar(100),
	"status" varchar DEFAULT 'Open',
	"related_design_package_id" integer,
	"related_bom_item_id" integer,
	"reported_at" timestamp DEFAULT now(),
	"target_resolution_date" timestamp,
	"actual_resolution_date" timestamp,
	"estimated_cost" numeric(12, 2),
	"actual_cost" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_issue_tickets_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "site_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"site_name" varchar(200) NOT NULL,
	"site_address" text,
	"country_id" integer,
	"access_requirements" text,
	"safety_requirements" text,
	"required_certifications" text,
	"dresscode" varchar(200),
	"parking_info" text,
	"contact_person" varchar(100),
	"contact_phone" varchar(50),
	"contact_email" varchar(200),
	"special_notes" text,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skill_capsules" (
	"id" bigint PRIMARY KEY NOT NULL,
	"skill_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"owner_did" varchar(200) NOT NULL,
	"owner_id" bigint,
	"validation_proof" text,
	"proofType" varchar DEFAULT 'self_declared' NOT NULL,
	"royalty_rate" numeric(5, 2) DEFAULT '0.00',
	"usage_count" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"domain" varchar DEFAULT 'T' NOT NULL,
	"tags" json,
	"evidence_ids" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_capsules_skill_id_unique" UNIQUE("skill_id")
);
--> statement-breakpoint
CREATE TABLE "smart_contracts" (
	"id" bigint PRIMARY KEY NOT NULL,
	"contract_address" varchar(100),
	"task_bid_id" bigint NOT NULL,
	"payer_id" bigint NOT NULL,
	"payee_id" bigint NOT NULL,
	"paymentType" varchar DEFAULT 'CNY' NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"trigger_condition" json NOT NULL,
	"executionStatus" varchar DEFAULT 'draft' NOT NULL,
	"locked_at" timestamp,
	"released_at" timestamp,
	"dispute_reason" text,
	"dispute_resolution" text,
	"transaction_hash" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" varchar(50) NOT NULL,
	"deviceType" "deviceTypeEnum" NOT NULL,
	"deviceName" varchar(100) NOT NULL,
	"manufacturer" varchar(100),
	"model" varchar(100),
	"protocol" "protocolEnum" NOT NULL,
	"endpoint" varchar(500),
	"credentialsEncrypted" text,
	"capabilities" text,
	"status" "statusEnum46" DEFAULT 'offline',
	"lastHeartbeat" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_groups" (
	"id" bigint PRIMARY KEY NOT NULL,
	"group_wx_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar DEFAULT 'general' NOT NULL,
	"description" text,
	"member_count" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"bridge_config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_members" (
	"id" bigint PRIMARY KEY NOT NULL,
	"group_id" bigint NOT NULL,
	"wx_id" varchar(100) NOT NULL,
	"nickname" varchar(100),
	"customer_id" bigint,
	"employee_id" bigint,
	"role" varchar DEFAULT 'member' NOT NULL,
	"tags" json,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"joined_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_messages" (
	"id" bigint PRIMARY KEY NOT NULL,
	"group_id" bigint NOT NULL,
	"sender_wx_id" varchar(100) NOT NULL,
	"sender_name" varchar(100),
	"content" text NOT NULL,
	"contentType" varchar DEFAULT 'text' NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"deidentified_content" text,
	"sensitive_keywords" json,
	"ai_analysis" json,
	"needs_reply" boolean DEFAULT false NOT NULL,
	"received_at" timestamp NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "social_platform_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" "platformEnum1" NOT NULL,
	"enabled" smallint DEFAULT 0 NOT NULL,
	"config" text,
	"webhookUrl" varchar(500),
	"webhookSecret" varchar(200),
	"lastSyncAt" timestamp,
	"syncStatus" "syncStatusEnum1" DEFAULT 'idle',
	"syncErrorMsg" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_learning_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"learningId" varchar(50) NOT NULL,
	"solutionId" varchar(50) NOT NULL,
	"projectNo" varchar(50),
	"learningType" "learningTypeEnum1" NOT NULL,
	"learningContent" text NOT NULL,
	"keyFindings" text,
	"isApplied" smallint DEFAULT 0,
	"appliedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendationId" varchar(50) NOT NULL,
	"userId" integer NOT NULL,
	"inputParameters" text NOT NULL,
	"recommendations" text NOT NULL,
	"selectedSolutionId" varchar(50),
	"feedbackScore" integer,
	"feedbackComment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spare_part_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_log_id" integer,
	"project_id" integer,
	"part_name" varchar(255) NOT NULL,
	"part_code" varchar(50),
	"quantity" integer DEFAULT 1 NOT NULL,
	"urgency" varchar(20) DEFAULT 'normal',
	"status" varchar(20) DEFAULT 'requested',
	"requested_by" integer,
	"requested_by_name" varchar(100),
	"approved_by" integer,
	"approved_at" timestamp,
	"shipment_tracking" varchar(100),
	"estimated_arrival" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "special_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"approvalId" varchar(50) NOT NULL,
	"accountId" varchar(50) NOT NULL,
	"approvalType" varchar(50) NOT NULL,
	"approvalScope" text,
	"conditions" text,
	"requestedAt" timestamp DEFAULT now(),
	"requestedBy" integer,
	"approvedAt" timestamp,
	"approvedBy" integer,
	"expiresAt" timestamp,
	"status" "statusEnum47" DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "stage_approval_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"rule_name_zh" varchar(100),
	"approverRole" "responsibleRoleEnum" NOT NULL,
	"approver_level" integer DEFAULT 1,
	"is_required" smallint DEFAULT 1,
	"auto_approve_conditions" text,
	"prerequisite_stages" text,
	"description" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_stage_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"stage_code" varchar(20) NOT NULL,
	"approval_rule_id" integer,
	"requested_by" integer NOT NULL,
	"requested_by_name" varchar(100),
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approver_id" integer,
	"approver_name" varchar(100),
	"approver_role" varchar(50),
	"status" "statusEnum80" DEFAULT 'PENDING' NOT NULL,
	"approvalType" "approvalTypeEnum" DEFAULT 'STAGE_COMPLETE' NOT NULL,
	"comments" text,
	"rejection_reason" text,
	"attachments" text,
	"approved_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_document_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"document_name" varchar(200) NOT NULL,
	"document_name_en" varchar(200),
	"document_type" varchar(50) NOT NULL,
	"description" text,
	"description_en" text,
	"is_mandatory" smallint DEFAULT 1 NOT NULL,
	"template_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"reviewType" "reviewTypeEnum1" NOT NULL,
	"reviewCarriage" "reviewCarriageEnum" DEFAULT 'General',
	"conclusion" "conclusionEnum" DEFAULT 'Pending',
	"risks" text,
	"responsible" integer,
	"completion_date" date,
	"comments" text,
	"attachments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"bom_step_id" integer NOT NULL,
	"material_code" varchar(50) NOT NULL,
	"material_name" varchar(200) NOT NULL,
	"required_qty" integer DEFAULT 1 NOT NULL,
	"unit" varchar(20) DEFAULT 'pcs',
	"available_qty" integer DEFAULT 0,
	"is_ready" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_rework_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bom_step_id" integer NOT NULL,
	"rework_count" integer NOT NULL,
	"reason" text NOT NULL,
	"triggered_by" integer NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "strategic_cfo_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"auditType" "auditTypeEnum1" NOT NULL,
	"target_id" integer NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"anomaly_score" numeric(5, 2),
	"anomaly_factors" text,
	"recommendation" "recommendationEnum2" NOT NULL,
	"auto_processed" smallint DEFAULT 0,
	"reviewer_id" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_chain_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"predictionType" "predictionTypeEnum1" NOT NULL,
	"part_id" integer,
	"customer_id" integer,
	"prediction_horizon_days" integer NOT NULL,
	"predicted_quantity" integer,
	"confidence_score" numeric(5, 2),
	"prediction_factors" text,
	"actual_quantity" integer,
	"accuracy_score" numeric(5, 2),
	"model_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"validated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_key" varchar(255) NOT NULL,
	"licenseType" "licenseTypeEnum" DEFAULT 'standard' NOT NULL,
	"hardware_fingerprint" varchar(255),
	"issued_to" varchar(200) NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"max_users" integer DEFAULT 10 NOT NULL,
	"allowed_features" text,
	"deploymentType" "deploymentTypeEnum" DEFAULT 'cloud' NOT NULL,
	"status" "statusEnum61" DEFAULT 'active' NOT NULL,
	"last_validated_at" timestamp,
	"validation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_code" varchar(50) NOT NULL,
	"module_name" varchar(100) NOT NULL,
	"module_name_en" varchar(100),
	"category" "categoryEnum6" DEFAULT 'business',
	"icon" varchar(50),
	"path" varchar(200),
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"requires_auth" smallint DEFAULT 1,
	"minRole" "roleEnum5" DEFAULT 'viewer',
	"is_enabled" smallint DEFAULT 1,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_bids" (
	"id" bigint PRIMARY KEY NOT NULL,
	"task_id" bigint NOT NULL,
	"bidder_agent_id" varchar(100) NOT NULL,
	"bidder_id" bigint,
	"bid_price" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY' NOT NULL,
	"promised_sla" json NOT NULL,
	"credit_score_snapshot" numeric(5, 2),
	"ai_judge_score" numeric(5, 2),
	"ai_judge_reason" text,
	"required_skills" json,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" varchar(100) NOT NULL,
	"task_name" varchar(200) NOT NULL,
	"taskType" varchar DEFAULT 'cron',
	"cron_expression" varchar(100),
	"status" varchar DEFAULT 'running',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"input_params" text,
	"output_result" text,
	"error_message" text,
	"error_stack" text,
	"retry_count" integer DEFAULT 0,
	"triggered_by" varchar(100),
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" varchar(50) NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"recipientId" integer NOT NULL,
	"channel" "channelEnum1" NOT NULL,
	"subject" varchar(200),
	"content" text,
	"priority" "priorityEnum3" DEFAULT 'medium',
	"scheduledAt" timestamp,
	"sentAt" timestamp,
	"confirmationRequired" smallint DEFAULT 0,
	"confirmationDeadline" timestamp,
	"confirmedAt" timestamp,
	"confirmedBy" integer,
	"status" "statusEnum48" DEFAULT 'pending',
	"retryCount" integer DEFAULT 0,
	"lastError" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams_meeting_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingCode" varchar(50) NOT NULL,
	"interviewRecordId" integer,
	"candidateId" integer NOT NULL,
	"subject" varchar(200) NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"durationMinutes" integer DEFAULT 60,
	"meetingUrl" varchar(500),
	"teamsMeetingId" varchar(100),
	"meetingPassword" varchar(50),
	"attendees" json,
	"status" "statusEnum30" DEFAULT 'scheduled' NOT NULL,
	"recordingStatus" "recordingStatusEnum" DEFAULT 'not_started',
	"recordingUrl" varchar(500),
	"transcriptText" text,
	"aiAnalysis" json,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_code" varchar(50) NOT NULL,
	"design_package_id" integer NOT NULL,
	"project_id" integer,
	"docType" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text,
	"file_url" text,
	"version" varchar(20) DEFAULT '1.0',
	"is_ai_generated" smallint DEFAULT 1,
	"ai_generated_at" timestamp,
	"ai_prompt_used" text,
	"ai_source_data" text,
	"reviewStatus" varchar DEFAULT 'Draft',
	"reviewed_by_id" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"language" varchar(10) DEFAULT 'zh-CN',
	"translations" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "technical_documents_doc_code_unique" UNIQUE("doc_code")
);
--> statement-breakpoint
CREATE TABLE "third_party_connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"connector_code" varchar(50) NOT NULL,
	"connector_name" varchar(100) NOT NULL,
	"connectorType" "connectorTypeEnum" NOT NULL,
	"config" text,
	"is_enabled" smallint DEFAULT 1,
	"last_tested_at" timestamp,
	"lastTestResult" "lastTestResultEnum" DEFAULT 'NotTested',
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_collection_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_code" varchar(50) NOT NULL,
	"device_name" varchar(100) NOT NULL,
	"deviceType" "deviceTypeEnum1" NOT NULL,
	"location" varchar(200),
	"coordinates" varchar(100),
	"associated_stage_code" varchar(20),
	"ip_address" varchar(50),
	"mac_address" varchar(50),
	"status" "statusEnum79" DEFAULT 'OFFLINE',
	"last_heartbeat" timestamp,
	"configuration" text,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"project_id" integer NOT NULL,
	"production_stage_id" integer,
	"stage_code" varchar(20),
	"record_date" date NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration" numeric(10, 2),
	"sourceType" "sourceTypeEnum4" DEFAULT 'MANUAL' NOT NULL,
	"device_id" varchar(100),
	"location_data" text,
	"workType" "workTypeEnum" DEFAULT 'REGULAR',
	"description" text,
	"is_verified" smallint DEFAULT 0,
	"verified_by" integer,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_assessment_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessmentId" integer NOT NULL,
	"participantId" integer NOT NULL,
	"score" integer NOT NULL,
	"isPassed" smallint DEFAULT 0 NOT NULL,
	"answers" text,
	"feedback" text,
	"completedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainingId" integer NOT NULL,
	"assessmentType" "assessmentTypeEnum1" DEFAULT 'quiz' NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"totalScore" integer DEFAULT 100,
	"passingScore" integer DEFAULT 60,
	"questions" text,
	"status" "statusEnum5" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainingId" integer NOT NULL,
	"participantId" integer NOT NULL,
	"certificateNo" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"issueDate" timestamp DEFAULT now() NOT NULL,
	"expiryDate" timestamp,
	"status" "statusEnum49" DEFAULT 'active' NOT NULL,
	"fileUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainingId" integer NOT NULL,
	"userId" integer NOT NULL,
	"registrationStatus" "registrationStatusEnum" DEFAULT 'registered' NOT NULL,
	"attendanceStatus" "attendanceStatusEnum1" DEFAULT 'unknown' NOT NULL,
	"score" integer,
	"passed" smallint,
	"certificateNo" varchar(100),
	"certificateExpiry" timestamp,
	"feedbackRating" integer,
	"feedback" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(50),
	"type" "typeEnum12" DEFAULT 'internal' NOT NULL,
	"category" "categoryEnum3" DEFAULT 'technical' NOT NULL,
	"description" text,
	"objectives" text,
	"trainerId" integer,
	"externalTrainer" varchar(100),
	"trainingOrg" varchar(200),
	"plannedStartDate" timestamp,
	"plannedEndDate" timestamp,
	"actualStartDate" timestamp,
	"actualEndDate" timestamp,
	"durationHours" integer,
	"location" varchar(200),
	"budget" bigint,
	"actualCost" bigint,
	"maxParticipants" integer,
	"status" "statusEnum50" DEFAULT 'draft' NOT NULL,
	"materialsUrl" varchar(500),
	"assessmentMethod" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"acknowledgementType" varchar NOT NULL,
	"source_type" varchar(50),
	"source_id" integer,
	"user_id" integer NOT NULL,
	"required_by" timestamp,
	"acknowledged_at" timestamp,
	"acknowledgementMethod" varchar,
	"ip_address" varchar(50),
	"user_agent" varchar(500),
	"signature_url" varchar(500),
	"comments" text,
	"status" varchar DEFAULT 'pending',
	"waived_by" integer,
	"waived_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"knowledgeType" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_en" varchar(200),
	"content" text NOT NULL,
	"content_en" text,
	"country_id" integer,
	"customer_id" integer,
	"site_id" integer,
	"tags" text,
	"accessLevel" varchar DEFAULT 'internal',
	"view_count" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"is_verified" smallint DEFAULT 0,
	"verified_by" integer,
	"verified_at" timestamp,
	"valid_from" date,
	"valid_to" date,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_notification_dispatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"channel" varchar NOT NULL,
	"recipient_address" varchar(200) NOT NULL,
	"template_id" integer,
	"message_content" text,
	"message_subject" varchar(200),
	"language" varchar(10) DEFAULT 'zh-CN',
	"provider_request_id" varchar(100),
	"provider_response" text,
	"status" varchar DEFAULT 'pending',
	"error_code" varchar(50),
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"source_type" varchar(50),
	"source_id" integer,
	"event_data" text,
	"recipient_user_id" integer,
	"recipient_email" varchar(200),
	"recipient_phone" varchar(50),
	"status" varchar DEFAULT 'pending',
	"scheduled_at" timestamp,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_notification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"description" text,
	"eventType" varchar NOT NULL,
	"trigger_conditions" text,
	"recipientType" varchar NOT NULL,
	"custom_recipients" text,
	"channels" text,
	"region_routing" text,
	"template_id" integer,
	"priority" varchar DEFAULT 'normal',
	"sendTiming" varchar DEFAULT 'immediate',
	"scheduled_time" time,
	"batch_interval" integer,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_code" varchar(50) NOT NULL,
	"employee_id" integer NOT NULL,
	"travel_plan_id" integer,
	"purpose" varchar(500) NOT NULL,
	"destination" varchar(500) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "statusEnum52" DEFAULT 'planned',
	"clock_in_geo" json,
	"commute_arrangements" json,
	"expense_claims_id" integer,
	"transportationType" "transportationTypeEnum",
	"accommodation_info" json,
	"daily_allowance" numeric(10, 2),
	"total_budget" numeric(10, 2),
	"actual_expense" numeric(10, 2),
	"approvalStatus" "statusEnum29" DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_request_id" integer NOT NULL,
	"itinerary_id" integer,
	"bookingType" varchar NOT NULL,
	"booking_channel" varchar(100),
	"booking_reference" varchar(100),
	"supplier_name" varchar(200),
	"supplier_confirmation" varchar(100),
	"booking_details" text,
	"check_in_date" date,
	"check_out_date" date,
	"departure_time" timestamp,
	"arrival_time" timestamp,
	"seat_class" varchar(50),
	"room_type" varchar(100),
	"original_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"paymentStatus" varchar DEFAULT 'pending',
	"payment_method" varchar(50),
	"invoice_required" smallint DEFAULT 1,
	"invoice_received" smallint DEFAULT 0,
	"cancellation_policy" text,
	"status" varchar DEFAULT 'pending',
	"booked_by" integer,
	"booked_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_insurance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_request_id" integer NOT NULL,
	"policy_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"coverage_start_date" date NOT NULL,
	"coverage_end_date" date NOT NULL,
	"premium_amount" numeric(8, 2),
	"certificate_number" varchar(100),
	"certificate_url" varchar(500),
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_itineraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_request_id" integer NOT NULL,
	"sequence_no" integer NOT NULL,
	"itinerary_date" date NOT NULL,
	"itineraryType" varchar NOT NULL,
	"from_location" varchar(200),
	"to_location" varchar(200),
	"start_time" time,
	"end_time" time,
	"description" text,
	"booking_required" smallint DEFAULT 0,
	"bookingStatus" varchar DEFAULT 'not_required',
	"booking_reference" varchar(100),
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_code" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"department_id" integer,
	"tripPurpose" varchar NOT NULL,
	"project_id" integer,
	"customer_id" integer,
	"destination_country_id" integer,
	"destination_city" varchar(100),
	"site_id" integer,
	"planned_start_date" date NOT NULL,
	"planned_end_date" date NOT NULL,
	"actual_start_date" date,
	"actual_end_date" date,
	"trip_days" integer,
	"is_international" smallint DEFAULT 0,
	"is_first_international" smallint DEFAULT 0,
	"requires_driving" smallint DEFAULT 0,
	"requires_visa" smallint DEFAULT 0,
	"estimated_budget" numeric(12, 2),
	"budget_currency" varchar(3) DEFAULT 'CNY',
	"justification" text,
	"status" varchar DEFAULT 'draft',
	"approval_chain" text,
	"current_approver" integer,
	"manager_approved_at" timestamp,
	"manager_approved_by" integer,
	"admin_processed_at" timestamp,
	"admin_processed_by" integer,
	"rejection_reason" text,
	"travel_package_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unified_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_table" varchar(20) NOT NULL,
	"source_id" integer NOT NULL,
	"project_code" varchar(100),
	"name" varchar(500),
	"status" varchar(50),
	"current_stage" varchar(20),
	"customer_id" integer,
	"customer_name" varchar(200),
	"project_manager" varchar(100),
	"start_date" timestamp,
	"target_end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_auth_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"authStatus" "authStatusEnum1" DEFAULT 'unverified',
	"authLevel" "authLevelEnum" DEFAULT 'customer',
	"company_name" varchar(200),
	"company_verification_doc" varchar(500),
	"verified_at" timestamp,
	"verified_by" integer,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_dashboard_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dashboard_name" varchar(100) NOT NULL,
	"is_default" smallint DEFAULT 0,
	"layout_config" json,
	"widgets" json,
	"theme" varchar(20) DEFAULT 'system',
	"refresh_interval" integer DEFAULT 300,
	"is_shared" smallint DEFAULT 0,
	"shared_with_roles" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"menu_path" varchar(200) NOT NULL,
	"menu_name" varchar(100) NOT NULL,
	"menu_name_en" varchar(100),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_mfa_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mfaType" "mfaTypeEnum" DEFAULT 'totp' NOT NULL,
	"secret" varchar(255),
	"is_enabled" boolean DEFAULT false NOT NULL,
	"backup_codes" text,
	"last_used_at" timestamp,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"language" varchar(10) DEFAULT 'zh' NOT NULL,
	"theme" varchar(20) DEFAULT 'dark' NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"dashboard_layout" json,
	"notification_settings" json,
	"timezone" varchar(50) DEFAULT 'Asia/Shanghai',
	"date_format" varchar(20) DEFAULT 'YYYY-MM-DD',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" "roleEnum5" DEFAULT 'viewer' NOT NULL,
	"dashboard_layout" json,
	"visible_modules" text,
	"permission_overrides" json,
	"is_active" smallint DEFAULT 1 NOT NULL,
	"last_login_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" varchar(50) NOT NULL,
	"department_id" varchar(50),
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer,
	"is_active" smallint DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"ip_address" varchar(50) NOT NULL,
	"user_agent" text,
	"device_fingerprint" varchar(255),
	"geo_location" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_task_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_code" varchar(50) NOT NULL,
	"current_task_id" integer,
	"current_project_id" integer,
	"current_stage" varchar(20),
	"customer_scenario_id" integer,
	"action_items" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "roleEnum3" DEFAULT 'user' NOT NULL,
	"languagePreference" "languagePreferenceEnum" DEFAULT 'zh',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "value_added_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_code" varchar(50) NOT NULL,
	"status" "statusEnum54" DEFAULT 'draft',
	"source_report_id" integer,
	"trigger_keyword" varchar(100),
	"trigger_context" text,
	"items" json,
	"customer_id" integer,
	"customer_contact_id" integer,
	"sales_rep_id" integer,
	"total_amount" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"confirmation_email_sent" smallint DEFAULT 0,
	"confirmed_at" timestamp,
	"confirmed_by" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vda_191_cleanliness_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"standard_code" varchar(50) NOT NULL,
	"standard_name" varchar(200) NOT NULL,
	"standard_version" varchar(20) DEFAULT 'VDA 19.1:2015',
	"particle_size_min" integer,
	"particle_size_max" integer,
	"particle_count_limit" integer,
	"gravimetric_limit" numeric(10, 4),
	"applicable_industries" text,
	"applicable_components" text,
	"test_methods" text,
	"sampling_requirements" text,
	"is_active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_rentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_request_id" integer NOT NULL,
	"booking_id" integer,
	"driving_approval_id" integer,
	"rental_company" varchar(200),
	"vehicle_category" varchar(100),
	"vehicle_model" varchar(100),
	"license_plate" varchar(50),
	"pickup_location" varchar(200),
	"pickup_time" timestamp,
	"return_location" varchar(200),
	"return_time" timestamp,
	"actual_return_time" timestamp,
	"mileage_start" integer,
	"mileage_end" integer,
	"fuel_level_start" varchar(20),
	"fuel_level_end" varchar(20),
	"rental_cost" numeric(10, 2),
	"fuel_cost" numeric(10, 2),
	"tolls_cost" numeric(10, 2),
	"other_costs" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"insurance_included" smallint DEFAULT 1,
	"damage_reported" smallint DEFAULT 0,
	"damage_details" text,
	"status" varchar DEFAULT 'reserved',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grt_visitor_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"visitor_name" varchar(128) NOT NULL,
	"visitor_id" varchar(64) NOT NULL,
	"visitor_email" varchar(128),
	"visitor_phone" varchar(32),
	"visitor_company" varchar(256),
	"visitor_position" varchar(128),
	"id_type" varchar(32),
	"id_number" varchar(64),
	"nationality" varchar(64),
	"visitor_pass_id" varchar(64),
	"pass_code" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_visitor_passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"visitor_detail_id" integer NOT NULL,
	"pass_code" varchar(128) NOT NULL,
	"qr_code" text NOT NULL,
	"bar_code" text,
	"access_level" varchar(50) DEFAULT 'public',
	"allowed_areas" json,
	"restrictions" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"checked_in_at" timestamp,
	"checked_out_at" timestamp,
	"checked_in_by" varchar(64),
	"checked_out_by" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grt_visitor_passes_pass_code_unique" UNIQUE("pass_code")
);
--> statement-breakpoint
CREATE TABLE "grt_visitor_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_name" varchar(128) NOT NULL,
	"applicant_id" varchar(64) NOT NULL,
	"applicant_email" varchar(128) NOT NULL,
	"applicant_phone" varchar(32) NOT NULL,
	"applicant_company" varchar(256),
	"applicant_position" varchar(128),
	"visit_purpose" text NOT NULL,
	"visit_date" timestamp NOT NULL,
	"visit_end_date" timestamp,
	"estimated_duration" integer,
	"number_of_visitors" integer DEFAULT 1,
	"factory_id" integer NOT NULL,
	"factory_name" varchar(256) NOT NULL,
	"country" varchar(64) NOT NULL,
	"region" varchar(128),
	"department" varchar(128),
	"area" varchar(256),
	"needs_factory_access" boolean DEFAULT false,
	"needs_production_floor" boolean DEFAULT false,
	"needs_lab_access" boolean DEFAULT false,
	"needs_office_access" boolean DEFAULT true,
	"access_level" varchar(50) DEFAULT 'public',
	"contact_person_id" varchar(64) NOT NULL,
	"contact_person_name" varchar(128) NOT NULL,
	"contact_person_email" varchar(128) NOT NULL,
	"contact_person_phone" varchar(32) NOT NULL,
	"supervisor_id" varchar(64),
	"supervisor_name" varchar(128),
	"approval_status" varchar(50) DEFAULT 'draft',
	"approval_notes" text,
	"rejection_reason" text,
	"visitor_pass_id" varchar(64),
	"visitor_pass_code" varchar(128),
	"visitor_pass_qr_code" text,
	"pass_generated_at" timestamp,
	"pass_expires_at" timestamp,
	"background_check_required" boolean DEFAULT false,
	"background_check_status" varchar(50) DEFAULT 'not_required',
	"nda_signed" boolean DEFAULT false,
	"nda_signed_at" timestamp,
	"country_rules" json,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "typeEnum13" NOT NULL,
	"webhookUrl" text NOT NULL,
	"enabled" smallint DEFAULT 1 NOT NULL,
	"description" text,
	"triggerEvents" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"retryIntervalSeconds" integer DEFAULT 60 NOT NULL,
	"useExponentialBackoff" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"eventType" varchar(50) NOT NULL,
	"payload" text,
	"response" text,
	"statusCode" integer,
	"success" smallint DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"nextRetryAt" timestamp,
	"retryStatus" "retryStatusEnum" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"eventType" varchar(50) NOT NULL,
	"webhookType" "typeEnum13" NOT NULL,
	"titleTemplate" text NOT NULL,
	"contentTemplate" text NOT NULL,
	"availableVariables" text,
	"isDefault" smallint DEFAULT 0 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_trigger_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"field" varchar(100) NOT NULL,
	"operator" varchar(20) NOT NULL,
	"value" text NOT NULL,
	"logicOperator" varchar(10) DEFAULT 'AND',
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_hour_alert_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_code" varchar(50) NOT NULL,
	"rule_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"work_order_id" integer NOT NULL,
	"worker_id" integer,
	"worker_name" varchar(100),
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"overrun_percent" numeric(5, 2),
	"alertLevel" varchar NOT NULL,
	"alert_time" timestamp NOT NULL,
	"status" varchar DEFAULT 'Pending',
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolution" text,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"notifications_sent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "work_hour_alert_logs_alert_code_unique" UNIQUE("alert_code")
);
--> statement-breakpoint
CREATE TABLE "work_hour_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"description" text,
	"taskType" varchar DEFAULT 'All',
	"threshold_percent" numeric(5, 2) DEFAULT '120.00',
	"alertLevel" varchar DEFAULT 'Warning',
	"notification_channels" text,
	"recipients" text,
	"is_active" smallint DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "work_hour_alert_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "work_hour_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"alertType" "alertTypeEnum3" NOT NULL,
	"alertLevel" "severityEnum1" DEFAULT 'warning' NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"status" "statusEnum67" DEFAULT 'Pending' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_code" varchar(50) NOT NULL,
	"task_id" integer NOT NULL,
	"worker_id" integer NOT NULL,
	"worker_name" varchar(100),
	"logType" varchar NOT NULL,
	"log_time" timestamp NOT NULL,
	"location" varchar(200),
	"device_id" varchar(100),
	"gps_coordinates" varchar(100),
	"notes" text,
	"duration" numeric(8, 2),
	"is_manual_entry" smallint DEFAULT 0,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "work_logs_log_code_unique" UNIQUE("log_code")
);
--> statement-breakpoint
CREATE TABLE "worker_efficiency_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"record_date" date NOT NULL,
	"tasks_assigned" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"standard_hours" numeric(10, 2) DEFAULT '0',
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"efficiency" numeric(5, 2) DEFAULT '100',
	"quality_score" numeric(5, 2) DEFAULT '100',
	"defect_count" integer DEFAULT 0,
	"rework_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_efficiency_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"worker_name" varchar(100),
	"stat_date" date NOT NULL,
	"taskType" varchar,
	"tasks_completed" integer DEFAULT 0,
	"total_estimated_hours" numeric(10, 2) DEFAULT '0.00',
	"total_actual_hours" numeric(10, 2) DEFAULT '0.00',
	"efficiency" numeric(5, 2),
	"quality_pass_rate" numeric(5, 2),
	"rework_count" integer DEFAULT 0,
	"ranking" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" varchar(50),
	"name" varchar(100) NOT NULL,
	"department" varchar(100) NOT NULL,
	"position" varchar(100) NOT NULL,
	"skillLevel" "skillLevelEnum" DEFAULT 'L2' NOT NULL,
	"status" "statusEnum66" DEFAULT 'Active' NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"join_date" date,
	"leave_date" date,
	"uwb_tag_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zkp_registry" (
	"id" bigint PRIMARY KEY NOT NULL,
	"proof_id" varchar(50) NOT NULL,
	"proofType" varchar NOT NULL,
	"entityType" varchar NOT NULL,
	"entity_id" bigint NOT NULL,
	"entity_name" varchar(200),
	"public_inputs" json NOT NULL,
	"proof_hash" varchar(200) NOT NULL,
	"proof_data" text,
	"verification_circuit" varchar(100),
	"generated_by" varchar(100),
	"verified_by_client" boolean DEFAULT false NOT NULL,
	"verifier_client_id" varchar(100),
	"verification_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "zkp_registry_proof_id_unique" UNIQUE("proof_id")
);
--> statement-breakpoint
CREATE TABLE "zkp_verification_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"result_id" integer,
	"action" "actionEnum" NOT NULL,
	"action_details" text,
	"actorType" "actorTypeEnum" NOT NULL,
	"actor_id" varchar(100),
	"actor_ip" varchar(45),
	"request_signature" varchar(256),
	"integrity_hash" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zkp_verification_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_code" varchar(64) NOT NULL,
	"requestType" "requestTypeEnum1" NOT NULL,
	"requester_id" integer,
	"requesterType" "requesterTypeEnum" DEFAULT 'customer_ai',
	"requester_identity" varchar(200),
	"targetEntityType" "targetEntityTypeEnum" NOT NULL,
	"target_entity_id" integer,
	"target_entity_code" varchar(100),
	"claim_type" varchar(100) NOT NULL,
	"claim_description" text,
	"claim_parameters" text,
	"status" "statusEnum56" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zkp_verification_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"is_verified" smallint NOT NULL,
	"verification_proof" text,
	"proof_hash" varchar(128),
	"confidence_level" numeric(5, 2),
	"verification_method" varchar(100),
	"public_summary" text,
	"verifier_id" varchar(64),
	"verifier_signature" text,
	"blockchain_tx_hash" varchar(128),
	"blockchain_network" varchar(50),
	"block_number" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"countCode" varchar(30) NOT NULL,
	"countType" varchar(50) NOT NULL,
	"warehouseId" integer NOT NULL,
	"zone" varchar(10),
	"status" varchar(50) DEFAULT 'planned' NOT NULL,
	"plannedDate" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"countedBy" integer,
	"verifiedBy" integer,
	"approvedBy" integer,
	"totalItems" integer DEFAULT 0,
	"matchedItems" integer DEFAULT 0,
	"discrepancyItems" integer DEFAULT 0,
	"totalDiscrepancyValue" numeric(12, 2) DEFAULT '0.00',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_counts_uk_count_code" UNIQUE("countCode")
);
--> statement-breakpoint
CREATE TABLE "warehouse_issue_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"issueId" integer NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200),
	"requestedQty" numeric(10, 2) NOT NULL,
	"issuedQty" numeric(10, 2) DEFAULT '0.00',
	"unit" varchar(20) DEFAULT '个' NOT NULL,
	"locationId" integer,
	"locationCode" varchar(30),
	"lotNumber" varchar(50),
	"serialNumbers" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"issueCode" varchar(30) NOT NULL,
	"issueType" varchar(50) NOT NULL,
	"sourceDocType" varchar(20),
	"sourceDocId" integer,
	"sourceDocCode" varchar(30),
	"processCode" varchar(20),
	"warehouseId" integer NOT NULL,
	"requestDept" varchar(50),
	"projectCode" varchar(50),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"issuedBy" integer,
	"issuedByName" varchar(50),
	"issuedAt" timestamp,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_issues_uk_issue_code" UNIQUE("issueCode")
);
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouseId" integer NOT NULL,
	"locationCode" varchar(30) NOT NULL,
	"zone" varchar(10) NOT NULL,
	"aisle" varchar(10),
	"shelf" varchar(10),
	"bin" varchar(10),
	"locationType" varchar(50) DEFAULT 'storage' NOT NULL,
	"maxWeight" numeric(10, 2),
	"maxVolume" numeric(10, 2),
	"maxItems" integer,
	"isOccupied" boolean DEFAULT false,
	"currentMaterialCode" varchar(50),
	"currentQty" numeric(10, 2) DEFAULT '0.00',
	"tempRequirement" varchar(50) DEFAULT 'normal',
	"isActive" boolean DEFAULT true,
	"isLocked" boolean DEFAULT false,
	"lockReason" varchar(200),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_locations_uk_location_code" UNIQUE("locationCode")
);
--> statement-breakpoint
CREATE TABLE "warehouse_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiptId" integer NOT NULL,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200),
	"expectedQty" numeric(10, 2) NOT NULL,
	"receivedQty" numeric(10, 2) DEFAULT '0.00',
	"rejectedQty" numeric(10, 2) DEFAULT '0.00',
	"unit" varchar(20) DEFAULT '个' NOT NULL,
	"lotNumber" varchar(50),
	"serialNumbers" json,
	"locationId" integer,
	"locationCode" varchar(30),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiptCode" varchar(30) NOT NULL,
	"receiptType" varchar(50) NOT NULL,
	"sourceDocType" varchar(20),
	"sourceDocId" integer,
	"sourceDocCode" varchar(30),
	"warehouseId" integer NOT NULL,
	"locationId" integer,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"receivedBy" integer,
	"receivedByName" varchar(50),
	"receivedAt" timestamp,
	"qcResult" varchar(50),
	"qcBy" integer,
	"qcAt" timestamp,
	"qcNotes" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_receipts_uk_receipt_code" UNIQUE("receiptCode")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouseCode" varchar(20) NOT NULL,
	"warehouseName" varchar(100) NOT NULL,
	"warehouseType" varchar(50) NOT NULL,
	"buCode" varchar(50),
	"address" varchar(300),
	"building" varchar(50),
	"floor" varchar(10),
	"totalArea" numeric(10, 2),
	"totalCapacity" integer,
	"managerId" integer,
	"managerName" varchar(50),
	"contactPhone" varchar(20),
	"erpWarehouseCode" varchar(50),
	"erpSyncStatus" varchar(50) DEFAULT 'not_synced',
	"isActive" boolean DEFAULT true,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_uk_warehouse_code" UNIQUE("warehouseCode")
);
--> statement-breakpoint
CREATE INDEX "approval_log_instance_idx" ON "grt_approval_action_logs" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "approval_log_operator_idx" ON "grt_approval_action_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "approval_log_action_idx" ON "grt_approval_action_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "approval_log_created_at_idx" ON "grt_approval_action_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_delegation_delegator_idx" ON "grt_approval_delegations" USING btree ("delegator_id");--> statement-breakpoint
CREATE INDEX "approval_delegation_delegatee_idx" ON "grt_approval_delegations" USING btree ("delegatee_id");--> statement-breakpoint
CREATE INDEX "approval_delegation_status_idx" ON "grt_approval_delegations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_instance_code_idx" ON "grt_approval_instances" USING btree ("instance_code");--> statement-breakpoint
CREATE INDEX "approval_instance_template_idx" ON "grt_approval_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "approval_instance_business_idx" ON "grt_approval_instances" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "approval_instance_applicant_idx" ON "grt_approval_instances" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "approval_instance_status_idx" ON "grt_approval_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_step_instance_idx" ON "grt_approval_step_records" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "approval_step_approver_idx" ON "grt_approval_step_records" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "approval_step_status_idx" ON "grt_approval_step_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_template_code_idx" ON "grt_approval_templates" USING btree ("template_code");--> statement-breakpoint
CREATE INDEX "approval_template_business_type_idx" ON "grt_approval_templates" USING btree ("business_type");--> statement-breakpoint
CREATE INDEX "red_blue_config_code_idx" ON "grt_red_blue_configs" USING btree ("config_code");--> statement-breakpoint
CREATE INDEX "red_blue_project_idx" ON "grt_red_blue_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "red_blue_customer_idx" ON "grt_red_blue_configs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "red_blue_status_idx" ON "grt_red_blue_configs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "red_blue_exec_config_idx" ON "grt_red_blue_executions" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "red_blue_exec_phase_idx" ON "grt_red_blue_executions" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "red_blue_exec_status_idx" ON "grt_red_blue_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_delegations_idx_delegated_from" ON "approval_delegations" USING btree ("delegatedFrom");--> statement-breakpoint
CREATE INDEX "approval_delegations_idx_delegated_to" ON "approval_delegations" USING btree ("delegatedTo");--> statement-breakpoint
CREATE INDEX "approval_history_idx_document_id" ON "approval_history" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "approval_history_idx_approved_by" ON "approval_history" USING btree ("approvedBy");--> statement-breakpoint
CREATE INDEX "approval_history_idx_action_time" ON "approval_history" USING btree ("actionTime");--> statement-breakpoint
CREATE INDEX "approval_permissions_idx_role_id" ON "approval_permissions" USING btree ("roleId");--> statement-breakpoint
CREATE INDEX "approval_permissions_idx_document_type" ON "approval_permissions" USING btree ("documentType");--> statement-breakpoint
CREATE INDEX "approval_processes_idx_document_type" ON "approval_processes" USING btree ("documentType");--> statement-breakpoint
CREATE INDEX "approval_rules_idx_document_type" ON "approval_rules" USING btree ("documentType");--> statement-breakpoint
CREATE INDEX "approval_rules_idx_priority" ON "approval_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "approval_statistics_idx_statistic_date" ON "approval_statistics" USING btree ("statisticDate");--> statement-breakpoint
CREATE INDEX "approval_tasks_idx_document_id" ON "approval_tasks" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "approval_tasks_idx_assigned_to" ON "approval_tasks" USING btree ("assignedTo");--> statement-breakpoint
CREATE INDEX "approval_tasks_idx_status" ON "approval_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_tasks_idx_current_level" ON "approval_tasks" USING btree ("currentLevel");--> statement-breakpoint
CREATE INDEX "bom_cost_rollups_idx_bom" ON "bom_cost_rollups" USING btree ("bomMasterId");--> statement-breakpoint
CREATE INDEX "bom_cost_rollups_idx_type" ON "bom_cost_rollups" USING btree ("costType");--> statement-breakpoint
CREATE INDEX "bom_items_idx_bom" ON "bom_items" USING btree ("bomMasterId");--> statement-breakpoint
CREATE INDEX "bom_items_idx_parent" ON "bom_items" USING btree ("parentItemId");--> statement-breakpoint
CREATE INDEX "bom_items_idx_material" ON "bom_items" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "bom_items_idx_level" ON "bom_items" USING btree ("level");--> statement-breakpoint
CREATE INDEX "bom_items_idx_process" ON "bom_items" USING btree ("processCode");--> statement-breakpoint
CREATE INDEX "bom_items_idx_source" ON "bom_items" USING btree ("sourceType");--> statement-breakpoint
CREATE INDEX "bom_masters_idx_status" ON "bom_masters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bom_masters_idx_type" ON "bom_masters" USING btree ("bomType");--> statement-breakpoint
CREATE INDEX "bom_masters_idx_bu" ON "bom_masters" USING btree ("buCode");--> statement-breakpoint
CREATE INDEX "bom_masters_idx_erp" ON "bom_masters" USING btree ("erpBomId");--> statement-breakpoint
CREATE INDEX "bom_versions_idx_status" ON "bom_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bom_versions_idx_ecn" ON "bom_versions" USING btree ("ecnNumber");--> statement-breakpoint
CREATE INDEX "bom_versions_idx_effective" ON "bom_versions" USING btree ("effectiveDate");--> statement-breakpoint
CREATE INDEX "contract_ai_document_id_idx" ON "contract_ai_analyses" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "contract_ai_contract_id_idx" ON "contract_ai_analyses" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contract_ai_status_idx" ON "contract_ai_analyses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contract_docs_contract_id_idx" ON "contract_documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contract_docs_doc_type_idx" ON "contract_documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "contracts_code_idx" ON "contracts" USING btree ("contract_code");--> statement-breakpoint
CREATE INDEX "contracts_customer_id_idx" ON "contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_type_idx" ON "contracts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ccr_idx_ticket_id" ON "customer_comm_records" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ccr_idx_comm_type" ON "customer_comm_records" USING btree ("comm_type");--> statement-breakpoint
CREATE INDEX "ccr_idx_customer_name" ON "customer_comm_records" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "ccr_idx_created_by" ON "customer_comm_records" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "crt_idx_status" ON "customer_requirement_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crt_idx_priority" ON "customer_requirement_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "crt_idx_assignee_id" ON "customer_requirement_tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "crt_idx_created_by" ON "customer_requirement_tickets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "expiry_alert_rules_idx_material" ON "expiry_alert_rules" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "expiry_alert_rules_idx_category" ON "expiry_alert_rules" USING btree ("materialCategory");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_material" ON "inventory_lots" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_warehouse" ON "inventory_lots" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_status" ON "inventory_lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_qc" ON "inventory_lots" USING btree ("qcStatus");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_expiry" ON "inventory_lots" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_supplier" ON "inventory_lots" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_source" ON "inventory_lots" USING btree ("sourceType","sourcePOCode");--> statement-breakpoint
CREATE INDEX "inventory_lots_idx_erp" ON "inventory_lots" USING btree ("erpLotId");--> statement-breakpoint
CREATE INDEX "lot_allocations_idx_lot" ON "lot_allocations" USING btree ("lotId");--> statement-breakpoint
CREATE INDEX "lot_allocations_idx_type" ON "lot_allocations" USING btree ("allocationType");--> statement-breakpoint
CREATE INDEX "lot_allocations_idx_target" ON "lot_allocations" USING btree ("targetDocType","targetDocId");--> statement-breakpoint
CREATE INDEX "lot_allocations_idx_process" ON "lot_allocations" USING btree ("processInstanceId");--> statement-breakpoint
CREATE INDEX "lot_allocations_idx_status" ON "lot_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "serial_numbers_idx_material" ON "serial_numbers" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "serial_numbers_idx_lot" ON "serial_numbers" USING btree ("lotId");--> statement-breakpoint
CREATE INDEX "serial_numbers_idx_status" ON "serial_numbers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "serial_numbers_idx_project" ON "serial_numbers" USING btree ("currentProjectCode");--> statement-breakpoint
CREATE INDEX "serial_numbers_idx_warehouse" ON "serial_numbers" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "inventory_idx_material_id" ON "inventory" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "inventory_idx_warehouse_id" ON "inventory" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "inventory_transactions_idx_material_id" ON "inventory_transactions" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "inventory_transactions_idx_transaction_type" ON "inventory_transactions" USING btree ("transactionType");--> statement-breakpoint
CREATE INDEX "inventory_transactions_idx_created_at" ON "inventory_transactions" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "material_categories_idx_parent_code" ON "material_categories" USING btree ("parentCategoryCode");--> statement-breakpoint
CREATE INDEX "material_categories_idx_level" ON "material_categories" USING btree ("level");--> statement-breakpoint
CREATE INDEX "material_change_history_idx_material_id" ON "material_change_history" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "material_change_history_idx_change_type" ON "material_change_history" USING btree ("changeType");--> statement-breakpoint
CREATE INDEX "material_change_history_idx_changed_at" ON "material_change_history" USING btree ("changedAt");--> statement-breakpoint
CREATE INDEX "material_coding_rules_idx_effective_date" ON "material_coding_rules" USING btree ("effectiveDate");--> statement-breakpoint
CREATE INDEX "material_import_records_idx_import_batch_id" ON "material_import_records" USING btree ("importBatchId");--> statement-breakpoint
CREATE INDEX "material_import_records_idx_source_system" ON "material_import_records" USING btree ("sourceSystem");--> statement-breakpoint
CREATE INDEX "material_import_records_idx_status" ON "material_import_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_specifications_idx_spec_type" ON "material_specifications" USING btree ("specType");--> statement-breakpoint
CREATE INDEX "materials_idx_category_code" ON "materials" USING btree ("categoryCode");--> statement-breakpoint
CREATE INDEX "materials_idx_material_type" ON "materials" USING btree ("materialType");--> statement-breakpoint
CREATE INDEX "materials_idx_status" ON "materials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supplier_materials_idx_supplier_id" ON "supplier_materials" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "supplier_materials_idx_material_id" ON "supplier_materials" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "menu_log_user_id_idx" ON "grt_menu_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "menu_log_menu_id_idx" ON "grt_menu_access_logs" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_config_key_idx" ON "grt_menu_configs" USING btree ("config_key");--> statement-breakpoint
CREATE INDEX "menu_code_idx" ON "grt_menu_items" USING btree ("code");--> statement-breakpoint
CREATE INDEX "menu_parent_id_idx" ON "grt_menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "menu_level_idx" ON "grt_menu_items" USING btree ("level");--> statement-breakpoint
CREATE INDEX "menu_perm_menu_id_idx" ON "grt_menu_permissions" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_perm_perm_id_idx" ON "grt_menu_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "menu_role_menu_id_idx" ON "grt_menu_roles" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_role_role_id_idx" ON "grt_menu_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "menu_search_menu_id_idx" ON "grt_menu_search_index" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "user_menu_user_id_idx" ON "grt_user_menu_customization" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_menu_item_id_idx" ON "grt_user_menu_customization" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "data_scope_user_id_idx" ON "grt_data_scopes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_scope_role_id_idx" ON "grt_data_scopes" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "audit_operator_id_idx" ON "grt_permission_audit_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "audit_target_user_id_idx" ON "grt_permission_audit_logs" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "audit_action_type_idx" ON "grt_permission_audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "grt_permission_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blacklist_value_idx" ON "grt_permission_blacklist" USING btree ("blacklist_value");--> statement-breakpoint
CREATE INDEX "blacklist_type_idx" ON "grt_permission_blacklist" USING btree ("blacklist_type");--> statement-breakpoint
CREATE INDEX "config_key_idx" ON "grt_permission_configs" USING btree ("config_key");--> statement-breakpoint
CREATE INDEX "permission_code_idx" ON "grt_permissions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "permission_category_idx" ON "grt_permissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cert_user_id_idx" ON "grt_qualification_certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cert_code_idx" ON "grt_qualification_certificates" USING btree ("certificate_code");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "grt_role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "grt_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "role_name_idx" ON "grt_roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "temp_perm_user_id_idx" ON "grt_temporary_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "temp_perm_end_date_idx" ON "grt_temporary_permissions" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "user_permissions_user_id_idx" ON "grt_user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permissions_role_idx" ON "grt_user_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_permissions_department_idx" ON "grt_user_permissions" USING btree ("department");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "grt_user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "grt_user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "purchase_invoices_idx_purchase_order_id" ON "purchase_invoices" USING btree ("purchaseOrderId");--> statement-breakpoint
CREATE INDEX "purchase_invoices_idx_supplier_id" ON "purchase_invoices" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "purchase_invoices_idx_payment_status" ON "purchase_invoices" USING btree ("paymentStatus");--> statement-breakpoint
CREATE INDEX "purchase_orders_idx_supplier_id" ON "purchase_orders" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "purchase_orders_idx_material_id" ON "purchase_orders" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "purchase_orders_idx_status" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchase_orders_idx_po_date" ON "purchase_orders" USING btree ("poDate");--> statement-breakpoint
CREATE INDEX "purchase_receipts_idx_purchase_order_id" ON "purchase_receipts" USING btree ("purchaseOrderId");--> statement-breakpoint
CREATE INDEX "purchase_receipts_idx_received_by" ON "purchase_receipts" USING btree ("receivedBy");--> statement-breakpoint
CREATE INDEX "purchase_requests_idx_status" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchase_requests_idx_requested_by" ON "purchase_requests" USING btree ("requestedBy");--> statement-breakpoint
CREATE INDEX "purchase_requests_idx_material_id" ON "purchase_requests" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "purchase_statistics_idx_statistic_date" ON "purchase_statistics" USING btree ("statisticDate");--> statement-breakpoint
CREATE INDEX "suppliers_idx_supplier_category" ON "suppliers" USING btree ("supplierCategory");--> statement-breakpoint
CREATE INDEX "suppliers_idx_status" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "access_log_pass_id_idx" ON "grt_access_logs" USING btree ("visitor_pass_id");--> statement-breakpoint
CREATE INDEX "access_log_request_id_idx" ON "grt_access_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "access_log_timestamp_idx" ON "grt_access_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_client_name" ON "after_sales_clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_client_tier" ON "after_sales_clients" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_client_status" ON "after_sales_clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_equipment_serial" ON "after_sales_equipments" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "idx_equipment_client" ON "after_sales_equipments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "after_sales_equipments_idx_equipment_model" ON "after_sales_equipments" USING btree ("model_name");--> statement-breakpoint
CREATE INDEX "idx_equipment_status" ON "after_sales_equipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_equipment_next_due" ON "after_sales_equipments" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "idx_service_ticket" ON "after_sales_service_logs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_service_equipment" ON "after_sales_service_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "idx_service_type" ON "after_sales_service_logs" USING btree ("serviceType");--> statement-breakpoint
CREATE INDEX "idx_service_status" ON "after_sales_service_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_service_scheduled" ON "after_sales_service_logs" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_service_engineer" ON "after_sales_service_logs" USING btree ("assigned_engineer_id");--> statement-breakpoint
CREATE INDEX "idx_service_client" ON "after_sales_service_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_service_signature_status" ON "after_sales_service_logs" USING btree ("signatureStatus");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_code" ON "ai_agent_execution_logs" USING btree ("execution_code");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_type" ON "ai_agent_execution_logs" USING btree ("agentType");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_status" ON "ai_agent_execution_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_project" ON "ai_agent_execution_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_trigger_exec_trigger" ON "ai_agent_trigger_executions" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "idx_trigger_exec_status" ON "ai_agent_trigger_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trigger_exec_log" ON "ai_agent_trigger_executions" USING btree ("execution_log_id");--> statement-breakpoint
CREATE INDEX "idx_ai_trigger_code" ON "ai_agent_triggers" USING btree ("trigger_code");--> statement-breakpoint
CREATE INDEX "idx_ai_trigger_agent_type" ON "ai_agent_triggers" USING btree ("agentType");--> statement-breakpoint
CREATE INDEX "idx_ai_trigger_type" ON "ai_agent_triggers" USING btree ("triggerType");--> statement-breakpoint
CREATE INDEX "idx_ai_trigger_enabled" ON "ai_agent_triggers" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "ai_assistant_configs_assistantId_unique" ON "ai_assistant_configs" USING btree ("assistantId");--> statement-breakpoint
CREATE INDEX "sessionId" ON "ai_assistant_sessions" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "templateCode" ON "ai_assistant_templates" USING btree ("templateCode");--> statement-breakpoint
CREATE INDEX "ai_audit_logs_target_idx" ON "ai_audit_logs" USING btree ("target_id","target_type");--> statement-breakpoint
CREATE INDEX "ai_audit_logs_audit_type_idx" ON "ai_audit_logs" USING btree ("auditType");--> statement-breakpoint
CREATE INDEX "idx_ai_draft_replies_message" ON "ai_draft_replies" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_ai_draft_replies_status" ON "ai_draft_replies" USING btree ("reviewStatus");--> statement-breakpoint
CREATE INDEX "idx_ai_draft_replies_reviewer" ON "ai_draft_replies" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_session_id" ON "ai_execution_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_assistant_type" ON "ai_execution_logs" USING btree ("assistant_type");--> statement-breakpoint
CREATE INDEX "ai_execution_logs_idx_user_id" ON "ai_execution_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_execution_logs_idx_created_at" ON "ai_execution_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "uk_assistant_type" ON "ai_execution_mode_configs" USING btree ("assistant_type");--> statement-breakpoint
CREATE INDEX "ai_insights_meetingId_idx" ON "ai_insights" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "ai_insights_insightType_idx" ON "ai_insights" USING btree ("insightType");--> statement-breakpoint
CREATE INDEX "ai_knowledge_bases_knowledgeBaseId_unique" ON "ai_knowledge_bases" USING btree ("knowledgeBaseId");--> statement-breakpoint
CREATE INDEX "idx_entry" ON "ai_notebook_suggestions" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "idx_status" ON "ai_notebook_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_target" ON "ai_notebook_suggestions" USING btree ("target_process_type","target_process_id");--> statement-breakpoint
CREATE INDEX "idx_ai_chat_history_session" ON "ai_service_chat_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ai_chat_history_user" ON "ai_service_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_chat_history_service" ON "ai_service_chat_history" USING btree ("serviceType");--> statement-breakpoint
CREATE INDEX "idx_annual_agendas_year" ON "annual_agendas" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_agenda_code" ON "annual_corporate_agenda" USING btree ("agenda_code");--> statement-breakpoint
CREATE INDEX "idx_agenda_year" ON "annual_corporate_agenda" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_agenda_dept" ON "annual_corporate_agenda" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_agenda_date" ON "annual_corporate_agenda" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_annual_milestones_agenda" ON "annual_milestones" USING btree ("agenda_id");--> statement-breakpoint
CREATE INDEX "idx_annual_milestones_type" ON "annual_milestones" USING btree ("milestoneType");--> statement-breakpoint
CREATE INDEX "approval_request_id_idx" ON "grt_approval_workflows" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "approval_step_number_idx" ON "grt_approval_workflows" USING btree ("step_number");--> statement-breakpoint
CREATE INDEX "asset_offboarding_id_idx" ON "asset_handover" USING btree ("offboarding_id");--> statement-breakpoint
CREATE INDEX "asset_category_idx" ON "asset_handover" USING btree ("assetCategory");--> statement-breakpoint
CREATE INDEX "asset_status_idx" ON "asset_handover" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_user" ON "behavior_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_user_did" ON "behavior_logs" USING btree ("user_did");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_context" ON "behavior_logs" USING btree ("context");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_skill" ON "behavior_logs" USING btree ("implied_skill");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_timestamp" ON "behavior_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_behavior_logs_project" ON "behavior_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bom_assembly_tasks_taskId" ON "bom_assembly_tasks" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "bu_emp_bu_idx" ON "bu_employees" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "bu_emp_employee_idx" ON "bu_employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "bu_emp_status_idx" ON "bu_employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kpi_bu_idx" ON "bu_kpis" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "kpi_code_idx" ON "bu_kpis" USING btree ("kpi_code");--> statement-breakpoint
CREATE INDEX "kpi_dimension_idx" ON "bu_kpis" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX "perf_bu_idx" ON "bu_performance" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "perf_year_idx" ON "bu_performance" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "perf_quarter_idx" ON "bu_performance" USING btree ("fiscal_quarter");--> statement-breakpoint
CREATE INDEX "hist_bu_idx" ON "bu_performance_history" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "hist_period_idx" ON "bu_performance_history" USING btree ("fiscal_year","fiscal_quarter");--> statement-breakpoint
CREATE INDEX "bu_code_idx" ON "business_units" USING btree ("code");--> statement-breakpoint
CREATE INDEX "bu_manager_idx" ON "business_units" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "bu_status_idx" ON "business_units" USING btree ("status");--> statement-breakpoint
CREATE INDEX "modelId" ON "cad_models" USING btree ("modelId");--> statement-breakpoint
CREATE INDEX "idx_capability_evidences_user" ON "capability_evidences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_capability_evidences_type" ON "capability_evidences" USING btree ("evidenceType");--> statement-breakpoint
CREATE INDEX "idx_capability_evidences_domain" ON "capability_evidences" USING btree ("capabilityDomain");--> statement-breakpoint
CREATE INDEX "idx_capability_evidences_status" ON "capability_evidences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_capability_evidences_project" ON "capability_evidences" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "capability_code_idx" ON "capability_proof_configs" USING btree ("capability_code");--> statement-breakpoint
CREATE INDEX "capability_category_idx" ON "capability_proof_configs" USING btree ("capabilityCategory");--> statement-breakpoint
CREATE INDEX "idx_cert_audits_cert" ON "cert_audit_records" USING btree ("certification_id");--> statement-breakpoint
CREATE INDEX "idx_cert_audits_date" ON "cert_audit_records" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "idx_cert_plans_code" ON "cert_building_plans" USING btree ("plan_code");--> statement-breakpoint
CREATE INDEX "idx_cert_plans_status" ON "cert_building_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cert_plans_target" ON "cert_building_plans" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "idx_gap_analysis_code" ON "cert_gap_analysis" USING btree ("analysis_code");--> statement-breakpoint
CREATE INDEX "idx_gap_analysis_customer" ON "cert_gap_analysis" USING btree ("target_customer");--> statement-breakpoint
CREATE INDEX "idx_certifications_code" ON "certifications" USING btree ("cert_code");--> statement-breakpoint
CREATE INDEX "idx_certifications_status" ON "certifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_certifications_expiry" ON "certifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "change_events_project_id_idx" ON "change_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "change_events_type_idx" ON "change_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "change_events_status_idx" ON "change_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "change_events_source_change_id_idx" ON "change_events" USING btree ("source_change_id");--> statement-breakpoint
CREATE INDEX "change_events_created_by_idx" ON "change_events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_change_executions_request" ON "change_executions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_change_executions_environment" ON "change_executions" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_change_executions_status" ON "change_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_change_notifications_request" ON "change_notifications" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_change_notifications_recipient" ON "change_notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_change_notifications_type" ON "change_notifications" USING btree ("notificationType");--> statement-breakpoint
CREATE INDEX "idx_change_requests_request_no" ON "change_requests" USING btree ("request_no");--> statement-breakpoint
CREATE INDEX "idx_change_requests_status" ON "change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_change_requests_applicant" ON "change_requests" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "idx_change_requests_created" ON "change_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "channel_members_channelId_idx" ON "channel_members" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "channel_members_userId_idx" ON "channel_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "channels_organizationId_idx" ON "channels" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "channels_createdBy_idx" ON "channels" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "channels_visibility_idx" ON "channels" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "collaboration_states_meetingId_idx" ON "collaboration_states" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "collaboration_states_documentId_idx" ON "collaboration_states" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "idx_community_members_external" ON "community_members" USING btree ("external_id","platform");--> statement-breakpoint
CREATE INDEX "idx_community_members_customer" ON "community_members" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_community_members_status" ON "community_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_community_messages_member" ON "community_messages" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_community_messages_approval" ON "community_messages" USING btree ("approvalStatus");--> statement-breakpoint
CREATE INDEX "idx_community_messages_publish" ON "community_messages" USING btree ("publishStatus");--> statement-breakpoint
CREATE INDEX "idx_community_messages_thread" ON "community_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_community_stats_date" ON "community_stats" USING btree ("stat_date","statType");--> statement-breakpoint
CREATE INDEX "idx_consistency_check_logs_execution" ON "consistency_check_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "idx_consistency_check_logs_result" ON "consistency_check_logs" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_content_library_type" ON "content_library" USING btree ("contentType");--> statement-breakpoint
CREATE INDEX "idx_content_library_approval" ON "content_library" USING btree ("approvalStatus");--> statement-breakpoint
CREATE INDEX "idx_content_library_push" ON "content_library" USING btree ("pushStatus");--> statement-breakpoint
CREATE INDEX "idx_conv_daily_stats_user_date" ON "conversation_daily_stats" USING btree ("user_id","stat_date");--> statement-breakpoint
CREATE INDEX "idx_conv_messages_session_id" ON "conversation_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_conv_messages_role" ON "conversation_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_conv_messages_created_at" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_user_id" ON "conversation_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_status" ON "conversation_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_created_at" ON "conversation_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rate_type" ON "cost_rates" USING btree ("rateType");--> statement-breakpoint
CREATE INDEX "country_rules_code_idx" ON "grt_country_rules" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "country_rules_effective_date_idx" ON "grt_country_rules" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "crm_contacts_v2_customer_id_idx" ON "crm_contacts_v2" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "crm_customers_customerCode_unique" ON "crm_customers" USING btree ("customerCode");--> statement-breakpoint
CREATE INDEX "crm_customers_v2_code_idx" ON "crm_customers_v2" USING btree ("code");--> statement-breakpoint
CREATE INDEX "crm_customers_v2_type_idx" ON "crm_customers_v2" USING btree ("type");--> statement-breakpoint
CREATE INDEX "crm_customers_v2_status_idx" ON "crm_customers_v2" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_customers_v2_assigned_to_idx" ON "crm_customers_v2" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_customers_v2_level_idx" ON "crm_customers_v2" USING btree ("level");--> statement-breakpoint
CREATE INDEX "crm_leads_status_idx" ON "crm_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_leads_priority_idx" ON "crm_leads" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "crm_leads_assigned_to_idx" ON "crm_leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_opportunities_opportunityCode_unique" ON "crm_opportunities" USING btree ("opportunityCode");--> statement-breakpoint
CREATE INDEX "crm_opportunities_v2_customer_id_idx" ON "crm_opportunities_v2" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "crm_opportunities_v2_stage_idx" ON "crm_opportunities_v2" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "crm_opportunities_v2_assigned_to_idx" ON "crm_opportunities_v2" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_opportunities_v2_contact_id_idx" ON "crm_opportunities_v2" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "logId" ON "customer_access_logs" USING btree ("logId");--> statement-breakpoint
CREATE INDEX "connectionId" ON "customer_ai_connections" USING btree ("connectionId");--> statement-breakpoint
CREATE INDEX "customer_assistant_chats_session_id_idx" ON "customer_assistant_chats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "customer_assistant_chats_customer_id_idx" ON "customer_assistant_chats" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_cert_customer" ON "customer_cert_requirements" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "idx_customer_cert_type" ON "customer_cert_requirements" USING btree ("customerType");--> statement-breakpoint
CREATE INDEX "communicationId" ON "customer_communications" USING btree ("communicationId");--> statement-breakpoint
CREATE INDEX "credit_update_customer_idx" ON "customer_credit_updates" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "credit_update_report_idx" ON "customer_credit_updates" USING btree ("service_report_id");--> statement-breakpoint
CREATE INDEX "credit_update_effective_idx" ON "customer_credit_updates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "accountId" ON "customer_portal_accounts" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "portalUserId" ON "customer_portal_users" USING btree ("portalUserId");--> statement-breakpoint
CREATE INDEX "idx_customer_scenarios_code" ON "customer_scenarios" USING btree ("scenario_code");--> statement-breakpoint
CREATE INDEX "da_perm_employee_idx" ON "da_permission_bindings" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "da_perm_assistant_idx" ON "da_permission_bindings" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_code_idx" ON "dashboard_widgets" USING btree ("widget_code");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_type_idx" ON "dashboard_widgets" USING btree ("widgetType");--> statement-breakpoint
CREATE INDEX "privacy_config_code_idx" ON "data_privacy_configs" USING btree ("config_code");--> statement-breakpoint
CREATE INDEX "privacy_config_category_idx" ON "data_privacy_configs" USING btree ("dataCategory");--> statement-breakpoint
CREATE INDEX "privacy_config_level_idx" ON "data_privacy_configs" USING btree ("sensitivityLevel");--> statement-breakpoint
CREATE INDEX "deident_session_idx" ON "deidentification_proxy_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "deident_user_idx" ON "deidentification_proxy_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deident_sensitive_idx" ON "deidentification_proxy_logs" USING btree ("sensitive_data_detected");--> statement-breakpoint
CREATE INDEX "deident_blocked_idx" ON "deidentification_proxy_logs" USING btree ("blocked");--> statement-breakpoint
CREATE INDEX "idx_delivery_code" ON "delivery_executions" USING btree ("delivery_code");--> statement-breakpoint
CREATE INDEX "idx_delivery_project" ON "delivery_executions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_stage" ON "delivery_executions" USING btree ("currentStage");--> statement-breakpoint
CREATE INDEX "idx_delivery_status" ON "delivery_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dept_agendas_agenda" ON "department_agendas" USING btree ("agenda_id");--> statement-breakpoint
CREATE INDEX "idx_dept_agendas_dept" ON "department_agendas" USING btree ("department_code");--> statement-breakpoint
CREATE INDEX "department_id" ON "department_permission_config" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_configs_name_env" ON "deployment_configs" USING btree ("config_name","environment");--> statement-breakpoint
CREATE INDEX "idx_design_package_code" ON "design_packages" USING btree ("package_code");--> statement-breakpoint
CREATE INDEX "idx_design_package_project" ON "design_packages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_design_package_bom_status" ON "design_packages" USING btree ("mechanicalBomStatus");--> statement-breakpoint
CREATE INDEX "idx_design_package_risk_level" ON "design_packages" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "dev_tasks_taskCode_unique" ON "dev_tasks" USING btree ("taskCode");--> statement-breakpoint
CREATE INDEX "development_bugs_bugCode_unique" ON "development_bugs" USING btree ("bugCode");--> statement-breakpoint
CREATE INDEX "development_tasks_taskCode_unique" ON "development_tasks" USING btree ("taskCode");--> statement-breakpoint
CREATE INDEX "deviceTaskId" ON "device_tasks" USING btree ("deviceTaskId");--> statement-breakpoint
CREATE INDEX "doc_emb_source_idx" ON "document_embeddings" USING btree ("source_table","source_id");--> statement-breakpoint
CREATE INDEX "doc_emb_project_idx" ON "document_embeddings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "doc_emb_stage_idx" ON "document_embeddings" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "doc_rec_log_project_idx" ON "document_recommendation_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "doc_rec_log_stage_idx" ON "document_recommendation_logs" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "assistantCode" ON "employee_ai_assistants" USING btree ("assistantCode");--> statement-breakpoint
CREATE INDEX "employee_digital_assistants_assistantCode_unique" ON "employee_digital_assistants" USING btree ("assistantCode");--> statement-breakpoint
CREATE INDEX "employee_locations_employee_id_idx" ON "employee_locations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_locations_service_task_id_idx" ON "employee_locations" USING btree ("service_task_id");--> statement-breakpoint
CREATE INDEX "employee_locations_recorded_at_idx" ON "employee_locations" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "offboarding_employee_id_idx" ON "employee_offboarding" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "offboarding_successor_id_idx" ON "employee_offboarding" USING btree ("successor_id");--> statement-breakpoint
CREATE INDEX "offboarding_status_idx" ON "employee_offboarding" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offboarding_date_idx" ON "employee_offboarding" USING btree ("offboarding_date");--> statement-breakpoint
CREATE INDEX "inputId" ON "engineering_inputs" USING btree ("inputId");--> statement-breakpoint
CREATE INDEX "engineering_tasks_taskId" ON "engineering_tasks" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "idx_environment_sync_logs_status" ON "environment_sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_environment_sync_logs_type" ON "environment_sync_logs" USING btree ("syncType");--> statement-breakpoint
CREATE INDEX "equipment_base_prices_idx_equipment_model" ON "equipment_base_prices" USING btree ("equipmentModel");--> statement-breakpoint
CREATE INDEX "idx_effective_date" ON "equipment_base_prices" USING btree ("effectiveDate");--> statement-breakpoint
CREATE INDEX "equipment_models_numericCode_unique" ON "equipment_models" USING btree ("numericCode");--> statement-breakpoint
CREATE INDEX "expense_claims_claim_code_unique" ON "expense_claims" USING btree ("claim_code");--> statement-breakpoint
CREATE INDEX "expense_claims_submitter_id_idx" ON "expense_claims" USING btree ("submitter_id");--> statement-breakpoint
CREATE INDEX "expense_claims_travel_record_id_idx" ON "expense_claims" USING btree ("travel_record_id");--> statement-breakpoint
CREATE INDEX "expense_claims_trip_request_id_idx" ON "expense_claims" USING btree ("trip_request_id");--> statement-breakpoint
CREATE INDEX "functional_ai_assistants_assistantCode_unique" ON "functional_ai_assistants" USING btree ("assistantCode");--> statement-breakpoint
CREATE INDEX "idx_gate_checklists_project" ON "gate_checklists" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_gate_checklists_stage" ON "gate_checklists" USING btree ("gateStage");--> statement-breakpoint
CREATE INDEX "idx_gate_checklists_status" ON "gate_checklists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gate_checklists_mandatory" ON "gate_checklists" USING btree ("is_mandatory");--> statement-breakpoint
CREATE INDEX "idx_alert_code" ON "global_growth_alerts" USING btree ("alert_code");--> statement-breakpoint
CREATE INDEX "idx_alert_region" ON "global_growth_alerts" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_alert_status" ON "global_growth_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_region_code" ON "global_growth_regions" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX "idx_revenue_region" ON "global_growth_revenue" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_year" ON "global_growth_revenue" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_revenue_quarter" ON "global_growth_revenue" USING btree ("quarter");--> statement-breakpoint
CREATE INDEX "idx_global_holidays_year" ON "global_holidays" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_global_holidays_region" ON "global_holidays" USING btree ("region");--> statement-breakpoint
CREATE INDEX "grt_compliance_alerts_employee_id_idx" ON "grt_compliance_alerts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "grt_compliance_alerts_alert_type_idx" ON "grt_compliance_alerts" USING btree ("alertType");--> statement-breakpoint
CREATE INDEX "grt_compliance_alerts_status_idx" ON "grt_compliance_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grt_compliance_email_templates_template_id_idx" ON "grt_compliance_email_templates" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "grt_compliance_email_templates_alert_type_idx" ON "grt_compliance_email_templates" USING btree ("alertType");--> statement-breakpoint
CREATE INDEX "grt_compliance_reports_report_id_idx" ON "grt_compliance_reports" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "grt_compliance_reports_generated_by_idx" ON "grt_compliance_reports" USING btree ("generated_by");--> statement-breakpoint
CREATE INDEX "grt_compliance_reports_created_at_idx" ON "grt_compliance_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "grt_compliance_rules_rule_id_idx" ON "grt_compliance_rules" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "grt_compliance_rules_jurisdiction_idx" ON "grt_compliance_rules" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "grt_compliance_rules_rule_type_idx" ON "grt_compliance_rules" USING btree ("ruleType");--> statement-breakpoint
CREATE INDEX "grt_employees_employee_id_idx" ON "grt_employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "grt_employees_jurisdiction_idx" ON "grt_employees" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "grt_employees_role_type_idx" ON "grt_employees" USING btree ("roleType");--> statement-breakpoint
CREATE INDEX "grt_time_entries_employee_id_idx" ON "grt_time_entries" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "grt_time_entries_date_idx" ON "grt_time_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "grt_time_entries_jurisdiction_idx" ON "grt_time_entries" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "grt_time_entries_compliance_flag_idx" ON "grt_time_entries" USING btree ("complianceFlag");--> statement-breakpoint
CREATE INDEX "grt_weekly_summary_employee_id_idx" ON "grt_weekly_compliance_summary" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "grt_weekly_summary_week_start_idx" ON "grt_weekly_compliance_summary" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "grt_weekly_summary_jurisdiction_idx" ON "grt_weekly_compliance_summary" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "idx_hiring_plans_region" ON "hiring_plans" USING btree ("region_config_id");--> statement-breakpoint
CREATE INDEX "idx_hiring_plans_status" ON "hiring_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "historical_quotations_idx_equipment_model" ON "historical_quotations" USING btree ("equipmentModel");--> statement-breakpoint
CREATE INDEX "idx_customer_type" ON "historical_quotations" USING btree ("customerType");--> statement-breakpoint
CREATE INDEX "idx_bid_result" ON "historical_quotations" USING btree ("bidResult");--> statement-breakpoint
CREATE INDEX "idx_quotation_date" ON "historical_quotations" USING btree ("quotationDate");--> statement-breakpoint
CREATE INDEX "quotationId" ON "historical_quotations" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "historical_solutions_idx_equipment_model" ON "historical_solutions" USING btree ("equipmentModel");--> statement-breakpoint
CREATE INDEX "historical_solutions_idx_workpiece_category" ON "historical_solutions" USING btree ("workpieceCategory");--> statement-breakpoint
CREATE INDEX "idx_source_type" ON "historical_solutions" USING btree ("sourceType");--> statement-breakpoint
CREATE INDEX "solutionId" ON "historical_solutions" USING btree ("solutionId");--> statement-breakpoint
CREATE INDEX "recordCode" ON "hrm_ai_interview_records" USING btree ("recordCode");--> statement-breakpoint
CREATE INDEX "candidateCode" ON "hrm_candidates" USING btree ("candidateCode");--> statement-breakpoint
CREATE INDEX "fileCode" ON "hrm_document_files" USING btree ("fileCode");--> statement-breakpoint
CREATE INDEX "employeeCode" ON "hrm_employees" USING btree ("employeeCode");--> statement-breakpoint
CREATE INDEX "gradeCode" ON "hrm_performance_grades" USING btree ("gradeCode");--> statement-breakpoint
CREATE INDEX "positionCode" ON "hrm_positions" USING btree ("positionCode");--> statement-breakpoint
CREATE INDEX "planCode" ON "hrm_training_plans" USING btree ("planCode");--> statement-breakpoint
CREATE INDEX "testCode" ON "hrm_training_tests" USING btree ("testCode");--> statement-breakpoint
CREATE INDEX "idx_integration_code" ON "integration_status" USING btree ("integration_code");--> statement-breakpoint
CREATE INDEX "idx_integration_type" ON "integration_status" USING btree ("integrationType");--> statement-breakpoint
CREATE INDEX "idx_interaction_logs_member" ON "interaction_logs" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_interaction_logs_type" ON "interaction_logs" USING btree ("interactionType");--> statement-breakpoint
CREATE INDEX "idx_interaction_logs_compliance" ON "interaction_logs" USING btree ("complianceStatus");--> statement-breakpoint
CREATE INDEX "idx_ip_blacklist_ip_address" ON "ip_blacklist" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_ip_blacklist_is_active" ON "ip_blacklist" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_jdy_dept_mappings_dept_no" ON "jiandaoyun_dept_mappings" USING btree ("jdy_dept_no");--> statement-breakpoint
CREATE INDEX "idx_jdy_dept_mappings_sync_status" ON "jiandaoyun_dept_mappings" USING btree ("syncStatus");--> statement-breakpoint
CREATE INDEX "idx_jdy_role_mappings_role_no" ON "jiandaoyun_role_mappings" USING btree ("jdy_role_no");--> statement-breakpoint
CREATE INDEX "idx_jdy_role_mappings_grt_role" ON "jiandaoyun_role_mappings" USING btree ("grt_role_id");--> statement-breakpoint
CREATE INDEX "idx_jdy_role_members_role_no" ON "jiandaoyun_role_members" USING btree ("jdy_role_no");--> statement-breakpoint
CREATE INDEX "idx_jdy_role_members_username" ON "jiandaoyun_role_members" USING btree ("jdy_username");--> statement-breakpoint
CREATE INDEX "idx_jdy_sync_logs_task" ON "jiandaoyun_sync_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_jdy_sync_logs_status" ON "jiandaoyun_sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jdy_sync_logs_started" ON "jiandaoyun_sync_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_jdy_sync_tasks_type" ON "jiandaoyun_sync_tasks" USING btree ("taskType");--> statement-breakpoint
CREATE INDEX "idx_jdy_sync_tasks_enabled" ON "jiandaoyun_sync_tasks" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_jdy_user_mappings_username" ON "jiandaoyun_user_mappings" USING btree ("jdy_username");--> statement-breakpoint
CREATE INDEX "idx_jdy_user_mappings_grt_user" ON "jiandaoyun_user_mappings" USING btree ("grt_user_id");--> statement-breakpoint
CREATE INDEX "idx_jdy_user_mappings_sync_status" ON "jiandaoyun_user_mappings" USING btree ("syncStatus");--> statement-breakpoint
CREATE INDEX "idx_job_function_role" ON "job_function_matrix" USING btree ("role_code");--> statement-breakpoint
CREATE INDEX "idx_job_function_dept" ON "job_function_matrix" USING btree ("department");--> statement-breakpoint
CREATE INDEX "knowledge_base_knowledge_code_unique" ON "knowledge_base" USING btree ("knowledge_code");--> statement-breakpoint
CREATE INDEX "knowledge_base_access_level_idx" ON "knowledge_base" USING btree ("accessLevel");--> statement-breakpoint
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base" USING btree ("category");--> statement-breakpoint
CREATE INDEX "historyId" ON "kpi_assessment_history" USING btree ("historyId");--> statement-breakpoint
CREATE INDEX "suggestionId" ON "kpi_communication_suggestions" USING btree ("suggestionId");--> statement-breakpoint
CREATE INDEX "kpiId" ON "kpi_configurations" USING btree ("kpiId");--> statement-breakpoint
CREATE INDEX "kpi_effectiveness_tracking_trackingId" ON "kpi_effectiveness_tracking" USING btree ("trackingId");--> statement-breakpoint
CREATE INDEX "kpi_email_notifications_notificationId" ON "kpi_email_notifications" USING btree ("notificationId");--> statement-breakpoint
CREATE INDEX "scoreId" ON "kpi_score_records" USING btree ("scoreId");--> statement-breakpoint
CREATE INDEX "meeting_attachments_meetingId_idx" ON "meeting_attachments" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "meeting_attachments_uploadedBy_idx" ON "meeting_attachments" USING btree ("uploadedBy");--> statement-breakpoint
CREATE INDEX "meeting_notes_meetingId_idx" ON "meeting_notes" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "meeting_notes_editedBy_idx" ON "meeting_notes" USING btree ("editedBy");--> statement-breakpoint
CREATE INDEX "meeting_participants_meetingId_idx" ON "meeting_participants" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "meeting_participants_userId_idx" ON "meeting_participants" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "code" ON "meeting_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "meetings_channelId_idx" ON "meetings" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "meetings_createdBy_idx" ON "meetings" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meetings_startTime_idx" ON "meetings" USING btree ("startTime");--> statement-breakpoint
CREATE INDEX "mes_sync_project_idx" ON "mes_sync" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "mes_sync_work_order_idx" ON "mes_sync" USING btree ("mes_work_order_id");--> statement-breakpoint
CREATE INDEX "idx_task_code" ON "mfg_task_items" USING btree ("task_code");--> statement-breakpoint
CREATE INDEX "idx_task_work_order" ON "mfg_task_items" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "idx_task_type" ON "mfg_task_items" USING btree ("taskType");--> statement-breakpoint
CREATE INDEX "idx_task_status" ON "mfg_task_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_worker" ON "mfg_task_items" USING btree ("assigned_worker_id");--> statement-breakpoint
CREATE INDEX "idx_model_pred_type" ON "model_prediction_records" USING btree ("modelType");--> statement-breakpoint
CREATE INDEX "idx_model_pred_status" ON "model_prediction_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_model_pred_created_at" ON "model_prediction_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ml_report_service_idx" ON "multi_language_service_reports" USING btree ("service_report_id");--> statement-breakpoint
CREATE INDEX "ml_report_language_idx" ON "multi_language_service_reports" USING btree ("language");--> statement-breakpoint
CREATE INDEX "naming_change_requests_requestCode_unique" ON "naming_change_requests" USING btree ("requestCode");--> statement-breakpoint
CREATE INDEX "naming_versions_versionCode_unique" ON "naming_versions" USING btree ("versionCode");--> statement-breakpoint
CREATE INDEX "idx_negotiation_sessions_session" ON "negotiation_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_negotiation_sessions_opportunity" ON "negotiation_sessions" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_negotiation_sessions_client" ON "negotiation_sessions" USING btree ("client_agent_id");--> statement-breakpoint
CREATE INDEX "idx_negotiation_sessions_status" ON "negotiation_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notebook" ON "notebook_entries" USING btree ("notebook_id");--> statement-breakpoint
CREATE INDEX "notebook_entries_idx_created_by" ON "notebook_entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "approval_offboarding_id_idx" ON "offboarding_approvals" USING btree ("offboarding_id");--> statement-breakpoint
CREATE INDEX "approval_level_idx" ON "offboarding_approvals" USING btree ("approvalLevel");--> statement-breakpoint
CREATE INDEX "approval_approver_idx" ON "offboarding_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "approval_decision_idx" ON "offboarding_approvals" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "query_log_user_idx" ON "offboarding_data_query_log" USING btree ("query_user_id");--> statement-breakpoint
CREATE INDEX "query_log_target_idx" ON "offboarding_data_query_log" USING btree ("target_employee_id");--> statement-breakpoint
CREATE INDEX "handover_offboarding_id_idx" ON "offboarding_handover_items" USING btree ("offboarding_id");--> statement-breakpoint
CREATE INDEX "handover_category_idx" ON "offboarding_handover_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "handover_status_idx" ON "offboarding_handover_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "parts_catalog_part_code_unique" ON "parts_catalog" USING btree ("part_code");--> statement-breakpoint
CREATE INDEX "parts_catalog_category_idx" ON "parts_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "perf_attr_offboarding_id_idx" ON "performance_attribution" USING btree ("offboarding_id");--> statement-breakpoint
CREATE INDEX "perf_attr_original_employee_idx" ON "performance_attribution" USING btree ("original_employee_id");--> statement-breakpoint
CREATE INDEX "perf_attr_successor_idx" ON "performance_attribution" USING btree ("successor_id");--> statement-breakpoint
CREATE INDEX "perf_attr_period_idx" ON "performance_attribution" USING btree ("period");--> statement-breakpoint
CREATE INDEX "perf_attr_type_idx" ON "performance_attribution" USING btree ("attributionType");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_v2_user_idx" ON "permission_audit_logs_v2" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_v2_action_idx" ON "permission_audit_logs_v2" USING btree ("actionType");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_v2_time_idx" ON "permission_audit_logs_v2" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_target_user_id" ON "permission_change_history" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_changed_by" ON "permission_change_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "permission_change_history_idx_created_at" ON "permission_change_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "groupCode" ON "permission_groups" USING btree ("groupCode");--> statement-breakpoint
CREATE INDEX "sourceId" ON "planning_data_sources" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "noteId" ON "planning_execution_notes" USING btree ("noteId");--> statement-breakpoint
CREATE INDEX "planId" ON "planning_plans" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "planning_tasks_taskId" ON "planning_tasks" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "planning_tracking_records_trackingId" ON "planning_tracking_records" USING btree ("trackingId");--> statement-breakpoint
CREATE INDEX "po_suggestions_project_idx" ON "po_suggestions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_process" ON "process_notebooks" USING btree ("process_type","process_id");--> statement-breakpoint
CREATE INDEX "process_notebooks_idx_created_by" ON "process_notebooks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_process_notes_note" ON "process_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "idx_process_notes_user" ON "process_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_process_notes_project" ON "process_notes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_process_notes_phase" ON "process_notes" USING btree ("project_phase");--> statement-breakpoint
CREATE INDEX "idx_process_notes_category" ON "process_notes" USING btree ("problem_category");--> statement-breakpoint
CREATE INDEX "idx_process_notes_visibility" ON "process_notes" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "process_param_code_idx" ON "process_parameter_compliance" USING btree ("parameter_code");--> statement-breakpoint
CREATE INDEX "process_param_category_idx" ON "process_parameter_compliance" USING btree ("parameterCategory");--> statement-breakpoint
CREATE INDEX "process_templates_idx_workpiece_category" ON "process_templates" USING btree ("workpieceCategory");--> statement-breakpoint
CREATE INDEX "idx_equipment_series" ON "process_templates" USING btree ("equipmentSeries");--> statement-breakpoint
CREATE INDEX "templateId" ON "process_templates" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_stage" ON "production_ai_knowledge" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_type" ON "production_ai_knowledge" USING btree ("knowledgeType");--> statement-breakpoint
CREATE INDEX "idx_dashboard_config_code" ON "production_dashboard_configs" USING btree ("config_code");--> statement-breakpoint
CREATE INDEX "idx_production_pull_signals_signal" ON "production_pull_signals" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "idx_production_pull_signals_project" ON "production_pull_signals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_production_pull_signals_gate" ON "production_pull_signals" USING btree ("upstream_gate");--> statement-breakpoint
CREATE INDEX "idx_production_pull_signals_status" ON "production_pull_signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_production_pull_signals_target" ON "production_pull_signals" USING btree ("target_aas_id");--> statement-breakpoint
CREATE INDEX "idx_stage_code" ON "production_stage_definitions" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "idx_stage_order" ON "production_stage_definitions" USING btree ("stage_order");--> statement-breakpoint
CREATE INDEX "idx_stage_log_stage" ON "production_stage_logs" USING btree ("production_stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_log_project" ON "production_stage_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_prod_stage_project" ON "production_stages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_prod_stage_code" ON "production_stages" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "idx_prod_stage_status" ON "production_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_order_code" ON "production_work_orders" USING btree ("work_order_code");--> statement-breakpoint
CREATE INDEX "idx_work_order_project" ON "production_work_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_work_order_status" ON "production_work_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_order_priority" ON "production_work_orders" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "permissionId" ON "project_access_permissions" USING btree ("permissionId");--> statement-breakpoint
CREATE INDEX "twinCode" ON "project_digital_twins" USING btree ("twinCode");--> statement-breakpoint
CREATE INDEX "member_score_project_idx" ON "project_member_scores" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "member_score_employee_idx" ON "project_member_scores" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "member_score_bu_idx" ON "project_member_scores" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "project_number_counters_prefix_unique" ON "project_number_counters" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "alertCode" ON "project_risk_alerts" USING btree ("alertCode");--> statement-breakpoint
CREATE INDEX "proj_score_project_idx" ON "project_scores" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "proj_score_bu_idx" ON "project_scores" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "project_stages_v2_project_idx" ON "project_stages_v2" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_stages_v2_stage_idx" ON "project_stages_v2" USING btree ("stageCode");--> statement-breakpoint
CREATE INDEX "project_tasks_taskCode_unique" ON "project_tasks" USING btree ("taskCode");--> statement-breakpoint
CREATE INDEX "project_versions_project_idx" ON "project_versions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_versions_code_idx" ON "project_versions" USING btree ("version_code");--> statement-breakpoint
CREATE INDEX "projects_projectCode_unique" ON "projects" USING btree ("projectCode");--> statement-breakpoint
CREATE INDEX "projects_v2_code_idx" ON "projects_v2" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "projects_v2_customer_idx" ON "projects_v2" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "showcase_code_idx" ON "public_capability_showcase" USING btree ("showcase_code");--> statement-breakpoint
CREATE INDEX "showcase_slug_idx" ON "public_capability_showcase" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "showcase_category_idx" ON "public_capability_showcase" USING btree ("category");--> statement-breakpoint
CREATE INDEX "showcase_status_idx" ON "public_capability_showcase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_publish_queue_draft" ON "publish_queue" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "idx_publish_queue_group" ON "publish_queue" USING btree ("target_group_id");--> statement-breakpoint
CREATE INDEX "idx_publish_queue_status" ON "publish_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_publish_queue_scheduled" ON "publish_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_qc_inspection_code" ON "qc_inspection_records" USING btree ("inspection_code");--> statement-breakpoint
CREATE INDEX "idx_qc_task" ON "qc_inspection_records" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_qc_work_order" ON "qc_inspection_records" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "idx_qc_result" ON "qc_inspection_records" USING btree ("result");--> statement-breakpoint
CREATE INDEX "qual_cert_employee_id_idx" ON "qualification_certificates" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "qual_cert_code_idx" ON "qualification_certificates" USING btree ("certificate_code");--> statement-breakpoint
CREATE INDEX "qual_cert_expiry_idx" ON "qualification_certificates" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_quotation_id" ON "quotation_learning_records" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "quotation_learning_records_idx_learning_type" ON "quotation_learning_records" USING btree ("learningType");--> statement-breakpoint
CREATE INDEX "quotation_learning_records_learningId" ON "quotation_learning_records" USING btree ("learningId");--> statement-breakpoint
CREATE INDEX "quotation_recommendations_idx_user_id" ON "quotation_recommendations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "quotation_recommendations_idx_created_at" ON "quotation_recommendations" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "quotation_recommendations_recommendationId" ON "quotation_recommendations" USING btree ("recommendationId");--> statement-breakpoint
CREATE INDEX "idx_regional_sales_region" ON "regional_sales_configs" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_regional_sales_year" ON "regional_sales_configs" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_regional_staff_config" ON "regional_staff_configs" USING btree ("region_config_id");--> statement-breakpoint
CREATE INDEX "idx_resource_checks_config" ON "resource_adequacy_checks" USING btree ("region_config_id");--> statement-breakpoint
CREATE INDEX "idx_resource_checks_date" ON "resource_adequacy_checks" USING btree ("check_date");--> statement-breakpoint
CREATE INDEX "role_permissions_v2_role_idx" ON "role_permissions_v2" USING btree ("roleCode");--> statement-breakpoint
CREATE INDEX "role_permissions_v2_module_idx" ON "role_permissions_v2" USING btree ("module_code");--> statement-breakpoint
CREATE INDEX "salary_calculations_calculationCode_unique" ON "salary_calculations" USING btree ("calculationCode");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_taskCode_unique" ON "scheduled_tasks" USING btree ("taskCode");--> statement-breakpoint
CREATE INDEX "idx_security_audit_event_type" ON "security_audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_security_audit_severity" ON "security_audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_security_audit_user_id" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_security_audit_ip_address" ON "security_audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_security_audit_created_at" ON "security_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_security_configs_config_key" ON "security_configs" USING btree ("config_key");--> statement-breakpoint
CREATE INDEX "sensitive_data_access_log_idx_user_id" ON "sensitive_data_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_data_type" ON "sensitive_data_access_log" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "sensitive_data_access_log_idx_created_at" ON "sensitive_data_access_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sensitive_words_category" ON "sensitive_words" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_sensitive_words_active" ON "sensitive_words" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "seoId" ON "seo_configurations" USING btree ("seoId");--> statement-breakpoint
CREATE INDEX "consensus_report_idx" ON "service_report_consensus" USING btree ("service_report_id");--> statement-breakpoint
CREATE INDEX "consensus_role_idx" ON "service_report_consensus" USING btree ("participantRole");--> statement-breakpoint
CREATE INDEX "consensus_status_idx" ON "service_report_consensus" USING btree ("confirmationStatus");--> statement-breakpoint
CREATE INDEX "service_reports_report_code_unique" ON "service_reports" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "service_reports_service_task_id_idx" ON "service_reports" USING btree ("service_task_id");--> statement-breakpoint
CREATE INDEX "service_reports_customer_id_idx" ON "service_reports" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_reports_status_idx" ON "service_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_tasks_task_code_unique" ON "service_tasks" USING btree ("task_code");--> statement-breakpoint
CREATE INDEX "service_tasks_customer_id_idx" ON "service_tasks" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_tasks_assignee_id_idx" ON "service_tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "service_tasks_supervisor_id_idx" ON "service_tasks" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "idx_site_issue_code" ON "site_issue_tickets" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "idx_site_issue_delivery" ON "site_issue_tickets" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_site_issue_category" ON "site_issue_tickets" USING btree ("issueCategory");--> statement-breakpoint
CREATE INDEX "idx_site_issue_status" ON "site_issue_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_site_issue_severity" ON "site_issue_tickets" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_skill_capsules_skill_id" ON "skill_capsules" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_skill_capsules_owner_did" ON "skill_capsules" USING btree ("owner_did");--> statement-breakpoint
CREATE INDEX "idx_skill_capsules_owner_id" ON "skill_capsules" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_skill_capsules_domain" ON "skill_capsules" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_skill_capsules_level" ON "skill_capsules" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_smart_contracts_bid" ON "smart_contracts" USING btree ("task_bid_id");--> statement-breakpoint
CREATE INDEX "idx_smart_contracts_payer" ON "smart_contracts" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "idx_smart_contracts_payee" ON "smart_contracts" USING btree ("payee_id");--> statement-breakpoint
CREATE INDEX "idx_smart_contracts_status" ON "smart_contracts" USING btree ("executionStatus");--> statement-breakpoint
CREATE INDEX "deviceId" ON "smart_devices" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "idx_social_groups_wx_id" ON "social_groups" USING btree ("group_wx_id");--> statement-breakpoint
CREATE INDEX "idx_social_groups_status" ON "social_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_social_members_group" ON "social_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_social_members_wx" ON "social_members" USING btree ("wx_id");--> statement-breakpoint
CREATE INDEX "idx_social_members_customer" ON "social_members" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_social_messages_group" ON "social_messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_social_messages_sender" ON "social_messages" USING btree ("sender_wx_id");--> statement-breakpoint
CREATE INDEX "idx_social_messages_received" ON "social_messages" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_social_messages_needs_reply" ON "social_messages" USING btree ("needs_reply");--> statement-breakpoint
CREATE INDEX "social_platform_configs_platform_unique" ON "social_platform_configs" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_solution_id" ON "solution_learning_records" USING btree ("solutionId");--> statement-breakpoint
CREATE INDEX "solution_learning_records_idx_learning_type" ON "solution_learning_records" USING btree ("learningType");--> statement-breakpoint
CREATE INDEX "solution_learning_records_learningId" ON "solution_learning_records" USING btree ("learningId");--> statement-breakpoint
CREATE INDEX "solution_recommendations_idx_user_id" ON "solution_recommendations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "solution_recommendations_idx_created_at" ON "solution_recommendations" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "solution_recommendations_recommendationId" ON "solution_recommendations" USING btree ("recommendationId");--> statement-breakpoint
CREATE INDEX "approvalId" ON "special_approvals" USING btree ("approvalId");--> statement-breakpoint
CREATE INDEX "idx_approval_rule_stage" ON "stage_approval_rules" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "idx_approval_stage" ON "stage_approvals" USING btree ("production_stage_id");--> statement-breakpoint
CREATE INDEX "idx_approval_project" ON "stage_approvals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_approval_status" ON "stage_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_approver" ON "stage_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "stage_doc_req_stage_idx" ON "stage_document_requirements" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "stage_reviews_project_idx" ON "stage_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "stage_reviews_stage_idx" ON "stage_reviews" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "cfo_audit_type_idx" ON "strategic_cfo_audit_logs" USING btree ("auditType");--> statement-breakpoint
CREATE INDEX "cfo_audit_target_idx" ON "strategic_cfo_audit_logs" USING btree ("target_id","target_type");--> statement-breakpoint
CREATE INDEX "cfo_audit_anomaly_idx" ON "strategic_cfo_audit_logs" USING btree ("anomaly_score");--> statement-breakpoint
CREATE INDEX "supply_pred_type_idx" ON "supply_chain_predictions" USING btree ("predictionType");--> statement-breakpoint
CREATE INDEX "supply_pred_part_idx" ON "supply_chain_predictions" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "supply_pred_customer_idx" ON "supply_chain_predictions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_system_licenses_license_key" ON "system_licenses" USING btree ("license_key");--> statement-breakpoint
CREATE INDEX "idx_system_licenses_status" ON "system_licenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_modules_code_idx" ON "system_modules" USING btree ("module_code");--> statement-breakpoint
CREATE INDEX "system_modules_parent_idx" ON "system_modules" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_task_bids_task" ON "task_bids" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_bids_bidder" ON "task_bids" USING btree ("bidder_agent_id");--> statement-breakpoint
CREATE INDEX "idx_task_bids_status" ON "task_bids" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_bids_ai_score" ON "task_bids" USING btree ("ai_judge_score");--> statement-breakpoint
CREATE INDEX "task_notifications_notificationId" ON "task_notifications" USING btree ("notificationId");--> statement-breakpoint
CREATE INDEX "teams_meeting_configs_meetingCode_unique" ON "teams_meeting_configs" USING btree ("meetingCode");--> statement-breakpoint
CREATE INDEX "idx_tech_doc_code" ON "technical_documents" USING btree ("doc_code");--> statement-breakpoint
CREATE INDEX "idx_tech_doc_design_package" ON "technical_documents" USING btree ("design_package_id");--> statement-breakpoint
CREATE INDEX "idx_tech_doc_type" ON "technical_documents" USING btree ("docType");--> statement-breakpoint
CREATE INDEX "idx_tech_doc_status" ON "technical_documents" USING btree ("reviewStatus");--> statement-breakpoint
CREATE INDEX "third_party_connectors_code_idx" ON "third_party_connectors" USING btree ("connector_code");--> statement-breakpoint
CREATE INDEX "idx_device_code" ON "time_collection_devices" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "idx_device_type" ON "time_collection_devices" USING btree ("deviceType");--> statement-breakpoint
CREATE INDEX "idx_time_user" ON "time_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_time_project" ON "time_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_time_stage" ON "time_records" USING btree ("production_stage_id");--> statement-breakpoint
CREATE INDEX "idx_time_date" ON "time_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "travel_records_record_code_unique" ON "travel_records" USING btree ("record_code");--> statement-breakpoint
CREATE INDEX "travel_records_employee_id_idx" ON "travel_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "travel_records_expense_claims_id_idx" ON "travel_records" USING btree ("expense_claims_id");--> statement-breakpoint
CREATE INDEX "user_auth_status_user_id_unique" ON "user_auth_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_auth_status_auth_level_idx" ON "user_auth_status" USING btree ("authLevel");--> statement-breakpoint
CREATE INDEX "user_dashboard_configs_user_idx" ON "user_dashboard_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_favorites_user" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_favorites_unique" ON "user_favorites" USING btree ("user_id","menu_path");--> statement-breakpoint
CREATE INDEX "idx_user_mfa_configs_user_id" ON "user_mfa_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_user" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_v2_user_idx" ON "user_profiles_v2" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_v2_role_idx" ON "user_profiles_v2" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_roles_idx_user_id" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_role_id" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_session_id" ON "user_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_is_active" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_user_task_views_user" ON "user_task_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_task_views_role" ON "user_task_views" USING btree ("role_code");--> statement-breakpoint
CREATE INDEX "users_openId_unique" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE INDEX "value_added_orders_order_code_unique" ON "value_added_orders" USING btree ("order_code");--> statement-breakpoint
CREATE INDEX "value_added_orders_customer_id_idx" ON "value_added_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "value_added_orders_source_report_id_idx" ON "value_added_orders" USING btree ("source_report_id");--> statement-breakpoint
CREATE INDEX "vda191_standard_code_idx" ON "vda_191_cleanliness_standards" USING btree ("standard_code");--> statement-breakpoint
CREATE INDEX "vda191_version_idx" ON "vda_191_cleanliness_standards" USING btree ("standard_version");--> statement-breakpoint
CREATE INDEX "visitor_detail_request_id_idx" ON "grt_visitor_details" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "visitor_detail_visitor_id_idx" ON "grt_visitor_details" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "pass_request_id_idx" ON "grt_visitor_passes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "pass_code_idx" ON "grt_visitor_passes" USING btree ("pass_code");--> statement-breakpoint
CREATE INDEX "pass_expires_at_idx" ON "grt_visitor_passes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "visitor_applicant_id_idx" ON "grt_visitor_requests" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "visitor_factory_id_idx" ON "grt_visitor_requests" USING btree ("factory_id");--> statement-breakpoint
CREATE INDEX "visitor_visit_date_idx" ON "grt_visitor_requests" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "visitor_approval_status_idx" ON "grt_visitor_requests" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "visitor_country_idx" ON "grt_visitor_requests" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alert_code" ON "work_hour_alert_logs" USING btree ("alert_code");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alert_task" ON "work_hour_alert_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alert_status" ON "work_hour_alert_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_hour_rule_code" ON "work_hour_alert_rules" USING btree ("rule_code");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alerts_worker" ON "work_hour_alerts" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alerts_status" ON "work_hour_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_hour_alerts_type" ON "work_hour_alerts" USING btree ("alertType");--> statement-breakpoint
CREATE INDEX "idx_work_log_code" ON "work_logs" USING btree ("log_code");--> statement-breakpoint
CREATE INDEX "idx_work_log_task" ON "work_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_work_log_worker" ON "work_logs" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_work_log_time" ON "work_logs" USING btree ("log_time");--> statement-breakpoint
CREATE INDEX "worker_efficiency_records_idx_worker_efficiency_worker" ON "worker_efficiency_records" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_efficiency_records_idx_worker_efficiency_date" ON "worker_efficiency_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "worker_efficiency_stats_idx_worker_efficiency_worker" ON "worker_efficiency_stats" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_efficiency_stats_idx_worker_efficiency_date" ON "worker_efficiency_stats" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "idx_worker_efficiency_ranking" ON "worker_efficiency_stats" USING btree ("ranking");--> statement-breakpoint
CREATE INDEX "idx_workers_employee_code" ON "workers" USING btree ("employee_code");--> statement-breakpoint
CREATE INDEX "idx_workers_department" ON "workers" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_workers_status" ON "workers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_zkp_registry_proof" ON "zkp_registry" USING btree ("proof_id");--> statement-breakpoint
CREATE INDEX "idx_zkp_registry_type" ON "zkp_registry" USING btree ("proofType");--> statement-breakpoint
CREATE INDEX "idx_zkp_registry_entity" ON "zkp_registry" USING btree ("entityType","entity_id");--> statement-breakpoint
CREATE INDEX "idx_zkp_registry_verified" ON "zkp_registry" USING btree ("verified_by_client");--> statement-breakpoint
CREATE INDEX "zkp_audit_request_idx" ON "zkp_verification_audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "zkp_audit_action_idx" ON "zkp_verification_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "zkp_audit_actor_idx" ON "zkp_verification_audit_logs" USING btree ("actorType","actor_id");--> statement-breakpoint
CREATE INDEX "zkp_audit_time_idx" ON "zkp_verification_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "zkp_request_code_idx" ON "zkp_verification_requests" USING btree ("request_code");--> statement-breakpoint
CREATE INDEX "zkp_request_type_idx" ON "zkp_verification_requests" USING btree ("requestType");--> statement-breakpoint
CREATE INDEX "zkp_request_status_idx" ON "zkp_verification_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "zkp_requester_idx" ON "zkp_verification_requests" USING btree ("requester_id","requesterType");--> statement-breakpoint
CREATE INDEX "zkp_result_request_idx" ON "zkp_verification_results" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "zkp_result_verified_idx" ON "zkp_verification_results" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "zkp_result_proof_hash_idx" ON "zkp_verification_results" USING btree ("proof_hash");--> statement-breakpoint
CREATE INDEX "stock_counts_idx_warehouse" ON "stock_counts" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "stock_counts_idx_status" ON "stock_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_counts_idx_type" ON "stock_counts" USING btree ("countType");--> statement-breakpoint
CREATE INDEX "warehouse_issue_items_idx_issue" ON "warehouse_issue_items" USING btree ("issueId");--> statement-breakpoint
CREATE INDEX "warehouse_issue_items_idx_material" ON "warehouse_issue_items" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "warehouse_issues_idx_type" ON "warehouse_issues" USING btree ("issueType");--> statement-breakpoint
CREATE INDEX "warehouse_issues_idx_status" ON "warehouse_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warehouse_issues_idx_warehouse" ON "warehouse_issues" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "warehouse_issues_idx_project" ON "warehouse_issues" USING btree ("projectCode");--> statement-breakpoint
CREATE INDEX "warehouse_locations_idx_warehouse" ON "warehouse_locations" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "warehouse_locations_idx_zone" ON "warehouse_locations" USING btree ("zone");--> statement-breakpoint
CREATE INDEX "warehouse_locations_idx_type" ON "warehouse_locations" USING btree ("locationType");--> statement-breakpoint
CREATE INDEX "warehouse_locations_idx_material" ON "warehouse_locations" USING btree ("currentMaterialCode");--> statement-breakpoint
CREATE INDEX "warehouse_receipt_items_idx_receipt" ON "warehouse_receipt_items" USING btree ("receiptId");--> statement-breakpoint
CREATE INDEX "warehouse_receipt_items_idx_material" ON "warehouse_receipt_items" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "warehouse_receipt_items_idx_lot" ON "warehouse_receipt_items" USING btree ("lotNumber");--> statement-breakpoint
CREATE INDEX "warehouse_receipts_idx_type" ON "warehouse_receipts" USING btree ("receiptType");--> statement-breakpoint
CREATE INDEX "warehouse_receipts_idx_status" ON "warehouse_receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warehouse_receipts_idx_source" ON "warehouse_receipts" USING btree ("sourceDocType","sourceDocId");--> statement-breakpoint
CREATE INDEX "warehouse_receipts_idx_warehouse" ON "warehouse_receipts" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "warehouses_idx_wh_type" ON "warehouses" USING btree ("warehouseType");--> statement-breakpoint
CREATE INDEX "warehouses_idx_wh_bu" ON "warehouses" USING btree ("buCode");--> statement-breakpoint
CREATE INDEX "warehouses_idx_wh_erp" ON "warehouses" USING btree ("erpWarehouseCode");