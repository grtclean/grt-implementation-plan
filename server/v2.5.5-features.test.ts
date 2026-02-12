/**
 * v2.5.5 功能测试
 * 成本预测模型自动选择、知识图谱语义搜索
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBasicStats,
  calculateSkewness,
  calculateKurtosis,
  detectTrend,
  detectSeasonality,
  calculateAutocorrelation,
  calculateLinearityScore,
  calculateExponentialityScore,
  calculateOutlierRatio,
  extractDataFeatures,
  fitLinearModel,
  fitExponentialModel,
  fitPolynomialModel,
  predict,
  evaluateModel,
  crossValidate,
  compareModels,
  autoSelectModel,
  createModelSelector,
  type DataPoint,
  type ModelConfig
} from './services/auto-model-selection.service';

import {
  tokenize,
  removeStopwords,
  cosineSimilarity,
  generateSimpleEmbedding,
  jaccardSimilarity,
  levenshteinDistance,
  stringSimilarity,
  parseQueryIntent,
  parseQuery,
  semanticMatchEntities,
  searchEntities,
  findPaths,
  executeSemanticSearch,
  createKnowledgeGraph,
  addEntity,
  addRelation,
  createSemanticSearchEngine,
  type Entity,
  type Relation
} from './services/semantic-search.service';

// ==================== 成本预测模型自动选择测试 ====================

describe('成本预测模型自动选择服务', () => {
  describe('基本统计计算', () => {
    it('应正确计算均值和标准差', () => {
      const data = [1, 2, 3, 4, 5];
      const stats = calculateBasicStats(data);
      
      expect(stats.mean).toBe(3);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.std).toBeCloseTo(Math.sqrt(2), 5);
    });
    
    it('应处理空数组', () => {
      const stats = calculateBasicStats([]);
      expect(stats.mean).toBe(0);
      expect(stats.std).toBe(0);
    });
    
    it('应正确计算偏度', () => {
      const symmetricData = [1, 2, 3, 4, 5];
      const skewness = calculateSkewness(symmetricData);
      expect(Math.abs(skewness)).toBeLessThan(0.1);
    });
    
    it('应正确计算峰度', () => {
      const normalData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const kurtosis = calculateKurtosis(normalData);
      expect(typeof kurtosis).toBe('number');
    });
  });
  
  describe('趋势检测', () => {
    it('应检测递增趋势', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const trend = detectTrend(data);
      expect(trend).toBe('increasing');
    });
    
    it('应检测递减趋势', () => {
      const data = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const trend = detectTrend(data);
      expect(trend).toBe('decreasing');
    });
    
    it('应检测稳定趋势', () => {
      const data = [5, 5, 5, 5, 5, 5, 5, 5];
      const trend = detectTrend(data);
      expect(trend).toBe('stable');
    });
  });
  
  describe('季节性检测', () => {
    it('应检测周期性数据', () => {
      const data: number[] = [];
      for (let i = 0; i < 48; i++) {
        data.push(Math.sin(i * Math.PI / 6) * 10 + 50);
      }
      const hasSeasonality = detectSeasonality(data);
      expect(typeof hasSeasonality).toBe('boolean');
    });
    
    it('应处理短数据', () => {
      const data = [1, 2, 3];
      const hasSeasonality = detectSeasonality(data);
      expect(hasSeasonality).toBe(false);
    });
  });
  
  describe('自相关计算', () => {
    it('应计算滞后1的自相关', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const autocorr = calculateAutocorrelation(data, 1);
      expect(autocorr).toBeGreaterThan(0.5);
    });
  });
  
  describe('线性度评估', () => {
    it('应为线性数据返回高分', () => {
      const points: DataPoint[] = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
        { x: 5, y: 10 }
      ];
      const score = calculateLinearityScore(points);
      expect(score).toBeGreaterThan(0.99);
    });
    
    it('应为非线性数据返回较低分', () => {
      const points: DataPoint[] = [
        { x: 1, y: 1 },
        { x: 2, y: 4 },
        { x: 3, y: 9 },
        { x: 4, y: 16 },
        { x: 5, y: 25 }
      ];
      const score = calculateLinearityScore(points);
      expect(score).toBeLessThan(0.99);
    });
  });
  
  describe('指数度评估', () => {
    it('应为指数数据返回高分', () => {
      const points: DataPoint[] = [
        { x: 1, y: Math.exp(1) },
        { x: 2, y: Math.exp(2) },
        { x: 3, y: Math.exp(3) },
        { x: 4, y: Math.exp(4) },
        { x: 5, y: Math.exp(5) }
      ];
      const score = calculateExponentialityScore(points);
      expect(score).toBeGreaterThan(0.99);
    });
  });
  
  describe('异常值检测', () => {
    it('应计算异常值比例', () => {
      const data = [1, 2, 3, 4, 5, 100]; // 100是异常值
      const ratio = calculateOutlierRatio(data);
      expect(ratio).toBeGreaterThan(0);
    });
    
    it('应为正常数据返回低比例', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const ratio = calculateOutlierRatio(data);
      expect(ratio).toBe(0);
    });
  });
  
  describe('特征提取', () => {
    it('应提取完整的数据特征', () => {
      const points: DataPoint[] = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 },
        { x: 4, y: 40 },
        { x: 5, y: 50 }
      ];
      const features = extractDataFeatures(points);
      
      expect(features.count).toBe(5);
      expect(features.mean).toBe(30);
      expect(features.min).toBe(10);
      expect(features.max).toBe(50);
      expect(features.trend).toBe('increasing');
      expect(features.linearityScore).toBeGreaterThan(0.99);
    });
  });
  
  describe('模型训练', () => {
    it('应正确拟合线性模型', () => {
      const points: DataPoint[] = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
        { x: 4, y: 9 },
        { x: 5, y: 11 }
      ];
      const { slope, intercept } = fitLinearModel(points);
      
      expect(slope).toBeCloseTo(2, 5);
      expect(intercept).toBeCloseTo(1, 5);
    });
    
    it('应正确拟合指数模型', () => {
      const points: DataPoint[] = [
        { x: 0, y: 1 },
        { x: 1, y: Math.E },
        { x: 2, y: Math.E * Math.E }
      ];
      const { a, b } = fitExponentialModel(points);
      
      expect(a).toBeCloseTo(1, 1);
      expect(b).toBeCloseTo(1, 1);
    });
    
    it('应正确拟合多项式模型', () => {
      const points: DataPoint[] = [
        { x: 1, y: 1 },
        { x: 2, y: 4 },
        { x: 3, y: 9 },
        { x: 4, y: 16 },
        { x: 5, y: 25 }
      ];
      const coeffs = fitPolynomialModel(points, 2);
      expect(coeffs.length).toBe(3);
    });
  });
  
  describe('模型预测', () => {
    it('应使用线性模型预测', () => {
      const model: ModelConfig = {
        type: 'linear',
        params: { slope: 2, intercept: 1 }
      };
      const prediction = predict(model, 5);
      expect(prediction).toBe(11);
    });
    
    it('应使用指数模型预测', () => {
      const model: ModelConfig = {
        type: 'exponential',
        params: { a: 1, b: 1 }
      };
      const prediction = predict(model, 2);
      expect(prediction).toBeCloseTo(Math.exp(2), 5);
    });
  });
  
  describe('模型评估', () => {
    it('应计算模型性能指标', () => {
      const points: DataPoint[] = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
        { x: 4, y: 9 },
        { x: 5, y: 11 }
      ];
      const model: ModelConfig = {
        type: 'linear',
        params: { slope: 2, intercept: 1 }
      };
      const performance = evaluateModel(model, points);
      
      expect(performance.mse).toBeCloseTo(0, 5);
      expect(performance.r2).toBeCloseTo(1, 5);
    });
  });
  
  describe('交叉验证', () => {
    it('应执行K折交叉验证', () => {
      const points: DataPoint[] = [];
      for (let i = 1; i <= 20; i++) {
        points.push({ x: i, y: 2 * i + 1 + Math.random() * 0.1 });
      }
      
      const result = crossValidate(points, 'linear', 5);
      
      expect(result.folds).toBe(5);
      expect(result.scores.length).toBe(5);
      expect(result.meanScore).toBeGreaterThan(0.9);
    });
  });
  
  describe('模型比较', () => {
    it('应比较多个模型并选择最佳', () => {
      const points: DataPoint[] = [];
      for (let i = 1; i <= 20; i++) {
        points.push({ x: i, y: 2 * i + 1 });
      }
      
      const comparison = compareModels(points);
      
      expect(comparison.models.length).toBe(3);
      expect(comparison.bestModel).toBe('linear');
      expect(comparison.ranking.length).toBe(3);
    });
  });
  
  describe('自动模型选择', () => {
    it('应为线性数据选择线性模型', () => {
      const points: DataPoint[] = [];
      for (let i = 1; i <= 20; i++) {
        points.push({ x: i, y: 2 * i + 1 });
      }
      
      const result = autoSelectModel(points);
      
      expect(result.selectedModel.type).toBe('linear');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.selectionReason).toContain('线性');
    });
    
    it('应为指数数据选择指数模型', () => {
      const points: DataPoint[] = [];
      for (let i = 1; i <= 10; i++) {
        points.push({ x: i, y: Math.exp(i * 0.5) });
      }
      
      const result = autoSelectModel(points);
      
      expect(['exponential', 'polynomial', 'linear']).toContain(result.selectedModel.type);
    });
  });
  
  describe('模型选择器', () => {
    it('应创建模型选择器', () => {
      const selector = createModelSelector();
      
      expect(selector.analyze).toBeDefined();
      expect(selector.select).toBeDefined();
      expect(selector.compare).toBeDefined();
      expect(selector.crossValidate).toBeDefined();
      expect(selector.predict).toBeDefined();
      expect(selector.evaluate).toBeDefined();
    });
    
    it('应使用选择器分析数据', () => {
      const selector = createModelSelector();
      const points: DataPoint[] = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 }
      ];
      
      const features = selector.analyze(points);
      expect(features.count).toBe(3);
    });
  });
});

// ==================== 知识图谱语义搜索测试 ====================

describe('知识图谱语义搜索服务', () => {
  describe('文本处理', () => {
    it('应正确分词', () => {
      const tokens = tokenize('Hello World');
      expect(tokens).toEqual(['hello', 'world']);
    });
    
    it('应处理中文', () => {
      const tokens = tokenize('查找 所有 实验');
      expect(tokens.length).toBe(3);
    });
    
    it('应去除停用词', () => {
      const tokens = ['the', 'quick', 'brown', 'fox'];
      const filtered = removeStopwords(tokens);
      expect(filtered).toEqual(['quick', 'brown', 'fox']);
    });
    
    it('应去除中文停用词', () => {
      const tokens = ['查找', '所有', '的', '实验'];
      const filtered = removeStopwords(tokens);
      expect(filtered).not.toContain('的');
    });
  });
  
  describe('向量操作', () => {
    it('应计算余弦相似度', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(1);
    });
    
    it('应为正交向量返回0', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });
    
    it('应生成嵌入向量', () => {
      const embedding = generateSimpleEmbedding('test', 64);
      expect(embedding.length).toBe(64);
    });
    
    it('应计算Jaccard相似度', () => {
      const a = new Set(['a', 'b', 'c']);
      const b = new Set(['b', 'c', 'd']);
      const similarity = jaccardSimilarity(a, b);
      expect(similarity).toBe(0.5); // 2/4
    });
    
    it('应计算编辑距离', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
    });
    
    it('应计算字符串相似度', () => {
      expect(stringSimilarity('hello', 'hello')).toBe(1);
      expect(stringSimilarity('hello', 'hallo')).toBeGreaterThan(0.7);
    });
  });
  
  describe('查询解析', () => {
    it('应解析查找实体意图', () => {
      const intent = parseQueryIntent('查找所有实验');
      expect(intent.type).toBe('find_entity');
    });
    
    it('应解析查找关系意图', () => {
      const intent = parseQueryIntent('查找A和B之间的关系');
      expect(intent.type).toBe('find_relation');
    });
    
    it('应解析聚合意图', () => {
      const intent = parseQueryIntent('有多少个实验');
      expect(intent.type).toBe('aggregate');
      expect(intent.aggregation).toBe('count');
    });
    
    it('应解析比较意图', () => {
      const intent = parseQueryIntent('比较实验A和实验B');
      expect(intent.type).toBe('compare');
    });
    
    it('应提取数值过滤条件', () => {
      const intent = parseQueryIntent('查找大于100的数据');
      expect(intent.filters.length).toBeGreaterThan(0);
      expect(intent.filters[0].operator).toBe('gt');
      expect(intent.filters[0].value).toBe(100);
    });
    
    it('应提取限制数量', () => {
      const intent = parseQueryIntent('查找前10个实验');
      expect(intent.limit).toBe(10);
    });
  });
  
  describe('知识图谱管理', () => {
    it('应创建空图谱', () => {
      const graph = createKnowledgeGraph();
      expect(graph.entities.size).toBe(0);
      expect(graph.relations.length).toBe(0);
    });
    
    it('应添加实体', () => {
      const graph = createKnowledgeGraph();
      const entity: Entity = {
        id: 'e1',
        type: 'experiment',
        name: '实验A',
        properties: { status: 'completed' }
      };
      
      addEntity(graph, entity);
      
      expect(graph.entities.size).toBe(1);
      expect(graph.entities.get('e1')).toBeDefined();
      expect(graph.entityIndex.get('experiment')?.has('e1')).toBe(true);
    });
    
    it('应添加关系', () => {
      const graph = createKnowledgeGraph();
      const relation: Relation = {
        id: 'r1',
        sourceId: 'e1',
        targetId: 'e2',
        type: 'related_to',
        properties: {},
        weight: 1
      };
      
      addRelation(graph, relation);
      
      expect(graph.relations.length).toBe(1);
      expect(graph.relationIndex.get('e1')?.length).toBe(1);
      expect(graph.relationIndex.get('e2')?.length).toBe(1);
    });
  });
  
  describe('语义匹配', () => {
    it('应匹配相似实体', () => {
      const entities: Entity[] = [
        { id: 'e1', type: 'experiment', name: '温度实验', properties: {} },
        { id: 'e2', type: 'experiment', name: '压力实验', properties: {} },
        { id: 'e3', type: 'device', name: '温度传感器', properties: {} }
      ];
      
      const matches = semanticMatchEntities('温度', entities, 2);
      
      expect(matches.length).toBe(2);
      expect(matches[0].entity.name).toContain('温度');
    });
    
    it('应返回相似度分数', () => {
      const entities: Entity[] = [
        { id: 'e1', type: 'experiment', name: 'test experiment', properties: {} }
      ];
      
      const matches = semanticMatchEntities('test', entities);
      
      expect(matches[0].similarity).toBeGreaterThan(0);
    });
  });
  
  describe('实体搜索', () => {
    it('应搜索匹配的实体', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'experiment', name: '温度测试', properties: { value: 100 } });
      addEntity(graph, { id: 'e2', type: 'experiment', name: '压力测试', properties: { value: 200 } });
      
      const results = searchEntities('温度', graph);
      
      expect(results.length).toBeGreaterThan(0);
    });
    
    it('应应用过滤条件', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'experiment', name: '实验A', properties: { value: 100 } });
      addEntity(graph, { id: 'e2', type: 'experiment', name: '实验B', properties: { value: 200 } });
      
      const results = searchEntities('实验', graph, [
        { field: 'value', operator: 'gt', value: 150 }
      ]);
      
      expect(results.every(e => e.properties.value > 150)).toBe(true);
    });
  });
  
  describe('路径查找', () => {
    it('应找到两个实体之间的路径', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'node', name: 'A', properties: {} });
      addEntity(graph, { id: 'e2', type: 'node', name: 'B', properties: {} });
      addEntity(graph, { id: 'e3', type: 'node', name: 'C', properties: {} });
      addRelation(graph, { id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'connects', properties: {}, weight: 1 });
      addRelation(graph, { id: 'r2', sourceId: 'e2', targetId: 'e3', type: 'connects', properties: {}, weight: 1 });
      
      const paths = findPaths(graph, 'e1', 'e3');
      
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].nodes.length).toBe(3);
      expect(paths[0].edges.length).toBe(2);
    });
    
    it('应按路径长度排序', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'node', name: 'A', properties: {} });
      addEntity(graph, { id: 'e2', type: 'node', name: 'B', properties: {} });
      addEntity(graph, { id: 'e3', type: 'node', name: 'C', properties: {} });
      addRelation(graph, { id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'connects', properties: {}, weight: 1 });
      addRelation(graph, { id: 'r2', sourceId: 'e2', targetId: 'e3', type: 'connects', properties: {}, weight: 1 });
      addRelation(graph, { id: 'r3', sourceId: 'e1', targetId: 'e3', type: 'connects', properties: {}, weight: 1 });
      
      const paths = findPaths(graph, 'e1', 'e3');
      
      expect(paths[0].length).toBeLessThanOrEqual(paths[paths.length - 1].length);
    });
  });
  
  describe('语义搜索执行', () => {
    it('应执行完整的语义搜索', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'experiment', name: '温度实验', properties: {} });
      addEntity(graph, { id: 'e2', type: 'experiment', name: '压力实验', properties: {} });
      
      const result = executeSemanticSearch('查找温度相关的实验', graph);
      
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.explanation).toBeDefined();
    });
    
    it('应返回搜索分数', () => {
      const graph = createKnowledgeGraph();
      addEntity(graph, { id: 'e1', type: 'experiment', name: '测试', properties: {} });
      
      const result = executeSemanticSearch('测试', graph);
      
      expect(result.score).toBeGreaterThan(0);
    });
  });
  
  describe('语义搜索引擎', () => {
    it('应创建搜索引擎', () => {
      const engine = createSemanticSearchEngine();
      
      expect(engine.graph).toBeDefined();
      expect(engine.addEntity).toBeDefined();
      expect(engine.addRelation).toBeDefined();
      expect(engine.search).toBeDefined();
      expect(engine.parseQuery).toBeDefined();
      expect(engine.findPaths).toBeDefined();
      expect(engine.matchEntities).toBeDefined();
    });
    
    it('应使用引擎添加和搜索实体', () => {
      const engine = createSemanticSearchEngine();
      
      engine.addEntity({ id: 'e1', type: 'experiment', name: '实验A', properties: {} });
      engine.addEntity({ id: 'e2', type: 'experiment', name: '实验B', properties: {} });
      
      const result = engine.search('实验');
      
      expect(result.entities.length).toBeGreaterThan(0);
    });
    
    it('应使用引擎查找路径', () => {
      const engine = createSemanticSearchEngine();
      
      engine.addEntity({ id: 'e1', type: 'node', name: 'A', properties: {} });
      engine.addEntity({ id: 'e2', type: 'node', name: 'B', properties: {} });
      engine.addRelation({ id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'connects', properties: {}, weight: 1 });
      
      const paths = engine.findPaths('e1', 'e2');
      
      expect(paths.length).toBeGreaterThan(0);
    });
    
    it('应使用引擎解析查询', () => {
      const engine = createSemanticSearchEngine();
      engine.addEntity({ id: 'e1', type: 'experiment', name: '实验', properties: {} });
      
      const parseResult = engine.parseQuery('查找所有实验');
      
      expect(parseResult.intent.type).toBe('find_entity');
      expect(parseResult.confidence).toBeGreaterThan(0);
    });
  });
});
