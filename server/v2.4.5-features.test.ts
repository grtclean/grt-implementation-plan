/**
 * v2.4.5 GRT-Atom智能体单体功能增强测试
 * 测试：围栏模板导入/导出、根因分析可视化、同步任务监控仪表盘
 */

import { describe, it, expect } from 'vitest';
import {
  exportTemplates,
  exportToJsonString,
  importTemplates,
  validateImportFile,
  parseImportJson,
  getImportPreview,
  mergeTemplates,
  generateExportFilename,
  compareTemplatePackages,
  calculateChecksum,
  EXPORT_FORMAT_VERSION
} from './services/geofence-template-io.service';
import {
  buildVisualizationGraph,
  hierarchicalLayout,
  generateEdgePath,
  exportToSvg,
  getNodeCausalPaths,
  highlightCausalPath,
  type CausalGraph,
  type VisualizationNode
} from './services/root-cause-visualization.service';
import {
  generateDashboardSummary,
  getRealtimeStatus,
  calculateTaskStats,
  calculateDataFlowStats,
  analyzeErrors,
  generateTimeSeries,
  checkAlertRules,
  acknowledgeAlert,
  getAlertStatistics,
  getTimeRangeStart,
  formatDuration,
  formatDataVolume,
  DEFAULT_ALERT_RULES,
  type TimeRange,
  type MonitoringAlert
} from './services/sync-monitoring.service';
import { BUILT_IN_TEMPLATES, type GeofenceTemplate } from './services/geofence-undo-redo.service';
import { type CausalRelation, type RootCauseResult, type AnomalyEvent } from './services/root-cause-analysis.service';
import { type SyncTaskConfig, type SyncExecution, createSyncTaskConfig } from './services/auto-sync.service';

describe('v2.4.5 GRT-Atom智能体单体功能增强', () => {
  describe('围栏模板导入/导出功能', () => {
    // 创建测试模板
    const createTestTemplates = (): GeofenceTemplate[] => [
      {
        id: 'tpl_test_1',
        name: '测试装配区',
        description: '测试用装配区围栏',
        category: 'assembly',
        shape: 'rectangle',
        defaultWidth: 10,
        defaultHeight: 8,
        alertLevel: 'info',
        triggerType: 'both',
        color: '#22c55e',
        isBuiltIn: false,
        usageCount: 5,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now()
      },
      {
        id: 'tpl_test_2',
        name: '测试安全区',
        description: '测试用安全区围栏',
        category: 'safety',
        shape: 'circle',
        defaultRadius: 5,
        alertLevel: 'critical',
        triggerType: 'enter',
        color: '#ef4444',
        isBuiltIn: false,
        usageCount: 3,
        createdAt: Date.now() - 43200000,
        updatedAt: Date.now()
      }
    ];

    describe('导出功能', () => {
      it('应该导出自定义模板为JSON包', () => {
        const templates = createTestTemplates();
        const pkg = exportTemplates(templates);
        
        expect(pkg).toBeDefined();
        expect(pkg.metadata).toBeDefined();
        expect(pkg.metadata.version).toBe(EXPORT_FORMAT_VERSION);
        expect(pkg.metadata.templateCount).toBe(2);
        expect(pkg.templates).toHaveLength(2);
      });

      it('应该支持包含内置模板导出', () => {
        const templates = createTestTemplates();
        const pkg = exportTemplates(templates, { includeBuiltIn: true });
        
        expect(pkg.templates.length).toBeGreaterThan(2);
        expect(pkg.metadata.templateCount).toBe(pkg.templates.length);
      });

      it('应该支持类别过滤导出', () => {
        const templates = createTestTemplates();
        const pkg = exportTemplates(templates, { categoryFilter: ['assembly'] });
        
        expect(pkg.templates).toHaveLength(1);
        expect(pkg.templates[0].category).toBe('assembly');
      });

      it('应该生成JSON字符串', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        expect(jsonStr).toBeDefined();
        expect(typeof jsonStr).toBe('string');
        
        const parsed = JSON.parse(jsonStr);
        expect(parsed.metadata).toBeDefined();
        expect(parsed.templates).toBeDefined();
      });

      it('应该支持压缩JSON输出', () => {
        const templates = createTestTemplates();
        const normalJson = exportToJsonString(templates);
        const minifiedJson = exportToJsonString(templates, { minify: true });
        
        expect(minifiedJson.length).toBeLessThan(normalJson.length);
      });

      it('应该生成正确的导出文件名', () => {
        const filename = generateExportFilename();
        
        expect(filename).toMatch(/^geofence-templates_\d{8}_\d{6}\.json$/);
      });

      it('应该计算校验和', () => {
        const templates = createTestTemplates();
        const checksum = calculateChecksum(templates);
        
        expect(checksum).toBeDefined();
        expect(checksum.length).toBe(8);
      });
    });

    describe('导入功能', () => {
      it('应该解析有效的JSON导入', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const parseResult = parseImportJson(jsonStr);
        
        expect(parseResult.success).toBe(true);
        expect(parseResult.package).toBeDefined();
        expect(parseResult.package?.templates).toHaveLength(2);
      });

      it('应该处理无效的JSON', () => {
        const parseResult = parseImportJson('invalid json');
        
        expect(parseResult.success).toBe(false);
        expect(parseResult.error).toBeDefined();
      });

      it('应该导入模板', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const result = importTemplates(jsonStr, []);
        
        expect(result.success).toBe(true);
        expect(result.importedCount).toBe(2);
        expect(result.importedTemplates).toHaveLength(2);
      });

      it('应该跳过重复模板', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const result = importTemplates(jsonStr, templates, { skipDuplicates: true });
        
        expect(result.importedCount).toBe(0);
        expect(result.skippedCount).toBe(2);
      });

      it('应该验证模板字段', () => {
        const invalidJson = JSON.stringify({
          metadata: { version: '1.0.0', templateCount: 1, checksum: '00000000', exportedAt: Date.now() },
          templates: [{ name: '', category: 'invalid' }]
        });
        
        const result = importTemplates(invalidJson, []);
        
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('应该支持类别过滤导入', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const result = importTemplates(jsonStr, [], { categoryFilter: ['safety'] });
        
        expect(result.importedCount).toBe(1);
        expect(result.importedTemplates[0].category).toBe('safety');
      });
    });

    describe('验证功能', () => {
      it('应该验证导入文件', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const validation = validateImportFile(jsonStr);
        
        expect(validation.valid).toBe(true);
        expect(validation.templateCount).toBe(2);
        expect(validation.categories).toContain('assembly');
        expect(validation.categories).toContain('safety');
      });

      it('应该获取导入预览', () => {
        const templates = createTestTemplates();
        const jsonStr = exportToJsonString(templates);
        
        const preview = getImportPreview(jsonStr);
        
        expect(preview.valid).toBe(true);
        expect(preview.summary).toBeDefined();
        expect(preview.summary?.totalTemplates).toBe(2);
        expect(preview.summary?.byCategory.length).toBe(2);
      });
    });

    describe('合并功能', () => {
      it('应该合并模板列表', () => {
        const existing = createTestTemplates();
        const imported: GeofenceTemplate[] = [{
          id: 'tpl_new',
          name: '新模板',
          description: '新增模板',
          category: 'testing',
          shape: 'polygon',
          defaultVertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 2.5, y: 5 }],
          alertLevel: 'warning',
          triggerType: 'exit',
          color: '#f59e0b',
          isBuiltIn: false,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }];
        
        const merged = mergeTemplates(existing, imported);
        
        expect(merged).toHaveLength(3);
      });

      it('应该支持覆盖合并', () => {
        const existing = createTestTemplates();
        const imported: GeofenceTemplate[] = [{
          ...existing[0],
          id: 'tpl_updated',
          description: '更新后的描述'
        }];
        
        const merged = mergeTemplates(existing, imported, true);
        
        expect(merged).toHaveLength(2);
        const updated = merged.find(t => t.name === existing[0].name);
        expect(updated?.description).toBe('更新后的描述');
      });
    });

    describe('比较功能', () => {
      it('应该比较两个模板包', () => {
        const templates1 = createTestTemplates();
        const templates2 = [
          { ...templates1[0], description: '修改后' },
          {
            id: 'tpl_new',
            name: '新模板',
            description: '新增',
            category: 'testing' as const,
            shape: 'circle' as const,
            defaultRadius: 3,
            alertLevel: 'info' as const,
            triggerType: 'both' as const,
            color: '#3b82f6',
            isBuiltIn: false,
            usageCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ];
        
        const pkg1 = exportTemplates(templates1);
        const pkg2 = exportTemplates(templates2);
        
        const diff = compareTemplatePackages(pkg1, pkg2);
        
        expect(diff.added).toHaveLength(1);
        expect(diff.removed).toHaveLength(1);
        expect(diff.modified.length + diff.unchanged.length).toBe(1);
      });
    });
  });

  describe('根因分析可视化功能', () => {
    // 创建测试数据
    const createTestCausalData = () => {
      const anomalies: AnomalyEvent[] = [
        {
          id: 'anomaly_1',
          parameterId: 'pressure',
          parameterName: '压力',
          timestamp: Date.now() - 3600000,
          value: 15.5,
          expectedValue: 10.0,
          deviation: 5.5,
          severity: 'high',
          type: 'spike'
        }
      ];
      
      const causalRelations: CausalRelation[] = [
        {
          sourceParameter: '温度',
          targetParameter: '压力',
          correlation: 0.85,
          lagTime: 300000,
          confidence: 0.9
        },
        {
          sourceParameter: '流量',
          targetParameter: '温度',
          correlation: 0.72,
          lagTime: 600000,
          confidence: 0.85
        },
        {
          sourceParameter: '阀门开度',
          targetParameter: '流量',
          correlation: 0.95,
          lagTime: 100000,
          confidence: 0.95
        }
      ];
      
      const rootCauseResults: RootCauseResult[] = [
        {
          anomalyId: 'anomaly_1',
          rootCauses: [
            {
              parameterName: '阀门开度',
              probability: 0.92,
              evidence: ['时间序列相关性', '因果链追溯'],
              timeOffset: 1000000,
              contributionScore: 0.95
            }
          ],
          causalChain: ['阀门开度', '流量', '温度', '压力'],
          confidence: 0.88,
          recommendations: ['检查阀门控制系统', '校准阀门位置传感器']
        }
      ];
      
      return { anomalies, causalRelations, rootCauseResults };
    };

    describe('层次布局算法', () => {
      it('应该计算节点位置', () => {
        const nodes = new Map<string, { type: any; data: any }>([
          ['A', { type: 'root_cause', data: {} }],
          ['B', { type: 'intermediate', data: {} }],
          ['C', { type: 'anomaly', data: {} }]
        ]);
        
        const edges = [
          { source: 'A', target: 'B', correlation: 0.8 },
          { source: 'B', target: 'C', correlation: 0.7 }
        ];
        
        const positions = hierarchicalLayout(nodes, edges);
        
        expect(positions.size).toBe(3);
        expect(positions.get('A')).toBeDefined();
        expect(positions.get('B')).toBeDefined();
        expect(positions.get('C')).toBeDefined();
      });

      it('应该支持不同布局方向', () => {
        const nodes = new Map<string, { type: any; data: any }>([
          ['A', { type: 'root_cause', data: {} }],
          ['B', { type: 'anomaly', data: {} }]
        ]);
        
        const edges = [{ source: 'A', target: 'B', correlation: 0.8 }];
        
        const tbPositions = hierarchicalLayout(nodes, edges, { direction: 'TB' });
        const lrPositions = hierarchicalLayout(nodes, edges, { direction: 'LR' });
        
        // TB方向：y坐标应该不同
        expect(tbPositions.get('A')?.y).not.toBe(tbPositions.get('B')?.y);
        
        // LR方向：x坐标应该不同
        expect(lrPositions.get('A')?.x).not.toBe(lrPositions.get('B')?.x);
      });
    });

    describe('可视化图构建', () => {
      it('应该构建完整的可视化图', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        expect(graph).toBeDefined();
        expect(graph.nodes.length).toBeGreaterThan(0);
        expect(graph.edges.length).toBeGreaterThan(0);
        expect(graph.layout).toBeDefined();
        expect(graph.legend).toBeDefined();
        expect(graph.statistics).toBeDefined();
      });

      it('应该正确标记节点类型', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        const rootCauseNodes = graph.nodes.filter(n => n.type === 'root_cause');
        const anomalyNodes = graph.nodes.filter(n => n.type === 'anomaly');
        
        expect(rootCauseNodes.length).toBeGreaterThan(0);
        expect(anomalyNodes.length).toBeGreaterThan(0);
      });

      it('应该计算图统计信息', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        expect(graph.statistics.totalNodes).toBe(graph.nodes.length);
        expect(graph.statistics.totalEdges).toBe(graph.edges.length);
        expect(graph.statistics.rootCauseCount).toBeGreaterThanOrEqual(0);
      });

      it('应该支持过滤弱相关关系', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        
        const graphWithWeak = buildVisualizationGraph(
          rootCauseResults, causalRelations, anomalies,
          { showWeakRelations: true, minCorrelation: 0.1 }
        );
        
        const graphWithoutWeak = buildVisualizationGraph(
          rootCauseResults, causalRelations, anomalies,
          { showWeakRelations: false, minCorrelation: 0.9 }
        );
        
        expect(graphWithWeak.edges.length).toBeGreaterThanOrEqual(graphWithoutWeak.edges.length);
      });
    });

    describe('SVG导出', () => {
      it('应该生成有效的SVG字符串', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        const svg = exportToSvg(graph);
        
        expect(svg).toContain('<?xml');
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('<g class="nodes">');
        expect(svg).toContain('<g class="edges">');
      });

      it('应该生成边路径', () => {
        const points = [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 }
        ];
        
        const path = generateEdgePath(points);
        
        expect(path).toContain('M 0 0');
        expect(path.length).toBeGreaterThan(10);
      });
    });

    describe('因果路径分析', () => {
      it('应该获取节点的因果路径', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        if (graph.nodes.length > 0) {
          const paths = getNodeCausalPaths(graph, graph.nodes[0].id);
          
          expect(paths).toBeDefined();
          expect(paths.upstream).toBeDefined();
          expect(paths.downstream).toBeDefined();
        }
      });

      it('应该高亮因果路径', () => {
        const { anomalies, causalRelations, rootCauseResults } = createTestCausalData();
        const graph = buildVisualizationGraph(rootCauseResults, causalRelations, anomalies);
        
        if (graph.nodes.length >= 2) {
          const path = [graph.nodes[0].id, graph.nodes[1].id];
          const highlighted = highlightCausalPath(graph, path);
          
          expect(highlighted.nodes.some(n => n.style.opacity === 1)).toBe(true);
          expect(highlighted.nodes.some(n => n.style.opacity < 1)).toBe(true);
        }
      });
    });
  });

  describe('同步任务监控仪表盘功能', () => {
    // 创建测试数据
    const createTestTasks = (): SyncTaskConfig[] => [
      createSyncTaskConfig({
        name: 'ERP数据同步',
        description: '从ERP系统同步数据',
        dataSourceId: 'ds_erp',
        targetEntity: 'agent_units',
        schedule: { frequency: 'hourly', timezone: 'Asia/Shanghai' },
        syncMode: 'incremental',
        conflictResolution: 'merge',
        notifications: { onSuccess: false, onFailure: true, onWarning: false, recipients: [] },
        enabled: true
      }),
      createSyncTaskConfig({
        name: 'MES数据同步',
        description: '从MES系统同步数据',
        dataSourceId: 'ds_mes',
        targetEntity: 'calibration_records',
        schedule: { frequency: 'daily', timezone: 'Asia/Shanghai' },
        syncMode: 'full',
        conflictResolution: 'overwrite',
        notifications: { onSuccess: true, onFailure: true, onWarning: true, recipients: [] },
        enabled: true
      }),
      createSyncTaskConfig({
        name: '暂停的任务',
        description: '已暂停的同步任务',
        dataSourceId: 'ds_test',
        targetEntity: 'test_data',
        schedule: { frequency: 'weekly', timezone: 'UTC' },
        syncMode: 'incremental',
        conflictResolution: 'skip',
        notifications: { onSuccess: false, onFailure: false, onWarning: false, recipients: [] },
        enabled: false
      })
    ];

    const createTestExecutions = (tasks: SyncTaskConfig[]): SyncExecution[] => {
      const now = Date.now();
      return [
        {
          taskId: tasks[0].id,
          executionId: 'exec_1',
          startTime: now - 3600000,
          endTime: now - 3600000 + 30000,
          status: 'success',
          statistics: {
            totalRecords: 100,
            insertedRecords: 80,
            updatedRecords: 15,
            skippedRecords: 5,
            failedRecords: 0
          },
          errors: [],
          warnings: []
        },
        {
          taskId: tasks[0].id,
          executionId: 'exec_2',
          startTime: now - 7200000,
          endTime: now - 7200000 + 45000,
          status: 'success',
          statistics: {
            totalRecords: 120,
            insertedRecords: 100,
            updatedRecords: 18,
            skippedRecords: 2,
            failedRecords: 0
          },
          errors: [],
          warnings: []
        },
        {
          taskId: tasks[1].id,
          executionId: 'exec_3',
          startTime: now - 86400000,
          endTime: now - 86400000 + 120000,
          status: 'failed',
          statistics: {
            totalRecords: 500,
            insertedRecords: 200,
            updatedRecords: 0,
            skippedRecords: 0,
            failedRecords: 300
          },
          errors: ['Connection timeout', 'Database error'],
          warnings: ['Slow query detected']
        }
      ];
    };

    describe('时间范围处理', () => {
      it('应该计算正确的时间范围起始时间', () => {
        const now = Date.now();
        
        const hour1 = getTimeRangeStart('1h');
        expect(now - hour1).toBeCloseTo(3600000, -3);
        
        const hour6 = getTimeRangeStart('6h');
        expect(now - hour6).toBeCloseTo(6 * 3600000, -3);
        
        const day1 = getTimeRangeStart('24h');
        expect(now - day1).toBeCloseTo(24 * 3600000, -3);
      });
    });

    describe('任务统计', () => {
      it('应该计算任务执行统计', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const stats = calculateTaskStats(tasks[0], executions, '24h');
        
        expect(stats.taskId).toBe(tasks[0].id);
        expect(stats.taskName).toBe(tasks[0].name);
        expect(stats.totalExecutions).toBe(2);
        expect(stats.successfulExecutions).toBe(2);
        expect(stats.successRate).toBe(1);
      });

      it('应该计算数据流量统计', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const stats = calculateDataFlowStats(executions, '7d');
        
        expect(stats.totalRecordsIn).toBeGreaterThan(0);
        expect(stats.insertedRecords).toBeGreaterThan(0);
        expect(stats.updatedRecords).toBeGreaterThan(0);
      });
    });

    describe('错误分析', () => {
      it('应该分析错误类型', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const errors = analyzeErrors(executions, '7d', tasks);
        
        expect(errors).toBeDefined();
        expect(Array.isArray(errors)).toBe(true);
      });
    });

    describe('时间序列数据', () => {
      it('应该生成时间序列数据', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const timeSeries = generateTimeSeries(executions, 'execution_count', '24h');
        
        expect(timeSeries).toBeDefined();
        expect(timeSeries.metric).toBe('execution_count');
        expect(timeSeries.dataPoints.length).toBeGreaterThan(0);
      });

      it('应该支持不同指标类型', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const metrics: Array<'execution_count' | 'success_rate' | 'avg_duration' | 'records_processed'> = [
          'execution_count', 'success_rate', 'avg_duration', 'records_processed'
        ];
        
        for (const metric of metrics) {
          const timeSeries = generateTimeSeries(executions, metric, '24h');
          expect(timeSeries.metric).toBe(metric);
        }
      });
    });

    describe('仪表盘摘要', () => {
      it('应该生成完整的仪表盘摘要', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        const alerts: MonitoringAlert[] = [];
        
        const summary = generateDashboardSummary(tasks, executions, alerts, '24h');
        
        expect(summary).toBeDefined();
        expect(summary.overview).toBeDefined();
        expect(summary.overview.totalTasks).toBe(3);
        expect(summary.overview.activeTasks).toBe(2);
        expect(summary.overview.pausedTasks).toBe(1);
        expect(summary.performance).toBeDefined();
        expect(summary.dataFlow).toBeDefined();
        expect(summary.taskStats).toHaveLength(3);
      });
    });

    describe('实时状态', () => {
      it('应该获取实时状态', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        
        const status = getRealtimeStatus(tasks, executions);
        
        expect(status).toBeDefined();
        expect(status.activeTasks).toBe(2);
        expect(status.systemHealth).toBeDefined();
        expect(['healthy', 'degraded', 'critical']).toContain(status.systemHealth);
      });
    });

    describe('告警功能', () => {
      it('应该检查告警规则', () => {
        const tasks = createTestTasks();
        const executions = createTestExecutions(tasks);
        const existingAlerts: MonitoringAlert[] = [];
        
        const newAlerts = checkAlertRules(
          DEFAULT_ALERT_RULES,
          tasks,
          executions,
          existingAlerts
        );
        
        expect(newAlerts).toBeDefined();
        expect(Array.isArray(newAlerts)).toBe(true);
      });

      it('应该确认告警', () => {
        const alerts: MonitoringAlert[] = [{
          id: 'alert_1',
          type: 'error_rate',
          severity: 'warning',
          message: '测试告警',
          timestamp: Date.now(),
          acknowledged: false
        }];
        
        const updated = acknowledgeAlert(alerts, 'alert_1', 'admin');
        
        expect(updated[0].acknowledged).toBe(true);
        expect(updated[0].acknowledgedBy).toBe('admin');
        expect(updated[0].acknowledgedAt).toBeDefined();
      });

      it('应该获取告警统计', () => {
        const alerts: MonitoringAlert[] = [
          { id: 'a1', type: 'error_rate', severity: 'warning', message: '', timestamp: Date.now(), acknowledged: false },
          { id: 'a2', type: 'error_rate', severity: 'critical', message: '', timestamp: Date.now(), acknowledged: true, acknowledgedAt: Date.now() + 1000 }
        ];
        
        const stats = getAlertStatistics(alerts, '24h');
        
        expect(stats.total).toBe(2);
        expect(stats.acknowledged).toBe(1);
        expect(stats.pending).toBe(1);
      });
    });

    describe('格式化工具', () => {
      it('应该格式化持续时间', () => {
        expect(formatDuration(500)).toBe('500ms');
        expect(formatDuration(5000)).toBe('5.0s');
        expect(formatDuration(120000)).toBe('2.0m');
        expect(formatDuration(7200000)).toBe('2.0h');
      });

      it('应该格式化数据量', () => {
        expect(formatDataVolume(500)).toBe('500B');
        expect(formatDataVolume(5000)).toBe('4.9KB');
        expect(formatDataVolume(5000000)).toBe('4.8MB');
        expect(formatDataVolume(5000000000)).toBe('4.7GB');
      });
    });

    describe('默认告警规则', () => {
      it('应该包含默认告警规则', () => {
        expect(DEFAULT_ALERT_RULES).toBeDefined();
        expect(DEFAULT_ALERT_RULES.length).toBeGreaterThan(0);
        
        const errorRateRule = DEFAULT_ALERT_RULES.find(r => r.id === 'rule_error_rate');
        expect(errorRateRule).toBeDefined();
        expect(errorRateRule?.enabled).toBe(true);
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的模板导入导出工作流', () => {
      // 1. 创建模板
      const templates: GeofenceTemplate[] = [{
        id: 'tpl_1',
        name: '集成测试模板',
        description: '用于集成测试',
        category: 'custom',
        shape: 'rectangle',
        defaultWidth: 5,
        defaultHeight: 3,
        alertLevel: 'info',
        triggerType: 'both',
        color: '#3b82f6',
        isBuiltIn: false,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
      
      // 2. 导出
      const jsonStr = exportToJsonString(templates, { description: '集成测试导出' });
      expect(jsonStr).toBeDefined();
      
      // 3. 验证
      const validation = validateImportFile(jsonStr);
      expect(validation.valid).toBe(true);
      
      // 4. 预览
      const preview = getImportPreview(jsonStr);
      expect(preview.valid).toBe(true);
      expect(preview.summary?.totalTemplates).toBe(1);
      
      // 5. 导入
      const result = importTemplates(jsonStr, []);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });

    it('应该支持完整的监控仪表盘工作流', () => {
      // 1. 创建任务
      const task = createSyncTaskConfig({
        name: '集成测试任务',
        description: '用于集成测试',
        dataSourceId: 'ds_test',
        targetEntity: 'test_entity',
        schedule: { frequency: 'hourly', timezone: 'UTC' },
        syncMode: 'incremental',
        conflictResolution: 'merge',
        notifications: { onSuccess: false, onFailure: true, onWarning: false, recipients: [] },
        enabled: true
      });
      
      // 2. 模拟执行记录
      const executions: SyncExecution[] = [
        {
          taskId: task.id,
          executionId: 'exec_test',
          startTime: Date.now() - 3600000,
          endTime: Date.now() - 3600000 + 30000,
          status: 'success',
          statistics: {
            totalRecords: 50,
            insertedRecords: 40,
            updatedRecords: 8,
            skippedRecords: 2,
            failedRecords: 0
          },
          errors: [],
          warnings: []
        }
      ];
      
      // 3. 获取实时状态
      const status = getRealtimeStatus([task], executions);
      expect(status.activeTasks).toBe(1);
      expect(status.systemHealth).toBe('healthy');
      
      // 4. 生成仪表盘摘要
      const summary = generateDashboardSummary([task], executions, [], '24h');
      expect(summary.overview.totalTasks).toBe(1);
      expect(summary.overview.totalExecutions).toBe(1);
      
      // 5. 生成时间序列
      const timeSeries = generateTimeSeries(executions, 'execution_count', '24h');
      expect(timeSeries.dataPoints.length).toBeGreaterThan(0);
      
      // 6. 检查告警
      const alerts = checkAlertRules(DEFAULT_ALERT_RULES, [task], executions, []);
      expect(alerts).toBeDefined();
    });
  });
});
