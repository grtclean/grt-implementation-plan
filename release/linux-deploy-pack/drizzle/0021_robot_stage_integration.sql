-- Robot ↔ Stage-Gate Integration DDL Migration
-- Links robot fleet digital twin with M0-M12 project lifecycle

-- Enums
DO $$ BEGIN
  CREATE TYPE stage_assignment_role_enum AS ENUM ('primary', 'backup', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stage_assignment_status_enum AS ENUM ('planned', 'programmed', 'active', 'completed', 'released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equipment_program_type_enum AS ENUM ('robot_motion', 'plc_ladder', 'plc_st', 'hmi_screen', 'vision', 'conveyor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equipment_program_status_enum AS ENUM ('draft', 'review', 'approved', 'deployed', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE program_execution_result_enum AS ENUM ('running', 'success', 'partial', 'failed', 'aborted', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE execution_trigger_type_enum AS ENUM ('stage_auto', 'manual', 'commissioning', 'protocol_test');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table 1: robot_stage_assignments
CREATE TABLE IF NOT EXISTS robot_stage_assignments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  robot_id INTEGER NOT NULL,
  stage_code VARCHAR(10) NOT NULL,
  role stage_assignment_role_enum NOT NULL DEFAULT 'primary',
  status stage_assignment_status_enum NOT NULL DEFAULT 'planned',
  assigned_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rsa_project_stage_idx ON robot_stage_assignments (project_id, stage_code);
CREATE INDEX IF NOT EXISTS rsa_robot_idx ON robot_stage_assignments (robot_id);
CREATE INDEX IF NOT EXISTS rsa_status_idx ON robot_stage_assignments (status);

-- Table 2: equipment_programs
CREATE TABLE IF NOT EXISTS equipment_programs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  robot_id INTEGER NOT NULL,
  stage_code VARCHAR(10) NOT NULL,
  program_name VARCHAR(200) NOT NULL,
  program_type equipment_program_type_enum NOT NULL DEFAULT 'robot_motion',
  version INTEGER NOT NULL DEFAULT 1,
  version_string VARCHAR(20) NOT NULL DEFAULT 'V1.0',
  previous_version_id INTEGER,
  status equipment_program_status_enum NOT NULL DEFAULT 'draft',
  program_content TEXT,
  storage_url VARCHAR(500),
  parameters JSONB,
  revision_reason TEXT,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ep_project_stage_idx ON equipment_programs (project_id, stage_code);
CREATE INDEX IF NOT EXISTS ep_robot_idx ON equipment_programs (robot_id);
CREATE INDEX IF NOT EXISTS ep_program_name_idx ON equipment_programs (program_name);
CREATE INDEX IF NOT EXISTS ep_status_idx ON equipment_programs (status);
CREATE INDEX IF NOT EXISTS ep_prev_version_idx ON equipment_programs (previous_version_id);

-- Table 3: program_execution_logs
CREATE TABLE IF NOT EXISTS program_execution_logs (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL,
  robot_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  stage_code VARCHAR(10) NOT NULL,
  trigger_type execution_trigger_type_enum NOT NULL DEFAULT 'manual',
  result program_execution_result_enum NOT NULL DEFAULT 'running',
  duration_ms INTEGER,
  telemetry_at_start JSONB,
  telemetry_at_end JSONB,
  metrics JSONB,
  error_code VARCHAR(50),
  error_message TEXT,
  executed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pel_program_idx ON program_execution_logs (program_id);
CREATE INDEX IF NOT EXISTS pel_robot_idx ON program_execution_logs (robot_id);
CREATE INDEX IF NOT EXISTS pel_project_stage_idx ON program_execution_logs (project_id, stage_code);
CREATE INDEX IF NOT EXISTS pel_result_idx ON program_execution_logs (result);
CREATE INDEX IF NOT EXISTS pel_created_idx ON program_execution_logs (created_at);

-- Table 4: stage_commissioning_checklists
CREATE TABLE IF NOT EXISTS stage_commissioning_checklists (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL,
  robot_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  check_item VARCHAR(300) NOT NULL,
  category VARCHAR(100) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  measured_value VARCHAR(100),
  target_value VARCHAR(100),
  unit VARCHAR(30),
  execution_log_id INTEGER,
  completed_by VARCHAR(100),
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS scc_assignment_idx ON stage_commissioning_checklists (assignment_id);
CREATE INDEX IF NOT EXISTS scc_robot_idx ON stage_commissioning_checklists (robot_id);
CREATE INDEX IF NOT EXISTS scc_project_idx ON stage_commissioning_checklists (project_id);
CREATE INDEX IF NOT EXISTS scc_category_idx ON stage_commissioning_checklists (category);
CREATE INDEX IF NOT EXISTS scc_status_idx ON stage_commissioning_checklists (status);
