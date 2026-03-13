-- ══════════════════════════════════════════════════════════════
-- 机械配置标准治理平台  Mechanical Configuration Standards
-- CTO: Standards architecture, knowledge graph, quotation
--       compliance, customer config checklists, acceptance
-- ══════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE mech_std_origin AS ENUM ('GRT_INTERNAL','ISO','DIN','EN','GB','ASME','JIS','OEM_CUSTOMER','INDUSTRY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mech_std_category AS ENUM ('structural_frame','material_selection','surface_treatment','welding','fastener','sealing','pneumatic_hydraulic','piping_routing','thermal_management','noise_vibration','ergonomic_access','safety_guarding','appearance_paint','packaging_shipping');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mech_std_status AS ENUM ('draft','under_review','active','superseded','deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mech_link_type AS ENUM ('derives_from','supersedes','conflicts_with','requires','references','complements');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mech_check_status AS ENUM ('NOT_CHECKED','PASS','FAIL','WAIVED','N_A');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mech_acceptance_result AS ENUM ('PENDING','ACCEPTED','CONDITIONAL','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table 1: mechanical_standards ──────────────────────────

CREATE TABLE IF NOT EXISTS mechanical_standards (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  origin mech_std_origin NOT NULL,
  category mech_std_category NOT NULL,
  title VARCHAR(500) NOT NULL,
  title_en VARCHAR(500),
  description TEXT,
  version VARCHAR(30) NOT NULL,
  reference_doc VARCHAR(300),
  reference_url VARCHAR(500),
  applicable_regions JSON,
  applicable_materials JSON,
  key_requirements JSON,
  inspection_methods JSON,
  tolerance_class VARCHAR(50),
  status mech_std_status NOT NULL DEFAULT 'active',
  effective_date TIMESTAMPTZ,
  superseded_by INTEGER,
  tags JSON,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ms_code_ver ON mechanical_standards(code, version);
CREATE INDEX IF NOT EXISTS idx_ms_origin ON mechanical_standards(origin);
CREATE INDEX IF NOT EXISTS idx_ms_category ON mechanical_standards(category);

-- ── Table 2: mech_customer_configs ─────────────────────────

CREATE TABLE IF NOT EXISTS mech_customer_configs (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_code VARCHAR(50),
  region VARCHAR(20) NOT NULL,
  frame_material VARCHAR(100),
  surface_finish VARCHAR(200),
  welding_standard VARCHAR(100),
  tolerance_grade VARCHAR(50),
  ip_rating VARCHAR(20),
  cleanroom_class VARCHAR(50),
  pneumatics_brand VARCHAR(100),
  hydraulics_pressure VARCHAR(50),
  cable_routing_spec VARCHAR(200),
  paint_color_code VARCHAR(50),
  noise_limit VARCHAR(50),
  vibration_limit VARCHAR(100),
  packaging_spec VARCHAR(200),
  safety_guard_spec VARCHAR(200),
  fastener_standard VARCHAR(100),
  document_languages JSON,
  special_requirements TEXT,
  overlay_standard_ids JSON,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bu_code VARCHAR(20),
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcc_customer ON mech_customer_configs(customer_name);

-- ── Table 3: mech_config_line_items ────────────────────────

CREATE TABLE IF NOT EXISTS mech_config_line_items (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES mech_customer_configs(id) ON DELETE CASCADE,
  category mech_std_category NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(300) NOT NULL,
  specification TEXT,
  standard_id INTEGER REFERENCES mechanical_standards(id),
  brand VARCHAR(100),
  alternative_brands JSON,
  quantity_formula VARCHAR(200),
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcli_config ON mech_config_line_items(config_id);

-- ── Table 4: mech_standard_links (Knowledge Graph) ────────

CREATE TABLE IF NOT EXISTS mech_standard_links (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES mechanical_standards(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES mechanical_standards(id) ON DELETE CASCADE,
  link_type mech_link_type NOT NULL,
  description VARCHAR(300),
  strength INTEGER DEFAULT 50,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_msl_pair ON mech_standard_links(source_id, target_id, link_type);

-- ── Table 5: mech_project_selections ──────────────────────

CREATE TABLE IF NOT EXISTS mech_project_selections (
  id SERIAL PRIMARY KEY,
  project_id INTEGER,
  project_code VARCHAR(50) NOT NULL,
  project_name VARCHAR(300),
  customer_config_id INTEGER REFERENCES mech_customer_configs(id),
  applicable_phases JSON,
  selected_standard_ids JSON,
  design_basis JSON,
  locked_at TIMESTAMPTZ,
  locked_by INTEGER,
  notes TEXT,
  bu_code VARCHAR(20),
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mps_project ON mech_project_selections(project_code);

-- ── Table 6: mech_quotation_checks ────────────────────────

CREATE TABLE IF NOT EXISTS mech_quotation_checks (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(50) NOT NULL,
  quotation_number VARCHAR(50) NOT NULL,
  customer_config_id INTEGER,
  check_item VARCHAR(500) NOT NULL,
  category mech_std_category NOT NULL,
  standard_id INTEGER REFERENCES mechanical_standards(id),
  customer_requirement TEXT,
  grt_proposal TEXT,
  compliance_status mech_check_status NOT NULL DEFAULT 'NOT_CHECKED',
  deviation_note TEXT,
  cost_impact VARCHAR(100),
  checked_by INTEGER,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mqc_project ON mech_quotation_checks(project_code);
CREATE INDEX IF NOT EXISTS idx_mqc_quotation ON mech_quotation_checks(quotation_number);

-- ── Table 7: mech_phase_checklists ────────────────────────

CREATE TABLE IF NOT EXISTS mech_phase_checklists (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(50) NOT NULL,
  standard_id INTEGER,
  standard_code VARCHAR(80),
  phase VARCHAR(10) NOT NULL,
  check_item VARCHAR(500) NOT NULL,
  check_method TEXT,
  acceptance_criteria TEXT,
  status mech_check_status NOT NULL DEFAULT 'NOT_CHECKED',
  checked_by INTEGER,
  checked_at TIMESTAMPTZ,
  evidence VARCHAR(500),
  deviation_note TEXT,
  waiver_approved_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpc_project ON mech_phase_checklists(project_code);
CREATE INDEX IF NOT EXISTS idx_mpc_phase ON mech_phase_checklists(phase);

-- ── Table 8: mech_acceptance_records ──────────────────────

CREATE TABLE IF NOT EXISTS mech_acceptance_records (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(50) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  acceptance_phase VARCHAR(30) NOT NULL,
  check_item VARCHAR(500) NOT NULL,
  category mech_std_category NOT NULL,
  standard_id INTEGER,
  result mech_acceptance_result NOT NULL DEFAULT 'PENDING',
  score REAL,
  customer_comment TEXT,
  corrective_action TEXT,
  inspector_name VARCHAR(100),
  inspected_at TIMESTAMPTZ,
  evidence_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mar_project ON mech_acceptance_records(project_code);
CREATE INDEX IF NOT EXISTS idx_mar_result ON mech_acceptance_records(result);

-- ── Table 9: mech_review_rules ────────────────────────────

CREATE TABLE IF NOT EXISTS mech_review_rules (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(10) NOT NULL,
  origin mech_std_origin NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  checklist_template JSON,
  required_approvers JSON,
  is_blocking BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mrr_phase_rule ON mech_review_rules(phase, rule_code);

-- ══════════════════════════════════════════════════════════════
-- ── SEED: GRT Mechanical Standards Library ────────────────────
-- ══════════════════════════════════════════════════════════════

INSERT INTO mechanical_standards (code, origin, category, title, title_en, version, key_requirements, inspection_methods, tolerance_class, applicable_regions, applicable_materials, tags) VALUES
-- GRT Internal Standards
('GRT-MS-001', 'GRT_INTERNAL', 'structural_frame', 'GRT焊接件通用设计规范', 'GRT Weldment General Design Standard', '3.2',
 '["焊缝等级≥2级(GB/T 12469)","去应力退火处理","底座平面度≤0.5mm/m","所有钢板下料前需矫平"]',
 '["焊缝外观检查","UT探伤(关键承载焊缝)","CMM三坐标测量","平面度检测"]',
 'ISO 2768-mK', '["CN","EU","US"]', '["Q235B","Q345B","S355J2"]', '["结构","焊接","GRT核心"]'),

('GRT-MS-002', 'GRT_INTERNAL', 'surface_treatment', 'GRT表面处理与涂装标准', 'GRT Surface Treatment & Painting Standard', '2.5',
 '["前处理: 抛丸Sa2.5级","底漆: 环氧富锌 40μm","面漆: 聚氨酯 60μm","总膜厚≥100μm","盐雾测试≥500h"]',
 '["膜厚仪检测","附着力测试(ISO 2409划格法)","盐雾试验(GB/T 10125)","光泽度测试"]',
 NULL, '["GLOBAL"]', '["碳钢","合金钢"]', '["涂装","防腐","GRT核心"]'),

('GRT-MS-003', 'GRT_INTERNAL', 'fastener', 'GRT紧固件选型与扭矩标准', 'GRT Fastener Selection & Torque Standard', '2.0',
 '["结构件≥8.8级高强螺栓","不锈钢件用A2-70/A4-80","所有关键连接需Nordlock防松","扭矩按VDI 2230计算","标记扭矩值于图纸"]',
 '["扭矩扳手验证","防松标记检查","螺栓等级目视确认"]',
 NULL, '["GLOBAL"]', NULL, '["紧固件","扭矩","防松"]'),

('GRT-MS-004', 'GRT_INTERNAL', 'pneumatic_hydraulic', 'GRT气动系统设计标准', 'GRT Pneumatic System Design Standard', '2.3',
 '["工作压力标定6bar(除特殊要求)","FRL组合件每个气动岛配1套","气管颜色编码: 蓝=主管 透明=支管","所有接头使用快插式","泄漏测试保压10min压降<0.1bar"]',
 '["气密性测试","流量测试","动作速度检测","压降测试"]',
 NULL, '["GLOBAL"]', NULL, '["气动","SMC","Festo"]'),

('GRT-MS-005', 'GRT_INTERNAL', 'packaging_shipping', 'GRT设备包装运输标准', 'GRT Equipment Packaging & Shipping Standard', '1.8',
 '["国内: 缠绕膜+角铁固定","出口: ISPM 15熏蒸木箱","海运: VCI防锈+硅胶干燥剂+集装箱加固","所有可拆件需编号标记","随机文件密封防水袋"]',
 '["包装完整性检查","固定点强度验证","防锈措施确认","标记清晰度检查"]',
 NULL, '["GLOBAL"]', NULL, '["包装","运输","出口"]'),

-- ISO / International Standards
('ISO 2768-mK', 'ISO', 'structural_frame', 'ISO通用公差 中等精度+角度K级', 'General tolerances — Medium/Coarse', '1989',
 '["线性尺寸公差m级","角度公差K级","适用于未注公差尺寸","机加工件+焊接件均适用"]',
 '["卡尺测量","CMM三坐标","角度规"]',
 'ISO 2768-mK', '["GLOBAL"]', NULL, '["公差","通用","基础"]'),

('ISO 12100', 'ISO', 'safety_guarding', '机械安全 — 设计通则 风险评估与降低', 'Safety of machinery — General principles for design', '2010',
 '["三步法: 本质安全→防护措施→使用信息","风险评估矩阵(严重性×概率×频率)","安全距离按ISO 13857","急停按ISO 13850"]',
 '["风险评估文档审查","安全距离测量","急停功能测试","安全围栏完整性"]',
 NULL, '["GLOBAL"]', NULL, '["安全","风险评估","CE"]'),

('ISO 14120', 'ISO', 'safety_guarding', '机械安全 — 固定式和活动式防护装置', 'Guards — General requirements for design', '2015',
 '["固定防护:开口<6mm或安全距离","活动防护:需联锁","观察窗:聚碳酸酯≥3mm","网格围栏:开口≤20×20mm"]',
 '["防护装置尺寸检查","开口测量","联锁功能测试","材料强度验证"]',
 NULL, '["GLOBAL"]', NULL, '["安全","围栏","防护"]'),

-- DIN / EN Standards
('DIN EN 1090-2', 'DIN', 'welding', '钢结构执行 — 技术要求(EXC等级)', 'Execution of steel structures — Technical requirements', '2018',
 '["EXC1: 简单静态结构","EXC2: 多数工业设备(GRT默认)","EXC3: 疲劳载荷结构","焊工资质EN ISO 9606-1","焊接工艺评定EN ISO 15614"]',
 '["焊缝外观(ISO 5817 C级)","RT/UT探伤(EXC2≥10%)","焊工资质证书检查","WPS验证"]',
 NULL, '["EU"]', '["S235","S275","S355"]', '["焊接","钢结构","CE"]'),

('EN 13480', 'EN', 'piping_routing', '工业金属管道', 'Metallic industrial piping', '2017',
 '["设计压力计算按EN 13480-3","管道支架间距按表格","焊接按EN 13480-4","检验按EN 13480-5","标识涂色按ISO 14726"]',
 '["压力测试(1.5×设计压力)","焊缝检验","支架安装检查","管道标识检查"]',
 NULL, '["EU"]', '["碳钢管","不锈钢管"]', '["管道","压力","CE"]'),

-- GB / China Standards
('GB/T 1804', 'GB', 'structural_frame', '一般公差 未注公差的线性和角度尺寸的公差', 'General tolerances for linear and angular dimensions', '2000',
 '["f级(精密)","m级(中等)","c级(粗糙)","v级(最粗)","对应ISO 2768"]',
 '["卡尺","千分尺","CMM三坐标"]',
 'ISO 2768-mK', '["CN"]', NULL, '["公差","国标","基础"]'),

('GB 5083', 'GB', 'ergonomic_access', '生产设备安全卫生设计总则', 'General rules for safe & hygienic design of production equipment', '1999',
 '["操作面高度750-1100mm","维修通道≥600mm","紧急通道≥800mm","照明≥300lx(操作区)","噪声≤85dB(A)"]',
 '["人机工程尺寸测量","照度测量","噪声测量","通道宽度验证"]',
 NULL, '["CN"]', NULL, '["人机工程","安全","国标"]'),

('GB/T 13306', 'GB', 'appearance_paint', '标牌', 'Plates', '2011',
 '["设备铭牌: 厂名/型号/编号/参数/日期","材质: 不锈钢或铝","固定: 铆钉或不锈钢螺丝","字体清晰耐久"]',
 '["铭牌信息完整性","固定牢固度","耐久性(擦拭测试)"]',
 NULL, '["CN"]', NULL, '["铭牌","标识","外观"]'),

-- ASME Standards
('ASME Y14.5', 'ASME', 'structural_frame', 'GD&T 几何尺寸与公差', 'Dimensioning and Tolerancing', '2018',
 '["基准建立规则","位置度公差","轮廓度公差","最大实体条件(MMC)","最小实体条件(LMC)"]',
 '["CMM三坐标测量","光学测量","专用检具"]',
 NULL, '["US"]', NULL, '["GD&T","公差","美标"]'),

-- OEM Customer-Specific
('SVW-MECH-001', 'OEM_CUSTOMER', 'structural_frame', 'SVW(上汽大众)机械设备通用规范', 'SVW Mechanical Equipment General Specification', '2024',
 '["框架材质SUS304(食品接触区)或Q345B(非接触区)","焊缝等级1级(承载)2级(非承载)","所有锐边倒角R≥1mm","设备底座可调节脚杯±30mm"]',
 '["材质报告核查","焊缝检验","CMM测量","倒角检查"]',
 'ISO 2768-mK', '["CN","EU"]', '["SUS304","Q345B"]', '["SVW","大众","OEM"]'),

('BMW-MECH-001', 'OEM_CUSTOMER', 'surface_treatment', 'BMW设备外观与涂装要求', 'BMW Equipment Appearance & Coating Requirements', '2025',
 '["设备颜色RAL7035(浅灰)","操作面板区域RAL9005(黑)","膜厚≥120μm","表面无流挂/橘皮/气泡","不锈钢件需拉丝处理(#320砂)"]',
 '["色差仪测量(ΔE<2)","膜厚检测","外观目视检查(D65灯源)","粗糙度测量"]',
 NULL, '["EU","CN"]', '["碳钢","不锈钢"]', '["BMW","外观","涂装"]'),

('GM-MECH-001', 'OEM_CUSTOMER', 'safety_guarding', 'GM(通用)设备安全防护标准', 'GM Equipment Safety Guard Standard', '2024',
 '["围栏高度≥1800mm","观察窗聚碳酸酯≥5mm","安全门需RFID钥匙+电磁锁","光栅Type4 SIL2","急停按钮间距≤15m","安全PLC: AB GuardLogix"]',
 '["围栏高度测量","光栅响应时间测试","安全门联锁功能测试","急停回路测试","安全PLC程序审核"]',
 NULL, '["US","CN"]', NULL, '["GM","安全","围栏","NRTL"]'),

('INFINEON-MECH-001', 'OEM_CUSTOMER', 'sealing', 'Infineon(英飞凌)洁净室设备密封标准', 'Infineon Cleanroom Equipment Sealing Standard', '2024',
 '["洁净室ISO Class 5兼容","所有密封件FKM(氟橡胶)","表面粗糙度Ra≤0.8μm(洁净区)","无脱气材料限制(outgassing<1%TML)","HEPA过滤集成"]',
 '["颗粒计数测试","表面粗糙度测量","密封泄漏检测","材料脱气测试"]',
 NULL, '["EU","CN"]', '["SUS316L","AL6061"]', '["Infineon","洁净室","半导体"]'),

('WEICHAI-MECH-001', 'OEM_CUSTOMER', 'thermal_management', '潍柴动力设备热管理要求', 'Weichai Power Equipment Thermal Management', '2024',
 '["电柜温升≤15K(额定负载)","散热风扇N+1冗余","冷却液温度监控±2°C","热成像年检(≤35°C设备表面)","环境温度范围-10~45°C"]',
 '["温升测试(4小时满载)","热成像扫描","风扇切换测试","温控系统标定"]',
 NULL, '["CN"]', NULL, '["潍柴","热管理","散热"]');

-- ── SEED: Customer Mechanical Configs ─────────────────────

INSERT INTO mech_customer_configs (customer_name, customer_code, region, frame_material, surface_finish, welding_standard, tolerance_grade, ip_rating, cleanroom_class, pneumatics_brand, hydraulics_pressure, cable_routing_spec, paint_color_code, noise_limit, vibration_limit, packaging_spec, safety_guard_spec, fastener_standard, document_languages, special_requirements, bu_code) VALUES
('上汽大众(SVW)', 'SVW', 'CN',
 'SUS304(食品接触区) / Q345B(非接触区)', 'RAL7035粉末涂装 120μm + 不锈钢件拉丝#240', 'DIN EN 1090-2 EXC2', 'ISO 2768-mK', 'IP54', '无',
 'SMC(指定供应商)', '6 bar', 'igus拖链E4系列 + Panduit线槽', 'RAL7035', '≤78dB(A) @1m', '≤2.0mm/s RMS',
 '出口木箱ISPM15 + VCI防锈 + 集装箱固定', 'Troax围栏2000mm + SICK C4000光栅 + Pilz安全门锁',
 '8.8级镀锌+Nordlock(碳钢) / A4-80(不锈钢)', '["DE","EN","ZH"]',
 'SVW标准检验清单(SVW-QS-xxx)需逐项签字', 'overseas'),

('宝马(BMW)', 'BMW', 'EU',
 'S355J2+N(重载) / SUS304(外观区)', 'RAL7035+RAL9005(双色) 粉末涂装 ≥120μm', 'DIN EN 1090-2 EXC2', 'ISO 2768-mK', 'IP54', '无',
 'Festo(指定供应商)', '6 bar', 'igus E4系列 + Weidmüller线槽', 'RAL7035/RAL9005', '≤75dB(A) @1m', '≤1.5mm/s RMS',
 '出口木箱 + 海运防锈 + BMW专用标签', 'Troax围栏1800mm + SICK microScan3光栅 + Schmersal安全门',
 '8.8级达克罗+Nordlock / A2-70(不锈钢)', '["DE","EN"]',
 'BMW CI手册颜色强制 / 年度供应商审核需配合', 'overseas'),

('通用汽车(GM)', 'GM', 'US',
 'ASTM A36 / SUS304(清洁区)', 'RAL7012深灰 粉末涂装 100μm', 'AWS D1.1', 'ASME Y14.5', 'IP54', '无',
 'Parker(首选) / SMC(备选)', '90 PSI (6.2 bar)', 'Panduit线槽+Igus拖链', 'RAL7012', '≤80dB(A) @1m', '≤2.5mm/s RMS',
 'ISPM15木箱 + VCI + 40ft HC集装箱', 'AB GuardLogix安全PLC + Banner光栅 + Fortress安全门',
 'SAE Grade 8 + Nylok防松 / SS 18-8', '["EN"]',
 'GM GP系列标准强制 / PPAP Level 3 / NRTL认证产品', 'overseas'),

('英飞凌(Infineon)', 'INFINEON', 'EU',
 'SUS316L(洁净区) / AL6061-T6(结构)', 'Ra≤0.8μm电解抛光(洁净面) / 阳极氧化(铝件)', 'DIN EN 1090-2 EXC3', 'ISO 2768-fH', 'IP65', 'ISO Class 5',
 'SMC洁净型(ITV系列)', 'N/A', '洁净级线槽(密封型)', 'RAL9002灰白', '≤70dB(A) @1m', '≤1.0mm/s RMS',
 '洁净室包装(双层PE袋+防静电)', 'SICK安全系统 + Bosch安全围栏(洁净型)',
 'A4-80不锈钢(全部) / 无碳钢', '["DE","EN"]',
 '洁净室协议(颗粒/AMC/脱气)强制 / FAB搬入需SEMI S2认证', 'semiconductor'),

('潍柴动力(Weichai)', 'WEICHAI', 'CN',
 'Q235B(常规) / Q345B(重载)', 'RAL7035粉末涂装 80μm(国标)', 'GB/T 19418 → GB/T 12469 2级', 'GB/T 1804-m', 'IP54', '无',
 'AirTAC(首选) / SMC(可选)', '6 bar', '国产线槽 + igus拖链', 'RAL7035', '≤85dB(A) @1m', '≤3.0mm/s RMS',
 '国内木托盘+缠绕膜', '国产围栏 + SICK光栅 + 国产安全门锁',
 '8.8级镀锌+弹垫', '["ZH"]',
 '性价比优先/国产化率≥80%要求/年度价格谈判机制', 'commercial_vehicle');

-- ── SEED: Config Line Items (SVW example) ─────────────────

INSERT INTO mech_config_line_items (config_id, category, item_code, item_name, specification, brand, alternative_brands, is_mandatory, sort_order) VALUES
(1, 'structural_frame', 'SVW-FRM-001', '设备底座', 'Q345B焊接件, 调节脚杯±30mm, 整体加工平面度≤0.3mm', 'GRT自制', NULL, true, 1),
(1, 'structural_frame', 'SVW-FRM-002', '设备框架', 'SUS304方管40×40×3 / Q345B方管(非接触区)', 'GRT自制', NULL, true, 2),
(1, 'surface_treatment', 'SVW-SRF-001', '碳钢件涂装', 'RAL7035粉末涂装, 抛丸Sa2.5, 膜厚≥120μm', 'GRT涂装车间', NULL, true, 3),
(1, 'safety_guarding', 'SVW-SAF-001', '安全围栏', 'Troax Mesh Panel ST30, 2000mm高, 开口20×20mm', 'Troax', '["SATECH"]', true, 4),
(1, 'safety_guarding', 'SVW-SAF-002', '安全光栅', 'SICK C4000 Type4, 分辨率14mm', 'SICK', NULL, true, 5),
(1, 'pneumatic_hydraulic', 'SVW-PNU-001', 'FRL组合件', 'SMC AC40-04DG-A + AF40-04D-A + AR40-04BG-A', 'SMC', NULL, true, 6),
(1, 'fastener', 'SVW-FST-001', '关键连接螺栓', '8.8级M12×40镀锌+Nordlock NL12sp', 'Nordlock', NULL, true, 7),
(1, 'packaging_shipping', 'SVW-PKG-001', '出口包装', 'ISPM15熏蒸木箱+VCI防锈袋+硅胶干燥剂+角铁固定', NULL, NULL, true, 8);

-- ── SEED: Knowledge Graph Links ───────────────────────────

INSERT INTO mech_standard_links (source_id, target_id, link_type, description, strength) VALUES
(1, 6, 'references', 'GRT焊接件标准引用ISO 2768公差', 90),
(1, 9, 'requires', 'GRT焊接件需符合DIN EN 1090焊接要求', 85),
(2, 16, 'complements', 'GRT涂装标准与BMW涂装要求互补', 70),
(7, 8, 'references', 'ISO 12100风险评估引用ISO 14120防护设计', 95),
(9, 1, 'derives_from', 'DIN EN 1090焊接为GRT焊接标准的来源', 85),
(3, 4, 'complements', 'GRT紧固件标准与气动标准配合使用', 60),
(11, 6, 'derives_from', 'GB/T 1804公差等同采用ISO 2768', 100),
(15, 7, 'references', 'SVW机械规范引用ISO 12100安全设计', 80);

-- ── SEED: Mechanical Review Rules (M-phase gates) ─────────

INSERT INTO mech_review_rules (phase, origin, rule_code, title, checklist_template, required_approvers, is_blocking) VALUES
('M0', 'GRT_INTERNAL', 'M0-MECH-001', 'M0 方案评审 — 机械可行性', '["客户机械规范收集完整","框架材料初步选型","安全防护方案初定","场地空间确认"]', '["mechanical_lead","project_manager"]', true),
('M1', 'GRT_INTERNAL', 'M1-MECH-001', 'M1 概念设计 — 机械概念评审', '["3D总布局完成","人机工程审查","干涉检查完成","关键部件选型确认"]', '["mechanical_lead"]', true),
('M3', 'GRT_INTERNAL', 'M3-MECH-001', 'M3 详细设计 — 机械设计冻结', '["详图发布(公差/焊接/表面处理标注完整)","BOM发布","采购件规格确认","制造工艺评审","DFMEA完成"]', '["mechanical_lead","quality_manager","production_manager"]', true),
('M3', 'OEM_CUSTOMER', 'M3-CUST-001', 'M3 客户标准符合性检查', '["客户机械规范逐条核对","材料报告准备","涂装样板确认","安全防护方案客户批准"]', '["mechanical_lead","quality_manager"]', true),
('M5', 'GRT_INTERNAL', 'M5-MECH-001', 'M5 制造过程 — 机械部件检验', '["焊接件尺寸检验","涂装质量检验","装配精度检验","气动系统泄漏测试"]', '["quality_inspector","mechanical_lead"]', true),
('M7', 'GRT_INTERNAL', 'M7-MECH-001', 'M7 整机装配 — 机械总装评审', '["整机精度测量","安全防护安装完整","管路气密性测试","噪声测量","外观检查"]', '["mechanical_lead","quality_manager"]', true),
('M7', 'OEM_CUSTOMER', 'M7-CUST-001', 'M7 客户规范FAT检查清单', '["客户配置清单逐项核对","客户指定品牌确认","文档语言正确","铭牌信息完整"]', '["quality_manager","project_manager"]', true),
('M8', 'GRT_INTERNAL', 'M8-MECH-001', 'M8 FAT验收 — 机械部分', '["全行程运动测试","定位精度测试","噪声≤客户限值","振动≤客户限值","安全功能测试"]', '["mechanical_lead","customer_engineer"]', true),
('M11', 'GRT_INTERNAL', 'M11-MECH-001', 'M11 SAT验收 — 现场安装验收', '["地脚螺栓扭矩","水平度调整","管路接通","安全围栏安装","试运行"]', '["field_service","mechanical_lead","customer_engineer"]', true),
('M11', 'OEM_CUSTOMER', 'M11-CUST-001', 'M11 客户最终验收', '["客户验收清单逐项签字","缺陷整改确认","备件交接","培训完成","文档移交"]', '["project_manager","customer_engineer"]', true);

-- ── SEED: Sample Complaints ───────────────────────────────

INSERT INTO mech_acceptance_records (project_code, customer_name, acceptance_phase, check_item, category, result, score, customer_comment, corrective_action, inspector_name) VALUES
('GRT-312', 'BMW', 'FAT', '设备外观涂装质量', 'appearance_paint', 'CONDITIONAL', 72, '面板区域发现1处流挂缺陷, 需返修', '已打磨重涂, 复检通过', 'Thomas Müller'),
('GRT-312', 'BMW', 'FAT', '噪声测量', 'noise_vibration', 'ACCEPTED', 95, '测量值72dB(A), 优于75dB限值', NULL, 'Thomas Müller'),
('GRT-405', 'Infineon', 'FAT', '洁净室颗粒计数', 'sealing', 'ACCEPTED', 98, 'ISO Class 4达标, 超出预期', NULL, 'Hans Weber'),
('GRT-405', 'Infineon', 'SAT', '现场安装水平度', 'structural_frame', 'CONDITIONAL', 65, '底座水平度0.6mm/m, 超出0.5mm/m要求', '重新调节脚杯, 复测0.3mm/m通过', 'Hans Weber'),
('GRT-501', 'GM', 'FAT', '安全围栏高度', 'safety_guarding', 'ACCEPTED', 100, '围栏高度1850mm, 符合≥1800mm要求', NULL, 'John Smith'),
('GRT-501', 'GM', 'FAT', '急停回路功能', 'safety_guarding', 'REJECTED', 30, '2号急停按钮按下后0.8s才停机, 超出0.5s要求', '更换安全继电器, 响应时间降至0.3s', 'John Smith');
