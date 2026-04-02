/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Phase 4-7: 会议/OA/NCR/MES/供应链 基础设施                    ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  4: 会议→任务联动表 + OA审批超时配置                            ║
 * ║  5: NCR持久化表 + FMEA→8D联动                                  ║
 * ║  6: CRM→项目自动转化配置                                       ║
 * ║  7: MES工位状态真实化种子                                       ║
 * ║  Run: npx tsx server/seed/seed-phase4-7.ts                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   Phase 4-7: 基础设施建表 + 种子数据                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ═══════════════════════════════════════════
    // Phase 4: 会议→任务 + OA增强
    // ═══════════════════════════════════════════
    console.log("── Phase 4: 会议 + OA ──");

    // 4.1 OA 审批超时配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS oa_approval_timeout_config (
        id SERIAL PRIMARY KEY,
        workflow_type VARCHAR(50) NOT NULL,
        timeout_hours INTEGER DEFAULT 72,
        escalation_level INTEGER DEFAULT 1,
        escalate_to VARCHAR(50) DEFAULT 'supervisor',
        auto_remind BOOLEAN DEFAULT true,
        remind_hours INTEGER DEFAULT 24,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 种入默认超时配置
    const oaTypes = [
      { type: "LEAVE", hours: 48, remind: 24 },
      { type: "OVERTIME", hours: 24, remind: 8 },
      { type: "ATTENDANCE_FIX", hours: 48, remind: 24 },
      { type: "EXPENSE", hours: 72, remind: 24 },
      { type: "PROCUREMENT", hours: 72, remind: 48 },
      { type: "SEAL", hours: 48, remind: 24 },
      { type: "GIFT", hours: 48, remind: 24 },
      { type: "VEHICLE", hours: 24, remind: 8 },
      { type: "OUTING", hours: 24, remind: 8 },
      { type: "STATIONERY", hours: 48, remind: 24 },
    ];
    for (const oa of oaTypes) {
      const exists: any = await db.execute(sql`SELECT id FROM oa_approval_timeout_config WHERE workflow_type = ${oa.type} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql`
          INSERT INTO oa_approval_timeout_config (workflow_type, timeout_hours, remind_hours)
          VALUES (${oa.type}, ${oa.hours}, ${oa.remind})
        `);
      }
    }
    console.log(`  [+] OA 审批超时配置: ${oaTypes.length} 类审批流`);

    // 4.2 会议→任务关联追踪表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meeting_task_links (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL,
        action_item_id INTEGER,
        project_task_id INTEGER,
        task_name VARCHAR(300),
        assignee_name VARCHAR(100),
        due_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  [+] 会议→任务关联表 meeting_task_links");

    // ═══════════════════════════════════════════
    // Phase 5: NCR持久化 + FMEA→8D闭环
    // ═══════════════════════════════════════════
    console.log("\n── Phase 5: 质量闭环 ──");

    // 5.1 NCR 记录持久化表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quality_ncr_records (
        id SERIAL PRIMARY KEY,
        ncr_number VARCHAR(50) UNIQUE NOT NULL,
        product_name VARCHAR(200),
        batch_number VARCHAR(100),
        defect_category VARCHAR(50),
        defect_description TEXT,
        detection_stage VARCHAR(50),
        severity VARCHAR(20) DEFAULT 'minor',
        project_id INTEGER,
        process_code VARCHAR(20),
        analysis_result JSONB,
        root_cause_analysis JSONB,
        corrective_actions JSONB,
        preventive_actions JSONB,
        disposition VARCHAR(50),
        cost_impact DECIMAL(15,2),
        linked_fmea_item_id INTEGER,
        linked_8d_id INTEGER,
        status VARCHAR(20) DEFAULT 'open',
        created_by INTEGER,
        created_by_name VARCHAR(100),
        closed_at TIMESTAMP,
        closed_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  [+] NCR 记录表 quality_ncr_records");

    // 5.2 FMEA→NCR→8D 联动追踪表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quality_closed_loop_tracker (
        id SERIAL PRIMARY KEY,
        fmea_item_id INTEGER,
        ncr_id INTEGER,
        eight_d_id INTEGER,
        original_rpn INTEGER,
        updated_rpn INTEGER,
        improvement_description TEXT,
        status VARCHAR(20) DEFAULT 'open',
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  [+] FMEA→NCR→8D 闭环追踪表");

    // 5.3 SOP 版本审批流表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sop_approval_records (
        id SERIAL PRIMARY KEY,
        sop_template_id INTEGER NOT NULL,
        version VARCHAR(20),
        action VARCHAR(20) NOT NULL,
        actor_id INTEGER,
        actor_name VARCHAR(100),
        comment TEXT,
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  [+] SOP 审批记录表 sop_approval_records");

    // ═══════════════════════════════════════════
    // Phase 6: CRM→项目 + 供应链联动
    // ═══════════════════════════════════════════
    console.log("\n── Phase 6: CRM + 供应链 ──");

    // 6.1 商机→项目转化配置
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS crm_project_conversion_rules (
        id SERIAL PRIMARY KEY,
        opportunity_stage VARCHAR(50) NOT NULL,
        auto_create_project BOOLEAN DEFAULT false,
        default_project_type VARCHAR(30) DEFAULT 'standard',
        default_phase VARCHAR(10) DEFAULT 'M0',
        assign_pm_by VARCHAR(30) DEFAULT 'bu_load_balance',
        notify_roles JSONB DEFAULT '["bu_pm","director"]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 默认转化规则
    const convRules = [
      { stage: "negotiation", auto: false },
      { stage: "proposal", auto: false },
      { stage: "closed_won", auto: true },
    ];
    for (const rule of convRules) {
      const exists: any = await db.execute(sql`SELECT id FROM crm_project_conversion_rules WHERE opportunity_stage = ${rule.stage} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql`
          INSERT INTO crm_project_conversion_rules (opportunity_stage, auto_create_project)
          VALUES (${rule.stage}, ${rule.auto})
        `);
      }
    }
    console.log("  [+] 商机→项目转化规则 (closed_won=自动立项)");

    // 6.2 采购联动配置
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supply_chain_auto_triggers (
        id SERIAL PRIMARY KEY,
        trigger_event VARCHAR(50) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        condition_json JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const scTriggers = [
      { event: "bom_confirmed", action: "auto_create_purchase_request", condition: '{"phase":"M4"}' },
      { event: "purchase_received", action: "update_material_readiness", condition: '{}' },
      { event: "material_shortage", action: "create_urgent_purchase", condition: '{"threshold_days":7}' },
    ];
    for (const t of scTriggers) {
      const exists: any = await db.execute(sql`SELECT id FROM supply_chain_auto_triggers WHERE trigger_event = ${t.event} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql.raw(`INSERT INTO supply_chain_auto_triggers (trigger_event, action_type, condition_json) VALUES ('${t.event}', '${t.action}', '${t.condition}')`));
      }
    }
    console.log("  [+] 供应链联动触发器 (BOM确认→自动采购申请)");

    // ═══════════════════════════════════════════
    // Phase 7: MES 工位真实化种子
    // ═══════════════════════════════════════════
    console.log("\n── Phase 7: MES 生产现场 ──");

    // 7.1 工位主数据
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mes_workstations (
        id SERIAL PRIMARY KEY,
        station_code VARCHAR(30) UNIQUE NOT NULL,
        station_name VARCHAR(100) NOT NULL,
        station_type VARCHAR(30) DEFAULT 'assembly',
        department VARCHAR(50),
        bu_code VARCHAR(20),
        process_codes JSONB DEFAULT '[]'::jsonb,
        equipment_list JSONB DEFAULT '[]'::jsonb,
        operator_capacity INTEGER DEFAULT 2,
        shift_pattern VARCHAR(20) DEFAULT 'two_shift',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const stations = [
      { code: "WS-001", name: "机械装配工位A1", type: "assembly", dept: "事业一部", bu: "BU1", processes: '["T6-机械装配"]' },
      { code: "WS-002", name: "机械装配工位A2", type: "assembly", dept: "事业一部", bu: "BU1", processes: '["T6-机械装配"]' },
      { code: "WS-003", name: "电气装配工位A3", type: "assembly", dept: "事业一部", bu: "BU1", processes: '["T7-电气装配"]' },
      { code: "WS-004", name: "调试工位B1", type: "testing", dept: "事业一部", bu: "BU1", processes: '["T8-调试","T9-FAT"]' },
      { code: "WS-005", name: "机加工中心C1", type: "machining", dept: "事业十部", bu: "BU5", processes: '["T3-机加工"]' },
      { code: "WS-006", name: "激光切割C2", type: "cutting", dept: "事业十部", bu: "BU5", processes: '["T2-激光切割"]' },
      { code: "WS-007", name: "焊接工位C3", type: "welding", dept: "事业一部", bu: "BU1", processes: '["T4-焊接"]' },
      { code: "WS-008", name: "机械装配工位D1", type: "assembly", dept: "事业二部", bu: "BU2", processes: '["T6-机械装配"]' },
      { code: "WS-009", name: "电气装配工位D2", type: "assembly", dept: "事业二部", bu: "BU2", processes: '["T7-电气装配"]' },
      { code: "WS-010", name: "机械装配工位E1", type: "assembly", dept: "事业三部", bu: "BU3", processes: '["T6-机械装配"]' },
      { code: "WS-011", name: "电气装配工位E2", type: "assembly", dept: "事业三部", bu: "BU3", processes: '["T7-电气装配"]' },
      { code: "WS-012", name: "终检工位F1", type: "inspection", dept: "事业一部", bu: "BU1", processes: '["T10-终检"]' },
    ];
    for (const s of stations) {
      const exists: any = await db.execute(sql`SELECT id FROM mes_workstations WHERE station_code = ${s.code} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql.raw(`INSERT INTO mes_workstations (station_code, station_name, station_type, department, bu_code, process_codes) VALUES ('${s.code}', '${s.name}', '${s.type}', '${s.dept}', '${s.bu}', '${s.processes}')`));
      }
    }
    console.log(`  [+] ${stations.length} 个工位主数据 (WS-001 ~ WS-012)`);

    // 7.2 工位→操作员绑定表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mes_station_operators (
        id SERIAL PRIMARY KEY,
        station_code VARCHAR(30) NOT NULL,
        employee_id VARCHAR(20) NOT NULL,
        employee_name VARCHAR(100),
        shift VARCHAR(10) DEFAULT 'day',
        is_primary BOOLEAN DEFAULT true,
        valid_from DATE DEFAULT CURRENT_DATE,
        valid_to DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(station_code, employee_id, shift)
      )
    `);

    // 绑定部分操作员到工位
    const bindings = [
      { station: "WS-001", empId: "GRT010", name: "吴卫成", shift: "day" },
      { station: "WS-001", empId: "GRT016", name: "曹庆伟", shift: "day" },
      { station: "WS-002", empId: "GRT039", name: "侯德朋", shift: "day" },
      { station: "WS-002", empId: "GRT041", name: "张良", shift: "day" },
      { station: "WS-003", empId: "GRT031", name: "沈龙翔", shift: "day" },
      { station: "WS-003", empId: "GRT036", name: "韩品来", shift: "day" },
      { station: "WS-004", empId: "GRT046", name: "吕雪冬", shift: "day" },
      { station: "WS-005", empId: "GRT068", name: "李亚超", shift: "day" },
      { station: "WS-006", empId: "GRT064", name: "强兵兵", shift: "day" },
      { station: "WS-007", empId: "GRT017", name: "田坪珍", shift: "day" },
      { station: "WS-008", empId: "GRT074", name: "王金涛", shift: "day" },
      { station: "WS-009", empId: "GRT097", name: "钱佳奇", shift: "day" },
      { station: "WS-010", empId: "GRT013", name: "孙淼", shift: "day" },
      { station: "WS-010", empId: "GRT021", name: "张松松", shift: "day" },
      { station: "WS-011", empId: "GRT023", name: "杨之雲", shift: "day" },
      { station: "WS-012", empId: "GRT005", name: "金晓锋", shift: "day" },
    ];
    for (const b of bindings) {
      const exists: any = await db.execute(sql`SELECT id FROM mes_station_operators WHERE station_code = ${b.station} AND employee_id = ${b.empId} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql`
          INSERT INTO mes_station_operators (station_code, employee_id, employee_name, shift)
          VALUES (${b.station}, ${b.empId}, ${b.name}, ${b.shift})
        `);
      }
    }
    console.log(`  [+] ${bindings.length} 个操作员→工位绑定`);

    // ═══════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║   Phase 4-7 基础设施完成                                    ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  Phase 4: OA超时配置(10类) + 会议任务关联表                ║");
    console.log("║  Phase 5: NCR记录表 + FMEA闭环追踪 + SOP审批记录          ║");
    console.log("║  Phase 6: 商机转化规则 + 供应链联动触发器                  ║");
    console.log("║  Phase 7: 12工位主数据 + 16操作员绑定                      ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-phase4-7");
if (isDirectRun) { seed(); }
