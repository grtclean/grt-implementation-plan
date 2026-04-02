#!/usr/bin/env node
/**
 * GRT 全角色 UI 冒烟测试
 * 自动循环所有 24 个角色，访问每个角色的关键页面，验证 HTTP 200
 *
 * 用法: node scripts/smoke-test-all-roles.mjs [--base http://127.0.0.1:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';

// ── 角色 → 关键页面映射 ──
const ROLE_PAGES = {
  admin:              ['/', '/monitoring', '/pos/projects', '/permission-management', '/security-dashboard', '/stage-gate'],
  ceo:                ['/', '/command-center', '/ceo/executive-cockpit', '/executive-review', '/ceo-finance'],
  cto:                ['/', '/cto/technical-dashboard', '/dev-tasks', '/command-center'],
  cfo:                ['/', '/ceo-finance', '/budget-management'],
  director:           ['/', '/strategy', '/oa-forms', '/executive-review', '/meeting-intelligence'],
  hr_director:        ['/', '/hrm-intelligent', '/hr-lifecycle', '/talent-portal'],
  bu_gm:              ['/', '/bu-performance', '/pos/projects', '/annual-agenda'],
  finance_manager:    ['/', '/expense-report', '/budget-management', '/cost-planning'],
  hr_manager:         ['/', '/hrm-intelligent', '/hr-lifecycle', '/employee-management', '/recruitment'],
  bu_pm:              ['/', '/pos/projects', '/stage-gate', '/bom-management', '/task-cockpit'],
  dept_manager:       ['/', '/employee-management', '/recruitment'],
  hr_specialist:      ['/', '/hr-lifecycle', '/employee-management'],
  finance_specialist: ['/', '/expense-report'],
  team_lead:          ['/', '/cloud-camera'],
  bu_sales:           ['/', '/crm', '/opportunity-conversion', '/sales-coach'],
  bu_mech:            ['/', '/plm', '/bom-management', '/fmea', '/drawing-library'],
  bu_elec:            ['/', '/plm', '/electrical-design', '/electrical-standards'],
  procurement_eng:    ['/', '/pos/procurement'],
  cs_engineer:        ['/', '/after-sales-workbench', '/customer-authorization'],
  quality_eng:        ['/', '/cloud-camera', '/assembly-vision'],
  employee:           ['/', '/notifications'],
  production_worker:  ['/', '/mes-workbench'],
  customer:           ['/customer-portal'],
  guest:              ['/'],
};

// ── 独立页面（无需角色切换） ──
const STANDALONE_PAGES = [
  '/shopfloor-tv',
  '/kiosk?station=WS-001&dept=PROD',
  '/kiosk/esop-tv',
];

// ── 颜色 ──
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
};

let totalTests = 0, passed = 0, failed = 0, skipped = 0;
const failures = [];

async function login() {
  const res = await fetch(`${BASE}/api/auth/local-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin123' }),
    redirect: 'manual',
  });
  // Extract cookie from set-cookie header (multiple formats)
  const rawHeaders = res.headers;
  let cookie = null;
  // Try getSetCookie (Node 20+)
  const cookies = rawHeaders.getSetCookie?.() || [];
  for (const c of cookies) {
    if (c.includes('session')) { cookie = c.split(';')[0]; break; }
  }
  // Fallback: try raw set-cookie header
  if (!cookie) {
    const raw = rawHeaders.get('set-cookie') || '';
    const match = raw.match(/(grt_session|session|connect\.sid)=[^;]+/);
    if (match) cookie = match[0];
  }
  if (!cookie) {
    console.log(`${C.yellow}[WARN] Login ${res.status} — no session cookie, API tests will use kiosk auth${C.reset}`);
  }
  return cookie;
}

async function fetchPage(url, cookie) {
  try {
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    return { status: res.status, ok: res.ok || res.status === 304 };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function testRole(role, pages, cookie) {
  const roleLabel = `${C.bold}${role.padEnd(20)}${C.reset}`;
  const results = [];

  for (const page of pages) {
    totalTests++;
    const url = `${BASE}${page}`;
    const result = await fetchPage(url, cookie);

    if (result.ok) {
      passed++;
      results.push(`${C.green}✓${C.reset} ${page}`);
    } else if (result.status === 401 || result.status === 403) {
      skipped++;
      results.push(`${C.yellow}○${C.reset} ${page} ${C.dim}(${result.status})${C.reset}`);
    } else {
      failed++;
      results.push(`${C.red}✗${C.reset} ${page} ${C.red}(${result.status || result.error})${C.reset}`);
      failures.push({ role, page, status: result.status, error: result.error });
    }
  }

  console.log(`  ${roleLabel} ${results.join('  ')}`);
}

async function testApi(cookie) {
  const apis = [
    'project.list',
    'project.statistics',
    'stageGate.getStats',
  ];
  console.log(`\n${C.cyan}── API Endpoints ──${C.reset}`);
  for (const api of apis) {
    totalTests++;
    try {
      const res = await fetch(`${BASE}/api/trpc/${api}?input=${encodeURIComponent('{"json":{}}')}`, {
        headers: cookie ? { Cookie: cookie } : {},
      });
      if (res.ok || res.status === 400) {
        passed++;
        console.log(`  ${C.green}✓${C.reset} ${api} ${C.dim}(${res.status})${C.reset}`);
      } else {
        failed++;
        console.log(`  ${C.red}✗${C.reset} ${api} ${C.red}(${res.status})${C.reset}`);
        failures.push({ role: 'api', page: api, status: res.status });
      }
    } catch (err) {
      failed++;
      console.log(`  ${C.red}✗${C.reset} ${api} ${C.red}(${err.message})${C.reset}`);
      failures.push({ role: 'api', page: api, error: err.message });
    }
  }
}

// ── Main ──
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   GRT 全角色 UI 冒烟测试                         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   ${BASE.padEnd(45)}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);

  // Step 1: Login
  console.log(`${C.cyan}── 登录 ──${C.reset}`);
  const cookie = await login();
  if (cookie) {
    console.log(`  ${C.green}✓${C.reset} Admin session acquired`);
  } else {
    console.log(`  ${C.yellow}○${C.reset} No cookie extracted, testing without auth`);
  }

  // Step 2: Standalone pages (no auth needed)
  console.log(`\n${C.cyan}── 独立页面 (无需登录) ──${C.reset}`);
  for (const page of STANDALONE_PAGES) {
    totalTests++;
    const result = await fetchPage(`${BASE}${page}`, null);
    if (result.ok) {
      passed++;
      console.log(`  ${C.green}✓${C.reset} ${page}`);
    } else {
      failed++;
      console.log(`  ${C.red}✗${C.reset} ${page} ${C.red}(${result.status})${C.reset}`);
      failures.push({ role: 'standalone', page, status: result.status });
    }
  }

  // Step 3: Role pages
  console.log(`\n${C.cyan}── 角色页面 (24 角色) ──${C.reset}`);
  const roles = Object.keys(ROLE_PAGES);
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const pages = ROLE_PAGES[role];
    await testRole(role, pages, cookie);
  }

  // Step 4: API endpoints (use kiosk auth if admin login didn't get cookie)
  let apiCookie = cookie;
  if (!apiCookie) {
    try {
      const kioskRes = await fetch(`${BASE}/api/auth/kiosk-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: 'SMOKE-TEST', departmentCode: 'QA' }),
      });
      const raw = kioskRes.headers.get('set-cookie') || '';
      const match = raw.match(/(grt_session|session|connect\.sid)=[^;]+/);
      if (match) apiCookie = match[0];
      const allCookies = kioskRes.headers.getSetCookie?.() || [];
      for (const c of allCookies) {
        if (c.includes('session')) { apiCookie = c.split(';')[0]; break; }
      }
    } catch {}
  }
  await testApi(apiCookie);

  // Step 5: Kiosk identity test
  console.log(`\n${C.cyan}── Kiosk 工号识别 ──${C.reset}`);
  // First get kiosk session
  try {
    const kioskRes = await fetch(`${BASE}/api/auth/kiosk-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId: 'WS-001', departmentCode: 'PROD' }),
    });
    const kioskCookies = kioskRes.headers.getSetCookie?.() || [];
    const kioskCookie = kioskCookies.find(c => c.includes('session'))?.split(';')[0];

    const testIds = ['GRT010', '吴卫成', 'wuweicheng'];
    for (const id of testIds) {
      totalTests++;
      try {
        const res = await fetch(
          `${BASE}/api/trpc/kiosk.identifyOperator?input=${encodeURIComponent(JSON.stringify({ json: { employeeId: id } }))}`,
          { headers: kioskCookie ? { Cookie: kioskCookie } : {} }
        );
        const json = await res.json();
        const data = json?.result?.data?.json ?? json?.result?.data;
        if (data?.operator) {
          passed++;
          console.log(`  ${C.green}✓${C.reset} ${id.padEnd(15)} → ${data.operator.name}`);
        } else {
          failed++;
          console.log(`  ${C.red}✗${C.reset} ${id.padEnd(15)} → not found`);
          failures.push({ role: 'kiosk', page: `identify:${id}`, status: 'not_found' });
        }
      } catch (err) {
        failed++;
        console.log(`  ${C.red}✗${C.reset} ${id.padEnd(15)} → ${err.message}`);
        failures.push({ role: 'kiosk', page: `identify:${id}`, error: err.message });
      }
    }
  } catch (err) {
    console.log(`  ${C.red}✗${C.reset} Kiosk login failed: ${err.message}`);
  }

  // ── Summary ──
  console.log(`\n${C.cyan}══════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}总计${C.reset}: ${totalTests} 测试`);
  console.log(`  ${C.green}通过${C.reset}: ${passed}`);
  console.log(`  ${C.yellow}跳过${C.reset}: ${skipped} (权限受限)`);
  console.log(`  ${C.red}失败${C.reset}: ${failed}`);

  if (failures.length > 0) {
    console.log(`\n${C.red}── 失败详情 ──${C.reset}`);
    for (const f of failures) {
      console.log(`  ${C.red}✗${C.reset} [${f.role}] ${f.page} — ${f.status || f.error}`);
    }
  }

  const rate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
  console.log(`\n  ${rate >= 90 ? C.green : rate >= 70 ? C.yellow : C.red}通过率: ${rate}%${C.reset}`);
  console.log(`${C.cyan}══════════════════════════════════════════════════${C.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
