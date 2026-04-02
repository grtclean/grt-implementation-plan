/**
 * Seed TK6 供应商招标展厅模板 + 内容块
 * Run: node scripts/seed-supplier-rfp-showcase.cjs
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
async function trpc(proc, input) {
  const r = await request("POST", `/api/trpc/${proc}`, { json: input });
  if (r?.error) throw new Error(JSON.stringify(r.error));
  return r?.result?.data?.json;
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in");

  // 1. 创建供应商招标模板
  const tpl = await trpc("targetedShowcase.template.create", {
    productType: "供应商招标",
    title: "GRT 数字化招标邀请 — TK6 供应链选拔",
    subtitle: "基于 GRT WIN-WIN 数字化平台的全生命周期采购管理",
    description: "GRT 项目 TK6 阶段供应商入围及数字化竞价。通过数字化孪生与全生命周期管理，实现采购流程透明化、成本最优化。中标供应商将接入 GRT Showcase Hub 系统，享受实时数据同步、流程减耗、战略合作优先权。",
    priceCurrency: "EUR",
    taktTimeSeconds: 45,
    cleaningEfficiency: "99.97%",
    cleanlinessStandard: "VDA 19.1 Class A",
    throughputPerHour: 80,
    roiMonths: 14,
    configurations: [
      { name: "标准配置 Standard", description: "满足基本 TK6 性能对标要求", price: 280000, features: ["92% Up-time Rate 保障", "VDA 19.1 Class A 合规", "基础 MES 对接接口", "12个月质保"] },
      { name: "数字化增值配置 Digital+", description: "接入 GRT 数字化平台，享受全生命周期服务", price: 350000, features: ["实时设备健康监控", "AI 预测性维护", "Showcase Hub 数据同步", "自动报障(减少驻场技术员)", "24个月延保", "优先获得后续项目"] },
      { name: "战略合作配置 Strategic", description: "锁定 GRT 未来3年采购计划优先权", price: 320000, features: ["3年框架协议锁价", "年度采购量承诺折扣", "联合品牌推广", "技术路线图共享", "GRT 全球交付网络准入", "VIP 客户转介绍"] },
    ],
    technicalSpecs: {
      "标的物": "EA888 缸体超声波清洗系统",
      "项目代码": "TK6-EA888",
      "性能对标": "92% Up-time Rate",
      "清洁度标准": "VDA 19.1 Class A / ISO 16232",
      "节拍要求": "45秒/件",
      "产能要求": "80件/小时",
      "自动化等级": "全自动上下料 + AGV 对接",
      "控制系统": "西门子 S7-1500 + HMI",
      "MES集成": "OPC UA / MQTT / RESTful API",
      "数字化对接": "GRT Showcase Hub 实时数据同步",
      "质保要求": "≥12个月，数字化配置≥24个月",
      "交付周期": "合同签订后 16 周",
    },
  });
  const TID = tpl.id;
  console.log(`Template created: ID=${TID}`);

  // 2. 内容块
  const blocks = [
    // 招标说明
    { blockType: "tech_highlight", title: "为什么选择与 GRT 合作", subtitle: "数字化溢价 — 中标供应商直接接入 GRT Showcase Hub", templateId: TID, sortOrder: 1,
      content: { techLevel: "Industry-Leading", specs: ["实时同步: 设备运行状态、质量指标直达 VIP 客户看板", "流程减耗: Showcase Builder 自动同步测试报告，减少30%人工沟通成本", "自动报障: 系统自动检测故障，供应商无需常驻技术员(建议据此下调5%报价)", "未来预期: 此次招标关乎 GRT 未来3年全球战略资产布局"], advantage: "数字化对接能力是本次评标的核心加分项" }},

    { blockType: "tech_highlight", title: "TK6 阶段核心诉求", subtitle: "EA888 缸体清洗系统 — 性能、价格、数字化三维评估", templateId: TID, sortOrder: 2,
      content: { techLevel: "Production-Proven", specs: ["性能对标: 92% Up-time Rate (强制要求)", "清洁度: VDA 19.1 Class A (零妥协)", "价格策略: 剔除隐性沟通成本后的纯净报价(Net Price)", "数字化: 必须支持 GRT Showcase Hub 数据对接"], advantage: "由于我们提供全数字化对接系统，大幅降低贵司售后巡检成本，期待看到反映此优势的报价" }},

    // 设备健康数据（场景1）
    { blockType: "equipment_card", title: "既有设备运行数据 — 供应商参考", subtitle: "当前设备磨损率与维护成本数据，供贵司优化报价方案", templateId: TID, sortOrder: 5,
      content: { equipments: [
        { name: "超声波清洗机 #UC-201", uptime: "89%", maintenanceCost: "¥12.8万/年", issue: "换能器寿命偏短，年更换2次", ask: "能否提供寿命>18个月的替代方案？" },
        { name: "真空干燥机 #VD-105", uptime: "94%", maintenanceCost: "¥6.2万/年", issue: "密封件老化快", ask: "有无免维护密封技术？" },
        { name: "高压泵组 #HP-303", uptime: "91%", maintenanceCost: "¥9.5万/年", issue: "能耗偏高", ask: "能否提供节能30%的方案？" },
      ]}},

    // 未来采购规划（场景4）
    { blockType: "roadmap", title: "GRT 未来3年全球采购计划", subtitle: "以规模效应锁定长期折扣 — 而非单一设备询价", templateId: TID, sortOrder: 10,
      content: { milestones: [
        { year: 2026, title: "TK6 首批 3 台", description: "EA888缸体清洗系统，中国+欧洲工厂", status: "current" },
        { year: 2026, title: "Q3 追加 2 台", description: "商用车事业部柴油机缸体线", status: "planned" },
        { year: 2027, title: "年度 8-10 台", description: "新能源电驱+电池壳体清洗线扩产", status: "planned" },
        { year: 2027, title: "海外工厂 3 台", description: "欧洲斯图加特+北美底特律工厂配套", status: "planned" },
        { year: 2028, title: "年度 12-15 台", description: "半导体+光伏行业新产线建设", status: "planned" },
        { year: 2028, title: "Gigafactory 5 台", description: "为头部电池客户配套清洗设备", status: "planned" },
      ]}},

    // 全球交付网络
    { blockType: "delivery_center", title: "无锡总部 (研发+制造)", templateId: TID, sortOrder: 20, content: { city: "无锡", country: "中国", capabilities: ["研发中心", "生产基地", "检测实验室", "培训学院"], employeeCount: 313 }},
    { blockType: "delivery_center", title: "斯图加特欧洲中心", templateId: TID, sortOrder: 21, content: { city: "斯图加特", country: "德国", capabilities: ["销售", "技术支持", "备件仓库"], employeeCount: 12 }},
    { blockType: "delivery_center", title: "底特律北美中心", templateId: TID, sortOrder: 22, content: { city: "底特律", country: "美国", capabilities: ["销售", "生产基地", "现场服务", "售后支持"], employeeCount: 5 }},

    // 成功案例
    { blockType: "case_study", title: "大众集团 — EA888缸体清洗线", templateId: TID, sortOrder: 30,
      content: { customer: "大众集团 VW", industry: "汽车 - 发动机", challenge: "EA888铝合金缸体油道清洗，VDA 19.1 Class A，45秒节拍", solution: "GRT 6工位超声波+高压定点清洗+真空干燥，全自动AGV对接", results: "Up-time 96%，清洁度一次通过率99.8%，连续运行24个月零重大故障" }},
    { blockType: "case_study", title: "通用汽车 — 变速箱壳体清洗", templateId: TID, sortOrder: 31,
      content: { customer: "通用汽车 GM", industry: "汽车 - 变速箱", challenge: "6AT变速箱铝壳体复杂油道清洗，ISO 16232", solution: "GRT 高压800bar定点清洗+超声波组合方案", results: "油道残留降低99%，Up-time 94%，ROI 11个月" }},

    // ESG
    { blockType: "esg_metric", title: "水回收率", templateId: TID, sortOrder: 40, content: { value: "99.5", unit: "%" }},
    { blockType: "esg_metric", title: "碳排放降低", templateId: TID, sortOrder: 41, content: { value: "-45", unit: "%" }},
    { blockType: "esg_metric", title: "能耗降低", templateId: TID, sortOrder: 42, content: { value: "-38", unit: "%" }},

    // 专利
    { blockType: "patent", title: "自适应空化控制", subtitle: "实时超声波空化强度监测与反馈控制", templateId: TID, sortOrder: 15, content: { patentNo: "EP3845678B1", country: "EU", abstract: "声发射传感器空化控制，确保不同工件几何形状下的一致清洗质量" }},
    { blockType: "patent", title: "零排放水循环系统", subtitle: "闭环DI水99.5%回收率", templateId: TID, sortOrder: 16, content: { patentNo: "CN202310987654.3", country: "CN", abstract: "膜过滤+紫外杀菌+电导率监测，实现99.5%水回收" }},
  ];

  let created = 0;
  for (const b of blocks) {
    await trpc("targetedShowcase.contentBlock.create", b);
    created++;
    process.stdout.write(".");
  }
  console.log(` ${created} blocks created`);

  // 3. 发布全部
  const allBlocks = await trpc("targetedShowcase.contentBlock.list", { templateId: TID, limit: 200 });
  for (const b of (allBlocks?.items ?? [])) {
    await trpc("targetedShowcase.contentBlock.publish", { id: b.id });
  }
  console.log(`${allBlocks?.items?.length ?? 0} blocks published`);

  // 4. 生成 Guest Link
  const link = await trpc("targetedShowcase.guestLink.generateGuestLink", {
    showcaseId: TID,
    targetClient: "TK6-EA888 供应商招标",
    contactPerson: "供应链管理部",
    welcomeMessage: "GRT 数字化招标邀请 — TK6-EA888 缸体清洗系统供应商入围竞价",
    expiresInHours: 720,
    maxViews: 500,
  });

  console.log("\n═══════════════════════════════════════════════");
  console.log("  TK6 供应商招标展厅创建完成");
  console.log("═══════════════════════════════════════════════");
  console.log(`  模板ID: ${TID}`);
  console.log(`  内容块: ${created} 个`);
  console.log(`  展厅链接: http://localhost:3001${link.guestUrl}`);
  console.log("═══════════════════════════════════════════════");
  console.log("  展厅内容:");
  console.log("  ├─ 为什么选择GRT(数字化溢价)");
  console.log("  ├─ TK6核心诉求(92% Up-time)");
  console.log("  ├─ 既有设备运行数据(磨损率/维护成本)");
  console.log("  ├─ 未来3年采购计划(30+台)");
  console.log("  ├─ 全球交付网络(3个中心)");
  console.log("  ├─ 成功案例(VW/GM)");
  console.log("  ├─ ESG指标");
  console.log("  ├─ 核心专利");
  console.log("  └─ 3种配置方案(标准/数字化/战略)");
  console.log("═══════════════════════════════════════════════");
}

main().catch(e => { console.error(e); process.exit(1); });
