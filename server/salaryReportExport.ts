/**
 * 薪酬报表导出服务
 * 
 * 功能：
 * 1. Excel格式导出（CSV）
 * 2. PDF格式导出
 * 3. 批量薪资模拟报表
 * 4. 薪酬结构分析报表
 */

import { requireDb, calculateSalary, getSalaryCalculations } from "./db";
import { 
  salaryCalculations,
  hrmSalaryStructures,
  hrmPerformanceGrades
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 报表数据类型
interface SalaryReportRow {
  employeeId?: number;
  candidateId?: number;
  employeeName?: string;
  department: string;
  positionGrade?: string;
  calculationType: string;
  baseSalary: number;
  performanceSalary: number;
  bonus: number;
  benefits: number;
  monthlyTotal: number;
  annualTotal: number;
  calculatedAt: Date;
}

interface SalaryStructureReportRow {
  department: string;
  baseSalaryMin: number;
  baseSalaryMax: number;
  performanceRatio: number;
  bonusRatio: number;
  benefitsRatio: number;
  totalEmployees?: number;
  avgSalary?: number;
}

// 生成CSV格式的薪酬计算报表
export async function exportSalaryCalculationsToCSV(
  filters?: {
    department?: string;
    calculationType?: "offer" | "adjustment" | "promotion" | "simulation";
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{ csv: string; filename: string }> {
  const calculations = await getSalaryCalculations(filters as any);
  
  if (!calculations || calculations.length === 0) {
    return {
      csv: "No data available",
      filename: `salary_report_${formatDate(new Date())}.csv`,
    };
  }

  // CSV头部
  const headers = [
    "序号",
    "员工ID",
    "候选人ID",
    "部门",
    "岗位等级",
    "计算类型",
    "基本工资",
    "绩效工资",
    "奖金",
    "福利",
    "月度总计",
    "年度总计",
    "计算时间",
  ];

  // CSV数据行
  const rows: (string | number)[][] = calculations.map((calc, index) => [
    index + 1,
    calc.employeeId || "",
    calc.candidateId || "",
    calc.department,
    calc.positionGrade || "",
    getCalculationTypeText(calc.calculationType),
    Number(calc.baseSalary),
    Number(calc.performanceSalary) || 0,
    Number(calc.bonus) || 0,
    Number(calc.benefits) || 0,
    Number(calc.monthlyTotal),
    Number(calc.annualTotal),
    formatDateTime(new Date(calc.createdAt)),
  ]);

  // 汇总行
  const totalBaseSalary = calculations.reduce((sum, c) => sum + Number(c.baseSalary), 0);
  const totalMonthly = calculations.reduce((sum, c) => sum + Number(c.monthlyTotal), 0);
  const totalAnnual = calculations.reduce((sum, c) => sum + Number(c.annualTotal), 0);

  rows.push([]);
  rows.push([
    "汇总",
    "",
    "",
    "",
    "",
    `共${calculations.length}条记录`,
    totalBaseSalary,
    "",
    "",
    "",
    totalMonthly,
    totalAnnual,
    "",
  ]);

  // 生成CSV字符串
  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return {
    csv: "\uFEFF" + csv, // 添加BOM以支持Excel中文显示
    filename: `salary_report_${formatDate(new Date())}.csv`,
  };
}

// 生成薪酬结构分析报表（CSV）
export async function exportSalaryStructureToCSV(): Promise<{ csv: string; filename: string }> {
  const db = await requireDb();
  if (!db) {
    return { csv: "Database not available", filename: "error.csv" };
  }

  const structures = await db.select().from(hrmSalaryStructures).limit(1000);
  
  if (!structures || structures.length === 0) {
    return {
      csv: "No salary structure data available",
      filename: `salary_structure_${formatDate(new Date())}.csv`,
    };
  }

  // CSV头部
  const headers = [
    "部门",
    "职级",
    "基本工资比例范围",
    "绩效工资比例范围",
    "奖金比例范围",
    "福利比例范围",
    "状态",
  ];

  // CSV数据行
  const rows = structures.map(s => [
    s.department,
    s.level || "-",
    `${Number(s.baseSalaryRatioMin)*100}%-${Number(s.baseSalaryRatioMax)*100}%`,
    `${Number(s.performanceRatioMin)*100}%-${Number(s.performanceRatioMax)*100}%`,
    `${Number(s.bonusRatioMin)*100}%-${Number(s.bonusRatioMax)*100}%`,
    `${Number(s.benefitsRatioMin)*100}%-${Number(s.benefitsRatioMax)*100}%`,
    s.status,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return {
    csv: "\uFEFF" + csv,
    filename: `salary_structure_${formatDate(new Date())}.csv`,
  };
}

// 生成绩效等级报表（CSV）
export async function exportPerformanceGradesToCSV(): Promise<{ csv: string; filename: string }> {
  const db = await requireDb();
  if (!db) {
    return { csv: "Database not available", filename: "error.csv" };
  }

  const grades = await db.select().from(hrmPerformanceGrades).limit(1000);
  
  if (!grades || grades.length === 0) {
    return {
      csv: "No performance grade data available",
      filename: `performance_grades_${formatDate(new Date())}.csv`,
    };
  }

  // CSV头部
  const headers = [
    "等级代码",
    "等级名称",
    "最低分数",
    "最高分数",
    "绩效系数",
    "说明",
  ];

  // CSV数据行
  const rows = grades.map(g => [
    g.gradeCode,
    g.gradeName,
    g.scoreMin,
    g.scoreMax,
    g.coefficient,
    g.description || "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return {
    csv: "\uFEFF" + csv,
    filename: `performance_grades_${formatDate(new Date())}.csv`,
  };
}

// 批量薪资模拟报表
export async function generateBatchSalarySimulation(
  simulations: Array<{
    department: string;
    baseSalary: number;
    performanceGrade?: string;
    salesAmount?: number;
    projectBonus?: number;
  }>
): Promise<{ csv: string; filename: string; results: any[] }> {
  const results: any[] = [];

  for (const sim of simulations) {
    const result = await calculateSalary(sim);
    results.push({
      ...sim,
      ...(result || {}),
    });
  }

  // CSV头部
  const headers = [
    "序号",
    "部门",
    "基本工资",
    "绩效等级",
    "销售额",
    "项目奖金",
    "绩效工资",
    "销售提成",
    "福利补贴",
    "月度总计",
    "年度总计",
  ];

  // CSV数据行
  const rows = results.map((r, index) => [
    index + 1,
    r.department,
    r.baseSalary,
    r.performanceGrade || "-",
    r.salesAmount || 0,
    r.projectBonus || 0,
    r.performanceSalary || 0,
    r.salesCommission || 0,
    r.benefits || 0,
    r.monthlyTotal || 0,
    r.annualTotal || 0,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return {
    csv: "\uFEFF" + csv,
    filename: `salary_simulation_${formatDate(new Date())}.csv`,
    results,
  };
}

// 生成PDF格式的薪酬报表（返回HTML用于前端渲染）
export async function generateSalaryReportHTML(
  filters?: {
    department?: string;
    calculationType?: "offer" | "adjustment" | "promotion" | "simulation";
  }
): Promise<string> {
  const calculations = await getSalaryCalculations(filters as any);
  
  const totalBaseSalary = calculations?.reduce((sum, c) => sum + Number(c.baseSalary), 0) || 0;
  const totalMonthly = calculations?.reduce((sum, c) => sum + Number(c.monthlyTotal), 0) || 0;
  const totalAnnual = calculations?.reduce((sum, c) => sum + Number(c.annualTotal), 0) || 0;
  const avgMonthly = calculations?.length ? totalMonthly / calculations.length : 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>薪酬计算报表</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
    h1 { text-align: center; color: #333; }
    .summary { display: flex; justify-content: space-around; margin: 20px 0; }
    .summary-item { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #f97316; }
    .summary-item .label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>GRT薪酬计算报表</h1>
  <p style="text-align: center; color: #666;">生成时间：${formatDateTime(new Date())}</p>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value">${calculations?.length || 0}</div>
      <div class="label">记录总数</div>
    </div>
    <div class="summary-item">
      <div class="value">¥${formatNumber(avgMonthly)}</div>
      <div class="label">平均月薪</div>
    </div>
    <div class="summary-item">
      <div class="value">¥${formatNumber(totalMonthly)}</div>
      <div class="label">月度总计</div>
    </div>
    <div class="summary-item">
      <div class="value">¥${formatNumber(totalAnnual)}</div>
      <div class="label">年度总计</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>部门</th>
        <th>岗位等级</th>
        <th>计算类型</th>
        <th>基本工资</th>
        <th>绩效工资</th>
        <th>奖金</th>
        <th>月度总计</th>
        <th>年度总计</th>
      </tr>
    </thead>
    <tbody>
      ${calculations?.map((calc, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${calc.department}</td>
          <td>${calc.positionGrade || '-'}</td>
          <td>${getCalculationTypeText(calc.calculationType)}</td>
          <td>¥${formatNumber(Number(calc.baseSalary))}</td>
          <td>¥${formatNumber(Number(calc.performanceSalary) || 0)}</td>
          <td>¥${formatNumber(Number(calc.bonus) || 0)}</td>
          <td>¥${formatNumber(Number(calc.monthlyTotal))}</td>
          <td>¥${formatNumber(Number(calc.annualTotal))}</td>
        </tr>
      `).join('') || '<tr><td colspan="9">暂无数据</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>GRT智能系统 - 薪酬管理模块</p>
    <p>本报表仅供内部参考使用</p>
  </div>
</body>
</html>
  `;

  return html;
}

// 辅助函数
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCalculationTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    offer: "录用定薪",
    adjustment: "薪资调整",
    promotion: "晋升调薪",
    simulation: "薪资模拟",
  };
  return typeMap[type] || type;
}
