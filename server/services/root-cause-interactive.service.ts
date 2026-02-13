/**
 * Root Cause Interactive Exploration Service
 * Provides interaction state management, path tracing, animations, filtering, and keyboard shortcuts
 * for the causal graph interactive explorer.
 */

import type { CausalGraph, GraphNode, GraphEdge } from './root-cause-visualization.service';

// ==================== Types ====================

export interface InteractionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  expandedNodes: Set<string>;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  animationState: AnimationState;
  interactionHistory: InteractionEvent[];
}

export interface InteractionEvent {
  type: 'click' | 'double_click' | 'hover' | 'zoom' | 'pan' | 'context_menu';
  targetId?: string;
  targetType: 'node' | 'edge' | 'background';
  position: { x: number; y: number };
  timestamp: number;
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean };
}

export interface AnimationState {
  isPlaying: boolean;
  type: 'path_trace' | 'ripple' | 'none';
  currentStep: number;
  totalSteps: number;
  speed: number;
  data: any;
}

export interface PathTraceResult {
  path: string[];
  edges: string[];
  confidence: number;
  avgCorrelation: number;
  explanation: string;
}

interface FilterOptions {
  showRootCauses: boolean;
  showIntermediates: boolean;
  showAnomalies: boolean;
  showNormals: boolean;
  minCorrelation: number;
  maxDepth: number;
}

interface ContextMenuItem {
  label: string;
  action: string;
  icon?: string;
  disabled?: boolean;
}

interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
}

// ==================== Constants ====================

export const KEYBOARD_SHORTCUTS: Record<string, KeyboardShortcut> = {
  'f': { key: 'f', description: 'Fit view', action: 'fit_view' },
  'Escape': { key: 'Escape', description: 'Deselect', action: 'deselect' },
  '+': { key: '+', description: 'Zoom in', action: 'zoom_in' },
  '-': { key: '-', description: 'Zoom out', action: 'zoom_out' },
  '0': { key: '0', description: 'Reset zoom', action: 'reset_zoom' },
  'Space': { key: 'Space', description: 'Toggle animation', action: 'toggle_animation' },
  'ArrowLeft': { key: 'ArrowLeft', description: 'Previous step', action: 'prev_step' },
  'ArrowRight': { key: 'ArrowRight', description: 'Next step', action: 'next_step' },
};

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  showRootCauses: true,
  showIntermediates: true,
  showAnomalies: true,
  showNormals: true,
  minCorrelation: 0,
  maxDepth: Infinity,
};

// ==================== State Management ====================

export function createInitialState(): InteractionState {
  return {
    selectedNodeId: null,
    hoveredNodeId: null,
    expandedNodes: new Set<string>(),
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    animationState: {
      isPlaying: false,
      type: 'none',
      currentStep: 0,
      totalSteps: 0,
      speed: 500,
      data: null,
    },
    interactionHistory: [],
  };
}

export function handleInteractionEvent(
  state: InteractionState,
  event: InteractionEvent,
  graph: CausalGraph
): InteractionState {
  const newState = { ...state, interactionHistory: [...state.interactionHistory, event] };

  switch (event.type) {
    case 'click':
      if (event.targetType === 'node' && event.targetId) {
        return { ...newState, selectedNodeId: event.targetId };
      }
      if (event.targetType === 'background') {
        return { ...newState, selectedNodeId: null };
      }
      return newState;

    case 'hover':
      if (event.targetType === 'node' && event.targetId) {
        return { ...newState, hoveredNodeId: event.targetId };
      }
      return { ...newState, hoveredNodeId: null };

    case 'double_click':
      if (event.targetType === 'node' && event.targetId) {
        const expanded = new Set(state.expandedNodes);
        if (expanded.has(event.targetId)) {
          expanded.delete(event.targetId);
        } else {
          expanded.add(event.targetId);
        }
        return { ...newState, expandedNodes: expanded };
      }
      return newState;

    case 'zoom': {
      const delta = event.position.y > 0 ? 0.1 : -0.1;
      const newZoom = Math.max(0.1, Math.min(5, state.zoomLevel + delta));
      return { ...newState, zoomLevel: newZoom };
    }

    case 'pan':
      return {
        ...newState,
        panOffset: { x: event.position.x, y: event.position.y },
      };

    default:
      return newState;
  }
}

// ==================== Node Details ====================

export function getNodeDetails(
  graph: CausalGraph,
  nodeId: string
): {
  node: GraphNode;
  incomingEdges: GraphEdge[];
  outgoingEdges: GraphEdge[];
  statistics: { totalConnections: number; avgCorrelation: number };
  recommendations: string[];
} | null {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const incomingEdges = graph.edges.filter(e => e.target === nodeId);
  const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
  const allEdges = [...incomingEdges, ...outgoingEdges];
  const totalConnections = allEdges.length;
  const avgCorrelation =
    allEdges.length > 0
      ? allEdges.reduce((sum, e) => sum + e.correlation, 0) / allEdges.length
      : 0;

  const recommendations: string[] = [];
  if (node.type === 'root_cause') {
    recommendations.push('此节点为根因节点，建议优先排查');
  }
  if (node.type === 'anomaly') {
    recommendations.push('此节点存在异常，建议追溯上游根因');
  }
  if (avgCorrelation > 0.8) {
    recommendations.push('该节点关联度较高，需要重点关注');
  }
  if (outgoingEdges.length > 2) {
    recommendations.push('该节点影响范围较广，建议深入分析');
  }

  return {
    node,
    incomingEdges,
    outgoingEdges,
    statistics: { totalConnections, avgCorrelation },
    recommendations,
  };
}

// ==================== Path Tracing ====================

export function traceCausalPath(
  graph: CausalGraph,
  sourceId: string,
  targetId: string
): PathTraceResult | null {
  // BFS to find shortest path from source to target following directed edges
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[]; edges: string[] }> = [
    { nodeId: sourceId, path: [sourceId], edges: [] },
  ];
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.nodeId === targetId) {
      // Calculate confidence and correlation
      const pathEdges = current.edges.map(eid => graph.edges.find(e => e.id === eid)!);
      const correlations = pathEdges.map(e => e.correlation);
      const avgCorrelation =
        correlations.length > 0
          ? correlations.reduce((s, c) => s + c, 0) / correlations.length
          : 0;
      const confidence = correlations.length > 0
        ? correlations.reduce((product, c) => product * c, 1)
        : 0;

      const sourceNode = graph.nodes.find(n => n.id === sourceId);
      const targetNode = graph.nodes.find(n => n.id === targetId);
      const explanation = `从 ${sourceNode?.label ?? sourceId} 到 ${targetNode?.label ?? targetId} 的因果路径，经过 ${current.path.length - 2} 个中间节点`;

      return {
        path: current.path,
        edges: current.edges,
        confidence,
        avgCorrelation,
        explanation,
      };
    }

    const outgoing = graph.edges.filter(e => e.source === current.nodeId);
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push({
          nodeId: edge.target,
          path: [...current.path, edge.target],
          edges: [...current.edges, edge.id],
        });
      }
    }
  }

  return null;
}

export function findAllPaths(
  graph: CausalGraph,
  sourceId: string,
  targetId: string,
  maxDepth: number = 10
): PathTraceResult[] {
  const results: PathTraceResult[] = [];

  function dfs(nodeId: string, path: string[], edges: string[], depth: number) {
    if (depth > maxDepth) return;
    if (nodeId === targetId && path.length > 1) {
      const pathEdges = edges.map(eid => graph.edges.find(e => e.id === eid)!);
      const correlations = pathEdges.map(e => e.correlation);
      const avgCorrelation =
        correlations.length > 0
          ? correlations.reduce((s, c) => s + c, 0) / correlations.length
          : 0;
      const confidence = correlations.reduce((p, c) => p * c, 1);
      const sourceNode = graph.nodes.find(n => n.id === sourceId);
      const targetNode = graph.nodes.find(n => n.id === targetId);

      results.push({
        path: [...path],
        edges: [...edges],
        confidence,
        avgCorrelation,
        explanation: `路径: ${sourceNode?.label} -> ${targetNode?.label}`,
      });
      return;
    }

    const outgoing = graph.edges.filter(e => e.source === nodeId);
    for (const edge of outgoing) {
      if (!path.includes(edge.target)) {
        path.push(edge.target);
        edges.push(edge.id);
        dfs(edge.target, path, edges, depth + 1);
        path.pop();
        edges.pop();
      }
    }
  }

  dfs(sourceId, [sourceId], [], 0);
  return results;
}

// ==================== Animation System ====================

export function createPathTraceAnimation(
  graph: CausalGraph,
  path: string[],
  speed: number = 500
): AnimationState {
  return {
    isPlaying: false,
    type: 'path_trace',
    currentStep: 0,
    totalSteps: path.length,
    speed,
    data: { path, graph },
  };
}

export function createRippleAnimation(
  graph: CausalGraph,
  originNodeId: string,
  speed: number = 300
): AnimationState {
  // Calculate ripple layers via BFS from origin
  const visited = new Set<string>([originNodeId]);
  const layers: string[][] = [[originNodeId]];
  let currentLayer = [originNodeId];

  while (currentLayer.length > 0) {
    const nextLayer: string[] = [];
    for (const nodeId of currentLayer) {
      const outgoing = graph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          nextLayer.push(edge.target);
        }
      }
    }
    if (nextLayer.length > 0) {
      layers.push(nextLayer);
    }
    currentLayer = nextLayer;
  }

  return {
    isPlaying: false,
    type: 'ripple',
    currentStep: 0,
    totalSteps: layers.length,
    speed,
    data: { layers, originNodeId, graph },
  };
}

export function getAnimationFrame(
  graph: CausalGraph,
  animation: AnimationState
): {
  step: number;
  highlightedNodes: string[];
  highlightedEdges: string[];
  progress: number;
} {
  const step = animation.currentStep;
  const progress = animation.totalSteps > 0 ? step / animation.totalSteps : 0;
  let highlightedNodes: string[] = [];
  let highlightedEdges: string[] = [];

  if (animation.type === 'path_trace' && animation.data?.path) {
    const path: string[] = animation.data.path;
    highlightedNodes = path.slice(0, step + 1);
    for (let i = 0; i < step && i < path.length - 1; i++) {
      const edge = graph.edges.find(e => e.source === path[i] && e.target === path[i + 1]);
      if (edge) highlightedEdges.push(edge.id);
    }
  } else if (animation.type === 'ripple' && animation.data?.layers) {
    const layers: string[][] = animation.data.layers;
    for (let i = 0; i <= step && i < layers.length; i++) {
      highlightedNodes.push(...layers[i]);
    }
  }

  return { step, highlightedNodes, highlightedEdges, progress };
}

export function advanceAnimation(animation: AnimationState): AnimationState {
  const nextStep = animation.currentStep + 1;
  if (nextStep >= animation.totalSteps) {
    return { ...animation, currentStep: nextStep, isPlaying: false };
  }
  return { ...animation, currentStep: nextStep };
}

export function playAnimation(animation: AnimationState): AnimationState {
  return { ...animation, isPlaying: true };
}

export function pauseAnimation(animation: AnimationState): AnimationState {
  return { ...animation, isPlaying: false };
}

export function resetAnimation(animation: AnimationState): AnimationState {
  return { ...animation, currentStep: 0, isPlaying: false };
}

// ==================== Filters ====================

export function applyFilters(graph: CausalGraph, filters: FilterOptions): CausalGraph {
  let filteredNodes = [...graph.nodes];

  if (!filters.showRootCauses) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'root_cause');
  }
  if (!filters.showIntermediates) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'intermediate');
  }
  if (!filters.showAnomalies) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'anomaly');
  }
  if (!filters.showNormals) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'normal');
  }

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  let filteredEdges = graph.edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  if (filters.minCorrelation > 0) {
    filteredEdges = filteredEdges.filter(e => e.correlation >= filters.minCorrelation);
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    statistics: graph.statistics,
  };
}

// ==================== Context Menu ====================

export function getContextMenu(
  graph: CausalGraph,
  nodeId: string | null,
  edgeId: string | null
): ContextMenuItem[] {
  if (nodeId) {
    return [
      { label: '查看详情', action: 'view_details' },
      { label: '追溯上游', action: 'trace_upstream' },
      { label: '追溯下游', action: 'trace_downstream' },
      { label: '展开/折叠', action: 'toggle_expand' },
      { label: '高亮关联', action: 'highlight_related' },
      { label: '隐藏节点', action: 'hide_node' },
    ];
  }

  if (edgeId) {
    return [
      { label: '查看边详情', action: 'view_edge_details' },
      { label: '追溯路径', action: 'trace_path' },
    ];
  }

  // Background context menu
  return [
    { label: '适应视图', action: 'fit_view' },
    { label: '重置缩放', action: 'reset_zoom' },
    { label: '显示全部', action: 'show_all' },
    { label: '导出', action: 'export' },
  ];
}

// ==================== Keyboard Shortcuts ====================

export function handleKeyboardEvent(
  state: InteractionState,
  key: string,
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean }
): { state: InteractionState; action: string | null } {
  const shortcut = KEYBOARD_SHORTCUTS[key];
  if (!shortcut) {
    return { state, action: null };
  }

  switch (shortcut.action) {
    case 'zoom_in': {
      const newZoom = Math.min(5, state.zoomLevel + 0.1);
      return { state: { ...state, zoomLevel: newZoom }, action: 'zoom_in' };
    }
    case 'zoom_out': {
      const newZoom = Math.max(0.1, state.zoomLevel - 0.1);
      return { state: { ...state, zoomLevel: newZoom }, action: 'zoom_out' };
    }
    case 'reset_zoom':
      return { state: { ...state, zoomLevel: 1 }, action: 'reset_zoom' };

    case 'deselect':
      return { state: { ...state, selectedNodeId: null, hoveredNodeId: null }, action: 'deselect' };

    case 'toggle_animation': {
      const anim = state.animationState;
      return {
        state: { ...state, animationState: { ...anim, isPlaying: !anim.isPlaying } },
        action: 'toggle_animation',
      };
    }

    case 'fit_view':
      return { state: { ...state, zoomLevel: 1, panOffset: { x: 0, y: 0 } }, action: 'fit_view' };

    default:
      return { state, action: shortcut.action };
  }
}
