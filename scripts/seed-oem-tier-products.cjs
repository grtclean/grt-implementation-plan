/**
 * GRT OEM/Tier1/Tier2 产品型号 + BOM标准导入
 * 覆盖: VW/Mercedes/BMW/GM/Bosch/Schaeffler/Continental/CATL/BYD/ZF
 *
 * Run: node scripts/seed-oem-tier-products.cjs
 */
const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}) } };
    const r = http.request(opts, (res) => {
      if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0];
      let d = []; res.on("data", c => d.push(c)); res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(d).toString("utf8"))); } catch { resolve(null); } });
    });
    r.on("error", reject);
    if (data) r.write(data, "utf8");
    r.end();
  });
}
async function mut(proc, input) {
  const r = await request("POST", `/api/trpc/${proc}`, { json: input });
  if (r?.error) return null;
  return r?.result?.data?.json;
}
async function createProd(p) { return mut("pdm.product.create", p); }
async function createBomWithItems(productCode, productName, items) {
  const m = await mut("bom.createBomMaster", { productCode, productName, bomType: "manufacturing", currentVersion: "1.0" });
  if (!m) return null;
  let n = 0;
  for (const item of items) { await mut("bom.addBomItem", { bomMasterId: m.id, ...item }); n++; }
  return { id: m.id, count: n };
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  // ═══════════════════════════════════════════════════════
  // OEM 产品型号
  // ═══════════════════════════════════════════════════════
  const products = [
    // OEM — 整车厂
    { productCode: "VW-EA888-USC08", productName: "VW EA888缸体清洗线(VDA 19.1)", productFamily: "OEM-VW", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "VW-DQ381-GRX06", productName: "VW DQ381变速箱齿轴清洗(PV 3347)", productFamily: "OEM-VW", stationCount: 6, lifecycleStatus: "released" },
    { productCode: "VW-MEB-BAT10", productName: "VW MEB平台电池壳清洗", productFamily: "OEM-VW", stationCount: 10, lifecycleStatus: "design" },
    { productCode: "MB-OM654-USC10", productName: "Mercedes OM654柴油机缸体(MBN 10545)", productFamily: "OEM-MB", stationCount: 10, lifecycleStatus: "released" },
    { productCode: "MB-9G-GRX08", productName: "Mercedes 9G-Tronic变速箱清洗线", productFamily: "OEM-MB", stationCount: 8, lifecycleStatus: "design" },
    { productCode: "MB-EQS-BAT12", productName: "Mercedes EQS电池模组清洗", productFamily: "OEM-MB", stationCount: 12, lifecycleStatus: "concept" },
    { productCode: "BMW-B48-USC08", productName: "BMW B48缸体清洗(BMW GS 95003)", productFamily: "OEM-BMW", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "BMW-ZF8HP-GRX06", productName: "BMW ZF 8HP变速箱清洗", productFamily: "OEM-BMW", stationCount: 6, lifecycleStatus: "released" },
    { productCode: "GM-LT1-USC06", productName: "GM LT1 V8缸体清洗(GM-9985225)", productFamily: "OEM-GM", stationCount: 6, lifecycleStatus: "production" },
    { productCode: "GM-10AT-GRX04", productName: "GM 10速自动变速箱清洗", productFamily: "OEM-GM", stationCount: 4, lifecycleStatus: "released" },
    // Tier1 — 总成供应商
    { productCode: "BOSCH-CP4-HPD03", productName: "Bosch CP4高压共轨泵体清洗", productFamily: "T1-BOSCH", stationCount: 3, lifecycleStatus: "production" },
    { productCode: "BOSCH-INJECTOR-USC04", productName: "Bosch喷油器体精密清洗(ISO 16232)", productFamily: "T1-BOSCH", stationCount: 4, lifecycleStatus: "production" },
    { productCode: "CONTI-TURBO-USC06", productName: "Continental涡轮增压器壳体清洗", productFamily: "T1-CONTI", stationCount: 6, lifecycleStatus: "released" },
    { productCode: "ZF-9HP-GRX08", productName: "ZF 9HP变速箱齿轴清洗", productFamily: "T1-ZF", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "ZF-EAXLE-USC06", productName: "ZF电驱桥壳体清洗", productFamily: "T1-ZF", stationCount: 6, lifecycleStatus: "design" },
    { productCode: "SCHAEFFLER-DCT-GRX04", productName: "Schaeffler DCT双离合齿轴清洗", productFamily: "T1-SCHAEFF", stationCount: 4, lifecycleStatus: "released" },
    { productCode: "MAHLE-PISTON-USC04", productName: "MAHLE活塞精密清洗", productFamily: "T1-MAHLE", stationCount: 4, lifecycleStatus: "production" },
    { productCode: "CATL-CELL-BAT08", productName: "CATL方形电芯壳体清洗", productFamily: "T1-CATL", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "BYD-BLADE-BAT06", productName: "BYD刀片电池清洗", productFamily: "T1-BYD", stationCount: 6, lifecycleStatus: "released" },
    // Tier2 — 零部件供应商
    { productCode: "T2-VALVE-USC03", productName: "液压阀体精密清洗(通用)", productFamily: "T2-HYD", stationCount: 3, lifecycleStatus: "production" },
    { productCode: "T2-GEAR-GRX04", productName: "行星齿轮组清洗(通用)", productFamily: "T2-GEAR", stationCount: 4, lifecycleStatus: "production" },
    { productCode: "T2-HOUSING-USC04", productName: "铝压铸壳体清洗(通用)", productFamily: "T2-DCAST", stationCount: 4, lifecycleStatus: "production" },
    { productCode: "T2-TURBO-IMPELLER", productName: "涡轮叶轮精密清洗", productFamily: "T2-TURBO", stationCount: 3, lifecycleStatus: "released" },
    { productCode: "T2-BEARING-IMM03", productName: "轴承清洗线(浸泡式)", productFamily: "T2-BRG", stationCount: 3, lifecycleStatus: "production" },
    // 标准平台
    { productCode: "STD-HPD-DEBURR", productName: "标准高压去毛刺单元(通用型)", productFamily: "STD", stationCount: 2, lifecycleStatus: "production" },
    { productCode: "STD-VDR-VACUUM", productName: "标准真空干燥单元(通用型)", productFamily: "STD", stationCount: 1, lifecycleStatus: "production" },
    { productCode: "STD-DI-WATER", productName: "标准DI水处理系统", productFamily: "STD", stationCount: 1, lifecycleStatus: "production" },
    { productCode: "STD-OIL-SKIM", productName: "标准油水分离系统", productFamily: "STD", stationCount: 1, lifecycleStatus: "production" },
    { productCode: "STD-FILTER-UNIT", productName: "标准过滤循环单元", productFamily: "STD", stationCount: 1, lifecycleStatus: "production" },
  ];

  let prodOk = 0;
  for (const p of products) {
    const r = await createProd(p);
    if (r) prodOk++;
    process.stdout.write(r ? "." : "x");
  }
  console.log(`\n产品: ${prodOk}/${products.length} 创建成功\n`);

  // ═══════════════════════════════════════════════════════
  // Tier1 BOM — Bosch CP4 高压共轨泵
  // ═══════════════════════════════════════════════════════
  console.log("【Tier1】Bosch CP4高压共轨泵体清洗");
  const boschCP4 = await createBomWithItems("BOSCH-CP4-HPD03", "Bosch CP4高压共轨泵体清洗", [
    { level: 1, materialCode: "BOSCH-HPD-UNIT", materialName: "高压定点清洗单元(600bar)", quantity: 1, unit: "套", unitCost: 65000, sourceType: "manufacture", category: "清洗单元" },
    { level: 1, materialCode: "BOSCH-USC-FINE", materialName: "80kHz精密超声波清洗工位", quantity: 1, unit: "套", unitCost: 48000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "BOSCH-VDR-UNIT", materialName: "真空干燥+N₂保护", quantity: 1, unit: "套", unitCost: 42000, sourceType: "manufacture", category: "干燥工位" },
    { level: 2, materialCode: "PUMP-KAMAT-K600", materialName: "KAMAT K600 高压泵 600bar", quantity: 1, unit: "台", unitCost: 52000, sourceType: "purchase", category: "高压泵", supplier: "KAMAT" },
    { level: 2, materialCode: "USG-WEBER-80K-3KW", materialName: "Weber 80kHz/3kW 超声波发生器", quantity: 2, unit: "台", unitCost: 9800, sourceType: "purchase", category: "超声波", supplier: "Weber" },
    { level: 2, materialCode: "PLC-S7-1515-2PN", materialName: "西门子 S7-1515-2PN", quantity: 1, unit: "台", unitCost: 15800, sourceType: "purchase", category: "PLC", supplier: "Siemens" },
    { level: 2, materialCode: "VDA19-PARTICLE-CNT", materialName: "在线颗粒计数器(VDA 19.1)", quantity: 1, unit: "台", unitCost: 45000, sourceType: "purchase", category: "检测", supplier: "PAMAS" },
    { level: 2, materialCode: "FILTER-BOSCH-1UM", materialName: "HYDAC 1μm绝对过滤器", quantity: 4, unit: "只", unitCost: 2200, sourceType: "purchase", category: "过滤", supplier: "HYDAC" },
  ]);
  if (boschCP4) console.log(`  BOM #${boschCP4.id}: ${boschCP4.count} 项`);

  // ═══════════════════════════════════════════════════════
  // Tier1 BOM — ZF 9HP 变速箱
  // ═══════════════════════════════════════════════════════
  console.log("【Tier1】ZF 9HP变速箱齿轴清洗");
  const zf9hp = await createBomWithItems("ZF-9HP-GRX08", "ZF 9HP变速箱齿轴清洗", [
    { level: 1, materialCode: "ZF-PREWASH", materialName: "预清洗+脱脂工位", quantity: 2, unit: "套", unitCost: 35000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "ZF-USC-MULTI", materialName: "多频超声波(25+40kHz)", quantity: 2, unit: "套", unitCost: 58000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "ZF-RINSE-DI", materialName: "DI水漂洗(逆流三级)", quantity: 2, unit: "套", unitCost: 38000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "ZF-DRY-VAC", materialName: "真空干燥工位", quantity: 2, unit: "套", unitCost: 48000, sourceType: "manufacture", category: "干燥工位" },
    { level: 2, materialCode: "PUMP-GF-CRN10-5", materialName: "格兰富 CRN10-5 不锈钢泵", quantity: 4, unit: "台", unitCost: 9500, sourceType: "purchase", category: "水泵", supplier: "Grundfos" },
    { level: 2, materialCode: "VAC-BUSCH-R5-160", materialName: "普旭 R5 RA0160 真空泵", quantity: 2, unit: "台", unitCost: 22000, sourceType: "purchase", category: "真空泵", supplier: "Busch" },
    { level: 2, materialCode: "USG-WEBER-25K-5KW", materialName: "Weber 25kHz/5kW 发生器", quantity: 2, unit: "台", unitCost: 9500, sourceType: "purchase", category: "超声波", supplier: "Weber" },
    { level: 2, materialCode: "PLC-S7-1516-3PN", materialName: "西门子 S7-1516-3PN/DP", quantity: 1, unit: "台", unitCost: 22000, sourceType: "purchase", category: "PLC", supplier: "Siemens" },
    { level: 2, materialCode: "ROBOT-FANUC-LR10", materialName: "FANUC LR Mate 200iD 上下料机器人", quantity: 2, unit: "台", unitCost: 85000, sourceType: "purchase", category: "机器人", supplier: "FANUC" },
    { level: 2, materialCode: "VFD-SIE-G120-11K", materialName: "西门子 G120C 11kW变频器", quantity: 4, unit: "台", unitCost: 5200, sourceType: "purchase", category: "变频器", supplier: "Siemens" },
  ]);
  if (zf9hp) console.log(`  BOM #${zf9hp.id}: ${zf9hp.count} 项`);

  // ═══════════════════════════════════════════════════════
  // Tier2 BOM — 铝压铸壳体清洗(通用)
  // ═══════════════════════════════════════════════════════
  console.log("【Tier2】铝压铸壳体清洗(通用)");
  const t2dcast = await createBomWithItems("T2-HOUSING-USC04", "铝压铸壳体清洗(通用)", [
    { level: 1, materialCode: "T2-WASH-STD", materialName: "标准超声波清洗(4工位)", quantity: 1, unit: "套", unitCost: 85000, sourceType: "manufacture", category: "清洗" },
    { level: 2, materialCode: "PUMP-NF-CDL8-12", materialName: "南方 CDL8-12 立式多级泵", quantity: 4, unit: "台", unitCost: 3500, sourceType: "purchase", category: "水泵", supplier: "南方CNP" },
    { level: 2, materialCode: "USG-KEYUAN-28K-2KW", materialName: "科源 28kHz/2kW 超声波发生器", quantity: 4, unit: "台", unitCost: 4500, sourceType: "purchase", category: "超声波", supplier: "科源超声" },
    { level: 2, materialCode: "PLC-S7-1212C", materialName: "西门子 S7-1200 CPU1212C", quantity: 1, unit: "台", unitCost: 2800, sourceType: "purchase", category: "PLC", supplier: "Siemens" },
    { level: 2, materialCode: "HMI-KTP700", materialName: "西门子 KTP700 7寸面板", quantity: 1, unit: "台", unitCost: 3200, sourceType: "purchase", category: "HMI", supplier: "Siemens" },
    { level: 2, materialCode: "CB-SE-IC60-SET", materialName: "施耐德 iC60 微断套件(8只)", quantity: 1, unit: "套", unitCost: 680, sourceType: "purchase", category: "低压电气", supplier: "Schneider" },
    { level: 2, materialCode: "MC-SE-LC1D18-SET", materialName: "施耐德 LC1D18 接触器(6只)", quantity: 1, unit: "套", unitCost: 550, sourceType: "purchase", category: "低压电气", supplier: "Schneider" },
    { level: 2, materialCode: "HTR-SUS-4KW", materialName: "不锈钢加热管 4kW/380V", quantity: 4, unit: "根", unitCost: 220, sourceType: "purchase", category: "加热" },
  ]);
  if (t2dcast) console.log(`  BOM #${t2dcast.id}: ${t2dcast.count} 项`);

  // ═══════════════════════════════════════════════════════
  // 标准模块 — DI水处理
  // ═══════════════════════════════════════════════════════
  console.log("【标准】DI水处理系统");
  const stdDI = await createBomWithItems("STD-DI-WATER", "标准DI水处理系统", [
    { level: 1, materialCode: "DI-PREFILTER", materialName: "预处理过滤(多介质+活性炭)", quantity: 1, unit: "套", unitCost: 8000, sourceType: "purchase", category: "水处理" },
    { level: 1, materialCode: "DI-RO-MEMBRANE", materialName: "RO反渗透膜组 4040 (陶氏)", quantity: 4, unit: "只", unitCost: 2500, sourceType: "purchase", category: "水处理", supplier: "DOW陶氏" },
    { level: 1, materialCode: "DI-EDI-MODULE", materialName: "EDI电去离子模块 2T/h", quantity: 1, unit: "台", unitCost: 28000, sourceType: "purchase", category: "水处理" },
    { level: 1, materialCode: "DI-UV-STERILIZER", materialName: "UV紫外杀菌器", quantity: 1, unit: "台", unitCost: 3500, sourceType: "purchase", category: "水处理" },
    { level: 1, materialCode: "DI-FINAL-FILTER", materialName: "Pall终端过滤器 0.2μm", quantity: 2, unit: "只", unitCost: 1800, sourceType: "purchase", category: "水处理", supplier: "Pall" },
    { level: 1, materialCode: "DI-COND-METER", materialName: "E+H电导率仪(在线)", quantity: 2, unit: "台", unitCost: 3500, sourceType: "purchase", category: "传感器", supplier: "E+H" },
    { level: 1, materialCode: "DI-TANK-SUS316", materialName: "SUS316L纯水储罐 2T", quantity: 1, unit: "台", unitCost: 12000, sourceType: "manufacture", category: "容器" },
    { level: 1, materialCode: "PUMP-GF-CRE3-11", materialName: "格兰富 CRE3-11 变频供水泵", quantity: 1, unit: "台", unitCost: 8500, sourceType: "purchase", category: "水泵", supplier: "Grundfos" },
  ]);
  if (stdDI) console.log(`  BOM #${stdDI.id}: ${stdDI.count} 项`);

  // ═══════════════════════════════════════════════════════
  // 标准模块 — 油水分离
  // ═══════════════════════════════════════════════════════
  console.log("【标准】油水分离系统");
  const stdOil = await createBomWithItems("STD-OIL-SKIM", "标准油水分离系统", [
    { level: 1, materialCode: "OIL-SKIMMER-BELT", materialName: "带式撇油器(不锈钢)", quantity: 2, unit: "台", unitCost: 6500, sourceType: "purchase", category: "油水分离" },
    { level: 1, materialCode: "OIL-COALESCER", materialName: "聚结分离器", quantity: 1, unit: "台", unitCost: 15000, sourceType: "purchase", category: "油水分离" },
    { level: 1, materialCode: "OIL-WASTE-TANK", materialName: "废油收集罐 200L", quantity: 1, unit: "台", unitCost: 2500, sourceType: "manufacture", category: "容器" },
    { level: 1, materialCode: "PUMP-NY-25QW-8", materialName: "南元 25QW-8 排污泵", quantity: 1, unit: "台", unitCost: 950, sourceType: "purchase", category: "水泵", supplier: "南元" },
  ]);
  if (stdOil) console.log(`  BOM #${stdOil.id}: ${stdOil.count} 项`);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  OEM/Tier1/Tier2 产品与BOM导入完成");
  console.log("═══════════════════════════════════════════════");
  console.log(`  产品型号: ${prodOk} 个`);
  console.log("  ├─ OEM: VW(3) / Mercedes(3) / BMW(2) / GM(2)");
  console.log("  ├─ Tier1: Bosch(2) / Continental(1) / ZF(2) / Schaeffler(1) / MAHLE(1) / CATL(1) / BYD(1)");
  console.log("  ├─ Tier2: 液压阀体 / 齿轮组 / 铝压铸 / 涡轮叶轮 / 轴承");
  console.log("  └─ 标准模块: 高压去毛刺 / 真空干燥 / DI水处理 / 油水分离 / 过滤循环");
  console.log("  BOM标准: VDA 19.1 / ISO 16232 / VW PV 3347 / MBN 10545 / BMW GS 95003 / GM-9985225");
  console.log("═══════════════════════════════════════════════");
}

main().catch(e => { console.error(e); process.exit(1); });
