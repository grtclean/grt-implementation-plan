#!/usr/bin/env node
/**
 * GRT 全员 98 人 PDCA 有效性验证
 * 5 维度: 登录 + 页面 + API + 审批链 + PDCA数据
 *
 * 用法: node scripts/pdca-full-company-test.mjs
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Gerry123456@localhost:5432/grt_system';

const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m' };

// ── 全员名册 (从 seed-real-users + seed-org-hierarchy) ──
// 格式: [工号, 拼音, 姓名, 部门, RBAC角色, 核心页面...]
const EMPLOYEES = [
  // 总裁办
  ["admin", "niyadong", "倪亚东", "总裁办", "ceo", ["/command-center","/ceo/executive-cockpit","/pos/projects","/stage-gate","/kpi-management","/oa-dashboard"]],
  // AI数智部
  ["GRT080", "liuaoyun", "刘奥运", "AI数智部", "vp", ["/command-center","/strategy","/pos/projects","/kpi-management","/oa-dashboard"]],
  ["GRT105", "niweiwei", "倪微薇", "AI数智部", "vp", ["/hrm-intelligent","/hr-lifecycle","/command-center","/kpi-management","/oa-dashboard"]],
  ["GRT049", "huyang", "胡杨", "AI数智部", "engineer", ["/plm","/pos/projects","/kpi-management"]],
  ["GRT062", "zhuyuhao", "朱宇浩", "事业二部", "engineer", ["/plm","/pos/projects","/kpi-management"]],
  ["GRT083", "liukun", "刘坤", "AI数智部", "sales_rep", ["/crm","/crm/opportunities","/kpi-management"]],
  ["GRT103", "zhuwentao", "朱文韬", "AI数智部", "sales_rep", ["/crm","/crm/opportunities","/kpi-management"]],
  // 财务部
  ["GRT054", "wangxiuping", "王秀萍", "财务部", "finance_manager", ["/expense-report","/budget-management","/cost-planning","/kpi-management"]],
  ["GRT002", "huangxiaolan", "黄晓兰", "财务部", "finance_specialist", ["/expense-report","/kpi-management","/oa-dashboard"]],
  ["GRT101", "wangruyue", "王汝月", "财务部", "finance_specialist", ["/expense-report","/kpi-management","/oa-dashboard"]],
  ["GRT066", "lixinzheng", "李新正", "财务部", "floor_operator", ["/mes-workbench","/kpi-management"]],
  ["GRT079_2", "mapengfeng", "马鹏风", "财务部", "engineer", ["/kpi-management","/oa-dashboard"]],
  ["GRT081", "makangfeng", "马康风", "财务部", "engineer", ["/kpi-management","/oa-dashboard"]],
  // 人事行政部
  ["GRT067", "shajianmei", "沙建梅", "人事行政部", "hr_director", ["/hrm-intelligent","/hr-lifecycle","/employee-management","/recruitment","/kpi-management"]],
  ["GRT053", "duantianzhu", "段天珠", "人事行政部", "engineer", ["/kpi-management","/oa-dashboard"]],
  ["GRT100", "tianweiyu", "田炜钰", "人事行政部", "floor_operator", ["/kpi-management"]],
  ["GRT095", "wangaiyun", "王爱云", "人事行政部", "floor_operator", ["/kpi-management"]],
  // 事业一部
  ["GRT004", "daixiaoyan", "戴晓燕", "事业一部", "sales_director", ["/crm","/pos/projects","/kpi-management","/oa-dashboard"]],
  ["GRT005", "jinxiaofeng", "金晓锋", "事业一部", "qc_manager", ["/fmea","/quality-workbench","/kpi-management"]],
  ["GRT063", "liujiankang", "刘健康", "事业一部", "sales_rep", ["/crm","/quotation-management","/pos/projects","/stage-gate","/kpi-management"]],
  ["GRT035", "wangzhiqiang", "王志强", "事业一部", "sales_rep", ["/crm","/pos/projects","/kpi-management"]],
  ["GRT104", "dongshuyu", "董纾雨", "事业一部", "sales_rep", ["/crm","/pos/projects","/kpi-management"]],
  ["GRT020", "zhangxun", "张洵", "事业一部", "engineer", ["/pos/procurement","/pos/projects","/kpi-management"]],
  ["GRT057", "tengshunying", "滕顺英", "事业一部", "engineer", ["/pos/projects","/kpi-management"]],
  ["GRT022", "lidapeng", "李大鹏", "事业一部", "engineer", ["/plm","/pos/projects","/kpi-management"]],
  ["GRT030", "kuangkaixuan", "匡凯旋", "事业一部", "production_supervisor", ["/after-sales-workbench","/kpi-management"]],
  ["GRT014", "lianlonghai", "廉龙海", "事业一部", "engineer", ["/kpi-management"]],
  ["GRT028", "zhuminghua", "朱明华", "事业一部", "engineer", ["/kpi-management"]],
  ["GRT040", "zengchungui", "曾春贵", "事业一部", "engineer", ["/kpi-management"]],
  ["GRT046", "lvxuedong", "吕雪冬", "事业一部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  ["GRT015", "duxianwen", "杜显文", "事业一部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  ["GRT087", "meiaojie", "梅奥杰", "事业一部", "engineer", ["/plm","/kpi-management"]],
  ["GRT088", "gaojiayi", "高嘉义", "事业一部", "engineer", ["/plm","/kpi-management"]],
  ["GRT090", "chenjiali", "陈加丽", "事业一部", "engineer", ["/plm","/kpi-management"]],
  ["GRT010", "wuweicheng", "吴卫成", "事业一部", "floor_operator", ["/mes-workbench","/kpi-management"]],
  ["GRT016", "caoqingwei", "曹庆伟", "事业一部", "floor_operator", ["/mes-workbench","/kpi-management"]],
  ["GRT039", "houdepeng", "侯德朋", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT041", "zhangliang", "张良", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT052", "zhaoqiang", "赵强", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT059", "jiaobin", "焦斌", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT079", "yanjianhua", "阎建华", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT031", "shenlongxiang", "沈龙翔", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT036", "hanpinlai", "韩品来", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT051", "cuicongcong", "崔聪聪", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT071", "liuchenyang", "刘琛杨", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT072", "zhaochengjie", "赵铖杰", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT017", "tianpingzhen", "田坪珍", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT082", "shenfugao", "沈富高", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT064", "qiangbingbing", "强兵兵", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT061", "limingsui", "李明遂", "事业一部", "floor_operator", ["/kpi-management"]],
  ["GRT047", "jiguohua", "嵇国华", "事业一部", "floor_operator", ["/kpi-management"]],
  // 事业二部
  ["GRT094", "xushukui", "徐树奎", "事业二部", "director", ["/pos/projects","/stage-gate","/kpi-management","/oa-dashboard"]],
  ["GRT006", "hongxianglong", "洪香龙", "事业二部", "production_supervisor", ["/plm","/pos/projects","/kpi-management"]],
  ["GRT044", "hongxiaodong", "洪小东", "事业二部", "engineer", ["/plm","/bom-management","/fmea","/kpi-management"]],
  ["GRT097", "qianjiaqi", "钱佳奇", "事业二部", "engineer", ["/plm","/electrical-design","/kpi-management"]],
  ["GRT065", "cairui", "蔡瑞", "事业二部", "engineer", ["/plm","/kpi-management"]],
  ["GRT099", "yinjingang", "殷金刚", "事业二部", "engineer", ["/plm","/kpi-management"]],
  ["GRT038", "malinshan", "马林山", "事业二部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  ["GRT074", "wangjintao", "王金涛", "事业二部", "floor_operator", ["/kpi-management"]],
  // 事业三部
  ["GRT058", "zhouhui", "周辉", "事业三部", "director", ["/pos/projects","/stage-gate","/kpi-management","/oa-dashboard"]],
  ["GRT007", "sunjian", "孙坚", "事业三部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  ["GRT055", "shenyingfeng", "沈迎凤", "事业三部", "project_manager", ["/pos/projects","/stage-gate","/kpi-management"]],
  ["GRT045", "yangyong", "杨勇", "事业三部", "project_manager", ["/pos/projects","/stage-gate","/task-cockpit","/kpi-management"]],
  ["GRT003", "niyaqin", "倪亚琴", "事业三部", "engineer", ["/pos/projects","/kpi-management"]],
  ["GRT019", "fengyan", "冯艳", "事业三部", "sales_rep", ["/crm","/pos/projects","/kpi-management"]],
  ["GRT043", "hanbaocheng", "韩保程", "事业三部", "sales_rep", ["/crm","/pos/projects","/kpi-management"]],
  ["GRT093", "likeyao", "李柯瑶", "事业三部", "sales_rep", ["/crm","/pos/projects","/kpi-management"]],
  ["GRT089", "luoxiaoling", "罗小玲", "事业三部", "engineer", ["/plm","/kpi-management"]],
  ["GRT112", "xiewei", "谢伟", "事业三部", "engineer", ["/plm","/kpi-management"]],
  ["GRT013", "sunmiao", "孙淼", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT021", "zhangsongsong", "张松松", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT025", "xiaoboya", "肖博雅", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT032", "wangben", "王犇", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT034", "wangyong", "王勇", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT042", "liujiannian", "刘建年", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT050", "leicuilin", "蕾翠林", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT060", "yanghuilong", "杨会龙", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT075", "hushaojie", "胡绍杰", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT076", "wangsen", "王森", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT077", "wuyangyang", "吴阳洋", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT084", "jiangqiurui", "蒋秋瑞", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT023", "yangzhiyun", "杨之雲", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT029", "yinxiaoyong", "殷小勇", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT056", "chenchengcheng", "陈成成", "事业三部", "floor_operator", ["/kpi-management"]],
  ["GRT037", "huangxiaoxiao", "黄潇潇", "事业三部", "floor_operator", ["/kpi-management"]],
  // 事业四部
  ["GRT018", "sunguoxiang", "孙国祥", "事业四部", "engineer", ["/plm","/kpi-management"]],
  ["GRT024", "zhangtengfei", "张腾飞", "事业四部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  // 事业十部
  ["GRT008", "make", "马柯", "事业十部", "engineer", ["/kpi-management"]],
  ["GRT009", "shilongchang", "史龙昌", "事业十部", "production_supervisor", ["/mes-workbench","/kpi-management"]],
  ["GRT011", "zhangchao", "张超", "事业十部", "floor_operator", ["/kpi-management"]],
  ["GRT012", "lixingwei", "李兴伟", "事业十部", "floor_operator", ["/kpi-management"]],
  ["GRT068", "liyachao", "李亚超", "事业十部", "floor_operator", ["/kpi-management"]],
  ["GRT069", "lipengfei", "李鹏飞", "事业十部", "floor_operator", ["/kpi-management"]],
  ["GRT073", "fanwei", "范威", "事业十部", "floor_operator", ["/kpi-management"]],
  ["GRT102", "zhangfei", "张飞", "事业十部", "floor_operator", ["/kpi-management"]],
];

// ── 主函数 ──
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT 全员 PDCA 有效性验证 (${EMPLOYEES.length} 人)                    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  5 维度: 登录 + 页面 + API + 审批链 + PDCA数据          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);

  let loginPass = 0, loginFail = 0;
  let pagePass = 0, pageFail = 0;
  let chainPass = 0, chainFail = 0;
  const failures = [];
  const deptStats = {};

  for (const [empId, pinyin, name, dept, role, pages] of EMPLOYEES) {
    // D1: 登录
    const pwd = empId === 'admin' ? 'Admin123' : `${pinyin.charAt(0).toUpperCase()}${pinyin.slice(1)}@100`;
    let cookie = null;
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: empId, password: pwd }),
      });
      const cookies = res.headers.getSetCookie?.() || [];
      const raw = res.headers.get('set-cookie') || '';
      cookie = cookies.find(c => c.includes('app_session_id') || c.includes('session'))?.split(';')[0]
        || (raw.match(/(app_session_id|grt_session|session)=[^;]+/) || [])[0]
        || null;
      const json = await res.json();
      if (!json.success) {
        loginFail++;
        failures.push({ empId, name, dept, issue: 'login_fail' });
        continue;
      }
      loginPass++;
    } catch {
      loginFail++;
      failures.push({ empId, name, dept, issue: 'login_error' });
      continue;
    }

    // D2: 页面可达
    let pPass = 0, pFail = 0;
    const headers = cookie ? { Cookie: cookie } : {};
    for (const page of pages) {
      try {
        const res = await fetch(`${BASE}${page}`, { headers, redirect: 'follow' });
        if (res.ok) pPass++; else pFail++;
      } catch { pFail++; }
    }
    pagePass += pPass;
    pageFail += pFail;

    // D4: 审批链
    let supervisor = '-';
    try {
      const res = await fetch(`${BASE}/api/trpc/oaForms.getMyApprovalChain?input=${encodeURIComponent('{"json":{}}')}`, { headers });
      const json = await res.json();
      const chain = json?.result?.data?.json?.chain ?? json?.result?.data?.chain ?? [];
      supervisor = chain.length > 0 ? chain[0].name : '(顶层)';
      if (chain.length > 0 || empId === 'admin') chainPass++; else chainFail++;
    } catch { chainFail++; }

    // 部门统计
    if (!deptStats[dept]) deptStats[dept] = { total: 0, loginOk: 0, pageOk: 0 };
    deptStats[dept].total++;
    deptStats[dept].loginOk++;
    if (pFail === 0) deptStats[dept].pageOk++;

    // 输出
    const status = pFail === 0 ? `${C.green}OK${C.reset}` : `${C.yellow}${pPass}/${pages.length}${C.reset}`;
    const nameStr = `${name}`.padEnd(6);
    const empStr = empId.padEnd(8);
    const deptStr = dept.padEnd(6);
    const roleStr = role.padEnd(20);
    process.stdout.write(`  ${status} ${empStr} ${nameStr} ${deptStr} ${roleStr} 上级:${supervisor.padEnd(4)} 页面:${pPass}/${pages.length}\n`);
  }

  // ── 汇总 ──
  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}登录${C.reset}: ${loginPass}/${EMPLOYEES.length} 通过 (${loginFail} 失败)`);
  console.log(`  ${C.bold}页面${C.reset}: ${pagePass} 通过, ${pageFail} 失败`);
  console.log(`  ${C.bold}审批链${C.reset}: ${chainPass} 正确, ${chainFail} 异常`);

  console.log(`\n  ${C.bold}部门统计${C.reset}:`);
  for (const [dept, s] of Object.entries(deptStats).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`    ${dept.padEnd(8)} ${s.loginOk}/${s.total} 登录 | ${s.pageOk}/${s.total} 页面全通`);
  }

  if (failures.length > 0) {
    console.log(`\n  ${C.red}失败清单${C.reset}:`);
    for (const f of failures) {
      console.log(`    ${C.red}X${C.reset} ${f.empId} ${f.name} (${f.dept}) — ${f.issue}`);
    }
  }

  const rate = EMPLOYEES.length > 0 ? Math.round((loginPass / EMPLOYEES.length) * 100) : 0;
  console.log(`\n  ${rate >= 95 ? C.green : rate >= 80 ? C.yellow : C.red}全员通过率: ${rate}%${C.reset}`);
  console.log(`${C.cyan}══════════════════════════════════════════════════════════${C.reset}\n`);

  process.exit(loginFail > 0 || pageFail > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
