/**
 * UWB定位服务
 * 用于工厂车间的人员和设备定位
 */

// 位置坐标
export interface Position {
  x: number;
  y: number;
  z?: number;
  timestamp: Date;
}

// 车间区域定义
export interface WorkshopZone {
  id: string;
  name: string;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  type: 'production' | 'storage' | 'office' | 'restricted' | 'common';
  description?: string;
}

// UWB锚点定义
export interface UWBAnchor {
  id: string;
  name: string;
  position: Position;
  status: 'online' | 'offline' | 'maintenance';
}

// UWB标签定义
export interface UWBTag {
  id: string;
  agentUnitId?: string;
  agentUnitName?: string;
  currentPosition?: Position;
  currentZone?: string;
  status: 'active' | 'inactive' | 'lost';
  batteryLevel?: number;
}

// 位置历史记录
export interface PositionHistory {
  tagId: string;
  position: Position;
  zone?: string;
  timestamp: Date;
}

// 车间区域配置
export const WORKSHOP_ZONES: WorkshopZone[] = [
  {
    id: 'zone-production-1',
    name: '生产区1',
    bounds: { minX: 0, maxX: 50, minY: 0, maxY: 30 },
    type: 'production',
    description: '主生产线区域',
  },
  {
    id: 'zone-production-2',
    name: '生产区2',
    bounds: { minX: 50, maxX: 100, minY: 0, maxY: 30 },
    type: 'production',
    description: '辅助生产线区域',
  },
  {
    id: 'zone-storage',
    name: '仓储区',
    bounds: { minX: 0, maxX: 30, minY: 30, maxY: 50 },
    type: 'storage',
    description: '原材料和成品仓库',
  },
  {
    id: 'zone-office',
    name: '办公区',
    bounds: { minX: 30, maxX: 60, minY: 30, maxY: 50 },
    type: 'office',
    description: '车间办公室',
  },
  {
    id: 'zone-restricted',
    name: '限制区',
    bounds: { minX: 60, maxX: 100, minY: 30, maxY: 50 },
    type: 'restricted',
    description: '高危设备区域，需要特殊权限',
  },
];

// UWB锚点配置
export const UWB_ANCHORS: UWBAnchor[] = [
  { id: 'anchor-1', name: '锚点A1', position: { x: 0, y: 0, timestamp: new Date() }, status: 'online' },
  { id: 'anchor-2', name: '锚点A2', position: { x: 100, y: 0, timestamp: new Date() }, status: 'online' },
  { id: 'anchor-3', name: '锚点A3', position: { x: 0, y: 50, timestamp: new Date() }, status: 'online' },
  { id: 'anchor-4', name: '锚点A4', position: { x: 100, y: 50, timestamp: new Date() }, status: 'online' },
  { id: 'anchor-5', name: '锚点A5', position: { x: 50, y: 25, timestamp: new Date() }, status: 'online' },
];

// 内存存储（实际应用中应使用数据库）
const tagStore: Map<string, UWBTag> = new Map();
const positionHistoryStore: PositionHistory[] = [];

/**
 * 判断位置所在区域
 */
export function determineZone(position: Position): string | null {
  for (const zone of WORKSHOP_ZONES) {
    if (
      position.x >= zone.bounds.minX &&
      position.x <= zone.bounds.maxX &&
      position.y >= zone.bounds.minY &&
      position.y <= zone.bounds.maxY
    ) {
      return zone.id;
    }
  }
  return null;
}

/**
 * 绑定UWB标签到代理单元
 */
export function bindUWBTag(tagId: string, agentUnitId: string, agentUnitName: string): UWBTag {
  const tag: UWBTag = {
    id: tagId,
    agentUnitId,
    agentUnitName,
    status: 'active',
    batteryLevel: 100,
  };
  tagStore.set(tagId, tag);
  return tag;
}

/**
 * 解绑UWB标签
 */
export function unbindUWBTag(tagId: string): boolean {
  const tag = tagStore.get(tagId);
  if (tag) {
    tag.agentUnitId = undefined;
    tag.agentUnitName = undefined;
    tag.status = 'inactive';
    return true;
  }
  return false;
}

/**
 * 获取所有UWB标签
 */
export function getAllUWBTags(): UWBTag[] {
  return Array.from(tagStore.values());
}

/**
 * 获取代理单元位置
 */
export function getAgentUnitPosition(agentUnitId: string): {
  position: Position | null;
  zone: WorkshopZone | null;
  tag: UWBTag | null;
} {
  for (const tag of Array.from(tagStore.values())) {
    if (tag.agentUnitId === agentUnitId) {
      const zone = tag.currentZone 
        ? WORKSHOP_ZONES.find(z => z.id === tag.currentZone) || null
        : null;
      return {
        position: tag.currentPosition || null,
        zone,
        tag,
      };
    }
  }
  return { position: null, zone: null, tag: null };
}

/**
 * 更新标签位置
 */
export function updateTagPosition(tagId: string, position: Position): UWBTag | null {
  const tag = tagStore.get(tagId);
  if (!tag) return null;
  
  tag.currentPosition = position;
  tag.currentZone = determineZone(position) || undefined;
  
  // 记录位置历史
  positionHistoryStore.push({
    tagId,
    position,
    zone: tag.currentZone,
    timestamp: new Date(),
  });
  
  // 限制历史记录数量
  if (positionHistoryStore.length > 10000) {
    positionHistoryStore.splice(0, 1000);
  }
  
  return tag;
}

/**
 * 获取位置历史
 */
export function getPositionHistory(
  tagId: string,
  limit: number = 100
): PositionHistory[] {
  return positionHistoryStore
    .filter(h => h.tagId === tagId)
    .slice(-limit);
}

/**
 * 获取车间概览
 */
export function getWorkshopOverview(): {
  zones: WorkshopZone[];
  anchors: UWBAnchor[];
  activeTags: number;
  zoneOccupancy: Record<string, number>;
} {
  const zoneOccupancy: Record<string, number> = {};
  
  for (const zone of WORKSHOP_ZONES) {
    zoneOccupancy[zone.id] = 0;
  }
  
  let activeTags = 0;
  for (const tag of Array.from(tagStore.values())) {
    if (tag.status === 'active') {
      activeTags++;
      if (tag.currentZone) {
        zoneOccupancy[tag.currentZone] = (zoneOccupancy[tag.currentZone] || 0) + 1;
      }
    }
  }
  
  return {
    zones: WORKSHOP_ZONES,
    anchors: UWB_ANCHORS,
    activeTags,
    zoneOccupancy,
  };
}

/**
 * 检查是否在限制区域
 */
export function isInRestrictedZone(position: Position): boolean {
  const zoneId = determineZone(position);
  if (!zoneId) return false;
  
  const zone = WORKSHOP_ZONES.find(z => z.id === zoneId);
  return zone?.type === 'restricted';
}

/**
 * 计算两点之间的距离
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = (pos2.z || 0) - (pos1.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
