#!/usr/bin/env node
/**
 * GRT PDCA 页面加载验证 — admin/Admin123
 *
 * 验证所有340个静态路由的页面返回200（Vite dev模式下返回HTML）
 * 用法: node scripts/pdca-page-verify.mjs [--base=http://127.0.0.1:3000]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://127.0.0.1:3000';
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m' };

// Extract routes from App.tsx
const appTsx = readFileSync(resolve(import.meta.dirname, '../client/src/App.tsx'), 'utf8');
const routes = [...new Set(
  [...appTsx.matchAll(/path="([^"]+)"/g)]
    .map(m => m[1])
    .filter(p => !p.includes(':')) // skip parameterized routes
)].sort();

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

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT 页面加载验证 — ${routes.length} 页面 × admin/Admin123           ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════╝${C.reset}\n`);

  const cookie = await login();
  if (!cookie) { console.log(`${C.red}Login failed${C.reset}`); process.exit(1); }
  console.log(`  ${C.green}✓${C.reset} 登录成功\n`);

  let pass = 0, fail = 0;
  const failures = [];
  const BATCH = 10;

  for (let i = 0; i < routes.length; i += BATCH) {
    const batch = routes.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (route) => {
      try {
        const res = await fetch(`${BASE}${route}`, {
          headers: { Cookie: cookie },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        return { route, ok: res.ok, status: res.status };
      } catch (e) {
        return { route, ok: false, status: 0, error: e.message };
      }
    }));

    for (const r of results) {
      if (r.ok) {
        pass++;
      } else {
        fail++;
        failures.push(r);
      }
    }

    // Progress every 50 pages
    if ((i + BATCH) % 50 === 0 || i + BATCH >= routes.length) {
      const done = Math.min(i + BATCH, routes.length);
      process.stdout.write(`  ${C.dim}[${done}/${routes.length}] ${pass} pass, ${fail} fail${C.reset}\r`);
    }
  }

  console.log('');
  const rate = Math.round((pass / routes.length) * 1000) / 10;
  const grade = rate >= 99.5 ? 'A+' : rate >= 98 ? 'A' : rate >= 95 ? 'B' : 'C';
  const gc = grade.startsWith('A') ? C.green : grade === 'B' ? C.yellow : C.red;

  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}页面加载验证${C.reset}`);
  console.log(`    总页面:   ${routes.length}`);
  console.log(`    通过:     ${C.green}${pass}${C.reset}`);
  console.log(`    失败:     ${fail > 0 ? C.red : C.green}${fail}${C.reset}`);
  console.log(`    通过率:   ${gc}${rate}%${C.reset}`);
  console.log(`    评级:     ${gc}${C.bold}${grade}${C.reset}`);

  if (failures.length > 0) {
    console.log(`\n  ${C.red}${C.bold}失败页面${C.reset}:`);
    for (const f of failures.slice(0, 20)) {
      console.log(`    ${C.red}${f.status}${C.reset} ${f.route}`);
    }
    if (failures.length > 20) console.log(`    ... +${failures.length - 20} more`);
  }

  console.log(`${C.cyan}═══════════════════════════════════════════════════════════${C.reset}\n`);
  process.exit(fail > routes.length * 0.05 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
