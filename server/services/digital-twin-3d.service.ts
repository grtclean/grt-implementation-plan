/**
 * Digital Twin 3D Visualization Service
 * Provides 3D math (vectors, quaternions), digital twin management, component hierarchy,
 * materials, sensors, state mapping, view control, animations, snapshots, and scene utilities.
 */

// ==================== Types ====================

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

interface Geometry {
  type: string;
  parameters: Record<string, unknown>;
}

interface Component {
  id: string;
  name: string;
  parentId: string | null;
  geometry: Geometry;
  materialId: string;
  transform: Transform;
  visible: boolean;
  children: string[];
  metadata: Record<string, unknown>;
}

interface Material {
  id: string;
  name: string;
  type: string;
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
}

interface Sensor {
  id: string;
  type: string;
  name: string;
  unit: string;
  value: number;
  range: { min: number; max: number };
  thresholds: { warning: number; critical: number };
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: number;
  history: Array<{ value: number; timestamp: number }>;
}

interface DigitalTwin {
  id: string;
  name: string;
  deviceType: string;
  description?: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  components: Map<string, Component>;
  materials: Map<string, Material>;
  sensors: Map<string, Sensor>;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

interface StateMappingRule {
  id: string;
  sensorId: string;
  targetComponentId: string;
  targetProperty: string;
  mappingType: string;
  inputRange: number[];
  outputRange: any[];
}

interface ViewState {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  zoom: number;
  selectedComponentId: string | null;
  highlightedComponents: Set<string>;
  showWireframe: boolean;
  showSensors: boolean;
  showLabels: boolean;
}

interface InteractionEvent3D {
  type: 'click' | 'double_click' | 'hover' | 'drag' | 'zoom' | 'rotate';
  targetId?: string;
  position: Vector3;
  screenPosition: { x: number; y: number };
  timestamp: number;
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean };
}

interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  loop: boolean;
  keyframes: Array<{ time: number; property: string; value: any }>;
}

interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  sensorValues: Record<string, number>;
  componentTransforms: Record<string, Transform>;
  viewState: ViewState;
}

interface SceneConfig {
  backgroundColor: string;
  ambientLightIntensity: number;
  directionalLightPosition: Vector3;
  gridVisible: boolean;
  axesVisible: boolean;
}

interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

// ==================== Constants ====================

export const DEFAULT_TRANSFORM: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  backgroundColor: '#1a1a2e',
  ambientLightIntensity: 0.5,
  directionalLightPosition: { x: 10, y: 20, z: 10 },
  gridVisible: true,
  axesVisible: true,
};

export const DEFAULT_VIEW_STATE: ViewState = {
  cameraPosition: { x: 5, y: 5, z: 5 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  zoom: 1,
  selectedComponentId: null,
  highlightedComponents: new Set(),
  showWireframe: false,
  showSensors: true,
  showLabels: true,
};

// ==================== Vector Operations ====================

export function addVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVector(v: Vector3, scalar: number): Vector3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVector(v: Vector3): Vector3 {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vectorDistance(a: Vector3, b: Vector3): number {
  return vectorLength(subtractVectors(a, b));
}

export function lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

// ==================== Quaternion Operations ====================

export function multiplyQuaternions(q1: Quaternion, q2: Quaternion): Quaternion {
  return {
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
  };
}

export function eulerToQuaternion(euler: Vector3): Quaternion {
  const cx = Math.cos(euler.x / 2);
  const sx = Math.sin(euler.x / 2);
  const cy = Math.cos(euler.y / 2);
  const sy = Math.sin(euler.y / 2);
  const cz = Math.cos(euler.z / 2);
  const sz = Math.sin(euler.z / 2);

  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}

export function quaternionToEuler(q: Quaternion): Vector3 {
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const x = Math.atan2(sinr_cosp, cosr_cosp);

  // Pitch (y-axis rotation)
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  let y: number;
  if (Math.abs(sinp) >= 1) {
    y = Math.sign(sinp) * Math.PI / 2;
  } else {
    y = Math.asin(sinp);
  }

  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const z = Math.atan2(siny_cosp, cosy_cosp);

  return { x, y, z };
}

export function slerpQuaternion(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  let cosHalfAngle = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;

  let q2adj = { ...q2 };
  if (cosHalfAngle < 0) {
    q2adj = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
    cosHalfAngle = -cosHalfAngle;
  }

  if (cosHalfAngle >= 1.0) {
    return { ...q1 };
  }

  const halfAngle = Math.acos(cosHalfAngle);
  const sinHalfAngle = Math.sqrt(1.0 - cosHalfAngle * cosHalfAngle);

  if (Math.abs(sinHalfAngle) < 0.001) {
    return {
      x: q1.x * 0.5 + q2adj.x * 0.5,
      y: q1.y * 0.5 + q2adj.y * 0.5,
      z: q1.z * 0.5 + q2adj.z * 0.5,
      w: q1.w * 0.5 + q2adj.w * 0.5,
    };
  }

  const ratioA = Math.sin((1 - t) * halfAngle) / sinHalfAngle;
  const ratioB = Math.sin(t * halfAngle) / sinHalfAngle;

  return {
    x: q1.x * ratioA + q2adj.x * ratioB,
    y: q1.y * ratioA + q2adj.y * ratioB,
    z: q1.z * ratioA + q2adj.z * ratioB,
    w: q1.w * ratioA + q2adj.w * ratioB,
  };
}

// ==================== Digital Twin Management ====================

export function createDigitalTwin(name: string, deviceType: string, description?: string): DigitalTwin {
  return {
    id: `twin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    deviceType,
    description,
    status: 'offline',
    components: new Map(),
    materials: new Map(),
    sensors: new Map(),
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function addComponent(
  twin: DigitalTwin,
  name: string,
  geometry: Geometry,
  materialId: string,
  parentId?: string | null,
  transformOverride?: Partial<Transform>
): { twin: DigitalTwin; component: Component } {
  const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const transform: Transform = {
    position: transformOverride?.position ?? { ...DEFAULT_TRANSFORM.position },
    rotation: transformOverride?.rotation ?? { ...DEFAULT_TRANSFORM.rotation },
    scale: transformOverride?.scale ?? { ...DEFAULT_TRANSFORM.scale },
  };

  const component: Component = {
    id,
    name,
    parentId: parentId ?? null,
    geometry,
    materialId,
    transform,
    visible: true,
    children: [],
    metadata: {},
  };

  const components = new Map(twin.components);
  components.set(id, component);

  // Update parent's children list
  if (parentId && components.has(parentId)) {
    const parent = components.get(parentId)!;
    components.set(parentId, { ...parent, children: [...parent.children, id] });
  }

  return {
    twin: { ...twin, components, updatedAt: Date.now() },
    component,
  };
}

export function removeComponent(twin: DigitalTwin, componentId: string): DigitalTwin {
  const components = new Map(twin.components);
  const component = components.get(componentId);

  if (component?.parentId && components.has(component.parentId)) {
    const parent = components.get(component.parentId)!;
    components.set(component.parentId, {
      ...parent,
      children: parent.children.filter(c => c !== componentId),
    });
  }

  components.delete(componentId);
  return { ...twin, components, updatedAt: Date.now() };
}

export function updateComponentTransform(
  twin: DigitalTwin,
  componentId: string,
  transformUpdate: Partial<Transform>
): DigitalTwin {
  const components = new Map(twin.components);
  const component = components.get(componentId);
  if (!component) return twin;

  components.set(componentId, {
    ...component,
    transform: {
      position: transformUpdate.position ?? component.transform.position,
      rotation: transformUpdate.rotation ?? component.transform.rotation,
      scale: transformUpdate.scale ?? component.transform.scale,
    },
  });

  return { ...twin, components, updatedAt: Date.now() };
}

export function setComponentVisibility(
  twin: DigitalTwin,
  componentId: string,
  visible: boolean
): DigitalTwin {
  const components = new Map(twin.components);
  const component = components.get(componentId);
  if (!component) return twin;

  components.set(componentId, { ...component, visible });
  return { ...twin, components, updatedAt: Date.now() };
}

// ==================== Material Management ====================

export function addMaterial(
  twin: DigitalTwin,
  name: string,
  type: string,
  color: string
): { twin: DigitalTwin; material: Material } {
  const id = `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const material: Material = {
    id,
    name,
    type,
    color,
    opacity: 1,
    metalness: type === 'metallic' ? 0.8 : 0,
    roughness: type === 'metallic' ? 0.2 : 0.5,
  };

  const materials = new Map(twin.materials);
  materials.set(id, material);

  return {
    twin: { ...twin, materials, updatedAt: Date.now() },
    material,
  };
}

export function updateMaterial(
  twin: DigitalTwin,
  materialId: string,
  updates: Partial<Material>
): DigitalTwin {
  const materials = new Map(twin.materials);
  const material = materials.get(materialId);
  if (!material) return twin;

  materials.set(materialId, { ...material, ...updates });
  return { ...twin, materials, updatedAt: Date.now() };
}

// ==================== Sensor Management ====================

export function addSensor(
  twin: DigitalTwin,
  type: string,
  name: string,
  unit: string,
  range: { min: number; max: number },
  thresholds: { warning: number; critical: number }
): { twin: DigitalTwin; sensor: Sensor } {
  const id = `sensor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sensor: Sensor = {
    id,
    type,
    name,
    unit,
    value: 0,
    range,
    thresholds,
    status: 'normal',
    lastUpdated: Date.now(),
    history: [],
  };

  const sensors = new Map(twin.sensors);
  sensors.set(id, sensor);

  return {
    twin: { ...twin, sensors, updatedAt: Date.now() },
    sensor,
  };
}

function determineSensorStatus(
  value: number,
  thresholds: { warning: number; critical: number }
): 'normal' | 'warning' | 'critical' {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

export function updateSensorValue(
  twin: DigitalTwin,
  sensorId: string,
  value: number
): DigitalTwin {
  const sensors = new Map(twin.sensors);
  const sensor = sensors.get(sensorId);
  if (!sensor) return twin;

  const status = determineSensorStatus(value, sensor.thresholds);
  const now = Date.now();
  sensors.set(sensorId, {
    ...sensor,
    value,
    status,
    lastUpdated: now,
    history: [...sensor.history, { value, timestamp: now }],
  });

  return { ...twin, sensors, updatedAt: now };
}

export function batchUpdateSensors(
  twin: DigitalTwin,
  updates: Array<{ sensorId: string; value: number }>
): DigitalTwin {
  let result = twin;
  for (const update of updates) {
    result = updateSensorValue(result, update.sensorId, update.value);
  }
  return result;
}

export function getSensorStatistics(twin: DigitalTwin): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let total = 0;

  for (const sensor of twin.sensors.values()) {
    total++;
    byType[sensor.type] = (byType[sensor.type] || 0) + 1;
    byStatus[sensor.status] = (byStatus[sensor.status] || 0) + 1;
  }

  return { total, byType, byStatus };
}

// ==================== State Mapping ====================

export function createStateMappingRule(
  sensorId: string,
  targetComponentId: string,
  targetProperty: string,
  mappingType: string,
  inputRange: number[],
  outputRange: any[]
): StateMappingRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sensorId,
    targetComponentId,
    targetProperty,
    mappingType,
    inputRange,
    outputRange,
  };
}

export function applyStateMapping(
  twin: DigitalTwin,
  rules: StateMappingRule[]
): DigitalTwin {
  let result = twin;
  for (const rule of rules) {
    const sensor = result.sensors.get(rule.sensorId);
    if (!sensor) continue;

    const t = (sensor.value - rule.inputRange[0]) / (rule.inputRange[1] - rule.inputRange[0]);
    const clampedT = Math.max(0, Math.min(1, t));

    // Apply mapping to component (simplified)
    // In a real implementation, this would modify the target property
    void clampedT;
  }
  return result;
}

// ==================== View Control ====================

export function createViewState(): ViewState {
  return {
    cameraPosition: { ...DEFAULT_VIEW_STATE.cameraPosition },
    cameraTarget: { ...DEFAULT_VIEW_STATE.cameraTarget },
    zoom: 1,
    selectedComponentId: null,
    highlightedComponents: new Set(),
    showWireframe: false,
    showSensors: true,
    showLabels: true,
  };
}

export function handleInteraction(
  viewState: ViewState,
  event: InteractionEvent3D,
  twin: DigitalTwin
): ViewState {
  switch (event.type) {
    case 'click':
      return {
        ...viewState,
        selectedComponentId: event.targetId ?? null,
      };
    case 'double_click':
      if (event.targetId) {
        return focusOnComponent(viewState, twin, event.targetId);
      }
      return viewState;
    case 'zoom':
      return {
        ...viewState,
        zoom: Math.max(0.1, Math.min(10, viewState.zoom + event.position.z * 0.1)),
      };
    default:
      return viewState;
  }
}

export function focusOnComponent(
  viewState: ViewState,
  twin: DigitalTwin,
  componentId: string
): ViewState {
  const component = twin.components.get(componentId);
  if (!component) return viewState;

  return {
    ...viewState,
    cameraTarget: { ...component.transform.position },
    selectedComponentId: componentId,
    zoom: 2,
  };
}

export function resetView(viewState: ViewState): ViewState {
  return {
    ...viewState,
    cameraPosition: { ...DEFAULT_VIEW_STATE.cameraPosition },
    cameraTarget: { ...DEFAULT_VIEW_STATE.cameraTarget },
    zoom: 1,
    selectedComponentId: null,
    highlightedComponents: new Set(),
  };
}

export function highlightComponents(
  viewState: ViewState,
  componentIds: string[]
): ViewState {
  const highlighted = new Set(viewState.highlightedComponents);
  for (const id of componentIds) {
    highlighted.add(id);
  }
  return { ...viewState, highlightedComponents: highlighted };
}

export function clearHighlights(viewState: ViewState): ViewState {
  return { ...viewState, highlightedComponents: new Set() };
}

// ==================== Animation System ====================

export function createAnimationClip(name: string, duration: number, loop: boolean = false): AnimationClip {
  return {
    id: `anim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    duration,
    loop,
    keyframes: [],
  };
}

export function addKeyframe(
  clip: AnimationClip,
  time: number,
  property: string,
  value: any
): AnimationClip {
  return {
    ...clip,
    keyframes: [...clip.keyframes, { time, property, value }].sort((a, b) => a.time - b.time),
  };
}

export function evaluateAnimation(clip: AnimationClip, time: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = new Set(clip.keyframes.map(kf => kf.property));

  for (const prop of properties) {
    const propKeyframes = clip.keyframes.filter(kf => kf.property === prop);
    if (propKeyframes.length === 0) continue;

    if (propKeyframes.length === 1) {
      result[prop] = propKeyframes[0].value;
      continue;
    }

    // Find surrounding keyframes
    let before = propKeyframes[0];
    let after = propKeyframes[propKeyframes.length - 1];

    for (let i = 0; i < propKeyframes.length - 1; i++) {
      if (propKeyframes[i].time <= time && propKeyframes[i + 1].time >= time) {
        before = propKeyframes[i];
        after = propKeyframes[i + 1];
        break;
      }
    }

    // Interpolate
    if (typeof before.value === 'number' && typeof after.value === 'number') {
      const t = after.time === before.time ? 0 : (time - before.time) / (after.time - before.time);
      result[prop] = before.value + (after.value - before.value) * t;
    } else if (typeof before.value === 'object' && before.value !== null) {
      // Vector interpolation
      const t = after.time === before.time ? 0 : (time - before.time) / (after.time - before.time);
      result[prop] = lerpVector(before.value, after.value, t);
    } else {
      result[prop] = time >= after.time ? after.value : before.value;
    }
  }

  return result;
}

// ==================== Snapshot Management ====================

export function createSnapshot(
  twin: DigitalTwin,
  viewState: ViewState,
  name: string
): Snapshot {
  const sensorValues: Record<string, number> = {};
  for (const [id, sensor] of twin.sensors) {
    sensorValues[id] = sensor.value;
  }

  const componentTransforms: Record<string, Transform> = {};
  for (const [id, comp] of twin.components) {
    componentTransforms[id] = { ...comp.transform };
  }

  return {
    id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    timestamp: Date.now(),
    sensorValues,
    componentTransforms,
    viewState: { ...viewState, highlightedComponents: new Set(viewState.highlightedComponents) },
  };
}

export function restoreSnapshot(
  twin: DigitalTwin,
  snapshot: Snapshot
): { twin: DigitalTwin; viewState: ViewState } {
  let result = twin;

  // Restore sensor values
  for (const [sensorId, value] of Object.entries(snapshot.sensorValues)) {
    result = updateSensorValue(result, sensorId, value);
  }

  // Restore component transforms
  for (const [compId, transform] of Object.entries(snapshot.componentTransforms)) {
    result = updateComponentTransform(result, compId, transform);
  }

  return { twin: result, viewState: snapshot.viewState };
}

// ==================== Utility Functions ====================

export function calculateBoundingBox(twin: DigitalTwin): BoundingBox {
  const min: Vector3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vector3 = { x: -Infinity, y: -Infinity, z: -Infinity };

  if (twin.components.size === 0) {
    return { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };
  }

  for (const comp of twin.components.values()) {
    const pos = comp.transform.position;
    const scale = comp.transform.scale;
    const halfSize = { x: scale.x / 2, y: scale.y / 2, z: scale.z / 2 };

    min.x = Math.min(min.x, pos.x - halfSize.x);
    min.y = Math.min(min.y, pos.y - halfSize.y);
    min.z = Math.min(min.z, pos.z - halfSize.z);
    max.x = Math.max(max.x, pos.x + halfSize.x);
    max.y = Math.max(max.y, pos.y + halfSize.y);
    max.z = Math.max(max.z, pos.z + halfSize.z);
  }

  return { min, max };
}

export function getComponentPath(twin: DigitalTwin, componentId: string): string[] {
  const path: string[] = [];
  let current = twin.components.get(componentId);

  while (current) {
    path.unshift(current.name);
    if (current.parentId) {
      current = twin.components.get(current.parentId);
    } else {
      break;
    }
  }

  return path;
}

export function getAllDescendants(twin: DigitalTwin, componentId: string): Component[] {
  const descendants: Component[] = [];
  const component = twin.components.get(componentId);
  if (!component) return descendants;

  const queue = [...component.children];
  while (queue.length > 0) {
    const childId = queue.shift()!;
    const child = twin.components.get(childId);
    if (child) {
      descendants.push(child);
      queue.push(...child.children);
    }
  }

  return descendants;
}

export function exportSceneData(twin: DigitalTwin): {
  id: string;
  name: string;
  deviceType: string;
  components: any[];
  materials: any[];
  sensors: any[];
} {
  return {
    id: twin.id,
    name: twin.name,
    deviceType: twin.deviceType,
    components: Array.from(twin.components.values()).map(c => ({
      ...c,
      children: [...c.children],
    })),
    materials: Array.from(twin.materials.values()),
    sensors: Array.from(twin.sensors.values()).map(s => ({
      ...s,
      history: [...s.history],
    })),
  };
}
