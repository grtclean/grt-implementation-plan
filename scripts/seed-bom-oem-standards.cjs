/**
 * GRT BOM — 德系OEM标准清洗机BOM
 * 基于大众(VW)、奔驰(Mercedes)、通用(GM)清洗标准体系
 * 符合VDA 19.1 / ISO 16232 / VW PV 3347 / MBN 10545
 *
 * Run: node scripts/seed-bom-oem-standards.cjs
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
async function trpcMut(proc, input) {
  const r = await request("POST", `/api/trpc/${proc}`, { json: input });
  if (r?.error) { console.error(`  ERR:`, JSON.stringify(r.error).slice(0, 120)); return null; }
  return r?.result?.data?.json;
}
async function createBom(productCode, productName, items) {
  const master = await trpcMut("bom.createBomMaster", { productCode, productName, bomType: "manufacturing", currentVersion: "1.0" });
  if (!master) return null;
  let n = 0;
  for (const item of items) { await trpcMut("bom.addBomItem", { bomMasterId: master.id, ...item }); n++; }
  return { id: master.id, count: n };
}
async function createProduct(p) {
  try { return await trpcMut("pdm.product.create", p); } catch { return null; }
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  // ═══════════════════════════════════════════════════════
  // 产品型号创建
  // ═══════════════════════════════════════════════════════
  const oemProducts = [
    { productCode: "VW-EA888-USC08", productName: "VW EA888缸体清洗线(VDA 19.1)", productFamily: "EBK", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "VW-DQ381-GRX06", productName: "VW DQ381变速箱齿轴清洗(VW PV 3347)", productFamily: "GRX", stationCount: 6, lifecycleStatus: "released" },
    { productCode: "MB-OM654-USC10", productName: "Mercedes OM654柴油机缸体清洗(MBN 10545)", productFamily: "EBK", stationCount: 10, lifecycleStatus: "released" },
    { productCode: "MB-9G-GRX08", productName: "Mercedes 9G-Tronic变速箱清洗线", productFamily: "GRX", stationCount: 8, lifecycleStatus: "design" },
    { productCode: "GM-LT1-USC06", productName: "GM LT1 V8缸体清洗(GM-9985225)", productFamily: "EBK", stationCount: 6, lifecycleStatus: "production" },
    { productCode: "GM-10AT-GRX04", productName: "GM 10速自动变速箱清洗", productFamily: "GRX", stationCount: 4, lifecycleStatus: "released" },
    { productCode: "STD-HPD-DEBURR", productName: "德系标准高压去毛刺单元(通用型)", productFamily: "HPD", stationCount: 2, lifecycleStatus: "production" },
    { productCode: "STD-VDR-VACUUM", productName: "德系标准真空干燥单元(通用型)", productFamily: "VDR", stationCount: 1, lifecycleStatus: "production" },
  ];
  console.log("创建OEM产品型号...");
  for (const p of oemProducts) { await createProduct(p); process.stdout.write("."); }
  console.log(` ${oemProducts.length} 个\n`);

  // ═══════════════════════════════════════════════════════
  // 1. VW EA888 缸体清洗线 BOM (VDA 19.1 / VW PV 3347)
  // ═══════════════════════════════════════════════════════
  console.log("【1】VW EA888缸体清洗线 (VDA 19.1)");
  const vw888 = await createBom("VW-EA888-USC08", "VW EA888缸体清洗线", [
    // L1 主系统
    { level: 1, materialCode: "VW-PREWASH-MOD", materialName: "预清洗模块(高压喷射)", quantity: 1, unit: "套", unitCost: 35000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "VW-USC-MOD-28K", materialName: "超声波清洗模块 28kHz(2工位)", quantity: 1, unit: "套", unitCost: 65000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "VW-USC-MOD-40K", materialName: "超声波精洗模块 40kHz(2工位)", quantity: 1, unit: "套", unitCost: 58000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "VW-RINSE-MOD", materialName: "DI水漂洗模块(2工位)", quantity: 1, unit: "套", unitCost: 42000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "VW-DRY-MOD", materialName: "真空干燥模块", quantity: 1, unit: "套", unitCost: 55000, sourceType: "manufacture", category: "干燥工位" },
    { level: 1, materialCode: "VW-CONVEYOR-MOD", materialName: "自动输送系统(辊道+升降)", quantity: 1, unit: "套", unitCost: 48000, sourceType: "manufacture", category: "输送" },
    // L2 核心标准件 — 水泵
    { level: 2, materialCode: "PUMP-GF-CRN15-8", materialName: "格兰富 CRN15-8 不锈钢多级泵(耐腐蚀)", quantity: 2, unit: "台", unitCost: 12500, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    { level: 2, materialCode: "PUMP-GF-CM10-3", materialName: "格兰富 CM10-3 循环泵(DI水用)", quantity: 4, unit: "台", unitCost: 3800, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    // L2 真空泵
    { level: 2, materialCode: "VAC-BUSCH-R5-100", materialName: "普旭 R5 RA0100 旋片真空泵", quantity: 1, unit: "台", unitCost: 16000, sourceType: "purchase", category: "真空泵", supplier: "普旭(Busch)" },
    // L2 超声波
    { level: 2, materialCode: "USG-WEBER-28K-5KW", materialName: "Weber 超声波发生器 28kHz/5kW (德标)", quantity: 2, unit: "台", unitCost: 9500, sourceType: "purchase", category: "超声波", supplier: "Weber Ultrasonics(德国)" },
    { level: 2, materialCode: "USG-WEBER-40K-3KW", materialName: "Weber 超声波发生器 40kHz/3kW (德标)", quantity: 2, unit: "台", unitCost: 8200, sourceType: "purchase", category: "超声波", supplier: "Weber Ultrasonics(德国)" },
    // L2 PLC (VW指定Siemens)
    { level: 2, materialCode: "PLC-S7-1516-3PN", materialName: "西门子 S7-1500 CPU1516-3PN/DP (VW指定)", quantity: 1, unit: "台", unitCost: 22000, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "PLC-ET200SP-SET", materialName: "西门子 ET200SP 远程IO站套件(含导轨+电源+模块)", quantity: 3, unit: "套", unitCost: 6500, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "NET-SCALANCE-X208", materialName: "西门子 SCALANCE X208 工业交换机", quantity: 2, unit: "台", unitCost: 3200, sourceType: "purchase", category: "网络", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "HMI-TP1200-COMFORT", materialName: "西门子 TP1200 Comfort 12寸触摸屏", quantity: 1, unit: "台", unitCost: 9800, sourceType: "purchase", category: "HMI", supplier: "西门子(Siemens)" },
    // L2 低压电气 (VW体系Siemens低压)
    { level: 2, materialCode: "CB-SIE-3VA2225", materialName: "西门子 3VA2 225A 塑壳断路器 (VW标准)", quantity: 1, unit: "台", unitCost: 3200, sourceType: "purchase", category: "低压电气", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "MC-SIE-3RT2026", materialName: "西门子 SIRIUS 3RT2026 接触器 25A", quantity: 10, unit: "台", unitCost: 145, sourceType: "purchase", category: "低压电气", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "VFD-SIE-G120C-7K5", materialName: "西门子 SINAMICS G120C 变频器 7.5kW", quantity: 3, unit: "台", unitCost: 4200, sourceType: "purchase", category: "变频器", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "CB-SIE-5SY6110", materialName: "西门子 5SY6 C10A 微型断路器", quantity: 20, unit: "台", unitCost: 42, sourceType: "purchase", category: "低压电气", supplier: "西门子(Siemens)" },
    // L2 传感器 (VW指定IFM/Balluff)
    { level: 2, materialCode: "SNS-IFM-SI5010", materialName: "IFM SI5010 流量传感器(DI水监测)", quantity: 4, unit: "只", unitCost: 1200, sourceType: "purchase", category: "传感器", supplier: "IFM易福门" },
    { level: 2, materialCode: "SNS-BALLUFF-BES", materialName: "Balluff BES 电感式接近开关", quantity: 16, unit: "只", unitCost: 280, sourceType: "purchase", category: "传感器", supplier: "Balluff巴鲁夫" },
    { level: 2, materialCode: "SNS-ENDRESS-CLS21", materialName: "E+H CLS21 电导率传感器(DI水质)", quantity: 2, unit: "只", unitCost: 3500, sourceType: "purchase", category: "传感器", supplier: "Endress+Hauser" },
    // L2 水处理 (VDA 19.1必需)
    { level: 2, materialCode: "DI-PALL-FILTER", materialName: "Pall DI水终端过滤器 0.2μm", quantity: 4, unit: "只", unitCost: 1800, sourceType: "purchase", category: "水处理", supplier: "Pall颇尔" },
    { level: 2, materialCode: "DI-SYSTEM-EDI", materialName: "EDI电去离子水系统 2T/h", quantity: 1, unit: "套", unitCost: 45000, sourceType: "purchase", category: "水处理" },
    // L2 清洁度检测 (VDA 19.1)
    { level: 2, materialCode: "VDA19-MILLIPORE", materialName: "Millipore 颗粒分析系统(VDA 19.1认证)", quantity: 1, unit: "套", unitCost: 85000, sourceType: "purchase", category: "检测", supplier: "Merck Millipore" },
    // L2 安全 (CE认证)
    { level: 2, materialCode: "SAFE-PILZ-PNOZ-S7", materialName: "Pilz PNOZsigma 安全PLC", quantity: 1, unit: "台", unitCost: 5500, sourceType: "purchase", category: "安全", supplier: "Pilz皮尔磁" },
    { level: 2, materialCode: "SAFE-EUCHNER-CET3", materialName: "Euchner CET3 安全门锁(VW标准)", quantity: 4, unit: "套", unitCost: 1800, sourceType: "purchase", category: "安全", supplier: "Euchner安士能" },
  ]);
  if (vw888) { console.log(`  BOM #${vw888.id}: ${vw888.count} 项`); }

  // ═══════════════════════════════════════════════════════
  // 2. Mercedes OM654 柴油机缸体 (MBN 10545)
  // ═══════════════════════════════════════════════════════
  console.log("【2】Mercedes OM654柴油机缸体清洗 (MBN 10545)");
  const mbOM654 = await createBom("MB-OM654-USC10", "Mercedes OM654柴油机缸体清洗线", [
    { level: 1, materialCode: "MB-PREWASH-HP", materialName: "预清洗+高压油道清洗(500bar)", quantity: 1, unit: "套", unitCost: 78000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "MB-USC-MULTI-FREQ", materialName: "多频超声波清洗(25+40+80kHz)", quantity: 1, unit: "套", unitCost: 95000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "MB-RINSE-CASCADE", materialName: "三级逆流漂洗(MBN标准)", quantity: 1, unit: "套", unitCost: 52000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "MB-PASSIVATION", materialName: "钝化防锈处理工位", quantity: 1, unit: "套", unitCost: 28000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "MB-VDR-HOTAIR", materialName: "热风+真空干燥组合", quantity: 1, unit: "套", unitCost: 62000, sourceType: "manufacture", category: "干燥工位" },
    // L2 关键件
    { level: 2, materialCode: "PUMP-GF-CRN20-10", materialName: "格兰富 CRN20-10 高扬程泵(高压供液)", quantity: 2, unit: "台", unitCost: 15000, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    { level: 2, materialCode: "VAC-LEYBOLD-SV200", materialName: "莱宝 SV200B 旋片真空泵(大排量)", quantity: 1, unit: "台", unitCost: 28000, sourceType: "purchase", category: "真空泵", supplier: "莱宝(Leybold)" },
    { level: 2, materialCode: "USG-WEBER-25K-8KW", materialName: "Weber 超声波发生器 25kHz/8kW", quantity: 2, unit: "台", unitCost: 14000, sourceType: "purchase", category: "超声波", supplier: "Weber Ultrasonics" },
    { level: 2, materialCode: "USG-WEBER-80K-2KW", materialName: "Weber 超声波发生器 80kHz/2kW(精洗)", quantity: 2, unit: "台", unitCost: 11000, sourceType: "purchase", category: "超声波", supplier: "Weber Ultrasonics" },
    { level: 2, materialCode: "PLC-S7-1517F", materialName: "西门子 S7-1517F 安全型CPU(Mercedes要求)", quantity: 1, unit: "台", unitCost: 35000, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "HMI-TP1900-COMFORT", materialName: "西门子 TP1900 Comfort 19寸", quantity: 1, unit: "台", unitCost: 15000, sourceType: "purchase", category: "HMI", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "VFD-SIE-S120-11K", materialName: "西门子 SINAMICS S120 变频驱动 11kW", quantity: 4, unit: "台", unitCost: 6800, sourceType: "purchase", category: "变频器", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "SNS-EH-LIQUILINE", materialName: "E+H Liquiline CM442 多参数水质分析仪", quantity: 1, unit: "台", unitCost: 12000, sourceType: "purchase", category: "传感器", supplier: "Endress+Hauser" },
    { level: 2, materialCode: "FILTER-HYDAC-RF", materialName: "HYDAC RF回油过滤器(清洗液过滤)", quantity: 8, unit: "只", unitCost: 950, sourceType: "purchase", category: "过滤", supplier: "HYDAC贺德克" },
    { level: 2, materialCode: "SAFE-SICK-C4000", materialName: "SICK C4000 安全光幕(Mercedes要求)", quantity: 2, unit: "套", unitCost: 4500, sourceType: "purchase", category: "安全", supplier: "SICK西克" },
  ]);
  if (mbOM654) { console.log(`  BOM #${mbOM654.id}: ${mbOM654.count} 项`); }

  // ═══════════════════════════════════════════════════════
  // 3. GM LT1 V8缸体清洗 (GM-9985225)
  // ═══════════════════════════════════════════════════════
  console.log("【3】GM LT1 V8缸体清洗 (GM-9985225)");
  const gmLT1 = await createBom("GM-LT1-USC06", "GM LT1 V8缸体清洗机", [
    { level: 1, materialCode: "GM-FLOOD-WASH", materialName: "满液式清洗工位(GM标准)", quantity: 2, unit: "套", unitCost: 45000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "GM-USC-40K-MOD", materialName: "40kHz超声波清洗工位", quantity: 2, unit: "套", unitCost: 52000, sourceType: "manufacture", category: "清洗工位" },
    { level: 1, materialCode: "GM-BLOWOFF-DRY", materialName: "高压吹气干燥工位", quantity: 2, unit: "套", unitCost: 32000, sourceType: "manufacture", category: "干燥工位" },
    // L2 (GM允许ABB/Rockwell)
    { level: 2, materialCode: "PLC-AB-5069-L340", materialName: "Allen-Bradley CompactLogix 5069-L340ER (GM指定)", quantity: 1, unit: "台", unitCost: 18000, sourceType: "purchase", category: "PLC", supplier: "Rockwell/AB" },
    { level: 2, materialCode: "HMI-AB-PV-PLUS7", materialName: "AB PanelView Plus 7 Performance 12寸", quantity: 1, unit: "台", unitCost: 8500, sourceType: "purchase", category: "HMI", supplier: "Rockwell/AB" },
    { level: 2, materialCode: "VFD-AB-PF525-5K5", materialName: "AB PowerFlex 525 变频器 5.5kW", quantity: 4, unit: "台", unitCost: 3200, sourceType: "purchase", category: "变频器", supplier: "Rockwell/AB" },
    { level: 2, materialCode: "PUMP-GF-CR15-3", materialName: "格兰富 CR15-3 (GM项目用)", quantity: 4, unit: "台", unitCost: 6800, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    { level: 2, materialCode: "SNS-AB-871TM", materialName: "AB 871TM 接近传感器", quantity: 12, unit: "只", unitCost: 350, sourceType: "purchase", category: "传感器", supplier: "Rockwell/AB" },
    { level: 2, materialCode: "SAFE-AB-GUARDLOGIX", materialName: "AB GuardLogix 安全控制器", quantity: 1, unit: "台", unitCost: 8000, sourceType: "purchase", category: "安全", supplier: "Rockwell/AB" },
  ]);
  if (gmLT1) { console.log(`  BOM #${gmLT1.id}: ${gmLT1.count} 项`); }

  // ═══════════════════════════════════════════════════════
  // 4. 德系标准高压去毛刺单元 (通用型)
  // ═══════════════════════════════════════════════════════
  console.log("【4】德系标准高压去毛刺单元");
  const stdHpd = await createBom("STD-HPD-DEBURR", "德系标准高压去毛刺单元", [
    { level: 1, materialCode: "HPD-STD-CHAMBER", materialName: "标准去毛刺腔体(SUS316L)", quantity: 1, unit: "套", unitCost: 38000, sourceType: "manufacture", category: "结构件" },
    { level: 2, materialCode: "PUMP-HP-HAUHINCO-EHP", materialName: "Hauhinco EHP3K 高压柱塞泵 700bar", quantity: 1, unit: "台", unitCost: 48000, sourceType: "purchase", category: "高压泵", supplier: "Hauhinco(德国)" },
    { level: 2, materialCode: "NZL-LECHLER-FLAT", materialName: "Lechler 扇形高压喷嘴组件", quantity: 4, unit: "套", unitCost: 2200, sourceType: "purchase", category: "喷嘴", supplier: "Lechler雷茨克" },
    { level: 2, materialCode: "FILTER-HP-MAHLE-PI", materialName: "MAHLE PI高压过滤器(10μm绝对)", quantity: 2, unit: "只", unitCost: 3500, sourceType: "purchase", category: "过滤", supplier: "MAHLE马勒" },
    { level: 2, materialCode: "ACC-HYDAC-SBO", materialName: "HYDAC SBO 蓄能器 20L/350bar", quantity: 1, unit: "只", unitCost: 5500, sourceType: "purchase", category: "高压", supplier: "HYDAC贺德克" },
    { level: 2, materialCode: "VLV-REXROTH-4WE", materialName: "力士乐 4WE6 电磁换向阀", quantity: 4, unit: "只", unitCost: 1200, sourceType: "purchase", category: "液压", supplier: "Bosch Rexroth" },
  ]);
  if (stdHpd) { console.log(`  BOM #${stdHpd.id}: ${stdHpd.count} 项`); }

  // ═══════════════════════════════════════════════════════
  // 5. 德系标准真空干燥单元
  // ═══════════════════════════════════════════════════════
  console.log("【5】德系标准真空干燥单元");
  const stdVdr = await createBom("STD-VDR-VACUUM", "德系标准真空干燥单元", [
    { level: 1, materialCode: "VDR-STD-CHAMBER", materialName: "标准真空腔体(SUS304)", quantity: 1, unit: "套", unitCost: 32000, sourceType: "manufacture", category: "结构件" },
    { level: 2, materialCode: "VAC-BUSCH-COBRA-NC", materialName: "普旭 COBRA NC 干式螺杆真空泵", quantity: 1, unit: "台", unitCost: 35000, sourceType: "purchase", category: "真空泵", supplier: "普旭(Busch)" },
    { level: 2, materialCode: "VAC-PFEIFFER-DUO20", materialName: "普发 Duo 20M 旋片泵(前级)", quantity: 1, unit: "台", unitCost: 12000, sourceType: "purchase", category: "真空泵", supplier: "Pfeiffer Vacuum" },
    { level: 2, materialCode: "VLV-VAT-GATE-DN200", materialName: "VAT DN200 真空闸阀(瑞士)", quantity: 1, unit: "只", unitCost: 8500, sourceType: "purchase", category: "真空阀", supplier: "VAT(瑞士)" },
    { level: 2, materialCode: "SNS-INFICON-CDG025", materialName: "INFICON CDG025 电容真空计", quantity: 1, unit: "只", unitCost: 4500, sourceType: "purchase", category: "传感器", supplier: "INFICON英福康" },
    { level: 2, materialCode: "HTR-HERAEUS-IR", materialName: "Heraeus 中波红外加热器 3kW", quantity: 4, unit: "只", unitCost: 2800, sourceType: "purchase", category: "加热", supplier: "Heraeus贺利氏" },
  ]);
  if (stdVdr) { console.log(`  BOM #${stdVdr.id}: ${stdVdr.count} 项`); }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  德系OEM标准清洗机BOM导入完成");
  console.log("═══════════════════════════════════════════════");
  console.log("  OEM标准体系:");
  console.log("  ├─ VW 大众: VDA 19.1 / VW PV 3347 / Siemens全家桶");
  console.log("  ├─ Mercedes 奔驰: MBN 10545 / S7-1517F安全型 / E+H水质");
  console.log("  └─ GM 通用: GM-9985225 / Rockwell/AB体系 / GuardLogix");
  console.log("  关键供应商(德系):");
  console.log("  ├─ 超声波: Weber Ultrasonics(德国)");
  console.log("  ├─ 高压泵: Hauhinco(德国), KAMAT(德国)");
  console.log("  ├─ 真空泵: 普旭Busch, 莱宝Leybold, 普发Pfeiffer");
  console.log("  ├─ PLC: 西门子S7-1500(VW/MB) / Rockwell AB(GM)");
  console.log("  ├─ 低压: 西门子SIRIUS(VW) / 施耐德(通用)");
  console.log("  ├─ 传感器: IFM, Balluff, E+H, SICK, INFICON");
  console.log("  ├─ 过滤: Pall, MAHLE, HYDAC");
  console.log("  ├─ 安全: Pilz, SICK, Euchner, Rockwell GuardLogix");
  console.log("  └─ 液压: Bosch Rexroth, VAT");
  console.log("═══════════════════════════════════════════════");
}

main().catch(e => { console.error(e); process.exit(1); });
