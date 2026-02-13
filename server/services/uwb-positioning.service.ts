/**
 * UWB定位服务
 * 用于工厂车间的人员和设备定位
 */

// 位置坐标
export interface Position {
  x: number;
  y: number;
  z?: number;
  timestamp?: Date;
}

// 车间区域定义
export interface WorkshopZone {
  id: string;
  name: string;
  type: 'assembly' | 'calibration' | 'testing' | 'storage' | 'shipping' | 'production' | 'office' | 'restricted' | 'common';
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  description?: string;
}

// UWB锚点定义
export interface UWBAnchor {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  status: 'online' | 'offline' | 'maintenance';
}

// UWB标签定义
export interface UWBTag {
  id: string;
  agentUnitId?: number;
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
    id: 'zone-assembly',
    name: '装配区',
    type: 'assembly',
    bounds: { minX: 0, maxX: 20, minY: 0, maxY: 15, minZ: 0, maxZ: 5 },
    description: '装配生产线区域',
  },
  {
    id: 'zone-calibration',
    name: '标定区',
    type: 'calibration',
    bounds: { minX: 20, maxX: 40, minY: 0, maxY: 15, minZ: 0, maxZ: 5 },
    description: '设备标定区域',
  },
  {
    id: 'zone-testing',
    name: '测试区',
    type: 'testing',
    bounds: { minX: 40, maxX: 60, minY: 0, maxY: 15, minZ: 0, maxZ: 5 },
    description: '产品测试区域',
  },
  {
    id: 'zone-storage',
    name: '仓储区',
    type: 'storage',
    bounds: { minX: 60, maxX: 80, minY: 0, maxY: 15, minZ: 0, maxZ: 8 },
    description: '原材料和成品仓库',
  },
  {
    id: 'zone-shipping',
    name: '发货区',
    type: 'shipping',
    bounds: { minX: 80, maxX: 100, minY: 0, maxY: 15, minZ: 0, maxZ: 5 },
    description: '产品发货区域',
  },
];

// UWB锚点配置
export const UWB_ANCHORS: UWBAnchor[] = [
  { id: 'anchor-1', name: '锚点A1', position: { x: 0, y: 0, z: 3 }, status: 'online' },
  { id: 'anchor-2', name: '锚点A2', position: { x: 100, y: 0, z: 3 }, status: 'online' },
  { id: 'anchor-3', name: '锚点A3', position: { x: 0, y: 15, z: 3 }, status: 'online' },
  { id: 'anchor-4', name: '锚点A4', position: { x: 100, y: 15, z: 3 }, status: 'online' },
  { id: 'anchor-5', name: '锚点A5', position: { x: 50, y: 7.5, z: 3 }, status: 'online' },
];

// 内存存储（实际应用中应使用数据库）
const tagStore: Map<string, UWBTag> = new Map();
const positionHistoryStore: PositionHistory[] = [];

/**
 * 判断位置所在区域
 */
export function determineZone(position: { x: number; y: number; z?: number }): WorkshopZone | null {
  for (const zone of WORKSHOP_ZONES) {
    if (
      position.x >= zone.bounds.minX &&
      position.x <= zone.bounds.maxX &&
      position.y >= zone.bounds.minY &&
      position.y <= zone.bounds.maxY
    ) {
      return zone;
    }
  }
  return null;
}

/**
 * 绑定UWB标签到代理单元
 */
export async function bindUWBTag(tagId: string, agentUnitId: number): Promise<{ success: boolean; message: string }> {
  const tag: UWBTag = {
    id: tagId,
    agentUnitId,
    status: 'active',
    batteryLevel: 100,
  };
  tagStore.set(tagId, tag);
  return { success: true, message: '绑定成功' };
}

/**
 * 解绑UWB标签
 */
export async function unbindUWBTag(tagId: string): Promise<{ success: boolean; message: string }> {
  const tag = tagStore.get(tagId);
  if (tag) {
    tag.agentUnitId = undefined;
    tag.agentUnitName = undefined;
    tag.status = 'inactive';
  }
  return { success: true, message: '解绑成功' };
}

/**
 * 获取所有UWB标签
 */
export async function getAllUWBTags(): Promise<UWBTag[]> {
  return Array.from(tagStore.values());
}

/**
 * 获取代理单元位置
 */
export async function getAgentUnitPosition(agentUnitId: number): Promise<{
  position: Position | null;
  zone: WorkshopZone | null;
  lastUpdateTime: string | null;
  tagId: string | null;
}> {
  for (const tag of Array.from(tagStore.values())) {
    if (tag.agentUnitId === agentUnitId) {
      const zone = tag.currentPosition ? determineZone(tag.currentPosition) : null;
      return {
        position: tag.currentPosition || null,
        zone,
        lastUpdateTime: tag.currentPosition?.timestamp?.toISOString() || null,
        tagId: tag.id,
      };
    }
  }
  return { position: null, zone: null, lastUpdateTime: null, tagId: null };
}

/**
 * 更新标签位置
 */
export function updateTagPosition(tagId: string, position: Position): UWBTag | null {
  const tag = tagStore.get(tagId);
  if (!tag) return null;

  tag.currentPosition = position;
  const zone = determineZone(position);
  tag.currentZone = zone?.id || undefined;

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
export async function getPositionHistory(
  agentUnitId: number,
  startTime?: string,
  endTime?: string,
  limit: number = 100
): Promise<PositionHistory[]> {
  // Find tag for this agent unit
  let targetTagId: string | null = null;
  for (const tag of Array.from(tagStore.values())) {
    if (tag.agentUnitId === agentUnitId) {
      targetTagId = tag.id;
      break;
    }
  }
  if (!targetTagId) return [];

  let filtered = positionHistoryStore.filter(h => h.tagId === targetTagId);

  if (startTime) {
    const start = new Date(startTime);
    filtered = filtered.filter(h => h.timestamp >= start);
  }
  if (endTime) {
    const end = new Date(endTime);
    filtered = filtered.filter(h => h.timestamp <= end);
  }

  return filtered.slice(-limit);
}

/**
 * 获取区域内的代理单元
 */
export async function getAgentUnitsInZone(zoneId: string): Promise<UWBTag[]> {
  const results: UWBTag[] = [];
  for (const tag of Array.from(tagStore.values())) {
    if (tag.currentZone === zoneId && tag.status === 'active') {
      results.push(tag);
    }
  }
  return results;
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
 * 模拟UWB数据（用于测试和演示）
 */
export async function simulateUWBData(): Promise<void> {
  // Simulation stub - generates random position data
}

/**
 * 检查是否在限制区域
 */
export function isInRestrictedZone(position: Position): boolean {
  const zone = determineZone(position);
  if (!zone) return false;
  return zone.type === 'restricted';
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
