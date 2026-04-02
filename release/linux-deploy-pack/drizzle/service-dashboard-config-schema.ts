/**
 * Service Dashboard Config Schema
 *
 * 2 tables storing configurable KPI data + project site locations,
 * replacing hardcoded constants in service-dashboard.router.ts.
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
} from "drizzle-orm/pg-core";

// ─── service_dashboard_kpis ──────────────────────────────────────────────────
// Stores region KPIs, China HQ metrics, NA metrics, service comparison data.
// Replaces REGION_OVERVIEW_MOCK, CHINA_HQ_METRICS, NA_METRICS_MOCK.

export const serviceDashboardKpis = pgTable(
  "service_dashboard_kpis",
  {
    id: serial("id").primaryKey(),
    category: varchar("category", { length: 30 }).notNull(), // region_overview | china_hq | north_america | service_comparison
    region: varchar("region", { length: 30 }),               // Asia | NorthAmerica | Europe | Other | null
    key: varchar("key", { length: 50 }).notNull(),           // projectCount | engineerCount | avgResponseHours | ...
    value: decimal("value", { precision: 12, scale: 2 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),      // 中文显示名
    unit: varchar("unit", { length: 20 }),                   // 个 | 人 | 小时 | % | 分
    source: varchar("source", { length: 20 }).notNull().default("manual"), // manual | system | import
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_sdk_category_region_key").on(t.category, t.region, t.key),
  ]
);

// ─── service_dashboard_locations ─────────────────────────────────────────────
// Stores project site coordinates. Replaces NA_PROJECT_LOCATIONS_MOCK.

export const serviceDashboardLocations = pgTable(
  "service_dashboard_locations",
  {
    id: serial("id").primaryKey(),
    region: varchar("region", { length: 30 }).notNull(),        // NorthAmerica | Europe | Asia
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 50 }),
    country: varchar("country", { length: 10 }).notNull(),
    lat: decimal("lat", { precision: 9, scale: 6 }).notNull(),
    lng: decimal("lng", { precision: 9, scale: 6 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | completed | planned
    clientName: varchar("client_name", { length: 200 }),
    equipmentType: varchar("equipment_type", { length: 200 }),
    engineerCount: integer("engineer_count").default(0),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_sdl_region").on(t.region),
  ]
);
