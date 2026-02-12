/**
 * GRT Intelligent System - Cross-Node Data Sync Schema
 * Version: 1.3.77
 * 
 * 轻量级JSON Schema，用于不同区域节点间的数据交换（不含敏感PII）
 */

import * as crypto from 'crypto';

// =============================================================================
// 类型定义
// =============================================================================

export type SyncEntityType = 
  | 'GLOBAL_PART_CATALOG'    // 物料库
  | 'PROJECT_MILESTONE'      // 项目进度
  | 'SHIPPING_MANIFEST'      // 发货单
  | 'BOM_UPDATE'             // BOM更新
  | 'QUALITY_RECORD'         // 质量记录
  | 'PRODUCTION_STATUS';     // 生产状态

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';

export type NodeRegion = 'US' | 'DE' | 'CN';

export interface SyncNodeInfo {
  nodeId: string;           // 节点唯一标识，如 "CN-Factory-01"
  region: NodeRegion;       // 区域
  name: string;             // 节点名称
  endpoint?: string;        // 同步端点URL
  lastSyncTime?: string;    // 最后同步时间
}

// =============================================================================
// 同步数据包结构
// =============================================================================

export interface SyncPacket<T = unknown> {
  sync_id: string;                    // UUID
  origin_node: string;                // 来源节点，如 "CN-Factory-01"
  target_nodes?: string[];            // 目标节点列表（空表示广播）
  timestamp: string;                  // ISO8601时间戳
  entity_type: SyncEntityType;        // 实体类型
  operation: SyncOperation;           // 操作类型
  version: number;                    // 数据版本号
  data_payload: T;                    // 数据载荷
  hash_signature: string;             // HMAC-SHA256签名
  metadata?: {
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    ttl?: number;                     // 生存时间（秒）
    requires_ack?: boolean;           // 是否需要确认
    correlation_id?: string;          // 关联ID（用于追踪）
  };
}

// =============================================================================
// 实体数据结构
// =============================================================================

// 物料库条目
export interface GlobalPartCatalogItem {
  part_number: string;
  description: string;
  description_cn?: string;
  category: string;
  sub_category?: string;
  unit: string;
  standard_cost: number;
  currency: string;
  lead_time_days: number;
  min_order_qty: number;
  preferred_suppliers: string[];
  specifications?: Record<string, string>;
  status: 'ACTIVE' | 'DEPRECATED' | 'PENDING';
  last_updated: string;
}

// 项目里程碑
export interface ProjectMilestoneData {
  project_id: string;
  project_code: string;
  milestone_id: string;
  phase: string;                      // M0-M12
  milestone_name: string;
  planned_date: string;
  actual_date?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'BLOCKED';
  completion_percentage: number;
  responsible_team: string;
  blockers?: string[];
  notes?: string;
}

// 发货单
export interface ShippingManifestData {
  manifest_id: string;
  project_id: string;
  project_code: string;
  shipment_date: string;
  origin_location: string;
  destination_location: string;
  carrier: string;
  tracking_number?: string;
  items: {
    item_id: string;
    part_number: string;
    description: string;
    quantity: number;
    unit: string;
    serial_numbers?: string[];
  }[];
  total_weight_kg: number;
  total_volume_cbm: number;
  customs_declaration?: {
    hs_code: string;
    declared_value: number;
    currency: string;
  };
  status: 'PREPARING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
}

// BOM更新
export interface BOMUpdateData {
  bom_id: string;
  project_id: string;
  version: string;
  change_type: 'ADD' | 'MODIFY' | 'DELETE';
  affected_items: {
    part_number: string;
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
    reason: string;
  }[];
  approved_by?: string;
  approval_date?: string;
  effective_date: string;
}

// 质量记录
export interface QualityRecordData {
  record_id: string;
  project_id: string;
  inspection_type: 'IQC' | 'IPQC' | 'FQC' | 'FAT' | 'SAT';
  inspection_date: string;
  inspector: string;
  items_inspected: number;
  items_passed: number;
  items_failed: number;
  defect_categories?: {
    category: string;
    count: number;
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  }[];
  disposition: 'ACCEPT' | 'REJECT' | 'REWORK' | 'CONCESSION';
  notes?: string;
}

// 生产状态
export interface ProductionStatusData {
  status_id: string;
  project_id: string;
  work_order_id: string;
  station: string;
  operation: string;
  planned_qty: number;
  completed_qty: number;
  scrap_qty: number;
  start_time: string;
  end_time?: string;
  operator_id: string;
  machine_id?: string;
  cycle_time_seconds?: number;
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'BLOCKED';
}

// =============================================================================
// 同步服务类
// =============================================================================

export class DataSyncService {
  private secretKey: string;
  private nodeInfo: SyncNodeInfo;
  
  constructor(nodeInfo: SyncNodeInfo, secretKey?: string) {
    this.nodeInfo = nodeInfo;
    this.secretKey = secretKey || process.env.SYNC_SECRET_KEY || 'grt-sync-default-key';
  }
  
  /**
   * 创建同步数据包
   */
  createPacket<T>(
    entityType: SyncEntityType,
    operation: SyncOperation,
    data: T,
    options?: {
      targetNodes?: string[];
      version?: number;
      priority?: 'HIGH' | 'NORMAL' | 'LOW';
      ttl?: number;
      requiresAck?: boolean;
      correlationId?: string;
    }
  ): SyncPacket<T> {
    const syncId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const version = options?.version || 1;
    
    // 创建待签名的数据
    const signatureData = JSON.stringify({
      sync_id: syncId,
      origin_node: this.nodeInfo.nodeId,
      timestamp,
      entity_type: entityType,
      operation,
      version,
      data_payload: data,
    });
    
    // 生成HMAC-SHA256签名
    const hashSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureData)
      .digest('hex');
    
    return {
      sync_id: syncId,
      origin_node: this.nodeInfo.nodeId,
      target_nodes: options?.targetNodes,
      timestamp,
      entity_type: entityType,
      operation,
      version,
      data_payload: data,
      hash_signature: hashSignature,
      metadata: {
        priority: options?.priority || 'NORMAL',
        ttl: options?.ttl,
        requires_ack: options?.requiresAck,
        correlation_id: options?.correlationId,
      },
    };
  }
  
  /**
   * 验证同步数据包签名
   */
  verifyPacket<T>(packet: SyncPacket<T>): boolean {
    const signatureData = JSON.stringify({
      sync_id: packet.sync_id,
      origin_node: packet.origin_node,
      timestamp: packet.timestamp,
      entity_type: packet.entity_type,
      operation: packet.operation,
      version: packet.version,
      data_payload: packet.data_payload,
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureData)
      .digest('hex');
    
    return packet.hash_signature === expectedSignature;
  }
  
  /**
   * 序列化数据包（用于传输）
   */
  serializePacket<T>(packet: SyncPacket<T>): string {
    return JSON.stringify(packet);
  }
  
  /**
   * 反序列化数据包
   */
  deserializePacket<T>(data: string): SyncPacket<T> {
    return JSON.parse(data) as SyncPacket<T>;
  }
  
  /**
   * 加密数据包（用于敏感数据）
   */
  encryptPacket<T>(packet: SyncPacket<T>): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.secretKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const serialized = this.serializePacket(packet);
    let encrypted = cipher.update(serialized, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * 解密数据包
   */
  decryptPacket<T>(encryptedData: string): SyncPacket<T> {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(this.secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return this.deserializePacket(decrypted);
  }
  
  /**
   * 创建物料库同步包
   */
  createPartCatalogPacket(
    items: GlobalPartCatalogItem[],
    operation: SyncOperation = 'SYNC'
  ): SyncPacket<GlobalPartCatalogItem[]> {
    return this.createPacket('GLOBAL_PART_CATALOG', operation, items, {
      priority: 'NORMAL',
      ttl: 86400, // 24小时
    });
  }
  
  /**
   * 创建项目里程碑同步包
   */
  createMilestonePacket(
    milestone: ProjectMilestoneData,
    operation: SyncOperation = 'UPDATE'
  ): SyncPacket<ProjectMilestoneData> {
    return this.createPacket('PROJECT_MILESTONE', operation, milestone, {
      priority: 'HIGH',
      requiresAck: true,
    });
  }
  
  /**
   * 创建发货单同步包
   */
  createShippingPacket(
    manifest: ShippingManifestData,
    operation: SyncOperation = 'CREATE'
  ): SyncPacket<ShippingManifestData> {
    return this.createPacket('SHIPPING_MANIFEST', operation, manifest, {
      priority: 'HIGH',
      requiresAck: true,
    });
  }
  
  /**
   * 创建BOM更新同步包
   */
  createBOMUpdatePacket(
    bomUpdate: BOMUpdateData
  ): SyncPacket<BOMUpdateData> {
    return this.createPacket('BOM_UPDATE', 'UPDATE', bomUpdate, {
      priority: 'HIGH',
      requiresAck: true,
    });
  }
  
  /**
   * 创建质量记录同步包
   */
  createQualityRecordPacket(
    record: QualityRecordData,
    operation: SyncOperation = 'CREATE'
  ): SyncPacket<QualityRecordData> {
    return this.createPacket('QUALITY_RECORD', operation, record, {
      priority: 'NORMAL',
    });
  }
  
  /**
   * 创建生产状态同步包
   */
  createProductionStatusPacket(
    status: ProductionStatusData,
    operation: SyncOperation = 'UPDATE'
  ): SyncPacket<ProductionStatusData> {
    return this.createPacket('PRODUCTION_STATUS', operation, status, {
      priority: 'NORMAL',
      ttl: 3600, // 1小时
    });
  }
  
  /**
   * 获取节点信息
   */
  getNodeInfo(): SyncNodeInfo {
    return { ...this.nodeInfo };
  }
  
  /**
   * 更新最后同步时间
   */
  updateLastSyncTime(): void {
    this.nodeInfo.lastSyncTime = new Date().toISOString();
  }
}

// =============================================================================
// 同步队列管理
// =============================================================================

export interface SyncQueueItem {
  id: string;
  packet: SyncPacket<unknown>;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

export class SyncQueue {
  private queue: Map<string, SyncQueueItem> = new Map();
  private maxRetries: number;
  
  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }
  
  /**
   * 添加到队列
   */
  enqueue(packet: SyncPacket<unknown>): string {
    const item: SyncQueueItem = {
      id: packet.sync_id,
      packet,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: this.maxRetries,
      createdAt: new Date().toISOString(),
    };
    
    this.queue.set(item.id, item);
    return item.id;
  }
  
  /**
   * 获取待发送的项目
   */
  getPending(): SyncQueueItem[] {
    return Array.from(this.queue.values()).filter(
      item => item.status === 'PENDING' || 
              (item.status === 'FAILED' && item.retryCount < item.maxRetries)
    );
  }
  
  /**
   * 标记为发送中
   */
  markSending(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'SENDING';
      item.lastAttemptAt = new Date().toISOString();
    }
  }
  
  /**
   * 标记为已发送
   */
  markSent(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'SENT';
    }
  }
  
  /**
   * 标记为已确认
   */
  markAcknowledged(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'ACKNOWLEDGED';
    }
  }
  
  /**
   * 标记为失败
   */
  markFailed(id: string, error: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'FAILED';
      item.retryCount++;
      item.error = error;
    }
  }
  
  /**
   * 移除已完成的项目
   */
  removeCompleted(): number {
    let removed = 0;
    for (const [id, item] of Array.from(this.queue)) {
      if (item.status === 'ACKNOWLEDGED' || 
          (item.status === 'SENT' && !item.packet.metadata?.requires_ack)) {
        this.queue.delete(id);
        removed++;
      }
    }
    return removed;
  }
  
  /**
   * 获取队列统计
   */
  getStats(): {
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    acknowledged: number;
  } {
    const stats = {
      total: this.queue.size,
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      acknowledged: 0,
    };
    
    for (const item of Array.from(this.queue.values())) {
      stats[item.status.toLowerCase() as keyof typeof stats]++;
    }
    
    return stats;
  }
}

// =============================================================================
// 导出便捷函数
// =============================================================================

/**
 * 创建同步服务实例
 */
export function createSyncService(
  nodeId: string,
  region: NodeRegion,
  name: string,
  secretKey?: string
): DataSyncService {
  return new DataSyncService(
    { nodeId, region, name },
    secretKey
  );
}

/**
 * 验证同步包格式
 */
export function validateSyncPacket(packet: unknown): packet is SyncPacket<unknown> {
  if (!packet || typeof packet !== 'object') return false;
  
  const p = packet as Record<string, unknown>;
  
  return (
    typeof p.sync_id === 'string' &&
    typeof p.origin_node === 'string' &&
    typeof p.timestamp === 'string' &&
    typeof p.entity_type === 'string' &&
    typeof p.operation === 'string' &&
    typeof p.version === 'number' &&
    p.data_payload !== undefined &&
    typeof p.hash_signature === 'string'
  );
}
