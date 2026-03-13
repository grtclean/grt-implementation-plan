-- Enterprise Knowledge & Compliance Platform — 企业知识合规平台
-- Consolidates all company documents, SOPs, standards into role-mapped, skill-gated hub

-- ── Document Categories (文档分类树) ──
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  icon VARCHAR(50),
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Role-Document Requirements (岗位文档要求) ──
CREATE TABLE IF NOT EXISTS knowledge_role_requirements (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  position VARCHAR(100),
  doc_source_type VARCHAR(30) NOT NULL,
  doc_source_id VARCHAR(100),
  doc_title VARCHAR(500) NOT NULL,
  doc_url VARCHAR(1000),
  category_code VARCHAR(50),
  requirement_level VARCHAR(20) NOT NULL DEFAULT 'must_know',
  skill_level_required INTEGER DEFAULT 1,
  mastery_expectation VARCHAR(20) DEFAULT 'understand',
  has_test BOOLEAN DEFAULT FALSE,
  test_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX krr_role_idx ON knowledge_role_requirements(role);
CREATE INDEX krr_category_idx ON knowledge_role_requirements(category_code);
CREATE INDEX krr_skill_level_idx ON knowledge_role_requirements(skill_level_required);

-- ── Skill Level Standards (技能等级标准) ──
CREATE TABLE IF NOT EXISTS knowledge_skill_level_standards (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  skill_level INTEGER NOT NULL,
  level_name VARCHAR(50) NOT NULL,
  level_name_en VARCHAR(50),
  knowledge_requirements JSON DEFAULT '[]',
  skill_requirements JSON DEFAULT '[]',
  performance_standards JSON DEFAULT '[]',
  certification_required JSON DEFAULT '[]',
  training_hours_required INTEGER DEFAULT 0,
  theory_test_required BOOLEAN DEFAULT FALSE,
  min_test_score INTEGER DEFAULT 60,
  practical_assessment_required BOOLEAN DEFAULT FALSE,
  min_months_at_previous_level INTEGER DEFAULT 6,
  min_kpi_score DECIMAL(5,2),
  description TEXT,
  example_tasks JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ksl_role_level_idx ON knowledge_skill_level_standards(role, department, skill_level);

-- ── Access Authorization (访问授权) ──
CREATE TABLE IF NOT EXISTS knowledge_access_authorizations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name VARCHAR(100) NOT NULL,
  doc_source_type VARCHAR(30) NOT NULL,
  doc_source_id VARCHAR(100),
  doc_title VARCHAR(500) NOT NULL,
  auth_type VARCHAR(20) NOT NULL DEFAULT 'time_limited',
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  max_access_count INTEGER,
  current_access_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  request_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_by_name VARCHAR(100),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX kaa_user_idx ON knowledge_access_authorizations(user_id);
CREATE INDEX kaa_status_idx ON knowledge_access_authorizations(status);
CREATE INDEX kaa_doc_idx ON knowledge_access_authorizations(doc_source_type, doc_source_id);

-- ── Learning Progress (学习进度) ──
CREATE TABLE IF NOT EXISTS knowledge_learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  doc_source_type VARCHAR(30) NOT NULL,
  doc_source_id VARCHAR(100),
  doc_title VARCHAR(500) NOT NULL,
  category_code VARCHAR(50),
  status VARCHAR(20) DEFAULT 'not_started',
  progress_percent INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  last_studied_at TIMESTAMP,
  completed_at TIMESTAMP,
  personal_notes TEXT,
  bookmark_position VARCHAR(200),
  test_attempts INTEGER DEFAULT 0,
  best_test_score INTEGER,
  test_passed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX klp_user_doc_idx ON knowledge_learning_progress(user_id, doc_source_type, doc_source_id);
CREATE INDEX klp_status_idx ON knowledge_learning_progress(status);
CREATE INDEX klp_category_idx ON knowledge_learning_progress(category_code);

-- ── Theory Tests (理论测试) ──
CREATE TABLE IF NOT EXISTS knowledge_theory_tests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category_code VARCHAR(50),
  target_role VARCHAR(50),
  skill_level_required INTEGER DEFAULT 1,
  questions JSON NOT NULL,
  total_points INTEGER NOT NULL,
  passing_score INTEGER NOT NULL DEFAULT 60,
  time_limit_minutes INTEGER DEFAULT 30,
  max_attempts INTEGER DEFAULT 3,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ktt_category_idx ON knowledge_theory_tests(category_code);
CREATE INDEX ktt_role_idx ON knowledge_theory_tests(target_role);

-- ── Test Attempts (测试记录) ──
CREATE TABLE IF NOT EXISTS knowledge_test_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  test_id INTEGER NOT NULL REFERENCES knowledge_theory_tests(id),
  answers JSON,
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_minutes INTEGER,
  question_results JSON,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX kta_user_idx ON knowledge_test_attempts(user_id);
CREATE INDEX kta_test_idx ON knowledge_test_attempts(test_id);
CREATE INDEX kta_passed_idx ON knowledge_test_attempts(passed);

-- ══════════════════════════════════════════════════════════════════
-- SEED DATA
-- ══════════════════════════════════════════════════════════════════

-- ── Categories (20 document categories) ──
INSERT INTO knowledge_categories (code, name, name_en, icon, parent_id, sort_order, description, color) VALUES
  ('TRAIN',    '培训资料',     'Training Materials',    'GraduationCap', NULL, 1,  '入职培训、岗位技能培训、在线课程', '#3b82f6'),
  ('CUSTOMER', '客户资料',     'Customer Resources',    'Building2',     NULL, 2,  '客户介绍、需求文档、项目背景', '#8b5cf6'),
  ('TECH',     '技术规范',     'Technical Standards',   'Cpu',           NULL, 3,  '技术标准、设计规范、工艺参数', '#06b6d4'),
  ('PROCESS',  '流程制度',     'Process & Policy',      'GitBranch',     NULL, 4,  'SOP、作业指导书、调试指导书', '#10b981'),
  ('PRODUCT',  '产品资料',     'Product Documentation', 'Package',       NULL, 5,  '产品规格、BOM、技术手册', '#f59e0b'),
  ('SERVICE',  '服务体系',     'Service System',        'Headphones',    NULL, 6,  '售后流程、服务标准、维保方案', '#ef4444'),
  ('QUALITY',  '质量体系',     'Quality System',        'ShieldCheck',   NULL, 7,  'IATF 16949、ISO 9001、审核文件', '#6366f1'),
  ('AUDIT',    '审核文件',     'Audit Documents',       'ClipboardCheck',NULL, 8,  '内审报告、管理评审、客户审核', '#a855f7'),
  ('CUSTFILE', '客户文件',     'Customer Files',        'FileText',      NULL, 9,  '客户图纸、技术协议、保密文件', '#dc2626'),
  ('FORM',     '表格模板',     'Forms & Templates',     'Table2',        NULL, 10, '各类表格、记录模板、检查清单', '#84cc16'),
  ('PROJECT',  '项目管理',     'Project Management',    'FolderKanban',  NULL, 11, '项目阶段要求、里程碑、交付标准', '#0ea5e9'),
  ('SKILL',    '岗位技能',     'Job Skills',            'Award',         NULL, 12, '岗位能力要求、技能等级标准', '#f97316'),
  ('HR',       '人事制度',     'HR Policies',           'Users',         NULL, 13, '请假、考勤、晋升、离职制度', '#ec4899'),
  ('FINANCE',  '财务制度',     'Finance Policies',      'Banknote',      NULL, 14, '报销、预算、财务审批制度', '#14b8a6'),
  ('SAFETY',   '安全规范',     'Safety Regulations',    'AlertTriangle', NULL, 15, '安全生产、5S、应急预案', '#ef4444'),
  ('COMPLY',   '保密合规',     'Compliance',            'Lock',          NULL, 16, 'NDA、数据保护、出口管控', '#6b7280'),
  ('CLEAN',    '清洁度标准',   'Cleanliness Standards', 'Sparkles',      NULL, 17, '清洁度等级、检测标准、客户要求', '#0284c7'),
  ('EQUIP',    '设备资料',     'Equipment',             'Settings',      NULL, 18, '设备选型、配置方案、维护手册', '#7c3aed'),
  ('PLATFORM', '平台资料',     'Platform Resources',    'Globe',         NULL, 19, '选型平台、供应商目录、技术评估', '#059669'),
  ('SOP',      'SOP作业指导',  'SOP & Work Instructions','BookOpen',     NULL, 20, 'SOP文档、调试指导书、工艺卡', '#2563eb');

-- ── Skill Level Standards for production_engineer (5 levels) ──
INSERT INTO knowledge_skill_level_standards (role, department, skill_level, level_name, level_name_en,
  knowledge_requirements, skill_requirements, performance_standards, certification_required,
  training_hours_required, theory_test_required, min_test_score, practical_assessment_required,
  min_months_at_previous_level, min_kpi_score, description, example_tasks) VALUES
  ('production_engineer', NULL, 1, '初级', 'Junior',
   '["公司规章制度","安全生产基础","5S管理","基本设备操作"]',
   '["设备基本操作","工具正确使用","简单故障识别"]',
   '["独立完成标准工序","合格率≥95%"]',
   '["安全生产证"]', 40, true, 60, false, 0, 60.00,
   '入职0-6个月，掌握基础操作规范，能在指导下完成标准工序',
   '["在指导下操作CNC设备","按SOP完成装配","填写生产记录"]'),
  ('production_engineer', NULL, 2, '中级', 'Intermediate',
   '["IATF 16949基础","SPC统计过程控制","图纸识读","清洁度标准"]',
   '["独立设备调试","质量问题初步分析","ERP系统操作"]',
   '["独立完成复杂工序","合格率≥98%","能指导初级"]',
   '["ERP操作证","品质基础证"]', 80, true, 70, true, 6, 70.00,
   '6-18个月，独立完成复杂工序，掌握质量管控基础',
   '["独立CNC编程调试","SPC数据分析","ERP工单操作","指导新员工"]'),
  ('production_engineer', NULL, 3, '高级', 'Senior',
   '["FMEA方法论","8D报告","客户设备技术要求","项目管理基础"]',
   '["工艺优化","设备选型建议","跨部门协调","培训能力"]',
   '["产线效率提升≥5%","质量问题解决率≥90%","能培训团队"]',
   '["项目管理基础证","FMEA培训证"]', 120, true, 75, true, 12, 75.00,
   '18-36个月，能优化工艺流程，解决复杂质量问题',
   '["主导FMEA分析","工艺参数优化","设备选型报告","编写调试指导书"]'),
  ('production_engineer', NULL, 4, '专家', 'Expert',
   '["精益生产","六西格玛","客户审核应对","成本分析"]',
   '["新产品导入","产线设计","客户审核支持","技术决策"]',
   '["主导NPI项目","年成本节约≥10万","0重大质量事故"]',
   '["六西格玛绿带","精益生产证"]', 160, true, 80, true, 18, 80.00,
   '3-5年，技术专家级别，能主导NPI和重大项目',
   '["新产品工艺设计","精益改善项目","客户审核主导","技术方案评审"]'),
  ('production_engineer', NULL, 5, '大师', 'Master',
   '["行业前沿技术","数字化转型","战略规划","体系架构"]',
   '["技术战略规划","团队能力体系建设","行业标准制定"]',
   '["带领团队达成年度目标","专利/论文","行业影响力"]',
   '["六西格玛黑带","行业资格认证"]', 200, false, 0, true, 24, 85.00,
   '5年以上，技术领域带头人，能制定技术战略方向',
   '["制定技术发展路线图","建立人才梯队","行业交流分享","技术创新提案"]');

-- ── Skill Level Standards for quality_inspector ──
INSERT INTO knowledge_skill_level_standards (role, department, skill_level, level_name, level_name_en,
  knowledge_requirements, skill_requirements, training_hours_required, theory_test_required, min_test_score,
  min_months_at_previous_level, min_kpi_score, description) VALUES
  ('quality_inspector', '品质部', 1, '初级', 'Junior',
   '["来料检验标准","量具使用","检验记录填写","5S规范"]',
   '["卡尺/千分尺使用","外观检验","记录填写"]', 40, true, 60, 0, 60.00,
   '掌握基本检验操作，能按标准完成来料检验'),
  ('quality_inspector', '品质部', 2, '中级', 'Intermediate',
   '["SPC图表解读","IATF 16949条款","清洁度检测","MSA基础"]',
   '["CMM操作","SPC分析","不合格品处理"]', 80, true, 70, 6, 70.00,
   '独立完成全过程检验，掌握统计质量工具'),
  ('quality_inspector', '品质部', 3, '高级', 'Senior',
   '["FMEA分析","控制计划编制","客户特殊要求","审核技巧"]',
   '["内审员能力","FMEA参与","控制计划维护","客户投诉处理"]', 120, true, 75, 12, 75.00,
   '能独立执行内审，参与FMEA和控制计划编制');

-- ── Role-Document Requirements (示例: production_engineer) ──
INSERT INTO knowledge_role_requirements (role, doc_source_type, doc_title, category_code,
  requirement_level, skill_level_required, mastery_expectation, has_test, sort_order) VALUES
  ('production_engineer', 'org_doc',           '公司规章制度总纲',            'HR',       'must_know',    1, 'understand', false, 1),
  ('production_engineer', 'org_doc',           '安全生产管理制度',            'SAFETY',   'must_know',    1, 'apply',      true,  2),
  ('production_engineer', 'org_doc',           '5S管理规范',                 'SAFETY',   'must_know',    1, 'apply',      false, 3),
  ('production_engineer', 'sop',              'UC-3000清洁机操作SOP',        'SOP',      'must_know',    1, 'apply',      true,  4),
  ('production_engineer', 'training_material', 'ERP操作培训手册',            'TRAIN',    'must_know',    2, 'apply',      true,  5),
  ('production_engineer', 'org_doc',           'IATF 16949体系手册',         'QUALITY',  'should_know',  2, 'understand', true,  6),
  ('production_engineer', 'org_doc',           '清洁度检测标准',             'CLEAN',    'must_know',    2, 'apply',      false, 7),
  ('production_engineer', 'org_doc',           '客户图纸管理制度',           'CUSTFILE',  'must_know',    2, 'understand', false, 8),
  ('production_engineer', 'org_doc',           'FMEA方法论指南',             'QUALITY',  'must_know',    3, 'analyze',    true,  9),
  ('production_engineer', 'org_doc',           '8D问题解决流程',             'QUALITY',  'must_know',    3, 'apply',      true,  10),
  ('production_engineer', 'org_doc',           '项目管理规范(APQP)',          'PROJECT',  'should_know',  3, 'understand', false, 11),
  ('production_engineer', 'training_material', '客户设备技术要求汇编',       'EQUIP',    'should_know',  3, 'understand', false, 12),
  ('production_engineer', 'org_doc',           '精益生产实施指南',           'PROCESS',  'must_know',    4, 'master',     true,  13),
  ('production_engineer', 'org_doc',           '成本分析与控制制度',         'FINANCE',  'should_know',  4, 'analyze',    false, 14),
  ('production_engineer', 'org_doc',           '新产品导入(NPI)流程',        'PROJECT',  'must_know',    4, 'master',     false, 15),
  -- Common for all roles
  ('ALL',                 'org_doc',           '员工手册',                   'HR',       'must_know',    1, 'understand', false, 1),
  ('ALL',                 'org_doc',           '保密协议与合规规范',         'COMPLY',   'must_know',    1, 'understand', true,  2),
  ('ALL',                 'org_doc',           '请假与报销制度',             'HR',       'must_know',    1, 'understand', false, 3),
  ('ALL',                 'org_doc',           '信息安全管理制度',           'COMPLY',   'must_know',    1, 'aware',      false, 4),
  ('ALL',                 'org_doc',           '消防安全应急预案',           'SAFETY',   'must_know',    1, 'aware',      false, 5);

-- ── Sample Theory Test ──
INSERT INTO knowledge_theory_tests (title, description, category_code, target_role, skill_level_required,
  questions, total_points, passing_score, time_limit_minutes, max_attempts) VALUES
  ('安全生产基础理论测试', '入职安全培训理论考核', 'SAFETY', NULL, 1,
   '[
     {"id":1,"type":"single","question":"进入车间必须佩戴的个人防护装备不包括:","options":["安全帽","防护眼镜","工作服","围巾"],"correctAnswer":"围巾","points":10,"explanation":"围巾有卷入机器的风险"},
     {"id":2,"type":"truefalse","question":"在车间内可以使用手机拍照记录生产问题","correctAnswer":"false","points":10,"explanation":"未经授权不得在车间拍照，涉及客户保密"},
     {"id":3,"type":"single","question":"发现火灾隐患应首先:","options":["自行处理","报告主管","拨打119","继续工作"],"correctAnswer":"报告主管","points":10,"explanation":"应立即报告主管，由专业人员处理"},
     {"id":4,"type":"multiple","question":"5S管理包括(多选):","options":["整理","整顿","清扫","清洁","素养","安全"],"correctAnswer":["整理","整顿","清扫","清洁","素养"],"points":15,"explanation":"5S=整理+整顿+清扫+清洁+素养"},
     {"id":5,"type":"single","question":"化学品泄漏处理的第一步是:","options":["用水冲洗","查看MSDS","疏散人员","通知环保部门"],"correctAnswer":"疏散人员","points":10,"explanation":"首先确保人员安全"},
     {"id":6,"type":"truefalse","question":"清洁度检测区域需要穿戴无尘服","correctAnswer":"true","points":10,"explanation":"清洁度检测对环境要求严格"},
     {"id":7,"type":"fillblank","question":"GRT公司的质量方针核心是___","correctAnswer":"零缺陷","points":10,"explanation":"公司核心质量目标"},
     {"id":8,"type":"single","question":"设备异常报警时应:","options":["立即按急停","继续观察","关闭报警继续","报告班长后按急停"],"correctAnswer":"立即按急停","points":15,"explanation":"安全第一，立即停机"},
     {"id":9,"type":"truefalse","question":"下班前必须关闭设备电源并做好交接记录","correctAnswer":"true","points":5,"explanation":"安全操作规范要求"},
     {"id":10,"type":"single","question":"工伤事故发生后多少小时内必须上报:","options":["1小时","4小时","12小时","24小时"],"correctAnswer":"4小时","points":5}
   ]',
   100, 60, 20, 3),
  ('IATF 16949基础知识测试', '质量体系基础理论考核', 'QUALITY', 'production_engineer', 2,
   '[
     {"id":1,"type":"single","question":"IATF 16949是哪个行业的质量管理体系标准:","options":["食品","汽车","航空","电子"],"correctAnswer":"汽车","points":10},
     {"id":2,"type":"single","question":"PFMEA中RPN的计算公式为:","options":["S×O×D","S+O+D","S×O+D","S×D"],"correctAnswer":"S×O×D","points":15,"explanation":"RPN=严重度×发生度×探测度"},
     {"id":3,"type":"multiple","question":"APQP的五个阶段包括(多选):","options":["计划和确定","产品设计和开发","过程设计和开发","产品和过程确认","反馈、评定和纠正措施","生产准备"],"correctAnswer":["计划和确定","产品设计和开发","过程设计和开发","产品和过程确认","反馈、评定和纠正措施"],"points":15},
     {"id":4,"type":"truefalse","question":"控制计划是活文件，需要在过程变更时更新","correctAnswer":"true","points":10},
     {"id":5,"type":"single","question":"SPC中Cpk≥1.33表示:","options":["过程不稳定","过程能力不足","过程能力充分","过程失控"],"correctAnswer":"过程能力充分","points":15},
     {"id":6,"type":"single","question":"MSA中GR&R可接受的标准是:","options":["<10%","<20%","<30%","<50%"],"correctAnswer":"<10%","points":10,"explanation":"<10%优秀，10-30%可接受"},
     {"id":7,"type":"truefalse","question":"客户特殊特性必须在控制计划中标识","correctAnswer":"true","points":10},
     {"id":8,"type":"single","question":"8D问题解决法的D4是:","options":["成立团队","描述问题","临时措施","根本原因分析"],"correctAnswer":"根本原因分析","points":15}
   ]',
   100, 70, 30, 3);
