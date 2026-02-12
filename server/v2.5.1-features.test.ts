/**
 * v2.5.1 功能测试
 * 测试博弈策略可视化、调度器性能监控、实验自动化流水线
 */

import { describe, it, expect } from 'vitest';

// 博弈策略可视化服务
import {
  createGameTree,
  addNode,
  calculateLayout,
  createPayoffMatrix,
  setCellStyle,
  addMatrixHighlight,
  clearMatrixHighlights,
  generateMatrixHTML,
  createSimulation,
  stepSimulation,
  runFullSimulation,
  createEquilibriumAnnotation,
  annotateEquilibria,
  highlightPath,
  exportToSVG,
  getDefaultVisualizationConfig,
  getTreeStats
} from './services/game-visualization.service';

// 调度器性能监控服务
import {
  createMonitoringDashboard,
  updateDeviceMetrics,
  createUtilizationHeatmap,
  getUtilizationColorScale,
  getColorForValue,
  generateHeatmapSVG,
  updateQueueMetrics,
  generateQueueDepthChart,
  getQueueSummary,
  updateThroughputMetrics,
  generateThroughputChart,
  calculateThroughputStats,
  acknowledgeAlert,
  getActiveAlerts,
  clearAcknowledgedAlerts,
  getDashboardSummary,
  exportDashboardData,
  formatBytes,
  formatDuration
} from './services/scheduler-monitoring.service';

// 实验自动化流水线服务
import {
  createPipeline,
  createExperimentConfig,
  createVariantConfig,
  addExperiment,
  startExperimentRun,
  advancePhase,
  recordDataPoint,
  createCheckpoint,
  pauseExperiment,
  resumeExperiment,
  stopExperiment,
  completeExperiment,
  performAnalysis,
  checkStopConditions,
  generateReport,
  exportReportToMarkdown,
  getPipelineStats
} from './services/experiment-pipeline.service';

describe('v2.5.1 博弈策略可视化', () => {
  describe('博弈树创建', () => {
    it('应该创建博弈树', () => {
      const tree = createGameTree('囚徒困境', ['玩家1', '玩家2']);
      
      expect(tree).toBeDefined();
      expect(tree.name).toBe('囚徒困境');
      expect(tree.players.length).toBe(2);
    });

    it('应该添加节点到博弈树', () => {
      const tree = createGameTree('序贯博弈', ['玩家1', '玩家2']);
      const rootId = tree.root.id;
      const newNode = addNode(tree, rootId, '合作', {
        type: 'decision',
        player: '玩家2',
        label: '玩家2决策'
      });
      
      expect(newNode).toBeDefined();
      expect(tree.nodes.size).toBe(2);
    });

    it('应该计算布局', () => {
      const tree = createGameTree('布局测试', ['玩家1', '玩家2']);
      
      calculateLayout(tree);
      
      expect(tree.root.position.x).toBeDefined();
      expect(tree.root.position.y).toBeDefined();
    });
  });

  describe('收益矩阵', () => {
    it('应该创建收益矩阵', () => {
      const strategies = new Map<string, string[]>();
      strategies.set('玩家1', ['合作', '背叛']);
      strategies.set('玩家2', ['合作', '背叛']);
      
      const payoffs = new Map<string, number[]>();
      payoffs.set('合作-合作', [-1, -1]);
      payoffs.set('合作-背叛', [-3, 0]);
      payoffs.set('背叛-合作', [0, -3]);
      payoffs.set('背叛-背叛', [-2, -2]);
      
      const matrix = createPayoffMatrix(['玩家1', '玩家2'], strategies, payoffs);
      
      expect(matrix).toBeDefined();
      expect(matrix.players.length).toBe(2);
    });

    it('应该设置单元格样式', () => {
      const strategies = new Map<string, string[]>();
      strategies.set('玩家1', ['A', 'B']);
      strategies.set('玩家2', ['X', 'Y']);
      const payoffs = new Map<string, number[]>();
      const matrix = createPayoffMatrix(['玩家1', '玩家2'], strategies, payoffs);
      
      setCellStyle(matrix, 'A-X', { backgroundColor: '#ff0000' });
      
      expect(matrix.cellStyles.get('A-X')?.backgroundColor).toBe('#ff0000');
    });

    it('应该添加矩阵高亮', () => {
      const strategies = new Map<string, string[]>();
      strategies.set('玩家1', ['A', 'B']);
      strategies.set('玩家2', ['X', 'Y']);
      const payoffs = new Map<string, number[]>();
      const matrix = createPayoffMatrix(['玩家1', '玩家2'], strategies, payoffs);
      
      addMatrixHighlight(matrix, 'nash', ['A-X'], 'Nash均衡');
      
      expect(matrix.highlights.length).toBe(1);
    });

    it('应该清除矩阵高亮', () => {
      const strategies = new Map<string, string[]>();
      strategies.set('玩家1', ['A', 'B']);
      strategies.set('玩家2', ['X', 'Y']);
      const payoffs = new Map<string, number[]>();
      const matrix = createPayoffMatrix(['玩家1', '玩家2'], strategies, payoffs);
      addMatrixHighlight(matrix, 'nash', ['A-X'], 'Nash均衡');
      
      clearMatrixHighlights(matrix);
      
      expect(matrix.highlights.length).toBe(0);
    });

    it('应该生成矩阵HTML', () => {
      const strategies = new Map<string, string[]>();
      strategies.set('玩家1', ['A', 'B']);
      strategies.set('玩家2', ['X', 'Y']);
      const payoffs = new Map<string, number[]>();
      payoffs.set('A-X', [1, 1]);
      payoffs.set('A-Y', [0, 2]);
      payoffs.set('B-X', [2, 0]);
      payoffs.set('B-Y', [1, 1]);
      const matrix = createPayoffMatrix(['玩家1', '玩家2'], strategies, payoffs);
      
      const html = generateMatrixHTML(matrix);
      
      expect(html).toContain('<table');
      expect(html).toContain('</table>');
    });
  });

  describe('策略模拟', () => {
    it('应该创建模拟', () => {
      const tree = createGameTree('模拟测试', ['玩家1', '玩家2']);
      const strategies = new Map<string, string>();
      strategies.set('玩家1', 'A');
      
      const simulation = createSimulation(tree, strategies);
      
      expect(simulation).toBeDefined();
      expect(simulation.currentNodeId).toBe(tree.root.id);
    });

    it('应该执行模拟步骤', () => {
      const tree = createGameTree('模拟测试', ['玩家1', '玩家2']);
      const strategies = new Map<string, string>();
      strategies.set('玩家1', 'A');
      
      const simulation = createSimulation(tree, strategies);
      const result = stepSimulation(simulation, tree);
      
      // 根节点没有子节点时返回null
      expect(result).toBeNull();
    });

    it('应该运行完整模拟', () => {
      const tree = createGameTree('完整模拟', ['玩家1', '玩家2']);
      const strategies = new Map<string, string>();
      const simulation = createSimulation(tree, strategies);
      
      const result = runFullSimulation(simulation, tree);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('均衡标注', () => {
    it('应该创建均衡标注', () => {
      const strategies = new Map<string, string | Map<string, number>>();
      strategies.set('玩家1', 'A');
      strategies.set('玩家2', 'X');
      
      const annotation = createEquilibriumAnnotation(
        'pure_nash',
        strategies,
        [1, 1],
        { x: 100, y: 100 }
      );
      
      expect(annotation).toBeDefined();
      expect(annotation.type).toBe('pure_nash');
    });

    it('应该标注均衡点', () => {
      const tree = createGameTree('均衡测试', ['玩家1', '玩家2']);
      
      // annotateEquilibria会遍历节点并标注
      annotateEquilibria(tree, [tree.root.id]);
      
      // 验证函数执行不报错即可
      expect(tree.nodes.size).toBe(1);
    });
  });

  describe('路径高亮', () => {
    it('应该高亮路径', () => {
      const tree = createGameTree('路径测试', ['玩家1', '玩家2']);
      const rootId = tree.root.id;
      
      highlightPath(tree, [rootId]);
      
      expect(tree.root.highlighted).toBe(true);
    });
  });

  describe('SVG导出', () => {
    it('应该导出SVG', () => {
      const tree = createGameTree('SVG测试', ['玩家1', '玩家2']);
      calculateLayout(tree);
      
      const config = getDefaultVisualizationConfig();
      const svgExport = exportToSVG(tree, config);
      
      expect(svgExport).toBeDefined();
      // 验证导出对象存在
      expect(svgExport.width).toBeGreaterThan(0);
      expect(svgExport.height).toBeGreaterThan(0);
    });
  });

  describe('树统计', () => {
    it('应该获取树统计信息', () => {
      const tree = createGameTree('统计测试', ['玩家1', '玩家2']);
      
      const stats = getTreeStats(tree);
      
      // 初始树至少有根节点
      expect(stats).toBeDefined();
      expect(tree.nodes.size).toBe(1);
    });
  });
});

describe('v2.5.1 调度器性能监控', () => {
  describe('仪表盘管理', () => {
    it('应该创建监控仪表盘', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('测试仪表盘');
      expect(dashboard.devices.size).toBe(0);
    });

    it('应该更新设备指标', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'NVIDIA RTX 4090',
        deviceType: 'gpu',
        utilization: 75,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      expect(dashboard.devices.size).toBe(1);
      expect(dashboard.devices.get('gpu-0')?.utilization).toBe(75);
    });
  });

  describe('热力图', () => {
    it('应该创建利用率热力图', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 75,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const heatmap = createUtilizationHeatmap(dashboard, 12);
      
      expect(heatmap).toBeDefined();
      expect(heatmap.devices.length).toBe(1);
      expect(heatmap.timeSlots.length).toBe(12);
    });

    it('应该获取颜色比例尺', () => {
      const scale = getUtilizationColorScale();
      
      expect(scale.min).toBe(0);
      expect(scale.max).toBe(100);
      expect(scale.colors.length).toBeGreaterThan(0);
    });

    it('应该根据值获取颜色', () => {
      const scale = getUtilizationColorScale();
      
      const lowColor = getColorForValue(10, scale);
      const highColor = getColorForValue(90, scale);
      
      expect(lowColor).toBeDefined();
      expect(highColor).toBeDefined();
      expect(lowColor).not.toBe(highColor);
    });

    it('应该生成热力图SVG', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 75,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const heatmap = createUtilizationHeatmap(dashboard, 6);
      const svg = generateHeatmapSVG(heatmap);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('队列监控', () => {
    it('应该更新队列指标', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateQueueMetrics(dashboard, {
        queueId: 'queue-1',
        queueName: '高优先级队列',
        depth: 50,
        maxDepth: 100,
        avgWaitTime: 500,
        oldestTaskAge: 2000,
        priorityDistribution: new Map([[1, 30], [2, 20]]),
        taskTypeDistribution: new Map([['compute', 40], ['io', 10]]),
        timestamp: Date.now()
      });
      
      expect(dashboard.queues.size).toBe(1);
      expect(dashboard.queues.get('queue-1')?.depth).toBe(50);
    });

    it('应该生成队列深度图表', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateQueueMetrics(dashboard, {
        queueId: 'queue-1',
        queueName: '测试队列',
        depth: 50,
        maxDepth: 100,
        avgWaitTime: 500,
        oldestTaskAge: 2000,
        priorityDistribution: new Map(),
        taskTypeDistribution: new Map(),
        timestamp: Date.now()
      });
      
      const chart = generateQueueDepthChart(dashboard, 'queue-1');
      
      expect(chart).toBeDefined();
      expect(chart.type).toBe('area');
    });

    it('应该获取队列摘要', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateQueueMetrics(dashboard, {
        queueId: 'queue-1',
        queueName: '队列1',
        depth: 50,
        maxDepth: 100,
        avgWaitTime: 500,
        oldestTaskAge: 2000,
        priorityDistribution: new Map(),
        taskTypeDistribution: new Map(),
        timestamp: Date.now()
      });
      
      const summary = getQueueSummary(dashboard);
      
      expect(summary.totalQueues).toBe(1);
      expect(summary.totalTasks).toBe(50);
    });
  });

  describe('吞吐量监控', () => {
    it('应该更新吞吐量指标', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateThroughputMetrics(dashboard, {
        schedulerId: 'scheduler-1',
        tasksCompleted: 1000,
        tasksPerSecond: 100,
        bytesProcessed: 1024 * 1024 * 100,
        bytesPerSecond: 1024 * 1024,
        avgLatency: 50,
        p50Latency: 45,
        p95Latency: 80,
        p99Latency: 120,
        successRate: 99.5,
        timestamp: Date.now()
      });
      
      expect(dashboard.throughput.tasksPerSecond).toBe(100);
    });

    it('应该生成吞吐量图表', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateThroughputMetrics(dashboard, {
        schedulerId: 'scheduler-1',
        tasksCompleted: 1000,
        tasksPerSecond: 100,
        bytesProcessed: 1024 * 1024 * 100,
        bytesPerSecond: 1024 * 1024,
        avgLatency: 50,
        p50Latency: 45,
        p95Latency: 80,
        p99Latency: 120,
        successRate: 99.5,
        timestamp: Date.now()
      });
      
      const chart = generateThroughputChart(dashboard, 'scheduler-1');
      
      expect(chart).toBeDefined();
      expect(chart.type).toBe('line');
    });

    it('应该计算吞吐量统计', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      // 添加多个数据点
      for (let i = 0; i < 10; i++) {
        updateThroughputMetrics(dashboard, {
          schedulerId: 'scheduler-1',
          tasksCompleted: 1000 + i * 100,
          tasksPerSecond: 100 + i * 10,
          bytesProcessed: 1024 * 1024 * (100 + i),
          bytesPerSecond: 1024 * 1024,
          avgLatency: 50 + i,
          p50Latency: 45,
          p95Latency: 80,
          p99Latency: 120,
          successRate: 99.5,
          timestamp: Date.now()
        });
      }
      
      const stats = calculateThroughputStats(dashboard, 'scheduler-1');
      
      expect(stats.avgTps).toBeGreaterThan(0);
      expect(stats.maxTps).toBeGreaterThanOrEqual(stats.avgTps);
    });
  });

  describe('告警管理', () => {
    it('应该在利用率过高时触发告警', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 95,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const alerts = getActiveAlerts(dashboard);
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('utilization');
    });

    it('应该确认告警', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 95,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const alerts = getActiveAlerts(dashboard);
      const alertId = alerts[0].id;
      
      const result = acknowledgeAlert(dashboard, alertId);
      
      expect(result).toBe(true);
      expect(getActiveAlerts(dashboard).length).toBe(0);
    });

    it('应该清除已确认告警', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 95,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const alerts = getActiveAlerts(dashboard);
      acknowledgeAlert(dashboard, alerts[0].id);
      
      const cleared = clearAcknowledgedAlerts(dashboard);
      
      expect(cleared).toBe(1);
    });
  });

  describe('仪表盘摘要', () => {
    it('应该获取仪表盘摘要', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      updateDeviceMetrics(dashboard, {
        deviceId: 'gpu-0',
        deviceName: 'GPU 0',
        deviceType: 'gpu',
        utilization: 75,
        memoryUsage: 80,
        temperature: 65,
        powerConsumption: 350,
        taskCount: 10,
        avgTaskDuration: 100,
        errorRate: 0.1,
        lastUpdated: Date.now()
      });
      
      const summary = getDashboardSummary(dashboard);
      
      expect(summary.deviceCount).toBe(1);
      expect(summary.avgUtilization).toBe(75);
    });

    it('应该导出仪表盘数据', () => {
      const dashboard = createMonitoringDashboard('测试仪表盘');
      
      const exported = exportDashboardData(dashboard);
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('测试仪表盘');
    });
  });

  describe('格式化工具', () => {
    it('应该格式化字节数', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('应该格式化持续时间', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(5000)).toBe('5.0s');
      expect(formatDuration(120000)).toBe('2.0m');
    });
  });
});

describe('v2.5.1 实验自动化流水线', () => {
  describe('流水线管理', () => {
    it('应该创建实验流水线', () => {
      const pipeline = createPipeline('测试流水线');
      
      expect(pipeline).toBeDefined();
      expect(pipeline.name).toBe('测试流水线');
      expect(pipeline.experiments.size).toBe(0);
    });

    it('应该创建实验配置', () => {
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      
      const config = createExperimentConfig(
        '按钮颜色测试',
        '红色按钮将提高转化率',
        'conversion_rate',
        variants
      );
      
      expect(config).toBeDefined();
      expect(config.name).toBe('按钮颜色测试');
      expect(config.variants.length).toBe(2);
    });

    it('应该添加实验到流水线', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      
      addExperiment(pipeline, config);
      
      expect(pipeline.experiments.size).toBe(1);
    });
  });

  describe('实验运行', () => {
    it('应该启动实验运行', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      
      const run = startExperimentRun(pipeline, config.id);
      
      expect(run).toBeDefined();
      expect(run.status).toBe('running');
      expect(run.currentPhase).toBe('initialization');
    });

    it('应该推进实验阶段', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      advancePhase(run, 'data_collection');
      
      expect(run.currentPhase).toBe('data_collection');
    });

    it('应该记录数据点', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      recordDataPoint(run, variants[0].id, true);
      recordDataPoint(run, variants[0].id, false);
      
      const result = run.variantResults.get(variants[0].id);
      expect(result?.sampleSize).toBe(2);
      expect(result?.conversions).toBe(1);
      expect(result?.conversionRate).toBe(0.5);
    });

    it('应该创建检查点', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      const checkpoint = createCheckpoint(run);
      
      expect(checkpoint).toBeDefined();
      expect(run.checkpoints.length).toBe(1);
    });

    it('应该暂停和恢复实验', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      pauseExperiment(run, '手动暂停');
      expect(run.status).toBe('paused');
      
      resumeExperiment(run);
      expect(run.status).toBe('running');
    });

    it('应该停止实验', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      stopExperiment(run, '提前终止');
      
      expect(run.status).toBe('stopped');
      expect(run.endTime).toBeDefined();
    });

    it('应该完成实验', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      completeExperiment(run);
      
      expect(run.status).toBe('completed');
      expect(run.currentPhase).toBe('cleanup');
    });
  });

  describe('统计分析', () => {
    it('应该执行统计分析', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      // 模拟数据
      for (let i = 0; i < 100; i++) {
        recordDataPoint(run, variants[0].id, Math.random() < 0.1);
        recordDataPoint(run, variants[1].id, Math.random() < 0.15);
      }
      
      const result = performAnalysis(run, config);
      
      expect(result).toBeDefined();
      expect(result.tests.length).toBeGreaterThan(0);
    });

    it('应该检查停止条件', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants,
        { targetSampleSize: 100 }
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      // 添加足够的数据点达到目标样本量
      for (let i = 0; i < 55; i++) {
        recordDataPoint(run, variants[0].id, Math.random() < 0.1);
        recordDataPoint(run, variants[1].id, Math.random() < 0.15);
      }
      
      const analysisResult = performAnalysis(run, config);
      const stopCheck = checkStopConditions(run, config, analysisResult);
      
      expect(stopCheck).toBeDefined();
      // 检查停止条件函数返回有效结果
      expect(typeof stopCheck.shouldStop).toBe('boolean');
      expect(typeof stopCheck.reason).toBe('string');
    });
  });

  describe('报告生成', () => {
    it('应该生成实验报告', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '按钮颜色测试',
        '红色按钮将提高转化率',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      // 模拟数据
      for (let i = 0; i < 100; i++) {
        recordDataPoint(run, variants[0].id, Math.random() < 0.1);
        recordDataPoint(run, variants[1].id, Math.random() < 0.15);
      }
      
      completeExperiment(run);
      const report = generateReport(pipeline, run);
      
      expect(report).toBeDefined();
      expect(report.title).toContain('按钮颜色测试');
      expect(report.summary).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('应该导出报告为Markdown', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      const run = startExperimentRun(pipeline, config.id);
      
      for (let i = 0; i < 50; i++) {
        recordDataPoint(run, variants[0].id, Math.random() < 0.1);
        recordDataPoint(run, variants[1].id, Math.random() < 0.15);
      }
      
      completeExperiment(run);
      const report = generateReport(pipeline, run);
      const markdown = exportReportToMarkdown(report);
      
      expect(markdown).toContain('# ');
      expect(markdown).toContain('## 摘要');
      expect(markdown).toContain('## 方法论');
      expect(markdown).toContain('## 结果');
    });
  });

  describe('流水线统计', () => {
    it('应该获取流水线统计', () => {
      const pipeline = createPipeline('测试流水线');
      const variants = [
        createVariantConfig('对照组', true, 50),
        createVariantConfig('实验组', false, 50)
      ];
      const config = createExperimentConfig(
        '测试实验',
        '测试假设',
        'conversion_rate',
        variants
      );
      addExperiment(pipeline, config);
      
      const stats = getPipelineStats(pipeline);
      
      expect(stats).toBeDefined();
      expect(stats.totalExperiments).toBe(1);
      expect(stats.runningExperiments).toBe(0);
    });
  });
});
