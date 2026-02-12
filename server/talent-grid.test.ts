/**
 * GRT智能人才网格单元测试
 * 测试DA订阅、Safety Filter和故障排除引导
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DASubscriptionService, 
  POSITION_ASSISTANT_MAPPING,
  ASSISTANT_CAPABILITIES,
  type PositionType,
  type AssistantType
} from '../shared/daAssistantSubscription';
import {
  SafetyFilter,
  createDefaultSafetyFilter,
  createLLMServiceSafetyIntegration,
  DEFAULT_PHYSICAL_LIMITS,
  type AISuggestion
} from '../shared/safetyFilter';
import {
  TroubleshootingEngine,
  createTroubleshootingEngine,
  FAULT_SYMPTOMS,
  FAULT_CAUSES,
  SOLUTIONS,
  type EquipmentType
} from '../shared/troubleshootingGuide';

// ============================================================================
// DA订阅服务测试
// ============================================================================

describe('DASubscriptionService', () => {
  describe('getAssistantsForPosition', () => {
    it('技术工程师应订阅Engineering_Assistant和Solution_Assistant', () => {
      const result = DASubscriptionService.getAssistantsForPosition('technical_engineer');
      
      expect(result.primary).toContain('Engineering_Assistant');
      expect(result.primary).toContain('Solution_Assistant');
      expect(result.secondary).toContain('Quality_Assistant');
      expect(result.secondary).toContain('Service_Assistant');
    });
    
    it('销售代表应订阅Sales_Assistant和Quotation_Assistant', () => {
      const result = DASubscriptionService.getAssistantsForPosition('sales_representative');
      
      expect(result.primary).toContain('Sales_Assistant');
      expect(result.primary).toContain('Quotation_Assistant');
    });
    
    it('财务人员应订阅Finance_Assistant', () => {
      const result = DASubscriptionService.getAssistantsForPosition('finance_staff');
      
      expect(result.primary).toContain('Finance_Assistant');
    });
    
    it('项目经理应订阅Project_Assistant和Planning_Assistant', () => {
      const result = DASubscriptionService.getAssistantsForPosition('project_manager');
      
      expect(result.primary).toContain('Project_Assistant');
      expect(result.primary).toContain('Planning_Assistant');
    });
    
    it('每个岗位都应有继承的能力列表', () => {
      const positions: PositionType[] = [
        'technical_engineer',
        'sales_representative',
        'project_manager',
        'finance_staff'
      ];
      
      for (const position of positions) {
        const result = DASubscriptionService.getAssistantsForPosition(position);
        expect(result.capabilities.length).toBeGreaterThan(0);
      }
    });
    
    it('每个岗位都应有逻辑链配置', () => {
      const positions: PositionType[] = [
        'technical_engineer',
        'sales_representative',
        'project_manager'
      ];
      
      for (const position of positions) {
        const result = DASubscriptionService.getAssistantsForPosition(position);
        expect(result.logicChains.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('getAssistantCapabilities', () => {
    it('Engineering_Assistant应有故障诊断能力', () => {
      const capabilities = DASubscriptionService.getAssistantCapabilities('Engineering_Assistant');
      
      const faultDiagnosis = capabilities.find(c => c.capabilityId === 'fault_diagnosis');
      expect(faultDiagnosis).toBeDefined();
      expect(faultDiagnosis?.category).toBe('analysis');
    });
    
    it('Sales_Assistant应有客户沟通能力', () => {
      const capabilities = DASubscriptionService.getAssistantCapabilities('Sales_Assistant');
      
      const customerComm = capabilities.find(c => c.capabilityId === 'customer_communication');
      expect(customerComm).toBeDefined();
      expect(customerComm?.category).toBe('communication');
    });
    
    it('Finance_Assistant应有报销审计能力', () => {
      const capabilities = DASubscriptionService.getAssistantCapabilities('Finance_Assistant');
      
      const expenseAudit = capabilities.find(c => c.capabilityId === 'expense_audit');
      expect(expenseAudit).toBeDefined();
    });
  });
  
  describe('checkCapabilityAccess', () => {
    it('技能等级足够时应允许访问', () => {
      const capability = {
        capabilityId: 'test',
        capabilityName: '测试能力',
        category: 'action' as const,
        description: '测试',
        requiredSkillLevel: 3 as const
      };
      
      expect(DASubscriptionService.checkCapabilityAccess(3, capability)).toBe(true);
      expect(DASubscriptionService.checkCapabilityAccess(4, capability)).toBe(true);
      expect(DASubscriptionService.checkCapabilityAccess(5, capability)).toBe(true);
    });
    
    it('技能等级不足时应拒绝访问', () => {
      const capability = {
        capabilityId: 'test',
        capabilityName: '测试能力',
        category: 'action' as const,
        description: '测试',
        requiredSkillLevel: 4 as const
      };
      
      expect(DASubscriptionService.checkCapabilityAccess(1, capability)).toBe(false);
      expect(DASubscriptionService.checkCapabilityAccess(2, capability)).toBe(false);
      expect(DASubscriptionService.checkCapabilityAccess(3, capability)).toBe(false);
    });
  });
  
  describe('generateDAConfig', () => {
    it('应生成正确的DA配置', () => {
      const config = DASubscriptionService.generateDAConfig(
        'EMP001',
        'technical_engineer',
        4
      );
      
      expect(config.daId).toBe('DA-EMP001');
      expect(config.employeeId).toBe('EMP001');
      expect(config.subscribedAssistants.length).toBeGreaterThan(0);
      expect(config.permissionLevel).toBe('advanced');
    });
    
    it('技能等级1应获得basic权限', () => {
      const config = DASubscriptionService.generateDAConfig('EMP002', 'finance_staff', 1);
      expect(config.permissionLevel).toBe('basic');
    });
    
    it('技能等级5应获得expert权限', () => {
      const config = DASubscriptionService.generateDAConfig('EMP003', 'general_manager', 5);
      expect(config.permissionLevel).toBe('expert');
    });
  });
});

// ============================================================================
// Safety Filter测试
// ============================================================================

describe('SafetyFilter', () => {
  let filter: SafetyFilter;
  
  beforeEach(() => {
    filter = createDefaultSafetyFilter();
  });
  
  describe('物理参数限制检查', () => {
    it('温度在安全范围内应通过', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST001',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 60,
        unit: '°C'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(true);
      expect(result.intercepted).toBe(false);
    });
    
    it('温度超出绝对最大值应被拦截', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST002',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 250,
        unit: '°C'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
      expect(result.intercepted).toBe(true);
      expect(result.errorCode).toBe('AI_003');
    });
    
    it('铝材温度超过80°C应被拦截', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST003',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 90,
        unit: '°C',
        materialType: 'aluminum'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
      expect(result.intercepted).toBe(true);
    });
    
    it('压力在安全范围内应通过', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST004',
        suggestionType: 'parameter_change',
        targetParameter: 'pressure',
        suggestedValue: 5,
        unit: 'bar'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(true);
    });
    
    it('压力超出最大值应被拦截', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST005',
        suggestionType: 'parameter_change',
        targetParameter: 'pressure',
        suggestedValue: 25,
        unit: 'bar'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
      expect(result.intercepted).toBe(true);
    });
    
    it('接近警告阈值应产生警告或通过', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST006',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 145,
        unit: '°C'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      // 145°C在安全范围内(max 200°C)，应该通过
      expect(result.passed).toBe(true);
    });
  });
  
  describe('材质-参数冲突检测', () => {
    it('铝材pH值超出范围应被拦截', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST007',
        suggestionType: 'parameter_change',
        targetParameter: 'ph_value',
        suggestedValue: 11,
        unit: 'pH',
        materialType: 'aluminum'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
    });
    
    it('塑料材质温度限制应生效', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST008',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 70,
        unit: '°C',
        materialType: 'plastic'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
    });
  });
  
  describe('设备特定限制检测', () => {
    it('高压清洗机压力限制应生效', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST009',
        suggestionType: 'parameter_change',
        targetParameter: 'pressure',
        suggestedValue: 18,
        unit: 'bar',
        equipmentType: 'high_pressure_washer'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
    });
    
    it('超声波清洗机温度限制应生效', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST010',
        suggestionType: 'parameter_change',
        targetParameter: 'temperature',
        suggestedValue: 85,
        unit: '°C',
        equipmentType: 'ultrasonic_cleaner'
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
    });
  });
  
  describe('操作员资质检查', () => {
    it('技能等级不足修改高级参数应被拦截', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST011',
        suggestionType: 'parameter_change',
        targetParameter: 'pressure',
        suggestedValue: 5,
        unit: 'bar',
        operatorId: 'OP001',
        operatorSkillLevel: 2
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(false);
      expect(result.errorCode).toBe('AI_012');
    });
    
    it('技能等级足够应允许修改', async () => {
      const suggestion: AISuggestion = {
        suggestionId: 'TEST012',
        suggestionType: 'parameter_change',
        targetParameter: 'pressure',
        suggestedValue: 5,
        unit: 'bar',
        operatorId: 'OP002',
        operatorSkillLevel: 4
      };
      
      const result = await filter.checkSuggestion(suggestion);
      expect(result.passed).toBe(true);
    });
  });
  
  describe('getSafeRange', () => {
    it('应返回正确的安全范围', () => {
      const range = filter.getSafeRange('temperature');
      
      expect(range).not.toBeNull();
      expect(range?.min).toBe(-40);
      expect(range?.max).toBe(200);
      expect(range?.unit).toBe('°C');
    });
    
    it('材质特定范围应覆盖默认范围', () => {
      const range = filter.getSafeRange('temperature', 'aluminum');
      
      expect(range).not.toBeNull();
      expect(range?.max).toBe(80);
    });
    
    it('设备特定范围应覆盖默认范围', () => {
      const range = filter.getSafeRange('pressure', undefined, 'high_pressure_washer');
      
      expect(range).not.toBeNull();
      expect(range?.max).toBe(15);
    });
  });
});

describe('LLMServiceSafetyIntegration', () => {
  it('应正确集成到LLM服务', async () => {
    const integration = createLLMServiceSafetyIntegration();
    
    const suggestion: AISuggestion = {
      suggestionId: 'INT001',
      suggestionType: 'parameter_change',
      targetParameter: 'temperature',
      suggestedValue: 60,
      unit: '°C'
    };
    
    const result = await integration.validateAISuggestion(suggestion);
    expect(result.passed).toBe(true);
  });
  
  it('应正确检查操作权限', () => {
    const integration = createLLMServiceSafetyIntegration();
    
    const operation: AISuggestion = {
      suggestionId: 'INT002',
      suggestionType: 'parameter_change',
      targetParameter: 'voltage',
      suggestedValue: 380
    };
    
    const result = integration.checkOperationPermission(2, operation);
    expect(result.allowed).toBe(false);
    expect(result.requiredLevel).toBe(3);
  });
});

// ============================================================================
// 故障排除引擎测试
// ============================================================================

describe('TroubleshootingEngine', () => {
  let engine: TroubleshootingEngine;
  
  beforeEach(() => {
    engine = createTroubleshootingEngine();
  });
  
  describe('症状匹配', () => {
    it('应根据关键词匹配症状', () => {
      const matches = engine.matchSymptoms(['功率', '清洗效果']);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].symptomId).toBe('SYM_USC_001');
    });
    
    it('应根据设备类型过滤症状', () => {
      const matches = engine.matchSymptoms(['压力'], 'spray_washer');
      
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match.applicableEquipment).toContain('spray_washer');
      }
    });
    
    it('无匹配时应返回空数组', () => {
      const matches = engine.matchSymptoms(['不存在的关键词xyz']);
      expect(matches.length).toBe(0);
    });
  });
  
  describe('原因分析', () => {
    it('应返回可能的故障原因', () => {
      const causes = engine.getPossibleCauses('SYM_USC_001');
      
      expect(causes.length).toBeGreaterThan(0);
    });
    
    it('原因应按概率排序', () => {
      const causes = engine.getPossibleCauses('SYM_USC_001');
      
      for (let i = 1; i < causes.length; i++) {
        expect(causes[i - 1].probability).toBeGreaterThanOrEqual(causes[i].probability);
      }
    });
  });
  
  describe('解决方案获取', () => {
    it('应返回对应的解决方案', () => {
      const solutions = engine.getSolutions('CAU_USC_001');
      
      expect(solutions.length).toBeGreaterThan(0);
    });
    
    it('解决方案应按成功率排序', () => {
      const solutions = engine.getSolutions('CAU_USC_001');
      
      for (let i = 1; i < solutions.length; i++) {
        expect(solutions[i - 1].successRate).toBeGreaterThanOrEqual(solutions[i].successRate);
      }
    });
  });
  
  describe('引导路径生成', () => {
    it('应生成完整的引导路径', () => {
      const path = engine.generateGuidancePath('SYM_USC_001', 4);
      
      expect(path.steps.length).toBeGreaterThan(0);
      expect(path.estimatedTime).toBeGreaterThan(0);
      expect(path.confidenceScore).toBeGreaterThan(0);
      expect(path.confidenceScore).toBeLessThanOrEqual(90);
    });
    
    it('技能等级不足时应包含升级步骤', () => {
      const path = engine.generateGuidancePath('SYM_USC_001', 1);
      
      const escalateSteps = path.steps.filter(s => s.stepType === 'escalate');
      expect(escalateSteps.length).toBeGreaterThan(0);
    });
    
    it('高技能等级应包含更多诊断步骤', () => {
      const lowSkillPath = engine.generateGuidancePath('SYM_USC_001', 2);
      const highSkillPath = engine.generateGuidancePath('SYM_USC_001', 5);
      
      const lowDiagnoseSteps = lowSkillPath.steps.filter(s => s.stepType === 'diagnose');
      const highDiagnoseSteps = highSkillPath.steps.filter(s => s.stepType === 'diagnose');
      
      expect(highDiagnoseSteps.length).toBeGreaterThanOrEqual(lowDiagnoseSteps.length);
    });
  });
  
  describe('会话管理', () => {
    it('应创建新的故障排除会话', () => {
      const session = engine.startSession('ultrasonic_cleaner', ['功率不足']);
      
      expect(session.sessionId).toBeDefined();
      expect(session.status).toBe('in_progress');
      expect(session.equipmentType).toBe('ultrasonic_cleaner');
    });
    
    it('应记录诊断结果', () => {
      const session = engine.startSession('ultrasonic_cleaner', ['功率不足']);
      
      engine.recordDiagnosticResult(
        session.sessionId,
        '检查发生器功率',
        '功率输出正常',
        '测试备注'
      );
      
      const updatedSession = engine.getSession(session.sessionId);
      expect(updatedSession?.diagnosticHistory.length).toBe(1);
    });
    
    it('应完成故障排除会话', () => {
      const session = engine.startSession('ultrasonic_cleaner', ['功率不足']);
      
      engine.completeSession(
        session.sessionId,
        'CAU_USC_003',
        'SOL_USC_003'
      );
      
      const completedSession = engine.getSession(session.sessionId);
      expect(completedSession?.status).toBe('resolved');
      expect(completedSession?.resolvedCause).toBe('CAU_USC_003');
    });
    
    it('应升级故障排除会话', () => {
      const session = engine.startSession('ultrasonic_cleaner', ['功率不足']);
      
      engine.escalateSession(session.sessionId, '需要高级工程师支持');
      
      const escalatedSession = engine.getSession(session.sessionId);
      expect(escalatedSession?.status).toBe('escalated');
    });
  });
  
  describe('知识库完整性', () => {
    it('所有症状应有有效的设备类型', () => {
      const symptoms = engine.getAllSymptoms();
      
      for (const symptom of symptoms) {
        expect(symptom.applicableEquipment.length).toBeGreaterThan(0);
      }
    });
    
    it('所有解决方案应有完整的步骤', () => {
      const solutions = engine.getAllSolutions();
      
      for (const solution of solutions) {
        expect(solution.steps.length).toBeGreaterThan(0);
        expect(solution.estimatedTime).toBeGreaterThan(0);
        expect(solution.successRate).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('智能人才网格集成测试', () => {
  it('DA配置应与Safety Filter协同工作', async () => {
    // 生成技术工程师DA配置
    const daConfig = DASubscriptionService.generateDAConfig(
      'ENG001',
      'technical_engineer',
      4
    );
    
    // 创建安全过滤器
    const filter = createDefaultSafetyFilter();
    
    // 模拟AI建议
    const suggestion: AISuggestion = {
      suggestionId: 'INT_TEST_001',
      suggestionType: 'parameter_change',
      targetParameter: 'temperature',
      suggestedValue: 75,
      unit: '°C',
      materialType: 'aluminum',
      operatorId: daConfig.employeeId,
      operatorSkillLevel: 4
    };
    
    // 检查建议安全性
    const result = await filter.checkSuggestion(suggestion);
    
    // 铝材温度限制为80°C，75°C应该通过
    expect(result.passed).toBe(true);
  });
  
  it('故障排除应与DA能力匹配', () => {
    // 获取技术工程师的能力
    const capabilities = DASubscriptionService.getAssistantsForPosition('technical_engineer');
    
    // 创建故障排除引擎
    const engine = createTroubleshootingEngine();
    
    // 生成引导路径（技能等级4）
    const path = engine.generateGuidancePath('SYM_USC_001', 4);
    
    // 技术工程师应有足够能力执行大部分诊断步骤
    const diagnoseSteps = path.steps.filter(s => s.stepType === 'diagnose');
    const escalateSteps = path.steps.filter(s => s.stepType === 'escalate');
    
    expect(diagnoseSteps.length).toBeGreaterThan(escalateSteps.length);
  });
});
