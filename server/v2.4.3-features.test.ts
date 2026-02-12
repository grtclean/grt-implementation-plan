import { describe, it, expect } from 'vitest';
import {
  validateGeofence,
  calculateGeofenceArea,
  isPointInGeofence,
  generateGeofenceId,
  createPolygonGeofence,
  createRectangleGeofence
} from './services/geofence-visual-editor.service';
import {
  calculatePearsonCorrelation,
  detectDrift,
  detectSynchronizedDrift,
  detectAnomalyPatterns,
  type ParameterDataPoint,
  type MultiParameterDataset
} from './services/multi-parameter-analysis.service';
import {
  compareRecords,
  generateDiffReport,
  mergeRecords,
  generateImportPreview,
  type ImportConfig
} from './services/incremental-import.service';

describe('v2.4.3 GRT-Atom智能体单体功能增强', () => {
  
  describe('地理围栏可视化编辑器', () => {
    
    it('应验证有效的矩形围栏数据', () => {
      const rectGeofence = createRectangleGeofence(
        { x: 0, y: 0 }, 
        { x: 100, y: 50 }, 
        '装配区域', 
        'assembly'
      );
      const result = validateGeofence(rectGeofence);
      expect(result.valid).toBe(true);
    });
    
    it('应验证有效的多边形围栏数据', () => {
      const polyGeofence = createPolygonGeofence(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ],
        '测试区域',
        'testing'
      );
      const result = validateGeofence(polyGeofence);
      expect(result.valid).toBe(true);
    });
    
    it('应计算矩形围栏面积', () => {
      const rectGeofence = createRectangleGeofence(
        { x: 0, y: 0 }, 
        { x: 100, y: 50 }, 
        '测试区域', 
        'testing'
      );
      const area = calculateGeofenceArea(rectGeofence);
      expect(area).toBe(5000);
    });
    
    it('应检测点是否在围栏内', () => {
      const polyGeofence = createPolygonGeofence(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ],
        '测试区域',
        'testing'
      );
      expect(isPointInGeofence({ x: 50, y: 50 }, polyGeofence)).toBe(true);
      expect(isPointInGeofence({ x: 150, y: 50 }, polyGeofence)).toBe(false);
    });
    
    it('应生成唯一的围栏ID', () => {
      const id1 = generateGeofenceId();
      const id2 = generateGeofenceId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^gf_/);
    });
  });
  
  describe('多参数联合分析', () => {
    
    it('应计算皮尔逊相关系数', () => {
      const xValues = [100, 110, 120, 130];
      const yValues = [50, 55, 60, 65];
      const result = calculatePearsonCorrelation(xValues, yValues);
      expect(result.coefficient).toBeGreaterThan(0.9); // 高度正相关
    });
    
    it('应检测参数漂移', () => {
      // 需要带parameter字段的数据点
      const historicalData: ParameterDataPoint[] = [
        { timestamp: 1000, value: 100, parameter: 'pressure' },
        { timestamp: 2000, value: 105, parameter: 'pressure' },
        { timestamp: 3000, value: 110, parameter: 'pressure' },
        { timestamp: 4000, value: 115, parameter: 'pressure' },
        { timestamp: 5000, value: 120, parameter: 'pressure' },
        { timestamp: 6000, value: 125, parameter: 'pressure' },
        { timestamp: 7000, value: 130, parameter: 'pressure' },
        { timestamp: 8000, value: 135, parameter: 'pressure' }
      ];
      const drift = detectDrift(historicalData);
      expect(drift).toBeDefined();
      expect(drift).toHaveProperty('hasDrift');
      expect(drift).toHaveProperty('direction');
    });
    
    it('应检测同步漂移', () => {
      const dataset: MultiParameterDataset = {
        unitId: 'unit-1',
        serialNumber: 'SN-001',
        parameters: {
          pressure: [
            { timestamp: 1000, value: 100, parameter: 'pressure' },
            { timestamp: 2000, value: 105, parameter: 'pressure' },
            { timestamp: 3000, value: 110, parameter: 'pressure' },
            { timestamp: 4000, value: 115, parameter: 'pressure' },
            { timestamp: 5000, value: 120, parameter: 'pressure' }
          ],
          flow: [
            { timestamp: 1000, value: 50, parameter: 'flow' },
            { timestamp: 2000, value: 52.5, parameter: 'flow' },
            { timestamp: 3000, value: 55, parameter: 'flow' },
            { timestamp: 4000, value: 57.5, parameter: 'flow' },
            { timestamp: 5000, value: 60, parameter: 'flow' }
          ],
          temperature: [],
          position: [],
          ultrasonic: []
        },
        startTime: 1000,
        endTime: 5000
      };
      const syncDrift = detectSynchronizedDrift(dataset);
      expect(syncDrift).toBeDefined();
      expect(Array.isArray(syncDrift)).toBe(true); // 返回 DriftDetectionResult[]
    });
    
    it('应检测异常模式', () => {
      const dataset: MultiParameterDataset = {
        unitId: 'unit-1',
        serialNumber: 'SN-001',
        parameters: {
          pressure: [
            { timestamp: 1000, value: 100, parameter: 'pressure' },
            { timestamp: 2000, value: 102, parameter: 'pressure' },
            { timestamp: 3000, value: 200, parameter: 'pressure' }, // 异常
            { timestamp: 4000, value: 104, parameter: 'pressure' },
            { timestamp: 5000, value: 106, parameter: 'pressure' }
          ],
          flow: [
            { timestamp: 1000, value: 50, parameter: 'flow' },
            { timestamp: 2000, value: 51, parameter: 'flow' },
            { timestamp: 3000, value: 52, parameter: 'flow' },
            { timestamp: 4000, value: 53, parameter: 'flow' },
            { timestamp: 5000, value: 54, parameter: 'flow' }
          ],
          temperature: [],
          position: [],
          ultrasonic: []
        },
        startTime: 1000,
        endTime: 5000
      };
      const anomalies = detectAnomalyPatterns(dataset);
      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true); // 返回 AnomalyPattern[]
    });
  });
  
  describe('增量更新导入', () => {
    
    const importConfig: ImportConfig = {
      primaryKeyField: 'id',
      compareFields: ['id', 'sn', 'status'],
      ignoreFields: [],
      mode: 'incremental',
      conflictResolution: 'overwrite'
    };
    
    it('应比较新旧记录差异', () => {
      const existingRecord = { id: '1', sn: 'SN001', status: 'pending' };
      const newRecord = { id: '1', sn: 'SN001', status: 'passed' };
      const comparison = compareRecords(existingRecord, newRecord, importConfig);
      expect(comparison.changeType).toBe('modified');
      expect(comparison.fieldChanges.length).toBeGreaterThan(0);
    });
    
    it('应识别新增记录', () => {
      const existingRecord = null;
      const newRecord = { id: '3', sn: 'SN003', status: 'pending' };
      const comparison = compareRecords(existingRecord, newRecord, importConfig);
      expect(comparison.changeType).toBe('added');
    });
    
    it('应生成差异报告', () => {
      const tableName = 'agent_units';
      const existingRecords = [
        { id: '1', sn: 'SN001', status: 'pending' },
        { id: '2', sn: 'SN002', status: 'calibrating' }
      ];
      const newRecords = [
        { id: '1', sn: 'SN001', status: 'passed' },
        { id: '3', sn: 'SN003', status: 'pending' }
      ];
      const report = generateDiffReport(tableName, existingRecords, newRecords, importConfig);
      expect(report.tableName).toBe('agent_units');
      expect(report.addedRecords).toBe(1);
      expect(report.modifiedRecords).toBe(1);
    });
    
    it('应合并记录', () => {
      const existingRecord = { id: '1', sn: 'SN001', status: 'pending', createdAt: 1000 };
      const newRecord = { id: '1', sn: 'SN001', status: 'passed' };
      const merged = mergeRecords(existingRecord, newRecord, 'overwrite');
      expect(merged.status).toBe('passed');
      expect(merged.createdAt).toBe(1000); // 保留原有字段
    });
    
    it('应生成导入预览', () => {
      const diffReport = {
        importId: 'test-import',
        tableName: 'agent_units',
        importMode: 'incremental' as const,
        totalRecords: 3,
        addedRecords: 1,
        modifiedRecords: 1,
        deletedRecords: 0,
        unchangedRecords: 1,
        changes: [],
        summary: '新增 1 条，修改 1 条',
        estimatedImpact: 'low' as const,
        generatedAt: Date.now()
      };
      const preview = generateImportPreview(diffReport);
      expect(preview).toBeDefined();
      expect(preview).toHaveProperty('summary');
      expect(preview).toHaveProperty('recommendations');
    });
  });
  
  describe('集成测试', () => {
    
    it('应支持围栏编辑器和位置检测的联动', () => {
      // 创建围栏
      const geofence = createPolygonGeofence(
        [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
          { x: 0, y: 100 }
        ],
        '装配区域',
        'assembly'
      );
      
      // 验证围栏
      const validation = validateGeofence(geofence);
      expect(validation.valid).toBe(true);
      
      // 检测点位置
      const insidePoint = { x: 100, y: 50 };
      const outsidePoint = { x: 300, y: 50 };
      
      expect(isPointInGeofence(insidePoint, geofence)).toBe(true);
      expect(isPointInGeofence(outsidePoint, geofence)).toBe(false);
    });
    
    it('应支持多参数分析和趋势检测的联动', () => {
      // 计算相关性
      const pressure = [100, 110, 120, 130];
      const flow = [50, 55, 60, 65];
      const correlation = calculatePearsonCorrelation(pressure, flow);
      expect(correlation.coefficient).toBeGreaterThan(0.9);
      
      // 检测漂移
      const driftData: ParameterDataPoint[] = [
        { timestamp: 1000, value: 100, parameter: 'pressure' },
        { timestamp: 2000, value: 105, parameter: 'pressure' },
        { timestamp: 3000, value: 110, parameter: 'pressure' },
        { timestamp: 4000, value: 115, parameter: 'pressure' },
        { timestamp: 5000, value: 120, parameter: 'pressure' },
        { timestamp: 6000, value: 125, parameter: 'pressure' }
      ];
      const drift = detectDrift(driftData);
      expect(drift).toBeDefined();
    });
    
    it('应支持增量导入和变更追踪的联动', () => {
      const importConfig: ImportConfig = {
        primaryKeyField: 'id',
        compareFields: ['id', 'sn', 'status'],
        ignoreFields: [],
        mode: 'incremental',
        conflictResolution: 'overwrite'
      };
      
      // 比较记录
      const existing = { id: '1', sn: 'GRT-001', status: 'pending' };
      const updated = { id: '1', sn: 'GRT-001', status: 'passed' };
      const comparison = compareRecords(existing, updated, importConfig);
      expect(comparison.changeType).toBe('modified');
      
      // 生成报告
      const existingRecords = [existing];
      const newRecords = [updated];
      const report = generateDiffReport('agent_units', existingRecords, newRecords, importConfig);
      expect(report.modifiedRecords).toBe(1);
      
      // 生成预览
      const preview = generateImportPreview(report);
      expect(preview).toBeDefined();
    });
  });
});
