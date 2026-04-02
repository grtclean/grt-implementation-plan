/**
 * GRT-Init Schema — Factory Floor Environment Detection
 *
 * Tables:
 * - grt_environment_scans: Hardware detection scan sessions
 * - grt_detected_devices: Discovered industrial devices (PLC, robot, HMI)
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, boolean, index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const scanTypeEnum = pgEnum("grt_scan_type", [
  "network", "plc", "robot", "sharepoint", "database", "full",
]);

export const scanStatusEnum = pgEnum("grt_scan_status", [
  "running", "completed", "failed", "cancelled",
]);

export const deviceTypeEnum = pgEnum("grt_device_type", [
  "plc", "robot", "hmi", "sensor", "gateway", "drive", "switch", "unknown",
]);

export const deviceStatusEnum = pgEnum("grt_device_status", [
  "online", "offline", "error", "timeout",
]);

// ── Environment Scans ───────────────────────────────────────────────────

export const grtEnvironmentScans = pgTable("grt_environment_scans", {
  id: serial("id").primaryKey(),
  scanId: varchar("scan_id", { length: 64 }).notNull().unique(),
  scanType: scanTypeEnum("scan_type").notNull(),
  status: scanStatusEnum("status").notNull().default("running"),
  subnetRange: varchar("subnet_range", { length: 50 }).default("192.168.1.0/24"),
  devicesFound: integer("devices_found").default(0),
  results: json("results").$type<Record<string, unknown>>().default({}),
  errorMessage: text("error_message"),
  scannedBy: varchar("scanned_by", { length: 100 }).notNull(),
  startedAt: timestamp("started_at", { mode: "string" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "string" }),
}, (table) => [
  index("grt_scans_scan_id_idx").on(table.scanId),
  index("grt_scans_type_idx").on(table.scanType),
]);

export type GrtEnvironmentScan = InferSelectModel<typeof grtEnvironmentScans>;
export type InsertGrtEnvironmentScan = InferInsertModel<typeof grtEnvironmentScans>;

// ── Detected Devices ────────────────────────────────────────────────────

export const grtDetectedDevices = pgTable("grt_detected_devices", {
  id: serial("id").primaryKey(),
  scanId: varchar("scan_id", { length: 64 }).notNull(),
  deviceType: deviceTypeEnum("device_type").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  macAddress: varchar("mac_address", { length: 17 }),
  hostname: varchar("hostname", { length: 200 }),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 200 }),
  firmwareVersion: varchar("firmware_version", { length: 50 }),
  protocol: varchar("protocol", { length: 30 }), // PROFINET, Modbus_TCP, OPC-UA, S7, EtherNet/IP
  port: integer("port"),
  status: deviceStatusEnum("status").notNull().default("online"),
  responseTimeMs: integer("response_time_ms"),
  autoConfigApplied: boolean("auto_config_applied").default(false),
  configJson: json("config_json").$type<Record<string, unknown>>().default({}),
  detectedAt: timestamp("detected_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("grt_devices_scan_idx").on(table.scanId),
  index("grt_devices_type_idx").on(table.deviceType),
  index("grt_devices_ip_idx").on(table.ipAddress),
]);

export type GrtDetectedDevice = InferSelectModel<typeof grtDetectedDevices>;
export type InsertGrtDetectedDevice = InferInsertModel<typeof grtDetectedDevices>;
