-- ============================================================
-- GRT智能系统 数据库初始化脚本
-- 版本: 1.0
-- 日期: 2026-01-24
-- 说明: 包含所有核心表结构，用于Windows本地部署
-- ============================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS grt_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE grt_system;

-- ============================================================
-- 第一部分：核心系统表
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `open_id` VARCHAR(255) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `avatar` VARCHAR(512),
  `role` ENUM('admin', 'user') DEFAULT 'user',
  `department` VARCHAR(255),
  `position` VARCHAR(255),
  `phone` VARCHAR(50),
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_email` (`email`),
  INDEX `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 第二部分：试点A - 变更治理表
-- ============================================================

-- 变更请求表
CREATE TABLE IF NOT EXISTS `change_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cr_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '变更编号，如CR-2026-0001',
  `title` VARCHAR(500) NOT NULL COMMENT '变更标题',
  `description` TEXT COMMENT '变更描述',
  `priority` ENUM('P0', 'P1', 'P2', 'P3') NOT NULL DEFAULT 'P2' COMMENT '优先级',
  `scope` JSON COMMENT '影响范围，如["CRM", "PM"]',
  `risk_level` ENUM('high', 'medium', 'low') DEFAULT 'medium' COMMENT '风险等级',
  `owner_id` INT NOT NULL COMMENT '变更负责人',
  `status` ENUM('draft', 'pending_review', 'approved', 'rejected', 'in_progress', 'deployed', 'rolled_back', 'closed') DEFAULT 'draft',
  `rollback_plan` TEXT COMMENT '回滚方案',
  `test_plan` TEXT COMMENT '测试计划',
  `ai_redline_impact` TINYINT(1) DEFAULT 0 COMMENT '是否影响AI红线',
  `permission_impact` TINYINT(1) DEFAULT 0 COMMENT '是否影响权限',
  `data_structure_impact` TINYINT(1) DEFAULT 0 COMMENT '是否影响数据结构',
  `gate_impact` TINYINT(1) DEFAULT 0 COMMENT '是否影响阶段门',
  `kpi_impact` TINYINT(1) DEFAULT 0 COMMENT '是否影响KPI',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cr_status` (`status`),
  INDEX `idx_cr_priority` (`priority`),
  INDEX `idx_cr_owner` (`owner_id`),
  INDEX `idx_cr_code` (`cr_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 变更审批表
CREATE TABLE IF NOT EXISTS `change_approvals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cr_id` INT NOT NULL COMMENT '关联变更请求ID',
  `approver_id` INT NOT NULL COMMENT '审批人ID',
  `approver_role` VARCHAR(100) COMMENT '审批人角色，如CTO、质量主管',
  `decision` ENUM('pending', 'approved', 'rejected', 'need_info') DEFAULT 'pending',
  `comment` TEXT COMMENT '审批意见',
  `conditions` TEXT COMMENT '附加条件',
  `approved_at` DATETIME COMMENT '审批时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_approval_cr` (`cr_id`),
  INDEX `idx_approval_approver` (`approver_id`),
  INDEX `idx_approval_decision` (`decision`),
  FOREIGN KEY (`cr_id`) REFERENCES `change_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 发布表
CREATE TABLE IF NOT EXISTS `releases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `release_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '发布编号，如REL-2026-W04',
  `version` VARCHAR(50) NOT NULL COMMENT '版本号，如v5.1.0',
  `cr_list` JSON COMMENT '包含的变更请求ID列表',
  `deploy_env` ENUM('development', 'staging', 'production') DEFAULT 'staging',
  `deploy_status` ENUM('pending', 'in_progress', 'success', 'failed', 'rolled_back') DEFAULT 'pending',
  `release_notes` TEXT COMMENT '发布说明',
  `migration_script` TEXT COMMENT '迁移脚本',
  `rollback_script` TEXT COMMENT '回滚脚本',
  `deployed_by` INT COMMENT '部署人',
  `deployed_at` DATETIME COMMENT '部署时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_release_status` (`deploy_status`),
  INDEX `idx_release_env` (`deploy_env`),
  INDEX `idx_release_code` (`release_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 发布包表
CREATE TABLE IF NOT EXISTS `release_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `release_id` INT NOT NULL UNIQUE COMMENT '关联发布ID',
  `impacted_roles` JSON COMMENT '受影响角色列表',
  `impacted_modules` JSON COMMENT '受影响模块列表',
  `what_changed` TEXT COMMENT '变更内容说明',
  `how_to_operate` TEXT COMMENT '操作指南',
  `target_ack_rate` DECIMAL(5,2) DEFAULT 90.00 COMMENT '目标确认率',
  `actual_ack_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '实际确认率',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 版本确认表
CREATE TABLE IF NOT EXISTS `acknowledgements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `release_id` INT NOT NULL COMMENT '关联发布ID',
  `user_id` INT NOT NULL COMMENT '确认用户ID',
  `user_role` VARCHAR(100) COMMENT '用户角色',
  `module` VARCHAR(100) COMMENT '所属模块',
  `ack_status` ENUM('pending', 'acknowledged', 'skipped') DEFAULT 'pending',
  `ack_time` DATETIME COMMENT '确认时间',
  `quiz_score` INT COMMENT '测验分数',
  `quiz_passed` TINYINT(1) DEFAULT 0 COMMENT '测验是否通过',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ack_release` (`release_id`),
  INDEX `idx_ack_user` (`user_id`),
  INDEX `idx_ack_status` (`ack_status`),
  UNIQUE KEY `uk_release_user` (`release_id`, `user_id`),
  FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CAB成员配置表
CREATE TABLE IF NOT EXISTS `cab_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE COMMENT '用户ID',
  `role` VARCHAR(100) NOT NULL COMMENT '角色名称，如CTO、质量主管',
  `is_required` TINYINT(1) DEFAULT 1 COMMENT '是否必须审批',
  `priority_levels` JSON COMMENT '负责的优先级列表，如["P0", "P1"]',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cab_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 治理审计日志表
CREATE TABLE IF NOT EXISTS `governance_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT COMMENT '操作人ID',
  `actor_name` VARCHAR(255) COMMENT '操作人名称',
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型',
  `resource_type` VARCHAR(100) NOT NULL COMMENT '资源类型，如CR、Release',
  `resource_id` INT COMMENT '资源ID',
  `before_state` JSON COMMENT '操作前状态',
  `after_state` JSON COMMENT '操作后状态',
  `summary` TEXT COMMENT '操作摘要',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_actor` (`actor_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_resource` (`resource_type`, `resource_id`),
  INDEX `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 第三部分：试点B - HR链路表
-- ============================================================

-- 岗位画像表
CREATE TABLE IF NOT EXISTS `job_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '岗位编码',
  `job_title` VARCHAR(255) NOT NULL COMMENT '岗位名称',
  `department` VARCHAR(255) COMMENT '所属部门',
  `job_level` VARCHAR(50) COMMENT '职级',
  `job_description` TEXT COMMENT '岗位描述',
  `requirements` JSON COMMENT '任职要求',
  `skill_matrix` JSON COMMENT '技能矩阵',
  `kpi_template` JSON COMMENT 'KPI模板',
  `probation_tasks` JSON COMMENT '试用期任务模板',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_job_dept` (`department`),
  INDEX `idx_job_level` (`job_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 候选人表
CREATE TABLE IF NOT EXISTS `candidates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `candidate_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '候选人编码',
  `name` VARCHAR(255) NOT NULL COMMENT '姓名',
  `email` VARCHAR(255) COMMENT '邮箱',
  `phone` VARCHAR(50) COMMENT '电话',
  `job_profile_id` INT COMMENT '应聘岗位ID',
  `resume_url` VARCHAR(512) COMMENT '简历URL',
  `source` VARCHAR(100) COMMENT '来源渠道',
  `stage` ENUM('screening', 'interview_1', 'interview_2', 'interview_3', 'offer', 'accepted', 'rejected', 'withdrawn') DEFAULT 'screening',
  `interview_scores` JSON COMMENT '面试评分记录',
  `overall_score` DECIMAL(5,2) COMMENT '综合评分',
  `hr_comment` TEXT COMMENT 'HR评语',
  `hiring_manager_id` INT COMMENT '招聘经理ID',
  `expected_onboard_date` DATE COMMENT '预计入职日期',
  `actual_onboard_date` DATE COMMENT '实际入职日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_candidate_stage` (`stage`),
  INDEX `idx_candidate_job` (`job_profile_id`),
  FOREIGN KEY (`job_profile_id`) REFERENCES `job_profiles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 入职计划表（30/60/90任务包）
CREATE TABLE IF NOT EXISTS `onboarding_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '计划编码',
  `employee_id` INT NOT NULL COMMENT '员工ID',
  `job_profile_id` INT COMMENT '岗位ID',
  `mentor_id` INT COMMENT '导师ID',
  `start_date` DATE NOT NULL COMMENT '入职日期',
  `day30_tasks` JSON COMMENT '30天任务列表',
  `day30_status` ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  `day30_review_date` DATE COMMENT '30天评审日期',
  `day30_score` DECIMAL(5,2) COMMENT '30天评分',
  `day60_tasks` JSON COMMENT '60天任务列表',
  `day60_status` ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  `day60_review_date` DATE COMMENT '60天评审日期',
  `day60_score` DECIMAL(5,2) COMMENT '60天评分',
  `day90_tasks` JSON COMMENT '90天任务列表',
  `day90_status` ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  `day90_review_date` DATE COMMENT '90天评审日期',
  `day90_score` DECIMAL(5,2) COMMENT '90天评分',
  `overall_status` ENUM('onboarding', 'probation', 'converted', 'terminated') DEFAULT 'onboarding',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_onboard_employee` (`employee_id`),
  INDEX `idx_onboard_status` (`overall_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 转正评估表
CREATE TABLE IF NOT EXISTS `probation_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `review_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '评估编码',
  `onboarding_plan_id` INT NOT NULL COMMENT '入职计划ID',
  `employee_id` INT NOT NULL COMMENT '员工ID',
  `review_date` DATE NOT NULL COMMENT '评估日期',
  `reviewer_id` INT NOT NULL COMMENT '评估人ID',
  `kpi_achievement` JSON COMMENT 'KPI达成情况',
  `skill_assessment` JSON COMMENT '技能评估',
  `culture_fit_score` DECIMAL(5,2) COMMENT '文化匹配度',
  `overall_score` DECIMAL(5,2) COMMENT '综合评分',
  `decision` ENUM('convert', 'extend', 'terminate') COMMENT '评估决定',
  `extend_days` INT COMMENT '延长天数',
  `comment` TEXT COMMENT '评语',
  `hr_approval` TINYINT(1) DEFAULT 0 COMMENT 'HR审批',
  `hr_approval_date` DATE COMMENT 'HR审批日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_review_employee` (`employee_id`),
  INDEX `idx_review_decision` (`decision`),
  FOREIGN KEY (`onboarding_plan_id`) REFERENCES `onboarding_plans`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 第四部分：试点C - 项目阶段门表
-- ============================================================

-- 项目阶段门表
CREATE TABLE IF NOT EXISTS `project_stage_gates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT '项目ID',
  `project_code` VARCHAR(50) COMMENT '项目编码',
  `project_name` VARCHAR(255) COMMENT '项目名称',
  `stage` ENUM('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12') NOT NULL COMMENT '阶段',
  `stage_name` VARCHAR(100) COMMENT '阶段名称，如售前、立项、设计',
  `checklist` JSON COMMENT '检查清单',
  `required_documents` JSON COMMENT '必需文档列表',
  `status` ENUM('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'bypassed') DEFAULT 'not_started',
  `planned_start_date` DATE COMMENT '计划开始日期',
  `planned_end_date` DATE COMMENT '计划结束日期',
  `actual_start_date` DATE COMMENT '实际开始日期',
  `actual_end_date` DATE COMMENT '实际结束日期',
  `gate_owner_id` INT COMMENT '阶段负责人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_project_stage` (`project_id`, `stage`),
  INDEX `idx_gate_project` (`project_id`),
  INDEX `idx_gate_stage` (`stage`),
  INDEX `idx_gate_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 阶段门审批记录表
CREATE TABLE IF NOT EXISTS `project_gate_approvals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gate_id` INT NOT NULL COMMENT '阶段门ID',
  `approver_id` INT NOT NULL COMMENT '审批人ID',
  `approver_role` VARCHAR(100) COMMENT '审批人角色',
  `decision` ENUM('pending', 'approved', 'rejected', 'conditional') DEFAULT 'pending',
  `conditions` TEXT COMMENT '附加条件',
  `comment` TEXT COMMENT '审批意见',
  `approved_at` DATETIME COMMENT '审批时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gate_approval_gate` (`gate_id`),
  INDEX `idx_gate_approval_approver` (`approver_id`),
  FOREIGN KEY (`gate_id`) REFERENCES `project_stage_gates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 阶段门证据附件表
CREATE TABLE IF NOT EXISTS `project_gate_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gate_id` INT NOT NULL COMMENT '阶段门ID',
  `document_type` VARCHAR(100) NOT NULL COMMENT '文档类型',
  `document_name` VARCHAR(255) NOT NULL COMMENT '文档名称',
  `document_url` VARCHAR(512) COMMENT '文档URL',
  `file_size` INT COMMENT '文件大小（字节）',
  `uploaded_by` INT COMMENT '上传人',
  `is_required` TINYINT(1) DEFAULT 1 COMMENT '是否必需',
  `is_verified` TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
  `verified_by` INT COMMENT '验证人',
  `verified_at` DATETIME COMMENT '验证时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gate_doc_gate` (`gate_id`),
  INDEX `idx_gate_doc_type` (`document_type`),
  FOREIGN KEY (`gate_id`) REFERENCES `project_stage_gates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 第五部分：合规管理表（已存在，此处仅供参考）
-- ============================================================

-- 注意：以下表可能已通过 drizzle 迁移创建，如果已存在请跳过

-- grt_employees - 员工表
-- grt_time_entries - 工时记录表
-- grt_compliance_alerts - 合规预警表
-- grt_compliance_rules - 合规规则表
-- grt_compliance_email_templates - 邮件模板表
-- grt_compliance_reports - 合规报告表

-- ============================================================
-- 第六部分：初始数据
-- ============================================================

-- 插入默认CAB成员配置
INSERT INTO `cab_members` (`user_id`, `role`, `is_required`, `priority_levels`, `is_active`) VALUES
(1, 'CTO', 1, '["P0", "P1"]', 1),
(2, '运营总监', 1, '["P0", "P1"]', 1),
(3, '质量主管', 1, '["P0", "P1", "P2"]', 1),
(4, 'IT负责人', 1, '["P0", "P1", "P2"]', 1),
(5, '财务主管', 0, '["P0", "P1"]', 1)
ON DUPLICATE KEY UPDATE `is_active` = 1;

-- 插入试点岗位画像（销售与项目工程师）
INSERT INTO `job_profiles` (`job_code`, `job_title`, `department`, `job_level`, `job_description`, `requirements`, `skill_matrix`, `kpi_template`, `probation_tasks`) VALUES
('JOB-SPE-001', '销售与项目工程师', '销售部', 'P3', 
'负责客户需求分析、技术方案设计、项目跟进和售后支持',
'{"education": "本科及以上", "experience": "3年以上", "skills": ["技术方案设计", "客户沟通", "项目管理"]}',
'{"technical": ["方案设计", "产品知识", "行业知识"], "soft": ["沟通能力", "团队协作", "问题解决"]}',
'{"sales_target": "季度销售额目标", "customer_satisfaction": "客户满意度≥90%", "project_delivery": "项目按时交付率≥95%"}',
'{"day30": ["熟悉公司产品线", "完成内部培训", "跟进3个客户"], "day60": ["独立完成方案设计", "参与项目交付", "建立客户关系"], "day90": ["独立负责项目", "达成销售目标", "客户满意度达标"]}'
)
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- 插入项目阶段门模板（M0-M5）
-- 注意：需要有实际项目ID，此处使用占位符

-- ============================================================
-- 第七部分：视图和存储过程（可选）
-- ============================================================

-- 变更请求统计视图
CREATE OR REPLACE VIEW `v_cr_statistics` AS
SELECT 
  status,
  priority,
  COUNT(*) as count,
  DATE(created_at) as date
FROM `change_requests`
GROUP BY status, priority, DATE(created_at);

-- 发布确认率统计视图
CREATE OR REPLACE VIEW `v_release_ack_stats` AS
SELECT 
  r.id as release_id,
  r.release_code,
  r.version,
  rp.target_ack_rate,
  rp.actual_ack_rate,
  COUNT(a.id) as total_users,
  SUM(CASE WHEN a.ack_status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged_users
FROM `releases` r
LEFT JOIN `release_packages` rp ON r.id = rp.release_id
LEFT JOIN `acknowledgements` a ON r.id = a.release_id
GROUP BY r.id, r.release_code, r.version, rp.target_ack_rate, rp.actual_ack_rate;

-- ============================================================
-- 完成
-- ============================================================

SELECT '数据库初始化完成！' as message;
