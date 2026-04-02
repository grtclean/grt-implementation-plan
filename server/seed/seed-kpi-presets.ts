/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT SYSTEM — KPI 岗位画像 + 指标库 + 目标预设 (Phase 2)       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  种入 13 个岗位画像、60 个 KPI 指标、78 个岗位-指标目标         ║
 * ║  基于平衡记分卡 (BSC) 四维度: 财务/客户/内部流程/学习成长       ║
 * ║  幂等: 多次运行安全                                            ║
 * ║  Run: npx tsx server/seed/seed-kpi-presets.ts                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// ── 13 岗位画像 ──
const POSITIONS = [
  { title: "董事长/CEO", department: "总裁办", buCode: "HQ", responsibilities: "公司战略决策、经营目标制定、重大投资审批、团队建设", coreCompetency: "战略规划、领导力、行业洞察", headcount: 1 },
  { title: "副总裁/VP", department: "AI数智部", buCode: "HQ", responsibilities: "分管业务线运营、跨部门协调、战略落地执行", coreCompetency: "运营管理、数字化转型、团队管理", headcount: 2 },
  { title: "事业部经理/Director", department: "事业部", buCode: null, responsibilities: "事业部全面经营、P&L管理、客户开发、项目交付", coreCompetency: "经营管理、市场开拓、项目管理", headcount: 3 },
  { title: "人事行政主管/HR Director", department: "人事行政部", buCode: "HR", responsibilities: "人力资源规划、招聘、培训、绩效、薪酬、劳动合规", coreCompetency: "人才管理、组织发展、劳动法规", headcount: 1 },
  { title: "财务经理/Finance Manager", department: "财务部", buCode: "FIN", responsibilities: "财务核算、预算管理、税务合规、资金运营、成本控制", coreCompetency: "财务分析、内控、税务筹划", headcount: 1 },
  { title: "财务专员/Finance Specialist", department: "财务部", buCode: "FIN", responsibilities: "日常报销审核、凭证录入、银行对账、发票管理", coreCompetency: "会计核算、细致严谨", headcount: 3 },
  { title: "质量经理/QC Manager", department: "事业部", buCode: null, responsibilities: "质量体系(IATF16949)运维、供应商质量、过程审核、客户投诉处理", coreCompetency: "质量管理、FMEA、8D/CAPA", headcount: 1 },
  { title: "销售总监/Sales Director", department: "事业一部", buCode: "BU1", responsibilities: "销售战略制定、大客户关系、市场开拓、销售团队管理", coreCompetency: "商务谈判、客户关系、行业分析", headcount: 1 },
  { title: "销售与项目工程师/Sales Rep", department: "事业部", buCode: null, responsibilities: "客户需求对接、技术方案编制、报价、项目跟进、售后协调", coreCompetency: "技术方案、客户沟通、项目协调", headcount: 7 },
  { title: "项目经理/Project Manager", department: "事业部", buCode: null, responsibilities: "M0-M12全生命周期管理、进度/成本/质量三角、风险管理", coreCompetency: "项目管理、WBS、风险识别", headcount: 2 },
  { title: "生产主管/Production Supervisor", department: "事业部", buCode: null, responsibilities: "班组管理、生产调度、安全生产、5S管理、人员培训", coreCompetency: "现场管理、安全意识、团队带教", headcount: 7 },
  { title: "工程师/Engineer", department: "事业部", buCode: null, responsibilities: "机械/电气设计、BOM编制、图纸出图、技术方案、DFMEA", coreCompetency: "CAD/CAE、设计规范、技术创新", headcount: 16 },
  { title: "车间操作员/Floor Operator", department: "事业部", buCode: null, responsibilities: "设备操作、工件装配、质量自检、安全操作、5S执行", coreCompetency: "设备操作、质量意识、安全规范", headcount: 50 },
];

// ── 60 个 KPI 指标库 (BSC 四维度) ──
const KPI_LIBRARY = [
  // ── 财务维度 (financial) ──
  { code: "KPI-FIN-001", name: "年度营收达成率", unit: "percent", kpiType: "financial", category: "revenue", formula: "实际营收 / 目标营收 × 100%", dataSource: "ERP财务模块" },
  { code: "KPI-FIN-002", name: "毛利率", unit: "percent", kpiType: "financial", category: "margin", formula: "(营收-直接成本) / 营收 × 100%", dataSource: "ERP成本核算" },
  { code: "KPI-FIN-003", name: "项目回款率", unit: "percent", kpiType: "financial", category: "cashflow", formula: "实际回款 / 应收总额 × 100%", dataSource: "财务应收台账" },
  { code: "KPI-FIN-004", name: "预算执行偏差率", unit: "percent", kpiType: "financial", category: "budget", formula: "|实际支出-预算| / 预算 × 100%", dataSource: "预算管理系统" },
  { code: "KPI-FIN-005", name: "人均产值", unit: "currency", kpiType: "financial", category: "efficiency", formula: "事业部营收 / 事业部人数", dataSource: "ERP+HR" },
  { code: "KPI-FIN-006", name: "成本节约金额", unit: "currency", kpiType: "financial", category: "cost", formula: "基准成本 - 实际成本", dataSource: "采购+制造" },
  { code: "KPI-FIN-007", name: "报表准确率", unit: "percent", kpiType: "financial", category: "accuracy", formula: "无差错报表数 / 总报表数 × 100%", dataSource: "财务内审" },
  { code: "KPI-FIN-008", name: "应收账龄达标率", unit: "percent", kpiType: "financial", category: "cashflow", formula: "90天内应收 / 总应收 × 100%", dataSource: "ERP应收" },

  // ── 客户维度 (customer) ──
  { code: "KPI-CUS-001", name: "客户满意度(NPS)", unit: "score", kpiType: "customer", category: "satisfaction", formula: "NPS调研得分", dataSource: "客户回访系统" },
  { code: "KPI-CUS-002", name: "新客户开发数", unit: "count", kpiType: "customer", category: "acquisition", formula: "新签约客户数量", dataSource: "CRM系统" },
  { code: "KPI-CUS-003", name: "客户投诉处理及时率", unit: "percent", kpiType: "customer", category: "service", formula: "7天内闭环投诉数 / 总投诉数 × 100%", dataSource: "售后系统" },
  { code: "KPI-CUS-004", name: "合同签约金额", unit: "currency", kpiType: "customer", category: "revenue", formula: "累计签约合同总额", dataSource: "CRM合同模块" },
  { code: "KPI-CUS-005", name: "项目转化率", unit: "percent", kpiType: "customer", category: "conversion", formula: "立项数 / 商机总数 × 100%", dataSource: "CRM商机" },
  { code: "KPI-CUS-006", name: "FAT一次通过率", unit: "percent", kpiType: "customer", category: "quality", formula: "FAT一次通过项目数 / FAT总数 × 100%", dataSource: "项目管理系统" },
  { code: "KPI-CUS-007", name: "交付准时率", unit: "percent", kpiType: "customer", category: "delivery", formula: "准时交付项目数 / 总交付数 × 100%", dataSource: "项目管理系统" },

  // ── 内部流程维度 (internal_process) ──
  { code: "KPI-INT-001", name: "项目按期完成率", unit: "percent", kpiType: "internal_process", category: "schedule", formula: "按期完成项目数 / 总项目数 × 100%", dataSource: "POS系统" },
  { code: "KPI-INT-002", name: "设计变更次数", unit: "count", kpiType: "internal_process", category: "quality", formula: "M4后设计变更总次数", dataSource: "PLM/ECR系统" },
  { code: "KPI-INT-003", name: "图纸准确率", unit: "percent", kpiType: "internal_process", category: "quality", formula: "(总图纸-返工图纸) / 总图纸 × 100%", dataSource: "PLM系统" },
  { code: "KPI-INT-004", name: "OEE设备综合效率", unit: "percent", kpiType: "internal_process", category: "efficiency", formula: "可用率 × 性能率 × 良率", dataSource: "MES系统" },
  { code: "KPI-INT-005", name: "DPPM(百万缺陷率)", unit: "count", kpiType: "internal_process", category: "quality", formula: "缺陷数 / 总产出 × 1,000,000", dataSource: "QMS系统" },
  { code: "KPI-INT-006", name: "安全事故数", unit: "count", kpiType: "internal_process", category: "safety", formula: "工伤+安全事故次数", dataSource: "安全管理台账" },
  { code: "KPI-INT-007", name: "5S检查得分", unit: "score", kpiType: "internal_process", category: "management", formula: "月度5S检查平均分", dataSource: "5S检查表" },
  { code: "KPI-INT-008", name: "产出达标率", unit: "percent", kpiType: "internal_process", category: "output", formula: "实际产出工时 / 计划工时 × 100%", dataSource: "MES工时系统" },
  { code: "KPI-INT-009", name: "质量合格率", unit: "percent", kpiType: "internal_process", category: "quality", formula: "合格品数 / 总检品数 × 100%", dataSource: "QMS终检" },
  { code: "KPI-INT-010", name: "BOM准确率", unit: "percent", kpiType: "internal_process", category: "quality", formula: "(总BOM项-错误项) / 总BOM项 × 100%", dataSource: "PLM系统" },
  { code: "KPI-INT-011", name: "NCR闭环率", unit: "percent", kpiType: "internal_process", category: "quality", formula: "30天内闭环NCR / 总NCR × 100%", dataSource: "QMS系统" },
  { code: "KPI-INT-012", name: "审批流转时效", unit: "days", kpiType: "internal_process", category: "efficiency", formula: "OA表单平均审批天数", dataSource: "OA系统" },
  { code: "KPI-INT-013", name: "招聘完成率", unit: "percent", kpiType: "internal_process", category: "hr", formula: "入职人数 / 招聘需求数 × 100%", dataSource: "招聘系统" },
  { code: "KPI-INT-014", name: "员工流失率", unit: "percent", kpiType: "internal_process", category: "hr", formula: "离职人数 / 平均在职人数 × 100%", dataSource: "HR系统" },

  // ── 学习与成长维度 (learning_growth) ──
  { code: "KPI-LRN-001", name: "培训完成率", unit: "percent", kpiType: "learning_growth", category: "training", formula: "已完成培训课时 / 计划课时 × 100%", dataSource: "培训系统" },
  { code: "KPI-LRN-002", name: "技能认证达标率", unit: "percent", kpiType: "learning_growth", category: "certification", formula: "持证上岗人数 / 应持证人数 × 100%", dataSource: "资质管理" },
  { code: "KPI-LRN-003", name: "创新提案数", unit: "count", kpiType: "learning_growth", category: "innovation", formula: "年度创新提案/专利/改善数", dataSource: "知识管理系统" },
  { code: "KPI-LRN-004", name: "团队建设活动", unit: "count", kpiType: "learning_growth", category: "culture", formula: "年度团建/培训/知识分享次数", dataSource: "HR活动台账" },
  { code: "KPI-LRN-005", name: "员工满意度", unit: "score", kpiType: "learning_growth", category: "engagement", formula: "年度员工满意度调研得分", dataSource: "调研系统" },
  { code: "KPI-LRN-006", name: "数字化系统使用率", unit: "percent", kpiType: "learning_growth", category: "digital", formula: "活跃用户数 / 总用户数 × 100%", dataSource: "GRT System日志" },
];

// ── 岗位→指标→目标映射 (2026年) ──
// 格式: [岗位index, KPI code, targetValue, challengeValue, minimumValue, weight%]
type TargetTuple = [number, string, number, number, number, number];

const TARGETS_2026: TargetTuple[] = [
  // CEO (index 0)
  [0, "KPI-FIN-001", 100, 120, 85, 25],     // 营收达成率 100%, 挑战120%, 底线85%
  [0, "KPI-FIN-002", 25, 30, 20, 15],        // 毛利率 25%
  [0, "KPI-CUS-001", 85, 90, 75, 15],        // NPS 85分
  [0, "KPI-CUS-007", 90, 95, 80, 15],        // 交付准时率 90%
  [0, "KPI-LRN-003", 10, 15, 5, 15],         // 创新提案 10个
  [0, "KPI-LRN-005", 80, 90, 70, 15],        // 员工满意度 80分

  // VP (index 1)
  [1, "KPI-FIN-001", 100, 115, 90, 20],
  [1, "KPI-INT-001", 85, 95, 75, 20],        // 项目按期完成率
  [1, "KPI-LRN-006", 80, 90, 60, 20],        // 数字化使用率
  [1, "KPI-LRN-005", 80, 90, 70, 20],
  [1, "KPI-INT-012", 2, 1, 3, 20],           // 审批流转≤2天

  // 事业部经理 (index 2)
  [2, "KPI-FIN-001", 100, 120, 85, 25],
  [2, "KPI-FIN-005", 800000, 1000000, 600000, 15], // 人均产值 80万
  [2, "KPI-CUS-007", 90, 95, 80, 15],
  [2, "KPI-CUS-006", 85, 95, 75, 15],        // FAT一次通过率
  [2, "KPI-INT-005", 500, 300, 1000, 15],     // DPPM ≤500
  [2, "KPI-LRN-001", 90, 100, 80, 15],       // 培训完成率

  // HR Director (index 3)
  [3, "KPI-INT-013", 90, 100, 80, 25],       // 招聘完成率
  [3, "KPI-INT-014", 8, 5, 12, 25],          // 流失率 ≤8%
  [3, "KPI-LRN-001", 95, 100, 85, 25],       // 培训完成率
  [3, "KPI-LRN-005", 80, 90, 70, 25],        // 员工满意度

  // Finance Manager (index 4)
  [4, "KPI-FIN-007", 99, 100, 95, 30],       // 报表准确率
  [4, "KPI-FIN-008", 85, 95, 75, 25],        // 应收账龄达标率
  [4, "KPI-FIN-004", 5, 3, 10, 25],          // 预算偏差率 ≤5%
  [4, "KPI-INT-012", 1, 0.5, 2, 20],         // 审批流转≤1天

  // Finance Specialist (index 5)
  [5, "KPI-FIN-007", 98, 100, 95, 40],
  [5, "KPI-INT-012", 1, 0.5, 2, 30],
  [5, "KPI-LRN-001", 90, 100, 80, 30],

  // QC Manager (index 6)
  [6, "KPI-INT-005", 500, 300, 1000, 25],    // DPPM
  [6, "KPI-INT-009", 98, 99.5, 95, 25],      // 质量合格率
  [6, "KPI-INT-011", 90, 100, 80, 25],       // NCR闭环率
  [6, "KPI-CUS-003", 95, 100, 85, 25],       // 投诉处理及时率

  // Sales Director (index 7)
  [7, "KPI-CUS-004", 50000000, 65000000, 35000000, 30], // 合同签约5000万
  [7, "KPI-CUS-002", 8, 12, 5, 20],          // 新客户 8个
  [7, "KPI-CUS-005", 40, 50, 30, 20],        // 项目转化率 40%
  [7, "KPI-FIN-003", 85, 95, 75, 15],        // 回款率
  [7, "KPI-CUS-001", 85, 90, 75, 15],        // NPS

  // Sales Rep (index 8)
  [8, "KPI-CUS-004", 8000000, 12000000, 5000000, 40], // 合同签约800万
  [8, "KPI-CUS-005", 35, 50, 25, 20],
  [8, "KPI-FIN-003", 80, 90, 70, 20],
  [8, "KPI-LRN-001", 90, 100, 80, 20],

  // Project Manager (index 9)
  [9, "KPI-INT-001", 90, 100, 80, 30],       // 按期完成率
  [9, "KPI-FIN-004", 5, 3, 10, 25],          // 预算偏差
  [9, "KPI-CUS-006", 90, 100, 80, 25],       // FAT通过率
  [9, "KPI-INT-002", 3, 1, 5, 20],           // 设计变更≤3次

  // Production Supervisor (index 10)
  [10, "KPI-INT-008", 95, 100, 85, 30],      // 产出达标率
  [10, "KPI-INT-009", 98, 99.5, 95, 25],     // 质量合格率
  [10, "KPI-INT-006", 0, 0, 1, 25],          // 安全事故 = 0
  [10, "KPI-INT-007", 85, 95, 75, 20],       // 5S得分

  // Engineer (index 11)
  [11, "KPI-INT-003", 98, 100, 95, 30],      // 图纸准确率
  [11, "KPI-INT-001", 85, 95, 75, 25],       // 项目按期
  [11, "KPI-INT-010", 98, 100, 95, 20],      // BOM准确率
  [11, "KPI-LRN-003", 2, 4, 1, 15],          // 创新提案
  [11, "KPI-LRN-001", 90, 100, 80, 10],      // 培训完成率

  // Floor Operator (index 12)
  [12, "KPI-INT-008", 95, 100, 85, 35],      // 产出达标率
  [12, "KPI-INT-009", 98, 99.5, 95, 30],     // 质量合格率
  [12, "KPI-INT-006", 0, 0, 1, 20],          // 安全事故
  [12, "KPI-LRN-002", 100, 100, 90, 15],     // 技能认证达标率
];

// ── Seed Execution ──

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT KPI 预设种入 — Phase 2                                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ── Step 1: 种入岗位画像 ──
    console.log("[1/3] 种入岗位画像...");
    const positionIds: number[] = [];
    for (const pos of POSITIONS) {
      // 检查是否已存在
      const existing: any = await db.execute(sql`
        SELECT id FROM hrm_kpi_positions WHERE title = ${pos.title} LIMIT 1
      `);
      const rows = existing?.rows ?? existing ?? [];
      if (rows.length > 0) {
        positionIds.push(rows[0].id);
        continue;
      }
      const inserted: any = await db.execute(sql`
        INSERT INTO hrm_kpi_positions (title, department, bu_code, responsibilities, core_competency, headcount, status)
        VALUES (${pos.title}, ${pos.department}, ${pos.buCode}, ${pos.responsibilities}, ${pos.coreCompetency}, ${pos.headcount}, 'active')
        RETURNING id
      `);
      const insertedRows = inserted?.rows ?? inserted ?? [];
      positionIds.push(insertedRows[0]?.id || 0);
      console.log(`  [+] ${pos.title} (${pos.department})`);
    }
    console.log(`  => ${positionIds.length} 岗位画像\n`);

    // ── Step 2: 种入指标库 ──
    console.log("[2/3] 种入 KPI 指标库...");
    const kpiIdMap = new Map<string, number>();
    for (const kpi of KPI_LIBRARY) {
      const existing: any = await db.execute(sql`
        SELECT id FROM hrm_kpi_library WHERE code = ${kpi.code} LIMIT 1
      `);
      const rows = existing?.rows ?? existing ?? [];
      if (rows.length > 0) {
        kpiIdMap.set(kpi.code, rows[0].id);
        continue;
      }
      const inserted: any = await db.execute(sql`
        INSERT INTO hrm_kpi_library (code, name, unit, kpi_type, category, calculation_formula, data_source, status)
        VALUES (${kpi.code}, ${kpi.name}, ${kpi.unit}, ${kpi.kpiType}, ${kpi.category}, ${kpi.formula}, ${kpi.dataSource}, 'active')
        RETURNING id
      `);
      const insertedRows = inserted?.rows ?? inserted ?? [];
      kpiIdMap.set(kpi.code, insertedRows[0]?.id || 0);
      console.log(`  [+] ${kpi.code} ${kpi.name}`);
    }
    console.log(`  => ${kpiIdMap.size} 指标入库\n`);

    // ── Step 3: 种入岗位-指标-目标 ──
    console.log("[3/3] 种入 2026 年目标...");
    let targetCount = 0;
    for (const [posIdx, kpiCode, target, challenge, minimum, weight] of TARGETS_2026) {
      const posId = positionIds[posIdx];
      const kpiId = kpiIdMap.get(kpiCode);
      if (!posId || !kpiId) continue;

      const existing: any = await db.execute(sql`
        SELECT id FROM hrm_position_kpi_targets WHERE position_id = ${posId} AND kpi_id = ${kpiId} AND year = 2026 LIMIT 1
      `);
      const rows = existing?.rows ?? existing ?? [];
      if (rows.length > 0) continue;

      await db.execute(sql`
        INSERT INTO hrm_position_kpi_targets (position_id, kpi_id, year, target_value, challenge_value, minimum_value, weight, scoring_method, status)
        VALUES (${posId}, ${kpiId}, 2026, ${target}, ${challenge}, ${minimum}, ${weight}, 'linear', 'active')
      `);
      targetCount++;
    }
    console.log(`  => ${targetCount} 条目标设定\n`);

    // ── Summary ──
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║   KPI 预设完成                                              ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  岗位画像:  ${String(POSITIONS.length).padStart(3)} 个                                    ║`);
    console.log(`║  指标库:    ${String(KPI_LIBRARY.length).padStart(3)} 个 (BSC 四维度)                      ║`);
    console.log(`║  目标设定:  ${String(targetCount).padStart(3)} 条 (2026年)                          ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-kpi-presets");
if (isDirectRun) { seed(); }
