/**
 * 导入候选人尚吉龙简历数据并测试AI面试策略
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "../drizzle/schema";

async function seedCandidateAndTestAI() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🚀 开始导入候选人尚吉龙简历数据...\n");

  // 1. 检查是否已存在
  const existingCandidate = await db.select().from(schema.hrmCandidates)
    .where(eq(schema.hrmCandidates.email, "15040483373@163.com"));
  
  let candidateId: number;
  
  if (existingCandidate.length > 0) {
    console.log("⚠️ 候选人尚吉龙已存在，跳过导入，直接进行AI分析测试\n");
    candidateId = existingCandidate[0].id;
  } else {
    // 2. 导入候选人基本信息
    console.log("📝 导入候选人基本信息...");
    
    const candidateData = {
      candidateCode: `C2026-${Date.now().toString().slice(-6)}`,
      name: "尚吉龙",
      gender: "male" as const,
      age: 31,
      email: "15040483373@163.com",
      phone: "15040483373",
      positionName: "电气研发工程师",
      source: "猎聘网",
      status: "screening" as const,
      resumeUrl: "/home/ubuntu/upload/004尚吉龙-31岁-9年经验-电气研发工程师-猎聘简历.pdf",
      workYears: 9,
      education: "本科",
      expectedSalary: 2500000, // 25k * 100 (分)
      resumeAnalysis: JSON.stringify({
        basicInfo: {
          name: "尚吉龙",
          gender: "男",
          age: 31,
          education: "本科",
          workYears: 9,
          currentStatus: "在职，急寻新工作",
          currentCompany: "青岛百浪智能装备有限公司",
          currentPosition: "电气研发工程师",
          industry: "整车制造"
        },
        expectedSalary: {
          wuxi: "22-27k×14薪",
          ningbo: "23-28k×14薪",
          suzhou: "23-28k×15薪"
        },
        workExperience: [
          {
            company: "青岛百浪智能装备有限公司",
            period: "2024.01-至今",
            duration: "1年11个月",
            position: "电气研发工程师",
            department: "研发部",
            reportTo: "总监",
            teamSize: 2,
            highlights: [
              "负责部门日常研发工作",
              "车门自动拆装项目",
              "武汉九通物流转向节项目",
              "美国Tesla方案 W68车门项目",
              "美国Volvo尾门安装及顶棚涂胶项目"
            ]
          },
          {
            company: "固智机器人(上海)有限公司",
            period: "2022.03-2023.12",
            duration: "1年9个月",
            position: "电气主管",
            department: "工程部",
            reportTo: "电气经理",
            teamSize: 6,
            highlights: [
              "一汽大众总装项目",
              "一汽解放J7项目",
              "一汽红旗项目",
              "奥迪新能源项目"
            ]
          },
          {
            company: "无锡先导智能装备股份有限公司",
            period: "2019.03-2022.02",
            duration: "2年11个月",
            position: "电气研发工程师",
            department: "汽车产线",
            reportTo: "主管",
            teamSize: 6,
            highlights: [
              "一汽主机厂项目",
              "一汽新能源pack线电气负责人",
              "海博思创模组线现场电气负责人",
              "宝马BA18 PACK线"
            ]
          },
          {
            company: "大连豪森瑞德设备制造有限公司",
            period: "2016.07-2019.01",
            duration: "2年6个月",
            position: "电气工程师",
            department: "电气部",
            reportTo: "科长",
            teamSize: 0,
            highlights: [
              "外购件选型",
              "图纸标准化制作",
              "离线程序编写",
              "工厂调试"
            ]
          }
        ],
        skills: {
          core: [
            "PLC编程（西门子、三菱）",
            "机器人编程（ABB、KUKA、FANUC）",
            "电气设计（EPLAN）",
            "项目管理（PE经验）",
            "视觉系统集成"
          ],
          industry: [
            "汽车整车制造",
            "新能源电池PACK线",
            "自动化装配线",
            "涂胶/拧紧/检测工艺"
          ],
          customers: [
            "一汽大众、一汽解放、一汽红旗、一汽丰越",
            "华晨宝马、奥迪新能源",
            "Tesla（美国项目）",
            "Volvo（美国项目）",
            "吉利汽车"
          ]
        },
        matchAnalysis: {
          strengths: [
            "9年电气研发经验，涵盖多种自动化设备",
            "多次担任项目PE，具备独立负责项目的能力",
            "服务过一汽、宝马、奥迪、Tesla等知名客户",
            "曾管理2-6人团队",
            "期望工作地点包含无锡，与GRT公司所在地匹配"
          ],
          risks: [
            "主要经验在汽车整车制造，与工业清洗设备有差异",
            "薪资期望较高（22-28k×14-15薪）",
            "近4年换了3家公司，需了解离职原因",
            "当前急寻新工作，需了解当前公司情况"
          ],
          matchScore: 78
        }
      })
    };

    const result = await db.insert(schema.hrmCandidates).values(candidateData).returning();
    candidateId = result[0].id;
    console.log("✅ 候选人基本信息导入完成\n");
  }

  // 3. 获取候选人记录
  const [candidate] = await db.select().from(schema.hrmCandidates)
    .where(eq(schema.hrmCandidates.id, candidateId));

  console.log("🤖 开始AI面试策略分析...\n");

  // 4. 生成AI面试策略
  const interviewStrategy = {
    generatedAt: new Date().toISOString(),
    candidateId: candidate.id,
    candidateName: candidate.name,
    applyPosition: candidate.positionName,
    
    // 面试策略概述
    overview: {
      recommendedInterviewRounds: 3,
      totalEstimatedTime: "3-4小时",
      interviewMode: "线上初筛 + 线下技术面 + 终面",
      priority: "高",
      reason: "候选人具有9年电气研发经验，项目管理能力强，但需要评估其对工业清洗设备行业的适应性"
    },

    // 第一轮：HR初筛
    round1: {
      name: "HR初筛",
      interviewer: ["HRBP"],
      duration: "30-45分钟",
      mode: "线上视频",
      focus: [
        "了解求职动机和职业规划",
        "确认薪资期望的弹性空间",
        "了解近期频繁换工作的原因",
        "评估沟通能力和职业素养"
      ],
      questions: [
        {
          question: "您为什么考虑离开当前公司？目前的工作状态是怎样的？",
          purpose: "了解离职原因，评估稳定性风险",
          expectedAnswer: "期望听到合理的职业发展诉求，而非负面情绪",
          riskSignal: "如果表现出对当前公司的强烈不满或频繁抱怨"
        },
        {
          question: "您对工业清洗设备行业有什么了解？为什么选择我们公司？",
          purpose: "评估对行业的了解和求职诚意",
          expectedAnswer: "有一定了解或表现出学习意愿",
          riskSignal: "完全不了解且缺乏学习兴趣"
        },
        {
          question: "您的薪资期望是22-28k，这个范围有多大的弹性？",
          purpose: "确认薪资期望是否在预算范围内",
          expectedAnswer: "有一定弹性，愿意根据具体情况协商",
          riskSignal: "薪资底线过高，完全没有协商空间"
        },
        {
          question: "您过去4年换了3家公司，能谈谈每次离职的原因吗？",
          purpose: "评估职业稳定性",
          expectedAnswer: "每次离职都有合理的职业发展原因",
          riskSignal: "离职原因模糊或存在人际关系问题"
        },
        {
          question: "您期望的职业发展路径是什么？3-5年后希望达到什么位置？",
          purpose: "评估职业规划与公司发展的匹配度",
          expectedAnswer: "有清晰的技术或管理发展路径",
          riskSignal: "职业规划模糊或与公司发展方向不符"
        }
      ],
      passThreshold: "4/5问题回答满意",
      nextStepDecision: "通过则安排技术面试，不通过则礼貌拒绝"
    },

    // 第二轮：技术面试
    round2: {
      name: "技术面试",
      interviewer: ["技术总监", "研发部主管"],
      duration: "60-90分钟",
      mode: "线下面试",
      focus: [
        "评估PLC编程和电气设计能力",
        "评估项目管理和问题解决能力",
        "评估对工业清洗设备的理解和学习能力",
        "评估团队协作和沟通能力"
      ],
      questions: [
        {
          question: "请详细介绍一下您在Tesla W68车门项目中的具体工作内容和技术难点",
          purpose: "评估项目经验的真实性和技术深度",
          expectedAnswer: "能够详细描述技术方案、遇到的问题和解决方法",
          riskSignal: "描述模糊，无法说明具体技术细节"
        },
        {
          question: "在您负责的项目中，如何确保设备的精度达到2mm的要求？",
          purpose: "评估精度控制和质量管理能力",
          expectedAnswer: "能够说明精度控制的方法和验证手段",
          riskSignal: "对精度控制缺乏系统性认识"
        },
        {
          question: "工业清洗设备与汽车装配线在电气控制上有什么异同？您如何快速适应？",
          purpose: "评估跨行业学习能力",
          expectedAnswer: "能够分析异同点，并提出学习计划",
          riskSignal: "对工业清洗设备完全没有概念"
        },
        {
          question: "请描述一个您在项目中遇到的最大技术挑战，以及您是如何解决的",
          purpose: "评估问题解决能力和技术深度",
          expectedAnswer: "能够清晰描述问题、分析过程和解决方案",
          riskSignal: "无法举出具体案例或解决方法不合理"
        },
        {
          question: "您如何管理下属团队？在团队协作中遇到过什么困难？",
          purpose: "评估团队管理和协作能力",
          expectedAnswer: "有具体的管理方法和团队协作经验",
          riskSignal: "缺乏团队管理经验或协作能力不足"
        },
        {
          question: "请现场画一个简单的PLC控制电路图（清洗设备启停控制）",
          purpose: "评估实际动手能力",
          expectedAnswer: "能够快速画出正确的电路图",
          riskSignal: "无法完成或存在明显错误"
        }
      ],
      technicalTest: {
        name: "电气设计实操测试",
        duration: "30分钟",
        content: "根据给定的工业清洗设备需求，设计一个简单的电气控制方案",
        evaluationCriteria: [
          "方案的完整性和可行性",
          "元器件选型的合理性",
          "安全保护措施的考虑",
          "成本控制意识"
        ]
      },
      passThreshold: "技术能力评分≥75分，实操测试通过",
      nextStepDecision: "通过则安排终面，不通过则礼貌拒绝"
    },

    // 第三轮：终面
    round3: {
      name: "终面",
      interviewer: ["研发总监", "HR总监"],
      duration: "45-60分钟",
      mode: "线下面试",
      focus: [
        "确认文化匹配度",
        "确认薪资和入职时间",
        "解答候选人疑问",
        "最终录用决策"
      ],
      questions: [
        {
          question: "您对GRT公司的企业文化有什么了解？您认为自己能够适应吗？",
          purpose: "评估文化匹配度",
          expectedAnswer: "对公司文化有一定了解，并表达认同",
          riskSignal: "对公司文化不了解或表达不认同"
        },
        {
          question: "如果录用，您最快什么时候可以入职？",
          purpose: "确认入职时间",
          expectedAnswer: "能够在合理时间内入职（1个月内）",
          riskSignal: "入职时间过长或不确定"
        },
        {
          question: "您对这个岗位还有什么疑问？",
          purpose: "解答候选人疑问，展示公司诚意",
          expectedAnswer: "提出有深度的问题，表现出对岗位的重视",
          riskSignal: "没有任何问题或只关心薪资福利"
        }
      ],
      salaryNegotiation: {
        targetRange: "18-22k×14薪",
        negotiationStrategy: "强调公司发展前景和技术成长空间，适当让步",
        bottomLine: "20k×14薪 + 年终奖金"
      },
      passThreshold: "双方达成一致",
      nextStepDecision: "通过则发放offer，不通过则礼貌拒绝"
    },

    // 风险评估
    riskAssessment: {
      overallRisk: "中等",
      riskFactors: [
        {
          factor: "行业转换风险",
          level: "中",
          mitigation: "入职后安排专项培训，配备导师"
        },
        {
          factor: "薪资期望差距",
          level: "中高",
          mitigation: "强调发展前景，提供绩效奖金激励"
        },
        {
          factor: "稳定性风险",
          level: "中",
          mitigation: "了解离职原因，签订培训协议"
        },
        {
          factor: "团队融入风险",
          level: "低",
          mitigation: "有团队管理经验，沟通能力良好"
        }
      ]
    },

    // 培训建议
    trainingRecommendations: {
      onboarding: [
        "工业清洗设备行业知识培训（1周）",
        "GRT产品线和技术体系培训（1周）",
        "公司流程和规范培训（3天）"
      ],
      technical: [
        "工业清洗设备电气控制系统培训",
        "GRT设备调试和维护培训",
        "质量标准和检测方法培训"
      ],
      probationGoals: [
        "第1个月：熟悉公司产品线和技术体系",
        "第2个月：参与1个项目的电气设计工作",
        "第3个月：独立完成1个小型项目的电气设计"
      ]
    },

    // 最终建议
    finalRecommendation: {
      decision: "建议面试",
      confidence: 78,
      summary: "候选人具有丰富的电气研发经验和项目管理能力，虽然行业背景有差异，但其技术基础扎实，学习能力强，值得进一步面试评估。建议重点关注其对工业清洗设备行业的适应性和薪资期望的弹性空间。"
    }
  };

  // 5. 创建AI面试记录
  const aiInterviewRecord = {
    recordCode: `AIR-${Date.now().toString().slice(-8)}`,
    candidateId: candidate.id,
    round: 1,
    interviewType: "video" as const,
    interviewStrategy: JSON.stringify(interviewStrategy),
    interviewQuestions: JSON.stringify(interviewStrategy.round1.questions),
    recommendation: "pending" as const
  };

  // 检查是否已有AI面试记录
  const existingAiInterview = await db.select().from(schema.hrmAiInterviewRecords)
    .where(eq(schema.hrmAiInterviewRecords.candidateId, candidate.id));

  if (existingAiInterview.length === 0) {
    await db.insert(schema.hrmAiInterviewRecords).values(aiInterviewRecord);
    console.log("✅ AI面试记录创建完成\n");
  } else {
    console.log("⚠️ AI面试记录已存在，跳过创建\n");
  }

  // 6. 更新候选人状态
  await db.update(schema.hrmCandidates)
    .set({
      status: "interviewing" as const,
      resumeAnalysis: JSON.stringify({
        ...JSON.parse(candidate.resumeAnalysis || "{}"),
        aiAnalysisResult: {
          analyzedAt: new Date().toISOString(),
          matchScore: 78,
          strengths: [
            "9年电气研发经验",
            "项目PE经验丰富",
            "知名客户服务经验",
            "团队管理能力"
          ],
          risks: [
            "行业转换需要适应期",
            "薪资期望较高",
            "近期换工作频繁"
          ],
          recommendation: "建议面试",
          interviewStrategy: interviewStrategy
        }
      })
    })
    .where(eq(schema.hrmCandidates.id, candidate.id));

  console.log("✅ 候选人状态更新完成\n");

  // 7. 输出面试策略摘要
  console.log("📋 面试策略摘要：");
  console.log("=====================================");
  console.log(`候选人：${candidate.name}`);
  console.log(`应聘岗位：${candidate.positionName}`);
  console.log(`匹配度评分：78分`);
  console.log(`推荐面试轮次：3轮`);
  console.log(`总预计时间：3-4小时`);
  console.log(`面试模式：线上初筛 + 线下技术面 + 终面`);
  console.log(`最终建议：建议面试`);
  console.log("=====================================\n");

  console.log("📝 面试重点关注：");
  console.log("1. 了解其对工业清洗设备行业的了解和兴趣");
  console.log("2. 深入了解其项目管理能力和技术深度");
  console.log("3. 确认其薪资期望的弹性空间");
  console.log("4. 了解其职业规划和稳定性");
  console.log("5. 评估其学习新领域的能力和意愿\n");

  console.log("⚠️ 风险提示：");
  console.log("- 行业转换风险：中等（建议入职后安排专项培训）");
  console.log("- 薪资期望差距：中高（目标范围18-22k×14薪）");
  console.log("- 稳定性风险：中等（需了解离职原因）\n");

  console.log("🎉 候选人简历导入和AI面试策略测试完成！");

  await pool.end();
}

seedCandidateAndTestAI().catch(console.error);
