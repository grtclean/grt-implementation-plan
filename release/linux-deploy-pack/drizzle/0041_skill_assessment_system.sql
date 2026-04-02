-- ╔════════════════════════════════════════════════════════════╗
-- ║  GRT Skill Assessment System — 岗位能力等级测评           ║
-- ║  CEO指令: 给每个岗位创造可以测试能力等级专业程度          ║
-- ║  包括人为输入题目                                         ║
-- ╚════════════════════════════════════════════════════════════╝

-- Enums
DO $$ BEGIN
  CREATE TYPE skill_level_grade AS ENUM ('L1','L2','L3','L4','L5');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE skill_question_type AS ENUM ('single_choice','multi_choice','true_false','fill_blank','short_answer','practical','case_analysis');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE skill_question_difficulty AS ENUM ('basic','intermediate','advanced','expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE skill_session_status AS ENUM ('pending','in_progress','submitted','grading','completed','expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE skill_cert_status AS ENUM ('active','expired','revoked','superseded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ═══════════════════════════════════════════════════════════
-- Table 1: Position Skill Profiles — 岗位能力模型
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_position_profiles (
  id SERIAL PRIMARY KEY,
  position_key VARCHAR(80) NOT NULL UNIQUE,
  position_name VARCHAR(200) NOT NULL,
  position_name_en VARCHAR(200),
  department VARCHAR(100),
  description TEXT,
  skill_domains JSONB NOT NULL,
  pass_thresholds JSONB NOT NULL DEFAULT '{"L1":60,"L2":70,"L3":80,"L4":85,"L5":90}'::jsonb,
  time_limit_minutes JSONB DEFAULT '{"L1":45,"L2":60,"L3":90,"L4":90,"L5":120}'::jsonb,
  question_count JSONB DEFAULT '{"L1":20,"L2":30,"L3":40,"L4":40,"L5":50}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_position_profile_key ON skill_position_profiles (position_key);
CREATE INDEX IF NOT EXISTS idx_position_profile_dept ON skill_position_profiles (department);

-- ═══════════════════════════════════════════════════════════
-- Table 2: Question Bank — 题库 (含人工输入)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_question_bank (
  id SERIAL PRIMARY KEY,
  position_key VARCHAR(80) NOT NULL,
  domain_key VARCHAR(80) NOT NULL,
  question_type skill_question_type NOT NULL,
  difficulty skill_question_difficulty NOT NULL,
  target_levels JSONB NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER,
  created_by_name VARCHAR(100),
  tags JSONB,
  reference VARCHAR(300),
  usage_count INTEGER NOT NULL DEFAULT 0,
  correct_rate DECIMAL(5,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_question_position ON skill_question_bank (position_key);
CREATE INDEX IF NOT EXISTS idx_question_domain ON skill_question_bank (domain_key);
CREATE INDEX IF NOT EXISTS idx_question_difficulty ON skill_question_bank (difficulty);
CREATE INDEX IF NOT EXISTS idx_question_type ON skill_question_bank (question_type);
CREATE INDEX IF NOT EXISTS idx_question_active ON skill_question_bank (is_active);

-- ═══════════════════════════════════════════════════════════
-- Table 3: Assessment Papers — 试卷模板
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_assessment_papers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  title_en VARCHAR(300),
  position_key VARCHAR(80) NOT NULL,
  target_level skill_level_grade NOT NULL,
  total_points INTEGER NOT NULL,
  pass_score INTEGER NOT NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  question_composition JSONB NOT NULL,
  domain_weights JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_paper_position ON skill_assessment_papers (position_key);
CREATE INDEX IF NOT EXISTS idx_paper_level ON skill_assessment_papers (target_level);
CREATE INDEX IF NOT EXISTS idx_paper_published ON skill_assessment_papers (is_published);

-- ═══════════════════════════════════════════════════════════
-- Table 4: Assessment Sessions — 考试记录
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_assessment_sessions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  paper_id INTEGER NOT NULL,
  position_key VARCHAR(80) NOT NULL,
  target_level skill_level_grade NOT NULL,
  status skill_session_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  total_points INTEGER,
  earned_points INTEGER,
  manual_points INTEGER,
  final_score DECIMAL(5,2),
  passed BOOLEAN,
  domain_scores JSONB,
  graded_by INTEGER,
  graded_at TIMESTAMP,
  grader_notes TEXT,
  points_awarded INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_employee ON skill_assessment_sessions (employee_id);
CREATE INDEX IF NOT EXISTS idx_session_position ON skill_assessment_sessions (position_key);
CREATE INDEX IF NOT EXISTS idx_session_status ON skill_assessment_sessions (status);
CREATE INDEX IF NOT EXISTS idx_session_level ON skill_assessment_sessions (target_level);

-- ═══════════════════════════════════════════════════════════
-- Table 5: Assessment Answers — 答题明细
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_assessment_answers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_order INTEGER NOT NULL,
  answer TEXT,
  selected_options JSONB,
  is_correct BOOLEAN,
  points_earned INTEGER,
  max_points INTEGER NOT NULL,
  manual_score INTEGER,
  manual_feedback TEXT,
  graded_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answer_session ON skill_assessment_answers (session_id);
CREATE INDEX IF NOT EXISTS idx_answer_question ON skill_assessment_answers (question_id);

-- ═══════════════════════════════════════════════════════════
-- Table 6: Skill Level Certifications — 能力等级认证
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_level_certs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  position_key VARCHAR(80) NOT NULL,
  level skill_level_grade NOT NULL,
  session_id INTEGER,
  score DECIMAL(5,2),
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP,
  status skill_cert_status NOT NULL DEFAULT 'active',
  superseded_by INTEGER,
  revoked_reason TEXT,
  cert_number VARCHAR(50),
  approved_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cert_employee ON skill_level_certs (employee_id);
CREATE INDEX IF NOT EXISTS idx_cert_position ON skill_level_certs (position_key);
CREATE INDEX IF NOT EXISTS idx_cert_level ON skill_level_certs (level);
CREATE INDEX IF NOT EXISTS idx_cert_status ON skill_level_certs (status);

-- ═══════════════════════════════════════════════════════════
-- Seed: GRT Position Profiles (45 unique positions → 22 profile groups)
-- ═══════════════════════════════════════════════════════════

INSERT INTO skill_position_profiles (position_key, position_name, position_name_en, department, skill_domains) VALUES
-- 生产制造类 (Production & Manufacturing)
('mechanical_assembly', '机械装配', 'Mechanical Assembly', '生产部', '[
  {"key":"assembly_process","name":"装配工艺","weight":30,"description":"机械装配流程、工艺规范、装配精度"},
  {"key":"drawing_reading","name":"图纸识读","weight":25,"description":"机械图纸、装配图、公差标注"},
  {"key":"tool_usage","name":"工具使用","weight":20,"description":"扳手、量具、电动工具使用规范"},
  {"key":"quality_check","name":"质量检验","weight":15,"description":"自检互检、外观检查、功能测试"},
  {"key":"safety","name":"安全规范","weight":10,"description":"劳保用品、作业安全、应急处理"}
]'::jsonb),

('electrical_assembly', '电气装配', 'Electrical Assembly', '生产部', '[
  {"key":"wiring_process","name":"接线工艺","weight":30,"description":"电气接线、线缆布置、端子压接"},
  {"key":"circuit_reading","name":"电气图纸识读","weight":25,"description":"电气原理图、接线图、PLC程序"},
  {"key":"commissioning","name":"调试能力","weight":20,"description":"通电测试、功能调试、故障排除"},
  {"key":"safety_electrical","name":"电气安全","weight":15,"description":"用电安全、绝缘测试、接地规范"},
  {"key":"quality_check","name":"质量检验","weight":10,"description":"自检、功能验证、测试报告"}
]'::jsonb),

('welding', '焊工', 'Welder', '生产部', '[
  {"key":"welding_technique","name":"焊接技术","weight":35,"description":"MIG/TIG/手工电弧焊接工艺参数"},
  {"key":"material_knowledge","name":"材料知识","weight":20,"description":"钢材性质、焊材选择、热影响区"},
  {"key":"drawing_reading","name":"图纸识读","weight":15,"description":"焊接符号、焊缝标注、尺寸公差"},
  {"key":"inspection","name":"焊缝检验","weight":20,"description":"外观检查、无损检测配合、缺陷识别"},
  {"key":"safety","name":"焊接安全","weight":10,"description":"防护装备、通风、火灾预防"}
]'::jsonb),

('cnc_machining', 'CNC/数控加工', 'CNC Machining', '生产部', '[
  {"key":"programming","name":"数控编程","weight":30,"description":"G代码/M代码、CAM软件、对刀"},
  {"key":"operation","name":"设备操作","weight":25,"description":"机床操作、换刀、工件装夹"},
  {"key":"drawing_reading","name":"图纸识读","weight":20,"description":"加工图纸、尺寸链、形位公差"},
  {"key":"measurement","name":"测量检验","weight":15,"description":"三坐标、粗糙度、量具使用"},
  {"key":"maintenance","name":"设备维护","weight":10,"description":"日常保养、故障初判、润滑"}
]'::jsonb),

('laser_cutting', '激光切割', 'Laser Cutting', '生产部', '[
  {"key":"operation","name":"设备操作","weight":30,"description":"激光切割机操作、参数设置"},
  {"key":"programming","name":"编程排版","weight":25,"description":"套料软件、切割路径优化"},
  {"key":"material","name":"材料知识","weight":20,"description":"不同板材切割参数、变形控制"},
  {"key":"quality","name":"质量控制","weight":15,"description":"切割精度、毛刺、热影响"},
  {"key":"safety","name":"安全规范","weight":10,"description":"激光防护、排烟、设备安全"}
]'::jsonb),

('cold_work', '冷作', 'Cold Work / Sheet Metal', '生产部', '[
  {"key":"forming","name":"成型工艺","weight":30,"description":"折弯、卷板、冲压、矫正"},
  {"key":"drawing_reading","name":"图纸识读","weight":25,"description":"展开图、折弯顺序、尺寸公差"},
  {"key":"tool_usage","name":"工具设备","weight":20,"description":"折弯机、冲床、剪板机操作"},
  {"key":"quality","name":"质量控制","weight":15,"description":"尺寸检测、外观检查"},
  {"key":"safety","name":"安全规范","weight":10,"description":"机械安全、防护装置"}
]'::jsonb),

-- 工程研发类 (Engineering & R&D)
('mechanical_engineer', '机械研发工程师', 'Mechanical R&D Engineer', '事业部', '[
  {"key":"3d_design","name":"三维设计","weight":25,"description":"SolidWorks/Inventor、3D建模、有限元分析"},
  {"key":"drawing_standard","name":"工程制图","weight":20,"description":"GB/ISO图纸标准、公差配合、GD&T"},
  {"key":"material_science","name":"材料工程","weight":15,"description":"材料选型、力学性能、热处理"},
  {"key":"mechanism_design","name":"机构设计","weight":20,"description":"传动、气动液压、结构强度"},
  {"key":"project_management","name":"项目管理","weight":10,"description":"进度控制、设计评审、变更管理"},
  {"key":"innovation","name":"创新能力","weight":10,"description":"新工艺研究、专利技术、降本方案"}
]'::jsonb),

('electrical_engineer', '电气工程师', 'Electrical Engineer', '事业部', '[
  {"key":"circuit_design","name":"电路设计","weight":25,"description":"原理图设计、PCB/面板布局、EMC"},
  {"key":"plc_programming","name":"PLC编程","weight":25,"description":"西门子/三菱PLC、梯形图、ST语言"},
  {"key":"hmi_scada","name":"HMI/SCADA","weight":15,"description":"触摸屏组态、数据采集、远程监控"},
  {"key":"motor_drive","name":"电机驱动","weight":15,"description":"变频器、伺服、步进控制"},
  {"key":"commissioning","name":"现场调试","weight":10,"description":"系统联调、故障诊断、客户交付"},
  {"key":"safety_standard","name":"安全标准","weight":10,"description":"CE/UL认证、功能安全、接地规范"}
]'::jsonb),

-- 质量类 (Quality)
('quality_specialist', '质量专员', 'Quality Specialist', '质量部', '[
  {"key":"iatf16949","name":"IATF 16949","weight":25,"description":"质量体系、过程审核、产品审核"},
  {"key":"inspection","name":"检验方法","weight":25,"description":"尺寸检验、外观检验、功能测试"},
  {"key":"fmea_spc","name":"FMEA/SPC","weight":20,"description":"失效分析、统计过程控制、Cpk"},
  {"key":"problem_solving","name":"问题解决","weight":20,"description":"8D报告、鱼骨图、五问法"},
  {"key":"documentation","name":"文档管理","weight":10,"description":"质量记录、不合格品管理、追溯"}
]'::jsonb),

-- 销售类 (Sales)
('sales_engineer', '销售与项目工程师', 'Sales & Project Engineer', '事业部', '[
  {"key":"product_knowledge","name":"产品知识","weight":25,"description":"公司产品线、技术参数、竞品分析"},
  {"key":"customer_management","name":"客户管理","weight":25,"description":"客户开发、关系维护、M0-M6漏斗"},
  {"key":"quotation","name":"报价能力","weight":20,"description":"成本估算、报价策略、商务谈判"},
  {"key":"project_tracking","name":"项目跟踪","weight":20,"description":"订单执行、交付协调、售后支持"},
  {"key":"market_analysis","name":"市场分析","weight":10,"description":"行业趋势、竞争对手、市场机会"}
]'::jsonb),

-- 售后类 (After-Sales)
('after_sales_tech', '售后技工', 'After-Sales Technician', '售后部', '[
  {"key":"troubleshooting","name":"故障诊断","weight":30,"description":"机械/电气故障定位、远程指导"},
  {"key":"repair_skill","name":"维修技能","weight":25,"description":"部件更换、调试、功能恢复"},
  {"key":"product_knowledge","name":"产品知识","weight":20,"description":"全系列产品结构、工作原理"},
  {"key":"customer_comm","name":"客户沟通","weight":15,"description":"问题收集、处理反馈、满意度"},
  {"key":"documentation","name":"服务记录","weight":10,"description":"工单填写、故障分析报告、备件申请"}
]'::jsonb),

-- 采购供应链类 (Procurement & Supply Chain)
('procurement_engineer', '采购工程师', 'Procurement Engineer', '供应链', '[
  {"key":"sourcing","name":"供应商开发","weight":25,"description":"供应商寻源、评估、准入"},
  {"key":"cost_analysis","name":"成本分析","weight":25,"description":"价格分析、降本策略、TCO"},
  {"key":"contract","name":"合同管理","weight":20,"description":"采购合同、付款条款、索赔"},
  {"key":"quality_incoming","name":"来料管理","weight":15,"description":"IQC、不合格处理、让步接收"},
  {"key":"erp_system","name":"ERP系统","weight":15,"description":"采购订单、库存管理、MRP运算"}
]'::jsonb),

('warehouse_manager', '仓库管理员', 'Warehouse Manager', '供应链', '[
  {"key":"inventory","name":"库存管理","weight":30,"description":"出入库、盘点、先进先出"},
  {"key":"erp_wms","name":"ERP/WMS","weight":25,"description":"系统收发货、库存台账、安全库存"},
  {"key":"material_knowledge","name":"物料识别","weight":20,"description":"物料编码、规格辨识、防护"},
  {"key":"logistics","name":"物流管理","weight":15,"description":"包装、运输、追溯标签"},
  {"key":"safety_5s","name":"安全5S","weight":10,"description":"仓库安全、消防、整理整顿"}
]'::jsonb),

-- 财务类 (Finance)
('accountant', '会计', 'Accountant', '财务部', '[
  {"key":"accounting_standard","name":"会计准则","weight":25,"description":"企业会计准则、税法、发票管理"},
  {"key":"bookkeeping","name":"账务处理","weight":25,"description":"凭证、总账、成本核算"},
  {"key":"tax","name":"税务申报","weight":20,"description":"增值税、所得税、税务风险"},
  {"key":"reporting","name":"财务报表","weight":20,"description":"资产负债表、利润表、现金流"},
  {"key":"erp_finance","name":"财务系统","weight":10,"description":"ERP财务模块、电子发票"}
]'::jsonb),

-- 人事行政类 (HR & Admin)
('hr_specialist', '人事行政专员', 'HR & Admin Specialist', '人事行政部', '[
  {"key":"labor_law","name":"劳动法规","weight":25,"description":"劳动合同、社保公积金、工时"},
  {"key":"recruitment","name":"招聘管理","weight":20,"description":"岗位分析、面试技巧、入职流程"},
  {"key":"attendance","name":"考勤薪酬","weight":20,"description":"考勤管理、薪资计算、个税"},
  {"key":"employee_relations","name":"员工关系","weight":20,"description":"沟通协调、纠纷处理、企业文化"},
  {"key":"admin_affairs","name":"行政事务","weight":15,"description":"办公采购、会议组织、档案管理"}
]'::jsonb),

-- 管理类 (Management — applicable to all manager roles)
('team_leader', '班组长/主管', 'Team Leader / Supervisor', '生产部', '[
  {"key":"production_planning","name":"生产排程","weight":25,"description":"任务分配、排程优化、产能平衡"},
  {"key":"team_management","name":"班组管理","weight":25,"description":"人员调度、技能培养、绩效评估"},
  {"key":"quality_control","name":"质量管控","weight":20,"description":"首检巡检、不良分析、工艺纪律"},
  {"key":"safety_management","name":"安全管理","weight":15,"description":"安全教育、隐患排查、应急预案"},
  {"key":"reporting","name":"日报周报","weight":15,"description":"产量统计、问题汇报、改善提案"}
]'::jsonb),

('bu_manager', '事业部经理', 'Business Unit Manager', '事业部', '[
  {"key":"strategy","name":"战略规划","weight":20,"description":"BU战略制定、市场定位、增长计划"},
  {"key":"financial","name":"财务管理","weight":20,"description":"预算编制、利润管控、成本优化"},
  {"key":"customer","name":"客户经营","weight":20,"description":"大客户关系、需求挖掘、满意度"},
  {"key":"team_building","name":"团队建设","weight":15,"description":"人才培养、绩效管理、组织效能"},
  {"key":"project_delivery","name":"交付管理","weight":15,"description":"项目管控、质量保障、交期管理"},
  {"key":"innovation","name":"创新驱动","weight":10,"description":"新产品开发、技术路线、专利"}
]'::jsonb),

('dept_manager', '部门经理', 'Department Manager', '管理', '[
  {"key":"department_ops","name":"部门运营","weight":25,"description":"流程优化、资源配置、效率提升"},
  {"key":"team_leadership","name":"团队领导力","weight":25,"description":"目标设定、激励沟通、冲突解决"},
  {"key":"cross_dept","name":"跨部门协作","weight":20,"description":"横向协调、信息共享、联合项目"},
  {"key":"kpi_management","name":"绩效管理","weight":15,"description":"KPI设定、过程跟踪、辅导反馈"},
  {"key":"strategic_thinking","name":"战略思维","weight":15,"description":"规划能力、风险判断、决策质量"}
]'::jsonb),

-- IT类 (IT & Digital)
('it_engineer', 'IT工程师', 'IT Engineer', 'AI数智部', '[
  {"key":"system_admin","name":"系统运维","weight":25,"description":"服务器、网络、数据库管理"},
  {"key":"development","name":"开发能力","weight":25,"description":"编程语言、Web开发、API设计"},
  {"key":"security","name":"信息安全","weight":20,"description":"网络安全、数据备份、权限管理"},
  {"key":"automation","name":"自动化","weight":15,"description":"CI/CD、脚本、监控告警"},
  {"key":"project","name":"项目交付","weight":15,"description":"需求分析、进度管理、文档"}
]'::jsonb),

-- 项目管理类 (Project Management)
('project_manager', '项目经理', 'Project Manager', '事业部', '[
  {"key":"planning","name":"项目规划","weight":25,"description":"WBS分解、里程碑、资源计划"},
  {"key":"execution","name":"执行管控","weight":25,"description":"进度跟踪、风险管理、变更控制"},
  {"key":"stakeholder","name":"干系人管理","weight":20,"description":"客户沟通、汇报、期望管理"},
  {"key":"cost_schedule","name":"成本进度","weight":15,"description":"预算控制、挣值分析、赶工"},
  {"key":"quality_delivery","name":"质量交付","weight":15,"description":"质量计划、验收标准、客户满意度"}
]'::jsonb),

-- 市场类 (Marketing)
('marketing_specialist', '市场专员', 'Marketing Specialist', '市场部', '[
  {"key":"market_research","name":"市场调研","weight":25,"description":"行业分析、竞品调研、客户画像"},
  {"key":"brand_promotion","name":"品牌推广","weight":25,"description":"展会策划、宣传物料、新媒体"},
  {"key":"lead_generation","name":"线索获取","weight":20,"description":"渠道开发、数字营销、转化率"},
  {"key":"data_analysis","name":"数据分析","weight":15,"description":"营销数据、ROI分析、报告"},
  {"key":"event_management","name":"活动管理","weight":15,"description":"展会组织、客户活动、预算控制"}
]'::jsonb)
ON CONFLICT (position_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Sample Questions (示例题库 — 机械装配 L1/L2)
-- ═══════════════════════════════════════════════════════════

INSERT INTO skill_question_bank (position_key, domain_key, question_type, difficulty, target_levels, content, options, correct_answer, explanation, points, is_manual_entry) VALUES
-- 机械装配 - 装配工艺
('mechanical_assembly', 'assembly_process', 'single_choice', 'basic', '["L1","L2"]',
 '螺栓拧紧时，正确的拧紧顺序是？',
 '[{"key":"A","text":"从中心向外对角拧紧","isCorrect":true},{"key":"B","text":"从左到右依次拧紧"},{"key":"C","text":"从外向中心拧紧"},{"key":"D","text":"随意顺序拧紧"}]',
 'A', '对角拧紧可确保受力均匀，防止工件变形', 2, false),

('mechanical_assembly', 'assembly_process', 'single_choice', 'basic', '["L1","L2"]',
 '装配过程中发现零件尺寸超差，正确处理方式是？',
 '[{"key":"A","text":"自行修改继续装配"},{"key":"B","text":"停止装配，通知质检和上级","isCorrect":true},{"key":"C","text":"勉强装配后补报"},{"key":"D","text":"换一个差不多的零件"}]',
 'B', '发现不合格品应立即隔离标记，通知相关人员处理', 2, false),

('mechanical_assembly', 'tool_usage', 'true_false', 'basic', '["L1"]',
 '扭力扳手使用后不需要归零，下次直接使用即可。',
 '[{"key":"T","text":"正确"},{"key":"F","text":"错误","isCorrect":true}]',
 'F', '扭力扳手使用后必须归零，以保持弹簧精度和使用寿命', 1, false),

('mechanical_assembly', 'quality_check', 'single_choice', 'intermediate', '["L2","L3"]',
 '以下哪种量具适合测量轴类零件的外径（精度要求0.01mm）？',
 '[{"key":"A","text":"钢直尺"},{"key":"B","text":"游标卡尺(0.02mm)"},{"key":"C","text":"外径千分尺(0.01mm)","isCorrect":true},{"key":"D","text":"卷尺"}]',
 'C', '外径千分尺精度0.01mm，满足精度要求', 2, false),

('mechanical_assembly', 'safety', 'multi_choice', 'basic', '["L1","L2"]',
 '机械装配作业中，以下哪些属于必须佩戴的个人防护用品？（多选）',
 '[{"key":"A","text":"安全帽","isCorrect":true},{"key":"B","text":"防护手套","isCorrect":true},{"key":"C","text":"防护眼镜","isCorrect":true},{"key":"D","text":"拖鞋"},{"key":"E","text":"安全鞋","isCorrect":true}]',
 'A,B,C,E', '工作时必须佩戴安全帽、防护手套、防护眼镜和安全鞋', 3, false),

-- 电气装配 - 接线工艺
('electrical_assembly', 'wiring_process', 'single_choice', 'basic', '["L1","L2"]',
 '多股铜线压接端子前，正确的处理步骤是？',
 '[{"key":"A","text":"直接压接"},{"key":"B","text":"将线芯拧紧后压接","isCorrect":true},{"key":"C","text":"用胶带缠绕后压接"},{"key":"D","text":"剪掉部分线芯再压接"}]',
 'B', '多股铜线应先拧紧线芯，确保压接牢固不散股', 2, false),

('electrical_assembly', 'safety_electrical', 'true_false', 'basic', '["L1"]',
 '测量电气回路绝缘电阻时，必须先断开所有电源。',
 '[{"key":"T","text":"正确","isCorrect":true},{"key":"F","text":"错误"}]',
 'T', '绝缘电阻测量前必须确保完全断电，防止触电和损坏仪表', 1, false),

-- 电气工程师 - PLC编程
('electrical_engineer', 'plc_programming', 'single_choice', 'intermediate', '["L2","L3"]',
 '在西门子S7-1200 PLC中，FB（功能块）与FC（函数）的主要区别是？',
 '[{"key":"A","text":"FB有背景数据块(DB)可保存状态，FC没有","isCorrect":true},{"key":"B","text":"FC执行速度比FB快"},{"key":"C","text":"FB只能用梯形图编写"},{"key":"D","text":"没有本质区别"}]',
 'A', 'FB关联背景数据块(Instance DB)，可保存调用间的状态数据；FC无此功能', 3, false),

('electrical_engineer', 'plc_programming', 'short_answer', 'advanced', '["L3","L4"]',
 '请简述PLC程序中"看门狗(Watchdog)"的作用及配置要点。',
 NULL, NULL,
 '看门狗用于监控程序循环时间，超时则触发安全停机。配置要点包括：合理设置超时时间、配置OB80组织块处理超时事件、区分不同优先级任务的时间片。',
 5, false),

-- 焊工 - 焊接技术
('welding', 'welding_technique', 'single_choice', 'basic', '["L1","L2"]',
 'CO2气体保护焊时，焊丝伸出长度一般控制在？',
 '[{"key":"A","text":"5-8mm"},{"key":"B","text":"10-15mm","isCorrect":true},{"key":"C","text":"20-25mm"},{"key":"D","text":"30mm以上"}]',
 'B', 'CO2焊焊丝伸出长度一般为10-15mm，过长会导致飞溅增大', 2, false),

-- 销售工程师 - 产品知识
('sales_engineer', 'product_knowledge', 'case_analysis', 'advanced', '["L3","L4"]',
 '客户要求非标定制一台半导体设备清洗机，预算300万，交付周期4个月。请分析：\n1. 你会如何评估该项目的可行性？\n2. 报价前需要向技术部门确认哪些关键信息？\n3. 如何平衡客户预算与公司利润？',
 NULL, NULL,
 '评分要点：可行性分析完整性（技术/产能/交期/利润）、技术确认清单（规格/材质/工艺/安全标准）、商务策略（分期/标准化降本/增值服务）',
 10, false),

-- 项目经理 - 项目规划
('project_manager', 'planning', 'case_analysis', 'intermediate', '["L2","L3"]',
 '你负责一个交付周期为6个月的非标设备项目，客户要求月度汇报进展。请设计：\n1. 项目里程碑（至少5个关键节点）\n2. 每个里程碑的交付物\n3. 主要风险及应对措施',
 NULL, NULL,
 '评分要点：里程碑合理性（设计评审/采购完成/装配完成/调试/发货）、交付物明确（图纸/BOM/测试报告/验收报告）、风险识别全面（供应商延期/设计变更/客户需求变更）',
 10, false)
ON CONFLICT DO NOTHING;
