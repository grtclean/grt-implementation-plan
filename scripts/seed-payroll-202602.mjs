#!/usr/bin/env node
/**
 * GRT 薪资系统 — 导入202602月数据 + 对比变化 + 生成调整记录 + 报告
 *
 * 数据源: data/副本202602-薪资稿V4(1).xlsx → "3.计薪汇总" sheet
 *
 * 输出:
 *   1. salary_monthly_records 表 (月度薪资快照)
 *   2. salary_change_log 表 (01→02变化追踪)
 *   3. 控制台完整报告 (供CTO确认)
 *
 * 用法: node scripts/seed-payroll-202602.mjs
 */

import XLSX from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m' };

async function main() {
  // ── 1. Read Excel ──
  const wb = XLSX.readFile(resolve(__dirname, '../data/副本202602-薪资稿V4(1).xlsx'));
  const ws = wb.Sheets['3.计薪汇总'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Also read remarks from main sheet
  const wsMain = wb.Sheets['4. 202602工资'];
  const rawMain = XLSX.utils.sheet_to_json(wsMain, { header: 1, defval: '' });
  const mainRemarks = {};
  for (let i = 3; i < rawMain.length; i++) {
    const name = rawMain[i]?.[2];
    if (name && typeof name === 'string') {
      mainRemarks[name.trim()] = {
        hireDate: rawMain[i][19] || '',
        notes: String(rawMain[i][20] || '').trim(),
      };
    }
  }

  // Read 差值调控表
  const wsAdj = wb.Sheets['差值调控表'];
  const adjustments = {};
  if (wsAdj) {
    const adjData = XLSX.utils.sheet_to_json(wsAdj, { header: 1, defval: '' });
    for (let i = 1; i < adjData.length; i++) {
      const name = adjData[i]?.[2];
      if (name && typeof name === 'string' && name.trim()) {
        adjustments[name.trim()] = {
          actualPaid: Number(adjData[i][3]) || 0,
          shouldPaid: Number(adjData[i][4]) || 0,
          diff: Number(adjData[i][5]) || 0,
        };
      }
    }
  }

  // Parse employee rows
  const employees = [];
  for (let i = 3; i < raw.length; i++) {
    const r = raw[i];
    const name = r[2];
    if (!name || typeof name !== 'string' || !name.trim()) continue;

    employees.push({
      seq: Number(r[0]) || 0,
      dept: String(r[1] || '').trim(),
      name: name.trim(),
      grade: String(r[3] || '').trim(),
      baseSalary: Number(r[4]) || 0,
      positionWage: Number(r[5]) || 0,
      skillSubsidy: Number(r[6]) || 0,
      perfWage1Base: Number(r[7]) || 0,
      perfWage2Base: Number(r[8]) || 0,
      perfWage3Base: Number(r[9]) || 0,
      saturdayPremium: Number(r[10]) || 0,
      comprehensiveSalary: Number(r[11]) || 0,
      perfWageAdjust: Number(r[12]) || 0,
      attendDays: Number(r[13]) || 0,
      personalLeaveHours: Number(r[14]) || 0,
      sickLeaveHours: Number(r[15]) || 0,
      personalLeaveDeduct: Number(r[16]) || 0,
      sickLeaveDeduct: Number(r[17]) || 0,
      otWeekdayHours: Number(r[18]) || 0,
      otWeekendHours: Number(r[19]) || 0,
      otHolidayHours: Number(r[20]) || 0,
      otWeekdayPay: Number(r[21]) || 0,
      otWeekendPay: Number(r[22]) || 0,
      otHolidayPay: Number(r[23]) || 0,
      perfectAttendBonus: Number(r[24]) || 0,
      assessmentBonus: Number(r[25]) || 0,
      grossPay: Number(r[26]) || 0,
      otherIncome: Number(r[27]) || 0,
      socialInsurance: Number(r[28]) || 0,
      housingFund: Number(r[29]) || 0,
      incomeTax: Number(r[30]) || 0,
      netPay: Number(r[31]) || 0,
      avg2024Score: Number(r[32]) || 0,
      avg2025Score: Number(r[33]) || 0,
      preset2026Score: Number(r[34]) || 0,
      monthlyPerfScore: Number(r[35]) || 0,
      perfWage1Coeff: Number(r[36]) || 0,
      perfWage2Coeff: Number(r[37]) || 0,
      perfWage3Coeff: Number(r[38]) || 0,
      perfWage1Deduct: Number(r[39]) || 0,
      perfWage2Deduct: Number(r[40]) || 0,
      perfWage3Deduct: Number(r[41]) || 0,
      // From main sheet
      remarks: mainRemarks[name.trim()]?.notes || '',
      hireDate: mainRemarks[name.trim()]?.hireDate || '',
      // From adjustment sheet
      adjustment: adjustments[name.trim()] || null,
    });
  }

  console.log(`\n${C.bold}${C.cyan}Parsed ${employees.length} employees from 202602 Excel${C.reset}\n`);

  // ── 2. DB Operations ──
  const PG = pg.default || pg;
  const client = new PG.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS salary_monthly_records (
      id SERIAL PRIMARY KEY,
      period VARCHAR(7) NOT NULL,
      employee_name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      grade VARCHAR(20),
      base_salary NUMERIC(12,2) DEFAULT 0,
      position_wage NUMERIC(12,2) DEFAULT 0,
      skill_subsidy NUMERIC(12,2) DEFAULT 0,
      perf_wage1_base NUMERIC(12,2) DEFAULT 0,
      perf_wage2_base NUMERIC(12,2) DEFAULT 0,
      perf_wage3_base NUMERIC(12,2) DEFAULT 0,
      saturday_premium NUMERIC(12,2) DEFAULT 0,
      comprehensive_salary NUMERIC(12,2) DEFAULT 0,
      perf_wage_adjust NUMERIC(12,2) DEFAULT 0,
      attend_days NUMERIC(5,1) DEFAULT 0,
      personal_leave_hours NUMERIC(6,1) DEFAULT 0,
      sick_leave_hours NUMERIC(6,1) DEFAULT 0,
      personal_leave_deduct NUMERIC(12,2) DEFAULT 0,
      sick_leave_deduct NUMERIC(12,2) DEFAULT 0,
      ot_weekday_hours NUMERIC(6,1) DEFAULT 0,
      ot_weekend_hours NUMERIC(6,1) DEFAULT 0,
      ot_holiday_hours NUMERIC(6,1) DEFAULT 0,
      ot_weekday_pay NUMERIC(12,2) DEFAULT 0,
      ot_weekend_pay NUMERIC(12,2) DEFAULT 0,
      ot_holiday_pay NUMERIC(12,2) DEFAULT 0,
      perfect_attend_bonus NUMERIC(12,2) DEFAULT 0,
      assessment_bonus NUMERIC(12,2) DEFAULT 0,
      gross_pay NUMERIC(12,2) DEFAULT 0,
      other_income NUMERIC(12,2) DEFAULT 0,
      social_insurance NUMERIC(12,2) DEFAULT 0,
      housing_fund NUMERIC(12,2) DEFAULT 0,
      income_tax NUMERIC(12,2) DEFAULT 0,
      net_pay NUMERIC(12,2) DEFAULT 0,
      perf_score NUMERIC(6,2) DEFAULT 0,
      avg_2024 NUMERIC(6,2) DEFAULT 0,
      avg_2025 NUMERIC(6,2) DEFAULT 0,
      perf_wage1_coeff NUMERIC(4,2) DEFAULT 0,
      perf_wage2_coeff NUMERIC(4,2) DEFAULT 0,
      perf_wage1_deduct NUMERIC(12,2) DEFAULT 0,
      perf_wage2_deduct NUMERIC(12,2) DEFAULT 0,
      remarks TEXT,
      cash_subsidy NUMERIC(12,2) DEFAULT 0,
      car_subsidy NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(period, employee_name)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS salary_change_log (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(100) NOT NULL,
      period VARCHAR(7) NOT NULL,
      change_type VARCHAR(50) NOT NULL,
      field_name VARCHAR(50),
      old_value VARCHAR(100),
      new_value VARCHAR(100),
      diff_amount NUMERIC(12,2),
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS salary_view_permissions (
      id SERIAL PRIMARY KEY,
      viewer_role VARCHAR(30) NOT NULL,
      viewer_id INTEGER,
      viewer_name VARCHAR(100),
      can_view_scope VARCHAR(30) NOT NULL DEFAULT 'self',
      can_view_details BOOLEAN DEFAULT false,
      can_view_breakdown BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(viewer_role, viewer_id)
    )
  `);

  // Seed permissions (CEO + HR + Finance only)
  await client.query(`
    INSERT INTO salary_view_permissions (viewer_role, viewer_name, can_view_scope, can_view_details, can_view_breakdown, notes)
    VALUES
      ('ceo', '倪亚东', 'all', true, true, 'CEO可查看全公司薪资明细'),
      ('vp', '倪微薇', 'all', true, true, 'HR VP可查看全公司薪资明细'),
      ('hr_director', '沙建梅', 'all', true, false, 'HR总监可查看全公司薪资总额'),
      ('finance_manager', '王秀萍', 'all', true, true, '财务经理可查看全公司薪资明细'),
      ('finance_specialist', '黄晓兰', 'all', true, true, '财务专员可查看全公司薪资明细'),
      ('finance_specialist', '王汝月', 'department', true, false, '财务专员可查看本部门薪资')
    ON CONFLICT DO NOTHING
  `);

  // ── 3. Import 202602 data ──
  await client.query(`DELETE FROM salary_monthly_records WHERE period = '2026-02'`);
  await client.query(`DELETE FROM salary_change_log WHERE period = '2026-02'`);

  let imported = 0;
  for (const e of employees) {
    if (e.grossPay === 0 && e.netPay === 0 && e.comprehensiveSalary === 0) continue;

    await client.query(`
      INSERT INTO salary_monthly_records (
        period, employee_name, department, grade,
        base_salary, position_wage, skill_subsidy,
        perf_wage1_base, perf_wage2_base, perf_wage3_base,
        saturday_premium, comprehensive_salary, perf_wage_adjust,
        attend_days, personal_leave_hours, sick_leave_hours,
        personal_leave_deduct, sick_leave_deduct,
        ot_weekday_hours, ot_weekend_hours, ot_holiday_hours,
        ot_weekday_pay, ot_weekend_pay, ot_holiday_pay,
        perfect_attend_bonus, assessment_bonus,
        gross_pay, other_income, social_insurance, housing_fund,
        income_tax, net_pay,
        perf_score, avg_2024, avg_2025,
        perf_wage1_coeff, perf_wage2_coeff,
        perf_wage1_deduct, perf_wage2_deduct,
        remarks
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
      ON CONFLICT (period, employee_name) DO UPDATE SET
        gross_pay = EXCLUDED.gross_pay, net_pay = EXCLUDED.net_pay,
        perf_score = EXCLUDED.perf_score, remarks = EXCLUDED.remarks
    `, [
      '2026-02', e.name, e.dept, e.grade,
      e.baseSalary, e.positionWage, e.skillSubsidy,
      e.perfWage1Base, e.perfWage2Base, e.perfWage3Base,
      e.saturdayPremium, e.comprehensiveSalary, e.perfWageAdjust,
      e.attendDays, e.personalLeaveHours, e.sickLeaveHours,
      e.personalLeaveDeduct, e.sickLeaveDeduct,
      e.otWeekdayHours, e.otWeekendHours, e.otHolidayHours,
      e.otWeekdayPay, e.otWeekendPay, e.otHolidayPay,
      e.perfectAttendBonus, e.assessmentBonus,
      e.grossPay, e.otherIncome, e.socialInsurance, e.housingFund,
      e.incomeTax, e.netPay,
      e.monthlyPerfScore, e.avg2024Score, e.avg2025Score,
      e.perfWage1Coeff, e.perfWage2Coeff,
      e.perfWage1Deduct, e.perfWage2Deduct,
      e.remarks || (e.adjustment ? `差值调控: 实发${e.adjustment.actualPaid} 应发${e.adjustment.shouldPaid} 差${e.adjustment.diff}` : ''),
    ]);
    imported++;
  }

  // ── 4. Generate change log (compare 01 vs 02) ──
  const { rows: jan } = await client.query(`SELECT * FROM salary_monthly_records WHERE period = '2026-01'`);
  const { rows: feb } = await client.query(`SELECT * FROM salary_monthly_records WHERE period = '2026-02'`);

  const janMap = {};
  for (const r of jan) janMap[r.employee_name] = r;

  let changes = 0;
  for (const f of feb) {
    const j = janMap[f.employee_name];
    if (!j) {
      // New hire in Feb
      await client.query(`INSERT INTO salary_change_log (employee_name, period, change_type, field_name, old_value, new_value, diff_amount, reason) VALUES ($1, '2026-02', 'new_hire', 'net_pay', '0', $2, $3, '新入职')`, [f.employee_name, String(f.net_pay), Number(f.net_pay)]);
      changes++;
      continue;
    }

    // Compare fields
    const fields = [
      { key: 'base_salary', label: '基本工资' },
      { key: 'position_wage', label: '岗位工资' },
      { key: 'skill_subsidy', label: '技能津贴' },
      { key: 'perf_wage1_base', label: '绩效工资1基数' },
      { key: 'perf_wage2_base', label: '绩效工资2基数' },
      { key: 'comprehensive_salary', label: '综合工资' },
      { key: 'social_insurance', label: '社保' },
      { key: 'housing_fund', label: '公积金' },
      { key: 'gross_pay', label: '应发工资' },
      { key: 'net_pay', label: '实发工资' },
    ];

    for (const { key, label } of fields) {
      const oldVal = Number(j[key]) || 0;
      const newVal = Number(f[key]) || 0;
      if (Math.abs(oldVal - newVal) > 0.01) {
        await client.query(`INSERT INTO salary_change_log (employee_name, period, change_type, field_name, old_value, new_value, diff_amount, reason) VALUES ($1, '2026-02', 'adjust', $2, $3, $4, $5, $6)`,
          [f.employee_name, label, String(oldVal), String(newVal), newVal - oldVal, `${label}: ${oldVal}→${newVal}`]);
        changes++;
      }
    }
  }

  // ── 5. Print Report ──
  console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  GRT 2026年2月 薪资核算报告 — ${imported}人 (来源: Excel 副本202602-薪资稿V4)                                    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // Header
  console.log(`${C.bold}${'序'.padEnd(3)} ${'部门'.padEnd(10)} ${'姓名'.padEnd(8)} ${'等级'.padEnd(5)} ${'基本'.padStart(7)} ${'岗位'.padStart(7)} ${'技能'.padStart(7)} ${'绩效调'.padStart(7)} ${'应发'.padStart(9)} ${'社保'.padStart(7)} ${'公积金'.padStart(7)} ${'个税'.padStart(8)} ${'实发'.padStart(10)} ${'绩效分'.padStart(5)} ${'备注'}${C.reset}`);
  console.log('─'.repeat(130));

  let totalGross = 0, totalSI = 0, totalHF = 0, totalTax = 0, totalNet = 0;
  const deptStats = {};

  for (const e of employees) {
    if (e.grossPay === 0 && e.netPay === 0 && e.comprehensiveSalary === 0) continue;

    totalGross += e.grossPay;
    totalSI += e.socialInsurance;
    totalHF += e.housingFund;
    totalTax += e.incomeTax;
    totalNet += e.netPay;

    if (!deptStats[e.dept]) deptStats[e.dept] = { count: 0, gross: 0, net: 0 };
    deptStats[e.dept].count++;
    deptStats[e.dept].gross += e.grossPay;
    deptStats[e.dept].net += e.netPay;

    const scoreColor = e.monthlyPerfScore >= 85 ? C.green : e.monthlyPerfScore >= 70 ? C.yellow : e.monthlyPerfScore > 0 ? C.red : C.dim;
    const adjNote = e.adjustment ? `调控${e.adjustment.diff > 0 ? '+' : ''}${e.adjustment.diff.toFixed(0)}` : '';
    const noteStr = [e.remarks, adjNote].filter(Boolean).join(' ').slice(0, 20);

    console.log(
      `${String(e.seq).padStart(3)} ${e.dept.padEnd(10).slice(0,10)} ${e.name.padEnd(8)} ${e.grade.padEnd(5)} ` +
      `${String(e.baseSalary).padStart(7)} ${String(e.positionWage).padStart(7)} ${String(e.skillSubsidy).padStart(7)} ` +
      `${String(e.perfWageAdjust).padStart(7)} ${e.grossPay.toFixed(0).padStart(9)} ` +
      `${String(e.socialInsurance).padStart(7)} ${String(e.housingFund).padStart(7)} ${e.incomeTax.toFixed(2).padStart(8)} ` +
      `${scoreColor}${e.netPay.toFixed(2).padStart(10)}${C.reset} ` +
      `${scoreColor}${e.monthlyPerfScore ? e.monthlyPerfScore.toFixed(1).padStart(5) : '  -  '}${C.reset} ` +
      `${C.dim}${noteStr}${C.reset}`
    );
  }

  console.log('─'.repeat(130));
  console.log(`${C.bold}${'合计'.padEnd(50)} ${totalGross.toFixed(0).padStart(9)} ${totalSI.toFixed(0).padStart(7)} ${totalHF.toFixed(0).padStart(7)} ${totalTax.toFixed(2).padStart(8)} ${totalNet.toFixed(2).padStart(10)}${C.reset}`);

  // Summary
  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}2026年2月 薪资汇总${C.reset}`);
  console.log(`    总人数:         ${imported}人`);
  console.log(`    应发工资总额:   ${C.bold}¥${(totalGross/10000).toFixed(2)}万${C.reset}`);
  console.log(`    社保代扣:       ¥${(totalSI/10000).toFixed(2)}万`);
  console.log(`    公积金代扣:     ¥${(totalHF/10000).toFixed(2)}万`);
  console.log(`    个人所得税:     ¥${(totalTax/10000).toFixed(2)}万`);
  console.log(`    实发工资总额:   ${C.green}${C.bold}¥${(totalNet/10000).toFixed(2)}万${C.reset}`);
  console.log(`    人均实发:       ¥${Math.round(totalNet/imported).toLocaleString()}`);

  console.log(`\n  ${C.bold}01→02月变化追踪${C.reset}: ${changes}条调整记录`);
  console.log(`  ${C.bold}差值调控${C.reset}: ${Object.keys(adjustments).length}人`);
  for (const [name, a] of Object.entries(adjustments)) {
    if (a.diff !== 0) console.log(`    ${name}: 实发${a.actualPaid} 应发${a.shouldPaid} ${a.diff > 0 ? '+' : ''}${a.diff.toFixed(2)}`);
  }

  console.log(`\n  ${C.bold}部门汇总${C.reset}`);
  for (const [dept, d] of Object.entries(deptStats).sort((a,b) => b[1].net - a[1].net)) {
    console.log(`    ${dept.padEnd(12)} ${String(d.count).padEnd(4)}人 应发¥${(d.gross/10000).toFixed(1)}万 实发¥${(d.net/10000).toFixed(1)}万 人均¥${Math.round(d.net/d.count).toLocaleString()}`);
  }

  console.log(`\n  ${C.bold}查看权限 (CEO+HR+财务可见)${C.reset}`);
  const { rows: perms } = await client.query(`SELECT viewer_role, viewer_name, can_view_scope, can_view_details FROM salary_view_permissions`);
  for (const p of perms) {
    console.log(`    ${p.viewer_name.padEnd(8)} ${p.viewer_role.padEnd(20)} 范围:${p.can_view_scope} 明细:${p.can_view_details ? '是' : '否'}`);
  }

  console.log(`\n${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}数据已写入:${C.reset}`);
  console.log(`    salary_monthly_records:  ${imported}条 (2026-02)`);
  console.log(`    salary_change_log:       ${changes}条 (01→02变化)`);
  console.log(`    salary_view_permissions: ${perms.length}条`);
  console.log(`  ${C.bold}审批状态: ${C.yellow}待CTO确认${C.reset}`);
  console.log(`${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}\n`);

  await client.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
