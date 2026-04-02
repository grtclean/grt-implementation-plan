const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";
function request(method, path, body) { return new Promise((resolve, reject) => { const url = new URL(path, BASE); const data = body ? JSON.stringify(body) : null; const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}) } }; const r = http.request(opts, (res) => { if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0]; let d = []; res.on("data", c => d.push(c)); res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(d).toString("utf8"))); } catch { resolve(null); } }); }); r.on("error", reject); if (data) r.write(data, "utf8"); r.end(); }); }

(async () => {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  const bomId = 48;
  const sensors = [
    { level: 1, materialCode: "SNS-IFM-TA2502", materialName: "IFM TA2502 温度传感器 Pt1000 (-25~150C)", quantity: 1, unit: "只", unitCost: 580, sourceType: "purchase", category: "传感器-温度", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-TN2531X", materialName: "IFM TN2531 温度传感器 Pt100 (0~200C)", quantity: 1, unit: "只", unitCost: 650, sourceType: "purchase", category: "传感器-温度", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-TR2432", materialName: "IFM TR2432 红外温度传感器(非接触)", quantity: 1, unit: "只", unitCost: 1800, sourceType: "purchase", category: "传感器-温度", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-PG2454", materialName: "IFM PG2454 压力传感器 0-10bar", quantity: 1, unit: "只", unitCost: 750, sourceType: "purchase", category: "传感器-压力", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-PG2794", materialName: "IFM PG2794 压力传感器 0-25bar", quantity: 1, unit: "只", unitCost: 850, sourceType: "purchase", category: "传感器-压力", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-PI2715", materialName: "IFM PI2715 压力传感器 0-100bar(高压)", quantity: 1, unit: "只", unitCost: 1200, sourceType: "purchase", category: "传感器-压力", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-LR7000", materialName: "IFM LR7000 液位传感器(连续式4-20mA)", quantity: 1, unit: "只", unitCost: 1500, sourceType: "purchase", category: "传感器-液位", supplier: "IFM" },
    { level: 1, materialCode: "SNS-IFM-SM6000", materialName: "IFM SM6000 电磁流量传感器", quantity: 1, unit: "只", unitCost: 2500, sourceType: "purchase", category: "传感器-流量", supplier: "IFM" },
    { level: 1, materialCode: "SNS-EH-TMR31", materialName: "E+H TMR31 温度传感器 Pt100 卫生型", quantity: 1, unit: "只", unitCost: 1200, sourceType: "purchase", category: "传感器-温度", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-PMC51", materialName: "E+H PMC51 压力变送器 0-40bar(精度0.05%)", quantity: 1, unit: "只", unitCost: 3500, sourceType: "purchase", category: "传感器-压力", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-CLS21X", materialName: "E+H CLS21 电导率传感器(DI水质)", quantity: 1, unit: "只", unitCost: 3500, sourceType: "purchase", category: "传感器-水质", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-CPS11D", materialName: "E+H CPS11D pH传感器(清洗液)", quantity: 1, unit: "只", unitCost: 2800, sourceType: "purchase", category: "传感器-水质", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-CM442", materialName: "E+H CM442 多参数水质分析仪", quantity: 1, unit: "台", unitCost: 12000, sourceType: "purchase", category: "传感器-水质", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-FTL51", materialName: "E+H FTL51 音叉液位开关(防腐)", quantity: 1, unit: "只", unitCost: 2200, sourceType: "purchase", category: "传感器-液位", supplier: "E+H" },
    { level: 1, materialCode: "SNS-EH-PROMAG10W", materialName: "E+H Promag 10W 电磁流量计 DN25", quantity: 1, unit: "台", unitCost: 5500, sourceType: "purchase", category: "传感器-流量", supplier: "E+H" },
    { level: 1, materialCode: "SNS-LEYBOLD-TTR91", materialName: "莱宝 TTR91 热阴极真空计", quantity: 1, unit: "只", unitCost: 2800, sourceType: "purchase", category: "传感器-真空", supplier: "Leybold" },
    { level: 1, materialCode: "SNS-LEYBOLD-CTR100", materialName: "莱宝 CTR100 陶瓷电容真空计", quantity: 1, unit: "只", unitCost: 3200, sourceType: "purchase", category: "传感器-真空", supplier: "Leybold" },
    { level: 1, materialCode: "SNS-INFICON-CDG025X", materialName: "INFICON CDG025 电容真空计(0.1-1000mbar)", quantity: 1, unit: "只", unitCost: 4500, sourceType: "purchase", category: "传感器-真空", supplier: "INFICON" },
    { level: 1, materialCode: "SNS-PFEIFFER-PKR361", materialName: "普发 PKR361 全量程真空计", quantity: 1, unit: "只", unitCost: 5800, sourceType: "purchase", category: "传感器-真空", supplier: "Pfeiffer" },
    { level: 1, materialCode: "SNS-SICK-DT35", materialName: "SICK DT35 激光测距传感器(12m)", quantity: 1, unit: "只", unitCost: 2800, sourceType: "purchase", category: "传感器-距离", supplier: "SICK" },
    { level: 1, materialCode: "SNS-BALLUFF-BES-M12", materialName: "Balluff BES M12 电感接近开关", quantity: 1, unit: "只", unitCost: 280, sourceType: "purchase", category: "传感器-接近", supplier: "Balluff" },
    { level: 1, materialCode: "SNS-BALLUFF-BCS-M18", materialName: "Balluff BCS M18 电容接近开关(液位)", quantity: 1, unit: "只", unitCost: 450, sourceType: "purchase", category: "传感器-接近", supplier: "Balluff" },
  ];
  let n = 0;
  for (const s of sensors) {
    await request("POST", "/api/trpc/bom.addBomItem", { json: { bomMasterId: bomId, ...s } });
    n++; process.stdout.write(".");
  }
  console.log(`\n传感器: ${n} 项导入完成`);
  console.log("├─ IFM: 温度(3) + 压力(3) + 液位(1) + 流量(1)");
  console.log("├─ E+H: 温度(1) + 压力(1) + 水质(3) + 液位(1) + 流量(1)");
  console.log("├─ 真空: 莱宝(2) + INFICON(1) + Pfeiffer(1)");
  console.log("├─ SICK: 激光测距(1)");
  console.log("└─ Balluff: 电感(1) + 电容(1)");
})();
