-- =============================================================================
-- GRT-5 Migration: File Upload, GRT-Init, HMI Screens, Sensor Fusion,
--                  AEI Extended, Design Sync Events
-- Generated: 2026-03-06
-- =============================================================================

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

-- file-upload-schema.ts
DO $$ BEGIN
  CREATE TYPE upload_status AS ENUM ('uploading', 'assembling', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- grt-init-schema.ts
DO $$ BEGIN
  CREATE TYPE grt_scan_type AS ENUM ('network', 'plc', 'robot', 'sharepoint', 'database', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grt_scan_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grt_device_type AS ENUM ('plc', 'robot', 'hmi', 'sensor', 'gateway', 'drive', 'switch', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grt_device_status AS ENUM ('online', 'offline', 'error', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- hmi-screen-schema.ts
DO $$ BEGIN
  CREATE TYPE hmi_screen_type AS ENUM ('main_overview', 'station_detail', 'alarm_list', 'recipe_management', 'trend_chart', 'user_management', 'maintenance', 'diagnostics');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hmi_target_platform AS ENUM ('siemens_comfort', 'siemens_unified', 'weintek_eb', 'pro_face', 'generic_html');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sensor-fusion-schema.ts
DO $$ BEGIN
  CREATE TYPE anomaly_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE anomaly_action_type AS ENUM ('alert', 'block', 'maintenance', 'retrain', 'escalate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- aei-extended-schema.ts
DO $$ BEGIN
  CREATE TYPE aei_contribution_type AS ENUM ('design_export', 'plc_version', 'bom_change', 'defect_resolved', 'maintenance_done', 'doc_shared', 'meeting_action', 'cleaning_pass', 'code_review', 'training_completed', 'safety_incident');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- design-engine-schema.ts (design_sync_events only)
DO $$ BEGIN
  CREATE TYPE design_sync_event_type AS ENUM ('mech_update', 'plc_gen', 'eplan_gen', 'hmi_gen', 'conflict_detected', 'conflict_resolved', 'robot_anomaly', 'safety_incident', 'hr_penalty', 'version_promoted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── TABLES ─────────────────────────────────────────────────────────────────

-- =============================================================================
-- 1. file_upload_sessions (file-upload-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_upload_sessions (
  id                   SERIAL PRIMARY KEY,
  session_id           VARCHAR(64) NOT NULL UNIQUE,
  file_name            VARCHAR(500) NOT NULL,
  file_size_bytes      INTEGER NOT NULL,
  chunk_size_bytes     INTEGER NOT NULL DEFAULT 5242880,
  total_chunks         INTEGER NOT NULL,
  completed_chunks     INTEGER NOT NULL DEFAULT 0,
  status               upload_status NOT NULL DEFAULT 'uploading',
  mime_type            VARCHAR(200) DEFAULT 'application/octet-stream',
  uploaded_by          VARCHAR(100) NOT NULL,
  target_path          VARCHAR(1000) DEFAULT '',
  sharepoint_site_code VARCHAR(20),
  project_id           INTEGER,
  error_message        TEXT,
  created_at           TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS upload_sessions_session_idx ON file_upload_sessions (session_id);
CREATE INDEX IF NOT EXISTS upload_sessions_status_idx  ON file_upload_sessions (status);
CREATE INDEX IF NOT EXISTS upload_sessions_user_idx    ON file_upload_sessions (uploaded_by);


-- =============================================================================
-- 2. file_upload_chunks (file-upload-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_upload_chunks (
  id               SERIAL PRIMARY KEY,
  session_id       VARCHAR(64) NOT NULL,
  chunk_index      INTEGER NOT NULL,
  chunk_size_bytes INTEGER NOT NULL,
  checksum         VARCHAR(64) NOT NULL,
  storage_path     VARCHAR(1000) NOT NULL,
  received_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS upload_chunks_session_idx       ON file_upload_chunks (session_id);
CREATE INDEX IF NOT EXISTS upload_chunks_session_chunk_idx ON file_upload_chunks (session_id, chunk_index);


-- =============================================================================
-- 3. grt_environment_scans (grt-init-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS grt_environment_scans (
  id             SERIAL PRIMARY KEY,
  scan_id        VARCHAR(64) NOT NULL UNIQUE,
  scan_type      grt_scan_type NOT NULL,
  status         grt_scan_status NOT NULL DEFAULT 'running',
  subnet_range   VARCHAR(50) DEFAULT '192.168.1.0/24',
  devices_found  INTEGER DEFAULT 0,
  results        JSONB DEFAULT '{}',
  error_message  TEXT,
  scanned_by     VARCHAR(100) NOT NULL,
  started_at     TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS grt_scans_scan_id_idx ON grt_environment_scans (scan_id);
CREATE INDEX IF NOT EXISTS grt_scans_type_idx    ON grt_environment_scans (scan_type);


-- =============================================================================
-- 4. grt_detected_devices (grt-init-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS grt_detected_devices (
  id                  SERIAL PRIMARY KEY,
  scan_id             VARCHAR(64) NOT NULL,
  device_type         grt_device_type NOT NULL,
  ip_address          VARCHAR(45) NOT NULL,
  mac_address         VARCHAR(17),
  hostname            VARCHAR(200),
  brand               VARCHAR(100),
  model               VARCHAR(200),
  firmware_version    VARCHAR(50),
  protocol            VARCHAR(30),
  port                INTEGER,
  status              grt_device_status NOT NULL DEFAULT 'online',
  response_time_ms    INTEGER,
  auto_config_applied BOOLEAN DEFAULT FALSE,
  config_json         JSONB DEFAULT '{}',
  detected_at         TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS grt_devices_scan_idx ON grt_detected_devices (scan_id);
CREATE INDEX IF NOT EXISTS grt_devices_type_idx ON grt_detected_devices (device_type);
CREATE INDEX IF NOT EXISTS grt_devices_ip_idx   ON grt_detected_devices (ip_address);


-- =============================================================================
-- 5. hmi_screens (hmi-screen-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hmi_screens (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL,
  plc_project_id  INTEGER NOT NULL,
  screen_index    INTEGER NOT NULL,
  screen_name     VARCHAR(200) NOT NULL,
  screen_name_en  VARCHAR(200) DEFAULT '',
  screen_type     hmi_screen_type NOT NULL,
  target_platform hmi_target_platform NOT NULL DEFAULT 'siemens_comfort',
  layout_json     JSONB DEFAULT '{"screenWidth":1920,"screenHeight":1080,"backgroundColor":"#1a1a2e","headerText":"","widgets":[],"navigationLinks":[]}',
  widget_count    INTEGER DEFAULT 0,
  resolution      VARCHAR(20) DEFAULT '1920x1080',
  generated_code  TEXT DEFAULT '',
  preview_svg     TEXT DEFAULT '',
  station_id      INTEGER,
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS hmi_screens_project_idx     ON hmi_screens (project_id);
CREATE INDEX IF NOT EXISTS hmi_screens_plc_project_idx ON hmi_screens (plc_project_id);
CREATE INDEX IF NOT EXISTS hmi_screens_type_idx        ON hmi_screens (screen_type);


-- =============================================================================
-- 6. fused_equipment_readings (sensor-fusion-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fused_equipment_readings (
  id                       SERIAL PRIMARY KEY,
  equipment_id             INTEGER NOT NULL,
  equipment_name           VARCHAR(200),
  "timestamp"              TIMESTAMP DEFAULT NOW() NOT NULL,
  metrics                  JSONB DEFAULT '{}',
  anomaly_score            REAL DEFAULT 0,
  anomaly_type             VARCHAR(100),
  source_robot_cleaning_id INTEGER,
  source_oee_snapshot_id   INTEGER,
  source_telemetry_ids     JSONB DEFAULT '[]',
  created_at               TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS fused_readings_equipment_idx ON fused_equipment_readings (equipment_id);
CREATE INDEX IF NOT EXISTS fused_readings_timestamp_idx ON fused_equipment_readings ("timestamp");
CREATE INDEX IF NOT EXISTS fused_readings_anomaly_idx   ON fused_equipment_readings (anomaly_score);


-- =============================================================================
-- 7. anomaly_patterns (sensor-fusion-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS anomaly_patterns (
  id                SERIAL PRIMARY KEY,
  pattern_name      VARCHAR(200) NOT NULL,
  pattern_name_en   VARCHAR(200) DEFAULT '',
  description       TEXT DEFAULT '',
  conditions        JSONB DEFAULT '[]',
  severity          anomaly_severity NOT NULL DEFAULT 'warning',
  action_type       anomaly_action_type NOT NULL DEFAULT 'alert',
  is_active         BOOLEAN DEFAULT TRUE,
  trigger_count     INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  created_by        VARCHAR(100),
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS anomaly_patterns_active_idx   ON anomaly_patterns (is_active);
CREATE INDEX IF NOT EXISTS anomaly_patterns_severity_idx ON anomaly_patterns (severity);


-- =============================================================================
-- 8. aei_contribution_logs (aei-extended-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS aei_contribution_logs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL,
  user_name         VARCHAR(200) NOT NULL,
  contribution_type aei_contribution_type NOT NULL,
  source_table      VARCHAR(100) NOT NULL,
  source_id         INTEGER,
  points            INTEGER NOT NULL DEFAULT 1,
  metadata          JSONB DEFAULT '{}',
  month             VARCHAR(7) NOT NULL,
  bu_code           VARCHAR(20),
  created_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS aei_contrib_user_idx       ON aei_contribution_logs (user_id);
CREATE INDEX IF NOT EXISTS aei_contrib_month_idx      ON aei_contribution_logs (month);
CREATE INDEX IF NOT EXISTS aei_contrib_type_idx       ON aei_contribution_logs (contribution_type);
CREATE INDEX IF NOT EXISTS aei_contrib_user_month_idx ON aei_contribution_logs (user_id, month);


-- =============================================================================
-- 9. aei_monthly_scores (aei-extended-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS aei_monthly_scores (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL,
  user_name           VARCHAR(200) NOT NULL,
  month               VARCHAR(7) NOT NULL,
  meeting_score       REAL DEFAULT 0,
  engineering_score   REAL DEFAULT 0,
  operational_score   REAL DEFAULT 0,
  collaboration_score REAL DEFAULT 0,
  composite_aei_score REAL DEFAULT 0,
  rank                INTEGER,
  total_employees     INTEGER,
  trend_slope         REAL,
  risk_flag           VARCHAR(30),
  details             JSONB DEFAULT '{"designExports":0,"plcVersions":0,"defectsResolved":0,"cleaningPassRate":0,"docsShared":0,"trainingsCompleted":0,"safetyIncidents":0}',
  bu_code             VARCHAR(20),
  calculated_at       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS aei_scores_user_idx      ON aei_monthly_scores (user_id);
CREATE INDEX IF NOT EXISTS aei_scores_month_idx     ON aei_monthly_scores (month);
CREATE INDEX IF NOT EXISTS aei_scores_user_month_idx ON aei_monthly_scores (user_id, month);
CREATE INDEX IF NOT EXISTS aei_scores_composite_idx ON aei_monthly_scores (composite_aei_score);
CREATE INDEX IF NOT EXISTS aei_scores_rank_idx      ON aei_monthly_scores (rank);


-- =============================================================================
-- 10. design_sync_events (design-engine-schema.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS design_sync_events (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL,
  event_type  design_sync_event_type NOT NULL,
  station_id  INTEGER,
  user_id     INTEGER,
  user_name   VARCHAR(100),
  description TEXT DEFAULT '',
  metadata    JSONB DEFAULT '{}',
  severity    VARCHAR(20) DEFAULT 'info',
  created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_events_project_idx ON design_sync_events (project_id);
CREATE INDEX IF NOT EXISTS sync_events_type_idx    ON design_sync_events (event_type);
CREATE INDEX IF NOT EXISTS sync_events_created_idx ON design_sync_events (created_at);


-- =============================================================================
-- End of GRT-5 Migration
-- =============================================================================
