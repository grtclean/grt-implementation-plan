/**
 * 8D & CAPA Demo Data Seed Script
 *
 * Seeds realistic demo data into the 8D and CAPA tables for the GRT System CEO demo.
 *
 * Tables seeded:
 *   1. eight_d_reports  — 6 reports at various stages (open -> D8/closed)
 *   2. capa_records     — 8 CAPA records (corrective + preventive)
 *
 * Usage:
 *   npx tsx scripts/seed-8d-capa-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  8D & CAPA Demo Data Seed Script");
  console.log("  GRT 8D/CAPA — CEO Demo 数据初始化");
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
    // ---- Check for existing data ----
    const existing = await client.query(
      `SELECT id FROM eight_d_reports WHERE report_code = '8D-2026-001' LIMIT 1`
    );
    if (existing.rows.length > 0) {
      console.log("[SKIP] 8D demo data already exists (8D-2026-001 found). Exiting.");
      return;
    }

    // ---- Look up real user IDs for FK integrity ----
    console.log("[LOOKUP] Querying users table for real IDs...");
    const userResult = await client.query(
      `SELECT id, name FROM users LIMIT 5`
    );
    if (userResult.rows.length === 0) {
      console.error("[FATAL] No users found in users table. Ensure users are seeded first.");
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

    // Look up a project_id if available
    const projResult = await client.query(
      `SELECT id, name FROM projects WHERE name ILIKE '%detroit%' OR name ILIKE '%清洗%' LIMIT 1`
    );
    let projectId: number | null = null;
    if (projResult.rows.length > 0) {
      projectId = projResult.rows[0].id;
      console.log(`[LOOKUP] Found project: id=${projectId} name=${projResult.rows[0].name}`);
    } else {
      const anyProj = await client.query(`SELECT id, name FROM projects LIMIT 1`);
      if (anyProj.rows.length > 0) {
        projectId = anyProj.rows[0].id;
        console.log(`[LOOKUP] Using project: id=${projectId} name=${anyProj.rows[0].name}`);
      } else {
        console.log("[LOOKUP] No projects found, proceeding without project_id.");
      }
    }
    console.log();

    // ---- Begin Transaction ----
    await client.query("BEGIN");
    console.log("[TX] Transaction started.");
    console.log();

    const now = new Date().toISOString();

    // ========================================================================
    // 1. Insert eight_d_reports
    // ========================================================================
    console.log("[8D] Inserting 6 eight_d_reports...");

    // Map report_code -> inserted id
    const reportIdMap: Record<string, number> = {};

    // -----------------------------------------------------------------------
    // 8D-2026-001: Detroit清洗线高压泵异常振动 (critical, D6)
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_id, customer_name, part_number, defect_quantity,
           team_leader_id, team_members,
           d2_description, d2_is_what, d2_is_not_what,
           d3_containment_actions, d3_implemented_at,
           d4_root_causes, d4_analysis_method, d4_verification_data,
           d5_corrective_actions,
           d6_implementation_date, d6_verification_result, d6_effectiveness_data,
           d7_prevention_actions, d7_system_changes,
           d8_lessons_learned, d8_team_recognition, d8_closure_date,
           current_step, due_date, closed_at, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17,
           $18, $19, $20,
           $21,
           $22, $23, $24,
           $25, $26,
           $27, $28, $29,
           $30, $31, $32, $33, $34, $35)
         RETURNING id`,
        [
          '8D-2026-001', projectId,
          'Detroit清洗线高压泵异常振动',
          '客户Detroit Engine Corp现场报告：高压清洗泵在连续运行45分钟后出现异常振动，振幅超标影响清洗质量。',
          'critical', 'internal_audit',
          null, 'Detroit Engine Corp', 'GRT-HP-2200', 3,
          userId1, JSON.stringify(['张海', '杜显文', '李兴伟']),
          '高压清洗泵在运行45min后出现异常振动，振幅超过4.5mm/s（标准≤2.5mm/s）',
          '高压清洗泵型号GRT-HP-2200，运行45min后振动值从1.8mm/s上升至4.5mm/s',
          '低压泵和中压泵运行正常，振动值在标准范围内；泵在空载测试时振动正常',
          JSON.stringify(['临时降低泵压至12MPa运行', '增加振动监测频率至每15min一次']),
          '2026-01-20T08:00:00.000Z',
          JSON.stringify(['泵轴承润滑油温度过高导致轴承间隙增大', '进水过滤器堵塞率超70%引起气蚀']),
          '5why', '拆检发现轴承内圈有明显磨损痕迹，游隙从C3级增大至C4级；过滤器压差达到0.35MPa（标准≤0.15MPa）',
          JSON.stringify(['更换SKF高温轴承6308-2RS', '增加二级过滤器（25μm精度）']),
          '2026-02-05T10:00:00.000Z',
          '振幅降至1.2mm/s，连续运行8h无异常',
          '连续72小时监测数据：平均振幅1.15mm/s，最大值1.35mm/s，均远低于2.5mm/s标准线',
          null, null,
          null, null, null,
          'D6', '2026-02-28T18:00:00.000Z', null,
          userId1, now, now,
        ]
      );
      reportIdMap['8D-2026-001'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-001 "Detroit清洗线高压泵异常振动" -> id=${res.rows[0].id} (critical, D6)`);
    }

    // -----------------------------------------------------------------------
    // 8D-2026-002: 喷嘴堵塞导致清洗不良 (high, D4)
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_id, customer_name, part_number, defect_quantity,
           team_leader_id, team_members,
           d2_description, d2_is_what, d2_is_not_what,
           d3_containment_actions, d3_implemented_at,
           d4_root_causes, d4_analysis_method, d4_verification_data,
           current_step, due_date, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17,
           $18, $19, $20,
           $21, $22, $23, $24, $25)
         RETURNING id`,
        [
          '8D-2026-002', projectId,
          '喷嘴堵塞导致清洗不良',
          '一汽集团客户反馈：V型喷嘴在连续运行200h后出现堵塞，清洗质量不合格率上升至5%。',
          'high', 'customer_complaint',
          null, '一汽集团', 'GRT-NZ-0850', 12,
          userId2, JSON.stringify(['王强', '陈明', '赵伟']),
          'V型喷嘴在连续运行200h后出现5%堵塞率，导致缸体内腔残留切削液超标',
          'V型喷嘴GRT-NZ-0850，200h运行后流量下降15%，清洗压力从100bar降至85bar',
          '扇形喷嘴和锥形喷嘴无堵塞现象；新喷嘴安装后前100h运行正常',
          JSON.stringify(['临时切换备用喷嘴组', '加装在线压差监测']),
          '2026-02-10T14:00:00.000Z',
          JSON.stringify(['切削液残渣颗粒>50μm未被过滤', '喷嘴内壁粗糙度Ra>1.6导致沉积']),
          'fishbone', '使用内窥镜检查发现喷嘴内壁有0.3mm厚的沉积层，主要成分为铝合金切削屑和切削液残渣',
          'D4', '2026-03-15T18:00:00.000Z',
          userId2, now, now,
        ]
      );
      reportIdMap['8D-2026-002'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-002 "喷嘴堵塞导致清洗不良" -> id=${res.rows[0].id} (high, D4)`);
    }

    // -----------------------------------------------------------------------
    // 8D-2026-003: PLC通信中断导致生产停机 (critical, D8/closed)
    // -----------------------------------------------------------------------
    {
      const closedAt = '2026-02-15T16:30:00.000Z';
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_id, customer_name, part_number, defect_quantity,
           team_leader_id, team_members,
           d2_description, d2_is_what, d2_is_not_what,
           d3_containment_actions, d3_implemented_at,
           d4_root_causes, d4_analysis_method, d4_verification_data,
           d5_corrective_actions,
           d6_implementation_date, d6_verification_result, d6_effectiveness_data,
           d7_prevention_actions, d7_system_changes,
           d8_lessons_learned, d8_team_recognition, d8_closure_date,
           current_step, due_date, closed_at, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17,
           $18, $19, $20,
           $21,
           $22, $23, $24,
           $25, $26,
           $27, $28, $29,
           $30, $31, $32, $33, $34, $35)
         RETURNING id`,
        [
          '8D-2026-003', projectId,
          'PLC通信中断导致生产停机',
          '现场PLC与SCADA系统之间Profinet通信频繁中断，导致产线紧急停机3次，累计停机4.5小时。',
          'critical', 'field_return',
          null, 'Detroit Engine Corp', 'GRT-PLC-S71500', 0,
          userId3, JSON.stringify(['李兴伟', '张海', '周磊', '王刚']),
          'PLC（S7-1500）与SCADA系统之间Profinet通信在高负载时段（上午9-11点）频繁中断，每次中断持续30-90秒',
          'Profinet通信在CPU负载>75%时出现丢包，通信中断后PLC进入安全停机模式',
          '以太网点对点通信正常；PLC与HMI之间通信无中断；低负载时段通信稳定',
          JSON.stringify(['临时降低SCADA采集频率从100ms至500ms', '增加通信watchdog超时时间至5秒', '安排专人现场值守监控通信状态']),
          '2026-01-15T10:00:00.000Z',
          JSON.stringify(['交换机端口auto-negotiation设置错误导致速率不匹配', 'Profinet实时通道与IT网络流量未隔离']),
          '5why', '网络抓包分析显示：通信中断时交换机端口速率在100M/1G之间切换；VLAN划分不当导致IT流量占用RT通道带宽',
          JSON.stringify(['将交换机端口固定为1Gbps全双工', '配置独立VLAN隔离Profinet实时通信', '升级PLC固件至V2.9.4支持冗余通信']),
          '2026-01-28T14:00:00.000Z',
          '连续运行14天零通信中断，CPU负载高峰期通信延迟<2ms',
          '14天监测数据：通信成功率100%，平均延迟0.8ms，最大延迟1.6ms；CPU高负载时段无任何丢包',
          JSON.stringify(['将Profinet通信配置纳入标准调试检查清单', '所有新项目强制执行网络隔离方案', '增加通信质量月度巡检项']),
          '更新《GRT-SOP-NET-001 工业网络配置标准》V2.0，新增Profinet专用VLAN配置要求和交换机端口固定速率配置规范',
          '1. 工业网络配置必须在调试阶段做专项验证，不能依赖auto-negotiation\n2. IT网络和OT网络必须物理或逻辑隔离\n3. 通信watchdog参数需根据现场实际负载调优',
          '感谢李兴伟带领团队在5天内完成根因分析和方案验证，张海在现场连续值守3天保障生产',
          '2026-02-15T16:30:00.000Z',
          'closed', '2026-02-20T18:00:00.000Z', closedAt,
          userId3, '2026-01-10T08:00:00.000Z', now,
        ]
      );
      reportIdMap['8D-2026-003'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-003 "PLC通信中断导致生产停机" -> id=${res.rows[0].id} (critical, closed)`);
    }

    // -----------------------------------------------------------------------
    // 8D-2026-004: 输送链条张力异常 (medium, D2)
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_name, part_number, defect_quantity,
           team_leader_id, team_members,
           d2_description, d2_is_what,
           current_step, due_date, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9,
           $10, $11,
           $12, $13,
           $14, $15, $16, $17, $18)
         RETURNING id`,
        [
          '8D-2026-004', projectId,
          '输送链条张力异常',
          '输送链条在运行2000h后张力超出规格范围，链条伸长量达到1.5%（标准≤1.0%），存在跳齿风险。',
          'medium', 'internal_audit',
          'Detroit Engine Corp', 'GRT-CV-3600', 1,
          userId4, JSON.stringify(['杜显文', '赵伟']),
          '输送链条型号GRT-CV-3600在累计运行2000h后，实测张力偏差+15%，链条伸长量达1.5%（标准≤1.0%）',
          '输送链条在满载工件输送时出现间歇性卡顿，链条张紧器已达到最大调节行程',
          'D2', '2026-03-31T18:00:00.000Z',
          userId4, now, now,
        ]
      );
      reportIdMap['8D-2026-004'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-004 "输送链条张力异常" -> id=${res.rows[0].id} (medium, D2)`);
    }

    // -----------------------------------------------------------------------
    // 8D-2026-005: HMI触摸屏响应延迟 (low, open)
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_name, part_number,
           current_step, due_date, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8,
           $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          '8D-2026-005', projectId,
          'HMI触摸屏响应延迟',
          '操作人员反馈HMI触摸屏在切换画面时响应延迟约2-3秒，影响操作效率。偶发现象，重启后暂时恢复正常。',
          'low', 'internal_audit',
          'Detroit Engine Corp', 'GRT-HMI-TP1500',
          'open', '2026-04-30T18:00:00.000Z',
          userId5, now, now,
        ]
      );
      reportIdMap['8D-2026-005'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-005 "HMI触摸屏响应延迟" -> id=${res.rows[0].id} (low, open)`);
    }

    // -----------------------------------------------------------------------
    // 8D-2026-006: 清洗液浓度自动检测偏差 (high, D5)
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO eight_d_reports
          (report_code, project_id, title, problem_description, severity, source,
           customer_id, customer_name, part_number, defect_quantity,
           team_leader_id, team_members,
           d2_description, d2_is_what, d2_is_not_what,
           d3_containment_actions, d3_implemented_at,
           d4_root_causes, d4_analysis_method, d4_verification_data,
           d5_corrective_actions,
           current_step, due_date, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17,
           $18, $19, $20,
           $21,
           $22, $23, $24, $25, $26)
         RETURNING id`,
        [
          '8D-2026-006', projectId,
          '清洗液浓度自动检测偏差',
          '清洗液在线浓度检测仪读数与实验室手动滴定结果偏差超过±8%（允许±3%），导致浓度补液不准确。',
          'high', 'customer_complaint',
          null, '上汽通用', 'GRT-CS-5000', 0,
          userId2, JSON.stringify(['陈明', '李兴伟', '王强']),
          '清洗液在线浓度检测仪（折光仪型）读数与实验室滴定法结果偏差达±8%，浓度补液系统依据错误读数过量补液',
          '折光仪检测值偏高8%，导致补液系统少补液，实际浓度低于工艺要求的3%下限',
          '温度补偿功能正常；检测仪在纯水校准时读数准确；其他产线同型号检测仪无偏差',
          JSON.stringify(['临时恢复人工每2h滴定检测', '锁定自动补液功能改为手动补液']),
          '2026-02-12T09:00:00.000Z',
          JSON.stringify(['折光仪棱镜表面被清洗液中的油污附着导致光折射率变化', '传感器安装位置处于气泡聚集区域影响测量']),
          'fishbone', '拆检发现棱镜表面有0.1mm厚的油膜；改变安装位置后气泡干扰消除，读数偏差降至±1.5%',
          JSON.stringify(['更换耐油污涂层棱镜传感器', '将传感器安装位置从管道顶部移至侧面45°', '增加自动清洗喷头每4h清洗棱镜表面']),
          'D5', '2026-03-10T18:00:00.000Z',
          userId2, '2026-02-08T08:00:00.000Z', now,
        ]
      );
      reportIdMap['8D-2026-006'] = res.rows[0].id;
      console.log(`  [8D] 8D-2026-006 "清洗液浓度自动检测偏差" -> id=${res.rows[0].id} (high, D5)`);
    }

    console.log(`[8D] Inserted 6 eight_d_reports.`);
    console.log();

    // ========================================================================
    // 2. Insert capa_records
    // ========================================================================
    console.log("[CAPA] Inserting 8 capa_records...");

    // -----------------------------------------------------------------------
    // CAPA-C-001: corrective, linked to 8D-2026-001, implemented
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date, completion_date,
           verification_method, verification_result, effectiveness_check,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19)
         RETURNING id`,
        [
          'CAPA-C-001', reportIdMap['8D-2026-001'], projectId,
          'corrective', '更换高温轴承',
          '将高压泵轴承从标准6308轴承更换为SKF高温系列6308-2RS，工作温度范围扩展至150°C，游隙等级C3',
          '泵轴承润滑油温度过高导致轴承间隙增大，振动超标',
          JSON.stringify(['采购SKF 6308-2RS高温轴承（数量4套）', '安排停机窗口更换轴承', '更换后进行动平衡校验', '连续运行8h验证振动值']),
          userId1, userName1,
          '2026-02-10T18:00:00.000Z', '2026-02-05T16:00:00.000Z',
          '振动频谱分析+连续运行监测',
          '更换后振幅从4.5mm/s降至1.2mm/s，满足≤2.5mm/s标准',
          null,
          'implemented', userId1, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-C-001 "更换高温轴承" -> id=${res.rows[0].id} (corrective, implemented)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-C-002: corrective, linked to 8D-2026-001, verified
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date, completion_date,
           verification_method, verification_result, effectiveness_check,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19)
         RETURNING id`,
        [
          'CAPA-C-002', reportIdMap['8D-2026-001'], projectId,
          'corrective', '增加二级过滤器',
          '在高压泵进水管路增加二级精密过滤器（25μm精度），防止大颗粒杂质进入泵体引起气蚀',
          '进水过滤器堵塞率超70%引起气蚀，原有50μm过滤器精度不足',
          JSON.stringify(['选型25μm精密过滤器（不锈钢烧结滤芯）', '设计安装支架和管路连接方案', '安装并做压力测试', '监测过滤器前后压差连续72h']),
          userId3, userName3,
          '2026-02-08T18:00:00.000Z', '2026-02-06T10:00:00.000Z',
          '过滤器前后压差监测+水质颗粒度检测',
          '过滤后水质颗粒度<15μm，过滤器压差稳定在0.05MPa（远低于0.15MPa报警线）',
          '连续30天运行数据表明：泵进水颗粒度持续<15μm，气蚀现象完全消除，振动值稳定在1.0-1.3mm/s',
          'verified', userId1, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-C-002 "增加二级过滤器" -> id=${res.rows[0].id} (corrective, verified)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-P-001: preventive, linked to 8D-2026-001, action_planned
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11,
           $12, $13, $14, $15)
         RETURNING id`,
        [
          'CAPA-P-001', reportIdMap['8D-2026-001'], projectId,
          'preventive', '建立泵组预防性维护计划',
          '基于此次故障经验，建立高压泵组的预防性维护计划，包含定期轴承检测、润滑油更换、过滤器清洗等维保项目',
          '缺乏系统性的泵组预防性维护机制，故障发现依赖操作人员经验',
          JSON.stringify([
            '编制《高压泵组预防性维护SOP》',
            '制定维护周期表（日检/周检/月检/季度大保养）',
            '配置振动在线监测系统（连续采集+阈值报警）',
            '建立备件安全库存（轴承2套、密封件4套、过滤芯8个）',
            '培训操作人员识别异常振动和异响',
          ]),
          userId4, userName4,
          '2026-03-15T18:00:00.000Z',
          'action_planned', userId1, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-P-001 "建立泵组预防性维护计划" -> id=${res.rows[0].id} (preventive, action_planned)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-C-003: corrective, linked to 8D-2026-002, investigation
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11,
           $12, $13, $14, $15)
         RETURNING id`,
        [
          'CAPA-C-003', reportIdMap['8D-2026-002'], projectId,
          'corrective', '喷嘴内壁抛光处理',
          '对V型喷嘴内壁进行电化学抛光处理，将粗糙度从Ra1.6降至Ra0.4，减少切削液残渣沉积',
          '喷嘴内壁粗糙度Ra>1.6导致切削液残渣沉积，运行200h后堵塞率达5%',
          JSON.stringify([
            '联系喷嘴供应商评估内壁抛光可行性',
            '试制3只抛光喷嘴进行200h耐久测试',
            '对比抛光前后堵塞率数据',
            '确认抛光工艺不影响喷嘴流量特性',
          ]),
          userId2, userName2,
          '2026-03-20T18:00:00.000Z',
          'investigation', userId2, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-C-003 "喷嘴内壁抛光处理" -> id=${res.rows[0].id} (corrective, investigation)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-C-004: corrective, linked to 8D-2026-003, closed
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date, completion_date,
           verification_method, verification_result, effectiveness_check,
           status, closed_by, closed_at, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19, $20, $21)
         RETURNING id`,
        [
          'CAPA-C-004', reportIdMap['8D-2026-003'], projectId,
          'corrective', 'PLC冗余通信模块升级',
          '为PLC系统升级冗余Profinet通信模块，配置主/备双通道切换机制，确保单通道故障时自动切换无感知',
          '交换机端口auto-negotiation设置错误导致速率不匹配，Profinet实时通道与IT网络流量未隔离',
          JSON.stringify([
            '采购CP1543-1冗余通信模块',
            '配置Profinet主/备双通道',
            '设置交换机端口固定1Gbps全双工',
            '配置独立VLAN隔离Profinet RT通信',
            '进行14天连续运行验证',
          ]),
          userId3, userName3,
          '2026-02-10T18:00:00.000Z', '2026-02-08T15:00:00.000Z',
          '网络抓包分析+连续14天通信质量监测',
          '14天零通信中断，通信成功率100%，平均延迟0.8ms，最大延迟1.6ms',
          '升级后累计运行30天无通信故障，CPU高负载期间通信质量无下降，产线零停机',
          'closed', userId1, '2026-02-15T16:30:00.000Z',
          userId3, '2026-01-15T08:00:00.000Z', now,
        ]
      );
      console.log(`  [CAPA] CAPA-C-004 "PLC冗余通信模块升级" -> id=${res.rows[0].id} (corrective, closed)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-P-002: preventive, linked to 8D-2026-003, closed
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date, completion_date,
           verification_method, verification_result, effectiveness_check,
           status, closed_by, closed_at, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19, $20, $21)
         RETURNING id`,
        [
          'CAPA-P-002', reportIdMap['8D-2026-003'], projectId,
          'preventive', '建立通信心跳监测机制',
          '在SCADA层建立Profinet通信心跳监测机制，实时监控通信质量指标（延迟、丢包率、重传次数），异常时自动告警',
          '缺乏通信质量实时监控手段，通信故障发现延迟依赖产线停机报警',
          JSON.stringify([
            '开发SCADA通信心跳监测画面',
            '设置通信质量三级告警阈值（延迟>5ms/黄色、>10ms/橙色、中断/红色）',
            '配置告警推送至维护人员手机和邮箱',
            '编制《通信故障应急处理手册》',
            '纳入月度巡检项目',
          ]),
          userId3, userName3,
          '2026-02-15T18:00:00.000Z', '2026-02-14T11:00:00.000Z',
          '模拟通信故障测试+告警响应时间验证',
          '模拟断线后3秒内触发告警，维护人员平均5分钟内响应，告警推送成功率100%',
          '上线以来累计捕获2次短暂通信波动（延迟>5ms），均在自动恢复前完成告警推送，维护人员确认无需干预',
          'closed', userId1, '2026-02-15T16:30:00.000Z',
          userId3, '2026-01-18T08:00:00.000Z', now,
        ]
      );
      console.log(`  [CAPA] CAPA-P-002 "建立通信心跳监测机制" -> id=${res.rows[0].id} (preventive, closed)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-C-005: corrective, linked to 8D-2026-006, action_planned
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11,
           $12, $13, $14, $15)
         RETURNING id`,
        [
          'CAPA-C-005', reportIdMap['8D-2026-006'], projectId,
          'corrective', '更换浓度传感器',
          '更换清洗液浓度检测传感器为耐油污涂层棱镜型号，同时调整安装位置至管道侧面45°避开气泡聚集区',
          '折光仪棱镜表面被油污附着导致光折射率变化，且传感器安装在气泡聚集区域',
          JSON.stringify([
            '选型耐油污涂层折光仪传感器（3家供应商比价）',
            '设计新安装支架（管道侧面45°位置）',
            '安装自动清洗喷头（每4h清洗棱镜表面）',
            '校准验证：与实验室滴定法对比偏差≤±2%',
            '连续7天监测数据确认稳定性',
          ]),
          userId2, userName2,
          '2026-03-10T18:00:00.000Z',
          'action_planned', userId2, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-C-005 "更换浓度传感器" -> id=${res.rows[0].id} (corrective, action_planned)`);
    }

    // -----------------------------------------------------------------------
    // CAPA-P-003: preventive, standalone (no 8D link), open
    // -----------------------------------------------------------------------
    {
      const res = await client.query(
        `INSERT INTO capa_records
          (capa_code, eight_d_report_id, project_id, capa_type, title, description,
           root_cause, action_plan, responsible_id, responsible_name,
           target_date,
           status, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11,
           $12, $13, $14, $15)
         RETURNING id`,
        [
          'CAPA-P-003', null, projectId,
          'preventive', '季度传感器校准计划',
          '建立所有产线传感器（温度、压力、流量、浓度、振动）的季度校准计划，确保测量精度持续满足工艺要求',
          '多次质量问题根因指向传感器精度偏移，缺乏系统性的传感器校准管理机制',
          JSON.stringify([
            '盘点所有产线传感器清单（预计120+个）',
            '按传感器类型制定校准方法和精度要求',
            '编制季度校准计划排程表',
            '采购便携式校准设备（压力校验仪、温度校验炉等）',
            '培训2名专职校准技术员',
            '建立校准记录电子台账',
          ]),
          userId5, userName5,
          '2026-04-30T18:00:00.000Z',
          'open', userId5, now, now,
        ]
      );
      console.log(`  [CAPA] CAPA-P-003 "季度传感器校准计划" -> id=${res.rows[0].id} (preventive, open)`);
    }

    console.log(`[CAPA] Inserted 8 capa_records.`);
    console.log();

    // ---- Commit Transaction ----
    await client.query("COMMIT");
    console.log("[TX] Transaction committed successfully.");
    console.log();

    // ---- Verification ----
    console.log("=".repeat(60));
    console.log("  Verification / 验证结果");
    console.log("=".repeat(60));
    console.log();

    const reportStats = await client.query(
      `SELECT current_step, severity, COUNT(*) AS cnt
       FROM eight_d_reports
       GROUP BY current_step, severity
       ORDER BY current_step, severity`
    );
    console.log("  8D Reports by step & severity:");
    for (const row of reportStats.rows) {
      console.log(`    Step=${String(row.current_step).padEnd(8)} Severity=${String(row.severity).padEnd(10)} Count=${row.cnt}`);
    }
    console.log();

    const capaStats = await client.query(
      `SELECT capa_type, status, COUNT(*) AS cnt
       FROM capa_records
       GROUP BY capa_type, status
       ORDER BY capa_type, status`
    );
    console.log("  CAPA Records by type & status:");
    for (const row of capaStats.rows) {
      console.log(`    Type=${String(row.capa_type).padEnd(12)} Status=${String(row.status).padEnd(16)} Count=${row.cnt}`);
    }
    console.log();

    const linkedCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM capa_records WHERE eight_d_report_id IS NOT NULL`
    );
    const standaloneCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM capa_records WHERE eight_d_report_id IS NULL`
    );
    console.log(`  CAPA linked to 8D: ${linkedCount.rows[0].cnt}`);
    console.log(`  CAPA standalone:   ${standaloneCount.rows[0].cnt}`);
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
  console.log("  8D & CAPA seed complete!");
  console.log("=".repeat(60));
}

main();
