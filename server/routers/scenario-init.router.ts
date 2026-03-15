/**
 * Scenario Init Router — Seeds realistic business data into 13 sandboxes.
 *
 * 3 batch launchers (Batch 1: 5, Batch 2: 5, Batch 3: 3) + 13 individual inits + getStatus.
 * Each init is idempotent — checks for existing seed data before inserting.
 */
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { eventBus, SANDBOX_EVENTS } from "../events/event-bus";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("scenario-init");

// ── Helper: Check if seed data exists for a sandbox ────────
async function hasSeedData(db: any, sandboxId: string): Promise<boolean> {
  try {
    const { sandboxEventLog } = await import("../../drizzle/sandbox-event-schema");
    const { and, like } = await import("drizzle-orm");
    const rows = await db
      .select({ id: sandboxEventLog.id })
      .from(sandboxEventLog)
      .where(
        and(
          like(sandboxEventLog.eventType, `scenario.init.${sandboxId}`)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ── Helper: Mark sandbox as initialized via event ──────────
async function markInitialized(sandboxId: string, userId: number, details: Record<string, unknown>) {
  await eventBus.publish({
    type: `scenario.init.${sandboxId}`,
    sourceModule: sandboxId,
    targetModules: [],
    payload: { action: "scenario_initialized", ...details },
    userId,
    timestamp: new Date(),
  });
}

// ══════════════════════════════════════════════════════════════
// Individual Init Procedures
// ══════════════════════════════════════════════════════════════

/** Starter 1: ⑤ Project M0-M12 — uses `projects` + `projectGates` from schema.ts */
async function initProjectLifecycle(db: any, userId: number) {
  if (await hasSeedData(db, "project-lifecycle")) return { skipped: true };
  const { projects, projectGates } = await import("../../drizzle/schema");

  const projectData = [
    { code: "GRT-SB-001", name: "新能源电池包产线", phase: "M0", status: "active" as const },
    { code: "GRT-SB-002", name: "半导体封装测试设备", phase: "M3", status: "active" as const },
    { code: "GRT-SB-003", name: "商用车底盘焊接线", phase: "M6", status: "active" as const },
  ];

  const projectIds: number[] = [];
  for (const p of projectData) {
    const [row] = await db
      .insert(projects)
      .values({
        projectCode: p.code,
        name: p.name,
        currentPhase: p.phase,
        status: p.status,
        buCode: "overseas",
        managerId: userId,
        plannedStartDate: new Date("2026-01-15").toISOString(),
        plannedEndDate: new Date("2027-06-30").toISOString(),
      })
      .returning();
    projectIds.push(row.id);
  }

  // Seed gate records for projects past M0
  const gateRecords = [
    { projectId: projectIds[1], phase: "M0", gate: "M0 立项评审", status: "approved" as const, date: "2025-10-01" },
    { projectId: projectIds[1], phase: "M1", gate: "M1 计划评审", status: "approved" as const, date: "2025-12-15" },
    { projectId: projectIds[1], phase: "M3", gate: "M3 设计评审", status: "approved" as const, date: "2026-02-01" },
    { projectId: projectIds[2], phase: "M0", gate: "M0 立项评审", status: "approved" as const, date: "2025-06-01" },
    { projectId: projectIds[2], phase: "M1", gate: "M1 计划评审", status: "approved" as const, date: "2025-08-15" },
    { projectId: projectIds[2], phase: "M3", gate: "M3 设计评审", status: "approved" as const, date: "2025-11-01" },
    { projectId: projectIds[2], phase: "M6", gate: "M6 样机验证", status: "approved" as const, date: "2026-02-20" },
  ];

  for (const g of gateRecords) {
    await db.insert(projectGates).values({
      projectId: g.projectId,
      phaseCode: g.phase,
      name: g.gate,
      status: g.status,
      actualDate: new Date(g.date).toISOString(),
      approverId: userId,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.PROJECT_GATE_PASSED,
    sourceModule: "project-lifecycle",
    targetModules: ["production-scheduling", "quoting-bom"],
    payload: { projectCodes: projectData.map((p) => p.code), projectIds },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("project-lifecycle", userId, { projectIds, count: projectData.length });
  return { skipped: false, projectIds };
}

/** Starter 2: ④ HR Lifecycle — uses `workLogs` as closest HR table proxy */
async function initHrLifecycle(db: any, userId: number) {
  if (await hasSeedData(db, "hr-lifecycle")) return { skipped: true };
  // No dedicated hrWorkflows table exists; seed via event log to record HR scenarios
  // The HR lifecycle sandbox page handles workflows in-memory / via its own UI state

  await eventBus.publish({
    type: SANDBOX_EVENTS.HR_EMPLOYEE_ONBOARDED,
    sourceModule: "hr-lifecycle",
    targetModules: ["payroll-attendance", "performance-points"],
    payload: {
      scenarios: [
        { type: "onboarding", employeeName: "张新入", position: "结构工程师", department: "研发部" },
        { type: "probation_review", employeeName: "李试用", position: "电气工程师", department: "技术部" },
        { type: "department_transfer", employeeName: "王调岗", position: "项目经理", fromDept: "项目部", toDept: "海外事业部" },
      ],
    },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("hr-lifecycle", userId, { count: 3 });
  return { skipped: false };
}

/** Starter 3: ⑫ Production Scheduling — uses `schedulingBomWorkHours` + `workLogs` */
async function initProductionScheduling(db: any, userId: number, projectId?: number) {
  if (await hasSeedData(db, "production-scheduling")) return { skipped: true };
  const { schedulingBomWorkHours } = await import("../../drizzle/smart-scheduling-schema");
  const { workLogs } = await import("../../drizzle/schema");

  const processCodes = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
  const processNames = ["切割", "折弯", "焊接", "机加工", "装配", "电气接线", "调试", "检验"];
  const refProjectId = projectId ?? 1;

  for (const [i, code] of processCodes.entries()) {
    await db.insert(schedulingBomWorkHours).values({
      projectId: refProjectId,
      processCode: code,
      assemblyDescription: processNames[i],
      baseTheoryMinutes: (40 + i * 8) * 60, // convert hours to minutes
      workerCount: 2 + Math.floor(i / 3),
    });
  }

  // Seed work logs
  const logEntries = [
    { code: "SB-LOG-001", task: 1, worker: 10, type: "manual" as const, hours: 8, date: "2026-03-10T08:00:00" },
    { code: "SB-LOG-002", task: 1, worker: 10, type: "manual" as const, hours: 7.5, date: "2026-03-10T08:00:00" },
    { code: "SB-LOG-003", task: 1, worker: 11, type: "manual" as const, hours: 8, date: "2026-03-10T08:00:00" },
    { code: "SB-LOG-004", task: 1, worker: 12, type: "manual" as const, hours: 8, date: "2026-03-11T08:00:00" },
    { code: "SB-LOG-005", task: 1, worker: 11, type: "manual" as const, hours: 6, date: "2026-03-11T08:00:00" },
  ];

  for (const entry of logEntries) {
    await db.insert(workLogs).values({
      logCode: entry.code,
      taskId: entry.task,
      workerId: entry.worker,
      logType: entry.type,
      logTime: new Date(entry.date),
      duration: String(entry.hours),
      projectId: refProjectId,
      laborCategory: "mechanical_design",
      approvalStatus: "pending",
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.SCHEDULING_PLAN_PUBLISHED,
    sourceModule: "production-scheduling",
    targetModules: ["ai-process-twin", "cost-labor"],
    payload: { projectId: refProjectId, processCount: processCodes.length },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("production-scheduling", userId, { processCount: processCodes.length, logCount: logEntries.length });
  return { skipped: false };
}

/** Starter 4: ③ Performance Points — uses `psPerfReview` + `psPerfEvidence` */
async function initPerformancePoints(db: any, userId: number) {
  if (await hasSeedData(db, "performance-points")) return { skipped: true };
  const { psPerfReview, psPerfEvidence } = await import("../../drizzle/perf-evidence-schema");

  const departments = ["研发部", "技术部", "项目部"];
  const reviewIds: number[] = [];
  const employeeNames = [
    "赵一", "钱二", "孙三", "李四", "周五", "吴六", "郑七", "王八", "冯九", "陈十",
  ];

  let empIdx = 0;
  for (let dept = 0; dept < departments.length; dept++) {
    const count = 3 + dept; // 3, 4, 5
    for (let emp = 0; emp < count; emp++) {
      const name = employeeNames[empIdx % employeeNames.length];
      empIdx++;
      const [row] = await db.insert(psPerfReview).values({
        cycleId: 1, // reference payroll cycle
        employeeName: name,
        employeeId: dept * 10 + emp + 1,
        department: departments[dept],
        positionCategory: emp % 2 === 0 ? "indirect" : "direct",
        status: "pending_evidence",
      }).returning();
      reviewIds.push(row.id);
    }
  }

  // Seed evidence items
  const evidenceData = [
    { type: "task_timeliness" as const, title: "提出工艺改善方案，良率提升 2%", score: "85" },
    { type: "internal_feedback" as const, title: "跨部门协调项目按时交付", score: "90" },
    { type: "quality_rework" as const, title: "图纸审查遗漏导致返工", score: "40" },
    { type: "external_feedback" as const, title: "客户来信表扬技术支持响应速度", score: "95" },
    { type: "quality_rework" as const, title: "未按规定佩戴防护用品", score: "30" },
    { type: "task_timeliness" as const, title: "优化切割方案节省材料 5%", score: "88" },
  ];

  for (let i = 0; i < 15; i++) {
    const ev = evidenceData[i % evidenceData.length];
    const revId = reviewIds[i % reviewIds.length];
    await db.insert(psPerfEvidence).values({
      cycleId: 1,
      employeeName: employeeNames[i % employeeNames.length],
      evidenceType: ev.type,
      title: ev.title,
      score: ev.score,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.PERF_CALIBRATION_DONE,
    sourceModule: "performance-points",
    targetModules: ["payroll-attendance", "hr-lifecycle"],
    payload: { reviewCount: reviewIds.length, evidenceCount: 15 },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("performance-points", userId, { reviewCount: reviewIds.length });
  return { skipped: false };
}

/** Starter 5: ② Payroll — uses `payrollSandboxCycles` + `psAttendanceInput` + `psAllowanceInput` */
async function initPayrollAttendance(db: any, userId: number) {
  if (await hasSeedData(db, "payroll-attendance")) return { skipped: true };
  const { payrollSandboxCycles, psAttendanceInput, psAllowanceInput } = await import("../../drizzle/payroll-sandbox-schema");

  // Create payroll cycle
  const [cycle] = await db.insert(payrollSandboxCycles).values({
    period: "2026-03",
    name: "2026年3月工资",
    status: "draft",
    workDays: 22,
    createdById: userId,
  }).returning();

  // Seed attendance for 20 employees
  const empNames = [
    "张一", "王二", "李三", "赵四", "刘五", "陈六", "杨七", "黄八", "周九", "吴十",
    "郑十一", "冯十二", "褚十三", "卫十四", "蒋十五", "沈十六", "韩十七", "朱十八", "秦十九", "尤二十",
  ];
  for (let emp = 0; emp < 20; emp++) {
    const hasAnomaly = emp === 6 || emp === 14; // 2 anomalies
    await db.insert(psAttendanceInput).values({
      cycleId: cycle.id,
      employeeName: empNames[emp],
      employeeId: emp + 1,
      department: emp < 7 ? "研发部" : emp < 14 ? "技术部" : "项目部",
      scheduledDays: 22,
      actualAttendance: hasAnomaly ? String(15 + Math.floor(Math.random() * 3)) : "22",
      lateCount: hasAnomaly ? 3 + Math.floor(Math.random() * 5) : 0,
      totalOvertimeHours: String(Math.floor(Math.random() * 20)),
    });
  }

  // Seed allowances for 5 employees
  const allowanceTypes = ["cash_subsidy", "travel_car", "meal", "communication", "housing"] as const;
  for (let i = 0; i < 5; i++) {
    await db.insert(psAllowanceInput).values({
      cycleId: cycle.id,
      employeeName: empNames[i],
      employeeId: i + 1,
      allowanceType: allowanceTypes[i],
      amount: String(300 + i * 200),
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.PAYROLL_CYCLE_CALCULATED,
    sourceModule: "payroll-attendance",
    targetModules: ["performance-points"],
    payload: { period: "2026-03", cycleId: cycle.id, employeeCount: 20 },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("payroll-attendance", userId, { cycleId: cycle.id });
  return { skipped: false };
}

/** Starter 6: ① Annual Planning — uses `annualPlanningConfigs` + `annualPlanningItems` + `annualPlans` */
async function initAnnualPlanning(db: any, userId: number) {
  if (await hasSeedData(db, "annual-planning")) return { skipped: true };
  const { annualPlanningConfigs, annualPlanningItems, annualPlans } = await import("../../drizzle/schema");
  const { count } = await import("drizzle-orm");

  const [existing] = await db.select({ count: count() }).from(annualPlanningConfigs);
  if (Number(existing?.count ?? 0) > 0) {
    await markInitialized("annual-planning", userId, { existing: true });
    return { skipped: true };
  }

  const [config] = await db.insert(annualPlanningConfigs).values({
    year: 2026,
    version: "V1.0",
    versionName: "2026 年度经营计划",
    status: "active",
    effectiveDate: new Date().toISOString(),
    creatorId: userId,
    notes: "Scenario init seed data",
  }).returning();

  // categoryEnum1 = culture/training/meeting/event/other
  const items = [
    { category: "event" as const, name: "Q1 销售目标达成" },
    { category: "event" as const, name: "新产线投产" },
    { category: "training" as const, name: "客诉率降低专项培训" },
    { category: "other" as const, name: "新产品开发" },
    { category: "training" as const, name: "人才梯队建设" },
    { category: "meeting" as const, name: "降本增效专题会议" },
    { category: "culture" as const, name: "安全生产文化建设" },
  ];

  for (const item of items) {
    await db.insert(annualPlanningItems).values({
      configId: config.id,
      category: item.category,
      name: item.name,
      status: "pending",
    });
  }

  await db.insert(annualPlans).values({
    year: 2026,
    name: "2026 海外事业部经营计划",
    status: "draft",
    creatorId: userId,
  });

  await eventBus.publish({
    type: SANDBOX_EVENTS.PLANNING_BUDGET_APPROVED,
    sourceModule: "annual-planning",
    targetModules: ["project-lifecycle", "hr-lifecycle"],
    payload: { year: 2026, itemCount: items.length },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("annual-planning", userId, { configId: config.id, itemCount: items.length });
  return { skipped: false };
}

/** Starter 7: ⑥ Quoting & BOM — uses `historicalQuotations` + `bomItems` */
async function initQuotingBom(db: any, userId: number) {
  if (await hasSeedData(db, "quoting-bom")) return { skipped: true };
  const { historicalQuotations } = await import("../../drizzle/schema");
  const { bomItems } = await import("../../drizzle/bom-schema");

  const quotes = [
    { qId: "QT-SB-001", customer: "美利信科技", model: "焊接工作站", total: "2800000", date: "2026-03-01" },
    { qId: "QT-SB-002", customer: "宁德时代", model: "封装测试线", total: "5200000", date: "2026-03-05" },
  ];

  for (const q of quotes) {
    await db.insert(historicalQuotations).values({
      quotationId: q.qId,
      customerName: q.customer,
      equipmentModel: q.model,
      basePrice: q.total,
      totalCost: String(Number(q.total) * 0.7),
      totalPrice: q.total,
      quotationDate: q.date,
      createdBy: userId,
    });
  }

  // BOM items — note: bomItems requires bomMasterId, materialCode, materialName, quantity
  // We'll emit BOM data via event for the sandbox UI to pick up
  await eventBus.publish({
    type: SANDBOX_EVENTS.BOM_FINALIZED,
    sourceModule: "quoting-bom",
    targetModules: ["production-scheduling", "mechanical-standards"],
    payload: {
      quoteIds: quotes.map(q => q.qId),
      bomTree: [
        { level: 1, partNo: "ASM-001", name: "焊接工作站总成", qty: 1, cost: 180000 },
        { level: 2, partNo: "SUB-001", name: "焊接夹具组", qty: 2, cost: 25000, parent: "ASM-001" },
        { level: 2, partNo: "SUB-002", name: "变位机", qty: 1, cost: 45000, parent: "ASM-001" },
        { level: 3, partNo: "PRT-001", name: "夹爪气缸", qty: 8, cost: 1200, parent: "SUB-001" },
        { level: 3, partNo: "PRT-002", name: "定位销", qty: 16, cost: 80, parent: "SUB-001" },
        { level: 3, partNo: "PRT-003", name: "伺服电机", qty: 2, cost: 8500, parent: "SUB-002" },
        { level: 1, partNo: "ASM-002", name: "电气控制柜", qty: 1, cost: 65000 },
        { level: 2, partNo: "SUB-003", name: "PLC模组", qty: 1, cost: 18000, parent: "ASM-002" },
        { level: 2, partNo: "SUB-004", name: "触摸屏HMI", qty: 1, cost: 6500, parent: "ASM-002" },
        { level: 3, partNo: "PRT-004", name: "I/O模块", qty: 4, cost: 2200, parent: "SUB-003" },
        { level: 3, partNo: "PRT-005", name: "通讯模块", qty: 2, cost: 3500, parent: "SUB-003" },
        { level: 3, partNo: "PRT-006", name: "继电器组", qty: 1, cost: 1800, parent: "ASM-002" },
      ],
    },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("quoting-bom", userId, { quoteCount: quotes.length, bomCount: 12 });
  return { skipped: false };
}

/** Starter 8: ⑨ Customer Config — uses `strategicCustomerProfiles` + `customerBrandAesthetics` + `customerReadingChannels` */
async function initCustomerConfig(db: any, userId: number) {
  if (await hasSeedData(db, "customer-config")) return { skipped: true };
  const { strategicCustomerProfiles, customerBrandAesthetics, customerReadingChannels } = await import("../../drizzle/customer-profile-schema");

  const customers = [
    { custId: "CUST-SB-001", name: "美利信科技", tier: "V0_Strategic_Partner" as const, industry: "压铸/新能源", city: "重庆", contact: "林总", status: "active" as const },
    { custId: "CUST-SB-002", name: "宁德时代", tier: "V1_Key_Account" as const, industry: "动力电池", city: "宁德", contact: "陈经理", status: "active" as const },
    { custId: "CUST-SB-003", name: "比亚迪电子", tier: "V3_Prospect" as const, industry: "消费电子/汽车", city: "深圳", contact: "赵工", status: "draft" as const },
  ];

  const profileIds: number[] = [];
  for (const c of customers) {
    const [row] = await db.insert(strategicCustomerProfiles).values({
      customerId: c.custId,
      companyName: c.name,
      cooperationTier: c.tier,
      industry: c.industry,
      city: c.city,
      primaryContact: c.contact,
      status: c.status,
      createdByUserId: userId,
    }).returning();
    profileIds.push(row.id);
  }

  // Brand aesthetics for V0 customer
  await db.insert(customerBrandAesthetics).values({
    profileId: profileIds[0],
    primaryColorHex: "#0066CC",
    logoUrl: "/assets/meilixin-logo.svg",
    fontPreference: "Source Han Sans",
    designNotes: "蓝白主色调，简洁工业风",
  });

  // Reading channels
  for (const profileId of profileIds) {
    await db.insert(customerReadingChannels).values({
      profileId,
      docCategory: "project_report",
      docCategoryLabel: "项目报告",
      accessLevel: "restricted",
      accessTier: 1,
      isViewable: true,
      isDownloadable: false,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.CUSTOMER_PROFILE_UPDATED,
    sourceModule: "customer-config",
    targetModules: ["quoting-bom", "acceptance-tracking"],
    payload: { profileIds, customerCount: customers.length },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("customer-config", userId, { count: customers.length });
  return { skipped: false };
}

/** Starter 9: ⑦ Mechanical Standards — uses `mechanicalStandards` from mechanical-config-schema */
async function initMechanicalStandards(db: any, userId: number) {
  if (await hasSeedData(db, "mechanical-standards")) return { skipped: true };
  const { mechanicalStandards } = await import("../../drizzle/mechanical-config-schema");

  const configs = [
    { code: "GRT-MS-SB-001", origin: "GRT_INTERNAL" as const, category: "structural_frame" as const, title: "MAG焊接规范", version: "V2.0", status: "active" as const },
    { code: "GRT-MS-SB-002", origin: "ISO" as const, category: "fastener" as const, title: "定位精度标准 ISO 2768-m", version: "V1.0", status: "active" as const },
    { code: "GRT-MS-SB-003", origin: "GRT_INTERNAL" as const, category: "material_selection" as const, title: "结构钢选型 Q235B/Q345B", version: "V1.5", status: "active" as const },
    { code: "GRT-MS-SB-004", origin: "ISO" as const, category: "structural_frame" as const, title: "TIG焊接规范", version: "V1.0", status: "active" as const },
    { code: "GRT-MS-SB-005", origin: "DIN" as const, category: "fastener" as const, title: "轴承安装公差 H7/k6", version: "V1.0", status: "active" as const },
    // 2 deliberate conflicts for conflict-detection SOP step
    { code: "GRT-MS-SB-006", origin: "OEM_CUSTOMER" as const, category: "structural_frame" as const, title: "MAG焊接规范(客户)", version: "V1.0", status: "active" as const },
    { code: "GRT-MS-SB-007", origin: "OEM_CUSTOMER" as const, category: "material_selection" as const, title: "结构钢选型(OEM) S235JR", version: "V1.0", status: "active" as const },
  ];

  for (const c of configs) {
    await db.insert(mechanicalStandards).values({
      code: c.code,
      origin: c.origin,
      category: c.category,
      title: c.title,
      version: c.version,
      status: c.status,
      createdBy: userId,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.MECH_CONFIG_VALIDATED,
    sourceModule: "mechanical-standards",
    targetModules: ["quoting-bom", "production-scheduling"],
    payload: { configCount: configs.length, conflicts: 2 },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("mechanical-standards", userId, { count: configs.length });
  return { skipped: false };
}

/** Starter 10: ⑧ Electrical Standards — uses `electricalStandards` from electrical-standards-schema */
async function initElectricalStandards(db: any, userId: number) {
  if (await hasSeedData(db, "electrical-standards")) return { skipped: true };
  const { electricalStandards } = await import("../../drizzle/electrical-standards-schema");

  const specs = [
    { code: "ES-SB-001", framework: "CE" as const, category: "plc_control" as const, title: "PLC选型标准 S7-1500", version: "V1.0", status: "active" as const },
    { code: "ES-SB-002", framework: "CE" as const, category: "safety_circuit" as const, title: "安全继电器规范 ISO 13849-1", version: "V1.0", status: "active" as const },
    { code: "ES-SB-003", framework: "CE" as const, category: "communication" as const, title: "现场总线标准 PROFINET", version: "V1.0", status: "active" as const },
    { code: "ES-SB-004", framework: "CE" as const, category: "plc_control" as const, title: "IO模块配置 DI-64/DO-32", version: "V1.0", status: "active" as const },
  ];

  for (const s of specs) {
    await db.insert(electricalStandards).values({
      code: s.code,
      framework: s.framework,
      category: s.category,
      title: s.title,
      version: s.version,
      status: s.status,
      createdBy: userId,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.ELEC_CONFIG_VALIDATED,
    sourceModule: "electrical-standards",
    targetModules: ["production-scheduling"],
    payload: { specCount: specs.length },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("electrical-standards", userId, { count: specs.length });
  return { skipped: false };
}

/** Starter 11: ⑩ Acceptance Tracking — uses `mechAcceptanceRecords` */
async function initAcceptanceTracking(db: any, userId: number) {
  if (await hasSeedData(db, "acceptance-tracking")) return { skipped: true };
  const { mechAcceptanceRecords } = await import("../../drizzle/mechanical-config-schema");

  const records = [
    { project: "GRT-SB-002", customer: "宁德时代", phase: "FAT", item: "焊接精度检查", result: "ACCEPTED" as const, score: 92 },
    { project: "GRT-SB-002", customer: "宁德时代", phase: "FAT", item: "电气安全测试", result: "ACCEPTED" as const, score: 95 },
    { project: "GRT-SB-002", customer: "宁德时代", phase: "SAT", item: "现场节拍验证", result: "PENDING" as const, score: null },
    { project: "GRT-SB-003", customer: "商用车客户", phase: "FAT", item: "底盘定位精度", result: "ACCEPTED" as const, score: 88 },
    { project: "GRT-SB-003", customer: "商用车客户", phase: "SAT", item: "产能达成验证", result: "PENDING" as const, score: null },
  ];

  for (const r of records) {
    await db.insert(mechAcceptanceRecords).values({
      projectCode: r.project,
      customerName: r.customer,
      acceptancePhase: r.phase,
      checkItem: r.item,
      category: "structural_frame",
      result: r.result,
      score: r.score,
      inspectorName: "王工",
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.ACCEPTANCE_COMPLETED,
    sourceModule: "acceptance-tracking",
    targetModules: ["site-delivery", "customer-config"],
    payload: { recordCount: records.length, passedFAT: 3 },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("acceptance-tracking", userId, { recordCount: records.length });
  return { skipped: false };
}

/** Starter 12: ⑪ Site Delivery — uses `deliveryExecutions` + `deliveryInstallations` */
async function initSiteDelivery(db: any, userId: number) {
  if (await hasSeedData(db, "site-delivery")) return { skipped: true };
  const { deliveryExecutions, deliveryInstallations } = await import("../../drizzle/schema");

  const [delivery] = await db.insert(deliveryExecutions).values({
    deliveryCode: "DEL-SB-001",
    projectId: 1,
    projectNo: "GRT-SB-001",
    customerName: "美利信科技",
    currentStage: "M8_Installation",
    siteAddress: "重庆市渝北区两路工业园",
    siteContactName: "林总",
    siteContactPhone: "13800138000",
  }).returning();

  // Checklist via installation record
  const checklistItems = [
    "场地平整度确认", "电力容量核查", "压缩空气管路", "网络布线完成", "吊装设备到位",
    "安全围栏安装", "消防设施检查", "地基螺栓预埋", "排水系统确认", "照明系统到位",
    "工具箱配置", "临时仓库划定", "安全培训记录", "保险手续办理", "进场许可证",
  ];

  await db.insert(deliveryInstallations).values({
    deliveryId: delivery.id,
    installationCode: "INST-SB-001",
    leadEngineerName: "张工",
    checklist: JSON.stringify(checklistItems.map((item, i) => ({
      seq: i + 1,
      category: i < 5 ? "基础设施" : i < 10 ? "安全环保" : "行政许可",
      item,
      description: item,
      required: true,
      result: i < 10 ? "PASS" : null,
      completedAt: i < 10 ? "2026-03-20" : null,
    }))),
    checklistCompletedCount: 10,
    checklistTotalCount: 15,
    status: "in_progress",
    createdBy: userId,
  });

  await markInitialized("site-delivery", userId, { deliveryId: delivery.id, checklistTotal: checklistItems.length });
  return { skipped: false };
}

/** Starter 13: ⑬ AI Process Twin — uses `fmeaDocuments` + `fmeaItems` + `sopTemplates` */
async function initAiProcessTwin(db: any, userId: number) {
  if (await hasSeedData(db, "ai-process-twin")) return { skipped: true };
  const { fmeaDocuments, fmeaItems } = await import("../../drizzle/schema");
  const { sopTemplates } = await import("../../drizzle/production-process-schema");

  // Create FMEA document
  const [fmeaDoc] = await db.insert(fmeaDocuments).values({
    fmeaCode: "FMEA-SB-001",
    projectId: 1,
    fmeaType: "PFMEA",
    title: "GRT-SB-001 焊接工艺FMEA",
    scope: "电池包产线焊接工艺",
    processName: "焊接",
    status: "draft",
    createdBy: userId,
  }).returning();

  // FMEA risk items
  const risks = [
    { num: 1, mode: "焊缝气孔", effect: "焊接强度下降", cause: "保护气不足", s: 8, o: 5, d: 4 },
    { num: 2, mode: "焊接变形", effect: "装配尺寸超差", cause: "焊接顺序不当", s: 7, o: 6, d: 5 },
    { num: 3, mode: "螺栓扭矩不达标", effect: "运行中松动", cause: "扭矩扳手未校准", s: 9, o: 3, d: 3 },
    { num: 4, mode: "程序参数错误", effect: "设备异常动作", cause: "版本管理缺失", s: 8, o: 4, d: 6 },
    { num: 5, mode: "切割尺寸超差", effect: "装配困难", cause: "刀具磨损", s: 6, o: 5, d: 3 },
  ];

  for (const r of risks) {
    await db.insert(fmeaItems).values({
      fmeaDocumentId: fmeaDoc.id,
      itemNumber: r.num,
      failureMode: r.mode,
      failureEffect: r.effect,
      failureCause: r.cause,
      severity: r.s,
      occurrence: r.o,
      detection: r.d,
      rpn: r.s * r.o * r.d,
    });
  }

  // SOP templates
  const templates = [
    { code: "SOP-SB-001", title: "MAG焊接操作SOP", process: "T3", version: "V2.1", duration: 120, difficulty: "中级" },
    { code: "SOP-SB-002", title: "机械装配操作SOP", process: "T5", version: "V1.3", duration: 180, difficulty: "高级" },
    { code: "SOP-SB-003", title: "电气调试操作SOP", process: "T7", version: "V1.0", duration: 240, difficulty: "高级" },
  ];

  for (const t of templates) {
    await db.insert(sopTemplates).values({
      code: t.code,
      title: t.title,
      processCode: t.process,
      version: t.version,
      estimatedDurationMinutes: t.duration,
      difficultyLevel: t.difficulty,
      isActive: true,
      createdBy: userId,
    });
  }

  await eventBus.publish({
    type: SANDBOX_EVENTS.SCHEDULING_PLAN_PUBLISHED,
    sourceModule: "ai-process-twin",
    targetModules: ["production-scheduling", "payroll-attendance"],
    payload: { fmeaCount: risks.length, sopCount: templates.length },
    userId,
    timestamp: new Date(),
  });

  await markInitialized("ai-process-twin", userId, { fmeaCount: risks.length, sopCount: templates.length });
  return { skipped: false };
}

// ══════════════════════════════════════════════════════════════
// Router Definition
// ══════════════════════════════════════════════════════════════

const managePerm = requirePermission("system:config:manage");

export const scenarioInitRouter = router({
  /** Get initialization status for all 13 sandboxes */
  getStatus: protectedProcedure.query(async () => {
    try {
      const { requireDb } = await import("../db");
      const { sandboxEventLog } = await import("../../drizzle/sandbox-event-schema");
      const { like } = await import("drizzle-orm");
      const db = await requireDb();

      const rows = await db
        .select({ eventType: sandboxEventLog.eventType })
        .from(sandboxEventLog)
        .where(like(sandboxEventLog.eventType, "scenario.init.%"))
        .limit(20);

      const initialized = rows.map((r) =>
        r.eventType.replace("scenario.init.", "")
      );

      return { initialized: [...new Set(initialized)] };
    } catch {
      return { initialized: [] };
    }
  }),

  /** Launch Batch 1: Project → HR → Production → Performance → Payroll */
  launchBatch1: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    const userId = (ctx as any).userId ?? 1;
    let initialized = 0;
    let skipped = 0;

    log.info("Launching Batch 1: 5 core flow starters");

    const r1 = await initProjectLifecycle(db, userId);
    r1.skipped ? skipped++ : initialized++;

    const r2 = await initHrLifecycle(db, userId);
    r2.skipped ? skipped++ : initialized++;

    const projectId = (r1 as any).projectIds?.[0];
    const r3 = await initProductionScheduling(db, userId, projectId);
    r3.skipped ? skipped++ : initialized++;

    const r4 = await initPerformancePoints(db, userId);
    r4.skipped ? skipped++ : initialized++;

    const r5 = await initPayrollAttendance(db, userId);
    r5.skipped ? skipped++ : initialized++;

    log.info({ initialized, skipped }, "Batch 1 complete");
    return { initialized, skipped };
  }),

  /** Launch Batch 2: Annual Planning → Quoting → Customer → Mechanical → Electrical */
  launchBatch2: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    const userId = (ctx as any).userId ?? 1;
    let initialized = 0;
    let skipped = 0;

    log.info("Launching Batch 2: 5 strategy config starters");

    const r1 = await initAnnualPlanning(db, userId);
    r1.skipped ? skipped++ : initialized++;

    const r2 = await initQuotingBom(db, userId);
    r2.skipped ? skipped++ : initialized++;

    const r3 = await initCustomerConfig(db, userId);
    r3.skipped ? skipped++ : initialized++;

    const r4 = await initMechanicalStandards(db, userId);
    r4.skipped ? skipped++ : initialized++;

    const r5 = await initElectricalStandards(db, userId);
    r5.skipped ? skipped++ : initialized++;

    log.info({ initialized, skipped }, "Batch 2 complete");
    return { initialized, skipped };
  }),

  /** Launch Batch 3: Acceptance → Site Delivery → AI Process Twin */
  launchBatch3: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    const userId = (ctx as any).userId ?? 1;
    let initialized = 0;
    let skipped = 0;

    log.info("Launching Batch 3: 3 delivery loop starters");

    const r1 = await initAcceptanceTracking(db, userId);
    r1.skipped ? skipped++ : initialized++;

    const r2 = await initSiteDelivery(db, userId);
    r2.skipped ? skipped++ : initialized++;

    const r3 = await initAiProcessTwin(db, userId);
    r3.skipped ? skipped++ : initialized++;

    log.info({ initialized, skipped }, "Batch 3 complete");
    return { initialized, skipped };
  }),

  // ── Individual inits (for selective re-initialization) ──
  initProjectLifecycle: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initProjectLifecycle(db, (ctx as any).userId ?? 1);
  }),
  initHrLifecycle: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initHrLifecycle(db, (ctx as any).userId ?? 1);
  }),
  initProductionScheduling: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initProductionScheduling(db, (ctx as any).userId ?? 1);
  }),
  initPerformancePoints: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initPerformancePoints(db, (ctx as any).userId ?? 1);
  }),
  initPayrollAttendance: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initPayrollAttendance(db, (ctx as any).userId ?? 1);
  }),
  initAnnualPlanning: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initAnnualPlanning(db, (ctx as any).userId ?? 1);
  }),
  initQuotingBom: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initQuotingBom(db, (ctx as any).userId ?? 1);
  }),
  initCustomerConfig: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initCustomerConfig(db, (ctx as any).userId ?? 1);
  }),
  initMechanicalStandards: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initMechanicalStandards(db, (ctx as any).userId ?? 1);
  }),
  initElectricalStandards: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initElectricalStandards(db, (ctx as any).userId ?? 1);
  }),
  initAcceptanceTracking: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initAcceptanceTracking(db, (ctx as any).userId ?? 1);
  }),
  initSiteDelivery: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initSiteDelivery(db, (ctx as any).userId ?? 1);
  }),
  initAiProcessTwin: managePerm.mutation(async ({ ctx }) => {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    return initAiProcessTwin(db, (ctx as any).userId ?? 1);
  }),
});
