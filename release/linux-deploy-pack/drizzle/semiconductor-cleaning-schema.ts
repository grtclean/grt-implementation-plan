/**
 * Semiconductor Cleaning Schema
 *
 * 4 tables for TSMC-ready semiconductor-grade cleaning compliance:
 * 1. cleaning_recipes — parameter matrix per part type with SEMI compliance flags
 * 2. iso14644_cleanroom_classes — ISO 14644-1:2015 reference data (Class 1-9)
 * 3. semi_process_standards — SEMI F57/F63 validation rules
 * 4. cleanroom_environment_logs — real-time cleanroom condition logging with auto-verdict
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: cleaning_recipes
// ──────────────────────────────────────────────────────────────
export const cleaningRecipes = pgTable(
  "cleaning_recipes",
  {
    id: serial("id").primaryKey(),

    // Identity
    recipeCode: varchar("recipe_code", { length: 50 }).notNull().unique(),
    partType: varchar("part_type", { length: 100 }).notNull(),
    partMaterial: varchar("part_material", { length: 100 }),
    featureType: varchar("feature_type", { length: 50 }),

    // Parameters
    pressureBar: decimal("pressure_bar", { precision: 6, scale: 2 }),
    nozzleAngleDeg: decimal("nozzle_angle_deg", { precision: 6, scale: 2 }),
    flowRateLpm: decimal("flow_rate_lpm", { precision: 6, scale: 2 }),
    temperatureC: decimal("temperature_c", { precision: 6, scale: 2 }),
    distanceMm: decimal("distance_mm", { precision: 8, scale: 2 }),
    sprayDurationS: decimal("spray_duration_s", { precision: 8, scale: 2 }),
    mediaType: varchar("media_type", { length: 50 }),

    // TSMC/SEMI compliance flags
    semiCompliant: boolean("semi_compliant").default(false),
    iso14644Class: integer("iso14644_class"),
    tsmcQualified: boolean("tsmc_qualified").default(false),

    // Thresholds
    cleanlinessTargetMg: decimal("cleanliness_target_mg", { precision: 10, scale: 4 }),
    maxParticleSizeUm: decimal("max_particle_size_um", { precision: 10, scale: 2 }),

    // Validation
    validatedBy: varchar("validated_by", { length: 200 }),
    validatedAt: timestamp("validated_at", { mode: "string" }),
    status: varchar("status", { length: 20 }).default("draft").notNull(),

    // Metadata
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("cr_part_type_idx").on(table.partType),
    index("cr_feature_type_idx").on(table.featureType),
    index("cr_status_idx").on(table.status),
    index("cr_semi_compliant_idx").on(table.semiCompliant),
    index("cr_tsmc_qualified_idx").on(table.tsmcQualified),
  ],
);

export type CleaningRecipe = InferSelectModel<typeof cleaningRecipes>;
export type NewCleaningRecipe = InferInsertModel<typeof cleaningRecipes>;

// ──────────────────────────────────────────────────────────────
// Table 2: iso14644_cleanroom_classes
// ──────────────────────────────────────────────────────────────
export const iso14644CleanroomClasses = pgTable(
  "iso14644_cleanroom_classes",
  {
    id: serial("id").primaryKey(),
    isoClass: integer("iso_class").notNull().unique(),

    // Particle limits per m³ at various sizes (μm)
    maxParticles01um: integer("max_particles_01um"),
    maxParticles02um: integer("max_particles_02um"),
    maxParticles03um: integer("max_particles_03um"),
    maxParticles05um: integer("max_particles_05um"),
    maxParticles10um: integer("max_particles_10um"),
    maxParticles50um: integer("max_particles_50um"),

    description: text("description"),
    typicalApplications: jsonb("typical_applications"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
);

export type Iso14644CleanroomClass = InferSelectModel<typeof iso14644CleanroomClasses>;
export type NewIso14644CleanroomClass = InferInsertModel<typeof iso14644CleanroomClasses>;

// ──────────────────────────────────────────────────────────────
// Table 3: semi_process_standards
// ──────────────────────────────────────────────────────────────
export const semiProcessStandards = pgTable(
  "semi_process_standards",
  {
    id: serial("id").primaryKey(),

    standardCode: varchar("standard_code", { length: 30 }).notNull(),
    standardName: varchar("standard_name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),

    parameterName: varchar("parameter_name", { length: 100 }).notNull(),
    unit: varchar("unit", { length: 30 }),
    minValue: decimal("min_value", { precision: 15, scale: 6 }),
    maxValue: decimal("max_value", { precision: 15, scale: 6 }),
    targetValue: decimal("target_value", { precision: 15, scale: 6 }),

    applicableProcesses: jsonb("applicable_processes"),
    tsmcRequirement: boolean("tsmc_requirement").default(false),

    description: text("description"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sps_standard_code_idx").on(table.standardCode),
    index("sps_category_idx").on(table.category),
    index("sps_tsmc_requirement_idx").on(table.tsmcRequirement),
  ],
);

export type SemiProcessStandard = InferSelectModel<typeof semiProcessStandards>;
export type NewSemiProcessStandard = InferInsertModel<typeof semiProcessStandards>;

// ──────────────────────────────────────────────────────────────
// Table 4: cleanroom_environment_logs
// ──────────────────────────────────────────────────────────────
export const cleanroomEnvironmentLogs = pgTable(
  "cleanroom_environment_logs",
  {
    id: serial("id").primaryKey(),

    cleanroomId: varchar("cleanroom_id", { length: 50 }).notNull(),
    cleanroomName: varchar("cleanroom_name", { length: 200 }),
    isoClass: integer("iso_class"),

    // Measurements
    temperatureC: decimal("temperature_c", { precision: 6, scale: 2 }),
    humidityPct: decimal("humidity_pct", { precision: 5, scale: 2 }),
    pressureDiffPa: decimal("pressure_diff_pa", { precision: 8, scale: 2 }),
    particleCount05um: integer("particle_count_05um"),
    particleCount10um: integer("particle_count_10um"),
    particleCount50um: integer("particle_count_50um"),

    // Water quality
    diWaterResistivityMOhm: decimal("di_water_resistivity_mohm", { precision: 8, scale: 4 }),
    diWaterTocPpb: decimal("di_water_toc_ppb", { precision: 8, scale: 4 }),

    // Verdict
    verdict: varchar("verdict", { length: 10 }).default("PENDING").notNull(),
    violationDetails: jsonb("violation_details"),

    // Metadata
    measuredAt: timestamp("measured_at", { mode: "string" }).defaultNow().notNull(),
    measuredBy: varchar("measured_by", { length: 200 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("cel_cleanroom_id_idx").on(table.cleanroomId),
    index("cel_verdict_idx").on(table.verdict),
    index("cel_measured_at_idx").on(table.measuredAt),
    index("cel_iso_class_idx").on(table.isoClass),
  ],
);

export type CleanroomEnvironmentLog = InferSelectModel<typeof cleanroomEnvironmentLogs>;
export type NewCleanroomEnvironmentLog = InferInsertModel<typeof cleanroomEnvironmentLogs>;
