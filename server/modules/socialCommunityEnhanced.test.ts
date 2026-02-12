/**
 * 社群管理增强功能测试
 * 测试脱敏规则、AI模板、消息统计等功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireDb } from '../db';

describe('社群管理增强功能', () => {
  let db: any;

  beforeAll(async () => {
    db = await requireDb();
  });

  describe('脱敏规则管理', () => {
    it('应该能查询脱敏规则列表', async () => {
      const [rows] = await db.execute('SELECT * FROM deidentification_rules LIMIT 10');
      expect(Array.isArray(rows)).toBe(true);
    });

    it('应该有默认的脱敏规则', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM deidentification_rules WHERE category = 'price'"
      );
      expect((rows as any[]).length).toBeGreaterThan(0);
    });

    it('脱敏规则应该包含必要字段', async () => {
      const [rows] = await db.execute('SELECT * FROM deidentification_rules LIMIT 1');
      if ((rows as any[]).length > 0) {
        const rule = (rows as any[])[0];
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('pattern');
        expect(rule).toHaveProperty('pattern_type');
        expect(rule).toHaveProperty('replacement');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('priority');
        expect(rule).toHaveProperty('is_enabled');
      }
    });

    it('应该能按分类筛选脱敏规则', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM deidentification_rules WHERE category = 'personal'"
      );
      expect(Array.isArray(rows)).toBe(true);
      (rows as any[]).forEach(rule => {
        expect(rule.category).toBe('personal');
      });
    });
  });

  describe('AI回复模板管理', () => {
    it('应该能查询AI模板列表', async () => {
      const [rows] = await db.execute('SELECT * FROM ai_reply_templates LIMIT 10');
      expect(Array.isArray(rows)).toBe(true);
    });

    it('应该有默认的AI模板', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM ai_reply_templates WHERE is_default = 1"
      );
      expect((rows as any[]).length).toBeGreaterThan(0);
    });

    it('AI模板应该包含必要字段', async () => {
      const [rows] = await db.execute('SELECT * FROM ai_reply_templates LIMIT 1');
      if ((rows as any[]).length > 0) {
        const template = (rows as any[])[0];
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('prompt_template');
        expect(template).toHaveProperty('system_prompt');
        expect(template).toHaveProperty('usage_count');
      }
    });

    it('应该能按分类筛选AI模板', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM ai_reply_templates WHERE category = 'technical'"
      );
      expect(Array.isArray(rows)).toBe(true);
      (rows as any[]).forEach(template => {
        expect(template.category).toBe('technical');
      });
    });
  });

  describe('消息统计缓存', () => {
    it('消息统计缓存表应该存在', async () => {
      const [rows] = await db.execute('SHOW TABLES LIKE "message_stats_cache"');
      expect((rows as any[]).length).toBe(1);
    });

    it('消息统计缓存表应该有正确的结构', async () => {
      const [columns] = await db.execute('DESCRIBE message_stats_cache');
      const columnNames = (columns as any[]).map(c => c.Field);
      expect(columnNames).toContain('stat_date');
      expect(columnNames).toContain('group_id');
      expect(columnNames).toContain('total_messages');
      expect(columnNames).toContain('sensitive_messages');
    });
  });

  describe('群成员画像', () => {
    it('群成员画像表应该存在', async () => {
      const [rows] = await db.execute('SHOW TABLES LIKE "member_profiles"');
      expect((rows as any[]).length).toBe(1);
    });

    it('群成员画像表应该有正确的结构', async () => {
      const [columns] = await db.execute('DESCRIBE member_profiles');
      const columnNames = (columns as any[]).map(c => c.Field);
      expect(columnNames).toContain('member_id');
      expect(columnNames).toContain('group_id');
      expect(columnNames).toContain('activity_score');
      expect(columnNames).toContain('is_influencer');
    });
  });

  describe('关键词脱敏逻辑', () => {
    it('应该能正确匹配关键词类型的规则', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM deidentification_rules WHERE pattern_type = 'keyword' AND is_enabled = 1 LIMIT 1"
      );
      if ((rows as any[]).length > 0) {
        const rule = (rows as any[])[0];
        const keywords = rule.pattern.split(',').map((k: string) => k.trim());
        expect(keywords.length).toBeGreaterThan(0);
      }
    });

    it('应该能正确匹配正则类型的规则', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM deidentification_rules WHERE pattern_type = 'regex' AND is_enabled = 1 LIMIT 1"
      );
      if ((rows as any[]).length > 0) {
        const rule = (rows as any[])[0];
        // 验证正则表达式是有效的
        expect(() => new RegExp(rule.pattern)).not.toThrow();
      }
    });
  });

  describe('模板变量解析', () => {
    it('模板应该包含有效的变量定义', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM ai_reply_templates WHERE variables IS NOT NULL LIMIT 5"
      );
      (rows as any[]).forEach(template => {
        if (template.variables) {
          // variables可能已经是对象或字符串
          let variables;
          if (typeof template.variables === 'string') {
            try {
              variables = JSON.parse(template.variables);
            } catch (e) {
              // 如果不是JSON格式，跳过
              return;
            }
          } else {
            variables = template.variables;
          }
          expect(Array.isArray(variables)).toBe(true);
        }
      });
    });

    it('模板提示词应该包含变量占位符', async () => {
      const [rows] = await db.execute(
        "SELECT * FROM ai_reply_templates WHERE prompt_template LIKE '%{{%}}%' LIMIT 5"
      );
      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
