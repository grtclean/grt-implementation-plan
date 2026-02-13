/**
 * Knowledge Graph Visualization Service
 * Stub implementation for v2.5.4 graph visualization tests
 */

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
  }>;
}

interface Position {
  x: number;
  y: number;
}

interface PathResult {
  nodes: string[];
  edges: string[];
  length: number;
}

interface DegreeInfo {
  in: number;
  out: number;
  total: number;
}

interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

interface Selection {
  nodes: string[];
  edges: string[];
}

interface InteractionState {
  draggedNode: string | null;
  hoveredNode: string | null;
  selectedNodes: string[];
}

interface Visualization {
  setData: (data: GraphData) => void;
  applyLayout: (options: { type: string }) => void;
  getViewport: () => Viewport;
  zoomIn: () => void;
  zoomOut: () => void;
  selectNode: (nodeId: string) => void;
  getSelection: () => Selection;
  highlightPath: (path: PathResult) => void;
  exportSVG: () => string;
  startDrag: (nodeId: string) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  getInteractionState: () => InteractionState;
}

// ==================== Layout Algorithms ====================

export function forceDirectedLayout(
  graph: GraphData,
  options?: { iterations?: number }
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const iterations = options?.iterations ?? 50;

  // Initialize random positions
  for (const node of graph.nodes) {
    positions.set(node.id, {
      x: 400 + (Math.random() - 0.5) * 200,
      y: 300 + (Math.random() - 0.5) * 200,
    });
  }

  // Simulate force-directed layout
  for (let iter = 0; iter < iterations; iter++) {
    for (const node of graph.nodes) {
      const pos = positions.get(node.id)!;
      let fx = 0, fy = 0;

      // Repulsion from other nodes
      for (const other of graph.nodes) {
        if (other.id === node.id) continue;
        const opos = positions.get(other.id)!;
        const dx = pos.x - opos.x;
        const dy = pos.y - opos.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        fx += (dx / dist) * (100 / dist);
        fy += (dy / dist) * (100 / dist);
      }

      // Attraction along edges
      for (const edge of graph.edges) {
        let otherId: string | null = null;
        if (edge.source === node.id) otherId = edge.target;
        else if (edge.target === node.id) otherId = edge.source;
        if (otherId) {
          const opos = positions.get(otherId)!;
          const dx = opos.x - pos.x;
          const dy = opos.y - pos.y;
          fx += dx * 0.01;
          fy += dy * 0.01;
        }
      }

      positions.set(node.id, {
        x: pos.x + fx * 0.1,
        y: pos.y + fy * 0.1,
      });
    }
  }

  return positions;
}

export function hierarchicalLayout(graph: GraphData): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Build adjacency for topological ordering
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adj.get(edge.source)?.push(edge.target);
  }

  // Assign layers via BFS from roots
  const layers = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layers.set(id, 0);
    }
  }

  // If no root found, use first node
  if (queue.length === 0 && graph.nodes.length > 0) {
    queue.push(graph.nodes[0].id);
    layers.set(graph.nodes[0].id, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    for (const neighbor of (adj.get(current) || [])) {
      if (!layers.has(neighbor)) {
        layers.set(neighbor, currentLayer + 1);
        queue.push(neighbor);
      }
    }
  }

  // Assign positions to any unvisited nodes
  for (const node of graph.nodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, 0);
    }
  }

  // Group by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const layerCount = Math.max(...Array.from(layerGroups.keys()), 0) + 1;
  const ySpacing = 600 / Math.max(layerCount, 1);

  for (const [layer, ids] of layerGroups) {
    const xSpacing = 800 / (ids.length + 1);
    ids.forEach((id, index) => {
      positions.set(id, {
        x: xSpacing * (index + 1),
        y: ySpacing * layer + 50,
      });
    });
  }

  return positions;
}

export function circularLayout(
  graph: GraphData,
  options?: { radius?: number }
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const radius = options?.radius ?? 200;
  const centerX = 400;
  const centerY = 300;
  const n = graph.nodes.length;

  graph.nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / n;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  return positions;
}

export function gridLayout(
  graph: GraphData,
  options?: { columns?: number }
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const columns = options?.columns ?? Math.ceil(Math.sqrt(graph.nodes.length));
  const cellWidth = 800 / (columns + 1);
  const rows = Math.ceil(graph.nodes.length / columns);
  const cellHeight = 600 / (rows + 1);

  graph.nodes.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions.set(node.id, {
      x: cellWidth * (col + 1),
      y: cellHeight * (row + 1),
    });
  });

  return positions;
}

export function radialLayout(
  graph: GraphData,
  options?: { centerNode?: string }
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const centerX = 400;
  const centerY = 300;
  const centerNodeId = options?.centerNode ?? graph.nodes[0]?.id;

  // Place center node
  if (centerNodeId) {
    positions.set(centerNodeId, { x: centerX, y: centerY });
  }

  // BFS to determine layers from center
  const visited = new Set<string>();
  const layers = new Map<string, number>();

  if (centerNodeId) {
    visited.add(centerNodeId);
    layers.set(centerNodeId, 0);
  }

  // Build adjacency
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }

  const queue: string[] = centerNodeId ? [centerNodeId] : [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    for (const neighbor of (adj.get(current) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        layers.set(neighbor, currentLayer + 1);
        queue.push(neighbor);
      }
    }
  }

  // Assign positions to unvisited nodes
  let maxLayer = 0;
  for (const node of graph.nodes) {
    if (!layers.has(node.id)) {
      maxLayer = Math.max(maxLayer, ...Array.from(layers.values()), 0) + 1;
      layers.set(node.id, maxLayer);
    }
    maxLayer = Math.max(maxLayer, layers.get(node.id)!);
  }

  // Group by layer and assign positions
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const radiusStep = 150;
  for (const [layer, ids] of layerGroups) {
    if (layer === 0) continue; // Center node already placed
    const radius = radiusStep * layer;
    ids.forEach((id, index) => {
      const angle = (2 * Math.PI * index) / ids.length;
      positions.set(id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
  }

  return positions;
}

// ==================== Path Finding ====================

export function findShortestPath(graph: GraphData, startId: string, endId: string): PathResult | null {
  if (startId === endId) {
    return { nodes: [startId], edges: [], length: 0 };
  }

  // Build adjacency
  const adj = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push({ neighbor: edge.target, edgeId: edge.id });
    adj.get(edge.target)?.push({ neighbor: edge.source, edgeId: edge.id });
  }

  const visited = new Set<string>();
  const queue: Array<{ node: string; path: string[]; edgePath: string[] }> = [
    { node: startId, path: [startId], edgePath: [] },
  ];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { neighbor, edgeId } of (adj.get(current.node) || [])) {
      if (neighbor === endId) {
        return {
          nodes: [...current.path, neighbor],
          edges: [...current.edgePath, edgeId],
          length: current.edgePath.length + 1,
        };
      }
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

export function findAllPaths(
  graph: GraphData,
  startId: string,
  endId: string,
  maxDepth: number
): PathResult[] {
  const results: PathResult[] = [];

  // Build adjacency
  const adj = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push({ neighbor: edge.target, edgeId: edge.id });
    adj.get(edge.target)?.push({ neighbor: edge.source, edgeId: edge.id });
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

    for (const { neighbor, edgeId } of (adj.get(current) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        edgePath.push(edgeId);
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

// ==================== Graph Analysis ====================

export function calculateNodeDegrees(graph: GraphData): Map<string, DegreeInfo> {
  const degrees = new Map<string, DegreeInfo>();

  for (const node of graph.nodes) {
    degrees.set(node.id, { in: 0, out: 0, total: 0 });
  }

  for (const edge of graph.edges) {
    const sourceInfo = degrees.get(edge.source);
    const targetInfo = degrees.get(edge.target);
    if (sourceInfo) {
      sourceInfo.out++;
      sourceInfo.total++;
    }
    if (targetInfo) {
      targetInfo.in++;
      targetInfo.total++;
    }
  }

  return degrees;
}

export function findConnectedComponents(graph: GraphData): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  // Build undirected adjacency
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      const component: string[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);
        for (const neighbor of (adj.get(current) || [])) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }
  }

  return components;
}

export function calculateClusteringCoefficient(graph: GraphData, nodeId: string): number {
  // Build undirected adjacency
  const adj = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  const neighbors = adj.get(nodeId);
  if (!neighbors || neighbors.size < 2) {
    return 0;
  }

  const neighborArray = Array.from(neighbors);
  let triangles = 0;
  const possibleTriangles = neighborArray.length * (neighborArray.length - 1) / 2;

  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      if (adj.get(neighborArray[i])?.has(neighborArray[j])) {
        triangles++;
      }
    }
  }

  return possibleTriangles > 0 ? triangles / possibleTriangles : 0;
}

export function calculatePageRank(
  graph: GraphData,
  options?: { iterations?: number; dampingFactor?: number }
): Map<string, number> {
  const iterations = options?.iterations ?? 20;
  const dampingFactor = options?.dampingFactor ?? 0.85;
  const n = graph.nodes.length;

  if (n === 0) return new Map();

  const ranks = new Map<string, number>();
  const initialRank = 1 / n;

  // Initialize ranks
  for (const node of graph.nodes) {
    ranks.set(node.id, initialRank);
  }

  // Build outgoing adjacency
  const outgoing = new Map<string, string[]>();
  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.source)?.push(edge.target);
  }

  // Build incoming adjacency
  const incoming = new Map<string, string[]>();
  for (const node of graph.nodes) {
    incoming.set(node.id, []);
  }
  for (const edge of graph.edges) {
    incoming.get(edge.target)?.push(edge.source);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();

    for (const node of graph.nodes) {
      let sum = 0;
      for (const inNode of (incoming.get(node.id) || [])) {
        const outDegree = outgoing.get(inNode)?.length || 1;
        sum += (ranks.get(inNode) || 0) / outDegree;
      }
      newRanks.set(node.id, (1 - dampingFactor) / n + dampingFactor * sum);
    }

    for (const [id, rank] of newRanks) {
      ranks.set(id, rank);
    }
  }

  return ranks;
}

// ==================== Filtering and Search ====================

export function filterGraph(
  graph: GraphData,
  options: {
    nodeTypes?: string[];
    edgeTypes?: string[];
    properties?: Record<string, any>;
  }
): GraphData {
  let filteredNodes = [...graph.nodes];

  if (options.nodeTypes && options.nodeTypes.length > 0) {
    filteredNodes = filteredNodes.filter(n => options.nodeTypes!.includes(n.type));
  }

  if (options.properties) {
    filteredNodes = filteredNodes.filter(n => {
      for (const [key, value] of Object.entries(options.properties!)) {
        if (n.properties[key] !== value) return false;
      }
      return true;
    });
  }

  const nodeIds = new Set(filteredNodes.map(n => n.id));
  let filteredEdges = graph.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (options.edgeTypes && options.edgeTypes.length > 0) {
    filteredEdges = filteredEdges.filter(e => options.edgeTypes!.includes(e.type));
  }

  return { nodes: filteredNodes, edges: filteredEdges };
}

export function searchNodes(
  graph: GraphData,
  query: string
): Array<{ id: string; label: string; type: string; properties: Record<string, any> }> {
  const lowerQuery = query.toLowerCase();
  return graph.nodes.filter(n => {
    if (n.label.toLowerCase().includes(lowerQuery)) return true;
    if (n.id.toLowerCase().includes(lowerQuery)) return true;
    for (const val of Object.values(n.properties)) {
      if (String(val).toLowerCase().includes(lowerQuery)) return true;
    }
    return false;
  });
}

export function getNeighbors(
  graph: GraphData,
  nodeId: string,
  depth: number = 1
): GraphData {
  const visitedNodes = new Set<string>([nodeId]);
  let frontier = new Set<string>([nodeId]);

  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !visitedNodes.has(edge.target)) {
        nextFrontier.add(edge.target);
        visitedNodes.add(edge.target);
      }
      if (frontier.has(edge.target) && !visitedNodes.has(edge.source)) {
        nextFrontier.add(edge.source);
        visitedNodes.add(edge.source);
      }
    }
    frontier = nextFrontier;
  }

  const nodes = graph.nodes.filter(n => visitedNodes.has(n.id));
  const edges = graph.edges.filter(e => visitedNodes.has(e.source) && visitedNodes.has(e.target));

  return { nodes, edges };
}

// ==================== Visualization Component ====================

export function createGraphVisualization(data: GraphData): Visualization {
  let currentData = { ...data };
  let viewport: Viewport = { zoom: 1, panX: 0, panY: 0, width: 800, height: 600 };
  let selection: Selection = { nodes: [], edges: [] };
  let positions = new Map<string, Position>();
  let interactionState: InteractionState = {
    draggedNode: null,
    hoveredNode: null,
    selectedNodes: [],
  };

  return {
    setData(newData: GraphData) {
      currentData = { ...newData };
    },

    applyLayout(options: { type: string }) {
      switch (options.type) {
        case 'force':
          positions = forceDirectedLayout(currentData);
          break;
        case 'hierarchical':
          positions = hierarchicalLayout(currentData);
          break;
        case 'circular':
          positions = circularLayout(currentData);
          break;
        case 'grid':
          positions = gridLayout(currentData);
          break;
        case 'radial':
          positions = radialLayout(currentData);
          break;
        default:
          positions = forceDirectedLayout(currentData);
      }
    },

    getViewport(): Viewport {
      return { ...viewport };
    },

    zoomIn() {
      viewport = { ...viewport, zoom: viewport.zoom * 1.2 };
    },

    zoomOut() {
      viewport = { ...viewport, zoom: viewport.zoom / 1.2 };
    },

    selectNode(nodeId: string) {
      selection = {
        nodes: [nodeId],
        edges: currentData.edges
          .filter(e => e.source === nodeId || e.target === nodeId)
          .map(e => e.id),
      };
      interactionState = { ...interactionState, selectedNodes: [nodeId] };
    },

    getSelection(): Selection {
      return { ...selection };
    },

    highlightPath(path: PathResult) {
      selection = {
        nodes: [...path.nodes],
        edges: [...path.edges],
      };
    },

    exportSVG(): string {
      let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">\n';

      // Draw edges
      for (const edge of currentData.edges) {
        const from = positions.get(edge.source) || { x: 0, y: 0 };
        const to = positions.get(edge.target) || { x: 0, y: 0 };
        svg += `  <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#999" />\n`;
      }

      // Draw nodes
      for (const node of currentData.nodes) {
        const pos = positions.get(node.id) || { x: 0, y: 0 };
        svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#4A90D9" />\n`;
        svg += `  <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dy="5">${node.label}</text>\n`;
      }

      svg += '</svg>';
      return svg;
    },

    startDrag(nodeId: string) {
      interactionState = { ...interactionState, draggedNode: nodeId };
    },

    updateDrag(x: number, y: number) {
      if (interactionState.draggedNode) {
        positions.set(interactionState.draggedNode, { x, y });
      }
    },

    endDrag() {
      interactionState = { ...interactionState, draggedNode: null };
    },

    getInteractionState(): InteractionState {
      return { ...interactionState };
    },
  };
}
