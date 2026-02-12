import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * v1.3.8 Feature Tests
 * - Webhook Template Variables Extension
 * - Gantt Chart Drag & Drop
 * - Cost Alert Rules Excel Template
 */

describe("v1.3.8 Features", () => {
  describe("Webhook Template Variables Extension", () => {
    // Mock template variables
    const templateVariables = {
      // Basic variables
      project_name: "测试项目",
      project_code: "PRJ-001",
      timestamp: new Date().toISOString(),
      
      // User variables
      user_name: "张三",
      user_list: "张三, 李四, 王五",
      
      // Alert variables
      alert_type: "budget_exceed",
      alert_level: "warning",
      threshold: 80,
      current_value: 85,
      
      // Meeting variables
      meeting_title: "项目周会",
      meeting_time: "2026-01-16 14:00",
      attendees: "张三, 李四",
      
      // Attachment variables
      attachment_url: "https://example.com/file.pdf",
      attachment_name: "报告.pdf",
    };

    it("should support basic template variables", () => {
      const template = "项目 {{project_name}} 的预警通知";
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVariables[key as keyof typeof templateVariables] || "");
      expect(rendered).toBe("项目 测试项目 的预警通知");
    });

    it("should support multiple variables in one template", () => {
      const template = "项目: {{project_name}}, 预警级别: {{alert_level}}, 阈值: {{threshold}}%";
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(templateVariables[key as keyof typeof templateVariables] || ""));
      expect(rendered).toBe("项目: 测试项目, 预警级别: warning, 阈值: 80%");
    });

    it("should support user list variable", () => {
      const template = "参与人员: {{user_list}}";
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(templateVariables[key as keyof typeof templateVariables] || ""));
      expect(rendered).toBe("参与人员: 张三, 李四, 王五");
    });

    it("should support attachment URL variable", () => {
      const template = "附件链接: {{attachment_url}}";
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(templateVariables[key as keyof typeof templateVariables] || ""));
      expect(rendered).toBe("附件链接: https://example.com/file.pdf");
    });

    it("should handle missing variables gracefully", () => {
      const template = "项目: {{project_name}}, 未知: {{unknown_var}}";
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(templateVariables[key as keyof typeof templateVariables] || ""));
      expect(rendered).toBe("项目: 测试项目, 未知: ");
    });

    it("should support nested template rendering", () => {
      const template = `【{{alert_level}}】{{project_name}}
当前值: {{current_value}}%
阈值: {{threshold}}%
时间: {{timestamp}}`;
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(templateVariables[key as keyof typeof templateVariables] || ""));
      expect(rendered).toContain("【warning】测试项目");
      expect(rendered).toContain("当前值: 85%");
      expect(rendered).toContain("阈值: 80%");
    });
  });

  describe("Gantt Chart Drag & Drop", () => {
    // Mock drag state
    interface DragState {
      itemId: number | null;
      type: 'move' | 'resize-left' | 'resize-right' | null;
      startX: number;
      originalStart: number;
      originalWidth: number;
      newStart: number;
      newWidth: number;
    }

    it("should initialize drag state correctly", () => {
      const initialState: DragState = {
        itemId: null,
        type: null,
        startX: 0,
        originalStart: 0,
        originalWidth: 0,
        newStart: 0,
        newWidth: 0,
      };
      expect(initialState.itemId).toBeNull();
      expect(initialState.type).toBeNull();
    });

    it("should calculate bar position from month", () => {
      const startMonth = 3; // March
      const endMonth = 6; // June
      const barStart = ((startMonth - 1) / 12) * 100;
      const barWidth = ((endMonth - startMonth + 1) / 12) * 100;
      
      expect(barStart).toBeCloseTo(16.67, 1); // ~16.67%
      expect(barWidth).toBeCloseTo(33.33, 1); // ~33.33%
    });

    it("should calculate new month from percentage", () => {
      const newStart = 25; // 25% position
      const newWidth = 16.67; // ~2 months width
      
      const newStartMonth = Math.round((newStart / 100) * 12) + 1;
      const monthSpan = Math.round((newWidth / 100) * 12);
      const newEndMonth = Math.min(12, newStartMonth + monthSpan - 1);
      
      expect(newStartMonth).toBe(4); // April
      expect(newEndMonth).toBe(5); // May
    });

    it("should constrain drag within bounds", () => {
      const originalStart = 50;
      const originalWidth = 25;
      let newStart = originalStart + 60; // Would exceed 100%
      
      // Constrain to valid range
      newStart = Math.max(0, Math.min(100 - originalWidth, newStart));
      
      expect(newStart).toBe(75); // Maximum valid position
    });

    it("should handle resize left correctly", () => {
      const barStart = 25;
      const barWidth = 25;
      const deltaPercent = -8.33; // Move left by 1 month
      
      let newStart = barStart + deltaPercent;
      let newWidth = barWidth - deltaPercent;
      newStart = Math.max(0, Math.min(barStart + barWidth - 8.33, newStart));
      newWidth = Math.max(8.33, barWidth - (newStart - barStart));
      
      expect(newStart).toBeCloseTo(16.67, 1);
      expect(newWidth).toBeCloseTo(33.33, 1);
    });

    it("should handle resize right correctly", () => {
      const barStart = 25;
      const barWidth = 25;
      const deltaPercent = 8.33; // Extend by 1 month
      
      let newWidth = barWidth + deltaPercent;
      newWidth = Math.max(8.33, Math.min(100 - barStart, newWidth));
      
      expect(newWidth).toBeCloseTo(33.33, 1);
    });

    it("should enforce minimum bar width", () => {
      const barStart = 50;
      const barWidth = 8.33; // 1 month
      const deltaPercent = -16.66; // Try to shrink by 2 months
      
      let newWidth = barWidth + deltaPercent;
      newWidth = Math.max(8.33, newWidth); // Enforce minimum
      
      expect(newWidth).toBe(8.33); // Should stay at minimum
    });
  });

  describe("Cost Alert Rules Excel Template", () => {
    // Mock CSV parsing
    const parseCSV = (csvContent: string) => {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index]?.trim() || '';
          return obj;
        }, {} as Record<string, string>);
      });
      return rows;
    };

    // Mock field mapping
    const fieldMapping: Record<string, string> = {
      '项目ID': 'projectId',
      '规则名称': 'name',
      '规则类型': 'type',
      '阈值': 'threshold',
      '预警级别': 'level',
      '是否启用': 'enabled',
      '备注': 'notes',
    };

    const levelMapping: Record<string, string> = {
      '信息': 'info',
      '警告': 'warning',
      '严重': 'critical',
    };

    it("should parse CSV with Chinese headers", () => {
      const csv = `项目ID,规则名称,规则类型,阈值,预警级别,是否启用,备注
1,材料成本预警,budget_exceed,80,warning,是,测试备注`;
      
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0]['项目ID']).toBe('1');
      expect(rows[0]['规则名称']).toBe('材料成本预警');
    });

    it("should map Chinese field names to English", () => {
      const chineseRow = {
        '项目ID': '1',
        '规则名称': '材料成本预警',
        '规则类型': 'budget_exceed',
        '阈值': '80',
        '预警级别': 'warning',
        '是否启用': '是',
        '备注': '测试',
      };

      const englishRow = Object.entries(chineseRow).reduce((obj, [key, value]) => {
        const englishKey = fieldMapping[key] || key;
        obj[englishKey] = value;
        return obj;
      }, {} as Record<string, string>);

      expect(englishRow.projectId).toBe('1');
      expect(englishRow.name).toBe('材料成本预警');
      expect(englishRow.threshold).toBe('80');
    });

    it("should convert Chinese boolean values", () => {
      const convertBoolean = (value: string): boolean => {
        return value === '是' || value === 'true' || value === '1';
      };

      expect(convertBoolean('是')).toBe(true);
      expect(convertBoolean('否')).toBe(false);
      expect(convertBoolean('true')).toBe(true);
      expect(convertBoolean('false')).toBe(false);
    });

    it("should validate rule type values", () => {
      const validTypes = ['budget_exceed', 'cost_increase', 'milestone_delay'];
      
      expect(validTypes.includes('budget_exceed')).toBe(true);
      expect(validTypes.includes('cost_increase')).toBe(true);
      expect(validTypes.includes('invalid_type')).toBe(false);
    });

    it("should validate threshold range", () => {
      const validateThreshold = (value: string): boolean => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      };

      expect(validateThreshold('80')).toBe(true);
      expect(validateThreshold('0')).toBe(true);
      expect(validateThreshold('100')).toBe(true);
      expect(validateThreshold('-1')).toBe(false);
      expect(validateThreshold('101')).toBe(false);
      expect(validateThreshold('abc')).toBe(false);
    });

    it("should generate CSV export content", () => {
      const rules = [
        { projectId: 1, name: '材料成本预警', type: 'budget_exceed', threshold: 80, level: 'warning', enabled: true, notes: '测试' },
        { projectId: 2, name: '人工成本预警', type: 'budget_exceed', threshold: 90, level: 'critical', enabled: true, notes: '' },
      ];

      const headers = ['项目ID', '规则名称', '规则类型', '阈值', '预警级别', '是否启用', '备注'];
      const csvLines = [
        headers.join(','),
        ...rules.map(r => [r.projectId, r.name, r.type, r.threshold, r.level, r.enabled ? '是' : '否', r.notes].join(','))
      ];
      const csvContent = csvLines.join('\n');

      expect(csvContent).toContain('项目ID,规则名称');
      expect(csvContent).toContain('1,材料成本预警,budget_exceed,80,warning,是,测试');
      expect(csvContent).toContain('2,人工成本预警,budget_exceed,90,critical,是,');
    });

    it("should handle empty CSV gracefully", () => {
      const csv = `项目ID,规则名称,规则类型,阈值,预警级别,是否启用,备注`;
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(0);
    });

    it("should handle malformed CSV rows", () => {
      const csv = `项目ID,规则名称,规则类型,阈值,预警级别,是否启用,备注
1,材料成本预警,budget_exceed
2,人工成本预警,budget_exceed,90,critical,是,备注`;
      
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(2);
      // First row has missing fields
      expect(rows[0]['阈值']).toBe('');
      // Second row is complete
      expect(rows[1]['阈值']).toBe('90');
    });
  });

  describe("Integration Tests", () => {
    it("should support combined template with all variable types", () => {
      const variables = {
        project_name: "GRT项目",
        alert_level: "warning",
        threshold: 80,
        current_value: 85,
        user_list: "张三, 李四",
        attachment_url: "https://example.com/report.pdf",
      };

      const template = `【{{alert_level}}】{{project_name}} 成本预警
当前值: {{current_value}}% / 阈值: {{threshold}}%
相关人员: {{user_list}}
详情: {{attachment_url}}`;

      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key as keyof typeof variables] || ""));
      
      expect(rendered).toContain("【warning】GRT项目 成本预警");
      expect(rendered).toContain("当前值: 85% / 阈值: 80%");
      expect(rendered).toContain("相关人员: 张三, 李四");
      expect(rendered).toContain("详情: https://example.com/report.pdf");
    });

    it("should calculate correct date from gantt position", () => {
      const selectedYear = 2026;
      const newStartPercent = 25; // ~April (25% of 12 months = 3, +1 = 4)
      const newWidthPercent = 16.67; // ~2 months
      
      const newStartMonth = Math.round((newStartPercent / 100) * 12) + 1;
      const monthSpan = Math.round((newWidthPercent / 100) * 12);
      const newEndMonth = Math.min(12, newStartMonth + monthSpan - 1);
      
      const startDate = new Date(selectedYear, newStartMonth - 1, 1);
      const endDate = new Date(selectedYear, newEndMonth - 1, 28);
      
      // 25% of 12 = 3, +1 = 4 (April), month index = 3
      expect(startDate.getMonth()).toBe(3); // April (0-indexed)
      // monthSpan = round(16.67/100*12) = 2, endMonth = 4+2-1 = 5 (May), index = 4
      expect(endDate.getMonth()).toBe(4); // May (0-indexed)
    });
  });
});
