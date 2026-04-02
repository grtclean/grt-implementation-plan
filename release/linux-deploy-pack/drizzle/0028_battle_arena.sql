-- Battle Arena & War Room — 斗兽场排名 & 月度战情室
-- Tables: monthly_battle_reports, global_arena_rankings

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE arena_entity_type AS ENUM ('SALES', 'ENGINEER', 'DIVISION', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE arena_bonus_tier AS ENUM ('S', 'A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE battle_report_status AS ENUM ('ai_draft', 'user_submitted', 'reviewed', 'locked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table 1: monthly_battle_reports ──
CREATE TABLE IF NOT EXISTS monthly_battle_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  period VARCHAR(7) NOT NULL,
  ai_generated_summary TEXT,
  actual_vs_target_kpi JSON,
  improvement_action_plan TEXT,
  ai_tactical_suggestions JSON,
  meeting_highlights JSON,
  status battle_report_status NOT NULL DEFAULT 'ai_draft',
  generation_task_id INTEGER,
  bu_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT monthly_battle_reports_user_period_uniq UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS monthly_battle_reports_period_idx ON monthly_battle_reports (period);
CREATE INDEX IF NOT EXISTS monthly_battle_reports_status_idx ON monthly_battle_reports (status);
CREATE INDEX IF NOT EXISTS monthly_battle_reports_bu_idx ON monthly_battle_reports (bu_code);

-- ── Table 2: global_arena_rankings ──
CREATE TABLE IF NOT EXISTS global_arena_rankings (
  id SERIAL PRIMARY KEY,
  period VARCHAR(7) NOT NULL,
  entity_type arena_entity_type NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_name VARCHAR(200),
  comprehensive_score DECIMAL(6,2) NOT NULL,
  rank_position INTEGER NOT NULL,
  total_in_category INTEGER NOT NULL DEFAULT 0,
  bonus_tier arena_bonus_tier NOT NULL,
  score_breakdown JSON,
  bonus_multiplier DECIMAL(4,2) DEFAULT 1.00,
  previous_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  bu_code VARCHAR(50),
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT global_arena_rankings_period_type_entity_uniq UNIQUE (period, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS global_arena_rankings_period_idx ON global_arena_rankings (period);
CREATE INDEX IF NOT EXISTS global_arena_rankings_type_idx ON global_arena_rankings (entity_type);
CREATE INDEX IF NOT EXISTS global_arena_rankings_rank_idx ON global_arena_rankings (rank_position);
CREATE INDEX IF NOT EXISTS global_arena_rankings_tier_idx ON global_arena_rankings (bonus_tier);
