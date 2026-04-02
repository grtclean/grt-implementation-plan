/**
 * Seed periodic sales meetings for 王志强, 冯燕, 韩宝程
 * Run: node scripts/seed-sales-meetings.cjs
 */
const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search, method,
      headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}) },
    };
    const req = http.request(opts, (res) => {
      if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0];
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { resolve(null); } });
    });
    req.on("error", reject);
    if (data) req.write(data, "utf8");
    req.end();
  });
}

async function trpcMut(proc, input) {
  const res = await request("POST", `/api/trpc/${proc}`, { json: input });
  return res?.result?.data?.json;
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in");

  // Create weekly sales meetings for March 2026
  const weeks = [
    { start: "2026-03-02T09:00:00", end: "2026-03-02T10:00:00", title: "销售周例会 — 2026年第9周" },
    { start: "2026-03-09T09:00:00", end: "2026-03-09T10:00:00", title: "销售周例会 — 2026年第10周" },
    { start: "2026-03-16T09:00:00", end: "2026-03-16T10:00:00", title: "销售周例会 — 2026年第11周" },
    { start: "2026-03-23T09:00:00", end: "2026-03-23T10:00:00", title: "销售周例会 — 2026年第12周" },
    { start: "2026-03-30T09:00:00", end: "2026-03-30T10:00:00", title: "销售周例会 — 2026年第13周" },
  ];

  for (const w of weeks) {
    const m = await trpcMut("smartMeeting.meeting.create", {
      title: w.title,
      type: "MAJOR",
      description: `销售团队周例会。参会人员：王志强、冯燕、韩宝程及事业部经理。\n议程：上周行动项回顾 → 客户拜访汇报 → 项目漏斗更新 → 订单/报价进展 → 下周行动计划`,
      scheduledStart: w.start,
      scheduledEnd: w.end,
      meetingCategory: "TEAM_SYNC",
      direction: "INTERNAL",
    });
    console.log(`  周例会: ${w.title} → ID=${m?.id}`);
  }

  // Monthly KPI meeting
  const monthly = await trpcMut("smartMeeting.meeting.create", {
    title: "销售月度指标分析会 — 2026年3月",
    type: "MAJOR",
    description: `月度销售KPI评审会议。\n参会人员：CEO、CTO、全体销售工程师（王志强、冯燕、韩宝程）。\n议程：月度业绩总览 → 个人KPI逐一评审 → 重点项目深度分析 → 丢单复盘 → 下月目标与策略`,
    scheduledStart: "2026-03-28T14:00:00",
    scheduledEnd: "2026-03-28T15:30:00",
    meetingCategory: "GATE_REVIEW",
    direction: "INTERNAL",
  });
  console.log(`  月度KPI会: ID=${monthly?.id}`);

  // Quarterly strategy meeting
  const quarterly = await trpcMut("smartMeeting.meeting.create", {
    title: "销售季度战略会 — 2026年Q1",
    type: "MAJOR",
    description: `Q1销售战略回顾与Q2规划。\n参会人员：CEO、CTO、销售总监、全体销售工程师（王志强、冯燕、韩宝程）、财务经理。\n议程：季度业绩回顾 → 行业分析 → 竞争格局 → 重点客户评审 → 技术匹配 → Q2策略与目标 → CEO/CTO总结`,
    scheduledStart: "2026-03-31T09:00:00",
    scheduledEnd: "2026-03-31T11:00:00",
    meetingCategory: "GATE_REVIEW",
    direction: "INTERNAL",
  });
  console.log(`  季度战略会: ID=${quarterly?.id}`);

  // April weekly meetings (pre-scheduled)
  const aprilWeeks = [
    { start: "2026-04-06T09:00:00", end: "2026-04-06T10:00:00", title: "销售周例会 — 2026年第14周" },
    { start: "2026-04-13T09:00:00", end: "2026-04-13T10:00:00", title: "销售周例会 — 2026年第15周" },
    { start: "2026-04-20T09:00:00", end: "2026-04-20T10:00:00", title: "销售周例会 — 2026年第16周" },
    { start: "2026-04-27T09:00:00", end: "2026-04-27T10:00:00", title: "销售周例会 — 2026年第17周" },
  ];
  for (const w of aprilWeeks) {
    const m = await trpcMut("smartMeeting.meeting.create", {
      title: w.title,
      type: "MAJOR",
      description: `销售团队周例会。参会：王志强、冯燕、韩宝程。`,
      scheduledStart: w.start,
      scheduledEnd: w.end,
      meetingCategory: "TEAM_SYNC",
      direction: "INTERNAL",
    });
    console.log(`  周例会: ${w.title} → ID=${m?.id}`);
  }

  console.log("\n===================================");
  console.log("  销售会议体系创建完成");
  console.log("===================================");
  console.log("  5个3月周例会 (每周一 9:00-10:00)");
  console.log("  1个月度KPI会 (3月28日 14:00-15:30)");
  console.log("  1个季度战略会 (3月31日 9:00-11:00)");
  console.log("  4个4月周例会 (预排)");
  console.log("===================================");
  console.log("  参会销售：王志强、冯燕、韩宝程");
  console.log("  访问: http://localhost:3001/meeting-executive");
  console.log("===================================");
}

main().catch((e) => { console.error(e); process.exit(1); });
