/**
 * Create missing supply-chain tables + ERP migration tracking
 * Usage: node scripts/create-migration-tables.cjs
 */
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  const tables = [
    // ERP Migration Batches tracking table
    `CREATE TABLE IF NOT EXISTS erp_migration_batches (
      id SERIAL PRIMARY KEY,
      batch_id VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      source_system VARCHAR(50) DEFAULT 'tiansi_erp',
      status VARCHAR(50) DEFAULT 'pending',
      total_records INTEGER DEFAULT 0,
      success_records INTEGER DEFAULT 0,
      failed_records INTEGER DEFAULT 0,
      skipped_records INTEGER DEFAULT 0,
      error_log TEXT,
      conflict_strategy VARCHAR(50) DEFAULT 'update',
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Sensitive field policies
    `CREATE TABLE IF NOT EXISTS sensitive_field_policies (
      id SERIAL PRIMARY KEY,
      table_name VARCHAR(100) NOT NULL,
      field_name VARCHAR(100) NOT NULL,
      sensitivity_level INTEGER NOT NULL DEFAULT 2,
      required_level INTEGER NOT NULL DEFAULT 2,
      watermark_on_view BOOLEAN DEFAULT false,
      require_approval_for_export BOOLEAN DEFAULT true,
      masking_rule VARCHAR(50) DEFAULT 'stars',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Data export requests
    `CREATE TABLE IF NOT EXISTS data_export_requests (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER NOT NULL,
      requester_name VARCHAR(100) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      field_names TEXT NOT NULL,
      filter_conditions TEXT,
      purpose TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      approved_by INTEGER,
      approved_at TIMESTAMP,
      rejected_reason TEXT,
      download_token VARCHAR(100),
      download_count INTEGER DEFAULT 0,
      max_downloads INTEGER DEFAULT 1,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS erp_migration_batches_idx_batch ON erp_migration_batches(batch_id)`,
    `CREATE INDEX IF NOT EXISTS erp_migration_batches_idx_entity ON erp_migration_batches(entity_type)`,
    `CREATE INDEX IF NOT EXISTS erp_migration_batches_idx_status ON erp_migration_batches(status)`,
    `CREATE INDEX IF NOT EXISTS sensitive_field_policies_idx_table ON sensitive_field_policies(table_name)`,
    `CREATE INDEX IF NOT EXISTS data_export_requests_idx_status ON data_export_requests(status)`,
    `CREATE INDEX IF NOT EXISTS data_export_requests_idx_token ON data_export_requests(download_token)`,

    // Seed default sensitive field policies
    `INSERT INTO sensitive_field_policies (table_name, field_name, sensitivity_level, required_level, watermark_on_view, masking_rule, description)
     SELECT * FROM (VALUES
       ('materials', 'standardCost', 3, 4, true, 'stars', '物料标准成本 — 仅BU经理以上可见'),
       ('materials', 'lastPurchasePrice', 3, 4, true, 'stars', '最近采购价 — 仅BU经理以上可见'),
       ('supplier_materials', 'unitPrice', 3, 4, true, 'stars', '供应商单价 — 仅BU经理以上可见'),
       ('purchase_orders', 'unitPrice', 2, 3, false, 'stars', '采购单价 — 仅采购主管以上可见'),
       ('purchase_orders', 'totalAmount', 2, 3, false, 'stars', '采购总金额 — 仅采购主管以上可见'),
       ('suppliers', 'contactPhone', 2, 3, false, 'partial', '供应商联系电话 — 仅采购主管以上可见'),
       ('suppliers', 'contactEmail', 2, 3, false, 'partial', '供应商联系邮箱 — 仅采购主管以上可见'),
       ('supplier_penalties', 'fineAmount', 3, 5, true, 'stars', '罚款金额 — 仅总监以上可见'),
       ('purchase_invoices', 'invoiceAmount', 2, 3, false, 'stars', '发票金额 — 仅采购主管以上可见'),
       ('purchase_invoices', 'totalAmount', 2, 3, false, 'stars', '发票总额 — 仅采购主管以上可见')
     ) AS v(table_name, field_name, sensitivity_level, required_level, watermark_on_view, masking_rule, description)
     WHERE NOT EXISTS (SELECT 1 FROM sensitive_field_policies LIMIT 1)`
  ];

  for (const sql of tables) {
    try {
      await client.query(sql);
      const action = sql.trim().substring(0, 30);
      console.log(`  ✓ ${action}...`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  console.log('\nMigration tables created successfully');
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
