/**
 * BU事业部映射服务单元测试
 */

import { describe, it, expect } from 'vitest';
import { 
  matchBUByDeptName, 
  DEFAULT_BUS, 
  BU_KEYWORDS,
  type BUCode 
} from './bu-mapping.service';

describe('BU Mapping Service', () => {
  describe('DEFAULT_BUS', () => {
    it('should have 5 business units defined', () => {
      expect(DEFAULT_BUS).toHaveLength(5);
    });

    it('should have correct BU codes', () => {
      const codes = DEFAULT_BUS.map(bu => bu.code);
      expect(codes).toEqual(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']);
    });

    it('should have correct BU names', () => {
      expect(DEFAULT_BUS[0].name).toBe('BU1 - 海外事业部');
      expect(DEFAULT_BUS[1].name).toBe('BU2 - 商用车事业部');
      expect(DEFAULT_BUS[2].name).toBe('BU3 - 乘用车事业部');
      expect(DEFAULT_BUS[3].name).toBe('BU4 - 半导体事业部');
      expect(DEFAULT_BUS[4].name).toBe('BU5 - 工业通用事业部');
    });

    it('should have descriptions for all BUs', () => {
      DEFAULT_BUS.forEach(bu => {
        expect(bu.description).toBeTruthy();
        expect(bu.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('BU_KEYWORDS', () => {
    it('should have keywords for all 5 BUs', () => {
      const buCodes: BUCode[] = ['BU1', 'BU2', 'BU3', 'BU4', 'BU5'];
      buCodes.forEach(code => {
        expect(BU_KEYWORDS[code]).toBeDefined();
        expect(BU_KEYWORDS[code].length).toBeGreaterThan(0);
      });
    });

    it('should have overseas-related keywords for BU1', () => {
      const bu1Keywords = BU_KEYWORDS['BU1'];
      expect(bu1Keywords.some(kw => kw.includes('海外') || kw.includes('overseas'))).toBe(true);
    });

    it('should have commercial vehicle keywords for BU2', () => {
      const bu2Keywords = BU_KEYWORDS['BU2'];
      expect(bu2Keywords.some(kw => kw.includes('商用车') || kw.includes('commercial'))).toBe(true);
    });

    it('should have passenger vehicle keywords for BU3', () => {
      const bu3Keywords = BU_KEYWORDS['BU3'];
      expect(bu3Keywords.some(kw => kw.includes('乘用车') || kw.includes('passenger'))).toBe(true);
    });

    it('should have semiconductor keywords for BU4', () => {
      const bu4Keywords = BU_KEYWORDS['BU4'];
      expect(bu4Keywords.some(kw => kw.includes('半导体') || kw.includes('semiconductor'))).toBe(true);
    });

    it('should have industrial/general keywords for BU5', () => {
      const bu5Keywords = BU_KEYWORDS['BU5'];
      expect(bu5Keywords.some(kw => kw.includes('工业') || kw.includes('通用'))).toBe(true);
    });
  });

  describe('matchBUByDeptName', () => {
    it('should match BU1 for overseas-related department names', () => {
      expect(matchBUByDeptName('海外销售部')).toBe('BU1');
      expect(matchBUByDeptName('Overseas Sales')).toBe('BU1');
      expect(matchBUByDeptName('出口业务部')).toBe('BU1');
    });

    it('should match BU2 for commercial vehicle department names', () => {
      expect(matchBUByDeptName('商用车事业部')).toBe('BU2');
      expect(matchBUByDeptName('Commercial Vehicle Division')).toBe('BU2');
      expect(matchBUByDeptName('卡车清洗设备部')).toBe('BU2');
    });

    it('should match BU3 for passenger vehicle department names', () => {
      expect(matchBUByDeptName('乘用车事业部')).toBe('BU3');
      expect(matchBUByDeptName('Passenger Car Division')).toBe('BU3');
      expect(matchBUByDeptName('轿车清洗设备部')).toBe('BU3');
    });

    it('should match BU4 for semiconductor department names', () => {
      expect(matchBUByDeptName('半导体事业部')).toBe('BU4');
      expect(matchBUByDeptName('Semiconductor Division')).toBe('BU4');
      expect(matchBUByDeptName('芯片清洗设备部')).toBe('BU4');
      expect(matchBUByDeptName('晶圆清洗部')).toBe('BU4');
    });

    it('should match BU5 for industrial/general department names', () => {
      expect(matchBUByDeptName('工业通用事业部')).toBe('BU5');
      expect(matchBUByDeptName('General Industrial Division')).toBe('BU5');
      expect(matchBUByDeptName('通用设备部')).toBe('BU5');
    });

    it('should return null for unmatched department names', () => {
      expect(matchBUByDeptName('人力资源部')).toBe(null);
      expect(matchBUByDeptName('财务部')).toBe(null);
      expect(matchBUByDeptName('IT部门')).toBe(null);
    });

    it('should be case insensitive', () => {
      expect(matchBUByDeptName('OVERSEAS SALES')).toBe('BU1');
      expect(matchBUByDeptName('semiconductor')).toBe('BU4');
    });
  });
});
