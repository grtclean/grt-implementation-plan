/**
 * Service Report Generator Service
 * Multi-language service report generation from templates
 */

export interface ServiceReportData {
  ticketId: string;
  reportDate: string;
  language: string;
  clientName: string;
  clientTier: string;
  serialNumber: string;
  modelName: string;
  serviceType: string;
  priority: string;
  issueDescription: string;
  workPerformed: string;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  assignedEngineerName?: string;
  completionDate?: string;
}

interface LanguageConfig {
  name: string;
  title: string;
  sections: {
    summary: string;
    equipment: string;
    issue: string;
    solution: string;
    parts: string;
    cost: string;
    recommendation: string;
    signature: string;
  };
}

interface GeneratedReport {
  language: string;
  title: string;
  content: string;
  aiGenerated: boolean;
  sections: {
    summary: string;
    equipment: string;
    issue: string;
    solution: string;
    parts: string;
    cost: string;
    recommendation: string;
  };
}

export const REPORT_LANGUAGES: Record<string, LanguageConfig> = {
  zh: {
    name: "中文",
    title: "服务报告",
    sections: {
      summary: "服务摘要",
      equipment: "设备信息",
      issue: "问题描述",
      solution: "解决方案",
      parts: "配件使用",
      cost: "费用明细",
      recommendation: "建议",
      signature: "签名确认",
    },
  },
  en: {
    name: "English",
    title: "Service Report",
    sections: {
      summary: "Service Summary",
      equipment: "Equipment Information",
      issue: "Issue Description",
      solution: "Solution",
      parts: "Parts Used",
      cost: "Cost Breakdown",
      recommendation: "Recommendations",
      signature: "Signature Confirmation",
    },
  },
  de: {
    name: "Deutsch",
    title: "Servicebericht",
    sections: {
      summary: "Servicezusammenfassung",
      equipment: "Geräteinformationen",
      issue: "Problembeschreibung",
      solution: "Lösung",
      parts: "Verwendete Teile",
      cost: "Kostenübersicht",
      recommendation: "Empfehlungen",
      signature: "Unterschriftsbestätigung",
    },
  },
};

export class ServiceReportGeneratorService {
  static generateReportFromTemplate(
    data: ServiceReportData,
    language: string
  ): GeneratedReport {
    const lang = REPORT_LANGUAGES[language] || REPORT_LANGUAGES.zh;

    const summarySection = `${lang.sections.summary}\n工单号: ${data.ticketId}\n日期: ${data.reportDate}\n客户: ${data.clientName}\n服务类型: ${data.serviceType}`;
    const equipmentSection = `${lang.sections.equipment}\n序列号: ${data.serialNumber}\n型号: ${data.modelName}`;
    const issueSection = `${lang.sections.issue}\n${data.issueDescription}`;
    const solutionSection = `${lang.sections.solution}\n${data.workPerformed}`;
    const partsSection = `${lang.sections.parts}`;
    const costSection = `${lang.sections.cost}\n人工费: ${data.laborCost}\n配件费: ${data.partsCost}\n合计: ${data.totalCost}`;
    const recommendationSection = `${lang.sections.recommendation}`;

    const contentParts = [
      `${lang.title}`,
      ``,
      summarySection,
      ``,
      equipmentSection,
      ``,
      issueSection,
      ``,
      solutionSection,
      ``,
      costSection,
    ];

    const content = contentParts.join("\n");

    return {
      language,
      title: lang.title,
      content,
      aiGenerated: false,
      sections: {
        summary: summarySection,
        equipment: equipmentSection,
        issue: issueSection,
        solution: solutionSection,
        parts: partsSection,
        cost: costSection,
        recommendation: recommendationSection,
      },
    };
  }
}
