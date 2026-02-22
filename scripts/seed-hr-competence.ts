/**
 * ETL Script: seed-hr-competence.ts
 *
 * Reads the competence assessment CSV and inserts rows into
 * the `employee_competence_assessments` table via raw pg.
 *
 * Usage:
 *   npx tsx scripts/seed-hr-competence.ts
 */

import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const CSV_PATH = path.resolve(
  import.meta.dirname,
  "../data/GRT人员能力测评（202602）.xlsx - Sheet1.csv",
);

/** Extract the numeric score from a cell like "L4 (85)" -> 85 */
function parseScore(cell: string): number {
  const m = cell.match(/\((\d+)\)/);
  if (!m) throw new Error(`Cannot parse score from: "${cell}"`);
  return parseInt(m[1], 10);
}

interface CsvRow {
  name: string;
  department: string;
  position: string;
  t: number;
  s: number;
  d: number;
  c: number;
  k: number;
  l: number;
}

function readCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim() !== "");

  // First line is header — skip it
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 9) {
      console.warn(`[WARN] Skipping malformed line ${i + 1}: ${lines[i]}`);
      continue;
    }
    rows.push({
      name: cols[0].trim(),
      department: cols[1].trim(),
      position: cols[2].trim(),
      t: parseScore(cols[3]),
      s: parseScore(cols[4]),
      d: parseScore(cols[5]),
      c: parseScore(cols[6]),
      k: parseScore(cols[7]),
      l: parseScore(cols[8]),
    });
  }
  return rows;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[FATAL] DATABASE_URL is not set in environment.");
    process.exit(1);
  }

  // ---------- Read CSV ----------
  console.log(`Reading CSV from: ${CSV_PATH}`);
  const rows = readCsv(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from CSV.\n`);

  // ---------- Connect ----------
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("Connected to database.\n");

  let inserted = 0;
  let skipped = 0;
  let notFound = 0;

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      // Look up employee by name
      const lookup = await client.query(
        `SELECT id, department, position FROM company_employees WHERE name = $1 LIMIT 1`,
        [row.name],
      );

      if (lookup.rows.length === 0) {
        console.warn(
          `[WARN] Employee not found in DB, skipping: ${row.name} (${row.department})`,
        );
        notFound++;
        continue;
      }

      const emp = lookup.rows[0];
      const employeeId = emp.id;

      // Check for existing assessment on the same date to avoid duplicates
      const existing = await client.query(
        `SELECT id FROM employee_competence_assessments
         WHERE employee_id = $1 AND assessed_at::date = CURRENT_DATE
         LIMIT 1`,
        [employeeId],
      );

      if (existing.rows.length > 0) {
        console.warn(
          `[WARN] Assessment already exists for: ${row.name} (${row.department}), skipping duplicate.`,
        );
        skipped++;
        continue;
      }

      // Insert assessment
      await client.query(
        `INSERT INTO employee_competence_assessments
           (employee_id, employee_name, department, position, t_score, s_score, d_score, c_score, k_score, l_score, assessed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          employeeId,
          row.name,
          row.department,
          row.position,
          row.t,
          row.s,
          row.d,
          row.c,
          row.k,
          row.l,
        ],
      );

      console.log(
        `Mapped capability for: ${row.name} (${row.department})`,
      );
      inserted++;
    }

    await client.query("COMMIT");
    console.log("\n--- Summary ---");
    console.log(`Total CSV rows:  ${rows.length}`);
    console.log(`Inserted:        ${inserted}`);
    console.log(`Skipped (dup):   ${skipped}`);
    console.log(`Not found in DB: ${notFound}`);
    console.log("Transaction committed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Transaction rolled back due to error:");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main();
