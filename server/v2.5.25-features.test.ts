/**
 * v2.5.25 功能测试
 * 生产看板可视化、质检流程集成、工时异常预警
 */

import { describe, it, expect } from 'vitest';

// ==================== 生产看板可视化服务测试 ====================
import {
  calculateEfficiency,
  calculateCompletionRate,
  calculateOnTimeDeliveryRate,
  getPriorityWeight,
  sortByPriority,
  calculateStatusDistribution,
  calculateTaskTypeDistribution,
  calculateWorkerRankings,
  aggregateDashboardMetrics,
  generateDashboardConfigCode,
  validateRefreshInterval,
  formatDashboardForDisplay,
  createProductionDashboardService,
  type WorkOrderSummary,
  type WorkerEfficiency,
  type ProductionDashboardData
} from './services/production-dashboard.service';

describe('生产看板可视化服务', () => {
  describe('效率计算', () => {
    it('应正确计算效率百分比', () => {
      expect(calculateEfficiency(10, 10)).toBe(100);
      expect(calculateEfficiency(10, 8)).toBe(125);
      expect(calculateEfficiency(10, 12)).toBe(83);
    });

    it('应处理边界情况', () => {
      expect(calculateEfficiency(0, 10)).toBe(0);
      expect(calculateEfficiency(10, 0)).toBe(0);
      expect(calculateEfficiency(0, 0)).toBe(0);
    });
  });

  describe('完成率计算', () => {
    it('应正确计算完成率', () => {
      expect(calculateCompletionRate(5, 10)).toBe(50);
      expect(calculateCompletionRate(10, 10)).toBe(100);
      expect(calculateCompletionRate(0, 10)).toBe(0);
    });

    it('应处理零总数', () => {
      expect(calculateCompletionRate(0, 0)).toBe(0);
    });
  });

  describe('准时交付率计算', () => {
    it('应正确计算准时交付率', () => {
      expect(calculateOnTimeDeliveryRate(9, 10)).toBe(90);
      expect(calculateOnTimeDeliveryRate(10, 10)).toBe(100);
    });

    it('应处理零交付', () => {
      expect(calculateOnTimeDeliveryRate(0, 0)).toBe(0);
    });
  });

  describe('优先级处理', () => {
    it('应返回正确的优先级权重', () => {
      expect(getPriorityWeight('Top_Urgent')).toBe(3);
      expect(getPriorityWeight('Urgent')).toBe(2);
      expect(getPriorityWeight('Normal')).toBe(1);
      expect(getPriorityWeight('Unknown')).toBe(0);
    });

    it('应按优先级排序', () => {
      const items = [
        { priority: 'Normal' },
        { priority: 'Top_Urgent' },
        { priority: 'Urgent' }
      ];
      const sorted = sortByPriority(items);
      expect(sorted[0].priority).toBe('Top_Urgent');
      expect(sorted[1].priority).toBe('Urgent');
      expect(sorted[2].priority).toBe('Normal');
    });
  });

  describe('状态分布计算', () => {
    it('应正确计算状态分布', () => {
      const items = [
        { status: 'In_Progress' },
        { status: 'In_Progress' },
        { status: 'Completed' },
        { status: 'Pending' }
      ];
      const distribution = calculateStatusDistribution(items);
      
      expect(distribution.length).toBe(3);
      const inProgress = distribution.find(d => d.status === 'In_Progress');
      expect(inProgress?.count).toBe(2);
      expect(inProgress?.percentage).toBe(50);
    });

    it('应处理空数组', () => {
      const distribution = calculateStatusDistribution([]);
      expect(distribution.length).toBe(0);
    });
  });

  describe('任务类型分布计算', () => {
    it('应正确计算任务类型分布', () => {
      const tasks = [
        { taskType: 'Mech_Assy', status: 'Completed' },
        { taskType: 'Mech_Assy', status: 'In_Progress' },
        { taskType: 'Elec_Assy', status: 'Completed' }
      ];
      const distribution = calculateTaskTypeDistribution(tasks);
      
      expect(distribution.length).toBe(2);
      const mechAssy = distribution.find(d => d.taskType === 'Mech_Assy');
      expect(mechAssy?.count).toBe(2);
      expect(mechAssy?.completedCount).toBe(1);
      expect(mechAssy?.inProgressCount).toBe(1);
    });
  });

  describe('工人效率排名', () => {
    it('应正确计算排名', () => {
      const workers: Omit<WorkerEfficiency, 'ranking'>[] = [
        { workerId: 1, workerName: 'Worker A', tasksCompleted: 5, totalEstimatedHours: 40, totalActualHours: 38, efficiency: 105, qualityPassRate: 95 },
        { workerId: 2, workerName: 'Worker B', tasksCompleted: 4, totalEstimatedHours: 32, totalActualHours: 35, efficiency: 91, qualityPassRate: 90 },
        { workerId: 3, workerName: 'Worker C', tasksCompleted: 6, totalEstimatedHours: 48, totalActualHours: 40, efficiency: 120, qualityPassRate: 98 }
      ];
      
      const ranked = calculateWorkerRankings(workers);
      expect(ranked[0].ranking).toBe(1);
      expect(ranked[0].workerName).toBe('Worker C');
      expect(ranked[1].ranking).toBe(2);
      expect(ranked[2].ranking).toBe(3);
    });
  });

  describe('仪表盘指标聚合', () => {
    it('应正确聚合指标', () => {
      const workOrders: WorkOrderSummary[] = [
        { id: 1, workOrderCode: 'WO-001', productName: 'Product A', productModel: null, quantity: 1, priority: 'Normal', status: 'In_Progress', completionRate: 50, estimatedHours: 10, actualHours: 5, plannedStartDate: null, plannedEndDate: null, assignedTeam: null },
        { id: 2, workOrderCode: 'WO-002', productName: 'Product B', productModel: null, quantity: 1, priority: 'Urgent', status: 'Completed', completionRate: 100, estimatedHours: 8, actualHours: 9, plannedStartDate: null, plannedEndDate: null, assignedTeam: null }
      ];
      
      const tasks = [
        { status: 'Completed', estimatedHours: 4, actualHours: 4 },
        { status: 'In_Progress', estimatedHours: 6, actualHours: 3 },
        { status: 'Completed', estimatedHours: 8, actualHours: 9 }
      ];
      
      const metrics = aggregateDashboardMetrics(workOrders, tasks);
      
      expect(metrics.totalWorkOrders).toBe(2);
      expect(metrics.activeWorkOrders).toBe(1);
      expect(metrics.completedWorkOrders).toBe(1);
      expect(metrics.totalTasks).toBe(3);
      expect(metrics.completedTasks).toBe(2);
    });
  });

  describe('配置代码生成', () => {
    it('应生成唯一的配置代码', () => {
      const code1 = generateDashboardConfigCode();
      const code2 = generateDashboardConfigCode();
      
      expect(code1).toMatch(/^DASH-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(code1).not.toBe(code2);
    });
  });

  describe('刷新间隔验证', () => {
    it('应验证刷新间隔范围', () => {
      expect(validateRefreshInterval(30)).toBe(30);
      expect(validateRefreshInterval(3)).toBe(5); // 最小5秒
      expect(validateRefreshInterval(600)).toBe(300); // 最大300秒
    });
  });

  describe('看板数据格式化', () => {
    it('应正确格式化看板数据', () => {
      const data: ProductionDashboardData = {
        metrics: {
          totalWorkOrders: 10,
          activeWorkOrders: 5,
          completedWorkOrders: 3,
          pendingWorkOrders: 2,
          totalTasks: 50,
          completedTasks: 30,
          inProgressTasks: 15,
          averageEfficiency: 105,
          averageCompletionRate: 60,
          onTimeDeliveryRate: 92
        },
        workOrdersByStatus: [],
        tasksByType: [],
        tasksByStatus: [],
        topWorkers: [],
        recentWorkOrders: [],
        urgentWorkOrders: [{ id: 1, workOrderCode: 'WO-001', productName: 'Urgent Product', productModel: null, quantity: 1, priority: 'Top_Urgent', status: 'In_Progress', completionRate: 30, estimatedHours: 10, actualHours: 5, plannedStartDate: null, plannedEndDate: null, assignedTeam: null }],
        lastUpdated: new Date().toISOString()
      };
      
      const formatted = formatDashboardForDisplay(data);
      
      expect(formatted.summary).toContain('10 个工单');
      expect(formatted.highlights.length).toBeGreaterThanOrEqual(0);
      expect(formatted.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('服务创建', () => {
    it('应创建完整的服务实例', () => {
      const service = createProductionDashboardService();
      
      expect(service.calculateEfficiency).toBeDefined();
      expect(service.calculateCompletionRate).toBeDefined();
      expect(service.sortByPriority).toBeDefined();
      expect(service.calculateStatusDistribution).toBeDefined();
      expect(service.aggregateDashboardMetrics).toBeDefined();
    });
  });
});

// ==================== 质检流程集成服务测试 ====================
import {
  generateInspectionCode,
  getInspectionTypePrefix,
  determineTaskStatusFromQC,
  requiresRework,
  calculateQualityScore,
  validateChecklist,
  calculateQCStatistics,
  getQCWorkflowStatus,
  createDefaultChecklist,
  formatQCResultForNotification,
  createQCIntegrationService,
  type QCInspection,
  type ChecklistItem
} from './services/qc-integration.service';

describe('质检流程集成服务', () => {
  describe('质检编码生成', () => {
    it('应生成正确格式的质检编码', () => {
      const faCode = generateInspectionCode('First_Article');
      const ipCode = generateInspectionCode('In_Process');
      const fiCode = generateInspectionCode('Final');
      const rwCode = generateInspectionCode('Rework');
      
      expect(faCode).toMatch(/^QC-FA-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(ipCode).toMatch(/^QC-IP-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(fiCode).toMatch(/^QC-FI-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(rwCode).toMatch(/^QC-RW-[A-Z0-9]+-[A-Z0-9]+$/);
    });
  });

  describe('质检类型前缀', () => {
    it('应返回正确的前缀', () => {
      expect(getInspectionTypePrefix('First_Article')).toBe('FA');
      expect(getInspectionTypePrefix('In_Process')).toBe('IP');
      expect(getInspectionTypePrefix('Final')).toBe('FI');
      expect(getInspectionTypePrefix('Rework')).toBe('RW');
    });
  });

  describe('任务状态确定', () => {
    it('应根据质检结果确定任务状态', () => {
      expect(determineTaskStatusFromQC('Pass', 'Final')).toBe('Completed');
      expect(determineTaskStatusFromQC('Pass', 'In_Process')).toBe('In_Progress');
      expect(determineTaskStatusFromQC('Fail', 'Final')).toBe('On_Hold');
      expect(determineTaskStatusFromQC('Conditional_Pass', 'In_Process')).toBe('In_Progress');
    });
  });

  describe('返工判断', () => {
    it('应正确判断是否需要返工', () => {
      expect(requiresRework('Fail')).toBe(true);
      expect(requiresRework('Pass')).toBe(false);
      expect(requiresRework('Conditional_Pass', 'dimensional_error')).toBe(true);
      expect(requiresRework('Conditional_Pass', 'minor_scratch')).toBe(false);
    });
  });

  describe('质量评分计算', () => {
    it('应正确计算质量评分', () => {
      const items: ChecklistItem[] = [
        { itemCode: '001', itemName: 'Item 1', standard: 'Standard', actualValue: 'OK', result: 'Pass' },
        { itemCode: '002', itemName: 'Item 2', standard: 'Standard', actualValue: 'OK', result: 'Pass' },
        { itemCode: '003', itemName: 'Item 3', standard: 'Standard', actualValue: 'NG', result: 'Fail' },
        { itemCode: '004', itemName: 'Item 4', standard: 'Standard', actualValue: '', result: 'NA' }
      ];
      
      const score = calculateQualityScore(items);
      expect(score).toBe(67); // 2/3 = 66.67% ≈ 67%
    });

    it('应处理空检查清单', () => {
      expect(calculateQualityScore([])).toBe(0);
    });

    it('应处理全NA的检查清单', () => {
      const items: ChecklistItem[] = [
        { itemCode: '001', itemName: 'Item 1', standard: 'Standard', actualValue: '', result: 'NA' }
      ];
      expect(calculateQualityScore(items)).toBe(100);
    });
  });

  describe('检查清单验证', () => {
    it('应验证检查清单完整性', () => {
      const completeItems: ChecklistItem[] = [
        { itemCode: '001', itemName: 'Item 1', standard: 'Standard', actualValue: 'OK', result: 'Pass' }
      ];
      const incompleteItems: ChecklistItem[] = [
        { itemCode: '001', itemName: 'Item 1', standard: 'Standard', actualValue: '', result: 'Pass' }
      ];
      
      expect(validateChecklist(completeItems).isValid).toBe(true);
      expect(validateChecklist(incompleteItems).isValid).toBe(false);
      expect(validateChecklist(incompleteItems).missingItems).toContain('Item 1');
    });
  });

  describe('质检统计计算', () => {
    it('应正确计算质检统计', () => {
      const inspections: QCInspection[] = [
        { id: 1, inspectionCode: 'QC-001', taskId: 1, workOrderId: 1, inspectionType: 'First_Article', inspectorId: 1, inspectorName: 'Inspector A', inspectionTime: '2026-01-28T10:00:00Z', result: 'Pass', reworkRequired: false, qualityScore: 95 },
        { id: 2, inspectionCode: 'QC-002', taskId: 2, workOrderId: 1, inspectionType: 'In_Process', inspectorId: 1, inspectorName: 'Inspector A', inspectionTime: '2026-01-28T11:00:00Z', result: 'Fail', defectType: 'dimensional_error', reworkRequired: true, qualityScore: 60 },
        { id: 3, inspectionCode: 'QC-003', taskId: 3, workOrderId: 2, inspectionType: 'Final', inspectorId: 2, inspectorName: 'Inspector B', inspectionTime: '2026-01-28T12:00:00Z', result: 'Pass', reworkRequired: false, qualityScore: 100 }
      ];
      
      const stats = calculateQCStatistics(inspections);
      
      expect(stats.totalInspections).toBe(3);
      expect(stats.passCount).toBe(2);
      expect(stats.failCount).toBe(1);
      expect(stats.passRate).toBe(67);
      expect(stats.averageQualityScore).toBe(85);
      expect(stats.commonDefects.length).toBe(1);
    });
  });

  describe('质检工作流状态', () => {
    it('应正确获取质检工作流状态', () => {
      const inspections: QCInspection[] = [
        { id: 1, inspectionCode: 'QC-001', taskId: 1, workOrderId: 1, inspectionType: 'First_Article', inspectorId: 1, inspectorName: 'Inspector A', inspectionTime: '2026-01-28T10:00:00Z', result: 'Pass', reworkRequired: false, qualityScore: 95 }
      ];
      
      const workflow = getQCWorkflowStatus(inspections, 1, 1);
      
      expect(workflow.taskId).toBe(1);
      expect(workflow.currentQCStatus).toBe('Pass');
      expect(workflow.reworkCount).toBe(0);
    });
  });

  describe('默认检查清单创建', () => {
    it('应为不同任务类型创建检查清单', () => {
      const mechSubAssy = createDefaultChecklist('Mech_Sub_Assy');
      const elecAssy = createDefaultChecklist('Elec_Assy');
      
      expect(mechSubAssy.length).toBeGreaterThan(3);
      expect(elecAssy.length).toBeGreaterThan(3);
      expect(elecAssy.some(item => item.itemCode.startsWith('EA-'))).toBe(true);
    });
  });

  describe('质检结果通知格式化', () => {
    it('应正确格式化质检结果', () => {
      const passInspection: QCInspection = {
        id: 1, inspectionCode: 'QC-001', taskId: 1, workOrderId: 1, inspectionType: 'Final', inspectorId: 1, inspectorName: 'Inspector A', inspectionTime: '2026-01-28T10:00:00Z', result: 'Pass', reworkRequired: false, qualityScore: 100
      };
      
      const failInspection: QCInspection = {
        id: 2, inspectionCode: 'QC-002', taskId: 2, workOrderId: 1, inspectionType: 'In_Process', inspectorId: 1, inspectorName: 'Inspector A', inspectionTime: '2026-01-28T11:00:00Z', result: 'Fail', defectType: 'dimensional_error', reworkRequired: true, qualityScore: 50
      };
      
      const passNotification = formatQCResultForNotification(passInspection);
      const failNotification = formatQCResultForNotification(failInspection);
      
      expect(passNotification.level).toBe('info');
      expect(failNotification.level).toBe('error');
      expect(failNotification.message).toContain('dimensional_error');
      expect(failNotification.message).toContain('返工');
    });
  });

  describe('服务创建', () => {
    it('应创建完整的服务实例', () => {
      const service = createQCIntegrationService();
      
      expect(service.generateInspectionCode).toBeDefined();
      expect(service.determineTaskStatusFromQC).toBeDefined();
      expect(service.calculateQualityScore).toBeDefined();
      expect(service.calculateQCStatistics).toBeDefined();
    });
  });
});

// ==================== 工时异常预警服务测试 ====================
import {
  generateAlertCode,
  generateRuleCode,
  calculateOverrunPercent,
  checkAlertTrigger,
  determineAlertLevel,
  matchAlertRules,
  checkTaskWorkHours,
  batchCheckWorkHours,
  calculateAlertStatistics,
  formatAlertMessage,
  validateAlertRule,
  createDefaultAlertRules,
  calculateAlertTrend,
  createWorkHourAlertService,
  DEFAULT_THRESHOLD_PERCENT,
  type WorkHourAlertRule,
  type WorkHourAlert
} from './services/work-hour-alert.service';

describe('工时异常预警服务', () => {
  describe('编码生成', () => {
    it('应生成唯一的预警编码', () => {
      const code1 = generateAlertCode();
      const code2 = generateAlertCode();
      
      expect(code1).toMatch(/^WHA-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(code1).not.toBe(code2);
    });

    it('应生成唯一的规则编码', () => {
      const code1 = generateRuleCode();
      const code2 = generateRuleCode();
      
      expect(code1).toMatch(/^WHR-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(code1).not.toBe(code2);
    });
  });

  describe('超支百分比计算', () => {
    it('应正确计算超支百分比', () => {
      expect(calculateOverrunPercent(10, 12)).toBe(120);
      expect(calculateOverrunPercent(10, 10)).toBe(100);
      expect(calculateOverrunPercent(10, 8)).toBe(80);
    });

    it('应处理边界情况', () => {
      expect(calculateOverrunPercent(0, 10)).toBe(0);
      expect(calculateOverrunPercent(10, 0)).toBe(0);
    });
  });

  describe('预警触发检查', () => {
    it('应正确检查预警触发', () => {
      expect(checkAlertTrigger(10, 12, 120)).toBe(true);
      expect(checkAlertTrigger(10, 11, 120)).toBe(false);
      expect(checkAlertTrigger(10, 15, 120)).toBe(true);
    });

    it('应使用默认阈值', () => {
      expect(DEFAULT_THRESHOLD_PERCENT).toBe(120);
    });
  });

  describe('预警级别确定', () => {
    it('应确定最高预警级别', () => {
      const rules: WorkHourAlertRule[] = [
        { id: 1, ruleCode: 'R1', ruleName: 'Rule 1', taskType: 'All', thresholdPercent: 120, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true },
        { id: 2, ruleCode: 'R2', ruleName: 'Rule 2', taskType: 'All', thresholdPercent: 150, alertLevel: 'Critical', notificationChannels: [], recipients: [], isActive: true }
      ];
      
      expect(determineAlertLevel(125, rules)).toBe('Warning');
      expect(determineAlertLevel(160, rules)).toBe('Critical');
    });
  });

  describe('规则匹配', () => {
    it('应匹配适用的规则', () => {
      const rules: WorkHourAlertRule[] = [
        { id: 1, ruleCode: 'R1', ruleName: 'All Tasks', taskType: 'All', thresholdPercent: 120, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true },
        { id: 2, ruleCode: 'R2', ruleName: 'Elec Only', taskType: 'Elec_Assy', thresholdPercent: 110, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true },
        { id: 3, ruleCode: 'R3', ruleName: 'Inactive', taskType: 'All', thresholdPercent: 100, alertLevel: 'Info', notificationChannels: [], recipients: [], isActive: false }
      ];
      
      const mechRules = matchAlertRules('Mech_Assy', rules);
      const elecRules = matchAlertRules('Elec_Assy', rules);
      
      expect(mechRules.length).toBe(1);
      expect(elecRules.length).toBe(2);
    });
  });

  describe('任务工时检查', () => {
    it('应检查任务工时并返回结果', () => {
      const task = {
        taskId: 1,
        workOrderId: 1,
        taskType: 'Mech_Assy',
        workerId: 1,
        workerName: 'Worker A',
        estimatedHours: 10,
        actualHours: 13
      };
      
      const rules: WorkHourAlertRule[] = [
        { id: 1, ruleCode: 'R1', ruleName: 'Rule 1', taskType: 'All', thresholdPercent: 120, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true }
      ];
      
      const result = checkTaskWorkHours(task, rules);
      
      expect(result.shouldAlert).toBe(true);
      expect(result.overrunPercent).toBe(130);
      expect(result.highestAlertLevel).toBe('Warning');
    });
  });

  describe('批量工时检查', () => {
    it('应批量检查并过滤需要预警的任务', () => {
      const tasks = [
        { taskId: 1, workOrderId: 1, taskType: 'Mech_Assy', estimatedHours: 10, actualHours: 13 },
        { taskId: 2, workOrderId: 1, taskType: 'Mech_Assy', estimatedHours: 10, actualHours: 9 },
        { taskId: 3, workOrderId: 2, taskType: 'Elec_Assy', estimatedHours: 8, actualHours: 12 }
      ];
      
      const rules: WorkHourAlertRule[] = [
        { id: 1, ruleCode: 'R1', ruleName: 'Rule 1', taskType: 'All', thresholdPercent: 120, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true }
      ];
      
      const results = batchCheckWorkHours(tasks, rules);
      
      expect(results.length).toBe(2); // 只有超过120%的任务
    });
  });

  describe('预警统计计算', () => {
    it('应正确计算预警统计', () => {
      const alerts: WorkHourAlert[] = [
        { id: 1, alertCode: 'A1', ruleId: 1, taskId: 1, workOrderId: 1, estimatedHours: 10, actualHours: 13, overrunPercent: 130, alertLevel: 'Warning', alertTime: '2026-01-28T10:00:00Z', status: 'Pending' },
        { id: 2, alertCode: 'A2', ruleId: 1, taskId: 2, workOrderId: 1, estimatedHours: 8, actualHours: 12, overrunPercent: 150, alertLevel: 'Critical', alertTime: '2026-01-28T11:00:00Z', status: 'Resolved', resolvedAt: '2026-01-28T13:00:00Z' },
        { id: 3, alertCode: 'A3', ruleId: 1, taskId: 3, workOrderId: 2, estimatedHours: 10, actualHours: 14, overrunPercent: 140, alertLevel: 'Warning', alertTime: '2026-01-28T12:00:00Z', status: 'Acknowledged' }
      ];
      
      const stats = calculateAlertStatistics(alerts);
      
      expect(stats.totalAlerts).toBe(3);
      expect(stats.pendingAlerts).toBe(1);
      expect(stats.resolvedAlerts).toBe(1);
      expect(stats.acknowledgedAlerts).toBe(1);
      expect(stats.topOverrunTasks.length).toBeLessThanOrEqual(5);
    });
  });

  describe('预警消息格式化', () => {
    it('应正确格式化预警消息', () => {
      const alert: WorkHourAlert = {
        id: 1, alertCode: 'A1', ruleId: 1, taskId: 1, workOrderId: 1, workerId: 1, workerName: 'Worker A', estimatedHours: 10, actualHours: 13, overrunPercent: 130, alertLevel: 'Warning', alertTime: '2026-01-28T10:00:00Z', status: 'Pending'
      };
      
      const formatted = formatAlertMessage(alert, 'Test Task');
      
      expect(formatted.title).toContain('警告');
      expect(formatted.message).toContain('130%');
      expect(formatted.message).toContain('Worker A');
      expect(formatted.urgency).toContain('关注');
    });
  });

  describe('规则验证', () => {
    it('应验证规则配置', () => {
      const validRule = { ruleName: 'Test Rule', thresholdPercent: 120, notificationChannels: ['email'] };
      const invalidRule1 = { ruleName: '', thresholdPercent: 120 };
      const invalidRule2 = { ruleName: 'Test', thresholdPercent: 50 };
      
      expect(validateAlertRule(validRule).isValid).toBe(true);
      expect(validateAlertRule(invalidRule1).isValid).toBe(false);
      expect(validateAlertRule(invalidRule2).isValid).toBe(false);
    });
  });

  describe('默认规则创建', () => {
    it('应创建默认预警规则', () => {
      const defaultRules = createDefaultAlertRules();
      
      expect(defaultRules.length).toBeGreaterThan(0);
      expect(defaultRules.some(r => r.thresholdPercent === 120)).toBe(true);
      expect(defaultRules.some(r => r.alertLevel === 'Critical')).toBe(true);
    });
  });

  describe('预警趋势计算', () => {
    it('应计算预警趋势', () => {
      const today = new Date().toISOString().split('T')[0];
      const alerts: WorkHourAlert[] = [
        { id: 1, alertCode: 'A1', ruleId: 1, taskId: 1, workOrderId: 1, estimatedHours: 10, actualHours: 13, overrunPercent: 130, alertLevel: 'Warning', alertTime: `${today}T10:00:00Z`, status: 'Resolved' }
      ];
      
      const trends = calculateAlertTrend(alerts, 7);
      
      expect(trends.length).toBe(7);
      expect(trends[trends.length - 1].date).toBe(today);
    });
  });

  describe('服务创建', () => {
    it('应创建完整的服务实例', () => {
      const service = createWorkHourAlertService();
      
      expect(service.generateAlertCode).toBeDefined();
      expect(service.calculateOverrunPercent).toBeDefined();
      expect(service.checkAlertTrigger).toBeDefined();
      expect(service.batchCheckWorkHours).toBeDefined();
      expect(service.calculateAlertStatistics).toBeDefined();
    });
  });
});

// ==================== 集成测试 ====================
describe('v2.5.25 集成测试', () => {
  describe('生产看板与质检集成', () => {
    it('应能将质检结果反映到看板指标', () => {
      const qcStats = calculateQCStatistics([
        { id: 1, inspectionCode: 'QC-001', taskId: 1, workOrderId: 1, inspectionType: 'Final', inspectorId: 1, inspectorName: 'Inspector', inspectionTime: '2026-01-28T10:00:00Z', result: 'Pass', reworkRequired: false, qualityScore: 95 }
      ]);
      
      expect(qcStats.passRate).toBeGreaterThan(0);
      
      // 质检通过率可以作为看板指标的一部分
      const dashboardMetrics = {
        qualityPassRate: qcStats.passRate,
        averageQualityScore: qcStats.averageQualityScore
      };
      
      expect(dashboardMetrics.qualityPassRate).toBe(100);
    });
  });

  describe('工时预警与看板集成', () => {
    it('应能在看板上显示工时预警信息', () => {
      const alerts: WorkHourAlert[] = [
        { id: 1, alertCode: 'A1', ruleId: 1, taskId: 1, workOrderId: 1, estimatedHours: 10, actualHours: 15, overrunPercent: 150, alertLevel: 'Critical', alertTime: '2026-01-28T10:00:00Z', status: 'Pending' }
      ];
      
      const alertStats = calculateAlertStatistics(alerts);
      
      // 预警统计可以作为看板警告的一部分
      const dashboardWarnings = [];
      if (alertStats.pendingAlerts > 0) {
        dashboardWarnings.push(`有 ${alertStats.pendingAlerts} 个工时预警待处理`);
      }
      
      expect(dashboardWarnings.length).toBe(1);
    });
  });

  describe('质检与工时预警联动', () => {
    it('返工任务应触发工时预警检查', () => {
      // 模拟质检失败需要返工的场景
      const qcResult = requiresRework('Fail', 'dimensional_error');
      expect(qcResult).toBe(true);
      
      // 返工会增加实际工时，可能触发预警
      const task = {
        taskId: 1,
        workOrderId: 1,
        taskType: 'Mech_Assy',
        estimatedHours: 10,
        actualHours: 15 // 返工后工时增加
      };
      
      const rules: WorkHourAlertRule[] = [
        { id: 1, ruleCode: 'R1', ruleName: 'Rule 1', taskType: 'All', thresholdPercent: 120, alertLevel: 'Warning', notificationChannels: [], recipients: [], isActive: true }
      ];
      
      const alertResult = checkTaskWorkHours(task, rules);
      expect(alertResult.shouldAlert).toBe(true);
    });
  });
});
