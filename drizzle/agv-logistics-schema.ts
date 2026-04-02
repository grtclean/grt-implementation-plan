/**
 * AGV Logistics Schema — AGV物流调度系统
 *
 * Five tables:
 * 1. agv_fleet             — AGV vehicle registry & real-time status
 * 2. agv_routes            — predefined route definitions with waypoints
 * 3. agv_transport_tasks   — material transport task queue & execution
 * 4. agv_traffic_rules     — zone-level traffic control rules
 * 5. agv_charging_stations — charging station registry & occupancy
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  index,
  json,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: agv_fleet
// ──────────────────────────────────────────────────────────────
export const agvFleet = pgTable(
  "agv_fleet",
  {
    id: serial("id").primaryKey(),
    agvCode: varchar("agv_code", { length: 30 }).unique().notNull(),
    model: varchar("model", { length: 100 }),
    manufacturer: varchar("manufacturer", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    loadCapacityKg: decimal("load_capacity_kg", { precision: 8, scale: 2 }).default("500"),
    batteryCapacityAh: decimal("battery_capacity_ah", { precision: 8, scale: 2 }),
    batteryPct: decimal("battery_pct", { precision: 5, scale: 2 }).default("100"),
    status: varchar("status", { length: 20 }).default("idle"),
    currentLocationX: decimal("current_location_x", { precision: 10, scale: 4 }),
    currentLocationY: decimal("current_location_y", { precision: 10, scale: 4 }),
    currentLocationZ: decimal("current_location_z", { precision: 10, scale: 4 }),
    targetLocationX: decimal("target_location_x", { precision: 10, scale: 4 }),
    targetLocationY: decimal("target_location_y", { precision: 10, scale: 4 }),
    currentZoneId: integer("current_zone_id"),
    uwbTagId: varchar("uwb_tag_id", { length: 50 }),
    speedMPerMin: decimal("speed_m_per_min", { precision: 6, scale: 2 }).default("30"),
    currentTaskId: integer("current_task_id"),
    navigationMode: varchar("navigation_mode", { length: 20 }).default("magnetic_strip"),
    lastMaintenanceAt: timestamp("last_maintenance_at", { mode: "string" }),
    nextMaintenanceAt: timestamp("next_maintenance_at", { mode: "string" }),
    totalDistanceKm: decimal("total_distance_km", { precision: 10, scale: 2 }).default("0"),
    totalTasksCompleted: integer("total_tasks_completed").default(0),
    ipAddress: varchar("ip_address", { length: 50 }),
    firmwareVersion: varchar("firmware_version", { length: 30 }),
    buCode: varchar("bu_code", { length: 20 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_af_agv_code").on(table.agvCode),
    index("idx_af_status").on(table.status),
    index("idx_af_current_zone_id").on(table.currentZoneId),
    index("idx_af_uwb_tag_id").on(table.uwbTagId),
  ],
);

export type AgvFleet = InferSelectModel<typeof agvFleet>;
export type NewAgvFleet = InferInsertModel<typeof agvFleet>;

// ──────────────────────────────────────────────────────────────
// Table 2: agv_routes
// ──────────────────────────────────────────────────────────────
export const agvRoutes = pgTable(
  "agv_routes",
  {
    id: serial("id").primaryKey(),
    routeCode: varchar("route_code", { length: 30 }).unique().notNull(),
    routeName: varchar("route_name", { length: 100 }).notNull(),
    fromZoneId: integer("from_zone_id").notNull(),
    fromZoneName: varchar("from_zone_name", { length: 100 }),
    toZoneId: integer("to_zone_id").notNull(),
    toZoneName: varchar("to_zone_name", { length: 100 }),
    waypoints: json("waypoints").notNull(),
    distanceM: decimal("distance_m", { precision: 8, scale: 2 }).notNull(),
    estimatedTimeSeconds: integer("estimated_time_seconds").notNull(),
    priority: integer("priority").default(5),
    isOneWay: boolean("is_one_way").default(false),
    maxConcurrentAgvs: integer("max_concurrent_agvs").default(1),
    routeType: varchar("route_type", { length: 20 }).default("standard"),
    isActive: boolean("is_active").default(true),
    usageCount: integer("usage_count").default(0),
    avgActualTimeSeconds: integer("avg_actual_time_seconds"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_ar_route_code").on(table.routeCode),
    index("idx_ar_from_to_zone").on(table.fromZoneId, table.toZoneId),
    index("idx_ar_priority").on(table.priority),
  ],
);

export type AgvRoute = InferSelectModel<typeof agvRoutes>;
export type NewAgvRoute = InferInsertModel<typeof agvRoutes>;

// ──────────────────────────────────────────────────────────────
// Table 3: agv_transport_tasks
// ──────────────────────────────────────────────────────────────
export const agvTransportTasks = pgTable(
  "agv_transport_tasks",
  {
    id: serial("id").primaryKey(),
    taskCode: varchar("task_code", { length: 30 }).unique().notNull(),
    agvId: integer("agv_id"),
    routeId: integer("route_id"),
    taskType: varchar("task_type", { length: 30 }).notNull(),
    fromLocation: varchar("from_location", { length: 100 }).notNull(),
    toLocation: varchar("to_location", { length: 100 }).notNull(),
    fromLocationX: decimal("from_location_x", { precision: 10, scale: 4 }),
    fromLocationY: decimal("from_location_y", { precision: 10, scale: 4 }),
    toLocationX: decimal("to_location_x", { precision: 10, scale: 4 }),
    toLocationY: decimal("to_location_y", { precision: 10, scale: 4 }),
    materialId: integer("material_id"),
    materialCode: varchar("material_code", { length: 50 }),
    materialName: varchar("material_name", { length: 200 }),
    quantity: decimal("quantity", { precision: 10, scale: 2 }),
    unit: varchar("unit", { length: 20 }),
    workOrderId: integer("work_order_id"),
    priority: integer("priority").default(5),
    status: varchar("status", { length: 20 }).default("queued"),
    requestedBy: integer("requested_by"),
    requestedAt: timestamp("requested_at", { mode: "string" }).defaultNow(),
    dispatchedAt: timestamp("dispatched_at", { mode: "string" }),
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    failureReason: text("failure_reason"),
    actualDistanceM: decimal("actual_distance_m", { precision: 8, scale: 2 }),
    actualTimeSeconds: integer("actual_time_seconds"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_att_task_code").on(table.taskCode),
    index("idx_att_agv_id").on(table.agvId),
    index("idx_att_status").on(table.status),
    index("idx_att_work_order_id").on(table.workOrderId),
    index("idx_att_priority_status").on(table.priority, table.status),
    index("idx_att_requested_at").on(table.requestedAt),
  ],
);

export type AgvTransportTask = InferSelectModel<typeof agvTransportTasks>;
export type NewAgvTransportTask = InferInsertModel<typeof agvTransportTasks>;

// ──────────────────────────────────────────────────────────────
// Table 4: agv_traffic_rules
// ──────────────────────────────────────────────────────────────
export const agvTrafficRules = pgTable(
  "agv_traffic_rules",
  {
    id: serial("id").primaryKey(),
    ruleCode: varchar("rule_code", { length: 30 }).unique().notNull(),
    fromZoneId: integer("from_zone_id").notNull(),
    toZoneId: integer("to_zone_id").notNull(),
    maxConcurrentAgvs: integer("max_concurrent_agvs").default(1),
    isOneWayOnly: boolean("is_one_way_only").default(false),
    allowedDirection: varchar("allowed_direction", { length: 20 }),
    priorityOverride: integer("priority_override"),
    speedLimitMPerMin: decimal("speed_limit_m_per_min", { precision: 6, scale: 2 }),
    timeRestriction: json("time_restriction"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_atr_from_to_zone").on(table.fromZoneId, table.toZoneId),
  ],
);

export type AgvTrafficRule = InferSelectModel<typeof agvTrafficRules>;
export type NewAgvTrafficRule = InferInsertModel<typeof agvTrafficRules>;

// ──────────────────────────────────────────────────────────────
// Table 5: agv_charging_stations
// ──────────────────────────────────────────────────────────────
export const agvChargingStations = pgTable(
  "agv_charging_stations",
  {
    id: serial("id").primaryKey(),
    stationCode: varchar("station_code", { length: 30 }).unique().notNull(),
    stationName: varchar("station_name", { length: 100 }),
    locationX: decimal("location_x", { precision: 10, scale: 4 }).notNull(),
    locationY: decimal("location_y", { precision: 10, scale: 4 }).notNull(),
    zoneId: integer("zone_id"),
    chargerType: varchar("charger_type", { length: 30 }).default("standard"),
    maxChargingPower: decimal("max_charging_power", { precision: 8, scale: 2 }),
    status: varchar("status", { length: 20 }).default("available"),
    currentAgvId: integer("current_agv_id"),
    currentAgvCode: varchar("current_agv_code", { length: 30 }),
    chargingStartAt: timestamp("charging_start_at", { mode: "string" }),
    estimatedCompleteAt: timestamp("estimated_complete_at", { mode: "string" }),
    totalChargeCycles: integer("total_charge_cycles").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_acs_station_code").on(table.stationCode),
    index("idx_acs_status").on(table.status),
    index("idx_acs_zone_id").on(table.zoneId),
  ],
);

export type AgvChargingStation = InferSelectModel<typeof agvChargingStations>;
export type NewAgvChargingStation = InferInsertModel<typeof agvChargingStations>;
