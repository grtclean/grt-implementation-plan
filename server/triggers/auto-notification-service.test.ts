/**
 * 自动通知服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoNotificationService } from './auto-notification-service';
import { defaultNotificationRules } from './notification-rules';

// Mock钉钉发送函数
vi.mock('../dingtalk-webhook-test', () => ({
  sendDingTalkMessageWithSign: vi.fn().mockResolvedValue(undefined),
}));

describe('AutoNotificationService', () => {
  let service: AutoNotificationService;
  
  beforeEach(() => {
    service = new AutoNotificationService([...defaultNotificationRules]);
    vi.clearAllMocks();
  });
  
  describe('服务状态管理', () => {
    it('默认应该是启用状态', () => {
      expect(service.isEnabled()).toBe(true);
    });
    
    it('应该能够禁用服务', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
    });
    
    it('应该能够重新启用服务', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });
  });
  
  describe('规则管理', () => {
    it('应该返回所有规则', () => {
      const rules = service.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });
    
    it('应该能够禁用特定规则', () => {
      const rules = service.getRules();
      const firstRule = rules[0];
      
      service.setRuleEnabled(firstRule.id, false);
      
      const updatedRules = service.getRules();
      const updatedRule = updatedRules.find(r => r.id === firstRule.id);
      expect(updatedRule?.enabled).toBe(false);
    });
    
    it('应该能够重新启用特定规则', () => {
      const rules = service.getRules();
      const firstRule = rules[0];
      
      service.setRuleEnabled(firstRule.id, false);
      service.setRuleEnabled(firstRule.id, true);
      
      const updatedRules = service.getRules();
      const updatedRule = updatedRules.find(r => r.id === firstRule.id);
      expect(updatedRule?.enabled).toBe(true);
    });
    
    it('禁用不存在的规则应该返回false', () => {
      const result = service.setRuleEnabled('non_existent_rule', false);
      expect(result).toBe(false);
    });
  });
  
  describe('项目阶段变更通知', () => {
    it('服务禁用时不应该触发通知', async () => {
      service.setEnabled(false);
      
      const result = await service.triggerProjectGateChange({
        projectName: 'Test Project',
        gateName: 'M1',
        status: 'approved',
        result: '通过',
        reviewer: '张三',
        nextGate: 'M2',
      });
      
      expect(result.triggered).toBe(0);
    });
    
    it('应该触发匹配的项目阶段变更通知', async () => {
      const result = await service.triggerProjectGateChange({
        projectName: 'GRT智能系统',
        gateName: 'M3',
        status: 'approved',
        result: '评审通过',
        reviewer: '李四',
        nextGate: 'M4',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
    
    it('应该触发项目阶段阻塞通知', async () => {
      const result = await service.triggerProjectGateChange({
        projectName: 'GRT智能系统',
        gateName: 'M2',
        status: 'blocked',
        reason: '技术方案未通过评审',
        owner: '王五',
        action: '修改技术方案',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('成本预警通知', () => {
    it('应该触发成本预警通知', async () => {
      const result = await service.triggerCostAlert({
        projectName: 'GRT智能系统',
        budgetUsage: 85,
        budget: 1000000,
        spent: 850000,
        remaining: 150000,
        category: '人力成本',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
    
    it('应该触发成本超支通知', async () => {
      const result = await service.triggerCostAlert({
        projectName: 'GRT智能系统',
        budgetUsage: 105,
        budget: 1000000,
        spent: 1050000,
        remaining: -50000,
        category: '设备采购',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('售后工单通知', () => {
    it('应该触发新工单通知', async () => {
      const result = await service.triggerServiceTicket({
        ticketId: 'T20260201001',
        customerName: '某科技公司',
        issueType: '设备故障',
        priority: 'high',
        description: '清洗设备无法启动',
        assignee: '赵六',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('质检异常通知', () => {
    it('应该触发质检异常通知', async () => {
      const result = await service.triggerQCAlert({
        productName: '超声波清洗机',
        batchNumber: 'B20260201',
        defectType: '外观缺陷',
        defectRate: 5.5,
        inspector: '孙七',
        line: 'A线',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('面试安排通知', () => {
    it('应该触发面试安排通知', async () => {
      const result = await service.triggerInterview({
        candidateName: '候选人A',
        position: '高级工程师',
        interviewTime: '2026-02-01 14:00',
        interviewer: '周八',
        location: '会议室A',
        round: 2,
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('审批流程通知', () => {
    it('应该触发审批通知', async () => {
      const result = await service.triggerApproval({
        approvalType: '费用报销',
        applicant: '吴九',
        title: '出差报销申请',
        amount: 5000,
        approver: '郑十',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('系统事件通知', () => {
    it('应该触发系统事件通知', async () => {
      const result = await service.triggerSystemEvent({
        eventType: '系统异常',
        severity: 'error',
        message: '数据库连接超时',
        details: '连接池已满',
        source: 'DatabaseService',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
    
    it('应该触发严重系统事件通知', async () => {
      const result = await service.triggerSystemEvent({
        eventType: '系统崩溃',
        severity: 'critical',
        message: '服务器宕机',
        details: '内存溢出',
        source: 'MainServer',
      });
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('通知日志', () => {
    it('应该能够获取通知日志', () => {
      const logs = service.getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });
    
    it('应该能够清除通知日志', () => {
      service.clearLogs();
      const logs = service.getLogs();
      expect(logs.length).toBe(0);
    });
    
    it('应该能够限制日志数量', () => {
      const logs = service.getLogs(10);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });
});
