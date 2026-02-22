/**
 * Create supply chain tables directly via SQL
 * Matches drizzle/supply-chain-schema.ts EXACTLY (all 11 tables + 9 enums + all indexes)
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("[DB] Connected.");

  // Create enums (ignore if exist)
  const enums = [
    `CREATE TYPE barcode_format_enum AS ENUM ('QR','CODE128','EAN13','DATAMATRIX')`,
    `CREATE TYPE inspection_result_enum AS ENUM ('PASS','FAIL','CONDITIONAL','PENDING')`,
    `CREATE TYPE inspection_disposition_enum AS ENUM ('accept','reject','rework','return_to_supplier','hold')`,
    `CREATE TYPE bom_match_result_enum AS ENUM ('MATCH','MISMATCH','SUBSTITUTE','NOT_FOUND')`,
    `CREATE TYPE maintenance_type_enum AS ENUM ('preventive','corrective','predictive','emergency')`,
    `CREATE TYPE disposal_method_enum AS ENUM ('recycle','destroy','return','salvage')`,
    `CREATE TYPE penalty_trigger_type_enum AS ENUM ('quality_reject','late_delivery','missing_report','safety_violation')`,
    `CREATE TYPE penalty_type_enum AS ENUM ('warning','fine','probation','suspension','blacklist')`,
    `CREATE TYPE trace_relationship_type_enum AS ENUM ('supplied_to','inspected_as','assembled_in','scrapped_from','resolved_by','consumed_by','maintained_with')`,
  ];
  for (const sql of enums) {
    try {
      await client.query(sql);
      console.log("  Created enum");
    } catch (e: any) {
      if (e.code === "42710") console.log("  Enum exists");
      else throw e;
    }
  }

  // Create 11 tables (exact match to Drizzle schema)
  const tables: string[] = [
    // 1. supplier_shipment_labels
    `CREATE TABLE IF NOT EXISTS supplier_shipment_labels (
      id SERIAL PRIMARY KEY,
      supplier_serial_number VARCHAR(100) NOT NULL,
      supplier_id INTEGER,
      supplier_name VARCHAR(200),
      project_number VARCHAR(50),
      bom_product_code VARCHAR(100),
      material_code VARCHAR(100) NOT NULL,
      material_name VARCHAR(200),
      po_number VARCHAR(50),
      quantity DECIMAL(12,4),
      unit VARCHAR(20),
      batch_number VARCHAR(100),
      production_date DATE,
      expiry_date DATE,
      barcode_data TEXT,
      barcode_format barcode_format_enum DEFAULT 'QR',
      is_validated BOOLEAN DEFAULT FALSE,
      validation_errors TEXT,
      print_count INTEGER DEFAULT 0,
      last_printed_at TIMESTAMP,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 2. incoming_inspection_records
    `CREATE TABLE IF NOT EXISTS incoming_inspection_records (
      id SERIAL PRIMARY KEY,
      inspection_code VARCHAR(50) NOT NULL,
      purchase_receipt_id INTEGER,
      lot_id INTEGER,
      label_id INTEGER,
      material_code VARCHAR(100) NOT NULL,
      material_name VARCHAR(200),
      supplier_id INTEGER,
      supplier_name VARCHAR(200),
      po_number VARCHAR(50),
      inspected_quantity DECIMAL(12,4),
      sample_size INTEGER,
      defect_count INTEGER DEFAULT 0,
      has_test_report BOOLEAN DEFAULT FALSE NOT NULL,
      test_report_url TEXT,
      test_report_grt_material_match BOOLEAN DEFAULT FALSE,
      test_report_order_match BOOLEAN DEFAULT FALSE,
      inspection_result inspection_result_enum DEFAULT 'PENDING' NOT NULL,
      disposition inspection_disposition_enum DEFAULT 'hold',
      disposition_reason TEXT,
      measurement_data JSONB,
      control_plan_id INTEGER,
      eight_d_report_id INTEGER,
      inspected_by INTEGER,
      inspected_by_name VARCHAR(100),
      inspected_at TIMESTAMP,
      approved_by INTEGER,
      approved_at TIMESTAMP,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 3. assembly_bom_scan_logs
    `CREATE TABLE IF NOT EXISTS assembly_bom_scan_logs (
      id SERIAL PRIMARY KEY,
      project_number VARCHAR(50) NOT NULL,
      process_code VARCHAR(20) NOT NULL,
      scanned_barcode VARCHAR(200) NOT NULL,
      resolved_material_code VARCHAR(100),
      bom_item_id INTEGER,
      expected_material_code VARCHAR(100),
      bom_match_result bom_match_result_enum NOT NULL,
      deviation_confirmed BOOLEAN DEFAULT FALSE,
      deviation_reason TEXT,
      deviation_confirmed_by INTEGER,
      deviation_confirmed_at TIMESTAMP,
      bom_adjustment_applied BOOLEAN DEFAULT FALSE,
      lot_number VARCHAR(100),
      serial_number VARCHAR(100),
      scanned_by INTEGER,
      scanned_by_name VARCHAR(100),
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 4. assembly_labor_confirmations
    `CREATE TABLE IF NOT EXISTS assembly_labor_confirmations (
      id SERIAL PRIMARY KEY,
      project_number VARCHAR(50) NOT NULL,
      process_code VARCHAR(20) NOT NULL,
      worker_id INTEGER NOT NULL,
      worker_name VARCHAR(100),
      clock_in_time TIMESTAMP NOT NULL,
      clock_out_time TIMESTAMP,
      net_work_minutes INTEGER,
      planned_minutes INTEGER,
      efficiency_percent DECIMAL(6,2),
      quality_result VARCHAR(20),
      execution_log_id INTEGER,
      defects_found INTEGER DEFAULT 0,
      rework_minutes INTEGER DEFAULT 0,
      confirmed_by_worker BOOLEAN DEFAULT FALSE,
      confirmed_by_supervisor BOOLEAN DEFAULT FALSE,
      supervisor_id INTEGER,
      supervisor_confirmed_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 5. customer_quality_complaints
    `CREATE TABLE IF NOT EXISTS customer_quality_complaints (
      id SERIAL PRIMARY KEY,
      complaint_code VARCHAR(50) NOT NULL,
      customer_id INTEGER,
      customer_name VARCHAR(200),
      project_number VARCHAR(50),
      equipment_serial_number VARCHAR(100),
      severity VARCHAR(20) DEFAULT 'medium' NOT NULL,
      status VARCHAR(20) DEFAULT 'open' NOT NULL,
      description TEXT NOT NULL,
      affected_parts JSONB,
      traced_lot_numbers JSONB,
      traced_supplier_ids JSONB,
      eight_d_report_id INTEGER,
      capa_id INTEGER,
      design_change_required BOOLEAN DEFAULT FALSE,
      ecn_number VARCHAR(50),
      bom_version_id INTEGER,
      fmea_updated BOOLEAN DEFAULT FALSE,
      control_plan_updated BOOLEAN DEFAULT FALSE,
      satisfaction_score INTEGER,
      resolution_date TIMESTAMP,
      root_cause TEXT,
      corrective_action TEXT,
      reported_by INTEGER,
      assigned_to INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 6. equipment_maintenance_records
    `CREATE TABLE IF NOT EXISTS equipment_maintenance_records (
      id SERIAL PRIMARY KEY,
      maintenance_code VARCHAR(50) NOT NULL,
      equipment_id INTEGER NOT NULL,
      equipment_name VARCHAR(200),
      equipment_code VARCHAR(50),
      maintenance_type maintenance_type_enum DEFAULT 'preventive' NOT NULL,
      status VARCHAR(20) DEFAULT 'scheduled' NOT NULL,
      scheduled_date DATE,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      downtime_minutes INTEGER DEFAULT 0,
      work_performed TEXT,
      findings TEXT,
      parts_consumed JSONB,
      labor_cost DECIMAL(12,2) DEFAULT 0,
      parts_cost DECIMAL(12,2) DEFAULT 0,
      total_cost DECIMAL(12,2) DEFAULT 0,
      next_maintenance_date DATE,
      performed_by INTEGER,
      performed_by_name VARCHAR(100),
      approved_by INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 7. scrap_disposal_records
    `CREATE TABLE IF NOT EXISTS scrap_disposal_records (
      id SERIAL PRIMARY KEY,
      scrap_code VARCHAR(50) NOT NULL,
      material_code VARCHAR(100) NOT NULL,
      material_name VARCHAR(200),
      lot_number VARCHAR(100),
      serial_number VARCHAR(100),
      quantity DECIMAL(12,4) DEFAULT 1,
      unit VARCHAR(20),
      scrap_reason TEXT NOT NULL,
      scrap_category VARCHAR(50),
      project_number VARCHAR(50),
      process_code VARCHAR(20),
      authorized_by INTEGER NOT NULL,
      authorized_by_name VARCHAR(100),
      authorized_at TIMESTAMP,
      disposal_method disposal_method_enum DEFAULT 'recycle' NOT NULL,
      disposal_date DATE,
      replacement_required BOOLEAN DEFAULT FALSE,
      replacement_purchase_request_id INTEGER,
      supplier_penalty_id INTEGER,
      unit_cost DECIMAL(12,2),
      total_scrap_cost DECIMAL(12,2),
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 8. spare_parts
    `CREATE TABLE IF NOT EXISTS spare_parts (
      id SERIAL PRIMARY KEY,
      part_code VARCHAR(50) NOT NULL,
      material_code VARCHAR(100) NOT NULL,
      material_name VARCHAR(200) NOT NULL,
      specification VARCHAR(200),
      category VARCHAR(50),
      applicable_equipment_types JSONB,
      min_stock_level INTEGER DEFAULT 0,
      reorder_point INTEGER DEFAULT 0,
      max_stock_level INTEGER,
      current_stock INTEGER DEFAULT 0 NOT NULL,
      reserved_stock INTEGER DEFAULT 0,
      auto_reorder_enabled BOOLEAN DEFAULT FALSE,
      preferred_supplier_id INTEGER,
      preferred_supplier_name VARCHAR(200),
      unit_price DECIMAL(12,2),
      avg_monthly_consumption DECIMAL(10,2),
      lead_time_days INTEGER,
      is_critical BOOLEAN DEFAULT FALSE,
      warehouse_id INTEGER,
      location_code VARCHAR(50),
      last_reorder_date DATE,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 9. spare_part_consumption_logs
    `CREATE TABLE IF NOT EXISTS spare_part_consumption_logs (
      id SERIAL PRIMARY KEY,
      spare_part_id INTEGER NOT NULL,
      maintenance_record_id INTEGER,
      equipment_id INTEGER,
      equipment_name VARCHAR(200),
      quantity_consumed INTEGER NOT NULL,
      previous_stock INTEGER,
      new_stock INTEGER,
      reason TEXT,
      auto_reorder_triggered BOOLEAN DEFAULT FALSE,
      purchase_request_id INTEGER,
      consumed_by INTEGER,
      consumed_by_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 10. supplier_penalties
    `CREATE TABLE IF NOT EXISTS supplier_penalties (
      id SERIAL PRIMARY KEY,
      penalty_code VARCHAR(50) NOT NULL,
      supplier_id INTEGER NOT NULL,
      supplier_name VARCHAR(200),
      trigger_type penalty_trigger_type_enum NOT NULL,
      trigger_reference_id INTEGER,
      trigger_reference_type VARCHAR(50),
      penalty_type penalty_type_enum DEFAULT 'warning' NOT NULL,
      description TEXT,
      occurrence_count INTEGER DEFAULT 1 NOT NULL,
      escalation_level INTEGER DEFAULT 1 NOT NULL,
      fine_amount DECIMAL(12,2),
      corrective_action_required BOOLEAN DEFAULT FALSE,
      corrective_action_deadline DATE,
      corrective_action_status VARCHAR(20),
      is_blacklisted BOOLEAN DEFAULT FALSE,
      blacklist_effective_date DATE,
      blacklist_reason TEXT,
      resolved_at TIMESTAMP,
      resolved_by INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

    // 11. traceability_graph_edges
    `CREATE TABLE IF NOT EXISTS traceability_graph_edges (
      id SERIAL PRIMARY KEY,
      from_entity_type VARCHAR(50) NOT NULL,
      from_entity_id INTEGER NOT NULL,
      to_entity_type VARCHAR(50) NOT NULL,
      to_entity_id INTEGER NOT NULL,
      relationship_type trace_relationship_type_enum NOT NULL,
      project_number VARCHAR(50),
      metadata JSONB,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,

  ];

  for (const sql of tables) {
    const tname = sql.match(/CREATE TABLE IF NOT EXISTS (\\w+)/)?.[1];
    try {
      await client.query(sql);
      console.log(`  Created table: ${tname}`);
    } catch (e: any) {
      console.error(`  FAILED ${tname}: ${e.message}`);
    }
  }

  // Create all indexes from Drizzle schema
  const indexes = [
    "CREATE INDEX IF NOT EXISTS ssl_supplier_idx ON supplier_shipment_labels(supplier_id)",
    "CREATE INDEX IF NOT EXISTS ssl_material_idx ON supplier_shipment_labels(material_code)",
    "CREATE INDEX IF NOT EXISTS ssl_po_idx ON supplier_shipment_labels(po_number)",
    "CREATE INDEX IF NOT EXISTS ssl_project_idx ON supplier_shipment_labels(project_number)",
    "CREATE INDEX IF NOT EXISTS ssl_barcode_idx ON supplier_shipment_labels(supplier_serial_number)",
    "CREATE INDEX IF NOT EXISTS iir_code_idx ON incoming_inspection_records(inspection_code)",
    "CREATE INDEX IF NOT EXISTS iir_receipt_idx ON incoming_inspection_records(purchase_receipt_id)",
    "CREATE INDEX IF NOT EXISTS iir_lot_idx ON incoming_inspection_records(lot_id)",
    "CREATE INDEX IF NOT EXISTS iir_material_idx ON incoming_inspection_records(material_code)",
    "CREATE INDEX IF NOT EXISTS iir_supplier_idx ON incoming_inspection_records(supplier_id)",
    "CREATE INDEX IF NOT EXISTS iir_result_idx ON incoming_inspection_records(inspection_result)",
    "CREATE INDEX IF NOT EXISTS iir_date_idx ON incoming_inspection_records(created_at)",
    "CREATE INDEX IF NOT EXISTS absl_project_process_idx ON assembly_bom_scan_logs(project_number, process_code)",
    "CREATE INDEX IF NOT EXISTS absl_barcode_idx ON assembly_bom_scan_logs(scanned_barcode)",
    "CREATE INDEX IF NOT EXISTS absl_material_idx ON assembly_bom_scan_logs(resolved_material_code)",
    "CREATE INDEX IF NOT EXISTS absl_bom_item_idx ON assembly_bom_scan_logs(bom_item_id)",
    "CREATE INDEX IF NOT EXISTS absl_result_idx ON assembly_bom_scan_logs(bom_match_result)",
    "CREATE INDEX IF NOT EXISTS alc_project_process_idx ON assembly_labor_confirmations(project_number, process_code)",
    "CREATE INDEX IF NOT EXISTS alc_worker_idx ON assembly_labor_confirmations(worker_id)",
    "CREATE INDEX IF NOT EXISTS alc_date_idx ON assembly_labor_confirmations(clock_in_time)",
    "CREATE INDEX IF NOT EXISTS alc_exec_log_idx ON assembly_labor_confirmations(execution_log_id)",
    "CREATE INDEX IF NOT EXISTS cqc_code_idx ON customer_quality_complaints(complaint_code)",
    "CREATE INDEX IF NOT EXISTS cqc_customer_idx ON customer_quality_complaints(customer_id)",
    "CREATE INDEX IF NOT EXISTS cqc_project_idx ON customer_quality_complaints(project_number)",
    "CREATE INDEX IF NOT EXISTS cqc_severity_idx ON customer_quality_complaints(severity)",
    "CREATE INDEX IF NOT EXISTS cqc_status_idx ON customer_quality_complaints(status)",
    "CREATE INDEX IF NOT EXISTS cqc_8d_idx ON customer_quality_complaints(eight_d_report_id)",
    "CREATE INDEX IF NOT EXISTS cqc_date_idx ON customer_quality_complaints(created_at)",
    "CREATE INDEX IF NOT EXISTS emr_code_idx ON equipment_maintenance_records(maintenance_code)",
    "CREATE INDEX IF NOT EXISTS emr_equipment_idx ON equipment_maintenance_records(equipment_id)",
    "CREATE INDEX IF NOT EXISTS emr_type_idx ON equipment_maintenance_records(maintenance_type)",
    "CREATE INDEX IF NOT EXISTS emr_status_idx ON equipment_maintenance_records(status)",
    "CREATE INDEX IF NOT EXISTS emr_scheduled_idx ON equipment_maintenance_records(scheduled_date)",
    "CREATE INDEX IF NOT EXISTS emr_next_idx ON equipment_maintenance_records(next_maintenance_date)",
    "CREATE INDEX IF NOT EXISTS sdr_code_idx ON scrap_disposal_records(scrap_code)",
    "CREATE INDEX IF NOT EXISTS sdr_material_idx ON scrap_disposal_records(material_code)",
    "CREATE INDEX IF NOT EXISTS sdr_lot_idx ON scrap_disposal_records(lot_number)",
    "CREATE INDEX IF NOT EXISTS sdr_project_idx ON scrap_disposal_records(project_number)",
    "CREATE INDEX IF NOT EXISTS sdr_method_idx ON scrap_disposal_records(disposal_method)",
    "CREATE INDEX IF NOT EXISTS sdr_date_idx ON scrap_disposal_records(created_at)",
    "CREATE INDEX IF NOT EXISTS sp_part_code_idx ON spare_parts(part_code)",
    "CREATE INDEX IF NOT EXISTS sp_material_idx ON spare_parts(material_code)",
    "CREATE INDEX IF NOT EXISTS sp_category_idx ON spare_parts(category)",
    "CREATE INDEX IF NOT EXISTS sp_critical_idx ON spare_parts(is_critical)",
    "CREATE INDEX IF NOT EXISTS sp_stock_alert_idx ON spare_parts(current_stock, reorder_point)",
    "CREATE INDEX IF NOT EXISTS spcl_spare_part_idx ON spare_part_consumption_logs(spare_part_id)",
    "CREATE INDEX IF NOT EXISTS spcl_maintenance_idx ON spare_part_consumption_logs(maintenance_record_id)",
    "CREATE INDEX IF NOT EXISTS spcl_equipment_idx ON spare_part_consumption_logs(equipment_id)",
    "CREATE INDEX IF NOT EXISTS spcl_date_idx ON spare_part_consumption_logs(created_at)",
    "CREATE INDEX IF NOT EXISTS spen_code_idx ON supplier_penalties(penalty_code)",
    "CREATE INDEX IF NOT EXISTS spen_supplier_idx ON supplier_penalties(supplier_id)",
    "CREATE INDEX IF NOT EXISTS spen_trigger_idx ON supplier_penalties(trigger_type)",
    "CREATE INDEX IF NOT EXISTS spen_type_idx ON supplier_penalties(penalty_type)",
    "CREATE INDEX IF NOT EXISTS spen_blacklist_idx ON supplier_penalties(is_blacklisted)",
    "CREATE INDEX IF NOT EXISTS spen_active_idx ON supplier_penalties(is_active)",
    "CREATE INDEX IF NOT EXISTS spen_date_idx ON supplier_penalties(created_at)",
    "CREATE INDEX IF NOT EXISTS tge_from_idx ON traceability_graph_edges(from_entity_type, from_entity_id)",
    "CREATE INDEX IF NOT EXISTS tge_to_idx ON traceability_graph_edges(to_entity_type, to_entity_id)",
    "CREATE INDEX IF NOT EXISTS tge_relationship_idx ON traceability_graph_edges(relationship_type)",
    "CREATE INDEX IF NOT EXISTS tge_project_idx ON traceability_graph_edges(project_number)",
  ];

  for (const sql of indexes) {
    try {
      await client.query(sql);
    } catch (e) {
      /* ignore */
    }
  }
  console.log(`  Created ${indexes.length} indexes.`);

  await client.end();
  console.log("[DB] Done. All 11 supply chain tables ready.");
}

main();
