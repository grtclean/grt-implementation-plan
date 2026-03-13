/**
 * 员工管理服务单元测试
 * v1.3.91 - 组织架构人员清单管理
 */

import { describe, it, expect } from 'vitest';
import { 
  getBUCodeFromDepartment, 
  BU_CODE_TO_NAME 
} from './employee.service';

describe('Employee Service', () => {
  describe('getBUCodeFromDepartment', () => {
    it('should return BU1 for 事业一部', () => {
      expect(getBUCodeFromDepartment('事业一部')).toBe('BU1');
    });

    it('should return BU2 for 事业二部', () => {
      expect(getBUCodeFromDepartment('事业二部')).toBe('BU2');
    });

    it('should return BU3 for 事业三部', () => {
      expect(getBUCodeFromDepartment('事业三部')).toBe('BU3');
    });

    it('should return BU4 for 事业四部', () => {
      expect(getBUCodeFromDepartment('事业四部')).toBe('BU4');
    });

    it('should return BU5 for 事业十部', () => {
      expect(getBUCodeFromDepartment('事业十部')).toBe('BU5');
    });

    it('should return HQ for 总裁办', () => {
      expect(getBUCodeFromDepartment('总裁办')).toBe('HQ');
    });

    it('should return FIN for 财务部', () => {
      expect(getBUCodeFromDepartment('财务部')).toBe('FIN');
    });

    it('should return HR for 人事行政部', () => {
      expect(getBUCodeFromDepartment('人事行政部')).toBe('HR');
    });

    it('should return IT for AI数智部', () => {
      expect(getBUCodeFromDepartment('AI数智部')).toBe('IT');
    });

    it('should return SUP for 事业部支持部', () => {
      expect(getBUCodeFromDepartment('事业部支持部')).toBe('SUP');
    });

    it('should return null for unknown department', () => {
      expect(getBUCodeFromDepartment('未知部门')).toBeNull();
    });
  });

  describe('BU_CODE_TO_NAME', () => {
    it('should have correct name for BU1', () => {
      expect(BU_CODE_TO_NAME['BU1']).toBe('海外事业部');
    });

    it('should have correct name for BU2', () => {
      expect(BU_CODE_TO_NAME['BU2']).toBe('商用车事业部');
    });

    it('should have correct name for BU3', () => {
      expect(BU_CODE_TO_NAME['BU3']).toBe('乘用车事业部');
    });

    it('should have correct name for BU4', () => {
      expect(BU_CODE_TO_NAME['BU4']).toBe('半导体事业部');
    });

    it('should have correct name for BU5', () => {
      expect(BU_CODE_TO_NAME['BU5']).toBe('工业通用事业部');
    });

    it('should have correct name for HQ', () => {
      expect(BU_CODE_TO_NAME['HQ']).toBe('总部');
    });

    it('should have correct name for FIN', () => {
      expect(BU_CODE_TO_NAME['FIN']).toBe('财务部');
    });

    it('should have correct name for HR', () => {
      expect(BU_CODE_TO_NAME['HR']).toBe('人事行政部');
    });

    it('should have correct name for IT', () => {
      expect(BU_CODE_TO_NAME['IT']).toBe('AI数智部');
    });

    it('should have correct name for SUP', () => {
      expect(BU_CODE_TO_NAME['SUP']).toBe('事业部支持部');
    });

    it('should have 10 BU codes defined', () => {
      expect(Object.keys(BU_CODE_TO_NAME).length).toBe(10);
    });
  });

  describe('Department to BU mapping consistency', () => {
    const departmentToBU: Record<string, string> = {
      '事业一部': 'BU1',
      '事业二部': 'BU2',
      '事业三部': 'BU3',
      '事业四部': 'BU4',
      '事业十部': 'BU5',
      '总裁办': 'HQ',
      '财务部': 'FIN',
      '人事行政部': 'HR',
      'AI数智部': 'IT',
      '事业部支持部': 'SUP',
    };

    it('should have all departments mapped to valid BU codes', () => {
      for (const [dept, buCode] of Object.entries(departmentToBU)) {
        expect(getBUCodeFromDepartment(dept)).toBe(buCode);
        expect(BU_CODE_TO_NAME[buCode]).toBeDefined();
      }
    });

    it('should have consistent BU code to name mapping', () => {
      const expectedNames: Record<string, string> = {
        'BU1': '海外事业部',
        'BU2': '商用车事业部',
        'BU3': '乘用车事业部',
        'BU4': '半导体事业部',
        'BU5': '工业通用事业部',
      };

      for (const [buCode, name] of Object.entries(expectedNames)) {
        expect(BU_CODE_TO_NAME[buCode]).toBe(name);
      }
    });
  });

  describe('Employee data validation', () => {
    // 验证员工数据结构
    const sampleEmployees = [
      {employeeId: "GRT001", name: "倪亚东", department: "总裁办", position: "董事长"},
      {employeeId: "GRT004", name: "戴晓燕", department: "事业一部", position: "高级销售经理"},
      {employeeId: "GRT006", name: "洪香龙", department: "事业二部", position: "机械设计经理"},
      {employeeId: "GRT007", name: "孙坚", department: "事业三部", position: "电气主管"},
      {employeeId: "GRT018", name: "孙国祥", department: "事业四部", position: "电气工程师"},
      {employeeId: "GRT008", name: "马柯", department: "事业十部", position: "质量专员"},
    ];

    it('should have valid employee IDs starting with GRT', () => {
      for (const emp of sampleEmployees) {
        expect(emp.employeeId).toMatch(/^GRT\d+/);
      }
    });

    it('should have non-empty names', () => {
      for (const emp of sampleEmployees) {
        expect(emp.name.length).toBeGreaterThan(0);
      }
    });

    it('should have valid departments that map to BU codes', () => {
      for (const emp of sampleEmployees) {
        const buCode = getBUCodeFromDepartment(emp.department);
        expect(buCode).not.toBeNull();
      }
    });

    it('should have non-empty positions', () => {
      for (const emp of sampleEmployees) {
        expect(emp.position.length).toBeGreaterThan(0);
      }
    });
  });
});
