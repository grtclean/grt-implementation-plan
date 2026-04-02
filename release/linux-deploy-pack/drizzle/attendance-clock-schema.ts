/**
 * Attendance Clock-In System — Drizzle Schema
 *
 * GPS-based clock-in/out with geofence validation.
 *
 * Tables:
 * 1. attendance_groups — 考勤组 (6天工人, 5天办公室, 后勤阿姨)
 * 2. attendance_clock_records — 每日打卡记录
 * 3. attendance_group_members — 考勤组成员
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────

export const clockMethodEnum = pgEnum("clock_method_enum", [
  "gps",
  "wifi",
  "manual",
  "dingtalk_import",
]);

export const clockStatusEnum = pgEnum("clock_status_enum", [
  "normal",
  "late",
  "early_leave",
  "absent",
  "leave",
  "offsite",
]);

// ── 1. Attendance Groups — 考勤组 ─────────────────────────

export const attendanceGroups = pgTable("attendance_groups", {
  id: serial("id").primaryKey(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  workDaysPerWeek: integer("work_days_per_week").notNull().default(6),
  dailyHours: decimal("daily_hours", { precision: 4, scale: 1 }).notNull().default("8.0"),
  shiftStart: varchar("shift_start", { length: 5 }).notNull().default("08:00"),   // HH:MM
  shiftEnd: varchar("shift_end", { length: 5 }).notNull().default("17:00"),       // HH:MM
  lateGraceMinutes: integer("late_grace_minutes").notNull().default(5),           // 迟到宽限(分钟)

  // Office geofence (GRT headquarters)
  officeLat: decimal("office_lat", { precision: 10, scale: 7 }).notNull().default("31.4913000"),   // GRT无锡
  officeLng: decimal("office_lng", { precision: 10, scale: 7 }).notNull().default("120.3119000"),
  geofenceRadius: integer("geofence_radius").notNull().default(100),              // meters

  // 休息时段配置 (允许离开围栏的时间窗口)
  breakWindows: json("break_windows").$type<Array<{ label: string; start: string; end: string }>>()
    .notNull()
    .default([{ label: "午休", start: "11:30", end: "13:00" }]),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// ── 2. Attendance Clock Records — 每日打卡 ─────────────────

export const attendanceClockRecords = pgTable("attendance_clock_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  clockDate: varchar("clock_date", { length: 10 }).notNull(),  // YYYY-MM-DD

  // Clock-in
  clockInTime: timestamp("clock_in_time", { mode: "string" }),
  clockInLat: decimal("clock_in_lat", { precision: 10, scale: 7 }),
  clockInLng: decimal("clock_in_lng", { precision: 10, scale: 7 }),
  clockInDistanceMeters: decimal("clock_in_distance_meters", { precision: 8, scale: 1 }),
  clockInMethod: clockMethodEnum("clock_in_method"),
  clockInPhoto: varchar("clock_in_photo", { length: 500 }),      // URL for customer-site photo

  // Clock-out
  clockOutTime: timestamp("clock_out_time", { mode: "string" }),
  clockOutLat: decimal("clock_out_lat", { precision: 10, scale: 7 }),
  clockOutLng: decimal("clock_out_lng", { precision: 10, scale: 7 }),
  clockOutDistanceMeters: decimal("clock_out_distance_meters", { precision: 8, scale: 1 }),
  clockOutMethod: clockMethodEnum("clock_out_method"),

  // Offsite
  isOffsite: boolean("is_offsite").notNull().default(false),
  offsiteCustomerName: varchar("offsite_customer_name", { length: 200 }),

  // Status & computed
  status: clockStatusEnum("clock_status").notNull().default("normal"),
  lateMinutes: integer("late_minutes").notNull().default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").notNull().default(0),
  workHours: decimal("work_hours", { precision: 5, scale: 2 }).notNull().default("0"),

  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("clock_records_employee_date_idx").on(table.employeeId, table.clockDate),
  index("clock_records_date_idx").on(table.clockDate),
]);

// ── 3. Attendance Group Members — 考勤组成员 ───────────────

export const attendanceGroupMembers = pgTable("attendance_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  assignedAt: timestamp("assigned_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("group_members_group_idx").on(table.groupId),
  index("group_members_employee_idx").on(table.employeeId),
]);

// ── 4. Attendance Excursions — 离岗追踪 ───────────────────
// Records when employees leave the geofence during work hours.
// Exits during configured break windows are marked as authorized.

export const attendanceExcursions = pgTable("attendance_excursions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  excursionDate: varchar("excursion_date", { length: 10 }).notNull(), // YYYY-MM-DD

  // Departure
  timestampOut: timestamp("timestamp_out", { mode: "string" }).notNull(),
  gpsLatOut: decimal("gps_lat_out", { precision: 10, scale: 7 }).notNull(),
  gpsLngOut: decimal("gps_lng_out", { precision: 10, scale: 7 }).notNull(),
  distanceMetersOut: decimal("distance_meters_out", { precision: 8, scale: 1 }),

  // Return (NULL = still out)
  timestampIn: timestamp("timestamp_in", { mode: "string" }),
  gpsLatIn: decimal("gps_lat_in", { precision: 10, scale: 7 }),
  gpsLngIn: decimal("gps_lng_in", { precision: 10, scale: 7 }),

  // Classification
  isDuringBreak: boolean("is_during_break").notNull().default(false),
  breakLabel: varchar("break_label", { length: 50 }),    // e.g. "午休"
  durationMinutes: integer("duration_minutes"),           // computed on return

  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("excursions_employee_date_idx").on(table.employeeId, table.excursionDate),
  index("excursions_date_idx").on(table.excursionDate),
]);

// ── Type exports ─────────────────────────────────────────

export type AttendanceGroup = InferSelectModel<typeof attendanceGroups>;
export type InsertAttendanceGroup = InferInsertModel<typeof attendanceGroups>;
export type AttendanceClockRecord = InferSelectModel<typeof attendanceClockRecords>;
export type InsertAttendanceClockRecord = InferInsertModel<typeof attendanceClockRecords>;
export type AttendanceGroupMember = InferSelectModel<typeof attendanceGroupMembers>;
export type AttendanceExcursion = InferSelectModel<typeof attendanceExcursions>;
export type InsertAttendanceExcursion = InferInsertModel<typeof attendanceExcursions>;
