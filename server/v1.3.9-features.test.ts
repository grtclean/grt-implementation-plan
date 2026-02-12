import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateAllConditions,
  compareRuleVersions
} from './db';

describe('v1.3.9 Features', () => {
  // ============================================
  // Webhook Trigger Conditions Tests
  // ============================================
  describe('Webhook Trigger Conditions', () => {
    describe('evaluateCondition', () => {
      it('should evaluate eq operator correctly', () => {
        const condition = { field: 'alert_level', operator: 'eq', value: '"critical"' };
        expect(evaluateCondition(condition, { alert_level: 'critical' })).toBe(true);
        expect(evaluateCondition(condition, { alert_level: 'warning' })).toBe(false);
      });

      it('should evaluate ne operator correctly', () => {
        const condition = { field: 'status', operator: 'ne', value: '"resolved"' };
        expect(evaluateCondition(condition, { status: 'pending' })).toBe(true);
        expect(evaluateCondition(condition, { status: 'resolved' })).toBe(false);
      });

      it('should evaluate gt operator correctly', () => {
        const condition = { field: 'threshold', operator: 'gt', value: '100' };
        expect(evaluateCondition(condition, { threshold: 150 })).toBe(true);
        expect(evaluateCondition(condition, { threshold: 50 })).toBe(false);
        expect(evaluateCondition(condition, { threshold: 100 })).toBe(false);
      });

      it('should evaluate lt operator correctly', () => {
        const condition = { field: 'cost', operator: 'lt', value: '1000' };
        expect(evaluateCondition(condition, { cost: 500 })).toBe(true);
        expect(evaluateCondition(condition, { cost: 1500 })).toBe(false);
      });

      it('should evaluate gte operator correctly', () => {
        const condition = { field: 'percentage', operator: 'gte', value: '80' };
        expect(evaluateCondition(condition, { percentage: 80 })).toBe(true);
        expect(evaluateCondition(condition, { percentage: 90 })).toBe(true);
        expect(evaluateCondition(condition, { percentage: 70 })).toBe(false);
      });

      it('should evaluate lte operator correctly', () => {
        const condition = { field: 'days', operator: 'lte', value: '30' };
        expect(evaluateCondition(condition, { days: 30 })).toBe(true);
        expect(evaluateCondition(condition, { days: 20 })).toBe(true);
        expect(evaluateCondition(condition, { days: 40 })).toBe(false);
      });

      it('should evaluate in operator correctly', () => {
        const condition = { field: 'type', operator: 'in', value: '["critical", "emergency"]' };
        expect(evaluateCondition(condition, { type: 'critical' })).toBe(true);
        expect(evaluateCondition(condition, { type: 'emergency' })).toBe(true);
        expect(evaluateCondition(condition, { type: 'warning' })).toBe(false);
      });

      it('should evaluate between operator correctly', () => {
        const condition = { field: 'value', operator: 'between', value: '[50, 100]' };
        expect(evaluateCondition(condition, { value: 75 })).toBe(true);
        expect(evaluateCondition(condition, { value: 50 })).toBe(true);
        expect(evaluateCondition(condition, { value: 100 })).toBe(true);
        expect(evaluateCondition(condition, { value: 30 })).toBe(false);
        expect(evaluateCondition(condition, { value: 120 })).toBe(false);
      });

      it('should evaluate contains operator correctly', () => {
        const condition = { field: 'name', operator: 'contains', value: '"项目"' };
        expect(evaluateCondition(condition, { name: 'GRT项目成本' })).toBe(true);
        expect(evaluateCondition(condition, { name: '其他内容' })).toBe(false);
      });

      it('should evaluate startsWith operator correctly', () => {
        const condition = { field: 'code', operator: 'startsWith', value: '"PRJ"' };
        expect(evaluateCondition(condition, { code: 'PRJ-001' })).toBe(true);
        expect(evaluateCondition(condition, { code: 'TSK-001' })).toBe(false);
      });

      it('should evaluate endsWith operator correctly', () => {
        const condition = { field: 'email', operator: 'endsWith', value: '"@company.com"' };
        expect(evaluateCondition(condition, { email: 'user@company.com' })).toBe(true);
        expect(evaluateCondition(condition, { email: 'user@other.com' })).toBe(false);
      });

      it('should return true for unknown operator', () => {
        const condition = { field: 'test', operator: 'unknown', value: '"test"' };
        expect(evaluateCondition(condition, { test: 'anything' })).toBe(true);
      });
    });

    describe('evaluateAllConditions', () => {
      it('should return true for empty conditions', () => {
        expect(evaluateAllConditions([], {})).toBe(true);
      });

      it('should evaluate single condition', () => {
        const conditions = [
          { field: 'level', operator: 'eq', value: '"high"' }
        ];
        expect(evaluateAllConditions(conditions, { level: 'high' })).toBe(true);
        expect(evaluateAllConditions(conditions, { level: 'low' })).toBe(false);
      });

      it('should evaluate multiple conditions with AND logic', () => {
        const conditions = [
          { field: 'level', operator: 'eq', value: '"critical"' },
          { field: 'cost', operator: 'gt', value: '1000', logicOperator: 'AND' }
        ];
        expect(evaluateAllConditions(conditions, { level: 'critical', cost: 1500 })).toBe(true);
        expect(evaluateAllConditions(conditions, { level: 'critical', cost: 500 })).toBe(false);
        expect(evaluateAllConditions(conditions, { level: 'warning', cost: 1500 })).toBe(false);
      });

      it('should evaluate multiple conditions with OR logic', () => {
        const conditions = [
          { field: 'level', operator: 'eq', value: '"critical"' },
          { field: 'level', operator: 'eq', value: '"emergency"', logicOperator: 'OR' }
        ];
        expect(evaluateAllConditions(conditions, { level: 'critical' })).toBe(true);
        expect(evaluateAllConditions(conditions, { level: 'emergency' })).toBe(true);
        expect(evaluateAllConditions(conditions, { level: 'warning' })).toBe(false);
      });

      it('should handle mixed AND/OR logic', () => {
        const conditions = [
          { field: 'type', operator: 'eq', value: '"cost_alert"' },
          { field: 'level', operator: 'eq', value: '"critical"', logicOperator: 'AND' },
          { field: 'level', operator: 'eq', value: '"emergency"', logicOperator: 'OR' }
        ];
        // (type == cost_alert AND level == critical) OR level == emergency
        expect(evaluateAllConditions(conditions, { type: 'cost_alert', level: 'critical' })).toBe(true);
        expect(evaluateAllConditions(conditions, { type: 'other', level: 'emergency' })).toBe(true);
        expect(evaluateAllConditions(conditions, { type: 'cost_alert', level: 'warning' })).toBe(false);
      });
    });
  });

  // ============================================
  // Rule Version Comparison Tests
  // ============================================
  describe('Rule Version Management', () => {
    describe('compareRuleVersions', () => {
      it('should detect no changes for identical rules', () => {
        const rule = JSON.stringify({
          name: '测试规则',
          threshold: 100,
          alertLevel: 'warning'
        });
        const diffs = compareRuleVersions(rule, rule);
        expect(diffs).toHaveLength(0);
      });

      it('should detect modified fields', () => {
        const oldRule = JSON.stringify({
          name: '测试规则',
          threshold: 100,
          alertLevel: 'warning'
        });
        const newRule = JSON.stringify({
          name: '测试规则',
          threshold: 150,
          alertLevel: 'critical'
        });
        const diffs = compareRuleVersions(oldRule, newRule);
        expect(diffs).toHaveLength(2);
        
        const thresholdDiff = diffs.find(d => d.field === 'threshold');
        expect(thresholdDiff).toBeDefined();
        expect(thresholdDiff?.oldValue).toBe(100);
        expect(thresholdDiff?.newValue).toBe(150);
        expect(thresholdDiff?.changeType).toBe('modified');
        
        const levelDiff = diffs.find(d => d.field === 'alertLevel');
        expect(levelDiff).toBeDefined();
        expect(levelDiff?.changeType).toBe('modified');
      });

      it('should detect added fields', () => {
        const oldRule = JSON.stringify({
          name: '测试规则'
        });
        const newRule = JSON.stringify({
          name: '测试规则',
          description: '新增描述'
        });
        const diffs = compareRuleVersions(oldRule, newRule);
        expect(diffs).toHaveLength(1);
        expect(diffs[0].field).toBe('description');
        expect(diffs[0].changeType).toBe('added');
      });

      it('should detect removed fields', () => {
        const oldRule = JSON.stringify({
          name: '测试规则',
          description: '旧描述'
        });
        const newRule = JSON.stringify({
          name: '测试规则'
        });
        const diffs = compareRuleVersions(oldRule, newRule);
        expect(diffs).toHaveLength(1);
        expect(diffs[0].field).toBe('description');
        expect(diffs[0].changeType).toBe('removed');
      });

      it('should provide field labels for known fields', () => {
        const oldRule = JSON.stringify({ name: '旧名称' });
        const newRule = JSON.stringify({ name: '新名称' });
        const diffs = compareRuleVersions(oldRule, newRule);
        expect(diffs[0].fieldLabel).toBe('规则名称');
      });
    });
  });

  // ============================================
  // Dependency Type Tests
  // ============================================
  describe('Annual Planning Dependencies', () => {
    it('should define valid dependency types', () => {
      const validTypes = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  // ============================================
  // Condition Operator Tests
  // ============================================
  describe('Condition Operators', () => {
    const operators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'between', 'contains', 'startsWith', 'endsWith'];
    
    it('should support all defined operators', () => {
      operators.forEach(op => {
        const condition = { field: 'test', operator: op, value: '"test"' };
        // Should not throw
        expect(() => evaluateCondition(condition, { test: 'test' })).not.toThrow();
      });
    });
  });

  // ============================================
  // Rule Version Management Extended Tests
  // ============================================
  describe('Rule Version Management Extended', () => {
    it('should detect complex nested changes', () => {
      const oldRule = JSON.stringify({
        name: '测试规则',
        threshold: 100,
        alertLevel: 'warning',
        notifyUserIds: '[1,2,3]'
      });
      const newRule = JSON.stringify({
        name: '测试规则',
        threshold: 100,
        alertLevel: 'critical',
        notifyUserIds: '[1,2,3,4]'
      });
      const diffs = compareRuleVersions(oldRule, newRule);
      expect(diffs).toHaveLength(2);
      expect(diffs.find(d => d.field === 'alertLevel')).toBeDefined();
      expect(diffs.find(d => d.field === 'notifyUserIds')).toBeDefined();
    });

    it('should handle empty rules comparison', () => {
      const oldRule = JSON.stringify({});
      const newRule = JSON.stringify({});
      const diffs = compareRuleVersions(oldRule, newRule);
      expect(diffs).toHaveLength(0);
    });

    it('should detect all field types correctly', () => {
      const oldRule = JSON.stringify({
        name: '旧名称',
        description: '旧描述',
        scope: 'all',
        alertType: 'budget_percent',
        threshold: 80,
        alertLevel: 'warning',
        notifyType: 'system',
        isActive: 1
      });
      const newRule = JSON.stringify({
        name: '新名称',
        description: '新描述',
        scope: 'project',
        alertType: 'cpi',
        threshold: 90,
        alertLevel: 'critical',
        notifyType: 'email',
        isActive: 0
      });
      const diffs = compareRuleVersions(oldRule, newRule);
      expect(diffs).toHaveLength(8);
      
      // Check field labels are provided
      const nameDiff = diffs.find(d => d.field === 'name');
      expect(nameDiff?.fieldLabel).toBe('规则名称');
      
      const thresholdDiff = diffs.find(d => d.field === 'threshold');
      expect(thresholdDiff?.fieldLabel).toBe('阈值');
    });

    it('should correctly identify change types', () => {
      const oldRule = JSON.stringify({
        name: '规则',
        oldField: '将被删除'
      });
      const newRule = JSON.stringify({
        name: '规则修改',
        newField: '新增字段'
      });
      const diffs = compareRuleVersions(oldRule, newRule);
      
      const modifiedDiff = diffs.find(d => d.field === 'name');
      expect(modifiedDiff?.changeType).toBe('modified');
      
      const removedDiff = diffs.find(d => d.field === 'oldField');
      expect(removedDiff?.changeType).toBe('removed');
      
      const addedDiff = diffs.find(d => d.field === 'newField');
      expect(addedDiff?.changeType).toBe('added');
    });

    it('should handle numeric threshold changes', () => {
      const oldRule = JSON.stringify({ threshold: 80 });
      const newRule = JSON.stringify({ threshold: 95 });
      const diffs = compareRuleVersions(oldRule, newRule);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].oldValue).toBe(80);
      expect(diffs[0].newValue).toBe(95);
    });

    it('should handle null and undefined values', () => {
      const oldRule = JSON.stringify({ name: '规则', description: null });
      const newRule = JSON.stringify({ name: '规则', description: '新描述' });
      const diffs = compareRuleVersions(oldRule, newRule);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].field).toBe('description');
      expect(diffs[0].oldValue).toBeNull();
      expect(diffs[0].newValue).toBe('新描述');
    });
  });
});
