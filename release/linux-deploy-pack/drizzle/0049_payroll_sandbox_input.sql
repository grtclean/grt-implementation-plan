-- Payroll Sandbox — 10 tables
-- Pilot month: 202601

-- ── Enums ──

DO $$ BEGIN
  CREATE TYPE ps_cycle_status_enum AS ENUM ('draft','importing','imported','calculating','calculated','reviewing','approved','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ps_allowance_type_enum AS ENUM ('cash_subsidy','travel_car','meal','communication','housing','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ps_adjust_type_enum AS ENUM ('perf_wage_override','attendance_correction','bonus_addition','deduction_correction','retroactive','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ps_adjust_status_enum AS ENUM ('draft','pending','approved','rejected','applied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ps_payout_status_enum AS ENUM ('pending','processing','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ps_position_category_enum AS ENUM ('indirect','direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1. Payroll Sandbox Cycles ──

CREATE TABLE IF NOT EXISTS payroll_sandbox_cycles (
  id SERIAL PRIMARY KEY,
  period VARCHAR(7) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  status ps_cycle_status_enum NOT NULL DEFAULT 'draft',
  work_days INTEGER NOT NULL DEFAULT 22,
  daily_work_hours DECIMAL(4,1) NOT NULL DEFAULT 8.0,
  total_employees INTEGER DEFAULT 0,
  total_gross_pay DECIMAL(16,2) DEFAULT 0,
  total_net_pay DECIMAL(16,2) DEFAULT 0,
  total_tax DECIMAL(16,2) DEFAULT 0,
  total_social_insurance DECIMAL(16,2) DEFAULT 0,
  imported_at TIMESTAMP,
  imported_by_id INTEGER,
  calculated_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by_id INTEGER,
  locked_at TIMESTAMP,
  remarks TEXT,
  created_by_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── 2. Attendance Input ──

CREATE TABLE IF NOT EXISTS ps_attendance_input (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  department VARCHAR(100),
  employee_code VARCHAR(50),
  position VARCHAR(100),
  attendance_group VARCHAR(50),
  rest_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  actual_attendance DECIMAL(5,1) DEFAULT 0,
  work_hours DECIMAL(7,1) DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  severe_late_count INTEGER DEFAULT 0,
  absent_late_days DECIMAL(5,1) DEFAULT 0,
  early_leave_count INTEGER DEFAULT 0,
  absent_days DECIMAL(5,1) DEFAULT 0,
  clock_miss_upper INTEGER DEFAULT 0,
  clock_miss_lower INTEGER DEFAULT 0,
  annual_leave_days DECIMAL(5,1) DEFAULT 0,
  personal_leave_hours DECIMAL(7,1) DEFAULT 0,
  sick_leave_hours DECIMAL(7,1) DEFAULT 0,
  compensatory_leave_hours DECIMAL(7,1) DEFAULT 0,
  maternity_days DECIMAL(5,1) DEFAULT 0,
  paternity_days DECIMAL(5,1) DEFAULT 0,
  marriage_days DECIMAL(5,1) DEFAULT 0,
  menstrual_days DECIMAL(5,1) DEFAULT 0,
  bereavement_days DECIMAL(5,1) DEFAULT 0,
  nursing_hours DECIMAL(7,1) DEFAULT 0,
  total_overtime_hours DECIMAL(7,1) DEFAULT 0,
  overtime_for_pay_hours DECIMAL(7,1) DEFAULT 0,
  weekday_overtime_for_pay DECIMAL(7,1) DEFAULT 0,
  weekend_overtime_for_pay DECIMAL(7,1) DEFAULT 0,
  holiday_overtime_for_pay DECIMAL(7,1) DEFAULT 0,
  weekday_overtime DECIMAL(7,1) DEFAULT 0,
  weekend_overtime DECIMAL(7,1) DEFAULT 0,
  holiday_overtime DECIMAL(7,1) DEFAULT 0,
  saturday_supplement DECIMAL(7,1) DEFAULT 0,
  raw_data JSONB,
  data_source VARCHAR(50) DEFAULT 'csv_import',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_attendance_cycle_idx ON ps_attendance_input(cycle_id);
CREATE INDEX IF NOT EXISTS ps_attendance_employee_idx ON ps_attendance_input(employee_name);

-- ── 3. Performance Input ──

CREATE TABLE IF NOT EXISTS ps_performance_input (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  employee_grt_id VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  position_category ps_position_category_enum,
  is_evaluated BOOLEAN DEFAULT true,
  monthly_score DECIMAL(5,1),
  avg_2024_score DECIMAL(5,2),
  avg_2025_score DECIMAL(5,2),
  preset_2026_score DECIMAL(5,2),
  perf_coeff_1 DECIMAL(5,2),
  perf_coeff_2 DECIMAL(5,2),
  perf_coeff_3 DECIMAL(5,2),
  perf_wage1_base DECIMAL(14,2) DEFAULT 0,
  perf_wage2_base DECIMAL(14,2) DEFAULT 0,
  perf_wage3_base DECIMAL(14,2) DEFAULT 0,
  raw_data JSONB,
  data_source VARCHAR(50) DEFAULT 'csv_import',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_perf_cycle_idx ON ps_performance_input(cycle_id);
CREATE INDEX IF NOT EXISTS ps_perf_employee_idx ON ps_performance_input(employee_name);

-- ── 4. Allowance Input ──

CREATE TABLE IF NOT EXISTS ps_allowance_input (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  allowance_type ps_allowance_type_enum NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  department VARCHAR(100),
  remarks TEXT,
  raw_data JSONB,
  data_source VARCHAR(50) DEFAULT 'csv_import',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_allowance_cycle_idx ON ps_allowance_input(cycle_id);
CREATE INDEX IF NOT EXISTS ps_allowance_employee_idx ON ps_allowance_input(employee_name);

-- ── 5. Social Fund Input ──

CREATE TABLE IF NOT EXISTS ps_social_fund_input (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  department VARCHAR(100),
  hire_date VARCHAR(20),
  last_work_date VARCHAR(20),
  social_insurance_personal DECIMAL(14,2) NOT NULL DEFAULT 0,
  housing_fund_personal DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_personal DECIMAL(14,2) NOT NULL DEFAULT 0,
  raw_data JSONB,
  data_source VARCHAR(50) DEFAULT 'csv_import',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_social_cycle_idx ON ps_social_fund_input(cycle_id);
CREATE INDEX IF NOT EXISTS ps_social_employee_idx ON ps_social_fund_input(employee_name);

-- ── 6. Tax Snapshot ──

CREATE TABLE IF NOT EXISTS ps_tax_snapshot (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  cumulative_income_prior DECIMAL(16,2) NOT NULL DEFAULT 0,
  cumulative_deduction_prior DECIMAL(16,2) NOT NULL DEFAULT 0,
  cumulative_tax_paid_prior DECIMAL(16,2) NOT NULL DEFAULT 0,
  month_index INTEGER NOT NULL DEFAULT 1,
  special_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
  basic_exemption DECIMAL(14,2) NOT NULL DEFAULT 5000,
  remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_tax_cycle_idx ON ps_tax_snapshot(cycle_id);
CREATE INDEX IF NOT EXISTS ps_tax_employee_idx ON ps_tax_snapshot(employee_name);

-- ── 7. Calculation Result ──

CREATE TABLE IF NOT EXISTS ps_calc_result (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  department VARCHAR(100),
  position_grade VARCHAR(20),
  base_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  position_wage DECIMAL(14,2) NOT NULL DEFAULT 0,
  skill_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0,
  saturday_shift_premium DECIMAL(14,2) NOT NULL DEFAULT 0,
  comprehensive_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_wage1 DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_wage2 DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_wage3 DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_adjustment DECIMAL(14,2) NOT NULL DEFAULT 0,
  calc_perf_coeff1 DECIMAL(5,2),
  calc_perf_coeff2 DECIMAL(5,2),
  calc_perf_coeff3 DECIMAL(5,2),
  perf_deduction1 DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_deduction2 DECIMAL(14,2) NOT NULL DEFAULT 0,
  perf_deduction3 DECIMAL(14,2) NOT NULL DEFAULT 0,
  actual_attendance_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  personal_leave_hours DECIMAL(7,1) NOT NULL DEFAULT 0,
  sick_leave_hours DECIMAL(7,1) NOT NULL DEFAULT 0,
  personal_leave_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
  sick_leave_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
  weekday_ot_hours DECIMAL(7,1) NOT NULL DEFAULT 0,
  weekend_ot_hours DECIMAL(7,1) NOT NULL DEFAULT 0,
  holiday_ot_hours DECIMAL(7,1) NOT NULL DEFAULT 0,
  weekday_ot_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
  weekend_ot_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
  holiday_ot_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
  cash_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0,
  travel_car_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0,
  perfect_attendance_bonus DECIMAL(14,2) NOT NULL DEFAULT 0,
  assessment_bonus DECIMAL(14,2) NOT NULL DEFAULT 0,
  gross_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
  other_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  social_insurance DECIMAL(14,2) NOT NULL DEFAULT 0,
  housing_fund DECIMAL(14,2) NOT NULL DEFAULT 0,
  income_tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
  calculation_log JSONB,
  formula_details JSONB,
  diff_from_excel JSONB,
  is_lump_sum BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_calc_cycle_idx ON ps_calc_result(cycle_id);
CREATE INDEX IF NOT EXISTS ps_calc_employee_idx ON ps_calc_result(employee_name);

-- ── 8. Final Result ──

CREATE TABLE IF NOT EXISTS ps_final_result (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  calc_result_id INTEGER REFERENCES ps_calc_result(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  department VARCHAR(100),
  position_grade VARCHAR(20),
  gross_pay DECIMAL(14,2) NOT NULL,
  social_insurance DECIMAL(14,2) NOT NULL DEFAULT 0,
  housing_fund DECIMAL(14,2) NOT NULL DEFAULT 0,
  income_tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  other_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(14,2) NOT NULL,
  excel_gross_pay DECIMAL(14,2),
  excel_net_pay DECIMAL(14,2),
  excel_tax DECIMAL(14,2),
  gross_diff DECIMAL(14,2) DEFAULT 0,
  net_diff DECIMAL(14,2) DEFAULT 0,
  tax_diff DECIMAL(14,2) DEFAULT 0,
  is_matched BOOLEAN DEFAULT false,
  reviewed_by_id INTEGER,
  reviewed_at TIMESTAMP,
  review_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_result_cycle_idx ON ps_final_result(cycle_id);
CREATE INDEX IF NOT EXISTS ps_result_employee_idx ON ps_final_result(employee_name);

-- ── 9. Adjustment ──

CREATE TABLE IF NOT EXISTS ps_adjustment (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  result_id INTEGER REFERENCES ps_final_result(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  adjust_type ps_adjust_type_enum NOT NULL,
  field_name VARCHAR(50),
  original_value DECIMAL(14,2),
  adjusted_value DECIMAL(14,2) NOT NULL,
  adjust_amount DECIMAL(14,2) NOT NULL,
  reason TEXT NOT NULL,
  status ps_adjust_status_enum NOT NULL DEFAULT 'draft',
  created_by_id INTEGER,
  approved_by_id INTEGER,
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_adjust_cycle_idx ON ps_adjustment(cycle_id);
CREATE INDEX IF NOT EXISTS ps_adjust_employee_idx ON ps_adjustment(employee_name);
CREATE INDEX IF NOT EXISTS ps_adjust_status_idx ON ps_adjustment(status);

-- ── 10. Payout (SENSITIVE) ──

CREATE TABLE IF NOT EXISTS ps_payout (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES payroll_sandbox_cycles(id),
  result_id INTEGER REFERENCES ps_final_result(id),
  employee_name VARCHAR(100) NOT NULL,
  employee_id INTEGER,
  net_pay_amount DECIMAL(14,2) NOT NULL,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  id_number VARCHAR(20),
  phone_number VARCHAR(20),
  status ps_payout_status_enum NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  payment_ref VARCHAR(100),
  failure_reason TEXT,
  processed_by_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ps_payout_cycle_idx ON ps_payout(cycle_id);
CREATE INDEX IF NOT EXISTS ps_payout_status_idx ON ps_payout(status);

-- ══════════════════════════════════════════════════════════
-- SEED: 202601 pilot cycle
-- ══════════════════════════════════════════════════════════

INSERT INTO payroll_sandbox_cycles (period, name, status, work_days, daily_work_hours, total_employees, remarks)
VALUES ('2026-01', '2026年1月工资(沙盘试算)', 'draft', 17, 8.0, 93, '试点月份 — 从Excel导入验证');

-- Social fund seed (from social-insurance-202601.csv, 202601 column)
INSERT INTO ps_social_fund_input (cycle_id, employee_name, department, hire_date, last_work_date, social_insurance_personal, housing_fund_personal, total_personal)
VALUES
  (1, '倪亚东', '总裁办', '2010-07-01', NULL, 743.72, 3520.00, 4263.72),
  (1, '黄晓兰', '财务部', '2015-10-01', NULL, 1260.00, 3520.00, 4780.00),
  (1, '倪亚琴', '事业三部', '2010-07-01', NULL, 612.47, 249.00, 861.47),
  (1, '戴晓燕', '事业一部', '2010-10-01', NULL, 612.47, 600.00, 1212.47),
  (1, '金晓锋', '事业一部', '2015-02-26', NULL, 612.47, 0.00, 612.47),
  (1, '洪香龙', '事业二部', '2017-03-22', NULL, 612.47, 249.00, 861.47),
  (1, '孙坚', '事业三部', '2017-11-15', NULL, 612.47, 249.00, 861.47),
  (1, '马柯', '事业十部', '2018-02-01', NULL, 612.47, 249.00, 861.47),
  (1, '史龙昌', '事业十部', '2018-02-26', NULL, 612.47, 0.00, 612.47),
  (1, '吴卫成', '事业三部', '2018-02-26', NULL, 612.47, 0.00, 612.47),
  (1, '张超', '事业十部', '2018-03-14', NULL, 612.47, 0.00, 612.47),
  (1, '李兴伟', '事业十部', '2018-04-07', NULL, 612.47, 0.00, 612.47),
  (1, '孙淼', '事业二部', '2018-04-10', NULL, 612.47, 0.00, 612.47),
  (1, '廉龙海', '事业二部', '2019-02-16', NULL, 612.47, 0.00, 612.47),
  (1, '杜显文', '事业三部', '2019-03-18', NULL, 612.47, 0.00, 612.47),
  (1, '曹庆伟', '事业二部', '2019-03-26', NULL, 612.47, 0.00, 612.47),
  (1, '田坪珍', '事业二部', '2019-07-09', NULL, 612.47, 0.00, 612.47),
  (1, '孙国祥', '事业三部', '2019-08-01', NULL, 612.47, 500.00, 1112.47),
  (1, '冯艳', '事业三部', '2020-10-26', NULL, 612.47, 249.00, 861.47),
  (1, '张洵', '事业二部', '2021-02-15', NULL, 612.47, 249.00, 861.47),
  (1, '张松松', '事业二部', '2021-02-22', NULL, 612.47, 249.00, 861.47),
  (1, '李大鹏', '事业二部', '2021-02-24', NULL, 612.47, 249.00, 861.47),
  (1, '杨之雲', '事业二部', '2021-04-06', NULL, 612.47, 249.00, 861.47),
  (1, '张腾飞', '事业十部', '2021-05-17', NULL, 612.47, 249.00, 861.47),
  (1, '肖博雅', '事业二部', '2021-07-15', NULL, 612.47, 0.00, 612.47),
  (1, '朱明华', '事业二部', '2022-02-08', NULL, 519.96, 0.00, 519.96),
  (1, '殷小勇', '事业三部', '2022-02-12', NULL, 519.96, 0.00, 519.96),
  (1, '匡凯旋', '事业二部', '2022-02-15', NULL, 519.96, 600.00, 1119.96),
  (1, '谈龙锐', '事业三部', '2022-03-18', NULL, 519.96, 0.00, 519.96),
  (1, '纪伟', '事业三部', '2022-04-19', NULL, 519.96, 0.00, 519.96),
  (1, '王志强', '事业二部', '2022-09-19', NULL, 519.96, 249.00, 768.96),
  (1, '韩品来', '事业二部', '2022-10-06', '2026-02-09', 519.96, 249.00, 768.96),
  (1, '黄潇潇', '事业三部', '2022-12-09', NULL, 519.96, 0.00, 519.96),
  (1, '马林山', '事业二部', '2023-02-01', NULL, 519.96, 249.00, 768.96),
  (1, '侯德朋', '事业三部', '2023-02-11', NULL, 519.96, 0.00, 519.96),
  (1, '晏春艮', '事业一部', '2023-03-01', NULL, 519.96, 0.00, 519.96),
  (1, '张良', '事业三部', '2023-05-23', NULL, 519.96, 0.00, 519.96),
  (1, '刘建年', '事业三部', '2023-06-26', NULL, 519.96, 0.00, 519.96),
  (1, '韩保程', '事业三部', '2023-06-26', NULL, 630.00, 600.00, 1230.00),
  (1, '洪小东', '事业二部', '2023-07-05', NULL, 630.00, 600.00, 1230.00),
  (1, '杨勇', '事业部支持部', '2023-07-18', NULL, 1575.00, 1500.00, 3075.00),
  (1, '吕雪冬', '事业二部', '2023-09-18', NULL, 519.96, 0.00, 519.96),
  (1, '嵇国华', '事业十部', '2023-10-16', NULL, 519.96, 0.00, 519.96),
  (1, '胡杨', 'AI数智部', '2024-01-08', NULL, 519.96, 249.00, 768.96),
  (1, '曹滟林', '事业一部', '2024-03-01', NULL, 519.96, 0.00, 519.96),
  (1, '崔聪聪', '事业三部', '2024-03-01', NULL, 519.96, 0.00, 519.96),
  (1, '赵强', '事业二部', '2024-03-01', NULL, 519.96, 0.00, 519.96);

-- Performance input seed (from performance-scores-202601.csv)
INSERT INTO ps_performance_input (cycle_id, employee_name, employee_grt_id, department, position, position_category, is_evaluated, monthly_score)
VALUES
  (1, '倪亚琴', 'GRT003', '事业三部', '采购与项目工程师', 'indirect', true, 87.1),
  (1, '戴晓燕', 'GRT004', '事业一部', '高级销售经理', 'indirect', true, 59.2),
  (1, '金晓锋', 'GRT005', '事业一部', '制造质量经理', 'indirect', true, 81.2),
  (1, '洪香龙', 'GRT006', '事业二部', '机械设计经理', 'indirect', true, 79.6),
  (1, '孙坚', 'GRT007', '事业三部', '电气主管', 'indirect', true, 81.0),
  (1, '孙国祥', 'GRT018', '事业三部', '电气工程师', 'indirect', true, 77.0),
  (1, '冯艳', 'GRT019', '事业三部', '销售与项目工程师', 'indirect', true, 60.0),
  (1, '张洵', 'GRT020', '事业二部', '采购与项目工程师', 'indirect', true, 86.7),
  (1, '李大鹏', 'GRT022', '事业二部', '电气工程师', 'indirect', true, 85.6);

-- Allowance seed: cash subsidies (from cash-subsidy.csv, top entries)
INSERT INTO ps_allowance_input (cycle_id, employee_name, allowance_type, amount)
VALUES
  (1, '廉龙海', 'cash_subsidy', 6000),
  (1, '焦斌', 'cash_subsidy', 5800),
  (1, '韩保程', 'cash_subsidy', 5300),
  (1, '孙坚', 'cash_subsidy', 5200),
  (1, '朱明华', 'cash_subsidy', 3800),
  (1, '马林山', 'cash_subsidy', 3800),
  (1, '曹滟林', 'cash_subsidy', 3700),
  (1, '罗小玲', 'cash_subsidy', 2900),
  (1, '朱宇浩', 'cash_subsidy', 2700),
  (1, '李树锋', 'cash_subsidy', 2500),
  (1, '赵强', 'cash_subsidy', 2200),
  (1, '王志强', 'cash_subsidy', 2000),
  (1, '金晓锋', 'cash_subsidy', 1200),
  (1, '张腾飞', 'cash_subsidy', 1200),
  (1, '周辉', 'cash_subsidy', 1200),
  (1, '陈加丽', 'cash_subsidy', 1200),
  (1, '钱佳奇', 'cash_subsidy', 1100),
  (1, '杨之雲', 'cash_subsidy', 1000),
  (1, '崔聪聪', 'cash_subsidy', 1000),
  (1, '梅奥杰', 'cash_subsidy', 1000),
  (1, '洪香龙', 'cash_subsidy', 900),
  (1, '杜显文', 'cash_subsidy', 900),
  (1, '田坪珍', 'cash_subsidy', 900),
  (1, '李大鹏', 'cash_subsidy', 800),
  (1, '晏春艮', 'cash_subsidy', 800),
  (1, '刘琛杨', 'cash_subsidy', 800),
  (1, '倪亚东', 'cash_subsidy', 500),
  (1, '戴晓燕', 'cash_subsidy', 500),
  (1, '刘奥运', 'cash_subsidy', 525),
  (1, '沙建梅', 'cash_subsidy', 500),
  (1, '田炜钰', 'cash_subsidy', 700),
  (1, '朱宇浩', 'cash_subsidy', 500),
  (1, '胡杨', 'cash_subsidy', 500),
  (1, '朱文韬', 'cash_subsidy', 500),
  (1, '刘健康', 'cash_subsidy', 5000);

-- Allowance seed: travel/car subsidies (from travel-car-subsidy-202601.csv)
INSERT INTO ps_allowance_input (cycle_id, employee_name, allowance_type, amount)
VALUES
  (1, '蔡瑞', 'travel_car', 420.00),
  (1, '崔聪聪', 'travel_car', 60.00),
  (1, '韩品来', 'travel_car', 180.00),
  (1, '侯德朋', 'travel_car', 1260.00),
  (1, '蒋秋瑞', 'travel_car', 600.00),
  (1, '李大鹏', 'travel_car', 720.00),
  (1, '廉龙海', 'travel_car', 300.00),
  (1, '刘琛杨', 'travel_car', 270.00),
  (1, '刘建年', 'travel_car', 300.00),
  (1, '梅奥杰', 'travel_car', 60.00),
  (1, '钱佳奇', 'travel_car', 60.00),
  (1, '孙坚', 'travel_car', 210.00),
  (1, '谈龙锐', 'travel_car', 660.00),
  (1, '谈宜磊', 'travel_car', 120.00),
  (1, '周建华', 'travel_car', 210.00),
  (1, '朱明华', 'travel_car', 210.00);

-- Tax snapshot seed: Jan=month 1, all cumulative priors = 0
INSERT INTO ps_tax_snapshot (cycle_id, employee_name, month_index, cumulative_income_prior, cumulative_deduction_prior, cumulative_tax_paid_prior, special_deduction)
VALUES
  (1, '倪亚东', 1, 0, 0, 0, 0),
  (1, '倪微薇', 1, 0, 0, 0, 0),
  (1, '曹二', 1, 0, 0, 0, 0),
  (1, '杨勇', 1, 0, 0, 0, 0),
  (1, '刘奥运', 1, 0, 0, 0, 0),
  (1, '沙建梅', 1, 0, 0, 0, 0),
  (1, '黄晓兰', 1, 0, 0, 0, 0),
  (1, '金晓锋', 1, 0, 0, 0, 0),
  (1, '洪香龙', 1, 0, 0, 0, 0);
