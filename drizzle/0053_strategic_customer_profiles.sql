-- 0053: Strategic Customer Profiles — 客户商业档案契约
-- 5 tables for brand aesthetics, standards mapping, product interlock

-- Enums
DO $$ BEGIN
  CREATE TYPE cooperation_tier AS ENUM ('V0_Strategic_Partner','V1_Key_Account','V2_Standard','V3_Prospect','V4_Dormant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE visual_style AS ENUM ('Tech_Premium_Industrial','Clean_Minimalist','Bold_Engineering','Corporate_Classic','Green_Sustainability');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interlock_timeline AS ENUM ('past','present','future');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_profile_status AS ENUM ('draft','active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. strategic_customer_profiles
CREATE TABLE IF NOT EXISTS strategic_customer_profiles (
  id              SERIAL PRIMARY KEY,
  customer_id     VARCHAR(50)   NOT NULL,
  company_name    VARCHAR(200)  NOT NULL,
  company_name_en VARCHAR(200),
  cooperation_tier cooperation_tier NOT NULL DEFAULT 'V2_Standard',
  status          customer_profile_status NOT NULL DEFAULT 'draft',
  primary_contact VARCHAR(100),
  contact_email   VARCHAR(200),
  contact_phone   VARCHAR(50),
  address         TEXT,
  city            VARCHAR(100),
  province        VARCHAR(100),
  industry        VARCHAR(100),
  annual_revenue  VARCHAR(50),
  employee_count  INTEGER,
  founded_year    INTEGER,
  website_url     VARCHAR(300),
  stock_code      VARCHAR(20),
  first_project_date TIMESTAMP,
  total_project_count INTEGER DEFAULT 0,
  total_contract_value VARCHAR(50),
  account_manager_id   INTEGER,
  account_manager_name VARCHAR(100),
  tags            JSON,
  notes           TEXT,
  created_by_user_id INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scp_customer_id ON strategic_customer_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_scp_company_name ON strategic_customer_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_scp_cooperation_tier ON strategic_customer_profiles(cooperation_tier);
CREATE INDEX IF NOT EXISTS idx_scp_status ON strategic_customer_profiles(status);

-- 2. customer_brand_aesthetics
CREATE TABLE IF NOT EXISTS customer_brand_aesthetics (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER NOT NULL,
  source_url        VARCHAR(500),
  primary_color_hex VARCHAR(7),
  secondary_color_hex VARCHAR(7),
  accent_color_hex  VARCHAR(7),
  visual_style      visual_style NOT NULL DEFAULT 'Tech_Premium_Industrial',
  font_preference   VARCHAR(100),
  logo_url          VARCHAR(500),
  core_vision       JSON,
  brand_keywords    JSON,
  design_notes      TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cba_profile_id ON customer_brand_aesthetics(profile_id);

-- 3. customer_standards_mappings
CREATE TABLE IF NOT EXISTS customer_standards_mappings (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  customer_standard TEXT NOT NULL,
  grt_matched_value TEXT NOT NULL,
  category          VARCHAR(50),
  confidence_score  INTEGER,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_user_id INTEGER,
  notes             TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csm_profile_id ON customer_standards_mappings(profile_id);

-- 4. customer_product_interlocks
CREATE TABLE IF NOT EXISTS customer_product_interlocks (
  id                  SERIAL PRIMARY KEY,
  profile_id          INTEGER NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  timeline            interlock_timeline NOT NULL DEFAULT 'present',
  customer_product    TEXT NOT NULL,
  grt_matched_solution TEXT NOT NULL,
  project_ref         VARCHAR(100),
  status              VARCHAR(30) DEFAULT 'active',
  notes               TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpi_profile_id ON customer_product_interlocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_cpi_timeline ON customer_product_interlocks(timeline);

-- 5. customer_profile_snapshots
CREATE TABLE IF NOT EXISTS customer_profile_snapshots (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER NOT NULL,
  snapshot_data     JSON NOT NULL,
  change_reason     TEXT,
  changed_by_user_id INTEGER,
  changed_by_name   VARCHAR(100),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cps_profile_id ON customer_profile_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_cps_created_at ON customer_profile_snapshots(created_at);

-- ═══════════════════════════════════════════════════════════
-- Seed: 重庆美利信科技股份有限公司 (Millison)
-- ═══════════════════════════════════════════════════════════

INSERT INTO strategic_customer_profiles (customer_id, company_name, company_name_en, cooperation_tier, status, industry, website_url, stock_code, city, province, annual_revenue, employee_count, founded_year, tags, notes)
VALUES (
  'MILLISON_301307',
  '重庆美利信科技股份有限公司',
  'Chongqing Millison Technologies Inc.',
  'V0_Strategic_Partner',
  'active',
  '压铸/新能源汽车/5G通信',
  'www.millison.com.cn',
  '301307.SZ',
  '重庆',
  '重庆',
  '30亿+',
  5000,
  2005,
  '["国家级绿色工厂","压铸龙头","新能源汽车","5G基站"]',
  '链主企业，8800T超大型压铸岛。创造美好的沟通和低碳生活。'
) ON CONFLICT DO NOTHING;

-- Brand aesthetics for Millison
INSERT INTO customer_brand_aesthetics (profile_id, source_url, primary_color_hex, visual_style, core_vision, brand_keywords)
SELECT id, 'www.millison.com.cn', '#004B87', 'Tech_Premium_Industrial',
  '["创造美好的沟通和低碳生活","国家级绿色工厂"]',
  '["工业科技蓝","极简","重工","科技感","低碳"]'
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

-- Standards mappings for Millison
INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score)
SELECT id, 1,
  '8800T超大型压铸岛工艺容错率极低',
  '20%价值赋予：输送工程设计与工艺流程AI智能体 (降低试错成本)',
  '工艺匹配', 90
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score)
SELECT id, 2,
  '链主企业极严苛的连年降本要求',
  '每年 10% 项目成本报价自动寻优推演模型',
  '成本优化', 85
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score)
SELECT id, 3,
  '高耗能重资产 / ESG评级诉求',
  '3.2期：能耗 0 排放动态监控与碳足迹溯源底座',
  'ESG', 80
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

-- Product interlocks for Millison
INSERT INTO customer_product_interlocks (profile_id, sort_order, timeline, customer_product, grt_matched_solution)
SELECT id, 1, 'present',
  '5G通信基站结构件 / 新能源汽车三电系统壳体',
  'M0-M12 全生命周期极高稳定性防呆体系 / PM辅助提醒'
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

INSERT INTO customer_product_interlocks (profile_id, sort_order, timeline, customer_product, grt_matched_solution)
SELECT id, 2, 'future',
  '黑灯工厂 / 极高频重载物料流转',
  '3.3期：人型机器人 (Figure/Optimus 等) 模型与协同算力 API 预留'
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';
