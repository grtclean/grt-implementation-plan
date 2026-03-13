/**
 * Proposal Export Service — GRT 标准工艺方案导出
 *
 * 支持导出格式: Word (DOCX), PDF, Markdown
 * 模板: GRT 清洗工艺方案标准格式
 */

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export type ProposalExportFormat = "docx" | "pdf" | "markdown" | "html";

export interface ProposalExportData {
  // 需求信息
  requirement: {
    workpieceName: string;
    workpieceNameEn?: string;
    workpieceMaterial?: string;
    customerName?: string;
    projectNo?: string;
    particleLimit?: {
      maxParticleSize?: number;
      maxParticleCount?: number;
      standard?: string;
    };
    cycleTime?: number;
    dailyCapacity?: number;
  };
  // 方案信息
  proposal: {
    id: number;
    benchmarkProjects?: Array<{
      projectNo: string;
      customerName: string;
      workpiece: string;
      similarity: number;
      deliveryYear: number;
      equipmentModel: string;
      highlights: string[];
    }>;
    processFlow?: {
      stages: Array<{
        stageNo: number;
        stageName: string;
        stageNameEn: string;
        processType: string;
        duration: number;
        temperature?: number;
        description: string;
      }>;
      totalCycleTime: number;
      layoutType: string;
      automationLevel: string;
    };
    equipmentConfig?: {
      mainEquipment: Array<{
        name: string;
        model: string;
        quantity: number;
      }>;
      auxiliaryEquipment: Array<{
        name: string;
        model: string;
        quantity: number;
      }>;
      chemicals: Array<{
        name: string;
        type: string;
        consumption: string;
      }>;
    };
    competitorAnalysis?: {
      competitors: Array<{
        name: string;
        country: string;
        strengths: string[];
        weaknesses: string[];
      }>;
      ourAdvantages: string[];
      ourChallenges: string[];
      winStrategy: string;
    };
    budgetEstimate?: {
      equipmentCost: { min: number; max: number; currency: string };
      installationCost: { min: number; max: number; currency: string };
      totalProjectCost: { min: number; max: number; currency: string };
      paybackPeriodMonths: number;
      confidence: number;
    };
    createdAt: string;
  };
  // 导出选项
  exportedBy?: string;
  includeBenchmarkProjects?: boolean;  // 是否包含历史对标项目
  includeCompetitorAnalysis?: boolean; // 是否包含竞品分析
  includeBudgetEstimate?: boolean;     // 是否包含预算预估
}

/**
 * 格式化货币
 */
function formatCurrency(value: number, currency: string = "CNY"): string {
  if (currency === "CNY") {
    return `¥${value.toLocaleString("zh-CN")}`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

/**
 * 导出方案为 Markdown 格式
 */
export function exportProposalAsMarkdown(data: ProposalExportData): string {
  const { requirement: req, proposal } = data;
  const now = new Date();

  let md = "";

  // ═══════════════════════════════════════════════════════════════
  // 封面信息
  // ═══════════════════════════════════════════════════════════════
  md += `# GRT 清洗工艺方案建议书\n\n`;
  md += `## ${req.workpieceName}${req.workpieceNameEn ? ` (${req.workpieceNameEn})` : ""}\n\n`;

  md += `| 项目信息 | 内容 |\n`;
  md += `|----------|------|\n`;
  md += `| 客户名称 | ${req.customerName || "—"} |\n`;
  md += `| 项目编号 | ${req.projectNo || "待分配"} |\n`;
  md += `| 工件材料 | ${req.workpieceMaterial || "—"} |\n`;
  md += `| 方案编号 | SP-${String(proposal.id).padStart(6, "0")} |\n`;
  md += `| 生成日期 | ${format(now, "yyyy年MM月dd日", { locale: zhCN })} |\n\n`;

  md += `---\n\n`;

  // ═══════════════════════════════════════════════════════════════
  // 一、技术需求摘要
  // ═══════════════════════════════════════════════════════════════
  md += `## 一、技术需求摘要\n\n`;

  md += `### 1.1 清洁度要求\n\n`;
  if (req.particleLimit) {
    md += `| 指标 | 要求值 |\n`;
    md += `|------|--------|\n`;
    if (req.particleLimit.maxParticleSize) {
      md += `| 最大颗粒物尺寸 | ≤${req.particleLimit.maxParticleSize} μm |\n`;
    }
    if (req.particleLimit.maxParticleCount) {
      md += `| 最大颗粒物数量 | ≤${req.particleLimit.maxParticleCount} 个 |\n`;
    }
    md += `| 执行标准 | ${req.particleLimit.standard || "VDA 19.1"} |\n\n`;
  } else {
    md += `*清洁度要求待确认*\n\n`;
  }

  md += `### 1.2 产能要求\n\n`;
  md += `| 指标 | 要求值 |\n`;
  md += `|------|--------|\n`;
  md += `| 节拍时间 | ${req.cycleTime ? `${req.cycleTime} 秒/件` : "待确认"} |\n`;
  md += `| 日产能 | ${req.dailyCapacity ? `${req.dailyCapacity} 件/天` : "待确认"} |\n\n`;

  // ═══════════════════════════════════════════════════════════════
  // 二、历史对标项目 (可选)
  // ═══════════════════════════════════════════════════════════════
  if (data.includeBenchmarkProjects !== false && proposal.benchmarkProjects && proposal.benchmarkProjects.length > 0) {
    md += `## 二、历史对标项目\n\n`;
    md += `> GRT 已成功交付以下类似项目，为本方案提供经验支撑：\n\n`;

    for (const proj of proposal.benchmarkProjects) {
      md += `### ${proj.projectNo}\n\n`;
      md += `| 属性 | 详情 |\n`;
      md += `|------|------|\n`;
      md += `| 客户 | ${proj.customerName} |\n`;
      md += `| 工件 | ${proj.workpiece} |\n`;
      md += `| 设备型号 | ${proj.equipmentModel} |\n`;
      md += `| 交付年份 | ${proj.deliveryYear}年 |\n`;
      md += `| 相似度 | ${proj.similarity}% |\n\n`;

      if (proj.highlights && proj.highlights.length > 0) {
        md += `**项目亮点:** ${proj.highlights.join("、")}\n\n`;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 三、推荐工艺流程
  // ═══════════════════════════════════════════════════════════════
  if (proposal.processFlow) {
    const pf = proposal.processFlow;
    md += `## 三、推荐工艺流程\n\n`;

    md += `| 布局类型 | 自动化等级 | 总节拍 |\n`;
    md += `|----------|------------|--------|\n`;
    md += `| ${pf.layoutType} | ${pf.automationLevel} | ${pf.totalCycleTime} 秒 |\n\n`;

    md += `### 3.1 工艺流程图\n\n`;
    md += "```\n";
    md += pf.stages.map((s, i) => {
      const arrow = i < pf.stages.length - 1 ? " → " : "";
      return `[${s.stageNo}. ${s.stageName}]${arrow}`;
    }).join("");
    md += "\n```\n\n";

    md += `### 3.2 工位详情\n\n`;
    md += `| 工位 | 名称 | 类型 | 时间 | 温度 | 说明 |\n`;
    md += `|------|------|------|------|------|------|\n`;
    for (const stage of pf.stages) {
      md += `| ${stage.stageNo} | ${stage.stageName} | ${stage.processType} | ${stage.duration}s | ${stage.temperature ? `${stage.temperature}°C` : "—"} | ${stage.description} |\n`;
    }
    md += `\n`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 四、设备配置建议
  // ═══════════════════════════════════════════════════════════════
  if (proposal.equipmentConfig) {
    const ec = proposal.equipmentConfig;
    md += `## 四、设备配置建议\n\n`;

    md += `### 4.1 主要设备\n\n`;
    md += `| 设备名称 | 型号 | 数量 |\n`;
    md += `|----------|------|------|\n`;
    for (const eq of ec.mainEquipment) {
      md += `| ${eq.name} | ${eq.model} | ${eq.quantity} 台 |\n`;
    }
    md += `\n`;

    if (ec.auxiliaryEquipment && ec.auxiliaryEquipment.length > 0) {
      md += `### 4.2 辅助设备\n\n`;
      md += `| 设备名称 | 型号 | 数量 |\n`;
      md += `|----------|------|------|\n`;
      for (const eq of ec.auxiliaryEquipment) {
        md += `| ${eq.name} | ${eq.model} | ${eq.quantity} 台 |\n`;
      }
      md += `\n`;
    }

    if (ec.chemicals && ec.chemicals.length > 0) {
      md += `### 4.3 清洗介质\n\n`;
      md += `| 名称 | 类型 | 消耗量 |\n`;
      md += `|------|------|--------|\n`;
      for (const chem of ec.chemicals) {
        md += `| ${chem.name} | ${chem.type} | ${chem.consumption} |\n`;
      }
      md += `\n`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 五、竞品分析
  // ═══════════════════════════════════════════════════════════════
  if (data.includeCompetitorAnalysis !== false && proposal.competitorAnalysis) {
    const ca = proposal.competitorAnalysis;
    md += `## 五、竞品分析 (SWOT)\n\n`;

    for (const comp of ca.competitors) {
      md += `### ${comp.name} (${comp.country})\n\n`;
      md += `| 优势 | 劣势 |\n`;
      md += `|------|------|\n`;
      const maxLen = Math.max(comp.strengths.length, comp.weaknesses.length);
      for (let i = 0; i < maxLen; i++) {
        md += `| ${comp.strengths[i] || ""} | ${comp.weaknesses[i] || ""} |\n`;
      }
      md += `\n`;
    }

    md += `### GRT 竞争优势\n\n`;
    for (const adv of ca.ourAdvantages) {
      md += `- ✅ ${adv}\n`;
    }
    md += `\n`;

    if (ca.winStrategy) {
      md += `**制胜策略:** ${ca.winStrategy}\n\n`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 六、预算预估
  // ═══════════════════════════════════════════════════════════════
  if (data.includeBudgetEstimate !== false && proposal.budgetEstimate) {
    const be = proposal.budgetEstimate;
    md += `## 六、预算预估\n\n`;

    md += `> ⚠️ 以下预算为初步估算，最终报价以正式商务报价单为准。\n\n`;

    md += `| 项目 | 预算范围 |\n`;
    md += `|------|----------|\n`;
    md += `| 设备成本 | ${formatCurrency(be.equipmentCost.min)} - ${formatCurrency(be.equipmentCost.max)} |\n`;
    md += `| 安装调试 | ${formatCurrency(be.installationCost.min)} - ${formatCurrency(be.installationCost.max)} |\n`;
    md += `| **项目总预算** | **${formatCurrency(be.totalProjectCost.min)} - ${formatCurrency(be.totalProjectCost.max)}** |\n\n`;

    md += `| 指标 | 数值 |\n`;
    md += `|------|------|\n`;
    md += `| 投资回收期 | ${be.paybackPeriodMonths} 个月 |\n`;
    md += `| 估算置信度 | ${be.confidence}% |\n\n`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 页脚
  // ═══════════════════════════════════════════════════════════════
  md += `---\n\n`;
  md += `**GRT 集团 — 工业清洗设备专家**\n\n`;
  md += `*本方案由 GRT Solution Engine AI 系统生成*\n\n`;
  md += `导出时间: ${format(now, "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}\n`;
  if (data.exportedBy) {
    md += `导出人员: ${data.exportedBy}\n`;
  }

  return md;
}

/**
 * 导出方案为 HTML 格式 (可转 PDF)
 */
export function exportProposalAsHTML(data: ProposalExportData): string {
  const markdown = exportProposalAsMarkdown(data);

  // 简单的 Markdown 到 HTML 转换
  let html = markdown
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, '<blockquote class="note">$1</blockquote>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/---/g, "<hr/>")
    .replace(/```\n?([\s\S]*?)\n?```/g, "<pre><code>$1</code></pre>");

  // 处理表格
  const tableRegex = /\|(.+)\|\n\|[-|]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (_, header, rows) => {
    const headers = header.split("|").filter(Boolean).map((h: string) => `<th>${h.trim()}</th>`).join("");
    const bodyRows = rows.trim().split("\n").map((row: string) => {
      const cells = row.split("|").filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="grt-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GRT 清洗工艺方案 - ${data.requirement.workpieceName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
    }
    h1 { color: #1e40af; font-size: 24px; margin-bottom: 20px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1e40af; font-size: 18px; margin: 30px 0 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    h3 { color: #374151; font-size: 14px; margin: 20px 0 10px; }
    p { margin: 10px 0; }
    .grt-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12px;
    }
    .grt-table th {
      background: #1e40af;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    .grt-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .grt-table tr:nth-child(even) { background: #f9fafb; }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 10px 15px;
      margin: 15px 0;
      font-size: 13px;
    }
    pre {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      font-family: Consolas, monospace;
      font-size: 12px;
      overflow-x: auto;
    }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
    li { margin-left: 20px; }
    strong { color: #1e40af; }
    @media print {
      body { padding: 15mm; }
      h2 { page-break-after: avoid; }
      .grt-table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
}
