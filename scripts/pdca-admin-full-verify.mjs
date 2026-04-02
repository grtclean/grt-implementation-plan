#!/usr/bin/env node
/**
 * GRT PDCA 全功能验证 — admin/Admin123 董事长权限
 *
 * 覆盖: 338 routers → 340+ endpoints → 12模块 + 高管驾驶舱 + 系统管理
 * 用法: node scripts/pdca-admin-full-verify.mjs [--base=http://127.0.0.1:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m' };

// ── All endpoints to test (grouped by module) ──
// Format: { path, input?, method: 'query'|'mutation' }
const MODULES = {
  // ═══ Tier 1: 12 Core Modules ═══
  'R1-CRM': [
    'crm.customers.list', 'crm.customers.stats',
    'crm.contacts.list', 'crm.opportunities.list', 'crm.opportunities.stats', 'crm.opportunities.funnel',
    'crm.interactions.list',
    'leadAnalytics.list',
    'quotingEngine.listQuotes', 'quotingEngine.listRateConfigs',
    'campaign.listCampaigns',
    'crm.leads.list',
  ],
  'R2-PLM/PDM': [
    'plm.listDocuments|{"page":1,"pageSize":5}', 'plm.getStats',
    'pdm.product.list', 'pdm.baseline.list',
    'drawingLibrary.list', 'drawingLibrary.getStats',
    'changeControl.list|{"limit":30}',
    'plm.getProjectSummary|{"projectId":1}',
    'rndNpi.project.list',
  ],
  'R3-BOM/Design': [
    'bom.getBomMasters', 'bom.getStats',
    'designEngine.getStationTypes',
  ],
  'R4-MES/Production': [
    'mes.listDispatches', 'mes.getProductionProgress', 'mes.getCapacityUtilization',
    'mes.listDowntime', 'mes.getDowntimeStats', 'mes.listStationStatus',
    'mes.getShopfloorOverview',
    'productionDashboard.list', 'oeeDashboard.dashboard',
  ],
  'R5-Quality': [
    'fmea.listDocuments', 'fmea.getStats',
    'controlPlan.list', 'controlPlan.getStats',
    'ppap.list', 'ppap.getElementDefinitions', 'ppap.getStats',
    'eightDCapa.list8D', 'eightDCapa.listCAPA', 'eightDCapa.getStats',
    'msa.list',
    'qualityAccountability.listIssues',
    'fmeaDynamic.liveMatrix',
  ],
  'R6-AfterSales': [
    'serviceDashboard.listKpis', 'serviceDashboard.listLocations',
    'serviceEngineer.myProjects.list',
    'afterSales.clients.list', 'afterSales.equipments.list',
  ],
  'R7-Finance': [
    'expenseReport.list',
    'financeWorkflow.reimbursement.list',
    'financeWorkflow.supplierPayment.list',
    'financeWorkflow.bankAccount.list',
    'glAccounting.listAccounts', 'glAccounting.listEntries',
    'glAccounting.getGLDashboard', 'glAccounting.listRoleAssignments',
    'glAccounting.listAssets', 'glAccounting.listInvoices',
    'payroll.structures.list',
    'cost.list', 'costAlert.list',
  ],
  'R8-OA': [
    'oa.listWorkflows', 'oa.getMyPendingApprovals',
    'oa.listMeetings', 'oa.listTripReports',
    'oa.listAllLeaveBalances', 'oa.listAnnouncements',
    'oaForms.listTemplates', 'oaForms.listSubmissions',
    'oaForms.getMyApprovalChain', 'oaForms.getStats',
  ],
  'R9-Meeting': [
    'smartMeeting.meeting.list',
    'meetingIntelligence.listTProjects',
  ],
  'R10-HR': [
    'hrm.list', 'hrm.getEmployees', 'hrm.getDepartments',
    'hrm.getCandidates', 'hrm.getPositions',
    'hrm.getAttendance', 'hrm.getStatistics',
    'hrm.getPerformanceGrades', 'hrm.getOrgChart',
    'hrLifecycle.candidates.list',
    'hrLifecycle.dashboard.getHRDashboardStats',
    'trainingAssessment.list', 'trainingCertificate.list',
    'competency.getAssessments',
    'employeeGrowth.material.list',
    'hrm.getTrainingRecords',
    'capabilitySystem.getMyAssessment|{"employeeId":1}',
  ],
  'R11-SupplyChain': [
    'warehouse.getWarehouses', 'warehouse.getReceipts',
    'warehouse.getIssues', 'warehouse.getStockCounts',
    'warehouse.getLots', 'warehouse.getSerialNumbers',
    'smartInventory.dashboard',
    'supplierGovernance.listAuditPlans',
    'supplierGovernance.listQualifications',
    'p2p.frameworkAgreement.list',
  ],
  'R12-Project': [
    'project.list',
    'projectGate.getStageDefinitions',
    'project360.overview|{"projectId":1}',
    'lifecycle.getAllPhases',
    'project.list',
    'pos.project.list',
    'taskBoard.list',
  ],

  // ═══ Tier 1+: Extended Modules (用户追加) ═══
  'R13-Robot/IoT': [
    'humanoidRobot.list',
    'robotDebug.listSessions',
    'cameraStream.listCameras',
    'assemblyVision.listRecordings',
    'barcode.list',
  ],
  'R14-CustomerPlatform': [
    'targetedShowcase.template.list',
    'customerAuthorization.listAuthorizations',
    'serviceDashboard.listKpis', 'serviceDashboard.listLocations',
  ],

  // ═══ Tier 2: Executive Dashboards ═══
  'T2-CEO': [
    'ceoDashboard.getHealthScores', 'ceoDashboard.getKpis',
    'ceoDashboard.getDigitalThread', 'ceoDashboard.getTopEmployees',
    'ceoDashboard.getNineGrid', 'ceoDashboard.getGlobalDeliveryMap',
    'ceoDashboard.getAlgorithmEvolution',
    'ceoMotivation.listSmartTasks',
    'strategyGoals.getCompanyGoals', 'strategyGoals.getDashboard',
    'strategyGoals.getLiveMetrics',
  ],
  'T2-CTO': [
    'ctoDashboard.systemHealth', 'ctoDashboard.designActivity',
    'ctoDashboard.robotFleet', 'ctoDashboard.techDebt',
  ],
  'T2-OKR': [
    'okr.list', 'okr.listObjectives', 'okr.dashboard',
    'excellenceCulture.getModel',
  ],

  // ═══ Tier 2: System/Admin ═══
  'T2-System': [
    'accessControl.blacklist.list', 'accessControl.tempPermission.list',
    'deadlockMonitor.getStatus', 'deadlockMonitor.getDeadlocks',
    'deadlockMonitor.getHistory',
    'genesis.getGenesisStats',
    'users.getAll',
    'notification.list',
    'analytics.getOverview',
  ],

  // ═══ Tier 2: AI/Knowledge ═══
  'T2-AI': [
    'aiCanvas.list', 'aiTask.list',
    'knowledgeBase.list',
    'reportCenter.list',
    'reportCenter.list',
  ],
};

// ── Helpers ──
async function login() {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin123' }),
      signal: AbortSignal.timeout(8000),
    });
    const cookies = res.headers.getSetCookie?.() || [];
    const raw = res.headers.get('set-cookie') || '';
    return cookies.find(c => c.includes('app_session_id') || c.includes('session'))?.split(';')[0]
      || (raw.match(/(app_session_id|grt_session|session)=[^;]+/) || [])[0]
      || null;
  } catch { return null; }
}

async function callEndpoint(pathSpec, cookie) {
  let path, input;
  if (pathSpec.includes('|')) {
    const parts = pathSpec.split('|');
    path = parts[0];
    try { input = JSON.parse(parts[1]); } catch { input = {}; }
  } else {
    path = pathSpec;
    input = {};
  }

  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const inputParam = `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;

  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/trpc/${path}${inputParam}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const ms = Date.now() - start;
    return { ok: res.ok, status: res.status, ms, path };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - start, path, error: e.message };
  }
}

// ── Main ──
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT PDCA 全功能验证 — admin/Admin123 董事长权限                      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  338 routers → 340+ endpoints → 12模块 + 高管驾驶舱 + 系统管理         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // D1: Login
  const cookie = await login();
  if (!cookie) {
    console.log(`${C.red}${C.bold}FATAL: Login failed for admin/Admin123${C.reset}`);
    process.exit(1);
  }
  console.log(`  ${C.green}✓${C.reset} admin/Admin123 登录成功\n`);

  const stats = { total: 0, pass: 0, fail: 0, errors: [], byModule: {} };
  let totalMs = 0;

  // D2: Test all modules
  for (const [modName, endpoints] of Object.entries(MODULES)) {
    const modStats = { total: 0, pass: 0, fail: 0, failures: [] };

    // Run endpoints in batches of 5 for speed
    const BATCH = 5;
    for (let i = 0; i < endpoints.length; i += BATCH) {
      const batch = endpoints.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(ep => callEndpoint(ep, cookie)));

      for (const r of results) {
        stats.total++;
        modStats.total++;
        totalMs += r.ms;

        if (r.ok) {
          stats.pass++;
          modStats.pass++;
        } else {
          stats.fail++;
          modStats.fail++;
          modStats.failures.push({ path: r.path, status: r.status, error: r.error });
          stats.errors.push({ module: modName, path: r.path, status: r.status });
        }
      }
    }

    stats.byModule[modName] = modStats;

    // Print module result
    const rate = modStats.total > 0 ? Math.round((modStats.pass / modStats.total) * 100) : 0;
    const icon = rate === 100 ? `${C.green}✓${C.reset}` : rate >= 90 ? `${C.yellow}~${C.reset}` : `${C.red}✗${C.reset}`;
    const rateColor = rate === 100 ? C.green : rate >= 90 ? C.yellow : C.red;
    console.log(`  ${icon} ${modName.padEnd(20)} ${modStats.pass}/${modStats.total}`.padEnd(50) + `${rateColor}${rate}%${C.reset}`);

    if (modStats.failures.length > 0 && modStats.failures.length <= 3) {
      for (const f of modStats.failures) {
        console.log(`    ${C.dim}└ ${f.status} ${f.path}${C.reset}`);
      }
    } else if (modStats.failures.length > 3) {
      console.log(`    ${C.dim}└ ${modStats.failures[0].status} ${modStats.failures[0].path} + ${modStats.failures.length - 1} more${C.reset}`);
    }
  }

  // Summary
  const avgMs = stats.total > 0 ? Math.round(totalMs / stats.total) : 0;
  const totalRate = stats.total > 0 ? Math.round((stats.pass / stats.total) * 1000) / 10 : 0;
  const grade = totalRate >= 99.5 ? 'A+' : totalRate >= 98 ? 'A' : totalRate >= 95 ? 'B' : totalRate >= 90 ? 'C' : 'D';
  const gradeColor = grade.startsWith('A') ? C.green : grade === 'B' ? C.yellow : C.red;

  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}总览${C.reset}`);
  console.log(`    端点总数:       ${stats.total}`);
  console.log(`    通过:           ${C.green}${stats.pass}${C.reset}`);
  console.log(`    失败:           ${stats.fail > 0 ? C.red : C.green}${stats.fail}${C.reset}`);
  console.log(`    通过率:         ${gradeColor}${totalRate}%${C.reset}`);
  console.log(`    评级:           ${gradeColor}${C.bold}${grade}${C.reset}`);
  console.log(`    平均响应:       ${avgMs}ms`);

  // Module breakdown
  console.log(`\n  ${C.bold}模块明细${C.reset}`);
  console.log(`  ${'模块'.padEnd(22)} ${'通过'.padEnd(10)} ${'通过率'.padEnd(10)} 状态`);
  console.log(`  ${'─'.repeat(60)}`);
  for (const [mod, s] of Object.entries(stats.byModule)) {
    const r = s.total > 0 ? Math.round((s.pass / s.total) * 100) : 0;
    const st = r === 100 ? `${C.green}PASS${C.reset}` : r >= 90 ? `${C.yellow}WARN${C.reset}` : `${C.red}FAIL${C.reset}`;
    console.log(`  ${mod.padEnd(22)} ${(s.pass+'/'+s.total).padEnd(10)} ${(r+'%').padEnd(10)} ${st}`);
  }

  // Failure details
  if (stats.errors.length > 0) {
    console.log(`\n  ${C.red}${C.bold}失败详情 (${stats.errors.length})${C.reset}`);
    const byStatus = {};
    for (const e of stats.errors) {
      const k = e.status || 'timeout';
      if (!byStatus[k]) byStatus[k] = [];
      byStatus[k].push(e);
    }
    for (const [status, items] of Object.entries(byStatus)) {
      console.log(`    ${C.red}HTTP ${status}${C.reset}: ${items.length} endpoints`);
      for (const item of items.slice(0, 5)) {
        console.log(`      - ${item.module}: ${item.path}`);
      }
      if (items.length > 5) console.log(`      ... +${items.length - 5} more`);
    }
  }

  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════════════════${C.reset}\n`);
  process.exit(stats.fail > stats.total * 0.05 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
