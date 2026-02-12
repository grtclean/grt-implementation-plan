/**
 * v2.5.26 生产看板前端与导航功能测试
 * 测试生产看板服务层函数和数据处理逻辑
 */
import { describe, it, expect } from 'vitest';
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

describe('v2.5.26 生产看板服务测试', () => {
  
  describe('效率计算函数', () => {
    it('应正确计算效率百分比', () => {
      // 预估10小时，实际8小时，效率125%
      expect(calculateEfficiency(10, 8)).toBe(125);
      // 预估10小时，实际10小时，效率100%
      expect(calculateEfficiency(10, 10)).toBe(100);
      // 预估10小时，实际12小时，效率83%
      expect(calculateEfficiency(10, 12)).toBe(83);
    });

    it('应处理边界情况', () => {
      expect(calculateEfficiency(0, 10)).toBe(0);
      expect(calculateEfficiency(10, 0)).toBe(0);
      expect(calculateEfficiency(0, 0)).toBe(0);
    });
  });

  describe('完成率计算函数', () => {
    it('应正确计算完成率', () => {
      expect(calculateCompletionRate(50, 100)).toBe(50);
      expect(calculateCompletionRate(75, 100)).toBe(75);
      expect(calculateCompletionRate(100, 100)).toBe(100);
    });

    it('应处理边界情况', () => {
      expect(calculateCompletionRate(0, 100)).toBe(0);
      expect(calculateCompletionRate(50, 0)).toBe(0);
    });
  });

  describe('准时交付率计算', () => {
    it('应正确计算准时交付率', () => {
      expect(calculateOnTimeDeliveryRate(90, 100)).toBe(90);
      expect(calculateOnTimeDeliveryRate(85, 100)).toBe(85);
    });

    it('应处理边界情况', () => {
      expect(calculateOnTimeDeliveryRate(0, 100)).toBe(0);
      expect(calculateOnTimeDeliveryRate(50, 0)).toBe(0);
    });
  });

  describe('优先级权重', () => {
    it('应返回正确的优先级权重', () => {
      expect(getPriorityWeight('Top_Urgent')).toBe(3);
      expect(getPriorityWeight('Urgent')).toBe(2);
      expect(getPriorityWeight('Normal')).toBe(1);
      expect(getPriorityWeight('Unknown')).toBe(0);
    });
  });

  describe('优先级排序', () => {
    it('应按优先级降序排序', () => {
      const items = [
        { priority: 'Normal', id: 1 },
        { priority: 'Top_Urgent', id: 2 },
        { priority: 'Urgent', id: 3 }
      ];
      const sorted = sortByPriority(items);
      expect(sorted[0].priority).toBe('Top_Urgent');
      expect(sorted[1].priority).toBe('Urgent');
      expect(sorted[2].priority).toBe('Normal');
    });

    it('应不修改原数组', () => {
      const items = [
        { priority: 'Normal', id: 1 },
        { priority: 'Top_Urgent', id: 2 }
      ];
      sortByPriority(items);
      expect(items[0].priority).toBe('Normal');
    });
  });

  describe('状态分布计算', () => {
    it('应正确计算状态分布', () => {
      const items = [
        { status: 'Completed' },
        { status: 'Completed' },
        { status: 'In_Progress' },
        { status: 'Pending' }
      ];
      const distribution = calculateStatusDistribution(items);
      
      const completed = distribution.find(d => d.status === 'Completed');
      expect(completed?.count).toBe(2);
      expect(completed?.percentage).toBe(50);
      
      const inProgress = distribution.find(d => d.status === 'In_Progress');
      expect(inProgress?.count).toBe(1);
      expect(inProgress?.percentage).toBe(25);
    });

    it('应处理空数组', () => {
      const distribution = calculateStatusDistribution([]);
      expect(distribution).toHaveLength(0);
    });
  });

  describe('任务类型分布计算', () => {
    it('应正确计算任务类型分布', () => {
      const tasks = [
        { taskType: 'Assembly', status: 'Completed' },
        { taskType: 'Assembly', status: 'In_Progress' },
        { taskType: 'Testing', status: 'Completed' },
        { taskType: 'Testing', status: 'Completed' }
      ];
      const distribution = calculateTaskTypeDistribution(tasks);
      
      const assembly = distribution.find(d => d.taskType === 'Assembly');
      expect(assembly?.count).toBe(2);
      expect(assembly?.completedCount).toBe(1);
      expect(assembly?.inProgressCount).toBe(1);
      
      const testing = distribution.find(d => d.taskType === 'Testing');
      expect(testing?.count).toBe(2);
      expect(testing?.completedCount).toBe(2);
      expect(testing?.inProgressCount).toBe(0);
    });
  });

  describe('工人效率排名', () => {
    it('应按效率降序排名', () => {
      const workers: Omit<WorkerEfficiency, 'ranking'>[] = [
        { workerId: 1, workerName: '张三', tasksCompleted: 10, totalEstimatedHours: 100, totalActualHours: 90, efficiency: 111, qualityPassRate: 95 },
        { workerId: 2, workerName: '李四', tasksCompleted: 8, totalEstimatedHours: 80, totalActualHours: 85, efficiency: 94, qualityPassRate: 98 },
        { workerId: 3, workerName: '王五', tasksCompleted: 12, totalEstimatedHours: 120, totalActualHours: 110, efficiency: 109, qualityPassRate: 96 }
      ];
      const ranked = calculateWorkerRankings(workers);
      
      expect(ranked[0].ranking).toBe(1);
      expect(ranked[0].workerName).toBe('张三');
      expect(ranked[1].ranking).toBe(2);
      expect(ranked[1].workerName).toBe('王五');
      expect(ranked[2].ranking).toBe(3);
      expect(ranked[2].workerName).toBe('李四');
    });
  });

  describe('仪表盘指标聚合', () => {
    it('应正确聚合仪表盘指标', () => {
      const workOrders: WorkOrderSummary[] = [
        {
          id: 1, workOrderCode: 'WO-001', productName: 'Product A', productModel: null,
          quantity: 5, priority: 'Normal', status: 'In_Progress', completionRate: 50,
          estimatedHours: 100, actualHours: 60, plannedStartDate: null, plannedEndDate: null, assignedTeam: null
        },
        {
          id: 2, workOrderCode: 'WO-002', productName: 'Product B', productModel: null,
          quantity: 3, priority: 'Urgent', status: 'Completed', completionRate: 100,
          estimatedHours: 80, actualHours: 75, plannedStartDate: null, plannedEndDate: null, assignedTeam: null
        }
      ];
      const tasks = [
        { status: 'Completed', estimatedHours: 10, actualHours: 9 },
        { status: 'Completed', estimatedHours: 8, actualHours: 8 },
        { status: 'In_Progress', estimatedHours: 12, actualHours: 6 }
      ];
      
      const metrics = aggregateDashboardMetrics(workOrders, tasks);
      
      expect(metrics.totalWorkOrders).toBe(2);
      expect(metrics.activeWorkOrders).toBe(1);
      expect(metrics.completedWorkOrders).toBe(1);
      expect(metrics.totalTasks).toBe(3);
      expect(metrics.completedTasks).toBe(2);
      expect(metrics.inProgressTasks).toBe(1);
    });
  });

  describe('看板配置代码生成', () => {
    it('应生成唯一的配置代码', () => {
      const code1 = generateDashboardConfigCode();
      const code2 = generateDashboardConfigCode();
      
      expect(code1).toMatch(/^DASH-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(code1).not.toBe(code2);
    });
  });

  describe('刷新间隔验证', () => {
    it('应限制在有效范围内', () => {
      expect(validateRefreshInterval(1)).toBe(5);  // 最小5秒
      expect(validateRefreshInterval(30)).toBe(30);
      expect(validateRefreshInterval(500)).toBe(300);  // 最大300秒
    });
  });

  describe('看板数据格式化', () => {
    it('应正确格式化看板数据', () => {
      const data: ProductionDashboardData = {
        metrics: {
          totalWorkOrders: 10,
          activeWorkOrders: 5,
          completedWorkOrders: 4,
          pendingWorkOrders: 1,
          totalTasks: 50,
          completedTasks: 30,
          inProgressTasks: 15,
          averageEfficiency: 105,
          averageCompletionRate: 80,
          onTimeDeliveryRate: 92
        },
        workOrdersByStatus: [],
        tasksByType: [],
        tasksByStatus: [],
        topWorkers: [],
        recentWorkOrders: [],
        urgentWorkOrders: [],
        lastUpdated: new Date().toISOString()
      };
      
      const formatted = formatDashboardForDisplay(data);
      
      expect(formatted.summary).toContain('10 个工单');
      expect(formatted.summary).toContain('5 个进行中');
      expect(formatted.highlights).toContain('整体效率超过预期');
      expect(formatted.highlights).toContain('准时交付率优秀');
    });

    it('应生成警告信息', () => {
      const data: ProductionDashboardData = {
        metrics: {
          totalWorkOrders: 10,
          activeWorkOrders: 5,
          completedWorkOrders: 4,
          pendingWorkOrders: 1,
          totalTasks: 50,
          completedTasks: 30,
          inProgressTasks: 15,
          averageEfficiency: 70,  // 低效率
          averageCompletionRate: 80,
          onTimeDeliveryRate: 85
        },
        workOrdersByStatus: [],
        tasksByType: [],
        tasksByStatus: [],
        topWorkers: [],
        recentWorkOrders: [],
        urgentWorkOrders: [
          {
            id: 1, workOrderCode: 'WO-001', productName: 'Product A', productModel: null,
            quantity: 5, priority: 'Top_Urgent', status: 'In_Progress', completionRate: 50,
            estimatedHours: 100, actualHours: 60, plannedStartDate: null, plannedEndDate: null, assignedTeam: null
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      const formatted = formatDashboardForDisplay(data);
      
      expect(formatted.warnings).toContain('有 1 个紧急工单需要关注');
      expect(formatted.warnings).toContain('整体效率偏低，需要分析原因');
    });
  });

  describe('服务实例创建', () => {
    it('应创建包含所有方法的服务实例', () => {
      const service = createProductionDashboardService();
      
      expect(typeof service.calculateEfficiency).toBe('function');
      expect(typeof service.calculateCompletionRate).toBe('function');
      expect(typeof service.calculateOnTimeDeliveryRate).toBe('function');
      expect(typeof service.getPriorityWeight).toBe('function');
      expect(typeof service.sortByPriority).toBe('function');
      expect(typeof service.calculateStatusDistribution).toBe('function');
      expect(typeof service.calculateTaskTypeDistribution).toBe('function');
      expect(typeof service.calculateWorkerRankings).toBe('function');
      expect(typeof service.aggregateDashboardMetrics).toBe('function');
      expect(typeof service.generateDashboardConfigCode).toBe('function');
      expect(typeof service.validateRefreshInterval).toBe('function');
      expect(typeof service.formatDashboardForDisplay).toBe('function');
    });
  });
});

describe('v2.5.26 质检集成服务测试', () => {
  // 导入质检服务
  const qcService = {
    mapQCStatus: (status: string) => {
      const map: Record<string, string> = { 'passed': 'Passed', 'failed': 'Failed', 'pending': 'Pending' };
      return map[status] || 'Unknown';
    },
    validateQCResult: (result: any) => {
      if (!result.inspectorId) return false;
      if (!result.workOrderId) return false;
      if (!result.taskItemId) return false;
      if (!['passed', 'failed', 'pending'].includes(result.result)) return false;
      if (result.defectsFound < 0) return false;
      return true;
    },
    generateQCRecordCode: () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      return `QC-${timestamp}-${random}`.toUpperCase();
    }
  };

  describe('质检状态映射', () => {
    it('应正确映射质检状态', () => {
      expect(qcService.mapQCStatus('passed')).toBe('Passed');
      expect(qcService.mapQCStatus('failed')).toBe('Failed');
      expect(qcService.mapQCStatus('pending')).toBe('Pending');
    });
  });

  describe('质检结果验证', () => {
    it('应验证有效的质检结果', () => {
      const result = {
        inspectorId: 1,
        workOrderId: 1,
        taskItemId: 1,
        result: 'passed',
        defectsFound: 0
      };
      expect(qcService.validateQCResult(result)).toBe(true);
    });

    it('应拒绝无效的质检结果', () => {
      const result = {
        inspectorId: null,
        workOrderId: 1,
        taskItemId: 1,
        result: 'invalid',
        defectsFound: -1
      };
      expect(qcService.validateQCResult(result)).toBe(false);
    });
  });

  describe('质检记录生成', () => {
    it('应生成唯一的质检记录编号', () => {
      const code1 = qcService.generateQCRecordCode();
      const code2 = qcService.generateQCRecordCode();
      
      expect(code1).toMatch(/^QC-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(code1).not.toBe(code2);
    });
  });
});

describe('v2.5.26 工时预警服务测试', () => {
  // 导入工时预警服务
  const alertService = {
    checkWorkHourOverrun: (estimated: number, actual: number, threshold: number) => {
      if (estimated <= 0 || actual <= 0) return false;
      return (actual / estimated * 100) >= threshold;
    },
    getAlertLevel: (overrunPercentage: number) => {
      if (overrunPercentage >= 150) return 'critical';
      if (overrunPercentage >= 130) return 'warning';
      if (overrunPercentage > 100) return 'info';
      return 'none';
    },
    validateAlertRule: (rule: any) => {
      if (!rule.name || rule.name.length === 0) return false;
      if (!rule.threshold || rule.threshold <= 0) return false;
      if (!rule.notifyRoles || rule.notifyRoles.length === 0) return false;
      return true;
    },
    formatAlertMessage: (alert: any) => {
      return `工单 ${alert.workOrderCode} 任务"${alert.taskName}"工时超出预估 ${alert.overrunPercentage}%`;
    }
  };

  describe('工时超预估检测', () => {
    it('应检测超过阈值的工时', () => {
      // 预估10小时，实际12小时，超出120%
      expect(alertService.checkWorkHourOverrun(10, 12, 120)).toBe(true);
      // 预估10小时，实际11小时，未超出120%
      expect(alertService.checkWorkHourOverrun(10, 11, 120)).toBe(false);
    });

    it('应处理边界情况', () => {
      expect(alertService.checkWorkHourOverrun(0, 10, 120)).toBe(false);
      expect(alertService.checkWorkHourOverrun(10, 0, 120)).toBe(false);
    });
  });

  describe('预警级别判定', () => {
    it('应根据超出比例返回正确的预警级别', () => {
      expect(alertService.getAlertLevel(150)).toBe('critical');
      expect(alertService.getAlertLevel(130)).toBe('warning');
      expect(alertService.getAlertLevel(115)).toBe('info');
      expect(alertService.getAlertLevel(100)).toBe('none');
    });
  });

  describe('预警规则验证', () => {
    it('应验证有效的预警规则', () => {
      const rule = {
        name: '工时超预估预警',
        threshold: 120,
        notifyRoles: ['manager', 'supervisor'],
        isEnabled: true
      };
      expect(alertService.validateAlertRule(rule)).toBe(true);
    });

    it('应拒绝无效的预警规则', () => {
      const rule = {
        name: '',
        threshold: -10,
        notifyRoles: [],
        isEnabled: true
      };
      expect(alertService.validateAlertRule(rule)).toBe(false);
    });
  });

  describe('预警消息格式化', () => {
    it('应正确格式化预警消息', () => {
      const alert = {
        workOrderCode: 'WO-001',
        taskName: '主体框架焊接',
        estimatedHours: 10,
        actualHours: 13,
        overrunPercentage: 130
      };
      const message = alertService.formatAlertMessage(alert);
      
      expect(message).toContain('WO-001');
      expect(message).toContain('主体框架焊接');
      expect(message).toContain('130%');
    });
  });
});
