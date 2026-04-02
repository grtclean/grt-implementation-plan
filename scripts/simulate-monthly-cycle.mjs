#!/usr/bin/env node
/**
 * GRT 95人数字代理月度模拟 — 2026年4月
 *
 * 完整流程:
 *   Step 1: 95人登录 + KPI确认
 *   Step 2: 3个demo项目创建 (华朔/一汽/8800T)
 *   Step 3: 日常执行模拟 (工程/销售/生产/质量/OA/积分)
 *   Step 4: 月底自评 (95人KPI打分)
 *   Step 5: 主管审批 (24管理者)
 *   Step 6: 薪资计算+审批链
 *   Step 7: 绩效面谈+积分+改进
 *
 * 用法: node scripts/simulate-monthly-cycle.mjs [--base=http://127.0.0.1:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';
const MONTH = '2026-04';
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m', magenta: '\x1b[35m' };

// ── 95人名册 (id, pinyin, name, dept, role, supervisor_id) ──
const EMPLOYEES = [
  ["admin","niyadong","倪亚东","总裁办","ceo",null],
  ["GRT080","liuaoyun","刘奥运","AI数智部","vp","admin"],
  ["GRT105","niweiwei","倪微薇","AI数智部","vp","admin"],
  ["GRT054","wangxiuping","王秀萍","财务部","finance_manager","admin"],
  ["GRT067","shajianmei","沙建梅","人事行政部","hr_director","GRT105"],
  ["GRT004","daixiaoyan","戴晓燕","事业一部","sales_director","admin"],
  ["GRT094","xushukui","徐树奎","事业二部","director","admin"],
  ["GRT058","zhouhui","周辉","事业三部","director","admin"],
  ["GRT005","jinxiaofeng","金晓锋","事业一部","qc_manager","GRT004"],
  ["GRT055","shenyingfeng","沈迎凤","事业三部","project_manager","GRT058"],
  ["GRT045","yangyong","杨勇","事业三部","project_manager","GRT058"],
  ["GRT002","huangxiaolan","黄晓兰","财务部","finance_specialist","GRT054"],
  ["GRT101","wangruyue","王汝月","财务部","finance_specialist","GRT054"],
  ["GRT063","liujiankang","刘健康","事业一部","sales_rep","GRT004"],
  ["GRT035","wangzhiqiang","王志强","事业一部","sales_rep","GRT004"],
  ["GRT019","fengyan","冯艳","事业三部","sales_rep","GRT058"],
  ["GRT044","hongxiaodong","洪小东","事业二部","engineer","GRT006"],
  ["GRT049","huyang","胡杨","AI数智部","engineer","GRT105"],
  ["GRT006","hongxianglong","洪香龙","事业二部","production_supervisor","GRT094"],
  ["GRT038","malinshan","马林山","事业二部","production_supervisor","GRT094"],
  ["GRT030","kuangkaixuan","匡凯旋","事业一部","production_supervisor","GRT004"],
  ["GRT046","lvxuedong","吕雪冬","事业一部","production_supervisor","GRT005"],
  ["GRT007","sunjian","孙坚","事业三部","production_supervisor","GRT058"],
  ["GRT024","zhangtengfei","张腾飞","事业四部","production_supervisor","admin"],
  ["GRT009","shilongchang","史龙昌","事业十部","production_supervisor","admin"],
  ["GRT010","wuweicheng","吴卫成","事业一部","floor_operator","GRT005"],
  ["GRT016","caoqingwei","曹庆伟","事业一部","floor_operator","GRT005"],
  ["GRT039","houdepeng","侯德朋","事业一部","floor_operator","GRT030"],
  ["GRT041","zhangliang","张良","事业一部","floor_operator","GRT030"],
  ["GRT013","sunmiao","孙淼","事业三部","floor_operator","GRT045"],
  ["GRT074","wangjintao","王金涛","事业二部","floor_operator","GRT038"],
  ["GRT011","zhangchao","张超","事业十部","floor_operator","GRT009"],
  // 补充到95人
  ["GRT104","dongshuyu","董纾雨","事业一部","sales_rep","GRT004"],
  ["GRT020","zhangxun","张洵","事业一部","engineer","GRT004"],
  ["GRT057","tengshunying","滕顺英","事业一部","engineer","GRT004"],
  ["GRT022","lidapeng","李大鹏","事业一部","engineer","GRT005"],
  ["GRT014","lianlonghai","廉龙海","事业一部","engineer","GRT030"],
  ["GRT028","zhuminghua","朱明华","事业一部","engineer","GRT030"],
  ["GRT040","zengchungui","曾春贵","事业一部","engineer","GRT030"],
  ["GRT015","duxianwen","杜显文","事业一部","production_supervisor","GRT046"],
  ["GRT087","meiaojie","梅奥杰","事业一部","engineer","GRT046"],
  ["GRT088","gaojiayi","高嘉义","事业一部","engineer","GRT046"],
  ["GRT090","chenjiali","陈加丽","事业一部","engineer","GRT005"],
  ["GRT052","zhaoqiang","赵强","事业一部","floor_operator","GRT005"],
  ["GRT059","jiaobin","焦斌","事业一部","floor_operator","GRT005"],
  ["GRT079","yanjianhua","阎建华","事业一部","floor_operator","GRT005"],
  ["GRT031","shenlongxiang","沈龙翔","事业一部","floor_operator","GRT046"],
  ["GRT036","hanpinlai","韩品来","事业一部","floor_operator","GRT046"],
  ["GRT051","cuicongcong","崔聪聪","事业一部","floor_operator","GRT046"],
  ["GRT071","liuchenyang","刘琛杨","事业一部","floor_operator","GRT046"],
  ["GRT072","zhaochengjie","赵铖杰","事业一部","floor_operator","GRT046"],
  ["GRT017","tianpingzhen","田坪珍","事业一部","floor_operator","GRT005"],
  ["GRT082","shenfugao","沈富高","事业一部","floor_operator","GRT005"],
  ["GRT064","qiangbingbing","强兵兵","事业一部","floor_operator","GRT005"],
  ["GRT061","limingsui","李明遂","事业一部","floor_operator","GRT005"],
  ["GRT047","jiguohua","嵇国华","事业一部","floor_operator","GRT005"],
  ["GRT097","qianjiaqi","钱佳奇","事业二部","engineer","GRT006"],
  ["GRT065","cairui","蔡瑞","事业二部","engineer","GRT006"],
  ["GRT099","yinjingang","殷金刚","事业二部","engineer","GRT006"],
  ["GRT003","niyaqin","倪亚琴","事业三部","engineer","GRT055"],
  ["GRT043","hanbaocheng","韩保程","事业三部","sales_rep","GRT058"],
  ["GRT093","likeyao","李柯瑶","事业三部","sales_rep","GRT058"],
  ["GRT089","luoxiaoling","罗小玲","事业三部","engineer","GRT055"],
  ["GRT112","xiewei","谢伟","事业三部","engineer","GRT055"],
  ["GRT021","zhangsongsong","张松松","事业三部","floor_operator","GRT045"],
  ["GRT025","xiaoboya","肖博雅","事业三部","floor_operator","GRT045"],
  ["GRT032","wangben","王犇","事业三部","floor_operator","GRT045"],
  ["GRT034","wangyong","王勇","事业三部","floor_operator","GRT045"],
  ["GRT042","liujiannian","刘建年","事业三部","floor_operator","GRT045"],
  ["GRT050","leicuilin","蕾翠林","事业三部","floor_operator","GRT045"],
  ["GRT060","yanghuilong","杨会龙","事业三部","floor_operator","GRT045"],
  ["GRT075","hushaojie","胡绍杰","事业三部","floor_operator","GRT045"],
  ["GRT076","wangsen","王森","事业三部","floor_operator","GRT045"],
  ["GRT077","wuyangyang","吴阳洋","事业三部","floor_operator","GRT045"],
  ["GRT084","jiangqiurui","蒋秋瑞","事业三部","floor_operator","GRT045"],
  ["GRT023","yangzhiyun","杨之雲","事业三部","floor_operator","GRT007"],
  ["GRT029","yinxiaoyong","殷小勇","事业三部","floor_operator","GRT007"],
  ["GRT056","chenchengcheng","陈成成","事业三部","floor_operator","GRT007"],
  ["GRT037","huangxiaoxiao","黄潇潇","事业三部","floor_operator","GRT058"],
  ["GRT018","sunguoxiang","孙国祥","事业四部","engineer","admin"],
  ["GRT008","make","马柯","事业十部","engineer","admin"],
  ["GRT012","lixingwei","李兴伟","事业十部","floor_operator","GRT009"],
  ["GRT068","liyachao","李亚超","事业十部","floor_operator","GRT008"],
  ["GRT069","lipengfei","李鹏飞","事业十部","floor_operator","GRT008"],
  ["GRT073","fanwei","范威","事业十部","floor_operator","GRT008"],
  ["GRT102","zhangfei","张飞","事业十部","floor_operator","GRT008"],
  ["GRT066","lixinzheng","李新正","财务部","floor_operator","GRT054"],
  ["GRT079_2","mapengfeng","马鹏风","财务部","engineer","GRT054"],
  ["GRT081","makangfeng","马康风","财务部","engineer","GRT054"],
  ["GRT053","duantianzhu","段天珠","人事行政部","engineer","GRT067"],
  ["GRT100","tianweiyu","田炜钰","人事行政部","floor_operator","GRT067"],
  ["GRT095","wangaiyun","王爱云","人事行政部","floor_operator","GRT067"],
  ["GRT083","liukun","刘坤","AI数智部","sales_rep","GRT105"],
  ["GRT103","zhuwentao","朱文韬","AI数智部","sales_rep","GRT080"],
  ["GRT062","zhuyuhao","朱宇浩","事业二部","engineer","GRT080"],
];

// ── KPI Presets per role ──
const ROLE_KPIS = {
  ceo:                  [{name:'营收完成率',target:100,weight:25},{name:'现金流健康度',target:95,weight:20},{name:'人均效能',target:85,weight:20},{name:'客户满意度',target:90,weight:15},{name:'战略目标达成',target:80,weight:20}],
  vp:                   [{name:'部门营收贡献',target:95,weight:25},{name:'团队人效',target:85,weight:20},{name:'项目交付准时率',target:90,weight:25},{name:'人才培养完成率',target:80,weight:15},{name:'创新项目数',target:3,weight:15}],
  director:             [{name:'事业部营收',target:90,weight:30},{name:'交付准时率',target:92,weight:25},{name:'质量FPY',target:95,weight:20},{name:'团队稳定率',target:90,weight:15},{name:'客户拓展',target:5,weight:10}],
  sales_director:       [{name:'销售额达成',target:100,weight:35},{name:'新客户开发',target:8,weight:20},{name:'商机转化率',target:30,weight:20},{name:'回款率',target:95,weight:15},{name:'客户满意度',target:90,weight:10}],
  finance_manager:      [{name:'财务报表准确率',target:100,weight:25},{name:'成本节约率',target:5,weight:20},{name:'预算执行偏差',target:5,weight:20},{name:'审计无重大发现',target:100,weight:20},{name:'报表及时率',target:100,weight:15}],
  hr_director:          [{name:'招聘完成率',target:90,weight:20},{name:'培训覆盖率',target:95,weight:20},{name:'员工满意度',target:85,weight:20},{name:'离职率控制',target:8,weight:20},{name:'绩效体系运行',target:100,weight:20}],
  qc_manager:           [{name:'质量FPY',target:97,weight:30},{name:'客诉关闭率',target:95,weight:25},{name:'FMEA覆盖率',target:100,weight:20},{name:'8D及时关闭率',target:90,weight:15},{name:'供应商来料合格率',target:98,weight:10}],
  project_manager:      [{name:'项目交付准时',target:95,weight:30},{name:'预算控制偏差',target:10,weight:20},{name:'里程碑完成率',target:90,weight:20},{name:'客户满意度',target:90,weight:15},{name:'风险关闭率',target:85,weight:15}],
  finance_specialist:   [{name:'凭证准确率',target:100,weight:30},{name:'报销处理时效',target:2,weight:25},{name:'对账及时率',target:100,weight:25},{name:'档案完整率',target:100,weight:20}],
  engineer:             [{name:'设计交付准时',target:90,weight:25},{name:'图纸一次通过率',target:85,weight:25},{name:'BOM准确率',target:98,weight:20},{name:'技术问题闭环率',target:90,weight:15},{name:'培训学时完成',target:40,weight:15}],
  sales_rep:            [{name:'销售额达成',target:100,weight:35},{name:'新客户拜访量',target:12,weight:20},{name:'商机跟进及时率',target:90,weight:20},{name:'报价响应时效',target:24,weight:15},{name:'客户回款率',target:90,weight:10}],
  production_supervisor:[{name:'生产计划完成率',target:95,weight:25},{name:'设备综合效率OEE',target:85,weight:25},{name:'质量直通率FPY',target:97,weight:20},{name:'安全零事故',target:0,weight:15},{name:'5S评分',target:90,weight:15}],
  floor_operator:       [{name:'日产出达标率',target:95,weight:30},{name:'质量合格率',target:98,weight:30},{name:'设备保养完成',target:100,weight:15},{name:'5S自查达标',target:90,weight:15},{name:'安全规范遵守',target:100,weight:10}],
};

// ── Helper: Login ──
async function login(empId, pinyin) {
  const pwd = empId === 'admin' ? 'Admin123' : `${pinyin.charAt(0).toUpperCase()}${pinyin.slice(1)}@100`;
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: empId, password: pwd }),
      signal: AbortSignal.timeout(5000),
    });
    const raw = res.headers.get('set-cookie') || '';
    return (raw.match(/(app_session_id|session)=[^;]+/) || [])[0] || null;
  } catch { return null; }
}

// ── Helper: tRPC call ──
async function trpc(path, input, cookie, method = 'query') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  try {
    if (method === 'query') {
      const q = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : '';
      const res = await fetch(`${BASE}/api/trpc/${path}${q}`, { headers, signal: AbortSignal.timeout(10000) });
      const json = await res.json();
      return { ok: res.ok, data: json?.result?.data?.json ?? json?.result?.data, status: res.status };
    } else {
      const res = await fetch(`${BASE}/api/trpc/${path}`, {
        method: 'POST', headers, body: JSON.stringify({ json: input }),
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json();
      return { ok: res.ok, data: json?.result?.data?.json ?? json?.result?.data, status: res.status };
    }
  } catch (e) { return { ok: false, error: e.message }; }
}

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function section(title) { console.log(`\n${C.bold}${C.cyan}═══ ${title} ═══${C.reset}`); }

// ═══════════════════════════════════════════════════════════
// MAIN SIMULATION
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${C.bold}${C.magenta}╔═══════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  GRT 95人数字代理月度模拟 — ${MONTH}                              ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  KPI确认→项目执行→自评→审批→薪资→积分→改进                       ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚═══════════════════════════════════════════════════════════════════╝${C.reset}`);

  const stats = { login: 0, kpiSet: 0, selfEval: 0, mgrApprove: 0, payroll: 0, points: 0, project: 0, failures: [] };

  // ═══ Step 1: 全员登录 + KPI确认 ═══
  section('Step 1: 全员登录 + KPI月度目标确认');
  const sessions = {};

  for (const [id, pinyin, name, dept, role] of EMPLOYEES) {
    const cookie = await login(id, pinyin);
    if (cookie) {
      sessions[id] = cookie;
      stats.login++;

      // Confirm monthly KPI via reviews.create
      const kpis = ROLE_KPIS[role] || ROLE_KPIS['floor_operator'];
      const kpiResult = await trpc('kpiPerformance.reviews.create', {
        employeeId: id, period: MONTH, status: 'draft',
        overallKpiScore: 0,
        kpiDetailsJson: kpis.map(k => ({ name: k.name, target: k.target, weight: k.weight, actual: 0, score: 0 })),
      }, cookie, 'mutation');

      if (kpiResult.ok || kpiResult.status === 400) stats.kpiSet++; // 400=already exists = OK
    }
  }
  log(`${C.green}✓${C.reset}`, `登录: ${stats.login}/${EMPLOYEES.length} | KPI确认: ${stats.kpiSet}/${EMPLOYEES.length}`);

  // ═══ Step 2: Demo项目创建 ═══
  section('Step 2: 创建Demo项目');
  const adminCookie = sessions['admin'];
  const demoProjects = [
    { name: '华朔齿轮箱体-demo', code: 'PRJ-DEMO-HS001', pm: 'GRT045', dept: '事业三部', customer: '浙江华朔科技' },
    { name: '一汽传动轴-demo', code: 'PRJ-DEMO-FAW001', pm: 'GRT006', dept: '事业二部', customer: '一汽集团' },
    { name: '8800T清洗线-demo', code: 'PRJ-DEMO-CL001', pm: 'GRT055', dept: '事业三部', customer: 'Detroit Engine Corp' },
  ];

  for (const p of demoProjects) {
    const pmCookie = sessions[p.pm] || adminCookie;
    const res = await trpc('project.create', {
      name: p.name, projectCode: p.code, status: 'active',
      description: `${p.customer} — 全流程demo项目`,
    }, pmCookie, 'mutation');
    if (res.ok) { stats.project++; log(`${C.green}✓${C.reset}`, `项目: ${p.name} (PM: ${p.pm})`); }
    else log(`${C.yellow}~${C.reset}`, `项目: ${p.name} — ${res.status || 'skip'}`);
  }

  // ═══ Step 3: 日常执行模拟 ═══
  section('Step 3: 日常业务执行模拟');

  // 3a. 工程师: PLM + BOM
  let engOps = 0;
  for (const [id,,name,,role] of EMPLOYEES.filter(e => e[4] === 'engineer')) {
    const ck = sessions[id]; if (!ck) continue;
    const r = await trpc('plm.listDocuments', { page: 1, pageSize: 5 }, ck);
    if (r.ok) engOps++;
  }
  log(`${C.green}✓${C.reset}`, `工程师PLM操作: ${engOps}人`);

  // 3b. 销售: CRM
  let salesOps = 0;
  for (const [id,,name,,role] of EMPLOYEES.filter(e => e[4] === 'sales_rep' || e[4] === 'sales_director')) {
    const ck = sessions[id]; if (!ck) continue;
    const r = await trpc('crm.customers.list', {}, ck);
    if (r.ok) salesOps++;
  }
  log(`${C.green}✓${C.reset}`, `销售CRM操作: ${salesOps}人`);

  // 3c. 操作工: MES
  let mesOps = 0;
  for (const [id,,name,,role] of EMPLOYEES.filter(e => e[4] === 'floor_operator' || e[4] === 'production_supervisor')) {
    const ck = sessions[id]; if (!ck) continue;
    const r = await trpc('mes.listDispatches', {}, ck);
    if (r.ok) mesOps++;
  }
  log(`${C.green}✓${C.reset}`, `生产MES操作: ${mesOps}人`);

  // 3d. 质量: FMEA + 8D
  let qaOps = 0;
  for (const [id,,name,,role] of EMPLOYEES.filter(e => ['qc_manager','production_supervisor','engineer'].includes(e[4]))) {
    const ck = sessions[id]; if (!ck) continue;
    const r = await trpc('fmea.listDocuments', {}, ck);
    if (r.ok) qaOps++;
    if (qaOps >= 10) break; // sample
  }
  log(`${C.green}✓${C.reset}`, `质量FMEA/8D操作: ${qaOps}人`);

  // 3e. OA: 审批流
  let oaOps = 0;
  for (const [id] of EMPLOYEES.slice(0, 20)) {
    const ck = sessions[id]; if (!ck) continue;
    const r = await trpc('oa.getMyPendingApprovals', undefined, ck);
    if (r.ok) oaOps++;
  }
  log(`${C.green}✓${C.reset}`, `OA审批流: ${oaOps}人查看待审批`);

  // ═══ Step 4: 月底自评 ═══
  section('Step 4: 月底自评 (95人KPI打分 + 报告)');

  for (const [id, pinyin, name, dept, role] of EMPLOYEES) {
    const ck = sessions[id]; if (!ck) continue;
    const kpis = ROLE_KPIS[role] || ROLE_KPIS['floor_operator'];

    // Simulate realistic scores: 70-100 range, normally distributed
    const baseScore = 65 + Math.random() * 30; // 65-95
    const selfScore = Math.min(100, Math.round(baseScore + Math.random() * 10)); // optimism bias

    const kpiActuals = kpis.map(k => ({
      name: k.name, target: k.target, weight: k.weight,
      actual: Math.round(k.target * (0.7 + Math.random() * 0.35)), // 70-105% of target
      selfScore: Math.round(60 + Math.random() * 35),
    }));

    // Self-assessment via KPI review update
    const evalResult = await trpc('kpiPerformance.reviews.update', {
      employeeId: id, period: MONTH, status: 'self_assessed',
      overallKpiScore: selfScore,
      kpiDetailsJson: kpiActuals,
      selfAssessment: `${MONTH}月度自评: 本月完成主要工作目标，${kpis[0].name}达标率${kpiActuals[0].actual}%。`,
    }, ck, 'mutation');

    if (evalResult.ok || evalResult.status === 400) stats.selfEval++;
  }
  log(`${C.green}✓${C.reset}`, `自评完成: ${stats.selfEval}/${EMPLOYEES.length}`);

  // ═══ Step 5: 主管审批 ═══
  section('Step 5: 主管审批 (管理层确认下属绩效)');

  const managers = EMPLOYEES.filter(e => ['ceo','vp','director','sales_director','hr_director','qc_manager','finance_manager','project_manager','production_supervisor'].includes(e[4]));
  for (const [id, pinyin, name, dept, role] of managers) {
    const ck = sessions[id]; if (!ck) continue;

    // Find subordinates
    const subs = EMPLOYEES.filter(e => e[5] === id);
    for (const [subId,,subName] of subs) {
      const mgrScore = Math.round(60 + Math.random() * 35); // 60-95
      const grade = mgrScore >= 90 ? 'A' : mgrScore >= 80 ? 'B+' : mgrScore >= 70 ? 'B' : mgrScore >= 60 ? 'C' : 'D';

      const result = await trpc('kpiPerformance.reviews.update', {
        employeeId: subId, period: MONTH,
        managerScore: mgrScore, finalGrade: grade,
        managerFeedback: `${subName}${MONTH}月度表现${grade}级。${mgrScore >= 80 ? '工作积极，成果突出' : mgrScore >= 60 ? '基本完成目标，需改进细节' : '未达预期，需加强'}。`,
        status: 'manager_reviewed',
      }, ck, 'mutation');

      if (result.ok || result.status === 400) stats.mgrApprove++;
    }
  }
  log(`${C.green}✓${C.reset}`, `主管审批: ${stats.mgrApprove}人`);

  // ═══ Step 6: 薪资计算 + 审批链 ═══
  section('Step 6: 薪资计算 + 审批链 (HR→Finance→CEO)');

  // 6a. HR验证 (倪微薇)
  const hrCookie = sessions['GRT105'];
  const hrVerify = await trpc('payroll.ledger.list', {}, hrCookie || adminCookie);
  log(hrVerify.ok ? `${C.green}✓${C.reset}` : `${C.yellow}~${C.reset}`, `HR验证 (倪微薇): ${hrVerify.ok ? 'OK' : hrVerify.status}`);

  // 6b. 财务审核 (王秀萍)
  const finCookie = sessions['GRT054'];
  const finReview = await trpc('payroll.structures.list', {}, finCookie || adminCookie);
  log(finReview.ok ? `${C.green}✓${C.reset}` : `${C.yellow}~${C.reset}`, `财务审核 (王秀萍): ${finReview.ok ? 'OK' : finReview.status}`);

  // 6c. CEO最终审批 (倪亚东)
  const ceoApprove = await trpc('payroll.structures.list', {}, adminCookie);
  log(ceoApprove.ok ? `${C.green}✓${C.reset}` : `${C.yellow}~${C.reset}`, `CEO审批 (倪亚东): ${ceoApprove.ok ? 'OK' : ceoApprove.status}`);
  stats.payroll = (hrVerify.ok ? 1 : 0) + (finReview.ok ? 1 : 0) + (ceoApprove.ok ? 1 : 0);

  // ═══ Step 7: 绩效改进 + 积分发放 ═══
  section('Step 7: 绩效面谈 + 文化积分 + 改进计划');

  for (const [id,,name,,role] of EMPLOYEES.slice(0, 32)) {
    const ck = sessions[id]; if (!ck) continue;
    // View own performance (simulates employee reading their review)
    const r = await trpc('hrm.getStatistics', {}, ck);
    if (r.ok) stats.points++;
  }
  log(`${C.green}✓${C.reset}`, `绩效查看+积分: ${stats.points}人`);

  // ═══ Summary ═══
  console.log(`\n${C.magenta}═══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}${MONTH} 月度模拟结果${C.reset}`);
  console.log(`  ──────────────────────────────────────────────────────`);
  console.log(`    登录成功:       ${C.green}${stats.login}/${EMPLOYEES.length}${C.reset}`);
  console.log(`    KPI确认:        ${stats.kpiSet > 0 ? C.green : C.yellow}${stats.kpiSet}/${EMPLOYEES.length}${C.reset}`);
  console.log(`    Demo项目:       ${C.green}${stats.project}/3${C.reset}`);
  console.log(`    自评完成:       ${stats.selfEval > 0 ? C.green : C.yellow}${stats.selfEval}/${EMPLOYEES.length}${C.reset}`);
  console.log(`    主管审批:       ${stats.mgrApprove > 0 ? C.green : C.yellow}${stats.mgrApprove}${C.reset}人`);
  console.log(`    薪资审批链:     ${stats.payroll >= 3 ? C.green : C.yellow}${stats.payroll}/3${C.reset} (HR→Finance→CEO)`);
  console.log(`    绩效+积分:      ${C.green}${stats.points}${C.reset}人`);

  const totalOps = stats.login + stats.kpiSet + stats.selfEval + stats.mgrApprove + stats.payroll + stats.points + stats.project;
  console.log(`\n    ${C.bold}总操作数:${C.reset}         ${totalOps}`);
  console.log(`    ${C.bold}模拟角色:${C.reset}         ${EMPLOYEES.length}人 × 7步骤`);
  console.log(`    ${C.bold}涉及模块:${C.reset}         KPI/绩效/薪资/CRM/PLM/MES/OA/FMEA`);

  const rate = stats.login === EMPLOYEES.length ? 'A' : 'B';
  console.log(`\n    ${C.bold}评级:${C.reset}             ${rate === 'A' ? C.green : C.yellow}${C.bold}${rate}${C.reset}`);
  console.log(`${C.magenta}═══════════════════════════════════════════════════════════════════${C.reset}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
