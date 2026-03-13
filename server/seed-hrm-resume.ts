/**
 * HRM简历数据导入和AI面试策略种子脚本
 * 基于参考资料中的简历案例（尚吉龙-电气研发工程师）
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedHrmResumeData() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🚀 开始导入HRM简历数据和AI面试策略...\n");

  // 1. 创建岗位：电气研发工程师
  const positionCode = `POS-RD-${Date.now().toString().slice(-6)}`;
  console.log("📋 创建岗位：电气研发工程师...");
  
  await db.insert(schema.hrmPositions).values({
    positionCode: positionCode,
    name: "电气研发工程师",
    department: "技术服务部",
    responsibilities: JSON.stringify([
      {
        title: "设备电气设计",
        weight: 30,
        tasks: [
          "负责清洗设备电气系统设计",
          "电气元器件选型与BOM编制",
          "电气图纸绘制与标准化"
        ]
      },
      {
        title: "PLC程序开发",
        weight: 25,
        tasks: [
          "设备控制程序编写与调试",
          "HMI界面设计与开发",
          "设备联调与优化"
        ]
      },
      {
        title: "项目支持",
        weight: 20,
        tasks: [
          "参与项目前期技术方案制定",
          "客户现场安装调试支持",
          "技术问题解决与文档编写"
        ]
      },
      {
        title: "团队协作",
        weight: 15,
        tasks: [
          "与机械、软件团队协同工作",
          "技术知识分享与培训",
          "新人指导与培养"
        ]
      },
      {
        title: "持续改进",
        weight: 10,
        tasks: [
          "电气设计标准化推进",
          "新技术研究与应用",
          "设备效率与可靠性提升"
        ]
      }
    ]),
    kpiIndicators: JSON.stringify([
      { name: "项目交付及时率", weight: 25, target: "≥95%", period: "季度" },
      { name: "设备调试一次通过率", weight: 20, target: "≥90%", period: "季度" },
      { name: "技术文档完整率", weight: 15, target: "100%", period: "月度" },
      { name: "客户满意度", weight: 15, target: "≥4.5/5", period: "季度" },
      { name: "问题响应时效", weight: 10, target: "≤4小时", period: "月度" },
      { name: "知识分享次数", weight: 10, target: "≥2次/月", period: "月度" },
      { name: "创新改进提案", weight: 5, target: "≥1项/季度", period: "季度" }
    ]),
    qualifications: JSON.stringify([
      "PLC编程（西门子/三菱/欧姆龙）",
      "电气设计（CAD/EPLAN）",
      "机器人编程（ABB/KUKA/FANUC）",
      "HMI界面设计",
      "工业通讯协议（Profinet/EtherCAT）"
    ]),
    status: "active"
  });
  console.log("✅ 岗位创建成功\n");

  // 2. 创建候选人：尚吉龙
  const candidateCode = `CAN-${Date.now().toString().slice(-8)}`;
  console.log("👤 创建候选人：尚吉龙...");
  
  await db.insert(schema.hrmCandidates).values({
    candidateCode: candidateCode,
    name: "尚吉龙",
    gender: "male",
    age: 31,
    phone: "138****1234",
    email: "shangjl@example.com",
    education: "本科",
    workYears: 9,
    positionName: "电气研发工程师",
    expectedSalary: 2500000, // 25000元，单位分
    resumeUrl: "/uploads/resumes/004尚吉龙-31岁-9年经验-电气研发工程师-猎聘简历.pdf",
    source: "猎聘",
    resumeAnalysis: JSON.stringify({
      workExperience: [
        {
          company: "青岛百浪智能装备有限公司",
          position: "电气研发工程师",
          period: "2024.01-至今",
          teamSize: 2,
          highlights: ["Tesla W68 GA line项目", "武汉九通物流转向节项目"]
        },
        {
          company: "固智机器人(上海)有限公司",
          position: "电气主管",
          period: "2022.03-2023.12",
          teamSize: 6,
          highlights: ["奥迪PPE项目", "团队管理经验"]
        },
        {
          company: "无锡先导智能装备股份有限公司",
          position: "电气研发工程师",
          period: "2019.03-2022.02",
          teamSize: 6,
          highlights: ["新能源电池设备", "大型项目经验"]
        },
        {
          company: "大连豪森瑞德设备制造有限公司",
          position: "电气工程师",
          period: "2016.07-2019.01",
          teamSize: 0,
          highlights: ["入门级经验积累"]
        }
      ],
      projectExperience: [
        {
          name: "Tesla W68 GA line",
          period: "2024.11-至今",
          role: "项目PE",
          description: "美国Tesla项目，负责总装左右车门线，整线自动化率75%"
        },
        {
          name: "武汉九通物流转向节项目",
          period: "2024.03-2024.11",
          role: "项目PE",
          description: "转向节零部件装配线，最终用户为丰田"
        },
        {
          name: "车门自动拆装项目",
          period: "2024.01-2024.10",
          role: "研发负责人",
          description: "公司内部研发样机，使用两台带七轴机器人"
        },
        {
          name: "奥迪PPE项目",
          period: "2022.12-2023.12",
          role: "电气PE",
          description: "PGD自动涂胶设备及前后风挡自动涂胶设备"
        }
      ],
      skillAssessment: {
        plcProgramming: 4,
        robotProgramming: 4,
        electricalDesign: 4,
        projectManagement: 3,
        teamManagement: 3
      }
    }),
    status: "interviewing"
  });
  console.log("✅ 候选人创建成功\n");

  // 3. 创建AI面试记录（包含面试策略）
  console.log("🤖 生成AI面试策略...");
  
  const recordCode = `AIR-${Date.now().toString().slice(-8)}`;
  await db.insert(schema.hrmAiInterviewRecords).values({
    recordCode: recordCode,
    candidateId: 1, // 候选人ID
    positionId: 1, // 岗位ID
    interviewStrategy: JSON.stringify({
      overview: {
        candidateName: "尚吉龙",
        position: "电气研发工程师",
        matchScore: 85,
        recommendation: "建议进入技术面试环节"
      },
      interviewFocus: [
        {
          area: "技术深度验证",
          priority: "高",
          questions: [
            "请详细描述Tesla W68项目中PLC程序的架构设计",
            "在机器人编程中遇到的最大挑战是什么？如何解决的？",
            "请说明您在电气设计中如何确保系统可靠性"
          ],
          evaluationCriteria: "考察PLC编程能力、机器人集成经验、系统设计思维"
        },
        {
          area: "项目管理能力",
          priority: "中",
          questions: [
            "Tesla项目中您如何协调团队完成紧急任务？",
            "遇到项目延期风险时，您通常如何处理？",
            "请分享一个您成功解决的跨部门协作问题"
          ],
          evaluationCriteria: "考察项目管理经验、问题解决能力、沟通协调能力"
        },
        {
          area: "团队协作",
          priority: "中",
          questions: [
            "在6人团队中，您的领导风格是什么？",
            "如何培养和指导新人？",
            "团队成员有分歧时，您如何处理？"
          ],
          evaluationCriteria: "考察团队管理能力、领导力、冲突解决能力"
        },
        {
          area: "行业匹配度",
          priority: "中",
          questions: [
            "您对工业清洗设备行业有什么了解？",
            "汽车自动化经验如何迁移到清洗设备领域？",
            "您认为清洗设备的电气系统有什么特殊要求？"
          ],
          evaluationCriteria: "评估汽车行业经验与工业清洗设备的迁移性"
        },
        {
          area: "稳定性评估",
          priority: "高",
          questions: [
            "近3年换工作2次的原因是什么？",
            "您选择下一份工作最看重什么？",
            "对于长期职业发展，您有什么规划？"
          ],
          evaluationCriteria: "评估职业稳定性、求职动机、长期发展意愿"
        }
      ],
      riskAssessment: [
        {
          type: "稳定性风险",
          level: "中",
          description: "近3年换工作2次，平均每份工作1.5年",
          mitigation: "面试中深入了解离职原因，评估其对GRT的长期承诺"
        },
        {
          type: "行业匹配风险",
          level: "低",
          description: "主要经验在汽车自动化，需评估清洗设备适应性",
          mitigation: "技术面试中考察其学习能力和技术迁移能力"
        },
        {
          type: "薪资期望风险",
          level: "中",
          description: "期望薪资22-28k×14薪，需确认公司薪资范围",
          mitigation: "提前与HR确认薪资预算，准备谈判策略"
        }
      ],
      offerRecommendation: {
        suggestedLevel: "T3",
        suggestedSalary: {
          base: 14000,
          techAllowance: 2000,
          total: 16000
        },
        probationPeriod: 6,
        keyResponsibilities: [
          "负责清洗设备电气系统设计与开发",
          "参与重点项目的技术方案制定",
          "指导初级工程师，推动技术标准化"
        ],
        trainingPlan: [
          "第1周：公司文化与产品培训",
          "第2-4周：清洗设备技术培训",
          "第5-8周：项目实战跟进",
          "第9-12周：独立负责小型项目"
        ]
      }
    }),
    overallScore: 85,
    recommendation: "hire"
  });
  console.log("✅ AI面试策略生成成功\n");

  // 4. 创建第二个AI面试记录（计划中的面试）
  console.log("📝 创建面试记录...");
  
  const recordCode2 = `AIR-${Date.now().toString().slice(-8)}-2`;
  await db.insert(schema.hrmAiInterviewRecords).values({
    recordCode: recordCode2,
    candidateId: 1,
    positionId: 1,
    round: 1,
    interviewType: "onsite",
    interviewStrategy: JSON.stringify({
      focusAreas: ["PLC编程能力", "机器人集成经验", "项目管理能力"],
      keyQuestions: [
        "请详细描述Tesla W68项目中PLC程序的架构设计",
        "在机器人编程中遇到的最大挑战是什么？",
        "近3年换工作2次的原因是什么？"
      ],
      warningPoints: ["稳定性需重点关注", "薪资期望较高"]
    }),
    recommendation: "pending"
  });
  console.log("✅ 面试记录创建成功\n");

  // 5. 创建述职提醒配置（假设候选人入职）
  console.log("⏰ 创建述职提醒配置...");
  
  // 假设入职日期为2026年2月1日
  const hireDate = new Date("2026-02-01");
  const threeMonthReview = new Date(hireDate);
  threeMonthReview.setMonth(threeMonthReview.getMonth() + 3);
  // 调整到提前一周的周二下午2点
  const threeMonthReminder = new Date(threeMonthReview);
  threeMonthReminder.setDate(threeMonthReminder.getDate() - 7);
  // 找到周二
  while (threeMonthReminder.getDay() !== 2) {
    threeMonthReminder.setDate(threeMonthReminder.getDate() + 1);
  }
  threeMonthReminder.setHours(14, 0, 0, 0);

  const sixMonthReview = new Date(hireDate);
  sixMonthReview.setMonth(sixMonthReview.getMonth() + 6);
  const sixMonthReminder = new Date(sixMonthReview);
  sixMonthReminder.setDate(sixMonthReminder.getDate() - 7);
  while (sixMonthReminder.getDay() !== 2) {
    sixMonthReminder.setDate(sixMonthReminder.getDate() + 1);
  }
  sixMonthReminder.setHours(14, 0, 0, 0);

  // 3个月述职提醒
  await db.insert(schema.hrmPerformanceReviewReminders).values({
    employeeId: 1, // 假设员工ID
    reviewType: "3M",
    reviewDate: threeMonthReview.toISOString().slice(0, 19).replace('T', ' '),
    reminderDateTime: threeMonthReminder.toISOString().slice(0, 19).replace('T', ' '),
    recipients: JSON.stringify([
      "employee@gerrytech.com",
      "supervisor@gerrytech.com",
      "supervisor_manager@gerrytech.com",
      "hrbp@gerrytech.com",
      "camillia@gerrytech.com",
      "gerry@grtclean.ai"
    ]),
    emailSubject: "[述职提醒] 尚吉龙 3个月试用期述职报告 - 2026年5月1日",
    emailContent: JSON.stringify({
      template: "performance_review_reminder",
      variables: {
        employeeName: "尚吉龙",
        reviewType: "3个月",
        reviewDate: "2026年5月1日",
        department: "技术服务部",
        position: "电气研发工程师",
        hireDate: "2026年2月1日",
        supervisor: "沈豪"
      }
    }),
    status: "pending"
  });

  // 6个月述职提醒
  await db.insert(schema.hrmPerformanceReviewReminders).values({
    employeeId: 1,
    reviewType: "6M",
    reviewDate: sixMonthReview.toISOString().slice(0, 19).replace('T', ' '),
    reminderDateTime: sixMonthReminder.toISOString().slice(0, 19).replace('T', ' '),
    recipients: JSON.stringify([
      "employee@gerrytech.com",
      "supervisor@gerrytech.com",
      "supervisor_manager@gerrytech.com",
      "hrbp@gerrytech.com",
      "camillia@gerrytech.com",
      "gerry@grtclean.ai"
    ]),
    emailSubject: "[述职提醒] 尚吉龙 6个月试用期述职报告 - 2026年8月1日",
    emailContent: JSON.stringify({
      template: "performance_review_reminder",
      variables: {
        employeeName: "尚吉龙",
        reviewType: "6个月",
        reviewDate: "2026年8月1日",
        department: "技术服务部",
        position: "电气研发工程师",
        hireDate: "2026年2月1日",
        supervisor: "沈豪"
      }
    }),
    status: "pending"
  });
  console.log("✅ 述职提醒配置创建成功\n");

  // 6. 创建入职培训计划
  console.log("📚 创建入职培训计划...");
  
  await db.insert(schema.hrmTrainingPlans).values({
    planCode: `TP-${Date.now().toString().slice(-8)}`,
    employeeId: 1,
    name: "电气研发工程师入职培训计划",
    planType: "onboarding",
    startDate: "2026-02-01 00:00:00",
    endDate: "2026-04-30 00:00:00",
    content: JSON.stringify({
      phases: [
        {
          name: "第一阶段：公司文化与产品培训",
          duration: "第1周",
          items: [
            { topic: "公司历史与文化", duration: "2小时", trainer: "HR" },
            { topic: "产品线介绍", duration: "4小时", trainer: "销售部" },
            { topic: "质量管理体系", duration: "2小时", trainer: "品管部" },
            { topic: "安全生产培训", duration: "2小时", trainer: "生产部" }
          ]
        },
        {
          name: "第二阶段：清洗设备技术培训",
          duration: "第2-4周",
          items: [
            { topic: "超声波清洗原理", duration: "4小时", trainer: "技术总监" },
            { topic: "喷淋清洗系统", duration: "4小时", trainer: "高级工程师" },
            { topic: "电气控制系统架构", duration: "8小时", trainer: "电气主管" },
            { topic: "PLC程序标准化", duration: "8小时", trainer: "电气主管" },
            { topic: "HMI界面规范", duration: "4小时", trainer: "软件工程师" }
          ]
        },
        {
          name: "第三阶段：项目实战跟进",
          duration: "第5-8周",
          items: [
            { topic: "跟进在制项目", duration: "持续", trainer: "项目经理" },
            { topic: "参与设计评审", duration: "按需", trainer: "技术总监" },
            { topic: "现场调试学习", duration: "1周", trainer: "现场工程师" }
          ]
        },
        {
          name: "第四阶段：独立负责项目",
          duration: "第9-12周",
          items: [
            { topic: "独立负责小型项目电气设计", duration: "持续", trainer: "技术总监" },
            { topic: "编写技术文档", duration: "按需", trainer: "自主" },
            { topic: "参与客户技术交流", duration: "按需", trainer: "销售部" }
          ]
        }
      ],
      assessments: [
        { name: "产品知识测试", date: "第2周末", passingScore: 80 },
        { name: "电气设计规范测试", date: "第4周末", passingScore: 85 },
        { name: "PLC编程实操考核", date: "第8周末", passingScore: 80 },
        { name: "项目汇报评审", date: "第12周末", passingScore: 75 }
      ]
    }),
    status: "pending"
  });
  console.log("✅ 入职培训计划创建成功\n");

  await pool.end();
  console.log("🎉 HRM简历数据和AI面试策略导入完成！");
  console.log("\n📊 导入统计：");
  console.log("   - 岗位：1个（电气研发工程师）");
  console.log("   - 候选人：1个（尚吉龙）");
  console.log("   - AI面试策略：1个");
  console.log("   - 面试记录：1个");
  console.log("   - 述职提醒：2个（3个月/6个月）");
  console.log("   - 培训计划：1个");
}

seedHrmResumeData().catch(console.error);
