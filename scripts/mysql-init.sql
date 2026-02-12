-- ============================================================
-- GRT智能系统 MySQL 数据库初始化脚本
-- 版本: v2.5.21
-- 创建日期: 2026-01-28
-- 
-- 使用说明:
-- 1. 以root用户登录MySQL
-- 2. 执行此脚本: mysql -u root -p < mysql-init.sql
-- 3. 修改下方的密码为您的实际密码
-- ============================================================

-- 配置变量（请修改为您的实际值）
SET @db_name = 'grt_system';
SET @db_user = 'grt_user';
SET @db_password = 'GRT_Secure_Password_2026!';  -- 请修改此密码

-- ============================================================
-- 第一部分: 创建数据库
-- ============================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS grt_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 显示创建结果
SELECT CONCAT('数据库 ', @db_name, ' 创建成功') AS '状态';

-- ============================================================
-- 第二部分: 创建用户和授权
-- ============================================================

-- 创建用户（如果不存在）
-- 注意: MySQL 8.0 需要先创建用户再授权
CREATE USER IF NOT EXISTS 'grt_user'@'localhost' 
    IDENTIFIED BY 'GRT_Secure_Password_2026!';

CREATE USER IF NOT EXISTS 'grt_user'@'%' 
    IDENTIFIED BY 'GRT_Secure_Password_2026!';

-- 授予权限
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

SELECT '用户 grt_user 创建并授权成功' AS '状态';

-- ============================================================
-- 第三部分: 切换到目标数据库
-- ============================================================

USE grt_system;

-- ============================================================
-- 第四部分: 创建核心表结构
-- ============================================================

-- 用户表 (系统核心表)
CREATE TABLE IF NOT EXISTS `user` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `open_id` VARCHAR(255) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(500),
    `role` ENUM('admin', 'user') DEFAULT 'user',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_open_id` (`open_id`),
    INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI助手配置表
CREATE TABLE IF NOT EXISTS `ai_assistant_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `assistant_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `category` ENUM('business', 'role', 'planning', 'system') DEFAULT 'business' NOT NULL,
    `system_prompt` TEXT,
    `model_config` TEXT,
    `knowledge_base_ids` TEXT,
    `allowed_roles` TEXT,
    `is_enabled` TINYINT DEFAULT 1 NOT NULL,
    `rate_limit_per_minute` INT DEFAULT 10,
    `max_context_length` INT DEFAULT 4096,
    `temperature` DECIMAL(3,2) DEFAULT 0.70,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE INDEX `idx_assistant_id` (`assistant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 员工表
CREATE TABLE IF NOT EXISTS `employees` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255),
    `phone` VARCHAR(20),
    `department` VARCHAR(100),
    `position` VARCHAR(100),
    `hire_date` DATE,
    `status` ENUM('active', 'inactive', 'resigned') DEFAULT 'active',
    `avatar` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_employee_id` (`employee_id`),
    INDEX `idx_department` (`department`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 客户表
CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_code` VARCHAR(50) NOT NULL,
    `company_name` VARCHAR(200) NOT NULL,
    `contact_name` VARCHAR(100),
    `contact_phone` VARCHAR(20),
    `contact_email` VARCHAR(255),
    `industry` VARCHAR(100),
    `region` VARCHAR(100),
    `tier` ENUM('tier1', 'tier2', 'tier3') DEFAULT 'tier3',
    `status` ENUM('active', 'inactive', 'prospect') DEFAULT 'prospect',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_customer_code` (`customer_code`),
    INDEX `idx_tier` (`tier`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 项目表
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_code` VARCHAR(50) NOT NULL,
    `project_name` VARCHAR(200) NOT NULL,
    `customer_id` INT,
    `project_manager_id` INT,
    `start_date` DATE,
    `end_date` DATE,
    `status` ENUM('planning', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'planning',
    `budget` DECIMAL(15,2),
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_project_code` (`project_code`),
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`project_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 能力域表
CREATE TABLE IF NOT EXISTS `capability_domains` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_code` VARCHAR(20) NOT NULL,
    `domain_name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `parent_id` INT,
    `level` INT DEFAULT 1,
    `sort_order` INT DEFAULT 0,
    `is_active` TINYINT DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_domain_code` (`domain_code`),
    INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 能力等级表
CREATE TABLE IF NOT EXISTS `capability_levels` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `domain_id` INT NOT NULL,
    `level` ENUM('L1', 'L2', 'L3', 'L4', 'L5') DEFAULT 'L1',
    `evidence_count` INT DEFAULT 0,
    `last_upgrade_date` DATE,
    `next_review_date` DATE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_employee_domain` (`employee_id`, `domain_id`),
    INDEX `idx_level` (`level`),
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`domain_id`) REFERENCES `capability_domains`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 能力证据表
CREATE TABLE IF NOT EXISTS `capability_evidences` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `domain_id` INT NOT NULL,
    `evidence_type` ENUM('project', 'service', 'certification', 'training', 'peer_review') NOT NULL,
    `reference_id` INT,
    `reference_type` VARCHAR(50),
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `score` DECIMAL(5,2),
    `verified_by` INT,
    `verified_at` TIMESTAMP,
    `status` ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_employee_id` (`employee_id`),
    INDEX `idx_domain_id` (`domain_id`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`domain_id`) REFERENCES `capability_domains`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设备表
CREATE TABLE IF NOT EXISTS `devices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_code` VARCHAR(50) NOT NULL,
    `device_name` VARCHAR(200) NOT NULL,
    `device_type` VARCHAR(100),
    `model` VARCHAR(100),
    `serial_number` VARCHAR(100),
    `customer_id` INT,
    `project_id` INT,
    `location` VARCHAR(200),
    `status` ENUM('active', 'maintenance', 'retired') DEFAULT 'active',
    `install_date` DATE,
    `warranty_end_date` DATE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_device_code` (`device_code`),
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 保养记录表
CREATE TABLE IF NOT EXISTS `maintenance_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` INT NOT NULL,
    `maintenance_type` ENUM('preventive', 'corrective', 'emergency') NOT NULL,
    `scheduled_date` DATE,
    `actual_date` DATE,
    `technician_id` INT,
    `description` TEXT,
    `findings` TEXT,
    `actions_taken` TEXT,
    `parts_replaced` TEXT,
    `cost` DECIMAL(10,2),
    `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_device_id` (`device_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_scheduled_date` (`scheduled_date`),
    FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通知消息表
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT,
    `type` ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    `category` VARCHAR(50),
    `reference_type` VARCHAR(50),
    `reference_id` INT,
    `is_read` TINYINT DEFAULT 0,
    `read_at` TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_is_read` (`is_read`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE IF NOT EXISTS `system_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(100) NOT NULL,
    `config_value` TEXT,
    `config_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    `description` VARCHAR(500),
    `is_system` TINYINT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 第五部分: 插入初始数据
-- ============================================================

-- 插入默认能力域
INSERT INTO `capability_domains` (`domain_code`, `domain_name`, `description`, `level`, `sort_order`) VALUES
('T', '技术能力', '技术知识和实践能力', 1, 1),
('S', '系统理解', '对系统架构和业务流程的理解', 1, 2),
('D', '交付能力', '项目交付和执行能力', 1, 3),
('C', '客户价值', '客户服务和价值创造能力', 1, 4),
('K', '知识沉淀', '知识积累和分享能力', 1, 5),
('L', '领导力', '团队领导和影响力', 1, 6)
ON DUPLICATE KEY UPDATE `domain_name` = VALUES(`domain_name`);

-- 插入默认系统配置
INSERT INTO `system_configs` (`config_key`, `config_value`, `config_type`, `description`, `is_system`) VALUES
('system.version', '2.5.21', 'string', '系统版本号', 1),
('system.name', 'GRT智能系统', 'string', '系统名称', 1),
('notification.enabled', 'true', 'boolean', '是否启用通知', 0),
('ai.default_model', 'gemini-pro', 'string', '默认AI模型', 0),
('capability.auto_upgrade', 'true', 'boolean', '是否启用能力自动升级', 0)
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);

-- ============================================================
-- 第六部分: 创建视图
-- ============================================================

-- 员工能力概览视图
CREATE OR REPLACE VIEW `v_employee_capability_overview` AS
SELECT 
    e.id AS employee_id,
    e.employee_id AS employee_code,
    e.name AS employee_name,
    e.department,
    cd.domain_code,
    cd.domain_name,
    cl.level,
    cl.evidence_count,
    cl.last_upgrade_date
FROM employees e
LEFT JOIN capability_levels cl ON e.id = cl.employee_id
LEFT JOIN capability_domains cd ON cl.domain_id = cd.id
WHERE e.status = 'active';

-- 项目概览视图
CREATE OR REPLACE VIEW `v_project_overview` AS
SELECT 
    p.id AS project_id,
    p.project_code,
    p.project_name,
    c.company_name AS customer_name,
    c.tier AS customer_tier,
    e.name AS project_manager,
    p.start_date,
    p.end_date,
    p.status,
    p.budget
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN employees e ON p.project_manager_id = e.id;

-- ============================================================
-- 第七部分: 创建存储过程
-- ============================================================

DELIMITER //

-- 计算员工能力等级的存储过程
CREATE PROCEDURE IF NOT EXISTS `sp_calculate_capability_level`(
    IN p_employee_id INT,
    IN p_domain_id INT
)
BEGIN
    DECLARE v_evidence_count INT DEFAULT 0;
    DECLARE v_avg_score DECIMAL(5,2) DEFAULT 0;
    DECLARE v_new_level VARCHAR(2) DEFAULT 'L1';
    
    -- 统计证据数量和平均分
    SELECT 
        COUNT(*),
        COALESCE(AVG(score), 0)
    INTO v_evidence_count, v_avg_score
    FROM capability_evidences
    WHERE employee_id = p_employee_id 
      AND domain_id = p_domain_id
      AND status = 'verified';
    
    -- 根据证据数量和分数计算等级
    SET v_new_level = CASE
        WHEN v_evidence_count >= 20 AND v_avg_score >= 90 THEN 'L5'
        WHEN v_evidence_count >= 15 AND v_avg_score >= 80 THEN 'L4'
        WHEN v_evidence_count >= 10 AND v_avg_score >= 70 THEN 'L3'
        WHEN v_evidence_count >= 5 AND v_avg_score >= 60 THEN 'L2'
        ELSE 'L1'
    END;
    
    -- 更新或插入能力等级
    INSERT INTO capability_levels (employee_id, domain_id, level, evidence_count, last_upgrade_date)
    VALUES (p_employee_id, p_domain_id, v_new_level, v_evidence_count, CURDATE())
    ON DUPLICATE KEY UPDATE 
        level = v_new_level,
        evidence_count = v_evidence_count,
        last_upgrade_date = IF(level != v_new_level, CURDATE(), last_upgrade_date);
    
    SELECT v_new_level AS new_level, v_evidence_count AS evidence_count, v_avg_score AS avg_score;
END //

DELIMITER ;

-- ============================================================
-- 第八部分: 验证安装
-- ============================================================

-- 显示创建的表
SELECT '========== 数据库表列表 ==========' AS '';
SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'grt_system'
ORDER BY TABLE_NAME;

-- 显示创建的视图
SELECT '========== 视图列表 ==========' AS '';
SELECT TABLE_NAME AS VIEW_NAME
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'grt_system';

-- 显示用户权限
SELECT '========== 用户权限 ==========' AS '';
SHOW GRANTS FOR 'grt_user'@'localhost';

SELECT '========== 数据库初始化完成 ==========' AS '';
SELECT CONCAT('数据库: ', @db_name) AS '信息';
SELECT CONCAT('用户: ', @db_user) AS '信息';
SELECT '请记得修改默认密码!' AS '重要提醒';
