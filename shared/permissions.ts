/**
 * GRT系统权限管理配置
 * 基于简道云用户清单和组织架构设计
 * 
 * 权限级别：
 * - none: 不涉及，无法访问
 * - read: 可读，只能查看
 * - write: 可写，可以编辑和创建
 * - admin: 管理员，完全控制
 */

// ============================================
// 1. 系统角色定义
// ============================================

export type PermissionLevel = "none" | "read" | "write" | "admin";

export interface SystemRole {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  level: number; // 角色等级，数字越大权限越高
}

export const SYSTEM_ROLES: SystemRole[] = [
  { id: "guest", name: "访客", nameEn: "Guest", description: "未登录用户", level: 0 },
  { id: "employee", name: "普通员工", nameEn: "Employee", description: "基础员工权限", level: 1 },
  { id: "team_lead", name: "组长/主管", nameEn: "Team Lead", description: "团队管理权限", level: 2 },
  { id: "dept_manager", name: "部门经理", nameEn: "Department Manager", description: "部门管理权限", level: 3 },
  { id: "hr_specialist", name: "HR专员", nameEn: "HR Specialist", description: "人力资源专员", level: 3 },
  { id: "hr_manager", name: "HR经理", nameEn: "HR Manager", description: "人力资源管理权限", level: 4 },
  { id: "finance_specialist", name: "财务专员", nameEn: "Finance Specialist", description: "财务专员权限", level: 3 },
  { id: "finance_manager", name: "财务经理", nameEn: "Finance Manager", description: "财务管理权限", level: 4 },
  { id: "director", name: "总监", nameEn: "Director", description: "高管权限", level: 5 },
  // BU-scoped roles — mapped to specific Business Units
  { id: "bu_sales", name: "BU销售工程师", nameEn: "BU Sales Engineer", description: "事业部销售与项目工程师，负责客户需求和报价", level: 2 },
  { id: "bu_pm", name: "BU项目经理", nameEn: "BU Project Manager", description: "事业部项目经理，负责项目Gate管理", level: 3 },
  { id: "bu_mech", name: "BU机械工程师", nameEn: "BU Mechanical Engineer", description: "事业部机械设计工程师，负责BOM和图纸", level: 2 },
  { id: "bu_elec", name: "BU电气工程师", nameEn: "BU Electrical Engineer", description: "事业部电气设计工程师，负责PLC和电气图", level: 2 },
  { id: "bu_gm", name: "BU总经理", nameEn: "BU General Manager", description: "事业部总经理，管理BU整体运营", level: 5 },
  { id: "cs_engineer", name: "客服工程师", nameEn: "Customer Service Engineer", description: "客户服务工程师，负责维修和现场支持", level: 2 },
  { id: "procurement_eng", name: "采购工程师", nameEn: "Procurement Engineer", description: "采购工程师，负责供应链和采购管理", level: 2 },
  { id: "quality_eng", name: "质量工程师", nameEn: "Quality Engineer", description: "质量工程师，负责FMEA/PPAP/8D", level: 2 },
  // External roles
  { id: "customer", name: "客户代表", nameEn: "Customer Representative", description: "外部客户在GRT客户门户中的受控访问角色", level: 0 },
  // System admin
  { id: "admin", name: "系统管理员", nameEn: "System Admin", description: "系统管理权限", level: 10 },
];

// ============================================
// 2. 部门定义（基于GRT组织架构）
// ============================================

export interface Department {
  id: string;
  name: string;
  nameEn: string;
  headCount: number;
  manager?: string;
}

export const DEPARTMENTS: Department[] = [
  { id: "sales", name: "销售部", nameEn: "Sales", headCount: 10, manager: "销售总监" },
  { id: "tech_service", name: "技术服务部", nameEn: "Technical Service", headCount: 20, manager: "技术总监" },
  { id: "production", name: "生产部", nameEn: "Production", headCount: 40, manager: "生产经理" },
  { id: "procurement", name: "采购部", nameEn: "Procurement", headCount: 4, manager: "采购经理" },
  { id: "quality", name: "品管部", nameEn: "Quality Control", headCount: 2, manager: "品管主管" },
  { id: "finance", name: "财务部", nameEn: "Finance", headCount: 2, manager: "财务经理" },
  { id: "hr", name: "人力资源部", nameEn: "Human Resources", headCount: 2, manager: "HR经理" },
  { id: "admin_dept", name: "行政部", nameEn: "Administration", headCount: 3, manager: "行政经理" },
];

// ============================================
// 3. 功能模块定义
// ============================================

export interface FunctionModule {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  sensitivityLevel: "low" | "medium" | "high" | "critical";
}

export const FUNCTION_MODULES: FunctionModule[] = [
  // 人力资源模块
  { id: "hrm_employee_basic", name: "员工基本信息", nameEn: "Employee Basic Info", category: "HRM", description: "员工姓名、部门、岗位等基本信息", sensitivityLevel: "low" },
  { id: "hrm_employee_contact", name: "员工联系方式", nameEn: "Employee Contact", category: "HRM", description: "手机、邮箱、地址等联系信息", sensitivityLevel: "medium" },
  { id: "hrm_employee_id", name: "员工身份信息", nameEn: "Employee Identity", category: "HRM", description: "身份证号、银行卡等敏感信息", sensitivityLevel: "critical" },
  { id: "hrm_employee_management", name: "员工档案管理", nameEn: "Employee Management", category: "HRM", description: "员工增删改操作", sensitivityLevel: "high" },
  { id: "hrm_salary_structure", name: "薪酬结构", nameEn: "Salary Structure", category: "HRM", description: "部门薪酬结构配置", sensitivityLevel: "high" },
  { id: "hrm_salary_detail", name: "员工薪资明细", nameEn: "Salary Detail", category: "HRM", description: "个人薪资详情", sensitivityLevel: "critical" },
  { id: "hrm_salary_calculation", name: "薪酬计算器", nameEn: "Salary Calculator", category: "HRM", description: "薪资模拟计算", sensitivityLevel: "high" },
  { id: "hrm_performance", name: "绩效管理", nameEn: "Performance Management", category: "HRM", description: "绩效评估和考核", sensitivityLevel: "medium" },
  { id: "hrm_recruitment", name: "招聘管理", nameEn: "Recruitment", category: "HRM", description: "招聘流程和候选人管理", sensitivityLevel: "medium" },
  { id: "hrm_interview", name: "面试管理", nameEn: "Interview Management", category: "HRM", description: "面试安排和评估", sensitivityLevel: "medium" },
  { id: "hrm_ai_interview", name: "AI面试系统", nameEn: "AI Interview System", category: "HRM", description: "AI面试分析和评估", sensitivityLevel: "high" },
  { id: "hrm_onboarding", name: "入职管理", nameEn: "Onboarding", category: "HRM", description: "入职流程和培训", sensitivityLevel: "low" },
  { id: "hrm_training", name: "培训管理", nameEn: "Training", category: "HRM", description: "培训计划和记录", sensitivityLevel: "low" },
  { id: "hrm_review_reminder", name: "述职提醒", nameEn: "Review Reminder", category: "HRM", description: "述职提醒配置", sensitivityLevel: "low" },
  { id: "hrm_digital_agent", name: "数字角色", nameEn: "Digital Agent", category: "HRM", description: "岗位数字化评估", sensitivityLevel: "medium" },
  
  // 项目管理模块
  { id: "pm_project_list", name: "项目列表", nameEn: "Project List", category: "PM", description: "项目基本信息", sensitivityLevel: "low" },
  { id: "pm_project_detail", name: "项目详情", nameEn: "Project Detail", category: "PM", description: "项目详细信息", sensitivityLevel: "medium" },
  { id: "pm_project_cost", name: "项目成本", nameEn: "Project Cost", category: "PM", description: "项目成本和预算", sensitivityLevel: "high" },
  { id: "pm_task_management", name: "任务管理", nameEn: "Task Management", category: "PM", description: "任务分配和跟踪", sensitivityLevel: "low" },
  { id: "pm_gantt", name: "甘特图", nameEn: "Gantt Chart", category: "PM", description: "项目进度甘特图", sensitivityLevel: "low" },
  
  // CRM模块
  { id: "crm_customer_list", name: "客户列表", nameEn: "Customer List", category: "CRM", description: "客户基本信息", sensitivityLevel: "low" },
  { id: "crm_customer_detail", name: "客户详情", nameEn: "Customer Detail", category: "CRM", description: "客户详细信息", sensitivityLevel: "medium" },
  { id: "crm_opportunity", name: "商机管理", nameEn: "Opportunity", category: "CRM", description: "销售商机", sensitivityLevel: "medium" },
  { id: "crm_contract", name: "合同管理", nameEn: "Contract", category: "CRM", description: "合同信息", sensitivityLevel: "high" },
  
  // 系统管理模块
  { id: "sys_user_management", name: "用户管理", nameEn: "User Management", category: "System", description: "系统用户管理", sensitivityLevel: "high" },
  { id: "sys_role_management", name: "角色管理", nameEn: "Role Management", category: "System", description: "角色权限配置", sensitivityLevel: "critical" },
  { id: "sys_permission_management", name: "权限管理", nameEn: "Permission Management", category: "System", description: "权限配置", sensitivityLevel: "critical" },
  { id: "sys_audit_log", name: "审计日志", nameEn: "Audit Log", category: "System", description: "操作日志", sensitivityLevel: "high" },
  { id: "sys_scheduler", name: "定时任务", nameEn: "Scheduler", category: "System", description: "定时任务管理", sensitivityLevel: "high" },
  { id: "sys_config", name: "系统配置", nameEn: "System Config", category: "System", description: "系统参数配置", sensitivityLevel: "high" },
  // PDM模块
  { id: "pdm", name: "产品数据管理", nameEn: "Product Data Management", category: "R&D", description: "PDM产品全生命周期数据管理", sensitivityLevel: "medium" },
  // Go-Live模块
  { id: "go_live", name: "上线指挥中心", nameEn: "Go-Live Command Center", category: "System", description: "上线就绪评估、薪资导入、编码合规、军团模拟", sensitivityLevel: "high" },
  // Smart Payroll模块
  { id: "smart_payroll", name: "智能薪酬引擎", nameEn: "Smart Payroll Engine", category: "Finance", description: "薪资计算、审批流转、个税阶梯、五险一金", sensitivityLevel: "critical" },
  // 云端摄像头 + MES + 装配视觉
  { id: "mfg_camera_view", name: "摄像头查看", nameEn: "Camera View", category: "MFG", description: "查看摄像头画面和录像", sensitivityLevel: "low" },
  { id: "mfg_camera_manage", name: "摄像头管理", nameEn: "Camera Manage", category: "MFG", description: "增删改摄像头设备、分组、维保", sensitivityLevel: "high" },
  { id: "mfg_camera_ptz", name: "摄像头PTZ控制", nameEn: "Camera PTZ", category: "MFG", description: "云台方向、变焦、预置位控制", sensitivityLevel: "medium" },
  { id: "mfg_camera_recording", name: "录像管理", nameEn: "Camera Recording", category: "MFG", description: "启停录像、管理快照", sensitivityLevel: "medium" },
  { id: "mfg_mes_dispatch", name: "MES派工", nameEn: "MES Dispatch", category: "MFG", description: "工单派工到工位", sensitivityLevel: "high" },
  { id: "mfg_mes_operate", name: "MES操作", nameEn: "MES Operate", category: "MFG", description: "操作员级别MES动作", sensitivityLevel: "medium" },
  { id: "mfg_assembly_review", name: "装配审核", nameEn: "Assembly Review", category: "MFG", description: "审核装配录像和工时分析", sensitivityLevel: "medium" },
  { id: "mfg_assembly_manage", name: "装配管理", nameEn: "Assembly Manage", category: "MFG", description: "管理标准工时和标记", sensitivityLevel: "high" },
  // 人型机器人 + 维护 + UWB + 机器人调试
  { id: "mfg_humanoid_view", name: "人型机器人查看", nameEn: "Humanoid View", category: "MFG", description: "查看人型机器人状态和数据", sensitivityLevel: "low" },
  { id: "mfg_humanoid_manage", name: "人型机器人管理", nameEn: "Humanoid Manage", category: "MFG", description: "注册/配置/退役人型机器人", sensitivityLevel: "high" },
  { id: "mfg_humanoid_operate", name: "人型机器人操作", nameEn: "Humanoid Operate", category: "MFG", description: "执行视觉任务、上下料作业", sensitivityLevel: "medium" },
  { id: "mfg_maintenance_view", name: "维护查看", nameEn: "Maintenance View", category: "MFG", description: "查看维护计划和工单", sensitivityLevel: "low" },
  { id: "mfg_maintenance_manage", name: "维护管理", nameEn: "Maintenance Manage", category: "MFG", description: "创建维护计划、生成工单", sensitivityLevel: "high" },
  { id: "mfg_maintenance_execute", name: "维护执行", nameEn: "Maintenance Execute", category: "MFG", description: "执行维护步骤、上传证据、签署完成", sensitivityLevel: "medium" },
  { id: "mfg_uwb_dashboard", name: "UWB看板", nameEn: "UWB Dashboard", category: "MFG", description: "访问UWB车间实时定位看板", sensitivityLevel: "low" },
  { id: "mfg_robot_debug_manage", name: "机器人调试管理", nameEn: "Robot Debug Manage", category: "MFG", description: "创建管理调试会话", sensitivityLevel: "high" },
  { id: "mfg_robot_debug_operate", name: "机器人调试操作", nameEn: "Robot Debug Operate", category: "MFG", description: "发送命令、捕获快照", sensitivityLevel: "medium" },
  // MES 产能/停机/缺陷 + 工时成本 + AGV 物流
  { id: "mfg_capacity_manage", name: "产能管理", nameEn: "Capacity Manage", category: "MFG", description: "创建更新产能规划", sensitivityLevel: "high" },
  { id: "mfg_downtime_manage", name: "停机管理", nameEn: "Downtime Manage", category: "MFG", description: "记录解决设备停机", sensitivityLevel: "medium" },
  { id: "mfg_labor_manage", name: "工时成本管理", nameEn: "Labor Cost Manage", category: "MFG", description: "工时校验、成本跟踪、技能匹配", sensitivityLevel: "high" },
  { id: "mfg_agv_manage", name: "AGV管理", nameEn: "AGV Manage", category: "MFG", description: "注册AGV、创建路径、设置交通规则", sensitivityLevel: "high" },
  { id: "mfg_agv_operate", name: "AGV操作", nameEn: "AGV Operate", category: "MFG", description: "创建任务、调度AGV、充电管理", sensitivityLevel: "medium" },
];

// ============================================
// 4. 角色-模块权限矩阵
// ============================================

export interface RolePermission {
  roleId: string;
  moduleId: string;
  permission: PermissionLevel;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  // ========== 访客权限 ==========
  { roleId: "guest", moduleId: "hrm_employee_basic", permission: "none" },
  { roleId: "guest", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "guest", moduleId: "hrm_salary_detail", permission: "none" },
  
  // ========== 普通员工权限 ==========
  // HRM模块
  { roleId: "employee", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "employee", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "employee", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "employee", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "employee", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "employee", moduleId: "hrm_salary_detail", permission: "none" }, // 只能看自己的
  { roleId: "employee", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "employee", moduleId: "hrm_performance", permission: "read" }, // 只能看自己的
  { roleId: "employee", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "employee", moduleId: "hrm_interview", permission: "none" },
  { roleId: "employee", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "employee", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "employee", moduleId: "hrm_training", permission: "read" },
  { roleId: "employee", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "employee", moduleId: "hrm_digital_agent", permission: "read" },
  // PM模块
  { roleId: "employee", moduleId: "pm_project_list", permission: "read" },
  { roleId: "employee", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "employee", moduleId: "pm_project_cost", permission: "none" },
  { roleId: "employee", moduleId: "pm_task_management", permission: "write" },
  { roleId: "employee", moduleId: "pm_gantt", permission: "read" },
  // CRM模块
  { roleId: "employee", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "employee", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "employee", moduleId: "crm_opportunity", permission: "read" },
  { roleId: "employee", moduleId: "crm_contract", permission: "none" },
  // 系统模块
  { roleId: "employee", moduleId: "sys_user_management", permission: "none" },
  { roleId: "employee", moduleId: "sys_role_management", permission: "none" },
  { roleId: "employee", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "employee", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "employee", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "employee", moduleId: "sys_config", permission: "none" },
  
  // ========== 组长/主管权限 ==========
  { roleId: "team_lead", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "team_lead", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "team_lead", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "team_lead", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "team_lead", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "team_lead", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "team_lead", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "team_lead", moduleId: "hrm_performance", permission: "write" }, // 可以评估下属
  { roleId: "team_lead", moduleId: "hrm_recruitment", permission: "read" },
  { roleId: "team_lead", moduleId: "hrm_interview", permission: "write" }, // 可以参与面试
  { roleId: "team_lead", moduleId: "hrm_ai_interview", permission: "read" },
  { roleId: "team_lead", moduleId: "hrm_onboarding", permission: "write" },
  { roleId: "team_lead", moduleId: "hrm_training", permission: "write" },
  { roleId: "team_lead", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "team_lead", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "team_lead", moduleId: "pm_project_list", permission: "read" },
  { roleId: "team_lead", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "team_lead", moduleId: "pm_project_cost", permission: "read" },
  { roleId: "team_lead", moduleId: "pm_task_management", permission: "write" },
  { roleId: "team_lead", moduleId: "pm_gantt", permission: "write" },
  { roleId: "team_lead", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "team_lead", moduleId: "crm_customer_detail", permission: "write" },
  { roleId: "team_lead", moduleId: "crm_opportunity", permission: "write" },
  { roleId: "team_lead", moduleId: "crm_contract", permission: "read" },
  { roleId: "team_lead", moduleId: "sys_user_management", permission: "none" },
  { roleId: "team_lead", moduleId: "sys_role_management", permission: "none" },
  { roleId: "team_lead", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "team_lead", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "team_lead", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "team_lead", moduleId: "sys_config", permission: "none" },
  
  // ========== 部门经理权限 ==========
  { roleId: "dept_manager", moduleId: "hrm_employee_basic", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_employee_contact", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "dept_manager", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "dept_manager", moduleId: "hrm_salary_structure", permission: "read" },
  { roleId: "dept_manager", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "dept_manager", moduleId: "hrm_salary_calculation", permission: "read" },
  { roleId: "dept_manager", moduleId: "hrm_performance", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_recruitment", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_interview", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_ai_interview", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_onboarding", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_training", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "dept_manager", moduleId: "hrm_digital_agent", permission: "write" },
  { roleId: "dept_manager", moduleId: "pm_project_list", permission: "write" },
  { roleId: "dept_manager", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "dept_manager", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "dept_manager", moduleId: "pm_task_management", permission: "write" },
  { roleId: "dept_manager", moduleId: "pm_gantt", permission: "write" },
  { roleId: "dept_manager", moduleId: "crm_customer_list", permission: "write" },
  { roleId: "dept_manager", moduleId: "crm_customer_detail", permission: "write" },
  { roleId: "dept_manager", moduleId: "crm_opportunity", permission: "write" },
  { roleId: "dept_manager", moduleId: "crm_contract", permission: "write" },
  { roleId: "dept_manager", moduleId: "sys_user_management", permission: "none" },
  { roleId: "dept_manager", moduleId: "sys_role_management", permission: "none" },
  { roleId: "dept_manager", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "dept_manager", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "dept_manager", moduleId: "sys_scheduler", permission: "read" },
  { roleId: "dept_manager", moduleId: "sys_config", permission: "none" },
  
  // ========== HR专员权限 ==========
  { roleId: "hr_specialist", moduleId: "hrm_employee_basic", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_employee_contact", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_employee_id", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_employee_management", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_salary_structure", permission: "read" },
  { roleId: "hr_specialist", moduleId: "hrm_salary_detail", permission: "read" },
  { roleId: "hr_specialist", moduleId: "hrm_salary_calculation", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_performance", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_recruitment", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_interview", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_ai_interview", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_onboarding", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_training", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "hr_specialist", moduleId: "hrm_digital_agent", permission: "write" },
  { roleId: "hr_specialist", moduleId: "pm_project_list", permission: "read" },
  { roleId: "hr_specialist", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "hr_specialist", moduleId: "pm_project_cost", permission: "none" },
  { roleId: "hr_specialist", moduleId: "pm_task_management", permission: "read" },
  { roleId: "hr_specialist", moduleId: "pm_gantt", permission: "read" },
  { roleId: "hr_specialist", moduleId: "crm_customer_list", permission: "none" },
  { roleId: "hr_specialist", moduleId: "crm_customer_detail", permission: "none" },
  { roleId: "hr_specialist", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "hr_specialist", moduleId: "crm_contract", permission: "none" },
  { roleId: "hr_specialist", moduleId: "sys_user_management", permission: "read" },
  { roleId: "hr_specialist", moduleId: "sys_role_management", permission: "none" },
  { roleId: "hr_specialist", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "hr_specialist", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "hr_specialist", moduleId: "sys_scheduler", permission: "read" },
  { roleId: "hr_specialist", moduleId: "sys_config", permission: "none" },
  
  // ========== HR经理权限 ==========
  { roleId: "hr_manager", moduleId: "hrm_employee_basic", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_employee_contact", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_employee_id", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_employee_management", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_salary_structure", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_salary_detail", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_salary_calculation", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_performance", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_recruitment", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_interview", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_ai_interview", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_onboarding", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_training", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_review_reminder", permission: "admin" },
  { roleId: "hr_manager", moduleId: "hrm_digital_agent", permission: "admin" },
  { roleId: "hr_manager", moduleId: "pm_project_list", permission: "read" },
  { roleId: "hr_manager", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "hr_manager", moduleId: "pm_project_cost", permission: "read" },
  { roleId: "hr_manager", moduleId: "pm_task_management", permission: "read" },
  { roleId: "hr_manager", moduleId: "pm_gantt", permission: "read" },
  { roleId: "hr_manager", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "hr_manager", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "hr_manager", moduleId: "crm_opportunity", permission: "read" },
  { roleId: "hr_manager", moduleId: "crm_contract", permission: "read" },
  { roleId: "hr_manager", moduleId: "sys_user_management", permission: "write" },
  { roleId: "hr_manager", moduleId: "sys_role_management", permission: "read" },
  { roleId: "hr_manager", moduleId: "sys_permission_management", permission: "read" },
  { roleId: "hr_manager", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "hr_manager", moduleId: "sys_scheduler", permission: "write" },
  { roleId: "hr_manager", moduleId: "sys_config", permission: "read" },
  
  // ========== 财务专员权限 ==========
  { roleId: "finance_specialist", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_employee_id", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_salary_structure", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_salary_detail", permission: "write" },
  { roleId: "finance_specialist", moduleId: "hrm_salary_calculation", permission: "write" },
  { roleId: "finance_specialist", moduleId: "hrm_performance", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_interview", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "finance_specialist", moduleId: "hrm_training", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_review_reminder", permission: "none" },
  { roleId: "finance_specialist", moduleId: "hrm_digital_agent", permission: "none" },
  { roleId: "finance_specialist", moduleId: "pm_project_list", permission: "read" },
  { roleId: "finance_specialist", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "finance_specialist", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "finance_specialist", moduleId: "pm_task_management", permission: "read" },
  { roleId: "finance_specialist", moduleId: "pm_gantt", permission: "read" },
  { roleId: "finance_specialist", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "finance_specialist", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "finance_specialist", moduleId: "crm_opportunity", permission: "read" },
  { roleId: "finance_specialist", moduleId: "crm_contract", permission: "write" },
  { roleId: "finance_specialist", moduleId: "sys_user_management", permission: "none" },
  { roleId: "finance_specialist", moduleId: "sys_role_management", permission: "none" },
  { roleId: "finance_specialist", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "finance_specialist", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "finance_specialist", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "finance_specialist", moduleId: "sys_config", permission: "none" },
  
  // ========== 财务经理权限 ==========
  { roleId: "finance_manager", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "finance_manager", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "finance_manager", moduleId: "hrm_employee_id", permission: "write" },
  { roleId: "finance_manager", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_salary_structure", permission: "admin" },
  { roleId: "finance_manager", moduleId: "hrm_salary_detail", permission: "admin" },
  { roleId: "finance_manager", moduleId: "hrm_salary_calculation", permission: "admin" },
  { roleId: "finance_manager", moduleId: "hrm_performance", permission: "read" },
  { roleId: "finance_manager", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_interview", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "finance_manager", moduleId: "hrm_training", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_review_reminder", permission: "none" },
  { roleId: "finance_manager", moduleId: "hrm_digital_agent", permission: "none" },
  { roleId: "finance_manager", moduleId: "pm_project_list", permission: "read" },
  { roleId: "finance_manager", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "finance_manager", moduleId: "pm_project_cost", permission: "admin" },
  { roleId: "finance_manager", moduleId: "pm_task_management", permission: "read" },
  { roleId: "finance_manager", moduleId: "pm_gantt", permission: "read" },
  { roleId: "finance_manager", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "finance_manager", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "finance_manager", moduleId: "crm_opportunity", permission: "read" },
  { roleId: "finance_manager", moduleId: "crm_contract", permission: "admin" },
  { roleId: "finance_manager", moduleId: "sys_user_management", permission: "none" },
  { roleId: "finance_manager", moduleId: "sys_role_management", permission: "none" },
  { roleId: "finance_manager", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "finance_manager", moduleId: "sys_audit_log", permission: "write" },
  { roleId: "finance_manager", moduleId: "sys_scheduler", permission: "read" },
  { roleId: "finance_manager", moduleId: "sys_config", permission: "read" },
  
  // ========== 总监权限 ==========
  { roleId: "director", moduleId: "hrm_employee_basic", permission: "write" },
  { roleId: "director", moduleId: "hrm_employee_contact", permission: "write" },
  { roleId: "director", moduleId: "hrm_employee_id", permission: "read" },
  { roleId: "director", moduleId: "hrm_employee_management", permission: "write" },
  { roleId: "director", moduleId: "hrm_salary_structure", permission: "write" },
  { roleId: "director", moduleId: "hrm_salary_detail", permission: "write" },
  { roleId: "director", moduleId: "hrm_salary_calculation", permission: "write" },
  { roleId: "director", moduleId: "hrm_performance", permission: "write" },
  { roleId: "director", moduleId: "hrm_recruitment", permission: "write" },
  { roleId: "director", moduleId: "hrm_interview", permission: "write" },
  { roleId: "director", moduleId: "hrm_ai_interview", permission: "write" },
  { roleId: "director", moduleId: "hrm_onboarding", permission: "write" },
  { roleId: "director", moduleId: "hrm_training", permission: "write" },
  { roleId: "director", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "director", moduleId: "hrm_digital_agent", permission: "write" },
  { roleId: "director", moduleId: "pm_project_list", permission: "write" },
  { roleId: "director", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "director", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "director", moduleId: "pm_task_management", permission: "write" },
  { roleId: "director", moduleId: "pm_gantt", permission: "write" },
  { roleId: "director", moduleId: "crm_customer_list", permission: "write" },
  { roleId: "director", moduleId: "crm_customer_detail", permission: "write" },
  { roleId: "director", moduleId: "crm_opportunity", permission: "write" },
  { roleId: "director", moduleId: "crm_contract", permission: "write" },
  { roleId: "director", moduleId: "sys_user_management", permission: "read" },
  { roleId: "director", moduleId: "sys_role_management", permission: "read" },
  { roleId: "director", moduleId: "sys_permission_management", permission: "read" },
  { roleId: "director", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "director", moduleId: "sys_scheduler", permission: "write" },
  { roleId: "director", moduleId: "sys_config", permission: "read" },
  
  // ========== BU销售工程师权限 ==========
  { roleId: "bu_sales", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_performance", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_interview", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "bu_sales", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_training", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "bu_sales", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "bu_sales", moduleId: "pm_project_list", permission: "read" },
  { roleId: "bu_sales", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "bu_sales", moduleId: "pm_project_cost", permission: "read" },
  { roleId: "bu_sales", moduleId: "pm_task_management", permission: "write" },
  { roleId: "bu_sales", moduleId: "pm_gantt", permission: "read" },
  { roleId: "bu_sales", moduleId: "crm_customer_list", permission: "write" },
  { roleId: "bu_sales", moduleId: "crm_customer_detail", permission: "write" },
  { roleId: "bu_sales", moduleId: "crm_opportunity", permission: "write" },
  { roleId: "bu_sales", moduleId: "crm_contract", permission: "write" },
  { roleId: "bu_sales", moduleId: "sys_user_management", permission: "none" },
  { roleId: "bu_sales", moduleId: "sys_role_management", permission: "none" },
  { roleId: "bu_sales", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "bu_sales", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "bu_sales", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "bu_sales", moduleId: "sys_config", permission: "none" },

  // ========== BU项目经理权限 ==========
  { roleId: "bu_pm", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "bu_pm", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "bu_pm", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_performance", permission: "write" },
  { roleId: "bu_pm", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_interview", permission: "read" },
  { roleId: "bu_pm", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "bu_pm", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "bu_pm", moduleId: "hrm_training", permission: "read" },
  { roleId: "bu_pm", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "bu_pm", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "bu_pm", moduleId: "pm_project_list", permission: "write" },
  { roleId: "bu_pm", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "bu_pm", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "bu_pm", moduleId: "pm_task_management", permission: "write" },
  { roleId: "bu_pm", moduleId: "pm_gantt", permission: "write" },
  { roleId: "bu_pm", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "bu_pm", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "bu_pm", moduleId: "crm_opportunity", permission: "read" },
  { roleId: "bu_pm", moduleId: "crm_contract", permission: "read" },
  { roleId: "bu_pm", moduleId: "sys_user_management", permission: "none" },
  { roleId: "bu_pm", moduleId: "sys_role_management", permission: "none" },
  { roleId: "bu_pm", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "bu_pm", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "bu_pm", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "bu_pm", moduleId: "sys_config", permission: "none" },

  // ========== BU机械工程师权限 ==========
  { roleId: "bu_mech", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_performance", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_interview", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "bu_mech", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_training", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "bu_mech", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "bu_mech", moduleId: "pm_project_list", permission: "read" },
  { roleId: "bu_mech", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "bu_mech", moduleId: "pm_project_cost", permission: "read" },
  { roleId: "bu_mech", moduleId: "pm_task_management", permission: "write" },
  { roleId: "bu_mech", moduleId: "pm_gantt", permission: "read" },
  { roleId: "bu_mech", moduleId: "crm_customer_list", permission: "none" },
  { roleId: "bu_mech", moduleId: "crm_customer_detail", permission: "none" },
  { roleId: "bu_mech", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "bu_mech", moduleId: "crm_contract", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_user_management", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_role_management", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "bu_mech", moduleId: "sys_config", permission: "none" },

  // ========== BU电气工程师权限 ==========
  { roleId: "bu_elec", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_performance", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_interview", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "bu_elec", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_training", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "bu_elec", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "bu_elec", moduleId: "pm_project_list", permission: "read" },
  { roleId: "bu_elec", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "bu_elec", moduleId: "pm_project_cost", permission: "read" },
  { roleId: "bu_elec", moduleId: "pm_task_management", permission: "write" },
  { roleId: "bu_elec", moduleId: "pm_gantt", permission: "read" },
  { roleId: "bu_elec", moduleId: "crm_customer_list", permission: "none" },
  { roleId: "bu_elec", moduleId: "crm_customer_detail", permission: "none" },
  { roleId: "bu_elec", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "bu_elec", moduleId: "crm_contract", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_user_management", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_role_management", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "bu_elec", moduleId: "sys_config", permission: "none" },

  // ========== BU总经理权限 ==========
  { roleId: "bu_gm", moduleId: "hrm_employee_basic", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_employee_contact", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "bu_gm", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "bu_gm", moduleId: "hrm_salary_structure", permission: "read" },
  { roleId: "bu_gm", moduleId: "hrm_salary_detail", permission: "read" },
  { roleId: "bu_gm", moduleId: "hrm_salary_calculation", permission: "read" },
  { roleId: "bu_gm", moduleId: "hrm_performance", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_recruitment", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_interview", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_ai_interview", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_onboarding", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_training", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_review_reminder", permission: "write" },
  { roleId: "bu_gm", moduleId: "hrm_digital_agent", permission: "write" },
  { roleId: "bu_gm", moduleId: "pm_project_list", permission: "write" },
  { roleId: "bu_gm", moduleId: "pm_project_detail", permission: "write" },
  { roleId: "bu_gm", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "bu_gm", moduleId: "pm_task_management", permission: "write" },
  { roleId: "bu_gm", moduleId: "pm_gantt", permission: "write" },
  { roleId: "bu_gm", moduleId: "crm_customer_list", permission: "write" },
  { roleId: "bu_gm", moduleId: "crm_customer_detail", permission: "write" },
  { roleId: "bu_gm", moduleId: "crm_opportunity", permission: "write" },
  { roleId: "bu_gm", moduleId: "crm_contract", permission: "write" },
  { roleId: "bu_gm", moduleId: "sys_user_management", permission: "none" },
  { roleId: "bu_gm", moduleId: "sys_role_management", permission: "none" },
  { roleId: "bu_gm", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "bu_gm", moduleId: "sys_audit_log", permission: "read" },
  { roleId: "bu_gm", moduleId: "sys_scheduler", permission: "read" },
  { roleId: "bu_gm", moduleId: "sys_config", permission: "none" },

  // ========== 客服工程师权限 ==========
  { roleId: "cs_engineer", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_performance", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_interview", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "cs_engineer", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_training", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "cs_engineer", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "cs_engineer", moduleId: "pm_project_list", permission: "read" },
  { roleId: "cs_engineer", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "cs_engineer", moduleId: "pm_project_cost", permission: "none" },
  { roleId: "cs_engineer", moduleId: "pm_task_management", permission: "write" },
  { roleId: "cs_engineer", moduleId: "pm_gantt", permission: "read" },
  { roleId: "cs_engineer", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "cs_engineer", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "cs_engineer", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "cs_engineer", moduleId: "crm_contract", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_user_management", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_role_management", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "cs_engineer", moduleId: "sys_config", permission: "none" },

  // ========== 采购工程师权限 ==========
  { roleId: "procurement_eng", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_performance", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_interview", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "procurement_eng", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_training", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "procurement_eng", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "procurement_eng", moduleId: "pm_project_list", permission: "read" },
  { roleId: "procurement_eng", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "procurement_eng", moduleId: "pm_project_cost", permission: "write" },
  { roleId: "procurement_eng", moduleId: "pm_task_management", permission: "write" },
  { roleId: "procurement_eng", moduleId: "pm_gantt", permission: "read" },
  { roleId: "procurement_eng", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "procurement_eng", moduleId: "crm_customer_detail", permission: "none" },
  { roleId: "procurement_eng", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "procurement_eng", moduleId: "crm_contract", permission: "read" },
  { roleId: "procurement_eng", moduleId: "sys_user_management", permission: "none" },
  { roleId: "procurement_eng", moduleId: "sys_role_management", permission: "none" },
  { roleId: "procurement_eng", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "procurement_eng", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "procurement_eng", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "procurement_eng", moduleId: "sys_config", permission: "none" },

  // ========== 质量工程师权限 ==========
  { roleId: "quality_eng", moduleId: "hrm_employee_basic", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_employee_contact", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_employee_id", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_employee_management", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_salary_structure", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_salary_detail", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_salary_calculation", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_performance", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_recruitment", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_interview", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_ai_interview", permission: "none" },
  { roleId: "quality_eng", moduleId: "hrm_onboarding", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_training", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_review_reminder", permission: "read" },
  { roleId: "quality_eng", moduleId: "hrm_digital_agent", permission: "read" },
  { roleId: "quality_eng", moduleId: "pm_project_list", permission: "read" },
  { roleId: "quality_eng", moduleId: "pm_project_detail", permission: "read" },
  { roleId: "quality_eng", moduleId: "pm_project_cost", permission: "none" },
  { roleId: "quality_eng", moduleId: "pm_task_management", permission: "write" },
  { roleId: "quality_eng", moduleId: "pm_gantt", permission: "read" },
  { roleId: "quality_eng", moduleId: "crm_customer_list", permission: "read" },
  { roleId: "quality_eng", moduleId: "crm_customer_detail", permission: "read" },
  { roleId: "quality_eng", moduleId: "crm_opportunity", permission: "none" },
  { roleId: "quality_eng", moduleId: "crm_contract", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_user_management", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_role_management", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_permission_management", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_audit_log", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_scheduler", permission: "none" },
  { roleId: "quality_eng", moduleId: "sys_config", permission: "none" },

  // ========== 系统管理员权限 ==========
  { roleId: "admin", moduleId: "hrm_employee_basic", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_employee_contact", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_employee_id", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_employee_management", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_salary_structure", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_salary_detail", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_salary_calculation", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_performance", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_recruitment", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_interview", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_ai_interview", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_onboarding", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_training", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_review_reminder", permission: "admin" },
  { roleId: "admin", moduleId: "hrm_digital_agent", permission: "admin" },
  { roleId: "admin", moduleId: "pm_project_list", permission: "admin" },
  { roleId: "admin", moduleId: "pm_project_detail", permission: "admin" },
  { roleId: "admin", moduleId: "pm_project_cost", permission: "admin" },
  { roleId: "admin", moduleId: "pm_task_management", permission: "admin" },
  { roleId: "admin", moduleId: "pm_gantt", permission: "admin" },
  { roleId: "admin", moduleId: "crm_customer_list", permission: "admin" },
  { roleId: "admin", moduleId: "crm_customer_detail", permission: "admin" },
  { roleId: "admin", moduleId: "crm_opportunity", permission: "admin" },
  { roleId: "admin", moduleId: "crm_contract", permission: "admin" },
  { roleId: "admin", moduleId: "sys_user_management", permission: "admin" },
  { roleId: "admin", moduleId: "sys_role_management", permission: "admin" },
  { roleId: "admin", moduleId: "sys_permission_management", permission: "admin" },
  { roleId: "admin", moduleId: "sys_audit_log", permission: "admin" },
  { roleId: "admin", moduleId: "sys_scheduler", permission: "admin" },
  { roleId: "admin", moduleId: "sys_config", permission: "admin" },
];

// ============================================
// 5. 权限检查工具函数
// ============================================

/**
 * 获取角色对模块的权限级别
 */
export function getPermission(roleId: string, moduleId: string): PermissionLevel {
  const permission = ROLE_PERMISSIONS.find(
    (p) => p.roleId === roleId && p.moduleId === moduleId
  );
  return permission?.permission || "none";
}

/**
 * 检查是否有指定权限
 */
export function hasPermission(
  roleId: string,
  moduleId: string,
  requiredLevel: PermissionLevel
): boolean {
  const currentPermission = getPermission(roleId, moduleId);
  const levels: PermissionLevel[] = ["none", "read", "write", "admin"];
  const currentIndex = levels.indexOf(currentPermission);
  const requiredIndex = levels.indexOf(requiredLevel);
  return currentIndex >= requiredIndex;
}

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(roleId: string): RolePermission[] {
  return ROLE_PERMISSIONS.filter((p) => p.roleId === roleId);
}

/**
 * 获取模块的所有角色权限
 */
export function getModulePermissions(moduleId: string): RolePermission[] {
  return ROLE_PERMISSIONS.filter((p) => p.moduleId === moduleId);
}

/**
 * 获取角色信息
 */
export function getRole(roleId: string): SystemRole | undefined {
  return SYSTEM_ROLES.find((r) => r.id === roleId);
}

/**
 * 获取模块信息
 */
export function getModule(moduleId: string): FunctionModule | undefined {
  return FUNCTION_MODULES.find((m) => m.id === moduleId);
}

/**
 * 生成权限矩阵报表
 */
export function generatePermissionMatrix(): string[][] {
  const headers = ["模块", ...SYSTEM_ROLES.map((r) => r.name)];
  const rows = FUNCTION_MODULES.map((module) => {
    const row = [module.name];
    SYSTEM_ROLES.forEach((role) => {
      const permission = getPermission(role.id, module.id);
      const displayMap: Record<PermissionLevel, string> = {
        none: "—",
        read: "👁",
        write: "✏️",
        admin: "⚙️",
      };
      row.push(displayMap[permission]);
    });
    return row;
  });
  return [headers, ...rows];
}

// ============================================
// 6. 敏感数据访问规则
// ============================================

export interface SensitiveDataRule {
  moduleId: string;
  dataType: string;
  accessCondition: string;
  auditRequired: boolean;
}

export const SENSITIVE_DATA_RULES: SensitiveDataRule[] = [
  {
    moduleId: "hrm_salary_detail",
    dataType: "个人薪资",
    accessCondition: "仅本人、HR、财务、直接主管可查看",
    auditRequired: true,
  },
  {
    moduleId: "hrm_employee_id",
    dataType: "身份证号",
    accessCondition: "仅HR、财务可查看，需记录访问日志",
    auditRequired: true,
  },
  {
    moduleId: "hrm_ai_interview",
    dataType: "面试评估",
    accessCondition: "仅HR、面试官、部门经理可查看",
    auditRequired: true,
  },
  {
    moduleId: "pm_project_cost",
    dataType: "项目成本",
    accessCondition: "仅项目经理、财务、总监可查看",
    auditRequired: true,
  },
  {
    moduleId: "crm_contract",
    dataType: "合同信息",
    accessCondition: "仅销售、财务、法务、总监可查看",
    auditRequired: true,
  },
];


// ============================================
// 7. 群组/部门权限管理
// ============================================

/**
 * 群组类型定义
 * 用于管理部门通用会议、培训、通告等设定
 */
export type GroupType = 
  | "department"      // 部门群组
  | "project"         // 项目群组
  | "cross_dept"      // 跨部门群组
  | "training"        // 培训群组
  | "announcement"    // 通告群组
  | "meeting"         // 会议群组
  | "custom";         // 自定义群组

export interface PermissionGroup {
  id: string;
  name: string;
  nameEn: string;
  type: GroupType;
  description: string;
  parentGroupId?: string;  // 父群组ID，支持层级结构
  departmentId?: string;   // 关联部门ID
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 预定义群组
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  // 部门群组
  { id: "grp_sales", name: "销售部群组", nameEn: "Sales Group", type: "department", description: "销售部全员", departmentId: "sales", isActive: true },
  { id: "grp_tech", name: "技术服务部群组", nameEn: "Tech Service Group", type: "department", description: "技术服务部全员", departmentId: "tech_service", isActive: true },
  { id: "grp_production", name: "生产部群组", nameEn: "Production Group", type: "department", description: "生产部全员", departmentId: "production", isActive: true },
  { id: "grp_procurement", name: "采购部群组", nameEn: "Procurement Group", type: "department", description: "采购部全员", departmentId: "procurement", isActive: true },
  { id: "grp_quality", name: "品管部群组", nameEn: "Quality Group", type: "department", description: "品管部全员", departmentId: "quality", isActive: true },
  { id: "grp_finance", name: "财务部群组", nameEn: "Finance Group", type: "department", description: "财务部全员", departmentId: "finance", isActive: true },
  { id: "grp_hr", name: "人力资源部群组", nameEn: "HR Group", type: "department", description: "人力资源部全员", departmentId: "hr", isActive: true },
  { id: "grp_admin", name: "行政部群组", nameEn: "Admin Group", type: "department", description: "行政部全员", departmentId: "admin_dept", isActive: true },
  
  // 跨部门群组
  { id: "grp_management", name: "管理层群组", nameEn: "Management Group", type: "cross_dept", description: "部门经理及以上", isActive: true },
  { id: "grp_all_staff", name: "全员群组", nameEn: "All Staff Group", type: "cross_dept", description: "公司全体员工", isActive: true },
  { id: "grp_tech_team", name: "技术团队群组", nameEn: "Tech Team Group", type: "cross_dept", description: "技术相关岗位", isActive: true },
  
  // 会议群组
  { id: "grp_weekly_meeting", name: "周例会群组", nameEn: "Weekly Meeting Group", type: "meeting", description: "参加周例会的人员", isActive: true },
  { id: "grp_project_review", name: "项目评审群组", nameEn: "Project Review Group", type: "meeting", description: "参加项目评审的人员", isActive: true },
  { id: "grp_monthly_summary", name: "月度总结群组", nameEn: "Monthly Summary Group", type: "meeting", description: "参加月度总结的人员", isActive: true },
  
  // 培训群组
  { id: "grp_new_employee", name: "新员工培训群组", nameEn: "New Employee Training", type: "training", description: "新入职员工培训", isActive: true },
  { id: "grp_skill_upgrade", name: "技能提升群组", nameEn: "Skill Upgrade Group", type: "training", description: "技能提升培训", isActive: true },
  { id: "grp_safety_training", name: "安全培训群组", nameEn: "Safety Training Group", type: "training", description: "安全生产培训", isActive: true },
  { id: "grp_management_training", name: "管理培训群组", nameEn: "Management Training", type: "training", description: "管理能力培训", isActive: true },
  
  // 通告群组
  { id: "grp_company_notice", name: "公司通告群组", nameEn: "Company Notice Group", type: "announcement", description: "接收公司级通告", isActive: true },
  { id: "grp_hr_notice", name: "人事通告群组", nameEn: "HR Notice Group", type: "announcement", description: "接收人事相关通告", isActive: true },
  { id: "grp_finance_notice", name: "财务通告群组", nameEn: "Finance Notice Group", type: "announcement", description: "接收财务相关通告", isActive: true },
  { id: "grp_it_notice", name: "IT通告群组", nameEn: "IT Notice Group", type: "announcement", description: "接收IT系统相关通告", isActive: true },
];

/**
 * 群组成员关系
 */
export interface GroupMember {
  groupId: string;
  userId?: string;        // 用户ID
  roleId?: string;        // 角色ID（按角色添加）
  departmentId?: string;  // 部门ID（按部门添加）
  memberType: "user" | "role" | "department";
  addedAt?: Date;
  addedBy?: string;
}

/**
 * 群组权限配置
 */
export interface GroupPermission {
  groupId: string;
  moduleId: string;
  permission: PermissionLevel;
  scope: "all" | "own_dept" | "own_team" | "self";  // 权限范围
}

/**
 * 预定义群组权限
 */
export const GROUP_PERMISSIONS: GroupPermission[] = [
  // 管理层群组权限
  { groupId: "grp_management", moduleId: "hrm_employee_basic", permission: "write", scope: "all" },
  { groupId: "grp_management", moduleId: "hrm_performance", permission: "write", scope: "own_dept" },
  { groupId: "grp_management", moduleId: "pm_project_list", permission: "write", scope: "all" },
  { groupId: "grp_management", moduleId: "pm_project_cost", permission: "read", scope: "own_dept" },
  
  // 全员群组权限
  { groupId: "grp_all_staff", moduleId: "hrm_training", permission: "read", scope: "all" },
  { groupId: "grp_all_staff", moduleId: "hrm_onboarding", permission: "read", scope: "self" },
  { groupId: "grp_all_staff", moduleId: "pm_task_management", permission: "write", scope: "self" },
  
  // 新员工培训群组权限
  { groupId: "grp_new_employee", moduleId: "hrm_training", permission: "write", scope: "self" },
  { groupId: "grp_new_employee", moduleId: "hrm_onboarding", permission: "write", scope: "self" },
  
  // 周例会群组权限
  { groupId: "grp_weekly_meeting", moduleId: "pm_project_list", permission: "read", scope: "all" },
  { groupId: "grp_weekly_meeting", moduleId: "pm_gantt", permission: "read", scope: "all" },
];

/**
 * 通告/会议/培训配置
 */
export interface GroupNotificationConfig {
  id: string;
  groupId: string;
  notificationType: "meeting" | "training" | "announcement";
  title: string;
  description?: string;
  scheduleType: "once" | "recurring";
  cronExpression?: string;  // 定期通知的cron表达式
  notifyChannels: ("email" | "system" | "sms")[];
  isActive: boolean;
  createdBy?: string;
  createdAt?: Date;
}

/**
 * 预定义通知配置
 */
export const GROUP_NOTIFICATION_CONFIGS: GroupNotificationConfig[] = [
  {
    id: "notif_weekly_meeting",
    groupId: "grp_weekly_meeting",
    notificationType: "meeting",
    title: "周例会提醒",
    description: "每周一上午9:00召开周例会",
    scheduleType: "recurring",
    cronExpression: "0 0 9 * * 1",  // 每周一9:00
    notifyChannels: ["email", "system"],
    isActive: true,
  },
  {
    id: "notif_monthly_summary",
    groupId: "grp_monthly_summary",
    notificationType: "meeting",
    title: "月度总结会议提醒",
    description: "每月最后一个工作日下午2:00召开月度总结",
    scheduleType: "recurring",
    cronExpression: "0 0 14 L * ?",  // 每月最后一天14:00
    notifyChannels: ["email", "system"],
    isActive: true,
  },
  {
    id: "notif_safety_training",
    groupId: "grp_safety_training",
    notificationType: "training",
    title: "安全生产培训提醒",
    description: "季度安全生产培训",
    scheduleType: "recurring",
    cronExpression: "0 0 9 1 1,4,7,10 ?",  // 每季度第一天9:00
    notifyChannels: ["email", "system"],
    isActive: true,
  },
  {
    id: "notif_company_notice",
    groupId: "grp_company_notice",
    notificationType: "announcement",
    title: "公司重要通告",
    description: "公司级重要通告通知",
    scheduleType: "once",
    notifyChannels: ["email", "system", "sms"],
    isActive: true,
  },
];

// ============================================
// 8. 群组权限工具函数
// ============================================

/**
 * 获取群组信息
 */
export function getGroup(groupId: string): PermissionGroup | undefined {
  return PERMISSION_GROUPS.find((g) => g.id === groupId);
}

/**
 * 获取部门的群组
 */
export function getDepartmentGroups(departmentId: string): PermissionGroup[] {
  return PERMISSION_GROUPS.filter((g) => g.departmentId === departmentId);
}

/**
 * 获取指定类型的群组
 */
export function getGroupsByType(type: GroupType): PermissionGroup[] {
  return PERMISSION_GROUPS.filter((g) => g.type === type);
}

/**
 * 获取群组的权限配置
 */
export function getGroupPermissions(groupId: string): GroupPermission[] {
  return GROUP_PERMISSIONS.filter((p) => p.groupId === groupId);
}

/**
 * 检查用户是否在群组中（需要传入用户的角色和部门信息）
 */
export function isUserInGroup(
  groupId: string,
  userRoleId: string,
  userDepartmentId: string,
  groupMembers: GroupMember[]
): boolean {
  return groupMembers.some((member) => {
    if (member.groupId !== groupId) return false;
    
    switch (member.memberType) {
      case "user":
        return false; // 需要具体用户ID匹配
      case "role":
        return member.roleId === userRoleId;
      case "department":
        return member.departmentId === userDepartmentId;
      default:
        return false;
    }
  });
}

/**
 * 获取群组的通知配置
 */
export function getGroupNotificationConfigs(groupId: string): GroupNotificationConfig[] {
  return GROUP_NOTIFICATION_CONFIGS.filter((c) => c.groupId === groupId);
}

/**
 * 获取指定类型的通知配置
 */
export function getNotificationConfigsByType(
  notificationType: "meeting" | "training" | "announcement"
): GroupNotificationConfig[] {
  return GROUP_NOTIFICATION_CONFIGS.filter((c) => c.notificationType === notificationType);
}

/**
 * 生成群组权限报表
 */
export function generateGroupPermissionReport(): {
  groups: PermissionGroup[];
  permissions: GroupPermission[];
  notifications: GroupNotificationConfig[];
} {
  return {
    groups: PERMISSION_GROUPS,
    permissions: GROUP_PERMISSIONS,
    notifications: GROUP_NOTIFICATION_CONFIGS,
  };
}
