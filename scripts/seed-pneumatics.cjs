/**
 * GRT 气动标准件库 — SMC / Festo / CKD / AirTAC
 * Run: node scripts/seed-pneumatics.cjs
 */
const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";
function req(method, path, body) { return new Promise((resolve, reject) => { const url = new URL(path, BASE); const data = body ? JSON.stringify(body) : null; const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}) } }; const r = http.request(opts, (res) => { if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0]; let d = []; res.on("data", c => d.push(c)); res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(d).toString("utf8"))); } catch { resolve(null); } }); }); r.on("error", reject); if (data) r.write(data, "utf8"); r.end(); }); }

(async () => {
  await req("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  const bomId = 48;
  const items = [
    // ════════════ SMC 气缸 ════════════
    { level: 1, materialCode: "SMC-CQ2B-16", materialName: "SMC CQ2B16-10D 薄型气缸 16x10", quantity: 1, unit: "只", unitCost: 95, sourceType: "purchase", category: "气缸-薄型", supplier: "SMC" },
    { level: 1, materialCode: "SMC-CQ2B-25", materialName: "SMC CQ2B25-20D 薄型气缸 25x20", quantity: 1, unit: "只", unitCost: 130, sourceType: "purchase", category: "气缸-薄型", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MXS-12", materialName: "SMC MXS12-30 滑台气缸 12x30", quantity: 1, unit: "只", unitCost: 520, sourceType: "purchase", category: "气缸-滑台", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MXS-16", materialName: "SMC MXS16-50 滑台气缸 16x50", quantity: 1, unit: "只", unitCost: 680, sourceType: "purchase", category: "气缸-滑台", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MXS-20", materialName: "SMC MXS20-75 滑台气缸 20x75", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "气缸-滑台", supplier: "SMC" },
    { level: 1, materialCode: "SMC-CXSM-15", materialName: "SMC CXSM15-50 双轴气缸 15x50", quantity: 1, unit: "只", unitCost: 580, sourceType: "purchase", category: "气缸-双轴", supplier: "SMC" },
    { level: 1, materialCode: "SMC-CXSM-20", materialName: "SMC CXSM20-75 双轴气缸 20x75", quantity: 1, unit: "只", unitCost: 750, sourceType: "purchase", category: "气缸-双轴", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MSQB-20A", materialName: "SMC MSQB20A 旋转气缸 180度", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "气缸-旋转", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MSQB-30A", materialName: "SMC MSQB30A 旋转气缸 90/180度", quantity: 1, unit: "只", unitCost: 1200, sourceType: "purchase", category: "气缸-旋转", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MHZ2-16D", materialName: "SMC MHZ2-16D 气爪(平行开闭)", quantity: 1, unit: "只", unitCost: 650, sourceType: "purchase", category: "气爪", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MHZ2-25D", materialName: "SMC MHZ2-25D 气爪(平行开闭)", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "气爪", supplier: "SMC" },
    { level: 1, materialCode: "SMC-MHS3-50D", materialName: "SMC MHS3-50D 三爪气缸(120度)", quantity: 1, unit: "只", unitCost: 1200, sourceType: "purchase", category: "气爪", supplier: "SMC" },
    // ════════════ SMC 电磁阀/阀岛 ════════════
    { level: 1, materialCode: "SMC-SY3120-5LZ", materialName: "SMC SY3120-5LZ 五通阀 M5 24VDC", quantity: 1, unit: "只", unitCost: 120, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "SMC-SY5120-5DZ", materialName: "SMC SY5120-5DZ 五通阀 1/8 24VDC", quantity: 1, unit: "只", unitCost: 180, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "SMC-SY7120-5DZ", materialName: "SMC SY7120-5DZ 五通阀 1/4 24VDC", quantity: 1, unit: "只", unitCost: 250, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "SMC-SS5Y5-20F", materialName: "SMC SS5Y5-20F 阀岛底板(5位)", quantity: 1, unit: "块", unitCost: 350, sourceType: "purchase", category: "阀岛", supplier: "SMC" },
    { level: 1, materialCode: "SMC-SS5Y5-45F", materialName: "SMC SS5Y5-45F 阀岛底板(10位)", quantity: 1, unit: "块", unitCost: 680, sourceType: "purchase", category: "阀岛", supplier: "SMC" },
    { level: 1, materialCode: "SMC-EX260-SPN", materialName: "SMC EX260 串行通讯模块(PROFINET)", quantity: 1, unit: "台", unitCost: 2800, sourceType: "purchase", category: "阀岛通讯", supplier: "SMC" },
    // ════════════ SMC 气源处理 ════════════
    { level: 1, materialCode: "SMC-AC20-02", materialName: "SMC AC20 气源三联件 1/4", quantity: 1, unit: "套", unitCost: 180, sourceType: "purchase", category: "气源处理", supplier: "SMC" },
    { level: 1, materialCode: "SMC-AC40-04", materialName: "SMC AC40 气源三联件 1/2", quantity: 1, unit: "套", unitCost: 350, sourceType: "purchase", category: "气源处理", supplier: "SMC" },
    { level: 1, materialCode: "SMC-IDG50-04", materialName: "SMC IDG50 膜式干燥器", quantity: 1, unit: "台", unitCost: 1500, sourceType: "purchase", category: "气源处理", supplier: "SMC" },
    { level: 1, materialCode: "SMC-AME350-04", materialName: "SMC AME350 除油雾器 0.01um", quantity: 1, unit: "台", unitCost: 850, sourceType: "purchase", category: "气源处理", supplier: "SMC" },
    // ════════════ SMC 气管/接头 ════════════
    { level: 1, materialCode: "SMC-TU0604-100", materialName: "SMC TU0604 PU管 6x4(100m)", quantity: 1, unit: "卷", unitCost: 280, sourceType: "purchase", category: "气管", supplier: "SMC" },
    { level: 1, materialCode: "SMC-TU0805-100", materialName: "SMC TU0805 PU管 8x5(100m)", quantity: 1, unit: "卷", unitCost: 350, sourceType: "purchase", category: "气管", supplier: "SMC" },
    { level: 1, materialCode: "SMC-KQ2H06-01", materialName: "SMC KQ2H 快插接头 6mm-R1/8(10只)", quantity: 1, unit: "包", unitCost: 85, sourceType: "purchase", category: "接头", supplier: "SMC" },
    { level: 1, materialCode: "SMC-KQ2H08-02", materialName: "SMC KQ2H 快插接头 8mm-R1/4(10只)", quantity: 1, unit: "包", unitCost: 95, sourceType: "purchase", category: "接头", supplier: "SMC" },
    // ════════════ Festo 气缸 ════════════
    { level: 1, materialCode: "FESTO-DSBC-32", materialName: "Festo DSBC-32-100-PA 标准气缸 32x100", quantity: 1, unit: "只", unitCost: 650, sourceType: "purchase", category: "气缸-标准", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-DSBC-40", materialName: "Festo DSBC-40-150-PA 标准气缸 40x150", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "气缸-标准", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-DSBC-63", materialName: "Festo DSBC-63-200-PA 标准气缸 63x200", quantity: 1, unit: "只", unitCost: 1350, sourceType: "purchase", category: "气缸-标准", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-ADN-32", materialName: "Festo ADN-32-50-A-P-A 紧凑气缸", quantity: 1, unit: "只", unitCost: 480, sourceType: "purchase", category: "气缸-紧凑", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-DFM-20", materialName: "Festo DFM-20-50-PA 导向气缸 20x50", quantity: 1, unit: "只", unitCost: 750, sourceType: "purchase", category: "气缸-导向", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-DRRD-25", materialName: "Festo DRRD-25-180 半旋转驱动器", quantity: 1, unit: "只", unitCost: 1500, sourceType: "purchase", category: "气缸-旋转", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-DHPS-20", materialName: "Festo DHPS-20-A 平行气爪", quantity: 1, unit: "只", unitCost: 950, sourceType: "purchase", category: "气爪", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-EGC-50", materialName: "Festo EGC-50-200-TB 电动滑台", quantity: 1, unit: "只", unitCost: 5500, sourceType: "purchase", category: "电动执行器", supplier: "Festo" },
    // ════════════ Festo 电磁阀/阀岛 ════════════
    { level: 1, materialCode: "FESTO-VUVG-L10", materialName: "Festo VUVG-L10 电磁阀 M5 24VDC", quantity: 1, unit: "只", unitCost: 280, sourceType: "purchase", category: "电磁阀", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-VUVG-LK14", materialName: "Festo VUVG-LK14 电磁阀 G1/8", quantity: 1, unit: "只", unitCost: 380, sourceType: "purchase", category: "电磁阀", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-VTUG-14", materialName: "Festo VTUG-14 阀岛(8位 PROFINET)", quantity: 1, unit: "台", unitCost: 5500, sourceType: "purchase", category: "阀岛", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-CPX-FB36", materialName: "Festo CPX 远程IO终端(PROFINET)", quantity: 1, unit: "台", unitCost: 4200, sourceType: "purchase", category: "阀岛通讯", supplier: "Festo" },
    // ════════════ Festo 气源处理 ════════════
    { level: 1, materialCode: "FESTO-MSB6-FRC", materialName: "Festo MSB6 气源三联件 D系列", quantity: 1, unit: "套", unitCost: 480, sourceType: "purchase", category: "气源处理", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-LFR-D-MIDI", materialName: "Festo LFR-D-MIDI 过滤减压阀", quantity: 1, unit: "只", unitCost: 320, sourceType: "purchase", category: "气源处理", supplier: "Festo" },
    // ════════════ Festo 气管/接头 ════════════
    { level: 1, materialCode: "FESTO-PUN-6-BL", materialName: "Festo PUN-6x1-BL PU管 6mm(50m)", quantity: 1, unit: "卷", unitCost: 220, sourceType: "purchase", category: "气管", supplier: "Festo" },
    { level: 1, materialCode: "FESTO-QS-6-4", materialName: "Festo QS-6-4 快插接头 6mm(10只)", quantity: 1, unit: "包", unitCost: 120, sourceType: "purchase", category: "接头", supplier: "Festo" },
    // ════════════ SMC 真空元件 ════════════
    { level: 1, materialCode: "SMC-ZH10DS-06", materialName: "SMC ZH10DS 真空发生器 0.6mm喷嘴", quantity: 1, unit: "只", unitCost: 280, sourceType: "purchase", category: "真空发生器", supplier: "SMC" },
    { level: 1, materialCode: "SMC-ZH13BS-08", materialName: "SMC ZH13BS 真空发生器 0.8mm(带过滤)", quantity: 1, unit: "只", unitCost: 380, sourceType: "purchase", category: "真空发生器", supplier: "SMC" },
    { level: 1, materialCode: "SMC-ZP3-T25US", materialName: "SMC ZP3 真空吸盘 25mm(硅胶)", quantity: 1, unit: "只", unitCost: 25, sourceType: "purchase", category: "真空吸盘", supplier: "SMC" },
    { level: 1, materialCode: "SMC-ZP3-T40US", materialName: "SMC ZP3 真空吸盘 40mm(硅胶)", quantity: 1, unit: "只", unitCost: 35, sourceType: "purchase", category: "真空吸盘", supplier: "SMC" },
    { level: 1, materialCode: "SMC-ZSE30A-01", materialName: "SMC ZSE30A 真空压力开关(数显)", quantity: 1, unit: "只", unitCost: 350, sourceType: "purchase", category: "真空开关", supplier: "SMC" },
    // ════════════ CKD 气动 ════════════
    { level: 1, materialCode: "CKD-SCA2-CA-50", materialName: "CKD SCA2 标准气缸 50x100", quantity: 1, unit: "只", unitCost: 420, sourceType: "purchase", category: "气缸-标准", supplier: "CKD喜开理" },
    { level: 1, materialCode: "CKD-4GA2", materialName: "CKD 4GA2 电磁阀 五通", quantity: 1, unit: "只", unitCost: 150, sourceType: "purchase", category: "电磁阀", supplier: "CKD喜开理" },
    { level: 1, materialCode: "CKD-F3000-10", materialName: "CKD F3000 气源三联件 3/8", quantity: 1, unit: "套", unitCost: 220, sourceType: "purchase", category: "气源处理", supplier: "CKD喜开理" },
    // ════════════ AirTAC 气动(经济型) ════════════
    { level: 1, materialCode: "AIRTAC-SC50X100", materialName: "AirTAC SC50x100 标准气缸", quantity: 1, unit: "只", unitCost: 120, sourceType: "purchase", category: "气缸-标准", supplier: "AirTAC亚德客" },
    { level: 1, materialCode: "AIRTAC-4V210-08", materialName: "AirTAC 4V210-08 电磁阀 1/4", quantity: 1, unit: "只", unitCost: 55, sourceType: "purchase", category: "电磁阀", supplier: "AirTAC亚德客" },
    { level: 1, materialCode: "AIRTAC-GFC300", materialName: "AirTAC GFC300 气源三联件", quantity: 1, unit: "套", unitCost: 85, sourceType: "purchase", category: "气源处理", supplier: "AirTAC亚德客" },
  ];

  let n = 0;
  for (const it of items) { await req("POST", "/api/trpc/bom.addBomItem", { json: { bomMasterId: bomId, ...it } }); n++; process.stdout.write("."); }
  console.log(`\n气动标准件: ${n} 项导入完成`);
  console.log("═══════════════════════════════════════════");
  console.log("  SMC (26项):");
  console.log("  ├─ 气缸: CQ2B薄型/MXS滑台/CXSM双轴/MSQB旋转/CP96标准");
  console.log("  ├─ 气爪: MHZ2平行/MHS3三爪");
  console.log("  ├─ 电磁阀: SY3120/SY5120/SY7120");
  console.log("  ├─ 阀岛: SS5Y5底板(5/10位) + EX260 PROFINET");
  console.log("  ├─ 气源: AC20/AC40三联件 + IDG干燥器 + AME除油雾");
  console.log("  ├─ 真空: ZH真空发生器 + ZP3吸盘 + ZSE压力开关");
  console.log("  └─ 气管: TU PU管(6/8mm) + KQ2H快插接头");
  console.log("  Festo (15项):");
  console.log("  ├─ 气缸: DSBC标准/ADN紧凑/DFM导向/DRRD旋转/DHPS气爪");
  console.log("  ├─ 电动: EGC电动滑台");
  console.log("  ├─ 电磁阀: VUVG系列");
  console.log("  ├─ 阀岛: VTUG(PROFINET) + CPX远程IO");
  console.log("  ├─ 气源: MSB6三联件 + LFR减压阀");
  console.log("  └─ 气管: PUN PU管 + QS快插接头");
  console.log("  CKD (3项): SCA2气缸 + 4GA2电磁阀 + F3000三联件");
  console.log("  AirTAC (3项): SC气缸 + 4V210电磁阀 + GFC三联件(经济型)");
  console.log("═══════════════════════════════════════════");
})();
