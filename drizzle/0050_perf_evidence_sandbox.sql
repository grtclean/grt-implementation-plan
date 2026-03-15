-- Performance Evidence & Review Sandbox — 7 tables
-- Extends payroll sandbox with evidence-based performance + anomaly detection + approval + lock + metrics

-- Enums
DO $$ BEGIN CREATE TYPE ps_evidence_type_enum AS ENUM ('task_timeliness','internal_feedback','external_feedback','quality_rework','ai_commentary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_review_status_enum AS ENUM ('pending_evidence','ai_suggested','supervisor_confirmed','frozen','disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_bonus_tier_enum AS ENUM ('tier_s','tier_a','tier_b','tier_c','tier_d','tier_zero'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_anomaly_category_enum AS ENUM ('evidence_insufficient','perf_quality_conflict','allowance_no_basis','social_fund_mismatch','tax_bracket_anomaly','net_pay_volatility'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_anomaly_severity_enum AS ENUM ('info','warning','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_approval_stage_enum AS ENUM ('hr_initial','finance_review','dept_manager_confirm','exec_approve'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ps_approval_action_enum AS ENUM ('pending','approved','rejected','returned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Performance Evidence
CREATE TABLE IF NOT EXISTS ps_perf_evidence (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  evidence_type ps_evidence_type_enum NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  score DECIMAL(5,1),
  weight DECIMAL(3,2) DEFAULT 1.00,
  source_system VARCHAR(50),
  source_id VARCHAR(100),
  attachment_url TEXT,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_perf_evidence_cycle_emp_idx ON ps_perf_evidence(cycle_id, employee_name);

-- 2. Performance Review (conclusion layer)
CREATE TABLE IF NOT EXISTS ps_perf_review (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  department VARCHAR(100),
  position_category ps_position_category_enum,
  evidence_count INTEGER DEFAULT 0,
  ai_suggested_score DECIMAL(5,1),
  ai_suggest_reason TEXT,
  ai_risk_flags JSONB,
  ai_generated_at TIMESTAMP,
  supervisor_score DECIMAL(5,1),
  supervisor_id INTEGER,
  supervisor_name VARCHAR(100),
  supervisor_comment TEXT,
  supervisor_confirmed_at TIMESTAMP,
  final_score DECIMAL(5,1),
  bonus_tier ps_bonus_tier_enum,
  bonus_amount DECIMAL(14,2) DEFAULT 0,
  perf_wage1 DECIMAL(14,2) DEFAULT 0,
  perf_wage2 DECIMAL(14,2) DEFAULT 0,
  perf_wage3 DECIMAL(14,2) DEFAULT 0,
  perf_coeff1 DECIMAL(5,2),
  perf_coeff2 DECIMAL(5,2),
  perf_coeff3 DECIMAL(5,2),
  status ps_review_status_enum DEFAULT 'pending_evidence',
  frozen_at TIMESTAMP,
  frozen_by_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_perf_review_cycle_idx ON ps_perf_review(cycle_id);
CREATE INDEX IF NOT EXISTS ps_perf_review_employee_idx ON ps_perf_review(employee_name);

-- 3. Social Fund Policy
CREATE TABLE IF NOT EXISTS ps_social_fund_policy (
  id SERIAL PRIMARY KEY,
  policy_version VARCHAR(20) NOT NULL,
  effective_from VARCHAR(10) NOT NULL,
  effective_to VARCHAR(10),
  region VARCHAR(50) DEFAULT '上海',
  pension_rate DECIMAL(5,4) DEFAULT 0.0800,
  medical_rate DECIMAL(5,4) DEFAULT 0.0200,
  unemployment_rate DECIMAL(5,4) DEFAULT 0.0050,
  housing_fund_rate_min DECIMAL(5,4) DEFAULT 0.0500,
  housing_fund_rate_max DECIMAL(5,4) DEFAULT 0.1200,
  social_insurance_base JSONB,
  housing_fund_base JSONB,
  regulatory_overrides JSONB,
  remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Anomaly Detection
CREATE TABLE IF NOT EXISTS ps_anomaly (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  category ps_anomaly_category_enum NOT NULL,
  severity ps_anomaly_severity_enum NOT NULL DEFAULT 'warning',
  title VARCHAR(300) NOT NULL,
  description TEXT,
  field_name VARCHAR(50),
  expected_value VARCHAR(100),
  actual_value VARCHAR(100),
  suggested_action TEXT,
  resolved_by_id INTEGER,
  resolved_at TIMESTAMP,
  resolution TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_anomaly_cycle_idx ON ps_anomaly(cycle_id);
CREATE INDEX IF NOT EXISTS ps_anomaly_category_idx ON ps_anomaly(category, is_resolved);

-- 5. Approval Flow
CREATE TABLE IF NOT EXISTS ps_approval_flow (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  stage ps_approval_stage_enum NOT NULL,
  stage_order INTEGER NOT NULL,
  action ps_approval_action_enum NOT NULL DEFAULT 'pending',
  reviewer_id INTEGER,
  reviewer_name VARCHAR(100),
  comment TEXT,
  checklist JSONB,
  action_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_approval_flow_cycle_idx ON ps_approval_flow(cycle_id, stage_order);

-- 6. Lock Records
CREATE TABLE IF NOT EXISTS ps_lock_record (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  lock_type VARCHAR(30) NOT NULL,
  locked_by_id INTEGER NOT NULL,
  locked_by_name VARCHAR(100),
  locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  unlocked_by_id INTEGER,
  unlocked_at TIMESTAMP,
  reason TEXT,
  snapshot_hash VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS ps_lock_record_cycle_idx ON ps_lock_record(cycle_id);

-- 7. Post-Payout Metrics
CREATE TABLE IF NOT EXISTS ps_post_payout_metrics (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  period VARCHAR(7) NOT NULL,
  department VARCHAR(100),
  total_gross_pay DECIMAL(16,2),
  total_net_pay DECIMAL(16,2),
  total_perf_bonus DECIMAL(16,2),
  anomaly_count INTEGER DEFAULT 0,
  manual_adjust_count INTEGER DEFAULT 0,
  tax_anomaly_count INTEGER DEFAULT 0,
  approval_hours DECIMAL(8,1),
  excel_match_rate DECIMAL(5,1),
  gross_pay_delta_pct DECIMAL(5,2),
  net_pay_delta_pct DECIMAL(5,2),
  perf_bonus_delta_pct DECIMAL(5,2),
  gpt_summary TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_metrics_cycle_idx ON ps_post_payout_metrics(cycle_id);

-- ═══ SEED DATA ═══

-- Social fund policy (Shanghai 2026)
INSERT INTO ps_social_fund_policy (policy_version, effective_from, effective_to, region, pension_rate, medical_rate, unemployment_rate, housing_fund_rate_min, housing_fund_rate_max, social_insurance_base, housing_fund_base, remarks)
VALUES ('2026-H1', '2026-01-01', '2026-06-30', '上海', 0.0800, 0.0200, 0.0050, 0.0500, 0.1200,
  '{"min": 7310, "max": 36549}', '{"min": 2690, "max": 36549}',
  '上海市2026年上半年社保公积金缴纳政策');

-- Seed performance evidence for pilot cycle (202601)
INSERT INTO ps_perf_evidence (cycle_id, employee_name, evidence_type, title, score, weight, source_system) VALUES
  (1, '倪亚琴', 'task_timeliness', '1月采购任务按期完成率95%', 90, 1.00, 'task_board'),
  (1, '倪亚琴', 'quality_rework', '1月零返工记录', 95, 0.80, 'quality'),
  (1, '倪亚琴', 'internal_feedback', '项目组协作反馈良好', 85, 0.60, 'crm'),
  (1, '戴晓燕', 'task_timeliness', '1月销售目标达成率62%', 55, 1.00, 'crm'),
  (1, '戴晓燕', 'external_feedback', '客户反馈一般', 60, 0.80, 'crm'),
  (1, '金晓锋', 'task_timeliness', '1月生产计划执行率92%', 85, 1.00, 'task_board'),
  (1, '金晓锋', 'quality_rework', '1月质量异常1起已闭环', 78, 0.80, 'quality'),
  (1, '洪香龙', 'task_timeliness', '1月设计任务按期完成', 82, 1.00, 'task_board'),
  (1, '孙坚', 'task_timeliness', '1月电气项目交付准时', 84, 1.00, 'task_board'),
  (1, '孙坚', 'quality_rework', '零返工', 90, 0.80, 'quality');

-- Seed approval flow template for cycle 1
INSERT INTO ps_approval_flow (cycle_id, stage, stage_order, action) VALUES
  (1, 'hr_initial', 1, 'pending'),
  (1, 'finance_review', 2, 'pending'),
  (1, 'dept_manager_confirm', 3, 'pending'),
  (1, 'exec_approve', 4, 'pending');
