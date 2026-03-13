-- ═══════════════════════════════════════════════════════════════
-- R&D NPI/NPD Module Migration
-- Dual-track R&D lifecycle: Concept → EVT → DVT → PVT → MP
-- 9 enums, 10 tables, 48 indexes, 2 seed projects
-- ═══════════════════════════════════════════════════════════════

-- ─── Enums (idempotent) ──────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE rnd_project_category AS ENUM ('robotics', 'vision_ai', 'fluid_mechanics', 'mechatronics', 'software');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_stage AS ENUM ('concept', 'evt', 'dvt', 'pvt', 'mass_production');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_project_status AS ENUM ('draft', 'active', 'on_hold', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_gate_decision AS ENUM ('pending', 'approved', 'conditional', 'rejected', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_bom_component_source AS ENUM ('avl_approved', 'prototype', 'experimental', '3d_printed', 'cots');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_bom_snapshot_reason AS ENUM ('gate_freeze', 'manual_baseline', 'pre_promotion');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_test_type AS ENUM ('unit_test', 'integration_test', 'stress_test', 'environmental', 'compliance', 'performance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_test_verdict AS ENUM ('pass', 'fail', 'conditional', 'not_run');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rnd_routing_step_type AS ENUM ('assembly', 'inspection', 'eol_test', 'packaging', 'labeling');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table 1: rnd_projects ──────────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_projects (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(50) NOT NULL,
  name VARCHAR(300) NOT NULL,
  name_en VARCHAR(300),
  category rnd_project_category NOT NULL,
  current_stage rnd_stage DEFAULT 'concept',
  status rnd_project_status DEFAULT 'draft',
  parent_project_id INTEGER,
  parent_project_code VARCHAR(50),
  lead_engineer_id INTEGER,
  cto_signoff_required BOOLEAN DEFAULT TRUE,
  ceo_signoff_required BOOLEAN DEFAULT FALSE,
  budget DECIMAL(15,2),
  actual_spend DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CNY',
  planned_start_date TIMESTAMP,
  planned_end_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  target_specs JSONB,
  risk_level VARCHAR(20) DEFAULT 'medium',
  completion_percent INTEGER DEFAULT 0,
  bu_code VARCHAR(50),
  description TEXT,
  tags JSONB,
  created_by INTEGER,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS rnd_projects_uk_code ON rnd_projects (project_code);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_category ON rnd_projects (category);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_stage ON rnd_projects (current_stage);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_status ON rnd_projects (status);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_bu ON rnd_projects (bu_code);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_lead ON rnd_projects (lead_engineer_id);
CREATE INDEX IF NOT EXISTS rnd_projects_idx_created ON rnd_projects (created_at);

-- ─── Table 2: rnd_gate_reviews ──────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_gate_reviews (
  id SERIAL PRIMARY KEY,
  rnd_project_id INTEGER NOT NULL,
  gate_stage rnd_stage NOT NULL,
  review_round INTEGER DEFAULT 1,
  decision rnd_gate_decision DEFAULT 'pending',
  reviewer_id INTEGER,
  reviewer_name VARCHAR(200),
  reviewer_role VARCHAR(100),
  cto_approved BOOLEAN DEFAULT FALSE,
  cto_approved_by INTEGER,
  cto_approved_at TIMESTAMP,
  cto_comment TEXT,
  ceo_approved BOOLEAN DEFAULT FALSE,
  ceo_approved_by INTEGER,
  ceo_approved_at TIMESTAMP,
  ceo_comment TEXT,
  checklist_json JSONB,
  checklist_passed INTEGER DEFAULT 0,
  checklist_total INTEGER DEFAULT 0,
  overall_score DECIMAL(5,2),
  conditions TEXT,
  action_items JSONB,
  attachments JSONB,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_gate_reviews_idx_project ON rnd_gate_reviews (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_gate_reviews_idx_stage ON rnd_gate_reviews (gate_stage);
CREATE INDEX IF NOT EXISTS rnd_gate_reviews_idx_decision ON rnd_gate_reviews (decision);
CREATE INDEX IF NOT EXISTS rnd_gate_reviews_idx_reviewer ON rnd_gate_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS rnd_gate_reviews_idx_created ON rnd_gate_reviews (created_at);

-- ─── Table 3: rnd_sandbox_boms ──────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_sandbox_boms (
  id SERIAL PRIMARY KEY,
  rnd_project_id INTEGER NOT NULL,
  bom_code VARCHAR(50) NOT NULL,
  version_major INTEGER DEFAULT 0,
  version_minor INTEGER DEFAULT 1,
  version_label VARCHAR(20) DEFAULT 'v0.1',
  status VARCHAR(30) DEFAULT 'draft',
  parent_bom_id INTEGER,
  total_estimated_cost DECIMAL(15,2) DEFAULT 0,
  total_components INTEGER DEFAULT 0,
  avl_approved_count INTEGER DEFAULT 0,
  experimental_count INTEGER DEFAULT 0,
  frozen_at TIMESTAMP,
  frozen_by INTEGER,
  frozen_for_gate rnd_stage,
  promoted_to_bom_master_id INTEGER,
  promoted_at TIMESTAMP,
  promoted_by INTEGER,
  description TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS rnd_sandbox_boms_uk_code_version ON rnd_sandbox_boms (bom_code, version_label);
CREATE INDEX IF NOT EXISTS rnd_sandbox_boms_idx_project ON rnd_sandbox_boms (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_sandbox_boms_idx_status ON rnd_sandbox_boms (status);
CREATE INDEX IF NOT EXISTS rnd_sandbox_boms_idx_parent ON rnd_sandbox_boms (parent_bom_id);
CREATE INDEX IF NOT EXISTS rnd_sandbox_boms_idx_created ON rnd_sandbox_boms (created_at);

-- ─── Table 4: rnd_sandbox_bom_items ─────────────────────────

CREATE TABLE IF NOT EXISTS rnd_sandbox_bom_items (
  id SERIAL PRIMARY KEY,
  sandbox_bom_id INTEGER NOT NULL,
  parent_item_id INTEGER,
  level INTEGER DEFAULT 1,
  sequence INTEGER DEFAULT 10,
  part_number VARCHAR(100) NOT NULL,
  part_name VARCHAR(300) NOT NULL,
  component_source rnd_bom_component_source DEFAULT 'cots',
  quantity DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20) DEFAULT 'pcs',
  unit_cost DECIMAL(12,4) DEFAULT 0,
  extended_cost DECIMAL(15,2) DEFAULT 0,
  supplier_name VARCHAR(200),
  lead_time_days INTEGER,
  is_critical_path BOOLEAN DEFAULT FALSE,
  requires_custom_tooling BOOLEAN DEFAULT FALSE,
  avl_material_code VARCHAR(50),
  substitutes JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_bom_items_idx_bom ON rnd_sandbox_bom_items (sandbox_bom_id);
CREATE INDEX IF NOT EXISTS rnd_bom_items_idx_parent ON rnd_sandbox_bom_items (parent_item_id);
CREATE INDEX IF NOT EXISTS rnd_bom_items_idx_part ON rnd_sandbox_bom_items (part_number);
CREATE INDEX IF NOT EXISTS rnd_bom_items_idx_source ON rnd_sandbox_bom_items (component_source);
CREATE INDEX IF NOT EXISTS rnd_bom_items_idx_critical ON rnd_sandbox_bom_items (is_critical_path);

-- ─── Table 5: rnd_bom_snapshots ─────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_bom_snapshots (
  id SERIAL PRIMARY KEY,
  sandbox_bom_id INTEGER NOT NULL,
  rnd_project_id INTEGER NOT NULL,
  snapshot_reason rnd_bom_snapshot_reason NOT NULL,
  gate_stage rnd_stage,
  bom_header_snapshot JSONB,
  bom_items_snapshot JSONB,
  total_cost DECIMAL(15,2),
  avl_compliance_percent DECIMAL(5,2),
  snapshot_by INTEGER,
  snapshot_label VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_bom_snapshots_idx_bom ON rnd_bom_snapshots (sandbox_bom_id);
CREATE INDEX IF NOT EXISTS rnd_bom_snapshots_idx_project ON rnd_bom_snapshots (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_bom_snapshots_idx_stage ON rnd_bom_snapshots (gate_stage);
CREATE INDEX IF NOT EXISTS rnd_bom_snapshots_idx_created ON rnd_bom_snapshots (created_at);

-- ─── Table 6: rnd_test_records ──────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_test_records (
  id SERIAL PRIMARY KEY,
  rnd_project_id INTEGER NOT NULL,
  gate_stage rnd_stage NOT NULL,
  test_code VARCHAR(50) NOT NULL,
  test_name VARCHAR(300) NOT NULL,
  test_type rnd_test_type NOT NULL,
  test_metrics JSONB,
  pass_criteria JSONB,
  verdict rnd_test_verdict DEFAULT 'not_run',
  environment_conditions JSONB,
  test_equipment JSONB,
  evidence_urls JSONB,
  executed_by INTEGER,
  executed_at TIMESTAMP,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  suite_id INTEGER,
  is_mandatory BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_test_records_idx_project ON rnd_test_records (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_test_records_idx_stage ON rnd_test_records (gate_stage);
CREATE INDEX IF NOT EXISTS rnd_test_records_idx_type ON rnd_test_records (test_type);
CREATE INDEX IF NOT EXISTS rnd_test_records_idx_verdict ON rnd_test_records (verdict);
CREATE INDEX IF NOT EXISTS rnd_test_records_idx_code ON rnd_test_records (test_code);
CREATE INDEX IF NOT EXISTS rnd_test_records_idx_created ON rnd_test_records (created_at);

-- ─── Table 7: rnd_test_suites ───────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_test_suites (
  id SERIAL PRIMARY KEY,
  rnd_project_id INTEGER NOT NULL,
  suite_code VARCHAR(50) NOT NULL,
  suite_name VARCHAR(300) NOT NULL,
  target_gate rnd_stage,
  project_category rnd_project_category,
  test_templates JSONB,
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS rnd_test_suites_uk_project_code ON rnd_test_suites (rnd_project_id, suite_code);
CREATE INDEX IF NOT EXISTS rnd_test_suites_idx_project ON rnd_test_suites (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_test_suites_idx_gate ON rnd_test_suites (target_gate);
CREATE INDEX IF NOT EXISTS rnd_test_suites_idx_created ON rnd_test_suites (created_at);

-- ─── Table 8: rnd_assembly_routings ─────────────────────────

CREATE TABLE IF NOT EXISTS rnd_assembly_routings (
  id SERIAL PRIMARY KEY,
  rnd_project_id INTEGER NOT NULL,
  sandbox_bom_id INTEGER,
  routing_code VARCHAR(50) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  routing_name VARCHAR(300),
  status VARCHAR(30) DEFAULT 'draft',
  total_cycle_time_minutes DECIMAL(10,2) DEFAULT 0,
  activated_at_stage rnd_stage,
  description TEXT,
  created_by INTEGER,
  activated_at TIMESTAMP,
  frozen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS rnd_routings_uk_code_version ON rnd_assembly_routings (routing_code, version);
CREATE INDEX IF NOT EXISTS rnd_routings_idx_project ON rnd_assembly_routings (rnd_project_id);
CREATE INDEX IF NOT EXISTS rnd_routings_idx_status ON rnd_assembly_routings (status);
CREATE INDEX IF NOT EXISTS rnd_routings_idx_created ON rnd_assembly_routings (created_at);

-- ─── Table 9: rnd_routing_steps ─────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_routing_steps (
  id SERIAL PRIMARY KEY,
  routing_id INTEGER NOT NULL,
  step_number INTEGER NOT NULL,
  step_type rnd_routing_step_type NOT NULL,
  step_name VARCHAR(300) NOT NULL,
  standard_cycle_time_minutes DECIMAL(8,2),
  actual_cycle_time_minutes DECIMAL(8,2),
  work_instructions JSONB,
  tools_required JSONB,
  inspection_criteria JSONB,
  consumed_bom_item_ids JSONB,
  worker_skill_level VARCHAR(50),
  worker_count INTEGER DEFAULT 1,
  predecessor_step_id INTEGER,
  is_optional BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_steps_idx_routing ON rnd_routing_steps (routing_id);
CREATE INDEX IF NOT EXISTS rnd_steps_idx_type ON rnd_routing_steps (step_type);
CREATE INDEX IF NOT EXISTS rnd_steps_idx_number ON rnd_routing_steps (routing_id, step_number);

-- ─── Table 10: rnd_activity_log ─────────────────────────────

CREATE TABLE IF NOT EXISTS rnd_activity_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id INTEGER,
  user_name VARCHAR(200),
  change_summary TEXT,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rnd_activity_log_idx_entity ON rnd_activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS rnd_activity_log_idx_action ON rnd_activity_log (action);
CREATE INDEX IF NOT EXISTS rnd_activity_log_idx_user ON rnd_activity_log (user_id);
CREATE INDEX IF NOT EXISTS rnd_activity_log_idx_created ON rnd_activity_log (created_at);
CREATE INDEX IF NOT EXISTS rnd_activity_log_idx_type ON rnd_activity_log (entity_type);

-- ─── Seed: 2 Pilot Projects ─────────────────────────────────

INSERT INTO rnd_projects (project_code, name, name_en, category, current_stage, status, cto_signoff_required, ceo_signoff_required, budget, currency, risk_level, description, target_specs, tags, created_by)
SELECT 'RND-2026-001', '人形机器人工业清洗原型机', 'Humanoid Robot Industrial Cleaning Prototype', 'robotics', 'concept', 'active', TRUE, TRUE, 5000000.00, 'CNY', 'high',
  'Project Alpha — 6-DOF humanoid upper body + cleaning end-effector. Kinematics, multi-axis servo control, force-torque feedback.',
  '{"dof": 6, "payloadKg": 10, "repeatabilityMm": 0.05, "reachMm": 850, "protectionClass": "IP65"}'::jsonb,
  '["robotics", "cleaning", "prototype", "alpha"]'::jsonb, 1
WHERE NOT EXISTS (SELECT 1 FROM rnd_projects WHERE project_code = 'RND-2026-001');

INSERT INTO rnd_projects (project_code, name, name_en, category, current_stage, status, cto_signoff_required, ceo_signoff_required, budget, currency, risk_level, description, target_specs, tags, created_by)
SELECT 'RND-2026-002', '工业视觉清洁度检测系统', 'Industrial Vision Cleanliness Detection System', 'vision_ai', 'concept', 'active', TRUE, FALSE, 2000000.00, 'CNY', 'medium',
  'Project Beta — Multi-camera optical inspection for 400μm particle detection. AI classification, automated pass/fail.',
  '{"resolutionUm": 400, "cameraCount": 4, "fps": 30, "aiModel": "YOLOv8-seg", "lightingType": "darkfield+UV"}'::jsonb,
  '["vision", "cleanliness", "inspection", "beta"]'::jsonb, 1
WHERE NOT EXISTS (SELECT 1 FROM rnd_projects WHERE project_code = 'RND-2026-002');
