/**
 * Root Cause Visualization Service
 * Provides visualization graph construction, hierarchical layout,
 * SVG export, edge path generation, and causal path analysis.
 */

import type { CausalRelation, RootCauseResult, AnomalyEvent } from './root-cause-analysis.service';

export interface GraphNodeStyle {
  color: string;
  size: number;
  opacity: number;
  scale: number;
}

export interface GraphEdgeStyle {
  color: string;
  width: number;
  opacity: number;
  animated: boolean;
}

export interface VisualizationNode {
  id: string;
  label: string;
  type: 'root_cause' | 'intermediate' | 'anomaly' | 'normal';
  x: number;
  y: number;
  style: GraphNodeStyle;
  data: Record<string, unknown>;
}

// Keep GraphNode as alias for backward compatibility
export type GraphNode = VisualizationNode;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  correlation: number;
  label: string;
  style: GraphEdgeStyle;
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  rootCauseCount: number;
  anomalyCount: number;
  avgCorrelation: number;
  maxDepth: number;
}

export interface CausalGraph {
  nodes: VisualizationNode[];
  edges: GraphEdge[];
  layout?: {
    width: number;
    height: number;
    direction: string;
  };
  legend?: {
    nodeTypes: Array<{ type: string; color: string; label: string }>;
    edgeTypes: Array<{ type: string; color: string; label: string }>;
  };
  statistics: GraphStatistics;
}

export interface VisualizationOptions {
  showWeakRelations?: boolean;
  minCorrelation?: number;
  layout?: string;
  direction?: 'TB' | 'LR';
}

export interface CausalPaths {
  upstream: string[];
  downstream: string[];
}

/**
 * Build a complete visualization graph from root cause results, causal relations, and anomalies.
 */
export function buildVisualizationGraph(
  rootCauseResults: RootCauseResult[],
  causalRelations: CausalRelation[],
  anomalies: AnomalyEvent[],
  options: VisualizationOptions = {}
): CausalGraph {
  const { showWeakRelations = true, minCorrelation = 0 } = options;

  const nodeMap = new Map<string, VisualizationNode>();
  let nodeIdCounter = 0;

  // Collect root cause parameter names
  const rootCauseParams = new Set<string>();
  for (const result of rootCauseResults) {
    for (const rc of result.rootCauses) {
      rootCauseParams.add(rc.parameterName);
    }
  }

  // Collect anomaly parameter names
  const anomalyParams = new Set<string>();
  for (const anomaly of anomalies) {
    anomalyParams.add(anomaly.parameterName);
  }

  // Collect all parameter names from causal relations
  const allParams = new Set<string>();
  for (const rel of causalRelations) {
    allParams.add(rel.sourceParameter);
    allParams.add(rel.targetParameter);
  }
  for (const p of rootCauseParams) allParams.add(p);
  for (const p of anomalyParams) allParams.add(p);

  // Create nodes
  for (const paramName of allParams) {
    nodeIdCounter++;
    const type: VisualizationNode['type'] = rootCauseParams.has(paramName)
      ? 'root_cause'
      : anomalyParams.has(paramName)
        ? 'anomaly'
        : 'intermediate';

    const colorMap: Record<string, string> = {
      root_cause: '#ef4444',
      anomaly: '#dc2626',
      intermediate: '#f59e0b',
      normal: '#22c55e',
    };

    nodeMap.set(paramName, {
      id: `node_${nodeIdCounter}`,
      label: paramName,
      type,
      x: nodeIdCounter * 150,
      y: 100,
      style: {
        color: colorMap[type] ?? '#22c55e',
        size: type === 'root_cause' ? 40 : type === 'anomaly' ? 38 : 35,
        opacity: 1,
        scale: 1,
      },
      data: {},
    });
  }

  // Create edges from causal relations (apply correlation filter)
  const filteredRelations = causalRelations.filter((rel) => {
    if (!showWeakRelations && rel.correlation < minCorrelation) return false;
    if (rel.correlation < minCorrelation) return false;
    return true;
  });

  let edgeIdCounter = 0;
  const edges: GraphEdge[] = [];
  for (const rel of filteredRelations) {
    const sourceNode = nodeMap.get(rel.sourceParameter);
    const targetNode = nodeMap.get(rel.targetParameter);
    if (!sourceNode || !targetNode) continue;

    edgeIdCounter++;
    edges.push({
      id: `edge_${edgeIdCounter}`,
      source: sourceNode.id,
      target: targetNode.id,
      correlation: rel.correlation,
      label: `${Math.round(rel.correlation * 100)}%`,
      style: {
        color: rel.correlation > 0.8 ? '#ef4444' : '#666',
        width: Math.max(1, rel.correlation * 4),
        opacity: 1,
        animated: false,
      },
    });
  }

  const nodes = Array.from(nodeMap.values());

  const rootCauseCount = nodes.filter((n) => n.type === 'root_cause').length;
  const anomalyCount = nodes.filter((n) => n.type === 'anomaly').length;
  const avgCorrelation =
    edges.length > 0
      ? edges.reduce((acc, e) => acc + e.correlation, 0) / edges.length
      : 0;

  return {
    nodes,
    edges,
    layout: {
      width: Math.max(800, nodes.length * 200),
      height: 600,
      direction: 'TB',
    },
    legend: {
      nodeTypes: [
        { type: 'root_cause', color: '#ef4444', label: '根因' },
        { type: 'intermediate', color: '#f59e0b', label: '中间节点' },
        { type: 'anomaly', color: '#dc2626', label: '异常' },
        { type: 'normal', color: '#22c55e', label: '正常' },
      ],
      edgeTypes: [
        { type: 'strong', color: '#ef4444', label: '强相关' },
        { type: 'weak', color: '#666', label: '弱相关' },
      ],
    },
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      rootCauseCount,
      anomalyCount,
      avgCorrelation,
      maxDepth: Math.max(1, nodes.length),
    },
  };
}

/**
 * Compute hierarchical layout positions for nodes.
 */
export function hierarchicalLayout(
  nodes: Map<string, { type: any; data: any }>,
  edges: Array<{ source: string; target: string; correlation: number }>,
  options: { direction?: 'TB' | 'LR'; spacing?: number } = {}
): Map<string, { x: number; y: number }> {
  const { direction = 'TB', spacing = 150 } = options;
  const positions = new Map<string, { x: number; y: number }>();

  // Build adjacency for topological ordering
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const key of nodes.keys()) {
    inDegree.set(key, 0);
    adjacency.set(key, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // BFS-based layering (Kahn's algorithm)
  const layers: string[][] = [];
  const queue: string[] = [];
  const visited = new Set<string>();

  for (const [key, deg] of inDegree) {
    if (deg === 0) queue.push(key);
  }

  while (queue.length > 0) {
    const layer: string[] = [...queue];
    layers.push(layer);
    const nextQueue: string[] = [];
    for (const node of queue) {
      visited.add(node);
      for (const neighbor of adjacency.get(node) ?? []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
        if (inDegree.get(neighbor) === 0 && !visited.has(neighbor)) {
          nextQueue.push(neighbor);
        }
      }
    }
    queue.length = 0;
    queue.push(...nextQueue);
  }

  // Place any remaining unvisited nodes
  for (const key of nodes.keys()) {
    if (!visited.has(key)) {
      layers.push([key]);
      visited.add(key);
    }
  }

  // Assign positions
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      if (direction === 'TB') {
        positions.set(layer[nodeIdx], {
          x: nodeIdx * spacing,
          y: layerIdx * spacing,
        });
      } else {
        positions.set(layer[nodeIdx], {
          x: layerIdx * spacing,
          y: nodeIdx * spacing,
        });
      }
    }
  }

  return positions;
}

/**
 * Generate an SVG path string from a list of points.
 */
export function generateEdgePath(
  points: Array<{ x: number; y: number }>
): string {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

/**
 * Export a CausalGraph to an SVG string.
 */
export function exportToSvg(graph: CausalGraph): string {
  const width = graph.layout?.width ?? 800;
  const height = graph.layout?.height ?? 600;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g class="edges">`;

  for (const edge of graph.edges) {
    const sourceNode = graph.nodes.find((n) => n.id === edge.source);
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode) {
      svg += `
    <line x1="${sourceNode.x}" y1="${sourceNode.y}" x2="${targetNode.x}" y2="${targetNode.y}" stroke="${edge.style.color}" stroke-width="${edge.style.width}" />`;
    }
  }

  svg += `
  </g>
  <g class="nodes">`;

  for (const node of graph.nodes) {
    svg += `
    <circle cx="${node.x}" cy="${node.y}" r="${node.style.size / 2}" fill="${node.style.color}" />
    <text x="${node.x}" y="${node.y + node.style.size / 2 + 15}" text-anchor="middle" font-size="12">${node.label}</text>`;
  }

  svg += `
  </g>
</svg>`;

  return svg;
}

/**
 * Get upstream and downstream causal paths for a given node.
 */
export function getNodeCausalPaths(
  graph: CausalGraph,
  nodeId: string
): CausalPaths {
  const upstream: string[] = [];
  const downstream: string[] = [];

  // Find upstream (edges pointing to this node)
  const visitedUp = new Set<string>();
  const queueUp = [nodeId];
  while (queueUp.length > 0) {
    const current = queueUp.shift()!;
    for (const edge of graph.edges) {
      if (edge.target === current && !visitedUp.has(edge.source)) {
        visitedUp.add(edge.source);
        upstream.push(edge.source);
        queueUp.push(edge.source);
      }
    }
  }

  // Find downstream (edges originating from this node)
  const visitedDown = new Set<string>();
  const queueDown = [nodeId];
  while (queueDown.length > 0) {
    const current = queueDown.shift()!;
    for (const edge of graph.edges) {
      if (edge.source === current && !visitedDown.has(edge.target)) {
        visitedDown.add(edge.target);
        downstream.push(edge.target);
        queueDown.push(edge.target);
      }
    }
  }

  return { upstream, downstream };
}

/**
 * Highlight a causal path in the graph by adjusting node opacities.
 * Nodes on the path get opacity 1, all others get reduced opacity.
 */
export function highlightCausalPath(
  graph: CausalGraph,
  path: string[]
): CausalGraph {
  const pathSet = new Set(path);
  const highlightedNodes = graph.nodes.map((node) => ({
    ...node,
    style: {
      ...node.style,
      opacity: pathSet.has(node.id) ? 1 : 0.3,
    },
  }));

  const highlightedEdges = graph.edges.map((edge) => ({
    ...edge,
    style: {
      ...edge.style,
      opacity:
        pathSet.has(edge.source) && pathSet.has(edge.target) ? 1 : 0.2,
      animated:
        pathSet.has(edge.source) && pathSet.has(edge.target),
    },
  }));

  return {
    ...graph,
    nodes: highlightedNodes,
    edges: highlightedEdges,
  };
}
