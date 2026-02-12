/**
 * v2.5.3 功能测试
 * 博弈策略对战模拟器、扩缩容成本优化、实验知识图谱
 */

import { describe, it, expect } from 'vitest';
import {
  createBattleSession,
  startBattle,
  pauseBattle,
  resumeBattle,
  makeMove,
  endBattle,
  getAIMove,
  createReplayController,
  stepForward,
  stepBackward,
  jumpToStep,
  setPlaybackSpeed,
  addAnnotation,
  generateVisualizationData,
  analyzeBattle,
  exportBattleReport,
  type GameConfig,
  type Player
} from './services/battle-simulator.service';

import {
  createCostCalculator,
  analyzePerformanceCostBalance,
  makeScalingDecision,
  forecastCosts,
  createBudget,
  updateBudgetSpending,
  checkBudgetStatus,
  performFullCostAnalysis,
  generateCostReport,
  type CostModel,
  type CloudResource
} from './services/cost-optimization.service';

import {
  createKnowledgeGraph,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  queryGraph,
  findShortestPath,
  getNeighbors,
  discoverRelations,
  generateInsights,
  analyzeGraph,
  exportGraphToJSON,
  generateGraphReport
} from './services/experiment-knowledge-graph.service';

// ==================== 博弈策略对战模拟器测试 ====================

describe('Battle Simulator Service', () => {
  const createTestPlayers = (): Player[] => [
    { id: 'player1', name: 'Player 1', type: 'human' },
    { id: 'player2', name: 'AI Bot', type: 'ai', aiConfig: { algorithm: 'random', difficulty: 'medium', thinkingTime: 1000 } }
  ];

  const createTestConfig = (): GameConfig => ({
    id: 'test-game',
    name: 'Test Game',
    type: 'matrix',
    players: createTestPlayers(),
    simultaneousMoves: true,
    rounds: 10
  });

  describe('Session Management', () => {
    it('should create a battle session', () => {
      const config = createTestConfig();
      const session = createBattleSession(config);
      
      expect(session.id).toBeDefined();
      expect(session.config).toEqual(config);
      expect(session.state.status).toBe('waiting');
    });

    it('should start a battle', () => {
      const session = createBattleSession(createTestConfig());
      const started = startBattle(session);
      
      expect(started.state.status).toBe('playing');
      expect(started.state.round).toBe(1);
    });

    it('should pause and resume a battle', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      
      const paused = pauseBattle(session);
      expect(paused.state.status).toBe('paused');
      
      const resumed = resumeBattle(paused);
      expect(resumed.state.status).toBe('playing');
    });

    it('should make a move', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      
      const afterMove = makeMove(session, 'player1', 'cooperate');
      
      expect(afterMove.state.history.length).toBe(1);
      expect(afterMove.state.history[0].action).toBe('cooperate');
    });

    it('should end a battle with winner', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      
      const ended = endBattle(session, 0);
      
      expect(ended.state.status).toBe('finished');
      expect(ended.state.winner).toBe(0);
    });
  });

  describe('AI Player', () => {
    it('should get AI move', () => {
      const config = createTestConfig();
      let session = createBattleSession(config);
      session = startBattle(session);
      
      const move = getAIMove(session, 'player2');
      
      expect(['cooperate', 'defect']).toContain(move);
    });
  });

  describe('Replay System', () => {
    it('should create replay controller', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      session = makeMove(session, 'player1', 'cooperate');
      
      const controller = createReplayController(session);
      
      expect(controller.currentStep).toBe(0);
      expect(controller.totalSteps).toBe(1);
    });

    it('should step forward and backward', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      session = makeMove(session, 'player1', 'cooperate');
      session = makeMove(session, 'player2', 'defect');
      
      let controller = createReplayController(session);
      
      controller = stepForward(controller);
      expect(controller.currentStep).toBe(1);
      
      controller = stepBackward(controller);
      expect(controller.currentStep).toBe(0);
    });

    it('should set playback speed', () => {
      const session = createBattleSession(createTestConfig());
      let controller = createReplayController(session);
      
      controller = setPlaybackSpeed(controller, 2.0);
      expect(controller.playbackSpeed).toBe(2.0);
    });
  });

  describe('Visualization and Analysis', () => {
    it('should generate visualization data', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      
      const vizData = generateVisualizationData(session);
      
      expect(vizData.gameBoard).toBeDefined();
      expect(vizData.playerPositions.length).toBe(2);
    });

    it('should analyze battle', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      
      const analysis = analyzeBattle(session);
      
      expect(analysis.summary).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should export battle report', () => {
      let session = createBattleSession(createTestConfig());
      session = startBattle(session);
      session = endBattle(session, 0);
      
      const report = exportBattleReport(session);
      
      expect(report).toContain('# Battle Report');
    });
  });
});

// ==================== 扩缩容成本优化测试 ====================

describe('Cost Optimization Service', () => {
  const createTestResource = (): CloudResource => ({
    id: 'resource-1',
    type: 'compute',
    provider: 'aws',
    instanceType: 't3.medium',
    region: 'us-east-1',
    specs: { cpu: 2, memory: 4, storage: 50, networkBandwidth: 1000 },
    pricing: {
      onDemandHourly: 0.0416,
      spotHourly: 0.0125,
      reservedMonthly: 20,
      reservedYearly: 200,
      dataTransferPerGB: 0.09,
      storagePerGBMonth: 0.10
    },
    status: 'running',
    tags: new Map()
  });

  const createTestModel = (): CostModel => ({
    id: 'model-1',
    name: 'Test Model',
    resources: [createTestResource()],
    utilizationTargets: {
      cpuMin: 20,
      cpuMax: 80,
      memoryMin: 20,
      memoryMax: 80,
      targetUtilization: 70
    },
    constraints: {
      maxHourlyCost: 10,
      maxDailyCost: 240,
      maxMonthlyCost: 7200,
      minInstances: 1,
      maxInstances: 10,
      preferSpot: false,
      spotMaxPercentage: 50
    },
    optimizationGoal: 'balance'
  });

  describe('Cost Calculator', () => {
    it('should create cost calculator', () => {
      const model = createTestModel();
      const calculator = createCostCalculator(model);
      
      expect(calculator.model).toEqual(model);
    });

    it('should calculate current cost', () => {
      const model = createTestModel();
      const calculator = createCostCalculator(model);
      
      const cost = calculator.calculateCurrentCost();
      
      expect(cost.compute).toBeGreaterThan(0);
      expect(cost.total).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const model = createTestModel();
      const calculator = createCostCalculator(model);
      
      const recommendations = calculator.getRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Scaling Decisions', () => {
    it('should recommend scale out on high load', () => {
      const model = createTestModel();
      
      const decision = makeScalingDecision(model, { cpu: 90, memory: 85, latency: 100 }, 2);
      
      expect(decision.action).toBe('scale_out');
    });

    it('should recommend scale in on low load', () => {
      const model = createTestModel();
      
      const decision = makeScalingDecision(model, { cpu: 10, memory: 15, latency: 50 }, 5);
      
      expect(decision.action).toBe('scale_in');
    });

    it('should recommend no action within target range', () => {
      const model = createTestModel();
      
      const decision = makeScalingDecision(model, { cpu: 50, memory: 50, latency: 50 }, 3);
      
      expect(decision.action).toBe('no_action');
    });
  });

  describe('Budget Management', () => {
    it('should create budget', () => {
      const budget = createBudget('Monthly Budget', 1000, 'monthly', new Date());
      
      expect(budget.id).toBeDefined();
      expect(budget.amount).toBe(1000);
    });

    it('should update budget spending', () => {
      let budget = createBudget('Monthly Budget', 1000, 'monthly', new Date());
      budget = updateBudgetSpending(budget, 800);
      
      expect(budget.spent).toBe(800);
      expect(budget.remaining).toBe(200);
    });

    it('should check budget status', () => {
      let budget = createBudget('Monthly Budget', 1000, 'monthly', new Date());
      budget = updateBudgetSpending(budget, 500);
      
      const status = checkBudgetStatus(budget);
      
      expect(status.utilizationPercentage).toBe(50);
    });
  });

  describe('Full Cost Analysis', () => {
    it('should perform full cost analysis', () => {
      const model = createTestModel();
      
      const analysis = performFullCostAnalysis(model);
      
      expect(analysis.currentCost).toBeDefined();
      expect(analysis.projectedCost).toBeDefined();
    });

    it('should generate cost report', () => {
      const model = createTestModel();
      const analysis = performFullCostAnalysis(model);
      const forecasts = forecastCosts(model, [], 7);
      
      const report = generateCostReport(model, analysis, forecasts);
      
      expect(report).toContain('# Cost Optimization Report');
    });
  });
});

// ==================== 实验知识图谱测试 ====================

describe('Experiment Knowledge Graph Service', () => {
  describe('Graph Management', () => {
    it('should create knowledge graph', () => {
      const graph = createKnowledgeGraph('Test Graph');
      
      expect(graph.id).toBeDefined();
      expect(graph.name).toBe('Test Graph');
      expect(graph.nodes.size).toBe(0);
    });

    it('should add node', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, {
        type: 'experiment',
        label: 'Experiment 1',
        properties: { status: 'completed' }
      });
      
      expect(graph.nodes.size).toBe(1);
    });

    it('should add edge', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      graph = addNode(graph, { type: 'metric', label: 'Metric 1', properties: {} });
      
      const nodeIds = Array.from(graph.nodes.keys());
      graph = addEdge(graph, nodeIds[0], nodeIds[1], 'measures');
      
      expect(graph.edges.length).toBe(1);
    });

    it('should remove node', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      
      const nodeIds = Array.from(graph.nodes.keys());
      graph = removeNode(graph, nodeIds[0]);
      
      expect(graph.nodes.size).toBe(0);
    });
  });

  describe('Graph Querying', () => {
    it('should query graph by node type', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      graph = addNode(graph, { type: 'experiment', label: 'Exp 2', properties: {} });
      graph = addNode(graph, { type: 'metric', label: 'Metric 1', properties: {} });
      
      const result = queryGraph(graph, { nodeTypes: ['experiment'] });
      
      expect(result.nodes.length).toBe(2);
    });

    it('should find shortest path', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'A', properties: {} });
      graph = addNode(graph, { type: 'experiment', label: 'B', properties: {} });
      graph = addNode(graph, { type: 'experiment', label: 'C', properties: {} });
      
      const nodeIds = Array.from(graph.nodes.keys());
      graph = addEdge(graph, nodeIds[0], nodeIds[1], 'relates_to');
      graph = addEdge(graph, nodeIds[1], nodeIds[2], 'relates_to');
      
      const path = findShortestPath(graph, nodeIds[0], nodeIds[2]);
      
      expect(path).not.toBeNull();
      expect(path!.nodes.length).toBe(3);
    });

    it('should get neighbors', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Center', properties: {} });
      graph = addNode(graph, { type: 'experiment', label: 'Neighbor 1', properties: {} });
      
      const nodeIds = Array.from(graph.nodes.keys());
      graph = addEdge(graph, nodeIds[0], nodeIds[1], 'relates_to');
      
      const neighbors = getNeighbors(graph, nodeIds[0]);
      
      expect(neighbors.length).toBe(1);
    });
  });

  describe('Relation Discovery', () => {
    it('should discover relations between similar nodes', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: { domain: 'ML' } });
      graph = addNode(graph, { type: 'experiment', label: 'Exp 2', properties: { domain: 'ML' } });
      
      const discoveries = discoverRelations(graph);
      
      expect(discoveries.length).toBeGreaterThan(0);
    });
  });

  describe('Insight Generation', () => {
    it('should generate insights', () => {
      let graph = createKnowledgeGraph('Test Graph');
      
      for (let i = 0; i < 5; i++) {
        graph = addNode(graph, { type: 'experiment', label: `Exp ${i}`, properties: {} });
      }
      
      const insights = generateInsights(graph);
      
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('Graph Analytics', () => {
    it('should analyze graph', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      graph = addNode(graph, { type: 'experiment', label: 'Exp 2', properties: {} });
      
      const nodeIds = Array.from(graph.nodes.keys());
      graph = addEdge(graph, nodeIds[0], nodeIds[1], 'relates_to');
      
      const analytics = analyzeGraph(graph);
      
      expect(analytics.centralityScores.size).toBe(2);
    });
  });

  describe('Export and Reporting', () => {
    it('should export graph to JSON', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      
      const json = exportGraphToJSON(graph);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('Test Graph');
    });

    it('should generate graph report', () => {
      let graph = createKnowledgeGraph('Test Graph');
      graph = addNode(graph, { type: 'experiment', label: 'Exp 1', properties: {} });
      
      const report = generateGraphReport(graph);
      
      expect(report).toContain('# Knowledge Graph Report');
    });
  });
});
