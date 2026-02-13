/**
 * Geofence Visual Editor Service
 * Provides geofence creation, validation, area calculation, and point-in-geofence detection.
 */

interface Point {
  x: number;
  y: number;
}

export interface Geofence {
  id: string;
  name: string;
  category: string;
  type: 'rectangle' | 'polygon' | 'circle';
  points?: Point[];
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  alertLevel: string;
  triggerType: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

let _idCounter = 0;

export function generateGeofenceId(): string {
  _idCounter++;
  return `gf_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRectangleGeofence(
  topLeft: Point,
  bottomRight: Point,
  name: string,
  category: string
): Geofence {
  return {
    id: generateGeofenceId(),
    name,
    category,
    type: 'rectangle',
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
    points: [
      { x: topLeft.x, y: topLeft.y },
      { x: bottomRight.x, y: topLeft.y },
      { x: bottomRight.x, y: bottomRight.y },
      { x: topLeft.x, y: bottomRight.y },
    ],
    alertLevel: 'info',
    triggerType: 'both',
    color: '#22c55e',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createPolygonGeofence(
  points: Point[],
  name: string,
  category: string
): Geofence {
  return {
    id: generateGeofenceId(),
    name,
    category,
    type: 'polygon',
    points,
    alertLevel: 'info',
    triggerType: 'both',
    color: '#3b82f6',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function validateGeofence(geofence: Geofence): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!geofence.name) errors.push('Name is required');
  if (geofence.type === 'polygon' && (!geofence.points || geofence.points.length < 3)) {
    errors.push('Polygon requires at least 3 points');
  }
  if (geofence.type === 'rectangle') {
    if (geofence.points && geofence.points.length < 4) {
      errors.push('Rectangle requires 4 points');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function calculateGeofenceArea(geofence: Geofence): number {
  if (geofence.type === 'rectangle' && geofence.minX !== undefined && geofence.maxX !== undefined && geofence.minY !== undefined && geofence.maxY !== undefined) {
    return Math.abs(geofence.maxX - geofence.minX) * Math.abs(geofence.maxY - geofence.minY);
  }
  if (geofence.type === 'polygon' && geofence.points && geofence.points.length >= 3) {
    // Shoelace formula
    let area = 0;
    const pts = geofence.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area / 2);
  }
  return 0;
}

export function isPointInGeofence(point: Point, geofence: Geofence): boolean {
  if (geofence.type === 'rectangle') {
    return (
      point.x >= (geofence.minX ?? 0) &&
      point.x <= (geofence.maxX ?? 0) &&
      point.y >= (geofence.minY ?? 0) &&
      point.y <= (geofence.maxY ?? 0)
    );
  }
  if (geofence.type === 'polygon' && geofence.points && geofence.points.length >= 3) {
    // Ray casting algorithm
    const pts = geofence.points;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if (
        pts[i].y > point.y !== pts[j].y > point.y &&
        point.x < ((pts[j].x - pts[i].x) * (point.y - pts[i].y)) / (pts[j].y - pts[i].y) + pts[i].x
      ) {
        inside = !inside;
      }
    }
    return inside;
  }
  return false;
}
