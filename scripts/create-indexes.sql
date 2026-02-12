-- GRT智能系统数据库索引脚本
-- 创建性能优化所需的索引

-- ============================================
-- 权限管理系统索引
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(open_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 角色表索引
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- 权限表索引
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

-- 用户角色关联索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 角色权限关联索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 数据范围索引
CREATE INDEX IF NOT EXISTS idx_data_scopes_scope_type ON data_scopes(scope_type);
CREATE INDEX IF NOT EXISTS idx_user_data_scopes_user_id ON user_data_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_scopes_scope_id ON user_data_scopes(scope_id);

-- ============================================
-- 菜单导航系统索引
-- ============================================

-- 菜单项索引
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_path ON menu_items(path);

-- 菜单权限关联索引
CREATE INDEX IF NOT EXISTS idx_menu_item_permissions_menu_id ON menu_item_permissions(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_permissions_permission_id ON menu_item_permissions(permission_id);

-- ============================================
-- 来访申请系统索引
-- ============================================

-- 来访申请索引
CREATE INDEX IF NOT EXISTS idx_visitor_requests_status ON visitor_requests(status);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_applicant_id ON visitor_requests(applicant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_visit_date ON visitor_requests(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_created_at ON visitor_requests(created_at);

-- 来访规则索引
CREATE INDEX IF NOT EXISTS idx_visitor_request_rules_rule_type ON visitor_request_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_visitor_request_rules_is_active ON visitor_request_rules(is_active);

-- 来访证件索引
CREATE INDEX IF NOT EXISTS idx_visitor_credentials_request_id ON visitor_credentials(request_id);
CREATE INDEX IF NOT EXISTS idx_visitor_credentials_credential_type ON visitor_credentials(credential_type);

-- ============================================
-- AI助手系统索引
-- ============================================

-- AI助手索引
CREATE INDEX IF NOT EXISTS idx_ai_assistants_assistant_type ON ai_assistants(assistant_type);
CREATE INDEX IF NOT EXISTS idx_ai_assistants_is_active ON ai_assistants(is_active);

-- AI建议索引
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_assistant_id ON ai_suggestions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at);

-- 对话历史索引
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_assistant_type ON chat_history(assistant_type);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- ============================================
-- 能力管理系统索引
-- ============================================

-- 能力配置索引
CREATE INDEX IF NOT EXISTS idx_capability_proof_configs_code ON capability_proof_configs(capability_code);
CREATE INDEX IF NOT EXISTS idx_capability_proof_configs_category ON capability_proof_configs(capability_category);
CREATE INDEX IF NOT EXISTS idx_capability_proof_configs_is_active ON capability_proof_configs(is_active);

-- 公开能力展示索引
CREATE INDEX IF NOT EXISTS idx_public_capability_showcase_type ON public_capability_showcase(showcase_type);
CREATE INDEX IF NOT EXISTS idx_public_capability_showcase_is_public ON public_capability_showcase(is_public);
CREATE INDEX IF NOT EXISTS idx_public_capability_showcase_display_order ON public_capability_showcase(display_order);

-- ============================================
-- CRM系统索引
-- ============================================

-- 客户表索引
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- 商机表索引
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_date ON opportunities(expected_close_date);

-- 联系人表索引
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary);

-- ============================================
-- 项目管理系统索引
-- ============================================

-- 项目表索引
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_current_phase ON projects(current_phase);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);

-- 里程碑表索引
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

-- 阶段门禁表索引
CREATE INDEX IF NOT EXISTS idx_gates_project_id ON gates(project_id);
CREATE INDEX IF NOT EXISTS idx_gates_phase ON gates(phase);
CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);

-- ============================================
-- 成本管理系统索引
-- ============================================

-- 成本预算索引
CREATE INDEX IF NOT EXISTS idx_cost_budgets_project_id ON cost_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_category_id ON cost_budgets(category_id);

-- 实际成本索引
CREATE INDEX IF NOT EXISTS idx_actual_costs_project_id ON actual_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_actual_costs_category_id ON actual_costs(category_id);
CREATE INDEX IF NOT EXISTS idx_actual_costs_cost_date ON actual_costs(cost_date);

-- 成本预警索引
CREATE INDEX IF NOT EXISTS idx_cost_alert_logs_project_id ON cost_alert_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_alert_logs_rule_id ON cost_alert_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_cost_alert_logs_status ON cost_alert_logs(status);

-- ============================================
-- 议程管理系统索引
-- ============================================

-- 会议日程索引
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_meeting_type_id ON meeting_schedules(meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_status ON meeting_schedules(status);
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_start_time ON meeting_schedules(start_time);

-- 培训计划索引
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_start_date ON training_plans(start_date);

-- ============================================
-- 复合索引（用于常见查询组合）
-- ============================================

-- 用户权限查询优化
CREATE INDEX IF NOT EXISTS idx_user_roles_composite ON user_roles(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_composite ON role_permissions(role_id, permission_id);

-- 菜单权限查询优化
CREATE INDEX IF NOT EXISTS idx_menu_item_permissions_composite ON menu_item_permissions(menu_item_id, permission_id);

-- 来访申请查询优化
CREATE INDEX IF NOT EXISTS idx_visitor_requests_composite ON visitor_requests(status, visit_date);

-- 项目查询优化
CREATE INDEX IF NOT EXISTS idx_projects_composite ON projects(status, current_phase);

-- 成本查询优化
CREATE INDEX IF NOT EXISTS idx_actual_costs_composite ON actual_costs(project_id, cost_date);

-- ============================================
-- 完成提示
-- ============================================
SELECT 'Database indexes created successfully!' AS message;
