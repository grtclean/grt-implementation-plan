/**
 * 批量薪资模拟功能模块
 * 支持Excel导入和批量薪资计算
 */

import { requireDb } from './utils/db-helpers';
import { salaryCalculations } from "../drizzle/schema";

export interface BatchSimulationInput {
  employees: Array<{
    employeeId: number;
    department: string;
    baseSalary: number;
    performanceGrade: string;
    projectBonus?: number;
  }>;
  calculationType: "offer" | "adjustment" | "promotion" | "simulation";
  notes?: string;
}

export interface BatchSimulationResult {
  totalRecords: number;
  successCount: number;
  failureCount: number;
  calculations: Array<{
    employeeId: number;
    employeeName: string;
    department: string;
    baseSalary: number;
    performanceSalary: number;
    bonus: number;
    benefits: number;
    monthlyTotal: number;
    annualTotal: number;
    status: "success" | "failed";
    error?: string;
  }>;
  summary: {
    totalMonthlyPayroll: number;
    totalAnnualPayroll: number;
    averageMonthly: number;
    averageAnnual: number;
  };
}

/**
 * 批量薪资模拟计算
 */
export async function batchSalarySimulation(
  input: BatchSimulationInput
): Promise<BatchSimulationResult> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const calculations: BatchSimulationResult["calculations"] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const employee of input.employees) {
    try {
      // 计算绩效工资（根据绩效等级）
      const performanceGradeMap: Record<string, number> = {
        S: 1.5,
        A: 1.2,
        B: 1.0,
        C: 0.8,
        D: 0.6,
      };

      const performanceCoefficient =
        performanceGradeMap[employee.performanceGrade] || 1.0;
      const performanceSalary = Math.round(
        employee.baseSalary * 0.3 * performanceCoefficient
      );

      // 计算奖金
      const bonus = Math.round((employee.projectBonus || 0) * 0.5);

      // 计算福利补贴
      const benefits = Math.round(employee.baseSalary * 0.1);

      // 计算总薪酬
      const monthlyTotal =
        employee.baseSalary + performanceSalary + bonus + benefits;
      const annualTotal = monthlyTotal * 12;

      // 保存计算结果
      const calculationCode = `BATCH_${Date.now()}_${employee.employeeId}`;
      await db.insert(salaryCalculations).values({
        calculationCode,
        employeeId: employee.employeeId,
        department: employee.department,
        baseSalary: String(employee.baseSalary),
        performanceSalary: String(performanceSalary),
        bonus: String(bonus),
        benefits: String(benefits),
        monthlyTotal: String(monthlyTotal),
        annualTotal: String(annualTotal),
        calculationType: input.calculationType,
        remarks: input.notes || "",
        calculationParams: {
          performanceGrade: employee.performanceGrade,
          projectBonus: employee.projectBonus || 0,
        },
      });

      calculations.push({
        employeeId: employee.employeeId,
        employeeName: `员工${employee.employeeId}`,
        department: employee.department,
        baseSalary: employee.baseSalary,
        performanceSalary,
        bonus,
        benefits,
        monthlyTotal,
        annualTotal,
        status: "success",
      });

      successCount++;
    } catch (error) {
      failureCount++;
      calculations.push({
        employeeId: employee.employeeId,
        employeeName: `员工${employee.employeeId}`,
        department: employee.department,
        baseSalary: employee.baseSalary,
        performanceSalary: 0,
        bonus: 0,
        benefits: 0,
        monthlyTotal: 0,
        annualTotal: 0,
        status: "failed",
        error: String(error),
      });
    }
  }

  // 计算汇总数据
  const successCalculations = calculations.filter((c) => c.status === "success");
  const totalMonthlyPayroll = successCalculations.reduce(
    (sum, c) => sum + c.monthlyTotal,
    0
  );
  const totalAnnualPayroll = successCalculations.reduce(
    (sum, c) => sum + c.annualTotal,
    0
  );

  return {
    totalRecords: input.employees.length,
    successCount,
    failureCount,
    calculations,
    summary: {
      totalMonthlyPayroll,
      totalAnnualPayroll,
      averageMonthly:
        successCalculations.length > 0
          ? Math.round(totalMonthlyPayroll / successCalculations.length)
          : 0,
      averageAnnual:
        successCalculations.length > 0
          ? Math.round(totalAnnualPayroll / successCalculations.length)
          : 0,
    },
  };
}

/**
 * 从Excel数据生成批量模拟输入
 */
export function parseExcelData(
  excelRows: Array<Record<string, any>>
): BatchSimulationInput {
  const employees = excelRows.map((row) => ({
    employeeId: parseInt(row.employeeId || row["员工ID"] || "0"),
    department: row.department || row["部门"] || "",
    baseSalary: parseFloat(row.baseSalary || row["基本工资"] || "0"),
    performanceGrade: row.performanceGrade || row["绩效等级"] || "B",
    projectBonus: parseFloat(row.projectBonus || row["项目奖金"] || "0"),
  }));

  return {
    employees,
    calculationType: "simulation",
    notes: "批量导入计算",
  };
}

/**
 * 导出批量模拟结果为CSV
 */
export function exportToCSV(result: BatchSimulationResult): string {
  const headers = [
    "员工ID",
    "员工名称",
    "部门",
    "基本工资",
    "绩效工资",
    "奖金",
    "福利补贴",
    "月度总薪酬",
    "年度总薪酬",
    "状态",
    "备注",
  ];

  const rows = result.calculations.map((calc) => [
    calc.employeeId,
    calc.employeeName,
    calc.department,
    calc.baseSalary,
    calc.performanceSalary,
    calc.bonus,
    calc.benefits,
    calc.monthlyTotal,
    calc.annualTotal,
    calc.status,
    calc.error || "",
  ]);

  const summaryRows = [
    [],
    ["汇总统计"],
    ["总记录数", result.totalRecords],
    ["成功数", result.successCount],
    ["失败数", result.failureCount],
    [],
    ["月度总薪酬", result.summary.totalMonthlyPayroll],
    ["年度总薪酬", result.summary.totalAnnualPayroll],
    ["平均月薪", result.summary.averageMonthly],
    ["平均年薪", result.summary.averageAnnual],
  ];

  const allRows = [headers, ...rows, ...summaryRows];

  return allRows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell || "");
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(",")
    )
    .join("\n");
}

/**
 * 导出批量模拟结果为HTML
 */
export function exportToHTML(result: BatchSimulationResult): string {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>批量薪资模拟报表</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-item { padding: 15px; background: #f8f9fa; border-radius: 4px; }
    .summary-item .label { font-size: 12px; color: #666; }
    .summary-item .value { font-size: 20px; font-weight: bold; color: #f97316; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .success { color: green; }
    .failed { color: red; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>批量薪资模拟报表</h1>
    
    <div class="summary">
      <div class="summary-item">
        <div class="label">总记录数</div>
        <div class="value">${result.totalRecords}</div>
      </div>
      <div class="summary-item">
        <div class="label">成功数</div>
        <div class="value" style="color: green;">${result.successCount}</div>
      </div>
      <div class="summary-item">
        <div class="label">失败数</div>
        <div class="value" style="color: red;">${result.failureCount}</div>
      </div>
      <div class="summary-item">
        <div class="label">成功率</div>
        <div class="value">${result.totalRecords > 0 ? ((result.successCount / result.totalRecords) * 100).toFixed(1) : 0}%</div>
      </div>
    </div>

    <h2>薪酬汇总</h2>
    <table>
      <tr>
        <th>指标</th>
        <th>金额 (元)</th>
      </tr>
      <tr>
        <td>月度总薪酬</td>
        <td>¥${result.summary.totalMonthlyPayroll.toLocaleString()}</td>
      </tr>
      <tr>
        <td>年度总薪酬</td>
        <td>¥${result.summary.totalAnnualPayroll.toLocaleString()}</td>
      </tr>
      <tr>
        <td>平均月薪</td>
        <td>¥${result.summary.averageMonthly.toLocaleString()}</td>
      </tr>
      <tr>
        <td>平均年薪</td>
        <td>¥${result.summary.averageAnnual.toLocaleString()}</td>
      </tr>
    </table>

    <h2>详细计算结果</h2>
    <table>
      <tr>
        <th>员工ID</th>
        <th>员工名称</th>
        <th>部门</th>
        <th>基本工资</th>
        <th>绩效工资</th>
        <th>奖金</th>
        <th>福利补贴</th>
        <th>月度总薪酬</th>
        <th>年度总薪酬</th>
        <th>状态</th>
      </tr>
      ${result.calculations
        .map(
          (calc) => `
      <tr>
        <td>${calc.employeeId}</td>
        <td>${calc.employeeName}</td>
        <td>${calc.department}</td>
        <td>¥${calc.baseSalary.toLocaleString()}</td>
        <td>¥${calc.performanceSalary.toLocaleString()}</td>
        <td>¥${calc.bonus.toLocaleString()}</td>
        <td>¥${calc.benefits.toLocaleString()}</td>
        <td>¥${calc.monthlyTotal.toLocaleString()}</td>
        <td>¥${calc.annualTotal.toLocaleString()}</td>
        <td class="${calc.status}">${calc.status === "success" ? "成功" : "失败"}</td>
      </tr>
      `
        )
        .join("")}
    </table>

    <div class="footer">
      <p>生成时间: ${new Date().toLocaleString()}</p>
      <p>GRT智能系统 - 批量薪资模拟报表</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
