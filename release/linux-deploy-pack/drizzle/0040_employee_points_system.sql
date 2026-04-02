-- ╔════════════════════════════════════════════════════════════╗
-- ║  GRT Employee Points & Credit System — CEO Directive      ║
-- ║  员工积分奖惩制度                                          ║
-- ╚════════════════════════════════════════════════════════════╝

-- Enums
DO $$ BEGIN
  CREATE TYPE point_rule_category AS ENUM ('daily_compliance','task_completion','quality','collaboration','training','innovation','attendance','penalty','management');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE point_transaction_type AS ENUM ('award','penalty','redeem','adjust','expire');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE point_redemption_status AS ENUM ('pending','approved','rejected','fulfilled','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_check_type AS ENUM ('morning_plan','evening_summary','next_day_plan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table 1: Point Rules
CREATE TABLE IF NOT EXISTS point_rules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  category point_rule_category NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  max_per_day INTEGER DEFAULT 1,
  max_per_month INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_mode VARCHAR(20) NOT NULL DEFAULT 'auto',
  role_multipliers JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_rules_category ON point_rules(category);
CREATE INDEX IF NOT EXISTS idx_point_rules_code ON point_rules(code);

-- Table 2: Point Transactions
CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  rule_code VARCHAR(80),
  type point_transaction_type NOT NULL,
  points INTEGER NOT NULL,
  balance_after INTEGER,
  description TEXT,
  source_type VARCHAR(50),
  source_id VARCHAR(100),
  granted_by INTEGER,
  transaction_date VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_txn_employee ON point_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_point_txn_date ON point_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_point_txn_rule ON point_transactions(rule_code);
CREATE INDEX IF NOT EXISTS idx_point_txn_type ON point_transactions(type);

-- Table 3: Point Balances
CREATE TABLE IF NOT EXISTS point_balances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  total_penalties INTEGER NOT NULL DEFAULT 0,
  ytd_points INTEGER NOT NULL DEFAULT 0,
  is_on_observation BOOLEAN NOT NULL DEFAULT false,
  is_excellence_suspended BOOLEAN NOT NULL DEFAULT false,
  excellence_suspended_until VARCHAR(10),
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_balance_employee ON point_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_point_balance_observation ON point_balances(is_on_observation);

-- Table 4: Redemption Catalog
CREATE TABLE IF NOT EXISTS point_redemption_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description TEXT,
  points_cost INTEGER NOT NULL,
  monetary_value DECIMAL(14,2),
  category VARCHAR(50) NOT NULL,
  available_qty INTEGER NOT NULL DEFAULT -1,
  min_balance INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redemption_catalog_category ON point_redemption_catalog(category);
CREATE INDEX IF NOT EXISTS idx_redemption_catalog_active ON point_redemption_catalog(is_active);

-- Table 5: Redemption Requests
CREATE TABLE IF NOT EXISTS point_redemptions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  catalog_item_id INTEGER NOT NULL,
  catalog_code VARCHAR(80),
  points_spent INTEGER NOT NULL,
  status point_redemption_status NOT NULL DEFAULT 'pending',
  requested_start_date VARCHAR(10),
  requested_end_date VARCHAR(10),
  employee_notes TEXT,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  approval_notes TEXT,
  fulfilled_at TIMESTAMP,
  fulfilled_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redemption_employee ON point_redemptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON point_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemption_catalog ON point_redemptions(catalog_item_id);

-- Table 6: Point Thresholds
CREATE TABLE IF NOT EXISTS point_thresholds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  threshold INTEGER NOT NULL,
  direction VARCHAR(10) NOT NULL DEFAULT 'below',
  action VARCHAR(100) NOT NULL,
  duration_days INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table 7: Enforcement Log
CREATE TABLE IF NOT EXISTS point_enforcement_log (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  threshold_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  points_at_trigger INTEGER NOT NULL,
  enforced_at TIMESTAMP DEFAULT NOW() NOT NULL,
  lifted_at TIMESTAMP,
  lifted_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enforcement_employee ON point_enforcement_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_action ON point_enforcement_log(action);

-- Table 8: Daily Compliance Checks
CREATE TABLE IF NOT EXISTS daily_compliance_checks (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  check_date VARCHAR(10) NOT NULL,
  check_type compliance_check_type NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  deadline TIMESTAMP,
  completed_at TIMESTAMP,
  points_applied INTEGER DEFAULT 0,
  source_type VARCHAR(50),
  source_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(employee_id, check_date, check_type)
);
CREATE INDEX IF NOT EXISTS idx_compliance_employee ON daily_compliance_checks(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_date ON daily_compliance_checks(check_date);

-- ═══════════════════════════════════════════════════════════
-- Seed: Default Point Rules (CEO-approved)
-- ═══════════════════════════════════════════════════════════

-- Role multiplier convention (applies via role_multipliers JSON):
--   staff/employee = ×1 (base points as listed)
--   engineer/specialist and above = ×10
--   manager/director and above = ×100
--   bu_gm (事业部经理) = ×100
-- The multiplier amplifies BOTH rewards and penalties — higher responsibility = higher stakes.

INSERT INTO point_rules (code, name, name_en, category, description, points, max_per_day, max_per_month, trigger_mode, role_multipliers) VALUES
  -- Daily Compliance (积分核心) — role multipliers on all daily items
  ('morning_plan_ontime',     '按时提交晨间工作计划',        'Morning plan submitted on time',     'daily_compliance', '打卡后15分钟内提交当日工作计划', 3, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('morning_plan_late',       '晨间工作计划迟交',            'Morning plan submitted late',        'penalty',          '打卡15分钟后才提交工作计划',     -2, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('morning_plan_missing',    '未提交晨间工作计划',          'Morning plan not submitted',         'penalty',          '当日未提交工作计划',             -5, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('evening_summary_done',    '按时提交工作总结',            'Work summary submitted',             'daily_compliance', '下班前完成当日工作总结',         3, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('evening_summary_missing', '未提交工作总结',              'Work summary not submitted',         'penalty',          '当日未提交工作总结',             -5, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('next_day_plan_done',      '完成次日工作计划',            'Next day plan completed',            'daily_compliance', '完成第二个工作日计划，额外奖励', 2, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),

  -- Report Quality (管理者报告质量，经理及以上×100)
  ('report_quality_excellent','工作报告质量优秀',            'Report quality excellent',           'daily_compliance', '工作报告内容详实、数据完整、有决策建议', 5, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('report_quality_poor',     '工作报告质量低下',            'Report quality poor',                'penalty',          '工作报告敷衍、缺乏数据支撑或关键信息缺失', -5, 1, 22, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),
  ('report_timeliness_poor',  '工作报告及时性差',            'Report timeliness poor',             'penalty',          '报告提交时间超出合理窗口，影响决策效率', -3, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100,"vp":100,"ceo":100}'),

  -- Task Completion
  ('task_complete_p0',        '完成P0任务',                  'Complete P0 task',                   'task_completion',  '完成最高优先级任务',             10, 5, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('task_complete_p1',        '完成P1任务',                  'Complete P1 task',                   'task_completion',  '完成高优先级任务',               5, 10, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('task_complete_p2',        '完成P2任务',                  'Complete P2 task',                   'task_completion',  '完成中优先级任务',               3, 15, NULL, 'auto', NULL),
  ('task_complete_ontime',    '任务按期完成',                'Task completed on schedule',         'task_completion',  '在截止日前完成任务',             2, 10, NULL, 'auto', NULL),
  ('task_overdue',            '任务逾期',                    'Task overdue',                       'penalty',          '任务超过截止日未完成',           -3, 5, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Quality
  ('quality_zero_defect',     '月度零缺陷',                  'Monthly zero defects',               'quality',          '当月质量零缺陷',                 20, 1, 1, 'auto', NULL),
  ('quality_improvement',     '质量改善提案',                'Quality improvement proposal',       'quality',          '提交并采纳质量改善方案',         15, 3, NULL, 'manual', NULL),
  ('quality_defect_caused',   '质量缺陷责任',                'Quality defect responsibility',      'penalty',          '因本人原因导致质量缺陷',         -10, 5, NULL, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Collaboration
  ('mentor_session',          '指导同事',                    'Mentor a colleague',                 'collaboration',    '完成一次知识分享或指导',         5, 2, 10, 'manual', NULL),
  ('cross_dept_help',         '跨部门协助',                  'Cross-department assistance',        'collaboration',    '主动协助其他部门完成任务',       8, 2, NULL, 'manual', NULL),
  ('meeting_action_done',     '会议行动项完成',              'Meeting action item completed',      'collaboration',    '按时完成会议决议事项',           3, 5, NULL, 'auto', NULL),

  -- Training
  ('training_complete',       '完成培训课程',                'Complete training course',           'training',         '完成一个培训课程',               5, 3, NULL, 'auto', NULL),
  ('training_cert_earned',    '获得认证',                    'Certification earned',               'training',         '通过认证考试',                   20, 2, NULL, 'manual', NULL),

  -- Innovation
  ('patent_filed',            '专利申请',                    'Patent filed',                       'innovation',       '提交专利申请',                   50, 1, NULL, 'manual', NULL),
  ('process_improvement',     '流程改善',                    'Process improvement',                'innovation',       '提出并实施流程改善方案',         15, 3, NULL, 'manual', NULL),

  -- Attendance
  ('perfect_attendance_week', '一周全勤',                    'Perfect attendance week',            'attendance',       '一周无迟到早退缺勤',             5, 1, 4, 'auto', NULL),
  ('perfect_attendance_month','月度全勤',                    'Perfect attendance month',           'attendance',       '整月无迟到早退缺勤',             20, 1, 1, 'auto', NULL),
  ('late_penalty',            '迟到扣分',                    'Late arrival penalty',               'penalty',          '迟到一次',                       -3, 1, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('unauthorized_excursion',  '非休息时段离岗',              'Unauthorized excursion',             'penalty',          '非休息时段离开工作区域',         -5, 3, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Management (BU Manager specific rules)
  ('bu_weekly_report_done',   '事业部周报按时提交',          'BU weekly report on time',           'management',       '事业部经理按时提交周报，内容完整', 10, 1, 4, 'auto',
    '{"bu_gm":100,"director":100,"vp":100}'),
  ('bu_weekly_report_missing','事业部周报未提交',            'BU weekly report missing',           'penalty',          '事业部经理未按时提交周报',       -20, 1, 4, 'auto',
    '{"bu_gm":100,"director":100,"vp":100}'),
  ('team_development_done',   '团队发展计划完成',            'Team development plan done',         'management',       '按时完成团队能力发展计划制定或更新', 8, 1, 1, 'manual',
    '{"manager":100,"director":100,"bu_gm":100}'),
  ('decision_quality_poor',   '决策质量不佳',                'Poor decision quality',              'penalty',          '决策缺乏数据支撑、未充分评估风险', -10, 1, NULL, 'manual',
    '{"manager":100,"director":100,"bu_gm":100,"vp":100}'),

  -- Unapproved late/early leave (CEO: 未在系统里按照要求申请得到批准的迟到早退)
  ('unapproved_late',         '未申请批准的迟到',            'Unapproved late arrival',            'penalty',          '迟到未在系统里提前申请并获批准', -8, 1, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('unapproved_early_leave',  '未申请批准的早退',            'Unapproved early departure',         'penalty',          '早退未在系统里提前申请并获批准', -8, 1, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('approved_late',           '已批准的迟到',                'Approved late arrival',              'attendance',       '迟到已提前在系统申请并获批准',   -1, 1, NULL, 'auto', NULL),
  ('approved_early_leave',    '已批准的早退',                'Approved early departure',           'attendance',       '早退已提前在系统申请并获批准',   -1, 1, NULL, 'auto', NULL),

  -- Timesheet / work hours compliance (未按照要求填报工时)
  ('timesheet_complete',      '按时填报工时',                'Timesheet submitted on time',        'daily_compliance', '按照要求完整填报当日工时',       2, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('timesheet_missing',       '未填报工时',                  'Timesheet not submitted',            'penalty',          '未按要求填报当日工时',           -5, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('timesheet_incomplete',    '工时填报不完整',              'Timesheet incomplete',               'penalty',          '工时填报缺少项目分配或时长不足', -3, 1, 22, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('timesheet_falsified',     '工时虚报',                    'Timesheet falsified',                'penalty',          '工时记录与实际严重不符',         -20, 1, NULL, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- ═══════════════════════════════════════════════════════════
  -- 红黑榜处罚 (preserved from existing violation_events system)
  -- Violation severity → points. Existing auto-freeze logic unchanged.
  -- ═══════════════════════════════════════════════════════════

  -- Red-line violations (黑榜 — penalties)
  ('violation_minor',         '一般违规(MINOR)',             'Minor violation',                    'penalty',          '一般违规 — 警告，红黑榜黑榜记录',                        -10,  3, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_major',         '重大违规(MAJOR)',             'Major violation',                    'penalty',          '重大违规 — 冻结绩效，红黑榜黑榜记录，部门通报',           -50,  2, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_critical',      '严重违规(CRITICAL)',          'Critical violation',                 'penalty',          '严重违规 — 冻结绩效+上报CEO，红黑榜黑榜重点标记',         -100, 1, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Violation by type (黑榜 — specific event types)
  ('violation_quality_defect',    '质量缺陷违规',            'Quality defect violation',           'penalty',          '质量缺陷导致的违规事件',         -15, 3, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_safety_incident',   '安全事故违规',            'Safety incident violation',          'penalty',          '安全事故导致的违规事件',         -30, 2, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_compliance_breach', '合规违反',                'Compliance breach violation',        'penalty',          '合规制度违反事件',               -20, 2, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_customer_complaint','客户投诉违规',            'Customer complaint violation',       'penalty',          '客户投诉导致的违规事件',         -20, 3, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('violation_financial_anomaly', '财务异常违规',            'Financial anomaly violation',        'penalty',          '财务异常导致的违规事件',         -25, 2, NULL, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Performance-based auto-points (绩效联动积分)
  ('perf_3month_improvement',   '连续3月绩效提升20%',        '3-month consecutive 20%+ improvement','quality',         '连续三个月绩效提高20%以上，自动奖励', 50, 1, 4, 'auto', NULL),
  ('perf_3month_decline',       '连续3月绩效下降20%',        '3-month consecutive 20%+ decline',    'penalty',         '连续三个月绩效下降20%以上，自动扣除', -100, 1, 4, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('perf_kpi_above_85',         'KPI达到85分以上',           'Monthly KPI above 85',                'quality',         '当月KPI综合评分达到85分以上',    200, 1, 1, 'auto', NULL),
  ('perf_kpi_below_60',         'KPI低于60分',               'Monthly KPI below 60',                'penalty',         '当月KPI综合评分低于60分',       -50, 1, 1, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Honor board rewards (红榜 — rewards for excellence)
  ('honor_top_performer',     '红榜月度标兵',               'Monthly top performer',              'quality',          '月度绩效排名前5，红榜表彰',      30, 1, 1, 'auto', NULL),
  ('honor_zero_defect_streak','红榜连续零缺陷',             'Consecutive zero-defect months',     'quality',          '连续3个月零缺陷记录，红榜特别表彰', 50, 1, 4, 'auto', NULL),
  ('honor_customer_praise',   '红榜客户表扬',               'Customer praise recognition',        'quality',          '收到客户书面表扬或感谢信',       25, 3, NULL, 'manual', NULL),
  ('honor_safety_champion',   '红榜安全标兵',               'Safety champion',                    'quality',          '全年无安全事故且积极推动安全改善', 40, 1, 1, 'auto', NULL),
  ('honor_innovation_award',  '红榜创新之星',               'Innovation award',                   'innovation',       '获得公司级创新奖项',             100, 1, 4, 'manual', NULL),

  -- Employee Referral (员工推荐候选人)
  ('referral_hired_junior',   '推荐候选人入职(工程师以下)',   'Referral hired (below engineer)',     'collaboration',    '推荐候选人通过GRT面试并入职，工程师以下岗位', 300, 1, NULL, 'manual', NULL),
  ('referral_hired_senior',   '推荐候选人入职(工程师以上)',   'Referral hired (engineer+)',          'collaboration',    '推荐候选人通过GRT面试并入职，工程师及以上岗位', 500, 1, NULL, 'manual', NULL),

  -- Rationalization suggestions (合理化建议)
  ('suggestion_effective',    '有效建议',                     'Effective suggestion',                'innovation',       '建议被采纳并产生改善效果',       50, 5, NULL, 'manual', NULL),
  ('suggestion_outstanding',  '突出价值建议',                 'Outstanding value suggestion',        'innovation',       '显著降低成本、提高效率或改善质量', 500, 2, NULL, 'manual', NULL),
  ('suggestion_major',        '重大价值建议',                 'Major value suggestion',              'innovation',       '产生重大经济效益或战略影响，需CEO审批', 5000, 1, NULL, 'manual', NULL),

  -- General management awards
  ('manager_award',           '管理者嘉奖',                  'Manager commendation',               'management',       '管理者给予嘉奖积分',             0, 5, NULL, 'manual', NULL),
  ('ceo_special_award',       'CEO特别奖',                   'CEO special award',                  'management',       'CEO直接授予特别积分',            0, 1, NULL, 'manual', NULL),
  ('manager_penalty',         '管理者处罚',                  'Manager penalty',                    'management',       '管理者给予处罚积分',             0, 5, NULL, 'manual', NULL),

  -- Sales KPI rules (销售工程师)
  ('sales_first_order_3m',    '新销售工程师首单≥300万',      'New sales engineer first order ≥3M',  'quality',          '新销售工程师首个订单金额达300万以上', 1000, 1, 1, 'manual', NULL),
  ('sales_no_order_6month',   '连续6个月无订单',             '6 consecutive months without order',  'penalty',          '连续6个月未有订单，首次处罚',    -1000, 1, 1, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('sales_no_order_ongoing',  '无订单持续处罚(每月递增)',     'Ongoing no-order monthly penalty',    'penalty',          '连续无订单第7个月起，每月额外扣除', -1000, 1, 1, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Sales M2 pipeline rules (销售人员新客户M2阶段)
  ('sales_m2_shortfall_initial', '连续2月新客户未达M2阶段(≥3个)', '2-month M2 pipeline shortfall',     'penalty',          '连续2个月未能获得3个以上新客户进入M2阶段，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('sales_m2_shortfall_escalate','新客户M2不达标持续处罚(每月翻倍)','Ongoing M2 shortfall escalating penalty','penalty',     '第3个月起每月翻倍: -1000, -2000, -4000...', -1000, 1, 1, 'auto',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- ═══ Role-specific KPI penalties (各岗位KPI不达标处罚) ═══

  -- 研发工程师: 连续2个月未完成项目里程碑
  ('rnd_milestone_miss_initial',  '研发连续2月里程碑未达成',   'R&D 2-month milestone miss',          'penalty',          '研发工程师连续2个月项目里程碑完成率<80%，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),
  ('rnd_milestone_miss_escalate', '研发里程碑持续不达标(翻倍)', 'R&D ongoing milestone miss',           'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),

  -- 质量工程师: 连续2个月客户投诉率超标
  ('qa_complaint_rate_initial',   '质量连续2月投诉率超标',     'QA 2-month complaint rate exceeded',  'penalty',          '质量工程师连续2个月客户投诉率超过目标值，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),
  ('qa_complaint_rate_escalate',  '质量投诉率持续超标(翻倍)',   'QA ongoing complaint rate exceeded',  'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),

  -- 生产主管: 连续2个月OEE低于目标
  ('mfg_oee_miss_initial',       '生产连续2月OEE不达标',      'MFG 2-month OEE below target',        'penalty',          '生产主管连续2个月OEE低于85%目标，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"team_leader":10,"manager":100}'),
  ('mfg_oee_miss_escalate',      '生产OEE持续不达标(翻倍)',    'MFG ongoing OEE miss',                'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"team_leader":10,"manager":100}'),

  -- 项目经理: 连续2个月项目延期率超标
  ('pm_delay_rate_initial',      'PM连续2月项目延期率超标',    'PM 2-month delay rate exceeded',      'penalty',          '项目经理连续2个月项目延期率>20%，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"manager":100,"director":100}'),
  ('pm_delay_rate_escalate',     'PM项目延期持续超标(翻倍)',    'PM ongoing delay rate exceeded',      'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"manager":100,"director":100}'),

  -- 售后工程师: 连续2个月工单关闭率不达标
  ('cs_closure_rate_initial',    '售后连续2月工单关闭率不达标', 'CS 2-month ticket closure miss',      'penalty',          '售后工程师连续2个月工单48h关闭率<90%，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),
  ('cs_closure_rate_escalate',   '售后工单关闭率持续不达标(翻倍)','CS ongoing closure miss',            'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),

  -- 采购工程师: 连续2个月供应商交付不达标
  ('proc_delivery_miss_initial', '采购连续2月供应商交付不达标', 'Procurement 2-month delivery miss',   'penalty',          '采购工程师连续2个月供应商准时交付率<95%，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),
  ('proc_delivery_miss_escalate','采购交付持续不达标(翻倍)',    'Procurement ongoing delivery miss',   'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"specialist":10,"manager":100}'),

  -- 事业部经理: 连续2个月BU利润率低于目标
  ('bu_gm_profit_miss_initial',  'BU经理连续2月利润率不达标',  'BU GM 2-month profit margin miss',    'penalty',          '事业部经理连续2个月BU利润率低于目标，首次处罚', -500, 1, 1, 'auto',
    '{"bu_gm":100,"director":100}'),
  ('bu_gm_profit_miss_escalate', 'BU经理利润率持续不达标(翻倍)','BU GM ongoing profit miss',           'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"bu_gm":100,"director":100}'),

  -- HR: 连续2个月关键岗位空缺率超标
  ('hr_vacancy_miss_initial',    'HR连续2月关键岗位空缺超标',  'HR 2-month vacancy rate exceeded',    'penalty',          'HR连续2个月关键岗位空缺率>15%，首次处罚', -500, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('hr_vacancy_miss_escalate',   'HR岗位空缺持续超标(翻倍)',    'HR ongoing vacancy miss',            'penalty',          '第3个月起每月翻倍处罚', -1000, 1, 1, 'auto',
    '{"employee":1,"engineer":10,"manager":100}'),

  -- ═══ Team & Project Performance vs Conduct (团队/项目 高表现低作风) ═══

  -- Team high performance (团队高绩效奖励)
  ('team_quarterly_top',         '季度最佳团队',               'Quarterly top team award',            'quality',          '季度绩效排名第一的团队，全员奖励',    100, 1, 1, 'manual', NULL),
  ('team_project_delivery',      '项目按时交付团队奖',          'On-time project delivery team award', 'quality',          '项目按时按质交付，团队全员奖励',      80, 1, 4, 'manual', NULL),
  ('team_zero_defect_quarter',   '团队季度零缺陷',             'Team quarterly zero-defect',          'quality',          '团队整个季度无质量缺陷',             150, 1, 1, 'auto', NULL),
  ('team_customer_satisfaction', '团队客户满意度≥95%',          'Team customer satisfaction ≥95%',     'quality',          '团队服务客户满意度评分达95%以上',     100, 1, 1, 'auto', NULL),
  ('team_innovation_award',      '团队创新突破奖',              'Team innovation breakthrough',        'innovation',       '团队在产品/工艺/流程上取得重大创新突破', 200, 1, 4, 'manual', NULL),
  ('team_cost_saving',           '团队降本增效奖',              'Team cost reduction award',           'quality',          '团队实现显著降本增效，节省≥50万',     300, 1, 4, 'manual', NULL),

  -- Team low conduct (团队低作风处罚)
  ('team_conduct_poor_collab',   '团队协作不力',                'Poor team collaboration',             'penalty',          '团队内部协作推诿、信息不共享，影响项目进度', -50, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('team_conduct_meeting_waste', '团队会议效率低下',             'Team meeting inefficiency',           'penalty',          '团队会议无议程、无结论、无跟进，连续3次', -30, 3, NULL, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('team_conduct_blame_culture', '团队推卸责任',                'Team blame shifting',                 'penalty',          '团队出现问题时相互推诿而非解决，由上级认定', -80, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('team_conduct_info_silo',     '团队信息孤岛',                'Team information silo',               'penalty',          '团队不主动共享关键信息，导致其他团队重复工作或决策失误', -60, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('team_conduct_deadline_miss', '团队集体延期',                'Team collective deadline miss',       'penalty',          '非不可抗力导致的团队整体交付延期',     -100, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),

  -- Project high performance (项目高绩效奖励)
  ('project_ahead_of_schedule',  '项目提前交付',                'Project early delivery',              'quality',          '项目提前完成且质量达标',              100, 1, 4, 'manual', NULL),
  ('project_budget_under',       '项目低于预算交付',             'Project under-budget delivery',      'quality',          '项目在预算80%以内完成且质量达标',     120, 1, 4, 'manual', NULL),
  ('project_customer_praise',    '项目获客户表彰',              'Project customer commendation',       'quality',          '项目获得客户书面表扬或续单',          150, 1, 4, 'manual', NULL),
  ('project_best_practice',      '项目最佳实践沉淀',            'Project best practice contribution',  'innovation',       '项目经验总结为公司标准流程或知识库',   80, 1, 4, 'manual', NULL),

  -- Project low conduct (项目低作风处罚)
  ('project_conduct_no_report',  '项目周报连续缺失',            'Project report missing',              'penalty',          '项目连续2周未提交周报/状态更新',     -50, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('project_conduct_risk_hide',  '项目风险隐瞒',                'Project risk concealment',            'penalty',          '已知项目风险未上报，导致问题扩大',    -200, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('project_conduct_scope_creep','项目需求镀金',                'Project scope creep / gold plating',  'penalty',          '未经审批擅自扩大项目范围，导致超期超预算', -80, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('project_conduct_quality_cut','项目质量偷工减料',             'Project quality shortcuts',           'penalty',          '为赶进度跳过质量检查环节，被审计发现', -150, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('project_conduct_handover_fail','项目交接不清',              'Project handover failure',            'penalty',          '项目交接文档不全、知识未转移，导致后续问题', -60, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),

  -- Individual high performance vs low conduct (个人高表现低作风)
  ('individual_high_output_low_teamwork', '高产出低团队意识',   'High output low teamwork',            'penalty',          '个人绩效优秀但拒绝帮助同事、不参与团队活动', -30, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('individual_technical_arrogance',      '技术傲慢',           'Technical arrogance',                 'penalty',          '以技术优势压制同事意见，阻碍团队讨论', -40, 1, 4, 'manual',
    '{"employee":1,"engineer":10,"manager":100}'),
  ('individual_mentor_excellence',        '优秀导师',           'Mentor excellence',                   'collaboration',    '主动指导新人，被指导人3个月内独立上岗', 100, 1, 4, 'manual', NULL),
  ('individual_cross_dept_collab',        '跨部门协作之星',      'Cross-department collaboration star', 'collaboration',    '主动推动跨部门协作，解决跨部门难题',   80, 1, 4, 'manual', NULL),
  ('individual_knowledge_sharing',        '知识分享达人',        'Knowledge sharing champion',          'collaboration',    '主动进行内部培训/技术分享≥3次/季度',  60, 1, 1, 'manual', NULL),

  -- Workplace conduct violations (职场行为规范)
  ('conduct_disrupt_others',     '吵架等行为影响他人工作',      'Disruptive behavior affecting others','penalty',          '在工作场所吵架、争吵、大声喧哗等影响他人正常工作', -1000, 1, NULL, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('conduct_damage_culture',     '损害公司文化形象',            'Damaging company culture/image',      'penalty',          '行为造成公司文化形象负面影响（含对外场合、社交媒体等）', -2000, 1, NULL, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),

  -- Courage & whistleblower rewards (见义勇为/吹哨人)
  ('courage_act',                '见义勇为',                   'Act of courage',                      'quality',          '在工作场所或公司相关场合见义勇为',    2000, 1, NULL, 'manual', NULL),
  ('crisis_handling',            '重大险情处置得当',            'Major crisis proper handling',         'quality',          '面对重大险情（安全/设备/火灾等）冷静处置，避免或减小损失', 2000, 1, NULL, 'manual', NULL),
  ('whistleblower_prevent',      '吹哨人阻止/降低不当行为影响', 'Whistleblower — prevented or mitigated','quality',        '主动举报或阻止违规/不当行为发生，或降低其影响', 2000, 1, NULL, 'manual', NULL),

  -- High-value achievement & failure (重大成就与重大失误 ±1000)
  ('project_exceptional',       '项目高表现(重大成就)',         'Exceptional project performance',     'quality',          '项目交付质量、进度、成本全面超越预期，获管理层认可', 1000, 1, 4, 'manual', NULL),
  ('project_major_failure',     '项目重大失误',                'Major project failure',               'penalty',          '项目因管理不善导致重大延期、超预算或质量事故', -1000, 1, 4, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('customer_high_praise',      '客户高评价(重大表彰)',         'Customer high commendation',          'quality',          '客户给予重大书面表彰、续签大单或主动推荐GRT', 1000, 1, 4, 'manual', NULL),
  ('customer_major_complaint',  '客户重大投诉/流失',           'Major customer complaint or loss',    'penalty',          '因服务或质量问题导致客户重大投诉、索赔或流失', -1000, 1, 4, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('major_mistake_prevented',   '重大失误避免',                'Major mistake prevention',            'quality',          '及时发现并阻止重大质量/安全/财务失误发生', 1000, 1, 4, 'manual', NULL),
  ('major_mistake_caused',      '造成重大失误',                'Caused major mistake',                'penalty',          '因疏忽或失职导致重大质量/安全/财务损失', -1000, 1, 4, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}'),
  ('assembly_debug_innovation', '装配调试重大创新',             'Assembly/debug major innovation',     'innovation',       '在装配或调试环节提出重大创新方案，显著提升效率或良率', 1000, 1, 4, 'manual', NULL),
  ('assembly_debug_negligence', '装配调试重大失误',             'Assembly/debug major negligence',     'penalty',          '装配或调试环节因操作不当导致设备损坏或批量返工', -1000, 1, 4, 'manual',
    '{"employee":1,"staff":1,"engineer":10,"specialist":10,"team_leader":10,"manager":100,"director":100,"bu_gm":100}')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Redemption Catalog (CEO-approved rewards)
-- ═══════════════════════════════════════════════════════════

INSERT INTO point_redemption_catalog (code, name, name_en, description, points_cost, monetary_value, category, min_balance, metadata) VALUES
  ('leave_half_day',  '半天带薪休假',          'Half-day paid leave',           '积分兑换半天带薪休假',              200,  NULL,     'leave',   500, '{"duration":"half_day"}'),
  ('leave_full_day',  '一天带薪休假',          'Full-day paid leave',           '积分兑换一天带薪休假',              400,  NULL,     'leave',   500, '{"duration":"full_day"}'),
  ('leave_3days',     '三天带薪休假',          '3-day paid leave',              '积分兑换三天带薪休假',              1000, NULL,     'leave',   1000, '{"duration":"3_days"}'),
  ('travel_eu_2wk',   'GRT欧洲公司工作2周',   'GRT Europe office 2 weeks',     '前往GRT欧洲公司工作交流2周，含机票住宿', 3000, '30000',  'travel',  2000, '{"destination":"europe","duration":"2_weeks","includes":["flights","accommodation","per_diem"]}'),
  ('travel_eu_4wk',   'GRT欧洲公司工作4周',   'GRT Europe office 4 weeks',     '前往GRT欧洲公司工作交流4周，含机票住宿', 5000, '50000',  'travel',  3000, '{"destination":"europe","duration":"4_weeks","includes":["flights","accommodation","per_diem"]}'),
  ('travel_us_2wk',   'GRT美国公司工作2周',   'GRT US office 2 weeks',         '前往GRT美国公司工作交流2周，含机票住宿', 3500, '35000',  'travel',  2000, '{"destination":"usa","duration":"2_weeks","includes":["flights","accommodation","per_diem"]}'),
  ('travel_us_4wk',   'GRT美国公司工作4周',   'GRT US office 4 weeks',         '前往GRT美国公司工作交流4周，含机票住宿', 6000, '60000',  'travel',  3000, '{"destination":"usa","duration":"4_weeks","includes":["flights","accommodation","per_diem"]}'),
  ('gift_card_200',   '200元购物卡',           '¥200 gift card',               '200元电商平台购物卡',               100,  '200',    'gift',    100,  NULL),
  ('gift_card_500',   '500元购物卡',           '¥500 gift card',               '500元电商平台购物卡',               250,  '500',    'gift',    250,  NULL),
  ('training_budget',  '培训经费3000元',       '¥3000 training budget',        '可用于外部培训课程报名',             500,  '3000',   'training', 500,  NULL),
  ('parking_month',   '一个月免费停车位',       'Free parking for 1 month',     '公司停车场免费使用一个月',           150,  '300',    'benefit', 150,  NULL)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Threshold Rules (CEO-directed)
-- ═══════════════════════════════════════════════════════════

INSERT INTO point_thresholds (name, name_en, threshold, direction, action, duration_days, description) VALUES
  ('低于500分停止评优', 'Below 500: suspend excellence', 500, 'below', 'suspend_excellence', 180, '积分低于500分，停止半年评优资格'),
  ('低于0分观察名录',   'Below 0: observation list',     0,   'below', 'observation_list',   NULL, '积分低于0分，进入观察名录，需部门经理约谈'),
  ('达到10000分通报表彰', 'Reach 10K: company commendation', 10000, 'above', 'company_announcement_honor', NULL, '积分达到10000分，系统自动全员通报表彰'),
  ('达到20000分通报表彰', 'Reach 20K: company commendation', 20000, 'above', 'company_announcement_honor', NULL, '积分达到20000分，系统自动全员通报表彰'),
  ('跌至-5000分通报警示', 'Drop to -5K: company warning',   -5000, 'below', 'company_announcement_warning', NULL, '积分跌至-5000分，系统自动全员通报警示'),
  ('跌至-10000分通报警示','Drop to -10K: company warning',  -10000,'below', 'company_announcement_warning', NULL, '积分跌至-10000分，系统自动全员通报警示');

-- ═══════════════════════════════════════════════════════════
-- Table 9: Suggestion Submissions — 合理化建议通道
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE suggestion_status AS ENUM ('draft','submitted','under_review','effective','outstanding','major','rejected','implemented');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS suggestion_submissions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT,
  expected_benefit TEXT,
  implementation_plan TEXT,
  estimated_savings DECIMAL(14,2),
  target_department VARCHAR(100),
  category VARCHAR(50) NOT NULL DEFAULT 'process',
  status suggestion_status NOT NULL DEFAULT 'submitted',
  evaluator_id INTEGER,
  evaluator_notes TEXT,
  evaluated_at TIMESTAMP,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  approval_notes TEXT,
  points_awarded INTEGER DEFAULT 0,
  announcement_id INTEGER,
  announcement_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_employee ON suggestion_submissions (employee_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_status ON suggestion_submissions (status);
CREATE INDEX IF NOT EXISTS idx_suggestion_category ON suggestion_submissions (category);

-- ═══════════════════════════════════════════════════════════
-- Table 10: Point Approval Requests — 积分审批 (>100分需上级批准)
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE point_approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS point_approval_requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL,
  target_employee_id INTEGER NOT NULL,
  rule_code VARCHAR(80),
  requested_points INTEGER NOT NULL,
  description TEXT NOT NULL,
  source_type VARCHAR(50),
  source_id VARCHAR(100),
  status point_approval_status NOT NULL DEFAULT 'pending',
  approved_by INTEGER,
  approved_at TIMESTAMP,
  approval_notes TEXT,
  points_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_approval_requester ON point_approval_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_point_approval_status ON point_approval_requests (status);
CREATE INDEX IF NOT EXISTS idx_point_approval_target ON point_approval_requests (target_employee_id);

-- ═══════════════════════════════════════════════════════════
-- Table 11-13: Company Community — 公司社区 + 敏感词 + 已读
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE community_post_type AS ENUM ('announcement','notice','discussion','achievement','suggestion_share','knowledge');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL DEFAULT 0,
  post_type community_post_type NOT NULL,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  content_clean BOOLEAN NOT NULL DEFAULT TRUE,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  scope VARCHAR(30) NOT NULL DEFAULT 'company_wide',
  scope_value VARCHAR(100),
  source_type VARCHAR(50),
  source_id VARCHAR(100),
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  requires_ack BOOLEAN NOT NULL DEFAULT FALSE,
  ack_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_type ON community_posts (post_type);
CREATE INDEX IF NOT EXISTS idx_community_post_scope ON community_posts (scope);
CREATE INDEX IF NOT EXISTS idx_community_post_pinned ON community_posts (is_pinned);
CREATE INDEX IF NOT EXISTS idx_community_post_created ON community_posts (created_at);

CREATE TABLE IF NOT EXISTS community_sensitive_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'custom',
  action VARCHAR(20) NOT NULL DEFAULT 'mask',
  replacement VARCHAR(50) NOT NULL DEFAULT '***',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_word ON community_sensitive_words (word);
CREATE INDEX IF NOT EXISTS idx_sensitive_category ON community_sensitive_words (category);

CREATE TABLE IF NOT EXISTS community_acks (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  acked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_ack_post ON community_acks (post_id);
CREATE INDEX IF NOT EXISTS idx_community_ack_emp ON community_acks (employee_id);

-- ── Seed: Sensitive Words (敏感词库) ─────────────────────

INSERT INTO community_sensitive_words (word, category, action, replacement) VALUES
  -- 脏话/侮辱
  ('傻逼', 'profanity', 'block', '***'),
  ('妈的', 'profanity', 'mask', '**'),
  ('他妈', 'profanity', 'mask', '**'),
  ('操你', 'profanity', 'block', '***'),
  ('狗日', 'profanity', 'block', '***'),
  ('废物', 'profanity', 'mask', '**'),
  ('白痴', 'profanity', 'mask', '**'),
  ('垃圾', 'profanity', 'flag', '垃圾'),
  ('滚蛋', 'profanity', 'mask', '**'),
  ('混蛋', 'profanity', 'mask', '**'),
  -- 歧视性语言
  ('歧视', 'discrimination', 'flag', '歧视'),
  ('种族', 'discrimination', 'flag', '种族'),
  ('残疾人', 'discrimination', 'flag', '残疾人'),
  -- 机密/商业信息保护
  ('薪资', 'confidential', 'flag', '薪资'),
  ('工资', 'confidential', 'flag', '工资'),
  ('年薪', 'confidential', 'flag', '年薪'),
  ('底薪', 'confidential', 'flag', '底薪'),
  ('奖金金额', 'confidential', 'flag', '奖金金额'),
  ('客户报价', 'confidential', 'block', '***'),
  ('成本价', 'confidential', 'block', '***'),
  ('利润率', 'confidential', 'flag', '利润率'),
  ('配方', 'confidential', 'block', '***'),
  ('技术参数', 'confidential', 'flag', '技术参数'),
  -- 不当内容
  ('跳槽', 'inappropriate', 'flag', '跳槽'),
  ('辞职', 'inappropriate', 'flag', '辞职'),
  ('罢工', 'inappropriate', 'block', '***'),
  ('举报', 'inappropriate', 'flag', '举报'),
  -- 政治敏感
  ('政治', 'political', 'flag', '政治'),
  ('反对', 'political', 'flag', '反对')
ON CONFLICT DO NOTHING;

-- ── Table 14: Elite Benefit Applications — 精英福利申请 ────

DO $$ BEGIN
  CREATE TYPE elite_benefit_status AS ENUM ('pending','approved','rejected','active','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE elite_benefit_type AS ENUM ('alternating_rest','five_day_week');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS elite_benefit_applications (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  benefit_type elite_benefit_type NOT NULL,
  status elite_benefit_status DEFAULT 'pending' NOT NULL,
  point_balance INTEGER NOT NULL,
  kpi_avg_6m DECIMAL(5,2),
  skill_level VARCHAR(10),
  high_delivery_count INTEGER,
  eligibility_details JSONB,
  start_date VARCHAR(10),
  end_date VARCHAR(10),
  duration_months INTEGER,
  approved_by INTEGER,
  approval_notes TEXT,
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  revocation_count INTEGER DEFAULT 0,
  cooldown_until VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elite_benefit_emp ON elite_benefit_applications (employee_id);
CREATE INDEX IF NOT EXISTS idx_elite_benefit_status ON elite_benefit_applications (status);

-- ── Table 15: Elite Benefit Monthly Reviews — 精英福利月度考评 ──
-- CEO指令: 动态考评循环
-- 连续2个月KPI<80 → 回到6天制
-- 每次撤销后，下次申请评选周期+1个月
-- 同样适用于岗位提升评估
-- 员工可选择承诺加强非周末时间投入，但2个月无明显提升→强制恢复6天制

CREATE TABLE IF NOT EXISTS elite_benefit_reviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  review_period VARCHAR(7) NOT NULL,
  benefit_type VARCHAR(30) NOT NULL,
  kpi_score DECIMAL(5,2),
  point_balance INTEGER,
  skill_level VARCHAR(10),
  delivery_score DECIMAL(5,2),
  kpi_below_threshold BOOLEAN DEFAULT FALSE,
  points_below_threshold BOOLEAN DEFAULT FALSE,
  skill_downgraded BOOLEAN DEFAULT FALSE,
  consecutive_kpi_violations INTEGER DEFAULT 0,
  consecutive_point_violations INTEGER DEFAULT 0,
  outcome VARCHAR(30) DEFAULT 'pass' NOT NULL,
  commitment_deadline VARCHAR(10),
  commitment_content TEXT,
  commitment_result VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elite_review_app ON elite_benefit_reviews (application_id);
CREATE INDEX IF NOT EXISTS idx_elite_review_emp_period ON elite_benefit_reviews (employee_id, review_period);

-- ── Seed: Elite Benefit Redemption Catalog Items ──────────

INSERT INTO point_redemption_catalog (code, name, description, points_cost, category, is_active) VALUES
  ('elite_alternating_rest', '大小休3个月', '积分≥5000 + KPI连续6个月≥83 + 技能≥L3 → 3个月大小休', 0, 'elite_benefit', true),
  ('elite_five_day_week', '五天工作制', '在大小休基础上连续两次高水准交付 → 转为五天工作制', 0, 'elite_benefit', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Table 16: Workstation Presets — 员工工作台预设
-- ═══════════════════════════════════════════════════════════
-- CEO指令: 依据提交的员工实际名单与工资表中的入职日期、绩效表现、
-- 岗位职责等预设所有员工的工作台设置
-- Seeded via: npx tsx scripts/seed-workstation-presets.ts

CREATE TABLE IF NOT EXISTS workstation_presets (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE,
  employee_code VARCHAR(20),
  system_role VARCHAR(30) NOT NULL DEFAULT 'employee',
  bu_code VARCHAR(10),
  dashboard_layout VARCHAR(50) NOT NULL DEFAULT 'standard-workspace',
  pinned_menu_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_landing_page VARCHAR(100) NOT NULL DEFAULT '/personal-dashboard',
  widget_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_assistant_level INTEGER NOT NULL DEFAULT 2,
  briefing_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  kpi_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_schedule VARCHAR(20) NOT NULL DEFAULT 'six_day',
  attendance_group VARCHAR(50),
  can_access_salary BOOLEAN NOT NULL DEFAULT FALSE,
  can_access_finance BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve_orders BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_team BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_all_bu BOOLEAN NOT NULL DEFAULT FALSE,
  performance_tier VARCHAR(20) NOT NULL DEFAULT 'standard',
  kpi_score DECIMAL(5,2),
  salary_grade VARCHAR(10),
  is_customized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workstation_emp ON workstation_presets (employee_id);
CREATE INDEX IF NOT EXISTS idx_workstation_role ON workstation_presets (system_role);
