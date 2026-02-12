/**
 * v2.5.4 功能测试
 * 对战锦标赛系统、成本预测AI模型、知识图谱可视化前端
 */

import { describe, it, expect } from 'vitest';

// 对战锦标赛系统
import {
  createTournamentManager,
  TournamentFormat,
  TournamentStatus
} from './services/tournament.service';

// 成本预测AI模型
import {
  createCostPredictor,
  detectAnomalyZScore,
  analyzeTrend
} from './services/cost-prediction-ai.service';

// 知识图谱可视化前端
import {
  createGraphVisualization,
  forceDirectedLayout,
  hierarchicalLayout,
  circularLayout,
  gridLayout,
  radialLayout,
  findShortestPath,
  findAllPaths,
  calculateNodeDegrees,
  findConnectedComponents,
  calculateClusteringCoefficient,
  calculatePageRank,
  filterGraph,
  searchNodes,
  getNeighbors,
  GraphData
} from './services/knowledge-graph-visualization.service';

describe('v2.5.4 对战锦标赛系统', () => {
  describe('锦标赛管理器', () => {
    it('应该创建锦标赛管理器', () => {
      const manager = createTournamentManager('测试锦标赛', 'single_elimination');
      
      expect(manager).toBeDefined();
      expect(typeof manager.getTournament).toBe('function');
      expect(typeof manager.addParticipant).toBe('function');
    });
    
    it('应该创建淘汰赛锦标赛', () => {
      const manager = createTournamentManager('测试淘汰赛', 'single_elimination', { maxParticipants: 8 });
      
      const tournament = manager.getTournament();
      
      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('测试淘汰赛');
      expect(tournament.format).toBe('single_elimination');
    });
    
    it('应该创建循环赛锦标赛', () => {
      const manager = createTournamentManager('测试循环赛', 'round_robin', { maxParticipants: 4 });
      
      const tournament = manager.getTournament();
      
      expect(tournament.format).toBe('round_robin');
    });
    
    it('应该创建瑞士制锦标赛', () => {
      const manager = createTournamentManager('测试瑞士制', 'swiss', { maxParticipants: 16 });
      
      const tournament = manager.getTournament();
      
      expect(tournament.format).toBe('swiss');
    });
  });
  
  describe('参赛者管理', () => {
    it('应该注册参赛者', () => {
      const manager = createTournamentManager('测试锦标赛', 'single_elimination', { maxParticipants: 8 });
      
      const participant = manager.addParticipant({
        id: 'player1',
        name: '玩家1',
        rating: 1500
      });
      
      expect(participant).toBeDefined();
      expect(participant.id).toBe('player1');
    });
    
    it('应该获取锦标赛信息', () => {
      const manager = createTournamentManager('测试锦标赛', 'round_robin', { maxParticipants: 4 });
      
      const tournament = manager.getTournament();
      
      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('测试锦标赛');
    });
  });
  
  describe('排行榜', () => {
    it('应该获取排行榜', () => {
      const manager = createTournamentManager('测试锦标赛', 'round_robin', { maxParticipants: 4 });
      
      manager.addParticipant({ id: 'p1', name: '玩家1', rating: 1500 });
      manager.addParticipant({ id: 'p2', name: '玩家2', rating: 1600 });
      
      const leaderboard = manager.getLeaderboard();
      
      expect(leaderboard).toBeDefined();
      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });
});

describe('v2.5.4 成本预测AI模型', () => {
  describe('成本预测器', () => {
    it('应该创建成本预测器', () => {
      const predictor = createCostPredictor({
        modelType: 'linear',
        features: ['cpu_usage', 'memory_usage', 'network_io']
      });
      
      expect(predictor).toBeDefined();
      expect(typeof predictor.train).toBe('function');
      expect(typeof predictor.predict).toBe('function');
    });
    
    it('应该训练模型', () => {
      const predictor = createCostPredictor({
        modelType: 'linear',
        features: ['cpu_usage', 'memory_usage']
      });
      
      const trainingData = [
        { timestamp: 1000, cost: 100, features: { cpu_usage: 50, memory_usage: 60 } },
        { timestamp: 2000, cost: 150, features: { cpu_usage: 70, memory_usage: 80 } },
        { timestamp: 3000, cost: 70, features: { cpu_usage: 30, memory_usage: 40 } }
      ];
      
      predictor.train(trainingData);
      
      const model = predictor.getModel();
      expect(model.trainedAt).toBeGreaterThan(0);
    });
    
    it('应该预测成本', () => {
      const predictor = createCostPredictor({
        modelType: 'linear',
        features: ['cpu_usage', 'memory_usage']
      });
      
      predictor.train([
        { timestamp: 1000, cost: 100, features: { cpu_usage: 50, memory_usage: 60 } },
        { timestamp: 2000, cost: 150, features: { cpu_usage: 70, memory_usage: 80 } },
        { timestamp: 3000, cost: 200, features: { cpu_usage: 90, memory_usage: 100 } }
      ]);
      
      const predictions = predictor.predict(3);
      
      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(3);
      // 检查预测结果结构
      expect(predictions[0]).toHaveProperty('timestamp');
    });
  });
  
  describe('异常检测', () => {
    it('应该检测异常值', () => {
      // detectAnomalyZScore(value, historicalData, threshold)
      const result = detectAnomalyZScore(150, [100, 102, 98, 101, 99, 100, 103, 97], 2.0);
      
      expect(result.isAnomaly).toBe(true);
    });
    
    it('应该识别正常值', () => {
      const result = detectAnomalyZScore(101, [100, 102, 98, 101, 99, 100, 103, 97], 2.0);
      
      expect(result.isAnomaly).toBe(false);
    });
    
    it('应该返回异常分数', () => {
      const result = detectAnomalyZScore(110, [100, 100, 100, 100], 2.0);
      
      expect(typeof result.anomalyScore).toBe('number');
    });
  });
  
  describe('趋势分析', () => {
    it('应该分析上升趋势', () => {
      const result = analyzeTrend([100, 110, 120, 130, 140, 150]);
      
      expect(result.direction).toBe('increasing');
    });
    
    it('应该分析下降趋势', () => {
      const result = analyzeTrend([150, 140, 130, 120, 110, 100]);
      
      expect(result.direction).toBe('decreasing');
    });
    
    it('应该返回趋势强度', () => {
      const result = analyzeTrend([100, 110, 120, 130, 140, 150]);
      
      expect(typeof result.slope).toBe('number');
      expect(result.slope).toBeGreaterThan(0);
    });
  });
});

describe('v2.5.4 知识图谱可视化前端', () => {
  const sampleGraph: GraphData = {
    nodes: [
      { id: 'n1', label: '节点1', type: 'experiment', properties: { status: 'completed' } },
      { id: 'n2', label: '节点2', type: 'experiment', properties: { status: 'running' } },
      { id: 'n3', label: '节点3', type: 'metric', properties: { value: 100 } },
      { id: 'n4', label: '节点4', type: 'metric', properties: { value: 200 } },
      { id: 'n5', label: '节点5', type: 'insight', properties: {} }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', label: '关联', type: 'relates_to' },
      { id: 'e2', source: 'n1', target: 'n3', label: '产生', type: 'produces' },
      { id: 'e3', source: 'n2', target: 'n4', label: '产生', type: 'produces' },
      { id: 'e4', source: 'n3', target: 'n5', label: '导出', type: 'derives' },
      { id: 'e5', source: 'n4', target: 'n5', label: '导出', type: 'derives' }
    ]
  };
  
  describe('布局算法', () => {
    it('应该执行力导向布局', () => {
      const positions = forceDirectedLayout(sampleGraph, { iterations: 10 });
      
      expect(positions.size).toBe(5);
      expect(positions.get('n1')).toBeDefined();
      expect(typeof positions.get('n1')?.x).toBe('number');
      expect(typeof positions.get('n1')?.y).toBe('number');
    });
    
    it('应该执行层次布局', () => {
      const positions = hierarchicalLayout(sampleGraph);
      
      expect(positions.size).toBe(5);
    });
    
    it('应该执行环形布局', () => {
      const positions = circularLayout(sampleGraph, { radius: 100 });
      
      expect(positions.size).toBe(5);
      // 检查节点是否在圆上
      const pos1 = positions.get('n1')!;
      const centerX = 400, centerY = 300;
      const distance = Math.sqrt(Math.pow(pos1.x - centerX, 2) + Math.pow(pos1.y - centerY, 2));
      expect(Math.abs(distance - 100)).toBeLessThan(1);
    });
    
    it('应该执行网格布局', () => {
      const positions = gridLayout(sampleGraph, { columns: 3 });
      
      expect(positions.size).toBe(5);
    });
    
    it('应该执行径向布局', () => {
      const positions = radialLayout(sampleGraph, { centerNode: 'n1' });
      
      expect(positions.size).toBe(5);
      // 中心节点应该在中心
      const centerPos = positions.get('n1')!;
      expect(centerPos.x).toBe(400);
      expect(centerPos.y).toBe(300);
    });
  });
  
  describe('路径查找', () => {
    it('应该找到最短路径', () => {
      const path = findShortestPath(sampleGraph, 'n1', 'n5');
      
      expect(path).not.toBeNull();
      expect(path!.nodes[0]).toBe('n1');
      expect(path!.nodes[path!.nodes.length - 1]).toBe('n5');
    });
    
    it('应该找到所有路径', () => {
      const paths = findAllPaths(sampleGraph, 'n1', 'n5', 5);
      
      expect(paths.length).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path.nodes[0]).toBe('n1');
        expect(path.nodes[path.nodes.length - 1]).toBe('n5');
      }
    });
    
    it('应该处理不存在的路径', () => {
      const disconnectedGraph: GraphData = {
        nodes: [
          { id: 'a', label: 'A', type: 'node', properties: {} },
          { id: 'b', label: 'B', type: 'node', properties: {} }
        ],
        edges: []
      };
      
      const path = findShortestPath(disconnectedGraph, 'a', 'b');
      
      expect(path).toBeNull();
    });
  });
  
  describe('图谱分析', () => {
    it('应该计算节点度数', () => {
      const degrees = calculateNodeDegrees(sampleGraph);
      
      expect(degrees.get('n1')?.out).toBe(2);
      expect(degrees.get('n5')?.in).toBe(2);
    });
    
    it('应该找到连通分量', () => {
      const components = findConnectedComponents(sampleGraph);
      
      expect(components.length).toBe(1);
      expect(components[0].length).toBe(5);
    });
    
    it('应该计算聚类系数', () => {
      const coefficient = calculateClusteringCoefficient(sampleGraph, 'n1');
      
      expect(typeof coefficient).toBe('number');
      expect(coefficient).toBeGreaterThanOrEqual(0);
      expect(coefficient).toBeLessThanOrEqual(1);
    });
    
    it('应该计算PageRank', () => {
      const ranks = calculatePageRank(sampleGraph, { iterations: 20 });
      
      expect(ranks.size).toBe(5);
      // 所有节点都应该有rank值
      for (const rank of ranks.values()) {
        expect(rank).toBeGreaterThan(0);
      }
    });
  });
  
  describe('图谱过滤和搜索', () => {
    it('应该按节点类型过滤', () => {
      const filtered = filterGraph(sampleGraph, { nodeTypes: ['experiment'] });
      
      expect(filtered.nodes.length).toBe(2);
      expect(filtered.nodes.every(n => n.type === 'experiment')).toBe(true);
    });
    
    it('应该搜索节点', () => {
      const results = searchNodes(sampleGraph, '节点1');
      
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('n1');
    });
    
    it('应该获取节点邻居', () => {
      const neighbors = getNeighbors(sampleGraph, 'n1', 1);
      
      expect(neighbors.nodes.length).toBeGreaterThan(1);
      expect(neighbors.nodes.some(n => n.id === 'n1')).toBe(true);
    });
  });
  
  describe('图谱可视化组件', () => {
    it('应该创建可视化组件', () => {
      const viz = createGraphVisualization(sampleGraph);
      
      expect(viz).toBeDefined();
      expect(typeof viz.setData).toBe('function');
      expect(typeof viz.applyLayout).toBe('function');
    });
    
    it('应该应用布局', () => {
      const viz = createGraphVisualization(sampleGraph);
      
      viz.applyLayout({ type: 'force' });
      
      const viewport = viz.getViewport();
      expect(viewport).toBeDefined();
    });
    
    it('应该支持缩放', () => {
      const viz = createGraphVisualization(sampleGraph);
      
      const initialZoom = viz.getViewport().zoom;
      viz.zoomIn();
      expect(viz.getViewport().zoom).toBeGreaterThan(initialZoom);
      
      viz.zoomOut();
      viz.zoomOut();
      expect(viz.getViewport().zoom).toBeLessThan(initialZoom);
    });
    
    it('应该支持节点选择', () => {
      const viz = createGraphVisualization(sampleGraph);
      
      viz.selectNode('n1');
      const selection = viz.getSelection();
      
      expect(selection.nodes).toContain('n1');
    });
    
    it('应该支持路径高亮', () => {
      const viz = createGraphVisualization(sampleGraph);
      const path = findShortestPath(sampleGraph, 'n1', 'n5')!;
      
      viz.highlightPath(path);
      const selection = viz.getSelection();
      
      expect(selection.nodes.length).toBeGreaterThan(0);
    });
    
    it('应该导出SVG', () => {
      const viz = createGraphVisualization(sampleGraph);
      viz.applyLayout({ type: 'circular' });
      
      const svg = viz.exportSVG();
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
    
    it('应该支持节点拖拽', () => {
      const viz = createGraphVisualization(sampleGraph);
      viz.applyLayout({ type: 'grid' });
      
      viz.startDrag('n1');
      viz.updateDrag(100, 100);
      viz.endDrag();
      
      const state = viz.getInteractionState();
      expect(state.draggedNode).toBeNull();
    });
  });
});
