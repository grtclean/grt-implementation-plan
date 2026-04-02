-- PDM — Product Data Management
-- 7 tables for full lifecycle product data management

-- ────────── Enums ──────────

DO $$ BEGIN
  CREATE TYPE pdm_product_family AS ENUM ('USC','SPR','IMM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_lifecycle_status AS ENUM ('concept','design','released','production','service','eol');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_baseline_status AS ENUM ('draft','approved','superseded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_eco_step_type AS ENUM ('ecr_submit','impact_analysis','review','approval','execute','verify','close');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_eco_step_status AS ENUM ('pending','in_progress','completed','skipped','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_requirement_category AS ENUM ('functional','performance','safety','cleanliness','regulatory');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_verification_status AS ENUM ('not_started','in_progress','passed','failed','waived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_readiness_check_type AS ENUM ('bom_approved','plm_released','plc_promoted','eplan_exported','standards_validated','fmea_completed','conflict_free');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_readiness_status AS ENUM ('not_checked','passed','failed','waived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_deviation_type AS ENUM ('material_substitution','process_change','quantity_change');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_deviation_severity AS ENUM ('minor','major','critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_insight_type AS ENUM ('recurring_failure','design_weakness','improvement_opportunity');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pdm_insight_status AS ENUM ('open','investigating','eco_created','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────── 1. pdm_products ──────────

CREATE TABLE IF NOT EXISTS pdm_products (
  id SERIAL PRIMARY KEY,
  product_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  product_family pdm_product_family NOT NULL,
  product_category VARCHAR(100),
  description TEXT,
  station_count INTEGER DEFAULT 0,
  lifecycle_status pdm_lifecycle_status NOT NULL DEFAULT 'concept',
  default_project_id INTEGER REFERENCES projects(id),
  latest_baseline_id INTEGER,
  bu_code VARCHAR(50),
  maturity_level INTEGER DEFAULT 0,
  total_projects_built INTEGER DEFAULT 0,
  standards JSONB,
  customer_segments JSONB,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_products_family ON pdm_products(product_family);
CREATE INDEX IF NOT EXISTS idx_pdm_products_lifecycle ON pdm_products(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_pdm_products_bu ON pdm_products(bu_code);

-- ────────── 2. pdm_baselines ──────────

CREATE TABLE IF NOT EXISTS pdm_baselines (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES pdm_products(id),
  project_id INTEGER REFERENCES projects(id),
  gate_stage VARCHAR(20) NOT NULL,
  baseline_name VARCHAR(200) NOT NULL,
  bom_master_id INTEGER,
  bom_version VARCHAR(20),
  plm_document_ids JSONB,
  plc_project_id INTEGER,
  plc_version_tag VARCHAR(50),
  station_snapshot JSONB,
  status pdm_baseline_status NOT NULL DEFAULT 'draft',
  previous_baseline_id INTEGER,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_baselines_product ON pdm_baselines(product_id);
CREATE INDEX IF NOT EXISTS idx_pdm_baselines_project ON pdm_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_pdm_baselines_gate ON pdm_baselines(gate_stage);
CREATE INDEX IF NOT EXISTS idx_pdm_baselines_status ON pdm_baselines(status);

-- Self-reference for latest_baseline_id
ALTER TABLE pdm_products
  ADD CONSTRAINT fk_pdm_products_latest_baseline
  FOREIGN KEY (latest_baseline_id) REFERENCES pdm_baselines(id)
  ON DELETE SET NULL;

-- ────────── 3. pdm_eco_workflow ──────────

CREATE TABLE IF NOT EXISTS pdm_eco_workflow (
  id SERIAL PRIMARY KEY,
  eco_id INTEGER NOT NULL,
  step_type pdm_eco_step_type NOT NULL,
  step_order INTEGER NOT NULL,
  status pdm_eco_step_status NOT NULL DEFAULT 'pending',
  assignee_id INTEGER REFERENCES users(id),
  assignee_name VARCHAR(128),
  impacted_bom_ids JSONB,
  impacted_doc_ids JSONB,
  impacted_station_ids JSONB,
  cost_impact JSONB,
  production_impact JSONB,
  field_retrofit_needed BOOLEAN DEFAULT FALSE,
  decision VARCHAR(50),
  decision_notes TEXT,
  completed_at TIMESTAMP,
  completed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_eco_workflow_eco ON pdm_eco_workflow(eco_id);
CREATE INDEX IF NOT EXISTS idx_pdm_eco_workflow_step ON pdm_eco_workflow(step_type);
CREATE INDEX IF NOT EXISTS idx_pdm_eco_workflow_status ON pdm_eco_workflow(status);
CREATE INDEX IF NOT EXISTS idx_pdm_eco_workflow_assignee ON pdm_eco_workflow(assignee_id);

-- ────────── 4. pdm_requirements ──────────

CREATE TABLE IF NOT EXISTS pdm_requirements (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  product_id INTEGER REFERENCES pdm_products(id),
  requirement_code VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category pdm_requirement_category NOT NULL,
  source_type VARCHAR(50),
  source_reference VARCHAR(200),
  priority VARCHAR(20) DEFAULT 'medium',
  design_station_ids JSONB,
  bom_item_ids JSONB,
  verification_method VARCHAR(50),
  verification_item_ids JSONB,
  verification_status pdm_verification_status NOT NULL DEFAULT 'not_started',
  verification_notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_requirements_project ON pdm_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_pdm_requirements_product ON pdm_requirements(product_id);
CREATE INDEX IF NOT EXISTS idx_pdm_requirements_category ON pdm_requirements(category);
CREATE INDEX IF NOT EXISTS idx_pdm_requirements_verification ON pdm_requirements(verification_status);

-- ────────── 5. pdm_readiness_checks ──────────

CREATE TABLE IF NOT EXISTS pdm_readiness_checks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  product_id INTEGER REFERENCES pdm_products(id),
  check_type pdm_readiness_check_type NOT NULL,
  status pdm_readiness_status NOT NULL DEFAULT 'not_checked',
  auto_validated BOOLEAN DEFAULT FALSE,
  validation_details TEXT,
  waiver_approved_by INTEGER REFERENCES users(id),
  waiver_reason TEXT,
  waived_at TIMESTAMP,
  checked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_readiness_project ON pdm_readiness_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_pdm_readiness_type ON pdm_readiness_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_pdm_readiness_status ON pdm_readiness_checks(status);

-- ────────── 6. pdm_as_built_deviations ──────────

CREATE TABLE IF NOT EXISTS pdm_as_built_deviations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  product_id INTEGER REFERENCES pdm_products(id),
  baseline_id INTEGER REFERENCES pdm_baselines(id),
  station_code VARCHAR(20),
  deviation_type pdm_deviation_type NOT NULL,
  severity pdm_deviation_severity NOT NULL DEFAULT 'minor',
  component_code VARCHAR(50),
  component_name VARCHAR(200),
  designed_value TEXT,
  actual_value TEXT,
  reason TEXT,
  approval_status VARCHAR(30) DEFAULT 'pending',
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  eco_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_deviations_project ON pdm_as_built_deviations(project_id);
CREATE INDEX IF NOT EXISTS idx_pdm_deviations_baseline ON pdm_as_built_deviations(baseline_id);
CREATE INDEX IF NOT EXISTS idx_pdm_deviations_type ON pdm_as_built_deviations(deviation_type);
CREATE INDEX IF NOT EXISTS idx_pdm_deviations_severity ON pdm_as_built_deviations(severity);

-- ────────── 7. pdm_field_insights ──────────

CREATE TABLE IF NOT EXISTS pdm_field_insights (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES pdm_products(id),
  project_id INTEGER REFERENCES projects(id),
  insight_type pdm_insight_type NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  affected_station_types JSONB,
  source_service_log_ids JSONB,
  occurrence_count INTEGER DEFAULT 1,
  severity_score INTEGER DEFAULT 1,
  suggested_eco_id INTEGER,
  status pdm_insight_status NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_field_insights_product ON pdm_field_insights(product_id);
CREATE INDEX IF NOT EXISTS idx_pdm_field_insights_type ON pdm_field_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_pdm_field_insights_status ON pdm_field_insights(status);
CREATE INDEX IF NOT EXISTS idx_pdm_field_insights_severity ON pdm_field_insights(severity_score);

-- ════════════════════════════════════════════
-- Seed Data
-- ════════════════════════════════════════════

-- 3 Product Masters
INSERT INTO pdm_products (product_code, product_name, product_family, product_category, description, station_count, lifecycle_status, bu_code, maturity_level, total_projects_built, standards, customer_segments) VALUES
  ('USC-15-A', '15工位超声波清洗机', 'USC', '标准超声波', '15工位全自动超声波清洗设备，适用于汽车零部件精密清洗', 15, 'production', '商用车', 85, 12, '["ISO 9001","IATF 16949","CE"]', '["automotive","commercial_vehicle"]'),
  ('SPR-08-B', '8工位喷淋清洗机', 'SPR', '高压喷淋', '8工位高压喷淋清洗设备，适用于半导体晶圆载具清洗', 8, 'design', '半导体', 45, 3, '["ISO 14644","SEMI S2"]', '["semiconductor"]'),
  ('IMM-06-C', '6工位浸泡清洗机', 'IMM', '化学浸泡', '6工位化学浸泡清洗设备，适用于航空发动机叶片清洗', 6, 'concept', '工业通用', 15, 0, '["AS9100","NADCAP"]', '["aerospace","medical"]')
ON CONFLICT (product_code) DO NOTHING;

-- 2 Baselines (for USC-15-A)
INSERT INTO pdm_baselines (product_id, gate_stage, baseline_name, bom_version, status, notes) VALUES
  ((SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'M5', 'USC-15-A M5 Design Freeze', 'V2.1', 'approved', 'M5制造就绪评审通过，BOM V2.1冻结'),
  ((SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'M8', 'USC-15-A M8 FAT Baseline', 'V2.3', 'draft', 'M8 FAT前基线，含3项BOM变更')
ON CONFLICT DO NOTHING;

-- Update latest_baseline_id
UPDATE pdm_products SET latest_baseline_id = (SELECT id FROM pdm_baselines WHERE gate_stage = 'M8' AND product_id = pdm_products.id LIMIT 1)
WHERE product_code = 'USC-15-A' AND EXISTS (SELECT 1 FROM pdm_baselines WHERE gate_stage = 'M8' AND product_id = pdm_products.id);

-- 5 Requirements (for USC-15-A project)
INSERT INTO pdm_requirements (project_id, product_id, requirement_code, title, category, source_type, source_reference, priority, verification_method, verification_status) VALUES
  (1, (SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'REQ-USC15-001', '清洗洁净度≤2mg/1000cm²', 'cleanliness', 'customer_spec', 'CS-2024-0042 §4.2', 'critical', 'test', 'passed'),
  (1, (SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'REQ-USC15-002', '节拍时间≤45秒/工位', 'performance', 'internal', 'GRT-STD-CT-001', 'high', 'test', 'passed'),
  (1, (SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'REQ-USC15-003', '设备噪音≤75dB(A)', 'safety', 'standard', 'GB/T 16710-2010', 'medium', 'test', 'in_progress'),
  (1, (SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'REQ-USC15-004', 'CE认证电气安全', 'regulatory', 'standard', 'EN 60204-1:2018', 'critical', 'inspection', 'not_started'),
  (1, (SELECT id FROM pdm_products WHERE product_code = 'USC-15-A'), 'REQ-USC15-005', '超声波频率28kHz±5%', 'functional', 'customer_spec', 'CS-2024-0042 §3.1', 'high', 'test', 'passed')
ON CONFLICT DO NOTHING;
