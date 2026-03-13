-- ══════════════════════════════════════════════════════════════════
-- GRT Assessment Lifecycle & Trigger Rules
-- CEO指令: 测评触发条件 + 多轮测试+面试 + 后果执行 + 生命周期集成
-- ══════════════════════════════════════════════════════════════════

-- Enums
DO $$ BEGIN
  CREATE TYPE assessment_trigger_type AS ENUM (
    'onboarding', 'probation_end', 'position_transfer',
    'skill_upgrade_request', 'grade_promotion',
    'points_below_threshold', 'points_below_peers', 'consecutive_low_kpi',
    'cert_expiry', 'periodic_revalidation', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_workflow_status AS ENUM (
    'pending', 'in_progress', 'round_completed', 'passed', 'failed', 'cancelled', 'on_hold'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_round_type AS ENUM (
    'written_test', 'practical_test', 'interview', 'panel_review', 'probation_eval'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_round_status AS ENUM (
    'pending', 'scheduled', 'in_progress', 'passed', 'failed', 'waived', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE skill_enforcement_type AS ENUM (
    'revert_six_day_week', 'revert_skill_level', 'position_penalty',
    'salary_grade_freeze', 'benefit_revocation', 'probation_extension',
    'mandatory_training', 'position_downgrade_warning'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_status AS ENUM ('active', 'lifted', 'expired', 'appealed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table 1: Assessment Trigger Rules ──────────────────────

CREATE TABLE IF NOT EXISTS assessment_trigger_rules (
  id SERIAL PRIMARY KEY,
  rule_code VARCHAR(80) NOT NULL UNIQUE,
  rule_name VARCHAR(200) NOT NULL,
  rule_name_en VARCHAR(200),
  trigger_type assessment_trigger_type NOT NULL,
  description TEXT,
  applicable_positions JSONB,
  conditions JSONB NOT NULL,
  assessment_level VARCHAR(10),
  is_multi_round BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_template_id INTEGER,
  failure_consequences JSONB NOT NULL DEFAULT '[]',
  max_retries INTEGER NOT NULL DEFAULT 2,
  retry_cooldown_days INTEGER NOT NULL DEFAULT 30,
  grace_period_days INTEGER NOT NULL DEFAULT 14,
  priority INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trigger_rule_type ON assessment_trigger_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_trigger_rule_active ON assessment_trigger_rules(is_active);

-- ── Table 2: Assessment Workflows ──────────────────────────

CREATE TABLE IF NOT EXISTS assessment_workflows (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  trigger_rule_id INTEGER,
  trigger_log_id INTEGER,
  position_key VARCHAR(80) NOT NULL,
  target_level VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 1,
  total_rounds INTEGER NOT NULL,
  status assessment_workflow_status NOT NULL DEFAULT 'pending',
  overall_score DECIMAL(5,2),
  round_weights JSONB NOT NULL,
  final_decision VARCHAR(20),
  decided_by INTEGER,
  decided_at TIMESTAMP,
  decision_notes TEXT,
  scheduled_start_date VARCHAR(10),
  deadline VARCHAR(10),
  completed_at TIMESTAMP,
  retry_number INTEGER NOT NULL DEFAULT 0,
  lifecycle_stage_at_trigger VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workflow_employee ON assessment_workflows(employee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_position ON assessment_workflows(position_key);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON assessment_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_purpose ON assessment_workflows(purpose);

-- ── Table 3: Workflow Rounds ───────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_workflow_rounds (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  round_type assessment_round_type NOT NULL,
  round_name VARCHAR(200) NOT NULL,
  round_status assessment_round_status NOT NULL DEFAULT 'pending',
  session_id INTEGER,
  paper_id INTEGER,
  score DECIMAL(5,2),
  pass_score DECIMAL(5,2) NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100,
  panelists JSONB,
  evaluation_criteria JSONB,
  scheduled_date VARCHAR(10),
  scheduled_time VARCHAR(5),
  location VARCHAR(200),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (workflow_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_round_workflow ON assessment_workflow_rounds(workflow_id);
CREATE INDEX IF NOT EXISTS idx_round_status ON assessment_workflow_rounds(round_status);

-- ── Table 4: Assessment Trigger Log ────────────────────────

CREATE TABLE IF NOT EXISTS assessment_trigger_log (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  rule_id INTEGER NOT NULL,
  rule_code VARCHAR(80) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_data JSONB NOT NULL,
  workflow_id INTEGER,
  session_id INTEGER,
  outcome VARCHAR(30),
  outcome_at TIMESTAMP,
  position_key VARCHAR(80),
  current_level VARCHAR(10),
  target_level VARCHAR(10),
  lifecycle_stage VARCHAR(10),
  due_date VARCHAR(10),
  enforcement_applied BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trigger_log_employee ON assessment_trigger_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_trigger_log_rule ON assessment_trigger_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_trigger_log_type ON assessment_trigger_log(trigger_type);
CREATE INDEX IF NOT EXISTS idx_trigger_log_outcome ON assessment_trigger_log(outcome);

-- ── Table 5: Skill Enforcement Actions ─────────────────────

CREATE TABLE IF NOT EXISTS skill_enforcement_actions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  trigger_log_id INTEGER,
  workflow_id INTEGER,
  enforcement_type skill_enforcement_type NOT NULL,
  enforcement_status enforcement_status NOT NULL DEFAULT 'active',
  description TEXT NOT NULL,
  enforcement_data JSONB NOT NULL,
  start_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10),
  lifted_at TIMESTAMP,
  lifted_by INTEGER,
  lifted_reason TEXT,
  reassessment_passed BOOLEAN,
  reassessment_session_id INTEGER,
  issued_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skill_enforce_employee ON skill_enforcement_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_enforce_type ON skill_enforcement_actions(enforcement_type);
CREATE INDEX IF NOT EXISTS idx_skill_enforce_status ON skill_enforcement_actions(enforcement_status);

-- ── Table 6: Position Benchmark Scores ─────────────────────

CREATE TABLE IF NOT EXISTS position_benchmark_scores (
  id SERIAL PRIMARY KEY,
  position_key VARCHAR(80) NOT NULL,
  period VARCHAR(7) NOT NULL,
  avg_points DECIMAL(10,2),
  avg_kpi_score DECIMAL(5,2),
  min_acceptable_points INTEGER,
  peer_threshold_10pct INTEGER,
  employee_count INTEGER NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (position_key, period)
);
CREATE INDEX IF NOT EXISTS idx_benchmark_position ON position_benchmark_scores(position_key);
CREATE INDEX IF NOT EXISTS idx_benchmark_period ON position_benchmark_scores(period);

-- ══════════════════════════════════════════════════════════════════
-- SEED: Default trigger rules (CEO's institutional framework)
-- ══════════════════════════════════════════════════════════════════

INSERT INTO assessment_trigger_rules (rule_code, rule_name, rule_name_en, trigger_type, description, conditions, is_multi_round, failure_consequences, max_retries, retry_cooldown_days, grace_period_days, priority) VALUES

-- ── 1. 入职基础测评 ──
('onboarding_L1', '入职基础能力测评', 'Onboarding Basic Assessment',
 'onboarding', '新员工入职30天内完成L1基础能力测评，评估是否具备岗位基本技能',
 '{"lifecycleStage": "G2", "daysAfterHire": 30}',
 FALSE,
 '[{"type": "mandatory_training", "description": "未通过需参加岗位基础培训后重考"}]',
 3, 14, 30, 80),

-- ── 2. 转正测评 (G7) ──
('probation_assessment', '转正综合测评', 'Regularization Assessment',
 'probation_end', '试用期满前进行L2综合测评，包含笔试+实操+面试三轮',
 '{"lifecycleStage": "G7", "monthsEmployed": 3}',
 TRUE,
 '[{"type": "probation_extension", "durationDays": 30, "description": "延长试用期1个月"},
   {"type": "mandatory_training", "description": "安排导师带教+每周实操训练"}]',
 1, 30, 14, 90),

-- ── 3. 岗位调整测评 ──
('position_transfer_eval', '岗位调整能力测评', 'Position Transfer Assessment',
 'position_transfer', '岗位调整时需通过新岗位的相应等级测评',
 '{"requireNewPositionTest": true}',
 TRUE,
 '[{"type": "revert_skill_level", "toLevelDelta": -1, "description": "未通过降一级技能等级"},
   {"type": "position_penalty", "description": "原岗位考核处罚记录"}]',
 2, 30, 21, 85),

-- ── 4. 技能等级提升申请 ──
('skill_upgrade', '技能等级提升测评', 'Skill Level Upgrade Assessment',
 'skill_upgrade_request', '申请技能等级提升时需通过多轮测评（笔试+实操+面试评审）',
 '{"minMonthsAtCurrentLevel": 6, "minKpiAvg": 75}',
 TRUE,
 '[{"type": "salary_grade_freeze", "durationDays": 180, "description": "未通过冻结薪资等级调整6个月"}]',
 2, 60, 30, 70),

-- ── 5. 薪资级别提升 ──
('grade_promotion_eval', '级别提升综合评审', 'Grade Promotion Comprehensive Review',
 'grade_promotion', '薪资级别提升需通过专家面试评审+实操考核',
 '{"minSkillLevel": "L3", "minKpiAvg6m": 80}',
 TRUE,
 '[{"type": "salary_grade_freeze", "durationDays": 365, "description": "未通过冻结级别提升1年"}]',
 1, 90, 30, 75),

-- ── 6. 积分低于岗位阈值 ──
('points_below_position', '积分不足岗位阈值触发测评', 'Points Below Position Threshold',
 'points_below_threshold', '积分低于该岗位设定最低标准值时触发能力复评',
 '{"pointsThresholdType": "absolute", "checkFrequency": "monthly"}',
 FALSE,
 '[{"type": "revert_six_day_week", "durationDays": 90, "description": "恢复六天工作制90天"},
   {"type": "mandatory_training", "description": "强制参加岗位技能培训"}]',
 2, 30, 7, 60),

-- ── 7. 积分低于相近岗位10% ──
('points_below_peers_10pct', '积分低于同类岗位10%触发测评', 'Points 10% Below Peers',
 'points_below_peers', '积分低于相近岗位平均值的10%时触发能力复评',
 '{"peerThresholdPercent": 10, "minPeerCount": 3, "checkFrequency": "monthly"}',
 FALSE,
 '[{"type": "revert_six_day_week", "durationDays": 60, "description": "恢复六天工作制60天"},
   {"type": "position_downgrade_warning", "description": "岗位降级预警"}]',
 2, 30, 14, 55),

-- ── 8. 连续三月KPI不达标 ──
('consecutive_low_kpi_3m', '连续三月KPI不达标触发复评', '3 Consecutive Months Low KPI',
 'consecutive_low_kpi', '连续三个月KPI低于75分触发当前技能等级复评',
 '{"consecutiveMonths": 3, "kpiThreshold": 75}',
 FALSE,
 '[{"type": "revert_skill_level", "toLevelDelta": -1, "description": "技能等级降一级"},
   {"type": "revert_six_day_week", "durationDays": 90, "description": "恢复六天工作制"},
   {"type": "benefit_revocation", "description": "撤销精英福利（如有）"}]',
 1, 60, 7, 65),

-- ── 9. 证书到期复评 ──
('cert_expiry_revalidation', '技能证书到期复评', 'Certificate Expiry Revalidation',
 'cert_expiry', '技能等级证书到期前30天自动触发同等级复评',
 '{"daysBeforeExpiry": 30}',
 FALSE,
 '[{"type": "revert_skill_level", "toLevelDelta": -1, "description": "未复评通过降一级"}]',
 2, 14, 30, 50),

-- ── 10. 年度定期复评 ──
('annual_revalidation', '年度能力复评', 'Annual Revalidation',
 'periodic_revalidation', '每年一次的岗位能力复评，确保技能等级与实际能力匹配',
 '{"intervalMonths": 12, "lifecycleStages": ["G10", "G11", "G12", "G14"]}',
 FALSE,
 '[{"type": "revert_skill_level", "toLevelDelta": -1, "description": "未通过降一级技能等级"}]',
 2, 30, 30, 40)

ON CONFLICT (rule_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- SEED: Position benchmark scores (2026-02 initial baseline)
-- Based on 22 position profiles from skill assessment schema
-- ══════════════════════════════════════════════════════════════════

INSERT INTO position_benchmark_scores (position_key, period, avg_points, avg_kpi_score, min_acceptable_points, peer_threshold_10pct, employee_count) VALUES
('mechanical_assembly',    '2026-02', 3200, 78.5, 2500, 2880, 15),
('electrical_assembly',    '2026-02', 3100, 79.0, 2400, 2790, 8),
('welding',                '2026-02', 2900, 77.0, 2200, 2610, 5),
('cnc_operator',           '2026-02', 3000, 78.0, 2300, 2700, 4),
('laser_cutting',          '2026-02', 2800, 76.5, 2100, 2520, 3),
('cold_work',              '2026-02', 2700, 76.0, 2000, 2430, 3),
('mechanical_rnd',         '2026-02', 4200, 82.0, 3500, 3780, 6),
('electrical_engineer',    '2026-02', 4100, 81.5, 3400, 3690, 4),
('quality_specialist',     '2026-02', 3800, 80.0, 3000, 3420, 5),
('sales_engineer',         '2026-02', 3500, 79.0, 2800, 3150, 6),
('service_technician',     '2026-02', 3300, 78.0, 2600, 2970, 4),
('procurement_engineer',   '2026-02', 3400, 79.5, 2700, 3060, 3),
('warehouse_manager',      '2026-02', 3000, 77.5, 2300, 2700, 2),
('accountant',             '2026-02', 3600, 80.5, 2900, 3240, 3),
('hr_admin',               '2026-02', 3200, 78.0, 2500, 2880, 2),
('team_leader',            '2026-02', 4500, 83.0, 3800, 4050, 8),
('bu_manager',             '2026-02', 5500, 85.0, 4800, 4950, 5),
('dept_manager',           '2026-02', 5000, 84.0, 4200, 4500, 4),
('it_engineer',            '2026-02', 4000, 81.0, 3300, 3600, 2),
('project_manager',        '2026-02', 4300, 82.5, 3600, 3870, 5),
('marketing_specialist',   '2026-02', 3400, 79.0, 2700, 3060, 2),
('painting',               '2026-02', 2800, 76.5, 2100, 2520, 2)
ON CONFLICT (position_key, period) DO NOTHING;
