-- Department Procedures & Regulations System (规章制度管理)
-- Covers all GRT departments with core procedures, regulations, compliance requirements, exception handling

-- Enums
DO $$ BEGIN CREATE TYPE procedure_type AS ENUM ('core_procedure','regulation','compliance','exception_handling'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE procedure_status AS ENUM ('draft','under_review','approved','effective','superseded','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE procedure_priority AS ENUM ('critical','high','standard','reference'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ack_method AS ENUM ('digital_signature','checkbox','quiz_pass'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE exception_severity AS ENUM ('minor','major','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE exception_status AS ENUM ('open','investigating','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE review_frequency AS ENUM ('monthly','quarterly','semi_annual','annual','on_change'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table 1: Procedure Categories
CREATE TABLE IF NOT EXISTS dept_procedure_categories (
  id SERIAL PRIMARY KEY,
  dept_code VARCHAR(50) NOT NULL,
  dept_name VARCHAR(100) NOT NULL,
  dept_name_en VARCHAR(100),
  procedure_type procedure_type NOT NULL,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_cat_dept ON dept_procedure_categories(dept_code);
CREATE INDEX IF NOT EXISTS idx_proc_cat_type ON dept_procedure_categories(procedure_type);

-- Table 2: Procedures
CREATE TABLE IF NOT EXISTS dept_procedures (
  id SERIAL PRIMARY KEY,
  procedure_code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  title_en VARCHAR(500),
  category_id INTEGER,
  dept_code VARCHAR(50) NOT NULL,
  procedure_type procedure_type NOT NULL,
  priority procedure_priority NOT NULL DEFAULT 'standard',
  status procedure_status NOT NULL DEFAULT 'draft',
  current_version VARCHAR(20) DEFAULT 'V1.0',
  version_major INTEGER DEFAULT 1,
  version_minor INTEGER DEFAULT 0,
  content TEXT,
  summary TEXT,
  scope TEXT,
  applicable_roles JSONB,
  applicable_bus JSONB,
  legal_basis TEXT,
  industry_standard VARCHAR(200),
  effective_date TIMESTAMP,
  expiry_date TIMESTAMP,
  review_frequency review_frequency DEFAULT 'annual',
  next_review_date TIMESTAMP,
  owner_user_id INTEGER,
  owner_name VARCHAR(100),
  owner_role VARCHAR(50),
  approver_user_id INTEGER,
  approver_name VARCHAR(100),
  related_procedure_ids JSONB,
  attachments JSONB,
  kpi_codes JSONB,
  penalty_rules JSONB,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_dept ON dept_procedures(dept_code);
CREATE INDEX IF NOT EXISTS idx_proc_type ON dept_procedures(procedure_type);
CREATE INDEX IF NOT EXISTS idx_proc_status ON dept_procedures(status);
CREATE INDEX IF NOT EXISTS idx_proc_effective ON dept_procedures(effective_date);
CREATE INDEX IF NOT EXISTS idx_proc_owner ON dept_procedures(owner_role);

-- Table 3: Procedure Versions
CREATE TABLE IF NOT EXISTS dept_procedure_versions (
  id SERIAL PRIMARY KEY,
  procedure_id INTEGER NOT NULL,
  version VARCHAR(20) NOT NULL,
  version_major INTEGER,
  version_minor INTEGER,
  change_type VARCHAR(30),
  change_summary TEXT NOT NULL,
  content TEXT,
  approved_by INTEGER,
  approved_by_name VARCHAR(100),
  approved_at TIMESTAMP,
  published_at TIMESTAMP,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_ver_proc ON dept_procedure_versions(procedure_id);

-- Table 4: Acknowledgments
CREATE TABLE IF NOT EXISTS dept_procedure_acknowledgments (
  id SERIAL PRIMARY KEY,
  procedure_id INTEGER NOT NULL,
  version_acknowledged VARCHAR(20) NOT NULL,
  user_id INTEGER NOT NULL,
  employee_id VARCHAR(50),
  employee_name VARCHAR(100),
  department VARCHAR(100),
  acknowledged_at TIMESTAMP NOT NULL,
  acknowledgment_method ack_method DEFAULT 'checkbox',
  quiz_score INTEGER,
  ip_address VARCHAR(50),
  is_latest_version BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proc_ack_unique ON dept_procedure_acknowledgments(procedure_id, user_id, version_acknowledged);
CREATE INDEX IF NOT EXISTS idx_proc_ack_user ON dept_procedure_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_proc_ack_proc ON dept_procedure_acknowledgments(procedure_id);

-- Table 5: Exception Records
CREATE TABLE IF NOT EXISTS dept_procedure_exceptions (
  id SERIAL PRIMARY KEY,
  procedure_id INTEGER NOT NULL,
  exception_code VARCHAR(50),
  reported_by INTEGER,
  reported_by_name VARCHAR(100),
  reported_at TIMESTAMP DEFAULT NOW(),
  department VARCHAR(100),
  description TEXT NOT NULL,
  severity exception_severity NOT NULL DEFAULT 'minor',
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  status exception_status NOT NULL DEFAULT 'open',
  resolved_by INTEGER,
  resolved_by_name VARCHAR(100),
  resolved_at TIMESTAMP,
  kpi_impact JSONB,
  linked_incident_ids JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_exc_proc ON dept_procedure_exceptions(procedure_id);
CREATE INDEX IF NOT EXISTS idx_proc_exc_status ON dept_procedure_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_proc_exc_severity ON dept_procedure_exceptions(severity);

-- Table 6: KPI Links
CREATE TABLE IF NOT EXISTS dept_procedure_kpi_links (
  id SERIAL PRIMARY KEY,
  procedure_id INTEGER NOT NULL,
  kpi_code VARCHAR(80) NOT NULL,
  kpi_name VARCHAR(200) NOT NULL,
  kpi_name_en VARCHAR(200),
  target_value VARCHAR(50),
  measurement_method TEXT,
  weight DECIMAL(5,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_kpi_proc ON dept_procedure_kpi_links(procedure_id);
CREATE INDEX IF NOT EXISTS idx_proc_kpi_code ON dept_procedure_kpi_links(kpi_code);

-- ══════════════════════════════════════════════════════════════
-- SEED: Department Categories
-- ══════════════════════════════════════════════════════════════

INSERT INTO dept_procedure_categories (dept_code, dept_name, dept_name_en, procedure_type, sort_order, description) VALUES
-- 总裁办
('ceo_office', '总裁办', 'CEO Office', 'core_procedure', 1, '公司战略决策与治理流程'),
('ceo_office', '总裁办', 'CEO Office', 'regulation', 2, '公司级管理制度'),
('ceo_office', '总裁办', 'CEO Office', 'compliance', 3, '公司治理合规'),
('ceo_office', '总裁办', 'CEO Office', 'exception_handling', 4, '重大事件应急'),
-- 事业部
('bu_operations', '事业部', 'Business Units', 'core_procedure', 1, '项目执行与交付流程'),
('bu_operations', '事业部', 'Business Units', 'regulation', 2, '事业部运营制度'),
('bu_operations', '事业部', 'Business Units', 'compliance', 3, '合同与商务合规'),
('bu_operations', '事业部', 'Business Units', 'exception_handling', 4, '项目异常处理'),
-- AI数智部
('ai_digital', 'AI数智部', 'AI & Digital', 'core_procedure', 1, 'AI系统开发与部署流程'),
('ai_digital', 'AI数智部', 'AI & Digital', 'regulation', 2, '数据安全与AI治理制度'),
('ai_digital', 'AI数智部', 'AI & Digital', 'compliance', 3, '数据合规与隐私保护'),
('ai_digital', 'AI数智部', 'AI & Digital', 'exception_handling', 4, 'AI系统异常处理'),
-- 财务部
('finance', '财务部', 'Finance', 'core_procedure', 1, '财务核心流程'),
('finance', '财务部', 'Finance', 'regulation', 2, '财务管理制度'),
('finance', '财务部', 'Finance', 'compliance', 3, '财税合规要求'),
('finance', '财务部', 'Finance', 'exception_handling', 4, '资金异常处理'),
-- 人事行政部
('hr_admin', '人事行政部', 'HR & Administration', 'core_procedure', 1, '人事核心流程'),
('hr_admin', '人事行政部', 'HR & Administration', 'regulation', 2, '人事管理制度'),
('hr_admin', '人事行政部', 'HR & Administration', 'compliance', 3, '劳动法规合规'),
('hr_admin', '人事行政部', 'HR & Administration', 'exception_handling', 4, '劳动争议处理'),
-- 质量部
('quality', '质量部', 'Quality', 'core_procedure', 1, '质量检验与控制流程'),
('quality', '质量部', 'Quality', 'regulation', 2, '质量管理制度'),
('quality', '质量部', 'Quality', 'compliance', 3, '体系认证合规'),
('quality', '质量部', 'Quality', 'exception_handling', 4, '质量异常处理'),
-- 生产部
('production', '生产部', 'Production', 'core_procedure', 1, '生产执行流程'),
('production', '生产部', 'Production', 'regulation', 2, '生产管理制度'),
('production', '生产部', 'Production', 'compliance', 3, '安全生产合规'),
('production', '生产部', 'Production', 'exception_handling', 4, '生产异常处理'),
-- 研发部
('rnd', '研发部', 'R&D', 'core_procedure', 1, '研发设计流程'),
('rnd', '研发部', 'R&D', 'regulation', 2, '研发管理制度'),
('rnd', '研发部', 'R&D', 'compliance', 3, '认证设计合规'),
('rnd', '研发部', 'R&D', 'exception_handling', 4, '设计缺陷处理'),
-- 采购部
('procurement', '采购部', 'Procurement', 'core_procedure', 1, '采购执行流程'),
('procurement', '采购部', 'Procurement', 'regulation', 2, '采购管理制度'),
('procurement', '采购部', 'Procurement', 'compliance', 3, '供应商合规'),
('procurement', '采购部', 'Procurement', 'exception_handling', 4, '紧急采购处理'),
-- 仓库/物流
('warehouse', '仓库物流部', 'Warehouse & Logistics', 'core_procedure', 1, '仓储物流流程'),
('warehouse', '仓库物流部', 'Warehouse & Logistics', 'regulation', 2, '仓库管理制度'),
('warehouse', '仓库物流部', 'Warehouse & Logistics', 'compliance', 3, '出口与安全合规'),
('warehouse', '仓库物流部', 'Warehouse & Logistics', 'exception_handling', 4, '库存异常处理');

-- ══════════════════════════════════════════════════════════════
-- SEED: ~80 Department Procedures (Real GRT-specific)
-- ══════════════════════════════════════════════════════════════

INSERT INTO dept_procedures (procedure_code, title, title_en, dept_code, procedure_type, priority, status, summary, scope, owner_name, owner_role, approver_name, effective_date, review_frequency, next_review_date, penalty_rules, legal_basis, industry_standard, applicable_roles) VALUES

-- ═══ 总裁办 (CEO Office) ═══
('GRT-CEO-PROC-001', '董事会决议流程', 'Board Resolution Process', 'ceo_office', 'core_procedure', 'critical', 'effective',
 '规范董事会会议召集、议案提交、表决和决议执行全流程，确保公司重大决策依法合规。',
 '适用于全体董事会成员及列席管理层', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"未按程序召集","severity":"critical","consequence":"决议无效，追究召集人责任","escalation":"报董事长"}]',
 '《公司法》第四章', NULL,
 '["admin","director"]'),

('GRT-CEO-PROC-002', '年度经营计划编制流程', 'Annual Business Plan Compilation', 'ceo_office', 'core_procedure', 'critical', 'effective',
 '每年Q4启动次年经营计划编制，OKR从董事长逐级分解到事业部、部门，12月底前完成审批。',
 '适用于全体事业部经理及部门负责人', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"延迟提交计划","severity":"major","consequence":"绩效扣分","escalation":"报副总"}]',
 NULL, NULL,
 '["admin","director","dept_manager","bu_gm"]'),

('GRT-CEO-REG-001', '印章管理制度', 'Corporate Seal Management Policy', 'ceo_office', 'regulation', 'critical', 'effective',
 '公章、合同章、财务章由专人保管，用印需填申请单经审批。合同章用印>50万需董事长亲批。',
 '适用于全体员工', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"私自用印","severity":"critical","consequence":"即刻免职，追究法律责任","escalation":"报董事长+法务"}]',
 '《合同法》', NULL,
 NULL),

('GRT-CEO-REG-002', '保密与知识产权制度', 'Confidentiality and IP Policy', 'ceo_office', 'regulation', 'critical', 'effective',
 '全员签署保密协议，核心技术人员签竞业限制。发明创造归公司所有，专利申请奖励¥5000-50000。',
 '适用于全体员工', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"泄露商业秘密","severity":"critical","consequence":"解除劳动合同，追究法律责任","escalation":"报董事长+法务"},{"violationType":"未签保密协议","severity":"major","consequence":"补签并书面警告","escalation":"报HR经理"}]',
 '《劳动合同法》第23条、《反不正当竞争法》', NULL,
 NULL),

('GRT-CEO-REG-003', '关联交易管理制度', 'Related-Party Transaction Policy', 'ceo_office', 'regulation', 'high', 'effective',
 '公司与关联方之间的交易必须事先披露、独立审议、公允定价，防止利益输送。',
 '适用于董事、高管及其关联方', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"未披露关联交易","severity":"critical","consequence":"交易无效，追究当事人责任","escalation":"报董事会"}]',
 '《公司法》第21条', NULL,
 '["admin","director"]'),

('GRT-CEO-COMP-001', '公司治理合规要求', 'Corporate Governance Compliance', 'ceo_office', 'compliance', 'critical', 'effective',
 '确保公司治理结构符合《公司法》要求，定期自查股东会/董事会/监事会运作规范性。',
 '适用于公司治理层', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'semi_annual', '2026-07-01',
 NULL, '《公司法》全文', NULL,
 '["admin","director"]'),

('GRT-CEO-EXC-001', '重大事件应急处理流程', 'Major Incident Emergency Response', 'ceo_office', 'exception_handling', 'critical', 'effective',
 '火灾/工伤/信息泄露/重大客诉等突发事件30分钟内逐级上报，2小时内启动应急预案，24小时内提交初步报告。',
 '适用于全体员工', '倪亚东', 'admin', '倪亚东',
 '2025-01-01', 'semi_annual', '2026-07-01',
 '[{"violationType":"迟报/瞒报","severity":"critical","consequence":"降级处理","escalation":"报董事长"}]',
 '《安全生产法》', NULL,
 NULL),

('GRT-CEO-REG-004', '授权审批层级管理制度', 'Authorization Approval Hierarchy Policy', 'ceo_office', 'regulation', 'critical', 'effective',
 '明确各类事项的审批层级：出差/采购/预算/项目/客户/材料/费用/合同，按金额分5级审批，设绿色通道与事后补交机制。',
 '适用于全体员工', '倪亚东', 'admin', '倪亚东',
 '2026-03-13', 'quarterly', '2026-06-13',
 '[{"violationType":"越权审批","severity":"critical","consequence":"审批无效，扣减信用积分10分","escalation":"报董事长"},{"violationType":"绿色通道逾期补交","severity":"major","consequence":"扣减信用积分3-5分","escalation":"报部门经理"}]',
 NULL, NULL,
 NULL),

-- ═══ 事业部 (Business Units) ═══
('GRT-BU-PROC-001', '项目立项评审流程', 'Project Initiation Review Process', 'bu_operations', 'core_procedure', 'critical', 'effective',
 'M0阶段门评审：技术可行性、成本预算、资源需求、风险评估、客户需求确认后方可立项。',
 '适用于事业部项目经理及技术骨干', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"未经评审立项","severity":"critical","consequence":"项目终止，追究项目经理责任","escalation":"报事业部经理"}]',
 NULL, 'GRT M-Phase (M0-M12)',
 '["team_leader","dept_manager","bu_gm","bu_pm"]'),

('GRT-BU-PROC-002', '客户需求确认流程', 'Customer Requirements Confirmation', 'bu_operations', 'core_procedure', 'critical', 'effective',
 '客户URS收到后3个工作日内完成技术评审，清洁度标准/材质兼容性/产能需求逐项确认，双方签字盖章。',
 '适用于事业部全体', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"需求遗漏导致返工","severity":"major","consequence":"项目经理承担返工成本考核","escalation":"报事业部经理"}]',
 NULL, NULL,
 '["team_leader","dept_manager","bu_pm","bu_mech","bu_elec","cs_engineer"]'),

('GRT-BU-PROC-003', '报价审批流程', 'Quotation Approval Process', 'bu_operations', 'core_procedure', 'high', 'effective',
 '报价基于成本加成法，毛利率≥25%由事业部经理审批，毛利率<25%需副总审批，战略报价需董事长审批。',
 '适用于事业部销售与项目经理', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"低于成本价报价","severity":"critical","consequence":"无效报价，追究销售经理责任","escalation":"报董事长"}]',
 NULL, NULL,
 '["team_leader","dept_manager","bu_gm","bu_sales"]'),

('GRT-BU-PROC-004', '项目交付与验收流程', 'Project Delivery and Acceptance', 'bu_operations', 'core_procedure', 'critical', 'effective',
 'T9-T15阶段：设备联调(T9) → FAT(T10) → 发运(T11) → 到厂安装(T12) → SAT(T13) → 培训(T14) → 终验收(T15)。每阶段须签署确认书。',
 '适用于事业部项目团队', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"跳过阶段门","severity":"major","consequence":"项目暂停整改","escalation":"报事业部经理"}]',
 NULL, 'GRT M-Phase (T9-T15)',
 '["team_leader","dept_manager","bu_pm","bu_mech","cs_engineer"]'),

('GRT-BU-REG-001', '客户投诉处理制度', 'Customer Complaint Handling Policy', 'bu_operations', 'regulation', 'high', 'effective',
 '客诉24小时内响应，3天内提交8D初步报告，7天内完成根因分析，30天内关闭CAPA。',
 '适用于事业部及质量部相关人员', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"超时未响应","severity":"major","consequence":"扣减信用积分","escalation":"报副总"}]',
 NULL, 'IATF 16949 §10.2.6',
 '["team_leader","dept_manager","bu_pm","cs_engineer","quality_eng"]'),

('GRT-BU-REG-002', '出差与差旅费报销制度', 'Business Travel and Reimbursement Policy', 'bu_operations', 'regulation', 'standard', 'effective',
 '出差需提前3天提交申请，按授权层级审批。住宿/餐饮/交通标准按职级分档，超标需事前审批。',
 '适用于全体员工', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"虚报差旅费","severity":"critical","consequence":"退还虚报金额，书面警告，扣减信用积分","escalation":"报财务经理+HR经理"}]',
 NULL, NULL,
 NULL),

('GRT-BU-COMP-001', '合同签署合规要求', 'Contract Signing Compliance', 'bu_operations', 'compliance', 'critical', 'effective',
 '合同须经法务审核、技术确认、商务审批后方可签署。签署权限按授权层级制度执行，≥500万需董事长亲签。',
 '适用于有合同签署需求的人员', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"越权签署合同","severity":"critical","consequence":"合同效力存疑，追究当事人法律责任","escalation":"报董事长+法务"}]',
 '《合同法》', NULL,
 '["dept_manager","bu_gm","director","admin"]'),

('GRT-BU-EXC-001', '项目延期异常处理流程', 'Project Delay Exception Handling', 'bu_operations', 'exception_handling', 'high', 'effective',
 '项目延期≤7天由项目经理处置并报告；7-30天报事业部经理审批恢复计划；>30天报副总/董事长。',
 '适用于项目经理及事业部管理层', '周辉', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"隐瞒延期","severity":"critical","consequence":"项目经理降级处理","escalation":"报董事长"}]',
 NULL, NULL,
 '["team_leader","dept_manager","bu_gm","bu_pm"]'),

-- ═══ AI数智部 ═══
('GRT-AI-PROC-001', 'AI模型部署上线流程', 'AI Model Deployment Process', 'ai_digital', 'core_procedure', 'critical', 'effective',
 '模型开发→测试→Staging→A/B测试(≥3天)→灰度发布(10%→50%→100%)→监控观察(7天)→正式上线。需CAB审批。',
 '适用于AI数智部全体成员', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'quarterly', '2026-06-01',
 '[{"violationType":"未经CAB审批上线","severity":"critical","consequence":"立即回滚，责任人书面检查","escalation":"报副总"}]',
 NULL, NULL,
 '["dept_manager","team_leader"]'),

('GRT-AI-PROC-002', '数据采集与标注流程', 'Data Collection and Annotation', 'ai_digital', 'core_procedure', 'high', 'effective',
 '数据采集前须通过隐私影响评估(PIA)，标注须双人复核，数据质量抽检率≥10%，准确率目标≥95%。',
 '适用于AI数智部数据团队', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'quarterly', '2026-06-01', NULL, NULL, NULL,
 '["dept_manager","team_leader"]'),

('GRT-AI-REG-001', '数据安全管理制度', 'Data Security Management Policy', 'ai_digital', 'regulation', 'critical', 'effective',
 '数据分级(公开/内部/机密/绝密)，存储加密(AES-256)，传输TLS 1.3，访问权限最小化，日志保留180天。',
 '适用于全体员工', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'semi_annual', '2026-06-01',
 '[{"violationType":"数据越权访问","severity":"critical","consequence":"立即撤销权限，书面警告","escalation":"报副总"},{"violationType":"数据外泄","severity":"critical","consequence":"解除劳动合同，追究法律责任","escalation":"报董事长"}]',
 '《数据安全法》《个人信息保护法》', 'ISO 27001',
 NULL),

('GRT-AI-REG-002', 'AI伦理与治理制度', 'AI Ethics and Governance Policy', 'ai_digital', 'regulation', 'high', 'effective',
 '模型上线前须通过偏见审查，重大决策模型须具备可解释性，定期(季度)审计模型公平性。',
 '适用于AI数智部', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'quarterly', '2026-06-01', NULL, NULL, NULL,
 '["dept_manager","team_leader"]'),

('GRT-AI-COMP-001', '个人信息保护合规要求', 'Personal Information Protection Compliance', 'ai_digital', 'compliance', 'critical', 'effective',
 '收集个人信息须获得明示同意，数据跨境传输须通过安全评估，建立数据主体权利响应机制(15日内)。',
 '适用于涉及个人数据处理的人员', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'semi_annual', '2026-06-01',
 '[{"violationType":"未经同意收集个人信息","severity":"critical","consequence":"立即停止处理，上报监管部门","escalation":"报董事长+法务"}]',
 '《个人信息保护法》(PIPL)', NULL,
 NULL),

('GRT-AI-EXC-001', 'AI系统异常与回滚流程', 'AI System Anomaly and Rollback', 'ai_digital', 'exception_handling', 'critical', 'effective',
 'P1级(系统不可用): 15分钟内回滚。P2级(性能下降): 1小时内定位根因。P3级(功能异常): 24小时内修复。',
 '适用于AI数智部运维团队', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'quarterly', '2026-06-01',
 '[{"violationType":"延迟回滚导致扩大影响","severity":"critical","consequence":"事故报告+责任认定","escalation":"报副总"}]',
 NULL, NULL,
 '["dept_manager","team_leader"]'),

('GRT-AI-PROC-003', '系统变更管理流程', 'System Change Management', 'ai_digital', 'core_procedure', 'high', 'effective',
 '所有生产环境变更须提交变更请求(CR)，经CAB评审，窗口期执行，变更后验证，失败即回滚。',
 '适用于AI数智部', '倪微薇', 'dept_manager', '倪亚东',
 '2025-06-01', 'quarterly', '2026-06-01', NULL, NULL, 'ITIL Change Management',
 '["dept_manager","team_leader"]'),

-- ═══ 财务部 ═══
('GRT-FIN-PROC-001', '费用报销审批流程', 'Expense Reimbursement Approval', 'finance', 'core_procedure', 'high', 'effective',
 '报销须附原始票据，7日内提交。按授权层级审批：≤2k组长、≤10k部门经理、≤50k财务经理、≤200k副总、>200k董事长。',
 '适用于全体员工', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"虚报费用","severity":"critical","consequence":"退还全额+书面警告+扣信用积分10分","escalation":"报HR经理+董事长"}]',
 '《企业会计准则》', NULL,
 NULL),

('GRT-FIN-PROC-002', '月度财务结账流程', 'Monthly Financial Closing', 'finance', 'core_procedure', 'critical', 'effective',
 '次月5日前完成：银行对账→应收应付确认→成本归集→损益结转→报表编制→总经理审核签字。',
 '适用于财务部全体', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'monthly', '2026-04-05',
 '[{"violationType":"延迟结账","severity":"major","consequence":"绩效扣分","escalation":"报副总"}]',
 '《企业会计准则》', NULL,
 '["finance_manager"]'),

('GRT-FIN-PROC-003', '付款审批流程', 'Payment Approval Process', 'finance', 'core_procedure', 'critical', 'effective',
 '付款前须验证供应商信息、合同、发票三单匹配。>50k须双人签章，>200k须董事长批准。',
 '适用于财务部及有付款审批权限的管理层', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"三单不匹配强行付款","severity":"critical","consequence":"财务人员停职调查","escalation":"报董事长"}]',
 NULL, NULL,
 '["finance_manager","dept_manager","director","admin"]'),

('GRT-FIN-REG-001', '备用金管理制度', 'Petty Cash Management Policy', 'finance', 'regulation', 'standard', 'effective',
 '备用金限额¥5000/人，按月清账，逾期未清冲抵工资。借支须填审批单，出纳登记台账。',
 '适用于有备用金需求的人员', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01', NULL, NULL, NULL,
 NULL),

('GRT-FIN-REG-002', '发票管理制度', 'Invoice Management Policy', 'finance', 'regulation', 'high', 'effective',
 '增值税发票须7日内认证，电子发票须查验真伪。发票保管10年，遗失须登报声明并备案税务机关。',
 '适用于财务部及采购/销售人员', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"发票遗失未报备","severity":"major","consequence":"承担税务罚款，书面警告","escalation":"报财务经理"}]',
 '《增值税暂行条例》', NULL,
 '["finance_manager","procurement_eng"]'),

('GRT-FIN-REG-003', '固定资产管理制度', 'Fixed Asset Management Policy', 'finance', 'regulation', 'standard', 'effective',
 '固定资产(>¥5000且使用>1年)须贴标、登记、年度盘点。处置须填报废申请，残值>¥10000需招标。',
 '适用于全体部门', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01', NULL, '《企业会计准则第4号》', NULL,
 NULL),

('GRT-FIN-COMP-001', '税务合规要求', 'Tax Compliance Requirements', 'finance', 'compliance', 'critical', 'effective',
 '增值税按月申报(15日前)，企业所得税按季预缴/年度汇算清缴，转让定价文档年度准备。',
 '适用于财务部', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'monthly', '2026-04-15',
 '[{"violationType":"逾期申报","severity":"critical","consequence":"承担滞纳金，财务经理担责","escalation":"报董事长"}]',
 '《税收征管法》', NULL,
 '["finance_manager"]'),

('GRT-FIN-EXC-001', '资金异常处理流程', 'Fund Anomaly Handling', 'finance', 'exception_handling', 'critical', 'effective',
 '账户余额异常/可疑交易/网银安全事件：立即冻结操作，30分钟内报财务经理，1小时内报董事长。',
 '适用于财务部', '黄晓兰', 'finance_manager', '倪亚东',
 '2025-01-01', 'semi_annual', '2026-07-01',
 '[{"violationType":"发现异常未及时报告","severity":"critical","consequence":"停职调查","escalation":"报董事长"}]',
 NULL, NULL,
 '["finance_manager"]'),

-- ═══ 人事行政部 ═══
('GRT-HR-PROC-001', '员工招聘录用流程', 'Recruitment and Hiring Process', 'hr_admin', 'core_procedure', 'high', 'effective',
 '用人需求→HR审核→发布→简历筛选→笔试(可选)→面试(2轮)→背调→录用审批→Offer发放。关键岗位须董事长面试。',
 '适用于HR及各部门用人经理', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01', NULL, '《劳动合同法》第7-10条', NULL,
 '["hr_manager","dept_manager","bu_gm"]'),

('GRT-HR-PROC-002', '入职办理流程', 'Onboarding Process', 'hr_admin', 'core_procedure', 'high', 'effective',
 'Day1：合同签署+工牌+系统账号+座位安排+导师指派。Week1：部门制度培训+安全培训。Month1：试用期目标确认。',
 '适用于HR及新员工直属上级', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"入职3日未签合同","severity":"major","consequence":"HR担责，补签+书面检查","escalation":"报HR经理"}]',
 '《劳动合同法》第10条', NULL,
 '["hr_manager","team_leader","dept_manager"]'),

('GRT-HR-PROC-003', '绩效考核流程', 'Performance Appraisal Process', 'hr_admin', 'core_procedure', 'critical', 'effective',
 '季度考核：月度KPI汇总→自评→上级评→部门校准→三档绩效工资计算(基于avg2024/avg2025公式)→结果反馈面谈。',
 '适用于全体员工', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'quarterly', '2026-06-01',
 '[{"violationType":"考核结果未面谈反馈","severity":"major","consequence":"HR催办+部门经理扣分","escalation":"报副总"}]',
 NULL, NULL,
 NULL),

('GRT-HR-PROC-004', '离职办理流程', 'Offboarding Process', 'hr_admin', 'core_procedure', 'high', 'effective',
 '离职申请→审批(提前30天)→工作交接清单→IT账号注销→资产归还→财务结算→离职证明→竞业限制(如有)。',
 '适用于全体', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"未完成交接擅自离岗","severity":"critical","consequence":"暂扣最后一月工资","escalation":"报HR经理+法务"}]',
 '《劳动合同法》第37条', NULL,
 NULL),

('GRT-HR-REG-001', '考勤与请假制度', 'Attendance and Leave Policy', 'hr_admin', 'regulation', 'critical', 'effective',
 '工作时间8:00-17:00(午休1小时)。迟到≤15min不扣款，>15min按事假1小时计。事假扣款=小时×(基本工资/116)。年假按工龄5-15天。',
 '适用于全体员工', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"代打卡","severity":"major","consequence":"双方各书面警告+扣信用积分5分","escalation":"报HR经理"}]',
 '《劳动法》第36条、《职工带薪年休假条例》', NULL,
 NULL),

('GRT-HR-REG-002', '薪酬福利管理制度', 'Compensation and Benefits Policy', 'hr_admin', 'regulation', 'critical', 'effective',
 '薪酬=综合工资(基本+岗位+技能+绩效1/2/3+周六加班固定)+现金补贴+出差车补。社保/公积金按实际缴纳。薪资信息保密。',
 '适用于全体员工(薪资明细仅HR/财务/董事长可见)', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01',
 '[{"violationType":"泄露他人薪资","severity":"major","consequence":"书面警告+扣信用积分5分","escalation":"报HR经理"}]',
 '《劳动合同法》第11条', NULL,
 NULL),

('GRT-HR-REG-003', '培训管理制度', 'Training Management Policy', 'hr_admin', 'regulation', 'standard', 'effective',
 '全员年度最低培训时长40小时。新员工入职培训≥8小时(安全+制度+技能)。外部培训费>¥5000需审批，培训后须分享。',
 '适用于全体员工', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01', NULL, NULL, NULL,
 NULL),

('GRT-HR-COMP-001', '劳动法合规要求', 'Labor Law Compliance', 'hr_admin', 'compliance', 'critical', 'effective',
 '劳动合同100%签署率，加班不超36h/月，社保足额缴纳，工伤48h内申报，女职工特殊保护。',
 '适用于HR及全体管理层', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'semi_annual', '2026-07-01',
 '[{"violationType":"超时加班","severity":"major","consequence":"立即整改+罚款由部门承担","escalation":"报副总"}]',
 '《劳动法》《劳动合同法》《社会保险法》', NULL,
 '["hr_manager","dept_manager","director","admin"]'),

('GRT-HR-EXC-001', '劳动争议处理流程', 'Labor Dispute Resolution', 'hr_admin', 'exception_handling', 'high', 'effective',
 '争议发生→HR介入协商(3日内)→不成则调解(7日)→仍不成则指引仲裁。全程留存书面记录。',
 '适用于HR及涉事管理层', '张龙', 'hr_manager', '倪亚东',
 '2025-01-01', 'annual', '2026-01-01', NULL, '《劳动争议调解仲裁法》', NULL,
 '["hr_manager","dept_manager","director"]'),

-- ═══ 质量部 ═══
('GRT-QC-PROC-001', '来料检验(IQC)流程', 'Incoming Quality Control Process', 'quality', 'core_procedure', 'critical', 'effective',
 '到货→抽样(按AQL Level II)→外观/尺寸/材质检验→合格入库/不合格隔离→供应商评分更新。',
 '适用于质量部IQC人员及仓库收货人员', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01', NULL, NULL, 'IATF 16949 §8.6.1',
 '["quality_eng","team_leader"]'),

('GRT-QC-PROC-002', '过程检验(IPQC)流程', 'In-Process Quality Control', 'quality', 'core_procedure', 'critical', 'effective',
 '首件确认→巡检(每2小时)→SPC控制图监控→异常停线→纠正→恢复。巡检记录保留≥3年。',
 '适用于质量部IPQC及生产班组长', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01', NULL, NULL, 'IATF 16949 §8.5.1',
 '["quality_eng","team_leader"]'),

('GRT-QC-PROC-003', '最终检验(FQC)流程', 'Final Quality Control Process', 'quality', 'core_procedure', 'critical', 'effective',
 '清洁度检测(颗粒度/NVR)→尺寸全检(关键特性)→功能测试→外观→包装确认→放行签字。',
 '适用于质量部FQC及发运人员', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01', NULL, NULL, 'IATF 16949 §8.6',
 '["quality_eng","team_leader"]'),

('GRT-QC-PROC-004', 'FMEA/PPAP执行流程', 'FMEA and PPAP Execution', 'quality', 'core_procedure', 'critical', 'effective',
 'DFMEA→PFMEA→控制计划→PPAP(Level 3: 18项)→客户审批→量产放行。FMEA须由跨功能团队编制。',
 '适用于质量/研发/生产团队', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, 'AIAG FMEA手册(第4版)、PPAP手册(第4版)',
 '["quality_eng","bu_mech","bu_elec","dept_manager"]'),

('GRT-QC-REG-001', '不合格品控制制度', 'Nonconforming Product Control', 'quality', 'regulation', 'critical', 'effective',
 '发现不合格品→红标隔离→MRB评审(返工/让步/报废)→处置执行→记录关闭。客户发现不合格品须启动8D。',
 '适用于全体生产和质量人员', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"不合格品未隔离流出","severity":"critical","consequence":"全线停产排查+责任人处罚","escalation":"报副总"}]',
 NULL, 'IATF 16949 §8.7',
 '["quality_eng","team_leader","dept_manager"]'),

('GRT-QC-COMP-001', 'IATF 16949体系合规要求', 'IATF 16949 Compliance', 'quality', 'compliance', 'critical', 'effective',
 '保持IATF 16949认证有效性，年度内审≥1次，管理评审≥1次，外审不符合项90天内关闭。',
 '适用于全公司(以质量部为主导)', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"审核不符合项超期未关闭","severity":"critical","consequence":"暂停相关产品线","escalation":"报董事长"}]',
 NULL, 'IATF 16949:2016',
 NULL),

('GRT-QC-PROC-005', 'MSA测量系统分析流程', 'Measurement System Analysis', 'quality', 'core_procedure', 'high', 'effective',
 '新量具投用前须完成GR&R(重复性与再现性)分析，%GR&R≤10%接受，10-30%有条件接受，>30%不接受。',
 '适用于质量部计量人员', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, 'AIAG MSA手册(第4版)',
 '["quality_eng"]'),

('GRT-QC-EXC-001', '客户退货异常处理', 'Customer Return Exception Handling', 'quality', 'exception_handling', 'critical', 'effective',
 '收到退货通知→24h内确认接收→3天完成初步分析→7天8D报告(D1-D4)→30天关闭(D5-D8)→客户确认。',
 '适用于质量部及事业部项目经理', '张洵', 'quality_eng', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"退货分析超期","severity":"major","consequence":"客户降级风险+质量经理担责","escalation":"报副总"}]',
 NULL, 'IATF 16949 §10.2',
 '["quality_eng","cs_engineer","bu_pm"]'),

-- ═══ 生产部 ═══
('GRT-MFG-PROC-001', '生产排程与派工流程', 'Production Scheduling and Dispatch', 'production', 'core_procedure', 'critical', 'effective',
 '每周五生产计划会→T+1周排程→工单生成→工位派工→物料齐套确认→开工。变更须经生产经理审批。',
 '适用于生产部班组长及计划人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'quarterly', '2026-06-01', NULL, NULL, NULL,
 '["team_leader","dept_manager"]'),

('GRT-MFG-PROC-002', '设备点检与维护保养流程', 'Equipment Inspection and Maintenance', 'production', 'core_procedure', 'critical', 'effective',
 '日点检(班前15分钟)→周保养(周六)→月保养(月末半天)→年度大修(年末)。点检异常立即报修并标注停用。',
 '适用于操作工及设备管理员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'quarterly', '2026-06-01',
 '[{"violationType":"未点检即开机","severity":"major","consequence":"停止操作资格1天+安全培训","escalation":"报班组长"}]',
 NULL, 'TPM',
 '["team_leader"]'),

('GRT-MFG-PROC-003', '交接班管理流程', 'Shift Handover Management', 'production', 'core_procedure', 'high', 'effective',
 '交班方：填写交班记录(设备状态/在制品/异常/待办)。接班方：逐项确认签字。未交接清楚不得离岗。',
 '适用于轮班生产人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01', NULL, NULL, NULL,
 '["team_leader"]'),

('GRT-MFG-PROC-004', '工序自检与互检流程', 'Process Self-Inspection and Mutual Inspection', 'production', 'core_procedure', 'critical', 'effective',
 '每道工序操作员自检→下道工序互检→关键工序专检(QC签字)。发现问题立即标记并隔离。',
 '适用于全体生产人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'quarterly', '2026-06-01',
 '[{"violationType":"跳过自检","severity":"major","consequence":"停止上岗资格+重新培训","escalation":"报班组长+质量部"}]',
 NULL, 'IATF 16949 §8.5.1.1',
 '["team_leader","quality_eng"]'),

('GRT-MFG-REG-001', '车间安全生产制度', 'Workshop Safety Production Rules', 'production', 'regulation', 'critical', 'effective',
 '入车间必须佩戴安全帽/护目镜/手套(根据工位)。化学品操作须穿防护服。禁止在车间饮食/吸烟/玩手机。',
 '适用于全体进入车间人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"未佩戴PPE","severity":"major","consequence":"当日停工+安全教育","escalation":"报安全主管"},{"violationType":"车间吸烟","severity":"critical","consequence":"罚款¥500+书面警告","escalation":"报HR+生产经理"}]',
 '《安全生产法》', NULL,
 NULL),

('GRT-MFG-REG-002', '6S现场管理制度', '6S Workplace Management', 'production', 'regulation', 'high', 'effective',
 '整理(Red Tag每月)→整顿(定位标识)→清扫(每日下班前15分钟)→清洁(标准化)→素养(培训)→安全(隐患排查)。',
 '适用于全体车间人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'quarterly', '2026-06-01', NULL, NULL, '6S管理',
 NULL),

('GRT-MFG-COMP-001', '特种设备操作合规要求', 'Special Equipment Operation Compliance', 'production', 'compliance', 'critical', 'effective',
 '行车/叉车/压力容器操作须持证上岗，证书年审不得过期。无证操作立即停工并处罚。',
 '适用于特种设备操作人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"无证操作","severity":"critical","consequence":"立即停岗+罚款¥1000+重新取证","escalation":"报安全主管+HR"}]',
 '《特种设备安全法》', NULL,
 '["team_leader"]'),

('GRT-MFG-EXC-001', '生产异常停线处理流程', 'Production Line-Stop Exception', 'production', 'exception_handling', 'critical', 'effective',
 'Andon亮红灯→班组长5分钟到场→15分钟内判断：可恢复则恢复，不可恢复→通知生产经理→启动替代方案。停线>2小时须报副总。',
 '适用于生产部全体', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'quarterly', '2026-06-01',
 '[{"violationType":"隐瞒停线不报","severity":"critical","consequence":"班组长降级处理","escalation":"报事业部经理"}]',
 NULL, NULL,
 '["team_leader","dept_manager"]'),

-- ═══ 研发部 ═══
('GRT-RD-PROC-001', '新产品设计评审流程', 'New Product Design Review', 'rnd', 'core_procedure', 'critical', 'effective',
 '概念评审(CDR)→初步设计评审(PDR)→详细设计评审(DDR)→设计验证(DVT)→设计确认(PVT)。每轮须跨部门参与。',
 '适用于研发部全体及相关部门评审员', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, 'IATF 16949 §8.3.4',
 '["dept_manager","bu_mech","bu_elec","quality_eng"]'),

('GRT-RD-PROC-002', '图纸变更(ECO/ECR)流程', 'Drawing Change ECO/ECR Process', 'rnd', 'core_procedure', 'critical', 'effective',
 'ECR(变更请求)→影响分析(成本/工期/库存)→ECO(变更令)审批→图纸更新→BOM更新→通知受影响部门。变更等级A(重大)/B(一般)/C(文字)。',
 '适用于研发/质量/生产相关人员', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"未走ECO流程修改图纸","severity":"critical","consequence":"无效变更+责任工程师书面检查","escalation":"报研发经理"}]',
 NULL, 'GRT编码第一规则、IATF 16949 §8.5.6',
 '["dept_manager","bu_mech","bu_elec","quality_eng"]'),

('GRT-RD-PROC-003', '样机试制与验证流程', 'Prototype Trial and Verification', 'rnd', 'core_procedure', 'high', 'effective',
 '样机BOM确认→试制排程→装配→测试(功能/性能/寿命)→测试报告→问题整改→二次验证→转量产评审。',
 '适用于研发及试制车间', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, NULL,
 '["dept_manager","bu_mech","team_leader"]'),

('GRT-RD-REG-001', '图纸编号与版本管理制度', 'Drawing Numbering and Version Control', 'rnd', 'regulation', 'critical', 'effective',
 '图纸编号遵循GRT编码第一规则：产品类别-子类-序号-版本。版本号A→B→...→Z。废弃图纸须加盖"作废"章。',
 '适用于研发部全体', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"编号不合规","severity":"major","consequence":"退回修改+编码合规培训","escalation":"报研发经理"}]',
 NULL, 'GRT编码第一规则',
 '["bu_mech","bu_elec","dept_manager"]'),

('GRT-RD-REG-002', '知识产权保护制度', 'IP Protection Policy', 'rnd', 'regulation', 'critical', 'effective',
 '员工发明须在7日内填写发明披露表，公司决定是否申请专利(60日内)。申请奖励¥5000，授权追加¥10000-50000。',
 '适用于全体研发人员', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"隐瞒职务发明","severity":"critical","consequence":"追究违约责任","escalation":"报董事长+法务"}]',
 '《专利法》第6条', NULL,
 '["bu_mech","bu_elec","dept_manager"]'),

('GRT-RD-COMP-001', 'CE/UL认证设计合规要求', 'CE/UL Certification Design Compliance', 'rnd', 'compliance', 'critical', 'effective',
 '出口产品须满足CE(机械指令+低电压指令+EMC指令)或UL认证要求。设计阶段即须纳入合规清单。',
 '适用于涉及出口产品的研发人员', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"产品不满足CE要求出货","severity":"critical","consequence":"召回+研发经理担责","escalation":"报董事长"}]',
 'EU Machinery Directive 2006/42/EC', 'CE Marking, UL Standards',
 '["bu_mech","bu_elec","dept_manager"]'),

('GRT-RD-EXC-001', '设计缺陷异常处理流程', 'Design Defect Exception Handling', 'rnd', 'exception_handling', 'critical', 'effective',
 '现场发现设计缺陷→紧急ECR→48h内出临时对策→7天内出永久对策→影响范围评估→批量追溯→客户通报(如需)。',
 '适用于研发/质量/现场服务', '曹庆伟', 'dept_manager', '倪亚东',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"已知缺陷未处理","severity":"critical","consequence":"项目暂停+责任工程师处罚","escalation":"报副总"}]',
 NULL, NULL,
 '["bu_mech","bu_elec","quality_eng","cs_engineer"]'),

-- ═══ 采购部 ═══
('GRT-PUR-PROC-001', '供应商开发与准入流程', 'Supplier Development and Qualification', 'procurement', 'core_procedure', 'critical', 'effective',
 '需求识别→市场调研→初筛(3家以上)→现场审核→样品验证→商务谈判→合格供应商名录→年度复评。',
 '适用于采购部全体', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, 'IATF 16949 §8.4',
 '["procurement_eng","dept_manager"]'),

('GRT-PUR-PROC-002', '采购订单审批流程', 'Purchase Order Approval', 'procurement', 'core_procedure', 'critical', 'effective',
 '采购申请→按授权层级审批(≤5k采购专员、≤20k采购经理、≤100k部门经理、≤500k副总、>500k董事长)→三比价(>10k)→下单→跟催→到货。',
 '适用于全体有采购需求的人员', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"未三比价>10k","severity":"major","consequence":"退回重新询价","escalation":"报采购经理"}]',
 NULL, NULL,
 NULL),

('GRT-PUR-PROC-003', '供应商绩效评价流程', 'Supplier Performance Evaluation', 'procurement', 'core_procedure', 'high', 'effective',
 '季度评分：质量(40%)+交付(25%)+价格(20%)+服务(15%)。A级(≥90)优先，B级(70-89)正常，C级(50-69)整改，D级(<50)淘汰。',
 '适用于采购部及质量部', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'quarterly', '2026-06-01', NULL, NULL, 'IATF 16949 §8.4.2.4',
 '["procurement_eng","quality_eng"]'),

('GRT-PUR-REG-001', '采购价格管理制度', 'Procurement Pricing Policy', 'procurement', 'regulation', 'high', 'effective',
 '建立物料价格基准库，年度降价目标3-5%。单一来源须技术论证+副总审批。价格变动>10%须重新比价。',
 '适用于采购部', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, NULL, NULL,
 '["procurement_eng","dept_manager"]'),

('GRT-PUR-REG-002', '廉洁采购制度', 'Anti-Corruption Procurement Policy', 'procurement', 'regulation', 'critical', 'effective',
 '禁止收受供应商礼品>¥200，禁止与供应商有利益关联，违者即刻解聘。每年签署廉洁承诺书。',
 '适用于采购部及有采购决策权的人员', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"收受供应商贿赂","severity":"critical","consequence":"立即解除劳动合同，追究法律责任","escalation":"报董事长+法务+HR"},{"violationType":"未披露利益冲突","severity":"major","consequence":"调离采购岗位+书面警告","escalation":"报副总"}]',
 '《反不正当竞争法》', NULL,
 NULL),

('GRT-PUR-COMP-001', '供应商环保合规要求', 'Supplier Environmental Compliance', 'procurement', 'compliance', 'high', 'effective',
 '供应商须提供RoHS/REACH合规证明，危废处理资质，碳排放数据(如适用)。不合规供应商限期6个月整改或淘汰。',
 '适用于采购部', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01', NULL, 'RoHS 2011/65/EU, REACH EC 1907/2006', NULL,
 '["procurement_eng"]'),

('GRT-PUR-EXC-001', '紧急采购异常处理', 'Emergency Procurement Exception', 'procurement', 'exception_handling', 'high', 'effective',
 '紧急采购(因产线缺料/客户加急)可走绿色通道，但须：(1)采购经理口头批准(2)24h内补齐书面审批(3)单一来源须事后补三比价。',
 '适用于采购部', '沈迎凤', 'procurement_eng', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"紧急采购未补审批","severity":"major","consequence":"扣减信用积分+采购经理担责","escalation":"报副总"}]',
 NULL, NULL,
 '["procurement_eng","dept_manager"]'),

-- ═══ 仓库/物流 ═══
('GRT-WH-PROC-001', '入库验收与上架流程', 'Receiving Inspection and Putaway', 'warehouse', 'core_procedure', 'high', 'effective',
 '到货→核对送货单/PO→外观检查→数量点收→质检(转IQC)→合格入库→系统录入→指定库位上架→标识。',
 '适用于仓库收发货人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01', NULL, NULL, NULL,
 '["team_leader"]'),

('GRT-WH-PROC-002', '出库拣配与发货流程', 'Picking Packing and Shipping', 'warehouse', 'core_procedure', 'high', 'effective',
 '生产领料单/发货通知→拣货→复核(与单据核对)→包装(按客户要求)→称重→发运→系统扣账→物流跟踪。',
 '适用于仓库及发运人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"发错料/发错货","severity":"major","consequence":"责任人承担补发运费","escalation":"报仓库主管"}]',
 NULL, NULL,
 '["team_leader"]'),

('GRT-WH-PROC-003', '库存盘点流程', 'Inventory Counting Process', 'warehouse', 'core_procedure', 'high', 'effective',
 '月度循环盘点(ABC分类：A类每月、B类每季、C类每半年)。年末全面盘点。差异>0.5%须查明原因。',
 '适用于仓库及财务参与盘点人员', '韩保程', 'team_leader', '黄晓兰',
 '2025-03-01', 'quarterly', '2026-06-01', NULL, '《企业会计准则》', NULL,
 '["team_leader","finance_manager"]'),

('GRT-WH-REG-001', '仓库安全与消防制度', 'Warehouse Safety and Fire Prevention', 'warehouse', 'regulation', 'critical', 'effective',
 '通道宽度≥1.2m不得堆放物品，灭火器每月检查，禁止明火，堆垛高度≤2m(人工)、货架按承载标识。',
 '适用于仓库全体人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"堵塞消防通道","severity":"critical","consequence":"立即整改+罚款¥500","escalation":"报安全主管"}]',
 '《消防法》', NULL,
 NULL),

('GRT-WH-REG-002', '危化品存储管理制度', 'Hazardous Material Storage', 'warehouse', 'regulation', 'critical', 'effective',
 '危化品专库存放，双人双锁，MSDS张贴，通风排气，定期检测浓度，台账日清日结。',
 '适用于涉及危化品的人员', '韩保程', 'team_leader', '周辉',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"危化品混放","severity":"critical","consequence":"立即隔离+停岗安全教育","escalation":"报安全主管+环保部门"}]',
 '《危险化学品安全管理条例》', 'GHS',
 NULL),

('GRT-WH-COMP-001', '出口管制与报关合规要求', 'Export Control and Customs Compliance', 'warehouse', 'compliance', 'high', 'effective',
 '出口前核查管制清单，HS编码准确申报，原产地证如实填写，禁止向制裁国/实体出口。',
 '适用于涉及出口业务的人员', '韩保程', 'team_leader', '倪亚东',
 '2025-03-01', 'annual', '2026-03-01',
 '[{"violationType":"HS编码错误导致海关处罚","severity":"critical","consequence":"承担罚款+补缴税款","escalation":"报副总"}]',
 '《海关法》《出口管制法》', NULL,
 '["team_leader","dept_manager","bu_sales"]'),

('GRT-WH-EXC-001', '库存差异异常处理', 'Inventory Discrepancy Exception', 'warehouse', 'exception_handling', 'high', 'effective',
 '发现差异→锁定库位→48h内查明原因(录入错误/损耗/盗窃/混放)→调账审批(>¥5000需财务经理批准)→纠正措施→预防措施。',
 '适用于仓库及财务', '韩保程', 'team_leader', '黄晓兰',
 '2025-03-01', 'semi_annual', '2026-09-01',
 '[{"violationType":"差异不查原因直接调账","severity":"major","consequence":"调账无效+仓管员警告","escalation":"报财务经理"}]',
 NULL, NULL,
 '["team_leader","finance_manager"]')

ON CONFLICT (procedure_code) DO NOTHING;
