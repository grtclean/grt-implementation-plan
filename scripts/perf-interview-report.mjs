#!/usr/bin/env node
/**
 * GRT 绩效面谈数据报告 — 按权限分层展示
 *
 * Layer 1: HRBP/事业部经理/部门经理 → 历史KPI + 奖惩 + 简历 + 承诺
 * Layer 2: 倪微薇(人事总监) → Layer1 + 薪酬变化 + 往年年薪 + 同年月薪
 * Layer 3: 倪亚东(CEO) → Layer2 + 可输入新信息 + 员工承诺
 *
 * 用法: node scripts/perf-interview-report.mjs [--viewer=倪亚东]
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const viewer = process.argv.find(a => a.startsWith('--viewer='))?.split('=')[1] || '倪亚东';
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m', magenta: '\x1b[35m' };

async function main() {
  const PG = pg.default || pg;
  const client = new PG.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check viewer permissions
  const { rows: perms } = await client.query(`SELECT * FROM interview_view_permissions WHERE viewer_name = $1`, [viewer]);
  const perm = perms[0];
  if (!perm) { console.log(`${C.red}${viewer} 无绩效面谈查看权限${C.reset}`); await client.end(); return; }

  const canSeeSalary = perm.can_see_salary;
  const canSeeSalaryHistory = perm.can_see_salary_history;
  const canInput = perm.can_input_commitment;

  console.log(`\n${C.bold}${C.magenta}╔═══════════════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  绩效面谈数据报告 — 查看者: ${viewer.padEnd(8)} 权限: ${perm.can_see}                                  ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  历史KPI ✓ | 奖惩 ✓ | 简历 ✓ | 薪酬 ${canSeeSalary ? '✓' : '✗'} | 薪酬历史 ${canSeeSalaryHistory ? '✓' : '✗'} | 输入 ${canInput ? '✓' : '✗'}              ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚═══════════════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // Get employee profiles
  const { rows: profiles } = await client.query(`SELECT * FROM employee_perf_profile ORDER BY department, employee_name`);

  // Get salary history (if permitted)
  let salaryMap = {};
  if (canSeeSalaryHistory) {
    const { rows: salaryHist } = await client.query(`SELECT * FROM salary_history_view ORDER BY employee_id, period`);
    for (const s of salaryHist) {
      if (!salaryMap[s.employee_name]) salaryMap[s.employee_name] = [];
      salaryMap[s.employee_name].push(s);
    }
  }

  // Get current salary (if permitted)
  let currentSalary = {};
  if (canSeeSalary) {
    const { rows: curr } = await client.query(`SELECT * FROM salary_monthly_records WHERE period = '2026-02'`);
    for (const c of curr) currentSalary[c.employee_name] = c;
  }

  let deptCurrent = '';
  let idx = 0;

  for (const p of profiles) {
    // Department header
    if (p.department !== deptCurrent) {
      deptCurrent = p.department;
      console.log(`\n${C.cyan}${C.bold}━━━ ${deptCurrent} ━━━${C.reset}`);
    }

    idx++;
    const awards = (() => { try { return JSON.parse(p.awards_json || '[]'); } catch { return []; } })();
    const penalties = (() => { try { return JSON.parse(p.penalties_json || '[]'); } catch { return []; } })();

    // ── Layer 1: 基本信息 + KPI + 奖惩 (所有管理者可见) ──
    console.log(`\n${C.bold}${String(idx).padStart(3)}. ${p.employee_name}${C.reset} ${C.dim}${p.position || ''} | ${p.department}${C.reset}`);

    // KPI历史
    const kpi24 = Number(p.kpi_2024_avg) || 0;
    const kpi25 = Number(p.kpi_2025_avg) || 0;
    const kpi26 = Number(p.kpi_2026_avg) || 0;
    const kpiColor = (v) => v >= 85 ? C.green : v >= 70 ? C.yellow : v > 0 ? C.red : C.dim;
    console.log(`    ${C.bold}KPI历史${C.reset}: 2024=${kpiColor(kpi24)}${kpi24 || '-'}(${p.grade_2024 || '-'})${C.reset} → 2025=${kpiColor(kpi25)}${kpi25 || '-'}(${p.grade_2025 || '-'})${C.reset} → 2026=${kpiColor(kpi26)}${kpi26 || '-'}${C.reset}`);

    // 奖惩
    if (awards.length > 0) {
      console.log(`    ${C.green}奖励${C.reset}: ${awards.map(a => `${a.date} ${a.type}(${a.desc})`).join('; ')}`);
    }
    if (penalties.length > 0) {
      console.log(`    ${C.red}惩罚${C.reset}: ${penalties.map(a => `${a.date} ${a.type}(${a.desc})`).join('; ')}`);
    }

    // 承诺
    if (p.commitment_2026) {
      console.log(`    ${C.dim}承诺: ${p.commitment_2026.slice(0, 60)}${p.commitment_2026.length > 60 ? '...' : ''}${C.reset}`);
    }

    // ── Layer 2: 薪酬信息 (仅倪微薇/倪亚东可见) ──
    if (canSeeSalary) {
      const sal = currentSalary[p.employee_name];
      if (sal) {
        const gross = Number(sal.gross_pay) || 0;
        const net = Number(sal.net_pay) || 0;
        const base = Number(sal.base_salary) || 0;
        const pos = Number(sal.position_wage) || 0;
        const skill = Number(sal.skill_subsidy) || 0;
        const perfAdj = Number(sal.perf_wage_adjust) || 0;
        const perfScore = Number(sal.perf_score) || 0;
        console.log(`    ${C.magenta}${C.bold}[薪酬]${C.reset} 应发¥${gross.toLocaleString()} 实发¥${net.toLocaleString()} | 基本${base} 岗位${pos} 技能${skill} 绩效调${perfAdj} | 绩效分${perfScore ? perfScore.toFixed(1) : '-'}`);
      }
    }

    // ── Layer 2+: 薪酬历史 (仅倪微薇/倪亚东可见) ──
    if (canSeeSalaryHistory && salaryMap[p.employee_name]?.length > 0) {
      const hist = salaryMap[p.employee_name];
      const histStr = hist.map(h => `${h.period}:¥${Number(h.net_pay).toLocaleString()}`).join(' → ');
      console.log(`    ${C.magenta}[薪酬历史]${C.reset} ${histStr}`);

      // 薪酬变化趋势
      if (hist.length >= 2) {
        const first = Number(hist[0].net_pay);
        const last = Number(hist[hist.length - 1].net_pay);
        const diff = last - first;
        const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : '0';
        const trendIcon = diff > 0 ? `${C.green}↑` : diff < 0 ? `${C.red}↓` : '→';
        console.log(`    ${C.magenta}[薪酬变化]${C.reset} ${trendIcon}${Math.abs(diff).toLocaleString()} (${pct}%)${C.reset}`);
      }
    }
  }

  // Summary
  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}报告汇总${C.reset}`);
  console.log(`    员工总数:       ${profiles.length}人`);
  console.log(`    有KPI记录:      ${profiles.filter(p => Number(p.kpi_2024_avg) > 0 || Number(p.kpi_2025_avg) > 0).length}人`);
  console.log(`    有奖励记录:     ${profiles.filter(p => (() => { try { return JSON.parse(p.awards_json || '[]'); } catch { return []; } })().length > 0).length}人`);
  console.log(`    有惩罚记录:     ${profiles.filter(p => (() => { try { return JSON.parse(p.penalties_json || '[]'); } catch { return []; } })().length > 0).length}人`);
  if (canSeeSalary) {
    console.log(`    有薪酬数据:     ${Object.keys(currentSalary).length}人`);
  }
  if (canSeeSalaryHistory) {
    console.log(`    有薪酬历史:     ${Object.keys(salaryMap).length}人`);
  }

  console.log(`\n  ${C.bold}查看者权限${C.reset}`);
  console.log(`    ${viewer}: ${perm.viewer_role} | 范围:${perm.can_see} | 薪酬:${canSeeSalary?'是':'否'} | 历史:${canSeeSalaryHistory?'是':'否'} | 输入:${canInput?'是':'否'}`);
  console.log(`${C.cyan}═══════════════════════════════════════════════════════════════════${C.reset}\n`);

  await client.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
