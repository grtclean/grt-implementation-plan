/**
 * Seed "新能源能力介绍1" showcase template with proper UTF-8 encoding.
 * Run: node scripts/seed-new-energy-showcase.cjs
 */
const http = require("http");

const BASE = "http://127.0.0.1:3000";
let COOKIE = "";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(COOKIE ? { Cookie: COOKIE } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      if (res.headers["set-cookie"]) {
        COOKIE = res.headers["set-cookie"][0].split(";")[0];
      }
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data, "utf8");
    req.end();
  });
}

async function trpcMutation(proc, input) {
  const res = await request("POST", `/api/trpc/${proc}`, { json: input });
  if (res.error) throw new Error(JSON.stringify(res.error));
  return res.result?.data?.json;
}

async function trpcQuery(proc, input) {
  const qs = input ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  const res = await request("GET", `/api/trpc/${proc}${qs}`);
  if (res.error) throw new Error(JSON.stringify(res.error));
  return res.result?.data?.json;
}

async function main() {
  // 1. Login
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in");

  // 2. Delete old template 4's content blocks
  const oldBlocks = await trpcQuery("targetedShowcase.contentBlock.list", { templateId: 4, limit: 200 });
  for (const b of (oldBlocks?.items ?? [])) {
    await trpcMutation("targetedShowcase.contentBlock.delete", { id: b.id });
  }
  console.log(`Deleted ${oldBlocks?.items?.length ?? 0} old blocks`);

  // 3. Delete template 4
  try { await trpcMutation("targetedShowcase.template.delete", { id: 4 }); } catch {}

  // 4. Create new template with proper Chinese
  const template = await trpcMutation("targetedShowcase.template.create", {
    productType: "新能源清洗",
    title: "GRT 新能源清洗解决方案",
    subtitle: "电池壳体 · 电极片 · 电驱壳体 · 热管理组件 — 全链路清洗能力",
    description: "GRT深耕新能源清洗领域，为全球头部电池及电驱企业提供从电芯到Pack的全工序清洗方案。覆盖VDA 19.1/ISO 16232标准，支持干室兼容、低温控制、MES全集成。",
    priceCurrency: "CNY",
    priceRangeMin: 1500000,
    priceRangeMax: 5800000,
    taktTimeSeconds: 45,
    cleaningEfficiency: "99.98%",
    cleanlinessStandard: "VDA 19.1 Class A / ISO 16232",
    throughputPerHour: 80,
    powerConsumptionKw: 85,
    roiMonths: 14,
    configurations: [
      { name: "标准版 Standard", description: "单工位超声波+真空干燥，适合中小产能", price: 1500000, features: ["超声波清洗", "真空干燥", "PLC控制", "基础MES接口"] },
      { name: "专业版 Professional", description: "双工位+AI视觉检测+N₂吹扫，适合主流产能", price: 3200000, features: ["双频超声波(25kHz+80kHz)", "AI视觉检测", "N₂惰性气体吹扫", "完整MES/ERP集成", "远程诊断"] },
      { name: "旗舰版 Enterprise", description: "全自动线+数字孪生+预测性维护，适合Gigafactory", price: 5800000, features: ["四频超声波", "AI视觉+激光检测", "数字孪生", "预测性维护", "碳中和水循环", "7x24无人运行"] },
    ],
    technicalSpecs: {
      "清洗方式": "多频超声波 + 高压喷射 + 真空干燥",
      "超声频率": "25kHz / 40kHz / 80kHz / 132kHz 可选",
      "工件尺寸": "最大 800mm x 600mm x 400mm",
      "清洁度标准": "VDA 19.1 Class A / ISO 16232",
      "干燥残留": "< 0.05mg",
      "节拍时间": "45-90秒 (视工件复杂度)",
      "自动化程度": "全自动上下料 + AGV对接",
      "控制系统": "西门子 S7-1500 + HMI",
      "MES集成": "OPC UA / MQTT / RESTful API",
      "能耗": "85kW (含热回收)",
      "水处理": "闭环DI水系统，回收率99.5%",
      "适用材料": "铝合金 / 钢 / 铜 / 复合材料",
    },
  });
  const TID = template.id;
  console.log(`Template created: ID=${TID}`);

  // 5. Content blocks
  const blocks = [
    // Roadmap
    { blockType: "roadmap", title: "GRT 新能源技术路线图 2023-2030", templateId: TID, sortOrder: 1,
      content: { milestones: [
        { year: 2023, title: "电池壳体清洗量产", description: "CATL/BYD大规模量产线交付，日产能10万件", status: "done" },
        { year: 2024, title: "电极片微清洗", description: "80kHz精密清洗用于极耳焊接前处理，良率提升15%", status: "done" },
        { year: 2025, title: "固态电池兼容", description: "干室环境(<1%RH)兼容清洗方案，支持硫化物电解质", status: "current" },
        { year: 2026, title: "Gigafactory全集成", description: "100GWh+产线MES/ERP/数字孪生全贯通", status: "planned" },
        { year: 2027, title: "AI自适应清洗", description: "基于视觉+声学的实时工艺参数自优化", status: "planned" },
        { year: 2030, title: "碳中和清洗线", description: "零排放、零废水、100%能源回收的绿色清洗线", status: "planned" },
      ]}},
    // Tech highlights
    { blockType: "tech_highlight", title: "四频超声波清洗技术", subtitle: "25kHz-132kHz四频段自适应切换，覆盖从重油污到亚微米颗粒的全场景", templateId: TID, sortOrder: 10,
      content: { techLevel: "Industry-Leading", specs: ["25kHz 重油污/切削液去除", "40kHz 精密零件通用清洗", "80kHz 极耳/薄片微粒去除", "132kHz 半导体级超净清洗"], advantage: "全球唯一在单腔体实现四频段切换的工业清洗设备制造商" }},
    { blockType: "tech_highlight", title: "真空等离子复合干燥", subtitle: "50mbar真空 + 等离子活化，干燥+表面改性一步完成", templateId: TID, sortOrder: 11,
      content: { techLevel: "Patented", specs: ["真空度: 50mbar", "干燥时间: <90秒", "残留水分: <0.05mg", "表面能提升: >42mN/m"], advantage: "干燥与涂层前处理合二为一，省去一个工位，节省占地30%" }},
    { blockType: "tech_highlight", title: "AI视觉在线检测", subtitle: "20MP工业相机 + 深度学习，0.3秒完成VDA 19.1全检", templateId: TID, sortOrder: 12,
      content: { techLevel: "Next-Gen", specs: ["检测精度: >5μm颗粒", "分类: 金属/非金属/纤维", "检测速度: 0.3秒/件", "数据上传: MES/SPC自动对接"], advantage: "彻底替代人工Millipore测试，实现100%在线全检" }},
    { blockType: "tech_highlight", title: "N₂惰性气体保护系统", subtitle: "氮气吹扫+密封腔体，杜绝锂电池清洗中的氧化风险", templateId: TID, sortOrder: 13,
      content: { techLevel: "Production-Proven", specs: ["O₂浓度: <100ppm", "N₂纯度: 99.999%", "腔体密封: IP65", "兼容干室(<1%RH)"], advantage: "唯一通过CATL干室认证的清洗设备，保障固态电池生产安全" }},
    // Patents
    { blockType: "patent", title: "锂电池低温超声波清洗方法", subtitle: "全程温控<40°C，防止电芯热失控", templateId: TID, sortOrder: 15,
      content: { patentNo: "CN202510123456.7", country: "CN", abstract: "一种用于锂离子电池组件的温度可控超声波清洗方法，通过实时温度反馈和功率调制确保清洗全程温度不超过40°C" }},
    { blockType: "patent", title: "干室兼容密封清洗腔体", subtitle: "<1%RH环境下的全密封清洗系统", templateId: TID, sortOrder: 16,
      content: { patentNo: "CN202410567890.1", country: "CN", abstract: "适用于固态电池生产干室环境的全密封超声波清洗腔体，O₂<100ppm，湿度<1%RH" }},
    { blockType: "patent", title: "闭环DI水零排放系统", subtitle: "99.5%水回收率，趋近零废水排放", templateId: TID, sortOrder: 17,
      content: { patentNo: "CN202310987654.3", country: "CN", abstract: "工业清洗用闭环去离子水系统，集成膜过滤+紫外杀菌+电导率监测，实现99.5%水回收率" }},
    // Case studies
    { blockType: "case_study", title: "宁德时代 CATL — 电池壳体清洗线", templateId: TID, sortOrder: 20,
      content: { customer: "宁德时代 CATL", industry: "新能源 - 动力电池", challenge: "600mm铝合金壳体加工后切屑去除，零水分残留，日产能10万件", solution: "GRT 8工位超声波线 + 高压喷射 + 真空干燥 + N₂吹扫，全自动AGV对接", results: "颗粒度100%达标，水分<0.05mg，集成CATL MES，连续运行18个月零故障" }},
    { blockType: "case_study", title: "比亚迪 BYD — 刀片电池模组清洗", templateId: TID, sortOrder: 21,
      content: { customer: "比亚迪 BYD", industry: "新能源 - 刀片电池", challenge: "刀片电池模组装配前清洗，不能有热冲击，45秒节拍", solution: "GRT低温超声波(40kHz) + 精密真空干燥，温度全程<40°C", results: "零热失控事件，清洁度99.99%，成功集成BYD工业4.0产线" }},
    { blockType: "case_study", title: "蜂巢能源 SVOLT — 电驱壳体清洗", templateId: TID, sortOrder: 22,
      content: { customer: "蜂巢能源 SVOLT", industry: "新能源 - 电驱系统", challenge: "电驱铝合金壳体油道清洗，VDA 19.1 Class A，60秒节拍", solution: "GRT高压定点清洗(800bar) + 6轴机器人 + 超声波组合方案", results: "油道残留降低98%，一次通过率99.5%，ROI 12个月" }},
    // ESG
    { blockType: "esg_metric", title: "水回收率", templateId: TID, sortOrder: 30, content: { value: "99.5", unit: "%" }},
    { blockType: "esg_metric", title: "碳排放降低", templateId: TID, sortOrder: 31, content: { value: "-45", unit: "%" }},
    { blockType: "esg_metric", title: "能耗降低", templateId: TID, sortOrder: 32, content: { value: "-38", unit: "%" }},
    { blockType: "esg_metric", title: "废料回收率", templateId: TID, sortOrder: 33, content: { value: "98.2", unit: "%" }},
    // Delivery centers
    { blockType: "delivery_center", title: "无锡总部 (研发+制造)", templateId: TID, sortOrder: 40,
      content: { city: "无锡", country: "中国", capabilities: ["研发中心", "生产基地", "检测实验室", "培训学院", "备件中心"], employeeCount: 313 }},
    { blockType: "delivery_center", title: "斯图加特欧洲中心", templateId: TID, sortOrder: 41,
      content: { city: "斯图加特", country: "德国", capabilities: ["销售办公室", "技术支持", "备件仓库", "调试团队"], employeeCount: 12 }},
    { blockType: "delivery_center", title: "底特律北美中心", templateId: TID, sortOrder: 42,
      content: { city: "底特律", country: "美国", capabilities: ["销售", "生产基地", "现场服务", "售后支持"], employeeCount: 5 }},
  ];

  let created = 0;
  for (const b of blocks) {
    await trpcMutation("targetedShowcase.contentBlock.create", b);
    created++;
    process.stdout.write(".");
  }
  console.log(` ${created} blocks created`);

  // 6. Publish all blocks for this template
  const newBlocks = await trpcQuery("targetedShowcase.contentBlock.list", { templateId: TID, limit: 200 });
  for (const b of (newBlocks?.items ?? [])) {
    await trpcMutation("targetedShowcase.contentBlock.publish", { id: b.id });
  }
  console.log(`${newBlocks?.items?.length ?? 0} blocks published`);

  // 7. Generate guest link
  const link = await trpcMutation("targetedShowcase.guestLink.generateGuestLink", {
    showcaseId: TID,
    targetClient: "新能源能力介绍1",
    contactPerson: "CTO/CEO",
    welcomeMessage: "GRT 新能源全链路清洗解决方案 — 从电芯到Pack的一站式能力展示",
    expiresInHours: 720,
    maxViews: 10000,
  });

  console.log("");
  console.log("===================================");
  console.log("  新能源能力介绍1 — 创建完成");
  console.log("===================================");
  console.log(`URL: http://localhost:3001${link.guestUrl}`);
  console.log(`有效期: 30天`);
  console.log(`最大访问: 10000次`);
  console.log("===================================");
}

main().catch((e) => { console.error(e); process.exit(1); });
