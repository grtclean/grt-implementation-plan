import "dotenv/config";
import { requireDb } from "./server/db/connection";
import { count } from "drizzle-orm";

async function main() {
  const db = await requireDb();
  const schema = await import("./drizzle/schema");
  const matSchema = await import("./drizzle/material-schema");
  const bomSchema = await import("./drizzle/bom-schema");
  const oeeSchema = await import("./drizzle/oee-schema");

  console.log("=== DB DATA DIAGNOSTIC ===\n");

  const checks: [string, any, number, string][] = [
    ["permissions", schema.permissions, 200, "RBAC"],
    ["hrmEmployees", schema.hrmEmployees, 20, "Infrastructure/HR"],
    ["projects", schema.projects, 5, "Infrastructure/Project"],
    ["materials", matSchema.materials, 10, "Encoding/SupplyChain"],
    ["bomMasters", bomSchema.bomMasters, 3, "Manufacturing/SupplyChain"],
    ["oeeSnapshots", oeeSchema.oeeSnapshots, 10, "Manufacturing/Quality"],
    ["fmeaDocuments", schema.fmeaDocuments, 3, "Manufacturing/Quality"],
    ["controlPlans", schema.controlPlans, 3, "Quality"],
    ["engineeringChangeOrders", schema.engineeringChangeOrders, 3, "Encoding/Quality"],
    ["plmDocuments", schema.plmDocuments, 5, "Encoding/PLM"],
    ["workLogs", schema.workLogs, 10, "Manufacturing"],
    ["historicalQuotations", schema.historicalQuotations, 5, "ProjectMgmt"],
    ["okrObjectives", schema.okrObjectives, 3, "ProjectMgmt"],
    ["designPackages", schema.designPackages, 3, "ProjectMgmt/PLM"],
  ];

  let allGood = true;
  for (const [name, table, threshold, category] of checks) {
    try {
      const [r] = await (db as any).select({ value: count() }).from(table).limit(1);
      const n = Number(r?.value || 0);
      const ok = n >= threshold;
      if (!ok) allGood = false;
      console.log(
        ok ? "✅" : "❌",
        `${name}: ${n}/${threshold}`,
        ok ? "" : `← NEEDS ${threshold - n} MORE`,
        `(${category})`
      );
    } catch (e: any) {
      allGood = false;
      console.log("⚠️", `${name}: TABLE ERROR`, `(${category})`);
    }
  }

  console.log("\n" + (allGood ? "🎯 ALL THRESHOLDS MET — scores should be 100" : "⚠️ SOME THRESHOLDS NOT MET — seed data needed"));
  process.exit(0);
}

main();
