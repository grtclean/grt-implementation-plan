/**
 * Service Dashboard Router — Global Customer Service Dashboard
 *
 * 14 tRPC procedures for the 4-region service dashboard with North America deep-dive.
 * Includes 6 admin CRUD procedures for KPI/location config management.
 * Reuses existing tables: spareParts, afterSalesServiceLogs, afterSalesClients,
 * afterSalesEquipments, knowledgeDocuments.
 * Config tables: serviceDashboardKpis, serviceDashboardLocations.
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, sql, count, or, ilike, gte, lte, isNull, type SQL } from "drizzle-orm";

// ─── Mock Data Constants ───────────────────────────────────────────────────────

const REGION_OVERVIEW_MOCK = [
  { region: "Asia", regionCn: "亚太", projectCount: 128, engineerCount: 45, activeTickets: 23, avgResponseHours: 4.2, healthScore: 92 },
  { region: "NorthAmerica", regionCn: "北美", projectCount: 34, engineerCount: 12, activeTickets: 8, avgResponseHours: 6.5, healthScore: 87 },
  { region: "Europe", regionCn: "欧洲", projectCount: 18, engineerCount: 6, activeTickets: 5, avgResponseHours: 8.1, healthScore: 81 },
  { region: "Other", regionCn: "其他", projectCount: 9, engineerCount: 3, activeTickets: 2, avgResponseHours: 12.3, healthScore: 74 },
];

const NA_PROJECT_LOCATIONS_MOCK = [
  { id: 1, city: "Detroit", state: "MI", country: "US", lat: 42.33, lng: -83.05, status: "active", clientName: "GM Powertrain", equipmentType: "Ultrasonic Cleaning Line", engineerCount: 3 },
  { id: 2, city: "Detroit", state: "MI", country: "US", lat: 42.36, lng: -83.10, status: "active", clientName: "Ford Dearborn", equipmentType: "Spray Wash System", engineerCount: 2 },
  { id: 3, city: "Houston", state: "TX", country: "US", lat: 29.76, lng: -95.37, status: "completed", clientName: "Tesla Gigafactory TX", equipmentType: "Immersion Cleaning Station", engineerCount: 1 },
  { id: 4, city: "Chicago", state: "IL", country: "US", lat: 41.88, lng: -87.63, status: "active", clientName: "Stellantis Chicago", equipmentType: "Multi-Stage Wash Line", engineerCount: 2 },
  { id: 5, city: "Los Angeles", state: "CA", country: "US", lat: 34.05, lng: -118.24, status: "planned", clientName: "Rivian LA Center", equipmentType: "Automated Cleaning Cell", engineerCount: 0 },
  { id: 6, city: "Nashville", state: "TN", country: "US", lat: 36.16, lng: -86.78, status: "active", clientName: "Nissan Smyrna", equipmentType: "Parts Washer System", engineerCount: 1 },
  { id: 7, city: "San Antonio", state: "TX", country: "US", lat: 29.42, lng: -98.49, status: "completed", clientName: "Toyota TMMTX", equipmentType: "Conveyor Wash System", engineerCount: 1 },
  { id: 8, city: "Monterrey", state: "NL", country: "MX", lat: 25.67, lng: -100.31, status: "active", clientName: "Nemak Monterrey", equipmentType: "Die-Cast Cleaning Line", engineerCount: 2 },
  { id: 9, city: "Queretaro", state: "QRO", country: "MX", lat: 20.59, lng: -100.39, status: "planned", clientName: "Linamar Mexico", equipmentType: "CNC Parts Washer", engineerCount: 0 },
  { id: 10, city: "Spartanburg", state: "SC", country: "US", lat: 34.95, lng: -81.93, status: "active", clientName: "BMW Manufacturing", equipmentType: "Precision Cleaning System", engineerCount: 2 },
];

const DEMO_LIFECYCLE_STAGES = [
  { stage: "Created", label: "工单创建", order: 0 },
  { stage: "Assigned", label: "已分配", order: 1 },
  { stage: "Diagnosed", label: "问题诊断", order: 2 },
  { stage: "PartsOrdered", label: "备件下单", order: 3 },
  { stage: "Repaired", label: "维修中", order: 4 },
  { stage: "Verified", label: "已验证", order: 5 },
  { stage: "Closed", label: "已关闭", order: 6 },
];

const CHINA_HQ_METRICS = {
  avgResponseHours: 3.8,
  firstCallResolution: 72,
  sparePartsAvailability: 94,
  mttr: 18.5,
  customerSatisfaction: 4.3,
  engineerUtilization: 82,
  preventiveMaintenanceRate: 68,
  slaCompliance: 91,
};

const NA_METRICS_MOCK = {
  avgResponseHours: 6.2,
  firstCallResolution: 65,
  sparePartsAvailability: 78,
  mttr: 28.4,
  customerSatisfaction: 4.0,
  engineerUtilization: 74,
  preventiveMaintenanceRate: 55,
  slaCompliance: 83,
};

// ─── Seed Data Constants ───────────────────────────────────────────────────────

const SEED_CLIENTS = [
  { name: "GM Powertrain Division", tier: "Strategic", contactPerson: "James Wilson", contactPhone: "+1-313-556-2044", contactEmail: "j.wilson@gm.com", address: "Detroit, MI 48232", industry: "Automotive OEM", region: "North America", slaLevel: "Platinum", responseTimeHours: 4, status: "Active" },
  { name: "Ford Motor Dearborn", tier: "Strategic", contactPerson: "Sarah Chen", contactPhone: "+1-313-322-8100", contactEmail: "s.chen@ford.com", address: "Dearborn, MI 48126", industry: "Automotive OEM", region: "North America", slaLevel: "Platinum", responseTimeHours: 4, status: "Active" },
  { name: "Tesla Gigafactory Texas", tier: "Premium", contactPerson: "Mike Rodriguez", contactPhone: "+1-512-444-3000", contactEmail: "m.rodriguez@tesla.com", address: "Austin, TX 78725", industry: "EV Manufacturing", region: "North America", slaLevel: "Gold", responseTimeHours: 8, status: "Active" },
  { name: "Stellantis North America", tier: "Standard", contactPerson: "David Kim", contactPhone: "+1-248-576-5741", contactEmail: "d.kim@stellantis.com", address: "Auburn Hills, MI 48326", industry: "Automotive OEM", region: "North America", slaLevel: "Silver", responseTimeHours: 12, status: "Active" },
];

const SEED_SPARE_PARTS = [
  { partCode: "DET-FLT-001", materialCode: "FLT-HYD-50M", materialName: "Hydraulic Filter Element 50μm", specification: "50μm, 250mm L, SS316", category: "hydraulic", currentStock: 24, minStockLevel: 10, reorderPoint: 15, maxStockLevel: 50, isCritical: true, unitPrice: "85.00", locationCode: "DET-WH-A3" },
  { partCode: "DET-NZL-002", materialCode: "NZL-SPR-V12", materialName: "V-Jet Spray Nozzle 1/4NPT", specification: "1/4NPT, 15° fan, SS316L", category: "mechanical", currentStock: 42, minStockLevel: 20, reorderPoint: 30, maxStockLevel: 100, isCritical: false, unitPrice: "32.50", locationCode: "DET-WH-A1" },
  { partCode: "DET-PMP-003", materialCode: "PMP-CNT-5HP", materialName: "Centrifugal Pump 5HP", specification: "5HP, 3-phase, 60Hz, TEFC", category: "mechanical", currentStock: 3, minStockLevel: 2, reorderPoint: 4, maxStockLevel: 8, isCritical: true, unitPrice: "2450.00", locationCode: "DET-WH-B2" },
  { partCode: "DET-SEN-004", materialCode: "SEN-TMP-PT100", materialName: "PT100 Temperature Sensor", specification: "PT100, 3-wire, -50~250°C", category: "electrical", currentStock: 8, minStockLevel: 5, reorderPoint: 10, maxStockLevel: 30, isCritical: false, unitPrice: "125.00", locationCode: "DET-WH-C1" },
  { partCode: "DET-VLV-005", materialCode: "VLV-SOL-24V", materialName: "Solenoid Valve 24VDC", specification: "24VDC, 2-way, NC, 1/2in", category: "pneumatic", currentStock: 1, minStockLevel: 4, reorderPoint: 8, maxStockLevel: 20, isCritical: true, unitPrice: "195.00", locationCode: "DET-WH-A2" },
];

const SEED_COMPLIANCE_DOCS = [
  { title: "UL 508A — Industrial Control Panels", category: "standard", content: "UL 508A covers industrial control panels for use in ordinary (non-hazardous) locations. Key requirements: proper wire bending space, short-circuit current ratings (SCCR), overcurrent protection sizing, power circuit conductor sizing per NEC Table 310.16, control circuit protection per NEC 725. For cleaning machine panels: NEMA 4X enclosure rating required for washdown environments, GFCI protection on all 120V convenience outlets, emergency stop per NFPA 79 Section 9.2.5.4.", tags: '["UL508A","industrial control","panel","SCCR","NEMA"]', source: "manual", relevanceScore: 95 },
  { title: "CSA C22.2 No. 14 — Industrial Control Equipment", category: "standard", content: "CSA C22.2 No. 14 covers industrial control equipment for the Canadian market. Harmonized with UL 508. Requirements include: temperature rise limits (65°C for field wiring terminals), dielectric voltage-withstand test (1000V + 2× rated voltage), overload relay coordination, marking requirements (bilingual English/French for Canadian installations). For cleaning equipment: CSA approval required for all components used in Canadian installations, UL-CSA bi-national certification available.", tags: '["CSA","C22.2","Canadian","industrial control","bi-national"]', source: "manual", relevanceScore: 88 },
  { title: "OSHA Lockout/Tagout (LOTO) — 29 CFR 1910.147", category: "standard", content: "OSHA LOTO standard requires procedures for controlling hazardous energy during servicing/maintenance. For cleaning machines: identify all energy sources (electrical, hydraulic, pneumatic, thermal, chemical), provide lockable disconnects within 25ft line-of-sight, group lockout procedures for multi-person maintenance, annual periodic inspection. Training requirements: authorized vs affected employees, initial + refresher training. Penalties: up to $156,259 per willful violation (2024 rates).", tags: '["OSHA","LOTO","lockout","tagout","29CFR1910","safety"]', source: "manual", relevanceScore: 92 },
  { title: "EPA VOC Emissions — 40 CFR Part 63 Subpart T (NESHAP)", category: "standard", content: "EPA NESHAP Subpart T regulates halogenated solvent cleaning. Applicable to cleaning machines using chlorinated solvents (TCE, perc, methylene chloride). Requirements: freeboard ratio ≥1.0, automated parts handling, carbon adsorption (95% control efficiency), monthly leak detection (Method 21, 500ppm action level). Alternative: switch to aqueous or semi-aqueous cleaning eliminates Subpart T applicability. Record keeping: 5 years of solvent purchase/disposal records.", tags: '["EPA","VOC","NESHAP","solvent","emissions","cleaning"]', source: "manual", relevanceScore: 85 },
  { title: "NFPA 79 — Electrical Standard for Industrial Machinery", category: "standard", content: "NFPA 79 covers electrical/electronic equipment on industrial machines. Key sections for cleaning machines: Section 6 (overcurrent protection and short-circuit protection), Section 7 (motor control circuits, variable frequency drives), Section 9 (control circuits, emergency stop, safety interlocks), Section 12 (operator interface, HMI requirements). Wire color coding: safety ground = green/green-yellow, ungrounded AC = black/red/blue, grounded neutral = white/gray.", tags: '["NFPA79","electrical","industrial machinery","emergency stop","wiring"]', source: "manual", relevanceScore: 90 },
  { title: "NEC Article 70 / NFPA 70 — National Electrical Code", category: "standard", content: "NEC Article 670 covers industrial machinery. For cleaning machine installations: supply circuit sizing per nameplate FLA + 25% largest motor, disconnect means within sight and lockable, equipment grounding per Article 250. NEC 2023 updates: Arc-fault protection requirements expanded, GFCI requirements for 250V circuits in wet locations. Branch circuit calculations for cleaning machines: heater loads at 125%, motor loads per Article 430.", tags: '["NEC","NFPA70","electrical code","Article670","grounding"]', source: "manual", relevanceScore: 87 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load KPIs from config table grouped by category+region */
async function loadConfigKpis(category: string, region?: string | null) {
  try {
    const db = await requireDb();
    const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");
    const conditions = [eq(serviceDashboardKpis.category, category)];
    if (region) conditions.push(eq(serviceDashboardKpis.region, region));
    else if (region === null) conditions.push(isNull(serviceDashboardKpis.region));
    const rows = await db.select().from(serviceDashboardKpis).where(and(...conditions)).limit(1000);
    if (rows.length === 0) return null;
    const map: Record<string, number> = {};
    for (const r of rows) map[r.key] = Number(r.value);
    return map;
  } catch { return null; }
}

/** Load locations from config table */
async function loadConfigLocations(region?: string) {
  try {
    const db = await requireDb();
    const { serviceDashboardLocations } = await import("../../drizzle/service-dashboard-config-schema");
    const conditions = region ? [eq(serviceDashboardLocations.region, region)] : [];
    const rows = await db.select().from(serviceDashboardLocations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(serviceDashboardLocations.id).limit(1000);
    if (rows.length === 0) return null;
    return rows.map(r => ({
      id: r.id,
      city: r.city,
      state: r.state ?? "",
      country: r.country,
      lat: Number(r.lat),
      lng: Number(r.lng),
      status: r.status,
      clientName: r.clientName ?? "",
      equipmentType: r.equipmentType ?? "",
      engineerCount: r.engineerCount ?? 0,
    }));
  } catch { return null; }
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const serviceDashboardRouter = router({
  /**
   * getRegionOverview — 4-region summary (Asia/NA/Europe/Other)
   * DB-first: reads from service_dashboard_kpis (category=region_overview), falls back to mock
   */
  getRegionOverview: protectedProcedure.query(async () => {
    try {
      // 1. Try config table first
      const regions = ["Asia", "NorthAmerica", "Europe", "Other"] as const;
      const regionCnMap: Record<string, string> = { Asia: "亚太", NorthAmerica: "北美", Europe: "欧洲", Other: "其他" };
      const configResults = await Promise.all(regions.map(r => loadConfigKpis("region_overview", r)));
      const hasConfig = configResults.some(c => c !== null);

      if (hasConfig) {
        return regions.map((region, i) => {
          const cfg = configResults[i];
          const mock = REGION_OVERVIEW_MOCK.find(m => m.region === region)!;
          return {
            region,
            regionCn: regionCnMap[region],
            projectCount: cfg?.projectCount ?? mock.projectCount,
            engineerCount: cfg?.engineerCount ?? mock.engineerCount,
            activeTickets: cfg?.activeTickets ?? mock.activeTickets,
            avgResponseHours: cfg?.avgResponseHours ?? mock.avgResponseHours,
            healthScore: cfg?.healthScore ?? mock.healthScore,
          };
        });
      }

      // 2. Try real DB counts
      const db = await requireDb();
      const { afterSalesClients } = await import("../../drizzle/schema");
      const regionCounts = await db
        .select({ region: afterSalesClients.region, cnt: count() })
        .from(afterSalesClients)
        .where(eq(afterSalesClients.status, "Active"))
        .groupBy(afterSalesClients.region);

      if (regionCounts.length > 0) {
        const countMap = new Map(regionCounts.map(r => [r.region, Number(r.cnt)]));
        return REGION_OVERVIEW_MOCK.map(r => ({
          ...r,
          projectCount: countMap.get(r.region === "NorthAmerica" ? "North America" : r.region) ?? r.projectCount,
        }));
      }
      return REGION_OVERVIEW_MOCK;
    } catch {
      return REGION_OVERVIEW_MOCK;
    }
  }),

  /**
   * getNorthAmericaStats — NA-specific KPIs
   */
  getNorthAmericaStats: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const { afterSalesServiceLogs, afterSalesClients, afterSalesEquipments } = await import("../../drizzle/schema");
      const { spareParts } = await import("../../drizzle/supply-chain-schema");

      // Count NA clients
      const clientRows = await db
        .select({ cnt: count() })
        .from(afterSalesClients)
        .where(and(eq(afterSalesClients.region, "North America"), eq(afterSalesClients.status, "Active")));
      const projectCount = Number(clientRows[0]?.cnt ?? 0);

      // Count spare parts with stock
      const spareRows = await db
        .select({ total: count(), inStock: sql<number>`count(*) filter (where ${spareParts.currentStock} > ${spareParts.reorderPoint})` })
        .from(spareParts)
        .where(ilike(spareParts.locationCode, "DET%"));
      const sparePartsTotal = Number(spareRows[0]?.total ?? 0);
      const sparePartsInStock = Number(spareRows[0]?.inStock ?? 0);
      const sparePartsCoverage = sparePartsTotal > 0 ? Math.round((sparePartsInStock / sparePartsTotal) * 100) : 78;

      // Count open/closed tickets for NA clients
      const naClientIds = await db
        .select({ id: afterSalesClients.id })
        .from(afterSalesClients)
        .where(eq(afterSalesClients.region, "North America"))
        .limit(1000);
      const naIds = naClientIds.map(c => c.id);

      let ticketsOpen = 0;
      let ticketsClosed = 0;
      if (naIds.length > 0) {
        for (const clientId of naIds) {
          const openRows = await db.select({ cnt: count() }).from(afterSalesServiceLogs)
            .where(and(eq(afterSalesServiceLogs.clientId, clientId), or(eq(afterSalesServiceLogs.status, "Pending"), eq(afterSalesServiceLogs.status, "In Progress"))));
          ticketsOpen += Number(openRows[0]?.cnt ?? 0);
          const closedRows = await db.select({ cnt: count() }).from(afterSalesServiceLogs)
            .where(and(eq(afterSalesServiceLogs.clientId, clientId), eq(afterSalesServiceLogs.status, "Completed")));
          ticketsClosed += Number(closedRows[0]?.cnt ?? 0);
        }
      }

      const hasRealData = projectCount > 0;
      return {
        projectCount: hasRealData ? projectCount : 34,
        engineerCount: 12,
        sparePartsCoverage: hasRealData ? sparePartsCoverage : 78,
        avgResponseTimeHours: 6.5,
        ticketsOpen: hasRealData ? ticketsOpen : 8,
        ticketsClosed: hasRealData ? ticketsClosed : 156,
        customerSatisfaction: 4.0,
        mttr: 28.4,
      };
    } catch {
      return {
        projectCount: 34,
        engineerCount: 12,
        sparePartsCoverage: 78,
        avgResponseTimeHours: 6.5,
        ticketsOpen: 8,
        ticketsClosed: 156,
        customerSatisfaction: 4.0,
        mttr: 28.4,
      };
    }
  }),

  /**
   * getDetroitSparePartsInventory — Detroit warehouse spare parts
   */
  getDetroitSparePartsInventory: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      criticalOnly: z.boolean().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const { category, criticalOnly, limit = 20 } = input ?? {};
      try {
        const db = await requireDb();
        const { spareParts } = await import("../../drizzle/supply-chain-schema");

        const conditions: SQL[] = [ilike(spareParts.locationCode, "DET%")];
        if (category) conditions.push(eq(spareParts.category, category));
        if (criticalOnly) conditions.push(eq(spareParts.isCritical, true));

        const rows = await db
          .select()
          .from(spareParts)
          .where(and(...conditions))
          .orderBy(desc(spareParts.isCritical), spareParts.materialName)
          .limit(limit);

        if (rows.length > 0) {
          return rows.map(r => ({
            id: r.id,
            partCode: r.partCode,
            materialName: r.materialName,
            specification: r.specification,
            category: r.category,
            currentStock: r.currentStock,
            minStockLevel: r.minStockLevel ?? 0,
            reorderPoint: r.reorderPoint ?? 0,
            maxStockLevel: r.maxStockLevel ?? 0,
            isCritical: r.isCritical ?? false,
            unitPrice: r.unitPrice,
            locationCode: r.locationCode,
            stockHealthStatus: r.currentStock <= (r.minStockLevel ?? 0)
              ? "critical" as const
              : r.currentStock <= (r.reorderPoint ?? 0)
                ? "warning" as const
                : "healthy" as const,
          }));
        }

        // Mock fallback
        return SEED_SPARE_PARTS.map((sp, i) => ({
          id: i + 1,
          ...sp,
          stockHealthStatus: sp.currentStock <= sp.minStockLevel
            ? "critical" as const
            : sp.currentStock <= sp.reorderPoint
              ? "warning" as const
              : "healthy" as const,
        }));
      } catch {
        return SEED_SPARE_PARTS.map((sp, i) => ({
          id: i + 1,
          ...sp,
          stockHealthStatus: sp.currentStock <= sp.minStockLevel
            ? "critical" as const
            : sp.currentStock <= sp.reorderPoint
              ? "warning" as const
              : "healthy" as const,
        }));
      }
    }),

  /**
   * getNAProjectLocations — project sites across US + Mexico
   * DB-first: reads from service_dashboard_locations, falls back to equipment join, then mock
   */
  getNAProjectLocations: protectedProcedure.query(async () => {
    try {
      // 1. Try config table
      const configLocs = await loadConfigLocations("NorthAmerica");
      if (configLocs) return configLocs;

      // 2. Try real equipment data
      const db = await requireDb();
      const { afterSalesEquipments, afterSalesClients } = await import("../../drizzle/schema");

      const rows = await db
        .select({
          clientName: afterSalesClients.name,
          location: afterSalesEquipments.location,
          equipmentType: afterSalesEquipments.equipmentType,
          status: afterSalesEquipments.operationalStatus,
        })
        .from(afterSalesEquipments)
        .innerJoin(afterSalesClients, eq(afterSalesEquipments.clientId, afterSalesClients.id))
        .where(eq(afterSalesClients.region, "North America"))
        .limit(12);

      if (rows.length > 0) {
        return rows.map((r, i) => {
          const mockLoc = NA_PROJECT_LOCATIONS_MOCK[i % NA_PROJECT_LOCATIONS_MOCK.length];
          return {
            id: i + 1,
            city: r.location ?? mockLoc.city,
            state: mockLoc.state,
            country: mockLoc.country,
            lat: mockLoc.lat,
            lng: mockLoc.lng,
            status: r.status === "Running" ? "active" : r.status === "Idle" ? "planned" : "completed",
            clientName: r.clientName,
            equipmentType: r.equipmentType ?? mockLoc.equipmentType,
            engineerCount: mockLoc.engineerCount,
          };
        });
      }
      return NA_PROJECT_LOCATIONS_MOCK;
    } catch {
      return NA_PROJECT_LOCATIONS_MOCK;
    }
  }),

  /**
   * getServiceReplicationComparison — China HQ vs North America metrics
   * DB-first: reads from service_dashboard_kpis (china_hq / north_america), falls back to mock
   */
  getServiceReplicationComparison: protectedProcedure.query(async () => {
    const METRICS_DEFS = [
      { key: "avgResponseHours", label: "平均响应时间 (h)", lowerIsBetter: true },
      { key: "firstCallResolution", label: "首次解决率 (%)", lowerIsBetter: false },
      { key: "sparePartsAvailability", label: "备件可用率 (%)", lowerIsBetter: false },
      { key: "mttr", label: "平均修复时间 (h)", lowerIsBetter: true },
      { key: "customerSatisfaction", label: "客户满意度 (1-5)", lowerIsBetter: false },
      { key: "engineerUtilization", label: "工程师利用率 (%)", lowerIsBetter: false },
      { key: "preventiveMaintenanceRate", label: "预防性维护率 (%)", lowerIsBetter: false },
      { key: "slaCompliance", label: "SLA 达标率 (%)", lowerIsBetter: false },
    ];

    try {
      // 1. Try config table
      const [chinaConfig, naConfig] = await Promise.all([
        loadConfigKpis("china_hq", null),
        loadConfigKpis("north_america", null),
      ]);

      const chinaBase = chinaConfig
        ? { ...CHINA_HQ_METRICS, ...chinaConfig }
        : CHINA_HQ_METRICS;
      const naBase = naConfig
        ? { ...NA_METRICS_MOCK, ...naConfig }
        : NA_METRICS_MOCK;

      // 2. Try to augment with real DB data
      const db = await requireDb();
      const { afterSalesServiceLogs } = await import("../../drizzle/schema");
      const chinaLogs = await db
        .select({ avgRating: sql<number>`avg(${afterSalesServiceLogs.satisfactionRating})`, cnt: count() })
        .from(afterSalesServiceLogs)
        .where(eq(afterSalesServiceLogs.status, "Completed"));

      const hasData = Number(chinaLogs[0]?.cnt ?? 0) > 0;
      const chinaMetrics = hasData
        ? { ...chinaBase, customerSatisfaction: Number(Number(chinaLogs[0]?.avgRating ?? 4.3).toFixed(1)) }
        : chinaBase;

      return { china: chinaMetrics, northAmerica: naBase, metrics: METRICS_DEFS };
    } catch {
      return { china: CHINA_HQ_METRICS, northAmerica: NA_METRICS_MOCK, metrics: METRICS_DEFS };
    }
  }),

  /**
   * getComplianceKnowledge — Search compliance knowledge base (UL/CSA/OSHA/EPA/NFPA)
   */
  getComplianceKnowledge: requirePermission('service:workbench:view')
    .input(z.object({
      query: z.string().min(1),
      standard: z.enum(["UL", "CSA", "OSHA", "EPA", "NFPA", "NEC", "all"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { query, standard } = input;
      try {
        const { searchDocuments } = await import("../modules/knowledge-base.service");
        const results = await searchDocuments(query, {
          category: "standard",
          limit: 10,
        });

        // Filter by standard prefix if specified
        const filtered = standard && standard !== "all"
          ? results.filter(r => r.title.toUpperCase().includes(standard))
          : results;

        if (filtered.length > 0) {
          return { results: filtered, source: "database" as const };
        }

        // Mock fallback — search in seed docs
        const lq = query.toLowerCase();
        const mockResults = SEED_COMPLIANCE_DOCS
          .filter(d => {
            if (standard && standard !== "all" && !d.title.toUpperCase().includes(standard)) return false;
            return d.title.toLowerCase().includes(lq) || d.content.toLowerCase().includes(lq) || d.tags.toLowerCase().includes(lq);
          })
          .map((d, i) => ({
            id: i + 1,
            title: d.title,
            content: d.content,
            category: d.category,
            tags: d.tags,
            matchScore: d.title.toLowerCase().includes(lq) ? 10 : 3,
            relevanceScore: d.relevanceScore,
          }));

        return { results: mockResults, source: "mock" as const };
      } catch {
        const lq = query.toLowerCase();
        const mockResults = SEED_COMPLIANCE_DOCS
          .filter(d => {
            if (standard && standard !== "all" && !d.title.toUpperCase().includes(standard)) return false;
            return d.title.toLowerCase().includes(lq) || d.content.toLowerCase().includes(lq);
          })
          .map((d, i) => ({
            id: i + 1,
            title: d.title,
            content: d.content,
            category: d.category,
            tags: d.tags,
            matchScore: 5,
            relevanceScore: d.relevanceScore,
          }));
        return { results: mockResults, source: "mock" as const };
      }
    }),

  /**
   * getTicketLifecycle — 7-stage ticket lifecycle visualization
   */
  getTicketLifecycle: protectedProcedure
    .input(z.object({ ticketId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const ticketId = input?.ticketId;
      try {
        const db = await requireDb();
        const { afterSalesServiceLogs } = await import("../../drizzle/schema");

        if (ticketId) {
          const rows = await db
            .select()
            .from(afterSalesServiceLogs)
            .where(eq(afterSalesServiceLogs.ticketId, ticketId))
            .limit(1);

          if (rows.length > 0) {
            const ticket = rows[0];
            const statusToStage: Record<string, number> = {
              Pending: 0,
              Assigned: 1,
              "In Progress": 3,
              Completed: 6,
              Closed: 6,
            };
            const currentStage = statusToStage[ticket.status] ?? 0;

            return {
              ticketId: ticket.ticketId,
              currentStage,
              stages: DEMO_LIFECYCLE_STAGES.map((s, i) => ({
                ...s,
                status: i < currentStage ? "completed" as const : i === currentStage ? "active" as const : "pending" as const,
                timestamp: i <= currentStage ? ticket.createdAt : null,
                actor: i <= currentStage ? (ticket.assignedEngineerName ?? ticket.engineerName ?? "System") : null,
              })),
              slaCompliant: true,
              priority: ticket.priority,
            };
          }
        }

        // Demo lifecycle
        const now = new Date();
        return {
          ticketId: ticketId ?? "NA-2026-0042",
          currentStage: 4,
          stages: DEMO_LIFECYCLE_STAGES.map((s, i) => ({
            ...s,
            status: i < 4 ? "completed" as const : i === 4 ? "active" as const : "pending" as const,
            timestamp: i <= 4 ? new Date(now.getTime() - (4 - i) * 3600000 * 8).toISOString() : null,
            actor: i <= 4 ? ["System", "Dispatch", "John Smith", "Parts Dept", "John Smith"][i] : null,
          })),
          slaCompliant: true,
          priority: "High",
        };
      } catch {
        const now = new Date();
        return {
          ticketId: ticketId ?? "NA-2026-0042",
          currentStage: 4,
          stages: DEMO_LIFECYCLE_STAGES.map((s, i) => ({
            ...s,
            status: i < 4 ? "completed" as const : i === 4 ? "active" as const : "pending" as const,
            timestamp: i <= 4 ? new Date(now.getTime() - (4 - i) * 3600000 * 8).toISOString() : null,
            actor: i <= 4 ? ["System", "Dispatch", "John Smith", "Parts Dept", "John Smith"][i] : null,
          })),
          slaCompliant: true,
          priority: "High",
        };
      }
    }),

  /**
   * seedNADemo — Seed demo data into existing tables for NA showcase
   */
  seedNADemo: requirePermission('service:workbench:view').mutation(async () => {
    const db = await requireDb();
    const { afterSalesClients, afterSalesEquipments, afterSalesServiceLogs, knowledgeDocuments } = await import("../../drizzle/schema");
    const { spareParts } = await import("../../drizzle/supply-chain-schema");

    const results: string[] = [];

    // 1. Seed NA Clients
    for (const client of SEED_CLIENTS) {
      try {
        const existing = await db.select({ id: afterSalesClients.id }).from(afterSalesClients).where(eq(afterSalesClients.name, client.name)).limit(1);
        if (existing.length === 0) {
          await db.insert(afterSalesClients).values(client);
          results.push(`Client: ${client.name}`);
        }
      } catch (e: any) { results.push(`Client skip: ${client.name} (${e?.message?.slice(0, 50)})`); }
    }

    // 2. Seed Equipments for NA clients
    const naClients = await db.select({ id: afterSalesClients.id, name: afterSalesClients.name }).from(afterSalesClients).where(eq(afterSalesClients.region, "North America")).limit(1000);
    const equipmentSeeds = [
      { serialNumber: "GRT-NA-UCL-001", modelName: "UltraClean Pro 3000", equipmentType: "Ultrasonic Cleaning Line", location: "Detroit, MI" },
      { serialNumber: "GRT-NA-SPW-002", modelName: "SprayWash Turbo X", equipmentType: "Spray Wash System", location: "Detroit, MI" },
      { serialNumber: "GRT-NA-ICS-003", modelName: "ImmersoClean 500", equipmentType: "Immersion Cleaning Station", location: "Austin, TX" },
      { serialNumber: "GRT-NA-MSW-004", modelName: "MultiStage Wash MK-IV", equipmentType: "Multi-Stage Wash Line", location: "Chicago, IL" },
      { serialNumber: "GRT-NA-ACL-005", modelName: "AutoCell Clean 200", equipmentType: "Automated Cleaning Cell", location: "Monterrey, MX" },
      { serialNumber: "GRT-NA-PWS-006", modelName: "PartsMaster 1500", equipmentType: "Parts Washer System", location: "Nashville, TN" },
    ];
    for (let i = 0; i < equipmentSeeds.length; i++) {
      const eq_data = equipmentSeeds[i];
      const client = naClients[i % naClients.length];
      if (!client) continue;
      try {
        const existing = await db.select({ id: afterSalesEquipments.id }).from(afterSalesEquipments).where(eq(afterSalesEquipments.serialNumber, eq_data.serialNumber)).limit(1);
        if (existing.length === 0) {
          await db.insert(afterSalesEquipments).values({
            ...eq_data,
            clientId: client.id,
            manufacturer: "GRT Industrial",
            operationalStatus: i < 4 ? "Running" : "Idle",
            installationDate: "2025-06-15",
            warrantyEndDate: "2027-06-15",
          });
          results.push(`Equipment: ${eq_data.serialNumber}`);
        }
      } catch (e: any) { results.push(`Equipment skip: ${eq_data.serialNumber} (${e?.message?.slice(0, 50)})`); }
    }

    // 3. Seed Service Tickets
    const naEquipments = await db.select({ id: afterSalesEquipments.id }).from(afterSalesEquipments)
      .innerJoin(afterSalesClients, eq(afterSalesEquipments.clientId, afterSalesClients.id))
      .where(eq(afterSalesClients.region, "North America"))
      .limit(1000);
    const ticketSeeds = [
      { ticketId: "NA-2026-0041", serviceType: "Corrective", priority: "High", issueDescription: "Ultrasonic transducer frequency drift causing inconsistent cleaning", status: "Completed" },
      { ticketId: "NA-2026-0042", serviceType: "Corrective", priority: "High", issueDescription: "Hydraulic pump pressure drop below spec on wash line 2", status: "In Progress" },
      { ticketId: "NA-2026-0043", serviceType: "Preventive", priority: "Medium", issueDescription: "Scheduled 6-month PM — filter replacement + calibration", status: "Pending" },
      { ticketId: "NA-2026-0044", serviceType: "Emergency", priority: "Critical", issueDescription: "Conveyor belt jam causing production line stoppage", status: "Completed" },
      { ticketId: "NA-2026-0045", serviceType: "Corrective", priority: "Medium", issueDescription: "Temperature sensor drift — readings 5°C above actual", status: "Completed" },
      { ticketId: "NA-2026-0046", serviceType: "Preventive", priority: "Low", issueDescription: "Annual electrical safety inspection per NFPA 79", status: "Pending" },
      { ticketId: "NA-2026-0047", serviceType: "Corrective", priority: "High", issueDescription: "PLC communication fault — Ethernet/IP module replacement", status: "In Progress" },
      { ticketId: "NA-2026-0048", serviceType: "Installation", priority: "Medium", issueDescription: "New spray nozzle array installation for line 3 upgrade", status: "Pending" },
    ];
    for (let i = 0; i < ticketSeeds.length; i++) {
      const ticket = ticketSeeds[i];
      const eqRow = naEquipments[i % naEquipments.length];
      if (!eqRow) continue;
      try {
        const existing = await db.select({ id: afterSalesServiceLogs.id }).from(afterSalesServiceLogs).where(eq(afterSalesServiceLogs.ticketId, ticket.ticketId)).limit(1);
        if (existing.length === 0) {
          await db.insert(afterSalesServiceLogs).values({
            ...ticket,
            equipmentId: eqRow.id,
            clientId: naClients[i % naClients.length]?.id,
            assignedEngineerName: ["John Smith", "Maria Garcia", "Alex Johnson"][i % 3],
            scheduledDate: "2026-02-28",
            satisfactionRating: ticket.status === "Completed" ? 4 + (i % 2) : undefined,
          });
          results.push(`Ticket: ${ticket.ticketId}`);
        }
      } catch (e: any) { results.push(`Ticket skip: ${ticket.ticketId} (${e?.message?.slice(0, 50)})`); }
    }

    // 4. Seed Compliance Knowledge Docs
    for (const doc of SEED_COMPLIANCE_DOCS) {
      try {
        const existing = await db.select({ id: knowledgeDocuments.id }).from(knowledgeDocuments).where(eq(knowledgeDocuments.title, doc.title)).limit(1);
        if (existing.length === 0) {
          await db.insert(knowledgeDocuments).values({ ...doc, createdBy: 1 });
          results.push(`Doc: ${doc.title.slice(0, 30)}`);
        }
      } catch (e: any) { results.push(`Doc skip: ${doc.title.slice(0, 20)} (${e?.message?.slice(0, 50)})`); }
    }

    // 5. Seed Detroit Spare Parts
    for (const sp of SEED_SPARE_PARTS) {
      try {
        const existing = await db.select({ id: spareParts.id }).from(spareParts).where(eq(spareParts.partCode, sp.partCode)).limit(1);
        if (existing.length === 0) {
          await db.insert(spareParts).values({ ...sp, createdBy: 1 });
          results.push(`Part: ${sp.partCode}`);
        }
      } catch (e: any) { results.push(`Part skip: ${sp.partCode} (${e?.message?.slice(0, 50)})`); }
    }

    // 6. Seed Region Overview KPIs (all 4 regions)
    try {
      const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");
      const regionKpis = [
        { region: "Asia", regionCn: "亚太", projectCount: 128, engineerCount: 45, activeTickets: 23, avgResponseHours: 4.2, healthScore: 92 },
        { region: "NorthAmerica", regionCn: "北美", projectCount: 34, engineerCount: 12, activeTickets: 8, avgResponseHours: 6.5, healthScore: 87 },
        { region: "Europe", regionCn: "欧洲", projectCount: 18, engineerCount: 6, activeTickets: 5, avgResponseHours: 8.1, healthScore: 81 },
        { region: "Other", regionCn: "其他", projectCount: 9, engineerCount: 3, activeTickets: 2, avgResponseHours: 12.3, healthScore: 74 },
      ];
      for (const rk of regionKpis) {
        const entries = [
          { key: "projectCount", value: rk.projectCount, label: "项目数", unit: "个" },
          { key: "engineerCount", value: rk.engineerCount, label: "工程师", unit: "人" },
          { key: "activeTickets", value: rk.activeTickets, label: "活跃工单", unit: "个" },
          { key: "avgResponseHours", value: rk.avgResponseHours, label: "平均响应", unit: "小时" },
          { key: "healthScore", value: rk.healthScore, label: "健康指数", unit: "分" },
        ];
        for (const entry of entries) {
          const existing = await db.select({ id: serviceDashboardKpis.id }).from(serviceDashboardKpis)
            .where(and(
              eq(serviceDashboardKpis.category, "region_overview"),
              eq(serviceDashboardKpis.region, rk.region),
              eq(serviceDashboardKpis.key, entry.key),
            )).limit(1);
          if (existing.length === 0) {
            await db.insert(serviceDashboardKpis).values({
              category: "region_overview", region: rk.region,
              key: entry.key, value: String(entry.value), label: entry.label, unit: entry.unit, source: "manual",
            });
            results.push(`KPI: ${rk.region}/${entry.key}`);
          }
        }
      }

      // Seed service comparison metrics (china_hq + north_america)
      const comparisonSeeds: { category: string; entries: { key: string; value: number; label: string; unit: string }[] }[] = [
        {
          category: "china_hq",
          entries: [
            { key: "avgResponseHours", value: 3.8, label: "平均响应时间", unit: "小时" },
            { key: "firstCallResolution", value: 72, label: "首次解决率", unit: "%" },
            { key: "sparePartsAvailability", value: 94, label: "备件可用率", unit: "%" },
            { key: "mttr", value: 18.5, label: "平均修复时间", unit: "小时" },
            { key: "customerSatisfaction", value: 4.3, label: "客户满意度", unit: "分" },
            { key: "engineerUtilization", value: 82, label: "工程师利用率", unit: "%" },
            { key: "preventiveMaintenanceRate", value: 68, label: "预防性维护率", unit: "%" },
            { key: "slaCompliance", value: 91, label: "SLA达标率", unit: "%" },
          ],
        },
        {
          category: "north_america",
          entries: [
            { key: "avgResponseHours", value: 6.2, label: "平均响应时间", unit: "小时" },
            { key: "firstCallResolution", value: 65, label: "首次解决率", unit: "%" },
            { key: "sparePartsAvailability", value: 78, label: "备件可用率", unit: "%" },
            { key: "mttr", value: 28.4, label: "平均修复时间", unit: "小时" },
            { key: "customerSatisfaction", value: 4.0, label: "客户满意度", unit: "分" },
            { key: "engineerUtilization", value: 74, label: "工程师利用率", unit: "%" },
            { key: "preventiveMaintenanceRate", value: 55, label: "预防性维护率", unit: "%" },
            { key: "slaCompliance", value: 83, label: "SLA达标率", unit: "%" },
          ],
        },
      ];
      for (const group of comparisonSeeds) {
        for (const entry of group.entries) {
          const existing = await db.select({ id: serviceDashboardKpis.id }).from(serviceDashboardKpis)
            .where(and(
              eq(serviceDashboardKpis.category, group.category),
              isNull(serviceDashboardKpis.region),
              eq(serviceDashboardKpis.key, entry.key),
            )).limit(1);
          if (existing.length === 0) {
            await db.insert(serviceDashboardKpis).values({
              category: group.category, key: entry.key,
              value: String(entry.value), label: entry.label, unit: entry.unit, source: "manual",
            });
            results.push(`KPI: ${group.category}/${entry.key}`);
          }
        }
      }
    } catch (e: any) { results.push(`KPI seed error: ${e?.message?.slice(0, 80)}`); }

    // 7. Seed NA Project Location pins (config table)
    try {
      const { serviceDashboardLocations } = await import("../../drizzle/service-dashboard-config-schema");
      const locationSeeds = [
        { city: "Detroit", state: "MI", country: "US", lat: "42.330000", lng: "-83.050000", status: "active", clientName: "GM Powertrain", equipmentType: "Ultrasonic Cleaning Line", engineerCount: 3 },
        { city: "Detroit", state: "MI", country: "US", lat: "42.360000", lng: "-83.100000", status: "active", clientName: "Ford Dearborn", equipmentType: "Spray Wash System", engineerCount: 2 },
        { city: "Austin", state: "TX", country: "US", lat: "30.270000", lng: "-97.740000", status: "active", clientName: "Tesla Gigafactory", equipmentType: "Immersion Cleaning Station", engineerCount: 2 },
        { city: "Chicago", state: "IL", country: "US", lat: "41.880000", lng: "-87.630000", status: "active", clientName: "Stellantis Chicago", equipmentType: "Multi-Stage Wash Line", engineerCount: 1 },
        { city: "Monterrey", state: "NL", country: "MX", lat: "25.690000", lng: "-100.310000", status: "planned", clientName: "Nemak Monterrey", equipmentType: "Automated Cleaning Cell", engineerCount: 2 },
        { city: "Nashville", state: "TN", country: "US", lat: "36.160000", lng: "-86.780000", status: "completed", clientName: "Nissan Nashville", equipmentType: "Parts Washer System", engineerCount: 1 },
        { city: "San Jose", state: "CA", country: "US", lat: "37.340000", lng: "-121.890000", status: "active", clientName: "Applied Materials", equipmentType: "Precision Cleaning System", engineerCount: 2 },
        { city: "Queretaro", state: "QRO", country: "MX", lat: "20.590000", lng: "-100.390000", status: "planned", clientName: "Continental Queretaro", equipmentType: "Spray Wash System", engineerCount: 1 },
        { city: "Greenville", state: "SC", country: "US", lat: "34.850000", lng: "-82.400000", status: "active", clientName: "BMW Manufacturing", equipmentType: "Ultrasonic Degreaser", engineerCount: 2 },
        { city: "El Paso", state: "TX", country: "US", lat: "31.760000", lng: "-106.440000", status: "completed", clientName: "Delphi Technologies", equipmentType: "Vacuum Dryer System", engineerCount: 1 },
      ];
      for (const loc of locationSeeds) {
        const existing = await db.select({ id: serviceDashboardLocations.id }).from(serviceDashboardLocations)
          .where(and(
            eq(serviceDashboardLocations.city, loc.city),
            eq(serviceDashboardLocations.clientName, loc.clientName),
          )).limit(1);
        if (existing.length === 0) {
          await db.insert(serviceDashboardLocations).values({ ...loc, region: "NorthAmerica" });
          results.push(`Location: ${loc.city} (${loc.clientName})`);
        }
      }
    } catch (e: any) { results.push(`Location seed error: ${e?.message?.slice(0, 80)}`); }

    return { seeded: results.length, details: results };
  }),

  // ─── Admin CRUD Procedures ──────────────────────────────────────────────────

  /**
   * listKpis — List KPIs from config table for admin editing
   */
  listKpis: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");
        const conditions = input?.category ? [eq(serviceDashboardKpis.category, input.category)] : [];
        const rows = await db.select().from(serviceDashboardKpis)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(serviceDashboardKpis.category, serviceDashboardKpis.region, serviceDashboardKpis.key).limit(1000);
        return rows.map(r => ({
          id: r.id,
          category: r.category,
          region: r.region,
          key: r.key,
          value: Number(r.value),
          label: r.label,
          unit: r.unit,
          source: r.source,
          updatedAt: r.updatedAt,
        }));
      } catch {
        return [];
      }
    }),

  /**
   * upsertKpi — Insert or update a single KPI row (by category+region+key)
   */
  upsertKpi: protectedProcedure
    .input(z.object({
      category: z.string(),
      region: z.string().nullable().optional(),
      key: z.string(),
      value: z.number(),
      label: z.string(),
      unit: z.string().optional(),
      source: z.enum(["manual", "system", "import"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");

      // Check existing
      const conditions = [
        eq(serviceDashboardKpis.category, input.category),
        eq(serviceDashboardKpis.key, input.key),
      ];
      if (input.region) conditions.push(eq(serviceDashboardKpis.region, input.region));
      else conditions.push(isNull(serviceDashboardKpis.region));

      const existing = await db.select({ id: serviceDashboardKpis.id }).from(serviceDashboardKpis)
        .where(and(...conditions)).limit(1);

      if (existing.length > 0) {
        await db.update(serviceDashboardKpis)
          .set({
            value: String(input.value),
            label: input.label,
            unit: input.unit,
            source: input.source ?? "manual",
            updatedAt: new Date(),
          })
          .where(eq(serviceDashboardKpis.id, existing[0].id));
        return { action: "updated" as const, id: existing[0].id };
      } else {
        const ins = await db.insert(serviceDashboardKpis).values({
          category: input.category,
          region: input.region ?? undefined,
          key: input.key,
          value: String(input.value),
          label: input.label,
          unit: input.unit ?? "",
          source: input.source ?? "manual",
        }).returning({ id: serviceDashboardKpis.id });
        return { action: "inserted" as const, id: ins[0]?.id ?? 0 };
      }
    }),

  /**
   * bulkUpsertKpis — Batch insert/update KPI rows (for CSV import)
   */
  bulkUpsertKpis: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        category: z.string(),
        region: z.string().nullable().optional(),
        key: z.string(),
        value: z.number(),
        label: z.string(),
        unit: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");
      let inserted = 0, updated = 0;

      for (const item of input.items) {
        const conditions = [
          eq(serviceDashboardKpis.category, item.category),
          eq(serviceDashboardKpis.key, item.key),
        ];
        if (item.region) conditions.push(eq(serviceDashboardKpis.region, item.region));
        else conditions.push(isNull(serviceDashboardKpis.region));

        const existing = await db.select({ id: serviceDashboardKpis.id }).from(serviceDashboardKpis)
          .where(and(...conditions)).limit(1);

        if (existing.length > 0) {
          await db.update(serviceDashboardKpis)
            .set({ value: String(item.value), label: item.label, unit: item.unit, source: "import", updatedAt: new Date() })
            .where(eq(serviceDashboardKpis.id, existing[0].id));
          updated++;
        } else {
          await db.insert(serviceDashboardKpis).values({
            category: item.category,
            region: item.region ?? undefined,
            key: item.key,
            value: String(item.value),
            label: item.label,
            unit: item.unit ?? "",
            source: "import",
          });
          inserted++;
        }
      }
      return { inserted, updated, total: input.items.length };
    }),

  /**
   * listLocations — List project site locations for admin editing
   */
  listLocations: protectedProcedure
    .input(z.object({ region: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const { serviceDashboardLocations } = await import("../../drizzle/service-dashboard-config-schema");
        const conditions = input?.region ? [eq(serviceDashboardLocations.region, input.region)] : [];
        const rows = await db.select().from(serviceDashboardLocations)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(serviceDashboardLocations.region, serviceDashboardLocations.city).limit(1000);
        return rows.map(r => ({
          id: r.id,
          region: r.region,
          city: r.city,
          state: r.state,
          country: r.country,
          lat: Number(r.lat),
          lng: Number(r.lng),
          status: r.status,
          clientName: r.clientName,
          equipmentType: r.equipmentType,
          engineerCount: r.engineerCount ?? 0,
          updatedAt: r.updatedAt,
        }));
      } catch {
        return [];
      }
    }),

  /**
   * upsertLocation — Insert or update a project site location
   */
  upsertLocation: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      region: z.string(),
      city: z.string(),
      state: z.string().optional(),
      country: z.string(),
      lat: z.number(),
      lng: z.number(),
      status: z.enum(["active", "completed", "planned"]).optional(),
      clientName: z.string().optional(),
      equipmentType: z.string().optional(),
      engineerCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { serviceDashboardLocations } = await import("../../drizzle/service-dashboard-config-schema");

      const data = {
        region: input.region,
        city: input.city,
        state: input.state ?? "",
        country: input.country,
        lat: String(input.lat),
        lng: String(input.lng),
        status: input.status ?? "active",
        clientName: input.clientName ?? "",
        equipmentType: input.equipmentType ?? "",
        engineerCount: input.engineerCount ?? 0,
        updatedAt: new Date(),
      };

      if (input.id) {
        await db.update(serviceDashboardLocations).set(data).where(eq(serviceDashboardLocations.id, input.id));
        return { action: "updated" as const, id: input.id };
      } else {
        const ins = await db.insert(serviceDashboardLocations).values(data)
          .returning({ id: serviceDashboardLocations.id });
        return { action: "inserted" as const, id: ins[0]?.id ?? 0 };
      }
    }),

  /**
   * deleteLocation — Delete a project site location
   */
  deleteLocation: requirePermission('service:workbench:view')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { serviceDashboardLocations } = await import("../../drizzle/service-dashboard-config-schema");
      await db.delete(serviceDashboardLocations).where(eq(serviceDashboardLocations.id, input.id));
      return { deleted: true };
    }),

  /**
   * syncFromDB — Aggregate real data from existing tables into config KPIs
   * Returns diff of what changed
   */
  syncFromDB: requirePermission('service:workbench:view').mutation(async () => {
    const db = await requireDb();
    const { afterSalesServiceLogs, afterSalesClients } = await import("../../drizzle/schema");
    const { spareParts } = await import("../../drizzle/supply-chain-schema");
    const { serviceDashboardKpis } = await import("../../drizzle/service-dashboard-config-schema");

    const diffs: { key: string; oldValue: number | null; newValue: number; category: string; region: string | null }[] = [];

    // Helper: upsert and track diff
    async function syncKpi(category: string, region: string | null, key: string, newValue: number, label: string, unit: string) {
      const conditions = [eq(serviceDashboardKpis.category, category), eq(serviceDashboardKpis.key, key)];
      if (region) conditions.push(eq(serviceDashboardKpis.region, region));
      else conditions.push(isNull(serviceDashboardKpis.region));

      const existing = await db.select({ id: serviceDashboardKpis.id, value: serviceDashboardKpis.value })
        .from(serviceDashboardKpis).where(and(...conditions)).limit(1);

      const oldValue = existing.length > 0 ? Number(existing[0].value) : null;
      if (oldValue !== newValue) {
        diffs.push({ key, oldValue, newValue, category, region });
      }

      if (existing.length > 0) {
        await db.update(serviceDashboardKpis)
          .set({ value: String(newValue), source: "system", updatedAt: new Date() })
          .where(eq(serviceDashboardKpis.id, existing[0].id));
      } else {
        await db.insert(serviceDashboardKpis).values({
          category, region: region ?? undefined, key, value: String(newValue), label, unit, source: "system",
        });
      }
    }

    try {
      // Region counts from afterSalesClients
      const regionCounts = await db
        .select({ region: afterSalesClients.region, cnt: count() })
        .from(afterSalesClients)
        .where(eq(afterSalesClients.status, "Active"))
        .groupBy(afterSalesClients.region);

      const regionMap: Record<string, string> = { "North America": "NorthAmerica", Asia: "Asia", Europe: "Europe" };
      for (const rc of regionCounts) {
        const mapped = regionMap[rc.region ?? ""] ?? "Other";
        await syncKpi("region_overview", mapped, "projectCount", Number(rc.cnt), "项目数", "个");
      }

      // NA service ticket stats
      const naClientIds = await db.select({ id: afterSalesClients.id }).from(afterSalesClients)
        .where(eq(afterSalesClients.region, "North America")).limit(1000);
      if (naClientIds.length > 0) {
        let openTickets = 0, closedTickets = 0;
        for (const { id } of naClientIds) {
          const open = await db.select({ cnt: count() }).from(afterSalesServiceLogs)
            .where(and(eq(afterSalesServiceLogs.clientId, id), or(eq(afterSalesServiceLogs.status, "Pending"), eq(afterSalesServiceLogs.status, "In Progress"))));
          openTickets += Number(open[0]?.cnt ?? 0);
          const closed = await db.select({ cnt: count() }).from(afterSalesServiceLogs)
            .where(and(eq(afterSalesServiceLogs.clientId, id), eq(afterSalesServiceLogs.status, "Completed")));
          closedTickets += Number(closed[0]?.cnt ?? 0);
        }
        await syncKpi("region_overview", "NorthAmerica", "activeTickets", openTickets, "活跃工单", "个");
      }

      // Spare parts coverage
      const spareRows = await db
        .select({ total: count(), inStock: sql<number>`count(*) filter (where ${spareParts.currentStock} > ${spareParts.reorderPoint})` })
        .from(spareParts)
        .where(ilike(spareParts.locationCode, "DET%"));
      const total = Number(spareRows[0]?.total ?? 0);
      const inStock = Number(spareRows[0]?.inStock ?? 0);
      if (total > 0) {
        const coverage = Math.round((inStock / total) * 100);
        await syncKpi("north_america", null, "sparePartsAvailability", coverage, "备件可用率 (%)", "%");
      }

      // Customer satisfaction from service logs
      const satRows = await db
        .select({ avg: sql<number>`avg(${afterSalesServiceLogs.satisfactionRating})` })
        .from(afterSalesServiceLogs)
        .where(eq(afterSalesServiceLogs.status, "Completed"));
      const avgSat = Number(Number(satRows[0]?.avg ?? 0).toFixed(1));
      if (avgSat > 0) {
        await syncKpi("china_hq", null, "customerSatisfaction", avgSat, "客户满意度 (1-5)", "分");
      }
    } catch (e: any) {
      return { synced: diffs.length, diffs, error: e?.message?.slice(0, 100) };
    }

    return { synced: diffs.length, diffs };
  }),
});
