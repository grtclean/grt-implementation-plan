-- 0054: Customer Reading Channels + 徐州明新旭腾 seed data
-- 客户授权阅读推荐通道 + 新客户档案

-- Enum
DO $$ BEGIN
  CREATE TYPE reading_access_level AS ENUM ('full','view_only','restricted','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. customer_reading_channels
CREATE TABLE IF NOT EXISTS customer_reading_channels (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER NOT NULL,
  doc_category      VARCHAR(50) NOT NULL,
  doc_category_label VARCHAR(100),
  access_level      reading_access_level NOT NULL DEFAULT 'restricted',
  access_tier       INTEGER NOT NULL DEFAULT 1,
  is_viewable       BOOLEAN NOT NULL DEFAULT FALSE,
  is_downloadable   BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_reason TEXT,
  channel_notes     TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crc_profile_id ON customer_reading_channels(profile_id);
CREATE INDEX IF NOT EXISTS idx_crc_doc_category ON customer_reading_channels(doc_category);
CREATE INDEX IF NOT EXISTS idx_crc_access_tier ON customer_reading_channels(access_tier);

-- ═══════════════════════════════════════════════════════════
-- Seed: 徐州明新旭腾新材料科技有限公司
-- ═══════════════════════════════════════════════════════════

INSERT INTO strategic_customer_profiles (customer_id, company_name, company_name_en, cooperation_tier, status, industry, website_url, city, province, annual_revenue, employee_count, founded_year, tags, notes, primary_contact)
VALUES (
  'MXXT_320300',
  '徐州明新旭腾新材料科技有限公司',
  'Xuzhou Mingxin Xuteng New Materials Technology Co., Ltd.',
  'V1_Key_Account',
  'active',
  '汽车内饰/新材料/皮革',
  'www.mingxinxuteng.com',
  '徐州',
  '江苏',
  '5亿+',
  800,
  2008,
  '["汽车内饰","新材料","超纤皮革","环保材料"]',
  '专注汽车内饰新材料，超纤皮革行业领先。产品覆盖座椅、方向盘、门板等汽车内饰件。',
  '王经理'
) ON CONFLICT DO NOTHING;

-- Brand aesthetics for 明新旭腾
INSERT INTO customer_brand_aesthetics (profile_id, source_url, primary_color_hex, secondary_color_hex, visual_style, core_vision, brand_keywords)
SELECT id, 'www.mingxinxuteng.com', '#1B5E20', '#E65100', 'Green_Sustainability',
  '["创新材料科技，引领绿色出行","超纤皮革行业标杆"]',
  '["环保绿","新材料","汽车内饰","可持续","品质"]'
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

-- Standards mappings for 明新旭腾
INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score, is_verified)
SELECT id, 1,
  '汽车内饰件表面处理工艺精度要求极高 (色差/纹理一致性)',
  'GRT视觉检测AI + 色差比对引擎 — 降低人工目检漏检率',
  '工艺匹配', 88, true
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score, is_verified)
SELECT id, 2,
  'OEM主机厂验收标准严苛 (IATF 16949 + 客户专项)',
  'M0-M12项目管理 + FAT/SAT双重验收追踪 + 满意度闭环',
  '验收管理', 92, true
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

INSERT INTO customer_standards_mappings (profile_id, sort_order, customer_standard, grt_matched_value, category, confidence_score)
SELECT id, 3,
  '环保法规日趋严格 / VOC排放控制',
  '能耗与排放监控底座 + 碳足迹追溯',
  'ESG', 75
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

-- Product interlocks for 明新旭腾
INSERT INTO customer_product_interlocks (profile_id, sort_order, timeline, customer_product, grt_matched_solution, project_ref)
SELECT id, 1, 'present',
  '汽车座椅超纤皮革覆面自动化产线',
  'GRT输送系统 + 自动化裁切上料 + MES集成',
  'GRT058'
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

INSERT INTO customer_product_interlocks (profile_id, sort_order, timeline, customer_product, grt_matched_solution, project_ref)
SELECT id, 2, 'present',
  '方向盘/门板内饰件包覆线',
  'GRT柔性输送 + 在线视觉检测 + 工序报工',
  'GRT059'
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

INSERT INTO customer_product_interlocks (profile_id, sort_order, timeline, customer_product, grt_matched_solution)
SELECT id, 3, 'future',
  '新能源汽车轻量化内饰件自动化升级',
  '3.2期：AI排产优化 + 数字孪生产线仿真'
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';

-- ═══════════════════════════════════════════════════════════
-- Reading channels for 美利信 (V0 = Tier 4 战略合作)
-- ═══════════════════════════════════════════════════════════

INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'operation_manual', '操作手册', 'full', 4, true, true, '战略伙伴全权限 — 设备操作基础文档', 1
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'maintenance_manual', '维护保养手册', 'full', 4, true, true, '8800T压铸岛维护必备', 2
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'electrical_drawing', '电气图纸', 'full', 4, true, true, '战略合作伙伴 — 电气调试参考', 3
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'plc_source_code', 'PLC源代码', 'full', 4, true, true, '战略合作 — 源代码共享 (NDA保护)', 4
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'design_rationale', '设计依据', 'full', 4, true, true, '战略合作 — 设计理念完全共享', 5
FROM strategic_customer_profiles WHERE customer_id = 'MILLISON_301307';

-- ═══════════════════════════════════════════════════════════
-- Reading channels for 明新旭腾 (V1 = Tier 2 技术联系人)
-- ═══════════════════════════════════════════════════════════

INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'operation_manual', '操作手册', 'full', 2, true, true, '基础操作文档 — 产线交付必备', 1
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'maintenance_manual', '维护保养手册', 'full', 2, true, true, '设备日常维护参考', 2
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'basic_wiring', '基础接线图', 'full', 2, true, true, '接线安装参考', 3
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'electrical_drawing', '电气图纸', 'full', 2, true, true, '技术联系人 — 电气调试参考', 4
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'bom', 'BOM清单', 'full', 2, true, true, '技术联系人 — 备件采购参考', 5
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'fat_certificate', 'FAT验收证书', 'full', 2, true, true, '出厂验收记录', 6
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'sat_certificate', 'SAT验收证书', 'full', 2, true, true, '现场验收记录', 7
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'plc_source_code', 'PLC源代码', 'blocked', 2, false, false, '技术联系人级别 — PLC源代码不开放', 8
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
INSERT INTO customer_reading_channels (profile_id, doc_category, doc_category_label, access_level, access_tier, is_viewable, is_downloadable, recommended_reason, sort_order)
SELECT id, 'design_rationale', '设计依据', 'blocked', 2, false, false, '技术联系人级别 — 设计依据不开放', 9
FROM strategic_customer_profiles WHERE customer_id = 'MXXT_320300';
