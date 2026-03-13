/**
 * After-Sales & Supply Chain Quality Demo Data Seed Script
 *
 * Seeds realistic demo data for the GRT System after-sales service and
 * supply chain quality modules.
 *
 * Tables seeded:
 *   1. after_sales_clients         — 5 clients (Strategic / Key / Standard)
 *   2. after_sales_equipments      — 10 equipments (2 per client, mixed warranty)
 *   3. after_sales_service_logs    — 8 service tickets (mixed statuses)
 *   4. spare_parts                 — 12 spare parts (4 low-stock alerts)
 *   5. customer_quality_complaints — 5 complaints (mixed severity)
 *   6. supplier_penalties          — 4 penalties (mixed trigger / escalation)
 *
 * Usage:
 *   npx tsx scripts/seed-after-sales-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  After-Sales & Supply Chain Quality Demo Data Seed");
  console.log("  GRT 售后服务 & 供应链质量 — Demo 数据初始化");
  console.log("=".repeat(60));
  console.log();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[FATAL] DATABASE_URL is not set in environment.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("[DB] Connected to database.");
  console.log();

  try {
    // ---- Idempotency check ----
    const existing = await client.query(
      `SELECT id FROM after_sales_clients WHERE name = 'Detroit Engine Corp' LIMIT 1`
    );
    if (existing.rows.length > 0) {
      console.log(
        "[SKIP] After-sales demo data already exists (Detroit Engine Corp found). Exiting."
      );
      return;
    }

    // ---- Look up real user IDs for FK integrity ----
    console.log("[LOOKUP] Querying users table for real IDs...");
    const userResult = await client.query(
      `SELECT id, name FROM users LIMIT 5`
    );
    if (userResult.rows.length === 0) {
      console.error(
        "[FATAL] No users found in users table. Ensure users are seeded first."
      );
      process.exit(1);
    }
    for (const u of userResult.rows) {
      console.log(`  User: id=${u.id} name=${u.name}`);
    }
    console.log();

    // Assign roles from real data
    const userId1 = userResult.rows[0].id;
    const userName1 = userResult.rows[0].name;
    const userId2 = userResult.rows.length > 1 ? userResult.rows[1].id : userId1;
    const userName2 = userResult.rows.length > 1 ? userResult.rows[1].name : userName1;
    const userId3 = userResult.rows.length > 2 ? userResult.rows[2].id : userId1;
    const userName3 = userResult.rows.length > 2 ? userResult.rows[2].name : userName1;
    const userId4 = userResult.rows.length > 3 ? userResult.rows[3].id : userId2;
    const userName4 = userResult.rows.length > 3 ? userResult.rows[3].name : userName2;
    const userId5 = userResult.rows.length > 4 ? userResult.rows[4].id : userId3;
    const userName5 = userResult.rows.length > 4 ? userResult.rows[4].name : userName3;

    const now = new Date().toISOString();

    // ---- Begin Transaction ----
    await client.query("BEGIN");
    console.log("[TX] Transaction started.");
    console.log();

    // ========================================================================
    // 1. Insert after_sales_clients (5 clients)
    // ========================================================================
    console.log("[CLIENTS] Inserting 5 after_sales_clients...");

    const clientIdMap: Record<string, number> = {};

    const clientsData = [
      {
        name: "Detroit Engine Corp", tier: "Strategic",
        contact: "John Miller", phone: "+1-313-555-0142",
        email: "john.miller@detroitengine.com",
        address: "1400 Holden Ave, Detroit, MI 48201, USA",
        industry: "Automotive — Engine Manufacturing", region: "North America",
        contractStart: "2024-06-01", contractEnd: "2027-05-31",
        sla: "Platinum", responseHours: 4,
        notes: "Top-tier strategic customer. 3-year service agreement with quarterly onsite visits.",
        key: "Detroit",
      },
      {
        name: "一汽集团", tier: "Strategic",
        contact: "王建国", phone: "+86-431-8577-0001",
        email: "wangjianguo@faw.com.cn",
        address: "吉林省长春市汽开区东风大街2259号",
        industry: "Automotive — Full Vehicle Manufacturing", region: "东北",
        contractStart: "2024-03-15", contractEnd: "2027-03-14",
        sla: "Platinum", responseHours: 4,
        notes: "央企战略客户，长春+青岛双基地覆盖。年度服务合同含全覆盖预防性维保。",
        key: "FAW",
      },
      {
        name: "上汽通用", tier: "Key",
        contact: "焦斌", phone: "+86-21-5012-3456", // demo
        email: "liminghui@sgm.com.cn",
        address: "上海市浦东新区申江路1500号",
        industry: "Automotive — Joint Venture Assembly", region: "华东",
        contractStart: "2025-01-10", contractEnd: "2027-01-09",
        sla: "Gold", responseHours: 8,
        notes: "SGM上海金桥+武汉+沈阳三厂项目，2年服务合同，月度远程巡检。",
        key: "SGM",
      },
      {
        name: "宝马沈阳", tier: "Key",
        contact: "张超", phone: "+86-24-2584-1000",
        email: "chao.zhang@brilliance-bmw.com",
        address: "辽宁省沈阳市大东区大东路17号",
        industry: "Automotive — Premium Vehicle Manufacturing", region: "东北",
        contractStart: "2025-04-01", contractEnd: "2027-03-31",
        sla: "Gold", responseHours: 8,
        notes: "华晨宝马大东+铁西双工厂，清洗线覆盖发动机+变速器产线。",
        key: "BMW",
      },
      {
        name: "博世苏州", tier: "Standard",
        contact: "陈芳", phone: "+86-512-6287-0000",
        email: "fang.chen@bosch.com",
        address: "江苏省苏州市工业园区苏虹中路200号",
        industry: "Automotive Components — Precision Parts", region: "华东",
        contractStart: "2025-09-01", contractEnd: "2026-08-31",
        sla: "Silver", responseHours: 24,
        notes: "Bosch苏州工厂精密零部件清洗线，标准服务合同。",
        key: "Bosch",
      },
    ];

    for (const c of clientsData) {
      const res = await client.query(
        `INSERT INTO after_sales_clients
          (name, tier, contact_person, contact_phone, contact_email, address,
           industry, region, contract_start_date, contract_end_date,
           "slaLevel", response_time_hours, status, notes, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16)
         RETURNING id`,
        [
          c.name, c.tier, c.contact, c.phone, c.email, c.address,
          c.industry, c.region, c.contractStart, c.contractEnd,
          c.sla, c.responseHours, "Active", c.notes, now, now,
        ]
      );
      clientIdMap[c.key] = res.rows[0].id;
      console.log(
        `  ${c.name} -> id=${res.rows[0].id} (${c.tier}, ${c.sla}, ${c.responseHours}h)`
      );
    }
    console.log();

    // ========================================================================
    // 2. Insert after_sales_equipments (10 equipments, 2 per client)
    // ========================================================================
    console.log("[EQUIPMENTS] Inserting 10 after_sales_equipments...");

    const equipIdMap: Record<string, number> = {};

    const equipments = [
      {
        serial: "GRT-USC-3001", model: "超声波清洗机 USC-3000", clientKey: "Detroit",
        type: "Ultrasonic Cleaning System", manufacturer: "GRT Industrial",
        installDate: "2024-08-15", warrantyEnd: "2026-05-15",
        lastMaint: "2026-01-20", nextDue: "2026-07-20", cycleMo: 6,
        opStatus: "Running", hours: 4820,
        location: "Plant A — Line 3, Station UC-01", dept: "Engine Block Cleaning",
        specs: JSON.stringify({ frequency_khz: 40, power_kw: 12, tank_volume_l: 800, temperature_max_c: 80 }),
      },
      {
        serial: "GRT-HPP-2200", model: "高压泵组 HPP-2200", clientKey: "Detroit",
        type: "High Pressure Pump Unit", manufacturer: "GRT Industrial",
        installDate: "2024-06-10", warrantyEnd: "2026-01-15",
        lastMaint: "2026-02-05", nextDue: "2026-08-05", cycleMo: 6,
        opStatus: "Running", hours: 6150,
        location: "Plant A — Line 3, Station HP-02", dept: "Engine Block Cleaning",
        specs: JSON.stringify({ max_pressure_bar: 250, flow_rate_lpm: 120, motor_power_kw: 45 }),
      },
      {
        serial: "GRT-PLC-7500", model: "PLC控制柜 PLC-7500", clientKey: "FAW",
        type: "PLC Control Cabinet", manufacturer: "GRT Industrial",
        installDate: "2024-09-01", warrantyEnd: "2026-07-20",
        lastMaint: "2026-01-15", nextDue: "2026-04-15", cycleMo: 3,
        opStatus: "Running", hours: 5200,
        location: "长春基地 — 发动机车间, 清洗线C区", dept: "发动机生产部",
        specs: JSON.stringify({ plc_model: "Siemens S7-1500", io_points: 256, profinet_ports: 4, ups_backup_min: 30 }),
      },
      {
        serial: "GRT-CVR-3600", model: "输送系统 CVR-3600", clientKey: "FAW",
        type: "Conveyor System", manufacturer: "GRT Industrial",
        installDate: "2024-09-01", warrantyEnd: "2026-03-10",
        lastMaint: "2025-12-10", nextDue: "2026-03-10", cycleMo: 3,
        opStatus: "Running", hours: 5100,
        location: "长春基地 — 发动机车间, 清洗线C区输送段", dept: "发动机生产部",
        specs: JSON.stringify({ length_m: 18, speed_mpm: 3.5, load_capacity_kg: 500, chain_type: "双排滚子链" }),
      },
      {
        serial: "GRT-NZS-0850", model: "喷嘴组件 NZS-0850", clientKey: "SGM",
        type: "Nozzle Assembly", manufacturer: "GRT Industrial",
        installDate: "2025-03-20", warrantyEnd: "2026-08-30",
        lastMaint: "2026-02-01", nextDue: "2026-05-01", cycleMo: 3,
        opStatus: "Running", hours: 3200,
        location: "金桥工厂 — 动力总成车间, 缸体清洗线", dept: "动力总成生产部",
        specs: JSON.stringify({ nozzle_count: 24, spray_angle_deg: 110, material: "316L Stainless Steel", max_pressure_bar: 150 }),
      },
      {
        serial: "GRT-DRY-1200", model: "干燥系统 DRY-1200", clientKey: "SGM",
        type: "Drying System", manufacturer: "GRT Industrial",
        installDate: "2025-01-10", warrantyEnd: "2025-12-20",
        lastMaint: "2026-01-25", nextDue: "2026-04-25", cycleMo: 3,
        opStatus: "Idle", hours: 2800,
        location: "金桥工厂 — 动力总成车间, 干燥段", dept: "动力总成生产部",
        specs: JSON.stringify({ air_flow_m3h: 1200, heater_power_kw: 36, max_temperature_c: 120, filter_type: "HEPA H13" }),
      },
      {
        serial: "GRT-FLT-5500", model: "过滤系统 FLT-5500", clientKey: "BMW",
        type: "Filtration System", manufacturer: "GRT Industrial",
        installDate: "2025-05-15", warrantyEnd: "2026-09-15",
        lastMaint: "2026-02-10", nextDue: "2026-05-10", cycleMo: 3,
        opStatus: "Running", hours: 2400,
        location: "大东工厂 — 发动机车间, 主过滤站", dept: "发动机生产部",
        specs: JSON.stringify({ flow_capacity_lpm: 5500, filtration_grade_um: 5, stages: 3, backwash_auto: true }),
      },
      {
        serial: "GRT-HMI-1500", model: "HMI触摸屏 HMI-1500", clientKey: "BMW",
        type: "HMI Touch Panel", manufacturer: "GRT Industrial",
        installDate: "2025-05-15", warrantyEnd: "2026-03-05",
        lastMaint: "2026-01-05", nextDue: "2026-04-05", cycleMo: 3,
        opStatus: "Running", hours: 2400,
        location: "大东工厂 — 发动机车间, 操作台OP-01", dept: "发动机生产部",
        specs: JSON.stringify({ screen_size_inch: 15, resolution: "1920x1080", touch_type: "PCT", protection_class: "IP65" }),
      },
      {
        serial: "GRT-SEN-0300", model: "传感器组 SEN-0300", clientKey: "Bosch",
        type: "Sensor Assembly", manufacturer: "GRT Industrial",
        installDate: "2025-10-01", warrantyEnd: "2026-06-10",
        lastMaint: "2026-02-15", nextDue: "2026-05-15", cycleMo: 3,
        opStatus: "Running", hours: 1600,
        location: "苏州工厂 — 精密清洗车间, 传感器监测柜", dept: "精密清洗部",
        specs: JSON.stringify({ sensor_types: ["pressure", "flow", "temperature", "turbidity"], sensor_count: 12, protocol: "IO-Link", sampling_rate_hz: 100 }),
      },
      {
        serial: "GRT-MOT-4400", model: "驱动电机 MOT-4400", clientKey: "Bosch",
        type: "Drive Motor", manufacturer: "GRT Industrial",
        installDate: "2025-10-01", warrantyEnd: "2026-01-30",
        lastMaint: "2026-02-10", nextDue: "2026-05-10", cycleMo: 3,
        opStatus: "Maintenance", hours: 1580,
        location: "苏州工厂 — 精密清洗车间, 泵站区域", dept: "精密清洗部",
        specs: JSON.stringify({ power_kw: 44, voltage_v: 380, rpm: 2950, efficiency_class: "IE4" }),
      },
    ];

    for (const eq of equipments) {
      const res = await client.query(
        `INSERT INTO after_sales_equipments
          (serial_number, model_name, client_id, equipment_type, manufacturer,
           installation_date, warranty_end_date, last_maintenance_date, next_due_date,
           maintenance_cycle_months, "operationalStatus", running_hours,
           location, department, technical_specs, status, notes, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12,
           $13, $14, $15, $16, $17, $18, $19)
         RETURNING id`,
        [
          eq.serial, eq.model, clientIdMap[eq.clientKey], eq.type, eq.manufacturer,
          eq.installDate, eq.warrantyEnd, eq.lastMaint, eq.nextDue,
          eq.cycleMo, eq.opStatus, eq.hours,
          eq.location, eq.dept, eq.specs, "Active", null, now, now,
        ]
      );
      equipIdMap[eq.serial] = res.rows[0].id;
      console.log(
        `  ${eq.serial} "${eq.model}" -> id=${res.rows[0].id} (${eq.opStatus}, warranty ${eq.warrantyEnd})`
      );
    }
    console.log();

    // ========================================================================
    // 3. Insert after_sales_service_logs (8 service tickets)
    // ========================================================================
    console.log("[SERVICE] Inserting 8 after_sales_service_logs...");

    const serviceTickets = [
      {
        ticketId: "SVC-2026-001", clientKey: "Detroit", equipSerial: "GRT-HPP-2200",
        serviceType: "Repair", priority: "Critical", serviceDate: "2026-02-05",
        issue: "高压泵异常振动超标（4.5mm/s > 标准2.5mm/s），连续运行45分钟后触发报警停机。",
        resolution: "更换SKF高温轴承6308-2RS，加装二级过滤器（25μm精度），调整润滑油更换周期从6个月缩短至3个月。振幅降至1.2mm/s。",
        engineer: userName1, engineerId: userId1, scheduledDate: "2026-02-05",
        status: "Completed",
        partsUsed: JSON.stringify([
          { partCode: "SP-BRG-6308", name: "SKF 6308-2RS Bearing", qty: 2 },
          { partCode: "SP-FLT-025", name: "25μm Precision Filter", qty: 1 },
        ]),
        laborCost: "2400.00", partsCost: "3850.00", totalCost: "6250.00",
      },
      {
        ticketId: "SVC-2026-002", clientKey: "FAW", equipSerial: "GRT-PLC-7500",
        serviceType: "Maintenance", priority: "Medium", serviceDate: "2026-01-15",
        issue: "PLC控制柜季度例行维保，检查IO模块、通信端口、UPS电池状态。",
        resolution: "完成全部256个IO点位检测，更换2个亮度不足的指示灯。UPS电池健康度92%，符合标准。Profinet通信测试全部正常。",
        engineer: userName2, engineerId: userId2, scheduledDate: "2026-01-15",
        status: "Completed",
        partsUsed: JSON.stringify([
          { partCode: "SP-LED-IND", name: "LED Indicator Light", qty: 2 },
        ]),
        laborCost: "1200.00", partsCost: "180.00", totalCost: "1380.00",
      },
      {
        ticketId: "SVC-2026-003", clientKey: "SGM", equipSerial: "GRT-DRY-1200",
        serviceType: "Repair", priority: "High", serviceDate: "2026-02-20",
        issue: "干燥系统加热元件故障，出风温度仅达到65°C（目标110°C），导致工件残留水分超标。",
        resolution: null, engineer: userName3, engineerId: userId3, scheduledDate: "2026-02-20",
        status: "In_Progress", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
      {
        ticketId: "SVC-2026-004", clientKey: "Bosch", equipSerial: "GRT-MOT-4400",
        serviceType: "Repair", priority: "High", serviceDate: "2026-02-18",
        issue: "驱动电机轴承温升异常，运行温度从正常55°C升至78°C，伴随异响。初步诊断为轴承润滑脂老化。",
        resolution: null, engineer: userName4, engineerId: userId4, scheduledDate: "2026-02-18",
        status: "In_Progress", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
      {
        ticketId: "SVC-2026-005", clientKey: "BMW", equipSerial: "GRT-FLT-5500",
        serviceType: "Maintenance", priority: "Medium", serviceDate: null,
        issue: "过滤系统季度预防性维保：更换一级过滤芯、检查反冲洗机构、清洗差压传感器。",
        resolution: null, engineer: userName1, engineerId: userId1, scheduledDate: "2026-03-10",
        status: "Scheduled", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
      {
        ticketId: "SVC-2026-006", clientKey: "FAW", equipSerial: "GRT-CVR-3600",
        serviceType: "Inspection", priority: "Low", serviceDate: null,
        issue: "输送系统链条张紧度检查及润滑，质保到期前最终全面巡检。",
        resolution: null, engineer: userName2, engineerId: userId2, scheduledDate: "2026-03-05",
        status: "Scheduled", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
      {
        ticketId: "SVC-2026-007", clientKey: "Detroit", equipSerial: "GRT-USC-3001",
        serviceType: "Upgrade", priority: "Medium", serviceDate: null,
        issue: "客户申请将超声波清洗机频率从40kHz升级为双频（40/80kHz），以适应新型铝合金缸体清洗需求。",
        resolution: null, engineer: null, engineerId: null, scheduledDate: null,
        status: "Pending", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
      {
        ticketId: "SVC-2026-008", clientKey: "BMW", equipSerial: "GRT-HMI-1500",
        serviceType: "Training", priority: "Low", serviceDate: null,
        issue: "宝马沈阳新入职操作员培训申请：HMI操作界面使用、故障代码查询、基础参数调整。",
        resolution: null, engineer: null, engineerId: null, scheduledDate: null,
        status: "Pending", partsUsed: null, laborCost: null, partsCost: null, totalCost: null,
      },
    ];

    for (const svc of serviceTickets) {
      await client.query(
        `INSERT INTO after_sales_service_logs
          (ticket_id, client_id, equipment_id, "serviceType", priority,
           service_date, issue_description, resolution,
           assigned_engineer_id, assigned_engineer_name,
           scheduled_date, status, parts_used,
           labor_cost, parts_cost, total_cost,
           created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10,
           $11, $12, $13,
           $14, $15, $16,
           $17, $18)`,
        [
          svc.ticketId, clientIdMap[svc.clientKey], equipIdMap[svc.equipSerial],
          svc.serviceType, svc.priority,
          svc.serviceDate, svc.issue, svc.resolution,
          svc.engineerId, svc.engineer,
          svc.scheduledDate, svc.status, svc.partsUsed,
          svc.laborCost, svc.partsCost, svc.totalCost,
          now, now,
        ]
      );
      console.log(
        `  ${svc.ticketId} [${svc.status}] ${svc.serviceType} — ${svc.equipSerial}`
      );
    }
    console.log();

    // ========================================================================
    // 4. Insert spare_parts (12 spare parts, 4 with low stock)
    // ========================================================================
    console.log("[SPARE PARTS] Inserting 12 spare_parts...");

    const spareParts = [
      {
        partCode: "SP-BRG-6308", matCode: "MAT-BRG-6308-2RS",
        matName: "SKF高温轴承 6308-2RS",
        spec: "内径40mm 外径90mm 宽23mm C3间隙",
        category: "mechanical", minStock: 2, reorder: 5, maxStock: 20,
        curStock: 3, autoReorder: true, supplier: "SKF China",
        unitPrice: "580.00", leadDays: 7, critical: true, loc: "WH-A-01-03",
      },
      {
        partCode: "SP-FLT-025", matCode: "MAT-FLT-025UM",
        matName: "25μm精密过滤芯",
        spec: "外径115mm 长度250mm 精度25μm 316L",
        category: "consumable", minStock: 5, reorder: 10, maxStock: 50,
        curStock: 8, autoReorder: true, supplier: "Pall Corporation",
        unitPrice: "1250.00", leadDays: 14, critical: true, loc: "WH-A-02-01",
      },
      {
        partCode: "SP-NZL-V110", matCode: "MAT-NZL-V110-SS",
        matName: "V型喷嘴 110°",
        spec: "V型扇形 110° 孔径1.2mm 316L不锈钢",
        category: "hydraulic", minStock: 4, reorder: 8, maxStock: 30,
        curStock: 5, autoReorder: true, supplier: "Spraying Systems Co.",
        unitPrice: "420.00", leadDays: 10, critical: true, loc: "WH-A-01-05",
      },
      {
        partCode: "SP-SEAL-HPP", matCode: "MAT-SEAL-HPP-250",
        matName: "高压泵密封套件",
        spec: "适配HPP-2200系列 含主密封+O型圈+背压环",
        category: "hydraulic", minStock: 3, reorder: 6, maxStock: 20,
        curStock: 2, autoReorder: true, supplier: "Parker Hannifin",
        unitPrice: "1680.00", leadDays: 14, critical: true, loc: "WH-A-01-07",
      },
      {
        partCode: "SP-LED-IND", matCode: "MAT-LED-IND-24V",
        matName: "LED指示灯 24V",
        spec: "22mm面板安装 LED 24VDC 红/绿/黄",
        category: "electrical", minStock: 10, reorder: 20, maxStock: 100,
        curStock: 45, autoReorder: false, supplier: "Schneider Electric",
        unitPrice: "32.00", leadDays: 5, critical: false, loc: "WH-B-03-02",
      },
      {
        partCode: "SP-RLY-24DC", matCode: "MAT-RLY-24VDC-8P",
        matName: "中间继电器 24VDC 8脚",
        spec: "MY2NJ型 DC24V 2组常开常闭 5A",
        category: "electrical", minStock: 5, reorder: 10, maxStock: 40,
        curStock: 28, autoReorder: false, supplier: "Omron Electronics",
        unitPrice: "45.00", leadDays: 5, critical: false, loc: "WH-B-03-04",
      },
      {
        partCode: "SP-BLT-HTD8", matCode: "MAT-BLT-HTD8M-1600",
        matName: "HTD8M同步带 1600mm",
        spec: "HTD8M齿型 宽30mm 周长1600mm",
        category: "mechanical", minStock: 2, reorder: 4, maxStock: 12,
        curStock: 7, autoReorder: false, supplier: "Gates Corporation",
        unitPrice: "380.00", leadDays: 10, critical: false, loc: "WH-A-02-06",
      },
      {
        partCode: "SP-HEPA-H13", matCode: "MAT-HEPA-H13-610",
        matName: "HEPA H13高效过滤器",
        spec: "610x610x292mm H13级 铝框",
        category: "consumable", minStock: 2, reorder: 4, maxStock: 10,
        curStock: 6, autoReorder: false, supplier: "AAF International",
        unitPrice: "2800.00", leadDays: 21, critical: false, loc: "WH-A-02-08",
      },
      {
        partCode: "SP-SEN-PT100", matCode: "MAT-SEN-PT100-6MM",
        matName: "PT100温度传感器",
        spec: "PT100 三线制 探头直径6mm 长度150mm",
        category: "electrical", minStock: 4, reorder: 8, maxStock: 30,
        curStock: 15, autoReorder: false, supplier: "IFM Electronic",
        unitPrice: "220.00", leadDays: 7, critical: false, loc: "WH-B-01-02",
      },
      {
        partCode: "SP-VLV-SOL", matCode: "MAT-VLV-SOL-DN25",
        matName: "电磁阀 DN25",
        spec: "二位二通 DN25 不锈钢 DC24V 常闭",
        category: "pneumatic", minStock: 3, reorder: 6, maxStock: 18,
        curStock: 11, autoReorder: false, supplier: "SMC Corporation",
        unitPrice: "650.00", leadDays: 7, critical: false, loc: "WH-A-03-01",
      },
      {
        partCode: "SP-GRS-EP2", matCode: "MAT-GRS-EP2-15KG",
        matName: "高温润滑脂 EP2",
        spec: "SKF LGMT2 通用高温润滑脂 15kg桶",
        category: "consumable", minStock: 1, reorder: 2, maxStock: 6,
        curStock: 4, autoReorder: false, supplier: "SKF China",
        unitPrice: "1350.00", leadDays: 5, critical: false, loc: "WH-C-01-01",
      },
      {
        partCode: "SP-CCD-CAM", matCode: "MAT-CCD-CAM-5MP",
        matName: "工业相机 5MP",
        spec: "500万像素 GigE接口 1/2.5\" CMOS C口",
        category: "electrical", minStock: 1, reorder: 2, maxStock: 5,
        curStock: 3, autoReorder: false, supplier: "Basler AG",
        unitPrice: "4500.00", leadDays: 21, critical: false, loc: "WH-B-02-01",
      },
    ];

    for (const sp of spareParts) {
      await client.query(
        `INSERT INTO spare_parts
          (part_code, material_code, material_name, specification, category,
           min_stock_level, reorder_point, max_stock_level, current_stock,
           auto_reorder_enabled, preferred_supplier_name, unit_price,
           lead_time_days, is_critical, location_code,
           created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12,
           $13, $14, $15,
           $16, $17)`,
        [
          sp.partCode, sp.matCode, sp.matName, sp.spec, sp.category,
          sp.minStock, sp.reorder, sp.maxStock, sp.curStock,
          sp.autoReorder, sp.supplier, sp.unitPrice,
          sp.leadDays, sp.critical, sp.loc,
          now, now,
        ]
      );
      const stockAlert = sp.curStock <= sp.reorder ? " *** LOW STOCK ***" : "";
      console.log(
        `  ${sp.partCode} "${sp.matName}" stock=${sp.curStock}/${sp.reorder}${stockAlert}`
      );
    }
    console.log();

    // ========================================================================
    // 5. Insert customer_quality_complaints (5 complaints)
    // ========================================================================
    console.log("[COMPLAINTS] Inserting 5 customer_quality_complaints...");

    const complaints = [
      {
        code: "CQC-2026-001", custId: clientIdMap["Detroit"], custName: "Detroit Engine Corp",
        severity: "critical", status: "investigating",
        desc: "缸体清洗后残留金属颗粒超标（实测780μg > 标准500μg），影响发动机装配质量。怀疑过滤系统效能下降或喷嘴参数偏移。",
        rootCause: "初步分析：25μm过滤芯使用超过2000小时未更换，过滤效率下降至75%（标准>95%）。",
        corrective: null, score: null, createdBy: userId1,
      },
      {
        code: "CQC-2026-002", custId: clientIdMap["FAW"], custName: "一汽集团",
        severity: "high", status: "open",
        desc: "清洗后缸盖水道内壁有明显锈斑残留，影响后续密封胶涂覆质量。可能与防锈液浓度、pH值或干燥时间有关。",
        rootCause: null, corrective: null, score: null, createdBy: userId2,
      },
      {
        code: "CQC-2026-003", custId: clientIdMap["SGM"], custName: "上汽通用",
        severity: "medium", status: "resolved",
        desc: "清洗周期时间波动大（标准120s±5s，实际105-145s），导致节拍不稳定影响产线效率。",
        rootCause: "PLC程序中传感器信号延迟判定逻辑导致等待超时；输送带编码器累计误差未清零。",
        corrective: "修正PLC程序中信号判定逻辑超时从5s改为2s，增加编码器每班次自动校零功能。修改后连续监测3天，周期时间稳定在118-122s。",
        score: 8, createdBy: userId3,
      },
      {
        code: "CQC-2026-004", custId: clientIdMap["BMW"], custName: "宝马沈阳",
        severity: "high", status: "investigating",
        desc: "HMI操作界面偶发无响应（约每运行8小时出现1次），需硬重启。怀疑与内存泄漏或温度相关。",
        rootCause: "初步排查：HMI运行环境温度达45°C（超过额定40°C），同时日志显示内存占用在8小时内从35%线性上升至92%。",
        corrective: null, score: null, createdBy: userId4,
      },
      {
        code: "CQC-2026-005", custId: clientIdMap["Bosch"], custName: "博世苏州",
        severity: "low", status: "closed",
        desc: "远程监控数据上传延迟约15分钟（SLA要求5分钟内），影响客户实时监看体验。",
        rootCause: "IoT网关缓冲区满后批量上传策略导致延迟；工厂内网带宽在高峰时段仅3Mbps。",
        corrective: "优化IoT网关数据上传策略为实时推送+30s心跳；协调客户IT部门开通专用VLAN通道，带宽提升至20Mbps。",
        score: 9, createdBy: userId5,
      },
    ];

    for (const c of complaints) {
      await client.query(
        `INSERT INTO customer_quality_complaints
          (complaint_code, customer_id, customer_name, severity, status,
           description, root_cause, corrective_action,
           satisfaction_score, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10, $11, $12)`,
        [
          c.code, c.custId, c.custName, c.severity, c.status,
          c.desc, c.rootCause, c.corrective,
          c.score, c.createdBy, now, now,
        ]
      );
      console.log(`  ${c.code} [${c.severity}/${c.status}] ${c.custName}`);
    }
    console.log();

    // ========================================================================
    // 6. Insert supplier_penalties (4 penalties)
    // ========================================================================
    console.log("[PENALTIES] Inserting 4 supplier_penalties...");

    const penalties = [
      {
        code: "SPEN-2026-001", suppId: 1, suppName: "鑫达液压配件有限公司",
        trigger: "quality_reject", penType: "fine",
        desc: "来料批次HL-2026-0215液压密封件不良率达12%（标准<2%），导致3台高压泵返修。影响Detroit Engine Corp项目交付。",
        count: 3, escalation: 2, fine: "15000.00",
        caRequired: true, caStatus: "pending", blacklisted: false,
      },
      {
        code: "SPEN-2026-002", suppId: 2, suppName: "苏州精密滤材科技",
        trigger: "late_delivery", penType: "warning",
        desc: "精密过滤芯交货延期8个工作日（PO-2026-0188），导致宝马沈阳维保计划推迟。",
        count: 1, escalation: 1, fine: null,
        caRequired: true, caStatus: "completed", blacklisted: false,
      },
      {
        code: "SPEN-2026-003", suppId: 3, suppName: "东莞通达电子元件",
        trigger: "missing_report", penType: "probation",
        desc: "连续3批交货未提供RoHS/REACH合规检测报告及材料证书（IATF 16949 7.4.1.2要求）。已发出2次书面警告未改善。",
        count: 5, escalation: 3, fine: "8000.00",
        caRequired: true, caStatus: "pending", blacklisted: false,
      },
      {
        code: "SPEN-2026-004", suppId: 4, suppName: "河北远洋钢铁制品",
        trigger: "safety_violation", penType: "suspension",
        desc: "供应商工厂审核发现焊接工位缺少排烟设施、操作工未佩戴防护装备，存在严重安全隐患。根据供应商行为准则第4.2条暂停合作。",
        count: 2, escalation: 4, fine: "25000.00",
        caRequired: true, caStatus: "pending", blacklisted: false,
      },
    ];

    for (const p of penalties) {
      await client.query(
        `INSERT INTO supplier_penalties
          (penalty_code, supplier_id, supplier_name, trigger_type, penalty_type,
           description, occurrence_count, escalation_level, fine_amount,
           corrective_action_required, corrective_action_status,
           is_blacklisted, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11,
           $12, $13, $14, $15)`,
        [
          p.code, p.suppId, p.suppName, p.trigger, p.penType,
          p.desc, p.count, p.escalation, p.fine,
          p.caRequired, p.caStatus,
          p.blacklisted, userId1, now, now,
        ]
      );
      console.log(
        `  ${p.code} [${p.penType}] ${p.suppName} — ${p.trigger} (L${p.escalation})`
      );
    }
    console.log();

    // ---- Commit Transaction ----
    await client.query("COMMIT");
    console.log("[TX] Transaction committed successfully.");
    console.log();

    // ========================================================================
    // Verification Stats
    // ========================================================================
    console.log("=".repeat(60));
    console.log("  Verification Stats");
    console.log("=".repeat(60));
    console.log();

    const clientCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_clients`
    );
    console.log(`  after_sales_clients:         ${clientCount.rows[0].cnt}`);

    const equipCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_equipments`
    );
    console.log(`  after_sales_equipments:      ${equipCount.rows[0].cnt}`);

    const warrantyExpired = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_equipments WHERE warranty_end_date < CURRENT_DATE`
    );
    console.log(`    - warranty expired:         ${warrantyExpired.rows[0].cnt}`);

    const warrantySoon = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_equipments WHERE warranty_end_date >= CURRENT_DATE AND warranty_end_date <= CURRENT_DATE + INTERVAL '30 days'`
    );
    console.log(`    - warranty expiring soon:   ${warrantySoon.rows[0].cnt}`);

    const warrantyActive = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_equipments WHERE warranty_end_date > CURRENT_DATE + INTERVAL '30 days'`
    );
    console.log(`    - warranty active (>30d):   ${warrantyActive.rows[0].cnt}`);

    const svcCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM after_sales_service_logs`
    );
    console.log(`  after_sales_service_logs:    ${svcCount.rows[0].cnt}`);

    const svcByStatus = await client.query(
      `SELECT status, COUNT(*) AS cnt FROM after_sales_service_logs GROUP BY status ORDER BY status`
    );
    for (const row of svcByStatus.rows) {
      console.log(`    - ${row.status}: ${row.cnt}`);
    }

    const spCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM spare_parts`
    );
    console.log(`  spare_parts:                 ${spCount.rows[0].cnt}`);

    const lowStock = await client.query(
      `SELECT COUNT(*) AS cnt FROM spare_parts WHERE current_stock <= reorder_point`
    );
    console.log(`    - low stock alerts:         ${lowStock.rows[0].cnt}`);

    const cqcCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM customer_quality_complaints`
    );
    console.log(`  customer_quality_complaints: ${cqcCount.rows[0].cnt}`);

    const cqcBySeverity = await client.query(
      `SELECT severity, COUNT(*) AS cnt FROM customer_quality_complaints GROUP BY severity ORDER BY severity`
    );
    for (const row of cqcBySeverity.rows) {
      console.log(`    - ${row.severity}: ${row.cnt}`);
    }

    const penCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM supplier_penalties`
    );
    console.log(`  supplier_penalties:          ${penCount.rows[0].cnt}`);

    const penByType = await client.query(
      `SELECT penalty_type, COUNT(*) AS cnt FROM supplier_penalties GROUP BY penalty_type ORDER BY penalty_type`
    );
    for (const row of penByType.rows) {
      console.log(`    - ${row.penalty_type}: ${row.cnt}`);
    }

    console.log();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Transaction rolled back due to error:");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("[DB] Database connection closed.");
  }

  console.log();
  console.log("=".repeat(60));
  console.log("  After-Sales & Supply Chain Quality seed complete!");
  console.log("=".repeat(60));
}

main();
