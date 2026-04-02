/**
 * Seed 非标自动化设备 PDM 产品数据
 * 基于GRT真实产品线：超声波/高压/真空干燥/等离子/混合线
 * Run: node scripts/seed-pdm-products.cjs
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
  return r?.result?.data?.json;
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  // ═══════ 产品主数据 ═══════
  const products = [
    // 超声波清洗系统
    { productCode: "USC-06-A", productName: "6工位超声波清洗机", productFamily: "USC", stationCount: 6, lifecycleStatus: "production" },
    { productCode: "USC-08-A", productName: "8工位超声波清洗机", productFamily: "USC", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "USC-10-B", productName: "10工位超声波精密清洗线", productFamily: "USC", stationCount: 10, lifecycleStatus: "released" },
    { productCode: "USC-12-C", productName: "12工位超声波全自动清洗线", productFamily: "USC", stationCount: 12, lifecycleStatus: "design" },
    { productCode: "USC-15-A", productName: "15工位重型超声波清洗系统", productFamily: "USC", stationCount: 15, lifecycleStatus: "concept" },
    // 高压去毛刺
    { productCode: "HPD-500-A", productName: "500bar高压去毛刺机", productFamily: "HPD", stationCount: 2, lifecycleStatus: "production" },
    { productCode: "HPD-800-B", productName: "800bar高压定点清洗机(6轴)", productFamily: "HPD", stationCount: 3, lifecycleStatus: "released" },
    { productCode: "HPD-1000-A", productName: "1000bar超高压去毛刺系统", productFamily: "HPD", stationCount: 4, lifecycleStatus: "design" },
    // 真空干燥
    { productCode: "VDR-01-A", productName: "单腔真空干燥机", productFamily: "VDR", stationCount: 1, lifecycleStatus: "production" },
    { productCode: "VDR-02-B", productName: "双腔真空等离子干燥系统", productFamily: "VDR", stationCount: 2, lifecycleStatus: "released" },
    // 喷淋清洗
    { productCode: "SPR-04-A", productName: "4工位喷淋清洗机", productFamily: "SPR", stationCount: 4, lifecycleStatus: "production" },
    { productCode: "SPR-06-B", productName: "6工位喷淋+超声波组合清洗线", productFamily: "SPR", stationCount: 6, lifecycleStatus: "released" },
    // 混合清洗线（非标定制）
    { productCode: "HYB-EA888-01", productName: "EA888缸体清洗专线", productFamily: "HYB", stationCount: 8, lifecycleStatus: "production" },
    { productCode: "HYB-CATL-01", productName: "CATL电池壳体清洗线", productFamily: "HYB", stationCount: 10, lifecycleStatus: "production" },
    { productCode: "HYB-BYD-01", productName: "BYD刀片电池模组清洗线", productFamily: "HYB", stationCount: 6, lifecycleStatus: "released" },
    { productCode: "HYB-SVOLT-01", productName: "蜂巢能源电驱壳体清洗系统", productFamily: "HYB", stationCount: 5, lifecycleStatus: "design" },
    // 缸体/齿轴专机
    { productCode: "EBK-V6-01", productName: "V6发动机缸体清洗专机", productFamily: "EBK", stationCount: 6, lifecycleStatus: "production" },
    { productCode: "GRX-AT6-01", productName: "6AT变速箱齿轴清洗机", productFamily: "GRX", stationCount: 4, lifecycleStatus: "released" },
    { productCode: "GRX-DCT-01", productName: "DCT双离合齿轴清洗线", productFamily: "GRX", stationCount: 8, lifecycleStatus: "design" },
    // 半导体
    { productCode: "SMC-132-A", productName: "132kHz半导体晶圆清洗机", productFamily: "SMC", stationCount: 4, lifecycleStatus: "concept" },
    // 浸泡
    { productCode: "IMM-03-A", productName: "3槽浸泡式清洗机", productFamily: "IMM", stationCount: 3, lifecycleStatus: "production" },
    // 等离子
    { productCode: "PLS-01-A", productName: "大气等离子表面处理机", productFamily: "PLS", stationCount: 1, lifecycleStatus: "released" },
  ];

  let created = 0;
  for (const p of products) {
    try {
      await trpcMut("pdm.product.create", p);
      created++;
      process.stdout.write(".");
    } catch (e) {
      // Skip if already exists
      process.stdout.write("x");
    }
  }
  console.log(`\n产品: ${created} 个创建成功`);

  // ═══════ 图纸数据 ═══════
  const drawings = [
    // USC-08-A 总装图系列
    { drawingNumber: "DWG-USC08-ASM-001", title: "USC-08-A 总装图", drawingType: "assembly", productCode: "USC-08-A", designer: "洪香龙", version: "B.2", status: "released", fileFormat: "sldasm" },
    { drawingNumber: "DWG-USC08-M-001", title: "清洗腔体 #1-#4 详图", drawingType: "detail", productCode: "USC-08-A", designer: "洪小东", version: "A.3", status: "released", fileFormat: "sldprt" },
    { drawingNumber: "DWG-USC08-M-002", title: "超声波振板安装图", drawingType: "mechanical", productCode: "USC-08-A", designer: "蔡瑞", version: "A.1", status: "approved", fileFormat: "sldprt" },
    { drawingNumber: "DWG-USC08-M-003", title: "工件篮定位机构", drawingType: "mechanical", productCode: "USC-08-A", designer: "洪香龙", version: "B.1", status: "released", fileFormat: "step" },
    { drawingNumber: "DWG-USC08-E-001", title: "主电气原理图", drawingType: "electrical", productCode: "USC-08-A", designer: "李大鹏", version: "C.1", status: "released", fileFormat: "eplan" },
    { drawingNumber: "DWG-USC08-E-002", title: "PLC I/O分配表", drawingType: "schematic", productCode: "USC-08-A", designer: "钱佳奇", version: "B.1", status: "released", fileFormat: "pdf" },
    { drawingNumber: "DWG-USC08-P-001", title: "清洗液管路图", drawingType: "piping", productCode: "USC-08-A", designer: "殷金刚", version: "A.2", status: "approved", fileFormat: "dwg" },
    { drawingNumber: "DWG-USC08-H-001", title: "液压升降系统图", drawingType: "hydraulic", productCode: "USC-08-A", designer: "洪小东", version: "A.1", status: "in_review", fileFormat: "dwg" },
    { drawingNumber: "DWG-USC08-LAY-001", title: "设备布局图(客户厂房)", drawingType: "layout", productCode: "USC-08-A", designer: "洪香龙", version: "D.1", status: "released", fileFormat: "dwg" },
    // HPD-800-B
    { drawingNumber: "DWG-HPD800-ASM-001", title: "HPD-800-B 总装图", drawingType: "assembly", productCode: "HPD-800-B", designer: "洪香龙", version: "A.2", status: "released", fileFormat: "sldasm" },
    { drawingNumber: "DWG-HPD800-M-001", title: "高压喷嘴组件详图", drawingType: "detail", productCode: "HPD-800-B", designer: "蔡瑞", version: "B.1", status: "released", fileFormat: "sldprt" },
    { drawingNumber: "DWG-HPD800-M-002", title: "6轴机器人集成安装图", drawingType: "mechanical", productCode: "HPD-800-B", designer: "殷金刚", version: "A.1", status: "approved", fileFormat: "step" },
    { drawingNumber: "DWG-HPD800-E-001", title: "机器人电气接口图", drawingType: "wiring", productCode: "HPD-800-B", designer: "钱佳奇", version: "A.2", status: "released", fileFormat: "eplan" },
    // HYB-CATL-01
    { drawingNumber: "DWG-CATL01-ASM-001", title: "CATL电池壳体清洗线总装", drawingType: "assembly", productCode: "HYB-CATL-01", designer: "洪香龙", version: "C.1", status: "released", fileFormat: "sldasm" },
    { drawingNumber: "DWG-CATL01-M-001", title: "N₂吹扫密封腔体", drawingType: "detail", productCode: "HYB-CATL-01", designer: "洪小东", version: "B.2", status: "released", fileFormat: "sldprt" },
    { drawingNumber: "DWG-CATL01-M-002", title: "AGV对接定位平台", drawingType: "mechanical", productCode: "HYB-CATL-01", designer: "蔡瑞", version: "A.1", status: "approved", fileFormat: "step" },
    { drawingNumber: "DWG-CATL01-E-001", title: "MES/OPC-UA通讯架构图", drawingType: "schematic", productCode: "HYB-CATL-01", designer: "李大鹏", version: "B.1", status: "released", fileFormat: "pdf" },
    { drawingNumber: "DWG-CATL01-PN-001", title: "气路控制原理图", drawingType: "pneumatic", productCode: "HYB-CATL-01", designer: "殷金刚", version: "A.2", status: "released", fileFormat: "dwg" },
    // EBK-V6-01
    { drawingNumber: "DWG-EBK-V6-ASM-001", title: "V6缸体清洗专机总装图", drawingType: "assembly", productCode: "EBK-V6-01", designer: "洪香龙", version: "B.3", status: "released", fileFormat: "sldasm" },
    { drawingNumber: "DWG-EBK-V6-M-001", title: "缸体定位夹具详图", drawingType: "detail", productCode: "EBK-V6-01", designer: "洪小东", version: "A.2", status: "released", fileFormat: "sldprt" },
    // GRX-AT6-01
    { drawingNumber: "DWG-GRX-AT6-ASM-001", title: "6AT齿轴清洗机总装图", drawingType: "assembly", productCode: "GRX-AT6-01", designer: "洪香龙", version: "A.1", status: "released", fileFormat: "sldasm" },
    { drawingNumber: "DWG-GRX-AT6-M-001", title: "齿轴工件篮组件", drawingType: "detail", productCode: "GRX-AT6-01", designer: "蔡瑞", version: "A.1", status: "in_review", fileFormat: "sldprt" },
  ];

  let dwgCreated = 0;
  for (const d of drawings) {
    try {
      await trpcMut("drawingLibrary.create", d);
      dwgCreated++;
      process.stdout.write(".");
    } catch { process.stdout.write("x"); }
  }
  console.log(`\n图纸: ${dwgCreated} 张创建成功`);

  console.log("\n═══════════════════════════════════════");
  console.log("  PDM 专业数据初始化完成");
  console.log("═══════════════════════════════════════");
  console.log(`  产品: ${created} 个 (${products.length} 型号)`);
  console.log(`  图纸: ${dwgCreated} 张`);
  console.log("  产品线覆盖:");
  console.log("  ├─ USC 超声波清洗 (5型号: 6/8/10/12/15工位)");
  console.log("  ├─ HPD 高压去毛刺 (3型号: 500/800/1000bar)");
  console.log("  ├─ VDR 真空干燥 (2型号: 单腔/双腔等离子)");
  console.log("  ├─ SPR 喷淋清洗 (2型号: 4/6工位)");
  console.log("  ├─ HYB 混合线 (4型号: EA888/CATL/BYD/SVOLT)");
  console.log("  ├─ EBK 缸体专机 (1型号: V6)");
  console.log("  ├─ GRX 齿轴专机 (2型号: 6AT/DCT)");
  console.log("  ├─ SMC 半导体 (1型号: 132kHz)");
  console.log("  ├─ IMM 浸泡式 (1型号: 3槽)");
  console.log("  └─ PLS 等离子 (1型号: 大气)");
  console.log("═══════════════════════════════════════");
  console.log("  访问: http://localhost:3001/pdm");
  console.log("  图纸: http://localhost:3001/drawing-library");
}

main().catch(e => { console.error(e); process.exit(1); });
