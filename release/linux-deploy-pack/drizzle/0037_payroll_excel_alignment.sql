-- 0037: Payroll Excel Alignment
-- Adds columns to salary_structures, payroll_ledgers, and attendance_records
-- to match CEO's real salary Excel structure (副本202602-薪资稿V1)

-- ── salary_structures: Excel-aligned salary components ──
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS position_wage DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS skill_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS saturday_shift_premium DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS comprehensive_salary DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS cash_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS travel_car_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS is_lump_sum BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS special_tax_deduction DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS social_insurance_actual DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS housing_fund_actual DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS perfect_attendance_eligible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS perfect_attendance_amount DECIMAL(14,2) NOT NULL DEFAULT 300.00;

-- ── payroll_ledgers: Excel-aligned income/deduction components ──
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_position_wage DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_skill_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_saturday_shift_premium DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_comprehensive_salary DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_cash_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_travel_car_subsidy DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS perfect_attendance_bonus DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS personal_leave_deduction DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS sick_leave_deduction DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS reconciliation_adjustment DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS ledger_special_tax_deduction DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS other_income DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_ledgers ADD COLUMN IF NOT EXISTS kpi_bonus_amount DECIMAL(14,2) NOT NULL DEFAULT 0;

-- ── attendance_records: Hour-based leave tracking ──
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS personal_leave_hours DECIMAL(6,1) NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS sick_leave_hours DECIMAL(6,1) NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS annual_leave_hours DECIMAL(6,1) NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS compensatory_leave_hours DECIMAL(6,1) NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS late_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS missing_clock_count INTEGER NOT NULL DEFAULT 0;
