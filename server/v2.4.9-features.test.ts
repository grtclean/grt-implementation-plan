/**
 * v2.4.9 功能测试
 */

import { describe, it, expect } from 'vitest';
import {
  createQTable, getQValue, setQValue, getMaxQValue, getBestAction,
  qLearningUpdate, sarsaUpdate, epsilonGreedyPolicy, softmaxPolicy,
  addExperience, sampleExperiences, createAdaptiveLearningAgent,
  type Action, type State, type Experience, type LearningConfig
} from './services/adaptive-learning.service';

import {
  detectGPUDevices, selectBestDevice, estimateMemoryRequirement,
  generateCollisionDetectionShader, generateParticleSimulationShader,
  generateSpatialHashShader, generateReductionShader, cpuCollisionDetection,
  createSpatialHashGrid, parallelReduce, parallelPrefixSum, bitonicSort,
  createParticleSystem, updateParticleSystem, resolveCollisions,
  benchmarkCollisionDetection, calculatePerformanceMetrics
} from './services/gpu-acceleration.service';

import {
  createExperiment, startExperiment, pauseExperiment, completeExperiment,
  validateExperiment, assignUserToVariant, fixedAllocation, epsilonGreedyAllocation,
  thompsonSamplingAllocation, calculateVariantStats, tTest, chiSquareTest,
  calculateConfidenceInterval, calculateRelativeUplift, bayesianAnalysis,
  calculateRequiredSampleSize, estimateExperimentDuration,
  generateExperimentResults, summarizeExperiment, type MetricEvent
} from './services/ab-testing.service';

describe('自适应学习服务', () => {
  it('应该创建空Q表', () => {
    const qTable = createQTable();
    expect(qTable.size).toBe(0);
  });

  it('应该正确设置和获取Q值', () => {
    const qTable = createQTable();
    setQValue(qTable, 'state1', 'action1', 0.5);
    expect(getQValue(qTable, 'state1', 'action1')).toBe(0.5);
  });

  it('应该获取最大Q值', () => {
    const qTable = createQTable();
    const actions: Action[] = [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }];
    setQValue(qTable, 's1', 'a1', 0.3);
    setQValue(qTable, 's1', 'a2', 0.8);
    expect(getMaxQValue(qTable, 's1', actions)).toBe(0.8);
  });

  it('应该获取最佳动作', () => {
    const qTable = createQTable();
    const actions: Action[] = [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }];
    setQValue(qTable, 's1', 'a1', 0.3);
    setQValue(qTable, 's1', 'a2', 0.8);
    expect(getBestAction(qTable, 's1', actions).id).toBe('a2');
  });

  it('Q-Learning应该更新Q值', () => {
    const qTable = createQTable();
    const actions: Action[] = [{ id: 'a1', name: 'A1' }];
    const config: LearningConfig = {
      algorithm: 'q_learning', learningRate: 0.1, discountFactor: 0.9,
      epsilon: 0.1, epsilonDecay: 0.99, minEpsilon: 0.01
    };
    const exp: Experience = {
      state: { id: 's1', features: [1], timestamp: Date.now() },
      action: { id: 'a1', name: 'A1' },
      reward: { value: 1, timestamp: Date.now() },
      nextState: { id: 's2', features: [0], timestamp: Date.now() },
      done: false
    };
    qLearningUpdate(qTable, exp, config, actions);
    expect(getQValue(qTable, 's1', 'a1')).toBeGreaterThan(0);
  });

  it('SARSA应该更新Q值', () => {
    const qTable = createQTable();
    const config: LearningConfig = {
      algorithm: 'sarsa', learningRate: 0.1, discountFactor: 0.9,
      epsilon: 0.1, epsilonDecay: 0.99, minEpsilon: 0.01
    };
    const exp: Experience = {
      state: { id: 's1', features: [1], timestamp: Date.now() },
      action: { id: 'a1', name: 'A1' },
      reward: { value: 1, timestamp: Date.now() },
      nextState: { id: 's2', features: [0], timestamp: Date.now() },
      done: false
    };
    sarsaUpdate(qTable, exp, { id: 'a2', name: 'A2' }, config);
    expect(getQValue(qTable, 's1', 'a1')).toBeGreaterThan(0);
  });

  it('epsilon-greedy应该选择动作', () => {
    const qTable = createQTable();
    const actions: Action[] = [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }];
    setQValue(qTable, 's1', 'a2', 0.8);
    expect(epsilonGreedyPolicy(qTable, 's1', actions, 0).id).toBe('a2');
  });

  it('softmax应该选择动作', () => {
    const qTable = createQTable();
    const actions: Action[] = [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }];
    const action = softmaxPolicy(qTable, 's1', actions, 1.0);
    expect(actions.some(a => a.id === action.id)).toBe(true);
  });

  it('应该添加和采样经验', () => {
    const buffer: Experience[] = [];
    for (let i = 0; i < 50; i++) {
      addExperience(buffer, {
        state: { id: `s${i}`, features: [i], timestamp: Date.now() },
        action: { id: 'a1', name: 'A1' },
        reward: { value: 1, timestamp: Date.now() },
        nextState: { id: `s${i+1}`, features: [i+1], timestamp: Date.now() },
        done: false
      }, 100);
    }
    expect(sampleExperiences(buffer, 10).length).toBe(10);
  });

  it('应该创建自适应学习代理', () => {
    const config: LearningConfig = {
      algorithm: 'q_learning', learningRate: 0.1, discountFactor: 0.9,
      epsilon: 0.1, epsilonDecay: 0.99, minEpsilon: 0.01
    };
    const agent = createAdaptiveLearningAgent(config);
    expect(agent).toBeDefined();
    expect(typeof agent.selectAction).toBe('function');
  });
});

describe('GPU加速服务', () => {
  it('应该检测GPU设备', () => {
    const devices = detectGPUDevices();
    expect(devices.length).toBeGreaterThan(0);
  });

  it('应该选择最佳设备', () => {
    const devices = detectGPUDevices();
    const best = selectBestDevice(devices);
    expect(best?.type).toBe('discrete');
  });

  it('应该估算内存需求', () => {
    const config = {
      type: 'collision_detection' as const,
      workGroupSize: [256, 1, 1] as [number, number, number],
      dispatchSize: [100, 1, 1] as [number, number, number],
      inputBuffers: [{ name: 'particles', size: 1024, usage: 'read' as const }],
      outputBuffers: [{ name: 'collisions', size: 512, usage: 'write' as const }]
    };
    expect(estimateMemoryRequirement(config)).toBe(1536);
  });

  it('应该生成碰撞检测着色器', () => {
    const shader = generateCollisionDetectionShader(1000, 0.1);
    expect(shader.id).toBe('collision_detection');
    expect(shader.source).toContain('PARTICLE_COUNT');
  });

  it('应该生成粒子模拟着色器', () => {
    const shader = generateParticleSimulationShader(1000, 0.016);
    expect(shader.id).toBe('particle_simulation');
  });

  it('应该生成空间哈希着色器', () => {
    const shader = generateSpatialHashShader(1000, [10, 10, 10], 1.0);
    expect(shader.id).toBe('spatial_hash');
  });

  it('应该生成归约着色器', () => {
    expect(generateReductionShader('sum').id).toBe('reduction_sum');
  });

  it('应该检测碰撞', () => {
    const particles = [
      { position: [0, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], mass: 1, radius: 0.5, type: 0 },
      { position: [0.5, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], mass: 1, radius: 0.5, type: 0 }
    ];
    expect(cpuCollisionDetection(particles).length).toBe(1);
  });

  it('应该创建空间哈希网格', () => {
    const particles = createParticleSystem(100, { min: [0, 0, 0], max: [10, 10, 10] });
    const grid = createSpatialHashGrid(particles, 1.0, [0, 0, 0], [10, 10, 10]);
    expect(grid.cellSize).toBe(1.0);
  });

  it('应该执行并行归约', () => {
    expect(parallelReduce(new Float32Array([1, 2, 3, 4, 5]), 'sum')).toBe(15);
    expect(parallelReduce(new Float32Array([3, 1, 4]), 'min')).toBe(1);
    expect(parallelReduce(new Float32Array([3, 1, 4]), 'max')).toBe(4);
  });

  it('应该执行并行前缀和', () => {
    const result = parallelPrefixSum(new Float32Array([1, 2, 3, 4, 5]));
    expect(Array.from(result)).toEqual([1, 3, 6, 10, 15]);
  });

  it('应该执行双调排序', () => {
    const sorted = bitonicSort(new Float32Array([3, 1, 4, 1, 5, 9, 2, 6]));
    expect(Array.from(sorted)).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('应该创建和更新粒子系统', () => {
    const particles = createParticleSystem(100, { min: [0, 0, 0], max: [10, 10, 10] });
    expect(particles.length).toBe(100);
    updateParticleSystem(particles, 0.016, [0, -9.8, 0], 0.99, { min: [0, 0, 0], max: [10, 10, 10] });
  });

  it('应该解决碰撞', () => {
    const particles = [
      { position: [0, 0, 0] as [number, number, number], velocity: [1, 0, 0] as [number, number, number], mass: 1, radius: 0.5, type: 0 },
      { position: [0.5, 0, 0] as [number, number, number], velocity: [-1, 0, 0] as [number, number, number], mass: 1, radius: 0.5, type: 0 }
    ];
    const collisions = cpuCollisionDetection(particles);
    resolveCollisions(particles, collisions, 0.8);
    expect(particles[0].position[0]).toBeLessThan(0);
  });

  it('应该运行基准测试', () => {
    const results = benchmarkCollisionDetection([10, 20], 1);
    expect(results.length).toBe(2);
  });

  it('应该计算性能指标', () => {
    const metrics = calculatePerformanceMetrics(1000, 10, 100, 1024);
    expect(metrics.speedup).toBe(0.1);
  });
});

describe('A/B测试框架服务', () => {
  it('应该创建实验', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    expect(exp.status).toBe('draft');
    expect(exp.variants.length).toBe(2);
  });

  it('应该启动/暂停/完成实验', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    expect(startExperiment(exp).status).toBe('running');
    expect(pauseExperiment(startExperiment(exp)).status).toBe('paused');
    expect(completeExperiment(startExperiment(exp)).status).toBe('completed');
  });

  it('应该验证实验', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    expect(validateExperiment(exp).valid).toBe(true);
  });

  it('应该分配用户到变体', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    const assignments = new Map();
    const assignment = assignUserToVariant(exp, 'user1', assignments);
    expect(assignment.userId).toBe('user1');
  });

  it('应该固定分配用户', () => {
    const variants = [{ id: 'v1', name: 'C', weight: 0.5, isControl: true }, { id: 'v2', name: 'T', weight: 0.5, isControl: false }];
    const id1 = fixedAllocation(variants, 'user123');
    const id2 = fixedAllocation(variants, 'user123');
    expect(id1).toBe(id2);
  });

  it('应该epsilon-greedy分配', () => {
    const variants = [{ id: 'v1', name: 'C', weight: 0.5, isControl: true }, { id: 'v2', name: 'T', weight: 0.5, isControl: false }];
    expect(['v1', 'v2']).toContain(epsilonGreedyAllocation(variants, 0.1));
  });

  it('应该Thompson采样分配', () => {
    const variants = [{ id: 'v1', name: 'C', weight: 0.5, isControl: true }, { id: 'v2', name: 'T', weight: 0.5, isControl: false }];
    expect(['v1', 'v2']).toContain(thompsonSamplingAllocation(variants, new Map()));
  });

  it('应该计算变体统计', () => {
    const events: MetricEvent[] = [
      { userId: 'u1', experimentId: 'e1', variantId: 'v1', metricId: 'm1', value: 1, timestamp: Date.now() },
      { userId: 'u2', experimentId: 'e1', variantId: 'v1', metricId: 'm1', value: 2, timestamp: Date.now() },
      { userId: 'u3', experimentId: 'e1', variantId: 'v1', metricId: 'm1', value: 3, timestamp: Date.now() }
    ];
    const stats = calculateVariantStats(events, 'v1', 'm1');
    expect(stats.sampleSize).toBe(3);
    expect(stats.mean).toBe(2);
  });

  it('应该执行t检验', () => {
    const result = tTest({ mean: 0.1, variance: 0.01, sampleSize: 100 }, { mean: 0.15, variance: 0.01, sampleSize: 100 });
    expect(result.tStatistic).toBeDefined();
  });

  it('应该执行卡方检验', () => {
    const result = chiSquareTest(50, 500, 75, 500);
    expect(result.chiSquare).toBeGreaterThan(0);
  });

  it('应该计算置信区间', () => {
    const ci = calculateConfidenceInterval(0.5, 0.1, 0.95);
    expect(ci[0]).toBeLessThan(0.5);
    expect(ci[1]).toBeGreaterThan(0.5);
  });

  it('应该计算相对提升', () => {
    expect(calculateRelativeUplift(0.1, 0.12)).toBeCloseTo(0.2, 5);
  });

  it('应该执行贝叶斯分析', () => {
    const result = bayesianAnalysis({ successes: 50, trials: 500 }, { successes: 75, trials: 500 }, 1000);
    expect(result.probabilityTreatmentBetter).toBeGreaterThan(0.5);
  });

  it('应该计算所需样本量', () => {
    expect(calculateRequiredSampleSize(0.1, 0.2)).toBeGreaterThan(0);
  });

  it('应该估算实验持续时间', () => {
    expect(estimateExperimentDuration(10000, 1000)).toBe(10);
  });

  it('应该生成实验结果', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    const events: MetricEvent[] = [];
    for (let i = 0; i < 100; i++) {
      events.push({ userId: `u${i}`, experimentId: exp.id, variantId: exp.variants[0].id, metricId: exp.metrics[0].id, value: Math.random(), timestamp: Date.now() });
      events.push({ userId: `u${i+100}`, experimentId: exp.id, variantId: exp.variants[1].id, metricId: exp.metrics[0].id, value: Math.random() + 0.1, timestamp: Date.now() });
    }
    expect(generateExperimentResults(exp, events).length).toBe(2);
  });

  it('应该总结实验', () => {
    const exp = createExperiment('Test', 'Desc',
      [{ name: 'Control', weight: 0.5, isControl: true }, { name: 'Treatment', weight: 0.5, isControl: false }],
      [{ name: 'Metric', type: 'conversion', isPrimary: true }]
    );
    const summary = summarizeExperiment(exp, []);
    expect(summary.status).toBeDefined();
  });
});
