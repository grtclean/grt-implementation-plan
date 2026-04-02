-- Executive Review Hub — 高管绩效总览中心
-- Provides drill-down performance views for BU/Dept managers, GM, and Chairman

-- ── Review Comments (评价记录) ──
CREATE TABLE IF NOT EXISTS executive_review_comments (
  id SERIAL PRIMARY KEY,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewer_name VARCHAR(100) NOT NULL,
  reviewer_role VARCHAR(50) NOT NULL,
  target_type VARCHAR(30) NOT NULL, -- department | employee | project | bu
  target_id VARCHAR(100) NOT NULL,
  target_name VARCHAR(200) NOT NULL,
  period VARCHAR(20) NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- monthly | quarterly | annual
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  tags JSON DEFAULT '[]',
  is_private BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exec_review_target ON executive_review_comments(target_type, target_id);
CREATE INDEX idx_exec_review_period ON executive_review_comments(period, period_type);
CREATE INDEX idx_exec_review_reviewer ON executive_review_comments(reviewer_id);

-- ── Executive Dashboard Snapshots (聚合快照) ──
CREATE TABLE IF NOT EXISTS executive_review_snapshots (
  id SERIAL PRIMARY KEY,
  scope_type VARCHAR(20) NOT NULL, -- company | bu | department
  scope_id VARCHAR(100) NOT NULL,
  scope_name VARCHAR(200) NOT NULL,
  period VARCHAR(20) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  -- Headcount
  total_employees INTEGER DEFAULT 0,
  active_employees INTEGER DEFAULT 0,
  -- KPI Metrics
  avg_kpi_score DECIMAL(5,2),
  kpi_completion_rate DECIMAL(5,2),
  top_kpi_achievers JSON DEFAULT '[]',
  bottom_kpi_performers JSON DEFAULT '[]',
  kpi_distribution JSON,
  -- Task Metrics
  total_tasks_assigned INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  task_completion_rate DECIMAL(5,2),
  avg_task_quality DECIMAL(5,2),
  total_tasks_overdue INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,2),
  -- Financial
  revenue_target DECIMAL(15,2),
  revenue_actual DECIMAL(15,2),
  profit_target DECIMAL(15,2),
  profit_actual DECIMAL(15,2),
  -- Training & Growth
  training_completion_rate DECIMAL(5,2),
  avg_capability_level DECIMAL(3,1),
  -- Rewards & Penalties
  total_rewards INTEGER DEFAULT 0,
  total_penalties INTEGER DEFAULT 0,
  reward_amount DECIMAL(12,2) DEFAULT 0,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  -- OKR
  okr_progress_avg DECIMAL(5,2),
  -- Detailed breakdown
  detail_breakdown JSON,
  -- Meta
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(50) DEFAULT 'system'
);

CREATE UNIQUE INDEX exec_snapshot_scope_period_idx
  ON executive_review_snapshots(scope_type, scope_id, period, period_type);

-- ── Seed: Company-wide snapshot for 2026-02 demo ──
INSERT INTO executive_review_snapshots (scope_type, scope_id, scope_name, period, period_type,
  total_employees, active_employees, avg_kpi_score, kpi_completion_rate,
  kpi_distribution, total_tasks_assigned, total_tasks_completed, task_completion_rate,
  avg_task_quality, total_tasks_overdue, on_time_rate, training_completion_rate,
  total_rewards, total_penalties, okr_progress_avg)
VALUES
  ('company', 'all', 'GRT集团', '2026-02', 'monthly', 156, 148, 78.5, 72.3,
   '{"S":8,"A":29,"B":74,"C":31,"D":6}', 1240, 1086, 87.6, 82.3, 54, 91.2, 68.5, 12, 3, 65.8),
  ('department', '事业一部', '事业一部', '2026-02', 'monthly', 32, 30, 81.2, 78.5,
   '{"S":3,"A":8,"B":15,"C":3,"D":1}', 280, 252, 90.0, 84.1, 8, 93.5, 72.0, 4, 0, 71.2),
  ('department', '事业二部', '事业二部', '2026-02', 'monthly', 28, 27, 76.8, 69.2,
   '{"S":2,"A":6,"B":14,"C":4,"D":1}', 245, 208, 84.9, 79.6, 12, 88.3, 65.0, 3, 1, 62.5),
  ('department', '事业三部', '事业三部', '2026-02', 'monthly', 25, 24, 79.3, 74.0,
   '{"S":2,"A":7,"B":12,"C":2,"D":1}', 220, 198, 90.0, 83.5, 6, 92.1, 70.3, 2, 0, 68.0),
  ('department', '品质部', '品质部', '2026-02', 'monthly', 18, 18, 82.1, 80.5,
   '{"S":2,"A":5,"B":9,"C":2,"D":0}', 160, 148, 92.5, 86.2, 4, 94.8, 78.0, 2, 0, 72.5),
  ('department', '人力资源部', '人力资源部', '2026-02', 'monthly', 8, 8, 80.5, 76.0,
   '{"S":1,"A":2,"B":4,"C":1,"D":0}', 95, 86, 90.5, 85.0, 2, 93.0, 82.0, 1, 0, 70.0),
  ('department', '财务部', '财务部', '2026-02', 'monthly', 6, 6, 83.0, 82.0,
   '{"S":1,"A":2,"B":3,"C":0,"D":0}', 75, 71, 94.7, 88.5, 1, 96.2, 85.0, 0, 0, 75.0),
  ('department', '售后服务部', '售后服务部', '2026-02', 'monthly', 15, 14, 74.5, 65.8,
   '{"S":0,"A":3,"B":8,"C":3,"D":1}', 180, 148, 82.2, 76.8, 14, 85.6, 58.0, 0, 2, 55.3),
  ('bu', 'overseas', '海外事业部', '2026-02', 'monthly', 22, 21, 77.0, 70.5,
   '{"S":1,"A":5,"B":11,"C":4,"D":1}', 190, 162, 85.3, 80.2, 9, 89.0, 62.5, 2, 0, 60.8),
  ('bu', 'commercial', '商用车事业部', '2026-02', 'monthly', 35, 34, 80.8, 76.2,
   '{"S":3,"A":9,"B":18,"C":4,"D":1}', 310, 279, 90.0, 83.8, 10, 92.5, 71.0, 4, 1, 68.5);
