-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 0047: Electrical Standards Governance             ║
-- ║  CTO mandate: CE/UL/OEM customer standard management        ║
-- ║  integrated into M0-M12 project lifecycle                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Enums
DO $$ BEGIN CREATE TYPE std_framework AS ENUM ('CE','UL','CSA','GB','IEC','NFPA','SEMI','OEM_CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE std_category AS ENUM ('power_supply','motor_drive','plc_control','hmi_interface','safety_circuit','wiring_cable','panel_enclosure','sensor_instrumentation','communication','grounding_emc','marking_labeling','documentation','remote_access','cybersecurity'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE std_status AS ENUM ('draft','under_review','active','superseded','deprecated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE compliance_check_status AS ENUM ('NOT_CHECKED','PASS','FAIL','WAIVED','N_A'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaint_severity AS ENUM ('OBSERVATION','MINOR','MAJOR','CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table 1: Master Standards Library
CREATE TABLE IF NOT EXISTS electrical_standards (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(50) NOT NULL,
  framework         std_framework NOT NULL,
  category          std_category NOT NULL,
  title             VARCHAR(500) NOT NULL,
  title_en          VARCHAR(500),
  description       TEXT,
  version           VARCHAR(20) NOT NULL,
  reference_doc     VARCHAR(300),
  reference_url     VARCHAR(500),
  applicable_regions  JSON,
  applicable_voltages JSON,
  key_requirements  JSON,
  test_methods      JSON,
  status            std_status NOT NULL DEFAULT 'active',
  effective_date    TIMESTAMP,
  superseded_by     INTEGER,
  created_by        INTEGER,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_es_code_version ON electrical_standards(code, version);
CREATE INDEX IF NOT EXISTS idx_es_framework ON electrical_standards(framework);
CREATE INDEX IF NOT EXISTS idx_es_category ON electrical_standards(category);

-- Table 2: Customer Standard Profiles
CREATE TABLE IF NOT EXISTS customer_standard_profiles (
  id                  SERIAL PRIMARY KEY,
  customer_name       VARCHAR(200) NOT NULL,
  customer_code       VARCHAR(50),
  region              VARCHAR(20) NOT NULL,
  base_framework      std_framework NOT NULL,
  overlay_standards   JSON,
  voltage_spec        VARCHAR(100),
  safety_level        VARCHAR(50),
  plc_platform        VARCHAR(100),
  hmi_platform        VARCHAR(100),
  comm_protocol       VARCHAR(100),
  panel_ip_rating     VARCHAR(20),
  cable_spec          VARCHAR(200),
  special_requirements TEXT,
  document_languages  JSON,
  audit_history       JSON,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  bu_code             VARCHAR(20),
  created_by          INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csp_customer ON customer_standard_profiles(customer_name);
CREATE INDEX IF NOT EXISTS idx_csp_region ON customer_standard_profiles(region);

-- Table 3: Project Standard Selection
CREATE TABLE IF NOT EXISTS project_standard_selections (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER,
  project_code          VARCHAR(50) NOT NULL,
  project_name          VARCHAR(300),
  customer_profile_id   INTEGER REFERENCES customer_standard_profiles(id),
  applicable_phases     JSON,
  selected_standard_ids JSON,
  design_basis          JSON,
  locked_at             TIMESTAMP,
  locked_by             INTEGER,
  notes                 TEXT,
  bu_code               VARCHAR(20),
  created_by            INTEGER,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pss_project ON project_standard_selections(project_code);

-- Table 4: Compliance Checklist Items
CREATE TABLE IF NOT EXISTS compliance_checklist_items (
  id                   SERIAL PRIMARY KEY,
  project_code         VARCHAR(50) NOT NULL,
  standard_id          INTEGER NOT NULL REFERENCES electrical_standards(id),
  standard_code        VARCHAR(50),
  check_phase          VARCHAR(10) NOT NULL,
  check_item           VARCHAR(500) NOT NULL,
  check_method         TEXT,
  acceptance_criteria  TEXT,
  status               compliance_check_status NOT NULL DEFAULT 'NOT_CHECKED',
  checked_by           INTEGER,
  checked_at           TIMESTAMP,
  evidence             VARCHAR(500),
  deviation_note       TEXT,
  waiver_approved_by   INTEGER,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cci_project ON compliance_checklist_items(project_code);
CREATE INDEX IF NOT EXISTS idx_cci_phase ON compliance_checklist_items(check_phase);
CREATE INDEX IF NOT EXISTS idx_cci_status ON compliance_checklist_items(status);

-- Table 5: Customer Electrical Complaints
CREATE TABLE IF NOT EXISTS electrical_complaints (
  id                  SERIAL PRIMARY KEY,
  complaint_number    VARCHAR(50) NOT NULL,
  project_code        VARCHAR(50),
  customer_name       VARCHAR(200) NOT NULL,
  equipment_model     VARCHAR(200),
  category            std_category NOT NULL,
  severity            complaint_severity NOT NULL,
  title               VARCHAR(500) NOT NULL,
  description         TEXT NOT NULL,
  root_cause          TEXT,
  violated_standard_ids JSON,
  corrective_action   TEXT,
  preventive_action   TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'open',
  reported_by         VARCHAR(100),
  assignee_id         INTEGER,
  assignee_name       VARCHAR(100),
  resolved_at         TIMESTAMP,
  bu_code             VARCHAR(20),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ec_number ON electrical_complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_ec_customer ON electrical_complaints(customer_name);
CREATE INDEX IF NOT EXISTS idx_ec_severity ON electrical_complaints(severity);

-- Table 6: Review Gate Rules
CREATE TABLE IF NOT EXISTS electrical_review_rules (
  id                  SERIAL PRIMARY KEY,
  phase               VARCHAR(10) NOT NULL,
  framework           std_framework NOT NULL,
  rule_code           VARCHAR(50) NOT NULL,
  title               VARCHAR(300) NOT NULL,
  description         TEXT,
  checklist_template  JSON,
  required_approvers  JSON,
  is_blocking         BOOLEAN NOT NULL DEFAULT true,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_err_phase_rule ON electrical_review_rules(phase, rule_code);

-- ════════════════════════════════════════════════════════════════
-- SEED DATA: CE/UL/GB/OEM Standards + Customer Profiles + Rules
-- ════════════════════════════════════════════════════════════════

-- ── CE Standards (EU) ──
INSERT INTO electrical_standards (code, framework, category, title, title_en, version, reference_doc, applicable_regions, applicable_voltages, key_requirements, status, effective_date) VALUES
  ('CE-LVD-2014/35', 'CE', 'power_supply', 'EU低压指令 — 电气安全', 'EU Low Voltage Directive', '2014', 'Directive 2014/35/EU', '["EU","UK"]', '["230V/50Hz","400V/50Hz"]', '["额定电压50V-1000V AC / 75V-1500V DC","需符合EN 61010-1或EN 60204-1","CE Declaration of Conformity必须包含LVD"]', 'active', '2016-04-20'),
  ('CE-EMC-2014/30', 'CE', 'grounding_emc', 'EU电磁兼容指令', 'EU EMC Directive', '2014', 'Directive 2014/30/EU', '["EU","UK"]', '["230V/50Hz","400V/50Hz"]', '["设备不得产生超标电磁干扰","设备需具备合理抗干扰能力","需做EMC测试(EN 61326-1)","电柜需做EMC接地铜排"]', 'active', '2016-04-20'),
  ('CE-MD-2006/42', 'CE', 'safety_circuit', 'EU机械指令 — 安全回路', 'EU Machinery Directive - Safety', '2006', 'Directive 2006/42/EC', '["EU","UK"]', '["230V/50Hz","400V/50Hz"]', '["急停回路符合EN ISO 13850","安全门联锁符合EN ISO 14119","安全继电器至少PLd/Cat3(EN ISO 13849-1)","光幕符合EN 61496 Type 2/4"]', 'active', '2009-12-29'),
  ('CE-EN60204', 'CE', 'wiring_cable', 'EN 60204-1 机械电气安全', 'Electrical Equipment of Machines', '2018', 'EN 60204-1:2018', '["EU","UK","GLOBAL"]', '["230V/50Hz","400V/50Hz"]', '["导线颜色: PE=绿黄, N=浅蓝, L=黑/棕/灰","线径根据载流量IEC 60364计算","端子标记清晰(IEC 81346)","电柜门需有接地编织带"]', 'active', '2018-10-01'),
  ('CE-EN61439', 'CE', 'panel_enclosure', 'EN 61439 低压成套开关设备', 'LV Switchgear Assemblies', '2011', 'EN 61439-1/-2:2011', '["EU","UK","GLOBAL"]', '["400V/50Hz"]', '["温升验证(设计规则或测试)","短路耐受(Icw/Ipk)","IP防护等级(最低IP54)","铭牌标识完整"]', 'active', '2014-11-01');

-- ── UL Standards (US) ──
INSERT INTO electrical_standards (code, framework, category, title, title_en, version, reference_doc, applicable_regions, applicable_voltages, key_requirements, status, effective_date) VALUES
  ('UL508A', 'UL', 'panel_enclosure', 'UL 508A 工业控制柜', 'Industrial Control Panels', '2022', 'UL 508A Ed.4', '["US","CA"]', '["480V/60Hz","208V/60Hz"]', '["SCCR短路额定电流标注","铜排规格不小于线径载流量","UL Listed元器件优先","柜门联锁断路器(door interlock)"]', 'active', '2022-01-01'),
  ('UL61010', 'UL', 'sensor_instrumentation', 'UL 61010 测量控制设备安全', 'Safety for Measurement Equipment', '2012', 'UL 61010-1 Ed.3', '["US","CA"]', '["120V/60Hz","480V/60Hz"]', '["过电压类别(OVC) CAT II/III","污染等级 Pollution Degree 2","绝缘等级标注","保险丝容量匹配"]', 'active', '2012-06-01'),
  ('NFPA79', 'NFPA', 'wiring_cable', 'NFPA 79 工业机械电气标准', 'Electrical Standard for Industrial Machinery', '2024', 'NFPA 79-2024', '["US"]', '["480V/60Hz","208V/60Hz"]', '["导线颜色: 接地=绿/绿黄, 中性线=白/灰, 带电导体=黑/红/蓝","AWG线径规格","THHN/THWN-2导线类型","分断能力AIC标注"]', 'active', '2024-01-01');

-- ── GB Standards (China) ──
INSERT INTO electrical_standards (code, framework, category, title, title_en, version, reference_doc, applicable_regions, applicable_voltages, key_requirements, status, effective_date) VALUES
  ('GB5226.1', 'GB', 'wiring_cable', 'GB 5226.1 机械电气安全', 'Electrical Equipment of Machines (CN)', '2019', 'GB/T 5226.1-2019', '["CN"]', '["380V/50Hz","220V/50Hz"]', '["等同采用IEC 60204-1","导线颜色按国标: PE=黄绿, N=浅蓝","端子排标记","3C认证元器件"]', 'active', '2020-05-01'),
  ('GB7251', 'GB', 'panel_enclosure', 'GB 7251 低压成套开关设备', 'LV Switchgear Assemblies (CN)', '2013', 'GB 7251.1-2013', '["CN"]', '["380V/50Hz"]', '["等同采用IEC 61439","温升验证","短路耐受","3C认证标志","铭牌中文标识"]', 'active', '2014-08-01');

-- ── SEMI Standards (Semiconductor) ──
INSERT INTO electrical_standards (code, framework, category, title, title_en, version, reference_doc, applicable_regions, applicable_voltages, key_requirements, status, effective_date) VALUES
  ('SEMI-S2', 'SEMI', 'safety_circuit', 'SEMI S2 半导体设备安全准则', 'Safety Guideline for Semiconductor Equipment', '2022', 'SEMI S2-0822', '["GLOBAL"]', '["200V/50Hz","208V/60Hz"]', '["危害分析(SEMI S10)","LOTO上锁挂牌接口","化学品二次围堵","排烟系统联锁","地震约束(Seismic)"]', 'active', '2022-08-01'),
  ('SEMI-S23', 'SEMI', 'cybersecurity', 'SEMI S23 半导体设备网络安全', 'Guide for Conservation of Energy', '2022', 'SEMI S23-0322', '["GLOBAL"]', '[]', '["设备网络隔离段","固件签名验证","远程接入VPN审计","事件日志保留≥90天"]', 'active', '2022-03-01');

-- ── Customer Standard Profiles ──
INSERT INTO customer_standard_profiles (customer_name, customer_code, region, base_framework, overlay_standards, voltage_spec, safety_level, plc_platform, hmi_platform, comm_protocol, panel_ip_rating, cable_spec, special_requirements, document_languages, bu_code) VALUES
  ('上海大众 (SVW)', 'SVW', 'CN', 'CE', '["CE-LVD-2014/35","CE-EMC-2014/30","CE-MD-2006/42","CE-EN60204","GB5226.1"]', '380V 3P+N+PE 50Hz', 'PLd / Cat3', 'Siemens S7-1500', 'Siemens TP1200 Comfort', 'Profinet', 'IP54', 'Siemens/LAPP ÖLFLEX, 阻燃', '大众VW标准: VW 80101(电气EMC) + PV 3952(温变测试); 所有电气图纸需E-PLAN格式', '["ZH","DE","EN"]', 'BU3'),
  ('宝马慕尼黑 (BMW)', 'BMW', 'EU', 'CE', '["CE-LVD-2014/35","CE-EMC-2014/30","CE-MD-2006/42","CE-EN60204","CE-EN61439"]', '400V 3P+N+PE 50Hz', 'PLd / Cat3', 'Siemens S7-1500', 'Siemens TP1500 Comfort', 'Profinet', 'IP54', 'LAPP ÖLFLEX CLASSIC 110, halogen-free', 'BMW GS95003(EMC); 所有铭牌英德双语; 设备必须TÜV预检', '["DE","EN"]', 'BU1'),
  ('通用汽车 (GM)', 'GM', 'US', 'UL', '["UL508A","NFPA79","UL61010"]', '480V 3P 60Hz / 120V 1P 60Hz control', 'SIL2 / Cat3', 'AB ControlLogix 5580', 'AB PanelView Plus 7', 'EtherNet/IP', 'NEMA 12', 'AWG MTW UL Listed, Carol C2005A', 'GM Spec GMW14010(EMC); UL508A Label required; SCCR≥65kA; NEC compliant', '["EN"]', 'BU1'),
  ('英飞凌 (Infineon)', 'INFN', 'EU', 'SEMI', '["SEMI-S2","SEMI-S23","CE-LVD-2014/35","CE-EMC-2014/30"]', '200V 3P 50Hz (cleanroom)', 'SIL2', 'Siemens S7-1500F', 'Siemens TP1200', 'Profinet + OPC-UA', 'IP65', 'cleanroom-rated, low-outgassing', 'SEMI S2 full compliance; 洁净室兼容(ISO Class 5); 远程接入需IEC 62443 zone segregation', '["EN","DE"]', 'BU4'),
  ('潍柴动力 (Weichai)', 'WC', 'CN', 'GB', '["GB5226.1","GB7251"]', '380V 3P+N+PE 50Hz', 'PLc / Cat2', 'Siemens S7-1200', 'Siemens KTP900', 'Profinet', 'IP54', '国标BV/BVR阻燃线', '标准国标即可; 铭牌全中文; 需配套培训视频', '["ZH"]', 'BU2');

-- ── Review Gate Rules ──
INSERT INTO electrical_review_rules (phase, framework, rule_code, title, checklist_template, required_approvers, is_blocking) VALUES
  ('M0', 'CE', 'M0-CE-001', 'M0立项: 确认客户电气框架与地区法规', '["确认客户地区(EU/US/CN)","确认适用指令(LVD/EMC/MD)","确认电压规格","确认安全等级要求(PLd/SIL)","确认PLC/HMI平台","确认通讯协议"]', '["electrical_lead","project_manager"]', true),
  ('M0', 'UL', 'M0-UL-001', 'M0立项: 确认UL/NFPA适用范围', '["确认UL508A适用性","确认SCCR等级要求","确认NFPA 79版本","确认NEC Article 670/409","确认AWG线径标准"]', '["electrical_lead","project_manager"]', true),
  ('M3', 'CE', 'M3-CE-001', 'M3方案评审: 电气设计合规冻结', '["电气原理图完成(E-PLAN)","安全回路设计(Sistema计算)","EMC方案(屏蔽/接地/滤波器)","元器件选型清单(CE认证)","电柜布局图审核","IP防护等级确认"]', '["electrical_lead","quality_manager"]', true),
  ('M3', 'UL', 'M3-UL-001', 'M3方案评审: UL合规冻结', '["UL508A面板布局","SCCR计算报告","UL Listed元器件清单","AWG线径载流量计算","门联锁方案","铭牌设计(UL标签)"]', '["electrical_lead","quality_manager"]', true),
  ('M7', 'CE', 'M7-CE-001', 'M7装配检查: 电气实装合规', '["导线颜色符合EN 60204","端子标记完整","接地连续性测试","绝缘电阻测试(≥1MΩ)","安全回路功能测试","急停响应时间","电柜温升预估"]', '["electrical_lead","quality_inspector"]', true),
  ('M7', 'UL', 'M7-UL-001', 'M7装配检查: UL实装合规', '["AWG线径颜色正确","UL Listed元器件逐一核对","SCCR标签粘贴","门联锁功能测试","接地阻抗测试","Hi-pot测试(如要求)"]', '["electrical_lead","quality_inspector"]', true),
  ('M8', 'CE', 'M8-CE-001', 'M8 FAT: CE合规最终验证', '["完整CE技术文件(TCF)","DoC符合性声明草稿","EMC测试报告(如要求)","安全功能验证记录","客户电气验收签字"]', '["electrical_lead","quality_manager","project_manager"]', true),
  ('M8', 'UL', 'M8-UL-001', 'M8 FAT: UL合规最终验证', '["UL508A标签粘贴并拍照","SCCR文档完整","线路图更新(as-built)","客户UL验收签字"]', '["electrical_lead","quality_manager","project_manager"]', true),
  ('M11', 'CE', 'M11-CE-001', 'M11 SAT: 现场电气验收', '["现场供电确认(电压/频率/相序)","接地电阻测试(现场)","EMC现场检查","安全功能现场重测","CE铭牌安装","最终DoC签发"]', '["electrical_lead","service_engineer"]', false),
  ('M11', 'UL', 'M11-UL-001', 'M11 SAT: 现场UL验收', '["现场供电确认(480V/60Hz)","接地验证","UL标签完整性检查","NFPA 79现场合规","客户最终验收签字"]', '["electrical_lead","service_engineer"]', false);

-- ── Sample Complaints ──
INSERT INTO electrical_complaints (complaint_number, project_code, customer_name, equipment_model, category, severity, title, description, root_cause, corrective_action, status, assignee_name, bu_code) VALUES
  ('EC-2026-001', 'GRT-401', '上海大众', 'USC-3000', 'safety_circuit', 'CRITICAL', '急停响应延迟3秒 — PLC程序误覆写', '客户反馈FAT测试期间按下急停按钮后设备延迟3秒才停止。经排查发现PLC程序被远程调试时误覆写为旧版本，安全回路OB35中断块被清空。', '共享VPN通道+默认IP导致工程师误连错误PLC，下载了旧项目程序覆盖当前程序', '1) 部署远程维护指挥中心(VPN令牌制度); 2) 强制TIA Portal CPU访问保护; 3) 一机一码IP规划', 'resolved', '洪香龙', 'BU3'),
  ('EC-2026-002', 'GRT-402', '宝马慕尼黑', 'SPR-5000', 'grounding_emc', 'MAJOR', 'EMC测试不达标 — 变频器谐波干扰', '宝马工厂EMC检测时辐射发射超标15dB(30-100MHz频段)。设备在单独运行时合格，但与相邻产线同时运行时互相干扰。', '变频器输出端缺少dU/dt滤波器; 电柜EMC接地铜排截面不足', '1) 增加Schaffner FN3258 dU/dt滤波器; 2) 电柜EMC接地铜排升级至25×3mm; 3) 所有电机线缆改用双屏蔽', 'in_progress', '李大鹏', 'BU1'),
  ('EC-2026-003', 'GRT-403', '通用汽车', 'ASC-5000', 'panel_enclosure', 'MAJOR', 'UL508A标签缺失 — SCCR未标注', '通用汽车验收时发现电控柜缺少UL508A标签，且SCCR短路额定电流未在铭牌标注。客户要求返工。', '工程团队对UL508A标签要求不熟悉; 项目M3评审时未纳入UL合规检查', '1) M3评审增加UL508A强制检查项; 2) 所有北美项目配备UL标签模板; 3) 电气工程师UL培训', 'open', '孙国祥', 'BU1');
