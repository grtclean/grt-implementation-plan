/**
 * GRT Intelligent System - Data Sync tRPC Router
 * Version: 1.3.77
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { jsonValue } from '@shared/validators';
import {
  DataSyncService,
  SyncQueue,
  createSyncService,
  validateSyncPacket,
  type SyncEntityType,
  type SyncOperation,
  type NodeRegion,
  type GlobalPartCatalogItem,
  type ProjectMilestoneData,
  type ShippingManifestData,
} from './DataSyncSchema';

// =============================================================================
// 全局同步服务实例
// =============================================================================
const nodeId = process.env.SYNC_NODE_ID || 'LOCAL-DEV-01';
const nodeRegion = (process.env.APP_REGION || 'US') as NodeRegion;
const nodeName = process.env.SYNC_NODE_NAME || 'Local Development Node';

const syncService = createSyncService(nodeId, nodeRegion, nodeName);
const syncQueue = new SyncQueue();

// =============================================================================
// 输入验证Schema
// =============================================================================
const entityTypeSchema = z.enum([
  'GLOBAL_PART_CATALOG',
  'PROJECT_MILESTONE',
  'SHIPPING_MANIFEST',
  'BOM_UPDATE',
  'QUALITY_RECORD',
  'PRODUCTION_STATUS',
]);

const operationSchema = z.enum(['CREATE', 'UPDATE', 'DELETE', 'SYNC']);
const regionSchema = z.enum(['US', 'DE', 'CN']);

// =============================================================================
// 同步路由
// =============================================================================
export const syncRouter = router({
  // ---------------------------------------------------------------------------
  // 获取节点信息
  // ---------------------------------------------------------------------------
  getNodeInfo: protectedProcedure.query(() => {
    return syncService.getNodeInfo();
  }),

  // ---------------------------------------------------------------------------
  // 获取队列统计
  // ---------------------------------------------------------------------------
  getQueueStats: protectedProcedure.query(() => {
    return syncQueue.getStats();
  }),

  // ---------------------------------------------------------------------------
  // 创建物料库同步包
  // ---------------------------------------------------------------------------
  createPartCatalogSync: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        part_number: z.string(),
        description: z.string(),
        description_cn: z.string().optional(),
        category: z.string(),
        sub_category: z.string().optional(),
        unit: z.string(),
        standard_cost: z.number(),
        currency: z.string(),
        lead_time_days: z.number(),
        min_order_qty: z.number(),
        preferred_suppliers: z.array(z.string()),
        specifications: z.record(z.string(), z.string()).optional(),
        status: z.enum(['ACTIVE', 'DEPRECATED', 'PENDING']),
        last_updated: z.string(),
      })),
      operation: operationSchema.optional().default('SYNC'),
    }))
    .mutation(({ input }) => {
      const packet = syncService.createPartCatalogPacket(
        input.items as GlobalPartCatalogItem[],
        input.operation as SyncOperation
      );
      const queueId = syncQueue.enqueue(packet);
      
      return {
        success: true,
        syncId: packet.sync_id,
        queueId,
        packet,
      };
    }),

  // ---------------------------------------------------------------------------
  // 创建项目里程碑同步包
  // ---------------------------------------------------------------------------
  createMilestoneSync: protectedProcedure
    .input(z.object({
      milestone: z.object({
        project_id: z.string(),
        project_code: z.string(),
        milestone_id: z.string(),
        phase: z.string(),
        milestone_name: z.string(),
        planned_date: z.string(),
        actual_date: z.string().optional(),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED']),
        completion_percentage: z.number(),
        responsible_team: z.string(),
        blockers: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }),
      operation: operationSchema.optional().default('UPDATE'),
    }))
    .mutation(({ input }) => {
      const packet = syncService.createMilestonePacket(
        input.milestone as ProjectMilestoneData,
        input.operation as SyncOperation
      );
      const queueId = syncQueue.enqueue(packet);
      
      return {
        success: true,
        syncId: packet.sync_id,
        queueId,
        packet,
      };
    }),

  // ---------------------------------------------------------------------------
  // 创建发货单同步包
  // ---------------------------------------------------------------------------
  createShippingSync: protectedProcedure
    .input(z.object({
      manifest: z.object({
        manifest_id: z.string(),
        project_id: z.string(),
        project_code: z.string(),
        shipment_date: z.string(),
        origin_location: z.string(),
        destination_location: z.string(),
        carrier: z.string(),
        tracking_number: z.string().optional(),
        items: z.array(z.object({
          item_id: z.string(),
          part_number: z.string(),
          description: z.string(),
          quantity: z.number(),
          unit: z.string(),
          serial_numbers: z.array(z.string()).optional(),
        })),
        total_weight_kg: z.number(),
        total_volume_cbm: z.number(),
        customs_declaration: z.object({
          hs_code: z.string(),
          declared_value: z.number(),
          currency: z.string(),
        }).optional(),
        status: z.enum(['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']),
      }),
      operation: operationSchema.optional().default('CREATE'),
    }))
    .mutation(({ input }) => {
      const packet = syncService.createShippingPacket(
        input.manifest as ShippingManifestData,
        input.operation as SyncOperation
      );
      const queueId = syncQueue.enqueue(packet);
      
      return {
        success: true,
        syncId: packet.sync_id,
        queueId,
        packet,
      };
    }),

  // ---------------------------------------------------------------------------
  // 验证同步包
  // ---------------------------------------------------------------------------
  verifyPacket: protectedProcedure
    .input(z.object({
      packet: jsonValue,
    }))
    .query(({ input }) => {
      if (!validateSyncPacket(input.packet)) {
        return {
          valid: false,
          error: 'Invalid packet format',
        };
      }
      
      const isValid = syncService.verifyPacket(input.packet);
      return {
        valid: isValid,
        error: isValid ? null : 'Invalid signature',
      };
    }),

  // ---------------------------------------------------------------------------
  // 获取待发送的同步项
  // ---------------------------------------------------------------------------
  getPendingItems: protectedProcedure.query(() => {
    return syncQueue.getPending();
  }),

  // ---------------------------------------------------------------------------
  // 标记同步项状态
  // ---------------------------------------------------------------------------
  updateItemStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['SENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED']),
      error: z.string().optional(),
    }))
    .mutation(({ input }) => {
      switch (input.status) {
        case 'SENDING':
          syncQueue.markSending(input.id);
          break;
        case 'SENT':
          syncQueue.markSent(input.id);
          break;
        case 'ACKNOWLEDGED':
          syncQueue.markAcknowledged(input.id);
          break;
        case 'FAILED':
          syncQueue.markFailed(input.id, input.error || 'Unknown error');
          break;
      }
      
      return { success: true };
    }),

  // ---------------------------------------------------------------------------
  // 清理已完成的同步项
  // ---------------------------------------------------------------------------
  cleanupCompleted: protectedProcedure.mutation(() => {
    const removed = syncQueue.removeCompleted();
    return {
      success: true,
      removedCount: removed,
    };
  }),
});

export type SyncRouter = typeof syncRouter;
