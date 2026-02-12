/**
 * v2.4.4 GRT-Atom智能体单体功能增强测试
 * 测试：围栏撤销/重做和模板库、根因分析、定时自动同步
 */

import { describe, it, expect } from 'vitest';
import {
  createUndoRedoHistory,
  recordOperation,
  undoOperation,
  redoOperation,
  canUndo,
  canRedo,
  getAllTemplates,
  applyTemplate,
  BUILT_IN_TEMPLATES
} from './services/geofence-undo-redo.service';
import {
  traceRootCause,
  buildCausalGraph,
  detectAnomalies,
  generateRootCauseReport,
  type ParameterDataPoint
} from './services/root-cause-analysis.service';
import {
  createDataSourceConfig,
  createSyncTaskConfig,
  calculateNextRunTime,
  validateDataSourceConnection,
  getSyncTaskSummary,
  generateSyncReport,
  getDataSourceTemplates,
  createDataSourceFromTemplate
} from './services/auto-sync.service';

describe('v2.4.4 GRT-Atom智能体单体功能增强', () => {
  describe('地理围栏编辑器撤销/重做功能', () => {
    it('应该创建撤销/重做历史管理器', () => {
      const history = createUndoRedoHistory();
      expect(history).toBeDefined();
      expect(history.undoStack).toEqual([]);
      expect(history.redoStack).toEqual([]);
      expect(history.maxHistorySize).toBe(50);
    });

    it('应该记录操作到历史', () => {
      let history = createUndoRedoHistory();
      
      const mockGeofence = {
        id: 'gf_1',
        name: '测试围栏',
        type: 'rectangle' as const,
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        alertLevel: 'info' as const,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      history = recordOperation(history, {
        type: 'add',
        geofence: mockGeofence
      });
      
      expect(history.undoStack.length).toBe(1);
      expect(canUndo(history)).toBe(true);
    });

    it('应该正确执行撤销操作', () => {
      let history = createUndoRedoHistory();
      
      const mockGeofence = {
        id: 'gf_1',
        name: '测试围栏',
        type: 'rectangle' as const,
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        alertLevel: 'info' as const,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      history = recordOperation(history, {
        type: 'add',
        geofence: mockGeofence
      });
      
      const result = undoOperation(history);
      expect(result.operation).toBeDefined();
      expect(result.history.undoStack.length).toBe(0);
      expect(result.history.redoStack.length).toBe(1);
    });

    it('应该正确执行重做操作', () => {
      let history = createUndoRedoHistory();
      
      const mockGeofence = {
        id: 'gf_1',
        name: '测试围栏',
        type: 'rectangle' as const,
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        alertLevel: 'info' as const,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      history = recordOperation(history, {
        type: 'add',
        geofence: mockGeofence
      });
      
      const undoResult = undoOperation(history);
      const redoResult = redoOperation(undoResult.history);
      
      expect(redoResult.operation).toBeDefined();
      expect(redoResult.history.undoStack.length).toBe(1);
      expect(redoResult.history.redoStack.length).toBe(0);
    });
  });

  describe('围栏模板库', () => {
    it('应该获取预定义模板列表', () => {
      const templates = getAllTemplates();
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('应该包含内置模板', () => {
      expect(BUILT_IN_TEMPLATES).toBeDefined();
      expect(Array.isArray(BUILT_IN_TEMPLATES)).toBe(true);
      expect(BUILT_IN_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('应该从模板创建围栏', () => {
      const templates = getAllTemplates();
      const template = templates[0];
      
      const geofence = applyTemplate(template, { x: 10, y: 20 });
      
      expect(geofence).toBeDefined();
      expect(geofence.name).toBe(template.name);
      expect(geofence.x).toBe(10);
      expect(geofence.y).toBe(20);
    });
  });

  describe('多参数分析根因分析功能', () => {
    // 创建模拟参数数据
    const createMockParameterData = (): Map<string, ParameterDataPoint[]> => {
      const data = new Map<string, ParameterDataPoint[]>();
      const now = Date.now();
      
      // 压力数据 - 包含异常
      data.set('pressure', [
        { timestamp: now - 3600000, value: 10.0, parameterId: 'pressure', parameterName: '压力' },
        { timestamp: now - 3500000, value: 10.5, parameterId: 'pressure', parameterName: '压力' },
        { timestamp: now - 3400000, value: 11.0, parameterId: 'pressure', parameterName: '压力' },
        { timestamp: now - 3300000, value: 15.5, parameterId: 'pressure', parameterName: '压力' },
        { timestamp: now - 3200000, value: 16.0, parameterId: 'pressure', parameterName: '压力' },
      ]);
      
      // 流量数据
      data.set('flow', [
        { timestamp: now - 3600000, value: 4.0, parameterId: 'flow', parameterName: '流量' },
        { timestamp: now - 3500000, value: 4.1, parameterId: 'flow', parameterName: '流量' },
        { timestamp: now - 3400000, value: 4.0, parameterId: 'flow', parameterName: '流量' },
        { timestamp: now - 3300000, value: 2.8, parameterId: 'flow', parameterName: '流量' },
        { timestamp: now - 3200000, value: 2.5, parameterId: 'flow', parameterName: '流量' },
      ]);
      
      // 温度数据
      data.set('temperature', [
        { timestamp: now - 3600000, value: 45.0, parameterId: 'temperature', parameterName: '温度' },
        { timestamp: now - 3500000, value: 46.0, parameterId: 'temperature', parameterName: '温度' },
        { timestamp: now - 3400000, value: 47.0, parameterId: 'temperature', parameterName: '温度' },
        { timestamp: now - 3300000, value: 48.0, parameterId: 'temperature', parameterName: '温度' },
        { timestamp: now - 3200000, value: 49.0, parameterId: 'temperature', parameterName: '温度' },
      ]);
      
      return data;
    };

    it('应该检测参数异常', () => {
      const data = createMockParameterData();
      const pressureData = data.get('pressure')!;
      
      const anomalies = detectAnomalies(pressureData, 1.5);
      
      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('应该构建因果图', () => {
      const data = createMockParameterData();
      
      const relations = buildCausalGraph(data);
      
      expect(relations).toBeDefined();
      expect(Array.isArray(relations)).toBe(true);
    });

    it('应该追溯根因', () => {
      const data = createMockParameterData();
      const pressureData = data.get('pressure')!;
      const anomalies = detectAnomalies(pressureData, 1.5);
      
      if (anomalies.length > 0) {
        const relations = buildCausalGraph(data);
        const result = traceRootCause(anomalies[0], data, relations);
        
        expect(result).toBeDefined();
        expect(result.anomalyId).toBeDefined();
        expect(result.rootCauses).toBeDefined();
      }
    });

    it('应该生成根因分析报告', () => {
      const mockResults = [
        {
          anomalyId: 'anomaly_1',
          rootCauses: [
            {
              parameterName: 'pressure',
              probability: 0.85,
              evidence: ['异常发生时间', '偏差值'],
              timeOffset: 300000,
              contributionScore: 0.9
            }
          ],
          causalChain: [],
          confidence: 0.85,
          recommendations: ['检查压力传感器']
        }
      ];
      
      const report = generateRootCauseReport(mockResults);
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.statistics.totalAnomalies).toBe(1);
    });
  });

  describe('增量导入定时自动同步功能', () => {
    describe('数据源配置', () => {
      it('应该创建数据源配置', () => {
        const config = createDataSourceConfig({
          name: '测试数据源',
          type: 'rest_api',
          enabled: true,
          connection: {
            url: 'https://api.example.com/data',
            timeout: 30000
          },
          mapping: [
            { sourceField: 'id', targetField: 'serialNumber' }
          ]
        });
        
        expect(config).toBeDefined();
        expect(config.id).toBeDefined();
        expect(config.name).toBe('测试数据源');
        expect(config.type).toBe('rest_api');
      });

      it('应该验证数据源连接', async () => {
        const config = createDataSourceConfig({
          name: '测试API',
          type: 'rest_api',
          enabled: true,
          connection: {
            url: 'https://api.example.com/data'
          },
          mapping: []
        });
        
        const result = await validateDataSourceConnection(config);
        expect(result).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
        expect(result.message).toBeDefined();
      });
    });

    describe('同步任务配置', () => {
      it('应该创建同步任务配置', () => {
        const task = createSyncTaskConfig({
          name: '每日同步',
          description: '每天同步智能体单体数据',
          dataSourceId: 'ds_123',
          targetEntity: 'agent_units',
          schedule: {
            frequency: 'daily',
            timezone: 'Asia/Shanghai'
          },
          syncMode: 'incremental',
          conflictResolution: 'merge',
          notifications: {
            onSuccess: true,
            onFailure: true,
            onWarning: false,
            recipients: ['admin@example.com']
          },
          enabled: true
        });
        
        expect(task).toBeDefined();
        expect(task.id).toBeDefined();
        expect(task.status).toBe('idle');
      });

      it('应该计算下次运行时间', () => {
        const schedule = {
          frequency: 'hourly' as const,
          timezone: 'Asia/Shanghai'
        };
        
        const nextRun = calculateNextRunTime(schedule);
        expect(nextRun).toBeGreaterThan(Date.now());
      });
    });

    describe('同步状态摘要', () => {
      it('应该获取同步任务状态摘要', () => {
        const tasks = [
          createSyncTaskConfig({
            name: '任务1',
            description: '测试任务1',
            dataSourceId: 'ds_1',
            targetEntity: 'agent_units',
            schedule: { frequency: 'daily', timezone: 'UTC' },
            syncMode: 'full',
            conflictResolution: 'overwrite',
            notifications: { onSuccess: false, onFailure: true, onWarning: false, recipients: [] },
            enabled: true
          }),
          createSyncTaskConfig({
            name: '任务2',
            description: '测试任务2',
            dataSourceId: 'ds_2',
            targetEntity: 'calibration_records',
            schedule: { frequency: 'hourly', timezone: 'UTC' },
            syncMode: 'incremental',
            conflictResolution: 'merge',
            notifications: { onSuccess: true, onFailure: true, onWarning: true, recipients: [] },
            enabled: false
          })
        ];
        
        const summary = getSyncTaskSummary(tasks, []);
        
        expect(summary).toBeDefined();
        expect(summary.totalTasks).toBe(2);
        expect(summary.enabledTasks).toBe(1);
      });
    });

    describe('同步报告生成', () => {
      it('应该生成同步报告', () => {
        const task = createSyncTaskConfig({
          name: '测试任务',
          description: '测试同步任务',
          dataSourceId: 'ds_1',
          targetEntity: 'agent_units',
          schedule: { frequency: 'daily', timezone: 'UTC' },
          syncMode: 'full',
          conflictResolution: 'overwrite',
          notifications: { onSuccess: false, onFailure: true, onWarning: false, recipients: [] },
          enabled: true
        });
        
        const executions = [
          {
            taskId: task.id,
            executionId: 'exec_1',
            startTime: Date.now() - 86400000,
            endTime: Date.now() - 86400000 + 60000,
            status: 'success' as const,
            statistics: {
              totalRecords: 100,
              insertedRecords: 80,
              updatedRecords: 15,
              skippedRecords: 5,
              failedRecords: 0
            },
            errors: [],
            warnings: []
          }
        ];
        
        const report = generateSyncReport(task, executions);
        
        expect(report).toBeDefined();
        expect(report.taskName).toBe('测试任务');
        expect(report.summary.totalExecutions).toBe(1);
        expect(report.summary.successfulExecutions).toBe(1);
      });
    });

    describe('数据源模板', () => {
      it('应该获取数据源模板列表', () => {
        const templates = getDataSourceTemplates();
        
        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThan(0);
      });

      it('应该从模板创建数据源', () => {
        const dataSource = createDataSourceFromTemplate(0, {
          name: '自定义ERP数据源',
          connection: {
            url: 'https://erp.example.com/api'
          }
        });
        
        expect(dataSource).toBeDefined();
        expect(dataSource.name).toBe('自定义ERP数据源');
        expect(dataSource.id).toBeDefined();
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的围栏编辑工作流', () => {
      // 1. 创建历史管理器
      let history = createUndoRedoHistory();
      
      // 2. 获取模板
      const templates = getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // 3. 从模板创建围栏
      const geofence = applyTemplate(templates[0], { x: 5, y: 5 });
      expect(geofence.name).toBeDefined();
      
      // 4. 记录操作
      history = recordOperation(history, {
        type: 'add',
        geofence: {
          id: 'test_gf',
          name: geofence.name,
          type: 'rectangle',
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          alertLevel: 'info',
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
      
      // 5. 验证撤销/重做状态
      expect(canUndo(history)).toBe(true);
      expect(canRedo(history)).toBe(false);
      
      // 6. 执行撤销
      const undoResult = undoOperation(history);
      expect(canUndo(undoResult.history)).toBe(false);
      expect(canRedo(undoResult.history)).toBe(true);
    });

    it('应该支持完整的根因分析工作流', () => {
      // 创建模拟数据
      const data = new Map<string, ParameterDataPoint[]>();
      const now = Date.now();
      
      data.set('temp', [
        { timestamp: now - 3600000, value: 50, parameterId: 'temp', parameterName: '温度' },
        { timestamp: now - 3500000, value: 52, parameterId: 'temp', parameterName: '温度' },
        { timestamp: now - 3400000, value: 85, parameterId: 'temp', parameterName: '温度' },
        { timestamp: now - 3300000, value: 88, parameterId: 'temp', parameterName: '温度' },
      ]);
      
      // 1. 检测异常
      const anomalies = detectAnomalies(data.get('temp')!, 1.5);
      expect(anomalies).toBeDefined();
      
      // 2. 构建因果图
      const relations = buildCausalGraph(data);
      expect(relations).toBeDefined();
      
      // 3. 如果有异常，追溯根因
      if (anomalies.length > 0) {
        const result = traceRootCause(anomalies[0], data, relations);
        expect(result.anomalyId).toBeDefined();
      }
    });

    it('应该支持完整的自动同步工作流', async () => {
      // 1. 创建数据源
      const dataSource = createDataSourceConfig({
        name: 'MES系统',
        type: 'database',
        enabled: true,
        connection: {
          host: 'mes.example.com',
          port: 3306,
          database: 'mes_db'
        },
        mapping: [
          { sourceField: 'sn', targetField: 'serialNumber' },
          { sourceField: 'status', targetField: 'status' }
        ]
      });
      
      // 2. 验证连接
      const validation = await validateDataSourceConnection(dataSource);
      expect(validation.valid).toBe(true);
      
      // 3. 创建同步任务
      const task = createSyncTaskConfig({
        name: 'MES数据同步',
        description: '从MES系统同步智能体单体数据',
        dataSourceId: dataSource.id,
        targetEntity: 'agent_units',
        schedule: {
          frequency: 'hourly',
          timezone: 'Asia/Shanghai'
        },
        syncMode: 'incremental',
        incrementalConfig: {
          timestampField: 'updated_at',
          batchSize: 1000
        },
        conflictResolution: 'merge',
        notifications: {
          onSuccess: false,
          onFailure: true,
          onWarning: true,
          recipients: ['ops@example.com']
        },
        enabled: true
      });
      
      // 4. 计算下次运行时间
      const nextRun = calculateNextRunTime(task.schedule);
      expect(nextRun).toBeGreaterThan(Date.now());
      
      // 5. 获取状态摘要
      const summary = getSyncTaskSummary([task], []);
      expect(summary.totalTasks).toBe(1);
      expect(summary.enabledTasks).toBe(1);
    });
  });
});
