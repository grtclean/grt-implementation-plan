-- Employee Growth Platform (员工成长平台)
-- 6 tables: training_materials, training_stage_plans, employee_rewards_penalties,
--           employee_task_metrics, cloud_hall_access_grants, employee_periodic_reports

-- 1. Training Materials (培训资料库)
CREATE TABLE IF NOT EXISTS training_materials (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  category VARCHAR(30) NOT NULL,
  format VARCHAR(20),
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  difficulty VARCHAR(20),
  tags JSONB,
  target_roles JSONB,
  target_departments JSONB,
  is_public BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tm_category ON training_materials(category);
CREATE INDEX IF NOT EXISTS idx_tm_status ON training_materials(status);
CREATE INDEX IF NOT EXISTS idx_tm_difficulty ON training_materials(difficulty);

-- 2. Training Stage Plans (阶段性培训计划)
CREATE TABLE IF NOT EXISTS training_stage_plans (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lifecycle_stage VARCHAR(20) NOT NULL,
  plan_name VARCHAR(300) NOT NULL,
  due_date VARCHAR(10) NOT NULL,
  trigger_date VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  training_format VARCHAR(20),
  material_ids JSONB,
  prerequisite_kpi_score REAL,
  prerequisite_capability_level INTEGER,
  completion_criteria JSONB,
  test_id INTEGER,
  test_score INTEGER,
  test_passed BOOLEAN,
  completed_at TIMESTAMP,
  supervisor_signoff INTEGER REFERENCES users(id),
  supervisor_signoff_at TIMESTAMP,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, lifecycle_stage)
);
CREATE INDEX IF NOT EXISTS idx_tsp_status ON training_stage_plans(status);
CREATE INDEX IF NOT EXISTS idx_tsp_due ON training_stage_plans(due_date);
CREATE INDEX IF NOT EXISTS idx_tsp_user ON training_stage_plans(user_id);

-- 3. Employee Rewards & Penalties (表彰与处罚)
CREATE TABLE IF NOT EXISTS employee_rewards_penalties (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  severity VARCHAR(30),
  amount REAL,
  currency VARCHAR(10) DEFAULT 'CNY',
  source_type VARCHAR(50),
  source_id INTEGER,
  issued_by INTEGER REFERENCES users(id),
  issued_at VARCHAR(10) NOT NULL,
  period VARCHAR(7),
  status VARCHAR(20) DEFAULT 'active',
  appeal_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_erp_user_period ON employee_rewards_penalties(user_id, period);
CREATE INDEX IF NOT EXISTS idx_erp_type ON employee_rewards_penalties(type);
CREATE INDEX IF NOT EXISTS idx_erp_issued ON employee_rewards_penalties(issued_at);

-- 4. Employee Task Metrics (任务质量交付指标)
CREATE TABLE IF NOT EXISTS employee_task_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER,
  period VARCHAR(7) NOT NULL,
  tasks_assigned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_on_time INTEGER DEFAULT 0,
  tasks_late INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,
  avg_quality_score REAL,
  avg_delivery_days REAL,
  defect_count INTEGER DEFAULT 0,
  rework_count INTEGER DEFAULT 0,
  customer_satisfaction_avg REAL,
  project_contributions JSONB,
  ai_generated_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period)
);
CREATE INDEX IF NOT EXISTS idx_etm_period ON employee_task_metrics(period);

-- 5. Cloud Hall Access Grants (云厅内容授权)
CREATE TABLE IF NOT EXISTS cloud_hall_access_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content_type VARCHAR(30) NOT NULL,
  content_id INTEGER NOT NULL,
  content_title VARCHAR(300),
  access_level VARCHAR(20) DEFAULT 'view',
  grant_status VARCHAR(20) DEFAULT 'pending',
  request_reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_cag_status ON cloud_hall_access_grants(grant_status);
CREATE INDEX IF NOT EXISTS idx_cag_type ON cloud_hall_access_grants(content_type);

-- 6. Employee Periodic Reports (周期性报告)
CREATE TABLE IF NOT EXISTS employee_periodic_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER,
  report_type VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL,
  title VARCHAR(300),
  status VARCHAR(20) DEFAULT 'draft',
  planned_items JSONB,
  completed_items JSONB,
  completion_rate REAL,
  key_accomplishments JSONB,
  challenges JSONB,
  next_period_goals JSONB,
  kpi_summary_json JSONB,
  kpi_overall_score REAL,
  reward_penalty_summary JSONB,
  task_metrics_summary JSONB,
  trend_data_json JSONB,
  year_over_year_comparison JSONB,
  training_progress JSONB,
  capability_snapshot JSONB,
  ai_narrative TEXT,
  ai_recommendations JSONB,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  manager_comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, report_type, period)
);
CREATE INDEX IF NOT EXISTS idx_epr_type ON employee_periodic_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_epr_period ON employee_periodic_reports(period);
CREATE INDEX IF NOT EXISTS idx_epr_status ON employee_periodic_reports(status);
CREATE INDEX IF NOT EXISTS idx_epr_user ON employee_periodic_reports(user_id);

-- Seed: Demo training materials
INSERT INTO training_materials (code, title, category, format, description, difficulty, tags, target_roles, is_public, status)
VALUES
  ('TM-2026-001', '新员工入职手册 — GRT企业文化与制度', 'handbook', 'pdf', '涵盖公司历史、组织架构、考勤制度、安全规范等入职必读内容', 'beginner', '["入职","制度","文化"]', '["employee"]', true, 'active'),
  ('TM-2026-002', '超声波清洗设备操作规范（UC-3000系列）', 'document', 'pdf', 'UC-3000系列超声波清洗机的标准操作流程、安全注意事项、日常维护', 'intermediate', '["设备","操作","UC-3000"]', '["bu_mech","bu_elec"]', true, 'active'),
  ('TM-2026-003', '质量管理体系 IATF 16949 基础培训', 'slides', 'pptx', 'IATF 16949质量管理体系核心要求、过程方法、FMEA基础', 'intermediate', '["质量","IATF","FMEA"]', '["quality_eng","bu_mech"]', true, 'active'),
  ('TM-2026-004', 'ERP系统操作培训（天斯ERP）', 'video', 'mp4', '天斯ERP日常操作：工单管理、物料查询、库存盘点、报表导出', 'beginner', '["ERP","系统","操作"]', '["employee"]', true, 'active'),
  ('TM-2026-005', '项目管理实战 — 从P0到交付', 'video', 'mp4', 'GRT项目管理方法论：阶段门评审、风险管理、进度跟踪、客户沟通', 'advanced', '["项目","管理","阶段门"]', '["bu_pm","bu_sales"]', true, 'active'),
  ('TM-2026-006', 'SP-5000喷淋清洗设备3D拆解演示', '3d_model', 'url', 'Cloud Hall内SP-5000设备3D模型，可旋转查看内部结构与工作原理', 'intermediate', '["3D","SP-5000","产品"]', '["bu_mech","bu_elec","bu_sales"]', false, 'active'),
  ('TM-2026-007', '安全生产与5S管理', 'slides', 'pptx', '车间安全规范、5S管理标准、应急预案、消防知识', 'beginner', '["安全","5S","生产"]', '["employee"]', true, 'active'),
  ('TM-2026-008', '客户沟通与投诉处理技巧', 'video', 'mp4', '客户接待礼仪、投诉分级处理、满意度提升策略', 'intermediate', '["客户","沟通","售后"]', '["cs_engineer","bu_sales"]', true, 'active')
ON CONFLICT (code) DO NOTHING;
