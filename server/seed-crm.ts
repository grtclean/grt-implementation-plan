import { requireDb } from './utils/db-helpers';
import { crmCustomers, crmContacts, crmOpportunities, crmBantScores } from "../drizzle/schema";

// CRM测试数据种子脚本
export async function seedCrmData() {
  const db = await requireDb();
  if (!db) {
    return { success: false, message: "Database not available", seeded: false };
  }
  
  // 检查是否已有数据
  const existingCustomers = await db.select().from(crmCustomers).limit(1);
  if (existingCustomers.length > 0) {
    return { success: true, message: "CRM data already exists", seeded: false };
  }

  // 1. 创建测试客户
  const testCustomers = [
    {
      name: "大连大众汽车有限公司",
      shortName: "大连大众",
      type: "customer" as const,
      scale: "enterprise" as const,
      industry: "汽车制造",
      province: "辽宁省",
      city: "大连市",
      address: "大连市经济技术开发区汽车产业园a区",
      website: "https://www.dlvw.com",
      source: "展会",
      level: "A" as const,
      tags: "汽车,MES,智能制造",
      notes: "大众汽车在华重要合作伙伴，年产能50万辆",
    },
    {
      name: "沈阳机床集团有限责任公司",
      shortName: "沈阳机床",
      type: "customer" as const,
      scale: "large" as const,
      industry: "机械制造",
      province: "辽宁省",
      city: "沈阳市",
      address: "沈阳市铁西区开发大路16号",
      website: "https://www.smtcl.com",
      source: "转介绍",
      level: "A" as const,
      tags: "机床,数控,智能工厂",
      notes: "国内机床行业龙头企业",
    },
    {
      name: "鞍钢集团有限公司",
      shortName: "鞍钢集团",
      type: "prospect" as const,
      scale: "enterprise" as const,
      industry: "钢铁冶金",
      province: "辽宁省",
      city: "鞍山市",
      address: "鞍山市铁西区鞍钢厂区",
      website: "https://www.ansteel.cn",
      source: "电话开发",
      level: "B" as const,
      tags: "钢铁,冶金,大型企业",
      notes: "国有特大型钢铁企业",
    },
    {
      name: "大连船舶重工集团有限公司",
      shortName: "大船重工",
      type: "customer" as const,
      scale: "enterprise" as const,
      industry: "船舶制造",
      province: "辽宁省",
      city: "大连市",
      address: "大连市西岗区中山路1号",
      website: "https://www.dsic.cn",
      source: "官网",
      level: "A" as const,
      tags: "船舶,重工,军工",
      notes: "中国船舶工业集团核心成员",
    },
    {
      name: "华晨宝马汽车有限公司",
      shortName: "华晨宝马",
      type: "prospect" as const,
      scale: "enterprise" as const,
      industry: "汽车制造",
      province: "辽宁省",
      city: "沈阳市",
      address: "沈阳市大东区东陵路39号",
      website: "https://www.bmw-brilliance.cn",
      source: "展会",
      level: "A" as const,
      tags: "汽车,豪华品牌,新能源",
      notes: "宝马在华合资企业",
    },
    {
      name: "恒力石化(大连)有限公司",
      shortName: "恒力石化",
      type: "customer" as const,
      scale: "enterprise" as const,
      industry: "石油化工",
      province: "辽宁省",
      city: "大连市",
      address: "大连市长兴岛经济区",
      website: "https://www.hengli.com",
      source: "合作伙伴",
      level: "A" as const,
      tags: "石化,炼化,大型项目",
      notes: "民营炼化一体化龙头",
    },
    {
      name: "大连理工大学",
      shortName: "大连理工",
      type: "partner" as const,
      scale: "large" as const,
      industry: "教育科研",
      province: "辽宁省",
      city: "大连市",
      address: "大连市甘井子区凌工路2号",
      website: "https://www.dlut.edu.cn",
      source: "转介绍",
      level: "B" as const,
      tags: "高校,科研,产学研",
      notes: "985高校，智能制造研究中心",
    },
    {
      name: "中科院大连化学物理研究所",
      shortName: "大连化物所",
      type: "prospect" as const,
      scale: "medium" as const,
      industry: "科研机构",
      province: "辽宁省",
      city: "大连市",
      address: "大连市中山路457号",
      website: "https://www.dicp.cas.cn",
      source: "转介绍",
      level: "C" as const,
      tags: "科研,化学,催化",
      notes: "国家级科研机构",
    },
  ];

  await db.insert(crmCustomers).values(testCustomers);

  // 2. 创建测试联系人
  const testContacts = [
    { customerId: 1, name: "吴卫成", title: "信息化部总监", phone: "13800138001", email: "wuweib@dlvw.com", isPrimary: true },
    { customerId: 1, name: "李兴伟", title: "MES项目经理", phone: "13800138002", email: "lixingw@dlvw.com", isPrimary: false },
    { customerId: 2, name: "杜显文", title: "智能制造部长", phone: "13800138003", email: "duxianw@smtcl.com", isPrimary: true },
    { customerId: 3, name: "廉龙海", title: "信息中心主任", phone: "13800138004", email: "qulongh@ansteel.cn", isPrimary: true },
    { customerId: 4, name: "陈晨", title: "数字化转型负责人", phone: "13800138005", email: "chenchen@dsic.cn", isPrimary: true },
    { customerId: 5, name: "焦斌", title: "IT总监", phone: "13800138006", email: "jiaobin@bmw-brilliance.cn", isPrimary: true },
    { customerId: 6, name: "杨勇", title: "工程部经理", phone: "13800138007", email: "yangyong@hengli.com", isPrimary: true },
    { customerId: 7, name: "周教授", title: "智能制造研究中心主任", phone: "13800138008", email: "zhouprof@dlut.edu.cn", isPrimary: true },
  ];

  await db.insert(crmContacts).values(testContacts);

  // 3. 创建测试商机
  const now = new Date();
  const testOpportunities = [
    {
      customerId: 1,
      name: "大连大众MES系统升级项目",
      stage: "negotiation" as const,
      expectedAmount: 500,
      probability: 80,
      expectedCloseDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: "展会",
      painPoints: "现有MES系统升级改造，集成AI质检和UWB定位",
      nextAction: "准备技术方案评审",
    },
    {
      customerId: 2,
      name: "沈阳机床智能工厂项目",
      stage: "proposal" as const,
      expectedAmount: 800,
      probability: 60,
      expectedCloseDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      source: "转介绍",
      painPoints: "整体智能工厂解决方案，包含MES、WMS、QMS",
      nextAction: "提交详细报价",
    },
    {
      customerId: 3,
      name: "鞍钢能源管理系统",
      stage: "qualification" as const,
      expectedAmount: 300,
      probability: 40,
      expectedCloseDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      source: "电话开发",
      painPoints: "能源管理和碳排放监控系统",
      nextAction: "安排技术交流",
    },
    {
      customerId: 4,
      name: "大船重工项目管理系统",
      stage: "closed_won" as const,
      expectedAmount: 450,
      probability: 100,
      expectedCloseDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      source: "官网",
      painPoints: "船舶建造项目全生命周期管理系统",
      nextAction: "项目启动会",
    },
    {
      customerId: 5,
      name: "华晨宝马供应链协同平台",
      stage: "lead" as const,
      expectedAmount: 600,
      probability: 20,
      expectedCloseDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      source: "展会",
      painPoints: "供应商协同和质量追溯平台",
      nextAction: "初次拜访",
    },
    {
      customerId: 6,
      name: "恒力石化设备管理系统",
      stage: "negotiation" as const,
      expectedAmount: 350,
      probability: 75,
      expectedCloseDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      source: "合作伙伴",
      painPoints: "设备预测性维护和备件管理系统",
      nextAction: "商务谈判",
    },
    {
      customerId: 1,
      name: "大连大众质量追溯系统",
      stage: "closed_lost" as const,
      expectedAmount: 200,
      probability: 0,
      expectedCloseDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: "展会",
      painPoints: "零部件质量追溯系统",
      lostReason: "预算削减",
    },
    {
      customerId: 7,
      name: "大连理工产学研合作项目",
      stage: "proposal" as const,
      expectedAmount: 150,
      probability: 50,
      expectedCloseDate: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString(),
      source: "转介绍",
      painPoints: "智能制造实验室共建项目",
      nextAction: "提交合作方案",
    },
  ];

  await db.insert(crmOpportunities).values(testOpportunities);

  // 4. 创建BANT评分
  const testBantScores = [
    { opportunityId: 1, budget: 90, authority: 85, need: 95, timeline: 80, totalScore: 88, notes: "预算充足，决策层支持" },
    { opportunityId: 2, budget: 75, authority: 70, need: 85, timeline: 60, totalScore: 73, notes: "需求明确，时间线待确认" },
    { opportunityId: 3, budget: 60, authority: 50, need: 70, timeline: 40, totalScore: 55, notes: "初步接触，需进一步了解" },
    { opportunityId: 4, budget: 95, authority: 95, need: 100, timeline: 100, totalScore: 98, notes: "已成交" },
    { opportunityId: 5, budget: 40, authority: 30, need: 60, timeline: 20, totalScore: 38, notes: "早期阶段" },
    { opportunityId: 6, budget: 85, authority: 80, need: 90, timeline: 75, totalScore: 83, notes: "进展顺利" },
  ];

  await db.insert(crmBantScores).values(testBantScores);

  return { 
    success: true, 
    message: "CRM test data seeded successfully",
    seeded: true,
    counts: {
      customers: testCustomers.length,
      contacts: testContacts.length,
      opportunities: testOpportunities.length,
      bantScores: testBantScores.length,
    }
  };
}

export async function clearCrmData() {
  const db = await requireDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }
  
  await db.delete(crmBantScores);
  await db.delete(crmOpportunities);
  await db.delete(crmContacts);
  await db.delete(crmCustomers);
  
  return { success: true, message: "CRM data cleared" };
}
