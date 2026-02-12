import { describe, it, expect } from 'vitest';
import {
  getCleaningStrategy,
  getAllCleaningStrategies,
  analyzePartFeatures,
  handleToothpasteTestFailure,
  getEngineerCheckpoints,
  getAllEngineerCheckpoints,
  validateEngineerConfirmation,
  generateTechnicalProposalSummary,
  generateIOList,
} from './services/grt-cleaning-strategy.service';

describe('GRT清洗策略动作库服务', () => {
  describe('getCleaningStrategy', () => {
    it('应该返回盲孔清洗策略', () => {
      const strategy = getCleaningStrategy('blind_hole');
      expect(strategy).toBeDefined();
      expect(strategy.featureType).toBe('blind_hole');
      expect(strategy.recommendedAction).toBeDefined();
      expect(strategy.recommendedAction).toBe('spiral_tilt');
    });

    it('应该返回加强筋清洗策略', () => {
      const strategy = getCleaningStrategy('ribbing');
      expect(strategy).toBeDefined();
      expect(strategy.featureType).toBe('ribbing');
    });

    it('应该返回密封面清洗策略', () => {
      const strategy = getCleaningStrategy('sealing_face');
      expect(strategy).toBeDefined();
      expect(strategy.featureType).toBe('sealing_face');
      expect(strategy.recommendedAction).toBe('overlap_scan'); // 密封面使用重叠扫描
    });
  });

  describe('getAllCleaningStrategies', () => {
    it('应该返回所有清洗策略', () => {
      const strategies = getAllCleaningStrategies();
      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('应该包含所有特征类型的策略', () => {
      const strategies = getAllCleaningStrategies();
      const featureTypes = strategies.map(s => s.featureType);
      expect(featureTypes).toContain('blind_hole');
      expect(featureTypes).toContain('ribbing');
      expect(featureTypes).toContain('sealing_face');
    });
  });

  describe('analyzePartFeatures', () => {
    it('应该分析单个特征并返回推荐策略', () => {
      const result = analyzePartFeatures(['blind_hole']);
      expect(result).toBeDefined();
      expect(result.strategies).toBeDefined();
      expect(result.strategies.length).toBeGreaterThan(0);
    });

    it('应该分析多个特征并返回组合策略', () => {
      const result = analyzePartFeatures(['blind_hole', 'sealing_face', 'thread']);
      expect(result).toBeDefined();
      expect(result.strategies.length).toBeGreaterThanOrEqual(3);
    });

    it('应该返回节拍时间估算', () => {
      const result = analyzePartFeatures(['blind_hole', 'ribbing']);
      expect(result.cycleTimeEstimate).toBeDefined();
      expect(result.cycleTimeEstimate).toBeGreaterThan(0);
    });

    it('应该返回布局建议', () => {
      const result = analyzePartFeatures(['blind_hole', 'ribbing']);
      expect(result.layoutRecommendation).toBeDefined();
    });
  });

  describe('handleToothpasteTestFailure', () => {
    it('应该处理牙膏试验失败并返回调整建议', () => {
      const result = handleToothpasteTestFailure([
        { zone: 'A1', description: '盲孔底部残留', severity: 'moderate' },
        { zone: 'B2', description: '密封面边缘残留', severity: 'minor' },
      ]);
      expect(result).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('应该返回需要重新测试的标志', () => {
      const result = handleToothpasteTestFailure([
        { zone: 'C3', description: '深腔内大面积残留', severity: 'severe' },
      ]);
      expect(result.retestRequired).toBe(true);
    });
  });

  describe('getEngineerCheckpoints', () => {
    it('应该返回M0阶段的检查点', () => {
      const checkpoints = getEngineerCheckpoints('M0');
      expect(checkpoints).toBeDefined();
      expect(Array.isArray(checkpoints)).toBe(true);
    });

    it('应该返回M8阶段的检查点（牙膏试验）', () => {
      const checkpoints = getEngineerCheckpoints('M8');
      expect(checkpoints).toBeDefined();
      expect(checkpoints.length).toBeGreaterThan(0);
      // M8阶段应该包含牙膏试验检查点
      const toothpasteCheckpoint = checkpoints.find(cp => 
        cp.checkpointName.includes('牙膏试验')
      );
      expect(toothpasteCheckpoint).toBeDefined();
    });
  });

  describe('getAllEngineerCheckpoints', () => {
    it('应该返回所有阶段的检查点', () => {
      const allCheckpoints = getAllEngineerCheckpoints();
      expect(allCheckpoints).toBeDefined();
      expect(Array.isArray(allCheckpoints)).toBe(true);
      expect(allCheckpoints.length).toBeGreaterThan(0);
    });

    it('应该包含M0-M12所有阶段的检查点', () => {
      const allCheckpoints = getAllEngineerCheckpoints();
      const phaseCodes = [...new Set(allCheckpoints.map(cp => cp.phaseCode))];
      expect(phaseCodes).toContain('M0');
      expect(phaseCodes).toContain('M1');
      expect(phaseCodes).toContain('M8');
      expect(phaseCodes).toContain('M12');
    });
  });

  describe('validateEngineerConfirmation', () => {
    it('应该验证所有必须检查点已确认', () => {
      const checkpoints = getEngineerCheckpoints('M0');
      const confirmations = checkpoints.map((cp: any) => ({
        checkpointId: cp.checkpointId,
        confirmed: true,
        confirmedBy: 'engineer1',
      }));
      const result = validateEngineerConfirmation('M0', confirmations);
      expect(result.allConfirmed).toBe(true);
    });

    it('应该检测未确认的必须检查点', () => {
      const result = validateEngineerConfirmation('M0', []);
      expect(result.allConfirmed).toBe(false);
      expect(result.pendingCheckpoints.length).toBeGreaterThan(0);
    });
  });

  describe('generateTechnicalProposalSummary', () => {
    it('应该生成技术方案摘要', () => {
      const result = generateTechnicalProposalSummary(['blind_hole', 'sealing_face'], 60);
      expect(result).toBeDefined();
      expect(result.cleaningDifficulties).toBeDefined();
      expect(result.cleaningDifficulties.length).toBeGreaterThan(0);
    });

    it('应该包含节拍时间计算', () => {
      const result = generateTechnicalProposalSummary(['blind_hole'], 45);
      expect(result.cycleTimeCalculation).toBeDefined();
      expect(result.cycleTimeCalculation.totalCycleTime).toBeDefined();
      expect(result.cycleTimeCalculation.meetsTarget).toBeDefined();
    });

    it('应该包含布局建议', () => {
      const result = generateTechnicalProposalSummary(['blind_hole', 'ribbing'], 60);
      expect(result.layoutSuggestion).toBeDefined();
    });

    it('应该包含泵选型建议', () => {
      const result = generateTechnicalProposalSummary(['deep_cavity'], 60);
      expect(result.pumpSizing).toBeDefined();
    });
  });

  describe('generateIOList', () => {
    it('应该生成西门子PLC I/O列表', () => {
      const ioList = generateIOList();
      expect(ioList).toBeDefined();
      expect(ioList.inputs).toBeDefined();
      expect(ioList.outputs).toBeDefined();
    });

    it('应该包含标准I/O配置', () => {
      const ioList = generateIOList();
      expect(ioList.inputs.length).toBeGreaterThan(0);
      expect(ioList.outputs.length).toBeGreaterThan(0);
    });

    it('应该包含必要的输入信号', () => {
      const ioList = generateIOList();
      const inputNames = ioList.inputs.map(i => i.name);
      expect(inputNames).toContain('Robot_Enter_Request');
      expect(inputNames).toContain('Emergency_Stop');
    });

    it('应该包含必要的输出信号', () => {
      const ioList = generateIOList();
      const outputNames = ioList.outputs.map(o => o.name);
      expect(outputNames).toContain('Pump_Run');
      expect(outputNames).toContain('Robot_Enable');
    });
  });
});
