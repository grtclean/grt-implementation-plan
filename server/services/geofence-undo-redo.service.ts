/**
 * Geofence Undo/Redo Service
 * Provides undo/redo history management and geofence template library.
 */

export interface GeofenceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  shape: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultRadius?: number;
  defaultVertices?: Array<{ x: number; y: number }>;
  alertLevel: string;
  triggerType: string;
  color: string;
  isBuiltIn?: boolean;
  usageCount?: number;
  createdAt: number;
  updatedAt: number;
}

interface GeofenceOperation {
  type: 'add' | 'remove' | 'modify';
  geofence: any;
  previousState?: any;
}

export interface UndoRedoHistory {
  undoStack: GeofenceOperation[];
  redoStack: GeofenceOperation[];
  maxHistorySize: number;
}

export function createUndoRedoHistory(maxSize: number = 50): UndoRedoHistory {
  return {
    undoStack: [],
    redoStack: [],
    maxHistorySize: maxSize,
  };
}

export function recordOperation(
  history: UndoRedoHistory,
  operation: GeofenceOperation
): UndoRedoHistory {
  const newUndoStack = [...history.undoStack, operation];
  if (newUndoStack.length > history.maxHistorySize) {
    newUndoStack.shift();
  }
  return {
    ...history,
    undoStack: newUndoStack,
    redoStack: [], // Clear redo stack on new operation
  };
}

export function undoOperation(history: UndoRedoHistory): {
  operation: GeofenceOperation | null;
  history: UndoRedoHistory;
} {
  if (history.undoStack.length === 0) {
    return { operation: null, history };
  }
  const newUndoStack = [...history.undoStack];
  const operation = newUndoStack.pop()!;
  return {
    operation,
    history: {
      ...history,
      undoStack: newUndoStack,
      redoStack: [...history.redoStack, operation],
    },
  };
}

export function redoOperation(history: UndoRedoHistory): {
  operation: GeofenceOperation | null;
  history: UndoRedoHistory;
} {
  if (history.redoStack.length === 0) {
    return { operation: null, history };
  }
  const newRedoStack = [...history.redoStack];
  const operation = newRedoStack.pop()!;
  return {
    operation,
    history: {
      ...history,
      undoStack: [...history.undoStack, operation],
      redoStack: newRedoStack,
    },
  };
}

export function canUndo(history: UndoRedoHistory): boolean {
  return history.undoStack.length > 0;
}

export function canRedo(history: UndoRedoHistory): boolean {
  return history.redoStack.length > 0;
}

export const BUILT_IN_TEMPLATES: GeofenceTemplate[] = [
  {
    id: 'tpl_assembly',
    name: '装配区围栏',
    description: '标准装配区域围栏模板',
    category: 'assembly',
    shape: 'rectangle',
    defaultWidth: 10,
    defaultHeight: 8,
    alertLevel: 'info',
    triggerType: 'both',
    color: '#22c55e',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_safety',
    name: '安全区围栏',
    description: '安全隔离区域围栏模板',
    category: 'safety',
    shape: 'circle',
    defaultRadius: 5,
    alertLevel: 'critical',
    triggerType: 'enter',
    color: '#ef4444',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_calibration',
    name: '标定区围栏',
    description: '标定作业区域围栏模板',
    category: 'calibration',
    shape: 'rectangle',
    defaultWidth: 8,
    defaultHeight: 6,
    alertLevel: 'warning',
    triggerType: 'both',
    color: '#f59e0b',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function getAllTemplates(): GeofenceTemplate[] {
  return [...BUILT_IN_TEMPLATES];
}

export function applyTemplate(
  template: GeofenceTemplate,
  position: { x: number; y: number }
): { name: string; x: number; y: number; width?: number; height?: number; radius?: number } {
  return {
    name: template.name,
    x: position.x,
    y: position.y,
    width: template.defaultWidth,
    height: template.defaultHeight,
    radius: template.defaultRadius,
  };
}
