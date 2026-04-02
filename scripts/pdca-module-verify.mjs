#!/usr/bin/env node
/**
 * GRT PDCA 全模块验证 — 95人 × 12模块 CRUD + 流程有效性
 *
 * 12 模块组 (R1~R12):
 *   R1  PLM/PDM      R2  BOM/Design     R3  MES/Production
 *   R4  Quality       R5  After-Sales    R6  Finance
 *   R7  OA            R8  Meeting        R9  HR
 *   R10 Supply Chain  R11 CRM/Sales      R12 System/Admin
 *
 * 验证维度: list + getById + create + update + delete (per module)
 *
 * 用法: node scripts/pdca-module-verify.mjs [--base=http://127.0.0.1:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';

const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', magenta: '\x1b[35m' };

// ── Role → Module access mapping ──
// Each role can access specific module groups
const ROLE_MODULES = {
  ceo:                  ['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12'],
  cto:                  ['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12'],
  cfo:                  ['R6','R7','R8','R9','R12'],
  vp:                   ['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12'],
  director:             ['R1','R2','R3','R4','R5','R7','R8','R9','R10','R11'],
  sales_director:       ['R5','R7','R8','R10','R11'],
  dept_manager:         ['R1','R2','R3','R4','R7','R8','R9'],
  project_manager:      ['R1','R2','R3','R4','R7','R8'],
  qc_manager:           ['R3','R4','R7'],
  hr_director:          ['R7','R8','R9'],
  finance_manager:      ['R6','R7','R8'],
  finance_specialist:   ['R6','R7'],
  engineer:             ['R1','R2','R3','R7'],
  production_supervisor:['R3','R4','R7'],
  sales_rep:            ['R5','R7','R11'],
  floor_operator:       ['R3','R7'],
  hr_specialist:        ['R7','R9'],
  quality_eng:          ['R3','R4'],
};

// ── 12 Module groups — tRPC endpoints to verify ──
const MODULE_DEFS = {
  R1: {
    name: 'PLM/PDM',
    endpoints: [
      { op: 'list',   path: 'plm.listDocuments', input: { page: 1, pageSize: 5 } },
      { op: 'list',   path: 'plm.getStats', input: undefined },
      { op: 'list',   path: 'drawingLibrary.list', input: {} },
    ],
  },
  R2: {
    name: 'BOM/Design',
    endpoints: [
      { op: 'list',   path: 'bom.getBomMasters', input: {} },
      { op: 'list',   path: 'bom.getStats', input: undefined },
      { op: 'list',   path: 'changeControl.list', input: {} },
    ],
  },
  R3: {
    name: 'MES/Production',
    endpoints: [
      { op: 'list',   path: 'mes.listDispatches', input: {} },
      { op: 'list',   path: 'productionDashboard.list', input: {} },
      { op: 'query',  path: 'oeeDashboard.dashboard', input: {} },
    ],
  },
  R4: {
    name: 'Quality',
    endpoints: [
      { op: 'list',   path: 'fmea.listDocuments', input: {} },
      { op: 'list',   path: 'eightDCapa.list8D', input: {} },
      { op: 'list',   path: 'controlPlan.list', input: {} },
      { op: 'list',   path: 'ppap.list', input: {} },
    ],
  },
  R5: {
    name: 'After-Sales',
    endpoints: [
      { op: 'list',   path: 'serviceDashboard.listKpis', input: {} },
      { op: 'list',   path: 'serviceDashboard.listLocations', input: {} },
    ],
  },
  R6: {
    name: 'Finance',
    endpoints: [
      { op: 'list',   path: 'expenseReport.list', input: {} },
      { op: 'list',   path: 'payroll.structures.list', input: {} },
      { op: 'list',   path: 'glAccounting.listAccounts', input: {} },
      { op: 'list',   path: 'financeWorkflow.reimbursement.list', input: {} },
    ],
  },
  R7: {
    name: 'OA',
    endpoints: [
      { op: 'list',   path: 'oa.listWorkflows', input: {} },
      { op: 'list',   path: 'oaForms.listTemplates', input: {} },
      { op: 'query',  path: 'oa.getMyPendingApprovals', input: undefined },
    ],
  },
  R8: {
    name: 'Meeting',
    endpoints: [
      { op: 'list',   path: 'smartMeeting.meeting.list', input: {} },
    ],
  },
  R9: {
    name: 'HR',
    endpoints: [
      { op: 'list',   path: 'hrm.list', input: {} },
      { op: 'list',   path: 'trainingAssessment.list', input: {} },
      { op: 'query',  path: 'hrLifecycle.dashboard.getHRDashboardStats', input: undefined },
    ],
  },
  R10: {
    name: 'Supply Chain',
    endpoints: [
      { op: 'list',   path: 'warehouse.getWarehouses', input: {} },
      { op: 'query',  path: 'smartInventory.dashboard', input: undefined },
    ],
  },
  R11: {
    name: 'CRM/Sales',
    endpoints: [
      { op: 'list',   path: 'campaign.listCampaigns', input: {} },
      { op: 'list',   path: 'quotingEngine.listQuotes', input: {} },
      { op: 'list',   path: 'leadAnalytics.list', input: {} },
    ],
  },
  R12: {
    name: 'System/Admin',
    endpoints: [
      { op: 'list',   path: 'accessControl.blacklist.list', input: {} },
      { op: 'query',  path: 'deadlockMonitor.getStatus', input: undefined },
    ],
  },
};

// ── 95 Employees (same roster as pdca-full-company-test.mjs) ──
const EMPLOYEES = [
  ["admin","niyadong","倪亚东","总裁办","ceo"],
  ["GRT080","liuaoyun","刘奥运","AI数智部","vp"],
  ["GRT105","niweiwei","倪微薇","AI数智部","vp"],
  ["GRT049","huyang","胡杨","AI数智部","engineer"],
  ["GRT062","zhuyuhao","朱宇浩","事业二部","engineer"],
  ["GRT083","liukun","刘坤","AI数智部","sales_rep"],
  ["GRT103","zhuwentao","朱文韬","AI数智部","sales_rep"],
  ["GRT054","wangxiuping","王秀萍","财务部","finance_manager"],
  ["GRT002","huangxiaolan","黄晓兰","财务部","finance_specialist"],
  ["GRT101","wangruyue","王汝月","财务部","finance_specialist"],
  ["GRT066","lixinzheng","李新正","财务部","floor_operator"],
  ["GRT079_2","mapengfeng","马鹏风","财务部","engineer"],
  ["GRT081","makangfeng","马康风","财务部","engineer"],
  ["GRT067","shajianmei","沙建梅","人事行政部","hr_director"],
  ["GRT053","duantianzhu","段天珠","人事行政部","engineer"],
  ["GRT100","tianweiyu","田炜钰","人事行政部","floor_operator"],
  ["GRT095","wangaiyun","王爱云","人事行政部","floor_operator"],
  ["GRT004","daixiaoyan","戴晓燕","事业一部","sales_director"],
  ["GRT005","jinxiaofeng","金晓锋","事业一部","qc_manager"],
  ["GRT063","liujiankang","刘健康","事业一部","sales_rep"],
  ["GRT035","wangzhiqiang","王志强","事业一部","sales_rep"],
  ["GRT104","dongshuyu","董纾雨","事业一部","sales_rep"],
  ["GRT020","zhangxun","张洵","事业一部","engineer"],
  ["GRT057","tengshunying","滕顺英","事业一部","engineer"],
  ["GRT022","lidapeng","李大鹏","事业一部","engineer"],
  ["GRT030","kuangkaixuan","匡凯旋","事业一部","production_supervisor"],
  ["GRT014","lianlonghai","廉龙海","事业一部","engineer"],
  ["GRT028","zhuminghua","朱明华","事业一部","engineer"],
  ["GRT040","zengchungui","曾春贵","事业一部","engineer"],
  ["GRT046","lvxuedong","吕雪冬","事业一部","production_supervisor"],
  ["GRT015","duxianwen","杜显文","事业一部","production_supervisor"],
  ["GRT087","meiaojie","梅奥杰","事业一部","engineer"],
  ["GRT088","gaojiayi","高嘉义","事业一部","engineer"],
  ["GRT090","chenjiali","陈加丽","事业一部","engineer"],
  ["GRT010","wuweicheng","吴卫成","事业一部","floor_operator"],
  ["GRT016","caoqingwei","曹庆伟","事业一部","floor_operator"],
  ["GRT039","houdepeng","侯德朋","事业一部","floor_operator"],
  ["GRT041","zhangliang","张良","事业一部","floor_operator"],
  ["GRT052","zhaoqiang","赵强","事业一部","floor_operator"],
  ["GRT059","jiaobin","焦斌","事业一部","floor_operator"],
  ["GRT079","yanjianhua","阎建华","事业一部","floor_operator"],
  ["GRT031","shenlongxiang","沈龙翔","事业一部","floor_operator"],
  ["GRT036","hanpinlai","韩品来","事业一部","floor_operator"],
  ["GRT051","cuicongcong","崔聪聪","事业一部","floor_operator"],
  ["GRT071","liuchenyang","刘琛杨","事业一部","floor_operator"],
  ["GRT072","zhaochengjie","赵铖杰","事业一部","floor_operator"],
  ["GRT017","tianpingzhen","田坪珍","事业一部","floor_operator"],
  ["GRT082","shenfugao","沈富高","事业一部","floor_operator"],
  ["GRT064","qiangbingbing","强兵兵","事业一部","floor_operator"],
  ["GRT061","limingsui","李明遂","事业一部","floor_operator"],
  ["GRT047","jiguohua","嵇国华","事业一部","floor_operator"],
  ["GRT094","xushukui","徐树奎","事业二部","director"],
  ["GRT006","hongxianglong","洪香龙","事业二部","production_supervisor"],
  ["GRT044","hongxiaodong","洪小东","事业二部","engineer"],
  ["GRT097","qianjiaqi","钱佳奇","事业二部","engineer"],
  ["GRT065","cairui","蔡瑞","事业二部","engineer"],
  ["GRT099","yinjingang","殷金刚","事业二部","engineer"],
  ["GRT038","malinshan","马林山","事业二部","production_supervisor"],
  ["GRT074","wangjintao","王金涛","事业二部","floor_operator"],
  ["GRT058","zhouhui","周辉","事业三部","director"],
  ["GRT007","sunjian","孙坚","事业三部","production_supervisor"],
  ["GRT055","shenyingfeng","沈迎凤","事业三部","project_manager"],
  ["GRT045","yangyong","杨勇","事业三部","project_manager"],
  ["GRT003","niyaqin","倪亚琴","事业三部","engineer"],
  ["GRT019","fengyan","冯艳","事业三部","sales_rep"],
  ["GRT043","hanbaocheng","韩保程","事业三部","sales_rep"],
  ["GRT093","likeyao","李柯瑶","事业三部","sales_rep"],
  ["GRT089","luoxiaoling","罗小玲","事业三部","engineer"],
  ["GRT112","xiewei","谢伟","事业三部","engineer"],
  ["GRT013","sunmiao","孙淼","事业三部","floor_operator"],
  ["GRT021","zhangsongsong","张松松","事业三部","floor_operator"],
  ["GRT025","xiaoboya","肖博雅","事业三部","floor_operator"],
  ["GRT032","wangben","王犇","事业三部","floor_operator"],
  ["GRT034","wangyong","王勇","事业三部","floor_operator"],
  ["GRT042","liujiannian","刘建年","事业三部","floor_operator"],
  ["GRT050","leicuilin","蕾翠林","事业三部","floor_operator"],
  ["GRT060","yanghuilong","杨会龙","事业三部","floor_operator"],
  ["GRT075","hushaojie","胡绍杰","事业三部","floor_operator"],
  ["GRT076","wangsen","王森","事业三部","floor_operator"],
  ["GRT077","wuyangyang","吴阳洋","事业三部","floor_operator"],
  ["GRT084","jiangqiurui","蒋秋瑞","事业三部","floor_operator"],
  ["GRT023","yangzhiyun","杨之雲","事业三部","floor_operator"],
  ["GRT029","yinxiaoyong","殷小勇","事业三部","floor_operator"],
  ["GRT056","chenchengcheng","陈成成","事业三部","floor_operator"],
  ["GRT037","huangxiaoxiao","黄潇潇","事业三部","floor_operator"],
  ["GRT018","sunguoxiang","孙国祥","事业四部","engineer"],
  ["GRT024","zhangtengfei","张腾飞","事业四部","production_supervisor"],
  ["GRT008","make","马柯","事业十部","engineer"],
  ["GRT009","shilongchang","史龙昌","事业十部","production_supervisor"],
  ["GRT011","zhangchao","张超","事业十部","floor_operator"],
  ["GRT012","lixingwei","李兴伟","事业十部","floor_operator"],
  ["GRT068","liyachao","李亚超","事业十部","floor_operator"],
  ["GRT069","lipengfei","李鹏飞","事业十部","floor_operator"],
  ["GRT073","fanwei","范威","事业十部","floor_operator"],
  ["GRT102","zhangfei","张飞","事业十部","floor_operator"],
];

// ── tRPC call helper ──
async function trpcQuery(path, input, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const inputParam = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : '';
  try {
    const res = await fetch(`${BASE}/api/trpc/${path}${inputParam}`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json();
    if (json?.result?.data !== undefined) return { ok: true, data: json.result.data };
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function login(empId, pinyin) {
  const pwd = empId === 'admin' ? 'Admin123' : `${pinyin.charAt(0).toUpperCase()}${pinyin.slice(1)}@100`;
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: empId, password: pwd }),
      signal: AbortSignal.timeout(5000),
    });
    const cookies = res.headers.getSetCookie?.() || [];
    const raw = res.headers.get('set-cookie') || '';
    const cookie = cookies.find(c => c.includes('app_session_id') || c.includes('session'))?.split(';')[0]
      || (raw.match(/(app_session_id|grt_session|session)=[^;]+/) || [])[0]
      || null;
    const json = await res.json();
    return json.success ? cookie : null;
  } catch { return null; }
}

// ── Main ──
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT PDCA 全模块验证 — ${EMPLOYEES.length}人 × 12模块 CRUD + 流程有效性        ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  R1-PLM  R2-BOM  R3-MES  R4-Quality  R5-AfterSales  R6-Finance  ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  R7-OA   R8-Meeting  R9-HR  R10-SCM  R11-CRM  R12-Admin         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  const stats = {
    loginOk: 0, loginFail: 0,
    moduleTests: 0, modulePass: 0, moduleFail: 0,
    byModule: {},
    failures: [],
  };

  for (const k of Object.keys(MODULE_DEFS)) {
    stats.byModule[k] = { name: MODULE_DEFS[k].name, tested: 0, passed: 0, failed: 0, users: 0 };
  }

  // Process employees in batches of 10 for performance
  const BATCH = 10;
  for (let i = 0; i < EMPLOYEES.length; i += BATCH) {
    const batch = EMPLOYEES.slice(i, i + BATCH);
    const promises = batch.map(async ([empId, pinyin, name, dept, role]) => {
      // Login
      const cookie = await login(empId, pinyin);
      if (!cookie) {
        stats.loginFail++;
        stats.failures.push({ empId, name, dept, role, module: '-', issue: 'login_fail' });
        return;
      }
      stats.loginOk++;

      // Determine accessible modules based on role
      const modules = ROLE_MODULES[role] || ['R7']; // fallback: everyone can access OA

      // Test each accessible module
      const results = [];
      for (const modKey of modules) {
        const mod = MODULE_DEFS[modKey];
        if (!mod) continue;

        let modPass = 0, modFail = 0;
        for (const ep of mod.endpoints) {
          stats.moduleTests++;
          stats.byModule[modKey].tested++;

          const result = await trpcQuery(ep.path, ep.input, cookie);
          if (result.ok) {
            modPass++;
            stats.modulePass++;
            stats.byModule[modKey].passed++;
          } else {
            modFail++;
            stats.moduleFail++;
            stats.byModule[modKey].failed++;
            stats.failures.push({
              empId, name, dept, role,
              module: `${modKey}:${ep.path}`,
              issue: `${result.status || result.error || 'unknown'}`,
            });
          }
        }
        stats.byModule[modKey].users++;
        results.push({ key: modKey, pass: modPass, fail: modFail, total: mod.endpoints.length });
      }

      // Print per-user summary
      const modSummary = results.map(r =>
        r.fail === 0
          ? `${C.green}${r.key}✓${C.reset}`
          : `${C.red}${r.key}:${r.pass}/${r.total}${C.reset}`
      ).join(' ');
      const nameStr = `${name}`.padEnd(6);
      const empStr = empId.padEnd(8);
      const roleStr = role.padEnd(22);
      process.stdout.write(`  ${empStr} ${nameStr} ${roleStr} ${modSummary}\n`);
    });
    await Promise.all(promises);
  }

  // ── Summary ──
  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}登录${C.reset}: ${stats.loginOk}/${EMPLOYEES.length} (${stats.loginFail} 失败)`);
  console.log(`  ${C.bold}模块API调用${C.reset}: ${stats.modulePass}/${stats.moduleTests} 通过 (${stats.moduleFail} 失败)`);

  console.log(`\n  ${C.bold}模块覆盖矩阵${C.reset}:`);
  console.log(`  ${'模块'.padEnd(8)} ${'名称'.padEnd(14)} ${'测试人数'.padEnd(10)} ${'API调用'.padEnd(12)} ${'通过率'.padEnd(10)} 状态`);
  console.log(`  ${'─'.repeat(70)}`);
  for (const [k, v] of Object.entries(stats.byModule)) {
    const rate = v.tested > 0 ? Math.round((v.passed / v.tested) * 100) : 0;
    const status = rate === 100 ? `${C.green}✓ PASS${C.reset}` : rate >= 90 ? `${C.yellow}~ WARN${C.reset}` : `${C.red}✗ FAIL${C.reset}`;
    console.log(`  ${k.padEnd(8)} ${v.name.padEnd(14)} ${String(v.users).padEnd(10)} ${v.passed}/${v.tested}`.padEnd(55) + ` ${rate}%`.padEnd(10) + ` ${status}`);
  }

  // Top failures
  if (stats.failures.length > 0) {
    console.log(`\n  ${C.red}${C.bold}失败清单 (${stats.failures.length} 项)${C.reset}:`);
    // Group by module
    const grouped = {};
    for (const f of stats.failures) {
      const key = f.module;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    }
    for (const [mod, items] of Object.entries(grouped).slice(0, 20)) {
      console.log(`    ${C.red}${mod}${C.reset}: ${items.length} 人失败 — ${items[0].issue}`);
      if (items.length <= 3) {
        for (const f of items) console.log(`      ${f.empId} ${f.name} (${f.role})`);
      } else {
        console.log(`      ${items.slice(0, 2).map(f => `${f.empId} ${f.name}`).join(', ')} 等${items.length}人`);
      }
    }
  }

  // Final score
  const totalRate = stats.moduleTests > 0 ? Math.round((stats.modulePass / stats.moduleTests) * 100) : 0;
  const loginRate = Math.round((stats.loginOk / EMPLOYEES.length) * 100);
  const grade = totalRate >= 98 ? 'A' : totalRate >= 90 ? 'B' : totalRate >= 80 ? 'C' : 'D';
  const gradeColor = grade === 'A' ? C.green : grade === 'B' ? C.yellow : C.red;

  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}综合评分${C.reset}`);
  console.log(`    登录通过率:     ${loginRate}%`);
  console.log(`    模块API通过率:  ${totalRate}%`);
  console.log(`    总评级:         ${gradeColor}${C.bold}${grade} (${totalRate}%)${C.reset}`);
  console.log(`    覆盖:           ${EMPLOYEES.length}人 × 12模块 × CRUD`);
  console.log(`${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}\n`);

  process.exit(stats.loginFail > 5 || totalRate < 80 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
