import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Gerry123456@localhost:5432/grt_system',
});

const statements = [
  `CREATE TABLE IF NOT EXISTS service_dashboard_kpis (
    id SERIAL PRIMARY KEY,
    category VARCHAR(30) NOT NULL,
    region VARCHAR(30),
    key VARCHAR(50) NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    label VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    updated_by INTEGER,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS service_dashboard_locations (
    id SERIAL PRIMARY KEY,
    region VARCHAR(30) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    country VARCHAR(10) NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    client_name VARCHAR(200),
    equipment_type VARCHAR(200),
    engineer_count INTEGER DEFAULT 0,
    updated_by INTEGER,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sdk_category_region_key ON service_dashboard_kpis(category, region, key)`,
  `CREATE INDEX IF NOT EXISTS idx_sdl_region ON service_dashboard_locations(region)`,
];

for (const sql of statements) {
  try {
    await pool.query(sql);
    console.log('OK:', sql.replace(/\s+/g, ' ').slice(0, 70));
  } catch (e) {
    console.error('ERR:', e.message);
  }
}

await pool.end();
console.log('Done!');
