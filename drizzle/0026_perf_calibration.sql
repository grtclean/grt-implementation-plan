-- ============================================
-- 0026: Performance Calibration & Incentive System
-- 智能绩效校准与激励体系
-- ============================================

-- Enums
DO $$ BEGIN
  CREATE TYPE composite_score_status_enum AS ENUM ('ai_scored','under_review','calibrated','finalized','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_relationship_enum AS ENUM ('self','manager','peer','subordinate','cross_functional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calibration_session_status_enum AS ENUM ('draft','in_progress','completed','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incentive_category_enum AS ENUM ('skill_premium','project_bonus','innovation_reward','team_incentive','retention_bonus','referral_bonus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incentive_calc_method_enum AS ENUM ('fixed','percentage','formula');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perf_grade_enum AS ENUM ('S','A','B','C','D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table 1: Scoring Weight Configs
CREATE TABLE IF NOT EXISTS perf_scoring_weight_configs (
  id SERIAL PRIMARY KEY,
  department VARCHAR(100),
  role VARCHAR(50),
  bu_code VARCHAR(50),
  period VARCHAR(20),
  kpi_weight DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  aei_weight DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  okr_weight DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  competency_weight DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  feedback_weight DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weight_config_scope ON perf_scoring_weight_configs(department, role, bu_code);

-- Table 2: Composite Scores
CREATE TABLE IF NOT EXISTS perf_composite_scores (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  employee_name VARCHAR(200),
  department VARCHAR(100),
  period VARCHAR(20) NOT NULL,
  ai_composite_score DECIMAL(6,2),
  ai_grade VARCHAR(2),
  final_score DECIMAL(6,2),
  final_grade VARCHAR(2),
  override_justification TEXT,
  override_by INTEGER,
  override_at TIMESTAMP,
  score_breakdown_json JSON,
  status composite_score_status_enum NOT NULL DEFAULT 'ai_scored',
  weight_config_id INTEGER,
  calibration_session_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_composite_employee_period ON perf_composite_scores(employee_id, period);
CREATE INDEX IF NOT EXISTS idx_composite_dept_period ON perf_composite_scores(department, period);
CREATE INDEX IF NOT EXISTS idx_composite_status ON perf_composite_scores(status);

-- Table 3: 360° Feedback
CREATE TABLE IF NOT EXISTS perf_360_feedback (
  id SERIAL PRIMARY KEY,
  target_employee_id INTEGER NOT NULL,
  target_employee_name VARCHAR(200),
  reviewer_employee_id INTEGER NOT NULL,
  reviewer_name VARCHAR(200),
  relationship feedback_relationship_enum NOT NULL,
  period VARCHAR(20) NOT NULL,
  questionnaire JSON,
  overall_score DECIMAL(5,2),
  strengths TEXT,
  improvements TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_360_target_period ON perf_360_feedback(target_employee_id, period);
CREATE INDEX IF NOT EXISTS idx_360_reviewer ON perf_360_feedback(reviewer_employee_id);

-- Table 4: Forced Distribution Configs
CREATE TABLE IF NOT EXISTS perf_forced_distribution_configs (
  id SERIAL PRIMARY KEY,
  department VARCHAR(100),
  bu_code VARCHAR(50),
  period VARCHAR(20),
  grade_s_max_pct DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  grade_a_max_pct DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  grade_b_max_pct DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  grade_c_max_pct DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  grade_d_max_pct DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  is_strict BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forced_dist_scope ON perf_forced_distribution_configs(department, bu_code);

-- Table 5: Calibration Sessions
CREATE TABLE IF NOT EXISTS perf_calibration_sessions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  scope VARCHAR(100) NOT NULL,
  period VARCHAR(20) NOT NULL,
  status calibration_session_status_enum NOT NULL DEFAULT 'draft',
  distribution_snapshot JSON,
  final_distribution JSON,
  participants JSON,
  notes TEXT,
  created_by INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calibration_session_period ON perf_calibration_sessions(period);
CREATE INDEX IF NOT EXISTS idx_calibration_session_status ON perf_calibration_sessions(status);

-- Table 6: Calibration Adjustments
CREATE TABLE IF NOT EXISTS perf_calibration_adjustments (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  composite_score_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  employee_name VARCHAR(200),
  previous_grade VARCHAR(2) NOT NULL,
  new_grade VARCHAR(2) NOT NULL,
  previous_score DECIMAL(6,2) NOT NULL,
  new_score DECIMAL(6,2) NOT NULL,
  adjustment_reason TEXT NOT NULL,
  adjusted_by INTEGER NOT NULL,
  adjusted_by_name VARCHAR(200),
  undone_at TIMESTAMP,
  undone_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calibration_adj_session ON perf_calibration_adjustments(session_id);
CREATE INDEX IF NOT EXISTS idx_calibration_adj_employee ON perf_calibration_adjustments(employee_id);

-- Table 7: Incentive Catalog
CREATE TABLE IF NOT EXISTS perf_incentive_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  category incentive_category_enum NOT NULL,
  description TEXT,
  calculation_method incentive_calc_method_enum NOT NULL DEFAULT 'fixed',
  base_amount DECIMAL(14,2) DEFAULT 0.00,
  max_amount DECIMAL(14,2),
  formula TEXT,
  eligibility_criteria JSON,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incentive_code ON perf_incentive_catalog(code);
CREATE INDEX IF NOT EXISTS idx_incentive_category ON perf_incentive_catalog(category);

-- ============================================
-- Seed Data
-- ============================================

-- Weight configs: Company default + 4 BU-specific
INSERT INTO perf_scoring_weight_configs (department, role, bu_code, kpi_weight, aei_weight, okr_weight, competency_weight, feedback_weight, description) VALUES
  (NULL, NULL, NULL, 30.00, 20.00, 20.00, 15.00, 15.00, '公司默认权重配置'),
  (NULL, NULL, 'overseas', 35.00, 15.00, 20.00, 15.00, 15.00, '海外事业部 — KPI权重偏高'),
  (NULL, NULL, 'commercial', 25.00, 25.00, 20.00, 15.00, 15.00, '商用车事业部 — AEI权重偏高'),
  (NULL, NULL, 'passenger', 30.00, 20.00, 25.00, 10.00, 15.00, '乘用车事业部 — OKR权重偏高'),
  (NULL, NULL, 'semiconductor', 25.00, 20.00, 15.00, 25.00, 15.00, '半导体事业部 — 技术能力权重偏高')
ON CONFLICT DO NOTHING;

-- Forced distribution config: Company default
INSERT INTO perf_forced_distribution_configs (department, bu_code, grade_s_max_pct, grade_a_max_pct, grade_b_max_pct, grade_c_max_pct, grade_d_max_pct, is_strict, description) VALUES
  (NULL, NULL, 5.00, 20.00, 50.00, 20.00, 5.00, false, '公司默认强制分布配置 — 5/20/50/20/5')
ON CONFLICT DO NOTHING;

-- Incentive catalog: 8 items
INSERT INTO perf_incentive_catalog (code, name, name_en, category, description, calculation_method, base_amount, max_amount) VALUES
  ('SKILL_TECH', '技术津贴', 'Technical Skill Premium', 'skill_premium', '持有专业技术认证的员工每月津贴', 'fixed', 2000.00, 5000.00),
  ('SKILL_CERT', '证书津贴', 'Certification Allowance', 'skill_premium', '获得行业认证（PMP/CFA/CPA等）的月度津贴', 'fixed', 1000.00, 3000.00),
  ('SKILL_LANG', '语言津贴', 'Language Premium', 'skill_premium', '掌握外语并在工作中使用的月度津贴', 'fixed', 800.00, 2000.00),
  ('PROJ_COMP', '项目完成奖', 'Project Completion Bonus', 'project_bonus', '项目按时交付的一次性奖金', 'percentage', 5000.00, 50000.00),
  ('PROJ_MILE', '交付里程碑奖', 'Delivery Milestone Bonus', 'project_bonus', '达成关键里程碑节点的奖励', 'fixed', 3000.00, 20000.00),
  ('INNOV_PAT', '专利奖', 'Patent Innovation Reward', 'innovation_reward', '成功申请专利的奖励（发明/实用新型/外观）', 'fixed', 10000.00, 50000.00),
  ('TEAM_Q', '团队季度奖', 'Team Quarterly Incentive', 'team_incentive', '团队季度目标达成的集体奖金', 'percentage', 2000.00, 30000.00),
  ('RETAIN_ANN', '年度留才奖', 'Annual Retention Bonus', 'retention_bonus', '核心人才年度留任奖金', 'fixed', 20000.00, 100000.00)
ON CONFLICT DO NOTHING;
