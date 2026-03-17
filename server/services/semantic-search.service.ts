/**
 * Semantic Search Service
 * Stub implementation for v2.5.5 knowledge graph semantic search tests
 */

export interface Entity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
}

interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relations: Relation[];
  entityIndex: Map<string, Set<string>>;
  relationIndex: Map<string, Relation[]>;
}

interface QueryIntent {
  type: 'find_entity' | 'find_relation' | 'aggregate' | 'compare' | 'path' | 'unknown';
  aggregation?: string;
  filters: Array<{ field: string; operator: string; value: any }>;
  limit?: number;
  entityTypes?: string[];
  keywords: string[];
}

interface SemanticMatch {
  entity: Entity;
  similarity: number;
}

interface PathResult {
  nodes: string[];
  edges: string[];
  length: number;
}

interface SearchResult {
  entities: Entity[];
  relations?: Relation[];
  paths?: PathResult[];
  explanation: string;
  score: number;
}

interface ParseResult {
  intent: QueryIntent;
  confidence: number;
  tokens: string[];
}

// ==================== Text Processing ====================

const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'if', 'that', 'this', 'these', 'those', 'it', 'its',
]);

const CHINESE_STOPWORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这',
]);

export function tokenize(text: string): string[] {
  // Split by whitespace and punctuation, lowercase
  return text
    .toLowerCase()
    .split(/[\s,;:.!?，；：。！？、]+/)
    .filter(t => t.length > 0);
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter(t => !ENGLISH_STOPWORDS.has(t) && !CHINESE_STOPWORDS.has(t));
}

// ==================== Vector Operations ====================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export function generateSimpleEmbedding(text: string, dimensions: number): number[] {
  const embedding = new Array(dimensions).fill(0);
  const tokens = tokenize(text);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    for (let j = 0; j < token.length; j++) {
      const charCode = token.charCodeAt(j);
      const idx = (charCode * (i + 1) * (j + 1)) % dimensions;
      embedding[idx] += 1 / (token.length * tokens.length);
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// ==================== Query Parsing ====================

export function parseQueryIntent(query: string): QueryIntent {
  const intent: QueryIntent = {
    type: 'unknown',
    filters: [],
    keywords: [],
  };

  const tokens = tokenize(query);
  intent.keywords = removeStopwords(tokens);

  // Detect find entity intent
  if (query.includes('查找') || query.includes('搜索') || query.includes('find') || query.includes('search')) {
    intent.type = 'find_entity';
  }

  // Detect find relation intent
  if (query.includes('关系') || query.includes('之间') || query.includes('relation') || query.includes('between')) {
    intent.type = 'find_relation';
  }

  // Detect aggregate intent
  if (query.includes('多少') || query.includes('count') || query.includes('how many') || query.includes('总计')) {
    intent.type = 'aggregate';
    intent.aggregation = 'count';
  }

  // Detect compare intent
  if (query.includes('比较') || query.includes('对比') || query.includes('compare')) {
    intent.type = 'compare';
  }

  // Extract numeric filter conditions
  const gtMatch = query.match(/大于\s*(\d+)/);
  if (gtMatch) {
    intent.filters.push({ field: 'value', operator: 'gt', value: Number(gtMatch[1]) });
  }

  const ltMatch = query.match(/小于\s*(\d+)/);
  if (ltMatch) {
    intent.filters.push({ field: 'value', operator: 'lt', value: Number(ltMatch[1]) });
  }

  const eqMatch = query.match(/等于\s*(\d+)/);
  if (eqMatch) {
    intent.filters.push({ field: 'value', operator: 'eq', value: Number(eqMatch[1]) });
  }

  // Extract limit
  const limitMatch = query.match(/前\s*(\d+)\s*个/);
  if (limitMatch) {
    intent.limit = Number(limitMatch[1]);
  }
  const topMatch = query.match(/top\s*(\d+)/i);
  if (topMatch) {
    intent.limit = Number(topMatch[1]);
  }

  // Default to find_entity if still unknown but has search-like tokens
  if (intent.type === 'unknown' && intent.keywords.length > 0) {
    intent.type = 'find_entity';
  }

  return intent;
}

export function parseQuery(query: string): ParseResult {
  const intent = parseQueryIntent(query);
  const tokens = tokenize(query);
  const confidence = intent.type !== 'unknown' ? 0.8 : 0.3;

  return {
    intent,
    confidence,
    tokens,
  };
}

// ==================== Knowledge Graph Management ====================

export function createKnowledgeGraph(): KnowledgeGraph {
  return {
    entities: new Map(),
    relations: [],
    entityIndex: new Map(),
    relationIndex: new Map(),
  };
}

export function addEntity(graph: KnowledgeGraph, entity: Entity): void {
  graph.entities.set(entity.id, entity);

  // Update entity type index
  if (!graph.entityIndex.has(entity.type)) {
    graph.entityIndex.set(entity.type, new Set());
  }
  graph.entityIndex.get(entity.type)!.add(entity.id);
}

export function addRelation(graph: KnowledgeGraph, relation: Relation): void {
  graph.relations.push(relation);

  // Update relation index for source
  if (!graph.relationIndex.has(relation.sourceId)) {
    graph.relationIndex.set(relation.sourceId, []);
  }
  graph.relationIndex.get(relation.sourceId)!.push(relation);

  // Update relation index for target
  if (!graph.relationIndex.has(relation.targetId)) {
    graph.relationIndex.set(relation.targetId, []);
  }
  graph.relationIndex.get(relation.targetId)!.push(relation);
}

// ==================== Semantic Matching ====================

export function semanticMatchEntities(
  query: string,
  entities: Entity[],
  topK?: number
): SemanticMatch[] {
  const matches: SemanticMatch[] = [];

  for (const entity of entities) {
    // Compute similarity based on name match and property match
    let similarity = 0;

    // Check name similarity
    const nameTokens = tokenize(entity.name);
    const queryTokens = tokenize(query);

    // Token overlap
    const nameSet = new Set(nameTokens);
    const querySet = new Set(queryTokens);
    const jaccard = jaccardSimilarity(nameSet, querySet);

    // String containment bonus
    const nameLower = entity.name.toLowerCase();
    const queryLower = query.toLowerCase();
    const containsBonus = nameLower.includes(queryLower) || queryLower.includes(nameLower) ? 0.5 : 0;

    // Substring match bonus: check if query tokens appear in name
    let substringBonus = 0;
    for (const qt of queryTokens) {
      if (nameLower.includes(qt)) {
        substringBonus += 0.3 / queryTokens.length;
      }
    }
    // Also check if name tokens appear in query
    for (const nt of nameTokens) {
      if (queryLower.includes(nt)) {
        substringBonus += 0.3 / nameTokens.length;
      }
    }

    // Character-level overlap bonus for CJK text (no spaces between words)
    let charOverlap = 0;
    const nameChars = new Set(nameLower.split(''));
    const queryChars = new Set(queryLower.split(''));
    for (const c of nameChars) {
      if (queryChars.has(c) && c.trim().length > 0) charOverlap++;
    }
    const charBonus = nameChars.size > 0 ? (charOverlap / nameChars.size) * 0.4 : 0;

    similarity = Math.min(1, jaccard + containsBonus + substringBonus + charBonus);

    if (similarity > 0) {
      matches.push({ entity, similarity });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  if (topK !== undefined) {
    return matches.slice(0, topK);
  }

  return matches;
}

export function searchEntities(
  query: string,
  graph: KnowledgeGraph,
  filters?: Array<{ field: string; operator: string; value: any }>
): Entity[] {
  const entities = Array.from(graph.entities.values());
  const matches = semanticMatchEntities(query, entities);

  let results = matches.map(m => m.entity);

  if (filters && filters.length > 0) {
    results = results.filter(entity => {
      return filters.every(filter => {
        const value = entity.properties[filter.field];
        if (value === undefined) return false;
        switch (filter.operator) {
          case 'gt': return value! > filter.value;
          case 'lt': return value! < filter.value;
          case 'eq': return value === filter.value;
          case 'gte': return value! >= filter.value;
          case 'lte': return value! <= filter.value;
          default: return true;
        }
      });
    });
  }

  return results;
}

// ==================== Path Finding ====================

export function findPaths(
  graph: KnowledgeGraph,
  startId: string,
  endId: string,
  maxDepth: number = 5
): PathResult[] {
  const results: PathResult[] = [];

  // Build adjacency from relations
  const adj = new Map<string, Array<{ neighbor: string; relationId: string }>>();
  for (const entity of graph.entities.keys()) {
    adj.set(entity, []);
  }
  for (const relation of graph.relations) {
    adj.get(relation.sourceId)?.push({ neighbor: relation.targetId, relationId: relation.id });
    adj.get(relation.targetId)?.push({ neighbor: relation.sourceId, relationId: relation.id });
  }

  function dfs(current: string, path: string[], edgePath: string[], visited: Set<string>) {
    if (path.length > maxDepth + 1) return;
    if (current === endId) {
      results.push({
        nodes: [...path],
        edges: [...edgePath],
        length: edgePath.length,
      });
      return;
    }

    for (const { neighbor, relationId } of (adj.get(current) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        edgePath.push(relationId);
        dfs(neighbor, path, edgePath, visited);
        path.pop();
        edgePath.pop();
        visited.delete(neighbor);
      }
    }
  }

  const visited = new Set<string>([startId]);
  dfs(startId, [startId], [], visited);

  // Sort by path length
  results.sort((a, b) => a.length - b.length);
  return results;
}

// ==================== Semantic Search Execution ====================

export function executeSemanticSearch(query: string, graph: KnowledgeGraph): SearchResult {
  const intent = parseQueryIntent(query);
  const entities = searchEntities(query, graph, intent.filters);

  let explanation = '';
  if (intent.type === 'find_entity') {
    explanation = `Found ${entities.length} entities matching "${query}"`;
  } else if (intent.type === 'aggregate') {
    explanation = `Count: ${entities.length}`;
  } else {
    explanation = `Search results for "${query}"`;
  }

  // Calculate overall score based on match quality
  let score = 0;
  if (entities.length > 0) {
    const allEntities = Array.from(graph.entities.values());
    const matches = semanticMatchEntities(query, allEntities);
    if (matches.length > 0) {
      score = matches[0].similarity;
    }
  } else {
    score = 0.1;
  }

  return {
    entities,
    explanation,
    score: Math.max(score, 0.1),
  };
}

// ==================== Semantic Search Engine ====================

export function createSemanticSearchEngine() {
  const graph = createKnowledgeGraph();

  return {
    graph,

    addEntity(entity: Entity) {
      addEntity(graph, entity);
    },

    addRelation(relation: Relation) {
      addRelation(graph, relation);
    },

    search(query: string): SearchResult {
      return executeSemanticSearch(query, graph);
    },

    parseQuery(query: string): ParseResult {
      return parseQuery(query);
    },

    findPaths(startId: string, endId: string, maxDepth?: number): PathResult[] {
      return findPaths(graph, startId, endId, maxDepth);
    },

    matchEntities(query: string, topK?: number): SemanticMatch[] {
      const entities = Array.from(graph.entities.values());
      return semanticMatchEntities(query, entities, topK);
    },
  };
}
