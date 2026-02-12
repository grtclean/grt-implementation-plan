-- POS (Project Organization System) Database Tables
-- Version: 1.4.8
-- Created: 2026-02-05

-- 1. 客户画像表 (customers_v2)
CREATE TABLE IF NOT EXISTS `customers_v2` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_code` VARCHAR(50) NOT NULL,
  `customer_name` VARCHAR(200) NOT NULL,
  `customer_type` ENUM('tier1_strategic','tier1_regular','tier2_potential','tier2_standard','tier3_small','tier3_trial','other') NOT NULL DEFAULT 'tier2_standard',
  `scene` ENUM('automotive_powertrain','automotive_body','semiconductor','medical_device','aerospace','precision_optics','general_industrial') NOT NULL DEFAULT 'general_industrial',
  `decision_weights` JSON COMMENT '决策权重: {tech, price, value, relation, boss}',
  `key_contacts` JSON COMMENT '关键联系人列表',
  `delivery_risk` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `risk_solution` TEXT COMMENT '风险解决方案',
  `jared_strategy` ENUM('penetrate','expand','maintain','defend','develop','harvest','divest','watch','partner','compete','avoid') DEFAULT 'maintain',
  `industry` VARCHAR(100),
  `region` VARCHAR(100),
  `annual_revenue` DECIMAL(15,2),
  `employee_count` INT,
  `credit_rating` ENUM('AAA','AA','A','BBB','BB','B','C','D') DEFAULT 'BBB',
  `payment_terms` VARCHAR(100),
  `notes` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `customers_v2_code_unique` (`customer_code`),
  INDEX `customers_v2_type_idx` (`customer_type`),
  INDEX `customers_v2_scene_idx` (`scene`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 项目主表 (projects_v2)
CREATE TABLE IF NOT EXISTS `projects_v2` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_code` VARCHAR(50) NOT NULL,
  `project_name` VARCHAR(200) NOT NULL,
  `customer_id` INT NOT NULL,
  `current_stage` ENUM('M0','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12') DEFAULT 'M0',
  `pm_id` INT COMMENT '项目经理ID',
  `tech_leader_id` INT COMMENT '技术负责人ID',
  `sales_owner_id` INT COMMENT '销售负责人ID',
  `service_owner_id` INT COMMENT '服务负责人ID',
  `scene_snapshot` JSON COMMENT '场景快照',
  `decision_snapshot` JSON COMMENT '决策快照',
  `active_version` VARCHAR(20) COMMENT '当前激活版本',
  `project_type` ENUM('standard','customized','complex','strategic') DEFAULT 'standard',
  `priority` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `budget` DECIMAL(15,2),
  `contract_value` DECIMAL(15,2),
  `start_date` DATE,
  `target_end_date` DATE,
  `actual_end_date` DATE,
  `status` ENUM('draft','active','on_hold','completed','cancelled') DEFAULT 'draft',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `projects_v2_code_unique` (`project_code`),
  INDEX `projects_v2_customer_idx` (`customer_id`),
  INDEX `projects_v2_stage_idx` (`current_stage`),
  INDEX `projects_v2_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 项目阶段表 (project_stages_v2)
CREATE TABLE IF NOT EXISTS `project_stages_v2` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `stage_code` ENUM('M0','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12') NOT NULL,
  `stage_name` VARCHAR(100) NOT NULL,
  `status` ENUM('not_started','in_progress','pending_review','approved','rejected','completed') DEFAULT 'not_started',
  `owner_id` INT COMMENT '阶段负责人ID',
  `plan_start_date` DATE,
  `plan_end_date` DATE,
  `actual_start_date` DATE,
  `actual_end_date` DATE,
  `input_json` JSON COMMENT '输入物',
  `output_json` JSON COMMENT '输出物',
  `tasks_json` JSON COMMENT '任务列表',
  `audit_log` JSON COMMENT '审计日志',
  `completion_percentage` INT DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `project_stages_v2_project_idx` (`project_id`),
  INDEX `project_stages_v2_stage_idx` (`stage_code`),
  INDEX `project_stages_v2_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 项目版本表 (project_versions)
CREATE TABLE IF NOT EXISTS `project_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `version_code` VARCHAR(20) NOT NULL COMMENT 'AIV0, V1, V2...',
  `base_project_code` VARCHAR(50) COMMENT '基线项目编号',
  `delta_input` JSON COMMENT '差异增强输入',
  `version_json` JSON COMMENT 'M3-M12基线JSON',
  `changes_summary` JSON COMMENT '变更摘要',
  `status` ENUM('draft','pending_review','approved','active','archived','rejected') DEFAULT 'draft',
  `created_by` INT,
  `reviewed_by` INT,
  `reviewed_at` TIMESTAMP NULL,
  `review_notes` TEXT,
  `is_active` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `project_versions_project_idx` (`project_id`),
  INDEX `project_versions_code_idx` (`version_code`),
  INDEX `project_versions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PO建议表 (po_suggestions)
CREATE TABLE IF NOT EXISTS `po_suggestions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `version_id` INT COMMENT '关联的项目版本',
  `items` JSON NOT NULL COMMENT 'PO建议项列表',
  `engineer_confirm` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `engineer_confirm_by` INT,
  `engineer_confirm_at` TIMESTAMP NULL,
  `engineer_notes` TEXT,
  `procurement_confirm` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `procurement_confirm_by` INT,
  `procurement_confirm_at` TIMESTAMP NULL,
  `procurement_notes` TEXT,
  `final_po_ref` VARCHAR(100) COMMENT '最终PO编号',
  `status` ENUM('draft','pending_engineer','pending_procurement','approved','submitted','completed') DEFAULT 'draft',
  `total_amount` DECIMAL(15,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `po_suggestions_project_idx` (`project_id`),
  INDEX `po_suggestions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. MES同步表 (mes_sync)
CREATE TABLE IF NOT EXISTS `mes_sync` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `stage_id` INT COMMENT '关联的项目阶段',
  `mes_work_order_id` VARCHAR(100) COMMENT 'MES工单ID',
  `work_order_type` ENUM('production','assembly','testing','packaging','shipping') DEFAULT 'production',
  `sync_status` ENUM('pending','syncing','synced','failed','cancelled') DEFAULT 'pending',
  `sync_direction` ENUM('to_mes','from_mes','bidirectional') DEFAULT 'bidirectional',
  `last_sync_at` TIMESTAMP NULL,
  `sync_error` TEXT,
  `mes_data` JSON COMMENT 'MES返回数据',
  `progress_percentage` INT DEFAULT 0,
  `planned_start_date` DATE,
  `planned_end_date` DATE,
  `actual_start_date` DATE,
  `actual_end_date` DATE,
  `quantity` INT DEFAULT 1,
  `completed_quantity` INT DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `mes_sync_project_idx` (`project_id`),
  INDEX `mes_sync_work_order_idx` (`mes_work_order_id`),
  INDEX `mes_sync_status_idx` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 第三方连接器配置表 (pos_connectors)
CREATE TABLE IF NOT EXISTS `pos_connectors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `connector_code` VARCHAR(50) NOT NULL,
  `connector_name` VARCHAR(100) NOT NULL,
  `connector_type` ENUM('ERP','MES','IM','Custom') NOT NULL,
  `config` JSON COMMENT '连接器配置',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `last_test_at` TIMESTAMP NULL,
  `last_test_result` ENUM('success','failed','timeout') DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `pos_connectors_code_unique` (`connector_code`),
  INDEX `pos_connectors_type_idx` (`connector_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 项目评审表 (pos_reviews)
CREATE TABLE IF NOT EXISTS `pos_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `stage_id` INT NOT NULL,
  `review_type` ENUM('M3_ProjectApproval','M4_DesignFreeze','M5_ProductionReady','M6_QualityGate','M7_DeliveryGate','M8_InstallationGate','M9_CommissioningGate','M10_AcceptanceGate','M11_WarrantyGate','M12_CloseoutGate') NOT NULL,
  `review_carriage` ENUM('General','Mechanical','Electrical','Quality','Service','Procurement') DEFAULT 'General',
  `conclusion` ENUM('Pending','Pass','PassWithCondition','Fail','Deferred') DEFAULT 'Pending',
  `risks` JSON COMMENT '风险列表',
  `responsible_id` INT,
  `completion_date` DATE,
  `comments` TEXT,
  `attachments` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `pos_reviews_project_idx` (`project_id`),
  INDEX `pos_reviews_stage_idx` (`stage_id`),
  INDEX `pos_reviews_type_idx` (`review_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入示例数据

-- 示例客户数据
INSERT INTO `customers_v2` (`customer_code`, `customer_name`, `customer_type`, `scene`, `decision_weights`, `key_contacts`, `delivery_risk`, `jared_strategy`, `industry`, `region`) VALUES
('CUST001', '博世汽车部件（苏州）有限公司', 'tier1_strategic', 'automotive_powertrain', '{"tech":30,"price":20,"value":25,"relation":15,"boss":10}', '[{"name":"张工","role":"技术总监","phone":"138xxxx1234"},{"name":"李经理","role":"采购经理","phone":"139xxxx5678"}]', 'low', 'expand', '汽车零部件', '华东'),
('CUST002', '采埃孚（上海）技术有限公司', 'tier1_strategic', 'automotive_powertrain', '{"tech":35,"price":15,"value":30,"relation":10,"boss":10}', '[{"name":"王总","role":"工厂总经理","phone":"137xxxx9012"}]', 'medium', 'penetrate', '汽车零部件', '华东'),
('CUST003', '中芯国际集成电路制造有限公司', 'tier1_regular', 'semiconductor', '{"tech":40,"price":10,"value":30,"relation":10,"boss":10}', '[{"name":"陈博士","role":"工艺工程师","phone":"136xxxx3456"}]', 'high', 'develop', '半导体', '华东'),
('CUST004', '迈瑞医疗国际有限公司', 'tier2_potential', 'medical_device', '{"tech":25,"price":30,"value":25,"relation":10,"boss":10}', '[{"name":"刘经理","role":"设备采购","phone":"135xxxx7890"}]', 'medium', 'maintain', '医疗器械', '华南'),
('CUST005', '中国商飞上海飞机制造有限公司', 'tier1_strategic', 'aerospace', '{"tech":45,"price":5,"value":35,"relation":10,"boss":5}', '[{"name":"赵总工","role":"总工程师","phone":"134xxxx2345"}]', 'critical', 'partner', '航空航天', '华东');

-- 示例项目数据
INSERT INTO `projects_v2` (`project_code`, `project_name`, `customer_id`, `current_stage`, `project_type`, `priority`, `budget`, `contract_value`, `start_date`, `target_end_date`, `status`) VALUES
('GRT2024001', '博世发动机缸体清洗线', 1, 'M4', 'complex', 'high', 2500000.00, 2800000.00, '2024-01-15', '2024-06-30', 'active'),
('GRT2024002', '采埃孚变速箱壳体清洗系统', 2, 'M2', 'customized', 'critical', 3200000.00, 3500000.00, '2024-02-01', '2024-08-15', 'active'),
('GRT2024003', '中芯晶圆清洗设备', 3, 'M3', 'strategic', 'critical', 5000000.00, 5500000.00, '2024-03-01', '2024-12-31', 'active'),
('GRT2024004', '迈瑞医疗器械清洗线', 4, 'M1', 'standard', 'medium', 800000.00, 950000.00, '2024-04-01', '2024-07-31', 'active'),
('GRT2024005', '商飞航空零部件清洗系统', 5, 'M0', 'strategic', 'critical', 8000000.00, 9000000.00, '2024-05-01', '2025-06-30', 'draft');

-- 示例项目阶段数据 (为GRT2024002项目创建M0-M12阶段)
INSERT INTO `project_stages_v2` (`project_id`, `stage_code`, `stage_name`, `status`, `plan_start_date`, `plan_end_date`, `completion_percentage`) VALUES
(2, 'M0', '项目启动', 'completed', '2024-02-01', '2024-02-07', 100),
(2, 'M1', '需求分析', 'completed', '2024-02-08', '2024-02-28', 100),
(2, 'M2', '方案设计', 'in_progress', '2024-03-01', '2024-03-31', 60),
(2, 'M3', '立项评审', 'not_started', '2024-04-01', '2024-04-15', 0),
(2, 'M4', '方案冻结', 'not_started', '2024-04-16', '2024-04-30', 0),
(2, 'M5', '生产准备', 'not_started', '2024-05-01', '2024-05-15', 0),
(2, 'M6', '生产制造', 'not_started', '2024-05-16', '2024-06-15', 0),
(2, 'M7', '出厂测试', 'not_started', '2024-06-16', '2024-06-30', 0),
(2, 'M8', '发货安装', 'not_started', '2024-07-01', '2024-07-15', 0),
(2, 'M9', '现场调试', 'not_started', '2024-07-16', '2024-07-31', 0),
(2, 'M10', '客户验收', 'not_started', '2024-08-01', '2024-08-10', 0),
(2, 'M11', '质保服务', 'not_started', '2024-08-11', '2025-08-10', 0),
(2, 'M12', '项目关闭', 'not_started', '2025-08-11', '2025-08-15', 0);

-- 示例连接器配置
INSERT INTO `pos_connectors` (`connector_code`, `connector_name`, `connector_type`, `config`, `is_enabled`) VALUES
('ERP_TIANSI', '天思ERP', 'ERP', '{"baseUrl":"https://erp.example.com","apiVersion":"v2"}', 1),
('MES_INTERNAL', '内部MES系统', 'MES', '{"baseUrl":"https://mes.example.com","apiVersion":"v1"}', 1),
('IM_WECOM', '企业微信', 'IM', '{"corpId":"ww123456","agentId":"1000001"}', 1),
('IM_FEISHU', '飞书', 'IM', '{"appId":"cli_xxx","appSecret":"xxx"}', 0);

SELECT 'POS数据库表创建完成' AS message;
