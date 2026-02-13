/**
 * Game Visualization Service
 * Game trees, payoff matrices, simulations, equilibrium annotations, SVG export.
 */

// ==================== Types ====================

interface GameTreeNode {
  id: string;
  type: 'decision' | 'terminal' | 'chance';
  player?: string;
  label?: string;
  payoffs?: number[];
  children: Map<string, GameTreeNode>;
  position: { x: number; y: number };
  highlighted?: boolean;
}

interface GameTree {
  name: string;
  players: string[];
  root: GameTreeNode;
  nodes: Map<string, GameTreeNode>;
}

interface PayoffMatrix {
  players: string[];
  strategies: Map<string, string[]>;
  payoffs: Map<string, number[]>;
  cellStyles: Map<string, Record<string, string>>;
  highlights: Array<{ type: string; cells: string[]; label: string }>;
}

interface Simulation {
  currentNodeId: string;
  path: string[];
  strategies: Map<string, string>;
  isComplete: boolean;
}

interface EquilibriumAnnotation {
  type: string;
  strategies: Map<string, string | Map<string, number>>;
  payoffs: number[];
  position: { x: number; y: number };
}

interface VisualizationConfig {
  width: number;
  height: number;
  nodeRadius: number;
  levelGap: number;
  siblingGap: number;
  fontSize: number;
  colors: Record<string, string>;
}

interface SVGExport {
  svg: string;
  width: number;
  height: number;
}

interface TreeStats {
  nodeCount: number;
  depth: number;
  terminalNodes: number;
  decisionNodes: number;
}

// ==================== Game Tree ====================

let _nodeCounter = 0;

function generateNodeId(): string {
  _nodeCounter++;
  return `node_${Date.now()}_${_nodeCounter}`;
}

export function createGameTree(name: string, players: string[]): GameTree {
  const rootId = generateNodeId();
  const root: GameTreeNode = {
    id: rootId,
    type: 'decision',
    player: players[0],
    label: players[0],
    children: new Map(),
    position: { x: 0, y: 0 },
  };
  const nodes = new Map<string, GameTreeNode>();
  nodes.set(rootId, root);
  return { name, players, root, nodes };
}

export function addNode(
  tree: GameTree,
  parentId: string,
  edgeLabel: string,
  nodeConfig: { type: string; player?: string; label?: string; payoffs?: number[] }
): GameTreeNode {
  const parent = tree.nodes.get(parentId);
  if (!parent) throw new Error(`Parent node ${parentId} not found`);

  const newNode: GameTreeNode = {
    id: generateNodeId(),
    type: nodeConfig.type as 'decision' | 'terminal' | 'chance',
    player: nodeConfig.player,
    label: nodeConfig.label,
    payoffs: nodeConfig.payoffs,
    children: new Map(),
    position: { x: 0, y: 0 },
  };

  parent.children.set(edgeLabel, newNode);
  tree.nodes.set(newNode.id, newNode);
  return newNode;
}

export function calculateLayout(tree: GameTree): void {
  let xOffset = 0;
  const levelGap = 80;

  function layoutNode(node: GameTreeNode, depth: number): void {
    if (node.children.size === 0) {
      node.position = { x: xOffset, y: depth * levelGap };
      xOffset += 60;
      return;
    }

    for (const child of node.children.values()) {
      layoutNode(child, depth + 1);
    }

    const childPositions = Array.from(node.children.values()).map(c => c.position.x);
    const minX = Math.min(...childPositions);
    const maxX = Math.max(...childPositions);
    node.position = { x: (minX + maxX) / 2, y: depth * levelGap };
  }

  layoutNode(tree.root, 0);
}

export function getTreeStats(tree: GameTree): TreeStats {
  let depth = 0;
  let terminalNodes = 0;
  let decisionNodes = 0;

  function traverse(node: GameTreeNode, d: number): void {
    if (d > depth) depth = d;
    if (node.type === 'terminal' || node.children.size === 0) terminalNodes++;
    if (node.type === 'decision') decisionNodes++;
    for (const child of node.children.values()) {
      traverse(child, d + 1);
    }
  }

  traverse(tree.root, 0);

  return {
    nodeCount: tree.nodes.size,
    depth,
    terminalNodes,
    decisionNodes,
  };
}

// ==================== Payoff Matrix ====================

export function createPayoffMatrix(
  players: string[],
  strategies: Map<string, string[]>,
  payoffs: Map<string, number[]>
): PayoffMatrix {
  return {
    players,
    strategies,
    payoffs,
    cellStyles: new Map(),
    highlights: [],
  };
}

export function setCellStyle(matrix: PayoffMatrix, cellKey: string, style: Record<string, string>): void {
  matrix.cellStyles.set(cellKey, { ...(matrix.cellStyles.get(cellKey) || {}), ...style });
}

export function addMatrixHighlight(matrix: PayoffMatrix, type: string, cells: string[], label: string): void {
  matrix.highlights.push({ type, cells, label });
}

export function clearMatrixHighlights(matrix: PayoffMatrix): void {
  matrix.highlights.length = 0;
}

export function generateMatrixHTML(matrix: PayoffMatrix): string {
  const player1 = matrix.players[0];
  const player2 = matrix.players[1];
  const strats1 = matrix.strategies.get(player1) || [];
  const strats2 = matrix.strategies.get(player2) || [];

  let html = '<table border="1">\n';
  html += `<tr><th></th>`;
  for (const s2 of strats2) {
    html += `<th>${s2}</th>`;
  }
  html += '</tr>\n';

  for (const s1 of strats1) {
    html += `<tr><th>${s1}</th>`;
    for (const s2 of strats2) {
      const key = `${s1}-${s2}`;
      const payoff = matrix.payoffs.get(key);
      const value = payoff ? payoff.join(', ') : '-';
      html += `<td>${value}</td>`;
    }
    html += '</tr>\n';
  }

  html += '</table>';
  return html;
}

// ==================== Simulation ====================

export function createSimulation(tree: GameTree, strategies: Map<string, string>): Simulation {
  return {
    currentNodeId: tree.root.id,
    path: [tree.root.id],
    strategies,
    isComplete: false,
  };
}

export function stepSimulation(simulation: Simulation, tree: GameTree): GameTreeNode | null {
  const currentNode = tree.nodes.get(simulation.currentNodeId);
  if (!currentNode || currentNode.children.size === 0) {
    simulation.isComplete = true;
    return null;
  }

  const strategy = simulation.strategies.get(currentNode.player || '');
  let nextNode: GameTreeNode | null = null;

  if (strategy && currentNode.children.has(strategy)) {
    nextNode = currentNode.children.get(strategy) || null;
  } else {
    // Pick first child if strategy not found
    nextNode = currentNode.children.values().next().value || null;
  }

  if (nextNode) {
    simulation.currentNodeId = nextNode.id;
    simulation.path.push(nextNode.id);
  } else {
    simulation.isComplete = true;
  }

  return nextNode;
}

export function runFullSimulation(simulation: Simulation, tree: GameTree): GameTreeNode[] {
  const visited: GameTreeNode[] = [];
  let maxSteps = 100;
  while (!simulation.isComplete && maxSteps > 0) {
    const node = stepSimulation(simulation, tree);
    if (node) visited.push(node);
    maxSteps--;
  }
  return visited;
}

// ==================== Equilibrium Annotations ====================

export function createEquilibriumAnnotation(
  type: string,
  strategies: Map<string, string | Map<string, number>>,
  payoffs: number[],
  position: { x: number; y: number }
): EquilibriumAnnotation {
  return { type, strategies, payoffs, position };
}

export function annotateEquilibria(tree: GameTree, equilibriumNodeIds: string[]): void {
  for (const nodeId of equilibriumNodeIds) {
    const node = tree.nodes.get(nodeId);
    if (node) {
      node.highlighted = true;
    }
  }
}

// ==================== Path Highlighting ====================

export function highlightPath(tree: GameTree, nodeIds: string[]): void {
  for (const nodeId of nodeIds) {
    const node = tree.nodes.get(nodeId);
    if (node) {
      node.highlighted = true;
    }
  }
}

// ==================== SVG Export ====================

export function exportToSVG(tree: GameTree, config: VisualizationConfig): SVGExport {
  const width = config.width || 800;
  const height = config.height || 600;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="white"/>`;

  for (const node of tree.nodes.values()) {
    const x = node.position.x + width / 2;
    const y = node.position.y + 50;
    svg += `<circle cx="${x}" cy="${y}" r="${config.nodeRadius || 20}" fill="${node.highlighted ? '#ff0000' : '#4488ff'}" stroke="#333"/>`;
    if (node.label) {
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${config.fontSize || 12}">${node.label}</text>`;
    }
  }

  svg += '</svg>';
  return { svg, width, height };
}

// ==================== Config ====================

export function getDefaultVisualizationConfig(): VisualizationConfig {
  return {
    width: 800,
    height: 600,
    nodeRadius: 20,
    levelGap: 80,
    siblingGap: 60,
    fontSize: 12,
    colors: {
      background: '#ffffff',
      node: '#4488ff',
      edge: '#333333',
      highlight: '#ff0000',
      text: '#000000',
    },
  };
}
