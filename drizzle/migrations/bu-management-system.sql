-- Business Unit Management System Migration

-- 事业部主表
CREATE TABLE IF NOT EXISTS `business_units` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(50) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `description` text,
  `manager_id` int,
  `parent_bu_id` int,
  `fiscal_year` int,
  `status` enum('active','inactive','planning') DEFAULT 'active' NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `bu_code_idx` (`code`),
  INDEX `bu_manager_idx` (`manager_id`),
  INDEX `bu_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 事业部绩效表
CREATE TABLE IF NOT EXISTS `bu_performance` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bu_id` int NOT NULL,
  `fiscal_year` int NOT NULL,
  `fiscal_quarter` int,
  
  -- 经营指标
  `revenue` decimal(15,2),
  `revenue_target` decimal(15,2),
  `revenue_achievement_rate` decimal(5,2),
  
  -- 交付指标
  `projects_completed` int,
  `projects_on_time` int,
  `delivery_on_time_rate` decimal(5,2),
  `project_satisfaction` decimal(3,2),
  
  -- 成本指标
  `total_cost` decimal(15,2),
  `cost_budget` decimal(15,2),
  `cost_variance_rate` decimal(5,2),
  `labor_cost` decimal(15,2),
  `material_cost` decimal(15,2),
  
  -- 质量指标
  `defect_rate` decimal(5,2),
  `rework_rate` decimal(5,2),
  `quality_score` decimal(3,2),
  `customer_complaint_count` int,
  
  -- 客户指标
  `customer_satisfaction` decimal(3,2),
  `customer_retention_rate` decimal(5,2),
  `new_customer_count` int,
  `customer_lifetime_value` decimal(15,2),
  
  -- 人力资源指标
  `employee_count` int,
  `employee_turnover_rate` decimal(5,2),
  `training_hours_per_employee` decimal(8,2),
  `employee_satisfaction` decimal(3,2),
  
  -- 创新指标
  `innovation_projects` int,
  `patent_count` int,
  `process_improvement_count` int,
  `innovation_investment` decimal(15,2),
  
  -- 综合评分
  `overall_score` decimal(5,2),
  `overall_rating` varchar(20),
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `perf_bu_idx` (`bu_id`),
  INDEX `perf_year_idx` (`fiscal_year`),
  INDEX `perf_quarter_idx` (`fiscal_quarter`),
  CONSTRAINT `fk_perf_bu` FOREIGN KEY (`bu_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 关键绩效指标定义表
CREATE TABLE IF NOT EXISTS `bu_kpis` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bu_id` int NOT NULL,
  `kpi_code` varchar(50) NOT NULL,
  `kpi_name` varchar(255) NOT NULL,
  `dimension` varchar(50) NOT NULL,
  `unit` varchar(50),
  
  `fiscal_year` int NOT NULL,
  `target_value` decimal(15,2),
  `weight` decimal(5,2),
  
  -- 阈值定义
  `excellent_threshold` decimal(15,2),
  `good_threshold` decimal(15,2),
  `acceptable_threshold` decimal(15,2),
  
  -- 计算规则
  `calculation_method` varchar(100),
  `calculation_formula` text,
  `data_source` varchar(255),
  
  `status` enum('active','inactive') DEFAULT 'active' NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `kpi_bu_idx` (`bu_id`),
  INDEX `kpi_code_idx` (`kpi_code`),
  INDEX `kpi_dimension_idx` (`dimension`),
  CONSTRAINT `fk_kpi_bu` FOREIGN KEY (`bu_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 绩效历史表
CREATE TABLE IF NOT EXISTS `bu_performance_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bu_id` int NOT NULL,
  `fiscal_year` int NOT NULL,
  `fiscal_quarter` int,
  
  `metric_name` varchar(255) NOT NULL,
  `old_value` decimal(15,2),
  `new_value` decimal(15,2),
  `change_reason` text,
  
  `changed_by` int,
  `change_timestamp` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `hist_bu_idx` (`bu_id`),
  INDEX `hist_period_idx` (`fiscal_year`, `fiscal_quarter`),
  CONSTRAINT `fk_hist_bu` FOREIGN KEY (`bu_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 项目评分表
CREATE TABLE IF NOT EXISTS `project_scores` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` int NOT NULL,
  `bu_id` int,
  
  `delivery_score` decimal(3,2),
  `quality_score` decimal(3,2),
  `cost_score` decimal(3,2),
  `customer_satisfaction` decimal(3,2),
  
  `overall_score` decimal(3,2),
  
  `evaluation_date` timestamp,
  `evaluator_id` int,
  `comments` text,
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `proj_score_project_idx` (`project_id`),
  INDEX `proj_score_bu_idx` (`bu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 项目成员评分表
CREATE TABLE IF NOT EXISTS `project_member_scores` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `bu_id` int,
  
  `performance_score` decimal(3,2),
  `capability_score` decimal(3,2),
  `collaboration_score` decimal(3,2),
  `innovation_score` decimal(3,2),
  
  `overall_score` decimal(3,2),
  
  `evaluation_date` timestamp,
  `evaluator_id` int,
  `comments` text,
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `member_score_project_idx` (`project_id`),
  INDEX `member_score_employee_idx` (`employee_id`),
  INDEX `member_score_bu_idx` (`bu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 事业部员工表
CREATE TABLE IF NOT EXISTS `bu_employees` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bu_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `role` varchar(100),
  `department` varchar(100),
  `join_date` date,
  `leave_date` date,
  `status` enum('active','inactive','on_leave') DEFAULT 'active' NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX `bu_emp_bu_idx` (`bu_id`),
  INDEX `bu_emp_employee_idx` (`employee_id`),
  INDEX `bu_emp_status_idx` (`status`),
  CONSTRAINT `fk_bu_emp_bu` FOREIGN KEY (`bu_id`) REFERENCES `business_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
