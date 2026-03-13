-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 0045: Sandbox & Go-Live Console                  ║
-- ║  5 tables + enums for AI-orchestrated development control   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Enums ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE sandbox_scenario_status AS ENUM (
    'draft', 'submitted', 'planning', 'reviewed', 'approved',
    'implementing', 'completed', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sandbox_priority AS ENUM ('P0', 'P1', 'P2', 'P3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sandbox_run_type AS ENUM ('proposal', 'implementation', 'review', 'dry_run');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sandbox_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE release_gate_type AS ENUM ('proposal_review', 'red_team', 'preflight', 'canary', 'full_deploy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE release_gate_status AS ENUM ('pending', 'in_progress', 'passed', 'failed', 'skipped', 'overridden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_task_type AS ENUM (
    'code_change', 'api_change', 'schema_change', 'config_change',
    'test', 'documentation', 'rollback_step'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_task_status AS ENUM (
    'draft', 'ai_generated', 'human_reviewed', 'approved',
    'implementing', 'verified', 'deployed', 'rolled_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table 1: sandbox_scenarios ───────────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_scenarios (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(300) NOT NULL,
  description    TEXT,
  business_goal  TEXT,
  affected_pages JSON DEFAULT '[]'::json,
  reference_projects JSON DEFAULT '[]'::json,
  status         sandbox_scenario_status NOT NULL DEFAULT 'draft',
  priority       sandbox_priority NOT NULL DEFAULT 'P2',
  created_by_id  INTEGER,
  tags           JSON DEFAULT '[]'::json,
  bu_code        VARCHAR(50),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_status ON sandbox_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_created_by ON sandbox_scenarios(created_by_id);

-- ── Table 2: sandbox_knowledge_links ─────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_knowledge_links (
  id                  SERIAL PRIMARY KEY,
  scenario_id         INTEGER NOT NULL REFERENCES sandbox_scenarios(id) ON DELETE CASCADE,
  knowledge_asset_id  INTEGER NOT NULL,
  relevance_score     INTEGER DEFAULT 50,
  usage_context       VARCHAR(100),
  added_by_id         INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_klinks_scenario ON sandbox_knowledge_links(scenario_id);

-- ── Table 3: sandbox_runs ────────────────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_runs (
  id              SERIAL PRIMARY KEY,
  scenario_id     INTEGER NOT NULL REFERENCES sandbox_scenarios(id) ON DELETE CASCADE,
  run_type        sandbox_run_type NOT NULL,
  ai_provider     VARCHAR(30) NOT NULL,
  ai_model        VARCHAR(100),
  system_prompt   TEXT,
  user_input      TEXT,
  ai_output       JSON,
  status          sandbox_run_status NOT NULL DEFAULT 'pending',
  duration_ms     INTEGER,
  token_usage     JSON,
  error_message   TEXT,
  triggered_by_id INTEGER,
  parent_run_id   INTEGER REFERENCES sandbox_runs(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_runs_scenario ON sandbox_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_runs_type ON sandbox_runs(run_type);

-- ── Table 4: release_gates ───────────────────────────────────

CREATE TABLE IF NOT EXISTS release_gates (
  id              SERIAL PRIMARY KEY,
  scenario_id     INTEGER NOT NULL REFERENCES sandbox_scenarios(id) ON DELETE CASCADE,
  gate_type       release_gate_type NOT NULL,
  gate_order      INTEGER NOT NULL,
  status          release_gate_status NOT NULL DEFAULT 'pending',
  reviewer_id     INTEGER,
  review_comment  TEXT,
  red_team_report JSON,
  checklist       JSON,
  passed_at       TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_gates_scenario ON release_gates(scenario_id);

-- ── Table 5: sandbox_change_tasks ────────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_change_tasks (
  id                    SERIAL PRIMARY KEY,
  scenario_id           INTEGER NOT NULL REFERENCES sandbox_scenarios(id) ON DELETE CASCADE,
  run_id                INTEGER REFERENCES sandbox_runs(id),
  task_type             change_task_type NOT NULL,
  title                 VARCHAR(500) NOT NULL,
  description           TEXT,
  file_path             VARCHAR(500),
  change_detail         JSON,
  status                change_task_status NOT NULL DEFAULT 'draft',
  priority              sandbox_priority NOT NULL DEFAULT 'P2',
  assignee_id           INTEGER,
  project_task_id       INTEGER,
  rollback_instructions TEXT,
  verification_steps    JSON,
  estimated_minutes     INTEGER,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_ctasks_scenario ON sandbox_change_tasks(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_ctasks_status ON sandbox_change_tasks(status);
