/**
 * Seed Digital Twin Hub demo data (raw pg, no Drizzle)
 * - 6 dt_assets (Detroit清洗线 project themed)
 * - 4 dt_robot_assembly_nodes for asset 1
 * - 8 iatf_audit_logs
 *
 * Idempotent: checks for existing data before inserting.
 *
 * Usage: npx tsx scripts/seed-digital-twin-data.ts
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("[seed-dt] Connected to database");

  try {
    // ── Idempotency check ──────────────────────────────
    const existing = await client.query(
      `SELECT id FROM dt_assets WHERE asset_name = '底架焊接总成.glb' LIMIT 1`
    );
    if (existing.rows.length > 0) {
      console.log("[seed-dt] Demo data already exists (底架焊接总成.glb found). Skipping.");
      await client.end();
      return;
    }

    // ── Look up real users for FK references ───────────
    const usersResult = await client.query(`SELECT id, name FROM users LIMIT 5`);
    const users = usersResult.rows;
    if (users.length === 0) {
      console.error("[seed-dt] No users found in database. Cannot seed without user FKs.");
      process.exit(1);
    }
    console.log(`[seed-dt] Found ${users.length} users: ${users.map((u: any) => u.name).join(", ")}`);

    // Helper to pick a user ID by index (wraps around)
    const uid = (i: number) => users[i % users.length].id;
    const uname = (i: number) => users[i % users.length].name;

    await client.query("BEGIN");

    // ── Seed 6 dt_assets ──────────────────────────────
    const assetRows = await client.query(`
      INSERT INTO dt_assets (
        project_code, asset_name, asset_number, version, version_string,
        file_format, storage_url, original_file_name,
        file_size_bytes, mime_type,
        sha256_hash, status, is_latest, design_frozen, design_frozen_at, design_frozen_by,
        vertex_count, face_count, bounding_box, thumbnail_url,
        owner_user_id, owner_name, tags, metadata, description,
        created_by, updated_by
      ) VALUES
      -- Asset 1: 底架焊接总成.glb
      (
        'DET-WL-2026', '底架焊接总成.glb', 'DT-MECH-00001', 3, 'V3.0',
        'glb', '/storage/dt/det-wl-2026/chassis-weld-assy-v3.glb', '底架焊接总成_V3.glb',
        48723456, 'model/gltf-binary',
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'released', TRUE, TRUE, NOW() - INTERVAL '5 days', ${uid(0)},
        284530, 142265, '{"minX":-1200,"minY":-50,"minZ":-800,"maxX":1200,"maxY":1600,"maxZ":800}', '/thumbnails/dt/chassis-weld-assy.png',
        ${uid(0)}, '${uname(0)}', '["焊接","底架","Detroit","清洗线"]'::json, '{"project":"Detroit清洗线","department":"机械设计","material":"Q345B"}', '底架焊接总成三维模型，包含主框架、侧板、横梁等结构件。Design frozen for production release.',
        ${uid(0)}, ${uid(0)}
      ),
      -- Asset 2: 喷淋系统3D模型.step
      (
        'DET-WL-2026', '喷淋系统3D模型.step', 'DT-MECH-00002', 2, 'V2.0',
        'step', '/storage/dt/det-wl-2026/spray-system-v2.step', '喷淋系统3D模型_V2.step',
        125890000, 'application/step',
        'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', 'released', TRUE, FALSE, NULL, NULL,
        NULL, NULL, NULL, '/thumbnails/dt/spray-system.png',
        ${uid(1)}, '${uname(1)}', '["喷淋","管路","Detroit","清洗线"]'::json, '{"project":"Detroit清洗线","department":"机械设计","pressure_bar":12}', '喷淋系统完整三维模型，含喷头分布、管路连接和阀体。STEP格式供CAD编辑。',
        ${uid(1)}, ${uid(1)}
      ),
      -- Asset 3: 电气柜布局图.sldasm
      (
        'DET-WL-2026', '电气柜布局图.sldasm', 'DT-ELEC-00001', 1, 'V1.0',
        'sldasm', '/storage/dt/det-wl-2026/elec-cabinet-layout-v1.sldasm', '电气柜布局图_V1.sldasm',
        67345000, 'application/sldasm',
        'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', 'pending_review', TRUE, FALSE, NULL, NULL,
        NULL, NULL, '{"minX":-400,"minY":0,"minZ":-300,"maxX":400,"maxY":2000,"maxZ":300}', NULL,
        ${uid(2)}, '${uname(2)}', '["电气","布局","柜体","Detroit"]'::json, '{"project":"Detroit清洗线","department":"电气设计","voltage":380}', '电气柜内部布局三维装配图，包含PLC、变频器、继电器等元器件定位。待审核。',
        ${uid(2)}, ${uid(2)}
      ),
      -- Asset 4: 传送带组件.stl
      (
        'DET-WL-2026', '传送带组件.stl', 'DT-MECH-00003', 1, 'V1.0',
        'stl', '/storage/dt/det-wl-2026/conveyor-assy-v1.stl', '传送带组件_V1.stl',
        31200000, 'application/sla',
        'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', 'draft', TRUE, FALSE, NULL, NULL,
        198400, 99200, '{"minX":-3000,"minY":-100,"minZ":-500,"maxX":3000,"maxY":400,"maxZ":500}', NULL,
        ${uid(3)}, '${uname(3)}', '["传送带","输送","Detroit","清洗线"]'::json, '{"project":"Detroit清洗线","department":"机械设计","beltWidth_mm":600}', '传送带输送组件STL网格模型，用于3D打印和初步装配验证。草稿阶段。',
        ${uid(3)}, ${uid(3)}
      ),
      -- Asset 5: 真空干燥腔体.glb
      (
        'DET-WL-2026', '真空干燥腔体.glb', 'DT-MECH-00004', 4, 'V4.0',
        'glb', '/storage/dt/det-wl-2026/vacuum-dryer-v4.glb', '真空干燥腔体_V4.glb',
        52100000, 'model/gltf-binary',
        'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', 'released', TRUE, TRUE, NOW() - INTERVAL '3 days', ${uid(0)},
        356700, 178350, '{"minX":-900,"minY":-900,"minZ":-600,"maxX":900,"maxY":900,"maxZ":600}', '/thumbnails/dt/vacuum-dryer.png',
        ${uid(0)}, '${uname(0)}', '["真空","干燥","腔体","Detroit","清洗线"]'::json, '{"project":"Detroit清洗线","department":"机械设计","vacuumLevel_Pa":100}', '真空干燥腔体GLB模型，V4.0 final release。Design frozen after customer approval.',
        ${uid(0)}, ${uid(0)}
      ),
      -- Asset 6: 整机总装图.gltf (obsolete)
      (
        'DET-WL-2026', '整机总装图.gltf', 'DT-MECH-00005', 1, 'V1.0',
        'gltf', '/storage/dt/det-wl-2026/full-assembly-v1.gltf', '整机总装图_V1.gltf',
        89500000, 'model/gltf+json',
        'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', 'obsolete', FALSE, FALSE, NULL, NULL,
        512000, 256000, '{"minX":-4000,"minY":-200,"minZ":-1500,"maxX":4000,"maxY":3000,"maxZ":1500}', '/thumbnails/dt/full-assembly-v1.png',
        ${uid(1)}, '${uname(1)}', '["总装","整机","Detroit","清洗线","已废弃"]'::json, '{"project":"Detroit清洗线","department":"机械设计","supersededBy":"DT-MECH-00005-V2"}', '整机总装图V1.0已废弃，被新版总装图替代。保留用于历史追溯。',
        ${uid(1)}, ${uid(1)}
      )
      RETURNING id, asset_name
    `);

    const assetIds = assetRows.rows;
    console.log(`[seed-dt] Inserted ${assetIds.length} dt_assets:`);
    assetIds.forEach((r: any) => console.log(`  - [${r.id}] ${r.asset_name}`));

    const asset1Id = assetIds[0].id;
    const asset2Id = assetIds[1].id;
    const asset3Id = assetIds[2].id;
    const asset5Id = assetIds[4].id;
    const asset6Id = assetIds[5].id;

    // ── Seed 4 assembly nodes for asset 1 (底架焊接总成) ──

    const nodeRows = await client.query(`
      INSERT INTO dt_robot_assembly_nodes (
        dt_asset_id, part_number, part_name,
        position_x, position_y, position_z,
        rotation_x, rotation_y, rotation_z,
        assembly_torque_nm, assembly_sequence, tool_required, grip_type, safety_clearance_mm,
        node_type, instructions, metadata,
        created_by
      ) VALUES
      -- Node 1: 底架主框架
      (
        ${asset1Id}, 'BP-001', '底架主框架',
        0.0000, 0.0000, 0.0000,
        0.0000, 0.0000, 0.0000,
        NULL, 1, '天车吊装', 'vacuum_pad', 500.00,
        'sub-assembly', '1. 使用天车将主框架吊装至装配工位\n2. 调整水平度 ±0.5mm\n3. 固定临时定位销',
        '{"weight_kg":450,"material":"Q345B","weldType":"CO2 MAG"}',
        ${uid(0)}
      ),
      -- Node 2: 侧板左
      (
        ${asset1Id}, 'BP-002', '侧板左',
        -1100.0000, 400.0000, 0.0000,
        0.0000, 0.0000, 90.0000,
        85.00, 2, 'M16扭矩扳手', 'magnetic_clamp', 300.00,
        'part', '1. 将左侧板对齐主框架左侧定位孔\n2. 使用M16螺栓预紧至85Nm\n3. 检查间隙 ≤0.3mm',
        '{"weight_kg":65,"boltSpec":"M16x45","boltCount":12}',
        ${uid(0)}
      ),
      -- Node 3: 侧板右
      (
        ${asset1Id}, 'BP-003', '侧板右',
        1100.0000, 400.0000, 0.0000,
        0.0000, 0.0000, -90.0000,
        85.00, 3, 'M16扭矩扳手', 'magnetic_clamp', 300.00,
        'part', '1. 将右侧板对齐主框架右侧定位孔\n2. 使用M16螺栓预紧至85Nm\n3. 检查间隙 ≤0.3mm\n4. 验证左右对称度',
        '{"weight_kg":65,"boltSpec":"M16x45","boltCount":12}',
        ${uid(0)}
      ),
      -- Node 4: 顶部横梁
      (
        ${asset1Id}, 'BP-004', '顶部横梁',
        0.0000, 1500.0000, 0.0000,
        0.0000, 0.0000, 0.0000,
        120.00, 4, 'M20扭矩扳手', 'parallel_jaw', 250.00,
        'part', '1. 吊装顶部横梁至两侧板顶端\n2. 对齐定位销孔\n3. M20螺栓交叉紧固至120Nm\n4. 全焊缝UT探伤检测',
        '{"weight_kg":95,"boltSpec":"M20x60","boltCount":8,"weldInspection":"UT"}',
        ${uid(0)}
      )
      RETURNING id, part_number, part_name
    `);

    console.log(`[seed-dt] Inserted ${nodeRows.rows.length} assembly nodes for asset ${asset1Id}:`);
    nodeRows.rows.forEach((r: any) => console.log(`  - [${r.id}] ${r.part_number} ${r.part_name}`));

    // ── Seed 8 audit logs ─────────────────────────────

    const hash1 = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    const hash2 = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3';
    const hash5 = 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6';
    const hash6 = 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7';

    const auditRows = await client.query(`
      INSERT INTO iatf_audit_logs (
        asset_id, action, actor_id, actor_name,
        timestamp_utc, ip_address, user_agent,
        hash_at_action, previous_status, new_status, asset_version,
        details, metadata
      ) VALUES
      -- Log 1: Upload asset 1 (draft)
      (
        ${asset1Id}, 'upload', ${uid(0)}, '${uname(0)}',
        NOW() - INTERVAL '30 days', '192.168.1.100', 'Mozilla/5.0 GRT-CAD-Uploader/1.0',
        '${hash1}', NULL, 'draft', 1,
        '首次上传底架焊接总成GLB模型 V1.0',
        '{"source":"CAD-export","cadSoftware":"SolidWorks 2025"}'
      ),
      -- Log 2: Approve asset 1 (draft → released)
      (
        ${asset1Id}, 'approve', ${uid(1)}, '${uname(1)}',
        NOW() - INTERVAL '20 days', '192.168.1.101', 'Mozilla/5.0 GRT-Web/2.0',
        '${hash1}', 'draft', 'released', 2,
        'IATF合规审核通过，模型完整性验证OK，SHA-256匹配',
        '{"reviewChecklist":["geometry_ok","units_mm","origin_correct","normals_ok"]}'
      ),
      -- Log 3: Freeze asset 1
      (
        ${asset1Id}, 'freeze', ${uid(0)}, '${uname(0)}',
        NOW() - INTERVAL '5 days', '192.168.1.100', 'Mozilla/5.0 GRT-Web/2.0',
        '${hash1}', 'released', 'released', 3,
        '设计冻结：底架焊接总成V3.0进入生产阶段，禁止修改',
        '{"freezeReason":"production_release","gateApproval":"GATE-3-PASS"}'
      ),
      -- Log 4: Hash verify asset 1
      (
        ${asset1Id}, 'hash_verify', ${uid(2)}, '${uname(2)}',
        NOW() - INTERVAL '2 days', '192.168.1.105', 'Mozilla/5.0 GRT-Audit-Bot/1.0',
        '${hash1}', 'released', 'released', 3,
        '定期完整性校验：SHA-256哈希匹配，文件未被篡改',
        '{"verificationResult":"PASS","expectedHash":"${hash1}","actualHash":"${hash1}"}'
      ),
      -- Log 5: Upload asset 2
      (
        ${asset2Id}, 'upload', ${uid(1)}, '${uname(1)}',
        NOW() - INTERVAL '25 days', '192.168.1.101', 'Mozilla/5.0 GRT-CAD-Uploader/1.0',
        '${hash2}', NULL, 'draft', 1,
        '上传喷淋系统STEP模型V1.0',
        '{"source":"CAD-export","cadSoftware":"ZW3D 2025"}'
      ),
      -- Log 6: Approve asset 2
      (
        ${asset2Id}, 'approve', ${uid(0)}, '${uname(0)}',
        NOW() - INTERVAL '15 days', '192.168.1.100', 'Mozilla/5.0 GRT-Web/2.0',
        '${hash2}', 'draft', 'released', 2,
        '喷淋系统V2.0审核通过，管路连接验证完成',
        '{"reviewChecklist":["pressure_test_ok","routing_verified","connections_ok"]}'
      ),
      -- Log 7: Upload asset 5 + freeze
      (
        ${asset5Id}, 'freeze', ${uid(0)}, '${uname(0)}',
        NOW() - INTERVAL '3 days', '192.168.1.100', 'Mozilla/5.0 GRT-Web/2.0',
        '${hash5}', 'released', 'released', 4,
        '真空干燥腔体V4.0冻结，客户验收通过',
        '{"freezeReason":"customer_acceptance","customerPO":"DET-PO-2026-0042"}'
      ),
      -- Log 8: Obsolete asset 6
      (
        ${asset6Id}, 'obsolete', ${uid(1)}, '${uname(1)}',
        NOW() - INTERVAL '10 days', '192.168.1.101', 'Mozilla/5.0 GRT-Web/2.0',
        '${hash6}', 'released', 'obsolete', 1,
        '整机总装图V1.0标记为废弃，已被V2.0替代',
        '{"reason":"superseded","supersededBy":"DT-MECH-00005-V2"}'
      )
      RETURNING id, asset_id, action
    `);

    console.log(`[seed-dt] Inserted ${auditRows.rows.length} audit logs:`);
    auditRows.rows.forEach((r: any) => console.log(`  - [${r.id}] asset=${r.asset_id} action=${r.action}`));

    await client.query("COMMIT");
    console.log("[seed-dt] All demo data seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[seed-dt] Seed failed, rolled back:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
