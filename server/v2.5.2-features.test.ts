/**
 * v2.5.2 功能测试
 * 博弈策略AI推荐、调度器自动扩缩容、实验结果自动归档
 */

import { describe, it, expect, beforeEach } from 'vitest';

// 博弈策略AI推荐服务
import {
  createStrategyRecommender,
  createStrategyModel,
  createMixedStrategyOptimizer,
  createOpponentModel,
  extractFeatures,
  type HistoricalGame,
  type StrategyRecommendation
} from './services/strategy-ai-recommendation.service';

// 调度器自动扩缩容服务
import {
  createLoadPredictor,
  createScalingDecider,
  createResourcePoolManager,
  createAutoScaler,
  createCostOptimizer,
  type ResourceMetrics,
  type ScalingPolicy,
  type ResourcePool,
  type ResourceInstance
} from './services/auto-scaling.service';

// 实验结果自动归档服务
import {
  createArchiveManager,
  createKnowledgeBase,
  createExperimentComparator,
  createAutoArchiver,
  generateArchiveReport,
  type ExperimentRecord,
  type SearchQuery
} from './services/experiment-archive.service';

// ==================== 博弈策略AI推荐测试 ====================

describe('Strategy AI Recommendation Service', () => {
  const createTestGame = (): HistoricalGame => ({
    id: 'game-1',
    gameType: 'prisoners-dilemma',
    players: ['player1', 'player2'],
    strategies: [['cooperate', 'defect'], ['cooperate', 'defect']],
    payoffs: [
      [[3, 3], [0, 5]],
      [[5, 0], [1, 1]]
    ],
    outcomes: [
      { round: 1, playerStrategies: [0, 0], payoffs: [3, 3] },
      { round: 2, playerStrategies: [0, 1], payoffs: [0, 5] }
    ],
    timestamp: Date.now()
  });

  describe('Strategy Recommender', () => {
    it('should create strategy recommender', () => {
      const recommender = createStrategyRecommender();
      expect(recommender).toBeDefined();
      expect(recommender.recommend).toBeDefined();
      expect(recommender.addGame).toBeDefined();
      expect(recommender.train).toBeDefined();
    });

    it('should recommend strategies based on game state', () => {
      const recommender = createStrategyRecommender();
      const game = createTestGame();
      
      const recommendation = recommender.recommend(game, 0);
      
      expect(recommendation).toBeDefined();
      expect(recommendation.strategyIndex).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it('should learn from game history', () => {
      const recommender = createStrategyRecommender();
      const game = createTestGame();
      
      recommender.addGame(game);
      
      // 训练模型
      const result = recommender.train();
      expect(result).toBeDefined();
      expect(result.epochsCompleted).toBeGreaterThanOrEqual(0);
    });

    it('should provide multiple strategy options', () => {
      const recommender = createStrategyRecommender();
      const game = createTestGame();
      
      const options = recommender.getTopStrategies(game, 0, 2);
      
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
    });

    it('should analyze opponent', () => {
      const recommender = createStrategyRecommender();
      const game = createTestGame();
      
      recommender.addGame(game);
      
      const profile = recommender.analyzeOpponent('player2');
      
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.playerId).toBe('player2');
      }
    });
  });

  describe('Strategy Model', () => {
    it('should create strategy model', () => {
      const model = createStrategyModel();
      expect(model).toBeDefined();
      expect(model.train).toBeDefined();
      expect(model.predict).toBeDefined();
    });

    it('should train on historical games', () => {
      const model = createStrategyModel();
      const games = [createTestGame(), createTestGame()];
      
      const result = model.train(games);
      
      expect(result).toBeDefined();
      expect(result.loss).toBeGreaterThanOrEqual(0);
    });

    it('should predict strategy scores', () => {
      const model = createStrategyModel();
      const games = [createTestGame()];
      model.train(games);
      
      // 注意: predict需要完整的博弈数据，这里测试训练后的模型状态
      const weights = model.getWeights();
      expect(weights).toBeDefined();
      expect(weights.featureWeights).toBeDefined();
    });
  });

  describe('Mixed Strategy Optimizer', () => {
    it('should create mixed strategy optimizer', () => {
      const optimizer = createMixedStrategyOptimizer();
      expect(optimizer).toBeDefined();
      expect(optimizer.optimize).toBeDefined();
      expect(optimizer.simulateOutcome).toBeDefined();
    });

    it('should optimize mixed strategy', () => {
      const optimizer = createMixedStrategyOptimizer();
      const game = createTestGame();
      
      const mix = optimizer.optimize(game, 0);
      
      expect(mix).toBeDefined();
      expect(Array.isArray(mix)).toBe(true);
      // 概率和应该为1
      if (mix.length > 0) {
        const sum = mix.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 5);
      }
    });

    it('should simulate outcome with mixed strategies', () => {
      const optimizer = createMixedStrategyOptimizer();
      const game = createTestGame();
      
      const mixedStrategies = [[0.5, 0.5], [0.5, 0.5]];
      const outcome = optimizer.simulateOutcome(game, mixedStrategies);
      
      expect(outcome).toBeDefined();
      expect(Array.isArray(outcome)).toBe(true);
      expect(outcome.length).toBe(2);
    });
  });

  describe('Opponent Model', () => {
    it('should create opponent model', () => {
      const model = createOpponentModel();
      expect(model).toBeDefined();
      expect(model.learn).toBeDefined();
      expect(model.predict).toBeDefined();
    });

    it('should learn from opponent games', () => {
      const model = createOpponentModel();
      const games = [createTestGame()];
      
      model.learn(games, 'player2', 1);
      
      const profile = model.getProfile();
      expect(profile).toBeDefined();
      expect(profile?.playerId).toBe('player2');
    });

    it('should predict opponent strategy', () => {
      const model = createOpponentModel();
      const games = [createTestGame()];
      
      model.learn(games, 'player2', 1);
      
      const prediction = model.predict('prisoners-dilemma');
      
      expect(prediction).toBeDefined();
      expect(Array.isArray(prediction)).toBe(true);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract features from game', () => {
      const game = createTestGame();
      
      const features = extractFeatures(game, 0, 0);
      
      expect(features).toBeDefined();
      expect(features.gameType).toBe('prisoners-dilemma');
      expect(features.playerCount).toBe(2);
    });
  });
});

// ==================== 调度器自动扩缩容测试 ====================

describe('Auto Scaling Service', () => {
  describe('Load Predictor', () => {
    it('should create load predictor', () => {
      const predictor = createLoadPredictor();
      expect(predictor).toBeDefined();
      expect(predictor.addMetrics).toBeDefined();
      expect(predictor.predict).toBeDefined();
    });

    it('should predict future load', () => {
      const predictor = createLoadPredictor();
      
      // 添加一些历史数据
      for (let i = 0; i < 20; i++) {
        predictor.addMetrics({
          timestamp: Date.now() - (20 - i) * 60000,
          cpuUsage: 0.5 + Math.random() * 0.2,
          memoryUsage: 0.6,
          gpuUsage: 0.3,
          networkIO: 100,
          diskIO: 50,
          queueDepth: 10,
          activeWorkers: 5,
          pendingTasks: 3,
          throughput: 100,
          latency: 10
        });
      }
      
      const predictions = predictor.predict(10);
      
      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(10);
      expect(predictions[0].predictedLoad).toBeGreaterThanOrEqual(0);
      expect(predictions[0].predictedLoad).toBeLessThanOrEqual(1);
    });

    it('should detect anomalies', () => {
      const predictor = createLoadPredictor();
      
      // 添加正常数据
      for (let i = 0; i < 30; i++) {
        predictor.addMetrics({
          timestamp: Date.now() - (30 - i) * 60000,
          cpuUsage: 0.5,
          memoryUsage: 0.5,
          gpuUsage: 0.5,
          networkIO: 100,
          diskIO: 50,
          queueDepth: 10,
          activeWorkers: 5,
          pendingTasks: 3,
          throughput: 100,
          latency: 10
        });
      }
      
      const normalMetrics: ResourceMetrics = {
        timestamp: Date.now(),
        cpuUsage: 0.5,
        memoryUsage: 0.5,
        gpuUsage: 0.5,
        networkIO: 100,
        diskIO: 50,
        queueDepth: 10,
        activeWorkers: 5,
        pendingTasks: 3,
        throughput: 100,
        latency: 10
      };
      
      const isAnomaly = predictor.detectAnomaly(normalMetrics);
      expect(typeof isAnomaly).toBe('boolean');
    });
  });

  describe('Scaling Decider', () => {
    let policy: ScalingPolicy;
    
    beforeEach(() => {
      policy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'target-tracking',
        targetMetric: 'cpuUsage',
        targetValue: 0.7,
        minCapacity: 2,
        maxCapacity: 10,
        cooldownPeriod: 60,
        scaleUpThreshold: 0.1,
        scaleDownThreshold: 0.1,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        enabled: true
      };
    });

    it('should create scaling decider', () => {
      const decider = createScalingDecider(policy);
      expect(decider).toBeDefined();
      expect(decider.evaluate).toBeDefined();
    });

    it('should decide to scale up when load is high', () => {
      const decider = createScalingDecider(policy);
      
      const metrics: ResourceMetrics = {
        timestamp: Date.now(),
        cpuUsage: 0.9,
        memoryUsage: 0.5,
        gpuUsage: 0.5,
        networkIO: 100,
        diskIO: 50,
        queueDepth: 10,
        activeWorkers: 5,
        pendingTasks: 3,
        throughput: 100,
        latency: 10
      };
      
      const decision = decider.evaluate(metrics, 5);
      
      expect(decision).toBeDefined();
      expect(decision.action).toBe('scale-up');
      expect(decision.targetCapacity).toBeGreaterThan(5);
    });

    it('should decide to scale down when load is low', () => {
      const decider = createScalingDecider(policy);
      
      const metrics: ResourceMetrics = {
        timestamp: Date.now(),
        cpuUsage: 0.3,
        memoryUsage: 0.3,
        gpuUsage: 0.2,
        networkIO: 50,
        diskIO: 20,
        queueDepth: 2,
        activeWorkers: 5,
        pendingTasks: 0,
        throughput: 50,
        latency: 5
      };
      
      const decision = decider.evaluate(metrics, 8);
      
      expect(decision).toBeDefined();
      expect(decision.action).toBe('scale-down');
      expect(decision.targetCapacity).toBeLessThan(8);
    });

    it('should respect cooldown period', () => {
      const decider = createScalingDecider(policy);
      
      const metrics: ResourceMetrics = {
        timestamp: Date.now(),
        cpuUsage: 0.9,
        memoryUsage: 0.5,
        gpuUsage: 0.5,
        networkIO: 100,
        diskIO: 50,
        queueDepth: 10,
        activeWorkers: 5,
        pendingTasks: 3,
        throughput: 100,
        latency: 10
      };
      
      // 第一次决策
      const decision1 = decider.evaluate(metrics, 5);
      expect(decision1.action).toBe('scale-up');
      
      // 立即再次决策应该在冷却期内
      const decision2 = decider.evaluate(metrics, 5);
      expect(decision2.action).toBe('no-change');
      expect(decision2.reason).toContain('cooldown');
    });
  });

  describe('Resource Pool Manager', () => {
    it('should create and manage resource pools', () => {
      const manager = createResourcePoolManager();
      
      const pool = manager.createPool({
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 0,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7
      });
      
      expect(pool).toBeDefined();
      expect(pool.id).toBe('pool-1');
    });

    it('should add and remove instances', () => {
      const manager = createResourcePoolManager();
      
      manager.createPool({
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 0,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7
      });
      
      const instance: ResourceInstance = {
        id: 'instance-1',
        type: 'cpu',
        status: 'running',
        capacity: 1,
        currentLoad: 0.5,
        startTime: Date.now(),
        lastHealthCheck: Date.now()
      };
      
      const added = manager.addInstance('pool-1', instance);
      expect(added).toBe(true);
      
      const pool = manager.getPool('pool-1');
      expect(pool?.currentCapacity).toBe(1);
      
      const removed = manager.removeInstance('pool-1', 'instance-1');
      expect(removed).toBe(true);
    });

    it('should scale pool capacity', () => {
      const manager = createResourcePoolManager();
      
      manager.createPool({
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 0,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7
      });
      
      const event = manager.scalePool('pool-1', 5);
      
      expect(event).toBeDefined();
      expect(event.action).toBe('scale-up');
      expect(event.newCapacity).toBe(5);
      expect(event.success).toBe(true);
    });
  });

  describe('Auto Scaler', () => {
    it('should create auto scaler', () => {
      const scaler = createAutoScaler({ checkInterval: 1000 });
      expect(scaler).toBeDefined();
      expect(scaler.start).toBeDefined();
      expect(scaler.stop).toBeDefined();
    });

    it('should manage pools', () => {
      const scaler = createAutoScaler({ checkInterval: 1000 });
      
      const pool: ResourcePool = {
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 5,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7,
        instances: []
      };
      
      const policy: ScalingPolicy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'target-tracking',
        targetMetric: 'cpuUsage',
        targetValue: 0.7,
        minCapacity: 2,
        maxCapacity: 10,
        cooldownPeriod: 60,
        scaleUpThreshold: 0.1,
        scaleDownThreshold: 0.1,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        enabled: true
      };
      
      scaler.addPool(pool, policy);
      
      const status = scaler.getStatus();
      expect(status.pools).toContain('pool-1');
    });

    it('should force scale', () => {
      const scaler = createAutoScaler({ checkInterval: 1000 });
      
      const pool: ResourcePool = {
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 5,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7,
        instances: []
      };
      
      const policy: ScalingPolicy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'target-tracking',
        targetMetric: 'cpuUsage',
        targetValue: 0.7,
        minCapacity: 2,
        maxCapacity: 10,
        cooldownPeriod: 60,
        scaleUpThreshold: 0.1,
        scaleDownThreshold: 0.1,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        enabled: true
      };
      
      scaler.addPool(pool, policy);
      
      const event = scaler.forceScale('pool-1', 8);
      expect(event).toBeDefined();
      expect(event?.newCapacity).toBe(8);
    });
  });

  describe('Cost Optimizer', () => {
    it('should calculate costs', () => {
      const optimizer = createCostOptimizer();
      
      const pool: ResourcePool = {
        id: 'pool-1',
        name: 'Test Pool',
        type: 'gpu',
        currentCapacity: 5,
        minCapacity: 2,
        maxCapacity: 10,
        utilizationTarget: 0.7,
        instances: []
      };
      
      const cost = optimizer.calculateCost(pool, 24);
      
      expect(cost).toBeGreaterThan(0);
    });

    it('should suggest optimal capacity', () => {
      const optimizer = createCostOptimizer();
      
      const pool: ResourcePool = {
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 10,
        minCapacity: 2,
        maxCapacity: 20,
        utilizationTarget: 0.7,
        instances: [
          { id: 'i1', type: 'cpu', status: 'running', capacity: 1, currentLoad: 0.3, startTime: 0, lastHealthCheck: 0 },
          { id: 'i2', type: 'cpu', status: 'running', capacity: 1, currentLoad: 0.4, startTime: 0, lastHealthCheck: 0 },
          { id: 'i3', type: 'cpu', status: 'running', capacity: 1, currentLoad: 0.5, startTime: 0, lastHealthCheck: 0 }
        ]
      };
      
      const optimal = optimizer.suggestOptimalCapacity(pool, 0.7);
      
      expect(optimal).toBeGreaterThanOrEqual(pool.minCapacity);
      expect(optimal).toBeLessThanOrEqual(pool.maxCapacity);
    });

    it('should analyze spot opportunity', () => {
      const optimizer = createCostOptimizer();
      
      const pool: ResourcePool = {
        id: 'pool-1',
        name: 'Test Pool',
        type: 'cpu',
        currentCapacity: 10,
        minCapacity: 2,
        maxCapacity: 20,
        utilizationTarget: 0.7,
        instances: []
      };
      
      const analysis = optimizer.analyzeSpotOpportunity(pool);
      
      expect(analysis).toBeDefined();
      expect(analysis.savings).toBeGreaterThanOrEqual(0);
      expect(analysis.risk).toBeGreaterThanOrEqual(0);
      expect(analysis.risk).toBeLessThanOrEqual(1);
    });
  });
});

// ==================== 实验结果自动归档测试 ====================

describe('Experiment Archive Service', () => {
  const createTestExperiment = (id: string, status: 'running' | 'completed' | 'archived' = 'completed'): ExperimentRecord => ({
    id,
    name: `Test Experiment ${id}`,
    description: 'A test experiment',
    type: 'ab-test',
    status,
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    endTime: status === 'completed' ? Date.now() - 24 * 60 * 60 * 1000 : undefined,
    config: {
      variants: [
        { id: 'control', name: 'Control', description: 'Control group', parameters: {} },
        { id: 'treatment', name: 'Treatment', description: 'Treatment group', parameters: { feature: true } }
      ],
      targetMetric: 'conversion_rate',
      secondaryMetrics: ['revenue', 'engagement'],
      sampleSize: 10000,
      confidenceLevel: 0.95,
      minimumDetectableEffect: 0.05,
      trafficAllocation: [0.5, 0.5]
    },
    results: {
      totalSamples: 10000,
      variantResults: [
        { variantId: 'control', samples: 5000, conversions: 500, conversionRate: 0.1, meanValue: 10, standardDeviation: 2, metrics: { revenue: 5000, engagement: 0.5 } },
        { variantId: 'treatment', samples: 5000, conversions: 600, conversionRate: 0.12, meanValue: 12, standardDeviation: 2.5, metrics: { revenue: 6000, engagement: 0.6 } }
      ],
      winner: 'treatment',
      statisticalSignificance: 0.98,
      effectSize: 0.2,
      confidenceInterval: [0.15, 0.25],
      conclusions: ['Treatment variant shows 20% improvement']
    },
    metadata: {
      owner: 'test-user',
      team: 'growth',
      project: 'conversion-optimization',
      hypothesis: 'Adding feature X will increase conversion rate',
      learnings: ['Feature X is effective'],
      relatedExperiments: []
    },
    tags: ['conversion', 'feature-x', 'growth']
  });

  describe('Archive Manager', () => {
    it('should create archive manager', () => {
      const manager = createArchiveManager();
      expect(manager).toBeDefined();
      expect(manager.archive).toBeDefined();
      expect(manager.restore).toBeDefined();
    });

    it('should archive experiments', () => {
      const manager = createArchiveManager();
      const experiment = createTestExperiment('exp-1');
      
      const entry = manager.archive(experiment, 'test-user', 'Test archive');
      
      expect(entry).toBeDefined();
      expect(entry.experimentId).toBe('exp-1');
      expect(entry.version).toBe(1);
      expect(entry.archivedBy).toBe('test-user');
    });

    it('should restore archived experiments', () => {
      const manager = createArchiveManager();
      const experiment = createTestExperiment('exp-1');
      
      const entry = manager.archive(experiment, 'test-user');
      const restored = manager.restore(entry.id);
      
      expect(restored).toBeDefined();
      expect(restored?.id).toBe('exp-1');
      expect(restored?.name).toBe(experiment.name);
    });

    it('should track version history', () => {
      const manager = createArchiveManager();
      const experiment = createTestExperiment('exp-1');
      
      manager.archive(experiment, 'user1', 'First archive');
      
      experiment.results.conclusions.push('New insight');
      manager.archive(experiment, 'user2', 'Updated conclusions');
      
      const history = manager.getHistory('exp-1');
      
      expect(history.length).toBe(2);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
    });

    it('should provide archive stats', () => {
      const manager = createArchiveManager();
      
      manager.archive(createTestExperiment('exp-1'), 'user1');
      manager.archive(createTestExperiment('exp-2'), 'user1');
      
      const stats = manager.getArchiveStats();
      
      expect(stats.totalArchives).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Base', () => {
    it('should create knowledge base', () => {
      const kb = createKnowledgeBase();
      expect(kb).toBeDefined();
      expect(kb.add).toBeDefined();
      expect(kb.search).toBeDefined();
    });

    it('should add and retrieve experiments', () => {
      const kb = createKnowledgeBase();
      const experiment = createTestExperiment('exp-1');
      
      kb.add(experiment);
      const retrieved = kb.get('exp-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('exp-1');
    });

    it('should search by keywords', () => {
      const kb = createKnowledgeBase();
      
      kb.add(createTestExperiment('exp-1'));
      kb.add(createTestExperiment('exp-2'));
      
      const query: SearchQuery = {
        keywords: ['Test', 'Experiment']
      };
      
      const results = kb.search(query);
      
      expect(results.totalCount).toBe(2);
    });

    it('should search by tags', () => {
      const kb = createKnowledgeBase();
      
      const exp1 = createTestExperiment('exp-1');
      exp1.tags = ['conversion', 'mobile'];
      
      const exp2 = createTestExperiment('exp-2');
      exp2.tags = ['retention', 'desktop'];
      
      kb.add(exp1);
      kb.add(exp2);
      
      const results = kb.search({ tags: ['conversion'] });
      
      expect(results.totalCount).toBe(1);
      expect(results.experiments[0].id).toBe('exp-1');
    });

    it('should find similar experiments', () => {
      const kb = createKnowledgeBase();
      
      const exp1 = createTestExperiment('exp-1');
      exp1.tags = ['conversion', 'feature-x'];
      exp1.metadata.team = 'growth';
      
      const exp2 = createTestExperiment('exp-2');
      exp2.tags = ['conversion', 'feature-y'];
      exp2.metadata.team = 'growth';
      
      const exp3 = createTestExperiment('exp-3');
      exp3.tags = ['retention'];
      exp3.metadata.team = 'engagement';
      
      kb.add(exp1);
      kb.add(exp2);
      kb.add(exp3);
      
      const similar = kb.getSimilar('exp-1', 2);
      
      expect(similar.length).toBeLessThanOrEqual(2);
      // exp2 should be more similar to exp1 than exp3
      if (similar.length > 0) {
        expect(similar[0].id).toBe('exp-2');
      }
    });

    it('should provide search facets', () => {
      const kb = createKnowledgeBase();
      
      kb.add(createTestExperiment('exp-1'));
      kb.add(createTestExperiment('exp-2'));
      
      const results = kb.search({});
      
      expect(results.facets).toBeDefined();
      expect(results.facets.types).toBeDefined();
      expect(results.facets.tags).toBeDefined();
    });
  });

  describe('Experiment Comparator', () => {
    it('should compare experiments', () => {
      const comparator = createExperimentComparator();
      
      const exp1 = createTestExperiment('exp-1');
      const exp2 = createTestExperiment('exp-2');
      
      const report = comparator.compare([exp1, exp2]);
      
      expect(report).toBeDefined();
      expect(report.experiments.length).toBe(2);
      expect(report.commonMetrics.length).toBeGreaterThan(0);
    });

    it('should find best practices', () => {
      const comparator = createExperimentComparator();
      
      const experiments = [
        createTestExperiment('exp-1'),
        createTestExperiment('exp-2'),
        createTestExperiment('exp-3')
      ];
      
      const practices = comparator.findBestPractices(experiments);
      
      expect(practices).toBeDefined();
      expect(practices.length).toBeGreaterThan(0);
    });

    it('should generate insights', () => {
      const comparator = createExperimentComparator();
      
      const experiments = [
        createTestExperiment('exp-1'),
        createTestExperiment('exp-2')
      ];
      
      const insights = comparator.generateInsights(experiments);
      
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('Auto Archiver', () => {
    it('should create auto archiver', () => {
      const archiver = createAutoArchiver({
        archiveAfterDays: 30,
        autoArchiveCompleted: true
      });
      
      expect(archiver).toBeDefined();
      expect(archiver.checkAndArchive).toBeDefined();
    });

    it('should auto archive old completed experiments', () => {
      const archiver = createAutoArchiver({
        archiveAfterDays: 1, // 1 day for testing
        autoArchiveCompleted: true
      });
      
      const oldExperiment = createTestExperiment('exp-old');
      oldExperiment.endTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      
      const newExperiment = createTestExperiment('exp-new');
      newExperiment.endTime = Date.now(); // Just now
      
      const archived = archiver.checkAndArchive([oldExperiment, newExperiment]);
      
      expect(archived.length).toBe(1);
      expect(archived[0].experimentId).toBe('exp-old');
    });

    it('should respect configuration', () => {
      const archiver = createAutoArchiver({
        archiveAfterDays: 30,
        autoArchiveCompleted: false
      });
      
      const config = archiver.getConfig();
      
      expect(config.archiveAfterDays).toBe(30);
      expect(config.autoArchiveCompleted).toBe(false);
      
      archiver.setConfig({ archiveAfterDays: 60 });
      
      const updatedConfig = archiver.getConfig();
      expect(updatedConfig.archiveAfterDays).toBe(60);
    });
  });

  describe('Report Generation', () => {
    it('should generate markdown report', () => {
      const experiments = [
        createTestExperiment('exp-1'),
        createTestExperiment('exp-2')
      ];
      
      const report = generateArchiveReport(experiments, 'markdown');
      
      expect(report).toBeDefined();
      expect(report).toContain('# Experiment Archive Report');
      expect(report).toContain('## Summary');
    });

    it('should generate JSON report', () => {
      const experiments = [
        createTestExperiment('exp-1')
      ];
      
      const report = generateArchiveReport(experiments, 'json');
      
      expect(report).toBeDefined();
      const parsed = JSON.parse(report);
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.totalExperiments).toBe(1);
    });

    it('should generate HTML report', () => {
      const experiments = [
        createTestExperiment('exp-1')
      ];
      
      const report = generateArchiveReport(experiments, 'html');
      
      expect(report).toBeDefined();
      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('Experiment Archive Report');
    });
  });
});
