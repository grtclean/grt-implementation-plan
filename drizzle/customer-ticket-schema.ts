/**
 * 客户需求工单系统 + 沟通记录归档 Schema
 *
 * Tables:
 * - customer_requirement_tickets — 客户需求工单（SOP流转）
 * - customer_comm_records        — 客户沟通记录归档
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  index,
  unique,
  json,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// 1. 客户需求工单
// ---------------------------------------------------------------------------
export const customerRequirementTickets = pgTable(
  'customer_requirement_tickets',
  {
    id: serial().primaryKey(),
    ticketCode: varchar('ticket_code', { length: 50 }).notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    description: text('description'),

    // 客户信息（去耦合CRM，冗余存储）
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    customerContact: varchar('customer_contact', { length: 100 }),

    // 来源 & 分类
    source: varchar('source', { length: 50 }).default('internal').notNull(),
    category: varchar('category', { length: 50 }).default('requirement').notNull(),
    priority: varchar('priority', { length: 20 }).default('medium').notNull(),

    // SOP状态
    status: varchar('status', { length: 30 }).default('submitted').notNull(),

    // 负责人
    assigneeId: integer('assignee_id'),
    assigneeName: varchar('assignee_name', { length: 100 }),

    // 排期 & 工时
    dueDate: varchar('due_date', { length: 20 }),
    estimatedHours: decimal('estimated_hours', { precision: 6, scale: 2 }),
    actualHours: decimal('actual_hours', { precision: 6, scale: 2 }),

    // 解决方案
    resolution: text('resolution'),

    // 满意度（P1）
    satisfactionRating: integer('satisfaction_rating'),
    satisfactionComment: text('satisfaction_comment'),
    ratedAt: timestamp('rated_at', { mode: 'string' }),

    // 审计
    createdBy: integer('created_by').notNull(),
    createdByName: varchar('created_by_name', { length: 100 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { mode: 'string' }),
  },
  (table) => [
    unique('crt_uk_ticket_code').on(table.ticketCode),
    index('crt_idx_status').on(table.status),
    index('crt_idx_priority').on(table.priority),
    index('crt_idx_assignee_id').on(table.assigneeId),
    index('crt_idx_created_by').on(table.createdBy),
  ],
);

export type CustomerRequirementTicket = typeof customerRequirementTickets.$inferSelect;
export type NewCustomerRequirementTicket = typeof customerRequirementTickets.$inferInsert;

// ---------------------------------------------------------------------------
// 2. 客户沟通记录
// ---------------------------------------------------------------------------
export const customerCommRecords = pgTable(
  'customer_comm_records',
  {
    id: serial().primaryKey(),
    recordCode: varchar('record_code', { length: 50 }).notNull(),

    // 关联工单（可选）
    ticketId: integer('ticket_id'),

    // 客户
    customerName: varchar('customer_name', { length: 200 }).notNull(),

    // 沟通类型 & 内容
    commType: varchar('comm_type', { length: 30 }).default('email').notNull(),
    subject: varchar('subject', { length: 300 }).notNull(),
    content: text('content'),
    summary: text('summary'),

    // 参与人
    participants: json('participants'), // [{name, role, org}]

    // 时间 & 时长
    commDate: timestamp('comm_date', { mode: 'string' }).notNull(),
    duration: integer('duration'), // 分钟

    // 后续行动
    actionItems: text('action_items'),
    nextFollowUpDate: varchar('next_follow_up_date', { length: 20 }),

    // 审计
    createdBy: integer('created_by').notNull(),
    createdByName: varchar('created_by_name', { length: 100 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    unique('ccr_uk_record_code').on(table.recordCode),
    index('ccr_idx_ticket_id').on(table.ticketId),
    index('ccr_idx_comm_type').on(table.commType),
    index('ccr_idx_customer_name').on(table.customerName),
    index('ccr_idx_created_by').on(table.createdBy),
  ],
);

export type CustomerCommRecord = typeof customerCommRecords.$inferSelect;
export type NewCustomerCommRecord = typeof customerCommRecords.$inferInsert;
