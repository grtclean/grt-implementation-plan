/**
 * Create Digital Twin Hub tables (raw pg, no Drizzle)
 * Tables: dt_assets, dt_robot_assembly_nodes, iatf_audit_logs
 * Enums: dt_file_format, dt_asset_status, iatf_audit_action
 *
 * Usage: npx tsx scripts/create-digital-twin-tables.ts
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("[digital-twin] Connected to database");

  try {
    await client.query("BEGIN");

    // ── Enums ─────────────────────────────────────────────

    // 1. dt_file_format
    await client.query(`DROP TYPE IF EXISTS dt_file_format CASCADE`);
    await client.query(`
      CREATE TYPE dt_file_format AS ENUM (
        'glb', 'gltf', 'step', 'zw1', 'sldprt', 'sldasm', 'fbx', 'obj', 'stl', 'other'
      )
    `);
    console.log("[digital-twin] Created enum dt_file_format");

    // 2. dt_asset_status
    await client.query(`DROP TYPE IF EXISTS dt_asset_status CASCADE`);
    await client.query(`
      CREATE TYPE dt_asset_status AS ENUM (
        'draft', 'pending_review', 'released', 'obsolete'
      )
    `);
    console.log("[digital-twin] Created enum dt_asset_status");

    // 3. iatf_audit_action
    await client.query(`DROP TYPE IF EXISTS iatf_audit_action CASCADE`);
    await client.query(`
      CREATE TYPE iatf_audit_action AS ENUM (
        'upload', 'approve', 'reject', 'freeze', 'obsolete', 'download', 'delete', 'hash_verify'
      )
    `);
    console.log("[digital-twin] Created enum iatf_audit_action");

    // ── Table 1: dt_assets ────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS dt_assets (
        id                  SERIAL PRIMARY KEY,
        project_id          INTEGER REFERENCES projects(id),
        project_code        VARCHAR(50),
        asset_name          VARCHAR(300) NOT NULL,
        asset_number        VARCHAR(50),
        version             INTEGER NOT NULL DEFAULT 1,
        version_string      VARCHAR(20) DEFAULT 'V1.0',
        previous_version_id INTEGER,

        -- File metadata
        file_format         dt_file_format NOT NULL,
        storage_url         VARCHAR(1000) NOT NULL,
        original_file_name  VARCHAR(500),
        file_size_bytes     BIGINT,
        mime_type           VARCHAR(100),

        -- IATF 16949 compliance
        sha256_hash         VARCHAR(64) NOT NULL,
        status              dt_asset_status NOT NULL DEFAULT 'draft',
        is_latest           BOOLEAN DEFAULT TRUE,
        design_frozen       BOOLEAN DEFAULT FALSE,
        design_frozen_at    TIMESTAMP,
        design_frozen_by    INTEGER REFERENCES users(id),

        -- 3D viewer metadata
        vertex_count        INTEGER,
        face_count          INTEGER,
        bounding_box        JSON,
        thumbnail_url       VARCHAR(500),

        -- Ownership
        owner_user_id       INTEGER REFERENCES users(id),
        owner_name          VARCHAR(128),
        tags                JSON,
        metadata            JSON,
        description         TEXT,

        -- Audit
        created_by          INTEGER REFERENCES users(id),
        updated_by          INTEGER REFERENCES users(id),
        created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[digital-twin] Created table dt_assets");

    // Indexes for dt_assets
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_project_idx ON dt_assets (project_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_format_idx  ON dt_assets (file_format)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_status_idx  ON dt_assets (status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_owner_idx   ON dt_assets (owner_user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_hash_idx    ON dt_assets (sha256_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_latest_idx  ON dt_assets (is_latest)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_assets_frozen_idx  ON dt_assets (design_frozen)`);
    console.log("[digital-twin] Created 7 indexes on dt_assets");

    // ── Table 2: dt_robot_assembly_nodes ──────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS dt_robot_assembly_nodes (
        id                  SERIAL PRIMARY KEY,
        dt_asset_id         INTEGER NOT NULL REFERENCES dt_assets(id),
        part_number         VARCHAR(100) NOT NULL,
        part_name           VARCHAR(300),

        -- Spatial coordinates (mm, world-space)
        position_x          DECIMAL(12,4) NOT NULL,
        position_y          DECIMAL(12,4) NOT NULL,
        position_z          DECIMAL(12,4) NOT NULL,

        -- Rotation (Euler degrees)
        rotation_x          DECIMAL(8,4) DEFAULT 0,
        rotation_y          DECIMAL(8,4) DEFAULT 0,
        rotation_z          DECIMAL(8,4) DEFAULT 0,

        -- Assembly parameters
        assembly_torque_nm  DECIMAL(8,2),
        assembly_sequence   INTEGER,
        tool_required       VARCHAR(100),
        grip_type           VARCHAR(50),
        safety_clearance_mm DECIMAL(8,2),
        node_type           VARCHAR(30) DEFAULT 'part',
        instructions        TEXT,
        metadata            JSON,

        -- Audit
        created_by          INTEGER REFERENCES users(id),
        created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[digital-twin] Created table dt_robot_assembly_nodes");

    // Indexes for dt_robot_assembly_nodes
    await client.query(`CREATE INDEX IF NOT EXISTS dt_robot_nodes_asset_idx    ON dt_robot_assembly_nodes (dt_asset_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_robot_nodes_part_idx     ON dt_robot_assembly_nodes (part_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS dt_robot_nodes_sequence_idx ON dt_robot_assembly_nodes (assembly_sequence)`);
    console.log("[digital-twin] Created 3 indexes on dt_robot_assembly_nodes");

    // ── Table 3: iatf_audit_logs ─────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS iatf_audit_logs (
        id                  SERIAL PRIMARY KEY,
        asset_id            INTEGER NOT NULL REFERENCES dt_assets(id),
        action              iatf_audit_action NOT NULL,
        actor_id            INTEGER NOT NULL REFERENCES users(id),
        actor_name          VARCHAR(128),
        timestamp_utc       TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address          VARCHAR(45),
        user_agent          VARCHAR(500),
        hash_at_action      VARCHAR(64),
        previous_status     VARCHAR(30),
        new_status          VARCHAR(30),
        asset_version       INTEGER,
        details             TEXT,
        metadata            JSON,
        created_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[digital-twin] Created table iatf_audit_logs");

    // Indexes for iatf_audit_logs
    await client.query(`CREATE INDEX IF NOT EXISTS iatf_audit_asset_idx     ON iatf_audit_logs (asset_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS iatf_audit_action_idx    ON iatf_audit_logs (action)`);
    await client.query(`CREATE INDEX IF NOT EXISTS iatf_audit_actor_idx     ON iatf_audit_logs (actor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS iatf_audit_timestamp_idx ON iatf_audit_logs (timestamp_utc)`);
    console.log("[digital-twin] Created 4 indexes on iatf_audit_logs");

    await client.query("COMMIT");
    console.log("[digital-twin] All 3 tables + 3 enums + 14 indexes created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[digital-twin] Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
