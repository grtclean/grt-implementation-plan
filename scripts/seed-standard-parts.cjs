/**
 * GRT 标准件物料库导入
 * 电机/减速机/链条/气缸/阀门/轴承/密封件/紧固件/线缆/管件
 *
 * Run: node scripts/seed-standard-parts.cjs
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
  return r?.result?.data?.json ?? null;
}
async function createBomWithItems(productCode, productName, items) {
  const m = await mut("bom.createBomMaster", { productCode, productName, bomType: "manufacturing", currentVersion: "1.0" });
  if (!m) return null;
  let n = 0;
  for (const it of items) { await mut("bom.addBomItem", { bomMasterId: m.id, ...it }); n++; }
  return { id: m.id, count: n };
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  // 标准件BOM — 通用清洗机标准件库
  console.log("【标准件物料库】");
  const stdParts = await createBomWithItems("STD-FILTER-UNIT", "标准件物料库(通用)", [
    // ── 电机 ──
    { level: 1, materialCode: "MOT-SIE-1LE0-0.75", materialName: "西门子 1LE0 三相异步电机 0.75kW B5", quantity: 1, unit: "台", unitCost: 850, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-SIE-1LE0-1.5", materialName: "西门子 1LE0 三相异步电机 1.5kW B5", quantity: 1, unit: "台", unitCost: 1200, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-SIE-1LE0-3.0", materialName: "西门子 1LE0 三相异步电机 3.0kW B5", quantity: 1, unit: "台", unitCost: 1800, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-SIE-1LE0-5.5", materialName: "西门子 1LE0 三相异步电机 5.5kW B5", quantity: 1, unit: "台", unitCost: 2800, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-SIE-1LE0-7.5", materialName: "西门子 1LE0 三相异步电机 7.5kW B3", quantity: 1, unit: "台", unitCost: 3500, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-SIE-1LE0-11", materialName: "西门子 1LE0 三相异步电机 11kW B3", quantity: 1, unit: "台", unitCost: 4800, sourceType: "purchase", category: "电机", supplier: "Siemens西门子" },
    { level: 1, materialCode: "MOT-STEP-42", materialName: "步进电机 42BYGH 1.8° 12V", quantity: 1, unit: "台", unitCost: 85, sourceType: "purchase", category: "电机" },
    { level: 1, materialCode: "MOT-SERVO-400W", materialName: "伺服电机 400W (含驱动器)", quantity: 1, unit: "套", unitCost: 2200, sourceType: "purchase", category: "电机" },
    // ── 减速机 ──
    { level: 1, materialCode: "GBX-SEW-R47-1.5", materialName: "SEW R47 斜齿轮减速机 1.5kW i=28", quantity: 1, unit: "台", unitCost: 3200, sourceType: "purchase", category: "减速机", supplier: "SEW" },
    { level: 1, materialCode: "GBX-SEW-R57-3.0", materialName: "SEW R57 斜齿轮减速机 3.0kW i=35", quantity: 1, unit: "台", unitCost: 4500, sourceType: "purchase", category: "减速机", supplier: "SEW" },
    { level: 1, materialCode: "GBX-SEW-K47-2.2", materialName: "SEW K47 伞齿轮减速机 2.2kW", quantity: 1, unit: "台", unitCost: 3800, sourceType: "purchase", category: "减速机", supplier: "SEW" },
    { level: 1, materialCode: "GBX-NORD-SK1SI50", materialName: "诺德 SK1SI50 蜗轮减速机", quantity: 1, unit: "台", unitCost: 2800, sourceType: "purchase", category: "减速机", supplier: "NORD诺德" },
    // ── 链条/链轮 ──
    { level: 1, materialCode: "CHAIN-RENOLD-08B", materialName: "Renold 08B 滚子链(1m)", quantity: 1, unit: "米", unitCost: 45, sourceType: "purchase", category: "链条", supplier: "Renold" },
    { level: 1, materialCode: "CHAIN-RENOLD-10B", materialName: "Renold 10B 滚子链(1m)", quantity: 1, unit: "米", unitCost: 65, sourceType: "purchase", category: "链条", supplier: "Renold" },
    { level: 1, materialCode: "CHAIN-RENOLD-12B", materialName: "Renold 12B 滚子链(1m)", quantity: 1, unit: "米", unitCost: 85, sourceType: "purchase", category: "链条", supplier: "Renold" },
    { level: 1, materialCode: "CHAIN-SUS-08B", materialName: "SUS304不锈钢链条 08B(1m)", quantity: 1, unit: "米", unitCost: 120, sourceType: "purchase", category: "链条" },
    { level: 1, materialCode: "SPROCKET-08B-17T", materialName: "链轮 08B 17齿 45#钢", quantity: 1, unit: "只", unitCost: 35, sourceType: "purchase", category: "链轮" },
    { level: 1, materialCode: "SPROCKET-10B-19T", materialName: "链轮 10B 19齿 45#钢", quantity: 1, unit: "只", unitCost: 48, sourceType: "purchase", category: "链轮" },
    // ── 气缸 ──
    { level: 1, materialCode: "CYL-SMC-CP96-32", materialName: "SMC CP96 标准气缸 φ32×100", quantity: 1, unit: "只", unitCost: 380, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    { level: 1, materialCode: "CYL-SMC-CP96-50", materialName: "SMC CP96 标准气缸 φ50×200", quantity: 1, unit: "只", unitCost: 680, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    { level: 1, materialCode: "CYL-SMC-CP96-63", materialName: "SMC CP96 标准气缸 φ63×300", quantity: 1, unit: "只", unitCost: 950, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    { level: 1, materialCode: "CYL-SMC-CP96-80", materialName: "SMC CP96 标准气缸 φ80×500", quantity: 1, unit: "只", unitCost: 1350, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    { level: 1, materialCode: "CYL-FESTO-DSBC-50", materialName: "Festo DSBC 标准气缸 φ50×200", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "气缸", supplier: "Festo费斯托" },
    { level: 1, materialCode: "CYL-SMC-MGPM-20", materialName: "SMC MGPM 薄型气缸 φ20×50", quantity: 1, unit: "只", unitCost: 220, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    { level: 1, materialCode: "CYL-SMC-CDQ2-25", materialName: "SMC CDQ2 薄型气缸 φ25×30", quantity: 1, unit: "只", unitCost: 180, sourceType: "purchase", category: "气缸", supplier: "SMC" },
    // ── 电磁阀/气动阀 ──
    { level: 1, materialCode: "VLV-SMC-SY3120", materialName: "SMC SY3120 五通电磁阀 M5", quantity: 1, unit: "只", unitCost: 120, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "VLV-SMC-SY5120", materialName: "SMC SY5120 五通电磁阀 1/8", quantity: 1, unit: "只", unitCost: 180, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "VLV-SMC-SY7120", materialName: "SMC SY7120 五通电磁阀 1/4", quantity: 1, unit: "只", unitCost: 250, sourceType: "purchase", category: "电磁阀", supplier: "SMC" },
    { level: 1, materialCode: "VLV-FESTO-VUVG", materialName: "Festo VUVG 电磁阀", quantity: 1, unit: "只", unitCost: 320, sourceType: "purchase", category: "电磁阀", supplier: "Festo" },
    // ── 水阀/球阀/蝶阀 ──
    { level: 1, materialCode: "VLV-BALL-DN25-SUS", materialName: "不锈钢球阀 DN25 304", quantity: 1, unit: "只", unitCost: 85, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-BALL-DN40-SUS", materialName: "不锈钢球阀 DN40 304", quantity: 1, unit: "只", unitCost: 120, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-BALL-DN50-SUS", materialName: "不锈钢球阀 DN50 316L", quantity: 1, unit: "只", unitCost: 180, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-BUTTERFLY-DN80", materialName: "不锈钢蝶阀 DN80 对夹式", quantity: 1, unit: "只", unitCost: 350, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-CHECK-DN25", materialName: "止回阀 DN25 304", quantity: 1, unit: "只", unitCost: 65, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-SOLENOID-DN20", materialName: "电磁水阀 DN20 不锈钢 24V", quantity: 1, unit: "只", unitCost: 280, sourceType: "purchase", category: "阀门" },
    { level: 1, materialCode: "VLV-PROPORTION-DN15", materialName: "比例调节阀 DN15 (4-20mA)", quantity: 1, unit: "只", unitCost: 1500, sourceType: "purchase", category: "阀门" },
    // ── 轴承 ──
    { level: 1, materialCode: "BRG-SKF-6205", materialName: "SKF 6205-2RS 深沟球轴承", quantity: 1, unit: "只", unitCost: 45, sourceType: "purchase", category: "轴承", supplier: "SKF" },
    { level: 1, materialCode: "BRG-SKF-6208", materialName: "SKF 6208-2RS 深沟球轴承", quantity: 1, unit: "只", unitCost: 75, sourceType: "purchase", category: "轴承", supplier: "SKF" },
    { level: 1, materialCode: "BRG-SKF-UCP205", materialName: "SKF UCP205 带座外球面轴承", quantity: 1, unit: "只", unitCost: 85, sourceType: "purchase", category: "轴承", supplier: "SKF" },
    { level: 1, materialCode: "BRG-SKF-UCF208", materialName: "SKF UCF208 方形带座轴承", quantity: 1, unit: "只", unitCost: 120, sourceType: "purchase", category: "轴承", supplier: "SKF" },
    { level: 1, materialCode: "BRG-THK-LM20", materialName: "THK LM20UU 直线轴承", quantity: 1, unit: "只", unitCost: 65, sourceType: "purchase", category: "轴承", supplier: "THK" },
    { level: 1, materialCode: "GUIDE-THK-HSR20", materialName: "THK HSR20 直线导轨(1m含滑块)", quantity: 1, unit: "套", unitCost: 450, sourceType: "purchase", category: "导轨", supplier: "THK" },
    // ── 密封件 ──
    { level: 1, materialCode: "SEAL-ORING-KIT", materialName: "O型圈套件(常用32规格)", quantity: 1, unit: "套", unitCost: 180, sourceType: "purchase", category: "密封件" },
    { level: 1, materialCode: "SEAL-VITON-KIT", materialName: "Viton氟橡胶O型圈套件(耐腐蚀)", quantity: 1, unit: "套", unitCost: 350, sourceType: "purchase", category: "密封件" },
    { level: 1, materialCode: "SEAL-GASKET-SUS", materialName: "不锈钢缠绕垫片套件(DN25-80)", quantity: 1, unit: "套", unitCost: 280, sourceType: "purchase", category: "密封件" },
    // ── 管件 ──
    { level: 1, materialCode: "PIPE-SUS304-DN25", materialName: "SUS304不锈钢管 DN25×2mm(6m)", quantity: 1, unit: "根", unitCost: 320, sourceType: "purchase", category: "管件" },
    { level: 1, materialCode: "PIPE-SUS304-DN40", materialName: "SUS304不锈钢管 DN40×2mm(6m)", quantity: 1, unit: "根", unitCost: 480, sourceType: "purchase", category: "管件" },
    { level: 1, materialCode: "PIPE-PVC-DN25", materialName: "UPVC管 DN25(化学液用)", quantity: 1, unit: "根", unitCost: 45, sourceType: "purchase", category: "管件" },
    { level: 1, materialCode: "FITTING-SUS-ELBOW90", materialName: "不锈钢90°弯头套件(DN25-50)", quantity: 1, unit: "套", unitCost: 220, sourceType: "purchase", category: "管件" },
    { level: 1, materialCode: "HOSE-FLEX-DN25", materialName: "不锈钢编织软管 DN25×500mm", quantity: 1, unit: "根", unitCost: 120, sourceType: "purchase", category: "管件" },
  ]);
  if (stdParts) console.log(`  BOM #${stdParts.id}: ${stdParts.count} 项`);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  标准件物料库导入完成");
  console.log("═══════════════════════════════════════════════");
  console.log("  覆盖品类:");
  console.log("  ├─ 电机: 西门子1LE0系列(0.75-11kW) + 步进 + 伺服");
  console.log("  ├─ 减速机: SEW R/K系列 + NORD蜗轮");
  console.log("  ├─ 链条/链轮: Renold 08B-12B + SUS304不锈钢链");
  console.log("  ├─ 气缸: SMC CP96/MGPM/CDQ2 + Festo DSBC");
  console.log("  ├─ 电磁阀: SMC SY3120-SY7120 + Festo VUVG");
  console.log("  ├─ 水阀: 球阀DN25-50 + 蝶阀DN80 + 止回阀 + 电磁水阀 + 比例阀");
  console.log("  ├─ 轴承: SKF 6205-6208/UCP/UCF + THK直线轴承/导轨");
  console.log("  ├─ 密封件: NBR/Viton O型圈 + 缠绕垫片");
  console.log("  └─ 管件: SUS304/UPVC管 + 弯头 + 软管");
  console.log("═══════════════════════════════════════════════");
}

main().catch(e => { console.error(e); process.exit(1); });
