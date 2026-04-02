/**
 * Create GL (General Ledger) accounting tables + seed finance role assignments.
 * Usage: node scripts/create-gl-tables.cjs
 */
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  const statements = [
    // ──────────── 1. gl_accounts ────────────
    `CREATE TABLE IF NOT EXISTS gl_accounts (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      account_type VARCHAR(20) NOT NULL DEFAULT 'asset',
      account_group VARCHAR(50),
      parent_code VARCHAR(20),
      level INTEGER NOT NULL DEFAULT 1,
      is_leaf BOOLEAN NOT NULL DEFAULT true,
      currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
      direction VARCHAR(10) NOT NULL DEFAULT 'debit',
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 2. gl_entries ────────────
    `CREATE TABLE IF NOT EXISTS gl_entries (
      id SERIAL PRIMARY KEY,
      entry_number VARCHAR(30) NOT NULL,
      period VARCHAR(7) NOT NULL,
      entry_date VARCHAR(10) NOT NULL,
      account_code VARCHAR(20) NOT NULL,
      debit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      description TEXT,
      source_doc VARCHAR(100),
      source_doc_type VARCHAR(20) DEFAULT 'manual',
      cost_center_id INTEGER,
      project_id INTEGER,
      bu_code VARCHAR(10),
      is_posted BOOLEAN NOT NULL DEFAULT false,
      posted_at TIMESTAMP,
      posted_by INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 3. account_balances ────────────
    `CREATE TABLE IF NOT EXISTS account_balances (
      id SERIAL PRIMARY KEY,
      account_code VARCHAR(20) NOT NULL,
      period VARCHAR(7) NOT NULL,
      account_type VARCHAR(20) DEFAULT '',
      opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      debit_total DECIMAL(18,2) NOT NULL DEFAULT 0,
      credit_total DECIMAL(18,2) NOT NULL DEFAULT 0,
      ending_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_code, period)
    )`,

    // ──────────── 4. fixed_assets ────────────
    `CREATE TABLE IF NOT EXISTS fixed_assets (
      id SERIAL PRIMARY KEY,
      asset_code VARCHAR(30) NOT NULL UNIQUE,
      asset_name VARCHAR(100) NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'other',
      acquisition_date VARCHAR(10) NOT NULL,
      acquisition_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
      residual_value DECIMAL(18,2) NOT NULL DEFAULT 0,
      useful_life_months INTEGER NOT NULL DEFAULT 60,
      depreciation_method VARCHAR(30) NOT NULL DEFAULT 'straight_line',
      accumulated_depreciation DECIMAL(18,2) NOT NULL DEFAULT 0,
      net_book_value DECIMAL(18,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      department_id INTEGER,
      location_description VARCHAR(200),
      po_number VARCHAR(50),
      invoice_number VARCHAR(50),
      gl_account_code VARCHAR(20),
      depreciation_account_code VARCHAR(20),
      bu_code VARCHAR(10),
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 5. asset_depreciation ────────────
    `CREATE TABLE IF NOT EXISTS asset_depreciation (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL REFERENCES fixed_assets(id),
      period VARCHAR(7) NOT NULL,
      depreciation_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      accumulated_depreciation DECIMAL(18,2) NOT NULL DEFAULT 0,
      net_book_value DECIMAL(18,2) NOT NULL DEFAULT 0,
      method VARCHAR(30) NOT NULL DEFAULT 'straight_line',
      is_posted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(asset_id, period)
    )`,

    // ──────────── 6. asset_disposal ────────────
    `CREATE TABLE IF NOT EXISTS asset_disposal (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL REFERENCES fixed_assets(id),
      disposal_date VARCHAR(10) NOT NULL,
      disposal_type VARCHAR(20) NOT NULL DEFAULT 'scrap',
      disposal_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      net_book_value_at_disposal DECIMAL(18,2) NOT NULL DEFAULT 0,
      gain_loss DECIMAL(18,2) NOT NULL DEFAULT 0,
      reason TEXT,
      approved_by INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 7. tax_invoices ────────────
    `CREATE TABLE IF NOT EXISTS tax_invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL,
      invoice_date VARCHAR(10) NOT NULL,
      direction VARCHAR(10) NOT NULL DEFAULT 'input',
      counterparty_name VARCHAR(200) NOT NULL,
      counterparty_tax_id VARCHAR(50),
      amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      invoice_type VARCHAR(20) NOT NULL DEFAULT 'special_vat',
      source_doc VARCHAR(100),
      notes TEXT,
      bu_code VARCHAR(10),
      is_certified BOOLEAN NOT NULL DEFAULT false,
      certified_date VARCHAR(10),
      certified_by INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'registered',
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 8. finance_role_assignments ────────────
    `CREATE TABLE IF NOT EXISTS finance_role_assignments (
      id SERIAL PRIMARY KEY,
      role_code VARCHAR(30) NOT NULL,
      role_name VARCHAR(50) NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 0,
      user_name VARCHAR(50) NOT NULL DEFAULT '',
      bu_code VARCHAR(10),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 9. cost_centers ────────────
    `CREATE TABLE IF NOT EXISTS cost_centers (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      parent_code VARCHAR(20),
      department_id INTEGER,
      bu_code VARCHAR(10),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 10. period_close_checklists ────────────
    `CREATE TABLE IF NOT EXISTS period_close_checklists (
      id SERIAL PRIMARY KEY,
      period VARCHAR(7) NOT NULL,
      check_code VARCHAR(30) NOT NULL,
      check_name VARCHAR(100) NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      completed_by INTEGER,
      completed_at TIMESTAMP,
      completed_note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── 11. project_activity_timeline ────────────
    // Project activity timeline (cross-module audit trail)
    `CREATE TABLE IF NOT EXISTS project_activity_timeline (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      project_code VARCHAR(50),
      activity_type VARCHAR(50) NOT NULL,
      activity_title VARCHAR(200) NOT NULL,
      activity_description TEXT,
      source_module VARCHAR(50) NOT NULL,
      source_doc_type VARCHAR(50),
      source_doc_id INTEGER,
      source_doc_code VARCHAR(50),
      project_phase VARCHAR(10),
      amount DECIMAL(14,2),
      performed_by INTEGER,
      performed_by_name VARCHAR(100),
      performed_at TIMESTAMP DEFAULT NOW()
    )`,

    // ──────────── Indexes ────────────

    // gl_accounts
    `CREATE INDEX IF NOT EXISTS gl_accounts_idx_type ON gl_accounts(account_type)`,
    `CREATE INDEX IF NOT EXISTS gl_accounts_idx_parent ON gl_accounts(parent_code)`,
    `CREATE INDEX IF NOT EXISTS gl_accounts_idx_group ON gl_accounts(account_group)`,
    `CREATE INDEX IF NOT EXISTS gl_accounts_idx_level ON gl_accounts(level)`,
    `CREATE INDEX IF NOT EXISTS gl_accounts_idx_active ON gl_accounts(is_active)`,

    // gl_entries
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_number ON gl_entries(entry_number)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_period ON gl_entries(period)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_account ON gl_entries(account_code)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_posted ON gl_entries(is_posted)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_source_doc ON gl_entries(source_doc)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_source_type ON gl_entries(source_doc_type)`,
    `CREATE INDEX IF NOT EXISTS gl_entries_idx_period_posted ON gl_entries(period, is_posted)`,

    // account_balances
    `CREATE INDEX IF NOT EXISTS account_balances_idx_period ON account_balances(period)`,
    `CREATE INDEX IF NOT EXISTS account_balances_idx_account ON account_balances(account_code)`,

    // fixed_assets
    `CREATE INDEX IF NOT EXISTS fixed_assets_idx_category ON fixed_assets(category)`,
    `CREATE INDEX IF NOT EXISTS fixed_assets_idx_status ON fixed_assets(status)`,
    `CREATE INDEX IF NOT EXISTS fixed_assets_idx_dept ON fixed_assets(department_id)`,
    `CREATE INDEX IF NOT EXISTS fixed_assets_idx_bu ON fixed_assets(bu_code)`,

    // asset_depreciation
    `CREATE INDEX IF NOT EXISTS asset_depreciation_idx_asset ON asset_depreciation(asset_id)`,
    `CREATE INDEX IF NOT EXISTS asset_depreciation_idx_period ON asset_depreciation(period)`,
    `CREATE INDEX IF NOT EXISTS asset_depreciation_idx_posted ON asset_depreciation(is_posted)`,

    // asset_disposal
    `CREATE INDEX IF NOT EXISTS asset_disposal_idx_asset ON asset_disposal(asset_id)`,

    // tax_invoices
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_number ON tax_invoices(invoice_number)`,
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_direction ON tax_invoices(direction)`,
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_date ON tax_invoices(invoice_date)`,
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_status ON tax_invoices(status)`,
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_certified ON tax_invoices(is_certified)`,
    `CREATE INDEX IF NOT EXISTS tax_invoices_idx_counterparty ON tax_invoices(counterparty_name)`,

    // finance_role_assignments
    `CREATE INDEX IF NOT EXISTS finance_role_idx_code ON finance_role_assignments(role_code)`,
    `CREATE INDEX IF NOT EXISTS finance_role_idx_user ON finance_role_assignments(user_id)`,
    `CREATE INDEX IF NOT EXISTS finance_role_idx_active ON finance_role_assignments(is_active)`,

    // cost_centers
    `CREATE INDEX IF NOT EXISTS cost_centers_idx_parent ON cost_centers(parent_code)`,
    `CREATE INDEX IF NOT EXISTS cost_centers_idx_bu ON cost_centers(bu_code)`,

    // period_close_checklists
    `CREATE INDEX IF NOT EXISTS period_close_idx_period ON period_close_checklists(period)`,
    `CREATE INDEX IF NOT EXISTS period_close_idx_code ON period_close_checklists(check_code)`,

    // project_activity_timeline
    `CREATE INDEX IF NOT EXISTS project_timeline_idx_project ON project_activity_timeline(project_id)`,
    `CREATE INDEX IF NOT EXISTS project_timeline_idx_type ON project_activity_timeline(activity_type)`,
    `CREATE INDEX IF NOT EXISTS project_timeline_idx_module ON project_activity_timeline(source_module)`,
    `CREATE INDEX IF NOT EXISTS project_timeline_idx_time ON project_activity_timeline(performed_at)`,

    // ──────────── Seed: finance_role_assignments ────────────
    `INSERT INTO finance_role_assignments (role_code, role_name, user_id, user_name, bu_code, is_active)
     SELECT * FROM (VALUES
       ('finance_specialist', '财务专员',    0, '王汝月', NULL, true),
       ('finance_reviewer',   '财务复核',    0, '王秀萍', NULL, true),
       ('finance_approver',   '财务审批',    0, '倪微薇', NULL, true),
       ('cashier',            '出纳',        0, '黄晓兰', NULL, true),
       ('payroll_submitter',  '薪酬提交人',  0, '倪微薇', NULL, true),
       ('payroll_executor',   '薪酬执行人',  0, '黄晓兰', NULL, true)
     ) AS v(role_code, role_name, user_id, user_name, bu_code, is_active)
     WHERE NOT EXISTS (SELECT 1 FROM finance_role_assignments LIMIT 1)`,
  ];

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      const action = stmt.trim().substring(0, 40).replace(/\s+/g, ' ');
      console.log(`  OK  ${action}...`);
    } catch (err) {
      console.error(`  ERR ${err.message}`);
    }
  }

  console.log('\nGL accounting tables created successfully');
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
