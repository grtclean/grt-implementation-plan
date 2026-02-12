/**
 * HRM薪酬体系数据导入种子脚本
 * 导入GRT绩效薪酬体系方案数据
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "../drizzle/schema";

async function seedSalaryData() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🚀 开始导入GRT绩效薪酬体系数据...\n");

  // 1. 导入薪酬结构数据
  console.log("💰 导入薪酬结构数据...");
  
  const salaryStructures = [
    // 销售部
    {
      department: "销售部",
      baseSalaryRatioMin: "30.00",
      baseSalaryRatioMax: "40.00",
      performanceRatioMin: "10.00",
      performanceRatioMax: "20.00",
      bonusRatioMin: "40.00",
      bonusRatioMax: "50.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 技术服务部
    {
      department: "技术服务部",
      baseSalaryRatioMin: "50.00",
      baseSalaryRatioMax: "60.00",
      performanceRatioMin: "20.00",
      performanceRatioMax: "25.00",
      bonusRatioMin: "10.00",
      bonusRatioMax: "20.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 生产部
    {
      department: "生产部",
      baseSalaryRatioMin: "50.00",
      baseSalaryRatioMax: "60.00",
      performanceRatioMin: "25.00",
      performanceRatioMax: "30.00",
      bonusRatioMin: "10.00",
      bonusRatioMax: "15.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 采购部
    {
      department: "采购部",
      baseSalaryRatioMin: "50.00",
      baseSalaryRatioMax: "60.00",
      performanceRatioMin: "20.00",
      performanceRatioMax: "25.00",
      bonusRatioMin: "10.00",
      bonusRatioMax: "20.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 品管部
    {
      department: "品管部",
      baseSalaryRatioMin: "55.00",
      baseSalaryRatioMax: "65.00",
      performanceRatioMin: "20.00",
      performanceRatioMax: "25.00",
      bonusRatioMin: "5.00",
      bonusRatioMax: "15.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 财务部
    {
      department: "财务部",
      baseSalaryRatioMin: "60.00",
      baseSalaryRatioMax: "70.00",
      performanceRatioMin: "20.00",
      performanceRatioMax: "25.00",
      bonusRatioMin: "5.00",
      bonusRatioMax: "10.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    },
    // 研发部
    {
      department: "研发部",
      baseSalaryRatioMin: "50.00",
      baseSalaryRatioMax: "60.00",
      performanceRatioMin: "20.00",
      performanceRatioMax: "30.00",
      bonusRatioMin: "10.00",
      bonusRatioMax: "15.00",
      benefitsRatioMin: "5.00",
      benefitsRatioMax: "10.00",
      effectiveDate: new Date("2026-01-01").toISOString(),
      status: "active" as const
    }
  ];

  for (const structure of salaryStructures) {
    // 先检查是否已存在
    const existing = await db.select().from(schema.hrmSalaryStructures).where(eq(schema.hrmSalaryStructures.department, structure.department));
    if (existing.length === 0) {
      await db.insert(schema.hrmSalaryStructures).values(structure);
      console.log(`  + 已导入 ${structure.department} 薪酬结构`);
    } else {
      console.log(`  - ${structure.department} 薪酬结构已存在，跳过`);
    }
  }
  console.log(`✅ 薪酬结构导入完成\n`);

  // 2. 导入绩效等级数据
  console.log("📊 导入绩效等级数据...");
  
  const performanceGrades = [
    {
      gradeCode: `S`,
      gradeName: "S级 - 卓越",
      scoreMin: 95,
      scoreMax: 100,
      coefficient: "1.50",    // 150%绩效系数
      description: "超额完成目标，表现卓越，为公司创造显著价值"
    },
    {
      gradeCode: `A`,
      gradeName: "A级 - 优秀",
      scoreMin: 85,
      scoreMax: 94,
      coefficient: "1.20",    // 120%绩效系数
      description: "完成目标，表现优秀，超出预期"
    },
    {
      gradeCode: `B`,
      gradeName: "B级 - 良好",
      scoreMin: 70,
      scoreMax: 84,
      coefficient: "1.00",    // 100%绩效系数
      description: "完成目标，表现良好，符合预期"
    },
    {
      gradeCode: `C`,
      gradeName: "C级 - 合格",
      scoreMin: 60,
      scoreMax: 69,
      coefficient: "0.80",     // 80%绩效系数
      description: "基本完成目标，表现合格，需要改进"
    },
    {
      gradeCode: `D`,
      gradeName: "D级 - 不合格",
      scoreMin: 0,
      scoreMax: 59,
      coefficient: "0.00",      // 0%绩效系数
      description: "未完成目标，表现不合格，需要辅导或调整"
    }
  ];

  for (const grade of performanceGrades) {
    // 先检查是否已存在
    const existing = await db.select().from(schema.hrmPerformanceGrades).where(eq(schema.hrmPerformanceGrades.gradeCode, grade.gradeCode));
    if (existing.length === 0) {
      await db.insert(schema.hrmPerformanceGrades).values(grade);
      console.log(`  + 已导入 ${grade.gradeCode} 绩效等级`);
    } else {
      console.log(`  - ${grade.gradeCode} 绩效等级已存在，跳过`);
    }
  }
  console.log(`✅ 绩效等级导入完成\n`);

  // 3. 创建技术服务部岗位等级数据
  console.log("👔 导入技术服务部岗位等级...");
  
  const techPositions = [
    {
      positionCode: `POS-T5-${Date.now().toString().slice(-6)}`,
      name: "技术总监",
      department: "技术服务部",
      level: "T5",
      responsibilities: JSON.stringify([
        "技术团队整体管理",
        "技术战略规划",
        "重大项目技术决策",
        "技术人才培养",
        "跨部门技术协调"
      ]),
      kpiIndicators: JSON.stringify([
        { name: "团队绩效达成率", weight: 30, target: "≥90%" },
        { name: "重大项目成功率", weight: 25, target: "≥95%" },
        { name: "技术创新成果", weight: 20, target: "≥2项/年" },
        { name: "人才培养完成率", weight: 15, target: "≥85%" },
        { name: "客户满意度", weight: 10, target: "≥4.5/5" }
      ]),
      salaryRange: JSON.stringify({ min: 18000, max: 25000, techAllowance: { min: 3000, max: 5000 } }),
      status: "active" as const
    },
    {
      positionCode: `POS-T4-${Date.now().toString().slice(-6)}`,
      name: "高级工程师",
      department: "技术服务部",
      level: "T4",
      responsibilities: JSON.stringify([
        "复杂项目技术方案设计",
        "技术难题攻关",
        "初中级工程师指导",
        "技术文档审核",
        "客户技术支持"
      ]),
      kpiIndicators: JSON.stringify([
        { name: "项目交付及时率", weight: 25, target: "≥95%" },
        { name: "技术方案通过率", weight: 25, target: "≥90%" },
        { name: "技术指导满意度", weight: 20, target: "≥4.3/5" },
        { name: "问题解决效率", weight: 15, target: "≤8小时" },
        { name: "知识分享次数", weight: 15, target: "≥3次/月" }
      ]),
      salaryRange: JSON.stringify({ min: 14000, max: 18000, techAllowance: { min: 2000, max: 3000 } }),
      status: "active" as const
    },
    {
      positionCode: `POS-T3-${Date.now().toString().slice(-6)}`,
      name: "工程师",
      department: "技术服务部",
      level: "T3",
      responsibilities: JSON.stringify([
        "项目技术方案执行",
        "设备安装调试",
        "技术文档编写",
        "客户培训",
        "售后技术支持"
      ]),
      kpiIndicators: JSON.stringify([
        { name: "项目交付及时率", weight: 25, target: "≥90%" },
        { name: "设备调试一次通过率", weight: 25, target: "≥85%" },
        { name: "技术文档完整率", weight: 20, target: "100%" },
        { name: "客户满意度", weight: 15, target: "≥4.0/5" },
        { name: "问题响应时效", weight: 15, target: "≤4小时" }
      ]),
      salaryRange: JSON.stringify({ min: 10000, max: 14000, techAllowance: { min: 1000, max: 2000 } }),
      status: "active" as const
    },
    {
      positionCode: `POS-T2-${Date.now().toString().slice(-6)}`,
      name: "助理工程师",
      department: "技术服务部",
      level: "T2",
      responsibilities: JSON.stringify([
        "协助项目技术实施",
        "设备安装配合",
        "技术资料整理",
        "现场问题记录",
        "学习技术技能"
      ]),
      kpiIndicators: JSON.stringify([
        { name: "任务完成率", weight: 30, target: "≥90%" },
        { name: "技能学习进度", weight: 25, target: "按计划完成" },
        { name: "工作质量", weight: 20, target: "≥85分" },
        { name: "团队协作", weight: 15, target: "≥4.0/5" },
        { name: "出勤率", weight: 10, target: "≥98%" }
      ]),
      salaryRange: JSON.stringify({ min: 7000, max: 10000, techAllowance: { min: 500, max: 1000 } }),
      status: "active" as const
    },
    {
      positionCode: `POS-T1-${Date.now().toString().slice(-6)}`,
      name: "技术员",
      department: "技术服务部",
      level: "T1",
      responsibilities: JSON.stringify([
        "基础技术工作执行",
        "设备维护保养",
        "技术资料归档",
        "工具设备管理",
        "学习基础技能"
      ]),
      kpiIndicators: JSON.stringify([
        { name: "任务完成率", weight: 30, target: "≥85%" },
        { name: "技能学习进度", weight: 25, target: "按计划完成" },
        { name: "工作态度", weight: 20, target: "≥4.0/5" },
        { name: "出勤率", weight: 15, target: "≥98%" },
        { name: "安全规范遵守", weight: 10, target: "100%" }
      ]),
      salaryRange: JSON.stringify({ min: 5000, max: 7000, techAllowance: { min: 300, max: 500 } }),
      status: "active" as const
    }
  ];

  for (const position of techPositions) {
    // 先检查是否已存在
    const existing = await db.select().from(schema.hrmPositions).where(eq(schema.hrmPositions.positionCode, position.positionCode));
    if (existing.length === 0) {
      // 移除level字段，因为schema中没有这个字段
      const { level, salaryRange, ...positionData } = position;
      await db.insert(schema.hrmPositions).values(positionData);
      console.log(`  + 已导入 ${level} ${position.name}`);
    } else {
      console.log(`  - ${position.positionCode} ${position.name} 已存在，跳过`);
    }
  }
  console.log(`✅ 技术岗位等级导入完成\n`);

  // 4. 创建福利补贴标准配置
  console.log("🎁 创建福利补贴标准配置...");
  
  const benefitsConfig = {
    region: "无锡",
    effectiveDate: "2026-01-01",
    benefits: [
      { name: "餐补", standard: "20元/天", scope: "全员", type: "daily" },
      { name: "交通补贴", standard: "300-500元/月", scope: "无班车员工", type: "monthly" },
      { name: "通讯补贴", standard: "100-500元/月", scope: "销售技术管理", type: "monthly" },
      { name: "住房补贴", standard: "500-1500元/月", scope: "外地员工", type: "monthly" },
      { name: "高温补贴", standard: "300元/月", scope: "生产一线(6-9月)", type: "seasonal" },
      { name: "工龄补贴", standard: "50元/年", scope: "全员", type: "yearly" },
      { name: "学历补贴", standard: "200-1000元/月", scope: "本科及以上", type: "monthly" },
      { name: "证书补贴", standard: "200-800元/月", scope: "持证人员", type: "monthly" }
    ],
    salesCommission: {
      tiers: [
        { minAmount: 0, maxAmount: 500, rate: 1.5 },
        { minAmount: 500, maxAmount: 1000, rate: 2.0 },
        { minAmount: 1000, maxAmount: 2000, rate: 2.5 },
        { minAmount: 2000, maxAmount: null, rate: 3.0 }
      ],
      customerCoefficients: [
        { type: "新开发客户", coefficient: 1.2 },
        { type: "老客户复购", coefficient: 1.0 },
        { type: "公司资源客户", coefficient: 0.8 }
      ],
      formula: "实际提成 = 回款额 × 阶梯提成比例 × 客户类型系数 × 项目完成度系数"
    },
    projectBonus: {
      description: "项目协作利益绑定（80-800万大项目）",
      distribution: [
        { department: "销售部", ratio: 40, metrics: "签约额、回款" },
        { department: "技术服务部", ratio: 30, metrics: "技术方案、验收" },
        { department: "生产部", ratio: 25, metrics: "交期、质量" },
        { department: "其他部门", ratio: 5, metrics: "配合度" }
      ]
    },
    crossDepartmentCollaboration: {
      evaluationRatio: 15,
      description: "协作评分纳入考核比例15%"
    }
  };

  // 保存配置到JSON文件
  const fs = await import("fs/promises");
  const configPath = "/home/ubuntu/grt-implementation-plan/docs/config";
  await fs.mkdir(configPath, { recursive: true });
  await fs.writeFile(
    `${configPath}/hrm-salary-benefits-config.json`,
    JSON.stringify(benefitsConfig, null, 2)
  );
  console.log("✅ 福利补贴标准配置已保存\n");

  // 5. 汇总统计
  console.log("🎉 GRT绩效薪酬体系数据导入完成！");
  console.log("📊 导入统计：");
  console.log(`   - 薪酬结构：${salaryStructures.length} 个部门`);
  console.log(`   - 绩效等级：${performanceGrades.length} 个等级 (S/A/B/C/D)`);
  console.log(`   - 技术岗位：${techPositions.length} 个等级 (T1-T5)`);
  console.log(`   - 福利补贴：${benefitsConfig.benefits.length} 项`);
  console.log(`   - 销售提成：${benefitsConfig.salesCommission.tiers.length} 个阶梯`);
  console.log(`   - 项目奖金：${benefitsConfig.projectBonus.distribution.length} 个部门分配`);
  console.log(`\n📁 配置文件已保存到: ${configPath}/hrm-salary-benefits-config.json`);

  await pool.end();
}

seedSalaryData().catch(console.error);
