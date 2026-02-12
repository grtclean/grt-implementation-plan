/**
 * UWB设备数据同步服务
 * UWB Device Data Synchronization Service
 * 
 * 功能：
 * - 连接UWB定位系统获取人员位置数据
 * - 自动计算工时（进入/离开工作区域）
 * - 批量导入工时记录到数据库
 * - 支持多种UWB设备协议（Decawave、Ubisense、Sewio等）
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// ============================================================================
// 类型定义
// ============================================================================

export interface UWBDevice {
  id: string;
  deviceType: 'ANCHOR' | 'TAG';
  deviceName: string;
  location: string;
  zoneId: string;
  zoneName: string;
  isActive: boolean;
  lastHeartbeat: Date;
  config: UWBDeviceConfig;
}

export interface UWBDeviceConfig {
  protocol: 'DECAWAVE' | 'UBISENSE' | 'SEWIO' | 'POZYX' | 'CUSTOM';
  apiEndpoint?: string;
  apiKey?: string;
  refreshInterval: number; // seconds
  positionThreshold: number; // meters
  zoneDefinitions: ZoneDefinition[];
}

export interface ZoneDefinition {
  zoneId: string;
  zoneName: string;
  stageCode: string; // T1-T15
  coordinates: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  floorLevel: number;
}

export interface UWBPositionData {
  tagId: string;
  userId: number;
  userName: string;
  timestamp: Date;
  x: number;
  y: number;
  z: number;
  accuracy: number;
  zoneId?: string;
  zoneName?: string;
  stageCode?: string;
}

export interface UWBTimeEntry {
  userId: number;
  userName: string;
  projectId: number;
  stageCode: string;
  zoneId: string;
  enterTime: Date;
  exitTime?: Date;
  duration?: number; // minutes
  isComplete: boolean;
}

export interface UWBSyncResult {
  success: boolean;
  syncedRecords: number;
  errors: string[];
  timestamp: Date;
}

// ============================================================================
// UWB数据同步服务类
// ============================================================================

export class UWBSyncService {
  private devices: Map<string, UWBDevice> = new Map();
  private activeEntries: Map<string, UWBTimeEntry> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.loadDeviceConfigurations();
  }

  /**
   * 加载设备配置
   */
  private async loadDeviceConfigurations(): Promise<void> {
    try {
      const db = await requireDb(); const result = await db.execute(sql`
        SELECT * FROM production_time_devices WHERE is_active = 1
      `);
      
      if (result && Array.isArray(result)) {
        for (const row of result as any[]) {
          const device: UWBDevice = {
            id: row.device_id,
            deviceType: row.device_type,
            deviceName: row.device_name,
            location: row.location,
            zoneId: row.zone_id || '',
            zoneName: row.zone_name || '',
            isActive: row.is_active === 1,
            lastHeartbeat: new Date(row.last_heartbeat || Date.now()),
            config: JSON.parse(row.config || '{}'),
          };
          this.devices.set(device.id, device);
        }
      }
    } catch (error) {
      console.error('[UWB] Failed to load device configurations:', error);
    }
  }

  /**
   * 启动同步服务
   */
  public async start(intervalSeconds: number = 30): Promise<void> {
    if (this.isRunning) {
      console.log('[UWB] Service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[UWB] Starting sync service with ${intervalSeconds}s interval`);

    // 立即执行一次同步
    await this.syncAllDevices();

    // 设置定时同步
    this.syncInterval = setInterval(async () => {
      await this.syncAllDevices();
    }, intervalSeconds * 1000);
  }

  /**
   * 停止同步服务
   */
  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('[UWB] Sync service stopped');
  }

  /**
   * 同步所有设备数据
   */
  public async syncAllDevices(): Promise<UWBSyncResult> {
    const result: UWBSyncResult = {
      success: true,
      syncedRecords: 0,
      errors: [],
      timestamp: new Date(),
    };

    for (const [deviceId, device] of Array.from(this.devices)) {
      if (!device.isActive) continue;

      try {
        const positions = await this.fetchPositionData(device);
        const timeEntries = await this.processPositionData(positions, device);
        const savedCount = await this.saveTimeEntries(timeEntries);
        result.syncedRecords += savedCount;
      } catch (error) {
        const errorMsg = `Device ${deviceId}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`[UWB] ${errorMsg}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  /**
   * 从UWB设备获取位置数据
   */
  private async fetchPositionData(device: UWBDevice): Promise<UWBPositionData[]> {
    const { config } = device;
    
    // 根据不同协议获取数据
    switch (config.protocol) {
      case 'DECAWAVE':
        return this.fetchDecawaveData(config);
      case 'UBISENSE':
        return this.fetchUbisenseData(config);
      case 'SEWIO':
        return this.fetchSewioData(config);
      case 'POZYX':
        return this.fetchPozyxData(config);
      case 'CUSTOM':
        return this.fetchCustomData(config);
      default:
        return this.generateMockData(device);
    }
  }

  /**
   * Decawave协议数据获取
   */
  private async fetchDecawaveData(config: UWBDeviceConfig): Promise<UWBPositionData[]> {
    if (!config.apiEndpoint) {
      return [];
    }

    try {
      const response = await fetch(`${config.apiEndpoint}/api/v1/positions`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.transformDecawaveData(data, config);
    } catch (error) {
      console.error('[UWB] Decawave fetch error:', error);
      return [];
    }
  }

  /**
   * 转换Decawave数据格式
   */
  private transformDecawaveData(data: any, config: UWBDeviceConfig): UWBPositionData[] {
    const positions: UWBPositionData[] = [];

    if (data.tags && Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        const zone = this.findZoneForPosition(tag.x, tag.y, tag.z, config.zoneDefinitions);
        
        positions.push({
          tagId: tag.id,
          userId: tag.userId || 0,
          userName: tag.userName || `Tag-${tag.id}`,
          timestamp: new Date(tag.timestamp || Date.now()),
          x: tag.x,
          y: tag.y,
          z: tag.z || 0,
          accuracy: tag.accuracy || 0.1,
          zoneId: zone?.zoneId,
          zoneName: zone?.zoneName,
          stageCode: zone?.stageCode,
        });
      }
    }

    return positions;
  }

  /**
   * Ubisense协议数据获取
   */
  private async fetchUbisenseData(config: UWBDeviceConfig): Promise<UWBPositionData[]> {
    // Ubisense使用SOAP协议，这里简化处理
    if (!config.apiEndpoint) {
      return [];
    }

    try {
      const response = await fetch(`${config.apiEndpoint}/LocationService`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'SOAPAction': 'GetPositions',
        },
        body: `<?xml version="1.0"?>
          <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
              <GetPositions xmlns="http://ubisense.net/location"/>
            </soap:Body>
          </soap:Envelope>`,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseUbisenseXML(xmlText, config);
    } catch (error) {
      console.error('[UWB] Ubisense fetch error:', error);
      return [];
    }
  }

  /**
   * 解析Ubisense XML响应
   */
  private parseUbisenseXML(xmlText: string, config: UWBDeviceConfig): UWBPositionData[] {
    // 简化的XML解析，实际应使用xml2js等库
    const positions: UWBPositionData[] = [];
    // XML解析逻辑...
    return positions;
  }

  /**
   * Sewio协议数据获取
   */
  private async fetchSewioData(config: UWBDeviceConfig): Promise<UWBPositionData[]> {
    if (!config.apiEndpoint) {
      return [];
    }

    try {
      const response = await fetch(`${config.apiEndpoint}/sensmapserver/api/tags`, {
        headers: {
          'X-ApiKey': config.apiKey || '',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.transformSewioData(data, config);
    } catch (error) {
      console.error('[UWB] Sewio fetch error:', error);
      return [];
    }
  }

  /**
   * 转换Sewio数据格式
   */
  private transformSewioData(data: any, config: UWBDeviceConfig): UWBPositionData[] {
    const positions: UWBPositionData[] = [];

    if (data && Array.isArray(data)) {
      for (const tag of data) {
        const zone = this.findZoneForPosition(
          tag.posX / 1000, // Sewio使用毫米
          tag.posY / 1000,
          tag.posZ / 1000,
          config.zoneDefinitions
        );

        positions.push({
          tagId: tag.id.toString(),
          userId: tag.alias ? parseInt(tag.alias) : 0,
          userName: tag.name || `Tag-${tag.id}`,
          timestamp: new Date(tag.timestamp || Date.now()),
          x: tag.posX / 1000,
          y: tag.posY / 1000,
          z: tag.posZ / 1000,
          accuracy: tag.accuracy || 0.1,
          zoneId: zone?.zoneId,
          zoneName: zone?.zoneName,
          stageCode: zone?.stageCode,
        });
      }
    }

    return positions;
  }

  /**
   * Pozyx协议数据获取
   */
  private async fetchPozyxData(config: UWBDeviceConfig): Promise<UWBPositionData[]> {
    if (!config.apiEndpoint) {
      return [];
    }

    try {
      const response = await fetch(`${config.apiEndpoint}/v1.0/positions`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.transformPozyxData(data, config);
    } catch (error) {
      console.error('[UWB] Pozyx fetch error:', error);
      return [];
    }
  }

  /**
   * 转换Pozyx数据格式
   */
  private transformPozyxData(data: any, config: UWBDeviceConfig): UWBPositionData[] {
    const positions: UWBPositionData[] = [];

    if (data.positions && Array.isArray(data.positions)) {
      for (const pos of data.positions) {
        const zone = this.findZoneForPosition(pos.x, pos.y, pos.z, config.zoneDefinitions);

        positions.push({
          tagId: pos.tagId,
          userId: pos.metadata?.userId || 0,
          userName: pos.metadata?.userName || `Tag-${pos.tagId}`,
          timestamp: new Date(pos.timestamp),
          x: pos.x,
          y: pos.y,
          z: pos.z || 0,
          accuracy: pos.accuracy || 0.1,
          zoneId: zone?.zoneId,
          zoneName: zone?.zoneName,
          stageCode: zone?.stageCode,
        });
      }
    }

    return positions;
  }

  /**
   * 自定义协议数据获取
   */
  private async fetchCustomData(config: UWBDeviceConfig): Promise<UWBPositionData[]> {
    // 自定义协议实现
    return [];
  }

  /**
   * 生成模拟数据（用于测试）
   */
  private generateMockData(device: UWBDevice): UWBPositionData[] {
    const mockUsers = [
      { userId: 1, userName: '张工程师', tagId: 'TAG001' },
      { userId: 2, userName: '李技师', tagId: 'TAG002' },
      { userId: 3, userName: '王质检', tagId: 'TAG003' },
    ];

    const stageCodes = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

    return mockUsers.map((user, idx) => ({
      tagId: user.tagId,
      userId: user.userId,
      userName: user.userName,
      timestamp: new Date(),
      x: Math.random() * 100,
      y: Math.random() * 50,
      z: 0,
      accuracy: 0.1,
      zoneId: `ZONE-${idx + 1}`,
      zoneName: `工作区${idx + 1}`,
      stageCode: stageCodes[idx % stageCodes.length],
    }));
  }

  /**
   * 根据坐标查找所在区域
   */
  private findZoneForPosition(
    x: number, 
    y: number, 
    z: number, 
    zones: ZoneDefinition[]
  ): ZoneDefinition | undefined {
    for (const zone of zones) {
      const { coordinates, floorLevel } = zone;
      
      // 检查是否在区域范围内
      if (
        x >= coordinates.x1 && x <= coordinates.x2 &&
        y >= coordinates.y1 && y <= coordinates.y2 &&
        Math.abs(z - floorLevel) < 3 // 3米高度容差
      ) {
        return zone;
      }
    }
    return undefined;
  }

  /**
   * 处理位置数据，生成工时条目
   */
  private async processPositionData(
    positions: UWBPositionData[], 
    device: UWBDevice
  ): Promise<UWBTimeEntry[]> {
    const entries: UWBTimeEntry[] = [];
    const now = new Date();

    for (const pos of positions) {
      if (!pos.stageCode || !pos.zoneId) continue;

      const entryKey = `${pos.userId}-${pos.zoneId}`;
      const existingEntry = this.activeEntries.get(entryKey);

      if (existingEntry) {
        // 更新现有条目
        if (existingEntry.stageCode !== pos.stageCode) {
          // 离开了之前的区域，完成该条目
          existingEntry.exitTime = now;
          existingEntry.duration = Math.round(
            (now.getTime() - existingEntry.enterTime.getTime()) / 60000
          );
          existingEntry.isComplete = true;
          entries.push({ ...existingEntry });

          // 创建新条目
          const newEntry: UWBTimeEntry = {
            userId: pos.userId,
            userName: pos.userName,
            projectId: 1, // 默认项目ID，实际应从配置获取
            stageCode: pos.stageCode,
            zoneId: pos.zoneId,
            enterTime: now,
            isComplete: false,
          };
          this.activeEntries.set(entryKey, newEntry);
        }
      } else {
        // 创建新条目
        const newEntry: UWBTimeEntry = {
          userId: pos.userId,
          userName: pos.userName,
          projectId: 1,
          stageCode: pos.stageCode,
          zoneId: pos.zoneId,
          enterTime: now,
          isComplete: false,
        };
        this.activeEntries.set(entryKey, newEntry);
      }
    }

    // 检查超时条目（超过8小时未更新）
    const timeoutThreshold = 8 * 60 * 60 * 1000; // 8小时
    for (const [key, entry] of Array.from(this.activeEntries)) {
      if (!entry.isComplete && (now.getTime() - entry.enterTime.getTime()) > timeoutThreshold) {
        entry.exitTime = new Date(entry.enterTime.getTime() + timeoutThreshold);
        entry.duration = 480; // 8小时
        entry.isComplete = true;
        entries.push({ ...entry });
        this.activeEntries.delete(key);
      }
    }

    return entries;
  }

  /**
   * 保存工时条目到数据库
   */
  private async saveTimeEntries(entries: UWBTimeEntry[]): Promise<number> {
    let savedCount = 0;

    for (const entry of entries) {
      if (!entry.isComplete) continue;

      try {
        const db = await requireDb(); await db.execute(sql`
          INSERT INTO production_time_records 
          (user_id, user_name, project_id, stage_code, record_date, start_time, end_time, duration, source_type, device_id, work_type, is_verified, created_at)
          VALUES (
            ${entry.userId},
            ${entry.userName},
            ${entry.projectId},
            ${entry.stageCode},
            ${entry.enterTime.toISOString().split('T')[0]},
            ${entry.enterTime.toISOString().split('T')[1].substring(0, 8)},
            ${entry.exitTime?.toISOString().split('T')[1].substring(0, 8) || null},
            ${entry.duration || 0},
            'UWB',
            ${entry.zoneId},
            'REGULAR',
            0,
            NOW()
          )
        `);
        savedCount++;
      } catch (error) {
        console.error('[UWB] Failed to save time entry:', error);
      }
    }

    return savedCount;
  }

  /**
   * 手动触发同步
   */
  public async manualSync(): Promise<UWBSyncResult> {
    return this.syncAllDevices();
  }

  /**
   * 获取服务状态
   */
  public getStatus(): {
    isRunning: boolean;
    deviceCount: number;
    activeEntries: number;
  } {
    return {
      isRunning: this.isRunning,
      deviceCount: this.devices.size,
      activeEntries: this.activeEntries.size,
    };
  }

  /**
   * 添加或更新设备配置
   */
  public async addDevice(device: UWBDevice): Promise<void> {
    this.devices.set(device.id, device);
    
    const db = await requireDb(); await db.execute(sql`
      INSERT INTO production_time_devices 
      (device_id, device_type, device_name, location, zone_id, zone_name, is_active, config, created_at, updated_at)
      VALUES (
        ${device.id},
        ${device.deviceType},
        ${device.deviceName},
        ${device.location},
        ${device.zoneId},
        ${device.zoneName},
        ${device.isActive ? 1 : 0},
        ${JSON.stringify(device.config)},
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        location = VALUES(location),
        zone_id = VALUES(zone_id),
        zone_name = VALUES(zone_name),
        is_active = VALUES(is_active),
        config = VALUES(config),
        updated_at = NOW()
    `);
  }

  /**
   * 移除设备
   */
  public async removeDevice(deviceId: string): Promise<void> {
    this.devices.delete(deviceId);
    
    const db = await requireDb(); await db.execute(sql`
      UPDATE production_time_devices 
      SET is_active = 0, updated_at = NOW()
      WHERE device_id = ${deviceId}
    `);
  }
}

// ============================================================================
// 导出单例实例
// ============================================================================

export const uwbSyncService = new UWBSyncService();
