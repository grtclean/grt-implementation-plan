/**
 * Experiment Knowledge Graph Service
 * Stub implementation for v2.5.3 knowledge graph tests
 */

interface NodeData {
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

interface GraphNode extends NodeData {
  id: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraph {
  id: string;
  name: string;
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

interface QueryOptions {
  nodeTypes?: string[];
  edgeTypes?: string[];
  label?: string;
}

interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface PathResult {
  nodes: string[];
  edges: string[];
  length: number;
}

interface RelationDiscovery {
  source: string;
  target: string;
  type: string;
  confidence: number;
  reason: string;
}

interface Insight {
  type: string;
  description: string;
  relevance: number;
}

interface GraphAnalytics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  centralityScores: Map<string, number>;
  clusters: string[][];
}

let nodeIdCounter = 0;
let edgeIdCounter = 0;

export function createKnowledgeGraph(name: string): KnowledgeGraph {
  return {
    id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    nodes: new Map(),
    edges: [],
  };
}

export function addNode(graph: KnowledgeGraph, nodeData: NodeData): KnowledgeGraph {
  const id = `node-${++nodeIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
  const node: GraphNode = { ...nodeData, id };
  const newNodes = new Map(graph.nodes);
  newNodes.set(id, node);
  return {
    ...graph,
    nodes: newNodes,
  };
}

export function addEdge(graph: KnowledgeGraph, source: string, target: string, type: string): KnowledgeGraph {
  const id = `edge-${++edgeIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
  const edge: GraphEdge = { id, source, target, type };
  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

export function removeNode(graph: KnowledgeGraph, nodeId: string): KnowledgeGraph {
  const newNodes = new Map(graph.nodes);
  newNodes.delete(nodeId);
  const newEdges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  return {
    ...graph,
    nodes: newNodes,
    edges: newEdges,
  };
}

export function removeEdge(graph: KnowledgeGraph, edgeId: string): KnowledgeGraph {
  return {
    ...graph,
    edges: graph.edges.filter(e => e.id !== edgeId),
  };
}

export function queryGraph(graph: KnowledgeGraph, options: QueryOptions): QueryResult {
  let nodes = Array.from(graph.nodes.values());
  let edges = [...graph.edges];

  if (options.nodeTypes && options.nodeTypes.length > 0) {
    nodes = nodes.filter(n => options.nodeTypes!.includes(n.type));
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }

  if (options.edgeTypes && options.edgeTypes.length > 0) {
    edges = edges.filter(e => options.edgeTypes!.includes(e.type));
  }

  if (options.label) {
    nodes = nodes.filter(n => n.label.includes(options.label!));
  }

  return { nodes, edges };
}

export function findShortestPath(graph: KnowledgeGraph, startId: string, endId: string): PathResult | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) {
    return null;
  }

  // BFS for shortest path
  const adjacency = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
  for (const node of graph.nodes.keys()) {
    adjacency.set(node, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push({ neighbor: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)?.push({ neighbor: edge.source, edgeId: edge.id });
  }

  const visited = new Set<string>();
  const queue: Array<{ node: string; path: string[]; edgePath: string[] }> = [
    { node: startId, path: [startId], edgePath: [] },
  ];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.node === endId) {
      return {
        nodes: current.path,
        edges: current.edgePath,
        length: current.edgePath.length,
      };
    }

    const neighbors = adjacency.get(current.node) || [];
    for (const { neighbor, edgeId } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          node: neighbor,
          path: [...current.path, neighbor],
          edgePath: [...current.edgePath, edgeId],
        });
      }
    }
  }

  return null;
}

export function getNeighbors(graph: KnowledgeGraph, nodeId: string): GraphNode[] {
  const neighborIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      neighborIds.add(edge.target);
    }
    if (edge.target === nodeId) {
      neighborIds.add(edge.source);
    }
  }

  const neighbors: GraphNode[] = [];
  for (const id of neighborIds) {
    const node = graph.nodes.get(id);
    if (node) {
      neighbors.push(node);
    }
  }

  return neighbors;
}

export function discoverRelations(graph: KnowledgeGraph): RelationDiscovery[] {
  const discoveries: RelationDiscovery[] = [];
  const nodeList = Array.from(graph.nodes.entries());

  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const [id1, node1] = nodeList[i];
      const [id2, node2] = nodeList[j];

      // Check if already connected
      const alreadyConnected = graph.edges.some(
        e => (e.source === id1 && e.target === id2) || (e.source === id2 && e.target === id1)
      );

      if (!alreadyConnected) {
        // Discover relations based on shared properties or types
        if (node1.type === node2.type) {
          discoveries.push({
            source: id1,
            target: id2,
            type: 'same_type',
            confidence: 0.7,
            reason: `Both nodes are of type '${node1.type}'`,
          });
        }

        // Check shared property values
        const sharedProps = Object.keys(node1.properties).filter(
          k => node2.properties[k] !== undefined && node1.properties[k] === node2.properties[k]
        );
        if (sharedProps.length > 0) {
          discoveries.push({
            source: id1,
            target: id2,
            type: 'shared_properties',
            confidence: 0.5 + sharedProps.length * 0.1,
            reason: `Shared properties: ${sharedProps.join(', ')}`,
          });
        }
      }
    }
  }

  return discoveries;
}

export function generateInsights(graph: KnowledgeGraph): Insight[] {
  const insights: Insight[] = [];
  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.length;

  insights.push({
    type: 'overview',
    description: `Graph contains ${nodeCount} nodes and ${edgeCount} edges`,
    relevance: 1.0,
  });

  // Type distribution
  const typeCounts = new Map<string, number>();
  for (const node of graph.nodes.values()) {
    typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
  }
  for (const [type, count] of typeCounts) {
    insights.push({
      type: 'distribution',
      description: `${count} nodes of type '${type}'`,
      relevance: 0.8,
    });
  }

  // Connectivity insight
  if (nodeCount > 0 && edgeCount === 0) {
    insights.push({
      type: 'connectivity',
      description: 'Graph has no edges - nodes are disconnected',
      relevance: 0.9,
    });
  }

  return insights;
}

export function analyzeGraph(graph: KnowledgeGraph): GraphAnalytics {
  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.length;
  const maxEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  // Calculate degree centrality
  const centralityScores = new Map<string, number>();
  for (const nodeId of graph.nodes.keys()) {
    let degree = 0;
    for (const edge of graph.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        degree++;
      }
    }
    centralityScores.set(nodeId, nodeCount > 1 ? degree / (nodeCount - 1) : 0);
  }

  return {
    nodeCount,
    edgeCount,
    density,
    centralityScores,
    clusters: [],
  };
}

export function exportGraphToJSON(graph: KnowledgeGraph): string {
  const nodes: Array<{ id: string; type: string; label: string; properties: Record<string, unknown> }> = [];
  for (const [id, node] of graph.nodes) {
    nodes.push({ id, type: node.type, label: node.label, properties: node.properties });
  }

  return JSON.stringify({
    id: graph.id,
    name: graph.name,
    nodes,
    edges: graph.edges,
  }, null, 2);
}

export function generateGraphReport(graph: KnowledgeGraph): string {
  const analytics = analyzeGraph(graph);
  const insights = generateInsights(graph);

  const lines: string[] = [
    '# Knowledge Graph Report',
    '',
    `## Graph: ${graph.name}`,
    '',
    '## Overview',
    `- Nodes: ${analytics.nodeCount}`,
    `- Edges: ${analytics.edgeCount}`,
    `- Density: ${analytics.density.toFixed(4)}`,
    '',
    '## Insights',
  ];

  for (const insight of insights) {
    lines.push(`- [${insight.type}] ${insight.description}`);
  }

  lines.push('', '## Centrality Scores');
  for (const [nodeId, score] of analytics.centralityScores) {
    const node = graph.nodes.get(nodeId);
    lines.push(`- ${node?.label || nodeId}: ${score.toFixed(4)}`);
  }

  return lines.join('\n');
}
