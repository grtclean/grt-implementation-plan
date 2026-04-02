-- P2P Lifecycle Migration — 14 enums, 10 tables
-- Idempotent: safe to run multiple times

-- Enums
DO $$ BEGIN CREATE TYPE framework_agreement_status_enum AS ENUM ('draft','active','expired','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rfq_status_enum AS ENUM ('draft','published','bidding','evaluating','awarded','cancelled','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rfq_bidding_type_enum AS ENUM ('sealed','open','reverse','negotiated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rfq_quote_status_enum AS ENUM ('submitted','under_review','shortlisted','awarded','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_registration_status_enum AS ENUM ('pending','received','qc_pending','qc_passed','qc_failed','warehouse_confirmed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_workflow_step_enum AS ENUM ('payment_term_check','quality_feedback_ok','bu_dept_approval','quality_prod_approval','payment_approved','procurement_confirmed','supplier_confirmed','contract_archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_workflow_status_enum AS ENUM ('pending','in_progress','approved','rejected','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE small_value_status_enum AS ENUM ('draft','pending_supervisor','supervisor_approved','procurement_confirmed','completed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_verification_status_enum AS ENUM ('pending','verified','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qualification_type_enum AS ENUM ('initial','annual','special'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qualification_result_enum AS ENUM ('qualified','conditional','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qualification_status_enum AS ENUM ('draft','in_progress','completed','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_loss_agreement_status_enum AS ENUM ('draft','signed','active','expired','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_loss_incident_status_enum AS ENUM ('reported','investigating','confirmed','penalty_applied','deducted','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. framework_agreements
CREATE TABLE IF NOT EXISTS framework_agreements (
  id SERIAL PRIMARY KEY,
  agreement_code VARCHAR(50) NOT NULL,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  title VARCHAR(300),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pricing_items JSONB,
  total_budget DECIMAL(14,2) DEFAULT 0,
  spent_amount DECIMAL(14,2) DEFAULT 0,
  payment_terms VARCHAR(200),
  currency VARCHAR(10) DEFAULT 'CNY',
  notes TEXT,
  bu_code VARCHAR(50),
  status framework_agreement_status_enum DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT fa_uk_agreement_code UNIQUE (agreement_code)
);
CREATE INDEX IF NOT EXISTS fa_supplier_idx ON framework_agreements(supplier_id);
CREATE INDEX IF NOT EXISTS fa_status_idx ON framework_agreements(status);
CREATE INDEX IF NOT EXISTS fa_end_date_idx ON framework_agreements(end_date);
CREATE INDEX IF NOT EXISTS fa_bu_code_idx ON framework_agreements(bu_code);

-- 2. rfq_events
CREATE TABLE IF NOT EXISTS rfq_events (
  id SERIAL PRIMARY KEY,
  rfq_code VARCHAR(50) NOT NULL,
  title VARCHAR(300),
  material_code VARCHAR(100),
  material_name VARCHAR(200),
  quantity DECIMAL(12,4),
  unit VARCHAR(20),
  bidding_type rfq_bidding_type_enum DEFAULT 'sealed',
  deadline TIMESTAMP,
  evaluation_criteria JSONB,
  invited_supplier_ids JSONB,
  selected_quote_id INTEGER,
  generated_po_id INTEGER,
  framework_agreement_id INTEGER,
  notes TEXT,
  bu_code VARCHAR(50),
  status rfq_status_enum DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT rfq_uk_rfq_code UNIQUE (rfq_code)
);
CREATE INDEX IF NOT EXISTS rfq_status_idx ON rfq_events(status);
CREATE INDEX IF NOT EXISTS rfq_material_idx ON rfq_events(material_code);
CREATE INDEX IF NOT EXISTS rfq_deadline_idx ON rfq_events(deadline);
CREATE INDEX IF NOT EXISTS rfq_bu_code_idx ON rfq_events(bu_code);

-- 3. rfq_supplier_quotes
CREATE TABLE IF NOT EXISTS rfq_supplier_quotes (
  id SERIAL PRIMARY KEY,
  rfq_event_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  unit_price DECIMAL(12,4),
  total_price DECIMAL(14,2),
  currency VARCHAR(10) DEFAULT 'CNY',
  delivery_days INTEGER,
  warranty_months INTEGER,
  payment_terms VARCHAR(200),
  technical_notes TEXT,
  attachment_urls JSONB,
  price_score DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  delivery_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  rank INTEGER,
  status rfq_quote_status_enum DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT NOW(),
  evaluated_at TIMESTAMP,
  evaluated_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS rfq_quote_rfq_idx ON rfq_supplier_quotes(rfq_event_id);
CREATE INDEX IF NOT EXISTS rfq_quote_supplier_idx ON rfq_supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS rfq_quote_status_idx ON rfq_supplier_quotes(status);

-- 4. delivery_registrations
CREATE TABLE IF NOT EXISTS delivery_registrations (
  id SERIAL PRIMARY KEY,
  registration_code VARCHAR(50) NOT NULL,
  purchase_order_id INTEGER,
  po_number VARCHAR(50),
  supplier_id INTEGER,
  supplier_name VARCHAR(200),
  material_code VARCHAR(100),
  material_name VARCHAR(200),
  delivered_quantity DECIMAL(12,4),
  unit VARCHAR(20),
  tracking_number VARCHAR(100),
  packing_list JSONB,
  test_report_urls JSONB,
  qc_inspection_id INTEGER,
  warehouse_receipt_id INTEGER,
  received_by_name VARCHAR(100),
  received_at TIMESTAMP,
  notes TEXT,
  bu_code VARCHAR(50),
  status delivery_registration_status_enum DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT dr_uk_registration_code UNIQUE (registration_code)
);
CREATE INDEX IF NOT EXISTS dr_po_idx ON delivery_registrations(purchase_order_id);
CREATE INDEX IF NOT EXISTS dr_supplier_idx ON delivery_registrations(supplier_id);
CREATE INDEX IF NOT EXISTS dr_status_idx ON delivery_registrations(status);
CREATE INDEX IF NOT EXISTS dr_bu_code_idx ON delivery_registrations(bu_code);

-- 5. payment_workflows
CREATE TABLE IF NOT EXISTS payment_workflows (
  id SERIAL PRIMARY KEY,
  workflow_code VARCHAR(50) NOT NULL,
  invoice_id INTEGER,
  invoice_number VARCHAR(50),
  supplier_id INTEGER,
  supplier_name VARCHAR(200),
  payment_amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  current_step payment_workflow_step_enum DEFAULT 'payment_term_check',
  payment_due_date DATE,
  payment_term_expired BOOLEAN DEFAULT FALSE,
  quality_feedback_ok BOOLEAN DEFAULT FALSE,
  quality_feedback_at TIMESTAMP,
  bu_approved_by INTEGER REFERENCES users(id),
  bu_approved_at TIMESTAMP,
  quality_approved_by INTEGER REFERENCES users(id),
  quality_approved_at TIMESTAMP,
  payment_approved_by INTEGER REFERENCES users(id),
  payment_approved_at TIMESTAMP,
  procurement_confirmed_by INTEGER REFERENCES users(id),
  procurement_confirmed_at TIMESTAMP,
  supplier_confirm_token VARCHAR(100),
  supplier_confirmed_at TIMESTAMP,
  contract_archived BOOLEAN DEFAULT FALSE,
  contract_archived_at TIMESTAMP,
  quality_deduction_amount DECIMAL(12,2) DEFAULT 0,
  net_payment_amount DECIMAL(14,2),
  notes TEXT,
  bu_code VARCHAR(50),
  status payment_workflow_status_enum DEFAULT 'pending',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT pw_uk_workflow_code UNIQUE (workflow_code)
);
CREATE INDEX IF NOT EXISTS pw_invoice_idx ON payment_workflows(invoice_id);
CREATE INDEX IF NOT EXISTS pw_supplier_idx ON payment_workflows(supplier_id);
CREATE INDEX IF NOT EXISTS pw_status_idx ON payment_workflows(status);
CREATE INDEX IF NOT EXISTS pw_step_idx ON payment_workflows(current_step);
CREATE INDEX IF NOT EXISTS pw_due_date_idx ON payment_workflows(payment_due_date);
CREATE INDEX IF NOT EXISTS pw_bu_code_idx ON payment_workflows(bu_code);

-- 6. small_value_procurements
CREATE TABLE IF NOT EXISTS small_value_procurements (
  id SERIAL PRIMARY KEY,
  request_code VARCHAR(50) NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  material_code VARCHAR(100),
  specification VARCHAR(200),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(20) DEFAULT '件',
  estimated_unit_price DECIMAL(10,2) NOT NULL,
  estimated_total_amount DECIMAL(12,2),
  purpose TEXT,
  requested_by INTEGER REFERENCES users(id),
  requested_by_name VARCHAR(100),
  supervisor_id INTEGER REFERENCES users(id),
  supervisor_name VARCHAR(100),
  supervisor_approved_at TIMESTAMP,
  supervisor_rejection_reason TEXT,
  procurement_officer_id INTEGER REFERENCES users(id),
  procurement_officer_name VARCHAR(100),
  procurement_confirmed_at TIMESTAMP,
  assigned_supplier_id INTEGER,
  assigned_supplier_name VARCHAR(200),
  annual_contract_id INTEGER,
  actual_unit_price DECIMAL(10,2),
  notes TEXT,
  bu_code VARCHAR(50),
  status small_value_status_enum DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT svp_uk_request_code UNIQUE (request_code)
);
CREATE INDEX IF NOT EXISTS svp_status_idx ON small_value_procurements(status);
CREATE INDEX IF NOT EXISTS svp_requested_by_idx ON small_value_procurements(requested_by);
CREATE INDEX IF NOT EXISTS svp_bu_code_idx ON small_value_procurements(bu_code);

-- 7. supplier_report_submissions
CREATE TABLE IF NOT EXISTS supplier_report_submissions (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  document_type VARCHAR(50) NOT NULL,
  document_title VARCHAR(300),
  file_url TEXT,
  file_size INTEGER,
  related_po_number VARCHAR(50),
  related_material_code VARCHAR(100),
  expiry_date DATE,
  verification_status report_verification_status_enum DEFAULT 'pending',
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS srs_supplier_idx ON supplier_report_submissions(supplier_id);
CREATE INDEX IF NOT EXISTS srs_doc_type_idx ON supplier_report_submissions(document_type);
CREATE INDEX IF NOT EXISTS srs_verification_idx ON supplier_report_submissions(verification_status);

-- 8. supplier_qualifications
CREATE TABLE IF NOT EXISTS supplier_qualifications (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  qualification_type qualification_type_enum DEFAULT 'initial',
  audit_date DATE,
  auditor_name VARCHAR(100),
  auditor_id INTEGER REFERENCES users(id),
  iso_system_certifications JSONB,
  special_requirements JSONB,
  quality_system_score DECIMAL(5,2),
  process_capability_score DECIMAL(5,2),
  delivery_capability_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  overall_result qualification_result_enum,
  valid_until DATE,
  next_audit_date DATE,
  attachment_urls JSONB,
  notes TEXT,
  status qualification_status_enum DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS sq_supplier_idx ON supplier_qualifications(supplier_id);
CREATE INDEX IF NOT EXISTS sq_type_idx ON supplier_qualifications(qualification_type);
CREATE INDEX IF NOT EXISTS sq_result_idx ON supplier_qualifications(overall_result);
CREATE INDEX IF NOT EXISTS sq_valid_until_idx ON supplier_qualifications(valid_until);
CREATE INDEX IF NOT EXISTS sq_status_idx ON supplier_qualifications(status);

-- 9. quality_loss_agreements
CREATE TABLE IF NOT EXISTS quality_loss_agreements (
  id SERIAL PRIMARY KEY,
  agreement_code VARCHAR(50) NOT NULL,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  framework_agreement_id INTEGER,
  quality_loss_threshold DECIMAL(14,2),
  quality_loss_rate_threshold DECIMAL(5,4),
  penalty_formula TEXT,
  max_penalty_amount DECIMAL(14,2),
  effective_date DATE,
  expiry_date DATE,
  signed_by VARCHAR(100),
  signed_at TIMESTAMP,
  witnessed_by VARCHAR(100),
  notes TEXT,
  status quality_loss_agreement_status_enum DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT qla_uk_agreement_code UNIQUE (agreement_code)
);
CREATE INDEX IF NOT EXISTS qla_supplier_idx ON quality_loss_agreements(supplier_id);
CREATE INDEX IF NOT EXISTS qla_status_idx ON quality_loss_agreements(status);
CREATE INDEX IF NOT EXISTS qla_expiry_idx ON quality_loss_agreements(expiry_date);

-- 10. quality_loss_incidents
CREATE TABLE IF NOT EXISTS quality_loss_incidents (
  id SERIAL PRIMARY KEY,
  incident_code VARCHAR(50) NOT NULL,
  quality_loss_agreement_id INTEGER,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(200),
  purchase_order_id INTEGER,
  po_number VARCHAR(50),
  material_code VARCHAR(100),
  material_name VARCHAR(200),
  loss_amount DECIMAL(14,2) NOT NULL,
  loss_description TEXT,
  root_cause TEXT,
  evidence_urls JSONB,
  penalty_triggered BOOLEAN DEFAULT FALSE,
  penalty_amount DECIMAL(14,2) DEFAULT 0,
  supplier_acknowledged BOOLEAN DEFAULT FALSE,
  supplier_acknowledged_at TIMESTAMP,
  deduction_from_payment_id INTEGER,
  notes TEXT,
  status quality_loss_incident_status_enum DEFAULT 'reported',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT qli_uk_incident_code UNIQUE (incident_code)
);
CREATE INDEX IF NOT EXISTS qli_agreement_idx ON quality_loss_incidents(quality_loss_agreement_id);
CREATE INDEX IF NOT EXISTS qli_supplier_idx ON quality_loss_incidents(supplier_id);
CREATE INDEX IF NOT EXISTS qli_status_idx ON quality_loss_incidents(status);
CREATE INDEX IF NOT EXISTS qli_penalty_idx ON quality_loss_incidents(penalty_triggered);
