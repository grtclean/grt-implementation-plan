CREATE TYPE "public"."aei_contribution_type" AS ENUM('design_export', 'plc_version', 'bom_change', 'defect_resolved', 'maintenance_done', 'doc_shared', 'meeting_action', 'cleaning_pass', 'code_review', 'training_completed', 'safety_incident', 'cleanliness_match');--> statement-breakpoint
CREATE TYPE "public"."claw_risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."claw_tool_category" AS ENUM('web_scraping', 'api_integration', 'translation', 'notification', 'search', 'general');--> statement-breakpoint
CREATE TYPE "public"."proposal_history_status" AS ENUM('DRAFT', 'EDITED', 'FINALIZED');--> statement-breakpoint
CREATE TYPE "public"."enforcement_status" AS ENUM('active', 'lifted', 'expired', 'appealed');--> statement-breakpoint
CREATE TYPE "public"."skill_enforcement_type" AS ENUM('revert_six_day_week', 'revert_skill_level', 'position_penalty', 'salary_grade_freeze', 'benefit_revocation', 'probation_extension', 'mandatory_training', 'position_downgrade_warning');--> statement-breakpoint
CREATE TYPE "public"."assessment_round_status" AS ENUM('pending', 'scheduled', 'in_progress', 'passed', 'failed', 'waived', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assessment_round_type" AS ENUM('written_test', 'practical_test', 'interview', 'panel_review', 'probation_eval');--> statement-breakpoint
CREATE TYPE "public"."assessment_trigger_type" AS ENUM('onboarding', 'probation_end', 'position_transfer', 'skill_upgrade_request', 'grade_promotion', 'points_below_threshold', 'points_below_peers', 'consecutive_low_kpi', 'cert_expiry', 'periodic_revalidation', 'manual');--> statement-breakpoint
CREATE TYPE "public"."assessment_workflow_status" AS ENUM('pending', 'in_progress', 'round_completed', 'passed', 'failed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."clock_method_enum" AS ENUM('gps', 'wifi', 'manual', 'dingtalk_import');--> statement-breakpoint
CREATE TYPE "public"."clock_status_enum" AS ENUM('normal', 'late', 'early_leave', 'absent', 'leave', 'offsite');--> statement-breakpoint
CREATE TYPE "public"."auth_audit_event_type" AS ENUM('approval', 'green_channel', 'post_facto', 'delegation', 'escalation', 'override', 'credit_change', 'policy_change');--> statement-breakpoint
CREATE TYPE "public"."auth_domain" AS ENUM('travel', 'procurement', 'budget', 'project', 'customer', 'material', 'expense', 'contract');--> statement-breakpoint
CREATE TYPE "public"."credit_tier" AS ENUM('platinum', 'gold', 'silver', 'bronze', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."integrity_event_type" AS ENUM('on_time_approval', 'accurate_expense', 'proactive_disclosure', 'transparent_comm', 'late_submission', 'inaccurate_report', 'post_facto_violation', 'policy_bypass', 'public_recognition');--> statement-breakpoint
CREATE TYPE "public"."post_facto_status" AS ENUM('pending_doc', 'pending_review', 'approved', 'rejected', 'overdue', 'escalated', 'waived');--> statement-breakpoint
CREATE TYPE "public"."arena_bonus_tier" AS ENUM('S', 'A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."arena_entity_type" AS ENUM('SALES', 'ENGINEER', 'DIVISION', 'MANAGER');--> statement-breakpoint
CREATE TYPE "public"."battle_report_status" AS ENUM('ai_draft', 'user_submitted', 'reviewed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."bi_access_level" AS ENUM('view_summary', 'view_detail', 'view_individual', 'manage');--> statement-breakpoint
CREATE TYPE "public"."bi_period_type" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."bi_report_status" AS ENUM('draft', 'generating', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sla_request_type" AS ENUM('procurement', 'finance_approval', 'it_support', 'hr_request', 'quality_review', 'design_review');--> statement-breakpoint
CREATE TYPE "public"."customer_access_action" AS ENUM('portal_login', 'doc_view', 'doc_download', 'nda_signed', 'access_revoked', 'tier_upgraded');--> statement-breakpoint
CREATE TYPE "public"."customer_access_risk" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."customer_auth_status" AS ENUM('pending_nda', 'active', 'suspended', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."customer_doc_category" AS ENUM('operation_manual', 'maintenance_manual', 'basic_wiring', 'electrical_drawing', 'bom', 'factory_params', 'pid_tuning', 'plc_source_code', 'hmi_variable_table', 'historical_data', 'fat_certificate', 'sat_certificate', 'design_rationale', 'custom');--> statement-breakpoint
CREATE TYPE "public"."customer_nda_status" AS ENUM('pending', 'signed', 'countersigned', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."cooperation_tier" AS ENUM('V0_Strategic_Partner', 'V1_Key_Account', 'V2_Standard', 'V3_Prospect', 'V4_Dormant');--> statement-breakpoint
CREATE TYPE "public"."interlock_timeline" AS ENUM('past', 'present', 'future');--> statement-breakpoint
CREATE TYPE "public"."customer_profile_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."reading_access_level" AS ENUM('full', 'view_only', 'restricted', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."visual_style" AS ENUM('Tech_Premium_Industrial', 'Clean_Minimalist', 'Bold_Engineering', 'Corporate_Classic', 'Green_Sustainability');--> statement-breakpoint
CREATE TYPE "public"."ack_method" AS ENUM('digital_signature', 'checkbox', 'quiz_pass');--> statement-breakpoint
CREATE TYPE "public"."exception_severity" AS ENUM('minor', 'major', 'critical');--> statement-breakpoint
CREATE TYPE "public"."exception_status" AS ENUM('open', 'investigating', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."procedure_priority" AS ENUM('critical', 'high', 'standard', 'reference');--> statement-breakpoint
CREATE TYPE "public"."procedure_status" AS ENUM('draft', 'under_review', 'approved', 'effective', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."procedure_type" AS ENUM('core_procedure', 'regulation', 'compliance', 'exception_handling');--> statement-breakpoint
CREATE TYPE "public"."review_frequency" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'on_change');--> statement-breakpoint
CREATE TYPE "public"."design_sync_event_type" AS ENUM('mech_update', 'plc_gen', 'eplan_gen', 'hmi_gen', 'conflict_detected', 'conflict_resolved', 'robot_anomaly', 'safety_incident', 'hr_penalty', 'version_promoted');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('SOLIDWORKS_VBA', 'SOLIDWORKS_XML', 'EPLAN_XML', 'EPLAN_EXCEL');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('GENERATING', 'COMPLETED', 'FAILED', 'DOWNLOADED');--> statement-breakpoint
CREATE TYPE "public"."station_type" AS ENUM('LOADING', 'PRE_WASH', 'ULTRASONIC', 'SPRAY', 'TURBULENCE', 'ROBOT_CLEAN', 'RINSE', 'DI_RINSE', 'PASSIVATION', 'DEGREASING', 'AIR_KNIFE', 'HOT_AIR_DRY', 'VACUUM_DRY', 'COOLDOWN', 'INSPECTION', 'UNLOADING', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."complaint_severity" AS ENUM('OBSERVATION', 'MINOR', 'MAJOR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."compliance_check_status" AS ENUM('NOT_CHECKED', 'PASS', 'FAIL', 'WAIVED', 'N_A');--> statement-breakpoint
CREATE TYPE "public"."std_category" AS ENUM('power_supply', 'motor_drive', 'plc_control', 'hmi_interface', 'safety_circuit', 'wiring_cable', 'panel_enclosure', 'sensor_instrumentation', 'communication', 'grounding_emc', 'marking_labeling', 'documentation', 'remote_access', 'cybersecurity');--> statement-breakpoint
CREATE TYPE "public"."std_framework" AS ENUM('CE', 'UL', 'CSA', 'GB', 'IEC', 'NFPA', 'SEMI', 'OEM_CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."std_status" AS ENUM('draft', 'under_review', 'active', 'superseded', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."community_post_type" AS ENUM('announcement', 'notice', 'discussion', 'achievement', 'suggestion_share', 'knowledge', 'tech_forum', 'product_qa');--> statement-breakpoint
CREATE TYPE "public"."compliance_check_type" AS ENUM('morning_plan', 'evening_summary', 'next_day_plan');--> statement-breakpoint
CREATE TYPE "public"."elite_benefit_status" AS ENUM('pending', 'approved', 'rejected', 'active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."elite_benefit_type" AS ENUM('alternating_rest', 'five_day_week');--> statement-breakpoint
CREATE TYPE "public"."point_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."point_rule_category" AS ENUM('daily_compliance', 'task_completion', 'quality', 'collaboration', 'training', 'innovation', 'attendance', 'penalty', 'management');--> statement-breakpoint
CREATE TYPE "public"."point_transaction_type" AS ENUM('award', 'penalty', 'redeem', 'adjust', 'expire');--> statement-breakpoint
CREATE TYPE "public"."point_redemption_status" AS ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('draft', 'submitted', 'under_review', 'effective', 'outstanding', 'major', 'rejected', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."career_advice_type" AS ENUM('STRENGTH', 'DEVELOPMENT', 'OPPORTUNITY', 'WARNING');--> statement-breakpoint
CREATE TYPE "public"."employee_profile_tier" AS ENUM('S', 'A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."emp_appraisal_status" AS ENUM('draft', 'generated', 'employee_read', 'manager_signed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."emp_briefing_status" AS ENUM('pending', 'generated', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."emp_daily_log_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('uploading', 'assembling', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."defect_source" AS ENUM('SHOP_FLOOR', 'FINAL_QC', 'IQC', 'CUSTOMER_RETURN', 'INTERNAL_AUDIT');--> statement-breakpoint
CREATE TYPE "public"."fmea_dynamic_status" AS ENUM('NOMINAL', 'ELEVATED', 'CRITICAL', 'CAPA_INITIATED');--> statement-breakpoint
CREATE TYPE "public"."grt_device_status" AS ENUM('online', 'offline', 'error', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."grt_device_type" AS ENUM('plc', 'robot', 'hmi', 'sensor', 'gateway', 'drive', 'switch', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."grt_scan_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."grt_scan_type" AS ENUM('network', 'plc', 'robot', 'sharepoint', 'database', 'full');--> statement-breakpoint
CREATE TYPE "public"."hmi_screen_type" AS ENUM('main_overview', 'station_detail', 'alarm_list', 'recipe_management', 'trend_chart', 'user_management', 'maintenance', 'diagnostics');--> statement-breakpoint
CREATE TYPE "public"."hmi_target_platform" AS ENUM('siemens_comfort', 'siemens_unified', 'weintek_eb', 'pro_face', 'generic_html');--> statement-breakpoint
CREATE TYPE "public"."gripper_type" AS ENUM('parallel_jaw', 'vacuum_suction', 'magnetic', 'adaptive_finger', 'soft_gripper');--> statement-breakpoint
CREATE TYPE "public"."handling_job_status" AS ENUM('queued', 'picking', 'loading', 'cleaning', 'unloading', 'placing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."humanoid_status" AS ENUM('idle', 'working', 'loading', 'unloading', 'maintenance', 'error', 'offline');--> statement-breakpoint
CREATE TYPE "public"."maintenance_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."maintenance_schedule_type" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'runtime_based', 'event_triggered');--> statement-breakpoint
CREATE TYPE "public"."maintenance_step_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."maintenance_wo_status" AS ENUM('draft', 'scheduled', 'in_progress', 'pending_review', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vision_result" AS ENUM('pass', 'fail', 'inconclusive', 'error');--> statement-breakpoint
CREATE TYPE "public"."vision_task_type" AS ENUM('part_recognition', 'cleanliness_check', 'dimension_measure', 'defect_detection', 'barcode_scan');--> statement-breakpoint
CREATE TYPE "public"."mech_acceptance_result" AS ENUM('PENDING', 'ACCEPTED', 'CONDITIONAL', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."mech_check_status" AS ENUM('NOT_CHECKED', 'PASS', 'FAIL', 'WAIVED', 'N_A');--> statement-breakpoint
CREATE TYPE "public"."mech_link_type" AS ENUM('derives_from', 'supersedes', 'conflicts_with', 'requires', 'references', 'complements');--> statement-breakpoint
CREATE TYPE "public"."mech_std_category" AS ENUM('structural_frame', 'material_selection', 'surface_treatment', 'welding', 'fastener', 'sealing', 'pneumatic_hydraulic', 'piping_routing', 'thermal_management', 'noise_vibration', 'ergonomic_access', 'safety_guarding', 'appearance_paint', 'packaging_shipping');--> statement-breakpoint
CREATE TYPE "public"."mech_std_origin" AS ENUM('GRT_INTERNAL', 'ISO', 'DIN', 'EN', 'GB', 'ASME', 'JIS', 'OEM_CUSTOMER', 'INDUSTRY');--> statement-breakpoint
CREATE TYPE "public"."mech_std_status" AS ENUM('draft', 'under_review', 'active', 'superseded', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."oem_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."oem_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."oem_webhook_status" AS ENUM('active', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."ps_adjust_status_enum" AS ENUM('draft', 'pending', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."ps_adjust_type_enum" AS ENUM('perf_wage_override', 'attendance_correction', 'bonus_addition', 'deduction_correction', 'retroactive', 'other');--> statement-breakpoint
CREATE TYPE "public"."ps_allowance_type_enum" AS ENUM('cash_subsidy', 'travel_car', 'meal', 'communication', 'housing', 'other');--> statement-breakpoint
CREATE TYPE "public"."ps_cycle_status_enum" AS ENUM('draft', 'importing', 'imported', 'calculating', 'calculated', 'reviewing', 'approved', 'locked');--> statement-breakpoint
CREATE TYPE "public"."ps_payout_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ps_position_category_enum" AS ENUM('indirect', 'direct');--> statement-breakpoint
CREATE TYPE "public"."pdm_baseline_status" AS ENUM('draft', 'approved', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."pdm_deviation_severity" AS ENUM('minor', 'major', 'critical');--> statement-breakpoint
CREATE TYPE "public"."pdm_deviation_type" AS ENUM('material_substitution', 'process_change', 'quantity_change');--> statement-breakpoint
CREATE TYPE "public"."pdm_eco_step_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pdm_eco_step_type" AS ENUM('ecr_submit', 'impact_analysis', 'review', 'approval', 'execute', 'verify', 'close');--> statement-breakpoint
CREATE TYPE "public"."pdm_insight_status" AS ENUM('open', 'investigating', 'eco_created', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."pdm_insight_type" AS ENUM('recurring_failure', 'design_weakness', 'improvement_opportunity');--> statement-breakpoint
CREATE TYPE "public"."pdm_lifecycle_status" AS ENUM('concept', 'design', 'released', 'production', 'service', 'eol');--> statement-breakpoint
CREATE TYPE "public"."pdm_product_family" AS ENUM('USC', 'SPR', 'IMM');--> statement-breakpoint
CREATE TYPE "public"."pdm_readiness_check_type" AS ENUM('bom_approved', 'plm_released', 'plc_promoted', 'eplan_exported', 'standards_validated', 'fmea_completed', 'conflict_free');--> statement-breakpoint
CREATE TYPE "public"."pdm_readiness_status" AS ENUM('not_checked', 'passed', 'failed', 'waived');--> statement-breakpoint
CREATE TYPE "public"."pdm_requirement_category" AS ENUM('functional', 'performance', 'safety', 'cleanliness', 'regulatory');--> statement-breakpoint
CREATE TYPE "public"."pdm_verification_status" AS ENUM('not_started', 'in_progress', 'passed', 'failed', 'waived');--> statement-breakpoint
CREATE TYPE "public"."calibration_session_status_enum" AS ENUM('draft', 'in_progress', 'completed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."composite_score_status_enum" AS ENUM('ai_scored', 'under_review', 'calibrated', 'finalized', 'locked');--> statement-breakpoint
CREATE TYPE "public"."feedback_relationship_enum" AS ENUM('self', 'manager', 'peer', 'subordinate', 'cross_functional');--> statement-breakpoint
CREATE TYPE "public"."incentive_calc_method_enum" AS ENUM('fixed', 'percentage', 'formula');--> statement-breakpoint
CREATE TYPE "public"."incentive_category_enum" AS ENUM('skill_premium', 'project_bonus', 'innovation_reward', 'team_incentive', 'retention_bonus', 'referral_bonus');--> statement-breakpoint
CREATE TYPE "public"."perf_grade_enum" AS ENUM('S', 'A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."ps_anomaly_category_enum" AS ENUM('evidence_insufficient', 'perf_quality_conflict', 'allowance_no_basis', 'social_fund_mismatch', 'tax_bracket_anomaly', 'net_pay_volatility');--> statement-breakpoint
CREATE TYPE "public"."ps_anomaly_severity_enum" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ps_approval_action_enum" AS ENUM('pending', 'approved', 'rejected', 'returned');--> statement-breakpoint
CREATE TYPE "public"."ps_approval_stage_enum" AS ENUM('hr_initial', 'finance_review', 'dept_manager_confirm', 'exec_approve');--> statement-breakpoint
CREATE TYPE "public"."ps_bonus_tier_enum" AS ENUM('tier_s', 'tier_a', 'tier_b', 'tier_c', 'tier_d', 'tier_zero');--> statement-breakpoint
CREATE TYPE "public"."ps_evidence_type_enum" AS ENUM('task_timeliness', 'internal_feedback', 'external_feedback', 'quality_rework', 'ai_commentary');--> statement-breakpoint
CREATE TYPE "public"."ps_review_status_enum" AS ENUM('pending_evidence', 'ai_suggested', 'supervisor_confirmed', 'frozen', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."violation_severity" AS ENUM('MINOR', 'MAJOR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."violation_status" AS ENUM('open', 'investigating', 'confirmed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."plc_brand" AS ENUM('SIEMENS_S7_1500', 'SIEMENS_S7_1200', 'ABB_AC500', 'INOVANCE_AM600', 'INOVANCE_H5U', 'MITSUBISHI_IQR', 'OMRON_NX', 'OMRON_NJ');--> statement-breakpoint
CREATE TYPE "public"."plc_module_type" AS ENUM('OB', 'FB', 'FC', 'DB', 'UDT', 'SAFETY_FB');--> statement-breakpoint
CREATE TYPE "public"."plc_program_mode" AS ENUM('auto', 'manual', 'service', 'changeover', 'debug', 'e_stop', 'initializing');--> statement-breakpoint
CREATE TYPE "public"."plc_program_status" AS ENUM('draft', 'dev', 'testing', 'staging', 'production', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."project_review_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_review_type" AS ENUM('bom_review', 'drawing_review', 'delay_prediction');--> statement-breakpoint
CREATE TYPE "public"."access_urgency" AS ENUM('NORMAL', 'URGENT', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."remote_access_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."rnd_bom_component_source" AS ENUM('avl_approved', 'prototype', 'experimental', '3d_printed', 'cots');--> statement-breakpoint
CREATE TYPE "public"."rnd_bom_snapshot_reason" AS ENUM('gate_freeze', 'manual_baseline', 'pre_promotion');--> statement-breakpoint
CREATE TYPE "public"."rnd_gate_decision" AS ENUM('pending', 'approved', 'conditional', 'rejected', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."rnd_project_category" AS ENUM('robotics', 'vision_ai', 'fluid_mechanics', 'mechatronics', 'software');--> statement-breakpoint
CREATE TYPE "public"."rnd_project_status" AS ENUM('draft', 'active', 'on_hold', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."rnd_routing_step_type" AS ENUM('assembly', 'inspection', 'eol_test', 'packaging', 'labeling');--> statement-breakpoint
CREATE TYPE "public"."rnd_stage" AS ENUM('concept', 'evt', 'dvt', 'pvt', 'mass_production');--> statement-breakpoint
CREATE TYPE "public"."rnd_test_type" AS ENUM('unit_test', 'integration_test', 'stress_test', 'environmental', 'compliance', 'performance');--> statement-breakpoint
CREATE TYPE "public"."rnd_test_verdict" AS ENUM('pass', 'fail', 'conditional', 'not_run');--> statement-breakpoint
CREATE TYPE "public"."robot_auth_method_enum" AS ENUM('none', 'token', 'certificate');--> statement-breakpoint
CREATE TYPE "public"."connection_event_enum" AS ENUM('connect', 'disconnect', 'error', 'heartbeat', 'command');--> statement-breakpoint
CREATE TYPE "public"."robot_alert_severity_enum" AS ENUM('info', 'warning', 'critical', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."robot_alert_type_enum" AS ENUM('overtemp', 'collision', 'estop', 'servo_error', 'comm_loss', 'joint_limit', 'payload_exceeded');--> statement-breakpoint
CREATE TYPE "public"."robot_brand_enum" AS ENUM('kuka', 'fanuc', 'abb', 'staubli');--> statement-breakpoint
CREATE TYPE "public"."robot_process_enum" AS ENUM('cleaning', 'assembly', 'welding', 'painting', 'palletizing', 'inspection', 'other');--> statement-breakpoint
CREATE TYPE "public"."robot_protocol_enum" AS ENUM('RSI', 'PCDK', 'EGM', 'uniVAL');--> statement-breakpoint
CREATE TYPE "public"."robot_status_enum" AS ENUM('online', 'offline', 'error', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."program_execution_result_enum" AS ENUM('running', 'success', 'partial', 'failed', 'aborted', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."execution_trigger_type_enum" AS ENUM('stage_auto', 'manual', 'commissioning', 'protocol_test');--> statement-breakpoint
CREATE TYPE "public"."equipment_program_status_enum" AS ENUM('draft', 'review', 'approved', 'deployed', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."equipment_program_type_enum" AS ENUM('robot_motion', 'plc_ladder', 'plc_st', 'hmi_screen', 'vision', 'conveyor');--> statement-breakpoint
CREATE TYPE "public"."stage_assignment_role_enum" AS ENUM('primary', 'backup', 'support');--> statement-breakpoint
CREATE TYPE "public"."stage_assignment_status_enum" AS ENUM('planned', 'programmed', 'active', 'completed', 'released');--> statement-breakpoint
CREATE TYPE "public"."sc_bidding_strategy_status" AS ENUM('draft', 'submitted', 'reviewed', 'approved');--> statement-breakpoint
CREATE TYPE "public"."sc_budget_deadline_status" AS ENUM('pending', 'partial', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."change_task_status" AS ENUM('draft', 'ai_generated', 'human_reviewed', 'approved', 'implementing', 'verified', 'deployed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."change_task_type" AS ENUM('code_change', 'api_change', 'schema_change', 'config_change', 'test', 'documentation', 'rollback_step');--> statement-breakpoint
CREATE TYPE "public"."release_gate_status" AS ENUM('pending', 'in_progress', 'passed', 'failed', 'skipped', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."release_gate_type" AS ENUM('proposal_review', 'red_team', 'preflight', 'canary', 'full_deploy');--> statement-breakpoint
CREATE TYPE "public"."sandbox_priority" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."sandbox_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."sandbox_run_type" AS ENUM('proposal', 'implementation', 'review', 'dry_run');--> statement-breakpoint
CREATE TYPE "public"."sandbox_scenario_status" AS ENUM('draft', 'submitted', 'planning', 'reviewed', 'approved', 'implementing', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."agent_status_enum" AS ENUM('active', 'standby', 'disabled', 'error');--> statement-breakpoint
CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automationMeetingStatusEnum" AS ENUM('UPCOMING', 'IN_PROGRESS', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."automationTriggerTypeEnum" AS ENUM('PHASE_CHANGE', 'T_NODE_DELAY', 'OKR_AT_RISK', 'QUALITY_ESCALATION', 'SUPPLIER_PENALTY');--> statement-breakpoint
CREATE TYPE "public"."audit_action_type" AS ENUM('LOGIN', 'LOGOUT', 'DOWNLOAD_CAD', 'DOWNLOAD_BOM', 'DOWNLOAD_PDF', 'EXPORT_DATA', 'UNAUTHORIZED_ACCESS', 'PERMISSION_ESCALATION', 'BULK_QUERY', 'SENSITIVE_VIEW', 'CONFIG_CHANGE', 'DATA_DELETE', 'API_KEY_ACCESS', 'AFTER_HOURS_ACCESS');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."anomaly_action_type" AS ENUM('alert', 'block', 'maintenance', 'retrain', 'escalate');--> statement-breakpoint
CREATE TYPE "public"."anomaly_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."skill_session_status" AS ENUM('pending', 'in_progress', 'submitted', 'grading', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."skill_cert_status" AS ENUM('active', 'expired', 'revoked', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."skill_question_difficulty" AS ENUM('basic', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."skill_question_type" AS ENUM('single_choice', 'multi_choice', 'true_false', 'fill_blank', 'short_answer', 'practical', 'case_analysis');--> statement-breakpoint
CREATE TYPE "public"."skill_level_grade" AS ENUM('L1', 'L2', 'L3', 'L4', 'L5');--> statement-breakpoint
CREATE TYPE "public"."award_type_enum" AS ENUM('outstanding_contributor', 'innovation', 'quality_excellence', 'safety_champion', 'team_collaboration', 'customer_service');--> statement-breakpoint
CREATE TYPE "public"."evaluation_grade_enum" AS ENUM('S', 'A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."leave_type_enum" AS ENUM('annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'marriage', 'work_injury');--> statement-breakpoint
CREATE TYPE "public"."payroll_status_enum" AS ENUM('DRAFT', 'HR_VERIFIED', 'FINANCE_APPROVED', 'CEO_APPROVED', 'PAID', 'REJECTED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."cleaning_type" AS ENUM('ULTRASONIC', 'SPRAY', 'IMMERSION', 'VACUUM_DRY', 'HOT_AIR_DRY', 'COMBINATION');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('GENERATING', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUSHED_TO_M3', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PROPOSAL_READY', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."medal_level" AS ENUM('GOLD', 'SILVER', 'BRONZE');--> statement-breakpoint
CREATE TYPE "public"."supplier_audit_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."elimination_status" AS ENUM('proposed', 'under_review', 'approved', 'executed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."supplier_qual_app_status" AS ENUM('draft', 'submitted', 'quality_review', 'quality_passed', 'quality_rejected', 'commercial_review', 'special_approval', 'pending_sign_off', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."spot_check_result" AS ENUM('conforming', 'minor_issue', 'major_issue', 'critical');--> statement-breakpoint
ALTER TYPE "public"."sys_audit_action" ADD VALUE 'APPROVE_KNOWLEDGE';--> statement-breakpoint
ALTER TYPE "public"."sys_audit_action" ADD VALUE 'ROLLBACK_KNOWLEDGE';--> statement-breakpoint
ALTER TYPE "public"."sys_audit_action" ADD VALUE 'SYSTEM_FREEZE';--> statement-breakpoint
ALTER TYPE "public"."help_category" ADD VALUE 'CHANGELOG';--> statement-breakpoint
ALTER TYPE "public"."help_category" ADD VALUE 'WALKTHROUGH';--> statement-breakpoint
CREATE TABLE "aei_contribution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(200) NOT NULL,
	"contribution_type" "aei_contribution_type" NOT NULL,
	"source_table" varchar(100) NOT NULL,
	"source_id" integer,
	"points" integer DEFAULT 1 NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"month" varchar(7) NOT NULL,
	"bu_code" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aei_monthly_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(200) NOT NULL,
	"month" varchar(7) NOT NULL,
	"meeting_score" real DEFAULT 0,
	"engineering_score" real DEFAULT 0,
	"operational_score" real DEFAULT 0,
	"collaboration_score" real DEFAULT 0,
	"composite_aei_score" real DEFAULT 0,
	"rank" integer,
	"total_employees" integer,
	"trend_slope" real,
	"risk_flag" varchar(30),
	"details" json DEFAULT '{"designExports":0,"plcVersions":0,"defectsResolved":0,"cleaningPassRate":0,"docsShared":0,"trainingsCompleted":0,"safetyIncidents":0}'::json,
	"bu_code" varchar(20),
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentGovernanceId" integer NOT NULL,
	"agentCode" varchar(50) NOT NULL,
	"version" integer NOT NULL,
	"executionId" varchar(50) NOT NULL,
	"triggeredBy" varchar(50) NOT NULL,
	"triggerUserId" integer,
	"triggerContext" text,
	"inputData" text,
	"outputData" text,
	"status" varchar(20) NOT NULL,
	"errorMessage" text,
	"executionTimeMs" integer,
	"tokensUsed" integer DEFAULT 0,
	"requiresHumanReview" boolean DEFAULT false,
	"humanReviewStatus" varchar(20),
	"humanReviewerId" integer,
	"humanReviewedAt" timestamp,
	"humanReviewNotes" text,
	"affectedEntities" text,
	"rollbackPerformed" boolean DEFAULT false,
	"rollbackAt" timestamp,
	"referenceManualResultId" integer,
	"referenceManualResult" text,
	"comparisonScore" numeric(5, 2),
	"comparisonNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_governance" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentCode" varchar(50) NOT NULL,
	"agentName" varchar(200) NOT NULL,
	"agentCategory" varchar(50) NOT NULL,
	"businessObjective" text NOT NULL,
	"inputSchema" text,
	"outputSchema" text,
	"prerequisites" text,
	"executionSteps" text,
	"riskLevel" varchar(20) DEFAULT 'medium',
	"impactScope" text,
	"permissionBoundary" text,
	"humanReviewRequired" boolean DEFAULT true,
	"humanReviewSteps" text,
	"knowledgeSources" text,
	"aiProvider" varchar(50) DEFAULT 'claude',
	"aiModel" varchar(100),
	"systemPrompt" text,
	"temperature" numeric(3, 2) DEFAULT '0.3',
	"version" integer DEFAULT 1,
	"previousVersionId" integer,
	"changeLog" text,
	"environment" varchar(20) DEFAULT 'sandbox',
	"status" varchar(20) DEFAULT 'draft',
	"activatedAt" timestamp,
	"activatedBy" integer,
	"pausedAt" timestamp,
	"pausedReason" text,
	"retiredAt" timestamp,
	"rollbackStrategy" varchar(50) DEFAULT 'manual',
	"rollbackThreshold" numeric(5, 2),
	"rollbackTargetVersionId" integer,
	"totalExecutions" integer DEFAULT 0,
	"successfulExecutions" integer DEFAULT 0,
	"failedExecutions" integer DEFAULT 0,
	"averageExecutionTimeMs" integer DEFAULT 0,
	"totalTokensConsumed" integer DEFAULT 0,
	"lastExecutedAt" timestamp,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_governance_uk_code_version" UNIQUE("agentCode","version")
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentGovernanceId" integer NOT NULL,
	"knowledgeSourceType" varchar(50) NOT NULL,
	"knowledgeSourceId" varchar(100),
	"knowledgeSourceName" varchar(200) NOT NULL,
	"accessLevel" varchar(20) DEFAULT 'read',
	"isRequired" boolean DEFAULT true,
	"lastSyncAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agv_charging_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_code" varchar(30) NOT NULL,
	"station_name" varchar(100),
	"location_x" numeric(10, 4) NOT NULL,
	"location_y" numeric(10, 4) NOT NULL,
	"zone_id" integer,
	"charger_type" varchar(30) DEFAULT 'standard',
	"max_charging_power" numeric(8, 2),
	"status" varchar(20) DEFAULT 'available',
	"current_agv_id" integer,
	"current_agv_code" varchar(30),
	"charging_start_at" timestamp,
	"estimated_complete_at" timestamp,
	"total_charge_cycles" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agv_charging_stations_station_code_unique" UNIQUE("station_code")
);
--> statement-breakpoint
CREATE TABLE "agv_fleet" (
	"id" serial PRIMARY KEY NOT NULL,
	"agv_code" varchar(30) NOT NULL,
	"model" varchar(100),
	"manufacturer" varchar(100),
	"serial_number" varchar(100),
	"load_capacity_kg" numeric(8, 2) DEFAULT '500',
	"battery_capacity_ah" numeric(8, 2),
	"battery_pct" numeric(5, 2) DEFAULT '100',
	"status" varchar(20) DEFAULT 'idle',
	"current_location_x" numeric(10, 4),
	"current_location_y" numeric(10, 4),
	"current_location_z" numeric(10, 4),
	"target_location_x" numeric(10, 4),
	"target_location_y" numeric(10, 4),
	"current_zone_id" integer,
	"uwb_tag_id" varchar(50),
	"speed_m_per_min" numeric(6, 2) DEFAULT '30',
	"current_task_id" integer,
	"navigation_mode" varchar(20) DEFAULT 'magnetic_strip',
	"last_maintenance_at" timestamp,
	"next_maintenance_at" timestamp,
	"total_distance_km" numeric(10, 2) DEFAULT '0',
	"total_tasks_completed" integer DEFAULT 0,
	"ip_address" varchar(50),
	"firmware_version" varchar(30),
	"bu_code" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agv_fleet_agv_code_unique" UNIQUE("agv_code")
);
--> statement-breakpoint
CREATE TABLE "agv_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_code" varchar(30) NOT NULL,
	"route_name" varchar(100) NOT NULL,
	"from_zone_id" integer NOT NULL,
	"from_zone_name" varchar(100),
	"to_zone_id" integer NOT NULL,
	"to_zone_name" varchar(100),
	"waypoints" json NOT NULL,
	"distance_m" numeric(8, 2) NOT NULL,
	"estimated_time_seconds" integer NOT NULL,
	"priority" integer DEFAULT 5,
	"is_one_way" boolean DEFAULT false,
	"max_concurrent_agvs" integer DEFAULT 1,
	"route_type" varchar(20) DEFAULT 'standard',
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"avg_actual_time_seconds" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agv_routes_route_code_unique" UNIQUE("route_code")
);
--> statement-breakpoint
CREATE TABLE "agv_traffic_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(30) NOT NULL,
	"from_zone_id" integer NOT NULL,
	"to_zone_id" integer NOT NULL,
	"max_concurrent_agvs" integer DEFAULT 1,
	"is_one_way_only" boolean DEFAULT false,
	"allowed_direction" varchar(20),
	"priority_override" integer,
	"speed_limit_m_per_min" numeric(6, 2),
	"time_restriction" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "agv_traffic_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "agv_transport_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_code" varchar(30) NOT NULL,
	"agv_id" integer,
	"route_id" integer,
	"task_type" varchar(30) NOT NULL,
	"from_location" varchar(100) NOT NULL,
	"to_location" varchar(100) NOT NULL,
	"from_location_x" numeric(10, 4),
	"from_location_y" numeric(10, 4),
	"to_location_x" numeric(10, 4),
	"to_location_y" numeric(10, 4),
	"material_id" integer,
	"material_code" varchar(50),
	"material_name" varchar(200),
	"quantity" numeric(10, 2),
	"unit" varchar(20),
	"work_order_id" integer,
	"priority" integer DEFAULT 5,
	"status" varchar(20) DEFAULT 'queued',
	"requested_by" integer,
	"requested_at" timestamp DEFAULT now(),
	"dispatched_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failure_reason" text,
	"actual_distance_m" numeric(8, 2),
	"actual_time_seconds" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agv_transport_tasks_task_code_unique" UNIQUE("task_code")
);
--> statement-breakpoint
CREATE TABLE "ai_tools_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_code" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description" text,
	"category" "claw_tool_category" NOT NULL,
	"endpoint_url" text NOT NULL,
	"http_method" varchar(10) DEFAULT 'GET' NOT NULL,
	"default_headers" json,
	"default_params" json,
	"timeout_ms" integer DEFAULT 30000,
	"max_retries" integer DEFAULT 3,
	"requires_approval" boolean DEFAULT false,
	"risk_level" "claw_risk_level" DEFAULT 'low' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_tools_registry_tool_code_unique" UNIQUE("tool_code")
);
--> statement-breakpoint
CREATE TABLE "role_tool_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_code" varchar(50) NOT NULL,
	"tool_id" integer NOT NULL,
	"can_execute" boolean DEFAULT true,
	"can_approve" boolean DEFAULT false,
	"granted_by" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_tool_mappings_unique" UNIQUE("role_code","tool_id")
);
--> statement-breakpoint
CREATE TABLE "ai_proposal_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_document_id" integer,
	"prompt_used" text NOT NULL,
	"generated_content" text NOT NULL,
	"status" "proposal_history_status" DEFAULT 'DRAFT' NOT NULL,
	"feedback_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_goal_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"adjustment_type" varchar(30) NOT NULL,
	"reason" text NOT NULL,
	"trigger_event" varchar(200),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"previous_state_json" json NOT NULL,
	"proposed_state_json" json NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_by_name" varchar(100),
	"approved_by" integer,
	"approved_by_name" varchar(100),
	"approved_at" timestamp,
	"rejection_reason" text,
	"effective_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_goal_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_open_id" varchar(50),
	"manager_id" integer NOT NULL,
	"manager_name" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_salary_grade" varchar(20),
	"base_salary_snapshot" numeric(14, 2),
	"career_path_option_json" json,
	"career_path_accepted" boolean DEFAULT false,
	"performance_levels_json" json DEFAULT '[{"level":"差","code":"D","bonusMonths":0},{"level":"中","code":"C","bonusMonths":1},{"level":"良","code":"B","bonusMonths":2},{"level":"优","code":"A","bonusMonths":3}]' NOT NULL,
	"bonus_cap_months" numeric(4, 1) DEFAULT '3.0',
	"projected_bonus_months" numeric(4, 1) DEFAULT '0.0',
	"total_weight_validation" numeric(5, 2) DEFAULT '0.00',
	"deliverable_deadline" timestamp,
	"deliverable_description" text,
	"communication_channel" varchar(30) DEFAULT 'email',
	"signed_by_employee" boolean DEFAULT false,
	"signed_by_manager" boolean DEFAULT false,
	"employee_signed_at" timestamp,
	"manager_signed_at" timestamp,
	"document_url" text,
	"department" varchar(100),
	"bu_code" varchar(50),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_goal_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_value" json,
	"new_value" json,
	"changed_by" integer NOT NULL,
	"changed_by_name" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_goal_checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"checkpoint_type" varchar(20) NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"actual_date" timestamp,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"overall_score" numeric(5, 2),
	"performance_level_code" varchar(5),
	"dimension_scores_json" json,
	"manager_comments" text,
	"employee_self_assessment" text,
	"projected_bonus_months" numeric(4, 1),
	"reviewed_by" integer,
	"reviewed_by_name" varchar(100),
	"attachments" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_goal_dimensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"dimension_name" varchar(200) NOT NULL,
	"dimension_name_en" varchar(200),
	"dimension_code" varchar(50) NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"description" text,
	"kpi_targets_json" json,
	"current_score" numeric(5, 2) DEFAULT '0.00',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_goal_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"thread_id" varchar(50),
	"sender_id" integer NOT NULL,
	"sender_name" varchar(100),
	"message_type" varchar(30) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"attachments" json,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annual_incentive_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"trigger_type" varchar(30) NOT NULL,
	"base_salary" numeric(14, 2),
	"composite_score" numeric(5, 2),
	"performance_level_code" varchar(5),
	"bonus_months" numeric(4, 1),
	"career_multiplier" numeric(4, 2) DEFAULT '1.00',
	"salary_adjustment_pct" numeric(5, 2) DEFAULT '0.00',
	"projected_bonus_amount" numeric(14, 2),
	"projected_new_salary" numeric(14, 2),
	"dimension_breakdown_json" json,
	"calculation_details_json" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessment_trigger_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"rule_id" integer NOT NULL,
	"rule_code" varchar(80) NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_data" json NOT NULL,
	"workflow_id" integer,
	"session_id" integer,
	"outcome" varchar(30),
	"outcome_at" timestamp,
	"position_key" varchar(80),
	"current_level" varchar(10),
	"target_level" varchar(10),
	"lifecycle_stage" varchar(10),
	"due_date" varchar(10),
	"enforcement_applied" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_trigger_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(80) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"rule_name_en" varchar(200),
	"trigger_type" "assessment_trigger_type" NOT NULL,
	"description" text,
	"applicable_positions" json,
	"conditions" json NOT NULL,
	"assessment_level" varchar(10),
	"is_multi_round" boolean DEFAULT false NOT NULL,
	"workflow_template_id" integer,
	"failure_consequences" json DEFAULT '[]'::json NOT NULL,
	"max_retries" integer DEFAULT 2 NOT NULL,
	"retry_cooldown_days" integer DEFAULT 30 NOT NULL,
	"grace_period_days" integer DEFAULT 14 NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_trigger_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "assessment_workflow_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"round_type" "assessment_round_type" NOT NULL,
	"round_name" varchar(200) NOT NULL,
	"round_status" "assessment_round_status" DEFAULT 'pending' NOT NULL,
	"session_id" integer,
	"paper_id" integer,
	"score" numeric(5, 2),
	"pass_score" numeric(5, 2) NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"panelists" json,
	"evaluation_criteria" json,
	"scheduled_date" varchar(10),
	"scheduled_time" varchar(5),
	"location" varchar(200),
	"started_at" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "round_workflow_number_uniq" UNIQUE("workflow_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "assessment_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"trigger_rule_id" integer,
	"trigger_log_id" integer,
	"position_key" varchar(80) NOT NULL,
	"target_level" varchar(10) NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"current_round" integer DEFAULT 1 NOT NULL,
	"total_rounds" integer NOT NULL,
	"status" "assessment_workflow_status" DEFAULT 'pending' NOT NULL,
	"overall_score" numeric(5, 2),
	"round_weights" json NOT NULL,
	"final_decision" varchar(20),
	"decided_by" integer,
	"decided_at" timestamp,
	"decision_notes" text,
	"scheduled_start_date" varchar(10),
	"deadline" varchar(10),
	"completed_at" timestamp,
	"retry_number" integer DEFAULT 0 NOT NULL,
	"lifecycle_stage_at_trigger" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_benchmark_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_key" varchar(80) NOT NULL,
	"period" varchar(7) NOT NULL,
	"avg_points" numeric(10, 2),
	"avg_kpi_score" numeric(5, 2),
	"min_acceptable_points" integer,
	"peer_threshold_10pct" integer,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "benchmark_position_period_uniq" UNIQUE("position_key","period")
);
--> statement-breakpoint
CREATE TABLE "skill_enforcement_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"trigger_log_id" integer,
	"workflow_id" integer,
	"enforcement_type" "skill_enforcement_type" NOT NULL,
	"enforcement_status" "enforcement_status" DEFAULT 'active' NOT NULL,
	"description" text NOT NULL,
	"enforcement_data" json NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10),
	"lifted_at" timestamp,
	"lifted_by" integer,
	"lifted_reason" text,
	"reassessment_passed" boolean,
	"reassessment_session_id" integer,
	"issued_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_clock_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"clock_date" varchar(10) NOT NULL,
	"clock_in_time" timestamp,
	"clock_in_lat" numeric(10, 7),
	"clock_in_lng" numeric(10, 7),
	"clock_in_distance_meters" numeric(8, 1),
	"clock_in_method" "clock_method_enum",
	"clock_in_photo" varchar(500),
	"clock_out_time" timestamp,
	"clock_out_lat" numeric(10, 7),
	"clock_out_lng" numeric(10, 7),
	"clock_out_distance_meters" numeric(8, 1),
	"clock_out_method" "clock_method_enum",
	"is_offsite" boolean DEFAULT false NOT NULL,
	"offsite_customer_name" varchar(200),
	"clock_status" "clock_status_enum" DEFAULT 'normal' NOT NULL,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"early_leave_minutes" integer DEFAULT 0 NOT NULL,
	"work_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_excursions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"excursion_date" varchar(10) NOT NULL,
	"timestamp_out" timestamp NOT NULL,
	"gps_lat_out" numeric(10, 7) NOT NULL,
	"gps_lng_out" numeric(10, 7) NOT NULL,
	"distance_meters_out" numeric(8, 1),
	"timestamp_in" timestamp,
	"gps_lat_in" numeric(10, 7),
	"gps_lng_in" numeric(10, 7),
	"is_during_break" boolean DEFAULT false NOT NULL,
	"break_label" varchar(50),
	"duration_minutes" integer,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"work_days_per_week" integer DEFAULT 6 NOT NULL,
	"daily_hours" numeric(4, 1) DEFAULT '8.0' NOT NULL,
	"shift_start" varchar(5) DEFAULT '08:00' NOT NULL,
	"shift_end" varchar(5) DEFAULT '17:00' NOT NULL,
	"late_grace_minutes" integer DEFAULT 5 NOT NULL,
	"office_lat" numeric(10, 7) DEFAULT '31.4913000' NOT NULL,
	"office_lng" numeric(10, 7) DEFAULT '120.3119000' NOT NULL,
	"geofence_radius" integer DEFAULT 100 NOT NULL,
	"break_windows" json DEFAULT '[{"label":"午休","start":"11:30","end":"13:00"}]'::json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_audit_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" "auth_audit_event_type" NOT NULL,
	"domain" "auth_domain",
	"instance_id" integer,
	"actor_id" integer NOT NULL,
	"actor_name" varchar(100),
	"actor_role" varchar(50),
	"target_user_id" integer,
	"target_name" varchar(100),
	"amount" numeric(14, 2),
	"decision" varchar(50),
	"policy_applied" varchar(64),
	"credit_tier_at_time" "credit_tier",
	"is_green_channel" boolean DEFAULT false,
	"is_post_facto" boolean DEFAULT false,
	"metadata" json,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_code" varchar(64) NOT NULL,
	"domain" "auth_domain" NOT NULL,
	"policy_name" varchar(200) NOT NULL,
	"description" text,
	"threshold_rules" json NOT NULL,
	"duration_rules" json,
	"bu_scope" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authorization_policies_policy_code_unique" UNIQUE("policy_code")
);
--> statement-breakpoint
CREATE TABLE "employee_credit_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"employee_name" varchar(100),
	"credit_score" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"credit_tier" "credit_tier" DEFAULT 'silver' NOT NULL,
	"tier_calculated_at" timestamp,
	"approval_compliance_score" numeric(5, 2) DEFAULT '80.00',
	"financial_integrity_score" numeric(5, 2) DEFAULT '80.00',
	"task_delivery_score" numeric(5, 2) DEFAULT '80.00',
	"peer_trust_score" numeric(5, 2) DEFAULT '80.00',
	"total_approvals" integer DEFAULT 0,
	"on_time_submissions" integer DEFAULT 0,
	"late_submissions" integer DEFAULT 0,
	"post_facto_count" integer DEFAULT 0,
	"post_facto_within_policy" integer DEFAULT 0,
	"violation_count" integer DEFAULT 0,
	"reward_count" integer DEFAULT 0,
	"green_channel_eligible" boolean DEFAULT false,
	"green_channel_max_amount" numeric(14, 2) DEFAULT '0',
	"last_green_channel_used_at" timestamp,
	"last_reviewed_by" integer,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "green_channel_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" "auth_domain" NOT NULL,
	"credit_tier_required" "credit_tier" NOT NULL,
	"max_amount_allowed" numeric(14, 2) NOT NULL,
	"auto_approve_threshold" numeric(14, 2) DEFAULT '0',
	"max_duration_days" integer,
	"require_post_facto_doc" boolean DEFAULT true NOT NULL,
	"post_facto_deadline_days" integer DEFAULT 3 NOT NULL,
	"cooldown_days" integer DEFAULT 7 NOT NULL,
	"monthly_usage_limit" integer DEFAULT 3 NOT NULL,
	"bu_scope" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "green_channel_usages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_name" varchar(100),
	"approval_instance_id" integer,
	"domain" "auth_domain" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text,
	"credit_tier_at_usage" "credit_tier" NOT NULL,
	"rule_id" integer,
	"post_facto_required" boolean DEFAULT true,
	"post_facto_deadline" timestamp,
	"post_facto_submitted_at" timestamp,
	"post_facto_status" "post_facto_status" DEFAULT 'pending_doc',
	"post_facto_documents" json,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrity_incentive_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_code" varchar(20),
	"employee_name" varchar(100),
	"period" varchar(10) NOT NULL,
	"on_time_approvals" integer DEFAULT 0,
	"accurate_expense_reports" integer DEFAULT 0,
	"proactive_disclosures" integer DEFAULT 0,
	"transparent_communications" integer DEFAULT 0,
	"late_submissions_count" integer DEFAULT 0,
	"inaccurate_reports" integer DEFAULT 0,
	"post_facto_violations" integer DEFAULT 0,
	"policy_bypass_attempts" integer DEFAULT 0,
	"integrity_score" numeric(5, 2) DEFAULT '80.00',
	"bonus_points" integer DEFAULT 0,
	"tier_change" varchar(20),
	"is_publicly_recognized" boolean DEFAULT false,
	"recognition_type" varchar(50),
	"recognition_note" text,
	"generated_at" timestamp,
	"reviewed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_facto_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_approval_id" integer,
	"green_channel_usage_id" integer,
	"user_id" integer NOT NULL,
	"employee_name" varchar(100),
	"domain" "auth_domain" NOT NULL,
	"action_date" timestamp NOT NULL,
	"submission_date" timestamp,
	"deadline_date" timestamp NOT NULL,
	"is_overdue" boolean DEFAULT false,
	"reason" text,
	"urgency_justification" text,
	"supporting_documents" json,
	"status" "post_facto_status" DEFAULT 'pending_doc' NOT NULL,
	"current_review_level" integer DEFAULT 1,
	"reviewer_id" integer,
	"reviewer_name" varchar(100),
	"review_comment" text,
	"reviewed_at" timestamp,
	"credit_score_impact" numeric(5, 2) DEFAULT '0',
	"penalty_applied" boolean DEFAULT false,
	"penalty_details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_arena_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" varchar(7) NOT NULL,
	"entity_type" "arena_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_name" varchar(200),
	"comprehensive_score" numeric(6, 2) NOT NULL,
	"rank_position" integer NOT NULL,
	"total_in_category" integer DEFAULT 0 NOT NULL,
	"bonus_tier" "arena_bonus_tier" NOT NULL,
	"score_breakdown" json,
	"bonus_multiplier" numeric(4, 2) DEFAULT '1.00',
	"previous_rank" integer,
	"rank_change" integer DEFAULT 0,
	"bu_code" varchar(50),
	"department" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "global_arena_rankings_period_type_entity_uniq" UNIQUE("period","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "monthly_battle_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"ai_generated_summary" text,
	"actual_vs_target_kpi" json,
	"improvement_action_plan" text,
	"ai_tactical_suggestions" json,
	"meeting_highlights" json,
	"status" "battle_report_status" DEFAULT 'ai_draft' NOT NULL,
	"generation_task_id" integer,
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "monthly_battle_reports_user_period_uniq" UNIQUE("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "bi_department_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_period_id" integer NOT NULL,
	"department_code" varchar(50) NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"department_type" varchar(50),
	"target_revenue" numeric(15, 2),
	"actual_revenue" numeric(15, 2),
	"achievement_rate" numeric(5, 2),
	"reward_count" integer DEFAULT 0,
	"penalty_count" integer DEFAULT 0,
	"reward_amount" numeric(12, 2) DEFAULT '0',
	"penalty_amount" numeric(12, 2) DEFAULT '0',
	"plan_total" integer DEFAULT 0,
	"plan_completed" integer DEFAULT 0,
	"plan_achievement_rate" numeric(5, 2),
	"training_sessions" integer DEFAULT 0,
	"training_attendees" integer DEFAULT 0,
	"training_quality_score" numeric(3, 1),
	"headcount" integer DEFAULT 0,
	"active_projects" integer DEFAULT 0,
	"ai_evaluation" text,
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bi_dept_metrics_period_dept_uniq" UNIQUE("report_period_id","department_code")
);
--> statement-breakpoint
CREATE TABLE "bi_individual_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_period_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"department_code" varchar(50) NOT NULL,
	"department_name" varchar(100),
	"position" varchar(100),
	"target_value" numeric(15, 2),
	"actual_value" numeric(15, 2),
	"achievement_rate" numeric(5, 2),
	"rewards" json,
	"penalties" json,
	"plan_items_total" integer DEFAULT 0,
	"plan_items_completed" integer DEFAULT 0,
	"plan_achievement_rate" numeric(5, 2),
	"training_attended" integer DEFAULT 0,
	"training_hours" numeric(6, 1) DEFAULT '0',
	"training_score" numeric(3, 1),
	"kpi_score" numeric(5, 2),
	"rank_in_department" integer,
	"rank_overall" integer,
	"ai_coordinated_evaluation" text,
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bi_individual_metrics_period_user_uniq" UNIQUE("report_period_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "bi_report_access_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_type" "bi_period_type",
	"department_code" varchar(50),
	"granted_to_role" varchar(50),
	"granted_to_user_id" integer,
	"access_level" "bi_access_level" DEFAULT 'view_summary' NOT NULL,
	"granted_by" integer,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bi_report_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_type" "bi_period_type" NOT NULL,
	"period_label" varchar(20) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "bi_report_status" DEFAULT 'draft' NOT NULL,
	"executive_summary" text,
	"generated_by" integer,
	"generation_task_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "bi_report_periods_type_label_uniq" UNIQUE("period_type","period_label")
);
--> statement-breakpoint
CREATE TABLE "budget_overrun_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_name" varchar(300),
	"requestor_id" integer,
	"requestor_name" varchar(200),
	"original_budget" real NOT NULL,
	"overrun_amount" real NOT NULL,
	"new_total_budget" real NOT NULL,
	"overrun_percent" real,
	"reason" text,
	"category" varchar(50) DEFAULT 'other',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approver_id" integer,
	"approver_name" varchar(200),
	"approver_comment" text,
	"approved_at" timestamp,
	"bu_code" varchar(50),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"work_order_id" integer,
	"station_id" integer,
	"operator_id" integer,
	"operator_name" varchar(100),
	"sop_step_code" varchar(50),
	"recording_url" varchar(500),
	"thumbnail_url" varchar(500),
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_seconds" integer,
	"standard_time_seconds" integer,
	"actual_time_seconds" integer,
	"deviation_percent" numeric(5, 2),
	"analysis_result" json,
	"review_status" varchar(20) DEFAULT 'pending',
	"reviewed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'info',
	"description" text,
	"snapshot_id" integer,
	"metadata" json,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"camera_id" integer NOT NULL,
	"grid_position" integer DEFAULT 0,
	"show_label" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "camera_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"layout" varchar(20) DEFAULT '2x2',
	"display_screen_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_maintenance_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" integer,
	"performed_by_name" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"snapshot_url" varchar(500) NOT NULL,
	"thumbnail_url" varchar(500),
	"trigger_type" varchar(30) NOT NULL,
	"related_work_order_id" integer,
	"related_execution_log_id" integer,
	"metadata" json,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cameras" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"brand" varchar(30) NOT NULL,
	"model" varchar(100),
	"protocol" varchar(30),
	"ip_address" varchar(50) NOT NULL,
	"port" integer DEFAULT 554,
	"rtsp_url" varchar(500),
	"http_snapshot_url" varchar(500),
	"hls_proxy_url" varchar(500),
	"username" varchar(100),
	"password_encrypted" text,
	"location" varchar(30),
	"station_id" integer,
	"machine_id" integer,
	"warehouse_id" integer,
	"purpose" varchar(50),
	"resolution" varchar(20),
	"fps" integer DEFAULT 25,
	"has_audio" boolean DEFAULT false,
	"has_ptz" boolean DEFAULT false,
	"has_ai_analysis" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'offline',
	"last_heartbeat" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cameras_camera_code_unique" UNIQUE("camera_code")
);
--> statement-breakpoint
CREATE TABLE "employee_state_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"signalType" varchar(30) NOT NULL,
	"detectedAt" timestamp DEFAULT now(),
	"source" varchar(20) DEFAULT 'uwb',
	"zoneId" varchar(50),
	"stationId" integer,
	"confidence" numeric(3, 2) DEFAULT '1.0',
	"metadata" json,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_proactive_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer,
	"employeeName" varchar(100),
	"departmentId" varchar(50),
	"kpiDomain" varchar(100) NOT NULL,
	"currentValue" numeric(10, 2),
	"targetValue" numeric(10, 2),
	"predictedValue" numeric(10, 2),
	"trendDirection" varchar(10),
	"riskLevel" varchar(20) DEFAULT 'normal',
	"alertMessage" text NOT NULL,
	"suggestedAction" text,
	"suggestedTaskId" integer,
	"acknowledgedBy" integer,
	"acknowledgedAt" timestamp,
	"autoGeneratedTask" boolean DEFAULT false,
	"periodStart" varchar(10),
	"periodEnd" varchar(10),
	"calculatedAt" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "motivation_moments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"employeeName" varchar(100),
	"momentType" varchar(30) NOT NULL,
	"triggerEvent" text NOT NULL,
	"ceoMessage" text,
	"deliveryMethod" varchar(20) DEFAULT 'in_app',
	"deliveredAt" timestamp,
	"employeeReaction" varchar(20),
	"reactionNote" text,
	"kpiBoostAwarded" integer DEFAULT 0,
	"pointsAwarded" integer DEFAULT 0,
	"visibility" varchar(20) DEFAULT 'private',
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smart_task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskTitle" varchar(300) NOT NULL,
	"taskDescription" text,
	"challengeLevel" varchar(20) DEFAULT 'normal',
	"assignedTo" integer NOT NULL,
	"assignedToName" varchar(100),
	"assignedBy" integer NOT NULL,
	"assignedByName" varchar(100),
	"projectId" integer,
	"processCode" varchar(20),
	"estimatedHours" numeric(8, 2),
	"deadlineAt" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"priorityScore" integer DEFAULT 5,
	"motivationalNote" text,
	"technicalHints" text,
	"collaboratorIds" json,
	"scheduledPushTime" timestamp,
	"flashAnnotation" text,
	"flashUntilAcknowledged" boolean DEFAULT true,
	"acknowledgedAt" timestamp,
	"employeeStateRequired" varchar(30),
	"kpiImpactArea" varchar(100),
	"kpiBoostPoints" integer DEFAULT 0,
	"completedAt" timestamp,
	"completionQuality" varchar(20),
	"ceoFeedback" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technical_assist_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestTitle" varchar(300) NOT NULL,
	"requestDescription" text,
	"requestedBy" integer NOT NULL,
	"requestedByName" varchar(100),
	"projectId" integer,
	"processCode" varchar(20),
	"difficultyLevel" varchar(20) DEFAULT 'hard',
	"status" varchar(20) DEFAULT 'open',
	"analysisTools" json,
	"suggestedExperts" json,
	"scheduledAt" timestamp,
	"meetingLink" varchar(500),
	"resolution" text,
	"resolutionAttachments" json,
	"resolvedBy" integer,
	"resolvedByName" varchar(100),
	"timeToResolutionHours" numeric(8, 2),
	"lessonsLearned" text,
	"knowledgeBaseLinked" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cicd_stage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"from_stage" varchar(20),
	"to_stage" varchar(20) NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor" varchar(100),
	"note" text,
	"gemini_advice" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cicd_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"source_mode" varchar(20) DEFAULT 'MANUAL' NOT NULL,
	"source_data" text,
	"categories" json DEFAULT '[]'::json,
	"scope" varchar(100),
	"current_stage" varchar(20) DEFAULT 'DEV' NOT NULL,
	"dev_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"test_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"prod_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"dev_detail" text,
	"test_detail" text,
	"prod_detail" text,
	"gemini_analysis_json" json DEFAULT '{}'::json,
	"ceo_approved_dev" boolean DEFAULT false,
	"ceo_approved_test" boolean DEFAULT false,
	"ceo_approved_prod" boolean DEFAULT false,
	"approved_by" varchar(100),
	"priority" integer DEFAULT 3 NOT NULL,
	"rules" text,
	"assignee" varchar(100) DEFAULT 'Claude',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaning_machine_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"cleaning_method" varchar(50),
	"workpiece_material" varchar(100),
	"workpiece_type" varchar(100),
	"throughput_target" integer,
	"beat_time_seconds" integer,
	"cleanliness_standard" varchar(50),
	"cleanliness_value" varchar(50),
	"tank_count" integer,
	"drying_method" varchar(50),
	"automation_level" varchar(30),
	"customer_industry" varchar(50),
	"customer_site" varchar(200),
	"target_region" varchar(20),
	"applicable_regulations" text,
	"ai_suggested_platform" text,
	"ai_quotation_draft" text,
	"contract_number" varchar(64),
	"contract_signed_date" timestamp,
	"contract_amount" integer,
	"current_m_phase" varchar(10) DEFAULT 'M0',
	"t_pipeline_triggered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cleaning_machine_projects_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "cleanliness_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_phase" varchar(30),
	"batch_number" varchar(50) NOT NULL,
	"standard" varchar(50),
	"cleanliness_class" varchar(10),
	"inspection_data" text,
	"judgment_data" text,
	"report_content" text,
	"overall_verdict" varchar(20),
	"report_pdf_url" text,
	"raw_data_file_url" text,
	"inspector_name" varchar(100),
	"inspection_date" varchar(20),
	"approved_by" varchar(100),
	"approved_date" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_ndas" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"project_id" integer,
	"nda_code" varchar(50),
	"nda_type" varchar(30),
	"title" varchar(300),
	"counterparty_name" varchar(200),
	"counterparty_contact" varchar(200),
	"status" varchar(20) DEFAULT 'draft',
	"sign_date" varchar(20),
	"expiry_date" varchar(20),
	"duration" integer,
	"scope" text,
	"restrictions" text,
	"document_url" text,
	"signed_copy_url" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_ndas_nda_code_unique" UNIQUE("nda_code")
);
--> statement-breakpoint
CREATE TABLE "equipment_compliance_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"target_region" varchar(20) NOT NULL,
	"regulation_code" varchar(50) NOT NULL,
	"regulation_name" varchar(200),
	"regulation_name_en" varchar(200),
	"category" varchar(30),
	"status" varchar(20) DEFAULT 'not_started',
	"compliance_cost" integer,
	"evidence_document_url" text,
	"assigned_to" varchar(100),
	"due_date" varchar(20),
	"completed_date" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"trial_code" varchar(50),
	"trial_name" varchar(200),
	"cleaning_method" varchar(50),
	"workpiece_material" varchar(100),
	"workpiece_type" varchar(100),
	"process_parameters" text,
	"before_cleanliness" text,
	"after_cleanliness" text,
	"verdict" varchar(20),
	"verdict_notes" text,
	"photo_before_url" text,
	"photo_after_url" text,
	"microscope_report_url" text,
	"tested_by" varchar(100),
	"reviewed_by" varchar(100),
	"approved_by" varchar(100),
	"status" varchar(20) DEFAULT 'planned',
	"trial_date" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "process_trials_trial_code_unique" UNIQUE("trial_code")
);
--> statement-breakpoint
CREATE TABLE "project_t_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"milestone_code" varchar(10) NOT NULL,
	"milestone_name" varchar(100) NOT NULL,
	"milestone_name_en" varchar(100),
	"description" text,
	"status" varchar(20) DEFAULT 'not_started',
	"planned_date" timestamp,
	"actual_date" timestamp,
	"owner_role" varchar(30),
	"deliverables" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cloud_hall_session_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"actor_user_id" integer,
	"actor_name" varchar(100),
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cloud_hall_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_code" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"initiator_user_id" integer NOT NULL,
	"initiator_name" varchar(100),
	"initiator_role" varchar(30),
	"initiator_device" varchar(30),
	"leadership_user_id" integer,
	"leadership_name" varchar(100),
	"leadership_role" varchar(30),
	"bu_id" integer,
	"project_id" integer,
	"customer_name" varchar(200),
	"customer_site" varchar(300),
	"current_slide_context" jsonb,
	"session_notes" text,
	"signaling_state" varchar(30) DEFAULT 'idle' NOT NULL,
	"connection_quality" varchar(20),
	"last_heartbeat" timestamp,
	"video_provider" varchar(30) DEFAULT 'placeholder' NOT NULL,
	"session_duration_sec" integer,
	"end_reason" varchar(30),
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cloud_hall_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "ccc_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(100) NOT NULL,
	"target" varchar(200) NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"extra_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccc_improvement_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"improvement_id" integer NOT NULL,
	"step_number" integer DEFAULT 0 NOT NULL,
	"action" varchar(30) NOT NULL,
	"content" text,
	"evidence_data" json,
	"user_name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccc_improvements" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"area" varchar(100) NOT NULL,
	"requirement" text NOT NULL,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"steps" json,
	"estimated_days" varchar(20),
	"assigned_to" varchar(100),
	"due_date" varchar(30),
	"completion_pct" integer DEFAULT 0 NOT NULL,
	"result_summary" text,
	"result_evidence" json,
	"verified_by" varchar(100),
	"verified_at" timestamp,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccc_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_name" varchar(200) NOT NULL,
	"sub_system" varchar(100) NOT NULL,
	"engineer_assigned" varchar(100),
	"test_status" varchar(30) DEFAULT 'IDLE' NOT NULL,
	"test_notes" text,
	"report_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccc_sandboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_name" varchar(100) NOT NULL,
	"assigned_ai_agent" varchar(100) NOT NULL,
	"branch_name" varchar(200) NOT NULL,
	"branch_status" varchar(30) DEFAULT 'ISOLATED' NOT NULL,
	"manager_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultant_agent_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(60) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultant_agent_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"output_type" varchar(30) NOT NULL,
	"channel" varchar(20) DEFAULT 'in_system' NOT NULL,
	"title" varchar(200),
	"content" text NOT NULL,
	"content_structured_json" json,
	"context_sources_json" json,
	"related_goal_agreement_id" integer,
	"related_checkpoint_id" integer,
	"persona_tier_at_time" varchar(10),
	"strategy_applied" varchar(50),
	"tone_profile" varchar(30),
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"feedback_rating" integer,
	"feedback_note" text,
	"is_action_taken" boolean DEFAULT false,
	"scheduled_for" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultant_agent_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(60) NOT NULL,
	"employee_id" integer NOT NULL,
	"topic" varchar(200),
	"message_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "consultant_agent_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "consultant_strategy_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_tier" varchar(10) NOT NULL,
	"strategy_name" varchar(100) NOT NULL,
	"description" text,
	"daily_digest_enabled" boolean DEFAULT true,
	"weekly_plan_enabled" boolean DEFAULT true,
	"emotional_support_frequency" varchar(20) DEFAULT 'as_needed',
	"proactive_guidance_level" varchar(20) DEFAULT 'moderate',
	"tone_default" varchar(30),
	"content_mix_json" json,
	"system_prompt_override" text,
	"example_outputs_json" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_persona_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_code" varchar(30),
	"department" varchar(100),
	"position" varchar(100),
	"year" integer NOT NULL,
	"interview_commitments_json" json,
	"hire_date" timestamp,
	"interview_notes" text,
	"persona_score" numeric(5, 2) DEFAULT '50.00',
	"persona_tier" varchar(10) DEFAULT 'mid',
	"motivation_score" numeric(5, 2) DEFAULT '50.00',
	"team_interaction_score" numeric(5, 2) DEFAULT '50.00',
	"client_recognition_score" numeric(5, 2) DEFAULT '50.00',
	"peer_approval_score" numeric(5, 2) DEFAULT '50.00',
	"manager_confidence_score" numeric(5, 2) DEFAULT '50.00',
	"personality_traits_json" json,
	"communication_style" varchar(30) DEFAULT 'balanced',
	"preferred_feedback_mode" varchar(30) DEFAULT 'mixed',
	"emotional_resilience" varchar(20) DEFAULT 'moderate',
	"yearly_performance_summary_json" json,
	"career_aspirations" text,
	"long_term_goal" text,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cross_dept_sla_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_dept_code" varchar(50) NOT NULL,
	"provider_dept_code" varchar(50) NOT NULL,
	"request_type" "sla_request_type" NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"response_time_ms" integer,
	"sla_target_ms" integer DEFAULT 86400000 NOT NULL,
	"quality_score" integer DEFAULT 0,
	"satisfaction_score" integer DEFAULT 0,
	"bu_code" varchar(20),
	"period" varchar(7),
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_access_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorization_id" integer,
	"document_id" integer,
	"portal_user_id" integer,
	"customer_company" varchar(200),
	"action_type" "customer_access_action" NOT NULL,
	"doc_category" varchar(50),
	"doc_label" varchar(300),
	"ip_address" varchar(45),
	"user_agent" text,
	"watermark_token" varchar(128),
	"risk_level" "customer_access_risk" DEFAULT 'low' NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_authorization_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorization_id" integer NOT NULL,
	"doc_category" "customer_doc_category" NOT NULL,
	"doc_label" varchar(300),
	"source_type" varchar(50),
	"source_id" integer,
	"source_version" varchar(50),
	"file_path" text,
	"watermark_required" boolean DEFAULT true NOT NULL,
	"allow_download" boolean DEFAULT false NOT NULL,
	"allow_print" boolean DEFAULT false NOT NULL,
	"expiry_override" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by_user_id" integer,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"customer_id" integer,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(100) NOT NULL,
	"contact_email" varchar(200) NOT NULL,
	"contact_phone" varchar(50),
	"access_tier" smallint DEFAULT 1 NOT NULL,
	"workspace_id" integer,
	"portal_user_id" integer,
	"status" "customer_auth_status" DEFAULT 'pending_nda' NOT NULL,
	"nda_required" boolean DEFAULT true NOT NULL,
	"nda_signed_at" timestamp,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"granted_by_user_id" integer,
	"granted_by_name" varchar(100),
	"revoked_by_user_id" integer,
	"revoked_reason" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_nda_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorization_id" integer NOT NULL,
	"template_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"full_text_hash" varchar(64),
	"signer_name" varchar(100),
	"signer_email" varchar(200),
	"signer_title" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"signed_at" timestamp,
	"signature_token" varchar(128),
	"token_expires_at" timestamp,
	"is_countersigned" boolean DEFAULT false NOT NULL,
	"countersigned_by" varchar(100),
	"countersigned_at" timestamp,
	"pdf_path" text,
	"status" "customer_nda_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"customer_company" varchar(200),
	"equipment_code" varchar(50) NOT NULL,
	"equipment_model" varchar(100) NOT NULL,
	"equipment_name" varchar(200) NOT NULL,
	"serial_number" varchar(100),
	"delivery_date" timestamp,
	"warranty_expiry" timestamp,
	"install_location" varchar(200),
	"health_score" numeric(5, 2) DEFAULT '100.00',
	"status" varchar(30) DEFAULT 'running',
	"last_maintenance_date" timestamp,
	"next_pm_date" timestamp,
	"total_running_hours" numeric(10, 1) DEFAULT '0.0',
	"config_json" json,
	"robot_guidance_enabled" boolean DEFAULT false,
	"robot_guidance_config_json" json,
	"remote_access_enabled" boolean DEFAULT true,
	"camera_stream_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_equipment_health_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"health_score" numeric(5, 2) NOT NULL,
	"source" varchar(30) NOT NULL,
	"dimension_scores_json" json,
	"notes" text,
	"recorded_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "customer_pm_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"plan_name" varchar(200) NOT NULL,
	"plan_type" varchar(30) NOT NULL,
	"interval_hours" integer,
	"interval_days" integer,
	"checklist_json" json,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"status" varchar(30) DEFAULT 'scheduled',
	"assignee" varchar(100),
	"grt_support_required" boolean DEFAULT false,
	"grt_support_contact" varchar(100),
	"completion_notes" text,
	"photos_json" json,
	"robot_assist_available" boolean DEFAULT false,
	"robot_instruction_set_id" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_remote_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"session_code" varchar(50) NOT NULL,
	"session_type" varchar(30) NOT NULL,
	"requested_by" varchar(100),
	"grt_engineer" varchar(100),
	"grt_engineer_role" varchar(100),
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_minutes" integer,
	"issue_description" text,
	"resolution_summary" text,
	"camera_used" boolean DEFAULT false,
	"recording_url" varchar(500),
	"status" varchar(30) DEFAULT 'requested',
	"satisfaction_rating" integer,
	"robot_guidance_used" boolean DEFAULT false,
	"robot_guidance_log_json" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_repair_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"repair_code" varchar(50) NOT NULL,
	"fault_description" text NOT NULL,
	"fault_category" varchar(50),
	"severity" varchar(20) DEFAULT 'medium',
	"reported_by" varchar(100),
	"reported_at" timestamp NOT NULL,
	"executor" varchar(100),
	"executor_type" varchar(20),
	"started_at" timestamp,
	"completed_at" timestamp,
	"downtime_hours" numeric(8, 1),
	"repair_steps_json" json,
	"root_cause" text,
	"solution" text,
	"preventive_measure" text,
	"parts_used_json" json,
	"grt_remote_support_used" boolean DEFAULT false,
	"grt_support_engineer" varchar(100),
	"grt_support_notes" text,
	"camera_session_used" boolean DEFAULT false,
	"safety_warnings_json" json,
	"lessons_learned" text,
	"status" varchar(30) DEFAULT 'reported',
	"robot_assisted_repair" boolean DEFAULT false,
	"robot_repair_log_json" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_spare_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"part_code" varchar(50) NOT NULL,
	"part_name" varchar(200) NOT NULL,
	"part_name_en" varchar(200),
	"category" varchar(50) NOT NULL,
	"specification" varchar(200),
	"delivered_qty" integer DEFAULT 0,
	"current_stock" integer DEFAULT 0,
	"min_stock_level" integer DEFAULT 2,
	"recommended_purchase_qty" integer,
	"unit_price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"lead_time_days" integer DEFAULT 14,
	"life_expectancy_hours" integer,
	"last_replaced_date" timestamp,
	"next_replace_date" timestamp,
	"supplier_info" varchar(200),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_auto_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_name" varchar(200) NOT NULL,
	"group_by" varchar(30) DEFAULT 'by_customer' NOT NULL,
	"frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"template_type" varchar(20) DEFAULT 'summary',
	"recipients_json" json,
	"filter_criteria" json,
	"last_sent_at" timestamp,
	"next_scheduled_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_plan_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pm_plan_id" integer,
	"equipment_id" integer NOT NULL,
	"engineer_id" integer NOT NULL,
	"engineer_name" varchar(100),
	"service_type" varchar(30) NOT NULL,
	"planned_date" timestamp,
	"actual_start_at" timestamp,
	"actual_end_at" timestamp,
	"status" varchar(20) DEFAULT 'planned',
	"completion_notes" text,
	"checklist_result_json" json,
	"issues_found" text,
	"next_service_recommendation" text,
	"next_recommended_date" timestamp,
	"parts_used_json" json,
	"photos_json" json,
	"customer_signed_by" varchar(100),
	"customer_signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_share_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"equipment_id" integer,
	"shared_with_user_id" integer NOT NULL,
	"shared_with_name" varchar(100),
	"shared_with_role" varchar(50),
	"share_type" varchar(30) DEFAULT 'default_cc' NOT NULL,
	"notify_channel" varchar(20) DEFAULT 'system',
	"notify_events" varchar(100) DEFAULT 'all',
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_brand_aesthetics" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"source_url" varchar(500),
	"primary_color_hex" varchar(7),
	"secondary_color_hex" varchar(7),
	"accent_color_hex" varchar(7),
	"visual_style" "visual_style" DEFAULT 'Tech_Premium_Industrial' NOT NULL,
	"font_preference" varchar(100),
	"logo_url" varchar(500),
	"core_vision" json,
	"brand_keywords" json,
	"design_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_product_interlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"timeline" "interlock_timeline" DEFAULT 'present' NOT NULL,
	"customer_product" text NOT NULL,
	"grt_matched_solution" text NOT NULL,
	"project_ref" varchar(100),
	"status" varchar(30) DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profile_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"snapshot_data" json NOT NULL,
	"change_reason" text,
	"changed_by_user_id" integer,
	"changed_by_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_reading_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"doc_category" varchar(50) NOT NULL,
	"doc_category_label" varchar(100),
	"access_level" "reading_access_level" DEFAULT 'restricted' NOT NULL,
	"access_tier" integer DEFAULT 1 NOT NULL,
	"is_viewable" boolean DEFAULT false NOT NULL,
	"is_downloadable" boolean DEFAULT false NOT NULL,
	"recommended_reason" text,
	"channel_notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_standards_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"customer_standard" text NOT NULL,
	"grt_matched_value" text NOT NULL,
	"category" varchar(50),
	"confidence_score" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by_user_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_customer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" varchar(50) NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"company_name_en" varchar(200),
	"cooperation_tier" "cooperation_tier" DEFAULT 'V2_Standard' NOT NULL,
	"status" "customer_profile_status" DEFAULT 'draft' NOT NULL,
	"primary_contact" varchar(100),
	"contact_email" varchar(200),
	"contact_phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"industry" varchar(100),
	"annual_revenue" varchar(50),
	"employee_count" integer,
	"founded_year" integer,
	"website_url" varchar(300),
	"stock_code" varchar(20),
	"first_project_date" timestamp,
	"total_project_count" integer DEFAULT 0,
	"total_contract_value" varchar(50),
	"account_manager_id" integer,
	"account_manager_name" varchar(100),
	"tags" json,
	"notes" text,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedure_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"procedure_id" integer NOT NULL,
	"version_acknowledged" varchar(20) NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" varchar(50),
	"employee_name" varchar(100),
	"department" varchar(100),
	"acknowledged_at" timestamp NOT NULL,
	"acknowledgment_method" "ack_method" DEFAULT 'checkbox',
	"quiz_score" integer,
	"ip_address" varchar(50),
	"is_latest_version" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedure_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"dept_code" varchar(50) NOT NULL,
	"dept_name" varchar(100) NOT NULL,
	"dept_name_en" varchar(100),
	"procedure_type" "procedure_type" NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedure_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"procedure_id" integer NOT NULL,
	"exception_code" varchar(50),
	"reported_by" integer,
	"reported_by_name" varchar(100),
	"reported_at" timestamp DEFAULT now(),
	"department" varchar(100),
	"description" text NOT NULL,
	"severity" "exception_severity" DEFAULT 'minor' NOT NULL,
	"root_cause" text,
	"corrective_action" text,
	"preventive_action" text,
	"status" "exception_status" DEFAULT 'open' NOT NULL,
	"resolved_by" integer,
	"resolved_by_name" varchar(100),
	"resolved_at" timestamp,
	"kpi_impact" json,
	"linked_incident_ids" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedure_kpi_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"procedure_id" integer NOT NULL,
	"kpi_code" varchar(80) NOT NULL,
	"kpi_name" varchar(200) NOT NULL,
	"kpi_name_en" varchar(200),
	"target_value" varchar(50),
	"measurement_method" text,
	"weight" numeric(5, 2) DEFAULT '1.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedure_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"procedure_id" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"version_major" integer,
	"version_minor" integer,
	"change_type" varchar(30),
	"change_summary" text NOT NULL,
	"content" text,
	"approved_by" integer,
	"approved_by_name" varchar(100),
	"approved_at" timestamp,
	"published_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"procedure_code" varchar(80) NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_en" varchar(500),
	"category_id" integer,
	"dept_code" varchar(50) NOT NULL,
	"procedure_type" "procedure_type" NOT NULL,
	"priority" "procedure_priority" DEFAULT 'standard' NOT NULL,
	"status" "procedure_status" DEFAULT 'draft' NOT NULL,
	"current_version" varchar(20) DEFAULT 'V1.0',
	"version_major" integer DEFAULT 1,
	"version_minor" integer DEFAULT 0,
	"content" text,
	"summary" text,
	"scope" text,
	"applicable_roles" json,
	"applicable_bus" json,
	"legal_basis" text,
	"industry_standard" varchar(200),
	"effective_date" timestamp,
	"expiry_date" timestamp,
	"review_frequency" "review_frequency" DEFAULT 'annual',
	"next_review_date" timestamp,
	"owner_user_id" integer,
	"owner_name" varchar(100),
	"owner_role" varchar(50),
	"approver_user_id" integer,
	"approver_name" varchar(100),
	"related_procedure_ids" json,
	"attachments" json,
	"kpi_codes" json,
	"penalty_rules" json,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dept_procedures_procedure_code_unique" UNIQUE("procedure_code")
);
--> statement-breakpoint
CREATE TABLE "design_export_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"export_format" "export_format" NOT NULL,
	"export_status" "export_status" DEFAULT 'GENERATING' NOT NULL,
	"station_ids" json DEFAULT '[]'::json,
	"file_content" text,
	"file_name" varchar(500) DEFAULT '',
	"file_size_bytes" integer,
	"generation_time_ms" integer,
	"download_count" integer DEFAULT 0,
	"exported_by" varchar(100) DEFAULT '',
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_sync_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"event_type" "design_sync_event_type" NOT NULL,
	"station_id" integer,
	"user_id" integer,
	"user_name" varchar(100),
	"description" text DEFAULT '',
	"metadata" json DEFAULT '{}'::json,
	"severity" varchar(20) DEFAULT 'info',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"proposal_id" integer,
	"station_code" varchar(20) NOT NULL,
	"station_index" integer DEFAULT 1 NOT NULL,
	"station_name" varchar(200) NOT NULL,
	"station_name_en" varchar(200) DEFAULT '',
	"station_type" "station_type" NOT NULL,
	"description" text DEFAULT '',
	"cycle_time" integer,
	"mechanical_params" json DEFAULT '{}'::json,
	"electrical_params" json DEFAULT '{}'::json,
	"ai_generated" boolean DEFAULT false,
	"ai_confidence" numeric(3, 2),
	"manual_override" boolean DEFAULT false,
	"notes" text DEFAULT '',
	"bu_code" varchar(20) DEFAULT 'BU3',
	"created_by" varchar(100) DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engineering_change_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"eco_number" varchar(100) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"project_id" integer,
	"status" varchar(50) DEFAULT 'DRAFT',
	"priority" varchar(50) DEFAULT 'MEDIUM',
	"impact_analysis" json,
	"affected_files" json,
	"requested_by" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_vault_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"file_name" varchar(500) NOT NULL,
	"file_path" text,
	"file_type" varchar(100),
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"version" integer DEFAULT 1,
	"is_latest" boolean DEFAULT true,
	"parent_file_id" integer,
	"checkout_by" integer,
	"checkout_at" timestamp,
	"uploaded_by" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawing_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawing_id" integer NOT NULL,
	"relation_type" varchar(30) NOT NULL,
	"related_entity_id" integer,
	"related_entity_code" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawing_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawing_id" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"revision" integer NOT NULL,
	"change_description" text,
	"changed_by" varchar(100),
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawings" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawing_number" varchar(100) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"drawing_type" varchar(30) NOT NULL,
	"file_format" varchar(20),
	"version" varchar(20) DEFAULT 'A.1' NOT NULL,
	"revision" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"product_id" integer,
	"product_code" varchar(50),
	"project_number" varchar(50),
	"designer" varchar(100),
	"reviewer" varchar(100),
	"approver" varchar(100),
	"approved_at" timestamp,
	"released_at" timestamp,
	"file_url" text,
	"file_size_kb" integer,
	"thumbnail_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drawings_drawing_number_unique" UNIQUE("drawing_number")
);
--> statement-breakpoint
CREATE TABLE "compliance_checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"standard_id" integer NOT NULL,
	"standard_code" varchar(50),
	"check_phase" varchar(10) NOT NULL,
	"check_item" varchar(500) NOT NULL,
	"check_method" text,
	"acceptance_criteria" text,
	"status" "compliance_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"checked_by" integer,
	"checked_at" timestamp,
	"evidence" varchar(500),
	"deviation_note" text,
	"waiver_approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_standard_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_code" varchar(50),
	"region" varchar(20) NOT NULL,
	"base_framework" "std_framework" NOT NULL,
	"overlay_standards" json,
	"voltage_spec" varchar(100),
	"safety_level" varchar(50),
	"plc_platform" varchar(100),
	"hmi_platform" varchar(100),
	"comm_protocol" varchar(100),
	"panel_ip_rating" varchar(20),
	"cable_spec" varchar(200),
	"special_requirements" text,
	"document_languages" json,
	"audit_history" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"bu_code" varchar(20),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electrical_complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"complaint_number" varchar(50) NOT NULL,
	"project_code" varchar(50),
	"customer_name" varchar(200) NOT NULL,
	"equipment_model" varchar(200),
	"category" "std_category" NOT NULL,
	"severity" "complaint_severity" NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"root_cause" text,
	"violated_standard_ids" json,
	"corrective_action" text,
	"preventive_action" text,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"reported_by" varchar(100),
	"assignee_id" integer,
	"assignee_name" varchar(100),
	"resolved_at" timestamp,
	"bu_code" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electrical_review_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase" varchar(10) NOT NULL,
	"framework" "std_framework" NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"checklist_template" json,
	"required_approvers" json,
	"is_blocking" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electrical_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"framework" "std_framework" NOT NULL,
	"category" "std_category" NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_en" varchar(500),
	"description" text,
	"version" varchar(20) NOT NULL,
	"reference_doc" varchar(300),
	"reference_url" varchar(500),
	"applicable_regions" json,
	"applicable_voltages" json,
	"key_requirements" json,
	"test_methods" json,
	"status" "std_status" DEFAULT 'active' NOT NULL,
	"effective_date" timestamp,
	"superseded_by" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_standard_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_code" varchar(50) NOT NULL,
	"project_name" varchar(300),
	"customer_profile_id" integer,
	"applicable_phases" json,
	"selected_standard_ids" json,
	"design_basis" json,
	"locked_at" timestamp,
	"locked_by" integer,
	"notes" text,
	"bu_code" varchar(20),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_hall_access_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_type" varchar(30) NOT NULL,
	"content_id" integer NOT NULL,
	"content_title" varchar(300),
	"access_level" varchar(20) DEFAULT 'view',
	"grant_status" varchar(20) DEFAULT 'pending',
	"request_reason" text,
	"requested_at" timestamp DEFAULT now(),
	"approved_by" integer,
	"approved_at" timestamp,
	"rejected_reason" text,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"view_count" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_cloud_access" UNIQUE("user_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "employee_periodic_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"report_type" varchar(20) NOT NULL,
	"period" varchar(20) NOT NULL,
	"title" varchar(300),
	"status" varchar(20) DEFAULT 'draft',
	"planned_items" json,
	"completed_items" json,
	"completion_rate" real,
	"key_accomplishments" json,
	"challenges" json,
	"next_period_goals" json,
	"kpi_summary_json" json,
	"kpi_overall_score" real,
	"reward_penalty_summary" json,
	"task_metrics_summary" json,
	"trend_data_json" json,
	"year_over_year_comparison" json,
	"training_progress" json,
	"capability_snapshot" json,
	"ai_narrative" text,
	"ai_recommendations" json,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"manager_comments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_periodic_report" UNIQUE("user_id","report_type","period")
);
--> statement-breakpoint
CREATE TABLE "employee_rewards_penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"type" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"severity" varchar(30),
	"amount" real,
	"currency" varchar(10) DEFAULT 'CNY',
	"source_type" varchar(50),
	"source_id" integer,
	"issued_by" integer,
	"issued_at" varchar(10) NOT NULL,
	"period" varchar(7),
	"status" varchar(20) DEFAULT 'active',
	"appeal_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_task_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"period" varchar(7) NOT NULL,
	"tasks_assigned" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"tasks_on_time" integer DEFAULT 0,
	"tasks_late" integer DEFAULT 0,
	"tasks_overdue" integer DEFAULT 0,
	"avg_quality_score" real,
	"avg_delivery_days" real,
	"defect_count" integer DEFAULT 0,
	"rework_count" integer DEFAULT 0,
	"customer_satisfaction_avg" real,
	"project_contributions" json,
	"ai_generated_summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_task_metrics" UNIQUE("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "training_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"category" varchar(30) NOT NULL,
	"format" varchar(20),
	"description" text,
	"file_url" text,
	"thumbnail_url" text,
	"duration_minutes" integer,
	"difficulty" varchar(20),
	"tags" json,
	"target_roles" json,
	"target_departments" json,
	"is_public" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_by" integer,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "training_materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "training_stage_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"lifecycle_stage" varchar(20) NOT NULL,
	"plan_name" varchar(300) NOT NULL,
	"due_date" varchar(10) NOT NULL,
	"trigger_date" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"training_format" varchar(20),
	"material_ids" json,
	"prerequisite_kpi_score" real,
	"prerequisite_capability_level" integer,
	"completion_criteria" json,
	"test_id" integer,
	"test_score" integer,
	"test_passed" boolean,
	"completed_at" timestamp,
	"supervisor_signoff" integer,
	"supervisor_signoff_at" timestamp,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_stage_plan" UNIQUE("employee_id","lifecycle_stage")
);
--> statement-breakpoint
CREATE TABLE "community_acks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"acked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"author_type" varchar(20) DEFAULT 'customer' NOT NULL,
	"author_name" varchar(100) NOT NULL,
	"author_company" varchar(200),
	"parent_id" integer,
	"content" text NOT NULL,
	"content_clean" boolean DEFAULT true NOT NULL,
	"sensitive_words_detected" text,
	"is_approved" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer DEFAULT 0 NOT NULL,
	"post_type" "community_post_type" NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"content_clean" boolean DEFAULT true NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"scope" varchar(30) DEFAULT 'company_wide' NOT NULL,
	"scope_value" varchar(100),
	"source_type" varchar(50),
	"source_id" varchar(100),
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"requires_ack" boolean DEFAULT false NOT NULL,
	"ack_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_sensitive_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'custom' NOT NULL,
	"action" varchar(20) DEFAULT 'mask' NOT NULL,
	"replacement" varchar(50) DEFAULT '***' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_compliance_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"check_date" varchar(10) NOT NULL,
	"check_type" "compliance_check_type" NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"deadline" timestamp,
	"completed_at" timestamp,
	"points_applied" integer DEFAULT 0,
	"source_type" varchar(50),
	"source_id" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_compliance_emp_date_type_uniq" UNIQUE("employee_id","check_date","check_type")
);
--> statement-breakpoint
CREATE TABLE "elite_benefit_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"benefit_type" "elite_benefit_type" NOT NULL,
	"status" "elite_benefit_status" DEFAULT 'pending' NOT NULL,
	"point_balance" integer NOT NULL,
	"kpi_avg_6m" numeric(5, 2),
	"skill_level" varchar(10),
	"high_delivery_count" integer,
	"eligibility_details" json,
	"start_date" varchar(10),
	"end_date" varchar(10),
	"duration_months" integer,
	"approved_by" integer,
	"approval_notes" text,
	"approved_at" timestamp,
	"rejected_reason" text,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"revocation_count" integer DEFAULT 0,
	"cooldown_until" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elite_benefit_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"review_period" varchar(7) NOT NULL,
	"benefit_type" varchar(30) NOT NULL,
	"kpi_score" numeric(5, 2),
	"point_balance" integer,
	"skill_level" varchar(10),
	"delivery_score" numeric(5, 2),
	"kpi_below_threshold" boolean DEFAULT false,
	"points_below_threshold" boolean DEFAULT false,
	"skill_downgraded" boolean DEFAULT false,
	"consecutive_kpi_violations" integer DEFAULT 0,
	"consecutive_point_violations" integer DEFAULT 0,
	"outcome" varchar(30) DEFAULT 'pass' NOT NULL,
	"commitment_deadline" varchar(10),
	"commitment_content" text,
	"commitment_result" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"target_employee_id" integer NOT NULL,
	"rule_code" varchar(80),
	"requested_points" integer NOT NULL,
	"description" text NOT NULL,
	"source_type" varchar(50),
	"source_id" varchar(100),
	"status" "point_approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"approval_notes" text,
	"points_applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"current_balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"total_penalties" integer DEFAULT 0 NOT NULL,
	"ytd_points" integer DEFAULT 0 NOT NULL,
	"is_on_observation" boolean DEFAULT false NOT NULL,
	"is_excellence_suspended" boolean DEFAULT false NOT NULL,
	"excellence_suspended_until" varchar(10),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "point_balances_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "point_enforcement_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"threshold_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"points_at_trigger" integer NOT NULL,
	"enforced_at" timestamp DEFAULT now() NOT NULL,
	"lifted_at" timestamp,
	"lifted_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_redemption_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description" text,
	"points_cost" integer NOT NULL,
	"monetary_value" numeric(14, 2),
	"category" varchar(50) NOT NULL,
	"available_qty" integer DEFAULT -1 NOT NULL,
	"min_balance" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "point_redemption_catalog_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "point_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"catalog_item_id" integer NOT NULL,
	"catalog_code" varchar(80),
	"points_spent" integer NOT NULL,
	"status" "point_redemption_status" DEFAULT 'pending' NOT NULL,
	"requested_start_date" varchar(10),
	"requested_end_date" varchar(10),
	"employee_notes" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"approval_notes" text,
	"fulfilled_at" timestamp,
	"fulfilled_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"category" "point_rule_category" NOT NULL,
	"description" text,
	"points" integer NOT NULL,
	"max_per_day" integer DEFAULT 1,
	"max_per_month" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"trigger_mode" varchar(20) DEFAULT 'auto' NOT NULL,
	"role_multipliers" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "point_rules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "point_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"threshold" integer NOT NULL,
	"direction" varchar(10) DEFAULT 'below' NOT NULL,
	"action" varchar(100) NOT NULL,
	"duration_days" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"rule_code" varchar(80),
	"type" "point_transaction_type" NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer,
	"description" text,
	"source_type" varchar(50),
	"source_id" varchar(100),
	"granted_by" integer,
	"transaction_date" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestion_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"problem_statement" text,
	"expected_benefit" text,
	"implementation_plan" text,
	"estimated_savings" numeric(14, 2),
	"target_department" varchar(100),
	"category" varchar(50) DEFAULT 'process' NOT NULL,
	"status" "suggestion_status" DEFAULT 'submitted' NOT NULL,
	"evaluator_id" integer,
	"evaluator_notes" text,
	"evaluated_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"approval_notes" text,
	"points_awarded" integer DEFAULT 0,
	"announcement_id" integer,
	"announcement_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workstation_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20),
	"system_role" varchar(30) DEFAULT 'employee' NOT NULL,
	"bu_code" varchar(10),
	"dashboard_layout" varchar(50) DEFAULT 'standard-workspace' NOT NULL,
	"pinned_menu_paths" json NOT NULL,
	"default_landing_page" varchar(100) DEFAULT '/personal-dashboard' NOT NULL,
	"widget_config" json NOT NULL,
	"ai_assistant_level" integer DEFAULT 2 NOT NULL,
	"briefing_modules" json NOT NULL,
	"kpi_widgets" json NOT NULL,
	"work_schedule" varchar(20) DEFAULT 'six_day' NOT NULL,
	"attendance_group" varchar(50),
	"can_access_salary" boolean DEFAULT false NOT NULL,
	"can_access_finance" boolean DEFAULT false NOT NULL,
	"can_approve_orders" boolean DEFAULT false NOT NULL,
	"can_manage_team" boolean DEFAULT false NOT NULL,
	"can_view_all_bu" boolean DEFAULT false NOT NULL,
	"performance_tier" varchar(20) DEFAULT 'standard' NOT NULL,
	"kpi_score" numeric(5, 2),
	"salary_grade" varchar(10),
	"is_customized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workstation_presets_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "employee_360_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"execution_score" numeric(5, 2) NOT NULL,
	"learning_score" numeric(5, 2) NOT NULL,
	"collaboration_score" numeric(5, 2) NOT NULL,
	"innovation_score" numeric(5, 2) NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"tier" "employee_profile_tier" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_360_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"employee_name" varchar(100) NOT NULL,
	"department" varchar(50),
	"position" varchar(100),
	"level" varchar(20),
	"execution_score" numeric(5, 2) NOT NULL,
	"learning_score" numeric(5, 2) NOT NULL,
	"collaboration_score" numeric(5, 2) NOT NULL,
	"innovation_score" numeric(5, 2) NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"tier" "employee_profile_tier" NOT NULL,
	"weakest_dimension" varchar(30),
	"strongest_dimension" varchar(30),
	"ai_advice" text,
	"kpi_months_analyzed" integer DEFAULT 0,
	"certificate_count" integer DEFAULT 0,
	"meeting_months_analyzed" integer DEFAULT 0,
	"ai_tasks_completed" integer DEFAULT 0,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_briefings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"briefing_date" varchar(10) NOT NULL,
	"status" "emp_briefing_status" DEFAULT 'pending' NOT NULL,
	"top_priorities" json,
	"today_schedule" json,
	"carryover_tasks" json,
	"okr_summary" text,
	"ai_narrative" text,
	"source_data" json,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_briefings_user_date_uniq" UNIQUE("user_id","briefing_date")
);
--> statement-breakpoint
CREATE TABLE "employee_daily_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" varchar(10) NOT NULL,
	"project_id" integer,
	"logged_hours" real DEFAULT 0 NOT NULL,
	"completed_tasks" json,
	"blockers" text,
	"notes" text,
	"energy_level" integer,
	"status" "emp_daily_log_status" DEFAULT 'draft' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"ai_coach_feedback" json,
	"pipeline_health_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_daily_logs_user_date_proj_uniq" UNIQUE("user_id","log_date","project_id")
);
--> statement-breakpoint
CREATE TABLE "monthly_appraisal_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"performance_score" real,
	"total_hours" real,
	"tasks_completed" integer,
	"task_completion_rate" real,
	"defect_count" integer DEFAULT 0,
	"base_salary" varchar(20),
	"performance_bonus" varchar(20),
	"net_pay" varchar(20),
	"payroll_ledger_id" integer,
	"strengths" json,
	"shortcomings" json,
	"required_training" json,
	"carryover_items" json,
	"ai_summary" text,
	"status" "emp_appraisal_status" DEFAULT 'draft' NOT NULL,
	"employee_read_at" timestamp,
	"manager_signed_by" integer,
	"manager_signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "monthly_appraisal_user_period_uniq" UNIQUE("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "executive_review_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" integer NOT NULL,
	"reviewer_name" varchar(100) NOT NULL,
	"reviewer_role" varchar(50) NOT NULL,
	"target_type" varchar(30) NOT NULL,
	"target_id" varchar(100) NOT NULL,
	"target_name" varchar(200) NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"rating" integer,
	"comment" text NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"is_private" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "executive_review_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_type" varchar(20) NOT NULL,
	"scope_id" varchar(100) NOT NULL,
	"scope_name" varchar(200) NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"total_employees" integer DEFAULT 0,
	"active_employees" integer DEFAULT 0,
	"avg_kpi_score" numeric(5, 2),
	"kpi_completion_rate" numeric(5, 2),
	"top_kpi_achievers" json DEFAULT '[]'::json,
	"bottom_kpi_performers" json DEFAULT '[]'::json,
	"kpi_distribution" json,
	"total_tasks_assigned" integer DEFAULT 0,
	"total_tasks_completed" integer DEFAULT 0,
	"task_completion_rate" numeric(5, 2),
	"avg_task_quality" numeric(5, 2),
	"total_tasks_overdue" integer DEFAULT 0,
	"on_time_rate" numeric(5, 2),
	"revenue_target" numeric(15, 2),
	"revenue_actual" numeric(15, 2),
	"profit_target" numeric(15, 2),
	"profit_actual" numeric(15, 2),
	"training_completion_rate" numeric(5, 2),
	"avg_capability_level" numeric(3, 1),
	"total_rewards" integer DEFAULT 0,
	"total_penalties" integer DEFAULT 0,
	"reward_amount" numeric(12, 2) DEFAULT '0',
	"penalty_amount" numeric(12, 2) DEFAULT '0',
	"okr_progress_avg" numeric(5, 2),
	"detail_breakdown" json,
	"generated_at" timestamp DEFAULT now(),
	"generated_by" varchar(50) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "file_upload_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_size_bytes" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_upload_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"chunk_size_bytes" integer DEFAULT 5242880 NOT NULL,
	"total_chunks" integer NOT NULL,
	"completed_chunks" integer DEFAULT 0 NOT NULL,
	"status" "upload_status" DEFAULT 'uploading' NOT NULL,
	"mime_type" varchar(200) DEFAULT 'application/octet-stream',
	"uploaded_by" varchar(100) NOT NULL,
	"target_path" varchar(1000) DEFAULT '',
	"sharepoint_site_code" varchar(20),
	"project_id" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "file_upload_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer NOT NULL,
	"reconciliation_date" timestamp NOT NULL,
	"bank_balance" numeric(14, 2) NOT NULL,
	"book_balance" numeric(14, 2) NOT NULL,
	"adjusted_bank_balance" numeric(14, 2),
	"adjusted_book_balance" numeric(14, 2),
	"outstanding_checks" numeric(14, 2) DEFAULT '0',
	"deposits_in_transit" numeric(14, 2) DEFAULT '0',
	"other_adjustments" numeric(14, 2) DEFAULT '0',
	"is_reconciled" boolean DEFAULT false,
	"difference" numeric(14, 2) DEFAULT '0',
	"reconciled_by" integer,
	"reconciled_at" timestamp,
	"status" varchar(50) DEFAULT 'draft',
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer NOT NULL,
	"bank_account_number" varchar(50) NOT NULL,
	"statement_date" timestamp NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"transaction_ref" varchar(100),
	"description" text,
	"debit_amount" numeric(14, 2) DEFAULT '0',
	"credit_amount" numeric(14, 2) DEFAULT '0',
	"balance" numeric(14, 2),
	"counterparty_name" varchar(200),
	"counterparty_account" varchar(50),
	"import_batch_id" varchar(50),
	"match_status" varchar(50) DEFAULT 'unmatched',
	"matched_doc_type" varchar(50),
	"matched_doc_id" integer,
	"matched_doc_code" varchar(50),
	"matched_at" timestamp,
	"matched_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate_date" timestamp NOT NULL,
	"rate" numeric(12, 6) NOT NULL,
	"rate_type" varchar(50) DEFAULT 'spot',
	"source" varchar(100) DEFAULT 'manual',
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "er_currency_date_type_uq" UNIQUE("from_currency","to_currency","rate_date","rate_type")
);
--> statement-breakpoint
CREATE TABLE "financial_report_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_period" integer NOT NULL,
	"report_data" text NOT NULL,
	"generated_by" integer,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	CONSTRAINT "frs_report_period_uq" UNIQUE("report_code","fiscal_year","fiscal_period")
);
--> statement-breakpoint
CREATE TABLE "financial_report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"report_name" varchar(200) NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"line_items" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_report_templates_report_code_unique" UNIQUE("report_code")
);
--> statement-breakpoint
CREATE TABLE "foreign_currency_revaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"revaluation_date" timestamp NOT NULL,
	"fiscal_year" integer,
	"fiscal_period" integer,
	"account_id" integer NOT NULL,
	"account_code" varchar(20),
	"original_currency" varchar(3) NOT NULL,
	"original_amount" numeric(14, 2) NOT NULL,
	"original_rate" numeric(12, 6) NOT NULL,
	"closing_rate" numeric(12, 6) NOT NULL,
	"revaluated_amount" numeric(14, 2) NOT NULL,
	"gain_or_loss" numeric(14, 2) NOT NULL,
	"gl_entry_id" integer,
	"status" varchar(50) DEFAULT 'calculated',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_cost_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"benchmark_code" varchar(50) NOT NULL,
	"source_project_id" integer,
	"source_project_code" varchar(50),
	"source_project_name" varchar(200),
	"equipment_type" varchar(100) NOT NULL,
	"customer_industry" varchar(100),
	"project_scale" varchar(50),
	"total_revenue" numeric(14, 2),
	"total_cost" numeric(14, 2),
	"gross_margin" numeric(5, 2),
	"material_cost_ratio" numeric(5, 2),
	"labor_cost_ratio" numeric(5, 2),
	"procurement_cost_ratio" numeric(5, 2),
	"travel_cost_ratio" numeric(5, 2),
	"overhead_cost_ratio" numeric(5, 2),
	"total_labor_hours" numeric(10, 2),
	"mechanical_hours" numeric(10, 2),
	"electrical_hours" numeric(10, 2),
	"project_duration_days" integer,
	"t01_to_15_breakdown" text,
	"key_lessons_learned" text,
	"is_template" boolean DEFAULT false,
	"tags" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_cost_benchmarks_benchmark_code_unique" UNIQUE("benchmark_code")
);
--> statement-breakpoint
CREATE TABLE "project_earned_value" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"fiscal_period" varchar(10),
	"bac" numeric(14, 2) NOT NULL,
	"pv" numeric(14, 2) NOT NULL,
	"ev" numeric(14, 2) NOT NULL,
	"ac" numeric(14, 2) NOT NULL,
	"sv" numeric(14, 2),
	"cv" numeric(14, 2),
	"spi" numeric(6, 4),
	"cpi" numeric(6, 4),
	"eac" numeric(14, 2),
	"etc" numeric(14, 2),
	"vac" numeric(14, 2),
	"tcpi" numeric(6, 4),
	"percent_complete" numeric(5, 2),
	"status" varchar(50) DEFAULT 'on_track',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pev_project_snapshot_uq" UNIQUE("project_code","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountType" varchar(50) NOT NULL,
	"entityId" integer,
	"entityType" varchar(50),
	"entityName" varchar(200),
	"bankName" varchar(200) NOT NULL,
	"bankBranch" varchar(200),
	"accountNumber" varchar(50) NOT NULL,
	"accountName" varchar(200) NOT NULL,
	"swiftCode" varchar(20),
	"currency" varchar(3) DEFAULT 'CNY',
	"isDefault" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"lastUsedAt" timestamp,
	"lastUsedFor" varchar(200),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_payment_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer,
	"customerCode" varchar(50),
	"customerName" varchar(200) NOT NULL,
	"projectId" integer,
	"projectCode" varchar(50),
	"contractNumber" varchar(50),
	"contractAmount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CNY',
	"milestones" text,
	"totalInvoicedAmount" numeric(14, 2) DEFAULT '0',
	"totalReceivedAmount" numeric(14, 2) DEFAULT '0',
	"remainingAmount" numeric(14, 2) DEFAULT '0',
	"latestInvoiceNo" varchar(50),
	"latestInvoiceDate" timestamp,
	"latestInvoiceAmount" numeric(14, 2),
	"overdueAmount" numeric(14, 2) DEFAULT '0',
	"overdueDays" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expenseCode" varchar(50) NOT NULL,
	"expenseType" varchar(50) NOT NULL,
	"expenseName" varchar(200) NOT NULL,
	"description" text,
	"monthlyAmount" numeric(14, 2) NOT NULL,
	"annualAmount" numeric(14, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"responsiblePersonId" integer,
	"responsiblePersonName" varchar(100),
	"department" varchar(100),
	"payeeName" varchar(200),
	"payeeBankName" varchar(200),
	"payeeBankAccount" varchar(50),
	"payeeAccountName" varchar(200),
	"paymentCycle" varchar(50) DEFAULT 'monthly',
	"paymentDueDay" integer DEFAULT 25,
	"contractNumber" varchar(50),
	"contractStartDate" timestamp,
	"contractEndDate" timestamp,
	"approvalRequired" boolean DEFAULT true,
	"approvalThreshold" numeric(14, 2) DEFAULT '10000',
	"alertBeforeDueDays" integer DEFAULT 5,
	"isActive" boolean DEFAULT true,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixed_expenses_uk_code" UNIQUE("expenseCode")
);
--> statement-breakpoint
CREATE TABLE "kingdee_migration_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" varchar(50) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"sourceDatabase" varchar(100) DEFAULT 'AIS20260122124030',
	"status" varchar(50) DEFAULT 'pending',
	"totalRecords" integer DEFAULT 0,
	"successRecords" integer DEFAULT 0,
	"failedRecords" integer DEFAULT 0,
	"skippedRecords" integer DEFAULT 0,
	"errorLog" text,
	"startedAt" timestamp DEFAULT now(),
	"completedAt" timestamp,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_inventory_count_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"countId" integer NOT NULL,
	"materialId" integer,
	"materialCode" varchar(50) NOT NULL,
	"materialName" varchar(200) NOT NULL,
	"unit" varchar(20) DEFAULT '个',
	"locationCode" varchar(50),
	"lotNumber" varchar(50),
	"bookQuantity" numeric(10, 2) NOT NULL,
	"bookUnitPrice" numeric(12, 2),
	"bookValue" numeric(14, 2),
	"actualQuantity" numeric(10, 2),
	"actualUnitPrice" numeric(12, 2),
	"actualValue" numeric(14, 2),
	"varianceQuantity" numeric(10, 2),
	"varianceValue" numeric(14, 2),
	"varianceReason" text,
	"projectId" integer,
	"projectCode" varchar(50),
	"costCenter" varchar(50),
	"status" varchar(50) DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_inventory_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"countCode" varchar(50) NOT NULL,
	"countDate" timestamp NOT NULL,
	"warehouseId" integer,
	"warehouseCode" varchar(50),
	"warehouseName" varchar(200),
	"projectId" integer,
	"projectCode" varchar(50),
	"countType" varchar(50) NOT NULL,
	"fiscalYear" integer,
	"fiscalPeriod" integer,
	"totalItems" integer DEFAULT 0,
	"totalBookValue" numeric(14, 2) DEFAULT '0',
	"totalActualValue" numeric(14, 2) DEFAULT '0',
	"totalVarianceValue" numeric(14, 2) DEFAULT '0',
	"surplusItems" integer DEFAULT 0,
	"surplusValue" numeric(14, 2) DEFAULT '0',
	"shortageItems" integer DEFAULT 0,
	"shortageValue" numeric(14, 2) DEFAULT '0',
	"matchedItems" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"countedBy" integer,
	"countedByName" varchar(100),
	"reviewedBy" integer,
	"financeReviewBy" integer,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_inventory_counts_uk_code" UNIQUE("countCode")
);
--> statement-breakpoint
CREATE TABLE "project_reimbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestCode" varchar(50) NOT NULL,
	"applicantId" integer NOT NULL,
	"applicantName" varchar(100) NOT NULL,
	"department" varchar(100),
	"buCode" varchar(50),
	"projectId" integer,
	"projectCode" varchar(50),
	"projectName" varchar(200),
	"reimbursementType" varchar(50) NOT NULL,
	"oaFormId" integer,
	"oaFormCode" varchar(50),
	"totalAmount" numeric(14, 2) NOT NULL,
	"approvedAmount" numeric(14, 2),
	"currency" varchar(3) DEFAULT 'CNY',
	"lineItems" text,
	"travelDestination" varchar(200),
	"travelStartDate" timestamp,
	"travelEndDate" timestamp,
	"policyCompliant" boolean DEFAULT true,
	"policyViolations" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"currentReviewerId" integer,
	"currentReviewerName" varchar(100),
	"financeSpecialistId" integer,
	"financeSpecialistApprovedAt" timestamp,
	"financeReviewerId" integer,
	"financeReviewerApprovedAt" timestamp,
	"directorApprovalId" integer,
	"directorApprovedAt" timestamp,
	"cashierId" integer,
	"cashierProcessedAt" timestamp,
	"payeeBankAccount" varchar(50),
	"payeeBankName" varchar(100),
	"payeeAccountName" varchar(100),
	"paymentTransactionId" varchar(100),
	"paidAt" timestamp,
	"rejectedBy" integer,
	"rejectedAt" timestamp,
	"rejectionReason" text,
	"attachments" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_reimbursements_uk_code" UNIQUE("requestCode")
);
--> statement-breakpoint
CREATE TABLE "supplier_payment_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"supplierCode" varchar(50) NOT NULL,
	"supplierName" varchar(200) NOT NULL,
	"purchaseOrderId" integer,
	"poNumber" varchar(50),
	"contractNumber" varchar(50),
	"projectId" integer,
	"projectCode" varchar(50),
	"contractAmount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CNY',
	"prepaymentAmount" numeric(14, 2) DEFAULT '0',
	"prepaymentDate" timestamp,
	"prepaymentStatus" varchar(50) DEFAULT 'pending',
	"deliveryPaymentAmount" numeric(14, 2) DEFAULT '0',
	"deliveryPaymentDate" timestamp,
	"deliveryPaymentStatus" varchar(50) DEFAULT 'pending',
	"acceptancePaymentAmount" numeric(14, 2) DEFAULT '0',
	"acceptancePaymentDate" timestamp,
	"acceptancePaymentStatus" varchar(50) DEFAULT 'pending',
	"warrantyDepositAmount" numeric(14, 2) DEFAULT '0',
	"warrantyDepositDueDate" timestamp,
	"warrantyDepositStatus" varchar(50) DEFAULT 'held',
	"warrantyMonths" integer DEFAULT 12,
	"totalPaidAmount" numeric(14, 2) DEFAULT '0',
	"remainingAmount" numeric(14, 2) DEFAULT '0',
	"invoiceNumbers" text,
	"invoiceTotalAmount" numeric(14, 2) DEFAULT '0',
	"isLargeAsset" boolean DEFAULT false,
	"preAcceptanceStatus" varchar(50),
	"preAcceptanceDate" timestamp,
	"preAcceptanceBy" integer,
	"finalAcceptanceStatus" varchar(50),
	"finalAcceptanceDate" timestamp,
	"finalAcceptanceBy" integer,
	"qualityApprovalBy" integer,
	"userDeptApprovalBy" integer,
	"procurementConfirmBy" integer,
	"buManagerApprovalBy" integer,
	"procurementManagerConfirmBy" integer,
	"financeConfirmBy" integer,
	"cashierExecuteBy" integer,
	"supplierBankName" varchar(100),
	"supplierBankAccount" varchar(50),
	"supplierAccountName" varchar(100),
	"notifyProcurementRep" boolean DEFAULT true,
	"notifyCustomerRep" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_rpn_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"fmea_item_id" integer NOT NULL,
	"previous_severity" integer NOT NULL,
	"previous_occurrence" integer NOT NULL,
	"previous_detection" integer NOT NULL,
	"previous_rpn" integer NOT NULL,
	"previous_status" varchar(30),
	"new_severity" integer NOT NULL,
	"new_occurrence" integer NOT NULL,
	"new_detection" integer NOT NULL,
	"new_rpn" integer NOT NULL,
	"new_status" varchar(30),
	"defect_count_30d" integer NOT NULL,
	"trigger_reason" text,
	"rpn_delta" integer NOT NULL,
	"capa_required" boolean DEFAULT false,
	"capa_id" integer,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"calculated_by" varchar(100) DEFAULT 'SYSTEM'
);
--> statement-breakpoint
CREATE TABLE "shop_floor_defect_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"fmea_item_id" integer NOT NULL,
	"defect_source" "defect_source" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"process_step" varchar(200),
	"failure_mode" varchar(500),
	"part_number" varchar(100),
	"work_order_id" integer,
	"inspection_record_id" integer,
	"reported_by" integer,
	"reported_by_name" varchar(100),
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" integer NOT NULL,
	"accountCode" varchar(20),
	"fiscalYear" integer NOT NULL,
	"fiscalPeriod" integer NOT NULL,
	"beginBalance" numeric(14, 2) DEFAULT '0',
	"periodDebit" numeric(14, 2) DEFAULT '0',
	"periodCredit" numeric(14, 2) DEFAULT '0',
	"endBalance" numeric(14, 2) DEFAULT '0',
	"projectCode" varchar(50),
	"costCenterCode" varchar(50),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_balances_uk_composite" UNIQUE("accountId","fiscalYear","fiscalPeriod","projectCode","costCenterCode")
);
--> statement-breakpoint
CREATE TABLE "asset_depreciation" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"assetCode" varchar(50),
	"fiscalYear" integer,
	"fiscalPeriod" integer,
	"depreciationAmount" numeric(14, 2) NOT NULL,
	"accumulatedAfter" numeric(14, 2) NOT NULL,
	"netBookValueAfter" numeric(14, 2) NOT NULL,
	"glEntryId" integer,
	"status" varchar(50) DEFAULT 'calculated',
	"calculatedAt" timestamp,
	"postedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "asset_disposal" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"assetCode" varchar(50),
	"disposalDate" timestamp NOT NULL,
	"disposalMethod" varchar(50),
	"disposalAmount" numeric(14, 2) DEFAULT '0',
	"netBookValueAtDisposal" numeric(14, 2),
	"gainOrLoss" numeric(14, 2),
	"buyerName" varchar(200),
	"buyerContact" varchar(100),
	"reason" text,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"glEntryId" integer,
	"status" varchar(50) DEFAULT 'pending',
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"costCenterCode" varchar(50) NOT NULL,
	"costCenterName" varchar(200) NOT NULL,
	"parentCostCenterId" integer,
	"buCode" varchar(50),
	"departmentCode" varchar(50),
	"responsiblePersonId" integer,
	"responsiblePersonName" varchar(100),
	"budgetAmount" numeric(14, 2),
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centers_uk_code" UNIQUE("costCenterCode")
);
--> statement-breakpoint
CREATE TABLE "finance_role_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"roleCode" varchar(50) NOT NULL,
	"roleName" varchar(100) NOT NULL,
	"userId" integer NOT NULL,
	"userName" varchar(100) NOT NULL,
	"buCode" varchar(50),
	"amountThreshold" numeric(14, 2),
	"isActive" boolean DEFAULT true,
	"effectiveDate" timestamp NOT NULL,
	"expiryDate" timestamp,
	"assignedBy" integer,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetCode" varchar(50) NOT NULL,
	"assetName" varchar(200) NOT NULL,
	"description" text,
	"assetCategory" varchar(50) NOT NULL,
	"acquisitionDate" timestamp NOT NULL,
	"acquisitionCost" numeric(14, 2) NOT NULL,
	"salvageValue" numeric(14, 2) DEFAULT '0',
	"salvageRate" numeric(5, 2) DEFAULT '5',
	"usefulLifeMonths" integer NOT NULL,
	"depreciationMethod" varchar(50) DEFAULT 'straight_line',
	"accumulatedDepreciation" numeric(14, 2) DEFAULT '0',
	"netBookValue" numeric(14, 2),
	"departmentCode" varchar(50),
	"costCenterCode" varchar(50),
	"responsiblePersonId" integer,
	"responsiblePersonName" varchar(100),
	"location" varchar(200),
	"purchaseOrderId" integer,
	"supplierId" integer,
	"invoiceNumber" varchar(50),
	"projectCode" varchar(50),
	"glAccountCode" varchar(20),
	"depreciationGlAccountCode" varchar(20),
	"accumulatedDepreciationGlAccountCode" varchar(20),
	"status" varchar(50) DEFAULT 'active',
	"erpLegacyCode" varchar(50),
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixed_assets_uk_asset_code" UNIQUE("assetCode")
);
--> statement-breakpoint
CREATE TABLE "gl_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountCode" varchar(20) NOT NULL,
	"accountName" varchar(200) NOT NULL,
	"parentAccountId" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"accountType" varchar(50) NOT NULL,
	"balanceDirection" varchar(10) NOT NULL,
	"isDetailAccount" boolean DEFAULT true,
	"accountGroup" varchar(50),
	"erpLegacyCode" varchar(50),
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gl_accounts_uk_account_code" UNIQUE("accountCode")
);
--> statement-breakpoint
CREATE TABLE "gl_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entryCode" varchar(50) NOT NULL,
	"voucherDate" timestamp NOT NULL,
	"fiscalYear" integer NOT NULL,
	"fiscalPeriod" integer NOT NULL,
	"voucherNumber" integer,
	"accountId" integer NOT NULL,
	"accountCode" varchar(20),
	"debitAmount" numeric(14, 2) DEFAULT '0',
	"creditAmount" numeric(14, 2) DEFAULT '0',
	"description" text NOT NULL,
	"projectCode" varchar(50),
	"departmentCode" varchar(50),
	"supplierId" integer,
	"customerId" integer,
	"costCenterCode" varchar(50),
	"sourceDocType" varchar(50),
	"sourceDocId" integer,
	"sourceDocCode" varchar(50),
	"isPosted" boolean DEFAULT false,
	"postedAt" timestamp,
	"postedBy" integer,
	"isReversed" boolean DEFAULT false,
	"reversalEntryId" integer,
	"erpLegacyVoucherId" varchar(50),
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gl_entries_uk_entry_code" UNIQUE("entryCode")
);
--> statement-breakpoint
CREATE TABLE "onboarding_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"taskId" varchar(50) NOT NULL,
	"roleFamily" varchar(50),
	"phase" varchar(50),
	"score" integer DEFAULT 0,
	"notes" text,
	"managerReviewStatus" varchar(20),
	"managerReviewerId" integer,
	"managerReviewedAt" timestamp,
	"managerFeedback" text,
	"completedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "period_close_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"fiscalYear" integer NOT NULL,
	"fiscalPeriod" integer NOT NULL,
	"checkItem" varchar(200) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"completedBy" integer,
	"completedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "period_close_checklists_uk_composite" UNIQUE("fiscalYear","fiscalPeriod","checkItem")
);
--> statement-breakpoint
CREATE TABLE "tax_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceNumber" varchar(50) NOT NULL,
	"invoiceCode" varchar(20),
	"invoiceType" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"invoiceDate" timestamp NOT NULL,
	"counterpartyName" varchar(200) NOT NULL,
	"counterpartyTaxId" varchar(50),
	"taxAmount" numeric(14, 2) NOT NULL,
	"taxExclusiveAmount" numeric(14, 2) NOT NULL,
	"taxInclusiveAmount" numeric(14, 2) NOT NULL,
	"taxRate" numeric(5, 2) NOT NULL,
	"items" text,
	"projectCode" varchar(50),
	"contractNumber" varchar(50),
	"purchaseOrderId" integer,
	"supplierId" integer,
	"customerId" integer,
	"glEntryId" integer,
	"certificationStatus" varchar(50) DEFAULT 'pending',
	"certifiedAt" timestamp,
	"status" varchar(50) DEFAULT 'draft',
	"erpLegacyId" varchar(50),
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tax_invoices_uk_invoice_number" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE "grt_detected_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" varchar(64) NOT NULL,
	"device_type" "grt_device_type" NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"mac_address" varchar(17),
	"hostname" varchar(200),
	"brand" varchar(100),
	"model" varchar(200),
	"firmware_version" varchar(50),
	"protocol" varchar(30),
	"port" integer,
	"status" "grt_device_status" DEFAULT 'online' NOT NULL,
	"response_time_ms" integer,
	"auto_config_applied" boolean DEFAULT false,
	"config_json" json DEFAULT '{}'::json,
	"detected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_environment_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" varchar(64) NOT NULL,
	"scan_type" "grt_scan_type" NOT NULL,
	"status" "grt_scan_status" DEFAULT 'running' NOT NULL,
	"subnet_range" varchar(50) DEFAULT '192.168.1.0/24',
	"devices_found" integer DEFAULT 0,
	"results" json DEFAULT '{}'::json,
	"error_message" text,
	"scanned_by" varchar(100) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "grt_environment_scans_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "hmi_screens" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"plc_project_id" integer NOT NULL,
	"screen_index" integer NOT NULL,
	"screen_name" varchar(200) NOT NULL,
	"screen_name_en" varchar(200) DEFAULT '',
	"screen_type" "hmi_screen_type" NOT NULL,
	"target_platform" "hmi_target_platform" DEFAULT 'siemens_comfort' NOT NULL,
	"layout_json" json DEFAULT '{"screenWidth":1920,"screenHeight":1080,"backgroundColor":"#1a1a2e","headerText":"","widgets":[],"navigationLinks":[]}'::json,
	"widget_count" integer DEFAULT 0,
	"resolution" varchar(20) DEFAULT '1920x1080',
	"generated_code" text DEFAULT '',
	"preview_svg" text DEFAULT '',
	"station_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competency_rubrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_role" varchar(100) NOT NULL,
	"domain" varchar(10) NOT NULL,
	"level" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rubric_role_domain_level" UNIQUE("job_role","domain","level")
);
--> statement-breakpoint
CREATE TABLE "employee_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"current_level" integer DEFAULT 1,
	"target_level" integer DEFAULT 3,
	"assessed_by" varchar(100),
	"certified_by" varchar(100),
	"certification_expiry_date" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_emp_skill" UNIQUE("employee_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "employee_domain_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"domain" varchar(10) NOT NULL,
	"current_level" integer DEFAULT 1,
	"score" varchar(20),
	"assessed_by" varchar(100),
	"assessment_period" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_emp_domain_period" UNIQUE("employee_id","domain","assessment_period")
);
--> statement-breakpoint
CREATE TABLE "skill_dictionary" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_zh" varchar(200) NOT NULL,
	"domain" varchar(10) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"is_certifiable" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_dictionary_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "humanoid_robots" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_code" varchar(50) NOT NULL,
	"model" varchar(100),
	"manufacturer" varchar(100),
	"serial_number" varchar(100),
	"firmware_version" varchar(50),
	"status" "humanoid_status" DEFAULT 'offline',
	"station_id" integer,
	"station_name" varchar(200),
	"gripper_type" "gripper_type" DEFAULT 'parallel_jaw',
	"grip_force_n" numeric(6, 2),
	"capabilities" jsonb,
	"camera_ids" jsonb,
	"uwb_tag_id" varchar(50),
	"dt_asset_id" integer,
	"last_heartbeat_at" timestamp,
	"total_runtime_hours" numeric(10, 2) DEFAULT '0',
	"total_cycle_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "humanoid_robots_robot_code_unique" UNIQUE("robot_code")
);
--> statement-breakpoint
CREATE TABLE "humanoid_vision_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"humanoid_robot_id" integer,
	"camera_id" integer,
	"snapshot_id" integer,
	"part_number" varchar(100),
	"result" "vision_result",
	"confidence_score" numeric(5, 4),
	"detected_part_type" varchar(100),
	"measured_values" jsonb,
	"bounding_boxes" jsonb,
	"processing_time_ms" integer,
	"image_url" varchar(500),
	"selected_recipe_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "humanoid_vision_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_name" varchar(200) NOT NULL,
	"task_type" "vision_task_type" NOT NULL,
	"part_type_pattern" varchar(100),
	"cleanliness_threshold_mg" numeric(10, 4),
	"dimension_tolerance_mm" numeric(8, 3),
	"reference_image_url" varchar(500),
	"ai_model_id" varchar(100),
	"linked_recipe_id" integer,
	"parameters" jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer,
	"step_number" integer,
	"step_description" text,
	"status" "maintenance_step_status" DEFAULT 'pending',
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"evidence_type" varchar(30),
	"evidence_url" varchar(500),
	"evidence_thumbnail_url" varchar(500),
	"evidence_notes" text,
	"measured_value" varchar(100),
	"expected_value" varchar(100),
	"unit" varchar(30),
	"measurement_pass" boolean,
	"parts_used" jsonb,
	"tools_used" jsonb,
	"executed_by" integer,
	"executed_by_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_name" varchar(200) NOT NULL,
	"schedule_name_en" varchar(200),
	"equipment_type" varchar(50),
	"equipment_id" integer,
	"maintenance_type" "maintenance_schedule_type",
	"interval_days" integer,
	"runtime_hours_trigger" numeric(10, 2),
	"cycle_count_trigger" integer,
	"sensor_threshold_json" jsonb,
	"sop_steps" jsonb,
	"estimated_duration_minutes" integer,
	"priority" "maintenance_priority" DEFAULT 'medium',
	"requires_shutdown" boolean DEFAULT false,
	"assigned_role_id" varchar(50),
	"last_generated_at" timestamp,
	"next_due_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_code" varchar(50) NOT NULL,
	"schedule_id" integer,
	"equipment_type" varchar(50),
	"equipment_id" integer,
	"equipment_name" varchar(200),
	"title" varchar(300),
	"description" text,
	"status" "maintenance_wo_status" DEFAULT 'draft',
	"priority" "maintenance_priority" DEFAULT 'medium',
	"assigned_to" integer,
	"assigned_to_name" varchar(100),
	"scheduled_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"actual_start_at" timestamp,
	"actual_end_at" timestamp,
	"total_duration_minutes" integer,
	"sop_step_count" integer DEFAULT 0,
	"completed_step_count" integer DEFAULT 0,
	"parts_consumed" jsonb,
	"total_parts_cost" numeric(12, 2) DEFAULT '0',
	"downtime_minutes" integer DEFAULT 0,
	"completed_by" integer,
	"completed_by_name" varchar(100),
	"reviewed_by" integer,
	"reviewed_by_name" varchar(100),
	"review_notes" text,
	"quality_verified" boolean DEFAULT false,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_work_orders_work_order_code_unique" UNIQUE("work_order_code")
);
--> statement-breakpoint
CREATE TABLE "material_handling_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"humanoid_robot_id" integer,
	"project_id" integer,
	"work_order_id" integer,
	"part_number" varchar(100),
	"part_name" varchar(200),
	"part_quantity" integer DEFAULT 1,
	"status" "handling_job_status" DEFAULT 'queued',
	"pick_source" varchar(200),
	"load_target" varchar(200),
	"unload_target" varchar(200),
	"place_destination" varchar(200),
	"queued_at" timestamp DEFAULT now(),
	"pick_start_at" timestamp,
	"pick_complete_at" timestamp,
	"load_start_at" timestamp,
	"load_complete_at" timestamp,
	"cleaning_start_at" timestamp,
	"cleaning_complete_at" timestamp,
	"unload_start_at" timestamp,
	"unload_complete_at" timestamp,
	"place_start_at" timestamp,
	"place_complete_at" timestamp,
	"grip_force_n" numeric(6, 2),
	"gripper_status" varchar(20) DEFAULT 'idle',
	"vision_result_id" integer,
	"cleaning_recipe_id" integer,
	"priority" integer DEFAULT 5,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_handling_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"step_name" varchar(50),
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_seconds" integer,
	"success" boolean DEFAULT true,
	"grip_force_n" numeric(6, 2),
	"error_code" varchar(50),
	"error_message" text,
	"sensor_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ido_file_context_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_id" integer,
	"file_source" varchar(30) NOT NULL,
	"project_id" integer,
	"stage_code" varchar(10),
	"related_doc_count" integer DEFAULT 0,
	"next_actions_shown" jsonb,
	"stage_progress_shown" boolean DEFAULT false,
	"clicked_related_doc" boolean DEFAULT false,
	"clicked_next_action" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ido_stage_document_ui_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"document_type_key" varchar(100) NOT NULL,
	"document_name" varchar(200) NOT NULL,
	"document_name_en" varchar(200),
	"document_category" varchar(50) NOT NULL,
	"file_extensions" varchar(200),
	"ui_page_path" varchar(500),
	"ui_page_name" varchar(200),
	"ui_page_name_en" varchar(200),
	"sharepoint_folder" varchar(200),
	"sharepoint_subfolder" varchar(200),
	"plm_doc_type" varchar(30),
	"org_doc_domain" varchar(100),
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"responsible_roles" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ido_storage_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"stage_code" varchar(10),
	"file_name" varchar(500) NOT NULL,
	"file_extension" varchar(20),
	"file_size_bytes" integer,
	"mime_type" varchar(200),
	"recommended_path" varchar(500),
	"recommended_sp_folder" varchar(200),
	"recommended_plm_doc_type" varchar(30),
	"matched_map_id" integer,
	"confidence_score" integer,
	"ai_reasoning" text,
	"user_action" varchar(30) DEFAULT 'pending',
	"actual_path" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_access_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"doc_source_type" varchar(30) NOT NULL,
	"doc_source_id" varchar(100),
	"doc_title" varchar(500) NOT NULL,
	"auth_type" varchar(20) DEFAULT 'time_limited' NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"max_access_count" integer,
	"current_access_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"request_reason" text,
	"approved_by" integer,
	"approved_by_name" varchar(100),
	"approved_at" timestamp,
	"rejected_reason" text,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"icon" varchar(50),
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"description" text,
	"color" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "knowledge_learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"doc_source_type" varchar(30) NOT NULL,
	"doc_source_id" varchar(100),
	"doc_title" varchar(500) NOT NULL,
	"category_code" varchar(50),
	"status" varchar(20) DEFAULT 'not_started',
	"progress_percent" integer DEFAULT 0,
	"total_study_minutes" integer DEFAULT 0,
	"last_studied_at" timestamp,
	"completed_at" timestamp,
	"personal_notes" text,
	"bookmark_position" varchar(200),
	"test_attempts" integer DEFAULT 0,
	"best_test_score" integer,
	"test_passed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_role_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"position" varchar(100),
	"doc_source_type" varchar(30) NOT NULL,
	"doc_source_id" varchar(100),
	"doc_title" varchar(500) NOT NULL,
	"doc_url" varchar(1000),
	"category_code" varchar(50),
	"requirement_level" varchar(20) DEFAULT 'must_know' NOT NULL,
	"skill_level_required" integer DEFAULT 1,
	"mastery_expectation" varchar(20) DEFAULT 'understand',
	"has_test" boolean DEFAULT false,
	"test_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_skill_level_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"skill_level" integer NOT NULL,
	"level_name" varchar(50) NOT NULL,
	"level_name_en" varchar(50),
	"knowledge_requirements" json DEFAULT '[]'::json,
	"skill_requirements" json DEFAULT '[]'::json,
	"performance_standards" json DEFAULT '[]'::json,
	"certification_required" json DEFAULT '[]'::json,
	"training_hours_required" integer DEFAULT 0,
	"theory_test_required" boolean DEFAULT false,
	"min_test_score" integer DEFAULT 60,
	"practical_assessment_required" boolean DEFAULT false,
	"min_months_at_previous_level" integer DEFAULT 6,
	"min_kpi_score" numeric(5, 2),
	"description" text,
	"example_tasks" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"answers" json,
	"score" integer NOT NULL,
	"total_points" integer NOT NULL,
	"passed" boolean NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_minutes" integer,
	"question_results" json,
	"attempt_number" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_theory_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"category_code" varchar(50),
	"target_role" varchar(50),
	"skill_level_required" integer DEFAULT 1,
	"questions" json NOT NULL,
	"total_points" integer NOT NULL,
	"passing_score" integer DEFAULT 60 NOT NULL,
	"time_limit_minutes" integer DEFAULT 30,
	"max_attempts" integer DEFAULT 3,
	"shuffle_questions" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"m_phase" varchar(10),
	"equipment_family" varchar(100),
	"file_url" text,
	"original_filename" varchar(300),
	"mime_type" varchar(100),
	"status" varchar(30) DEFAULT 'PENDING_VISION_PARSE' NOT NULL,
	"ai_task_id" integer,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_vector_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_content" text NOT NULL,
	"embedding" text,
	"embedding_model" varchar(50),
	"embedding_dim" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"stage_code" varchar(10),
	"activity_type" varchar(30) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"metadata" json,
	"impact_score" integer,
	"is_public" boolean DEFAULT true,
	"is_pinned" boolean DEFAULT false,
	"image_url" varchar(500),
	"occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lifecycle_journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" varchar(50),
	"employee_name" varchar(100) NOT NULL,
	"department" varchar(100),
	"position" varchar(100),
	"role" varchar(50),
	"hire_date" timestamp,
	"current_stage" varchar(10) DEFAULT 'G2' NOT NULL,
	"current_stage_name" varchar(100),
	"stage_entered_at" timestamp DEFAULT now(),
	"portal_theme" varchar(30) DEFAULT 'default',
	"portal_banner_url" varchar(500),
	"personal_motto" varchar(300),
	"career_vision" text,
	"personal_highlight_reel" json DEFAULT '[]'::json,
	"company_mission_acknowledged" boolean DEFAULT false,
	"culture_values" json DEFAULT '[]'::json,
	"persona_traits" json,
	"status" varchar(20) DEFAULT 'active',
	"exit_date" timestamp,
	"alumni_status" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lifecycle_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"stage_name" varchar(100) NOT NULL,
	"stage_name_en" varchar(100),
	"stage_description" text,
	"stage_icon" varchar(50),
	"stage_color" varchar(20),
	"expected_date" timestamp,
	"actual_date" timestamp,
	"completed_at" timestamp,
	"status" varchar(20) DEFAULT 'upcoming',
	"objectives" json DEFAULT '[]'::json,
	"daily_tools" json DEFAULT '[]'::json,
	"reporting_requirements" json DEFAULT '[]'::json,
	"inspirational_message" text,
	"mentor_message" text,
	"media_url" varchar(500),
	"media_type" varchar(20),
	"achievement_badge" varchar(100),
	"achievement_title" varchar(200),
	"stage_kpi_score" numeric(5, 2),
	"stage_capability_level" integer,
	"manager_review" text,
	"manager_reviewed_by" integer,
	"manager_reviewed_at" timestamp,
	"manager_rating" integer,
	"hrbp_notes" text,
	"hrbp_reviewed_by" integer,
	"hrbp_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lifecycle_stage_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"stage_name" varchar(100) NOT NULL,
	"stage_name_en" varchar(100),
	"stage_subtitle" varchar(300),
	"stage_icon" varchar(50),
	"stage_color" varchar(20),
	"typical_start_month" integer,
	"typical_end_month" integer,
	"description" text,
	"narrative" text,
	"company_mission_link" text,
	"culture_message" text,
	"default_objectives" json DEFAULT '[]'::json,
	"default_daily_tools" json DEFAULT '[]'::json,
	"default_reporting" json DEFAULT '[]'::json,
	"default_media_url" varchar(500),
	"default_media_type" varchar(20),
	"default_message" text,
	"achievement_badge" varchar(100),
	"achievement_title" varchar(200),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lifecycle_stage_templates_stage_code_unique" UNIQUE("stage_code")
);
--> statement-breakpoint
CREATE TABLE "labor_cost_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_code" varchar(50),
	"process_code" varchar(20) NOT NULL,
	"budget_hours" numeric(10, 2) NOT NULL,
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"budget_cost" numeric(14, 2) NOT NULL,
	"actual_cost" numeric(14, 2) DEFAULT '0',
	"variance_pct" numeric(5, 2),
	"completion_pct" numeric(5, 2) DEFAULT '0',
	"forecast_final_cost" numeric(14, 2),
	"status" varchar(20) DEFAULT 'on_track',
	"threshold_yellow" numeric(5, 2) DEFAULT '10',
	"threshold_red" numeric(5, 2) DEFAULT '25',
	"last_updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "labor_time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(100),
	"work_order_id" integer,
	"station_id" integer,
	"process_code" varchar(20),
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" numeric(8, 2),
	"source" varchar(20) DEFAULT 'manual',
	"uwb_session_id" integer,
	"validated" boolean DEFAULT false,
	"validated_by" integer,
	"validated_at" timestamp,
	"labor_rate" numeric(10, 2),
	"labor_cost" numeric(12, 2),
	"project_id" integer,
	"bu_code" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mes_capacity_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"plan_date" varchar(10) NOT NULL,
	"plan_type" varchar(20) DEFAULT 'daily',
	"shift_code" varchar(20),
	"process_code" varchar(20),
	"planned_hours" numeric(8, 2) NOT NULL,
	"actual_hours" numeric(8, 2) DEFAULT '0',
	"planned_units" integer DEFAULT 0,
	"actual_units" integer DEFAULT 0,
	"utilization_pct" numeric(5, 2),
	"bottleneck_score" numeric(5, 2),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mes_defect_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"quality_check_id" integer NOT NULL,
	"work_order_id" integer,
	"station_id" integer NOT NULL,
	"defect_code" varchar(50),
	"defect_description" text,
	"root_cause_category" varchar(30) NOT NULL,
	"root_cause_detail" text NOT NULL,
	"ishikawa_branch" varchar(30),
	"five_why_chain" json,
	"corrective_action" text,
	"corrective_action_due_date" timestamp,
	"preventive_action" text,
	"preventive_action_due_date" timestamp,
	"status" varchar(20) DEFAULT 'open',
	"severity" varchar(10),
	"assigned_to" integer,
	"assigned_to_name" varchar(100),
	"closed_by" integer,
	"closed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mes_equipment_downtime" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"station_id" integer,
	"downtime_type" varchar(30) NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"duration_minutes" integer,
	"root_cause" text,
	"root_cause_category" varchar(30),
	"impacted_work_orders" json,
	"reported_by" integer,
	"resolved_by" integer,
	"resolution" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skill_task_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"station_id" integer,
	"required_skill_domain" varchar(100) NOT NULL,
	"required_level" integer NOT NULL,
	"preferred_certifications" json,
	"min_experience_months" integer DEFAULT 0,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mkt_annual_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"okr_objective_id" integer,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"total_budget" numeric(14, 2),
	"approved_budget" numeric(14, 2),
	"actual_spend" numeric(14, 2) DEFAULT '0',
	"budget_status" varchar(30) DEFAULT 'pending',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_asset_quality_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"spec_name" varchar(200) NOT NULL,
	"requirements" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_asset_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_name" varchar(200) NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"asset_url" text,
	"spec_id" integer,
	"submitted_by" integer NOT NULL,
	"reviewer_by" integer,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"vi_compliance_result" jsonb,
	"review_notes" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_broadcast_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"location" varchar(300),
	"screen_type" varchar(50),
	"resolution" varchar(30),
	"is_online" boolean DEFAULT false,
	"last_heartbeat" timestamp,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_broadcast_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"content_title" varchar(200) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_url" text,
	"content_ref_id" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_budget_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"planned_amount" numeric(14, 2) NOT NULL,
	"actual_amount" numeric(14, 2) DEFAULT '0',
	"red_line_limit" numeric(14, 2),
	"status" varchar(30) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_exhibition_roi" (
	"id" serial PRIMARY KEY NOT NULL,
	"exhibition_id" integer NOT NULL,
	"total_spend" numeric(14, 2),
	"leads_generated" integer DEFAULT 0,
	"m0_projects_generated" integer DEFAULT 0,
	"estimated_revenue" numeric(14, 2),
	"roi_percentage" numeric(8, 2),
	"ai_narrative" text,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_exhibition_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"exhibition_id" integer NOT NULL,
	"stage" varchar(10) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"assigned_to" integer,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_exhibitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"venue" varchar(300),
	"city" varchar(100),
	"country" varchar(50),
	"start_date" timestamp,
	"end_date" timestamp,
	"stage" varchar(10) DEFAULT 'E0' NOT NULL,
	"budget" numeric(14, 2),
	"budget_approved" boolean DEFAULT false,
	"demo_equipment" jsonb DEFAULT '[]'::jsonb,
	"booth_info" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_historical_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"year" integer,
	"region" varchar(50),
	"industry" varchar(100),
	"file_url" text,
	"thumbnail_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"vectorized" boolean DEFAULT false,
	"knowledge_base_id" integer,
	"exhibition_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_kpi_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"target_value" numeric(14, 2) NOT NULL,
	"current_value" numeric(14, 2) DEFAULT '0',
	"unit" varchar(30) NOT NULL,
	"rag_status" varchar(10) DEFAULT 'gray',
	"last_checkin_at" timestamp,
	"checkin_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_lead_captures" (
	"id" serial PRIMARY KEY NOT NULL,
	"exhibition_id" integer NOT NULL,
	"company_name" varchar(200),
	"contact_name" varchar(100),
	"contact_title" varchar(100),
	"email" varchar(200),
	"phone" varchar(50),
	"notes" text,
	"ocr_data" jsonb,
	"sync_status" varchar(30) DEFAULT 'pending',
	"crm_lead_id" integer,
	"captured_by" integer,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_vi_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" varchar(20) DEFAULT 'global' NOT NULL,
	"category" varchar(50) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"rule_content" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_acceptance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"acceptance_phase" varchar(30) NOT NULL,
	"check_item" varchar(500) NOT NULL,
	"category" "mech_std_category" NOT NULL,
	"standard_id" integer,
	"result" "mech_acceptance_result" DEFAULT 'PENDING' NOT NULL,
	"score" real,
	"customer_comment" text,
	"corrective_action" text,
	"inspector_name" varchar(100),
	"inspected_at" timestamp,
	"evidence_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_config_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"category" "mech_std_category" NOT NULL,
	"item_code" varchar(50) NOT NULL,
	"item_name" varchar(300) NOT NULL,
	"specification" text,
	"standard_id" integer,
	"brand" varchar(100),
	"alternative_brands" json,
	"quantity_formula" varchar(200),
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_customer_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_code" varchar(50),
	"region" varchar(20) NOT NULL,
	"frame_material" varchar(100),
	"surface_finish" varchar(200),
	"welding_standard" varchar(100),
	"tolerance_grade" varchar(50),
	"ip_rating" varchar(20),
	"cleanroom_class" varchar(50),
	"pneumatics_brand" varchar(100),
	"hydraulics_pressure" varchar(50),
	"cable_routing_spec" varchar(200),
	"paint_color_code" varchar(50),
	"noise_limit" varchar(50),
	"vibration_limit" varchar(100),
	"packaging_spec" varchar(200),
	"safety_guard_spec" varchar(200),
	"fastener_standard" varchar(100),
	"document_languages" json,
	"special_requirements" text,
	"overlay_standard_ids" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"bu_code" varchar(20),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_phase_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"standard_id" integer,
	"standard_code" varchar(80),
	"phase" varchar(10) NOT NULL,
	"check_item" varchar(500) NOT NULL,
	"check_method" text,
	"acceptance_criteria" text,
	"status" "mech_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"checked_by" integer,
	"checked_at" timestamp,
	"evidence" varchar(500),
	"deviation_note" text,
	"waiver_approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_project_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_code" varchar(50) NOT NULL,
	"project_name" varchar(300),
	"customer_config_id" integer,
	"applicable_phases" json,
	"selected_standard_ids" json,
	"design_basis" json,
	"locked_at" timestamp,
	"locked_by" integer,
	"notes" text,
	"bu_code" varchar(20),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_quotation_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"quotation_number" varchar(50) NOT NULL,
	"customer_config_id" integer,
	"check_item" varchar(500) NOT NULL,
	"category" "mech_std_category" NOT NULL,
	"standard_id" integer,
	"customer_requirement" text,
	"grt_proposal" text,
	"compliance_status" "mech_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"deviation_note" text,
	"cost_impact" varchar(100),
	"checked_by" integer,
	"checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_review_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase" varchar(10) NOT NULL,
	"origin" "mech_std_origin" NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"checklist_template" json,
	"required_approvers" json,
	"is_blocking" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mech_standard_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"link_type" "mech_link_type" NOT NULL,
	"description" varchar(300),
	"strength" integer DEFAULT 50,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mechanical_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"origin" "mech_std_origin" NOT NULL,
	"category" "mech_std_category" NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_en" varchar(500),
	"description" text,
	"version" varchar(30) NOT NULL,
	"reference_doc" varchar(300),
	"reference_url" varchar(500),
	"applicable_regions" json,
	"applicable_materials" json,
	"key_requirements" json,
	"inspection_methods" json,
	"tolerance_class" varchar(50),
	"status" "mech_std_status" DEFAULT 'active' NOT NULL,
	"effective_date" timestamp,
	"superseded_by" integer,
	"tags" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mes_quality_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispatch_id" integer NOT NULL,
	"station_id" integer NOT NULL,
	"check_type" varchar(30) NOT NULL,
	"camera_id" integer,
	"snapshot_id" integer,
	"result" varchar(20) NOT NULL,
	"defect_codes" json,
	"confidence" numeric(5, 4),
	"inspector_id" integer,
	"inspector_name" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mes_station_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"station_code" varchar(50) NOT NULL,
	"station_name" varchar(100) NOT NULL,
	"current_operator_id" integer,
	"current_operator_name" varchar(100),
	"current_dispatch_id" integer,
	"camera_id" integer,
	"status" varchar(20) DEFAULT 'idle' NOT NULL,
	"last_activity_at" timestamp,
	"shift_code" varchar(20),
	"bu_code" varchar(20),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mes_station_status_station_id_unique" UNIQUE("station_id")
);
--> statement-breakpoint
CREATE TABLE "mes_work_order_dispatch" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"station_id" integer NOT NULL,
	"operator_id" integer,
	"operator_name" varchar(100),
	"planned_start_time" timestamp,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"pause_reason" text,
	"camera_recording_id" integer,
	"quality_result" varchar(20),
	"cycle_time_seconds" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oee_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" integer NOT NULL,
	"snapshot_date" date NOT NULL,
	"availability" numeric(5, 4) NOT NULL,
	"performance" numeric(5, 4) NOT NULL,
	"quality" numeric(5, 4) NOT NULL,
	"oee" numeric(5, 4) NOT NULL,
	"total_planned_minutes" integer,
	"total_operating_minutes" integer,
	"total_count" integer,
	"total_defects" integer,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_shift_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" integer NOT NULL,
	"shift_code" varchar(20) NOT NULL,
	"shift_date" date NOT NULL,
	"planned_production_minutes" integer NOT NULL,
	"operating_minutes" integer NOT NULL,
	"planned_downtime_minutes" integer DEFAULT 0 NOT NULL,
	"unplanned_downtime_minutes" integer DEFAULT 0 NOT NULL,
	"ideal_cycle_time_seconds" numeric(10, 2) NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"defect_count" integer DEFAULT 0 NOT NULL,
	"entered_by" integer,
	"data_source" varchar(50) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oem_api_call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"client_id" integer NOT NULL,
	"endpoint" varchar(200) NOT NULL,
	"method" varchar(10) DEFAULT 'GET' NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"ip_address" varchar(45),
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oem_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"key_name" varchar(100) NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"scopes" json DEFAULT '[]'::json NOT NULL,
	"status" "oem_key_status" DEFAULT 'active' NOT NULL,
	"rate_limit_per_hour" integer DEFAULT 1000 NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"created_by" integer,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oem_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "oem_webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"payload" json NOT NULL,
	"status" "oem_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"status_code" integer,
	"response_body" text,
	"next_retry_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oem_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"endpoint_url" varchar(500) NOT NULL,
	"events" json DEFAULT '[]'::json NOT NULL,
	"secret_hash" varchar(128) NOT NULL,
	"secret_prefix" varchar(12) NOT NULL,
	"status" "oem_webhook_status" DEFAULT 'active' NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_triggered_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "okr_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_result_id" integer NOT NULL,
	"value" real NOT NULL,
	"confidence" real DEFAULT 0.5,
	"note" text,
	"author_id" varchar(100),
	"author_name" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"objective_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"metric_type" varchar(20) DEFAULT 'percentage' NOT NULL,
	"start_value" real DEFAULT 0 NOT NULL,
	"target_value" real DEFAULT 100 NOT NULL,
	"current_value" real DEFAULT 0 NOT NULL,
	"unit" varchar(30) DEFAULT '%',
	"confidence" real DEFAULT 0.5,
	"owner_id" varchar(100),
	"owner_name" varchar(200),
	"status" varchar(20) DEFAULT 'on_track' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"level" varchar(20) DEFAULT 'individual' NOT NULL,
	"owner_id" varchar(100) NOT NULL,
	"owner_name" varchar(200),
	"parent_id" integer,
	"period" varchar(20) NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"priority" varchar(10) DEFAULT 'P1',
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_document_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"instance_id" integer,
	"action" varchar(30) NOT NULL,
	"user_id" integer,
	"user_name" varchar(100),
	"user_role" varchar(50),
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_document_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_code" varchar(50) NOT NULL,
	"template_id" integer NOT NULL,
	"template_version" varchar(20),
	"title" varchar(500) NOT NULL,
	"description" text,
	"markdown_content" text,
	"form_data" jsonb,
	"project_id" integer,
	"project_code" varchar(50),
	"bu_code" varchar(50),
	"stage_code" varchar(20),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"approval_flow_id" integer,
	"current_approver_id" integer,
	"current_approval_step" integer DEFAULT 0,
	"approved_at" timestamp,
	"created_by" integer,
	"created_by_name" varchar(100),
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_document_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_doc_id" integer NOT NULL,
	"target_doc_id" integer,
	"target_type" varchar(30) NOT NULL,
	"target_entity_id" integer,
	"target_path" varchar(500),
	"link_type" varchar(30) NOT NULL,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_document_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_code" varchar(80) NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_en" varchar(500),
	"description" text,
	"domain" varchar(100) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"doc_type" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"file_path" varchar(500),
	"markdown_content" text,
	"content_hash" varchar(64),
	"current_version" varchar(20) DEFAULT 'V1.0' NOT NULL,
	"version_major" integer DEFAULT 1 NOT NULL,
	"version_minor" integer DEFAULT 0 NOT NULL,
	"total_versions" integer DEFAULT 1 NOT NULL,
	"owner_role" varchar(50),
	"owner_user_id" integer,
	"approver_role" varchar(50),
	"bu_code" varchar(50),
	"all_bus" boolean DEFAULT true NOT NULL,
	"review_frequency" varchar(30),
	"last_reviewed_at" timestamp,
	"next_review_due_at" timestamp,
	"review_overdue" boolean DEFAULT false NOT NULL,
	"system_routes" jsonb,
	"system_roles" jsonb,
	"tags" jsonb,
	"related_doc_ids" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_document_review_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"reviewer_id" integer,
	"reviewer_name" varchar(100),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"result_version_id" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "org_document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_string" varchar(20) NOT NULL,
	"version_major" integer NOT NULL,
	"version_minor" integer NOT NULL,
	"markdown_content" text,
	"content_hash" varchar(64),
	"change_reason" text,
	"change_type" varchar(20) NOT NULL,
	"created_by" integer,
	"created_by_name" varchar(100),
	"is_latest" boolean DEFAULT true NOT NULL,
	"review_status" varchar(30) DEFAULT 'approved' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_sp_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"sp_site_id" varchar(255) NOT NULL,
	"sp_root_path" varchar(500) NOT NULL,
	"sync_direction" varchar(20) DEFAULT 'bidirectional',
	"auto_sync" boolean DEFAULT false,
	"auto_mirror" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"type" varchar(20) NOT NULL,
	"parent_id" integer,
	"bu_id" integer,
	"manager_id" integer,
	"sp_site_id" varchar(255),
	"sp_root_path" varchar(500),
	"sp_token_scope" varchar(500),
	"data_scope" varchar(20) DEFAULT 'department',
	"cluster" varchar(1),
	"site_code" varchar(50),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_nodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sharepoint_site_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_code" varchar(50) NOT NULL,
	"folder_path" varchar(500) NOT NULL,
	"folder_name" varchar(200) NOT NULL,
	"folder_name_zh" varchar(200),
	"parent_path" varchar(500),
	"is_template" boolean DEFAULT false,
	"project_code" varchar(30),
	"sync_direction" varchar(20) DEFAULT 'bidirectional',
	"auto_sync" boolean DEFAULT false,
	"sp_folder_id" varchar(500),
	"last_sync_at" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sharepoint_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_code" varchar(50) NOT NULL,
	"cluster" varchar(1) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description" text,
	"sp_site_id" varchar(500),
	"sp_site_url" varchar(1000),
	"org_node_id" integer,
	"owner_dept_code" varchar(50),
	"folder_template" varchar(50),
	"sync_policy" varchar(20) DEFAULT 'manual',
	"sync_cron_expr" varchar(30),
	"access_level" varchar(20) DEFAULT 'internal',
	"allowed_roles" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sharepoint_sites_site_code_unique" UNIQUE("site_code")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"dept_code" varchar(20),
	"action" varchar(50) NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_path" varchar(1000),
	"target_path" varchar(1000),
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"file_count" integer DEFAULT 0,
	"bytes_transferred" integer DEFAULT 0,
	"triggered_by" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_sandbox_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" varchar(7) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" "ps_cycle_status_enum" DEFAULT 'draft' NOT NULL,
	"work_days" integer DEFAULT 22 NOT NULL,
	"daily_work_hours" numeric(4, 1) DEFAULT '8.0' NOT NULL,
	"total_employees" integer DEFAULT 0,
	"total_gross_pay" numeric(16, 2) DEFAULT '0',
	"total_net_pay" numeric(16, 2) DEFAULT '0',
	"total_tax" numeric(16, 2) DEFAULT '0',
	"total_social_insurance" numeric(16, 2) DEFAULT '0',
	"imported_at" timestamp,
	"imported_by_id" integer,
	"calculated_at" timestamp,
	"approved_at" timestamp,
	"approved_by_id" integer,
	"locked_at" timestamp,
	"remarks" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_sandbox_cycles_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE TABLE "ps_adjustment" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"result_id" integer,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"adjust_type" "ps_adjust_type_enum" NOT NULL,
	"field_name" varchar(50),
	"original_value" numeric(14, 2),
	"adjusted_value" numeric(14, 2) NOT NULL,
	"adjust_amount" numeric(14, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" "ps_adjust_status_enum" DEFAULT 'draft' NOT NULL,
	"created_by_id" integer,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_allowance_input" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"allowance_type" "ps_allowance_type_enum" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"department" varchar(100),
	"remarks" text,
	"raw_data" json,
	"data_source" varchar(50) DEFAULT 'csv_import',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_attendance_input" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"department" varchar(100),
	"employee_code" varchar(50),
	"position" varchar(100),
	"attendance_group" varchar(50),
	"rest_days" integer DEFAULT 0,
	"scheduled_days" integer DEFAULT 0,
	"actual_attendance" numeric(5, 1) DEFAULT '0',
	"work_hours" numeric(7, 1) DEFAULT '0',
	"late_count" integer DEFAULT 0,
	"severe_late_count" integer DEFAULT 0,
	"absent_late_days" numeric(5, 1) DEFAULT '0',
	"early_leave_count" integer DEFAULT 0,
	"absent_days" numeric(5, 1) DEFAULT '0',
	"clock_miss_upper" integer DEFAULT 0,
	"clock_miss_lower" integer DEFAULT 0,
	"annual_leave_days" numeric(5, 1) DEFAULT '0',
	"personal_leave_hours" numeric(7, 1) DEFAULT '0',
	"sick_leave_hours" numeric(7, 1) DEFAULT '0',
	"compensatory_leave_hours" numeric(7, 1) DEFAULT '0',
	"maternity_days" numeric(5, 1) DEFAULT '0',
	"paternity_days" numeric(5, 1) DEFAULT '0',
	"marriage_days" numeric(5, 1) DEFAULT '0',
	"menstrual_days" numeric(5, 1) DEFAULT '0',
	"bereavement_days" numeric(5, 1) DEFAULT '0',
	"nursing_hours" numeric(7, 1) DEFAULT '0',
	"total_overtime_hours" numeric(7, 1) DEFAULT '0',
	"overtime_for_pay_hours" numeric(7, 1) DEFAULT '0',
	"weekday_overtime_for_pay" numeric(7, 1) DEFAULT '0',
	"weekend_overtime_for_pay" numeric(7, 1) DEFAULT '0',
	"holiday_overtime_for_pay" numeric(7, 1) DEFAULT '0',
	"weekday_overtime" numeric(7, 1) DEFAULT '0',
	"weekend_overtime" numeric(7, 1) DEFAULT '0',
	"holiday_overtime" numeric(7, 1) DEFAULT '0',
	"saturday_supplement" numeric(7, 1) DEFAULT '0',
	"raw_data" json,
	"data_source" varchar(50) DEFAULT 'csv_import',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_calc_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"department" varchar(100),
	"position_grade" varchar(20),
	"base_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"position_wage" numeric(14, 2) DEFAULT '0' NOT NULL,
	"skill_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"saturday_shift_premium" numeric(14, 2) DEFAULT '0' NOT NULL,
	"comprehensive_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage1" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage2" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage3" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_adjustment" numeric(14, 2) DEFAULT '0' NOT NULL,
	"calc_perf_coeff1" numeric(5, 2),
	"calc_perf_coeff2" numeric(5, 2),
	"calc_perf_coeff3" numeric(5, 2),
	"perf_deduction1" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_deduction2" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_deduction3" numeric(14, 2) DEFAULT '0' NOT NULL,
	"actual_attendance_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"personal_leave_hours" numeric(7, 1) DEFAULT '0' NOT NULL,
	"sick_leave_hours" numeric(7, 1) DEFAULT '0' NOT NULL,
	"personal_leave_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sick_leave_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"weekday_ot_hours" numeric(7, 1) DEFAULT '0' NOT NULL,
	"weekend_ot_hours" numeric(7, 1) DEFAULT '0' NOT NULL,
	"holiday_ot_hours" numeric(7, 1) DEFAULT '0' NOT NULL,
	"weekday_ot_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"weekend_ot_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"holiday_ot_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cash_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"travel_car_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perfect_attendance_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"assessment_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"social_insurance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing_fund" numeric(14, 2) DEFAULT '0' NOT NULL,
	"income_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"calculation_log" json,
	"formula_details" json,
	"diff_from_excel" json,
	"is_lump_sum" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_final_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"calc_result_id" integer,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"department" varchar(100),
	"position_grade" varchar(20),
	"gross_pay" numeric(14, 2) NOT NULL,
	"social_insurance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing_fund" numeric(14, 2) DEFAULT '0' NOT NULL,
	"income_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(14, 2) NOT NULL,
	"excel_gross_pay" numeric(14, 2),
	"excel_net_pay" numeric(14, 2),
	"excel_tax" numeric(14, 2),
	"gross_diff" numeric(14, 2) DEFAULT '0',
	"net_diff" numeric(14, 2) DEFAULT '0',
	"tax_diff" numeric(14, 2) DEFAULT '0',
	"is_matched" boolean DEFAULT false,
	"reviewed_by_id" integer,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_payout" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"result_id" integer,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"net_pay_amount" numeric(14, 2) NOT NULL,
	"bank_name" varchar(100),
	"bank_account" varchar(50),
	"id_number" varchar(20),
	"phone_number" varchar(20),
	"status" "ps_payout_status_enum" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"payment_ref" varchar(100),
	"failure_reason" text,
	"processed_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_performance_input" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"employee_grt_id" varchar(20),
	"department" varchar(100),
	"position" varchar(100),
	"position_category" "ps_position_category_enum",
	"is_evaluated" boolean DEFAULT true,
	"monthly_score" numeric(5, 1),
	"avg_2024_score" numeric(5, 2),
	"avg_2025_score" numeric(5, 2),
	"preset_2026_score" numeric(5, 2),
	"perf_coeff_1" numeric(5, 2),
	"perf_coeff_2" numeric(5, 2),
	"perf_coeff_3" numeric(5, 2),
	"perf_wage1_base" numeric(14, 2) DEFAULT '0',
	"perf_wage2_base" numeric(14, 2) DEFAULT '0',
	"perf_wage3_base" numeric(14, 2) DEFAULT '0',
	"raw_data" json,
	"data_source" varchar(50) DEFAULT 'csv_import',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_social_fund_input" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"department" varchar(100),
	"hire_date" varchar(20),
	"last_work_date" varchar(20),
	"social_insurance_personal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing_fund_personal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_personal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"raw_data" json,
	"data_source" varchar(50) DEFAULT 'csv_import',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_tax_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"cumulative_income_prior" numeric(16, 2) DEFAULT '0' NOT NULL,
	"cumulative_deduction_prior" numeric(16, 2) DEFAULT '0' NOT NULL,
	"cumulative_tax_paid_prior" numeric(16, 2) DEFAULT '0' NOT NULL,
	"month_index" integer DEFAULT 1 NOT NULL,
	"special_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"basic_exemption" numeric(14, 2) DEFAULT '5000' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_as_built_deviations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"baseline_id" integer,
	"station_code" varchar(20),
	"deviation_type" "pdm_deviation_type" NOT NULL,
	"severity" "pdm_deviation_severity" DEFAULT 'minor' NOT NULL,
	"component_code" varchar(50),
	"component_name" varchar(200),
	"designed_value" text,
	"actual_value" text,
	"reason" text,
	"approval_status" varchar(30) DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"eco_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"project_id" integer,
	"gate_stage" varchar(20) NOT NULL,
	"baseline_name" varchar(200) NOT NULL,
	"bom_master_id" integer,
	"bom_version" varchar(20),
	"plm_document_ids" jsonb,
	"plc_project_id" integer,
	"plc_version_tag" varchar(50),
	"station_snapshot" jsonb,
	"status" "pdm_baseline_status" DEFAULT 'draft' NOT NULL,
	"previous_baseline_id" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_eco_workflow" (
	"id" serial PRIMARY KEY NOT NULL,
	"eco_id" integer NOT NULL,
	"step_type" "pdm_eco_step_type" NOT NULL,
	"step_order" integer NOT NULL,
	"status" "pdm_eco_step_status" DEFAULT 'pending' NOT NULL,
	"assignee_id" integer,
	"assignee_name" varchar(128),
	"impacted_bom_ids" jsonb,
	"impacted_doc_ids" jsonb,
	"impacted_station_ids" jsonb,
	"cost_impact" jsonb,
	"production_impact" jsonb,
	"field_retrofit_needed" boolean DEFAULT false,
	"decision" varchar(50),
	"decision_notes" text,
	"completed_at" timestamp,
	"completed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_field_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"project_id" integer,
	"insight_type" "pdm_insight_type" NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"affected_station_types" jsonb,
	"source_service_log_ids" jsonb,
	"occurrence_count" integer DEFAULT 1,
	"severity_score" integer DEFAULT 1,
	"suggested_eco_id" integer,
	"status" "pdm_insight_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_code" varchar(50) NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"product_family" varchar(20) NOT NULL,
	"product_category" varchar(100),
	"description" text,
	"station_count" integer DEFAULT 0,
	"lifecycle_status" "pdm_lifecycle_status" DEFAULT 'concept' NOT NULL,
	"default_project_id" integer,
	"latest_baseline_id" integer,
	"bu_code" varchar(50),
	"maturity_level" integer DEFAULT 0,
	"total_projects_built" integer DEFAULT 0,
	"standards" jsonb,
	"customer_segments" jsonb,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pdm_products_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE "pdm_readiness_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"check_type" "pdm_readiness_check_type" NOT NULL,
	"status" "pdm_readiness_status" DEFAULT 'not_checked' NOT NULL,
	"auto_validated" boolean DEFAULT false,
	"validation_details" text,
	"waiver_approved_by" integer,
	"waiver_reason" text,
	"waived_at" timestamp,
	"checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdm_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer,
	"requirement_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"category" "pdm_requirement_category" NOT NULL,
	"source_type" varchar(50),
	"source_reference" varchar(200),
	"priority" varchar(20) DEFAULT 'medium',
	"design_station_ids" jsonb,
	"bom_item_ids" jsonb,
	"verification_method" varchar(50),
	"verification_item_ids" jsonb,
	"verification_status" "pdm_verification_status" DEFAULT 'not_started' NOT NULL,
	"verification_notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_360_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_employee_id" integer NOT NULL,
	"target_employee_name" varchar(200),
	"reviewer_employee_id" integer NOT NULL,
	"reviewer_name" varchar(200),
	"relationship" "feedback_relationship_enum" NOT NULL,
	"period" varchar(20) NOT NULL,
	"questionnaire" json,
	"overall_score" numeric(5, 2),
	"strengths" text,
	"improvements" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_calibration_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"composite_score_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(200),
	"previous_grade" varchar(2) NOT NULL,
	"new_grade" varchar(2) NOT NULL,
	"previous_score" numeric(6, 2) NOT NULL,
	"new_score" numeric(6, 2) NOT NULL,
	"adjustment_reason" text NOT NULL,
	"adjusted_by" integer NOT NULL,
	"adjusted_by_name" varchar(200),
	"undone_at" timestamp,
	"undone_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_calibration_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"scope" varchar(100) NOT NULL,
	"period" varchar(20) NOT NULL,
	"status" "calibration_session_status_enum" DEFAULT 'draft' NOT NULL,
	"distribution_snapshot" json,
	"final_distribution" json,
	"participants" json,
	"notes" text,
	"created_by" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_composite_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(200),
	"department" varchar(100),
	"period" varchar(20) NOT NULL,
	"ai_composite_score" numeric(6, 2),
	"ai_grade" varchar(2),
	"final_score" numeric(6, 2),
	"final_grade" varchar(2),
	"override_justification" text,
	"override_by" integer,
	"override_at" timestamp,
	"score_breakdown_json" json,
	"status" "composite_score_status_enum" DEFAULT 'ai_scored' NOT NULL,
	"weight_config_id" integer,
	"calibration_session_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_forced_distribution_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(100),
	"bu_code" varchar(50),
	"period" varchar(20),
	"grade_s_max_pct" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"grade_a_max_pct" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"grade_b_max_pct" numeric(5, 2) DEFAULT '50.00' NOT NULL,
	"grade_c_max_pct" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"grade_d_max_pct" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"is_strict" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_incentive_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"category" "incentive_category_enum" NOT NULL,
	"description" text,
	"calculation_method" "incentive_calc_method_enum" DEFAULT 'fixed' NOT NULL,
	"base_amount" numeric(14, 2) DEFAULT '0.00',
	"max_amount" numeric(14, 2),
	"formula" text,
	"eligibility_criteria" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_scoring_weight_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(100),
	"role" varchar(50),
	"bu_code" varchar(50),
	"period" varchar(20),
	"kpi_weight" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"aei_weight" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"okr_weight" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"competency_weight" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"feedback_weight" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_anomaly" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"category" "ps_anomaly_category_enum" NOT NULL,
	"severity" "ps_anomaly_severity_enum" DEFAULT 'warning' NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"field_name" varchar(50),
	"expected_value" varchar(100),
	"actual_value" varchar(100),
	"suggested_action" text,
	"resolved_by_id" integer,
	"resolved_at" timestamp,
	"resolution" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_approval_flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"stage" "ps_approval_stage_enum" NOT NULL,
	"stage_order" integer NOT NULL,
	"action" "ps_approval_action_enum" DEFAULT 'pending' NOT NULL,
	"reviewer_id" integer,
	"reviewer_name" varchar(100),
	"comment" text,
	"checklist" json,
	"action_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_lock_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"lock_type" varchar(30) NOT NULL,
	"locked_by_id" integer NOT NULL,
	"locked_by_name" varchar(100),
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"unlocked_by_id" integer,
	"unlocked_at" timestamp,
	"reason" text,
	"snapshot_hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_perf_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"evidence_type" "ps_evidence_type_enum" NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"score" numeric(5, 1),
	"weight" numeric(3, 2) DEFAULT '1.00',
	"source_system" varchar(50),
	"source_id" varchar(100),
	"attachment_url" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_perf_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"department" varchar(100),
	"position_category" "ps_position_category_enum",
	"evidence_count" integer DEFAULT 0,
	"ai_suggested_score" numeric(5, 1),
	"ai_suggest_reason" text,
	"ai_risk_flags" json,
	"ai_generated_at" timestamp,
	"supervisor_score" numeric(5, 1),
	"supervisor_id" integer,
	"supervisor_name" varchar(100),
	"supervisor_comment" text,
	"supervisor_confirmed_at" timestamp,
	"final_score" numeric(5, 1),
	"bonus_tier" "ps_bonus_tier_enum",
	"bonus_amount" numeric(14, 2) DEFAULT '0',
	"perf_wage1" numeric(14, 2) DEFAULT '0',
	"perf_wage2" numeric(14, 2) DEFAULT '0',
	"perf_wage3" numeric(14, 2) DEFAULT '0',
	"perf_coeff1" numeric(5, 2),
	"perf_coeff2" numeric(5, 2),
	"perf_coeff3" numeric(5, 2),
	"status" "ps_review_status_enum" DEFAULT 'pending_evidence',
	"frozen_at" timestamp,
	"frozen_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_post_payout_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"department" varchar(100),
	"total_gross_pay" numeric(16, 2),
	"total_net_pay" numeric(16, 2),
	"total_perf_bonus" numeric(16, 2),
	"anomaly_count" integer DEFAULT 0,
	"manual_adjust_count" integer DEFAULT 0,
	"tax_anomaly_count" integer DEFAULT 0,
	"approval_hours" numeric(8, 1),
	"excel_match_rate" numeric(5, 1),
	"gross_pay_delta_pct" numeric(5, 2),
	"net_pay_delta_pct" numeric(5, 2),
	"perf_bonus_delta_pct" numeric(5, 2),
	"gpt_summary" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ps_social_fund_policy" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_version" varchar(20) NOT NULL,
	"effective_from" varchar(10) NOT NULL,
	"effective_to" varchar(10),
	"region" varchar(50) DEFAULT '上海',
	"pension_rate" numeric(5, 4) DEFAULT '0.0800',
	"medical_rate" numeric(5, 4) DEFAULT '0.0200',
	"unemployment_rate" numeric(5, 4) DEFAULT '0.0050',
	"housing_fund_rate_min" numeric(5, 4),
	"housing_fund_rate_max" numeric(5, 4),
	"social_insurance_base" json,
	"housing_fund_base" json,
	"regulatory_overrides" json,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_id" integer,
	"department_id" integer,
	"user_id" integer,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"revenue_target" numeric(15, 2),
	"revenue_actual" numeric(15, 2),
	"profit_target" numeric(15, 2),
	"profit_actual" numeric(15, 2),
	"kpi_score" numeric(5, 2),
	"bonus_coefficient" numeric(4, 2) DEFAULT '1.00',
	"kpi_details_json" json,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"frozen_at" timestamp,
	"frozen_by" varchar(50),
	"frozen_reason" varchar(500),
	"version" integer DEFAULT 1 NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"status" varchar(20) DEFAULT 'draft',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"severity" "violation_severity" NOT NULL,
	"source_module" varchar(50),
	"bu_id" integer,
	"department_id" integer,
	"user_id" integer,
	"project_id" integer,
	"title" varchar(300) NOT NULL,
	"description" text,
	"evidence_json" json,
	"impact_description" text,
	"correction_plan" text,
	"action_items_json" json,
	"froze_performance_id" integer,
	"status" "violation_status" DEFAULT 'open' NOT NULL,
	"triggered_by" varchar(50),
	"resolved_by" varchar(50),
	"resolved_at" timestamp,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grt_route_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_pattern" varchar(256) NOT NULL,
	"required_permission" varchar(128) NOT NULL,
	"min_level" integer DEFAULT 0 NOT NULL,
	"allowed_roles" json,
	"is_menu_item" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_alarm_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"alarm_code" varchar(20) NOT NULL,
	"alarm_class" varchar(5) NOT NULL,
	"message_zh" text DEFAULT '',
	"message_en" text DEFAULT '',
	"station_id" integer,
	"trigger_condition" text DEFAULT '',
	"trigger_address" varchar(30) DEFAULT '',
	"interlock_action" text DEFAULT '',
	"reset_type" varchar(20) DEFAULT 'manual',
	"severity" varchar(20) DEFAULT 'medium',
	"alarm_category" varchar(30) DEFAULT 'process',
	"troubleshooting_steps" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_eplan_schematics" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"page_title" varchar(200) NOT NULL,
	"page_category" varchar(30) NOT NULL,
	"xml_content" text DEFAULT '',
	"svg_preview" text DEFAULT '',
	"station_ids" json DEFAULT '[]'::json,
	"revision" varchar(10) DEFAULT 'A',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_io_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"station_id" integer,
	"signal_name" varchar(200) NOT NULL,
	"signal_name_en" varchar(200) DEFAULT '',
	"address" varchar(30) NOT NULL,
	"io_type" varchar(5) NOT NULL,
	"data_type" varchar(10) DEFAULT 'BOOL' NOT NULL,
	"module_rack" integer DEFAULT 0,
	"module_slot" integer DEFAULT 0,
	"module_channel" integer DEFAULT 0,
	"description" text DEFAULT '',
	"safety_relevant" boolean DEFAULT false,
	"alarm_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_program_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"module_name" varchar(200) NOT NULL,
	"module_type" "plc_module_type" NOT NULL,
	"module_number" varchar(20) NOT NULL,
	"parent_module_id" integer,
	"sort_order" integer DEFAULT 0,
	"description" text DEFAULT '',
	"description_en" text DEFAULT '',
	"source_code" text DEFAULT '',
	"language" varchar(10) DEFAULT 'SCL',
	"parameter_interface" json DEFAULT '{}'::json,
	"is_generated" boolean DEFAULT true,
	"is_locked" boolean DEFAULT false,
	"category" varchar(50) DEFAULT 'station_ctrl',
	"version" varchar(20) DEFAULT 'V1.0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_name" varchar(200) NOT NULL,
	"plc_brand" "plc_brand" DEFAULT 'SIEMENS_S7_1500' NOT NULL,
	"plc_model" varchar(100) DEFAULT 'CPU 1516-3 PN/DP',
	"firmware_version" varchar(50) DEFAULT 'V3.0',
	"io_total_di" integer DEFAULT 0,
	"io_total_do" integer DEFAULT 0,
	"io_total_ai" integer DEFAULT 0,
	"io_total_ao" integer DEFAULT 0,
	"rack_count" integer DEFAULT 1,
	"cpu_model" varchar(100) DEFAULT '',
	"hmi_model" varchar(100) DEFAULT 'TP1500 Comfort',
	"hmi_screen_count" integer DEFAULT 1,
	"network_protocol" varchar(50) DEFAULT 'PROFINET',
	"current_version" varchar(50) DEFAULT 'V1.0.0-dev',
	"current_status" "plc_program_status" DEFAULT 'draft',
	"created_by" varchar(100) DEFAULT '',
	"bu_code" varchar(20) DEFAULT 'BU3',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_user_access_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"level_number" integer NOT NULL,
	"level_name" varchar(100) NOT NULL,
	"level_name_en" varchar(100) DEFAULT '',
	"permissions" json DEFAULT '{}'::json,
	"password_policy" json DEFAULT '{}'::json,
	"default_users" json DEFAULT '[]'::json,
	"hmi_screen_access" json DEFAULT '[]'::json,
	"timeout" integer DEFAULT 1800,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plc_version_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_project_id" integer NOT NULL,
	"version_string" varchar(50) NOT NULL,
	"version_type" varchar(20) DEFAULT 'dev' NOT NULL,
	"version_number" varchar(20) DEFAULT '1.0.0',
	"change_log" text DEFAULT '',
	"changed_modules" json DEFAULT '[]'::json,
	"promoted_from" integer,
	"promoted_by" varchar(100) DEFAULT '',
	"promoted_at" timestamp,
	"approval_status" varchar(20) DEFAULT 'pending',
	"test_results" json DEFAULT '{}'::json,
	"digital_fingerprint" varchar(64) DEFAULT '',
	"is_active" boolean DEFAULT true,
	"is_frozen" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_agent_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"ai_task_id" integer,
	"review_type" "project_review_type" NOT NULL,
	"trigger_phase" varchar(10),
	"input_summary" text,
	"input_payload" json,
	"status" "project_review_status" DEFAULT 'pending' NOT NULL,
	"verdict" varchar(20),
	"confidence" integer,
	"findings" json,
	"risk_score" integer,
	"predicted_delay" integer,
	"risk_factors" json,
	"narrative" text,
	"reviewed_by" varchar(50),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_aging_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_code" varchar(50),
	"supplier_name" varchar(200),
	"total_outstanding" numeric(14, 2) DEFAULT '0',
	"current_0_to_30" numeric(14, 2) DEFAULT '0',
	"days_31_to_60" numeric(14, 2) DEFAULT '0',
	"days_61_to_90" numeric(14, 2) DEFAULT '0',
	"days_91_to_120" numeric(14, 2) DEFAULT '0',
	"over_120_days" numeric(14, 2) DEFAULT '0',
	"oldest_invoice_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_aging_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"customer_id" integer,
	"customer_code" varchar(50),
	"customer_name" varchar(200) NOT NULL,
	"project_id" integer,
	"project_code" varchar(50),
	"total_outstanding" numeric(14, 2) DEFAULT '0',
	"current_0_to_30" numeric(14, 2) DEFAULT '0',
	"days_31_to_60" numeric(14, 2) DEFAULT '0',
	"days_61_to_90" numeric(14, 2) DEFAULT '0',
	"days_91_to_120" numeric(14, 2) DEFAULT '0',
	"over_120_days" numeric(14, 2) DEFAULT '0',
	"bad_debt_provision" numeric(14, 2) DEFAULT '0',
	"oldest_invoice_date" timestamp,
	"dso" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bid_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"bid_code" varchar(50) NOT NULL,
	"opportunity_code" varchar(50),
	"customer_name" varchar(200) NOT NULL,
	"customer_id" integer,
	"project_title" varchar(300) NOT NULL,
	"project_description" text,
	"bu_code" varchar(50) NOT NULL,
	"sales_rep_id" integer,
	"sales_rep_name" varchar(100),
	"technical_lead_id" integer,
	"technical_lead_name" varchar(100),
	"estimated_amount" numeric(14, 2) NOT NULL,
	"estimated_cost" numeric(14, 2),
	"gross_margin_target" numeric(5, 2),
	"bid_deadline" timestamp,
	"bid_submitted_date" timestamp,
	"bid_document_urls" text,
	"competitor_info" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"won_date" timestamp,
	"lost_reason" text,
	"formal_project_id" integer,
	"formal_project_code" varchar(50),
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bid_projects_bid_code_unique" UNIQUE("bid_code")
);
--> statement-breakpoint
CREATE TABLE "budget_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"version_type" varchar(50) NOT NULL,
	"version_number" integer NOT NULL,
	"version_name" varchar(100),
	"total_budget" numeric(14, 2) NOT NULL,
	"material_budget" numeric(14, 2) DEFAULT '0',
	"labor_budget" numeric(14, 2) DEFAULT '0',
	"procurement_budget" numeric(14, 2) DEFAULT '0',
	"travel_budget" numeric(14, 2) DEFAULT '0',
	"overhead_budget" numeric(14, 2) DEFAULT '0',
	"contingency_budget" numeric(14, 2) DEFAULT '0',
	"approved_by" integer,
	"approved_at" timestamp,
	"is_active" boolean DEFAULT true,
	"effective_date" timestamp,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_flow_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_date" timestamp NOT NULL,
	"flow_type" varchar(50) NOT NULL,
	"flow_direction" varchar(10) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"project_code" varchar(50),
	"counterparty_name" varchar(200),
	"bank_account_id" integer,
	"source_doc_type" varchar(50),
	"source_doc_id" integer,
	"source_doc_code" varchar(50),
	"fiscal_year" integer,
	"fiscal_period" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_policy_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"city_tier" varchar(10),
	"employee_level" integer,
	"max_amount" numeric(14, 2) NOT NULL,
	"max_daily_amount" numeric(14, 2),
	"requires_receipt" boolean DEFAULT true,
	"requires_pre_approval" boolean DEFAULT false,
	"pre_approval_threshold" numeric(14, 2),
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_policy_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "finance_alert_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_rule_id" integer NOT NULL,
	"alert_code" varchar(50) NOT NULL,
	"severity" varchar(10) NOT NULL,
	"trigger_value" numeric(14, 2),
	"threshold_value" numeric(14, 2),
	"project_code" varchar(50),
	"entity_type" varchar(50),
	"entity_id" integer,
	"entity_name" varchar(200),
	"message" text NOT NULL,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolved_notes" text,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_code" varchar(50) NOT NULL,
	"alert_name" varchar(200) NOT NULL,
	"alert_category" varchar(50) NOT NULL,
	"description" text,
	"yellow_threshold" numeric(10, 2),
	"red_threshold" numeric(10, 2),
	"threshold_unit" varchar(20) DEFAULT 'percent',
	"recipient_roles" text,
	"escalation_roles" text,
	"escalation_after_days" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"display_on_dashboard" boolean DEFAULT true,
	"dashboard_position" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "finance_alert_rules_alert_code_unique" UNIQUE("alert_code")
);
--> statement-breakpoint
CREATE TABLE "labor_cost_pools" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"bu_code" varchar(50),
	"equipment_selling_price" numeric(14, 2) NOT NULL,
	"theoretical_profit" numeric(14, 2) NOT NULL,
	"profit_rate" numeric(5, 2),
	"procurement_cost" numeric(14, 2) NOT NULL,
	"target_labor_pool" numeric(14, 2) NOT NULL,
	"actual_labor_cost" numeric(14, 2) DEFAULT '0',
	"labor_utilization" numeric(5, 2) DEFAULT '0',
	"t01_hours" numeric(8, 2) DEFAULT '0',
	"t01_cost" numeric(14, 2) DEFAULT '0',
	"t02_hours" numeric(8, 2) DEFAULT '0',
	"t02_cost" numeric(14, 2) DEFAULT '0',
	"t03_hours" numeric(8, 2) DEFAULT '0',
	"t03_cost" numeric(14, 2) DEFAULT '0',
	"t04_hours" numeric(8, 2) DEFAULT '0',
	"t04_cost" numeric(14, 2) DEFAULT '0',
	"t05_hours" numeric(8, 2) DEFAULT '0',
	"t05_cost" numeric(14, 2) DEFAULT '0',
	"t06_hours" numeric(8, 2) DEFAULT '0',
	"t06_cost" numeric(14, 2) DEFAULT '0',
	"t07_hours" numeric(8, 2) DEFAULT '0',
	"t07_cost" numeric(14, 2) DEFAULT '0',
	"t08_hours" numeric(8, 2) DEFAULT '0',
	"t08_cost" numeric(14, 2) DEFAULT '0',
	"t09_hours" numeric(8, 2) DEFAULT '0',
	"t09_cost" numeric(14, 2) DEFAULT '0',
	"t10_hours" numeric(8, 2) DEFAULT '0',
	"t10_cost" numeric(14, 2) DEFAULT '0',
	"t11_hours" numeric(8, 2) DEFAULT '0',
	"t11_cost" numeric(14, 2) DEFAULT '0',
	"t12_hours" numeric(8, 2) DEFAULT '0',
	"t12_cost" numeric(14, 2) DEFAULT '0',
	"t13_hours" numeric(8, 2) DEFAULT '0',
	"t13_cost" numeric(14, 2) DEFAULT '0',
	"t14_hours" numeric(8, 2) DEFAULT '0',
	"t14_cost" numeric(14, 2) DEFAULT '0',
	"t15_hours" numeric(8, 2) DEFAULT '0',
	"t15_cost" numeric(14, 2) DEFAULT '0',
	"mechanical_hours" numeric(8, 2) DEFAULT '0',
	"mechanical_cost" numeric(14, 2) DEFAULT '0',
	"electrical_hours" numeric(8, 2) DEFAULT '0',
	"electrical_cost" numeric(14, 2) DEFAULT '0',
	"procurement_dept_cost" numeric(14, 2) DEFAULT '0',
	"sales_person_cost" numeric(14, 2) DEFAULT '0',
	"over_target_cost" numeric(14, 2) DEFAULT '0',
	"is_over_target" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"fiscal_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activity_timeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"projectCode" varchar(50),
	"activityType" varchar(50) NOT NULL,
	"activityTitle" varchar(200) NOT NULL,
	"activityDescription" text,
	"sourceModule" varchar(50) NOT NULL,
	"sourceDocType" varchar(50),
	"sourceDocId" integer,
	"sourceDocCode" varchar(50),
	"projectPhase" varchar(10),
	"amount" numeric(14, 2),
	"performedBy" integer,
	"performedByName" varchar(100),
	"performedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_code_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"buCode" varchar(10),
	"fiscalYear" integer NOT NULL,
	"currentSequence" integer DEFAULT 0 NOT NULL,
	"format" varchar(100) DEFAULT '{PREFIX}-{BU}-{YEAR}-{SEQ:3}' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_code_seq_uk" UNIQUE("prefix","buCode","fiscalYear")
);
--> statement-breakpoint
CREATE TABLE "project_identity_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunityCode" varchar(50),
	"bidCode" varchar(50),
	"formalProjectCode" varchar(50),
	"formalProjectId" integer,
	"currentStage" varchar(50) DEFAULT 'opportunity' NOT NULL,
	"stageHistory" text,
	"customerName" varchar(200),
	"customerId" integer,
	"buCode" varchar(50),
	"estimatedValue" numeric(14, 2),
	"ownerId" integer,
	"ownerName" varchar(100),
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_identity_map_uk_opp" UNIQUE("opportunityCode"),
	CONSTRAINT "project_identity_map_uk_bid" UNIQUE("bidCode"),
	CONSTRAINT "project_identity_map_uk_prj" UNIQUE("formalProjectCode")
);
--> statement-breakpoint
CREATE TABLE "project_reference_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"tableName" varchar(100) NOT NULL,
	"referenceType" varchar(20) NOT NULL,
	"columnName" varchar(100) NOT NULL,
	"hasForeignKey" boolean DEFAULT false,
	"hasIndex" boolean DEFAULT false,
	"notes" text,
	"auditedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_ref_audit_uk" UNIQUE("tableName","columnName")
);
--> statement-breakpoint
CREATE TABLE "project_cost_actuals" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"quote_line_item_id" integer,
	"project_id" integer NOT NULL,
	"category" varchar(30) NOT NULL,
	"sub_category" varchar(50) NOT NULL,
	"budget_hours" numeric(10, 2) DEFAULT '0',
	"budget_cost" numeric(14, 2) DEFAULT '0',
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"actual_cost" numeric(14, 2) DEFAULT '0',
	"variance_hours" numeric(10, 2) DEFAULT '0',
	"variance_cost" numeric(14, 2) DEFAULT '0',
	"variance_pct" numeric(8, 2) DEFAULT '0',
	"completion_pct" numeric(5, 2) DEFAULT '0',
	"forecast_final_cost" numeric(14, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'on_track',
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_pca_quote_cat_sub" UNIQUE("quote_id","category","sub_category")
);
--> statement-breakpoint
CREATE TABLE "project_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_code" varchar(50) NOT NULL,
	"project_id" integer,
	"project_code" varchar(50),
	"bid_project_id" integer,
	"customer_name" varchar(200) NOT NULL,
	"customer_id" integer,
	"equipment_model" varchar(100),
	"equipment_description" text,
	"bu_code" varchar(50) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_quote_id" integer,
	"quote_type" varchar(30) DEFAULT 'initial' NOT NULL,
	"total_mfg_labor_cost" numeric(14, 2) DEFAULT '0',
	"total_material_cost" numeric(14, 2) DEFAULT '0',
	"total_engineering_cost" numeric(14, 2) DEFAULT '0',
	"total_sales_expense" numeric(14, 2) DEFAULT '0',
	"total_warranty_provision" numeric(14, 2) DEFAULT '0',
	"total_other_cost" numeric(14, 2) DEFAULT '0',
	"total_cost" numeric(14, 2) DEFAULT '0',
	"target_margin_pct" numeric(5, 2),
	"target_margin_amount" numeric(14, 2) DEFAULT '0',
	"quoted_price" numeric(14, 2) DEFAULT '0',
	"contract_value" numeric(14, 2),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"prepared_by" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"order_received_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_quotes_quote_code_unique" UNIQUE("quote_code")
);
--> statement-breakpoint
CREATE TABLE "quote_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"category" varchar(30) NOT NULL,
	"sub_category" varchar(50) NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"item_name_en" varchar(200),
	"estimated_hours" numeric(10, 2),
	"hourly_rate" numeric(10, 2),
	"rate_config_id" integer,
	"quantity" numeric(10, 2),
	"unit_price" numeric(12, 2),
	"estimated_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"bom_item_id" integer,
	"supplier_id" integer,
	"po_id" integer,
	"source_type" varchar(30),
	"source_ref_id" varchar(50),
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_rate_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"fiscal_year" integer NOT NULL,
	"category" varchar(30) NOT NULL,
	"rate_code" varchar(50) NOT NULL,
	"rate_name" varchar(100) NOT NULL,
	"rate_name_en" varchar(100),
	"hourly_rate" numeric(10, 2),
	"fixed_amount" numeric(14, 2),
	"rate_unit" varchar(20) NOT NULL,
	"allocation_base" varchar(50),
	"bu_code" varchar(50),
	"is_active" boolean DEFAULT true,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rate_year_code_bu" UNIQUE("fiscal_year","rate_code","bu_code")
);
--> statement-breakpoint
CREATE TABLE "remote_access_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" integer NOT NULL,
	"performer_name" varchar(100) NOT NULL,
	"details" text,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remote_access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_name" varchar(300),
	"engineer_id" integer NOT NULL,
	"engineer_name" varchar(100) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"equipment_id" varchar(100) NOT NULL,
	"equipment_model" varchar(200),
	"target_ip" varchar(50),
	"reason_for_access" text NOT NULL,
	"urgency" "access_urgency" DEFAULT 'NORMAL' NOT NULL,
	"requested_duration_hours" integer NOT NULL,
	"status" "remote_access_status" DEFAULT 'PENDING' NOT NULL,
	"temp_vpn_token" varchar(50),
	"approved_by" integer,
	"approver_name" varchar(100),
	"rejection_reason" text,
	"approved_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" integer,
	"revoke_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"user_id" integer,
	"user_name" varchar(200),
	"change_summary" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_assembly_routings" (
	"id" serial PRIMARY KEY NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"sandbox_bom_id" integer,
	"routing_code" varchar(50) NOT NULL,
	"version" varchar(20) DEFAULT '1.0',
	"routing_name" varchar(300),
	"status" varchar(30) DEFAULT 'draft',
	"total_cycle_time_minutes" numeric(10, 2) DEFAULT '0',
	"activated_at_stage" "rnd_stage",
	"description" text,
	"created_by" integer,
	"activated_at" timestamp,
	"frozen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rnd_routings_uk_code_version" UNIQUE("routing_code","version")
);
--> statement-breakpoint
CREATE TABLE "rnd_bom_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_bom_id" integer NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"snapshot_reason" "rnd_bom_snapshot_reason" NOT NULL,
	"gate_stage" "rnd_stage",
	"bom_header_snapshot" jsonb,
	"bom_items_snapshot" jsonb,
	"total_cost" numeric(15, 2),
	"avl_compliance_percent" numeric(5, 2),
	"snapshot_by" integer,
	"snapshot_label" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_gate_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"gate_stage" "rnd_stage" NOT NULL,
	"review_round" integer DEFAULT 1,
	"decision" "rnd_gate_decision" DEFAULT 'pending',
	"reviewer_id" integer,
	"reviewer_name" varchar(200),
	"reviewer_role" varchar(100),
	"cto_approved" boolean DEFAULT false,
	"cto_approved_by" integer,
	"cto_approved_at" timestamp,
	"cto_comment" text,
	"ceo_approved" boolean DEFAULT false,
	"ceo_approved_by" integer,
	"ceo_approved_at" timestamp,
	"ceo_comment" text,
	"checklist_json" jsonb,
	"checklist_passed" integer DEFAULT 0,
	"checklist_total" integer DEFAULT 0,
	"overall_score" numeric(5, 2),
	"conditions" text,
	"action_items" jsonb,
	"attachments" jsonb,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"name" varchar(300) NOT NULL,
	"name_en" varchar(300),
	"category" "rnd_project_category" NOT NULL,
	"current_stage" "rnd_stage" DEFAULT 'concept',
	"status" "rnd_project_status" DEFAULT 'draft',
	"parent_project_id" integer,
	"parent_project_code" varchar(50),
	"lead_engineer_id" integer,
	"cto_signoff_required" boolean DEFAULT true,
	"ceo_signoff_required" boolean DEFAULT false,
	"budget" numeric(15, 2),
	"actual_spend" numeric(15, 2) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'CNY',
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"target_specs" jsonb,
	"risk_level" varchar(20) DEFAULT 'medium',
	"completion_percent" integer DEFAULT 0,
	"bu_code" varchar(50),
	"description" text,
	"tags" jsonb,
	"created_by" integer,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rnd_projects_uk_code" UNIQUE("project_code")
);
--> statement-breakpoint
CREATE TABLE "rnd_routing_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"routing_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"step_type" "rnd_routing_step_type" NOT NULL,
	"step_name" varchar(300) NOT NULL,
	"standard_cycle_time_minutes" numeric(8, 2),
	"actual_cycle_time_minutes" numeric(8, 2),
	"work_instructions" jsonb,
	"tools_required" jsonb,
	"inspection_criteria" jsonb,
	"consumed_bom_item_ids" jsonb,
	"worker_skill_level" varchar(50),
	"worker_count" integer DEFAULT 1,
	"predecessor_step_id" integer,
	"is_optional" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_sandbox_bom_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_bom_id" integer NOT NULL,
	"parent_item_id" integer,
	"level" integer DEFAULT 1,
	"sequence" integer DEFAULT 10,
	"part_number" varchar(100) NOT NULL,
	"part_name" varchar(300) NOT NULL,
	"component_source" "rnd_bom_component_source" DEFAULT 'cots',
	"quantity" numeric(10, 4) NOT NULL,
	"unit" varchar(20) DEFAULT 'pcs',
	"unit_cost" numeric(12, 4) DEFAULT '0',
	"extended_cost" numeric(15, 2) DEFAULT '0',
	"supplier_name" varchar(200),
	"lead_time_days" integer,
	"is_critical_path" boolean DEFAULT false,
	"requires_custom_tooling" boolean DEFAULT false,
	"avl_material_code" varchar(50),
	"substitutes" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_sandbox_boms" (
	"id" serial PRIMARY KEY NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"bom_code" varchar(50) NOT NULL,
	"version_major" integer DEFAULT 0,
	"version_minor" integer DEFAULT 1,
	"version_label" varchar(20) DEFAULT 'v0.1',
	"status" varchar(30) DEFAULT 'draft',
	"parent_bom_id" integer,
	"total_estimated_cost" numeric(15, 2) DEFAULT '0',
	"total_components" integer DEFAULT 0,
	"avl_approved_count" integer DEFAULT 0,
	"experimental_count" integer DEFAULT 0,
	"frozen_at" timestamp,
	"frozen_by" integer,
	"frozen_for_gate" "rnd_stage",
	"promoted_to_bom_master_id" integer,
	"promoted_at" timestamp,
	"promoted_by" integer,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rnd_sandbox_boms_uk_code_version" UNIQUE("bom_code","version_label")
);
--> statement-breakpoint
CREATE TABLE "rnd_test_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"gate_stage" "rnd_stage" NOT NULL,
	"test_code" varchar(50) NOT NULL,
	"test_name" varchar(300) NOT NULL,
	"test_type" "rnd_test_type" NOT NULL,
	"test_metrics" jsonb,
	"pass_criteria" jsonb,
	"verdict" "rnd_test_verdict" DEFAULT 'not_run',
	"environment_conditions" jsonb,
	"test_equipment" jsonb,
	"evidence_urls" jsonb,
	"executed_by" integer,
	"executed_at" timestamp,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"suite_id" integer,
	"is_mandatory" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rnd_test_suites" (
	"id" serial PRIMARY KEY NOT NULL,
	"rnd_project_id" integer NOT NULL,
	"suite_code" varchar(50) NOT NULL,
	"suite_name" varchar(300) NOT NULL,
	"target_gate" "rnd_stage",
	"project_category" "rnd_project_category",
	"test_templates" jsonb,
	"total_tests" integer DEFAULT 0,
	"passed_tests" integer DEFAULT 0,
	"failed_tests" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rnd_test_suites_uk_project_code" UNIQUE("rnd_project_id","suite_code")
);
--> statement-breakpoint
CREATE TABLE "oiling_torque_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"equipment_id" integer,
	"robot_code" varchar(50) NOT NULL,
	"station_code" varchar(50),
	"target_torque_nm" numeric(8, 2),
	"actual_torque_nm" numeric(8, 2) NOT NULL,
	"torque_upper_limit_nm" numeric(8, 2) DEFAULT '15.00',
	"torque_lower_limit_nm" numeric(8, 2),
	"oil_type" varchar(100),
	"application_point" varchar(200),
	"oil_volume_ml" numeric(8, 2),
	"is_over_torque" boolean DEFAULT false,
	"is_under_torque" boolean DEFAULT false,
	"verdict" varchar(20) DEFAULT 'PENDING',
	"alert_triggered" boolean DEFAULT false,
	"alert_message" text,
	"operator_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_cleaning_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"process_trial_id" integer,
	"equipment_id" integer,
	"robot_code" varchar(50) NOT NULL,
	"station_code" varchar(50),
	"pressure_bar" numeric(6, 2),
	"nozzle_angle_deg" numeric(6, 2),
	"flow_rate_lpm" numeric(6, 2),
	"temperature_c" numeric(6, 2),
	"distance_mm" numeric(8, 2),
	"spray_duration_s" numeric(8, 2),
	"cleanliness_before_mg" numeric(10, 4),
	"cleanliness_after_mg" numeric(10, 4),
	"max_particle_size_um" numeric(10, 2),
	"cleanliness_verdict" varchar(20) DEFAULT 'PENDING',
	"is_adaptive" boolean DEFAULT false,
	"adaptive_adjustment_json" jsonb,
	"cycle_start_at" timestamp,
	"cycle_end_at" timestamp,
	"cycle_time_seconds" numeric(10, 2),
	"has_alert" boolean DEFAULT false,
	"alert_type" varchar(50),
	"alert_message" text,
	"operator_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tech_performance_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"user_id" integer,
	"robot_cleaning_action_id" integer,
	"oiling_torque_record_id" integer,
	"process_instance_id" integer,
	"entry_type" varchar(30) NOT NULL,
	"cycle_time_seconds" numeric(10, 2),
	"standard_cycle_time_seconds" numeric(10, 2),
	"cycle_efficiency" numeric(6, 4),
	"quality_pass" boolean DEFAULT true,
	"cleanliness_score" numeric(6, 2),
	"labor_minutes" numeric(8, 2),
	"machine_minutes" numeric(8, 2),
	"performance_points" numeric(8, 2),
	"work_date" date,
	"shift_code" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debug_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"command_type" varchar(30) NOT NULL,
	"payload" json NOT NULL,
	"result" varchar(30) DEFAULT 'pending',
	"response_data" json,
	"duration_ms" integer,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "debug_parameter_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"snapshot_label" varchar(100),
	"j1_deg" numeric(8, 3),
	"j2_deg" numeric(8, 3),
	"j3_deg" numeric(8, 3),
	"j4_deg" numeric(8, 3),
	"j5_deg" numeric(8, 3),
	"j6_deg" numeric(8, 3),
	"tcp_x" numeric(10, 3),
	"tcp_y" numeric(10, 3),
	"tcp_z" numeric(10, 3),
	"tcp_rx" numeric(8, 3),
	"tcp_ry" numeric(8, 3),
	"tcp_rz" numeric(8, 3),
	"speed_pct" numeric(5, 2),
	"acceleration_pct" numeric(5, 2),
	"override_pct" numeric(5, 2),
	"payload_kg" numeric(8, 2),
	"motor_temps_c" json,
	"collision_envelope_json" json,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"captured_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "debug_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_id" integer NOT NULL,
	"project_id" integer,
	"stage_code" varchar(10),
	"session_name" varchar(200) NOT NULL,
	"session_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'created',
	"started_at" timestamp,
	"completed_at" timestamp,
	"operator_id" integer,
	"operator_name" varchar(100),
	"notes" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_condition_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_id" integer NOT NULL,
	"alert_type" "robot_alert_type_enum" NOT NULL,
	"severity" "robot_alert_severity_enum" NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"joint_index" integer,
	"measured_value" numeric(10, 3),
	"threshold_value" numeric(10, 3),
	"unit" varchar(20),
	"acknowledged_at" timestamp,
	"acknowledged_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_connection_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_id" integer NOT NULL,
	"event_type" "connection_event_enum" NOT NULL,
	"success" boolean DEFAULT true,
	"latency_ms" integer,
	"error_code" varchar(50),
	"error_message" text,
	"protocol_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_dt_state_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_id" integer NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"j1_deg" numeric(8, 3),
	"j2_deg" numeric(8, 3),
	"j3_deg" numeric(8, 3),
	"j4_deg" numeric(8, 3),
	"j5_deg" numeric(8, 3),
	"j6_deg" numeric(8, 3),
	"tcp_x" numeric(10, 3),
	"tcp_y" numeric(10, 3),
	"tcp_z" numeric(10, 3),
	"tcp_rx" numeric(8, 3),
	"tcp_ry" numeric(8, 3),
	"tcp_rz" numeric(8, 3),
	"payload_kg" numeric(8, 2),
	"speed_pct" numeric(5, 2),
	"override_pct" numeric(5, 2),
	"motor_temps_c" jsonb,
	"operating_mode" varchar(20),
	"program_name" varchar(100),
	"program_line" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_fleet_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_code" varchar(50) NOT NULL,
	"brand" "robot_brand_enum" NOT NULL,
	"model" varchar(100) NOT NULL,
	"serial_number" varchar(100),
	"controller_type" varchar(50),
	"firmware_version" varchar(50),
	"protocol_type" "robot_protocol_enum" NOT NULL,
	"gateway_host" varchar(255),
	"gateway_port" integer,
	"gateway_auth_token" varchar(500),
	"status" "robot_status_enum" DEFAULT 'offline' NOT NULL,
	"last_heartbeat_at" timestamp,
	"max_payload_kg" numeric(8, 2),
	"reach_mm" numeric(8, 1),
	"repeatability_mm" numeric(6, 3),
	"axis_count" integer DEFAULT 6,
	"location" varchar(200),
	"cell_id" varchar(50),
	"assigned_process" "robot_process_enum",
	"dt_asset_id" integer,
	"iot_equipment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(100),
	CONSTRAINT "robot_fleet_registry_robot_code_unique" UNIQUE("robot_code")
);
--> statement-breakpoint
CREATE TABLE "robot_protocol_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"robot_id" integer NOT NULL,
	"protocol_name" varchar(50) NOT NULL,
	"gateway_url" varchar(500) NOT NULL,
	"gateway_port" integer NOT NULL,
	"auth_method" "robot_auth_method_enum" DEFAULT 'none' NOT NULL,
	"auth_credential" varchar(500),
	"connection_timeout_ms" integer DEFAULT 5000,
	"command_timeout_ms" integer DEFAULT 3000,
	"max_retries" integer DEFAULT 3,
	"heartbeat_interval_ms" integer DEFAULT 1000,
	"telemetry_interval_ms" integer DEFAULT 100,
	"custom_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"program_name" varchar(200) NOT NULL,
	"program_type" "equipment_program_type_enum" DEFAULT 'robot_motion' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"version_string" varchar(20) DEFAULT 'V1.0' NOT NULL,
	"previous_version_id" integer,
	"status" "equipment_program_status_enum" DEFAULT 'draft' NOT NULL,
	"program_content" text,
	"storage_url" varchar(500),
	"parameters" jsonb,
	"revision_reason" text,
	"approved_by" varchar(100),
	"approved_at" timestamp,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"trigger_type" "execution_trigger_type_enum" DEFAULT 'manual' NOT NULL,
	"result" "program_execution_result_enum" DEFAULT 'running' NOT NULL,
	"duration_ms" integer,
	"telemetry_at_start" jsonb,
	"telemetry_at_end" jsonb,
	"metrics" jsonb,
	"error_code" varchar(50),
	"error_message" text,
	"executed_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_stage_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"stage_code" varchar(10) NOT NULL,
	"role" "stage_assignment_role_enum" DEFAULT 'primary' NOT NULL,
	"status" "stage_assignment_status_enum" DEFAULT 'planned' NOT NULL,
	"assigned_by" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_commissioning_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"check_item" varchar(300) NOT NULL,
	"category" varchar(100) NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"measured_value" varchar(100),
	"target_value" varchar(100),
	"unit" varchar(30),
	"execution_log_id" integer,
	"completed_by" varchar(100),
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_annual_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"year" integer NOT NULL,
	"cleaning_capex" numeric(15, 2) DEFAULT '0',
	"vision_capex" numeric(15, 2) DEFAULT '0',
	"zld_capex" numeric(15, 2) DEFAULT '0',
	"total_capex" numeric(15, 2) DEFAULT '0',
	"deadline_status" "sc_budget_deadline_status" DEFAULT 'pending' NOT NULL,
	"deadline_date" timestamp,
	"recorded_by" integer,
	"bu_code" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_annual_budgets_client_year_uniq" UNIQUE("client_id","year")
);
--> statement-breakpoint
CREATE TABLE "project_bidding_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"opportunity_id" integer,
	"project_background" text,
	"communication_plan" text,
	"bidding_strategy" text,
	"competitor_analysis" json,
	"confidence_level" integer DEFAULT 3 NOT NULL,
	"stage" varchar(10) DEFAULT 'M0' NOT NULL,
	"status" "sc_bidding_strategy_status" DEFAULT 'draft' NOT NULL,
	"created_by" integer,
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_bidding_strategies_project_uniq" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "release_gates" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"gate_type" "release_gate_type" NOT NULL,
	"gate_order" integer NOT NULL,
	"status" "release_gate_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" integer,
	"review_comment" text,
	"red_team_report" json,
	"checklist" json,
	"passed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_change_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"run_id" integer,
	"task_type" "change_task_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"file_path" varchar(500),
	"change_detail" json,
	"status" "change_task_status" DEFAULT 'draft' NOT NULL,
	"priority" "sandbox_priority" DEFAULT 'P2' NOT NULL,
	"assignee_id" integer,
	"project_task_id" integer,
	"rollback_instructions" text,
	"verification_steps" json,
	"estimated_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_knowledge_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"knowledge_asset_id" integer NOT NULL,
	"relevance_score" integer DEFAULT 50,
	"usage_context" varchar(100),
	"added_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"run_type" "sandbox_run_type" NOT NULL,
	"ai_provider" varchar(30) NOT NULL,
	"ai_model" varchar(100),
	"system_prompt" text,
	"user_input" text,
	"ai_output" json,
	"status" "sandbox_run_status" DEFAULT 'pending' NOT NULL,
	"duration_ms" integer,
	"token_usage" json,
	"error_message" text,
	"triggered_by_id" integer,
	"parent_run_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"business_goal" text,
	"affected_pages" json,
	"reference_projects" json,
	"status" "sandbox_scenario_status" DEFAULT 'draft' NOT NULL,
	"priority" "sandbox_priority" DEFAULT 'P2' NOT NULL,
	"created_by_id" integer,
	"tags" json,
	"bu_code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"sandbox_id" varchar(50),
	"ai_provider" varchar(30) NOT NULL,
	"ai_model" varchar(100),
	"system_prompt" text,
	"status" "agent_status_enum" DEFAULT 'standby' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"last_invoked_at" timestamp,
	"total_invocations" integer DEFAULT 0 NOT NULL,
	"total_tokens_used" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_registry_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "sandbox_event_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"source_module" varchar(50) NOT NULL,
	"target_modules" jsonb DEFAULT '[]'::jsonb,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"user_id" integer,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"status" "ai_task_status" DEFAULT 'pending' NOT NULL,
	"input_data" json,
	"result_data" json,
	"error_message" varchar(500),
	"created_by" varchar(50),
	"submitted_by_id" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"timeout_at" timestamp,
	"worker_lock_id" varchar(50),
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_triggered_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"type" "automationTriggerTypeEnum" NOT NULL,
	"status" "automationMeetingStatusEnum" DEFAULT 'UPCOMING' NOT NULL,
	"description" text,
	"scheduled_start" timestamp NOT NULL,
	"trigger_source" varchar(300),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bu_sales_plan_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_sales_plan_id" integer NOT NULL,
	"applicant_id" varchar(50),
	"adjustment_reason" varchar(500),
	"adjustment_type" varchar(30) DEFAULT 'normal',
	"exception_tag" varchar(50),
	"original_data" json,
	"proposed_data" json,
	"approval_status" varchar(20) DEFAULT 'pending',
	"approved_by" varchar(50),
	"review_step" varchar(20) DEFAULT 'finance_pmo',
	"finance_pmo_status" varchar(20),
	"finance_pmo_reviewed_by" varchar(50),
	"finance_pmo_reviewed_at" timestamp,
	"finance_pmo_comment" varchar(500),
	"ceo_status" varchar(20),
	"ceo_reviewed_by" varchar(50),
	"ceo_reviewed_at" timestamp,
	"ceo_comment" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bu_sales_plan_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"bu_sales_plan_id" integer NOT NULL,
	"period_type" varchar(20),
	"period_value" integer,
	"sales_target" numeric(12, 2),
	"output_target" numeric(12, 2),
	"kpi_target" numeric(5, 2),
	"capability_level" numeric(4, 2),
	"is_adjusted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "bu_sales_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"department_id" varchar(50) NOT NULL,
	"total_sales_target" numeric(12, 2),
	"total_output_target" numeric(12, 2),
	"growth_rules" json,
	"status" varchar(20) DEFAULT 'draft',
	"submitted_by" varchar(50),
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_plan_inbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_user_id" integer NOT NULL,
	"assigned_by_user_id" integer,
	"assigned_by_name" varchar(100),
	"category" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"priority" varchar(10) DEFAULT 'P2',
	"source_reference" varchar(200),
	"due_date" varchar(20),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_installations" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"installation_code" varchar(50) NOT NULL,
	"lead_engineer_id" integer,
	"lead_engineer_name" varchar(100),
	"team_members" text,
	"checklist" text,
	"checklist_completed_count" integer DEFAULT 0,
	"checklist_total_count" integer DEFAULT 0,
	"issues" text,
	"open_issue_count" integer DEFAULT 0,
	"critical_issue_count" integer DEFAULT 0,
	"commissioning_result" varchar(30),
	"commissioning_notes" text,
	"commissioning_date" timestamp,
	"training_completed" boolean DEFAULT false,
	"training_topics" text,
	"training_signoff" text,
	"customer_signoff_name" varchar(100),
	"customer_signoff_date" timestamp,
	"customer_signoff_notes" text,
	"customer_signoff_file" text,
	"start_date" timestamp,
	"target_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"status" varchar(30) DEFAULT 'pending',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_installations_installation_code_unique" UNIQUE("installation_code")
);
--> statement-breakpoint
CREATE TABLE "delivery_sat_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"sat_code" varchar(50) NOT NULL,
	"test_report_items" text,
	"test_pass_count" integer DEFAULT 0,
	"test_fail_count" integer DEFAULT 0,
	"test_total_count" integer DEFAULT 0,
	"overall_test_result" varchar(30),
	"punch_list_items" text,
	"punch_list_open_count" integer DEFAULT 0,
	"punch_list_total_count" integer DEFAULT 0,
	"cycle_time_result" numeric(10, 2),
	"cycle_time_target" numeric(10, 2),
	"cycle_time_pass" boolean,
	"uptime_hours" numeric(10, 2),
	"uptime_target" numeric(10, 2),
	"uptime_pass" boolean,
	"quality_yield_result" numeric(5, 2),
	"quality_yield_target" numeric(5, 2),
	"quality_yield_pass" boolean,
	"approval_status" varchar(30) DEFAULT 'pending',
	"approved_by" integer,
	"approved_by_name" varchar(100),
	"approved_at" timestamp,
	"approval_notes" text,
	"conditional_items" text,
	"customer_final_signoff_name" varchar(100),
	"customer_final_signoff_date" timestamp,
	"customer_final_signoff_file" text,
	"warranty_start_date" timestamp,
	"warranty_end_date" timestamp,
	"status" varchar(30) DEFAULT 'pending',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_sat_records_sat_code_unique" UNIQUE("sat_code")
);
--> statement-breakpoint
CREATE TABLE "delivery_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"shipment_code" varchar(50) NOT NULL,
	"packing_list_items" text,
	"total_boxes" integer DEFAULT 0,
	"total_weight" numeric(10, 2),
	"total_volume" numeric(10, 2),
	"packing_list_approved_by" integer,
	"packing_list_approved_at" timestamp,
	"carrier" varchar(200),
	"carrier_contact" varchar(100),
	"carrier_phone" varchar(30),
	"transport_mode" varchar(30) DEFAULT 'truck',
	"tracking_number" varchar(100),
	"vehicle_plate" varchar(30),
	"shipped_at" timestamp,
	"estimated_arrival" timestamp,
	"actual_arrival" timestamp,
	"received_by" integer,
	"received_by_name" varchar(100),
	"received_at" timestamp,
	"receiving_notes" text,
	"damage_report" text,
	"receiving_result" varchar(30),
	"status" varchar(30) DEFAULT 'preparing',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_shipments_shipment_code_unique" UNIQUE("shipment_code")
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_form_data_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_app_id" varchar(64) NOT NULL,
	"jdy_form_id" varchar(64) NOT NULL,
	"jdy_record_id" varchar(64) NOT NULL,
	"record_data" json NOT NULL,
	"ext_creator" varchar(100),
	"ext_created_at" varchar(50),
	"ext_updated_at" varchar(50),
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uk_form_data_cache_record" UNIQUE("jdy_app_id","jdy_form_id","jdy_record_id")
);
--> statement-breakpoint
CREATE TABLE "iot_fleet_machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" varchar(50) NOT NULL,
	"plant_name" varchar(200),
	"line_name" varchar(200),
	"country" varchar(50),
	"machine_type" varchar(100),
	"status" varchar(30) DEFAULT 'offline',
	"last_heartbeat" timestamp,
	"customer_id" integer,
	"customer_name" varchar(200),
	"install_date" timestamp,
	"warranty_expiry" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iot_predictive_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" varchar(50) NOT NULL,
	"alert_type" varchar(50),
	"severity" varchar(20),
	"current_value" real,
	"threshold_value" real,
	"predicted_failure_days" integer,
	"recommended_part_code" varchar(50),
	"recommended_part_name" varchar(200),
	"estimated_part_price" real,
	"quote_generated" boolean DEFAULT false,
	"quote_generated_at" timestamp,
	"status" varchar(30) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_delete_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"project_code" varchar(32),
	"project_name" varchar(200),
	"reason" text NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_by_name" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_by_name" varchar(100),
	"approval_note" text,
	"is_within_grace_period" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "compliance_commitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(200),
	"period" varchar(7) NOT NULL,
	"is_agreed" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp,
	"signed_from_ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" varchar(200),
	"action_type" "audit_action_type" NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(200),
	"resource_name" varchar(500),
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"metadata" json,
	"risk_level" varchar(20) DEFAULT 'low',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whistleblower_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"encrypted_content" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"reporter_id" integer,
	"target_name" varchar(200),
	"status" "report_status" DEFAULT 'PENDING' NOT NULL,
	"investigation_notes" text,
	"handled_by" varchar(200),
	"handled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_global_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_key" varchar(100) NOT NULL,
	"control_value" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json,
	CONSTRAINT "sys_global_controls_control_key_unique" UNIQUE("control_key")
);
--> statement-breakpoint
CREATE TABLE "cleaning_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_code" varchar(50) NOT NULL,
	"part_type" varchar(100) NOT NULL,
	"part_material" varchar(100),
	"feature_type" varchar(50),
	"pressure_bar" numeric(6, 2),
	"nozzle_angle_deg" numeric(6, 2),
	"flow_rate_lpm" numeric(6, 2),
	"temperature_c" numeric(6, 2),
	"distance_mm" numeric(8, 2),
	"spray_duration_s" numeric(8, 2),
	"media_type" varchar(50),
	"semi_compliant" boolean DEFAULT false,
	"iso14644_class" integer,
	"tsmc_qualified" boolean DEFAULT false,
	"cleanliness_target_mg" numeric(10, 4),
	"max_particle_size_um" numeric(10, 2),
	"validated_by" varchar(200),
	"validated_at" timestamp,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cleaning_recipes_recipe_code_unique" UNIQUE("recipe_code")
);
--> statement-breakpoint
CREATE TABLE "cleanroom_environment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"cleanroom_id" varchar(50) NOT NULL,
	"cleanroom_name" varchar(200),
	"iso_class" integer,
	"temperature_c" numeric(6, 2),
	"humidity_pct" numeric(5, 2),
	"pressure_diff_pa" numeric(8, 2),
	"particle_count_05um" integer,
	"particle_count_10um" integer,
	"particle_count_50um" integer,
	"di_water_resistivity_mohm" numeric(8, 4),
	"di_water_toc_ppb" numeric(8, 4),
	"verdict" varchar(10) DEFAULT 'PENDING' NOT NULL,
	"violation_details" jsonb,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"measured_by" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iso14644_cleanroom_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_class" integer NOT NULL,
	"max_particles_01um" integer,
	"max_particles_02um" integer,
	"max_particles_03um" integer,
	"max_particles_05um" integer,
	"max_particles_10um" integer,
	"max_particles_50um" integer,
	"description" text,
	"typical_applications" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iso14644_cleanroom_classes_iso_class_unique" UNIQUE("iso_class")
);
--> statement-breakpoint
CREATE TABLE "semi_process_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"standard_code" varchar(30) NOT NULL,
	"standard_name" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"parameter_name" varchar(100) NOT NULL,
	"unit" varchar(30),
	"min_value" numeric(15, 6),
	"max_value" numeric(15, 6),
	"target_value" numeric(15, 6),
	"applicable_processes" jsonb,
	"tsmc_requirement" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_export_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requesterId" integer NOT NULL,
	"requesterName" varchar(100) NOT NULL,
	"tableName" varchar(100) NOT NULL,
	"fieldNames" text NOT NULL,
	"filterConditions" text,
	"purpose" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectedReason" text,
	"downloadToken" varchar(100),
	"downloadCount" integer DEFAULT 0,
	"maxDownloads" integer DEFAULT 1,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensitive_field_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tableName" varchar(100) NOT NULL,
	"fieldName" varchar(100) NOT NULL,
	"sensitivityLevel" integer NOT NULL,
	"requiredLevel" integer DEFAULT 2 NOT NULL,
	"watermarkOnView" boolean DEFAULT false,
	"requireApprovalForExport" boolean DEFAULT true,
	"maskingRule" varchar(50) DEFAULT 'stars',
	"description" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomaly_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_name" varchar(200) NOT NULL,
	"pattern_name_en" varchar(200) DEFAULT '',
	"description" text DEFAULT '',
	"conditions" json DEFAULT '[]'::json,
	"severity" "anomaly_severity" DEFAULT 'warning' NOT NULL,
	"action_type" "anomaly_action_type" DEFAULT 'alert' NOT NULL,
	"is_active" boolean DEFAULT true,
	"trigger_count" integer DEFAULT 0,
	"last_triggered_at" timestamp,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fused_equipment_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"equipment_name" varchar(200),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metrics" json DEFAULT '{}'::json,
	"anomaly_score" real DEFAULT 0,
	"anomaly_type" varchar(100),
	"source_robot_cleaning_id" integer,
	"source_oee_snapshot_id" integer,
	"source_telemetry_ids" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_dashboard_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(30) NOT NULL,
	"region" varchar(30),
	"key" varchar(50) NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"label" varchar(100) NOT NULL,
	"unit" varchar(20),
	"source" varchar(20) DEFAULT 'manual' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_dashboard_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" varchar(30) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(50),
	"country" varchar(10) NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"client_name" varchar(200),
	"equipment_type" varchar(200),
	"engineer_count" integer DEFAULT 0,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_health_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" varchar(50),
	"equipment_id" integer,
	"equipment_code" varchar(50) NOT NULL,
	"equipment_name" varchar(200) NOT NULL,
	"project_number" varchar(100),
	"health_score" integer NOT NULL,
	"health_status" varchar(20) DEFAULT 'normal',
	"last_test_date" timestamp,
	"test_results" jsonb DEFAULT '{}'::jsonb,
	"operating_hours" integer,
	"maintenance_prediction" jsonb DEFAULT '{}'::jsonb,
	"snapshot_date" timestamp DEFAULT now() NOT NULL,
	"is_latest" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_content_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"language" varchar(10) DEFAULT 'zh',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"industry_scope" jsonb DEFAULT '[]'::jsonb,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"expiry_date" timestamp,
	"watermark_level" varchar(20) DEFAULT 'none',
	"template_id" integer,
	"sort_order" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_loyalty_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_code" varchar(50) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"contact_name" varchar(100),
	"contact_email" varchar(200),
	"contact_phone" varchar(50),
	"company_name" varchar(200),
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"tier_points" integer DEFAULT 0 NOT NULL,
	"available_points" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"tech_contribution_count" integer DEFAULT 0 NOT NULL,
	"community_post_count" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"customer_code" varchar(50) NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" varchar(100),
	"description" varchar(300),
	"expires_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_account_id" integer NOT NULL,
	"referrer_code" varchar(50) NOT NULL,
	"referred_company" varchar(200) NOT NULL,
	"referred_contact" varchar(100),
	"referred_email" varchar(200),
	"referred_phone" varchar(50),
	"referred_industry" varchar(100),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"qualified_at" timestamp,
	"converted_at" timestamp,
	"signup_points" integer DEFAULT 0,
	"conversion_points" integer DEFAULT 0,
	"conversion_bonus_awarded" boolean DEFAULT false,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_rewards_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"reward_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description" text,
	"category" varchar(50) NOT NULL,
	"image_url" text,
	"points_cost" integer NOT NULL,
	"min_tier" varchar(20) DEFAULT 'bronze',
	"stock_quantity" integer,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"token_id" integer,
	"guest_name" varchar(100),
	"guest_email" varchar(200),
	"guest_phone" varchar(50),
	"company_name" varchar(200),
	"issue_type" varchar(50) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"description" text,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"ai_suggestion" text,
	"ai_confidence" integer,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"assigned_to" integer,
	"assigned_to_name" varchar(100),
	"resolution" text,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "showcase_visitor_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer,
	"session_id" varchar(64),
	"event_type" varchar(30) NOT NULL,
	"event_target" varchar(200),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"device_type" varchar(20),
	"referrer" varchar(500),
	"funnel_stage" varchar(30),
	"lead_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"showcase_id" integer NOT NULL,
	"target_client" varchar(200) NOT NULL,
	"contact_person" varchar(200),
	"contact_email" varchar(200),
	"welcome_message" text,
	"access_token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"max_views" integer DEFAULT 100,
	"view_count" integer DEFAULT 0 NOT NULL,
	"first_viewed_at" timestamp,
	"last_viewed_at" timestamp,
	"recipient_role" varchar(50),
	"access_level" varchar(20) DEFAULT 'standard',
	"personalized_config" jsonb DEFAULT '{}'::jsonb,
	"last_device_type" varchar(30),
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_type" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" text,
	"description" text,
	"equipment_images" jsonb DEFAULT '[]'::jsonb,
	"operation_videos" jsonb DEFAULT '[]'::jsonb,
	"hero_video_url" text,
	"takt_time_seconds" numeric(10, 2),
	"cleaning_efficiency" varchar(100),
	"cleanliness_standard" varchar(200),
	"throughput_per_hour" integer,
	"power_consumption_kw" numeric(8, 2),
	"price_range_min" numeric(14, 2),
	"price_range_max" numeric(14, 2),
	"price_currency" varchar(10) DEFAULT 'EUR',
	"roi_months" integer,
	"configurations" jsonb DEFAULT '[]'::jsonb,
	"technical_specs" jsonb DEFAULT '{}'::jsonb,
	"scenario_type" varchar(50) DEFAULT 'product',
	"target_industry" varchar(100),
	"target_year" integer,
	"content_version" integer DEFAULT 1,
	"vip_config" jsonb DEFAULT '{}'::jsonb,
	"content_tags" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_assessment_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"question_order" integer NOT NULL,
	"answer" text,
	"selected_options" json,
	"is_correct" boolean,
	"points_earned" integer,
	"max_points" integer NOT NULL,
	"manual_score" integer,
	"manual_feedback" text,
	"graded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "answer_session_question_uniq" UNIQUE("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "skill_assessment_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"title_en" varchar(300),
	"position_key" varchar(80) NOT NULL,
	"target_level" "skill_level_grade" NOT NULL,
	"total_points" integer NOT NULL,
	"pass_score" integer NOT NULL,
	"time_limit_minutes" integer DEFAULT 60 NOT NULL,
	"question_composition" json NOT NULL,
	"domain_weights" json,
	"version" integer DEFAULT 1 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_assessment_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"paper_id" integer NOT NULL,
	"position_key" varchar(80) NOT NULL,
	"target_level" "skill_level_grade" NOT NULL,
	"status" "skill_session_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"total_points" integer,
	"earned_points" integer,
	"manual_points" integer,
	"final_score" numeric(5, 2),
	"passed" boolean,
	"domain_scores" json,
	"graded_by" integer,
	"graded_at" timestamp,
	"grader_notes" text,
	"points_awarded" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_level_certs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"position_key" varchar(80) NOT NULL,
	"level" "skill_level_grade" NOT NULL,
	"session_id" integer,
	"score" numeric(5, 2),
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"status" "skill_cert_status" DEFAULT 'active' NOT NULL,
	"superseded_by" integer,
	"revoked_reason" text,
	"cert_number" varchar(50),
	"approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_position_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_key" varchar(80) NOT NULL,
	"position_name" varchar(200) NOT NULL,
	"position_name_en" varchar(200),
	"department" varchar(100),
	"description" text,
	"skill_domains" json NOT NULL,
	"pass_thresholds" json DEFAULT '{"L1":60,"L2":70,"L3":80,"L4":85,"L5":90}'::json NOT NULL,
	"time_limit_minutes" json DEFAULT '{"L1":45,"L2":60,"L3":90,"L4":90,"L5":120}'::json,
	"question_count" json DEFAULT '{"L1":20,"L2":30,"L3":40,"L4":40,"L5":50}'::json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_position_profiles_position_key_unique" UNIQUE("position_key")
);
--> statement-breakpoint
CREATE TABLE "skill_question_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_key" varchar(80) NOT NULL,
	"domain_key" varchar(80) NOT NULL,
	"question_type" "skill_question_type" NOT NULL,
	"difficulty" "skill_question_difficulty" NOT NULL,
	"target_levels" json NOT NULL,
	"content" text NOT NULL,
	"options" json,
	"correct_answer" text,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"is_manual_entry" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_by_name" varchar(100),
	"tags" json,
	"reference" varchar(300),
	"usage_count" integer DEFAULT 0 NOT NULL,
	"correct_rate" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_interaction_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"meeting_id" integer,
	"feedback_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"severity" varchar(10) DEFAULT 'medium' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar(50),
	"proposal_id" integer,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_ai_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"month" varchar(7) NOT NULL,
	"breadth_score" integer DEFAULT 0,
	"depth_score" integer DEFAULT 0,
	"execution_score" integer DEFAULT 0,
	"discipline_score" integer DEFAULT 0,
	"meeting_score" integer DEFAULT 0,
	"total_score" integer DEFAULT 0,
	"ai_evaluation_summary" text,
	"meetings_attended" integer DEFAULT 0,
	"meetings_total" integer DEFAULT 0,
	"action_items_completed" integer DEFAULT 0,
	"action_items_total" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"penalty_level" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"deducted_kpi_points" integer DEFAULT 0,
	"meeting_id" integer,
	"meeting_title" varchar(500),
	"makeup_task_created" boolean DEFAULT false,
	"notification_sent" boolean DEFAULT false,
	"notification_channel" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"assigned_to" integer NOT NULL,
	"assigned_to_name" varchar(100),
	"task_desc" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"status" varchar(30) DEFAULT 'ABSENT' NOT NULL,
	"check_in_time" timestamp,
	"leave_time" timestamp,
	"leave_reason" text,
	"check_in_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100),
	"personal_notes" text,
	"ai_quiz_score" integer,
	"ai_quiz_answers" json,
	"takeaway_reflection" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_review_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"speaker_id" integer NOT NULL,
	"speaker_name" varchar(100),
	"evaluator_id" integer NOT NULL,
	"evaluator_name" varchar(100),
	"dimension" varchar(30) NOT NULL,
	"score" integer,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_speakers" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"speaker_label" varchar(100) NOT NULL,
	"matched_profile_id" integer,
	"matched_profile_type" varchar(20),
	"matched_profile_name" varchar(200),
	"voice_snippet_url" varchar(500),
	"match_confidence" varchar(10),
	"first_spoken_at" timestamp,
	"speaking_duration_sec" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"type" varchar(20) DEFAULT 'MINOR' NOT NULL,
	"status" varchar(20) DEFAULT 'UPCOMING' NOT NULL,
	"description" text,
	"transcript" text,
	"ai_summary" json,
	"project_id" integer,
	"t_project_id" integer,
	"department_id" integer,
	"stage_code" varchar(10),
	"meeting_category" varchar(30) DEFAULT 'OTHER',
	"direction" varchar(10) DEFAULT 'INTERNAL',
	"organizer_name" varchar(100),
	"organizer_id" integer,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"expected_attendees" integer DEFAULT 0,
	"teams_url" varchar(1000),
	"ai_quiz_questions" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "t_project_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"t_project_id" integer NOT NULL,
	"meeting_id" integer,
	"evidence_type" varchar(30) NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"recorded_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "t_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"t_number" varchar(20) NOT NULL,
	"display_name" varchar(300) NOT NULL,
	"customer_id" integer,
	"customer_name" varchar(200),
	"status" varchar(30) DEFAULT 'INQUIRY' NOT NULL,
	"converted_project_id" integer,
	"grt_number" varchar(20),
	"converted_at" timestamp,
	"converted_by" varchar(100),
	"description" text,
	"ai_comm_analysis" json,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"scheduled_days" integer NOT NULL,
	"actual_days" numeric(5, 1) NOT NULL,
	"late_days" integer DEFAULT 0 NOT NULL,
	"early_leave_days" integer DEFAULT 0 NOT NULL,
	"absent_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"annual_leave_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"sick_leave_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"personal_leave_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"other_leave_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"personal_leave_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"sick_leave_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"annual_leave_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"compensatory_leave_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"late_count" integer DEFAULT 0 NOT NULL,
	"missing_clock_count" integer DEFAULT 0 NOT NULL,
	"weekday_overtime_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"weekend_overtime_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"holiday_overtime_hours" numeric(6, 1) DEFAULT '0' NOT NULL,
	"attendance_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"overtime_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"unauthorized_excursions" integer DEFAULT 0 NOT NULL,
	"data_source" varchar(50) DEFAULT 'manual',
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_access_control" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_grt_id" varchar(20) NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"access_level" varchar(20) DEFAULT 'full' NOT NULL,
	"can_view_all" boolean DEFAULT false NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL,
	"can_override_perf" boolean DEFAULT false NOT NULL,
	"can_export" boolean DEFAULT false NOT NULL,
	"granted_by_id" integer,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "payroll_approval_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ledger_id" integer NOT NULL,
	"from_status" "payroll_status_enum" NOT NULL,
	"to_status" "payroll_status_enum" NOT NULL,
	"operator_id" integer NOT NULL,
	"operator_name" varchar(100),
	"operator_role" varchar(50),
	"reason" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_excellence_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"award_type" "award_type_enum" NOT NULL,
	"award_amount" numeric(14, 2) NOT NULL,
	"reason" text NOT NULL,
	"nominated_by_id" integer,
	"approved_by_id" integer,
	"department" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_ledgers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ledger_code" varchar(30) NOT NULL,
	"employee_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"base_salary" numeric(14, 2) NOT NULL,
	"total_allowances" numeric(14, 2) NOT NULL,
	"overtime_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"performance_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage1" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage1_override" numeric(14, 2),
	"perf_wage1_reason" text,
	"perf_wage2" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage2_override" numeric(14, 2),
	"perf_wage2_reason" text,
	"perf_wage3" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage3_override" numeric(14, 2),
	"perf_wage3_reason" text,
	"override_approved_by_id" integer,
	"override_approved_at" timestamp,
	"ledger_position_wage" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_skill_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_saturday_shift_premium" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_comprehensive_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_cash_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_travel_car_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perfect_attendance_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"personal_leave_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sick_leave_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reconciliation_adjustment" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ledger_special_tax_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"kpi_bonus_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"special_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"project_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(14, 2) NOT NULL,
	"attendance_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"pension_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"medical_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"unemployment_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing_fund_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_social_insurance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"taxable_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cumulative_taxable_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cumulative_tax_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"income_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_bracket" integer DEFAULT 1,
	"total_deductions" numeric(14, 2) NOT NULL,
	"net_pay" numeric(14, 2) NOT NULL,
	"status" "payroll_status_enum" DEFAULT 'DRAFT' NOT NULL,
	"submitted_by_id" integer,
	"submitted_at" timestamp,
	"hr_verified_by_id" integer,
	"hr_verified_at" timestamp,
	"finance_approved_by_id" integer,
	"finance_approved_at" timestamp,
	"ceo_approved_by_id" integer,
	"ceo_approved_at" timestamp,
	"paid_at" timestamp,
	"rejected_by_id" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"calculation_details" json,
	"ai_task_id" integer,
	"department" varchar(100),
	"bu_code" varchar(20),
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perf_wage_override_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"ledger_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"wage_slot" varchar(10) NOT NULL,
	"calculated_value" numeric(14, 2) NOT NULL,
	"override_value" numeric(14, 2) NOT NULL,
	"reason" text NOT NULL,
	"operator_id" integer NOT NULL,
	"operator_name" varchar(100),
	"approved_by_id" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"mbo_score" numeric(5, 2) NOT NULL,
	"evaluation_grade" "evaluation_grade_enum" NOT NULL,
	"department_coefficient" numeric(5, 4) DEFAULT '1.0000' NOT NULL,
	"individual_coefficient" numeric(5, 4) DEFAULT '1.0000' NOT NULL,
	"performance_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"special_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"project_bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"business_data_snapshot" json,
	"evaluator_id" integer,
	"department" varchar(100),
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"effective_from" varchar(10) NOT NULL,
	"effective_to" varchar(10),
	"base_salary" numeric(14, 2) NOT NULL,
	"position_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"confidentiality_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"technical_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"seniority_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"meal_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"transport_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"communication_allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"social_insurance_base" numeric(14, 2) NOT NULL,
	"housing_fund_base" numeric(14, 2) NOT NULL,
	"housing_fund_rate" numeric(5, 4) DEFAULT '0.1200' NOT NULL,
	"performance_base" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage1_base" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage2_base" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perf_wage3_base" numeric(14, 2) DEFAULT '0' NOT NULL,
	"position_wage" numeric(14, 2) DEFAULT '0' NOT NULL,
	"skill_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"saturday_shift_premium" numeric(14, 2) DEFAULT '0' NOT NULL,
	"comprehensive_salary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cash_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"travel_car_subsidy" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_lump_sum" boolean DEFAULT false NOT NULL,
	"special_tax_deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"social_insurance_actual" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing_fund_actual" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perfect_attendance_eligible" boolean DEFAULT false NOT NULL,
	"perfect_attendance_amount" numeric(14, 2) DEFAULT '300.00' NOT NULL,
	"position_grade" varchar(20),
	"department" varchar(100),
	"bu_code" varchar(20),
	"remarks" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_bom_work_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"bom_step_id" integer,
	"assembly_description" text,
	"bom_item_ids" json,
	"base_theory_minutes" integer,
	"difficulty_factor" numeric(3, 1) DEFAULT '1.0',
	"adjusted_minutes" integer,
	"adjust_reason" text,
	"adjusted_by" integer,
	"adjusted_at" timestamp,
	"predecessor_step_ids" json,
	"tools_required" json,
	"equipment_required" varchar(200),
	"skill_level_required" varchar(10),
	"worker_count" integer DEFAULT 1,
	"material_ready" boolean DEFAULT false,
	"material_earliest_available" date,
	"sort_order" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_historical_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"product_category" varchar(100) NOT NULL,
	"avg_hours" numeric(10, 2),
	"min_hours" numeric(10, 2),
	"max_hours" numeric(10, 2),
	"p50_hours" numeric(10, 2),
	"p80_hours" numeric(10, 2),
	"sample_count" integer DEFAULT 0,
	"source_projects" json,
	"last_computed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_milestone_checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"milestone_code" varchar(10) NOT NULL,
	"milestone_name" varchar(100),
	"target_date" date,
	"baseline_date" date,
	"actual_date" date,
	"baseline_source" text,
	"historical_avg_days" numeric(10, 2),
	"historical_min_days" numeric(10, 2),
	"historical_max_days" numeric(10, 2),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"slack_days" integer,
	"critical_path" boolean DEFAULT false,
	"related_process_codes" json,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_solution_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_proposal_id" integer,
	"iteration_reason" text,
	"ai_task_id" integer,
	"benchmark_project_ids" json,
	"benchmark_projects" json,
	"process_flow" json,
	"equipment_config" json,
	"competitor_analysis" json,
	"budget_estimate" json,
	"ai_model" varchar(50),
	"generation_prompt" text,
	"generation_tokens" integer,
	"generation_time_ms" integer,
	"status" "proposal_status" DEFAULT 'GENERATING' NOT NULL,
	"approved_by" varchar(50),
	"approved_at" timestamp,
	"pushed_to_m3_at" timestamp,
	"m3_phase_id" integer,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_technical_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_no" varchar(50),
	"customer_id" integer,
	"customer_name" varchar(200),
	"workpiece_name" varchar(200) NOT NULL,
	"workpiece_name_en" varchar(200),
	"workpiece_material" varchar(100),
	"workpiece_dimensions" json,
	"particle_limit" json,
	"surface_tension_limit" numeric(8, 2),
	"residual_oil_limit" numeric(8, 4),
	"cycle_time" integer,
	"daily_capacity" integer,
	"annual_capacity" integer,
	"shift_mode" varchar(20),
	"preferred_cleaning_type" "cleaning_type",
	"chemical_restrictions" text,
	"temperature_range" json,
	"site_conditions" json,
	"special_requirements" text,
	"industry_standards" json,
	"source_document" varchar(300),
	"ai_task_id" integer,
	"status" "requirement_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" varchar(50),
	"reviewed_by" varchar(50),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interlock_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"machine_id" integer NOT NULL,
	"decision" varchar(20) NOT NULL,
	"block_reason" text,
	"cert_check_passed" boolean NOT NULL,
	"sop_check_passed" boolean NOT NULL,
	"missing_certs" text,
	"sop_version_required" varchar(20),
	"sop_version_signed" varchar(20),
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"device_info" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "machine_skill_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" integer NOT NULL,
	"certification_code" varchar(50) NOT NULL,
	"skill_name" varchar(200) NOT NULL,
	"sop_template_id" integer,
	"required_level" varchar(50) DEFAULT 'basic' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sop_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sop_template_id" integer NOT NULL,
	"version_signed" varchar(20) NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"signature_method" varchar(50) DEFAULT 'badge_scan' NOT NULL,
	"device_info" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "global_live_feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" varchar(100),
	"project_name" varchar(300),
	"location" varchar(200) NOT NULL,
	"feed_message" text NOT NULL,
	"feed_type" varchar(20) DEFAULT 'DAILY' NOT NULL,
	"reported_by" varchar(200),
	"importance" varchar(20) DEFAULT 'normal' NOT NULL,
	"is_live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strivers_hall" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" varchar(200) NOT NULL,
	"achievement_title" varchar(500) NOT NULL,
	"medal_level" "medal_level" NOT NULL,
	"story_summary" text,
	"awarded_by" varchar(200),
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"bu_code" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"metric_name" varchar(200) NOT NULL,
	"metric_name_en" varchar(200),
	"target_value" real NOT NULL,
	"current_value" real DEFAULT 0 NOT NULL,
	"unit" varchar(30) NOT NULL,
	"weight" real NOT NULL,
	"category" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "division_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_goal_id" integer NOT NULL,
	"division_name" varchar(100) NOT NULL,
	"division_code" varchar(10) NOT NULL,
	"manager_name" varchar(100) NOT NULL,
	"manager_id" integer,
	"metric_name" varchar(200) NOT NULL,
	"metric_name_en" varchar(200),
	"target_value" real NOT NULL,
	"current_value" real DEFAULT 0 NOT NULL,
	"unit" varchar(30) NOT NULL,
	"weight" real NOT NULL,
	"evaluation_criteria" text,
	"rag_status" varchar(1) DEFAULT 'G' NOT NULL,
	"completion_pct" real DEFAULT 0 NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_audit_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_code" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"year" integer NOT NULL,
	"quarter" integer,
	"month" integer,
	"plan_type" varchar(30) NOT NULL,
	"supplier_ids" json,
	"audit_team" json,
	"planned_start_date" varchar(10),
	"planned_end_date" varchar(10),
	"status" "supplier_audit_status" DEFAULT 'planned' NOT NULL,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_code" varchar(30) NOT NULL,
	"plan_id" integer,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"audit_type" varchar(30) NOT NULL,
	"audit_date" varchar(10),
	"has_iso_9001" boolean DEFAULT false,
	"has_iso_14001" boolean DEFAULT false,
	"has_iatf_16949" boolean DEFAULT false,
	"iso_status" varchar(30),
	"iso_cert_expiry" varchar(10),
	"material_process_score" integer,
	"quality_system_score" integer,
	"delivery_capability_score" integer,
	"price_competitiveness_score" integer,
	"overall_score" integer,
	"overall_grade" varchar(5),
	"findings" json,
	"recommendation" varchar(30),
	"corrective_actions" json,
	"lead_auditor" varchar(50),
	"audit_team" json,
	"financial_participant" varchar(50),
	"status" "supplier_audit_status" DEFAULT 'planned' NOT NULL,
	"report_url" varchar(500),
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_committee_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_code" varchar(30) NOT NULL,
	"review_type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"supplier_id" integer,
	"supplier_name" varchar(200),
	"project_no" varchar(50),
	"committee_members" json,
	"final_decision" varchar(30),
	"final_score" numeric(5, 2),
	"decision_notes" text,
	"meeting_date" varchar(10),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_elimination_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"elimination_code" varchar(30) NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"reason_detail" text,
	"last_audit_score" integer,
	"defect_rate" numeric(5, 2),
	"risk_score" integer,
	"replacement_supplier_id" integer,
	"replacement_supplier_name" varchar(200),
	"status" "elimination_status" DEFAULT 'proposed' NOT NULL,
	"proposed_by" varchar(50),
	"proposed_at" timestamp,
	"reviewed_by" varchar(50),
	"reviewed_at" timestamp,
	"approved_by" varchar(50),
	"approved_at" timestamp,
	"executed_at" timestamp,
	"monthly_report_month" varchar(7),
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_qualification_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_code" varchar(30) NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"supplier_contact" varchar(100),
	"supplier_phone" varchar(50),
	"supplier_email" varchar(200),
	"supplier_address" text,
	"business_license" varchar(100),
	"has_iso_9001" boolean DEFAULT false,
	"has_iso_14001" boolean DEFAULT false,
	"has_iatf_16949" boolean DEFAULT false,
	"other_certifications" json,
	"supply_category" varchar(100),
	"supply_materials" json,
	"estimated_annual_volume" varchar(100),
	"status" "supplier_qual_app_status" DEFAULT 'draft' NOT NULL,
	"applicant" varchar(50),
	"applicant_dept" varchar(50),
	"applied_at" timestamp,
	"quality_reviewer" varchar(50),
	"quality_review_result" varchar(30),
	"quality_review_notes" text,
	"quality_reviewed_at" timestamp,
	"commercial_reviewer" varchar(50),
	"commercial_notes" text,
	"commercial_reviewed_at" timestamp,
	"requires_special_approval" boolean DEFAULT false,
	"special_approver" varchar(50),
	"special_approval_notes" text,
	"special_approved_at" timestamp,
	"sign_off_approver" varchar(50),
	"sign_off_notes" text,
	"sign_off_at" timestamp,
	"resulting_supplier_id" integer,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_spot_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_code" varchar(30) NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"purchase_order_id" integer,
	"po_number" varchar(50),
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"material_name" varchar(200),
	"inspector" varchar(50) NOT NULL,
	"inspection_date" varchar(10),
	"document_check" "spot_check_result",
	"quality_check" "spot_check_result",
	"delivery_check" "spot_check_result",
	"price_check" "spot_check_result",
	"process_check" "spot_check_result",
	"overall_result" "spot_check_result",
	"findings" text,
	"corrective_actions" text,
	"report_url" varchar(500),
	"financial_participant" varchar(50),
	"financial_notes" text,
	"created_by" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "display_screens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"location" varchar(30) NOT NULL,
	"mac_address" varchar(20),
	"current_mode" varchar(20) DEFAULT 'EXTERNAL' NOT NULL,
	"mode_unlocked_at" timestamp,
	"mode_unlock_expires_at" timestamp,
	"unlocked_by_name" varchar(100),
	"screen_resolution" varchar(20) DEFAULT '1920x1080',
	"orientation" varchar(20) DEFAULT 'landscape',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "screen_playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"screen_id" integer NOT NULL,
	"view_component_name" varchar(100) NOT NULL,
	"duration_seconds" integer DEFAULT 30 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"mode" varchar(20) DEFAULT 'BOTH' NOT NULL,
	"camera_group_id" integer,
	"camera_id" integer,
	"data_refresh_seconds" integer DEFAULT 5,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "screen_security_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"screen_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"operator_id" integer,
	"operator_name" varchar(100),
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jiandaoyun_sync_tasks" ALTER COLUMN "syncDirection" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jiandaoyun_sync_tasks" ALTER COLUMN "syncDirection" SET DEFAULT 'external_to_grt'::text;--> statement-breakpoint
DROP TYPE "public"."syncDirectionEnum";--> statement-breakpoint
CREATE TYPE "public"."syncDirectionEnum" AS ENUM('external_to_grt', 'grt_to_external', 'bidirectional');--> statement-breakpoint
ALTER TABLE "jiandaoyun_sync_tasks" ALTER COLUMN "syncDirection" SET DEFAULT 'external_to_grt'::"public"."syncDirectionEnum";--> statement-breakpoint
ALTER TABLE "jiandaoyun_sync_tasks" ALTER COLUMN "syncDirection" SET DATA TYPE "public"."syncDirectionEnum" USING "syncDirection"::"public"."syncDirectionEnum";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "loginMethod" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "ai_knowledge_documents" ADD COLUMN "is_purged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ai_knowledge_documents" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "ai_knowledge_documents" ADD COLUMN "approval_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "erpMaterialCode" varchar(50);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "erpSyncStatus" varchar(50) DEFAULT 'not_synced';--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "erpLastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "oa_workflows" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_registrations" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "framework_agreements" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "rfq_events" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "small_value_procurements" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "erpPoNumber" varchar(50);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "projectId" integer;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "projectCode" varchar(50);--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "projectId" integer;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "projectCode" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "erpSupplierCode" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "erpSyncStatus" varchar(50) DEFAULT 'not_synced';--> statement-breakpoint
ALTER TABLE "production_equipments" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "annual_plans" ADD COLUMN "is_frozen" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "annual_plans" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_executions" ADD COLUMN "planned_m10_date" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_executions" ADD COLUMN "actual_m10_date" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_executions" ADD COLUMN "m10_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_executions" ADD COLUMN "m10_completed_date" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_executions" ADD COLUMN "m10_installation_notes" text;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_gates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "bu_code" varchar(50);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_type" varchar(20) DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "labor_category" varchar(30) DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "approval_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "assembly_bom_scan_logs" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "customer_quality_complaints" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "supplier_shipment_labels" ADD COLUMN "label_code" varchar(100);--> statement-breakpoint
ALTER TABLE "supplier_shipment_labels" ADD COLUMN "status" varchar(30) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD COLUMN "uwbAnchorId" varchar(50);--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD COLUMN "uwbCoordX" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD COLUMN "uwbCoordY" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD COLUMN "uwbCoordZ" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD COLUMN "uwbLastSeen" timestamp;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "uwbEnabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "uwbGatewayIp" varchar(50);--> statement-breakpoint
ALTER TABLE "agent_execution_logs" ADD CONSTRAINT "agent_execution_logs_triggerUserId_users_id_fk" FOREIGN KEY ("triggerUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_execution_logs" ADD CONSTRAINT "agent_execution_logs_humanReviewerId_users_id_fk" FOREIGN KEY ("humanReviewerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_governance" ADD CONSTRAINT "agent_governance_activatedBy_users_id_fk" FOREIGN KEY ("activatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_governance" ADD CONSTRAINT "agent_governance_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_governance" ADD CONSTRAINT "agent_governance_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tools_registry" ADD CONSTRAINT "ai_tools_registry_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tool_mappings" ADD CONSTRAINT "role_tool_mappings_tool_id_ai_tools_registry_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."ai_tools_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tool_mappings" ADD CONSTRAINT "role_tool_mappings_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposal_history" ADD CONSTRAINT "ai_proposal_history_source_document_id_ai_knowledge_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_battle_reports" ADD CONSTRAINT "monthly_battle_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_department_metrics" ADD CONSTRAINT "bi_department_metrics_report_period_id_bi_report_periods_id_fk" FOREIGN KEY ("report_period_id") REFERENCES "public"."bi_report_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_individual_metrics" ADD CONSTRAINT "bi_individual_metrics_report_period_id_bi_report_periods_id_fk" FOREIGN KEY ("report_period_id") REFERENCES "public"."bi_report_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_individual_metrics" ADD CONSTRAINT "bi_individual_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_report_access_rules" ADD CONSTRAINT "bi_report_access_rules_granted_to_user_id_users_id_fk" FOREIGN KEY ("granted_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_report_access_rules" ADD CONSTRAINT "bi_report_access_rules_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bi_report_periods" ADD CONSTRAINT "bi_report_periods_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_machine_projects" ADD CONSTRAINT "cleaning_machine_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleanliness_reports" ADD CONSTRAINT "cleanliness_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_compliance_requirements" ADD CONSTRAINT "equipment_compliance_requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_trials" ADD CONSTRAINT "process_trials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_t_milestones" ADD CONSTRAINT "project_t_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_change_orders" ADD CONSTRAINT "engineering_change_orders_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_change_orders" ADD CONSTRAINT "engineering_change_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_vault_files" ADD CONSTRAINT "grt_vault_files_checkout_by_users_id_fk" FOREIGN KEY ("checkout_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_vault_files" ADD CONSTRAINT "grt_vault_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_hall_access_grants" ADD CONSTRAINT "cloud_hall_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_hall_access_grants" ADD CONSTRAINT "cloud_hall_access_grants_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_periodic_reports" ADD CONSTRAINT "employee_periodic_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_periodic_reports" ADD CONSTRAINT "employee_periodic_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_rewards_penalties" ADD CONSTRAINT "employee_rewards_penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_rewards_penalties" ADD CONSTRAINT "employee_rewards_penalties_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_task_metrics" ADD CONSTRAINT "employee_task_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_materials" ADD CONSTRAINT "training_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_stage_plans" ADD CONSTRAINT "training_stage_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_stage_plans" ADD CONSTRAINT "training_stage_plans_supervisor_signoff_users_id_fk" FOREIGN KEY ("supervisor_signoff") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_stage_plans" ADD CONSTRAINT "training_stage_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_briefings" ADD CONSTRAINT "daily_briefings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_daily_logs" ADD CONSTRAINT "employee_daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_daily_logs" ADD CONSTRAINT "employee_daily_logs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_appraisal_reports" ADD CONSTRAINT "monthly_appraisal_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_appraisal_reports" ADD CONSTRAINT "monthly_appraisal_reports_manager_signed_by_users_id_fk" FOREIGN KEY ("manager_signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_review_comments" ADD CONSTRAINT "executive_review_comments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_matched_by_users_id_fk" FOREIGN KEY ("matched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_report_snapshots" ADD CONSTRAINT "financial_report_snapshots_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_report_snapshots" ADD CONSTRAINT "financial_report_snapshots_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_report_templates" ADD CONSTRAINT "financial_report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_currency_revaluations" ADD CONSTRAINT "foreign_currency_revaluations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_cost_benchmarks" ADD CONSTRAINT "project_cost_benchmarks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_earned_value" ADD CONSTRAINT "project_earned_value_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_responsiblePersonId_users_id_fk" FOREIGN KEY ("responsiblePersonId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_counts" ADD CONSTRAINT "material_inventory_counts_countedBy_users_id_fk" FOREIGN KEY ("countedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_counts" ADD CONSTRAINT "material_inventory_counts_reviewedBy_users_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_counts" ADD CONSTRAINT "material_inventory_counts_financeReviewBy_users_id_fk" FOREIGN KEY ("financeReviewBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_counts" ADD CONSTRAINT "material_inventory_counts_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_applicantId_users_id_fk" FOREIGN KEY ("applicantId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_currentReviewerId_users_id_fk" FOREIGN KEY ("currentReviewerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_financeSpecialistId_users_id_fk" FOREIGN KEY ("financeSpecialistId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_financeReviewerId_users_id_fk" FOREIGN KEY ("financeReviewerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_directorApprovalId_users_id_fk" FOREIGN KEY ("directorApprovalId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_cashierId_users_id_fk" FOREIGN KEY ("cashierId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reimbursements" ADD CONSTRAINT "project_reimbursements_rejectedBy_users_id_fk" FOREIGN KEY ("rejectedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_preAcceptanceBy_users_id_fk" FOREIGN KEY ("preAcceptanceBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_finalAcceptanceBy_users_id_fk" FOREIGN KEY ("finalAcceptanceBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_qualityApprovalBy_users_id_fk" FOREIGN KEY ("qualityApprovalBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_userDeptApprovalBy_users_id_fk" FOREIGN KEY ("userDeptApprovalBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_procurementConfirmBy_users_id_fk" FOREIGN KEY ("procurementConfirmBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_buManagerApprovalBy_users_id_fk" FOREIGN KEY ("buManagerApprovalBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_procurementManagerConfirmBy_users_id_fk" FOREIGN KEY ("procurementManagerConfirmBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_financeConfirmBy_users_id_fk" FOREIGN KEY ("financeConfirmBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_tracking" ADD CONSTRAINT "supplier_payment_tracking_cashierExecuteBy_users_id_fk" FOREIGN KEY ("cashierExecuteBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_task_completions" ADD CONSTRAINT "onboarding_task_completions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_access_authorizations" ADD CONSTRAINT "knowledge_access_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_access_authorizations" ADD CONSTRAINT "knowledge_access_authorizations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_learning_progress" ADD CONSTRAINT "knowledge_learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_role_requirements" ADD CONSTRAINT "knowledge_role_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_skill_level_standards" ADD CONSTRAINT "knowledge_skill_level_standards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_test_attempts" ADD CONSTRAINT "knowledge_test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_test_attempts" ADD CONSTRAINT "knowledge_test_attempts_test_id_knowledge_theory_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."knowledge_theory_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_theory_tests" ADD CONSTRAINT "knowledge_theory_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_assets" ADD CONSTRAINT "knowledge_assets_ai_task_id_ai_tasks_id_fk" FOREIGN KEY ("ai_task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_vector_chunks" ADD CONSTRAINT "knowledge_vector_chunks_asset_id_knowledge_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."knowledge_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_activities" ADD CONSTRAINT "lifecycle_activities_journey_id_lifecycle_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."lifecycle_journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_activities" ADD CONSTRAINT "lifecycle_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_journeys" ADD CONSTRAINT "lifecycle_journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_milestones" ADD CONSTRAINT "lifecycle_milestones_journey_id_lifecycle_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."lifecycle_journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_milestones" ADD CONSTRAINT "lifecycle_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_milestones" ADD CONSTRAINT "lifecycle_milestones_manager_reviewed_by_users_id_fk" FOREIGN KEY ("manager_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_milestones" ADD CONSTRAINT "lifecycle_milestones_hrbp_reviewed_by_users_id_fk" FOREIGN KEY ("hrbp_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_check_ins" ADD CONSTRAINT "okr_check_ins_key_result_id_okr_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."okr_key_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_objective_id_okr_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."okr_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_as_built_deviations" ADD CONSTRAINT "pdm_as_built_deviations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_as_built_deviations" ADD CONSTRAINT "pdm_as_built_deviations_product_id_pdm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pdm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_as_built_deviations" ADD CONSTRAINT "pdm_as_built_deviations_baseline_id_pdm_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."pdm_baselines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_as_built_deviations" ADD CONSTRAINT "pdm_as_built_deviations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_as_built_deviations" ADD CONSTRAINT "pdm_as_built_deviations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_baselines" ADD CONSTRAINT "pdm_baselines_product_id_pdm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pdm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_baselines" ADD CONSTRAINT "pdm_baselines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_baselines" ADD CONSTRAINT "pdm_baselines_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_baselines" ADD CONSTRAINT "pdm_baselines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_eco_workflow" ADD CONSTRAINT "pdm_eco_workflow_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_eco_workflow" ADD CONSTRAINT "pdm_eco_workflow_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_field_insights" ADD CONSTRAINT "pdm_field_insights_product_id_pdm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pdm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_field_insights" ADD CONSTRAINT "pdm_field_insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_field_insights" ADD CONSTRAINT "pdm_field_insights_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_field_insights" ADD CONSTRAINT "pdm_field_insights_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_products" ADD CONSTRAINT "pdm_products_default_project_id_projects_id_fk" FOREIGN KEY ("default_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_products" ADD CONSTRAINT "pdm_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_products" ADD CONSTRAINT "pdm_products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_readiness_checks" ADD CONSTRAINT "pdm_readiness_checks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_readiness_checks" ADD CONSTRAINT "pdm_readiness_checks_product_id_pdm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pdm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_readiness_checks" ADD CONSTRAINT "pdm_readiness_checks_waiver_approved_by_users_id_fk" FOREIGN KEY ("waiver_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_requirements" ADD CONSTRAINT "pdm_requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_requirements" ADD CONSTRAINT "pdm_requirements_product_id_pdm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pdm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdm_requirements" ADD CONSTRAINT "pdm_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent_reviews" ADD CONSTRAINT "project_agent_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_projects" ADD CONSTRAINT "bid_projects_sales_rep_id_users_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_projects" ADD CONSTRAINT "bid_projects_technical_lead_id_users_id_fk" FOREIGN KEY ("technical_lead_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_projects" ADD CONSTRAINT "bid_projects_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_projects" ADD CONSTRAINT "bid_projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_flow_records" ADD CONSTRAINT "cash_flow_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_policy_rules" ADD CONSTRAINT "expense_policy_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alert_instances" ADD CONSTRAINT "finance_alert_instances_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alert_instances" ADD CONSTRAINT "finance_alert_instances_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_timeline" ADD CONSTRAINT "project_activity_timeline_performedBy_users_id_fk" FOREIGN KEY ("performedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_identity_map" ADD CONSTRAINT "project_identity_map_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_identity_map" ADD CONSTRAINT "project_identity_map_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_annual_budgets" ADD CONSTRAINT "client_annual_budgets_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bidding_strategies" ADD CONSTRAINT "project_bidding_strategies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_event_log" ADD CONSTRAINT "sandbox_event_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bu_sales_plan_adjustments" ADD CONSTRAINT "bu_sales_plan_adjustments_bu_sales_plan_id_bu_sales_plans_id_fk" FOREIGN KEY ("bu_sales_plan_id") REFERENCES "public"."bu_sales_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bu_sales_plan_details" ADD CONSTRAINT "bu_sales_plan_details_bu_sales_plan_id_bu_sales_plans_id_fk" FOREIGN KEY ("bu_sales_plan_id") REFERENCES "public"."bu_sales_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_global_controls" ADD CONSTRAINT "sys_global_controls_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_requesterId_users_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_ai_performance" ADD CONSTRAINT "hr_ai_performance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_penalties" ADD CONSTRAINT "hr_penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_interactions" ADD CONSTRAINT "meeting_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_review_evaluations" ADD CONSTRAINT "meeting_review_evaluations_speaker_id_users_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_review_evaluations" ADD CONSTRAINT "meeting_review_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_meetings" ADD CONSTRAINT "sys_meetings_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_bom_work_hours" ADD CONSTRAINT "scheduling_bom_work_hours_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_solution_proposals" ADD CONSTRAINT "ai_solution_proposals_requirement_id_customer_technical_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."customer_technical_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_solution_proposals" ADD CONSTRAINT "ai_solution_proposals_ai_task_id_ai_tasks_id_fk" FOREIGN KEY ("ai_task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_technical_requirements" ADD CONSTRAINT "customer_technical_requirements_ai_task_id_ai_tasks_id_fk" FOREIGN KEY ("ai_task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aei_contrib_user_idx" ON "aei_contribution_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aei_contrib_month_idx" ON "aei_contribution_logs" USING btree ("month");--> statement-breakpoint
CREATE INDEX "aei_contrib_type_idx" ON "aei_contribution_logs" USING btree ("contribution_type");--> statement-breakpoint
CREATE INDEX "aei_contrib_user_month_idx" ON "aei_contribution_logs" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "aei_scores_user_idx" ON "aei_monthly_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aei_scores_month_idx" ON "aei_monthly_scores" USING btree ("month");--> statement-breakpoint
CREATE INDEX "aei_scores_user_month_idx" ON "aei_monthly_scores" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "aei_scores_composite_idx" ON "aei_monthly_scores" USING btree ("composite_aei_score");--> statement-breakpoint
CREATE INDEX "aei_scores_rank_idx" ON "aei_monthly_scores" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "agent_exec_logs_idx_agent" ON "agent_execution_logs" USING btree ("agentGovernanceId");--> statement-breakpoint
CREATE INDEX "agent_exec_logs_idx_code" ON "agent_execution_logs" USING btree ("agentCode");--> statement-breakpoint
CREATE INDEX "agent_exec_logs_idx_execution" ON "agent_execution_logs" USING btree ("executionId");--> statement-breakpoint
CREATE INDEX "agent_exec_logs_idx_status" ON "agent_execution_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_exec_logs_idx_created" ON "agent_execution_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "agent_governance_idx_category" ON "agent_governance" USING btree ("agentCategory");--> statement-breakpoint
CREATE INDEX "agent_governance_idx_status" ON "agent_governance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_governance_idx_environment" ON "agent_governance" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "agent_governance_idx_risk" ON "agent_governance" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "agent_knowledge_idx_agent" ON "agent_knowledge_links" USING btree ("agentGovernanceId");--> statement-breakpoint
CREATE INDEX "agent_knowledge_idx_type" ON "agent_knowledge_links" USING btree ("knowledgeSourceType");--> statement-breakpoint
CREATE INDEX "idx_acs_station_code" ON "agv_charging_stations" USING btree ("station_code");--> statement-breakpoint
CREATE INDEX "idx_acs_status" ON "agv_charging_stations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_acs_zone_id" ON "agv_charging_stations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "idx_af_agv_code" ON "agv_fleet" USING btree ("agv_code");--> statement-breakpoint
CREATE INDEX "idx_af_status" ON "agv_fleet" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_af_current_zone_id" ON "agv_fleet" USING btree ("current_zone_id");--> statement-breakpoint
CREATE INDEX "idx_af_uwb_tag_id" ON "agv_fleet" USING btree ("uwb_tag_id");--> statement-breakpoint
CREATE INDEX "idx_ar_route_code" ON "agv_routes" USING btree ("route_code");--> statement-breakpoint
CREATE INDEX "idx_ar_from_to_zone" ON "agv_routes" USING btree ("from_zone_id","to_zone_id");--> statement-breakpoint
CREATE INDEX "idx_ar_priority" ON "agv_routes" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_atr_from_to_zone" ON "agv_traffic_rules" USING btree ("from_zone_id","to_zone_id");--> statement-breakpoint
CREATE INDEX "idx_att_task_code" ON "agv_transport_tasks" USING btree ("task_code");--> statement-breakpoint
CREATE INDEX "idx_att_agv_id" ON "agv_transport_tasks" USING btree ("agv_id");--> statement-breakpoint
CREATE INDEX "idx_att_status" ON "agv_transport_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_att_work_order_id" ON "agv_transport_tasks" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "idx_att_priority_status" ON "agv_transport_tasks" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "idx_att_requested_at" ON "agv_transport_tasks" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "ai_tools_registry_category_idx" ON "ai_tools_registry" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_tools_registry_active_idx" ON "ai_tools_registry" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "role_tool_mappings_tool_idx" ON "role_tool_mappings" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "aph_source_doc_idx" ON "ai_proposal_history" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "aph_status_idx" ON "ai_proposal_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aph_created_at_idx" ON "ai_proposal_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agadj_agreement_idx" ON "annual_goal_adjustments" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "agadj_status_idx" ON "annual_goal_adjustments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "aga_employee_year_idx" ON "annual_goal_agreements" USING btree ("employee_id","year");--> statement-breakpoint
CREATE INDEX "aga_manager_year_idx" ON "annual_goal_agreements" USING btree ("manager_id","year");--> statement-breakpoint
CREATE INDEX "aga_status_idx" ON "annual_goal_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aga_bu_idx" ON "annual_goal_agreements" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "agal_agreement_idx" ON "annual_goal_audit_log" USING btree ("agreement_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agc_agreement_type_idx" ON "annual_goal_checkpoints" USING btree ("agreement_id","checkpoint_type");--> statement-breakpoint
CREATE INDEX "agc_agreement_idx" ON "annual_goal_checkpoints" USING btree ("agreement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agd_agreement_dim_idx" ON "annual_goal_dimensions" USING btree ("agreement_id","dimension_code");--> statement-breakpoint
CREATE INDEX "agd_agreement_idx" ON "annual_goal_dimensions" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "agm_agreement_idx" ON "annual_goal_messages" USING btree ("agreement_id","created_at");--> statement-breakpoint
CREATE INDEX "agm_sender_idx" ON "annual_goal_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "aip_agreement_idx" ON "annual_incentive_projections" USING btree ("agreement_id","calculated_at");--> statement-breakpoint
CREATE INDEX "idx_trigger_log_employee" ON "assessment_trigger_log" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_trigger_log_rule" ON "assessment_trigger_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_trigger_log_type" ON "assessment_trigger_log" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_trigger_log_outcome" ON "assessment_trigger_log" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "idx_trigger_rule_type" ON "assessment_trigger_rules" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_trigger_rule_active" ON "assessment_trigger_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_round_workflow" ON "assessment_workflow_rounds" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_round_status" ON "assessment_workflow_rounds" USING btree ("round_status");--> statement-breakpoint
CREATE INDEX "idx_workflow_employee" ON "assessment_workflows" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_position" ON "assessment_workflows" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_workflow_status" ON "assessment_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_purpose" ON "assessment_workflows" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "idx_benchmark_position" ON "position_benchmark_scores" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_benchmark_period" ON "position_benchmark_scores" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_al_enforcement_employee" ON "skill_enforcement_actions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_al_enforcement_type" ON "skill_enforcement_actions" USING btree ("enforcement_type");--> statement-breakpoint
CREATE INDEX "idx_al_enforcement_status" ON "skill_enforcement_actions" USING btree ("enforcement_status");--> statement-breakpoint
CREATE INDEX "clock_records_employee_date_idx" ON "attendance_clock_records" USING btree ("employee_id","clock_date");--> statement-breakpoint
CREATE INDEX "clock_records_date_idx" ON "attendance_clock_records" USING btree ("clock_date");--> statement-breakpoint
CREATE INDEX "excursions_employee_date_idx" ON "attendance_excursions" USING btree ("employee_id","excursion_date");--> statement-breakpoint
CREATE INDEX "excursions_date_idx" ON "attendance_excursions" USING btree ("excursion_date");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "attendance_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_employee_idx" ON "attendance_group_members" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_auth_audit_actor" ON "authorization_audit_trail" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_auth_audit_type" ON "authorization_audit_trail" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_auth_audit_domain" ON "authorization_audit_trail" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_auth_audit_created" ON "authorization_audit_trail" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_policy_domain" ON "authorization_policies" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_credit_tier_user" ON "employee_credit_tiers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_credit_tier_score" ON "employee_credit_tiers" USING btree ("credit_score");--> statement-breakpoint
CREATE INDEX "idx_credit_tier_tier" ON "employee_credit_tiers" USING btree ("credit_tier");--> statement-breakpoint
CREATE INDEX "idx_gc_rule_domain_tier" ON "green_channel_rules" USING btree ("domain","credit_tier_required");--> statement-breakpoint
CREATE INDEX "idx_gc_usage_user" ON "green_channel_usages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gc_usage_domain" ON "green_channel_usages" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_gc_usage_status" ON "green_channel_usages" USING btree ("post_facto_status");--> statement-breakpoint
CREATE INDEX "idx_integrity_user_period" ON "integrity_incentive_records" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "idx_post_facto_user" ON "post_facto_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_post_facto_status" ON "post_facto_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_post_facto_deadline" ON "post_facto_submissions" USING btree ("deadline_date");--> statement-breakpoint
CREATE INDEX "global_arena_rankings_period_idx" ON "global_arena_rankings" USING btree ("period");--> statement-breakpoint
CREATE INDEX "global_arena_rankings_type_idx" ON "global_arena_rankings" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "global_arena_rankings_rank_idx" ON "global_arena_rankings" USING btree ("rank_position");--> statement-breakpoint
CREATE INDEX "global_arena_rankings_tier_idx" ON "global_arena_rankings" USING btree ("bonus_tier");--> statement-breakpoint
CREATE INDEX "monthly_battle_reports_period_idx" ON "monthly_battle_reports" USING btree ("period");--> statement-breakpoint
CREATE INDEX "monthly_battle_reports_status_idx" ON "monthly_battle_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "monthly_battle_reports_bu_idx" ON "monthly_battle_reports" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "bi_dept_metrics_period_idx" ON "bi_department_metrics" USING btree ("report_period_id");--> statement-breakpoint
CREATE INDEX "bi_dept_metrics_dept_idx" ON "bi_department_metrics" USING btree ("department_code");--> statement-breakpoint
CREATE INDEX "bi_individual_metrics_period_idx" ON "bi_individual_metrics" USING btree ("report_period_id");--> statement-breakpoint
CREATE INDEX "bi_individual_metrics_user_idx" ON "bi_individual_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bi_individual_metrics_dept_idx" ON "bi_individual_metrics" USING btree ("department_code");--> statement-breakpoint
CREATE INDEX "bi_access_rules_role_idx" ON "bi_report_access_rules" USING btree ("granted_to_role");--> statement-breakpoint
CREATE INDEX "bi_access_rules_user_idx" ON "bi_report_access_rules" USING btree ("granted_to_user_id");--> statement-breakpoint
CREATE INDEX "bi_access_rules_active_idx" ON "bi_report_access_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bi_report_periods_type_idx" ON "bi_report_periods" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "bi_report_periods_status_idx" ON "bi_report_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assembly_recordings_camera_id" ON "assembly_recordings" USING btree ("camera_id");--> statement-breakpoint
CREATE INDEX "idx_assembly_recordings_wo_station" ON "assembly_recordings" USING btree ("work_order_id","station_id");--> statement-breakpoint
CREATE INDEX "idx_assembly_recordings_operator_id" ON "assembly_recordings" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_assembly_recordings_start_time" ON "assembly_recordings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_assembly_recordings_review_status" ON "assembly_recordings" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "idx_camera_events_camera_id" ON "camera_events" USING btree ("camera_id");--> statement-breakpoint
CREATE INDEX "idx_camera_events_event_type" ON "camera_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_camera_events_severity" ON "camera_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_camera_events_created_at" ON "camera_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_camera_group_members_group_id" ON "camera_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_camera_maintenance_log_camera_id" ON "camera_maintenance_log" USING btree ("camera_id");--> statement-breakpoint
CREATE INDEX "idx_camera_snapshots_camera_id" ON "camera_snapshots" USING btree ("camera_id");--> statement-breakpoint
CREATE INDEX "idx_camera_snapshots_captured_at" ON "camera_snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "idx_camera_snapshots_trigger_type" ON "camera_snapshots" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_cameras_camera_code" ON "cameras" USING btree ("camera_code");--> statement-breakpoint
CREATE INDEX "idx_cameras_brand" ON "cameras" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "idx_cameras_location" ON "cameras" USING btree ("location");--> statement-breakpoint
CREATE INDEX "idx_cameras_station_id" ON "cameras" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_cameras_status" ON "cameras" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ess_employee_id_idx" ON "employee_state_signals" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "ess_signal_type_idx" ON "employee_state_signals" USING btree ("signalType");--> statement-breakpoint
CREATE INDEX "ess_detected_at_idx" ON "employee_state_signals" USING btree ("detectedAt");--> statement-breakpoint
CREATE INDEX "ess_employee_signal_idx" ON "employee_state_signals" USING btree ("employeeId","signalType");--> statement-breakpoint
CREATE INDEX "kpa_employee_id_idx" ON "kpi_proactive_alerts" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "kpa_kpi_domain_idx" ON "kpi_proactive_alerts" USING btree ("kpiDomain");--> statement-breakpoint
CREATE INDEX "kpa_risk_level_idx" ON "kpi_proactive_alerts" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "kpa_trend_direction_idx" ON "kpi_proactive_alerts" USING btree ("trendDirection");--> statement-breakpoint
CREATE INDEX "kpa_calculated_at_idx" ON "kpi_proactive_alerts" USING btree ("calculatedAt");--> statement-breakpoint
CREATE INDEX "mm_employee_id_idx" ON "motivation_moments" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "mm_moment_type_idx" ON "motivation_moments" USING btree ("momentType");--> statement-breakpoint
CREATE INDEX "mm_delivered_at_idx" ON "motivation_moments" USING btree ("deliveredAt");--> statement-breakpoint
CREATE INDEX "mm_visibility_idx" ON "motivation_moments" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "sta_assigned_to_idx" ON "smart_task_assignments" USING btree ("assignedTo");--> statement-breakpoint
CREATE INDEX "sta_assigned_by_idx" ON "smart_task_assignments" USING btree ("assignedBy");--> statement-breakpoint
CREATE INDEX "sta_status_idx" ON "smart_task_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sta_priority_score_idx" ON "smart_task_assignments" USING btree ("priorityScore");--> statement-breakpoint
CREATE INDEX "sta_scheduled_push_time_idx" ON "smart_task_assignments" USING btree ("scheduledPushTime");--> statement-breakpoint
CREATE INDEX "sta_challenge_level_idx" ON "smart_task_assignments" USING btree ("challengeLevel");--> statement-breakpoint
CREATE INDEX "tas_requested_by_idx" ON "technical_assist_sessions" USING btree ("requestedBy");--> statement-breakpoint
CREATE INDEX "tas_status_idx" ON "technical_assist_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tas_difficulty_level_idx" ON "technical_assist_sessions" USING btree ("difficultyLevel");--> statement-breakpoint
CREATE INDEX "tas_project_id_idx" ON "technical_assist_sessions" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "tas_scheduled_at_idx" ON "technical_assist_sessions" USING btree ("scheduledAt");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_session_logs_session" ON "cloud_hall_session_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_session_logs_action" ON "cloud_hall_session_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_sessions_status" ON "cloud_hall_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_sessions_initiator" ON "cloud_hall_sessions" USING btree ("initiator_user_id");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_sessions_leadership" ON "cloud_hall_sessions" USING btree ("leadership_user_id");--> statement-breakpoint
CREATE INDEX "idx_cloud_hall_sessions_created" ON "cloud_hall_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ccc_activities_created_at_idx" ON "ccc_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ccc_improvement_updates_imp_idx" ON "ccc_improvement_updates" USING btree ("improvement_id");--> statement-breakpoint
CREATE INDEX "ccc_improvements_role_idx" ON "ccc_improvements" USING btree ("role");--> statement-breakpoint
CREATE INDEX "ccc_improvements_status_idx" ON "ccc_improvements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cam_session_idx" ON "consultant_agent_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "cao_employee_idx" ON "consultant_agent_outputs" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "cao_type_idx" ON "consultant_agent_outputs" USING btree ("output_type");--> statement-breakpoint
CREATE INDEX "cao_scheduled_idx" ON "consultant_agent_outputs" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "cas_employee_idx" ON "consultant_agent_sessions" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "csc_tier_idx" ON "consultant_strategy_configs" USING btree ("persona_tier");--> statement-breakpoint
CREATE UNIQUE INDEX "epp_employee_year_idx" ON "employee_persona_profiles" USING btree ("employee_id","year");--> statement-breakpoint
CREATE INDEX "epp_persona_tier_idx" ON "employee_persona_profiles" USING btree ("persona_tier");--> statement-breakpoint
CREATE INDEX "sla_requester_idx" ON "cross_dept_sla_records" USING btree ("requester_dept_code");--> statement-breakpoint
CREATE INDEX "sla_provider_idx" ON "cross_dept_sla_records" USING btree ("provider_dept_code");--> statement-breakpoint
CREATE INDEX "sla_period_idx" ON "cross_dept_sla_records" USING btree ("period");--> statement-breakpoint
CREATE INDEX "sla_bu_idx" ON "cross_dept_sla_records" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "idx_cust_audit_auth_id" ON "customer_access_audit_logs" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "idx_cust_audit_action" ON "customer_access_audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_cust_audit_portal_user" ON "customer_access_audit_logs" USING btree ("portal_user_id");--> statement-breakpoint
CREATE INDEX "idx_cust_audit_created" ON "customer_access_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_doc_auth_id" ON "customer_authorization_documents" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_doc_category" ON "customer_authorization_documents" USING btree ("doc_category");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_project" ON "customer_authorizations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_company" ON "customer_authorizations" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_status" ON "customer_authorizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cust_auth_portal_user" ON "customer_authorizations" USING btree ("portal_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cust_nda_auth_id" ON "customer_nda_agreements" USING btree ("authorization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cust_nda_token" ON "customer_nda_agreements" USING btree ("signature_token");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_code_idx" ON "customer_equipment" USING btree ("equipment_code");--> statement-breakpoint
CREATE INDEX "ce_customer_idx" ON "customer_equipment" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ce_model_idx" ON "customer_equipment" USING btree ("equipment_model");--> statement-breakpoint
CREATE INDEX "cehl_equipment_idx" ON "customer_equipment_health_log" USING btree ("equipment_id","recorded_at");--> statement-breakpoint
CREATE INDEX "cpm_equipment_idx" ON "customer_pm_plans" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "cpm_status_idx" ON "customer_pm_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cpm_scheduled_idx" ON "customer_pm_plans" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "crs_equipment_idx" ON "customer_remote_sessions" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "crs_status_idx" ON "customer_remote_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crr_equipment_idx" ON "customer_repair_records" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "crr_status_idx" ON "customer_repair_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crr_reported_idx" ON "customer_repair_records" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "csp_equipment_idx" ON "customer_spare_parts" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "csp_category_idx" ON "customer_spare_parts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "csp_stock_alert_idx" ON "customer_spare_parts" USING btree ("current_stock","min_stock_level");--> statement-breakpoint
CREATE INDEX "sar_group_idx" ON "service_auto_reports" USING btree ("group_by");--> statement-breakpoint
CREATE INDEX "sar_frequency_idx" ON "service_auto_reports" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "spe_equipment_idx" ON "service_plan_executions" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "spe_engineer_idx" ON "service_plan_executions" USING btree ("engineer_id");--> statement-breakpoint
CREATE INDEX "spe_status_idx" ON "service_plan_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sss_customer_idx" ON "service_share_settings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sss_shared_user_idx" ON "service_share_settings" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "idx_cba_profile_id" ON "customer_brand_aesthetics" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_cpi_profile_id" ON "customer_product_interlocks" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_cpi_timeline" ON "customer_product_interlocks" USING btree ("timeline");--> statement-breakpoint
CREATE INDEX "idx_cps_profile_id" ON "customer_profile_snapshots" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_cps_created_at" ON "customer_profile_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crc_profile_id" ON "customer_reading_channels" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_crc_doc_category" ON "customer_reading_channels" USING btree ("doc_category");--> statement-breakpoint
CREATE INDEX "idx_crc_access_tier" ON "customer_reading_channels" USING btree ("access_tier");--> statement-breakpoint
CREATE INDEX "idx_csm_profile_id" ON "customer_standards_mappings" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scp_customer_id" ON "strategic_customer_profiles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_scp_company_name" ON "strategic_customer_profiles" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_scp_cooperation_tier" ON "strategic_customer_profiles" USING btree ("cooperation_tier");--> statement-breakpoint
CREATE INDEX "idx_scp_status" ON "strategic_customer_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_proc_ack_unique" ON "dept_procedure_acknowledgments" USING btree ("procedure_id","user_id","version_acknowledged");--> statement-breakpoint
CREATE INDEX "idx_proc_ack_user" ON "dept_procedure_acknowledgments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_proc_ack_proc" ON "dept_procedure_acknowledgments" USING btree ("procedure_id");--> statement-breakpoint
CREATE INDEX "idx_proc_cat_dept" ON "dept_procedure_categories" USING btree ("dept_code");--> statement-breakpoint
CREATE INDEX "idx_proc_cat_type" ON "dept_procedure_categories" USING btree ("procedure_type");--> statement-breakpoint
CREATE INDEX "idx_proc_exc_proc" ON "dept_procedure_exceptions" USING btree ("procedure_id");--> statement-breakpoint
CREATE INDEX "idx_proc_exc_status" ON "dept_procedure_exceptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_proc_exc_severity" ON "dept_procedure_exceptions" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_proc_kpi_proc" ON "dept_procedure_kpi_links" USING btree ("procedure_id");--> statement-breakpoint
CREATE INDEX "idx_proc_kpi_code" ON "dept_procedure_kpi_links" USING btree ("kpi_code");--> statement-breakpoint
CREATE INDEX "idx_proc_ver_proc" ON "dept_procedure_versions" USING btree ("procedure_id");--> statement-breakpoint
CREATE INDEX "idx_proc_dept" ON "dept_procedures" USING btree ("dept_code");--> statement-breakpoint
CREATE INDEX "idx_proc_type" ON "dept_procedures" USING btree ("procedure_type");--> statement-breakpoint
CREATE INDEX "idx_proc_status" ON "dept_procedures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_proc_effective" ON "dept_procedures" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_proc_owner" ON "dept_procedures" USING btree ("owner_role");--> statement-breakpoint
CREATE INDEX "export_logs_project_idx" ON "design_export_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "export_logs_format_idx" ON "design_export_logs" USING btree ("export_format");--> statement-breakpoint
CREATE INDEX "sync_events_project_idx" ON "design_sync_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sync_events_type_idx" ON "design_sync_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sync_events_created_idx" ON "design_sync_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "equip_stations_project_idx" ON "equipment_stations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "equip_stations_proposal_idx" ON "equipment_stations" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "equip_stations_type_idx" ON "equipment_stations" USING btree ("station_type");--> statement-breakpoint
CREATE INDEX "eco_project_idx" ON "engineering_change_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "eco_status_idx" ON "engineering_change_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vault_project_idx" ON "grt_vault_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vault_file_type_idx" ON "grt_vault_files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "drawing_relations_drawing_id_idx" ON "drawing_relations" USING btree ("drawing_id");--> statement-breakpoint
CREATE INDEX "drawing_relations_relation_type_idx" ON "drawing_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "drawing_revisions_drawing_id_idx" ON "drawing_revisions" USING btree ("drawing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drawings_drawing_number_idx" ON "drawings" USING btree ("drawing_number");--> statement-breakpoint
CREATE INDEX "drawings_product_id_idx" ON "drawings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "drawings_product_code_idx" ON "drawings" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "drawings_status_idx" ON "drawings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drawings_drawing_type_idx" ON "drawings" USING btree ("drawing_type");--> statement-breakpoint
CREATE INDEX "drawings_created_at_idx" ON "drawings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cci_project" ON "compliance_checklist_items" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_cci_standard" ON "compliance_checklist_items" USING btree ("standard_id");--> statement-breakpoint
CREATE INDEX "idx_cci_phase" ON "compliance_checklist_items" USING btree ("check_phase");--> statement-breakpoint
CREATE INDEX "idx_cci_status" ON "compliance_checklist_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_csp_customer" ON "customer_standard_profiles" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "idx_csp_region" ON "customer_standard_profiles" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_csp_framework" ON "customer_standard_profiles" USING btree ("base_framework");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ec_number" ON "electrical_complaints" USING btree ("complaint_number");--> statement-breakpoint
CREATE INDEX "idx_ec_customer" ON "electrical_complaints" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "idx_ec_severity" ON "electrical_complaints" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_ec_status" ON "electrical_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ec_category" ON "electrical_complaints" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_err_phase_rule" ON "electrical_review_rules" USING btree ("phase","rule_code");--> statement-breakpoint
CREATE INDEX "idx_err_framework" ON "electrical_review_rules" USING btree ("framework");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_es_code_version" ON "electrical_standards" USING btree ("code","version");--> statement-breakpoint
CREATE INDEX "idx_es_framework" ON "electrical_standards" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "idx_es_category" ON "electrical_standards" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_es_status" ON "electrical_standards" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pss_project" ON "project_standard_selections" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_pss_customer" ON "project_standard_selections" USING btree ("customer_profile_id");--> statement-breakpoint
CREATE INDEX "idx_cag_status" ON "cloud_hall_access_grants" USING btree ("grant_status");--> statement-breakpoint
CREATE INDEX "idx_cag_type" ON "cloud_hall_access_grants" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_epr_type" ON "employee_periodic_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "idx_epr_period" ON "employee_periodic_reports" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_epr_status" ON "employee_periodic_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_epr_user" ON "employee_periodic_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_erp_user_period" ON "employee_rewards_penalties" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "idx_erp_type" ON "employee_rewards_penalties" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_erp_issued" ON "employee_rewards_penalties" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX "idx_etm_period" ON "employee_task_metrics" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_tm_category" ON "training_materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_tm_status" ON "training_materials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tm_difficulty" ON "training_materials" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_tsp_status" ON "training_stage_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tsp_due" ON "training_stage_plans" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tsp_user" ON "training_stage_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_community_ack_post" ON "community_acks" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_community_ack_emp" ON "community_acks" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_community_comment_post" ON "community_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_community_comment_parent" ON "community_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_community_comment_author" ON "community_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_community_post_type" ON "community_posts" USING btree ("post_type");--> statement-breakpoint
CREATE INDEX "idx_community_post_scope" ON "community_posts" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_community_post_pinned" ON "community_posts" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "idx_community_post_created" ON "community_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sensitive_word" ON "community_sensitive_words" USING btree ("word");--> statement-breakpoint
CREATE INDEX "idx_sensitive_category" ON "community_sensitive_words" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_compliance_employee" ON "daily_compliance_checks" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_compliance_date" ON "daily_compliance_checks" USING btree ("check_date");--> statement-breakpoint
CREATE INDEX "idx_elite_benefit_emp" ON "elite_benefit_applications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_elite_benefit_status" ON "elite_benefit_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_elite_review_app" ON "elite_benefit_reviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_elite_review_emp_period" ON "elite_benefit_reviews" USING btree ("employee_id","review_period");--> statement-breakpoint
CREATE INDEX "idx_point_approval_requester" ON "point_approval_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_point_approval_status" ON "point_approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_point_approval_target" ON "point_approval_requests" USING btree ("target_employee_id");--> statement-breakpoint
CREATE INDEX "idx_point_balance_employee" ON "point_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_point_balance_observation" ON "point_balances" USING btree ("is_on_observation");--> statement-breakpoint
CREATE INDEX "idx_enforcement_employee" ON "point_enforcement_log" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_enforcement_action" ON "point_enforcement_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_redemption_catalog_category" ON "point_redemption_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_redemption_catalog_active" ON "point_redemption_catalog" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_redemption_employee" ON "point_redemptions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_redemption_status" ON "point_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_redemption_catalog" ON "point_redemptions" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "idx_point_rules_category" ON "point_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_point_rules_code" ON "point_rules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_point_txn_employee" ON "point_transactions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_point_txn_date" ON "point_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_point_txn_rule" ON "point_transactions" USING btree ("rule_code");--> statement-breakpoint
CREATE INDEX "idx_point_txn_type" ON "point_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_suggestion_employee" ON "suggestion_submissions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_suggestion_status" ON "suggestion_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suggestion_category" ON "suggestion_submissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_workstation_emp" ON "workstation_presets" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_workstation_role" ON "workstation_presets" USING btree ("system_role");--> statement-breakpoint
CREATE INDEX "idx_e360h_user_month" ON "employee_360_history" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "idx_e360h_month" ON "employee_360_history" USING btree ("month");--> statement-breakpoint
CREATE INDEX "idx_e360_user" ON "employee_360_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_e360_dept" ON "employee_360_profiles" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_e360_tier" ON "employee_360_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_e360_overall" ON "employee_360_profiles" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "daily_briefings_date_idx" ON "daily_briefings" USING btree ("briefing_date");--> statement-breakpoint
CREATE INDEX "daily_briefings_status_idx" ON "daily_briefings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employee_daily_logs_user_idx" ON "employee_daily_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_daily_logs_date_idx" ON "employee_daily_logs" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "employee_daily_logs_status_idx" ON "employee_daily_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "monthly_appraisal_user_idx" ON "monthly_appraisal_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "monthly_appraisal_period_idx" ON "monthly_appraisal_reports" USING btree ("period");--> statement-breakpoint
CREATE INDEX "monthly_appraisal_status_idx" ON "monthly_appraisal_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "exec_snapshot_scope_period_idx" ON "executive_review_snapshots" USING btree ("scope_type","scope_id","period","period_type");--> statement-breakpoint
CREATE INDEX "upload_chunks_session_idx" ON "file_upload_chunks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "upload_chunks_session_chunk_idx" ON "file_upload_chunks" USING btree ("session_id","chunk_index");--> statement-breakpoint
CREATE INDEX "upload_sessions_session_idx" ON "file_upload_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_status_idx" ON "file_upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "upload_sessions_user_idx" ON "file_upload_sessions" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "br_bank_account_idx" ON "bank_reconciliations" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "br_recon_date_idx" ON "bank_reconciliations" USING btree ("reconciliation_date");--> statement-breakpoint
CREATE INDEX "br_status_idx" ON "bank_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bs_bank_account_idx" ON "bank_statements" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bs_statement_date_idx" ON "bank_statements" USING btree ("statement_date");--> statement-breakpoint
CREATE INDEX "bs_match_status_idx" ON "bank_statements" USING btree ("match_status");--> statement-breakpoint
CREATE INDEX "bs_transaction_ref_idx" ON "bank_statements" USING btree ("transaction_ref");--> statement-breakpoint
CREATE INDEX "bs_import_batch_idx" ON "bank_statements" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "er_rate_date_idx" ON "exchange_rates" USING btree ("rate_date");--> statement-breakpoint
CREATE INDEX "er_currency_pair_idx" ON "exchange_rates" USING btree ("from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "frs_report_code_idx" ON "financial_report_snapshots" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "frs_fiscal_idx" ON "financial_report_snapshots" USING btree ("fiscal_year","fiscal_period");--> statement-breakpoint
CREATE INDEX "fcr_reval_date_idx" ON "foreign_currency_revaluations" USING btree ("revaluation_date");--> statement-breakpoint
CREATE INDEX "fcr_account_code_idx" ON "foreign_currency_revaluations" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "fcr_status_idx" ON "foreign_currency_revaluations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pcb_equipment_type_idx" ON "project_cost_benchmarks" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "pcb_customer_industry_idx" ON "project_cost_benchmarks" USING btree ("customer_industry");--> statement-breakpoint
CREATE INDEX "pcb_project_scale_idx" ON "project_cost_benchmarks" USING btree ("project_scale");--> statement-breakpoint
CREATE INDEX "pcb_is_template_idx" ON "project_cost_benchmarks" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "pev_project_code_idx" ON "project_earned_value" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "pev_snapshot_date_idx" ON "project_earned_value" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "pev_status_idx" ON "project_earned_value" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_accounts_idx_entity" ON "bank_accounts" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "bank_accounts_idx_type" ON "bank_accounts" USING btree ("accountType");--> statement-breakpoint
CREATE INDEX "customer_payment_idx_customer" ON "customer_payment_tracking" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "customer_payment_idx_project" ON "customer_payment_tracking" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "customer_payment_idx_status" ON "customer_payment_tracking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fixed_expenses_idx_type" ON "fixed_expenses" USING btree ("expenseType");--> statement-breakpoint
CREATE INDEX "fixed_expenses_idx_responsible" ON "fixed_expenses" USING btree ("responsiblePersonId");--> statement-breakpoint
CREATE INDEX "kingdee_migration_idx_batch" ON "kingdee_migration_batches" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "kingdee_migration_idx_entity" ON "kingdee_migration_batches" USING btree ("entityType");--> statement-breakpoint
CREATE INDEX "kingdee_migration_idx_status" ON "kingdee_migration_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_count_items_idx_count" ON "material_inventory_count_items" USING btree ("countId");--> statement-breakpoint
CREATE INDEX "material_count_items_idx_material" ON "material_inventory_count_items" USING btree ("materialCode");--> statement-breakpoint
CREATE INDEX "material_count_items_idx_project" ON "material_inventory_count_items" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "material_inventory_counts_idx_warehouse" ON "material_inventory_counts" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "material_inventory_counts_idx_project" ON "material_inventory_counts" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "material_inventory_counts_idx_status" ON "material_inventory_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_inventory_counts_idx_type" ON "material_inventory_counts" USING btree ("countType");--> statement-breakpoint
CREATE INDEX "project_reimbursements_idx_applicant" ON "project_reimbursements" USING btree ("applicantId");--> statement-breakpoint
CREATE INDEX "project_reimbursements_idx_project" ON "project_reimbursements" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "project_reimbursements_idx_status" ON "project_reimbursements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_reimbursements_idx_type" ON "project_reimbursements" USING btree ("reimbursementType");--> statement-breakpoint
CREATE INDEX "supplier_payment_idx_supplier" ON "supplier_payment_tracking" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "supplier_payment_idx_po" ON "supplier_payment_tracking" USING btree ("purchaseOrderId");--> statement-breakpoint
CREATE INDEX "supplier_payment_idx_project" ON "supplier_payment_tracking" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "supplier_payment_idx_status" ON "supplier_payment_tracking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_frh_fmea_item" ON "fmea_rpn_history" USING btree ("fmea_item_id");--> statement-breakpoint
CREATE INDEX "idx_frh_calculated_at" ON "fmea_rpn_history" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "idx_frh_capa_required" ON "fmea_rpn_history" USING btree ("capa_required");--> statement-breakpoint
CREATE INDEX "idx_sfdl_fmea_item" ON "shop_floor_defect_logs" USING btree ("fmea_item_id");--> statement-breakpoint
CREATE INDEX "idx_sfdl_reported_at" ON "shop_floor_defect_logs" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "idx_sfdl_failure_mode" ON "shop_floor_defect_logs" USING btree ("failure_mode");--> statement-breakpoint
CREATE INDEX "idx_sfdl_source" ON "shop_floor_defect_logs" USING btree ("defect_source");--> statement-breakpoint
CREATE INDEX "account_balances_idx_fiscal_period" ON "account_balances" USING btree ("fiscalYear","fiscalPeriod");--> statement-breakpoint
CREATE INDEX "account_balances_idx_account_id" ON "account_balances" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "asset_depreciation_idx_asset_id" ON "asset_depreciation" USING btree ("assetId");--> statement-breakpoint
CREATE INDEX "asset_depreciation_idx_fiscal_period" ON "asset_depreciation" USING btree ("fiscalYear","fiscalPeriod");--> statement-breakpoint
CREATE INDEX "asset_disposal_idx_asset_id" ON "asset_disposal" USING btree ("assetId");--> statement-breakpoint
CREATE INDEX "asset_disposal_idx_status" ON "asset_disposal" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cost_centers_idx_bu_code" ON "cost_centers" USING btree ("buCode");--> statement-breakpoint
CREATE INDEX "cost_centers_idx_is_active" ON "cost_centers" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "finance_role_assignments_idx_role_bu" ON "finance_role_assignments" USING btree ("roleCode","buCode");--> statement-breakpoint
CREATE INDEX "finance_role_assignments_idx_user_id" ON "finance_role_assignments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "finance_role_assignments_idx_is_active" ON "finance_role_assignments" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "fixed_assets_idx_asset_category" ON "fixed_assets" USING btree ("assetCategory");--> statement-breakpoint
CREATE INDEX "fixed_assets_idx_status" ON "fixed_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fixed_assets_idx_department_code" ON "fixed_assets" USING btree ("departmentCode");--> statement-breakpoint
CREATE INDEX "gl_accounts_idx_parent" ON "gl_accounts" USING btree ("parentAccountId");--> statement-breakpoint
CREATE INDEX "gl_accounts_idx_account_type" ON "gl_accounts" USING btree ("accountType");--> statement-breakpoint
CREATE INDEX "gl_accounts_idx_is_active" ON "gl_accounts" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "gl_entries_idx_account_id" ON "gl_entries" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "gl_entries_idx_fiscal_period" ON "gl_entries" USING btree ("fiscalYear","fiscalPeriod");--> statement-breakpoint
CREATE INDEX "gl_entries_idx_project_code" ON "gl_entries" USING btree ("projectCode");--> statement-breakpoint
CREATE INDEX "gl_entries_idx_voucher_date" ON "gl_entries" USING btree ("voucherDate");--> statement-breakpoint
CREATE INDEX "gl_entries_idx_source_doc" ON "gl_entries" USING btree ("sourceDocType","sourceDocId");--> statement-breakpoint
CREATE INDEX "onboarding_completions_idx_user" ON "onboarding_task_completions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "onboarding_completions_idx_task" ON "onboarding_task_completions" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "period_close_checklists_idx_fiscal_period" ON "period_close_checklists" USING btree ("fiscalYear","fiscalPeriod");--> statement-breakpoint
CREATE INDEX "tax_invoices_idx_direction" ON "tax_invoices" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "tax_invoices_idx_invoice_date" ON "tax_invoices" USING btree ("invoiceDate");--> statement-breakpoint
CREATE INDEX "tax_invoices_idx_counterparty" ON "tax_invoices" USING btree ("counterpartyName");--> statement-breakpoint
CREATE INDEX "tax_invoices_idx_project_code" ON "tax_invoices" USING btree ("projectCode");--> statement-breakpoint
CREATE INDEX "tax_invoices_idx_status" ON "tax_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grt_devices_scan_idx" ON "grt_detected_devices" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "grt_devices_type_idx" ON "grt_detected_devices" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "grt_devices_ip_idx" ON "grt_detected_devices" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "grt_scans_scan_id_idx" ON "grt_environment_scans" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "grt_scans_type_idx" ON "grt_environment_scans" USING btree ("scan_type");--> statement-breakpoint
CREATE INDEX "hmi_screens_project_idx" ON "hmi_screens" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "hmi_screens_plc_project_idx" ON "hmi_screens" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "hmi_screens_type_idx" ON "hmi_screens" USING btree ("screen_type");--> statement-breakpoint
CREATE INDEX "idx_rubric_job_role" ON "competency_rubrics" USING btree ("job_role");--> statement-breakpoint
CREATE INDEX "idx_emp_cap_employee" ON "employee_capabilities" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_eds_employee" ON "employee_domain_scores" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_skill_domain" ON "skill_dictionary" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "humanoid_robots_status_idx" ON "humanoid_robots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "humanoid_robots_station_id_idx" ON "humanoid_robots" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "humanoid_robots_robot_code_idx" ON "humanoid_robots" USING btree ("robot_code");--> statement-breakpoint
CREATE INDEX "humanoid_vision_results_task_id_idx" ON "humanoid_vision_results" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "humanoid_vision_results_robot_id_idx" ON "humanoid_vision_results" USING btree ("humanoid_robot_id");--> statement-breakpoint
CREATE INDEX "humanoid_vision_results_result_idx" ON "humanoid_vision_results" USING btree ("result");--> statement-breakpoint
CREATE INDEX "humanoid_vision_results_created_at_idx" ON "humanoid_vision_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "humanoid_vision_tasks_task_type_idx" ON "humanoid_vision_tasks" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "humanoid_vision_tasks_is_active_idx" ON "humanoid_vision_tasks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "maintenance_execution_logs_wo_id_idx" ON "maintenance_execution_logs" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "maintenance_execution_logs_status_idx" ON "maintenance_execution_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_execution_logs_step_number_idx" ON "maintenance_execution_logs" USING btree ("step_number");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_equipment_type_idx" ON "maintenance_schedules" USING btree ("equipment_type");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_maintenance_type_idx" ON "maintenance_schedules" USING btree ("maintenance_type");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_next_due_date_idx" ON "maintenance_schedules" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_is_active_idx" ON "maintenance_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "maintenance_work_orders_code_idx" ON "maintenance_work_orders" USING btree ("work_order_code");--> statement-breakpoint
CREATE INDEX "maintenance_work_orders_status_idx" ON "maintenance_work_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_work_orders_equipment_id_idx" ON "maintenance_work_orders" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "maintenance_work_orders_assigned_to_idx" ON "maintenance_work_orders" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "maintenance_work_orders_scheduled_start_idx" ON "maintenance_work_orders" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX "material_handling_jobs_robot_id_idx" ON "material_handling_jobs" USING btree ("humanoid_robot_id");--> statement-breakpoint
CREATE INDEX "material_handling_jobs_status_idx" ON "material_handling_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_handling_jobs_priority_idx" ON "material_handling_jobs" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "material_handling_jobs_created_at_idx" ON "material_handling_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "material_handling_logs_job_id_idx" ON "material_handling_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "material_handling_logs_step_name_idx" ON "material_handling_logs" USING btree ("step_name");--> statement-breakpoint
CREATE INDEX "ido_foc_user_idx" ON "ido_file_context_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ido_foc_file_idx" ON "ido_file_context_log" USING btree ("file_id","file_source");--> statement-breakpoint
CREATE INDEX "ido_map_stage_idx" ON "ido_stage_document_ui_map" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "ido_map_doc_type_idx" ON "ido_stage_document_ui_map" USING btree ("document_type_key");--> statement-breakpoint
CREATE INDEX "ido_map_ui_page_idx" ON "ido_stage_document_ui_map" USING btree ("ui_page_path");--> statement-breakpoint
CREATE UNIQUE INDEX "ido_map_uk_stage_doc" ON "ido_stage_document_ui_map" USING btree ("stage_code","document_type_key");--> statement-breakpoint
CREATE INDEX "ido_rec_user_idx" ON "ido_storage_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ido_rec_project_idx" ON "ido_storage_recommendations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ido_rec_stage_idx" ON "ido_storage_recommendations" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "kaa_user_idx" ON "knowledge_access_authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kaa_status_idx" ON "knowledge_access_authorizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kaa_doc_idx" ON "knowledge_access_authorizations" USING btree ("doc_source_type","doc_source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "klp_user_doc_idx" ON "knowledge_learning_progress" USING btree ("user_id","doc_source_type","doc_source_id");--> statement-breakpoint
CREATE INDEX "klp_status_idx" ON "knowledge_learning_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "klp_category_idx" ON "knowledge_learning_progress" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "krr_role_idx" ON "knowledge_role_requirements" USING btree ("role");--> statement-breakpoint
CREATE INDEX "krr_category_idx" ON "knowledge_role_requirements" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "krr_skill_level_idx" ON "knowledge_role_requirements" USING btree ("skill_level_required");--> statement-breakpoint
CREATE UNIQUE INDEX "ksl_role_level_idx" ON "knowledge_skill_level_standards" USING btree ("role","department","skill_level");--> statement-breakpoint
CREATE INDEX "kta_user_idx" ON "knowledge_test_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kta_test_idx" ON "knowledge_test_attempts" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "kta_passed_idx" ON "knowledge_test_attempts" USING btree ("passed");--> statement-breakpoint
CREATE INDEX "ktt_category_idx" ON "knowledge_theory_tests" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "ktt_role_idx" ON "knowledge_theory_tests" USING btree ("target_role");--> statement-breakpoint
CREATE INDEX "ka_asset_type_idx" ON "knowledge_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "ka_m_phase_idx" ON "knowledge_assets" USING btree ("m_phase");--> statement-breakpoint
CREATE INDEX "ka_status_idx" ON "knowledge_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ka_equipment_family_idx" ON "knowledge_assets" USING btree ("equipment_family");--> statement-breakpoint
CREATE INDEX "ka_ai_task_idx" ON "knowledge_assets" USING btree ("ai_task_id");--> statement-breakpoint
CREATE INDEX "kvc_asset_idx" ON "knowledge_vector_chunks" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "kvc_chunk_order_idx" ON "knowledge_vector_chunks" USING btree ("asset_id","chunk_index");--> statement-breakpoint
CREATE INDEX "la_journey_idx" ON "lifecycle_activities" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "la_user_idx" ON "lifecycle_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "la_type_idx" ON "lifecycle_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "la_stage_idx" ON "lifecycle_activities" USING btree ("stage_code");--> statement-breakpoint
CREATE UNIQUE INDEX "lj_user_idx" ON "lifecycle_journeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lj_stage_idx" ON "lifecycle_journeys" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "lj_dept_idx" ON "lifecycle_journeys" USING btree ("department");--> statement-breakpoint
CREATE UNIQUE INDEX "lm_journey_stage_idx" ON "lifecycle_milestones" USING btree ("journey_id","stage_code");--> statement-breakpoint
CREATE INDEX "lm_user_idx" ON "lifecycle_milestones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lm_status_idx" ON "lifecycle_milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lct_project_id" ON "labor_cost_tracking" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_lct_process_code" ON "labor_cost_tracking" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "idx_lct_status" ON "labor_cost_tracking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lct_project_process" ON "labor_cost_tracking" USING btree ("project_id","process_code");--> statement-breakpoint
CREATE INDEX "idx_lte_employee_id" ON "labor_time_entries" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_lte_work_order_id" ON "labor_time_entries" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "idx_lte_station_id" ON "labor_time_entries" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_lte_process_code" ON "labor_time_entries" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "idx_lte_employee_start" ON "labor_time_entries" USING btree ("employee_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_lte_project_id" ON "labor_time_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_lte_source" ON "labor_time_entries" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_mcp_station_id" ON "mes_capacity_plans" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_mcp_plan_date" ON "mes_capacity_plans" USING btree ("plan_date");--> statement-breakpoint
CREATE INDEX "idx_mcp_station_date" ON "mes_capacity_plans" USING btree ("station_id","plan_date");--> statement-breakpoint
CREATE INDEX "idx_mcp_process_code" ON "mes_capacity_plans" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "idx_mda_quality_check_id" ON "mes_defect_analysis" USING btree ("quality_check_id");--> statement-breakpoint
CREATE INDEX "idx_mda_station_id" ON "mes_defect_analysis" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_mda_root_cause_category" ON "mes_defect_analysis" USING btree ("root_cause_category");--> statement-breakpoint
CREATE INDEX "idx_mda_status" ON "mes_defect_analysis" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mda_assigned_to" ON "mes_defect_analysis" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_med_equipment_id" ON "mes_equipment_downtime" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "idx_med_station_id" ON "mes_equipment_downtime" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_med_downtime_type" ON "mes_equipment_downtime" USING btree ("downtime_type");--> statement-breakpoint
CREATE INDEX "idx_med_start_at" ON "mes_equipment_downtime" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "idx_str_process_code" ON "skill_task_requirements" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "idx_str_skill_domain" ON "skill_task_requirements" USING btree ("required_skill_domain");--> statement-breakpoint
CREATE INDEX "mkt_plan_year_idx" ON "mkt_annual_plans" USING btree ("year");--> statement-breakpoint
CREATE INDEX "mkt_plan_status_idx" ON "mkt_annual_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mkt_plan_okr_idx" ON "mkt_annual_plans" USING btree ("okr_objective_id");--> statement-breakpoint
CREATE INDEX "mkt_spec_type_idx" ON "mkt_asset_quality_specs" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "mkt_review_status_idx" ON "mkt_asset_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mkt_review_type_idx" ON "mkt_asset_reviews" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "mkt_review_submitter_idx" ON "mkt_asset_reviews" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "mkt_channel_code_idx" ON "mkt_broadcast_channels" USING btree ("channel_code");--> statement-breakpoint
CREATE INDEX "mkt_channel_online_idx" ON "mkt_broadcast_channels" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "mkt_sched_channel_idx" ON "mkt_broadcast_schedules" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "mkt_sched_time_idx" ON "mkt_broadcast_schedules" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "mkt_sched_active_idx" ON "mkt_broadcast_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "mkt_budget_plan_idx" ON "mkt_budget_line_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "mkt_budget_cat_idx" ON "mkt_budget_line_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mkt_roi_exh_idx" ON "mkt_exhibition_roi" USING btree ("exhibition_id");--> statement-breakpoint
CREATE INDEX "mkt_task_exh_idx" ON "mkt_exhibition_tasks" USING btree ("exhibition_id");--> statement-breakpoint
CREATE INDEX "mkt_task_stage_idx" ON "mkt_exhibition_tasks" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "mkt_task_status_idx" ON "mkt_exhibition_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mkt_exh_stage_idx" ON "mkt_exhibitions" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "mkt_exh_start_idx" ON "mkt_exhibitions" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "mkt_exh_country_idx" ON "mkt_exhibitions" USING btree ("country");--> statement-breakpoint
CREATE INDEX "mkt_hist_type_idx" ON "mkt_historical_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "mkt_hist_year_idx" ON "mkt_historical_assets" USING btree ("year");--> statement-breakpoint
CREATE INDEX "mkt_hist_region_idx" ON "mkt_historical_assets" USING btree ("region");--> statement-breakpoint
CREATE INDEX "mkt_hist_vectorized_idx" ON "mkt_historical_assets" USING btree ("vectorized");--> statement-breakpoint
CREATE INDEX "mkt_kpi_plan_idx" ON "mkt_kpi_targets" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "mkt_kpi_rag_idx" ON "mkt_kpi_targets" USING btree ("rag_status");--> statement-breakpoint
CREATE INDEX "mkt_lead_exh_idx" ON "mkt_lead_captures" USING btree ("exhibition_id");--> statement-breakpoint
CREATE INDEX "mkt_lead_sync_idx" ON "mkt_lead_captures" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "mkt_vi_region_idx" ON "mkt_vi_rules" USING btree ("region");--> statement-breakpoint
CREATE INDEX "mkt_vi_category_idx" ON "mkt_vi_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_mar_project" ON "mech_acceptance_records" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_mar_phase" ON "mech_acceptance_records" USING btree ("acceptance_phase");--> statement-breakpoint
CREATE INDEX "idx_mar_result" ON "mech_acceptance_records" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_mar_customer" ON "mech_acceptance_records" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "idx_mcli_config" ON "mech_config_line_items" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "idx_mcli_category" ON "mech_config_line_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_mcc_customer" ON "mech_customer_configs" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "idx_mcc_region" ON "mech_customer_configs" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_mpc_project" ON "mech_phase_checklists" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_mpc_phase" ON "mech_phase_checklists" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "idx_mpc_status" ON "mech_phase_checklists" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mps_project" ON "mech_project_selections" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_mps_config" ON "mech_project_selections" USING btree ("customer_config_id");--> statement-breakpoint
CREATE INDEX "idx_mqc_project" ON "mech_quotation_checks" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_mqc_quotation" ON "mech_quotation_checks" USING btree ("quotation_number");--> statement-breakpoint
CREATE INDEX "idx_mqc_status" ON "mech_quotation_checks" USING btree ("compliance_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mrr_phase_rule" ON "mech_review_rules" USING btree ("phase","rule_code");--> statement-breakpoint
CREATE INDEX "idx_mrr_origin" ON "mech_review_rules" USING btree ("origin");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_msl_pair" ON "mech_standard_links" USING btree ("source_id","target_id","link_type");--> statement-breakpoint
CREATE INDEX "idx_msl_source" ON "mech_standard_links" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_msl_target" ON "mech_standard_links" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ms_code_ver" ON "mechanical_standards" USING btree ("code","version");--> statement-breakpoint
CREATE INDEX "idx_ms_origin" ON "mechanical_standards" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "idx_ms_category" ON "mechanical_standards" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_ms_status" ON "mechanical_standards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mes_qc_dispatch_id_idx" ON "mes_quality_checks" USING btree ("dispatch_id");--> statement-breakpoint
CREATE INDEX "mes_qc_station_id_idx" ON "mes_quality_checks" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "mes_qc_result_idx" ON "mes_quality_checks" USING btree ("result");--> statement-breakpoint
CREATE INDEX "mes_qc_created_at_idx" ON "mes_quality_checks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mes_station_station_id_idx" ON "mes_station_status" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "mes_station_status_idx" ON "mes_station_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mes_dispatch_work_order_id_idx" ON "mes_work_order_dispatch" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "mes_dispatch_station_id_idx" ON "mes_work_order_dispatch" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "mes_dispatch_operator_id_idx" ON "mes_work_order_dispatch" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "mes_dispatch_status_idx" ON "mes_work_order_dispatch" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mes_dispatch_actual_start_idx" ON "mes_work_order_dispatch" USING btree ("actual_start_time");--> statement-breakpoint
CREATE INDEX "idx_oee_snap_machine" ON "oee_snapshots" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_oee_snap_date" ON "oee_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_oee_snap_machine_date" ON "oee_snapshots" USING btree ("machine_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_psl_machine_id" ON "production_shift_logs" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_psl_shift_date" ON "production_shift_logs" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX "idx_psl_machine_date" ON "production_shift_logs" USING btree ("machine_id","shift_date");--> statement-breakpoint
CREATE INDEX "idx_oem_calls_client_created" ON "oem_api_call_logs" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_oem_calls_key" ON "oem_api_call_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "idx_oem_keys_client" ON "oem_api_keys" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_oem_keys_hash" ON "oem_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_oem_deliveries_status" ON "oem_webhook_deliveries" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_oem_deliveries_webhook" ON "oem_webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_oem_deliveries_client" ON "oem_webhook_deliveries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_oem_webhooks_client" ON "oem_webhooks" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_oem_webhooks_status" ON "oem_webhooks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_doc_audit_idx_document" ON "org_document_audit_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "org_doc_audit_idx_instance" ON "org_document_audit_log" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "org_doc_audit_idx_user" ON "org_document_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_doc_audit_idx_action" ON "org_document_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "org_doc_audit_idx_created" ON "org_document_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_doc_instances_uk_code" ON "org_document_instances" USING btree ("instance_code");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_template" ON "org_document_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_project" ON "org_document_instances" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_bu" ON "org_document_instances" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_status" ON "org_document_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_stage" ON "org_document_instances" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "org_doc_instances_idx_created" ON "org_document_instances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "org_doc_links_idx_source" ON "org_document_links" USING btree ("source_doc_id");--> statement-breakpoint
CREATE INDEX "org_doc_links_idx_target_doc" ON "org_document_links" USING btree ("target_doc_id");--> statement-breakpoint
CREATE INDEX "org_doc_links_idx_target_type" ON "org_document_links" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX "org_doc_links_idx_link_type" ON "org_document_links" USING btree ("link_type");--> statement-breakpoint
CREATE UNIQUE INDEX "org_doc_registry_uk_doc_code" ON "org_document_registry" USING btree ("doc_code");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_domain" ON "org_document_registry" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_subdomain" ON "org_document_registry" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_doc_type" ON "org_document_registry" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_status" ON "org_document_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_owner_role" ON "org_document_registry" USING btree ("owner_role");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_bu_code" ON "org_document_registry" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_review_overdue" ON "org_document_registry" USING btree ("review_overdue");--> statement-breakpoint
CREATE INDEX "org_doc_registry_idx_file_path" ON "org_document_registry" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "org_doc_review_idx_document" ON "org_document_review_schedule" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "org_doc_review_idx_status" ON "org_document_review_schedule" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_doc_review_idx_scheduled" ON "org_document_review_schedule" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "org_doc_review_idx_reviewer" ON "org_document_review_schedule" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "org_doc_versions_idx_document" ON "org_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "org_doc_versions_idx_latest" ON "org_document_versions" USING btree ("document_id","is_latest");--> statement-breakpoint
CREATE INDEX "org_doc_versions_idx_review_status" ON "org_document_versions" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "ps_adjust_cycle_idx" ON "ps_adjustment" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_adjust_employee_idx" ON "ps_adjustment" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_adjust_status_idx" ON "ps_adjustment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ps_allowance_cycle_idx" ON "ps_allowance_input" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_allowance_employee_idx" ON "ps_allowance_input" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_attendance_cycle_idx" ON "ps_attendance_input" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_attendance_employee_idx" ON "ps_attendance_input" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_calc_cycle_idx" ON "ps_calc_result" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_calc_employee_idx" ON "ps_calc_result" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_result_cycle_idx" ON "ps_final_result" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_result_employee_idx" ON "ps_final_result" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_payout_cycle_idx" ON "ps_payout" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_payout_status_idx" ON "ps_payout" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ps_perf_cycle_idx" ON "ps_performance_input" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_perf_employee_idx" ON "ps_performance_input" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_social_cycle_idx" ON "ps_social_fund_input" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_social_employee_idx" ON "ps_social_fund_input" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_tax_cycle_idx" ON "ps_tax_snapshot" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_tax_employee_idx" ON "ps_tax_snapshot" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "idx_pdm_deviations_project" ON "pdm_as_built_deviations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_deviations_baseline" ON "pdm_as_built_deviations" USING btree ("baseline_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_deviations_type" ON "pdm_as_built_deviations" USING btree ("deviation_type");--> statement-breakpoint
CREATE INDEX "idx_pdm_deviations_severity" ON "pdm_as_built_deviations" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_pdm_baselines_product" ON "pdm_baselines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_baselines_project" ON "pdm_baselines" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_baselines_gate" ON "pdm_baselines" USING btree ("gate_stage");--> statement-breakpoint
CREATE INDEX "idx_pdm_baselines_status" ON "pdm_baselines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pdm_eco_workflow_eco" ON "pdm_eco_workflow" USING btree ("eco_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_eco_workflow_step" ON "pdm_eco_workflow" USING btree ("step_type");--> statement-breakpoint
CREATE INDEX "idx_pdm_eco_workflow_status" ON "pdm_eco_workflow" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pdm_eco_workflow_assignee" ON "pdm_eco_workflow" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_field_insights_product" ON "pdm_field_insights" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_field_insights_type" ON "pdm_field_insights" USING btree ("insight_type");--> statement-breakpoint
CREATE INDEX "idx_pdm_field_insights_status" ON "pdm_field_insights" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pdm_field_insights_severity" ON "pdm_field_insights" USING btree ("severity_score");--> statement-breakpoint
CREATE INDEX "idx_pdm_products_family" ON "pdm_products" USING btree ("product_family");--> statement-breakpoint
CREATE INDEX "idx_pdm_products_lifecycle" ON "pdm_products" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "idx_pdm_products_bu" ON "pdm_products" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "idx_pdm_readiness_project" ON "pdm_readiness_checks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_readiness_type" ON "pdm_readiness_checks" USING btree ("check_type");--> statement-breakpoint
CREATE INDEX "idx_pdm_readiness_status" ON "pdm_readiness_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pdm_requirements_project" ON "pdm_requirements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_requirements_product" ON "pdm_requirements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pdm_requirements_category" ON "pdm_requirements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_pdm_requirements_verification" ON "pdm_requirements" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_360_target_period" ON "perf_360_feedback" USING btree ("target_employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_360_reviewer" ON "perf_360_feedback" USING btree ("reviewer_employee_id");--> statement-breakpoint
CREATE INDEX "idx_calibration_adj_session" ON "perf_calibration_adjustments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_calibration_adj_employee" ON "perf_calibration_adjustments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_calibration_session_period" ON "perf_calibration_sessions" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_calibration_session_status" ON "perf_calibration_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_composite_employee_period" ON "perf_composite_scores" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_composite_dept_period" ON "perf_composite_scores" USING btree ("department","period");--> statement-breakpoint
CREATE INDEX "idx_composite_status" ON "perf_composite_scores" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_forced_dist_scope" ON "perf_forced_distribution_configs" USING btree ("department","bu_code");--> statement-breakpoint
CREATE INDEX "idx_incentive_code" ON "perf_incentive_catalog" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_incentive_category" ON "perf_incentive_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_weight_config_scope" ON "perf_scoring_weight_configs" USING btree ("department","role","bu_code");--> statement-breakpoint
CREATE INDEX "ps_anomaly_cycle_idx" ON "ps_anomaly" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_anomaly_category_idx" ON "ps_anomaly" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ps_anomaly_resolved_idx" ON "ps_anomaly" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "ps_approval_cycle_stage_idx" ON "ps_approval_flow" USING btree ("cycle_id","stage_order");--> statement-breakpoint
CREATE INDEX "ps_lock_cycle_idx" ON "ps_lock_record" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_evidence_cycle_employee_idx" ON "ps_perf_evidence" USING btree ("cycle_id","employee_name");--> statement-breakpoint
CREATE INDEX "ps_review_cycle_idx" ON "ps_perf_review" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "ps_review_employee_idx" ON "ps_perf_review" USING btree ("employee_name");--> statement-breakpoint
CREATE INDEX "ps_post_payout_cycle_idx" ON "ps_post_payout_metrics" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "perf_rec_bu_idx" ON "performance_records" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "perf_rec_user_idx" ON "performance_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "perf_rec_year_quarter_idx" ON "performance_records" USING btree ("year","quarter");--> statement-breakpoint
CREATE INDEX "perf_rec_status_idx" ON "performance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "perf_rec_frozen_idx" ON "performance_records" USING btree ("is_frozen");--> statement-breakpoint
CREATE INDEX "violation_evt_severity_idx" ON "violation_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "violation_evt_bu_idx" ON "violation_events" USING btree ("bu_id");--> statement-breakpoint
CREATE INDEX "violation_evt_user_idx" ON "violation_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "violation_evt_status_idx" ON "violation_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "violation_evt_type_idx" ON "violation_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "violation_evt_created_idx" ON "violation_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "route_pattern_idx" ON "grt_route_permissions" USING btree ("route_pattern");--> statement-breakpoint
CREATE INDEX "route_required_permission_idx" ON "grt_route_permissions" USING btree ("required_permission");--> statement-breakpoint
CREATE INDEX "plc_alarm_project_idx" ON "plc_alarm_definitions" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_alarm_class_idx" ON "plc_alarm_definitions" USING btree ("alarm_class");--> statement-breakpoint
CREATE INDEX "plc_alarm_station_idx" ON "plc_alarm_definitions" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "plc_eplan_project_idx" ON "plc_eplan_schematics" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_eplan_category_idx" ON "plc_eplan_schematics" USING btree ("page_category");--> statement-breakpoint
CREATE INDEX "plc_io_project_idx" ON "plc_io_mappings" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_io_station_idx" ON "plc_io_mappings" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "plc_io_type_idx" ON "plc_io_mappings" USING btree ("io_type");--> statement-breakpoint
CREATE INDEX "plc_modules_project_idx" ON "plc_program_modules" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_modules_type_idx" ON "plc_program_modules" USING btree ("module_type");--> statement-breakpoint
CREATE INDEX "plc_modules_parent_idx" ON "plc_program_modules" USING btree ("parent_module_id");--> statement-breakpoint
CREATE INDEX "plc_projects_project_idx" ON "plc_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plc_projects_brand_idx" ON "plc_projects" USING btree ("plc_brand");--> statement-breakpoint
CREATE INDEX "plc_access_project_idx" ON "plc_user_access_levels" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_version_project_idx" ON "plc_version_history" USING btree ("plc_project_id");--> statement-breakpoint
CREATE INDEX "plc_version_type_idx" ON "plc_version_history" USING btree ("version_type");--> statement-breakpoint
CREATE INDEX "par_project_id_idx" ON "project_agent_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "par_review_type_idx" ON "project_agent_reviews" USING btree ("review_type");--> statement-breakpoint
CREATE INDEX "par_status_idx" ON "project_agent_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "par_ai_task_id_idx" ON "project_agent_reviews" USING btree ("ai_task_id");--> statement-breakpoint
CREATE INDEX "ap_snapshot_date_idx" ON "ap_aging_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "ap_supplier_id_idx" ON "ap_aging_snapshots" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ar_snapshot_date_idx" ON "ar_aging_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "ar_customer_id_idx" ON "ar_aging_snapshots" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ar_project_code_idx" ON "ar_aging_snapshots" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "bp_bu_code_idx" ON "bid_projects" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "bp_status_idx" ON "bid_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bp_sales_rep_idx" ON "bid_projects" USING btree ("sales_rep_id");--> statement-breakpoint
CREATE INDEX "bp_customer_name_idx" ON "bid_projects" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "bp_bid_deadline_idx" ON "bid_projects" USING btree ("bid_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "bv_project_type_version_idx" ON "budget_versions" USING btree ("project_id","version_type","version_number");--> statement-breakpoint
CREATE INDEX "bv_project_code_idx" ON "budget_versions" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "bv_version_type_idx" ON "budget_versions" USING btree ("version_type");--> statement-breakpoint
CREATE INDEX "bv_is_active_idx" ON "budget_versions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cfr_record_date_idx" ON "cash_flow_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "cfr_flow_type_idx" ON "cash_flow_records" USING btree ("flow_type");--> statement-breakpoint
CREATE INDEX "cfr_flow_direction_idx" ON "cash_flow_records" USING btree ("flow_direction");--> statement-breakpoint
CREATE INDEX "cfr_project_code_idx" ON "cash_flow_records" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "cfr_fiscal_idx" ON "cash_flow_records" USING btree ("fiscal_year","fiscal_period");--> statement-breakpoint
CREATE INDEX "epr_category_idx" ON "expense_policy_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "epr_city_tier_idx" ON "expense_policy_rules" USING btree ("city_tier");--> statement-breakpoint
CREATE INDEX "epr_is_active_idx" ON "expense_policy_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "fai_alert_code_idx" ON "finance_alert_instances" USING btree ("alert_code");--> statement-breakpoint
CREATE INDEX "fai_severity_idx" ON "finance_alert_instances" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "fai_status_idx" ON "finance_alert_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fai_project_code_idx" ON "finance_alert_instances" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "fai_triggered_at_idx" ON "finance_alert_instances" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "far_alert_category_idx" ON "finance_alert_rules" USING btree ("alert_category");--> statement-breakpoint
CREATE INDEX "far_is_active_idx" ON "finance_alert_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "lcp_project_code_idx" ON "labor_cost_pools" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "lcp_bu_code_idx" ON "labor_cost_pools" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "lcp_status_idx" ON "labor_cost_pools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_timeline_idx_project" ON "project_activity_timeline" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "project_timeline_idx_type" ON "project_activity_timeline" USING btree ("activityType");--> statement-breakpoint
CREATE INDEX "project_timeline_idx_module" ON "project_activity_timeline" USING btree ("sourceModule");--> statement-breakpoint
CREATE INDEX "project_timeline_idx_phase" ON "project_activity_timeline" USING btree ("projectPhase");--> statement-breakpoint
CREATE INDEX "project_timeline_idx_time" ON "project_activity_timeline" USING btree ("performedAt");--> statement-breakpoint
CREATE INDEX "project_identity_map_idx_stage" ON "project_identity_map" USING btree ("currentStage");--> statement-breakpoint
CREATE INDEX "project_identity_map_idx_customer" ON "project_identity_map" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "project_identity_map_idx_bu" ON "project_identity_map" USING btree ("buCode");--> statement-breakpoint
CREATE INDEX "idx_pca_project" ON "project_cost_actuals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pq_project" ON "project_quotes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pq_bu" ON "project_quotes" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "idx_pq_status" ON "project_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_qli_quote_cat" ON "quote_line_items" USING btree ("quote_id","category");--> statement-breakpoint
CREATE INDEX "idx_rate_year_cat" ON "quote_rate_configs" USING btree ("fiscal_year","category");--> statement-breakpoint
CREATE INDEX "idx_raal_request" ON "remote_access_audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_raal_action" ON "remote_access_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_rar_status" ON "remote_access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rar_engineer" ON "remote_access_requests" USING btree ("engineer_id");--> statement-breakpoint
CREATE INDEX "idx_rar_expires" ON "remote_access_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rnd_activity_log_idx_entity" ON "rnd_activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "rnd_activity_log_idx_action" ON "rnd_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "rnd_activity_log_idx_user" ON "rnd_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rnd_activity_log_idx_created" ON "rnd_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_activity_log_idx_type" ON "rnd_activity_log" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "rnd_routings_idx_project" ON "rnd_assembly_routings" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_routings_idx_status" ON "rnd_assembly_routings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rnd_routings_idx_created" ON "rnd_assembly_routings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_bom_snapshots_idx_bom" ON "rnd_bom_snapshots" USING btree ("sandbox_bom_id");--> statement-breakpoint
CREATE INDEX "rnd_bom_snapshots_idx_project" ON "rnd_bom_snapshots" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_bom_snapshots_idx_stage" ON "rnd_bom_snapshots" USING btree ("gate_stage");--> statement-breakpoint
CREATE INDEX "rnd_bom_snapshots_idx_created" ON "rnd_bom_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_gate_reviews_idx_project" ON "rnd_gate_reviews" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_gate_reviews_idx_stage" ON "rnd_gate_reviews" USING btree ("gate_stage");--> statement-breakpoint
CREATE INDEX "rnd_gate_reviews_idx_decision" ON "rnd_gate_reviews" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "rnd_gate_reviews_idx_reviewer" ON "rnd_gate_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "rnd_gate_reviews_idx_created" ON "rnd_gate_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_category" ON "rnd_projects" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_stage" ON "rnd_projects" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_status" ON "rnd_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_bu" ON "rnd_projects" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_lead" ON "rnd_projects" USING btree ("lead_engineer_id");--> statement-breakpoint
CREATE INDEX "rnd_projects_idx_created" ON "rnd_projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_steps_idx_routing" ON "rnd_routing_steps" USING btree ("routing_id");--> statement-breakpoint
CREATE INDEX "rnd_steps_idx_type" ON "rnd_routing_steps" USING btree ("step_type");--> statement-breakpoint
CREATE INDEX "rnd_steps_idx_number" ON "rnd_routing_steps" USING btree ("routing_id","step_number");--> statement-breakpoint
CREATE INDEX "rnd_bom_items_idx_bom" ON "rnd_sandbox_bom_items" USING btree ("sandbox_bom_id");--> statement-breakpoint
CREATE INDEX "rnd_bom_items_idx_parent" ON "rnd_sandbox_bom_items" USING btree ("parent_item_id");--> statement-breakpoint
CREATE INDEX "rnd_bom_items_idx_part" ON "rnd_sandbox_bom_items" USING btree ("part_number");--> statement-breakpoint
CREATE INDEX "rnd_bom_items_idx_source" ON "rnd_sandbox_bom_items" USING btree ("component_source");--> statement-breakpoint
CREATE INDEX "rnd_bom_items_idx_critical" ON "rnd_sandbox_bom_items" USING btree ("is_critical_path");--> statement-breakpoint
CREATE INDEX "rnd_sandbox_boms_idx_project" ON "rnd_sandbox_boms" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_sandbox_boms_idx_status" ON "rnd_sandbox_boms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rnd_sandbox_boms_idx_parent" ON "rnd_sandbox_boms" USING btree ("parent_bom_id");--> statement-breakpoint
CREATE INDEX "rnd_sandbox_boms_idx_created" ON "rnd_sandbox_boms" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_project" ON "rnd_test_records" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_stage" ON "rnd_test_records" USING btree ("gate_stage");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_type" ON "rnd_test_records" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_verdict" ON "rnd_test_records" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_code" ON "rnd_test_records" USING btree ("test_code");--> statement-breakpoint
CREATE INDEX "rnd_test_records_idx_created" ON "rnd_test_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rnd_test_suites_idx_project" ON "rnd_test_suites" USING btree ("rnd_project_id");--> statement-breakpoint
CREATE INDEX "rnd_test_suites_idx_gate" ON "rnd_test_suites" USING btree ("target_gate");--> statement-breakpoint
CREATE INDEX "rnd_test_suites_idx_created" ON "rnd_test_suites" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otr_project_id_idx" ON "oiling_torque_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "otr_equipment_id_idx" ON "oiling_torque_records" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "otr_verdict_idx" ON "oiling_torque_records" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "otr_created_at_idx" ON "oiling_torque_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otr_is_over_torque_idx" ON "oiling_torque_records" USING btree ("is_over_torque");--> statement-breakpoint
CREATE INDEX "rca_project_id_idx" ON "robot_cleaning_actions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rca_equipment_id_idx" ON "robot_cleaning_actions" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "rca_robot_code_idx" ON "robot_cleaning_actions" USING btree ("robot_code");--> statement-breakpoint
CREATE INDEX "rca_created_at_idx" ON "robot_cleaning_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rca_verdict_idx" ON "robot_cleaning_actions" USING btree ("cleanliness_verdict");--> statement-breakpoint
CREATE INDEX "rca_has_alert_idx" ON "robot_cleaning_actions" USING btree ("has_alert");--> statement-breakpoint
CREATE INDEX "tpe_project_id_idx" ON "tech_performance_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tpe_user_id_idx" ON "tech_performance_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tpe_entry_type_idx" ON "tech_performance_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "tpe_work_date_idx" ON "tech_performance_entries" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "tpe_cleaning_action_id_idx" ON "tech_performance_entries" USING btree ("robot_cleaning_action_id");--> statement-breakpoint
CREATE INDEX "tpe_oiling_torque_id_idx" ON "tech_performance_entries" USING btree ("oiling_torque_record_id");--> statement-breakpoint
CREATE INDEX "dc_session_idx" ON "debug_commands" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "dc_robot_idx" ON "debug_commands" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "dc_sent_idx" ON "debug_commands" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "dps_session_idx" ON "debug_parameter_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "dps_robot_idx" ON "debug_parameter_snapshots" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "dps_captured_idx" ON "debug_parameter_snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "ds_robot_idx" ON "debug_sessions" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "ds_status_idx" ON "debug_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ds_created_idx" ON "debug_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rca_robot_idx" ON "robot_condition_alerts" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "rca_severity_idx" ON "robot_condition_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "rca_alert_type_idx" ON "robot_condition_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "rca_created_idx" ON "robot_condition_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rcl_robot_idx" ON "robot_connection_logs" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "rcl_event_idx" ON "robot_connection_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "rcl_created_idx" ON "robot_connection_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rdss_robot_idx" ON "robot_dt_state_snapshots" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "rdss_snapshot_idx" ON "robot_dt_state_snapshots" USING btree ("snapshot_at");--> statement-breakpoint
CREATE INDEX "rfr_brand_idx" ON "robot_fleet_registry" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "rfr_status_idx" ON "robot_fleet_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rfr_process_idx" ON "robot_fleet_registry" USING btree ("assigned_process");--> statement-breakpoint
CREATE INDEX "rfr_cell_idx" ON "robot_fleet_registry" USING btree ("cell_id");--> statement-breakpoint
CREATE INDEX "rpc_robot_idx" ON "robot_protocol_configs" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "ep_project_stage_idx" ON "equipment_programs" USING btree ("project_id","stage_code");--> statement-breakpoint
CREATE INDEX "ep_robot_idx" ON "equipment_programs" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "ep_program_name_idx" ON "equipment_programs" USING btree ("program_name");--> statement-breakpoint
CREATE INDEX "ep_status_idx" ON "equipment_programs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ep_prev_version_idx" ON "equipment_programs" USING btree ("previous_version_id");--> statement-breakpoint
CREATE INDEX "pel_program_idx" ON "program_execution_logs" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "pel_robot_idx" ON "program_execution_logs" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "pel_project_stage_idx" ON "program_execution_logs" USING btree ("project_id","stage_code");--> statement-breakpoint
CREATE INDEX "pel_result_idx" ON "program_execution_logs" USING btree ("result");--> statement-breakpoint
CREATE INDEX "pel_created_idx" ON "program_execution_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rsa_project_stage_idx" ON "robot_stage_assignments" USING btree ("project_id","stage_code");--> statement-breakpoint
CREATE INDEX "rsa_robot_idx" ON "robot_stage_assignments" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "rsa_status_idx" ON "robot_stage_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scc_assignment_idx" ON "stage_commissioning_checklists" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "scc_robot_idx" ON "stage_commissioning_checklists" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "scc_project_idx" ON "stage_commissioning_checklists" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scc_category_idx" ON "stage_commissioning_checklists" USING btree ("category");--> statement-breakpoint
CREATE INDEX "scc_status_idx" ON "stage_commissioning_checklists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_annual_budgets_bu_idx" ON "client_annual_budgets" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "client_annual_budgets_year_idx" ON "client_annual_budgets" USING btree ("year");--> statement-breakpoint
CREATE INDEX "client_annual_budgets_status_idx" ON "client_annual_budgets" USING btree ("deadline_status");--> statement-breakpoint
CREATE INDEX "project_bidding_strategies_stage_idx" ON "project_bidding_strategies" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "project_bidding_strategies_bu_idx" ON "project_bidding_strategies" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "project_bidding_strategies_status_idx" ON "project_bidding_strategies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_registry_sandbox_idx" ON "agent_registry" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "agent_registry_status_idx" ON "agent_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sandbox_event_type_idx" ON "sandbox_event_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sandbox_event_source_idx" ON "sandbox_event_log" USING btree ("source_module");--> statement-breakpoint
CREATE INDEX "sandbox_event_created_idx" ON "sandbox_event_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_tasks_type_idx" ON "ai_tasks" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_tasks_status_idx" ON "ai_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_tasks_worker_lock_idx" ON "ai_tasks" USING btree ("worker_lock_id");--> statement-breakpoint
CREATE INDEX "idx_auto_meetings_type" ON "automation_triggered_meetings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_auto_meetings_status" ON "automation_triggered_meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_auto_meetings_scheduled" ON "automation_triggered_meetings" USING btree ("scheduled_start");--> statement-breakpoint
CREATE INDEX "bu_sales_plan_adj_plan_idx" ON "bu_sales_plan_adjustments" USING btree ("bu_sales_plan_id");--> statement-breakpoint
CREATE INDEX "bu_sales_plan_details_plan_idx" ON "bu_sales_plan_details" USING btree ("bu_sales_plan_id");--> statement-breakpoint
CREATE INDEX "bu_sales_plans_year_idx" ON "bu_sales_plans" USING btree ("year");--> statement-breakpoint
CREATE INDEX "bu_sales_plans_dept_idx" ON "bu_sales_plans" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "daily_plan_inbox_target_user_idx" ON "daily_plan_inbox" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "daily_plan_inbox_status_idx" ON "daily_plan_inbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_installation_delivery" ON "delivery_installations" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_installation_status" ON "delivery_installations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sat_delivery" ON "delivery_sat_records" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_sat_status" ON "delivery_sat_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sat_approval" ON "delivery_sat_records" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "idx_shipment_delivery" ON "delivery_shipments" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_tracking" ON "delivery_shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "idx_shipment_status" ON "delivery_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_form_data_cache_app_form" ON "jiandaoyun_form_data_cache" USING btree ("jdy_app_id","jdy_form_id");--> statement-breakpoint
CREATE INDEX "pdr_project_id_idx" ON "project_delete_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pdr_status_idx" ON "project_delete_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cc_user_period_idx" ON "compliance_commitments" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "cc_period_idx" ON "compliance_commitments" USING btree ("period");--> statement-breakpoint
CREATE INDEX "sal_user_idx" ON "compliance_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sal_action_idx" ON "compliance_audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "sal_created_idx" ON "compliance_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sal_risk_idx" ON "compliance_audit_logs" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "wr_status_idx" ON "whistleblower_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wr_category_idx" ON "whistleblower_reports" USING btree ("category");--> statement-breakpoint
CREATE INDEX "wr_created_idx" ON "whistleblower_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cr_part_type_idx" ON "cleaning_recipes" USING btree ("part_type");--> statement-breakpoint
CREATE INDEX "cr_feature_type_idx" ON "cleaning_recipes" USING btree ("feature_type");--> statement-breakpoint
CREATE INDEX "cr_status_idx" ON "cleaning_recipes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cr_semi_compliant_idx" ON "cleaning_recipes" USING btree ("semi_compliant");--> statement-breakpoint
CREATE INDEX "cr_tsmc_qualified_idx" ON "cleaning_recipes" USING btree ("tsmc_qualified");--> statement-breakpoint
CREATE INDEX "cel_cleanroom_id_idx" ON "cleanroom_environment_logs" USING btree ("cleanroom_id");--> statement-breakpoint
CREATE INDEX "cel_verdict_idx" ON "cleanroom_environment_logs" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "cel_measured_at_idx" ON "cleanroom_environment_logs" USING btree ("measured_at");--> statement-breakpoint
CREATE INDEX "cel_iso_class_idx" ON "cleanroom_environment_logs" USING btree ("iso_class");--> statement-breakpoint
CREATE INDEX "sps_standard_code_idx" ON "semi_process_standards" USING btree ("standard_code");--> statement-breakpoint
CREATE INDEX "sps_category_idx" ON "semi_process_standards" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sps_tsmc_requirement_idx" ON "semi_process_standards" USING btree ("tsmc_requirement");--> statement-breakpoint
CREATE INDEX "data_export_requests_idx_requester" ON "data_export_requests" USING btree ("requesterId");--> statement-breakpoint
CREATE INDEX "data_export_requests_idx_status" ON "data_export_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_export_requests_idx_token" ON "data_export_requests" USING btree ("downloadToken");--> statement-breakpoint
CREATE INDEX "sensitive_field_policies_idx_table" ON "sensitive_field_policies" USING btree ("tableName");--> statement-breakpoint
CREATE INDEX "sensitive_field_policies_idx_level" ON "sensitive_field_policies" USING btree ("sensitivityLevel");--> statement-breakpoint
CREATE INDEX "anomaly_patterns_active_idx" ON "anomaly_patterns" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "anomaly_patterns_severity_idx" ON "anomaly_patterns" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "fused_readings_equipment_idx" ON "fused_equipment_readings" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "fused_readings_timestamp_idx" ON "fused_equipment_readings" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "fused_readings_anomaly_idx" ON "fused_equipment_readings" USING btree ("anomaly_score");--> statement-breakpoint
CREATE INDEX "idx_sdk_category_region_key" ON "service_dashboard_kpis" USING btree ("category","region","key");--> statement-breakpoint
CREATE INDEX "idx_sdl_region" ON "service_dashboard_locations" USING btree ("region");--> statement-breakpoint
CREATE INDEX "ehs_customer_idx" ON "equipment_health_snapshots" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ehs_equipment_idx" ON "equipment_health_snapshots" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "ehs_health_score_idx" ON "equipment_health_snapshots" USING btree ("health_score");--> statement-breakpoint
CREATE INDEX "ehs_is_latest_idx" ON "equipment_health_snapshots" USING btree ("is_latest");--> statement-breakpoint
CREATE INDEX "ehs_snapshot_date_idx" ON "equipment_health_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "scb_block_type_idx" ON "showcase_content_blocks" USING btree ("block_type");--> statement-breakpoint
CREATE INDEX "scb_template_id_idx" ON "showcase_content_blocks" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "scb_is_published_idx" ON "showcase_content_blocks" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "scb_expiry_idx" ON "showcase_content_blocks" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "scb_language_idx" ON "showcase_content_blocks" USING btree ("language");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_customer_code_idx" ON "showcase_loyalty_accounts" USING btree ("customer_code");--> statement-breakpoint
CREATE INDEX "sla_tier_idx" ON "showcase_loyalty_accounts" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "sla_available_points_idx" ON "showcase_loyalty_accounts" USING btree ("available_points");--> statement-breakpoint
CREATE INDEX "sla_is_active_idx" ON "showcase_loyalty_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "spt_account_idx" ON "showcase_point_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "spt_customer_code_idx" ON "showcase_point_transactions" USING btree ("customer_code");--> statement-breakpoint
CREATE INDEX "spt_transaction_type_idx" ON "showcase_point_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "spt_source_type_idx" ON "showcase_point_transactions" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "spt_created_idx" ON "showcase_point_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "spt_expires_idx" ON "showcase_point_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sref_referrer_idx" ON "showcase_referrals" USING btree ("referrer_account_id");--> statement-breakpoint
CREATE INDEX "sref_referrer_code_idx" ON "showcase_referrals" USING btree ("referrer_code");--> statement-breakpoint
CREATE INDEX "sref_status_idx" ON "showcase_referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sref_created_idx" ON "showcase_referrals" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "src_reward_code_idx" ON "showcase_rewards_catalog" USING btree ("reward_code");--> statement-breakpoint
CREATE INDEX "src_category_idx" ON "showcase_rewards_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "src_is_active_idx" ON "showcase_rewards_catalog" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "src_points_cost_idx" ON "showcase_rewards_catalog" USING btree ("points_cost");--> statement-breakpoint
CREATE UNIQUE INDEX "sst_ticket_code_idx" ON "showcase_support_tickets" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "sst_token_idx" ON "showcase_support_tickets" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "sst_issue_type_idx" ON "showcase_support_tickets" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "sst_status_idx" ON "showcase_support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sst_assigned_idx" ON "showcase_support_tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "sst_created_idx" ON "showcase_support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sve_token_idx" ON "showcase_visitor_events" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "sve_session_idx" ON "showcase_visitor_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sve_event_type_idx" ON "showcase_visitor_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sve_device_idx" ON "showcase_visitor_events" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "sve_funnel_idx" ON "showcase_visitor_events" USING btree ("funnel_stage");--> statement-breakpoint
CREATE INDEX "sve_created_idx" ON "showcase_visitor_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ga_access_token_idx" ON "guest_authorizations" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "ga_showcase_id_idx" ON "guest_authorizations" USING btree ("showcase_id");--> statement-breakpoint
CREATE INDEX "ga_target_client_idx" ON "guest_authorizations" USING btree ("target_client");--> statement-breakpoint
CREATE INDEX "ga_expires_at_idx" ON "guest_authorizations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ga_is_revoked_idx" ON "guest_authorizations" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX "ga_access_level_idx" ON "guest_authorizations" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX "ga_recipient_role_idx" ON "guest_authorizations" USING btree ("recipient_role");--> statement-breakpoint
CREATE INDEX "st_product_type_idx" ON "showcase_templates" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "st_is_active_idx" ON "showcase_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "st_created_at_idx" ON "showcase_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "st_scenario_type_idx" ON "showcase_templates" USING btree ("scenario_type");--> statement-breakpoint
CREATE INDEX "st_target_year_idx" ON "showcase_templates" USING btree ("target_year");--> statement-breakpoint
CREATE INDEX "idx_answer_session" ON "skill_assessment_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_answer_question" ON "skill_assessment_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_paper_position" ON "skill_assessment_papers" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_paper_level" ON "skill_assessment_papers" USING btree ("target_level");--> statement-breakpoint
CREATE INDEX "idx_paper_published" ON "skill_assessment_papers" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "idx_session_employee" ON "skill_assessment_sessions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_session_position" ON "skill_assessment_sessions" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_session_status" ON "skill_assessment_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_session_level" ON "skill_assessment_sessions" USING btree ("target_level");--> statement-breakpoint
CREATE INDEX "idx_cert_employee" ON "skill_level_certs" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_cert_position" ON "skill_level_certs" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_cert_level" ON "skill_level_certs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_cert_status" ON "skill_level_certs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_position_profile_key" ON "skill_position_profiles" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_position_profile_dept" ON "skill_position_profiles" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_question_position" ON "skill_question_bank" USING btree ("position_key");--> statement-breakpoint
CREATE INDEX "idx_question_domain" ON "skill_question_bank" USING btree ("domain_key");--> statement-breakpoint
CREATE INDEX "idx_question_difficulty" ON "skill_question_bank" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_question_type" ON "skill_question_bank" USING btree ("question_type");--> statement-breakpoint
CREATE INDEX "idx_question_active" ON "skill_question_bank" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cif_project_idx" ON "customer_interaction_feedback" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cif_meeting_idx" ON "customer_interaction_feedback" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "cif_feedback_type_idx" ON "customer_interaction_feedback" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX "hr_ai_performance_user_month_idx" ON "hr_ai_performance" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "hr_ai_performance_month_idx" ON "hr_ai_performance" USING btree ("month");--> statement-breakpoint
CREATE INDEX "hr_ai_performance_score_idx" ON "hr_ai_performance" USING btree ("meeting_score");--> statement-breakpoint
CREATE INDEX "hr_penalties_user_idx" ON "hr_penalties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hr_penalties_level_idx" ON "hr_penalties" USING btree ("penalty_level");--> statement-breakpoint
CREATE INDEX "hr_penalties_meeting_idx" ON "hr_penalties" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "hr_penalties_created_at_idx" ON "hr_penalties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "meeting_action_items_meeting_idx" ON "meeting_action_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_action_items_assigned_idx" ON "meeting_action_items" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "meeting_action_items_status_idx" ON "meeting_action_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_attendance_meeting_idx" ON "meeting_attendance" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_attendance_user_idx" ON "meeting_attendance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meeting_attendance_status_idx" ON "meeting_attendance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_interactions_meeting_idx" ON "meeting_interactions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_interactions_user_idx" ON "meeting_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meeting_review_eval_meeting_idx" ON "meeting_review_evaluations" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_review_eval_speaker_idx" ON "meeting_review_evaluations" USING btree ("speaker_id");--> statement-breakpoint
CREATE INDEX "meeting_review_eval_evaluator_idx" ON "meeting_review_evaluations" USING btree ("evaluator_id");--> statement-breakpoint
CREATE INDEX "meeting_speakers_meeting_idx" ON "meeting_speakers" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_speakers_profile_idx" ON "meeting_speakers" USING btree ("matched_profile_id","matched_profile_type");--> statement-breakpoint
CREATE INDEX "meeting_speakers_label_idx" ON "meeting_speakers" USING btree ("speaker_label");--> statement-breakpoint
CREATE INDEX "sys_meetings_status_idx" ON "sys_meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sys_meetings_type_idx" ON "sys_meetings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sys_meetings_scheduled_start_idx" ON "sys_meetings" USING btree ("scheduled_start");--> statement-breakpoint
CREATE INDEX "sys_meetings_project_idx" ON "sys_meetings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sys_meetings_t_project_idx" ON "sys_meetings" USING btree ("t_project_id");--> statement-breakpoint
CREATE INDEX "sys_meetings_department_idx" ON "sys_meetings" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "sys_meetings_stage_code_idx" ON "sys_meetings" USING btree ("stage_code");--> statement-breakpoint
CREATE INDEX "sys_meetings_meeting_category_idx" ON "sys_meetings" USING btree ("meeting_category");--> statement-breakpoint
CREATE INDEX "sys_meetings_direction_idx" ON "sys_meetings" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "t_project_evidence_t_project_idx" ON "t_project_evidence" USING btree ("t_project_id");--> statement-breakpoint
CREATE INDEX "t_project_evidence_meeting_idx" ON "t_project_evidence" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "t_project_evidence_type_idx" ON "t_project_evidence" USING btree ("evidence_type");--> statement-breakpoint
CREATE INDEX "t_projects_t_number_idx" ON "t_projects" USING btree ("t_number");--> statement-breakpoint
CREATE INDEX "t_projects_status_idx" ON "t_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "t_projects_customer_idx" ON "t_projects" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "attendance_records_employee_period_idx" ON "attendance_records" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "payroll_approval_logs_ledger_idx" ON "payroll_approval_logs" USING btree ("ledger_id");--> statement-breakpoint
CREATE INDEX "excellence_awards_period_idx" ON "payroll_excellence_awards" USING btree ("period");--> statement-breakpoint
CREATE INDEX "payroll_ledgers_employee_period_idx" ON "payroll_ledgers" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "payroll_ledgers_status_idx" ON "payroll_ledgers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_ledgers_ledger_code_idx" ON "payroll_ledgers" USING btree ("ledger_code");--> statement-breakpoint
CREATE INDEX "payroll_ledgers_period_idx" ON "payroll_ledgers" USING btree ("period");--> statement-breakpoint
CREATE INDEX "perf_override_audit_period_idx" ON "perf_wage_override_audit" USING btree ("period");--> statement-breakpoint
CREATE INDEX "perf_override_audit_employee_idx" ON "perf_wage_override_audit" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "perf_eval_employee_period_idx" ON "performance_evaluations" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "salary_structures_employee_idx" ON "salary_structures" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "salary_structures_effective_idx" ON "salary_structures" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "sbwh_project_idx" ON "scheduling_bom_work_hours" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sbwh_process_idx" ON "scheduling_bom_work_hours" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "sbwh_status_idx" ON "scheduling_bom_work_hours" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sbwh_bom_step_idx" ON "scheduling_bom_work_hours" USING btree ("bom_step_id");--> statement-breakpoint
CREATE INDEX "sbwh_project_process_idx" ON "scheduling_bom_work_hours" USING btree ("project_id","process_code");--> statement-breakpoint
CREATE INDEX "shb_process_idx" ON "scheduling_historical_benchmarks" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "shb_category_idx" ON "scheduling_historical_benchmarks" USING btree ("product_category");--> statement-breakpoint
CREATE INDEX "shb_process_category_idx" ON "scheduling_historical_benchmarks" USING btree ("process_code","product_category");--> statement-breakpoint
CREATE INDEX "smc_project_idx" ON "scheduling_milestone_checkpoints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "smc_milestone_idx" ON "scheduling_milestone_checkpoints" USING btree ("milestone_code");--> statement-breakpoint
CREATE INDEX "smc_status_idx" ON "scheduling_milestone_checkpoints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "smc_project_milestone_idx" ON "scheduling_milestone_checkpoints" USING btree ("project_id","milestone_code");--> statement-breakpoint
CREATE INDEX "asp_requirement_idx" ON "ai_solution_proposals" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "asp_status_idx" ON "ai_solution_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asp_ai_task_idx" ON "ai_solution_proposals" USING btree ("ai_task_id");--> statement-breakpoint
CREATE INDEX "asp_parent_idx" ON "ai_solution_proposals" USING btree ("parent_proposal_id");--> statement-breakpoint
CREATE INDEX "asp_version_idx" ON "ai_solution_proposals" USING btree ("requirement_id","version");--> statement-breakpoint
CREATE INDEX "ctr_project_idx" ON "customer_technical_requirements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ctr_customer_idx" ON "customer_technical_requirements" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ctr_status_idx" ON "customer_technical_requirements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ctr_workpiece_idx" ON "customer_technical_requirements" USING btree ("workpiece_name");--> statement-breakpoint
CREATE INDEX "idx_ial_user_id" ON "interlock_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ial_machine_id" ON "interlock_access_log" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_ial_decision" ON "interlock_access_log" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "idx_ial_checked_at" ON "interlock_access_log" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "idx_msr_machine_id" ON "machine_skill_requirements" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_msr_cert_code" ON "machine_skill_requirements" USING btree ("certification_code");--> statement-breakpoint
CREATE INDEX "idx_msr_sop_template_id" ON "machine_skill_requirements" USING btree ("sop_template_id");--> statement-breakpoint
CREATE INDEX "idx_sop_ack_user_id" ON "sop_acknowledgments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sop_ack_sop_template_id" ON "sop_acknowledgments" USING btree ("sop_template_id");--> statement-breakpoint
CREATE INDEX "idx_sop_ack_user_sop" ON "sop_acknowledgments" USING btree ("user_id","sop_template_id");--> statement-breakpoint
CREATE INDEX "glf_project_idx" ON "global_live_feeds" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "glf_location_idx" ON "global_live_feeds" USING btree ("location");--> statement-breakpoint
CREATE INDEX "glf_created_idx" ON "global_live_feeds" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "glf_live_idx" ON "global_live_feeds" USING btree ("is_live");--> statement-breakpoint
CREATE INDEX "sh_user_idx" ON "strivers_hall" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sh_medal_idx" ON "strivers_hall" USING btree ("medal_level");--> statement-breakpoint
CREATE INDEX "sh_awarded_idx" ON "strivers_hall" USING btree ("awarded_at");--> statement-breakpoint
CREATE INDEX "sap_year_quarter_idx" ON "supplier_audit_plans" USING btree ("year","quarter");--> statement-breakpoint
CREATE INDEX "sap_status_idx" ON "supplier_audit_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sa_supplier_idx" ON "supplier_audits" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sa_status_idx" ON "supplier_audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sa_plan_idx" ON "supplier_audits" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "scr_supplier_idx" ON "supplier_committee_reviews" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "scr_status_idx" ON "supplier_committee_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ser_supplier_idx" ON "supplier_elimination_records" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ser_status_idx" ON "supplier_elimination_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sqa_status_idx" ON "supplier_qualification_apps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sqa_applicant_idx" ON "supplier_qualification_apps" USING btree ("applicant");--> statement-breakpoint
CREATE INDEX "ssc_year_quarter_idx" ON "supplier_spot_checks" USING btree ("year","quarter");--> statement-breakpoint
CREATE INDEX "ssc_inspector_idx" ON "supplier_spot_checks" USING btree ("inspector");--> statement-breakpoint
CREATE INDEX "ssc_supplier_idx" ON "supplier_spot_checks" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_display_screens_location" ON "display_screens" USING btree ("location");--> statement-breakpoint
CREATE INDEX "idx_display_screens_mode" ON "display_screens" USING btree ("current_mode");--> statement-breakpoint
CREATE INDEX "idx_screen_playlists_screen" ON "screen_playlists" USING btree ("screen_id");--> statement-breakpoint
CREATE INDEX "idx_screen_security_logs_screen" ON "screen_security_logs" USING btree ("screen_id");--> statement-breakpoint
CREATE INDEX "idx_screen_security_logs_created" ON "screen_security_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "ai_knowledge_documents" ADD CONSTRAINT "ai_knowledge_documents_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_action_logs" ADD CONSTRAINT "grt_approval_action_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_delegations" ADD CONSTRAINT "grt_approval_delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_delegations" ADD CONSTRAINT "grt_approval_delegations_delegatee_id_users_id_fk" FOREIGN KEY ("delegatee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_instances" ADD CONSTRAINT "grt_approval_instances_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_instances" ADD CONSTRAINT "grt_approval_instances_current_approver_id_users_id_fk" FOREIGN KEY ("current_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_step_records" ADD CONSTRAINT "grt_approval_step_records_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_step_records" ADD CONSTRAINT "grt_approval_step_records_delegated_to_users_id_fk" FOREIGN KEY ("delegated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_approval_templates" ADD CONSTRAINT "grt_approval_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_red_blue_configs" ADD CONSTRAINT "grt_red_blue_configs_red_team_leader_id_users_id_fk" FOREIGN KEY ("red_team_leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_red_blue_configs" ADD CONSTRAINT "grt_red_blue_configs_blue_team_leader_id_users_id_fk" FOREIGN KEY ("blue_team_leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_red_blue_configs" ADD CONSTRAINT "grt_red_blue_configs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grt_red_blue_configs" ADD CONSTRAINT "grt_red_blue_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_change_history" ADD CONSTRAINT "material_change_history_changedBy_users_id_fk" FOREIGN KEY ("changedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_coding_rules" ADD CONSTRAINT "material_coding_rules_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_import_records" ADD CONSTRAINT "material_import_records_importedBy_users_id_fk" FOREIGN KEY ("importedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_reorderPrOwnerId_users_id_fk" FOREIGN KEY ("reorderPrOwnerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "framework_agreements" ADD CONSTRAINT "framework_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD CONSTRAINT "payment_workflows_bu_approved_by_users_id_fk" FOREIGN KEY ("bu_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD CONSTRAINT "payment_workflows_quality_approved_by_users_id_fk" FOREIGN KEY ("quality_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD CONSTRAINT "payment_workflows_payment_approved_by_users_id_fk" FOREIGN KEY ("payment_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD CONSTRAINT "payment_workflows_procurement_confirmed_by_users_id_fk" FOREIGN KEY ("procurement_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_workflows" ADD CONSTRAINT "payment_workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_loss_agreements" ADD CONSTRAINT "quality_loss_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_loss_incidents" ADD CONSTRAINT "quality_loss_incidents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_supplier_quotes" ADD CONSTRAINT "rfq_supplier_quotes_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "small_value_procurements" ADD CONSTRAINT "small_value_procurements_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "small_value_procurements" ADD CONSTRAINT "small_value_procurements_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "small_value_procurements" ADD CONSTRAINT "small_value_procurements_procurement_officer_id_users_id_fk" FOREIGN KEY ("procurement_officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_qualifications" ADD CONSTRAINT "supplier_qualifications_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_qualifications" ADD CONSTRAINT "supplier_qualifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_report_submissions" ADD CONSTRAINT "supplier_report_submissions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sop_recommendations" ADD CONSTRAINT "ai_sop_recommendations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_questionnaires" ADD CONSTRAINT "customer_questionnaires_assigned_sales_id_users_id_fk" FOREIGN KEY ("assigned_sales_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_questionnaires" ADD CONSTRAINT "customer_questionnaires_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m2_info_tags" ADD CONSTRAINT "m2_info_tags_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_risk_alerts" ADD CONSTRAINT "process_risk_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_time_records" ADD CONSTRAINT "process_time_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_process_instances" ADD CONSTRAINT "project_process_instances_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_templates" ADD CONSTRAINT "sop_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_templates" ADD CONSTRAINT "sop_templates_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_bom_scan_logs" ADD CONSTRAINT "assembly_bom_scan_logs_deviation_confirmed_by_users_id_fk" FOREIGN KEY ("deviation_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_bom_scan_logs" ADD CONSTRAINT "assembly_bom_scan_logs_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_bom_scan_logs" ADD CONSTRAINT "assembly_bom_scan_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_labor_confirmations" ADD CONSTRAINT "assembly_labor_confirmations_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_labor_confirmations" ADD CONSTRAINT "assembly_labor_confirmations_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quality_complaints" ADD CONSTRAINT "customer_quality_complaints_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quality_complaints" ADD CONSTRAINT "customer_quality_complaints_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quality_complaints" ADD CONSTRAINT "customer_quality_complaints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_inspection_records" ADD CONSTRAINT "incoming_inspection_records_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_inspection_records" ADD CONSTRAINT "incoming_inspection_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_inspection_records" ADD CONSTRAINT "incoming_inspection_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_disposal_records" ADD CONSTRAINT "scrap_disposal_records_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_disposal_records" ADD CONSTRAINT "scrap_disposal_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spare_part_consumption_logs" ADD CONSTRAINT "spare_part_consumption_logs_consumed_by_users_id_fk" FOREIGN KEY ("consumed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_penalties" ADD CONSTRAINT "supplier_penalties_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_penalties" ADD CONSTRAINT "supplier_penalties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_shipment_labels" ADD CONSTRAINT "supplier_shipment_labels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_graph_edges" ADD CONSTRAINT "traceability_graph_edges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_countedBy_users_id_fk" FOREIGN KEY ("countedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_verifiedBy_users_id_fk" FOREIGN KEY ("verifiedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_issues" ADD CONSTRAINT "warehouse_issues_issuedBy_users_id_fk" FOREIGN KEY ("issuedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_issues" ADD CONSTRAINT "warehouse_issues_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_receivedBy_users_id_fk" FOREIGN KEY ("receivedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_qcBy_users_id_fk" FOREIGN KEY ("qcBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_managerId_users_id_fk" FOREIGN KEY ("managerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_project_id_idx" ON "contracts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dr_bu_code_idx" ON "delivery_registrations" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "fa_bu_code_idx" ON "framework_agreements" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "pw_bu_code_idx" ON "payment_workflows" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "rfq_bu_code_idx" ON "rfq_events" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "svp_bu_code_idx" ON "small_value_procurements" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "idx_prod_equip_bu_code" ON "production_equipments" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "crm_leads_bu_code_idx" ON "crm_leads" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "projects_bu_code_idx" ON "projects" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "idx_work_log_project" ON "work_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_work_log_category" ON "work_logs" USING btree ("labor_category");--> statement-breakpoint
CREATE INDEX "idx_work_log_approval" ON "work_logs" USING btree ("approval_status");