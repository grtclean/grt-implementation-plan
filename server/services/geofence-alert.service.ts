/**
 * Geofence Alert Service
 * Provides point-in-geofence detection and transition tracking.
 */

export interface GeofenceConfig {
  id: number;
  name: string;
  type: 'rectangle' | 'circle' | 'polygon';
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  triggerType: 'enter' | 'exit' | 'both';
  alertLevel: 'info' | 'warning' | 'critical';
  notifyWebhook: boolean;
  notifyEmail: boolean;
  notifySystem: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Point {
  x: number;
  y: number;
}

export function isPointInCircle(
  point: Point,
  center: Point,
  radius: number
): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

export function isPointInRectangle(
  point: Point,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

export function isPointInGeofence(point: Point, config: GeofenceConfig): boolean {
  if (config.type === 'rectangle') {
    return isPointInRectangle(
      point,
      config.minX ?? 0,
      config.minY ?? 0,
      config.maxX ?? 0,
      config.maxY ?? 0
    );
  }
  if (config.type === 'circle') {
    return isPointInCircle(
      point,
      { x: config.centerX ?? 0, y: config.centerY ?? 0 },
      config.radius ?? 0
    );
  }
  return false;
}

export function checkGeofenceTransition(
  previousInside: boolean,
  currentInside: boolean,
  config: GeofenceConfig
): { triggered: boolean; type: 'enter' | 'exit' | null } {
  if (!previousInside && currentInside) {
    const triggered = config.triggerType === 'enter' || config.triggerType === 'both';
    return { triggered, type: 'enter' };
  }
  if (previousInside && !currentInside) {
    const triggered = config.triggerType === 'exit' || config.triggerType === 'both';
    return { triggered, type: 'exit' };
  }
  return { triggered: false, type: null };
}

export const PREDEFINED_GEOFENCES: GeofenceConfig[] = [
  {
    id: 1,
    name: '标定区',
    type: 'rectangle',
    minX: 20,
    minY: 0,
    maxX: 40,
    maxY: 15,
    triggerType: 'both',
    alertLevel: 'info',
    notifyWebhook: false,
    notifyEmail: false,
    notifySystem: true,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 2,
    name: '装配区',
    type: 'rectangle',
    minX: 0,
    minY: 0,
    maxX: 20,
    maxY: 15,
    triggerType: 'both',
    alertLevel: 'info',
    notifyWebhook: false,
    notifyEmail: false,
    notifySystem: true,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
