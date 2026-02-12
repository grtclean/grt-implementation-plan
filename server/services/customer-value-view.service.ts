/**
 * Customer Value View Service
 * Based on Gemini Design: GRT UI Renderer
 * Task: Display "Customer Value View" for logged-in user
 */

// 客户场景定义 (The "Why")
const CUSTOMER_SCENARIOS = [
  {
    id: 1,
    name: '新工厂建设',
    nameEn: 'New Factory Setup',
    description: '客户正在建设新工厂，需要全套清洗设备',
    descriptionEn: 'Customer building new factory, needs complete cleaning equipment',
    criticalRequirements: ['交付时间', '系统集成', '培训支持'],
    criticalRequirementsEn: ['Delivery Time', 'System Integration', 'Training Support'],
  },
  {
    id: 2,
    name: '产能扩张',
    nameEn: 'Capacity Expansion',
    description: '客户需要增加产能，添加新的清洗线',
    descriptionEn: 'Customer needs to increase capacity, add new cleaning lines',
    criticalRequirements: ['兼容性', '快速安装', '最小停机'],
    criticalRequirementsEn: ['Compatibility', 'Quick Installation', 'Minimal Downtime'],
  },
  {
    id: 3,
    name: '设备更换',
    nameEn: 'Equipment Replacement',
    description: '客户需要更换老旧设备',
    descriptionEn: 'Customer needs to replace aging equipment',
    criticalRequirements: ['性能提升', '成本效益', '旧设备处理'],
    criticalRequirementsEn: ['Performance Improvement', 'Cost Efficiency', 'Old Equipment Disposal'],
  },
  {
    id: 4,
    name: '精密清洗升级',
    nameEn: 'Precision Cleaning Upgrade',
    description: '客户需要更高的清洁度标准（<50微米颗粒）',
    descriptionEn: 'Customer needs higher cleanliness standards (<50 micron particles)',
    criticalRequirements: ['零泄漏', '颗粒控制', '验证测试'],
    criticalRequirementsEn: ['Zero Leakage', 'Particle Control', 'Validation Testing'],
  },
  {
    id: 5,
    name: '工艺优化',
    nameEn: 'Process Optimization',
    description: '客户需要优化现有清洗工艺',
    descriptionEn: 'Customer needs to optimize existing cleaning process',
    criticalRequirements: ['节拍优化', '能耗降低', '质量提升'],
    criticalRequirementsEn: ['Cycle Time Optimization', 'Energy Reduction', 'Quality Improvement'],
  },
  {
    id: 6,
    name: '自动化升级',
    nameEn: 'Automation Upgrade',
    description: '客户需要提升自动化水平',
    descriptionEn: 'Customer needs to improve automation level',
    criticalRequirements: ['机器人集成', '智能监控', '远程控制'],
    criticalRequirementsEn: ['Robot Integration', 'Smart Monitoring', 'Remote Control'],
  },
  {
    id: 7,
    name: '环保合规',
    nameEn: 'Environmental Compliance',
    description: '客户需要满足环保法规要求',
    descriptionEn: 'Customer needs to meet environmental regulations',
    criticalRequirements: ['废水处理', '化学品管理', '能效认证'],
    criticalRequirementsEn: ['Wastewater Treatment', 'Chemical Management', 'Energy Certification'],
  },
];

// M0-M12 项目阶段定义
const PROJECT_PHASES = [
  { id: 'M0', name: '立项', nameEn: 'Project Initiation', roles: ['PM', 'Sales'] },
  { id: 'M1', name: '需求确认', nameEn: 'Requirements Confirmation', roles: ['PM', 'Engineer'] },
  { id: 'M2', name: '方案设计', nameEn: 'Solution Design', roles: ['Engineer', 'R&D'] },
  { id: 'M3', name: '设计评审', nameEn: 'Design Review', roles: ['Engineer', 'QA'] },
  { id: 'M4', name: '采购', nameEn: 'Procurement', roles: ['Procurement', 'Engineer'] },
  { id: 'M5', name: '生产', nameEn: 'Production', roles: ['Production', 'QA'] },
  { id: 'M6', name: '装配', nameEn: 'Assembly', roles: ['Assembly', 'Engineer'] },
  { id: 'M7', name: '调试', nameEn: 'Debugging', roles: ['Engineer', 'QA'] },
  { id: 'M8', name: 'FAT', nameEn: 'Factory Acceptance Test', roles: ['QA', 'Customer'] },
  { id: 'M9', name: '发货', nameEn: 'Shipping', roles: ['Logistics', 'PM'] },
  { id: 'M10', name: '安装', nameEn: 'Installation', roles: ['Service', 'Engineer'] },
  { id: 'M11', name: 'SAT', nameEn: 'Site Acceptance Test', roles: ['Service', 'Customer'] },
  { id: 'M12', name: '验收', nameEn: 'Final Acceptance', roles: ['PM', 'Customer'] },
];

// 技能要求定义
const SKILL_REQUIREMENTS: Record<string, string[]> = {
  Assembly_L1: ['基础装配', '工具使用', '安全规范'],
  Assembly_L2: ['精密装配', '质量检测', '问题排查'],
  Assembly_L3: ['复杂系统装配', '密封测试', '氦检漏'],
  Assembly_L4: ['工艺优化', '培训指导', '技术创新'],
  Assembly_L5: ['系统设计', '标准制定', '技术决策'],
  Engineer_L1: ['基础设计', 'CAD使用', '技术文档'],
  Engineer_L2: ['系统设计', '仿真分析', '技术评审'],
  Engineer_L3: ['复杂系统设计', '创新方案', '客户沟通'],
  Engineer_L4: ['架构设计', '技术规划', '团队指导'],
  Engineer_L5: ['技术战略', '行业标准', '技术决策'],
  Service_L1: ['基础维护', '故障诊断', '客户沟通'],
  Service_L2: ['复杂维修', '预防维护', '培训客户'],
  Service_L3: ['系统优化', '远程支持', '技术咨询'],
  Service_L4: ['解决方案', '客户成功', '团队管理'],
  Service_L5: ['服务战略', '客户关系', '业务发展'],
};

// 用户角色类型
interface UserRole {
  id: string;
  name: string;
  nameEn: string;
  department: string;
  level: number; // L1-L5
  m0m12Roles: string[]; // 在M0-M12中的角色
  requiredSkills: string[];
}

// 工作职能矩阵
interface JobFunctionMatrix {
  m0m12Role: string;
  requiredSkills: string[];
  customerScenarios: number[];
}

// 客户价值视图数据
interface CustomerValueView {
  user: {
    role: string;
    roleEn: string;
    level: number;
    department: string;
  };
  mission: {
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    criticalFor: string;
  };
  currentTask: {
    projectName: string;
    phase: string;
    phaseEn: string;
    customerDriver: {
      scenarioId: number;
      scenarioName: string;
      scenarioNameEn: string;
      requirement: string;
      requirementEn: string;
    };
    actionItem: {
      title: string;
      titleEn: string;
      description: string;
      descriptionEn: string;
    };
  };
  nextLevelRequirement: {
    currentLevel: number;
    nextLevel: number;
    requirement: string;
    requirementEn: string;
  };
}

/**
 * 获取用户角色信息
 */
export function getUserRole(userId: string): UserRole {
  // 这里应该从数据库获取，现在返回示例数据
  return {
    id: userId,
    name: '装配工程师 L3',
    nameEn: 'Assembly Engineer L3',
    department: 'Production',
    level: 3,
    m0m12Roles: ['M6_Lead', 'M7_Support'],
    requiredSkills: SKILL_REQUIREMENTS['Assembly_L3'] || [],
  };
}

/**
 * 获取工作职能矩阵
 */
export function getJobFunctionMatrix(role: UserRole): JobFunctionMatrix {
  return {
    m0m12Role: role.m0m12Roles.join(', '),
    requiredSkills: role.requiredSkills,
    customerScenarios: [4, 5], // 精密清洗升级、工艺优化
  };
}

/**
 * 将角色映射到客户场景
 */
export function mapRoleToScenarios(role: UserRole): typeof CUSTOMER_SCENARIOS {
  const matrix = getJobFunctionMatrix(role);
  return CUSTOMER_SCENARIOS.filter((s) => matrix.customerScenarios.includes(s.id));
}

/**
 * 生成客户价值视图
 */
export function generateCustomerValueView(
  userId: string,
  projectId?: string,
  language: 'zh' | 'en' = 'zh'
): CustomerValueView {
  const role = getUserRole(userId);
  const scenarios = mapRoleToScenarios(role);
  const primaryScenario = scenarios[0] || CUSTOMER_SCENARIOS[3]; // 默认场景4

  const isZh = language === 'zh';

  return {
    user: {
      role: role.name,
      roleEn: role.nameEn,
      level: role.level,
      department: role.department,
    },
    mission: {
      title: isZh ? '确保真空腔体零泄漏' : 'Ensure Zero-Leakage in Vacuum Chambers',
      titleEn: 'Ensure Zero-Leakage in Vacuum Chambers',
      description: isZh
        ? '这是场景4（精密清洗升级）的关键要求'
        : 'This is critical for Scenario 4 (Precision Cleaning Upgrade)',
      descriptionEn: 'This is critical for Scenario 4 (Precision Cleaning Upgrade)',
      criticalFor: `Scenario ${primaryScenario.id}`,
    },
    currentTask: {
      projectName: projectId || 'Project X',
      phase: 'M6',
      phaseEn: 'Assembly',
      customerDriver: {
        scenarioId: primaryScenario.id,
        scenarioName: primaryScenario.name,
        scenarioNameEn: primaryScenario.nameEn,
        requirement: isZh ? '需要 < 50 微米颗粒' : 'They need < 50 micron particles',
        requirementEn: 'They need < 50 micron particles',
      },
      actionItem: {
        title: isZh ? '验证密封完整性' : 'Verify seal integrity',
        titleEn: 'Verify seal integrity',
        description: isZh ? '使用氦检漏仪进行检测' : 'Using Helium Leak Detector',
        descriptionEn: 'Using Helium Leak Detector',
      },
    },
    nextLevelRequirement: {
      currentLevel: role.level,
      nextLevel: role.level + 1,
      requirement: isZh
        ? `提出1项工艺优化建议，将M6周期时间缩短10%`
        : `Propose 1 process optimization to reduce M6 cycle time by 10%`,
      requirementEn: `Propose 1 process optimization to reduce M6 cycle time by 10%`,
    },
  };
}

/**
 * 生成UI提示
 */
export function generateUIPrompt(view: CustomerValueView, language: 'zh' | 'en' = 'zh'): string {
  const isZh = language === 'zh';

  return `
    Display Sidebar:
    - Role: ${isZh ? view.user.role : view.user.roleEn}
    - Mission: ${isZh ? view.mission.title : view.mission.titleEn} (${view.mission.criticalFor})
    
    Display Main Content:
    - Current Task: ${view.currentTask.projectName} - ${view.currentTask.phase} Stage
    - Customer Driver: ${isZh ? view.currentTask.customerDriver.scenarioName : view.currentTask.customerDriver.scenarioNameEn} (${isZh ? view.currentTask.customerDriver.requirement : view.currentTask.customerDriver.requirementEn})
    - Action Item: ${isZh ? view.currentTask.actionItem.title : view.currentTask.actionItem.titleEn} - ${isZh ? view.currentTask.actionItem.description : view.currentTask.actionItem.descriptionEn}
    
    Display Bottom Bar:
    - Next Level (L${view.nextLevelRequirement.nextLevel}) Requirement: ${isZh ? view.nextLevelRequirement.requirement : view.nextLevelRequirement.requirementEn}
  `.trim();
}

/**
 * 获取所有客户场景
 */
export function getAllCustomerScenarios() {
  return CUSTOMER_SCENARIOS;
}

/**
 * 获取所有项目阶段
 */
export function getAllProjectPhases() {
  return PROJECT_PHASES;
}

/**
 * 获取技能要求
 */
export function getSkillRequirements(roleKey: string) {
  return SKILL_REQUIREMENTS[roleKey] || [];
}

export type { UserRole, JobFunctionMatrix, CustomerValueView };
