-- Authorization Hierarchy System (授权层级审批制度)
-- Implements multi-level approval, credit tiers, green channel, post-facto workflows

-- Enums
DO $$ BEGIN
  CREATE TYPE auth_domain AS ENUM ('travel','procurement','budget','project','customer','material','expense','contract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE credit_tier AS ENUM ('platinum','gold','silver','bronze','restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_facto_status AS ENUM ('pending_doc','pending_review','approved','rejected','overdue','escalated','waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auth_audit_event_type AS ENUM ('approval','green_channel','post_facto','delegation','escalation','override','credit_change','policy_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE integrity_event_type AS ENUM ('on_time_approval','accurate_expense','proactive_disclosure','transparent_comm','late_submission','inaccurate_report','post_facto_violation','policy_bypass','public_recognition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table 1: Authorization Policies
CREATE TABLE IF NOT EXISTS authorization_policies (
  id SERIAL PRIMARY KEY,
  policy_code VARCHAR(64) NOT NULL UNIQUE,
  domain auth_domain NOT NULL,
  policy_name VARCHAR(200) NOT NULL,
  description TEXT,
  threshold_rules JSONB NOT NULL DEFAULT '[]',
  duration_rules JSONB,
  bu_scope VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_policy_domain ON authorization_policies(domain);

-- Table 2: Employee Credit Tiers
CREATE TABLE IF NOT EXISTS employee_credit_tiers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  employee_code VARCHAR(20) NOT NULL,
  employee_name VARCHAR(100),
  credit_score DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  credit_tier credit_tier NOT NULL DEFAULT 'silver',
  tier_calculated_at TIMESTAMP,
  approval_compliance_score DECIMAL(5,2) DEFAULT 80.00,
  financial_integrity_score DECIMAL(5,2) DEFAULT 80.00,
  task_delivery_score DECIMAL(5,2) DEFAULT 80.00,
  peer_trust_score DECIMAL(5,2) DEFAULT 80.00,
  total_approvals INTEGER DEFAULT 0,
  on_time_submissions INTEGER DEFAULT 0,
  late_submissions INTEGER DEFAULT 0,
  post_facto_count INTEGER DEFAULT 0,
  post_facto_within_policy INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  reward_count INTEGER DEFAULT 0,
  green_channel_eligible BOOLEAN DEFAULT false,
  green_channel_max_amount DECIMAL(14,2) DEFAULT 0,
  last_green_channel_used_at TIMESTAMP,
  last_reviewed_by INTEGER,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tier_user ON employee_credit_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tier_score ON employee_credit_tiers(credit_score);
CREATE INDEX IF NOT EXISTS idx_credit_tier_tier ON employee_credit_tiers(credit_tier);

-- Table 3: Green Channel Rules
CREATE TABLE IF NOT EXISTS green_channel_rules (
  id SERIAL PRIMARY KEY,
  domain auth_domain NOT NULL,
  credit_tier_required credit_tier NOT NULL,
  max_amount_allowed DECIMAL(14,2) NOT NULL,
  auto_approve_threshold DECIMAL(14,2) DEFAULT 0,
  max_duration_days INTEGER,
  require_post_facto_doc BOOLEAN NOT NULL DEFAULT true,
  post_facto_deadline_days INTEGER NOT NULL DEFAULT 3,
  cooldown_days INTEGER NOT NULL DEFAULT 7,
  monthly_usage_limit INTEGER NOT NULL DEFAULT 3,
  bu_scope VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gc_rule_domain_tier ON green_channel_rules(domain, credit_tier_required);

-- Table 4: Green Channel Usages
CREATE TABLE IF NOT EXISTS green_channel_usages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  employee_name VARCHAR(100),
  approval_instance_id INTEGER,
  domain auth_domain NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description TEXT,
  credit_tier_at_usage credit_tier NOT NULL,
  rule_id INTEGER,
  post_facto_required BOOLEAN DEFAULT true,
  post_facto_deadline TIMESTAMP,
  post_facto_submitted_at TIMESTAMP,
  post_facto_status post_facto_status DEFAULT 'pending_doc',
  post_facto_documents JSONB,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gc_usage_user ON green_channel_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_gc_usage_domain ON green_channel_usages(domain);
CREATE INDEX IF NOT EXISTS idx_gc_usage_status ON green_channel_usages(post_facto_status);

-- Table 5: Post-Facto Submissions
CREATE TABLE IF NOT EXISTS post_facto_submissions (
  id SERIAL PRIMARY KEY,
  original_approval_id INTEGER,
  green_channel_usage_id INTEGER,
  user_id INTEGER NOT NULL,
  employee_name VARCHAR(100),
  domain auth_domain NOT NULL,
  action_date TIMESTAMP NOT NULL,
  submission_date TIMESTAMP,
  deadline_date TIMESTAMP NOT NULL,
  is_overdue BOOLEAN DEFAULT false,
  reason TEXT,
  urgency_justification TEXT,
  supporting_documents JSONB,
  status post_facto_status NOT NULL DEFAULT 'pending_doc',
  current_review_level INTEGER DEFAULT 1,
  reviewer_id INTEGER,
  reviewer_name VARCHAR(100),
  review_comment TEXT,
  reviewed_at TIMESTAMP,
  credit_score_impact DECIMAL(5,2) DEFAULT 0,
  penalty_applied BOOLEAN DEFAULT false,
  penalty_details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_facto_user ON post_facto_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_facto_status ON post_facto_submissions(status);
CREATE INDEX IF NOT EXISTS idx_post_facto_deadline ON post_facto_submissions(deadline_date);

-- Table 6: Integrity Incentive Records
CREATE TABLE IF NOT EXISTS integrity_incentive_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  employee_code VARCHAR(20),
  employee_name VARCHAR(100),
  period VARCHAR(10) NOT NULL,
  on_time_approvals INTEGER DEFAULT 0,
  accurate_expense_reports INTEGER DEFAULT 0,
  proactive_disclosures INTEGER DEFAULT 0,
  transparent_communications INTEGER DEFAULT 0,
  late_submissions_count INTEGER DEFAULT 0,
  inaccurate_reports INTEGER DEFAULT 0,
  post_facto_violations INTEGER DEFAULT 0,
  policy_bypass_attempts INTEGER DEFAULT 0,
  integrity_score DECIMAL(5,2) DEFAULT 80.00,
  bonus_points INTEGER DEFAULT 0,
  tier_change VARCHAR(20),
  is_publicly_recognized BOOLEAN DEFAULT false,
  recognition_type VARCHAR(50),
  recognition_note TEXT,
  generated_at TIMESTAMP,
  reviewed_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integrity_user_period ON integrity_incentive_records(user_id, period);

-- Table 7: Authorization Audit Trail
CREATE TABLE IF NOT EXISTS authorization_audit_trail (
  id SERIAL PRIMARY KEY,
  event_type auth_audit_event_type NOT NULL,
  domain auth_domain,
  instance_id INTEGER,
  actor_id INTEGER NOT NULL,
  actor_name VARCHAR(100),
  actor_role VARCHAR(50),
  target_user_id INTEGER,
  target_name VARCHAR(100),
  amount DECIMAL(14,2),
  decision VARCHAR(50),
  policy_applied VARCHAR(64),
  credit_tier_at_time credit_tier,
  is_green_channel BOOLEAN DEFAULT false,
  is_post_facto BOOLEAN DEFAULT false,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_actor ON authorization_audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_type ON authorization_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_domain ON authorization_audit_trail(domain);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON authorization_audit_trail(created_at);

-- ══════════════════════════════════════════════════════════════
-- SEED: Default Authorization Policies (GRT-specific thresholds)
-- ══════════════════════════════════════════════════════════════

INSERT INTO authorization_policies (policy_code, domain, policy_name, description, threshold_rules, duration_rules) VALUES

-- 出差申请审批策略
('TRAVEL_STANDARD', 'travel', '出差审批标准策略',
 '按出差预算金额和天数分级审批。国内短期出差组长批复，国际或高额出差需事业部经理以上审批。',
 '[
   {"level":1,"levelLabel":"组长/主管","minAmount":0,"maxAmount":5000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"部门经理","minAmount":5000,"maxAmount":20000,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"事业部经理","minAmount":20000,"maxAmount":50000,"approverRole":"bu_gm","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":50000,"maxAmount":100000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":100000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 '[
   {"maxDays":3,"approverLevel":1,"description":"3天内国内出差，组长审批"},
   {"maxDays":7,"approverLevel":2,"description":"7天内出差，部门经理审批"},
   {"maxDays":14,"approverLevel":3,"description":"14天内或国际出差，事业部经理审批"},
   {"maxDays":30,"approverLevel":4,"description":"30天内长期出差，副总审批"},
   {"maxDays":-1,"approverLevel":5,"description":"超30天出差，董事长审批"}
 ]'::jsonb),

-- 采购金额审批策略
('PROCUREMENT_STANDARD', 'procurement', '采购审批标准策略',
 '按采购金额分级审批。小额日常采购部门内审批，大额采购需逐级上报至董事长。',
 '[
   {"level":1,"levelLabel":"采购专员自审","minAmount":0,"maxAmount":5000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"采购经理","minAmount":5000,"maxAmount":20000,"approverRole":"procurement_eng","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"部门经理","minAmount":20000,"maxAmount":100000,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":100000,"maxAmount":500000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":500000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 预算执行审批策略
('BUDGET_STANDARD', 'budget', '预算执行审批策略',
 '按预算超支比例分级审批。小幅超支部门自行消化，大幅超支需高层审批。',
 '[
   {"level":1,"levelLabel":"部门经理","minAmount":0,"maxAmount":5,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"财务经理","minAmount":5,"maxAmount":10,"approverRole":"finance_manager","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"事业部经理","minAmount":10,"maxAmount":20,"approverRole":"bu_gm","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":20,"maxAmount":30,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":30,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 项目执行审批策略
('PROJECT_STANDARD', 'project', '项目执行审批策略',
 '按项目合同金额和变更范围分级审批。日常执行项目经理审批，重大变更需事业部及以上审批。',
 '[
   {"level":1,"levelLabel":"项目经理","minAmount":0,"maxAmount":50000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"部门经理","minAmount":50000,"maxAmount":200000,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"事业部经理","minAmount":200000,"maxAmount":500000,"approverRole":"bu_gm","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":500000,"maxAmount":1000000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":1000000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 客户沟通权限策略
('CUSTOMER_STANDARD', 'customer', '客户沟通授权策略',
 '按客户沟通级别和商务权限分级授权。日常技术交流无需审批，价格谈判和合同条款需逐级授权。',
 '[
   {"level":1,"levelLabel":"客户工程师","minAmount":0,"maxAmount":0,"approverRole":"cs_engineer","autoApprove":true,"isRequired":false},
   {"level":2,"levelLabel":"销售/项目经理","minAmount":0,"maxAmount":100000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"事业部经理","minAmount":100000,"maxAmount":500000,"approverRole":"bu_gm","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":500000,"maxAmount":2000000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":2000000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 材料特性审批策略
('MATERIAL_STANDARD', 'material', '材料特性变更审批策略',
 '按材料变更影响级别分级审批。标准材料变更工程师审批，安全关键材料需副总以上审批。',
 '[
   {"level":1,"levelLabel":"工艺工程师","minAmount":0,"maxAmount":1,"approverRole":"bu_mech","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"质量工程师","minAmount":1,"maxAmount":2,"approverRole":"quality_eng","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"技术经理","minAmount":2,"maxAmount":3,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":3,"maxAmount":4,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":4,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 费用报销审批策略
('EXPENSE_STANDARD', 'expense', '费用报销审批策略',
 '按报销金额分级审批。小额报销部门审批，大额报销需财务及以上审批。',
 '[
   {"level":1,"levelLabel":"组长/主管","minAmount":0,"maxAmount":2000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"部门经理","minAmount":2000,"maxAmount":10000,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"财务经理","minAmount":10000,"maxAmount":50000,"approverRole":"finance_manager","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":50000,"maxAmount":200000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":200000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL),

-- 合同签署审批策略
('CONTRACT_STANDARD', 'contract', '合同签署审批策略',
 '按合同金额分级审批。小额合同部门签署，重大合同需董事长审批。',
 '[
   {"level":1,"levelLabel":"项目经理","minAmount":0,"maxAmount":50000,"approverRole":"team_leader","autoApprove":false,"isRequired":true},
   {"level":2,"levelLabel":"部门经理","minAmount":50000,"maxAmount":200000,"approverRole":"dept_manager","autoApprove":false,"isRequired":true},
   {"level":3,"levelLabel":"事业部经理","minAmount":200000,"maxAmount":1000000,"approverRole":"bu_gm","autoApprove":false,"isRequired":true},
   {"level":4,"levelLabel":"副总/总监","minAmount":1000000,"maxAmount":5000000,"approverRole":"director","autoApprove":false,"isRequired":true},
   {"level":5,"levelLabel":"董事长","minAmount":5000000,"maxAmount":-1,"approverRole":"admin","autoApprove":false,"isRequired":true}
 ]'::jsonb,
 NULL)
ON CONFLICT (policy_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- SEED: Green Channel Rules
-- ══════════════════════════════════════════════════════════════

INSERT INTO green_channel_rules (domain, credit_tier_required, max_amount_allowed, auto_approve_threshold, max_duration_days, post_facto_deadline_days, cooldown_days, monthly_usage_limit) VALUES
-- 出差: 白金自动批≤10k, 绿色通道≤30k; 金牌绿色通道≤15k
('travel', 'platinum', 30000,  10000, 7, 3, 5,  5),
('travel', 'gold',     15000,  0,     5, 3, 7,  3),
('travel', 'silver',   5000,   0,     3, 3, 14, 1),
-- 采购: 白金自动批≤3k, 绿色通道≤20k; 金牌绿色通道≤10k
('procurement', 'platinum', 20000, 3000, NULL, 3, 5,  5),
('procurement', 'gold',     10000, 0,    NULL, 3, 7,  3),
('procurement', 'silver',   3000,  0,    NULL, 3, 14, 1),
-- 预算超支: 白金绿色通道≤5%, 金牌≤3%
('budget', 'platinum', 5,  2, NULL, 5, 14, 2),
('budget', 'gold',     3,  0, NULL, 5, 30, 1),
-- 费用报销: 白金自动批≤1k, 绿色通道≤8k
('expense', 'platinum', 8000, 1000, NULL, 3, 5, 5),
('expense', 'gold',     5000, 0,    NULL, 3, 7, 3),
('expense', 'silver',   2000, 0,    NULL, 3, 14, 1);

-- ══════════════════════════════════════════════════════════════
-- SEED: Initialize credit tiers for all employees (default silver)
-- This uses employees table if it exists
-- ══════════════════════════════════════════════════════════════

-- Seed key personnel with appropriate tiers
INSERT INTO employee_credit_tiers (user_id, employee_code, employee_name, credit_score, credit_tier, green_channel_eligible, green_channel_max_amount, tier_calculated_at)
SELECT id, employee_id, name,
  CASE
    WHEN position IN ('董事长','总经理') THEN 99.00
    WHEN position LIKE '%经理%' OR position LIKE '%总监%' THEN 90.00
    WHEN position LIKE '%主管%' OR position LIKE '%班长%' THEN 85.00
    ELSE 80.00
  END,
  CASE
    WHEN position IN ('董事长','总经理') THEN 'platinum'::credit_tier
    WHEN position LIKE '%经理%' OR position LIKE '%总监%' THEN 'gold'::credit_tier
    WHEN position LIKE '%主管%' OR position LIKE '%班长%' THEN 'gold'::credit_tier
    ELSE 'silver'::credit_tier
  END,
  CASE
    WHEN position IN ('董事长','总经理') THEN true
    WHEN position LIKE '%经理%' OR position LIKE '%总监%' THEN true
    WHEN position LIKE '%主管%' OR position LIKE '%班长%' THEN true
    ELSE false
  END,
  CASE
    WHEN position IN ('董事长','总经理') THEN 500000.00
    WHEN position LIKE '%经理%' OR position LIKE '%总监%' THEN 50000.00
    WHEN position LIKE '%主管%' OR position LIKE '%班长%' THEN 20000.00
    ELSE 5000.00
  END,
  NOW()
FROM employees
ON CONFLICT (user_id) DO NOTHING;
