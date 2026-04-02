-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 0024: Enterprise Document Governance Platform    ║
-- ║  企业文档治理平台 — 6 tables, 30+ indexes                     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── Table 1: Document Registry (395 initial rows) ───────────
CREATE TABLE IF NOT EXISTS org_document_registry (
  id              SERIAL PRIMARY KEY,
  doc_code        VARCHAR(80)  NOT NULL,
  title           VARCHAR(500) NOT NULL,
  title_en        VARCHAR(500),
  description     TEXT,

  domain          VARCHAR(100) NOT NULL,
  subdomain       VARCHAR(100) NOT NULL,
  doc_type        VARCHAR(30)  NOT NULL,
  status          VARCHAR(30)  NOT NULL DEFAULT 'active',

  file_path       VARCHAR(500),
  markdown_content TEXT,
  content_hash    VARCHAR(64),

  current_version VARCHAR(20)  NOT NULL DEFAULT 'V1.0',
  version_major   INTEGER      NOT NULL DEFAULT 1,
  version_minor   INTEGER      NOT NULL DEFAULT 0,
  total_versions  INTEGER      NOT NULL DEFAULT 1,

  owner_role      VARCHAR(50),
  owner_user_id   INTEGER,
  approver_role   VARCHAR(50),

  bu_code         VARCHAR(50),
  all_bus         BOOLEAN      NOT NULL DEFAULT true,

  review_frequency  VARCHAR(30),
  last_reviewed_at  TIMESTAMP,
  next_review_due_at TIMESTAMP,
  review_overdue    BOOLEAN NOT NULL DEFAULT false,

  system_routes   JSONB,
  system_roles    JSONB,
  tags            JSONB,
  related_doc_ids JSONB,

  usage_count     INTEGER NOT NULL DEFAULT 0,
  view_count      INTEGER NOT NULL DEFAULT 0,
  download_count  INTEGER NOT NULL DEFAULT 0,

  created_by      INTEGER,
  updated_by      INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_doc_registry_uk_doc_code    ON org_document_registry (doc_code);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_domain            ON org_document_registry (domain);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_subdomain         ON org_document_registry (subdomain);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_doc_type          ON org_document_registry (doc_type);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_status            ON org_document_registry (status);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_owner_role        ON org_document_registry (owner_role);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_bu_code           ON org_document_registry (bu_code);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_review_overdue    ON org_document_registry (review_overdue);
CREATE INDEX IF NOT EXISTS org_doc_registry_idx_file_path         ON org_document_registry (file_path);

-- ─── Table 2: Document Versions ──────────────────────────────
CREATE TABLE IF NOT EXISTS org_document_versions (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL,

  version_string  VARCHAR(20) NOT NULL,
  version_major   INTEGER     NOT NULL,
  version_minor   INTEGER     NOT NULL,

  markdown_content TEXT,
  content_hash    VARCHAR(64),

  change_reason   TEXT,
  change_type     VARCHAR(20) NOT NULL,

  created_by      INTEGER,
  created_by_name VARCHAR(100),
  is_latest       BOOLEAN NOT NULL DEFAULT true,

  review_status   VARCHAR(30) NOT NULL DEFAULT 'approved',
  reviewed_by     INTEGER,
  reviewed_at     TIMESTAMP,
  review_comment  TEXT,

  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS org_doc_versions_idx_document      ON org_document_versions (document_id);
CREATE INDEX IF NOT EXISTS org_doc_versions_idx_latest        ON org_document_versions (document_id, is_latest);
CREATE INDEX IF NOT EXISTS org_doc_versions_idx_review_status ON org_document_versions (review_status);

-- ─── Table 3: Document Instances ─────────────────────────────
CREATE TABLE IF NOT EXISTS org_document_instances (
  id                    SERIAL PRIMARY KEY,
  instance_code         VARCHAR(50)  NOT NULL,

  template_id           INTEGER      NOT NULL,
  template_version      VARCHAR(20),

  title                 VARCHAR(500) NOT NULL,
  description           TEXT,
  markdown_content      TEXT,
  form_data             JSONB,

  project_id            INTEGER,
  project_code          VARCHAR(50),
  bu_code               VARCHAR(50),
  stage_code            VARCHAR(20),

  status                VARCHAR(30) NOT NULL DEFAULT 'draft',
  approval_flow_id      INTEGER,
  current_approver_id   INTEGER,
  current_approval_step INTEGER DEFAULT 0,
  approved_at           TIMESTAMP,

  created_by            INTEGER,
  created_by_name       VARCHAR(100),
  updated_by            INTEGER,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_doc_instances_uk_code    ON org_document_instances (instance_code);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_template      ON org_document_instances (template_id);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_project       ON org_document_instances (project_id);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_bu            ON org_document_instances (bu_code);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_status        ON org_document_instances (status);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_stage         ON org_document_instances (stage_code);
CREATE INDEX IF NOT EXISTS org_doc_instances_idx_created       ON org_document_instances (created_at);

-- ─── Table 4: Document Links (Cross-References) ──────────────
CREATE TABLE IF NOT EXISTS org_document_links (
  id              SERIAL PRIMARY KEY,
  source_doc_id   INTEGER NOT NULL,
  target_doc_id   INTEGER,

  target_type     VARCHAR(30) NOT NULL,
  target_entity_id INTEGER,
  target_path     VARCHAR(500),

  link_type       VARCHAR(30) NOT NULL,
  description     TEXT,

  created_by      INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS org_doc_links_idx_source      ON org_document_links (source_doc_id);
CREATE INDEX IF NOT EXISTS org_doc_links_idx_target_doc  ON org_document_links (target_doc_id);
CREATE INDEX IF NOT EXISTS org_doc_links_idx_target_type ON org_document_links (target_type);
CREATE INDEX IF NOT EXISTS org_doc_links_idx_link_type   ON org_document_links (link_type);

-- ─── Table 5: Audit Log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_document_audit_log (
  id           SERIAL PRIMARY KEY,
  document_id  INTEGER,
  instance_id  INTEGER,

  action       VARCHAR(30)  NOT NULL,
  user_id      INTEGER,
  user_name    VARCHAR(100),
  user_role    VARCHAR(50),

  details      JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS org_doc_audit_idx_document ON org_document_audit_log (document_id);
CREATE INDEX IF NOT EXISTS org_doc_audit_idx_instance ON org_document_audit_log (instance_id);
CREATE INDEX IF NOT EXISTS org_doc_audit_idx_user     ON org_document_audit_log (user_id);
CREATE INDEX IF NOT EXISTS org_doc_audit_idx_action   ON org_document_audit_log (action);
CREATE INDEX IF NOT EXISTS org_doc_audit_idx_created  ON org_document_audit_log (created_at);

-- ─── Table 6: Review Schedule ────────────────────────────────
CREATE TABLE IF NOT EXISTS org_document_review_schedule (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL,
  scheduled_date  TIMESTAMP NOT NULL,

  reviewer_id     INTEGER,
  reviewer_name   VARCHAR(100),

  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  completed_at    TIMESTAMP,
  result_version_id INTEGER,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS org_doc_review_idx_document  ON org_document_review_schedule (document_id);
CREATE INDEX IF NOT EXISTS org_doc_review_idx_status    ON org_document_review_schedule (status);
CREATE INDEX IF NOT EXISTS org_doc_review_idx_scheduled ON org_document_review_schedule (scheduled_date);
CREATE INDEX IF NOT EXISTS org_doc_review_idx_reviewer  ON org_document_review_schedule (reviewer_id);
