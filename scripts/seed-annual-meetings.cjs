/**
 * Seed GRT Annual Meeting Calendar — 2026全年会议体系
 * 52周周期性会议 + 12个月度会议 + 4个季度会议 + 年度会议
 *
 * Run: node scripts/seed-annual-meetings.cjs
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
    const r = http.request(opts, (res) => {
      if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0];
      let d = []; res.on("data", c => d.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(d).toString("utf8"))); } catch { resolve(null); } });
    });
    r.on("error", reject);
    if (data) r.write(data, "utf8");
    r.end();
  });
}

async function createMeeting(input) {
  const r = await request("POST", "/api/trpc/smartMeeting.meeting.create", { json: input });
  return r?.result?.data?.json;
}

// ── 日期工具 ──
function getMonday(year, weekNum) {
  // ISO week: week 1 contains Jan 4
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  return monday;
}

function fmt(date) { return date.toISOString().slice(0, 10); }
function fmtTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString().slice(0, 19);
}

function getLastWorkday(year, month) {
  // month is 1-based
  const lastDay = new Date(year, month, 0); // last day of month
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

function getDay28OrBefore(year, month) {
  let d = new Date(year, month - 1, 28);
  if (d.getDay() === 0) d.setDate(27);
  if (d.getDay() === 6) d.setDate(27);
  return d;
}

async function main() {
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in\n");

  const YEAR = 2026;
  let total = 0;

  // ═══════════════════════════════════════════════════════
  // 1. 部门长走线会 — 每周四 9:00-10:00 一楼大厅 (52周)
  // ═══════════════════════════════════════════════════════
  console.log("【1】部门长走线会 — 每周四 9:00-10:00 一楼大厅");
  for (let w = 1; w <= 52; w++) {
    const mon = getMonday(YEAR, w);
    const thu = new Date(mon); thu.setDate(mon.getDate() + 3);
    // 跳过春节周(第5-6周) 和 国庆周(第40周)
    if (w === 5 || w === 6 || w === 40) continue;
    await createMeeting({
      title: `部门长走线会 — ${YEAR}年第${w}周`,
      type: "MAJOR",
      description: `场地：一楼大厅→车间\n参会人：倪亚东(CEO), 刘奥运(CTO), 倪微薇, 金晓锋(质量), 徐树奎(BU2), 周辉(BU3), 洪香龙, 杨勇, 马柯\n议程：\n1. OPL回顾(15min)\n2. 现场巡检(25min) — 质量/5S/交付/工艺/安全\n3. 发现项登记(10min)\n4. 红黑榜更新(5min)\n5. 改善案例分享(5min)\n关联：智能绩效红黑榜`,
      scheduledStart: fmtTime(thu, 9, 0),
      scheduledEnd: fmtTime(thu, 10, 0),
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    total++;
    if (w % 10 === 0) process.stdout.write(`  ${w}/52\n`);
  }
  console.log(`  → ${49}场\n`);

  // ═══════════════════════════════════════════════════════
  // 2. 事业部晨会 — 每周一 7:50-8:20 车间现场 (5BU × 52周)
  // ═══════════════════════════════════════════════════════
  console.log("【2】事业部晨会 — 每周一 7:50-8:20 车间现场 (5BU)");
  const BUS = [
    { name: "海外事业部(BU1)", attendees: "戴晓燕, 金晓锋, 匡凯旋, 杜显文, 吕雪冬, 王志强, 刘健康, 董纾雨" },
    { name: "商用车事业部(BU2)", attendees: "徐树奎, 洪香龙, 钱佳奇, 马林山, 蔡瑞, 殷金刚" },
    { name: "乘用车事业部(BU3)", attendees: "周辉, 孙坚, 沈迎凤, 冯燕, 韩保程, 李柯瑶, 杨勇, 罗小玲" },
    { name: "半导体事业部(BU4)", attendees: "孙国祥, 张腾飞" },
    { name: "工业通用事业部(BU5)", attendees: "马柯, 史龙昌, 李亚超, 范威" },
  ];
  for (let w = 1; w <= 52; w++) {
    if (w === 5 || w === 6 || w === 40) continue;
    const mon = getMonday(YEAR, w);
    for (const bu of BUS) {
      await createMeeting({
        title: `${bu.name}晨会 — ${YEAR}年第${w}周`,
        type: "MAJOR",
        description: `场地：车间现场\n参会人：${bu.attendees}\n议程：上周产值(5min) → 项目交付(5min) → 质量指标(5min) → 销售动态(5min) → 本周重点(5min) → 表扬(5min)\n形式：站立式，严格30分钟`,
        scheduledStart: fmtTime(mon, 7, 50),
        scheduledEnd: fmtTime(mon, 8, 20),
        meetingCategory: "TEAM_SYNC",
        direction: "INTERNAL",
      });
      total++;
    }
    if (w % 10 === 0) process.stdout.write(`  ${w}/52\n`);
  }
  console.log(`  → ${49 * 5}场\n`);

  // ═══════════════════════════════════════════════════════
  // 3. 销售周例会 — 每周一 9:00-10:00 会议室A (52周)
  // ═══════════════════════════════════════════════════════
  console.log("【3】销售周例会 — 每周一 9:00-10:00 会议室A");
  for (let w = 1; w <= 52; w++) {
    if (w === 5 || w === 6 || w === 40) continue;
    const mon = getMonday(YEAR, w);
    await createMeeting({
      title: `销售周例会 — ${YEAR}年第${w}周`,
      type: "MAJOR",
      description: `场地：一楼会议室A\n参会人：戴晓燕(销售经理), 王志强(BU1), 刘健康(BU1), 董纾雨(BU1), 冯燕(BU3), 韩保程(BU3), 李柯瑶(BU3), 刘坤(市场), 朱文韬(市场)\n议程：\n1. 上周行动项回顾(10min)\n2. 本周客户拜访汇报(15min)\n3. 项目漏斗M0-M3更新(10min)\n4. 订单/报价进展(10min)\n5. 竞争情报(5min)\n6. 下周行动计划(10min)`,
      scheduledStart: fmtTime(mon, 9, 0),
      scheduledEnd: fmtTime(mon, 10, 0),
      meetingCategory: "TEAM_SYNC",
      direction: "INTERNAL",
    });
    total++;
    if (w % 10 === 0) process.stdout.write(`  ${w}/52\n`);
  }
  console.log(`  → ${49}场\n`);

  // ═══════════════════════════════════════════════════════
  // 4. 月度销售KPI分析会 — 每月28日 14:00-15:30 (12个月)
  // ═══════════════════════════════════════════════════════
  console.log("【4】月度销售KPI会 — 每月28日(或前) 14:00-15:30");
  for (let m = 1; m <= 12; m++) {
    const d = getDay28OrBefore(YEAR, m);
    await createMeeting({
      title: `销售月度KPI分析会 — ${YEAR}年${m}月`,
      type: "MAJOR",
      description: `场地：二楼会议室B\n参会人：倪亚东(CEO), 刘奥运(CTO), 戴晓燕(销售经理), 王志强(BU1), 刘健康(BU1), 董纾雨(BU1), 冯燕(BU3), 韩保程(BU3), 李柯瑶(BU3), 刘坤(市场)\n议程：\n1. 月度业绩总览(10min)\n2. 个人KPI逐一评审(30min)\n3. 重点项目深度分析(15min)\n4. 丢单/失败案例复盘(10min)\n5. 市场趋势与行业洞察(10min)\n6. 下月目标与策略(15min)`,
      scheduledStart: fmtTime(d, 14, 0),
      scheduledEnd: fmtTime(d, 15, 30),
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    total++;
    console.log(`  ${YEAR}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  // ═══════════════════════════════════════════════════════
  // 5. 月度经营分析会 — 每月最后一个工作日 14:00-16:00 (12个月)
  // ═══════════════════════════════════════════════════════
  console.log("\n【5】月度经营分析会 — 每月末 14:00-16:00");
  for (let m = 1; m <= 12; m++) {
    const d = getLastWorkday(YEAR, m);
    await createMeeting({
      title: `月度经营分析会 — ${YEAR}年${m}月`,
      type: "MAJOR",
      description: `场地：三楼培训室\n参会人：倪亚东(CEO), 刘奥运(CTO), 倪微薇(AI数智部), 倪微薇(HR), 王秀萍(财务), 戴晓燕(BU1), 徐树奎(BU2), 周辉(BU3), 金晓锋(质量), 沈迎凤(采购)\n议程：\n1. 财务数据总览(15min)\n2. 各事业部述职(30min)\n3. 质量/安全/交付指标(15min)\n4. 人力/培训回顾(10min)\n5. 下月目标分解(10min)`,
      scheduledStart: fmtTime(d, 14, 0),
      scheduledEnd: fmtTime(d, 16, 0),
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    total++;
    console.log(`  ${YEAR}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  // ═══════════════════════════════════════════════════════
  // 6. 季度销售战略会 — Q1-Q4 末 9:00-11:00 (4次)
  // ═══════════════════════════════════════════════════════
  console.log("\n【6】季度销售战略会 — 每季末 9:00-11:00");
  const quarterEnds = [
    { q: "Q1", m: 3 }, { q: "Q2", m: 6 }, { q: "Q3", m: 9 }, { q: "Q4", m: 12 },
  ];
  for (const qe of quarterEnds) {
    const d = getLastWorkday(YEAR, qe.m);
    d.setDate(d.getDate() - 1); // 倒数第2个工作日(避免与月度经营会冲突)
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    await createMeeting({
      title: `销售季度战略会 — ${YEAR}年${qe.q}`,
      type: "MAJOR",
      description: `场地：三楼培训室\n参会人：倪亚东(CEO), 刘奥运(CTO), 倪微薇, 倪微薇(HR), 王秀萍(财务), 戴晓燕, 徐树奎, 周辉, 金晓锋, 杨勇, 洪香龙, 全体销售工程师\n议程：\n1. 季度业绩回顾(20min)\n2. 行业与市场分析(15min)\n3. 竞争格局变化(10min)\n4. 重点客户战略评审(20min)\n5. 产品技术匹配(15min)\n6. 下季度策略与目标(20min)\n7. 团队能力建设(10min)\n8. CEO/CTO总结(10min)`,
      scheduledStart: fmtTime(d, 9, 0),
      scheduledEnd: fmtTime(d, 11, 0),
      meetingCategory: "GATE_REVIEW",
      direction: "INTERNAL",
    });
    total++;
    console.log(`  ${qe.q}: ${fmt(d)}`);
  }

  // ═══════════════════════════════════════════════════════
  // 7. 年度总结大会 + 年度规划会 (各1次)
  // ═══════════════════════════════════════════════════════
  console.log("\n【7】年度会议");
  await createMeeting({
    title: `${YEAR}年度总结大会`,
    type: "MAJOR",
    description: `场地：三楼培训室(全员)\n参会人：全公司96人\n议程：\n1. CEO年度致辞(20min)\n2. 年度业绩回顾(30min)\n3. 各事业部年度述职(60min)\n4. 优秀员工/团队表彰(20min)\n5. 年度改善案例分享(15min)\n6. ${YEAR + 1}年战略展望(15min)`,
    scheduledStart: fmtTime(new Date(YEAR, 11, 28), 14, 0), // 12月28日
    scheduledEnd: fmtTime(new Date(YEAR, 11, 28), 17, 0),
    meetingCategory: "GATE_REVIEW",
    direction: "INTERNAL",
  });
  total++;
  console.log(`  年度总结: ${YEAR}-12-28`);

  await createMeeting({
    title: `${YEAR + 1}年度规划会`,
    type: "MAJOR",
    description: `场地：三楼培训室\n参会人：倪亚东(CEO), 刘奥运(CTO), 全体事业部经理, 全体部门长\n议程：\n1. ${YEAR}年度回顾与复盘(30min)\n2. ${YEAR + 1}年市场展望(20min)\n3. ${YEAR + 1}年战略目标制定(30min)\n4. 各事业部目标分解(40min)\n5. 资源配置与投资计划(20min)\n6. OKR一级目标确认(20min)`,
    scheduledStart: fmtTime(new Date(YEAR, 11, 29), 9, 0), // 12月29日
    scheduledEnd: fmtTime(new Date(YEAR, 11, 29), 12, 0),
    meetingCategory: "GATE_REVIEW",
    direction: "INTERNAL",
  });
  total++;
  console.log(`  年度规划: ${YEAR}-12-29`);

  // ═══════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  ${YEAR}年度会议体系创建完成`);
  console.log(`  总计: ${total} 场会议`);
  console.log("═══════════════════════════════════════════════");
  console.log("  周期性会议统计:");
  console.log(`  ├─ 部门长走线会    49场 (每周四, 排除春节/国庆)`);
  console.log(`  ├─ 事业部晨会      ${49 * 5}场 (5BU×49周)`);
  console.log(`  ├─ 销售周例会      49场 (每周一)`);
  console.log(`  ├─ 月度销售KPI会   12场 (每月28日)`);
  console.log(`  ├─ 月度经营分析会  12场 (每月末)`);
  console.log(`  ├─ 季度战略会      4场  (每季末)`);
  console.log(`  ├─ 年度总结大会    1场  (12月28日)`);
  console.log(`  └─ 年度规划会      1场  (12月29日)`);
  console.log("═══════════════════════════════════════════════");
  console.log(`  访问: http://localhost:3001/meeting-calendar`);
}

main().catch(e => { console.error(e); process.exit(1); });
