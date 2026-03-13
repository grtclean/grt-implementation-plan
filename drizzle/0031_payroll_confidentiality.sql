-- Migration: 0031_payroll_confidentiality
-- Description: Payroll confidentiality access control + performance wage override audit
--              Three-tier performance wages (绩效工资1/2/3) columns on salary_structures + payroll_ledgers
-- Date: 2026-03-11

-- ── New columns on salary_structures ──
ALTER TABLE "salary_structures"
  ADD COLUMN IF NOT EXISTS "perf_wage1_base" DECIMAL(14,2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "perf_wage2_base" DECIMAL(14,2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "perf_wage3_base" DECIMAL(14,2) NOT NULL DEFAULT '0';

-- ── New columns on payroll_ledgers (三档绩效工资) ──
ALTER TABLE "payroll_ledgers"
  ADD COLUMN IF NOT EXISTS "perf_wage1" DECIMAL(14,2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "perf_wage1_override" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "perf_wage1_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "perf_wage2" DECIMAL(14,2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "perf_wage2_override" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "perf_wage2_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "perf_wage3" DECIMAL(14,2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "perf_wage3_override" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "perf_wage3_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "override_approved_by_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "override_approved_at" TIMESTAMP;

-- ── Table: payroll_access_control — 薪资保密授权 ──
CREATE TABLE IF NOT EXISTS "payroll_access_control" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "employee_grt_id" VARCHAR(20) NOT NULL,
  "employee_name" VARCHAR(100) NOT NULL,
  "access_level" VARCHAR(20) NOT NULL DEFAULT 'full',
  "can_view_all" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_approve" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_override_perf" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_export" BOOLEAN NOT NULL DEFAULT FALSE,
  "granted_by_id" INTEGER,
  "granted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "remarks" TEXT
);

-- ── Table: perf_wage_override_audit — 绩效工资调整审计 ──
CREATE TABLE IF NOT EXISTS "perf_wage_override_audit" (
  "id" SERIAL PRIMARY KEY,
  "ledger_id" INTEGER NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "period" VARCHAR(7) NOT NULL,
  "wage_slot" VARCHAR(10) NOT NULL,
  "calculated_value" DECIMAL(14,2) NOT NULL,
  "override_value" DECIMAL(14,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "operator_id" INTEGER NOT NULL,
  "operator_name" VARCHAR(100),
  "approved_by_id" INTEGER,
  "approved_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS "perf_override_audit_period_idx" ON "perf_wage_override_audit" ("period");
CREATE INDEX IF NOT EXISTS "perf_override_audit_employee_idx" ON "perf_wage_override_audit" ("employee_id");

-- ── Seed default confidentiality access (3 authorized users) ──
-- NOTE: user_id values must match actual IDs after seed; these use placeholder IDs
-- In production, run seed-real-users.ts first, then UPDATE with correct user IDs
INSERT INTO "payroll_access_control" ("user_id", "employee_grt_id", "employee_name", "access_level", "can_view_all", "can_approve", "can_override_perf", "can_export", "remarks")
VALUES
  (1, 'GRT001', '倪亚东', 'full', TRUE, TRUE, TRUE, TRUE, 'CEO — 最高薪资权限'),
  (2, 'GRT002', '刘奥运', 'full', TRUE, TRUE, FALSE, TRUE, '董秘 — 薪资审核权限'),
  (3, 'GRT105', '倪微薇', 'full', TRUE, FALSE, FALSE, TRUE, 'AI部门经理 — 薪资查看权限')
ON CONFLICT DO NOTHING;
