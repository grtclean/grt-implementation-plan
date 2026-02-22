/**
 * GRT 5.0 生产设备管理数据库Schema
 *
 * 包含:
 * - 生产设备表 (设备基本信息、状态、利用率)
 * - 设备状态变更历史表 (审计追踪)
 */

import {
  pgTable, serial, integer, varchar, text, timestamp, decimal,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// 生产设备表
// ============================================
export const productionEquipments = pgTable('production_equipments', {
  id: serial().primaryKey(),
  code: varchar({ length: 50 }).notNull().unique(),
  name: varchar({ length: 200 }).notNull(),
  type: varchar({ length: 50 }).notNull(),
  status: varchar({ length: 30 }).notNull().default('idle'),
  location: varchar({ length: 200 }),
  currentWorkOrderId: integer('current_work_order_id'),
  utilization: decimal({ precision: 5, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_prod_equip_code').on(table.code),
  index('idx_prod_equip_status').on(table.status),
  index('idx_prod_equip_type').on(table.type),
  index('idx_prod_equip_location').on(table.location),
]);

// ============================================
// 设备状态变更历史表 (审计追踪)
// ============================================
export const productionEquipmentStatusHistory = pgTable('production_equipment_status_history', {
  id: serial().primaryKey(),
  equipmentId: integer('equipment_id').notNull(),
  equipmentCode: varchar('equipment_code', { length: 50 }),
  equipmentName: varchar('equipment_name', { length: 200 }),
  previousStatus: varchar('previous_status', { length: 30 }),
  newStatus: varchar('new_status', { length: 30 }).notNull(),
  previousWorkOrderId: integer('previous_work_order_id'),
  newWorkOrderId: integer('new_work_order_id'),
  notes: text(),
  changedBy: integer('changed_by'),
  changedByName: varchar('changed_by_name', { length: 100 }),
  changedAt: timestamp('changed_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_equip_hist_equipment').on(table.equipmentId),
  index('idx_equip_hist_changed_at').on(table.changedAt),
]);
