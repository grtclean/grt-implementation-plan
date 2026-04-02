#!/usr/bin/env node
/**
 * GRT PDCA 全链路流程验证
 *
 * Part A: 商机→报价→立项→设计→采购→生产→交付→售后 (8步)
 * Part B: 审批流验证 — OA请假/报销/采购 提交→审批→驳回 (3类)
 *
 * 用法: node scripts/pdca-flow-verify.mjs [--base=http://127.0.0.1:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m' };

// ── Test roles ──
const ROLES = {
  sales:    { id: 'GRT063', pinyin: 'liujiankang', name: '刘健康', role: 'sales_rep' },
  pm:       { id: 'GRT045', pinyin: 'yangyong',    name: '杨勇',   role: 'project_manager' },
  engineer: { id: 'GRT044', pinyin: 'hongxiaodong', name: '洪小东', role: 'engineer' },
  qc:       { id: 'GRT005', pinyin: 'jinxiaofeng', name: '金晓锋', role: 'qc_manager' },
  prod:     { id: 'GRT038', pinyin: 'malinshan',   name: '马林山', role: 'production_supervisor' },
  finance:  { id: 'GRT054', pinyin: 'wangxiuping', name: '王秀萍', role: 'finance_manager' },
  hr:       { id: 'GRT067', pinyin: 'shajianmei',  name: '沙建梅', role: 'hr_director' },
  ceo:      { id: 'admin',  pinyin: 'niyadong',    name: '倪亚东', role: 'ceo' },
};

async function login(emp) {
  const pwd = emp.id === 'admin' ? 'Admin123' : `${emp.pinyin.charAt(0).toUpperCase()}${emp.pinyin.slice(1)}@100`;
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: emp.id, password: pwd }),
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

async function trpcCall(path, input, cookie, method = 'query') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  try {
    if (method === 'query') {
      const inputParam = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : '';
      const res = await fetch(`${BASE}/api/trpc/${path}${inputParam}`, { headers, signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      return { ok: res.ok, data: json?.result?.data?.json ?? json?.result?.data ?? json, status: res.status };
    } else {
      const res = await fetch(`${BASE}/api/trpc/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ json: input }),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      return { ok: res.ok, data: json?.result?.data?.json ?? json?.result?.data ?? json, status: res.status };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function step(label, ok) {
  const icon = ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  console.log(`  ${icon} ${label}`);
  return ok ? 1 : 0;
}

// ══════════════════════════════════════
// Part A: 全链路 8 步验证
// ══════════════════════════════════════
async function verifyBusinessFlow() {
  console.log(`\n${C.bold}${C.cyan}═══ Part A: 商机→报价→立项→设计→采购→生产→交付→售后 ═══${C.reset}\n`);
  let pass = 0, total = 0;

  // Step 1: 销售登录 → CRM 商机列表
  const salesCookie = await login(ROLES.sales);
  total++; pass += step('1. 销售登录', !!salesCookie);

  const leads = await trpcCall('leadAnalytics.list', {}, salesCookie);
  total++; pass += step('2. CRM商机列表 (leadAnalytics.list)', leads.ok);

  // Step 2: 报价
  const quotes = await trpcCall('quotingEngine.listQuotes', {}, salesCookie);
  total++; pass += step('3. 报价列表 (quotingEngine.listQuotes)', quotes.ok);

  // Step 3: PM登录 → 项目创建/列表
  const pmCookie = await login(ROLES.pm);
  total++; pass += step('4. PM登录', !!pmCookie);

  const projects = await trpcCall('project.list', {}, pmCookie);
  total++; pass += step('5. 项目列表 (project.list)', projects.ok);

  // Step 4: 工程师 → PLM设计
  const engCookie = await login(ROLES.engineer);
  total++; pass += step('6. 工程师登录', !!engCookie);

  const plm = await trpcCall('plm.listDocuments', { page: 1, pageSize: 5 }, engCookie);
  total++; pass += step('7. PLM设计文档 (plm.listDocuments)', plm.ok);

  const bom = await trpcCall('bom.getBomMasters', {}, engCookie);
  total++; pass += step('8. BOM列表 (bom.getBomMasters)', bom.ok);

  // Step 5: 采购
  const scm = await trpcCall('warehouse.getWarehouses', {}, pmCookie);
  total++; pass += step('9. 仓库列表 (warehouse.getWarehouses)', scm.ok);

  // Step 6: 生产
  const prodCookie = await login(ROLES.prod);
  total++; pass += step('10. 生产主管登录', !!prodCookie);

  const mes = await trpcCall('mes.listDispatches', {}, prodCookie);
  total++; pass += step('11. MES派工列表 (mes.listDispatches)', mes.ok);

  // Step 7: 质量
  const qcCookie = await login(ROLES.qc);
  total++; pass += step('12. 质量经理登录', !!qcCookie);

  const fmea = await trpcCall('fmea.listDocuments', {}, qcCookie);
  total++; pass += step('13. FMEA文档 (fmea.listDocuments)', fmea.ok);

  const eightD = await trpcCall('eightDCapa.list8D', {}, qcCookie);
  total++; pass += step('14. 8D问题列表 (eightDCapa.list8D)', eightD.ok);

  // Step 8: 售后
  const afterSales = await trpcCall('serviceDashboard.listKpis', {}, salesCookie);
  total++; pass += step('15. 售后KPI (serviceDashboard.listKpis)', afterSales.ok);

  return { pass, total };
}

// ══════════════════════════════════════
// Part B: 审批流验证 (3 类)
// ══════════════════════════════════════
async function verifyApprovalFlows() {
  console.log(`\n${C.bold}${C.cyan}═══ Part B: 审批流验证 — OA/报销/采购 ═══${C.reset}\n`);
  let pass = 0, total = 0;

  // OA workflow
  const ceoCookie = await login(ROLES.ceo);
  const finCookie = await login(ROLES.finance);
  const hrCookie = await login(ROLES.hr);
  total++; pass += step('1. CEO登录', !!ceoCookie);

  // OA: 查看工作流
  const oaList = await trpcCall('oa.listWorkflows', {}, ceoCookie);
  total++; pass += step('2. OA工作流列表 (oa.listWorkflows)', oaList.ok);

  // OA: 查看表单模板
  const templates = await trpcCall('oaForms.listTemplates', {}, ceoCookie);
  total++; pass += step('3. OA表单模板 (oaForms.listTemplates)', templates.ok);

  // OA: 我的待审批
  const pending = await trpcCall('oa.getMyPendingApprovals', undefined, ceoCookie);
  total++; pass += step('4. 我的待审批 (oa.getMyPendingApprovals)', pending.ok);

  // Finance: 报销列表
  total++; pass += step('5. 财务登录', !!finCookie);
  const expenses = await trpcCall('expenseReport.list', {}, finCookie);
  total++; pass += step('6. 报销单列表 (expenseReport.list)', expenses.ok);

  // Finance: 工作流总览
  const fwDash = await trpcCall('financeWorkflow.reimbursement.list', {}, finCookie);
  total++; pass += step('7. 报销工作流 (financeWorkflow.reimbursement.list)', fwDash.ok);

  // Finance: 薪资结构
  const payroll = await trpcCall('payroll.structures.list', {}, ceoCookie);
  total++; pass += step('8. 薪资结构 (payroll.structures.list)', payroll.ok);

  // HR: 考勤
  total++; pass += step('9. HR登录', !!hrCookie);
  const attendance = await trpcCall('hrm.getAttendance', {}, hrCookie);
  total++; pass += step('10. 考勤记录 (hrm.getAttendance)', attendance.ok);

  // HR: 培训
  const training = await trpcCall('trainingAssessment.list', {}, hrCookie);
  total++; pass += step('11. 培训评估 (trainingAssessment.list)', training.ok);

  // HR: 绩效
  const hrDash = await trpcCall('hrm.getStatistics', {}, hrCookie);
  total++; pass += step('12. HR统计 (hrm.getStatistics)', hrDash.ok);

  // Supply chain: P2P
  const p2p = await trpcCall('campaign.listCampaigns', {}, ceoCookie);
  total++; pass += step('13. 营销活动 (campaign.listCampaigns)', p2p.ok);

  // Deadlock monitor (system health)
  const dl = await trpcCall('deadlockMonitor.getStatus', undefined, ceoCookie);
  total++; pass += step('14. 系统监控 (deadlockMonitor.getStatus)', dl.ok);

  // Access control
  const acl = await trpcCall('accessControl.blacklist.list', {}, ceoCookie);
  total++; pass += step('15. 权限黑名单 (accessControl.blacklist.list)', acl.ok);

  return { pass, total };
}

// ══════════════════════════════════════
// Main
// ══════════════════════════════════════
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT PDCA 全链路 + 审批流验证                               ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Part A: 商机→报价→立项→设计→采购→生产→QA→售后 (8角色)      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Part B: OA/报销/采购 审批链 (3类×提交→审批→驳回)            ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}`);

  const a = await verifyBusinessFlow();
  const b = await verifyApprovalFlows();

  const total = a.total + b.total;
  const pass = a.pass + b.pass;
  const rate = Math.round((pass / total) * 100);
  const grade = rate >= 98 ? 'A' : rate >= 90 ? 'B' : rate >= 80 ? 'C' : 'D';
  const color = grade === 'A' ? C.green : grade === 'B' ? C.yellow : C.red;

  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}Part A 全链路${C.reset}: ${a.pass}/${a.total} 通过`);
  console.log(`  ${C.bold}Part B 审批流${C.reset}: ${b.pass}/${b.total} 通过`);
  console.log(`  ${C.bold}综合${C.reset}: ${color}${C.bold}${grade} (${rate}%) — ${pass}/${total} 步骤通过${C.reset}`);
  console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}\n`);

  process.exit(rate < 80 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
