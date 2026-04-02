-- BI Report Engine — 综合报告平台
-- Tables: bi_report_periods, bi_department_metrics, bi_individual_metrics, bi_report_access_rules

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE bi_period_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bi_report_status AS ENUM ('draft', 'generating', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bi_access_level AS ENUM ('view_summary', 'view_detail', 'view_individual', 'manage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table 1: bi_report_periods ──
CREATE TABLE IF NOT EXISTS bi_report_periods (
  id SERIAL PRIMARY KEY,
  period_type bi_period_type NOT NULL,
  period_label VARCHAR(20) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status bi_report_status NOT NULL DEFAULT 'draft',
  executive_summary TEXT,
  generated_by INTEGER REFERENCES users(id),
  generation_task_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT bi_report_periods_type_label_uniq UNIQUE (period_type, period_label)
);

CREATE INDEX IF NOT EXISTS bi_report_periods_type_idx ON bi_report_periods (period_type);
CREATE INDEX IF NOT EXISTS bi_report_periods_status_idx ON bi_report_periods (status);

-- ── Table 2: bi_department_metrics ──
CREATE TABLE IF NOT EXISTS bi_department_metrics (
  id SERIAL PRIMARY KEY,
  report_period_id INTEGER NOT NULL REFERENCES bi_report_periods(id),
  department_code VARCHAR(50) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  department_type VARCHAR(50),
  target_revenue DECIMAL(15,2),
  actual_revenue DECIMAL(15,2),
  achievement_rate DECIMAL(5,2),
  reward_count INTEGER DEFAULT 0,
  penalty_count INTEGER DEFAULT 0,
  reward_amount DECIMAL(12,2) DEFAULT 0,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  plan_total INTEGER DEFAULT 0,
  plan_completed INTEGER DEFAULT 0,
  plan_achievement_rate DECIMAL(5,2),
  training_sessions INTEGER DEFAULT 0,
  training_attendees INTEGER DEFAULT 0,
  training_quality_score DECIMAL(3,1),
  headcount INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  ai_evaluation TEXT,
  bu_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT bi_dept_metrics_period_dept_uniq UNIQUE (report_period_id, department_code)
);

CREATE INDEX IF NOT EXISTS bi_dept_metrics_period_idx ON bi_department_metrics (report_period_id);
CREATE INDEX IF NOT EXISTS bi_dept_metrics_dept_idx ON bi_department_metrics (department_code);

-- ── Table 3: bi_individual_metrics ──
CREATE TABLE IF NOT EXISTS bi_individual_metrics (
  id SERIAL PRIMARY KEY,
  report_period_id INTEGER NOT NULL REFERENCES bi_report_periods(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name VARCHAR(100),
  department_code VARCHAR(50) NOT NULL,
  department_name VARCHAR(100),
  position VARCHAR(100),
  target_value DECIMAL(15,2),
  actual_value DECIMAL(15,2),
  achievement_rate DECIMAL(5,2),
  rewards JSON,
  penalties JSON,
  plan_items_total INTEGER DEFAULT 0,
  plan_items_completed INTEGER DEFAULT 0,
  plan_achievement_rate DECIMAL(5,2),
  training_attended INTEGER DEFAULT 0,
  training_hours DECIMAL(6,1) DEFAULT 0,
  training_score DECIMAL(3,1),
  kpi_score DECIMAL(5,2),
  rank_in_department INTEGER,
  rank_overall INTEGER,
  ai_coordinated_evaluation TEXT,
  bu_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT bi_individual_metrics_period_user_uniq UNIQUE (report_period_id, user_id)
);

CREATE INDEX IF NOT EXISTS bi_individual_metrics_period_idx ON bi_individual_metrics (report_period_id);
CREATE INDEX IF NOT EXISTS bi_individual_metrics_user_idx ON bi_individual_metrics (user_id);
CREATE INDEX IF NOT EXISTS bi_individual_metrics_dept_idx ON bi_individual_metrics (department_code);

-- ── Table 4: bi_report_access_rules ──
CREATE TABLE IF NOT EXISTS bi_report_access_rules (
  id SERIAL PRIMARY KEY,
  period_type bi_period_type,
  department_code VARCHAR(50),
  granted_to_role VARCHAR(50),
  granted_to_user_id INTEGER REFERENCES users(id),
  access_level bi_access_level NOT NULL DEFAULT 'view_summary',
  granted_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bi_access_rules_role_idx ON bi_report_access_rules (granted_to_role);
CREATE INDEX IF NOT EXISTS bi_access_rules_user_idx ON bi_report_access_rules (granted_to_user_id);
CREATE INDEX IF NOT EXISTS bi_access_rules_active_idx ON bi_report_access_rules (is_active);
