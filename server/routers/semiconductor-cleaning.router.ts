/**
 * Semiconductor Cleaning Router
 *
 * TSMC-ready semiconductor-grade cleaning compliance system.
 * 5 sub-routers: recipe, semiValidation, environment, certification, monitor
 * ~32 procedures for recipe management, SEMI F57/F63 validation, cleanroom monitoring,
 * ISO 14644-1 certification, and operational dashboards.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  cleaningRecipes,
  iso14644CleanroomClasses,
  semiProcessStandards,
  cleanroomEnvironmentLogs,
} from "../../drizzle/semiconductor-cleaning-schema";
import {
  robotCleaningActions,
  oilingTorqueRecords,
  techPerformanceEntries,
} from "../../drizzle/robot-cleaning-performance-schema";
import { eq, desc, and, sql, count, gte, lte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("semiconductor-cleaning");
const toNum = (id: string | number) => (typeof id === "string" ? parseInt(id, 10) : id);

// ──── Sub-router A: Recipe Management ────

const recipeSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        partType: z.string().optional(),
        featureType: z.string().optional(),
        semiCompliant: z.boolean().optional(),
        tsmcQualified: z.boolean().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { partType, featureType, semiCompliant, tsmcQualified, status, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (partType) conditions.push(eq(cleaningRecipes.partType, partType));
      if (featureType) conditions.push(eq(cleaningRecipes.featureType, featureType));
      if (semiCompliant != null) conditions.push(eq(cleaningRecipes.semiCompliant, semiCompliant));
      if (tsmcQualified != null) conditions.push(eq(cleaningRecipes.tsmcQualified, tsmcQualified));
      if (status) conditions.push(eq(cleaningRecipes.status, status));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(cleaningRecipes).where(whereClause);
      const items = await db
        .select()
        .from(cleaningRecipes)
        .where(whereClause)
        .orderBy(desc(cleaningRecipes.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.id, toNum(input.id))).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      return row;
    }),

  create: requirePermission("mfg:semiconductor-cleaning:manage")
    .input(
      z.object({
        recipeCode: z.string().min(1).max(50),
        partType: z.string().min(1).max(100),
        partMaterial: z.string().max(100).optional(),
        featureType: z.string().max(50).optional(),
        pressureBar: z.number().optional(),
        nozzleAngleDeg: z.number().optional(),
        flowRateLpm: z.number().optional(),
        temperatureC: z.number().optional(),
        distanceMm: z.number().optional(),
        sprayDurationS: z.number().optional(),
        mediaType: z.string().max(50).optional(),
        semiCompliant: z.boolean().default(false),
        iso14644Class: z.number().min(1).max(9).optional(),
        tsmcQualified: z.boolean().default(false),
        cleanlinessTargetMg: z.number().optional(),
        maxParticleSizeUm: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .insert(cleaningRecipes)
        .values({
          ...input,
          pressureBar: input.pressureBar?.toString(),
          nozzleAngleDeg: input.nozzleAngleDeg?.toString(),
          flowRateLpm: input.flowRateLpm?.toString(),
          temperatureC: input.temperatureC?.toString(),
          distanceMm: input.distanceMm?.toString(),
          sprayDurationS: input.sprayDurationS?.toString(),
          cleanlinessTargetMg: input.cleanlinessTargetMg?.toString(),
          maxParticleSizeUm: input.maxParticleSizeUm?.toString(),
          status: "draft",
        })
        .returning();
      log.info({ id: result.id, recipeCode: input.recipeCode }, "Recipe created");
      return result;
    }),

  update: requirePermission("mfg:semiconductor-cleaning:manage")
    .input(
      z.object({
        id: z.number(),
        partType: z.string().max(100).optional(),
        partMaterial: z.string().max(100).optional(),
        featureType: z.string().max(50).optional(),
        pressureBar: z.number().optional(),
        nozzleAngleDeg: z.number().optional(),
        flowRateLpm: z.number().optional(),
        temperatureC: z.number().optional(),
        distanceMm: z.number().optional(),
        sprayDurationS: z.number().optional(),
        mediaType: z.string().max(50).optional(),
        semiCompliant: z.boolean().optional(),
        iso14644Class: z.number().min(1).max(9).optional(),
        tsmcQualified: z.boolean().optional(),
        cleanlinessTargetMg: z.number().optional(),
        maxParticleSizeUm: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (updates.partType != null) values.partType = updates.partType;
      if (updates.partMaterial != null) values.partMaterial = updates.partMaterial;
      if (updates.featureType != null) values.featureType = updates.featureType;
      if (updates.pressureBar != null) values.pressureBar = updates.pressureBar.toString();
      if (updates.nozzleAngleDeg != null) values.nozzleAngleDeg = updates.nozzleAngleDeg.toString();
      if (updates.flowRateLpm != null) values.flowRateLpm = updates.flowRateLpm.toString();
      if (updates.temperatureC != null) values.temperatureC = updates.temperatureC.toString();
      if (updates.distanceMm != null) values.distanceMm = updates.distanceMm.toString();
      if (updates.sprayDurationS != null) values.sprayDurationS = updates.sprayDurationS.toString();
      if (updates.mediaType != null) values.mediaType = updates.mediaType;
      if (updates.semiCompliant != null) values.semiCompliant = updates.semiCompliant;
      if (updates.iso14644Class != null) values.iso14644Class = updates.iso14644Class;
      if (updates.tsmcQualified != null) values.tsmcQualified = updates.tsmcQualified;
      if (updates.cleanlinessTargetMg != null) values.cleanlinessTargetMg = updates.cleanlinessTargetMg.toString();
      if (updates.maxParticleSizeUm != null) values.maxParticleSizeUm = updates.maxParticleSizeUm.toString();

      const [result] = await db.update(cleaningRecipes).set(values).where(eq(cleaningRecipes.id, id)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      log.info({ id }, "Recipe updated");
      return result;
    }),

  validate: requirePermission("mfg:semiconductor-cleaning:manage")
    .input(z.object({ id: z.number(), validatedBy: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(cleaningRecipes)
        .set({ status: "validated", validatedBy: input.validatedBy, validatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(cleaningRecipes.id, input.id))
        .returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      log.info({ id: input.id, validatedBy: input.validatedBy }, "Recipe validated");
      return result;
    }),

  promote: requirePermission("mfg:semiconductor-cleaning:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      if (existing.status !== "validated") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only validated recipes can be promoted to production" });
      }
      const [result] = await db
        .update(cleaningRecipes)
        .set({ status: "production", updatedAt: new Date().toISOString() })
        .where(eq(cleaningRecipes.id, input.id))
        .returning();
      log.info({ id: input.id }, "Recipe promoted to production");
      return result;
    }),

  deprecate: requirePermission("mfg:semiconductor-cleaning:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(cleaningRecipes)
        .set({ status: "deprecated", updatedAt: new Date().toISOString() })
        .where(eq(cleaningRecipes.id, input.id))
        .returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      log.info({ id: input.id }, "Recipe deprecated");
      return result;
    }),

  getByFeatureType: protectedProcedure
    .input(z.object({ featureType: z.string(), partMaterial: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(cleaningRecipes.featureType, input.featureType), eq(cleaningRecipes.status, "production")];
      if (input.partMaterial) conditions.push(eq(cleaningRecipes.partMaterial, input.partMaterial));
      const recipes = await db
        .select()
        .from(cleaningRecipes)
        .where(and(...conditions))
        .orderBy(desc(cleaningRecipes.tsmcQualified))
        .limit(10);
      return recipes;
    }),
});

// ──── Sub-router B: SEMI Validation ────

const semiValidationSubRouter = router({
  listStandards: protectedProcedure
    .input(z.object({ category: z.string().optional(), tsmcRequirement: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.category) conditions.push(eq(semiProcessStandards.category, input.category));
      if (input?.tsmcRequirement != null) conditions.push(eq(semiProcessStandards.tsmcRequirement, input.tsmcRequirement));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(semiProcessStandards).where(whereClause).orderBy(semiProcessStandards.standardCode).limit(200);
    }),

  seedStandards: requirePermission("mfg:semiconductor-cleaning:manage")
    .mutation(async () => {
      const db = await requireDb();

      // Seed ISO 14644-1:2015 classes
      const isoClasses = [
        { isoClass: 1, maxParticles01um: 10, maxParticles02um: 2, maxParticles05um: null, maxParticles10um: null, maxParticles50um: null, description: "ISO 1 — semiconductor fab" },
        { isoClass: 2, maxParticles01um: 100, maxParticles02um: 24, maxParticles03um: 10, maxParticles05um: 4, maxParticles10um: null, maxParticles50um: null, description: "ISO 2 — advanced semiconductor" },
        { isoClass: 3, maxParticles01um: 1000, maxParticles02um: 237, maxParticles03um: 102, maxParticles05um: 35, maxParticles10um: 8, maxParticles50um: null, description: "ISO 3 — semiconductor/pharmaceutical" },
        { isoClass: 4, maxParticles01um: 10000, maxParticles02um: 2370, maxParticles03um: 1020, maxParticles05um: 352, maxParticles10um: 83, maxParticles50um: null, description: "ISO 4 — precision cleaning" },
        { isoClass: 5, maxParticles01um: 100000, maxParticles02um: 23700, maxParticles03um: 10200, maxParticles05um: 3520, maxParticles10um: 832, maxParticles50um: 29, description: "ISO 5 — Class 100 (TSMC typical)" },
        { isoClass: 6, maxParticles05um: 35200, maxParticles10um: 8320, maxParticles50um: 293, description: "ISO 6 — Class 1000" },
        { isoClass: 7, maxParticles05um: 352000, maxParticles10um: 83200, maxParticles50um: 2930, description: "ISO 7 — Class 10000" },
        { isoClass: 8, maxParticles05um: 3520000, maxParticles10um: 832000, maxParticles50um: 29300, description: "ISO 8 — Class 100000" },
        { isoClass: 9, maxParticles05um: 35200000, maxParticles10um: 8320000, maxParticles50um: 293000, description: "ISO 9 — ambient" },
      ];

      for (const cls of isoClasses) {
        const existing = await db.select().from(iso14644CleanroomClasses).where(eq(iso14644CleanroomClasses.isoClass, cls.isoClass)).limit(1);
        if (existing.length === 0) {
          await db.insert(iso14644CleanroomClasses).values(cls);
        }
      }

      // Seed SEMI standards
      const semiStds = [
        { standardCode: "SEMI-F57", standardName: "Specification for Polymer Materials Used in Cleanroom Environments", category: "water_quality", parameterName: "DI Water Resistivity", unit: "MΩ·cm", minValue: "18.000000", targetValue: "18.200000", tsmcRequirement: true, description: "Minimum DI water resistivity for semiconductor cleaning" },
        { standardCode: "SEMI-F57", standardName: "Specification for Polymer Materials Used in Cleanroom Environments", category: "water_quality", parameterName: "TOC", unit: "ppb", maxValue: "5.000000", targetValue: "2.000000", tsmcRequirement: true, description: "Maximum total organic carbon in DI water" },
        { standardCode: "SEMI-F63", standardName: "Guide for Ultrapure Water Used in Semiconductor Processing", category: "particle", parameterName: "Particle Count (≥0.5μm)", unit: "particles/mL", maxValue: "1.000000", tsmcRequirement: true, description: "Maximum particle count in UPW at 0.5μm" },
        { standardCode: "SEMI-F63", standardName: "Guide for Ultrapure Water Used in Semiconductor Processing", category: "chemical", parameterName: "Metal Ion Content", unit: "ppt", maxValue: "10.000000", tsmcRequirement: true, description: "Maximum dissolved metal ions" },
        { standardCode: "VDA-19.1", standardName: "Technical Cleanliness Inspection of Functionally Relevant Automotive Parts", category: "particle", parameterName: "Max Particle Size", unit: "μm", maxValue: "600.000000", tsmcRequirement: false, description: "VDA 19.1 particle size limit for automotive" },
        { standardCode: "VDA-19.1", standardName: "Technical Cleanliness Inspection of Functionally Relevant Automotive Parts", category: "particle", parameterName: "Gravimetric Cleanliness", unit: "mg", maxValue: "5.000000", tsmcRequirement: false, description: "VDA 19.1 gravimetric cleanliness limit" },
      ];

      for (const std of semiStds) {
        const existing = await db.select().from(semiProcessStandards).where(and(
          eq(semiProcessStandards.standardCode, std.standardCode),
          eq(semiProcessStandards.parameterName, std.parameterName),
        )).limit(1);
        if (existing.length === 0) {
          await db.insert(semiProcessStandards).values(std);
        }
      }

      log.info("SEMI/ISO standards seeded");
      return { success: true, isoClassesSeeded: isoClasses.length, semiStandardsSeeded: semiStds.length };
    }),

  validateRecipe: protectedProcedure
    .input(z.object({ recipeId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [recipe] = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.id, input.recipeId)).limit(1);
      if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });

      const standards = await db.select().from(semiProcessStandards).where(eq(semiProcessStandards.tsmcRequirement, true)).limit(200);
      const violations: Array<{ standard: string; parameter: string; issue: string }> = [];

      // Check recipe cleanliness target against VDA 19.1
      if (recipe.cleanlinessTargetMg && Number(recipe.cleanlinessTargetMg) > 5.0) {
        violations.push({ standard: "VDA-19.1", parameter: "cleanlinessTargetMg", issue: `Target ${recipe.cleanlinessTargetMg}mg exceeds 5.0mg limit` });
      }

      // Check ISO class compliance
      if (recipe.iso14644Class) {
        const [isoClass] = await db.select().from(iso14644CleanroomClasses).where(eq(iso14644CleanroomClasses.isoClass, recipe.iso14644Class)).limit(1);
        if (!isoClass) {
          violations.push({ standard: "ISO-14644-1", parameter: "isoClass", issue: `Unknown ISO class ${recipe.iso14644Class}` });
        }
      }

      // Check particle size against SEMI standards
      if (recipe.maxParticleSizeUm) {
        for (const std of standards) {
          if (std.parameterName === "Max Particle Size" && std.maxValue && Number(recipe.maxParticleSizeUm) > Number(std.maxValue)) {
            violations.push({ standard: std.standardCode, parameter: "maxParticleSizeUm", issue: `Particle size ${recipe.maxParticleSizeUm}μm exceeds ${std.maxValue}μm limit` });
          }
        }
      }

      return {
        recipeId: recipe.id,
        recipeCode: recipe.recipeCode,
        compliant: violations.length === 0,
        violations,
        standardsChecked: standards.length,
      };
    }),

  validateEnvironment: protectedProcedure
    .input(z.object({ logId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [logEntry] = await db.select().from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.id, input.logId)).limit(1);
      if (!logEntry) throw new TRPCError({ code: "NOT_FOUND", message: "Environment log not found" });

      const violations: Array<{ parameter: string; measured: number; limit: number; unit: string }> = [];

      if (logEntry.isoClass) {
        const [isoClass] = await db.select().from(iso14644CleanroomClasses).where(eq(iso14644CleanroomClasses.isoClass, logEntry.isoClass)).limit(1);
        if (isoClass) {
          if (logEntry.particleCount05um != null && isoClass.maxParticles05um != null && logEntry.particleCount05um > isoClass.maxParticles05um) {
            violations.push({ parameter: "particleCount05um", measured: logEntry.particleCount05um, limit: isoClass.maxParticles05um, unit: "particles/m³" });
          }
          if (logEntry.particleCount10um != null && isoClass.maxParticles10um != null && logEntry.particleCount10um > isoClass.maxParticles10um) {
            violations.push({ parameter: "particleCount10um", measured: logEntry.particleCount10um, limit: isoClass.maxParticles10um, unit: "particles/m³" });
          }
          if (logEntry.particleCount50um != null && isoClass.maxParticles50um != null && logEntry.particleCount50um > isoClass.maxParticles50um) {
            violations.push({ parameter: "particleCount50um", measured: logEntry.particleCount50um, limit: isoClass.maxParticles50um, unit: "particles/m³" });
          }
        }
      }

      // SEMI F57 DI water checks
      if (logEntry.diWaterResistivityMOhm != null && Number(logEntry.diWaterResistivityMOhm) < 18) {
        violations.push({ parameter: "diWaterResistivityMOhm", measured: Number(logEntry.diWaterResistivityMOhm), limit: 18, unit: "MΩ·cm" });
      }
      if (logEntry.diWaterTocPpb != null && Number(logEntry.diWaterTocPpb) > 5) {
        violations.push({ parameter: "diWaterTocPpb", measured: Number(logEntry.diWaterTocPpb), limit: 5, unit: "ppb" });
      }

      return {
        logId: logEntry.id,
        cleanroomId: logEntry.cleanroomId,
        verdict: violations.length === 0 ? "PASS" : "FAIL",
        violations,
      };
    }),

  getTsmcChecklist: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [recipeCount] = await db.select({ count: count() }).from(cleaningRecipes);
    const [qualifiedCount] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.tsmcQualified, true));
    const [semiCount] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.semiCompliant, true));
    const [envPassCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "PASS"));
    const [envTotalCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs);

    return {
      totalRecipes: Number(recipeCount?.count ?? 0),
      tsmcQualifiedRecipes: Number(qualifiedCount?.count ?? 0),
      semiCompliantRecipes: Number(semiCount?.count ?? 0),
      environmentPassCount: Number(envPassCount?.count ?? 0),
      environmentTotalCount: Number(envTotalCount?.count ?? 0),
      checklist: [
        { item: "SEMI F57 DI Water Quality", status: Number(envPassCount?.count ?? 0) > 0 ? "PASS" : "PENDING" },
        { item: "ISO 14644-1 Cleanroom Class", status: Number(envPassCount?.count ?? 0) > 0 ? "PASS" : "PENDING" },
        { item: "Recipe TSMC Qualification", status: Number(qualifiedCount?.count ?? 0) > 0 ? "PASS" : "PENDING" },
        { item: "VDA 19.1 Cross-check", status: Number(semiCount?.count ?? 0) > 0 ? "PASS" : "PENDING" },
      ],
    };
  }),

  getCertificationStatus: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [totalRecipes] = await db.select({ count: count() }).from(cleaningRecipes);
    const [qualifiedRecipes] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.tsmcQualified, true));
    const [envPass] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "PASS"));
    const [envTotal] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs);
    const [standardsCount] = await db.select({ count: count() }).from(semiProcessStandards);

    const total = Number(totalRecipes?.count ?? 0);
    const qualified = Number(qualifiedRecipes?.count ?? 0);
    const recipeQualificationRate = total > 0 ? qualified / total : 0;
    const envTotal_ = Number(envTotal?.count ?? 0);
    const envPass_ = Number(envPass?.count ?? 0);
    const environmentPassRate = envTotal_ > 0 ? envPass_ / envTotal_ : 0;

    return {
      recipeQualificationRate,
      environmentPassRate,
      standardsLoaded: Number(standardsCount?.count ?? 0),
      overallReadiness: recipeQualificationRate > 0.8 && environmentPassRate > 0.9 ? "READY" : "NOT_READY",
    };
  }),

  generateComplianceReport: requirePermission("mfg:semiconductor-cleaning:manage")
    .mutation(async () => {
      const db = await requireDb();
      const recipes = await db.select().from(cleaningRecipes).orderBy(cleaningRecipes.recipeCode).limit(500);
      const standards = await db.select().from(semiProcessStandards).limit(200);
      const envLogs = await db.select().from(cleanroomEnvironmentLogs).orderBy(desc(cleanroomEnvironmentLogs.measuredAt)).limit(100);
      const isoClasses = await db.select().from(iso14644CleanroomClasses).orderBy(iso14644CleanroomClasses.isoClass).limit(9);

      const tsmcQualified = recipes.filter((r) => r.tsmcQualified);
      const semiCompliant = recipes.filter((r) => r.semiCompliant);
      const envPassing = envLogs.filter((e) => e.verdict === "PASS");

      return {
        generatedAt: new Date().toISOString(),
        summary: {
          totalRecipes: recipes.length,
          tsmcQualified: tsmcQualified.length,
          semiCompliant: semiCompliant.length,
          environmentReadings: envLogs.length,
          environmentPassing: envPassing.length,
          standardsReferenced: standards.length,
          isoClassesLoaded: isoClasses.length,
        },
        recipes: recipes.map((r) => ({
          recipeCode: r.recipeCode,
          partType: r.partType,
          status: r.status,
          tsmcQualified: r.tsmcQualified,
          semiCompliant: r.semiCompliant,
          iso14644Class: r.iso14644Class,
        })),
        recentEnvironment: envLogs.slice(0, 10).map((e) => ({
          cleanroomId: e.cleanroomId,
          verdict: e.verdict,
          measuredAt: e.measuredAt,
          particleCount05um: e.particleCount05um,
          diWaterResistivityMOhm: e.diWaterResistivityMOhm,
        })),
      };
    }),
});

// ──── Sub-router C: Environment Monitoring ────

const environmentSubRouter = router({
  logReading: requirePermission("mfg:cleanroom:manage")
    .input(
      z.object({
        cleanroomId: z.string().min(1).max(50),
        cleanroomName: z.string().max(200).optional(),
        isoClass: z.number().min(1).max(9).optional(),
        temperatureC: z.number().optional(),
        humidityPct: z.number().optional(),
        pressureDiffPa: z.number().optional(),
        particleCount05um: z.number().int().optional(),
        particleCount10um: z.number().int().optional(),
        particleCount50um: z.number().int().optional(),
        diWaterResistivityMOhm: z.number().optional(),
        diWaterTocPpb: z.number().optional(),
        measuredBy: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Auto-compute verdict
      let verdict = "PASS";
      const violations: Array<{ parameter: string; issue: string }> = [];

      if (input.isoClass) {
        const [isoClass] = await db.select().from(iso14644CleanroomClasses).where(eq(iso14644CleanroomClasses.isoClass, input.isoClass)).limit(1);
        if (isoClass) {
          if (input.particleCount05um != null && isoClass.maxParticles05um != null && input.particleCount05um > isoClass.maxParticles05um) {
            violations.push({ parameter: "particleCount05um", issue: `${input.particleCount05um} > ${isoClass.maxParticles05um}` });
          }
          if (input.particleCount10um != null && isoClass.maxParticles10um != null && input.particleCount10um > isoClass.maxParticles10um) {
            violations.push({ parameter: "particleCount10um", issue: `${input.particleCount10um} > ${isoClass.maxParticles10um}` });
          }
          if (input.particleCount50um != null && isoClass.maxParticles50um != null && input.particleCount50um > isoClass.maxParticles50um) {
            violations.push({ parameter: "particleCount50um", issue: `${input.particleCount50um} > ${isoClass.maxParticles50um}` });
          }
        }
      }

      if (input.diWaterResistivityMOhm != null && input.diWaterResistivityMOhm < 18) {
        violations.push({ parameter: "diWaterResistivityMOhm", issue: `${input.diWaterResistivityMOhm} < 18 MΩ·cm` });
      }
      if (input.diWaterTocPpb != null && input.diWaterTocPpb > 5) {
        violations.push({ parameter: "diWaterTocPpb", issue: `${input.diWaterTocPpb} > 5 ppb` });
      }

      if (violations.length > 0) verdict = "FAIL";

      const [result] = await db
        .insert(cleanroomEnvironmentLogs)
        .values({
          cleanroomId: input.cleanroomId,
          cleanroomName: input.cleanroomName,
          isoClass: input.isoClass,
          temperatureC: input.temperatureC?.toString(),
          humidityPct: input.humidityPct?.toString(),
          pressureDiffPa: input.pressureDiffPa?.toString(),
          particleCount05um: input.particleCount05um,
          particleCount10um: input.particleCount10um,
          particleCount50um: input.particleCount50um,
          diWaterResistivityMOhm: input.diWaterResistivityMOhm?.toString(),
          diWaterTocPpb: input.diWaterTocPpb?.toString(),
          verdict,
          violationDetails: violations.length > 0 ? violations : null,
          measuredBy: input.measuredBy,
        })
        .returning();

      if (verdict === "FAIL") {
        log.warn({ cleanroomId: input.cleanroomId, violations: violations.length }, "Cleanroom environment FAIL");
      }
      return result;
    }),

  listLogs: protectedProcedure
    .input(
      z.object({
        cleanroomId: z.string().optional(),
        verdict: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { cleanroomId, verdict, startDate, endDate, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (cleanroomId) conditions.push(eq(cleanroomEnvironmentLogs.cleanroomId, cleanroomId));
      if (verdict) conditions.push(eq(cleanroomEnvironmentLogs.verdict, verdict));
      if (startDate) conditions.push(gte(cleanroomEnvironmentLogs.measuredAt, startDate));
      if (endDate) conditions.push(lte(cleanroomEnvironmentLogs.measuredAt, endDate));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(whereClause);
      const items = await db
        .select()
        .from(cleanroomEnvironmentLogs)
        .where(whereClause)
        .orderBy(desc(cleanroomEnvironmentLogs.measuredAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getLatestByCleanroom: protectedProcedure
    .input(z.object({ cleanroomId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(cleanroomEnvironmentLogs)
        .where(eq(cleanroomEnvironmentLogs.cleanroomId, input.cleanroomId))
        .orderBy(desc(cleanroomEnvironmentLogs.measuredAt))
        .limit(1);
      return row ?? null;
    }),

  getCleanroomList: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({ cleanroomId: cleanroomEnvironmentLogs.cleanroomId, cleanroomName: cleanroomEnvironmentLogs.cleanroomName })
      .from(cleanroomEnvironmentLogs)
      .groupBy(cleanroomEnvironmentLogs.cleanroomId, cleanroomEnvironmentLogs.cleanroomName)
      .limit(100);
    return rows;
  }),

  getTrend: protectedProcedure
    .input(z.object({ cleanroomId: z.string(), parameter: z.enum(["temperatureC", "humidityPct", "particleCount05um", "particleCount10um", "diWaterResistivityMOhm"]), limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const logs = await db
        .select()
        .from(cleanroomEnvironmentLogs)
        .where(eq(cleanroomEnvironmentLogs.cleanroomId, input.cleanroomId))
        .orderBy(desc(cleanroomEnvironmentLogs.measuredAt))
        .limit(input.limit);
      return logs.reverse().map((l) => ({
        measuredAt: l.measuredAt,
        value: Number((l as Record<string, unknown>)[input.parameter] ?? 0),
        verdict: l.verdict,
      }));
    }),

  getAlerts: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(cleanroomEnvironmentLogs)
        .where(eq(cleanroomEnvironmentLogs.verdict, "FAIL"))
        .orderBy(desc(cleanroomEnvironmentLogs.measuredAt))
        .limit(input?.limit ?? 50);
    }),

  getDashboard: protectedProcedure.query(async () => {
    const db = await requireDb();
    const cleanrooms = await db
      .select({ cleanroomId: cleanroomEnvironmentLogs.cleanroomId })
      .from(cleanroomEnvironmentLogs)
      .groupBy(cleanroomEnvironmentLogs.cleanroomId)
      .limit(100);
    const [passCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "PASS"));
    const [failCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "FAIL"));
    const [totalCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs);

    return {
      totalCleanrooms: cleanrooms.length,
      totalReadings: Number(totalCount?.count ?? 0),
      passingReadings: Number(passCount?.count ?? 0),
      failingReadings: Number(failCount?.count ?? 0),
    };
  }),
});

// ──── Sub-router D: Certification ────

const certificationSubRouter = router({
  getIso14644Classes: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(iso14644CleanroomClasses).orderBy(iso14644CleanroomClasses.isoClass).limit(9);
  }),

  getClassForCleanroom: protectedProcedure
    .input(z.object({ cleanroomId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [latest] = await db
        .select()
        .from(cleanroomEnvironmentLogs)
        .where(eq(cleanroomEnvironmentLogs.cleanroomId, input.cleanroomId))
        .orderBy(desc(cleanroomEnvironmentLogs.measuredAt))
        .limit(1);

      if (!latest) return { cleanroomId: input.cleanroomId, achievedClass: null, message: "No readings found" };

      const isoClasses = await db.select().from(iso14644CleanroomClasses).orderBy(iso14644CleanroomClasses.isoClass).limit(9);

      // Find the most stringent class that the cleanroom satisfies
      let achievedClass: number | null = null;
      for (const cls of isoClasses) {
        let passes = true;
        if (latest.particleCount05um != null && cls.maxParticles05um != null && latest.particleCount05um > cls.maxParticles05um) passes = false;
        if (latest.particleCount10um != null && cls.maxParticles10um != null && latest.particleCount10um > cls.maxParticles10um) passes = false;
        if (latest.particleCount50um != null && cls.maxParticles50um != null && latest.particleCount50um > cls.maxParticles50um) passes = false;
        if (passes) {
          achievedClass = cls.isoClass;
          break;
        }
      }

      return { cleanroomId: input.cleanroomId, achievedClass, latestReading: latest.measuredAt };
    }),

  getSemiStandardsByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(semiProcessStandards).where(eq(semiProcessStandards.category, input.category)).limit(100);
    }),

  getComplianceMatrix: protectedProcedure.query(async () => {
    const db = await requireDb();
    const recipes = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.status, "production")).limit(200);
    const standards = await db.select().from(semiProcessStandards).limit(200);

    const matrix = recipes.map((recipe) => {
      const cells = standards.map((std) => {
        let pass = true;
        if (std.parameterName === "Gravimetric Cleanliness" && recipe.cleanlinessTargetMg && std.maxValue) {
          pass = Number(recipe.cleanlinessTargetMg) <= Number(std.maxValue);
        }
        if (std.parameterName === "Max Particle Size" && recipe.maxParticleSizeUm && std.maxValue) {
          pass = Number(recipe.maxParticleSizeUm) <= Number(std.maxValue);
        }
        return { standardCode: std.standardCode, parameterName: std.parameterName, pass };
      });
      return { recipeCode: recipe.recipeCode, partType: recipe.partType, cells };
    });

    return { matrix, totalRecipes: recipes.length, totalStandards: standards.length };
  }),
});

// ──── Sub-router E: Monitor Dashboard ────

const monitorSubRouter = router({
  getDashboard: protectedProcedure.query(async () => {
    const db = await requireDb();
    const today = new Date().toISOString().split("T")[0];

    const [totalActions] = await db.select({ count: count() }).from(robotCleaningActions).where(gte(robotCleaningActions.createdAt, today));
    const [passActions] = await db.select({ count: count() }).from(robotCleaningActions).where(and(gte(robotCleaningActions.createdAt, today), eq(robotCleaningActions.cleanlinessVerdict, "PASS")));
    const [alertActions] = await db.select({ count: count() }).from(robotCleaningActions).where(and(gte(robotCleaningActions.createdAt, today), eq(robotCleaningActions.hasAlert, true)));

    const totalN = Number(totalActions?.count ?? 0);
    const passN = Number(passActions?.count ?? 0);

    // Recipe status breakdown
    const [draftCount] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.status, "draft"));
    const [validatedCount] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.status, "validated"));
    const [productionCount] = await db.select({ count: count() }).from(cleaningRecipes).where(eq(cleaningRecipes.status, "production"));

    // Environment status
    const [envPassCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "PASS"));
    const [envFailCount] = await db.select({ count: count() }).from(cleanroomEnvironmentLogs).where(eq(cleanroomEnvironmentLogs.verdict, "FAIL"));

    return {
      todayActions: totalN,
      todayPassRate: totalN > 0 ? passN / totalN : 0,
      todayAlerts: Number(alertActions?.count ?? 0),
      recipes: {
        draft: Number(draftCount?.count ?? 0),
        validated: Number(validatedCount?.count ?? 0),
        production: Number(productionCount?.count ?? 0),
      },
      environment: {
        passing: Number(envPassCount?.count ?? 0),
        failing: Number(envFailCount?.count ?? 0),
      },
    };
  }),

  getRobotFleet: protectedProcedure.query(async () => {
    const db = await requireDb();
    const robots = await db
      .select({ robotCode: robotCleaningActions.robotCode })
      .from(robotCleaningActions)
      .groupBy(robotCleaningActions.robotCode)
      .limit(50);

    const fleet = [];
    for (const robot of robots) {
      const [latest] = await db
        .select()
        .from(robotCleaningActions)
        .where(eq(robotCleaningActions.robotCode, robot.robotCode))
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(1);
      fleet.push({
        robotCode: robot.robotCode,
        lastActionAt: latest?.createdAt ?? null,
        lastVerdict: latest?.cleanlinessVerdict ?? null,
        hasAlert: latest?.hasAlert ?? false,
      });
    }
    return fleet;
  }),

  getAdaptiveHistory: protectedProcedure
    .input(z.object({ robotCode: z.string().optional(), limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(robotCleaningActions.isAdaptive, true)];
      if (input?.robotCode) conditions.push(eq(robotCleaningActions.robotCode, input.robotCode));

      const history = await db
        .select()
        .from(robotCleaningActions)
        .where(and(...conditions))
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(input?.limit ?? 20);

      return history.map((h) => ({
        id: h.id,
        robotCode: h.robotCode,
        pressure: Number(h.pressureBar ?? 0),
        angle: Number(h.nozzleAngleDeg ?? 0),
        cleanliness: Number(h.cleanlinessAfterMg ?? 0),
        verdict: h.cleanlinessVerdict,
        adjustment: h.adaptiveAdjustmentJson,
        createdAt: h.createdAt,
      }));
    }),

  getShiftSummary: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const targetDate = input?.date ?? new Date().toISOString().split("T")[0];
      const entries = await db
        .select()
        .from(techPerformanceEntries)
        .where(eq(techPerformanceEntries.workDate, targetDate))
        .limit(500);

      const shifts: Record<string, { count: number; avgEfficiency: number; passCount: number }> = {};
      for (const entry of entries) {
        const shift = entry.shiftCode ?? "unassigned";
        if (!shifts[shift]) shifts[shift] = { count: 0, avgEfficiency: 0, passCount: 0 };
        shifts[shift].count++;
        shifts[shift].avgEfficiency += Number(entry.cycleEfficiency ?? 0);
        if (entry.qualityPass) shifts[shift].passCount++;
      }

      return Object.entries(shifts).map(([shiftCode, data]) => ({
        shiftCode,
        totalEntries: data.count,
        avgEfficiency: data.count > 0 ? data.avgEfficiency / data.count : 0,
        passRate: data.count > 0 ? data.passCount / data.count : 0,
      }));
    }),

  getRecipeEffectiveness: protectedProcedure.query(async () => {
    const db = await requireDb();
    const recipes = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.status, "production")).limit(50);

    const effectiveness = [];
    for (const recipe of recipes) {
      if (!recipe.featureType) continue;
      // Count cleaning actions that match this recipe's feature type (approximate match via partType)
      const [usageCount] = await db.select({ count: count() }).from(robotCleaningActions).where(eq(robotCleaningActions.stationCode, recipe.recipeCode));
      const actions = await db
        .select()
        .from(robotCleaningActions)
        .where(eq(robotCleaningActions.stationCode, recipe.recipeCode))
        .limit(200);

      const totalUsage = Number(usageCount?.count ?? 0);
      const passCount = actions.filter((a) => a.cleanlinessVerdict === "PASS").length;
      const avgCleanliness = actions.length > 0
        ? actions.reduce((sum, a) => sum + Number(a.cleanlinessAfterMg ?? 0), 0) / actions.length
        : 0;

      effectiveness.push({
        recipeCode: recipe.recipeCode,
        partType: recipe.partType,
        usageCount: totalUsage,
        passRate: totalUsage > 0 ? passCount / totalUsage : 0,
        avgCleanliness,
      });
    }

    return effectiveness;
  }),

  seedDemo: requirePermission("mfg:semiconductor-cleaning:manage").mutation(async () => {
    const db = await requireDb();

    // Seed 5 recipes
    const recipeData = [
      { recipeCode: "RC-SEMI-001", partType: "Wafer Carrier", partMaterial: "PEEK", featureType: "blind_hole", pressureBar: "4.50", nozzleAngleDeg: "15.00", flowRateLpm: "8.00", temperatureC: "25.00", sprayDurationS: "30.00", mediaType: "DI water", semiCompliant: true, iso14644Class: 5, tsmcQualified: true, cleanlinessTargetMg: "0.50", maxParticleSizeUm: "5.00", status: "production" },
      { recipeCode: "RC-SEMI-002", partType: "Chuck Body", partMaterial: "Aluminum 6061", featureType: "sealing_face", pressureBar: "3.00", nozzleAngleDeg: "30.00", flowRateLpm: "6.00", temperatureC: "22.00", sprayDurationS: "45.00", mediaType: "DI water", semiCompliant: true, iso14644Class: 4, tsmcQualified: true, cleanlinessTargetMg: "0.30", maxParticleSizeUm: "2.00", status: "production" },
      { recipeCode: "RC-SEMI-003", partType: "Gas Distribution Plate", partMaterial: "SiC", featureType: "deep_cavity", pressureBar: "5.50", nozzleAngleDeg: "10.00", flowRateLpm: "12.00", temperatureC: "28.00", sprayDurationS: "60.00", mediaType: "ultrasonic", semiCompliant: true, iso14644Class: 3, tsmcQualified: false, cleanlinessTargetMg: "0.10", maxParticleSizeUm: "0.50", status: "validated" },
      { recipeCode: "RC-SEMI-004", partType: "Showerhead", partMaterial: "Quartz", featureType: "thread", pressureBar: "2.50", nozzleAngleDeg: "45.00", flowRateLpm: "5.00", temperatureC: "20.00", sprayDurationS: "25.00", mediaType: "chemical", semiCompliant: false, iso14644Class: 5, tsmcQualified: false, cleanlinessTargetMg: "1.00", maxParticleSizeUm: "10.00", status: "draft" },
      { recipeCode: "RC-SEMI-005", partType: "Focus Ring", partMaterial: "Silicon", featureType: "ribbing", pressureBar: "3.50", nozzleAngleDeg: "20.00", flowRateLpm: "7.00", temperatureC: "24.00", sprayDurationS: "35.00", mediaType: "DI water", semiCompliant: true, iso14644Class: 4, tsmcQualified: true, cleanlinessTargetMg: "0.20", maxParticleSizeUm: "3.00", status: "production" },
    ];

    for (const recipe of recipeData) {
      const existing = await db.select().from(cleaningRecipes).where(eq(cleaningRecipes.recipeCode, recipe.recipeCode)).limit(1);
      if (existing.length === 0) {
        await db.insert(cleaningRecipes).values(recipe);
      }
    }

    // Seed 20 environment logs
    const cleanrooms = ["CR-FAB-A", "CR-FAB-B", "CR-TOOL-C", "CR-TOOL-D"];
    for (let i = 0; i < 20; i++) {
      const cr = cleanrooms[i % cleanrooms.length];
      const isFailing = i % 7 === 0;
      await db.insert(cleanroomEnvironmentLogs).values({
        cleanroomId: cr,
        cleanroomName: `Cleanroom ${cr}`,
        isoClass: 5,
        temperatureC: (22 + Math.random() * 2).toFixed(2),
        humidityPct: (42 + Math.random() * 6).toFixed(2),
        pressureDiffPa: (12 + Math.random() * 3).toFixed(2),
        particleCount05um: isFailing ? 5000 : Math.floor(1000 + Math.random() * 2000),
        particleCount10um: isFailing ? 1200 : Math.floor(200 + Math.random() * 500),
        particleCount50um: isFailing ? 50 : Math.floor(5 + Math.random() * 20),
        diWaterResistivityMOhm: isFailing ? "16.50" : (18.1 + Math.random() * 0.3).toFixed(4),
        diWaterTocPpb: isFailing ? "7.50" : (1.5 + Math.random() * 2).toFixed(4),
        verdict: isFailing ? "FAIL" : "PASS",
        violationDetails: isFailing ? [{ parameter: "particleCount05um", issue: "Exceeded ISO 5 limit" }] : null,
        measuredBy: "System Auto-Sensor",
      });
    }

    log.info("Semiconductor cleaning demo data seeded");
    return { success: true, recipesSeeded: recipeData.length, environmentLogsSeeded: 20 };
  }),
});

// ──── Main Router ────

export const semiconductorCleaningRouter = router({
  recipe: recipeSubRouter,
  semiValidation: semiValidationSubRouter,
  environment: environmentSubRouter,
  certification: certificationSubRouter,
  monitor: monitorSubRouter,
});
