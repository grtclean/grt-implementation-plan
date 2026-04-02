/**
 * Create customer equipment tables + seed data for 5 key customers
 */
const pg = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Gerry123456@localhost:5432/grt_system";

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    // ── Create tables ──
    const tables = [
      `CREATE TABLE IF NOT EXISTS customer_equipment (
        id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL,
        customer_company VARCHAR(200), equipment_code VARCHAR(50) NOT NULL UNIQUE,
        equipment_model VARCHAR(100) NOT NULL, equipment_name VARCHAR(200) NOT NULL,
        serial_number VARCHAR(100), delivery_date TIMESTAMP, warranty_expiry TIMESTAMP,
        install_location VARCHAR(200), health_score DECIMAL(5,2) DEFAULT 100.00,
        status VARCHAR(30) DEFAULT 'running', last_maintenance_date TIMESTAMP,
        next_pm_date TIMESTAMP, total_running_hours DECIMAL(10,1) DEFAULT 0.0,
        config_json JSON, robot_guidance_enabled BOOLEAN DEFAULT false,
        robot_guidance_config_json JSON, remote_access_enabled BOOLEAN DEFAULT true,
        camera_stream_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_spare_parts (
        id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL,
        part_code VARCHAR(50) NOT NULL, part_name VARCHAR(200) NOT NULL,
        part_name_en VARCHAR(200), category VARCHAR(50) NOT NULL,
        specification VARCHAR(200), delivered_qty INTEGER DEFAULT 0,
        current_stock INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 2,
        recommended_purchase_qty INTEGER, unit_price DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'CNY', lead_time_days INTEGER DEFAULT 14,
        life_expectancy_hours INTEGER, last_replaced_date TIMESTAMP,
        next_replace_date TIMESTAMP, supplier_info VARCHAR(200), notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_pm_plans (
        id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL,
        plan_code VARCHAR(50) NOT NULL, plan_name VARCHAR(200) NOT NULL,
        plan_type VARCHAR(30) NOT NULL, interval_hours INTEGER, interval_days INTEGER,
        checklist_json JSON, scheduled_date TIMESTAMP, completed_date TIMESTAMP,
        status VARCHAR(30) DEFAULT 'scheduled', assignee VARCHAR(100),
        grt_support_required BOOLEAN DEFAULT false, grt_support_contact VARCHAR(100),
        completion_notes TEXT, photos_json JSON,
        robot_assist_available BOOLEAN DEFAULT false, robot_instruction_set_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_repair_records (
        id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL,
        repair_code VARCHAR(50) NOT NULL, fault_description TEXT NOT NULL,
        fault_category VARCHAR(50), severity VARCHAR(20) DEFAULT 'medium',
        reported_by VARCHAR(100), reported_at TIMESTAMP NOT NULL,
        executor VARCHAR(100), executor_type VARCHAR(20),
        started_at TIMESTAMP, completed_at TIMESTAMP,
        downtime_hours DECIMAL(8,1), repair_steps_json JSON,
        root_cause TEXT, solution TEXT, preventive_measure TEXT,
        parts_used_json JSON, grt_remote_support_used BOOLEAN DEFAULT false,
        grt_support_engineer VARCHAR(100), grt_support_notes TEXT,
        camera_session_used BOOLEAN DEFAULT false, safety_warnings_json JSON,
        lessons_learned TEXT, status VARCHAR(30) DEFAULT 'reported',
        robot_assisted_repair BOOLEAN DEFAULT false, robot_repair_log_json JSON,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_remote_sessions (
        id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL,
        session_code VARCHAR(50) NOT NULL, session_type VARCHAR(30) NOT NULL,
        requested_by VARCHAR(100), grt_engineer VARCHAR(100),
        grt_engineer_role VARCHAR(100), started_at TIMESTAMP, ended_at TIMESTAMP,
        duration_minutes INTEGER, issue_description TEXT, resolution_summary TEXT,
        camera_used BOOLEAN DEFAULT false, recording_url VARCHAR(500),
        status VARCHAR(30) DEFAULT 'requested', satisfaction_rating INTEGER,
        robot_guidance_used BOOLEAN DEFAULT false, robot_guidance_log_json JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS customer_equipment_health_log (
        id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL,
        recorded_at TIMESTAMP DEFAULT NOW(), health_score DECIMAL(5,2) NOT NULL,
        source VARCHAR(30) NOT NULL, dimension_scores_json JSON,
        notes TEXT, recorded_by VARCHAR(100)
      )`,
    ];

    for (const sql of tables) {
      await client.query(sql);
    }
    console.log("[OK] 6 tables created");

    // ── Get customer user IDs ──
    const customers = [
      { openId: "cust:13812345001", company: "伊洛美克动力总成有限公司", models: ["USC-08"], names: ["8工位超声清洗线"] },
      { openId: "cust:13812345002", company: "重庆美利信科技股份有限公司", models: ["KLT-4200", "TSL-8000"], names: ["双工位高洁净清洗机", "多槽浸没超声系统"] },
      { openId: "cust:13812345003", company: "比亚迪股份有限公司", models: ["MCL-12000", "KLT-4200"], names: ["一体化压铸件清洗岛", "双工位高洁净清洗机"] },
      { openId: "cust:13812345004", company: "宁德时代新能源科技有限公司", models: ["TSL-8000"], names: ["多槽浸没超声系统"] },
      { openId: "cust:13812345005", company: "Robert Bosch GmbH", models: ["KLT-4200", "USC-08"], names: ["Dual-Station HPC", "8-Station Ultrasonic Line"] },
    ];

    // Standard spare parts template per equipment type
    const SPARE_PARTS = [
      { code: "SP-FILTER-5U", name: "精密过滤芯 5μm", nameEn: "Precision Filter 5μm", cat: "filter", spec: "5μm/φ250mm", qty: 10, min: 3, price: 280, life: 2000, lead: 7 },
      { code: "SP-FILTER-10U", name: "预过滤芯 10μm", nameEn: "Pre-Filter 10μm", cat: "filter", spec: "10μm/φ250mm", qty: 5, min: 2, price: 180, life: 3000, lead: 7 },
      { code: "SP-SEAL-VIT", name: "氟橡胶密封圈套装", nameEn: "Viton Seal Kit", cat: "seal", spec: "FPM/耐碳氢", qty: 3, min: 2, price: 450, life: 4000, lead: 14 },
      { code: "SP-NOZZLE-SS", name: "不锈钢扇形喷嘴", nameEn: "SS Fan Nozzle", cat: "nozzle", spec: "316L/65°/2.5L/min", qty: 20, min: 5, price: 85, life: 5000, lead: 10 },
      { code: "SP-PUMP-IMP", name: "磁力泵叶轮", nameEn: "Mag Pump Impeller", cat: "pump", spec: "PVDF/φ120", qty: 2, min: 1, price: 1200, life: 8000, lead: 21 },
      { code: "SP-SENSOR-PT", name: "PT100温度传感器", nameEn: "PT100 Temp Sensor", cat: "sensor", spec: "PT100/3线/L=200mm", qty: 4, min: 2, price: 320, life: 10000, lead: 7 },
      { code: "SP-HEATER-3K", name: "浸没式加热管 3kW", nameEn: "Immersion Heater 3kW", cat: "heater", spec: "3kW/316L/法兰", qty: 2, min: 1, price: 680, life: 6000, lead: 14 },
      { code: "SP-TRANS-28K", name: "超声波换能器 28kHz", nameEn: "Ultrasonic Transducer 28kHz", cat: "ultrasonic", spec: "28kHz/60W/PZT", qty: 6, min: 2, price: 520, life: 12000, lead: 21 },
    ];

    let eqCount = 0;
    for (const cust of customers) {
      const userRes = await client.query('SELECT id, name FROM users WHERE "openId" = $1', [cust.openId]);
      if (userRes.rows.length === 0) { console.log("Skip:", cust.company, "(no user)"); continue; }
      const userId = userRes.rows[0].id;

      for (let i = 0; i < cust.models.length; i++) {
        eqCount++;
        const eqCode = `GRT-${cust.models[i]}-2026-${String(eqCount).padStart(3, "0")}`;

        // Insert equipment
        const eqRes = await client.query(`
          INSERT INTO customer_equipment (customer_id, customer_company, equipment_code, equipment_model, equipment_name,
            serial_number, delivery_date, warranty_expiry, install_location, health_score, status,
            total_running_hours, next_pm_date, remote_access_enabled)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'running', $11, $12, true)
          ON CONFLICT (equipment_code) DO NOTHING RETURNING id
        `, [userId, cust.company, eqCode, cust.models[i], cust.names[i],
            `SN${cust.models[i].replace("-","")}-${2025+i}${String(Math.floor(Math.random()*9000+1000))}`,
            new Date(2025, 6+i, 15), new Date(2027, 6+i, 15),
            `${cust.company} 生产车间${i+1}区`,
            (90 + Math.random()*10).toFixed(1),
            (1200 + Math.random()*3000).toFixed(0),
            new Date(2026, 3+i*3, 15)]);

        if (eqRes.rows.length === 0) continue;
        const eqId = eqRes.rows[0].id;

        // Insert spare parts
        for (const sp of SPARE_PARTS) {
          const stock = Math.max(0, sp.qty - Math.floor(Math.random() * 4));
          await client.query(`
            INSERT INTO customer_spare_parts (equipment_id, part_code, part_name, part_name_en, category,
              specification, delivered_qty, current_stock, min_stock_level,
              recommended_purchase_qty, unit_price, lead_time_days, life_expectancy_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [eqId, `${eqCode}-${sp.code}`, sp.name, sp.nameEn, sp.cat,
              sp.spec, sp.qty, stock, sp.min,
              stock < sp.min ? sp.min * 2 : null,
              sp.price, sp.lead, sp.life]);
        }

        // Insert PM plans
        const pmPlans = [
          { code: `PM-${eqCode}-D`, name: "每日点检", type: "daily", days: 1, checklist: [
            {item:"液位检查",method:"目视",standard:"在标记线范围内"},
            {item:"温度确认",method:"HMI读数",standard:"±2°C设定值"},
            {item:"过滤器压差",method:"压差表",standard:"<0.3bar"},
          ]},
          { code: `PM-${eqCode}-W`, name: "每周保养", type: "weekly", days: 7, checklist: [
            {item:"清洗液浓度检测",method:"折光仪",standard:"3-5%"},
            {item:"喷嘴检查与清洗",method:"目视+通针",standard:"无堵塞"},
            {item:"传动链条张紧度",method:"手动检查",standard:"下压10-15mm"},
          ]},
          { code: `PM-${eqCode}-M`, name: "月度保养", type: "monthly", days: 30, grt: true, checklist: [
            {item:"过滤芯更换",method:"拆卸更换",standard:"每月或压差>0.5bar",spareParts:"SP-FILTER-5U"},
            {item:"密封圈检查",method:"目视",standard:"无裂纹/变形",spareParts:"SP-SEAL-VIT"},
            {item:"超声波功率检测",method:"功率计",standard:"额定±5%"},
            {item:"安全装置测试",method:"模拟触发",standard:"3秒内响应"},
          ]},
          { code: `PM-${eqCode}-Q`, name: "季度大保养", type: "quarterly", days: 90, grt: true, checklist: [
            {item:"全面清洗液更换",method:"排放+注入",standard:"新液配比",estimatedMinutes:120},
            {item:"换能器性能测试",method:"阻抗分析仪",standard:"频率偏差<1%",spareParts:"SP-TRANS-28K"},
            {item:"泵浦叶轮检查",method:"拆卸检查",standard:"无磨损/腐蚀",spareParts:"SP-PUMP-IMP"},
            {item:"电气接线紧固",method:"力矩扳手",standard:"按规定力矩"},
            {item:"PLC程序备份",method:"下载备份",standard:"版本号记录"},
          ]},
        ];

        for (const pm of pmPlans) {
          const scheduled = new Date();
          scheduled.setDate(scheduled.getDate() + pm.days);
          await client.query(`
            INSERT INTO customer_pm_plans (equipment_id, plan_code, plan_name, plan_type,
              interval_days, checklist_json, scheduled_date, status,
              grt_support_required, grt_support_contact)
            VALUES ($1, $2, $3, $4, $5, $6::json, $7, 'scheduled', $8, $9)
          `, [eqId, pm.code, pm.name, pm.type, pm.days,
              JSON.stringify(pm.checklist), scheduled,
              pm.grt || false, pm.grt ? "匡凯旋 (售后服务主管)" : null]);
        }

        // Insert sample repair record
        await client.query(`
          INSERT INTO customer_repair_records (equipment_id, repair_code, fault_description,
            fault_category, severity, reported_by, reported_at,
            executor, executor_type, completed_at, downtime_hours,
            root_cause, solution, preventive_measure,
            parts_used_json, grt_remote_support_used, grt_support_engineer,
            camera_session_used, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15::json, true, $16, true, 'completed')
        `, [eqId, `REP-${eqCode}-001`,
            "清洗后工件表面残留水渍，干燥效果不佳",
            "mechanical", "medium",
            "客户设备操作员", new Date(2026, 1, 15),
            "匡凯旋", "grt_remote",
            new Date(2026, 1, 15), 2.5,
            "热风干燥管道积水，影响干燥气流均匀性",
            "清理干燥管道积水，调整热风温度至85°C，增加吹气时间5秒",
            "每周检查干燥管道排水口，冬季加强预热程序",
            JSON.stringify([{partCode:"SP-NOZZLE-SS",partName:"不锈钢扇形喷嘴",qty:2,fromStock:true}]),
            "匡凯旋"]);

        // Health log
        for (let m = 0; m < 3; m++) {
          const date = new Date(); date.setMonth(date.getMonth() - m);
          await client.query(`
            INSERT INTO customer_equipment_health_log (equipment_id, recorded_at, health_score, source, notes)
            VALUES ($1, $2, $3, $4, $5)
          `, [eqId, date, (92 + Math.random()*8).toFixed(1),
              m === 0 ? "ai_prediction" : "pm_inspection",
              m === 0 ? "AI 16维自动评估" : "保养后检查"]);
        }
      }
    }

    console.log(`[OK] ${eqCount} equipment + spare parts + PM plans + repair records seeded`);
    console.log("\n" + "=".repeat(50));
    console.log("  CUSTOMER EQUIPMENT DATABASE READY");
    console.log("=".repeat(50));

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
