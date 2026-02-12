-- GRT智能系统数据库索引脚本 (MySQL/TiDB兼容版)
-- 创建性能优化所需的索引
-- 使用存储过程安全创建索引（如果不存在）

DELIMITER //

-- 创建安全添加索引的存储过程
DROP PROCEDURE IF EXISTS safe_create_index//
CREATE PROCEDURE safe_create_index(
    IN table_name VARCHAR(128),
    IN index_name VARCHAR(128),
    IN index_columns VARCHAR(256)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = table_name
    AND index_name = index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', index_name, ' ON ', table_name, '(', index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Created index: ', index_name, ' on ', table_name) AS result;
    ELSE
        SELECT CONCAT('Index already exists: ', index_name, ' on ', table_name) AS result;
    END IF;
END//

DELIMITER ;

-- ============================================
-- 权限管理系统索引
-- ============================================

-- 用户表索引
CALL safe_create_index('users', 'idx_users_open_id', 'open_id');
CALL safe_create_index('users', 'idx_users_role', 'role');
CALL safe_create_index('users', 'idx_users_created_at', 'created_at');

-- 角色表索引
CALL safe_create_index('roles', 'idx_roles_name', 'name');
CALL safe_create_index('roles', 'idx_roles_is_active', 'is_active');

-- 权限表索引
CALL safe_create_index('permissions', 'idx_permissions_code', 'code');
CALL safe_create_index('permissions', 'idx_permissions_module', 'module');
CALL safe_create_index('permissions', 'idx_permissions_is_active', 'is_active');

-- 用户角色关联索引
CALL safe_create_index('user_roles', 'idx_user_roles_user_id', 'user_id');
CALL safe_create_index('user_roles', 'idx_user_roles_role_id', 'role_id');
CALL safe_create_index('user_roles', 'idx_user_roles_composite', 'user_id, role_id');

-- 角色权限关联索引
CALL safe_create_index('role_permissions', 'idx_role_permissions_role_id', 'role_id');
CALL safe_create_index('role_permissions', 'idx_role_permissions_permission_id', 'permission_id');
CALL safe_create_index('role_permissions', 'idx_role_permissions_composite', 'role_id, permission_id');

-- 数据范围索引
CALL safe_create_index('data_scopes', 'idx_data_scopes_scope_type', 'scope_type');
CALL safe_create_index('user_data_scopes', 'idx_user_data_scopes_user_id', 'user_id');
CALL safe_create_index('user_data_scopes', 'idx_user_data_scopes_scope_id', 'scope_id');

-- ============================================
-- 菜单导航系统索引
-- ============================================

-- 菜单项索引
CALL safe_create_index('menu_items', 'idx_menu_items_parent_id', 'parent_id');
CALL safe_create_index('menu_items', 'idx_menu_items_sort_order', 'sort_order');
CALL safe_create_index('menu_items', 'idx_menu_items_is_active', 'is_active');
CALL safe_create_index('menu_items', 'idx_menu_items_path', 'path');

-- 菜单权限关联索引
CALL safe_create_index('menu_item_permissions', 'idx_menu_item_permissions_menu_id', 'menu_item_id');
CALL safe_create_index('menu_item_permissions', 'idx_menu_item_permissions_permission_id', 'permission_id');
CALL safe_create_index('menu_item_permissions', 'idx_menu_item_permissions_composite', 'menu_item_id, permission_id');

-- ============================================
-- 来访申请系统索引
-- ============================================

-- 来访申请索引
CALL safe_create_index('visitor_requests', 'idx_visitor_requests_status', 'status');
CALL safe_create_index('visitor_requests', 'idx_visitor_requests_applicant_id', 'applicant_id');
CALL safe_create_index('visitor_requests', 'idx_visitor_requests_visit_date', 'visit_date');
CALL safe_create_index('visitor_requests', 'idx_visitor_requests_created_at', 'created_at');
CALL safe_create_index('visitor_requests', 'idx_visitor_requests_composite', 'status, visit_date');

-- 来访规则索引
CALL safe_create_index('visitor_request_rules', 'idx_visitor_request_rules_rule_type', 'rule_type');
CALL safe_create_index('visitor_request_rules', 'idx_visitor_request_rules_is_active', 'is_active');

-- 来访证件索引
CALL safe_create_index('visitor_credentials', 'idx_visitor_credentials_request_id', 'request_id');
CALL safe_create_index('visitor_credentials', 'idx_visitor_credentials_credential_type', 'credential_type');

-- ============================================
-- AI助手系统索引
-- ============================================

-- AI助手索引
CALL safe_create_index('ai_assistants', 'idx_ai_assistants_assistant_type', 'assistant_type');
CALL safe_create_index('ai_assistants', 'idx_ai_assistants_is_active', 'is_active');

-- AI建议索引
CALL safe_create_index('ai_suggestions', 'idx_ai_suggestions_assistant_id', 'assistant_id');
CALL safe_create_index('ai_suggestions', 'idx_ai_suggestions_status', 'status');
CALL safe_create_index('ai_suggestions', 'idx_ai_suggestions_created_at', 'created_at');

-- 对话历史索引
CALL safe_create_index('chat_history', 'idx_chat_history_user_id', 'user_id');
CALL safe_create_index('chat_history', 'idx_chat_history_assistant_type', 'assistant_type');
CALL safe_create_index('chat_history', 'idx_chat_history_created_at', 'created_at');

-- ============================================
-- 能力管理系统索引
-- ============================================

-- 能力配置索引
CALL safe_create_index('capability_proof_configs', 'idx_capability_proof_configs_code', 'capability_code');
CALL safe_create_index('capability_proof_configs', 'idx_capability_proof_configs_category', 'capability_category');
CALL safe_create_index('capability_proof_configs', 'idx_capability_proof_configs_is_active', 'is_active');

-- 公开能力展示索引
CALL safe_create_index('public_capability_showcase', 'idx_public_capability_showcase_type', 'showcase_type');
CALL safe_create_index('public_capability_showcase', 'idx_public_capability_showcase_is_public', 'is_public');
CALL safe_create_index('public_capability_showcase', 'idx_public_capability_showcase_display_order', 'display_order');

-- ============================================
-- CRM系统索引
-- ============================================

-- 客户表索引
CALL safe_create_index('customers', 'idx_customers_company_name', 'company_name');
CALL safe_create_index('customers', 'idx_customers_tier', 'tier');
CALL safe_create_index('customers', 'idx_customers_status', 'status');
CALL safe_create_index('customers', 'idx_customers_created_at', 'created_at');

-- 商机表索引
CALL safe_create_index('opportunities', 'idx_opportunities_customer_id', 'customer_id');
CALL safe_create_index('opportunities', 'idx_opportunities_stage', 'stage');
CALL safe_create_index('opportunities', 'idx_opportunities_status', 'status');
CALL safe_create_index('opportunities', 'idx_opportunities_expected_close_date', 'expected_close_date');

-- 联系人表索引
CALL safe_create_index('contacts', 'idx_contacts_customer_id', 'customer_id');
CALL safe_create_index('contacts', 'idx_contacts_is_primary', 'is_primary');

-- ============================================
-- 项目管理系统索引
-- ============================================

-- 项目表索引
CALL safe_create_index('projects', 'idx_projects_customer_id', 'customer_id');
CALL safe_create_index('projects', 'idx_projects_status', 'status');
CALL safe_create_index('projects', 'idx_projects_current_phase', 'current_phase');
CALL safe_create_index('projects', 'idx_projects_start_date', 'start_date');
CALL safe_create_index('projects', 'idx_projects_composite', 'status, current_phase');

-- 里程碑表索引
CALL safe_create_index('milestones', 'idx_milestones_project_id', 'project_id');
CALL safe_create_index('milestones', 'idx_milestones_status', 'status');
CALL safe_create_index('milestones', 'idx_milestones_due_date', 'due_date');

-- 阶段门禁表索引
CALL safe_create_index('gates', 'idx_gates_project_id', 'project_id');
CALL safe_create_index('gates', 'idx_gates_phase', 'phase');
CALL safe_create_index('gates', 'idx_gates_status', 'status');

-- ============================================
-- 成本管理系统索引
-- ============================================

-- 成本预算索引
CALL safe_create_index('cost_budgets', 'idx_cost_budgets_project_id', 'project_id');
CALL safe_create_index('cost_budgets', 'idx_cost_budgets_category_id', 'category_id');

-- 实际成本索引
CALL safe_create_index('actual_costs', 'idx_actual_costs_project_id', 'project_id');
CALL safe_create_index('actual_costs', 'idx_actual_costs_category_id', 'category_id');
CALL safe_create_index('actual_costs', 'idx_actual_costs_cost_date', 'cost_date');
CALL safe_create_index('actual_costs', 'idx_actual_costs_composite', 'project_id, cost_date');

-- 成本预警索引
CALL safe_create_index('cost_alert_logs', 'idx_cost_alert_logs_project_id', 'project_id');
CALL safe_create_index('cost_alert_logs', 'idx_cost_alert_logs_rule_id', 'rule_id');
CALL safe_create_index('cost_alert_logs', 'idx_cost_alert_logs_status', 'status');

-- ============================================
-- 议程管理系统索引
-- ============================================

-- 会议日程索引
CALL safe_create_index('meeting_schedules', 'idx_meeting_schedules_meeting_type_id', 'meeting_type_id');
CALL safe_create_index('meeting_schedules', 'idx_meeting_schedules_status', 'status');
CALL safe_create_index('meeting_schedules', 'idx_meeting_schedules_start_time', 'start_time');

-- 培训计划索引
CALL safe_create_index('training_plans', 'idx_training_plans_status', 'status');
CALL safe_create_index('training_plans', 'idx_training_plans_start_date', 'start_date');

-- ============================================
-- 清理存储过程
-- ============================================

DROP PROCEDURE IF EXISTS safe_create_index;

-- ============================================
-- 完成提示
-- ============================================
SELECT 'Database indexes created successfully!' AS message;
