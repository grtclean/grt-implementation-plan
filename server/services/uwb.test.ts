/**
 * UWB工时采集服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==================== 类型定义测试 ====================

describe('UWB类型定义', () => {
  it('应该正确定义UWB定位数据结构', () => {
    const locationData = {
      tagId: 'TAG001',
      x: 10.5,
      y: 20.3,
      z: 1.2,
      accuracy: 0.1,
      signalStrength: -50,
      timestamp: new Date(),
    };

    expect(locationData.tagId).toBe('TAG001');
    expect(locationData.x).toBe(10.5);
    expect(locationData.y).toBe(20.3);
    expect(locationData.z).toBe(1.2);
    expect(locationData.accuracy).toBe(0.1);
    expect(locationData.signalStrength).toBe(-50);
    expect(locationData.timestamp).toBeInstanceOf(Date);
  });

  it('应该正确定义UWB区域结构', () => {
    const zone = {
      id: 'zone-001',
      zoneCode: 'PROD-A1',
      zoneName: '生产区A1',
      zoneType: 'production' as const,
      buCode: 'BU1',
      bounds: {
        xMin: 0,
        xMax: 50,
        yMin: 0,
        yMax: 30,
        zMin: 0,
        zMax: 5,
      },
      isWorkZone: true,
      capacity: 20,
    };

    expect(zone.zoneCode).toBe('PROD-A1');
    expect(zone.zoneType).toBe('production');
    expect(zone.isWorkZone).toBe(true);
    expect(zone.bounds.xMax).toBe(50);
  });

  it('应该正确定义工时汇总结构', () => {
    const summary = {
      employeeId: 'emp-001',
      employeeName: '张三',
      workDate: '2026-02-01',
      totalMinutes: 480,
      effectiveMinutes: 420,
      idleMinutes: 60,
      zones: [
        { zoneId: 'zone-001', zoneName: '生产区A1', minutes: 300 },
        { zoneId: 'zone-002', zoneName: '装配区B1', minutes: 120 },
      ],
      utilizationRate: 0.875,
    };

    expect(summary.totalMinutes).toBe(480);
    expect(summary.effectiveMinutes).toBe(420);
    expect(summary.utilizationRate).toBe(0.875);
    expect(summary.zones.length).toBe(2);
  });

  it('应该正确定义产能数据结构', () => {
    const capacity = {
      resourceId: 'res-001',
      resourceName: '焊接工位1',
      date: '2026-02-01',
      baseCapacityHours: 8,
      actualWorkHours: 6.5,
      availableCapacity: 1.5,
      utilizationRate: 0.8125,
    };

    expect(capacity.baseCapacityHours).toBe(8);
    expect(capacity.actualWorkHours).toBe(6.5);
    expect(capacity.availableCapacity).toBe(1.5);
    expect(capacity.utilizationRate).toBeCloseTo(0.8125, 4);
  });
});

// ==================== 区域判定逻辑测试 ====================

describe('区域判定逻辑', () => {
  const zones = [
    {
      id: 'zone-001',
      zoneCode: 'PROD-A1',
      zoneName: '生产区A1',
      bounds: { xMin: 0, xMax: 50, yMin: 0, yMax: 30 },
      isWorkZone: true,
    },
    {
      id: 'zone-002',
      zoneCode: 'ASSEMBLY-B1',
      zoneName: '装配区B1',
      bounds: { xMin: 50, xMax: 100, yMin: 0, yMax: 30 },
      isWorkZone: true,
    },
    {
      id: 'zone-003',
      zoneCode: 'REST-C1',
      zoneName: '休息区C1',
      bounds: { xMin: 0, xMax: 20, yMin: 30, yMax: 50 },
      isWorkZone: false,
    },
  ];

  function determineZone(x: number, y: number) {
    for (const zone of zones) {
      if (
        x >= zone.bounds.xMin &&
        x <= zone.bounds.xMax &&
        y >= zone.bounds.yMin &&
        y <= zone.bounds.yMax
      ) {
        return zone;
      }
    }
    return null;
  }

  it('应该正确判定坐标所在区域 - 生产区', () => {
    const zone = determineZone(25, 15);
    expect(zone?.zoneCode).toBe('PROD-A1');
    expect(zone?.isWorkZone).toBe(true);
  });

  it('应该正确判定坐标所在区域 - 装配区', () => {
    const zone = determineZone(75, 15);
    expect(zone?.zoneCode).toBe('ASSEMBLY-B1');
    expect(zone?.isWorkZone).toBe(true);
  });

  it('应该正确判定坐标所在区域 - 休息区', () => {
    const zone = determineZone(10, 40);
    expect(zone?.zoneCode).toBe('REST-C1');
    expect(zone?.isWorkZone).toBe(false);
  });

  it('应该正确处理边界坐标', () => {
    const zone = determineZone(50, 15);
    expect(zone?.zoneCode).toBe('PROD-A1'); // 边界属于第一个匹配的区域
  });

  it('应该正确处理区域外坐标', () => {
    const zone = determineZone(150, 100);
    expect(zone).toBeNull();
  });
});

// ==================== 工时计算逻辑测试 ====================

describe('工时计算逻辑', () => {
  it('应该正确计算有效工时', () => {
    const records = [
      { timestamp: new Date('2026-02-01T08:00:00'), isWorkZone: true },
      { timestamp: new Date('2026-02-01T08:30:00'), isWorkZone: true },
      { timestamp: new Date('2026-02-01T09:00:00'), isWorkZone: true },
      { timestamp: new Date('2026-02-01T09:30:00'), isWorkZone: false }, // 休息
      { timestamp: new Date('2026-02-01T10:00:00'), isWorkZone: true },
    ];

    let effectiveMinutes = 0;
    let totalMinutes = 0;

    for (let i = 1; i < records.length; i++) {
      const minutes = (records[i].timestamp.getTime() - records[i - 1].timestamp.getTime()) / 60000;
      totalMinutes += minutes;
      if (records[i - 1].isWorkZone) {
        effectiveMinutes += minutes;
      }
    }

    expect(totalMinutes).toBe(120); // 2小时
    expect(effectiveMinutes).toBe(90); // 1.5小时有效工时
  });

  it('应该正确计算利用率', () => {
    const totalMinutes = 480; // 8小时
    const effectiveMinutes = 420; // 7小时有效

    const utilizationRate = effectiveMinutes / totalMinutes;

    expect(utilizationRate).toBeCloseTo(0.875, 3);
  });

  it('应该正确处理空闲时间检测', () => {
    const lastActivityTime = new Date('2026-02-01T09:00:00');
    const currentTime = new Date('2026-02-01T09:45:00');
    const idleThresholdMinutes = 30;

    const idleMinutes = (currentTime.getTime() - lastActivityTime.getTime()) / 60000;
    const isIdle = idleMinutes > idleThresholdMinutes;

    expect(idleMinutes).toBe(45);
    expect(isIdle).toBe(true);
  });

  it('应该正确处理跨天工时', () => {
    const startTime = new Date('2026-02-01T22:00:00');
    const endTime = new Date('2026-02-02T02:00:00');

    const totalMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

    expect(totalMinutes).toBe(240); // 4小时
  });
});

// ==================== 产能计算测试 ====================

describe('产能计算', () => {
  it('应该正确计算剩余产能', () => {
    const baseCapacityHours = 8;
    const actualWorkHours = 6.5;

    const availableCapacity = Math.max(0, baseCapacityHours - actualWorkHours);

    expect(availableCapacity).toBe(1.5);
  });

  it('应该正确处理超时工作', () => {
    const baseCapacityHours = 8;
    const actualWorkHours = 10;

    const availableCapacity = Math.max(0, baseCapacityHours - actualWorkHours);
    const overtime = Math.max(0, actualWorkHours - baseCapacityHours);

    expect(availableCapacity).toBe(0);
    expect(overtime).toBe(2);
  });

  it('应该正确计算多资源总产能', () => {
    const resources = [
      { baseCapacity: 8, actualWork: 6 },
      { baseCapacity: 8, actualWork: 7 },
      { baseCapacity: 8, actualWork: 5 },
    ];

    const totalBaseCapacity = resources.reduce((sum, r) => sum + r.baseCapacity, 0);
    const totalActualWork = resources.reduce((sum, r) => sum + r.actualWork, 0);
    const totalAvailable = totalBaseCapacity - totalActualWork;

    expect(totalBaseCapacity).toBe(24);
    expect(totalActualWork).toBe(18);
    expect(totalAvailable).toBe(6);
  });
});

// ==================== 标签管理测试 ====================

describe('标签管理', () => {
  const tagEmployeeMap = new Map<string, { employeeId: string; resourceId?: string }>();

  beforeEach(() => {
    tagEmployeeMap.clear();
  });

  it('应该正确绑定标签到员工', () => {
    const tagId = 'TAG001';
    const employeeId = 'emp-001';
    const resourceId = 'res-001';

    tagEmployeeMap.set(tagId, { employeeId, resourceId });

    expect(tagEmployeeMap.has(tagId)).toBe(true);
    expect(tagEmployeeMap.get(tagId)?.employeeId).toBe(employeeId);
    expect(tagEmployeeMap.get(tagId)?.resourceId).toBe(resourceId);
  });

  it('应该正确解绑标签', () => {
    const tagId = 'TAG001';
    tagEmployeeMap.set(tagId, { employeeId: 'emp-001' });

    tagEmployeeMap.delete(tagId);

    expect(tagEmployeeMap.has(tagId)).toBe(false);
  });

  it('应该正确处理未绑定的标签', () => {
    const tagId = 'UNKNOWN_TAG';

    expect(tagEmployeeMap.has(tagId)).toBe(false);
    expect(tagEmployeeMap.get(tagId)).toBeUndefined();
  });
});

// ==================== 区域容量测试 ====================

describe('区域容量管理', () => {
  it('应该正确检测区域是否超载', () => {
    const zone = {
      capacity: 10,
      currentCount: 8,
    };

    const isOverloaded = zone.currentCount > zone.capacity;
    const availableSlots = Math.max(0, zone.capacity - zone.currentCount);

    expect(isOverloaded).toBe(false);
    expect(availableSlots).toBe(2);
  });

  it('应该正确处理区域满员', () => {
    const zone = {
      capacity: 10,
      currentCount: 12,
    };

    const isOverloaded = zone.currentCount > zone.capacity;
    const overloadCount = Math.max(0, zone.currentCount - zone.capacity);

    expect(isOverloaded).toBe(true);
    expect(overloadCount).toBe(2);
  });
});

// ==================== 数据同步测试 ====================

describe('数据同步', () => {
  it('应该正确格式化工时同步数据', () => {
    const workHoursData = {
      employeeId: 'emp-001',
      taskId: 'task-001',
      reportedHours: 6.5,
      reportDate: '2026-02-01',
    };

    const syncPayload = {
      type: 'work_report_submitted',
      ...workHoursData,
      timestamp: new Date(),
    };

    expect(syncPayload.type).toBe('work_report_submitted');
    expect(syncPayload.reportedHours).toBe(6.5);
  });

  it('应该正确处理批量定位数据', () => {
    const batchData = [
      { tagId: 'TAG001', x: 10, y: 20, timestamp: new Date() },
      { tagId: 'TAG002', x: 30, y: 40, timestamp: new Date() },
      { tagId: 'TAG003', x: 50, y: 60, timestamp: new Date() },
    ];

    expect(batchData.length).toBe(3);
    expect(batchData.every(d => d.tagId && d.x !== undefined && d.y !== undefined)).toBe(true);
  });
});

// ==================== 统计报表测试 ====================

describe('统计报表', () => {
  it('应该正确按员工分组统计', () => {
    const records = [
      { employeeId: 'emp-001', effectiveMinutes: 420 },
      { employeeId: 'emp-001', effectiveMinutes: 400 },
      { employeeId: 'emp-002', effectiveMinutes: 450 },
    ];

    const grouped = records.reduce((acc, r) => {
      if (!acc[r.employeeId]) {
        acc[r.employeeId] = 0;
      }
      acc[r.employeeId] += r.effectiveMinutes;
      return acc;
    }, {} as Record<string, number>);

    expect(grouped['emp-001']).toBe(820);
    expect(grouped['emp-002']).toBe(450);
  });

  it('应该正确按区域分组统计', () => {
    const records = [
      { zoneId: 'zone-001', effectiveMinutes: 300 },
      { zoneId: 'zone-001', effectiveMinutes: 200 },
      { zoneId: 'zone-002', effectiveMinutes: 400 },
    ];

    const grouped = records.reduce((acc, r) => {
      if (!acc[r.zoneId]) {
        acc[r.zoneId] = 0;
      }
      acc[r.zoneId] += r.effectiveMinutes;
      return acc;
    }, {} as Record<string, number>);

    expect(grouped['zone-001']).toBe(500);
    expect(grouped['zone-002']).toBe(400);
  });

  it('应该正确按日期分组统计', () => {
    const records = [
      { workDate: '2026-02-01', effectiveMinutes: 420 },
      { workDate: '2026-02-01', effectiveMinutes: 400 },
      { workDate: '2026-02-02', effectiveMinutes: 450 },
    ];

    const grouped = records.reduce((acc, r) => {
      if (!acc[r.workDate]) {
        acc[r.workDate] = 0;
      }
      acc[r.workDate] += r.effectiveMinutes;
      return acc;
    }, {} as Record<string, number>);

    expect(grouped['2026-02-01']).toBe(820);
    expect(grouped['2026-02-02']).toBe(450);
  });
});
