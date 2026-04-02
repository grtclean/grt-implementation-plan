-- Sales Coach Engine — 全球销售全域赋能与战术指导引擎
-- Tables: client_annual_budgets, project_bidding_strategies
-- Columns: employee_daily_logs.ai_coach_feedback, .pipeline_health_score

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE sc_budget_deadline_status AS ENUM ('pending', 'partial', 'completed', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sc_bidding_strategy_status AS ENUM ('draft', 'submitted', 'reviewed', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table 1: client_annual_budgets ──
CREATE TABLE IF NOT EXISTS client_annual_budgets (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  cleaning_capex DECIMAL(15,2) DEFAULT 0,
  vision_capex DECIMAL(15,2) DEFAULT 0,
  zld_capex DECIMAL(15,2) DEFAULT 0,
  total_capex DECIMAL(15,2) DEFAULT 0,
  deadline_status sc_budget_deadline_status NOT NULL DEFAULT 'pending',
  deadline_date TIMESTAMP,
  recorded_by INTEGER REFERENCES users(id),
  bu_code VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT client_annual_budgets_client_year_uniq UNIQUE (client_id, year)
);

CREATE INDEX IF NOT EXISTS client_annual_budgets_bu_idx ON client_annual_budgets (bu_code);
CREATE INDEX IF NOT EXISTS client_annual_budgets_year_idx ON client_annual_budgets (year);
CREATE INDEX IF NOT EXISTS client_annual_budgets_status_idx ON client_annual_budgets (deadline_status);

-- ── Table 2: project_bidding_strategies ──
CREATE TABLE IF NOT EXISTS project_bidding_strategies (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  opportunity_id INTEGER,
  project_background TEXT,
  communication_plan TEXT,
  bidding_strategy TEXT,
  competitor_analysis JSON,
  confidence_level INTEGER NOT NULL DEFAULT 3,
  stage VARCHAR(10) NOT NULL DEFAULT 'M0',
  status sc_bidding_strategy_status NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  bu_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT project_bidding_strategies_project_uniq UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS project_bidding_strategies_stage_idx ON project_bidding_strategies (stage);
CREATE INDEX IF NOT EXISTS project_bidding_strategies_bu_idx ON project_bidding_strategies (bu_code);
CREATE INDEX IF NOT EXISTS project_bidding_strategies_status_idx ON project_bidding_strategies (status);

-- ── Extend employee_daily_logs with AI coach columns ──
ALTER TABLE employee_daily_logs ADD COLUMN IF NOT EXISTS ai_coach_feedback JSON;
ALTER TABLE employee_daily_logs ADD COLUMN IF NOT EXISTS pipeline_health_score INTEGER;
