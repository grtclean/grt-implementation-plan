/**
 * GRT BOM 标准模块导入
 * 非标工业清洗设备标准件BOM：水泵/真空泵/PLC/低压电气/传感器/气动元件
 *
 * Run: node scripts/seed-bom-standard-modules.cjs
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
  if (r?.error) { console.error(`  ERROR ${proc}:`, JSON.stringify(r.error).slice(0, 150)); return null; }
  return r?.result?.data?.json;
}

async function createBomWithItems(productCode, productName, bomType, items) {
  const master = await trpcMut("bom.createBomMaster", {
    productCode, productName, bomType, currentVersion: "1.0",
  });
  if (!master) return null;
  const bomMasterId = master.id;
  let created = 0;
  for (const item of items) {
    await trpcMut("bom.addBomItem", { bomMasterId, ...item });
    created++;
  }
  return { bomMasterId, itemCount: created };
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");
  let totalBoms = 0;
  let totalItems = 0;

  // ═══════════════════════════════════════════════════════
  // 1. USC-08-A 8工位超声波清洗机 — 标准BOM
  // ═══════════════════════════════════════════════════════
  console.log("【1】USC-08-A 8工位超声波清洗机");
  const usc08 = await createBomWithItems("USC-08-A", "8工位超声波清洗机", "manufacturing", [
    // Level 1: 主系统模块
    { level: 1, materialCode: "SYS-USC-TANK", materialName: "超声波清洗槽体组件(8槽)", quantity: 1, unit: "套", unitCost: 85000, sourceType: "manufacture", category: "结构件" },
    { level: 1, materialCode: "SYS-USC-TRANS", materialName: "传动系统(链条+升降)", quantity: 1, unit: "套", unitCost: 42000, sourceType: "manufacture", category: "传动" },
    { level: 1, materialCode: "SYS-USC-ELEC", materialName: "电气控制系统", quantity: 1, unit: "套", unitCost: 68000, sourceType: "manufacture", category: "电气" },
    { level: 1, materialCode: "SYS-USC-PIPE", materialName: "管路系统(进排水+循环)", quantity: 1, unit: "套", unitCost: 15000, sourceType: "manufacture", category: "管路" },
    // Level 2: 水泵模块
    { level: 2, materialCode: "PUMP-GF-CR10-5", materialName: "格兰富 CR10-5 立式多级离心泵", quantity: 2, unit: "台", unitCost: 8500, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    { level: 2, materialCode: "PUMP-GF-CR5-3", materialName: "格兰富 CR5-3 循环泵", quantity: 4, unit: "台", unitCost: 4200, sourceType: "purchase", category: "水泵", supplier: "格兰富(Grundfos)" },
    { level: 2, materialCode: "PUMP-NF-CDL4-8", materialName: "南方 CDL4-8 轻型立式多级泵", quantity: 2, unit: "台", unitCost: 2800, sourceType: "purchase", category: "水泵", supplier: "南方泵业(CNP)" },
    { level: 2, materialCode: "PUMP-NY-65QW-15", materialName: "南元 65QW-15 排污泵", quantity: 1, unit: "台", unitCost: 1500, sourceType: "purchase", category: "水泵", supplier: "南元泵业" },
    // Level 2: 超声波发生器
    { level: 2, materialCode: "USG-28K-3000W", materialName: "超声波发生器 28kHz/3000W", quantity: 4, unit: "台", unitCost: 6500, sourceType: "purchase", category: "超声波", supplier: "济南科源超声" },
    { level: 2, materialCode: "USG-40K-2000W", materialName: "超声波发生器 40kHz/2000W", quantity: 4, unit: "台", unitCost: 5800, sourceType: "purchase", category: "超声波", supplier: "济南科源超声" },
    { level: 2, materialCode: "UST-28K-PLATE", materialName: "超声波振板 28kHz (600×400mm)", quantity: 8, unit: "片", unitCost: 2200, sourceType: "purchase", category: "超声波" },
    // Level 2: PLC及电气
    { level: 2, materialCode: "PLC-S7-1515", materialName: "西门子 S7-1500 CPU1515-2PN", quantity: 1, unit: "台", unitCost: 15800, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "PLC-S7-DI32", materialName: "西门子 S7-1500 DI32模块 6ES7521", quantity: 2, unit: "块", unitCost: 2800, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "PLC-S7-DO32", materialName: "西门子 S7-1500 DO32模块 6ES7522", quantity: 2, unit: "块", unitCost: 3200, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "PLC-S7-AI8", materialName: "西门子 S7-1500 AI8模块 6ES7531", quantity: 1, unit: "块", unitCost: 4500, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "HMI-TP1500", materialName: "西门子 TP1500 精智面板 15寸", quantity: 1, unit: "台", unitCost: 12000, sourceType: "purchase", category: "HMI", supplier: "西门子(Siemens)" },
    // Level 2: 低压电气
    { level: 2, materialCode: "CB-SE-NSX250", materialName: "施耐德 NSX250N 塑壳断路器 3P", quantity: 1, unit: "台", unitCost: 2800, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "CB-SE-IC65-32", materialName: "施耐德 iC65N C32A 微型断路器", quantity: 12, unit: "台", unitCost: 85, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "MC-SE-LC1D25", materialName: "施耐德 LC1D25 交流接触器 25A", quantity: 8, unit: "台", unitCost: 120, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "VFD-SE-ATV320-7K5", materialName: "施耐德 ATV320 变频器 7.5kW", quantity: 2, unit: "台", unitCost: 3500, sourceType: "purchase", category: "变频器", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "RLY-SE-RXM4AB", materialName: "施耐德 RXM4AB 中间继电器 14脚", quantity: 16, unit: "只", unitCost: 35, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    // Level 2: 传感器
    { level: 2, materialCode: "SNS-IFM-LMT100", materialName: "IFM LMT100 液位传感器", quantity: 8, unit: "只", unitCost: 850, sourceType: "purchase", category: "传感器", supplier: "IFM易福门" },
    { level: 2, materialCode: "SNS-IFM-TN2531", materialName: "IFM TN2531 温度传感器 Pt100", quantity: 8, unit: "只", unitCost: 650, sourceType: "purchase", category: "传感器", supplier: "IFM易福门" },
    { level: 2, materialCode: "SNS-SICK-WL27", materialName: "SICK WL27 光电传感器", quantity: 4, unit: "只", unitCost: 520, sourceType: "purchase", category: "传感器", supplier: "SICK西克" },
    // Level 2: 气动元件
    { level: 2, materialCode: "CYL-SMC-CP96-50", materialName: "SMC CP96 气缸 φ50×200", quantity: 4, unit: "只", unitCost: 680, sourceType: "purchase", category: "气动", supplier: "SMC" },
    { level: 2, materialCode: "VLV-SMC-SY5120", materialName: "SMC SY5120 电磁阀", quantity: 8, unit: "只", unitCost: 180, sourceType: "purchase", category: "气动", supplier: "SMC" },
    { level: 2, materialCode: "FRL-SMC-AC40", materialName: "SMC AC40 气源处理三联件", quantity: 1, unit: "套", unitCost: 350, sourceType: "purchase", category: "气动", supplier: "SMC" },
    // Level 2: 加热系统
    { level: 2, materialCode: "HTR-OMEGA-6KW", materialName: "电加热管 不锈钢 6kW/380V", quantity: 8, unit: "根", unitCost: 280, sourceType: "purchase", category: "加热" },
    { level: 2, materialCode: "TC-OMEGA-PT100", materialName: "温控器 + PT100 探头", quantity: 8, unit: "套", unitCost: 450, sourceType: "purchase", category: "加热" },
  ]);
  if (usc08) { console.log(`  BOM #${usc08.bomMasterId}: ${usc08.itemCount} 项`); totalBoms++; totalItems += usc08.itemCount; }

  // ═══════════════════════════════════════════════════════
  // 2. HPD-800-B 800bar高压去毛刺 — 标准BOM
  // ═══════════════════════════════════════════════════════
  console.log("【2】HPD-800-B 800bar高压去毛刺机");
  const hpd800 = await createBomWithItems("HPD-800-B", "800bar高压定点清洗机(6轴)", "manufacturing", [
    { level: 1, materialCode: "SYS-HPD-CHAMBER", materialName: "高压清洗腔体(不锈钢焊接)", quantity: 1, unit: "套", unitCost: 45000, sourceType: "manufacture", category: "结构件" },
    { level: 1, materialCode: "SYS-HPD-ROBOT", materialName: "6轴机器人集成模块", quantity: 1, unit: "套", unitCost: 120000, sourceType: "purchase", category: "机器人" },
    { level: 1, materialCode: "SYS-HPD-HP-UNIT", materialName: "高压泵站单元", quantity: 1, unit: "套", unitCost: 85000, sourceType: "manufacture", category: "高压" },
    // 高压泵
    { level: 2, materialCode: "PUMP-HP-KAMAT-K800", materialName: "KAMAT K800 高压柱塞泵 800bar/40L", quantity: 1, unit: "台", unitCost: 65000, sourceType: "purchase", category: "高压泵", supplier: "KAMAT(德国)" },
    { level: 2, materialCode: "PUMP-HP-BOOSTER", materialName: "增压泵 进口低压→800bar", quantity: 1, unit: "台", unitCost: 12000, sourceType: "purchase", category: "高压泵" },
    // PLC
    { level: 2, materialCode: "PLC-S7-1517", materialName: "西门子 S7-1500 CPU1517-3PN/DP", quantity: 1, unit: "台", unitCost: 28000, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "PLC-PROFINET-IO", materialName: "西门子 PROFINET 远程IO站", quantity: 2, unit: "台", unitCost: 5500, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    // 低压电气
    { level: 2, materialCode: "CB-SE-NSX400", materialName: "施耐德 NSX400N 塑壳断路器 3P", quantity: 1, unit: "台", unitCost: 4500, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "VFD-SE-ATV930-22K", materialName: "施耐德 ATV930 变频器 22kW", quantity: 1, unit: "台", unitCost: 8500, sourceType: "purchase", category: "变频器", supplier: "施耐德(Schneider)" },
    // 高压喷嘴
    { level: 2, materialCode: "NZL-HP-0.8MM", materialName: "高压喷嘴 φ0.8mm 蓝宝石", quantity: 6, unit: "只", unitCost: 1200, sourceType: "purchase", category: "高压", supplier: "Spraying Systems" },
    { level: 2, materialCode: "NZL-HP-HOLDER", materialName: "喷嘴座(快换型)", quantity: 6, unit: "只", unitCost: 800, sourceType: "purchase", category: "高压" },
    // 安全
    { level: 2, materialCode: "SAFE-PILZ-PNOZ", materialName: "Pilz PNOZ 安全继电器", quantity: 2, unit: "台", unitCost: 2200, sourceType: "purchase", category: "安全", supplier: "Pilz皮尔磁" },
    { level: 2, materialCode: "SAFE-LOCK-GUARD", materialName: "安全门锁 电磁联锁", quantity: 2, unit: "套", unitCost: 1500, sourceType: "purchase", category: "安全" },
  ]);
  if (hpd800) { console.log(`  BOM #${hpd800.bomMasterId}: ${hpd800.itemCount} 项`); totalBoms++; totalItems += hpd800.itemCount; }

  // ═══════════════════════════════════════════════════════
  // 3. VDR-02-B 真空等离子干燥 — 标准BOM
  // ═══════════════════════════════════════════════════════
  console.log("【3】VDR-02-B 双腔真空等离子干燥系统");
  const vdr02 = await createBomWithItems("VDR-02-B", "双腔真空等离子干燥系统", "manufacturing", [
    { level: 1, materialCode: "SYS-VDR-CHAMBER", materialName: "真空干燥腔体(双腔)", quantity: 1, unit: "套", unitCost: 55000, sourceType: "manufacture", category: "结构件" },
    { level: 1, materialCode: "SYS-VDR-VACUUM", materialName: "真空系统模块", quantity: 1, unit: "套", unitCost: 75000, sourceType: "manufacture", category: "真空" },
    { level: 1, materialCode: "SYS-VDR-PLASMA", materialName: "等离子发生器模块", quantity: 1, unit: "套", unitCost: 35000, sourceType: "purchase", category: "等离子" },
    // 真空泵
    { level: 2, materialCode: "VAC-LEYBOLD-SV100", materialName: "莱宝 SV100B 旋片真空泵", quantity: 2, unit: "台", unitCost: 18000, sourceType: "purchase", category: "真空泵", supplier: "莱宝(Leybold)" },
    { level: 2, materialCode: "VAC-LEYBOLD-ROOTS", materialName: "莱宝 WAU501 罗茨真空泵", quantity: 1, unit: "台", unitCost: 25000, sourceType: "purchase", category: "真空泵", supplier: "莱宝(Leybold)" },
    { level: 2, materialCode: "VAC-GAUGE-PKR251", materialName: "莱宝 PKR251 全量程真空计", quantity: 2, unit: "只", unitCost: 3500, sourceType: "purchase", category: "真空", supplier: "莱宝(Leybold)" },
    // PLC
    { level: 2, materialCode: "PLC-S7-1513", materialName: "西门子 S7-1500 CPU1513-1PN", quantity: 1, unit: "台", unitCost: 9800, sourceType: "purchase", category: "PLC", supplier: "西门子(Siemens)" },
    { level: 2, materialCode: "HMI-KTP900", materialName: "西门子 KTP900 精智面板 9寸", quantity: 1, unit: "台", unitCost: 6500, sourceType: "purchase", category: "HMI", supplier: "西门子(Siemens)" },
    // 低压
    { level: 2, materialCode: "CB-SE-NSX160", materialName: "施耐德 NSX160N 塑壳断路器", quantity: 1, unit: "台", unitCost: 1800, sourceType: "purchase", category: "低压电气", supplier: "施耐德(Schneider)" },
    { level: 2, materialCode: "VFD-SE-ATV320-5K5", materialName: "施耐德 ATV320 变频器 5.5kW", quantity: 2, unit: "台", unitCost: 2800, sourceType: "purchase", category: "变频器", supplier: "施耐德(Schneider)" },
    // 密封件
    { level: 2, materialCode: "SEAL-VIT-ORING-350", materialName: "Viton O型圈 φ350×5.7", quantity: 4, unit: "只", unitCost: 85, sourceType: "purchase", category: "密封件" },
    { level: 2, materialCode: "SEAL-DOOR-INFLAT", materialName: "充气密封条(门框用)", quantity: 2, unit: "条", unitCost: 1200, sourceType: "purchase", category: "密封件" },
  ]);
  if (vdr02) { console.log(`  BOM #${vdr02.bomMasterId}: ${vdr02.itemCount} 项`); totalBoms++; totalItems += vdr02.itemCount; }

  console.log("\n═══════════════════════════════════════");
  console.log("  GRT 标准BOM模块导入完成");
  console.log("═══════════════════════════════════════");
  console.log(`  BOM: ${totalBoms} 套`);
  console.log(`  物料: ${totalItems} 项`);
  console.log("  品牌覆盖:");
  console.log("  ├─ 水泵: 格兰富(Grundfos), 南方(CNP), 南元");
  console.log("  ├─ 真空泵: 莱宝(Leybold)");
  console.log("  ├─ PLC/HMI: 西门子(Siemens) S7-1500系列");
  console.log("  ├─ 低压电气: 施耐德(Schneider) NSX/iC65/LC1D/ATV");
  console.log("  ├─ 传感器: IFM易福门, SICK西克");
  console.log("  ├─ 气动: SMC");
  console.log("  ├─ 高压泵: KAMAT(德国)");
  console.log("  ├─ 安全: Pilz皮尔磁");
  console.log("  └─ 超声波: 科源超声");
  console.log("═══════════════════════════════════════");
  console.log("  访问: http://localhost:3001/bom-management");
}

main().catch(e => { console.error(e); process.exit(1); });
