/**
 * HMI Screen Schema — Auto-generated HMI touch-screen layouts
 *
 * Tables:
 * - hmi_screens: Generated HMI screen definitions per PLC project
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const hmiScreenTypeEnum = pgEnum("hmi_screen_type", [
  "main_overview", "station_detail", "alarm_list", "recipe_management",
  "trend_chart", "user_management", "maintenance", "diagnostics",
]);

export const hmiTargetPlatformEnum = pgEnum("hmi_target_platform", [
  "siemens_comfort", "siemens_unified", "weintek_eb", "pro_face", "generic_html",
]);

export interface HmiWidget {
  id: string;
  type: "gauge" | "bar" | "numericInput" | "button" | "indicator" | "trend" | "text" | "alarmBanner" | "listView";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  labelEn?: string;
  plcTag?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  alarmHigh?: number;
  alarmLow?: number;
  color?: string;
}

export interface HmiLayoutJson {
  screenWidth: number;
  screenHeight: number;
  backgroundColor: string;
  headerText: string;
  widgets: HmiWidget[];
  navigationLinks: Array<{ targetScreenIndex: number; label: string }>;
}

// ── HMI Screens ─────────────────────────────────────────────────────────

export const hmiScreens = pgTable("hmi_screens", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  plcProjectId: integer("plc_project_id").notNull(),
  screenIndex: integer("screen_index").notNull(),
  screenName: varchar("screen_name", { length: 200 }).notNull(),
  screenNameEn: varchar("screen_name_en", { length: 200 }).default(""),
  screenType: hmiScreenTypeEnum("screen_type").notNull(),
  targetPlatform: hmiTargetPlatformEnum("target_platform").notNull().default("siemens_comfort"),
  layoutJson: json("layout_json").$type<HmiLayoutJson>().default({
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#1a1a2e",
    headerText: "", widgets: [], navigationLinks: [],
  }),
  widgetCount: integer("widget_count").default(0),
  resolution: varchar("resolution", { length: 20 }).default("1920x1080"),
  generatedCode: text("generated_code").default(""),
  previewSvg: text("preview_svg").default(""),
  stationId: integer("station_id"), // nullable — null for overview/alarm/recipe screens
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hmi_screens_project_idx").on(table.projectId),
  index("hmi_screens_plc_project_idx").on(table.plcProjectId),
  index("hmi_screens_type_idx").on(table.screenType),
]);

export type HmiScreen = InferSelectModel<typeof hmiScreens>;
export type InsertHmiScreen = InferInsertModel<typeof hmiScreens>;
