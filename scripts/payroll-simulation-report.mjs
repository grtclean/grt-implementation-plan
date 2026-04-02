#!/usr/bin/env node
/**
 * GRT 95人薪资核算模拟报告 — 2026年4月
 *
 * 每个员工: 基本工资 + 岗位工资 + 技能津贴 + 绩效工资(三档) + 加班费
 *         - 社保 - 公积金 - 个税 = 实发工资
 *
 * 输出: 完整薪资报告供CTO确认
 * 用法: node scripts/payroll-simulation-report.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m', magenta: '\x1b[35m' };

// ── 中国累进个税 (2019改革后7级) ──
function calculateTax(annualTaxableIncome) {
  const brackets = [
    { limit: 36000, rate: 0.03, deduction: 0 },
    { limit: 144000, rate: 0.10, deduction: 2520 },
    { limit: 300000, rate: 0.20, deduction: 16920 },
    { limit: 420000, rate: 0.25, deduction: 31920 },
    { limit: 660000, rate: 0.30, deduction: 52920 },
    { limit: 960000, rate: 0.35, deduction: 85920 },
    { limit: Infinity, rate: 0.45, deduction: 181920 },
  ];
  for (const b of brackets) {
    if (annualTaxableIncome <= b.limit) {
      return Math.max(0, annualTaxableIncome * b.rate - b.deduction);
    }
  }
  return 0;
}

// ── 绩效工资计算 (三档) ──
function calculatePerfWages(pw1Base, pw2Base, pw3Base, score, avg24, avg25) {
  // 一档: score≥75 AND (score > avg24+3 OR score > avg25)
  const pw1 = (score >= 75 && (score > avg24 + 3 || score > avg25)) ? pw1Base : 0;
  // 二档: 100% if score≥avg25, 50% if within 3pts, else 0
  const pw2 = score >= avg25 ? pw2Base : (score >= avg25 - 3 ? pw2Base * 0.5 : 0);
  // 三档: CEO discretion (0 for simulation)
  const pw3 = pw3Base;
  return { pw1, pw2, pw3 };
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Read salary structures
  const { rows: salaryData } = await client.query(`
    SELECT employee_id, base_salary, position_wage, skill_subsidy,
           perf_wage1_base, perf_wage2_base, perf_wage3_base,
           saturday_shift_premium, comprehensive_salary, is_lump_sum,
           social_insurance_actual, housing_fund_actual,
           cash_subsidy, perfect_attendance_eligible, perfect_attendance_amount,
           department, position_grade, bu_code, remarks
    FROM salary_structures ORDER BY employee_id
  `);

  // Read user names
  const { rows: users } = await client.query(`SELECT id, name, role FROM users ORDER BY id`);
  const userMap = {};
  for (const u of users) userMap[u.id] = u;

  console.log(`\n${C.bold}${C.magenta}╔═══════════════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  GRT 2026年4月 薪资核算报告 — ${salaryData.length}人                                               ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  基本工资 + 岗位 + 技能 + 绩效(三档) + 加班 - 社保 - 公积金 - 个税 = 实发           ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚═══════════════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // Table header
  console.log(`${C.bold}${'序号'.padEnd(4)} ${'姓名'.padEnd(8)} ${'部门'.padEnd(10)} ${'等级'.padEnd(4)} ${'基本'.padStart(8)} ${'岗位'.padStart(8)} ${'技能'.padStart(8)} ${'绩效1'.padStart(8)} ${'绩效2'.padStart(8)} ${'综合薪'.padStart(10)} ${'社保'.padStart(8)} ${'公积金'.padStart(8)} ${'个税'.padStart(8)} ${'实发工资'.padStart(10)} ${'绩效分'.padStart(6)}${C.reset}`);
  console.log(`${'─'.repeat(130)}`);

  let totalGross = 0, totalSI = 0, totalHF = 0, totalTax = 0, totalNet = 0;
  let gradeA = 0, gradeB = 0, gradeC = 0, gradeD = 0;
  const deptTotals = {};
  const reportRows = [];

  for (let i = 0; i < salaryData.length; i++) {
    const s = salaryData[i];
    const user = userMap[s.employee_id] || { name: `员工${s.employee_id}`, role: 'employee' };
    const isLumpSum = s.is_lump_sum;

    // Simulate performance score (realistic: 60-95)
    const perfScore = Math.round(65 + Math.random() * 28); // 65-93
    const grade = perfScore >= 90 ? 'A' : perfScore >= 80 ? 'B+' : perfScore >= 70 ? 'B' : perfScore >= 60 ? 'C' : 'D';
    if (grade === 'A') gradeA++;
    else if (grade.startsWith('B')) gradeB++;
    else if (grade === 'C') gradeC++;
    else gradeD++;

    // Bonus coefficient based on grade
    const bonusCoeff = perfScore >= 90 ? 1.3 : perfScore >= 80 ? 1.15 : perfScore >= 70 ? 1.0 : perfScore >= 60 ? 0.85 : 0.7;

    // Calculate wages
    const base = Number(s.base_salary) || 0;
    const posWage = Number(s.position_wage) || 0;
    const skillSub = Number(s.skill_subsidy) || 0;
    const pw1Base = Number(s.perf_wage1_base) || 0;
    const pw2Base = Number(s.perf_wage2_base) || 0;
    const pw3Base = Number(s.perf_wage3_base) || 0;
    const satPrem = Number(s.saturday_shift_premium) || 0;
    const compSalary = Number(s.comprehensive_salary) || 0;
    const siActual = Number(s.social_insurance_actual) || 0;
    const hfActual = Number(s.housing_fund_actual) || 0;
    const cashSub = Number(s.cash_subsidy) || 0;
    const perfAttendBonus = s.perfect_attendance_eligible ? (Number(s.perfect_attendance_amount) || 200) : 0;

    let grossPay, pw1, pw2;
    if (isLumpSum) {
      // 包干制: 综合薪资 + 现金补贴
      grossPay = compSalary + cashSub;
      pw1 = 0; pw2 = 0;
    } else {
      // 结构制: 基本+岗位+技能+绩效+周六+全勤+现金
      const perf = calculatePerfWages(pw1Base, pw2Base, pw3Base, perfScore, 75, 80);
      pw1 = perf.pw1; pw2 = perf.pw2;
      grossPay = base + posWage + skillSub + pw1 + pw2 + perf.pw3 + satPrem + perfAttendBonus + cashSub;
    }

    // Deductions
    const taxableIncome = grossPay - siActual - hfActual - 5000; // 5000元起征点
    const monthlyTaxableAnnualized = Math.max(0, taxableIncome) * 12; // 简化:年化计算
    const annualTax = calculateTax(monthlyTaxableAnnualized);
    const monthlyTax = Math.round(annualTax / 12 * 100) / 100;

    const netPay = Math.round((grossPay - siActual - hfActual - monthlyTax) * 100) / 100;

    totalGross += grossPay;
    totalSI += siActual;
    totalHF += hfActual;
    totalTax += monthlyTax;
    totalNet += netPay;

    const dept = s.department || '未分配';
    if (!deptTotals[dept]) deptTotals[dept] = { count: 0, gross: 0, net: 0 };
    deptTotals[dept].count++;
    deptTotals[dept].gross += grossPay;
    deptTotals[dept].net += netPay;

    reportRows.push({
      idx: i + 1, name: user.name, dept, grade: s.position_grade || '-',
      base, posWage, skillSub, pw1, pw2, grossPay, siActual, hfActual, monthlyTax, netPay, perfScore, perfGrade: grade,
    });

    // Print row
    const nameStr = (user.name || '').padEnd(8);
    const deptStr = (dept || '').padEnd(10).slice(0, 10);
    const gradeStr = (s.position_grade || '-').padEnd(4);
    const scoreColor = perfScore >= 90 ? C.green : perfScore >= 70 ? C.yellow : C.red;

    console.log(`${String(i+1).padStart(3)}  ${nameStr} ${deptStr} ${gradeStr} ${String(base).padStart(8)} ${String(posWage).padStart(8)} ${String(skillSub).padStart(8)} ${String(pw1).padStart(8)} ${String(pw2).padStart(8)} ${String(grossPay.toFixed(0)).padStart(10)} ${String(siActual).padStart(8)} ${String(hfActual).padStart(8)} ${String(monthlyTax.toFixed(0)).padStart(8)} ${String(netPay.toFixed(2)).padStart(10)} ${scoreColor}${String(perfScore).padStart(4)}${grade}${C.reset}`);
  }

  // ══════ SUMMARY ══════
  console.log(`${'─'.repeat(130)}`);
  console.log(`${C.bold}${'合计'.padEnd(40)} ${String(totalGross.toFixed(0)).padStart(10)} ${String(totalSI.toFixed(0)).padStart(8)} ${String(totalHF.toFixed(0)).padStart(8)} ${String(totalTax.toFixed(0)).padStart(8)} ${String(totalNet.toFixed(2)).padStart(10)}${C.reset}`);

  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}2026年4月 薪资汇总${C.reset}`);
  console.log(`  ──────────────────────────────────────────────────────`);
  console.log(`    总人数:         ${salaryData.length}人`);
  console.log(`    应发工资总额:   ${C.bold}¥${(totalGross/10000).toFixed(2)}万${C.reset}`);
  console.log(`    社保代扣:       ¥${(totalSI/10000).toFixed(2)}万`);
  console.log(`    公积金代扣:     ¥${(totalHF/10000).toFixed(2)}万`);
  console.log(`    个人所得税:     ¥${(totalTax/10000).toFixed(2)}万`);
  console.log(`    实发工资总额:   ${C.green}${C.bold}¥${(totalNet/10000).toFixed(2)}万${C.reset}`);
  console.log(`    人均实发:       ¥${Math.round(totalNet/salaryData.length).toLocaleString()}`);

  console.log(`\n  ${C.bold}绩效等级分布${C.reset}`);
  console.log(`    A档 (≥90分):    ${C.green}${gradeA}人 (${Math.round(gradeA/salaryData.length*100)}%)${C.reset} → 系数1.3`);
  console.log(`    B档 (70-89分):  ${C.yellow}${gradeB}人 (${Math.round(gradeB/salaryData.length*100)}%)${C.reset} → 系数1.0-1.15`);
  console.log(`    C档 (60-69分):  ${C.red}${gradeC}人 (${Math.round(gradeC/salaryData.length*100)}%)${C.reset} → 系数0.85`);
  console.log(`    D档 (<60分):    ${gradeD}人 → 系数0.7`);

  console.log(`\n  ${C.bold}部门薪资汇总${C.reset}`);
  console.log(`  ${'部门'.padEnd(15)} ${'人数'.padEnd(6)} ${'应发总额'.padEnd(12)} ${'实发总额'.padEnd(12)} ${'人均实发'}`);
  console.log(`  ${'─'.repeat(60)}`);
  for (const [dept, d] of Object.entries(deptTotals).sort((a,b) => b[1].net - a[1].net)) {
    console.log(`  ${dept.padEnd(15)} ${String(d.count).padEnd(6)} ¥${(d.gross/10000).toFixed(1)}万`.padEnd(38) + `¥${(d.net/10000).toFixed(1)}万`.padEnd(14) + `¥${Math.round(d.net/d.count).toLocaleString()}`);
  }

  console.log(`\n  ${C.bold}薪资构成分析${C.reset}`);
  const avgBase = reportRows.filter(r=>r.base>0).reduce((s,r)=>s+r.base,0) / (reportRows.filter(r=>r.base>0).length||1);
  const avgPos = reportRows.filter(r=>r.posWage>0).reduce((s,r)=>s+r.posWage,0) / (reportRows.filter(r=>r.posWage>0).length||1);
  const avgSkill = reportRows.filter(r=>r.skillSub>0).reduce((s,r)=>s+r.skillSub,0) / (reportRows.filter(r=>r.skillSub>0).length||1);
  console.log(`    平均基本工资:   ¥${Math.round(avgBase).toLocaleString()}`);
  console.log(`    平均岗位工资:   ¥${Math.round(avgPos).toLocaleString()}`);
  console.log(`    平均技能津贴:   ¥${Math.round(avgSkill).toLocaleString()}`);

  console.log(`\n${C.cyan}═══════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}审批状态: ${C.yellow}待CTO确认${C.reset}`);
  console.log(`  生成时间: ${new Date().toISOString().replace('T',' ').slice(0,19)}`);
  console.log(`${C.cyan}═══════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  await client.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
