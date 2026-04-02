/**
 * GRT 模块演示数据种子 — 为7个空模块注入数据
 *
 * 覆盖: MES派工/FMEA/控制计划/PPAP/仓库入出库/会议/培训
 * 用法: npx tsx scripts/seed-module-demo-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  try {
    await client.query("BEGIN");

    // ═══ 1. MES Dispatches (10条) + Quality Checks (5条) ═══
    const mesCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM mes_dispatches");
    if (Number(mesCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding MES dispatches...");
      await client.query(`
        INSERT INTO mes_dispatches (work_order_id, station_id, operator_id, operator_name, planned_start_time, actual_start_time, actual_end_time, cycle_time_seconds, status, quality_result, notes, created_at) VALUES
        (1, 1, 10, '吴卫成', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 3600, 'completed', 'pass', '行星齿轮轴加工', NOW() - INTERVAL '2 hours'),
        (2, 2, 16, '曹庆伟', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NULL, 0, 'in_progress', NULL, '半轴精磨', NOW() - INTERVAL '1 hour'),
        (3, 3, 39, '侯德朋', NOW() + INTERVAL '1 hour', NULL, NULL, 0, 'pending', NULL, '齿轮箱体粗加工', NOW()),
        (4, 1, 41, '张良', NOW() + INTERVAL '2 hours', NULL, NULL, 0, 'pending', NULL, '法兰盘车削', NOW()),
        (5, 4, 52, '赵强', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 3600, 'completed', 'pass', '输出轴精加工', NOW() - INTERVAL '3 hours'),
        (6, 2, 59, '焦斌', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 3600, 'completed', 'fail', '联轴器加工-发现毛刺', NOW() - INTERVAL '4 hours'),
        (7, 5, 31, '沈龙翔', NOW(), NOW(), NULL, 0, 'in_progress', NULL, '蜗杆加工', NOW()),
        (8, 3, 36, '韩品来', NOW() + INTERVAL '3 hours', NULL, NULL, 0, 'pending', NULL, '锥齿轮热处理', NOW()),
        (9, 6, 71, '刘琛杨', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', 3600, 'completed', 'pass', '花键轴加工', NOW() - INTERVAL '5 hours'),
        (10, 4, 72, '赵铖杰', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NULL, 0, 'in_progress', NULL, '减速器壳体镗孔', NOW() - INTERVAL '30 minutes')
      `);

      await client.query(`
        INSERT INTO mes_quality_checks (dispatch_id, station_id, operator_id, check_type, result, notes, created_at) VALUES
        (1, 1, 10, 'inline', 'pass', '尺寸合格，表面光洁度Ra0.8', NOW() - INTERVAL '90 minutes'),
        (5, 4, 52, 'final', 'pass', '全尺寸检测通过', NOW() - INTERVAL '2 hours'),
        (6, 2, 59, 'inline', 'fail', '表面毛刺超标，需返工', NOW() - INTERVAL '3 hours'),
        (9, 6, 71, 'final', 'pass', '花键配合检测OK', NOW() - INTERVAL '4 hours'),
        (1, 1, 10, 'first_piece', 'pass', '首件检测通过', NOW() - INTERVAL '2 hours')
      `);
      console.log("  ✓ MES: 10 dispatches + 5 quality checks");
    }

    // ═══ 2. FMEA Documents (3个) + Items (15个) ═══
    const fmeaCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM fmea_documents");
    if (Number(fmeaCheck.rows[0]?.cnt ?? 0) <= 1) {
      console.log("Seeding FMEA documents...");
      await client.query(`
        INSERT INTO fmea_documents (fmea_code, project_id, fmea_type, title, scope, product_name, process_name, status, revision, created_by, created_at, updated_at)
        VALUES
        ('FMEA-GS220-001', 1, 'process', '行星齿轮轴加工过程FMEA', '齿轮轴全工序', '行星齿轮轴 GS-220', '车削→磨削→热处理→精磨', 'active', 'B', 1, NOW() - INTERVAL '30 days', NOW()),
        ('FMEA-GB300-001', 1, 'design', '齿轮箱体设计FMEA', '箱体铸造+加工', '齿轮箱体 GB-300', '铸造→粗加工→精加工→装配', 'active', 'A', 1, NOW() - INTERVAL '20 days', NOW()),
        ('FMEA-CL100-001', 2, 'process', '清洗系统过程FMEA', '超声波清洗全流程', '8800T清洗系统', '预洗→超声波→漂洗→干燥', 'draft', 'A', 1, NOW() - INTERVAL '5 days', NOW())
        ON CONFLICT DO NOTHING
      `);

      await client.query(`
        INSERT INTO fmea_items (fmea_document_id, item_number, system_element, function_requirement, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, action_priority, current_prevention_control, current_detection_control, status, created_at, updated_at) VALUES
        (1, 1, '车削工序', '外径公差±0.01mm', '外径超差', '装配干涉，齿轮啮合不良', '刀具磨损', 8, 4, 5, 160, 'H', 'SPC监控', '百分表全检', 'open', NOW(), NOW()),
        (1, 2, '磨削工序', '表面粗糙度Ra0.8', '表面粗糙度超标', '齿面接触不良', '砂轮修整不及时', 7, 3, 4, 84, 'M', '定时修整', '粗糙度仪抽检', 'open', NOW(), NOW()),
        (1, 3, '热处理', '硬度HRC58-62', '硬度不均', '齿面早期磨损', '加热温度波动', 9, 2, 6, 108, 'H', '温控仪监测', '硬度计抽检', 'closed', NOW(), NOW()),
        (1, 4, '精磨工序', '跳动≤0.005mm', '跳动超差', '振动噪音大', '顶尖磨损', 7, 3, 3, 63, 'M', '定期更换顶尖', '跳动仪全检', 'open', NOW(), NOW()),
        (1, 5, '花键加工', '花键配合H7/h6', '花键过紧/过松', '装配困难/游隙大', '拉刀磨损', 8, 3, 4, 96, 'M', '拉刀寿命管理', '通止规检测', 'open', NOW(), NOW()),
        (2, 1, '铸造', '无气孔缩孔', '内部气孔', '箱体强度不足', '浇注温度不当', 9, 3, 7, 189, 'H', '工艺参数控制', 'X光探伤', 'open', NOW(), NOW()),
        (2, 2, '粗加工', '平面度≤0.05mm', '平面度超差', '密封面泄漏', '夹紧变形', 7, 4, 4, 112, 'H', '合理装夹', 'CMM测量', 'open', NOW(), NOW()),
        (2, 3, '镗孔', '孔径公差H7', '孔径超差', '轴承配合不良', '镗刀振动', 8, 3, 5, 120, 'H', '刚性刀杆', '气动塞规', 'open', NOW(), NOW()),
        (2, 4, '螺纹加工', 'M12×1.75 6H', '螺纹不合格', '螺栓松动', '丝锥磨损', 6, 2, 3, 36, 'L', '定期更换', '螺纹规检测', 'closed', NOW(), NOW()),
        (2, 5, '清洗', '清洁度≤5mg', '残留切屑', '装配异物卡滞', '清洗液浓度低', 7, 4, 5, 140, 'H', '浓度监控', '滤纸称重法', 'open', NOW(), NOW()),
        (3, 1, '预洗', '去除大颗粒', '清洗不彻底', '污染后续工序', '喷嘴堵塞', 6, 3, 4, 72, 'M', '定期清理喷嘴', '目视检查', 'open', NOW(), NOW()),
        (3, 2, '超声波', '空化效果充分', '超声波功率不足', '深孔清洗不净', '换能器老化', 8, 2, 5, 80, 'M', '功率监测', '清洁度抽检', 'open', NOW(), NOW()),
        (3, 3, '漂洗', '无化学残留', '漂洗水质差', '零件腐蚀', '纯水电导率高', 7, 3, 4, 84, 'M', '电导率在线监测', 'pH试纸检测', 'open', NOW(), NOW()),
        (3, 4, '真空干燥', '含水量≤0.1%', '干燥不充分', '零件生锈', '真空度不足', 7, 2, 4, 56, 'M', '真空计监控', '称重法检测', 'open', NOW(), NOW()),
        (3, 5, '防锈', '防锈期≥6个月', '防锈油覆盖不均', '局部锈蚀', '喷涂角度不当', 6, 3, 5, 90, 'M', '旋转喷涂', '盐雾试验抽检', 'open', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
      console.log("  ✓ FMEA: 3 documents + 15 items");
    }

    // ═══ 3. Control Plans (2个) + Items (10个) ═══
    const cpCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM control_plans");
    if (Number(cpCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding control plans...");
      const cpRes = await client.query(`
        INSERT INTO control_plans (plan_code, title, phase, revision, status, project_id, created_by, created_at, updated_at) VALUES
        ('CP-GS220-001', '行星齿轮轴加工控制计划', 'production', 'B', 'active', 1, 1, NOW() - INTERVAL '25 days', NOW()),
        ('CP-GB300-001', '齿轮箱体加工控制计划', 'pre_launch', 'A', 'active', 1, 1, NOW() - INTERVAL '15 days', NOW())
        RETURNING id
      `);
      const cpIds = cpRes.rows.map((r: any) => r.id);

      await client.query(`
        INSERT INTO control_plan_items (control_plan_id, item_number, process_step, process_number, machine_tool, characteristic_name, characteristic_type, specification, tolerance, evaluation_method, sample_size, sample_frequency, control_method, reaction_plan, created_at, updated_at) VALUES
        (${cpIds[0]}, 1, '车削外径', 'OP10', 'CNC车床 CK6140', '外径尺寸', 'product', 'Φ45h7', '±0.01mm', '千分尺', '5件', '每2小时', 'SPC X-R控制图', '停机调刀，100%全检', NOW(), NOW()),
        (${cpIds[0]}, 2, '磨削', 'OP20', '外圆磨床 M1420', '表面粗糙度', 'product', 'Ra0.8', 'N/A', '粗糙度仪', '3件', '每班', '粗糙度测试', '调整进给量', NOW(), NOW()),
        (${cpIds[0]}, 3, '热处理', 'OP30', '真空热处理炉', '表面硬度', 'product', 'HRC58-62', '±2HRC', '洛氏硬度计', '每炉3件', '每炉', '炉温记录仪', '重新热处理', NOW(), NOW()),
        (${cpIds[0]}, 4, '精磨', 'OP40', '高精度外圆磨', '圆跳动', 'product', '≤0.005mm', 'N/A', '跳动仪', '全检', '每件', '全检记录', '返工重磨', NOW(), NOW()),
        (${cpIds[0]}, 5, '花键拉削', 'OP50', '拉床 L6120', '花键配合', 'product', 'H7/h6', 'N/A', '通止规', '全检', '每件', '通止规检查', '更换拉刀', NOW(), NOW()),
        (${cpIds[1]}, 1, '铸造来料', 'IQC', 'X光机', '内部缺陷', 'product', '无气孔缩孔', 'N/A', 'X光探伤', 'AQL=0.65', '每批', '来料检验报告', '批次退货', NOW(), NOW()),
        (${cpIds[1]}, 2, '粗铣平面', 'OP10', 'CNC铣床 VMC850', '平面度', 'product', '≤0.05mm', 'N/A', 'CMM', '首件+末件', '每班', '首件检验', '调整夹具', NOW(), NOW()),
        (${cpIds[1]}, 3, '精镗', 'OP20', 'CNC镗床 TK6916', '孔径', 'product', 'Φ80H7', '0~+0.030mm', '气动塞规', '全检', '每件', '全检记录', '换刀补偿', NOW(), NOW()),
        (${cpIds[1]}, 4, '攻丝', 'OP30', '攻丝机', '螺纹', 'product', 'M12×1.75-6H', 'N/A', '螺纹通止规', 'AQL=0.25', '每50件', '抽检记录', '更换丝锥', NOW(), NOW()),
        (${cpIds[1]}, 5, '清洗', 'OP40', '超声波清洗线', '清洁度', 'product', '≤5mg', 'N/A', '滤纸称重法', '3件', '每班', '清洁度检测', '调整清洗参数', NOW(), NOW())
      `);
      console.log("  ✓ Control Plans: 2 plans + 10 items");
    }

    // ═══ 4. PPAP Submissions (2个) + Elements (36个) ═══
    const ppapCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM ppap_submissions");
    if (Number(ppapCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding PPAP...");
      const ppapRes = await client.query(`
        INSERT INTO ppap_submissions (submission_code, project_id, part_name, part_number, revision, customer_name, submission_level, status, created_by, created_at, updated_at) VALUES
        ('PPAP-GS220-001', 1, '行星齿轮轴 GS-220', 'GS-220-A', 'B', '一汽集团', '3', 'submitted', 1, NOW() - INTERVAL '10 days', NOW()),
        ('PPAP-GB300-001', 1, '齿轮箱体 GB-300', 'GB-300-A', 'A', '上汽通用', '3', 'reviewing', 1, NOW() - INTERVAL '5 days', NOW())
        RETURNING id
      `);
      const ppapIds = ppapRes.rows.map((r: any) => r.id);

      // 18 elements per submission
      const elements = [
        '设计记录', '工程变更文件', '客户工程批准', '设计FMEA',
        '过程流程图', '过程FMEA', '控制计划', 'MSA研究',
        '尺寸检测结果', '材料/性能检测结果', '初始过程研究',
        '合格实验室文件', '外观批准报告(AAR)', '样件',
        '标准样件', '检验辅具', '客户特殊要求', '零件提交保证书(PSW)'
      ];
      for (const ppapId of ppapIds) {
        for (let i = 0; i < elements.length; i++) {
          await client.query(`
            INSERT INTO ppap_elements (submission_id, element_number, element_name, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `, [ppapId, i + 1, elements[i], i < 12 ? 'approved' : 'pending']);
        }
      }
      console.log("  ✓ PPAP: 2 submissions + 36 elements");
    }

    // ═══ 5. Warehouse Receipts (3个) + Issues (2个) ═══
    const whCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM warehouse_receipts");
    if (Number(whCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding warehouse receipts/issues...");
      await client.query(`
        INSERT INTO warehouse_receipts ("receiptCode", "receiptType", "warehouseId", "supplierId", "supplierName", "poNumber", status, "totalQuantity", "receivedBy", "receivedByName", "receivedAt", "createdAt", "updatedAt") VALUES
        ('GR-20260401-001', 'purchase', 41, 1, '宁波精密铸造有限公司', 'PO-2026-0088', 'completed', 500, 1, '倪亚东', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
        ('GR-20260402-001', 'purchase', 41, 2, '苏州齿轮材料供应商', 'PO-2026-0092', 'completed', 200, 1, '倪亚东', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),
        ('GR-20260402-002', 'return', 42, 3, '上海轴承贸易公司', NULL, 'pending', 50, 1, '倪亚东', NOW(), NOW(), NOW())
      `);

      await client.query(`
        INSERT INTO warehouse_issues ("issueCode", "issueType", "warehouseId", "requesterId", "requesterName", "projectId", "projectCode", status, "totalQuantity", "issuedBy", "issuedByName", "issuedAt", "createdAt", "updatedAt") VALUES
        ('GI-20260401-001', 'production', 41, 6, '洪香龙', 1, 'PRJ-2026-001', 'completed', 100, 1, '倪亚东', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
        ('GI-20260402-001', 'production', 41, 38, '马林山', 1, 'PRJ-2026-001', 'pending', 80, NULL, NULL, NULL, NOW(), NOW())
      `);
      console.log("  ✓ Warehouse: 3 receipts + 2 issues");
    }

    // ═══ 6. Station Status (6条) ═══
    const ssCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM mes_station_status");
    if (Number(ssCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding station status...");
      await client.query(`
        INSERT INTO mes_station_status (station_id, station_code, station_name, current_operator_id, current_operator_name, status, shift_code, bu_code, updated_at) VALUES
        (1, 'ST-CNC-01', 'CNC车床1号', 10, '吴卫成', 'running', 'A', 'BU1', NOW()),
        (2, 'ST-GRD-01', '外圆磨床1号', 16, '曹庆伟', 'running', 'A', 'BU1', NOW()),
        (3, 'ST-HT-01', '热处理炉1号', NULL, NULL, 'idle', 'A', 'BU1', NOW()),
        (4, 'ST-CNC-02', 'CNC车床2号', 52, '赵强', 'running', 'A', 'BU1', NOW()),
        (5, 'ST-BRH-01', '拉床1号', 31, '沈龙翔', 'running', 'A', 'BU2', NOW()),
        (6, 'ST-CNC-03', 'CNC铣床1号', NULL, NULL, 'maintenance', 'B', 'BU2', NOW())
      `);
      console.log("  ✓ Station Status: 6 stations");
    }

    // ═══ 7. Training Assessments (3条) ═══
    const taCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM training_assessments");
    if (Number(taCheck.rows[0]?.cnt ?? 0) === 0) {
      console.log("Seeding training assessments...");
      await client.query(`
        INSERT INTO training_assessments (title, training_id, assessor_id, assessee_id, score, max_score, result, feedback, created_at, updated_at) VALUES
        ('CNC操作安全培训考核', 1, 5, 10, 92, 100, 'pass', '操作规范，安全意识强', NOW() - INTERVAL '7 days', NOW()),
        ('IATF16949质量体系培训', 2, 5, 16, 85, 100, 'pass', '基础扎实，需加强文件管理', NOW() - INTERVAL '3 days', NOW()),
        ('5S现场管理培训考核', 3, 38, 39, 68, 100, 'fail', '整理整顿理解不够，需补考', NOW() - INTERVAL '1 day', NOW())
      `);
      console.log("  ✓ Training: 3 assessments");
    }

    await client.query("COMMIT");
    console.log("\n✅ All module demo data seeded successfully!");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
