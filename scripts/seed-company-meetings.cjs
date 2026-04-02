/**
 * Seed GRT company-wide periodic meeting calendar
 * Run: node scripts/seed-company-meetings.cjs
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
async function create(input) {
  const r = await request("POST", "/api/trpc/smartMeeting.meeting.create", { json: input });
  return r?.result?.data?.json;
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  let count = 0;

  // ═══════════════════════════════════════════════════════
  // 1. 部门长走线会 — 每周四 9:00-10:00, 一楼大厅
  // ═══════════════════════════════════════════════════════
  console.log("【部门长走线会】每周四 AM 9:00-10:00 一楼大厅");
  const thursdays = [
    "2026-03-05", "2026-03-12", "2026-03-19", "2026-03-26",
    "2026-04-02", "2026-04-09", "2026-04-16", "2026-04-23", "2026-04-30",
  ];
  for (const d of thursdays) {
    const weekNum = Math.ceil((new Date(d) - new Date("2026-01-01")) / (7 * 86400000)) + 1;
    const m = await create({
      title: `部门长走线会 — 第${weekNum}周`,
      type: "MAJOR",
      description: `每周四全公司走线检查。\n场地：一楼大厅 → 车间\n参会：全体部门长、CEO、质量总监\n议程：OPL回顾 → 现场巡检(质量/5S/交付/工艺/安全) → 发现项登记 → 红黑榜更新\n关联：智能绩效红黑榜`,
      scheduledStart: `${d}T09:00:00`,
      scheduledEnd: `${d}T10:00:00`,
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    console.log(`  ${d} 第${weekNum}周 → ID=${m?.id}`);
    count++;
  }

  // ═══════════════════════════════════════════════════════
  // 2. 事业部晨会 — 每周一 7:50-8:20, 车间现场
  // ═══════════════════════════════════════════════════════
  console.log("\n【事业部晨会】每周一 AM 7:50-8:20 车间现场");
  const mondays = [
    "2026-03-02", "2026-03-09", "2026-03-16", "2026-03-23", "2026-03-30",
    "2026-04-06", "2026-04-13", "2026-04-20", "2026-04-27",
  ];
  const bus = [
    { name: "海外事业部", code: "BU1" },
    { name: "商用车事业部", code: "BU2" },
    { name: "乘用车事业部", code: "BU3" },
    { name: "半导体事业部", code: "BU4" },
    { name: "工业通用事业部", code: "BU5" },
  ];
  for (const d of mondays) {
    const weekNum = Math.ceil((new Date(d) - new Date("2026-01-01")) / (7 * 86400000)) + 1;
    for (const bu of bus) {
      const m = await create({
        title: `${bu.name}晨会 — 第${weekNum}周`,
        type: "MAJOR",
        description: `${bu.name}每周一晨会。\n场地：车间现场\n参会：事业部经理、项目经理、生产/质量/销售主管\n议程：上周产值 → 项目交付 → 质量指标 → 销售动态 → 本周重点 → 表扬\n形式：站立式，严格30分钟`,
        scheduledStart: `${d}T07:50:00`,
        scheduledEnd: `${d}T08:20:00`,
        meetingCategory: "TEAM_SYNC",
        direction: "INTERNAL",
      });
      process.stdout.write(".");
      count++;
    }
  }
  console.log(` ${mondays.length * bus.length}场`);

  // ═══════════════════════════════════════════════════════
  // 3. 月度经营分析会 — 每月最后一个工作日
  // ═══════════════════════════════════════════════════════
  console.log("\n【月度经营分析会】每月末 PM 14:00-16:00");
  const monthlyDates = ["2026-03-31", "2026-04-30"];
  for (const d of monthlyDates) {
    const month = d.slice(0, 7);
    const m = await create({
      title: `月度经营分析会 — ${month}`,
      type: "MAJOR",
      description: `全公司月度经营回顾。\n参会：CEO、CTO、全体事业部经理、财务、HR、质量总监\n议程：月度营收/利润回顾 → 各事业部述职 → 质量/交付/库存分析 → 人力/培训回顾 → 下月目标分解`,
      scheduledStart: `${d}T14:00:00`,
      scheduledEnd: `${d}T16:00:00`,
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    console.log(`  ${d} → ID=${m?.id}`);
    count++;
  }

  // ═══════════════════════════════════════════════════════
  // 4. 设计评审会 — 按项目需求
  // ═══════════════════════════════════════════════════════
  console.log("\n【设计评审会】按项目安排");
  const designReviews = [
    { title: "设计评审 — CATL电池壳体清洗线 (M3)", date: "2026-03-25", desc: "CATL项目M3阶段方案评审\n参会：CTO、机械/电气设计、质量、项目经理\n议程：总体方案评审 → 关键零部件选型 → DFMEA → 风险评估" },
    { title: "设计评审 — 大众齿轴清洗线 (M4)", date: "2026-04-08", desc: "大众项目M4详细设计评审\n参会：CTO、设计团队、质量、采购\n议程：详细图纸评审 → BOM确认 → 工艺路线 → 交期确认" },
  ];
  for (const dr of designReviews) {
    const m = await create({
      title: dr.title,
      type: "MAJOR",
      description: dr.desc,
      scheduledStart: `${dr.date}T14:00:00`,
      scheduledEnd: `${dr.date}T16:00:00`,
      meetingCategory: "DESIGN_REVIEW",
      direction: "INTERNAL",
    });
    console.log(`  ${dr.date} ${dr.title} → ID=${m?.id}`);
    count++;
  }

  // ═══════════════════════════════════════════════════════
  // 5. 客户来访接待会 — 不定期
  // ═══════════════════════════════════════════════════════
  console.log("\n【客户来访接待】");
  const customerVisits = [
    { title: "客户来访 — Schaeffler技术交流", date: "2026-03-27", desc: "Schaeffler齿轴项目技术交流\n参会：CTO、韩宝程(销售)、机械设计\n议程：项目需求确认 → 技术方案演示 → 工厂参观 → 报价讨论" },
    { title: "客户来访 — 比亚迪产线验收", date: "2026-04-15", desc: "BYD刀片电池清洗线验收\n参会：CEO、项目经理、质量总监、冯燕(销售)\n议程：设备运行验收 → 性能测试 → 问题清单确认 → 验收签字" },
  ];
  for (const cv of customerVisits) {
    const m = await create({
      title: cv.title,
      type: "MAJOR",
      description: cv.desc,
      scheduledStart: `${cv.date}T09:30:00`,
      scheduledEnd: `${cv.date}T12:00:00`,
      meetingCategory: "CUSTOMER_MEETING",
      direction: "EXTERNAL",
    });
    console.log(`  ${cv.date} ${cv.title} → ID=${m?.id}`);
    count++;
  }

  console.log("\n===================================");
  console.log("  GRT 全公司会议体系创建完成");
  console.log(`  共创建 ${count} 场会议`);
  console.log("===================================");
  console.log("  周期性会议：");
  console.log("  ├─ 部门长走线会    每周四 9:00  一楼大厅");
  console.log("  ├─ 事业部晨会(5BU) 每周一 7:50  车间现场");
  console.log("  ├─ 销售周例会      每周一 9:00  会议室");
  console.log("  ├─ 月度经营分析会  每月末 14:00 会议室");
  console.log("  ├─ 销售月度KPI会   每月28 14:00 会议室");
  console.log("  └─ 季度战略会      每季末 9:00  会议室");
  console.log("  专项会议：");
  console.log("  ├─ 设计评审会      按项目安排");
  console.log("  └─ 客户来访接待    按需安排");
  console.log("===================================");
  console.log("  访问: http://localhost:3001/meeting-executive");
  console.log("===================================");
}

main().catch(e => { console.error(e); process.exit(1); });
